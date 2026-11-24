"""
Flagship Precision Blender 5.3 Cycles Metal GPU Renderer — All 218 Pilates 3D Exercises (654 Frames @ 960x600)
Powered by `pilates_3d_modeling_kernel.py` v5:
- Seamless 360-Degree Curved Infinity Cyclorama (`build_infinity_cyclorama_bowl`) with grounded soft contact shadows
  and luxury Korean editorial warm alabaster linen (`#FAF7F0`) cove lift
- Sculpted Korean Pilates Studio Instructor + Rich Cathedral European White Oak, Satin Brass & Supple Sage Leather
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import shutil
import sys
import time
import bpy
import bmesh
from mathutils import Vector

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from pilates_3d_modeling_kernel import (
    MeshCollector,
    aim_camera_perspective_exact,
    build_apparatus_and_props,
    build_cycles_studio_materials,
    build_sculpted_practitioner,
    srgb_tuple,
)


FLOOR_RADIUS = 3.6
COVE_RADIUS = 5.4


def build_infinity_cyclorama_bowl(collection, mat) -> bpy.types.Object:
    """
    Constructs a smooth, continuous 360-degree L-sweep studio cyclorama bowl:
    - Perfectly flat grounded stage disk (`r <= 3.6m`, `z = 0.0`) for crisp contact shadows
    - Smoothly filleted circular cove (`R_cove = 5.4m`) sweeping seamlessly up to `z = 9.5m`
      so NO diagonal horizon seam ever appears behind any camera azimuth or elevation!
    """
    bm = bmesh.new()
    ang_segs = 64
    r_flat = FLOOR_RADIUS
    r_cove = COVE_RADIUS

    profile_rz = [(0.0, 0.0), (1.4, 0.0), (2.6, 0.0), (r_flat, 0.0)]
    for k in range(1, 17):
        a = (math.pi * 0.48) * (k / 16.0)
        rr = r_flat + math.sin(a) * r_cove
        zz = (1.0 - math.cos(a)) * r_cove
        profile_rz.append((rr, zz))
    profile_rz.append((r_flat + r_cove + 0.4, r_cove + 4.2))

    center_v = bm.verts.new((0.0, 0.0, 0.0))
    rings = []
    for rr, zz in profile_rz[1:]:
        row = []
        for s in range(ang_segs):
            th = 2.0 * math.pi * s / ang_segs
            row.append(bm.verts.new((math.cos(th) * rr, math.sin(th) * rr, zz)))
        rings.append(row)

    for s in range(ang_segs):
        s2 = (s + 1) % ang_segs
        bm.faces.new((center_v, rings[0][s], rings[0][s2]))

    for i in range(len(rings) - 1):
        for s in range(ang_segs):
            s2 = (s + 1) % ang_segs
            bm.faces.new((rings[i][s], rings[i + 1][s], rings[i + 1][s2], rings[i][s2]))

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new("StudioInfinityCycloramaMesh")
    bm.to_mesh(mesh)
    bm.free()
    for p in mesh.polygons:
        p.use_smooth = True
    mesh.materials.append(mat)
    obj = bpy.data.objects.new("StudioInfinityCyclorama", mesh)
    collection.objects.link(obj)
    return obj


def setup_flagship_cycles_studio(res_x: int = 960, res_y: int = 600, samples: int = 24, target_scene: bpy.types.Scene | None = None):
    scene = target_scene or bpy.context.scene
    for obj in list(scene.objects):
        bpy.data.objects.remove(obj, do_unlink=True)

    scene.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    try:
        prefs.compute_device_type = "METAL"
        prefs.get_devices()
        has_metal = any(d.type == "METAL" for d in prefs.devices)
        for d in prefs.devices:
            d.use = (d.type == "METAL") if has_metal else True
        scene.cycles.device = "GPU" if has_metal else "CPU"
    except Exception:
        scene.cycles.device = "CPU"

    scene.cycles.samples = samples
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.adaptive_threshold = 0.024
    scene.cycles.use_denoising = True
    scene.cycles.denoiser = "OPENIMAGEDENOISE"
    if hasattr(scene.cycles, "denoising_prefilter"):
        scene.cycles.denoising_prefilter = "FAST"
    if hasattr(scene.cycles, "denoising_use_gpu"):
        scene.cycles.denoising_use_gpu = True
    scene.cycles.max_bounces = 4
    scene.cycles.diffuse_bounces = 2
    scene.cycles.glossy_bounces = 2
    scene.cycles.filter_width = 1.15
    scene.render.use_persistent_data = False
    scene.render.resolution_x = res_x
    scene.render.resolution_y = res_y
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.color_depth = "8"
    scene.view_settings.view_transform = "AgX"
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except Exception:
        scene.view_settings.look = "None"
    scene.view_settings.exposure = -0.08

    mats = build_cycles_studio_materials()

    # Calibrate studio_bg with camera-ray-only warm alabaster linen (#FAF7F0) cove lift:
    # `To Min = 0.14` preserves rich, soft grounded shadows under the apparatus & feet while
    # the upper cyclorama transitions seamlessly to warm editorial alabaster linen.
    nt_bg = mats["studio_bg"].node_tree
    bsdf_bg = nt_bg.nodes.get("Principled BSDF")
    out_bg = nt_bg.nodes.get("Material Output")
    if bsdf_bg and out_bg:
        lp = nt_bg.nodes.new("ShaderNodeLightPath")
        geom = nt_bg.nodes.new("ShaderNodeNewGeometry")
        sep_xyz = nt_bg.nodes.new("ShaderNodeSeparateXYZ")
        map_z = nt_bg.nodes.new("ShaderNodeMapRange")
        map_z.clamp = True
        map_z.interpolation_type = "SMOOTHSTEP"
        map_z.inputs["From Min"].default_value = 0.06
        map_z.inputs["From Max"].default_value = 1.45
        map_z.inputs["To Min"].default_value = 0.14
        map_z.inputs["To Max"].default_value = 0.96

        mul_cam = nt_bg.nodes.new("ShaderNodeMath")
        mul_cam.operation = "MULTIPLY"

        linen_emit = nt_bg.nodes.new("ShaderNodeEmission")
        # AgX-calibrated warm alabaster linen radiance (#FAF7F0) — balanced without washing out subject shading
        linen_emit.inputs["Color"].default_value = (1.0, 0.962, 0.892, 1.0)
        linen_emit.inputs["Strength"].default_value = 4.10

        mix_bg = nt_bg.nodes.new("ShaderNodeMixShader")
        nt_bg.links.new(geom.outputs["Position"], sep_xyz.inputs["Vector"])
        nt_bg.links.new(sep_xyz.outputs["Z"], map_z.inputs["Value"])
        nt_bg.links.new(lp.outputs["Is Camera Ray"], mul_cam.inputs[0])
        nt_bg.links.new(map_z.outputs["Result"], mul_cam.inputs[1])
        nt_bg.links.new(mul_cam.outputs["Value"], mix_bg.inputs["Fac"])
        nt_bg.links.new(bsdf_bg.outputs["BSDF"], mix_bg.inputs[1])
        nt_bg.links.new(linen_emit.outputs["Emission"], mix_bg.inputs[2])
        nt_bg.links.new(mix_bg.outputs["Shader"], out_bg.inputs["Surface"])

    build_infinity_cyclorama_bowl(scene.collection, mats["studio_bg"])

    world = scene.world or bpy.data.worlds.new("StudioWorld")
    scene.world = world
    if world.node_tree is None:
        world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (*srgb_tuple((0.990, 0.980, 0.958)), 1.0)
    bg.inputs["Strength"].default_value = 0.24

    def add_area_light(lname: str, loc, target_pt, energy: float, size: float, color, size_y: float | None = None):
        ldata = bpy.data.lights.new(lname, type="AREA")
        ldata.energy = energy
        ldata.size = size
        if size_y is not None:
            ldata.shape = "RECTANGLE"
            ldata.size_y = size_y
        ldata.color = color
        lobj = bpy.data.objects.new(lname, ldata)
        lobj.location = Vector(loc)
        direction = (Vector(target_pt) - Vector(loc)).normalized()
        lobj.rotation_mode = "QUATERNION"
        lobj.rotation_quaternion = direction.to_track_quat("-Z", "Y")
        scene.collection.objects.link(lobj)
        return lobj

    # Luxury Korean Editorial 3-Point + Champagne Silhouette Rim Atelier Lighting
    add_area_light("AtelierKeyLight", (-2.30, -2.55, 3.20), (0.0, 0.0, 0.72), 310.0, 1.30, (1.0, 0.952, 0.884))
    add_area_light("AtelierFillLight", (2.85, -2.30, 2.15), (0.0, 0.0, 0.70), 55.0, 3.20, (0.948, 0.968, 1.00))
    # Crisp Champagne Back-Right & Subtle Back-Left Rim Lights carving sculptural glow on silk hair, shoulders & legs
    add_area_light("AtelierRimLight", (0.55, 2.55, 2.55), (0.0, 0.0, 0.80), 290.0, 0.95, (1.0, 0.962, 0.896), size_y=1.60)
    add_area_light("AtelierKickerLight", (-2.15, 2.20, 1.90), (0.0, 0.0, 0.68), 95.0, 1.20, (1.0, 0.974, 0.932))
    add_area_light("AtelierCycWash", (0.0, 2.10, 5.40), (0.0, 0.60, 0.0), 85.0, 7.00, (1.0, 0.986, 0.962))

    cam_data = bpy.data.cameras.new("StudioCamera")
    cam_data.lens = 66.0
    cam_data.sensor_width = 36.0
    cam = bpy.data.objects.new("StudioCamera", cam_data)
    cam.location = (0.0, -3.2, 1.3)
    scene.collection.objects.link(cam)
    scene.camera = cam

    subj_col = bpy.data.collections.new("SubjectCol")
    scene.collection.children.link(subj_col)
    return scene, cam, subj_col, mats


def clear_subject_collection(subj_col):
    for obj in list(subj_col.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for m in list(bpy.data.meshes):
        if m.users == 0:
            bpy.data.meshes.remove(m)
    for c in list(bpy.data.curves):
        if c.users == 0:
            bpy.data.curves.remove(c)


def collect_exercise_envelope_points(ex: dict) -> list[Vector]:
    app = ex["apparatus"]
    app_extents = {
        "reformer": (Vector((-1.20, -0.36, 0.0)), Vector((1.20, 0.36, 0.72))),
        "cadillac": (Vector((-1.10, -0.36, 0.0)), Vector((1.10, 0.36, 1.99))),
        "chair": (Vector((-0.44, -0.32, 0.0)), Vector((0.38, 0.32, 0.74))),
        "barrel": (Vector((-0.68, -0.32, 0.0)), Vector((0.58, 0.32, 1.06))),
        "mat": (Vector((-1.04, -0.40, 0.0)), Vector((1.04, 0.40, 0.14))),
    }[app]
    b0, b1 = app_extents[0].copy(), app_extents[1].copy()
    pts: list[Vector] = []
    for ph in ("start", "middle", "end"):
        rig = ex["phases"][ph]
        if rig.get("withChairHandles"):
            b1.z = max(b1.z, 1.32)
        for key in ("pelvis", "spineMid", "chest", "lFoot", "rFoot", "lHand", "rHand"):
            v = Vector(rig[key])
            pad_xy = 0.22
            pad_z_up = 0.34 if key == "chest" else 0.16
            pad_z_dn = 0.12
            b0.x = min(b0.x, v.x - pad_xy)
            b0.y = min(b0.y, v.y - pad_xy)
            b0.z = min(b0.z, max(0.0, v.z - pad_z_dn))
            b1.x = max(b1.x, v.x + pad_xy)
            b1.y = max(b1.y, v.y + pad_xy)
            b1.z = max(b1.z, v.z + pad_z_up)

    for x in (b0.x, (b0.x + b1.x) * 0.5, b1.x):
        for y in (b0.y, (b0.y + b1.y) * 0.5, b1.y):
            for z in (b0.z, (b0.z + b1.z) * 0.5, b1.z):
                pts.append(Vector((x, y, z)))
    return pts


def frame_inside_studio(cam, envelope, exercise_id):
    # Wide poses can put the long-lens camera behind the curved cyclorama.
    # Keep the same subject margin while moving the camera inside its visible surface.
    # Show the opened arms across the frame and a side bend in the frontal plane.
    azimuth, elevation = {
        "original-cadillac-seated-rotation": (-27.0, 28.0),
        "original-cadillac-seated-side-reach": (-18.0, 14.0),
    }.get(exercise_id, (-64.0, 20.0))
    for focal_length in (66, 50, 35, 24):
        cam.data.lens = focal_length
        aim_camera_perspective_exact(cam, envelope, azim_deg=azimuth, elev_deg=elevation,
                                     margin=1.11, aspect=960.0 / 600.0)
        height = max(0, min(cam.location.z, COVE_RADIUS))
        wall_radius = FLOOR_RADIUS + math.sqrt(height * (2 * COVE_RADIUS - height))
        if math.hypot(cam.location.x, cam.location.y) < wall_radius - 0.05:
            return
    raise RuntimeError("Cannot frame the pose inside the studio cyclorama")


def main():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--poses", default=os.path.join(SCRIPT_DIR, "poses_studio_canonical.json"))
    parser.add_argument("--outdir", required=True)
    parser.add_argument("--start", type=int, default=0)
    parser.add_argument("--end", type=int, default=9999)
    parser.add_argument("--apparatus", type=str, default="")
    parser.add_argument("--ids", type=str, default="")
    parser.add_argument("--res-x", type=int, default=960)
    parser.add_argument("--res-y", type=int, default=600)
    parser.add_argument("--samples", type=int, default=24)
    parser.add_argument("--subsurf", type=int, default=2)
    parser.add_argument("--skip-existing", action="store_true")
    args = parser.parse_args(argv)

    os.makedirs(args.outdir, exist_ok=True)
    with open(args.poses, "r", encoding="utf-8") as f:
        all_exercises = json.load(f)

    if args.ids:
        id_set = {x.strip() for x in args.ids.split(",") if x.strip()}
        all_exercises = [ex for ex in all_exercises if ex["id"] in id_set]
    if args.apparatus:
        allowed = {x.strip() for x in args.apparatus.split(",") if x.strip()}
        all_exercises = [ex for ex in all_exercises if ex["apparatus"] in allowed]
    subset = all_exercises[args.start : args.end]
    scene, cam, subj_col, mats = setup_flagship_cycles_studio(
        res_x=args.res_x, res_y=args.res_y, samples=args.samples
    )

    t0 = time.time()
    rendered = 0
    reused_scene = 0
    scene_cache: dict[str, str] = {}

    def frame_scene_signature(ex_item: dict, phase_key: str) -> str:
        cam_override = {
            "original-cadillac-seated-rotation": (-27.0, 28.0),
            "original-cadillac-seated-side-reach": (-18.0, 14.0),
        }.get(ex_item["id"], (-64.0, 20.0))
        payload = {
            "apparatus": ex_item["apparatus"],
            "box": ex_item.get("box"),
            "footbar": ex_item.get("footbar"),
            "headrest": ex_item.get("headrest"),
            "props": sorted(ex_item.get("props") or []),
            "cam": cam_override,
            "env": ex_item["phases"],
            "rig": ex_item["phases"][phase_key],
        }
        return hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()

    # Pre-seed cache with any valid PNGs already present on disk when --skip-existing is set
    if args.skip_existing:
        for ex_item in all_exercises:
            for ph in ("start", "middle", "end"):
                p_existing = os.path.join(args.outdir, f"{ex_item['id']}.{ph}.png")
                if os.path.isfile(p_existing) and os.path.getsize(p_existing) > 15000:
                    sig = frame_scene_signature(ex_item, ph)
                    scene_cache.setdefault(sig, p_existing)

    for idx, ex in enumerate(subset):
        env_pts = collect_exercise_envelope_points(ex)
        camera_aimed = False
        for phase in ("start", "middle", "end"):
            out_png = os.path.join(args.outdir, f"{ex['id']}.{phase}.png")
            sig = frame_scene_signature(ex, phase)
            if args.skip_existing and os.path.isfile(out_png) and os.path.getsize(out_png) > 15000:
                scene_cache.setdefault(sig, out_png)
                continue
            cached_src = scene_cache.get(sig)
            if cached_src and os.path.isfile(cached_src) and os.path.getsize(cached_src) > 15000:
                shutil.copyfile(cached_src, out_png)
                reused_scene += 1
                continue
            if not camera_aimed:
                frame_inside_studio(cam, env_pts, ex["id"])
                camera_aimed = True
            clear_subject_collection(subj_col)
            mc = MeshCollector(subj_col, mats, glb_mode=False)
            rig = ex["phases"][phase]
            build_apparatus_and_props(mc, ex, rig)
            build_sculpted_practitioner(mc, rig, subsurf=args.subsurf)
            scene.render.filepath = out_png
            bpy.ops.render.render(write_still=True)
            scene_cache[sig] = out_png
            rendered += 1
        if (idx + 1) % 10 == 0 or (idx + 1) == len(subset):
            elapsed = time.time() - t0
            print(
                f"[Flagship Worker {args.start}..{args.end}] {idx + 1}/{len(subset)} exercises ({rendered} rendered, {reused_scene} reused) in {elapsed:.1f}s ({elapsed / max(1, rendered):.2f}s/render)",
                flush=True,
            )

    clear_subject_collection(subj_col)


if __name__ == "__main__":
    main()
