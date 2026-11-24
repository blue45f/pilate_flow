import type { ApparatusType, FootbarState, HeadrestState, PilatesExercise } from '../types/pilates';
import {
  hasDedicated3DExerciseRig,
  type ActiveMuscleZone3D,
  type Universal3DPoseRig,
} from '../data/universal3dExerciseRigs';
import { sampleStudio3DMotionRig } from './studio3dMotionTrack';
import { MOTION_STUDIO_MATERIALS, MOTION_STUDIO_RGB } from './motionStudioMaterials';
import {
  resolveStudio3DMotionForExercise,
  type Studio3DSignatureId,
} from './studio3dMotionCatalog';
import {
  getSharedStudio3DWebGL2Renderer,
  type Studio3DGpuRenderer,
  type Studio3DRenderBackend,
  type StudioMaterialRole,
  type StudioQuadFace,
} from './studio3dWebgl2Renderer';
import { getSharedStudio3DWebGPURenderer } from './studio3dWebgpuRenderer';
import {
  getCachedSkinnedHumanoidAsset,
  skinHumanoidToStudioQuads,
} from './skinnedHumanoidRetargeter';
import {
  buildDynamicApparatusQuads,
  getCachedApparatusDynamicAsset,
} from './apparatusDynamicGlbLoader';

export type { Studio3DGpuRenderer, Studio3DRenderBackend, StudioMaterialRole };
export type Studio3DCharacterPipeline = 'skinned-glb' | 'procedural';
export type Studio3DApparatusPipeline = 'dynamic-glb' | 'procedural';

export type Studio3DShaderPreset = 'studio-pbr' | 'biomech-xray' | 'game-arena' | 'clay-wire';

export type Studio3DPropOverride =
  | 'default'
  | 'none'
  | 'short-box'
  | 'long-box'
  | 'jumpboard'
  | 'ring'
  | 'foam-roller'
  | 'mini-ball';

export interface CameraPresetSpec {
  readonly id: string;
  readonly labelKo: string;
  readonly yawDeg: number;
  readonly pitchDeg: number;
  readonly zoom: number;
  readonly autoTurntable?: boolean;
}

export const STUDIO_3D_CAMERA_PRESETS: readonly CameraPresetSpec[] = [
  { id: 'quarter', labelKo: '35° 스튜디오', yawDeg: -34, pitchDeg: 21, zoom: 1.04 },
  { id: 'side', labelKo: '측면 0° 정렬', yawDeg: 0, pitchDeg: 14, zoom: 1.02 },
  { id: 'front', labelKo: '정면 90° 대칭', yawDeg: -88, pitchDeg: 16, zoom: 1.05 },
  { id: 'top', labelKo: '상단 탑뷰', yawDeg: -22, pitchDeg: 74, zoom: 0.96 },
  { id: 'rear', labelKo: '후면 견갑', yawDeg: 152, pitchDeg: 20, zoom: 1.04 },
  {
    id: 'turntable',
    labelKo: '360° 자동 회전',
    yawDeg: -34,
    pitchDeg: 22,
    zoom: 1.02,
    autoTurntable: true,
  },
];

export interface Biomech3DTelemetry {
  readonly kneeAngleDeg: number;
  readonly hipAngleDeg: number;
  readonly shoulderAngleDeg: number;
  readonly spineArticulationDeg: number;
  readonly comHeightCm: number;
  readonly activeSpringLabel: string;
}

export type Studio3DHotspotId = 'spine' | 'hip' | 'knee' | 'shoulder' | 'apparatus';

export interface Studio3DHotspot {
  readonly id: Studio3DHotspotId;
  readonly labelKo: string;
  readonly metricKo: string;
  readonly cueKo: string;
  readonly x: number;
  readonly y: number;
  readonly pos3d: Vec3;
}

export type Vec3 = readonly [number, number, number];
type Rgb = readonly [number, number, number];

const add3 = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub3 = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul3 = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot3 = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross3 = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const len3 = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
const norm3 = (a: Vec3): Vec3 => {
  const l = len3(a);
  return l > 1e-6 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 1];
};
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const vlerp = (a: Vec3, b: Vec3, t: number): Vec3 => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];
const smoothstep = (t: number): number => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};
const bezier3 = (p0: Vec3, p1: Vec3, p2: Vec3, t: number): Vec3 => {
  const u = 1 - t;
  return [
    u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
    u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
    u * u * p0[2] + 2 * u * t * p1[2] + t * t * p2[2],
  ];
};
const bezier3Tan = (p0: Vec3, p1: Vec3, p2: Vec3, t: number): Vec3 => {
  const u = 1 - t;
  return norm3([
    2 * u * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]),
    2 * u * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]),
    2 * u * (p1[2] - p0[2]) + 2 * t * (p2[2] - p1[2]),
  ]);
};

function sampleRounded2SegChain(
  p0: Vec3,
  p1: Vec3,
  p2: Vec3,
  s: number,
  cornerBlend = 0.22,
): [Vec3, Vec3] {
  const c0 = 0.5 - cornerBlend;
  const c1 = 0.5 + cornerBlend;
  if (s <= c0) {
    const u = (s / c0) * (1 - cornerBlend * 1.4);
    return [vlerp(p0, p1, u), norm3(sub3(p1, p0))];
  }
  if (s >= c1) {
    const u = cornerBlend * 1.4 + ((s - c1) / (1 - c1)) * (1 - cornerBlend * 1.4);
    return [vlerp(p1, p2, u), norm3(sub3(p2, p1))];
  }
  const bt = (s - c0) / (c1 - c0);
  const qa = vlerp(p0, p1, 1 - cornerBlend * 1.4);
  const qb = vlerp(p1, p2, cornerBlend * 1.4);
  return [bezier3(qa, p1, qb, bt), bezier3Tan(qa, p1, qb, bt)];
}

function interiorAngleDeg(a: Vec3, vertex: Vec3, b: Vec3): number {
  const u = norm3(sub3(a, vertex));
  const v = norm3(sub3(b, vertex));
  const c = Math.max(-1, Math.min(1, dot3(u, v)));
  return Math.round((Math.acos(c) * 180) / Math.PI);
}

function solve2BoneIK(
  root: Vec3,
  target: Vec3,
  l1: number,
  l2: number,
  pole: Vec3,
): [Vec3, Vec3, Vec3] {
  let tgt = target;
  let dVec = sub3(tgt, root);
  let dist = len3(dVec);
  const maxR = (l1 + l2) * 0.992;
  const minR = Math.abs(l1 - l2) + 0.03;
  if (dist > maxR) {
    tgt = add3(root, mul3(norm3(dVec), maxR));
    dVec = sub3(tgt, root);
    dist = maxR;
  } else if (dist < minR) {
    const dir = dist > 1e-5 ? norm3(dVec) : ([1, 0, 0] as Vec3);
    tgt = add3(root, mul3(dir, minR));
    dVec = sub3(tgt, root);
    dist = minR;
  }
  const u = norm3(dVec);
  let bend = sub3(pole, mul3(u, dot3(pole, u)));
  if (len3(bend) < 1e-4) {
    bend = cross3(u, [0, 1, 0]);
    if (len3(bend) < 1e-4) bend = cross3(u, [0, 0, 1]);
  }
  bend = norm3(bend);
  const cosA = Math.max(-1, Math.min(1, (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist)));
  const angA = Math.acos(cosA);
  const mid = add3(root, mul3(add3(mul3(u, Math.cos(angA)), mul3(bend, Math.sin(angA))), l1));
  return [mid, tgt, bend];
}

interface PoseRigKeyframe {
  readonly pelvis: Vec3;
  readonly spineMid: Vec3;
  readonly chest: Vec3;
  readonly antHint: Vec3;
  readonly pelvisRight?: Vec3;
  readonly lFoot: Vec3;
  readonly rFoot: Vec3;
  readonly lKneePole: Vec3;
  readonly rKneePole: Vec3;
  readonly lHand: Vec3;
  readonly rHand: Vec3;
  readonly lElbowPole: Vec3;
  readonly rElbowPole: Vec3;
  readonly carriageX?: number;
  readonly pedalDeg?: number;
  readonly lPedalDeg?: number;
  readonly rPedalDeg?: number;
  readonly rolldownBar?: readonly [number, number];
  readonly rolldownBarAnchorX?: number;
  readonly pushthroughDeg?: number;
  readonly armSpringsFrom?: readonly [number, number];
  readonly withLongbox?: boolean;
  readonly withShortbox?: boolean;
  readonly withJumpboard?: boolean;
  readonly withChairHandles?: boolean;
  readonly isSpineCorrector?: boolean;
  readonly ropeToFeet?: boolean;
  readonly ropeToHands?: boolean;
  readonly legSprings?: boolean;
  readonly sideLegSpring?: 'right' | 'left';
  readonly trapezeStrap?: boolean;
  readonly withDumbbells?: boolean;
  readonly withTheraband?: boolean;
  readonly withFoamRollerUnderSpine?: boolean;
  readonly trajectoryFocus?: Universal3DPoseRig['trajectoryFocus'];
  readonly poseFeatureKo?: string;
  readonly rigScope?: Universal3DPoseRig['rigScope'];
  readonly activeZones: readonly ActiveMuscleZone3D[];
}

function samplePoseRig(signatureId: Studio3DSignatureId, rawT: number): PoseRigKeyframe {
  const ts = smoothstep(rawT);
  switch (signatureId) {
    case 'reformer-bridge': {
      const cx = lerp(0.24, 0.14, ts);
      const ct = 0.41;
      return {
        carriageX: cx,
        pelvis: [cx + 0.25, 0, ct + lerp(0.1, 0.34, ts)],
        spineMid: [cx + 0.03, 0, ct + lerp(0.1, 0.23, ts)],
        chest: [cx - 0.17, 0, ct + 0.11],
        antHint: [lerp(0, 0.32, ts), 0, 1],
        lFoot: [0.82, -0.09, 0.57],
        rFoot: [0.82, 0.09, 0.57],
        lKneePole: [0.25, -0.05, 1.25],
        rKneePole: [0.25, 0.05, 1.25],
        lHand: [cx + 0.22, -0.22, ct + 0.04],
        rHand: [cx + 0.22, 0.22, ct + 0.04],
        lElbowPole: [0.02, -0.35, -0.25],
        rElbowPole: [0.02, 0.35, -0.25],
        activeZones: ['glutes', 'core'],
      };
    }
    case 'reformer-shortspine': {
      const cx = lerp(-0.08, 0.2, ts);
      const ct = 0.41;
      return {
        carriageX: cx,
        ropeToFeet: true,
        pelvis: vlerp([cx + 0.22, 0, ct + 0.1], [cx - 0.02, 0, ct + 0.44], ts),
        spineMid: vlerp([cx + 0.02, 0, ct + 0.1], [cx - 0.12, 0, ct + 0.26], ts),
        chest: [cx - 0.18, 0, ct + 0.11],
        antHint: vlerp([0, 0, 1], [-0.55, 0, 0.85], ts),
        lFoot: vlerp([cx + 0.62, -0.08, ct + 0.58], [cx - 0.18, -0.08, ct + 0.72], ts),
        rFoot: vlerp([cx + 0.62, 0.08, ct + 0.58], [cx - 0.18, 0.08, ct + 0.72], ts),
        lKneePole: [-0.4, -0.06, 0.85],
        rKneePole: [-0.4, 0.06, 0.85],
        lHand: [cx + 0.2, -0.22, ct + 0.04],
        rHand: [cx + 0.2, 0.22, ct + 0.04],
        lElbowPole: [0.02, -0.35, -0.25],
        rElbowPole: [0.02, 0.35, -0.25],
        activeZones: ['core', 'glutes'],
      };
    }
    case 'reformer-feetstraps': {
      const cx = lerp(0.14, -0.16, ts);
      const ct = 0.41;
      return {
        carriageX: cx,
        ropeToFeet: true,
        pelvis: [cx + 0.24, 0, ct + 0.1],
        spineMid: [cx + 0.02, 0, ct + 0.1],
        chest: [cx - 0.17, 0, ct + 0.11],
        antHint: [0, 0, 1],
        lFoot: vlerp([cx + 0.26, -0.09, ct + 0.48], [cx + 0.86, -0.06, ct + 0.48], ts),
        rFoot: vlerp([cx + 0.26, 0.09, ct + 0.48], [cx + 0.86, 0.06, ct + 0.48], ts),
        lKneePole: [0.05, -0.18, lerp(1.25, 0.85, ts)],
        rKneePole: [0.05, 0.18, lerp(1.25, 0.85, ts)],
        lHand: [cx + 0.24, -0.22, ct + 0.04],
        rHand: [cx + 0.24, 0.22, ct + 0.04],
        lElbowPole: [0.02, -0.35, -0.25],
        rElbowPole: [0.02, 0.35, -0.25],
        activeZones: ['adductors', 'core', 'glutes'],
      };
    }
    case 'reformer-jumpboard': {
      const cx = lerp(0.24, -0.26, ts);
      const ct = 0.41;
      const fx = lerp(0.92, 0.64, ts);
      return {
        carriageX: cx,
        withJumpboard: true,
        pelvis: [cx + 0.24, 0, ct + 0.1],
        spineMid: [cx + 0.02, 0, ct + 0.1],
        chest: [cx - 0.17, 0, ct + 0.11],
        antHint: [0, 0, 1],
        lFoot: [fx, -0.08, lerp(0.6, 0.66, ts)],
        rFoot: [fx, 0.08, lerp(0.6, 0.66, ts)],
        lKneePole: [0.1, -0.05, lerp(1.3, 0.9, ts)],
        rKneePole: [0.1, 0.05, lerp(1.3, 0.9, ts)],
        lHand: [cx + 0.24, -0.22, ct + 0.04],
        rHand: [cx + 0.24, 0.22, ct + 0.04],
        lElbowPole: [0.02, -0.35, -0.25],
        rElbowPole: [0.02, 0.35, -0.25],
        activeZones: ['quads', 'glutes', 'core'],
      };
    }
    case 'reformer-longbox-teaser': {
      const cx = lerp(0.12, -0.12, ts);
      const bt = 0.66;
      return {
        carriageX: cx,
        withLongbox: true,
        ropeToHands: true,
        pelvis: [cx + 0.1, 0, bt + 0.08],
        spineMid: vlerp([cx - 0.08, 0, bt + 0.12], [cx - 0.04, 0, bt + 0.26], ts),
        chest: vlerp([cx - 0.26, 0, bt + 0.18], [cx - 0.14, 0, bt + 0.44], ts),
        antHint: vlerp([0.35, 0, 0.94], [0.8, 0, 0.6], ts),
        lFoot: vlerp([cx + 0.68, -0.08, bt + 0.18], [cx + 0.64, -0.08, bt + 0.56], ts),
        rFoot: vlerp([cx + 0.68, 0.08, bt + 0.18], [cx + 0.64, 0.08, bt + 0.56], ts),
        lKneePole: [-0.15, -0.05, 1.25],
        rKneePole: [-0.15, 0.05, 1.25],
        lHand: vlerp([cx - 0.04, -0.2, bt + 0.18], [cx + 0.36, -0.18, bt + 0.36], ts),
        rHand: vlerp([cx - 0.04, 0.2, bt + 0.18], [cx + 0.36, 0.18, bt + 0.36], ts),
        lElbowPole: [-0.1, -0.35, -0.25],
        rElbowPole: [-0.1, 0.35, -0.25],
        activeZones: ['core', 'quads'],
      };
    }
    case 'reformer-elephant': {
      const cx = lerp(0.22, -0.1, ts);
      return {
        carriageX: cx,
        pelvis: [cx + 0.18, 0, lerp(1.06, 0.98, ts)],
        spineMid: [cx + 0.36, 0, 1.04],
        chest: [0.62, 0, 0.92],
        antHint: [0.3, 0, -0.95],
        lFoot: [cx - 0.12, -0.09, 0.45],
        rFoot: [cx - 0.12, 0.09, 0.45],
        lKneePole: [0.5, -0.05, 0.7],
        rKneePole: [0.5, 0.05, 0.7],
        lHand: [0.82, -0.16, 0.58],
        rHand: [0.82, 0.16, 0.58],
        lElbowPole: [0.3, -0.25, 0.9],
        rElbowPole: [0.3, 0.25, 0.9],
        activeZones: ['core', 'glutes'],
      };
    }
    case 'reformer-mermaid': {
      const cx = lerp(0.18, -0.08, ts);
      return {
        carriageX: cx,
        pelvis: [cx + 0.1, 0, 0.49],
        spineMid: [cx + lerp(0.1, 0.2, ts), 0, 0.7],
        chest: [cx + lerp(0.1, 0.34, ts), 0, lerp(0.92, 0.84, ts)],
        antHint: [0, -1, 0],
        lFoot: [cx - 0.1, -0.16, 0.45],
        rFoot: [cx + 0.3, 0.14, 0.45],
        lKneePole: [cx - 0.15, -0.35, 0.5],
        rKneePole: [cx + 0.35, -0.25, 0.5],
        lHand: vlerp([cx - 0.18, -0.08, 0.96], [cx + 0.52, 0, 1.12], ts),
        rHand: [0.82, 0.06, 0.58],
        lElbowPole: [-0.2, -0.2, 1.25],
        rElbowPole: [0.5, 0.25, 0.75],
        activeZones: ['obliques', 'core'],
      };
    }
    case 'reformer-scooter-lunge': {
      const cx = lerp(0.24, -0.14, ts);
      return {
        carriageX: cx,
        pelvis: [0.42, -0.18, lerp(0.84, 0.78, ts)],
        spineMid: [0.52, -0.16, lerp(1.02, 0.96, ts)],
        chest: [0.64, -0.14, lerp(1.2, 1.12, ts)],
        antHint: [0.85, -0.2, -0.45],
        lFoot: [0.64, -0.34, 0.05],
        rFoot: [cx - 0.12, -0.06, 0.45],
        lKneePole: [0.95, -0.34, 0.5],
        rKneePole: [0.2, -0.1, 0.2],
        lHand: [0.82, -0.2, 0.58],
        rHand: [0.82, 0.08, 0.58],
        lElbowPole: [0.45, -0.35, 0.85],
        rElbowPole: [0.45, 0.2, 0.85],
        activeZones: ['glutes', 'quads'],
      };
    }
    case 'mat-hundred': {
      return {
        pelvis: [0.06, 0, 0.14],
        spineMid: [-0.16, 0, lerp(0.15, 0.2, ts)],
        chest: [-0.36, 0, lerp(0.18, 0.34, ts)],
        antHint: [lerp(0.1, 0.52, ts), 0, 1],
        lFoot: vlerp([0.38, -0.09, 0.46], [0.7, -0.07, 0.52], ts),
        rFoot: vlerp([0.38, 0.09, 0.46], [0.7, 0.07, 0.52], ts),
        lKneePole: [0.1, -0.05, lerp(0.95, 0.68, ts)],
        rKneePole: [0.1, 0.05, lerp(0.95, 0.68, ts)],
        lHand: [0.18, -0.22, lerp(0.16, 0.28, ts)],
        rHand: [0.18, 0.22, lerp(0.16, 0.28, ts)],
        lElbowPole: [-0.2, -0.3, 0.05],
        rElbowPole: [-0.2, 0.3, 0.05],
        activeZones: ['core', 'quads'],
      };
    }
    case 'mat-twist': {
      return {
        pelvis: [-0.14, 0, 0.14],
        spineMid: [lerp(-0.14, -0.04, ts), 0, 0.36],
        chest: [lerp(-0.12, 0.1, ts), lerp(0, -0.08, ts), lerp(0.58, 0.52, ts)],
        antHint: vlerp([1, 0, 0], [0.75, -0.65, -0.2], ts),
        lFoot: [0.56, -0.24, 0.11],
        rFoot: [0.56, 0.24, 0.11],
        lKneePole: [0.2, -0.15, 0.5],
        rKneePole: [0.2, 0.15, 0.5],
        lHand: vlerp([-0.1, -0.44, 0.56], [-0.42, 0.16, 0.66], ts),
        rHand: vlerp([-0.1, 0.44, 0.56], [0.52, -0.22, 0.2], ts),
        lElbowPole: [-0.3, -0.3, 0.5],
        rElbowPole: [0.1, 0.3, 0.5],
        activeZones: ['obliques', 'core'],
      };
    }
    case 'mat-sidekick-plank': {
      const lift = lerp(0.16, 0.42, ts);
      return {
        pelvis: [0.02, 0, lift],
        spineMid: [-0.2, 0, lift + lerp(0.06, 0.14, ts)],
        chest: [-0.42, 0, lift + lerp(0.16, 0.28, ts)],
        antHint: [0, -1, 0.15],
        lFoot: [0.68, 0.04, 0.12],
        rFoot: [0.66, -0.04, lerp(0.22, 0.68, ts)],
        lKneePole: [0.35, -0.3, 0.2],
        rKneePole: [0.35, -0.3, 0.6],
        lHand: [-0.52, 0.02, 0.09],
        rHand: [-0.32, -0.18, lift + lerp(0.32, 0.72, ts)],
        lElbowPole: [-0.55, 0.2, 0.2],
        rElbowPole: [-0.35, -0.3, 0.8],
        activeZones: ['obliques', 'glutes'],
      };
    }
    case 'chair-pedal-press': {
      const pdeg = lerp(32, 8, ts);
      const rad = (pdeg * Math.PI) / 180;
      const px = -0.2 + Math.cos(rad) * 0.52;
      const pz = 0.08 + Math.sin(rad) * 0.52;
      return {
        pedalDeg: pdeg,
        pelvis: [-0.06, 0, 0.68],
        spineMid: [-0.07, 0, 0.9],
        chest: [-0.08, 0, 1.12],
        antHint: [1, 0, 0],
        lFoot: [px, -0.09, pz + 0.04],
        rFoot: [px, 0.09, pz + 0.04],
        lKneePole: [0.45, -0.08, 0.98],
        rKneePole: [0.45, 0.08, 0.98],
        lHand: [-0.04, -0.22, 0.62],
        rHand: [-0.04, 0.22, 0.62],
        lElbowPole: [-0.3, -0.3, 0.82],
        rElbowPole: [-0.3, 0.3, 0.82],
        activeZones: ['quads', 'core'],
      };
    }
    case 'chair-goingup': {
      const pdeg = lerp(8, 28, ts);
      const rad = (pdeg * Math.PI) / 180;
      const px = -0.2 + Math.cos(rad) * 0.52;
      const pz = 0.08 + Math.sin(rad) * 0.52;
      const liftZ = lerp(0.98, 1.32, ts);
      return {
        pedalDeg: pdeg,
        withChairHandles: true,
        pelvis: [lerp(0.14, -0.02, ts), 0, liftZ],
        spineMid: [lerp(0.12, -0.02, ts), 0, liftZ + 0.22],
        chest: [lerp(0.1, -0.02, ts), 0, liftZ + 0.44],
        antHint: [-1, 0, 0],
        lFoot: [-0.08, -0.08, 0.63],
        rFoot: [px, 0.08, pz + 0.04],
        lKneePole: [-0.45, -0.08, 0.95],
        rKneePole: [-0.2, 0.08, 0.75],
        lHand: [0.05, -0.28, 1.27],
        rHand: [0.05, 0.28, 1.27],
        lElbowPole: [0.35, -0.35, 1.2],
        rElbowPole: [0.35, 0.35, 1.2],
        activeZones: ['glutes', 'quads'],
      };
    }
    case 'chair-pike': {
      const pdeg = lerp(8, 30, ts);
      const rad = (pdeg * Math.PI) / 180;
      const px = -0.2 + Math.cos(rad) * 0.52;
      const pz = 0.08 + Math.sin(rad) * 0.52;
      return {
        pedalDeg: pdeg,
        pelvis: [lerp(0.18, 0.06, ts), 0, lerp(0.96, 1.22, ts)],
        spineMid: [0.02, 0, lerp(1.02, 1.18, ts)],
        chest: [-0.08, 0, 1.04],
        antHint: [-0.5, 0, -0.85],
        lFoot: [px, -0.08, pz + 0.04],
        rFoot: [px, 0.08, pz + 0.04],
        lKneePole: [-0.25, -0.08, 0.65],
        rKneePole: [-0.25, 0.08, 0.65],
        lHand: [-0.1, -0.18, 0.62],
        rHand: [-0.1, 0.18, 0.62],
        lElbowPole: [-0.35, -0.28, 0.85],
        rElbowPole: [-0.35, 0.28, 0.85],
        activeZones: ['core', 'adductors'],
      };
    }
    case 'chair-swan': {
      const pdeg = lerp(8, 26, ts);
      const rad = (pdeg * Math.PI) / 180;
      const px = -0.2 + Math.cos(rad) * 0.52;
      const pz = 0.08 + Math.sin(rad) * 0.52;
      return {
        pedalDeg: pdeg,
        pelvis: [-0.1, 0, 0.66],
        spineMid: [0.08, 0, lerp(0.66, 0.76, ts)],
        chest: [0.24, 0, lerp(0.64, 0.92, ts)],
        antHint: [lerp(0.2, 0.65, ts), 0, -1],
        lFoot: [-0.78, -0.09, lerp(0.58, 0.72, ts)],
        rFoot: [-0.78, 0.09, lerp(0.58, 0.72, ts)],
        lKneePole: [-0.45, -0.09, 0.25],
        rKneePole: [-0.45, 0.09, 0.25],
        lHand: [px, -0.16, pz + 0.03],
        rHand: [px, 0.16, pz + 0.03],
        lElbowPole: [0.1, -0.32, 0.5],
        rElbowPole: [0.1, 0.32, 0.5],
        activeZones: ['back', 'glutes'],
      };
    }
    case 'cadillac-cat-rolldown': {
      const bx = lerp(0.46, 0.66, ts);
      const bz = lerp(1.34, 0.88, ts);
      return {
        rolldownBar: [bx, bz],
        pelvis: [-0.08, 0, 0.94],
        spineMid: [lerp(-0.04, 0.14, ts), 0, lerp(1.16, 1.12, ts)],
        chest: [lerp(0.0, 0.32, ts), 0, lerp(1.38, 1.04, ts)],
        antHint: vlerp([1, 0, 0], [0.35, 0, -0.94], ts),
        lFoot: [-0.42, -0.11, 0.58],
        rFoot: [-0.42, 0.11, 0.58],
        lKneePole: [0.15, -0.11, 0.55],
        rKneePole: [0.15, 0.11, 0.55],
        lHand: [bx, -0.18, bz],
        rHand: [bx, 0.18, bz],
        lElbowPole: [0.2, -0.32, 1.25],
        rElbowPole: [0.2, 0.32, 1.25],
        activeZones: ['core', 'back'],
      };
    }
    case 'cadillac-teaser': {
      const ptDeg = lerp(32, -8, ts);
      const rad = (ptDeg * Math.PI) / 180;
      const ex = 0.62 - Math.sin(rad) * 0.66;
      const ez = 1.84 - Math.cos(rad) * 0.66;
      return {
        pushthroughDeg: ptDeg,
        pelvis: [0.02, 0, 0.6],
        spineMid: [lerp(-0.18, -0.06, ts), 0, lerp(0.62, 0.8, ts)],
        chest: [lerp(-0.38, -0.14, ts), 0, lerp(0.66, 1.02, ts)],
        antHint: vlerp([0.25, 0, 0.96], [0.8, 0, 0.6], ts),
        lFoot: vlerp([0.66, -0.08, 0.64], [0.54, -0.08, 1.16], ts),
        rFoot: vlerp([0.66, 0.08, 0.64], [0.54, 0.08, 1.16], ts),
        lKneePole: [0.1, -0.05, 1.3],
        rKneePole: [0.1, 0.05, 1.3],
        lHand: [ex, -0.18, ez],
        rHand: [ex, 0.18, ez],
        lElbowPole: [-0.2, -0.32, 1.1],
        rElbowPole: [-0.2, 0.32, 1.1],
        activeZones: ['core', 'quads'],
      };
    }
    case 'cadillac-hanging': {
      const lift = lerp(0.92, 1.24, ts);
      return {
        pelvis: [-0.14, 0, lift],
        spineMid: [0.04, 0, lift + 0.12],
        chest: [0.22, 0, lift + 0.24],
        antHint: [0.25, 0, 0.96],
        lFoot: [-0.78, -0.1, 1.54],
        rFoot: [-0.78, 0.1, 1.54],
        lKneePole: [-0.45, -0.1, 0.85],
        rKneePole: [-0.45, 0.1, 0.85],
        lHand: [0.18, -0.22, 1.92],
        rHand: [0.18, 0.22, 1.92],
        lElbowPole: [0.45, -0.38, 1.55],
        rElbowPole: [0.45, 0.38, 1.55],
        activeZones: ['back', 'glutes', 'core'],
      };
    }
    case 'cadillac-leg-springs': {
      return {
        legSprings: true,
        pelvis: [0.14, 0, 0.6],
        spineMid: [0.36, 0, 0.6],
        chest: [0.58, 0, 0.61],
        antHint: [0, 0, 1],
        lFoot: vlerp([-0.14, -0.12, 1.24], [-0.52, -0.08, 0.96], ts),
        rFoot: vlerp([-0.14, 0.12, 1.24], [-0.52, 0.08, 0.96], ts),
        lKneePole: [0.1, -0.18, 1.3],
        rKneePole: [0.1, 0.18, 1.3],
        lHand: [1.02, -0.28, 0.92],
        rHand: [1.02, 0.28, 0.92],
        lElbowPole: [0.75, -0.38, 0.65],
        rElbowPole: [0.75, 0.38, 0.65],
        activeZones: ['adductors', 'glutes', 'core'],
      };
    }
    case 'barrel-sidebend': {
      return {
        pelvis: [-0.28, 0, 0.9],
        spineMid: [-0.5, 0, lerp(0.84, 1.04, ts)],
        chest: [-0.7, 0, lerp(0.74, 1.18, ts)],
        antHint: [0, -1, 0.1],
        lFoot: [0.49, 0.04, 0.58],
        rFoot: [0.48, -0.04, 0.76],
        lKneePole: [0.1, -0.25, 0.7],
        rKneePole: [0.1, -0.25, 0.9],
        lHand: [-0.82, 0.08, lerp(0.86, 1.34, ts)],
        rHand: [-0.78, -0.12, lerp(0.92, 1.4, ts)],
        lElbowPole: [-0.7, 0.28, 1.1],
        rElbowPole: [-0.7, -0.32, 1.2],
        activeZones: ['obliques', 'glutes'],
      };
    }
    case 'barrel-swan': {
      return {
        pelvis: [-0.28, 0, 0.9],
        spineMid: [-0.5, 0, lerp(0.82, 1.04, ts)],
        chest: [-0.68, 0, lerp(0.7, 1.22, ts)],
        antHint: [lerp(-0.4, -0.75, ts), 0, -0.7],
        lFoot: [0.49, -0.1, 0.58],
        rFoot: [0.49, 0.1, 0.58],
        lKneePole: [0.1, -0.1, 0.5],
        rKneePole: [0.1, 0.1, 0.5],
        lHand: [-0.86, -0.18, lerp(0.62, 1.44, ts)],
        rHand: [-0.86, 0.18, lerp(0.62, 1.44, ts)],
        lElbowPole: [-0.6, -0.32, 0.9],
        rElbowPole: [-0.6, 0.32, 0.9],
        activeZones: ['back', 'glutes'],
      };
    }
    case 'barrel-horseback': {
      const lift = lerp(0.9, 1.04, ts);
      return {
        pelvis: [-0.3, 0, lift],
        spineMid: [-0.28, 0, lift + 0.22],
        chest: [-0.2, 0, lift + 0.42],
        antHint: [0.95, 0, -0.25],
        lFoot: [-0.14, -0.27, lerp(0.42, 0.58, ts)],
        rFoot: [-0.14, 0.27, lerp(0.42, 0.58, ts)],
        lKneePole: [0.1, -0.35, 0.75],
        rKneePole: [0.1, 0.35, 0.75],
        lHand: [lerp(-0.05, 0.22, ts), -0.16, lift + lerp(0.32, 0.54, ts)],
        rHand: [lerp(-0.05, 0.22, ts), 0.16, lift + lerp(0.32, 0.54, ts)],
        lElbowPole: [-0.15, -0.32, 1.15],
        rElbowPole: [-0.15, 0.32, 1.15],
        activeZones: ['adductors', 'core'],
      };
    }
    case 'barrel-spinecorrector': {
      return {
        isSpineCorrector: true,
        pelvis: [0.22, 0, 0.22],
        spineMid: [0.0, 0, lerp(0.38, 0.44, ts)],
        chest: [-0.22, 0, lerp(0.46, 0.38, ts)],
        antHint: [lerp(0.45, 0.1, ts), 0, 0.92],
        lFoot: vlerp([0.68, -0.09, 0.22], [0.72, -0.08, 0.64], ts),
        rFoot: vlerp([0.68, 0.09, 0.22], [0.72, 0.08, 0.64], ts),
        lKneePole: [0.35, -0.06, 0.78],
        rKneePole: [0.35, 0.06, 0.78],
        lHand: vlerp([0.38, -0.18, 0.46], [-0.46, -0.18, 0.56], ts),
        rHand: vlerp([0.38, 0.18, 0.46], [-0.46, 0.18, 0.56], ts),
        lElbowPole: [-0.1, -0.32, 0.35],
        rElbowPole: [-0.1, 0.32, 0.35],
        activeZones: ['core', 'back'],
      };
    }
    case 'reformer-footwork':
    default: {
      const cx = lerp(0.24, -0.18, ts);
      const ct = 0.41;
      return {
        carriageX: cx,
        pelvis: [cx + 0.24, 0, ct + 0.1],
        spineMid: [cx + 0.02, 0, ct + 0.1],
        chest: [cx - 0.17, 0, ct + 0.11],
        antHint: [0, 0, 1],
        lFoot: [0.82, -0.085, 0.57],
        rFoot: [0.82, 0.085, 0.57],
        lKneePole: [0.12, -0.04, lerp(1.28, 0.92, ts)],
        rKneePole: [0.12, 0.04, lerp(1.28, 0.92, ts)],
        lHand: [cx + 0.25, -0.22, ct + 0.04],
        rHand: [cx + 0.25, 0.22, ct + 0.04],
        lElbowPole: [0.02, -0.35, -0.25],
        rElbowPole: [0.02, 0.35, -0.25],
        activeZones: ['quads', 'core'],
      };
    }
  }
}

