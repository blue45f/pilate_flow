import type { ApparatusType, FootbarState, HeadrestState, PilatesExercise } from '../types/pilates';
import { MOTION_STUDIO_MATERIALS, MOTION_STUDIO_RGB } from './motionStudioMaterials';
import {
  resolveStudio3DMotionForExercise,
  type Studio3DSignatureId,
} from './studio3dMotionCatalog';

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

function interiorAngleDeg(a: Vec3, vertex: Vec3, b: Vec3): number {
  const u = norm3(sub3(a, vertex));
  const v = norm3(sub3(b, vertex));
  const c = Math.max(-1, Math.min(1, dot3(u, v)));
  return Math.round((Math.acos(c) * 180) / Math.PI);
}

function solve2BoneIK(root: Vec3, target: Vec3, l1: number, l2: number, pole: Vec3): [Vec3, Vec3] {
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
  return [mid, tgt];
}

interface PoseRigKeyframe {
  readonly pelvis: Vec3;
  readonly spineMid: Vec3;
  readonly chest: Vec3;
  readonly antHint: Vec3;
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
  readonly rolldownBar?: readonly [number, number];
  readonly pushthroughDeg?: number;
  readonly withLongbox?: boolean;
  readonly withJumpboard?: boolean;
  readonly withChairHandles?: boolean;
  readonly isSpineCorrector?: boolean;
  readonly ropeToFeet?: boolean;
  readonly ropeToHands?: boolean;
  readonly legSprings?: boolean;
  readonly activeZones: readonly (
    'quads' | 'glutes' | 'core' | 'obliques' | 'back' | 'adductors'
  )[];
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

interface QuadFace {
  readonly verts: readonly [Vec3, Vec3, Vec3, Vec3];
  readonly vNormals?: readonly [Vec3, Vec3, Vec3, Vec3];
  readonly cullBackface?: boolean;
  readonly depthBias?: number;
  readonly baseRgb: Rgb;
  readonly alpha: number;
  readonly spec: number;
  readonly shininess?: number;
  readonly emissive?: number;
}

interface StrokeLine3D {
  readonly pts: readonly Vec3[];
  readonly stroke: string;
  readonly width: number;
  readonly dash?: readonly number[];
  readonly overlay?: boolean;
  readonly depthBias?: number;
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
): QuadFace[] {
  const [cx, cy, cz] = center;
  const [wx, wy, wz] = dims;
  const nx = Math.max(1, Math.min(10, Math.ceil(wx / 0.24)));
  const ny = Math.max(1, Math.min(5, Math.ceil(wy / 0.24)));
  const nz = Math.max(1, Math.min(4, Math.ceil(wz / 0.24)));
  const x0 = cx - wx * 0.5;
  const y0 = cy - wy * 0.5;
  const z0 = cz - wz * 0.5;
  const dx = wx / nx;
  const dy = wy / ny;
  const dz = wz / nz;
  const out: QuadFace[] = [];

  for (let ix = 0; ix < nx; ix++) {
    for (let iy = 0; iy < ny; iy++) {
      const xa = x0 + ix * dx;
      const xb = xa + dx;
      const ya = y0 + iy * dy;
      const yb = ya + dy;
      out.push({
        verts: [
          [xa, ya, z0 + wz],
          [xb, ya, z0 + wz],
          [xb, yb, z0 + wz],
          [xa, yb, z0 + wz],
        ],
        cullBackface: true,
        baseRgb: rgb,
        alpha,
        spec,
        shininess,
      });
      out.push({
        verts: [
          [xa, yb, z0],
          [xb, yb, z0],
          [xb, ya, z0],
          [xa, ya, z0],
        ],
        cullBackface: true,
        baseRgb: rgb,
        alpha,
        spec,
        shininess,
      });
    }
  }
  for (let ix = 0; ix < nx; ix++) {
    for (let iz = 0; iz < nz; iz++) {
      const xa = x0 + ix * dx;
      const xb = xa + dx;
      const za = z0 + iz * dz;
      const zb = za + dz;
      out.push({
        verts: [
          [xa, y0, za],
          [xb, y0, za],
          [xb, y0, zb],
          [xa, y0, zb],
        ],
        cullBackface: true,
        baseRgb: rgb,
        alpha,
        spec,
        shininess,
      });
      out.push({
        verts: [
          [xb, y0 + wy, za],
          [xa, y0 + wy, za],
          [xa, y0 + wy, zb],
          [xb, y0 + wy, zb],
        ],
        cullBackface: true,
        baseRgb: rgb,
        alpha,
        spec,
        shininess,
      });
    }
  }
  for (let iy = 0; iy < ny; iy++) {
    for (let iz = 0; iz < nz; iz++) {
      const ya = y0 + iy * dy;
      const yb = ya + dy;
      const za = z0 + iz * dz;
      const zb = za + dz;
      out.push({
        verts: [
          [x0 + wx, ya, za],
          [x0 + wx, yb, za],
          [x0 + wx, yb, zb],
          [x0 + wx, ya, zb],
        ],
        cullBackface: true,
        baseRgb: rgb,
        alpha,
        spec,
        shininess,
      });
      out.push({
        verts: [
          [x0, yb, za],
          [x0, ya, za],
          [x0, ya, zb],
          [x0, yb, zb],
        ],
        cullBackface: true,
        baseRgb: rgb,
        alpha,
        spec,
        shininess,
      });
    }
  }
  return out;
}

/**
 * Upholstered cushion with two-tier chamfered top crown and contrast ivory seam piping.
 */
function makePipedCushion(
  center: Vec3,
  dims: Vec3,
  leatherRgb: Rgb,
  pipingHex: string,
  alpha: number,
): { quads: QuadFace[]; piping: StrokeLine3D } {
  const [cx, cy, cz] = center;
  const [wx, wy, wz] = dims;
  // Single non-overlapping solid cushion volume (prevents coplanar Z-fighting across all angles)
  const cushionQuads = makeSubdividedBoxQuads(
    [cx, cy, cz],
    [wx, wy, wz],
    [
      Math.min(255, leatherRgb[0] + 5),
      Math.min(255, leatherRgb[1] + 6),
      Math.min(255, leatherRgb[2] + 5),
    ],
    alpha,
    0.28,
    26,
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
): QuadFace[] {
  const [cx, cy, cz] = center;
  const segs = 22;
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
        spec: 0.3,
        shininess: 26,
      });
    }

    // Upholstered edge rims + Curved White Oak side cheeks down to base rail
    for (const sy of [cy - widthY * 0.48, cy + widthY * 0.48]) {
      out.push({
        verts: [
          [xi0, sy, zi0],
          [xo0, sy, zo0],
          [xo1, sy, zo1],
          [xi1, sy, zi1],
        ],
        baseRgb: leatherRgb,
        alpha,
        spec: 0.24,
      });
      out.push({
        verts: [
          [xi0, sy, 0.055],
          [xi1, sy, 0.055],
          [xi1, sy, zi1],
          [xi0, sy, zi0],
        ],
        baseRgb: oakRgb,
        alpha,
        spec: 0.22,
      });
    }
  }
  return out;
}

