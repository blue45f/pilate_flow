"""
Flagship Precision 3D Modeling Kernel v4 (Beauty & Seamless Anatomy Edition) for Blender 5.3 (`bpy` + `bmesh`)
Upgrades:
- Graceful 7.5-Head Korean Pilates Studio Instructor Sculpt: refined small-face V-line silhouette, sculpted nose bridge
  & subtle upturned tip, Cupid's-bow hydrated MLBB coral-rose lips with warm serene smile, soft groomed espresso brows,
  winged upper eyelashes, luminous multi-layer pearl-sclera + espresso-amber iris + dual starlight catchlights, and
  smooth vertex-colored Korean peach-rose editorial cheek blush & eyelid depth
- Lush Layered Silk Hair: airy lifted parted crown with combed strand grooves, multi-strand see-through curtain bangs,
  cheek-framing face locks, pleated satin silk scrunchie with trailing ribbon tails, and gravity-aware cascading ponytail
- Single Seamless Continuous Watertight Body Mesh: pure-quad Y-bifurcated pelvis-to-legs & lateral shoulder-to-arms
  topology eliminating ALL hip, glute, waist, bust, and shoulder joint creases while maintaining 0 non-manifold edges
- Tailored Luxury Athleisure: scoop-neck & ballet-back botanical sage crop top with surface-hugging straps, 7/8 sculpted
  forest leggings showing dainty bare ankles, and low-cut ivory ballet grip socks with crisscross sage instep ribbons
- 100% Closed 2-Manifold Watertight Solids (`0` non-manifold, `0` boundary, `0` loose verts, `0` wire edges)
"""
from __future__ import annotations

import math
import bpy
import bmesh
from mathutils import Vector, Matrix, Quaternion
from mathutils.bvhtree import BVHTree


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
    (0.84, 0.70, 0.45),
    # 1: Anisotropic Brushed Stainless / Aluminum (Metallic)
    (0.83, 0.86, 0.89),
    # 2: Anodized Crimson Red Spring (Metallic)
    (0.76, 0.21, 0.18),
    # 3: Anodized Cobalt Blue Spring (Metallic)
    (0.20, 0.46, 0.72),
    # 4: Anodized Amber Gold Spring (Metallic)
    (0.87, 0.64, 0.18),
    # 5: Luminous Warm Porcelain-Peach Subsurface Skin (Dielectric)
    (0.922, 0.772, 0.686),
    # 6: Refined Botanical Sage Crop Top & Upholstery Leather (Dielectric)
    (0.215, 0.368, 0.304),
    # 7: Deep Eucalyptus-Forest Sculpt Legging (Dielectric)
    (0.148, 0.274, 0.224),
    # 8: Matte Botanical Sage Mini-Ball & Latex Band (Dielectric)
    (0.41, 0.56, 0.47),
    # 9: European White Oak (Dielectric)
    (0.765, 0.605, 0.435),
    # 10: Hard Rock Maple (Dielectric)
    (0.855, 0.735, 0.575),
    # 11: American Walnut (Dielectric)
    (0.365, 0.242, 0.165),
    # 12: Warm Coral-Rose Lip Tint, Honey Amber & Saddle Accent (Dielectric)
    (0.74, 0.42, 0.38),
    # 13: Silky Chestnut-Espresso Hair (Dielectric)
    (0.165, 0.108, 0.084),
    # 14: Velvet Cocoa Lash Ink, Charcoal EVA & Cotton Webbing (Dielectric)
    (0.14, 0.145, 0.155),
    # 15: Pearl Sclera, Satin Scrunchie, Ivory Ballet Grip Sock & Piping (Dielectric)
    (0.958, 0.944, 0.914),
]


def build_glb_pbr_atlas(size: int = 512):
    """
    512x512 4x4 square-tile sRGB PBR texture atlas (16 dedicated studio swatches).
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
                cathedral = math.sin(lx * 0.19 + math.sin(ly * 0.09) * 3.1) * 0.022
                pore = math.sin(lx * 0.85 + ly * 0.11) * 0.006
                grain = cathedral + pore
            elif b_idx in (0, 1):
                grain = math.sin(ly * 0.92 + lx * 0.06) * 0.009
            elif b_idx in (6, 7, 12, 14):
                grain = math.sin(lx * 0.78) * math.cos(ly * 0.78) * 0.008
            elif b_idx == 13:
                grain = math.sin(lx * 0.62 + ly * 0.14) * 0.014
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


def build_glb_surface_atlas():
    # Match the 16 base-color swatches. glTF reads G as a linear roughness value (matte fabric & natural skin/hair).
    roughness = (0.24, 0.20, 0.22, 0.22, 0.22, 0.52, 0.76, 0.78,
                 0.66, 0.36, 0.33, 0.38, 0.48, 0.46, 0.68, 0.66)
    size = 64
    img = bpy.data.images.new("StudioSurfaceAtlas", width=size, height=size, alpha=False)
    img.colorspace_settings.name = "Non-Color"
    pixels = []
    for y in range(size):
        for x in range(size):
            band = (y // 16) * 4 + x // 16
            pixels.extend((1.0, roughness[band], 1.0, 1.0))
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
    def base_mat(
        name,
        srgb,
        roughness=0.5,
        metallic=0.0,
        coat=0.0,
        coat_roughness=0.22,
        sheen=0.0,
        sheen_roughness=0.55,
        subsurf=0.0,
        specular=0.45,
        anisotropic=0.0,
    ):
        mat = bpy.data.materials.new(name)
        if mat.node_tree is None:
            mat.use_nodes = True
        nt = mat.node_tree
        bsdf = nt.nodes.get("Principled BSDF")
        lin = srgb_tuple(srgb)
        set_bsdf_input(bsdf, "Base Color", (*lin, 1.0))
        set_bsdf_input(bsdf, "Roughness", roughness)
        set_bsdf_input(bsdf, "Metallic", metallic)
        set_bsdf_input(bsdf, "Specular IOR Level", specular)
        set_bsdf_input(bsdf, "Coat Weight", coat)
        set_bsdf_input(bsdf, "Coat Roughness", coat_roughness)
        set_bsdf_input(bsdf, "Sheen Weight", sheen)
        set_bsdf_input(bsdf, "Sheen Roughness", sheen_roughness)
        if anisotropic > 0:
            set_bsdf_input(bsdf, "Anisotropic", anisotropic)
        if subsurf > 0:
            set_bsdf_input(bsdf, "Subsurface Weight", subsurf)
            set_bsdf_input(bsdf, "Subsurface Scale", 0.012)
            set_bsdf_input(bsdf, "Subsurface Radius", (1.0, 0.42, 0.28))
        mat.use_fake_user = True
        return mat

    mats = {
        # Luminous warm Korean porcelain-peach subsurface skin (balanced warmth & gentle SSS under AgX studio light)
        "skin": base_mat("PF5_PorcelainPeachSkin", (0.892, 0.722, 0.628), roughness=0.43, coat=0.0, sheen=0.12, sheen_roughness=0.66, subsurf=0.26, specular=0.30),
        "skin_face": base_mat("PF5_PorcelainPeachFaceSkin", (0.892, 0.722, 0.628), roughness=0.41, coat=0.0, sheen=0.14, sheen_roughness=0.64, subsurf=0.26, specular=0.32),
        "lip_tint": base_mat("PF5_CoralRoseLip", (0.842, 0.422, 0.418), roughness=0.26, coat=0.30, coat_roughness=0.15, subsurf=0.18, specular=0.42),
        "eye_white": base_mat("PF5_PearlSclera", (0.955, 0.942, 0.932), roughness=0.16, coat=0.62, coat_roughness=0.05, subsurf=0.08, specular=0.44),
        "iris_dark": base_mat("PF5_EspressoAmberIris", (0.095, 0.056, 0.040), roughness=0.06, coat=0.92, coat_roughness=0.03, specular=0.62),
        "iris_glow": base_mat("PF5_HoneyAmberIris", (0.415, 0.232, 0.132), roughness=0.10, coat=0.86, coat_roughness=0.05, specular=0.54),
        "lash_ink": base_mat("PF5_VelvetLashInk", (0.052, 0.035, 0.032), roughness=0.48, specular=0.18),
        "brow_soft": base_mat("PF5_SoftEspressoBrow", (0.128, 0.084, 0.064), roughness=0.56, specular=0.14),
        # Luxury buttery-matte ribbed athleisure jersey (botanical sage top & deep forest 7/8 leggings)
        "suit": base_mat("PF5_SuitSage", (0.192, 0.352, 0.286), roughness=0.76, coat=0.0, sheen=0.50, sheen_roughness=0.54, specular=0.16),
        "legging": base_mat("PF5_LeggingForest", (0.126, 0.248, 0.198), roughness=0.78, coat=0.0, sheen=0.50, sheen_roughness=0.56, specular=0.15),
        "suit_accent": base_mat("PF5_SuitPiping", (0.958, 0.944, 0.912), roughness=0.46, coat=0.04, sheen=0.42, specular=0.26),
        "scrunchie": base_mat("PF5_ChampagneSilkScrunchie", (0.905, 0.858, 0.778), roughness=0.32, coat=0.06, coat_roughness=0.28, sheen=0.58, sheen_roughness=0.38, specular=0.34, anisotropic=0.38),
        # Rich lustrous anisotropic silk dark-espresso hair (warm bronze-espresso sheen, zero flat-black or plastic coat spot!)
        "hair": base_mat("PF5_SilkEspressoHair", (0.064, 0.038, 0.028), roughness=0.38, coat=0.0, coat_roughness=0.40, sheen=0.12, sheen_roughness=0.52, specular=0.28, anisotropic=0.48),
        "sock": base_mat("PF5_GripSockIvory", (0.958, 0.945, 0.916), roughness=0.74, sheen=0.44, specular=0.16),
        "oak": base_mat("PF5_CathedralWhiteOak", (0.718, 0.548, 0.376), roughness=0.33, coat=0.20, coat_roughness=0.24, specular=0.44),
        "maple": base_mat("PF5_HardRockMaple", (0.822, 0.692, 0.528), roughness=0.32, coat=0.18, coat_roughness=0.24, specular=0.44),
        "walnut": base_mat("PF5_AmericanWalnut", (0.312, 0.198, 0.130), roughness=0.35, coat=0.18, coat_roughness=0.25, specular=0.40),
        "leather": base_mat("PF5_SaddleLeather", (0.452, 0.276, 0.174), roughness=0.44, coat=0.10, coat_roughness=0.32, specular=0.34),
        "pad": base_mat("PF5_PebbledSageLeather", (0.158, 0.304, 0.246), roughness=0.52, coat=0.04, coat_roughness=0.36, sheen=0.18, specular=0.26),
        "steel": base_mat("PF5_BrushedSteel", (0.845, 0.870, 0.898), roughness=0.18, metallic=1.0, anisotropic=0.40),
        "brass": base_mat("PF5_SatinBrass", (0.845, 0.682, 0.405), roughness=0.20, metallic=1.0, anisotropic=0.34),
        "charcoal": base_mat("PF5_CharcoalGrip", (0.155, 0.168, 0.178), roughness=0.68, metallic=0.0, specular=0.22),
        "strap": base_mat("PF5_CottonWebbing", (0.205, 0.222, 0.214), roughness=0.84, sheen=0.32, specular=0.14),
        "band": base_mat("PF5_LatexBand", (0.325, 0.505, 0.408), roughness=0.56, coat=0.0, specular=0.24),
        "ball": base_mat("PF5_MatteSageBall", (0.355, 0.548, 0.468), roughness=0.68, coat=0.0, sheen=0.18, specular=0.18),
        "spring_red": base_mat("PF5_SpringRed", (0.785, 0.182, 0.154), roughness=0.20, metallic=1.0),
        "spring_blue": base_mat("PF5_SpringBlue", (0.175, 0.442, 0.725), roughness=0.20, metallic=1.0),
        "spring_gold": base_mat("PF5_SpringGold", (0.875, 0.635, 0.160), roughness=0.20, metallic=1.0),
        # Luminous warm alabaster linen studio cyclorama (#FAF7F0) with grounded contact shadow fidelity
        "studio_bg": base_mat("PF5_StudioCyclorama", (0.980, 0.968, 0.944), roughness=0.92, specular=0.05),
        "studio_floor": base_mat("PF5_StudioFloor", (0.968, 0.956, 0.932), roughness=0.86, specular=0.07),
    }

    # Warm espresso-bronze specular tint on silk hair so highlights gleam warmly rather than chalky gray
    bsdf_hair_init = mats["hair"].node_tree.nodes.get("Principled BSDF")
    if bsdf_hair_init is not None:
        set_bsdf_input(bsdf_hair_init, "Specular Tint", (*srgb_tuple((0.76, 0.52, 0.38)), 1.0))

    # Wire smooth vertex-colored Korean editorial makeup (cheek blush, eyelid tint, lip halo) into skin_face
    nt_sf = mats["skin_face"].node_tree
    bsdf_sf = nt_sf.nodes.get("Principled BSDF")
    attr_blush = nt_sf.nodes.new("ShaderNodeAttribute")
    attr_blush.attribute_name = "FaceBlush"
    nt_sf.links.new(attr_blush.outputs["Color"], bsdf_sf.inputs["Base Color"])

    # True Directional Cathedral Wood Grain (richer contrast European White Oak + pore micro-detail)
    wood_palettes = {
        "oak": ((0.595, 0.432, 0.280), (0.805, 0.650, 0.478), (1.7, 15.0, 15.0)),
        "maple": ((0.765, 0.625, 0.458), (0.888, 0.775, 0.618), (1.5, 13.5, 13.5)),
        "walnut": ((0.245, 0.148, 0.095), (0.412, 0.275, 0.188), (1.8, 15.5, 15.5)),
    }
    for key, (dark_srgb, light_srgb, scale_xyz) in wood_palettes.items():
        nt = mats[key].node_tree
        bsdf = nt.nodes.get("Principled BSDF")
        tex_coord = nt.nodes.new("ShaderNodeTexCoord")
        mapping = nt.nodes.new("ShaderNodeMapping")
        mapping.inputs["Scale"].default_value = scale_xyz

        wave = nt.nodes.new("ShaderNodeTexWave")
        wave.wave_type = "BANDS"
        wave.bands_direction = "Y"
        wave.wave_profile = "SIN"
        wave.inputs["Scale"].default_value = 4.2
        wave.inputs["Distortion"].default_value = 3.9
        wave.inputs["Detail"].default_value = 5.2
        wave.inputs["Detail Scale"].default_value = 2.1

        ramp = nt.nodes.new("ShaderNodeValToRGB")
        ramp.color_ramp.elements[0].position = 0.22
        ramp.color_ramp.elements[0].color = (*srgb_tuple(dark_srgb), 1.0)
        ramp.color_ramp.elements[1].position = 0.80
        ramp.color_ramp.elements[1].color = (*srgb_tuple(light_srgb), 1.0)

        rough_map = nt.nodes.new("ShaderNodeMapRange")
        rough_map.inputs["From Min"].default_value = 0.0
        rough_map.inputs["From Max"].default_value = 1.0
        rough_map.inputs["To Min"].default_value = 0.26
        rough_map.inputs["To Max"].default_value = 0.42

        bump = nt.nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = 0.24
        bump.inputs["Distance"].default_value = 0.00085

        nt.links.new(tex_coord.outputs["Object"], mapping.inputs["Vector"])
        nt.links.new(mapping.outputs["Vector"], wave.inputs["Vector"])
        nt.links.new(wave.outputs["Fac"], ramp.inputs["Fac"])
        nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
        nt.links.new(wave.outputs["Fac"], rough_map.inputs["Value"])
        nt.links.new(rough_map.outputs["Result"], bsdf.inputs["Roughness"])
        nt.links.new(wave.outputs["Fac"], bump.inputs["Height"])
        nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])

    # Fine micro-pebble supple sage leather relief + subtle tonal variation on upholstery pad
    nt_pad = mats["pad"].node_tree
    bsdf_pad = nt_pad.nodes.get("Principled BSDF")
    tc_pad = nt_pad.nodes.new("ShaderNodeTexCoord")
    mp_pad = nt_pad.nodes.new("ShaderNodeMapping")
    mp_pad.inputs["Scale"].default_value = (210.0, 210.0, 210.0)
    ns_pad = nt_pad.nodes.new("ShaderNodeTexNoise")
    ns_pad.inputs["Scale"].default_value = 10.5
    ns_pad.inputs["Detail"].default_value = 4.2
    rm_pad = nt_pad.nodes.new("ShaderNodeMapRange")
    rm_pad.inputs["From Min"].default_value = 0.30
    rm_pad.inputs["From Max"].default_value = 0.72
    rm_pad.inputs["To Min"].default_value = 0.46
    rm_pad.inputs["To Max"].default_value = 0.58
    bm_pad = nt_pad.nodes.new("ShaderNodeBump")
    bm_pad.inputs["Strength"].default_value = 0.22
    bm_pad.inputs["Distance"].default_value = 0.00050
    nt_pad.links.new(tc_pad.outputs["Object"], mp_pad.inputs["Vector"])
    nt_pad.links.new(mp_pad.outputs["Vector"], ns_pad.inputs["Vector"])
    nt_pad.links.new(ns_pad.outputs["Fac"], rm_pad.inputs["Value"])
    nt_pad.links.new(rm_pad.outputs["Result"], bsdf_pad.inputs["Roughness"])
    nt_pad.links.new(ns_pad.outputs["Fac"], bm_pad.inputs["Height"])
    nt_pad.links.new(bm_pad.outputs["Normal"], bsdf_pad.inputs["Normal"])

    # Luxury fine ribbed athleisure knit bump for activewear (suit, legging, sock, strap)
    for fkey, fscale, fdir, fstrength in [
        ("suit", (240.0, 240.0, 32.0), "X", 0.14),
        ("legging", (280.0, 280.0, 48.0), "X", 0.12),
        ("sock", (240.0, 240.0, 240.0), "DIAGONAL", 0.14),
        ("strap", (220.0, 220.0, 220.0), "DIAGONAL", 0.17),
    ]:
        nt_f = mats[fkey].node_tree
        bsdf_f = nt_f.nodes.get("Principled BSDF")
        tc_f = nt_f.nodes.new("ShaderNodeTexCoord")
        mp_f = nt_f.nodes.new("ShaderNodeMapping")
        mp_f.inputs["Scale"].default_value = fscale
        wv_f = nt_f.nodes.new("ShaderNodeTexWave")
        wv_f.wave_type = "BANDS"
        wv_f.bands_direction = fdir
        wv_f.inputs["Scale"].default_value = 2.8
        wv_f.inputs["Distortion"].default_value = 1.2
        wv_f.inputs["Detail"].default_value = 2.6
        bm_f = nt_f.nodes.new("ShaderNodeBump")
        bm_f.inputs["Strength"].default_value = fstrength
        bm_f.inputs["Distance"].default_value = 0.00032
        nt_f.links.new(tc_f.outputs["Object"], mp_f.inputs["Vector"])
        nt_f.links.new(mp_f.outputs["Vector"], wv_f.inputs["Vector"])
        nt_f.links.new(wv_f.outputs["Fac"], bm_f.inputs["Height"])
        nt_f.links.new(bm_f.outputs["Normal"], bsdf_f.inputs["Normal"])

    # Silky combed hair-strand procedural warm-espresso dimension & anisotropic micro-bump
    nt_h = mats["hair"].node_tree
    bsdf_h = nt_h.nodes.get("Principled BSDF")
    tc_h = nt_h.nodes.new("ShaderNodeTexCoord")
    mp_h = nt_h.nodes.new("ShaderNodeMapping")
    mp_h.inputs["Scale"].default_value = (135.0, 135.0, 14.0)
    wv_h = nt_h.nodes.new("ShaderNodeTexWave")
    wv_h.wave_type = "BANDS"
    wv_h.bands_direction = "X"
    wv_h.inputs["Scale"].default_value = 5.8
    wv_h.inputs["Distortion"].default_value = 2.4
    wv_h.inputs["Detail"].default_value = 4.0
    hramp = nt_h.nodes.new("ShaderNodeValToRGB")
    hramp.color_ramp.elements[0].position = 0.22
    hramp.color_ramp.elements[0].color = (*srgb_tuple((0.038, 0.022, 0.015)), 1.0)
    hramp.color_ramp.elements[1].position = 0.86
    hramp.color_ramp.elements[1].color = (*srgb_tuple((0.128, 0.072, 0.048)), 1.0)
    hrough = nt_h.nodes.new("ShaderNodeMapRange")
    hrough.inputs["From Min"].default_value = 0.0
    hrough.inputs["From Max"].default_value = 1.0
    hrough.inputs["To Min"].default_value = 0.34
    hrough.inputs["To Max"].default_value = 0.44
    bm_h = nt_h.nodes.new("ShaderNodeBump")
    bm_h.inputs["Strength"].default_value = 0.14
    bm_h.inputs["Distance"].default_value = 0.00032
    nt_h.links.new(tc_h.outputs["Object"], mp_h.inputs["Vector"])
    nt_h.links.new(mp_h.outputs["Vector"], wv_h.inputs["Vector"])
    nt_h.links.new(wv_h.outputs["Fac"], hramp.inputs["Fac"])
    nt_h.links.new(hramp.outputs["Color"], bsdf_h.inputs["Base Color"])
    nt_h.links.new(wv_h.outputs["Fac"], hrough.inputs["Value"])
    nt_h.links.new(hrough.outputs["Result"], bsdf_h.inputs["Roughness"])
    nt_h.links.new(wv_h.outputs["Fac"], bm_h.inputs["Height"])
    nt_h.links.new(bm_h.outputs["Normal"], bsdf_h.inputs["Normal"])

    # Subtle organic micro-skin & soft matte mini-ball grain bump
    for skey, sscale, sstrength in [("skin", 460.0, 0.014), ("skin_face", 520.0, 0.010), ("ball", 240.0, 0.06)]:
        nt_s = mats[skey].node_tree
        bsdf_s = nt_s.nodes.get("Principled BSDF")
        tc_s = nt_s.nodes.new("ShaderNodeTexCoord")
        ns_s = nt_s.nodes.new("ShaderNodeTexNoise")
        ns_s.inputs["Scale"].default_value = sscale
        ns_s.inputs["Detail"].default_value = 3.0
        bm_s = nt_s.nodes.new("ShaderNodeBump")
        bm_s.inputs["Strength"].default_value = sstrength
        bm_s.inputs["Distance"].default_value = 0.00020
        nt_s.links.new(tc_s.outputs["Object"], ns_s.inputs["Vector"])
        nt_s.links.new(ns_s.outputs["Fac"], bm_s.inputs["Height"])
        nt_s.links.new(bm_s.outputs["Normal"], bsdf_s.inputs["Normal"])

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
            "skin_face": (False, 5),
            "suit": (False, 6),
            "pad": (False, 6),
            "legging": (False, 7),
            "ball": (False, 8),
            "band": (False, 8),
            "oak": (False, 9),
            "maple": (False, 10),
            "walnut": (False, 11),
            "leather": (False, 12),
            "lip_tint": (False, 12),
            "iris_glow": (False, 12),
            "hair": (False, 13),
            "iris_dark": (False, 13),
            "brow_soft": (False, 13),
            "charcoal": (False, 14),
            "lash_ink": (False, 14),
            "strap": (False, 14),
            "sock": (False, 15),
            "suit_accent": (False, 15),
            "eye_white": (False, 15),
            "scrunchie": (False, 15),
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
        mat_keys: list[str] | None = None,
    ) -> bpy.types.Object:
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

        if mat_keys:
            resolved = [self.resolve_mat_and_band(k) for k in mat_keys]
            is_metal = any(r[1] for r in resolved)
            slot_bands = [r[2] for r in resolved]
            if self.glb_mode:
                uv_layer = bm.loops.layers.uv.verify()
                band_layer = bm.faces.layers.int.get("mat_band") or bm.faces.layers.int.new("mat_band")
                for face in bm.faces:
                    b_idx = slot_bands[min(len(slot_bands) - 1, max(0, face.material_index))]
                    face[band_layer] = b_idx
                    u_min, u_max, v_min, v_max = atlas_tile_bounds(b_idx, pad=0.018)
                    uc, vc = 0.5 * (u_min + u_max), 0.5 * (v_min + v_max)
                    ru, rv = 0.42 * (u_max - u_min), 0.42 * (v_max - v_min)
                    n_loops = len(face.loops)
                    for l_i, loop in enumerate(face.loops):
                        ang = 2.0 * math.pi * l_i / max(3, n_loops)
                        loop[uv_layer].uv = (uc + ru * math.cos(ang), vc + rv * math.sin(ang))
            mesh = bpy.data.meshes.new(name)
            bm.to_mesh(mesh)
            bm.free()
            for p in mesh.polygons:
                p.use_smooth = smooth
            for r_mat, _, _ in resolved:
                mesh.materials.append(r_mat)
            obj = bpy.data.objects.new(name, mesh)
            if self.glb_mode:
                obj["slot_bands"] = slot_bands
        else:
            mat, is_metal, band = self.resolve_mat_and_band(mat_key)
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
            bev.segments = 2 if self.glb_mode else 4
            bev.limit_method = "ANGLE"
            bev.angle_limit = math.radians(32.0)
            bev.use_clamp_overlap = True
            bev.harden_normals = False

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
    return mc.emit_bmesh(name, bm, mat_key, loc=center, quat=quat, bevel_width=bw, smooth=(bw > 0.0))


def add_swept_tube(
    mc: MeshCollector,
    name: str,
    path_pts: list[Vector],
    radius: float,
    mat_key: str,
    closed: bool = False,
    radial_segs: int = 8,
    radius_scale_fn=None,
    aspect_b: float = 1.0,
    subsurf_levels: int = 0,
    surface_normal_fn=None,
) -> bpy.types.Object | None:
    """
    Sweeps a 100% closed 2-manifold quad tube along `path_pts` using parallel transport
    or surface-locked normal framing (`surface_normal_fn`) so flat hair ribbons hug curved anatomy cleanly.
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

        if surface_normal_fn is not None:
            sn = Vector(surface_normal_fn(pts[i]))
            binrm = sn - tan * sn.dot(tan)
            if binrm.length < 1e-5:
                ref = Vector((0.0, 0.0, 1.0)) if abs(tan.z) < 0.9 else Vector((1.0, 0.0, 0.0))
                binrm = tan.cross(ref)
            binrm.normalize()
            nrm = binrm.cross(tan).normalized()
            if prev_n is not None and nrm.dot(prev_n) < 0.0:
                nrm = -nrm
                binrm = -binrm
            prev_n = nrm
        else:
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
        r_here = max(0.0006, radius * (radius_scale_fn(t_u) if radius_scale_fn is not None else 1.0))
        row = []
        for s in range(radial_segs):
            a = 2.0 * math.pi * s / radial_segs
            off = nrm * (math.cos(a) * r_here) + binrm * (math.sin(a) * r_here * aspect_b)
            row.append(bm.verts.new(pts[i] + off))
        rings.append(row)

    for i in range(n_pts - 1):
        for s in range(radial_segs):
            s2 = (s + 1) % radial_segs
            bm.faces.new((rings[i][s], rings[i][s2], rings[i + 1][s2], rings[i + 1][s]))

    if closed:
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
        r0 = max(0.0006, radius * (radius_scale_fn(0.0) if radius_scale_fn is not None else 1.0))
        r1 = max(0.0006, radius * (radius_scale_fn(1.0) if radius_scale_fn is not None else 1.0))
        c_start = bm.verts.new(pts[0] - tangents[0] * (r0 * 0.45))
        c_end = bm.verts.new(pts[-1] + tangents[-1] * (r1 * 0.45))
        for s in range(radial_segs):
            s2 = (s + 1) % radial_segs
            bm.faces.new((c_start, rings[0][s2], rings[0][s]))
            bm.faces.new((rings[-1][s], rings[-1][s2], c_end))

    return mc.emit_bmesh(name, bm, mat_key, subsurf_levels=subsurf_levels)


