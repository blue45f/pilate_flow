"""
Builds ALL 6 Flagship Precision Pilates Studio `.glb` Hero Rigs in Blender 5.2 LTS:
1. `reformer-studio-rig.glb`
2. `cadillac-studio-rig.glb`
3. `chair-studio-rig.glb`
4. `barrel-studio-rig.glb`
5. `mat-studio-rig.glb`
6. `practitioner-studio-rig.glb`

Each asset uses `pilates_3d_modeling_kernel.py` (continuous anatomical torso/limb/hand/foot lofts +
industrial apparatus joinery, open C-frame chair, flanged Cadillac hardware, 3D helical coil springs),
applies modifiers cleanly, verifies manifold topology, grounds `min Z = 0.0`, and batches into 2 PBR
materials (`MAT_StudioDielectric` + `MAT_StudioMetallic`) bound to `StudioFlagshipAtlas` (`256x256`).
"""
from __future__ import annotations

import json
import math
import os
import sys
import bpy
import bmesh
from mathutils import Vector

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from pilates_3d_modeling_kernel import (
    MeshCollector,
    add_cylinder_rod,
    add_ellipsoid,
    add_torus,
    assign_atlas_band_uvs,
    build_apparatus_and_props,
    build_glb_pbr_atlas,
    build_sculpted_practitioner,
    set_bsdf_input,
)


def clear_all_blender_data():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block_col in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.curves):
        for item in list(block_col):
            block_col.remove(item)


def make_glb_materials(atlas_img):
    mats = {}
    for key, mname, rough, metal, sheen, coat in [
        ("glb_diel", "MAT_StudioDielectric", 0.48, 0.0, 0.22, 0.16),
        ("glb_metal", "MAT_StudioMetallic", 0.22, 1.0, 0.0, 0.0),
    ]:
        mat = bpy.data.materials.new(mname)
        mat.use_nodes = True
        nt = mat.node_tree
        bsdf = nt.nodes.get("Principled BSDF")
        set_bsdf_input(bsdf, "Roughness", rough)
        set_bsdf_input(bsdf, "Metallic", metal)
        set_bsdf_input(bsdf, "Sheen Weight", sheen)
        set_bsdf_input(bsdf, "Coat Weight", coat)
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = atlas_img
        nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
        mats[key] = mat
    return mats


def bake_modifiers_and_join(group_name: str, objs: list[bpy.types.Object]) -> bpy.types.Object | None:
    if not objs:
        return None
    deps = bpy.context.evaluated_depsgraph_get()
    baked_objs = []
    for o in objs:
        eval_obj = o.evaluated_get(deps)
        new_mesh = bpy.data.meshes.new_from_object(eval_obj, preserve_all_data_layers=True, depsgraph=deps)
        new_obj = bpy.data.objects.new(o.name + "_baked", new_mesh)
        new_obj.matrix_world = o.matrix_world.copy()
        bpy.context.scene.collection.objects.link(new_obj)
        baked_objs.append(new_obj)
        bpy.data.objects.remove(o, do_unlink=True)

    bpy.ops.object.select_all(action="DESELECT")
    for bo in baked_objs:
        bo.select_set(True)
    bpy.context.view_layer.objects.active = baked_objs[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if len(baked_objs) > 1:
        bpy.ops.object.join()
    joined = bpy.context.view_layer.objects.active
    joined.name = group_name
    joined.data.name = group_name + "_Mesh"

    # Clean topology pass: remove degenerate/loose geometry & ensure outward normals
    bm = bmesh.new()
    bm.from_mesh(joined.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    loose_v = [v for v in bm.verts if not v.link_faces]
    if loose_v:
        bmesh.ops.delete(bm, geom=loose_v, context="VERTS")
    degen_f = [f for f in bm.faces if f.calc_area() < 1e-9]
    if degen_f:
        bmesh.ops.delete(bm, geom=degen_f, context="FACES")
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(joined.data)
    bm.free()
    for p in joined.data.polygons:
        p.use_smooth = True
    return joined


def ground_scene_objects(objs: list[bpy.types.Object]):
    min_z = min(
        (o.matrix_world @ v.co).z
        for o in objs
        if o is not None
        for v in o.data.vertices
    )
    if abs(min_z) > 1e-5:
        for o in objs:
            if o is not None:
                o.location.z -= min_z
        bpy.ops.object.select_all(action="SELECT")
        bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)


def export_raw_glb(out_path: str):
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
    )


