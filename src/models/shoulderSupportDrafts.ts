/**
 * SPDX-License-Identifier: MIT
 * Clean-room 2D kinematic & support-line schematic for Pilates shoulder-support movements:
 * - Pilates Push Up ('shoulder-support-push-up')
 * - Leg Pull Front ('shoulder-support-leg-pull-front')
 *
 * Non-medical, non-diagnostic visual reference:
 * anatomicalAccuracyAssumed: false, professionalReviewCount: 0, sourceFrameMappings: 0.
 */
import type {
  JointAlignmentGuide,
  MovementDirectionVector,
  Point2D,
  RigJointMap,
  VisualPhaseId,
} from '../data/movementVisualRigCatalog';
import type { AnatomicalSide, DraftPhase, PhaseId } from './types';

export const SHOULDER_SUPPORT_MOVEMENT_IDS = [
  'shoulder-support-push-up',
  'shoulder-support-leg-pull-front',
] as const;

export type ShoulderSupportMovementId = (typeof SHOULDER_SUPPORT_MOVEMENT_IDS)[number];

export const SHOULDER_SUPPORT_MODEL_VERSION = 'shoulder-support-kinematic-2d-v1' as const;

export type ShoulderSupportDiscretePhaseId = VisualPhaseId;
export type ShoulderSupportContinuousPhaseId = PhaseId;

export type ShoulderSupportSupportLineId =
  | 'wrist-vertical-support'
  | 'scapula-thoracic-support'
  | 'shoulder-pelvis-ankle-plank-line';

export const SHOULDER_SUPPORT_LINE_IDS: readonly ShoulderSupportSupportLineId[] = Object.freeze([
  'wrist-vertical-support',
  'scapula-thoracic-support',
  'shoulder-pelvis-ankle-plank-line',
]);

export interface ShoulderSupportPhaseSpec extends DraftPhase {
  readonly id: ShoulderSupportContinuousPhaseId;
  readonly discretePhase: ShoulderSupportDiscretePhaseId;
  readonly label: string;
  readonly labelKo: string;
  readonly displayBehavior: 'hold' | 'move';
}

export const SHOULDER_SUPPORT_PHASES: readonly ShoulderSupportPhaseSpec[] = Object.freeze([
  Object.freeze({
    id: 'setup',
    discretePhase: 'start',
    label: '손목-견갑 수직 지지 및 전신 일직선 플랭크 세팅',
    labelKo: '손목-견갑 수직 지지 및 전신 일직선 플랭크 세팅',
    start: 0,
    end: 0.14,
    sample: 0.06,
    displayBehavior: 'hold',
  }),
  Object.freeze({
    id: 'move',
    discretePhase: 'middle',
    label: '견갑 전인 지지 유지 하 주관절 굴곡 하강 / 단측 고관절 신전 거상',
    labelKo: '견갑 전인 지지 유지 하 주관절 굴곡 하강 / 단측 고관절 신전 거상',
    start: 0.14,
    end: 0.42,
    sample: 0.28,
    displayBehavior: 'move',
  }),
  Object.freeze({
    id: 'turn',
    discretePhase: 'middle',
    label: '정점 정렬 유지 (요추 처짐 및 날개뼈 익상 제로)',
    labelKo: '정점 정렬 유지 (요추 처짐 및 날개뼈 익상 제로)',
    start: 0.42,
    end: 0.58,
    sample: 0.5,
    displayBehavior: 'hold',
  }),
  Object.freeze({
    id: 'return',
    discretePhase: 'end',
    label: '코어-견갑 협응으로 플랭크 기준선 제어 복귀',
    labelKo: '코어-견갑 협응으로 플랭크 기준선 제어 복귀',
    start: 0.58,
    end: 0.86,
    sample: 0.72,
    displayBehavior: 'move',
  }),
  Object.freeze({
    id: 'finish',
    discretePhase: 'end',
    label: '시작 플랭크 수직 지지 정렬 재확립',
    labelKo: '시작 플랭크 수직 지지 정렬 재확립',
    start: 0.86,
    end: 1,
    sample: 0.94,
    displayBehavior: 'hold',
  }),
]);

export const SHOULDER_SUPPORT_KINEMATIC_PARAMETERS = Object.freeze({
  viewportWidth: 320,
  viewportHeight: 200,
  scalePxPerM: 140,
  originX: 64,
  originY: 166,
  matSurfaceYPx: 166,
  segmentLengthsM: Object.freeze({
    headToNeck: 0.08,
    neckToShoulder: 0.1,
    shoulderToThoracic: 0.18,
    thoracicToLumbar: 0.17,
    lumbarToPelvis: 0.17,
    trunkTotal: 0.52,
    upperArm: 0.28,
    forearm: 0.26,
    thigh: 0.41,
    shank: 0.41,
    footHeelOffset: 0.06,
    footToeOffset: 0.1,
    handForwardOffset: 0.08,
  }),
  wristWorld: Object.freeze({ x: 0, y: 0.02 }),
  ankleSupportWorldY: 0.11,
  plankShoulderWorldY: 0.56,
  pushUpPlankDropDeg: 11.2,
  legPullHipExtensionDeg: 18.5,
  legPullAllowedRangeDeg: Object.freeze({ min: 15, max: 22 }),
});

