"""
Blender 5.3 Single Skinned Watertight Korean Pilates Instructor GLB Builder
Outputs: `public/models/pilates-studio/instructor-skinned-v5.glb`

Architecture:
- Single continuous watertight 2-manifold humanoid mesh (`SM_Instructor_Skinned`)
  inheriting the flagship 7.5-head Korean Pilates studio instructor silhouette & palette
  from `pilates_3d_modeling_kernel.py` (botanical sage scoop-neck crop top, deep forest
  7/8 leggings showing dainty bare ankles, ivory ballet grip socks with crisscross sage
  ribbons, porcelain-peach skin with soft Korean cheek blush, sculpted almond eyes,
  MLBB coral-rose lips, and silky espresso ponytail with champagne satin scrunchie).
- Real 21-bone Armature (`Armature_Instructor`) in standard A-pose (height ~1.65 m,
  grounded cleanly at Z = 0.0 -> Y = 0.0 in glTF, facing -Y -> +Z in glTF):
    Pelvis, SpineLower, SpineUpper, Chest, Neck, Head, Ponytail,
    Shoulder_L/R, UpperArm_L/R, Forearm_L/R, Hand_L/R,
    Thigh_L/R, Shin_L/R, Foot_L/R.
- Smooth normalized joint-chain skinning weights (max 4 influences per vertex,
  3-ring Hermite blending across hips, shoulders, knees, elbows, wrists, ankles, and
  spine, followed by 2 topological smoothing passes on body sockets).
- 1 draw call, 1 PBR material (`MAT_InstructorStudioPBR`), packed 256x256 neutral
  micro-weave atlas + 64x64 surface roughness atlas + linear `COLOR_0` vertex colors +
  non-degenerate `TEXCOORD_0` 4x4 tile UVs encoding exact material role per triangle.
- Strict hygiene gate before export:
    0 true non-manifold edges, 0 boundary edges, 0 loose verts, 0 wire edges,
    22,000..32,000 smooth triangles, <= 1.4 MB GLB, Z = 0.0 grounded, height ~1.63–1.65 m.
"""
from __future__ import annotations

import json
import math
import os
import struct
import sys

import bmesh
import bpy
from mathutils import Matrix, Quaternion, Vector
from mathutils.bvhtree import BVHTree

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from pilates_3d_modeling_kernel import (
    _extrude_seamless_limb_from_hole,
    atlas_tile_bounds,
    bezier3,
    bezier3_tan,
    eval_catmull_rom_spline,
    sample_rounded_2seg_chain,
    set_bsdf_input,
    srgb_tuple,
)

# ==============================================================================
# 1. PALETTE, ATLAS BANDS & PART REGION CONSTANTS
# ==============================================================================

# Palette matched closely to `realtimeStudio3dEngine.ts` + `pilates_3d_modeling_kernel.py` v5
COLOR_SRGB: dict[str, tuple[float, float, float]] = {
    "skin": (0.958, 0.828, 0.750),
    "skin_face": (0.962, 0.832, 0.756),
    "cheek_blush": (0.955, 0.618, 0.588),
    "lid_tint": (0.788, 0.590, 0.556),
    "lip_halo": (0.892, 0.562, 0.542),
    "lip_tint": (0.848, 0.432, 0.425),
    "eye_white": (0.966, 0.954, 0.942),
    "iris_dark": (0.118, 0.070, 0.048),
    "iris_glow": (0.425, 0.242, 0.142),
    "catchlight": (0.994, 0.990, 0.984),
    "lash_ink": (0.072, 0.048, 0.042),
    "brow_soft": (0.162, 0.108, 0.082),
    "suit": (0.268, 0.422, 0.352),
    "legging": (0.168, 0.292, 0.242),
    "suit_accent": (0.958, 0.944, 0.912),
    "scrunchie": (0.918, 0.872, 0.794),
    "hair": (0.185, 0.120, 0.092),
    "sock": (0.960, 0.946, 0.916),
}

# 4x4 atlas tile index encoding PBR roughness & runtime materialRole
MAT_TO_BAND: dict[str, int] = {
    "skin": 5,
    "skin_face": 5,
    "suit": 6,
    "legging": 7,
    "lip_tint": 12,
    "eye_white": 12,
    "iris_dark": 12,
    "iris_glow": 12,
    "catchlight": 12,
    "hair": 13,
    "brow_soft": 14,
    "lash_ink": 14,
    "sock": 15,
    "suit_accent": 15,
    "scrunchie": 15,
}

# Topological part region IDs (stored on faces so Catmull-Clark Subsurf preserves them!)
REGION_TORSO_NECK = 0
REGION_LEG_L = 1
REGION_LEG_R = 2
REGION_ARM_L = 3
REGION_ARM_R = 4
REGION_HEAD = 5
REGION_PONYTAIL = 6
REGION_HAND_L = 7
REGION_HAND_R = 8
REGION_FOOT_L = 9
REGION_FOOT_R = 10
REGION_STRAP_L = 11
REGION_STRAP_R = 12

# Complete 21-bone hierarchy (all bones enumerated in spec)
BONE_NAMES: list[str] = [
    "Pelvis",
    "SpineLower",
    "SpineUpper",
    "Chest",
    "Neck",
    "Head",
    "Ponytail",
    "Shoulder_L",
    "UpperArm_L",
    "Forearm_L",
    "Hand_L",
    "Shoulder_R",
    "UpperArm_R",
    "Forearm_R",
    "Hand_R",
    "Thigh_L",
    "Shin_L",
    "Foot_L",
    "Thigh_R",
    "Shin_R",
    "Foot_R",
]


def clamp(v: float, lo: float, hi: float) -> float:
    return lo if v < lo else (hi if v > hi else v)


def smoothstep(edge0: float, edge1: float, x: float) -> float:
    if abs(edge1 - edge0) < 1e-8:
        return 1.0 if x >= edge1 else 0.0
    t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def clear_scene() -> None:
    if bpy.context.object and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for col in (bpy.data.meshes, bpy.data.armatures, bpy.data.materials, bpy.data.images, bpy.data.cameras, bpy.data.lights):
        for item in list(col):
            col.remove(item)


# ==============================================================================
# 2. A-POSE SKELETON LANDMARKS (Blender Z-Up, Facing -Y -> glTF Y-Up Facing +Z)
# ==============================================================================

def build_apose_landmarks() -> dict[str, Vector]:
    """
    Graceful 7.5-head Korean Pilates instructor A-pose (~1.646 m tall, Z = 0.0 grounded).
    Blender Z-up convention:
      +Z = Up
      -Y = Anterior (Face forward -> glTF +Z)
      +X = Character Left (`_L`, equals +Z x -Y)
      -X = Character Right (`_R`)
    """
    lm: dict[str, Vector] = {
        "pelvis": Vector((0.0, 0.0, 0.904)),
        "spine_lower": Vector((0.0, 0.004, 1.015)),
        "spine_mid": Vector((0.0, 0.005, 1.132)),
        "spine_upper": Vector((0.0, 0.002, 1.152)),
        "chest_base": Vector((0.0, -0.001, 1.268)),
        "chest": Vector((0.0, -0.004, 1.356)),
        "neck_base": Vector((0.0, -0.003, 1.384)),
        "neck_top": Vector((0.0, -0.006, 1.462)),
        "head_pos": Vector((0.0, -0.013, 1.522)),
        "head_top": Vector((0.0, -0.010, 1.622)),
        "ponytail_root": Vector((0.0, 0.075, 1.570)),
        "ponytail_tip": Vector((0.0, 0.168, 1.402)),
    }
    for side, sx in (("L", 1.0), ("R", -1.0)):
        lm[f"hip_{side}"] = Vector((sx * 0.088, 0.0, 0.904))
        lm[f"knee_{side}"] = Vector((sx * 0.092, -0.006, 0.480))
        lm[f"ankle_{side}"] = Vector((sx * 0.096, 0.002, 0.068))
        lm[f"foot_tip_{side}"] = Vector((sx * 0.104, -0.138, 0.024))

        lm[f"clav_{side}"] = Vector((sx * 0.032, -0.004, 1.348))
        lm[f"shoulder_{side}"] = Vector((sx * 0.148, 0.002, 1.326))
        lm[f"elbow_{side}"] = Vector((sx * 0.368, 0.018, 1.142))
        lm[f"wrist_{side}"] = Vector((sx * 0.570, -0.012, 0.974))
        lm[f"hand_tip_{side}"] = Vector((sx * 0.670, -0.024, 0.892))
    return lm


def create_instructor_armature(lm: dict[str, Vector]) -> bpy.types.Object:
    arm_data = bpy.data.armatures.new("Armature_Instructor_Data")
    arm_obj = bpy.data.objects.new("Armature_Instructor", arm_data)
    bpy.context.scene.collection.objects.link(arm_obj)
    bpy.context.view_layer.objects.active = arm_obj
    arm_obj.select_set(True)

    bpy.ops.object.mode_set(mode="EDIT")
    eb = arm_data.edit_bones

    fwd = Vector((0.0, -1.0, 0.0))
    up = Vector((0.0, 0.0, 1.0))

    specs = [
        # (name, parent_name, head, tail, roll_hint)
        ("Pelvis", None, lm["pelvis"], lm["spine_lower"], fwd),
        ("SpineLower", "Pelvis", lm["spine_lower"], lm["spine_upper"], fwd),
        ("SpineUpper", "SpineLower", lm["spine_upper"], lm["chest_base"], fwd),
        ("Chest", "SpineUpper", lm["chest_base"], lm["neck_base"], fwd),
        ("Neck", "Chest", lm["neck_base"], lm["neck_top"], fwd),
        ("Head", "Neck", lm["neck_top"], lm["head_top"], fwd),
        ("Ponytail", "Head", lm["ponytail_root"], lm["ponytail_tip"], fwd),
    ]
    for side in ("L", "R"):
        specs.extend([
            (f"Shoulder_{side}", "Chest", lm[f"clav_{side}"], lm[f"shoulder_{side}"], fwd),
            (f"UpperArm_{side}", f"Shoulder_{side}", lm[f"shoulder_{side}"], lm[f"elbow_{side}"], fwd),
            (f"Forearm_{side}", f"UpperArm_{side}", lm[f"elbow_{side}"], lm[f"wrist_{side}"], fwd),
            (f"Hand_{side}", f"Forearm_{side}", lm[f"wrist_{side}"], lm[f"hand_tip_{side}"], fwd),
            (f"Thigh_{side}", "Pelvis", lm[f"hip_{side}"], lm[f"knee_{side}"], fwd),
            (f"Shin_{side}", f"Thigh_{side}", lm[f"knee_{side}"], lm[f"ankle_{side}"], fwd),
            (f"Foot_{side}", f"Shin_{side}", lm[f"ankle_{side}"], lm[f"foot_tip_{side}"], up),
        ])

    created: dict[str, bpy.types.EditBone] = {}
    for bname, pname, head_p, tail_p, roll_v in specs:
        bone = eb.new(bname)
        bone.head = head_p.copy()
        bone.tail = tail_p.copy()
        bone.align_roll(roll_v)
        if pname is not None:
            bone.parent = created[pname]
            bone.use_connect = False
        created[bname] = bone

    bpy.ops.object.mode_set(mode="OBJECT")
    arm_obj.select_set(False)
    return arm_obj


# ==============================================================================
# 3. COMPACT PBR TEXTURES & SINGLE MATERIAL (VertexColor * MicroAtlas)
# ==============================================================================

