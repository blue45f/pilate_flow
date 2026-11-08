/**
 * SPDX-License-Identifier: CC0-1.0 OR MIT
 * Original clean-room 3D-to-2D axial rotation projection model for Pilates mat rotation movements:
 * - Saw (`rotation-mat-saw`)
 * - Spine Twist (`rotation-mat-spine-twist`)
 * - Criss-Cross (`rotation-mat-criss-cross`)
 *
 * Truthfulness disclosure:
 * `anatomicalAccuracyAssumed: false`, `professionalReviewCount: 0`, `sourceFrameMappings: 0`.
 * No external images, video frames, or motion-capture data were copied or traced.
 */

import sourceFacts from '../data/rotationSourceFacts.json';
import type { Point2D, RigJointMap, VisualPhaseId } from '../data/movementVisualRigCatalog';
import type { AnatomicalSide, DraftPhase, PhaseId, Point3, ScreenPoint } from './types';

export const ROTATION_MOVEMENT_IDS = [
  'rotation-mat-saw',
  'rotation-mat-spine-twist',
  'rotation-mat-criss-cross',
] as const;

export type RotationMovementId = (typeof ROTATION_MOVEMENT_IDS)[number];

export type RotationCatalogAliasId =
  | RotationMovementId
  | 'seated-rotation'
  | 'original-mat-spine-twist'
  | 'ex-rotation-01'
  | 'original-mat-saw'
  | 'ex-rotation-02'
  | 'original-mat-criss-cross'
  | 'ex-rotation-03';

export const ROTATION_MODEL_VERSION = 'rotation-axial-projection-v2' as const;

export interface RotationDraftPhase extends DraftPhase {
  readonly id: PhaseId;
  readonly label: string;
  readonly labelKo: string;
  readonly displayBehavior: 'hold' | 'move';
  readonly visualPhaseId: VisualPhaseId;
}

export const ROTATION_PHASES: Readonly<Record<RotationMovementId, readonly RotationDraftPhase[]>> =
  Object.freeze({
    'rotation-mat-saw': Object.freeze([
      Object.freeze({
        id: 'setup',
        label: 'V-싯 양측 좌골 수직 고정 및 T-암 세팅',
        labelKo: 'V-싯 양측 좌골 수직 고정 및 T-암 세팅',
        start: 0,
        end: 0.15,
        sample: 0,
        displayBehavior: 'hold',
        visualPhaseId: 'start',
      }),
      Object.freeze({
        id: 'move',
        label: '정수리 축 신장 후 흉추 축회전 선행',
        labelKo: '정수리 축 신장 후 흉추 축회전 선행',
        start: 0.15,
        end: 0.42,
        sample: 0.28,
        displayBehavior: 'move',
        visualPhaseId: 'middle',
      }),
      Object.freeze({
        id: 'turn',
        label: '반대쪽 엉덩이 지지 · 반대 발 방향 대각 리치',
        labelKo: '반대쪽 엉덩이 지지 · 반대 발 방향 대각 리치',
        start: 0.42,
        end: 0.6,
        sample: 0.5,
        displayBehavior: 'hold',
        visualPhaseId: 'middle',
      }),
      Object.freeze({
        id: 'return',
        label: '회전 유지한 채 척추 수직 재적층(Restack) 후 정면 복귀',
        labelKo: '회전 유지한 채 척추 수직 재적층(Restack) 후 정면 복귀',
        start: 0.6,
        end: 0.88,
        sample: 0.78,
        displayBehavior: 'move',
        visualPhaseId: 'end',
      }),
      Object.freeze({
        id: 'finish',
        label: '정면 T-암 장좌 V-싯 정렬 복귀',
        labelKo: '정면 T-암 장좌 V-싯 정렬 복귀',
        start: 0.88,
        end: 1,
        sample: 1,
        displayBehavior: 'hold',
        visualPhaseId: 'end',
      }),
    ]),
    'rotation-mat-spine-twist': Object.freeze([
      Object.freeze({
        id: 'setup',
        label: '두 다리 밀착 장좌 · 발목 배측굴곡 및 좌골 수직 기둥 세팅',
        labelKo: '두 다리 밀착 장좌 · 발목 배측굴곡 및 좌골 수직 기둥 세팅',
        start: 0,
        end: 0.15,
        sample: 0,
        displayBehavior: 'hold',
        visualPhaseId: 'start',
      }),
      Object.freeze({
        id: 'move',
        label: '관상면 T-암 고정 · 정수리-천골 수직 축 순수 흉추 회전',
        labelKo: '관상면 T-암 고정 · 정수리-천골 수직 축 순수 흉추 회전',
        start: 0.15,
        end: 0.42,
        sample: 0.28,
        displayBehavior: 'move',
        visualPhaseId: 'middle',
      }),
      Object.freeze({
        id: 'turn',
        label: '양 뒤꿈치·좌골 무변위 고정 · 흉곽 회전 정점 및 흉골 연동 시선',
        labelKo: '양 뒤꿈치·좌골 무변위 고정 · 흉곽 회전 정점 및 흉골 연동 시선',
        start: 0.42,
        end: 0.6,
        sample: 0.5,
        displayBehavior: 'hold',
        visualPhaseId: 'middle',
      }),
      Object.freeze({
        id: 'return',
        label: '정수리 축 신장 유지하며 하부 늑골부터 중앙 복귀',
        labelKo: '정수리 축 신장 유지하며 하부 늑골부터 중앙 복귀',
        start: 0.6,
        end: 0.88,
        sample: 0.78,
        displayBehavior: 'move',
        visualPhaseId: 'end',
      }),
      Object.freeze({
        id: 'finish',
        label: '정면 장좌 T-암 수직 정렬 복귀',
        labelKo: '정면 장좌 T-암 수직 정렬 복귀',
        start: 0.88,
        end: 1,
        sample: 1,
        displayBehavior: 'hold',
        visualPhaseId: 'end',
      }),
    ]),
    'rotation-mat-criss-cross': Object.freeze([
      Object.freeze({
        id: 'setup',
        label: '수파인 상부 흉추 컬업 · 후두부 손 지지 및 양 팔꿈치 광폭 오픈',
        labelKo: '수파인 상부 흉추 컬업 · 후두부 손 지지 및 양 팔꿈치 광폭 오픈',
        start: 0,
        end: 0.15,
        sample: 0,
        displayBehavior: 'hold',
        visualPhaseId: 'start',
      }),
      Object.freeze({
        id: 'move',
        label: '골반 지지 · 몸통을 반대 무릎 쪽으로 회전',
        labelKo: '골반 지지 · 몸통을 반대 무릎 쪽으로 회전',
        start: 0.15,
        end: 0.42,
        sample: 0.28,
        displayBehavior: 'move',
        visualPhaseId: 'middle',
      }),
      Object.freeze({
        id: 'turn',
        label: '팔꿈치를 당기지 않고 몸통 회전 · 반대 다리 뻗기',
        labelKo: '팔꿈치를 당기지 않고 몸통 회전 · 반대 다리 뻗기',
        start: 0.42,
        end: 0.6,
        sample: 0.5,
        displayBehavior: 'hold',
        visualPhaseId: 'middle',
      }),
      Object.freeze({
        id: 'return',
        label: '견갑 하각 컬업 높이 유지하며 중앙 교차 전환',
        labelKo: '견갑 하각 컬업 높이 유지하며 중앙 교차 전환',
        start: 0.6,
        end: 0.88,
        sample: 0.78,
        displayBehavior: 'move',
        visualPhaseId: 'end',
      }),
      Object.freeze({
        id: 'finish',
        label: '수파인 컬업 중앙 정렬 복귀',
        labelKo: '수파인 컬업 중앙 정렬 복귀',
        start: 0.88,
        end: 1,
        sample: 1,
        displayBehavior: 'hold',
        visualPhaseId: 'end',
      }),
    ]),
  });