function makeTaperedTubeQuads(
  pts: readonly Vec3[],
  radii: readonly [number, number][],
  rgb: Rgb,
  sides = 14,
  alpha = 1,
  spec = 0.24,
  emissive = 0,
  shininess = 24,
): QuadFace[] {
  if (pts.length < 2) return [];
  const tangents: Vec3[] = pts.map((_, i) => {
    if (i === 0) return norm3(sub3(pts[1]!, pts[0]!));
    if (i === pts.length - 1) return norm3(sub3(pts[i]!, pts[i - 1]!));
    return norm3(sub3(pts[i + 1]!, pts[i - 1]!));
  });
  let nrm: Vec3 = Math.abs(tangents[0]![2]) < 0.9 ? [0, 0, 1] : [0, 1, 0];
  nrm = norm3(sub3(nrm, mul3(tangents[0]!, dot3(nrm, tangents[0]!))));

  const rings: Vec3[][] = [];
  const ringNormals: Vec3[][] = [];
  for (let i = 0; i < pts.length; i++) {
    const t = tangents[i]!;
    let proj = sub3(nrm, mul3(t, dot3(nrm, t)));
    if (len3(proj) < 1e-5) {
      const alt: Vec3 = Math.abs(t[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
      proj = sub3(alt, mul3(t, dot3(alt, t)));
    }
    nrm = norm3(proj);
    const binrm = norm3(cross3(t, nrm));
    const [rx, ry] = radii[Math.min(i, radii.length - 1)]!;
    const ring: Vec3[] = [];
    const rNrm: Vec3[] = [];
    for (let k = 0; k < sides; k++) {
      const ang = (2 * Math.PI * k) / sides;
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      ring.push(add3(pts[i]!, add3(mul3(binrm, ca * rx), mul3(nrm, sa * ry))));
      rNrm.push(
        norm3(add3(mul3(binrm, ca / Math.max(0.008, rx)), mul3(nrm, sa / Math.max(0.008, ry)))),
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
  alpha = 1,
): QuadFace[] {
  const segs = 22;
  const ringsCount = 14;
  const rx = 0.075;
  const ry = 0.088;
  const rz = 0.096;

  const evalPt = (phi: number, th: number, isHair: boolean): Vec3 => {
    const cp = Math.cos(phi);
    const sp = Math.sin(phi);
    const lx = cp * Math.cos(th);
    const ly = cp * Math.sin(th);
    const lz = sp;
    // Subtle chin/jaw taper on lower-anterior hemisphere
    const jawTaper = lz < 0 && ly > 0 ? 1 - Math.min(0.22, -lz * ly * 0.34) : 1;
    const hairScale = isHair ? 1.032 : 1.0;
    return add3(
      center,
      add3(
        mul3(rightAxis, lx * rx * jawTaper * hairScale),
        add3(
          mul3(antAxis, ly * ry * (ly > 0 && lz < -0.15 ? 1.05 : 1) * hairScale),
          mul3(upAxis, lz * rz * hairScale),
        ),
      ),
    );
  };

  const evalNrm = (phi: number, th: number): Vec3 => {
    const cp = Math.cos(phi);
    const sp = Math.sin(phi);
    return norm3(
      add3(
        mul3(rightAxis, (cp * Math.cos(th)) / rx),
        add3(mul3(antAxis, (cp * Math.sin(th)) / ry), mul3(upAxis, sp / rz)),
      ),
    );
  };

  const quads: QuadFace[] = [];
  for (let r = 0; r < ringsCount; r++) {
    const phi0 = -Math.PI * 0.5 + (Math.PI * r) / ringsCount;
    const phi1 = -Math.PI * 0.5 + (Math.PI * (r + 1)) / ringsCount;
    const phiMid = (phi0 + phi1) * 0.5;
    for (let s = 0; s < segs; s++) {
      const th0 = (2 * Math.PI * s) / segs;
      const th1 = (2 * Math.PI * (s + 1)) / segs;
      const thMid = (th0 + th1) * 0.5;
      const lyMid = Math.cos(phiMid) * Math.sin(thMid);
      const lzMid = Math.sin(phiMid);
      // Posterior + crown hemisphere receives sleek hair cap without overlapping spheres
      const isHair = lzMid - lyMid * 0.68 > 0.06 || lyMid < -0.22;
      quads.push({
        verts: [
          evalPt(phi0, th0, isHair),
          evalPt(phi0, th1, isHair),
          evalPt(phi1, th1, isHair),
          evalPt(phi1, th0, isHair),
        ],
        vNormals: [evalNrm(phi0, th0), evalNrm(phi0, th1), evalNrm(phi1, th1), evalNrm(phi1, th0)],
        baseRgb: isHair ? hairRgb : skinRgb,
        alpha,
        spec: isHair ? 0.3 : 0.2,
        shininess: isHair ? 28 : 18,
      });
    }
  }
  return quads;
}

function makeCylinder3D(
  p0: Vec3,
  p1: Vec3,
  radius: number,
  rgb: Rgb,
  sides = 10,
  alpha = 1,
  spec = 0.46,
  shininess = 36,
): QuadFace[] {
  const segCount = Math.max(2, Math.min(8, Math.ceil(len3(sub3(p1, p0)) / 0.34)));
  const pts: Vec3[] = [];
  const radii: [number, number][] = [];
  for (let i = 0; i <= segCount; i++) {
    pts.push(vlerp(p0, p1, i / segCount));
    radii.push([radius, radius]);
  }
  return makeTaperedTubeQuads(pts, radii, rgb, sides, alpha, spec, 0, shininess);
}

function makeSphereQuads(
  center: Vec3,
  rx: number,
  ry: number,
  rz: number,
  rgb: Rgb,
  segs = 14,
  ringsCount = 8,
  alpha = 1,
  spec = 0.26,
  emissive = 0,
  shininess = 26,
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
  segs = 22,
  tubeSegs = 8,
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
      row.push([
        center[0] + sv * minorR,
        center[1] + (majorR + cv * minorR) * cu,
        center[2] + (majorR + cv * minorR) * su,
      ]);
      nRow.push(norm3([sv, cv * cu, cv * su]));
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
        spec: 0.42,
        shininess: 34,
      });
    }
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
  readonly exercise: PilatesExercise;
  readonly phaseT: number;
  readonly yawDeg: number;
  readonly pitchDeg: number;
  readonly zoom: number;
  readonly shader: Studio3DShaderPreset;
  readonly mirrored?: boolean;
  readonly showBiomechOverlay?: boolean;
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
  readonly signatureId: Studio3DSignatureId;
  readonly activeZonesCount: number;
  readonly springStretchPct: number;
  readonly biomechTelemetry: Biomech3DTelemetry;
}

function buildStudio3DScene(options: {
  exercise: PilatesExercise;
  phaseT: number;
  shader: Studio3DShaderPreset;
  mirrored: boolean;
  showBiomechOverlay: boolean;
  springOverride?: string;
  footbarOverride?: 'default' | FootbarState;
  headrestOverride?: 'default' | HeadrestState;
  propOverride?: Studio3DPropOverride;
}): Built3DScene {
  const {
    exercise,
    phaseT,
    shader,
    mirrored,
    showBiomechOverlay,
    springOverride,
    footbarOverride = 'default',
    headrestOverride = 'default',
    propOverride = 'default',
  } = options;

  const spec = resolveStudio3DMotionForExercise(exercise);
  const rawRig = samplePoseRig(spec.signatureId, phaseT);
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
      }
    : rawRig;

  const apparatus: ApparatusType = exercise.apparatus;
  const quads: QuadFace[] = [];
  const lines: StrokeLine3D[] = [];
  const callouts: LabelCallout3D[] = [];
  const shadowAnchors: { pos: Vec3; rx: number; ry: number }[] = [];

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
    propOverride === 'short-box' || (propOverride === 'default' && exercise.box === 'short-box');
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

  let springStretchPct = Math.round(smoothstep(phaseT) * 100);

  // 1. Flagship Luxury 3D Apparatus Geometry
  if (apparatus === 'reformer') {
    const cx = rig.carriageX ?? 0.12;
    springStretchPct =
      activeSpringColors.length === 0
        ? 0
        : Math.round(Math.max(8, Math.min(100, ((0.35 - cx) / 0.62) * 100)));

    shadowAnchors.push({ pos: [0, 0, 0.004], rx: 1.18, ry: 0.36 });

    // Beveled White Oak Side Rails + Walnut Corner Joinery + Stainless Glide Tracks
    quads.push(
      ...makeSubdividedBoxQuads([0, -0.3, 0.31], [2.34, 0.046, 0.12], oakRgb, appAlpha, 0.25),
    );
    quads.push(
      ...makeSubdividedBoxQuads([0, 0.3, 0.31], [2.34, 0.046, 0.12], oakRgb, appAlpha, 0.25),
    );
    quads.push(
      ...makeSubdividedBoxQuads([-1.15, 0, 0.31], [0.048, 0.62, 0.12], oakRgb, appAlpha, 0.25),
    );
    quads.push(
      ...makeSubdividedBoxQuads([1.15, 0, 0.31], [0.048, 0.62, 0.12], oakRgb, appAlpha, 0.25),
    );
    for (const sx of [-1.15, 1.15]) {
      for (const sy of [-0.3, 0.3]) {
        quads.push(
          ...makeSubdividedBoxQuads(
            [sx, sy, 0.31],
            [0.054, 0.052, 0.124],
            walnutRgb,
            appAlpha,
            0.28,
          ),
        );
      }
    }
    quads.push(
      ...makeSubdividedBoxQuads(
        [0, -0.266, 0.326],
        [2.22, 0.02, 0.02],
        steelRgb,
        appAlpha,
        0.5,
        40,
      ),
    );
    quads.push(
      ...makeSubdividedBoxQuads([0, 0.266, 0.326], [2.22, 0.02, 0.02], steelRgb, appAlpha, 0.5, 40),
    );

    // Tapered Cylindrical Oak Legs + Champagne Brass Ferrules + Charcoal Levelers
    for (const sx of [-1.08, 1.08]) {
      for (const sy of [-0.28, 0.28]) {
        quads.push(
          ...makeCylinder3D([sx, sy, 0.04], [sx, sy, 0.25], 0.029, oakRgb, 12, appAlpha, 0.24),
        );
        quads.push(
          ...makeCylinder3D(
            [sx, sy, 0.008],
            [sx, sy, 0.045],
            0.03,
            brassRgb,
            12,
            appAlpha,
            0.58,
            42,
          ),
        );
        quads.push(
          ...makeCylinder3D([sx, sy, 0], [sx, sy, 0.01], 0.032, charcoalRgb, 10, appAlpha, 0.15),
        );
      }
    }

    // Standing Platform + Charcoal Non-Slip Top + Brass Springbar
    quads.push(
      ...makeSubdividedBoxQuads(
        [1.04, 0, 0.369],
        [0.18, 0.58, 0.018],
        oakRgb,
        appAlpha,
        0.24,
      ).filter((q) => q.verts[0][2] < 0.377 || q.verts[2][2] < 0.377),
    );
    quads.push(
      ...makeSubdividedBoxQuads([1.04, 0, 0.384], [0.17, 0.56, 0.012], charcoalRgb, appAlpha, 0.18),
    );
    quads.push(
      ...makeCylinder3D(
        [0.92, -0.27, 0.335],
        [0.92, 0.27, 0.335],
        0.012,
        brassRgb,
        10,
        appAlpha,
        0.58,
      ),
    );

    // Walnut Carriage Perimeter Frame + Piped Sage Leather Cushion + Tilting Headrest + Sculpted Shoulder Blocks
    for (const sy of [-0.275, 0.275]) {
      quads.push(
        ...makeSubdividedBoxQuads(
          [cx + 0.08, sy, 0.354],
          [0.78, 0.024, 0.024],
          walnutRgb,
          appAlpha,
          0.26,
        ),
      );
    }
    for (const sx of [cx - 0.3, cx + 0.46]) {
      quads.push(
        ...makeSubdividedBoxQuads([sx, 0, 0.354], [0.024, 0.53, 0.024], walnutRgb, appAlpha, 0.26),
      );
    }
    const carriageCush = makePipedCushion(
      [cx + 0.08, 0, 0.39],
      [0.76, 0.54, 0.054],
      leatherRgb,
      pipingHex,
      appAlpha,
    );
    quads.push(...carriageCush.quads);
    lines.push(carriageCush.piping);

    const hrLift = effectiveHeadrest === 'up' ? 0.034 : 0.0;
    const headrestCush = makePipedCushion(
      [cx - 0.38, 0, 0.396 + hrLift * 0.5],
      [0.15, 0.23, 0.042 + hrLift],
      leatherRgb,
      pipingHex,
      appAlpha,
    );
    quads.push(...headrestCush.quads);
    lines.push(headrestCush.piping);

    for (const sy of [-0.135, 0.135]) {
      quads.push(
        ...makeCylinder3D(
          [cx - 0.21, sy, 0.39],
          [cx - 0.21, sy, 0.47],
          0.01,
          steelRgb,
          8,
          appAlpha,
          0.5,
        ),
      );
      const sb = makePipedCushion(
        [cx - 0.2, sy, 0.472],
        [0.064, 0.095, 0.106],
        leatherRgb,
        pipingHex,
        appAlpha,
      );
      quads.push(...sb.quads);
    }

    if (useLongBox) {
      const box = makePipedCushion(
        [cx + 0.06, 0, 0.525],
        [0.68, 0.39, 0.22],
        leatherRgb,
        pipingHex,
        appAlpha,
      );
      quads.push(...box.quads);
      lines.push(box.piping);
    } else if (useShortBox) {
      const box = makePipedCushion(
        [cx + 0.08, 0, 0.525],
        [0.42, 0.54, 0.22],
        leatherRgb,
        pipingHex,
        appAlpha,
      );
      quads.push(...box.quads);
      lines.push(box.piping);
    }

    if (useJumpboard) {
      const jb = makePipedCushion(
        [0.97, 0, 0.61],
        [0.048, 0.52, 0.48],
        leatherRgb,
        pipingHex,
        appAlpha,
      );
      quads.push(...jb.quads);
      lines.push(jb.piping);
    } else if (effectiveFootbar !== 'down' && effectiveFootbar !== 'none') {
      const fbZ = effectiveFootbar === 'low' ? 0.48 : effectiveFootbar === 'mid' ? 0.53 : 0.575;
      const fbX = effectiveFootbar === 'low' ? 0.88 : effectiveFootbar === 'mid' ? 0.85 : 0.825;
      quads.push(
        ...makeCylinder3D(
          [0.95, -0.28, 0.335],
          [fbX, -0.28, fbZ],
          0.013,
          steelRgb,
          10,
          appAlpha,
          0.52,
        ),
      );
      quads.push(
        ...makeCylinder3D(
          [0.95, 0.28, 0.335],
          [fbX, 0.28, fbZ],
          0.013,
          steelRgb,
          10,
          appAlpha,
          0.52,
        ),
      );
      quads.push(
        ...makeCylinder3D([fbX, -0.28, fbZ], [fbX, 0.28, fbZ], 0.014, steelRgb, 10, appAlpha, 0.52),
      );
      quads.push(
        ...makeCylinder3D(
          [fbX, -0.25, fbZ],
          [fbX, 0.25, fbZ],
          0.022,
          charcoalRgb,
          12,
          appAlpha,
          0.24,
        ),
      );
    }

    // Color-Coded Helical Springs + Brass Selector Knobs
    const count = activeSpringColors.length;
    for (let idx = 0; idx < count; idx++) {
      const sy = count === 1 ? 0 : lerp(-0.09, 0.09, idx / (count - 1));
      lines.push({
        pts: makeSpringPolyline([cx + 0.47, sy, 0.335], [0.91, sy, 0.335], 16, 0.013),
        stroke: activeSpringColors[idx]!,
        width: 2.3,
      });
      quads.push(
        ...makeSphereQuads([0.92, sy, 0.348], 0.01, 0.01, 0.01, brassRgb, 8, 6, appAlpha, 0.58),
      );
    }

    // Stainless Risers + Brass Pulley Wheels + Braided Cords + Double-Loop Leather Straps
    for (const ry of [-0.28, 0.28]) {
      quads.push(
        ...makeCylinder3D(
          [-1.13, ry, 0.35],
          [-1.13, ry, 0.66],
          0.013,
          steelRgb,
          10,
          appAlpha,
          0.52,
        ),
      );
      quads.push(
        ...makeSphereQuads(
          [-1.1, ry, 0.64],
          0.025,
          0.01,
          0.025,
          brassRgb,
          12,
          8,
          appAlpha,
          0.6,
          0,
          42,
        ),
      );
    }
    if (rig.ropeToFeet) {
      lines.push({ pts: [[-1.1, -0.275, 0.64], rig.lFoot], stroke: '#4A5852', width: 2.0 });
      lines.push({ pts: [[-1.1, 0.275, 0.64], rig.rFoot], stroke: '#4A5852', width: 2.0 });
    } else if (rig.ropeToHands) {
      lines.push({ pts: [[-1.1, -0.275, 0.64], rig.lHand], stroke: '#4A5852', width: 2.0 });
      lines.push({ pts: [[-1.1, 0.275, 0.64], rig.rHand], stroke: '#4A5852', width: 2.0 });
    } else {
      lines.push({
        pts: [
          [-1.1, -0.275, 0.64],
          [cx - 0.14, -0.23, 0.425],
        ],
        stroke: '#5C6B64',
        width: 1.6,
      });
      lines.push({
        pts: [
          [-1.1, 0.275, 0.64],
          [cx - 0.14, 0.23, 0.425],
        ],
        stroke: '#5C6B64',
        width: 1.6,
      });
    }
  } else if (apparatus === 'cadillac') {
    shadowAnchors.push({ pos: [0, 0, 0.004], rx: 1.12, ry: 0.38 });

    const bed = makePipedCushion(
      [0, 0, 0.545],
      [2.08, 0.64, 0.064],
      leatherRgb,
      pipingHex,
      appAlpha,
    );
    quads.push(...bed.quads);
    lines.push(bed.piping);

    quads.push(
      ...makeSubdividedBoxQuads([0, -0.32, 0.475], [2.14, 0.044, 0.092], oakRgb, appAlpha, 0.24),
    );
    quads.push(
      ...makeSubdividedBoxQuads([0, 0.32, 0.475], [2.14, 0.044, 0.092], oakRgb, appAlpha, 0.24),
    );
    quads.push(
      ...makeSubdividedBoxQuads([-1.05, 0, 0.475], [0.046, 0.68, 0.092], oakRgb, appAlpha, 0.24),
    );
    quads.push(
      ...makeSubdividedBoxQuads([1.05, 0, 0.475], [0.046, 0.68, 0.092], oakRgb, appAlpha, 0.24),
    );

    for (const sx of [-1.05, 1.05]) {
      for (const sy of [-0.31, 0.31]) {
        quads.push(
          ...makeCylinder3D([sx, sy, 0.03], [sx, sy, 0.44], 0.03, oakRgb, 10, appAlpha, 0.24),
        );
        quads.push(
          ...makeCylinder3D([sx, sy, 0], [sx, sy, 0.04], 0.031, brassRgb, 10, appAlpha, 0.58),
        );
        quads.push(
          ...makeCylinder3D([sx, sy, 0.51], [sx, sy, 1.95], 0.015, steelRgb, 8, appAlpha, 0.52),
        );
        quads.push(
          ...makeSphereQuads([sx, sy, 1.95], 0.025, 0.025, 0.025, brassRgb, 10, 8, appAlpha, 0.6),
        );
      }
    }
    for (const sy of [-0.31, 0.31]) {
      quads.push(
        ...makeCylinder3D([-1.05, sy, 1.95], [1.05, sy, 1.95], 0.015, steelRgb, 8, appAlpha, 0.52),
      );
    }
    for (const sx of [-1.05, 0.18, 0.62, 1.05]) {
      quads.push(
        ...makeCylinder3D([sx, -0.31, 1.95], [sx, 0.31, 1.95], 0.014, steelRgb, 8, appAlpha, 0.52),
      );
    }
    // Suspended Lambswool Fuzzies on Canopy Straps
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
          0.028,
          [238, 234, 224],
          10,
          appAlpha,
          0.16,
        ),
      );
    }
    if (rig.rolldownBar) {
      const [bx, bz] = rig.rolldownBar;
      quads.push(
        ...makeCylinder3D([bx, -0.26, bz], [bx, 0.26, bz], 0.017, walnutRgb, 10, appAlpha, 0.3),
      );
      lines.push({
        pts: makeSpringPolyline([1.05, -0.23, 1.74], [bx, -0.23, bz], 13),
        stroke: '#D49A24',
        width: 2.2,
      });
      lines.push({
        pts: makeSpringPolyline([1.05, 0.23, 1.74], [bx, 0.23, bz], 13),
        stroke: '#D49A24',
        width: 2.2,
      });
    }
    if (rig.pushthroughDeg !== undefined) {
      const rad = (rig.pushthroughDeg * Math.PI) / 180;
      const ex = 0.62 - Math.sin(rad) * 0.66;
      const ez = 1.84 - Math.cos(rad) * 0.66;
      const mx = (0.62 + ex) * 0.5;
      const mz = (1.84 + ez) * 0.5;
      quads.push(
        ...makeCylinder3D([0.62, -0.27, 1.94], [ex, -0.27, ez], 0.013, steelRgb, 8, appAlpha, 0.52),
      );
      quads.push(
        ...makeCylinder3D([0.62, 0.27, 1.94], [ex, 0.27, ez], 0.013, steelRgb, 8, appAlpha, 0.52),
      );
      quads.push(
        ...makeCylinder3D([mx, -0.27, mz], [mx, 0.27, mz], 0.011, steelRgb, 8, appAlpha, 0.52),
      );
      quads.push(
        ...makeCylinder3D([ex, -0.27, ez], [ex, 0.27, ez], 0.014, steelRgb, 8, appAlpha, 0.52),
      );
      quads.push(
        ...makeCylinder3D([ex, -0.19, ez], [ex, 0.19, ez], 0.019, charcoalRgb, 10, appAlpha, 0.22),
      );
      lines.push({
        pts: makeSpringPolyline([1.05, 0, 1.94], [mx, 0, mz], 13),
        stroke: activeSpringColors[0] ?? '#2A6EC4',
        width: 2.3,
      });
    }
    if (rig.legSprings) {
      lines.push({
        pts: makeSpringPolyline([-1.05, -0.24, 1.54], rig.lFoot, 15),
        stroke: '#D49A24',
        width: 2.2,
      });
      lines.push({
        pts: makeSpringPolyline([-1.05, 0.24, 1.54], rig.rFoot, 15),
        stroke: '#D49A24',
        width: 2.2,
      });
    }
  } else if (apparatus === 'chair') {
    const cx = -0.1;
    shadowAnchors.push({ pos: [cx, 0, 0.004], rx: 0.48, ry: 0.34 });

    quads.push(
      ...makeSubdividedBoxQuads([cx, -0.25, 0.285], [0.64, 0.038, 0.53], oakRgb, appAlpha, 0.24),
    );
    quads.push(
      ...makeSubdividedBoxQuads([cx, 0.25, 0.285], [0.64, 0.038, 0.53], oakRgb, appAlpha, 0.24),
    );
    quads.push(
      ...makeSubdividedBoxQuads([cx - 0.28, 0, 0.26], [0.036, 0.48, 0.44], oakRgb, appAlpha, 0.22),
    );
    quads.push(
      ...makeSubdividedBoxQuads(
        [cx + 0.04, -0.25, 0.022],
        [0.76, 0.052, 0.04],
        walnutRgb,
        appAlpha,
        0.26,
      ),
    );
    quads.push(
      ...makeSubdividedBoxQuads(
        [cx + 0.04, 0.25, 0.022],
        [0.76, 0.052, 0.04],
        walnutRgb,
        appAlpha,
        0.26,
      ),
    );

    const seat = makePipedCushion(
      [cx, 0, 0.58],
      [0.64, 0.54, 0.06],
      leatherRgb,
      pipingHex,
      appAlpha,
    );
    quads.push(...seat.quads);
    lines.push(seat.piping);

    const pdeg = rig.pedalDeg ?? 22;
    const rad = (pdeg * Math.PI) / 180;
    const px = cx - 0.1 + Math.cos(rad) * 0.52;
    const pz = 0.08 + Math.sin(rad) * 0.52;
    for (const py of [-0.105, 0.105]) {
      quads.push(
        ...makeCylinder3D([cx - 0.1, py, 0.08], [px, py, pz], 0.024, walnutRgb, 8, appAlpha, 0.28),
      );
      quads.push(
        ...makeCylinder3D(
          [
            vlerp([cx - 0.1, py, 0.08], [px, py, pz], 0.68)[0],
            py - 0.075,
            vlerp([cx - 0.1, py, 0.08], [px, py, pz], 0.68)[2] + 0.01,
          ],
          [
            vlerp([cx - 0.1, py, 0.08], [px, py, pz], 0.68)[0],
            py + 0.075,
            vlerp([cx - 0.1, py, 0.08], [px, py, pz], 0.68)[2] + 0.01,
          ],
          0.02,
          charcoalRgb,
          8,
          appAlpha,
          0.2,
        ),
      );
    }
    quads.push(
      ...makeCylinder3D([px, -0.21, pz], [px, 0.21, pz], 0.009, brassRgb, 8, appAlpha, 0.58),
    );

    lines.push({
      pts: makeSpringPolyline(
        [cx - 0.25, -0.08, 0.45],
        [(cx - 0.1 + px) * 0.55, -0.08, (0.08 + pz) * 0.55],
        12,
      ),
      stroke: activeSpringColors[0] ?? '#C9382B',
      width: 2.3,
    });
    lines.push({
      pts: makeSpringPolyline(
        [cx - 0.25, 0.08, 0.38],
        [(cx - 0.1 + px) * 0.55, 0.08, (0.08 + pz) * 0.55],
        12,
      ),
      stroke: activeSpringColors[1] ?? '#2A6EC4',
      width: 2.3,
    });
    if (rig.withChairHandles) {
      for (const sy of [-0.285, 0.285]) {
        quads.push(
          ...makeCylinder3D(
            [cx - 0.04, sy, 0.22],
            [cx - 0.04, sy, 1.24],
            0.014,
            steelRgb,
            10,
            appAlpha,
            0.52,
          ),
        );
        quads.push(
          ...makeCylinder3D(
            [cx - 0.04, sy, 1.24],
            [cx + 0.09, sy, 1.28],
            0.02,
            charcoalRgb,
            10,
            appAlpha,
            0.22,
          ),
        );
        quads.push(
          ...makeSphereQuads(
            [cx - 0.04, sy + (sy > 0 ? 0.024 : -0.024), 0.42],
            0.018,
            0.018,
            0.018,
            brassRgb,
            8,
            6,
            appAlpha,
            0.6,
          ),
        );
      }
    }
  } else if (apparatus === 'barrel') {
    if (rig.isSpineCorrector) {
      shadowAnchors.push({ pos: [0.04, 0, 0.004], rx: 0.56, ry: 0.3 });
      quads.push(
        ...makeBarrelArchVaultQuads(
          [-0.16, 0, 0.03],
          0.34,
          0.48,
          0.055,
          118,
          leatherRgb,
          oakRgb,
          appAlpha,
        ),
      );
      const stepSeat = makePipedCushion(
        [0.22, 0, 0.14],
        [0.38, 0.48, 0.14],
        leatherRgb,
        pipingHex,
        appAlpha,
      );
      quads.push(...stepSeat.quads);
      quads.push(
        ...makeSubdividedBoxQuads([0.04, -0.23, 0.04], [0.76, 0.03, 0.075], oakRgb, appAlpha, 0.24),
      );
      quads.push(
        ...makeSubdividedBoxQuads([0.04, 0.23, 0.04], [0.76, 0.03, 0.075], oakRgb, appAlpha, 0.24),
      );
    } else {
      shadowAnchors.push({ pos: [0.06, 0, 0.004], rx: 0.68, ry: 0.34 });
      quads.push(
        ...makeBarrelArchVaultQuads(
          [-0.3, 0, 0.55],
          0.33,
          0.56,
          0.062,
          148,
          leatherRgb,
          oakRgb,
          appAlpha,
        ),
      );
      for (const sy of [-0.275, 0.275]) {
        quads.push(
          ...makeSubdividedBoxQuads([0.08, sy, 0.032], [1.1, 0.05, 0.056], oakRgb, appAlpha, 0.24),
        );
        quads.push(
          ...makeCylinder3D(
            [0.52, sy, 0.04],
            [0.48, sy, 1.02],
            0.025,
            walnutRgb,
            10,
            appAlpha,
            0.28,
          ),
        );
        quads.push(
          ...makeSphereQuads(
            [-0.12, sy + (sy > 0 ? 0.034 : -0.034), 0.038],
            0.019,
            0.015,
            0.019,
            brassRgb,
            8,
            6,
            appAlpha,
            0.6,
          ),
        );
      }
      for (const rz of [0.22, 0.4, 0.58, 0.76, 0.94]) {
        const rx = 0.52 - (rz - 0.04) * 0.04;
        quads.push(
          ...makeCylinder3D([rx, -0.28, rz], [rx, 0.28, rz], 0.016, oakRgb, 10, appAlpha, 0.26),
        );
      }
    }
  } else {
    shadowAnchors.push({ pos: [0, 0, 0.004], rx: 1.08, ry: 0.44 });
    // Non-overlapping cork perimeter border around the upholstered studio mat (zero coplanar Z-fighting)
    for (const sy of [-0.37, 0.37]) {
      quads.push(
        ...makeSubdividedBoxQuads([0, sy, 0.015], [2.06, 0.06, 0.026], corkRgb, appAlpha, 0.16),
      );
    }
    for (const sx of [-0.995, 0.995]) {
      quads.push(
        ...makeSubdividedBoxQuads([sx, 0, 0.015], [0.07, 0.68, 0.026], corkRgb, appAlpha, 0.16),
      );
    }
    const matCush = makePipedCushion(
      [0, 0, 0.028],
      [1.92, 0.68, 0.034],
      leatherRgb,
      pipingHex,
      appAlpha,
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
        ...makeSphereQuads(
          [-0.88, ey, 0.057],
          0.014,
          0.014,
          0.005,
          brassRgb,
          10,
          6,
          appAlpha,
          0.58,
        ),
      );
    }
  }

  // Optional 3D Studio Props (Dual-Pad Magic Circle, EVA Foam Roller, Pearl Mini Ball)
  const propRgb: Rgb = isClay ? [190, 175, 165] : [196, 98, 74];
  if (useRing) {
    const ringCenter = vlerp(rig.lFoot, rig.rFoot, 0.5);
    const rc: Vec3 = [ringCenter[0] - 0.03, ringCenter[1], ringCenter[2] + 0.03];
    quads.push(...makeTorusQuads(rc, 0.165, 0.009, steelRgb, appAlpha, 24, 8));
    quads.push(
      ...makeSubdividedBoxQuads(
        [rc[0], rc[1] - 0.165, rc[2]],
        [0.046, 0.026, 0.1],
        charcoalRgb,
        appAlpha,
        0.22,
      ),
    );
    quads.push(
      ...makeSubdividedBoxQuads(
        [rc[0], rc[1] + 0.165, rc[2]],
        [0.046, 0.026, 0.1],
        charcoalRgb,
        appAlpha,
        0.22,
      ),
    );
  }
  if (useRoller) {
    const rY = apparatus === 'mat' ? -0.49 : -0.44;
    const rZ = 0.074;
    quads.push(
      ...makeTaperedTubeQuads(
        [
          [-0.44, rY, rZ],
          [0, rY, rZ],
          [0.44, rY, rZ],
        ],
        [
          [0.068, 0.068],
          [0.068, 0.068],
          [0.068, 0.068],
        ],
        [96, 130, 116],
        16,
        appAlpha,
        0.26,
      ),
    );
    quads.push(
      ...makeSphereQuads([-0.44, rY, rZ], 0.012, 0.068, 0.068, walnutRgb, 12, 8, appAlpha, 0.28),
    );
    quads.push(
      ...makeSphereQuads([0.44, rY, rZ], 0.012, 0.068, 0.068, walnutRgb, 12, 8, appAlpha, 0.28),
    );
  }
  if (useMiniBall) {
    const ballPos = add3(vlerp(rig.pelvis, rig.lFoot, 0.45), [0, 0, 0.06]);
    quads.push(
      ...makeSphereQuads(
        ballPos,
        0.095,
        0.095,
        0.095,
        propRgb,
        16,
        10,
        appAlpha * 0.94,
        0.38,
        0,
        32,
      ),
    );
  }

  // 2. Sculpted High-Craft Anatomical 3D Athlete Mesh (harmonized with 2D sage-olive studio attire)
  const attireRgb: Rgb = isClay
    ? [218, 214, 206]
    : shader === 'biomech-xray'
      ? [66, 178, 148]
      : MOTION_STUDIO_RGB.cloth;
  const leggingRgb: Rgb = isClay
    ? [206, 202, 194]
    : shader === 'biomech-xray'
      ? [56, 162, 134]
      : [
          Math.max(0, MOTION_STUDIO_RGB.cloth[0] - 8),
          Math.max(0, MOTION_STUDIO_RGB.cloth[1] - 8),
          Math.max(0, MOTION_STUDIO_RGB.cloth[2] - 7),
        ];
  const waistbandRgb: Rgb = isClay ? [202, 198, 190] : leggingRgb;
  const skinRgb: Rgb = isClay
    ? [226, 222, 215]
    : shader === 'biomech-xray'
      ? [125, 212, 188]
      : MOTION_STUDIO_RGB.skin;
  const coralRgb: Rgb = MOTION_STUDIO_RGB.primaryMuscle;
  const bodyAlpha = shader === 'biomech-xray' ? 0.44 : 1.0;

  // Subtle thoracic breathing expansion (naturalistic-motion)
  const breathScale = 1 + 0.028 * Math.sin(phaseT * Math.PI);
  const spPts = [0, 0.14, 0.28, 0.44, 0.6, 0.76, 0.9, 1.0].map((u) =>
    bezier3(rig.pelvis, rig.spineMid, rig.chest, u),
  );
  const torsoRadii: [number, number][] = [
    [0.138, 0.098],
    [0.128, 0.092],
    [0.116, 0.082],
    [0.122 * breathScale, 0.085 * breathScale],
    [0.136 * breathScale, 0.093 * breathScale],
    [0.145 * breathScale, 0.096 * breathScale],
    [0.144, 0.09],
    [0.126, 0.078],
  ];
  const coreActive =
    rig.activeZones.includes('core') ||
    rig.activeZones.includes('obliques') ||
    rig.activeZones.includes('back');
  const torsoTone: Rgb =
    !isClay && coreActive && phaseT > 0.25
      ? [
          lerp(attireRgb[0], coralRgb[0], phaseT * 0.44),
          lerp(attireRgb[1], coralRgb[1], phaseT * 0.4),
          lerp(attireRgb[2], coralRgb[2], phaseT * 0.36),
        ]
      : attireRgb;

  // Anatomical Spine & Cranial-Jawline Basis
  const spUp = norm3(sub3(rig.chest, rig.pelvis));
  const antN = norm3(sub3(rig.antHint, mul3(spUp, dot3(rig.antHint, spUp))));
  const bodyRight = norm3(cross3(spUp, antN));

  const lHip = sub3(rig.pelvis, mul3(bodyRight, 0.088));
  const rHip = add3(rig.pelvis, mul3(bodyRight, 0.088));
  const lSh = sub3(rig.chest, mul3(bodyRight, 0.148));
  const rSh = add3(rig.chest, mul3(bodyRight, 0.148));

  // Oriented Pelvic-Gluteal Girdle + High-Waist Legging Seam + Sculpted Ribcage/Torso
  quads.push(
    ...makeTaperedTubeQuads(
      [lHip, rig.pelvis, rHip],
      [
        [0.086, 0.088],
        [0.104, 0.106],
        [0.086, 0.088],
      ],
      leggingRgb,
      18,
      bodyAlpha,
      0.22,
    ),
  );
  quads.push(
    ...makeTaperedTubeQuads(
      spPts.slice(0, 3),
      torsoRadii.slice(0, 3),
      waistbandRgb,
      18,
      bodyAlpha,
      0.2,
    ),
  );
  quads.push(
    ...makeTaperedTubeQuads(
      spPts.slice(2),
      torsoRadii.slice(2),
      torsoTone,
      18,
      bodyAlpha,
      0.22,
      coreActive && !isClay ? phaseT * 0.34 : 0,
    ),
  );

  // Sleeveless Studio Top Clavicle Yoke + Smooth Bare-Skin Deltoid Contours (zero protruding shoulder pads)
  quads.push(
    ...makeTaperedTubeQuads(
      [sub3(rig.chest, mul3(bodyRight, 0.118)), rig.chest, add3(rig.chest, mul3(bodyRight, 0.118))],
      [
        [0.056, 0.052],
        [0.072, 0.068],
        [0.056, 0.052],
      ],
      torsoTone,
      16,
      bodyAlpha,
      0.2,
    ),
  );

  const neckTop = add3(rig.chest, mul3(spUp, 0.105));
  const headPos = add3(rig.chest, add3(mul3(spUp, 0.188), mul3(antN, 0.016)));
  const hairCol: Rgb = isClay ? [168, 164, 158] : MOTION_STUDIO_RGB.hair;
  quads.push(
    ...makeTaperedTubeQuads(
      [rig.chest, neckTop, sub3(headPos, mul3(spUp, 0.025))],
      [
        [0.056, 0.051],
        [0.043, 0.042],
        [0.04, 0.04],
      ],
      skinRgb,
      18,
      bodyAlpha,
      0.2,
    ),
  );
  // Single-shell oriented cranium + sleek hairline cap (eliminates Z-fighting across all angles)
  quads.push(
    ...makeAnatomicalHeadWithHairQuads(headPos, bodyRight, antN, spUp, skinRgb, hairCol, bodyAlpha),
  );

  // Studio Bun + Ivory Scrunchie Band cleanly offset behind occipital crown
  const bunBase = add3(headPos, add3(mul3(spUp, 0.036), mul3(antN, -0.094)));
  const bunPos = add3(headPos, add3(mul3(spUp, 0.044), mul3(antN, -0.114)));
  quads.push(
    ...makeSphereQuads(bunBase, 0.026, 0.026, 0.026, [238, 232, 220], 14, 8, bodyAlpha, 0.2),
  );
  quads.push(...makeSphereQuads(bunPos, 0.039, 0.039, 0.039, hairCol, 18, 10, bodyAlpha, 0.28));

  quads.push(...makeSphereQuads(lSh, 0.046, 0.046, 0.045, skinRgb, 14, 8, bodyAlpha, 0.18));
  quads.push(...makeSphereQuads(rSh, 0.046, 0.046, 0.045, skinRgb, 14, 8, bodyAlpha, 0.18));

  const legActive =
    rig.activeZones.includes('quads') ||
    rig.activeZones.includes('glutes') ||
    rig.activeZones.includes('adductors');
  const thighCol: Rgb =
    !isClay && legActive && phaseT > 0.25
      ? [
          lerp(leggingRgb[0], coralRgb[0], phaseT * 0.32),
          lerp(leggingRgb[1], coralRgb[1], phaseT * 0.28),
          lerp(leggingRgb[2], coralRgb[2], phaseT * 0.24),
        ]
      : leggingRgb;

  const [lKnee, lAnkle] = solve2BoneIK(lHip, rig.lFoot, 0.4, 0.39, rig.lKneePole);
  const [rKnee, rAnkle] = solve2BoneIK(rHip, rig.rFoot, 0.4, 0.39, rig.rKneePole);

  for (const [hipPt, kneePt, anklePt] of [
    [lHip, lKnee, lAnkle],
    [rHip, rKnee, rAnkle],
  ] as const) {
    quads.push(
      ...makeTaperedTubeQuads(
        [hipPt, vlerp(hipPt, kneePt, 0.32), vlerp(hipPt, kneePt, 0.68), kneePt],
        [
          [0.084, 0.087],
          [0.079, 0.083],
          [0.064, 0.067],
          [0.051, 0.051],
        ],
        thighCol,
        22,
        bodyAlpha,
        0.2,
        legActive && !isClay ? phaseT * 0.24 : 0,
      ),
    );
    quads.push(...makeSphereQuads(kneePt, 0.049, 0.049, 0.049, leggingRgb, 16, 9, bodyAlpha, 0.2));
    quads.push(
      ...makeTaperedTubeQuads(
        [kneePt, vlerp(kneePt, anklePt, 0.34), vlerp(kneePt, anklePt, 0.72), anklePt],
        [
          [0.049, 0.049],
          [0.053, 0.058],
          [0.04, 0.042],
          [0.033, 0.034],
        ],
        leggingRgb,
        22,
        bodyAlpha,
        0.2,
      ),
    );
    // Arched Non-Slip Pilates Grip Sock + Soft Ribbed Ankle Cuff
    const cuffPt = vlerp(kneePt, anklePt, 0.9);
    const heelPt = sub3(anklePt, mul3(antN, 0.035));
    const archPt = add3(anklePt, mul3(antN, 0.055));
    const fEnd = add3(anklePt, mul3(antN, 0.145));
    const sockCol: Rgb = isClay ? [215, 212, 205] : [244, 241, 234];
    quads.push(
      ...makeTaperedTubeQuads(
        [cuffPt, anklePt, heelPt, archPt, fEnd],
        [
          [0.035, 0.036],
          [0.034, 0.034],
          [0.034, 0.031],
          [0.034, 0.025],
          [0.026, 0.013],
        ],
        sockCol,
        16,
        bodyAlpha,
      ),
    );
  }

  const [lElb, lWr] = solve2BoneIK(lSh, rig.lHand, 0.28, 0.26, rig.lElbowPole);
  const [rElb, rWr] = solve2BoneIK(rSh, rig.rHand, 0.28, 0.26, rig.rElbowPole);
  for (const [shPt, elbPt, wrPt, sideSgn] of [
    [lSh, lElb, lWr, -1],
    [rSh, rElb, rWr, 1],
  ] as const) {
    const forearmDir = norm3(sub3(wrPt, elbPt));
    const palmCenter = add3(wrPt, mul3(forearmDir, 0.038));
    const handTip = add3(wrPt, mul3(forearmDir, 0.078));
    const thumbTip = add3(palmCenter, mul3(bodyRight, -0.024 * sideSgn));
    quads.push(
      ...makeTaperedTubeQuads(
        [shPt, vlerp(shPt, elbPt, 0.34), vlerp(shPt, elbPt, 0.68), elbPt],
        [
          [0.046, 0.046],
          [0.043, 0.044],
          [0.039, 0.04],
          [0.035, 0.035],
        ],
        skinRgb,
        20,
        bodyAlpha,
        0.18,
      ),
    );
    quads.push(...makeSphereQuads(elbPt, 0.035, 0.035, 0.035, skinRgb, 14, 8, bodyAlpha, 0.18));
    quads.push(
      ...makeTaperedTubeQuads(
        [elbPt, vlerp(elbPt, wrPt, 0.35), vlerp(elbPt, wrPt, 0.72), wrPt, palmCenter, handTip],
        [
          [0.035, 0.035],
          [0.034, 0.036],
          [0.029, 0.03],
          [0.024, 0.021],
          [0.027, 0.015],
          [0.02, 0.01],
        ],
        skinRgb,
        20,
        bodyAlpha,
        0.18,
      ),
    );
    quads.push(...makeSphereQuads(thumbTip, 0.011, 0.011, 0.016, skinRgb, 10, 6, bodyAlpha, 0.2));
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

  // 3D Trajectory Excursion Ribbon
  const trajPts: Vec3[] = [];
  for (let s = 0; s <= 10; s++) {
    const sample = samplePoseRig(spec.signatureId, s / 10);
    const rawPt =
      spec.signatureId.includes('footwork') || spec.signatureId.includes('feetstraps')
        ? sample.chest
        : sample.pelvis[2] > 0.55
          ? sample.pelvis
          : sample.chest;
    const pt = mirrorVec(rawPt);
    trajPts.push([pt[0], pt[1], pt[2] + 0.16]);
  }
  lines.push({
    pts: trajPts,
    stroke: shader === 'studio-pbr' || isClay ? '#C9822B' : '#FBBF24',
    width: 2.3,
    dash: [5, 4],
    overlay: true,
  });

  const target: Vec3 =
    apparatus === 'cadillac'
      ? [0.02, 0, 0.94]
      : apparatus === 'chair'
        ? [-0.04, 0, 0.7]
        : apparatus === 'mat'
          ? [0.02, 0, 0.34]
          : [0.04, 0, 0.54];

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
    signatureId: spec.signatureId,
    activeZonesCount: rig.activeZones.length,
    springStretchPct,
    biomechTelemetry: {
      kneeAngleDeg,
      hipAngleDeg,
      shoulderAngleDeg,
      spineArticulationDeg,
      comHeightCm,
      activeSpringLabel,
    },
  };
}