type QuadFace = StudioQuadFace;

interface StrokeLine3D {
  readonly pts: readonly Vec3[];
  readonly stroke: string;
  readonly width: number;
  readonly dash?: readonly number[];
  readonly overlay?: boolean;
  readonly depthBias?: number;
  readonly arrowEnd?: boolean;
}

interface LabelCallout3D {
  readonly pos: Vec3;
  readonly text: string;
  readonly bg: string;
  readonly fg: string;
}

function makeSubdividedBoxQuads(
  center: Vec3,
  dims: Vec3,
  rgb: Rgb,
  alpha = 1,
  spec = 0.22,
  shininess = 22,
  materialRole?: StudioMaterialRole,
  bevelWeight = 0.22,
  minSubdivXY = 1,
): QuadFace[] {
  const [cx, cy, cz] = center;
  const [wx, wy, wz] = dims;
  const nx = Math.max(minSubdivXY, Math.min(10, Math.ceil(wx / 0.24)));
  const ny = Math.max(minSubdivXY, Math.min(5, Math.ceil(wy / 0.24)));
  const nz = Math.max(1, Math.min(4, Math.ceil(wz / 0.24)));
  const hx = Math.max(1e-5, wx * 0.5);
  const hy = Math.max(1e-5, wy * 0.5);
  const hz = Math.max(1e-5, wz * 0.5);
  const x0 = cx - wx * 0.5;
  const y0 = cy - wy * 0.5;
  const z0 = cz - wz * 0.5;
  const dx = wx / nx;
  const dy = wy / ny;
  const dz = wz / nz;
  const out: QuadFace[] = [];

  const bevelN = (v: Vec3, faceNormal: Vec3): Vec3 => {
    const ux = (v[0] - cx) / hx;
    const uy = (v[1] - cy) / hy;
    const uz = (v[2] - cz) / hz;
    const cornerOutwardDir = norm3([ux * ux * ux, uy * uy * uy, uz * uz * uz]);
    return norm3(add3(faceNormal, mul3(cornerOutwardDir, bevelWeight)));
  };

  const pushBoxQuad = (
    v0: Vec3,
    v1: Vec3,
    v2: Vec3,
    v3: Vec3,
    faceNormal: Vec3,
  ): void => {
    out.push({
      verts: [v0, v1, v2, v3],
      vNormals: [
        bevelN(v0, faceNormal),
        bevelN(v1, faceNormal),
        bevelN(v2, faceNormal),
        bevelN(v3, faceNormal),
      ],
      cullBackface: true,
      baseRgb: rgb,
      alpha,
      spec,
      shininess,
      materialRole,
    });
  };

  for (let ix = 0; ix < nx; ix++) {
    for (let iy = 0; iy < ny; iy++) {
      const xa = x0 + ix * dx;
      const xb = xa + dx;
      const ya = y0 + iy * dy;
      const yb = ya + dy;
      pushBoxQuad(
        [xa, ya, z0 + wz],
        [xb, ya, z0 + wz],
        [xb, yb, z0 + wz],
        [xa, yb, z0 + wz],
        [0, 0, 1],
      );
      pushBoxQuad([xa, yb, z0], [xb, yb, z0], [xb, ya, z0], [xa, ya, z0], [0, 0, -1]);
    }
  }
  for (let ix = 0; ix < nx; ix++) {
    for (let iz = 0; iz < nz; iz++) {
      const xa = x0 + ix * dx;
      const xb = xa + dx;
      const za = z0 + iz * dz;
      const zb = za + dz;
      pushBoxQuad([xa, y0, za], [xb, y0, za], [xb, y0, zb], [xa, y0, zb], [0, -1, 0]);
      pushBoxQuad(
        [xb, y0 + wy, za],
        [xa, y0 + wy, za],
        [xa, y0 + wy, zb],
        [xb, y0 + wy, zb],
        [0, 1, 0],
      );
    }
  }
  for (let iy = 0; iy < ny; iy++) {
    for (let iz = 0; iz < nz; iz++) {
      const ya = y0 + iy * dy;
      const yb = ya + dy;
      const za = z0 + iz * dz;
      const zb = za + dz;
      pushBoxQuad(
        [x0 + wx, ya, za],
        [x0 + wx, yb, za],
        [x0 + wx, yb, zb],
        [x0 + wx, ya, zb],
        [1, 0, 0],
      );
      pushBoxQuad([x0, yb, za], [x0, ya, za], [x0, ya, zb], [x0, yb, zb], [-1, 0, 0]);
    }
  }
  return out;
}

/**
 * Upholstered cushion with crowned micro-bevel normals and contrast ivory seam piping.
 */
function makePipedCushion(
  center: Vec3,
  dims: Vec3,
  leatherRgb: Rgb,
  pipingHex: string,
  alpha: number,
  svgFastMode = false,
): { quads: QuadFace[]; piping: StrokeLine3D } {
  const [cx, cy, cz] = center;
  const [wx, wy, wz] = dims;
  const cushionQuads = makeSubdividedBoxQuads(
    [cx, cy, cz],
    [wx, wy, wz],
    [
      Math.min(255, leatherRgb[0] + 5),
      Math.min(255, leatherRgb[1] + 6),
      Math.min(255, leatherRgb[2] + 5),
    ],
    alpha,
    0.22,
    26,
    'leather',
    0.28,
    svgFastMode ? 1 : 3,
  );
  const hwx = wx * 0.488;
  const hwy = wy * 0.488;
  const zp = cz + wz * 0.505;
  const corners: Vec3[] = [
    [cx - hwx, cy - hwy, zp],
    [cx, cy - hwy, zp],
    [cx + hwx, cy - hwy, zp],
    [cx + hwx, cy, zp],
    [cx + hwx, cy + hwy, zp],
    [cx, cy + hwy, zp],
    [cx - hwx, cy + hwy, zp],
    [cx - hwx, cy, zp],
    [cx - hwx, cy - hwy, zp],
  ];
  return {
    quads: cushionQuads,
    piping: { pts: corners, stroke: pipingHex, width: 1.5, depthBias: -0.04 },
  };
}

/**
 * True coopered cylindrical barrel arch vault (148° sweep along X/Z, extruded across Y)
 * with curved White Oak side cheeks — faithfully matching Ladder Barrel geometry.
 */
function makeBarrelArchVaultQuads(
  center: Vec3,
  radius: number,
  widthY: number,
  thickness: number,
  arcDeg: number,
  leatherRgb: Rgb,
  oakRgb: Rgb,
  alpha: number,
  segs = 26,
): QuadFace[] {
  const [cx, cy, cz] = center;
  const ySlices = 3;
  const halfArc = (arcDeg * 0.5 * Math.PI) / 180;
  const out: QuadFace[] = [];

  for (let i = 0; i < segs; i++) {
    const a0 = -halfArc + (2 * halfArc * i) / segs;
    const a1 = -halfArc + (2 * halfArc * (i + 1)) / segs;
    const xo0 = cx + Math.sin(a0) * radius;
    const zo0 = cz + Math.cos(a0) * radius;
    const xo1 = cx + Math.sin(a1) * radius;
    const zo1 = cz + Math.cos(a1) * radius;
    const xi0 = cx + Math.sin(a0) * (radius - thickness);
    const zi0 = cz + Math.cos(a0) * (radius - thickness);
    const xi1 = cx + Math.sin(a1) * (radius - thickness);
    const zi1 = cz + Math.cos(a1) * (radius - thickness);

    const no0: Vec3 = [Math.sin(a0), 0, Math.cos(a0)];
    const no1: Vec3 = [Math.sin(a1), 0, Math.cos(a1)];
    for (let jy = 0; jy < ySlices; jy++) {
      const ya = cy - widthY * 0.5 + (widthY * jy) / ySlices;
      const yb = cy - widthY * 0.5 + (widthY * (jy + 1)) / ySlices;
      out.push({
        verts: [
          [xo0, ya, zo0],
          [xo1, ya, zo1],
          [xo1, yb, zo1],
          [xo0, yb, zo0],
        ],
        vNormals: [no0, no1, no1, no0],
        baseRgb: leatherRgb,
        alpha,
        spec: 0.24,
        shininess: 26,
        materialRole: 'leather',
      });
    }

    // Upholstered edge rims + Curved White Oak side cheeks down to base rail
    for (const sy of [cy - widthY * 0.48, cy + widthY * 0.48]) {
      const sideSign = sy < cy ? -1 : 1;
      const sideN: Vec3 = [0, sideSign, 0];
      const rimN0 = norm3(add3(sideN, mul3(no0, 0.22)));
      const rimN1 = norm3(add3(sideN, mul3(no1, 0.22)));
      out.push(
        makeOutwardQuad(
          [xi0, sy, zi0],
          [xo0, sy, zo0],
          [xo1, sy, zo1],
          [xi1, sy, zi1],
          sideN,
          leatherRgb,
          alpha,
          0.22,
          24,
          'leather',
          [cx, cy, cz * 0.5],
        ),
        {
          verts:
            sideSign < 0
              ? [
                  [xi0, sy, 0.055],
                  [xi1, sy, 0.055],
                  [xi1, sy, zi1],
                  [xi0, sy, zi0],
                ]
              : [
                  [xi1, sy, 0.055],
                  [xi0, sy, 0.055],
                  [xi0, sy, zi0],
                  [xi1, sy, zi1],
                ],
          vNormals:
            sideSign < 0
              ? [sideN, sideN, rimN1, rimN0]
              : [sideN, sideN, rimN0, rimN1],
          cullBackface: true,
          baseRgb: oakRgb,
          alpha,
          spec: 0.24,
          shininess: 26,
          materialRole: 'wood',
        },
      );
    }
  }
  return out;
}