export interface RotationPoseOptions {
  readonly activeSide?: AnatomicalSide;
  readonly mirrored?: boolean;
}

export interface RotationWorldLandmarks {
  readonly head: Point3;
  readonly neck: Point3;
  readonly thoracic: Point3;
  readonly lumbar: Point3;
  readonly pelvis: Point3;
  readonly leftSitBone: Point3;
  readonly rightSitBone: Point3;
  readonly leftShoulder: Point3;
  readonly rightShoulder: Point3;
  readonly leftElbow: Point3;
  readonly rightElbow: Point3;
  readonly leftWrist: Point3;
  readonly rightWrist: Point3;
  readonly leftHand: Point3;
  readonly rightHand: Point3;
  readonly leftHip: Point3;
  readonly rightHip: Point3;
  readonly leftKnee: Point3;
  readonly rightKnee: Point3;
  readonly leftAnkle: Point3;
  readonly rightAnkle: Point3;
  readonly leftHeel: Point3;
  readonly rightHeel: Point3;
  readonly leftToe: Point3;
  readonly rightToe: Point3;
  readonly gazeOrigin: Point3;
  readonly gazeTarget: Point3;
  readonly rotationAxisStart: Point3;
  readonly rotationAxisEnd: Point3;
}

export interface RotationKinematicTelemetry {
  readonly movementId: RotationMovementId;
  readonly phaseId: PhaseId;
  readonly visualPhaseId: VisualPhaseId;
  readonly progress: number;
  readonly yawDeg: number;
  readonly flexionPitchDeg: number;
  readonly pelvisShiftMm: 0;
  readonly sitBoneLiftMm: 0;
  readonly heelAlignmentDeltaMm: number;
  readonly leftHeelX: number;
  readonly rightHeelX: number;
  readonly restShoulderSpan: number;
  readonly shoulderSpan2D: number;
  readonly foreshorteningRatio: number;
  readonly coronalArmLockDeg: number;
  readonly independentArmSwingDeg: 0;
  readonly elbowSpanDeg: number;
  readonly curlHeightMm: number;
  readonly extendedLegAngleDeg: number;
  readonly tabletopKneeAngleDeg: number;
  readonly gazeSternumCouplingDeg: 0;
}

export interface RotationIndicatorLayerSpec {
  readonly rotationAxis: {
    readonly kind: 'vertical-plumb-axis' | 'twist-then-hinge-axis' | 'supine-oblique-curl-axis';
    readonly from: Point2D;
    readonly to: Point2D;
    readonly yawDeg: number;
    readonly labelKo: string;
  };
  readonly pelvisAnchor: {
    readonly kind: 'sit-bone-heels-lock' | 'v-sit-opposite-sitbone-lock' | 'supine-sacrum-level-lock';
    readonly leftAnchor: Point2D;
    readonly rightAnchor: Point2D;
    readonly heelAnchor: Point2D;
    readonly pelvisShiftMm: 0;
    readonly labelKo: string;
  };
  readonly gazeVector: {
    readonly from: Point2D;
    readonly to: Point2D;
    readonly coupledToSternum: true;
    readonly labelKo: string;
  };
  readonly ribcageScapula: {
    readonly nearShoulder: Point2D;
    readonly farShoulder: Point2D;
    readonly thoracicCenter: Point2D;
    readonly shoulderSpan2D: number;
    readonly restShoulderSpan: number;
    readonly labelKo: string;
  };
  readonly transitionPose: {
    readonly trajectoryPoints: readonly Point2D[];
    readonly noteKo: string;
  };
}

