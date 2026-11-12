import type { ApparatusType, PilatesExercise } from '../types/pilates';
import {
  resolveStudio3DMotionForExercise,
  type Studio3DSignatureId,
} from './studio3dMotionCatalog';

export type Studio3DShaderPreset = 'studio-pbr' | 'biomech-xray' | 'game-arena';

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

export type Vec3 = readonly [number, number, number];

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
  readonly activeZones: readonly ('quads' | 'glutes' | 'core' | 'obliques' | 'back' | 'adductors')[];
}

function samplePoseRig(signatureId: Studio3DSignatureId, rawT: number): PoseRigKeyframe {
  const ts = smoothstep(rawT);
  switch (signatureId) {
    case 'reformer-bridge': {
      const cx = lerp(0.24, 0.14, ts);
      const ct = 0.4;
      return {
        carriageX: cx,
        pelvis: [cx + 0.25, 0, ct + lerp(0.1, 0.34, ts)],
        spineMid: [cx + 0.03, 0, ct + lerp(0.1, 0.23, ts)],
        chest: [cx - 0.17, 0, ct + 0.11],
        antHint: [lerp(0, 0.32, ts), 0, 1],
        lFoot: [0.82, -0.09, 0.56],
        rFoot: [0.82, 0.09, 0.56],
        lKneePole: [0.25, -0.05, 1.25],
        rKneePole: [0.25, 0.05, 1.25],
        lHand: [cx + 0.22, -0.22, ct + 0.04],
        rHand: [cx + 0.22, 0.22, ct + 0.04],
        lElbowPole: [-0.1, -0.32, -0.15],
        rElbowPole: [-0.1, 0.32, -0.15],
        activeZones: ['glutes', 'core'],
      };
    }
    case 'reformer-shortspine': {
      const cx = lerp(-0.08, 0.2, ts);
      const ct = 0.4;
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
        lElbowPole: [-0.1, -0.32, -0.15],
        rElbowPole: [-0.1, 0.32, -0.15],
        activeZones: ['core', 'glutes'],
      };
    }
    case 'reformer-feetstraps': {
      const cx = lerp(0.14, -0.16, ts);
      const ct = 0.4;
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
        lElbowPole: [-0.1, -0.32, -0.15],
        rElbowPole: [-0.1, 0.32, -0.15],
        activeZones: ['adductors', 'core', 'glutes'],
      };
    }
    case 'reformer-jumpboard': {
      const cx = lerp(0.24, -0.26, ts);
      const ct = 0.4;
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
        lElbowPole: [-0.1, -0.32, -0.15],
        rElbowPole: [-0.1, 0.32, -0.15],
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
        lFoot: [cx - 0.12, -0.09, 0.44],
        rFoot: [cx - 0.12, 0.09, 0.44],
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
        pelvis: [cx + 0.1, 0, 0.48],
        spineMid: [cx + lerp(0.1, 0.2, ts), 0, 0.69],
        chest: [cx + lerp(0.1, 0.34, ts), 0, lerp(0.92, 0.84, ts)],
        antHint: [0, -1, 0],
        lFoot: [cx - 0.1, -0.16, 0.44],
        rFoot: [cx + 0.3, 0.14, 0.44],
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
        lHand: [0.22, -0.24, 1.92],
        rHand: [0.22, 0.24, 1.92],
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
        lFoot: [0.48, 0.04, 0.56],
        rFoot: [0.48, -0.04, 0.74],
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
        lFoot: [0.48, -0.1, 0.56],
        rFoot: [0.48, 0.1, 0.56],
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
        pelvis: [-0.34, 0, lift],
        spineMid: [-0.32, 0, lift + 0.22],
        chest: [-0.24, 0, lift + 0.42],
        antHint: [0.95, 0, -0.25],
        lFoot: [-0.16, -0.26, lerp(0.42, 0.58, ts)],
        rFoot: [-0.16, 0.26, lerp(0.42, 0.58, ts)],
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
      const ct = 0.4;
      return {
        carriageX: cx,
        pelvis: [cx + 0.24, 0, ct + 0.1],
        spineMid: [cx + 0.02, 0, ct + 0.1],
        chest: [cx - 0.17, 0, ct + 0.11],
        antHint: [0, 0, 1],
        lFoot: [0.82, -0.085, 0.565],
        rFoot: [0.82, 0.085, 0.565],
        lKneePole: [0.12, -0.04, lerp(1.28, 0.92, ts)],
        rKneePole: [0.12, 0.04, lerp(1.28, 0.92, ts)],
        lHand: [cx + 0.25, -0.22, ct + 0.04],
        rHand: [cx + 0.25, 0.22, ct + 0.04],
        lElbowPole: [-0.1, -0.32, -0.15],
        rElbowPole: [-0.1, 0.32, -0.15],
        activeZones: ['quads', 'core'],
      };
    }
  }
}