function makeTaperedTubeQuads(
  pts: readonly Vec3[],
  radii: readonly [number, number][],
  rgb: Rgb,
  sides = 16,
  alpha = 1,
  spec = 0.24,
  emissive = 0,
  shininess = 24,
  refNormal?: Vec3,
  capStart = 0,
  capEnd = 0,
  materialRole?: StudioMaterialRole,
): QuadFace[] {
  if (pts.length < 2) return [];
  const tangents: Vec3[] = pts.map((_, i) => {
    if (i === 0) return norm3(sub3(pts[1]!, pts[0]!));
    if (i === pts.length - 1) return norm3(sub3(pts[i]!, pts[i - 1]!));
    return norm3(sub3(pts[i + 1]!, pts[i - 1]!));
  });
  let nrm: Vec3 =
    refNormal && len3(sub3(refNormal, mul3(tangents[0]!, dot3(refNormal, tangents[0]!)))) > 1e-4
      ? refNormal
      : Math.abs(tangents[0]![2]) < 0.9
        ? [0, 0, 1]
        : [0, 1, 0];
  nrm = norm3(sub3(nrm, mul3(tangents[0]!, dot3(nrm, tangents[0]!))));

  const rings: Vec3[][] = [];
  const ringNormals: Vec3[][] = [];
  const ringFrames: { binrm: Vec3; nrm: Vec3 }[] = [];
  for (let i = 0; i < pts.length; i++) {
    const t = tangents[i]!;
    let proj = sub3(nrm, mul3(t, dot3(nrm, t)));
    if (len3(proj) < 1e-5) {
      const alt: Vec3 = Math.abs(t[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
      proj = sub3(alt, mul3(t, dot3(alt, t)));
    }
    nrm = norm3(proj);
    const binrm = norm3(cross3(t, nrm));
    ringFrames.push({ binrm, nrm });
    const [rx, ry] = radii[Math.min(i, radii.length - 1)]!;
    const ring: Vec3[] = [];
    const rNrm: Vec3[] = [];
    for (let k = 0; k < sides; k++) {
      const ang = (2 * Math.PI * k) / sides;
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      ring.push(add3(pts[i]!, add3(mul3(binrm, ca * rx), mul3(nrm, sa * ry))));
      rNrm.push(
        norm3(add3(mul3(binrm, ca / Math.max(0.004, rx)), mul3(nrm, sa / Math.max(0.004, ry)))),
      );
    }
    rings.push(ring);
    ringNormals.push(rNrm);
  }

  const quads: QuadFace[] = [];
  for (let i = 0; i < rings.length - 1; i++) {
    const r0 = rings[i]!;
    const r1 = rings[i + 1]!;
    const n0 = ringNormals[i]!;
    const n1 = ringNormals[i + 1]!;
    for (let k = 0; k < sides; k++) {
      const kn = (k + 1) % sides;
      quads.push({
        verts: [r0[k]!, r0[kn]!, r1[kn]!, r1[k]!],
        vNormals: [n0[k]!, n0[kn]!, n1[kn]!, n1[k]!],
        baseRgb: rgb,
        alpha,
        spec,
        emissive,
        shininess,
        materialRole,
      });
    }
  }

  const emitDomeCap = (isEnd: boolean, capLen: number) => {
    if (capLen <= 0) return;
    const idx = isEnd ? pts.length - 1 : 0;
    const cPt = pts[idx]!;
    const tanOut = isEnd ? tangents[idx]! : mul3(tangents[0]!, -1);
    const baseRing = rings[idx]!;
    const baseNrm = ringNormals[idx]!;
    const pole = add3(cPt, mul3(tanOut, capLen));
    for (let k = 0; k < sides; k++) {
      const kn = (k + 1) % sides;
      const verts: readonly [Vec3, Vec3, Vec3, Vec3] = isEnd
        ? [baseRing[k]!, baseRing[kn]!, pole, pole]
        : [pole, pole, baseRing[kn]!, baseRing[k]!];
      const vNormals: readonly [Vec3, Vec3, Vec3, Vec3] = isEnd
        ? [baseNrm[k]!, baseNrm[kn]!, tanOut, tanOut]
        : [tanOut, tanOut, baseNrm[kn]!, baseNrm[k]!];
      quads.push({ verts, vNormals, baseRgb: rgb, alpha, spec, emissive, shininess, materialRole });
    }
  };
  emitDomeCap(false, capStart);
  emitDomeCap(true, capEnd);

  return quads;
}

interface LoftStation3D {
  readonly center: Vec3;
  readonly axisX: Vec3;
  readonly axisY: Vec3;
  readonly profile: (theta: number) => readonly [number, number];
}

interface LoftBandStyle3D {
  readonly baseRgb?: Rgb;
  readonly spec?: number;
  readonly emissive?: number;
  readonly shininess?: number;
  readonly materialRole?: StudioMaterialRole;
}

/**
 * Closed manifold multi-station quad loft from anatomical cross-section functions
 * `(center, axisX, axisY, profile(theta) -> [dx, dy])` with true 3D smooth longitudinal vertex normals
 * and optional per-band material/color routing (`bandStyleFn`) for seamless unified torso+neck meshes.
 */
function makeStationLoftQuads(
  stations: readonly LoftStation3D[],
  rgb: Rgb,
  radialSegs = 18,
  alpha = 1,
  spec = 0.22,
  emissive = 0,
  shininess = 22,
  capStart = 0,
  capEnd = 0,
  materialRole?: StudioMaterialRole,
  vertexColorFn?: (stationIdx: number, theta: number) => Rgb,
  bandStyleFn?: (bandIdx: number, theta: number) => LoftBandStyle3D | undefined,
): QuadFace[] {
  if (stations.length < 2) return [];
  const rings: Vec3[][] = [];
  const radialNormals: Vec3[][] = [];
  const ringColors: Rgb[][] | null = vertexColorFn ? [] : null;

  for (let stIdx = 0; stIdx < stations.length; stIdx++) {
    const st = stations[stIdx]!;
    const dxArr = new Array<number>(radialSegs);
    const dyArr = new Array<number>(radialSegs);
    for (let s = 0; s < radialSegs; s++) {
      const [dx, dy] = st.profile((2 * Math.PI * s) / radialSegs);
      dxArr[s] = dx;
      dyArr[s] = dy;
    }
    const row: Vec3[] = [];
    const nRow: Vec3[] = [];
    const cRow: Rgb[] = [];
    for (let s = 0; s < radialSegs; s++) {
      const dx = dxArr[s]!;
      const dy = dyArr[s]!;
      const sPrev = (s - 1 + radialSegs) % radialSegs;
      const sNext = (s + 1) % radialSegs;
      let nx2 = dyArr[sNext]! - dyArr[sPrev]!;
      let ny2 = -(dxArr[sNext]! - dxArr[sPrev]!);
      if (nx2 * dx + ny2 * dy < 0) {
        nx2 = -nx2;
        ny2 = -ny2;
      }
      row.push(add3(st.center, add3(mul3(st.axisX, dx), mul3(st.axisY, dy))));
      nRow.push(norm3(add3(mul3(st.axisX, nx2), mul3(st.axisY, ny2))));
      if (vertexColorFn) {
        cRow.push(vertexColorFn(stIdx, (2 * Math.PI * s) / radialSegs));
      }
    }
    rings.push(row);
    radialNormals.push(nRow);
    if (ringColors) ringColors.push(cRow);
  }

  // Compute true 3D smooth vertex normals incorporating both circumferential & longitudinal slopes
  const ringNormals: Vec3[][] = rings.map((row, stIdx) => {
    const prevRow = rings[Math.max(0, stIdx - 1)]!;
    const nextRow = rings[Math.min(rings.length - 1, stIdx + 1)]!;
    const fallbackRow = radialNormals[stIdx]!;
    return row.map((_, s) => {
      const sPrev = (s - 1 + radialSegs) % radialSegs;
      const sNext = (s + 1) % radialSegs;
      const dTheta = sub3(row[sNext]!, row[sPrev]!);
      const dSpine = sub3(nextRow[s]!, prevRow[s]!);
      const cr = cross3(dTheta, dSpine);
      const fallback = fallbackRow[s]!;
      if (len3(cr) < 1e-7) return fallback;
      const cand = norm3(cr);
      return dot3(cand, fallback) < 0 ? mul3(cand, -1) : cand;
    });
  });

  const quads: QuadFace[] = [];
  const tan0 = norm3(sub3(stations[1]!.center, stations[0]!.center));
  const flipWinding = dot3(cross3(stations[0]!.axisX, stations[0]!.axisY), tan0) < 0;

  for (let i = 0; i < rings.length - 1; i++) {
    const r0 = rings[i]!;
    const r1 = rings[i + 1]!;
    const n0 = ringNormals[i]!;
    const n1 = ringNormals[i + 1]!;
    const c0 = ringColors ? ringColors[i]! : null;
    const c1 = ringColors ? ringColors[i + 1]! : null;
    for (let s = 0; s < radialSegs; s++) {
      const s2 = (s + 1) % radialSegs;
      const thMid = (2 * Math.PI * (s + 0.5)) / radialSegs;
      const bandStyle = bandStyleFn?.(i, thMid);
      const vColors: readonly [Rgb, Rgb, Rgb, Rgb] | undefined =
        !bandStyle?.baseRgb && c0 && c1
          ? flipWinding
            ? [c0[s]!, c1[s]!, c1[s2]!, c0[s2]!]
            : [c0[s]!, c0[s2]!, c1[s2]!, c1[s]!]
          : undefined;
      quads.push({
        verts: flipWinding
          ? [r0[s]!, r1[s]!, r1[s2]!, r0[s2]!]
          : [r0[s]!, r0[s2]!, r1[s2]!, r1[s]!],
        vNormals: flipWinding
          ? [n0[s]!, n1[s]!, n1[s2]!, n0[s2]!]
          : [n0[s]!, n0[s2]!, n1[s2]!, n1[s]!],
        vColors,
        baseRgb: bandStyle?.baseRgb ?? rgb,
        alpha,
        spec: bandStyle?.spec ?? spec,
        emissive: bandStyle?.emissive ?? emissive,
        shininess: bandStyle?.shininess ?? shininess,
        materialRole: bandStyle?.materialRole ?? materialRole,
      });
    }
  }

  const tanEnd = norm3(
    sub3(stations[stations.length - 1]!.center, stations[stations.length - 2]!.center),
  );
  const emitLoftCap = (
    isEnd: boolean,
    st: LoftStation3D,
    tanOut: Vec3,
    baseRing: readonly Vec3[],
    baseNrm: readonly Vec3[],
    capLen: number,
  ) => {
    if (capLen <= 0) return;
    const pole = add3(st.center, mul3(tanOut, capLen));
    const forwardOrder = isEnd !== flipWinding;
    for (let s = 0; s < radialSegs; s++) {
      const s2 = (s + 1) % radialSegs;
      quads.push({
        verts: forwardOrder
          ? [baseRing[s]!, baseRing[s2]!, pole, pole]
          : [pole, pole, baseRing[s2]!, baseRing[s]!],
        vNormals: forwardOrder
          ? [baseNrm[s]!, baseNrm[s2]!, tanOut, tanOut]
          : [tanOut, tanOut, baseNrm[s2]!, baseNrm[s]!],
        baseRgb: rgb,
        alpha,
        spec,
        emissive,
        shininess,
        materialRole,
      });
    }
  };

  emitLoftCap(false, stations[0]!, mul3(tan0, -1), rings[0]!, ringNormals[0]!, capStart);
  emitLoftCap(
    true,
    stations[stations.length - 1]!,
    tanEnd,
    rings[rings.length - 1]!,
    ringNormals[ringNormals.length - 1]!,
    capEnd,
  );

  return quads;
}

function makeOutwardQuad(
  v0: Vec3,
  v1: Vec3,
  v2: Vec3,
  v3: Vec3,
  outwardHint: Vec3,
  rgb: Rgb,
  alpha: number,
  spec = 0.25,
  shininess = 24,
  materialRole?: StudioMaterialRole,
  bevelCenter?: Vec3,
): QuadFace {
  const n = cross3(sub3(v1, v0), sub3(v3, v0));
  const verts: readonly [Vec3, Vec3, Vec3, Vec3] =
    dot3(n, outwardHint) >= 0 ? [v0, v1, v2, v3] : [v0, v3, v2, v1];
  if (bevelCenter) {
    const fn = norm3(cross3(sub3(verts[1], verts[0]), sub3(verts[3], verts[0])));
    const bv = (v: Vec3): Vec3 => norm3(add3(fn, mul3(norm3(sub3(v, bevelCenter)), 0.22)));
    return {
      verts,
      vNormals: [bv(verts[0]), bv(verts[1]), bv(verts[2]), bv(verts[3])],
      cullBackface: true,
      baseRgb: rgb,
      alpha,
      spec,
      shininess,
      materialRole,
    };
  }
  return {
    verts,
    cullBackface: true,
    baseRgb: rgb,
    alpha,
    spec,
    shininess,
    materialRole,
  };
}

/**
 * Authentic Wunda / Combo Chair Open C-Frame Laminated Oak Arch Side Panel
 * (top arm + rear spine + bottom arm, leaving the front-middle mouth completely open).
 */
function makeOpenCFramePanelQuads(
  cx: number,
  yPos: number,
  thicknessY: number,
  oakRgb: Rgb,
  alpha: number,
): QuadFace[] {
  const xBack = cx - 0.3;
  const xFront = cx + 0.255;
  const zBot = 0.042;
  const zTop = 0.55;
  const wSpine = 0.115;
  const hArm = 0.072;
  const hy = thicknessY * 0.5;

  const ptsOuter: readonly [number, number][] = [
    [xFront, zTop],
    [xBack + 0.04, zTop],
    [xBack, zTop - 0.04],
    [xBack, zBot + 0.04],
    [xBack + 0.04, zBot],
    [xFront, zBot],
  ];
  const ptsInner: readonly [number, number][] = [
    [xFront, zTop - hArm],
    [xBack + wSpine + 0.05, zTop - hArm],
    [xBack + wSpine, zTop - hArm - 0.045],
    [xBack + wSpine, zBot + hArm + 0.045],
    [xBack + wSpine + 0.05, zBot + hArm],
    [xFront, zBot + hArm],
  ];

  const voL = ptsOuter.map(([px, pz]): Vec3 => [px, yPos - hy, pz]);
  const viL = ptsInner.map(([px, pz]): Vec3 => [px, yPos - hy, pz]);
  const voR = ptsOuter.map(([px, pz]): Vec3 => [px, yPos + hy, pz]);
  const viR = ptsInner.map(([px, pz]): Vec3 => [px, yPos + hy, pz]);

  const cMidX = cx - 0.12;
  const cMidZ = (zBot + zTop) * 0.5;
  const bevC: Vec3 = [cMidX, yPos, cMidZ];
  const out: QuadFace[] = [];

  for (let i = 0; i < ptsOuter.length - 1; i++) {
    out.push(
      makeOutwardQuad(
        voL[i]!,
        voL[i + 1]!,
        viL[i + 1]!,
        viL[i]!,
        [0, -1, 0],
        oakRgb,
        alpha,
        0.25,
        26,
        'wood',
        bevC,
      ),
    );
    out.push(
      makeOutwardQuad(
        voR[i]!,
        voR[i + 1]!,
        viR[i + 1]!,
        viR[i]!,
        [0, 1, 0],
        oakRgb,
        alpha,
        0.25,
        26,
        'wood',
        bevC,
      ),
    );
    const outMidX = (ptsOuter[i]![0] + ptsOuter[i + 1]![0]) * 0.5;
    const outMidZ = (ptsOuter[i]![1] + ptsOuter[i + 1]![1]) * 0.5;
    out.push(
      makeOutwardQuad(
        voL[i]!,
        voL[i + 1]!,
        voR[i + 1]!,
        voR[i]!,
        [outMidX - cMidX, 0, outMidZ - cMidZ],
        oakRgb,
        alpha,
        0.27,
        28,
        'wood',
        bevC,
      ),
    );
    const inMidX = (ptsInner[i]![0] + ptsInner[i + 1]![0]) * 0.5;
    const inMidZ = (ptsInner[i]![1] + ptsInner[i + 1]![1]) * 0.5;
    out.push(
      makeOutwardQuad(
        viL[i]!,
        viL[i + 1]!,
        viR[i + 1]!,
        viR[i]!,
        [cx + 0.18 - inMidX, 0, cMidZ - inMidZ],
        oakRgb,
        alpha,
        0.24,
        24,
        'wood',
        bevC,
      ),
    );
  }

  // Front top & bottom C-arch end caps
  out.push(
    makeOutwardQuad(
      voL[0]!,
      viL[0]!,
      viR[0]!,
      voR[0]!,
      [1, 0, 0],
      oakRgb,
      alpha,
      0.26,
      26,
      'wood',
      bevC,
    ),
  );
  const last = ptsOuter.length - 1;
  out.push(
    makeOutwardQuad(
      voL[last]!,
      viL[last]!,
      viR[last]!,
      voR[last]!,
      [1, 0, 0],
      oakRgb,
      alpha,
      0.26,
      26,
      'wood',
      bevC,
    ),
  );

  return out;
}

function makeHexPrismBellQuads(
  cx: number,
  y0: number,
  y1: number,
  cz: number,
  radius: number,
  rgb: Rgb,
  alpha: number,
): QuadFace[] {
  const ring0: Vec3[] = [];
  const ring1: Vec3[] = [];
  for (let k = 0; k < 6; k++) {
    const ang = (Math.PI * k) / 3 + Math.PI / 6;
    const px = cx + Math.cos(ang) * radius;
    const pz = cz + Math.sin(ang) * radius;
    ring0.push([px, y0, pz]);
    ring1.push([px, y1, pz]);
  }
  const bevC: Vec3 = [cx, (y0 + y1) * 0.5, cz];
  const quads: QuadFace[] = [];
  for (let k = 0; k < 6; k++) {
    const kn = (k + 1) % 6;
    const mx = (ring0[k]![0] + ring0[kn]![0]) * 0.5 - cx;
    const mz = (ring0[k]![2] + ring0[kn]![2]) * 0.5 - cz;
    quads.push(
      makeOutwardQuad(
        ring0[k]!,
        ring0[kn]!,
        ring1[kn]!,
        ring1[k]!,
        [mx, 0, mz],
        rgb,
        alpha,
        0.24,
        24,
        'leather',
        bevC,
      ),
    );
  }
  // 2 quads cover each 6-gon hexagonal face cleanly (0-1-2-3 and 0-3-4-5)
  quads.push(
    makeOutwardQuad(
      ring0[0]!,
      ring0[1]!,
      ring0[2]!,
      ring0[3]!,
      [0, -1, 0],
      rgb,
      alpha,
      0.24,
      22,
      'leather',
      bevC,
    ),
    makeOutwardQuad(
      ring0[0]!,
      ring0[3]!,
      ring0[4]!,
      ring0[5]!,
      [0, -1, 0],
      rgb,
      alpha,
      0.24,
      22,
      'leather',
      bevC,
    ),
    makeOutwardQuad(
      ring1[0]!,
      ring1[1]!,
      ring1[2]!,
      ring1[3]!,
      [0, 1, 0],
      rgb,
      alpha,
      0.24,
      22,
      'leather',
      bevC,
    ),
    makeOutwardQuad(
      ring1[0]!,
      ring1[3]!,
      ring1[4]!,
      ring1[5]!,
      [0, 1, 0],
      rgb,
      alpha,
      0.24,
      22,
      'leather',
      bevC,
    ),
  );
  return quads;
}

function makeBrassStarKnobQuads(
  center: Vec3,
  radius: number,
  thicknessY: number,
  brassRgb: Rgb,
  alpha: number,
): QuadFace[] {
  const segs = 10;
  const hy = thicknessY * 0.5;
  const rL: Vec3[] = [];
  const rR: Vec3[] = [];
  const nRad: Vec3[] = [];
  for (let k = 0; k < segs; k++) {
    const ang = (2 * Math.PI * k) / segs;
    const lobe = k % 2 === 0 ? radius : radius * 0.68;
    const dx = Math.cos(ang) * lobe;
    const dz = Math.sin(ang) * lobe;
    rL.push([center[0] + dx, center[1] - hy, center[2] + dz]);
    rR.push([center[0] + dx, center[1] + hy, center[2] + dz]);
    nRad.push([Math.cos(ang), 0, Math.sin(ang)]);
  }
  const cL: Vec3 = [center[0], center[1] - hy * 1.15, center[2]];
  const cR: Vec3 = [center[0], center[1] + hy * 1.15, center[2]];
  const quads: QuadFace[] = [];
  for (let k = 0; k < segs; k++) {
    const kn = (k + 1) % segs;
    quads.push(
      makeOutwardQuad(
        rL[k]!,
        rL[kn]!,
        rR[kn]!,
        rR[k]!,
        nRad[k]!,
        brassRgb,
        alpha,
        0.64,
        64,
        'brass',
        center,
      ),
      makeOutwardQuad(rL[k]!, rL[kn]!, cL, cL, [0, -1, 0], brassRgb, alpha, 0.64, 64, 'brass', center),
      makeOutwardQuad(rR[k]!, rR[kn]!, cR, cR, [0, 1, 0], brassRgb, alpha, 0.64, 64, 'brass', center),
    );
  }
  return quads;
}

function makeOrientedEllipsoidQuads(
  center: Vec3,
  axisX: Vec3,
  axisY: Vec3,
  axisZ: Vec3,
  rx: number,
  ry: number,
  rz: number,
  rgb: Rgb,
  segs = 14,
  ringsCount = 8,
  alpha = 1,
  spec = 0.24,
  shininess = 24,
  twistLobes = 0,
  materialRole?: StudioMaterialRole,
  depthBias = 0,
): QuadFace[] {
  const rings: Vec3[][] = [];
  const ringNormals: Vec3[][] = [];
  for (let r = 0; r <= ringsCount; r++) {
    const phi = -Math.PI * 0.5 + (Math.PI * r) / ringsCount;
    const cp = Math.cos(phi);
    const sp = Math.sin(phi);
    const row: Vec3[] = [];
    const nRow: Vec3[] = [];
    for (let s = 0; s < segs; s++) {
      const th = (2 * Math.PI * s) / segs;
      const ux = cp * Math.cos(th);
      const uy = cp * Math.sin(th);
      const uz = sp;
      const rib =
        twistLobes > 0 ? 1 + 0.062 * Math.sin(Math.atan2(uz, ux) * twistLobes + uy * 2.5) : 1;
      row.push(
        add3(
          center,
          add3(mul3(axisX, ux * rx * rib), add3(mul3(axisY, uy * ry), mul3(axisZ, uz * rz * rib))),
        ),
      );
      nRow.push(
        norm3(
          add3(
            mul3(axisX, ux / Math.max(0.005, rx)),
            add3(mul3(axisY, uy / Math.max(0.005, ry)), mul3(axisZ, uz / Math.max(0.005, rz))),
          ),
        ),
      );
    }
    rings.push(row);
    ringNormals.push(nRow);
  }
  const flip = dot3(cross3(axisX, axisY), axisZ) < 0;
  const quads: QuadFace[] = [];
  for (let r = 0; r < ringsCount; r++) {
    for (let s = 0; s < segs; s++) {
      const sn = (s + 1) % segs;
      quads.push({
        verts: flip
          ? [rings[r]![s]!, rings[r + 1]![s]!, rings[r + 1]![sn]!, rings[r]![sn]!]
          : [rings[r]![s]!, rings[r]![sn]!, rings[r + 1]![sn]!, rings[r + 1]![s]!],
        vNormals: flip
          ? [
              ringNormals[r]![s]!,
              ringNormals[r + 1]![s]!,
              ringNormals[r + 1]![sn]!,
              ringNormals[r]![sn]!,
            ]
          : [
              ringNormals[r]![s]!,
              ringNormals[r]![sn]!,
              ringNormals[r + 1]![sn]!,
              ringNormals[r + 1]![s]!,
            ],
        baseRgb: rgb,
        alpha,
        spec,
        shininess,
        materialRole,
        depthBias: depthBias !== 0 ? depthBias : undefined,
      });
    }
  }
  return quads;
}

function makeAnatomicalHeadWithHairQuads(
  center: Vec3,
  rightAxis: Vec3,
  antAxis: Vec3,
  upAxis: Vec3,
  skinRgb: Rgb,
  hairRgb: Rgb,
  scrunchieRgb: Rgb,
  alpha = 1,
  segs = 36,
  ringsCount = 24,
  ribbonRgb?: Rgb,
): QuadFace[] {
  // Refined 7.5-head Korean editorial Pilates instructor cranium dimensions (~0.89x sleek oval scale)
  const HEAD_RX = 0.066;
  const HEAD_RY = 0.077;
  const HEAD_RZ = 0.088;

  const isClayTone = Math.abs(skinRgb[0] - skinRgb[1]) < 8;
  const blushRgb: Rgb = isClayTone
    ? skinRgb
    : [
        Math.min(255, Math.round(skinRgb[0] * 0.99 + 4)),
        Math.round(skinRgb[1] * 0.8),
        Math.round(skinRgb[2] * 0.82),
      ];
  const warmShadowSkinRgb: Rgb = isClayTone
    ? skinRgb
    : [
        Math.round(skinRgb[0] * 0.93),
        Math.round(skinRgb[1] * 0.85),
        Math.round(skinRgb[2] * 0.84),
      ];
  const lashRgb: Rgb = isClayTone ? hairRgb : [30, 22, 22];
  const browRgb: Rgb = isClayTone
    ? hairRgb
    : [
        Math.min(255, Math.round(hairRgb[0] * 1.18 + 6)),
        Math.min(255, Math.round(hairRgb[1] * 1.18 + 4)),
        Math.min(255, Math.round(hairRgb[2] * 1.16 + 3)),
      ];
  const scleraRgb: Rgb = isClayTone ? [232, 228, 222] : [250, 247, 243];
  const irisRgb: Rgb = isClayTone ? hairRgb : [54, 34, 24];
  const irisAmberRgb: Rgb = isClayTone ? hairRgb : [108, 68, 44];
  const pupilRgb: Rgb = isClayTone ? hairRgb : [24, 17, 16];
  const catchlightRgb: Rgb = [254, 252, 248];
  const lipRgb: Rgb = isClayTone
    ? skinRgb
    : [
        Math.min(255, Math.round(skinRgb[0] * 0.91)),
        Math.round(skinRgb[1] * 0.59),
        Math.round(skinRgb[2] * 0.63),
      ];
  const lipLowerRgb: Rgb = isClayTone
    ? skinRgb
    : [
        Math.min(255, Math.round(skinRgb[0] * 0.94)),
        Math.round(skinRgb[1] * 0.63),
        Math.round(skinRgb[2] * 0.66),
      ];
  const accentRibbonRgb: Rgb = ribbonRgb ?? (isClayTone ? scrunchieRgb : [96, 128, 108]);

  const localPt = (lx: number, ly: number, lz: number): Vec3 =>
    add3(center, add3(mul3(rightAxis, lx), add3(mul3(antAxis, ly), mul3(upAxis, lz))));

  const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t)),
  ];

  // Shared parametric face sculpture for sub-millimeter alignment of features & bangs
  const sculptCraniumLocal = (nx: number, ny: number, nz: number): Vec3 => {
    let x = nx * HEAD_RX;
    let y = ny * HEAD_RY;
    let z = nz * HEAD_RZ;

    if (ny > 0) {
      if (nz < 0.1) {
        const jawT = Math.min(1, (0.1 - nz) / 1.1);
        // Soft graceful Korean editorial oval-V jawline tapering smoothly into a delicate rounded chin
        x *= 1 - 0.37 * Math.pow(jawT, 1.38);
        y *= 1 - 0.09 * jawT;
        const cDx = nx / 0.28;
        const cDz = (nz + 0.85) / 0.22;
        const chinW = Math.exp(-(cDx * cDx + cDz * cDz));
        y += 0.0075 * chinW;
        z -= 0.003 * chinW;
      }
      // Soft feminine malar cheekbones
      const ckDx = (Math.abs(nx) - 0.45) / 0.25;
      const ckDz = (nz + 0.13) / 0.22;
      const cheekW = Math.exp(-(ckDx * ckDx + ckDz * ckDz));
      x += (nx >= 0 ? 1 : -1) * 0.004 * cheekW * ny;
      y += 0.0044 * cheekW * ny;

      // Delicate straight nose bridge + subtly upturned refined tip
      const bDx = nx / 0.095;
      const bDz = (nz + 0.05) / 0.22;
      const tDx = nx / 0.115;
      const tDz = (nz + 0.22) / 0.1;
      const tipW = Math.exp(-(tDx * tDx + tDz * tDz));
      y += (0.008 * Math.exp(-(bDx * bDx + bDz * bDz)) + 0.0074 * tipW) * ny;
      z += 0.0016 * tipW * ny;

      // Soft brow arch & gentle orbital depression for luminous expressive eyes
      const browDx = (Math.abs(nx) - 0.34) / 0.24;
      const browDz = (nz - 0.22) / 0.11;
      y += 0.0015 * Math.exp(-(browDx * browDx + browDz * browDz)) * ny;

      const eDx = (Math.abs(nx) - 0.35) / 0.2;
      const eDz = (nz - 0.01) / 0.14;
      y -= 0.0046 * Math.exp(-(eDx * eDx + eDz * eDz)) * ny;

      // Subtle lip pillow contour directly in face mesh
      const mDx = nx / 0.24;
      const mDz = (nz + 0.47) / 0.13;
      y += 0.0028 * Math.exp(-(mDx * mDx + mDz * mDz)) * ny;
    } else if (nz < -0.22) {
      const occT = (-0.22 - nz) / 0.78;
      x *= 1 - 0.22 * occT;
      y *= 1 - 0.16 * occT;
    }

    return [x, y, z];
  };

  const faceSurfY = (lx: number, lz: number): number => {
    const nx = Math.max(-0.95, Math.min(0.95, lx / HEAD_RX));
    const nz = Math.max(-0.95, Math.min(0.95, lz / HEAD_RZ));
    const ny = Math.sqrt(Math.max(0.05, 1 - nx * nx - nz * nz));
    return sculptCraniumLocal(nx, ny, nz)[1];
  };

  // 1) Separate High-Resolution Sculpted Porcelain Skin Cranium with Seamless Rose Cheek Blush
  const skinGrid: Vec3[][] = [];
  const skinNrmGrid: Vec3[][] = [];
  const skinColGrid: Rgb[][] = [];

  for (let r = 0; r <= ringsCount; r++) {
    const phi = -Math.PI * 0.5 + (Math.PI * r) / ringsCount;
    const cp = Math.cos(phi);
    const nz = Math.sin(phi);
    const sRow: Vec3[] = [];
    const nRow: Vec3[] = [];
    const cRow: Rgb[] = [];
    for (let s = 0; s < segs; s++) {
      const th = (2 * Math.PI * s) / segs;
      const nx = cp * Math.cos(th);
      const ny = cp * Math.sin(th);
      const [x, y, z] = sculptCraniumLocal(nx, ny, nz);
      sRow.push(localPt(x, y, z));
      nRow.push(
        norm3(
          add3(
            mul3(rightAxis, nx / HEAD_RX),
            add3(mul3(antAxis, ny / HEAD_RY), mul3(upAxis, nz / HEAD_RZ)),
          ),
        ),
      );

      // Per-vertex organic rose-peach cheek blush + subtle eyelid/under-lip warmth
      let vCol: Rgb = skinRgb;
      if (!isClayTone && ny > 0.15) {
        const blDx = (Math.abs(nx) - 0.45) / 0.25;
        const blDz = (nz + 0.16) / 0.18;
        const blushW = Math.exp(-(blDx * blDx + blDz * blDz)) * Math.min(1, ny * 1.25) * 0.44;
        if (blushW > 0.01) {
          vCol = mixRgb(vCol, blushRgb, blushW);
        }
        const lidDx = (Math.abs(nx) - 0.35) / 0.18;
        const lidDz = (nz - 0.08) / 0.09;
        const lidW = Math.exp(-(lidDx * lidDx + lidDz * lidDz)) * ny * 0.22;
        if (lidW > 0.01) {
          vCol = mixRgb(vCol, warmShadowSkinRgb, lidW);
        }
      }
      cRow.push(vCol);
    }
    skinGrid.push(sRow);
    skinNrmGrid.push(nRow);
    skinColGrid.push(cRow);
  }

  const flip = dot3(cross3(rightAxis, antAxis), upAxis) < 0;
  const quads: QuadFace[] = [];

  for (let r = 0; r < ringsCount; r++) {
    for (let s = 0; s < segs; s++) {
      const sn = (s + 1) % segs;
      const v0 = skinGrid[r]![s]!;
      const v1 = skinGrid[r]![sn]!;
      const v2 = skinGrid[r + 1]![sn]!;
      const v3 = skinGrid[r + 1]![s]!;
      const n0 = skinNrmGrid[r]![s]!;
      const n1 = skinNrmGrid[r]![sn]!;
      const n2 = skinNrmGrid[r + 1]![sn]!;
      const n3 = skinNrmGrid[r + 1]![s]!;
      const c0 = skinColGrid[r]![s]!;
      const c1 = skinColGrid[r]![sn]!;
      const c2 = skinColGrid[r + 1]![sn]!;
      const c3 = skinColGrid[r + 1]![s]!;
      quads.push({
        verts: flip ? [v0, v3, v2, v1] : [v0, v1, v2, v3],
        vNormals: flip ? [n0, n3, n2, n1] : [n0, n1, n2, n3],
        vColors: flip ? [c0, c3, c2, c1] : [c0, c1, c2, c3],
        baseRgb: skinRgb,
        alpha,
        spec: 0.11,
        shininess: 22,
        materialRole: 'skin',
      });
    }
  }

  // 2) Separate Smooth-Hairline Silk Hair Crown Shell (eliminates sawtooth hairline artifacts!)
  const hairRings = Math.max(10, Math.round(ringsCount * 0.85));
  const hairGrid: Vec3[][] = [];
  const hairNrmGrid: Vec3[][] = [];
  for (let r = 0; r <= hairRings; r++) {
    const phi = -Math.PI * 0.44 + (Math.PI * 0.94 * r) / hairRings;
    const cp = Math.cos(phi);
    const nz = Math.sin(phi);
    const hRow: Vec3[] = [];
    const hnRow: Vec3[] = [];
    const templeZ = (nz - 0.16) / 0.28;
    const templeExp = Math.exp(-(templeZ * templeZ));

    for (let s = 0; s < segs; s++) {
      const th = (2 * Math.PI * s) / segs;
      const nx = cp * Math.cos(th);
      const ny = cp * Math.sin(th);
      const [sx, sy, sz] = sculptCraniumLocal(nx, ny, nz);

      // Smooth curved hairline boundary: fuller glossy sides hugging temples, clean open face oval
      const partArch = 0.11 * Math.exp(-((nx / 0.24) * (nx / 0.24)));
      const hairlineBoundary = 0.08 + partArch + ny * 0.56;
      const faceExposure = Math.max(0, hairlineBoundary - nz) * Math.max(0, ny - 0.12);
      const tuck = Math.min(1, faceExposure * 2.5);

      const crownLift = 0.0078 * Math.max(0, nz);
      const templeWave = 0.0056 * templeExp * Math.abs(nx);
      const partDip =
        ny > -0.15 && nz > 0.34 ? 0.0024 * Math.exp(-((nx / 0.085) * (nx / 0.085))) : 0;

      const shellOffset = lerp(1.0, 0.9, tuck);
      const hx = (sx * 1.08 + nx * templeWave) * shellOffset;
      const hy = (sy * 1.065 - 0.0032) * shellOffset;
      const hz = (sz * 1.06 + 0.005 + crownLift - partDip) * lerp(1.0, 0.96, tuck);
      hRow.push(localPt(hx, hy, hz));
      hnRow.push(
        norm3(
          add3(
            mul3(rightAxis, nx / (HEAD_RX * 1.07)),
            add3(mul3(antAxis, ny / (HEAD_RY * 1.06)), mul3(upAxis, nz / (HEAD_RZ * 1.05))),
          ),
        ),
      );
    }
    hairGrid.push(hRow);
    hairNrmGrid.push(hnRow);
  }

  for (let r = 0; r < hairRings; r++) {
    const phiMid = -Math.PI * 0.44 + (Math.PI * 0.94 * (r + 0.5)) / hairRings;
    const cpMid = Math.cos(phiMid);
    const nzMid = Math.sin(phiMid);
    for (let s = 0; s < segs; s++) {
      const sn = (s + 1) % segs;
      const thMid = (2 * Math.PI * (s + 0.5)) / segs;
      const nxMid = cpMid * Math.cos(thMid);
      const nyMid = cpMid * Math.sin(thMid);
      const partArch = 0.13 * Math.exp(-((nxMid / 0.24) * (nxMid / 0.24)));
      // Keep only the smooth hair-covered dome + fuller temple sides; open face stays cleanly uncovered
      const isFaceWindow = nyMid > 0.28 && nzMid < 0.04 + partArch + nyMid * 0.52;
      const isUnderChin = nyMid > -0.05 && nzMid < -0.58;
      if (isFaceWindow || isUnderChin) continue;

      const v0 = hairGrid[r]![s]!;
      const v1 = hairGrid[r]![sn]!;
      const v2 = hairGrid[r + 1]![sn]!;
      const v3 = hairGrid[r + 1]![s]!;
      const n0 = hairNrmGrid[r]![s]!;
      const n1 = hairNrmGrid[r]![sn]!;
      const n2 = hairNrmGrid[r + 1]![sn]!;
      const n3 = hairNrmGrid[r + 1]![s]!;
      quads.push({
        verts: flip ? [v0, v3, v2, v1] : [v0, v1, v2, v3],
        vNormals: flip ? [n0, n3, n2, n1] : [n0, n1, n2, n3],
        baseRgb: hairRgb,
        alpha,
        spec: 0.36,
        shininess: 38,
        materialRole: 'hair',
      });
    }
  }

  const strandSides = segs >= 24 ? 8 : 5;

  // 3) Luminous Korean Editorial Eyes, Soft Arched Brows, Winged Lashes & Warm Smiling Coral-Rose Lips
  if (segs >= 14) {
    for (const sgn of [-1, 1] as const) {
      // Softly arched tapered natural eyebrow
      const browPts: Vec3[] = [0, 0.35, 0.72, 1].map((u) => {
        const bx = sgn * (0.011 + u * 0.025);
        const bz = 0.0165 + Math.sin(u * Math.PI * 0.84) * 0.0042 - u * 0.002;
        return localPt(bx, faceSurfY(bx, bz) + 0.0018, bz);
      });
      // Delicate winged upper eyelash arch
      const lashPts: Vec3[] = [0, 0.28, 0.62, 0.88, 1].map((u) => {
        const lx = sgn * (0.0115 + u * 0.0255);
        const lz = -0.0005 + Math.sin(u * Math.PI * 0.88) * 0.0062 + (u > 0.82 ? 0.0018 : 0);
        return localPt(lx, faceSurfY(lx, lz) + 0.0014, lz);
      });
      const ix = sgn * 0.023;
      const iz = -0.0018;
      const iy = faceSurfY(ix, iz);

      // Almond sclera + clear espresso-amber iris + glossy dark pupil + twin starlight catchlights
      quads.push(
        ...makeTaperedTubeQuads(
          browPts,
          [
            [0.0012, 0.001],
            [0.0015, 0.0012],
            [0.0013, 0.001],
            [0.0007, 0.0006],
          ],
          browRgb,
          strandSides,
          alpha,
          0.22,
          0,
          24,
          antAxis,
          0,
          0,
          'hair',
        ),
        ...makeOrientedEllipsoidQuads(
          localPt(ix, iy - 0.0004, iz),
          rightAxis,
          antAxis,
          upAxis,
          0.012,
          0.0025,
          0.0074,
          scleraRgb,
          segs >= 24 ? 12 : 8,
          6,
          alpha,
          0.28,
          36,
          0,
          'gloss',
          -0.002,
        ),
        ...makeOrientedEllipsoidQuads(
          localPt(ix, iy + 0.0007, iz),
          rightAxis,
          antAxis,
          upAxis,
          0.0072,
          0.0025,
          0.0078,
          irisRgb,
          segs >= 24 ? 14 : 8,
          8,
          alpha,
          0.62,
          64,
          0,
          'gloss',
          -0.0035,
        ),
        // Warm amber lower iris crescent glow
        ...makeOrientedEllipsoidQuads(
          localPt(ix, iy + 0.0016, iz - 0.002),
          rightAxis,
          antAxis,
          upAxis,
          0.0052,
          0.0017,
          0.0042,
          irisAmberRgb,
          segs >= 24 ? 10 : 6,
          5,
          alpha,
          0.54,
          56,
          0,
          'gloss',
          -0.0042,
        ),
        // Deep crisp pupil
        ...makeOrientedEllipsoidQuads(
          localPt(ix, iy + 0.0022, iz + 0.0002),
          rightAxis,
          antAxis,
          upAxis,
          0.0035,
          0.0015,
          0.0038,
          pupilRgb,
          8,
          5,
          alpha,
          0.72,
          80,
          0,
          'gloss',
          -0.0048,
        ),
        // Primary starlight catchlight pearl (upper-left)
        ...makeOrientedEllipsoidQuads(
          localPt(ix - sgn * 0.0022, iy + 0.0031, iz + 0.0026),
          rightAxis,
          antAxis,
          upAxis,
          0.0021,
          0.0013,
          0.0021,
          catchlightRgb,
          8,
          5,
          alpha,
          0.85,
          96,
          0,
          'gloss',
          -0.0058,
        ),
        // Secondary fine sparkle dot (lower-right)
        ...makeOrientedEllipsoidQuads(
          localPt(ix + sgn * 0.002, iy + 0.0029, iz - 0.0022),
          rightAxis,
          antAxis,
          upAxis,
          0.0011,
          0.0009,
          0.0011,
          catchlightRgb,
          6,
          4,
          alpha,
          0.85,
          96,
          0,
          'gloss',
          -0.0058,
        ),
        ...makeTaperedTubeQuads(
          lashPts,
          [
            [0.0009, 0.0008],
            [0.0017, 0.0013],
            [0.0019, 0.0015],
            [0.0018, 0.0014],
            [0.001, 0.0008],
          ],
          lashRgb,
          strandSides,
          alpha,
          0.18,
          0,
          24,
          antAxis,
          0,
          0,
          'hair',
        ),
      );
    }

    // Sculpted Cupid's-Bow Upper Lip + Soft Pillowed Lower Coral-Rose Lip with Gentle Serene Smile
    const upperLipPts: Vec3[] = [-0.0135, -0.0055, 0, 0.0055, 0.0135].map((lx) => {
      const smileLift = Math.abs(lx) > 0.01 ? 0.0014 : 0;
      const lz =
        -0.0395 + smileLift + (Math.abs(lx) === 0.0055 ? 0.0012 : lx === 0 ? -0.0004 : -0.0006);
      return localPt(lx, faceSurfY(lx, lz) + 0.0024 + (Math.abs(lx) < 0.006 ? 0.0012 : 0), lz);
    });
    const lowerLipPts: Vec3[] = [-0.0115, -0.0048, 0, 0.0048, 0.0115].map((lx) => {
      const smileLift = Math.abs(lx) > 0.009 ? 0.0012 : 0;
      const lz = -0.0442 + smileLift - 0.0011 * Math.cos((lx / 0.0115) * Math.PI * 0.5);
      return localPt(lx, faceSurfY(lx, lz) + 0.0028, lz);
    });
    quads.push(
      ...makeTaperedTubeQuads(
        upperLipPts,
        [
          [0.0012, 0.001],
          [0.0025, 0.0021],
          [0.0021, 0.0019],
          [0.0025, 0.0021],
          [0.0012, 0.001],
        ],
        lipRgb,
        strandSides,
        alpha,
        0.34,
        0,
        42,
        antAxis,
        0,
        0,
        'gloss',
      ),
      ...makeTaperedTubeQuads(
        lowerLipPts,
        [
          [0.0013, 0.0011],
          [0.0028, 0.0024],
          [0.0031, 0.0026],
          [0.0028, 0.0024],
          [0.0013, 0.0011],
        ],
        lipLowerRgb,
        strandSides,
        alpha,
        0.4,
        0,
        48,
        antAxis,
        0,
        0,
        'gloss',
      ),
    );
  }

  // 4) Soft Layered Korean See-Through Curtain Bangs + Full Sweeping Temple Fringe + S-Wave Side-Locks
  const wispSpecs: readonly (readonly [number, number, number])[][] = [
    [
      [-0.002, 0.082, 0.0052],
      [0.0, 0.062, 0.0042],
      [0.001, 0.04, 0.003],
      [0.001, 0.023, 0.0018],
    ],
    [
      [0.005, 0.082, 0.0052],
      [0.013, 0.062, 0.0044],
      [0.02, 0.04, 0.0032],
      [0.023, 0.021, 0.002],
    ],
    [
      [-0.006, 0.082, 0.0052],
      [-0.015, 0.062, 0.0044],
      [-0.022, 0.04, 0.0032],
      [-0.025, 0.021, 0.002],
    ],
  ];
  for (const spec of wispSpecs) {
    const pts = spec.map(([wx, wz, lift]) => localPt(wx!, faceSurfY(wx!, wz!) + lift!, wz!));
    quads.push(
      ...makeTaperedTubeQuads(
        pts,
        [
          [0.0068, 0.0028],
          [0.0076, 0.003],
          [0.0056, 0.0022],
          [0.0022, 0.0011],
        ],
        hairRgb,
        strandSides,
        alpha,
        0.36,
        0,
        36,
        antAxis,
        0,
        0.002,
        'hair',
      ),
    );
  }

  for (const sgn of [-1, 1] as const) {
    const curtainOuterPts: Vec3[] = [
      [0.004, 0.085, 0.0062],
      [0.022, 0.069, 0.0056],
      [0.042, 0.045, 0.005],
      [0.056, 0.015, 0.0044],
      [0.061, -0.018, 0.0034],
    ].map(([cxB, czB, lift]) => localPt(sgn * cxB!, faceSurfY(sgn * cxB!, czB!) + lift!, czB!));
    const sideLockPts: Vec3[] = [
      localPt(sgn * 0.052, 0.036, 0.044),
      localPt(sgn * 0.064, 0.024, 0.01),
      localPt(sgn * 0.061, 0.022, -0.026),
      localPt(sgn * 0.048, 0.026, -0.058),
      localPt(sgn * 0.036, 0.022, -0.078),
    ];
    quads.push(
      ...makeTaperedTubeQuads(
        curtainOuterPts,
        [
          [0.0105, 0.0046],
          [0.014, 0.0056],
          [0.013, 0.0052],
          [0.0092, 0.0042],
          [0.0036, 0.0018],
        ],
        hairRgb,
        strandSides,
        alpha,
        0.36,
        0,
        36,
        antAxis,
        0,
        0.003,
        'hair',
      ),
      ...makeTaperedTubeQuads(
        sideLockPts,
        [
          [0.0105, 0.0048],
          [0.0115, 0.0052],
          [0.0086, 0.004],
          [0.0052, 0.0026],
          [0.002, 0.0012],
        ],
        hairRgb,
        strandSides,
        alpha,
        0.36,
        0,
        36,
        rightAxis,
        0,
        0.003,
        'hair',
      ),
    );
  }

  // 5) Delicate Sculpted Ears
  for (const sgn of [-1, 1] as const) {
    const earPos = localPt(sgn * 0.064, -0.006, -0.007);
    quads.push(
      ...makeOrientedEllipsoidQuads(
        earPos,
        rightAxis,
        antAxis,
        upAxis,
        0.0058,
        0.012,
        0.02,
        skinRgb,
        segs >= 24 ? 10 : 6,
        6,
        alpha,
        0.12,
        20,
        0,
        'skin',
      ),
    );
  }

  // 6) Pleated Satin Scrunchie + Ribbon Bow Tails + Pose-Aware Flowing Silk Ponytail / Ballet Chignon
  const isSupineHeadrest = antAxis[2] > 0.45 && upAxis[2] < 0.35;
  const scrunchieSegs = segs >= 24 ? 18 : 10;
  const scrunchiePts: Vec3[] = [];
  const scrunchieRadii: [number, number][] = [];
  for (let k = 0; k <= scrunchieSegs; k++) {
    const ang = (2 * Math.PI * k) / scrunchieSegs;
    const pleat = 1 + 0.08 * Math.sin(ang * 7);
    const rad = 0.025 * pleat;
    scrunchiePts.push(localPt(Math.cos(ang) * rad, -0.082, 0.024 + Math.sin(ang) * rad));
    scrunchieRadii.push([0.0085 * (0.92 + 0.14 * Math.abs(Math.sin(ang * 3.5))), 0.0075]);
  }

  // Pleated satin scrunchie ring oriented cleanly in the head's (rightAxis, upAxis) plane
  quads.push(
    ...makeTaperedTubeQuads(
      scrunchiePts,
      scrunchieRadii,
      scrunchieRgb,
      segs >= 24 ? 8 : 5,
      alpha,
      0.08,
      0,
      20,
      antAxis,
      0,
      0,
      'fabric',
    ),
  );

  if (isSupineHeadrest) {
    // Sleek sculpted braided ballet chignon so supine poses rest cleanly on headrest/mat
    const bunPos = localPt(0, -0.104, 0.028);
    quads.push(
      ...makeOrientedEllipsoidQuads(
        bunPos,
        rightAxis,
        antAxis,
        upAxis,
        0.039,
        0.03,
        0.039,
        hairRgb,
        segs >= 24 ? 18 : 10,
        10,
        alpha,
        0.36,
        38,
        5,
        'hair',
      ),
    );
  } else {
    // Twin delicate fluttering botanical-sage satin ribbon tails from scrunchie
    for (const sgn of [-1, 1] as const) {
      const ribPts: Vec3[] = [
        localPt(sgn * 0.012, -0.086, 0.018),
        localPt(sgn * 0.024, -0.102, -0.01),
        localPt(sgn * 0.03, -0.108, -0.044),
        localPt(sgn * 0.026, -0.104, -0.076),
      ];
      quads.push(
        ...makeTaperedTubeQuads(
          ribPts,
          [
            [0.0048, 0.0018],
            [0.0062, 0.002],
            [0.0058, 0.0018],
            [0.0034, 0.0012],
          ],
          accentRibbonRgb,
          segs >= 24 ? 6 : 4,
          alpha,
          0.12,
          0,
          24,
          antAxis,
          0,
          0.002,
          'fabric',
        ),
      );
    }

    // Lush 5-strand cascading S-wave silk ponytail (soft salon blowout drape within 0.175m envelope)
    const ponyRoot = localPt(0, -0.088, 0.024);
    const ponyMainPts: Vec3[] = [
      ponyRoot,
      localPt(0, -0.116, 0.02),
      localPt(0, -0.136, -0.008),
      localPt(0, -0.138, -0.048),
      localPt(0, -0.126, -0.092),
      localPt(0, -0.118, -0.134),
      localPt(0, -0.124, -0.168),
    ];
    quads.push(
      ...makeTaperedTubeQuads(
        ponyMainPts,
        [
          [0.02, 0.018],
          [0.034, 0.026],
          [0.039, 0.027],
          [0.036, 0.022],
          [0.028, 0.017],
          [0.019, 0.011],
          [0.008, 0.005],
        ],
        hairRgb,
        segs >= 24 ? 16 : 8,
        alpha,
        0.38,
        0,
        40,
        antAxis,
        0.006,
        0.01,
        'hair',
      ),
    );

    // 2 mid-layer fanned silk wave ribbons + 2 fine outer wispy tendrils
    for (const sgn of [-1, 1] as const) {
      const wavePts: Vec3[] = [
        localPt(sgn * 0.008, -0.09, 0.022),
        localPt(sgn * 0.026, -0.116, 0.012),
        localPt(sgn * 0.038, -0.132, -0.02),
        localPt(sgn * 0.036, -0.128, -0.064),
        localPt(sgn * 0.026, -0.118, -0.112),
        localPt(sgn * 0.018, -0.122, -0.154),
      ];
      const wispPts: Vec3[] = [
        localPt(sgn * 0.014, -0.092, 0.018),
        localPt(sgn * 0.038, -0.114, -0.002),
        localPt(sgn * 0.048, -0.124, -0.044),
        localPt(sgn * 0.042, -0.116, -0.092),
        localPt(sgn * 0.032, -0.116, -0.136),
      ];
      quads.push(
        ...makeTaperedTubeQuads(
          wavePts,
          [
            [0.014, 0.01],
            [0.022, 0.014],
            [0.025, 0.014],
            [0.021, 0.011],
            [0.014, 0.008],
            [0.006, 0.004],
          ],
          hairRgb,
          strandSides,
          alpha,
          0.38,
          0,
          40,
          antAxis,
          0,
          0.008,
          'hair',
        ),
        ...makeTaperedTubeQuads(
          wispPts,
          [
            [0.008, 0.0048],
            [0.0115, 0.0062],
            [0.0105, 0.0054],
            [0.007, 0.0036],
            [0.003, 0.0018],
          ],
          hairRgb,
          segs >= 24 ? 6 : 4,
          alpha,
          0.38,
          0,
          40,
          rightAxis,
          0,
          0.005,
          'hair',
        ),
      );
    }
  }

  return quads;
}

/**
 * 5-Digit Sculpted Pilates Hand:
 * 5-station slender metacarpal palm loft + opposable 3-segment thumb + 4 gracefully curved slender fingers.
 */
function makeSculptedHandQuads(
  side: 'L' | 'R',
  wrist: Vec3,
  forearmDir: Vec3,
  bodyRight: Vec3,
  antN: Vec3,
  skinRgb: Rgb,
  alpha: number,
  svgFastMode = false,
): QuadFace[] {
  const fdir = norm3(forearmDir);
  const sign = side === 'L' ? -1 : 1;
  const latInit = mul3(bodyRight, -sign);
  let latProj = sub3(latInit, mul3(fdir, dot3(latInit, fdir)));
  if (len3(latProj) < 1e-4) {
    latProj = cross3(fdir, antN);
    if (len3(latProj) < 1e-4) latProj = cross3(fdir, [0, 0, 1]);
  }
  const lat = norm3(latProj);
  const dorsalRaw = norm3(cross3(fdir, lat));
  const dorsal = side === 'R' ? mul3(dorsalRaw, -1) : dorsalRaw;

  const palmLen = 0.068;
  const palmSpecs: readonly [number, number, number, number][] = [
    [-0.1, 0.021, 0.014, 0.0],
    [0.2, 0.028, 0.013, 0.0018],
    [0.54, 0.032, 0.012, 0.0032],
    [0.84, 0.033, 0.011, 0.0022],
    [1.0, 0.031, 0.0095, 0.001],
  ];
  const palmStations: LoftStation3D[] = palmSpecs.map(([uP, wx, wy, cup]) => ({
    center: add3(wrist, mul3(fdir, palmLen * uP)),
    axisX: lat,
    axisY: dorsal,
    profile: (th: number) => {
      const ct = Math.cos(th);
      const st = Math.sin(th);
      const palmHollow = st < 0 ? cup * Math.exp(-((ct / 0.45) * (ct / 0.45))) * -st : 0;
      return [ct * wx, st * wy + palmHollow] as const;
    },
  }));

  const fingerSides = svgFastMode ? 5 : 10;
  const quads: QuadFace[] = [
    ...makeStationLoftQuads(
      palmStations,
      skinRgb,
      svgFastMode ? 8 : 16,
      alpha,
      0.11,
      0,
      20,
      0.004,
      0.005,
      'skin',
    ),
  ];

  // Graceful 3-segment Opposable Thumb
  const thRoot = add3(wrist, add3(mul3(fdir, 0.016), sub3(mul3(lat, 0.02), mul3(dorsal, 0.004))));
  const thDir1 = norm3(add3(mul3(fdir, 0.72), sub3(mul3(lat, 0.58), mul3(dorsal, 0.24))));
  const thMid = add3(thRoot, mul3(thDir1, 0.024));
  const thDir2 = norm3(add3(mul3(fdir, 0.84), sub3(mul3(lat, 0.3), mul3(dorsal, 0.34))));
  const thDip = add3(thMid, mul3(thDir2, 0.018));
  const thDir3 = norm3(add3(mul3(fdir, 0.9), sub3(mul3(lat, 0.1), mul3(dorsal, 0.36))));
  const thTip = add3(thDip, mul3(thDir3, 0.015));
  quads.push(
    ...makeTaperedTubeQuads(
      [thRoot, thMid, thDip, thTip],
      [
        [0.0076, 0.0072],
        [0.0066, 0.0063],
        [0.0056, 0.0052],
        [0.0042, 0.0038],
      ],
      skinRgb,
      fingerSides,
      alpha,
      0.11,
      0,
      20,
      dorsal,
      0.003,
      0.004,
      'skin',
    ),
  );

  // 4 Slender Sculpted Fingers (Index, Middle, Ring, Little) with graceful Pilates curl
  const fingerSpecs: readonly [number, number, number, number][] = [
    [0.74, 0.058, 0.0058, 0.04],
    [0.24, 0.064, 0.006, 0.0],
    [-0.25, 0.059, 0.0056, -0.04],
    [-0.74, 0.047, 0.0048, -0.08],
  ];
  for (const [latU, flen, frad, splay] of fingerSpecs) {
    const knuckle = add3(
      wrist,
      add3(
        mul3(fdir, palmLen * 0.94),
        sub3(mul3(lat, latU * 0.0265), mul3(dorsal, 0.0015 * latU * latU)),
      ),
    );
    const d1 = norm3(add3(mul3(fdir, 0.97), sub3(mul3(lat, splay), mul3(dorsal, 0.18))));
    const d2 = norm3(add3(mul3(fdir, 0.91), sub3(mul3(lat, splay * 0.6), mul3(dorsal, 0.36))));
    const d3 = norm3(add3(mul3(fdir, 0.82), sub3(mul3(lat, splay * 0.3), mul3(dorsal, 0.52))));
    const pipJt = add3(knuckle, mul3(d1, flen * 0.44));
    const dipJt = add3(pipJt, mul3(d2, flen * 0.31));
    const fTip = add3(dipJt, mul3(d3, flen * 0.25));
    quads.push(
      ...makeTaperedTubeQuads(
        [knuckle, pipJt, dipJt, fTip],
        [
          [frad, frad * 0.92],
          [frad * 0.88, frad * 0.82],
          [frad * 0.76, frad * 0.72],
          [frad * 0.58, frad * 0.54],
        ],
        skinRgb,
        fingerSides,
        alpha,
        0.11,
        0,
        20,
        dorsal,
        0.002,
        frad * 0.6,
        'skin',
      ),
    );
  }

  return quads;
}

/**
 * Anatomical Pilates Grip-Sock Foot:
 * High-resolution slender ankle cuff + 7-station arched dancer's foot profile + twin cross-arch grip straps.
 */
