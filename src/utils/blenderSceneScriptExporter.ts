import type { ApparatusType, BodyPosition } from '../types/pilates';
import {
  PHASE_CARRIAGE_RATIOS,
  type RigMotionPhase,
} from './apparatus3dRigProjection';
import { convertSpringTensionAcrossBrands } from './springTensionMatrix';

export interface BlenderSceneExportInput {
  exerciseTitleKo: string;
  apparatus: ApparatusType;
  bodyPosition: BodyPosition;
  springsLabel?: string;
  activePhase?: RigMotionPhase;
}

/**
 * Generates a self-contained Blender 4.x Python (`bpy`) script (`@Blender` integration)
 * that constructs a 3D Pilates Apparatus rig, spring tension cylinders, and a 3-keyframe
 * (Setup / Peak / Return) 5-joint kinematic chain in Blender's 3D viewport.
 */
export function generateBlenderApparatusSceneScript(
  input: BlenderSceneExportInput,
): string {
  const springInfo = convertSpringTensionAcrossBrands(input.springsLabel);
  const setupDisp = Number((PHASE_CARRIAGE_RATIOS.setup * 0.85).toFixed(3));
  const peakDisp = Number((PHASE_CARRIAGE_RATIOS.peak * 0.85).toFixed(3));
  const returnDisp = Number((PHASE_CARRIAGE_RATIOS.return * 0.85).toFixed(3));
  const safeTitle = (input.exerciseTitleKo || 'Pilates_Movement').replace(/["'\\]/g, '');

  return `# Blender 4.x Python Script — Pilates Flow Atelier 3D Apparatus & 5-Joint Keyframe Rig
# Exercise: ${safeTitle} | Apparatus: ${input.apparatus} | Posture: ${input.bodyPosition}
# Springs: ${springInfo.rawInput} (${springInfo.tierLabelKo} | Load: ${springInfo.normalizedLoadUnits})

import bpy

def build_pilates_atelier_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.name = "PilatesFlow_${safeTitle}"
    scene.frame_start = 1
    scene.frame_end = 60

    # 1. Apparatus Frame (2.4m x 0.65m x 0.35m)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.0, 0.0, 0.175))
    frame = bpy.context.active_object
    frame.name = "Apparatus_Frame_${input.apparatus}"
    frame.scale = (2.4, 0.65, 0.08)

    # 2. Moving Carriage with 3-Phase Keyframe Animation (Setup -> Peak -> Return)
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.35 + ${setupDisp}, 0.0, 0.24))
    carriage = bpy.context.active_object
    carriage.name = "Apparatus_Carriage"
    carriage.scale = (0.95, 0.58, 0.05)

    keyframes = [
        (1, -0.35 + ${setupDisp}),
        (30, -0.35 + ${peakDisp}),
        (60, -0.35 + ${returnDisp}),
    ]
    for frame_num, x_pos in keyframes:
        scene.frame_set(frame_num)
        carriage.location.x = x_pos
        carriage.keyframe_insert(data_path="location", index=0)

    # 3. 5-Joint Kinematic Chain Markers (Head, Shoulder, Pelvis, Knee, Ankle)
    joints = {
        "Joint_Head": (-0.65, 0.0, 0.42),
        "Joint_Shoulder": (-0.45, 0.0, 0.38),
        "Joint_Pelvis": (-0.10, 0.0, 0.35),
        "Joint_Knee": (0.25, 0.0, 0.48),
        "Joint_Ankle": (0.60, 0.0, 0.42),
    }
    for j_name, loc in joints.items():
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.055, location=loc)
        sphere = bpy.context.active_object
        sphere.name = j_name
        sphere.parent = carriage

    # 4. Studio Camera & Area Light
    bpy.ops.object.camera_add(location=(2.8, -2.8, 2.1), rotation=(1.05, 0.0, 0.78))
    scene.camera = bpy.context.active_object
    bpy.ops.object.light_add(type="AREA", location=(0.0, -1.5, 2.6))
    bpy.context.active_object.data.energy = 350.0

if __name__ == "__main__":
    build_pilates_atelier_scene()
`;
}