export interface RotationDraftPose {
  readonly movementId: RotationMovementId;
  readonly modelVersion: typeof ROTATION_MODEL_VERSION;
  readonly progress: number;
  readonly phase: RotationDraftPhase;
  readonly visualPhaseId: VisualPhaseId;
  readonly activeSide: AnatomicalSide;
  readonly mirrored: boolean;
  readonly world: RotationWorldLandmarks;
  readonly screen: Readonly<Record<keyof RotationWorldLandmarks, ScreenPoint>>;
  readonly joints2D: RigJointMap;
  readonly telemetry: RotationKinematicTelemetry;
  readonly indicators: RotationIndicatorLayerSpec;
  readonly provenance: {
    readonly anatomicalAccuracyAssumed: false;
    readonly professionalReviewStatus: 'unreviewed';
    readonly professionalReviewCount: 0;
    readonly sourceFrameMappings: 0;
    readonly sourceMediaCopiedOrTraced: false;
    readonly license: 'CC0-1.0 OR MIT';
    readonly sources: typeof sourceFacts.sources;
  };
}

const ALIAS_TO_ROTATION_ID: Readonly<Record<string, RotationMovementId>> = Object.freeze({
  'rotation-mat-saw': 'rotation-mat-saw',
  'original-mat-saw': 'rotation-mat-saw',
  'ex-rotation-02': 'rotation-mat-saw',

  'rotation-mat-spine-twist': 'rotation-mat-spine-twist',
  'seated-rotation': 'rotation-mat-spine-twist',
  'original-mat-spine-twist': 'rotation-mat-spine-twist',
  'ex-rotation-01': 'rotation-mat-spine-twist',

  'rotation-mat-criss-cross': 'rotation-mat-criss-cross',
  'original-mat-criss-cross': 'rotation-mat-criss-cross',
  'ex-rotation-03': 'rotation-mat-criss-cross',
});

export function resolveRotationMovementId(
  movementOrExerciseId: string | null | undefined,
): RotationMovementId | null {
  if (!movementOrExerciseId) return null;
  return ALIAS_TO_ROTATION_ID[movementOrExerciseId] ?? null;
}

const clamp01 = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
};

const degToRad = (deg: number): number => (deg * Math.PI) / 180;
const round2 = (value: number): number => Math.round(value * 100) / 100;

function smoothstep(t: number): number {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
}

/**
 * Continuous envelope over progress in [0, 1]:
 * - 0.00..0.15: setup hold (0)
 * - 0.15..0.42: smooth ramp to peak (0 -> 1)
 * - 0.42..0.60: peak turn hold (1)
 * - 0.60..0.88: controlled return / restack transition (1 -> 0)
 * - 0.88..1.00: finish hold (0)
 */
function rotationEnvelope(progress: number): {
  readonly twistAmount: number;
  readonly flexionAmount: number;
  readonly elongationBoostMm: number;
} {
  const p = clamp01(progress);
  if (p <= 0.15 || p >= 0.88) {
    return { twistAmount: 0, flexionAmount: 0, elongationBoostMm: 0 };
  }
  if (p < 0.42) {
    const u = smoothstep((p - 0.15) / 0.27);
    const flexU = smoothstep(Math.max(0, (p - 0.22) / 0.2));
    return { twistAmount: u, flexionAmount: flexU, elongationBoostMm: round2(4 * Math.sin(u * Math.PI)) };
  }
  if (p <= 0.6) {
    return { twistAmount: 1, flexionAmount: 1, elongationBoostMm: 3 };
  }
  // Return phase [0.60, 0.88]: in Saw, spine restacks (flexion unbends first while rotation unwinds smoothly)
  const ret = (p - 0.6) / 0.28;
  const twistAmount = 1 - smoothstep(ret);
  const flexionAmount = 1 - smoothstep(Math.min(1, ret * 1.45));
  return {
    twistAmount: round2(twistAmount),
    flexionAmount: round2(flexionAmount),
    elongationBoostMm: round2(4 * (1 - ret)),
  };
}

/**
 * Orthographic 3D-to-2D projection into the 320x200 SVG coordinate space.
 * - `point[0]`: horizontal axis (left-to-right on canvas, in px)
 * - `point[1]`: coronal/transverse depth axis (perpendicular to screen plane; foreshortens by 0.22 vertical skew)
 * - `point[2]`: vertical height above floor baseline (y = 176 - z + 0.22 * y)
 *
 * Because bilateral shoulders lie at `x = centerX +/- W * cos(yaw)` and `y = +/- W * sin(yaw)`,
 * their 2D projected span `shoulderSpan2D = 2 * W * sqrt(cos^2(yaw) + 0.22^2 * sin^2(yaw))`
 * strictly decreases (`shoulderSpan2D < restShoulderSpan`) whenever `|yawDeg| > 0`.
 */
export function projectRotationPoint(
  point: Point3,
  options: boolean | { readonly mirrored?: boolean; readonly viewportWidth?: number } = false,
): ScreenPoint {
  const mirrored = typeof options === 'boolean' ? options : Boolean(options.mirrored);
  const width =
    typeof options === 'object' && options !== null && options.viewportWidth
      ? options.viewportWidth
      : 320;
  const rawX = point[0];
  const depthY = point[1];
  const heightZ = point[2];
  const screenX = mirrored ? width - rawX : rawX;
  const screenY = 176 - heightZ + depthY * 0.22;
  return Object.freeze([round2(screenX), round2(screenY)] as const);
}

function toPoint2D(screen: ScreenPoint): Point2D {
  return Object.freeze({
    x: Math.round(Math.min(304, Math.max(16, screen[0]))),
    y: Math.round(Math.min(184, Math.max(16, screen[1]))),
  });
}

function pickPhase(movementId: RotationMovementId, progress: number): RotationDraftPhase {
  const phases = ROTATION_PHASES[movementId];
  const p = clamp01(progress);
  for (const phase of phases) {
    if (p >= phase.start && p <= phase.end) {
      return phase;
    }
  }
  return phases[phases.length - 1];
}