export interface TwoLinkIKSolution {
  readonly root: Point2D;
  readonly mid: Point2D;
  readonly end: Point2D;
  readonly length1: number;
  readonly length2: number;
  readonly actualLength1: number;
  readonly actualLength2: number;
  readonly distance: number;
  readonly interiorAngleDeg: number;
  readonly reachable: boolean;
}

export interface ShoulderSupportProjectionOptions {
  readonly mirrored?: boolean;
  readonly width?: number;
  readonly height?: number;
  readonly scalePxPerM?: number;
  readonly originX?: number;
  readonly originY?: number;
}

export interface ShoulderSupportAlignmentLine {
  readonly id: ShoulderSupportSupportLineId;
  readonly labelKo: string;
  readonly cueKo: string;
  readonly cautionKo: string;
  readonly kind: JointAlignmentGuide['kind'];
  readonly fromWorld: Point2D;
  readonly toWorld: Point2D;
  readonly fromScreen: Point2D;
  readonly toScreen: Point2D;
  readonly targetAngleDeg: number;
  readonly deviationM: number;
  readonly withinTolerance: boolean;
}

export interface ShoulderSupportJointAxes {
  readonly wristExtensionDeg: number;
  readonly scapularProtractionDeg: number;
  readonly elbowFlexionDeg: number;
  readonly elbowInteriorAngleDeg: number;
  readonly shoulderFlexionDeg: number;
  readonly plankInclineDeg: number;
  readonly hipExtensionLiftDeg: number;
  readonly ankleReachAngleDeg: number;
}

export interface ShoulderSupportContactPoint {
  readonly id: string;
  readonly joint: keyof RigJointMap;
  readonly labelKo: string;
  readonly surfaceKo: string;
  readonly state: 'fixed' | 'hinged-rock' | 'lifted';
  readonly worldPoint: Point2D;
  readonly screenPoint: Point2D;
}

export interface ShoulderSupportMetrics {
  readonly wristShoulderHorizontalOffsetM: number;
  readonly wristShoulderHorizontalOffsetPx: number;
  readonly scapularWingingOffsetM: number;
  readonly thoracicCollapseM: number;
  readonly scapularProtractionIntegrity: boolean;
  readonly pelvicLineDeviationM: number;
  readonly pelvicLineDeviationPx: number;
  readonly lumbarSagM: number;
  readonly plankCollinear: boolean;
  readonly activeLegLiftDeg: number;
  readonly segmentLengthsM: Readonly<
    Record<
      | 'upperArm'
      | 'forearm'
      | 'neck'
      | 'trunk'
      | 'thigh'
      | 'shank'
      | 'supportThigh'
      | 'supportShank',
      number
    >
  >;
  readonly segmentLengthsPx: Readonly<
    Record<
      | 'upperArm'
      | 'forearm'
      | 'neck'
      | 'trunk'
      | 'thigh'
      | 'shank'
      | 'supportThigh'
      | 'supportShank',
      number
    >
  >;
}

export interface ShoulderSupportDraftOptions {
  readonly activeSide?: AnatomicalSide;
  readonly mirrored?: boolean;
}

export interface ShoulderSupportDraftPose {
  readonly movementId: ShoulderSupportMovementId;
  readonly modelVersion: typeof SHOULDER_SUPPORT_MODEL_VERSION;
  readonly discretePhase: ShoulderSupportDiscretePhaseId;
  readonly continuousPhase: ShoulderSupportPhaseSpec;
  readonly progress: number;
  readonly amount: number;
  readonly activeSide: AnatomicalSide;
  readonly mirrored: boolean;
  readonly worldJoints: RigJointMap;
  readonly joints: RigJointMap;
  readonly armIK: TwoLinkIKSolution;
  readonly supportLines: readonly [
    ShoulderSupportAlignmentLine,
    ShoulderSupportAlignmentLine,
    ShoulderSupportAlignmentLine,
  ];
  readonly supportLineMap: Readonly<
    Record<ShoulderSupportSupportLineId, ShoulderSupportAlignmentLine>
  >;
  readonly alignments: readonly JointAlignmentGuide[];
  readonly directionVectors: readonly MovementDirectionVector[];
  readonly jointAxes: ShoulderSupportJointAxes;
  readonly contactPoints: readonly ShoulderSupportContactPoint[];
  readonly metrics: ShoulderSupportMetrics;
  readonly anatomicalAccuracyAssumed: false;
  readonly professionalReviewCount: 0;
  readonly sourceFrameMappings: 0;
  readonly exactAssetReady: false;
  readonly safetyAssessment: 'unassessed';
}