function makeSculptedGripFootQuads(
  hip: Vec3,
  knee: Vec3,
  ankle: Vec3,
  kneeBendDir: Vec3,
  bodyAntN: Vec3,
  sockRgb: Rgb,
  strapRgb: Rgb,
  alpha: number,
  svgFastMode = false,
): QuadFace[] {
  const shinVec = sub3(ankle, knee);
  const shinDown: Vec3 = len3(shinVec) > 1e-4 ? norm3(shinVec) : [0, 0, -1];
  const shinUp = mul3(shinDown, -1);
  const thighVec = sub3(hip, knee);
  const thighUp: Vec3 = len3(thighVec) > 1e-4 ? norm3(thighVec) : shinUp;

  const patellaVec = sub3(knee, vlerp(hip, ankle, 0.5));
  const rawAnt: Vec3 =
    dot3(thighUp, shinDown) > -0.965
      ? len3(patellaVec) > 0.015
        ? patellaVec
        : kneeBendDir
      : bodyAntN;

  let antTibRaw = sub3(rawAnt, mul3(shinDown, dot3(rawAnt, shinDown)));
  if (len3(antTibRaw) < 1e-4) {
    antTibRaw = sub3(kneeBendDir, mul3(shinDown, dot3(kneeBendDir, shinDown)));
  }
  if (len3(antTibRaw) < 1e-4) {
    antTibRaw = sub3([1, 0, 0], mul3(shinDown, shinDown[0]));
    if (len3(antTibRaw) < 1e-4) antTibRaw = sub3([0, 1, 0], mul3(shinDown, shinDown[1]));
  }
  const antTib = norm3(antTibRaw);

  let footFwd: Vec3;
  let footUp: Vec3;
  if (ankle[2] <= 0.145 && shinUp[2] > 0.45) {
    const horizFwd: Vec3 = [antTib[0], antTib[1], 0];
    footFwd = len3(horizFwd) > 1e-4 ? norm3(horizFwd) : antTib;
    footUp = [0, 0, 1];
  } else if (antTib[2] < -0.25 && ankle[2] < 0.36) {
    const pointAng = (68 * Math.PI) / 180;
    footFwd = norm3(add3(mul3(antTib, Math.cos(pointAng)), mul3(shinDown, Math.sin(pointAng))));
    footUp = norm3(add3(mul3(shinUp, Math.cos(pointAng)), mul3(antTib, Math.sin(pointAng))));
  } else {
    const pointAng = ((ankle[2] > 0.24 ? 24 : 10) * Math.PI) / 180;
    footFwd = norm3(add3(mul3(antTib, Math.cos(pointAng)), mul3(shinDown, Math.sin(pointAng))));
    footUp = norm3(add3(mul3(shinUp, Math.cos(pointAng)), mul3(antTib, Math.sin(pointAng))));
  }
  const footLat = norm3(cross3(footFwd, footUp));

  // 1) Slender Ribbed Ivory Crew Grip-Sock Cuff (matches slim Achilles ankle seamlessly)
  const cuffTop = vlerp(knee, ankle, 0.84);
  const cuffSpecs: readonly [number, number, number][] = [
    [0.0, 0.031, 0.033],
    [0.42, 0.029, 0.032],
    [0.78, 0.0295, 0.032],
    [1.0, 0.0275, 0.03],
  ];
  const cuffStations: LoftStation3D[] = cuffSpecs.map(([uC, rLat, rAp]) => ({
    center: vlerp(cuffTop, ankle, uC),
    axisX: footLat,
    axisY: antTib,
    profile: (th: number) => [Math.cos(th) * rLat, Math.sin(th) * rAp] as const,
  }));

  // 2) 7-Station Sculpted Dancer's Foot Profile (Calcaneus -> High Arch -> Instep -> Tapered Toe Box)
  const footSpecs: readonly [number, number, number, number, number][] = [
    [-0.04, -0.015, 0.024, 0.025, 0.0],
    [-0.012, -0.013, 0.027, 0.029, 0.001],
    [0.02, -0.014, 0.027, 0.026, 0.0045],
    [0.052, -0.016, 0.029, 0.022, 0.0065],
    [0.084, -0.021, 0.035, 0.017, 0.002],
    [0.112, -0.023, 0.032, 0.014, 0.0],
    [0.132, -0.024, 0.024, 0.011, 0.0],
  ];
  const footStations: LoftStation3D[] = footSpecs.map(([fOff, uOff, hw, hh, archLift]) => ({
    center: add3(ankle, add3(mul3(footFwd, fOff), mul3(footUp, uOff))),
    axisX: footLat,
    axisY: footUp,
    profile: (th: number) => {
      const st = Math.sin(th);
      const ct = Math.cos(th);
      if (st < 0) {
        const archCurve = archLift * Math.exp(-((ct / 0.55) * (ct / 0.55))) * -st;
        return [ct * hw, st * hh * 0.58 + archCurve] as const;
      }
      return [ct * hw, st * hh * 1.12] as const;
    },
  }));

  // 3) Twin Ballet Cross-Arch Elastic Grip Straps hugging dorsal instep
  const strapSegs = svgFastMode ? 6 : 10;
  const footSegs = svgFastMode ? 10 : 20;
  const strap1A = add3(ankle, add3(mul3(footFwd, 0.028), add3(mul3(footLat, -0.03), mul3(footUp, -0.015))));
  const strap1M = add3(ankle, add3(mul3(footFwd, 0.048), mul3(footUp, 0.012)));
  const strap1B = add3(ankle, add3(mul3(footFwd, 0.068), add3(mul3(footLat, 0.032), mul3(footUp, -0.018))));

  const strap2A = add3(ankle, add3(mul3(footFwd, 0.028), add3(mul3(footLat, 0.03), mul3(footUp, -0.015))));
  const strap2M = add3(ankle, add3(mul3(footFwd, 0.048), mul3(footUp, 0.013)));
  const strap2B = add3(ankle, add3(mul3(footFwd, 0.068), add3(mul3(footLat, -0.032), mul3(footUp, -0.018))));

  return [
    ...makeStationLoftQuads(
      cuffStations,
      sockRgb,
      footSegs,
      alpha,
      0.04,
      0,
      16,
      0.004,
      0,
      'fabric',
    ),
    ...makeStationLoftQuads(
      footStations,
      sockRgb,
      footSegs,
      alpha,
      0.04,
      0,
      16,
      0.01,
      0.011,
      'fabric',
    ),
    ...makeTaperedTubeQuads(
      [strap1A, strap1M, strap1B],
      [
        [0.0038, 0.0028],
        [0.0045, 0.003],
        [0.0038, 0.0028],
      ],
      strapRgb,
      strapSegs,
      alpha,
      0.04,
      0,
      16,
      footUp,
      0,
      0,
      'fabric',
    ),
    ...makeTaperedTubeQuads(
      [strap2A, strap2M, strap2B],
      [
        [0.0038, 0.0028],
        [0.0045, 0.003],
        [0.0038, 0.0028],
      ],
      strapRgb,
      strapSegs,
      alpha,
      0.04,
      0,
      16,
      footUp,
      0,
      0,
      'fabric',
    ),
  ];
}

function makeCylinder3D(
  p0: Vec3,
  p1: Vec3,
  radius: number,
  rgb: Rgb,
  sides = 16,
  alpha = 1,
  spec = 0.46,
  shininess = 36,
  materialRole?: StudioMaterialRole,
): QuadFace[] {
  const segCount = Math.max(2, Math.min(8, Math.ceil(len3(sub3(p1, p0)) / 0.34)));
  const pts: Vec3[] = [];
  const radii: [number, number][] = [];
  for (let i = 0; i <= segCount; i++) {
    pts.push(vlerp(p0, p1, i / segCount));
    radii.push([radius, radius]);
  }
  return makeTaperedTubeQuads(
    pts,
    radii,
    rgb,
    sides,
    alpha,
    spec,
    0,
    shininess,
    undefined,
    0,
    0,
    materialRole,
  );
}

function makeSphereQuads(
  center: Vec3,
  rx: number,
  ry: number,
  rz: number,
  rgb: Rgb,
  segs = 16,
  ringsCount = 10,
  alpha = 1,
  spec = 0.26,
  emissive = 0,
  shininess = 26,
  materialRole?: StudioMaterialRole,
): QuadFace[] {
  const rings: Vec3[][] = [];
  const ringNormals: Vec3[][] = [];
  for (let r = 0; r <= ringsCount; r++) {
    const phi = -Math.PI * 0.5 + (Math.PI * r) / ringsCount;
    const cp = Math.cos(phi);
    const sp = Math.sin(phi);
    const row: Vec3[] = [];
    const nRow: Vec3[] = [];
    for (let s = 0; s < segs; s++) {
      const th = (2 * Math.PI * s) / segs;
      const ux = cp * Math.cos(th);
      const uy = cp * Math.sin(th);
      row.push([center[0] + ux * rx, center[1] + uy * ry, center[2] + sp * rz]);
      nRow.push(
        norm3([ux / Math.max(0.008, rx), uy / Math.max(0.008, ry), sp / Math.max(0.008, rz)]),
      );
    }
    rings.push(row);
    ringNormals.push(nRow);
  }
  const quads: QuadFace[] = [];
  for (let r = 0; r < ringsCount; r++) {
    for (let s = 0; s < segs; s++) {
      const sn = (s + 1) % segs;
      quads.push({
        verts: [rings[r]![s]!, rings[r]![sn]!, rings[r + 1]![sn]!, rings[r + 1]![s]!],
        vNormals: [
          ringNormals[r]![s]!,
          ringNormals[r]![sn]!,
          ringNormals[r + 1]![sn]!,
          ringNormals[r + 1]![s]!,
        ],
        baseRgb: rgb,
        alpha,
        spec,
        emissive,
        shininess,
        materialRole,
      });
    }
  }
  return quads;
}

function makeTorusQuads(
  center: Vec3,
  majorR: number,
  minorR: number,
  rgb: Rgb,
  alpha = 1,
  segs = 24,
  tubeSegs = 8,
  axis: 'X' | 'Y' | 'Z' = 'X',
  materialRole?: StudioMaterialRole,
): QuadFace[] {
  const rings: Vec3[][] = [];
  const ringNormals: Vec3[][] = [];
  for (let i = 0; i <= segs; i++) {
    const u = (2 * Math.PI * i) / segs;
    const cu = Math.cos(u);
    const su = Math.sin(u);
    const row: Vec3[] = [];
    const nRow: Vec3[] = [];
    for (let j = 0; j < tubeSegs; j++) {
      const v = (2 * Math.PI * j) / tubeSegs;
      const cv = Math.cos(v);
      const sv = Math.sin(v);
      const rad = majorR + cv * minorR;
      if (axis === 'Y') {
        row.push([center[0] + rad * cu, center[1] + sv * minorR, center[2] + rad * su]);
        nRow.push(norm3([cv * cu, sv, cv * su]));
      } else if (axis === 'Z') {
        row.push([center[0] + rad * cu, center[1] + rad * su, center[2] + sv * minorR]);
        nRow.push(norm3([cv * cu, cv * su, sv]));
      } else {
        row.push([center[0] + sv * minorR, center[1] + rad * cu, center[2] + rad * su]);
        nRow.push(norm3([sv, cv * cu, cv * su]));
      }
    }
    rings.push(row);
    ringNormals.push(nRow);
  }
  const quads: QuadFace[] = [];
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < tubeSegs; j++) {
      const jn = (j + 1) % tubeSegs;
      quads.push({
        verts: [rings[i]![j]!, rings[i]![jn]!, rings[i + 1]![jn]!, rings[i + 1]![j]!],
        vNormals: [
          ringNormals[i]![j]!,
          ringNormals[i]![jn]!,
          ringNormals[i + 1]![jn]!,
          ringNormals[i + 1]![j]!,
        ],
        baseRgb: rgb,
        alpha,
        spec: 0.48,
        shininess: 56,
        materialRole,
      });
    }
  }
  return quads;
}

/**
 * High-Craft Studio Box Prop (Short Box / Long Box):
 * Walnut base skirt + piped sage leather upholstered cushion + recessed end carry handles.
 */
function makeStudioBoxProp(
  center: Vec3,
  dims: Vec3,
  leatherRgb: Rgb,
  walnutRgb: Rgb,
  charcoalRgb: Rgb,
  pipingHex: string,
  alpha: number,
  svgFastMode: boolean,
): { quads: QuadFace[]; piping: StrokeLine3D } {
  const [cx, cy, cz] = center;
  const [wx, wy, wz] = dims;
  const baseH = wz * 0.24;
  const topH = wz * 0.76;
  const baseZ = cz - wz * 0.5 + baseH * 0.5;
  const topZ = cz - wz * 0.5 + baseH + topH * 0.5;
  const topCush = makePipedCushion(
    [cx, cy, topZ],
    [wx, wy, topH],
    leatherRgb,
    pipingHex,
    alpha,
    svgFastMode,
  );
  const quads: QuadFace[] = [
    ...makeSubdividedBoxQuads(
      [cx, cy, baseZ],
      [wx * 0.992, wy * 0.992, baseH],
      walnutRgb,
      alpha,
      0.26,
      28,
      'wood',
    ),
    ...topCush.quads,
  ];
  for (const sx of [cx - wx * 0.502, cx + wx * 0.502]) {
    quads.push(
      ...makeSubdividedBoxQuads(
        [sx, cy, cz + wz * 0.04],
        [0.008, Math.min(0.14, wy * 0.28), 0.032],
        charcoalRgb,
        alpha,
        0.18,
        20,
        'leather',
      ),
    );
  }
  return { quads, piping: topCush.piping };
}

/**
 * High-Craft Spring-Steel Pilates Magic Circle with Dual Curved Moulded Side Pads & Brass Rivets.
 */
function makeMagicCircle3D(
  center: Vec3,
  majorR: number,
  ringAxis: 'X' | 'Y' | 'Z',
  steelRgb: Rgb,
  charcoalRgb: Rgb,
  brassRgb: Rgb,
  alpha: number,
  svgFastMode: boolean,
): QuadFace[] {
  const segs = svgFastMode ? 16 : 26;
  const tubeSegs = svgFastMode ? 6 : 10;
  const quads: QuadFace[] = [
    ...makeTorusQuads(center, majorR, 0.0075, steelRgb, alpha, segs, tubeSegs, ringAxis, 'chrome'),
  ];

  // Dual moulded crescent side pads (outer & inner grip pads on opposite poles + brass center rivets)
  const padArcRad = 0.28;
  const padSteps = svgFastMode ? 3 : 5;
  for (const poleSign of [-1, 1] as const) {
    for (const layerOffset of [-0.015, 0.015] as const) {
      const rPad = majorR + layerOffset;
      const pts: Vec3[] = [];
      const radii: [number, number][] = [];
      for (let i = 0; i <= padSteps; i++) {
        const u = -padArcRad + (2 * padArcRad * i) / padSteps;
        const baseAng = poleSign > 0 ? 0 : Math.PI;
        const ang = baseAng + u;
        const taper = 1 - 0.28 * Math.pow(Math.abs(u) / padArcRad, 2);
        const ca = Math.cos(ang) * rPad;
        const sa = Math.sin(ang) * rPad;
        if (ringAxis === 'Z') {
          pts.push([center[0] + sa, center[1] + ca, center[2]]);
        } else if (ringAxis === 'Y') {
          pts.push([center[0] + ca, center[1], center[2] + sa]);
        } else {
          pts.push([center[0], center[1] + ca, center[2] + sa]);
        }
        radii.push([0.022 * taper, 0.012 * taper]);
      }
      const refN: Vec3 =
        ringAxis === 'Z' ? [0, 0, 1] : ringAxis === 'Y' ? [0, 1, 0] : [1, 0, 0];
      quads.push(
        ...makeTaperedTubeQuads(
          pts,
          radii,
          charcoalRgb,
          svgFastMode ? 6 : 10,
          alpha,
          0.2,
          0,
          22,
          refN,
          0.008,
          0.008,
          'leather',
        ),
      );
    }
    const rivetPos: Vec3 =
      ringAxis === 'Z'
        ? [center[0], center[1] + poleSign * majorR, center[2] + 0.012]
        : ringAxis === 'Y'
          ? [center[0] + poleSign * majorR, center[1] + 0.012, center[2]]
          : [center[0] + 0.012, center[1] + poleSign * majorR, center[2]];
    quads.push(
      ...makeSphereQuads(
        rivetPos,
        0.006,
        0.006,
        0.006,
        brassRgb,
        svgFastMode ? 6 : 10,
        6,
        alpha,
        0.62,
        0,
        64,
        'brass',
      ),
    );
  }
  return quads;
}

function makeSpringPolyline(p0: Vec3, p1: Vec3, turns = 15, radius = 0.014): Vec3[] {
  const axis = sub3(p1, p0);
  const L = len3(axis);
  if (L < 0.03) return [p0, p1];
  const u = norm3(axis);
  const ref: Vec3 = Math.abs(u[2]) < 0.9 ? [0, 0, 1] : [0, 1, 0];
  const b1 = norm3(cross3(u, ref));
  const b2 = norm3(cross3(u, b1));
  const pts: Vec3[] = [p0];
  const steps = turns * 6;
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    const ang = s * turns * Math.PI * 2;
    const env =
      Math.sin(Math.min(1, s * 9) * Math.PI * 0.5) *
      Math.sin(Math.min(1, (1 - s) * 9) * Math.PI * 0.5);
    const off = add3(
      mul3(b1, Math.cos(ang) * radius * env),
      mul3(b2, Math.sin(ang) * radius * env),
    );
    pts.push(add3(add3(p0, mul3(u, s * L)), off));
  }
  pts.push(p1);
  return pts;
}

function parseSpringColors(rawSprings: string | undefined): string[] {
  if (!rawSprings || /bodyweight|맨몸|없음/i.test(rawSprings)) return [];
  const colors: string[] = [];
  const pushCount = (n: number, hex: string) => {
    for (let i = 0; i < Math.min(4, Math.max(1, Math.round(n))); i++) colors.push(hex);
  };
  const redMatch = rawSprings.match(/(\d+(?:\.\d+)?)\s*(?:R|Red|빨강)/i);
  const blueMatch = rawSprings.match(/(\d+(?:\.\d+)?)\s*(?:B|Blue|파랑)/i);
  const yellowMatch = rawSprings.match(/(\d+(?:\.\d+)?)\s*(?:Y|W|Yellow|White|노랑|하양)/i);
  const greenMatch = rawSprings.match(/(\d+(?:\.\d+)?)\s*(?:G|Green|초록)/i);
  if (greenMatch) pushCount(Number(greenMatch[1]), '#2F855A');
  if (redMatch) pushCount(Number(redMatch[1]), '#C9382B');
  if (blueMatch) pushCount(Number(blueMatch[1]), '#2A6EC4');
  if (yellowMatch) pushCount(Number(yellowMatch[1]), '#D49A24');
  if (colors.length === 0) {
    return ['#C9382B', '#C9382B', '#2A6EC4', '#D49A24'];
  }
  return colors.slice(0, 5);
}

export interface Render3DFrameOptions {
  readonly ctx: CanvasRenderingContext2D;
  readonly width: number;
  readonly height: number;
  readonly dpr?: number;
  readonly gpuRenderer?: Studio3DGpuRenderer | null;
  readonly exercise: PilatesExercise;
  readonly phaseT: number;
  readonly yawDeg: number;
  readonly pitchDeg: number;
  readonly zoom: number;
  readonly panX?: number;
  readonly panY?: number;
  readonly shader: Studio3DShaderPreset;
  readonly mirrored?: boolean;
  readonly showBiomechOverlay?: boolean;
  readonly showMuscleHeatmap?: boolean;
  readonly dualView?: boolean;
  readonly springOverride?: string;
  readonly footbarOverride?: 'default' | FootbarState;
  readonly headrestOverride?: 'default' | HeadrestState;
  readonly propOverride?: Studio3DPropOverride;
  readonly selectedHotspotId?: Studio3DHotspotId | null;
}

interface HotspotDef3D {
  readonly id: Studio3DHotspotId;
  readonly labelKo: string;
  readonly metricKo: string;
  readonly cueKo: string;
  readonly pos3d: Vec3;
}

interface Built3DScene {
  readonly quads: readonly QuadFace[];
  readonly lines: readonly StrokeLine3D[];
  readonly callouts: readonly LabelCallout3D[];
  readonly hotspotDefs: readonly HotspotDef3D[];
  readonly shadowAnchors: readonly { pos: Vec3; rx: number; ry: number }[];
  readonly pelvis: Vec3;
  readonly target: Vec3;
  readonly halfSize: Vec3;
  readonly signatureId: Studio3DSignatureId;
  readonly activeZonesCount: number;
  readonly activeZones: readonly ActiveMuscleZone3D[];
  readonly springStretchPct: number;
  readonly biomechTelemetry: Biomech3DTelemetry;
  readonly characterPipeline: Studio3DCharacterPipeline;
  readonly apparatusPipeline: Studio3DApparatusPipeline;
}

/** Joint locations shared by the rendered skin, spring attachments, and model angle overlays. */
export function resolveStudio3DBody(rig: PoseRigKeyframe) {
  const spUp = norm3(sub3(rig.chest, rig.pelvis));
  const antProj = sub3(rig.antHint, mul3(spUp, dot3(rig.antHint, spUp)));
  const antN = norm3(len3(antProj) > 1e-4 ? antProj : sub3([1, 0, 0], mul3(spUp, spUp[0])));
  const bodyRight = norm3(cross3(spUp, antN));

  const pelvisRight = rig.pelvisRight ?? bodyRight;
  const lHip = sub3(rig.pelvis, mul3(pelvisRight, 0.086));
  const rHip = add3(rig.pelvis, mul3(pelvisRight, 0.086));
  const lSh = sub3(rig.chest, mul3(bodyRight, 0.15));
  const rSh = add3(rig.chest, mul3(bodyRight, 0.15));

  const [lKnee, lAnkle, lKneeBend] = solve2BoneIK(lHip, rig.lFoot, 0.4, 0.39, rig.lKneePole);
  const [rKnee, rAnkle, rKneeBend] = solve2BoneIK(rHip, rig.rFoot, 0.4, 0.39, rig.rKneePole);
  const [lElb, lWr, lElbowBend] = solve2BoneIK(lSh, rig.lHand, 0.28, 0.26, rig.lElbowPole);
  const [rElb, rWr, rElbowBend] = solve2BoneIK(rSh, rig.rHand, 0.28, 0.26, rig.rElbowPole);

  return {
    spUp,
    antN,
    bodyRight,
    lHip,
    rHip,
    lSh,
    rSh,
    lKnee,
    lAnkle,
    lKneeBend,
    rKnee,
    rAnkle,
    rKneeBend,
    lElb,
    lWr,
    lElbowBend,
    rElb,
    rWr,
    rElbowBend,
  };
}

interface MotionRoute {
  readonly points: Vec3[];
  readonly mirrorPoints: Vec3[];
  readonly target: Vec3;
  readonly halfSize: Vec3;
}
// Apparatus floor footprint and highest fixed attachment, in metres.
const APPARATUS_EXTENT: Record<ApparatusType, readonly [number, number, number, number]> = {
  cadillac: [-1.1, 1.1, 0.37, 2],
  reformer: [-1.2, 1.2, 0.36, 0.72],
  mat: [-1.04, 1.04, 0.4, 0.055],
  barrel: [-0.68, 0.58, 0.32, 1.06],
  chair: [-0.44, 0.38, 0.32, 0.74],
};
const motionRoutes = new WeakMap<PilatesExercise, MotionRoute>();

// The orbit target and route belong to the entire repetition. A camera threshold
// evaluated on the current pose would jump when the pelvis passes that threshold.
function studioMotionRoute(exercise: PilatesExercise, signature: Studio3DSignatureId): MotionRoute {
  const cached = motionRoutes.get(exercise);
  if (cached) return cached;
  const points: Vec3[] = [];
  const bounds = APPARATUS_EXTENT[exercise.apparatus];
  let minX = bounds[0],
    maxX = bounds[1],
    halfWidth = bounds[2],
    maxZ = bounds[3];
  function include(p: Vec3, radius: number) {
    minX = Math.min(minX, p[0] - radius);
    maxX = Math.max(maxX, p[0] + radius);
    halfWidth = Math.max(halfWidth, Math.abs(p[1]) + radius);
    maxZ = Math.max(maxZ, p[2] + radius);
  }
  for (let index = 0; index <= 64; index++) {
    const pose =
      exercise.id === '__legacy_signature__'
        ? samplePoseRig(signature, index / 64)
        : sampleStudio3DMotionRig(exercise, index / 64);
    const focus = pose.trajectoryFocus ?? 'chest';
    const point = pose[focus];
    points.push([
      point[0],
      point[1],
      point[2] + (focus === 'pelvis' || focus === 'chest' ? 0.14 : 0.04),
    ]);
    const body = resolveStudio3DBody(pose);
    include(pose.chest, 0.35); // Neck, head and bun may extend past the last spine landmark.
    include(pose.pelvis, 0.16);
    for (const p of [body.lElb, body.rElb, body.lKnee, body.rKnee]) include(p, 0.08);
    for (const p of [body.lWr, body.rWr, body.lAnkle, body.rAnkle]) include(p, 0.17);
    if (pose.withChairHandles) maxZ = Math.max(maxZ, 1.32);
  }
  const route: MotionRoute = {
    points,
    mirrorPoints: points.map((p) => [p[0], -p[1], p[2]]),
    target: [(minX + maxX) / 2, 0, maxZ / 2],
    halfSize: [(maxX - minX) / 2, halfWidth, maxZ / 2],
  };
  motionRoutes.set(exercise, route);
  return route;
}

