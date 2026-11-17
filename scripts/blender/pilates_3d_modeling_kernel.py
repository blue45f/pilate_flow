"""
Flagship Precision 3D Modeling Kernel v2 for Blender 5.2 LTS (`bpy` + `bmesh`)
Synthesizes standards from:
- `blender-52-hero-modeling` (Primary/Secondary/Tertiary silhouette hierarchy, SUBSURF, clamped BEVEL)
- `blender-headless-asset-ops` (100% closed 2-manifold solids, 0 loose verts, 0 wire edges, 4x4 isotropic PBR swatch atlas)
- `biomech-anatomical-rig-modeling` (Clavicle/sternoclavicular contour, SubD torso/pelvis/midriff continuity,
  patella/condyle & ankle malleolus leg shaping, 5-finger thumb opposition & palmar arch, ear helix & braided chignon)
- `threejs-object-sculptor` (Extruded aluminum C-channel, 4-slot brass gearbar + stopper, double-loop riser straps,
  full Cadillac canopy/trapeze/push-through/safety-strap/maple roll-back kit, Open C-frame Chair with grounded cactus
  & hinged split pedals, Ladder Barrel multi-slat rungs & 5-lobe brass star knobs, and grounded Mat 3D prop kit)
"""
from __future__ import annotations

import math
import bpy
import bmesh
from mathutils import Vector, Matrix


def srgb_to_lin(c: float) -> float:
    return ((c + 0.055) / 1.055) ** 2.4 if c > 0.04045 else c / 12.92


def srgb_tuple(rgb: tuple[float, float, float]) -> tuple[float, float, float]:
    return (srgb_to_lin(rgb[0]), srgb_to_lin(rgb[1]), srgb_to_lin(rgb[2]))


def set_bsdf_input(bsdf, name: str, value) -> bool:
    for inp in bsdf.inputs:
        if inp.name == name:
            inp.default_value = value
            return True
    return False


# ==============================================================================
# 1. CYCLES PROCEDURAL PBR MATERIALS & 4x4 ISOTROPIC 16-SWATCH GLB ATLAS
# ==============================================================================

ATLAS_BANDS_SRGB = [
    # 0: Satin Champagne Brass (Metallic)
    (0.84, 0.69, 0.43),
    # 1: Anisotropic Brushed Stainless / Aluminum (Metallic)
    (0.82, 0.85, 0.88),
    # 2: Anodized Crimson Red Spring (Metallic)
    (0.78, 0.20, 0.17),
    # 3: Anodized Cobalt Blue Spring (Metallic)
    (0.19, 0.46, 0.73),
    # 4: Anodized Amber Gold Spring (Metallic)
    (0.88, 0.64, 0.16),
    # 5: Warm Natural Subsurface Skin (Dielectric)
    (0.855, 0.675, 0.565),
    # 6: Botanical Sage Crop Top & Upholstery Leather (Dielectric)
    (0.22, 0.37, 0.31),
    # 7: Deep Forest Sculpt Legging (Dielectric)
    (0.155, 0.285, 0.235),
    # 8: Matte Botanical Sage Mini-Ball & Latex Band (Dielectric)
    (0.43, 0.58, 0.49),
    # 9: European White Oak (Dielectric)
    (0.745, 0.575, 0.405),
    # 10: Hard Rock Maple (Dielectric)
    (0.84, 0.71, 0.54),
    # 11: American Walnut (Dielectric)
    (0.37, 0.24, 0.16),
    # 12: Saddle Tan Leather Strap (Dielectric)
    (0.49, 0.31, 0.20),
    # 13: Deep Espresso Chignon Hair (Dielectric)
    (0.15, 0.105, 0.08),
    # 14: Matte Charcoal EVA & Cotton Webbing (Dielectric)
    (0.19, 0.21, 0.22),
    # 15: Ivory Fleece, French Piping & Grip Sock (Dielectric)
    (0.935, 0.915, 0.875),
]


def build_glb_pbr_atlas(size: int = 512):
    """
    512x512 4x4 square-tile sRGB PBR texture atlas (16 dedicated studio swatches).
    Square tiles preserve 1:1 isotropic UV texel aspect ratio with generous gutter margins
    after `uv.smart_project` + `uv.pack_islands`.
    """
    img = bpy.data.images.new("StudioFlagshipAtlas", width=size, height=size, alpha=False)
    img.colorspace_settings.name = "sRGB"
    grid = 4
    tile_px = size // grid
    pixels = [0.0] * (size * size * 4)
    idx = 0
    for y in range(size):
        row = min(grid - 1, y // tile_px)
        ly = y % tile_px
        for x in range(size):
            col = min(grid - 1, x // tile_px)
            lx = x % tile_px
            b_idx = min(len(ATLAS_BANDS_SRGB) - 1, row * grid + col)
            base_r, base_g, base_b = ATLAS_BANDS_SRGB[b_idx]
            if b_idx in (9, 10, 11):
                # Directional cathedral wood grain
                grain = math.sin(lx * 0.26 + math.sin(ly * 0.14) * 2.6) * 0.024
            elif b_idx in (0, 1):
                # Fine linear brushed metal micro-sheen
                grain = math.sin(ly * 0.85 + lx * 0.08) * 0.010
            elif b_idx in (6, 7, 12, 14):
                # Subtle pebbled leather / performance knit micro-grain
                grain = math.sin(lx * 0.75) * math.cos(ly * 0.75) * 0.009
            elif b_idx == 13:
                # Subtle hair strand variation
                grain = math.sin(lx * 0.55 + ly * 0.12) * 0.012
            else:
                grain = 0.0
            pixels[idx] = max(0.0, min(1.0, base_r + grain))
            pixels[idx + 1] = max(0.0, min(1.0, base_g + grain * 0.88))
            pixels[idx + 2] = max(0.0, min(1.0, base_b + grain * 0.76))
            pixels[idx + 3] = 1.0
            idx += 4
    img.pixels[:] = pixels
    img.pack()
    return img


def atlas_tile_bounds(band_idx: int, pad: float = 0.006) -> tuple[float, float, float, float]:
    col = band_idx % 4
    row = band_idx // 4
    step = 0.25
    return (
        col * step + pad,
        (col + 1) * step - pad,
        row * step + pad,
        (row + 1) * step - pad,
    )


def assign_atlas_band_uvs(bm: bmesh.types.BMesh, band_idx: int) -> None:
    uv_layer = bm.loops.layers.uv.verify()
    band_layer = bm.faces.layers.int.get("mat_band") or bm.faces.layers.int.new("mat_band")
    u_min, u_max, v_min, v_max = atlas_tile_bounds(band_idx, pad=0.018)
    uc = 0.5 * (u_min + u_max)
    vc = 0.5 * (v_min + v_max)
    ru = 0.42 * (u_max - u_min)
    rv = 0.42 * (v_max - v_min)
    for face in bm.faces:
        face[band_layer] = band_idx
        n_loops = len(face.loops)
        for l_i, loop in enumerate(face.loops):
            ang = 2.0 * math.pi * l_i / max(3, n_loops)
            loop[uv_layer].uv = (uc + ru * math.cos(ang), vc + rv * math.sin(ang))


def build_cycles_studio_materials() -> dict[str, bpy.types.Material]:
    def base_mat(name, srgb, roughness=0.5, metallic=0.0, coat=0.0, sheen=0.0, subsurf=0.0):
        mat = bpy.data.materials.new(name)
        if mat.node_tree is None:
            mat.use_nodes = True
        nt = mat.node_tree
        bsdf = nt.nodes.get("Principled BSDF")
        lin = srgb_tuple(srgb)
        set_bsdf_input(bsdf, "Base Color", (*lin, 1.0))
        set_bsdf_input(bsdf, "Roughness", roughness)
        set_bsdf_input(bsdf, "Metallic", metallic)
        set_bsdf_input(bsdf, "Coat Weight", coat)
        set_bsdf_input(bsdf, "Coat Roughness", 0.18)
        set_bsdf_input(bsdf, "Sheen Weight", sheen)
        set_bsdf_input(bsdf, "Sheen Roughness", 0.48)
        if subsurf > 0:
            set_bsdf_input(bsdf, "Subsurface Weight", subsurf)
            set_bsdf_input(bsdf, "Subsurface Scale", 0.012)
            set_bsdf_input(bsdf, "Subsurface Radius", (1.0, 0.36, 0.22))
        mat.use_fake_user = True
        return mat

    mats = {
        "skin": base_mat("PF4_Skin", (0.855, 0.67, 0.56), roughness=0.43, subsurf=0.28),
        "suit": base_mat("PF4_SuitSage", (0.215, 0.365, 0.305), roughness=0.58, sheen=0.32),
        "legging": base_mat("PF4_LeggingForest", (0.155, 0.285, 0.235), roughness=0.60, sheen=0.30),
        "suit_accent": base_mat("PF4_SuitPiping", (0.93, 0.91, 0.87), roughness=0.52, sheen=0.22),
        "hair": base_mat("PF4_HairEspresso", (0.15, 0.105, 0.08), roughness=0.34, coat=0.20),
        "sock": base_mat("PF4_GripSockIvory", (0.935, 0.915, 0.875), roughness=0.68, sheen=0.28),
        "oak": base_mat("PF4_WhiteOak", (0.745, 0.575, 0.405), roughness=0.34, coat=0.34),
        "maple": base_mat("PF4_HardRockMaple", (0.84, 0.71, 0.54), roughness=0.32, coat=0.36),
        "walnut": base_mat("PF4_Walnut", (0.38, 0.25, 0.17), roughness=0.38, coat=0.28),
        "leather": base_mat("PF4_SaddleLeather", (0.49, 0.31, 0.20), roughness=0.46, coat=0.14),
        "pad": base_mat("PF4_PebbledSageLeather", (0.225, 0.37, 0.31), roughness=0.44, coat=0.12, sheen=0.12),
        "steel": base_mat("PF4_BrushedSteel", (0.82, 0.85, 0.88), roughness=0.20, metallic=1.0),
        "brass": base_mat("PF4_SatinBrass", (0.84, 0.69, 0.43), roughness=0.23, metallic=1.0),
        "charcoal": base_mat("PF4_CharcoalGrip", (0.19, 0.21, 0.22), roughness=0.64, metallic=0.0),
        "strap": base_mat("PF4_CottonWebbing", (0.23, 0.25, 0.24), roughness=0.76, sheen=0.24),
        "band": base_mat("PF4_LatexBand", (0.36, 0.54, 0.44), roughness=0.48, coat=0.10),
        "ball": base_mat("PF4_MatteSageBall", (0.43, 0.58, 0.49), roughness=0.56, coat=0.06),
        "spring_red": base_mat("PF4_SpringRed", (0.78, 0.20, 0.17), roughness=0.22, metallic=1.0),
        "spring_blue": base_mat("PF4_SpringBlue", (0.19, 0.46, 0.73), roughness=0.22, metallic=1.0),
        "spring_gold": base_mat("PF4_SpringGold", (0.88, 0.64, 0.16), roughness=0.22, metallic=1.0),
        "studio_bg": base_mat("PF4_StudioCyclorama", (0.958, 0.944, 0.915), roughness=0.92),
        "studio_floor": base_mat("PF4_StudioFloor", (0.912, 0.888, 0.844), roughness=0.66, coat=0.06),
    }

    for key, scale_xyz, bump_dist in [
        ("oak", (2.5, 22.0, 22.0), 0.0012),
        ("maple", (2.2, 20.0, 20.0), 0.0009),
        ("walnut", (3.0, 24.0, 24.0), 0.0012),
        ("pad", (140.0, 140.0, 140.0), 0.0006),
    ]:
        nt = mats[key].node_tree
        bsdf = nt.nodes.get("Principled BSDF")
        tex_coord = nt.nodes.new("ShaderNodeTexCoord")
        mapping = nt.nodes.new("ShaderNodeMapping")
        mapping.inputs["Scale"].default_value = scale_xyz
        noise = nt.nodes.new("ShaderNodeTexNoise")
        noise.inputs["Scale"].default_value = 6.0
        noise.inputs["Detail"].default_value = 4.0
        bump = nt.nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = 0.25
        bump.inputs["Distance"].default_value = bump_dist
        nt.links.new(tex_coord.outputs["Object"], mapping.inputs["Vector"])
        nt.links.new(mapping.outputs["Vector"], noise.inputs["Vector"])
        nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
        nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])

    return mats


# ==============================================================================
# 2. GEOMETRY PRIMITIVES, SWEPT MANIFOLD TUBES & EXTRUDED INDUSTRIAL PROFILES
# ==============================================================================

class MeshCollector:
    """Routes built objects either into a live Cycles collection OR into GLB material buckets."""

    def __init__(self, collection, mats: dict, glb_mode: bool = False):
        self.collection = collection
        self.mats = mats
        self.glb_mode = glb_mode
        self.diel_objs: list[bpy.types.Object] = []
        self.metal_objs: list[bpy.types.Object] = []

    def resolve_mat_and_band(self, mat_key: str):
        band_map = {
            "brass": (True, 0),
            "steel": (True, 1),
            "spring_red": (True, 2),
            "spring_blue": (True, 3),
            "spring_gold": (True, 4),
            "skin": (False, 5),
            "suit": (False, 6),
            "pad": (False, 6),
            "legging": (False, 7),
            "ball": (False, 8),
            "band": (False, 8),
            "oak": (False, 9),
            "maple": (False, 10),
            "walnut": (False, 11),
            "leather": (False, 12),
            "hair": (False, 13),
            "charcoal": (False, 14),
            "strap": (False, 14),
            "sock": (False, 15),
            "suit_accent": (False, 15),
        }
        is_metal, band = band_map.get(mat_key, (False, 6))
        if self.glb_mode:
            mat = self.mats["glb_metal"] if is_metal else self.mats["glb_diel"]
        else:
            mat = self.mats.get(mat_key) or self.mats["pad"]
        return mat, is_metal, band

    def emit_bmesh(
        self,
        name: str,
        bm: bmesh.types.BMesh,
        mat_key: str,
        loc=(0.0, 0.0, 0.0),
        quat=None,
        matrix=None,
        subsurf_levels: int = 0,
        bevel_width: float = 0.0,
        smooth: bool = True,
    ) -> bpy.types.Object:
        mat, is_metal, band = self.resolve_mat_and_band(mat_key)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        if self.glb_mode:
            assign_atlas_band_uvs(bm, band)
        mesh = bpy.data.meshes.new(name)
        bm.to_mesh(mesh)
        bm.free()
        for p in mesh.polygons:
            p.use_smooth = smooth
        mesh.materials.append(mat)
        obj = bpy.data.objects.new(name, mesh)
        self.collection.objects.link(obj)
        if matrix is not None:
            obj.matrix_world = matrix
        else:
            obj.location = loc
            if quat is not None:
                obj.rotation_mode = "QUATERNION"
                obj.rotation_quaternion = quat

        if bevel_width > 0:
            bev = obj.modifiers.new("Bevel", "BEVEL")
            bev.width = bevel_width
            bev.segments = 2 if self.glb_mode else 3
            bev.limit_method = "ANGLE"
            bev.angle_limit = math.radians(32.0)
            bev.use_clamp_overlap = True
            bev.harden_normals = not self.glb_mode

        if subsurf_levels > 0:
            sub = obj.modifiers.new("Subsurf", "SUBSURF")
            sub.levels = subsurf_levels
            sub.render_levels = subsurf_levels

        if self.glb_mode:
            (self.metal_objs if is_metal else self.diel_objs).append(obj)
        return obj


def add_beveled_box(mc: MeshCollector, name: str, center, dims, mat_key: str, bevel: float = 0.010, quat=None):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=dims, verts=bm.verts)
    if max(dims) < 0.062 or min(dims) < 0.009:
        return mc.emit_bmesh(name, bm, mat_key, loc=center, quat=quat, bevel_width=0.0, smooth=False)
    bw = min(bevel, min(dims) * 0.22) if bevel > 0 else 0.0
    return mc.emit_bmesh(name, bm, mat_key, loc=center, quat=quat, bevel_width=bw)


