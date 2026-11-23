"""
Flagship Precision Blender 5.2 LTS Cycles Metal GPU Renderer — All 218 Pilates 3D Exercises (654 Frames @ 640x400)
Powered by `pilates_3d_modeling_kernel.py` v3:
- Seamless 360-Degree Curved Infinity Cyclorama (`build_infinity_cyclorama_bowl`) eliminating hard wall/floor horizon seams
  and matching Pilates Flow's `#f7f4ee` / `#f3efe7` warm atelier linen palette
- Stylized Korean Webtoon / Atelier Practitioner + True Cathedral European White Oak, Satin Brass & Pebbled Sage Leather
"""
from __future__ import annotations

import argparse
import json
import math
import os
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


def setup_flagship_cycles_studio(res_x: int = 960, res_y: int = 600, samples: int = 20, target_scene: bpy.types.Scene | None = None):
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
    scene.cycles.adaptive_threshold = 0.032
    scene.cycles.use_denoising = True
    scene.cycles.denoiser = "OPENIMAGEDENOISE"
    if hasattr(scene.cycles, "denoising_prefilter"):
        scene.cycles.denoising_prefilter = "FAST"
    if hasattr(scene.cycles, "denoising_use_gpu"):
        scene.cycles.denoising_use_gpu = True
    scene.cycles.max_bounces = 3
    scene.cycles.diffuse_bounces = 2
    scene.cycles.glossy_bounces = 2
    scene.cycles.filter_width = 1.15
    scene.render.use_persistent_data = True
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
    scene.view_settings.exposure = 0.08

    mats = build_cycles_studio_materials()

    # Calibrate studio_bg with camera-ray-only warm morning linen (#FAF7F0) cove lift:
    # preserves 100% sculptural lighting on the practitioner & crisp grounded floor shadows
    # while eliminating dark grazing-angle gray falloff on the upper infinity cyclorama.
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
        map_z.inputs["From Min"].default_value = 0.04
        map_z.inputs["From Max"].default_value = 1.65
        map_z.inputs["To Min"].default_value = 0.36
        map_z.inputs["To Max"].default_value = 0.92

        mul_cam = nt_bg.nodes.new("ShaderNodeMath")
        mul_cam.operation = "MULTIPLY"

        linen_emit = nt_bg.nodes.new("ShaderNodeEmission")
        # AgX-calibrated warm morning linen radiance -> renders cleanly at #FAF7F0 / #F7F3EA
        linen_emit.inputs["Color"].default_value = (1.0, 0.952, 0.858, 1.0)
        linen_emit.inputs["Strength"].default_value = 5.6

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
    bg.inputs["Color"].default_value = (*srgb_tuple((0.992, 0.984, 0.964)), 1.0)
    bg.inputs["Strength"].default_value = 0.36

    def add_area_light(lname: str, loc, rot_deg, energy: float, size: float, color):
        ldata = bpy.data.lights.new(lname, type="AREA")
        ldata.energy = energy
        ldata.size = size
        ldata.color = color
        lobj = bpy.data.objects.new(lname, ldata)
        lobj.location = loc
        lobj.rotation_euler = tuple(math.radians(a) for a in rot_deg)
        scene.collection.objects.link(lobj)
        return lobj

    # Warm Morning Natural Daylight Linen Atelier (#FAF7F0) + Sculptural 3D Modeling & Grounded Shadows
    add_area_light("AtelierKeyLight", (-2.4, -2.8, 3.5), (46, -18, -28), 335.0, 1.25, (1.0, 0.964, 0.905))
    add_area_light("AtelierFillLight", (2.8, -2.5, 2.3), (56, 20, 32), 76.0, 3.5, (0.975, 0.985, 1.0))
    add_area_light("AtelierRimLight", (0.3, 2.4, 3.0), (-36, 0, 0), 148.0, 2.0, (1.0, 0.974, 0.918))
    add_area_light("AtelierCycWash", (0.0, 2.0, 5.2), (10, 0, 0), 195.0, 7.4, (1.0, 0.988, 0.964))

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
                                     margin=1.11, aspect=640.0 / 400.0)
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
    parser.add_argument("--res-x", type=int, default=720)
    parser.add_argument("--res-y", type=int, default=450)
    parser.add_argument("--samples", type=int, default=14)
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
    for idx, ex in enumerate(subset):
        env_pts = collect_exercise_envelope_points(ex)
        frame_inside_studio(cam, env_pts, ex["id"])
        for phase in ("start", "middle", "end"):
            out_png = os.path.join(args.outdir, f"{ex['id']}.{phase}.png")
            if args.skip_existing and os.path.isfile(out_png) and os.path.getsize(out_png) > 10000:
                continue
            clear_subject_collection(subj_col)
            mc = MeshCollector(subj_col, mats, glb_mode=False)
            rig = ex["phases"][phase]
            build_apparatus_and_props(mc, ex, rig)
            build_sculpted_practitioner(mc, rig, subsurf=1)
            scene.render.filepath = out_png
            bpy.ops.render.render(write_still=True)
            rendered += 1
        if (idx + 1) % 10 == 0 or (idx + 1) == len(subset):
            elapsed = time.time() - t0
            print(
                f"[Flagship Worker {args.start}..{args.end}] {idx + 1}/{len(subset)} exercises ({rendered} frames) in {elapsed:.1f}s ({elapsed / max(1, rendered):.2f}s/frame)",
                flush=True,
            )

    clear_subject_collection(subj_col)


if __name__ == "__main__":
    main()