function buildSpineTwistWorld(
  progress: number,
  activeSide: AnatomicalSide,
): {
  readonly world: RotationWorldLandmarks;
  readonly yawDeg: number;
  readonly flexionPitchDeg: number;
  readonly coronalArmLockDeg: number;
  readonly elbowSpanDeg: number;
  readonly curlHeightMm: number;
  readonly extendedLegAngleDeg: number;
  readonly tabletopKneeAngleDeg: number;
} {
  const { twistAmount, elongationBoostMm } = rotationEnvelope(progress);
  const sign = activeSide === 'right' ? 1 : -1;
  const yawDeg = round2(45 * twistAmount);
  const yawRad = degToRad(yawDeg * sign);
  const cosYaw = Math.cos(yawRad);
  const sinYaw = Math.sin(yawRad);

  // Stationary pelvis and long-sitting legs pressed together with dorsiflexed ankles
  const pelvisX = 128;
  const sitBoneZ = 30;
  const pelvis: Point3 = [pelvisX, 0, sitBoneZ];
  const leftSitBone: Point3 = [pelvisX - 8, -10, sitBoneZ];
  const rightSitBone: Point3 = [pelvisX + 8, 10, sitBoneZ];

  // Both legs pressed together along mat, equal heel X (238)
  const leftHip: Point3 = [pelvisX + 4, -6, sitBoneZ];
  const rightHip: Point3 = [pelvisX + 4, 6, sitBoneZ];
  const leftKnee: Point3 = [184, -6, 30];
  const rightKnee: Point3 = [184, 6, 30];
  const leftAnkle: Point3 = [234, -6, 31];
  const rightAnkle: Point3 = [234, 6, 31];
  const leftHeel: Point3 = [238, -6, 26];
  const rightHeel: Point3 = [238, 6, 26];
  const leftToe: Point3 = [240, -6, 48];
  const rightToe: Point3 = [240, 6, 48];

  // Pure vertical axis from pelvis (x=128) through crown (x=128)
  const lumbar: Point3 = [pelvisX, 0, 56];
  const thoracicZ = round2(86 + elongationBoostMm * 0.5);
  const thoracic: Point3 = [pelvisX, 0, thoracicZ];
  const neck: Point3 = [pelvisX, 0, round2(114 + elongationBoostMm * 0.8)];
  const head: Point3 = [pelvisX, 0, round2(134 + elongationBoostMm)];

  // Bilateral shoulders in ribcage coronal plane: half-width W = 26
  const shoulderHalfWidth = 26;
  const shoulderZ = round2(104 + elongationBoostMm * 0.6);
  const leftShoulder: Point3 = [
    round2(pelvisX - shoulderHalfWidth * cosYaw),
    round2(-shoulderHalfWidth * sinYaw),
    shoulderZ,
  ];
  const rightShoulder: Point3 = [
    round2(pelvisX + shoulderHalfWidth * cosYaw),
    round2(shoulderHalfWidth * sinYaw),
    shoulderZ,
  ];

  // T-arms locked 180 deg in coronal plane of ribcage (no independent shoulder swing)
  const elbowSpanRadius = 54;
  const wristSpanRadius = 78;
  const handSpanRadius = 88;
  const leftElbow: Point3 = [
    round2(pelvisX - elbowSpanRadius * cosYaw),
    round2(-elbowSpanRadius * sinYaw),
    shoulderZ,
  ];
  const rightElbow: Point3 = [
    round2(pelvisX + elbowSpanRadius * cosYaw),
    round2(elbowSpanRadius * sinYaw),
    shoulderZ,
  ];
  const leftWrist: Point3 = [
    round2(pelvisX - wristSpanRadius * cosYaw),
    round2(-wristSpanRadius * sinYaw),
    shoulderZ,
  ];
  const rightWrist: Point3 = [
    round2(pelvisX + wristSpanRadius * cosYaw),
    round2(wristSpanRadius * sinYaw),
    shoulderZ,
  ];
  const leftHand: Point3 = [
    round2(pelvisX - handSpanRadius * cosYaw),
    round2(-handSpanRadius * sinYaw),
    shoulderZ,
  ];
  const rightHand: Point3 = [
    round2(pelvisX + handSpanRadius * cosYaw),
    round2(handSpanRadius * sinYaw),
    shoulderZ,
  ];

  // Gaze coupled to sternum normal vector
  const gazeOrigin: Point3 = [head[0], head[1], head[2]];
  const gazeTarget: Point3 = [
    round2(pelvisX + 44 * sinYaw),
    round2(44 * cosYaw),
    head[2],
  ];

  const rotationAxisStart: Point3 = [pelvisX, 0, 18];
  const rotationAxisEnd: Point3 = [pelvisX, 0, 154];

  return {
    world: Object.freeze({
      head,
      neck,
      thoracic,
      lumbar,
      pelvis,
      leftSitBone,
      rightSitBone,
      leftShoulder,
      rightShoulder,
      leftElbow,
      rightElbow,
      leftWrist,
      rightWrist,
      leftHand,
      rightHand,
      leftHip,
      rightHip,
      leftKnee,
      rightKnee,
      leftAnkle,
      rightAnkle,
      leftHeel,
      rightHeel,
      leftToe,
      rightToe,
      gazeOrigin,
      gazeTarget,
      rotationAxisStart,
      rotationAxisEnd,
    }),
    yawDeg,
    flexionPitchDeg: 0,
    coronalArmLockDeg: 180,
    elbowSpanDeg: 180,
    curlHeightMm: 0,
    extendedLegAngleDeg: 0,
    tabletopKneeAngleDeg: 0,
  };
}