def add_swept_tube(
    mc: MeshCollector,
    name: str,
    path_pts: list[Vector],
    radius: float,
    mat_key: str,
    closed: bool = False,
    radial_segs: int = 8,
    radius_scale_fn=None,
) -> bpy.types.Object | None:
    """
    Sweeps a 100% closed 2-manifold quad tube along `path_pts` using parallel transport.
    Replaces chopped cylinder-rod chains with continuous seamless piping, straps, and hooks.
    """
    pts = [Vector(p) for p in path_pts]
    if len(pts) < (3 if closed else 2):
        return None
    n_pts = len(pts)
    bm = bmesh.new()
    rings = []
    prev_n = None
    tangents = []

    for i in range(n_pts):
        if closed:
            tan = (pts[(i + 1) % n_pts] - pts[(i - 1) % n_pts]).normalized()
        elif i == 0:
            tan = (pts[1] - pts[0]).normalized()
        elif i == n_pts - 1:
            tan = (pts[-1] - pts[-2]).normalized()
        else:
            tan = (pts[i + 1] - pts[i - 1]).normalized()
        if tan.length < 1e-6:
            tan = Vector((0.0, 0.0, 1.0))
        tangents.append(tan)

        if prev_n is None:
            ref = Vector((0.0, 0.0, 1.0)) if abs(tan.z) < 0.9 else Vector((1.0, 0.0, 0.0))
            nrm = tan.cross(ref).normalized()
        else:
            nrm = prev_n - tan * prev_n.dot(tan)
            if nrm.length < 1e-5:
                ref = Vector((0.0, 0.0, 1.0)) if abs(tan.z) < 0.9 else Vector((1.0, 0.0, 0.0))
                nrm = tan.cross(ref)
            nrm.normalize()
        prev_n = nrm
        binrm = tan.cross(nrm).normalized()

        t_u = i / max(1, n_pts if closed else (n_pts - 1))
        r_here = radius * (radius_scale_fn(t_u) if radius_scale_fn is not None else 1.0)
        row = []
        for s in range(radial_segs):
            a = 2.0 * math.pi * s / radial_segs
            off = (nrm * math.cos(a) + binrm * math.sin(a)) * r_here
            row.append(bm.verts.new(pts[i] + off))
        rings.append(row)

    for i in range(n_pts - 1):
        for s in range(radial_segs):
            s2 = (s + 1) % radial_segs
            bm.faces.new((rings[i][s], rings[i][s2], rings[i + 1][s2], rings[i + 1][s]))

    if closed:
        # Minimize holonomy twist where ring[-1] closes onto ring[0]
        best_off = min(
            range(radial_segs),
            key=lambda off: (rings[-1][0].co - rings[0][off].co).length_squared,
        )
        for s in range(radial_segs):
            s2 = (s + 1) % radial_segs
            t1 = (s + best_off) % radial_segs
            t2 = (s2 + best_off) % radial_segs
            bm.faces.new((rings[-1][s], rings[-1][s2], rings[0][t2], rings[0][t1]))
    else:
        r0 = radius * (radius_scale_fn(0.0) if radius_scale_fn is not None else 1.0)
        r1 = radius * (radius_scale_fn(1.0) if radius_scale_fn is not None else 1.0)
        c_start = bm.verts.new(pts[0] - tangents[0] * (r0 * 0.45))
        c_end = bm.verts.new(pts[-1] + tangents[-1] * (r1 * 0.45))
        for s in range(radial_segs):
            s2 = (s + 1) % radial_segs
            bm.faces.new((c_start, rings[0][s2], rings[0][s]))
            bm.faces.new((rings[-1][s], rings[-1][s2], c_end))

    return mc.emit_bmesh(name, bm, mat_key)


def rounded_rect_loop_3d(cx: float, cy: float, cz: float, hx: float, hy: float, corner_r: float, corner_segs: int = 4) -> list[Vector]:
    cr = min(corner_r, hx * 0.45, hy * 0.45)
    ix, iy = hx - cr, hy - cr
    pts: list[Vector] = []
    corners = [
        (ix, iy, 0.0, math.pi * 0.5),
        (-ix, iy, math.pi * 0.5, math.pi),
        (-ix, -iy, math.pi, math.pi * 1.5),
        (ix, -iy, math.pi * 1.5, math.pi * 2.0),
    ]
    for ox, oy, a0, a1 in corners:
        for k in range(corner_segs):
            a = a0 + (a1 - a0) * k / corner_segs
            pts.append(Vector((cx + ox + math.cos(a) * cr, cy + oy + math.sin(a) * cr, cz)))
    return pts


def add_piped_cushion(mc: MeshCollector, name: str, center, dims, pad_key: str = "pad", trim_key: str = "suit_accent"):
    """Two-tier upholstered studio cushion with continuous seamless French piping welt loop."""
    cx, cy, cz = center
    dx, dy, dz = dims
    add_beveled_box(mc, name + "_Core", (cx, cy, cz), (dx, dy, dz), pad_key, bevel=min(0.018, dz * 0.32))
    pz = cz + dz * 0.48
    loop_pts = rounded_rect_loop_3d(cx, cy, pz, dx * 0.486, dy * 0.486, corner_r=min(0.026, min(dx, dy) * 0.22), corner_segs=3 if mc.glb_mode else 4)
    add_swept_tube(mc, name + "_WeltLoop", loop_pts, 0.0038, trim_key, closed=True, radial_segs=6 if mc.glb_mode else 8)


def add_cylinder_rod(mc: MeshCollector, name: str, p1, p2, radius: float, mat_key: str, segs: int = 16, r2: float | None = None):
    v1, v2 = Vector(p1), Vector(p2)
    dv = v2 - v1
    L = dv.length
    if L < 1e-4:
        return None
    bm = bmesh.new()
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=True,
        segments=segs,
        radius1=radius,
        radius2=radius if r2 is None else r2,
        depth=L,
    )
    quat = dv.normalized().to_track_quat("Z", "Y")
    return mc.emit_bmesh(name, bm, mat_key, loc=(v1 + v2) * 0.5, quat=quat)


def add_ellipsoid(mc: MeshCollector, name: str, center, rx: float, ry: float, rz: float, mat_key: str, u_seg: int = 18, v_seg: int = 12, quat=None):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=u_seg, v_segments=v_seg, radius=1.0)
    bmesh.ops.scale(bm, vec=(rx, ry, rz), verts=bm.verts)
    return mc.emit_bmesh(name, bm, mat_key, loc=center, quat=quat)


def add_torus(
    mc: MeshCollector,
    name: str,
    center,
    major_r: float,
    minor_r: float,
    mat_key: str,
    axis: str = "Z",
    segs: int = 28,
    tsegs: int = 10,
    minor_axial_r: float | None = None,
):
    mr_rad = minor_r
    mr_ax = minor_r if minor_axial_r is None else minor_axial_r
    bm = bmesh.new()
    rings = []
    for i in range(segs):
        u = 2.0 * math.pi * i / segs
        cu, su = math.cos(u), math.sin(u)
        row = []
        for j in range(tsegs):
            v = 2.0 * math.pi * j / tsegs
            cv, sv = math.cos(v), math.sin(v)
            if axis == "X":
                pt = (sv * mr_ax, (major_r + cv * mr_rad) * cu, (major_r + cv * mr_rad) * su)
            elif axis == "Y":
                pt = ((major_r + cv * mr_rad) * cu, sv * mr_ax, (major_r + cv * mr_rad) * su)
            else:
                pt = ((major_r + cv * mr_rad) * cu, (major_r + cv * mr_rad) * su, sv * mr_ax)
            row.append(bm.verts.new(pt))
        rings.append(row)
    for i in range(segs):
        inext = (i + 1) % segs
        for j in range(tsegs):
            jnext = (j + 1) % tsegs
            bm.faces.new((rings[i][j], rings[inext][j], rings[inext][jnext], rings[i][jnext]))
    return mc.emit_bmesh(name, bm, mat_key, loc=center)


def add_extruded_polygon_prism(
    mc: MeshCollector,
    name: str,
    poly_2d: list[tuple[float, float]],
    origin: Vector,
    axis_u: Vector,
    axis_v: Vector,
    axis_w: Vector,
    half_depth: float,
    mat_key: str,
    bevel_width: float = 0.0,
    smooth: bool = False,
) -> bpy.types.Object:
    """
    Extrudes any simple CCW 2D polygon `(u, v)` along `±axis_w * half_depth` as a 100% closed
    2-manifold solid, using ear-clipping triangulation on both end caps for concave-safe export.
    """
    bm = bmesh.new()
    au = axis_u.normalized()
    av = axis_v.normalized()
    aw = axis_w.normalized()
    v_front = [bm.verts.new(origin + au * u + av * v + aw * half_depth) for u, v in poly_2d]
    v_back = [bm.verts.new(origin + au * u + av * v - aw * half_depth) for u, v in poly_2d]
    n = len(poly_2d)
    f_front = bm.faces.new(v_front)
    f_back = bm.faces.new(list(reversed(v_back)))
    for i in range(n):
        i2 = (i + 1) % n
        bm.faces.new((v_back[i], v_back[i2], v_front[i2], v_front[i]))
    bmesh.ops.triangulate(bm, faces=[f_front, f_back], quad_method="BEAUTY", ngon_method="EAR_CLIP")
    return mc.emit_bmesh(name, bm, mat_key, bevel_width=bevel_width, smooth=smooth)


def add_helical_spring_mesh(
    mc: MeshCollector,
    name: str,
    p1,
    p2,
    spring_mat_key: str,
    strap_mat_key: str = "strap",
    coils: int = 13,
    coil_r: float = 0.0135,
    wire_r: float = 0.0033,
    max_coil_len: float | None = 0.44,
):
    """Manifold quad-swept 3D helical coil spring + tapered brass end cones & hook eyes."""
    v1, v2 = Vector(p1), Vector(p2)
    dv = v2 - v1
    L = dv.length
    if L < 0.04:
        return
    if max_coil_len is not None and L > max_coil_len + 0.05:
        u = dv.normalized()
        s_end = v1 + u * max_coil_len
        add_helical_spring_mesh(
            mc, name + "_Coil", v1, s_end, spring_mat_key, strap_mat_key,
            coils=coils, coil_r=coil_r, wire_r=wire_r, max_coil_len=None,
        )
        add_cylinder_rod(mc, name + "_Cord", s_end, v2, 0.0038, strap_mat_key, segs=8)
        return

    u_dir = dv.normalized()
    hook_inset = min(0.018, L * 0.12)
    c1 = v1 + u_dir * hook_inset
    c2 = v2 - u_dir * hook_inset
    coil_L = (c2 - c1).length

    # Tapered brass end-plugs & hook stems connecting spring cleanly to hardware anchors
    add_cylinder_rod(mc, name + "_PlugA", v1, c1 + u_dir * 0.008, 0.0045, "brass", segs=8, r2=coil_r * 0.68)
    add_cylinder_rod(mc, name + "_PlugB", c2 - u_dir * 0.008, v2, coil_r * 0.68, "brass", segs=8, r2=0.0045)

    steps = coils * (5 if mc.glb_mode else 8)
    r_segs = 6 if mc.glb_mode else 7
    bm = bmesh.new()
    spine_pts = []
    for i in range(steps + 1):
        t = i / steps
        env = math.sin(min(1.0, t / 0.09) * math.pi * 0.5) * math.sin(min(1.0, (1.0 - t) / 0.09) * math.pi * 0.5)
        cr = coil_r * env
        ang = t * coils * 2.0 * math.pi
        spine_pts.append(Vector((math.cos(ang) * cr, math.sin(ang) * cr, (t - 0.5) * coil_L)))

    rings = []
    prev_n = Vector((1, 0, 0))
    tangents = []
    for i, pt in enumerate(spine_pts):
        if i == 0:
            tan = (spine_pts[1] - spine_pts[0]).normalized()
        elif i == len(spine_pts) - 1:
            tan = (spine_pts[-1] - spine_pts[-2]).normalized()
        else:
            tan = (spine_pts[i + 1] - spine_pts[i - 1]).normalized()
        tangents.append(tan)
        nrm = prev_n - tan * prev_n.dot(tan)
        if nrm.length < 1e-4:
            nrm = tan.cross(Vector((0, 1, 0)))
            if nrm.length < 1e-4:
                nrm = tan.cross(Vector((1, 0, 0)))
        nrm.normalize()
        prev_n = nrm
        binrm = tan.cross(nrm).normalized()
        row = []
        for s in range(r_segs):
            a = 2.0 * math.pi * s / r_segs
            off = (nrm * math.cos(a) + binrm * math.sin(a)) * wire_r
            row.append(bm.verts.new(pt + off))
        rings.append(row)

    for i in range(len(rings) - 1):
        for s in range(r_segs):
            s2 = (s + 1) % r_segs
            bm.faces.new((rings[i][s], rings[i][s2], rings[i + 1][s2], rings[i + 1][s]))

    c_start = bm.verts.new(spine_pts[0] - tangents[0] * (wire_r * 0.45))
    c_end = bm.verts.new(spine_pts[-1] + tangents[-1] * (wire_r * 0.45))
    for s in range(r_segs):
        s2 = (s + 1) % r_segs
        bm.faces.new((c_start, rings[0][s2], rings[0][s]))
        bm.faces.new((rings[-1][s], rings[-1][s2], c_end))

    quat = u_dir.to_track_quat("Z", "Y")
    mc.emit_bmesh(name, bm, spring_mat_key, loc=(c1 + c2) * 0.5, quat=quat)


def build_loft_from_stations(
    mc: MeshCollector,
    name: str,
    stations: list[tuple[Vector, Vector, Vector, callable]],
    mat_key: str,
    radial_segs: int = 24,
    cap_start: float = 0.012,
    cap_end: float = 0.012,
    subsurf_levels: int = 1,
) -> bpy.types.Object:
    """
    Builds a closed 2-manifold quad loft from station tuples `(center, axis_x, axis_y, profile_fn(theta) -> (dx, dy))`.
    """
    bm = bmesh.new()
    rings = []
    for center, ax, ay, prof_fn in stations:
        row = []
        for s in range(radial_segs):
            theta = 2.0 * math.pi * s / radial_segs
            dx, dy = prof_fn(theta)
            row.append(bm.verts.new(center + ax * dx + ay * dy))
        rings.append(row)

    for i in range(len(rings) - 1):
        for s in range(radial_segs):
            s2 = (s + 1) % radial_segs
            bm.faces.new((rings[i][s], rings[i][s2], rings[i + 1][s2], rings[i + 1][s]))

    c0, ax0, ay0, pf0 = stations[0]
    c1, ax1, ay1, pf1 = stations[-1]
    tan0 = (stations[1][0] - c0).normalized()
    tan1 = (c1 - stations[-2][0]).normalized()

    for is_end, c_pt, ax, ay, pf, tan_out, ring in [
        (False, c0, ax0, ay0, pf0, -tan0, rings[0]),
        (True, c1, ax1, ay1, pf1, tan1, rings[-1]),
    ]:
        prev = ring
        for scale_r, push_t in [(0.62, 0.55), (0.26, 0.90)]:
            nrow = []
            for s in range(radial_segs):
                theta = 2.0 * math.pi * s / radial_segs
                dx, dy = pf(theta)
                pt = c_pt + ax * (dx * scale_r) + ay * (dy * scale_r) + tan_out * ((cap_end if is_end else cap_start) * push_t)
                nrow.append(bm.verts.new(pt))
            for s in range(radial_segs):
                s2 = (s + 1) % radial_segs
                if is_end:
                    bm.faces.new((prev[s], prev[s2], nrow[s2], nrow[s]))
                else:
                    bm.faces.new((nrow[s], nrow[s2], prev[s2], prev[s]))
            prev = nrow
        pole = bm.verts.new(c_pt + tan_out * (cap_end if is_end else cap_start))
        for s in range(radial_segs):
            s2 = (s + 1) % radial_segs
            if is_end:
                bm.faces.new((prev[s], prev[s2], pole))
            else:
                bm.faces.new((pole, prev[s2], prev[s]))

    return mc.emit_bmesh(name, bm, mat_key, subsurf_levels=subsurf_levels)


# ==============================================================================
# 3. ANATOMICAL HUMAN PRACTITIONER BUILDER (CLAVICLES, MALLEOLI, PALMAR ARCH, HELIX)
# ==============================================================================

def bezier3(p0: Vector, p1: Vector, p2: Vector, t: float) -> Vector:
    u = 1.0 - t
    return p0 * (u * u) + p1 * (2.0 * u * t) + p2 * (t * t)


def bezier3_tan(p0: Vector, p1: Vector, p2: Vector, t: float) -> Vector:
    d = (p1 - p0) * (2.0 * (1.0 - t)) + (p2 - p1) * (2.0 * t)
    return d.normalized() if d.length > 1e-5 else Vector((0, 0, 1))


def solve_2bone_ik_with_bend(root: Vector, target: Vector, l1: float, l2: float, pole: Vector):
    tgt = target.copy()
    dvec = tgt - root
    dist = dvec.length
    max_r = (l1 + l2) * 0.992
    min_r = abs(l1 - l2) + 0.03
    if dist > max_r:
        tgt = root + dvec.normalized() * max_r
        dvec = tgt - root
        dist = max_r
    elif dist < min_r:
        u0 = dvec.normalized() if dist > 1e-5 else Vector((1, 0, 0))
        tgt = root + u0 * min_r
        dvec = tgt - root
        dist = min_r
    u = dvec.normalized()
    bend = pole - u * pole.dot(u)
    if bend.length < 1e-4:
        bend = u.cross(Vector((0, 1, 0)))
        if bend.length < 1e-4:
            bend = u.cross(Vector((0, 0, 1)))
    bend.normalize()
    cos_a = max(-1.0, min(1.0, (l1 * l1 + dist * dist - l2 * l2) / (2.0 * l1 * dist)))
    ang_a = math.acos(cos_a)
    mid = root + (u * math.cos(ang_a) + bend * math.sin(ang_a)) * l1
    return mid, tgt, bend


def sample_rounded_2seg_chain(p0: Vector, p1: Vector, p2: Vector, s: float, corner_blend: float = 0.16) -> tuple[Vector, Vector]:
    c0, c1 = 0.5 - corner_blend, 0.5 + corner_blend
    if s <= c0:
        u = s / c0 * (1.0 - corner_blend * 1.4)
        pt = p0.lerp(p1, u)
        tan = (p1 - p0).normalized()
    elif s >= c1:
        u = corner_blend * 1.4 + (s - c1) / (1.0 - c1) * (1.0 - corner_blend * 1.4)
        pt = p1.lerp(p2, u)
        tan = (p2 - p1).normalized()
    else:
        bt = (s - c0) / (c1 - c0)
        qa = p0.lerp(p1, 1.0 - corner_blend * 1.4)
        qb = p1.lerp(p2, corner_blend * 1.4)
        pt = bezier3(qa, p1, qb, bt)
        tan = bezier3_tan(qa, p1, qb, bt)
    return pt, tan


