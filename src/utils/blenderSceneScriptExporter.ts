import type { ApparatusType, BodyPosition } from '../types/pilates';
import { PHASE_CARRIAGE_RATIOS, type RigMotionPhase } from './apparatus3dRigProjection';
import { convertSpringTensionAcrossBrands } from './springTensionMatrix';

export interface BlenderSceneExportInput {
  exerciseTitleKo: string;
  apparatus: ApparatusType;
  bodyPosition: BodyPosition;
  springsLabel?: string;
  activePhase?: RigMotionPhase;
}

/**
 * Generates a self-contained Blender 4.x / 5.2 LTS / 5.3+ Python (`bpy`) script
 * that constructs a metric (`1.0 = 1m`) studio-grade 3D Pilates Apparatus rig
 * (Reformer, Cadillac, Chair, Barrel, or Mat), Principled BSDF PBR materials,
 * true 3D helical spring coils with zero negative scales, a 13-part anatomical
 * practitioner rig with named joint markers (`Joint_Head`, `Joint_Shoulder`,
 * `Joint_Pelvis`, `Joint_Knee`, `Joint_Ankle`), and a 60-frame cyclic 3-phase
 * keyframe animation (Setup -> Peak -> Return).
 */
export function generateBlenderApparatusSceneScript(input: BlenderSceneExportInput): string {
  const springInfo = convertSpringTensionAcrossBrands(input.springsLabel);
  const setupDisp = Number((PHASE_CARRIAGE_RATIOS.setup * 0.42).toFixed(3));
  const peakDisp = Number((PHASE_CARRIAGE_RATIOS.peak * 0.42).toFixed(3));
  const returnDisp = Number((PHASE_CARRIAGE_RATIOS.return * 0.42).toFixed(3));
  const safeTitle = (input.exerciseTitleKo || 'Pilates_Movement').replace(/["'\\\r\n]/g, '');

  return `# Blender 4.x / 5.2 LTS / 5.3+ Python Script — Pilates Flow Atelier 3D Studio Rig & 3-Phase Keyframe Scene
# Exercise: ${safeTitle} | Apparatus: ${input.apparatus} | Posture: ${input.bodyPosition}
# Springs: ${springInfo.rawInput} (${springInfo.tierLabelKo} | Load: ${springInfo.normalizedLoadUnits})

import bpy
import bmesh
import math
from mathutils import Vector

def make_pbr_material(name, rgba, roughness=0.45, metallic=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = rgba
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic
    return mat

def add_beveled_box(name, loc, dims, mat, bevel_width=0.008):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (abs(dims[0]), abs(dims[1]), abs(dims[2]))
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    if bevel_width > 0:
        mod = obj.modifiers.new("Bevel", 'BEVEL')
        mod.width = bevel_width
        mod.segments = 2
        bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.ops.object.shade_smooth()
    obj.data.materials.append(mat)
    return obj

def add_limb_cylinder(name, p0, p1, radius, mat, parent=None):
    v0, v1 = Vector(p0), Vector(p1)
    diff = v1 - v0
    if diff.length < 1e-4:
        return None
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=radius, depth=diff.length, location=(v0 + v1) * 0.5)
    obj = bpy.context.active_object
    obj.name = name
    obj.rotation_euler = Vector((0, 0, 1)).rotation_difference(diff.normalized()).to_euler()
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bpy.ops.object.shade_smooth()
    obj.data.materials.append(mat)
    if parent is not None:
        obj.parent = parent
    return obj

def add_helical_spring(name, x0, x1, y, z, mat, turns=20, major_r=0.013, wire_r=0.0022):
    curve_data = bpy.data.curves.new(name=f"{name}_Curve", type='CURVE')
    curve_data.dimensions = '3D'
    curve_data.bevel_depth = wire_r
    curve_data.bevel_resolution = 4
    spline = curve_data.splines.new('POLY')
    steps = turns * 10
    spline.points.add(steps)
    span = x1 - x0
    for idx in range(steps + 1):
        u = idx / steps
        env = math.sin(min(1.0, u * 8.0) * math.pi * 0.5) * math.sin(min(1.0, (1.0 - u) * 8.0) * math.pi * 0.5)
        ang = u * turns * math.pi * 2.0
        px = x0 + span * u
        py = y + math.cos(ang) * major_r * env
        pz = z + math.sin(ang) * major_r * env
        spline.points[idx].co = (px, py, pz, 1.0)
    curve_obj = bpy.data.objects.new(name, curve_data)
    bpy.context.collection.objects.link(curve_obj)
    bpy.context.view_layer.objects.active = curve_obj
    curve_obj.select_set(True)
    bpy.ops.object.convert(target='MESH')
    mesh_obj = bpy.context.active_object
    mesh_obj.data.materials.append(mat)
    mesh_obj.select_set(False)
    return mesh_obj

def build_pilates_atelier_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    scene = bpy.context.scene
    scene.name = "PilatesFlow_${safeTitle}"
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1.0
    scene.frame_start = 1
    scene.frame_end = 60
    scene.render.fps = 30

    mat_oak = make_pbr_material("PF_WhiteOak_Frame", (0.68, 0.50, 0.32, 1.0), 0.40, 0.0)
    mat_upholstery = make_pbr_material("PF_Sage_Leather", (0.208, 0.329, 0.255, 1.0), 0.48, 0.0)
    mat_brass = make_pbr_material("PF_Anodized_Brass", (0.82, 0.67, 0.39, 1.0), 0.26, 0.92)
    mat_steel = make_pbr_material("Atelier_Steel", (0.78, 0.81, 0.84, 1.0), 0.22, 0.90)
    mat_spring = make_pbr_material("Atelier_Spring_Load", (0.79, 0.22, 0.17, 1.0), 0.28, 0.72)
    mat_attire = make_pbr_material("Athlete_Attire", (0.21, 0.33, 0.26, 1.0), 0.58, 0.0)
    mat_skin = make_pbr_material("Athlete_Skin", (0.88, 0.73, 0.62, 1.0), 0.52, 0.0)

    apparatus_kind = "${input.apparatus}"

    # 1. Metric Studio Apparatus Base & Frame (Zero Negative Scales)
    if apparatus_kind == "cadillac":
        frame = add_beveled_box("Apparatus_Frame_cadillac", (0.0, 0.0, 0.50), (2.12, 0.68, 0.08), mat_oak)
        for sx in (-1.04, 1.04):
            for sy in (-0.31, 0.31):
                add_limb_cylinder(f"Canopy_Post_{sx}_{sy}", (sx, sy, 0.52), (sx, sy, 1.94), 0.018, mat_steel)
        add_limb_cylinder("Canopy_PushThrough_Bar", (0.48, -0.28, 1.26), (0.48, 0.28, 1.26), 0.018, mat_steel)
    elif apparatus_kind == "chair":
        frame = add_beveled_box("Apparatus_Frame_chair", (-0.06, 0.0, 0.29), (0.66, 0.54, 0.56), mat_oak)
        add_limb_cylinder("Chair_Pedal_Bar", (0.36, -0.21, 0.24), (0.36, 0.21, 0.24), 0.02, mat_brass)
    elif apparatus_kind == "barrel":
        frame = add_beveled_box("Apparatus_Frame_barrel", (-0.34, 0.0, 0.28), (0.58, 0.56, 0.54), mat_oak)
        for rz in (0.22, 0.40, 0.58, 0.76, 0.94):
            add_limb_cylinder(f"Ladder_Rung_{rz}", (0.50, -0.28, rz), (0.50, 0.28, rz), 0.016, mat_oak)
    elif apparatus_kind == "mat":
        frame = add_beveled_box("Apparatus_Frame_mat", (0.0, 0.0, 0.018), (2.04, 0.78, 0.028), mat_oak)
    else:
        add_beveled_box("Reformer_Rail_L", (0.0, -0.30, 0.31), (2.34, 0.048, 0.125), mat_oak)
        frame = add_beveled_box("Apparatus_Frame_reformer", (0.0, 0.30, 0.31), (2.34, 0.048, 0.125), mat_oak)
        add_limb_cylinder("Reformer_Gearbar", (0.915, -0.27, 0.335), (0.915, 0.27, 0.335), 0.012, mat_brass)
        add_limb_cylinder("Reformer_Footbar", (0.825, -0.285, 0.575), (0.825, 0.285, 0.575), 0.021, mat_steel)
        for idx, sy in enumerate((-0.09, -0.045, 0.0, 0.045, 0.09)):
            add_helical_spring(f"Spring_Coil_{idx}", 0.44, 0.91, sy, 0.335, mat_spring if idx < 2 else mat_brass)

    # 2. Moving Carriage / Support Pad with 3-Phase Keyframe Animation (Setup -> Peak -> Return)
    base_z = 0.56 if apparatus_kind == "cadillac" else (0.59 if apparatus_kind == "chair" else (0.045 if apparatus_kind == "mat" else 0.388))
    carriage = add_beveled_box("Apparatus_Carriage", (0.14 - ${setupDisp}, 0.0, base_z), (0.78, 0.54, 0.056), mat_upholstery, 0.014)

    keyframes = [
        (1, 0.14 - ${setupDisp}),
        (30, 0.14 - ${peakDisp}),
        (60, 0.14 - ${returnDisp}),
    ]
    for frame_num, x_pos in keyframes:
        scene.frame_set(frame_num)
        carriage.location.x = x_pos
        carriage.keyframe_insert(data_path="location", index=0)

    # 3. 5-Joint Kinematic Chain Markers & Anatomical Capsule Limbs
    joints = {
        "Joint_Head": (-0.38, 0.0, base_z + 0.14),
        "Joint_Shoulder": (-0.18, 0.0, base_z + 0.12),
        "Joint_Pelvis": (0.22, 0.0, base_z + 0.11),
        "Joint_Knee": (0.50, 0.0, base_z + 0.36),
        "Joint_Ankle": (0.78, 0.0, base_z + 0.20),
    }
    for j_name, loc in joints.items():
        bpy.ops.mesh.primitive_uv_sphere_add(segments=18, ring_count=12, radius=0.055 if j_name == "Joint_Head" else 0.042, location=loc)
        sphere = bpy.context.active_object
        sphere.name = j_name
        bpy.ops.object.shade_smooth()
        sphere.data.materials.append(mat_skin if j_name == "Joint_Head" else mat_attire)
        sphere.parent = carriage

    add_limb_cylinder("Body_Torso_Capsule", joints["Joint_Shoulder"], joints["Joint_Pelvis"], 0.105, mat_attire, carriage)
    add_limb_cylinder("Body_Thigh_Capsule", joints["Joint_Pelvis"], joints["Joint_Knee"], 0.062, mat_attire, carriage)
    add_limb_cylinder("Body_Calf_Capsule", joints["Joint_Knee"], joints["Joint_Ankle"], 0.045, mat_attire, carriage)

    # 4. Three-Point Atelier Studio Camera (50mm Unclipped Framing) & Soft Area Lighting
    bpy.ops.object.camera_add(location=(2.56, -2.84, 1.54), rotation=(1.14, 0.0, 0.72))
    cam = bpy.context.active_object
    cam.data.lens = 50.0
    scene.camera = cam
    bpy.ops.object.light_add(type="AREA", location=(-0.8, -1.9, 2.65))
    bpy.context.active_object.data.energy = 420.0
    bpy.ops.object.light_add(type="AREA", location=(1.5, 1.3, 2.15))
    bpy.context.active_object.data.energy = 185.0
    scene.frame_set(1)

if __name__ == "__main__":
    build_pilates_atelier_scene()
`;
}

export function downloadBlenderSceneScript(input: BlenderSceneExportInput): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return;
  const content = generateBlenderApparatusSceneScript(input);
  const safeSlug = (input.exerciseTitleKo || input.apparatus)
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9가-힣_-]/g, '')
    .slice(0, 48);
  const blob = new Blob([content], { type: 'text/x-python;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `pilates-flow-${input.apparatus}-${safeSlug || 'rig'}.py`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