const degToRad = (deg: number): number => (deg * Math.PI) / 180;
const radToDeg = (rad: number): number => (rad * 180) / Math.PI;

function freezePoint(x: number, y: number): Point2D {
  return Object.freeze({ x, y });
}

function dist2D(a: Point2D, b: Point2D): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function smoothStep(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function evaluateAmountFromProgress(progress: number): number {
  const p = clamp01(progress);
  if (p <= 0.14 || p >= 0.86) return 0;
  if (p < 0.42) return smoothStep((p - 0.14) / 0.28);
  if (p <= 0.58) return 1;
  return 1 - smoothStep((p - 0.58) / 0.28);
}

function resolvePhaseAndProgress(
  phaseOrProgress:
    | ShoulderSupportDiscretePhaseId
    | ShoulderSupportContinuousPhaseId
    | number,
): {
  readonly progress: number;
  readonly amount: number;
  readonly discretePhase: ShoulderSupportDiscretePhaseId;
  readonly continuousPhase: ShoulderSupportPhaseSpec;
} {
  if (typeof phaseOrProgress === 'number') {
    if (!Number.isFinite(phaseOrProgress)) {
      throw new RangeError('phaseOrProgress number must be finite');
    }
    const progress = clamp01(phaseOrProgress);
    const amount = evaluateAmountFromProgress(progress);
    const continuousPhase =
      SHOULDER_SUPPORT_PHASES.find(
        (ph) => progress >= ph.start && (progress < ph.end || ph.id === 'finish'),
      ) ?? SHOULDER_SUPPORT_PHASES[0];
    const discretePhase: ShoulderSupportDiscretePhaseId =
      progress < 0.22 ? 'start' : progress <= 0.78 ? 'middle' : 'end';
    return { progress, amount, discretePhase, continuousPhase };
  }

  if (phaseOrProgress === 'start') {
    return {
      progress: 0,
      amount: 0,
      discretePhase: 'start',
      continuousPhase: SHOULDER_SUPPORT_PHASES[0],
    };
  }
  if (phaseOrProgress === 'middle') {
    return {
      progress: 0.5,
      amount: 1,
      discretePhase: 'middle',
      continuousPhase: SHOULDER_SUPPORT_PHASES[2],
    };
  }
  if (phaseOrProgress === 'end') {
    return {
      progress: 1,
      amount: 0,
      discretePhase: 'end',
      continuousPhase: SHOULDER_SUPPORT_PHASES[4],
    };
  }

  const found = SHOULDER_SUPPORT_PHASES.find((ph) => ph.id === phaseOrProgress);
  if (!found) {
    throw new TypeError(`Unsupported shoulder support phase: ${String(phaseOrProgress)}`);
  }
  return {
    progress: found.sample,
    amount: evaluateAmountFromProgress(found.sample),
    discretePhase: found.discretePhase,
    continuousPhase: found,
  };
}

/**
 * Analytic 2-link planar Inverse Kinematics solver.
 * Guarantees constant segment lengths (length1 = |mid - root|, length2 = |end - mid|)
 * for any reachable target distance in [|length1 - length2|, length1 + length2].
 */
export function solveTwoLinkIK(
  root: Point2D,
  target: Point2D,
  length1: number,
  length2: number,
  bendDirection: 'posterior' | 'anterior' | 1 | -1 = 'posterior',
): TwoLinkIKSolution {
  if (!(length1 > 0) || !(length2 > 0)) {
    throw new RangeError('solveTwoLinkIK requires positive link lengths');
  }
  const dx = target.x - root.x;
  const dy = target.y - root.y;
  const rawDistance = Math.hypot(dx, dy);
  const minReach = Math.abs(length1 - length2);
  const maxReach = length1 + length2;
  const eps = 1e-9;

  const reachable = rawDistance >= minReach - eps && rawDistance <= maxReach + eps;
  const clampedDist = Math.max(minReach + 1e-12, Math.min(maxReach - 1e-12, rawDistance));

  const ux = rawDistance > eps ? dx / rawDistance : 0;
  const uy = rawDistance > eps ? dy / rawDistance : -1;

  // Normal vector pointing posteriorly (toward positive x / ribs when arm goes downward from shoulder to wrist)
  const sign = bendDirection === 'posterior' || bendDirection === 1 ? 1 : -1;
  const nx = -uy * sign;
  const ny = ux * sign;

  const along =
    (length1 * length1 - length2 * length2 + clampedDist * clampedDist) / (2 * clampedDist);
  const perpSq = Math.max(0, length1 * length1 - along * along);
  const perp = Math.sqrt(perpSq);

  const mid = freezePoint(root.x + ux * along + nx * perp, root.y + uy * along + ny * perp);
  const end = reachable
    ? freezePoint(target.x, target.y)
    : freezePoint(root.x + ux * clampedDist, root.y + uy * clampedDist);

  const actualLength1 = dist2D(root, mid);
  const actualLength2 = dist2D(mid, end);

  const cosInterior = Math.max(
    -1,
    Math.min(
      1,
      (length1 * length1 + length2 * length2 - clampedDist * clampedDist) /
        (2 * length1 * length2),
    ),
  );
  const interiorAngleDeg = radToDeg(Math.acos(cosInterior));

  return Object.freeze({
    root: freezePoint(root.x, root.y),
    mid,
    end,
    length1,
    length2,
    actualLength1,
    actualLength2,
    distance: rawDistance,
    interiorAngleDeg,
    reachable,
  });
}

/**
 * Projects 2D sagittal world coordinates (meters, x toward feet, y up from mat)
 * onto the SVG viewport (default 320x200) using isotropic scaling so segment
 * lengths and joint angles remain invariant.
 */
export function projectShoulderSupportPoint(
  worldPoint: Point2D,
  options: ShoulderSupportProjectionOptions = {},
): Point2D {
  const {
    mirrored = false,
    width = SHOULDER_SUPPORT_KINEMATIC_PARAMETERS.viewportWidth,
    scalePxPerM = SHOULDER_SUPPORT_KINEMATIC_PARAMETERS.scalePxPerM,
    originX = SHOULDER_SUPPORT_KINEMATIC_PARAMETERS.originX,
    originY = SHOULDER_SUPPORT_KINEMATIC_PARAMETERS.originY,
  } = options;

  const rawX = originX + worldPoint.x * scalePxPerM;
  const x = mirrored ? width - rawX : rawX;
  const y = originY - worldPoint.y * scalePxPerM;
  return freezePoint(x, y);
}

function pointToLineDistance2D(point: Point2D, lineStart: Point2D, lineEnd: Point2D): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-12) return dist2D(point, lineStart);
  return Math.abs(dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x) / len;
}