def build_sculpted_head_and_hair(mc: MeshCollector, skull_center: Vector, up_axis: Vector, ant_axis: Vector, subsurf: int):
    up = up_axis.normalized()
    f_proj = ant_axis - up * ant_axis.dot(up)
    if f_proj.length < 1e-4:
        f_proj = Vector((1, 0, 0)) - up * up.x
    fwd = f_proj.normalized()
    right = fwd.cross(up).normalized()
    basis = Matrix((
        (right.x, fwd.x, up.x, skull_center.x),
        (right.y, fwd.y, up.y, skull_center.y),
        (right.z, fwd.z, up.z, skull_center.z),
        (0, 0, 0, 1),
    ))

    # 1) Sculpted Cranium + Malar Cheekbones + Feminine Jaw/Chin + Soft Nose Bridge & Brow
    bm = bmesh.new()
    u_seg = 20 if mc.glb_mode else 28
    v_seg = 14 if mc.glb_mode else 20
    bmesh.ops.create_uvsphere(bm, u_segments=u_seg, v_segments=v_seg, radius=1.0)
    for v in bm.verts:
        nx, ny, nz = v.co.x, v.co.y, v.co.z
        x = nx * 0.073
        y = ny * 0.088
        z = nz * 0.098
        if ny > 0:
            if nz < 0.05:
                jaw_t = min(1.0, (0.05 - nz) / 1.05)
                x *= 1.0 - 0.35 * (jaw_t ** 1.25)
                y *= 1.0 - 0.10 * jaw_t
                chin_w = math.exp(-((nx / 0.30) ** 2)) * math.exp(-(((nz + 0.78) / 0.23) ** 2))
                y += 0.0095 * chin_w
                z -= 0.006 * chin_w
            # Malar cheekbone fullness
            malar_w = math.exp(-(((abs(nx) - 0.56) / 0.22) ** 2)) * math.exp(-(((nz + 0.08) / 0.20) ** 2))
            x += math.copysign(0.0035 * malar_w * ny, nx)
            y += 0.0030 * malar_w * ny
            # Soft nose bridge & tip relief
            nose_w = math.exp(-((nx / 0.15) ** 2)) * math.exp(-(((nz + 0.11) / 0.27) ** 2))
            y += 0.0115 * nose_w * max(0.0, ny)
            # Orbital depression below superciliary brow arch
            eye_w = math.exp(-(((abs(nx) - 0.36) / 0.18) ** 2)) * math.exp(-(((nz - 0.08) / 0.14) ** 2))
            y -= 0.0048 * eye_w * max(0.0, ny)
        else:
            if nz < -0.25:
                occ_t = (-0.25 - nz) / 0.75
                x *= 1.0 - 0.22 * occ_t
                y *= 1.0 - 0.18 * occ_t
        v.co = (x, y, z)
    mc.emit_bmesh("Head_Cranium", bm, "skin", matrix=basis, subsurf_levels=subsurf)

    # 2) Sculpted Anatomical Ears with Rolled C-Shaped Helix Rim, Concha Hollow & Lobule
    for sign, side in [(-1.0, "L"), (1.0, "R")]:
        bm_e = bmesh.new()
        bmesh.ops.create_uvsphere(bm_e, u_segments=16, v_segments=12, radius=1.0)
        flare = math.radians(16.0 * sign)
        cf, sf = math.cos(flare), math.sin(flare)
        for v in bm_e.verts:
            ux, uy, uz = v.co.x, v.co.y, v.co.z
            # Cupped pinna in YZ plane: outer lateral face is sign*ux > 0
            rad_yz = math.hypot(uy * 0.92, uz * 0.78)
            ang_yz = math.atan2(uz, -sign * uy)
            # C-shaped rolled helix rim along superior & posterior pinna margin
            helix_arc = max(0.0, 1.0 - max(0.0, math.cos(ang_yz - 0.35) - 0.55) * 1.6)
            helix_roll = math.exp(-(((rad_yz - 0.76) / 0.17) ** 2)) * helix_arc
            concha_cup = math.exp(-((rad_yz / 0.46) ** 2))
            lat_relief = sign * (0.0038 * helix_roll - 0.0032 * concha_cup * (1.0 if sign * ux > 0 else -0.3))
            # Taper soft earlobe inferiorly
            lobe_taper = 1.0 - 0.24 * max(0.0, -uz - 0.25)
            lx = ux * 0.0058 + lat_relief
            ly = uy * 0.0145 * lobe_taper
            lz = uz * 0.0245
            # Flare pinna 16 degrees outward from temporal skull
            rx = lx * cf - ly * sf
            ry = lx * sf + ly * cf
            v.co = (rx + sign * 0.0715, ry - 0.007, lz - 0.008)
        mc.emit_bmesh(f"Ear_Helix_{side}", bm_e, "skin", matrix=basis, subsurf_levels=0 if mc.glb_mode else 1)

    # 3) Closed Manifold Sculpted Hair Crown + Satin Scrunchie Torus + Braided Spiral Chignon Bun
    bm_h = bmesh.new()
    bmesh.ops.create_uvsphere(bm_h, u_segments=u_seg, v_segments=v_seg, radius=1.0)
    for v in bm_h.verts:
        nx, ny, nz = v.co.x, v.co.y, v.co.z
        face_mask = max(0.0, ny - 0.10) * max(0.0, 0.42 - nz - 0.18 * abs(nx))
        if face_mask > 0.0:
            inset = min(0.032, face_mask * 0.09)
            v.co = (nx * (0.075 - inset), ny * (0.086 - inset * 1.4), nz * 0.097)
        elif nz < -0.68 and ny > -0.2:
            v.co = (nx * 0.052, ny * 0.058, nz * 0.082)
        else:
            temple_wave = 0.0035 * math.exp(-(((nz - 0.18) / 0.25) ** 2)) * abs(nx)
            part_groove = -0.0022 * math.exp(-((nx / 0.09) ** 2)) * max(0.0, nz - 0.35) * max(0.0, ny + 0.2)
            v.co = (nx * (0.079 + temple_wave), ny * 0.093 - 0.005, nz * 0.102 + 0.004 + part_groove)
    mc.emit_bmesh("Hair_Crown", bm_h, "hair", matrix=basis, subsurf_levels=subsurf)

    # Satin Ivory Scrunchie Ring with soft gathered pleats
    sc_pts = []
    for k in range(20):
        a = 2.0 * math.pi * k / 20
        pleat = 1.0 + 0.06 * math.sin(a * 7.0)
        local_p = Vector((math.cos(a) * 0.029 * pleat, -0.090, 0.028 + math.sin(a) * 0.029 * pleat))
        sc_pts.append(basis @ local_p)
    add_swept_tube(mc, "Hair_Scrunchie", sc_pts, 0.0078, "suit_accent", closed=True, radial_segs=8)

    # Braided Multi-Strand Spiral Chignon Ballet Bun
    bm_bun = bmesh.new()
    bmesh.ops.create_uvsphere(bm_bun, u_segments=18 if mc.glb_mode else 22, v_segments=12 if mc.glb_mode else 14, radius=1.0)
    for v in bm_bun.verts:
        ux, uy, uz = v.co.x, v.co.y, v.co.z
        ang_twist = math.atan2(uz, ux)
        rad_xz = math.hypot(ux, uz)
        braid_wave = 1.0 + 0.095 * math.sin(ang_twist * 4.0 + uy * 4.2) + 0.045 * math.cos(rad_xz * 5.0 - ang_twist * 2.0)
        cuff_pinch = 1.0 - 0.18 * max(0.0, uy - 0.45)
        v.co = (
            ux * 0.044 * braid_wave * cuff_pinch,
            -0.114 + uy * 0.036,
            0.031 + uz * 0.044 * braid_wave * cuff_pinch,
        )
    mc.emit_bmesh("Hair_Chignon", bm_bun, "hair", matrix=basis, subsurf_levels=subsurf)


def compute_hand_frame(
    side: str,
    forearm_dir: Vector,
    body_right: Vector,
    ant_n: Vector,
    supinate_up: bool = False,
) -> tuple[Vector, Vector, Vector]:
    fdir = forearm_dir.normalized()
    sign = -1.0 if side == "L" else 1.0
    lat = body_right * (-sign)
    lat = lat - fdir * lat.dot(fdir)
    if lat.length < 1e-4:
        lat = fdir.cross(ant_n)
        if lat.length < 1e-4:
            lat = fdir.cross(Vector((0, 0, 1)))
    lat.normalize()
    dorsal = fdir.cross(lat).normalized()
    if side == "R":
        dorsal = -dorsal
    if supinate_up and dorsal.z > 0.0:
        # Forearm supination: flip dorsal downward so palmar arch & fingers cup upward against gravity!
        dorsal = -dorsal
        lat = -lat
    return fdir, lat, dorsal


def build_sculpted_hand(
    mc: MeshCollector,
    side: str,
    wrist: Vector,
    forearm_dir: Vector,
    body_right: Vector,
    ant_n: Vector,
    supinate_up: bool = False,
):
    """
    5-Digit Anatomical Pilates Hand:
    - 5-station Metacarpal Palm Loft with concave Palmar Arch, Thenar & Hypothenar Eminences
    - Continuous 5-station Opposable Thumb Loft rotated into true palmar opposition
    - 4 Continuous 5-station Tapered Finger Lofts with cascading MCP/PIP/DIP articulation
    """
    fdir, lat, dorsal = compute_hand_frame(side, forearm_dir, body_right, ant_n, supinate_up=supinate_up)

    # 1) 5-station Metacarpal Palm Loft with sculpted Palmar Arch hollow & Thenar/Hypothenar pads
    palm_len = 0.070
    palm_stations = []
    for u_p, wx, wy_dors, wy_palm, arch_cup in [
        (-0.08, 0.024, 0.015, 0.015, 0.0000),
        (0.24, 0.033, 0.014, 0.016, 0.0022),
        (0.56, 0.038, 0.013, 0.015, 0.0042),
        (0.84, 0.039, 0.012, 0.013, 0.0030),
        (1.00, 0.036, 0.010, 0.011, 0.0012),
    ]:
        c = wrist + fdir * (palm_len * u_p)

        def palm_prof(th, a=wx, bd=wy_dors, bp=wy_palm, cup=arch_cup):
            ct, st = math.cos(th), math.sin(th)
            if st >= 0:
                # Gently arched dorsal metacarpals
                y = st * bd * (1.0 + 0.08 * (1.0 - ct * ct))
            else:
                # Concave central palmar arch flanked by raised thenar (ct > 0) & hypothenar (ct < 0) eminences
                eminence = 1.0 + 0.22 * math.exp(-(((ct - 0.58) / 0.34) ** 2)) + 0.16 * math.exp(-(((ct + 0.62) / 0.32) ** 2))
                central_hollow = cup * math.exp(-((ct / 0.42) ** 2)) * (-st)
                y = st * bp * eminence + central_hollow
            return ct * a, y

        palm_stations.append((c, lat, dorsal, palm_prof))

    build_loft_from_stations(
        mc,
        f"Hand_Palm_{side}",
        palm_stations,
        "skin",
        radial_segs=14 if mc.glb_mode else 16,
        cap_start=0.008,
        cap_end=0.007,
        subsurf_levels=0 if mc.glb_mode else 1,
    )

    # 2) Continuous 5-Station Opposable Thumb Loft (originating from Thenar eminence in palmar opposition)
    th_p0 = wrist + fdir * 0.014 + lat * 0.021 - dorsal * 0.005
    th_p1 = th_p0 + (fdir * 0.66 + lat * 0.64 - dorsal * 0.38).normalized() * 0.024
    th_p2 = th_p1 + (fdir * 0.80 + lat * 0.34 - dorsal * 0.48).normalized() * 0.021
    th_p3 = th_p2 + (fdir * 0.90 + lat * 0.08 - dorsal * 0.42).normalized() * 0.017
    thumb_pts = [th_p0, th_p0.lerp(th_p1, 0.55), th_p1, th_p2, th_p3]
    thumb_radii = [(0.0105, 0.0095), (0.0092, 0.0086), (0.0082, 0.0078), (0.0072, 0.0068), (0.0058, 0.0052)]
    thumb_stations = []
    for idx_t, (tp, (trx, try_)) in enumerate(zip(thumb_pts, thumb_radii)):
        tan_t = (thumb_pts[min(len(thumb_pts) - 1, idx_t + 1)] - thumb_pts[max(0, idx_t - 1)]).normalized()
        ax_t = lat - tan_t * lat.dot(tan_t)
        if ax_t.length < 1e-4:
            ax_t = tan_t.cross(dorsal)
        ax_t.normalize()
        ay_t = tan_t.cross(ax_t).normalized()
        thumb_stations.append((tp, ax_t, ay_t, lambda th, a=trx, b=try_: (math.cos(th) * a, math.sin(th) * b)))
    build_loft_from_stations(
        mc,
        f"Thumb_Opposable_{side}",
        thumb_stations,
        "skin",
        radial_segs=8 if mc.glb_mode else 10,
        cap_start=0.006,
        cap_end=0.006,
        subsurf_levels=0,
    )

    # 3) 4 Continuous 5-Station Sculpted Fingers with natural cascading curl & slight abduction spread
    finger_specs = [
        ("Idx", 0.74, 0.060, 0.0068, 0.05),
        ("Mid", 0.24, 0.066, 0.0071, 0.00),
        ("Rng", -0.25, 0.061, 0.0066, -0.04),
        ("Pnk", -0.74, 0.049, 0.0056, -0.09),
    ]
    for fname, lat_u, flen, frad, splay in finger_specs:
        mcp = wrist + fdir * (palm_len * 0.94) + lat * (lat_u * 0.030) - dorsal * (0.0018 * (lat_u ** 2))
        d1 = (fdir * 0.96 + lat * splay - dorsal * 0.20).normalized()
        d2 = (fdir * 0.89 + lat * (splay * 0.7) - dorsal * 0.42).normalized()
        d3 = (fdir * 0.78 + lat * (splay * 0.4) - dorsal * 0.60).normalized()
        pip = mcp + d1 * (flen * 0.44)
        dip = pip + d2 * (flen * 0.31)
        tip = dip + d3 * (flen * 0.25)
        f_pts = [mcp - d1 * 0.004, mcp.lerp(pip, 0.5), pip, dip, tip]
        f_scales = [1.04, 0.96, 0.89, 0.79, 0.66]
        f_stations = []
        for idx_f, (fp, sc) in enumerate(zip(f_pts, f_scales)):
            tan_f = (f_pts[min(len(f_pts) - 1, idx_f + 1)] - f_pts[max(0, idx_f - 1)]).normalized()
            ax_f = lat - tan_f * lat.dot(tan_f)
            if ax_f.length < 1e-4:
                ax_f = tan_f.cross(dorsal)
            ax_f.normalize()
            ay_f = tan_f.cross(ax_f).normalized()
            rx_f = frad * sc
            ry_f = frad * sc * 0.90
            f_stations.append((fp, ax_f, ay_f, lambda th, a=rx_f, b=ry_f: (math.cos(th) * a, math.sin(th) * b)))
        build_loft_from_stations(
            mc,
            f"Finger_{fname}_{side}",
            f_stations,
            "skin",
            radial_segs=8 if mc.glb_mode else 10,
            cap_start=0.005,
            cap_end=0.005,
            subsurf_levels=0,
        )