def build_practitioner_hero_spec(mc: MeshCollector):
    # Walnut & Champagne Brass Sculptural Pedestal (Z = 0..0.034)
    bm_ped = bmesh.new()
    bmesh.ops.create_cone(bm_ped, cap_ends=True, cap_tris=False, segments=40, radius1=0.35, radius2=0.335, depth=0.034)
    bmesh.ops.translate(bm_ped, vec=(0.0, 0.0, 0.017), verts=bm_ped.verts)
    assign_atlas_band_uvs(bm_ped, 6)
    mc.emit_bmesh("Pedestal_Walnut", bm_ped, "walnut")
    add_torus(mc, "Pedestal_BrassRim", (0.0, 0.0, 0.017), 0.344, 0.0075, "brass", axis="Z", segs=40, tsegs=10)

    # Graceful Standing Pilates Arabesque Balance Pose (true direction poles: knees & elbows anatomically poised)
    rig = {
        "pelvis": [0.02, 0.0, 0.89],
        "spineMid": [0.08, 0.0, 1.08],
        "chest": [0.16, 0.0, 1.27],
        "antHint": [0.96, 0.0, -0.20],
        "lFoot": [0.02, -0.06, 0.072],
        "rFoot": [-0.64, 0.06, 0.78],
        "lKneePole": [1.0, -0.04, 0.08],
        "rKneePole": [-0.18, 0.06, -1.0],
        "lHand": [0.54, -0.24, 1.24],
        "rHand": [0.54, 0.24, 1.24],
        "lElbowPole": [-0.10, -0.85, -0.52],
        "rElbowPole": [-0.10, 0.85, -0.52],
    }
    build_sculpted_practitioner(mc, rig, subsurf=1)

    # Pair of Satin Champagne Brass Toning Spheres cradled cleanly in sculpted palms
    for side, hp in [("L", Vector((0.59, -0.24, 1.255))), ("R", Vector((0.59, 0.24, 1.255)))]:
        add_ellipsoid(mc, f"BrassToningOrb_{side}", hp, 0.028, 0.028, 0.028, "brass", u_seg=16, v_seg=12)


def main():
    poses_path = "/Users/hjunkim/.gemini/antigravity/brain/e3c254a4-3b6a-402f-906c-6b96d66ba5b8/scratch/poses_218x3.json"
    raw_dir = "/Users/hjunkim/.gemini/antigravity/brain/e3c254a4-3b6a-402f-906c-6b96d66ba5b8/scratch/raw_flagship_glbs"
    os.makedirs(raw_dir, exist_ok=True)

    with open(poses_path, "r", encoding="utf-8") as f:
        poses_list = json.load(f)
    by_id = {item["id"]: item for item in poses_list}

    targets = [
        ("reformer-studio-rig.glb", "ex-footwork-01", "middle", None),
        ("cadillac-studio-rig.glb", "original-cadillac-seated-roll-back", "middle", None),
        ("chair-studio-rig.glb", "ex-kr-chair-01", "middle", None),
        ("barrel-studio-rig.glb", "ex-kr-barrel-01", "middle", None),
        ("mat-studio-rig.glb", "expanded-mat-hundred", "middle", ["magic-circle", "foam-roller", "mini-ball"]),
        ("practitioner-studio-rig.glb", None, None, None),
    ]

    for fname, ex_id, phase_key, extra_props in targets:
        clear_all_blender_data()
        atlas = build_glb_pbr_atlas(256)
        mats = make_glb_materials(atlas)
        mc = MeshCollector(bpy.context.scene.collection, mats, glb_mode=True)

        if ex_id is None:
            build_practitioner_hero_spec(mc)
        else:
            ex = dict(by_id[ex_id])
            ex["props"] = extra_props if extra_props is not None else []
            rig = ex["phases"][phase_key]
            build_apparatus_and_props(mc, ex, rig)
            build_sculpted_practitioner(mc, rig, subsurf=1)

        diel_joined = bake_modifiers_and_join("SM_Studio_Dielectric", mc.diel_objs)
        metal_joined = bake_modifiers_and_join("SM_Studio_Metallic", mc.metal_objs)
        final_objs = [o for o in (diel_joined, metal_joined) if o is not None]
        ground_scene_objects(final_objs)

        tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in final_objs)
        verts = sum(len(o.data.vertices) for o in final_objs)
        out_raw = os.path.join(raw_dir, fname)
        export_raw_glb(out_raw)
        print(f"[Flagship GLB Raw] {fname}: {tris} tris, {verts} verts, {os.path.getsize(out_raw)} bytes", flush=True)


if __name__ == "__main__":
    main()