def eval_catmull_rom_spline(ctrl_pts: list[Vector], samples_per_seg: int = 4) -> list[Vector]:
    """Evaluates a smooth C1 Catmull-Rom spline through `ctrl_pts` for kink-free silky hair & ribbons."""
    n = len(ctrl_pts)
    if n < 3:
        return [Vector(p) for p in ctrl_pts]
    pts = [Vector(p) for p in ctrl_pts]
    ext = [pts[0] * 2.0 - pts[1]] + pts + [pts[-1] * 2.0 - pts[-2]]
    out: list[Vector] = []
    for i in range(n - 1):
        p0, p1, p2, p3 = ext[i], ext[i + 1], ext[i + 2], ext[i + 3]
        for k in range(samples_per_seg):
            t = k / samples_per_seg
            t2 = t * t
            t3 = t2 * t
            pt = 0.5 * (
                (2.0 * p1)
                + (-p0 + p2) * t
                + (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * t2
                + (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * t3
            )
            out.append(pt)
    out.append(pts[-1].copy())
    return out


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
    coils: int = 15,
    coil_r: float = 0.0148,
    wire_r: float = 0.0038,
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
        add_cylinder_rod(mc, name + "_Cord", s_end, v2, 0.0040, strap_mat_key, segs=10)
        return

    u_dir = dv.normalized()
    hook_inset = min(0.018, L * 0.12)
    c1 = v1 + u_dir * hook_inset
    c2 = v2 - u_dir * hook_inset
    coil_L = (c2 - c1).length

    add_cylinder_rod(mc, name + "_PlugA", v1, c1 + u_dir * 0.008, 0.0048, "brass", segs=10, r2=coil_r * 0.72)
    add_cylinder_rod(mc, name + "_PlugB", c2 - u_dir * 0.008, v2, coil_r * 0.72, "brass", segs=10, r2=0.0048)

    steps = coils * (4 if mc.glb_mode else 10)
    r_segs = 6 if mc.glb_mode else 9
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
        for scale_r, push_t in [(0.74, 0.45), (0.32, 0.85)]:
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
# 3. STYLIZED KOREAN WEBTOON / ATELIER PRACTITIONER SCULPT
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
    """
    Flagship v4 Ultra-Appealing Korean Pilates Studio Instructor Head, Face & Layered Silk Hair:
    - Refined 7.5-head small-face V-line silhouette with sculpted cheekbones, brow bone, slender nose bridge & tip
    - Smooth vertex-colored Korean editorial makeup (`FaceBlush`): warm peach-coral cheek blush, eyelid depth & lip halo
    - Luminous multi-layer almond eyes: warm pearl sclera, glossy espresso-chestnut iris, honey-amber lower glow,
      dual starlight catchlights, winged upper eyelash ribbon, delicate lower lash accent & soft natural arched brows
    - Hydrated Cupid's-bow coral-rose lips with subtle serene warm smile
    - Lush layered silk hair: airy lifted parted crown with combed wave grooves, see-through curtain bangs,
      cheek-framing side-locks, pleated champagne silk scrunchie with trailing ribbon tails & gravity-aware ponytail
    """
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

    # Refined ~0.91x graceful 7.5-head Korean studio instructor proportions (soft oval-heart beauty)
    RX, RY, RZ = 0.0680, 0.0812, 0.0920

    def eval_head_local(nx: float, ny: float, nz: float) -> Vector:
        x = nx * RX
        y = ny * RY
        z = nz * RZ
        if ny > 0.0:
            if nz < 0.05:
                jaw_t = min(1.0, (0.05 - nz) / 1.05)
                # Soft youthful Korean oval-heart jawline (gently rounded lower cheeks -> dainty soft chin)
                x *= 1.0 - 0.28 * (jaw_t ** 1.72)
                y *= 1.0 - 0.11 * (jaw_t ** 1.18)
                chin_w = math.exp(-((nx / 0.29) ** 2)) * math.exp(-(((nz + 0.84) / 0.22) ** 2))
                y += 0.0068 * chin_w
                z -= 0.0018 * chin_w
                mento_w = math.exp(-((nx / 0.20) ** 2)) * math.exp(-(((nz + 0.65) / 0.085) ** 2))
                y -= 0.0020 * mento_w * ny
            # Gentle temple contour + soft youthful apple-cheek warmth (golden-ratio midline proportions)
            temple_w = math.exp(-(((abs(nx) - 0.85) / 0.16) ** 2)) * math.exp(-(((nz - 0.18) / 0.22) ** 2))
            x -= math.copysign(0.0022 * temple_w * max(0.0, ny + 0.2), nx)
            cheek_w = math.exp(-(((abs(nx) - 0.48) / 0.25) ** 2)) * math.exp(-(((nz + 0.20) / 0.23) ** 2))
            x += math.copysign(0.0038 * cheek_w * ny, nx)
            y += 0.0046 * cheek_w * ny
            # Subtle brow bone + gentle orbital socket recess for nested eyes on true head midline
            brow_w = math.exp(-(((abs(nx) - 0.35) / 0.24) ** 2)) * math.exp(-(((nz - 0.145) / 0.09) ** 2))
            eye_w = math.exp(-(((abs(nx) - 0.36) / 0.19) ** 2)) * math.exp(-(((nz + 0.055) / 0.13) ** 2))
            y += (0.0020 * brow_w - 0.0052 * eye_w) * ny
            # Delicate sculpted Korean nose: slender bridge, cute softly upturned tip & dainty alar wings
            bridge_w = math.exp(-((nx / 0.088) ** 2)) * math.exp(-(((nz + 0.125) / 0.19) ** 2))
            tip_w = math.exp(-((nx / 0.105) ** 2)) * math.exp(-(((nz + 0.285) / 0.088) ** 2))
            alar_w = math.exp(-(((abs(nx) - 0.135) / 0.055) ** 2)) * math.exp(-(((nz + 0.305) / 0.058) ** 2))
            subnasal_w = math.exp(-((nx / 0.14) ** 2)) * math.exp(-(((nz + 0.375) / 0.050) ** 2))
            y += (0.0096 * bridge_w + 0.0120 * tip_w + 0.0028 * alar_w - 0.0026 * subnasal_w) * ny
            z += (0.0018 * tip_w) * ny
            # Subtle philtrum & serene widened lip mound integration
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

    def eval_surface_hair_spline(ctrl_triplets: list[tuple[float, float, float]], samples_per_seg: int = 4) -> list[Vector]:
        """Interpolates (nx, nz, out_offset) via Catmull-Rom and clamps EVERY sample strictly to head surface."""
        ctrl_vecs = [Vector(c) for c in ctrl_triplets]
        dense = ctrl_vecs if mc.glb_mode else eval_catmull_rom_spline(ctrl_vecs, samples_per_seg)
        return [basis @ head_surface_pt(v.x, v.y, v.z) for v in dense]

    # 1) High-Precision Sculpted Oval-Heart Head & Cranium + Vertex-Colored Soft Editorial Makeup
    bm = bmesh.new()
    u_seg = 20 if mc.glb_mode else 36
    v_seg = 14 if mc.glb_mode else 26
    bmesh.ops.create_uvsphere(bm, u_segments=u_seg, v_segments=v_seg, radius=1.0)
    vert_normals = {}
    for v in bm.verts:
        nx, ny, nz = v.co.x, v.co.y, v.co.z
        vert_normals[v] = (nx, ny, nz)
        v.co = eval_head_local(nx, ny, nz)

    if not mc.glb_mode:
        # Use linear FLOAT_COLOR so face skin base matches neck `skin` BSDF to exact ΔE=0.00!
        color_layer = bm.loops.layers.float_color.new("FaceBlush")
        skin_base = srgb_tuple((0.892, 0.722, 0.628))
        cheek_blush = srgb_tuple((0.948, 0.588, 0.556))
        lid_tint = srgb_tuple((0.768, 0.562, 0.525))
        lip_halo = srgb_tuple((0.882, 0.525, 0.508))
        for face in bm.faces:
            for loop in face.loops:
                nx, ny, nz = vert_normals[loop.vert]
                r, g, b = skin_base
                if ny > 0.15:
                    f_w = min(1.0, (ny - 0.15) / 0.55)
                    # Ethereal, natural Korean peach-rose cheek blush + whisper of warmth on nose tip
                    blush_w = (
                        0.36 * math.exp(-(((abs(nx) - 0.45) / 0.21) ** 2)) * math.exp(-(((nz + 0.22) / 0.15) ** 2))
                        + 0.14 * math.exp(-((nx / 0.13) ** 2)) * math.exp(-(((nz + 0.285) / 0.085) ** 2))
                    ) * f_w
                    blush_w = min(0.39, blush_w)
                    r = r * (1.0 - blush_w) + cheek_blush[0] * blush_w
                    g = g * (1.0 - blush_w) + cheek_blush[1] * blush_w
                    b = b * (1.0 - blush_w) + cheek_blush[2] * blush_w
                    # Soft warm rose-taupe upper eyelid crease shading
                    lid_w = (
                        0.32 * math.exp(-(((abs(nx) - 0.36) / 0.16) ** 2)) * math.exp(-(((nz - 0.018) / 0.068) ** 2))
                    ) * f_w
                    r = r * (1.0 - lid_w) + lid_tint[0] * lid_w
                    g = g * (1.0 - lid_w) + lid_tint[1] * lid_w
                    b = b * (1.0 - lid_w) + lid_tint[2] * lid_w
                    # Soft feathered rose lip halo
                    lip_w = (
                        0.32 * math.exp(-((nx / 0.23) ** 2)) * math.exp(-(((nz + 0.515) / 0.068) ** 2))
                    ) * f_w
                    r = r * (1.0 - lip_w) + lip_halo[0] * lip_w
                    g = g * (1.0 - lip_w) + lip_halo[1] * lip_w
                    b = b * (1.0 - lip_w) + lip_halo[2] * lip_w
                loop[color_layer] = (r, g, b, 1.0)

    mc.emit_bmesh("Head_Cranium", bm, "skin_face", matrix=basis, subsurf_levels=subsurf)

    # 2) Luminous Golden-Ratio Multi-Layer Almond Eyes, Winged Eyelashes & Soft Arched Korean Brows
    for sign, side in [(-1.0, "L"), (1.0, "R")]:
        eye_dir = (fwd + right * (sign * 0.26)).normalized()
        eye_q = eye_dir.to_track_quat("Y", "Z")

        # Soft natural slightly-arched Korean eyebrow (smooth spline)
        brow_ctrl = [
            basis @ front_pt(sign * (0.160 + u_b * 0.375), 0.132 + math.sin(u_b * math.pi * 0.84) * 0.042 - u_b * 0.020, y_out=0.0014)
            for u_b in (0.0, 0.33, 0.68, 1.0)
        ]
        add_swept_tube(
            mc, f"Face_Brow_{side}",
            brow_ctrl if mc.glb_mode else eval_catmull_rom_spline(brow_ctrl, 3),
            0.0021, "brow_soft",
            closed=False, radial_segs=6, aspect_b=0.45,
            radius_scale_fn=lambda t: 0.58 + 0.44 * math.sin(t * math.pi) * (1.0 - 0.46 * t),
        )

        # Curved Pearl-Ivory Almond Sclera nestled naturally inside orbital socket on true midline
        sc_local = front_pt(sign * 0.355, -0.052, y_out=-0.0001)
        add_ellipsoid(
            mc, f"Face_Sclera_{side}", basis @ sc_local,
            0.0122, 0.0028, 0.0076, "eye_white",
            u_seg=10 if mc.glb_mode else 18, v_seg=8 if mc.glb_mode else 14, quat=eye_q,
        )

        # Glossy Espresso-Chestnut Iris + Warm Honey-Amber Lower Crescent + Dual Starlight Catchlights
        ir_local = front_pt(sign * 0.348, -0.053, y_out=0.0015)
        add_ellipsoid(
            mc, f"Face_Iris_{side}", basis @ ir_local,
            0.0072, 0.0022, 0.0076, "iris_dark",
            u_seg=10 if mc.glb_mode else 18, v_seg=8 if mc.glb_mode else 14, quat=eye_q,
        )
        if not mc.glb_mode:
            glow_local = ir_local + Vector((0.0, 0.0009, -0.0024))
            add_ellipsoid(
                mc, f"Face_IrisGlow_{side}", basis @ glow_local,
                0.0046, 0.0014, 0.0029, "iris_glow",
                u_seg=12, v_seg=8, quat=eye_q,
            )
        cl1_local = ir_local + Vector((-sign * 0.0021, 0.0018, 0.0024))
        add_ellipsoid(
            mc, f"Face_Catchlight1_{side}", basis @ cl1_local,
            0.0021, 0.0011, 0.0021, "suit_accent",
            u_seg=8, v_seg=6, quat=eye_q,
        )
        if not mc.glb_mode:
            cl2_local = ir_local + Vector((sign * 0.0022, 0.0016, -0.0022))
            add_ellipsoid(
                mc, f"Face_Catchlight2_{side}", basis @ cl2_local,
                0.0010, 0.0008, 0.0010, "suit_accent",
                u_seg=8, v_seg=6, quat=eye_q,
            )

        # Graceful Winged Upper Eyelash Ribbon hugging sclera rim seamlessly
        lash_ctrl = [
            basis @ front_pt(
                sign * (0.185 + u_l * 0.360),
                -0.048 + math.sin(u_l * math.pi * 0.90) * 0.074 + (0.016 if u_l > 0.80 else 0.0),
                y_out=0.0016 if u_l < 0.88 else 0.0009,
            )
            for u_l in (0.0, 0.25, 0.55, 0.82, 1.0)
        ]
        add_swept_tube(
            mc, f"Face_Lash_{side}",
            lash_ctrl if mc.glb_mode else eval_catmull_rom_spline(lash_ctrl, 3),
            0.0024, "lash_ink",
            closed=False, radial_segs=6, aspect_b=0.38,
            radius_scale_fn=lambda t: 0.42 + 0.80 * math.sin(min(1.0, t * 1.05) * math.pi * 0.86),
        )
        if not mc.glb_mode:
            lower_lash_ctrl = [
                basis @ front_pt(sign * (0.31 + u_ll * 0.20), -0.106 + u_ll * 0.024, y_out=0.0012)
                for u_ll in (0.0, 0.5, 1.0)
            ]
            add_swept_tube(
                mc, f"Face_LowerLash_{side}", eval_catmull_rom_spline(lower_lash_ctrl, 3), 0.00095, "brow_soft",
                closed=False, radial_segs=6, aspect_b=0.45,
                radius_scale_fn=lambda t: 0.42 + 0.58 * math.sin(t * math.pi),
            )

    # 3) Graceful, Softly Widened Hydrated MLBB Coral-Rose Lips with Cupid's Bow & Warm Serene Smile
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
    add_swept_tube(
        mc, "Face_LipUpper",
        lip_u_ctrl if mc.glb_mode else eval_catmull_rom_spline(lip_u_ctrl, 3),
        0.0024, "lip_tint",
        closed=False, radial_segs=6 if mc.glb_mode else 8, aspect_b=0.58,
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
    add_swept_tube(
        mc, "Face_LipLower",
        lip_l_ctrl if mc.glb_mode else eval_catmull_rom_spline(lip_l_ctrl, 3),
        0.0029, "lip_tint",
        closed=False, radial_segs=6 if mc.glb_mode else 8, aspect_b=0.64,
        radius_scale_fn=lambda t: 0.18 + 0.86 * (math.sin(t * math.pi) ** 0.82),
    )

    # 4) Dainty Tucked Anatomical Ears with Delicate Helix Rim
    for sign, side in [(-1.0, "L"), (1.0, "R")]:
        bm_e = bmesh.new()
        bmesh.ops.create_uvsphere(bm_e, u_segments=12 if mc.glb_mode else 18, v_segments=10 if mc.glb_mode else 14, radius=1.0)
        flare = math.radians(10.0 * sign)
        cf, sf = math.cos(flare), math.sin(flare)
        for v in bm_e.verts:
            ux, uy, uz = v.co.x, v.co.y, v.co.z
            rad_yz = math.hypot(uy * 0.92, uz * 0.78)
            ang_yz = math.atan2(uz, -sign * uy)
            helix_arc = max(0.0, 1.0 - max(0.0, math.cos(ang_yz - 0.35) - 0.55) * 1.6)
            helix_roll = math.exp(-(((rad_yz - 0.76) / 0.17) ** 2)) * helix_arc
            concha_cup = math.exp(-((rad_yz / 0.46) ** 2))
            lat_relief = sign * (0.0028 * helix_roll - 0.0024 * concha_cup * (1.0 if sign * ux > 0 else -0.3))
            lobe_taper = 1.0 - 0.28 * max(0.0, -uz - 0.25)
            lx = ux * 0.0046 + lat_relief
            ly = uy * 0.0115 * lobe_taper
            lz = uz * 0.0200
            rx_e = lx * cf - ly * sf
            ry_e = lx * sf + ly * cf
            v.co = (rx_e + sign * 0.0642, ry_e - 0.007, lz - 0.014)
        mc.emit_bmesh(f"Ear_Helix_{side}", bm_e, "skin", matrix=basis, subsurf_levels=0 if mc.glb_mode else 1)

    # 5) Lush Volumetric Korean Silk Hair Crown with Soft Natural Parting & Swept-Down Nape Hairline
    def _smoothstep(e0: float, e1: float, x: float) -> float:
        t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
        return t * t * (3.0 - 2.0 * t)

    bm_h = bmesh.new()
    bmesh.ops.create_uvsphere(bm_h, u_segments=20 if mc.glb_mode else 36, v_segments=14 if mc.glb_mode else 26, radius=1.0)
    for v in bm_h.verts:
        nx, ny, nz = v.co.x, v.co.y, v.co.z
        # Soft curved hairline framing forehead & temples smoothly (hiding bang roots cleanly inside crown!)
        hairline_z = 0.42 - 0.22 * abs(nx) - 0.04 * math.exp(-(((nx - 0.08) / 0.16) ** 2))
        face_mask = max(0.0, ny - 0.14) * max(0.0, hairline_z - nz)
        if face_mask > 0.0:
            inset = min(0.034, face_mask * 0.112)
            v.co = (nx * (RX - inset), ny * (RY - inset * 1.40), nz * (RZ - 0.002))
        elif nz < -0.58 and ny > -0.12:
            v.co = (nx * 0.044, ny * 0.050, nz * 0.072)
        else:
            crown_lift = 0.0095 * (max(0.0, nz) ** 1.2)
            side_fluff = 0.0058 * math.exp(-(((nz - 0.16) / 0.36) ** 2)) * abs(nx)
            back_gather = 0.0058 * math.exp(-((nx / 0.38) ** 2)) * math.exp(-(((nz - 0.42) / 0.30) ** 2)) * max(0.0, -ny)
            part_groove = -0.0032 * math.exp(-(((nx - 0.08) / 0.09) ** 2)) * max(0.0, nz - 0.32) * max(0.0, ny + 0.30)
            strand_ang = math.atan2(nx, nz + 0.35)
            combed_wave = 0.0008 * math.sin(strand_ang * 18.0 + ny * 2.5) * (1.0 - max(0.0, -nz - 0.4))
            nape_w = _smoothstep(-0.08, -0.45, ny) * _smoothstep(-0.08, -0.78, nz)
            nape_taper = 1.0 - 0.22 * nape_w
            nape_drop = -0.017 * nape_w
            v.co = (
                nx * (RX + 0.0082 + side_fluff + combed_wave) * nape_taper,
                (ny * (RY + 0.0088 + back_gather) - 0.0045) * (1.0 - 0.14 * nape_w),
                nz * (RZ + 0.0058) + 0.0040 + crown_lift + part_groove + combed_wave * 0.5 + nape_drop,
            )
    mc.emit_bmesh("Hair_Crown", bm_h, "hair", matrix=basis, subsurf_levels=subsurf)

    # 6) Surface-Clamped Forehead/Temple/Cheek-Hugging Korean Curtain Bangs & Side Locks
    # Every spline sample is radially clamped onto `eval_head_local` -> ZERO protruding spikes in supine or tilted poses!
    hair_sub = 0 if mc.glb_mode else 1
    skull_out_normal = lambda pt: (pt - skull_center).normalized()
    if not mc.glb_mode:
        for w_tag, w_triplets in [
            ("Hair_SoftFringeL", [(0.05, 0.80, -0.0055), (-0.05, 0.54, 0.0011), (-0.20, 0.35, 0.0009), (-0.34, 0.24, 0.0001)]),
            ("Hair_SoftFringeR", [(0.07, 0.80, -0.0055), (0.16, 0.54, 0.0011), (0.30, 0.35, 0.0009), (0.43, 0.24, 0.0001)]),
        ]:
            pts = eval_surface_hair_spline(w_triplets, 4)
            add_swept_tube(
                mc, w_tag, pts, 0.0056, "hair",
                closed=False, radial_segs=8, aspect_b=0.16,
                radius_scale_fn=lambda t: (0.20 + 0.85 * math.sin(min(1.0, t * 1.04) * math.pi * 0.88)) * max(0.08, 1.0 - 0.84 * (t ** 1.45)),
                subsurf_levels=hair_sub,
                surface_normal_fn=skull_out_normal,
            )

    for sign, side in [(-1.0, "L"), (1.0, "R")]:
        # Sleek surface-clamped sweeping curtain bangs arcing from crown parting smoothly into the side crown above the ear!
        curtain_triplets = [
            (sign * 0.04,  0.84, -0.0060),
            (sign * 0.25,  0.60,  0.0012),
            (sign * 0.52,  0.34,  0.0015),
            (sign * 0.74,  0.11,  0.0009),
            (sign * 0.86, -0.04, -0.0018),
        ]
        add_swept_tube(
            mc, f"Hair_CurtainMain_{side}",
            eval_surface_hair_spline(curtain_triplets, 4),
            0.0108, "hair",
            closed=False, radial_segs=6 if mc.glb_mode else 8, aspect_b=0.16,
            radius_scale_fn=lambda t: (0.24 + 0.86 * math.sin(min(1.0, t * 1.02) * math.pi * 0.90)) * max(0.10, 1.0 - 0.72 * (t ** 1.55)),
            subsurf_levels=hair_sub,
            surface_normal_fn=skull_out_normal,
        )

        # Soft tucked temple-hair frame merging seamlessly from the crown hairline right beside the ear
        sidelock_triplets = [
            (sign * 0.91,  0.20, -0.0025),
            (sign * 0.95,  0.02,  0.0005),
            (sign * 0.95, -0.11,  0.0004),
            (sign * 0.91, -0.22, -0.0006),
            (sign * 0.85, -0.29, -0.0018),
        ]
        add_swept_tube(
            mc, f"Hair_SideLock_{side}",
            eval_surface_hair_spline(sidelock_triplets, 4),
            0.0062, "hair",
            closed=False, radial_segs=6 if mc.glb_mode else 8, aspect_b=0.16,
            radius_scale_fn=lambda t: (0.38 + 0.70 * math.sin(t * math.pi * 0.85)) * max(0.08, 1.0 - 0.86 * (t ** 1.45)),
            subsurf_levels=hair_sub,
            surface_normal_fn=skull_out_normal,
        )

    # 7) Chic High-Mid Pleated Champagne Satin Silk Scrunchie + Multi-Layered Flowing Silk Ponytail
    tie_local = Vector((0.0, -0.089, 0.048))
    tie_world = basis @ tie_local
    tie_axis = (-fwd * 0.80 + up * 0.60).normalized()
    tie_u = right
    tie_v = tie_axis.cross(tie_u).normalized()

    sc_pts = []
    n_sc = 22 if mc.glb_mode else 34
    for k in range(n_sc):
        a = 2.0 * math.pi * k / n_sc
        pleat = 1.0 + 0.12 * math.sin(a * 10.0) + 0.04 * math.cos(a * 20.0)
        sc_pts.append(tie_world + tie_u * (math.cos(a) * 0.0245 * pleat) + tie_v * (math.sin(a) * 0.0245 * pleat))
    add_swept_tube(
        mc, "Hair_Scrunchie", sc_pts, 0.0090, "scrunchie",
        closed=True, radial_segs=8 if mc.glb_mode else 12,
        radius_scale_fn=lambda t: 0.85 + 0.19 * math.sin(t * 2.0 * math.pi * 10.0),
        subsurf_levels=hair_sub,
    )

    # Smart gravity-aware cascading direction (upright cascade vs headrest-clearing supine sweep)
    grav = Vector((0.0, 0.0, -1.0))
    is_supine = (up.z <= 0.24 and fwd.z > 0.25)
    if up.z > 0.24:
        tail_flow = (-fwd * 0.52 - up * 0.64 + grav * 0.44).normalized()
        tail_lift = (up * 0.74 - fwd * 0.38).normalized()
    elif is_supine:
        tail_flow = (up * 0.84 - fwd * 0.42).normalized()
        tail_lift = (fwd * 0.62 + up * 0.45).normalized()
    elif up.z < -0.24:
        tail_flow = (-fwd * 0.60 + grav * 0.68).normalized()
        tail_lift = (-fwd * 0.68 - up * 0.38).normalized()
    else:
        tail_flow = (-fwd * 0.66 - up * 0.56).normalized()
        tail_lift = (-fwd * 0.52 + up * 0.68).normalized()

    tail_lat = tail_flow.cross(tail_lift)
    if tail_lat.length < 1e-4:
        tail_lat = right
    tail_lat.normalize()
    tail_lift = tail_lat.cross(tail_flow).normalized()

    def clamp_hair_pt(pt: Vector) -> Vector:
        min_z = max(0.038, skull_center.z - 0.036) if is_supine else 0.038
        if pt.z < min_z:
            return Vector((pt.x, pt.y, min_z))
        return pt

    # Cohesive, multi-layered flowing silk S-wave ponytail (lush silhouette, ZERO spiky separation!)
    strand_specs = [
        ("MainVolume",     0.195, 0.0285, 0.76,  0.000, 0.038,  0.003, 0.011),
        ("UpperCrownWave", 0.205, 0.0185, 0.54,  0.000, 0.050, -0.003, 0.013),
        ("FlowL",          0.202, 0.0165, 0.52, -0.014, 0.042, -0.007, 0.012),
        ("FlowR",          0.202, 0.0165, 0.52,  0.014, 0.042,  0.007, 0.012),
        ("UnderFlow",      0.190, 0.0170, 0.58,  0.000, 0.022,  0.002, 0.006),
    ]
    if not mc.glb_mode:
        strand_specs.extend([
            ("SilkRibbonL", 0.214, 0.0100, 0.38, -0.010, 0.032,  0.008, -0.005),
            ("SilkRibbonR", 0.214, 0.0100, 0.38,  0.010, 0.032, -0.008, -0.005),
        ])
    for stag, slen, srad, s_asp, lat_o, lift_a, sw_lat, sw_lift in strand_specs:
        n_seg = 10 if mc.glb_mode else 22
        s_pts = []
        for k in range(n_seg):
            t = k / (n_seg - 1)
            # Smooth C-inf sine S-wave: buoyant root arch -> silky teardrop body -> gracefully tapered tail tip
            arch = math.sin(min(1.0, t * 1.24) * math.pi) * lift_a + math.sin(t * math.pi * 1.65) * sw_lift * (t ** 0.88)
            lat = lat_o * (0.20 + 0.82 * math.sin(t * math.pi * 0.82)) + math.sin(t * math.pi * 1.35) * sw_lat * (t ** 0.90)
            p = tie_world + tail_flow * ((t ** 0.95) * slen) + tail_lift * arch + tail_lat * lat
            s_pts.append(clamp_hair_pt(p))
        add_swept_tube(
            mc, f"Hair_Ponytail_{stag}", s_pts, srad, "hair",
            closed=False, radial_segs=8 if mc.glb_mode else 14, aspect_b=s_asp,
            radius_scale_fn=lambda t: (0.56 + 0.70 * math.sin(min(1.0, t * 1.08) * math.pi * 0.82)) * max(0.06, 1.0 - 0.92 * (t ** 1.50)),
            subsurf_levels=hair_sub,
        )

    # Soft dainty champagne satin scrunchie ribbon bow-tails flowing smoothly along the ponytail
    if not mc.glb_mode:
        for r_sign, r_tag, r_len in [(-1.0, "L", 0.072), (1.0, "R", 0.086)]:
            rib_ctrl = [
                clamp_hair_pt(
                    tie_world
                    + tail_flow * (0.010 + t * r_len)
                    + tail_lat * (r_sign * (0.017 + 0.016 * (t ** 0.82)))
                    + tail_lift * (0.004 + 0.011 * math.sin(t * math.pi) - 0.008 * t)
                )
                for t in (0.0, 0.35, 0.72, 1.0)
            ]
            add_swept_tube(
                mc, f"Hair_ScrunchieRibbon_{r_tag}", eval_catmull_rom_spline(rib_ctrl, 4), 0.0048, "scrunchie",
                closed=False, radial_segs=8, aspect_b=0.25,
                radius_scale_fn=lambda t: 0.55 + 0.50 * math.sin(t * math.pi * 0.85),
                subsurf_levels=1,
            )


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
    bar_grip=None,
):
    if bar_grip is None:
        fdir, lat, dorsal = compute_hand_frame(side, forearm_dir, body_right, ant_n, supinate_up=supinate_up)
    else:
        fdir, lat, dorsal = bar_grip

    # Slender, graceful Pilates dancer palm seamlessly continuing the delicate wrist
    palm_len = 0.065
    palm_stations = []
    for u_p, wx, wy_dors, wy_palm, arch_cup in [
        (-0.10, 0.019, 0.013, 0.013, 0.0000),
        (0.22, 0.028, 0.0115, 0.0135, 0.0018),
        (0.56, 0.033, 0.0105, 0.0125, 0.0036),
        (0.84, 0.0335, 0.0095, 0.0105, 0.0026),
        (1.00, 0.0305, 0.0080, 0.0088, 0.0010),
    ]:
        c = wrist + fdir * (palm_len * u_p)

        def palm_prof(th, a=wx, bd=wy_dors, bp=wy_palm, cup=arch_cup):
            ct, st = math.cos(th), math.sin(th)
            if st >= 0:
                y = st * bd * (1.0 + 0.08 * (1.0 - ct * ct))
            else:
                eminence = 1.0 + 0.20 * math.exp(-(((ct - 0.58) / 0.34) ** 2)) + 0.14 * math.exp(-(((ct + 0.62) / 0.32) ** 2))
                central_hollow = cup * math.exp(-((ct / 0.42) ** 2)) * (-st)
                y = st * bp * eminence + central_hollow
            return ct * a, y

        palm_stations.append((c, lat, dorsal, palm_prof))

    build_loft_from_stations(
        mc,
        f"Hand_Palm_{side}",
        palm_stations,
        "skin",
        radial_segs=14 if mc.glb_mode else 24,
        cap_start=0.005,
        cap_end=0.005,
        subsurf_levels=1,
    )

    th_p0 = wrist + fdir * 0.012 + lat * 0.018 - dorsal * 0.004
    th_p1 = th_p0 + (fdir * 0.68 + lat * 0.62 - dorsal * 0.34).normalized() * 0.022
    th_p2 = th_p1 + (fdir * 0.82 + lat * 0.30 - dorsal * 0.44).normalized() * 0.020
    th_p3 = th_p2 + (fdir * 0.92 + lat * 0.06 - dorsal * 0.38).normalized() * 0.016
    thumb_pts = [th_p0, th_p0.lerp(th_p1, 0.55), th_p1, th_p2, th_p3]
    thumb_radii = [(0.0088, 0.0080), (0.0076, 0.0070), (0.0068, 0.0064), (0.0058, 0.0054), (0.0046, 0.0042)]
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
        radial_segs=8 if mc.glb_mode else 12,
        cap_start=0.004,
        cap_end=0.004,
        subsurf_levels=0 if mc.glb_mode else 1,
    )

    # Graceful, softly gathered Pilates dancer fingers (zero wide fork gaps)
    finger_specs = [
        ("Idx",  0.66, 0.060, 0.0062,  0.012, 0.15),
        ("Mid",  0.22, 0.066, 0.0065,  0.000, 0.21),
        ("Rng", -0.22, 0.061, 0.0060, -0.010, 0.27),
        ("Pnk", -0.64, 0.049, 0.0052, -0.020, 0.33),
    ]
    for fname, lat_u, flen, frad, splay, curl in finger_specs:
        mcp = wrist + fdir * (palm_len * 0.92) + lat * (lat_u * 0.0235) - dorsal * (0.0014 * (lat_u ** 2))
        d1 = (fdir * 0.97 + lat * splay - dorsal * (curl * 0.7)).normalized()
        d2 = (fdir * 0.91 + lat * (splay * 0.7) - dorsal * (curl * 1.45)).normalized()
        d3 = (fdir * 0.82 + lat * (splay * 0.4) - dorsal * (curl * 1.95)).normalized()
        pip = mcp + d1 * (flen * 0.44)
        dip = pip + d2 * (flen * 0.31)
        tip = dip + d3 * (flen * 0.25)
        f_pts = [mcp - d1 * 0.004, mcp.lerp(pip, 0.5), pip, dip, tip]
        if bar_grip is not None:
            axis_point = wrist + fdir * 0.062 - dorsal * 0.021 + lat * (lat_u * 0.026)
            radius = 0.0180 + frad * 0.82
            f_pts = [
                axis_point + radius * (fdir * math.sin(t * flen / radius)
                                       + dorsal * math.cos(t * flen / radius))
                for t in (0.0, 0.22, 0.44, 0.75, 1.0)
            ]
        f_scales = [1.05, 0.92, 0.92, 0.76, 0.56]
        f_stations = []
        for idx_f, (fp, sc) in enumerate(zip(f_pts, f_scales)):
            tan_f = (f_pts[min(len(f_pts) - 1, idx_f + 1)] - f_pts[max(0, idx_f - 1)]).normalized()
            ax_f = lat - tan_f * lat.dot(tan_f)
            if ax_f.length < 1e-4:
                ax_f = tan_f.cross(dorsal)
            ax_f.normalize()
            ay_f = tan_f.cross(ax_f).normalized()
            rx_f = frad * sc
            ry_f = frad * sc * 0.88
            f_stations.append((fp, ax_f, ay_f, lambda th, a=rx_f, b=ry_f: (math.cos(th) * a, math.sin(th) * b)))
        build_loft_from_stations(
            mc,
            f"Finger_{fname}_{side}",
            f_stations,
            "skin",
            radial_segs=8 if mc.glb_mode else 12,
            cap_start=0.0035,
            cap_end=0.0035,
            subsurf_levels=0 if mc.glb_mode else 1,
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
        point_ang = math.radians(28.0 if ankle.z > 0.24 else 10.0)
        foot_fwd = (ant_tib * math.cos(point_ang) + shin_down * math.sin(point_ang)).normalized()
        foot_up = (shin_up * math.cos(point_ang) + ant_tib * math.sin(point_ang)).normalized()

    foot_lat = foot_fwd.cross(foot_up).normalized()
    med_sign = 1.0 if side == "L" else -1.0

    # Sleek low-cut ivory ballet grip sock cuff (revealing dainty bare ankle above!)
    cuff_top = knee.lerp(ankle, 0.945)
    cuff_stations = []
    for u_c, r_lat, r_ap, mal_flare in [
        (0.00, 0.0285, 0.0315, 0.0012),
        (0.55, 0.0280, 0.0310, 0.0032),
        (1.05, 0.0270, 0.0300, 0.0016),
    ]:
        c = cuff_top.lerp(ankle, u_c)

        def cuff_prof(th, a=r_lat, b=r_ap, mf=mal_flare, ms=med_sign):
            ct, st = math.cos(th), math.sin(th)
            med_w = math.exp(-(((ct - ms * 0.92) / 0.28) ** 2)) * math.exp(-(((st - 0.14) / 0.42) ** 2))
            lat_w = math.exp(-(((ct + ms * 0.92) / 0.28) ** 2)) * math.exp(-(((st + 0.16) / 0.42) ** 2))
            achilles_pinch = -0.0022 * math.exp(-((ct / 0.34) ** 2)) * max(0.0, -st)
            dx = ct * a + math.copysign(mf * (med_w + lat_w), ct)
            dy = st * b + achilles_pinch
            return dx, dy

        cuff_stations.append((c, foot_lat, ant_tib, cuff_prof))

    build_loft_from_stations(
        mc,
        f"Sock_Cuff_{side}",
        cuff_stations,
        "sock",
        radial_segs=12 if mc.glb_mode else 18,
        cap_start=0.004,
        cap_end=0.005,
        subsurf_levels=0 if mc.glb_mode else 1,
    )

    # Graceful, slender dancer foot with sculpted high medial arch & delicate tapered toebox
    foot_stations = []
    specs = [
        (-0.042, -0.015, 0.0215, 0.0235, 0.000),
        (-0.006, -0.014, 0.0265, 0.0275, 0.0015),
        (0.044, -0.014, 0.0260, 0.0210, 0.0080),
        (0.094, -0.021, 0.0335, 0.0150, 0.0012),
        (0.136, -0.023, 0.0245, 0.0102, 0.000),
    ]
    for f_off, u_off, hw, hh, arch_lift in specs:
        c = ankle + foot_fwd * f_off + foot_up * u_off

        def foot_prof(th, a=hw, b=hh, al=arch_lift, ms=med_sign):
            st = math.sin(th)
            ct = math.cos(th)
            if st < 0:
                medial_arch = al * math.exp(-(((ct - ms * 0.42) / 0.48) ** 2)) * (-st)
                y_val = st * b * 0.58 + medial_arch
            else:
                y_val = st * b * 1.12
            return ct * a, y_val

        foot_stations.append((c, foot_lat, foot_up, foot_prof))

    build_loft_from_stations(
        mc,
        f"Foot_Sculpt_{side}",
        foot_stations,
        "sock",
        radial_segs=14 if mc.glb_mode else 28,
        cap_start=0.008,
        cap_end=0.010,
        subsurf_levels=subsurf,
    )

    # Delicate crisscross botanical-sage ballet elastic instep straps hugging cleanly above the instep
    for strap_tag, s0, s1 in [("CrossA", -1.0, 1.0), ("CrossB", 1.0, -1.0)]:
        strap_ctrl = [
            ankle + foot_fwd * 0.010 + foot_lat * (s0 * 0.0285) + foot_up * (-0.014),
            ankle + foot_fwd * 0.044 + foot_lat * (s0 * 0.008) + foot_up * 0.0135,
            ankle + foot_fwd * 0.076 + foot_lat * (s1 * 0.0305) + foot_up * (-0.013),
        ]
        add_swept_tube(
            mc, f"Sock_BalletStrap_{strap_tag}_{side}",
            strap_ctrl if mc.glb_mode else eval_catmull_rom_spline(strap_ctrl, 4),
            0.0024, "suit",
            closed=False, radial_segs=6, aspect_b=0.45,
        )


def _extrude_seamless_limb_from_hole(
    bm: bmesh.types.BMesh,
    hole_verts: list,
    limb_start_dir: Vector,
    station_specs: list[tuple[Vector, Vector, Vector, callable, int]],
    cap_end: float = 0.006,
    socket_s_pair: tuple[float, float] = (0.025, 0.065),
    station0_s: float = 0.10,
) -> list:
    """
    Extrudes a zero-twist, 100% closed 2-manifold quad limb directly from an existing
    open vertex loop (`hole_verts`) on the torso/pelvis mesh — eliminating ALL hip and shoulder seams!
    Inserts 2 smooth transition socket rings (`s=0.025, 0.065`) rotating gradually via quaternion slerp
    from the hole normal to the limb departure direction while smoothly morphing the hole contour.
    Returns `[ordered_hole + socket_ring_0 + socket_ring_1]` for selective Laplacian socket smoothing.
    """
    M = len(hole_verts)
    hc = sum((v.co for v in hole_verts), Vector((0.0, 0.0, 0.0))) / M

    # Compute average loop normal via Newell fan; orient loop so normal points along `limb_start_dir`
    hn = Vector((0.0, 0.0, 0.0))
    for k in range(M):
        v0 = hole_verts[k].co - hc
        v1 = hole_verts[(k + 1) % M].co - hc
        hn += v0.cross(v1)
    if hn.length < 1e-6:
        hn = limb_start_dir.normalized()
    else:
        hn.normalize()
    ordered_hole = list(hole_verts)
    if hn.dot(limb_start_dir) < 0.0:
        ordered_hole.reverse()
        hn = -hn

    # Build orthonormal hole basis (hx, hy, hn) and record each hole vertex's exact cyclic coords
    ref = Vector((0.0, 0.0, 1.0)) if abs(hn.z) < 0.85 else Vector((1.0, 0.0, 0.0))
    hx = (ref - hn * ref.dot(hn)).normalized()
    hy = hn.cross(hx).normalized()

    raw_phis = []
    hole_local_uv = []
    hole_local_w = []
    for v in ordered_hole:
        dv = v.co - hc
        uh = dv.dot(hx)
        vh = dv.dot(hy)
        wh = dv.dot(hn)
        hole_local_uv.append((uh, vh))
        hole_local_w.append(wh)
        raw_phis.append(math.atan2(vh, uh))

    # Unwrap raw_phis monotonically so smooth relaxation toward uniform angles preserves cyclic order
    unwrapped = [raw_phis[0]]
    for k in range(1, M):
        diff = raw_phis[k] - raw_phis[k - 1]
        while diff <= -math.pi:
            diff += 2.0 * math.pi
        while diff > math.pi:
            diff -= 2.0 * math.pi
        unwrapped.append(unwrapped[-1] + diff)
    span_sign = 1.0 if (unwrapped[-1] - unwrapped[0]) >= 0.0 else -1.0
    phi0_base = unwrapped[0]

    # Parallel-transport (hx, hy, hn) onto station 0 via shortest-arc quaternion -> ZERO twist!
    pt0, t0_raw, f_hint0, prof0, mat0 = station_specs[0]
    t0 = t0_raw.normalized()
    q0 = hn.rotation_difference(t0)
    ax0 = (q0 @ hx).normalized()
    ax0 = (ax0 - t0 * ax0.dot(t0)).normalized()
    ay0 = t0.cross(ax0).normalized()

    # Precompute station-0 target offsets in (ax0, ay0) so the 2 socket rings morph seamlessly from the hole contour
    f_anat0 = f_hint0 - t0 * f_hint0.dot(t0)
    if f_anat0.length < 1e-4:
        f_anat0 = ay0
    else:
        f_anat0.normalize()
    lat_anat0 = f_anat0.cross(t0).normalized()
    relax0 = 0.72
    relax0 = relax0 * relax0 * (3.0 - 2.0 * relax0)
    st0_uv = []
    for k in range(M):
        uni_phi = phi0_base + span_sign * (2.0 * math.pi * k / M)
        phi_k = unwrapped[k] * (1.0 - relax0) + uni_phi * relax0
        dir_v = ax0 * math.cos(phi_k) + ay0 * math.sin(phi_k)
        th_anat = math.atan2(dir_v.dot(f_anat0), dir_v.dot(lat_anat0))
        dx0, dy0 = prof0(th_anat)
        off0 = lat_anat0 * dx0 + f_anat0 * dy0
        st0_uv.append((off0.dot(ax0), off0.dot(ay0)))

    # 2 smooth transition socket rings (s=0.025, 0.065) rotating gradually from `hn` -> `t0`
    prev_ring = ordered_hole
    socket_rings = []
    chord_l = (pt0 - hc).length
    bend_cos = max(-1.0, min(1.0, hn.dot(t0)))
    # Avoid hairpin overshoot on deeply flexed joints (>60 deg) by keeping socket spine cleanly convex
    if bend_cos >= 0.55:
        ctrl_socket = hc.lerp(pt0, 0.5) + (hn - t0) * (chord_l * 0.10)
    else:
        bisect = hn + t0
        if bisect.length > 1e-4:
            bisect.normalize()
        else:
            bisect = (pt0 - hc).normalized()
        ctrl_socket = hc.lerp(pt0, 0.5) + bisect * (chord_l * 0.08)
    q_ident = Quaternion()
    s0_denom = max(1e-4, station0_s)
    for s_sock in socket_s_pair:
        u_tr = max(0.18, min(0.82, s_sock / s0_denom))
        sw = u_tr * u_tr * (3.0 - 2.0 * u_tr)
        c_s = bezier3(hc, ctrl_socket, pt0, u_tr)
        q_s = q_ident.slerp(q0, sw)
        n_s = (q_s @ hn).normalized()
        ax_s = (q_s @ hx)
        ax_s = (ax_s - n_s * ax_s.dot(n_s)).normalized()
        ay_s = n_s.cross(ax_s).normalized()
        # Subtle +4.5% fillet fullness compensates for Laplacian smoothing shrinkage
        fillet = 1.0 + 0.045 * math.sin(math.pi * sw)
        row_s = []
        for k in range(M):
            uh, vh = hole_local_uv[k]
            ut, vt = st0_uv[k]
            uk = (uh * (1.0 - sw) + ut * sw) * fillet
            vk = (vh * (1.0 - sw) + vt * sw) * fillet
            wk = hole_local_w[k] * ((1.0 - sw) ** 1.35)
            row_s.append(bm.verts.new(c_s + ax_s * uk + ay_s * vk + n_s * wk))
        for k in range(M):
            k2 = (k + 1) % M
            f = bm.faces.new((prev_ring[k], prev_ring[k2], row_s[k2], row_s[k]))
            f.material_index = mat0
        prev_ring = row_s
        socket_rings.append(row_s)

    cur_ax = ax0
    cur_ay = ay0
    prev_tan = t0
    last_center = station_specs[-1][0]
    last_f_anat = station_specs[-1][2]
    last_prof = station_specs[-1][3]
    last_mat = station_specs[-1][4]
    last_lat = cur_ax

    for j, (pt, tan_raw, f_hint, prof_fn, mat_idx) in enumerate(station_specs):
        tan = tan_raw.normalized()
        if j > 0:
            q_step = prev_tan.rotation_difference(tan)
            cur_ax = (q_step @ cur_ax)
            cur_ax = (cur_ax - tan * cur_ax.dot(tan))
            if cur_ax.length < 1e-5:
                r2 = Vector((0.0, 0.0, 1.0)) if abs(tan.z) < 0.85 else Vector((1.0, 0.0, 0.0))
                cur_ax = (r2 - tan * r2.dot(tan))
            cur_ax.normalize()
            cur_ay = tan.cross(cur_ax).normalized()
        prev_tan = tan

        # Anatomical anterior & lateral axes at this station for accurate patella/calf/deltoid relief
        f_anat = f_hint - tan * f_hint.dot(tan)
        if f_anat.length < 1e-4:
            f_anat = cur_ay
        else:
            f_anat.normalize()
        lat_anat = f_anat.cross(tan).normalized()
        last_lat = lat_anat
        last_f_anat = f_anat

        relax = min(1.0, (j + 2.2) / 3.0)
        relax = relax * relax * (3.0 - 2.0 * relax)
        row = []
        for k in range(M):
            uni_phi = phi0_base + span_sign * (2.0 * math.pi * k / M)
            phi_k = unwrapped[k] * (1.0 - relax) + uni_phi * relax
            dir_v = cur_ax * math.cos(phi_k) + cur_ay * math.sin(phi_k)
            th_anat = math.atan2(dir_v.dot(f_anat), dir_v.dot(lat_anat))
            dx, dy = prof_fn(th_anat)
            row.append(bm.verts.new(pt + lat_anat * dx + f_anat * dy))

        for k in range(M):
            k2 = (k + 1) % M
            f = bm.faces.new((prev_ring[k], prev_ring[k2], row[k2], row[k]))
            f.material_index = mat_idx
        prev_ring = row

    # Smooth 2-ring dome cap at limb end (tucked cleanly inside palm / ballet sock)
    tan_end = prev_tan
    for scale_r, push_t in [(0.70, 0.45), (0.30, 0.85)]:
        nrow = []
        for k in range(M):
            uni_phi = phi0_base + span_sign * (2.0 * math.pi * k / M)
            dir_v = cur_ax * math.cos(uni_phi) + cur_ay * math.sin(uni_phi)
            th_anat = math.atan2(dir_v.dot(last_f_anat), dir_v.dot(last_lat))
            dx, dy = last_prof(th_anat)
            nrow.append(
                bm.verts.new(
                    last_center
                    + last_lat * (dx * scale_r)
                    + last_f_anat * (dy * scale_r)
                    + tan_end * (cap_end * push_t)
                )
            )
        for k in range(M):
            k2 = (k + 1) % M
            f = bm.faces.new((prev_ring[k], prev_ring[k2], nrow[k2], nrow[k]))
            f.material_index = last_mat
        prev_ring = nrow

    pole = bm.verts.new(last_center + tan_end * cap_end)
    for k in range(M):
        k2 = (k + 1) % M
        f = bm.faces.new((prev_ring[k], prev_ring[k2], pole))
        f.material_index = last_mat

    return ordered_hole + socket_rings[0] + socket_rings[1]


def build_sculpted_practitioner(mc: MeshCollector, rig: dict, subsurf: int = 2):
    """
    Flagship v4 Seamless Single-Mesh Korean Pilates Studio Instructor:
    - ONE continuous watertight 2-manifold quad mesh (`Body_Unified`) seamlessly uniting:
      pelvis + lifted athletic glutes + Y-bifurcated slim legs (7/8 forest leggings -> bare ankle skin)
      + hourglass midriff + scoop-neck & ballet-U-back sage crop top + collarbones
      + seamlessly blended shoulders & slender arms + elongated swan neck
    - ZERO ball-joint creases at hips, glutes, waist, bust, or shoulders!
    - Surface-hugging studio crop-top straps, graceful 5-digit dancer hands, dainty ballet grip-sock feet,
      and refined 7.5-head Korean studio head & cascading silk ponytail.
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
    pelvis_right = Vector(rig.get("pelvisRight", body_right))

    def spine_frame(u_clamped: float):
        uc = max(0.0, min(1.0, u_clamped))
        pt = bezier3(pelvis, spine_mid, chest, uc)
        tan = bezier3_tan(pelvis, spine_mid, chest, uc)
        if u_clamped < 0.0:
            pt = pelvis + tan * (u_clamped * 0.42)
        elif u_clamped > 1.0:
            pt = chest + tan * ((u_clamped - 1.0) * 0.42)
        cross_axis = pelvis_right.lerp(body_right, uc)
        r_ax = cross_axis - tan * cross_axis.dot(tan)
        if r_ax.length < 1e-4:
            r_ax = tan.cross(ant_n)
        r_ax.normalize()
        f_ax = r_ax.cross(tan).normalized()
        if f_ax.dot(ant_n) < 0:
            f_ax = -f_ax
        return pt, r_ax, f_ax, tan

    # Cervical neck trajectory & graceful head anchor (preserves floor clearance in supine poses)
    sp_tan = bezier3_tan(pelvis, spine_mid, chest, 1.0)
    if ant_n.z > 0.35 and sp_tan.z < 0.02:
        neck_up = Vector((sp_tan.x, sp_tan.y, max(-0.02, sp_tan.z * 0.15))).normalized()
    else:
        neck_up = (sp_up * 0.32 + sp_tan * 0.68).normalized()
    head_ant = ant_n - neck_up * ant_n.dot(neck_up)
    if head_ant.length < 1e-4:
        head_ant = body_right.cross(neck_up)
    head_ant.normalize()
    # Graceful proportional swan-neck clearance (+0.174m -> refined ~8cm neck, zero giraffe stretch!)
    head_pos = chest + neck_up * 0.174 + head_ant * 0.013
    if head_pos.z < 0.108:
        head_pos.z = 0.108
        neck_up = (head_pos - head_ant * 0.013 - chest).normalized()
        head_ant_proj = ant_n - neck_up * ant_n.dot(neck_up)
        if head_ant_proj.length > 1e-4:
            head_ant = head_ant_proj.normalized()
    # Seat neck top smoothly under submental jaw & occiput inside skull base (zero chin step!)
    neck_top = head_pos - neck_up * 0.014 - head_ant * 0.011

    # Exact IK joint anchors (100% preserved for all 654 pose contacts & audit_and_fix_all_poses.py)
    l_hip = pelvis - pelvis_right * 0.086
    r_hip = pelvis + pelvis_right * 0.086
    l_sh = chest - body_right * 0.148
    r_sh = chest + body_right * 0.148

    # ==========================================================================
    # UNIFIED WATERTIGHT ANATOMICAL BODY MESH (`Body_Unified`)
    # Material slots: 0="skin", 1="legging", 2="suit", 3="suit_accent"
    # ==========================================================================
    N = 24 if mc.glb_mode else 40
    quarter = N // 4
    half = N // 2
    bm_body = bmesh.new()

    # Helper to evaluate graceful 7.5-head torso contour at parametric spine `u_val` & angle `th`
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
            # Sleek flat-toned core (no bulgy tummy!) + graceful sculpted feminine bust & collarbones
            front_curve = st ** 0.96
            y = front_curve * (ry_f + garment_offset)
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
            # Lifted athletic gluteal curve, subtle lumbar lordosis furrow & delicate scapular blades
            glute_lobe = 1.0 + (0.145 if glute_cleft > 0.001 else 0.0) * (math.sin(2.0 * th) ** 2)
            sacral_dip = glute_cleft * math.exp(-((ct / 0.20) ** 2))
            spinous_furrow = (0.0034 if u_val > 0.25 else 0.0) * math.exp(-((ct / 0.14) ** 2)) * (-st)
            scapula_blades = -scap_relief * (
                math.exp(-(((ct - 0.44) / 0.23) ** 2)) + math.exp(-(((ct + 0.44) / 0.23) ** 2))
            ) * (-st)
            y = st * (ry_b + garment_offset) * glute_lobe + sacral_dip + spinous_furrow + scapula_blades
        return ct * (rx + garment_offset), y

    # Continuous vertical rings from pelvic floor (i=0) -> hourglass waist -> scoop crop top -> clavicles -> swan neck
    # Tuple: (kind, u_or_t, rx, ry_f, ry_b, cleft, bust, scap, clav, notch, g_off, w_tone, scoop_amt, band_mat_below)
    # `band_mat_below` assigns the material index for the quad row between ring (i-1) and ring (i).
    torso_ring_specs = [
        # Pelvis & High-Waisted Sculpt Legging (slot 1)
        ("spine", -0.055, 0.128, 0.068, 0.092, 0.011, 0.000, 0.000, 0.000, 0.000, 0.0016, 0.0, 0.0, 1),
        ("spine",  0.020, 0.139, 0.072, 0.108, 0.015, 0.000, 0.000, 0.000, 0.000, 0.0016, 0.0, 0.0, 1),
        ("spine",  0.105, 0.136, 0.071, 0.101, 0.010, 0.000, 0.000, 0.000, 0.000, 0.0016, 0.0, 0.0, 1),
        ("spine",  0.195, 0.120, 0.067, 0.084, 0.003, 0.000, 0.000, 0.000, 0.000, 0.0016, 0.0, 0.0, 1),
        ("spine",  0.295, 0.103, 0.063, 0.070, 0.000, 0.000, 0.000, 0.000, 0.000, 0.0016, 0.3, 0.0, 1),
        ("spine",  0.375, 0.092, 0.061, 0.065, 0.000, 0.000, 0.000, 0.000, 0.000, 0.0016, 0.6, 0.0, 1),
        # Crisp high-waistband hem transition into toned bare midriff (slot 0 skin)
        ("spine",  0.386, 0.091, 0.060, 0.064, 0.000, 0.000, 0.000, 0.000, 0.000, 0.0000, 0.8, 0.0, 1),
        ("spine",  0.455, 0.089, 0.060, 0.063, 0.000, 0.000, 0.000, 0.000, 0.000, 0.0000, 1.0, 0.0, 0),
        ("spine",  0.525, 0.097, 0.065, 0.068, 0.000, 0.000, 0.000, 0.000, 0.000, 0.0000, 0.7, 0.0, 0),
        # Delicate ivory underbust trim band (slot 3 suit_accent) -> tailored scoop-neck sage crop top (slot 2 suit)
        ("spine",  0.538, 0.099, 0.067, 0.069, 0.000, 0.002, 0.001, 0.000, 0.000, 0.0020, 0.2, 0.0, 0),
        ("spine",  0.560, 0.103, 0.070, 0.071, 0.000, 0.005, 0.001, 0.000, 0.000, 0.0020, 0.0, 0.0, 3),
        ("spine",  0.648, 0.114, 0.082, 0.075, 0.000, 0.023, 0.003, 0.000, 0.000, 0.0016, 0.0, 0.0, 2),
        ("spine",  0.738, 0.123, 0.085, 0.079, 0.000, 0.021, 0.005, 0.000, 0.000, 0.0016, 0.0, 0.0, 2),
        # Sculpted feminine scoop neckline (front & ballet U-back) -> ring 13 ends crop top (slot 2)
        ("spine",  0.822, 0.128, 0.077, 0.076, 0.000, 0.006, 0.005, 0.001, 0.000, 0.0016, 0.0, 1.0, 2),
        # Ring 14..17: upper décolleté, delicate collarbones, graceful sloping trapezius & lateral shoulder openings (i_sh_lo=14 .. i_sh_hi=17)
        ("spine",  0.836, 0.128, 0.075, 0.075, 0.000, 0.003, 0.004, 0.0025, 0.0015, 0.0000, 0.0, 0.85, 2),
        ("spine",  0.908, 0.127, 0.070, 0.071, 0.000, 0.000, 0.0035, 0.0056, 0.0042, 0.0000, 0.0, 0.0, 0),
        ("spine",  0.978, 0.110, 0.061, 0.063, 0.000, 0.000, 0.0015, 0.0064, 0.0060, 0.0000, 0.0, 0.0, 0),
        ("spine",  1.038, 0.065, 0.045, 0.047, 0.000, 0.000, 0.000, 0.0022, 0.0024, 0.0000, 0.0, 0.0, 0),
        # Continuous graceful slender swan neck (~0.0345m) blending smoothly under jawline & skull base (rings 18..21, slot 0 skin)
        ("neck",   0.18,  0.042, 0.039, 0.041, 0.000, 0.000, 0.000, 0.000, 0.000, 0.0000, 0.0, 0.0, 0),
        ("neck",   0.48,  0.0345, 0.0335, 0.0355, 0.000, 0.000, 0.000, 0.000, 0.000, 0.0000, 0.0, 0.0, 0),
        ("neck",   0.80,  0.0340, 0.0330, 0.0360, 0.000, 0.000, 0.000, 0.000, 0.000, 0.0000, 0.0, 0.0, 0),
        ("neck",   1.00,  0.0380, 0.0360, 0.0395, 0.000, 0.000, 0.000, 0.000, 0.000, 0.0000, 0.0, 0.0, 0),
    ]

    torso_rings = []
    pt_neck_base = spine_frame(1.04)[0]
    for kind, u_val, rx, ry_f, ry_b, cleft, bust, scap, clav, notch, g_off, w_tone, scoop_amt, _ in torso_ring_specs:
        row = []
        for s in range(N):
            th = (s + 0.5) * 2.0 * math.pi / N
            ct, st = math.cos(th), math.sin(th)
            if kind == "spine":
                u_eff = u_val
                if scoop_amt > 0.0:
                    center_mask = max(0.0, 1.0 - (abs(ct) / 0.58) ** 2)
                    if st > 0.0:
                        u_eff -= 0.046 * scoop_amt * center_mask * st
                    else:
                        u_eff -= 0.058 * scoop_amt * center_mask * (-st)
                pt, r_ax, f_ax, _ = spine_frame(u_eff)
                dx, dy = torso_contour(
                    u_eff, th, rx, ry_f, ry_b,
                    glute_cleft=cleft, bust_boost=bust, scap_relief=scap,
                    clav_relief=clav, notch_depth=notch, garment_offset=g_off, waist_tone=w_tone,
                )
                row.append(bm_body.verts.new(pt + r_ax * dx + f_ax * dy))
            else:
                c_nk = pt_neck_base.lerp(neck_top, u_val)
                scm = 0.0014 * math.exp(-(((abs(ct) - 0.44) / 0.22) ** 2)) * max(0.0, st)
                ry_nk = ry_f if st >= 0.0 else ry_b
                row.append(bm_body.verts.new(c_nk + body_right * (ct * rx) + head_ant * (st * ry_nk + scm)))
        torso_rings.append(row)

    # Shoulder hole patches: rings 14..17 (3 vertical rows) x (2*s_pad) radial quads on each lateral side
    i_sh_lo, i_sh_hi = 14, 17
    s_pad = 2 if mc.glb_mode else 3
    right_sh_quads = {(N + k) % N for k in range(-s_pad, s_pad)}
    left_sh_quads = {(half + k) % N for k in range(-s_pad, s_pad)}

    for i in range(len(torso_rings) - 1):
        mat_idx = torso_ring_specs[i + 1][13]
        in_sh_band = (i_sh_lo <= i < i_sh_hi)
        for s in range(N):
            if in_sh_band and (s in right_sh_quads or s in left_sh_quads):
                continue
            s2 = (s + 1) % N
            f = bm_body.faces.new((torso_rings[i][s], torso_rings[i][s2], torso_rings[i + 1][s2], torso_rings[i + 1][s]))
            f.material_index = mat_idx

    # Cap top of swan neck cleanly inside the skull base
    top_ring = torso_rings[-1]
    nk_pole = bm_body.verts.new(neck_top + neck_up * 0.010)
    for s in range(N):
        s2 = (s + 1) % N
        f = bm_body.faces.new((top_ring[s], top_ring[s2], nk_pole))
        f.material_index = 0

    # Pure-quad 3-segment perineal bridge on Ring 0 -> splits seamlessly into Left & Right Leg openings!
    r0_pt, r0_r, r0_f, r0_tan = spine_frame(-0.055)
    s_fR = quarter - 1
    s_fL = quarter
    s_bL = 3 * quarter - 1
    s_bR = 3 * quarter
    v_bR0 = bm_body.verts.new(r0_pt + r0_r * 0.013 + r0_f * 0.020 - r0_tan * 0.028)
    v_bL0 = bm_body.verts.new(r0_pt - r0_r * 0.013 + r0_f * 0.020 - r0_tan * 0.028)
    v_bR1 = bm_body.verts.new(r0_pt + r0_r * 0.013 - r0_f * 0.026 - r0_tan * 0.030)
    v_bL1 = bm_body.verts.new(r0_pt - r0_r * 0.013 - r0_f * 0.026 - r0_tan * 0.030)

    for qv in [
        (torso_rings[0][s_fR], v_bR0, v_bL0, torso_rings[0][s_fL]),
        (v_bR0, v_bR1, v_bL1, v_bL0),
        (v_bR1, torso_rings[0][s_bR], torso_rings[0][s_bL], v_bL1),
    ]:
        f = bm_body.faces.new(qv)
        f.material_index = 1

    left_leg_hole = [torso_rings[0][s] for s in range(s_fL, s_bL + 1)] + [v_bL1, v_bL0]
    right_leg_hole = (
        [torso_rings[0][s] for s in range(s_bR, N)]
        + [torso_rings[0][s] for s in range(0, s_fR + 1)]
        + [v_bR0, v_bR1]
    )

    socket_smooth_verts = []
    leg_socket_smooth_verts = []

    # Extrude both slim, sculpted Pilates dancer legs seamlessly from the pelvis openings!
    # 7/8 forest legging (slot 1) -> crisp cuff hem -> dainty bare ankle skin (slot 0)
    perineal_set = {v_bR0, v_bR1, v_bL0, v_bL1}
    for side, hp, ft, kpole, leg_hole in [
        ("L", l_hip, l_foot, Vector(rig["lKneePole"]), left_leg_hole),
        ("R", r_hip, r_foot, Vector(rig["rKneePole"]), right_leg_hole),
    ]:
        knee, ankle, k_bend = solve_2bone_ik_with_bend(hp, ft, 0.40, 0.39, kpole)
        ankle_end = knee.lerp(ankle, 0.965)
        hole_c = sum((v.co for v in leg_hole), Vector((0.0, 0.0, 0.0))) / len(leg_hole)
        thigh_dir0 = (knee - hp).normalized()

        # On deep hip flexion (tabletop / V-sit teaser > 55 deg), gently pivot non-perineal hip socket vertices
        # around the anatomical femoral head (`hp`) so the gluteal/inguinal rim rolls with the thigh without folding!
        hip_cos = max(-1.0, min(1.0, (-r0_tan).dot(thigh_dir0)))
        hip_flex_amt = max(0.0, min(1.0, (0.58 - hip_cos) / 1.15))
        if hip_flex_amt > 0.01:
            q_hip_roll = Quaternion().slerp((-r0_tan).rotation_difference(thigh_dir0), 0.38 * hip_flex_amt)
            for v_h in leg_hole:
                if v_h in perineal_set:
                    continue
                rel = v_h.co - hp
                v_h.co = hp + (q_hip_roll @ rel)
            hole_c = sum((v.co for v in leg_hole), Vector((0.0, 0.0, 0.0))) / len(leg_hole)
            thigh_dir0 = (knee - hole_c).normalized()

        # Keep first limb station clear of anterior pelvis wall when deeply flexed
        leg_origin = hole_c + thigh_dir0 * (0.042 * hip_flex_amt)

        # Bend-angle-based outer volume preservation (+8~14% on 90deg+ knee bends, zero V-kink!)
        u_th = (leg_origin - knee).normalized() if (leg_origin - knee).length > 1e-4 else Vector((0, 0, 1))
        u_sh = (ankle_end - knee).normalized() if (ankle_end - knee).length > 1e-4 else Vector((0, 0, -1))
        cos_k = max(-1.0, min(1.0, u_th.dot(u_sh)))
        flex_k = math.pi - math.acos(cos_k)
        knee_bend_f = max(0.0, min(1.0, (flex_k - math.radians(22.0)) / math.radians(95.0)))

        # Slim, elongated Korean Pilates instructor leg proportions with dense knee rings (0.38..0.63)
        # Tuple: (s_val, rx_lat, ry_ap, ant_shift, mat_idx)
        leg_profile_table = [
            (0.10,  0.065, 0.069,  0.005, 1),
            (0.19,  0.061, 0.064,  0.005, 1),
            (0.29,  0.054, 0.056,  0.004, 1),
            (0.38,  0.047, 0.049,  0.003, 1),
            (0.42,  0.044, 0.046,  0.003, 1),
            (0.46,  0.042, 0.044,  0.004, 1),
            (0.50,  0.041, 0.043,  0.005, 1),  # sculpted delicate knee apex
            (0.54,  0.040, 0.042,  0.002, 1),
            (0.58,  0.039, 0.041, -0.002, 1),
            (0.63,  0.041, 0.044, -0.005, 1),
            (0.70,  0.043, 0.047, -0.007, 1),  # graceful toned calf curve
            (0.79,  0.036, 0.039, -0.004, 1),
            (0.872, 0.0298, 0.0322, -0.001, 1),  # 7/8 legging cuff hem ridge
            (0.884, 0.0294, 0.0318, -0.001, 1),  # crisp tailored ankle hem step
            (0.894, 0.0274, 0.0300, -0.001, 0),  # dainty bare ankle transition
            (0.950, 0.0265, 0.0295,  0.000, 0),  # dainty bare ankle skin
            (1.000, 0.0265, 0.0295,  0.000, 0),  # tucked cleanly into low-cut ballet grip sock
        ]
        leg_stations = []
        for s_val, rx_l, ry_l, ant_shift, m_idx in leg_profile_table:
            pt, tan = sample_rounded_2seg_chain(leg_origin, knee, ankle_end, s_val, corner_blend=0.25)
            f_ax = k_bend - tan * k_bend.dot(tan)
            if f_ax.length < 1e-4:
                f_ax = tan.cross(body_right)
            f_ax.normalize()
            joint_w = math.exp(-(((s_val - 0.50) / 0.095) ** 2))
            c_shifted = pt + f_ax * (ant_shift + 0.0062 * knee_bend_f * joint_w)
            quad_w = math.exp(-(((s_val - 0.25) / 0.13) ** 2))
            patella_w = math.exp(-(((s_val - 0.50) / 0.065) ** 2))
            calf_w = math.exp(-(((s_val - 0.69) / 0.095) ** 2))
            achilles_w = math.exp(-(((s_val - 0.93) / 0.07) ** 2))
            outer_vol = 1.0 + 0.16 * knee_bend_f * joint_w
            lat_vol = 1.0 + 0.09 * knee_bend_f * joint_w
            inner_relief = 1.0 - 0.05 * knee_bend_f * joint_w

            def leg_prof(
                th, a=rx_l, b=ry_l, qw=quad_w, pw=patella_w, cw=calf_w, aw=achilles_w,
                ov=outer_vol, lv=lat_vol, ir=inner_relief,
            ):
                ct, st = math.cos(th), math.sin(th)
                dx = ct * a * lv
                dy = st * b * (ov if st >= 0.0 else ir)
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

        leg_sock_vs = _extrude_seamless_limb_from_hole(
            bm_body, leg_hole, thigh_dir0, leg_stations, cap_end=0.006,
            socket_s_pair=(0.025, 0.065), station0_s=0.10,
        )
        socket_smooth_verts.extend(leg_sock_vs)
        leg_socket_smooth_verts.extend(leg_sock_vs)
        build_sculpted_grip_foot(mc, side, hp, knee, ankle, k_bend, ant_n, subsurf)

    # Extract clean shoulder hole loops on Left & Right lateral walls (14 verts in GLB mode, 18 verts in Cycles mode)
    r_seq = [(N + k) % N for k in range(-s_pad, s_pad + 1)]
    l_seq = [(half + k) % N for k in range(-s_pad, s_pad + 1)]
    right_sh_hole = (
        [torso_rings[i_sh_lo][s] for s in r_seq]
        + [torso_rings[i][r_seq[-1]] for i in range(i_sh_lo + 1, i_sh_hi + 1)]
        + [torso_rings[i_sh_hi][s] for s in reversed(r_seq[:-1])]
        + [torso_rings[i][r_seq[0]] for i in range(i_sh_hi - 1, i_sh_lo, -1)]
    )
    left_sh_hole = (
        [torso_rings[i_sh_lo][s] for s in l_seq]
        + [torso_rings[i][l_seq[-1]] for i in range(i_sh_lo + 1, i_sh_hi + 1)]
        + [torso_rings[i_sh_hi][s] for s in reversed(l_seq[:-1])]
        + [torso_rings[i][l_seq[0]] for i in range(i_sh_hi - 1, i_sh_lo, -1)]
    )

    # Extrude both slender toned dancer arms seamlessly from the lateral shoulder openings!
    for side, sh, hd, epole, sh_hole, out_hint in [
        ("L", l_sh, l_hand, Vector(rig["lElbowPole"]), left_sh_hole, -body_right),
        ("R", r_sh, r_hand, Vector(rig["rElbowPole"]), right_sh_hole, body_right),
    ]:
        bar_grip = None
        wrist_target = hd
        if rig.get("rolldownBar"):
            bar_x, bar_z = rig["rolldownBar"]
            if abs(hd.x - bar_x) < 0.015 and abs(hd.z - bar_z) < 0.015:
                forward = Vector((bar_x - sh.x, 0.0, bar_z - sh.z)).normalized()
                lateral = Vector((0.0, 1.0 if side == "L" else -1.0, 0.0))
                dorsal = Vector((-forward.z, 0.0, forward.x))
                if dorsal.z < 0:
                    dorsal.negate()
                candidate = Vector((bar_x, hd.y, bar_z)) - forward * 0.064 + dorsal * 0.021
                if forward.length_squared > 0.99 and (candidate - sh).length <= 0.54 * 0.992:
                    wrist_target = candidate
                    bar_grip = (forward, lateral, dorsal)
        elif rig.get("withChairHandles"):
            if -0.11 <= hd.x <= 0.05 and abs(abs(hd.y) - 0.286) < 0.035 and abs(hd.z - 1.275) < 0.035:
                sign_y = 1.0 if hd.y > 0 else -1.0
                forward = Vector((0.0, sign_y, -0.35)).normalized()
                lateral = Vector((-1.0 if side == "L" else 1.0, 0.0, 0.0))
                dorsal = Vector((0.0, 0.35 * sign_y, 0.94)).normalized()
                candidate = Vector((hd.x, hd.y, 1.275)) - forward * 0.054 + dorsal * 0.023
                if (candidate - sh).length <= 0.54 * 0.992:
                    wrist_target = candidate
                    bar_grip = (forward, lateral, dorsal)
        elif 0.44 <= hd.x <= 0.52 and 0.70 <= hd.z <= 1.04:
            forward = Vector((hd.x - sh.x, 0.0, hd.z - sh.z)).normalized()
            lateral = Vector((0.0, 1.0 if side == "L" else -1.0, 0.0))
            dorsal = Vector((-forward.z, 0.0, forward.x))
            if dorsal.z < 0:
                dorsal.negate()
            candidate = hd - forward * 0.060 + dorsal * 0.021
            if forward.length_squared > 0.99 and (candidate - sh).length <= 0.54 * 0.992:
                wrist_target = candidate
                bar_grip = (forward, lateral, dorsal)

        elb, wr, e_bend = solve_2bone_ik_with_bend(sh, wrist_target, 0.28, 0.26, epole)
        sh_hole_c = sum((v.co for v in sh_hole), Vector((0.0, 0.0, 0.0))) / len(sh_hole)
        arm_vec = (elb - sh).normalized() if (elb - sh).length > 1e-4 else out_hint
        deltoid_cap_pt = sh + out_hint * 0.008 + arm_vec * 0.022
        arm_dir0 = (deltoid_cap_pt - sh_hole_c)
        if arm_dir0.length < 1e-3:
            arm_dir0 = out_hint
        else:
            arm_dir0.normalize()

        # Bend-angle-based outer elbow volume preservation (+8~14% on 90deg+ elbow bends, zero V-kink!)
        u_ua = (deltoid_cap_pt - elb).normalized() if (deltoid_cap_pt - elb).length > 1e-4 else -arm_vec
        u_fa = (wr - elb).normalized() if (wr - elb).length > 1e-4 else arm_vec
        cos_e = max(-1.0, min(1.0, u_ua.dot(u_fa)))
        flex_e = math.pi - math.acos(cos_e)
        elb_bend_f = max(0.0, min(1.0, (flex_e - math.radians(22.0)) / math.radians(95.0)))

        # Sleek, toned dancer arm profile with organic deltoid-to-bicep/tricep taper & dense kink-free elbow rings (0.39..0.61)
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
            s_chain = max(0.0, min(1.0, (s_val - 0.09) / 0.91))
            pt, tan = sample_rounded_2seg_chain(deltoid_cap_pt, elb, wr, s_chain, corner_blend=0.28)
            f_ax = e_bend - tan * e_bend.dot(tan)
            if f_ax.length < 1e-4:
                f_ax = tan.cross(sp_up)
            f_ax.normalize()
            delt_w = math.exp(-(((s_val - 0.11) / 0.095) ** 2))
            bicep_w = math.exp(-(((s_val - 0.28) / 0.105) ** 2))
            elb_w = math.exp(-(((s_val - 0.50) / 0.105) ** 2))
            forearm_w = math.exp(-(((s_val - 0.61) / 0.090) ** 2))
            c_arm = pt + f_ax * (0.0062 * elb_bend_f * elb_w)
            outer_vol = 1.0 + 0.16 * elb_bend_f * elb_w
            lat_vol = 1.0 + 0.10 * elb_bend_f * elb_w
            inner_relief = 1.0 - 0.05 * elb_bend_f * elb_w

            def arm_prof(
                th, a=rx_a, b=ry_a, dw=delt_w, bw=bicep_w, ew=elb_w, fw=forearm_w,
                ov=outer_vol, lv=lat_vol, ir=inner_relief,
            ):
                ct, st = math.cos(th), math.sin(th)
                deltoid_cap = 0.0036 * dw * math.exp(-(((abs(ct) - 0.52) / 0.48) ** 2))
                bicep_tricep = (0.0020 if st < 0.0 else 0.0016) * bw * math.exp(-((ct / 0.48) ** 2)) * abs(st)
                brachiorad = 0.0016 * fw * math.exp(-(((abs(ct) - 0.58) / 0.36) ** 2))
                olecranon = 0.0018 * ew * math.exp(-((ct / 0.34) ** 2)) * max(0.0, st)
                return ct * (a + deltoid_cap + brachiorad) * lv, st * (b + bicep_tricep) * (ov if st >= 0.0 else ir) + olecranon

            arm_stations.append((c_arm, tan, f_ax, arm_prof, 0))

        socket_smooth_verts.extend(
            _extrude_seamless_limb_from_hole(
                bm_body, sh_hole, arm_dir0, arm_stations, cap_end=0.005,
                socket_s_pair=(0.025, 0.060), station0_s=0.09,
            )
        )
        forearm_dir = (wr - elb).normalized() if (wr - elb).length > 1e-4 else ant_n
        build_sculpted_hand(
            mc, side, wr, forearm_dir, body_right, ant_n,
            supinate_up=bool(rig.get("supinatePalms")), bar_grip=bar_grip,
        )

    # Remove omitted interior shoulder-patch vertices so 0 loose verts exist!
    loose_vs = [v for v in bm_body.verts if not v.link_faces]
    if loose_vs:
        bmesh.ops.delete(bm_body, geom=loose_vs, context="VERTS")

    # Selective Laplacian smoothing on leg_hole & sh_hole boundaries + adjacent 2 socket rings
    # Completely melts groin/hip & shoulder seams while maintaining 100% 2-manifold watertightness!
    smooth_targets = list(dict.fromkeys(v for v in socket_smooth_verts if v.is_valid))
    if smooth_targets:
        for _ in range(3):
            bmesh.ops.smooth_vert(
                bm_body,
                verts=smooth_targets,
                factor=0.50,
                use_axis_x=True,
                use_axis_y=True,
                use_axis_z=True,
            )
    # Extra 2 smoothing passes on hip-pelvis transition (including ring 1 lower legging neighbors) for deep-flexion silkiness
    hip_extra_targets = list(dict.fromkeys(v for v in (leg_socket_smooth_verts + torso_rings[1]) if v.is_valid))
    if hip_extra_targets:
        for _ in range(2):
            bmesh.ops.smooth_vert(
                bm_body,
                verts=hip_extra_targets,
                factor=0.45,
                use_axis_x=True,
                use_axis_y=True,
                use_axis_z=True,
            )

    body_obj = mc.emit_bmesh(
        "Body_Unified",
        bm_body,
        "skin",
        subsurf_levels=subsurf,
        mat_keys=["skin", "legging", "suit", "suit_accent"],
    )

    # Project flat studio crop-top straps & scoop-neck piping strictly onto evaluated Subsurf Body_Unified (ZERO air gap!)
    bpy.context.view_layer.update()
    deps_strap = bpy.context.evaluated_depsgraph_get()
    body_bvh = BVHTree.FromObject(body_obj, deps_strap)

    def snap_to_body_surface(pt: Vector, lift: float = 0.0006) -> tuple[Vector, Vector]:
        hit_loc, hit_nrm, _, _ = body_bvh.find_nearest(pt)
        if hit_loc is not None and hit_nrm is not None:
            n = hit_nrm.normalized() if hit_nrm.length > 1e-6 else sp_up
            return hit_loc + n * lift, n
        return pt, sp_up

    def body_surface_normal(qpt: Vector) -> Vector:
        _, hn, _, _ = body_bvh.find_nearest(qpt)
        return hn.normalized() if (hn is not None and hn.length > 1e-6) else sp_up

    for sign, side in [(-1.0, "L"), (1.0, "R")]:
        strap_ctrl = []
        for u_st, th_st, rx_m, ryf_m, ryb_m, lift_up in [
            (0.805,  math.radians(52.0 if sign > 0 else 128.0), 0.128, 0.077, 0.076, 0.000),
            (0.908,  math.radians(50.0 if sign > 0 else 130.0), 0.127, 0.070, 0.071, 0.000),
            (0.978,  math.radians(46.0 if sign > 0 else 134.0), 0.110, 0.061, 0.063, 0.000),
            (1.016,  math.radians(0.0 if sign > 0 else 180.0),  0.076, 0.048, 0.049, 0.002),
            (0.978,  math.radians(-46.0 if sign > 0 else -134.0), 0.110, 0.061, 0.063, 0.000),
            (0.908,  math.radians(-50.0 if sign > 0 else -130.0), 0.127, 0.070, 0.071, 0.000),
            (0.798,  math.radians(-52.0 if sign > 0 else -128.0), 0.128, 0.077, 0.076, 0.000),
        ]:
            pt_s, r_s, f_s, t_s = spine_frame(u_st)
            dx_s, dy_s = torso_contour(u_st, th_st, rx_m, ryf_m, ryb_m, garment_offset=0.0012)
            strap_ctrl.append(pt_s + r_s * dx_s + f_s * dy_s + t_s * lift_up)
        dense_strap = strap_ctrl if mc.glb_mode else eval_catmull_rom_spline(strap_ctrl, 4)
        snapped_pts = [snap_to_body_surface(sp, lift=0.0005)[0] for sp in dense_strap]
        for _ in range(2):
            sm_pts = [snapped_pts[0]]
            for k in range(1, len(snapped_pts) - 1):
                mid = snapped_pts[k - 1] * 0.25 + snapped_pts[k] * 0.50 + snapped_pts[k + 1] * 0.25
                sm_pts.append(snap_to_body_surface(mid, lift=0.0005)[0])
            sm_pts.append(snapped_pts[-1])
            snapped_pts = sm_pts
        add_swept_tube(
            mc, f"CropStrap_{side}",
            snapped_pts,
            0.0062, "suit",
            closed=False, radial_segs=6 if mc.glb_mode else 8, aspect_b=0.30,
            subsurf_levels=0 if mc.glb_mode else 1,
            surface_normal_fn=body_surface_normal,
        )

    # Tailored satin ivory piping snapped strictly flush along the scoop neckline & ballet-U back edge
    if not mc.glb_mode:
        scoop_pipe_pts = []
        n_pipe = 36
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
            scoop_pipe_pts.append(snap_to_body_surface(pt_p + r_p * dx_p + f_p * dy_p, lift=0.0005)[0])
        add_swept_tube(
            mc, "CropScoopPiping", scoop_pipe_pts, 0.0019, "suit_accent",
            closed=True, radial_segs=8, subsurf_levels=1,
        )

    # Sculpted 7.5-head Korean Atelier Head & Layered Cascading Silk Hair
    build_sculpted_head_and_hair(mc, head_pos, neck_up, head_ant, subsurf)


# ==============================================================================
# 4. INDUSTRIAL STUDIO APPARATUS & 3D PROP KIT BUILDERS
# ==============================================================================

def add_c_channel_rail(mc: MeshCollector, name: str, x_len: float, center_y: float, center_z: float, open_dir_y: float):
    hw = 0.011
    hh = 0.017
    tw = 0.0045
    lip = 0.0055
    s = 1.0 if open_dir_y > 0 else -1.0

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


def add_double_loop_strap(
    mc: MeshCollector,
    name: str,
    anchor_pt: Vector,
    forward_dir: Vector,
    side_axis: Vector,
    mode: str = "foot",
):
    """
    Precision Reformer double-loop cotton strap + brass swivel D-ring + saddle leather tab.
    - mode='hand': inner loop (0.125m) terminates cleanly at the palm; unused outer loop drapes gently outward/downward
      so it NEVER overshoots into the practitioner's thigh/pelvis!
    - mode='foot': outer loop (0.178m) wraps around the foot arch.
    - mode='docked': both loops rest neatly on the shoulder-block peg.
    """
    fwd = forward_dir.normalized()
    lat = side_axis - fwd * side_axis.dot(fwd)
    if lat.length < 1e-4:
        lat = Vector((0.0, 1.0, 0.0))
    lat.normalize()
    up = lat.cross(fwd).normalized()

    d_pts = []
    for k in range(14):
        a = 2.0 * math.pi * k / 14
        d_pts.append(anchor_pt + fwd * (0.011 * math.cos(a)) + lat * (0.014 * math.sin(a)))
    add_swept_tube(mc, f"{name}_DRing", d_pts, 0.0034, "brass", closed=True, radial_segs=6 if mc.glb_mode else 8)

    tab_c = anchor_pt + fwd * 0.024
    quat = fwd.to_track_quat("X", "Z")
    add_beveled_box(mc, f"{name}_LeatherTab", tab_c, (0.030, 0.026, 0.011), "leather", bevel=0.0, quat=quat)

    if mode == "hand":
        loop_specs = [("InnerLoop", 0.116, 0.026, 0.002, 0.0, 0.0)]
        # Unused outer loop folds compactly underneath the D-ring rather than jutting into the thigh
        out_dir = (-fwd * 0.22 - Vector((0.0, 0.0, 0.94)) + lat * 0.14).normalized()
        l_pts = []
        n_l = 16 if mc.glb_mode else 20
        for k in range(n_l):
            a = 2.0 * math.pi * k / n_l
            u_long = 0.5 * (1.0 + math.cos(a))
            pinch = 0.25 + 0.75 * math.sin(u_long * math.pi * 0.65)
            p = tab_c + out_dir * (0.008 + u_long * 0.088) + lat * (math.sin(a) * 0.020 * pinch)
            l_pts.append(p)
        add_swept_tube(mc, f"{name}_OuterLoopDrape", l_pts, 0.0040, "strap", closed=True, radial_segs=6 if mc.glb_mode else 8)
    else:
        loop_specs = [
            ("InnerLoop", 0.120, 0.030, 0.003, 0.0, 0.0),
            ("OuterLoop", 0.175, 0.040, -0.004, 0.0, 0.0),
        ]

    for loop_tag, loop_len, loop_w, z_drop, _, _ in loop_specs:
        l_pts = []
        n_l = 16 if mc.glb_mode else 20
        for k in range(n_l):
            a = 2.0 * math.pi * k / n_l
            u_long = 0.5 * (1.0 + math.cos(a))
            pinch = 0.25 + 0.75 * math.sin(u_long * math.pi * 0.65)
            p = (
                tab_c
                + fwd * (0.012 + u_long * loop_len)
                + lat * (math.sin(a) * loop_w * pinch)
                + up * (z_drop * math.sin(u_long * math.pi))
            )
            l_pts.append(p)
        add_swept_tube(mc, f"{name}_{loop_tag}", l_pts, 0.0046, "strap", closed=True, radial_segs=6 if mc.glb_mode else 8)


def add_brass_star_knob(mc: MeshCollector, name: str, center: Vector, shaft_dir: Vector, radius: float = 0.024):
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
    bm = bmesh.new()
    x_back = cx - 0.305
    x_front = cx + 0.255
    z_bot = 0.038
    z_top = 0.556
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
    segs = 24 if mc.glb_mode else 32
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

    for sy_tag, sy in [("L", cy - width_y * 0.445), ("R", cy + width_y * 0.445)]:
        bm_c = bmesh.new()
        arc_l, base_l, arc_r, base_r = [], [], [], []
        for i in range(segs + 1):
            u_i = i / segs
            a = -half_arc + 2.0 * half_arc * u_i
            xi = cx + math.sin(a) * (radius - thickness + 0.006)
            zi = max(base_z + 0.03, cz + math.cos(a) * (radius - thickness + 0.006))
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

    for a_rib in (-half_arc * 0.52, half_arc * 0.52):
        xr = cx + math.sin(a_rib) * (radius - thickness - 0.04)
        zr = max(base_z + 0.08, cz + math.cos(a_rib) * (radius - thickness - 0.04))
        add_cylinder_rod(mc, f"{name}_VaultRib_{a_rib:.2f}", (xr, cy - width_y * 0.45, zr), (xr, cy + width_y * 0.45, zr), 0.016, "oak", segs=12)


def add_sculpted_magic_circle(mc: MeshCollector, center: Vector, resting_horizontal: bool = True):
    major_r = 0.178
    if resting_horizontal:
        rc = Vector((center.x, center.y, 0.027))
        add_torus(mc, "MagicCircle_SpringRing", rc, major_r, 0.0042, "steel", axis="Z", segs=36, tsegs=10, minor_axial_r=0.014)
        for sign, tag in [(-1.0, "L"), (1.0, "R")]:
            add_beveled_box(mc, f"McBrassSleeve_{tag}", (rc.x + sign * major_r, rc.y, rc.z), (0.018, 0.040, 0.034), "brass", bevel=0.0)
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


def add_beveled_eva_foam_roller(mc: MeshCollector, center_y: float, center_x: float = 0.0, cz: float = 0.068):
    r_outer = 0.068
    ax_x = Vector((0.0, 1.0, 0.0))
    ax_z = Vector((0.0, 0.0, 1.0))

    roller_profile = [
        (-0.450, 0.051),
        (-0.442, 0.057),
        (-0.424, r_outer),
        (-0.260, r_outer),
        (-0.248, r_outer - 0.0028),
        (-0.236, r_outer),
        (-0.012, r_outer),
        (0.000, r_outer - 0.0028),
        (0.012, r_outer),
        (0.236, r_outer),
        (0.248, r_outer - 0.0028),
        (0.260, r_outer),
        (0.424, r_outer),
        (0.442, 0.057),
        (0.450, 0.051),
    ]
    stations = [
        (Vector((center_x + x_p, center_y, cz)), ax_x, ax_z, lambda th, rad=r_p: (math.cos(th) * rad, math.sin(th) * rad))
        for x_p, r_p in roller_profile
    ]
    build_loft_from_stations(
        mc,
        "FoamRoller_EVABody",
        stations,
        "pad",
        radial_segs=24 if mc.glb_mode else 32,
        cap_start=0.004,
        cap_end=0.004,
        subsurf_levels=0,
    )
    for sign, tag in [(-1.0, "L"), (1.0, "R")]:
        x_in = center_x + sign * 0.446
        x_out = center_x + sign * 0.458
        add_cylinder_rod(mc, f"FoamRoller_EndCap_{tag}", (x_in, center_y, cz), (x_out, center_y, cz), 0.054, "suit_accent", segs=22, r2=0.046 if sign > 0 else 0.054)
        add_cylinder_rod(mc, f"FoamRoller_Boss_{tag}", (center_x + sign * 0.454, center_y, cz), (center_x + sign * 0.461, center_y, cz), 0.014, "brass", segs=14)


def add_matte_sage_mini_ball(mc: MeshCollector, center_xy: tuple[float, float]):
    bx, by = center_xy
    r = 0.095
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=24 if mc.glb_mode else 36, v_segments=16 if mc.glb_mode else 24, radius=r)
    for v in bm.verts:
        z_world = v.co.z + (r - 0.0015)
        if z_world < 0.0:
            z_world = 0.0
        v.co = (bx + v.co.x, by + v.co.y, z_world)
    mc.emit_bmesh("MiniBall_MatteSage", bm, "ball", subsurf_levels=0 if mc.glb_mode else 1)
    add_cylinder_rod(mc, "MiniBall_ValvePlug", (bx, by, 2.0 * r - 0.006), (bx, by, 2.0 * r - 0.001), 0.009, "suit_accent", segs=12)


def solve_practitioner_key_joints(rig: dict) -> dict[str, Vector]:
    """Solves exact IK knee, ankle, elbow, and wrist centers for zero-clip prop & strap attachment."""
    pelvis = Vector(rig["pelvis"])
    chest = Vector(rig["chest"])
    ant_hint = Vector(rig["antHint"])
    sp_up = (chest - pelvis).normalized() if (chest - pelvis).length > 1e-4 else Vector((0, 0, 1))
    ant_proj = ant_hint - sp_up * ant_hint.dot(sp_up)
    if ant_proj.length < 1e-4:
        ant_proj = Vector((1, 0, 0)) - sp_up * sp_up.x
    ant_n = ant_proj.normalized()
    body_right = sp_up.cross(ant_n).normalized()
    pelvis_right = Vector(rig.get("pelvisRight", body_right))
    l_hip = pelvis - pelvis_right * 0.086
    r_hip = pelvis + pelvis_right * 0.086
    l_sh = chest - body_right * 0.148
    r_sh = chest + body_right * 0.148
    l_knee, l_ankle, _ = solve_2bone_ik_with_bend(l_hip, Vector(rig["lFoot"]), 0.40, 0.39, Vector(rig["lKneePole"]))
    r_knee, r_ankle, _ = solve_2bone_ik_with_bend(r_hip, Vector(rig["rFoot"]), 0.40, 0.39, Vector(rig["rKneePole"]))
    l_elb, l_wr, _ = solve_2bone_ik_with_bend(l_sh, Vector(rig["lHand"]), 0.28, 0.26, Vector(rig["lElbowPole"]))
    r_elb, r_wr, _ = solve_2bone_ik_with_bend(r_sh, Vector(rig["rHand"]), 0.28, 0.26, Vector(rig["rElbowPole"]))
    return {
        "pelvis": pelvis,
        "chest": chest,
        "l_knee": l_knee,
        "r_knee": r_knee,
        "l_ankle": l_ankle,
        "r_ankle": r_ankle,
        "l_elb": l_elb,
        "r_elb": r_elb,
        "l_wr": l_wr,
        "r_wr": r_wr,
    }


def build_apparatus_and_props(mc: MeshCollector, ex: dict, rig: dict):
    app = ex["apparatus"]
    props = [p for p in (ex.get("props") or []) if p != "none"]
    joints = solve_practitioner_key_joints(rig)
    l_foot = joints["l_ankle"]
    r_foot = joints["r_ankle"]
    l_knee = joints["l_knee"]
    r_knee = joints["r_knee"]
    l_hand = joints["l_wr"]
    r_hand = joints["r_wr"]

    if app == "reformer":
        cx = rig.get("carriageX", 0.12)
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

        for sx in (-1.08, 1.08):
            for sy in (-0.28, 0.28):
                add_cylinder_rod(mc, f"RefLeg_{sx}_{sy}", (sx, sy, 0.036), (sx, sy, 0.266), 0.027, "oak", segs=16, r2=0.033)
                add_cylinder_rod(mc, f"RefFerrule_{sx}_{sy}", (sx, sy, 0.0), (sx, sy, 0.042), 0.029, "brass", segs=16, r2=0.028)

        add_beveled_box(mc, "RefStandDeck", (1.04, 0.0, 0.368), (0.19, 0.58, 0.024), "walnut", bevel=0.005)
        add_beveled_box(mc, "RefStandGrip", (1.04, 0.0, 0.383), (0.16, 0.53, 0.010), "charcoal", bevel=0.003)
        for sy_tag, gy in [("L", -0.253), ("R", 0.253)]:
            add_four_slot_brass_gearbar_rack(mc, f"RefBrassGearRack_{sy_tag}", 0.885, gy, 0.326)
            add_beveled_box(mc, f"RefStopperBlock_{sy_tag}", (0.76, gy, 0.332), (0.034, 0.024, 0.026), "charcoal", bevel=0.0)
            add_cylinder_rod(mc, f"RefStopperPin_{sy_tag}", (0.76, gy, 0.318), (0.76, gy, 0.352), 0.005, "brass", segs=8)
        gear_x = 0.930
        add_cylinder_rod(mc, "RefGearBarCross", (gear_x, -0.262, 0.330), (gear_x, 0.262, 0.330), 0.010, "brass", segs=12)

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
                add_cylinder_rod(mc, f"FbArm_{sy}", (0.955, sy, 0.335), (fb_x, sy, fb_z), 0.013, "steel", segs=14)
                add_ellipsoid(mc, f"FbKnob_{sy}", (0.955, sy * 1.08, 0.335), 0.016, 0.012, 0.016, "brass", u_seg=10, v_seg=8)
                add_torus(mc, f"FbGripCollar_{sy}", (fb_x, math.copysign(0.256, sy), fb_z), 0.0225, 0.0040, "brass", axis="Y", segs=16, tsegs=8)
            add_cylinder_rod(mc, "FbCore", (fb_x, -0.282, fb_z), (fb_x, 0.282, fb_z), 0.015, "steel", segs=14)
            add_cylinder_rod(mc, "FbPadGrip", (fb_x, -0.255, fb_z), (fb_x, 0.255, fb_z), 0.022, "charcoal", segs=20)
            # Stitched French seam piping along the padded footbar cover
            for seam_z in (fb_z + 0.0215, fb_z - 0.0215):
                add_swept_tube(
                    mc,
                    f"FbPadStitch_{seam_z:.3f}",
                    [Vector((fb_x, -0.248, seam_z)), Vector((fb_x, 0.248, seam_z))],
                    0.0022,
                    "suit_accent",
                    closed=False,
                    radial_segs=6,
                )

        sp_anchor_x = cx + 0.455
        add_beveled_box(mc, "CarriageSpringBracket", (sp_anchor_x - 0.015, 0.0, 0.338), (0.032, 0.26, 0.026), "steel", bevel=0.0)
        for idx, (sy, sm) in enumerate([(-0.09, "spring_red"), (-0.03, "spring_red"), (0.03, "spring_blue"), (0.09, "spring_gold")]):
            add_ellipsoid(mc, f"GearHook_{idx}", (gear_x, sy, 0.336), 0.009, 0.007, 0.012, "brass", u_seg=8, v_seg=6)
            add_helical_spring_mesh(mc, f"RefSpring_{idx}", (sp_anchor_x, sy, 0.332), (gear_x - 0.006, sy, 0.332), sm, coils=15, coil_r=0.015, wire_r=0.0038, max_coil_len=None)

        for sy_tag, ry in [("L", -0.28), ("R", 0.28)]:
            add_cylinder_rod(mc, f"RiserPost_{sy_tag}", (-1.13, ry, 0.35), (-1.13, ry, 0.665), 0.013, "steel", segs=14)
            add_cylinder_rod(mc, f"RiserCollar_{sy_tag}", (-1.13, ry, 0.42), (-1.13, ry, 0.455), 0.017, "brass", segs=14)
            add_ellipsoid(mc, f"RiserFinial_{sy_tag}", (-1.13, ry, 0.672), 0.016, 0.016, 0.012, "brass", u_seg=10, v_seg=8)
            add_beveled_box(mc, f"PulleyClevis_{sy_tag}", (-1.112, ry, 0.64), (0.032, 0.018, 0.022), "brass", bevel=0.0)
            add_torus(mc, f"PulleyWheel_{sy_tag}", (-1.092, ry, 0.64), 0.022, 0.006, "brass", axis="Y", segs=18, tsegs=8)

        if rig.get("ropeToFeet"):
            neg_ft, pos_ft = (l_foot, r_foot) if l_foot.y <= r_foot.y else (r_foot, l_foot)
            for side_t, ry, tgt in [("L", -0.275, neg_ft), ("R", 0.275, pos_ft)]:
                p0 = Vector((-1.092, ry, 0.64))
                fdir = (tgt - p0).normalized()
                anchor = tgt - fdir * 0.205
                add_swept_tube(mc, f"RopeF_{side_t}", [p0, p0.lerp(anchor, 0.5), anchor], 0.0040, "strap", closed=False, radial_segs=8)
                add_double_loop_strap(mc, f"StrapF_{side_t}", anchor, fdir, Vector((0.0, 1.0, 0.0)), mode="foot")
        elif rig.get("ropeToHands"):
            neg_hd, pos_hd = (l_hand, r_hand) if l_hand.y <= r_hand.y else (r_hand, l_hand)
            for side_t, ry, tgt in [("L", -0.275, neg_hd), ("R", 0.275, pos_hd)]:
                p0 = Vector((-1.092, ry, 0.64))
                # Route supine ropes cleanly outside the shoulder blocks & torso before entering the palm loop
                out_y = math.copysign(max(abs(tgt.y), 0.255), ry)
                p_guide = Vector((max(-0.55, min(tgt.x - 0.24, cx - 0.24)), out_y, max(0.56, (p0.z + tgt.z) * 0.5 + 0.04)))
                fdir = (tgt - p_guide).normalized()
                anchor = tgt - fdir * 0.148
                add_swept_tube(mc, f"RopeH_{side_t}", [p0, p_guide, anchor], 0.0040, "strap", closed=False, radial_segs=8)
                add_double_loop_strap(mc, f"StrapH_{side_t}", anchor, fdir, Vector((0.0, math.copysign(1.0, ry), 0.0)), mode="hand")
        else:
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
                    mode="docked",
                )

    elif app == "cadillac":
        add_piped_cushion(mc, "CadMattress", (0.0, 0.0, 0.545), (2.08, 0.64, 0.066))
        for sy in (-0.32, 0.32):
            add_beveled_box(mc, f"CadRail_{sy}", (0.0, sy, 0.475), (2.14, 0.046, 0.094), "oak", bevel=0.008)
            add_cylinder_rod(mc, f"CadStretcher_{sy}", (-1.05, sy, 0.14), (1.05, sy, 0.14), 0.018, "oak", segs=12)
        for sx in (-1.05, 1.05):
            add_beveled_box(mc, f"CadEnd_{sx}", (sx, 0.0, 0.475), (0.048, 0.686, 0.094), "oak", bevel=0.008)
            add_cylinder_rod(mc, f"CadCrossStretcher_{sx}", (sx, -0.310, 0.14), (sx, 0.310, 0.14), 0.018, "oak", segs=12)

        for sx in (-1.05, 1.05):
            for sy in (-0.31, 0.31):
                add_cylinder_rod(mc, f"CadLeg_{sx}_{sy}", (sx, sy, 0.036), (sx, sy, 0.45), 0.030, "oak", segs=16)
                add_cylinder_rod(mc, f"CadFerrule_{sx}_{sy}", (sx, sy, 0.0), (sx, sy, 0.040), 0.032, "brass", segs=16)
                add_cylinder_rod(mc, f"CadPost_{sx}_{sy}", (sx, sy, 0.50), (sx, sy, 1.95), 0.016, "steel", segs=14)
                add_beveled_box(mc, f"CadFlangeBot_{sx}_{sy}", (sx, sy, 0.515), (0.050, 0.050, 0.034), "brass", bevel=0.0)
                add_beveled_box(mc, f"CadCornerCast_{sx}_{sy}", (sx, sy, 1.95), (0.048, 0.048, 0.048), "brass", bevel=0.0)
                in_x = -0.034 if sx > 0 else 0.034
                in_y = -0.034 if sy > 0 else 0.034
                add_cylinder_rod(mc, f"CadCastSlvZ_{sx}_{sy}", (sx, sy, 1.905), (sx, sy, 1.945), 0.021, "brass", segs=12)
                add_cylinder_rod(mc, f"CadCastSlvX_{sx}_{sy}", (sx, sy, 1.95), (sx + in_x, sy, 1.95), 0.020, "brass", segs=12)
                add_cylinder_rod(mc, f"CadCastSlvY_{sx}_{sy}", (sx, sy + in_y * 0.24, 1.95), (sx, sy + in_y, 1.95), 0.020, "brass", segs=12)

        for sy in (-0.31, 0.31):
            add_cylinder_rod(mc, f"CadCanopyRail_{sy}", (-1.05, sy, 1.95), (1.05, sy, 1.95), 0.015, "steel", segs=14)
        for sx in (-1.05, -0.66, -0.34, 0.20, 1.05):
            add_cylinder_rod(mc, f"CadCross_{sx}", (sx, -0.31, 1.95), (sx, 0.31, 1.95), 0.014, "steel", segs=12)
            if sx in (-0.66, -0.34, 0.20):
                for sy in (-0.31, 0.31):
                    add_beveled_box(mc, f"CadSlider_{sx}_{sy}", (sx, sy, 1.95), (0.038, 0.038, 0.038), "brass", bevel=0.0)
                    add_ellipsoid(mc, f"CadThumbScrew_{sx}_{sy}", (sx, sy * 1.08, 1.95), 0.011, 0.008, 0.011, "brass", u_seg=8, v_seg=6)

        for sy_tag, sy in [("L", -0.19), ("R", 0.19)]:
            add_cylinder_rod(mc, f"FuzzyWeb_{sy_tag}", (0.20, sy, 1.95), (0.20, sy, 1.63), 0.005, "strap", segs=8)
            add_torus(mc, f"FuzzyDRing_{sy_tag}", (0.20, sy, 1.62), 0.016, 0.0035, "brass", axis="X", segs=12, tsegs=6)
            fleece_stations = []
            for u_f, r_f in [(0.0, 0.022), (0.18, 0.030), (0.50, 0.032), (0.82, 0.030), (1.0, 0.022)]:
                zf = 1.44 + u_f * 0.17

                def fleece_prof(th, r0=r_f):
                    tuft = 1.0 + 0.08 * math.cos(8.0 * th)
                    return math.cos(th) * r0 * tuft, math.sin(th) * r0 * tuft

                fleece_stations.append((Vector((0.20, sy, zf)), Vector((1, 0, 0)), Vector((0, 1, 0)), fleece_prof))
            build_loft_from_stations(mc, f"FuzzyFleeceCuff_{sy_tag}", fleece_stations, "sock", radial_segs=16, cap_start=0.006, cap_end=0.006, subsurf_levels=0)
            add_torus(mc, f"FuzzyLoop_{sy_tag}", (0.20, sy, 1.41), 0.034, 0.007, "strap", axis="X", segs=14, tsegs=6)

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

        if rig.get("rolldownBar"):
            bx, bz = rig["rolldownBar"]
            anch_x = rig.get("rolldownBarAnchorX", 1.05)
            add_cylinder_rod(mc, "RollBackMapleBar", (bx, -0.27, bz), (bx, 0.27, bz), 0.017, "maple", segs=16)
            for sy_tag, sy in [("L", -0.255), ("R", 0.255)]:
                add_cylinder_rod(mc, f"RdbBrassCap_{sy_tag}", (bx, sy, bz), (bx, sy + (0.018 if sy > 0 else -0.018), bz), 0.0185, "brass", segs=12)
                add_torus(mc, f"RdbEye_{sy_tag}", (bx, sy * 0.94, bz), 0.020, 0.004, "brass", axis="Y", segs=12, tsegs=6)
                add_beveled_box(mc, f"RdbPostCollar_{sy_tag}", (anch_x, sy * 1.215, 1.74), (0.036, 0.036, 0.032), "brass", bevel=0.0)
                add_helical_spring_mesh(mc, f"RdbSpring_{sy_tag}", (anch_x, sy, 1.74), (bx, sy * 0.94, bz), "spring_gold", max_coil_len=0.40)

        if rig.get("pushthroughDeg") is not None:
            rad = math.radians(rig["pushthroughDeg"])
            piv_x, end_anch_x = 0.62, 1.05
            ex_x = piv_x - math.sin(rad) * 0.66
            ez_z = 1.94 - math.cos(rad) * 0.66
        else:
            piv_x, end_anch_x = -0.66, -1.05
            ex_x, ez_z = -0.96, 1.54

        for sy_tag, sy in [("L", -0.27), ("R", 0.27)]:
            add_cylinder_rod(mc, f"PtbSide_{sy_tag}", (piv_x, sy, 1.94), (ex_x, sy, ez_z), 0.013, "steel", segs=12)
            add_ellipsoid(mc, f"PtbElbow_{sy_tag}", (ex_x, sy, ez_z), 0.016, 0.016, 0.016, "steel", u_seg=10, v_seg=8)
        add_cylinder_rod(mc, "PtbCrossCore", (ex_x, -0.27, ez_z), (ex_x, 0.27, ez_z), 0.014, "steel", segs=12)
        add_cylinder_rod(mc, "PtbCrossGrip", (ex_x, -0.20, ez_z), (ex_x, 0.20, ez_z), 0.019, "charcoal", segs=14)

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
            neg_ft, pos_ft = (l_foot, r_foot) if l_foot.y <= r_foot.y else (r_foot, l_foot)
            for sy, ft in [(-0.24, neg_ft), (0.24, pos_ft)]:
                add_helical_spring_mesh(mc, f"CadLegSp_{sy}", (-1.05, sy, 1.54), ft, "spring_gold", max_coil_len=0.42)
                add_torus(mc, f"CadLegLoop_{sy}", ft, 0.036, 0.0055, "strap", axis="Y", segs=14, tsegs=6)
        elif rig.get("sideLegSpring"):
            t_f = r_foot if rig["sideLegSpring"] == "right" else l_foot
            add_helical_spring_mesh(mc, "CadSideLegSp", (-1.05, -0.14, 1.48), t_f, "spring_gold", max_coil_len=0.42)
            add_torus(mc, "CadSideLegLoop", t_f, 0.036, 0.0055, "strap", axis="Y", segs=14, tsegs=6)

        if rig.get("armSpringsFrom"):
            ax, az = rig["armSpringsFrom"]
            neg_hd, pos_hd = (l_hand, r_hand) if l_hand.y <= r_hand.y else (r_hand, l_hand)
            for sy, hd in [(-0.26, neg_hd), (0.26, pos_hd)]:
                add_helical_spring_mesh(mc, f"CadArmSp_{sy}", (ax, sy, az), hd, "spring_gold", max_coil_len=0.38)
                add_cylinder_rod(mc, f"CadArmGrip_{sy}", (hd.x, hd.y - 0.045, hd.z), (hd.x, hd.y + 0.045, hd.z), 0.011, "maple", segs=10)

    elif app == "chair":
        cx = -0.10
        add_open_c_frame_panel(mc, "ChairCFrame_L", cx, -0.252)
        add_open_c_frame_panel(mc, "ChairCFrame_R", cx, 0.252)
        for sy_tag, sy in [("L", -0.252), ("R", 0.252)]:
            add_beveled_box(mc, f"ChairBaseRunner_{sy_tag}", (cx + 0.03, sy, 0.021), (0.78, 0.056, 0.042), "walnut", bevel=0.006)
            for bz in (0.075, 0.520):
                add_ellipsoid(mc, f"ChairFrameBolt_{sy_tag}_{bz}", (cx - 0.26, sy * 1.09, bz), 0.009, 0.006, 0.009, "brass", u_seg=8, v_seg=6)

        add_cylinder_rod(mc, "ChairFrontDowel", (cx + 0.34, -0.26, 0.058), (cx + 0.34, 0.26, 0.058), 0.016, "maple", segs=14)
        add_beveled_box(mc, "ChairCactusBaseBeam", (cx - 0.24, 0.0, 0.024), (0.068, 0.50, 0.040), "walnut", bevel=0.005)
        add_beveled_box(mc, "ChairHingeCrossBeam", (cx - 0.10, 0.0, 0.068), (0.058, 0.50, 0.036), "oak", bevel=0.005)

        add_beveled_box(mc, "ChairCactusFlange", (cx - 0.24, 0.0, 0.050), (0.052, 0.052, 0.020), "brass", bevel=0.0)
        add_cylinder_rod(mc, "ChairSpringCactus", (cx - 0.24, 0.0, 0.040), (cx - 0.24, 0.0, 0.555), 0.017, "steel", segs=14)
        for idx_h, hz in enumerate((0.25, 0.32, 0.39, 0.46)):
            add_beveled_box(mc, f"CactusCollar_{idx_h}", (cx - 0.24, 0.0, hz), (0.032, 0.040, 0.020), "brass", bevel=0.0)
            for sy_tag, sign in [("L", -1.0), ("R", 1.0)]:
                p_root = Vector((cx - 0.24, sign * 0.015, hz))
                p_elbow = Vector((cx - 0.22, sign * 0.078, hz + 0.010))
                p_tip = Vector((cx - 0.205, sign * 0.095, hz + 0.024))
                add_swept_tube(mc, f"CactusHook_{idx_h}_{sy_tag}", [p_root, p_elbow, p_tip], 0.0052, "brass", closed=False, radial_segs=8)

        add_piped_cushion(mc, "ChairSeat", (cx - 0.03, 0.0, 0.58), (0.58, 0.55, 0.062))

        pdeg = rig.get("pedalDeg", 22.0)
        l_deg = rig.get("lPedalDeg", pdeg)
        r_deg = rig.get("rPedalDeg", pdeg)
        hinge_x, hinge_z = cx - 0.10, 0.088
        add_cylinder_rod(mc, "ChairHingeAxle", (hinge_x, -0.22, hinge_z), (hinge_x, 0.22, hinge_z), 0.009, "steel", segs=14)

        for side_tag, py, deg_s, sp_mat, hook_z in [
            ("L", -0.105, l_deg, "spring_red", 0.39),
            ("R", 0.105, r_deg, "spring_blue", 0.39),
        ]:
            add_beveled_box(mc, f"ChairBrassHinge_{side_tag}", (hinge_x, py, 0.082), (0.044, 0.048, 0.032), "brass", bevel=0.0)
            rad = math.radians(deg_s)
            arm_dir = Vector((math.cos(rad), 0.0, math.sin(rad)))
            arm_up = Vector((-math.sin(rad), 0.0, math.cos(rad)))
            p_pad = Vector((hinge_x, py, hinge_z)) + arm_dir * 0.54

            arm_mid = Vector((hinge_x, py, hinge_z)) + arm_dir * 0.285
            quat_ped = arm_dir.to_track_quat("X", "Z")
            add_beveled_box(mc, f"ChairPedalArm_{side_tag}", arm_mid, (0.58, 0.046, 0.032), "walnut", bevel=0.005, quat=quat_ped)
            pad_center = p_pad + arm_up * 0.017
            add_beveled_box(mc, f"ChairPedalDeck_{side_tag}", pad_center, (0.145, 0.175, 0.022), "walnut", bevel=0.004, quat=quat_ped)
            add_beveled_box(mc, f"ChairPedalTread_{side_tag}", pad_center + arm_up * 0.013, (0.132, 0.162, 0.012), "charcoal", bevel=0.003, quat=quat_ped)
            # Ribbed anti-slip tread bars across the charcoal pedal pad
            if not mc.glb_mode:
                for rib_off in (-0.042, -0.014, 0.014, 0.042):
                    rib_c = pad_center + arm_dir * rib_off + arm_up * 0.0195
                    add_beveled_box(mc, f"ChairPedalRib_{side_tag}_{rib_off:.3f}", rib_c, (0.009, 0.148, 0.003), "charcoal", bevel=0.0, quat=quat_ped)

            sp_attach = Vector((hinge_x, py * 0.78, hinge_z)) + arm_dir * 0.29 + arm_up * 0.020
            add_beveled_box(mc, f"PedalSpringEye_{side_tag}", sp_attach - arm_up * 0.008, (0.026, 0.022, 0.024), "brass", bevel=0.0, quat=quat_ped)
            cactus_hook_pt = Vector((cx - 0.22, math.copysign(0.078, py), hook_z + 0.010))
            add_helical_spring_mesh(mc, f"ChairHookedSpring_{side_tag}", cactus_hook_pt, sp_attach, sp_mat, coils=13, max_coil_len=None)

        if abs(l_deg - r_deg) < 1.0:
            rad0 = math.radians(l_deg)
            arm_d0 = Vector((math.cos(rad0), 0.0, math.sin(rad0)))
            dowel_c = Vector((hinge_x, 0.0, hinge_z)) + arm_d0 * 0.515
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
            add_barrel_arch_assembly(mc, "LadderBarrel", (-0.30, 0.0, 0.55), 0.33, 0.56, 0.064, 148.0, base_z=0.064)
            for sy_tag, sy in [("L", -0.275), ("R", 0.275)]:
                add_beveled_box(mc, f"LbBaseRail_{sy_tag}", (0.06, sy, 0.029), (1.18, 0.056, 0.058), "oak", bevel=0.007)
                add_beveled_box(mc, f"LbSlideSlot_{sy_tag}", (-0.24, sy * 1.07, 0.030), (0.46, 0.012, 0.014), "walnut", bevel=0.0)
                add_beveled_box(mc, f"LbSlideCarriage_{sy_tag}", (-0.30, sy * 0.91, 0.056), (0.56, 0.046, 0.032), "walnut", bevel=0.005)
                add_brass_star_knob(
                    mc,
                    f"LbStarKnob_{sy_tag}",
                    Vector((-0.30, sy + math.copysign(0.036, sy), 0.030)),
                    Vector((0.0, -math.copysign(1.0, sy), 0.0)),
                    radius=0.024,
                )
                add_cylinder_rod(mc, f"LbPost_{sy_tag}", (0.52, sy, 0.035), (0.48, sy, 1.05), 0.025, "walnut", segs=16, r2=0.022)
                add_ellipsoid(mc, f"LbPostCap_{sy_tag}", (0.48, sy, 1.058), 0.025, 0.025, 0.014, "brass", u_seg=12, v_seg=8)

            for idx_c, sx in enumerate((-0.48, 0.02, 0.51)):
                add_cylinder_rod(mc, f"LbLowerStretcher_{idx_c}", (sx, -0.275, 0.029), (sx, 0.275, 0.029), 0.018, "oak", segs=14)

            for idx_r, rz in enumerate((0.19, 0.38, 0.58, 0.76, 0.91, 1.01)):
                rx = 0.52 - (rz - 0.035) * 0.039
                bm_rung = bmesh.new()
                bmesh.ops.create_cone(bm_rung, cap_ends=True, cap_tris=True, segments=16, radius1=1.0, radius2=1.0, depth=0.56)
                bmesh.ops.scale(bm_rung, vec=(0.021, 0.014, 1.0), verts=bm_rung.verts)
                quat_y = Vector((0.0, 1.0, 0.0)).to_track_quat("Z", "X")
                mc.emit_bmesh(f"LbOakSlatRung_{idx_r}", bm_rung, "oak", loc=(rx, 0.0, rz), quat=quat_y)
                for sy in (-0.298, 0.298):
                    add_ellipsoid(mc, f"LbRungTenon_{idx_r}_{sy}", (rx, sy, rz), 0.008, 0.005, 0.008, "brass", u_seg=8, v_seg=6)

    else:
        add_beveled_box(mc, "MatCorkBase", (0.0, 0.0, 0.010), (2.04, 0.74, 0.020), "oak", bevel=0.0)
        add_piped_cushion(mc, "MatSagePad", (0.0, 0.0, 0.032), (1.94, 0.68, 0.028))
        add_swept_tube(mc, "MatCenterStitch", [Vector((-0.82, 0.0, 0.047)), Vector((0.84, 0.0, 0.047))], 0.0024, "suit_accent", closed=False, radial_segs=6)
        for tx in (-0.38, 0.24):
            add_swept_tube(mc, f"MatCrossStitch_{tx}", [Vector((tx, -0.22, 0.047)), Vector((tx, 0.22, 0.047))], 0.0022, "suit_accent", closed=False, radial_segs=6)
        for ey in (-0.22, 0.22):
            add_torus(mc, f"MatEyelet_{ey}", (-0.90, ey, 0.047), 0.014, 0.0038, "brass", axis="Z", segs=14, tsegs=6)

    surface_z = 0.418 if app == "reformer" else (0.578 if app == "cadillac" else 0.048)
    knee_span = (l_knee - r_knee).length
    knee_mid = l_knee.lerp(r_knee, 0.5)
    hand_span = (l_hand - r_hand).length
    hand_mid = l_hand.lerp(r_hand, 0.5)

    if "magic-circle" in props:
        ex_id = str(ex.get("id", "")).lower()
        wants_thigh_ring = any(k in ex_id for k in ("inner-thigh", "thigh", "bridge", "footwork"))
        wants_hand_ring = (ex_id == "ex-core-03") or (
            ("circle" in ex_id or "ring" in ex_id) and not wants_thigh_ring
        )
        if (
            (wants_thigh_ring or app != "mat")
            and 0.14 <= knee_span <= 0.40
            and abs(l_knee.x - r_knee.x) < 0.14
            and min(l_knee.z, r_knee.z) >= surface_z + 0.08
        ):
            # Placed accurately between the inner knees/thighs (never piercing the footbar!)
            rc = Vector((knee_mid.x, knee_mid.y, max(knee_mid.z, surface_z + 0.175)))
            add_sculpted_magic_circle(mc, rc, resting_horizontal=False)
        elif (
            (wants_hand_ring or app != "mat")
            and not rig.get("ropeToHands")
            and not rig.get("rolldownBar")
            and 0.16 <= hand_span <= 0.48
            and hand_mid.z >= surface_z + 0.20
        ):
            add_sculpted_magic_circle(mc, hand_mid, resting_horizontal=False)
        else:
            add_sculpted_magic_circle(mc, Vector((-0.28, 0.59, 0.0)), resting_horizontal=True)

    if "foam-roller" in props:
        if app == "mat" and rig.get("withFoamRollerUnderSpine"):
            add_beveled_eva_foam_roller(mc, 0.0, center_x=-0.16, cz=0.046 + 0.068)
        else:
            ry = -0.52 if app == "mat" else -0.50
            add_beveled_eva_foam_roller(mc, ry)

    if "mini-ball" in props:
        if (
            app != "mat"
            and 0.11 <= knee_span <= 0.34
            and abs(l_knee.x - r_knee.x) < 0.14
            and min(l_knee.z, r_knee.z) >= surface_z + 0.04
        ):
            # Nestled anatomically between the inner knees / distal inner thighs (never above kneecaps or near footbar!)
            ry_ball = max(0.058, min(0.082, (knee_span - 0.068) * 0.50))
            rx_ball = 0.084
            rz_ball = 0.084
            ball_nest = knee_mid.lerp(joints["pelvis"], 0.24)
            bp = Vector((ball_nest.x, ball_nest.y, max(ball_nest.z, surface_z + rz_ball + 0.004)))
            add_ellipsoid(
                mc,
                "MiniStabilityBall",
                bp,
                rx_ball,
                ry_ball,
                rz_ball,
                "ball",
                u_seg=22 if mc.glb_mode else 36,
                v_seg=14 if mc.glb_mode else 24,
            )
            add_cylinder_rod(
                mc,
                "MiniBall_KneeValve",
                (bp.x, bp.y, bp.z + rz_ball - 0.004),
                (bp.x, bp.y, bp.z + rz_ball + 0.001),
                0.007,
                "suit_accent",
                segs=10,
            )
        elif (
            app != "mat"
            and not rig.get("ropeToHands")
            and not rig.get("rolldownBar")
            and 0.14 <= hand_span <= 0.34
            and abs(l_hand.x - r_hand.x) < 0.10
            and hand_mid.z >= surface_z + 0.16
        ):
            r_hb = max(0.072, min(0.092, hand_span * 0.46))
            add_ellipsoid(
                mc,
                "MiniStabilityBall",
                hand_mid,
                r_hb,
                r_hb,
                r_hb,
                "ball",
                u_seg=22 if mc.glb_mode else 36,
                v_seg=14 if mc.glb_mode else 24,
            )
        else:
            # Grounded cleanly on the studio floor beside the apparatus (never floating or piercing feet!)
            floor_xy = (0.44, 0.52) if app == "mat" else (0.48, 0.54)
            add_matte_sage_mini_ball(mc, floor_xy)

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
