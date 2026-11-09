import type { ApparatusType, BodyPosition } from '../types/pilates';

export type RigCameraPreset = 'isometric' | 'sagittal' | 'coronal' | 'transverse';

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

export interface Apparatus3dRigScene {
  apparatus: ApparatusType;
  bodyPosition: BodyPosition;
  cameraPreset: RigCameraPreset;
  frameVertices2D: ProjectedPoint2D[];
  carriageRect2D: ProjectedPoint2D[];
  springVector2D: {
    origin: ProjectedPoint2D;
    target: ProjectedPoint2D;
    tensionLabel: string;
  };
  centerOfMass2D: ProjectedPoint2D;
}

const CAMERA_ANGLES: Record<RigCameraPreset, { yawDeg: number; pitchDeg: number }> = {
  isometric: { yawDeg: 35, pitchDeg: 25 },
  sagittal: { yawDeg: 0, pitchDeg: 8 },
  coronal: { yawDeg: 90, pitchDeg: 8 },
  transverse: { yawDeg: 0, pitchDeg: 85 },
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

/**
 * Builds a deterministic 2D projection of a 3D Pilates apparatus frame, carriage,
 * spring resistance vector, and practitioner Center of Mass (`CoM`).
 */
export function buildApparatus3dRigScene(input: {
  apparatus: ApparatusType;
  bodyPosition: BodyPosition;
  cameraPreset?: RigCameraPreset;
  carriageOffsetRatio?: number;
  springsLabel?: string;
}): Apparatus3dRigScene {
  const preset = input.cameraPreset ?? 'isometric';
  const offset = Math.max(0, Math.min(1, input.carriageOffsetRatio ?? 0.25));

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

  return {
    apparatus: input.apparatus,
    bodyPosition: input.bodyPosition,
    cameraPreset: preset,
    frameVertices2D: frame3D.map((pt) => projectStudioPoint3D(pt, preset)),
    carriageRect2D: carriage3D.map((pt) => projectStudioPoint3D(pt, preset)),
    springVector2D: {
      origin: projectStudioPoint3D(springOrigin3D, preset),
      target: projectStudioPoint3D(springTarget3D, preset),
      tensionLabel: input.springsLabel?.trim() || '기본 스프링 저항',
    },
    centerOfMass2D: projectStudioPoint3D(com3D, preset),
  };
}