function buildStudio3DScene(options: {
  exercise: PilatesExercise;
  phaseT: number;
  shader: Studio3DShaderPreset;
  mirrored: boolean;
  showBiomechOverlay: boolean;
  showMuscleHeatmap?: boolean;
  springOverride?: string;
  footbarOverride?: 'default' | FootbarState;
  headrestOverride?: 'default' | HeadrestState;
  propOverride?: Studio3DPropOverride;
  svgFastMode?: boolean;
}): Built3DScene {
  const {
    exercise,
    phaseT,
    shader,
    mirrored,
    showBiomechOverlay,
    showMuscleHeatmap = false,
    springOverride,
    footbarOverride = 'default',
    headrestOverride = 'default',
    propOverride = 'default',
    svgFastMode = false,
  } = options;

  const spec = resolveStudio3DMotionForExercise(exercise);
  const rawRig: PoseRigKeyframe =
    exercise.id === '__legacy_signature__'
      ? samplePoseRig(spec.signatureId, phaseT)
      : sampleStudio3DMotionRig(exercise, phaseT);
  const mirrorVec = (v: Vec3): Vec3 => (mirrored ? [v[0], -v[1], v[2]] : v);
  const rig: PoseRigKeyframe = mirrored
    ? {
        ...rawRig,
        pelvis: mirrorVec(rawRig.pelvis),
        spineMid: mirrorVec(rawRig.spineMid),
        chest: mirrorVec(rawRig.chest),
        antHint: mirrorVec(rawRig.antHint),
        lFoot: mirrorVec(rawRig.rFoot),
        rFoot: mirrorVec(rawRig.lFoot),
        lKneePole: mirrorVec(rawRig.rKneePole),
        rKneePole: mirrorVec(rawRig.lKneePole),
        lHand: mirrorVec(rawRig.rHand),
        rHand: mirrorVec(rawRig.lHand),
        lElbowPole: mirrorVec(rawRig.rElbowPole),
        rElbowPole: mirrorVec(rawRig.lElbowPole),
        lPedalDeg: rawRig.rPedalDeg,
        rPedalDeg: rawRig.lPedalDeg,
        sideLegSpring:
          rawRig.sideLegSpring === 'right'
            ? 'left'
            : rawRig.sideLegSpring === 'left'
              ? 'right'
              : undefined,
      }
    : rawRig;

  const apparatus: ApparatusType = exercise.apparatus;
  const quads: QuadFace[] = [];
  const lines: StrokeLine3D[] = [];
  const callouts: LabelCallout3D[] = [];
  const shadowAnchors: { pos: Vec3; rx: number; ry: number }[] = [];

  const mirrorSign = mirrored ? -1 : 1;
  const segTorso = svgFastMode ? 14 : 34;
  const segLimb = svgFastMode ? 12 : 28;
  const segHead = svgFastMode ? 14 : 36;
  const ringsHead = svgFastMode ? 9 : 24;
  const segCyl = svgFastMode ? 8 : 22;
  const segBolt = svgFastMode ? 6 : 14;
  const ringsBolt = svgFastMode ? 5 : 8;
  const segSphere = svgFastMode ? 10 : 26;
  const ringsSphere = svgFastMode ? 6 : 16;
  const segTorus = svgFastMode ? 12 : 28;
  const tubeSegTorus = svgFastMode ? 5 : 10;
  const segVault = svgFastMode ? 18 : 36;
  const segStrap = svgFastMode ? 6 : 16;

  const isClay = shader === 'clay-wire';
  const oakRgb: Rgb = isClay
    ? [206, 202, 194]
    : shader === 'studio-pbr'
      ? [196, 156, 114]
      : [76, 102, 92];
  const walnutRgb: Rgb = isClay
    ? [176, 172, 165]
    : shader === 'studio-pbr'
      ? [116, 80, 54]
      : [52, 74, 66];
  const leatherRgb: Rgb = isClay
    ? [180, 178, 172]
    : shader === 'studio-pbr'
      ? [48, 86, 72]
      : [30, 54, 46];
  const steelRgb: Rgb = isClay ? [196, 199, 202] : [206, 214, 221];
  const brassRgb: Rgb = isClay ? [194, 188, 176] : [214, 175, 104];
  const charcoalRgb: Rgb = isClay ? [146, 145, 142] : [44, 50, 50];
  const corkRgb: Rgb = isClay ? [194, 188, 180] : [172, 136, 98];
  const pipingHex = isClay ? 'rgba(240,238,232,0.75)' : 'rgba(238, 232, 220, 0.9)';
  const appAlpha = shader === 'biomech-xray' ? 0.48 : 1.0;

  const effectiveSprings =
    springOverride && springOverride !== 'default' ? springOverride : exercise.springs;
  const activeSpringColors = parseSpringColors(effectiveSprings);
  const activeSpringLabel =
    !effectiveSprings || /bodyweight/i.test(effectiveSprings) ? '맨몸' : effectiveSprings;

  const effectiveFootbar: FootbarState =
    footbarOverride !== 'default' ? footbarOverride : exercise.footbar;
  const effectiveHeadrest: HeadrestState =
    headrestOverride !== 'default' ? headrestOverride : exercise.headrest;

  const useShortBox =
    propOverride === 'short-box' ||
    (propOverride === 'default' && (Boolean(rig.withShortbox) || exercise.box === 'short-box'));
  const useLongBox =
    propOverride === 'long-box' ||
    (propOverride === 'default' && (Boolean(rig.withLongbox) || exercise.box === 'long-box'));
  const useJumpboard =
    propOverride === 'jumpboard' || (propOverride === 'default' && Boolean(rig.withJumpboard));
  const useRing =
    propOverride === 'ring' ||
    (propOverride === 'default' && exercise.props.includes('magic-circle'));
  const useRoller =
    propOverride === 'foam-roller' ||
    (propOverride === 'default' && exercise.props.includes('foam-roller'));
  const useMiniBall =
    propOverride === 'mini-ball' ||
    (propOverride === 'default' && exercise.props.includes('mini-ball'));

  const boxMountedOnReformer =
    apparatus === 'reformer' &&
    (Boolean(rig.withLongbox) || Boolean(rig.withShortbox) || rig.pelvis[2] >= 0.62);
  const boxMountedOnCadillac =
    apparatus === 'cadillac' && rig.pelvis[2] >= 0.76 && Math.abs(rig.pelvis[0]) < 0.55;

  let springStretchPct = Math.round(smoothstep(phaseT) * 100);

  // 1. Flagship Industrial Studio Apparatus Geometry (High-Density Dynamic GLB Parts when loaded, seamless procedural fallback otherwise)
  const dynamicApparatusAsset = !svgFastMode ? getCachedApparatusDynamicAsset() : null;
  const apparatusPipeline: Studio3DApparatusPipeline = dynamicApparatusAsset
    ? 'dynamic-glb'
    : 'procedural';
  if (dynamicApparatusAsset) {
    const dynamicQuads = buildDynamicApparatusQuads(dynamicApparatusAsset, {
      apparatus,
      carriageX: rig.carriageX ?? 0.12,
      footbar: apparatus === 'reformer' && useJumpboard ? 'none' : effectiveFootbar,
      box:
        apparatus === 'reformer' && boxMountedOnReformer
          ? useLongBox
            ? 'long-box'
            : useShortBox
              ? 'short-box'
              : 'none'
          : 'none',
      pedalDeg: rig.pedalDeg ?? 22,
      lPedalDeg: rig.lPedalDeg,
      rPedalDeg: rig.rPedalDeg,
      ptbDeg: rig.pushthroughDeg,
      showPtb: rig.pushthroughDeg !== undefined,
      useSpineCorrector: Boolean(rig.isSpineCorrector),
      shader,
    });
    for (let dqi = 0; dqi < dynamicQuads.length; dqi++) {
      quads.push(dynamicQuads[dqi]!);
    }
  }

  if (apparatus === 'reformer') {
    const cx = rig.carriageX ?? 0.12;
    springStretchPct =
      activeSpringColors.length === 0
        ? 0
        : Math.round(Math.max(8, Math.min(100, ((0.35 - cx) / 0.62) * 100)));

    shadowAnchors.push({ pos: [0, 0, 0.004], rx: 1.18, ry: 0.36 });

    if (!dynamicApparatusAsset) {
    // Routed European White-Oak Side & End Rails + Recessed Brushed-Steel C-Tracks
    for (const sy of [-0.3, 0.3]) {
      quads.push(
        ...makeSubdividedBoxQuads(
          [0, sy, 0.31],
          [2.34, 0.048, 0.125],
          oakRgb,
          appAlpha,
          0.25,
          28,
          'wood',
        ),
      );
      const innerY = sy < 0 ? -0.268 : 0.268;
      const lipIn = sy < 0 ? 0.006 : -0.006;
      quads.push(
        ...makeSubdividedBoxQuads(
          [0, innerY, 0.332],
          [2.18, 0.012, 0.026],
          steelRgb,
          appAlpha,
          0.56,
          64,
          'chrome',
        ),
        ...makeSubdividedBoxQuads(
          [0, innerY + lipIn, 0.343],
          [2.18, 0.016, 0.006],
          steelRgb,
          appAlpha,
          0.58,
          64,
          'chrome',
        ),
        ...makeSubdividedBoxQuads(
          [0, innerY + lipIn, 0.321],
          [2.18, 0.016, 0.006],
          steelRgb,
          appAlpha,
          0.58,
          64,
          'chrome',
        ),
      );
    }
    quads.push(
      ...makeSubdividedBoxQuads(
        [-1.15, 0, 0.31],
        [0.052, 0.648, 0.125],
        oakRgb,
        appAlpha,
        0.25,
        28,
        'wood',
      ),
      ...makeSubdividedBoxQuads(
        [1.15, 0, 0.31],
        [0.052, 0.648, 0.125],
        oakRgb,
        appAlpha,
        0.25,
        28,
        'wood',
      ),
    );

    // Walnut Corner Splines + Champagne Brass Bolts
    for (const sx of [-1.15, 1.15]) {
      for (const sy of [-0.302, 0.302]) {
        quads.push(
          ...makeSubdividedBoxQuads(
            [sx, sy, 0.31],
            [0.058, 0.054, 0.129],
            walnutRgb,
            appAlpha,
            0.28,
            30,
            'wood',
          ),
          ...makeSphereQuads(
            [sx * 1.018, sy, 0.31],
            0.006,
            0.009,
            0.009,
            brassRgb,
            segBolt,
            ringsBolt,
            appAlpha,
            0.62,
            0,
            64,
            'brass',
          ),
          ...makeSphereQuads(
            [sx, sy * 1.06, 0.31],
            0.009,
            0.006,
            0.009,
            brassRgb,
            segBolt,
            ringsBolt,
            appAlpha,
            0.62,
            0,
            64,
            'brass',
          ),
        );
      }
    }

    // Tapered Cylindrical Oak Legs + Champagne Brass Ferrules + Charcoal Levelers
    for (const sx of [-1.08, 1.08]) {
      for (const sy of [-0.28, 0.28]) {
        quads.push(
          ...makeCylinder3D(
            [sx, sy, 0.04],
            [sx, sy, 0.252],
            0.029,
            oakRgb,
            segCyl,
            appAlpha,
            0.24,
            28,
            'wood',
          ),
          ...makeCylinder3D(
            [sx, sy, 0.008],
            [sx, sy, 0.044],
            0.03,
            brassRgb,
            segCyl,
            appAlpha,
            0.62,
            64,
            'brass',
          ),
          ...makeCylinder3D(
            [sx, sy, 0],
            [sx, sy, 0.01],
            0.032,
            charcoalRgb,
            segCyl,
            appAlpha,
            0.16,
            20,
            'leather',
          ),
        );
      }
    }

    // Standing Platform + Charcoal Non-Slip Pad + Front Steel Gearbar Crossbar with Brass Spring Hooks
    quads.push(
      ...makeSubdividedBoxQuads(
        [1.04, 0, 0.368],
        [0.19, 0.58, 0.022],
        walnutRgb,
        appAlpha,
        0.26,
        28,
        'wood',
      ).filter((q) => q.verts[0][2] < 0.378 || q.verts[2][2] < 0.378),
      ...makeSubdividedBoxQuads(
        [1.04, 0, 0.383],
        [0.165, 0.54, 0.011],
        charcoalRgb,
        appAlpha,
        0.18,
        20,
        'leather',
      ),
      ...makeCylinder3D(
        [0.915, -0.27, 0.335],
        [0.915, 0.27, 0.335],
        0.011,
        steelRgb,
        segCyl,
        appAlpha,
        0.58,
        64,
        'chrome',
      ),
    );
    for (const hSy of [-0.12, -0.06, 0, 0.06, 0.12]) {
      quads.push(
        ...makeSphereQuads(
          [0.915, hSy, 0.343],
          0.009,
          0.007,
          0.012,
          brassRgb,
          segBolt,
          ringsBolt,
          appAlpha,
          0.62,
          0,
          64,
          'brass',
        ),
      );
    }

    // Walnut Carriage Perimeter Frame + Precision Delrin Roller Bogies + Rubber Bump Stops
    for (const sy of [-0.275, 0.275]) {
      const wheelY = sy < 0 ? -0.264 : 0.264;
      quads.push(
        ...makeSubdividedBoxQuads(
          [cx + 0.08, sy, 0.354],
          [0.78, 0.024, 0.024],
          walnutRgb,
          appAlpha,
          0.26,
          28,
          'wood',
        ),
        ...makeSubdividedBoxQuads(
          [0.895, wheelY, 0.332],
          [0.022, 0.018, 0.022],
          charcoalRgb,
          appAlpha,
          0.18,
          22,
          'leather',
        ),
      );
      if (!svgFastMode) {
        for (const wx of [cx - 0.22, cx + 0.38]) {
          quads.push(
            ...makeCylinder3D(
              [wx, wheelY - 0.006, 0.332],
              [wx, wheelY + 0.006, 0.332],
              0.0105,
              charcoalRgb,
              segBolt,
              appAlpha,
              0.22,
              28,
              'leather',
            ),
          );
        }
      }
    }
    for (const sx of [cx - 0.3, cx + 0.46]) {
      quads.push(
        ...makeSubdividedBoxQuads(
          [sx, 0, 0.354],
          [0.024, 0.53, 0.024],
          walnutRgb,
          appAlpha,
          0.26,
          28,
          'wood',
        ),
      );
    }
    const carriageCush = makePipedCushion(
      [cx + 0.08, 0, 0.39],
      [0.76, 0.54, 0.056],
      leatherRgb,
      pipingHex,
      appAlpha,
      svgFastMode,
    );
    quads.push(...carriageCush.quads);
    lines.push(carriageCush.piping);

    const hrLift = effectiveHeadrest === 'up' ? 0.034 : 0.0;
    const headrestCush = makePipedCushion(
      [cx - 0.385, 0, 0.396 + hrLift * 0.5],
      [0.155, 0.235, 0.044 + hrLift],
      leatherRgb,
      pipingHex,
      appAlpha,
      svgFastMode,
    );
    quads.push(...headrestCush.quads);
    lines.push(headrestCush.piping);

    for (const sy of [-0.138, 0.138]) {
      quads.push(
        ...makeCylinder3D(
          [cx - 0.22, sy, 0.39],
          [cx - 0.22, sy, 0.48],
          0.011,
          steelRgb,
          segCyl,
          appAlpha,
          0.58,
          64,
          'chrome',
        ),
        ...makeCylinder3D(
          [cx - 0.22, sy, 0.416],
          [cx - 0.22, sy, 0.424],
          0.0165,
          brassRgb,
          segBolt,
          appAlpha,
          0.62,
          64,
          'brass',
        ),
      );
      const sb = makePipedCushion(
        [cx - 0.195, sy, 0.474],
        [0.068, 0.098, 0.108],
        leatherRgb,
        pipingHex,
        appAlpha,
        svgFastMode,
      );
      quads.push(...sb.quads);
      lines.push(sb.piping);
    }

    if (boxMountedOnReformer && (useLongBox || useShortBox)) {
      const box = makeStudioBoxProp(
        useLongBox ? [cx + 0.06, 0, 0.528] : [cx + 0.08, 0, 0.528],
        useLongBox ? [0.69, 0.395, 0.22] : [0.43, 0.545, 0.22],
        leatherRgb,
        walnutRgb,
        charcoalRgb,
        pipingHex,
        appAlpha,
        svgFastMode,
      );
      quads.push(...box.quads);
      lines.push(box.piping);
      if (useShortBox && !useLongBox && (rig.lFoot[0] > 0.72 || rig.rFoot[0] > 0.72)) {
        quads.push(
          ...makeTorusQuads(
            [0.88, 0, 0.4],
            0.046,
            0.006,
            charcoalRgb,
            appAlpha,
            segTorus,
            tubeSegTorus,
            'X',
            'leather',
          ),
        );
      }
    }
    } // end !dynamicApparatusAsset reformer rigid frame/carriage/boxes

    if (useJumpboard) {
      for (const sy of [-0.19, 0.19]) {
        quads.push(
          ...makeCylinder3D(
            [0.985, sy, 0.31],
            [0.985, sy, 0.44],
            0.012,
            steelRgb,
            segCyl,
            appAlpha,
            0.58,
            64,
            'chrome',
          ),
          ...makeBrassStarKnobQuads([0.996, sy * 1.18, 0.335], 0.015, 0.01, brassRgb, appAlpha),
        );
      }
      quads.push(
        ...makeSubdividedBoxQuads(
          [0.985, 0, 0.6],
          [0.026, 0.54, 0.5],
          oakRgb,
          appAlpha,
          0.25,
          28,
          'wood',
        ),
      );
      const jb = makePipedCushion(
        [0.962, 0, 0.61],
        [0.036, 0.51, 0.46],
        leatherRgb,
        pipingHex,
        appAlpha,
        svgFastMode,
      );
      quads.push(...jb.quads);
      lines.push(jb.piping);
    } else if (!dynamicApparatusAsset && effectiveFootbar !== 'down' && effectiveFootbar !== 'none') {
      const fbZ = effectiveFootbar === 'low' ? 0.48 : effectiveFootbar === 'mid' ? 0.53 : 0.575;
      const fbX = effectiveFootbar === 'low' ? 0.88 : effectiveFootbar === 'mid' ? 0.85 : 0.825;
      for (const sy of [-0.282, 0.282]) {
        quads.push(
          ...makeSubdividedBoxQuads(
            [0.945, sy * 1.03, 0.332],
            [0.068, 0.01, 0.044],
            steelRgb,
            appAlpha,
            0.58,
            64,
            'chrome',
          ),
          ...makeCylinder3D(
            [0.955, sy, 0.335],
            [fbX, sy, fbZ],
            0.013,
            steelRgb,
            segCyl,
            appAlpha,
            0.58,
            64,
            'chrome',
          ),
          ...makeBrassStarKnobQuads([0.955, sy * 1.12, 0.335], 0.016, 0.011, brassRgb, appAlpha),
        );
      }
      quads.push(
        ...makeCylinder3D(
          [fbX, -0.282, fbZ],
          [fbX, 0.282, fbZ],
          0.015,
          steelRgb,
          segCyl,
          appAlpha,
          0.58,
          64,
          'chrome',
        ),
        ...makeCylinder3D(
          [fbX, -0.255, fbZ],
          [fbX, 0.255, fbZ],
          0.022,
          charcoalRgb,
          segCyl,
          appAlpha,
          0.2,
          24,
          'leather',
        ),
      );
    }

    // Color-Coded Helical Springs Hooked to Front Steel Gearbar
    const count = activeSpringColors.length;
    for (let idx = 0; idx < count; idx++) {
      const sy = count === 1 ? 0 : lerp(-0.09, 0.09, idx / (count - 1));
      lines.push({
        pts: makeSpringPolyline([cx + 0.47, sy, 0.335], [0.91, sy, 0.335], 18, 0.0138),
        stroke: activeSpringColors[idx]!,
        width: 2.35,
      });
    }

    // Rear Stainless Risers + Swivel Clevis Yokes + Brass Pulley Sheaves + Double Cotton Loops
    if (!dynamicApparatusAsset) {
    for (const ry of [-0.28, 0.28]) {
      quads.push(
        ...makeCylinder3D(
          [-1.13, ry, 0.35],
          [-1.13, ry, 0.665],
          0.013,
          steelRgb,
          segCyl,
          appAlpha,
          0.58,
          64,
          'chrome',
        ),
        ...makeSubdividedBoxQuads(
          [-1.112, ry, 0.64],
          [0.036, 0.016, 0.022],
          steelRgb,
          appAlpha,
          0.58,
          64,
          'chrome',
        ),
        ...makeSphereQuads(
          [-1.13, ry, 0.672],
          0.016,
          0.016,
          0.012,
          brassRgb,
          segBolt,
          ringsBolt,
          appAlpha,
          0.62,
          0,
          64,
          'brass',
        ),
        ...makeTorusQuads(
          [-1.095, ry, 0.64],
          0.022,
          0.006,
          brassRgb,
          appAlpha,
          segTorus,
          tubeSegTorus,
          'Y',
          'brass',
        ),
        ...makeSphereQuads(
          [-1.095, ry, 0.64],
          0.008,
          0.01,
          0.008,
          steelRgb,
          segBolt,
          ringsBolt,
          appAlpha,
          0.58,
          0,
          64,
          'chrome',
        ),
      );
    }
    }
    if (rig.ropeToFeet) {
      const [negFoot, posFoot] =
        rig.lFoot[1] <= rig.rFoot[1] ? [rig.lFoot, rig.rFoot] : [rig.rFoot, rig.lFoot];
      lines.push({ pts: [[-1.095, -0.275, 0.64], negFoot], stroke: '#4A5852', width: 2.0 });
      lines.push({ pts: [[-1.095, 0.275, 0.64], posFoot], stroke: '#4A5852', width: 2.0 });
      quads.push(
        ...makeTorusQuads(
          negFoot,
          0.036,
          0.0055,
          charcoalRgb,
          appAlpha,
          segTorus,
          tubeSegTorus,
          'Y',
          'fabric',
        ),
        ...makeTorusQuads(
          posFoot,
          0.036,
          0.0055,
          charcoalRgb,
          appAlpha,
          segTorus,
          tubeSegTorus,
          'Y',
          'fabric',
        ),
      );
    } else if (rig.ropeToHands) {
      const [negHand, posHand] =
        rig.lHand[1] <= rig.rHand[1] ? [rig.lHand, rig.rHand] : [rig.rHand, rig.lHand];
      lines.push({ pts: [[-1.095, -0.275, 0.64], negHand], stroke: '#4A5852', width: 2.0 });
      lines.push({ pts: [[-1.095, 0.275, 0.64], posHand], stroke: '#4A5852', width: 2.0 });
      quads.push(
        ...makeTorusQuads(
          negHand,
          0.032,
          0.0055,
          charcoalRgb,
          appAlpha,
          segTorus,
          tubeSegTorus,
          'Y',
          'fabric',
        ),
        ...makeTorusQuads(
          posHand,
          0.032,
          0.0055,
          charcoalRgb,
          appAlpha,
          segTorus,
          tubeSegTorus,
          'Y',
          'fabric',
        ),
      );
    } else {
      lines.push({
        pts: [
          [-1.095, -0.275, 0.64],
          [cx - 0.14, -0.23, 0.425],
        ],
        stroke: '#5C6B64',
        width: 1.6,
      });
      lines.push({
        pts: [
          [-1.095, 0.275, 0.64],
          [cx - 0.14, 0.23, 0.425],
        ],
        stroke: '#5C6B64',
        width: 1.6,
      });
    }
  } else if (apparatus === 'cadillac') {
    shadowAnchors.push({ pos: [0, 0, 0.004], rx: 1.12, ry: 0.38 });

    if (!dynamicApparatusAsset) {
    const bed = makePipedCushion(
      [0, 0, 0.545],
      [2.08, 0.64, 0.066],
      leatherRgb,
      pipingHex,
      appAlpha,
      svgFastMode,
    );
    quads.push(...bed.quads);
    lines.push(bed.piping);
    }

    if (boxMountedOnCadillac && (useLongBox || useShortBox)) {
      const box = makeStudioBoxProp(
        [0, 0, 0.688],
        useLongBox ? [0.69, 0.395, 0.22] : [0.43, 0.545, 0.22],
        leatherRgb,
        walnutRgb,
        charcoalRgb,
        pipingHex,
        appAlpha,
        svgFastMode,
      );
      quads.push(...box.quads);
      lines.push(box.piping);
    }

    if (!dynamicApparatusAsset) {
    // Heavy Oak Trapeze Table Frame + Lower Oak H-Stretcher Rails (z = 0.14)
    for (const sy of [-0.32, 0.32]) {
      quads.push(
        ...makeSubdividedBoxQuads(
          [0, sy, 0.475],
          [2.14, 0.046, 0.094],
          oakRgb,
          appAlpha,
          0.24,
          28,
          'wood',
        ),
        ...makeCylinder3D(
          [-1.04, sy * 0.97, 0.14],
          [1.04, sy * 0.97, 0.14],
          0.018,
          oakRgb,
          segCyl,
          appAlpha,
          0.24,
          28,
          'wood',
        ),
      );
    }
    for (const sx of [-1.05, 1.05]) {
      quads.push(
        ...makeSubdividedBoxQuads(
          [sx, 0, 0.475],
          [0.048, 0.686, 0.094],
          oakRgb,
          appAlpha,
          0.24,
          28,
          'wood',
        ),
        ...makeCylinder3D(
          [sx, -0.31, 0.14],
          [sx, 0.31, 0.14],
          0.018,
          oakRgb,
          segCyl,
          appAlpha,
          0.24,
          28,
          'wood',
        ),
      );
    }

    // 4 Stainless Canopy Uprights + Flanged Brass Corner Castings + Sliding Crossbars
    for (const sx of [-1.05, 1.05]) {
      for (const sy of [-0.31, 0.31]) {
        quads.push(
          ...makeCylinder3D(
            [sx, sy, 0.038],
            [sx, sy, 0.44],
            0.03,
            oakRgb,
            segCyl,
            appAlpha,
            0.24,
            28,
            'wood',
          ),
          ...makeCylinder3D(
            [sx, sy, 0],
            [sx, sy, 0.04],
            0.032,
            brassRgb,
            segCyl,
            appAlpha,
            0.62,
            64,
            'brass',
          ),
          ...makeCylinder3D(
            [sx, sy, 0.51],
            [sx, sy, 1.95],
            0.016,
            steelRgb,
            segCyl,
            appAlpha,
            0.58,
            64,
            'chrome',
          ),
          ...makeSubdividedBoxQuads(
            [sx, sy, 0.515],
            [0.048, 0.048, 0.032],
            brassRgb,
            appAlpha,
            0.62,
            64,
            'brass',
          ),
          ...makeSubdividedBoxQuads(
            [sx, sy, 1.95],
            [0.046, 0.046, 0.046],
            brassRgb,
            appAlpha,
            0.64,
            64,
            'brass',
          ),
        );
      }
    }
    for (const sy of [-0.31, 0.31]) {
      quads.push(
        ...makeCylinder3D(
          [-1.05, sy, 1.95],
          [1.05, sy, 1.95],
          0.015,
          steelRgb,
          segCyl,
          appAlpha,
          0.58,
          64,
          'chrome',
        ),
      );
    }
    for (const sx of [-1.05, 0.18, 0.62, 1.05]) {
      quads.push(
        ...makeCylinder3D(
          [sx, -0.31, 1.95],
          [sx, 0.31, 1.95],
          0.014,
          steelRgb,
          segCyl,
          appAlpha,
          0.58,
          64,
          'chrome',
        ),
      );
      if (sx === 0.18 || sx === 0.62) {
        for (const sy of [-0.31, 0.31]) {
          quads.push(
            ...makeSubdividedBoxQuads(
              [sx, sy, 1.95],
              [0.038, 0.038, 0.038],
              brassRgb,
              appAlpha,
              0.62,
              64,
              'brass',
            ),
          );
        }
      }
    }
    } // end !dynamicApparatusAsset reformer rigid frame/carriage/boxes

    if (useJumpboard) {
      for (const sy of [-0.31, 0.31]) {
        quads.push(
          ...makeSubdividedBoxQuads(
            [-1.05, sy, 0.78],
            [0.044, 0.044, 0.058],
            brassRgb,
            appAlpha,
            0.62,
            64,
            'brass',
          ),
        );
      }
      quads.push(
        ...makeSubdividedBoxQuads(
          [-1.035, 0, 0.78],
          [0.026, 0.58, 0.46],
          oakRgb,
          appAlpha,
          0.25,
          28,
          'wood',
        ),
      );
      const jbCad = makePipedCushion(
        [-1.01, 0, 0.78],
        [0.036, 0.54, 0.42],
        leatherRgb,
        pipingHex,
        appAlpha,
        svgFastMode,
      );
      quads.push(...jbCad.quads);
      lines.push(jbCad.piping);
    }

    // Plush Ivory Sheepskin Fuzzy Hanging Loops
    for (const sy of [-0.19, 0.19]) {
      lines.push({
        pts: [
          [0.18, sy, 1.95],
          [0.18, sy, 1.6],
        ],
        stroke: '#3C4842',
        width: 2.0,
      });
      quads.push(
        ...makeCylinder3D(
          [0.18, sy, 1.44],
          [0.18, sy, 1.6],
          0.027,
          [238, 234, 224],
          segCyl,
          appAlpha,
          0.05,
          16,
          'fabric',
        ),
        ...makeTorusQuads(
          [0.18, sy, 1.42],
          0.032,
          0.007,
          charcoalRgb,
          appAlpha,
          segTorus,
          tubeSegTorus,
          'X',
          'fabric',
        ),
      );
    }

    if (rig.rolldownBar) {
      const [bx, bz] = rig.rolldownBar;
      const anchX = rig.rolldownBarAnchorX ?? 1.05;
      quads.push(
        ...makeCylinder3D(
          [bx, -0.27, bz],
          [bx, 0.27, bz],
          0.017,
          walnutRgb,
          segCyl,
          appAlpha,
          0.28,
          28,
          'wood',
        ),
      );
      for (const sy of [-0.24, 0.24]) {
        quads.push(
          ...makeTorusQuads(
            [bx, sy, bz],
            0.02,
            0.004,
            brassRgb,
            appAlpha,
            segTorus,
            tubeSegTorus,
            'Y',
            'brass',
          ),
        );
        lines.push({
          pts: makeSpringPolyline([anchX, sy, 1.74], [bx, sy, bz], 13),
          stroke: '#D49A24',
          width: 2.2,
        });
      }
    }

    if (rig.pushthroughDeg !== undefined) {
      const rad = (rig.pushthroughDeg * Math.PI) / 180;
      const ex = 0.62 - Math.sin(rad) * 0.66;
      const ez = 1.94 - Math.cos(rad) * 0.66;
      const mx = (0.62 + ex) * 0.5;
      const mz = (1.94 + ez) * 0.5;
      if (!dynamicApparatusAsset) {
      quads.push(
        ...makeCylinder3D(
          [0.62, -0.27, 1.94],
          [ex, -0.27, ez],
          0.013,
          steelRgb,
          segCyl,
          appAlpha,
          0.58,
          64,
          'chrome',
        ),
        ...makeCylinder3D(
          [0.62, 0.27, 1.94],
          [ex, 0.27, ez],
          0.013,
          steelRgb,
          segCyl,
          appAlpha,
          0.58,
          64,
          'chrome',
        ),
        ...makeCylinder3D(
          [mx, -0.27, mz],
          [mx, 0.27, mz],
          0.011,
          steelRgb,
          segCyl,
          appAlpha,
          0.58,
          64,
          'chrome',
        ),
        ...makeCylinder3D(
          [ex, -0.27, ez],
          [ex, 0.27, ez],
          0.014,
          steelRgb,
          segCyl,
          appAlpha,
          0.58,
          64,
          'chrome',
        ),
        ...makeCylinder3D(
          [ex, -0.21, ez],
          [ex, 0.21, ez],
          0.019,
          charcoalRgb,
          segCyl,
          appAlpha,
          0.2,
          24,
          'leather',
        ),
      );
      }
      quads.push(
        // Authentic Overhead Safety Strap on Push-Through Bar
        ...makeCylinder3D(
          [1.05, -0.26, 1.94],
          [ex, -0.26, ez],
          0.005,
          [64, 72, 68],
          svgFastMode ? 6 : 10,
          appAlpha,
          0.05,
          16,
          'fabric',
        ),
      );
      lines.push(
        {
          pts: [
            [1.05, -0.26, 1.94],
            [ex, -0.26, ez],
          ],
          stroke: '#3C4842',
          width: 2.0,
        },
        {
          pts: makeSpringPolyline([1.05, 0, 1.94], [mx, 0, mz], 13),
          stroke: activeSpringColors[0] ?? '#2A6EC4',
          width: 2.3,
        },
      );
    }

    if (rig.legSprings) {
      const [negFoot, posFoot] =
        rig.lFoot[1] <= rig.rFoot[1] ? [rig.lFoot, rig.rFoot] : [rig.rFoot, rig.lFoot];
      for (const [sy, ft] of [
        [-0.24, negFoot],
        [0.24, posFoot],
      ] as const) {
        lines.push({
          pts: makeSpringPolyline([-1.05, sy, 1.54], ft, 15),
          stroke: '#D49A24',
          width: 2.2,
        });
        quads.push(
          ...makeTorusQuads(
            ft,
            0.036,
            0.0055,
            charcoalRgb,
            appAlpha,
            segTorus,
            tubeSegTorus,
            'Y',
            'fabric',
          ),
        );
      }
    } else if (rig.sideLegSpring) {
      const targetFoot = rig.sideLegSpring === 'right' ? rig.rFoot : rig.lFoot;
      const anchorY = rig.sideLegSpring === 'right' ? -0.14 : 0.14;
      lines.push({
        pts: makeSpringPolyline([-1.05, anchorY, 1.48], targetFoot, 15),
        stroke: '#D49A24',
        width: 2.2,
      });
      quads.push(
        ...makeTorusQuads(
          targetFoot,
          0.036,
          0.0055,
          charcoalRgb,
          appAlpha,
          segTorus,
          tubeSegTorus,
          'Y',
          'fabric',
        ),
      );
    }

    if (rig.armSpringsFrom) {
      const [ax, az] = rig.armSpringsFrom;
      const [negHand, posHand] =
        rig.lHand[1] <= rig.rHand[1] ? [rig.lHand, rig.rHand] : [rig.rHand, rig.lHand];
      for (const [sy, hd] of [
        [-0.26, negHand],
        [0.26, posHand],
      ] as const) {
        lines.push({
          pts: makeSpringPolyline([ax, sy, az], hd, 13),
          stroke: '#D49A24',
          width: 2.1,
        });
        quads.push(
          ...makeCylinder3D(
            [hd[0], hd[1] - 0.045, hd[2]],
            [hd[0], hd[1] + 0.045, hd[2]],
            0.011,
            walnutRgb,
            segCyl,
            appAlpha,
            0.28,
            28,
            'wood',
          ),
        );
      }
    }
  } else if (apparatus === 'chair') {
    const cx = -0.1;
    shadowAnchors.push({ pos: [cx, 0, 0.004], rx: 0.48, ry: 0.34 });

    if (!dynamicApparatusAsset) {
    // Open C-Frame Laminated Oak Arch Side Panels + Walnut Base Runners + Tie Dowels
    quads.push(
      ...makeOpenCFramePanelQuads(cx, -0.252, 0.036, oakRgb, appAlpha),
      ...makeOpenCFramePanelQuads(cx, 0.252, 0.036, oakRgb, appAlpha),
      ...makeSubdividedBoxQuads(
        [cx + 0.03, -0.252, 0.021],
        [0.76, 0.054, 0.042],
        walnutRgb,
        appAlpha,
        0.26,
        28,
        'wood',
      ),
      ...makeSubdividedBoxQuads(
        [cx + 0.03, 0.252, 0.021],
        [0.76, 0.054, 0.042],
        walnutRgb,
        appAlpha,
        0.26,
        28,
        'wood',
      ),
      ...makeCylinder3D(
        [cx + 0.34, -0.25, 0.055],
        [cx + 0.34, 0.25, 0.055],
        0.016,
        oakRgb,
        segCyl,
        appAlpha,
        0.24,
        28,
        'wood',
      ),
      ...makeCylinder3D(
        [cx - 0.28, -0.25, 0.08],
        [cx - 0.28, 0.25, 0.08],
        0.016,
        oakRgb,
        segCyl,
        appAlpha,
        0.24,
        28,
        'wood',
      ),
    );

    // Internal Vertical Steel Spring Cactus Tree Post with 4 Brass Hook Bars
    quads.push(
      ...makeCylinder3D(
        [cx - 0.24, 0, 0.06],
        [cx - 0.24, 0, 0.5],
        0.016,
        steelRgb,
        segCyl,
        appAlpha,
        0.58,
        64,
        'chrome',
      ),
    );
    for (const hz of [0.26, 0.33, 0.4, 0.47]) {
      quads.push(
        ...makeCylinder3D(
          [cx - 0.24, -0.09, hz],
          [cx - 0.24, 0.09, hz],
          0.0065,
          brassRgb,
          segCyl,
          appAlpha,
          0.62,
          64,
          'brass',
        ),
      );
    }

    const seat = makePipedCushion(
      [cx - 0.03, 0, 0.58],
      [0.58, 0.55, 0.062],
      leatherRgb,
      pipingHex,
      appAlpha,
      svgFastMode,
    );
    quads.push(...seat.quads);
    lines.push(seat.piping);
    }

    // Split-Pedal Walnut Arms + Charcoal Padded Crossbars + Central Brass Split-Pedal Lock Dowel
    const pdeg = rig.pedalDeg ?? 22;
    const lDeg = rig.lPedalDeg ?? pdeg;
    const rDeg = rig.rPedalDeg ?? pdeg;
    const lRad = (lDeg * Math.PI) / 180;
    const rRad = (rDeg * Math.PI) / 180;
    const lPx = cx - 0.1 + Math.cos(lRad) * 0.54;
    const lPz = 0.088 + Math.sin(lRad) * 0.54;
    const rPx = cx - 0.1 + Math.cos(rRad) * 0.54;
    const rPz = 0.088 + Math.sin(rRad) * 0.54;
    if (!dynamicApparatusAsset) {
    for (const [py, pxSide, pzSide] of [
      [-0.105, lPx, lPz],
      [0.105, rPx, rPz],
    ] as const) {
      quads.push(
        ...makeCylinder3D(
          [cx - 0.1, py, 0.088],
          [pxSide, py, pzSide],
          0.021,
          walnutRgb,
          segCyl,
          appAlpha,
          0.28,
          28,
          'wood',
        ),
        ...makeCylinder3D(
          [pxSide, py - 0.085, pzSide + 0.022],
          [pxSide, py + 0.085, pzSide + 0.022],
          0.022,
          charcoalRgb,
          segCyl,
          appAlpha,
          0.2,
          24,
          'leather',
        ),
      );
    }
    if (Math.abs(lDeg - rDeg) < 1.0) {
      quads.push(
        ...makeCylinder3D(
          [rPx, -0.045, rPz + 0.012],
          [rPx, 0.045, rPz + 0.012],
          0.01,
          brassRgb,
          segCyl,
          appAlpha,
          0.62,
          64,
          'brass',
        ),
      );
    }
    }

    lines.push(
      {
        pts: makeSpringPolyline(
          [cx - 0.24, -0.075, 0.4],
          [(cx - 0.1 + lPx) * 0.56, -0.075, (0.08 + lPz) * 0.56],
          12,
        ),
        stroke: activeSpringColors[0] ?? '#C9382B',
        width: 2.3,
      },
      {
        pts: makeSpringPolyline(
          [cx - 0.24, 0.075, 0.33],
          [(cx - 0.1 + rPx) * 0.56, 0.075, (0.08 + rPz) * 0.56],
          12,
        ),
        stroke: activeSpringColors[1] ?? '#2A6EC4',
        width: 2.3,
      },
    );

    if (rig.withChairHandles) {
      for (const sy of [-0.286, 0.286]) {
        quads.push(
          ...makeSubdividedBoxQuads(
            [cx - 0.04, sy, 0.3],
            [0.046, 0.036, 0.16],
            steelRgb,
            appAlpha,
            0.58,
            64,
            'chrome',
          ),
          ...makeBrassStarKnobQuads([cx - 0.04, sy * 1.11, 0.3], 0.017, 0.012, brassRgb, appAlpha),
          ...makeCylinder3D(
            [cx - 0.04, sy, 0.22],
            [cx - 0.04, sy, 1.24],
            0.014,
            steelRgb,
            segCyl,
            appAlpha,
            0.58,
            64,
            'chrome',
          ),
          ...makeCylinder3D(
            [cx - 0.04, sy, 1.24],
            [cx + 0.02, sy, 1.265],
            0.014,
            steelRgb,
            segCyl,
            appAlpha,
            0.58,
            64,
            'chrome',
          ),
          ...makeCylinder3D(
            [cx + 0.01, sy, 1.26],
            [cx + 0.13, sy, 1.28],
            0.021,
            charcoalRgb,
            segCyl,
            appAlpha,
            0.2,
            24,
            'leather',
          ),
        );
      }
    }
  } else if (apparatus === 'barrel') {
    if (rig.isSpineCorrector) {
      shadowAnchors.push({ pos: [0.04, 0, 0.004], rx: 0.56, ry: 0.3 });
      if (!dynamicApparatusAsset) {
      quads.push(
        ...makeBarrelArchVaultQuads(
          [-0.16, 0, 0.03],
          0.34,
          0.48,
          0.056,
          118,
          leatherRgb,
          oakRgb,
          appAlpha,
          segVault,
        ),
      );
      const stepSeat = makePipedCushion(
        [0.22, 0, 0.14],
        [0.38, 0.48, 0.14],
        leatherRgb,
        pipingHex,
        appAlpha,
        svgFastMode,
      );
      quads.push(...stepSeat.quads);
      lines.push(stepSeat.piping);
      for (const sy of [-0.232, 0.232]) {
        quads.push(
          ...makeSubdividedBoxQuads(
            [0.04, sy, 0.038],
            [0.78, 0.034, 0.076],
            oakRgb,
            appAlpha,
            0.24,
            28,
            'wood',
          ),
          ...makeBrassStarKnobQuads([-0.16, sy * 1.12, 0.16], 0.016, 0.012, brassRgb, appAlpha),
        );
      }
      for (const sx of [-0.3, 0.38]) {
        quads.push(
          ...makeCylinder3D(
            [sx, -0.22, 0.032],
            [sx, 0.22, 0.032],
            0.014,
            oakRgb,
            segCyl,
            appAlpha,
            0.24,
            28,
            'wood',
          ),
        );
      }
      }
    } else {
      shadowAnchors.push({ pos: [0.06, 0, 0.004], rx: 0.68, ry: 0.34 });
      if (!dynamicApparatusAsset) {
      quads.push(
        ...makeBarrelArchVaultQuads(
          [-0.3, 0, 0.55],
          0.33,
          0.56,
          0.064,
          148,
          leatherRgb,
          oakRgb,
          appAlpha,
          segVault,
        ),
      );
      // Whaleback French piping along left & right barrel arch edges
      const halfArc = (74 * Math.PI) / 180;
      for (const sy of [-0.275, 0.275]) {
        const archPts: Vec3[] = [];
        for (let i = 0; i <= 14; i++) {
          const a = -halfArc + (2 * halfArc * i) / 14;
          archPts.push([-0.3 + Math.sin(a) * 0.333, sy, 0.55 + Math.cos(a) * 0.333]);
        }
        lines.push({ pts: archPts, stroke: pipingHex, width: 1.4, depthBias: -0.02 });
        quads.push(
          ...makeSubdividedBoxQuads(
            [0.08, sy, 0.03],
            [1.12, 0.052, 0.058],
            oakRgb,
            appAlpha,
            0.24,
            28,
            'wood',
          ),
          ...makeBrassStarKnobQuads([-0.28, sy * 1.13, 0.045], 0.019, 0.014, brassRgb, appAlpha),
          ...makeCylinder3D(
            [0.52, sy, 0.04],
            [0.48, sy, 1.03],
            0.025,
            walnutRgb,
            segCyl,
            appAlpha,
            0.28,
            28,
            'wood',
          ),
          ...makeSphereQuads(
            [0.48, sy, 1.038],
            0.027,
            0.027,
            0.014,
            brassRgb,
            segBolt,
            ringsBolt,
            appAlpha,
            0.62,
            0,
            64,
            'brass',
          ),
        );
      }
      // Lower Oak Cross-Stretchers + 5 Turned Oak Ladder Rungs
      for (const sx of [-0.42, 0.5]) {
        quads.push(
          ...makeCylinder3D(
            [sx, -0.27, 0.03],
            [sx, 0.27, 0.03],
            0.018,
            oakRgb,
            segCyl,
            appAlpha,
            0.24,
            28,
            'wood',
          ),
        );
      }
      for (const rz of [0.22, 0.4, 0.58, 0.76, 0.94]) {
        const rx = 0.52 - (rz - 0.04) * 0.04;
        quads.push(
          ...makeCylinder3D(
            [rx, -0.28, rz],
            [rx, 0.28, rz],
            0.016,
            oakRgb,
            segCyl,
            appAlpha,
            0.26,
            28,
            'wood',
          ),
        );
      }
      }
    }
  } else {
    shadowAnchors.push({ pos: [0, 0, 0.004], rx: 1.08, ry: 0.44 });
    if (!dynamicApparatusAsset) {
    // Non-overlapping cork perimeter border around the upholstered studio mat (zero coplanar Z-fighting)
    for (const sy of [-0.37, 0.37]) {
      quads.push(
        ...makeSubdividedBoxQuads(
          [0, sy, 0.015],
          [2.06, 0.06, 0.026],
          corkRgb,
          appAlpha,
          0.18,
          24,
          'wood',
        ),
      );
    }
    for (const sx of [-0.995, 0.995]) {
      quads.push(
        ...makeSubdividedBoxQuads(
          [sx, 0, 0.015],
          [0.07, 0.68, 0.026],
          corkRgb,
          appAlpha,
          0.18,
          24,
          'wood',
        ),
      );
    }
    const matCush = makePipedCushion(
      [0, 0, 0.028],
      [1.92, 0.68, 0.034],
      leatherRgb,
      pipingHex,
      appAlpha,
      svgFastMode,
    );
    quads.push(...matCush.quads);
    lines.push(matCush.piping);
    lines.push({
      pts: [
        [-0.84, 0, 0.057],
        [0.84, 0, 0.057],
      ],
      stroke: pipingHex,
      width: 1.2,
      depthBias: -0.11,
    });
    for (const ey of [-0.22, 0.22]) {
      quads.push(
        ...makeTorusQuads(
          [-0.89, ey, 0.048],
          0.013,
          0.0038,
          brassRgb,
          appAlpha,
          segTorus,
          tubeSegTorus,
          'Z',
          'brass',
        ),
      );
    }
    }
  }

  // Orthonormal Spine & Cranial Basis + 2-Bone Analytical Limb IK (solved ahead of props for exact contact alignment)
  const {
    spUp,
    antN,
    bodyRight,
    lHip,
    rHip,
    lSh,
    rSh,
    lKnee,
    lAnkle,
    lKneeBend,
    rKnee,
    rAnkle,
    rKneeBend,
    lElb,
    lWr,
    lElbowBend,
    rElb,
    rWr,
    rElbowBend,
  } = resolveStudio3DBody(rig);

  // Optional High-Craft 3D Studio Props Across All 5 Apparatuses (Zero-Float, Zero-Clip Grounding)
  if ((useLongBox || useShortBox) && !boxMountedOnReformer && !boxMountedOnCadillac) {
    const boxDims: Vec3 = useLongBox ? [0.68, 0.38, 0.22] : [0.43, 0.52, 0.22];
    const boxPos: Vec3 = [
      apparatus === 'barrel' ? -0.06 : -0.18,
      -0.66 * mirrorSign,
      boxDims[2] * 0.5,
    ];
    const floorBox = makeStudioBoxProp(
      boxPos,
      boxDims,
      leatherRgb,
      walnutRgb,
      charcoalRgb,
      pipingHex,
      appAlpha,
      svgFastMode,
    );
    quads.push(...floorBox.quads);
    lines.push(floorBox.piping);
    shadowAnchors.push({
      pos: [boxPos[0], boxPos[1], 0.004],
      rx: boxDims[0] * 0.56,
      ry: boxDims[1] * 0.56,
    });
  }

  if (useJumpboard && apparatus !== 'reformer' && apparatus !== 'cadillac') {
    const jbX = apparatus === 'chair' ? -0.64 : -0.7;
    const jbY = -0.62 * mirrorSign;
    quads.push(
      ...makeSubdividedBoxQuads(
        [jbX, jbY, 0.018],
        [0.18, 0.56, 0.036],
        walnutRgb,
        appAlpha,
        0.26,
        28,
        'wood',
      ),
      ...makeCylinder3D(
        [jbX + 0.012, jbY - 0.18, 0.036],
        [jbX + 0.012, jbY - 0.18, 0.14],
        0.011,
        steelRgb,
        segCyl,
        appAlpha,
        0.58,
        64,
        'chrome',
      ),
      ...makeCylinder3D(
        [jbX + 0.012, jbY + 0.18, 0.036],
        [jbX + 0.012, jbY + 0.18, 0.14],
        0.011,
        steelRgb,
        segCyl,
        appAlpha,
        0.58,
        64,
        'chrome',
      ),
      ...makeSubdividedBoxQuads(
        [jbX + 0.014, jbY, 0.28],
        [0.026, 0.52, 0.44],
        oakRgb,
        appAlpha,
        0.25,
        28,
        'wood',
      ),
    );
    const jbStandPad = makePipedCushion(
      [jbX - 0.012, jbY, 0.28],
      [0.034, 0.49, 0.41],
      leatherRgb,
      pipingHex,
      appAlpha,
      svgFastMode,
    );
    quads.push(...jbStandPad.quads);
    lines.push(jbStandPad.piping);
    shadowAnchors.push({ pos: [jbX, jbY, 0.004], rx: 0.15, ry: 0.3 });
  }

  const handSpan = len3(sub3(rig.lHand, rig.rHand));
  const handMid = vlerp(rig.lHand, rig.rHand, 0.5);
  const footSpan = len3(sub3(rig.lFoot, rig.rFoot));
  const footMid = vlerp(rig.lFoot, rig.rFoot, 0.5);
  const kneeSpan = len3(sub3(lKnee, rKnee));
  const kneeMid = vlerp(lKnee, rKnee, 0.5);

  if (useRing) {
    const surfaceZ =
      apparatus === 'reformer' ? 0.425 : apparatus === 'cadillac' ? 0.585 : 0.055;
    if (
      !rig.ropeToHands &&
      !rig.rolldownBar &&
      handSpan >= 0.22 &&
      handSpan <= 0.44 &&
      Math.abs(rig.lHand[0] - rig.rHand[0]) < 0.12 &&
      Math.abs(rig.lHand[2] - rig.rHand[2]) < 0.12 &&
      handMid[2] >= 0.34
    ) {
      const majorR = Math.max(0.135, Math.min(0.17, handSpan * 0.5));
      quads.push(
        ...makeMagicCircle3D(
          handMid,
          majorR,
          'X',
          steelRgb,
          charcoalRgb,
          brassRgb,
          appAlpha,
          svgFastMode,
        ),
      );
    } else if (
      !rig.ropeToFeet &&
      footSpan >= 0.18 &&
      footSpan <= 0.44 &&
      Math.abs(rig.lFoot[0] - rig.rFoot[0]) < 0.12 &&
      footMid[2] >= surfaceZ + 0.22
    ) {
      const ankleMid = vlerp(lAnkle, rAnkle, 0.5);
      const majorR = Math.max(0.13, Math.min(0.165, footSpan * 0.5));
      quads.push(
        ...makeMagicCircle3D(
          [ankleMid[0], ankleMid[1], Math.max(ankleMid[2], surfaceZ + majorR + 0.01)],
          majorR,
          'X',
          steelRgb,
          charcoalRgb,
          brassRgb,
          appAlpha,
          svgFastMode,
        ),
      );
    } else if (
      kneeSpan >= 0.17 &&
      kneeSpan <= 0.38 &&
      Math.abs(lKnee[0] - rKnee[0]) < 0.1 &&
      Math.min(lKnee[2], rKnee[2]) >= surfaceZ + 0.08
    ) {
      const majorR = Math.max(0.115, Math.min(0.155, kneeSpan * 0.5));
      quads.push(
        ...makeMagicCircle3D(
          [kneeMid[0], kneeMid[1], Math.max(kneeMid[2], surfaceZ + majorR + 0.012)],
          majorR,
          'X',
          steelRgb,
          charcoalRgb,
          brassRgb,
          appAlpha,
          svgFastMode,
        ),
      );
    } else {
      const floorRingPos: Vec3 = [0.46, 0.58 * mirrorSign, 0.015];
      quads.push(
        ...makeMagicCircle3D(
          floorRingPos,
          0.165,
          'Z',
          steelRgb,
          charcoalRgb,
          brassRgb,
          appAlpha,
          svgFastMode,
        ),
      );
      shadowAnchors.push({
        pos: [floorRingPos[0], floorRingPos[1], 0.004],
        rx: 0.19,
        ry: 0.19,
      });
    }
  }

  if (useRoller) {
    const rollerRgb: Rgb = isClay ? [184, 180, 174] : [74, 114, 96];
    const rollerRadius = 0.068;
    const onSpine = apparatus === 'mat' && Boolean(rig.withFoamRollerUnderSpine);
    const rX0 = onSpine ? -0.62 : -0.44;
    const rX1 = onSpine ? 0.28 : 0.44;
    const rY = onSpine ? 0 : (apparatus === 'mat' ? -0.54 : -0.58) * mirrorSign;
    const rZ = onSpine ? 0.113 : rollerRadius;
    quads.push(
      ...makeTaperedTubeQuads(
        [
          [rX0, rY, rZ],
          [(rX0 + rX1) * 0.5, rY, rZ],
          [rX1, rY, rZ],
        ],
        [
          [rollerRadius, rollerRadius],
          [rollerRadius, rollerRadius],
          [rollerRadius, rollerRadius],
        ],
        rollerRgb,
        svgFastMode ? 12 : 20,
        appAlpha,
        0.18,
        0,
        24,
        [0, 0, 1],
        0.008,
        0.008,
        'leather',
      ),
      ...makeSphereQuads(
        [rX0 - 0.003, rY, rZ],
        0.006,
        0.054,
        0.054,
        [235, 230, 220],
        svgFastMode ? 10 : 16,
        6,
        appAlpha,
        0.18,
        0,
        24,
        'leather',
      ),
      ...makeSphereQuads(
        [rX1 + 0.003, rY, rZ],
        0.006,
        0.054,
        0.054,
        [235, 230, 220],
        svgFastMode ? 10 : 16,
        6,
        appAlpha,
        0.18,
        0,
        24,
        'leather',
      ),
    );
    if (!onSpine) {
      shadowAnchors.push({ pos: [(rX0 + rX1) * 0.5, rY, 0.004], rx: 0.48, ry: 0.085 });
    }
  }

  if (useMiniBall) {
    const miniBallRgb: Rgb = isClay
      ? [188, 185, 178]
      : shader === 'studio-pbr'
        ? [114, 154, 134]
        : [68, 118, 98];
    const surfaceZ =
      apparatus === 'reformer' ? 0.425 : apparatus === 'cadillac' ? 0.585 : 0.055;
    let ballPos: Vec3;
    let ballR = 0.095;
    if (
      !rig.ropeToHands &&
      !rig.rolldownBar &&
      handSpan >= 0.14 &&
      handSpan <= 0.34 &&
      Math.abs(rig.lHand[0] - rig.rHand[0]) < 0.1 &&
      handMid[2] >= 0.44
    ) {
      ballR = Math.max(0.076, Math.min(0.096, handSpan * 0.52));
      ballPos = handMid;
    } else if (
      kneeSpan >= 0.13 &&
      kneeSpan <= 0.28 &&
      Math.abs(lKnee[0] - rKnee[0]) < 0.08 &&
      Math.min(lKnee[2], rKnee[2]) >= surfaceZ + 0.07
    ) {
      ballR = Math.max(0.072, Math.min(0.095, kneeSpan * 0.52));
      ballPos = kneeMid;
    } else {
      ballPos = [0.54, 0.56 * mirrorSign, ballR];
      shadowAnchors.push({ pos: [ballPos[0], ballPos[1], 0.004], rx: 0.11, ry: 0.11 });
    }
    quads.push(
      ...makeSphereQuads(
        ballPos,
        ballR,
        ballR,
        ballR,
        miniBallRgb,
        segSphere,
        ringsSphere,
        appAlpha,
        0.14,
        0,
        22,
        'leather',
      ),
    );
  }

  if (propOverride !== 'none' && (rig.withDumbbells || exercise.props.includes('dumbbell'))) {
    for (const handPt of [rig.lHand, rig.rHand]) {
      quads.push(
        ...makeCylinder3D(
          [handPt[0], handPt[1] - 0.065, handPt[2]],
          [handPt[0], handPt[1] + 0.065, handPt[2]],
          0.01,
          steelRgb,
          segCyl,
          appAlpha,
          0.58,
          64,
          'chrome',
        ),
        ...makeHexPrismBellQuads(
          handPt[0],
          handPt[1] - 0.084,
          handPt[1] - 0.052,
          handPt[2],
          0.034,
          charcoalRgb,
          appAlpha,
        ),
        ...makeHexPrismBellQuads(
          handPt[0],
          handPt[1] + 0.052,
          handPt[1] + 0.084,
          handPt[2],
          0.034,
          charcoalRgb,
          appAlpha,
        ),
      );
    }
  }
  if (propOverride !== 'none' && (rig.withTheraband || exercise.props.includes('theraband'))) {
    lines.push({
      pts: [rig.lHand, [rig.lFoot[0] + 0.03, rig.lFoot[1], rig.lFoot[2]], footMid],
      stroke: isClay ? '#8F9690' : '#2F855A',
      width: 3.4,
    });
    lines.push({
      pts: [footMid, [rig.rFoot[0] + 0.03, rig.rFoot[1], rig.rFoot[2]], rig.rHand],
      stroke: isClay ? '#8F9690' : '#2F855A',
      width: 3.4,
    });
  }

  // 2. Editorial 7.5-Head Korean Pilates Instructor (Hourglass Wrap Set + Clavicle Yoke + Swan Neck + High-Res Continuous Limbs)
  const cropTopBaseRgb: Rgb = isClay
    ? [218, 214, 206]
    : shader === 'biomech-xray'
      ? [66, 178, 148]
      : [72, 108, 90];
  const leggingRgb: Rgb = isClay
    ? [206, 202, 194]
    : shader === 'biomech-xray'
      ? [54, 158, 130]
      : [44, 74, 62];
  const pipingTrimRgb: Rgb = isClay ? [232, 229, 222] : [242, 237, 226];
  const sockCol: Rgb = isClay ? [218, 215, 208] : [244, 240, 231];
  const skinRgb: Rgb = isClay
    ? [226, 222, 215]
    : shader === 'biomech-xray'
      ? [125, 212, 188]
      : [246, 214, 195];
  const hairCol: Rgb = isClay ? [168, 164, 158] : [56, 38, 30];
  const ribbonAccentRgb: Rgb = isClay ? [210, 206, 198] : [96, 128, 108];
  const coralRgb: Rgb = MOTION_STUDIO_RGB.primaryMuscle;
  const bodyAlpha = shader === 'biomech-xray' ? 0.44 : 1.0;

  // Subtle thoracic breathing expansion
  const breathScale = 1 + 0.022 * Math.sin(phaseT * Math.PI);
  const spPts = [0, 0.14, 0.28, 0.44, 0.6, 0.76, 0.9, 1.0].map((u) =>
    bezier3(rig.pelvis, rig.spineMid, rig.chest, u),
  );
  const coreActive =
    rig.activeZones.includes('core') ||
    rig.activeZones.includes('obliques') ||
    rig.activeZones.includes('back');
  const glutesActive = rig.activeZones.includes('glutes');
  const shoulderActive = rig.activeZones.includes('shoulders');
  const activePulse = Math.max(0.28, smoothstep(phaseT));
  const cropTopTone: Rgb =
    !isClay && coreActive && (phaseT > 0.18 || showBiomechOverlay)
      ? [
          lerp(cropTopBaseRgb[0], coralRgb[0], activePulse * 0.36),
          lerp(cropTopBaseRgb[1], coralRgb[1], activePulse * 0.3),
          lerp(cropTopBaseRgb[2], coralRgb[2], activePulse * 0.26),
        ]
      : cropTopBaseRgb;
  const pelvisTone: Rgb =
    !isClay && (glutesActive || rig.activeZones.includes('core')) && (phaseT > 0.18 || showBiomechOverlay)
      ? [
          lerp(leggingRgb[0], coralRgb[0], activePulse * (glutesActive ? 0.34 : 0.18)),
          lerp(leggingRgb[1], coralRgb[1], activePulse * (glutesActive ? 0.3 : 0.16)),
          lerp(leggingRgb[2], coralRgb[2], activePulse * (glutesActive ? 0.24 : 0.12)),
        ]
      : leggingRgb;
  const cropTopSeamRgb: Rgb = [
    Math.min(255, Math.round(cropTopTone[0] * 1.18 + 12)),
    Math.min(255, Math.round(cropTopTone[1] * 1.16 + 12)),
    Math.min(255, Math.round(cropTopTone[2] * 1.16 + 10)),
  ];
  const leggingBandRgb: Rgb = [
    Math.max(0, Math.round(pelvisTone[0] * 0.88)),
    Math.max(0, Math.round(pelvisTone[1] * 0.9)),
    Math.max(0, Math.round(pelvisTone[2] * 0.92)),
  ];

  const spineFrame = (uClamped: number): { pt: Vec3; rAx: Vec3; fAx: Vec3; tan: Vec3 } => {
    const uc = Math.max(0, Math.min(1, uClamped));
    let pt = bezier3(rig.pelvis, rig.spineMid, rig.chest, uc);
    const tan = bezier3Tan(rig.pelvis, rig.spineMid, rig.chest, uc);
    if (uClamped < 0) {
      pt = add3(rig.pelvis, mul3(tan, uClamped * 0.42));
    } else if (uClamped > 1) {
      pt = add3(rig.chest, mul3(tan, (uClamped - 1) * 0.42));
    }
    const crossAxis = rig.pelvisRight ? vlerp(rig.pelvisRight, bodyRight, uc) : bodyRight;
    let rProj = sub3(crossAxis, mul3(tan, dot3(crossAxis, tan)));
    if (len3(rProj) < 1e-4) rProj = cross3(tan, antN);
    const rAx = norm3(rProj);
    let fAx = norm3(cross3(rAx, tan));
    if (dot3(fAx, antN) < 0) fAx = mul3(fAx, -1);
    return { pt, rAx, fAx, tan };
  };

  // Compute cervical neck & head frame first so the unified 28-station torso+neck loft flows seamlessly into the skull base
  const spTan = bezier3Tan(rig.pelvis, rig.spineMid, rig.chest, 1.0);
  let neckUp: Vec3 =
    antN[2] > 0.35 && spTan[2] < 0.02
      ? norm3([spTan[0], spTan[1], Math.max(-0.02, spTan[2] * 0.15)])
      : norm3(add3(mul3(spUp, 0.35), mul3(spTan, 0.65)));
  let headAntProj = sub3(antN, mul3(neckUp, dot3(antN, neckUp)));
  let headAnt: Vec3 =
    len3(headAntProj) > 1e-4 ? norm3(headAntProj) : norm3(cross3(bodyRight, neckUp));
  const rawHeadPos = add3(rig.chest, add3(mul3(neckUp, 0.158), mul3(headAnt, 0.012)));
  const headPos: Vec3 =
    rawHeadPos[2] < 0.115 ? [rawHeadPos[0], rawHeadPos[1], 0.115] : rawHeadPos;
  if (rawHeadPos[2] < 0.115) {
    neckUp = norm3(sub3(sub3(headPos, mul3(headAnt, 0.012)), rig.chest));
    headAntProj = sub3(antN, mul3(neckUp, dot3(antN, neckUp)));
    if (len3(headAntProj) > 1e-4) headAnt = norm3(headAntProj);
  }
  const yokeTopFrame = spineFrame(1.032);
  const neckEnd = sub3(headPos, add3(mul3(neckUp, 0.016), mul3(headAnt, 0.01)));

  // Prefer real 21-bone Blender skinned humanoid GLB when loaded in browser (non-SVG mode);
  // gracefully fall back to the seamless 28-station procedural body in SSR/jsdom or before load.
  const skinnedHumanoidAsset = !svgFastMode ? getCachedSkinnedHumanoidAsset() : null;
  const characterPipeline: Studio3DCharacterPipeline = skinnedHumanoidAsset
    ? 'skinned-glb'
    : 'procedural';

  if (skinnedHumanoidAsset) {
    const skinnedQuads = skinHumanoidToStudioQuads(
      skinnedHumanoidAsset,
      {
        pelvis: rig.pelvis,
        spineMid: rig.spineMid,
        chest: rig.chest,
        headPos,
        headAnt,
        neckUp,
        bodyRight,
        pelvisRight: rig.pelvisRight ?? bodyRight,
        lSh,
        lElb,
        lWr,
        rSh,
        rElb,
        rWr,
        lHip,
        lKnee,
        lAnkle,
        rHip,
        rKnee,
        rAnkle,
        lKneeBend,
        rKneeBend,
        lElbowBend,
        rElbowBend,
        breathScale,
      },
      {
        shader,
        activeZones: rig.activeZones,
        phaseT,
        showBiomechOverlay,
        showMuscleHeatmap,
      },
    );
    for (let sqi = 0; sqi < skinnedQuads.length; sqi++) {
      quads.push(skinnedQuads[sqi]!);
    }
  } else {
  // 2A) Unified Single Continuous 28-Station Torso + Neck Loft Mesh (ZERO seams across leggings, midriff, crop top, clavicles & neck!)
  type UnifiedTorsoStationSpec =
    | {
        readonly kind: 'pelvis';
        readonly u: number;
        readonly rx: number;
        readonly ryF: number;
        readonly ryB: number;
        readonly gluteCleft: number;
      }
    | {
        readonly kind: 'midriff';
        readonly u: number;
        readonly rx: number;
        readonly ry: number;
        readonly lordosis: number;
      }
    | {
        readonly kind: 'top';
        readonly u: number;
        readonly rx: number;
        readonly ryF: number;
        readonly ryB: number;
        readonly bustBoost: number;
        readonly scapRelief: number;
      }
    | {
        readonly kind: 'clavicle';
        readonly u: number;
        readonly rx: number;
        readonly ryF: number;
        readonly ryB: number;
        readonly clavRelief: number;
        readonly notchDepth: number;
      }
    | {
        readonly kind: 'neck';
        readonly uNeck: number;
        readonly rx: number;
        readonly ryF: number;
        readonly ryB: number;
      };

  const unifiedTorsoNeckSpecs: readonly UnifiedTorsoStationSpec[] = [
    // 0..7 (8 stations): Pelvis & High-Waisted Sculpted Leggings
    { kind: 'pelvis', u: -0.105, rx: 0.102, ryF: 0.068, ryB: 0.072, gluteCleft: 0.005 },
    { kind: 'pelvis', u: -0.025, rx: 0.132, ryF: 0.079, ryB: 0.094, gluteCleft: 0.01 },
    { kind: 'pelvis', u: 0.055, rx: 0.141, ryF: 0.083, ryB: 0.103, gluteCleft: 0.011 },
    { kind: 'pelvis', u: 0.14, rx: 0.136, ryF: 0.081, ryB: 0.099, gluteCleft: 0.008 },
    { kind: 'pelvis', u: 0.22, rx: 0.125, ryF: 0.077, ryB: 0.089, gluteCleft: 0.004 },
    { kind: 'pelvis', u: 0.29, rx: 0.111, ryF: 0.073, ryB: 0.08, gluteCleft: 0.001 },
    { kind: 'pelvis', u: 0.35, rx: 0.101, ryF: 0.07, ryB: 0.073, gluteCleft: 0.0 },
    { kind: 'pelvis', u: 0.398, rx: 0.098, ryF: 0.068, ryB: 0.071, gluteCleft: 0.0 },
    // 8..12 (5 stations): Waistband Hem Transition -> Toned Hourglass Midriff
    { kind: 'midriff', u: 0.405, rx: 0.095 * breathScale, ry: 0.066 * breathScale, lordosis: 0.003 },
    { kind: 'midriff', u: 0.435, rx: 0.094 * breathScale, ry: 0.066 * breathScale, lordosis: 0.0045 },
    { kind: 'midriff', u: 0.472, rx: 0.097 * breathScale, ry: 0.068 * breathScale, lordosis: 0.003 },
    { kind: 'midriff', u: 0.508, rx: 0.102 * breathScale, ry: 0.072 * breathScale, lordosis: 0.0012 },
    { kind: 'midriff', u: 0.526, rx: 0.106 * breathScale, ry: 0.074 * breathScale, lordosis: 0.0 },
    // 13..19 (7 stations): Ivory Underbust Trim -> Botanical Sage Scoop-Neck Crop Top
    { kind: 'top', u: 0.538, rx: 0.109 * breathScale, ryF: 0.078 * breathScale, ryB: 0.076 * breathScale, bustBoost: 0.002, scapRelief: 0.001 },
    { kind: 'top', u: 0.585, rx: 0.116 * breathScale, ryF: 0.089 * breathScale, ryB: 0.079 * breathScale, bustBoost: 0.01, scapRelief: 0.002 },
    { kind: 'top', u: 0.648, rx: 0.123 * breathScale, ryF: 0.098 * breathScale, ryB: 0.082 * breathScale, bustBoost: 0.017, scapRelief: 0.0035 },
    { kind: 'top', u: 0.715, rx: 0.129 * breathScale, ryF: 0.101 * breathScale, ryB: 0.084 * breathScale, bustBoost: 0.018, scapRelief: 0.005 },
    { kind: 'top', u: 0.782, rx: 0.134 * breathScale, ryF: 0.093 * breathScale, ryB: 0.083 * breathScale, bustBoost: 0.011, scapRelief: 0.005 },
    { kind: 'top', u: 0.834, rx: 0.135, ryF: 0.085, ryB: 0.081, bustBoost: 0.004, scapRelief: 0.004 },
    { kind: 'top', u: 0.87, rx: 0.134, ryF: 0.079, ryB: 0.078, bustBoost: 0.0, scapRelief: 0.0025 },
    // 20..22 (3 stations): Exposed Upper Thoracic, Delicate Clavicles & Smooth Trapezius Shoulder Yoke
    { kind: 'clavicle', u: 0.915, rx: 0.141, ryF: 0.076, ryB: 0.075, clavRelief: 0.0034, notchDepth: 0.0024 },
    { kind: 'clavicle', u: 0.975, rx: 0.144, ryF: 0.071, ryB: 0.072, clavRelief: 0.0044, notchDepth: 0.0038 },
    { kind: 'clavicle', u: 1.032, rx: 0.094, ryF: 0.055, ryB: 0.057, clavRelief: 0.0018, notchDepth: 0.0022 },
    // 23..27 (5 stations): Continuous Graceful Swan Neck seamlessly rising into Skull Base
    { kind: 'neck', uNeck: 0.16, rx: 0.052, ryF: 0.045, ryB: 0.047 },
    { kind: 'neck', uNeck: 0.38, rx: 0.039, ryF: 0.038, ryB: 0.04 },
    { kind: 'neck', uNeck: 0.62, rx: 0.036, ryF: 0.036, ryB: 0.038 },
    { kind: 'neck', uNeck: 0.84, rx: 0.0375, ryF: 0.037, ryB: 0.04 },
    { kind: 'neck', uNeck: 1.0, rx: 0.041, ryF: 0.0395, ryB: 0.043 },
  ];

  const unifiedTorsoNeckStations: LoftStation3D[] = unifiedTorsoNeckSpecs.map((spec) => {
    if (spec.kind === 'pelvis') {
      const { pt, rAx, fAx } = spineFrame(spec.u);
      return {
        center: pt,
        axisX: rAx,
        axisY: fAx,
        profile: (th: number) => {
          const ct = Math.cos(th);
          const st = Math.sin(th);
          if (st >= 0) return [ct * spec.rx, Math.pow(st, 0.88) * spec.ryF] as const;
          const s2 = Math.sin(2 * th);
          const gluteLobe = 1 + 0.14 * (s2 * s2);
          const sacralDip = spec.gluteCleft * Math.exp(-((ct / 0.21) * (ct / 0.21)));
          return [ct * spec.rx, st * spec.ryB * gluteLobe + sacralDip] as const;
        },
      };
    }
    if (spec.kind === 'midriff') {
      const { pt, rAx, fAx } = spineFrame(spec.u);
      return {
        center: pt,
        axisX: rAx,
        axisY: fAx,
        profile: (th: number) => {
          const ct = Math.cos(th);
          const st = Math.sin(th);
          const lineaAlba = 0.0034 * Math.exp(-((ct / 0.16) * (ct / 0.16)));
          const oblique = -0.002 * Math.exp(-(((Math.abs(ct) - 0.58) / 0.2) ** 2)) * Math.max(0, st);
          const erector = -0.0024 * Math.exp(-(((Math.abs(ct) - 0.34) / 0.22) ** 2)) * Math.max(0, -st);
          return [
            ct * spec.rx,
            st * spec.ry - (st > 0 ? lineaAlba : -lineaAlba * 0.8 - spec.lordosis) + oblique + erector,
          ] as const;
        },
      };
    }
    if (spec.kind === 'top') {
      const { pt, rAx, fAx } = spineFrame(spec.u);
      return {
        center: pt,
        axisX: rAx,
        axisY: fAx,
        profile: (th: number) => {
          const ct = Math.cos(th);
          const st = Math.sin(th);
          if (st >= 0) {
            const dL = (ct - 0.4) / 0.34;
            const dR = (ct + 0.4) / 0.34;
            const lobes = spec.bustBoost * st * (Math.exp(-(dL * dL)) + Math.exp(-(dR * dR)));
            return [ct * spec.rx, st * spec.ryF + lobes] as const;
          }
          const furrow = 0.0036 * Math.exp(-((ct / 0.16) * (ct / 0.16)));
          const scap =
            -spec.scapRelief *
            (Math.exp(-(((ct - 0.45) / 0.24) ** 2)) + Math.exp(-(((ct + 0.45) / 0.24) ** 2))) *
            -st;
          return [ct * spec.rx, st * spec.ryB + furrow + scap] as const;
        },
      };
    }
    if (spec.kind === 'clavicle') {
      const { pt, rAx, fAx } = spineFrame(spec.u);
      return {
        center: pt,
        axisX: rAx,
        axisY: fAx,
        profile: (th: number) => {
          const ct = Math.cos(th);
          const st = Math.sin(th);
          if (st >= 0) {
            const jugular = -spec.notchDepth * Math.exp(-((ct / 0.14) * (ct / 0.14))) * st;
            const scHeads =
              spec.clavRelief *
              0.78 *
              (Math.exp(-(((ct - 0.2) / 0.1) ** 2)) + Math.exp(-(((ct + 0.2) / 0.1) ** 2))) *
              st;
            const clavBar =
              spec.clavRelief *
              Math.exp(-(((Math.abs(ct) - 0.52) / 0.28) ** 2)) *
              Math.pow(st, 0.75);
            return [ct * spec.rx, st * spec.ryF + jugular + scHeads + clavBar] as const;
          }
          const spineHollow = 0.003 * Math.exp(-((ct / 0.16) * (ct / 0.16))) * -st;
          return [ct * spec.rx, st * spec.ryB + spineHollow] as const;
        },
      };
    }
    // Continuous neck station smoothly blending frame from trapezius yoke -> head orientation
    const blend = smoothstep(spec.uNeck);
    const rNeck = norm3(vlerp(yokeTopFrame.rAx, bodyRight, blend));
    const fRaw = vlerp(yokeTopFrame.fAx, headAnt, blend);
    const fOrth = sub3(fRaw, mul3(rNeck, dot3(fRaw, rNeck)));
    const fNeck = len3(fOrth) > 1e-4 ? norm3(fOrth) : headAnt;
    const cNeck = vlerp(yokeTopFrame.pt, neckEnd, spec.uNeck);
    return {
      center: cNeck,
      axisX: rNeck,
      axisY: fNeck,
      profile: (th: number) => {
        const ct = Math.cos(th);
        const st = Math.sin(th);
        const scm = 0.0014 * Math.exp(-(((Math.abs(ct) - 0.44) / 0.22) ** 2)) * Math.max(0, st);
        const ryN = st >= 0 ? spec.ryF : spec.ryB;
        return [ct * spec.rx, st * ryN + scm] as const;
      },
    };
  });

  quads.push(
    ...makeStationLoftQuads(
      unifiedTorsoNeckStations,
      skinRgb,
      segTorso,
      bodyAlpha,
      0.11,
      0,
      20,
      0.02,
      0.012,
      'skin',
      undefined,
      (bandIdx, thMid) => {
        // Bands 0..7: High-waisted sculpted leggings + crossover waistband
        if (bandIdx <= 7) {
          let bandRgb = bandIdx >= 5 ? leggingBandRgb : pelvisTone;
          if (bandIdx < 5 && !isClay) {
            const sideSeam = Math.exp(-(((Math.abs(Math.cos(thMid)) - 1) / 0.1) ** 2));
            if (sideSeam > 0.65) {
              bandRgb = [
                Math.max(0, Math.round(pelvisTone[0] * 0.92)),
                Math.max(0, Math.round(pelvisTone[1] * 0.93)),
                Math.max(0, Math.round(pelvisTone[2] * 0.94)),
              ];
            }
          }
          return {
            baseRgb: bandRgb,
            spec: 0.032,
            emissive: glutesActive && !isClay ? activePulse * 0.26 : 0,
            shininess: 16,
            materialRole: 'fabric',
          };
        }
        // Bands 8..11: Toned hourglass bare midriff
        if (bandIdx <= 11) {
          return { baseRgb: skinRgb, spec: 0.11, emissive: 0, shininess: 20, materialRole: 'skin' };
        }
        // Band 12: Delicate ivory underbust piping trim
        if (bandIdx === 12) {
          return {
            baseRgb: isClay ? cropTopTone : pipingTrimRgb,
            spec: 0.05,
            emissive: 0,
            shininess: 18,
            materialRole: 'fabric',
          };
        }
        // Bands 13..18: Botanical sage scoop-neck crop top
        if (bandIdx <= 18) {
          const isNeckTrim = !isClay && bandIdx === 18 && Math.sin(thMid) > 0.05;
          return {
            baseRgb: isNeckTrim ? cropTopSeamRgb : cropTopTone,
            spec: 0.032,
            emissive: coreActive && !isClay ? phaseT * 0.28 : 0,
            shininess: 16,
            materialRole: 'fabric',
          };
        }
        // Bands 19..26: Upper décolleté, clavicles, trapezius yoke & continuous swan neck
        return { baseRgb: skinRgb, spec: 0.11, emissive: 0, shininess: 20, materialRole: 'skin' };
      },
    ),
  );

  // Subtle V-Crossover Legging Waistband & Ivory Underbust Accents
  const wbFrame = spineFrame(0.398);
  const wbRingPts: Vec3[] = [];
  for (let k = 0; k <= segTorso; k++) {
    const ang = (2 * Math.PI * k) / segTorso;
    const st = Math.sin(ang);
    const vDip = st > 0 ? -0.01 * Math.pow(st, 2.2) : 0;
    wbRingPts.push(
      add3(
        wbFrame.pt,
        add3(
          mul3(wbFrame.rAx, Math.cos(ang) * 0.1),
          add3(mul3(wbFrame.fAx, st * 0.071), mul3(wbFrame.tan, vDip)),
        ),
      ),
    );
  }
  lines.push({
    pts: wbRingPts,
    stroke: isClay ? 'rgba(218,214,206,0.7)' : 'rgba(220, 228, 222, 0.55)',
    width: 1.2,
    depthBias: -0.01,
  });

  const ubFrame = spineFrame(0.532);
  const ubRingPts: Vec3[] = [];
  for (let k = 0; k <= segTorso; k++) {
    const ang = (2 * Math.PI * k) / segTorso;
    ubRingPts.push(
      add3(
        ubFrame.pt,
        add3(mul3(ubFrame.rAx, Math.cos(ang) * 0.111), mul3(ubFrame.fAx, Math.sin(ang) * 0.079)),
      ),
    );
  }
  lines.push({ pts: ubRingPts, stroke: pipingHex, width: 1.6, depthBias: -0.012 });

  // Sleek Pilates Camisole Shoulder Straps gliding continuously flush over exposed clavicle/shoulder skin
  const topEdgeFrame = spineFrame(0.865);
  const shoulderMidFrame = spineFrame(0.955);
  const shoulderApexFrame = spineFrame(1.032);
  for (const sgn of [-1, 1] as const) {
    const strapFront = add3(
      topEdgeFrame.pt,
      add3(mul3(topEdgeFrame.rAx, sgn * 0.079), mul3(topEdgeFrame.fAx, 0.075)),
    );
    const strapFrontMid = add3(
      shoulderMidFrame.pt,
      add3(mul3(shoulderMidFrame.rAx, sgn * 0.086), mul3(shoulderMidFrame.fAx, 0.071)),
    );
    const strapTop = add3(
      shoulderApexFrame.pt,
      add3(mul3(shoulderApexFrame.rAx, sgn * 0.088), mul3(shoulderApexFrame.tan, 0.005)),
    );
    const strapBackMid = add3(
      shoulderMidFrame.pt,
      add3(mul3(shoulderMidFrame.rAx, sgn * 0.084), mul3(shoulderMidFrame.fAx, -0.071)),
    );
    const strapBack = add3(
      topEdgeFrame.pt,
      add3(mul3(topEdgeFrame.rAx, sgn * 0.074), mul3(topEdgeFrame.fAx, -0.074)),
    );
    quads.push(
      ...makeTaperedTubeQuads(
        [strapFront, strapFrontMid, strapTop, strapBackMid, strapBack],
        [
          [0.0074, 0.0038],
          [0.0076, 0.004],
          [0.0078, 0.004],
          [0.0076, 0.004],
          [0.0074, 0.0038],
        ],
        cropTopTone,
        segStrap,
        bodyAlpha,
        0.035,
        0,
        16,
        spUp,
        0,
        0,
        'fabric',
      ),
    );
  }

  // 2D) Sculpted 7.5-Head Korean Studio Face & Flowing Silk Hair seated cleanly atop unified swan neck
  quads.push(
    ...makeAnatomicalHeadWithHairQuads(
      headPos,
      bodyRight,
      headAnt,
      neckUp,
      skinRgb,
      hairCol,
      pipingTrimRgb,
      bodyAlpha,
      segHead,
      ringsHead,
      ribbonAccentRgb,
    ),
  );

  // 2E) High-Resolution 21-Station Continuous Slender Pilates Leg Sweep with Gluteal Fillet & Bend-Angle Volume Preservation
  const legActive =
    rig.activeZones.includes('quads') ||
    rig.activeZones.includes('glutes') ||
    rig.activeZones.includes('adductors');
  const legCol: Rgb =
    !isClay && legActive && phaseT > 0.25
      ? [
          lerp(leggingRgb[0], coralRgb[0], phaseT * 0.28),
          lerp(leggingRgb[1], coralRgb[1], phaseT * 0.24),
          lerp(leggingRgb[2], coralRgb[2], phaseT * 0.2),
        ]
      : leggingRgb;

  const legProfileTable: readonly [number, number, number, number][] = [
    [0.0, 0.088, 0.092, -0.015], // Deep gluteal/trochanter fillet seamlessly embedded into pelvis
    [0.035, 0.082, 0.086, -0.01], // Smooth hip socket transition fillet 1
    [0.075, 0.076, 0.081, -0.005], // Smooth hip socket transition fillet 2
    [0.15, 0.069, 0.073, 0.002], // Upper thigh curve
    [0.23, 0.063, 0.066, 0.004], // Quadriceps/hamstring sweep
    [0.32, 0.056, 0.059, 0.004], // Mid-thigh tone
    [0.39, 0.05, 0.052, 0.003], // Lower quadriceps taper
    [0.42, 0.0475, 0.0495, 0.003], // Reinforced knee ring 1
    [0.46, 0.045, 0.047, 0.004], // Reinforced knee ring 2
    [0.5, 0.044, 0.046, 0.005], // Smooth curved knee apex
    [0.54, 0.0425, 0.0445, 0.002], // Reinforced knee ring 4
    [0.58, 0.0415, 0.0435, -0.0025], // Reinforced knee ring 5
    [0.66, 0.044, 0.048, -0.0075], // High dancer's gastrocnemius calf belly
    [0.73, 0.042, 0.046, -0.0065], // Mid calf curve
    [0.8, 0.038, 0.041, -0.004], // Soleus taper
    [0.87, 0.034, 0.037, -0.002], // Lower calf slimming
    [0.92, 0.031, 0.034, -0.001], // Supramalleolar Achilles narrow
    [0.96, 0.029, 0.032, 0.0], // Slender ankle
    [1.0, 0.0285, 0.031, 0.0], // Legging ankle hem into sock cuff
  ];

  for (const [hipPt, kneePt, anklePt, kBend] of [
    [lHip, lKnee, lAnkle, lKneeBend],
    [rHip, rKnee, rAnkle, rKneeBend],
  ] as const) {
    // Gluteal/pelvis socket fillet anchor curving smoothly from pelvis into thigh
    const hipSocketCore = add3(hipPt, add3(mul3(spUp, 0.046), mul3(antN, -0.008)));
    const hipBlend = add3(hipPt, mul3(spUp, 0.032));
    const hemAnkle = vlerp(kneePt, anklePt, 0.86);
    const kneeCos = Math.max(
      -1,
      Math.min(1, dot3(norm3(sub3(hipBlend, kneePt)), norm3(sub3(hemAnkle, kneePt)))),
    );
    const kneeFlexRad = Math.PI - Math.acos(kneeCos);
    const kneeBendFactor = Math.max(
      0,
      Math.min(1, (kneeFlexRad - (22 * Math.PI) / 180) / ((95 * Math.PI) / 180)),
    );
    const legPts: Vec3[] = [];
    const legRadii: [number, number][] = [];
    for (const [sVal, rxL, ryL, antShift] of legProfileTable) {
      const [rawPt, tan] = sampleRounded2SegChain(hipBlend, kneePt, hemAnkle, sVal, 0.22);
      const socketW = sVal < 0.08 ? Math.pow(1 - sVal / 0.08, 1.6) : 0;
      const pt = socketW > 0 ? vlerp(rawPt, hipSocketCore, socketW * 0.62) : rawPt;
      let fProj = sub3(kBend, mul3(tan, dot3(kBend, tan)));
      if (len3(fProj) < 1e-4) fProj = cross3(tan, bodyRight);
      const fAx = norm3(fProj);
      const jointW = Math.exp(-(((sVal - 0.5) / 0.085) ** 2));
      const outerBoost = 1 + 0.12 * kneeBendFactor * jointW;
      const latBoost = 1 + 0.08 * kneeBendFactor * jointW;
      legPts.push(add3(pt, mul3(fAx, antShift + 0.004 * kneeBendFactor * jointW)));
      legRadii.push([rxL * latBoost, ryL * outerBoost]);
    }
    quads.push(
      ...makeTaperedTubeQuads(
        legPts,
        legRadii,
        legCol,
        segLimb,
        bodyAlpha,
        0.032,
        legActive && !isClay ? phaseT * 0.2 : 0,
        16,
        kBend,
        0.022,
        0.006,
        'fabric',
      ),
      ...makeSculptedGripFootQuads(
        hipPt,
        kneePt,
        anklePt,
        kBend,
        antN,
        sockCol,
        leggingRgb,
        bodyAlpha,
        svgFastMode,
      ),
    );
  }

  // 2F) High-Resolution Continuous Organic Shoulder-to-Wrist Arm Sweep with Deltoid Fillet & Bend-Angle Volume Preservation
  const armProfileTable: readonly [number, number, number][] = [
    [0.0, 0.046, 0.044], // Full acromion-deltoid cap blending seamlessly out of trapezius yoke
    [0.06, 0.0435, 0.042], // Smooth deltoid sweep
    [0.13, 0.0395, 0.039], // Rounded feminine deltoid curve
    [0.22, 0.0355, 0.036], // Deltoid insertion
    [0.31, 0.0335, 0.0345], // Toned biceps/triceps contour
    [0.38, 0.0315, 0.032], // Lower humerus slimming
    [0.42, 0.031, 0.0315], // Reinforced elbow ring 1
    [0.46, 0.0305, 0.031], // Reinforced elbow ring 2
    [0.5, 0.0305, 0.031], // Silky curved elbow apex (zero V-kink!)
    [0.54, 0.0305, 0.031], // Reinforced elbow ring 4
    [0.58, 0.031, 0.03], // Reinforced elbow ring 5
    [0.67, 0.0285, 0.0265], // Mid forearm taper
    [0.75, 0.026, 0.0235], // Lower-mid forearm
    [0.83, 0.023, 0.02], // Distal forearm slimming
    [0.91, 0.0205, 0.017], // Pre-wrist narrow
    [0.96, 0.0195, 0.0156], // Slender oval wrist
    [1.0, 0.019, 0.015], // Seamless wrist-to-palm embed
  ];

  const armTone: Rgb =
    !isClay && shoulderActive && (phaseT > 0.18 || showBiomechOverlay)
      ? [
          lerp(skinRgb[0], coralRgb[0], activePulse * 0.2),
          lerp(skinRgb[1], coralRgb[1], activePulse * 0.15),
          lerp(skinRgb[2], coralRgb[2], activePulse * 0.11),
        ]
      : skinRgb;

  for (const [side, shPt, elbPt, wrPt, eBend] of [
    ['L', lSh, lElb, lWr, lElbowBend],
    ['R', rSh, rElb, rWr, rElbowBend],
  ] as const) {
    // 2 smooth deltoid-clavicle fillet rings curving seamlessly out of upper torso yoke -> deltoid -> elbow -> wrist
    const shInner = sub3(vlerp(rig.chest, shPt, 0.56), mul3(spUp, 0.012));
    const shFillet1 = sub3(vlerp(rig.chest, shPt, 0.78), mul3(spUp, 0.013));
    const shOuter = sub3(vlerp(rig.chest, shPt, 0.96), mul3(spUp, 0.015));
    const armCos = Math.max(
      -1,
      Math.min(1, dot3(norm3(sub3(shOuter, elbPt)), norm3(sub3(wrPt, elbPt)))),
    );
    const armFlexRad = Math.PI - Math.acos(armCos);
    const armBendFactor = Math.max(
      0,
      Math.min(1, (armFlexRad - (22 * Math.PI) / 180) / ((95 * Math.PI) / 180)),
    );
    const armPts: Vec3[] = [shInner, shFillet1];
    const armRadii: [number, number][] = [
      [0.052, 0.049],
      [0.0485, 0.046],
    ];
    for (const [sVal, rxA, ryA] of armProfileTable) {
      const [pt, tan] = sampleRounded2SegChain(shOuter, elbPt, wrPt, sVal, 0.22);
      const blendedPt = sVal === 0 ? vlerp(shFillet1, pt, 0.76) : pt;
      let fProj = sub3(eBend, mul3(tan, dot3(eBend, tan)));
      if (len3(fProj) < 1e-4) fProj = cross3(tan, spUp);
      const fAx = norm3(fProj);
      const jointW = Math.exp(-(((sVal - 0.5) / 0.085) ** 2));
      const outerBoost = 1 + 0.12 * armBendFactor * jointW;
      const latBoost = 1 + 0.09 * armBendFactor * jointW;
      armPts.push(add3(blendedPt, mul3(fAx, 0.0032 * armBendFactor * jointW)));
      armRadii.push([rxA * latBoost, ryA * outerBoost]);
    }
    const forearmVec = sub3(wrPt, elbPt);
    const forearmDir = len3(forearmVec) > 1e-4 ? norm3(forearmVec) : antN;
    quads.push(
      ...makeTaperedTubeQuads(
        armPts,
        armRadii,
        armTone,
        segLimb,
        bodyAlpha,
        0.1,
        shoulderActive && !isClay ? activePulse * 0.14 : 0,
        20,
        eBend,
        0.02,
        0.006,
        'skin',
      ),
      ...makeSculptedHandQuads(
        side,
        wrPt,
        forearmDir,
        bodyRight,
        antN,
        skinRgb,
        bodyAlpha,
        svgFastMode,
      ),
    );
  }
  }

  shadowAnchors.push({ pos: [rig.pelvis[0], rig.pelvis[1], 0.004], rx: 0.42, ry: 0.2 });

  // Biomechanical Angles & Center of Mass
  const kneeAngleDeg = interiorAngleDeg(rHip, rKnee, rAnkle);
  const hipAngleDeg = interiorAngleDeg(rig.chest, rig.pelvis, rKnee);
  const shoulderAngleDeg = interiorAngleDeg(rig.pelvis, rig.chest, rElb);
  const spineArticulationDeg = 180 - interiorAngleDeg(rig.pelvis, rig.spineMid, rig.chest);
  const com3D: Vec3 = [
    rig.pelvis[0] * 0.46 + rig.spineMid[0] * 0.3 + (lKnee[0] + rKnee[0]) * 0.12,
    rig.pelvis[1] * 0.46 + rig.spineMid[1] * 0.3 + (lKnee[1] + rKnee[1]) * 0.12,
    rig.pelvis[2] * 0.46 + rig.spineMid[2] * 0.3 + (lKnee[2] + rKnee[2]) * 0.12,
  ];
  const comHeightCm = Math.max(8, Math.round(com3D[2] * 100));

  // Internal bone chains only in X-Ray mode so Studio PBR stays clean and sculptural
  if (shader === 'biomech-xray') {
    lines.push({ pts: spPts, stroke: '#FBBF24', width: 3.2, overlay: true });
    lines.push({ pts: [lHip, lKnee, lAnkle], stroke: '#FF7A59', width: 2.5, overlay: true });
    lines.push({ pts: [rHip, rKnee, rAnkle], stroke: '#FF7A59', width: 2.5, overlay: true });
    lines.push({ pts: [lSh, lElb, lWr], stroke: '#6EE7B7', width: 2.2, overlay: true });
    lines.push({ pts: [rSh, rElb, rWr], stroke: '#6EE7B7', width: 2.2, overlay: true });
  }

  if (showBiomechOverlay) {
    lines.push({
      pts: [com3D, [com3D[0], com3D[1], 0.01]],
      stroke: '#E25B3B',
      width: 2.1,
      dash: [4, 3],
      overlay: true,
    });

    // Active Muscle Zone Korean Highlights + Spring Assist/Resist Force Vector Arrows
    const zoneLabelMap: Record<ActiveMuscleZone3D, string> = {
      core: '코어',
      glutes: '둔근',
      quads: '대퇴사두',
      obliques: '복사근',
      back: '척추기립근',
      adductors: '내전근',
      shoulders: '삼각근·견갑',
    };
    const activeMuscleSummary = rig.activeZones
      .slice(0, 3)
      .map((z) => zoneLabelMap[z])
      .join(' · ');
    if (activeMuscleSummary) {
      callouts.push({
        pos: add3(rig.chest, [0, 0.04, 0.22]),
        text: `활성근: ${activeMuscleSummary}`,
        bg: 'rgba(182, 68, 46, 0.92)',
        fg: '#FFFDF8',
      });
    }

    if (apparatus === 'reformer' && activeSpringColors.length > 0) {
      const cxVec = rig.carriageX ?? 0.12;
      const isAssistReformer =
        exercise.blockCategory === 'plank' ||
        exercise.bodyPosition === 'standing' ||
        exercise.bodyPosition === 'kneeling' ||
        /1B|1Y/i.test(effectiveSprings);
      const forceColor = isAssistReformer ? '#1B7A5E' : '#C94A29';
      const arrowStart: Vec3 = [cxVec + 0.44, -0.18, 0.34];
      const arrowEnd: Vec3 = [Math.min(0.92, cxVec + 0.74), -0.18, 0.34];
      lines.push({
        pts: [arrowStart, arrowEnd],
        stroke: forceColor,
        width: 2.8,
        overlay: true,
        arrowEnd: true,
      });
      callouts.push({
        pos: [(arrowStart[0] + arrowEnd[0]) * 0.5, -0.22, 0.25],
        text: isAssistReformer
          ? `스프링 보조 → (+${springStretchPct}%)`
          : `스프링 저항 ← (+${springStretchPct}%)`,
        bg: isAssistReformer ? 'rgba(24, 102, 78, 0.92)' : 'rgba(186, 62, 38, 0.92)',
        fg: '#FFFDF8',
      });
    } else if (apparatus === 'chair') {
      const pdegVec = rig.pedalDeg ?? 22;
      const radVec = (pdegVec * Math.PI) / 180;
      const pxVec = -0.2 + Math.cos(radVec) * 0.54;
      const pzVec = 0.088 + Math.sin(radVec) * 0.54;
      const isAssistChair =
        exercise.bodyPosition === 'standing' ||
        exercise.blockCategory === 'plank' ||
        /going|pike|pull/i.test(exercise.id);
      const forceColor = isAssistChair ? '#1B7A5E' : '#C94A29';
      const arrowStart: Vec3 = [pxVec + 0.04, 0, pzVec + 0.04];
      const arrowEnd: Vec3 = [pxVec - 0.06, 0, pzVec + 0.24];
      lines.push({
        pts: [arrowStart, arrowEnd],
        stroke: forceColor,
        width: 2.8,
        overlay: true,
        arrowEnd: true,
      });
      callouts.push({
        pos: [pxVec + 0.08, 0, pzVec + 0.24],
        text: isAssistChair ? '페달 스프링 보조 ↑' : '페달 스프링 저항 ↑',
        bg: isAssistChair ? 'rgba(24, 102, 78, 0.92)' : 'rgba(186, 62, 38, 0.92)',
        fg: '#FFFDF8',
      });
    } else if (apparatus === 'cadillac') {
      const isAssistCad = Boolean(rig.rolldownBar) || Boolean(rig.pushthroughDeg !== undefined);
      const forceColor = isAssistCad ? '#1B7A5E' : '#C94A29';
      const fStart: Vec3 = rig.rolldownBar
        ? [rig.rolldownBar[0], 0, rig.rolldownBar[1]]
        : [0.22, 0, 1.32];
      const fEnd: Vec3 = rig.rolldownBar ? [0.96, 0, 1.72] : [-0.42, 0, 1.56];
      lines.push({
        pts: [fStart, fEnd],
        stroke: forceColor,
        width: 2.6,
        overlay: true,
        arrowEnd: true,
      });
      callouts.push({
        pos: vlerp(fStart, fEnd, 0.52),
        text: isAssistCad ? '타워 스프링 보조 ↗' : '스프링 저항 ↖',
        bg: isAssistCad ? 'rgba(24, 102, 78, 0.92)' : 'rgba(186, 62, 38, 0.92)',
        fg: '#FFFDF8',
      });
    }

    callouts.push(
      {
        pos: add3(rKnee, [0, 0.04, 0.08]),
        text: `무릎 ${kneeAngleDeg}°`,
        bg: 'rgba(23, 61, 52, 0.9)',
        fg: '#F8FAFC',
      },
      {
        pos: add3(rig.pelvis, [0, -0.06, 0.13]),
        text: `고관절 ${hipAngleDeg}°`,
        bg: 'rgba(30, 64, 96, 0.9)',
        fg: '#F8FAFC',
      },
      {
        pos: [com3D[0], com3D[1], 0.04],
        text: `CoM ${comHeightCm}cm`,
        bg: 'rgba(191, 90, 65, 0.92)',
        fg: '#FFFDF8',
      },
    );
  }

  const route = studioMotionRoute(exercise, spec.signatureId);
  lines.push({
    pts: mirrored ? route.mirrorPoints : route.points,
    stroke: shader === 'studio-pbr' || isClay ? '#C9822B' : '#FBBF24',
    width: 2.3,
    dash: [5, 4],
    overlay: true,
  });
  const target = route.target;

  const apparatusAnchor: Vec3 =
    apparatus === 'reformer'
      ? [0.66, 0, 0.36]
      : apparatus === 'cadillac'
        ? [0.54, 0, 1.36]
        : apparatus === 'chair'
          ? [0.24, 0, 0.3]
          : apparatus === 'barrel'
            ? [-0.22, 0, 0.72]
            : [0, 0, 0.05];

  const hotspotDefs: HotspotDef3D[] = [
    {
      id: 'spine',
      labelKo: '척추·코어 중심',
      metricKo: `분절 ${spineArticulationDeg}° · CoM ${comHeightCm}cm`,
      cueKo:
        exercise.cues[0] ??
        '갈비뼈와 골반 사이의 길이를 길게 유지하며 호흡으로 코어를 감싸 주세요.',
      pos3d: rig.spineMid,
    },
    {
      id: 'hip',
      labelKo: '골반·고관절 정렬',
      metricKo: `고관절 ${hipAngleDeg}°`,
      cueKo: '좌우 골반 높이를 나란히 맞추고 요추가 과하게 꺾이지 않도록 중립을 지켜 주세요.',
      pos3d: rig.pelvis,
    },
    {
      id: 'knee',
      labelKo: '무릎·하체 정렬',
      metricKo: `무릎 ${kneeAngleDeg}°`,
      cueKo: '두 번째 발가락과 무릎 중심선이 같은 방향을 가리키도록 하체 정렬을 유지하세요.',
      pos3d: rKnee,
    },
    {
      id: 'shoulder',
      labelKo: '어깨·견갑 안정화',
      metricKo: `견관절 ${shoulderAngleDeg}°`,
      cueKo:
        exercise.cues[1] ?? '귀와 어깨 사이 공간을 넓게 유지하며 상부 승모근 긴장을 내려놓으세요.',
      pos3d: rSh,
    },
    {
      id: 'apparatus',
      labelKo: apparatus === 'mat' ? '매트·지지면 중심' : '기구·스프링 장력',
      metricKo:
        springStretchPct > 0
          ? `${activeSpringLabel} · 신장 +${springStretchPct}%`
          : activeSpringLabel,
      cueKo:
        apparatus === 'mat'
          ? '매트 중심선 위에서 좌우 체중을 고르게 분산해 흔들림 없이 지지하세요.'
          : '스프링이 돌아오는 복귀 구간에서도 저항을 끝까지 느끼며 부드럽게 제어하세요.',
      pos3d: apparatusAnchor,
    },
  ];

  return {
    quads,
    lines,
    callouts,
    hotspotDefs,
    shadowAnchors,
    pelvis: rig.pelvis,
    target,
    halfSize: route.halfSize,
    signatureId: spec.signatureId,
    activeZonesCount: rig.activeZones.length,
    activeZones: rig.activeZones,
    springStretchPct,
    biomechTelemetry: {
      kneeAngleDeg,
      hipAngleDeg,
      shoulderAngleDeg,
      spineArticulationDeg,
      comHeightCm,
      activeSpringLabel,
    },
    characterPipeline,
    apparatusPipeline,
  };
}

