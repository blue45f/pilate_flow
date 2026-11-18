import type { ApparatusType, BodyPosition, PilatesExercise } from '../types/pilates';

export type Vec3 = readonly [number, number, number];

export type ActiveMuscleZone3D =
  'quads' | 'glutes' | 'core' | 'obliques' | 'back' | 'adductors' | 'shoulders';

export interface Universal3DPoseRig {
  readonly rigId: string;
  readonly rigScope: 'dedicated-3d-rig' | 'procedural-3d-synthesis';
  readonly poseFeatureKo: string;
  readonly trajectoryFocus: 'pelvis' | 'chest' | 'rFoot' | 'lFoot' | 'rHand' | 'lHand';
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
  readonly activeZones: readonly ActiveMuscleZone3D[];
}

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

type RigBuilder = (rawT: number) => Omit<Universal3DPoseRig, 'rigId' | 'rigScope'>;

interface DedicatedRigEntry {
  readonly apparatus: ApparatusType;
  readonly bodyPosition?: BodyPosition;
  readonly build: RigBuilder;
}

function chairPedalPos(deg: number): readonly [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [-0.2 + Math.cos(rad) * 0.52, 0.08 + Math.sin(rad) * 0.52];
}

function cadillacPushThroughBarPos(deg: number): readonly [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [0.62 - Math.sin(rad) * 0.66, 1.94 - Math.cos(rad) * 0.66];
}

/**
 * Explicit 3D kinematic pose & apparatus contact generators for all 60 previously-unmodeled
 * `expanded-*` movements, preserving every movement's named pose feature and apparatus contact.
 */