function buildSawWorld(
  progress: number,
  activeSide: AnatomicalSide,
): {
  readonly world: RotationWorldLandmarks;
  readonly yawDeg: number;
  readonly flexionPitchDeg: number;
  readonly coronalArmLockDeg: number;
  readonly elbowSpanDeg: number;
  readonly curlHeightMm: number;
  readonly extendedLegAngleDeg: number;
  readonly tabletopKneeAngleDeg: number;
} {
  const { twistAmount, flexionAmount, elongationBoostMm } = rotationEnvelope(progress);
  const sign = activeSide === 'right' ? 1 : -1;
  const yawDeg = round2(42 * twistAmount);
  const flexionPitchDeg = round2(34 * flexionAmount);
  const yawRad = degToRad(yawDeg * sign);
  const cosYaw = Math.cos(yawRad);
  const sinYaw = Math.sin(yawRad);

  // Stationary wide V-sit pelvis anchor (opposite sit-bone 100% grounded, pelvisShiftMm === 0)
  const pelvisX = 122;
  const sitBoneZ = 30;
  const pelvis: Point3 = [pelvisX, 0, sitBoneZ];
  const leftSitBone: Point3 = [pelvisX - 10, -14, sitBoneZ];
  const rightSitBone: Point3 = [pelvisX + 10, 14, sitBoneZ];

  // Wide V-sit legs spread apart on mat
  const leftHip: Point3 = [pelvisX + 4, -14, sitBoneZ];
  const rightHip: Point3 = [pelvisX + 4, 14, sitBoneZ];
  const leftKnee: Point3 = [178, -28, 32];
  const rightKnee: Point3 = [186, 28, 28];
  const leftAnkle: Point3 = [228, -42, 34];
  const rightAnkle: Point3 = [242, 42, 26];
  const leftHeel: Point3 = [232, -42, 29];
  const rightHeel: Point3 = [246, 42, 22];
  const leftToe: Point3 = [236, -44, 50];
  const rightToe: Point3 = [252, 44, 42];

  // Spine rotates axially first, then hinges/articulates forward toward opposite foot
  const forwardReachX = round2(36 * flexionAmount);
  const forwardDropZ = round2(26 * flexionAmount);

  const lumbar: Point3 = [round2(pelvisX + forwardReachX * 0.28), 0, round2(56 - forwardDropZ * 0.2)];
  const thoracic: Point3 = [
    round2(pelvisX + forwardReachX * 0.65),
    0,
    round2(86 + elongationBoostMm * 0.4 - forwardDropZ * 0.55),
  ];
  const neck: Point3 = [
    round2(pelvisX + forwardReachX * 0.9),
    0,
    round2(114 + elongationBoostMm * 0.6 - forwardDropZ * 0.85),
  ];
  const head: Point3 = [
    round2(pelvisX + forwardReachX * 1.1),
    0,
    round2(134 + elongationBoostMm - forwardDropZ * 1.05),
  ];

  // Bilateral shoulders foreshorten in 2D by cos(yaw) around thoracic center
  const shoulderHalfWidth = 26;
  const shoulderZ = round2(104 + elongationBoostMm * 0.5 - forwardDropZ * 0.7);
  const shoulderCenterX = round2(pelvisX + forwardReachX * 0.78);
  const leftShoulder: Point3 = [
    round2(shoulderCenterX - shoulderHalfWidth * cosYaw),
    round2(-shoulderHalfWidth * sinYaw),
    shoulderZ,
  ];
  const rightShoulder: Point3 = [
    round2(shoulderCenterX + shoulderHalfWidth * cosYaw),
    round2(shoulderHalfWidth * sinYaw),
    shoulderZ,
  ];

  // Front arm slices pinky past opposite little toe (x=256, z=38); rear arm reaches back in internal rotation (x=54, z=118)
  const leftElbow: Point3 = [
    round2((1 - flexionAmount) * (shoulderCenterX - 52 * cosYaw) + flexionAmount * 76),
    round2(-50 * sinYaw),
    round2(shoulderZ + 8 * flexionAmount),
  ];
  const leftWrist: Point3 = [
    round2((1 - flexionAmount) * (shoulderCenterX - 76 * cosYaw) + flexionAmount * 58),
    round2(-68 * sinYaw),
    round2(shoulderZ + 14 * flexionAmount),
  ];
  const leftHand: Point3 = [
    round2((1 - flexionAmount) * (shoulderCenterX - 86 * cosYaw) + flexionAmount * 48),
    round2(-76 * sinYaw),
    round2(shoulderZ + 18 * flexionAmount),
  ];

  const rightElbow: Point3 = [
    round2((1 - flexionAmount) * (shoulderCenterX + 52 * cosYaw) + flexionAmount * 198),
    round2(50 * sinYaw),
    round2(shoulderZ - 26 * flexionAmount),
  ];
  const rightWrist: Point3 = [
    round2((1 - flexionAmount) * (shoulderCenterX + 76 * cosYaw) + flexionAmount * 240),
    round2(68 * sinYaw),
    round2(shoulderZ - 48 * flexionAmount),
  ];
  const rightHand: Point3 = [
    round2((1 - flexionAmount) * (shoulderCenterX + 86 * cosYaw) + flexionAmount * 258),
    round2(76 * sinYaw),
    round2(shoulderZ - 58 * flexionAmount),
  ];

  const gazeOrigin: Point3 = [head[0], head[1], head[2]];
  const gazeTarget: Point3 = [
    round2(head[0] + 38 * sinYaw - 18 * flexionAmount),
    round2(38 * cosYaw),
    round2(head[2] - 32 * flexionAmount),
  ];

  const rotationAxisStart: Point3 = [pelvisX, 0, 18];
  const rotationAxisEnd: Point3 = [round2(pelvisX + forwardReachX * 0.7), 0, round2(152 - forwardDropZ * 0.5)];

  return {
    world: Object.freeze({
      head,
      neck,
      thoracic,
      lumbar,
      pelvis,
      leftSitBone,
      rightSitBone,
      leftShoulder,
      rightShoulder,
      leftElbow,
      rightElbow,
      leftWrist,
      rightWrist,
      leftHand,
      rightHand,
      leftHip,
      rightHip,
      leftKnee,
      rightKnee,
      leftAnkle,
      rightAnkle,
      leftHeel,
      rightHeel,
      leftToe,
      rightToe,
      gazeOrigin,
      gazeTarget,
      rotationAxisStart,
      rotationAxisEnd,
    }),
    yawDeg,
    flexionPitchDeg,
    coronalArmLockDeg: round2(180 - 8 * flexionAmount),
    elbowSpanDeg: round2(180 - 6 * flexionAmount),
    curlHeightMm: 0,
    extendedLegAngleDeg: 0,
    tabletopKneeAngleDeg: 0,
  };
}