def build_sculpted_grip_foot(
    mc: MeshCollector,
    side: str,
    hip: Vector,
    knee: Vector,
    ankle: Vector,
    knee_bend_dir: Vector,
    body_ant_n: Vector,
    subsurf: int,
):
    """
    Anatomical Pilates Grip-Sock Foot with Medial/Lateral Malleolus Ankle Contouring
    & Continuous Wrap-Around Mid-Foot Arch Band.
    """
    shin_down = (ankle - knee).normalized() if (ankle - knee).length > 1e-4 else Vector((0, 0, -1))
    shin_up = -shin_down
    thigh_up = (hip - knee).normalized() if (hip - knee).length > 1e-4 else shin_up

    if thigh_up.dot(shin_down) > -0.965:
        patella_vec = knee - hip.lerp(ankle, 0.5)
        raw_ant = patella_vec if patella_vec.length > 0.015 else knee_bend_dir
    else:
        raw_ant = body_ant_n

    ant_tib = raw_ant - shin_down * raw_ant.dot(shin_down)
    if ant_tib.length < 1e-4:
        ant_tib = knee_bend_dir - shin_down * knee_bend_dir.dot(shin_down)
    if ant_tib.length < 1e-4:
        ant_tib = Vector((1, 0, 0)) - shin_down * shin_down.x
    ant_tib.normalize()

    if ankle.z <= 0.145 and shin_up.z > 0.45:
        foot_fwd = Vector((ant_tib.x, ant_tib.y, 0.0))
        if foot_fwd.length < 1e-4:
            foot_fwd = ant_tib
        foot_fwd.normalize()
        foot_up = Vector((0.0, 0.0, 1.0))
    elif ant_tib.z < -0.25 and ankle.z < 0.36:
        point_ang = math.radians(68.0)
        foot_fwd = (ant_tib * math.cos(point_ang) + shin_down * math.sin(point_ang)).normalized()
        foot_up = (shin_up * math.cos(point_ang) + ant_tib * math.sin(point_ang)).normalized()
    else:
        point_ang = math.radians(24.0 if ankle.z > 0.24 else 10.0)
        foot_fwd = (ant_tib * math.cos(point_ang) + shin_down * math.sin(point_ang)).normalized()
        foot_up = (shin_up * math.cos(point_ang) + ant_tib * math.sin(point_ang)).normalized()

    foot_lat = foot_fwd.cross(foot_up).normalized()
    med_sign = 1.0 if side == "L" else -1.0  # Medial side sign along `foot_lat`

    # 1) Ribbed Ivory Crew Grip-Sock Cuff with Medial & Lateral Ankle Malleoli
    cuff_top = knee.lerp(ankle, 0.83)
    cuff_stations = []
    for u_c, r_lat, r_ap, mal_flare in [
        (0.00, 0.036, 0.038, 0.0000),
        (0.52, 0.033, 0.036, 0.0018),
        (0.86, 0.034, 0.036, 0.0048),  # Medial/lateral malleolar bony flare
        (1.02, 0.032, 0.035, 0.0025),
    ]:
        c = cuff_top.lerp(ankle, u_c)

        def cuff_prof(th, a=r_lat, b=r_ap, mf=mal_flare, ms=med_sign):
            ct, st = math.cos(th), math.sin(th)
            # Medial malleolus sits slightly more anterior; lateral malleolus slightly more posterior
            med_w = math.exp(-(((ct - ms * 0.92) / 0.28) ** 2)) * math.exp(-(((st - 0.14) / 0.42) ** 2))
            lat_w = math.exp(-(((ct + ms * 0.92) / 0.28) ** 2)) * math.exp(-(((st + 0.16) / 0.42) ** 2))
            achilles_pinch = -0.0025 * math.exp(-((ct / 0.35) ** 2)) * max(0.0, -st)
            dx = ct * a + math.copysign(mf * (med_w + lat_w), ct)
            dy = st * b + achilles_pinch
            return dx, dy

        cuff_stations.append((c, foot_lat, ant_tib, cuff_prof))

    build_loft_from_stations(
        mc,
        f"Sock_Cuff_{side}",
        cuff_stations,
        "sock",
        radial_segs=14 if mc.glb_mode else 16,
        cap_start=0.006,
        cap_end=0.008,
        subsurf_levels=0,
    )

    # 2) Multi-Station Anatomical Foot Loft (Calcaneus Heel -> Talus -> Arch -> Metatarsal -> Sculpted Toes)
    foot_stations = []
    specs = [
        (-0.043, -0.016, 0.027, 0.028),
        (-0.008, -0.014, 0.032, 0.032),
        (0.040, -0.018, 0.033, 0.025),
        (0.090, -0.024, 0.041, 0.019),
        (0.130, -0.025, 0.034, 0.014),
    ]
    for f_off, u_off, hw, hh in specs:
        c = ankle + foot_fwd * f_off + foot_up * u_off

        def foot_prof(th, a=hw, b=hh):
            st = math.sin(th)
            ct = math.cos(th)
            y_val = st * b * (0.62 if st < 0 else 1.12)
            return ct * a, y_val

        foot_stations.append((c, foot_lat, foot_up, foot_prof))

    build_loft_from_stations(
        mc,
        f"Foot_Sculpt_{side}",
        foot_stations,
        "sock",
        radial_segs=12 if mc.glb_mode else 18,
        cap_start=0.012,
        cap_end=0.014,
        subsurf_levels=subsurf,
    )

    # 3) Continuous Wrap-Around Elastic Grip-Sock Arch Band Loop (zero protruding rod ends!)
    arch_c = ankle + foot_fwd * 0.042 + foot_up * (-0.018)
    arch_loop = []
    for k in range(16):
        th = 2.0 * math.pi * k / 16
        st, ct = math.sin(th), math.cos(th)
        dx = ct * 0.0345
        dy = st * 0.0265 * (0.64 if st < 0 else 1.14)
        arch_loop.append(arch_c + foot_lat * dx + foot_up * dy)
    add_swept_tube(mc, f"Sock_ArchBand_{side}", arch_loop, 0.0038, "legging", closed=True, radial_segs=8)


def build_sculpted_practitioner(mc: MeshCollector, rig: dict, subsurf: int = 1):
    """
    Constructs the Flagship v2 Anatomical 3D Practitioner from a `Universal3DPoseRig` sample:
    - Smooth SubD Legging Pelvis/Glute Loft -> Midriff Loft -> Scoop-Neck Crop Top -> Clavicle/Sternoclavicular Yoke
    - Continuous Deltoid-to-Wrist Muscle-Lofted Arms + Palmar-Arch Hands with Opposable Thumb
    - Continuous Patella/Condyle & Gastrocnemius/Malleolus Sculpted Legs + Grip-Sock Feet
    - Sculpted Cranium, Rolled-Helix Ears & Spiral-Braided Chignon Ballet Bun
    """
    pelvis = Vector(rig["pelvis"])
    spine_mid = Vector(rig["spineMid"])
    chest = Vector(rig["chest"])
    ant_hint = Vector(rig["antHint"])
    l_foot = Vector(rig["lFoot"])
    r_foot = Vector(rig["rFoot"])
    l_hand = Vector(rig["lHand"])
    r_hand = Vector(rig["rHand"])

    sp_up = (chest - pelvis).normalized() if (chest - pelvis).length > 1e-4 else Vector((0, 0, 1))
    ant_proj = ant_hint - sp_up * ant_hint.dot(sp_up)
    if ant_proj.length < 1e-4:
        ant_proj = Vector((1, 0, 0)) - sp_up * sp_up.x
    ant_n = ant_proj.normalized()
    body_right = sp_up.cross(ant_n).normalized()

    def spine_frame(u_clamped: float):
        uc = max(0.0, min(1.0, u_clamped))
        pt = bezier3(pelvis, spine_mid, chest, uc)
        tan = bezier3_tan(pelvis, spine_mid, chest, uc)
        if u_clamped < 0.0:
            pt = pelvis + tan * (u_clamped * 0.42)
        elif u_clamped > 1.0:
            pt = chest + tan * ((u_clamped - 1.0) * 0.42)
        r_ax = body_right - tan * body_right.dot(tan)
        if r_ax.length < 1e-4:
            r_ax = tan.cross(ant_n)
        r_ax.normalize()
        f_ax = r_ax.cross(tan).normalized()
        if f_ax.dot(ant_n) < 0:
            f_ax = -f_ax
        return pt, r_ax, f_ax, tan

    r_segs_torso = 18 if mc.glb_mode else 24

    # 1A) High-Waisted Sculpted Legging Pelvis & Gluteal Loft (u = -0.10 .. 0.40)
    legging_stations = []
    for u_s, rx, ry_front, ry_back, glute_cleft in [
        (-0.10, 0.116, 0.077, 0.090, 0.010),
        (0.00, 0.142, 0.088, 0.116, 0.014),
        (0.11, 0.146, 0.090, 0.118, 0.012),
        (0.23, 0.131, 0.085, 0.098, 0.004),
        (0.34, 0.114, 0.080, 0.084, 0.000),
        (0.40, 0.110, 0.078, 0.081, 0.000),
    ]:
        pt, r_ax, f_ax, _ = spine_frame(u_s)

        def pelvis_prof(th, a=rx, bf=ry_front, bb=ry_back, cleft=glute_cleft):
            ct, st = math.cos(th), math.sin(th)
            if st >= 0:
                y = (st ** 0.88) * bf
            else:
                glute_lobe = 1.0 + 0.13 * (math.sin(2.0 * th) ** 2)
                sacral_dip = cleft * math.exp(-((ct / 0.22) ** 2))
                y = st * bb * glute_lobe + sacral_dip
            return ct * a, y

        legging_stations.append((pt, r_ax, f_ax, pelvis_prof))
    build_loft_from_stations(
        mc,
        "Torso_LeggingPelvis",
        legging_stations,
        "legging",
        radial_segs=r_segs_torso,
        cap_start=0.026,
        cap_end=0.008,
        subsurf_levels=subsurf,
    )

    # 1B) Toned Anatomical Midriff Loft (u = 0.35 .. 0.58 — deeply embedded for seamless SubD continuity)
    midriff_stations = []
    for u_s, rx, ry in [
        (0.35, 0.108, 0.076),
        (0.45, 0.105, 0.075),
        (0.52, 0.110, 0.079),
        (0.58, 0.115, 0.083),
    ]:
        pt, r_ax, f_ax, _ = spine_frame(u_s)

        def mid_prof(th, a=rx, b=ry):
            ct, st = math.cos(th), math.sin(th)
            linea_alba = 0.0045 * math.exp(-((ct / 0.17) ** 2))
            oblique_taper = -0.0022 * math.exp(-(((abs(ct) - 0.58) / 0.20) ** 2)) * max(0.0, st)
            return ct * a, st * b - (linea_alba if st > 0 else -linea_alba * 0.8) + oblique_taper

        midriff_stations.append((pt, r_ax, f_ax, mid_prof))
    build_loft_from_stations(
        mc,
        "Torso_Midriff",
        midriff_stations,
        "skin",
        radial_segs=r_segs_torso,
        cap_start=0.010,
        cap_end=0.010,
        subsurf_levels=subsurf,
    )

    # 1C) Sculpted Scoop-Neck Studio Crop Top Loft (u = 0.54 .. 0.88)
    top_stations = []
    for u_s, rx, ry_front, ry_back, bust_boost in [
        (0.54, 0.116, 0.084, 0.084, 0.000),
        (0.66, 0.126, 0.104, 0.088, 0.016),
        (0.77, 0.136, 0.108, 0.090, 0.018),
        (0.88, 0.141, 0.092, 0.087, 0.005),
    ]:
        pt, r_ax, f_ax, _ = spine_frame(u_s)

        def chest_prof(th, a=rx, bf=ry_front, bb=ry_back, boost=bust_boost):
            ct, st = math.cos(th), math.sin(th)
            if st >= 0:
                bust_lobes = boost * st * (
                    math.exp(-(((ct - 0.42) / 0.34) ** 2)) + math.exp(-(((ct + 0.42) / 0.34) ** 2))
                )
                y = st * bf + bust_lobes
            else:
                scap_groove = 0.0035 * math.exp(-((ct / 0.18) ** 2))
                y = st * bb + scap_groove
            return ct * a, y

        top_stations.append((pt, r_ax, f_ax, chest_prof))
    build_loft_from_stations(
        mc,
        "Torso_CropTop",
        top_stations,
        "suit",
        radial_segs=r_segs_torso,
        cap_start=0.008,
        cap_end=0.010,
        subsurf_levels=subsurf,
    )

    # 1D) Upper Thoracic Clavicle & Sternoclavicular Skin Yoke Loft (u = 0.83 .. 1.05)
    clavicle_stations = []
    for u_s, rx, ry_f, ry_b, clav_relief, notch_depth in [
        (0.83, 0.136, 0.088, 0.084, 0.0010, 0.0000),
        (0.92, 0.143, 0.082, 0.082, 0.0052, 0.0035),
        (0.99, 0.128, 0.073, 0.075, 0.0065, 0.0060),  # Prominent clavicle S-ridge & sternoclavicular notch
        (1.05, 0.092, 0.062, 0.064, 0.0020, 0.0030),
    ]:
        pt, r_ax, f_ax, _ = spine_frame(u_s)

        def clavicle_prof(th, a=rx, bf=ry_f, bb=ry_b, cr=clav_relief, nd=notch_depth):
            ct, st = math.cos(th), math.sin(th)
            if st >= 0:
                # Suprasternal jugular notch hollow flanked by sternoclavicular heads & S-curved clavicular ridges
                jugular_notch = -nd * math.exp(-((ct / 0.14) ** 2)) * st
                sc_heads = (cr * 0.85) * (
                    math.exp(-(((ct - 0.20) / 0.10) ** 2)) + math.exp(-(((ct + 0.20) / 0.10) ** 2))
                ) * st
                clav_bar = cr * math.exp(-(((abs(ct) - 0.52) / 0.28) ** 2)) * (st ** 0.75)
                y = st * bf + jugular_notch + sc_heads + clav_bar
            else:
                y = st * bb
            return ct * a, y

        clavicle_stations.append((pt, r_ax, f_ax, clavicle_prof))
    build_loft_from_stations(
        mc,
        "Torso_ClavicleYoke",
        clavicle_stations,
        "skin",
        radial_segs=r_segs_torso,
        cap_start=0.010,
        cap_end=0.018,
        subsurf_levels=subsurf,
    )

    # Continuous Closed Ivory Piping Band at Crop-Top Underbust
    pt_ub, r_ub, f_ub, _ = spine_frame(0.542)
    ub_ring_pts = [
        pt_ub + r_ub * (math.cos(2.0 * math.pi * k / 20) * 0.117) + f_ub * (math.sin(2.0 * math.pi * k / 20) * 0.085)
        for k in range(20)
    ]
    add_swept_tube(mc, "Torso_UnderbustPiping", ub_ring_pts, 0.0038, "suit_accent", closed=True, radial_segs=8)

    # 2) Neck Loft + Sculpted Head, Ear Helix & Braided Chignon
    head_pos = chest + sp_up * 0.192 + ant_n * 0.015
    neck_stations = []
    for u_n, r_nx, r_ny in [
        (-0.08, 0.056, 0.052),
        (0.38, 0.044, 0.043),
        (0.88, 0.041, 0.042),
    ]:
        c = chest.lerp(head_pos - sp_up * 0.032, max(0.0, u_n)) if u_n >= 0 else chest + sp_up * (u_n * 0.14)

        def neck_prof(th, a=r_nx, b=r_ny):
            ct, st = math.cos(th), math.sin(th)
            # Subtle sternocleidomastoid twin V-contours anteriorly
            scm = 0.0018 * math.exp(-(((abs(ct) - 0.45) / 0.22) ** 2)) * max(0.0, st)
            return ct * a, st * b + scm

        neck_stations.append((c, body_right, ant_n, neck_prof))
    build_loft_from_stations(
        mc,
        "Neck_Column",
        neck_stations,
        "skin",
        radial_segs=14 if mc.glb_mode else 16,
        cap_start=0.012,
        cap_end=0.012,
        subsurf_levels=subsurf,
    )
    build_sculpted_head_and_hair(mc, head_pos, sp_up, ant_n, subsurf)

    # Continuous Arched Crop-Top Shoulder Straps (from scoop neckline over clavicle/trapezius to back)
    pt_top_edge, r_te, f_te, _ = spine_frame(0.87)
    l_hip = pelvis - body_right * 0.086
    r_hip = pelvis + body_right * 0.086
    l_sh = chest - body_right * 0.150
    r_sh = chest + body_right * 0.150

    for sign, side in [(-1.0, "L"), (1.0, "R")]:
        s_p0 = pt_top_edge + r_te * (sign * 0.084) + f_te * 0.072
        s_p1 = chest + body_right * (sign * 0.096) + ant_n * 0.056 + sp_up * 0.016
        s_p2 = chest + body_right * (sign * 0.102) + sp_up * 0.038
        s_p3 = chest + body_right * (sign * 0.092) - ant_n * 0.052 + sp_up * 0.014
        s_p4 = pt_top_edge + r_te * (sign * 0.078) - f_te * 0.072
        add_swept_tube(mc, f"CropStrap_{side}", [s_p0, s_p1, s_p2, s_p3, s_p4], 0.0082, "suit", closed=False, radial_segs=8)

    # 3) Continuous Muscle-Contoured Legging Loft with Patella, Condyles, Gastrocnemius & Ankle Malleoli
    r_segs_limb = 12 if mc.glb_mode else 18
    for side, hp, ft, kpole in [
        ("L", l_hip, l_foot, Vector(rig["lKneePole"])),
        ("R", r_hip, r_foot, Vector(rig["rKneePole"])),
    ]:
        knee, ankle, k_bend = solve_2bone_ik_with_bend(hp, ft, 0.40, 0.39, kpole)
        hem_ankle = knee.lerp(ankle, 0.85)
        leg_stations = []
        leg_profile_table = [
            (0.00, 0.080, 0.084, 0.008),
            (0.14, 0.075, 0.079, 0.006),
            (0.30, 0.066, 0.070, 0.005),
            (0.44, 0.053, 0.055, 0.003),
            (0.50, 0.050, 0.052, 0.004),  # Patellar shield & femoral condyles
            (0.57, 0.046, 0.048, -0.002),
            (0.68, 0.050, 0.055, -0.009), # Twin-head gastrocnemius calf belly
            (0.82, 0.041, 0.044, -0.004),
            (0.94, 0.035, 0.037, 0.000),
            (1.00, 0.034, 0.036, 0.000),
        ]
        for s_val, rx_l, ry_l, ant_shift in leg_profile_table:
            pt, tan = sample_rounded_2seg_chain(hp, knee, hem_ankle, s_val, corner_blend=0.13)
            f_ax = k_bend - tan * k_bend.dot(tan)
            if f_ax.length < 1e-4:
                f_ax = tan.cross(body_right)
            f_ax.normalize()
            lat_ax = f_ax.cross(tan).normalized()
            c_shifted = pt + f_ax * ant_shift
            patella_w = math.exp(-(((s_val - 0.50) / 0.055) ** 2))
            calf_w = math.exp(-(((s_val - 0.68) / 0.095) ** 2))

            def leg_prof(th, a=rx_l, b=ry_l, pw=patella_w, cw=calf_w):
                ct, st = math.cos(th), math.sin(th)
                dx = ct * a
                dy = st * b
                if pw > 0.05:
                    # Subtle anterior patella cap + femoral condyle breadth + popliteal hollow
                    if st > 0:
                        dy += 0.0045 * pw * math.exp(-((ct / 0.34) ** 2)) * st
                    else:
                        dy += 0.0032 * pw * math.exp(-((ct / 0.45) ** 2)) * (-st)
                    dx += math.copysign(0.0024 * pw * (ct * ct), ct)
                if cw > 0.05:
                    # Anterior tibial shin crest + twin gastrocnemius heads posteriorly
                    if st > 0:
                        dy += 0.0022 * cw * math.exp(-((ct / 0.25) ** 2)) * st
                    else:
                        twin = math.exp(-(((ct - 0.38) / 0.30) ** 2)) + math.exp(-(((ct + 0.38) / 0.30) ** 2))
                        dy -= 0.0035 * cw * twin * (-st)
                return dx, dy

            leg_stations.append((c_shifted, lat_ax, f_ax, leg_prof))

        build_loft_from_stations(
            mc,
            f"Leg_Continuous_{side}",
            leg_stations,
            "legging",
            radial_segs=r_segs_limb,
            cap_start=0.022,
            cap_end=0.008,
            subsurf_levels=subsurf,
        )
        build_sculpted_grip_foot(mc, side, hp, knee, ankle, k_bend, ant_n, subsurf)

    # 4) Continuous Deltoid-to-Wrist Muscle-Contoured Arm Loft + Palmar-Arch 5-Digit Hand
    for side, sh, hd, epole in [
        ("L", l_sh, l_hand, Vector(rig["lElbowPole"])),
        ("R", r_sh, r_hand, Vector(rig["rElbowPole"])),
    ]:
        elb, wr, e_bend = solve_2bone_ik_with_bend(sh, hd, 0.28, 0.26, epole)
        sh_embed = chest.lerp(sh, 0.84)
        arm_stations = []
        arm_profile_table = [
            (0.00, 0.048, 0.046),
            (0.11, 0.047, 0.045),
            (0.27, 0.039, 0.042),
            (0.44, 0.035, 0.036),
            (0.50, 0.035, 0.035),
            (0.61, 0.036, 0.034),
            (0.78, 0.029, 0.026),
            (0.93, 0.024, 0.019),
            (1.00, 0.023, 0.018),
        ]
        for s_val, rx_a, ry_a in arm_profile_table:
            pt, tan = sample_rounded_2seg_chain(sh_embed, elb, wr, s_val, corner_blend=0.14)
            f_ax = e_bend - tan * e_bend.dot(tan)
            if f_ax.length < 1e-4:
                f_ax = tan.cross(sp_up)
            f_ax.normalize()
            lat_ax = f_ax.cross(tan).normalized()
            elb_w = math.exp(-(((s_val - 0.50) / 0.05) ** 2))

            def arm_prof(th, a=rx_a, b=ry_a, ew=elb_w):
                ct, st = math.cos(th), math.sin(th)
                olecranon = -0.0026 * ew * math.exp(-((ct / 0.30) ** 2)) * max(0.0, -st)
                return ct * a, st * b + olecranon

            arm_stations.append((pt, lat_ax, f_ax, arm_prof))

        build_loft_from_stations(
            mc,
            f"Arm_Continuous_{side}",
            arm_stations,
            "skin",
            radial_segs=12 if mc.glb_mode else 16,
            cap_start=0.020,
            cap_end=0.008,
            subsurf_levels=subsurf,
        )
        forearm_dir = (wr - elb).normalized() if (wr - elb).length > 1e-4 else ant_n
        build_sculpted_hand(mc, side, wr, forearm_dir, body_right, ant_n, supinate_up=bool(rig.get("supinatePalms")))


