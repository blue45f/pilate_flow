"""
Flagship Precision 3D Modeling Kernel for Blender 5.2 LTS (`bpy` + `bmesh`)
Synthesizes insights from:
- `blender-52-hero-modeling` (Primary/Secondary/Tertiary silhouette hierarchy, SUBSURF, BEVEL + harden_normals)
- `threejs-procedural-geometry` (Continuous multi-station spine/limb lofts, open C-frame profiles, zero primitive-stack seams)
- `biomech-anatomical-rig-modeling` (Muscle-bellied thigh/calf/forearm lofts, tibia-aligned grip-sock feet, 5-digit sculpted hands)
- `blender-materials` & `blender-lighting` (Binary Metallic 0/1, procedural oak grain, pebbled leather, subsurface skin, true perspective frustum framing)
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
# 1. CYCLES PROCEDURAL PBR MATERIALS & GLB 8-BAND TEXTURE ATLAS
# ==============================================================================

ATLAS_BANDS_SRGB = [
    # 0: Brushed Champagne Brass (Metallic)
    (0.83, 0.69, 0.43),
    # 1: Anisotropic Brushed Steel (Metallic)
    (0.81, 0.84, 0.86),
    # 2: Botanical Sage Crop Top / Pad Leather
    (0.21, 0.36, 0.30),
    # 3: Deep Forest Sculpt Legging
    (0.16, 0.29, 0.24),
    # 4: Warm Natural Subsurface Skin
    (0.85, 0.67, 0.56),
    # 5: European White Oak (with grain)
    (0.73, 0.56, 0.39),
    # 6: American Walnut / Espresso Hair
    (0.26, 0.17, 0.12),
    # 7: Ivory Grip Sock & Trim Piping
    (0.93, 0.91, 0.87),
]


def build_glb_pbr_atlas(size: int = 256):
    """256x256 8-band sRGB texture atlas with subtle procedural grain for GLB export."""
    img = bpy.data.images.new("StudioFlagshipAtlas", width=size, height=size, alpha=False)
    img.colorspace_settings.name = "sRGB"
    band_h = size // len(ATLAS_BANDS_SRGB)
    pixels = [0.0] * (size * size * 4)
    idx = 0
    for y in range(size):
        b_idx = min(len(ATLAS_BANDS_SRGB) - 1, y // band_h)
        base_r, base_g, base_b = ATLAS_BANDS_SRGB[b_idx]
        for x in range(size):
            # Subtle deterministic wood/weave micro-variation
            if b_idx in (5, 6):
                grain = math.sin(x * 0.22 + math.sin(y * 0.15) * 2.5) * 0.022
            elif b_idx in (2, 3):
                grain = math.sin(x * 0.7) * math.cos(y * 0.7) * 0.008
            else:
                grain = 0.0
            pixels[idx] = max(0.0, min(1.0, base_r + grain))
            pixels[idx + 1] = max(0.0, min(1.0, base_g + grain * 0.85))
            pixels[idx + 2] = max(0.0, min(1.0, base_b + grain * 0.7))
            pixels[idx + 3] = 1.0
            idx += 4
    img.pixels[:] = pixels
    img.pack()
    return img


def assign_atlas_band_uvs(bm: bmesh.types.BMesh, band_idx: int) -> None:
    uv_layer = bm.loops.layers.uv.verify()
    n_bands = len(ATLAS_BANDS_SRGB)
    step = 1.0 / n_bands
    v_min = band_idx * step + step * 0.18
    v_max = (band_idx + 1) * step - step * 0.18
    for face in bm.faces:
        n_loops = len(face.loops)
        for l_i, loop in enumerate(face.loops):
            ang = 2.0 * math.pi * l_i / max(3, n_loops)
            u = 0.5 + 0.36 * math.cos(ang)
            v = 0.5 * (v_min + v_max) + 0.42 * (v_max - v_min) * math.sin(ang)
            loop[uv_layer].uv = (u, v)


def build_cycles_studio_materials() -> dict[str, bpy.types.Material]:
    def base_mat(name, srgb, roughness=0.5, metallic=0.0, coat=0.0, sheen=0.0, subsurf=0.0):
        mat = bpy.data.materials.new(name)
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
        "skin": base_mat("PF4_Skin", (0.85, 0.665, 0.555), roughness=0.43, subsurf=0.28),
        "suit": base_mat("PF4_SuitSage", (0.215, 0.365, 0.305), roughness=0.58, sheen=0.32),
        "legging": base_mat("PF4_LeggingForest", (0.165, 0.295, 0.245), roughness=0.60, sheen=0.30),
        "suit_accent": base_mat("PF4_SuitPiping", (0.91, 0.89, 0.85), roughness=0.52, sheen=0.22),
        "hair": base_mat("PF4_HairEspresso", (0.15, 0.105, 0.08), roughness=0.34, coat=0.20),
        "sock": base_mat("PF4_GripSockIvory", (0.935, 0.915, 0.875), roughness=0.68, sheen=0.28),
        "oak": base_mat("PF4_WhiteOak", (0.735, 0.565, 0.395), roughness=0.34, coat=0.34),
        "walnut": base_mat("PF4_Walnut", (0.44, 0.30, 0.205), roughness=0.38, coat=0.28),
        "pad": base_mat("PF4_PebbledSageLeather", (0.225, 0.37, 0.31), roughness=0.44, coat=0.12, sheen=0.12),
        "steel": base_mat("PF4_BrushedSteel", (0.81, 0.835, 0.855), roughness=0.20, metallic=1.0),
        "brass": base_mat("PF4_SatinBrass", (0.84, 0.69, 0.42), roughness=0.23, metallic=1.0),
        "charcoal": base_mat("PF4_CharcoalGrip", (0.19, 0.21, 0.21), roughness=0.62, metallic=0.0),
        "strap": base_mat("PF4_CottonWebbing", (0.25, 0.28, 0.265), roughness=0.76, sheen=0.24),
        "band": base_mat("PF4_LatexBand", (0.19, 0.53, 0.37), roughness=0.44, coat=0.15),
        "ball": base_mat("PF4_PearlBall", (0.78, 0.40, 0.30), roughness=0.32, coat=0.28),
        "spring_red": base_mat("PF4_SpringRed", (0.76, 0.22, 0.17), roughness=0.22, metallic=1.0),
        "spring_blue": base_mat("PF4_SpringBlue", (0.19, 0.45, 0.70), roughness=0.22, metallic=1.0),
        "spring_gold": base_mat("PF4_SpringGold", (0.85, 0.63, 0.18), roughness=0.22, metallic=1.0),
        "studio_bg": base_mat("PF4_StudioCyclorama", (0.958, 0.944, 0.915), roughness=0.92),
        "studio_floor": base_mat("PF4_StudioFloor", (0.912, 0.888, 0.844), roughness=0.66, coat=0.06),
    }

    # Add subtle procedural wood grain bump to Oak & Walnut + pebbled micro-grain to Sage Leather
    for key, scale_xyz, bump_dist in [
        ("oak", (2.5, 22.0, 22.0), 0.0012),
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
# 2. GEOMETRY PRIMITIVES & CONTINUOUS PARALLEL-TRANSPORT LOFTS
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
            "spring_gold": (True, 0),
            "steel": (True, 1),
            "spring_red": (True, 0),
            "spring_blue": (True, 1),
            "suit": (False, 2),
            "pad": (False, 2),
            "band": (False, 2),
            "legging": (False, 3),
            "strap": (False, 3),
            "skin": (False, 4),
            "ball": (False, 4),
            "oak": (False, 5),
            "walnut": (False, 6),
            "hair": (False, 6),
            "charcoal": (False, 6),
            "sock": (False, 7),
            "suit_accent": (False, 7),
        }
        is_metal, band = band_map.get(mat_key, (False, 2))
        if self.glb_mode:
            mat = self.mats["glb_metal"] if is_metal else self.mats["glb_diel"]
        else:
            mat = self.mats[mat_key]
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
    ) -> bpy.types.Object:
        mat, is_metal, band = self.resolve_mat_and_band(mat_key)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        if self.glb_mode:
            assign_atlas_band_uvs(bm, band)
        mesh = bpy.data.meshes.new(name)
        bm.to_mesh(mesh)
        bm.free()
        for p in mesh.polygons:
            p.use_smooth = True
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
            bev.harden_normals = not self.glb_mode

        if subsurf_levels > 0:
            sub = obj.modifiers.new("Subsurf", "SUBSURF")
            sub.levels = subsurf_levels
            sub.render_levels = subsurf_levels

        if self.glb_mode:
            (self.metal_objs if is_metal else self.diel_objs).append(obj)
        return obj


def add_beveled_box(mc: MeshCollector, name: str, center, dims, mat_key: str, bevel: float = 0.010):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=dims, verts=bm.verts)
    # Small hardware castings (< 6cm) use crisp faceted normals so tiny bevels never invert/darken normals
    if max(dims) < 0.065:
        mat, is_metal, band = mc.resolve_mat_and_band(mat_key)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        if mc.glb_mode:
            assign_atlas_band_uvs(bm, band)
        mesh = bpy.data.meshes.new(name)
        bm.to_mesh(mesh)
        bm.free()
        for p in mesh.polygons:
            p.use_smooth = False
        mesh.materials.append(mat)
        obj = bpy.data.objects.new(name, mesh)
        mc.collection.objects.link(obj)
        obj.location = center
        if mc.glb_mode:
            (mc.metal_objs if is_metal else mc.diel_objs).append(obj)
        return obj
    bw = min(bevel, min(dims) * 0.22) if bevel > 0 else 0.0
    return mc.emit_bmesh(name, bm, mat_key, loc=center, bevel_width=bw)


def add_piped_cushion(mc: MeshCollector, name: str, center, dims, pad_key: str = "pad", trim_key: str = "suit_accent"):
    """Two-tier upholstered studio cushion with perimeter French piping welt."""
    cx, cy, cz = center
    dx, dy, dz = dims
    add_beveled_box(mc, name + "_Core", (cx, cy, cz), (dx, dy, dz), pad_key, bevel=min(0.018, dz * 0.32))
    # Subtle top French piping frame
    pz = cz + dz * 0.48
    hx, hy = dx * 0.485, dy * 0.485
    r_pipe = 0.0038
    pts = [
        Vector((cx - hx, cy - hy, pz)),
        Vector((cx + hx, cy - hy, pz)),
        Vector((cx + hx, cy + hy, pz)),
        Vector((cx - hx, cy + hy, pz)),
    ]
    for i in range(4):
        add_cylinder_rod(mc, f"{name}_Welt_{i}", pts[i], pts[(i + 1) % 4], r_pipe, trim_key, segs=8)


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
        cap_tris=False,
        segments=segs,
        radius1=radius,
        radius2=radius if r2 is None else r2,
        depth=L,
    )
    quat = dv.normalized().to_track_quat("Z", "Y")
    return mc.emit_bmesh(name, bm, mat_key, loc=(v1 + v2) * 0.5, quat=quat)


def add_ellipsoid(mc: MeshCollector, name: str, center, rx: float, ry: float, rz: float, mat_key: str, u_seg: int = 18, v_seg: int = 12):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=u_seg, v_segments=v_seg, radius=1.0)
    bmesh.ops.scale(bm, vec=(rx, ry, rz), verts=bm.verts)
    return mc.emit_bmesh(name, bm, mat_key, loc=center)


def add_torus(mc: MeshCollector, name: str, center, major_r: float, minor_r: float, mat_key: str, axis: str = "Z", segs: int = 28, tsegs: int = 10):
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
                pt = (sv * minor_r, (major_r + cv * minor_r) * cu, (major_r + cv * minor_r) * su)
            elif axis == "Y":
                pt = ((major_r + cv * minor_r) * cu, sv * minor_r, (major_r + cv * minor_r) * su)
            else:
                pt = ((major_r + cv * minor_r) * cu, (major_r + cv * minor_r) * su, sv * minor_r)
            row.append(bm.verts.new(pt))
        rings.append(row)
    for i in range(segs):
        inext = (i + 1) % segs
        for j in range(tsegs):
            jnext = (j + 1) % tsegs
            bm.faces.new((rings[i][j], rings[inext][j], rings[inext][jnext], rings[i][jnext]))
    return mc.emit_bmesh(name, bm, mat_key, loc=center)


def add_helical_spring_mesh(
    mc: MeshCollector,
    name: str,
    p1,
    p2,
    spring_mat_key: str,
    strap_mat_key: str = "strap",
    coils: int = 13,
    coil_r: float = 0.0135,
    wire_r: float = 0.0034,
    max_coil_len: float | None = 0.44,
):
    """Manifold quad-swept 3D helical spring + tapered anodized end cones & hook eyes."""
    v1, v2 = Vector(p1), Vector(p2)
    dv = v2 - v1
    L = dv.length
    if L < 0.03:
        return
    if max_coil_len is not None and L > max_coil_len + 0.05:
        u = dv.normalized()
        s_end = v1 + u * max_coil_len
        add_helical_spring_mesh(mc, name + "_Coil", v1, s_end, spring_mat_key, strap_mat_key, coils=coils, coil_r=coil_r, wire_r=wire_r, max_coil_len=None)
        add_cylinder_rod(mc, name + "_Cord", s_end, v2, 0.0036, strap_mat_key, segs=8)
        return

    steps = coils * (6 if mc.glb_mode else 8)
    r_segs = 6 if mc.glb_mode else 7
    bm = bmesh.new()
    spine_pts = []
    for i in range(steps + 1):
        t = i / steps
        env = math.sin(min(1.0, t / 0.08) * math.pi * 0.5) * math.sin(min(1.0, (1.0 - t) / 0.08) * math.pi * 0.5)
        cr = coil_r * env
        ang = t * coils * 2.0 * math.pi
        spine_pts.append(Vector((math.cos(ang) * cr, math.sin(ang) * cr, (t - 0.5) * L)))

    rings = []
    prev_n = Vector((1, 0, 0))
    for i, pt in enumerate(spine_pts):
        if i == 0:
            tan = (spine_pts[1] - spine_pts[0]).normalized()
        elif i == len(spine_pts) - 1:
            tan = (spine_pts[-1] - spine_pts[-2]).normalized()
        else:
            tan = (spine_pts[i + 1] - spine_pts[i - 1]).normalized()
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

    # End caps for manifold solidity
    c_start = bm.verts.new(spine_pts[0])
    c_end = bm.verts.new(spine_pts[-1])
    for s in range(r_segs):
        s2 = (s + 1) % r_segs
        bm.faces.new((c_start, rings[0][s2], rings[0][s]))
        bm.faces.new((rings[-1][s], rings[-1][s2], c_end))

    quat = dv.normalized().to_track_quat("Z", "Y")
    mc.emit_bmesh(name, bm, spring_mat_key, loc=(v1 + v2) * 0.5, quat=quat)


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
    Builds a closed manifold quad loft from station tuples `(center, axis_x, axis_y, profile_fn(theta) -> (dx, dy))`.
    Eliminates primitive capsule pinch seams completely.
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

    # Smooth domed caps at both ends so every loft is a 100% watertight solid
    c0, ax0, ay0, pf0 = stations[0]
    c1, ax1, ay1, pf1 = stations[-1]
    tan0 = (stations[1][0] - c0).normalized()
    tan1 = (c1 - stations[-2][0]).normalized()

    for is_end, c_pt, ax, ay, pf, tan_out, ring in [
        (False, c0, ax0, ay0, pf0, -tan0, rings[0]),
        (True, c1, ax1, ay1, pf1, tan1, rings[-1]),
    ]:
        prev = ring
        for step_k, scale_r, push_t in [(1, 0.62, 0.55), (2, 0.26, 0.90)]:
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
# 3. ANATOMICAL HUMAN PRACTITIONER BUILDER (CONTINUOUS LOFTS + HANDS + FEET + HEAD)
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
    """Samples a 2-bone chain `p0 -> p1 -> p2` with a smooth anatomical joint arc around `p1`."""
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

    # Proportional Sculpted Cranium + Malar Cheekbones + Feminine Jaw/Chin + Soft Nose Bridge
    bm = bmesh.new()
    u_seg = 24 if mc.glb_mode else 28
    v_seg = 16 if mc.glb_mode else 20
    bmesh.ops.create_uvsphere(bm, u_segments=u_seg, v_segments=v_seg, radius=1.0)
    for v in bm.verts:
        nx, ny, nz = v.co.x, v.co.y, v.co.z
        x = nx * 0.073
        y = ny * 0.088
        z = nz * 0.098
        # Facial front sculpting (ny > 0)
        if ny > 0:
            # Taper lower jaw & chin smoothly
            if nz < 0.05:
                jaw_t = min(1.0, (0.05 - nz) / 1.05)
                x *= 1.0 - 0.34 * (jaw_t ** 1.25)
                y *= 1.0 - 0.10 * jaw_t
                # Subtle chin projection
                chin_w = math.exp(-((nx / 0.32) ** 2)) * math.exp(-(((nz + 0.78) / 0.24) ** 2))
                y += 0.009 * chin_w
                z -= 0.006 * chin_w
            # Subtle nose bridge & tip relief
            nose_w = math.exp(-((nx / 0.16) ** 2)) * math.exp(-(((nz + 0.12) / 0.28) ** 2))
            y += 0.011 * nose_w * max(0.0, ny)
            # Subtle orbital eye-socket depression below brow ridge
            eye_w = math.exp(-(((abs(nx) - 0.36) / 0.18) ** 2)) * math.exp(-(((nz - 0.08) / 0.14) ** 2))
            y -= 0.0045 * eye_w * max(0.0, ny)
        else:
            # Occipital skull curve
            if nz < -0.25:
                occ_t = (-0.25 - nz) / 0.75
                x *= 1.0 - 0.22 * occ_t
                y *= 1.0 - 0.18 * occ_t
        v.co = (x, y, z)
    mc.emit_bmesh("Head_Cranium", bm, "skin", matrix=basis, subsurf_levels=subsurf)

    # Sculpted Left & Right Ears
    for sign, side in [(-1.0, "L"), (1.0, "R")]:
        ear_pos = basis @ Vector((sign * 0.073, -0.006, -0.008))
        bm_e = bmesh.new()
        bmesh.ops.create_uvsphere(bm_e, u_segments=10, v_segments=8, radius=1.0)
        bmesh.ops.scale(bm_e, vec=(0.007, 0.013, 0.022), verts=bm_e.verts)
        q_ear = basis.to_quaternion()
        mc.emit_bmesh(f"Ear_{side}", bm_e, "skin", loc=ear_pos, quat=q_ear)

    # Closed Manifold Sculpted Hair Cap + Parted Temple Sweeps + Satin Scrunchie + Twisted Chignon Bun
    bm_h = bmesh.new()
    bmesh.ops.create_uvsphere(bm_h, u_segments=u_seg, v_segments=v_seg, radius=1.0)
    for v in bm_h.verts:
        nx, ny, nz = v.co.x, v.co.y, v.co.z
        # Recede hair shell cleanly inside the face region so it stays 100% manifold with zero open boundary!
        face_mask = max(0.0, ny - 0.10) * max(0.0, 0.42 - nz - 0.18 * abs(nx))
        if face_mask > 0.0:
            inset = min(0.032, face_mask * 0.09)
            v.co = (nx * (0.075 - inset), ny * (0.086 - inset * 1.4), nz * 0.097)
        elif nz < -0.68 and ny > -0.2:
            v.co = (nx * 0.052, ny * 0.058, nz * 0.082)
        else:
            # Crown hair fullness + temple waves
            temple_wave = 0.003 * math.exp(-(((nz - 0.18) / 0.25) ** 2)) * abs(nx)
            v.co = (nx * (0.079 + temple_wave), ny * 0.093 - 0.005, nz * 0.102 + 0.004)
    mc.emit_bmesh("Hair_Crown", bm_h, "hair", matrix=basis, subsurf_levels=subsurf)

    # Satin Ivory Scrunchie Torus + Dual-Lobe Chignon Ballet Bun
    scrunchie_c = basis @ Vector((0.0, -0.092, 0.026))
    bun_c = basis @ Vector((0.0, -0.114, 0.032))
    bm_sc = bmesh.new()
    bmesh.ops.create_uvsphere(bm_sc, u_segments=16, v_segments=10, radius=1.0)
    bmesh.ops.scale(bm_sc, vec=(0.029, 0.016, 0.029), verts=bm_sc.verts)
    mc.emit_bmesh("Hair_Scrunchie", bm_sc, "suit_accent", loc=scrunchie_c, quat=basis.to_quaternion())

    bm_bun = bmesh.new()
    bmesh.ops.create_uvsphere(bm_bun, u_segments=18, v_segments=12, radius=1.0)
    for v in bm_bun.verts:
        ang_twist = math.atan2(v.co.z, v.co.x)
        rib = 1.0 + 0.055 * math.sin(ang_twist * 3.0 + v.co.y * 2.5)
        v.co = (v.co.x * 0.041 * rib, v.co.y * 0.035, v.co.z * 0.041 * rib)
    mc.emit_bmesh("Hair_Chignon", bm_bun, "hair", loc=bun_c, quat=basis.to_quaternion(), subsurf_levels=subsurf)


def build_sculpted_hand(mc: MeshCollector, side: str, wrist: Vector, forearm_dir: Vector, body_right: Vector, ant_n: Vector):
    """5-Digit Sculpted Pilates Hand: tapered palm loft + opposable thumb + 4 gently curved fingers."""
    fdir = forearm_dir.normalized()
    sign = -1.0 if side == "L" else 1.0
    # Palm lateral axis: aligned with body/forearm frame so thumb points medially/upward naturally
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

    # 4-station Metacarpal Palm Loft
    palm_len = 0.068
    palm_stations = []
    for u_p, wx, wy in [
        (-0.08, 0.024, 0.017),
        (0.28, 0.032, 0.015),
        (0.72, 0.036, 0.013),
        (1.00, 0.034, 0.011),
    ]:
        c = wrist + fdir * (palm_len * u_p)
        palm_stations.append((c, lat, dorsal, lambda th, a=wx, b=wy: (math.cos(th) * a, math.sin(th) * b)))
    build_loft_from_stations(
        mc,
        f"Hand_Palm_{side}",
        palm_stations,
        "skin",
        radial_segs=12 if mc.glb_mode else 14,
        cap_start=0.008,
        cap_end=0.008,
        subsurf_levels=0 if mc.glb_mode else 1,
    )

    # Opposable Thumb (2-segment curved rod/capsule)
    th_root = wrist + fdir * 0.020 + lat * 0.024 - dorsal * 0.004
    th_mid = th_root + (fdir * 0.76 + lat * 0.58 - dorsal * 0.22).normalized() * 0.028
    th_tip = th_mid + (fdir * 0.88 + lat * 0.25 - dorsal * 0.30).normalized() * 0.024
    add_cylinder_rod(mc, f"Thumb_Prox_{side}", th_root, th_mid, 0.0085, "skin", segs=8, r2=0.0072)
    add_cylinder_rod(mc, f"Thumb_Dist_{side}", th_mid, th_tip, 0.0072, "skin", segs=8, r2=0.0055)
    add_ellipsoid(mc, f"Thumb_Tip_{side}", th_tip, 0.0055, 0.0055, 0.0055, "skin", u_seg=8, v_seg=6)

    # 4 Individual Sculpted Fingers (Index, Middle, Ring, Little) with gentle natural curl
    finger_specs = [
        ("Idx", 0.72, 0.056, 0.0068),
        ("Mid", 0.24, 0.062, 0.0070),
        ("Rng", -0.24, 0.057, 0.0065),
        ("Pnk", -0.72, 0.046, 0.0056),
    ]
    for fname, lat_u, flen, frad in finger_specs:
        knuckle = wrist + fdir * (palm_len * 0.96) + lat * (lat_u * 0.028)
        pip_jt = knuckle + (fdir * 0.97 - dorsal * 0.22).normalized() * (flen * 0.55)
        f_tip = pip_jt + (fdir * 0.90 - dorsal * 0.42).normalized() * (flen * 0.45)
        add_cylinder_rod(mc, f"Finger_{fname}1_{side}", knuckle, pip_jt, frad, "skin", segs=8, r2=frad * 0.86)
        add_cylinder_rod(mc, f"Finger_{fname}2_{side}", pip_jt, f_tip, frad * 0.85, "skin", segs=8, r2=frad * 0.68)
        add_ellipsoid(mc, f"Finger_{fname}Tip_{side}", f_tip, frad * 0.68, frad * 0.68, frad * 0.68, "skin", u_seg=8, v_seg=6)


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
    Anatomical Pilates Grip-Sock Foot:
    - Uses geometric patellar bend when knee is flexed (>14°), and `body_ant_n` when leg is straight!
    - Automatically plantarflexes in prone/quadruped low-ankle poses so toes glide backward along the mat
      rather than poking downward into the floor or upward into the air!
    """
    shin_down = (ankle - knee).normalized() if (ankle - knee).length > 1e-4 else Vector((0, 0, -1))
    shin_up = -shin_down
    thigh_up = (hip - knee).normalized() if (hip - knee).length > 1e-4 else shin_up

    # True anatomical anterior direction of the tibia
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

    # Posture-aware ankle plantarflexion / dorsiflexion:
    # 1) Standing / flat foot on floor: shin vertical (`shin_up.z > 0.45`) and `ankle.z <= 0.145`
    if ankle.z <= 0.145 and shin_up.z > 0.45:
        foot_fwd = Vector((ant_tib.x, ant_tib.y, 0.0))
        if foot_fwd.length < 1e-4:
            foot_fwd = ant_tib
        foot_fwd.normalize()
        foot_up = Vector((0.0, 0.0, 1.0))
    # 2) Prone / Quadruped / Kneeling where anterior shin faces downward (`ant_tib.z < -0.25`) near floor/mat:
    #    Plantarflex ~68° so dorsum of foot rests gracefully along the mat and toes point backward!
    elif ant_tib.z < -0.25 and ankle.z < 0.36:
        point_ang = math.radians(68.0)
        foot_fwd = (ant_tib * math.cos(point_ang) + shin_down * math.sin(point_ang)).normalized()
        foot_up = (shin_up * math.cos(point_ang) + ant_tib * math.sin(point_ang)).normalized()
    else:
        point_ang = math.radians(24.0 if ankle.z > 0.24 else 10.0)
        foot_fwd = (ant_tib * math.cos(point_ang) + shin_down * math.sin(point_ang)).normalized()
        foot_up = (shin_up * math.cos(point_ang) + ant_tib * math.sin(point_ang)).normalized()

    foot_lat = foot_fwd.cross(foot_up).normalized()

    # 1) Ribbed Ivory Crew Grip-Sock Cuff
    cuff_top = knee.lerp(ankle, 0.84)
    cuff_stations = []
    for u_c, r_lat, r_ap in [(0.0, 0.036, 0.038), (0.5, 0.034, 0.036), (1.0, 0.032, 0.035)]:
        c = cuff_top.lerp(ankle, u_c)
        cuff_stations.append((c, foot_lat, ant_tib, lambda th, a=r_lat, b=r_ap: (math.cos(th) * a, math.sin(th) * b)))
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

    # 2) Multi-Station Anatomical Foot Loft (Calcaneus Heel -> Arch -> Metatarsal Ball -> Toe Box)
    foot_stations = []
    # (fwd_offset, up_offset, half_width, half_height)
    specs = [
        (-0.042, -0.016, 0.027, 0.028),  # Rounded calcaneus heel
        (-0.008, -0.014, 0.031, 0.032),  # Ankle / talus dome
        (0.038, -0.018, 0.033, 0.025),   # Longitudinal arch waist
        (0.088, -0.024, 0.041, 0.019),   # Wide metatarsal ball
        (0.128, -0.025, 0.034, 0.014),   # Tapered sculpted toe box
    ]
    for f_off, u_off, hw, hh in specs:
        c = ankle + foot_fwd * f_off + foot_up * u_off

        def foot_prof(th, a=hw, b=hh):
            # Flatter plantar sole when sin(th) < 0, arched dorsal instep when sin(th) > 0
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
        radial_segs=14 if mc.glb_mode else 18,
        cap_start=0.012,
        cap_end=0.014,
        subsurf_levels=subsurf,
    )

    # 3) Iconic Pilates Grip-Sock Arch Strap & Non-Slip Sole Pad
    arch_c = ankle + foot_fwd * 0.042 + foot_up * (-0.014)
    strap_l = arch_c - foot_lat * 0.033
    strap_r = arch_c + foot_lat * 0.033
    add_cylinder_rod(mc, f"Sock_ArchStrap_{side}", strap_l, strap_r, 0.0055, "legging", segs=8)