function evalStudioPbrLitRgb(
  normal3: Vec3,
  pos3: Vec3,
  camPos: Vec3,
  keyDir: Vec3,
  fillDir: Vec3,
  bounceDir: Vec3,
  q: QuadFace,
  shader: Studio3DShaderPreset,
  overrideBaseRgb?: Rgb,
): { r: number; g: number; b: number; lum: number } {
  let n = normal3;
  const viewDir = norm3(sub3(camPos, pos3));
  if (dot3(n, viewDir) < 0) n = mul3(n, -1);

  const baseRgb = overrideBaseRgb ?? q.baseRgb;
  const ndv = Math.max(0, dot3(n, viewDir));
  const rawNdl = dot3(n, keyDir);
  const diffKey = Math.max(0, rawNdl);
  const diffFill = Math.max(0, dot3(n, fillDir));
  const diffBounce = Math.max(0, dot3(n, bounceDir)) * 0.1;
  const ao = Math.min(1, 0.84 + Math.max(0, pos3[2]) * 0.19);
  const halfVec = norm3(add3(keyDir, viewDir));
  const ndh = Math.max(0, dot3(n, halfVec));
  const emissiveLift = (q.emissive ?? 0) * 0.24;

  if (shader === 'clay-wire' || shader === 'biomech-xray') {
    const rim = Math.pow(1 - ndv, 2.5) * 0.2;
    const specPow = Math.pow(ndh, q.shininess ?? 24) * q.spec;
    const shade = (0.45 + diffKey * 0.42 + diffFill * 0.22 + diffBounce + rim + emissiveLift) * ao;
    const r = Math.max(0, Math.min(255, Math.round(baseRgb[0] * shade + specPow * 232)));
    const g = Math.max(0, Math.min(255, Math.round(baseRgb[1] * shade + specPow * 229)));
    const b = Math.max(0, Math.min(255, Math.round(baseRgb[2] * shade + specPow * 222)));
    return { r, g, b, lum: r * 0.3 + g * 0.59 + b * 0.11 };
  }

  const role: StudioMaterialRole | undefined =
    q.materialRole ??
    (q.spec >= 0.55
      ? baseRgb[0] > baseRgb[2] + 35
        ? 'brass'
        : 'chrome'
      : q.spec <= 0.06
        ? 'fabric'
        : undefined);

  let rF: number;
  let gF: number;
  let bF: number;

  if (role === 'skin') {
    const wrap = Math.max(0, (rawNdl + 0.46) / 1.46);
    const sssShift = (rawNdl + 0.08) * 2.3;
    const scatterBand = Math.exp(-(sssShift * sssShift));
    const skinRim = Math.pow(1 - ndv, 2.75) * 0.17;
    const specPow = Math.pow(ndh, q.shininess ?? 22) * Math.min(q.spec, 0.11);
    const shade =
      (0.45 + wrap * 0.46 + diffFill * 0.22 + diffBounce * 0.85 + emissiveLift) * ao;
    rF = baseRgb[0] * shade + baseRgb[0] * 0.13 * scatterBand + skinRim * 252 + specPow * 244;
    gF = baseRgb[1] * shade + baseRgb[1] * 0.06 * scatterBand + skinRim * 238 + specPow * 234;
    bF = baseRgb[2] * shade + baseRgb[2] * 0.04 * scatterBand + skinRim * 220 + specPow * 224;
  } else if (role === 'hair') {
    const hairRim = Math.pow(1 - ndv, 2.35) * 0.28;
    const silkPrimary = Math.pow(ndh, 42) * 0.32;
    const silkSecondary = Math.pow(ndh, 16) * 0.16;
    const shade = (0.42 + diffKey * 0.44 + diffFill * 0.22 + diffBounce + emissiveLift) * ao;
    rF = baseRgb[0] * shade + silkPrimary * 236 + silkSecondary * 172 + hairRim * 245;
    gF = baseRgb[1] * shade + silkPrimary * 206 + silkSecondary * 124 + hairRim * 224;
    bF = baseRgb[2] * shade + silkPrimary * 180 + silkSecondary * 92 + hairRim * 198;
  } else if (role === 'gloss') {
    const sparkle = Math.pow(ndh, 76) * Math.max(q.spec, 0.35) * 248;
    const rim = Math.pow(1 - ndv, 2.8) * 0.14;
    const shade = (0.52 + diffKey * 0.4 + diffFill * 0.22 + emissiveLift) * ao;
    rF = baseRgb[0] * shade + sparkle + rim * 248;
    gF = baseRgb[1] * shade + sparkle * 0.98 + rim * 242;
    bF = baseRgb[2] * shade + sparkle * 0.95 + rim * 236;
  } else if (role === 'wood') {
    const grain = 1 + 0.038 * Math.sin(pos3[0] * 38 + pos3[1] * 11);
    const coatRim = Math.pow(1 - ndv, 3.0) * 0.11;
    const baseSpec = Math.pow(ndh, q.shininess ?? 28) * (q.spec * 0.62);
    const coatSpec = Math.pow(ndh, 48) * 0.18;
    const shade =
      (0.46 + diffKey * 0.43 + diffFill * 0.22 + diffBounce + coatRim + emissiveLift) * ao * grain;
    const specTotal = baseSpec + coatSpec;
    rF = baseRgb[0] * shade + specTotal * 238;
    gF = baseRgb[1] * shade + specTotal * 232;
    bF = baseRgb[2] * shade + specTotal * 220;
  } else if (role === 'fabric') {
    const velvetSheen = Math.pow(1 - Math.max(0, dot3(n, viewDir)), 2.75) * 0.2;
    const specPow = Math.pow(ndh, q.shininess ?? 14) * Math.min(q.spec, 0.032);
    const shade = (0.47 + diffKey * 0.41 + diffFill * 0.23 + diffBounce + emissiveLift) * ao;
    rF = baseRgb[0] * shade + velvetSheen * (baseRgb[0] * 0.45 + 142) + specPow * 212;
    gF = baseRgb[1] * shade + velvetSheen * (baseRgb[1] * 0.45 + 150) + specPow * 216;
    bF = baseRgb[2] * shade + velvetSheen * (baseRgb[2] * 0.45 + 140) + specPow * 210;
  } else if (role === 'chrome' || role === 'brass') {
    const skyT = Math.max(-1, Math.min(1, n[2] * 0.72 + (2 * ndv * n[2] - viewDir[2]) * 0.28));
    let envR: number;
    let envG: number;
    let envB: number;
    if (skyT >= 0) {
      envR = lerp(214, 250, skyT);
      envG = lerp(210, 247, skyT);
      envB = lerp(202, 240, skyT);
    } else {
      const gndT = -skyT;
      envR = lerp(214, 146, gndT);
      envG = lerp(210, 142, gndT);
      envB = lerp(202, 134, gndT);
    }
    const dirBoost = (0.68 + diffKey * 0.34 + diffFill * 0.18) * ao;
    const fresnel = Math.pow(1 - ndv, 3.2) * 0.16;
    const fillHalf = norm3(add3(fillDir, viewDir));
    const anisoSpec =
      (Math.pow(ndh, 64) * 0.68 + Math.pow(Math.max(0, dot3(n, fillHalf)), 64) * 0.2) *
      Math.max(0.55, q.spec);
    rF =
      (baseRgb[0] / 235) * envR * dirBoost +
      (anisoSpec + fresnel) * (role === 'brass' ? 252 : 246);
    gF =
      (baseRgb[1] / 235) * envG * dirBoost +
      (anisoSpec + fresnel) * (role === 'brass' ? 236 : 248);
    bF =
      (baseRgb[2] / 235) * envB * dirBoost +
      (anisoSpec + fresnel) * (role === 'brass' ? 196 : 250);
  } else if (role === 'leather') {
    const edgeCatchlight = Math.pow(1 - ndv, 2.8) * 0.15;
    const specPow = Math.pow(ndh, q.shininess ?? 26) * Math.min(q.spec, 0.22);
    const shade = (0.46 + diffKey * 0.41 + diffFill * 0.22 + diffBounce + emissiveLift) * ao;
    rF = baseRgb[0] * shade + edgeCatchlight * 168 + specPow * 226;
    gF = baseRgb[1] * shade + edgeCatchlight * 182 + specPow * 228;
    bF = baseRgb[2] * shade + edgeCatchlight * 172 + specPow * 220;
  } else {
    const rim = Math.pow(1 - ndv, 2.6) * 0.18;
    const specPow = Math.pow(ndh, q.shininess ?? 24) * q.spec;
    const shade = (0.45 + diffKey * 0.42 + diffFill * 0.22 + diffBounce + rim + emissiveLift) * ao;
    rF = baseRgb[0] * shade + specPow * 232;
    gF = baseRgb[1] * shade + specPow * 229;
    bF = baseRgb[2] * shade + specPow * 222;
  }

  const rawEmissive = q.emissive ?? 0;
  if (rawEmissive > 0.05 && (role === 'skin' || role === 'fabric')) {
    const fresnelRim = Math.pow(1 - ndv, 1.8);
    const heatBoost = rawEmissive * (0.38 + 0.62 * fresnelRim) * 0.42;
    rF += 235 * heatBoost;
    gF += 122 * heatBoost;
    bF += 71 * heatBoost;
  }

  const r = Math.max(0, Math.min(255, Math.round(rF)));
  const g = Math.max(0, Math.min(255, Math.round(gF)));
  const b = Math.max(0, Math.min(255, Math.round(bF)));
  return { r, g, b, lum: r * 0.3 + g * 0.59 + b * 0.11 };
}