# ==============================================================================
# 4. INDUSTRIAL STUDIO APPARATUS & 3D PROP KIT BUILDERS
# ==============================================================================

def add_c_channel_rail(mc: MeshCollector, name: str, x_len: float, center_y: float, center_z: float, open_dir_y: float):
    """
    True Extruded Anodized Aluminum C-Channel Track (`[` cross-section) for the Studio Reformer!
    Constructed with exact quad strip topology (zero concave N-gons, 0 boundary edges).
    """
    hw = 0.011   # half Y depth (total 22mm)
    hh = 0.017   # half Z height (total 34mm)
    tw = 0.0045  # wall/web thickness
    lip = 0.0055 # roller retention lip height
    s = 1.0 if open_dir_y > 0 else -1.0

    # Paired outer & inner 6-point C-contour in (Y_local, Z_local) -> 5 pure convex quads per cap!
    pts_outer = [
        (s * hw, hh - lip),
        (s * hw, hh),
        (s * (-hw), hh),
        (s * (-hw), -hh),
        (s * hw, -hh),
        (s * hw, -hh + lip),
    ]
    pts_inner = [
        (s * (hw - tw), hh - lip),
        (s * (hw - tw), hh - tw),
        (s * (-hw + tw), hh - tw),
        (s * (-hw + tw), -hh + tw),
        (s * (hw - tw), -hh + tw),
        (s * (hw - tw), -hh + lip),
    ]
    bm = bmesh.new()
    hx = x_len * 0.5
    vo_f = [bm.verts.new((hx, center_y + py, center_z + pz)) for py, pz in pts_outer]
    vi_f = [bm.verts.new((hx, center_y + py, center_z + pz)) for py, pz in pts_inner]
    vo_b = [bm.verts.new((-hx, center_y + py, center_z + pz)) for py, pz in pts_outer]
    vi_b = [bm.verts.new((-hx, center_y + py, center_z + pz)) for py, pz in pts_inner]

    n = len(pts_outer)
    for i in range(n - 1):
        bm.faces.new((vo_f[i], vo_f[i + 1], vi_f[i + 1], vi_f[i]))
        bm.faces.new((vi_b[i], vi_b[i + 1], vo_b[i + 1], vo_b[i]))
        bm.faces.new((vo_b[i], vo_b[i + 1], vo_f[i + 1], vo_f[i]))
        bm.faces.new((vi_f[i], vi_f[i + 1], vi_b[i + 1], vi_b[i]))
    bm.faces.new((vo_f[0], vi_f[0], vi_b[0], vo_b[0]))
    bm.faces.new((vi_f[-1], vo_f[-1], vo_b[-1], vi_b[-1]))
    mc.emit_bmesh(name, bm, "steel", bevel_width=0.0, smooth=False)


def add_four_slot_brass_gearbar_rack(mc: MeshCollector, name: str, center_x: float, center_y: float, base_z: float):
    """CNC-Milled Satin Brass 4-Slot Notched Gearbar Rack Plate (pure x-monotone quad strip, 0 collinear tris)."""
    z_bot = -0.011
    xz_top = [(-0.068, 0.013)]
    for sx in (-0.045, -0.015, 0.015, 0.045):
        xz_top.extend([
            (sx - 0.007, 0.013),
            (sx - 0.0045, 0.001),
            (sx + 0.0045, 0.001),
            (sx + 0.007, 0.013),
        ])
    xz_top.append((0.068, 0.013))

    bm = bmesh.new()
    hy = 0.0055
    vt_l = [bm.verts.new((center_x + lx, center_y - hy, base_z + lz)) for lx, lz in xz_top]
    vb_l = [bm.verts.new((center_x + lx, center_y - hy, base_z + z_bot)) for lx, _ in xz_top]
    vt_r = [bm.verts.new((center_x + lx, center_y + hy, base_z + lz)) for lx, lz in xz_top]
    vb_r = [bm.verts.new((center_x + lx, center_y + hy, base_z + z_bot)) for lx, _ in xz_top]

    n = len(xz_top)
    for i in range(n - 1):
        bm.faces.new((vb_l[i], vb_l[i + 1], vt_l[i + 1], vt_l[i]))
        bm.faces.new((vt_r[i], vt_r[i + 1], vb_r[i + 1], vb_r[i]))
        bm.faces.new((vt_l[i], vt_l[i + 1], vt_r[i + 1], vt_r[i]))
        bm.faces.new((vb_r[i], vb_r[i + 1], vb_l[i + 1], vb_l[i]))
    bm.faces.new((vb_l[0], vt_l[0], vt_r[0], vb_r[0]))
    bm.faces.new((vt_l[-1], vb_l[-1], vb_r[-1], vt_r[-1]))
    mc.emit_bmesh(name, bm, "brass", bevel_width=0.0, smooth=False)


def add_double_loop_strap(mc: MeshCollector, name: str, anchor_pt: Vector, forward_dir: Vector, side_axis: Vector):
    """
    Authentic Reformer Double-Loop Cotton/Leather Strap:
    Brass D-Ring + Saddle-Leather Stitched Tab + Short Inner Hand Loop + Long Outer Foot Loop.
    """
    fwd = forward_dir.normalized()
    lat = side_axis.normalized()
    up = lat.cross(fwd).normalized()

    # Brass D-ring at rope termination
    d_pts = []
    for k in range(12):
        a = 2.0 * math.pi * k / 12
        d_pts.append(anchor_pt + fwd * (0.011 * math.cos(a)) + lat * (0.014 * math.sin(a)))
    add_swept_tube(mc, f"{name}_DRing", d_pts, 0.0032, "brass", closed=True, radial_segs=6)

    # Stitched Saddle-Leather Collar Tab
    tab_c = anchor_pt + fwd * 0.024
    quat = fwd.to_track_quat("X", "Z")
    add_beveled_box(mc, f"{name}_LeatherTab", tab_c, (0.032, 0.026, 0.011), "leather", bevel=0.0, quat=quat)

    # Inner Short Hand Loop + Outer Long Foot Loop
    for loop_tag, loop_len, loop_w, z_drop in [
        ("InnerLoop", 0.135, 0.034, 0.003),
        ("OuterLoop", 0.215, 0.044, -0.004),
    ]:
        l_pts = []
        n_l = 18
        for k in range(n_l):
            a = 2.0 * math.pi * k / n_l
            # Teardrop curve pinched near leather tab (`cos(a) -> -1`) and wide at distal loop (`cos(a) -> +1`)
            u_long = 0.5 * (1.0 + math.cos(a))  # 0 at tab, 1 at tip
            pinch = 0.25 + 0.75 * math.sin(u_long * math.pi * 0.65)
            p = (
                tab_c
                + fwd * (0.012 + u_long * loop_len)
                + lat * (math.sin(a) * loop_w * pinch)
                + up * (z_drop * math.sin(u_long * math.pi))
            )
            l_pts.append(p)
        add_swept_tube(mc, f"{name}_{loop_tag}", l_pts, 0.0046, "strap", closed=True, radial_segs=8)


def add_brass_star_knob(mc: MeshCollector, name: str, center: Vector, shaft_dir: Vector, radius: float = 0.024):
    """5-Lobe Ergonomic Satin Brass Star Clamping Knob (exact star-fan solid, 0 ear-clipping) + Threaded Steel Stud."""
    s_dir = shaft_dir.normalized()
    ref = Vector((0.0, 0.0, 1.0)) if abs(s_dir.z) < 0.9 else Vector((1.0, 0.0, 0.0))
    ax_u = s_dir.cross(ref).normalized()
    ax_v = s_dir.cross(ax_u).normalized()

    bm = bmesh.new()
    n_pts = 25
    hd = 0.0065
    c_f = bm.verts.new(center + s_dir * (hd * 1.18))
    c_b = bm.verts.new(center - s_dir * hd)
    rim_f = []
    rim_b = []
    for k in range(n_pts):
        a = 2.0 * math.pi * k / n_pts
        r = radius * (0.76 + 0.24 * math.cos(5.0 * a))
        radial_vec = ax_u * (math.cos(a) * r) + ax_v * (math.sin(a) * r)
        rim_f.append(bm.verts.new(center + radial_vec + s_dir * hd))
        rim_b.append(bm.verts.new(center + radial_vec - s_dir * hd))
    for k in range(n_pts):
        k2 = (k + 1) % n_pts
        bm.faces.new((c_f, rim_f[k], rim_f[k2]))
        bm.faces.new((c_b, rim_b[k2], rim_b[k]))
        bm.faces.new((rim_b[k], rim_b[k2], rim_f[k2], rim_f[k]))
    mc.emit_bmesh(name + "_StarHead", bm, "brass", smooth=True)
    add_cylinder_rod(mc, name + "_Stud", center, center + s_dir * 0.032, 0.0065, "steel", segs=10)


def add_open_c_frame_panel(mc: MeshCollector, name: str, cx: float, y_pos: float, thickness_y: float = 0.038):
    """
    Smoothly Filleted Open C-Frame Laminated European White-Oak Chair Side Panel!
    100% closed 2-manifold quad strip with rounded outer shoulders and curved inner C-throat.
    """
    bm = bmesh.new()
    x_back = cx - 0.305
    x_front = cx + 0.305
    z_bot = 0.038  # Tenons 4mm into Walnut Base Runner (z = 0..0.042)
    z_top = 0.556  # Tenons 7mm into Chair Seat Cushion (bottom z = 0.549)
    w_spine = 0.118
    h_arm = 0.074

    def arc_pts(ox: float, oz: float, r: float, a0: float, a1: float, n: int) -> list[tuple[float, float]]:
        return [(ox + math.cos(a0 + (a1 - a0) * k / (n - 1)) * r, oz + math.sin(a0 + (a1 - a0) * k / (n - 1)) * r) for k in range(n)]

    r_out = 0.052
    pts_outer = (
        [(x_front, z_top)]
        + arc_pts(x_back + r_out, z_top - r_out, r_out, math.pi * 0.5, math.pi, 5)
        + arc_pts(x_back + r_out, z_bot + r_out, r_out, math.pi, math.pi * 1.5, 5)
        + [(x_front, z_bot)]
    )
    r_in = 0.058
    pts_inner = (
        [(x_front, z_top - h_arm)]
        + arc_pts(x_back + w_spine + r_in, z_top - h_arm - r_in, r_in, math.pi * 0.5, math.pi, 5)
        + arc_pts(x_back + w_spine + r_in, z_bot + h_arm + r_in, r_in, math.pi, math.pi * 1.5, 5)
        + [(x_front, z_bot + h_arm)]
    )

    hy = thickness_y * 0.5
    vo_l = [bm.verts.new((px, y_pos - hy, pz)) for px, pz in pts_outer]
    vi_l = [bm.verts.new((px, y_pos - hy, pz)) for px, pz in pts_inner]
    vo_r = [bm.verts.new((px, y_pos + hy, pz)) for px, pz in pts_outer]
    vi_r = [bm.verts.new((px, y_pos + hy, pz)) for px, pz in pts_inner]

    n = len(pts_outer)
    for i in range(n - 1):
        bm.faces.new((vo_l[i], vo_l[i + 1], vi_l[i + 1], vi_l[i]))
        bm.faces.new((vi_r[i], vi_r[i + 1], vo_r[i + 1], vo_r[i]))
        bm.faces.new((vo_r[i], vo_r[i + 1], vo_l[i + 1], vo_l[i]))
        bm.faces.new((vi_l[i], vi_l[i + 1], vi_r[i + 1], vi_r[i]))
    bm.faces.new((vo_l[0], vi_l[0], vi_r[0], vo_r[0]))
    bm.faces.new((vi_l[-1], vo_l[-1], vo_r[-1], vi_r[-1]))

    mc.emit_bmesh(name, bm, "oak", bevel_width=0.005)


def add_barrel_arch_assembly(mc: MeshCollector, name: str, center, radius: float, width_y: float, thickness: float, arc_deg: float, base_z: float = 0.052):
    cx, cy, cz = center
    segs = 26 if mc.glb_mode else 32
    half_arc = math.radians(arc_deg * 0.5)
    bm = bmesh.new()
    top_l, top_r, bot_l, bot_r = [], [], [], []
    for i in range(segs + 1):
        a = -half_arc + 2.0 * half_arc * i / segs
        xo, zo = cx + math.sin(a) * radius, cz + math.cos(a) * radius
        xi, zi = cx + math.sin(a) * (radius - thickness), cz + math.cos(a) * (radius - thickness)
        top_l.append(bm.verts.new((xo, cy - width_y * 0.5, zo)))
        top_r.append(bm.verts.new((xo, cy + width_y * 0.5, zo)))
        bot_l.append(bm.verts.new((xi, cy - width_y * 0.5, zi)))
        bot_r.append(bm.verts.new((xi, cy + width_y * 0.5, zi)))
    for i in range(segs):
        bm.faces.new((top_l[i], top_l[i + 1], top_r[i + 1], top_r[i]))
        bm.faces.new((bot_r[i], bot_r[i + 1], bot_l[i + 1], bot_l[i]))
        bm.faces.new((bot_l[i], bot_l[i + 1], top_l[i + 1], top_l[i]))
        bm.faces.new((top_r[i], top_r[i + 1], bot_r[i + 1], bot_r[i]))
    bm.faces.new((bot_l[0], top_l[0], top_r[0], bot_r[0]))
    bm.faces.new((bot_r[-1], top_r[-1], top_l[-1], bot_l[-1]))
    mc.emit_bmesh(name + "_Pad", bm, "pad", bevel_width=0.008)

    # Continuous Swept Ivory French Piping along Left & Right Whaleback Arch Edges + Front/Rear Lips
    for sy_tag, sy in [("L", cy - width_y * 0.492), ("R", cy + width_y * 0.492)]:
        arch_pipe_pts = [
            Vector((
                cx + math.sin(-half_arc + 2.0 * half_arc * i / segs) * (radius + 0.002),
                sy,
                cz + math.cos(-half_arc + 2.0 * half_arc * i / segs) * (radius + 0.002),
            ))
            for i in range(segs + 1)
        ]
        add_swept_tube(mc, f"{name}_ArchPipe_{sy_tag}", arch_pipe_pts, 0.0038, "suit_accent", closed=False, radial_segs=8)

    for lip_tag, a_lip in [("Rear", -half_arc), ("Front", half_arc)]:
        xl = cx + math.sin(a_lip) * (radius + 0.002)
        zl = cz + math.cos(a_lip) * (radius + 0.002)
        add_swept_tube(
            mc,
            f"{name}_LipPipe_{lip_tag}",
            [Vector((xl, cy - width_y * 0.49, zl)), Vector((xl, cy + width_y * 0.49, zl))],
            0.0038,
            "suit_accent",
            closed=False,
            radial_segs=8,
        )

    # Sculpted Laminated White-Oak Side Cheeks with Lower Arch Relief + Internal Oak Cross-Ribs
    for sy_tag, sy in [("L", cy - width_y * 0.445), ("R", cy + width_y * 0.445)]:
        bm_c = bmesh.new()
        arc_l, base_l, arc_r, base_r = [], [], [], []
        for i in range(segs + 1):
            u_i = i / segs
            a = -half_arc + 2.0 * half_arc * u_i
            xi = cx + math.sin(a) * (radius - thickness + 0.006)
            zi = max(base_z + 0.03, cz + math.cos(a) * (radius - thickness + 0.006))
            # Sculpted arch cutout along underside of oak cheek (leaving sturdy front & rear feet on carriage rail)
            under_arch = base_z + (0.085 * math.sin(math.pi * max(0.0, min(1.0, (u_i - 0.16) / 0.68))) ** 1.6 if base_z > 0.04 else 0.0)
            arc_l.append(bm_c.verts.new((xi, sy - 0.019, zi)))
            base_l.append(bm_c.verts.new((xi, sy - 0.019, under_arch)))
            arc_r.append(bm_c.verts.new((xi, sy + 0.019, zi)))
            base_r.append(bm_c.verts.new((xi, sy + 0.019, under_arch)))
        for i in range(segs):
            bm_c.faces.new((base_l[i], base_l[i + 1], arc_l[i + 1], arc_l[i]))
            bm_c.faces.new((arc_r[i], arc_r[i + 1], base_r[i + 1], base_r[i]))
            bm_c.faces.new((arc_l[i], arc_l[i + 1], arc_r[i + 1], arc_r[i]))
            bm_c.faces.new((base_r[i], base_r[i + 1], base_l[i + 1], base_l[i]))
        bm_c.faces.new((base_l[0], arc_l[0], arc_r[0], base_r[0]))
        bm_c.faces.new((base_r[-1], arc_r[-1], arc_l[-1], base_l[-1]))
        mc.emit_bmesh(f"{name}_Cheek_{sy_tag}", bm_c, "oak", bevel_width=0.004)

    # Internal Vault Cross-Stretchers uniting the two Oak Cheeks
    for a_rib in (-half_arc * 0.52, half_arc * 0.52):
        xr = cx + math.sin(a_rib) * (radius - thickness - 0.04)
        zr = max(base_z + 0.08, cz + math.cos(a_rib) * (radius - thickness - 0.04))
        add_cylinder_rod(mc, f"{name}_VaultRib_{a_rib:.2f}", (xr, cy - width_y * 0.45, zr), (xr, cy + width_y * 0.45, zr), 0.016, "oak", segs=12)