function drawSceneRegion(params: {
  ctx: CanvasRenderingContext2D;
  scene: Built3DScene;
  rx: number;
  ry: number;
  rw: number;
  rh: number;
  yawDeg: number;
  pitchDeg: number;
  zoom: number;
  shader: Studio3DShaderPreset;
  regionLabel?: string;
  selectedHotspotId?: Studio3DHotspotId | null;
  collectHotspots?: Studio3DHotspot[];
}): void {
  const {
    ctx,
    scene,
    rx,
    ry,
    rw,
    rh,
    yawDeg,
    pitchDeg,
    zoom,
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
    bgGrad.addColorStop(0, '#F7F4EC');
    bgGrad.addColorStop(0.6, MOTION_STUDIO_MATERIALS.horizon);
    bgGrad.addColorStop(1, MOTION_STUDIO_MATERIALS.floor);
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(rx, ry, rw, rh);

  const dist = 3.42 / Math.max(0.65, Math.min(1.85, zoom));
  const yaw = ((yawDeg - 90) * Math.PI) / 180;
  const pitch = (Math.max(-6, Math.min(82, pitchDeg)) * Math.PI) / 180;
  const camPos: Vec3 = [
    scene.target[0] + dist * Math.cos(pitch) * Math.cos(yaw),
    scene.target[1] + dist * Math.cos(pitch) * Math.sin(yaw),
    scene.target[2] + dist * Math.sin(pitch),
  ];

  const camFwd = norm3(sub3(scene.target, camPos));
  const worldUp: Vec3 = [0, 0, 1];
  const camRight = norm3(cross3(camFwd, worldUp));
  const camUp = norm3(cross3(camRight, camFwd));
  const focal = Math.min(rw, rh * 1.48) * 1.38;

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

  const keyDir = norm3([-0.48, -0.56, 0.82]);
  const fillDir = norm3([0.66, -0.38, 0.54]);
  const bounceDir: Vec3 = [0, 0, -1];

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
        readonly stroke: string;
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
  ): { r: number; g: number; b: number; lum: number } => {
    let n = normal3;
    const viewDir = norm3(sub3(camPos, pos3));
    if (dot3(n, viewDir) < 0) n = mul3(n, -1);
    const diffKey = Math.max(0, dot3(n, keyDir));
    const diffFill = Math.max(0, dot3(n, fillDir));
    const diffBounce = Math.max(0, dot3(n, bounceDir)) * 0.1;
    const ao = Math.min(1, 0.84 + Math.max(0, pos3[2]) * 0.19);
    const rim = Math.pow(1 - Math.max(0, dot3(n, viewDir)), 2.6) * 0.18;
    const halfVec = norm3(add3(keyDir, viewDir));
    const specPow = Math.pow(Math.max(0, dot3(n, halfVec)), q.shininess ?? 24) * q.spec;
    const shade =
      (0.45 + diffKey * 0.42 + diffFill * 0.22 + diffBounce + rim + (q.emissive ?? 0) * 0.24) * ao;
    const r = Math.min(255, Math.round(q.baseRgb[0] * shade + specPow * 232));
    const g = Math.min(255, Math.round(q.baseRgb[1] * shade + specPow * 229));
    const b = Math.min(255, Math.round(q.baseRgb[2] * shade + specPow * 222));
    return { r, g, b, lum: r * 0.3 + g * 0.59 + b * 0.11 };
  };

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
      if (q.vNormals) {
        const avgOutward = norm3([
          q.vNormals[0][0] + q.vNormals[1][0] + q.vNormals[2][0] + q.vNormals[3][0],
          q.vNormals[0][1] + q.vNormals[1][1] + q.vNormals[2][1] + q.vNormals[3][1],
          q.vNormals[0][2] + q.vNormals[1][2] + q.vNormals[2][2] + q.vNormals[3][2],
        ]);
        if (dot3(avgOutward, viewDir) < -0.06) continue;
      } else if (q.cullBackface && dot3(faceN, viewDir) <= 0) {
        continue;
      }
    }

    const shadingNormal = q.vNormals
      ? norm3([
          q.vNormals[0][0] + q.vNormals[1][0] + q.vNormals[2][0] + q.vNormals[3][0],
          q.vNormals[0][1] + q.vNormals[1][1] + q.vNormals[2][1] + q.vNormals[3][1],
          q.vNormals[0][2] + q.vNormals[1][2] + q.vNormals[2][2] + q.vNormals[3][2],
        ])
      : faceN;
    const centerLit = evalLitRgb(shadingNormal, center3, q);
    const flatCss = toCssColor(centerLit, q.alpha);
    let fillStyle: string | CanvasGradient = flatCss;

    // Gouraud smooth shading across curved organic & cylindrical quads via 2-stop gradient
    if (q.vNormals && shader !== 'clay-wire' && typeof ctx.createLinearGradient === 'function') {
      const pts2d = [p0, p1, p2, p3] as const;
      const vLits = [
        evalLitRgb(q.vNormals[0], q.verts[0], q),
        evalLitRgb(q.vNormals[1], q.verts[1], q),
        evalLitRgb(q.vNormals[2], q.verts[2], q),
        evalLitRgb(q.vNormals[3], q.verts[3], q),
      ] as const;
      let minI = 0;
      let maxI = 0;
      for (let i = 1; i < 4; i++) {
        if (vLits[i]!.lum < vLits[minI]!.lum) minI = i;
        if (vLits[i]!.lum > vLits[maxI]!.lum) maxI = i;
      }
      const dxG = pts2d[maxI]!.x - pts2d[minI]!.x;
      const dyG = pts2d[maxI]!.y - pts2d[minI]!.y;
      if (vLits[maxI]!.lum - vLits[minI]!.lum >= 5.5 && dxG * dxG + dyG * dyG > 2.2) {
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
            : flatCss,
      strokeW: shader === 'clay-wire' ? 0.72 : 0.66,
    });
  }

  // Depth-sort physical 3D springs, ropes, and piping alongside mesh quads!
  const overlayLines: StrokeLine3D[] = [];
  for (const ln of scene.lines) {
    if (ln.overlay || ln.dash) {
      overlayLines.push(ln);
      continue;
    }
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

  // Foreground Kinematic Overlays (Trajectory Excursion, Skeleton X-Ray, Plumb Line)
  for (const ln of overlayLines) {
    ctx.save();
    ctx.strokeStyle = ln.stroke;
    ctx.lineWidth = ln.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (ln.dash) ctx.setLineDash([...ln.dash]);
    ctx.beginPath();
    let started = false;
    for (const pt of ln.pts) {
      const pr = project(pt);
      if (!pr.valid) continue;
      if (!started) {
        ctx.moveTo(pr.x, pr.y);
        started = true;
      } else {
        ctx.lineTo(pr.x, pr.y);
      }
    }
    if (started) ctx.stroke();
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
  const axes: { vec: Vec3; col: string; lbl: string }[] = [
    { vec: [1, 0, 0], col: '#E25B3B', lbl: 'X' },
    { vec: [0, 1, 0], col: '#2B6CB0', lbl: 'Y' },
    { vec: [0, 0, 1], col: '#1FA97C', lbl: 'Z' },
  ];
  ctx.save();
  ctx.fillStyle =
    shader === 'studio-pbr' || shader === 'clay-wire'
      ? 'rgba(255,255,255,0.84)'
      : 'rgba(15,30,25,0.78)';
  ctx.beginPath();
  ctx.arc(gizmoCx, gizmoCy, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = '700 8.5px system-ui, -apple-system, sans-serif';
  for (const ax of axes) {
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
}

export function renderRealtimeStudio3DFrame({
  ctx,
  width,
  height,
  exercise,
  phaseT,
  yawDeg,
  pitchDeg,
  zoom,
  shader,
  mirrored = false,
  showBiomechOverlay = false,
  dualView = false,
  springOverride,
  footbarOverride,
  headrestOverride,
  propOverride,
  selectedHotspotId = null,
}: Render3DFrameOptions): {
  readonly signatureId: Studio3DSignatureId;
  readonly activeZonesCount: number;
  readonly springStretchPct: number;
  readonly biomechTelemetry: Biomech3DTelemetry;
  readonly hotspots: readonly Studio3DHotspot[];
} {
  const scene = buildStudio3DScene({
    exercise,
    phaseT,
    shader,
    mirrored,
    showBiomechOverlay,
    springOverride,
    footbarOverride,
    headrestOverride,
    propOverride,
  });
  const hotspots: Studio3DHotspot[] = [];

  if (dualView && width >= 440) {
    const leftW = Math.round(width * 0.58);
    const rightW = width - leftW;
    drawSceneRegion({
      ctx,
      scene,
      rx: 0,
      ry: 0,
      rw: leftW,
      rh: height,
      yawDeg,
      pitchDeg,
      zoom,
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
    drawSceneRegion({
      ctx,
      scene,
      rx: 0,
      ry: 0,
      rw: width,
      rh: height,
      yawDeg,
      pitchDeg,
      zoom,
      shader,
      selectedHotspotId,
      collectHotspots: hotspots,
    });
  }

  return {
    signatureId: scene.signatureId,
    activeZonesCount: scene.activeZonesCount,
    springStretchPct: scene.springStretchPct,
    biomechTelemetry: scene.biomechTelemetry,
    hotspots,
  };
}