const EXPANDED_DEDICATED_3D_RIGS: Readonly<Record<string, DedicatedRigEntry>> = {
  // ==================== MAT (15) ====================
  'expanded-mat-hundred': {
    apparatus: 'mat',
    bodyPosition: 'supine',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      const pump = Math.sin(rawT * Math.PI * 4.5) * 0.055;
      return {
        poseFeatureKo: '상체 컬업 유지와 양팔 리듬 펌핑·45도 하지 신전',
        trajectoryFocus: 'rHand',
        pelvis: [0.05, 0, 0.13],
        spineMid: [-0.17, 0, lerp(0.15, 0.21, ts)],
        chest: [-0.36, 0, lerp(0.18, 0.35, ts)],
        antHint: [lerp(0.12, 0.55, ts), 0, 1],
        lFoot: vlerp([0.38, -0.09, 0.45], [0.72, -0.07, 0.54], ts),
        rFoot: vlerp([0.38, 0.09, 0.45], [0.72, 0.07, 0.54], ts),
        lKneePole: [0.1, -0.05, lerp(0.95, 0.68, ts)],
        rKneePole: [0.1, 0.05, lerp(0.95, 0.68, ts)],
        lHand: [0.18, -0.22, lerp(0.16, 0.26, ts) + pump],
        rHand: [0.18, 0.22, lerp(0.16, 0.26, ts) + pump],
        lElbowPole: [-0.2, -0.32, 0.06],
        rElbowPole: [-0.2, 0.32, 0.06],
        activeZones: ['core', 'quads'],
      };
    },
  },
  'expanded-mat-roll-up': {
    apparatus: 'mat',
    bodyPosition: 'supine',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      const liftArc = Math.sin(ts * Math.PI) * 0.12;
      return {
        poseFeatureKo: '누운 준비에서 C커브 분절로 앉아 발끝 방향 전굴 리치',
        trajectoryFocus: 'chest',
        pelvis: [0.02, 0, 0.13],
        spineMid: [lerp(-0.22, -0.02, ts), 0, lerp(0.14, 0.34, ts) + liftArc * 0.55],
        chest: [lerp(-0.44, 0.16, ts), 0, lerp(0.15, 0.46, ts) + liftArc],
        antHint: vlerp([0.08, 0, 1], [0.92, 0, -0.32], ts),
        lFoot: [0.74, -0.09, 0.12],
        rFoot: [0.74, 0.09, 0.12],
        lKneePole: [0.15, -0.08, 0.92],
        rKneePole: [0.15, 0.08, 0.92],
        lHand: vlerp([-0.5, -0.18, 0.54], [0.62, -0.16, 0.36], ts),
        rHand: vlerp([-0.5, 0.18, 0.54], [0.62, 0.16, 0.36], ts),
        lElbowPole: [-0.2, -0.65, 0.45],
        rElbowPole: [-0.2, 0.65, 0.45],
        activeZones: ['core'],
      };
    },
  },
  'expanded-mat-single-leg-circle': {
    apparatus: 'mat',
    bodyPosition: 'supine',
    build: (rawT) => {
      const ang = rawT * Math.PI * 1.35;
      const cx = 0.14 + Math.sin(ang * 0.75) * 0.28;
      const cy = 0.08 - Math.sin(ang) * 0.22;
      const cz = 0.68 + Math.cos(ang * 0.85) * 0.14;
      return {
        poseFeatureKo: '반대 다리 매트 고정 지지와 올린 한 다리의 3D 원형 궤적',
        trajectoryFocus: 'rFoot',
        pelvis: [0.04, 0, 0.13],
        spineMid: [-0.18, 0, 0.14],
        chest: [-0.4, 0, 0.15],
        antHint: [0, 0, 1],
        lFoot: [0.78, -0.1, 0.12],
        rFoot: [cx, cy, cz],
        lKneePole: [0.4, -0.1, 0.45],
        rKneePole: [-0.1, 0.08, 0.85],
        lHand: [0.08, -0.24, 0.09],
        rHand: [0.08, 0.24, 0.09],
        lElbowPole: [-0.2, -0.35, 0.05],
        rElbowPole: [-0.2, 0.35, 0.05],
        activeZones: ['core', 'adductors', 'quads'],
      };
    },
  },
  'expanded-mat-double-leg-kick': {
    apparatus: 'mat',
    bodyPosition: 'prone',
    build: (rawT) => {
      const bendPhase = 1 - smoothstep(rawT);
      const ext = smoothstep(Math.max(0, (rawT - 0.15) / 0.85));
      return {
        poseFeatureKo: '엎드린 양무릎 굽힘 킥에서 등 뒤 양손 깍지·흉추 신전 전환',
        trajectoryFocus: 'chest',
        pelvis: [0.02, 0, 0.13],
        spineMid: [-0.2, 0, lerp(0.14, 0.24, ext)],
        chest: [-0.42, 0, lerp(0.16, 0.38, ext)],
        antHint: [-lerp(0.25, 0.72, ext), 0, -0.85],
        lFoot: [lerp(0.72, 0.38, bendPhase), 0.1, lerp(0.18 + ext * 0.12, 0.46, bendPhase)],
        rFoot: [lerp(0.72, 0.38, bendPhase), -0.1, lerp(0.18 + ext * 0.12, 0.46, bendPhase)],
        lKneePole: [0.55, 0.52, -0.45],
        rKneePole: [0.55, -0.52, -0.45],
        lHand: [lerp(-0.1, 0.04, ext), lerp(0.09, 0.06, ext), lerp(0.24, 0.34, ext)],
        rHand: [lerp(-0.1, 0.04, ext), lerp(-0.09, -0.06, ext), lerp(0.24, 0.34, ext)],
        lElbowPole: [-0.15, 0.75, 0.55],
        rElbowPole: [-0.15, -0.75, 0.55],
        activeZones: ['back', 'glutes', 'shoulders'],
      };
    },
  },
  'expanded-mat-hip-circles': {
    apparatus: 'mat',
    bodyPosition: 'seated',
    build: (rawT) => {
      const ang = rawT * Math.PI * 1.35;
      const swayY = Math.sin(ang) * 0.22;
      const dipZ = (1 - Math.cos(ang * 0.85)) * 0.1;
      return {
        poseFeatureKo: '몸 뒤 양손 매트 지지와 공중 V자 양다리의 3D 원형 서클',
        trajectoryFocus: 'rFoot',
        pelvis: [-0.04, swayY * 0.15, 0.14],
        spineMid: [-0.2, 0, 0.28],
        chest: [-0.34, 0, 0.44],
        antHint: [0.75, 0, 0.65],
        lFoot: [0.42 + dipZ * 0.45, -0.07 + swayY, 0.72 - dipZ],
        rFoot: [0.42 + dipZ * 0.45, 0.07 + swayY, 0.72 - dipZ],
        lKneePole: [0.1, -0.08 + swayY * 0.5, 0.85],
        rKneePole: [0.1, 0.08 + swayY * 0.5, 0.85],
        lHand: [-0.48, -0.22, 0.09],
        rHand: [-0.48, 0.22, 0.09],
        lElbowPole: [-0.62, -0.3, 0.22],
        rElbowPole: [-0.62, 0.3, 0.22],
        activeZones: ['core', 'obliques', 'quads'],
      };
    },
  },
  'expanded-mat-kneeling-side-kicks': {
    apparatus: 'mat',
    bodyPosition: 'kneeling',
    build: (rawT) => {
      const sweep =
        rawT <= 0.5
          ? -smoothstep(rawT * 2) * 0.32
          : lerp(-0.32, 0.28, smoothstep((rawT - 0.5) * 2));
      return {
        poseFeatureKo: '한쪽 손·무릎 측면 지지와 수평으로 들어 올린 다리의 앞뒤 킥',
        trajectoryFocus: 'rFoot',
        pelvis: [0.02, 0.02, 0.55],
        spineMid: [-0.2, 0.02, 0.57],
        chest: [-0.42, 0.02, 0.59],
        antHint: [0, -1, 0.08],
        lFoot: [0.04, 0.4, 0.07],
        rFoot: [0.8 - Math.abs(sweep) * 0.1, -0.05 + sweep, 0.54],
        lKneePole: [0.06, -0.82, -0.56],
        rKneePole: [0.15, -0.92, 0.2],
        lHand: [-0.44, 0.14, 0.08],
        rHand: [-0.42, -0.12, 0.72],
        lElbowPole: [-0.52, 0.32, 0.28],
        rElbowPole: [-0.44, -0.32, 0.78],
        activeZones: ['glutes', 'obliques', 'core'],
      };
    },
  },
  'expanded-mat-leg-pull-front': {
    apparatus: 'mat',
    bodyPosition: 'prone',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      return {
        poseFeatureKo: '양손·발 플랭크 지지에서 몸통 수평 유지 채 한 다리 후상방 리프트',
        trajectoryFocus: 'rFoot',
        pelvis: [0.04, 0, 0.41],
        spineMid: [-0.18, 0, 0.46],
        chest: [-0.4, 0, 0.51],
        antHint: [-0.2, 0, -0.98],
        lFoot: [0.76, 0.09, 0.09],
        rFoot: [
          lerp(0.76, 0.81, ts) + Math.sin(ts * Math.PI) * 0.045,
          -0.09,
          lerp(0.09, 0.56, ts),
        ],
        lKneePole: [-0.22, 0.08, -0.96],
        rKneePole: [-0.22, -0.08, -0.96],
        lHand: [-0.42, 0.19, 0.08],
        rHand: [-0.42, -0.19, 0.08],
        lElbowPole: [0.35, 0.72, 0.28],
        rElbowPole: [0.35, -0.72, 0.28],
        activeZones: ['core', 'glutes', 'shoulders'],
      };
    },
  },
  'expanded-mat-leg-pull-back': {
    apparatus: 'mat',
    bodyPosition: 'seated',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      return {
        poseFeatureKo: '몸 뒤 양손·발뒤꿈치 리버스 플랭크 지지와 골반 수평·한 다리 리프트',
        trajectoryFocus: 'rFoot',
        pelvis: [0.02, 0, lerp(0.28, 0.42, ts)],
        spineMid: [-0.2, 0, lerp(0.38, 0.48, ts)],
        chest: [-0.4, 0, 0.54],
        antHint: [0.22, 0, 0.96],
        lFoot: [0.74, -0.09, 0.11],
        rFoot: [lerp(0.74, 0.56, ts), 0.09, lerp(0.11, 0.72, ts)],
        lKneePole: [0.4, -0.09, 0.55],
        rKneePole: [0.25, 0.09, 0.85],
        lHand: [-0.44, -0.2, 0.09],
        rHand: [-0.44, 0.2, 0.09],
        lElbowPole: [-0.62, -0.3, 0.28],
        rElbowPole: [-0.62, 0.3, 0.28],
        activeZones: ['glutes', 'back', 'shoulders'],
      };
    },
  },
  'expanded-mat-side-bend': {
    apparatus: 'mat',
    bodyPosition: 'side-lying',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      const lift = lerp(0.18, 0.52, ts);
      return {
        poseFeatureKo: '한 손·교차 발 측면 지지에서 골반 아치 리프트와 위쪽 팔 오버헤드 곡선',
        trajectoryFocus: 'pelvis',
        pelvis: [0.06, 0, lift],
        spineMid: [-0.16, 0, lift + lerp(0.08, 0.16, ts)],
        chest: [-0.36, 0, lift + lerp(0.18, 0.08, ts)],
        antHint: [0, -1, 0.12],
        lFoot: [0.66, 0.05, 0.1],
        rFoot: [0.62, -0.05, 0.1],
        lKneePole: [0.35, -0.58, lerp(0.24, 0.42, ts)],
        rKneePole: [0.35, -0.62, lerp(0.28, 0.46, ts)],
        lHand: [-0.46, 0.04, 0.09],
        rHand: vlerp([0.04, -0.14, 0.38], [-0.62, -0.08, 0.86], ts),
        lElbowPole: [-0.55, 0.45, 0.28],
        rElbowPole: [-0.25, -0.45, 0.92],
        activeZones: ['obliques', 'shoulders', 'glutes'],
      };
    },
  },
  'expanded-mat-side-kicks': {
    apparatus: 'mat',
    bodyPosition: 'side-lying',
    build: (rawT) => {
      const sweep =
        rawT <= 0.5
          ? -smoothstep(rawT * 2) * 0.36
          : lerp(-0.36, 0.28, smoothstep((rawT - 0.5) * 2));
      return {
        poseFeatureKo: '옆으로 누운 몸통 안정 지지와 위쪽 다리의 수평 전·후방 스윙',
        trajectoryFocus: 'rFoot',
        pelvis: [0.04, 0.02, 0.14],
        spineMid: [-0.18, 0.02, 0.15],
        chest: [-0.4, 0.02, 0.18],
        antHint: [0, -1, 0.08],
        lFoot: [0.74, 0.08, 0.11],
        rFoot: [0.68 - Math.abs(sweep) * 0.22, -0.04 + sweep, 0.34],
        lKneePole: [0.4, -0.22, 0.16],
        rKneePole: [0.35, -0.35, 0.36],
        lHand: [-0.56, -0.06, 0.14],
        rHand: [-0.24, -0.18, 0.1],
        lElbowPole: [-0.58, 0.22, 0.14],
        rElbowPole: [-0.28, -0.32, 0.28],
        activeZones: ['glutes', 'core', 'obliques'],
      };
    },
  },
  'expanded-mat-thigh-stretch': {
    apparatus: 'mat',
    bodyPosition: 'kneeling',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      const tilt = lerp(0, 0.24, ts);
      return {
        poseFeatureKo: '양 무릎 지지에서 무릎~정수리 일직선 유지 채 후방 힌지 기울기',
        trajectoryFocus: 'chest',
        pelvis: [0.06 - tilt * 0.55, 0, lerp(0.46, 0.41, ts)],
        spineMid: [0.05 - tilt * 0.9, 0, lerp(0.68, 0.61, ts)],
        chest: [0.04 - tilt * 1.25, 0, lerp(0.9, 0.8, ts)],
        antHint: [0.94, 0, lerp(0, 0.35, ts)],
        lFoot: [-0.32, -0.1, 0.07],
        rFoot: [-0.32, 0.1, 0.07],
        lKneePole: [0.85, -0.08, -0.55],
        rKneePole: [0.85, 0.08, -0.55],
        lHand: [0.36 - tilt * 0.8, -0.16, lerp(0.84, 0.78, ts)],
        rHand: [0.36 - tilt * 0.8, 0.16, lerp(0.84, 0.78, ts)],
        lElbowPole: [-0.35, -0.75, -0.35],
        rElbowPole: [-0.35, 0.75, -0.35],
        activeZones: ['quads', 'core', 'glutes'],
      };
    },
  },
  'expanded-mat-swimming': {
    apparatus: 'mat',
    bodyPosition: 'prone',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      const alt = Math.cos(rawT * Math.PI * 3) * 0.085;
      return {
        poseFeatureKo: '엎드린 흉추 신전 부양과 반대쪽 팔·다리의 교차 플러터 스위밍',
        trajectoryFocus: 'rHand',
        pelvis: [0.02, 0, 0.12],
        spineMid: [-0.2, 0, lerp(0.15, 0.19, ts)],
        chest: [-0.42, 0, lerp(0.21, 0.3, ts)],
        antHint: [-0.45, 0, -0.88],
        lFoot: [0.8, 0.1, 0.2 + alt],
        rFoot: [0.8, -0.1, 0.2 - alt],
        lKneePole: [0.05, 0.08, -1],
        rKneePole: [0.05, -0.08, -1],
        lHand: [-0.84, 0.18, 0.3 - alt],
        rHand: [-0.84, -0.18, 0.3 + alt],
        lElbowPole: [0.25, 0.82, 0.28],
        rElbowPole: [0.25, -0.82, 0.28],
        activeZones: ['back', 'glutes', 'shoulders'],
      };
    },
  },
  'expanded-mat-rocking': {
    apparatus: 'mat',
    bodyPosition: 'prone',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      const rock = Math.sin(rawT * Math.PI) * 0.06;
      return {
        poseFeatureKo: '양손 발목 파지 활 모양 신전과 복부 앞면을 따른 로킹',
        trajectoryFocus: 'chest',
        pelvis: [0.02, 0, 0.13 + rock * 0.4],
        spineMid: [-0.17, 0, lerp(0.19, 0.28, ts)],
        chest: [-0.33, 0, lerp(0.28, 0.46, ts) + rock],
        antHint: [-0.65, 0, -0.75],
        lFoot: [lerp(0.14, 0.06, ts), 0.13, lerp(0.49, 0.62, ts) - rock * 0.4],
        rFoot: [lerp(0.14, 0.06, ts), -0.13, lerp(0.49, 0.62, ts) - rock * 0.4],
        lKneePole: [0.62, 0.18, -0.76],
        rKneePole: [0.62, -0.18, -0.76],
        lHand: [lerp(0.12, 0.05, ts), 0.15, lerp(0.48, 0.61, ts) - rock * 0.4],
        rHand: [lerp(0.12, 0.05, ts), -0.15, lerp(0.48, 0.61, ts) - rock * 0.4],
        lElbowPole: [-0.15, 0.72, 0.55],
        rElbowPole: [-0.15, -0.72, 0.55],
        activeZones: ['back', 'glutes', 'quads'],
      };
    },
  },
  'expanded-mat-footwork': {
    apparatus: 'mat',
    bodyPosition: 'supine',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      return {
        poseFeatureKo: '누운 천골 중립 지지에서 테이블탑→45도 공중 양다리 프레스',
        trajectoryFocus: 'rFoot',
        pelvis: [0.04, 0, 0.13],
        spineMid: [-0.18, 0, 0.14],
        chest: [-0.4, 0, 0.16],
        antHint: [0.08, 0, 1],
        lFoot: vlerp([0.28, -0.09, 0.48], [0.7, -0.06, 0.54], ts),
        rFoot: vlerp([0.28, 0.09, 0.48], [0.7, 0.06, 0.54], ts),
        lKneePole: [0.08, -0.14, lerp(0.95, 0.68, ts)],
        rKneePole: [0.08, 0.14, lerp(0.95, 0.68, ts)],
        lHand: [0.08, -0.24, 0.09],
        rHand: [0.08, 0.24, 0.09],
        lElbowPole: [-0.2, -0.35, 0.05],
        rElbowPole: [-0.2, 0.35, 0.05],
        activeZones: ['core', 'quads', 'adductors'],
      };
    },
  },
  'expanded-mat-half-roll-back': {
    apparatus: 'mat',
    bodyPosition: 'seated',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      return {
        poseFeatureKo: '무릎 세워 앉은 준비에서 요추 C커브 하프 롤백과 복귀',
        trajectoryFocus: 'chest',
        pelvis: [-0.04, 0, 0.13],
        spineMid: vlerp([-0.06, 0, 0.34], [-0.2, 0, 0.25], ts),
        chest: vlerp([-0.04, 0, 0.56], [-0.34, 0, 0.4], ts),
        antHint: vlerp([0.96, 0, 0.12], [0.72, 0, 0.68], ts),
        lFoot: [0.54, -0.1, 0.1],
        rFoot: [0.54, 0.1, 0.1],
        lKneePole: [0.22, -0.1, 0.58],
        rKneePole: [0.22, 0.1, 0.58],
        lHand: vlerp([0.32, -0.16, 0.52], [0.12, -0.16, 0.46], ts),
        rHand: vlerp([0.32, 0.16, 0.52], [0.12, 0.16, 0.46], ts),
        lElbowPole: [-0.1, -0.34, 0.44],
        rElbowPole: [-0.1, 0.34, 0.44],
        activeZones: ['core'],
      };
    },
  },

  // ==================== REFORMER (15) ====================
  'expanded-reformer-elephant': {
    apparatus: 'reformer',
    bodyPosition: 'standing',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      const cx = lerp(0.22, -0.12, ts);
      return {
        poseFeatureKo: '고정 풋바 양손 지지와 캐리지 양발 평행 밀착 파이크 왕복',
        trajectoryFocus: 'pelvis',
        carriageX: cx,
        pelvis: [cx + 0.18, 0, lerp(1.06, 0.98, ts)],
        spineMid: [cx + 0.36, 0, 1.04],
        chest: [0.62, 0, 0.92],
        antHint: [0.3, 0, -0.95],
        lFoot: [cx - 0.12, -0.09, 0.45],
        rFoot: [cx - 0.12, 0.09, 0.45],
        lKneePole: [0.5, -0.06, 0.7],
        rKneePole: [0.5, 0.06, 0.7],
        lHand: [0.82, -0.16, 0.58],
        rHand: [0.82, 0.16, 0.58],
        lElbowPole: [0.3, -0.26, 0.9],
        rElbowPole: [0.3, 0.26, 0.9],
        activeZones: ['core', 'glutes', 'shoulders'],
      };
    },
  },
  'expanded-reformer-long-stretch': {
    apparatus: 'reformer',
    bodyPosition: 'prone',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      const cx = lerp(0.08, -0.18, ts);
      return {
        poseFeatureKo: '풋바 양손·숄더블록 양발 지지 긴 사선 플랭크 전·후방 활주',
        trajectoryFocus: 'chest',
        carriageX: cx,
        pelvis: [cx + 0.38, 0, lerp(0.7, 0.65, ts)],
        spineMid: [lerp(0.62, 0.4, ts), 0, lerp(0.78, 0.73, ts)],
        chest: [lerp(0.78, 0.58, ts), 0, lerp(0.86, 0.8, ts)],
        antHint: [0.22, 0, -0.96],
        lFoot: [cx - 0.39, -0.09, 0.46],
        rFoot: [cx - 0.39, 0.09, 0.46],
        lKneePole: [0.22, -0.08, -0.96],
        rKneePole: [0.22, 0.08, -0.96],
        lHand: [0.825, -0.18, 0.58],
        rHand: [0.825, 0.18, 0.58],
        lElbowPole: [-0.35, -0.75, 0.35],
        rElbowPole: [-0.35, 0.75, 0.35],
        activeZones: ['core', 'shoulders', 'glutes'],
      };
    },
  },
  'expanded-reformer-up-stretch': {
    apparatus: 'reformer',
    bodyPosition: 'standing',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      const cx = lerp(0.2, -0.14, ts);
      return {
        poseFeatureKo: '풋바·숄더블록 지지 인버티드 V 파이크에서 긴 사선 플랭크 전환',
        trajectoryFocus: 'pelvis',
        carriageX: cx,
        pelvis: [cx + 0.2, 0, lerp(1.1, 0.84, ts)],
        spineMid: [cx + 0.38, 0, lerp(1.01, 0.86, ts)],
        chest: [lerp(0.64, 0.58, ts), 0, lerp(0.9, 0.87, ts)],
        antHint: [0.28, 0, -0.95],
        lFoot: [cx - 0.15, 0.09, 0.48],
        rFoot: [cx - 0.15, -0.09, 0.48],
        lKneePole: [0.75, 0.12, 0.45],
        rKneePole: [0.75, -0.12, 0.45],
        lHand: [0.825, 0.17, 0.58],
        rHand: [0.825, -0.17, 0.58],
        lElbowPole: [-0.35, 0.75, 0.45],
        rElbowPole: [-0.35, -0.75, 0.45],
        activeZones: ['core', 'shoulders', 'glutes'],
      };
    },
  },
  'expanded-reformer-long-back-stretch': {
    apparatus: 'reformer',
    bodyPosition: 'seated',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      const cx = lerp(0.22, -0.12, ts);
      return {
        poseFeatureKo: '몸 뒤 풋바 양손 지지와 캐리지 발뒤꿈치 리버스 플랭크 푸시',
        trajectoryFocus: 'pelvis',
        carriageX: cx,
        pelvis: [lerp(0.56, 0.34, ts), 0, lerp(0.58, 0.72, ts)],
        spineMid: [lerp(0.66, 0.5, ts), 0, lerp(0.7, 0.79, ts)],
        chest: [lerp(0.76, 0.66, ts), 0, lerp(0.84, 0.86, ts)],
        antHint: [-0.35, 0, 0.93],
        lFoot: [cx - 0.14, -0.09, 0.46],
        rFoot: [cx - 0.14, 0.09, 0.46],
        lKneePole: [0.2, -0.09, 0.85],
        rKneePole: [0.2, 0.09, 0.85],
        lHand: [0.825, -0.19, 0.58],
        rHand: [0.825, 0.19, 0.58],
        lElbowPole: [0.98, -0.3, 0.72],
        rElbowPole: [0.98, 0.3, 0.72],
        activeZones: ['shoulders', 'glutes', 'back'],
      };
    },
  },
  'expanded-reformer-arm-circles': {
    apparatus: 'reformer',
    bodyPosition: 'kneeling',
    build: (rawT) => {
      const ang = rawT * Math.PI * 1.35;
      const cx = 0.16 - smoothstep(rawT) * 0.22;
      const armFwd = Math.sin(ang * 0.75) * 0.28;
      const armOut = Math.sin(ang) * 0.24;
      const armZ = 1.16 - smoothstep(rawT) * 0.34;
      return {
        poseFeatureKo: '캐리지 무릎 직립 지지와 스트랩 파지 양팔의 3D 원형 궤적',
        trajectoryFocus: 'rHand',
        carriageX: cx,
        ropeToHands: true,
        pelvis: [cx + 0.08, 0, 0.81],
        spineMid: [cx + 0.08, 0, 1.03],
        chest: [cx + 0.08, 0, 1.25],
        antHint: [1, 0, 0],
        lFoot: [cx - 0.3, -0.11, 0.44],
        rFoot: [cx - 0.3, 0.11, 0.44],
        lKneePole: [0.85, -0.08, -0.55],
        rKneePole: [0.85, 0.08, -0.55],
        lHand: [cx + 0.18 + armFwd, -0.2 - Math.abs(armOut), armZ],
        rHand: [cx + 0.18 + armFwd, 0.2 + Math.abs(armOut), armZ],
        lElbowPole: [-0.35, -0.82, -0.35],
        rElbowPole: [-0.35, 0.82, -0.35],
        activeZones: ['shoulders', 'core'],
      };
    },
  },
  'expanded-reformer-rowing-sternum': {
    apparatus: 'reformer',
    bodyPosition: 'seated',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      const cx = lerp(0.18, -0.1, ts);
      return {
        poseFeatureKo: '라이저 방향 시티드에서 흉골 앞 스트랩 당김→롤백·후방 팔 오픈',
        trajectoryFocus: 'rHand',
        carriageX: cx,
        ropeToHands: true,
        pelvis: [cx + 0.18, 0, 0.48],
        spineMid: vlerp([cx + 0.18, 0, 0.7], [cx + 0.28, 0, 0.63], ts),
        chest: vlerp([cx + 0.18, 0, 0.92], [cx + 0.38, 0, 0.78], ts),
        antHint: [-1, 0, lerp(0, 0.42, ts)],
        lFoot: [cx - 0.28, 0.09, 0.45],
        rFoot: [cx - 0.28, -0.09, 0.45],
        lKneePole: [-0.25, 0.12, 0.95],
        rKneePole: [-0.25, -0.12, 0.95],
        lHand: vlerp([cx + 0.02, 0.12, 0.82], [cx + 0.42, 0.34, 0.62], ts),
        rHand: vlerp([cx + 0.02, -0.12, 0.82], [cx + 0.42, -0.34, 0.62], ts),
        lElbowPole: [0.35, 0.85, -0.35],
        rElbowPole: [0.35, -0.85, -0.35],
        activeZones: ['back', 'core', 'shoulders'],
      };
    },
  },
  'expanded-reformer-rowing-90': {
    apparatus: 'reformer',
    bodyPosition: 'seated',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      const cx = lerp(0.18, -0.08, ts);
      return {
        poseFeatureKo: '90도 직각 팔꿈치 준비에서 플랫백 힌지→전방 다이브 스윕 로잉',
        trajectoryFocus: 'rHand',
        carriageX: cx,
        ropeToHands: true,
        pelvis: [cx + 0.18, 0, 0.48],
        spineMid: vlerp([cx + 0.18, 0, 0.7], [cx + 0.1, 0, 0.68], ts),
        chest: vlerp([cx + 0.18, 0, 0.92], [cx - 0.02, 0, 0.82], ts),
        antHint: [-1, 0, lerp(0, -0.35, ts)],
        lFoot: [cx - 0.28, 0.09, 0.45],
        rFoot: [cx - 0.28, -0.09, 0.45],
        lKneePole: [-0.25, 0.12, 0.95],
        rKneePole: [-0.25, -0.12, 0.95],
        lHand: vlerp([cx - 0.04, 0.2, 0.92], [cx - 0.28, 0.18, 0.74], ts),
        rHand: vlerp([cx - 0.04, -0.2, 0.92], [cx - 0.28, -0.18, 0.74], ts),
        lElbowPole: [0.35, 0.82, -0.42],
        rElbowPole: [0.35, -0.82, -0.42],
        activeZones: ['back', 'core', 'shoulders'],
      };
    },
  },
  'expanded-reformer-rowing-from-chest': {
    apparatus: 'reformer',
    bodyPosition: 'seated',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      const cx = lerp(0.2, -0.12, ts);
      return {
        poseFeatureKo: '풋바 방향 시티드에서 가슴 앞 스트랩을 전상방 사선으로 프레스',
        trajectoryFocus: 'rHand',
        carriageX: cx,
        ropeToHands: true,
        pelvis: [cx + 0.06, 0, 0.48],
        spineMid: [cx + 0.06, 0, 0.7],
        chest: [cx + 0.07, 0, 0.92],
        antHint: [1, 0, 0],
        lFoot: [cx + 0.44, -0.09, 0.45],
        rFoot: [cx + 0.44, 0.09, 0.45],
        lKneePole: [cx + 0.25, -0.12, 0.75],
        rKneePole: [cx + 0.25, 0.12, 0.75],
        lHand: vlerp([cx + 0.16, -0.16, 0.84], [cx + 0.5, -0.2, 1.08], ts),
        rHand: vlerp([cx + 0.16, 0.16, 0.84], [cx + 0.5, 0.2, 1.08], ts),
        lElbowPole: [cx - 0.08, -0.34, 0.76],
        rElbowPole: [cx - 0.08, 0.34, 0.76],
        activeZones: ['shoulders', 'core'],
      };
    },
  },
  'expanded-reformer-rowing-from-hips': {
    apparatus: 'reformer',
    bodyPosition: 'seated',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      const cx = lerp(0.2, -0.12, ts);
      return {
        poseFeatureKo: '골반 옆 낮은 스트랩 준비에서 전굴 스쿱 후 상방 만세 리프트',
        trajectoryFocus: 'rHand',
        carriageX: cx,
        ropeToHands: true,
        pelvis: [cx + 0.06, 0, 0.48],
        spineMid: vlerp([cx + 0.12, 0, 0.66], [cx + 0.06, 0, 0.71], ts),
        chest: vlerp([cx + 0.22, 0, 0.8], [cx + 0.08, 0, 0.94], ts),
        antHint: [1, 0, lerp(-0.35, 0.05, ts)],
        lFoot: [cx + 0.46, -0.09, 0.45],
        rFoot: [cx + 0.46, 0.09, 0.45],
        lKneePole: [cx + 0.25, -0.12, 0.75],
        rKneePole: [cx + 0.25, 0.12, 0.75],
        lHand: vlerp([cx + 0.1, -0.22, 0.52], [cx + 0.36, -0.18, 1.24], ts),
        rHand: vlerp([cx + 0.1, 0.22, 0.52], [cx + 0.36, 0.18, 1.24], ts),
        lElbowPole: [cx - 0.08, -0.34, 0.85],
        rElbowPole: [cx - 0.08, 0.34, 0.85],
        activeZones: ['core', 'shoulders', 'back'],
      };
    },
  },
  'expanded-reformer-rowing-shave': {
    apparatus: 'reformer',
    bodyPosition: 'seated',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      const cx = lerp(0.2, -0.1, ts);
      return {
        poseFeatureKo: '가부좌 사선 전경 자세에서 뒤통수 뒤 양손 다이아몬드 삼두 신전',
        trajectoryFocus: 'rHand',
        carriageX: cx,
        ropeToHands: true,
        pelvis: [cx + 0.08, 0, 0.48],
        spineMid: [cx + 0.13, 0, 0.7],
        chest: [cx + 0.18, 0, 0.91],
        antHint: [0.96, 0, -0.2],
        lFoot: [cx + 0.24, -0.14, 0.45],
        rFoot: [cx + 0.24, 0.14, 0.45],
        lKneePole: [cx + 0.22, -0.34, 0.5],
        rKneePole: [cx + 0.22, 0.34, 0.5],
        lHand: vlerp([cx + 0.12, -0.07, 1.06], [cx + 0.34, -0.1, 1.38], ts),
        rHand: vlerp([cx + 0.12, 0.07, 1.06], [cx + 0.34, 0.1, 1.38], ts),
        lElbowPole: [cx + 0.16, -0.36, 1.15],
        rElbowPole: [cx + 0.16, 0.36, 1.15],
        activeZones: ['shoulders', 'core', 'back'],
      };
    },
  },
  'expanded-reformer-rowing-hug': {
    apparatus: 'reformer',
    bodyPosition: 'seated',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      const cx = lerp(0.2, -0.1, ts);
      return {
        poseFeatureKo: '가부좌 수직 정렬에서 양팔 둥근 허그 어 트리 스트랩 모으기',
        trajectoryFocus: 'rHand',
        carriageX: cx,
        ropeToHands: true,
        pelvis: [cx + 0.08, 0, 0.48],
        spineMid: [cx + 0.08, 0, 0.7],
        chest: [cx + 0.08, 0, 0.92],
        antHint: [1, 0, 0],
        lFoot: [cx + 0.24, -0.14, 0.45],
        rFoot: [cx + 0.24, 0.14, 0.45],
        lKneePole: [cx + 0.22, -0.34, 0.5],
        rKneePole: [cx + 0.22, 0.34, 0.5],
        lHand: vlerp([cx + 0.14, -0.44, 0.88], [cx + 0.42, -0.08, 0.88], ts),
        rHand: vlerp([cx + 0.14, 0.44, 0.88], [cx + 0.42, 0.08, 0.88], ts),
        lElbowPole: [cx + 0.24, -0.42, 0.86],
        rElbowPole: [cx + 0.24, 0.42, 0.86],
        activeZones: ['shoulders', 'core'],
      };
    },
  },
  'expanded-reformer-hamstring-curl': {
    apparatus: 'reformer',
    bodyPosition: 'prone',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      const cx = lerp(0.14, -0.14, ts);
      const bt = 0.64;
      return {
        poseFeatureKo: '롱박스 엎드린 치골·복부 지지와 양발 스트랩 햄스트링 무릎 굽힘',
        trajectoryFocus: 'rFoot',
        carriageX: cx,
        withLongbox: true,
        ropeToFeet: true,
        pelvis: [cx + 0.02, 0, bt + 0.07],
        spineMid: [cx + 0.22, 0, bt + 0.08],
        chest: [cx + 0.42, 0, bt + 0.11],
        antHint: [0.35, 0, -0.92],
        lFoot: vlerp([cx - 0.66, -0.1, bt + 0.1], [cx - 0.18, -0.1, bt + 0.48], ts),
        rFoot: vlerp([cx - 0.66, 0.1, bt + 0.1], [cx - 0.18, 0.1, bt + 0.48], ts),
        lKneePole: [-0.95, -0.08, -0.28],
        rKneePole: [-0.95, 0.08, -0.28],
        lHand: [cx + 0.48, -0.18, bt + 0.02],
        rHand: [cx + 0.48, 0.18, bt + 0.02],
        lElbowPole: [-0.25, -0.75, 0.45],
        rElbowPole: [-0.25, 0.75, 0.45],
        activeZones: ['glutes', 'core'],
      };
    },
  },
  'expanded-reformer-thigh-stretch': {
    apparatus: 'reformer',
    bodyPosition: 'kneeling',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      const cx = lerp(0.18, 0.02, ts);
      const tilt = lerp(0, 0.22, ts);
      return {
        poseFeatureKo: '라이저 방향 캐리지 무릎 지지와 스트랩 저항 속 허벅지·몸통 기울기',
        trajectoryFocus: 'chest',
        carriageX: cx,
        ropeToHands: true,
        pelvis: [cx + 0.08 + tilt * 0.5, 0, lerp(0.84, 0.8, ts)],
        spineMid: [cx + 0.08 + tilt * 0.85, 0, lerp(1.06, 1.0, ts)],
        chest: [cx + 0.08 + tilt * 1.2, 0, lerp(1.28, 1.18, ts)],
        antHint: [-0.94, 0, lerp(0, 0.32, ts)],
        lFoot: [cx + 0.42, 0.11, 0.45],
        rFoot: [cx + 0.42, -0.11, 0.45],
        lKneePole: [-0.85, 0.08, -0.55],
        rKneePole: [-0.85, -0.08, -0.55],
        lHand: [cx - 0.1 + tilt * 0.8, 0.18, lerp(0.9, 0.86, ts)],
        rHand: [cx - 0.1 + tilt * 0.8, -0.18, lerp(0.9, 0.86, ts)],
        lElbowPole: [0.35, 0.78, -0.45],
        rElbowPole: [0.35, -0.78, -0.45],
        activeZones: ['quads', 'core', 'shoulders'],
      };
    },
  },
  'expanded-reformer-stomach-massage-hands-back': {
    apparatus: 'reformer',
    bodyPosition: 'seated',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      const cx = lerp(0.24, -0.14, ts);
      return {
        poseFeatureKo: '숄더블록 뒤쪽 양손 지지와 풋바 전족부 밀착 캐리지 레그 프레스',
        trajectoryFocus: 'pelvis',
        carriageX: cx,
        pelvis: [cx + 0.24, 0, 0.48],
        spineMid: [cx + 0.1, 0, 0.68],
        chest: [cx - 0.02, 0, 0.88],
        antHint: [0.94, 0, 0.28],
        lFoot: [0.825, -0.07, lerp(0.58, 0.63, ts)],
        rFoot: [0.825, 0.07, lerp(0.58, 0.63, ts)],
        lKneePole: [0.55, -0.18, lerp(0.96, 0.72, ts)],
        rKneePole: [0.55, 0.18, lerp(0.96, 0.72, ts)],
        lHand: [cx - 0.2, -0.16, 0.52],
        rHand: [cx - 0.2, 0.16, 0.52],
        lElbowPole: [cx - 0.34, -0.26, 0.68],
        rElbowPole: [cx - 0.34, 0.26, 0.68],
        activeZones: ['quads', 'core', 'shoulders'],
      };
    },
  },
  'expanded-reformer-single-leg-elephant': {
    apparatus: 'reformer',
    bodyPosition: 'standing',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      const cx = lerp(0.22, -0.1, ts);
      return {
        poseFeatureKo: '풋바 양손·한 발 캐리지 지지와 반대 다리 후상방 아라베스크 왕복',
        trajectoryFocus: 'pelvis',
        carriageX: cx,
        pelvis: [cx + 0.14, 0, 1.12],
        spineMid: [cx + 0.34, 0, 1.04],
        chest: [0.62, 0, 0.91],
        antHint: [0.3, 0, -0.95],
        lFoot: [cx - 0.12, -0.07, 0.45],
        rFoot: [cx - 0.61, 0.08, lerp(0.98, 1.18, ts)],
        lKneePole: [0.95, -0.07, 0.18],
        rKneePole: [0.18, 0.08, -0.96],
        lHand: [0.825, -0.16, 0.58],
        rHand: [0.825, 0.16, 0.58],
        lElbowPole: [-0.35, -0.75, 0.35],
        rElbowPole: [-0.35, 0.75, 0.35],
        activeZones: ['glutes', 'core', 'shoulders'],
      };
    },
  },

  // ==================== CADILLAC (12) ====================
  'expanded-cadillac-standing-butterfly': {
    apparatus: 'cadillac',
    bodyPosition: 'standing',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      return {
        poseFeatureKo: '타워 앞 스탠딩에서 암 스프링 파지 양팔 수평 버터플라이 오픈·흉추 확장',
        trajectoryFocus: 'rHand',
        armSpringsFrom: [1.05, 1.48],
        pelvis: [1.42, 0, 0.9],
        spineMid: [1.43, 0, 1.12],
        chest: [lerp(1.43, 1.47, ts), 0, 1.34],
        antHint: [1, lerp(0, -0.24, ts), 0],
        lFoot: [1.4, -0.12, 0.05],
        rFoot: [1.4, 0.12, 0.05],
        lKneePole: [1.72, -0.12, 0.48],
        rKneePole: [1.72, 0.12, 0.48],
        lHand: vlerp([1.56, -0.42, 1.32], [1.74, -0.14, 1.32], ts),
        rHand: vlerp([1.56, 0.42, 1.32], [1.74, 0.14, 1.32], ts),
        lElbowPole: [1.38, -0.45, 1.24],
        rElbowPole: [1.38, 0.45, 1.24],
        activeZones: ['shoulders', 'core'],
      };
    },
  },
  'expanded-cadillac-standing-fencing': {
    apparatus: 'cadillac',
    bodyPosition: 'standing',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      return {
        poseFeatureKo: '측면 펜싱 런지 지지에서 암 스프링 전방 펀치와 흉추 회전',
        trajectoryFocus: 'rHand',
        armSpringsFrom: [1.05, 1.44],
        pelvis: [lerp(1.42, 1.54, ts), 0, lerp(0.88, 0.8, ts)],
        spineMid: [lerp(1.44, 1.58, ts), 0, lerp(1.1, 1.02, ts)],
        chest: [lerp(1.46, 1.62, ts), 0, lerp(1.32, 1.24, ts)],
        antHint: vlerp([0.35, -0.94, 0], [0.94, -0.32, 0], ts),
        lFoot: [1.26, -0.12, 0.05],
        rFoot: [1.72, 0.08, 0.05],
        lKneePole: [1.18, -0.25, 0.46],
        rKneePole: [1.98, 0.08, 0.48],
        lHand: [1.32, -0.24, 1.18],
        rHand: vlerp([1.36, 0.18, 1.28], [1.92, 0.08, 1.28], ts),
        lElbowPole: [1.18, -0.35, 1.12],
        rElbowPole: [1.46, 0.35, 1.18],
        activeZones: ['obliques', 'glutes', 'shoulders'],
      };
    },
  },
  'expanded-cadillac-roll-back-biceps': {
    apparatus: 'cadillac',
    bodyPosition: 'standing',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      const bx = lerp(1.22, 1.38, ts);
      const bz = lerp(1.28, 1.38, ts);
      return {
        poseFeatureKo: '타워 정면 스탠딩 지지에서 롤백 바 수평 높이 고정 팔꿈치 바이셉 컬',
        trajectoryFocus: 'rHand',
        rolldownBar: [bx, bz],
        pelvis: [1.54, 0, 0.88],
        spineMid: [1.55, 0, 1.1],
        chest: [1.56, 0, 1.32],
        antHint: [-1, 0, 0],
        lFoot: [1.54, 0.11, 0.05],
        rFoot: [1.54, -0.11, 0.05],
        lKneePole: [-1, 0.08, 0],
        rKneePole: [-1, -0.08, 0],
        lHand: [bx, 0.18, bz],
        rHand: [bx, -0.18, bz],
        lElbowPole: [-0.25, 0.72, -0.65],
        rElbowPole: [-0.25, -0.72, -0.65],
        activeZones: ['shoulders', 'core', 'back'],
      };
    },
  },
  'expanded-cadillac-roll-back-shave': {
    apparatus: 'cadillac',
    bodyPosition: 'standing',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      const bx = lerp(1.36, 1.46, ts);
      const bz = lerp(1.46, 1.72, ts);
      return {
        poseFeatureKo: '타워 등지고 선 런지 자세에서 롤백 바 머리 뒤→상방 삼두 셰이브 신전',
        trajectoryFocus: 'rHand',
        rolldownBar: [bx, bz],
        pelvis: [1.44, 0, 0.88],
        spineMid: [1.46, 0, 1.1],
        chest: [1.48, 0, 1.32],
        antHint: [1, 0, 0],
        lFoot: [1.34, -0.1, 0.05],
        rFoot: [1.58, 0.1, 0.05],
        lKneePole: [1, -0.08, 0],
        rKneePole: [1, 0.08, 0],
        lHand: [bx, -0.14, bz],
        rHand: [bx, 0.14, bz],
        lElbowPole: [0.35, -0.82, 0.45],
        rElbowPole: [0.35, 0.82, 0.45],
        activeZones: ['shoulders', 'core'],
      };
    },
  },
  'expanded-cadillac-roll-back-zip-up': {
    apparatus: 'cadillac',
    bodyPosition: 'standing',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      const bx = lerp(1.24, 1.4, ts);
      const bz = lerp(1.06, 1.36, ts);
      return {
        poseFeatureKo: '타워 정면 스탠딩에서 롤백 바를 몸통 가까이 수직 업라이트 로우 집업',
        trajectoryFocus: 'rHand',
        rolldownBar: [bx, bz],
        pelvis: [1.52, 0, 0.88],
        spineMid: [1.52, 0, 1.1],
        chest: [1.52, 0, 1.32],
        antHint: [-1, 0, 0],
        lFoot: [1.52, 0.12, 0.05],
        rFoot: [1.52, -0.12, 0.05],
        lKneePole: [-1, 0.08, 0],
        rKneePole: [-1, -0.08, 0],
        lHand: [bx, 0.12, bz],
        rHand: [bx, -0.12, bz],
        lElbowPole: [0.1, 0.92, 0.35],
        rElbowPole: [0.1, -0.92, 0.35],
        activeZones: ['shoulders', 'back', 'core'],
      };
    },
  },
  'expanded-cadillac-roll-back-side-arm': {
    apparatus: 'cadillac',
    bodyPosition: 'standing',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      const bx = lerp(1.26, 1.42, ts);
      const bz = lerp(1.34, 1.08, ts);
      return {
        poseFeatureKo: '타워 측면 스탠딩 지지와 한 손 롤백 바 하방 프레스·측면 코어 저항',
        trajectoryFocus: 'lHand',
        rolldownBar: [bx, bz],
        pelvis: [1.48, 0.04, 0.9],
        spineMid: [1.48, 0.04, 1.12],
        chest: [1.48, lerp(0.04, 0.08, ts), 1.34],
        antHint: [0, -1, 0],
        lFoot: [1.38, 0.04, 0.05],
        rFoot: [1.58, 0.04, 0.05],
        lKneePole: [1.38, -0.28, 0.48],
        rKneePole: [1.58, -0.28, 0.48],
        lHand: [bx, -0.02, bz],
        rHand: [1.62, 0.16, lerp(1.06, 1.48, ts)],
        lElbowPole: [1.26, -0.28, 1.24],
        rElbowPole: [1.68, -0.18, 1.32],
        activeZones: ['obliques', 'shoulders', 'core'],
      };
    },
  },
  'expanded-cadillac-roll-back-thigh-stretch': {
    apparatus: 'cadillac',
    bodyPosition: 'kneeling',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      const tilt = lerp(0, 0.24, ts);
      const bx = lerp(0.54, 0.36, ts);
      const bz = lerp(1.36, 1.26, ts);
      return {
        poseFeatureKo: '캐딜락 테이블 무릎 지지에서 롤백 바 저항 속 허벅지·몸통 사선 후경',
        trajectoryFocus: 'chest',
        rolldownBar: [bx, bz],
        pelvis: [0.14 - tilt * 0.55, 0, lerp(0.98, 0.92, ts)],
        spineMid: [0.14 - tilt * 0.9, 0, lerp(1.2, 1.12, ts)],
        chest: [0.14 - tilt * 1.25, 0, lerp(1.42, 1.31, ts)],
        antHint: [0.95, 0, lerp(0, 0.32, ts)],
        lFoot: [-0.24, -0.11, 0.62],
        rFoot: [-0.24, 0.11, 0.62],
        lKneePole: [0.85, -0.08, -0.55],
        rKneePole: [0.85, 0.08, -0.55],
        lHand: [bx, -0.18, bz],
        rHand: [bx, 0.18, bz],
        lElbowPole: [-0.35, -0.78, -0.35],
        rElbowPole: [-0.35, 0.78, -0.35],
        activeZones: ['quads', 'core', 'glutes'],
      };
    },
  },
  'expanded-cadillac-leg-springs-bicycle': {
    apparatus: 'cadillac',
    bodyPosition: 'supine',
    build: (rawT) => {
      const ang = rawT * Math.PI * 1.25;
      const lx = -0.26 + Math.cos(ang) * 0.26;
      const lz = 1.08 + Math.sin(ang + 0.5) * 0.22;
      const rx = -0.26 + Math.cos(ang + Math.PI) * 0.26;
      const rz = 1.08 + Math.sin(ang + Math.PI + 0.5) * 0.22;
      return {
        poseFeatureKo: '테이블 윗등·폴 양손 파지 고정과 독립 양측 레그 스프링 교차 바이시클',
        trajectoryFocus: 'rFoot',
        legSprings: true,
        pelvis: [0.16, 0, 0.61],
        spineMid: [0.38, 0, 0.61],
        chest: [0.6, 0, 0.62],
        antHint: [0, 0, 1],
        lFoot: [lx, -0.11, lz],
        rFoot: [rx, 0.11, rz],
        lKneePole: [0.15, -0.14, 1.35],
        rKneePole: [0.15, 0.14, 1.35],
        lHand: [1.02, -0.28, 0.92],
        rHand: [1.02, 0.28, 0.92],
        lElbowPole: [0.76, -0.38, 0.66],
        rElbowPole: [0.76, 0.38, 0.66],
        activeZones: ['core', 'glutes', 'quads'],
      };
    },
  },
  'expanded-cadillac-leg-springs-beats': {
    apparatus: 'cadillac',
    bodyPosition: 'supine',
    build: (rawT) => {
      const openWide = Math.sin(rawT * Math.PI) * 0.22;
      const closeTogether = smoothstep(Math.max(0, (rawT - 0.55) / 0.45)) * 0.03;
      return {
        poseFeatureKo: '테이블 수평 골반 고정과 45도 사선 레그 스프링 내전 오픈·크로스 비츠',
        trajectoryFocus: 'rFoot',
        legSprings: true,
        pelvis: [0.16, 0, 0.61],
        spineMid: [0.38, 0, 0.61],
        chest: [0.6, 0, 0.62],
        antHint: [0, 0, 1],
        lFoot: [
          lerp(-0.38, -0.52, smoothstep(rawT)),
          0.07 + openWide - closeTogether,
          lerp(1.14, 0.96, smoothstep(rawT)),
        ],
        rFoot: [
          lerp(-0.38, -0.52, smoothstep(rawT)),
          -0.07 - openWide + closeTogether,
          lerp(1.14, 0.96, smoothstep(rawT)),
        ],
        lKneePole: [0.25, 0.18 + openWide * 0.4, 0.92],
        rKneePole: [0.25, -0.18 - openWide * 0.4, 0.92],
        lHand: [0.98, 0.26, 0.88],
        rHand: [0.98, -0.26, 0.88],
        lElbowPole: [0.35, 0.78, 0.25],
        rElbowPole: [0.35, -0.78, 0.25],
        activeZones: ['adductors', 'core', 'glutes'],
      };
    },
  },
  'expanded-cadillac-side-leg-springs-front-back': {
    apparatus: 'cadillac',
    bodyPosition: 'side-lying',
    build: (rawT) => {
      const sweep =
        rawT <= 0.5
          ? -smoothstep(rawT * 2) * 0.34
          : lerp(-0.34, 0.28, smoothstep((rawT - 0.5) * 2));
      return {
        poseFeatureKo: '옆으로 누워 뒤쪽 폴 파지 몸통 고정과 위쪽 다리 스프링 전·후방 스윙',
        trajectoryFocus: 'rFoot',
        sideLegSpring: 'right',
        pelvis: [0.16, 0.04, 0.62],
        spineMid: [0.38, 0.04, 0.63],
        chest: [0.6, 0.04, 0.65],
        antHint: [0, -1, 0.08],
        lFoot: [-0.54, 0.1, 0.6],
        rFoot: [-0.48 + Math.abs(sweep) * 0.16, -0.04 + sweep, 0.8],
        lKneePole: [-0.2, -0.18, 0.64],
        rKneePole: [-0.15, -0.35, 0.82],
        lHand: [0.98, 0.24, 0.82],
        rHand: [0.32, -0.18, 0.6],
        lElbowPole: [0.8, 0.34, 0.68],
        rElbowPole: [0.36, -0.3, 0.82],
        activeZones: ['glutes', 'core', 'obliques'],
      };
    },
  },
  'expanded-cadillac-side-leg-springs-up-down': {
    apparatus: 'cadillac',
    bodyPosition: 'side-lying',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      return {
        poseFeatureKo: '옆으로 누운 골반 스택 유지와 위쪽 다리 레그 스프링 수직 외전·하강',
        trajectoryFocus: 'rFoot',
        sideLegSpring: 'right',
        pelvis: [0.16, 0.04, 0.62],
        spineMid: [0.38, 0.04, 0.63],
        chest: [0.6, 0.04, 0.65],
        antHint: [0, -1, 0.08],
        lFoot: [-0.54, 0.1, 0.6],
        rFoot: [lerp(-0.52, -0.34, ts), -0.04, lerp(0.68, 1.18, ts)],
        lKneePole: [-0.2, -0.18, 0.64],
        rKneePole: [-0.15, -0.32, 1.05],
        lHand: [0.98, 0.24, 0.82],
        rHand: [0.32, -0.18, 0.6],
        lElbowPole: [0.8, 0.34, 0.68],
        rElbowPole: [0.36, -0.3, 0.82],
        activeZones: ['glutes', 'obliques', 'adductors'],
      };
    },
  },
  'expanded-cadillac-kneeling-side-bend': {
    apparatus: 'cadillac',
    bodyPosition: 'kneeling',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      const ptDeg = lerp(24, -6, ts);
      const [ex, ez] = cadillacPushThroughBarPos(ptDeg);
      return {
        poseFeatureKo: '테이블 무릎 지지에서 한 손 푸시스루 바 상방 밀기와 반대 팔 측굴 아치',
        trajectoryFocus: 'rHand',
        pushthroughDeg: ptDeg,
        pelvis: [0.12, 0.0, 1.03],
        spineMid: [lerp(0.14, 0.24, ts), 0, 1.23],
        chest: [lerp(0.16, 0.36, ts), 0, lerp(1.45, 1.37, ts)],
        antHint: [0, -1, 0.05],
        lFoot: [0.02, 0.36, 0.64],
        rFoot: [0.22, 0.36, 0.64],
        lKneePole: [-0.08, -0.85, -0.55],
        rKneePole: [0.08, -0.85, -0.55],
        lHand: [ex, -0.06, ez],
        rHand: vlerp([-0.12, -0.12, 1.24], [0.46, -0.06, 1.66], ts),
        lElbowPole: [0.45, 0.45, 0.25],
        rElbowPole: [-0.25, -0.55, 0.65],
        activeZones: ['obliques', 'core', 'shoulders'],
      };
    },
  },

  // ==================== CHAIR (10) ====================
  'expanded-chair-swan': {
    apparatus: 'chair',
    bodyPosition: 'prone',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      const pdeg = lerp(8, 28, ts);
      const [px, pz] = chairPedalPos(pdeg);
      return {
        poseFeatureKo: '체어 시트 엎드린 치골·늑골 지지와 양손 페달 상승 제어 흉추 스완 신전',
        trajectoryFocus: 'chest',
        pedalDeg: pdeg,
        pelvis: [-0.08, 0, 0.65],
        spineMid: [0.1, 0, lerp(0.66, 0.77, ts)],
        chest: [0.26, 0, lerp(0.64, 0.94, ts)],
        antHint: [lerp(0.22, 0.68, ts), 0, -1],
        lFoot: [-0.86, -0.09, lerp(0.6, 0.72, ts)],
        rFoot: [-0.86, 0.09, lerp(0.6, 0.72, ts)],
        lKneePole: [0.1, -0.08, -1],
        rKneePole: [0.1, 0.08, -1],
        lHand: [px, -0.16, pz + 0.03],
        rHand: [px, 0.16, pz + 0.03],
        lElbowPole: [-0.35, -0.78, 0.35],
        rElbowPole: [-0.35, 0.78, 0.35],
        activeZones: ['back', 'glutes', 'core'],
      };
    },
  },
  'expanded-chair-kneeling-push-down': {
    apparatus: 'chair',
    bodyPosition: 'kneeling',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      const pdeg = lerp(30, 8, ts);
      const [px, pz] = chairPedalPos(pdeg);
      return {
        poseFeatureKo: '체어 정면 바닥 무릎 지지에서 C커브 롤다운으로 양손 페달 하강 프레스',
        trajectoryFocus: 'lHand',
        pedalDeg: pdeg,
        pelvis: [0.54, 0, 0.48],
        spineMid: vlerp([0.46, 0, 0.72], [0.42, 0, 0.66], ts),
        chest: vlerp([0.36, 0, 0.84], [0.32, 0, 0.58], ts),
        antHint: [-0.7, 0, -0.72],
        lFoot: [0.84, 0.11, 0.06],
        rFoot: [0.84, -0.11, 0.06],
        lKneePole: [-0.85, 0.1, -0.35],
        rKneePole: [-0.85, -0.1, -0.35],
        lHand: [px, 0.15, pz + 0.03],
        rHand: [px, -0.15, pz + 0.03],
        lElbowPole: [0.25, 0.78, 0.45],
        rElbowPole: [0.25, -0.78, 0.45],
        activeZones: ['core', 'shoulders', 'back'],
      };
    },
  },
  'expanded-chair-push-down-front': {
    apparatus: 'chair',
    bodyPosition: 'standing',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      const pdeg = lerp(32, 8, ts);
      const [px, pz] = chairPedalPos(pdeg);
      return {
        poseFeatureKo: '체어 정면 바닥 발 지지에서 척추 C커브 전굴로 양손 페달 프레스',
        trajectoryFocus: 'lHand',
        pedalDeg: pdeg,
        pelvis: [0.64, 0, 0.88],
        spineMid: [0.54, 0, lerp(0.92, 0.84, ts)],
        chest: [0.38, 0, lerp(0.76, 0.58, ts)],
        antHint: [-0.45, 0, -0.9],
        lFoot: [0.64, -0.1, 0.05],
        rFoot: [0.64, 0.1, 0.05],
        lKneePole: [0.36, -0.1, 0.48],
        rKneePole: [0.36, 0.1, 0.48],
        lHand: [px, -0.15, pz + 0.03],
        rHand: [px, 0.15, pz + 0.03],
        lElbowPole: [0.35, -0.32, 0.55],
        rElbowPole: [0.35, 0.32, 0.55],
        activeZones: ['core', 'shoulders'],
      };
    },
  },
  'expanded-chair-push-down-one-arm': {
    apparatus: 'chair',
    bodyPosition: 'standing',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      const pdeg = lerp(32, 8, ts);
      const [px, pz] = chairPedalPos(pdeg);
      return {
        poseFeatureKo: '체어 정면 스탠딩 전굴에서 골반·어깨 수평 유지 채 한 손 페달 프레스',
        trajectoryFocus: 'rHand',
        pedalDeg: pdeg,
        pelvis: [0.64, 0, 0.88],
        spineMid: [0.54, 0, lerp(0.92, 0.84, ts)],
        chest: [0.38, 0, lerp(0.76, 0.58, ts)],
        antHint: [-0.45, 0, -0.9],
        lFoot: [0.64, -0.11, 0.05],
        rFoot: [0.64, 0.11, 0.05],
        lKneePole: [0.36, -0.11, 0.48],
        rKneePole: [0.36, 0.11, 0.48],
        lHand: [0.54, -0.22, 0.86],
        rHand: [px, 0.08, pz + 0.03],
        lElbowPole: [0.58, -0.36, 0.96],
        rElbowPole: [0.35, 0.3, 0.55],
        activeZones: ['obliques', 'core', 'shoulders'],
      };
    },
  },
  'expanded-chair-side-pull-up': {
    apparatus: 'chair',
    bodyPosition: 'standing',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      const pdeg = lerp(8, 30, ts);
      const [px, pz] = chairPedalPos(pdeg);
      return {
        poseFeatureKo: '체어 시트 한 손 측면 지지와 교차 양발 페달 측면 파이크 풀업',
        trajectoryFocus: 'pelvis',
        pedalDeg: pdeg,
        pelvis: [lerp(0.18, 0.06, ts), 0.04, lerp(0.92, 1.2, ts)],
        spineMid: [0.02, 0.02, lerp(0.98, 1.16, ts)],
        chest: [-0.1, 0, 1.04],
        antHint: [0, -1, -0.22],
        lFoot: [px, 0.04, pz + 0.04],
        rFoot: [px, -0.04, pz + 0.05],
        lKneePole: [0.1, -0.28, 0.65],
        rKneePole: [0.1, -0.32, 0.68],
        lHand: [-0.1, 0.02, 0.62],
        rHand: [-0.04, -0.22, lerp(1.12, 1.34, ts)],
        lElbowPole: [-0.28, 0.25, 0.82],
        rElbowPole: [-0.08, -0.36, 1.28],
        activeZones: ['obliques', 'core', 'adductors'],
      };
    },
  },
  'expanded-chair-long-back-arm': {
    apparatus: 'chair',
    bodyPosition: 'seated',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      const pdeg = lerp(26, 8, ts);
      const [px, pz] = chairPedalPos(pdeg);
      return {
        poseFeatureKo: '체어 앞 바닥 발뒤꿈치 지지에서 몸 뒤 양손 페달 삼두 굽힘·신전',
        trajectoryFocus: 'pelvis',
        pedalDeg: pdeg,
        pelvis: [0.54, 0, lerp(0.34, 0.18, ts)],
        spineMid: [0.48, 0, lerp(0.54, 0.38, ts)],
        chest: [0.42, 0, lerp(0.74, 0.58, ts)],
        antHint: [0.94, 0, 0.32],
        lFoot: [1.08, -0.1, 0.06],
        rFoot: [1.08, 0.1, 0.06],
        lKneePole: [0.82, -0.1, 0.52],
        rKneePole: [0.82, 0.1, 0.52],
        lHand: [px, -0.16, pz + 0.03],
        rHand: [px, 0.16, pz + 0.03],
        lElbowPole: [0.18, -0.3, 0.44],
        rElbowPole: [0.18, 0.3, 0.44],
        activeZones: ['shoulders', 'glutes', 'core'],
      };
    },
  },
  'expanded-chair-table': {
    apparatus: 'chair',
    bodyPosition: 'seated',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      const pdeg = lerp(26, 10, ts);
      const [px, pz] = chairPedalPos(pdeg);
      return {
        poseFeatureKo: '체어 시트 양손 지지와 페달 양발 접촉에서 수평 리버스 테이블 골반 리프트',
        trajectoryFocus: 'pelvis',
        pedalDeg: pdeg,
        pelvis: [0.24, 0, lerp(0.65, 0.8, ts)],
        spineMid: [0.07, 0, lerp(0.73, 0.84, ts)],
        chest: [-0.08, 0, lerp(0.84, 0.9, ts)],
        antHint: [0.35, 0, 0.93],
        lFoot: [px, -0.09, pz + 0.04],
        rFoot: [px, 0.09, pz + 0.04],
        lKneePole: [0.55, -0.09, 0.82],
        rKneePole: [0.55, 0.09, 0.82],
        lHand: [-0.1, -0.2, 0.62],
        rHand: [-0.1, 0.2, 0.62],
        lElbowPole: [-0.72, -0.45, 0.35],
        rElbowPole: [-0.72, 0.45, 0.35],
        activeZones: ['glutes', 'shoulders', 'back'],
      };
    },
  },
  'expanded-chair-mermaid-kneeling': {
    apparatus: 'chair',
    bodyPosition: 'kneeling',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      const pdeg = lerp(30, 10, ts);
      const [px, pz] = chairPedalPos(pdeg);
      return {
        poseFeatureKo: '체어 옆 바닥 무릎 지지에서 한 손 페달 하강과 반대 팔 오버헤드 측굴',
        trajectoryFocus: 'rHand',
        pedalDeg: pdeg,
        pelvis: [0.52, 0.02, 0.48],
        spineMid: [lerp(0.5, 0.42, ts), 0, 0.7],
        chest: [lerp(0.46, 0.32, ts), 0, lerp(0.86, 0.74, ts)],
        antHint: [0, -1, 0],
        lFoot: [0.46, 0.24, 0.06],
        rFoot: [0.62, 0.24, 0.06],
        lKneePole: [-0.15, -0.92, -0.25],
        rKneePole: [0.15, -0.92, -0.25],
        lHand: [px, -0.04, pz + 0.03],
        rHand: vlerp([0.66, -0.1, 0.86], [0.22, -0.06, 1.12], ts),
        lElbowPole: [-0.25, 0.72, 0.45],
        rElbowPole: [0.45, -0.55, 0.75],
        activeZones: ['obliques', 'core', 'shoulders'],
      };
    },
  },
  'expanded-chair-single-arm-twist': {
    apparatus: 'chair',
    bodyPosition: 'seated',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      const pdeg = lerp(28, 12, ts);
      const [px, pz] = chairPedalPos(pdeg);
      return {
        poseFeatureKo: '체어 시트 측면 착석에서 한 손 페달 프레스와 반대 팔 후상방 흉추 트위스트',
        trajectoryFocus: 'lHand',
        pedalDeg: pdeg,
        pelvis: [-0.04, 0, 0.67],
        spineMid: [lerp(0.02, 0.1, ts), 0, 0.85],
        chest: [lerp(0.08, 0.2, ts), lerp(0, 0.05, ts), lerp(1.02, 0.84, ts)],
        antHint: vlerp([0, -1, 0], [-0.38, -0.9, -0.18], ts),
        lFoot: [-0.12, -0.3, 0.14],
        rFoot: [0.02, -0.28, 0.14],
        lKneePole: [-0.1, -0.92, 0.25],
        rKneePole: [0.1, -0.92, 0.25],
        lHand: vlerp([-0.24, -0.14, 1.04], [-0.38, 0.2, 1.18], ts),
        rHand: [px, -0.06, pz + 0.03],
        lElbowPole: [-0.65, 0.35, 0.55],
        rElbowPole: [0.45, 0.65, 0.45],
        activeZones: ['obliques', 'core', 'shoulders'],
      };
    },
  },
  'expanded-chair-horseback': {
    apparatus: 'chair',
    bodyPosition: 'seated',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      const pdeg = lerp(30, 14, ts);
      const [px, pz] = chairPedalPos(pdeg);
      return {
        poseFeatureKo: '체어 양옆 내전근 밀착 기승 자세에서 C커브 골반 호버와 페달 터치',
        trajectoryFocus: 'pelvis',
        pedalDeg: pdeg,
        pelvis: [-0.12, 0, lerp(0.68, 0.82, ts)],
        spineMid: [-0.04, 0, lerp(0.88, 0.98, ts)],
        chest: [0.08, 0, lerp(1.04, 0.94, ts)],
        antHint: [0.85, 0, -0.52],
        lFoot: [-0.04, -0.28, lerp(0.18, 0.34, ts)],
        rFoot: [-0.04, 0.28, lerp(0.18, 0.34, ts)],
        lKneePole: [0.18, -0.36, 0.52],
        rKneePole: [0.18, 0.36, 0.52],
        lHand: [px, -0.15, lerp(0.66, pz + 0.04, ts)],
        rHand: [px, 0.15, lerp(0.66, pz + 0.04, ts)],
        lElbowPole: [0.12, -0.32, 0.72],
        rElbowPole: [0.12, 0.32, 0.72],
        activeZones: ['adductors', 'core'],
      };
    },
  },

  // ==================== BARREL (8) ====================
  'expanded-barrel-arm-circles': {
    apparatus: 'barrel',
    bodyPosition: 'supine',
    build: (rawT) => {
      const ang = rawT * Math.PI * 1.35;
      const ax = -0.46 - Math.cos(ang * 0.8) * 0.3;
      const ay = 0.18 + Math.sin(ang * 0.85) * 0.22;
      const az = 1.24 - smoothstep(rawT) * 0.34;
      return {
        poseFeatureKo: '바렐 아치 윗등 드레이프·래더 발 고정에서 덤벨 양팔의 3D 암 서클',
        trajectoryFocus: 'rHand',
        withDumbbells: true,
        pelvis: [-0.06, 0, 0.82],
        spineMid: [-0.28, 0, 0.92],
        chest: [-0.48, 0, 0.88],
        antHint: [-0.15, 0, 0.98],
        lFoot: [0.48, -0.1, 0.42],
        rFoot: [0.48, 0.1, 0.42],
        lKneePole: [0.22, -0.1, 0.92],
        rKneePole: [0.22, 0.1, 0.92],
        lHand: [ax, -ay, az],
        rHand: [ax, ay, az],
        lElbowPole: [0.15, -0.88, -0.42],
        rElbowPole: [0.15, 0.88, -0.42],
        activeZones: ['shoulders', 'core', 'back'],
      };
    },
  },
  'expanded-barrel-arm-hug': {
    apparatus: 'barrel',
    bodyPosition: 'supine',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      return {
        poseFeatureKo: '바렐 아치 흉추 오픈 지지에서 덤벨 양팔 체스트 플라이 허그 모으기',
        trajectoryFocus: 'rHand',
        withDumbbells: true,
        pelvis: [-0.06, 0, 0.82],
        spineMid: [-0.28, 0, 0.92],
        chest: [-0.48, 0, 0.88],
        antHint: [-0.15, 0, 0.98],
        lFoot: [0.48, -0.1, 0.42],
        rFoot: [0.48, 0.1, 0.42],
        lKneePole: [0.22, -0.1, 0.92],
        rKneePole: [0.22, 0.1, 0.92],
        lHand: vlerp([-0.48, -0.46, 0.86], [-0.46, -0.09, 1.24], ts),
        rHand: vlerp([-0.48, 0.46, 0.86], [-0.46, 0.09, 1.24], ts),
        lElbowPole: [-0.48, -0.42, 0.76],
        rElbowPole: [-0.48, 0.42, 0.76],
        activeZones: ['shoulders', 'core'],
      };
    },
  },
  'expanded-barrel-arm-up-down': {
    apparatus: 'barrel',
    bodyPosition: 'supine',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      return {
        poseFeatureKo: '바렐 곡면 등 지지에서 덤벨 양팔의 골반 옆↔오버헤드 수직 아크',
        trajectoryFocus: 'rHand',
        withDumbbells: true,
        pelvis: [-0.06, 0, 0.82],
        spineMid: [-0.28, 0, 0.92],
        chest: [-0.48, 0, 0.88],
        antHint: [-0.15, 0, 0.98],
        lFoot: [0.48, -0.1, 0.42],
        rFoot: [0.48, 0.1, 0.42],
        lKneePole: [0.22, -0.1, 0.92],
        rKneePole: [0.22, 0.1, 0.92],
        lHand: vlerp([-0.14, -0.22, 0.92], [-0.82, -0.18, 0.96], ts),
        rHand: vlerp([-0.14, 0.22, 0.92], [-0.82, 0.18, 0.96], ts),
        lElbowPole: [-0.48, -0.34, 1.15],
        rElbowPole: [-0.48, 0.34, 1.15],
        activeZones: ['shoulders', 'core', 'back'],
      };
    },
  },
  'expanded-barrel-back-stretch': {
    apparatus: 'barrel',
    bodyPosition: 'supine',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      return {
        poseFeatureKo: '래더 발 지지에서 바렐 아치 곡면을 따른 전신 후방 드레이프 신전',
        trajectoryFocus: 'chest',
        pelvis: [-0.06, 0, 0.82],
        spineMid: [-0.28, 0, 0.92],
        chest: [-0.5, 0, lerp(0.92, 0.8, ts)],
        antHint: [lerp(-0.1, -0.38, ts), 0, 0.94],
        lFoot: [0.49, -0.1, 0.4],
        rFoot: [0.49, 0.1, 0.4],
        lKneePole: [0.24, -0.1, 0.88],
        rKneePole: [0.24, 0.1, 0.88],
        lHand: vlerp([-0.42, -0.18, 1.18], [-0.84, -0.18, 0.78], ts),
        rHand: vlerp([-0.42, 0.18, 1.18], [-0.84, 0.18, 0.78], ts),
        lElbowPole: [-0.62, -0.32, 1.05],
        rElbowPole: [-0.62, 0.32, 1.05],
        activeZones: ['back', 'core'],
      };
    },
  },
  'expanded-barrel-big-leg-circles': {
    apparatus: 'barrel',
    bodyPosition: 'supine',
    build: (rawT) => {
      const ang = rawT * Math.PI * 1.35;
      const lx = -0.72 - smoothstep(rawT) * 0.22;
      const spread = Math.sin(ang * 0.85) * 0.24;
      const ly = -0.07 - Math.max(0, spread);
      const ry = 0.07 + Math.max(0, spread);
      const lz = lerp(1.36, 0.86, smoothstep(rawT));
      return {
        poseFeatureKo: '바렐 곡면 등·래더 양손 파지 지지와 공중 양다리의 큰 원형 레그 서클',
        trajectoryFocus: 'rFoot',
        pelvis: [-0.36, 0, 0.89],
        spineMid: [-0.14, 0, 0.91],
        chest: [0.08, 0, 0.85],
        antHint: [0.1, 0, 0.98],
        lFoot: [lx, ly, lz],
        rFoot: [lx, ry, lz],
        lKneePole: [-0.55, ly - 0.05, 1.25],
        rKneePole: [-0.55, ry + 0.05, 1.25],
        lHand: [0.48, -0.2, 0.92],
        rHand: [0.48, 0.2, 0.92],
        lElbowPole: [0.28, -0.32, 0.76],
        rElbowPole: [0.28, 0.32, 0.76],
        activeZones: ['core', 'adductors', 'quads'],
      };
    },
  },
  'expanded-barrel-horseback-jockey': {
    apparatus: 'barrel',
    bodyPosition: 'seated',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      return {
        poseFeatureKo: '바렐 감싼 무릎 조키 기승 자세와 덤벨 양팔의 전·후방 힌지 리치',
        trajectoryFocus: 'rHand',
        withDumbbells: true,
        pelvis: [-0.3, 0, lerp(0.92, 0.98, ts)],
        spineMid: [-0.24, 0, lerp(1.12, 1.16, ts)],
        chest: [-0.14, 0, lerp(1.3, 1.32, ts)],
        antHint: [0.95, 0, -0.24],
        lFoot: [-0.34, -0.29, 0.52],
        rFoot: [-0.34, 0.29, 0.52],
        lKneePole: [-0.04, -0.36, 0.68],
        rKneePole: [-0.04, 0.36, 0.68],
        lHand: vlerp([-0.34, -0.22, 1.06], [0.22, -0.16, 1.46], ts),
        rHand: vlerp([-0.34, 0.22, 1.06], [0.22, 0.16, 1.46], ts),
        lElbowPole: [-0.28, -0.36, 1.18],
        rElbowPole: [-0.28, 0.36, 1.18],
        activeZones: ['adductors', 'glutes', 'shoulders'],
      };
    },
  },
  'expanded-barrel-horseback': {
    apparatus: 'barrel',
    bodyPosition: 'seated',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      const lift = lerp(0.9, 1.05, ts);
      return {
        poseFeatureKo: '바렐 양옆 다리 내전 밀착에서 C커브 골반 호버와 덤벨 팔 리프트',
        trajectoryFocus: 'pelvis',
        withDumbbells: true,
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
        activeZones: ['adductors', 'core', 'shoulders'],
      };
    },
  },
  'expanded-barrel-swimming': {
    apparatus: 'barrel',
    bodyPosition: 'prone',
    build: (rawT) => {
      const ts = smoothstep(rawT);
      const alt = Math.cos(rawT * Math.PI * 3) * 0.09;
      return {
        poseFeatureKo: '바렐 정점 복부·골반 지지에서 반대쪽 팔·다리의 공중 교차 스위밍',
        trajectoryFocus: 'rHand',
        pelvis: [-0.28, 0, 0.91],
        spineMid: [-0.48, 0, lerp(0.94, 0.98, ts)],
        chest: [-0.68, 0, lerp(0.98, 1.08, ts)],
        antHint: [-0.55, 0, -0.82],
        lFoot: [0.5, 0.1, 0.92 + alt],
        rFoot: [0.5, -0.1, 0.92 - alt],
        lKneePole: [0.05, 0.08, -1],
        rKneePole: [0.05, -0.08, -1],
        lHand: [-1.02, 0.18, 1.06 - alt],
        rHand: [-1.02, -0.18, 1.06 + alt],
        lElbowPole: [0.25, 0.82, 0.28],
        rElbowPole: [0.25, -0.82, 0.28],
        activeZones: ['back', 'glutes', 'core'],
      };
    },
  },
};