interface QuadFace {
  readonly verts: readonly [Vec3, Vec3, Vec3, Vec3];
  readonly baseRgb: readonly [number, number, number];
  readonly alpha: number;
  readonly spec: number;
  readonly emissive?: number;
}

interface StrokeLine3D {
  readonly pts: readonly Vec3[];
  readonly stroke: string;
  readonly width: number;
  readonly dash?: readonly number[];
}

function makeBoxQuads(
  center: Vec3,
  dims: Vec3,
  rgb: readonly [number, number, number],
  alpha = 1,
  spec = 0.18,
): QuadFace[] {
  const [cx, cy, cz] = center;
  const [dx, dy, dz] = [dims[0] * 0.5, dims[1] * 0.5, dims[2] * 0.5];
  const c: Vec3[] = [
    [cx - dx, cy - dy, cz - dz],
    [cx + dx, cy - dy, cz - dz],
    [cx + dx, cy + dy, cz - dz],
    [cx - dx, cy + dy, cz - dz],
    [cx - dx, cy - dy, cz + dz],
    [cx + dx, cy - dy, cz + dz],
    [cx + dx, cy + dy, cz + dz],
    [cx - dx, cy + dy, cz + dz],
  ];
  const idx: [number, number, number, number][] = [
    [4, 5, 6, 7],
    [0, 3, 2, 1],
    [0, 1, 5, 4],
    [2, 3, 7, 6],
    [1, 2, 6, 5],
    [3, 0, 4, 7],
  ];
  return idx.map(([a, b, d, e]) => ({
    verts: [c[a]!, c[b]!, c[d]!, c[e]!],
    baseRgb: rgb,
    alpha,
    spec,
  }));
}

function makeTaperedTubeQuads(
  pts: readonly Vec3[],
  radii: readonly [number, number][],
  rgb: readonly [number, number, number],
  sides = 10,
  alpha = 1,
  spec = 0.22,
  emissive = 0,
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
  for (let i = 0; i < pts.length; i++) {
    const t = tangents[i]!;
    nrm = norm3(sub3(nrm, mul3(t, dot3(nrm, t))));
    const binrm = norm3(cross3(t, nrm));
    const [rx, ry] = radii[Math.min(i, radii.length - 1)]!;
    const ring: Vec3[] = [];
    for (let k = 0; k < sides; k++) {
      const ang = (2 * Math.PI * k) / sides;
      const ca = Math.cos(ang) * rx;
      const sa = Math.sin(ang) * ry;
      ring.push(add3(pts[i]!, add3(mul3(binrm, ca), mul3(nrm, sa))));
    }
    rings.push(ring);
  }

  const quads: QuadFace[] = [];
  for (let i = 0; i < rings.length - 1; i++) {
    const r0 = rings[i]!;
    const r1 = rings[i + 1]!;
    for (let k = 0; k < sides; k++) {
      const kn = (k + 1) % sides;
      quads.push({
        verts: [r0[k]!, r0[kn]!, r1[kn]!, r1[k]!],
        baseRgb: rgb,
        alpha,
        spec,
        emissive,
      });
    }
  }
  return quads;
}

function makeSphereQuads(
  center: Vec3,
  rx: number,
  ry: number,
  rz: number,
  rgb: readonly [number, number, number],
  segs = 10,
  ringsCount = 6,
  alpha = 1,
): QuadFace[] {
  const rings: Vec3[][] = [];
  for (let r = 0; r <= ringsCount; r++) {
    const phi = -Math.PI * 0.5 + (Math.PI * r) / ringsCount;
    const cp = Math.cos(phi);
    const sp = Math.sin(phi);
    const row: Vec3[] = [];
    for (let s = 0; s < segs; s++) {
      const th = (2 * Math.PI * s) / segs;
      row.push([center[0] + cp * Math.cos(th) * rx, center[1] + cp * Math.sin(th) * ry, center[2] + sp * rz]);
    }
    rings.push(row);
  }
  const quads: QuadFace[] = [];
  for (let r = 0; r < ringsCount; r++) {
    for (let s = 0; s < segs; s++) {
      const sn = (s + 1) % segs;
      quads.push({
        verts: [rings[r]![s]!, rings[r]![sn]!, rings[r + 1]![sn]!, rings[r + 1]![s]!],
        baseRgb: rgb,
        alpha,
        spec: 0.25,
      });
    }
  }
  return quads;
}

