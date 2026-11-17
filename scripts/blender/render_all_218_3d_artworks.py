"""
Flagship Precision Blender 5.2 LTS Cycles Metal GPU Renderer — All 218 Pilates 3D Exercises (654 Frames @ 640x400)
Powered by `pilates_3d_modeling_kernel.py`:
- Continuous SubD Multi-Station Anatomical Torso, Muscle-Bellied Limbs, 5-Digit Hands & Tibia-Aligned Grip-Sock Feet
- Industrial Studio Apparatuses (Open C-Frame Wunda Chair, Flanged Cadillac Canopy, Routed Oak Reformer, Piped Whaleback Barrel)
- Procedural European White Oak Grain, Pebbled Sage Leather, Subsurface Skin & Anisotropic Metals
- Exact Perspective Frustum Camera Auto-Framer (`aim_camera_perspective_exact`) guaranteeing 0% clipping across all 654 frames
"""
from __future__ import annotations

import argparse
import json
import math
import os
import sys
import time
import bpy
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


def setup_flagship_cycles_studio(res_x: int = 640, res_y: int = 400, samples: int = 10):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)

    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    try:
        prefs.compute_device_type = "METAL"
        prefs.get_devices()
        for d in prefs.devices:
            d.use = True
        scene.cycles.device = "GPU"
    except Exception:
        scene.cycles.device = "CPU"

    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.cycles.denoiser = "OPENIMAGEDENOISE"
    scene.cycles.max_bounces = 3
    scene.cycles.diffuse_bounces = 2
    scene.cycles.glossy_bounces = 2
    # Must be False when rebuilding dynamic per-exercise meshes so Metal BVH memory never leaks!
    scene.render.use_persistent_data = False
    scene.render.resolution_x = res_x
    scene.render.resolution_y = res_y
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.color_depth = "8"
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = -0.04

    mats = build_cycles_studio_materials()

    # Wide Architectural Cyclorama Floor & Distant Warm Linen Wall (never occludes wide/standing camera)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, 0.0, -0.025))
    flr = bpy.context.active_object
    flr.name = "StudioFloor"
    flr.scale = (32.0, 32.0, 0.05)
    flr.data.materials.append(mats["studio_floor"])

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, 7.2, 3.2))
    wall_back = bpy.context.active_object
    wall_back.name = "StudioBackWall"
    wall_back.scale = (32.0, 0.08, 7.6)
    wall_back.data.materials.append(mats["studio_bg"])

    world = scene.world or bpy.data.worlds.new("StudioWorld")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (*srgb_tuple((0.952, 0.938, 0.908)), 1.0)
    bg.inputs["Strength"].default_value = 0.46

    # Subject-Class-Aware 3-Point Architectural Atelier Softboxes (`blender-lighting`)
    bpy.ops.object.light_add(type="AREA", location=(-2.2, -2.5, 3.0))
    key = bpy.context.active_object
    key.data.energy = 275.0
    key.data.size = 2.4
    key.data.color = (1.0, 0.962, 0.905)
    key.rotation_euler = (math.radians(47), math.radians(-18), math.radians(-28))

    bpy.ops.object.light_add(type="AREA", location=(2.5, -2.3, 2.0))
    fill = bpy.context.active_object
    fill.data.energy = 90.0
    fill.data.size = 3.0
    fill.data.color = (0.94, 0.97, 1.0)
    fill.rotation_euler = (math.radians(58), math.radians(20), math.radians(32))

    bpy.ops.object.light_add(type="AREA", location=(0.2, 1.8, 2.7))
    rim = bpy.context.active_object
    rim.data.energy = 95.0
    rim.data.size = 2.2
    rim.data.color = (1.0, 0.98, 0.93)
    rim.rotation_euler = (math.radians(-38), 0.0, 0.0)

    bpy.ops.object.camera_add(location=(0.0, -3.2, 1.3))
    cam = bpy.context.active_object
    cam.name = "StudioCamera"
    cam.data.lens = 66.0
    cam.data.sensor_width = 36.0
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


def main():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--poses", required=True)
    parser.add_argument("--outdir", required=True)
    parser.add_argument("--start", type=int, default=0)
    parser.add_argument("--end", type=int, default=9999)
    parser.add_argument("--apparatus", type=str, default="")
    args = parser.parse_args(argv)

    os.makedirs(args.outdir, exist_ok=True)
    with open(args.poses, "r", encoding="utf-8") as f:
        all_exercises = json.load(f)

    if args.apparatus:
        allowed = {x.strip() for x in args.apparatus.split(",") if x.strip()}
        all_exercises = [ex for ex in all_exercises if ex["apparatus"] in allowed]
    subset = all_exercises[args.start : args.end]
    scene, cam, subj_col, mats = setup_flagship_cycles_studio(res_x=640, res_y=400, samples=10)

    t0 = time.time()
    rendered = 0
    for idx, ex in enumerate(subset):
        env_pts = collect_exercise_envelope_points(ex)
        aim_camera_perspective_exact(cam, env_pts, azim_deg=-64.0, elev_deg=20.0, margin=1.15, aspect=640.0 / 400.0)
        for phase in ("start", "middle", "end"):
            out_png = os.path.join(args.outdir, f"{ex['id']}.{phase}.png")
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