const STUDIO_KEY_DIR: Vec3 = norm3([-0.48, -0.56, 0.82]);
const STUDIO_FILL_DIR: Vec3 = norm3([0.66, -0.38, 0.54]);
const STUDIO_BOUNCE_DIR: Vec3 = [0, 0, -1];
const STUDIO_GIZMO_AXES: readonly { readonly vec: Vec3; readonly col: string; readonly lbl: string }[] = [
  { vec: [1, 0, 0], col: '#E25B3B', lbl: 'X' },
  { vec: [0, 1, 0], col: '#2B6CB0', lbl: 'Y' },
  { vec: [0, 0, 1], col: '#1FA97C', lbl: 'Z' },
];

function studioCamera(
  scene: Built3DScene,
  width: number,
  height: number,
  yawDeg: number,
  pitchDeg: number,
  zoom: number,
) {
  const yaw = ((yawDeg - 90) * Math.PI) / 180;
  const pitch = (Math.max(-6, Math.min(82, pitchDeg)) * Math.PI) / 180;
  const back: Vec3 = [
    Math.cos(pitch) * Math.cos(yaw),
    Math.cos(pitch) * Math.sin(yaw),
    Math.sin(pitch),
  ];
  const camFwd = mul3(back, -1);
  const camRight = norm3(cross3(camFwd, [0, 0, 1]));
  const camUp = norm3(cross3(camRight, camFwd));
  const focal = Math.min(width, height * 1.48) * 1.38;
  const [x, y, z] = scene.halfSize;
  let distance = 0;
  for (const dx of [-x, x])
    for (const dy of [-y, y])
      for (const dz of [-z, z]) {
        const corner: Vec3 = [dx, dy, dz];
        const horizontal = (Math.abs(dot3(corner, camRight)) * focal) / (width * 0.47);
        const vertical = (Math.abs(dot3(corner, camUp)) * focal) / (height * 0.45);
        distance = Math.max(distance, dot3(corner, back) + Math.max(horizontal, vertical));
      }
  const baseCamPos = add3(
    scene.target,
    mul3(back, (distance * 1.04) / Math.max(0.65, Math.min(1.85, zoom))),
  );
  return { baseCamPos, camFwd, camRight, camUp, focal };
}

