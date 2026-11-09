import type { ApparatusType, BodyPosition } from '../types/pilates';

export type RigCameraPreset = 'isometric' | 'sagittal' | 'coronal' | 'transverse';
export type RigMotionPhase = 'setup' | 'peak' | 'return';

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface ProjectedPoint2D {
  u: number;
  v: number;
  depth: number;
}

export interface ProjectedJointChain2D {
  head: ProjectedPoint2D;
  shoulder: ProjectedPoint2D;
  pelvis: ProjectedPoint2D;
  knee: ProjectedPoint2D;
  ankle: ProjectedPoint2D;
}

export interface Apparatus3dRigScene {
  apparatus: ApparatusType;
  bodyPosition: BodyPosition;
  cameraPreset: RigCameraPreset;
  phase: RigMotionPhase;
  frameVertices2D: ProjectedPoint2D[];
  carriageRect2D: ProjectedPoint2D[];
  springVector2D: {
    origin: ProjectedPoint2D;
    target: ProjectedPoint2D;
    tensionLabel: string;
  };
  centerOfMass2D: ProjectedPoint2D;
  jointChain2D: ProjectedJointChain2D;
}

const CAMERA_ANGLES: Record<RigCameraPreset, { yawDeg: number; pitchDeg: number }> = {
  isometric: { yawDeg: 35, pitchDeg: 25 },
  sagittal: { yawDeg: 0, pitchDeg: 8 },
  coronal: { yawDeg: 90, pitchDeg: 8 },
  transverse: { yawDeg: 0, pitchDeg: 85 },
};

export const PHASE_CARRIAGE_RATIOS: Record<RigMotionPhase, number> = {
  setup: 0.15,
  peak: 0.75,
  return: 0.25,
};

/**
 * Projects a 3D studio coordinate (in meters relative to apparatus center)
 * into a 2D SVG viewport (`320x180`) using orthographic Blender-style camera rotation.
 */
export function projectStudioPoint3D(
  point: Vector3D,
  preset: RigCameraPreset = 'isometric',
  viewport = { width: 320, height: 180, scale: 95 },
): ProjectedPoint2D {
  const { yawDeg, pitchDeg } = CAMERA_ANGLES[preset];
  const yaw = (yawDeg * Math.PI) / 180;
  const pitch = (pitchDeg * Math.PI) / 180;

  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);

  // Rotate around Y axis (yaw), then X axis (pitch)
  const rx = point.x * cosY + point.z * sinY;
  const rz1 = -point.x * sinY + point.z * cosY;
  const ry = point.y * cosP - rz1 * sinP;
  const rz = point.y * sinP + rz1 * cosP;

  return {
    u: Number((viewport.width / 2 + rx * viewport.scale).toFixed(2)),
    v: Number((viewport.height / 2 - ry * viewport.scale).toFixed(2)),
    depth: Number(rz.toFixed(3)),
  };
}

const POSITION_COM_HEIGHT: Record<BodyPosition, number> = {
  supine: 0.22,
  prone: 0.22,
  'side-lying': 0.26,
  seated: 0.48,
  kneeling: 0.56,
  quadruped: 0.42,
  standing: 0.82,
};

