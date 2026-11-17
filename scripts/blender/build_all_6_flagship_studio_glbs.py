"""
Builds ALL 6 Flagship Precision v3 Pilates Studio `.glb` Hero Rigs in Blender 5.x:
1. `reformer-studio-rig.glb`
2. `cadillac-studio-rig.glb`
3. `chair-studio-rig.glb`
4. `barrel-studio-rig.glb`
5. `mat-studio-rig.glb`
6. `practitioner-studio-rig.glb`

Enforces strict topology & UV hygiene before export:
- 0 `true_nonmanifold` edges, 0 `boundary` edges, 0 `loose_verts`, 0 `wire_edges`
- Applied transforms (`scale == (1, 1, 1)`), floor grounded at `Z = 0.0`
- Non-degenerate isotropic UVs via `uv.smart_project` + `uv.pack_islands` inside `[0, 1]`
- Triangle count strictly inside the `25,000–35,000` flagship sweet spot (2 draw calls, 2 PBR materials)
"""
from __future__ import annotations

import hashlib
import json
import math
import os
import sys
import bpy
import bmesh
from mathutils import Vector

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from pilates_3d_modeling_kernel import (
    MeshCollector,
    add_cylinder_rod,
    add_ellipsoid,
    add_torus,
    atlas_tile_bounds,
    build_apparatus_and_props,
    build_glb_pbr_atlas,
    build_sculpted_practitioner,
    compute_hand_frame,
    set_bsdf_input,
    solve_2bone_ik_with_bend,
)


def make_glb_materials(atlas_img):
    mats = {}
    for key, mname, rough, metal, sheen, coat in [
        ("glb_diel", "MAT_StudioDielectric", 0.44, 0.0, 0.24, 0.16),
        ("glb_metal", "MAT_StudioMetallic", 0.20, 1.0, 0.0, 0.0),
    ]:
        mat = bpy.data.materials.new(mname)
        if mat.node_tree is None:
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


def extract_object_band(obj: bpy.types.Object) -> int:
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    layer = bm.faces.layers.int.get("mat_band")
    band = 6
    if layer is not None and len(bm.faces) > 0:
        for f in bm.faces:
            band = int(f[layer])
            break
    bm.free()
    return band


def bake_modifiers_and_join(scene: bpy.types.Scene, group_name: str, objs: list[bpy.types.Object]) -> bpy.types.Object | None:
    if not objs:
        return None
    deps = bpy.context.evaluated_depsgraph_get()
    baked_objs = []
    for o in objs:
        part_band = extract_object_band(o)
        eval_obj = o.evaluated_get(deps)
        new_mesh = bpy.data.meshes.new_from_object(eval_obj, preserve_all_data_layers=True, depsgraph=deps)

        bm_part = bmesh.new()
        bm_part.from_mesh(new_mesh)
        bmesh.ops.remove_doubles(bm_part, verts=bm_part.verts, dist=1e-6)
        degen_f = [f for f in bm_part.faces if f.calc_area() < 1e-12]
        if degen_f:
            bmesh.ops.delete(bm_part, geom=degen_f, context="FACES")
        wire_e = [e for e in bm_part.edges if not e.link_faces]
        if wire_e:
            bmesh.ops.delete(bm_part, geom=wire_e, context="EDGES")
        loose_v = [v for v in bm_part.verts if not v.link_faces]
        if loose_v:
            bmesh.ops.delete(bm_part, geom=loose_v, context="VERTS")
        bmesh.ops.recalc_face_normals(bm_part, faces=bm_part.faces)
        band_layer = bm_part.faces.layers.int.get("mat_band") or bm_part.faces.layers.int.new("mat_band")
        for f in bm_part.faces:
            f[band_layer] = part_band
        bm_part.to_mesh(new_mesh)
        bm_part.free()

        new_obj = bpy.data.objects.new(o.name + "_baked", new_mesh)
        new_obj.matrix_world = o.matrix_world.copy()
        scene.collection.objects.link(new_obj)
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

    for p in joined.data.polygons:
        p.use_smooth = True
    return joined


def uv_polygon_area(uvs: list[tuple[float, float]]) -> float:
    area2 = 0.0
    n = len(uvs)
    for i in range(n):
        x1, y1 = uvs[i]
        x2, y2 = uvs[(i + 1) % n]
        area2 += x1 * y2 - x2 * y1
    return abs(area2) * 0.5