function drawSceneRegion(params: {
  ctx: CanvasRenderingContext2D;
  scene: Built3DScene;
  rx: number;
  ry: number;
  rw: number;
  rh: number;
  dpr?: number;
  gpuRenderer?: Studio3DGpuRenderer | null;
  yawDeg: number;
  pitchDeg: number;
  zoom: number;
  panX?: number;
  panY?: number;
  shader: Studio3DShaderPreset;
  regionLabel?: string;
  selectedHotspotId?: Studio3DHotspotId | null;
  collectHotspots?: Studio3DHotspot[];
}): Studio3DRenderBackend {
  const {
    ctx,
    scene,
    rx,
    ry,
    rw,
    rh,
    dpr = 1,
    gpuRenderer,
    yawDeg,
    pitchDeg,
    zoom,
    panX = 0,
    panY = 0,
    shader,
    regionLabel,
    selectedHotspotId,
    collectHotspots,
  } = params;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rx, ry, rw, rh);
  ctx.clip();

  const bgGrad = ctx.createLinearGradient(0, ry, 0, ry + rh);
  if (shader === 'game-arena') {
    bgGrad.addColorStop(0, '#0F1916');
    bgGrad.addColorStop(0.62, '#172722');
    bgGrad.addColorStop(1, '#0D1613');
  } else if (shader === 'biomech-xray') {
    bgGrad.addColorStop(0, '#152722');
    bgGrad.addColorStop(0.58, '#1E352E');
    bgGrad.addColorStop(1, '#12221D');
  } else if (shader === 'clay-wire') {
    bgGrad.addColorStop(0, '#F1EEE8');
    bgGrad.addColorStop(0.64, '#E5E1D9');
    bgGrad.addColorStop(1, '#D8D2C8');
  } else {
    bgGrad.addColorStop(0, '#FAF7F0');
    bgGrad.addColorStop(0.62, '#F6F2E9');
    bgGrad.addColorStop(1, MOTION_STUDIO_MATERIALS.floor);
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(rx, ry, rw, rh);

  const { baseCamPos, camFwd, camRight, camUp, focal } = studioCamera(
    scene,
    rw,
    rh,
    yawDeg,
    pitchDeg,
    zoom,
  );
  const clampedPanX = Math.max(-0.45, Math.min(0.45, panX));
  const clampedPanY = Math.max(-0.45, Math.min(0.45, panY));
  const camPos: Vec3 =
    clampedPanX !== 0 || clampedPanY !== 0
      ? add3(baseCamPos, add3(mul3(camRight, -clampedPanX), mul3(camUp, clampedPanY)))
      : baseCamPos;

  const project = (pt: Vec3): { x: number; y: number; zCam: number; valid: boolean } => {
    const rel = sub3(pt, camPos);
    const zCam = dot3(rel, camFwd);
    if (zCam <= 0.12) return { x: 0, y: 0, zCam, valid: false };
    const xCam = dot3(rel, camRight);
    const yCam = dot3(rel, camUp);
    return {
      x: rx + rw * 0.5 + (xCam / zCam) * focal,
      y: ry + rh * 0.54 - (yCam / zCam) * focal,
      zCam,
      valid: true,
    };
  };

  // Perspective Architectural Studio Floor Grid (omitted in calm studio-pbr cyclorama mode)
  if (shader !== 'studio-pbr') {
    ctx.save();
    ctx.strokeStyle =
      shader === 'clay-wire'
        ? 'rgba(72, 68, 62, 0.085)'
        : shader === 'biomech-xray'
          ? 'rgba(126, 231, 196, 0.12)'
          : 'rgba(110, 231, 183, 0.14)';
    ctx.lineWidth = 1;
    for (let gx = -1.8; gx <= 1.801; gx += 0.3) {
      const a = project([gx, -1.2, 0]);
      const b = project([gx, 1.2, 0]);
      if (a.valid && b.valid) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
    for (let gy = -1.2; gy <= 1.201; gy += 0.3) {
      const a = project([-1.8, gy, 0]);
      const b = project([1.8, gy, 0]);
      if (a.valid && b.valid) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Multi-Ring Feathered Contact Shadows on Studio Cyclorama Floor
  for (const sh of scene.shadowAnchors) {
    const sc = project(sh.pos);
    if (!sc.valid) continue;
    const scalePx = focal / sc.zCam;
    const baseRx = Math.max(18, sh.rx * scalePx * 0.72);
    const baseRy = Math.max(7, sh.ry * scalePx * 0.42);
    ctx.save();
    const layers =
      shader === 'studio-pbr' || shader === 'clay-wire'
        ? ([
            [1.26, 'rgba(24, 44, 36, 0.032)'],
            [1.0, 'rgba(24, 44, 36, 0.048)'],
            [0.68, 'rgba(24, 44, 36, 0.056)'],
          ] as const)
        : ([
            [1.18, 'rgba(0, 0, 0, 0.14)'],
            [0.85, 'rgba(0, 0, 0, 0.2)'],
          ] as const);
    for (const [mul, fill] of layers) {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.ellipse(sc.x, sc.y, baseRx * mul, baseRy * mul, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  const keyDir = STUDIO_KEY_DIR;
  const fillDir = STUDIO_FILL_DIR;
  const bounceDir = STUDIO_BOUNCE_DIR;

  const overlayLines: StrokeLine3D[] = [];
  const physicalLines: StrokeLine3D[] = [];
  for (const ln of scene.lines) {
    if (ln.overlay || ln.dash) {
      overlayLines.push(ln);
    } else {
      physicalLines.push(ln);
    }
  }

  // Priority-1 WebGPU -> Priority-2 WebGL2 -> Priority-3 Canvas2D hardware rendering cascade
  let activeBackend: Studio3DRenderBackend = 'canvas2d';
  const candidateGpu: Studio3DGpuRenderer | null =
    gpuRenderer !== undefined
      ? gpuRenderer && gpuRenderer.isAvailable()
        ? gpuRenderer
        : null
      : (getSharedStudio3DWebGPURenderer() ?? getSharedStudio3DWebGL2Renderer());

  let renderedOnGpu = false;
  if (candidateGpu && candidateGpu.isAvailable() && typeof ctx.drawImage === 'function') {
    const gpuResult = candidateGpu.render({
      quads: scene.quads,
      physicalLines,
      camera: {
        camPos,
        camFwd,
        camRight,
        camUp,
        focal,
        width: rw,
        height: rh,
        dpr,
      },
      keyDir,
      fillDir,
      shader,
    });
    if (gpuResult.ok) {
      ctx.drawImage(candidateGpu.canvas, rx, ry, rw, rh);
      activeBackend = candidateGpu.backend;
      renderedOnGpu = true;
    }
  }

  if (!renderedOnGpu) {
    type RenderItem =
      | {
          readonly kind: 'quad';
          readonly depth: number;
          readonly pts2d: readonly [
            { x: number; y: number },
            { x: number; y: number },
            { x: number; y: number },
            { x: number; y: number },
          ];
          readonly fill: string | CanvasGradient;
          readonly stroke: string | CanvasGradient;
          readonly strokeW: number;
        }
      | {
          readonly kind: 'seg';
          readonly depth: number;
          readonly x0: number;
          readonly y0: number;
          readonly x1: number;
          readonly y1: number;
          readonly stroke: string;
          readonly width: number;
        };

    const renderQueue: RenderItem[] = [];
    const evalLitRgb = (
      normal3: Vec3,
      pos3: Vec3,
      q: QuadFace,
      overrideRgb?: Rgb,
    ): { r: number; g: number; b: number; lum: number } =>
      evalStudioPbrLitRgb(normal3, pos3, camPos, keyDir, fillDir, bounceDir, q, shader, overrideRgb);

    const toCssColor = (c: { r: number; g: number; b: number }, alpha: number): string =>
      alpha < 0.999 ? `rgba(${c.r},${c.g},${c.b},${alpha.toFixed(2)})` : `rgb(${c.r},${c.g},${c.b})`;

    for (const q of scene.quads) {
      const p0 = project(q.verts[0]);
      const p1 = project(q.verts[1]);
      const p2 = project(q.verts[2]);
      const p3 = project(q.verts[3]);
      if (!p0.valid || !p1.valid || !p2.valid || !p3.valid) continue;

      const center3: Vec3 = [
        (q.verts[0][0] + q.verts[1][0] + q.verts[2][0] + q.verts[3][0]) * 0.25,
        (q.verts[0][1] + q.verts[1][1] + q.verts[2][1] + q.verts[3][1]) * 0.25,
        (q.verts[0][2] + q.verts[1][2] + q.verts[2][2] + q.verts[3][2]) * 0.25,
      ];
      const viewDir = norm3(sub3(camPos, center3));
      const faceN = norm3(cross3(sub3(q.verts[1], q.verts[0]), sub3(q.verts[3], q.verts[0])));

      // Backface cull closed opaque solids so thin mats/rails/cushions & rear limb hemispheres never bleed through
      if (q.alpha >= 0.99) {
        if (q.cullBackface) {
          if (dot3(faceN, viewDir) <= 0) continue;
        } else if (q.vNormals) {
          const avgOutward = norm3([
            q.vNormals[0][0] + q.vNormals[1][0] + q.vNormals[2][0] + q.vNormals[3][0],
            q.vNormals[0][1] + q.vNormals[1][1] + q.vNormals[2][1] + q.vNormals[3][1],
            q.vNormals[0][2] + q.vNormals[1][2] + q.vNormals[2][2] + q.vNormals[3][2],
          ]);
          if (dot3(avgOutward, viewDir) < -0.06) continue;
        }
      }

      const shadingNormal = q.vNormals
        ? norm3([
            q.vNormals[0][0] + q.vNormals[1][0] + q.vNormals[2][0] + q.vNormals[3][0],
            q.vNormals[0][1] + q.vNormals[1][1] + q.vNormals[2][1] + q.vNormals[3][1],
            q.vNormals[0][2] + q.vNormals[1][2] + q.vNormals[2][2] + q.vNormals[3][2],
          ])
        : faceN;
      const avgRgb: Rgb | undefined = q.vColors
        ? [
            Math.round((q.vColors[0][0] + q.vColors[1][0] + q.vColors[2][0] + q.vColors[3][0]) * 0.25),
            Math.round((q.vColors[0][1] + q.vColors[1][1] + q.vColors[2][1] + q.vColors[3][1]) * 0.25),
            Math.round((q.vColors[0][2] + q.vColors[1][2] + q.vColors[2][2] + q.vColors[3][2]) * 0.25),
          ]
        : undefined;
      const centerLit = evalLitRgb(shadingNormal, center3, q, avgRgb);
      const flatCss = toCssColor(centerLit, q.alpha);
      let fillStyle: string | CanvasGradient = flatCss;

      // Gouraud smooth shading across curved organic, cylindrical & micro-beveled quads via 2-stop gradient
      if (q.vNormals && shader !== 'clay-wire' && typeof ctx.createLinearGradient === 'function') {
        const pts2d = [p0, p1, p2, p3] as const;
        const vLits = [
          evalLitRgb(q.vNormals[0], q.verts[0], q, q.vColors?.[0]),
          evalLitRgb(q.vNormals[1], q.verts[1], q, q.vColors?.[1]),
          evalLitRgb(q.vNormals[2], q.verts[2], q, q.vColors?.[2]),
          evalLitRgb(q.vNormals[3], q.verts[3], q, q.vColors?.[3]),
        ] as const;
        let minI = 0;
        let maxI = 0;
        for (let i = 1; i < 4; i++) {
          if (vLits[i]!.lum < vLits[minI]!.lum) minI = i;
          if (vLits[i]!.lum > vLits[maxI]!.lum) maxI = i;
        }
        const dxG = pts2d[maxI]!.x - pts2d[minI]!.x;
        const dyG = pts2d[maxI]!.y - pts2d[minI]!.y;
        if (vLits[maxI]!.lum - vLits[minI]!.lum >= 2.2 && dxG * dxG + dyG * dyG > 1.2) {
          const gGrad = ctx.createLinearGradient(
            pts2d[minI]!.x,
            pts2d[minI]!.y,
            pts2d[maxI]!.x,
            pts2d[maxI]!.y,
          );
          gGrad.addColorStop(0, toCssColor(vLits[minI]!, q.alpha));
          gGrad.addColorStop(1, toCssColor(vLits[maxI]!, q.alpha));
          fillStyle = gGrad;
        }
      }

      renderQueue.push({
        kind: 'quad',
        pts2d: [p0, p1, p2, p3],
        depth: (p0.zCam + p1.zCam + p2.zCam + p3.zCam) * 0.25 + (q.depthBias ?? 0),
        fill: fillStyle,
        stroke:
          shader === 'clay-wire'
            ? 'rgba(42, 58, 50, 0.28)'
            : q.alpha < 0.999
              ? 'rgba(110,231,183,0.18)'
              : fillStyle,
        strokeW: shader === 'clay-wire' ? 0.72 : 0.48,
      });
    }

    // Depth-sort physical 3D springs, ropes, and piping alongside mesh quads in Canvas2D fallback
    for (const ln of physicalLines) {
      for (let i = 0; i < ln.pts.length - 1; i++) {
        const pa = project(ln.pts[i]!);
        const pb = project(ln.pts[i + 1]!);
        if (!pa.valid || !pb.valid) continue;
        renderQueue.push({
          kind: 'seg',
          depth: (pa.zCam + pb.zCam) * 0.5 - 0.004 + (ln.depthBias ?? 0),
          x0: pa.x,
          y0: pa.y,
          x1: pb.x,
          y1: pb.y,
          stroke: ln.stroke,
          width: ln.width,
        });
      }
    }

    renderQueue.sort((a, b) => b.depth - a.depth);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const item of renderQueue) {
      if (item.kind === 'quad') {
        ctx.beginPath();
        ctx.moveTo(item.pts2d[0].x, item.pts2d[0].y);
        ctx.lineTo(item.pts2d[1].x, item.pts2d[1].y);
        ctx.lineTo(item.pts2d[2].x, item.pts2d[2].y);
        ctx.lineTo(item.pts2d[3].x, item.pts2d[3].y);
        ctx.closePath();
        ctx.fillStyle = item.fill;
        ctx.fill();
        ctx.strokeStyle = item.stroke;
        ctx.lineWidth = item.strokeW;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(item.x0, item.y0);
        ctx.lineTo(item.x1, item.y1);
        ctx.strokeStyle = item.stroke;
        ctx.lineWidth = item.width;
        ctx.stroke();
      }
    }
  }

  // Foreground Kinematic Overlays (Trajectory Excursion, Skeleton X-Ray, Plumb Line, Spring Force Arrows)
  for (const ln of overlayLines) {
    ctx.save();
    ctx.strokeStyle = ln.stroke;
    ctx.fillStyle = ln.stroke;
    ctx.lineWidth = ln.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (ln.dash) ctx.setLineDash([...ln.dash]);
    ctx.beginPath();
    const projectedPts: { x: number; y: number }[] = [];
    for (const pt of ln.pts) {
      const pr = project(pt);
      if (!pr.valid) continue;
      if (projectedPts.length === 0) {
        ctx.moveTo(pr.x, pr.y);
      } else {
        ctx.lineTo(pr.x, pr.y);
      }
      projectedPts.push({ x: pr.x, y: pr.y });
    }
    if (projectedPts.length > 0) ctx.stroke();
    if (ln.arrowEnd && projectedPts.length >= 2) {
      const tip = projectedPts[projectedPts.length - 1]!;
      const prev = projectedPts[projectedPts.length - 2]!;
      const dx = tip.x - prev.x;
      const dy = tip.y - prev.y;
      const segLen = Math.hypot(dx, dy);
      if (segLen > 3) {
        const ux = dx / segLen;
        const uy = dy / segLen;
        const headLen = Math.min(11, Math.max(7, ln.width * 3.4));
        const headW = headLen * 0.56;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(tip.x, tip.y);
        ctx.lineTo(tip.x - ux * headLen - uy * headW, tip.y - uy * headLen + ux * headW);
        ctx.lineTo(tip.x - ux * headLen + uy * headW, tip.y - uy * headLen - ux * headW);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // 3D Biomechanical Callouts (Angles & CoM)
  if (scene.callouts.length > 0) {
    ctx.save();
    ctx.font = '700 10.5px system-ui, -apple-system, sans-serif';
    for (const c of scene.callouts) {
      const pr = project(c.pos);
      if (!pr.valid) continue;
      const padX = 6;
      const textW = Math.max(44, c.text.length * 6.4);
      const bx = pr.x - textW * 0.5 - padX;
      const by = pr.y - 10;
      ctx.fillStyle = c.bg;
      ctx.beginPath();
      ctx.arc(pr.x, pr.y + 8, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(bx, by - 8, textW + padX * 2, 18);
      ctx.fillStyle = c.fg;
      ctx.fillText(c.text, bx + padX, by + 4);
    }
    ctx.restore();
  }

  // Project interactive 3D coaching hotspots & highlight active selection
  if (collectHotspots) {
    for (const hDef of scene.hotspotDefs) {
      const pr = project(hDef.pos3d);
      if (!pr.valid) continue;
      collectHotspots.push({
        id: hDef.id,
        labelKo: hDef.labelKo,
        metricKo: hDef.metricKo,
        cueKo: hDef.cueKo,
        x: Math.round(pr.x * 10) / 10,
        y: Math.round(pr.y * 10) / 10,
        pos3d: hDef.pos3d,
      });
      const isSelected = selectedHotspotId === hDef.id;
      if (isSelected) {
        ctx.save();
        ctx.strokeStyle = 'rgba(31, 68, 53, 0.26)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, 13, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = '#1F4435';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1F4435';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // Region Badge (for Dual View)
  if (regionLabel) {
    const badgeX = rx === 0 ? rx + 148 : rx + 10;
    ctx.save();
    ctx.fillStyle =
      shader === 'studio-pbr' || shader === 'clay-wire'
        ? 'rgba(255, 253, 248, 0.88)'
        : 'rgba(15, 30, 25, 0.82)';
    ctx.fillRect(badgeX, ry + rh - 28, Math.max(90, regionLabel.length * 7.8), 20);
    ctx.fillStyle = shader === 'studio-pbr' || shader === 'clay-wire' ? '#193C33' : '#D1FAE5';
    ctx.font = '700 10px system-ui, -apple-system, sans-serif';
    ctx.fillText(regionLabel, badgeX + 6, ry + rh - 14);
    ctx.restore();
  }

  // XYZ Orientation Axis Gizmo in Bottom-Right of Region
  const gizmoCx = rx + rw - 36;
  const gizmoCy = ry + rh - 36;
  ctx.save();
  ctx.fillStyle =
    shader === 'studio-pbr' || shader === 'clay-wire'
      ? 'rgba(255,255,255,0.84)'
      : 'rgba(15,30,25,0.78)';
  ctx.beginPath();
  ctx.arc(gizmoCx, gizmoCy, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = '600 8.5px system-ui, -apple-system, sans-serif';
  for (const ax of STUDIO_GIZMO_AXES) {
    const sx = dot3(ax.vec, camRight) * 16;
    const sy = -dot3(ax.vec, camUp) * 16;
    ctx.strokeStyle = ax.col;
    ctx.lineWidth = 1.9;
    ctx.beginPath();
    ctx.moveTo(gizmoCx, gizmoCy);
    ctx.lineTo(gizmoCx + sx, gizmoCy + sy);
    ctx.stroke();
    ctx.fillStyle = ax.col;
    ctx.fillText(ax.lbl, gizmoCx + sx * 1.24 - 3, gizmoCy + sy * 1.24 + 3);
  }
  ctx.restore();

  ctx.restore();
  return activeBackend;
}

export function renderRealtimeStudio3DFrame({
  ctx,
  width,
  height,
  dpr = 1,
  gpuRenderer,
  exercise,
  phaseT,
  yawDeg,
  pitchDeg,
  zoom,
  panX = 0,
  panY = 0,
  shader,
  mirrored = false,
  showBiomechOverlay = false,
  showMuscleHeatmap = false,
  dualView = false,
  springOverride,
  footbarOverride,
  headrestOverride,
  propOverride,
  selectedHotspotId = null,
}: Render3DFrameOptions): {
  readonly signatureId: Studio3DSignatureId;
  readonly activeZonesCount: number;
  readonly activeZones: readonly ActiveMuscleZone3D[];
  readonly springStretchPct: number;
  readonly biomechTelemetry: Biomech3DTelemetry;
  readonly hotspots: readonly Studio3DHotspot[];
  readonly renderBackend: Studio3DRenderBackend;
  readonly characterPipeline: Studio3DCharacterPipeline;
  readonly apparatusPipeline: Studio3DApparatusPipeline;
} {
  const scene = buildStudio3DScene({
    exercise,
    phaseT,
    shader,
    mirrored,
    showBiomechOverlay,
    showMuscleHeatmap,
    springOverride,
    footbarOverride,
    headrestOverride,
    propOverride,
  });
  const hotspots: Studio3DHotspot[] = [];
  let renderBackend: Studio3DRenderBackend;

  if (dualView && width >= 440) {
    const leftW = Math.round(width * 0.58);
    const rightW = width - leftW;
    renderBackend = drawSceneRegion({
      ctx,
      scene,
      rx: 0,
      ry: 0,
      rw: leftW,
      rh: height,
      dpr,
      gpuRenderer,
      yawDeg,
      pitchDeg,
      zoom,
      panX,
      panY,
      shader,
      regionLabel: `3D 자유 회전 (${Math.round(yawDeg)}°/${Math.round(pitchDeg)}°)`,
      selectedHotspotId,
      collectHotspots: hotspots,
    });
    drawSceneRegion({
      ctx,
      scene,
      rx: leftW,
      ry: 0,
      rw: rightW,
      rh: height,
      dpr,
      gpuRenderer,
      yawDeg: 0,
      pitchDeg: 10,
      zoom: Math.max(0.95, zoom * 0.96),
      shader,
      regionLabel: '시상면 0° 정렬 비교',
      selectedHotspotId,
    });
    ctx.save();
    ctx.strokeStyle =
      shader === 'studio-pbr' || shader === 'clay-wire'
        ? 'rgba(25, 60, 51, 0.22)'
        : 'rgba(110, 231, 183, 0.32)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(leftW, 0);
    ctx.lineTo(leftW, height);
    ctx.stroke();
    ctx.restore();
  } else {
    renderBackend = drawSceneRegion({
      ctx,
      scene,
      rx: 0,
      ry: 0,
      rw: width,
      rh: height,
      dpr,
      gpuRenderer,
      yawDeg,
      pitchDeg,
      zoom,
      panX,
      panY,
      shader,
      selectedHotspotId,
      collectHotspots: hotspots,
    });
  }

  return {
    signatureId: scene.signatureId,
    activeZonesCount: scene.activeZonesCount,
    activeZones: scene.activeZones,
    springStretchPct: scene.springStretchPct,
    biomechTelemetry: scene.biomechTelemetry,
    hotspots,
    renderBackend,
    characterPipeline: scene.characterPipeline,
    apparatusPipeline: scene.apparatusPipeline,
  };
}

export interface Projected3DSvgElement {
  readonly kind: 'path' | 'polygon' | 'line';
  readonly d?: string;
  readonly points?: string;
  readonly x1?: number;
  readonly y1?: number;
  readonly x2?: number;
  readonly y2?: number;
  readonly fill?: string;
  readonly stroke: string;
  readonly strokeWidth: number;
}

interface Projected3DSvgResult {
  readonly shadows: readonly { cx: number; cy: number; rx: number; ry: number }[];
  readonly elements: readonly Projected3DSvgElement[];
}

const PROJECTED_SVG_LRU = new Map<string, Projected3DSvgResult>();
const PROJECTED_SVG_LRU_MAX = 192;

/**
 * Deterministic SSR-safe 3D camera projection + Blinn-Phong studio lighting for inline `<svg>`
 * fallback / procedural 3D custom exercises (`NativeExerciseMotionArtwork`).
 * Uses depth-sliced `<path>` run batching and LRU caching for fast DOM mounting.
 */
export function projectStudio3DSceneForSvg(
  exercise: PilatesExercise,
  phaseT: number,
  width = 640,
  height = 400,
): Projected3DSvgResult {
  const dedicatedKey = hasDedicated3DExerciseRig(exercise) ? exercise.id : 'proc';
  const cacheKey = `${dedicatedKey}|${exercise.apparatus}|${exercise.bodyPosition}|${exercise.blockCategory}|${exercise.box ?? ''}|${(exercise.props ?? []).join(',')}|${phaseT.toFixed(3)}|${width}x${height}`;
  const cached = PROJECTED_SVG_LRU.get(cacheKey);
  if (cached) {
    return cached;
  }

  const scene = buildStudio3DScene({
    exercise,
    phaseT,
    shader: 'studio-pbr',
    mirrored: false,
    showBiomechOverlay: false,
    svgFastMode: true,
  });

  const {
    baseCamPos: camPos,
    camFwd,
    camRight,
    camUp,
    focal,
  } = studioCamera(scene, width, height, -34, 21, 1.04);

  const project = (pt: Vec3) => {
    const rel = sub3(pt, camPos);
    const zCam = dot3(rel, camFwd);
    if (zCam <= 0.12) return null;
    const xCam = dot3(rel, camRight);
    const yCam = dot3(rel, camUp);
    return {
      x: Math.round((width * 0.5 + (xCam / zCam) * focal) * 10) / 10,
      y: Math.round((height * 0.54 - (yCam / zCam) * focal) * 10) / 10,
      zCam,
    };
  };

  const shadows: { cx: number; cy: number; rx: number; ry: number }[] = [];
  for (const sh of scene.shadowAnchors) {
    const sc = project(sh.pos);
    if (!sc) continue;
    const scalePx = focal / sc.zCam;
    shadows.push({
      cx: sc.x,
      cy: sc.y,
      rx: Math.round(Math.max(18, sh.rx * scalePx * 0.72) * 10) / 10,
      ry: Math.round(Math.max(7, sh.ry * scalePx * 0.42) * 10) / 10,
    });
  }

  const keyDir = STUDIO_KEY_DIR;
  const fillDir = STUDIO_FILL_DIR;
  const bounceDir = STUDIO_BOUNCE_DIR;

  const queue: {
    readonly isPoly: boolean;
    readonly depth: number;
    readonly subD: string;
    readonly fill?: string;
    readonly stroke: string;
    readonly strokeWidth: number;
  }[] = [];

  for (const q of scene.quads) {
    const p0 = project(q.verts[0]);
    const p1 = project(q.verts[1]);
    const p2 = project(q.verts[2]);
    const p3 = project(q.verts[3]);
    if (!p0 || !p1 || !p2 || !p3) continue;
    const center3: Vec3 = [
      (q.verts[0][0] + q.verts[1][0] + q.verts[2][0] + q.verts[3][0]) * 0.25,
      (q.verts[0][1] + q.verts[1][1] + q.verts[2][1] + q.verts[3][1]) * 0.25,
      (q.verts[0][2] + q.verts[1][2] + q.verts[2][2] + q.verts[3][2]) * 0.25,
    ];
    const viewDir = norm3(sub3(camPos, center3));
    const faceN = norm3(cross3(sub3(q.verts[1], q.verts[0]), sub3(q.verts[3], q.verts[0])));
    if (q.alpha >= 0.99) {
      if (q.cullBackface) {
        if (dot3(faceN, viewDir) <= 0) continue;
      } else if (q.vNormals) {
        const avgOut = norm3([
          q.vNormals[0][0] + q.vNormals[1][0] + q.vNormals[2][0] + q.vNormals[3][0],
          q.vNormals[0][1] + q.vNormals[1][1] + q.vNormals[2][1] + q.vNormals[3][1],
          q.vNormals[0][2] + q.vNormals[1][2] + q.vNormals[2][2] + q.vNormals[3][2],
        ]);
        if (dot3(avgOut, viewDir) < -0.06) continue;
      }
    }
    const shadingN = q.vNormals
      ? norm3([
          q.vNormals[0][0] + q.vNormals[1][0] + q.vNormals[2][0] + q.vNormals[3][0],
          q.vNormals[0][1] + q.vNormals[1][1] + q.vNormals[2][1] + q.vNormals[3][1],
          q.vNormals[0][2] + q.vNormals[1][2] + q.vNormals[2][2] + q.vNormals[3][2],
        ])
      : faceN;
    const lit = evalStudioPbrLitRgb(
      shadingN,
      center3,
      camPos,
      keyDir,
      fillDir,
      bounceDir,
      q,
      'studio-pbr',
    );
    const r = Math.min(255, Math.round(lit.r / 12) * 12);
    const g = Math.min(255, Math.round(lit.g / 12) * 12);
    const b = Math.min(255, Math.round(lit.b / 12) * 12);
    const css = `rgb(${r},${g},${b})`;
    queue.push({
      isPoly: true,
      depth: (p0.zCam + p1.zCam + p2.zCam + p3.zCam) * 0.25 + (q.depthBias ?? 0),
      subD: `M${p0.x},${p0.y}L${p1.x},${p1.y}L${p2.x},${p2.y}L${p3.x},${p3.y}Z`,
      fill: css,
      stroke: css,
      strokeWidth: 0.6,
    });
  }

  for (const ln of scene.lines) {
    if (ln.overlay || ln.dash) continue;
    for (let i = 0; i < ln.pts.length - 1; i++) {
      const pa = project(ln.pts[i]!);
      const pb = project(ln.pts[i + 1]!);
      if (!pa || !pb) continue;
      queue.push({
        isPoly: false,
        depth: (pa.zCam + pb.zCam) * 0.5 - 0.004 + (ln.depthBias ?? 0),
        subD: `M${pa.x},${pa.y}L${pb.x},${pb.y}`,
        stroke: ln.stroke,
        strokeWidth: ln.width,
      });
    }
  }

  queue.sort((a, b) => b.depth - a.depth);

  // Batch across 4 depth slices by quantized style for crisp SVG Z-order & fast DOM mounting
  const BAND_SIZE = Math.max(160, Math.ceil(queue.length / 4));
  const batched: Projected3DSvgElement[] = [];
  for (let bandStart = 0; bandStart < queue.length; bandStart += BAND_SIZE) {
    const bandEnd = Math.min(queue.length, bandStart + BAND_SIZE);
    const groups = new Map<
      string,
      { fill?: string; stroke: string; strokeWidth: number; dParts: string[] }
    >();
    for (let idx = bandStart; idx < bandEnd; idx++) {
      const item = queue[idx]!;
      const styleKey = `${item.fill ?? 'none'}|${item.stroke}|${item.strokeWidth}`;
      const existing = groups.get(styleKey);
      if (existing) {
        existing.dParts.push(item.subD);
      } else {
        groups.set(styleKey, {
          fill: item.fill,
          stroke: item.stroke,
          strokeWidth: item.strokeWidth,
          dParts: [item.subD],
        });
      }
    }
    for (const grp of groups.values()) {
      batched.push({
        kind: 'path',
        d: grp.dParts.join(''),
        fill: grp.fill,
        stroke: grp.stroke,
        strokeWidth: grp.strokeWidth,
      });
    }
  }

  const result: Projected3DSvgResult = { shadows, elements: batched };
  if (PROJECTED_SVG_LRU.size >= PROJECTED_SVG_LRU_MAX) {
    const oldest = PROJECTED_SVG_LRU.keys().next().value;
    if (oldest !== undefined) PROJECTED_SVG_LRU.delete(oldest);
  }
  PROJECTED_SVG_LRU.set(cacheKey, result);
  return result;
}