/**
 * Reusable high-craft 3D pose & apparatus archetype builders for all 98 native (`original-*`, `ex-*`),
 * all 60 `crawled-*` global repertoire movements, and procedural custom/edited synthesis.
 */
function sampleArchetype3DRig(
  archetype: string,
  rawT: number,
  exercise: Pick<
    PilatesExercise,
    'id' | 'nameKo' | 'nameEn' | 'apparatus' | 'bodyPosition' | 'blockCategory' | 'box' | 'props'
  >,
): Omit<Universal3DPoseRig, 'rigId' | 'rigScope'> {
  const ts = smoothstep(rawT);
  switch (archetype) {
    // --- MAT ARCHETYPES ---
    case 'mat-supine-breath': {
      const rib = Math.sin(rawT * Math.PI) * 0.03;
      return {
        poseFeatureKo: '무릎 세운 누운 자세에서 3D 흉곽 확장·골반 시계 미세 틸트',
        trajectoryFocus: 'chest',
        pelvis: [0.04, 0, 0.13 + rib * 0.4],
        spineMid: [-0.18, 0, 0.14 + rib],
        chest: [-0.4, 0, 0.15 + rib * 0.8],
        antHint: [0, 0, 1],
        lFoot: [0.52, -0.1, 0.1],
        rFoot: [0.52, 0.1, 0.1],
        lKneePole: [0.24, -0.1, 0.58],
        rKneePole: [0.24, 0.1, 0.58],
        lHand: vlerp([-0.14, -0.18, 0.24], [-0.52, -0.22, 0.48], ts),
        rHand: vlerp([-0.14, 0.18, 0.24], [-0.52, 0.22, 0.48], ts),
        lElbowPole: [-0.28, -0.34, 0.16],
        rElbowPole: [-0.28, 0.34, 0.16],
        activeZones: ['core'],
      };
    }
    case 'mat-bridge': {
      return {
        poseFeatureKo: '양발 매트 지지에서 꼬리뼈부터 순차 분절로 사선 숄더 브리지 리프트',
        trajectoryFocus: 'pelvis',
        pelvis: [0.06, 0, lerp(0.13, 0.38, ts)],
        spineMid: [-0.16, 0, lerp(0.14, 0.28, ts)],
        chest: [-0.38, 0, 0.16],
        antHint: [lerp(0, 0.32, ts), 0, 1],
        lFoot: [0.52, -0.1, 0.1],
        rFoot: [0.52, 0.1, 0.1],
        lKneePole: [0.3, -0.1, 0.62],
        rKneePole: [0.3, 0.1, 0.62],
        lHand: [0.06, -0.24, 0.09],
        rHand: [0.06, 0.24, 0.09],
        lElbowPole: [-0.2, -0.34, 0.06],
        rElbowPole: [-0.2, 0.34, 0.06],
        activeZones: ['glutes', 'core'],
      };
    }
    case 'mat-foam-roller-supine': {
      const arcOut = Math.sin(rawT * Math.PI) * 0.22;
      return {
        poseFeatureKo: '세로 폼롤러 위 후두부~천골 일직선 지지와 흉곽 안정 3D 암써클',
        trajectoryFocus: 'rHand',
        withFoamRollerUnderSpine: true,
        pelvis: [0.08, 0, 0.255],
        spineMid: [-0.15, 0, lerp(0.258, 0.272, ts)],
        chest: [-0.38, 0, lerp(0.262, 0.282, ts)],
        antHint: [0, 0, 1],
        lFoot: [0.54, -0.15, 0.095],
        rFoot: [0.54, 0.15, 0.095],
        lKneePole: [0.28, -0.15, 0.62],
        rKneePole: [0.28, 0.15, 0.62],
        lHand: [lerp(0.06, -0.66, ts), -0.22 - arcOut, lerp(0.36, 0.32, ts) + arcOut * 0.55],
        rHand: [lerp(0.06, -0.66, ts), 0.22 + arcOut, lerp(0.36, 0.32, ts) + arcOut * 0.55],
        lElbowPole: [-0.24, -0.42, 0.24],
        rElbowPole: [-0.24, 0.42, 0.24],
        activeZones: ['core', 'shoulders', 'back'],
      };
    }
    case 'mat-knee-fold': {
      const isHeelSlide = /heel[\s-]?slide|힐\s*슬라이드/i.test(
        `${exercise.id} ${exercise.nameKo} ${exercise.nameEn}`,
      );
      return {
        poseFeatureKo: isHeelSlide
          ? '누운 중립 골반 고정에서 매트 바닥을 따른 단측성 힐 슬라이드 신전'
          : '누운 중립 골반 고정에서 교대 90도 테이블탑 니 폴드 리프트',
        trajectoryFocus: 'rFoot',
        pelvis: [0.04, 0, 0.13],
        spineMid: [-0.18, 0, 0.14],
        chest: [-0.4, 0, 0.15],
        antHint: [0, 0, 1],
        lFoot: [0.54, -0.1, 0.1],
        rFoot: isHeelSlide
          ? vlerp([0.48, 0.1, 0.1], [0.82, 0.1, 0.11], ts)
          : vlerp([0.54, 0.1, 0.1], [0.32, 0.1, 0.46], ts),
        lKneePole: [0.24, -0.1, 0.56],
        rKneePole: isHeelSlide ? [0.35, 0.1, lerp(0.58, 0.28, ts)] : [0.1, 0.1, 0.76],
        lHand: [0.06, -0.24, 0.09],
        rHand: [0.06, 0.24, 0.09],
        lElbowPole: [-0.2, -0.34, 0.06],
        rElbowPole: [-0.2, 0.34, 0.06],
        activeZones: ['core', 'quads'],
      };
    }
    case 'mat-chest-lift': {
      return {
        poseFeatureKo: '머리 뒤 양손 지지 또는 전방 리치로 견갑 하각까지 흉추 체스트 리프트',
        trajectoryFocus: 'chest',
        pelvis: [0.04, 0, 0.13],
        spineMid: [-0.18, 0, lerp(0.14, 0.2, ts)],
        chest: [-0.36, 0, lerp(0.16, 0.34, ts)],
        antHint: [lerp(0.08, 0.54, ts), 0, 1],
        lFoot: [0.54, -0.1, 0.1],
        rFoot: [0.54, 0.1, 0.1],
        lKneePole: [0.24, -0.1, 0.58],
        rKneePole: [0.24, 0.1, 0.58],
        lHand: vlerp([-0.42, -0.16, 0.22], [0.14, -0.2, 0.3], ts),
        rHand: vlerp([-0.42, 0.16, 0.22], [0.14, 0.2, 0.3], ts),
        lElbowPole: [-0.32, -0.36, 0.28],
        rElbowPole: [-0.32, 0.36, 0.28],
        activeZones: ['core'],
      };
    }
    case 'mat-ab-series': {
      return {
        poseFeatureKo: '흉추 컬업 유지 채 한 무릎 당김과 반대 다리 45도 뻗기 교대',
        trajectoryFocus: 'rFoot',
        pelvis: [0.04, 0, 0.13],
        spineMid: [-0.17, 0, 0.2],
        chest: [-0.36, 0, 0.33],
        antHint: [0.5, 0, 0.86],
        lFoot: vlerp([0.24, -0.09, 0.42], [0.74, -0.08, 0.5], ts),
        rFoot: vlerp([0.74, 0.08, 0.5], [0.24, 0.09, 0.42], ts),
        lKneePole: [0.04, -0.1, 0.8],
        rKneePole: [0.04, 0.1, 0.8],
        lHand: vlerp([0.08, -0.14, 0.46], [0.16, -0.18, 0.34], ts),
        rHand: vlerp([0.16, 0.18, 0.34], [0.08, 0.14, 0.46], ts),
        lElbowPole: [-0.18, -0.34, 0.32],
        rElbowPole: [-0.18, 0.34, 0.32],
        activeZones: ['core', 'quads'],
      };
    }
    case 'mat-rolling-ball': {
      const roll = smoothstep(rawT);
      return {
        poseFeatureKo: '좌골 뒤 균형 C커브에서 어깨뼈까지 구른 뒤 정지 밸런스로 복귀',
        trajectoryFocus: 'pelvis',
        pelvis: vlerp([-0.02, 0, 0.15], [-0.22, 0, 0.3], roll),
        spineMid: vlerp([-0.16, 0, 0.28], [-0.34, 0, 0.18], roll),
        chest: vlerp([-0.1, 0, 0.48], [-0.42, 0, 0.18], roll),
        antHint: vlerp([0.85, 0, -0.3], [0.25, 0, 0.96], roll),
        lFoot: vlerp([0.24, -0.1, 0.24], [-0.04, -0.1, 0.56], roll),
        rFoot: vlerp([0.24, 0.1, 0.24], [-0.04, 0.1, 0.56], roll),
        lKneePole: [0.08, -0.18, 0.68],
        rKneePole: [0.08, 0.18, 0.68],
        lHand: vlerp([0.18, -0.14, 0.32], [-0.04, -0.14, 0.54], roll),
        rHand: vlerp([0.18, 0.14, 0.32], [-0.04, 0.14, 0.54], roll),
        lElbowPole: [-0.04, -0.34, 0.45],
        rElbowPole: [-0.04, 0.34, 0.45],
        activeZones: ['core'],
      };
    }
    case 'mat-teaser': {
      return {
        poseFeatureKo: '상·하체를 동시에 들어 올리는 클래식 V자 티저 코어 밸런스',
        trajectoryFocus: 'chest',
        pelvis: [0.0, 0, 0.14],
        spineMid: vlerp([-0.2, 0, 0.16], [-0.14, 0, 0.3], ts),
        chest: vlerp([-0.42, 0, 0.18], [-0.24, 0, 0.48], ts),
        antHint: vlerp([0.15, 0, 0.98], [0.82, 0, 0.56], ts),
        lFoot: vlerp([0.74, -0.08, 0.18], [0.56, -0.08, 0.68], ts),
        rFoot: vlerp([0.74, 0.08, 0.18], [0.56, 0.08, 0.68], ts),
        lKneePole: [0.22, -0.08, 0.85],
        rKneePole: [0.22, 0.08, 0.85],
        lHand: vlerp([-0.54, -0.18, 0.36], [0.34, -0.16, 0.62], ts),
        rHand: vlerp([-0.54, 0.18, 0.36], [0.34, 0.16, 0.62], ts),
        lElbowPole: [-0.2, -0.34, 0.45],
        rElbowPole: [-0.2, 0.34, 0.45],
        activeZones: ['core', 'quads'],
      };
    }
    case 'mat-inversion': {
      return {
        poseFeatureKo: '양다리를 머리 뒤로 넘긴 후 수직 잭나이프·시저스 인버전 신전',
        trajectoryFocus: 'rFoot',
        pelvis: vlerp([0.04, 0, 0.15], [-0.22, 0, 0.52], ts),
        spineMid: vlerp([-0.18, 0, 0.15], [-0.3, 0, 0.34], ts),
        chest: [-0.4, 0, 0.16],
        antHint: vlerp([0, 0, 1], [-0.45, 0, 0.88], ts),
        lFoot: vlerp([0.48, -0.08, 0.62], [-0.24, -0.08, 1.12], ts),
        rFoot: vlerp([0.48, 0.08, 0.62], [-0.18, 0.08, 1.16], ts),
        lKneePole: [-0.45, -0.08, 0.85],
        rKneePole: [-0.45, 0.08, 0.85],
        lHand: [0.06, -0.22, 0.09],
        rHand: [0.06, 0.22, 0.09],
        lElbowPole: [-0.2, -0.34, 0.06],
        rElbowPole: [-0.2, 0.34, 0.06],
        activeZones: ['core', 'glutes'],
      };
    }
    case 'mat-band-row': {
      return {
        poseFeatureKo: '양발에 걸친 세라밴드를 잡고 앉은 수직 척추 정렬에서 견갑 후인 로우',
        trajectoryFocus: 'rHand',
        withTheraband: true,
        pelvis: [-0.14, 0, 0.14],
        spineMid: [-0.14, 0, 0.36],
        chest: [-0.13, 0, 0.58],
        antHint: [1, 0, 0],
        lFoot: [0.64, -0.1, 0.12],
        rFoot: [0.64, 0.1, 0.12],
        lKneePole: [0.25, -0.1, 0.36],
        rKneePole: [0.25, 0.1, 0.36],
        lHand: vlerp([0.28, -0.16, 0.38], [-0.08, -0.22, 0.42], ts),
        rHand: vlerp([0.28, 0.16, 0.38], [-0.08, 0.22, 0.42], ts),
        lElbowPole: [-0.32, -0.36, 0.42],
        rElbowPole: [-0.32, 0.36, 0.42],
        activeZones: ['back', 'shoulders', 'core'],
      };
    }
    case 'mat-seated-twist': {
      return {
        poseFeatureKo: '양 좌골 대칭 고정에서 축성 흉추 회전과 대각선 쏘우 전굴 리치',
        trajectoryFocus: 'rHand',
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
    case 'mat-mermaid': {
      return {
        poseFeatureKo: 'Z-Sit 착석에서 지지 손 고정과 반대쪽 팔 오버헤드 측면 C커브 신장',
        trajectoryFocus: 'rHand',
        pelvis: [0.0, 0, 0.14],
        spineMid: [lerp(0.0, -0.1, ts), 0, 0.35],
        chest: [lerp(0.0, -0.22, ts), 0, lerp(0.56, 0.48, ts)],
        antHint: [0, -1, 0],
        lFoot: [-0.26, 0.12, 0.1],
        rFoot: [0.34, 0.14, 0.1],
        lKneePole: [-0.26, -0.32, 0.16],
        rKneePole: [0.34, -0.28, 0.16],
        lHand: [-0.36, 0.04, 0.09],
        rHand: vlerp([0.28, -0.08, 0.52], [-0.42, -0.06, 0.84], ts),
        lElbowPole: [-0.48, 0.22, 0.28],
        rElbowPole: [-0.08, -0.28, 0.92],
        activeZones: ['obliques', 'core'],
      };
    }
    case 'mat-side-clam-lift': {
      const isClam = /clam|클램/.test(`${exercise.id} ${exercise.nameKo}`);
      return {
        poseFeatureKo: isClam
          ? '옆으로 누워 양발을 모은 채 위쪽 무릎 외회전 클램 오픈'
          : '옆으로 누운 골반 수직 스택에서 위쪽 다리 외전 리프트',
        trajectoryFocus: 'rFoot',
        pelvis: [0.02, 0.04, 0.14],
        spineMid: [-0.2, 0.04, 0.15],
        chest: [-0.42, 0.04, 0.18],
        antHint: [0, -1, 0.08],
        lFoot: isClam ? [0.46, 0.16, 0.11] : [0.74, 0.08, 0.11],
        rFoot: isClam ? [0.46, 0.14, 0.13] : [lerp(0.74, 0.64, ts), -0.04, lerp(0.18, 0.62, ts)],
        lKneePole: [0.32, -0.24, 0.14],
        rKneePole: isClam
          ? [0.32, lerp(-0.24, -0.1, ts), lerp(0.18, 0.58, ts)]
          : [0.35, -0.32, 0.52],
        lHand: [-0.58, -0.06, 0.14],
        rHand: [-0.22, -0.16, 0.1],
        lElbowPole: [-0.58, 0.22, 0.14],
        rElbowPole: [-0.26, -0.3, 0.28],
        activeZones: ['glutes', 'obliques'],
      };
    }
    case 'mat-open-book': {
      return {
        poseFeatureKo: '옆으로 누운 무릎 90도 고정에서 위쪽 팔을 반대편 바닥으로 여는 흉추 오픈북',
        trajectoryFocus: 'rHand',
        pelvis: [0.06, 0.04, 0.14],
        spineMid: [-0.16, 0.04, 0.15],
        chest: [-0.38, 0.02, 0.16],
        antHint: vlerp([0, -1, 0.1], [0, 0.15, 0.98], ts),
        lFoot: [0.42, -0.26, 0.11],
        rFoot: [0.42, -0.24, 0.15],
        lKneePole: [0.14, -0.38, 0.14],
        rKneePole: [0.14, -0.38, 0.2],
        lHand: [-0.38, -0.44, 0.11],
        rHand: vlerp([-0.38, -0.44, 0.15], [-0.38, 0.42, 0.22], ts),
        lElbowPole: [-0.42, -0.28, 0.14],
        rElbowPole: [-0.38, 0, 0.56],
        activeZones: ['obliques', 'back'],
      };
    }
    case 'mat-quadruped-reach': {
      return {
        poseFeatureKo: '네발기기 테이블 중립 지지에서 반대쪽 팔·다리 수평 버드독 리치',
        trajectoryFocus: 'rHand',
        pelvis: [0.18, 0, 0.45],
        spineMid: [-0.04, 0, 0.46],
        chest: [-0.26, 0, 0.47],
        antHint: [-0.15, 0, -0.98],
        lFoot: vlerp([0.54, 0.11, 0.07], [0.93, 0.1, 0.46], ts),
        rFoot: [0.54, -0.11, 0.07],
        lKneePole: [-0.45, 0.08, -0.88],
        rKneePole: [-0.85, -0.08, -0.55],
        lHand: [-0.28, 0.17, 0.07],
        rHand: vlerp([-0.28, -0.17, 0.07], [-0.76, -0.16, 0.48], ts),
        lElbowPole: [0.35, 0.72, 0.28],
        rElbowPole: [0.25, -0.78, 0.35],
        activeZones: ['core', 'glutes', 'back'],
      };
    }
    case 'mat-forearm-plank': {
      return {
        poseFeatureKo: '전완·무릎 지지에서 머리~골반 사선 일직선 코어 플랭크 유지',
        trajectoryFocus: 'pelvis',
        pelvis: [0.1, 0, lerp(0.36, 0.4, ts)],
        spineMid: [-0.12, 0, lerp(0.37, 0.4, ts)],
        chest: [-0.34, 0, 0.39],
        antHint: [-0.18, 0, -0.98],
        lFoot: [0.68, 0.1, lerp(0.1, 0.16, ts)],
        rFoot: [0.68, -0.1, lerp(0.1, 0.16, ts)],
        lKneePole: [-0.38, 0.08, -0.92],
        rKneePole: [-0.38, -0.08, -0.92],
        lHand: [-0.58, 0.15, 0.07],
        rHand: [-0.58, -0.15, 0.07],
        lElbowPole: [0.55, 0.18, -0.82],
        rElbowPole: [0.55, -0.18, -0.82],
        activeZones: ['core', 'shoulders'],
      };
    }
    case 'mat-swan': {
      return {
        poseFeatureKo: '엎드린 치골 지지와 어깨 옆 손바닥 지지로 상부 흉추 스완 아크 신전',
        trajectoryFocus: 'chest',
        pelvis: [0.02, 0, 0.11],
        spineMid: [-0.2, 0, lerp(0.14, 0.24, ts)],
        chest: [-0.4, 0, lerp(0.16, 0.42, ts)],
        antHint: [-lerp(0.2, 0.72, ts), 0, -0.86],
        lFoot: [0.8, 0.1, 0.09],
        rFoot: [0.8, -0.1, 0.09],
        lKneePole: [0.05, 0.08, -1],
        rKneePole: [0.05, -0.08, -1],
        lHand: [-0.38, 0.24, 0.08],
        rHand: [-0.38, -0.24, 0.08],
        lElbowPole: [0.45, 0.75, 0.28],
        rElbowPole: [0.45, -0.75, 0.28],
        activeZones: ['back', 'glutes', 'core'],
      };
    }
    case 'mat-standing-calf-raise': {
      const lift = lerp(0, 0.075, ts);
      return {
        poseFeatureKo: '매트 스탠딩 수직 축 정렬에서 양발 뒤꿈치 릴레베 상승·하강 제어',
        trajectoryFocus: 'pelvis',
        pelvis: [0.0, 0, 0.88 + lift],
        spineMid: [0.0, 0, 1.1 + lift],
        chest: [0.0, 0, 1.32 + lift],
        antHint: [1, 0, 0],
        lFoot: [0.0, -0.11, 0.06 + lift * 0.85],
        rFoot: [0.0, 0.11, 0.06 + lift * 0.85],
        lKneePole: [0.28, -0.11, 0.48 + lift],
        rKneePole: [0.28, 0.11, 0.48 + lift],
        lHand: vlerp([0.04, -0.22, 0.86], [0.22, -0.24, 1.08 + lift], ts),
        rHand: vlerp([0.04, 0.22, 0.86], [0.22, 0.24, 1.08 + lift], ts),
        lElbowPole: [-0.08, -0.34, 0.96],
        rElbowPole: [-0.08, 0.34, 0.96],
        activeZones: ['quads', 'glutes', 'core'],
      };
    }
    case 'mat-standing-rolldown': {
      return {
        poseFeatureKo: '두 발 대칭 매트 스탠딩에서 경추부터 순차 분절 척추 롤다운·센터링',
        trajectoryFocus: 'chest',
        pelvis: [0.0, 0, lerp(0.88, 0.84, ts)],
        spineMid: [lerp(0.0, 0.12, ts), 0, lerp(1.1, 0.94, ts)],
        chest: [lerp(0.0, 0.26, ts), 0, lerp(1.32, 0.78, ts)],
        antHint: vlerp([1, 0, 0], [0.25, 0, -0.96], ts),
        lFoot: [0.0, -0.11, 0.06],
        rFoot: [0.0, 0.11, 0.06],
        lKneePole: [0.28, -0.11, 0.48],
        rKneePole: [0.28, 0.11, 0.48],
        lHand: vlerp([0.04, -0.22, 0.86], [0.3, -0.16, 0.34], ts),
        rHand: vlerp([0.04, 0.22, 0.86], [0.3, 0.16, 0.34], ts),
        lElbowPole: [0.14, -0.32, 0.75],
        rElbowPole: [0.14, 0.32, 0.75],
        activeZones: ['core', 'back'],
      };
    }

    // --- REFORMER ARCHETYPES ---
    case 'reformer-jumpboard': {
      const cx = lerp(0.22, -0.28, ts);
      const ct = 0.41;
      const flight = smoothstep(Math.max(0, (rawT - 0.28) / 0.72));
      const scissor = Math.sin(rawT * Math.PI) * 0.035;
      return {
        poseFeatureKo: '점프보드 수파인 착지 완충 굴곡에서 삼중 신전 플라이오메트릭 점프 비행',
        trajectoryFocus: 'rFoot',
        carriageX: cx,
        withJumpboard: true,
        pelvis: [cx + 0.24, 0, ct + 0.1],
        spineMid: [cx + 0.02, 0, ct + 0.1],
        chest: [cx - 0.17, 0, ct + 0.11],
        antHint: [0, 0, 1],
        lFoot: [lerp(0.925, 0.62, ts), -0.08, lerp(0.59, 0.67, flight) + scissor],
        rFoot: [lerp(0.925, 0.62, ts), 0.08, lerp(0.59, 0.65, flight) - scissor],
        lKneePole: [0.22, -0.06, lerp(1.22, 0.82, ts)],
        rKneePole: [0.22, 0.06, lerp(1.22, 0.82, ts)],
        lHand: [cx + 0.24, -0.22, ct + 0.04],
        rHand: [cx + 0.24, 0.22, ct + 0.04],
        lElbowPole: [0.02, -0.35, -0.25],
        rElbowPole: [0.02, 0.35, -0.25],
        activeZones: ['quads', 'glutes', 'core'],
      };
    }
    case 'reformer-pelvic-clock-ball': {
      const cx = lerp(0.24, 0.21, ts);
      const ct = 0.41;
      return {
        poseFeatureKo: '풋바 양발 지지·무릎 사이 미니볼 밀착에서 골반 시계 틸트와 흉식 호흡 암 플로트',
        trajectoryFocus: 'rHand',
        carriageX: cx,
        pelvis: [cx + 0.24, 0, ct + lerp(0.095, 0.135, ts)],
        spineMid: [cx + 0.02, 0, ct + lerp(0.105, 0.09, ts)],
        chest: [cx - 0.17, 0, ct + 0.11],
        antHint: [lerp(0, 0.14, ts), 0, 1],
        lFoot: [0.82, -0.085, 0.57],
        rFoot: [0.82, 0.085, 0.57],
        lKneePole: [0.42, -0.085, 1.06],
        rKneePole: [0.42, 0.085, 1.06],
        lHand: vlerp([cx + 0.22, -0.22, ct + 0.05], [cx + 0.02, -0.24, ct + 0.36], ts),
        rHand: vlerp([cx + 0.22, 0.22, ct + 0.05], [cx + 0.02, 0.24, ct + 0.36], ts),
        lElbowPole: [0.05, -0.82, -0.55],
        rElbowPole: [0.05, 0.82, -0.55],
        activeZones: ['core', 'adductors'],
      };
    }
    case 'reformer-footwork-ring': {
      const cx = lerp(0.24, -0.18, ts);
      const ct = 0.41;
      return {
        poseFeatureKo: '허벅지 써클링 외전·내전 텐션 유지 채 와이드 세컨드 캐리지 풋워크 프레스',
        trajectoryFocus: 'chest',
        carriageX: cx,
        pelvis: [cx + 0.24, 0, ct + 0.1],
        spineMid: [cx + 0.02, 0, ct + 0.1],
        chest: [cx - 0.17, 0, ct + 0.11],
        antHint: [0, 0, 1],
        lFoot: [0.82, -0.16, 0.57],
        rFoot: [0.82, 0.16, 0.57],
        lKneePole: [0.24, -0.22, lerp(1.24, 0.9, ts)],
        rKneePole: [0.24, 0.22, lerp(1.24, 0.9, ts)],
        lHand: [cx + 0.25, -0.22, ct + 0.04],
        rHand: [cx + 0.25, 0.22, ct + 0.04],
        lElbowPole: [0.02, -0.35, -0.25],
        rElbowPole: [0.02, 0.35, -0.25],
        activeZones: ['glutes', 'adductors', 'quads'],
      };
    }
    case 'reformer-bridge-ring': {
      const cx = lerp(0.24, 0.04, ts);
      const ct = 0.41;
      return {
        poseFeatureKo: '허벅지 써클링 밀착 브리지 사선 리프트 유지와 햄스트링 캐리지 인·아웃 제어',
        trajectoryFocus: 'pelvis',
        carriageX: cx,
        pelvis: [cx + 0.25, 0, ct + lerp(0.12, 0.35, ts)],
        spineMid: [cx + 0.03, 0, ct + lerp(0.11, 0.24, ts)],
        chest: [cx - 0.17, 0, ct + 0.11],
        antHint: [lerp(0.05, 0.34, ts), 0, 1],
        lFoot: [0.82, -0.09, 0.57],
        rFoot: [0.82, 0.09, 0.57],
        lKneePole: [0.32, -0.09, 1.18],
        rKneePole: [0.32, 0.09, 1.18],
        lHand: [cx + 0.22, -0.22, ct + 0.04],
        rHand: [cx + 0.22, 0.22, ct + 0.04],
        lElbowPole: [0.02, -0.35, -0.25],
        rElbowPole: [0.02, 0.35, -0.25],
        activeZones: ['glutes', 'adductors', 'core'],
      };
    }
    case 'reformer-supine-arms': {
      const cx = lerp(0.22, -0.12, ts);
      const ct = 0.41;
      return {
        poseFeatureKo: '캐리지 수파인 테이블탑 지지와 양손 스트랩 하강 암 프레스·코디네이션',
        trajectoryFocus: 'rHand',
        carriageX: cx,
        ropeToHands: true,
        pelvis: [cx + 0.24, 0, ct + 0.1],
        spineMid: [cx + 0.02, 0, ct + lerp(0.1, 0.15, ts)],
        chest: [cx - 0.17, 0, ct + lerp(0.11, 0.24, ts)],
        antHint: [lerp(0, 0.42, ts), 0, 1],
        lFoot: vlerp([cx + 0.28, -0.09, ct + 0.44], [cx + 0.68, -0.07, ct + 0.5], ts),
        rFoot: vlerp([cx + 0.28, 0.09, ct + 0.44], [cx + 0.68, 0.07, ct + 0.5], ts),
        lKneePole: [-0.72, -0.1, 0.68],
        rKneePole: [-0.72, 0.1, 0.68],
        lHand: vlerp([cx - 0.14, -0.2, ct + 0.52], [cx + 0.2, -0.22, ct + 0.12], ts),
        rHand: vlerp([cx - 0.14, 0.2, ct + 0.52], [cx + 0.2, 0.22, ct + 0.12], ts),
        lElbowPole: [-0.25, -0.82, 0.28],
        rElbowPole: [-0.25, 0.82, 0.28],
        activeZones: ['core', 'shoulders', 'quads'],
      };
    }
    case 'reformer-shortbox-row': {
      const cx = lerp(0.18, -0.08, ts);
      const bt = 0.64;
      return {
        poseFeatureKo: '숏박스 착석 라이저 방향 수직 척추 정렬과 양손 스트랩 견갑 후인 시티드 로우',
        trajectoryFocus: 'rHand',
        carriageX: cx,
        withShortbox: true,
        ropeToHands: true,
        pelvis: [cx + 0.08, 0, bt + 0.08],
        spineMid: [cx + 0.08, 0, bt + 0.3],
        chest: [cx + 0.09, 0, bt + 0.52],
        antHint: [-1, 0, 0],
        lFoot: [cx - 0.32, 0.11, 0.45],
        rFoot: [cx - 0.32, -0.11, 0.45],
        lKneePole: [-0.35, 0.12, 0.92],
        rKneePole: [-0.35, -0.12, 0.92],
        lHand: vlerp([cx - 0.22, 0.18, bt + 0.34], [cx + 0.14, 0.22, bt + 0.28], ts),
        rHand: vlerp([cx - 0.22, -0.18, bt + 0.34], [cx + 0.14, -0.22, bt + 0.28], ts),
        lElbowPole: [0.45, 0.78, -0.38],
        rElbowPole: [0.45, -0.78, -0.38],
        activeZones: ['back', 'shoulders', 'core'],
      };
    }
    case 'reformer-shortbox-tree': {
      const cx = 0.14;
      const bt = 0.64;
      return {
        poseFeatureKo: '숏박스 풋스트랩 반대발 앵커 고정과 한 다리 수직 신전 클라임 어 트리 분절',
        trajectoryFocus: 'rFoot',
        carriageX: cx,
        withShortbox: true,
        pelvis: [cx + 0.08, 0, bt + 0.08],
        spineMid: vlerp([cx + 0.06, 0, bt + 0.3], [cx - 0.1, 0, bt + 0.21], ts),
        chest: vlerp([cx + 0.04, 0, bt + 0.52], [cx - 0.26, 0, bt + 0.34], ts),
        antHint: vlerp([0.96, 0, 0.2], [0.68, 0, 0.72], ts),
        lFoot: [0.84, -0.1, 0.54],
        rFoot: vlerp([0.52, 0.09, 0.94], [0.1, 0.08, 1.36], ts),
        lKneePole: [0.45, -0.12, 0.88],
        rKneePole: [-0.82, 0.18, 0.52],
        lHand: vlerp([0.36, -0.1, 0.94], [0.08, -0.08, 1.24], ts),
        rHand: vlerp([0.36, 0.14, 0.94], [0.08, 0.14, 1.24], ts),
        lElbowPole: [-0.25, -0.75, 0.35],
        rElbowPole: [-0.25, 0.75, 0.35],
        activeZones: ['core', 'quads'],
      };
    }
    case 'reformer-shortbox-abs': {
      const cx = 0.14;
      const bt = 0.64;
      const exText = `${exercise.id} ${exercise.nameKo} ${exercise.nameEn}`;
      const isFlatOnly = /flat\s*back|플랫백/.test(exText) && !/round|라운드/.test(exText);
      const hasTwist = /twist|트위스트|oblique|오블리크/.test(exText);
      const rotY = hasTwist ? lerp(0, -0.08, ts) : 0;
      return {
        poseFeatureKo: isFlatOnly
          ? '숏박스 착석 발 스트랩 고정에서 정수리 축성 신장 플랫백 사선 힌지'
          : hasTwist
            ? '숏박스 착석 발 스트랩 고정에서 C커브 라운드백·오블리크 트위스트 리치'
            : '숏박스 착석 발 스트랩 고정에서 C커브 라운드백·플랫백 힌지 제어',
        trajectoryFocus: 'chest',
        carriageX: cx,
        withShortbox: true,
        pelvis: [cx + 0.08, 0, bt + 0.08],
        spineMid: vlerp(
          [cx + 0.08, 0, bt + 0.3],
          [cx - (isFlatOnly ? 0.05 : 0.09), rotY * 0.5, bt + (isFlatOnly ? 0.27 : 0.22)],
          ts,
        ),
        chest: vlerp(
          [cx + 0.08, 0, bt + 0.52],
          [cx - (isFlatOnly ? 0.19 : 0.24), rotY, bt + (isFlatOnly ? 0.44 : 0.36)],
          ts,
        ),
        antHint: hasTwist
          ? vlerp([1, 0, 0], [0.68, -0.52, 0.52], ts)
          : vlerp([1, 0, 0], [0.72, 0, 0.68], ts),
        lFoot: [0.84, -0.1, 0.54],
        rFoot: [0.84, 0.1, 0.54],
        lKneePole: [0.52, -0.1, 0.88],
        rKneePole: [0.52, 0.1, 0.88],
        lHand: isFlatOnly
          ? vlerp([cx + 0.12, -0.18, bt + 0.72], [cx - 0.18, -0.18, bt + 0.64], ts)
          : hasTwist
            ? vlerp([cx + 0.24, -0.16, bt + 0.44], [cx + 0.08, -0.34, bt + 0.52], ts)
            : vlerp([cx + 0.24, -0.16, bt + 0.44], [cx - 0.08, -0.16, bt + 0.46], ts),
        rHand: isFlatOnly
          ? vlerp([cx + 0.12, 0.18, bt + 0.72], [cx - 0.18, 0.18, bt + 0.64], ts)
          : hasTwist
            ? vlerp([cx + 0.24, 0.16, bt + 0.44], [cx - 0.28, 0.28, bt + 0.44], ts)
            : vlerp([cx + 0.24, 0.16, bt + 0.44], [cx - 0.08, 0.16, bt + 0.46], ts),
        lElbowPole: [-0.35, -0.82, -0.35],
        rElbowPole: [-0.35, 0.82, -0.35],
        activeZones: ['core', 'obliques'],
      };
    }
    case 'reformer-longbox-breaststroke': {
      const cx = lerp(0.16, -0.14, ts);
      const bt = 0.64;
      const sweepY = Math.sin(rawT * Math.PI) * 0.22;
      return {
        poseFeatureKo: '롱박스 엎드린 치골 지지에서 양팔 전방 푸시→수영 원형 스윕 브레스트스트로크 신전',
        trajectoryFocus: 'rHand',
        carriageX: cx,
        withLongbox: true,
        ropeToHands: true,
        pelvis: [cx + 0.1, 0, bt + 0.07],
        spineMid: [cx - 0.1, 0, bt + lerp(0.08, 0.18, ts)],
        chest: [cx - 0.3, 0, bt + lerp(0.11, 0.34, ts)],
        antHint: [-lerp(0.32, 0.74, ts), 0, -0.82],
        lFoot: [cx + 0.88, 0.09, bt + lerp(0.06, 0.16, ts)],
        rFoot: [cx + 0.88, -0.09, bt + lerp(0.06, 0.16, ts)],
        lKneePole: [0.08, 0.08, -1],
        rKneePole: [0.08, -0.08, -1],
        lHand: [lerp(cx - 0.58, cx - 0.06, ts), 0.2 + sweepY, bt + lerp(0.06, 0.22, ts)],
        rHand: [lerp(cx - 0.58, cx - 0.06, ts), -0.2 - sweepY, bt + lerp(0.06, 0.22, ts)],
        lElbowPole: [0.25, 0.85, 0.32],
        rElbowPole: [0.25, -0.85, 0.32],
        activeZones: ['back', 'shoulders', 'glutes'],
      };
    }
    case 'reformer-longbox-swimming': {
      const cx = lerp(0.12, 0.06, ts);
      const bt = 0.64;
      const alt = Math.cos(rawT * Math.PI * 3) * 0.09;
      return {
        poseFeatureKo: '롱박스 엎드린 몸통 부양 지지에서 반대쪽 팔·다리 교차 공중 스위밍',
        trajectoryFocus: 'rHand',
        carriageX: cx,
        withLongbox: true,
        pelvis: [cx + 0.1, 0, bt + 0.07],
        spineMid: [cx - 0.1, 0, bt + lerp(0.1, 0.16, ts)],
        chest: [cx - 0.3, 0, bt + lerp(0.14, 0.25, ts)],
        antHint: [-0.48, 0, -0.86],
        lFoot: [cx + 0.86, 0.1, bt + 0.14 + alt],
        rFoot: [cx + 0.86, -0.1, bt + 0.14 - alt],
        lKneePole: [0.08, 0.08, -1],
        rKneePole: [0.08, -0.08, -1],
        lHand: [cx - 0.68, 0.18, bt + 0.24 - alt],
        rHand: [cx - 0.68, -0.18, bt + 0.24 + alt],
        lElbowPole: [0.25, 0.82, 0.32],
        rElbowPole: [0.25, -0.82, 0.32],
        activeZones: ['back', 'glutes', 'core'],
      };
    }
    case 'reformer-longbox-horseback': {
      const cx = lerp(0.16, -0.08, ts);
      const bt = 0.64;
      const hover = lerp(0.07, 0.19, ts);
      return {
        poseFeatureKo: '롱박스 양옆 허벅지 내전 기승 착석에서 C커브 골반 호버와 스트랩 전상방 리치',
        trajectoryFocus: 'pelvis',
        carriageX: cx,
        withLongbox: true,
        ropeToHands: true,
        pelvis: [cx + 0.08, 0, bt + hover],
        spineMid: [cx + 0.06, 0, bt + hover + 0.21],
        chest: [cx + 0.12, 0, bt + hover + 0.4],
        antHint: [0.94, 0, -0.28],
        lFoot: [cx + 0.18, -0.26, lerp(0.38, 0.46, ts)],
        rFoot: [cx + 0.18, 0.26, lerp(0.38, 0.46, ts)],
        lKneePole: [cx + 0.34, -0.34, 0.56],
        rKneePole: [cx + 0.34, 0.34, 0.56],
        lHand: vlerp([cx + 0.12, -0.22, bt + 0.14], [cx + 0.42, -0.16, bt + 0.48], ts),
        rHand: vlerp([cx + 0.12, 0.22, bt + 0.14], [cx + 0.42, 0.16, bt + 0.48], ts),
        lElbowPole: [cx - 0.04, -0.34, bt + 0.36],
        rElbowPole: [cx - 0.04, 0.34, bt + 0.36],
        activeZones: ['adductors', 'core', 'shoulders'],
      };
    }
    case 'reformer-longbox-backstroke': {
      const cx = lerp(0.16, -0.14, ts);
      const bt = 0.65;
      const spread = Math.sin(rawT * Math.PI) * 0.18;
      return {
        poseFeatureKo: '롱박스 수파인 상체 컬업 지지에서 팔·다리 천장 리치→수영 서클 백스트로크',
        trajectoryFocus: 'rHand',
        carriageX: cx,
        withLongbox: true,
        ropeToHands: true,
        pelvis: [cx + 0.1, 0, bt + 0.08],
        spineMid: [cx - 0.1, 0, bt + 0.14],
        chest: [cx - 0.28, 0, bt + lerp(0.22, 0.29, ts)],
        antHint: [0.46, 0, 0.88],
        lFoot: [
          lerp(cx + 0.18, cx + 0.68, ts),
          -0.08 - spread,
          lerp(bt + 0.44, bt + 0.52, ts),
        ],
        rFoot: [
          lerp(cx + 0.18, cx + 0.68, ts),
          0.08 + spread,
          lerp(bt + 0.44, bt + 0.52, ts),
        ],
        lKneePole: [-0.75, -0.16, 0.65],
        rKneePole: [-0.75, 0.16, 0.65],
        lHand: [
          lerp(cx - 0.24, cx + 0.28, ts),
          -0.16 - spread * 1.1,
          lerp(bt + 0.48, bt + 0.34, ts),
        ],
        rHand: [
          lerp(cx - 0.24, cx + 0.28, ts),
          0.16 + spread * 1.1,
          lerp(bt + 0.48, bt + 0.34, ts),
        ],
        lElbowPole: [-0.26, -0.78, 0.28],
        rElbowPole: [-0.26, 0.78, 0.28],
        activeZones: ['core', 'adductors', 'shoulders'],
      };
    }
    case 'reformer-longbox-swan': {
      const isSwanPrepOnly = exercise.id === 'original-reformer-box-swan-prep';
      const cx = isSwanPrepOnly ? lerp(0.14, 0.08, ts) : lerp(0.16, -0.14, ts);
      const bt = 0.64;
      return {
        poseFeatureKo: isSwanPrepOnly
          ? '롱박스 엎드린 치골·하부 늑골 지지에서 경추~흉추 축성 베이비 스완 신전'
          : '롱박스 엎드린 지지에서 양손 스트랩 후방 당김(풀링 스트랩)과 흉추 스완 신전',
        trajectoryFocus: 'chest',
        carriageX: cx,
        withLongbox: true,
        ropeToHands: !isSwanPrepOnly,
        pelvis: [cx + 0.1, 0, bt + 0.07],
        spineMid: [cx - 0.1, 0, bt + lerp(0.08, 0.17, ts)],
        chest: [cx - 0.3, 0, bt + lerp(0.1, isSwanPrepOnly ? 0.25 : 0.32, ts)],
        antHint: [-lerp(0.3, 0.72, ts), 0, -0.82],
        lFoot: [cx + 0.88, 0.09, bt + lerp(0.05, 0.15, ts)],
        rFoot: [cx + 0.88, -0.09, bt + lerp(0.05, 0.15, ts)],
        lKneePole: [0.08, 0.08, -1],
        rKneePole: [0.08, -0.08, -1],
        lHand: isSwanPrepOnly
          ? vlerp([cx - 0.34, 0.22, bt + 0.04], [cx - 0.26, 0.22, bt + 0.14], ts)
          : vlerp([cx - 0.48, 0.22, bt - 0.08], [cx + 0.08, 0.22, bt + 0.16], ts),
        rHand: isSwanPrepOnly
          ? vlerp([cx - 0.34, -0.22, bt + 0.04], [cx - 0.26, -0.22, bt + 0.14], ts)
          : vlerp([cx - 0.48, -0.22, bt - 0.08], [cx + 0.08, -0.22, bt + 0.16], ts),
        lElbowPole: [0.35, 0.82, 0.32],
        rElbowPole: [0.35, -0.82, 0.32],
        activeZones: ['back', 'shoulders', 'glutes'],
      };
    }
    case 'reformer-kneeling-triceps': {
      const cx = lerp(0.18, -0.06, ts);
      return {
        poseFeatureKo: '캐리지 톨 닐링 직립 지지에서 팔꿈치 옆구리 고정 스트랩 트라이셉스 신전',
        trajectoryFocus: 'rHand',
        carriageX: cx,
        ropeToHands: true,
        pelvis: [cx + 0.06, 0, 0.81],
        spineMid: [cx + 0.06, 0, 1.03],
        chest: [cx + 0.06, 0, 1.25],
        antHint: [-1, 0, 0],
        lFoot: [cx + 0.44, 0.11, 0.44],
        rFoot: [cx + 0.44, -0.11, 0.44],
        lKneePole: [-0.85, 0.08, -0.55],
        rKneePole: [-0.85, -0.08, -0.55],
        lHand: vlerp([cx - 0.1, 0.2, 1.02], [cx + 0.22, 0.2, 0.8], ts),
        rHand: vlerp([cx - 0.1, -0.2, 1.02], [cx + 0.22, -0.2, 0.8], ts),
        lElbowPole: [0.45, 0.72, -0.45],
        rElbowPole: [0.45, -0.72, -0.45],
        activeZones: ['shoulders', 'back', 'core'],
      };
    }
    case 'reformer-reverse-abs-kneeling': {
      const cx = lerp(-0.12, 0.18, ts);
      return {
        poseFeatureKo: '프레임·풋바 방향 네발기기 지지에서 하복부 C커브 스쿱 리버스 앱 캐리지 당김',
        trajectoryFocus: 'pelvis',
        carriageX: cx,
        pelvis: [cx + 0.16, 0, lerp(0.83, 0.87, ts)],
        spineMid: [lerp(cx + 0.36, cx + 0.3, ts), 0, lerp(0.84, 0.91, ts)],
        chest: [0.58, 0, 0.83],
        antHint: [0.28, 0, -0.95],
        lFoot: [cx - 0.2, -0.11, 0.45],
        rFoot: [cx - 0.2, 0.11, 0.45],
        lKneePole: [0.85, -0.08, -0.55],
        rKneePole: [0.85, 0.08, -0.55],
        lHand: [0.82, -0.2, 0.44],
        rHand: [0.82, 0.2, 0.44],
        lElbowPole: [-0.35, -0.78, 0.35],
        rElbowPole: [-0.35, 0.78, 0.35],
        activeZones: ['core', 'obliques', 'shoulders'],
      };
    }
    case 'reformer-knee-stretches': {
      const kneesOff = /knees[\s-]?off|니즈\s*오프|호버/i.test(
        `${exercise.id} ${exercise.nameKo} ${exercise.nameEn}`,
      );
      const cx = lerp(0.22, -0.1, ts);
      return {
        poseFeatureKo: kneesOff
          ? '풋바 양손·숄더블록 발볼 지지에서 무릎 4cm 호버링 유지 니즈 오프 왕복'
          : '풋바 양손·캐리지 무릎 지지에서 상체 C커브 고정 고관절 니 스트레치 왕복',
        trajectoryFocus: 'pelvis',
        carriageX: cx,
        pelvis: [cx + 0.2, 0, lerp(0.84, 0.8, ts) + (kneesOff ? 0.05 : 0)],
        spineMid: [lerp(0.48, 0.38, ts), 0, 0.87 + (kneesOff ? 0.03 : 0)],
        chest: [0.66, 0, 0.88],
        antHint: [0.28, 0, -0.95],
        lFoot: [cx - 0.16, 0.09, 0.46],
        rFoot: [cx - 0.16, -0.09, 0.46],
        lKneePole: [0.92, 0.1, kneesOff ? -0.08 : -0.18],
        rKneePole: [0.92, -0.1, kneesOff ? -0.08 : -0.18],
        lHand: [0.825, 0.17, 0.58],
        rHand: [0.825, -0.17, 0.58],
        lElbowPole: [-0.35, 0.75, 0.45],
        rElbowPole: [-0.35, -0.75, 0.45],
        activeZones: ['core', 'quads', 'shoulders'],
      };
    }
    case 'reformer-down-stretch': {
      const cx = lerp(0.22, -0.12, ts);
      return {
        poseFeatureKo: '캐리지 무릎·풋바 양손 지지에서 골반 전진 및 상부 흉추 사선 다운 스트레치 신전',
        trajectoryFocus: 'chest',
        carriageX: cx,
        pelvis: [lerp(cx + 0.18, cx + 0.3, ts), 0, lerp(0.83, 0.77, ts)],
        spineMid: [lerp(0.5, 0.44, ts), 0, lerp(0.95, 0.92, ts)],
        chest: [lerp(0.68, 0.62, ts), 0, lerp(1.1, 1.15, ts)],
        antHint: vlerp([0.78, 0, -0.62], [0.88, 0, -0.45], ts),
        lFoot: [cx - 0.16, -0.1, 0.46],
        rFoot: [cx - 0.16, 0.1, 0.46],
        lKneePole: [0.88, -0.08, -0.45],
        rKneePole: [0.88, 0.08, -0.45],
        lHand: [0.825, -0.18, 0.58],
        rHand: [0.825, 0.18, 0.58],
        lElbowPole: [-0.35, -0.75, 0.35],
        rElbowPole: [-0.35, 0.75, 0.35],
        activeZones: ['back', 'glutes', 'shoulders'],
      };
    }
    case 'reformer-kneeling-lunge': {
      const cx = lerp(0.22, -0.14, ts);
      return {
        poseFeatureKo: '바닥 지지발과 캐리지 뒷무릎 지지에서 장요근·햄스트링 이브스 런지 스트레치',
        trajectoryFocus: 'pelvis',
        carriageX: cx,
        pelvis: [lerp(0.46, 0.34, ts), -0.18, lerp(0.82, 0.72, ts)],
        spineMid: [lerp(0.56, 0.48, ts), -0.16, lerp(0.94, 0.86, ts)],
        chest: [lerp(0.68, 0.62, ts), -0.14, lerp(1.04, 1.0, ts)],
        antHint: [0.94, -0.1, -0.25],
        lFoot: [0.68, -0.34, 0.05],
        rFoot: [cx - 0.16, -0.06, 0.46],
        lKneePole: [0.92, -0.12, 0.35],
        rKneePole: [0.94, 0.06, 0.08],
        lHand: [0.825, -0.22, 0.58],
        rHand: [0.825, 0.06, 0.58],
        lElbowPole: [-0.35, -0.75, 0.45],
        rElbowPole: [-0.35, 0.75, 0.45],
        activeZones: ['quads', 'glutes', 'core'],
      };
    }
    case 'reformer-kneeling-arms': {
      const cx = lerp(0.18, -0.08, ts);
      return {
        poseFeatureKo: '캐리지 무릎 지지에서 양손 스트랩 후방 체스트 익스팬션·견갑 하강',
        trajectoryFocus: 'rHand',
        carriageX: cx,
        ropeToHands: true,
        pelvis: [cx + 0.06, 0, 0.81],
        spineMid: [cx + 0.06, 0, 1.03],
        chest: [cx + 0.06, 0, 1.25],
        antHint: [-1, 0, 0],
        lFoot: [cx + 0.44, 0.11, 0.44],
        rFoot: [cx + 0.44, -0.11, 0.44],
        lKneePole: [-0.85, 0.08, -0.55],
        rKneePole: [-0.85, -0.08, -0.55],
        lHand: vlerp([cx - 0.14, 0.22, 0.94], [cx + 0.24, 0.22, 0.82], ts),
        rHand: vlerp([cx - 0.14, -0.22, 0.94], [cx + 0.24, -0.22, 0.82], ts),
        lElbowPole: [0.45, 0.75, -0.45],
        rElbowPole: [0.45, -0.75, -0.45],
        activeZones: ['back', 'shoulders', 'core'],
      };
    }
    case 'reformer-side-lying': {
      const cx = lerp(0.18, -0.14, ts);
      return {
        poseFeatureKo: '캐리지 옆으로 누운 골반 정렬에서 위쪽 다리 스트랩·풋바 프레스',
        trajectoryFocus: 'rFoot',
        carriageX: cx,
        ropeToFeet: exercise.id.includes('lower-04'),
        pelvis: [cx + 0.22, 0.04, 0.5],
        spineMid: [cx + 0.0, 0.04, 0.5],
        chest: [cx - 0.2, 0.04, 0.52],
        antHint: [0, -1, 0.08],
        lFoot: [cx + 0.48, 0.12, 0.46],
        rFoot: exercise.id.includes('lower-04')
          ? vlerp([cx + 0.42, -0.04, 0.72], [cx + 0.78, -0.04, 0.64], ts)
          : [0.825, -0.04, 0.58],
        lKneePole: [cx + 0.3, -0.2, 0.48],
        rKneePole: [cx + 0.35, -0.32, lerp(0.84, 0.68, ts)],
        lHand: [cx - 0.34, -0.04, 0.48],
        rHand: [cx - 0.04, -0.18, 0.46],
        lElbowPole: [cx - 0.34, 0.22, 0.48],
        rElbowPole: [cx - 0.08, -0.3, 0.64],
        activeZones: ['glutes', 'obliques', 'quads'],
      };
    }
    case 'reformer-side-splits': {
      const cx = lerp(0.24, -0.18, ts);
      return {
        poseFeatureKo: '플랫폼 한 발·캐리지 한 발 스탠딩에서 대칭 외전·내전 사이드 스플릿',
        trajectoryFocus: 'lFoot',
        carriageX: cx,
        pelvis: [lerp(0.64, 0.46, ts), 0, lerp(0.98, 0.92, ts)],
        spineMid: [lerp(0.64, 0.46, ts), 0, lerp(1.2, 1.14, ts)],
        chest: [lerp(0.64, 0.46, ts), 0, lerp(1.42, 1.36, ts)],
        antHint: [0, -1, 0],
        lFoot: [cx + 0.18, 0, 0.45],
        rFoot: [1.04, 0, 0.42],
        lKneePole: [cx + 0.18, -0.3, 0.76],
        rKneePole: [1.04, -0.3, 0.76],
        lHand: [lerp(0.4, 0.04, ts), -0.06, 1.34],
        rHand: [lerp(0.88, 0.88, ts), -0.06, 1.34],
        lElbowPole: [0.3, 0.2, 1.28],
        rElbowPole: [0.8, 0.2, 1.28],
        activeZones: ['adductors', 'glutes', 'core'],
      };
    }
    case 'reformer-bridge': {
      const cx = lerp(0.24, 0.14, ts);
      const ct = 0.41;
      return {
        poseFeatureKo: '풋바 양발 지지에서 캐리지 스토퍼 제어와 사선 펠빅 컬 브리지 분절',
        trajectoryFocus: 'pelvis',
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
        poseFeatureKo: '양발 스트랩 45도 리치에서 캐리지 복귀 및 숏 스파인 롤오버 분절',
        trajectoryFocus: 'pelvis',
        carriageX: cx,
        ropeToFeet: true,
        pelvis: vlerp([cx + 0.22, 0, ct + 0.1], [cx - 0.02, 0, ct + 0.44], ts),
        spineMid: vlerp([cx + 0.02, 0, ct + 0.1], [cx - 0.12, 0, ct + 0.26], ts),
        chest: [cx - 0.18, 0, ct + 0.11],
        antHint: vlerp([0, 0, 1], [-0.55, 0, 0.85], ts),
        lFoot: vlerp([cx + 0.62, -0.08, ct + 0.58], [cx - 0.18, -0.08, ct + 0.72], ts),
        rFoot: vlerp([cx + 0.62, 0.08, ct + 0.58], [cx - 0.18, 0.08, ct + 0.72], ts),
        lKneePole: [-0.88, -0.34, 0.28],
        rKneePole: [-0.88, 0.34, 0.28],
        lHand: [cx + 0.18, -0.22, ct + 0.04],
        rHand: [cx + 0.18, 0.22, ct + 0.04],
        lElbowPole: [0.02, -0.75, -0.25],
        rElbowPole: [0.02, 0.75, -0.25],
        activeZones: ['core', 'glutes'],
      };
    }
    case 'reformer-feetstraps': {
      const cx = lerp(0.14, -0.16, ts);
      const ct = 0.41;
      return {
        poseFeatureKo: '천골 수평 캐리지 밀착에서 피트 인 스트랩 프로그·45도 사선 프레스',
        trajectoryFocus: 'rFoot',
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
    case 'reformer-longbox-teaser': {
      const cx = lerp(0.12, -0.12, ts);
      const bt = 0.66;
      return {
        poseFeatureKo: '롱박스 상단 천골 밸런스와 스트랩 당김 동시 V자 티저 리프트',
        trajectoryFocus: 'chest',
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
    case 'reformer-mermaid': {
      const cx = lerp(0.18, -0.08, ts);
      return {
        poseFeatureKo: '캐리지 Z-Sit 착석에서 한 손 풋바 프레스와 반대쪽 팔 측면 C커브',
        trajectoryFocus: 'lHand',
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
    case 'reformer-lunge-arabesque': {
      const cx = lerp(0.22, -0.12, ts);
      return {
        poseFeatureKo: '바닥 지지발 고정 런지에서 뒷다리 후상방 단측성 아라베스크 힙 익스텐션',
        trajectoryFocus: 'rFoot',
        carriageX: cx,
        pelvis: [0.44, -0.18, lerp(0.82, 0.84, ts)],
        spineMid: [0.58, -0.16, lerp(0.93, 0.91, ts)],
        chest: [0.72, -0.14, lerp(1.03, 0.98, ts)],
        antHint: [0.85, -0.1, -0.5],
        lFoot: [0.64, -0.34, 0.05],
        rFoot: vlerp([cx - 0.16, -0.06, 0.46], [-0.31, -0.06, 0.92], ts),
        lKneePole: [0.92, -0.12, 0.35],
        rKneePole: [0.22, 0.08, -0.96],
        lHand: [0.825, -0.22, 0.58],
        rHand: [0.825, 0.06, 0.58],
        lElbowPole: [-0.35, -0.75, 0.45],
        rElbowPole: [-0.35, 0.75, 0.45],
        activeZones: ['glutes', 'quads', 'core'],
      };
    }
    case 'reformer-front-splits': {
      const isRussian = /russian|러시안/i.test(
        `${exercise.id} ${exercise.nameKo} ${exercise.nameEn}`,
      );
      const cx = lerp(0.22, -0.18, ts);
      return {
        poseFeatureKo: isRussian
          ? '기구 위 앞·뒤 발 스플릿 정렬에서 핸즈프리 코어 수직 러시안 스플릿 밸런스'
          : '풋바 앞발·숄더블록 뒷발 지지에서 골반 스퀘어 리포머 프론트 스플릿 신장',
        trajectoryFocus: 'rFoot',
        carriageX: cx,
        pelvis: isRussian
          ? [lerp(0.46, 0.3, ts), 0, lerp(0.98, 0.84, ts)]
          : [lerp(0.44, 0.28, ts), 0, lerp(0.92, 0.76, ts)],
        spineMid: isRussian
          ? [lerp(0.48, 0.32, ts), 0, lerp(1.2, 1.06, ts)]
          : [lerp(0.56, 0.44, ts), 0, lerp(0.98, 0.9, ts)],
        chest: isRussian
          ? [lerp(0.5, 0.34, ts), 0, lerp(1.42, 1.28, ts)]
          : [lerp(0.68, 0.62, ts), 0, lerp(1.02, 0.98, ts)],
        antHint: isRussian ? [1, 0, 0] : [0.75, 0, -0.65],
        lFoot: [0.86, -0.06, 0.46],
        rFoot: [cx - 0.14, 0.06, 0.46],
        lKneePole: [0.92, -0.06, 0.38],
        rKneePole: [0.65, 0.06, -0.72],
        lHand: isRussian
          ? vlerp([0.54, -0.24, 1.32], [0.36, -0.42, 1.24], ts)
          : [0.825, -0.18, 0.58],
        rHand: isRussian
          ? vlerp([0.54, 0.24, 1.32], [0.36, 0.42, 1.24], ts)
          : [0.825, 0.18, 0.58],
        lElbowPole: [-0.35, -0.75, 0.45],
        rElbowPole: [-0.35, 0.75, 0.45],
        activeZones: ['quads', 'glutes', 'core'],
      };
    }
    case 'reformer-snake-twist': {
      const cx = lerp(0.2, -0.16, ts);
      return {
        poseFeatureKo: '풋바 비대칭 양손 그립과 교차 발 지지에서 측면 파이크→사이드 플랭크 스네이크 아치',
        trajectoryFocus: 'pelvis',
        carriageX: cx,
        pelvis: [cx + 0.22, 0.04, lerp(1.04, 0.74, ts)],
        spineMid: [cx + 0.4, 0.02, lerp(0.98, 0.8, ts)],
        chest: [lerp(0.64, 0.56, ts), 0, lerp(0.9, 0.86, ts)],
        antHint: vlerp([0.2, -0.96, -0.2], [0.35, -0.82, 0.44], ts),
        lFoot: [cx - 0.14, 0.04, 0.47],
        rFoot: [cx - 0.1, -0.05, 0.48],
        lKneePole: [0.45, -0.78, 0.25],
        rKneePole: [0.45, -0.82, 0.25],
        lHand: [0.825, 0.14, 0.58],
        rHand: [0.825, -0.14, 0.58],
        lElbowPole: [-0.35, 0.75, 0.45],
        rElbowPole: [-0.35, -0.75, 0.45],
        activeZones: ['obliques', 'core', 'shoulders'],
      };
    }
    case 'reformer-stomach-massage-round': {
      const cx = lerp(0.24, -0.14, ts);
      return {
        poseFeatureKo: '캐리지 앞모서리 양손 파지와 깊은 C커브 스쿱 스터먹 마사지 라운드백 프레스',
        trajectoryFocus: 'pelvis',
        carriageX: cx,
        pelvis: [cx + 0.24, 0, 0.48],
        spineMid: [cx + 0.14, 0, 0.67],
        chest: [cx + 0.22, 0, 0.85],
        antHint: [0.92, 0, -0.38],
        lFoot: [0.825, -0.07, lerp(0.56, 0.62, ts)],
        rFoot: [0.825, 0.07, lerp(0.56, 0.62, ts)],
        lKneePole: [0.55, -0.2, lerp(0.96, 0.72, ts)],
        rKneePole: [0.55, 0.2, lerp(0.96, 0.72, ts)],
        lHand: [cx + 0.44, -0.16, 0.44],
        rHand: [cx + 0.44, 0.16, 0.44],
        lElbowPole: [cx + 0.28, -0.34, 0.62],
        rElbowPole: [cx + 0.28, 0.34, 0.62],
        activeZones: ['core', 'quads'],
      };
    }
    case 'reformer-stomach-massage-twist': {
      const cx = lerp(0.24, -0.12, ts);
      return {
        poseFeatureKo: '양 좌골 균등 지지에서 캐리지 프레스와 단측성 흉추 회전 리치 업 & 트위스트',
        trajectoryFocus: 'rHand',
        carriageX: cx,
        pelvis: [cx + 0.22, 0, 0.48],
        spineMid: [cx + 0.2, 0, 0.7],
        chest: [cx + 0.18, lerp(0, 0.04, ts), 0.92],
        antHint: vlerp([1, 0, 0], [0.68, 0.72, 0.08], ts),
        lFoot: [0.825, -0.07, lerp(0.56, 0.62, ts)],
        rFoot: [0.825, 0.07, lerp(0.56, 0.62, ts)],
        lKneePole: [0.35, -0.18, lerp(0.96, 0.72, ts)],
        rKneePole: [0.35, 0.18, lerp(0.96, 0.72, ts)],
        lHand: vlerp([cx + 0.42, -0.16, 0.88], [cx + 0.52, -0.1, 1.02], ts),
        rHand: vlerp([cx + 0.42, 0.16, 0.88], [cx - 0.14, 0.38, 1.06], ts),
        lElbowPole: [-0.15, -0.75, 0.45],
        rElbowPole: [-0.25, 0.75, 0.45],
        activeZones: ['obliques', 'core', 'quads'],
      };
    }
    case 'reformer-side-arm-sitting': {
      const cx = lerp(0.18, -0.08, ts);
      return {
        poseFeatureKo: '캐리지 측면 가부좌 착석에서 단측성 핸드 스트랩 나선형 몸통 회전 프레스',
        trajectoryFocus: 'lHand',
        carriageX: cx,
        ropeToHands: true,
        pelvis: [cx + 0.1, 0, 0.49],
        spineMid: [cx + 0.1, 0, 0.71],
        chest: [cx + 0.12, lerp(0, -0.04, ts), 0.93],
        antHint: vlerp([0, -1, 0], [0.58, -0.81, 0], ts),
        lFoot: [cx + 0.02, -0.16, 0.45],
        rFoot: [cx + 0.22, -0.16, 0.45],
        lKneePole: [-0.25, -0.85, 0.25],
        rKneePole: [0.25, -0.85, 0.25],
        lHand: vlerp([cx - 0.06, -0.18, 0.82], [cx + 0.36, -0.24, 0.88], ts),
        rHand: [cx + 0.18, 0.18, 0.52],
        lElbowPole: [-0.35, -0.75, 0.35],
        rElbowPole: [0.25, 0.75, 0.35],
        activeZones: ['obliques', 'shoulders', 'core'],
      };
    }
    case 'reformer-scooter-lunge': {
      const cx = lerp(0.24, -0.14, ts);
      return {
        poseFeatureKo: '바닥 지지발 고정과 뒷다리 캐리지 숄더블록 후방 스쿠터·런지 프레스',
        trajectoryFocus: 'rFoot',
        carriageX: cx,
        pelvis: [0.44, -0.18, lerp(0.82, 0.78, ts)],
        spineMid: [0.56, -0.16, lerp(0.94, 0.9, ts)],
        chest: [0.68, -0.14, lerp(1.04, 1.01, ts)],
        antHint: [0.88, -0.1, -0.45],
        lFoot: [0.64, -0.34, 0.05],
        rFoot: [cx - 0.12, -0.06, 0.45],
        lKneePole: [0.92, -0.12, 0.35],
        rKneePole: [0.92, 0.08, 0.08],
        lHand: [0.82, -0.2, 0.58],
        rHand: [0.82, 0.06, 0.58],
        lElbowPole: [-0.35, -0.75, 0.45],
        rElbowPole: [-0.35, 0.75, 0.45],
        activeZones: ['glutes', 'quads'],
      };
    }
    case 'reformer-footwork': {
      const cx = lerp(0.24, -0.18, ts);
      const ct = 0.41;
      return {
        poseFeatureKo: '풋바 양발 대칭 지지에서 중립 골반 유지 채 캐리지 수평 활주',
        trajectoryFocus: 'chest',
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

    // --- CHAIR ARCHETYPES ---
    case 'chair-pedal-press': {
      const isAlt = /alternating|교대/.test(`${exercise.id} ${exercise.nameKo}`);
      const pdeg = lerp(32, 8, ts);
      const lDeg = isAlt ? lerp(10, 30, ts) : pdeg;
      const rDeg = pdeg;
      const [lpx, lpz] = chairPedalPos(lDeg);
      const [rpx, rpz] = chairPedalPos(rDeg);
      return {
        poseFeatureKo: isAlt
          ? '체어 시트 수직 좌골 고정에서 좌·우 스플릿 페달 교대 펌핑'
          : '체어 시트 수직 좌골 고정에서 양발 페달 하강 프레스와 제어 복귀',
        trajectoryFocus: 'rFoot',
        pedalDeg: rDeg,
        lPedalDeg: lDeg,
        rPedalDeg: rDeg,
        pelvis: [-0.06, 0, 0.68],
        spineMid: [-0.07, 0, 0.9],
        chest: [-0.08, 0, 1.12],
        antHint: [1, 0, 0],
        lFoot: [lpx, -0.09, lpz + 0.04],
        rFoot: [rpx, 0.09, rpz + 0.04],
        lKneePole: [0.45, -0.08, 0.98],
        rKneePole: [0.45, 0.08, 0.98],
        lHand: [-0.04, -0.22, 0.62],
        rHand: [-0.04, 0.22, 0.62],
        lElbowPole: [-0.3, -0.3, 0.82],
        rElbowPole: [-0.3, 0.3, 0.82],
        activeZones: ['quads', 'core'],
      };
    }
    case 'chair-goingup-side': {
      const pdeg = lerp(8, 28, ts);
      const [px, pz] = chairPedalPos(pdeg);
      const liftZ = lerp(0.84, 1.28, ts);
      return {
        poseFeatureKo: '체어 시트 외회전 지지 다리와 측면 골반 수평 유지 고잉 업 사이드 상승',
        trajectoryFocus: 'pelvis',
        pedalDeg: pdeg,
        withChairHandles: true,
        pelvis: [lerp(0.12, -0.02, ts), 0.02, liftZ],
        spineMid: [lerp(0.1, -0.02, ts), 0.02, liftZ + 0.22],
        chest: [lerp(0.08, -0.02, ts), 0.02, liftZ + 0.44],
        antHint: [0, -1, 0],
        lFoot: [-0.08, 0.02, 0.63],
        rFoot: [px, -0.04, pz + 0.04],
        lKneePole: [-0.15, -0.92, 0.25],
        rKneePole: [0.25, -0.92, 0.25],
        lHand: [-0.02, -0.28, 1.27],
        rHand: [0.12, -0.26, lerp(1.14, 1.46, ts)],
        lElbowPole: [-0.35, -0.78, 0.35],
        rElbowPole: [0.35, -0.78, 0.35],
        activeZones: ['glutes', 'adductors', 'obliques'],
      };
    }
    case 'chair-standing-leg-pump': {
      const pdeg = lerp(32, 8, ts);
      const [px, pz] = chairPedalPos(pdeg);
      return {
        poseFeatureKo: '체어 앞 바닥 한 발 수직 지지와 반대 발 단측성 페달 펌프 컨트롤',
        trajectoryFocus: 'rFoot',
        pedalDeg: pdeg,
        pelvis: [0.56, 0, 0.82],
        spineMid: [0.56, 0, 1.04],
        chest: [0.56, 0, 1.26],
        antHint: [-1, 0, 0],
        lFoot: [0.58, 0.12, 0.05],
        rFoot: [px, -0.09, pz + 0.04],
        lKneePole: [-0.88, 0.12, 0.35],
        rKneePole: [-0.88, -0.12, lerp(0.55, 0.35, ts)],
        lHand: [0.56, 0.2, 0.9],
        rHand: [0.56, -0.2, 0.9],
        lElbowPole: [0.35, 0.82, 0.25],
        rElbowPole: [0.35, -0.82, 0.25],
        activeZones: ['quads', 'glutes', 'core'],
      };
    }
    case 'chair-single-leg-core': {
      const rDeg = lerp(32, 8, ts);
      const lDeg = 32;
      const [rpx, rpz] = chairPedalPos(rDeg);
      return {
        poseFeatureKo: '체어 시트 한 다리 90도 테이블탑 부양과 반대 다리 단측성 페달 프레스',
        trajectoryFocus: 'rFoot',
        pedalDeg: rDeg,
        lPedalDeg: lDeg,
        rPedalDeg: rDeg,
        pelvis: [-0.06, 0, 0.68],
        spineMid: [-0.07, 0, 0.9],
        chest: [-0.08, 0, 1.12],
        antHint: [1, 0, 0],
        lFoot: vlerp([0.34, -0.1, 0.68], [0.46, -0.1, 0.78], ts),
        rFoot: [rpx, 0.09, rpz + 0.04],
        lKneePole: [0.28, -0.12, 1.04],
        rKneePole: [0.45, 0.08, 0.96],
        lHand: [0.22, -0.18, 1.02],
        rHand: [0.22, 0.18, 1.02],
        lElbowPole: [-0.06, -0.32, 0.98],
        rElbowPole: [-0.06, 0.32, 0.98],
        activeZones: ['core', 'quads'],
      };
    }
    case 'chair-teaser-triceps': {
      const pdeg = lerp(28, 14, ts);
      const [px, pz] = chairPedalPos(pdeg);
      return {
        poseFeatureKo: '체어 시트 사선 V자 티저 다리 부양과 등 뒤 양손 페달 트라이셉 프레스',
        trajectoryFocus: 'lHand',
        pedalDeg: pdeg,
        pelvis: [0.02, 0, 0.66],
        spineMid: [lerp(0.12, 0.18, ts), 0, lerp(0.75, 0.69, ts)],
        chest: [lerp(0.24, 0.3, ts), 0, lerp(0.84, 0.72, ts)],
        antHint: [-0.78, 0, 0.62],
        lFoot: vlerp([-0.5, 0.08, 0.96], [-0.54, 0.08, 1.14], ts),
        rFoot: vlerp([-0.5, -0.08, 0.96], [-0.54, -0.08, 1.14], ts),
        lKneePole: [-0.25, 0.08, 0.95],
        rKneePole: [-0.25, -0.08, 0.95],
        lHand: [px, 0.16, pz + 0.03],
        rHand: [px, -0.16, pz + 0.03],
        lElbowPole: [0.75, 0.45, 0.35],
        rElbowPole: [0.75, -0.45, 0.35],
        activeZones: ['core', 'shoulders', 'quads'],
      };
    }
    case 'chair-goingup': {
      const pdeg = lerp(8, 28, ts);
      const [px, pz] = chairPedalPos(pdeg);
      const liftZ = lerp(0.84, 1.28, ts);
      return {
        poseFeatureKo: '시트 지지 발바닥과 핸들 보조로 수직 고잉업 스텝업·원심 하강',
        trajectoryFocus: 'pelvis',
        pedalDeg: pdeg,
        withChairHandles: true,
        pelvis: [lerp(0.14, -0.02, ts), 0, liftZ],
        spineMid: [lerp(0.12, -0.02, ts), 0, liftZ + 0.22],
        chest: [lerp(0.1, -0.02, ts), 0, liftZ + 0.44],
        antHint: [-1, 0, 0],
        lFoot: [-0.08, 0.08, 0.63],
        rFoot: [px, -0.08, pz + 0.04],
        lKneePole: [-0.88, 0.08, 0.35],
        rKneePole: [-0.88, -0.08, 0.35],
        lHand: [0.05, 0.28, 1.27],
        rHand: [0.05, -0.28, 1.27],
        lElbowPole: [0.45, 0.72, 0.25],
        rElbowPole: [0.45, -0.72, 0.25],
        activeZones: ['glutes', 'quads'],
      };
    }
    case 'chair-pike': {
      const pdeg = lerp(8, 30, ts);
      const [px, pz] = chairPedalPos(pdeg);
      return {
        poseFeatureKo: '시트 양손 수직 푸시와 복부 스쿱을 통한 페달 파이크 풀업 리프트',
        trajectoryFocus: 'pelvis',
        pedalDeg: pdeg,
        pelvis: [lerp(0.24, 0.14, ts), 0, lerp(0.88, 1.1, ts)],
        spineMid: [lerp(0.06, 0.02, ts), 0, lerp(0.98, 1.14, ts)],
        chest: [-0.08, 0, 1.02],
        antHint: [-0.5, 0, -0.85],
        lFoot: [px, 0.08, pz + 0.04],
        rFoot: [px, -0.08, pz + 0.04],
        lKneePole: [-0.85, 0.08, 0.35],
        rKneePole: [-0.85, -0.08, 0.35],
        lHand: [-0.1, 0.18, 0.62],
        rHand: [-0.1, -0.18, 0.62],
        lElbowPole: [-0.55, 0.72, 0.35],
        rElbowPole: [-0.55, -0.72, 0.35],
        activeZones: ['core', 'adductors', 'shoulders'],
      };
    }
    case 'chair-swan': {
      return EXPANDED_DEDICATED_3D_RIGS['expanded-chair-swan']!.build(rawT);
    }
    case 'chair-seated-upper': {
      const mDeg = lerp(28, 12, ts);
      const pdeg = 22;
      const [px, pz] = chairPedalPos(mDeg);
      const isMermaid = /mermaid|머메이드/.test(`${exercise.id} ${exercise.nameKo}`);
      return {
        poseFeatureKo: isMermaid
          ? '체어 시트 착석에서 페달 손 지지와 반대쪽 팔 측면 머메이드 신장'
          : '체어 시트 수직 정렬에서 흉곽 회전·암 아크 상체 가동',
        trajectoryFocus: isMermaid ? 'lHand' : 'rHand',
        pedalDeg: isMermaid ? mDeg : pdeg,
        pelvis: [-0.06, 0, 0.68],
        spineMid: [lerp(-0.04, isMermaid ? 0.08 : -0.04, ts), 0, 0.88],
        chest: [
          lerp(-0.02, isMermaid ? 0.18 : -0.02, ts),
          0,
          lerp(1.04, isMermaid ? 0.86 : 1.12, ts),
        ],
        antHint: isMermaid ? [0, -1, 0] : vlerp([1, 0, 0], [0.7, -0.7, 0], ts),
        lFoot: isMermaid ? [-0.14, -0.28, 0.14] : [0.34, -0.11, 0.08],
        rFoot: isMermaid ? [-0.02, -0.28, 0.14] : [0.34, 0.11, 0.08],
        lKneePole: isMermaid ? [-0.1, -0.92, 0.25] : [0.85, -0.11, 0.45],
        rKneePole: isMermaid ? [0.1, -0.92, 0.25] : [0.85, 0.11, 0.45],
        lHand: isMermaid
          ? vlerp([-0.24, -0.1, 1.02], [0.14, -0.06, 1.24], ts)
          : vlerp([0.2, -0.22, 0.96], [-0.1, -0.38, 1.18], ts),
        rHand: isMermaid
          ? [px, -0.04, pz + 0.03]
          : vlerp([0.2, 0.22, 0.96], [0.16, 0.38, 1.36], ts),
        lElbowPole: isMermaid ? [-0.55, -0.45, 0.72] : [-0.45, -0.75, 0.35],
        rElbowPole: isMermaid ? [0.45, 0.65, 0.45] : [-0.45, 0.75, 0.55],
        activeZones: ['obliques', 'core', 'shoulders'],
      };
    }

    // --- CADILLAC ARCHETYPES ---
    case 'cadillac-supine-table': {
      const isBridge =
        exercise.blockCategory === 'bridging' ||
        /bridge|tower|브리지|타워/.test(`${exercise.id} ${exercise.nameKo}`);
      const ptDeg = lerp(32, 18, ts);
      const [bx, bz] = cadillacPushThroughBarPos(ptDeg);
      return {
        poseFeatureKo: isBridge
          ? '캐딜락 베드 수파인에서 타워 발 지지 숄더 브리지 분절 리프트'
          : '캐딜락 베드 수파인 중립 정렬에서 암 스프링 프레스·니 폴드',
        trajectoryFocus: isBridge ? 'pelvis' : 'rHand',
        armSpringsFrom: isBridge ? undefined : [1.05, 1.32],
        pushthroughDeg: isBridge ? ptDeg : undefined,
        pelvis: [isBridge ? 0.14 : 0.06, 0, lerp(0.62, isBridge ? 0.9 : 0.62, ts)],
        spineMid: [isBridge ? -0.08 : -0.16, 0, lerp(0.62, isBridge ? 0.78 : 0.63, ts)],
        chest: [isBridge ? -0.3 : -0.38, 0, 0.63],
        antHint: [lerp(0, isBridge ? 0.34 : 0.08, ts), 0, 1],
        lFoot: isBridge ? [bx, -0.1, bz - 0.02] : [0.54, -0.1, 0.62],
        rFoot: isBridge
          ? [bx, 0.1, bz - 0.02]
          : vlerp([0.54, 0.1, 0.62], [0.32, 0.1, 0.94], ts),
        lKneePole: isBridge ? [-0.35, -0.1, 0.92] : [0.24, -0.1, 0.92],
        rKneePole: isBridge ? [-0.35, 0.1, 0.92] : [0.24, 0.1, 0.92],
        lHand: isBridge ? [0.06, -0.24, 0.61] : vlerp([0.04, -0.22, 1.06], [0.24, -0.22, 0.65], ts),
        rHand: isBridge ? [0.06, 0.24, 0.61] : vlerp([0.04, 0.22, 1.06], [0.24, 0.22, 0.65], ts),
        lElbowPole: [-0.15, -0.78, -0.58],
        rElbowPole: [-0.15, 0.78, -0.58],
        activeZones: isBridge ? ['glutes', 'core'] : ['core', 'shoulders'],
      };
    }
    case 'cadillac-seated-rollback': {
      const bx = lerp(0.68, 0.34, ts);
      const bz = lerp(1.18, 0.94, ts);
      return {
        poseFeatureKo: '수직 폴 양발 지지와 롤백 바를 잡은 C커브 척추 분절 롤다운',
        trajectoryFocus: 'chest',
        rolldownBar: [bx, bz],
        pelvis: [0.3, 0, 0.62],
        spineMid: vlerp([0.29, 0, 0.84], [0.1, 0, 0.72], ts),
        chest: vlerp([0.3, 0, 1.06], [-0.1, 0, 0.8], ts),
        antHint: vlerp([1, 0, 0], [0.52, 0, 0.85], ts),
        lFoot: [1.02, -0.24, 0.7],
        rFoot: [1.02, 0.24, 0.7],
        lKneePole: [0.35, -0.2, 0.88],
        rKneePole: [0.35, 0.2, 0.88],
        lHand: [bx, -0.18, bz],
        rHand: [bx, 0.18, bz],
        lElbowPole: [-0.25, -0.75, 0.35],
        rElbowPole: [-0.25, 0.75, 0.35],
        activeZones: ['core', 'back'],
      };
    }
    case 'cadillac-prone-swan': {
      const ptDeg = lerp(24, 2, ts);
      const [ex, ez] = cadillacPushThroughBarPos(ptDeg);
      return {
        poseFeatureKo: '캐딜락 베드 프론 지지에서 푸쉬스루 바 전상방 리치와 흉추 스완 신전',
        trajectoryFocus: 'chest',
        pushthroughDeg: ptDeg,
        pelvis: [-0.05, 0, 0.65],
        spineMid: [0.15, 0, lerp(0.72, 0.82, ts)],
        chest: [0.35, 0, lerp(0.87, 1.02, ts)],
        antHint: [lerp(0.45, 0.78, ts), 0, -0.72],
        lFoot: [-0.84, -0.1, 0.65],
        rFoot: [-0.84, 0.1, 0.65],
        lKneePole: [0.05, -0.08, -1],
        rKneePole: [0.05, 0.08, -1],
        lHand: [ex, -0.18, ez],
        rHand: [ex, 0.18, ez],
        lElbowPole: [-0.15, -0.75, 0.35],
        rElbowPole: [-0.15, 0.75, 0.35],
        activeZones: ['back', 'shoulders', 'glutes'],
      };
    }
    case 'cadillac-cat-rolldown': {
      const bx = lerp(0.46, 0.66, ts);
      const bz = lerp(1.34, 0.88, ts);
      return {
        poseFeatureKo: '테이블 양 무릎 지지에서 롤다운 바 전하방 프레스와 C커브 캣 분절',
        trajectoryFocus: 'chest',
        rolldownBar: [bx, bz],
        pelvis: [-0.06, 0, 0.98],
        spineMid: [lerp(-0.02, 0.14, ts), 0, lerp(1.2, 1.14, ts)],
        chest: [lerp(0.02, 0.32, ts), 0, lerp(1.42, 1.04, ts)],
        antHint: vlerp([1, 0, 0], [0.35, 0, -0.94], ts),
        lFoot: [-0.44, -0.11, 0.62],
        rFoot: [-0.44, 0.11, 0.62],
        lKneePole: [0.85, -0.08, -0.55],
        rKneePole: [0.85, 0.08, -0.55],
        lHand: [bx, -0.18, bz],
        rHand: [bx, 0.18, bz],
        lElbowPole: [-0.25, -0.82, 0.35],
        rElbowPole: [-0.25, 0.82, 0.35],
        activeZones: ['core', 'back'],
      };
    }
    case 'cadillac-teaser': {
      const ptDeg = lerp(24, 4, ts);
      const [ex, ez] = cadillacPushThroughBarPos(ptDeg);
      return {
        poseFeatureKo: '베드 천골 지지에서 푸쉬스루 바 상방 리치와 동시 상·하체 V자 티저',
        trajectoryFocus: 'chest',
        pushthroughDeg: ptDeg,
        pelvis: [0.24, 0, 0.62],
        spineMid: [lerp(0.1, 0.16, ts), 0, lerp(0.75, 0.84, ts)],
        chest: [lerp(0.06, 0.24, ts), 0, lerp(0.9, 1.06, ts)],
        antHint: vlerp([0.52, 0, 0.85], [0.85, 0, 0.52], ts),
        lFoot: vlerp([0.84, -0.08, 0.68], [0.74, -0.08, 1.18], ts),
        rFoot: vlerp([0.84, 0.08, 0.68], [0.74, 0.08, 1.18], ts),
        lKneePole: [0.15, -0.08, 0.95],
        rKneePole: [0.15, 0.08, 0.95],
        lHand: [ex, -0.18, ez],
        rHand: [ex, 0.18, ez],
        lElbowPole: [-0.35, -0.75, 0.35],
        rElbowPole: [-0.35, 0.75, 0.35],
        activeZones: ['core', 'quads'],
      };
    }
    case 'cadillac-monkey': {
      const ptDeg = lerp(26, 8, ts);
      const [ex, ez] = cadillacPushThroughBarPos(ptDeg);
      return {
        poseFeatureKo: '푸쉬스루 바 손·발 동시 파지에서 무릎 신전·발목 가동 캐딜락 몽키 스트레치',
        trajectoryFocus: 'rFoot',
        pushthroughDeg: ptDeg,
        pelvis: [0.24, 0, lerp(0.62, 0.66, ts)],
        spineMid: [0.12, 0, lerp(0.76, 0.82, ts)],
        chest: [0.06, 0, lerp(0.92, 0.98, ts)],
        antHint: [0.68, 0, 0.72],
        lFoot: [ex, -0.09, ez - 0.02],
        rFoot: [ex, 0.09, ez - 0.02],
        lKneePole: [-0.55, -0.25, 0.75],
        rKneePole: [-0.55, 0.25, 0.75],
        lHand: [ex, -0.2, ez],
        rHand: [ex, 0.2, ez],
        lElbowPole: [-0.35, -0.75, 0.35],
        rElbowPole: [-0.35, 0.75, 0.35],
        activeZones: ['core', 'back', 'quads'],
      };
    }
    case 'cadillac-spread-eagle': {
      return {
        poseFeatureKo: '캐딜락 기둥 손·발 고정 서스펜션에서 C커브 신장→활 모양 스프레드 이글 신전',
        trajectoryFocus: 'pelvis',
        pelvis: [lerp(-0.48, -0.62, ts), 0, lerp(1.22, 1.3, ts)],
        spineMid: [lerp(-0.54, -0.68, ts), 0, lerp(1.44, 1.5, ts)],
        chest: [lerp(-0.62, -0.72, ts), 0, lerp(1.66, 1.7, ts)],
        antHint: vlerp([-0.94, 0, -0.28], [-0.84, 0, 0.52], ts),
        lFoot: [-1.0, 0.26, 0.66],
        rFoot: [-1.0, -0.26, 0.66],
        lKneePole: [-0.88, 0.25, 0.42],
        rKneePole: [-0.88, -0.25, 0.42],
        lHand: [-1.0, 0.28, 1.68],
        rHand: [-1.0, -0.28, 1.68],
        lElbowPole: [0.35, 0.78, -0.35],
        rElbowPole: [0.35, -0.78, -0.35],
        activeZones: ['back', 'glutes', 'shoulders'],
      };
    }
    case 'cadillac-hanging': {
      const lift = lerp(1.16, 1.34, ts);
      return {
        poseFeatureKo: '캐노피 상단 바·퍼지 스트랩 서스펜션 그립에서 후면 사슬 행잉 리프트',
        trajectoryFocus: 'pelvis',
        trapezeStrap: true,
        pelvis: [-0.08, 0, lift],
        spineMid: [0.06, 0, lift + 0.14],
        chest: [0.18, 0, lift + 0.28],
        antHint: [0.18, 0, 0.98],
        lFoot: [-0.34, 0.11, 1.52],
        rFoot: [-0.34, -0.11, 1.52],
        lKneePole: [-0.35, 0.15, -0.88],
        rKneePole: [-0.35, -0.15, -0.88],
        lHand: [0.2, 0.2, 1.92],
        rHand: [0.2, -0.2, 1.92],
        lElbowPole: [0.35, 0.78, -0.25],
        rElbowPole: [0.35, -0.78, -0.25],
        activeZones: ['back', 'glutes', 'core'],
      };
    }
    case 'cadillac-leg-springs': {
      return {
        poseFeatureKo: '수직 폴 양손 파지로 윗등 고정 후 양발 레그 스프링 45도 프레스·서클',
        trajectoryFocus: 'rFoot',
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

    // --- BARREL ARCHETYPES ---
    case 'barrel-standing': {
      const exText = `${exercise.id} ${exercise.nameKo} ${exercise.nameEn}`;
      if (/hip-extension|힙\s*익스텐션/.test(exText)) {
        return {
          poseFeatureKo: '래더 양손 고정 스탠딩 지지에서 한 다리 후상방 힙 익스텐션 리프트',
          trajectoryFocus: 'rFoot',
          pelvis: [0.76, 0, 0.87],
          spineMid: [0.7, 0, 1.08],
          chest: [0.64, 0, 1.27],
          antHint: [-0.94, 0, -0.32],
          lFoot: [0.78, 0.1, 0.05],
          rFoot: vlerp([0.84, -0.1, 0.08], [1.38, -0.1, 0.48], ts),
          lKneePole: [-1, 0.08, 0],
          rKneePole: [-0.35, -0.08, -0.92],
          lHand: [0.49, 0.18, 0.96],
          rHand: [0.49, -0.18, 0.96],
          lElbowPole: [0.45, 0.75, -0.35],
          rElbowPole: [0.45, -0.75, -0.35],
          activeZones: ['glutes', 'core'],
        };
      }
      if (/side-reach|사이드\s*레그\s*리치/.test(exText)) {
        return {
          poseFeatureKo: '래더 한 손 지지 스탠딩에서 바깥쪽 다리 외전 사이드 레그 리프트',
          trajectoryFocus: 'rFoot',
          pelvis: [0.76, 0.02, 0.87],
          spineMid: [0.76, 0.02, 1.09],
          chest: [0.76, 0.02, 1.31],
          antHint: [0, -1, 0],
          lFoot: [0.74, 0.06, 0.05],
          rFoot: vlerp([0.78, -0.06, 0.06], [0.82, -0.44, 0.34], ts),
          lKneePole: [0, -1, 0],
          rKneePole: [0, -1, 0.25],
          lHand: [0.5, 0.14, 0.96],
          rHand: vlerp([0.78, -0.18, 0.92], [0.78, -0.34, 1.28], ts),
          lElbowPole: [-0.35, 0.78, -0.35],
          rElbowPole: [0.15, -0.82, -0.35],
          activeZones: ['glutes', 'obliques'],
        };
      }
      if (/ankle|발목/.test(exText)) {
        const lift = lerp(0, 0.07, ts);
        return {
          poseFeatureKo: '래더 양손 가벼운 지지에서 양발 뒤꿈치 카프 릴레베 발목 가동',
          trajectoryFocus: 'pelvis',
          pelvis: [0.78, 0, 0.87 + lift],
          spineMid: [0.78, 0, 1.09 + lift],
          chest: [0.78, 0, 1.31 + lift],
          antHint: [-1, 0, 0],
          lFoot: [0.78, 0.11, 0.05 + lift * 0.85],
          rFoot: [0.78, -0.11, 0.05 + lift * 0.85],
          lKneePole: [-1, 0.08, 0],
          rKneePole: [-1, -0.08, 0],
          lHand: [0.49, 0.18, 0.96],
          rHand: [0.49, -0.18, 0.96],
          lElbowPole: [0.45, 0.75, -0.35],
          rElbowPole: [0.45, -0.75, -0.35],
          activeZones: ['quads', 'core'],
        };
      }
      return {
        poseFeatureKo: '바렐·래더 앞 스탠딩 한 다리 발레 스트레치 지지와 몸통 측면·전방 리치',
        trajectoryFocus: 'rHand',
        pelvis: [-0.68, 0, 0.87],
        spineMid: [lerp(-0.68, -0.56, ts), 0, 1.09],
        chest: [lerp(-0.68, -0.42, ts), 0, lerp(1.31, 1.23, ts)],
        antHint: [1, 0, lerp(0, -0.25, ts)],
        lFoot: [-0.7, -0.1, 0.05],
        rFoot: [-0.24, 0.08, 0.89],
        lKneePole: [1, -0.08, 0],
        rKneePole: [0.45, 0.15, 0.88],
        lHand: vlerp([-0.64, -0.22, 1.1], [-0.18, -0.16, 1.42], ts),
        rHand: vlerp([-0.64, 0.22, 1.1], [-0.18, 0.16, 1.42], ts),
        lElbowPole: [-0.45, -0.75, -0.35],
        rElbowPole: [-0.45, 0.75, -0.35],
        activeZones: ['glutes', 'obliques', 'core'],
      };
    }
    case 'barrel-shortbox': {
      return {
        poseFeatureKo: '바렐 정점 착석·래더 발 고정에서 숏박스 라운드백·클라임 어 트리 분절',
        trajectoryFocus: 'chest',
        pelvis: [-0.18, 0, 0.88],
        spineMid: vlerp([-0.16, 0, 1.1], [-0.34, 0, 0.98], ts),
        chest: vlerp([-0.14, 0, 1.32], [-0.52, 0, 1.04], ts),
        antHint: vlerp([1, 0, 0], [0.65, 0, 0.75], ts),
        lFoot: [0.49, -0.1, 0.58],
        rFoot: /tree|트리/.test(`${exercise.id} ${exercise.nameKo}`)
          ? vlerp([0.42, 0.08, 0.72], [-0.04, 0.08, 1.38], ts)
          : [0.49, 0.1, 0.58],
        lKneePole: [0.16, -0.1, 0.88],
        rKneePole: [0.08, 0.1, 1.16],
        lHand: vlerp([0.1, -0.16, 1.18], [-0.18, -0.16, 1.24], ts),
        rHand: vlerp([0.1, 0.16, 1.18], [-0.18, 0.16, 1.24], ts),
        lElbowPole: [-0.18, -0.34, 1.12],
        rElbowPole: [-0.18, 0.34, 1.12],
        activeZones: ['core', 'obliques'],
      };
    }
    case 'barrel-sidebend': {
      return {
        poseFeatureKo: '래더 렁 발목 고정과 바렐 측면 드레이프에서 사선 축성 사이드 벤드 리프트',
        trajectoryFocus: 'chest',
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
        poseFeatureKo: '바렐 정점 치골·골반 지지와 래더 발 고정에서 전방 드레이프→풀 스완 신전',
        trajectoryFocus: 'chest',
        pelvis: [-0.28, 0, 0.9],
        spineMid: [-0.5, 0, lerp(0.82, 1.04, ts)],
        chest: [-0.68, 0, lerp(0.7, 1.22, ts)],
        antHint: [lerp(-0.4, -0.75, ts), 0, -0.7],
        lFoot: [0.46, 0.1, 0.63],
        rFoot: [0.46, -0.1, 0.63],
        lKneePole: [-0.2, 0.08, -1],
        rKneePole: [-0.2, -0.08, -1],
        lHand: [-0.86, 0.18, lerp(0.62, 1.44, ts)],
        rHand: [-0.86, -0.18, lerp(0.62, 1.44, ts)],
        lElbowPole: [0.35, 0.78, 0.35],
        rElbowPole: [0.35, -0.78, 0.35],
        activeZones: ['back', 'glutes'],
      };
    }
    case 'barrel-spinecorrector': {
      return {
        poseFeatureKo: '스파인 코렉터 스텝·아크 지지에서 흉추 오픈 신전 및 45도 하지 리프트',
        trajectoryFocus: 'chest',
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
    default:
      return sampleArchetype3DRig('reformer-footwork', rawT, exercise);
  }
}

/**
 * Explicit catalog mapping for all 98 native (`60 original-*` + `38 ex-*`) and all 60 `crawled-*`
 * exercises (`158 + 60 = 218` dedicated 3D exercises total when combined with `EXPANDED_DEDICATED_3D_RIGS`).
 */
const CATALOG_AND_CRAWLED_ARCHETYPE_MAP: Readonly<
  Record<
    string,
    {
      readonly apparatus: ApparatusType;
      readonly bodyPosition: BodyPosition;
      readonly archetype: string;
    }
  >
> = {
  // --- 60 ORIGINAL MOVEMENTS ---
  'original-reformer-supine-breath': {
    apparatus: 'reformer',
    bodyPosition: 'supine',
    archetype: 'reformer-supine-arms',
  },
  'original-mat-rib-breath': {
    apparatus: 'mat',
    bodyPosition: 'supine',
    archetype: 'mat-supine-breath',
  },
  'original-cadillac-table-breath': {
    apparatus: 'cadillac',
    bodyPosition: 'supine',
    archetype: 'cadillac-supine-table',
  },
  'original-chair-seated-breath': {
    apparatus: 'chair',
    bodyPosition: 'seated',
    archetype: 'chair-pedal-press',
  },
  'original-barrel-standing-breath': {
    apparatus: 'barrel',
    bodyPosition: 'standing',
    archetype: 'barrel-standing',
  },
  'original-reformer-parallel-footwork': {
    apparatus: 'reformer',
    bodyPosition: 'supine',
    archetype: 'reformer-footwork',
  },
  'original-mat-pelvic-clock': {
    apparatus: 'mat',
    bodyPosition: 'supine',
    archetype: 'mat-supine-breath',
  },
  'original-cadillac-pelvic-rock': {
    apparatus: 'cadillac',
    bodyPosition: 'supine',
    archetype: 'cadillac-supine-table',
  },
  'original-chair-seated-pelvic-rock': {
    apparatus: 'chair',
    bodyPosition: 'seated',
    archetype: 'chair-pedal-press',
  },
  'original-barrel-supported-ankle': {
    apparatus: 'barrel',
    bodyPosition: 'standing',
    archetype: 'barrel-standing',
  },
  'original-reformer-supported-bridge': {
    apparatus: 'reformer',
    bodyPosition: 'supine',
    archetype: 'reformer-bridge',
  },
  'original-mat-ankle-reach': {
    apparatus: 'mat',
    bodyPosition: 'standing',
    archetype: 'mat-standing-calf-raise',
  },
  'original-cadillac-table-ankle': {
    apparatus: 'cadillac',
    bodyPosition: 'supine',
    archetype: 'cadillac-leg-springs',
  },
  'original-chair-seated-pedal-press': {
    apparatus: 'chair',
    bodyPosition: 'seated',
    archetype: 'chair-pedal-press',
  },
  'original-barrel-seated-spine-reach': {
    apparatus: 'barrel',
    bodyPosition: 'seated',
    archetype: 'barrel-shortbox',
  },
  'original-reformer-supine-arm-press': {
    apparatus: 'reformer',
    bodyPosition: 'supine',
    archetype: 'reformer-supine-arms',
  },
  'original-mat-bridge': { apparatus: 'mat', bodyPosition: 'supine', archetype: 'mat-bridge' },
  'original-cadillac-table-bridge': {
    apparatus: 'cadillac',
    bodyPosition: 'supine',
    archetype: 'cadillac-supine-table',
  },
  'original-chair-alternating-pedal': {
    apparatus: 'chair',
    bodyPosition: 'seated',
    archetype: 'chair-pedal-press',
  },
  'original-barrel-supported-arm-reach': {
    apparatus: 'barrel',
    bodyPosition: 'standing',
    archetype: 'barrel-standing',
  },
  'original-reformer-seated-row': {
    apparatus: 'reformer',
    bodyPosition: 'seated',
    archetype: 'reformer-shortbox-row',
  },
  'original-mat-heel-slide': {
    apparatus: 'mat',
    bodyPosition: 'supine',
    archetype: 'mat-knee-fold',
  },
  'original-cadillac-table-knee-fold': {
    apparatus: 'cadillac',
    bodyPosition: 'supine',
    archetype: 'cadillac-supine-table',
  },
  'original-chair-seated-knee-lift': {
    apparatus: 'chair',
    bodyPosition: 'seated',
    archetype: 'chair-pedal-press',
  },
  'original-barrel-standing-rotation': {
    apparatus: 'barrel',
    bodyPosition: 'standing',
    archetype: 'barrel-standing',
  },
  'original-reformer-side-lying-press': {
    apparatus: 'reformer',
    bodyPosition: 'side-lying',
    archetype: 'reformer-side-lying',
  },
  'original-mat-knee-fold': {
    apparatus: 'mat',
    bodyPosition: 'supine',
    archetype: 'mat-knee-fold',
  },
  'original-cadillac-seated-roll-back': {
    apparatus: 'cadillac',
    bodyPosition: 'seated',
    archetype: 'cadillac-seated-rollback',
  },
  'original-chair-seated-arm-arc': {
    apparatus: 'chair',
    bodyPosition: 'seated',
    archetype: 'chair-seated-upper',
  },
  'original-barrel-standing-hip-extension': {
    apparatus: 'barrel',
    bodyPosition: 'standing',
    archetype: 'barrel-standing',
  },
  'original-reformer-box-swan-prep': {
    apparatus: 'reformer',
    bodyPosition: 'prone',
    archetype: 'reformer-longbox-swan',
  },
  'original-mat-chest-lift': {
    apparatus: 'mat',
    bodyPosition: 'supine',
    archetype: 'mat-chest-lift',
  },
  'original-cadillac-arm-spring-press': {
    apparatus: 'cadillac',
    bodyPosition: 'supine',
    archetype: 'cadillac-supine-table',
  },
  'original-chair-seated-spine-twist': {
    apparatus: 'chair',
    bodyPosition: 'seated',
    archetype: 'chair-seated-upper',
  },
  'original-barrel-standing-side-reach': {
    apparatus: 'barrel',
    bodyPosition: 'standing',
    archetype: 'barrel-standing',
  },
  'original-reformer-strap-frog': {
    apparatus: 'reformer',
    bodyPosition: 'supine',
    archetype: 'reformer-feetstraps',
  },
  'original-mat-single-leg-stretch': {
    apparatus: 'mat',
    bodyPosition: 'supine',
    archetype: 'mat-ab-series',
  },
  'original-cadillac-seated-rotation': {
    apparatus: 'cadillac',
    bodyPosition: 'seated',
    archetype: 'cadillac-seated-rollback',
  },
  'original-chair-sit-to-stand': {
    apparatus: 'chair',
    bodyPosition: 'standing',
    archetype: 'chair-goingup',
  },
  'original-barrel-supported-swan': {
    apparatus: 'barrel',
    bodyPosition: 'prone',
    archetype: 'barrel-swan',
  },
  'original-mat-seated-arm-reach': {
    apparatus: 'mat',
    bodyPosition: 'seated',
    archetype: 'mat-seated-twist',
  },
  'original-cadillac-side-leg-reach': {
    apparatus: 'cadillac',
    bodyPosition: 'side-lying',
    archetype: 'expanded-cadillac-side-leg-springs-up-down',
  },
  'original-chair-supported-calf-raise': {
    apparatus: 'chair',
    bodyPosition: 'standing',
    archetype: 'chair-goingup',
  },
  'original-barrel-supported-side-bend': {
    apparatus: 'barrel',
    bodyPosition: 'side-lying',
    archetype: 'barrel-sidebend',
  },
  'original-mat-band-row': { apparatus: 'mat', bodyPosition: 'seated', archetype: 'mat-band-row' },
  'original-cadillac-quadruped-slide': {
    apparatus: 'cadillac',
    bodyPosition: 'quadruped',
    archetype: 'cadillac-cat-rolldown',
  },
  'original-chair-incline-support': {
    apparatus: 'chair',
    bodyPosition: 'standing',
    archetype: 'chair-pike',
  },
  'original-barrel-standing-side-stretch': {
    apparatus: 'barrel',
    bodyPosition: 'standing',
    archetype: 'barrel-standing',
  },
  'original-mat-side-leg-lift': {
    apparatus: 'mat',
    bodyPosition: 'side-lying',
    archetype: 'mat-side-clam-lift',
  },
  'original-cadillac-prone-back-reach': {
    apparatus: 'cadillac',
    bodyPosition: 'prone',
    archetype: 'cadillac-prone-swan',
  },
  'original-chair-seated-back-reach': {
    apparatus: 'chair',
    bodyPosition: 'seated',
    archetype: 'chair-seated-upper',
  },
  'original-mat-clam': {
    apparatus: 'mat',
    bodyPosition: 'side-lying',
    archetype: 'mat-side-clam-lift',
  },
  'original-cadillac-seated-side-reach': {
    apparatus: 'cadillac',
    bodyPosition: 'seated',
    archetype: 'cadillac-seated-rollback',
  },
  'original-chair-seated-mermaid': {
    apparatus: 'chair',
    bodyPosition: 'seated',
    archetype: 'chair-seated-upper',
  },
  'original-mat-quadruped-reach': {
    apparatus: 'mat',
    bodyPosition: 'quadruped',
    archetype: 'mat-quadruped-reach',
  },
  'original-mat-forearm-plank': {
    apparatus: 'mat',
    bodyPosition: 'kneeling',
    archetype: 'mat-forearm-plank',
  },
  'original-mat-swan-prep': { apparatus: 'mat', bodyPosition: 'prone', archetype: 'mat-swan' },
  'original-mat-swimming-prep': {
    apparatus: 'mat',
    bodyPosition: 'prone',
    archetype: 'expanded-mat-swimming',
  },
  'original-mat-mermaid': { apparatus: 'mat', bodyPosition: 'seated', archetype: 'mat-mermaid' },
  'original-mat-open-book': {
    apparatus: 'mat',
    bodyPosition: 'side-lying',
    archetype: 'mat-open-book',
  },

  // --- 38 LEGACY / CURATED EX-* MOVEMENTS ---
  'ex-warmup-01': {
    apparatus: 'reformer',
    bodyPosition: 'supine',
    archetype: 'reformer-pelvic-clock-ball',
  },
  'ex-warmup-02': {
    apparatus: 'cadillac',
    bodyPosition: 'kneeling',
    archetype: 'cadillac-cat-rolldown',
  },
  'ex-warmup-03': { apparatus: 'mat', bodyPosition: 'supine', archetype: 'mat-foam-roller-supine' },
  'ex-footwork-01': {
    apparatus: 'reformer',
    bodyPosition: 'supine',
    archetype: 'reformer-footwork',
  },
  'ex-footwork-02': {
    apparatus: 'reformer',
    bodyPosition: 'supine',
    archetype: 'reformer-footwork-ring',
  },
  'ex-footwork-03': { apparatus: 'chair', bodyPosition: 'seated', archetype: 'chair-pedal-press' },
  'ex-bridging-01': { apparatus: 'reformer', bodyPosition: 'supine', archetype: 'reformer-bridge' },
  'ex-bridging-02': {
    apparatus: 'cadillac',
    bodyPosition: 'supine',
    archetype: 'cadillac-supine-table',
  },
  'ex-core-01': {
    apparatus: 'reformer',
    bodyPosition: 'supine',
    archetype: 'reformer-supine-arms',
  },
  'ex-core-02': {
    apparatus: 'reformer',
    bodyPosition: 'seated',
    archetype: 'reformer-shortbox-abs',
  },
  'ex-core-03': { apparatus: 'mat', bodyPosition: 'supine', archetype: 'mat-ab-series' },
  'ex-upper-01': {
    apparatus: 'reformer',
    bodyPosition: 'kneeling',
    archetype: 'reformer-kneeling-arms',
  },
  'ex-upper-02': {
    apparatus: 'reformer',
    bodyPosition: 'seated',
    archetype: 'expanded-reformer-rowing-from-chest',
  },
  'ex-upper-03': {
    apparatus: 'cadillac',
    bodyPosition: 'standing',
    archetype: 'expanded-cadillac-standing-fencing',
  },
  'ex-lower-01': {
    apparatus: 'reformer',
    bodyPosition: 'standing',
    archetype: 'reformer-scooter-lunge',
  },
  'ex-lower-02': {
    apparatus: 'reformer',
    bodyPosition: 'standing',
    archetype: 'reformer-side-splits',
  },
  'ex-lower-03': { apparatus: 'chair', bodyPosition: 'standing', archetype: 'chair-goingup' },
  'ex-plank-01': {
    apparatus: 'reformer',
    bodyPosition: 'quadruped',
    archetype: 'expanded-reformer-long-stretch',
  },
  'ex-plank-02': { apparatus: 'chair', bodyPosition: 'standing', archetype: 'chair-pike' },
  'ex-extension-01': {
    apparatus: 'reformer',
    bodyPosition: 'prone',
    archetype: 'reformer-longbox-swan',
  },
  'ex-extension-02': { apparatus: 'barrel', bodyPosition: 'prone', archetype: 'barrel-swan' },
  'ex-straps-01': {
    apparatus: 'reformer',
    bodyPosition: 'supine',
    archetype: 'reformer-feetstraps',
  },
  'ex-straps-02': {
    apparatus: 'cadillac',
    bodyPosition: 'supine',
    archetype: 'cadillac-leg-springs',
  },
  'ex-cooldown-01': {
    apparatus: 'reformer',
    bodyPosition: 'seated',
    archetype: 'reformer-mermaid',
  },
  'ex-cooldown-02': {
    apparatus: 'mat',
    bodyPosition: 'standing',
    archetype: 'mat-standing-rolldown',
  },
  'ex-core-04': {
    apparatus: 'reformer',
    bodyPosition: 'kneeling',
    archetype: 'reformer-reverse-abs-kneeling',
  },
  'ex-lower-04': {
    apparatus: 'reformer',
    bodyPosition: 'side-lying',
    archetype: 'reformer-side-lying',
  },
  'ex-kr-reformer-01': {
    apparatus: 'reformer',
    bodyPosition: 'supine',
    archetype: 'reformer-bridge',
  },
  'ex-kr-cadillac-01': {
    apparatus: 'cadillac',
    bodyPosition: 'supine',
    archetype: 'cadillac-teaser',
  },
  'ex-kr-reformer-02': {
    apparatus: 'reformer',
    bodyPosition: 'standing',
    archetype: 'reformer-lunge-arabesque',
  },
  'ex-kr-barrel-01': {
    apparatus: 'barrel',
    bodyPosition: 'side-lying',
    archetype: 'barrel-sidebend',
  },
  'ex-kr-reformer-03': {
    apparatus: 'reformer',
    bodyPosition: 'kneeling',
    archetype: 'reformer-kneeling-triceps',
  },
  'ex-kr-chair-01': { apparatus: 'chair', bodyPosition: 'quadruped', archetype: 'chair-pike' },
  'ex-kr-reformer-04': {
    apparatus: 'reformer',
    bodyPosition: 'supine',
    archetype: 'reformer-supine-arms',
  },
  'ex-kr-cadillac-02': {
    apparatus: 'cadillac',
    bodyPosition: 'supine',
    archetype: 'cadillac-leg-springs',
  },
  'ex-global-reformer-01': {
    apparatus: 'reformer',
    bodyPosition: 'supine',
    archetype: 'reformer-bridge-ring',
  },
  'ex-global-reformer-02': {
    apparatus: 'mat',
    bodyPosition: 'supine',
    archetype: 'mat-chest-lift',
  },
  'ex-global-reformer-03': {
    apparatus: 'reformer',
    bodyPosition: 'kneeling',
    archetype: 'reformer-kneeling-lunge',
  },

  // --- 60 GLOBAL CRAWLED REPERTOIRE MOVEMENTS ---
  'crawled-mat-rolling-like-a-ball': {
    apparatus: 'mat',
    bodyPosition: 'seated',
    archetype: 'mat-rolling-ball',
  },
  'crawled-mat-double-leg-stretch': {
    apparatus: 'mat',
    bodyPosition: 'supine',
    archetype: 'mat-ab-series',
  },
  'crawled-mat-spine-stretch-forward': {
    apparatus: 'mat',
    bodyPosition: 'seated',
    archetype: 'mat-seated-twist',
  },
  'crawled-mat-open-leg-rocker': {
    apparatus: 'mat',
    bodyPosition: 'seated',
    archetype: 'mat-rolling-ball',
  },
  'crawled-mat-corkscrew': { apparatus: 'mat', bodyPosition: 'supine', archetype: 'mat-inversion' },
  'crawled-mat-saw': { apparatus: 'mat', bodyPosition: 'seated', archetype: 'mat-seated-twist' },
  'crawled-mat-single-leg-kick': {
    apparatus: 'mat',
    bodyPosition: 'prone',
    archetype: 'expanded-mat-double-leg-kick',
  },
  'crawled-mat-neck-pull': {
    apparatus: 'mat',
    bodyPosition: 'supine',
    archetype: 'expanded-mat-roll-up',
  },
  'crawled-mat-jack-knife': {
    apparatus: 'mat',
    bodyPosition: 'supine',
    archetype: 'mat-inversion',
  },
  'crawled-mat-teaser-classic': {
    apparatus: 'mat',
    bodyPosition: 'supine',
    archetype: 'mat-teaser',
  },
  'crawled-mat-boomerang': { apparatus: 'mat', bodyPosition: 'seated', archetype: 'mat-teaser' },
  'crawled-mat-seal': { apparatus: 'mat', bodyPosition: 'seated', archetype: 'mat-rolling-ball' },
  'crawled-mat-control-balance': {
    apparatus: 'mat',
    bodyPosition: 'supine',
    archetype: 'mat-inversion',
  },
  'crawled-mat-scissors-high': {
    apparatus: 'mat',
    bodyPosition: 'supine',
    archetype: 'mat-inversion',
  },
  'crawled-mat-pilates-pushup': {
    apparatus: 'mat',
    bodyPosition: 'standing',
    archetype: 'expanded-mat-leg-pull-front',
  },
  'crawled-reformer-stomach-massage-round': {
    apparatus: 'reformer',
    bodyPosition: 'seated',
    archetype: 'reformer-stomach-massage-round',
  },
  'crawled-reformer-stomach-massage-reach-twist': {
    apparatus: 'reformer',
    bodyPosition: 'seated',
    archetype: 'reformer-stomach-massage-twist',
  },
  'crawled-reformer-short-spine-massage': {
    apparatus: 'reformer',
    bodyPosition: 'supine',
    archetype: 'reformer-shortspine',
  },
  'crawled-reformer-semicircle': {
    apparatus: 'reformer',
    bodyPosition: 'supine',
    archetype: 'reformer-bridge',
  },
  'crawled-reformer-knee-stretches-round': {
    apparatus: 'reformer',
    bodyPosition: 'kneeling',
    archetype: 'reformer-knee-stretches',
  },
  'crawled-reformer-knee-stretches-knees-off': {
    apparatus: 'reformer',
    bodyPosition: 'quadruped',
    archetype: 'reformer-knee-stretches',
  },
  'crawled-reformer-down-stretch': {
    apparatus: 'reformer',
    bodyPosition: 'kneeling',
    archetype: 'reformer-down-stretch',
  },
  'crawled-reformer-tendon-stretch': {
    apparatus: 'reformer',
    bodyPosition: 'standing',
    archetype: 'expanded-reformer-elephant',
  },
  'crawled-reformer-backstroke-longbox': {
    apparatus: 'reformer',
    bodyPosition: 'supine',
    archetype: 'reformer-longbox-backstroke',
  },
  'crawled-reformer-longbox-teaser': {
    apparatus: 'reformer',
    bodyPosition: 'supine',
    archetype: 'reformer-longbox-teaser',
  },
  'crawled-reformer-breaststroke-longbox': {
    apparatus: 'reformer',
    bodyPosition: 'prone',
    archetype: 'reformer-longbox-breaststroke',
  },
  'crawled-reformer-horseback': {
    apparatus: 'reformer',
    bodyPosition: 'seated',
    archetype: 'reformer-longbox-horseback',
  },
  'crawled-reformer-shortbox-tree': {
    apparatus: 'reformer',
    bodyPosition: 'seated',
    archetype: 'reformer-shortbox-tree',
  },
  'crawled-reformer-snake-twist': {
    apparatus: 'reformer',
    bodyPosition: 'side-lying',
    archetype: 'reformer-snake-twist',
  },
  'crawled-reformer-front-splits': {
    apparatus: 'reformer',
    bodyPosition: 'standing',
    archetype: 'reformer-front-splits',
  },
  'crawled-reformer-russian-splits': {
    apparatus: 'reformer',
    bodyPosition: 'standing',
    archetype: 'reformer-front-splits',
  },
  'crawled-reformer-arms-in-straps-coordination': {
    apparatus: 'reformer',
    bodyPosition: 'supine',
    archetype: 'reformer-supine-arms',
  },
  'crawled-reformer-side-arm-rotation': {
    apparatus: 'reformer',
    bodyPosition: 'seated',
    archetype: 'reformer-side-arm-sitting',
  },
  'crawled-cadillac-monkey': {
    apparatus: 'cadillac',
    bodyPosition: 'supine',
    archetype: 'cadillac-monkey',
  },
  'crawled-cadillac-teaser-pushthrough': {
    apparatus: 'cadillac',
    bodyPosition: 'supine',
    archetype: 'cadillac-teaser',
  },
  'crawled-cadillac-tower-prep': {
    apparatus: 'cadillac',
    bodyPosition: 'supine',
    archetype: 'cadillac-supine-table',
  },
  'crawled-cadillac-spread-eagle': {
    apparatus: 'cadillac',
    bodyPosition: 'standing',
    archetype: 'cadillac-spread-eagle',
  },
  'crawled-cadillac-hanging-pullups': {
    apparatus: 'cadillac',
    bodyPosition: 'standing',
    archetype: 'cadillac-hanging',
  },
  'crawled-cadillac-rolling-stomach-massage': {
    apparatus: 'cadillac',
    bodyPosition: 'seated',
    archetype: 'cadillac-seated-rollback',
  },
  'crawled-cadillac-prone-scapula-swan': {
    apparatus: 'cadillac',
    bodyPosition: 'prone',
    archetype: 'cadillac-prone-swan',
  },
  'crawled-cadillac-hip-opener-legspring': {
    apparatus: 'cadillac',
    bodyPosition: 'supine',
    archetype: 'cadillac-leg-springs',
  },
  'crawled-cadillac-airplane-magician': {
    apparatus: 'cadillac',
    bodyPosition: 'supine',
    archetype: 'cadillac-leg-springs',
  },
  'crawled-cadillac-9-essential-flow': {
    apparatus: 'cadillac',
    bodyPosition: 'supine',
    archetype: 'cadillac-teaser',
  },
  'crawled-chair-going-up-front': {
    apparatus: 'chair',
    bodyPosition: 'standing',
    archetype: 'chair-goingup',
  },
  'crawled-chair-going-up-side': {
    apparatus: 'chair',
    bodyPosition: 'standing',
    archetype: 'chair-goingup-side',
  },
  'crawled-chair-mountain-climber': {
    apparatus: 'chair',
    bodyPosition: 'standing',
    archetype: 'chair-goingup',
  },
  'crawled-chair-pull-up-hamstring3': {
    apparatus: 'chair',
    bodyPosition: 'standing',
    archetype: 'chair-pike',
  },
  'crawled-chair-teaser-tricep-press': {
    apparatus: 'chair',
    bodyPosition: 'seated',
    archetype: 'chair-teaser-triceps',
  },
  'crawled-chair-standing-leg-pump': {
    apparatus: 'chair',
    bodyPosition: 'standing',
    archetype: 'chair-standing-leg-pump',
  },
  'crawled-chair-achilles-frogs': {
    apparatus: 'chair',
    bodyPosition: 'seated',
    archetype: 'chair-pedal-press',
  },
  'crawled-chair-intermediate-core-combo': {
    apparatus: 'chair',
    bodyPosition: 'seated',
    archetype: 'chair-single-leg-core',
  },
  'crawled-chair-spine-stretch-forward': {
    apparatus: 'chair',
    bodyPosition: 'seated',
    archetype: 'expanded-chair-push-down-front',
  },
  'crawled-barrel-climb-a-tree': {
    apparatus: 'barrel',
    bodyPosition: 'seated',
    archetype: 'barrel-shortbox',
  },
  'crawled-barrel-shortbox-roundback': {
    apparatus: 'barrel',
    bodyPosition: 'seated',
    archetype: 'barrel-shortbox',
  },
  'crawled-barrel-side-sit-up': {
    apparatus: 'barrel',
    bodyPosition: 'side-lying',
    archetype: 'barrel-sidebend',
  },
  'crawled-barrel-swan-dive-full': {
    apparatus: 'barrel',
    bodyPosition: 'prone',
    archetype: 'barrel-swan',
  },
  'crawled-barrel-grasshopper': {
    apparatus: 'barrel',
    bodyPosition: 'prone',
    archetype: 'expanded-barrel-swimming',
  },
  'crawled-barrel-side-over-opc': {
    apparatus: 'barrel',
    bodyPosition: 'side-lying',
    archetype: 'barrel-sidebend',
  },
  'crawled-barrel-fullbody-ladder-flow': {
    apparatus: 'barrel',
    bodyPosition: 'standing',
    archetype: 'barrel-standing',
  },
  'crawled-barrel-arc-thoracic-opener': {
    apparatus: 'barrel',
    bodyPosition: 'supine',
    archetype: 'barrel-spinecorrector',
  },
};

/**
 * Procedural 3D Pose Synthesizer for custom (`custom-*`, `idea-*`) or user-edited exercises
 * whose `apparatus` or `bodyPosition` was changed from the original catalog entry.
 * Always matches the exercise's CURRENT `apparatus`, `bodyPosition`, `blockCategory`, and `props`.
 */
function selectProceduralArchetype(
  exercise: Pick<
    PilatesExercise,
    'id' | 'nameKo' | 'nameEn' | 'apparatus' | 'bodyPosition' | 'blockCategory' | 'box' | 'props'
  > & { readonly movementFamily?: string },
): string {
  const { apparatus, bodyPosition, blockCategory, box, props } = exercise;
  const text =
    `${exercise.id} ${exercise.nameKo} ${exercise.nameEn} ${exercise.movementFamily ?? ''}`.toLowerCase();
  const hasLongBox = box === 'long-box' || /long[\s-]?box|롱박스/.test(text);
  const hasShortBox = box === 'short-box' || /short[\s-]?box|숏박스/.test(text);
  const hasJumpboard = /jump\s*board|점프보드|점핑|plyo|플라이오|카디오\s*점프/.test(text);
  const hasRoller = props.includes('foam-roller') || /foam[\s-]?roller|폼롤러/.test(text);
  const hasRing = props.includes('magic-circle') || /magic[\s-]?circle|써클링|매직써클/.test(text);
  const hasMiniBall = props.includes('mini-ball') || /mini[\s-]?ball|미니볼/.test(text);

  if (apparatus === 'mat') {
    if (bodyPosition === 'prone') {
      if (blockCategory === 'plank' || /plank|push[\s-]?up|플랭크|푸시업/.test(text))
        return 'expanded-mat-leg-pull-front';
      if (/swim|스위밍/.test(text)) return 'expanded-mat-swimming';
      if (/kick|킥/.test(text)) return 'expanded-mat-double-leg-kick';
      if (/rock|로킹/.test(text)) return 'expanded-mat-rocking';
      return 'mat-swan';
    }
    if (bodyPosition === 'side-lying') {
      if (blockCategory === 'plank' || /side[\s-]?bend|사이드\s*벤드/.test(text))
        return 'expanded-mat-side-bend';
      if (/open[\s-]?book|오픈\s*북|rotation|회전/.test(text)) return 'mat-open-book';
      if (/kick|스윙|킥/.test(text)) return 'expanded-mat-side-kicks';
      return 'mat-side-clam-lift';
    }
    if (bodyPosition === 'seated') {
      if (props.includes('theraband') || /band|밴드|row|로우/.test(text)) return 'mat-band-row';
      if (/mermaid|머메이드|측굴/.test(text)) return 'mat-mermaid';
      if (/rolling|rocker|seal|롤링|라커|씰/.test(text)) return 'mat-rolling-ball';
      if (/roll[\s-]?back|롤백/.test(text)) return 'expanded-mat-half-roll-back';
      return 'mat-seated-twist';
    }
    if (bodyPosition === 'kneeling') {
      if (/side[\s-]?kick|사이드\s*킥/.test(text)) return 'expanded-mat-kneeling-side-kicks';
      if (blockCategory === 'plank' || /plank|플랭크/.test(text)) return 'mat-forearm-plank';
      return 'expanded-mat-thigh-stretch';
    }
    if (bodyPosition === 'quadruped') return 'mat-quadruped-reach';
    if (bodyPosition === 'standing') {
      if (/ankle|calf|heel|발목|카프|릴레베/.test(text)) return 'mat-standing-calf-raise';
      return 'mat-standing-rolldown';
    }
    if (hasRoller) return 'mat-foam-roller-supine';
    if (blockCategory === 'bridging' || /bridge|브리지|브릿지/.test(text)) return 'mat-bridge';
    if (/teaser|티저/.test(text)) return 'mat-teaser';
    if (/hundred|헌드레드/.test(text)) return 'expanded-mat-hundred';
    if (/circle|서클|써클/.test(text) && !hasRing) return 'expanded-mat-single-leg-circle';
    if (/heel[\s-]?slide|knee[\s-]?fold|힐\s*슬라이드|니\s*폴드/.test(text)) return 'mat-knee-fold';
    if (blockCategory === 'core') return 'mat-chest-lift';
    return 'mat-supine-breath';
  }
  if (apparatus === 'reformer') {
    if (hasJumpboard && bodyPosition === 'supine') return 'reformer-jumpboard';
    if (bodyPosition === 'prone') {
      if (hasLongBox) {
        if (/hamstring|햄스트링|curl|컬/.test(text)) return 'expanded-reformer-hamstring-curl';
        if (/swim|스위밍/.test(text)) return 'reformer-longbox-swimming';
        if (/breast|브레스트/.test(text)) return 'reformer-longbox-breaststroke';
        return 'reformer-longbox-swan';
      }
      return 'expanded-reformer-long-stretch';
    }
    if (bodyPosition === 'side-lying') {
      if (/snake|스네이크/.test(text)) return 'reformer-snake-twist';
      return 'reformer-side-lying';
    }
    if (bodyPosition === 'seated') {
      if (hasLongBox) {
        return /horse|홀스백/.test(text) ? 'reformer-longbox-horseback' : 'reformer-longbox-teaser';
      }
      if (hasShortBox) {
        if (/tree|트리/.test(text)) return 'reformer-shortbox-tree';
        if (/row|로우|로잉/.test(text)) return 'reformer-shortbox-row';
        return 'reformer-shortbox-abs';
      }
      if (/stomach|스터먹/.test(text)) {
        return /twist|트위스트/.test(text)
          ? 'reformer-stomach-massage-twist'
          : 'reformer-stomach-massage-round';
      }
      if (/side[\s-]?arm|사이드\s*시티드/.test(text)) return 'reformer-side-arm-sitting';
      if (/row|로우|로잉|shave|쉐이브|hug|허그/.test(text))
        return 'expanded-reformer-rowing-from-chest';
      return 'reformer-mermaid';
    }
    if (bodyPosition === 'kneeling') {
      if (/lunge|런지|이브스/.test(text)) return 'reformer-kneeling-lunge';
      if (/down[\s-]?stretch|다운\s*스트레치/.test(text)) return 'reformer-down-stretch';
      if (/knee[\s-]?stretch|니\s*스트레치/.test(text)) return 'reformer-knee-stretches';
      if (/reverse|crunch|리버스|크런치/.test(text)) return 'reformer-reverse-abs-kneeling';
      if (/tricep|트라이셉|삼두/.test(text)) return 'reformer-kneeling-triceps';
      if (/circle|서클|써클/.test(text)) return 'expanded-reformer-arm-circles';
      if (/thigh|허벅지/.test(text)) return 'expanded-reformer-thigh-stretch';
      return 'reformer-kneeling-arms';
    }
    if (bodyPosition === 'quadruped') {
      if (/knee[\s-]?stretch|knees[\s-]?off|니\s*스트레치|니즈\s*오프/.test(text))
        return 'reformer-knee-stretches';
      return 'expanded-reformer-long-stretch';
    }
    if (bodyPosition === 'standing') {
      if (blockCategory === 'plank' || /elephant|엘리펀트|tendon|텐던/.test(text))
        return 'expanded-reformer-elephant';
      if (/front[\s-]?split|russian[\s-]?split|프론트\s*스플릿|러시안\s*스플릿/.test(text))
        return 'reformer-front-splits';
      if (/side[\s-]?split|skater|사이드\s*스플릿|스케이터/.test(text))
        return 'reformer-side-splits';
      if (/arabesque|아라베스크/.test(text)) return 'reformer-lunge-arabesque';
      return 'reformer-scooter-lunge';
    }
    if (hasLongBox) {
      return /backstroke|백스트로크/.test(text)
        ? 'reformer-longbox-backstroke'
        : 'reformer-longbox-teaser';
    }
    if (blockCategory === 'bridging' || /bridge|브리지|브릿지/.test(text)) {
      return hasRing ? 'reformer-bridge-ring' : 'reformer-bridge';
    }
    if (blockCategory === 'feet-in-straps') {
      return /short[\s-]?spine|숏\s*스파인/.test(text) ? 'reformer-shortspine' : 'reformer-feetstraps';
    }
    if (blockCategory === 'core') return 'reformer-supine-arms';
    if (blockCategory === 'warmup' && hasMiniBall) return 'reformer-pelvic-clock-ball';
    if (hasRing) return 'reformer-footwork-ring';
    return 'reformer-footwork';
  }
  if (apparatus === 'cadillac') {
    if (bodyPosition === 'prone') return 'cadillac-prone-swan';
    if (bodyPosition === 'side-lying') return 'expanded-cadillac-side-leg-springs-up-down';
    if (bodyPosition === 'seated') return 'cadillac-seated-rollback';
    if (bodyPosition === 'kneeling' || bodyPosition === 'quadruped') {
      if (/side[\s-]?bend|측굴/.test(text)) return 'expanded-cadillac-kneeling-side-bend';
      if (/thigh|허벅지/.test(text)) return 'expanded-cadillac-roll-back-thigh-stretch';
      return 'cadillac-cat-rolldown';
    }
    if (bodyPosition === 'standing') {
      if (/spread[\s-]?eagle|스프레드\s*이글/.test(text)) return 'cadillac-spread-eagle';
      if (/hang|행잉/.test(text)) return 'cadillac-hanging';
      if (/fencing|punch|boxing|펜싱|펀치|복싱/.test(text))
        return 'expanded-cadillac-standing-fencing';
      if (/butterfly|버터플라이/.test(text)) return 'expanded-cadillac-standing-butterfly';
      return 'expanded-cadillac-roll-back-biceps';
    }
    if (/monkey|몽키/.test(text)) return 'cadillac-monkey';
    if (blockCategory === 'feet-in-straps') return 'cadillac-leg-springs';
    if (blockCategory === 'core' || /teaser|티저/.test(text)) return 'cadillac-teaser';
    return 'cadillac-supine-table';
  }
  if (apparatus === 'chair') {
    if (bodyPosition === 'prone') return 'chair-swan';
    if (bodyPosition === 'kneeling' || bodyPosition === 'quadruped') {
      return /mermaid|머메이드|측굴/.test(text)
        ? 'expanded-chair-mermaid-kneeling'
        : 'expanded-chair-kneeling-push-down';
    }
    if (bodyPosition === 'standing') {
      if (blockCategory === 'plank' || /pike|pull[\s-]?up|파이크|풀업/.test(text))
        return 'chair-pike';
      if (/leg[\s-]?pump|레그\s*펌프/.test(text)) return 'chair-standing-leg-pump';
      if (/going[\s-]?up[\s-]?side|고잉\s*업\s*사이드/.test(text)) return 'chair-goingup-side';
      return 'chair-goingup';
    }
    if (bodyPosition === 'side-lying') return 'expanded-chair-side-pull-up';
    if (/teaser|tricep|티저|트라이셉/.test(text)) return 'chair-teaser-triceps';
    if (/single[\s-]?leg|원레그/.test(text)) return 'chair-single-leg-core';
    if (blockCategory === 'upper-body' || blockCategory === 'cooldown') return 'chair-seated-upper';
    return 'chair-pedal-press';
  }
  // barrel
  if (bodyPosition === 'prone') {
    return /swim|grasshopper|스위밍|그래스하퍼/.test(text)
      ? 'expanded-barrel-swimming'
      : 'barrel-swan';
  }
  if (bodyPosition === 'side-lying') return 'barrel-sidebend';
  if (bodyPosition === 'standing') return 'barrel-standing';
  if (bodyPosition === 'supine') return 'barrel-spinecorrector';
  if (/horseback|jockey|홀스백|조키/.test(text)) return 'expanded-barrel-horseback';
  return 'barrel-shortbox';
}

export function hasDedicated3DExerciseRig(
  exercise: Pick<PilatesExercise, 'id' | 'apparatus' | 'bodyPosition'>,
): boolean {
  const exp = Object.hasOwn(EXPANDED_DEDICATED_3D_RIGS, exercise.id)
    ? EXPANDED_DEDICATED_3D_RIGS[exercise.id]
    : undefined;
  if (exp) {
    return (
      exp.apparatus === exercise.apparatus &&
      (!exp.bodyPosition || exp.bodyPosition === exercise.bodyPosition)
    );
  }
  const cat = Object.hasOwn(CATALOG_AND_CRAWLED_ARCHETYPE_MAP, exercise.id)
    ? CATALOG_AND_CRAWLED_ARCHETYPE_MAP[exercise.id]
    : undefined;
  if (cat) {
    return cat.apparatus === exercise.apparatus && cat.bodyPosition === exercise.bodyPosition;
  }
  return false;
}

const vSub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vAdd = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const vMul = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const vDot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vCross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const vLen = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
const vNorm = (a: Vec3): Vec3 => {
  const l = vLen(a);
  return l > 1e-6 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 1];
};

function computeBodyRight(pelvis: Vec3, chest: Vec3, antHint: Vec3): {
  readonly spUp: Vec3;
  readonly antN: Vec3;
  readonly bodyRight: Vec3;
} {
  const spUp = vNorm(vSub(chest, pelvis));
  const antProj = vSub(antHint, vMul(spUp, vDot(antHint, spUp)));
  const antN = vLen(antProj) > 1e-4 ? vNorm(antProj) : vNorm([1, 0, 0]);
  const bodyRight = vNorm(vCross(spUp, antN));
  return { spUp, antN, bodyRight };
}

function eval2BoneMid(root: Vec3, target: Vec3, l1: number, l2: number, pole: Vec3): {
  readonly mid: Vec3;
  readonly bend: Vec3;
  readonly poleProjLen: number;
} {
  let dVec = vSub(target, root);
  let dist = vLen(dVec);
  const maxR = (l1 + l2) * 0.992;
  const minR = Math.abs(l1 - l2) + 0.03;
  if (dist > maxR) {
    dVec = vMul(vNorm(dVec), maxR);
    dist = maxR;
  } else if (dist < minR) {
    const dir: Vec3 = dist > 1e-5 ? vNorm(dVec) : [1, 0, 0];
    dVec = vMul(dir, minR);
    dist = minR;
  }
  const u = vNorm(dVec);
  let bend = vSub(pole, vMul(u, vDot(pole, u)));
  const poleProjLen = vLen(bend);
  if (poleProjLen < 1e-4) {
    bend = vCross(u, [0, 1, 0]);
    if (vLen(bend) < 1e-4) bend = vCross(u, [0, 0, 1]);
  }
  bend = vNorm(bend);
  const cosA = Math.max(-1, Math.min(1, (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist)));
  const angA = Math.acos(cosA);
  const mid = vAdd(root, vMul(vAdd(vMul(u, Math.cos(angA)), vMul(bend, Math.sin(angA))), l1));
  return { mid, bend, poleProjLen };
}

function stabilizeLimbPole(
  root: Vec3,
  target: Vec3,
  l1: number,
  l2: number,
  rawPole: Vec3,
  fallbackPole: Vec3,
  minMidZ: number,
): Vec3 {
  let pole = vLen(rawPole) >= 0.12 ? vNorm(rawPole) : vNorm(fallbackPole);
  const u = vNorm(vSub(target, root));
  const proj = vSub(pole, vMul(u, vDot(pole, u)));
  const projLen = vLen(proj);
  if (projLen < 0.34) {
    const fbProj = vSub(fallbackPole, vMul(u, vDot(fallbackPole, u)));
    const safeDir = vLen(fbProj) > 0.1 ? vNorm(fbProj) : vNorm(vCross(u, [0, 1, 0]));
    const w = smoothstep(Math.max(0, Math.min(1, (0.34 - projLen) / 0.28)));
    pole = vNorm(vAdd(vMul(pole, 1 - w * 0.85), vMul(safeDir, w * 0.95)));
  }
  const { mid } = eval2BoneMid(root, target, l1, l2, pole);
  if (mid[2] < minMidZ) {
    const deficit = Math.min(1, (minMidZ - mid[2]) / 0.08);
    const liftBias = vNorm(vAdd([0, 0, 1], vMul(fallbackPole, 0.35)));
    pole = vNorm(vAdd(vMul(pole, 1 - deficit * 0.7), vMul(liftBias, 0.35 + deficit * 0.85)));
  }
  return pole;
}

function normalizeBiomechanicalPoseRig(
  raw: Omit<Universal3DPoseRig, 'rigId' | 'rigScope'>,
  refAtZero: Omit<Universal3DPoseRig, 'rigId' | 'rigScope'>,
  refAtOne: Omit<Universal3DPoseRig, 'rigId' | 'rigScope'>,
): Omit<Universal3DPoseRig, 'rigId' | 'rigScope'> {
  let pelvis = raw.pelvis;
  let spineMid = raw.spineMid;
  let chest = raw.chest;

  // 1. Preserve anatomical spine chord length (0.312m .. 0.56m) without losing C-curve arc
  const spVec0 = vSub(chest, pelvis);
  const spLen0 = vLen(spVec0);
  if (spLen0 < 0.312 || spLen0 > 0.56) {
    const targetLen = spLen0 < 0.312 ? 0.316 : 0.555;
    const center = vMul(vAdd(pelvis, chest), 0.5);
    const dir = spLen0 > 1e-4 ? vMul(spVec0, 1 / spLen0) : ([0, 0, 1] as Vec3);
    const half = targetLen * 0.5;
    const nextPelvis: Vec3 = [
      Math.max(0.035, center[0] - dir[0] * half) === center[0] - dir[0] * half
        ? center[0] - dir[0] * half
        : center[0] - dir[0] * half,
      center[1] - dir[1] * half,
      Math.max(0.08, center[2] - dir[2] * half),
    ];
    const nextChest: Vec3 = [
      nextPelvis[0] + dir[0] * targetLen,
      nextPelvis[1] + dir[1] * targetLen,
      Math.max(0.11, nextPelvis[2] + dir[2] * targetLen),
    ];
    const chordShift = vMul(vAdd(vSub(nextPelvis, pelvis), vSub(nextChest, chest)), 0.5);
    pelvis = nextPelvis;
    chest = nextChest;
    spineMid = [
      spineMid[0] + chordShift[0],
      spineMid[1] + chordShift[1],
      Math.max(0.09, spineMid[2] + chordShift[2]),
    ];
  }

  // 2. Consistently uncross L/R feet or hands when a rig's entire trajectory swapped lateral sides
  const br0 = computeBodyRight(refAtZero.pelvis, refAtZero.chest, refAtZero.antHint).bodyRight;
  const br1 = computeBodyRight(refAtOne.pelvis, refAtOne.chest, refAtOne.antHint).bodyRight;
  const swapLegs =
    vDot(vSub(refAtZero.rFoot, refAtZero.lFoot), br0) < -0.04 &&
    vDot(vSub(refAtOne.rFoot, refAtOne.lFoot), br1) < -0.04;
  const swapArms =
    vDot(vSub(refAtZero.rHand, refAtZero.lHand), br0) < -0.05 &&
    vDot(vSub(refAtOne.rHand, refAtOne.lHand), br1) < -0.05;

  let lFoot = swapLegs ? raw.rFoot : raw.lFoot;
  let rFoot = swapLegs ? raw.lFoot : raw.rFoot;
  let lKneePole = swapLegs ? raw.rKneePole : raw.lKneePole;
  let rKneePole = swapLegs ? raw.lKneePole : raw.rKneePole;

  let lHand = swapArms ? raw.rHand : raw.lHand;
  let rHand = swapArms ? raw.lHand : raw.rHand;
  let lElbowPole = swapArms ? raw.rElbowPole : raw.lElbowPole;
  let rElbowPole = swapArms ? raw.lElbowPole : raw.rElbowPole;

  let { antN, bodyRight } = computeBodyRight(pelvis, chest, raw.antHint);

  // 3. Seat upper-limb & lower-limb reach organically within anatomical segment lengths
  const maxArmReach = 0.534;
  const maxLegReach = 0.784;

  let lSh = vSub(chest, vMul(bodyRight, 0.148));
  let rSh = vAdd(chest, vMul(bodyRight, 0.148));
  const overLArm = Math.max(0, vLen(vSub(lHand, lSh)) - maxArmReach);
  const overRArm = Math.max(0, vLen(vSub(rHand, rSh)) - maxArmReach);
  if (overLArm > 0 || overRArm > 0) {
    // Allow subtle thoracic protraction/lean (up to 3.8cm) when reaching toward a bar/pedal
    const pullVec = vAdd(
      overLArm > 0 ? vMul(vNorm(vSub(lHand, lSh)), Math.min(0.038, overLArm * 0.65)) : [0, 0, 0],
      overRArm > 0 ? vMul(vNorm(vSub(rHand, rSh)), Math.min(0.038, overRArm * 0.65)) : [0, 0, 0],
    );
    const pullMag = vLen(pullVec);
    if (pullMag > 1e-4) {
      const cappedPull = pullMag > 0.038 ? vMul(vNorm(pullVec), 0.038) : pullVec;
      const candChest: Vec3 = [
        chest[0] + cappedPull[0],
        chest[1] + cappedPull[1],
        Math.max(0.11, chest[2] + cappedPull[2]),
      ];
      const candSpLen = vLen(vSub(candChest, pelvis));
      if (candSpLen >= 0.308 && candSpLen <= 0.565) {
        chest = candChest;
        spineMid = vAdd(spineMid, vMul(cappedPull, 0.5));
        ({ antN, bodyRight } = computeBodyRight(pelvis, chest, raw.antHint));
        lSh = vSub(chest, vMul(bodyRight, 0.148));
        rSh = vAdd(chest, vMul(bodyRight, 0.148));
      }
    }
    if (vLen(vSub(lHand, lSh)) > maxArmReach) {
      lHand = vAdd(lSh, vMul(vNorm(vSub(lHand, lSh)), maxArmReach));
      lHand = [lHand[0], lHand[1], Math.max(0.04, lHand[2])];
    }
    if (vLen(vSub(rHand, rSh)) > maxArmReach) {
      rHand = vAdd(rSh, vMul(vNorm(vSub(rHand, rSh)), maxArmReach));
      rHand = [rHand[0], rHand[1], Math.max(0.04, rHand[2])];
    }
  }

  let lHip = vSub(pelvis, vMul(bodyRight, 0.086));
  let rHip = vAdd(pelvis, vMul(bodyRight, 0.086));
  const overLLeg = Math.max(0, vLen(vSub(lFoot, lHip)) - maxLegReach);
  const overRLeg = Math.max(0, vLen(vSub(rFoot, rHip)) - maxLegReach);
  if (overLLeg > 0 || overRLeg > 0) {
    if (vLen(vSub(lFoot, lHip)) > maxLegReach) {
      lFoot = vAdd(lHip, vMul(vNorm(vSub(lFoot, lHip)), maxLegReach));
      lFoot = [lFoot[0], lFoot[1], Math.max(0.04, lFoot[2])];
    }
    if (vLen(vSub(rFoot, rHip)) > maxLegReach) {
      rFoot = vAdd(rHip, vMul(vNorm(vSub(rFoot, rHip)), maxLegReach));
      rFoot = [rFoot[0], rFoot[1], Math.max(0.04, rFoot[2])];
    }
  }

  // 4. Stabilize knee & elbow poles against collinearity, floor penetration, and knee-crossing
  lHip = vSub(pelvis, vMul(bodyRight, 0.086));
  rHip = vAdd(pelvis, vMul(bodyRight, 0.086));
  lSh = vSub(chest, vMul(bodyRight, 0.148));
  rSh = vAdd(chest, vMul(bodyRight, 0.148));

  const lLegFallback = vNorm(vAdd(vMul(antN, 0.78), vMul(bodyRight, -0.32)));
  const rLegFallback = vNorm(vAdd(vMul(antN, 0.78), vMul(bodyRight, 0.32)));
  const lArmFallback = vNorm(vAdd(vMul(bodyRight, -0.82), vMul(antN, -0.35)));
  const rArmFallback = vNorm(vAdd(vMul(bodyRight, 0.82), vMul(antN, -0.35)));

  lKneePole = stabilizeLimbPole(lHip, lFoot, 0.4, 0.39, lKneePole, lLegFallback, 0.042);
  rKneePole = stabilizeLimbPole(rHip, rFoot, 0.4, 0.39, rKneePole, rLegFallback, 0.042);
  lElbowPole = stabilizeLimbPole(lSh, lHand, 0.28, 0.26, lElbowPole, lArmFallback, 0.036);
  rElbowPole = stabilizeLimbPole(rSh, rHand, 0.28, 0.26, rElbowPole, rArmFallback, 0.036);

  // Smoothly blend away any severe posterior/ostrich knee pole on procedural rigs without hard step-jumps
  const pelUp = vNorm(vSub(spineMid, pelvis));
  const pelAntProj = vSub(raw.antHint, vMul(pelUp, vDot(raw.antHint, pelUp)));
  const pelAnt = vLen(pelAntProj) > 1e-4 ? vNorm(pelAntProj) : antN;
  for (const side of ['L', 'R'] as const) {
    const hip = side === 'L' ? lHip : rHip;
    const foot = side === 'L' ? lFoot : rFoot;
    const pole = side === 'L' ? lKneePole : rKneePole;
    const outward = side === 'L' ? vMul(bodyRight, -1) : bodyRight;
    const fb = side === 'L' ? lLegFallback : rLegFallback;
    const solved = eval2BoneMid(hip, foot, 0.4, 0.39, pole);
    const u1 = vNorm(vSub(solved.mid, hip));
    const u2 = vNorm(vSub(foot, solved.mid));
    const bendCos = vDot(u1, u2);
    if (!raw.trapezeStrap && bendCos < 0.985) {
      const patella = vNorm(vSub(u1, u2));
      const dPelAnt = vDot(patella, pelAnt);
      const dAnt = vDot(patella, antN);
      const dUp = vDot(patella, pelUp);
      const dOut = vDot(patella, outward);
      const isProneCurl = pelAnt[2] < -0.45 && patella[2] < -0.05;
      if (!isProneCurl && dPelAnt < -0.55 && dAnt < -0.45 && dUp < 0.25 && dOut < 0.45) {
        const w = smoothstep(Math.max(0, Math.min(1, (-0.55 - dPelAnt) / 0.3)));
        const ventralPole = vNorm(vAdd(vMul(pelAnt, 0.86), vMul(outward, 0.24)));
        const blended = vNorm(vAdd(vMul(pole, 1 - w), vMul(ventralPole, w)));
        const fixedPole = stabilizeLimbPole(hip, foot, 0.4, 0.39, blended, fb, 0.042);
        if (side === 'L') lKneePole = fixedPole;
        else rKneePole = fixedPole;
      }
    }
  }

  // Ensure knees don't cross past each other when feet are uncrossed
  const lMid = eval2BoneMid(lHip, lFoot, 0.4, 0.39, lKneePole).mid;
  const rMid = eval2BoneMid(rHip, rFoot, 0.4, 0.39, rKneePole).mid;
  if (vDot(vSub(rFoot, lFoot), bodyRight) >= -0.02 && vDot(vSub(rMid, lMid), bodyRight) < -0.03) {
    lKneePole = stabilizeLimbPole(
      lHip,
      lFoot,
      0.4,
      0.39,
      vNorm(vAdd(lKneePole, vMul(bodyRight, -0.55))),
      lLegFallback,
      0.042,
    );
    rKneePole = stabilizeLimbPole(
      rHip,
      rFoot,
      0.4,
      0.39,
      vNorm(vAdd(rKneePole, vMul(bodyRight, 0.55))),
      rLegFallback,
      0.042,
    );
  }

  return {
    ...raw,
    pelvis,
    spineMid,
    chest,
    lFoot,
    rFoot,
    lKneePole,
    rKneePole,
    lHand,
    rHand,
    lElbowPole,
    rElbowPole,
  };
}

export function sampleUniversal3DExerciseRig(
  exercise: Pick<
    PilatesExercise,
    'id' | 'nameKo' | 'nameEn' | 'apparatus' | 'bodyPosition' | 'blockCategory' | 'box' | 'props'
  > & { readonly movementFamily?: string },
  rawT: number,
): Universal3DPoseRig {
  const clampedT = Math.max(0, Math.min(1, Number.isFinite(rawT) ? rawT : 0));

  const exp = Object.hasOwn(EXPANDED_DEDICATED_3D_RIGS, exercise.id)
    ? EXPANDED_DEDICATED_3D_RIGS[exercise.id]
    : undefined;
  if (
    exp &&
    exp.apparatus === exercise.apparatus &&
    (!exp.bodyPosition || exp.bodyPosition === exercise.bodyPosition)
  ) {
    const normalized = normalizeBiomechanicalPoseRig(
      exp.build(clampedT),
      exp.build(0),
      exp.build(1),
    );
    return {
      rigId: exercise.id,
      rigScope: 'dedicated-3d-rig',
      ...normalized,
    };
  }

  const cat = Object.hasOwn(CATALOG_AND_CRAWLED_ARCHETYPE_MAP, exercise.id)
    ? CATALOG_AND_CRAWLED_ARCHETYPE_MAP[exercise.id]
    : undefined;
  if (cat && cat.apparatus === exercise.apparatus && cat.bodyPosition === exercise.bodyPosition) {
    const delegatedExpanded = Object.hasOwn(EXPANDED_DEDICATED_3D_RIGS, cat.archetype)
      ? EXPANDED_DEDICATED_3D_RIGS[cat.archetype]
      : undefined;
    const evalFn = delegatedExpanded
      ? delegatedExpanded.build
      : (tVal: number) => sampleArchetype3DRig(cat.archetype, tVal, exercise);
    const built = normalizeBiomechanicalPoseRig(evalFn(clampedT), evalFn(0), evalFn(1));
    return {
      rigId: cat.archetype,
      rigScope: 'dedicated-3d-rig',
      ...built,
      withDumbbells: Boolean(built.withDumbbells || exercise.props.includes('dumbbell')),
      withTheraband: Boolean(built.withTheraband || exercise.props.includes('theraband')),
    };
  }

  const proceduralKey = selectProceduralArchetype(exercise);
  const delegatedExpanded = Object.hasOwn(EXPANDED_DEDICATED_3D_RIGS, proceduralKey)
    ? EXPANDED_DEDICATED_3D_RIGS[proceduralKey]
    : undefined;
  const evalProc = delegatedExpanded
    ? delegatedExpanded.build
    : (tVal: number) => sampleArchetype3DRig(proceduralKey, tVal, exercise);
  const built = normalizeBiomechanicalPoseRig(evalProc(clampedT), evalProc(0), evalProc(1));
  return {
    rigId: `procedural:${exercise.apparatus}:${exercise.bodyPosition}:${proceduralKey}`,
    rigScope: 'procedural-3d-synthesis',
    ...built,
    withDumbbells: Boolean(built.withDumbbells || exercise.props.includes('dumbbell')),
    withTheraband: Boolean(built.withTheraband || exercise.props.includes('theraband')),
  };
}

export const PHASE_3D_RAW_T: Readonly<Record<'start' | 'middle' | 'end', number>> = Object.freeze({
  start: 0,
  middle: 1,
  end: 0.42,
});

export const DEDICATED_3D_EXERCISE_IDS: readonly string[] = Object.freeze([
  ...Object.keys(CATALOG_AND_CRAWLED_ARCHETYPE_MAP),
  ...Object.keys(EXPANDED_DEDICATED_3D_RIGS),
]);