def unwrap_and_pack_atlas_uvs(obj: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.context.scene.tool_settings.use_uv_select_sync = True

    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_mode(type="FACE")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(
        angle_limit=math.radians(66.0),
        island_margin=0.006,
        area_weight=0.0,
        correct_aspect=True,
        scale_to_bounds=False,
    )

    bm = bmesh.from_edit_mesh(obj.data)
    bm.faces.ensure_lookup_table()
    uv_layer = bm.loops.layers.uv.verify()
    band_layer = bm.faces.layers.int.get("mat_band")
    used_bands = sorted({int(f[band_layer]) for f in bm.faces}) if band_layer is not None else [6]

    for band_idx in used_bands:
        for f in bm.faces:
            f.select = (int(f[band_layer]) == band_idx) if band_layer is not None else True
        bmesh.update_edit_mesh(obj.data, loop_triangles=False, destructive=False)
        bpy.ops.uv.pack_islands(rotate=True, margin=0.022)

        bm = bmesh.from_edit_mesh(obj.data)
        uv_layer = bm.loops.layers.uv.verify()
        band_layer = bm.faces.layers.int.get("mat_band")
        u_min, u_max, v_min, v_max = atlas_tile_bounds(band_idx, pad=0.008)
        pack_u_span = (u_max - u_min) - 0.008
        pack_v_span = (v_max - v_min) - 0.008

        for f in bm.faces:
            if band_layer is not None and int(f[band_layer]) != band_idx:
                continue
            mapped = []
            for loop in f.loops:
                u0 = max(0.0, min(1.0, float(loop[uv_layer].uv.x)))
                v0 = max(0.0, min(1.0, float(loop[uv_layer].uv.y)))
                um = u_min + u0 * pack_u_span
                vm = v_min + v0 * pack_v_span
                loop[uv_layer].uv = (um, vm)
                mapped.append((um, vm))
            if uv_polygon_area(mapped) < 1e-11:
                n_l = len(f.loops)
                uc = u_max - 0.0035
                vc = v_max - 0.0035
                for l_i, loop in enumerate(f.loops):
                    ang = 2.0 * math.pi * l_i / max(3, n_l)
                    loop[uv_layer].uv = (uc + 0.0022 * math.cos(ang), vc + 0.0022 * math.sin(ang))

        bmesh.update_edit_mesh(obj.data, loop_triangles=False, destructive=False)

    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.object.mode_set(mode="OBJECT")

    bm_clean = bmesh.new()
    bm_clean.from_mesh(obj.data)
    bl = bm_clean.faces.layers.int.get("mat_band")
    if bl is not None:
        bm_clean.faces.layers.int.remove(bl)
    bm_clean.to_mesh(obj.data)
    bm_clean.free()


def ground_scene_objects(objs: list[bpy.types.Object]):
    min_z = min(
        (o.matrix_world @ v.co).z
        for o in objs
        if o is not None
        for v in o.data.vertices
    )
    if abs(min_z) > 1e-6:
        bpy.ops.object.select_all(action="DESELECT")
        for o in objs:
            if o is not None:
                o.location.z -= min_z
                o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def verify_strict_hygiene(fname: str, objs: list[bpy.types.Object]) -> tuple[int, int]:
    total_tris = 0
    total_verts = 0
    min_z = float("inf")

    for o in objs:
        sx, sy, sz = (round(float(c), 6) for c in o.scale)
        if (sx, sy, sz) != (1.0, 1.0, 1.0):
            raise RuntimeError(f"[{fname}] {o.name} unapplied scale: {(sx, sy, sz)}")

        for v in o.data.vertices:
            wz = (o.matrix_world @ v.co).z
            if wz < min_z:
                min_z = wz

        bm = bmesh.new()
        bm.from_mesh(o.data)
        true_nonmanifold = sum(1 for e in bm.edges if not e.is_manifold and not e.is_boundary)
        boundary_edges = sum(1 for e in bm.edges if e.is_boundary)
        loose_verts = sum(1 for v in bm.verts if not v.link_edges or not v.link_faces)
        wire_edges = sum(1 for e in bm.edges if not e.link_faces)

        uv_layer = bm.loops.layers.uv.active
        if uv_layer is None:
            bm.free()
            raise RuntimeError(f"[{fname}] {o.name} missing active UV layer!")

        uv_out_of_bounds = 0
        degen_uv_faces = 0
        for f in bm.faces:
            pts = []
            for lp in f.loops:
                u, v = float(lp[uv_layer].uv.x), float(lp[uv_layer].uv.y)
                if u < -1e-5 or u > 1.0 + 1e-5 or v < -1e-5 or v > 1.0 + 1e-5:
                    uv_out_of_bounds += 1
                pts.append((u, v))
            if uv_polygon_area(pts) < 1e-12:
                degen_uv_faces += 1

        tris_o = sum(len(f.verts) - 2 for f in bm.faces)
        verts_o = len(bm.verts)
        bm.free()

        if true_nonmanifold != 0 or loose_verts != 0 or wire_edges != 0 or boundary_edges != 0:
            raise RuntimeError(
                f"[{fname}] {o.name} failed topology hygiene: "
                f"true_nonmanifold={true_nonmanifold}, boundary={boundary_edges}, "
                f"loose_verts={loose_verts}, wire_edges={wire_edges}"
            )
        if uv_out_of_bounds != 0 or degen_uv_faces != 0:
            raise RuntimeError(
                f"[{fname}] {o.name} failed UV hygiene: "
                f"out_of_bounds={uv_out_of_bounds}, degen_uv_faces={degen_uv_faces}"
            )

        total_tris += tris_o
        total_verts += verts_o

    if abs(min_z) > 1e-5:
        raise RuntimeError(f"[{fname}] scene not grounded at Z=0: min_z={min_z:.6f}")

    if not (25000 <= total_tris <= 35000):
        raise RuntimeError(f"[{fname}] triangle count {total_tris} outside 25,000..35,000 target window!")

    return total_tris, total_verts


def export_selected_glb(objs: list[bpy.types.Object], out_path: str):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        use_selection=True,
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
    )