def add_sculpted_magic_circle(mc: MeshCollector, center: Vector, resting_horizontal: bool = True):
    """
    Sculpted 3D Pilates Magic Circle:
    - Flat-band Spring-Steel / Fiberglass Ring (`major_r = 0.178`)
    - Riveted Satin Brass Clamp Sleeves
    - Dual Opposing Molded Crescent Inner & Outer EVA Grip Pads
    When `resting_horizontal=True`, lies flat beside the mat with outer pads grounded at `Z = 0.0`!
    """
    major_r = 0.178
    if resting_horizontal:
        # Outer crescent pads have height 0.054 -> center Z = 0.027 grounds pads flush at Z = 0.0!
        rc = Vector((center.x, center.y, 0.027))
        add_torus(mc, "MagicCircle_SpringRing", rc, major_r, 0.0042, "steel", axis="Z", segs=36, tsegs=10, minor_axial_r=0.014)
        for sign, tag in [(-1.0, "L"), (1.0, "R")]:
            # Opposing pads along X so entire circle stays clear of mat edge along Y!
            # Brass collar sleeve wrapping ring
            add_beveled_box(mc, f"McBrassSleeve_{tag}", (rc.x + sign * major_r, rc.y, rc.z), (0.018, 0.040, 0.034), "brass", bevel=0.0)
            # Ergonomic curved outer & inner crescent pads in XY plane (pure quad-strip crescent, 0 N-gons)
            for is_outer, pad_tag, r_mid, thk, span_deg, z_half in [
                (True, "OuterPad", major_r + 0.015, 0.018, 28.0, 0.027),
                (False, "InnerPad", major_r - 0.015, 0.016, 25.0, 0.025),
            ]:
                half_a = math.radians(span_deg * 0.5)
                base_a = 0.0 if sign > 0 else math.pi
                bm_pad = bmesh.new()
                n_arc = 9
                zc = z_half if is_outer else rc.z
                vo_t, vi_t, vo_b, vi_b = [], [], [], []
                for k in range(n_arc):
                    u_k = k / (n_arc - 1)
                    a = base_a - half_a + 2.0 * half_a * u_k
                    taper = 0.55 + 0.45 * math.sin(math.pi * u_k)
                    ro = r_mid + (thk * 0.5 * taper)
                    ri = r_mid - (thk * 0.5 * taper)
                    xo, yo = rc.x + math.cos(a) * ro, rc.y + math.sin(a) * ro
                    xi, yi = rc.x + math.cos(a) * ri, rc.y + math.sin(a) * ri
                    vo_t.append(bm_pad.verts.new((xo, yo, zc + z_half)))
                    vi_t.append(bm_pad.verts.new((xi, yi, zc + z_half)))
                    vo_b.append(bm_pad.verts.new((xo, yo, zc - z_half)))
                    vi_b.append(bm_pad.verts.new((xi, yi, zc - z_half)))
                for k in range(n_arc - 1):
                    bm_pad.faces.new((vi_t[k], vi_t[k + 1], vo_t[k + 1], vo_t[k]))
                    bm_pad.faces.new((vo_b[k], vo_b[k + 1], vi_b[k + 1], vi_b[k]))
                    bm_pad.faces.new((vo_b[k], vo_b[k + 1], vo_t[k + 1], vo_t[k]))
                    bm_pad.faces.new((vi_t[k], vi_t[k + 1], vi_b[k + 1], vi_b[k]))
                bm_pad.faces.new((vi_b[0], vi_t[0], vo_t[0], vo_b[0]))
                bm_pad.faces.new((vo_b[-1], vo_t[-1], vi_t[-1], vi_b[-1]))
                mc.emit_bmesh(f"Mc_{pad_tag}_{tag}", bm_pad, "charcoal", bevel_width=0.003, smooth=True)
    else:
        add_torus(mc, "MagicCircle_SpringRing", center, major_r, 0.0045, "steel", axis="X", segs=32, tsegs=10, minor_axial_r=0.013)
        for sign, tag in [(-1.0, "L"), (1.0, "R")]:
            add_beveled_box(mc, f"McBrassSleeve_{tag}", (center.x, center.y + sign * major_r, center.z), (0.032, 0.018, 0.038), "brass", bevel=0.0)
            add_beveled_box(mc, f"McOuterPad_{tag}", (center.x, center.y + sign * (major_r + 0.015), center.z), (0.046, 0.020, 0.104), "charcoal", bevel=0.005)
            add_beveled_box(mc, f"McInnerPad_{tag}", (center.x, center.y + sign * (major_r - 0.015), center.z), (0.042, 0.018, 0.092), "charcoal", bevel=0.005)


def add_beveled_eva_foam_roller(mc: MeshCollector, center_y: float):
    """
    3D EVA Studio Foam Roller with 45-degree Beveled Shoulders, Tactile Grip Grooves & Recessed End-Caps.
    Outer radius = 0.068m at `cz = 0.068m` -> grounded flush at `Z = 0.0`!
    """
    cz = 0.068
    r_outer = 0.068
    ax_x = Vector((0.0, 1.0, 0.0))
    ax_z = Vector((0.0, 0.0, 1.0))

    # Multi-station lathe loft along X in [-0.45, +0.45]
    roller_profile = [
        (-0.450, 0.051),
        (-0.442, 0.057),
        (-0.424, r_outer),  # Crisp 45-deg beveled shoulder
        (-0.260, r_outer),
        (-0.248, r_outer - 0.0028),  # Tactile EVA grip groove 1
        (-0.236, r_outer),
        (-0.012, r_outer),
        (0.000, r_outer - 0.0028),   # Center alignment groove
        (0.012, r_outer),
        (0.236, r_outer),
        (0.248, r_outer - 0.0028),   # Tactile EVA grip groove 2
        (0.260, r_outer),
        (0.424, r_outer),   # Crisp 45-deg beveled shoulder
        (0.442, 0.057),
        (0.450, 0.051),
    ]
    stations = [
        (Vector((x_p, center_y, cz)), ax_x, ax_z, lambda th, rad=r_p: (math.cos(th) * rad, math.sin(th) * rad))
        for x_p, r_p in roller_profile
    ]
    build_loft_from_stations(
        mc,
        "FoamRoller_EVABody",
        stations,
        "pad",
        radial_segs=24,
        cap_start=0.004,
        cap_end=0.004,
        subsurf_levels=0,
    )
    # Recessed Beveled Ivory End-Cap Medallions + Brass Center Boss
    for sign, tag in [(-1.0, "L"), (1.0, "R")]:
        x_in = sign * 0.446
        x_out = sign * 0.458
        add_cylinder_rod(mc, f"FoamRoller_EndCap_{tag}", (x_in, center_y, cz), (x_out, center_y, cz), 0.054, "suit_accent", segs=22, r2=0.046 if sign > 0 else 0.054)
        add_cylinder_rod(mc, f"FoamRoller_Boss_{tag}", (sign * 0.454, center_y, cz), (sign * 0.461, center_y, cz), 0.014, "brass", segs=14)


def add_matte_sage_mini_ball(mc: MeshCollector, center_xy: tuple[float, float]):
    """
    3D Matte Sage Mini-Ball (`radius = 0.095m`) with weighted floor contact patch at `Z = 0.0`
    and recessed ivory inflation valve plug on top.
    """
    bx, by = center_xy
    r = 0.095
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=16, radius=r)
    for v in bm.verts:
        # Subtle weighted floor contact patch so min Z sits cleanly at Z = 0.0
        z_world = v.co.z + (r - 0.0015)
        if z_world < 0.0:
            z_world = 0.0
        v.co = (bx + v.co.x, by + v.co.y, z_world)
    mc.emit_bmesh("MiniBall_MatteSage", bm, "ball", subsurf_levels=0)
    add_cylinder_rod(mc, "MiniBall_ValvePlug", (bx, by, 2.0 * r - 0.006), (bx, by, 2.0 * r - 0.001), 0.009, "suit_accent", segs=12)