def build_sculpted_practitioner(mc: MeshCollector, rig: dict, subsurf: int = 1):
    """
    Constructs the complete Flagship Anatomical 3D Practitioner from a `Universal3DPoseRig` sample:
    - Continuous High-Waisted Legging Pelvis/Glute Loft + Midriff Loft + Scoop-Neck Crop Top Loft
    - Continuous 15-station Deltoid-to-Wrist Muscle-Lofted Arms + 5-Digit Sculpted Hands
    - Continuous 17-station Hip-Knee-Calf Muscle-Lofted Legs + Tibia-Aligned Grip-Sock Feet
    - Sculpted Cranium, Cheekbones, Nose Bridge, Ears & Twisted Chignon Ballet Bun
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

    r_segs_torso = 20 if mc.glb_mode else 24

    # 1A) High-Waisted Sculpted Legging Pelvis & Gluteal Loft (u = -0.09 .. 0.39)
    legging_stations = []
    for u_s, rx, ry_front, ry_back, glute_cleft in [
        (-0.09, 0.118, 0.078, 0.092, 0.010),
        (0.00, 0.142, 0.088, 0.116, 0.014),
        (0.10, 0.146, 0.090, 0.118, 0.012),
        (0.22, 0.132, 0.085, 0.098, 0.004),
        (0.34, 0.114, 0.080, 0.084, 0.000),
        (0.39, 0.111, 0.079, 0.082, 0.000),  # Crisp high-waistband cuff
    ]:
        pt, r_ax, f_ax, _ = spine_frame(u_s)

        def pelvis_prof(th, a=rx, bf=ry_front, bb=ry_back, cleft=glute_cleft):
            ct, st = math.cos(th), math.sin(th)
            if st >= 0:
                # Flat toned lower abdomen
                y = (st ** 0.88) * bf
            else:
                # Sculpted twin gluteal contours with subtle sacral/intergluteal depression
                glute_lobe = 1.0 + 0.12 * (math.sin(2.0 * th) ** 2)
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

    # 1B) Toned Anatomical Midriff Loft (u = 0.36 .. 0.56 — deeply embedded into both waistbands!)
    midriff_stations = []
    for u_s, rx, ry in [
        (0.36, 0.108, 0.077),
        (0.45, 0.106, 0.076),
        (0.56, 0.114, 0.082),
    ]:
        pt, r_ax, f_ax, _ = spine_frame(u_s)

        def mid_prof(th, a=rx, b=ry):
            ct, st = math.cos(th), math.sin(th)
            # Subtle linea alba groove anteriorly & spinal erector groove posteriorly
            groove = 0.004 * math.exp(-((ct / 0.18) ** 2))
            return ct * a, st * b - (groove if st > 0 else -groove * 0.8)

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

    # 1C) Sculpted Scoop-Neck Studio Crop Top Loft (u = 0.53 .. 1.04) + Ivory Underbust Piping + Straps
    top_stations = []
    for u_s, rx, ry_front, ry_back, bust_boost in [
        (0.53, 0.116, 0.084, 0.084, 0.000),
        (0.66, 0.126, 0.104, 0.088, 0.016),
        (0.78, 0.136, 0.108, 0.090, 0.018),
        (0.91, 0.144, 0.092, 0.086, 0.004),
        (1.03, 0.116, 0.072, 0.072, 0.000),
    ]:
        pt, r_ax, f_ax, _ = spine_frame(u_s)

        def chest_prof(th, a=rx, bf=ry_front, bb=ry_back, boost=bust_boost):
            ct, st = math.cos(th), math.sin(th)
            if st >= 0:
                bust_lobes = boost * st * (math.exp(-(((ct - 0.42) / 0.34) ** 2)) + math.exp(-(((ct + 0.42) / 0.34) ** 2)))
                y = st * bf + bust_lobes
            else:
                # Subtle thoracic scapular contour
                y = st * bb
            return ct * a, y

        top_stations.append((pt, r_ax, f_ax, chest_prof))
    build_loft_from_stations(
        mc,
        "Torso_CropTop",
        top_stations,
        "suit",
        radial_segs=r_segs_torso,
        cap_start=0.008,
        cap_end=0.022,
        subsurf_levels=subsurf,
    )

    # Crisp Ivory Piping Trim Band at Crop-Top Underbust
    pt_ub, r_ub, f_ub, _ = spine_frame(0.535)
    ub_ring_pts = [
        pt_ub + r_ub * (math.cos(2.0 * math.pi * k / 16) * 0.117) + f_ub * (math.sin(2.0 * math.pi * k / 16) * 0.085)
        for k in range(16)
    ]
    for k in range(16):
        add_cylinder_rod(mc, f"Top_Trim_{k}", ub_ring_pts[k], ub_ring_pts[(k + 1) % 16], 0.0038, "suit_accent", segs=6)

    # 2) Neck Loft + Sculpted Head & Chignon
    head_pos = chest + sp_up * 0.192 + ant_n * 0.015
    neck_stations = []
    for u_n, r_nx, r_ny in [
        (-0.08, 0.056, 0.052),  # Trapezius / C7 base
        (0.38, 0.044, 0.043),   # Mid cervical column
        (0.88, 0.041, 0.042),   # Sub-occipital / jaw insertion
    ]:
        c = chest.lerp(head_pos - sp_up * 0.032, max(0.0, u_n)) if u_n >= 0 else chest + sp_up * (u_n * 0.14)
        neck_stations.append((c, body_right, ant_n, lambda th, a=r_nx, b=r_ny: (math.cos(th) * a, math.sin(th) * b)))
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

    # Shoulder & Hip Joint Sockets + Crop-Top Straps
    l_hip = pelvis - body_right * 0.086
    r_hip = pelvis + body_right * 0.086
    l_sh = chest - body_right * 0.150
    r_sh = chest + body_right * 0.150

    for sign, side, sh_pt in [(-1.0, "L", l_sh), (1.0, "R", r_sh)]:
        strap_front = chest + body_right * (sign * 0.092) + ant_n * 0.068 - sp_up * 0.02
        strap_top = chest + body_right * (sign * 0.105) + sp_up * 0.038
        strap_back = chest + body_right * (sign * 0.082) - ant_n * 0.066 - sp_up * 0.02
        add_cylinder_rod(mc, f"CropStrapF_{side}", strap_front, strap_top, 0.009, "suit", segs=8)
        add_cylinder_rod(mc, f"CropStrapB_{side}", strap_top, strap_back, 0.009, "suit", segs=8)

    # 3) Continuous 17-Station Muscle-Contoured Legging Loft + Grip-Sock Foot
    r_segs_limb = 14 if mc.glb_mode else 18
    for side, hp, ft, kpole in [
        ("L", l_hip, l_foot, Vector(rig["lKneePole"])),
        ("R", r_hip, r_foot, Vector(rig["rKneePole"])),
    ]:
        knee, ankle, k_bend = solve_2bone_ik_with_bend(hp, ft, 0.40, 0.39, kpole)
        hem_ankle = knee.lerp(ankle, 0.86)
        leg_stations = []
        # Stations from hip (embedded -0.04) through patellar knee (0.50) to ankle hem (1.00)
        leg_profile_table = [
            (0.00, 0.080, 0.084, 0.008),  # Hip/glute blend
            (0.14, 0.075, 0.079, 0.006),  # Upper thigh
            (0.30, 0.066, 0.070, 0.005),  # Mid quadriceps/hamstring sweep
            (0.44, 0.053, 0.055, 0.003),  # Distal thigh taper
            (0.50, 0.049, 0.052, 0.005),  # Sculpted patella / knee condyles
            (0.57, 0.046, 0.048, -0.002), # Below tibial tuberosity
            (0.68, 0.049, 0.054, -0.009), # High athletic gastrocnemius calf belly!
            (0.82, 0.041, 0.044, -0.004), # Soleus taper
            (0.94, 0.035, 0.037, 0.000),  # Achilles narrow
            (1.00, 0.034, 0.036, 0.000),  # Legging ankle hem
        ]
        for s_val, rx_l, ry_l, ant_shift in leg_profile_table:
            pt, tan = sample_rounded_2seg_chain(hp, knee, hem_ankle, s_val, corner_blend=0.13)
            f_ax = k_bend - tan * k_bend.dot(tan)
            if f_ax.length < 1e-4:
                f_ax = tan.cross(body_right)
            f_ax.normalize()
            lat_ax = f_ax.cross(tan).normalized()
            c_shifted = pt + f_ax * ant_shift
            leg_stations.append((c_shifted, lat_ax, f_ax, lambda th, a=rx_l, b=ry_l: (math.cos(th) * a, math.sin(th) * b)))

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

    # 4) Continuous 15-Station Deltoid-to-Wrist Muscle-Contoured Arm Loft + 5-Digit Sculpted Hand
    for side, sh, hd, epole in [
        ("L", l_sh, l_hand, Vector(rig["lElbowPole"])),
        ("R", r_sh, r_hand, Vector(rig["rElbowPole"])),
    ]:
        elb, wr, e_bend = solve_2bone_ik_with_bend(sh, hd, 0.28, 0.26, epole)
        sh_embed = chest.lerp(sh, 0.84)
        arm_stations = []
        arm_profile_table = [
            (0.00, 0.048, 0.046),  # Clavicle/shoulder socket embed
            (0.11, 0.047, 0.045),  # Rounded deltoid cap
            (0.27, 0.039, 0.042),  # Biceps/triceps contour
            (0.44, 0.035, 0.036),  # Distal humerus
            (0.50, 0.035, 0.035),  # Elbow condyle / olecranon blend
            (0.61, 0.036, 0.034),  # Proximal forearm brachioradialis belly
            (0.78, 0.029, 0.026),  # Mid forearm taper
            (0.93, 0.024, 0.019),  # Slender oval distal wrist
            (1.00, 0.023, 0.018),  # Wrist joint into palm
        ]
        for s_val, rx_a, ry_a in arm_profile_table:
            pt, tan = sample_rounded_2seg_chain(sh_embed, elb, wr, s_val, corner_blend=0.14)
            f_ax = e_bend - tan * e_bend.dot(tan)
            if f_ax.length < 1e-4:
                f_ax = tan.cross(sp_up)
            f_ax.normalize()
            lat_ax = f_ax.cross(tan).normalized()
            arm_stations.append((pt, lat_ax, f_ax, lambda th, a=rx_a, b=ry_a: (math.cos(th) * a, math.sin(th) * b)))

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
        build_sculpted_hand(mc, side, wr, forearm_dir, body_right, ant_n)


# ==============================================================================
# 4. INDUSTRIAL STUDIO APPARATUS & PROP BUILDERS
# ==============================================================================

def add_open_c_frame_panel(mc: MeshCollector, name: str, cx: float, y_pos: float, thickness_y: float = 0.036):
    """
    Authentic Wunda / Combo Chair Open C-Frame Laminated Oak Side Panel!
    Replaces solid crate slab with sculpted open C-arch + oval carry handhold.
    """
    bm = bmesh.new()
    # Outer C-contour & inner open mouth in XZ plane around `cx`
    # Chair spans X in [cx - 0.30, cx + 0.30], Z in [0.04, 0.55]
    x_back = cx - 0.30
    x_front = cx + 0.30
    z_bot = 0.042
    z_top = 0.550
    w_spine = 0.115
    h_arm = 0.072

    # Build clean quad-strip C-arch with rounded inner throat
    pts_outer = [
        (x_front, z_top),
        (x_back + 0.04, z_top),
        (x_back, z_top - 0.04),
        (x_back, z_bot + 0.04),
        (x_back + 0.04, z_bot),
        (x_front, z_bot),
    ]
    pts_inner = [
        (x_front, z_top - h_arm),
        (x_back + w_spine + 0.05, z_top - h_arm),
        (x_back + w_spine, z_top - h_arm - 0.045),
        (x_back + w_spine, z_bot + h_arm + 0.045),
        (x_back + w_spine + 0.05, z_bot + h_arm),
        (x_front, z_bot + h_arm),
    ]
    hy = thickness_y * 0.5
    vo_l = [bm.verts.new((px, y_pos - hy, pz)) for px, pz in pts_outer]
    vi_l = [bm.verts.new((px, y_pos - hy, pz)) for px, pz in pts_inner]
    vo_r = [bm.verts.new((px, y_pos + hy, pz)) for px, pz in pts_outer]
    vi_r = [bm.verts.new((px, y_pos + hy, pz)) for px, pz in pts_inner]

    n = len(pts_outer)
    for i in range(n - 1):
        # Left & right side faces of C-arch
        bm.faces.new((vo_l[i], vo_l[i + 1], vi_l[i + 1], vi_l[i]))
        bm.faces.new((vi_r[i], vi_r[i + 1], vo_r[i + 1], vo_r[i]))
        # Outer rim & inner throat rim
        bm.faces.new((vo_r[i], vo_r[i + 1], vo_l[i + 1], vo_l[i]))
        bm.faces.new((vi_l[i], vi_l[i + 1], vi_r[i + 1], vi_r[i]))
    # Top & bottom front C-tips
    bm.faces.new((vo_l[0], vi_l[0], vi_r[0], vo_r[0]))
    bm.faces.new((vi_l[-1], vo_l[-1], vo_r[-1], vi_r[-1]))

    mc.emit_bmesh(name, bm, "oak", bevel_width=0.005)


def add_barrel_arch_assembly(mc: MeshCollector, name: str, center, radius: float, width_y: float, thickness: float, arc_deg: float):
    cx, cy, cz = center
    segs = 22 if mc.glb_mode else 28
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

    # French piping along left & right whaleback arch edges
    for sy_tag, sy in [("L", cy - width_y * 0.49), ("R", cy + width_y * 0.49)]:
        prev_pt = None
        for i in range(0, segs + 1, 2):
            a = -half_arc + 2.0 * half_arc * i / segs
            pt = Vector((cx + math.sin(a) * (radius + 0.002), sy, cz + math.cos(a) * (radius + 0.002)))
            if prev_pt is not None:
                add_cylinder_rod(mc, f"{name}_Pipe_{sy_tag}_{i}", prev_pt, pt, 0.0036, "suit_accent", segs=6)
            prev_pt = pt

    # Solid Manifold Laminated Oak Side Cheeks
    for sy_tag, sy in [("L", cy - width_y * 0.45), ("R", cy + width_y * 0.45)]:
        bm_c = bmesh.new()
        arc_l, base_l, arc_r, base_r = [], [], [], []
        for i in range(segs + 1):
            a = -half_arc + 2.0 * half_arc * i / segs
            xi = cx + math.sin(a) * (radius - thickness + 0.004)
            zi = max(0.08, cz + math.cos(a) * (radius - thickness + 0.004))
            arc_l.append(bm_c.verts.new((xi, sy - 0.018, zi)))
            base_l.append(bm_c.verts.new((xi, sy - 0.018, 0.056)))
            arc_r.append(bm_c.verts.new((xi, sy + 0.018, zi)))
            base_r.append(bm_c.verts.new((xi, sy + 0.018, 0.056)))
        for i in range(segs):
            bm_c.faces.new((base_l[i], base_l[i + 1], arc_l[i + 1], arc_l[i]))
            bm_c.faces.new((arc_r[i], arc_r[i + 1], base_r[i + 1], base_r[i]))
            bm_c.faces.new((arc_l[i], arc_l[i + 1], arc_r[i + 1], arc_r[i]))
            bm_c.faces.new((base_r[i], base_r[i + 1], base_l[i + 1], base_l[i]))
        bm_c.faces.new((base_l[0], arc_l[0], arc_r[0], base_r[0]))
        bm_c.faces.new((base_r[-1], arc_r[-1], arc_l[-1], base_l[-1]))
        mc.emit_bmesh(f"{name}_Cheek_{sy_tag}", bm_c, "oak", bevel_width=0.004)


def build_apparatus_and_props(mc: MeshCollector, ex: dict, rig: dict):
    app = ex["apparatus"]
    props = ex.get("props") or []
    pelvis = Vector(rig["pelvis"])
    l_foot = Vector(rig["lFoot"])
    r_foot = Vector(rig["rFoot"])
    l_hand = Vector(rig["lHand"])
    r_hand = Vector(rig["rHand"])

    if app == "reformer":
        cx = rig.get("carriageX", 0.12)
        # Routed European White-Oak Frame + Recessed Aluminum C-Tracks + Walnut Corner Blocks + Brass Bolts
        for sy_tag, sy in [("L", -0.30), ("R", 0.30)]:
            add_beveled_box(mc, f"RefRail_{sy_tag}", (0.0, sy, 0.31), (2.34, 0.048, 0.125), "oak", bevel=0.009)
            inner_y = -0.268 if sy < 0 else 0.268
            add_beveled_box(mc, f"RefTrack_{sy_tag}", (0.0, inner_y, 0.332), (2.18, 0.018, 0.022), "steel", bevel=0.003)
        add_beveled_box(mc, "RefEndRear", (-1.15, 0.0, 0.31), (0.052, 0.648, 0.125), "oak", bevel=0.009)
        add_beveled_box(mc, "RefEndFront", (1.15, 0.0, 0.31), (0.052, 0.648, 0.125), "oak", bevel=0.009)
        for sx in (-1.15, 1.15):
            for sy in (-0.302, 0.302):
                add_beveled_box(mc, f"RefCornerSpline_{sx}_{sy}", (sx, sy, 0.31), (0.058, 0.054, 0.129), "walnut", bevel=0.006)
                add_ellipsoid(mc, f"RefBolt_{sx}_{sy}", (sx * 1.018, sy, 0.31), 0.006, 0.009, 0.009, "brass", u_seg=10, v_seg=8)

        # Turned Tapered Oak Legs + Satin Brass Leveling Ferrules
        for sx in (-1.08, 1.08):
            for sy in (-0.28, 0.28):
                add_cylinder_rod(mc, f"RefLeg_{sx}_{sy}", (sx, sy, 0.038), (sx, sy, 0.252), 0.027, "oak", segs=16, r2=0.033)
                add_cylinder_rod(mc, f"RefFerrule_{sx}_{sy}", (sx, sy, 0.0), (sx, sy, 0.042), 0.029, "brass", segs=16, r2=0.028)

        # Standing Wooden Platform + Non-Slip Ribbed Pad + 5-Spring Gearbar Anchor Bar
        add_beveled_box(mc, "RefStandDeck", (1.04, 0.0, 0.368), (0.19, 0.58, 0.024), "walnut", bevel=0.005)
        add_beveled_box(mc, "RefStandGrip", (1.04, 0.0, 0.383), (0.16, 0.53, 0.010), "charcoal", bevel=0.003)
        add_cylinder_rod(mc, "RefGearBar", (0.915, -0.27, 0.335), (0.915, 0.27, 0.335), 0.010, "steel", segs=12)

        # Wheeled Carriage Chassis + Two-Tier French-Piped Sage Leather Pad + Hinged Headrest + Shoulder Blocks
        add_beveled_box(mc, "CarriageChassis", (cx + 0.08, 0.0, 0.352), (0.79, 0.555, 0.026), "walnut", bevel=0.005)
        add_piped_cushion(mc, "CarriagePad", (cx + 0.08, 0.0, 0.390), (0.76, 0.54, 0.056))
        hr_lift = 0.034 if ex.get("headrest") == "up" else 0.0
        add_piped_cushion(mc, "RefHeadrest", (cx - 0.385, 0.0, 0.396 + hr_lift * 0.5), (0.155, 0.235, 0.044 + hr_lift))
        for sy in (-0.138, 0.138):
            add_cylinder_rod(mc, f"ShPost_{sy}", (cx - 0.22, sy, 0.39), (cx - 0.22, sy, 0.48), 0.011, "steel", segs=10)
            add_piped_cushion(mc, f"ShBlock_{sy}", (cx - 0.195, sy, 0.474), (0.068, 0.098, 0.108))

        # Boxes / Jumpboard / Locking Footbar with Quadrant Plates
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

        # 4 Color-Coded Helical Springs (2 Red, 1 Blue, 1 Gold) + Brass Gear Hooks
        for idx, (sy, sm) in enumerate([(-0.09, "spring_red"), (-0.03, "spring_red"), (0.03, "spring_blue"), (0.09, "spring_gold")]):
            add_ellipsoid(mc, f"GearHook_{idx}", (0.915, sy, 0.342), 0.009, 0.007, 0.012, "brass", u_seg=8, v_seg=6)
            add_helical_spring_mesh(mc, f"RefSpring_{idx}", (cx + 0.47, sy, 0.335), (0.91, sy, 0.335), sm, max_coil_len=None)

        # Rear Riser Posts + Spoked Brass Swivel Pulleys + D-Ring Double Cotton Loops
        for ry in (-0.28, 0.28):
            add_cylinder_rod(mc, f"RiserPost_{ry}", (-1.13, ry, 0.35), (-1.13, ry, 0.665), 0.013, "steel", segs=12)
            add_ellipsoid(mc, f"RiserFinial_{ry}", (-1.13, ry, 0.672), 0.016, 0.016, 0.012, "brass", u_seg=10, v_seg=8)
            add_torus(mc, f"PulleyWheel_{ry}", (-1.095, ry, 0.64), 0.022, 0.006, "brass", axis="Y", segs=16, tsegs=8)

        if rig.get("ropeToFeet"):
            for side_t, ry, tgt in [("L", -0.275, l_foot), ("R", 0.275, r_foot)]:
                add_cylinder_rod(mc, f"RopeF_{side_t}", (-1.095, ry, 0.64), tgt, 0.0038, "strap", segs=8)
                add_torus(mc, f"LoopF_{side_t}", tgt, 0.036, 0.0055, "strap", axis="Y", segs=14, tsegs=6)
        elif rig.get("ropeToHands"):
            for side_t, ry, tgt in [("L", -0.275, l_hand), ("R", 0.275, r_hand)]:
                add_cylinder_rod(mc, f"RopeH_{side_t}", (-1.095, ry, 0.64), tgt, 0.0038, "strap", segs=8)
                add_torus(mc, f"LoopH_{side_t}", tgt, 0.032, 0.0055, "strap", axis="Y", segs=14, tsegs=6)

    elif app == "cadillac":
        # Heavy Oak Trapeze Table with Lower H-Stretcher Rails + Piped Sage Mattress
        add_piped_cushion(mc, "CadMattress", (0.0, 0.0, 0.545), (2.08, 0.64, 0.066))
        for sy in (-0.32, 0.32):
            add_beveled_box(mc, f"CadRail_{sy}", (0.0, sy, 0.475), (2.14, 0.046, 0.094), "oak", bevel=0.008)
            add_cylinder_rod(mc, f"CadStretcher_{sy}", (-1.04, sy, 0.14), (1.04, sy, 0.14), 0.018, "oak", segs=12)
        for sx in (-1.05, 1.05):
            add_beveled_box(mc, f"CadEnd_{sx}", (sx, 0.0, 0.475), (0.048, 0.686, 0.094), "oak", bevel=0.008)
            add_cylinder_rod(mc, f"CadCrossStretcher_{sx}", (sx, -0.31, 0.14), (sx, 0.31, 0.14), 0.018, "oak", segs=12)

        # 4 Stainless Canopy Uprights + Flanged Brass Corner Castings + Sliding Crossbars
        for sx in (-1.05, 1.05):
            for sy in (-0.31, 0.31):
                add_cylinder_rod(mc, f"CadLeg_{sx}_{sy}", (sx, sy, 0.038), (sx, sy, 0.44), 0.030, "oak", segs=16)
                add_cylinder_rod(mc, f"CadFerrule_{sx}_{sy}", (sx, sy, 0.0), (sx, sy, 0.040), 0.032, "brass", segs=16)
                add_cylinder_rod(mc, f"CadPost_{sx}_{sy}", (sx, sy, 0.51), (sx, sy, 1.95), 0.016, "steel", segs=14)
                add_beveled_box(mc, f"CadFlangeBot_{sx}_{sy}", (sx, sy, 0.515), (0.048, 0.048, 0.032), "brass", bevel=0.006)
                add_beveled_box(mc, f"CadCornerCast_{sx}_{sy}", (sx, sy, 1.95), (0.046, 0.046, 0.046), "brass", bevel=0.008)

        for sy in (-0.31, 0.31):
            add_cylinder_rod(mc, f"CadCanopyRail_{sy}", (-1.05, sy, 1.95), (1.05, sy, 1.95), 0.015, "steel", segs=14)
        for sx in (-1.05, 0.18, 0.62, 1.05):
            add_cylinder_rod(mc, f"CadCross_{sx}", (sx, -0.31, 1.95), (sx, 0.31, 1.95), 0.014, "steel", segs=12)
            if sx in (0.18, 0.62):
                for sy in (-0.31, 0.31):
                    add_beveled_box(mc, f"CadSlider_{sx}_{sy}", (sx, sy, 1.95), (0.038, 0.038, 0.038), "brass", bevel=0.006)

        # Plush Ivory Sheepskin Fuzzy Hanging Loops
        for sy in (-0.19, 0.19):
            add_cylinder_rod(mc, f"FuzzyWeb_{sy}", (0.18, sy, 1.95), (0.18, sy, 1.60), 0.005, "strap", segs=8)
            add_cylinder_rod(mc, f"FuzzyCuff_{sy}", (0.18, sy, 1.44), (0.18, sy, 1.60), 0.027, "sock", segs=14)
            add_torus(mc, f"FuzzyLoop_{sy}", (0.18, sy, 1.42), 0.034, 0.008, "strap", axis="X", segs=14, tsegs=6)

        if rig.get("rolldownBar"):
            bx, bz = rig["rolldownBar"]
            anch_x = rig.get("rolldownBarAnchorX", 1.05)
            add_cylinder_rod(mc, "RollBackMapleBar", (bx, -0.27, bz), (bx, 0.27, bz), 0.017, "walnut", segs=14)
            for sy in (-0.24, 0.24):
                add_torus(mc, f"RdbEye_{sy}", (bx, sy, bz), 0.020, 0.004, "brass", axis="Y", segs=12, tsegs=6)
                add_helical_spring_mesh(mc, f"RdbSpring_{sy}", (anch_x, sy, 1.74), (bx, sy, bz), "spring_gold", max_coil_len=0.38)

        if rig.get("pushthroughDeg") is not None:
            rad = math.radians(rig["pushthroughDeg"])
            ex_x = 0.62 - math.sin(rad) * 0.66
            ez_z = 1.84 - math.cos(rad) * 0.66
            for sy in (-0.27, 0.27):
                add_cylinder_rod(mc, f"PtbSide_{sy}", (0.62, sy, 1.94), (ex_x, sy, ez_z), 0.013, "steel", segs=12)
            add_cylinder_rod(mc, "PtbCross", (ex_x, -0.27, ez_z), (ex_x, 0.27, ez_z), 0.018, "charcoal", segs=14)
            # Authentic Overhead Safety Strap + Tension Spring
            add_cylinder_rod(mc, "PtbSafetyStrap", (1.05, -0.26, 1.94), (ex_x, -0.26, ez_z), 0.004, "strap", segs=8)
            add_helical_spring_mesh(mc, "PtbSpring", (1.05, 0.0, 1.94), ((0.62 + ex_x) * 0.5, 0.0, (1.84 + ez_z) * 0.5), "spring_blue", max_coil_len=0.34)

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
                add_cylinder_rod(mc, f"CadArmGrip_{sy}", (hd.x, hd.y - 0.045, hd.z), (hd.x, hd.y + 0.045, hd.z), 0.011, "walnut", segs=10)

    elif app == "chair":
        cx = -0.10
        # Open C-Frame Laminated Oak Side Panels + Walnut Base Runners + Internal Spring Cactus Tree
        add_open_c_frame_panel(mc, "ChairCFrame_L", cx, -0.252)
        add_open_c_frame_panel(mc, "ChairCFrame_R", cx, 0.252)
        for sy in (-0.252, 0.252):
            add_beveled_box(mc, f"ChairBaseRunner_{sy}", (cx + 0.03, sy, 0.021), (0.76, 0.054, 0.042), "walnut", bevel=0.006)
        add_cylinder_rod(mc, "ChairFrontDowel", (cx + 0.34, -0.25, 0.055), (cx + 0.34, 0.25, 0.055), 0.016, "oak", segs=12)
        add_cylinder_rod(mc, "ChairRearDowel", (cx - 0.28, -0.25, 0.08), (cx - 0.28, 0.25, 0.08), 0.016, "oak", segs=12)

        # Internal 4-Hook Spring Cactus Tree Post
        add_cylinder_rod(mc, "ChairSpringCactus", (cx - 0.24, 0.0, 0.06), (cx - 0.24, 0.0, 0.50), 0.016, "steel", segs=12)
        for hz in (0.26, 0.33, 0.40, 0.47):
            add_cylinder_rod(mc, f"CactusHook_{hz}", (cx - 0.24, -0.09, hz), (cx - 0.24, 0.09, hz), 0.006, "brass", segs=8)

        # Two-Tier Piped Sage Top Seat Cushion
        add_piped_cushion(mc, "ChairSeat", (cx, 0.0, 0.58), (0.64, 0.55, 0.062))

        # Split-Pedal Arms + Padded Crossbar + Brass Dowel Lock + Dual Helical Springs
        pdeg = rig.get("pedalDeg", 22.0)
        l_deg = rig.get("lPedalDeg", pdeg)
        r_deg = rig.get("rPedalDeg", pdeg)
        for py, deg_s, sp_mat in [(-0.105, l_deg, "spring_red"), (0.105, r_deg, "spring_blue")]:
            rad = math.radians(deg_s)
            px = cx - 0.10 + math.cos(rad) * 0.52
            pz = 0.08 + math.sin(rad) * 0.52
            add_cylinder_rod(mc, f"ChairPedArm_{py}", (cx - 0.10, py, 0.08), (px, py, pz), 0.021, "walnut", segs=14)
            add_cylinder_rod(mc, f"ChairPedPad_{py}", (px, py - 0.085, pz + 0.012), (px, py + 0.085, pz + 0.012), 0.022, "charcoal", segs=14)
            add_helical_spring_mesh(mc, f"ChairSp_{py}", (cx - 0.24, py * 0.72, 0.40), ((cx - 0.10 + px) * 0.56, py * 0.72, (0.08 + pz) * 0.56), sp_mat, coils=11, max_coil_len=None)
        if abs(l_deg - r_deg) < 1.0:
            rad0 = math.radians(l_deg)
            px0 = cx - 0.10 + math.cos(rad0) * 0.52
            pz0 = 0.08 + math.sin(rad0) * 0.52
            add_cylinder_rod(mc, "ChairPedLockDowel", (px0, -0.04, pz0 + 0.012), (px0, 0.04, pz0 + 0.012), 0.010, "brass", segs=10)

        if rig.get("withChairHandles"):
            for sy in (-0.286, 0.286):
                add_beveled_box(mc, f"ChairSocket_{sy}", (cx - 0.04, sy, 0.30), (0.046, 0.036, 0.16), "steel", bevel=0.005)
                add_ellipsoid(mc, f"ChairKnob_{sy}", (cx - 0.04, sy * 1.11, 0.30), 0.016, 0.014, 0.016, "brass", u_seg=10, v_seg=8)
                add_cylinder_rod(mc, f"ChairHandlePost_{sy}", (cx - 0.04, sy, 0.22), (cx - 0.04, sy, 1.24), 0.014, "steel", segs=14)
                add_cylinder_rod(mc, f"ChairHandleNeck_{sy}", (cx - 0.04, sy, 1.24), (cx + 0.02, sy, 1.265), 0.014, "steel", segs=12)
                add_cylinder_rod(mc, f"ChairHandleGrip_{sy}", (cx + 0.01, sy, 1.26), (cx + 0.13, sy, 1.28), 0.021, "charcoal", segs=14)

    elif app == "barrel":
        if rig.get("isSpineCorrector"):
            add_barrel_arch_assembly(mc, "SpineCorrector", (-0.16, 0.0, 0.03), 0.34, 0.48, 0.056, 118.0)
            add_piped_cushion(mc, "ScStep", (0.22, 0.0, 0.14), (0.38, 0.48, 0.14))
            for sy in (-0.232, 0.232):
                add_beveled_box(mc, f"ScBase_{sy}", (0.04, sy, 0.038), (0.78, 0.034, 0.076), "oak", bevel=0.006)
                add_ellipsoid(mc, f"ScKnob_{sy}", (-0.16, sy * 1.12, 0.16), 0.015, 0.010, 0.015, "brass", u_seg=10, v_seg=8)
        else:
            add_barrel_arch_assembly(mc, "LadderBarrel", (-0.30, 0.0, 0.55), 0.33, 0.56, 0.064, 148.0)
            for sy in (-0.275, 0.275):
                add_beveled_box(mc, f"LbSlideRail_{sy}", (0.08, sy, 0.030), (1.12, 0.052, 0.058), "oak", bevel=0.007)
                add_ellipsoid(mc, f"LbLockKnob_{sy}", (-0.28, sy * 1.13, 0.045), 0.018, 0.014, 0.018, "brass", u_seg=10, v_seg=8)
                add_cylinder_rod(mc, f"LbPost_{sy}", (0.52, sy, 0.04), (0.48, sy, 1.03), 0.025, "walnut", segs=16)
                add_ellipsoid(mc, f"LbPostCap_{sy}", (0.48, sy, 1.038), 0.027, 0.027, 0.014, "brass", u_seg=12, v_seg=8)
            for sx in (-0.42, 0.50):
                add_cylinder_rod(mc, f"LbBaseCross_{sx}", (sx, -0.27, 0.030), (sx, 0.27, 0.030), 0.018, "oak", segs=12)
            for rz in (0.22, 0.40, 0.58, 0.76, 0.94):
                rx = 0.52 - (rz - 0.04) * 0.04
                add_cylinder_rod(mc, f"LbRung_{rz}", (rx, -0.28, rz), (rx, 0.28, rz), 0.016, "oak", segs=14)

    else:
        # Raised Cork-Backed Studio Mat + French Piping + Center Alignment Strip + Brass Hanging Eyelets
        add_beveled_box(mc, "MatCorkBase", (0.0, 0.0, 0.012), (2.04, 0.74, 0.024), "oak", bevel=0.007)
        add_piped_cushion(mc, "MatSagePad", (0.0, 0.0, 0.033), (1.92, 0.68, 0.028))
        add_beveled_box(mc, "MatCenterLine", (0.0, 0.0, 0.048), (1.68, 0.008, 0.003), "suit_accent", bevel=0.001)
        for ey in (-0.22, 0.22):
            add_torus(mc, f"MatEyelet_{ey}", (-0.89, ey, 0.048), 0.013, 0.0035, "brass", axis="Z", segs=14, tsegs=6)

    # Optional High-Craft 3D Studio Props
    if "magic-circle" in props:
        rc = l_foot.lerp(r_foot, 0.5) + Vector((-0.03, 0.0, 0.03))
        add_torus(mc, "MagicCircleRing", rc, 0.165, 0.0085, "steel", axis="X", segs=28, tsegs=8)
        for sy in (-0.165, 0.165):
            add_beveled_box(mc, f"McOuterPad_{sy}", (rc.x, rc.y + sy * 1.05, rc.z), (0.048, 0.022, 0.105), "charcoal", bevel=0.006)
            add_beveled_box(mc, f"McInnerPad_{sy}", (rc.x, rc.y + sy * 0.94, rc.z), (0.042, 0.018, 0.092), "charcoal", bevel=0.005)
    if "foam-roller" in props:
        ry = -0.49 if app == "mat" else -0.44
        add_cylinder_rod(mc, "FoamRollerBody", (-0.44, ry, 0.072), (0.44, ry, 0.072), 0.068, "pad", segs=22)
        for sx in (-0.442, 0.442):
            add_cylinder_rod(mc, f"RollerCap_{sx}", (sx, ry, 0.072), (sx + (0.008 if sx > 0 else -0.008), ry, 0.072), 0.064, "suit_accent", segs=18)
    if "mini-ball" in props:
        # Place neatly on studio mat corner so it never clips moving limbs
        bp = Vector((0.58, 0.48, 0.096)) if app == "mat" else (l_foot.lerp(r_foot, 0.5) + Vector((0.0, 0.0, 0.06)))
        add_ellipsoid(mc, "MiniStabilityBall", bp, 0.096, 0.096, 0.096, "ball", u_seg=20, v_seg=14)
    if rig.get("withDumbbells") or "dumbbell" in props:
        for idx, hp in enumerate([l_hand, r_hand]):
            add_cylinder_rod(mc, f"DbHandle_{idx}", (hp.x, hp.y - 0.065, hp.z), (hp.x, hp.y + 0.065, hp.z), 0.010, "steel", segs=10)
            for dy in (-0.068, 0.068):
                # Hexagonal neoprene dumbbell bell!
                add_cylinder_rod(mc, f"DbHexBell_{idx}_{dy}", (hp.x, hp.y + dy - 0.016, hp.z), (hp.x, hp.y + dy + 0.016, hp.z), 0.034, "charcoal", segs=6)
    if rig.get("withTheraband") or "theraband" in props:
        add_cylinder_rod(mc, "BandL", l_hand, l_foot + Vector((0.03, 0.0, 0.0)), 0.008, "band", segs=10)
        add_cylinder_rod(mc, "BandM", l_foot + Vector((0.03, 0.0, 0.0)), r_foot + Vector((0.03, 0.0, 0.0)), 0.008, "band", segs=10)
        add_cylinder_rod(mc, "BandR", r_foot + Vector((0.03, 0.0, 0.0)), r_hand, 0.008, "band", segs=10)


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
    """
    Computes exact perspective frustum distance `d` so EVERY 3D point in `points_world`
    projects inside `[-1/margin, +1/margin]` horizontally and vertically!
    Eliminates orthographic approximation clipping on tall standing / Cadillac / Chair poses.
    """
    xs = [p.x for p in points_world]
    ys = [p.y for p in points_world]
    zs = [p.z for p in points_world]
    center = Vector(((min(xs) + max(xs)) * 0.5, (min(ys) + max(ys)) * 0.5, (min(zs) + max(zs)) * 0.5))

    az = math.radians(azim_deg)
    el = math.radians(elev_deg)
    # Vector from target `center` toward camera
    cam_back = Vector((math.cos(el) * math.cos(az), math.cos(el) * math.sin(az), math.sin(el))).normalized()
    right = Vector((-math.sin(az), math.cos(az), 0.0)).normalized()
    up = cam_back.cross(right).normalized()

    fov_h = 2.0 * math.atan(cam.data.sensor_width / (2.0 * cam.data.lens))
    tan_half_h = math.tan(fov_h * 0.5) / margin
    tan_half_v = (tan_half_h / aspect)

    # First center screen-space asymmetrically so top/bottom & left/right extents balance
    u_vals = [(p - center).dot(right) for p in points_world]
    v_vals = [(p - center).dot(up) for p in points_world]
    center = center + right * ((min(u_vals) + max(u_vals)) * 0.5) + up * ((min(v_vals) + max(v_vals)) * 0.5)

    req_dist = 1.95
    for p in points_world:
        rel = p - center
        px = abs(rel.dot(right))
        py = abs(rel.dot(up))
        pz = rel.dot(cam_back)  # positive means closer to camera than `center`!
        req_dist = max(req_dist, pz + px / tan_half_h, pz + py / tan_half_v, pz + 0.65)

    cam.location = center + cam_back * req_dist
    direction = (center - cam.location).normalized()
    cam.rotation_mode = "QUATERNION"
    cam.rotation_quaternion = direction.to_track_quat("-Z", "Y")
    return center, req_dist