def build_practitioner_hero_spec(mc: MeshCollector):
    add_cylinder_rod(mc, "Pedestal_BrassPlinth", (0.0, 0.0, 0.0), (0.0, 0.0, 0.010), 0.362, "brass", segs=48, r2=0.356)
    add_cylinder_rod(mc, "Pedestal_WalnutDeck", (0.0, 0.0, 0.008), (0.0, 0.0, 0.038), 0.354, "walnut", segs=48, r2=0.338)
    add_torus(mc, "Pedestal_BrassRim", (0.0, 0.0, 0.020), 0.348, 0.0065, "brass", axis="Z", segs=48, tsegs=10)
    add_torus(mc, "Pedestal_BrassInlay", (0.0, 0.0, 0.038), 0.285, 0.0030, "brass", axis="Z", segs=44, tsegs=8)

    rig = {
        "pelvis": [0.02, 0.0, 0.892],
        "spineMid": [0.08, 0.0, 1.082],
        "chest": [0.16, 0.0, 1.272],
        "antHint": [0.96, 0.0, -0.20],
        "lFoot": [0.02, -0.06, 0.074],
        "rFoot": [-0.64, 0.06, 0.782],
        "lKneePole": [1.0, -0.04, 0.08],
        "rKneePole": [-0.18, 0.06, -1.0],
        "lHand": [0.54, -0.24, 1.242],
        "rHand": [0.54, 0.24, 1.242],
        "lElbowPole": [-0.10, -0.85, -0.52],
        "rElbowPole": [-0.10, 0.85, -0.52],
        "supinatePalms": True,
    }
    build_sculpted_practitioner(mc, rig, subsurf=1)

    pelvis = Vector(rig["pelvis"])
    chest = Vector(rig["chest"])
    sp_up = (chest - pelvis).normalized()
    ant_hint = Vector(rig["antHint"])
    ant_n = (ant_hint - sp_up * ant_hint.dot(sp_up)).normalized()
    body_right = sp_up.cross(ant_n).normalized()
    for side, sign, hd_key, ep_key in [
        ("L", -1.0, "lHand", "lElbowPole"),
        ("R", 1.0, "rHand", "rElbowPole"),
    ]:
        sh = chest + body_right * (sign * 0.148)
        elb, wr, _ = solve_2bone_ik_with_bend(sh, Vector(rig[hd_key]), 0.28, 0.26, Vector(rig[ep_key]))
        forearm_dir = (wr - elb).normalized()
        fdir, _, dorsal = compute_hand_frame(side, forearm_dir, body_right, ant_n, supinate_up=True)
        orb_center = wr + fdir * 0.062 - dorsal * 0.033
        add_ellipsoid(mc, f"BrassToningOrb_{side}", orb_center, 0.027, 0.027, 0.027, "brass", u_seg=20, v_seg=14)