def build_apparatus_and_props(mc: MeshCollector, ex: dict, rig: dict):
    app = ex["apparatus"]
    props = ex.get("props") or []
    l_foot = Vector(rig["lFoot"])
    r_foot = Vector(rig["rFoot"])
    l_hand = Vector(rig["lHand"])
    r_hand = Vector(rig["rHand"])

    if app == "reformer":
        cx = rig.get("carriageX", 0.12)
        # 1) European White-Oak Rails + True Extruded Aluminum C-Channel Tracks + Walnut Corner Splines + Brass Bolts
        for sy_tag, sy, open_dir in [("L", -0.30, 1.0), ("R", 0.30, -1.0)]:
            add_beveled_box(mc, f"RefRail_{sy_tag}", (0.0, sy, 0.31), (2.34, 0.048, 0.125), "oak", bevel=0.009)
            track_y = -0.266 if sy < 0 else 0.266
            add_c_channel_rail(mc, f"RefCChannelTrack_{sy_tag}", 2.18, track_y, 0.332, open_dir)
        add_beveled_box(mc, "RefEndRear", (-1.15, 0.0, 0.31), (0.052, 0.648, 0.125), "oak", bevel=0.009)
        add_beveled_box(mc, "RefEndFront", (1.15, 0.0, 0.31), (0.052, 0.648, 0.125), "oak", bevel=0.009)
        for sx in (-1.15, 1.15):
            for sy in (-0.302, 0.302):
                add_beveled_box(mc, f"RefCornerSpline_{sx}_{sy}", (sx, sy, 0.31), (0.058, 0.054, 0.129), "walnut", bevel=0.006)
                add_ellipsoid(mc, f"RefBolt_{sx}_{sy}", (sx * 1.018, sy, 0.31), 0.006, 0.009, 0.009, "brass", u_seg=10, v_seg=8)

        # 2) Turned Tapered Oak Legs tenoned into Rails + Satin Brass Leveling Ferrules grounded at Z = 0.0
        for sx in (-1.08, 1.08):
            for sy in (-0.28, 0.28):
                add_cylinder_rod(mc, f"RefLeg_{sx}_{sy}", (sx, sy, 0.036), (sx, sy, 0.266), 0.027, "oak", segs=16, r2=0.033)
                add_cylinder_rod(mc, f"RefFerrule_{sx}_{sy}", (sx, sy, 0.0), (sx, sy, 0.042), 0.029, "brass", segs=16, r2=0.028)

        # 3) Standing Platform + 4-Slot Brass Gearbar Racks + Gear Crossbar + Carriage Stopper Blocks
        add_beveled_box(mc, "RefStandDeck", (1.04, 0.0, 0.368), (0.19, 0.58, 0.024), "walnut", bevel=0.005)
        add_beveled_box(mc, "RefStandGrip", (1.04, 0.0, 0.383), (0.16, 0.53, 0.010), "charcoal", bevel=0.003)
        for sy_tag, gy in [("L", -0.253), ("R", 0.253)]:
            add_four_slot_brass_gearbar_rack(mc, f"RefBrassGearRack_{sy_tag}", 0.885, gy, 0.326)
            # Rubber & Brass Carriage Stopper Block mounted in track
            add_beveled_box(mc, f"RefStopperBlock_{sy_tag}", (0.76, gy, 0.332), (0.034, 0.024, 0.026), "charcoal", bevel=0.0)
            add_cylinder_rod(mc, f"RefStopperPin_{sy_tag}", (0.76, gy, 0.318), (0.76, gy, 0.352), 0.005, "brass", segs=8)
        # Gearbar Cross-Rod seated in Slot #1 (x = 0.885 + 0.045 = 0.930)
        gear_x = 0.930
        add_cylinder_rod(mc, "RefGearBarCross", (gear_x, -0.262, 0.330), (gear_x, 0.262, 0.330), 0.010, "brass", segs=12)

        # 4) Wheeled Carriage Chassis + 4 C-Channel Roller Wheels + Piped Cushion + Headrest + Shoulder Blocks
        add_beveled_box(mc, "CarriageChassis", (cx + 0.08, 0.0, 0.352), (0.79, 0.52, 0.026), "walnut", bevel=0.005)
        for wx_off in (-0.26, 0.38):
            for sy_tag, wy in [("L", -0.263), ("R", 0.263)]:
                add_cylinder_rod(
                    mc, f"CarriageWheel_{wx_off}_{sy_tag}",
                    (cx + wx_off, wy - 0.005, 0.332), (cx + wx_off, wy + 0.005, 0.332),
                    0.012, "charcoal", segs=12,
                )
                add_beveled_box(mc, f"WheelHanger_{wx_off}_{sy_tag}", (cx + wx_off, wy * 0.94, 0.342), (0.028, 0.020, 0.022), "steel", bevel=0.0)
        add_piped_cushion(mc, "CarriagePad", (cx + 0.08, 0.0, 0.390), (0.76, 0.535, 0.056))
        hr_lift = 0.034 if ex.get("headrest") == "up" else 0.0
        add_piped_cushion(mc, "RefHeadrest", (cx - 0.385, 0.0, 0.396 + hr_lift * 0.5), (0.155, 0.235, 0.044 + hr_lift))
        for sy_tag, sy in [("L", -0.138), ("R", 0.138)]:
            add_cylinder_rod(mc, f"ShPost_{sy_tag}", (cx - 0.22, sy, 0.38), (cx - 0.22, sy, 0.48), 0.011, "steel", segs=10)
            add_cylinder_rod(mc, f"ShStrapPeg_{sy_tag}", (cx - 0.238, sy * 1.30, 0.38), (cx - 0.238, sy * 1.30, 0.455), 0.006, "brass", segs=10)
            add_piped_cushion(mc, f"ShBlock_{sy_tag}", (cx - 0.195, sy, 0.474), (0.068, 0.098, 0.108))

        # 5) Boxes / Jumpboard / Locking Footbar with Quadrant Plates
        if rig.get("withLongbox") or ex.get("box") == "long-box":
            add_piped_cushion(mc, "LongBox", (cx + 0.06, 0.0, 0.528), (0.69, 0.395, 0.22))
        elif rig.get("withShortbox") or ex.get("box") == "short-box":
            add_piped_cushion(mc, "ShortBox", (cx + 0.08, 0.0, 0.528), (0.43, 0.545, 0.22))

        if rig.get("withJumpboard"):
            add_beveled_box(mc, "JumpFrame", (0.98, 0.0, 0.60), (0.030, 0.54, 0.50), "oak", bevel=0.008)
            add_piped_cushion(mc, "JumpPad", (0.962, 0.0, 0.61), (0.036, 0.51, 0.46))
        elif ex.get("footbar") not in ("down", "none"):
            fb_z = 0.48 if ex.get("footbar") == "low" else (0.53 if ex.get("footbar") == "mid" else 0.575)
            fb_x = 0.88 if ex.get("footbar") == "low" else (0.85 if ex.get("footbar") == "mid" else 0.825)
            for sy in (-0.282, 0.282):
                add_cylinder_rod(mc, f"FbArm_{sy}", (0.955, sy, 0.335), (fb_x, sy, fb_z), 0.013, "steel", segs=12)
                add_ellipsoid(mc, f"FbKnob_{sy}", (0.955, sy * 1.08, 0.335), 0.016, 0.012, 0.016, "brass", u_seg=10, v_seg=8)
            add_cylinder_rod(mc, "FbCore", (fb_x, -0.282, fb_z), (fb_x, 0.282, fb_z), 0.015, "steel", segs=12)
            add_cylinder_rod(mc, "FbPadGrip", (fb_x, -0.255, fb_z), (fb_x, 0.255, fb_z), 0.022, "charcoal", segs=16)

        # 6) Carriage Under-Mount Spring Anchor Bracket + 4 Color-Coded Helical Coil Springs (2 Red, 1 Blue, 1 Gold)
        sp_anchor_x = cx + 0.455
        add_beveled_box(mc, "CarriageSpringBracket", (sp_anchor_x - 0.015, 0.0, 0.338), (0.032, 0.26, 0.026), "steel", bevel=0.0)
        for idx, (sy, sm) in enumerate([(-0.09, "spring_red"), (-0.03, "spring_red"), (0.03, "spring_blue"), (0.09, "spring_gold")]):
            add_ellipsoid(mc, f"GearHook_{idx}", (gear_x, sy, 0.336), 0.009, 0.007, 0.012, "brass", u_seg=8, v_seg=6)
            add_helical_spring_mesh(mc, f"RefSpring_{idx}", (sp_anchor_x, sy, 0.332), (gear_x - 0.006, sy, 0.332), sm, coils=11, max_coil_len=None)

        # 7) Rear Riser Posts + Swivel Brass Pulleys + Ropes + Double-Loop Cotton/Leather Straps
        for sy_tag, ry in [("L", -0.28), ("R", 0.28)]:
            add_cylinder_rod(mc, f"RiserPost_{sy_tag}", (-1.13, ry, 0.35), (-1.13, ry, 0.665), 0.013, "steel", segs=12)
            add_cylinder_rod(mc, f"RiserCollar_{sy_tag}", (-1.13, ry, 0.42), (-1.13, ry, 0.455), 0.017, "brass", segs=12)
            add_ellipsoid(mc, f"RiserFinial_{sy_tag}", (-1.13, ry, 0.672), 0.016, 0.016, 0.012, "brass", u_seg=10, v_seg=8)
            add_beveled_box(mc, f"PulleyClevis_{sy_tag}", (-1.112, ry, 0.64), (0.032, 0.018, 0.022), "brass", bevel=0.0)
            add_torus(mc, f"PulleyWheel_{sy_tag}", (-1.092, ry, 0.64), 0.022, 0.006, "brass", axis="Y", segs=16, tsegs=8)

        if rig.get("ropeToFeet"):
            for side_t, ry, tgt in [("L", -0.275, l_foot), ("R", 0.275, r_foot)]:
                p0 = Vector((-1.092, ry, 0.64))
                fdir = (tgt - p0).normalized()
                anchor = tgt - fdir * 0.16
                add_swept_tube(mc, f"RopeF_{side_t}", [p0, p0.lerp(anchor, 0.5), anchor], 0.0038, "strap", closed=False, radial_segs=8)
                add_double_loop_strap(mc, f"StrapF_{side_t}", anchor, fdir, Vector((0.0, 1.0, 0.0)))
        elif rig.get("ropeToHands"):
            for side_t, ry, tgt in [("L", -0.275, l_hand), ("R", 0.275, r_hand)]:
                p0 = Vector((-1.092, ry, 0.64))
                fdir = (tgt - p0).normalized()
                anchor = tgt - fdir * 0.15
                add_swept_tube(mc, f"RopeH_{side_t}", [p0, p0.lerp(anchor, 0.5), anchor], 0.0038, "strap", closed=False, radial_segs=8)
                add_double_loop_strap(mc, f"StrapH_{side_t}", anchor, fdir, Vector((0.0, 1.0, 0.0)))
        else:
            # Docked Riser Ropes & Double-Loop Cotton/Leather Straps Resting on Carriage Shoulder Pegs!
            for side_t, ry, peg_y in [("L", -0.275, -0.179), ("R", 0.275, 0.179)]:
                p_pulley = Vector((-1.092, ry, 0.64))
                p_mid = Vector(((cx - 0.24 - 1.092) * 0.5, (ry + peg_y) * 0.5, 0.51))
                p_peg = Vector((cx - 0.238, peg_y, 0.448))
                add_swept_tube(mc, f"DockedRope_{side_t}", [p_pulley, p_mid, p_peg], 0.0038, "strap", closed=False, radial_segs=8)
                add_double_loop_strap(
                    mc,
                    f"DockedDoubleLoop_{side_t}",
                    p_peg,
                    Vector((-0.96, 0.0, -0.16)).normalized(),
                    Vector((0.0, 1.0 if peg_y > 0 else -1.0, 0.18)).normalized(),
                )

    elif app == "cadillac":
        # 1) White-Oak Trapeze Table + Lower H-Stretcher Rails + French-Piped Sage Mattress
        add_piped_cushion(mc, "CadMattress", (0.0, 0.0, 0.545), (2.08, 0.64, 0.066))
        for sy in (-0.32, 0.32):
            add_beveled_box(mc, f"CadRail_{sy}", (0.0, sy, 0.475), (2.14, 0.046, 0.094), "oak", bevel=0.008)
            add_cylinder_rod(mc, f"CadStretcher_{sy}", (-1.05, sy, 0.14), (1.05, sy, 0.14), 0.018, "oak", segs=12)
        for sx in (-1.05, 1.05):
            add_beveled_box(mc, f"CadEnd_{sx}", (sx, 0.0, 0.475), (0.048, 0.686, 0.094), "oak", bevel=0.008)
            add_cylinder_rod(mc, f"CadCrossStretcher_{sx}", (sx, -0.32, 0.14), (sx, 0.32, 0.14), 0.018, "oak", segs=12)

        # 2) 4 Stainless Canopy Uprights + Flanged 3-Way Brass Corner Castings + Sliding Crossbars
        for sx in (-1.05, 1.05):
            for sy in (-0.31, 0.31):
                add_cylinder_rod(mc, f"CadLeg_{sx}_{sy}", (sx, sy, 0.036), (sx, sy, 0.45), 0.030, "oak", segs=16)
                add_cylinder_rod(mc, f"CadFerrule_{sx}_{sy}", (sx, sy, 0.0), (sx, sy, 0.040), 0.032, "brass", segs=16)
                add_cylinder_rod(mc, f"CadPost_{sx}_{sy}", (sx, sy, 0.50), (sx, sy, 1.95), 0.016, "steel", segs=14)
                add_beveled_box(mc, f"CadFlangeBot_{sx}_{sy}", (sx, sy, 0.515), (0.050, 0.050, 0.034), "brass", bevel=0.0)
                # 3-Way Flanged Brass Corner Casting (central block + 3 socket sleeves)
                add_beveled_box(mc, f"CadCornerCast_{sx}_{sy}", (sx, sy, 1.95), (0.048, 0.048, 0.048), "brass", bevel=0.0)
                in_x = -0.034 if sx > 0 else 0.034
                in_y = -0.034 if sy > 0 else 0.034
                add_cylinder_rod(mc, f"CadCastSlvZ_{sx}_{sy}", (sx, sy, 1.905), (sx, sy, 1.945), 0.021, "brass", segs=12)
                add_cylinder_rod(mc, f"CadCastSlvX_{sx}_{sy}", (sx, sy, 1.95), (sx + in_x, sy, 1.95), 0.020, "brass", segs=12)
                add_cylinder_rod(mc, f"CadCastSlvY_{sx}_{sy}", (sx, sy, 1.95), (sx, sy + in_y, 1.95), 0.020, "brass", segs=12)

        for sy in (-0.31, 0.31):
            add_cylinder_rod(mc, f"CadCanopyRail_{sy}", (-1.05, sy, 1.95), (1.05, sy, 1.95), 0.015, "steel", segs=14)
        for sx in (-1.05, -0.66, -0.34, 0.20, 1.05):
            add_cylinder_rod(mc, f"CadCross_{sx}", (sx, -0.31, 1.95), (sx, 0.31, 1.95), 0.014, "steel", segs=12)
            if sx in (-0.66, -0.34, 0.20):
                for sy in (-0.31, 0.31):
                    add_beveled_box(mc, f"CadSlider_{sx}_{sy}", (sx, sy, 1.95), (0.038, 0.038, 0.038), "brass", bevel=0.0)
                    add_ellipsoid(mc, f"CadThumbScrew_{sx}_{sy}", (sx, sy * 1.08, 1.95), 0.011, 0.008, 0.011, "brass", u_seg=8, v_seg=6)

        # 3) Plush Ribbed Ivory Sheepskin Fuzzy Hanging Loops
        for sy_tag, sy in [("L", -0.19), ("R", 0.19)]:
            add_cylinder_rod(mc, f"FuzzyWeb_{sy_tag}", (0.20, sy, 1.95), (0.20, sy, 1.63), 0.005, "strap", segs=8)
            add_torus(mc, f"FuzzyDRing_{sy_tag}", (0.20, sy, 1.62), 0.016, 0.0035, "brass", axis="X", segs=12, tsegs=6)
            # Quilted multi-lobe plush fleece cuff loft
            fleece_stations = []
            for u_f, r_f in [(0.0, 0.022), (0.18, 0.030), (0.50, 0.032), (0.82, 0.030), (1.0, 0.022)]:
                zf = 1.44 + u_f * 0.17

                def fleece_prof(th, r0=r_f):
                    tuft = 1.0 + 0.08 * math.cos(8.0 * th)
                    return math.cos(th) * r0 * tuft, math.sin(th) * r0 * tuft

                fleece_stations.append((Vector((0.20, sy, zf)), Vector((1, 0, 0)), Vector((0, 1, 0)), fleece_prof))
            build_loft_from_stations(mc, f"FuzzyFleeceCuff_{sy_tag}", fleece_stations, "sock", radial_segs=16, cap_start=0.006, cap_end=0.006, subsurf_levels=0)
            add_torus(mc, f"FuzzyLoop_{sy_tag}", (0.20, sy, 1.41), 0.034, 0.007, "strap", axis="X", segs=14, tsegs=6)

        # 4) Trapeze Bar + Twin Overhead Helical Springs + Padded Trapeze Strap (at sliding crossbar x = -0.34)
        trap_x, trap_z = -0.34, 1.52
        add_cylinder_rod(mc, "TrapezeBarCore", (trap_x, -0.25, trap_z), (trap_x, 0.25, trap_z), 0.015, "maple", segs=14)
        add_cylinder_rod(mc, "TrapezeBarPad", (trap_x, -0.19, trap_z), (trap_x, 0.19, trap_z), 0.020, "charcoal", segs=14)
        for sy_tag, sy in [("L", -0.22), ("R", 0.22)]:
            add_torus(mc, f"TrapEyeTop_{sy_tag}", (trap_x, sy, 1.935), 0.014, 0.0035, "brass", axis="Y", segs=10, tsegs=6)
            add_torus(mc, f"TrapEyeBot_{sy_tag}", (trap_x, sy, trap_z + 0.016), 0.015, 0.0035, "brass", axis="Y", segs=10, tsegs=6)
            add_helical_spring_mesh(mc, f"TrapezeSpring_{sy_tag}", (trap_x, sy, 1.93), (trap_x, sy, trap_z + 0.02), "spring_blue", coils=11, max_coil_len=None)
        trap_strap_pts = [
            Vector((trap_x, -0.11, trap_z)),
            Vector((trap_x, -0.09, trap_z - 0.12)),
            Vector((trap_x, 0.0, trap_z - 0.16)),
            Vector((trap_x, 0.09, trap_z - 0.12)),
            Vector((trap_x, 0.11, trap_z)),
        ]
        add_swept_tube(mc, "TrapezeCenterStrap", trap_strap_pts, 0.006, "leather", closed=False, radial_segs=8)

        # 5) Hard Rock Maple Roll-Back Bar + Satin Brass Eye-Caps + Gold Helical Springs
        if rig.get("rolldownBar"):
            bx, bz = rig["rolldownBar"]
            anch_x = rig.get("rolldownBarAnchorX", 1.05)
            add_cylinder_rod(mc, "RollBackMapleBar", (bx, -0.27, bz), (bx, 0.27, bz), 0.017, "maple", segs=16)
            for sy_tag, sy in [("L", -0.255), ("R", 0.255)]:
                add_cylinder_rod(mc, f"RdbBrassCap_{sy_tag}", (bx, sy, bz), (bx, sy + (0.018 if sy > 0 else -0.018), bz), 0.0185, "brass", segs=12)
                add_torus(mc, f"RdbEye_{sy_tag}", (bx, sy * 0.94, bz), 0.020, 0.004, "brass", axis="Y", segs=12, tsegs=6)
                add_beveled_box(mc, f"RdbPostCollar_{sy_tag}", (anch_x, sy * 1.215, 1.74), (0.036, 0.036, 0.032), "brass", bevel=0.0)
                add_helical_spring_mesh(mc, f"RdbSpring_{sy_tag}", (anch_x, sy, 1.74), (bx, sy * 0.94, bz), "spring_gold", max_coil_len=0.40)

        # 6) 3-Sided Push-Through Bar + Saddle Leather Safety Strap with Brass Buckle + Tension Spring
        if rig.get("pushthroughDeg") is not None:
            rad = math.radians(rig["pushthroughDeg"])
            piv_x, end_anch_x = 0.62, 1.05
            ex_x = piv_x - math.sin(rad) * 0.66
            ez_z = 1.94 - math.cos(rad) * 0.66
        else:
            # Stowed safely overhead at the -X tower end with Saddle Leather Safety Strap!
            piv_x, end_anch_x = -0.66, -1.05
            ex_x, ez_z = -0.96, 1.54

        for sy_tag, sy in [("L", -0.27), ("R", 0.27)]:
            add_cylinder_rod(mc, f"PtbSide_{sy_tag}", (piv_x, sy, 1.94), (ex_x, sy, ez_z), 0.013, "steel", segs=12)
            add_ellipsoid(mc, f"PtbElbow_{sy_tag}", (ex_x, sy, ez_z), 0.016, 0.016, 0.016, "steel", u_seg=10, v_seg=8)
        add_cylinder_rod(mc, "PtbCrossCore", (ex_x, -0.27, ez_z), (ex_x, 0.27, ez_z), 0.014, "steel", segs=12)
        add_cylinder_rod(mc, "PtbCrossGrip", (ex_x, -0.20, ez_z), (ex_x, 0.20, ez_z), 0.019, "charcoal", segs=14)

        # Saddle Tan Leather Safety Strap Loop + Brass Buckle & Symmetric Overhead Tension Spring on Push-Through Crossbar
        s_top = Vector((end_anch_x, -0.12, 1.95))
        s_bot = Vector((ex_x, -0.12, ez_z))
        s_mid = s_top.lerp(s_bot, 0.48)
        strap_loop_pts = [
            s_top + Vector((0.0, 0.0, 0.020)),
            s_mid + Vector((0.016, 0.0, 0.0)),
            s_bot - Vector((0.0, 0.0, 0.022)),
            s_mid - Vector((0.016, 0.0, 0.0)),
        ]
        add_swept_tube(mc, "PtbLeatherSafetyStrap", strap_loop_pts, 0.0055, "leather", closed=True, radial_segs=8)
        add_beveled_box(mc, "PtbSafetyBuckle", s_mid + Vector((0.016, 0.0, 0.0)), (0.018, 0.022, 0.028), "brass", bevel=0.0)
        add_torus(mc, "PtbSpringEye", (ex_x, 0.12, ez_z + 0.016), 0.015, 0.0035, "brass", axis="Y", segs=10, tsegs=6)
        add_helical_spring_mesh(
            mc, "PtbTensionSpring",
            (end_anch_x, 0.12, 1.94),
            (ex_x, 0.12, ez_z + 0.018),
            "spring_red", coils=11, max_coil_len=0.38,
        )

        if rig.get("legSprings"):
            for sy, ft in [(-0.24, l_foot), (0.24, r_foot)]:
                add_helical_spring_mesh(mc, f"CadLegSp_{sy}", (-1.05, sy, 1.54), ft, "spring_gold", max_coil_len=0.42)
                add_torus(mc, f"CadLegLoop_{sy}", ft, 0.036, 0.0055, "strap", axis="Y", segs=14, tsegs=6)
        elif rig.get("sideLegSpring"):
            t_f = r_foot if rig["sideLegSpring"] == "right" else l_foot
            add_helical_spring_mesh(mc, "CadSideLegSp", (-1.05, -0.14, 1.48), t_f, "spring_gold", max_coil_len=0.42)
            add_torus(mc, "CadSideLegLoop", t_f, 0.036, 0.0055, "strap", axis="Y", segs=14, tsegs=6)

        if rig.get("armSpringsFrom"):
            ax, az = rig["armSpringsFrom"]
            for sy, hd in [(-0.26, l_hand), (0.26, r_hand)]:
                add_helical_spring_mesh(mc, f"CadArmSp_{sy}", (ax, sy, az), hd, "spring_gold", max_coil_len=0.38)
                add_cylinder_rod(mc, f"CadArmGrip_{sy}", (hd.x, hd.y - 0.045, hd.z), (hd.x, hd.y + 0.045, hd.z), 0.011, "maple", segs=10)

    elif app == "chair":
        cx = -0.10
        # 1) Smooth Open C-Frame Laminated White-Oak Sides + Grounded Walnut Base Runners + Cross Beams
        add_open_c_frame_panel(mc, "ChairCFrame_L", cx, -0.252)
        add_open_c_frame_panel(mc, "ChairCFrame_R", cx, 0.252)
        for sy_tag, sy in [("L", -0.252), ("R", 0.252)]:
            add_beveled_box(mc, f"ChairBaseRunner_{sy_tag}", (cx + 0.03, sy, 0.021), (0.78, 0.056, 0.042), "walnut", bevel=0.006)
            for bz in (0.075, 0.520):
                add_ellipsoid(mc, f"ChairFrameBolt_{sy_tag}_{bz}", (cx - 0.26, sy * 1.09, bz), 0.009, 0.006, 0.009, "brass", u_seg=8, v_seg=6)

        add_cylinder_rod(mc, "ChairFrontDowel", (cx + 0.34, -0.26, 0.058), (cx + 0.34, 0.26, 0.058), 0.016, "maple", segs=14)
        # Solid Walnut Cross-Beams grounding the Rear Spring Cactus Post AND the Front Split-Pedal Brass Hinges!
        add_beveled_box(mc, "ChairCactusBaseBeam", (cx - 0.24, 0.0, 0.024), (0.068, 0.50, 0.040), "walnut", bevel=0.005)
        add_beveled_box(mc, "ChairHingeCrossBeam", (cx - 0.10, 0.0, 0.068), (0.058, 0.50, 0.036), "oak", bevel=0.005)

        # 2) Rear Spring Cactus Tree with Flanged Brass Socket + 4 Pairs of V-Hook Branches
        add_beveled_box(mc, "ChairCactusFlange", (cx - 0.24, 0.0, 0.050), (0.052, 0.052, 0.020), "brass", bevel=0.0)
        add_cylinder_rod(mc, "ChairSpringCactus", (cx - 0.24, 0.0, 0.040), (cx - 0.24, 0.0, 0.555), 0.017, "steel", segs=14)
        for idx_h, hz in enumerate((0.25, 0.32, 0.39, 0.46)):
            add_beveled_box(mc, f"CactusCollar_{idx_h}", (cx - 0.24, 0.0, hz), (0.032, 0.040, 0.020), "brass", bevel=0.0)
            for sy_tag, sign in [("L", -1.0), ("R", 1.0)]:
                # Angled V-hook cactus branch
                p_root = Vector((cx - 0.24, sign * 0.015, hz))
                p_elbow = Vector((cx - 0.22, sign * 0.078, hz + 0.010))
                p_tip = Vector((cx - 0.205, sign * 0.095, hz + 0.024))
                add_swept_tube(mc, f"CactusHook_{idx_h}_{sy_tag}", [p_root, p_elbow, p_tip], 0.0052, "brass", closed=False, radial_segs=8)

        # 3) Two-Tier French-Piped Sage Seat Cushion
        add_piped_cushion(mc, "ChairSeat", (cx, 0.0, 0.58), (0.64, 0.55, 0.062))

        # 4) Dual Split Pedals + Satin Brass Pivot Hinges + Hooked Springs + Central Brass Connector Dowel
        pdeg = rig.get("pedalDeg", 22.0)
        l_deg = rig.get("lPedalDeg", pdeg)
        r_deg = rig.get("rPedalDeg", pdeg)
        hinge_x, hinge_z = cx - 0.10, 0.088
        add_cylinder_rod(mc, "ChairHingeAxle", (hinge_x, -0.22, hinge_z), (hinge_x, 0.22, hinge_z), 0.009, "steel", segs=12)

        for side_tag, py, deg_s, sp_mat, hook_z in [
            ("L", -0.105, l_deg, "spring_red", 0.39),
            ("R", 0.105, r_deg, "spring_blue", 0.39),
        ]:
            # Machined Brass Pivot Hinge Knuckles anchored to ChairHingeCrossBeam
            add_beveled_box(mc, f"ChairBrassHinge_{side_tag}", (hinge_x, py, 0.082), (0.044, 0.048, 0.032), "brass", bevel=0.0)
            rad = math.radians(deg_s)
            arm_dir = Vector((math.cos(rad), 0.0, math.sin(rad)))
            arm_up = Vector((-math.sin(rad), 0.0, math.cos(rad)))
            p_end = Vector((hinge_x, py, hinge_z)) + arm_dir * 0.52

            # Laminated Walnut Pedal Lever Blade + Ergonomic Padded Pedal Platform
            arm_mid = Vector((hinge_x, py, hinge_z)) + arm_dir * 0.26
            quat_ped = arm_dir.to_track_quat("X", "Z")
            add_beveled_box(mc, f"ChairPedalArm_{side_tag}", arm_mid, (0.53, 0.046, 0.032), "walnut", bevel=0.005, quat=quat_ped)
            pad_center = p_end - arm_dir * 0.055 + arm_up * 0.020
            add_beveled_box(mc, f"ChairPedalDeck_{side_tag}", pad_center, (0.145, 0.175, 0.022), "walnut", bevel=0.004, quat=quat_ped)
            add_beveled_box(mc, f"ChairPedalTread_{side_tag}", pad_center + arm_up * 0.013, (0.130, 0.160, 0.012), "charcoal", bevel=0.003, quat=quat_ped)

            # Brass Spring Eye-Bracket on Pedal Arm + Hooked Helical Spring from Cactus Hook
            sp_attach = Vector((hinge_x, py * 0.78, hinge_z)) + arm_dir * 0.27 + arm_up * 0.020
            add_beveled_box(mc, f"PedalSpringEye_{side_tag}", sp_attach - arm_up * 0.008, (0.026, 0.022, 0.024), "brass", bevel=0.0, quat=quat_ped)
            cactus_hook_pt = Vector((cx - 0.22, math.copysign(0.078, py), hook_z + 0.010))
            add_helical_spring_mesh(mc, f"ChairHookedSpring_{side_tag}", cactus_hook_pt, sp_attach, sp_mat, coils=11, max_coil_len=None)

        if abs(l_deg - r_deg) < 1.0:
            rad0 = math.radians(l_deg)
            arm_d0 = Vector((math.cos(rad0), 0.0, math.sin(rad0)))
            dowel_c = Vector((hinge_x, 0.0, hinge_z)) + arm_d0 * 0.455
            # Central Knurled Satin Brass Split-Pedal Connector Dowel + Sleeves
            for sy_s in (-0.042, 0.042):
                add_cylinder_rod(mc, f"ChairDowelSleeve_{sy_s}", (dowel_c.x, sy_s - 0.016, dowel_c.z), (dowel_c.x, sy_s + 0.016, dowel_c.z), 0.014, "brass", segs=12)
            add_cylinder_rod(mc, "ChairConnectorDowel", (dowel_c.x, -0.095, dowel_c.z), (dowel_c.x, 0.095, dowel_c.z), 0.0095, "brass", segs=12)
            add_ellipsoid(mc, "ChairDowelPullKnob", (dowel_c.x, 0.0, dowel_c.z + 0.016), 0.010, 0.010, 0.012, "brass", u_seg=10, v_seg=8)

        if rig.get("withChairHandles"):
            for sy in (-0.286, 0.286):
                add_beveled_box(mc, f"ChairSocket_{sy}", (cx - 0.04, sy, 0.30), (0.046, 0.036, 0.16), "steel", bevel=0.005)
                add_ellipsoid(mc, f"ChairKnob_{sy}", (cx - 0.04, sy * 1.11, 0.30), 0.016, 0.014, 0.016, "brass", u_seg=10, v_seg=8)
                add_cylinder_rod(mc, f"ChairHandlePost_{sy}", (cx - 0.04, sy, 0.22), (cx - 0.04, sy, 1.24), 0.014, "steel", segs=14)
                add_cylinder_rod(mc, f"ChairHandleNeck_{sy}", (cx - 0.04, sy, 1.24), (cx + 0.02, sy, 1.265), 0.014, "steel", segs=12)
                add_cylinder_rod(mc, f"ChairHandleGrip_{sy}", (cx + 0.01, sy, 1.26), (cx + 0.13, sy, 1.28), 0.021, "charcoal", segs=14)

    elif app == "barrel":
        if rig.get("isSpineCorrector"):
            add_barrel_arch_assembly(mc, "SpineCorrector", (-0.16, 0.0, 0.03), 0.34, 0.48, 0.056, 118.0, base_z=0.032)
            add_piped_cushion(mc, "ScStep", (0.22, 0.0, 0.14), (0.38, 0.48, 0.14))
            for sy in (-0.232, 0.232):
                add_beveled_box(mc, f"ScBase_{sy}", (0.04, sy, 0.038), (0.78, 0.034, 0.076), "oak", bevel=0.006)
                add_brass_star_knob(mc, f"ScStarKnob_{sy}", Vector((-0.16, sy * 1.14, 0.15)), Vector((0.0, -math.copysign(1.0, sy), 0.0)), radius=0.019)
        else:
            # 1) Padded Barrel Arch Vault with Stitched Piping + Sculpted Oak Cheeks
            add_barrel_arch_assembly(mc, "LadderBarrel", (-0.30, 0.0, 0.55), 0.33, 0.56, 0.064, 148.0, base_z=0.064)

            # 2) Grounded Slotted Sliding Base Rails + Inner Sliding Carriage + 5-Lobe Brass Star Knobs
            for sy_tag, sy in [("L", -0.275), ("R", 0.275)]:
                # Outer floor rail grounded flush at Z = 0.0 (center Z = 0.029, height = 0.058)
                add_beveled_box(mc, f"LbBaseRail_{sy_tag}", (0.06, sy, 0.029), (1.18, 0.056, 0.058), "oak", bevel=0.007)
                # Recessed dark walnut slide-slot inlay along rail side
                add_beveled_box(mc, f"LbSlideSlot_{sy_tag}", (-0.24, sy * 1.07, 0.030), (0.46, 0.012, 0.014), "walnut", bevel=0.0)
                # Inner sliding barrel carriage runner uniting oak cheek to base rail
                add_beveled_box(mc, f"LbSlideCarriage_{sy_tag}", (-0.30, sy * 0.91, 0.056), (0.56, 0.046, 0.032), "walnut", bevel=0.005)
                # Sculpted 5-Lobe Satin Brass Star Clamping Knob
                add_brass_star_knob(
                    mc,
                    f"LbStarKnob_{sy_tag}",
                    Vector((-0.30, sy + math.copysign(0.036, sy), 0.030)),
                    Vector((0.0, -math.copysign(1.0, sy), 0.0)),
                    radius=0.024,
                )
                # Tapered American Walnut Ladder Uprights + Brass Finials
                add_cylinder_rod(mc, f"LbPost_{sy_tag}", (0.52, sy, 0.035), (0.48, sy, 1.05), 0.025, "walnut", segs=16, r2=0.022)
                add_ellipsoid(mc, f"LbPostCap_{sy_tag}", (0.48, sy, 1.058), 0.025, 0.025, 0.014, "brass", u_seg=12, v_seg=8)

            # 3) 3 Lower Cross-Stretchers uniting the Sliding Base Frame
            for idx_c, sx in enumerate((-0.48, 0.02, 0.51)):
                add_cylinder_rod(mc, f"LbLowerStretcher_{idx_c}", (sx, -0.275, 0.029), (sx, 0.275, 0.029), 0.018, "oak", segs=14)

            # 4) 6 Multi-Slat Oval-Profiled European White-Oak Ladder Rungs with Brass Tenon Pins
            for idx_r, rz in enumerate((0.19, 0.38, 0.58, 0.76, 0.91, 1.01)):
                rx = 0.52 - (rz - 0.035) * 0.039
                # Oval-flattened ergonomic oak ladder slat + brass end pins
                bm_rung = bmesh.new()
                bmesh.ops.create_cone(bm_rung, cap_ends=True, cap_tris=True, segments=16, radius1=1.0, radius2=1.0, depth=0.56)
                bmesh.ops.scale(bm_rung, vec=(0.021, 0.014, 1.0), verts=bm_rung.verts)
                quat_y = Vector((0.0, 1.0, 0.0)).to_track_quat("Z", "X")
                mc.emit_bmesh(f"LbOakSlatRung_{idx_r}", bm_rung, "oak", loc=(rx, 0.0, rz), quat=quat_y)
                for sy in (-0.298, 0.298):
                    add_ellipsoid(mc, f"LbRungTenon_{idx_r}_{sy}", (rx, sy, rz), 0.008, 0.005, 0.008, "brass", u_seg=8, v_seg=6)

    else:
        # Grounded Cork-Backed Studio Mat (Z = 0.0..0.020) + Stitched French-Piped Sage Pad + Brass Eyelets
        add_beveled_box(mc, "MatCorkBase", (0.0, 0.0, 0.010), (2.04, 0.74, 0.020), "oak", bevel=0.0)
        add_piped_cushion(mc, "MatSagePad", (0.0, 0.0, 0.032), (1.94, 0.68, 0.028))
        # Stitched centerline + shoulder/pelvis alignment stitch bars
        add_swept_tube(mc, "MatCenterStitch", [Vector((-0.82, 0.0, 0.047)), Vector((0.84, 0.0, 0.047))], 0.0024, "suit_accent", closed=False, radial_segs=6)
        for tx in (-0.38, 0.24):
            add_swept_tube(mc, f"MatCrossStitch_{tx}", [Vector((tx, -0.22, 0.047)), Vector((tx, 0.22, 0.047))], 0.0022, "suit_accent", closed=False, radial_segs=6)
        for ey in (-0.22, 0.22):
            add_torus(mc, f"MatEyelet_{ey}", (-0.90, ey, 0.047), 0.014, 0.0038, "brass", axis="Z", segs=14, tsegs=6)

    # High-Craft 3D Studio Prop Kit
    if "magic-circle" in props:
        if app == "mat" and ex.get("id") != "ex-core-03":
            # Grounded beside the +Y edge of the stitched mat!
            add_sculpted_magic_circle(mc, Vector((-0.28, 0.59, 0.0)), resting_horizontal=True)
        else:
            rc = l_foot.lerp(r_foot, 0.5) + Vector((-0.03, 0.0, 0.03))
            add_sculpted_magic_circle(mc, rc, resting_horizontal=False)

    if "foam-roller" in props:
        ry = -0.50 if app == "mat" else -0.44
        add_beveled_eva_foam_roller(mc, ry)

    if "mini-ball" in props:
        if app == "mat":
            add_matte_sage_mini_ball(mc, (0.44, 0.52))
        else:
            bp = l_foot.lerp(r_foot, 0.5) + Vector((0.0, 0.0, 0.06))
            add_ellipsoid(mc, "MiniStabilityBall", bp, 0.092, 0.092, 0.092, "ball", u_seg=20, v_seg=14)

    if rig.get("withDumbbells") or "dumbbell" in props:
        for idx, hp in enumerate([l_hand, r_hand]):
            add_cylinder_rod(mc, f"DbHandle_{idx}", (hp.x, hp.y - 0.065, hp.z), (hp.x, hp.y + 0.065, hp.z), 0.010, "steel", segs=10)
            for dy in (-0.068, 0.068):
                add_cylinder_rod(mc, f"DbHexBell_{idx}_{dy}", (hp.x, hp.y + dy - 0.016, hp.z), (hp.x, hp.y + dy + 0.016, hp.z), 0.034, "charcoal", segs=6)

    if rig.get("withTheraband") or "theraband" in props:
        band_pts = [
            l_hand,
            l_foot + Vector((0.03, 0.0, 0.0)),
            r_foot + Vector((0.03, 0.0, 0.0)),
            r_hand,
        ]
        add_swept_tube(mc, "ResistanceBand", band_pts, 0.0075, "band", closed=False, radial_segs=8)