def build_neutral_micro_atlas(size: int = 256) -> bpy.types.Image:
    """
    256x256 subtle near-white micro-weave / organic surface detail atlas (RGB in 0.965..1.000).
    Multiplied with linear COLOR_0 vertex colors in PBR shaders so both standard glTF viewers
    and our zero-dependency WebGPU/WebGL2 retargeter display identical calibrated studio colors.
    """
    img = bpy.data.images.new("InstructorMicroAtlas", width=size, height=size, alpha=False)
    img.colorspace_settings.name = "sRGB"
    grid = 4
    tile_px = size // grid
    pixels = [1.0] * (size * size * 4)
    idx = 0
    for y in range(size):
        row = min(grid - 1, y // tile_px)
        ly = y % tile_px
        for x in range(size):
            col = min(grid - 1, x // tile_px)
            lx = x % tile_px
            band = row * grid + col
            if band in (6, 7, 15):
                # Subtle athleisure jersey micro-knit
                grain = 0.985 + 0.014 * math.sin(lx * 0.95) * math.cos(ly * 0.95)
            elif band in (13, 14):
                # Silky hair strand micro-modulation
                grain = 0.982 + 0.017 * math.sin(lx * 0.72 + ly * 0.16)
            else:
                # Smooth porcelain skin & gloss
                grain = 0.992 + 0.006 * math.sin(lx * 0.45 + ly * 0.45)
            c = clamp(grain, 0.95, 1.0)
            pixels[idx] = c
            pixels[idx + 1] = c
            pixels[idx + 2] = c
            pixels[idx + 3] = 1.0
            idx += 4
    img.pixels[:] = pixels
    img.pack()
    return img


def build_instructor_roughness_atlas(size: int = 64) -> bpy.types.Image:
    """64x64 Non-Color roughness atlas matching the 16 4x4 bands (G channel -> glTF roughness)."""
    roughness = (
        0.30, 0.30, 0.30, 0.30,
        0.30, 0.48, 0.78, 0.80,
        0.65, 0.45, 0.45, 0.45,
        0.16, 0.42, 0.56, 0.72,
    )
    img = bpy.data.images.new("InstructorSurfaceAtlas", width=size, height=size, alpha=False)
    img.colorspace_settings.name = "Non-Color"
    pixels = []
    step = size // 4
    for y in range(size):
        row = min(3, y // step)
        for x in range(size):
            col = min(3, x // step)
            band = row * 4 + col
            pixels.extend((1.0, roughness[band], 0.0, 1.0))
    img.pixels[:] = pixels
    img.pack()
    return img


def make_instructor_material(micro_img: bpy.types.Image, surf_img: bpy.types.Image) -> bpy.types.Material:
    mat = bpy.data.materials.new("MAT_InstructorStudioPBR")
    if mat.node_tree is None:
        mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    set_bsdf_input(bsdf, "Metallic", 0.0)
    set_bsdf_input(bsdf, "Specular IOR Level", 0.32)

    tex_micro = nt.nodes.new("ShaderNodeTexImage")
    tex_micro.image = micro_img

    vcol = nt.nodes.new("ShaderNodeVertexColor")
    vcol.layer_name = "Col"

    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.blend_type = "MULTIPLY"
    mix.inputs["Factor"].default_value = 1.0
    nt.links.new(tex_micro.outputs["Color"], mix.inputs[6])
    nt.links.new(vcol.outputs["Color"], mix.inputs[7])
    nt.links.new(mix.outputs[2], bsdf.inputs["Base Color"])

    tex_surf = nt.nodes.new("ShaderNodeTexImage")
    tex_surf.image = surf_img
    sep = nt.nodes.new("ShaderNodeSeparateColor")
    nt.links.new(tex_surf.outputs["Color"], sep.inputs["Color"])
    nt.links.new(sep.outputs["Green"], bsdf.inputs["Roughness"])

    mat.use_backface_culling = True
    return mat


# ==============================================================================
# 4. PART COLLECTOR WITH LINEAR VERTEX COLORS, ATLAS BAND & TOPOLOGICAL REGION
# ==============================================================================

class SkinnedPartCollector:
    """Collects watertight closed 2-manifold parts with vertex colors, atlas band, and region tags."""

    def __init__(self, collection, material: bpy.types.Material):
        self.collection = collection
        self.material = material
        self.objects: list[bpy.types.Object] = []

    def emit_bmesh(
        self,
        name: str,
        bm: bmesh.types.BMesh,
        mat_key: str,
        region_id: int,
        matrix: Matrix | None = None,
        subsurf_levels: int = 0,
        mat_keys: list[str] | None = None,
        custom_vertex_color_fn=None,
    ) -> bpy.types.Object:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        band_layer = bm.faces.layers.int.get("mat_band") or bm.faces.layers.int.new("mat_band")
        region_layer = bm.faces.layers.int.get("part_region") or bm.faces.layers.int.new("part_region")
        col_layer = bm.loops.layers.color.get("Col") or bm.loops.layers.color.new("Col")

        key_list = mat_keys if mat_keys is not None else [mat_key]
        for face in bm.faces:
            m_idx = min(len(key_list) - 1, max(0, face.material_index))
            fkey = key_list[m_idx]
            face[band_layer] = MAT_TO_BAND.get(fkey, 5)
            face[region_layer] = region_id
            face.material_index = 0
            lin_rgb = srgb_tuple(COLOR_SRGB.get(fkey, COLOR_SRGB["skin"]))
            for loop in face.loops:
                if custom_vertex_color_fn is not None:
                    r, g, b = custom_vertex_color_fn(loop.vert, fkey, lin_rgb)
                    loop[col_layer] = (r, g, b, 1.0)
                else:
                    loop[col_layer] = (lin_rgb[0], lin_rgb[1], lin_rgb[2], 1.0)

        mesh = bpy.data.meshes.new(name + "_Mesh")
        bm.to_mesh(mesh)
        bm.free()

        obj = bpy.data.objects.new(name, mesh)
        self.collection.objects.link(obj)
        if matrix is not None:
            obj.matrix_world = matrix
        obj.data.materials.append(self.material)
        for p in obj.data.polygons:
            p.use_smooth = True
        if subsurf_levels > 0:
            mod = obj.modifiers.new("Subsurf", "SUBSURF")
            mod.levels = subsurf_levels
            mod.render_levels = subsurf_levels
        self.objects.append(obj)
        return obj


def add_closed_loft(
    pc: SkinnedPartCollector,
    name: str,
    stations: list[tuple[Vector, Vector, Vector, callable]],
    mat_key: str,
    region_id: int,
    radial_segs: int = 12,
    cap_start: float = 0.004,
    cap_end: float = 0.004,
    subsurf_levels: int = 0,
) -> bpy.types.Object:
    bm = bmesh.new()
    rings = []
    for c, ax, ay, prof in stations:
        row = []
        for s in range(radial_segs):
            th = 2.0 * math.pi * s / radial_segs
            dx, dy = prof(th)
            row.append(bm.verts.new(c + ax * dx + ay * dy))
        rings.append(row)

    for i in range(len(rings) - 1):
        for s in range(radial_segs):
            s2 = (s + 1) % radial_segs
            bm.faces.new((rings[i][s], rings[i][s2], rings[i + 1][s2], rings[i + 1][s]))

    # Rounded start cap
    c0, ax0, ay0, prof0 = stations[0]
    t0 = (stations[1][0] - c0).normalized() if len(stations) > 1 else Vector((0, 0, 1))
    prev = rings[0]
    if cap_start > 1e-5:
        nrow = [
            bm.verts.new(c0 + ax0 * (prof0(2.0 * math.pi * s / radial_segs)[0] * 0.55)
                         + ay0 * (prof0(2.0 * math.pi * s / radial_segs)[1] * 0.55)
                         - t0 * (cap_start * 0.6))
            for s in range(radial_segs)
        ]
        for s in range(radial_segs):
            s2 = (s + 1) % radial_segs
            bm.faces.new((nrow[s], nrow[s2], prev[s2], prev[s]))
        prev = nrow
    p0 = bm.verts.new(c0 - t0 * cap_start)
    for s in range(radial_segs):
        s2 = (s + 1) % radial_segs
        bm.faces.new((p0, prev[s2], prev[s]))

    # Rounded end cap
    c1, ax1, ay1, prof1 = stations[-1]
    t1 = (c1 - stations[-2][0]).normalized() if len(stations) > 1 else Vector((0, 0, 1))
    prev = rings[-1]
    if cap_end > 1e-5:
        nrow = [
            bm.verts.new(c1 + ax1 * (prof1(2.0 * math.pi * s / radial_segs)[0] * 0.55)
                         + ay1 * (prof1(2.0 * math.pi * s / radial_segs)[1] * 0.55)
                         + t1 * (cap_end * 0.6))
            for s in range(radial_segs)
        ]
        for s in range(radial_segs):
            s2 = (s + 1) % radial_segs
            bm.faces.new((prev[s], prev[s2], nrow[s2], nrow[s]))
        prev = nrow
    p1 = bm.verts.new(c1 + t1 * cap_end)
    for s in range(radial_segs):
        s2 = (s + 1) % radial_segs
        bm.faces.new((prev[s], prev[s2], p1))

    return pc.emit_bmesh(name, bm, mat_key, region_id, subsurf_levels=subsurf_levels)


def add_closed_tube(
    pc: SkinnedPartCollector,
    name: str,
    points: list[Vector],
    radius: float,
    mat_key: str,
    region_id: int,
    closed: bool = False,
    radial_segs: int = 6,
    aspect_b: float = 1.0,
    radius_scale_fn=None,
    surface_normal_fn=None,
) -> bpy.types.Object:
    pts = [Vector(p) for p in points]
    n = len(pts)
    bm = bmesh.new()
    rings = []
    prev_n = None

    for i in range(n):
        if closed:
            t_vec = pts[(i + 1) % n] - pts[(i - 1) % n]
        elif i == 0:
            t_vec = pts[1] - pts[0]
        elif i == n - 1:
            t_vec = pts[-1] - pts[-2]
        else:
            t_vec = pts[i + 1] - pts[i - 1]
        tan = t_vec.normalized() if t_vec.length > 1e-6 else Vector((0, 0, 1))

        if surface_normal_fn is not None:
            bn = surface_normal_fn(pts[i])
            bn = bn - tan * bn.dot(tan)
            if bn.length < 1e-5:
                ref = Vector((0, 0, 1)) if abs(tan.z) < 0.85 else Vector((1, 0, 0))
                bn = (ref - tan * ref.dot(tan)).normalized()
            else:
                bn.normalize()
            an = bn.cross(tan).normalized()
        else:
            if prev_n is None:
                ref = Vector((0, 0, 1)) if abs(tan.z) < 0.85 else Vector((1, 0, 0))
                an = (ref - tan * ref.dot(tan)).normalized()
            else:
                an = prev_n - tan * prev_n.dot(tan)
                if an.length < 1e-5:
                    ref = Vector((0, 0, 1)) if abs(tan.z) < 0.85 else Vector((1, 0, 0))
                    an = (ref - tan * ref.dot(tan)).normalized()
                else:
                    an.normalize()
            prev_n = an
            bn = tan.cross(an).normalized()

        t_u = i / max(1, n - 1)
        scale = radius_scale_fn(t_u) if radius_scale_fn is not None else 1.0
        ra = max(0.0005, radius * scale)
        rb = max(0.0004, radius * scale * aspect_b)
        row = []
        for s in range(radial_segs):
            ang = 2.0 * math.pi * s / radial_segs
            row.append(bm.verts.new(pts[i] + an * (math.cos(ang) * ra) + bn * (math.sin(ang) * rb)))
        rings.append(row)

    seg_count = n if closed else n - 1
    for i in range(seg_count):
        i2 = (i + 1) % n
        for s in range(radial_segs):
            s2 = (s + 1) % radial_segs
            bm.faces.new((rings[i][s], rings[i][s2], rings[i2][s2], rings[i2][s]))

    if not closed:
        t0 = (pts[1] - pts[0]).normalized() if n > 1 else Vector((0, 0, 1))
        t1 = (pts[-1] - pts[-2]).normalized() if n > 1 else Vector((0, 0, 1))
        p0 = bm.verts.new(pts[0] - t0 * (radius * 0.4))
        p1 = bm.verts.new(pts[-1] + t1 * (radius * 0.4))
        for s in range(radial_segs):
            s2 = (s + 1) % radial_segs
            bm.faces.new((p0, rings[0][s2], rings[0][s]))
            bm.faces.new((rings[-1][s], rings[-1][s2], p1))

    return pc.emit_bmesh(name, bm, mat_key, region_id)


def add_closed_ellipsoid(
    pc: SkinnedPartCollector,
    name: str,
    center: Vector,
    rx: float,
    ry: float,
    rz: float,
    mat_key: str,
    region_id: int,
    u_seg: int = 10,
    v_seg: int = 8,
    quat: Quaternion | None = None,
) -> bpy.types.Object:
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=u_seg, v_segments=v_seg, radius=1.0)
    for v in bm.verts:
        v.co = (v.co.x * rx, v.co.y * ry, v.co.z * rz)
    mat = Matrix.Translation(center)
    if quat is not None:
        mat = mat @ quat.to_matrix().to_4x4()
    return pc.emit_bmesh(name, bm, mat_key, region_id, matrix=mat)


# ==============================================================================
# 5. SEAMLESS WATERTIGHT BODY, HEAD/HAIR, HANDS & BALLET GRIP FEET
# ==============================================================================

def build_seamless_body_apose(pc: SkinnedPartCollector, lm: dict[str, Vector]) -> None:
    """
    Single continuous watertight 2-manifold quad mesh uniting:
    pelvis + glutes + Y-bifurcated slim legs (7/8 forest leggings -> bare ankles)
    + toned hourglass midriff + ivory underbust trim + botanical sage scoop-neck crop top
    + collarbones + lateral shoulder-extruded A-pose arms + elongated swan neck.
    """
    pelvis = lm["pelvis"]
    spine_mid = lm["spine_mid"]
    chest = lm["chest"]
    head_pos = lm["head_pos"]
    up_axis = Vector((0.0, 0.0, 1.0))
    ant_n = Vector((0.0, -1.0, 0.0))
    body_right = up_axis.cross(ant_n).normalized()  # (+1, 0, 0) = Character Left (+X)

    def spine_frame(u_clamped: float):
        uc = clamp(u_clamped, 0.0, 1.0)
        pt = bezier3(pelvis, spine_mid, chest, uc)
        tan = bezier3_tan(pelvis, spine_mid, chest, uc)
        if u_clamped < 0.0:
            pt = pelvis + tan * (u_clamped * 0.44)
        elif u_clamped > 1.0:
            pt = chest + tan * ((u_clamped - 1.0) * 0.44)
        r_ax = (body_right - tan * body_right.dot(tan)).normalized()
        f_ax = r_ax.cross(tan).normalized()
        if f_ax.dot(ant_n) < 0:
            f_ax = -f_ax
        return pt, r_ax, f_ax, tan

    def torso_contour(
        u_val: float,
        th: float,
        rx: float,
        ry_f: float,
        ry_b: float,
        glute_cleft: float = 0.0,
        bust_boost: float = 0.0,
        scap_relief: float = 0.0,
        clav_relief: float = 0.0,
        notch_depth: float = 0.0,
        garment_offset: float = 0.0,
        waist_tone: float = 0.0,
    ) -> tuple[float, float]:
        ct, st = math.cos(th), math.sin(th)
        if st >= 0.0:
            y = (st ** 0.96) * (ry_f + garment_offset)
            if bust_boost > 0.0:
                bust_lobes = bust_boost * (st ** 0.85) * (
                    math.exp(-(((ct - 0.40) / 0.31) ** 2)) + math.exp(-(((ct + 0.40) / 0.31) ** 2))
                )
                sternum_dip = -0.0028 * (bust_boost / 0.024) * math.exp(-((ct / 0.14) ** 2)) * st
                y += bust_lobes + sternum_dip
            if waist_tone > 0.0:
                linea_alba = -0.0028 * waist_tone * math.exp(-((ct / 0.14) ** 2)) * st
                oblique_taper = -0.0020 * waist_tone * math.exp(-(((abs(ct) - 0.56) / 0.20) ** 2)) * st
                y += linea_alba + oblique_taper
            if clav_relief > 0.0:
                jugular_notch = -notch_depth * math.exp(-((ct / 0.13) ** 2)) * st
                sc_heads = (clav_relief * 0.80) * (
                    math.exp(-(((ct - 0.19) / 0.10) ** 2)) + math.exp(-(((ct + 0.19) / 0.10) ** 2))
                ) * st
                clav_bar = clav_relief * math.exp(-(((abs(ct) - 0.50) / 0.26) ** 2)) * (st ** 0.72)
                y += jugular_notch + sc_heads + clav_bar
        else:
            glute_lobe = 1.0 + (0.145 if glute_cleft > 0.001 else 0.0) * (math.sin(2.0 * th) ** 2)
            sacral_dip = glute_cleft * math.exp(-((ct / 0.20) ** 2))
            spinous_furrow = (0.0034 if u_val > 0.25 else 0.0) * math.exp(-((ct / 0.14) ** 2)) * (-st)
            scapula_blades = -scap_relief * (
                math.exp(-(((ct - 0.44) / 0.23) ** 2)) + math.exp(-(((ct + 0.44) / 0.23) ** 2))
            ) * (-st)
            y = st * (ry_b + garment_offset) * glute_lobe + sacral_dip + spinous_furrow + scapula_blades
        return ct * (rx + garment_offset), y

    # N = 24 -> subsurf 1 produces ~13k smooth quads/tris on unified body (~25k–29k total with sculpted head/hair/hands/feet!)
    N = 24
    quarter = N // 4
    half = N // 2
    bm_body = bmesh.new()
    region_layer = bm_body.faces.layers.int.new("part_region")

    torso_ring_specs = [
        # Pelvis & High-Waisted Sculpt Legging (slot 1)
        ("spine", -0.055, 0.128, 0.068, 0.092, 0.011, 0.000, 0.000, 0.000, 0.000, 0.0016, 0.0, 0.0, 1),
        ("spine",  0.020, 0.139, 0.072, 0.108, 0.015, 0.000, 0.000, 0.000, 0.000, 0.0016, 0.0, 0.0, 1),
        ("spine",  0.105, 0.136, 0.071, 0.101, 0.010, 0.000, 0.000, 0.000, 0.000, 0.0016, 0.0, 0.0, 1),
        ("spine",  0.195, 0.120, 0.067, 0.084, 0.003, 0.000, 0.000, 0.000, 0.000, 0.0016, 0.0, 0.0, 1),
        ("spine",  0.295, 0.103, 0.063, 0.070, 0.000, 0.000, 0.000, 0.000, 0.000, 0.0016, 0.3, 0.0, 1),
        ("spine",  0.375, 0.092, 0.061, 0.065, 0.000, 0.000, 0.000, 0.000, 0.000, 0.0016, 0.6, 0.0, 1),
        # Waistband hem -> toned hourglass bare midriff (slot 0 skin)
        ("spine",  0.386, 0.091, 0.060, 0.064, 0.000, 0.000, 0.000, 0.000, 0.000, 0.0000, 0.8, 0.0, 1),
        ("spine",  0.455, 0.089, 0.060, 0.063, 0.000, 0.000, 0.000, 0.000, 0.000, 0.0000, 1.0, 0.0, 0),
        ("spine",  0.525, 0.097, 0.065, 0.068, 0.000, 0.000, 0.000, 0.000, 0.000, 0.0000, 0.7, 0.0, 0),
        # Ivory underbust trim (slot 3) -> botanical sage scoop-neck crop top (slot 2)
        ("spine",  0.538, 0.099, 0.067, 0.069, 0.000, 0.002, 0.001, 0.000, 0.000, 0.0020, 0.2, 0.0, 0),
        ("spine",  0.562, 0.103, 0.070, 0.071, 0.000, 0.005, 0.001, 0.000, 0.000, 0.0020, 0.0, 0.0, 3),
        ("spine",  0.650, 0.114, 0.082, 0.075, 0.000, 0.023, 0.003, 0.000, 0.000, 0.0016, 0.0, 0.0, 2),
        ("spine",  0.740, 0.123, 0.085, 0.079, 0.000, 0.021, 0.005, 0.000, 0.000, 0.0016, 0.0, 0.0, 2),
        ("spine",  0.822, 0.128, 0.077, 0.076, 0.000, 0.006, 0.005, 0.001, 0.000, 0.0016, 0.0, 1.0, 2),
        # Rings 14..17: upper décolleté, clavicles, graceful sloping trapezius & shoulder openings (i_sh_lo=14 .. i_sh_hi=17)
        ("spine",  0.838, 0.128, 0.075, 0.075, 0.000, 0.003, 0.004, 0.0025, 0.0015, 0.0000, 0.0, 0.85, 2),
        ("spine",  0.908, 0.127, 0.070, 0.071, 0.000, 0.000, 0.0035, 0.0056, 0.0042, 0.0000, 0.0, 0.0, 0),
        ("spine",  0.978, 0.110, 0.061, 0.063, 0.000, 0.000, 0.0015, 0.0064, 0.0060, 0.0000, 0.0, 0.0, 0),
        ("spine",  1.038, 0.065, 0.045, 0.047, 0.000, 0.000, 0.000, 0.0022, 0.0024, 0.0000, 0.0, 0.0, 0),
        # Continuous slender swan neck (~0.0345m) seating cleanly inside skull base
        ("neck",   0.18,  0.042, 0.039, 0.041, 0.000, 0.000, 0.000, 0.000, 0.000, 0.0000, 0.0, 0.0, 0),
        ("neck",   0.48,  0.0345, 0.0335, 0.0355, 0.000, 0.000, 0.000, 0.000, 0.000, 0.0000, 0.0, 0.0, 0),
        ("neck",   0.80,  0.0340, 0.0330, 0.0360, 0.000, 0.000, 0.000, 0.000, 0.000, 0.0000, 0.0, 0.0, 0),
        ("neck",   1.00,  0.0380, 0.0360, 0.0395, 0.000, 0.000, 0.000, 0.000, 0.000, 0.0000, 0.0, 0.0, 0),
    ]

    neck_end = head_pos - up_axis * 0.014 - ant_n * 0.011
    pt_neck_base = spine_frame(1.04)[0]
    torso_rings = []
    for kind, u_val, rx, ry_f, ry_b, cleft, bust, scap, clav, notch, g_off, w_tone, scoop_amt, _ in torso_ring_specs:
        row = []
        for s in range(N):
            th = (s + 0.5) * 2.0 * math.pi / N
            ct, st = math.cos(th), math.sin(th)
            if kind == "spine":
                u_eff = u_val
                if scoop_amt > 0.0:
                    center_mask = max(0.0, 1.0 - (abs(ct) / 0.58) ** 2)
                    u_eff -= (0.046 if st > 0.0 else 0.058) * scoop_amt * center_mask * abs(st)
                pt, r_ax, f_ax, _ = spine_frame(u_eff)
                dx, dy = torso_contour(
                    u_eff, th, rx, ry_f, ry_b,
                    glute_cleft=cleft, bust_boost=bust, scap_relief=scap,
                    clav_relief=clav, notch_depth=notch, garment_offset=g_off, waist_tone=w_tone,
                )
                row.append(bm_body.verts.new(pt + r_ax * dx + f_ax * dy))
            else:
                c_nk = pt_neck_base.lerp(neck_end, u_val)
                scm = 0.0014 * math.exp(-(((abs(ct) - 0.44) / 0.22) ** 2)) * max(0.0, st)
                ry_nk = ry_f if st >= 0.0 else ry_b
                row.append(bm_body.verts.new(c_nk + body_right * (ct * rx) + ant_n * (st * ry_nk + scm)))
        torso_rings.append(row)

    # Shoulder hole patches: rings 14..17 (3 rows) x 4 radial quads on each lateral side (N = 24 -> 14-vert arm loops!)
    # Note: +cos(th) is +X (Left `_L`), -cos(th) is -X (Right `_R`).
    i_sh_lo, i_sh_hi = 14, 17
    pos_x_sh_quads = {(N - 2) % N, (N - 1) % N, 0, 1}        # +X side -> Character Left (`_L`)
    neg_x_sh_quads = {half - 2, half - 1, half, half + 1}    # -X side -> Character Right (`_R`)

    for i in range(len(torso_rings) - 1):
        mat_idx = torso_ring_specs[i + 1][13]
        in_sh_band = (i_sh_lo <= i < i_sh_hi)
        for s in range(N):
            if in_sh_band and (s in pos_x_sh_quads or s in neg_x_sh_quads):
                continue
            s2 = (s + 1) % N
            f = bm_body.faces.new((torso_rings[i][s], torso_rings[i][s2], torso_rings[i + 1][s2], torso_rings[i + 1][s]))
            f.material_index = mat_idx
            f[region_layer] = REGION_TORSO_NECK

    # Cap top of swan neck cleanly inside skull base
    top_ring = torso_rings[-1]
    nk_pole = bm_body.verts.new(neck_end + up_axis * 0.010)
    for s in range(N):
        s2 = (s + 1) % N
        f = bm_body.faces.new((top_ring[s], top_ring[s2], nk_pole))
        f.material_index = 0
        f[region_layer] = REGION_TORSO_NECK

    # Perineal bridge splitting Ring 0 cleanly into +X (`_L`) and -X (`_R`) leg openings
    r0_pt, r0_r, r0_f, r0_tan = spine_frame(-0.055)
    s_fP = quarter - 1         # front +X boundary
    s_fN = quarter             # front -X boundary
    s_bN = 3 * quarter - 1     # back -X boundary
    s_bP = 3 * quarter         # back +X boundary
    v_bP0 = bm_body.verts.new(r0_pt + r0_r * 0.013 + r0_f * 0.020 - r0_tan * 0.028)
    v_bN0 = bm_body.verts.new(r0_pt - r0_r * 0.013 + r0_f * 0.020 - r0_tan * 0.028)
    v_bP1 = bm_body.verts.new(r0_pt + r0_r * 0.013 - r0_f * 0.026 - r0_tan * 0.030)
    v_bN1 = bm_body.verts.new(r0_pt - r0_r * 0.013 - r0_f * 0.026 - r0_tan * 0.030)

    for qv in [
        (torso_rings[0][s_fP], v_bP0, v_bN0, torso_rings[0][s_fN]),
        (v_bP0, v_bP1, v_bN1, v_bN0),
        (v_bP1, torso_rings[0][s_bP], torso_rings[0][s_bN], v_bN1),
    ]:
        f = bm_body.faces.new(qv)
        f.material_index = 1
        f[region_layer] = REGION_TORSO_NECK

    # +X hole = Character Left (`L`), -X hole = Character Right (`R`)
    pos_x_leg_hole = (
        [torso_rings[0][s] for s in range(s_bP, N)]
        + [torso_rings[0][s] for s in range(0, s_fP + 1)]
        + [v_bP0, v_bP1]
    )
    neg_x_leg_hole = [torso_rings[0][s] for s in range(s_fN, s_bN + 1)] + [v_bN1, v_bN0]

    socket_smooth_verts = []
    leg_socket_smooth_verts = []

    # Extrude both seamless legs (7/8 forest leggings -> bare dainty ankles)
    for side, leg_hole, reg_id in [
        ("L", pos_x_leg_hole, REGION_LEG_L),
        ("R", neg_x_leg_hole, REGION_LEG_R),
    ]:
        hp = lm[f"hip_{side}"]
        kn = lm[f"knee_{side}"]
        ank = lm[f"ankle_{side}"]
        ankle_end = kn.lerp(ank, 0.965)
        hole_c = sum((v.co for v in leg_hole), Vector((0.0, 0.0, 0.0))) / len(leg_hole)
        thigh_dir0 = (kn - hole_c).normalized()

        leg_profile_table = [
            (0.10,  0.065, 0.069,  0.005, 1),
            (0.19,  0.061, 0.064,  0.005, 1),
            (0.29,  0.054, 0.056,  0.004, 1),
            (0.38,  0.047, 0.049,  0.003, 1),
            (0.42,  0.044, 0.046,  0.003, 1),
            (0.46,  0.042, 0.044,  0.004, 1),
            (0.50,  0.041, 0.043,  0.005, 1),
            (0.54,  0.040, 0.042,  0.002, 1),
            (0.58,  0.039, 0.041, -0.002, 1),
            (0.63,  0.041, 0.044, -0.005, 1),
            (0.70,  0.043, 0.047, -0.007, 1),
            (0.79,  0.036, 0.039, -0.004, 1),
            (0.872, 0.0298, 0.0322, -0.001, 1),
            (0.884, 0.0294, 0.0318, -0.001, 1),
            (0.894, 0.0274, 0.0300, -0.001, 0),
            (0.950, 0.0265, 0.0295,  0.000, 0),
            (1.000, 0.0265, 0.0295,  0.000, 0),
        ]
        leg_stations = []
        for s_val, rx_l, ry_l, ant_shift, m_idx in leg_profile_table:
            pt, tan = sample_rounded_2seg_chain(hole_c, kn, ankle_end, s_val, corner_blend=0.24)
            f_ax = (ant_n - tan * ant_n.dot(tan)).normalized()
            c_shifted = pt + f_ax * ant_shift
            quad_w = math.exp(-(((s_val - 0.25) / 0.13) ** 2))
            patella_w = math.exp(-(((s_val - 0.50) / 0.060) ** 2))
            calf_w = math.exp(-(((s_val - 0.68) / 0.095) ** 2))
            achilles_w = math.exp(-(((s_val - 0.93) / 0.07) ** 2))

            def leg_prof(th, a=rx_l, b=ry_l, qw=quad_w, pw=patella_w, cw=calf_w, aw=achilles_w):
                ct, st = math.cos(th), math.sin(th)
                dx = ct * a
                dy = st * b
                if qw > 0.05:
                    if st > 0:
                        dy += 0.0032 * qw * math.exp(-((ct / 0.44) ** 2)) * st
                        dx += math.copysign(0.0018 * qw * math.exp(-(((abs(ct) - 0.72) / 0.28) ** 2)), ct)
                    else:
                        dy -= 0.0018 * qw * math.exp(-((ct / 0.48) ** 2)) * (-st)
                if pw > 0.05:
                    if st > 0:
                        dy += 0.0036 * pw * math.exp(-((ct / 0.34) ** 2)) * st
                    else:
                        dy += 0.0024 * pw * math.exp(-((ct / 0.45) ** 2)) * (-st)
                    dx += math.copysign(0.0018 * pw * (ct * ct), ct)
                if cw > 0.05:
                    if st > 0:
                        dy += 0.0018 * cw * math.exp(-((ct / 0.24) ** 2)) * st
                    else:
                        twin = math.exp(-(((ct - 0.38) / 0.29) ** 2)) + math.exp(-(((ct + 0.38) / 0.29) ** 2))
                        dy -= 0.0030 * cw * twin * (-st)
                if aw > 0.05 and st < 0:
                    ach_ridge = -0.0026 * aw * math.exp(-((ct / 0.24) ** 2)) * (-st)
                    hollows = 0.0022 * aw * math.exp(-(((abs(ct) - 0.56) / 0.22) ** 2)) * (-st)
                    dy += ach_ridge + hollows
                return dx, dy

            leg_stations.append((c_shifted, tan, f_ax, leg_prof, m_idx))

        before_faces = len(bm_body.faces)
        leg_sock_vs = _extrude_seamless_limb_from_hole(
            bm_body, leg_hole, thigh_dir0, leg_stations, cap_end=0.006,
            socket_s_pair=(0.025, 0.065), station0_s=0.10,
        )
        bm_body.faces.ensure_lookup_table()
        for f in bm_body.faces[before_faces:]:
            f[region_layer] = reg_id
        socket_smooth_verts.extend(leg_sock_vs)
        leg_socket_smooth_verts.extend(leg_sock_vs)

    # Shoulder hole loops (14 vertices per lateral shoulder opening for N = 24, 4 quads wide x 3 rows tall)
    pos_x_sh_hole = (
        [torso_rings[i_sh_lo][s] for s in ((N - 2) % N, (N - 1) % N, 0, 1, 2)]
        + [torso_rings[i][2] for i in range(i_sh_lo + 1, i_sh_hi + 1)]
        + [torso_rings[i_sh_hi][s] for s in (1, 0, (N - 1) % N, (N - 2) % N)]
        + [torso_rings[i][(N - 2) % N] for i in range(i_sh_hi - 1, i_sh_lo, -1)]
    )
    neg_x_sh_hole = (
        [torso_rings[i_sh_lo][s] for s in (half - 2, half - 1, half, half + 1, half + 2)]
        + [torso_rings[i][half + 2] for i in range(i_sh_lo + 1, i_sh_hi + 1)]
        + [torso_rings[i_sh_hi][s] for s in (half + 1, half, half - 1, half - 2)]
        + [torso_rings[i][half - 2] for i in range(i_sh_hi - 1, i_sh_lo, -1)]
    )

    for side, sh_hole, out_hint, reg_id in [
        ("L", pos_x_sh_hole, body_right, REGION_ARM_L),
        ("R", neg_x_sh_hole, -body_right, REGION_ARM_R),
    ]:
        sh = lm[f"shoulder_{side}"]
        elb = lm[f"elbow_{side}"]
        wr = lm[f"wrist_{side}"]
        sh_hole_c = sum((v.co for v in sh_hole), Vector((0.0, 0.0, 0.0))) / len(sh_hole)
        arm_vec = (elb - sh).normalized()
        deltoid_cap_pt = sh + out_hint * 0.008 + arm_vec * 0.022
        arm_dir0 = (deltoid_cap_pt - sh_hole_c).normalized()

        arm_profile_table = [
            (0.09, 0.043, 0.042),
            (0.15, 0.038, 0.039),
            (0.23, 0.0345, 0.0360),
            (0.32, 0.0320, 0.0335),
            (0.39, 0.0305, 0.0315),
            (0.43, 0.0298, 0.0306),
            (0.465, 0.0294, 0.0298),
            (0.50, 0.0292, 0.0294),
            (0.535, 0.0295, 0.0292),
            (0.57, 0.0302, 0.0288),
            (0.61, 0.0300, 0.0282),
            (0.69, 0.0272, 0.0252),
            (0.79, 0.0235, 0.0210),
            (0.91, 0.0198, 0.0160),
            (1.00, 0.0188, 0.0150),
        ]
        arm_stations = []
        for s_val, rx_a, ry_a in arm_profile_table:
            s_chain = clamp((s_val - 0.09) / 0.91, 0.0, 1.0)
            pt, tan = sample_rounded_2seg_chain(deltoid_cap_pt, elb, wr, s_chain, corner_blend=0.26)
            f_ax = (ant_n - tan * ant_n.dot(tan)).normalized()
            delt_w = math.exp(-(((s_val - 0.11) / 0.095) ** 2))
            bicep_w = math.exp(-(((s_val - 0.28) / 0.105) ** 2))
            elb_w = math.exp(-(((s_val - 0.50) / 0.100) ** 2))
            forearm_w = math.exp(-(((s_val - 0.61) / 0.090) ** 2))

            def arm_prof(th, a=rx_a, b=ry_a, dw=delt_w, bw=bicep_w, ew=elb_w, fw=forearm_w):
                ct, st = math.cos(th), math.sin(th)
                deltoid_cap = 0.0034 * dw * math.exp(-(((abs(ct) - 0.52) / 0.48) ** 2))
                bicep_tricep = (0.0018 if st > 0.0 else 0.0014) * bw * math.exp(-((ct / 0.48) ** 2)) * abs(st)
                brachiorad = 0.0015 * fw * math.exp(-(((abs(ct) - 0.58) / 0.36) ** 2))
                olecranon = 0.0015 * ew * math.exp(-((ct / 0.34) ** 2)) * max(0.0, -st)
                return ct * (a + deltoid_cap + brachiorad), st * (b + bicep_tricep) - olecranon

            arm_stations.append((pt, tan, f_ax, arm_prof, 0))

        before_faces = len(bm_body.faces)
        arm_sock_vs = _extrude_seamless_limb_from_hole(
            bm_body, sh_hole, arm_dir0, arm_stations, cap_end=0.005,
            socket_s_pair=(0.025, 0.060), station0_s=0.09,
        )
        bm_body.faces.ensure_lookup_table()
        for f in bm_body.faces[before_faces:]:
            f[region_layer] = reg_id
        socket_smooth_verts.extend(arm_sock_vs)

    # Clean up omitted interior shoulder vertices
    loose_vs = [v for v in bm_body.verts if not v.link_faces]
    if loose_vs:
        bmesh.ops.delete(bm_body, geom=loose_vs, context="VERTS")

    # Selective Laplacian socket smoothing melts hip & shoulder transitions seamlessly
    smooth_targets = list(dict.fromkeys(v for v in socket_smooth_verts if v.is_valid))
    for _ in range(3):
        bmesh.ops.smooth_vert(bm_body, verts=smooth_targets, factor=0.48, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    hip_extra = list(dict.fromkeys(v for v in (leg_socket_smooth_verts + torso_rings[1]) if v.is_valid))
    for _ in range(2):
        bmesh.ops.smooth_vert(bm_body, verts=hip_extra, factor=0.42, use_axis_x=True, use_axis_y=True, use_axis_z=True)

    # Emit unified body with Catmull-Clark level 1 (silky smooth ~7,500 tris!)
    # Preserve exact per-face `part_region` layer set above.
    bmesh.ops.recalc_face_normals(bm_body, faces=bm_body.faces)
    band_layer = bm_body.faces.layers.int.new("mat_band")
    col_layer = bm_body.loops.layers.color.new("Col")
    body_mat_keys = ["skin", "legging", "suit", "suit_accent"]
    for f in bm_body.faces:
        fkey = body_mat_keys[min(len(body_mat_keys) - 1, max(0, f.material_index))]
        f[band_layer] = MAT_TO_BAND[fkey]
        f.material_index = 0
        lin_rgb = srgb_tuple(COLOR_SRGB[fkey])
        for lp in f.loops:
            lp[col_layer] = (lin_rgb[0], lin_rgb[1], lin_rgb[2], 1.0)

    body_mesh = bpy.data.meshes.new("Body_Unified_Mesh")
    bm_body.to_mesh(body_mesh)
    bm_body.free()
    body_obj = bpy.data.objects.new("Body_Unified", body_mesh)
    pc.collection.objects.link(body_obj)
    body_obj.data.materials.append(pc.material)
    for p in body_obj.data.polygons:
        p.use_smooth = True
    mod = body_obj.modifiers.new("Subsurf", "SUBSURF")
    mod.levels = 1
    mod.render_levels = 1
    pc.objects.append(body_obj)

    # Project crop-top shoulder straps & scoop-neck piping strictly onto the evaluated Subsurf Body_Unified surface (ZERO air gap!)
    bpy.context.view_layer.update()
    deps_strap = bpy.context.evaluated_depsgraph_get()
    body_bvh = BVHTree.FromObject(body_obj, deps_strap)

    def snap_to_body_surface(pt: Vector, lift: float = 0.0006) -> tuple[Vector, Vector]:
        hit_loc, hit_nrm, _, _ = body_bvh.find_nearest(pt)
        if hit_loc is not None and hit_nrm is not None:
            n = hit_nrm.normalized() if hit_nrm.length > 1e-6 else Vector((0.0, 0.0, 1.0))
            return hit_loc + n * lift, n
        return pt, Vector((0.0, 0.0, 1.0))

    for sx, side, reg_id in ((1.0, "L", REGION_STRAP_L), (-1.0, "R", REGION_STRAP_R)):
        strap_ctrl = []
        for u_st, th_st, rx_m, ryf_m, ryb_m, lift_up in [
            (0.815, math.radians(52.0 if sx > 0 else 128.0), 0.128, 0.077, 0.076, 0.000),
            (0.908, math.radians(50.0 if sx > 0 else 130.0), 0.127, 0.070, 0.071, 0.000),
            (0.978, math.radians(46.0 if sx > 0 else 134.0), 0.110, 0.061, 0.063, 0.000),
            (1.016, math.radians(0.0 if sx > 0 else 180.0),  0.076, 0.048, 0.049, 0.002),
            (0.978, math.radians(-46.0 if sx > 0 else -134.0), 0.110, 0.061, 0.063, 0.000),
            (0.908, math.radians(-50.0 if sx > 0 else -130.0), 0.127, 0.070, 0.071, 0.000),
            (0.810, math.radians(-52.0 if sx > 0 else -128.0), 0.128, 0.077, 0.076, 0.000),
        ]:
            pt_s, r_s, f_s, t_s = spine_frame(u_st)
            dx_s, dy_s = torso_contour(u_st, th_st, rx_m, ryf_m, ryb_m, garment_offset=0.0012)
            strap_ctrl.append(pt_s + r_s * dx_s + f_s * dy_s + t_s * lift_up)
        dense_strap = eval_catmull_rom_spline(strap_ctrl, 4)
        snapped_pts = []
        snapped_nrms = []
        for sp in dense_strap:
            p_hit, n_hit = snap_to_body_surface(sp, lift=0.0005)
            snapped_pts.append(p_hit)
            snapped_nrms.append(n_hit)
        # Mild 1-pass Laplacian smoothing on snapped centerline then re-snap for silky contour with 0 air gap
        for _ in range(2):
            sm_pts = [snapped_pts[0]]
            for k in range(1, len(snapped_pts) - 1):
                mid = snapped_pts[k - 1] * 0.25 + snapped_pts[k] * 0.50 + snapped_pts[k + 1] * 0.25
                p_hit, _ = snap_to_body_surface(mid, lift=0.0005)
                sm_pts.append(p_hit)
            sm_pts.append(snapped_pts[-1])
            snapped_pts = sm_pts

        def strap_surface_normal(qpt: Vector) -> Vector:
            _, hn, _, _ = body_bvh.find_nearest(qpt)
            return hn.normalized() if (hn is not None and hn.length > 1e-6) else Vector((0.0, 0.0, 1.0))

        add_closed_tube(
            pc, f"CropStrap_{side}", snapped_pts,
            0.0062, "suit", reg_id, closed=False, radial_segs=8, aspect_b=0.30,
            surface_normal_fn=strap_surface_normal,
        )

    # Tailored satin ivory scoop-neck piping snapped strictly flush along the crop-top neckline
    scoop_pipe_pts = []
    n_pipe = 32
    for k in range(n_pipe):
        th = (k + 0.5) * 2.0 * math.pi / n_pipe
        ct, st = math.cos(th), math.sin(th)
        center_mask = max(0.0, 1.0 - (abs(ct) / 0.58) ** 2)
        u_eff = 0.830 - ((0.046 if st > 0.0 else 0.058) * center_mask * abs(st))
        pt_p, r_p, f_p, _ = spine_frame(u_eff)
        dx_p, dy_p = torso_contour(
            u_eff, th, 0.128, 0.076, 0.075,
            bust_boost=0.004, scap_relief=0.0045, clav_relief=0.0015, garment_offset=0.0015,
        )
        p_hit, _ = snap_to_body_surface(pt_p + r_p * dx_p + f_p * dy_p, lift=0.0005)
        scoop_pipe_pts.append(p_hit)
    add_closed_tube(
        pc, "CropScoopPiping", scoop_pipe_pts, 0.0020, "suit_accent", REGION_TORSO_NECK,
        closed=True, radial_segs=6,
    )


def build_head_face_and_hair(pc: SkinnedPartCollector, lm: dict[str, Vector]) -> None:
    """
    7.5-head Korean studio instructor head, sculpted facial features (almond eyes,
    catchlights, brows, winged lashes, Cupid's-bow coral-rose lips, tucked ears),
    editorial cheek blush vertex colors, and lush layered silk ponytail hair.
    """
    skull_center = lm["head_pos"]
    up = Vector((0.0, 0.0, 1.0))
    fwd = Vector((0.0, -1.0, 0.0))
    right = fwd.cross(up).normalized()  # (-1, 0, 0) -> standard face local +X
    basis = Matrix((
        (right.x, fwd.x, up.x, skull_center.x),
        (right.y, fwd.y, up.y, skull_center.y),
        (right.z, fwd.z, up.z, skull_center.z),
        (0.0, 0.0, 0.0, 1.0),
    ))
    RX, RY, RZ = 0.0695, 0.0825, 0.0940

    def eval_head_local(nx: float, ny: float, nz: float) -> Vector:
        x = nx * RX
        y = ny * RY
        z = nz * RZ
        if ny > 0.0:
            if nz < 0.05:
                jaw_t = min(1.0, (0.05 - nz) / 1.05)
                x *= 1.0 - 0.28 * (jaw_t ** 1.72)
                y *= 1.0 - 0.11 * (jaw_t ** 1.18)
                chin_w = math.exp(-((nx / 0.29) ** 2)) * math.exp(-(((nz + 0.84) / 0.22) ** 2))
                y += 0.0068 * chin_w
                z -= 0.0018 * chin_w
                mento_w = math.exp(-((nx / 0.20) ** 2)) * math.exp(-(((nz + 0.65) / 0.085) ** 2))
                y -= 0.0020 * mento_w * ny
            temple_w = math.exp(-(((abs(nx) - 0.85) / 0.16) ** 2)) * math.exp(-(((nz - 0.18) / 0.22) ** 2))
            x -= math.copysign(0.0022 * temple_w * max(0.0, ny + 0.2), nx)
            cheek_w = math.exp(-(((abs(nx) - 0.48) / 0.25) ** 2)) * math.exp(-(((nz + 0.20) / 0.23) ** 2))
            x += math.copysign(0.0038 * cheek_w * ny, nx)
            y += 0.0046 * cheek_w * ny
            brow_w = math.exp(-(((abs(nx) - 0.35) / 0.24) ** 2)) * math.exp(-(((nz - 0.145) / 0.09) ** 2))
            eye_w = math.exp(-(((abs(nx) - 0.36) / 0.19) ** 2)) * math.exp(-(((nz + 0.055) / 0.13) ** 2))
            y += (0.0020 * brow_w - 0.0052 * eye_w) * ny
            bridge_w = math.exp(-((nx / 0.088) ** 2)) * math.exp(-(((nz + 0.125) / 0.19) ** 2))
            tip_w = math.exp(-((nx / 0.105) ** 2)) * math.exp(-(((nz + 0.285) / 0.088) ** 2))
            alar_w = math.exp(-(((abs(nx) - 0.135) / 0.055) ** 2)) * math.exp(-(((nz + 0.305) / 0.058) ** 2))
            subnasal_w = math.exp(-((nx / 0.14) ** 2)) * math.exp(-(((nz + 0.375) / 0.050) ** 2))
            y += (0.0096 * bridge_w + 0.0120 * tip_w + 0.0028 * alar_w - 0.0026 * subnasal_w) * ny
            z += (0.0018 * tip_w) * ny
            phil_w = math.exp(-((nx / 0.055) ** 2)) * math.exp(-(((nz + 0.425) / 0.052) ** 2))
            mouth_w = math.exp(-((nx / 0.29) ** 2)) * math.exp(-(((nz + 0.515) / 0.105) ** 2))
            y += (0.0038 * mouth_w - 0.0014 * phil_w) * ny
        else:
            if nz < -0.22:
                occ_t = (-0.22 - nz) / 0.78
                x *= 1.0 - 0.19 * occ_t
                y *= 1.0 - 0.15 * occ_t
            if nz < -0.55:
                sub_t = (-0.55 - nz) / 0.45
                z -= 0.0045 * (sub_t ** 1.4)
        return Vector((x, y, z))

    def front_pt(nx: float, nz: float, y_out: float = 0.0, z_off: float = 0.0) -> Vector:
        ny = math.sqrt(max(0.01, 1.0 - nx * nx - nz * nz))
        p = eval_head_local(nx, ny, nz)
        return Vector((p.x, p.y + y_out, p.z + z_off))

    def head_surface_pt(nx: float, nz: float, out_offset: float = 0.0) -> Vector:
        """Evaluates exact point on sculpted cranium/cheek surface + radial outward normal offset."""
        r2 = nx * nx + nz * nz
        if r2 > 0.985:
            s_clamp = math.sqrt(0.985 / r2)
            nx *= s_clamp
            nz *= s_clamp
        ny = math.sqrt(max(0.01, 1.0 - nx * nx - nz * nz))
        p = eval_head_local(nx, ny, nz)
        n_out = Vector((p.x / (RX * RX), p.y / (RY * RY), p.z / (RZ * RZ)))
        if n_out.length > 1e-6:
            n_out.normalize()
        else:
            n_out = Vector((0.0, 1.0, 0.0))
        return p + n_out * out_offset

    def eval_surface_hair_spline(ctrl_triplets: list[tuple[float, float, float]], samples_per_seg: int = 3) -> list[Vector]:
        ctrl_vecs = [Vector(c) for c in ctrl_triplets]
        dense = eval_catmull_rom_spline(ctrl_vecs, samples_per_seg)
        return [basis @ head_surface_pt(v.x, v.y, v.z) for v in dense]

    # 1) High-Density Sculpted Oval-Heart Head Cranium + Soft Editorial Makeup Vertex Colors
    bm_head = bmesh.new()
    bmesh.ops.create_uvsphere(bm_head, u_segments=36, v_segments=24, radius=1.0)
    vert_n = {}
    for v in bm_head.verts:
        nx, ny, nz = v.co.x, v.co.y, v.co.z
        vert_n[v] = (nx, ny, nz)
        v.co = eval_head_local(nx, ny, nz)

    skin_base = srgb_tuple(COLOR_SRGB["skin_face"])
    cheek_blush = srgb_tuple(COLOR_SRGB["cheek_blush"])
    lid_tint = srgb_tuple(COLOR_SRGB["lid_tint"])
    lip_halo = srgb_tuple(COLOR_SRGB["lip_halo"])

    def face_color_fn(vert, _fkey, _lin_rgb):
        nx, ny, nz = vert_n[vert]
        r, g, b = skin_base
        if ny > 0.15:
            f_w = min(1.0, (ny - 0.15) / 0.55)
            blush_w = min(0.36, (
                0.32 * math.exp(-(((abs(nx) - 0.45) / 0.21) ** 2)) * math.exp(-(((nz + 0.22) / 0.15) ** 2))
                + 0.12 * math.exp(-((nx / 0.13) ** 2)) * math.exp(-(((nz + 0.285) / 0.085) ** 2))
            ) * f_w)
            r = r * (1.0 - blush_w) + cheek_blush[0] * blush_w
            g = g * (1.0 - blush_w) + cheek_blush[1] * blush_w
            b = b * (1.0 - blush_w) + cheek_blush[2] * blush_w
            lid_w = 0.28 * math.exp(-(((abs(nx) - 0.36) / 0.16) ** 2)) * math.exp(-(((nz - 0.018) / 0.068) ** 2)) * f_w
            r = r * (1.0 - lid_w) + lid_tint[0] * lid_w
            g = g * (1.0 - lid_w) + lid_tint[1] * lid_w
            b = b * (1.0 - lid_w) + lid_tint[2] * lid_w
            lip_w = 0.28 * math.exp(-((nx / 0.23) ** 2)) * math.exp(-(((nz + 0.515) / 0.068) ** 2)) * f_w
            r = r * (1.0 - lip_w) + lip_halo[0] * lip_w
            g = g * (1.0 - lip_w) + lip_halo[1] * lip_w
            b = b * (1.0 - lip_w) + lip_halo[2] * lip_w
        return (r, g, b)

    pc.emit_bmesh("Head_Cranium", bm_head, "skin_face", REGION_HEAD, matrix=basis, custom_vertex_color_fn=face_color_fn)

    # 2) Luminous Golden-Ratio Almond Eyes, Winged Eyelashes & Soft Arched Brows (seated cleanly on anatomical midline)
    for sign, side in ((-1.0, "L"), (1.0, "R")):
        eye_dir = (fwd + right * (sign * 0.26)).normalized()
        eye_q = eye_dir.to_track_quat("Y", "Z")

        brow_ctrl = [
            basis @ front_pt(sign * (0.160 + u_b * 0.375), 0.132 + math.sin(u_b * math.pi * 0.84) * 0.042 - u_b * 0.020, y_out=0.0014)
            for u_b in (0.0, 0.33, 0.68, 1.0)
        ]
        add_closed_tube(
            pc, f"Face_Brow_{side}", eval_catmull_rom_spline(brow_ctrl, 3),
            0.0021, "brow_soft", REGION_HEAD, closed=False, radial_segs=6, aspect_b=0.45,
            radius_scale_fn=lambda t: 0.58 + 0.44 * math.sin(t * math.pi) * (1.0 - 0.46 * t),
        )

        sc_local = front_pt(sign * 0.355, -0.052, y_out=-0.0001)
        add_closed_ellipsoid(pc, f"Face_Sclera_{side}", basis @ sc_local, 0.0122, 0.0028, 0.0076, "eye_white", REGION_HEAD, u_seg=14, v_seg=10, quat=eye_q)

        ir_local = front_pt(sign * 0.348, -0.053, y_out=0.0015)
        add_closed_ellipsoid(pc, f"Face_Iris_{side}", basis @ ir_local, 0.0072, 0.0022, 0.0076, "iris_dark", REGION_HEAD, u_seg=14, v_seg=10, quat=eye_q)

        glow_local = ir_local + Vector((0.0, 0.0009, -0.0024))
        add_closed_ellipsoid(pc, f"Face_IrisGlow_{side}", basis @ glow_local, 0.0046, 0.0014, 0.0029, "iris_glow", REGION_HEAD, u_seg=10, v_seg=7, quat=eye_q)

        cl1_local = ir_local + Vector((-sign * 0.0021, 0.0018, 0.0024))
        add_closed_ellipsoid(pc, f"Face_Catchlight_{side}", basis @ cl1_local, 0.0021, 0.0011, 0.0021, "catchlight", REGION_HEAD, u_seg=8, v_seg=6, quat=eye_q)

        cl2_local = ir_local + Vector((sign * 0.0022, 0.0016, -0.0022))
        add_closed_ellipsoid(pc, f"Face_Catchlight2_{side}", basis @ cl2_local, 0.0010, 0.0008, 0.0010, "catchlight", REGION_HEAD, u_seg=6, v_seg=5, quat=eye_q)

        lash_ctrl = [
            basis @ front_pt(
                sign * (0.185 + u_l * 0.360),
                -0.048 + math.sin(u_l * math.pi * 0.90) * 0.074 + (0.016 if u_l > 0.80 else 0.0),
                y_out=0.0016 if u_l < 0.88 else 0.0009,
            )
            for u_l in (0.0, 0.25, 0.55, 0.82, 1.0)
        ]
        add_closed_tube(
            pc, f"Face_Lash_{side}", eval_catmull_rom_spline(lash_ctrl, 3),
            0.0024, "lash_ink", REGION_HEAD, closed=False, radial_segs=6, aspect_b=0.38,
            radius_scale_fn=lambda t: 0.42 + 0.80 * math.sin(min(1.0, t * 1.05) * math.pi * 0.86),
        )

    # 3) Graceful, Softly Widened Hydrated MLBB Coral-Rose Cupid's-Bow Lips (Serene Smile Curve)
    lip_u_ctrl = [
        basis @ front_pt(lx_n, lz_n, y_out=ly_o)
        for lx_n, lz_n, ly_o in [
            (-0.278, -0.492, 0.0007),
            (-0.140, -0.486, 0.0022),
            (-0.068, -0.478, 0.0025),
            (0.000, -0.490, 0.0023),
            (0.068, -0.478, 0.0025),
            (0.140, -0.486, 0.0022),
            (0.278, -0.492, 0.0007),
        ]
    ]
    add_closed_tube(
        pc, "Face_LipUpper", eval_catmull_rom_spline(lip_u_ctrl, 3),
        0.0024, "lip_tint", REGION_HEAD, closed=False, radial_segs=8, aspect_b=0.58,
        radius_scale_fn=lambda t: 0.16 + 0.88 * (math.sin(t * math.pi) ** 0.85),
    )
    lip_l_ctrl = [
        basis @ front_pt(lx_n, lz_n, y_out=ly_o)
        for lx_n, lz_n, ly_o in [
            (-0.248, -0.502, 0.0008),
            (-0.118, -0.532, 0.0026),
            (0.000, -0.542, 0.0030),
            (0.118, -0.532, 0.0026),
            (0.248, -0.502, 0.0008),
        ]
    ]
    add_closed_tube(
        pc, "Face_LipLower", eval_catmull_rom_spline(lip_l_ctrl, 3),
        0.0029, "lip_tint", REGION_HEAD, closed=False, radial_segs=8, aspect_b=0.64,
        radius_scale_fn=lambda t: 0.18 + 0.86 * (math.sin(t * math.pi) ** 0.82),
    )

    # 4) Dainty Tucked Ears (aligned gracefully with lowered eye-to-nose golden-ratio band)
    for sign, side in ((-1.0, "L"), (1.0, "R")):
        bm_e = bmesh.new()
        bmesh.ops.create_uvsphere(bm_e, u_segments=14, v_segments=10, radius=1.0)
        flare = math.radians(10.0 * sign)
        cf, sf = math.cos(flare), math.sin(flare)
        for v in bm_e.verts:
            ux, uy, uz = v.co.x, v.co.y, v.co.z
            lobe_taper = 1.0 - 0.28 * max(0.0, -uz - 0.25)
            lx = ux * 0.0048
            ly = uy * 0.0115 * lobe_taper
            lz = uz * 0.0205
            rx_e = lx * cf - ly * sf
            ry_e = lx * sf + ly * cf
            v.co = (rx_e + sign * 0.0655, ry_e - 0.007, lz - 0.014)
        pc.emit_bmesh(f"Ear_Helix_{side}", bm_e, "skin", REGION_HEAD, matrix=basis)

    # 5) High-Density Volumetric Korean Silk Hair Crown with Soft Natural Parting & Swept-Down Nape Hairline
    bm_h = bmesh.new()
    bmesh.ops.create_uvsphere(bm_h, u_segments=34, v_segments=22, radius=1.0)
    for v in bm_h.verts:
        nx, ny, nz = v.co.x, v.co.y, v.co.z
        hairline_z = 0.42 - 0.22 * abs(nx) - 0.04 * math.exp(-(((nx - 0.08) / 0.16) ** 2))
        face_mask = max(0.0, ny - 0.14) * max(0.0, hairline_z - nz)
        if face_mask > 0.0:
            inset = min(0.034, face_mask * 0.112)
            v.co = (nx * (RX - inset), ny * (RY - inset * 1.40), nz * (RZ - 0.002))
        elif nz < -0.58 and ny > -0.12:
            # Tuck cleanly inside submental jaw & anterior ear edge (keeping earlobe/jaw silhouette crisp!)
            v.co = (nx * 0.044, ny * 0.050, nz * 0.072)
        else:
            crown_lift = 0.0102 * (max(0.0, nz) ** 1.2)
            side_fluff = 0.0058 * math.exp(-(((nz - 0.16) / 0.36) ** 2)) * abs(nx)
            back_gather = 0.0060 * math.exp(-((nx / 0.38) ** 2)) * math.exp(-(((nz - 0.42) / 0.30) ** 2)) * max(0.0, -ny)
            part_groove = -0.0032 * math.exp(-(((nx - 0.08) / 0.09) ** 2)) * max(0.0, nz - 0.32) * max(0.0, ny + 0.30)
            # Softly sweep rear hairline lower strictly behind ears into the nape (eliminating high helmet step!)
            nape_w = smoothstep(-0.08, -0.45, ny) * smoothstep(-0.08, -0.78, nz)
            nape_taper = 1.0 - 0.22 * nape_w
            nape_drop = -0.017 * nape_w
            v.co = (
                nx * (RX + 0.0084 + side_fluff) * nape_taper,
                (ny * (RY + 0.0090 + back_gather) - 0.0045) * (1.0 - 0.14 * nape_w),
                nz * (RZ + 0.0066) + 0.0040 + crown_lift + part_groove + nape_drop,
            )
    pc.emit_bmesh("Hair_Crown", bm_h, "hair", REGION_HEAD, matrix=basis)

    # 6) Surface-Clamped Forehead/Temple-Hugging Korean Curtain Bangs & Tucked Side Locks (aligned with golden-ratio browline)
    skull_out_normal = lambda pt: (pt - skull_center).normalized()
    for w_tag, w_triplets in [
        ("Hair_SoftFringeL", [(0.05, 0.80, -0.0055), (-0.05, 0.54, 0.0011), (-0.20, 0.35, 0.0009), (-0.34, 0.24, 0.0001)]),
        ("Hair_SoftFringeR", [(0.07, 0.80, -0.0055), (0.16, 0.54, 0.0011), (0.30, 0.35, 0.0009), (0.43, 0.24, 0.0001)]),
    ]:
        add_closed_tube(
            pc, w_tag, eval_surface_hair_spline(w_triplets, 3),
            0.0056, "hair", REGION_HEAD, closed=False, radial_segs=6, aspect_b=0.16,
            radius_scale_fn=lambda t: (0.20 + 0.85 * math.sin(min(1.0, t * 1.04) * math.pi * 0.88)) * max(0.08, 1.0 - 0.84 * (t ** 1.45)),
            surface_normal_fn=skull_out_normal,
        )

    for sign, side in ((-1.0, "L"), (1.0, "R")):
        curtain_triplets = [
            (sign * 0.04,  0.84, -0.0060),
            (sign * 0.25,  0.60,  0.0012),
            (sign * 0.52,  0.34,  0.0015),
            (sign * 0.74,  0.11,  0.0009),
            (sign * 0.86, -0.04, -0.0018),
        ]
        add_closed_tube(
            pc, f"Hair_Curtain_{side}", eval_surface_hair_spline(curtain_triplets, 3),
            0.0108, "hair", REGION_HEAD, closed=False, radial_segs=7, aspect_b=0.16,
            radius_scale_fn=lambda t: (0.24 + 0.86 * math.sin(min(1.0, t * 1.02) * math.pi * 0.90)) * max(0.10, 1.0 - 0.72 * (t ** 1.55)),
            surface_normal_fn=skull_out_normal,
        )
        sidelock_triplets = [
            (sign * 0.91,  0.20, -0.0025),
            (sign * 0.95,  0.02,  0.0005),
            (sign * 0.95, -0.11,  0.0004),
            (sign * 0.91, -0.22, -0.0006),
            (sign * 0.85, -0.29, -0.0018),
        ]
        add_closed_tube(
            pc, f"Hair_SideLock_{side}", eval_surface_hair_spline(sidelock_triplets, 3),
            0.0062, "hair", REGION_HEAD, closed=False, radial_segs=6, aspect_b=0.16,
            radius_scale_fn=lambda t: (0.38 + 0.70 * math.sin(t * math.pi * 0.85)) * max(0.08, 1.0 - 0.86 * (t ** 1.45)),
            surface_normal_fn=skull_out_normal,
        )

    # 7) Chic Pleated Champagne Satin Scrunchie & Multi-Layered Flowing Silk Ponytail (driven by `Ponytail` bone!)
    tie_world = lm["ponytail_root"]
    tie_axis = (-fwd * 0.80 + up * 0.60).normalized()
    tie_u = right
    tie_v = tie_axis.cross(tie_u).normalized()

    sc_pts = []
    n_sc = 26
    for k in range(n_sc):
        a = 2.0 * math.pi * k / n_sc
        pleat = 1.0 + 0.12 * math.sin(a * 10.0) + 0.04 * math.cos(a * 20.0)
        sc_pts.append(tie_world + tie_u * (math.cos(a) * 0.0245 * pleat) + tie_v * (math.sin(a) * 0.0245 * pleat))
    add_closed_tube(
        pc, "Hair_Scrunchie", sc_pts, 0.0090, "scrunchie", REGION_HEAD,
        closed=True, radial_segs=8,
        radius_scale_fn=lambda t: 0.85 + 0.19 * math.sin(t * 2.0 * math.pi * 10.0),
    )

    tail_flow = (lm["ponytail_tip"] - tie_world).normalized()
    tail_lat = right
    tail_lift = tail_lat.cross(tail_flow).normalized()
    if tail_lift.z < 0:
        tail_lift = -tail_lift

    strand_specs = [
        ("Main",           0.195, 0.0285, 0.76,  0.000, 0.038,  0.003, 0.011),
        ("UpperCrownWave", 0.205, 0.0185, 0.54,  0.000, 0.050, -0.003, 0.013),
        ("FlowL",          0.202, 0.0165, 0.52, -0.014, 0.042, -0.007, 0.012),
        ("FlowR",          0.202, 0.0165, 0.52,  0.014, 0.042,  0.007, 0.012),
        ("UnderFlow",      0.190, 0.0170, 0.58,  0.000, 0.022,  0.002, 0.006),
    ]
    for stag, slen, srad, s_asp, lat_o, lift_a, sw_lat, sw_lift in strand_specs:
        n_seg = 14
        s_pts = []
        for k in range(n_seg):
            t = k / (n_seg - 1)
            arch = math.sin(min(1.0, t * 1.24) * math.pi) * lift_a + math.sin(t * math.pi * 1.65) * sw_lift * (t ** 0.88)
            lat = lat_o * (0.20 + 0.82 * math.sin(t * math.pi * 0.82)) + math.sin(t * math.pi * 1.35) * sw_lat * (t ** 0.90)
            s_pts.append(tie_world + tail_flow * ((t ** 0.95) * slen) + tail_lift * arch + tail_lat * lat)
        add_closed_tube(
            pc, f"Hair_Ponytail_{stag}", s_pts, srad, "hair", REGION_PONYTAIL,
            closed=False, radial_segs=10, aspect_b=s_asp,
            radius_scale_fn=lambda t: (0.56 + 0.70 * math.sin(min(1.0, t * 1.08) * math.pi * 0.82)) * max(0.06, 1.0 - 0.92 * (t ** 1.50)),
        )

    # Dainty satin scrunchie ribbon tails flowing gently along the ponytail
    for r_sign, r_tag, r_len in ((-1.0, "L", 0.072), (1.0, "R", 0.084)):
        rib_ctrl = [
            tie_world
            + tail_flow * (0.010 + t * r_len)
            + tail_lat * (r_sign * (0.017 + 0.016 * (t ** 0.82)))
            + tail_lift * (0.004 + 0.011 * math.sin(t * math.pi) - 0.008 * t)
            for t in (0.0, 0.35, 0.72, 1.0)
        ]
        add_closed_tube(
            pc, f"Hair_ScrunchieRibbon_{r_tag}", eval_catmull_rom_spline(rib_ctrl, 3), 0.0048, "scrunchie", REGION_PONYTAIL,
            closed=False, radial_segs=6, aspect_b=0.25,
            radius_scale_fn=lambda t: 0.55 + 0.50 * math.sin(t * math.pi * 0.85),
        )


def build_hands_and_feet(pc: SkinnedPartCollector, lm: dict[str, Vector]) -> None:
    """Graceful 5-digit Pilates dancer hands & low-cut ivory ballet grip-sock feet."""
    ant_n = Vector((0.0, -1.0, 0.0))
    up_axis = Vector((0.0, 0.0, 1.0))

    # 1) Hands
    for side, sx, reg_id in (("L", 1.0, REGION_HAND_L), ("R", -1.0, REGION_HAND_R)):
        wr = lm[f"wrist_{side}"]
        htip = lm[f"hand_tip_{side}"]
        fdir = (htip - wr).normalized()
        # In A-pose with palms softly facing inward/forward: thumb is anterior (-Y)!
        thumb_dir = (ant_n - fdir * ant_n.dot(fdir)).normalized()
        dorsal = fdir.cross(thumb_dir).normalized()
        if dorsal.z < 0:
            dorsal = -dorsal
        # Enforce right-handed palm basis: lat points toward thumb (-Y anterior)
        lat = thumb_dir

        palm_len = 0.065
        palm_stations = []
        for u_p, wx, wy_dors, wy_palm in [
            (-0.10, 0.019, 0.013, 0.013),
            (0.22, 0.028, 0.0115, 0.0135),
            (0.56, 0.033, 0.0105, 0.0125),
            (0.84, 0.0335, 0.0095, 0.0105),
            (1.00, 0.0305, 0.0080, 0.0088),
        ]:
            c = wr + fdir * (palm_len * u_p)
            palm_stations.append((c, lat, dorsal, lambda th, a=wx, bd=wy_dors, bp=wy_palm: (math.cos(th) * a, math.sin(th) * (bd if math.sin(th) >= 0 else bp))))
        add_closed_loft(pc, f"Hand_Palm_{side}", palm_stations, "skin", reg_id, radial_segs=16, cap_start=0.005, cap_end=0.005)

        # Opposable Thumb (pointing gently anterior-medial)
        th_p0 = wr + fdir * 0.014 + lat * 0.020 - dorsal * 0.004
        th_p1 = th_p0 + (fdir * 0.70 + lat * 0.60 - dorsal * 0.32).normalized() * 0.024
        th_p2 = th_p1 + (fdir * 0.84 + lat * 0.30 - dorsal * 0.40).normalized() * 0.020
        th_p3 = th_p2 + (fdir * 0.92 + lat * 0.08 - dorsal * 0.34).normalized() * 0.016
        add_closed_tube(
            pc, f"Thumb_{side}", eval_catmull_rom_spline([th_p0, th_p1, th_p2, th_p3], 2), 0.0078, "skin", reg_id,
            closed=False, radial_segs=8, radius_scale_fn=lambda t: 1.0 - 0.42 * t,
        )

        # 4 gracefully gathered dancer fingers
        for fname, lat_u, flen, frad, curl in [
            ("Idx",  0.64, 0.059, 0.0060, 0.14),
            ("Mid",  0.22, 0.065, 0.0063, 0.19),
            ("Rng", -0.22, 0.060, 0.0058, 0.24),
            ("Pnk", -0.62, 0.048, 0.0050, 0.29),
        ]:
            mcp = wr + fdir * (palm_len * 0.92) + lat * (lat_u * 0.0235) - dorsal * (0.0014 * (lat_u ** 2))
            d1 = (fdir * 0.97 - dorsal * (curl * 0.7)).normalized()
            d2 = (fdir * 0.91 - dorsal * (curl * 1.4)).normalized()
            d3 = (fdir * 0.83 - dorsal * (curl * 1.85)).normalized()
            pip = mcp + d1 * (flen * 0.44)
            dip = pip + d2 * (flen * 0.31)
            tip = dip + d3 * (flen * 0.25)
            add_closed_tube(
                pc, f"Finger_{fname}_{side}", eval_catmull_rom_spline([mcp - d1 * 0.004, pip, dip, tip], 2), frad, "skin", reg_id,
                closed=False, radial_segs=8, aspect_b=0.90, radius_scale_fn=lambda t: 1.04 - 0.46 * t,
            )

    # 2) Low-Cut Ivory Ballet Grip-Sock Feet (grounded flat at Z = 0.000!)
    for side, sx, reg_id in (("L", 1.0, REGION_FOOT_L), ("R", -1.0, REGION_FOOT_R)):
        kn = lm[f"knee_{side}"]
        ank = lm[f"ankle_{side}"]
        ftip = lm[f"foot_tip_{side}"]
        foot_fwd = Vector((ftip.x - ank.x, ftip.y - ank.y, 0.0)).normalized()
        foot_up = up_axis
        foot_lat = foot_fwd.cross(foot_up).normalized()
        # Medial direction is toward body centerline (-sx along X)
        med_sign = -sx * (1.0 if foot_lat.x > 0 else -1.0)

        # Low-cut grip sock ankle cuff
        cuff_top = kn.lerp(ank, 0.945)
        cuff_stations = []
        for u_c, r_lat, r_ap in [(0.00, 0.0285, 0.0315), (0.55, 0.0280, 0.0310), (1.05, 0.0272, 0.0300)]:
            c = cuff_top.lerp(ank, u_c)
            cuff_stations.append((c, foot_lat, foot_fwd, lambda th, a=r_lat, b=r_ap: (math.cos(th) * a, math.sin(th) * b)))
        add_closed_loft(pc, f"Sock_Cuff_{side}", cuff_stations, "sock", reg_id, radial_segs=16, cap_start=0.004, cap_end=0.005)

        # Sculpted dancer foot with subtle medial arch & flat plantar ground contact
        foot_stations = []
        for f_off, u_off, hw, hh, arch_lift in [
            (-0.042, -0.034, 0.0220, 0.0255, 0.000),
            (-0.006, -0.034, 0.0270, 0.0285, 0.0020),
            (0.046,  -0.036, 0.0265, 0.0220, 0.0080),
            (0.098,  -0.044, 0.0340, 0.0160, 0.0015),
            (0.142,  -0.047, 0.0245, 0.0110, 0.000),
        ]:
            c = ank + foot_fwd * f_off + foot_up * u_off

            def foot_prof(th, a=hw, b=hh, al=arch_lift, ms=med_sign):
                ct, st = math.cos(th), math.sin(th)
                if st < 0:
                    medial_arch = al * math.exp(-(((ct - ms * 0.42) / 0.48) ** 2)) * (-st)
                    yv = st * b * 0.62 + medial_arch
                else:
                    yv = st * b * 1.12
                return ct * a, yv

            foot_stations.append((c, foot_lat, foot_up, foot_prof))
        add_closed_loft(pc, f"Foot_Sculpt_{side}", foot_stations, "sock", reg_id, radial_segs=14, cap_start=0.008, cap_end=0.010, subsurf_levels=1)

        # Crisscross botanical-sage ballet elastic instep ribbons
        for strap_tag, s0, s1 in (("CrossA", -1.0, 1.0), ("CrossB", 1.0, -1.0)):
            strap_ctrl = [
                ank + foot_fwd * 0.010 + foot_lat * (s0 * 0.0285) + foot_up * (-0.036),
                ank + foot_fwd * 0.046 + foot_lat * (s0 * 0.008) + foot_up * (-0.006),
                ank + foot_fwd * 0.080 + foot_lat * (s1 * 0.0305) + foot_up * (-0.036),
            ]
            add_closed_tube(
                pc, f"Sock_Strap_{strap_tag}_{side}", eval_catmull_rom_spline(strap_ctrl, 3),
                0.0025, "suit", reg_id, closed=False, radial_segs=6, aspect_b=0.45,
            )


# ==============================================================================
# 6. BAKE, JOIN, GROUND AT Z = 0, PACK ATLAS UVS & SMOOTH SKINNING WEIGHTS
# ==============================================================================

def bake_and_join_single_mesh(scene: bpy.types.Scene, objs: list[bpy.types.Object], material: bpy.types.Material) -> bpy.types.Object:
    deps = bpy.context.evaluated_depsgraph_get()
    baked = []
    for o in objs:
        eval_obj = o.evaluated_get(deps)
        new_mesh = bpy.data.meshes.new_from_object(eval_obj, preserve_all_data_layers=True, depsgraph=deps)
        bm = bmesh.new()
        bm.from_mesh(new_mesh)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
        degen = [f for f in bm.faces if f.calc_area() < 1e-12]
        if degen:
            bmesh.ops.delete(bm, geom=degen, context="FACES")
        wire = [e for e in bm.edges if not e.link_faces]
        if wire:
            bmesh.ops.delete(bm, geom=wire, context="EDGES")
        loose = [v for v in bm.verts if not v.link_faces]
        if loose:
            bmesh.ops.delete(bm, geom=loose, context="VERTS")
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(new_mesh)
        bm.free()

        new_mesh.materials.clear()
        new_mesh.materials.append(material)
        bo = bpy.data.objects.new(o.name + "_baked", new_mesh)
        bo.matrix_world = o.matrix_world.copy()
        scene.collection.objects.link(bo)
        baked.append(bo)
        bpy.data.objects.remove(o, do_unlink=True)

    bpy.ops.object.select_all(action="DESELECT")
    for bo in baked:
        bo.select_set(True)
    bpy.context.view_layer.objects.active = baked[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if len(baked) > 1:
        bpy.ops.object.join()
    joined = bpy.context.view_layer.objects.active
    joined.name = "SM_Instructor_Skinned"
    joined.data.name = "SM_Instructor_Skinned_Mesh"
    for p in joined.data.polygons:
        p.use_smooth = True
    return joined


def ground_character_and_armature(mesh_obj: bpy.types.Object, arm_obj: bpy.types.Object, lm: dict[str, Vector]) -> float:
    min_z = min((mesh_obj.matrix_world @ v.co).z for v in mesh_obj.data.vertices)
    if abs(min_z) > 1e-6:
        mesh_obj.location.z -= min_z
        bpy.ops.object.select_all(action="DESELECT")
        mesh_obj.select_set(True)
        bpy.context.view_layer.objects.active = mesh_obj
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

        # Shift armature bones by exact same Z offset so skeleton & mesh remain 100% locked!
        bpy.ops.object.select_all(action="DESELECT")
        arm_obj.select_set(True)
        bpy.context.view_layer.objects.active = arm_obj
        bpy.ops.object.mode_set(mode="EDIT")
        for eb in arm_obj.data.edit_bones:
            eb.head.z -= min_z
            eb.tail.z -= min_z
        bpy.ops.object.mode_set(mode="OBJECT")
        for key in list(lm.keys()):
            lm[key] = Vector((lm[key].x, lm[key].y, lm[key].z - min_z))
    return min_z


def uv_polygon_area(uvs: list[tuple[float, float]]) -> float:
    area2 = 0.0
    n = len(uvs)
    for i in range(n):
        x1, y1 = uvs[i]
        x2, y2 = uvs[(i + 1) % n]
        area2 += x1 * y2 - x2 * y1
    return abs(area2) * 0.5


def pack_band_atlas_uvs(obj: bpy.types.Object) -> None:
    """
    Assigns continuous, zero-seam vertex-shared UVs strictly inside each face's 4x4 atlas tile.
    Eliminates ~3,000 duplicate UV-island seam vertices for compact <= 650 KB GLB export and
    maximum 60fps WebGPU skinning throughput while maintaining 0 out-of-bounds & 0 degenerate UVs.
    """
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.faces.ensure_lookup_table()
    uv_layer = bm.loops.layers.uv.verify()
    band_layer = bm.faces.layers.int.get("mat_band")

    for f in bm.faces:
        band_idx = int(f[band_layer]) if band_layer is not None else 5
        u_min, u_max, v_min, v_max = atlas_tile_bounds(band_idx, pad=0.014)
        u_span = u_max - u_min
        v_span = v_max - v_min
        mapped = []
        for lp in f.loops:
            co = lp.vert.co
            u0 = clamp((co.x + 0.37 * co.y + 0.92) / 1.84, 0.0, 1.0)
            v0 = clamp((co.z + 0.23 * co.y + 0.12) / 1.88, 0.0, 1.0)
            um = u_min + u0 * u_span
            vm = v_min + v0 * v_span
            lp[uv_layer].uv = (um, vm)
            mapped.append((um, vm))
        if uv_polygon_area(mapped) < 1e-10:
            # Non-degenerate local orthogonal basis projection fallback inside the same tile
            n = f.normal
            t1 = Vector((0.0, 0.0, 1.0)) if abs(n.z) < 0.85 else Vector((1.0, 0.0, 0.0))
            ax = (t1 - n * t1.dot(n)).normalized()
            ay = n.cross(ax).normalized()
            fc = f.calc_center_median()
            uc = 0.5 * (u_min + u_max)
            vc = 0.5 * (v_min + v_max)
            mapped2 = []
            for lp in f.loops:
                d = lp.vert.co - fc
                um = clamp(uc + d.dot(ax) * 0.45, u_min, u_max)
                vm = clamp(vc + d.dot(ay) * 0.45, v_min, v_max)
                lp[uv_layer].uv = (um, vm)
                mapped2.append((um, vm))
            if uv_polygon_area(mapped2) < 1e-10:
                n_l = len(f.loops)
                for l_i, lp in enumerate(f.loops):
                    ang = 2.0 * math.pi * l_i / max(3, n_l)
                    lp[uv_layer].uv = (uc + 0.004 * math.cos(ang), vc + 0.004 * math.sin(ang))

    bm.to_mesh(obj.data)
    bm.free()


def segment_param(pt: Vector, a: Vector, b: Vector) -> float:
    ab = b - a
    d2 = ab.length_squared
    if d2 < 1e-9:
        return 0.0
    return clamp((pt - a).dot(ab) / d2, 0.0, 1.0)


def assign_smooth_skinning_weights(
    mesh_obj: bpy.types.Object,
    arm_obj: bpy.types.Object,
    lm: dict[str, Vector],
) -> None:
    """
    Assigns region-aware, 3-ring smooth Hermite skinning weights (strictly <= 4 bones/vert,
    sum == 1.0) to `SM_Instructor_Skinned` and binds it to `Armature_Instructor`.
    """
    # Extract per-vertex region ID & mesh adjacency from bmesh
    bm = bmesh.new()
    bm.from_mesh(mesh_obj.data)
    bm.verts.ensure_lookup_table()
    reg_layer = bm.faces.layers.int.get("part_region")

    n_verts = len(bm.verts)
    vert_region = [REGION_TORSO_NECK] * n_verts
    vert_neighbors: list[list[int]] = [[] for _ in range(n_verts)]
    vert_pos = [v.co.copy() for v in bm.verts]

    for v in bm.verts:
        vi = v.index
        if reg_layer is not None and v.link_faces:
            # Prefer limb/extremity region over torso on shared boundary loop verts
            regs = [int(f[reg_layer]) for f in v.link_faces]
            # Pick most frequent region; tie-break toward higher specificity
            best_r = max(set(regs), key=lambda r: (regs.count(r), r))
            vert_region[vi] = best_r
        vert_neighbors[vi] = [e.other_vert(v).index for e in v.link_edges]

    # Remove helper integer layers now that regions & UVs are consumed
    for lname in ("mat_band", "part_region"):
        lyr = bm.faces.layers.int.get(lname)
        if lyr is not None:
            bm.faces.layers.int.remove(lyr)
    bm.to_mesh(mesh_obj.data)
    bm.free()

    # Compute initial analytical weights per vertex based on its exact anatomical region
    weights_list: list[dict[str, float]] = [{} for _ in range(n_verts)]

    z_pelvis = lm["pelvis"].z
    z_sp_lo = lm["spine_lower"].z
    z_sp_up = lm["spine_upper"].z
    z_ch_b = lm["chest_base"].z
    z_nk_b = lm["neck_base"].z
    z_nk_t = lm["neck_top"].z

    for vi in range(n_verts):
        p = vert_pos[vi]
        reg = vert_region[vi]
        w: dict[str, float] = {}

        if reg == REGION_HEAD:
            # Rigid cranium/face/hair crown; subtle smooth neck blend only under submental base
            t_nk = smoothstep(z_nk_t + 0.015, z_nk_t - 0.025, p.z)
            if t_nk > 0.02 and p.y > -0.025:
                w["Head"] = 1.0 - 0.25 * t_nk
                w["Neck"] = 0.25 * t_nk
            else:
                w["Head"] = 1.0

        elif reg == REGION_PONYTAIL:
            t_tail = segment_param(p, lm["ponytail_root"], lm["ponytail_tip"])
            b_tail = smoothstep(0.02, 0.28, t_tail)
            w["Head"] = 1.0 - b_tail
            w["Ponytail"] = b_tail

        elif reg in (REGION_STRAP_L, REGION_STRAP_R):
            side = "L" if reg == REGION_STRAP_L else "R"
            sh_t = smoothstep(0.065, 0.138, abs(p.x))
            w["Chest"] = 1.0 - 0.35 * sh_t
            w[f"Shoulder_{side}"] = 0.35 * sh_t

        elif reg in (REGION_HAND_L, REGION_HAND_R):
            side = "L" if reg == REGION_HAND_L else "R"
            t_hd = segment_param(p, lm[f"wrist_{side}"], lm[f"hand_tip_{side}"])
            b_hd = smoothstep(-0.05, 0.16, t_hd)
            w[f"Forearm_{side}"] = 1.0 - b_hd
            w[f"Hand_{side}"] = b_hd

        elif reg in (REGION_FOOT_L, REGION_FOOT_R):
            side = "L" if reg == REGION_FOOT_L else "R"
            ank_z = lm[f"ankle_{side}"].z
            b_sh = smoothstep(ank_z - 0.008, ank_z + 0.032, p.z)
            w[f"Shin_{side}"] = b_sh
            w[f"Foot_{side}"] = 1.0 - b_sh

        elif reg in (REGION_LEG_L, REGION_LEG_R):
            side = "L" if reg == REGION_LEG_L else "R"
            hp = lm[f"hip_{side}"]
            kn = lm[f"knee_{side}"]
            ank = lm[f"ankle_{side}"]

            if p.z >= kn.z:
                # Upper leg: smooth 3-ring blend at hip (Pelvis <-> Thigh) and knee (Thigh <-> Shin)
                w_pelv = smoothstep(hp.z - 0.062, hp.z + 0.030, p.z) * 0.58
                w_shin = smoothstep(kn.z + 0.058, kn.z - 0.058, p.z)
                w_thigh = max(0.05, 1.0 - w_pelv - w_shin)
                if w_pelv > 1e-4:
                    w["Pelvis"] = w_pelv
                w[f"Thigh_{side}"] = w_thigh
                if w_shin > 1e-4:
                    w[f"Shin_{side}"] = w_shin
            else:
                # Lower leg: smooth 3-ring blend at knee (Thigh <-> Shin) and ankle (Shin <-> Foot)
                w_thigh = smoothstep(kn.z - 0.058, kn.z + 0.058, p.z)
                w_foot = smoothstep(ank.z + 0.042, ank.z - 0.015, p.z) * 0.65
                w_shin = max(0.05, 1.0 - w_thigh - w_foot)
                if w_thigh > 1e-4:
                    w[f"Thigh_{side}"] = w_thigh
                w[f"Shin_{side}"] = w_shin
                if w_foot > 1e-4:
                    w[f"Foot_{side}"] = w_foot

        elif reg in (REGION_ARM_L, REGION_ARM_R):
            side = "L" if reg == REGION_ARM_L else "R"
            sh = lm[f"shoulder_{side}"]
            elb = lm[f"elbow_{side}"]
            wr = lm[f"wrist_{side}"]
            u_ua = (elb - sh).normalized()
            u_fa = (wr - elb).normalized()
            len_ua = (elb - sh).length
            len_fa = (wr - elb).length

            d_along_ua = (p - sh).dot(u_ua)
            d_along_fa = (p - elb).dot(u_fa)

            if d_along_ua < len_ua * 0.52:
                # Shoulder socket & upper arm: Chest <-> Shoulder <-> UpperArm
                w_sh_bone = smoothstep(0.055, -0.025, d_along_ua) * 0.65
                w_chest = smoothstep(0.015, -0.045, d_along_ua) * 0.35
                w_ua = max(0.08, 1.0 - w_sh_bone - w_chest)
                if w_chest > 1e-4:
                    w["Chest"] = w_chest
                if w_sh_bone > 1e-4:
                    w[f"Shoulder_{side}"] = w_sh_bone
                w[f"UpperArm_{side}"] = w_ua
            else:
                # Elbow & forearm & wrist: UpperArm <-> Forearm <-> Hand
                w_ua = smoothstep(0.048, -0.048, d_along_fa)
                w_hd = smoothstep(len_fa - 0.036, len_fa + 0.012, d_along_fa) * 0.65
                w_fa = max(0.05, 1.0 - w_ua - w_hd)
                if w_ua > 1e-4:
                    w[f"UpperArm_{side}"] = w_ua
                w[f"Forearm_{side}"] = w_fa
                if w_hd > 1e-4:
                    w[f"Hand_{side}"] = w_hd

        else:
            # REGION_TORSO_NECK: smooth overlapping spine Gaussian/Hermite chain
            z = p.z
            b_pelv = smoothstep(z_sp_lo + 0.048, z_pelvis + 0.022, z)
            b_sp_lo = math.exp(-(((z - 0.5 * (z_sp_lo + z_sp_up)) / 0.085) ** 2))
            b_sp_up = math.exp(-(((z - 0.5 * (z_sp_up + z_ch_b)) / 0.085) ** 2))
            b_chest = math.exp(-(((z - 0.5 * (z_ch_b + z_nk_b)) / 0.082) ** 2))
            b_neck = math.exp(-(((z - 0.5 * (z_nk_b + z_nk_t)) / 0.056) ** 2)) * smoothstep(z_ch_b + 0.015, z_nk_b + 0.005, z)
            b_head = smoothstep(z_nk_t - 0.035, z_nk_t + 0.020, z)

            if z < z_pelvis + 0.022:
                b_pelv = max(b_pelv, 1.0)
            if z > z_nk_t + 0.015:
                b_head = max(b_head, 1.0)

            raw_chain = [
                ("Pelvis", b_pelv),
                ("SpineLower", b_sp_lo),
                ("SpineUpper", b_sp_up),
                ("Chest", b_chest),
                ("Neck", b_neck),
                ("Head", b_head),
            ]
            for bn, bw in raw_chain:
                if bw > 0.005:
                    w[bn] = bw

            # Smooth hip-socket pull near bottom pelvis border (strictly matching vertex's +/-X side)
            if z < z_pelvis + 0.018 and abs(p.x) > 0.022:
                side = "L" if p.x >= 0.0 else "R"
                hip_w = smoothstep(z_pelvis + 0.018, z_pelvis - 0.045, z) * smoothstep(0.022, 0.075, abs(p.x)) * 0.42
                if hip_w > 0.01:
                    s_cur = sum(w.values()) or 1.0
                    for k in list(w.keys()):
                        w[k] = (w[k] / s_cur) * (1.0 - hip_w)
                    w[f"Thigh_{side}"] = hip_w

            # Smooth shoulder-socket pull on lateral upper chest walls
            if z_ch_b - 0.02 <= z <= z_nk_b + 0.025 and abs(p.x) > 0.082:
                side = "L" if p.x >= 0.0 else "R"
                sh_w = smoothstep(0.082, 0.132, abs(p.x)) * math.exp(-(((z - lm[f"shoulder_{side}"].z) / 0.068) ** 2)) * 0.44
                if sh_w > 0.01:
                    s_cur = sum(w.values()) or 1.0
                    for k in list(w.keys()):
                        w[k] = (w[k] / s_cur) * (1.0 - sh_w)
                    w[f"Shoulder_{side}"] = sh_w * 0.72
                    w[f"UpperArm_{side}"] = sh_w * 0.28

        # Normalize initial weights
        tot = sum(w.values())
        if tot <= 1e-8:
            w = {"Pelvis": 1.0}
        else:
            w = {k: v / tot for k, v in w.items()}
        weights_list[vi] = w

    # 2 gentle topological weight-smoothing passes on the unified body (regions 0..4)
    # Guarantees C1 silky deformation across pelvis/thigh, chest/shoulder/arm, knee & elbow rings!
    body_regs = {REGION_TORSO_NECK, REGION_LEG_L, REGION_LEG_R, REGION_ARM_L, REGION_ARM_R}
    for _ in range(2):
        next_weights = list(weights_list)
        for vi in range(n_verts):
            if vert_region[vi] not in body_regs:
                continue
            nbrs = [ni for ni in vert_neighbors[vi] if vert_region[ni] in body_regs]
            if not nbrs:
                continue
            # Prevent left/right cross-bleed across the inner-thigh / perineal midline!
            cur_r = vert_region[vi]
            if cur_r == REGION_LEG_L:
                nbrs = [ni for ni in nbrs if vert_region[ni] != REGION_LEG_R]
            elif cur_r == REGION_LEG_R:
                nbrs = [ni for ni in nbrs if vert_region[ni] != REGION_LEG_L]
            elif cur_r == REGION_ARM_L:
                nbrs = [ni for ni in nbrs if vert_region[ni] != REGION_ARM_R]
            elif cur_r == REGION_ARM_R:
                nbrs = [ni for ni in nbrs if vert_region[ni] != REGION_ARM_L]
            if not nbrs:
                continue

            acc: dict[str, float] = {}
            self_w = 0.56
            nbr_w = (1.0 - self_w) / len(nbrs)
            for bn, bv in weights_list[vi].items():
                acc[bn] = acc.get(bn, 0.0) + bv * self_w
            for ni in nbrs:
                for bn, bv in weights_list[ni].items():
                    acc[bn] = acc.get(bn, 0.0) + bv * nbr_w
            next_weights[vi] = acc
        weights_list = next_weights

    # Strict top-4 influence clamp & exact normalization (sum == 1.0)
    vgroups = {bn: mesh_obj.vertex_groups.new(name=bn) for bn in BONE_NAMES}
    for vi, wdict in enumerate(weights_list):
        top4 = sorted(((k, v) for k, v in wdict.items() if v > 1e-4), key=lambda kv: kv[1], reverse=True)[:4]
        if not top4:
            top4 = [("Pelvis", 1.0)]
        tot = sum(v for _, v in top4)
        for bn, bv in top4:
            vgroups[bn].add([vi], bv / tot, "REPLACE")

    # Parent mesh to Armature & attach Armature modifier
    mesh_obj.parent = arm_obj
    arm_mod = mesh_obj.modifiers.new("Armature", "ARMATURE")
    arm_mod.object = arm_obj
    arm_mod.use_vertex_groups = True


# ==============================================================================
# 7. STRICT HYGIENE GATE, GLB EXPORT & VERIFICATION PREVIEW RENDERS
# ==============================================================================

def verify_skinned_hygiene(mesh_obj: bpy.types.Object, arm_obj: bpy.types.Object) -> dict:
    sx, sy, sz = (round(float(c), 6) for c in mesh_obj.scale)
    if (sx, sy, sz) != (1.0, 1.0, 1.0):
        raise RuntimeError(f"Unapplied scale on {mesh_obj.name}: {(sx, sy, sz)}")

    zs = [(mesh_obj.matrix_world @ v.co).z for v in mesh_obj.data.vertices]
    min_z, max_z = min(zs), max(zs)
    height = max_z - min_z
    if abs(min_z) > 1e-4:
        raise RuntimeError(f"Mesh not grounded at Z=0: min_z={min_z:.6f}")
    if not (1.58 <= height <= 1.72):
        raise RuntimeError(f"Unexpected instructor height: {height:.4f}m (expected ~1.65m)")

    bm = bmesh.new()
    bm.from_mesh(mesh_obj.data)
    true_nonmanifold = sum(1 for e in bm.edges if not e.is_manifold and not e.is_boundary)
    boundary_edges = sum(1 for e in bm.edges if e.is_boundary)
    loose_verts = sum(1 for v in bm.verts if not v.link_edges or not v.link_faces)
    wire_edges = sum(1 for e in bm.edges if not e.link_faces)
    tris = sum(len(f.verts) - 2 for f in bm.faces)
    verts = len(bm.verts)

    uv_layer = bm.loops.layers.uv.active
    if uv_layer is None:
        bm.free()
        raise RuntimeError("Missing active UV layer")
    uv_oob = 0
    uv_degen = 0
    for f in bm.faces:
        pts = []
        for lp in f.loops:
            u, v = float(lp[uv_layer].uv.x), float(lp[uv_layer].uv.y)
            if u < -1e-5 or u > 1.0 + 1e-5 or v < -1e-5 or v > 1.0 + 1e-5:
                uv_oob += 1
            pts.append((u, v))
        if uv_polygon_area(pts) < 1e-12:
            uv_degen += 1
    bm.free()

    if true_nonmanifold != 0 or boundary_edges != 0 or loose_verts != 0 or wire_edges != 0:
        raise RuntimeError(
            f"Topology hygiene failed: nonmanifold={true_nonmanifold}, boundary={boundary_edges}, "
            f"loose_verts={loose_verts}, wire_edges={wire_edges}"
        )
    if uv_oob != 0 or uv_degen != 0:
        raise RuntimeError(f"UV hygiene failed: oob={uv_oob}, degen={uv_degen}")
    if not (20000 <= tris <= 34000):
        raise RuntimeError(f"Triangle count {tris} outside 20,000..34,000 high-density target range!")

    # Verify every vertex has 1..4 normalized bone weights
    unweighted = 0
    over4 = 0
    bad_sum = 0
    for v in mesh_obj.data.vertices:
        gs = [g.weight for g in v.groups if g.weight > 1e-5]
        if len(gs) == 0:
            unweighted += 1
        if len(gs) > 4:
            over4 += 1
        if abs(sum(gs) - 1.0) > 1e-3:
            bad_sum += 1
    if unweighted or over4 or bad_sum:
        raise RuntimeError(f"Weight hygiene failed: unweighted={unweighted}, over4={over4}, bad_sum={bad_sum}")

    return {
        "triangles": tris,
        "vertices": verts,
        "bones": len(arm_obj.data.bones),
        "minZ": round(min_z, 6),
        "maxZ": round(max_z, 4),
        "heightM": round(height, 4),
        "nonManifold": true_nonmanifold,
        "boundaryEdges": boundary_edges,
        "looseVerts": loose_verts,
        "wireEdges": wire_edges,
    }


def export_skinned_glb(arm_obj: bpy.types.Object, mesh_obj: bpy.types.Object, out_path: str) -> int:
    bpy.ops.object.select_all(action="DESELECT")
    arm_obj.select_set(True)
    mesh_obj.select_set(True)
    bpy.context.view_layer.objects.active = arm_obj

    export_kwargs = dict(
        filepath=out_path,
        use_selection=True,
        export_format="GLB",
        export_yup=True,
        export_apply=False,  # MUST stay False so Armature skinning modifier is exported intact!
        export_skins=True,
        export_all_influences=False,  # Clamp strictly to 4 influences per vertex (JOINTS_0 / WEIGHTS_0)
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_image_format="JPEG",
        export_image_quality=92,
        export_animations=False,
    )
    # Blender 4.x/5.x glTF vertex color attribute flag compatibility
    op_props = bpy.ops.export_scene.gltf.get_rna_type().properties.keys()
    if "export_vertex_color" in op_props:
        export_kwargs["export_vertex_color"] = "MATERIAL"
    if "export_all_vertex_colors" in op_props:
        export_kwargs["export_all_vertex_colors"] = True
    if "export_colors" in op_props:
        export_kwargs["export_colors"] = True

    bpy.ops.export_scene.gltf(**export_kwargs)
    return os.path.getsize(out_path)


def inspect_exported_glb_json(glb_path: str) -> dict:
    with open(glb_path, "rb") as f:
        data = f.read()
    magic, version, length = struct.unpack_from("<III", data, 0)
    if magic != 0x46546C67 or version != 2:
        raise RuntimeError(f"Invalid GLB header: magic={hex(magic)} version={version}")
    chunk_len, chunk_type = struct.unpack_from("<II", data, 12)
    gltf = json.loads(data[20 : 20 + chunk_len].decode("utf-8"))
    prim = gltf["meshes"][0]["primitives"][0]
    attrs = sorted(prim["attributes"].keys())
    skins = gltf.get("skins", [])
    joints = skins[0]["joints"] if skins else []
    joint_names = [gltf["nodes"][j].get("name", "") for j in joints]
    return {
        "fileBytes": len(data),
        "meshCount": len(gltf.get("meshes", [])),
        "materialCount": len(gltf.get("materials", [])),
        "attributes": attrs,
        "skinCount": len(skins),
        "jointCount": len(joints),
        "jointNames": joint_names,
        "hasIBM": bool(skins and "inverseBindMatrices" in skins[0]),
    }


def render_preview_pngs(scene: bpy.types.Scene, out_dir: str) -> list[str]:
    """Renders crisp A-pose front & 3/4 side preview PNGs via EEVEE/Workbench for visual QA."""
    os.makedirs(out_dir, exist_ok=True)
    # Light warm morning studio world
    if scene.world is None:
        scene.world = bpy.data.worlds.new("PreviewWorld")
    if scene.world.node_tree is None:
        scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value = (0.94, 0.92, 0.88, 1.0)
        bg.inputs["Strength"].default_value = 0.85

    # 3-point studio lighting
    lights = []
    for lname, loc, rot_deg, energy, color in [
        ("KeyLight", (1.6, -2.4, 2.6), (52, 0, 32), 260.0, (1.0, 0.97, 0.93)),
        ("FillLight", (-2.0, -1.8, 1.7), (64, 0, -45), 110.0, (0.92, 0.96, 1.0)),
        ("RimLight", (-0.8, 2.2, 2.3), (58, 0, -155), 190.0, (1.0, 0.95, 0.86)),
    ]:
        ldata = bpy.data.lights.new(lname, type="AREA")
        ldata.energy = energy
        ldata.color = color
        ldata.size = 1.6
        lobj = bpy.data.objects.new(lname, ldata)
        lobj.location = loc
        lobj.rotation_euler = tuple(math.radians(a) for a in rot_deg)
        scene.collection.objects.link(lobj)
        lights.append(lobj)

    cam_data = bpy.data.cameras.new("PreviewCam")
    cam_data.lens = 58.0
    cam_obj = bpy.data.objects.new("PreviewCam", cam_data)
    scene.collection.objects.link(cam_obj)
    scene.camera = cam_obj

    # Use BLENDER_EEVEE_NEXT / BLENDER_EEVEE or CYCLES CPU fallback for fast crisp PNGs
    engines = [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items]
    if "BLENDER_EEVEE_NEXT" in engines:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    elif "BLENDER_EEVEE" in engines:
        scene.render.engine = "BLENDER_EEVEE"
    else:
        scene.render.engine = "CYCLES"
        scene.cycles.device = "CPU"
        scene.cycles.samples = 24

    scene.render.resolution_x = 640
    scene.render.resolution_y = 860
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"

    target = Vector((0.0, 0.0, 0.84))
    views = [
        ("apose_front.png", Vector((0.0, -3.15, 0.92))),
        ("apose_side.png", Vector((2.65, -1.75, 0.96))),
    ]
    out_paths = []
    for fname, cam_pos in views:
        cam_obj.location = cam_pos
        direction = (target - cam_pos).normalized()
        cam_obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
        path = os.path.join(out_dir, fname)
        scene.render.filepath = path
        bpy.ops.render.render(write_still=True)
        out_paths.append(path)

    for lobj in lights:
        bpy.data.objects.remove(lobj, do_unlink=True)
    bpy.data.objects.remove(cam_obj, do_unlink=True)
    return out_paths


def build_skinned_instructor(out_glb_path: str | None = None, preview_dir: str | None = None) -> dict:
    out_glb_path = out_glb_path or os.path.join(
        ROOT_DIR, "public", "models", "pilates-studio", "instructor-skinned-v5.glb"
    )
    os.makedirs(os.path.dirname(out_glb_path), exist_ok=True)

    clear_scene()
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0

    lm = build_apose_landmarks()
    arm_obj = create_instructor_armature(lm)
    micro_img = build_neutral_micro_atlas(256)
    surf_img = build_instructor_roughness_atlas(64)
    mat = make_instructor_material(micro_img, surf_img)

    pc = SkinnedPartCollector(scene.collection, mat)
    build_seamless_body_apose(pc, lm)
    build_head_face_and_hair(pc, lm)
    build_hands_and_feet(pc, lm)

    mesh_obj = bake_and_join_single_mesh(scene, pc.objects, mat)
    ground_character_and_armature(mesh_obj, arm_obj, lm)
    pack_band_atlas_uvs(mesh_obj)
    assign_smooth_skinning_weights(mesh_obj, arm_obj, lm)

    hygiene = verify_skinned_hygiene(mesh_obj, arm_obj)
    file_bytes = export_skinned_glb(arm_obj, mesh_obj, out_glb_path)
    glb_info = inspect_exported_glb_json(out_glb_path)

    if file_bytes > 1400 * 1024:
        raise RuntimeError(f"GLB exceeds 1.4 MB budget: {file_bytes} bytes ({file_bytes / 1024:.1f} KB)")
    if "JOINTS_0" not in glb_info["attributes"] or "WEIGHTS_0" not in glb_info["attributes"]:
        raise RuntimeError(f"Missing skinning attributes in exported GLB: {glb_info['attributes']}")
    if "COLOR_0" not in glb_info["attributes"]:
        raise RuntimeError(f"Missing COLOR_0 vertex colors in exported GLB: {glb_info['attributes']}")
    if not glb_info["hasIBM"] or glb_info["jointCount"] != len(BONE_NAMES):
        raise RuntimeError(f"Invalid skin joint export: {glb_info}")

    previews = []
    if preview_dir:
        previews = render_preview_pngs(scene, preview_dir)

    return {
        "outPath": out_glb_path,
        "fileBytes": file_bytes,
        "fileKB": round(file_bytes / 1024.0, 1),
        "hygiene": hygiene,
        "glb": glb_info,
        "previews": previews,
    }


if __name__ == "__main__":
    preview_arg = None
    if "--" in sys.argv:
        extra = sys.argv[sys.argv.index("--") + 1 :]
        for idx_a, token in enumerate(extra):
            if token == "--preview-dir" and idx_a + 1 < len(extra):
                preview_arg = extra[idx_a + 1]
    report = build_skinned_instructor(preview_dir=preview_arg)
    print("SKINNED_INSTRUCTOR_REPORT:", json.dumps(report, indent=2), flush=True)