function buildJointChain3D(
  bodyPosition: BodyPosition,
  carriageStartX: number,
  offset: number,
): Record<keyof ProjectedJointChain2D, Vector3D> {
  const baseX = carriageStartX + 0.35;
  const ext = offset * 0.22;
  if (bodyPosition === 'standing' || bodyPosition === 'kneeling' || bodyPosition === 'seated') {
    const baseY = POSITION_COM_HEIGHT[bodyPosition] ?? 0.5;
    return {
      head: { x: baseX, y: baseY + 0.32, z: 0 },
      shoulder: { x: baseX, y: baseY + 0.18, z: 0 },
      pelvis: { x: baseX, y: baseY - 0.04, z: 0 },
      knee: { x: baseX - 0.14 - ext * 0.4, y: Math.max(0.12, baseY - 0.22), z: 0 },
      ankle: { x: -0.95, y: 0.14, z: 0 },
    };
  }
  // Supine / Prone / Side-lying / Quadruped horizontal chain along carriage
  const y = POSITION_COM_HEIGHT[bodyPosition] ?? 0.22;
  return {
    head: { x: carriageStartX + 0.62, y: y + 0.04, z: 0 },
    shoulder: { x: carriageStartX + 0.46, y, z: 0 },
    pelvis: { x: carriageStartX + 0.18, y, z: 0 },
    knee: { x: carriageStartX - 0.08 - ext * 0.5, y: y + 0.12 - ext * 0.2, z: 0 },
    ankle: { x: -0.98, y: 0.18, z: 0 },
  };
}

/**
 * Builds a deterministic 2D projection of a 3D Pilates apparatus frame, carriage,
 * spring resistance vector, practitioner Center of Mass (`CoM`), and 5-joint kinematic chain.
 */
export function buildApparatus3dRigScene(input: {
  apparatus: ApparatusType;
  bodyPosition: BodyPosition;
  cameraPreset?: RigCameraPreset;
  phase?: RigMotionPhase;
  carriageOffsetRatio?: number;
  springsLabel?: string;
}): Apparatus3dRigScene {
  const preset = input.cameraPreset ?? 'isometric';
  const phase = input.phase ?? 'setup';
  const defaultOffset = PHASE_CARRIAGE_RATIOS[phase];
  const offset = Math.max(0, Math.min(1, input.carriageOffsetRatio ?? defaultOffset));

  const frame3D: Vector3D[] = [
    { x: -1.1, y: 0, z: -0.35 },
    { x: 1.1, y: 0, z: -0.35 },
    { x: 1.1, y: 0, z: 0.35 },
    { x: -1.1, y: 0, z: 0.35 },
  ];

  const carriageStartX = -0.75 + offset * 0.65;
  const carriage3D: Vector3D[] = [
    { x: carriageStartX, y: 0.06, z: -0.28 },
    { x: carriageStartX + 0.75, y: 0.06, z: -0.28 },
    { x: carriageStartX + 0.75, y: 0.06, z: 0.28 },
    { x: carriageStartX, y: 0.06, z: 0.28 },
  ];

  const springOrigin3D: Vector3D = { x: -1.05, y: 0.05, z: 0 };
  const springTarget3D: Vector3D = { x: carriageStartX, y: 0.05, z: 0 };
  const com3D: Vector3D = {
    x: carriageStartX + 0.35,
    y: POSITION_COM_HEIGHT[input.bodyPosition] ?? 0.35,
    z: 0,
  };
  const joints3D = buildJointChain3D(input.bodyPosition, carriageStartX, offset);

  return {
    apparatus: input.apparatus,
    bodyPosition: input.bodyPosition,
    cameraPreset: preset,
    phase,
    frameVertices2D: frame3D.map((pt) => projectStudioPoint3D(pt, preset)),
    carriageRect2D: carriage3D.map((pt) => projectStudioPoint3D(pt, preset)),
    springVector2D: {
      origin: projectStudioPoint3D(springOrigin3D, preset),
      target: projectStudioPoint3D(springTarget3D, preset),
      tensionLabel: input.springsLabel?.trim() || '기본 스프링 저항',
    },
    centerOfMass2D: projectStudioPoint3D(com3D, preset),
    jointChain2D: {
      head: projectStudioPoint3D(joints3D.head, preset),
      shoulder: projectStudioPoint3D(joints3D.shoulder, preset),
      pelvis: projectStudioPoint3D(joints3D.pelvis, preset),
      knee: projectStudioPoint3D(joints3D.knee, preset),
      ankle: projectStudioPoint3D(joints3D.ankle, preset),
    },
  };
}