# ==============================================================================
# 5. TRUE PERSPECTIVE FRUSTUM CAMERA AUTO-FRAMER (ZERO CLIPPING GUARANTEE)
# ==============================================================================

def aim_camera_perspective_exact(
    cam: bpy.types.Object,
    points_world: list[Vector],
    azim_deg: float = -64.0,
    elev_deg: float = 20.0,
    margin: float = 1.15,
    aspect: float = 640.0 / 400.0,
):
    xs = [p.x for p in points_world]
    ys = [p.y for p in points_world]
    zs = [p.z for p in points_world]
    center = Vector(((min(xs) + max(xs)) * 0.5, (min(ys) + max(ys)) * 0.5, (min(zs) + max(zs)) * 0.5))

    az = math.radians(azim_deg)
    el = math.radians(elev_deg)
    cam_back = Vector((math.cos(el) * math.cos(az), math.cos(el) * math.sin(az), math.sin(el))).normalized()
    right = Vector((-math.sin(az), math.cos(az), 0.0)).normalized()
    up = cam_back.cross(right).normalized()

    fov_h = 2.0 * math.atan(cam.data.sensor_width / (2.0 * cam.data.lens))
    tan_half_h = math.tan(fov_h * 0.5) / margin
    tan_half_v = tan_half_h / aspect

    u_vals = [(p - center).dot(right) for p in points_world]
    v_vals = [(p - center).dot(up) for p in points_world]
    center = center + right * ((min(u_vals) + max(u_vals)) * 0.5) + up * ((min(v_vals) + max(v_vals)) * 0.5)

    req_dist = 1.95
    for p in points_world:
        rel = p - center
        px = abs(rel.dot(right))
        py = abs(rel.dot(up))
        pz = rel.dot(cam_back)
        req_dist = max(req_dist, pz + px / tan_half_h, pz + py / tan_half_v, pz + 0.65)

    cam.location = center + cam_back * req_dist
    direction = (center - cam.location).normalized()
    cam.rotation_mode = "QUATERNION"
    cam.rotation_quaternion = direction.to_track_quat("-Z", "Y")
    return center, req_dist