function makeSpringPolyline(p0: Vec3, p1: Vec3, turns = 12, radius = 0.015): Vec3[] {
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
    const env = Math.sin(Math.min(1, s * 8) * Math.PI * 0.5) * Math.sin(Math.min(1, (1 - s) * 8) * Math.PI * 0.5);
    const off = add3(mul3(b1, Math.cos(ang) * radius * env), mul3(b2, Math.sin(ang) * radius * env));
    pts.push(add3(add3(p0, mul3(u, s * L)), off));
  }
  pts.push(p1);
  return pts;
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
}: Render3DFrameOptions): {
  readonly signatureId: Studio3DSignatureId;
  readonly activeZonesCount: number;
  readonly springStretchPct: number;
} {
  const spec = resolveStudio3DMotionForExercise(exercise);
  const rig = samplePoseRig(spec.signatureId, phaseT);
  const apparatus: ApparatusType = exercise.apparatus;

  // Background studio sky/floor gradient per shader engine
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  if (shader === 'game-arena') {
    bgGrad.addColorStop(0, '#101A17');
    bgGrad.addColorStop(0.62, '#172621');
    bgGrad.addColorStop(1, '#0E1714');
  } else if (shader === 'biomech-xray') {
    bgGrad.addColorStop(0, '#162823');
    bgGrad.addColorStop(0.58, '#1E352E');
    bgGrad.addColorStop(1, '#13231E');
  } else {
    bgGrad.addColorStop(0, '#F4F0E8');
    bgGrad.addColorStop(0.62, '#EAE5DB');
    bgGrad.addColorStop(1, '#DDD6C9');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Camera Basis
  const target: Vec3 =
    apparatus === 'cadillac'
      ? [0.02, 0, 0.92]
      : apparatus === 'chair'
        ? [-0.04, 0, 0.72]
        : apparatus === 'mat'
          ? [0.02, 0, 0.36]
          : [0.04, 0, 0.56];

  const dist = (3.45 / Math.max(0.65, Math.min(1.85, zoom)));
  const yaw = ((yawDeg - 90) * Math.PI) / 180;
  const pitch = (Math.max(-6, Math.min(82, pitchDeg)) * Math.PI) / 180;
  const camPos: Vec3 = [
    target[0] + dist * Math.cos(pitch) * Math.cos(yaw),
    target[1] + dist * Math.cos(pitch) * Math.sin(yaw),
    target[2] + dist * Math.sin(pitch),
  ];

  const camFwd = norm3(sub3(target, camPos));
  const worldUp: Vec3 = [0, 0, 1];
  const camRight = norm3(cross3(camFwd, worldUp));
  const camUp = norm3(cross3(camRight, camFwd));
  const focal = Math.min(width, height * 1.48) * 1.38;

  const project = (pt: Vec3): { x: number; y: number; zCam: number; valid: boolean } => {
    const rel = sub3(pt, camPos);
    const zCam = dot3(rel, camFwd);
    if (zCam <= 0.12) return { x: 0, y: 0, zCam, valid: false };
    const xCam = dot3(rel, camRight);
    const yCam = dot3(rel, camUp);
    return {
      x: width * 0.5 + (xCam / zCam) * focal,
      y: height * 0.54 - (yCam / zCam) * focal,
      zCam,
      valid: true,
    };
  };

  // Perspective Studio Floor Grid
  ctx.save();
  const gridStroke =
    shader === 'studio-pbr'
      ? 'rgba(23, 61, 52, 0.08)'
      : shader === 'biomech-xray'
        ? 'rgba(126, 231, 196, 0.13)'
        : 'rgba(110, 231, 183, 0.15)';
  ctx.strokeStyle = gridStroke;
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

  const quads: QuadFace[] = [];
  const lines: StrokeLine3D[] = [];

  const oakRgb: readonly [number, number, number] =
    shader === 'studio-pbr' ? [206, 169, 122] : [72, 98, 88];
  const leatherRgb: readonly [number, number, number] =
    shader === 'studio-pbr' ? [38, 56, 49] : [30, 52, 45];
  const appAlpha = shader === 'biomech-xray' ? 0.52 : 1.0;

  let springStretchPct = Math.round(smoothstep(phaseT) * 100);

  // Build 3D Apparatus Geometry
  if (apparatus === 'reformer') {
    const cx = rig.carriageX ?? 0.12;
    springStretchPct = Math.round(Math.max(8, Math.min(100, ((0.35 - cx) / 0.62) * 100)));
    quads.push(...makeBoxQuads([0, -0.29, 0.31], [2.3, 0.04, 0.11], oakRgb, appAlpha, 0.2));
    quads.push(...makeBoxQuads([0, 0.29, 0.31], [2.3, 0.04, 0.11], oakRgb, appAlpha, 0.2));
    quads.push(...makeBoxQuads([-1.13, 0, 0.31], [0.045, 0.56, 0.11], oakRgb, appAlpha, 0.2));
    quads.push(...makeBoxQuads([1.13, 0, 0.31], [0.045, 0.56, 0.11], oakRgb, appAlpha, 0.2));
    for (const sx of [-1.08, 1.08]) {
      for (const sy of [-0.27, 0.27]) {
        quads.push(...makeBoxQuads([sx, sy, 0.13], [0.055, 0.055, 0.26], oakRgb, appAlpha, 0.15));
      }
    }
    quads.push(...makeBoxQuads([1.03, 0, 0.36], [0.16, 0.55, 0.025], oakRgb, appAlpha, 0.2));
    quads.push(...makeBoxQuads([cx + 0.06, 0, 0.38], [0.84, 0.53, 0.05], leatherRgb, appAlpha, 0.26));
    quads.push(...makeBoxQuads([cx - 0.2, -0.13, 0.46], [0.06, 0.09, 0.11], leatherRgb, appAlpha, 0.25));
    quads.push(...makeBoxQuads([cx - 0.2, 0.13, 0.46], [0.06, 0.09, 0.11], leatherRgb, appAlpha, 0.25));
    if (rig.withLongbox) {
      quads.push(...makeBoxQuads([cx + 0.06, 0, 0.52], [0.68, 0.39, 0.22], leatherRgb, appAlpha, 0.25));
    }
    if (rig.withJumpboard) {
      quads.push(...makeBoxQuads([0.97, 0, 0.61], [0.04, 0.52, 0.48], leatherRgb, appAlpha, 0.22));
    } else {
      lines.push({
        pts: [
          [0.95, -0.27, 0.34],
          [0.82, -0.27, 0.57],
          [0.82, 0.27, 0.57],
          [0.95, 0.27, 0.34],
        ],
        stroke: '#C8D2D6',
        width: 4.2,
      });
    }
    // Helical Springs (Red, Red, Blue, Yellow)
    const springCols: [number, string][] = [
      [-0.09, '#D64535'],
      [-0.03, '#D64535'],
      [0.03, '#3182CE'],
      [0.09, '#D69E2E'],
    ];
    for (const [sy, scol] of springCols) {
      lines.push({
        pts: makeSpringPolyline([cx + 0.46, sy, 0.33], [0.92, sy, 0.33], 11, 0.013),
        stroke: scol,
        width: 2.1,
      });
    }
    // Risers & Straps
    lines.push({ pts: [[-1.12, -0.27, 0.34], [-1.12, -0.27, 0.65]], stroke: '#CBD5E0', width: 3 });
    lines.push({ pts: [[-1.12, 0.27, 0.34], [-1.12, 0.27, 0.65]], stroke: '#CBD5E0', width: 3 });
    if (rig.ropeToFeet) {
      lines.push({ pts: [[-1.09, -0.27, 0.63], rig.lFoot], stroke: '#63736C', width: 1.8 });
      lines.push({ pts: [[-1.09, 0.27, 0.63], rig.rFoot], stroke: '#63736C', width: 1.8 });
    } else if (rig.ropeToHands) {
      lines.push({ pts: [[-1.09, -0.27, 0.63], rig.lHand], stroke: '#63736C', width: 1.8 });
      lines.push({ pts: [[-1.09, 0.27, 0.63], rig.rHand], stroke: '#63736C', width: 1.8 });
    }
  } else if (apparatus === 'cadillac') {
    quads.push(...makeBoxQuads([0, 0, 0.54], [2.08, 0.65, 0.06], leatherRgb, appAlpha, 0.24));
    quads.push(...makeBoxQuads([0, -0.31, 0.47], [2.12, 0.04, 0.09], oakRgb, appAlpha, 0.2));
    quads.push(...makeBoxQuads([0, 0.31, 0.47], [2.12, 0.04, 0.09], oakRgb, appAlpha, 0.2));
    for (const sx of [-1.04, 1.04]) {
      for (const sy of [-0.3, 0.3]) {
        quads.push(...makeBoxQuads([sx, sy, 0.22], [0.055, 0.055, 0.44], oakRgb, appAlpha, 0.18));
        lines.push({ pts: [[sx, sy, 0.52], [sx, sy, 1.94]], stroke: '#CBD5E0', width: 3.4 });
      }
    }
    lines.push({
      pts: [
        [-1.04, -0.3, 1.94],
        [1.04, -0.3, 1.94],
        [1.04, 0.3, 1.94],
        [-1.04, 0.3, 1.94],
        [-1.04, -0.3, 1.94],
      ],
      stroke: '#CBD5E0',
      width: 3.4,
    });
    if (rig.rolldownBar) {
      const [bx, bz] = rig.rolldownBar;
      lines.push({ pts: [[bx, -0.26, bz], [bx, 0.26, bz]], stroke: '#D5B080', width: 4.5 });
      lines.push({ pts: makeSpringPolyline([1.04, -0.23, 1.72], [bx, -0.23, bz], 11), stroke: '#D69E2E', width: 2 });
      lines.push({ pts: makeSpringPolyline([1.04, 0.23, 1.72], [bx, 0.23, bz], 11), stroke: '#D69E2E', width: 2 });
    }
    if (rig.pushthroughDeg !== undefined) {
      const rad = (rig.pushthroughDeg * Math.PI) / 180;
      const ex = 0.62 - Math.sin(rad) * 0.66;
      const ez = 1.84 - Math.cos(rad) * 0.66;
      lines.push({
        pts: [
          [0.62, -0.26, 1.84],
          [ex, -0.26, ez],
          [ex, 0.26, ez],
          [0.62, 0.26, 1.84],
        ],
        stroke: '#CBD5E0',
        width: 3.6,
      });
      lines.push({
        pts: makeSpringPolyline([1.04, 0, 1.9], [(0.62 + ex) * 0.5, 0, (1.84 + ez) * 0.5], 10),
        stroke: '#3182CE',
        width: 2.1,
      });
    }
    if (rig.legSprings) {
      lines.push({ pts: makeSpringPolyline([-1.04, -0.24, 1.52], rig.lFoot, 14), stroke: '#D69E2E', width: 2 });
      lines.push({ pts: makeSpringPolyline([-1.04, 0.24, 1.52], rig.rFoot, 14), stroke: '#D69E2E', width: 2 });
    }
  } else if (apparatus === 'chair') {
    const cx = -0.1;
    quads.push(...makeBoxQuads([cx, -0.25, 0.28], [0.64, 0.036, 0.55], oakRgb, appAlpha, 0.2));
    quads.push(...makeBoxQuads([cx, 0.25, 0.28], [0.64, 0.036, 0.55], oakRgb, appAlpha, 0.2));
    quads.push(...makeBoxQuads([cx, 0, 0.58], [0.64, 0.52, 0.055], leatherRgb, appAlpha, 0.25));
    const pdeg = rig.pedalDeg ?? 22;
    const rad = (pdeg * Math.PI) / 180;
    const px = cx - 0.1 + Math.cos(rad) * 0.52;
    const pz = 0.08 + Math.sin(rad) * 0.52;
    lines.push({
      pts: [
        [cx - 0.1, -0.2, 0.08],
        [px, -0.2, pz],
        [px, 0.2, pz],
        [cx - 0.1, 0.2, 0.08],
      ],
      stroke: '#384640',
      width: 4.5,
    });
    lines.push({
      pts: makeSpringPolyline([cx - 0.22, -0.07, 0.46], [(cx - 0.1 + px) * 0.5, -0.07, (0.08 + pz) * 0.5], 10),
      stroke: '#D64535',
      width: 2.1,
    });
    lines.push({
      pts: makeSpringPolyline([cx - 0.22, 0.07, 0.46], [(cx - 0.1 + px) * 0.5, 0.07, (0.08 + pz) * 0.5], 10),
      stroke: '#3182CE',
      width: 2.1,
    });
    if (rig.withChairHandles) {
      lines.push({ pts: [[cx - 0.04, -0.28, 0.25], [cx - 0.04, -0.28, 1.25], [cx + 0.08, -0.28, 1.28]], stroke: '#CBD5E0', width: 3.4 });
      lines.push({ pts: [[cx - 0.04, 0.28, 0.25], [cx - 0.04, 0.28, 1.25], [cx + 0.08, 0.28, 1.28]], stroke: '#CBD5E0', width: 3.4 });
    }
  } else if (apparatus === 'barrel') {
    if (rig.isSpineCorrector) {
      quads.push(...makeSphereQuads([-0.16, 0, 0.18], 0.28, 0.24, 0.21, leatherRgb, 12, 6, appAlpha));
      quads.push(...makeBoxQuads([0.22, 0, 0.09], [0.42, 0.46, 0.16], oakRgb, appAlpha, 0.2));
    } else {
      quads.push(...makeSphereQuads([-0.34, 0, 0.56], 0.3, 0.27, 0.31, leatherRgb, 12, 6, appAlpha));
      quads.push(...makeBoxQuads([-0.34, -0.27, 0.28], [0.56, 0.036, 0.52], oakRgb, appAlpha, 0.2));
      quads.push(...makeBoxQuads([-0.34, 0.27, 0.28], [0.56, 0.036, 0.52], oakRgb, appAlpha, 0.2));
      lines.push({ pts: [[0.5, -0.28, 0.02], [0.5, -0.28, 0.98]], stroke: '#C8A06E', width: 4 });
      lines.push({ pts: [[0.5, 0.28, 0.02], [0.5, 0.28, 0.98]], stroke: '#C8A06E', width: 4 });
      for (const rz of [0.22, 0.4, 0.58, 0.76, 0.94]) {
        lines.push({ pts: [[0.5, -0.28, rz], [0.5, 0.28, rz]], stroke: '#D5B080', width: 3 });
      }
    }
  } else {
    quads.push(...makeBoxQuads([0, 0, 0.015], [2.04, 0.78, 0.024], oakRgb, appAlpha, 0.2));
    quads.push(...makeBoxQuads([0, 0, 0.042], [1.9, 0.66, 0.03], leatherRgb, appAlpha, 0.24));
  }

  // Build 3D Athlete Mesh (Spine + Pelvis + Chest + Head + IK Legs + IK Arms + Muscle Highlights)
  const attireRgb: readonly [number, number, number] =
    shader === 'biomech-xray' ? [66, 178, 148] : [23, 61, 52];
  const leggingRgb: readonly [number, number, number] =
    shader === 'biomech-xray' ? [52, 152, 126] : [20, 52, 44];
  const skinRgb: readonly [number, number, number] =
    shader === 'biomech-xray' ? [125, 212, 188] : [228, 186, 154];
  const coralRgb: readonly [number, number, number] = [232, 92, 58];
  const bodyAlpha = shader === 'biomech-xray' ? 0.42 : 1.0;

  const spPts = [0, 0.25, 0.5, 0.75, 1.0].map((u) => bezier3(rig.pelvis, rig.spineMid, rig.chest, u));
  const torsoRadii: [number, number][] = [
    [0.145, 0.1],
    [0.128, 0.088],
    [0.12, 0.082],
    [0.142, 0.095],
    [0.148, 0.088],
  ];
  const coreActive = rig.activeZones.includes('core') || rig.activeZones.includes('obliques') || rig.activeZones.includes('back');
  quads.push(
    ...makeTaperedTubeQuads(
      spPts,
      torsoRadii,
      coreActive && phaseT > 0.28 ? [lerp(attireRgb[0], coralRgb[0], phaseT * 0.65), lerp(attireRgb[1], coralRgb[1], phaseT * 0.65), lerp(attireRgb[2], coralRgb[2], phaseT * 0.65)] : attireRgb,
      12,
      bodyAlpha,
      0.24,
      coreActive ? phaseT * 0.45 : 0,
    ),
  );

  // Spine & Shoulder/Hip Basis
  const spUp = norm3(sub3(rig.chest, rig.pelvis));
  const antN = norm3(sub3(rig.antHint, mul3(spUp, dot3(rig.antHint, spUp))));
  const bodyRight = norm3(cross3(spUp, antN));

  const headPos = add3(rig.chest, add3(mul3(spUp, 0.17), mul3(antN, 0.02)));
  quads.push(
    ...makeTaperedTubeQuads([rig.chest, add3(rig.chest, mul3(spUp, 0.1))], [[0.052, 0.05], [0.044, 0.044]], skinRgb, 8, bodyAlpha),
  );
  quads.push(...makeSphereQuads(headPos, 0.076, 0.086, 0.094, skinRgb, 10, 6, bodyAlpha));
  const bunPos = sub3(headPos, mul3(antN, 0.095));
  quads.push(...makeSphereQuads(bunPos, 0.042, 0.042, 0.042, [36, 26, 22], 8, 5, bodyAlpha));

  const lHip = sub3(rig.pelvis, mul3(bodyRight, 0.085));
  const rHip = add3(rig.pelvis, mul3(bodyRight, 0.085));
  const lSh = sub3(rig.chest, mul3(bodyRight, 0.148));
  const rSh = add3(rig.chest, mul3(bodyRight, 0.148));

  const legActive =
    rig.activeZones.includes('quads') ||
    rig.activeZones.includes('glutes') ||
    rig.activeZones.includes('adductors');
  const thighCol: readonly [number, number, number] =
    legActive && phaseT > 0.25
      ? [
          lerp(leggingRgb[0], coralRgb[0], phaseT * 0.72),
          lerp(leggingRgb[1], coralRgb[1], phaseT * 0.72),
          lerp(leggingRgb[2], coralRgb[2], phaseT * 0.72),
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
        [hipPt, vlerp(hipPt, kneePt, 0.5), kneePt],
        [
          [0.082, 0.084],
          [0.071, 0.074],
          [0.052, 0.052],
        ],
        thighCol,
        10,
        bodyAlpha,
        0.24,
        legActive ? phaseT * 0.5 : 0,
      ),
    );
    quads.push(
      ...makeTaperedTubeQuads(
        [kneePt, vlerp(kneePt, anklePt, 0.45), anklePt],
        [
          [0.05, 0.05],
          [0.048, 0.054],
          [0.034, 0.036],
        ],
        leggingRgb,
        10,
        bodyAlpha,
        0.22,
      ),
    );
    const fEnd = add3(anklePt, mul3(antN, 0.14));
    quads.push(
      ...makeTaperedTubeQuads(
        [anklePt, fEnd],
        [
          [0.036, 0.028],
          [0.032, 0.016],
        ],
        [242, 239, 232],
        8,
        bodyAlpha,
      ),
    );
  }

  const [lElb, lWr] = solve2BoneIK(lSh, rig.lHand, 0.28, 0.26, rig.lElbowPole);
  const [rElb, rWr] = solve2BoneIK(rSh, rig.rHand, 0.28, 0.26, rig.rElbowPole);
  for (const [shPt, elbPt, wrPt] of [
    [lSh, lElb, lWr],
    [rSh, rElb, rWr],
  ] as const) {
    quads.push(
      ...makeTaperedTubeQuads(
        [shPt, elbPt, wrPt],
        [
          [0.046, 0.046],
          [0.035, 0.035],
          [0.024, 0.02],
        ],
        skinRgb,
        9,
        bodyAlpha,
        0.22,
      ),
    );
  }

  // X-Ray Biomechanics Spine & Skeleton Overlay
  if (shader === 'biomech-xray') {
    lines.push({ pts: spPts, stroke: '#FBBF24', width: 3.4 });
    lines.push({ pts: [lHip, lKnee, lAnkle], stroke: '#FF7A59', width: 2.6 });
    lines.push({ pts: [rHip, rKnee, rAnkle], stroke: '#FF7A59', width: 2.6 });
    lines.push({ pts: [lSh, lElb, lWr], stroke: '#6EE7B7', width: 2.2 });
    lines.push({ pts: [rSh, rElb, rWr], stroke: '#6EE7B7', width: 2.2 });
  }

  // 3D Trajectory Ribbon (Pelvis / Foot Excursion Path across t=0..1)
  const trajPts: Vec3[] = [];
  for (let s = 0; s <= 10; s++) {
    const sample = samplePoseRig(spec.signatureId, s / 10);
    const trackPt =
      spec.signatureId.includes('footwork') || spec.signatureId.includes('feetstraps')
        ? sample.chest
        : sample.pelvis[2] > 0.55
          ? sample.pelvis
          : sample.chest;
    trajPts.push([trackPt[0], trackPt[1], trackPt[2] + 0.16]);
  }
  lines.push({
    pts: trajPts,
    stroke: shader === 'studio-pbr' ? '#C9822B' : '#FBBF24',
    width: 2.4,
    dash: [5, 4],
  });

  // Sort & Shade All 3D Quads (Key + Fill + Rim Studio Lighting)
  const keyDir = norm3([-0.52, -0.58, 0.78]);
  const fillDir = norm3([0.65, -0.42, 0.48]);

  interface ProjectedQuad {
    readonly pts2d: readonly [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }];
    readonly depth: number;
    readonly fill: string;
    readonly stroke: string;
  }

  const projectedQuads: ProjectedQuad[] = [];
  for (const q of quads) {
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
    let n = norm3(cross3(sub3(q.verts[1], q.verts[0]), sub3(q.verts[3], q.verts[0])));
    const viewDir = norm3(sub3(camPos, center3));
    if (dot3(n, viewDir) < 0) n = mul3(n, -1);

    const diffKey = Math.max(0, dot3(n, keyDir));
    const diffFill = Math.max(0, dot3(n, fillDir));
    const rim = Math.pow(1 - Math.max(0, dot3(n, viewDir)), 2.4) * 0.26;
    const halfVec = norm3(add3(keyDir, viewDir));
    const specPow = Math.pow(Math.max(0, dot3(n, halfVec)), 18) * q.spec;

    const shade = 0.38 + diffKey * 0.52 + diffFill * 0.22 + rim + (q.emissive ?? 0) * 0.28;
    const r = Math.min(255, Math.round(q.baseRgb[0] * shade + specPow * 235));
    const g = Math.min(255, Math.round(q.baseRgb[1] * shade + specPow * 235));
    const b = Math.min(255, Math.round(q.baseRgb[2] * shade + specPow * 230));
    const fill = q.alpha < 0.999 ? `rgba(${r},${g},${b},${q.alpha.toFixed(2)})` : `rgb(${r},${g},${b})`;

    projectedQuads.push({
      pts2d: [p0, p1, p2, p3],
      depth: (p0.zCam + p1.zCam + p2.zCam + p3.zCam) * 0.25,
      fill,
      stroke: q.alpha < 0.999 ? 'rgba(110,231,183,0.18)' : fill,
    });
  }

  projectedQuads.sort((a, b) => b.depth - a.depth);

  // Soft Ground Shadow Ellipse under Athlete
  const shadowCenter = project([rig.pelvis[0], rig.pelvis[1], 0.005]);
  if (shadowCenter.valid) {
    ctx.save();
    ctx.fillStyle = shader === 'studio-pbr' ? 'rgba(23, 45, 38, 0.12)' : 'rgba(0, 0, 0, 0.34)';
    ctx.beginPath();
    ctx.ellipse(shadowCenter.x, shadowCenter.y, width * 0.22, height * 0.055, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const pq of projectedQuads) {
    ctx.beginPath();
    ctx.moveTo(pq.pts2d[0].x, pq.pts2d[0].y);
    ctx.lineTo(pq.pts2d[1].x, pq.pts2d[1].y);
    ctx.lineTo(pq.pts2d[2].x, pq.pts2d[2].y);
    ctx.lineTo(pq.pts2d[3].x, pq.pts2d[3].y);
    ctx.closePath();
    ctx.fillStyle = pq.fill;
    ctx.fill();
    ctx.strokeStyle = pq.stroke;
    ctx.lineWidth = 0.65;
    ctx.stroke();
  }

  // Draw 3D Springs, Bars, Ropes & Trajectory Vectors
  for (const ln of lines) {
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

  // Draw XYZ Orientation Axis Gizmo in Bottom-Right Corner
  const gizmoCx = width - 40;
  const gizmoCy = height - 40;
  const axes: { vec: Vec3; col: string; lbl: string }[] = [
    { vec: [1, 0, 0], col: '#E25B3B', lbl: 'X' },
    { vec: [0, 1, 0], col: '#2B6CB0', lbl: 'Y' },
    { vec: [0, 0, 1], col: '#1FA97C', lbl: 'Z' },
  ];
  ctx.save();
  ctx.fillStyle = shader === 'studio-pbr' ? 'rgba(255,255,255,0.78)' : 'rgba(15,30,25,0.72)';
  ctx.beginPath();
  ctx.arc(gizmoCx, gizmoCy, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = '700 9px system-ui, -apple-system, sans-serif';
  for (const ax of axes) {
    const sx = dot3(ax.vec, camRight) * 18;
    const sy = -dot3(ax.vec, camUp) * 18;
    ctx.strokeStyle = ax.col;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gizmoCx, gizmoCy);
    ctx.lineTo(gizmoCx + sx, gizmoCy + sy);
    ctx.stroke();
    ctx.fillStyle = ax.col;
    ctx.fillText(ax.lbl, gizmoCx + sx * 1.22 - 3, gizmoCy + sy * 1.22 + 3);
  }
  ctx.restore();

  return {
    signatureId: spec.signatureId,
    activeZonesCount: rig.activeZones.length,
    springStretchPct,
  };
}