function buildCrissCrossWorld(
  progress: number,
  activeSide: AnatomicalSide,
): {
  readonly world: RotationWorldLandmarks;
  readonly yawDeg: number;
  readonly flexionPitchDeg: number;
  readonly coronalArmLockDeg: number;
  readonly elbowSpanDeg: number;
  readonly curlHeightMm: number;
  readonly extendedLegAngleDeg: number;
  readonly tabletopKneeAngleDeg: number;
} {
  const { twistAmount } = rotationEnvelope(progress);
  const sign = activeSide === 'right' ? 1 : -1;
  const yawDeg = round2(40 * twistAmount);
  const yawRad = degToRad(yawDeg * sign);
  const cosYaw = Math.cos(yawRad);
  const sinYaw = Math.sin(yawRad);

  // Supine level pelvis & imprinted lumbar spine on mat (pelvisShiftMm === 0)
  const pelvisX = 176;
  const matZ = 28;
  const pelvis: Point3 = [pelvisX, 0, matZ];
  const leftSitBone: Point3 = [pelvisX - 8, -12, matZ];
  const rightSitBone: Point3 = [pelvisX + 8, 12, matZ];
  const lumbar: Point3 = [148, 0, matZ + 2];

  // Upper thoracic curl maintained throughout (scapular inferior angles off mat)
  const curlHeightMm = round2(68 + 6 * twistAmount);
  const thoracic: Point3 = [118, 0, round2(42 + 6 * twistAmount)];
  const neck: Point3 = [96, 0, round2(60 + 6 * twistAmount)];
  const head: Point3 = [78, 0, round2(74 + 6 * twistAmount)];

  // Bilateral shoulders in upper thoracic curl; foreshortens in 2D by cos(yaw) as ribcage twists
  const shoulderHalfWidth = 24;
  const shoulderCenterX = 104;
  const shoulderZ = round2(54 + 6 * twistAmount);
  const leftShoulder: Point3 = [
    round2(shoulderCenterX - shoulderHalfWidth * cosYaw),
    round2(-shoulderHalfWidth * sinYaw),
    round2(shoulderZ + 5 * twistAmount),
  ];
  const rightShoulder: Point3 = [
    round2(shoulderCenterX + shoulderHalfWidth * cosYaw),
    round2(shoulderHalfWidth * sinYaw),
    round2(shoulderZ - 3 * twistAmount),
  ];

  // Hands behind occiput with wide elbows (168..172 deg span; armpit leads, not pulled elbow)
  const elbowHalfSpan = 38;
  const leftElbow: Point3 = [
    round2(head[0] - elbowHalfSpan * cosYaw + 10 * twistAmount),
    round2(-elbowHalfSpan * sinYaw),
    round2(head[2] + 8 * twistAmount),
  ];
  const rightElbow: Point3 = [
    round2(head[0] + elbowHalfSpan * cosYaw + 6 * twistAmount),
    round2(elbowHalfSpan * sinYaw),
    round2(head[2] - 10 * twistAmount),
  ];
  const leftWrist: Point3 = [round2(head[0] - 8 * cosYaw), round2(-8 * sinYaw), head[2]];
  const rightWrist: Point3 = [round2(head[0] + 8 * cosYaw), round2(8 * sinYaw), head[2]];
  const leftHand: Point3 = [round2(head[0] - 4 * cosYaw), round2(-4 * sinYaw), head[2]];
  const rightHand: Point3 = [round2(head[0] + 4 * cosYaw), round2(4 * sinYaw), head[2]];

  // Legs: opposite knee in 90/90 tabletop while other leg extends to 45 deg diagonal
  const leftHip: Point3 = [pelvisX + 6, -10, matZ + 2];
  const rightHip: Point3 = [pelvisX + 6, 10, matZ + 2];

  // Right knee pulls into 90 deg tabletop; Left leg extends to 45 deg diagonal as twistAmount -> 1
  const rightKnee: Point3 = [round2(182 - 8 * twistAmount), 10, round2(78 + 4 * twistAmount)];
  const rightAnkle: Point3 = [round2(226 - 6 * twistAmount), 10, round2(78 + 4 * twistAmount)];
  const rightHeel: Point3 = [round2(222 - 6 * twistAmount), 10, round2(74 + 4 * twistAmount)];
  const rightToe: Point3 = [round2(238 - 6 * twistAmount), 10, round2(80 + 4 * twistAmount)];

  const leftKnee: Point3 = [
    round2(184 + 38 * twistAmount),
    -10,
    round2(78 + 10 * twistAmount),
  ];
  const leftAnkle: Point3 = [
    round2(228 + 38 * twistAmount),
    -10,
    round2(78 + 36 * twistAmount),
  ];
  const leftHeel: Point3 = [
    round2(224 + 38 * twistAmount),
    -10,
    round2(74 + 34 * twistAmount),
  ];
  const leftToe: Point3 = [
    round2(240 + 42 * twistAmount),
    -10,
    round2(80 + 40 * twistAmount),
  ];

  const gazeOrigin: Point3 = [head[0], head[1], head[2]];
  const gazeTarget: Point3 = [
    round2(rightKnee[0] + 12 * twistAmount),
    round2(18 * sinYaw),
    round2(rightKnee[2] - 8 * twistAmount),
  ];

  const rotationAxisStart: Point3 = [pelvisX, 0, matZ];
  const rotationAxisEnd: Point3 = [round2(92 + 18 * twistAmount), 0, round2(78 + 8 * twistAmount)];

  return {
    world: Object.freeze({
      head,
      neck,
      thoracic,
      lumbar,
      pelvis,
      leftSitBone,
      rightSitBone,
      leftShoulder,
      rightShoulder,
      leftElbow,
      rightElbow,
      leftWrist,
      rightWrist,
      leftHand,
      rightHand,
      leftHip,
      rightHip,
      leftKnee,
      rightKnee,
      leftAnkle,
      rightAnkle,
      leftHeel,
      rightHeel,
      leftToe,
      rightToe,
      gazeOrigin,
      gazeTarget,
      rotationAxisStart,
      rotationAxisEnd,
    }),
    yawDeg,
    flexionPitchDeg: round2(32 + 4 * twistAmount),
    coronalArmLockDeg: round2(172 - 4 * twistAmount),
    elbowSpanDeg: round2(172 - 4 * twistAmount),
    curlHeightMm,
    extendedLegAngleDeg: 45,
    tabletopKneeAngleDeg: 90,
  };
}