def build_flagship_glbs(only_keys: list[str] | None = None, poses_path: str | None = None, out_dir: str | None = None) -> dict:
    poses_path = poses_path or os.path.join(SCRIPT_DIR, "poses_studio_canonical.json")
    out_dir = out_dir or os.path.join(ROOT_DIR, "public", "models", "pilates-studio")
    os.makedirs(out_dir, exist_ok=True)

    with open(poses_path, "r", encoding="utf-8") as f:
        poses_list = json.load(f)
    by_id = {item["id"]: item for item in poses_list}

    targets = [
        ("reformer", "reformer-studio-rig.glb", "ex-footwork-01", "middle", None),
        ("cadillac", "cadillac-studio-rig.glb", "original-cadillac-seated-roll-back", "middle", None),
        ("chair", "chair-studio-rig.glb", "ex-kr-chair-01", "middle", None),
        ("barrel", "barrel-studio-rig.glb", "ex-kr-barrel-01", "middle", None),
        ("mat", "mat-studio-rig.glb", "expanded-mat-hundred", "middle", ["magic-circle", "foam-roller", "mini-ball"]),
        ("practitioner", "practitioner-studio-rig.glb", None, None, None),
    ]
    if only_keys:
        allowed = set(only_keys)
        targets = [t for t in targets if t[0] in allowed]

    work_scene = bpy.context.scene
    if bpy.context.object and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")

    results = {}
    atlas = build_glb_pbr_atlas(512)
    mats = make_glb_materials(atlas)
    try:
        for app_key, fname, ex_id, phase_key, extra_props in targets:
            for o in list(work_scene.objects):
                bpy.data.objects.remove(o, do_unlink=True)
            for m in list(bpy.data.meshes):
                if m.users == 0:
                    bpy.data.meshes.remove(m)

            mc = MeshCollector(work_scene.collection, mats, glb_mode=True)
            if ex_id is None:
                build_practitioner_hero_spec(mc)
            else:
                ex = dict(by_id[ex_id])
                ex["props"] = extra_props if extra_props is not None else []
                rig = ex["phases"][phase_key]
                build_apparatus_and_props(mc, ex, rig)
                build_sculpted_practitioner(mc, rig, subsurf=1)

            diel_joined = bake_modifiers_and_join(work_scene, "SM_Studio_Dielectric", mc.diel_objs)
            metal_joined = bake_modifiers_and_join(work_scene, "SM_Studio_Metallic", mc.metal_objs)
            final_objs = [o for o in (diel_joined, metal_joined) if o is not None]

            ground_scene_objects(final_objs)
            for o in final_objs:
                unwrap_and_pack_atlas_uvs(o)

            tris, verts = verify_strict_hygiene(fname, final_objs)
            out_glb = os.path.join(out_dir, fname)
            export_selected_glb(final_objs, out_glb)
            with open(out_glb, "rb") as gf:
                glb_bytes = gf.read()
            results[app_key] = {
                "fileName": fname,
                "fileBytes": len(glb_bytes),
                "triangles": tris,
                "vertices": verts,
                "drawCalls": len(final_objs),
                "sha256": hashlib.sha256(glb_bytes).hexdigest(),
            }
            for o in final_objs:
                bpy.data.objects.remove(o, do_unlink=True)
    finally:
        for mat in mats.values():
            bpy.data.materials.remove(mat)
        bpy.data.images.remove(atlas)
        for m in list(bpy.data.meshes):
            if m.users == 0:
                bpy.data.meshes.remove(m)

    return results


if __name__ == "__main__":
    summary = build_flagship_glbs()
    print(json.dumps(summary, indent=2), flush=True)