export function getShoulderSupportDraftPose(
  movementId: ShoulderSupportMovementId,
  phaseOrProgress:
    | ShoulderSupportDiscretePhaseId
    | ShoulderSupportContinuousPhaseId
    | number = 'start',
  options: ShoulderSupportDraftOptions = {},
): ShoulderSupportDraftPose {
  if (!SHOULDER_SUPPORT_MOVEMENT_IDS.includes(movementId)) {
    throw new TypeError(`Unknown shoulder support movementId: ${String(movementId)}`);
  }

  const activeSide: AnatomicalSide = options.activeSide ?? 'right';
  const mirrored = Boolean(options.mirrored);
  const { progress, amount, discretePhase, continuousPhase } =
    resolvePhaseAndProgress(phaseOrProgress);

  const params = SHOULDER_SUPPORT_KINEMATIC_PARAMETERS;
  const seg = params.segmentLengthsM;
  const totalPlankLengthM = seg.trunkTotal + seg.thigh + seg.shank; // 0.52 + 0.41 + 0.41 = 1.34 m

  // Base plank geometry at amount = 0:
  // shoulder = (0, 0.56), ankle = (ankleBaseX, 0.11)
  const plankRiseM = params.plankShoulderWorldY - params.ankleSupportWorldY; // 0.45 m
  const basePlankAngleRad = Math.asin(plankRiseM / totalPlankLengthM);
  const ankleBaseX = totalPlankLengthM * Math.cos(basePlankAngleRad);
  const supportAnkleWorld = freezePoint(ankleBaseX, params.ankleSupportWorldY);

  // In push-up, the entire rigid plank (head-shoulder-pelvis-knee-ankle) pivots around supportAnkleWorld
  // while the hands remain anchored at wristWorld = (0, 0.02).
  // In leg-pull-front, the plank line stays at basePlankAngleRad with shoulder stacked vertically over wrist,
  // while the active leg lifts by 18.5° (within 15°..22°) above the plank line around the hip.
  const plankAngleRad =
    movementId === 'shoulder-support-push-up'
      ? basePlankAngleRad - degToRad(params.pushUpPlankDropDeg) * amount
      : basePlankAngleRad;

  // Unit vector along the plank from shoulder toward support ankle
  const dirToAnkleX = Math.cos(plankAngleRad);
  const dirToAnkleY = -Math.sin(plankAngleRad);

  const shoulderWorld = freezePoint(
    supportAnkleWorld.x - totalPlankLengthM * dirToAnkleX,
    supportAnkleWorld.y - totalPlankLengthM * dirToAnkleY,
  );

  const neckWorld = freezePoint(
    shoulderWorld.x - seg.neckToShoulder * dirToAnkleX,
    shoulderWorld.y - seg.neckToShoulder * dirToAnkleY,
  );
  const headWorld = freezePoint(
    neckWorld.x - seg.headToNeck * dirToAnkleX,
    neckWorld.y - seg.headToNeck * dirToAnkleY,
  );

  const thoracicWorld = freezePoint(
    shoulderWorld.x + seg.shoulderToThoracic * dirToAnkleX,
    shoulderWorld.y + seg.shoulderToThoracic * dirToAnkleY,
  );
  const lumbarWorld = freezePoint(
    thoracicWorld.x + seg.thoracicToLumbar * dirToAnkleX,
    thoracicWorld.y + seg.thoracicToLumbar * dirToAnkleY,
  );
  const pelvisWorld = freezePoint(
    lumbarWorld.x + seg.lumbarToPelvis * dirToAnkleX,
    lumbarWorld.y + seg.lumbarToPelvis * dirToAnkleY,
  );
  const hipWorld = pelvisWorld;

  const supportKneeWorld = freezePoint(
    hipWorld.x + seg.thigh * dirToAnkleX,
    hipWorld.y + seg.thigh * dirToAnkleY,
  );
  const supportHeelWorld = freezePoint(
    supportAnkleWorld.x + seg.footHeelOffset * 0.85,
    supportAnkleWorld.y + 0.03,
  );
  const supportToeWorld = freezePoint(supportAnkleWorld.x - 0.03, 0.01);

  // Active leg kinematics:
  // For push-up: active leg stays aligned with the plank line.
  // For leg-pull-front: active leg extends upward by 18.5° * amount above the plank line around hipWorld.
  const activeLegLiftDeg =
    movementId === 'shoulder-support-leg-pull-front'
      ? params.legPullHipExtensionDeg * amount
      : 0;
  const activeLegAngleRad = plankAngleRad - degToRad(activeLegLiftDeg);
  const legDirX = Math.cos(activeLegAngleRad);
  const legDirY = -Math.sin(activeLegAngleRad);

  const activeKneeWorld = freezePoint(
    hipWorld.x + seg.thigh * legDirX,
    hipWorld.y + seg.thigh * legDirY,
  );
  const activeAnkleWorld = freezePoint(
    activeKneeWorld.x + seg.shank * legDirX,
    activeKneeWorld.y + seg.shank * legDirY,
  );

  const activeHeelWorld =
    movementId === 'shoulder-support-leg-pull-front' && amount > 0.01
      ? freezePoint(
          activeAnkleWorld.x + seg.footHeelOffset * legDirX * 0.4,
          activeAnkleWorld.y + 0.025,
        )
      : supportHeelWorld;

  const activeToeWorld =
    movementId === 'shoulder-support-leg-pull-front' && amount > 0.01
      ? freezePoint(
          activeAnkleWorld.x + seg.footToeOffset * legDirX,
          activeAnkleWorld.y + seg.footToeOffset * legDirY - 0.01,
        )
      : supportToeWorld;

  // Two-link IK for supporting arm (shoulder -> elbow -> wrist)
  const wristWorld = params.wristWorld;
  const handWorld = freezePoint(wristWorld.x - seg.handForwardOffset, 0.01);
  const armIKWorld = solveTwoLinkIK(
    shoulderWorld,
    wristWorld,
    seg.upperArm,
    seg.forearm,
    'posterior',
  );
  const elbowWorld = armIKWorld.mid;

  // Far-side companion joints (slight depth offset for visual clarity on bilateral/unilateral views)
  const farDepthWorld = freezePoint(0.015, 0.012);
  const farShoulderWorld = freezePoint(
    shoulderWorld.x + farDepthWorld.x,
    shoulderWorld.y + farDepthWorld.y,
  );
  const farWristWorld = freezePoint(wristWorld.x + farDepthWorld.x, wristWorld.y + 0.005);
  const farArmIKWorld = solveTwoLinkIK(
    farShoulderWorld,
    farWristWorld,
    seg.upperArm,
    seg.forearm,
    'posterior',
  );

  const worldJoints: RigJointMap = Object.freeze({
    head: headWorld,
    neck: neckWorld,
    shoulder: shoulderWorld,
    elbow: elbowWorld,
    wrist: wristWorld,
    hand: handWorld,
    thoracic: thoracicWorld,
    lumbar: lumbarWorld,
    pelvis: pelvisWorld,
    hip: hipWorld,
    knee: activeKneeWorld,
    ankle: activeAnkleWorld,
    heel: activeHeelWorld,
    toe: activeToeWorld,
    farShoulder: farShoulderWorld,
    farElbow: farArmIKWorld.mid,
    farWrist: farWristWorld,
    farHip: hipWorld,
    farKnee: supportKneeWorld,
    farAnkle: supportAnkleWorld,
    farToe: supportToeWorld,
  });

  const proj = (pt: Point2D) => projectShoulderSupportPoint(pt, { mirrored });

  const screenJoints: RigJointMap = Object.freeze({
    head: proj(worldJoints.head),
    neck: proj(worldJoints.neck),
    shoulder: proj(worldJoints.shoulder),
    elbow: proj(worldJoints.elbow),
    wrist: proj(worldJoints.wrist),
    hand: proj(worldJoints.hand),
    thoracic: proj(worldJoints.thoracic),
    lumbar: proj(worldJoints.lumbar),
    pelvis: proj(worldJoints.pelvis),
    hip: proj(worldJoints.hip),
    knee: proj(worldJoints.knee),
    ankle: proj(worldJoints.ankle),
    heel: proj(worldJoints.heel),
    toe: proj(worldJoints.toe),
    farShoulder: proj( farShoulderWorld ),
    farElbow: proj( farArmIKWorld.mid ),
    farWrist: proj( farWristWorld ),
    farHip: proj( hipWorld ),
    farKnee: proj( supportKneeWorld ),
    farAnkle: proj( supportAnkleWorld ),
    farToe: proj( supportToeWorld ),
  });

  const armIKScreen = solveTwoLinkIK(
    screenJoints.shoulder,
    screenJoints.wrist,
    seg.upperArm * params.scalePxPerM,
    seg.forearm * params.scalePxPerM,
    mirrored ? 'anterior' : 'posterior',
  );

  // Biomechanical alignment invariants & metrics
  const wristShoulderHorizontalOffsetM = Math.abs(shoulderWorld.x - wristWorld.x);
  const wristShoulderHorizontalOffsetPx = Math.abs(screenJoints.shoulder.x - screenJoints.wrist.x);

  const pelvicLineDeviationM = pointToLineDistance2D(
    pelvisWorld,
    shoulderWorld,
    supportAnkleWorld,
  );
  const pelvicLineDeviationPx = pointToLineDistance2D(
    screenJoints.pelvis,
    screenJoints.shoulder,
    screenJoints.farAnkle ?? screenJoints.ankle,
  );

  const wristVerticalLine: ShoulderSupportAlignmentLine = Object.freeze({
    id: 'wrist-vertical-support',
    labelKo: '손목-견관절 수직 지지축 (Wrist-to-Shoulder Plumb Support)',
    cueKo:
      movementId === 'shoulder-support-push-up' && discretePhase === 'middle'
        ? '하강 정점에서도 손바닥 전체로 지면을 수직으로 밀어내며 주관절이 옆구리 뒤쪽으로 접힙니다.'
        : '손목 주름 위에 견관절을 수직 정렬하여 손목 과신전 없이 지면반력을 전달합니다.',
    cautionKo: '어깨가 손목 앞으로 과도하게 쏟아지거나 손목 안쪽이 뜨지 않도록 주의합니다.',
    kind: 'plumb-line',
    fromWorld: wristWorld,
    toWorld: freezePoint(wristWorld.x, params.plankShoulderWorldY + 0.04),
    fromScreen: proj(wristWorld),
    toScreen: proj(freezePoint(wristWorld.x, params.plankShoulderWorldY + 0.04)),
    targetAngleDeg: 90,
    deviationM: wristShoulderHorizontalOffsetM,
    withinTolerance:
      discretePhase === 'middle' && movementId === 'shoulder-support-push-up'
        ? wristShoulderHorizontalOffsetM <= 0.08
        : wristShoulderHorizontalOffsetM <= 0.005,
  });

  const scapulaSupportFromWorld = freezePoint(
    shoulderWorld.x - 0.02 * dirToAnkleY,
    shoulderWorld.y + 0.02 * dirToAnkleX,
  );
  const scapulaSupportToWorld = freezePoint(
    thoracicWorld.x + 0.03 * dirToAnkleX,
    thoracicWorld.y + 0.03 * dirToAnkleY,
  );

  const scapulaThoracicLine: ShoulderSupportAlignmentLine = Object.freeze({
    id: 'scapula-thoracic-support',
    labelKo: '전거근·견갑-흉곽 밀착 지지선 (Scapula-Thoracic Serratus Support)',
    cueKo: '손바닥으로 매트를 밀어내어 날개뼈 사이를 넓게 채우고 견갑골 익상(Winging)을 방지합니다.',
    cautionKo: '날개뼈 사이로 흉곽이 꺼지거나 상부 승모근이 귀 쪽으로 솟지 않도록 제어합니다.',
    kind: 'neutral-zone',
    fromWorld: scapulaSupportFromWorld,
    toWorld: scapulaSupportToWorld,
    fromScreen: proj(scapulaSupportFromWorld),
    toScreen: proj(scapulaSupportToWorld),
    targetAngleDeg: Number(radToDeg(plankAngleRad).toFixed(2)),
    deviationM: 0,
    withinTolerance: true,
  });

  const plankLine: ShoulderSupportAlignmentLine = Object.freeze({
    id: 'shoulder-pelvis-ankle-plank-line',
    labelKo: '귀-견갑-골반-무릎-발목 플랭크 직선축 (Head-Shoulder-Pelvis-Ankle Plank Line)',
    cueKo: '정수리부터 뒤꿈치까지 하나의 긴 강철 널빤지처럼 연결하여 허리 처짐(Lumbar Sag)을 막습니다.',
    cautionKo: '골반이 바닥으로 처지거나 엉덩이가 산처럼 솟아오르지 않도록 복횡근·대둔근을 동시에 수축합니다.',
    kind: 'axis-line',
    fromWorld: headWorld,
    toWorld: supportAnkleWorld,
    fromScreen: proj(headWorld),
    toScreen: proj(supportAnkleWorld),
    targetAngleDeg: Number(radToDeg(plankAngleRad).toFixed(2)),
    deviationM: pelvicLineDeviationM,
    withinTolerance: pelvicLineDeviationM <= 1e-6,
  });

  const supportLines: readonly [
    ShoulderSupportAlignmentLine,
    ShoulderSupportAlignmentLine,
    ShoulderSupportAlignmentLine,
  ] = Object.freeze([wristVerticalLine, scapulaThoracicLine, plankLine]);

  const supportLineMap = Object.freeze({
    'wrist-vertical-support': wristVerticalLine,
    'scapula-thoracic-support': scapulaThoracicLine,
    'shoulder-pelvis-ankle-plank-line': plankLine,
  });

  const alignments: readonly JointAlignmentGuide[] = Object.freeze(
    supportLines.map((line) =>
      Object.freeze({
        id: line.id,
        labelKo: line.labelKo,
        cueKo: line.cueKo,
        kind: line.kind,
        from: line.fromScreen,
        to: line.toScreen,
        targetAngleDeg: line.targetAngleDeg,
        cautionKo: line.cautionKo,
      }),
    ),
  );

  const directionVectors: readonly MovementDirectionVector[] = Object.freeze(
    movementId === 'shoulder-support-push-up'
      ? [
          Object.freeze({
            id: 'push-up-plank-descent-vector',
            labelKo:
              discretePhase === 'end'
                ? '날숨: 손바닥 수직 푸시로 플랭크 정렬 복귀'
                : '들숨: 플랭크 직선 유지하며 주관절 옆구리 방향 굴곡 하강',
            kind: discretePhase === 'end' ? 'return-control' : 'limb-excursion',
            points: Object.freeze([
              proj(freezePoint(0, params.plankShoulderWorldY)),
              proj(freezePoint(-0.05, params.plankShoulderWorldY - 0.22)),
            ]),
            phaseScope: discretePhase,
          }),
          Object.freeze({
            id: 'push-up-axial-plank-lengthening',
            labelKo: '정수리-발뒤꿈치 양방향 축성 신장 (요추 처짐 방지)',
            kind: 'axial-lengthening',
            points: Object.freeze([proj(pelvisWorld), proj(headWorld)]),
            phaseScope: discretePhase,
          }),
        ]
      : [
          Object.freeze({
            id: 'leg-pull-front-hip-extension-vector',
            labelKo:
              discretePhase === 'end'
                ? '들었던 다리를 골반 흔들림 없이 매트 지지 위치로 복귀'
                : '날숨: 골반 수평 고정 후 한쪽 다리 18.5° 고관절 신전 리치',
            kind: discretePhase === 'end' ? 'return-control' : 'limb-excursion',
            points: Object.freeze([
              proj(supportAnkleWorld),
              proj(
                freezePoint(
                  hipWorld.x + (seg.thigh + seg.shank) * Math.cos(plankAngleRad - degToRad(params.legPullHipExtensionDeg)),
                  hipWorld.y - (seg.thigh + seg.shank) * Math.sin(plankAngleRad - degToRad(params.legPullHipExtensionDeg)),
                ),
              ),
            ]),
            phaseScope: discretePhase,
          }),
          Object.freeze({
            id: 'leg-pull-front-scapular-upward-press',
            labelKo: '손바닥 지면 반발력 → 전거근 흉곽 지지 유지',
            kind: 'axial-lengthening',
            points: Object.freeze([proj(wristWorld), proj(shoulderWorld)]),
            phaseScope: discretePhase,
          }),
        ],
  );

  const elbowFlexionDeg = Number((180 - armIKWorld.interiorAngleDeg).toFixed(2));
  const jointAxes: ShoulderSupportJointAxes = Object.freeze({
    wristExtensionDeg:
      movementId === 'shoulder-support-push-up'
        ? Number((88 - 14 * amount).toFixed(2))
        : 89,
    scapularProtractionDeg: Number((12 + 3 * amount).toFixed(2)),
    elbowFlexionDeg,
    elbowInteriorAngleDeg: Number(armIKWorld.interiorAngleDeg.toFixed(2)),
    shoulderFlexionDeg: Number((72 - 18 * amount).toFixed(2)),
    plankInclineDeg: Number(radToDeg(plankAngleRad).toFixed(2)),
    hipExtensionLiftDeg: Number(activeLegLiftDeg.toFixed(2)),
    ankleReachAngleDeg:
      movementId === 'shoulder-support-leg-pull-front'
        ? Number((90 + 28 * amount).toFixed(2))
        : Number((88 - 8 * amount).toFixed(2)),
  });

  const contactPoints: readonly ShoulderSupportContactPoint[] = Object.freeze([
    Object.freeze({
      id: 'palm-wrist-mat-anchor',
      joint: 'wrist',
      labelKo: '손바닥·손목 매트 고정 지지점',
      surfaceKo: '매트 전면 지지면 (수직 반력 앵커)',
      state: 'fixed',
      worldPoint: wristWorld,
      screenPoint: screenJoints.wrist,
    }),
    Object.freeze({
      id: 'support-forefoot-hinge',
      joint: 'farToe',
      labelKo: '지지측 발볼(중족골두) 매트 힌지 지지점',
      surfaceKo: '매트 후면 발볼 지지면',
      state: movementId === 'shoulder-support-push-up' && amount > 0 ? 'hinged-rock' : 'fixed',
      worldPoint: supportToeWorld,
      screenPoint: screenJoints.farToe ?? screenJoints.toe,
    }),
    Object.freeze({
      id: 'active-foot-contact',
      joint: 'ankle',
      labelKo:
        movementId === 'shoulder-support-leg-pull-front'
          ? '가동측 발목·발끝 (고관절 신전 리치)'
          : '가동측 발볼 매트 지지점',
      surfaceKo:
        movementId === 'shoulder-support-leg-pull-front' && amount > 0.05
          ? '공중 신전 궤적 (플랭크 기준선 위 18.5°)'
          : '매트 후면 발볼 지지면',
      state:
        movementId === 'shoulder-support-leg-pull-front' && amount > 0.05
          ? 'lifted'
          : movementId === 'shoulder-support-push-up' && amount > 0
            ? 'hinged-rock'
            : 'fixed',
      worldPoint: activeAnkleWorld,
      screenPoint: screenJoints.ankle,
    }),
  ]);

  const segmentLengthsM = Object.freeze({
    upperArm: dist2D(worldJoints.shoulder, worldJoints.elbow),
    forearm: dist2D(worldJoints.elbow, worldJoints.wrist),
    neck: dist2D(worldJoints.head, worldJoints.shoulder),
    trunk: dist2D(worldJoints.shoulder, worldJoints.pelvis),
    thigh: dist2D(worldJoints.hip, worldJoints.knee),
    shank: dist2D(worldJoints.knee, worldJoints.ankle),
    supportThigh: dist2D(worldJoints.farHip ?? worldJoints.hip, worldJoints.farKnee ?? worldJoints.knee),
    supportShank: dist2D(worldJoints.farKnee ?? worldJoints.knee, worldJoints.farAnkle ?? worldJoints.ankle),
  });

  const segmentLengthsPx = Object.freeze({
    upperArm: dist2D(screenJoints.shoulder, screenJoints.elbow),
    forearm: dist2D(screenJoints.elbow, screenJoints.wrist),
    neck: dist2D(screenJoints.head, screenJoints.shoulder),
    trunk: dist2D(screenJoints.shoulder, screenJoints.pelvis),
    thigh: dist2D(screenJoints.hip, screenJoints.knee),
    shank: dist2D(screenJoints.knee, screenJoints.ankle),
    supportThigh: dist2D(
      screenJoints.farHip ?? screenJoints.hip,
      screenJoints.farKnee ?? screenJoints.knee,
    ),
    supportShank: dist2D(
      screenJoints.farKnee ?? screenJoints.knee,
      screenJoints.farAnkle ?? screenJoints.ankle,
    ),
  });

  const metrics: ShoulderSupportMetrics = Object.freeze({
    wristShoulderHorizontalOffsetM,
    wristShoulderHorizontalOffsetPx,
    scapularWingingOffsetM: 0,
    thoracicCollapseM: 0,
    scapularProtractionIntegrity: true,
    pelvicLineDeviationM,
    pelvicLineDeviationPx,
    lumbarSagM: 0,
    plankCollinear: pelvicLineDeviationM <= 1e-6,
    activeLegLiftDeg,
    segmentLengthsM,
    segmentLengthsPx,
  });

  return Object.freeze({
    movementId,
    modelVersion: SHOULDER_SUPPORT_MODEL_VERSION,
    discretePhase,
    continuousPhase,
    progress,
    amount,
    activeSide,
    mirrored,
    worldJoints,
    joints: screenJoints,
    armIK: armIKScreen,
    supportLines,
    supportLineMap,
    alignments,
    directionVectors,
    jointAxes,
    contactPoints,
    metrics,
    anatomicalAccuracyAssumed: false,
    professionalReviewCount: 0,
    sourceFrameMappings: 0,
    exactAssetReady: false,
    safetyAssessment: 'unassessed',
  });
}