function buildWorldForMovement(
  movementId: RotationMovementId,
  progress: number,
  activeSide: AnatomicalSide,
) {
  switch (movementId) {
    case 'rotation-mat-spine-twist':
      return buildSpineTwistWorld(progress, activeSide);
    case 'rotation-mat-saw':
      return buildSawWorld(progress, activeSide);
    case 'rotation-mat-criss-cross':
      return buildCrissCrossWorld(progress, activeSide);
  }
}

function computeRestShoulderSpan2D(
  movementId: RotationMovementId,
  activeSide: AnatomicalSide,
  mirrored: boolean,
): number {
  const restWorld = buildWorldForMovement(movementId, 0, activeSide).world;
  const left2D = projectRotationPoint(restWorld.leftShoulder, mirrored);
  const right2D = projectRotationPoint(restWorld.rightShoulder, mirrored);
  return round2(Math.hypot(right2D[0] - left2D[0], right2D[1] - left2D[1]));
}

export function getRotationDraftPose(
  movementOrAliasId: RotationCatalogAliasId | string,
  progressInput = 0.5,
  options: RotationPoseOptions = {},
): RotationDraftPose {
  const movementId = resolveRotationMovementId(movementOrAliasId) ?? 'rotation-mat-spine-twist';
  const progress = clamp01(progressInput);
  const activeSide: AnatomicalSide = options.activeSide ?? 'right';
  const mirrored = Boolean(options.mirrored);
  const phase = pickPhase(movementId, progress);

  const built = buildWorldForMovement(movementId, progress, activeSide);
  const { world } = built;

  const screenEntries = (Object.keys(world) as (keyof RotationWorldLandmarks)[]).map((key) => [
    key,
    projectRotationPoint(world[key], mirrored),
  ]);
  const screen = Object.freeze(
    Object.fromEntries(screenEntries) as Record<keyof RotationWorldLandmarks, ScreenPoint>,
  );

  const restShoulderSpan = computeRestShoulderSpan2D(movementId, activeSide, mirrored);
  const shoulderSpan2D = round2(
    Math.hypot(
      screen.rightShoulder[0] - screen.leftShoulder[0],
      screen.rightShoulder[1] - screen.leftShoulder[1],
    ),
  );
  const foreshorteningRatio = round2(shoulderSpan2D / Math.max(1, restShoulderSpan));

  const heelAlignmentDeltaMm =
    movementId === 'rotation-mat-spine-twist'
      ? 0
      : round2(Math.abs(world.rightHeel[0] - world.leftHeel[0]));

  const joints2D: RigJointMap = Object.freeze({
    head: toPoint2D(screen.head),
    neck: toPoint2D(screen.neck),
    shoulder: toPoint2D(screen.rightShoulder),
    elbow: toPoint2D(screen.rightElbow),
    wrist: toPoint2D(screen.rightWrist),
    hand: toPoint2D(screen.rightHand),
    thoracic: toPoint2D(screen.thoracic),
    lumbar: toPoint2D(screen.lumbar),
    pelvis: toPoint2D(screen.pelvis),
    hip: toPoint2D(screen.rightHip),
    knee: toPoint2D(screen.rightKnee),
    ankle: toPoint2D(screen.rightAnkle),
    heel: toPoint2D(screen.rightHeel),
    toe: toPoint2D(screen.rightToe),
    farShoulder: toPoint2D(screen.leftShoulder),
    farElbow: toPoint2D(screen.leftElbow),
    farWrist: toPoint2D(screen.leftWrist),
    farHip: toPoint2D(screen.leftHip),
    farKnee: toPoint2D(screen.leftKnee),
    farAnkle: toPoint2D(screen.leftAnkle),
    farToe: toPoint2D(screen.leftToe),
  });

  const telemetry: RotationKinematicTelemetry = Object.freeze({
    movementId,
    phaseId: phase.id,
    visualPhaseId: phase.visualPhaseId,
    progress,
    yawDeg: built.yawDeg,
    flexionPitchDeg: built.flexionPitchDeg,
    pelvisShiftMm: 0,
    sitBoneLiftMm: 0,
    heelAlignmentDeltaMm,
    leftHeelX: screen.leftHeel[0],
    rightHeelX: screen.rightHeel[0],
    restShoulderSpan,
    shoulderSpan2D,
    foreshorteningRatio,
    coronalArmLockDeg: built.coronalArmLockDeg,
    independentArmSwingDeg: 0,
    elbowSpanDeg: built.elbowSpanDeg,
    curlHeightMm: built.curlHeightMm,
    extendedLegAngleDeg: built.extendedLegAngleDeg,
    tabletopKneeAngleDeg: built.tabletopKneeAngleDeg,
    gazeSternumCouplingDeg: 0,
  });

  const indicators: RotationIndicatorLayerSpec = Object.freeze({
    rotationAxis: Object.freeze({
      kind:
        movementId === 'rotation-mat-spine-twist'
          ? 'vertical-plumb-axis'
          : movementId === 'rotation-mat-saw'
            ? 'twist-then-hinge-axis'
            : 'supine-oblique-curl-axis',
      from: toPoint2D(screen.rotationAxisStart),
      to: toPoint2D(screen.rotationAxisEnd),
      yawDeg: built.yawDeg,
      labelKo:
        movementId === 'rotation-mat-spine-twist'
          ? '몸통을 세운 회전 (그림용 축)'
          : movementId === 'rotation-mat-saw'
            ? '회전 후 대각 리치 (그림용 축)'
            : '상체 들기와 몸통 회전 (그림용 축)',
    }),
    pelvisAnchor: Object.freeze({
      kind:
        movementId === 'rotation-mat-spine-twist'
          ? 'sit-bone-heels-lock'
          : movementId === 'rotation-mat-saw'
            ? 'v-sit-opposite-sitbone-lock'
            : 'supine-sacrum-level-lock',
      leftAnchor: toPoint2D(screen.leftSitBone),
      rightAnchor: toPoint2D(screen.rightSitBone),
      heelAnchor: toPoint2D(screen.rightHeel),
      pelvisShiftMm: 0,
      labelKo:
        movementId === 'rotation-mat-spine-twist'
          ? '앉은 자세와 발 지지 유지 (그림용 고정점)'
          : movementId === 'rotation-mat-saw'
            ? '반대쪽 엉덩이 지지 (그림용 고정점)'
            : '골반 지지와 흔들림 제어 (그림용 고정점)',
    }),
    gazeVector: Object.freeze({
      from: toPoint2D(screen.gazeOrigin),
      to: toPoint2D(screen.gazeTarget),
      coupledToSternum: true,
      labelKo:
        movementId === 'rotation-mat-spine-twist'
          ? '시선은 몸통 회전에 맞춘 그림용 예시'
          : movementId === 'rotation-mat-saw'
            ? '대각 시선은 그림용 예시이며 정확한 방향을 검증하지 않음'
            : '무릎 쪽 시선은 그림용 예시',
    }),
    ribcageScapula: Object.freeze({
      nearShoulder: toPoint2D(screen.rightShoulder),
      farShoulder: toPoint2D(screen.leftShoulder),
      thoracicCenter: toPoint2D(screen.thoracic),
      shoulderSpan2D,
      restShoulderSpan,
      labelKo:
        movementId === 'rotation-mat-spine-twist'
          ? '팔을 옆으로 편 몸통 회전의 2D 투영'
          : movementId === 'rotation-mat-saw'
            ? '앞손은 반대 발 쪽, 뒷팔은 반대 방향으로 뻗는 예시'
            : '팔꿈치만 당기지 않고 몸통을 무릎 쪽으로 회전',
    }),
    transitionPose: Object.freeze({
      trajectoryPoints: Object.freeze([
        toPoint2D(screen.rightHand),
        toPoint2D(screen.thoracic),
        toPoint2D(screen.head),
      ]),
      noteKo:
        movementId === 'rotation-mat-spine-twist'
          ? '정수리 수직 신장 유지하며 하부 흉곽부터 정면 복귀'
          : movementId === 'rotation-mat-saw'
            ? '회전 유지한 채 척추 수직 재적층(Restack) 후 정면 복귀'
            : '상부 흉추 컬업 높이 유지한 채 중앙 교차 전환',
    }),
  });

  return Object.freeze({
    movementId,
    modelVersion: ROTATION_MODEL_VERSION,
    progress,
    phase,
    visualPhaseId: phase.visualPhaseId,
    activeSide,
    mirrored,
    world,
    screen,
    joints2D,
    telemetry,
    indicators,
    provenance: Object.freeze({
      anatomicalAccuracyAssumed: false,
      professionalReviewStatus: 'unreviewed',
      professionalReviewCount: 0,
      sourceFrameMappings: 0,
      sourceMediaCopiedOrTraced: false,
      license: 'CC0-1.0 OR MIT',
      sources: sourceFacts.sources,
    }),
  });
}

const DISCRETE_PHASE_PROGRESS: Readonly<Record<VisualPhaseId, number>> = Object.freeze({
  start: 0,
  middle: 0.5,
  end: 0.78,
});

export function getRotationDiscretePose(
  movementOrAliasId: RotationCatalogAliasId | string,
  phaseId: VisualPhaseId = 'middle',
  options: RotationPoseOptions = {},
): RotationDraftPose {
  const sampleProgress = DISCRETE_PHASE_PROGRESS[phaseId] ?? 0.5;
  return getRotationDraftPose(movementOrAliasId, sampleProgress, options);
}

export function getRotationKinematicTelemetry(
  poseOrMovementId: RotationDraftPose | RotationCatalogAliasId | string,
  progressOrPhase: number | VisualPhaseId = 'middle',
  options: RotationPoseOptions = {},
): RotationKinematicTelemetry {
  if (typeof poseOrMovementId !== 'string') {
    return poseOrMovementId.telemetry;
  }
  const pose =
    typeof progressOrPhase === 'number'
      ? getRotationDraftPose(poseOrMovementId, progressOrPhase, options)
      : getRotationDiscretePose(poseOrMovementId, progressOrPhase, options);
  return pose.telemetry;
}
