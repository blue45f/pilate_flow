import type { Point2D, RigJointMap, VisualPhaseId } from '../data/movementVisualRigCatalog';
import type { AnatomicalSide } from './types';

export type HipLegMovementId = 'hip-leg-single-leg-circle' | 'hip-leg-side-kick';

export type HipLegPhaseId = VisualPhaseId | 'rotation';

export type HipLegStageKey = 'start' | 'rotation' | 'end';

export type HipLegLimbStrokeStyle = 'solid' | 'dashed';

export interface HipLegSegmentLengthSpec {
  readonly femurLength: number;
  readonly tibiaLength: number;
  readonly footLength: number;
  readonly heelLength: number;
  readonly footSoleLength: number;
  readonly upperArmLength: number;
  readonly forearmLength: number;
  readonly handLength: number;
  readonly matSurfaceY: number;
  readonly viewBoxWidth: number;
  readonly viewBoxHeight: number;
  readonly defaultSampleCount: number;
}

const HEEL_FOOT_INCLUDED_ANGLE_RAD = (118 * Math.PI) / 180;
const DEFAULT_FEMUR_LENGTH = 48;
const DEFAULT_TIBIA_LENGTH = 44;
const DEFAULT_FOOT_LENGTH = 16;
const DEFAULT_HEEL_LENGTH = 6;
const DEFAULT_FOOT_SOLE_LENGTH = Math.sqrt(
  DEFAULT_HEEL_LENGTH * DEFAULT_HEEL_LENGTH +
    DEFAULT_FOOT_LENGTH * DEFAULT_FOOT_LENGTH -
    2 * DEFAULT_HEEL_LENGTH * DEFAULT_FOOT_LENGTH * Math.cos(HEEL_FOOT_INCLUDED_ANGLE_RAD),
);

export const HIP_LEG_SEGMENT_LENGTHS: HipLegSegmentLengthSpec = Object.freeze({
  femurLength: DEFAULT_FEMUR_LENGTH,
  tibiaLength: DEFAULT_TIBIA_LENGTH,
  footLength: DEFAULT_FOOT_LENGTH,
  heelLength: DEFAULT_HEEL_LENGTH,
  footSoleLength: DEFAULT_FOOT_SOLE_LENGTH,
  upperArmLength: 28,
  forearmLength: 24,
  handLength: 10,
  matSurfaceY: 144,
  viewBoxWidth: 320,
  viewBoxHeight: 200,
  defaultSampleCount: 241,
});

/** Studio-scale segment reference constants (used for 1120x560 static guide scaling metadata). */
export const HIP_LEG_STUDIO_SCALE_LENGTHS = Object.freeze({
  femurLengthPx: 82,
  tibiaLengthPx: 76,
  heelEdgePx: 14,
  footInstepPx: 30,
  footSolePx: 40,
  upperArmLengthPx: 50,
  forearmLengthPx: 46,
});

export interface HipLegLimbChain {
  readonly role: 'working' | 'support';
  readonly anatomicalSide: AnatomicalSide;
  readonly strokeStyle: HipLegLimbStrokeStyle;
  readonly hip: Point2D;
  readonly knee: Point2D;
  readonly ankle: Point2D;
  readonly heel: Point2D;
  readonly toe: Point2D;
  readonly thighAngleDeg: number;
  readonly shinAngleDeg: number;
  readonly footAngleDeg: number;
  readonly ankleFlexionState: 'dorsiflexion' | 'plantarflexion' | 'neutral';
}

export interface HipLegArmChain {
  readonly anatomicalSide: AnatomicalSide;
  readonly strokeStyle: HipLegLimbStrokeStyle;
  readonly shoulder: Point2D;
  readonly elbow: Point2D;
  readonly wrist: Point2D;
  readonly hand: Point2D;
}

export interface HipLegPelvisInvariants {
  readonly pelvisDriftMm: 0;
  readonly pelvisDriftPx: number;
  readonly pelvisCenter: Point2D;
  readonly hipCenter: Point2D;
  readonly supportHeelX: number;
  readonly supportHeelY: number;
  readonly supportHeelAnchoredOnMat: boolean;
  readonly earShoulderHipCollinear: boolean;
  readonly earShoulderHipMaxDeviationPx: number;
  readonly pelvisStacked: boolean;
  readonly coronalCircumductionOffsetMm: number;
  readonly circumductionAzimuthDeg: number;
}

export interface HipLegMeasuredSegmentLengths {
  readonly femurLength: number;
  readonly tibiaLength: number;
  readonly footLength: number;
  readonly heelLength: number;
  readonly footSoleLength: number;
  readonly supportFemurLength: number;
  readonly supportTibiaLength: number;
  readonly supportFootLength: number;
  readonly supportHeelLength: number;
  readonly upperArmLength: number;
  readonly forearmLength: number;
  readonly handLength: number;
  readonly femurDriftPx: number;
  readonly tibiaDriftPx: number;
  readonly footDriftPx: number;
  readonly supportFemurDriftPx: number;
  readonly supportTibiaDriftPx: number;
  readonly supportFootDriftPx: number;
  readonly maxSegmentDriftPx: number;
}

export interface HipLegDiagramPose {
  readonly movementId: HipLegMovementId;
  readonly phaseId: VisualPhaseId;
  readonly stageKey: HipLegStageKey;
  readonly progress: number;
  readonly activeSide: AnatomicalSide;
  readonly supportSide: AnatomicalSide;
  readonly mirrored: boolean;
  readonly leftLimbStroke: 'solid';
  readonly rightLimbStroke: 'dashed';
  readonly joints: RigJointMap;
  readonly workingLeg: HipLegLimbChain;
  readonly supportLeg: HipLegLimbChain;
  readonly nearArm: HipLegArmChain;
  readonly farArm: HipLegArmChain;
  readonly invariants: HipLegPelvisInvariants;
  readonly segmentLengths: HipLegMeasuredSegmentLengths;
  readonly anatomicalAccuracyAssumed: false;
}

export interface HipLegKinematicVerificationReport {
  readonly movementId: HipLegMovementId;
  readonly sampleCount: number;
  readonly maxFemurDriftPx: number;
  readonly maxTibiaDriftPx: number;
  readonly maxFootDriftPx: number;
  readonly maxSupportFemurDriftPx: number;
  readonly maxSupportTibiaDriftPx: number;
  readonly maxSupportFootDriftPx: number;
  readonly maxOverallSegmentDriftPx: number;
  readonly maxPelvisDriftPx: number;
  readonly pelvisDriftMm: 0;
  readonly maxSupportHeelDriftPx: number;
  readonly supportHeelY: number;
  readonly supportHeelX: number;
  readonly earShoulderHipCollinearAllSamples: boolean;
  readonly earShoulderHipMaxDeviationPx: number;
  readonly invariantPassed: boolean;
}

const SINGLE_LEG_CIRCLE_ALIASES = new Set<string>([
  'hip-leg-single-leg-circle',
  'original-mat-single-leg-circle',
  'ex-hip-01',
  'leg-circle',
  'one-leg-circle',
  'single-leg-circle',
  'ex-straps-01',
  'ex-straps-02',
  'ex-kr-cadillac-02',
  '싱글 레그 서클',
  '원 레그 서클',
  '레그 서클',
  '레그 써클',
]);

const SIDE_KICK_ALIASES = new Set<string>([
  'hip-leg-side-kick',
  'original-mat-side-kick',
  'ex-hip-02',
  'side-lying-leg-lift',
  'original-mat-side-leg-lift',
  'side-kick',
  'side-kick-front-back',
  'ex-lower-04',
  'original-reformer-side-lying-press',
  'original-cadillac-side-leg-reach',
  '사이드 킥',
  '옆으로 누워 다리 들기',
  '사이드 라잉 레그 리프트',
]);

export function resolveHipLegMovementId(idOrQuery: string): HipLegMovementId | null {
  const normalized = idOrQuery.trim().toLowerCase();
  if (!normalized) return null;
  if (SINGLE_LEG_CIRCLE_ALIASES.has(normalized) || SINGLE_LEG_CIRCLE_ALIASES.has(idOrQuery.trim())) {
    return 'hip-leg-single-leg-circle';
  }
  if (SIDE_KICK_ALIASES.has(normalized) || SIDE_KICK_ALIASES.has(idOrQuery.trim())) {
    return 'hip-leg-side-kick';
  }
  if (
    normalized.includes('single-leg-circle') ||
    normalized.includes('leg-circle') ||
    normalized.includes('싱글 레그 서클') ||
    normalized.includes('원 레그 서클') ||
    normalized.includes('레그 서클') ||
    normalized.includes('레그 써클')
  ) {
    return 'hip-leg-single-leg-circle';
  }
  if (
    normalized.includes('side-kick') ||
    normalized.includes('side-lying-leg-lift') ||
    normalized.includes('side-leg-lift') ||
    normalized.includes('사이드 킥') ||
    normalized.includes('옆으로 누워 다리 들기')
  ) {
    return 'hip-leg-side-kick';
  }
  return null;
}

export function normalizeHipLegPhaseId(phase: HipLegPhaseId): VisualPhaseId {
  if (phase === 'rotation') return 'middle';
  return phase;
}

export function toHipLegStageKey(phase: HipLegPhaseId): HipLegStageKey {
  if (phase === 'middle' || phase === 'rotation') return 'rotation';
  return phase;
}

export function phaseToDefaultProgress(phase: HipLegPhaseId): number {
  const normalized = normalizeHipLegPhaseId(phase);
  if (normalized === 'start') return 0;
  if (normalized === 'middle') return 0.5;
  return 1;
}

export function progressToPhaseId(progress: number): VisualPhaseId {
  const p = clamp01(progress);
  if (p < 0.25) return 'start';
  if (p < 0.75) return 'middle';
  return 'end';
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

function smoothStep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

function pointAtPolar(origin: Point2D, length: number, angleRad: number): Point2D {
  return Object.freeze({
    x: origin.x + length * Math.cos(angleRad),
    y: origin.y + length * Math.sin(angleRad),
  });
}

export function distance2D(a: Point2D, b: Point2D): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Exact 2D polar forward-kinematics solver for a 3-segment lower limb chain
 * (femur: hip->knee, tibia: knee->ankle, foot triangle: ankle->toe & ankle->heel).
 * Guarantees zero segment telescoping across all angles.
 */
export function solveLegChainFK(params: {
  readonly hip: Point2D;
  readonly thighAngleDeg: number;
  readonly kneeFlexionDeg: number;
  readonly footOffsetDeg: number;
  readonly role: 'working' | 'support';
  readonly anatomicalSide: AnatomicalSide;
  readonly ankleFlexionState: 'dorsiflexion' | 'plantarflexion' | 'neutral';
  readonly lengths?: HipLegSegmentLengthSpec;
}): HipLegLimbChain {
  const lengths = params.lengths ?? HIP_LEG_SEGMENT_LENGTHS;
  const thighRad = degToRad(params.thighAngleDeg);
  const shinAngleDeg = params.thighAngleDeg + params.kneeFlexionDeg;
  const shinRad = degToRad(shinAngleDeg);
  const footAngleDeg = shinAngleDeg + params.footOffsetDeg;
  const footRad = degToRad(footAngleDeg);
  const heelRad = footRad + HEEL_FOOT_INCLUDED_ANGLE_RAD;

  const knee = pointAtPolar(params.hip, lengths.femurLength, thighRad);
  const ankle = pointAtPolar(knee, lengths.tibiaLength, shinRad);
  const toe = pointAtPolar(ankle, lengths.footLength, footRad);
  const heel = pointAtPolar(ankle, lengths.heelLength, heelRad);

  return Object.freeze({
    role: params.role,
    anatomicalSide: params.anatomicalSide,
    strokeStyle: params.anatomicalSide === 'left' ? 'solid' : 'dashed',
    hip: Object.freeze({ x: params.hip.x, y: params.hip.y }),
    knee,
    ankle,
    heel,
    toe,
    thighAngleDeg: params.thighAngleDeg,
    shinAngleDeg,
    footAngleDeg,
    ankleFlexionState: params.ankleFlexionState,
  });
}

/**
 * Exact 2D polar forward-kinematics solver for an anchored support leg whose heel
 * rests precisely on `matSurfaceY = 144` while preserving exact `femurLength`,
 * `tibiaLength`, `footLength`, and `heelLength`.
 */
function solveAnchoredSupportLegFK(params: {
  readonly hip: Point2D;
  readonly thighDropPx: number;
  readonly shinDropPx: number;
  readonly anatomicalSide: AnatomicalSide;
  readonly lengths?: HipLegSegmentLengthSpec;
}): HipLegLimbChain {
  const lengths = params.lengths ?? HIP_LEG_SEGMENT_LENGTHS;
  const thighRad = Math.asin(params.thighDropPx / lengths.femurLength);
  const shinRad = Math.asin(params.shinDropPx / lengths.tibiaLength);
  const knee = pointAtPolar(params.hip, lengths.femurLength, thighRad);
  const ankle = pointAtPolar(knee, lengths.tibiaLength, shinRad);

  // Place heel strictly on matSurfaceY = 144 using exact heelLength
  const heelDropPx = lengths.matSurfaceY - ankle.y;
  const clampedRatio = Math.max(-1, Math.min(1, heelDropPx / lengths.heelLength));
  const heelRad = Math.PI - Math.asin(clampedRatio);
  const heel = Object.freeze({
    x: ankle.x + lengths.heelLength * Math.cos(heelRad),
    y: lengths.matSurfaceY,
  });

  // Preserve exact included angle between heel and toe vectors so sole length is also invariant
  const footRad = heelRad - HEEL_FOOT_INCLUDED_ANGLE_RAD;
  const toe = pointAtPolar(ankle, lengths.footLength, footRad);

  return Object.freeze({
    role: 'support',
    anatomicalSide: params.anatomicalSide,
    strokeStyle: params.anatomicalSide === 'left' ? 'solid' : 'dashed',
    hip: Object.freeze({ x: params.hip.x, y: params.hip.y }),
    knee,
    ankle,
    heel,
    toe,
    thighAngleDeg: radToDeg(thighRad),
    shinAngleDeg: radToDeg(shinRad),
    footAngleDeg: radToDeg(footRad),
    ankleFlexionState: 'dorsiflexion',
  });
}

function solveArmChainFK(params: {
  readonly shoulder: Point2D;
  readonly upperArmAngleDeg: number;
  readonly forearmAngleDeg: number;
  readonly handAngleDeg: number;
  readonly anatomicalSide: AnatomicalSide;
  readonly lengths?: HipLegSegmentLengthSpec;
}): HipLegArmChain {
  const lengths = params.lengths ?? HIP_LEG_SEGMENT_LENGTHS;
  const elbow = pointAtPolar(
    params.shoulder,
    lengths.upperArmLength,
    degToRad(params.upperArmAngleDeg),
  );
  const wrist = pointAtPolar(
    elbow,
    lengths.forearmLength,
    degToRad(params.forearmAngleDeg),
  );
  const hand = pointAtPolar(
    wrist,
    lengths.handLength,
    degToRad(params.handAngleDeg),
  );
  return Object.freeze({
    anatomicalSide: params.anatomicalSide,
    strokeStyle: params.anatomicalSide === 'left' ? 'solid' : 'dashed',
    shoulder: Object.freeze({ x: params.shoulder.x, y: params.shoulder.y }),
    elbow,
    wrist,
    hand,
  });
}

function evaluateSingleLegCircleAngles(progress: number): {
  readonly thighAngleDeg: number;
  readonly kneeFlexionDeg: number;
  readonly footOffsetDeg: number;
  readonly ankleFlexionState: 'dorsiflexion' | 'plantarflexion' | 'neutral';
  readonly coronalOffsetMm: number;
  readonly circumductionAzimuthDeg: number;
} {
  const p = clamp01(progress);
  // Start (p=0): -90 deg (vertical 12 o'clock over hip)
  // Rotation / Middle (p=0.5): -38 deg (across midline -> distal lower arc sweep)
  // End (p=1.0): -78 deg (controlled pause at upper vertical return zone)
  let thighAngleDeg: number;
  if (p <= 0.5) {
    const u = smoothStep(p / 0.5);
    thighAngleDeg = -90 + u * (-38 - -90);
  } else {
    const u = smoothStep((p - 0.5) / 0.5);
    thighAngleDeg = -38 + u * (-78 - -38);
  }

  const circumductionAzimuthDeg = p * 360;
  const coronalOffsetMm = Math.round(180 * Math.sin(2 * Math.PI * p) * 1000) / 1000;
  const footOffsetDeg = 76;

  return {
    thighAngleDeg,
    kneeFlexionDeg: 0,
    footOffsetDeg,
    ankleFlexionState: p < 0.15 || p > 0.85 ? 'dorsiflexion' : 'plantarflexion',
    coronalOffsetMm,
    circumductionAzimuthDeg,
  };
}

function evaluateSideKickAngles(progress: number): {
  readonly thighAngleDeg: number;
  readonly kneeFlexionDeg: number;
  readonly footOffsetDeg: number;
  readonly ankleFlexionState: 'dorsiflexion' | 'plantarflexion' | 'neutral';
} {
  const p = clamp01(progress);
  // Start (p=0): -2 deg (top leg lifted to hip height parallel to floor, dorsiflexed setup)
  // Middle / Rotation (p=0.5): -40 deg (Front Kick hip flexion sweep with dorsiflexion double-pulse)
  // End (p=1.0): +14 deg (Back Reach hip extension sweep with plantarflexion axial reach)
  let thighAngleDeg: number;
  let footOffsetDeg: number;
  let ankleFlexionState: 'dorsiflexion' | 'plantarflexion' | 'neutral';

  if (p <= 0.5) {
    const u = smoothStep(p / 0.5);
    thighAngleDeg = -2 + u * (-40 - -2);
    footOffsetDeg = 82 + u * (88 - 82);
    ankleFlexionState = 'dorsiflexion';
  } else {
    const u = smoothStep((p - 0.5) / 0.5);
    thighAngleDeg = -40 + u * (14 - -40);
    footOffsetDeg = 88 + u * (34 - 88);
    ankleFlexionState = u > 0.35 ? 'plantarflexion' : 'dorsiflexion';
  }

  return {
    thighAngleDeg,
    kneeFlexionDeg: 0,
    footOffsetDeg,
    ankleFlexionState,
  };
}

function computeCollinearityMaxDeviationPx(
  ear: Point2D,
  shoulder: Point2D,
  pelvis: Point2D,
  hip: Point2D,
): number {
  const dx = hip.x - ear.x;
  const dy = hip.y - ear.y;
  const lineLen = Math.hypot(dx, dy);
  if (lineLen < 1e-9) return 0;

  const pointDistance = (pt: Point2D) =>
    Math.abs(dy * pt.x - dx * pt.y + hip.x * ear.y - hip.y * ear.x) / lineLen;

  return Math.max(pointDistance(shoulder), pointDistance(pelvis));
}

export function getMeasuredSegmentLengths(
  poseOrJoints: HipLegDiagramPose | RigJointMap,
  lengths: HipLegSegmentLengthSpec = HIP_LEG_SEGMENT_LENGTHS,
): HipLegMeasuredSegmentLengths {
  const joints: RigJointMap = 'joints' in poseOrJoints ? poseOrJoints.joints : poseOrJoints;

  const femurLength = distance2D(joints.hip, joints.knee);
  const tibiaLength = distance2D(joints.knee, joints.ankle);
  const footLength = distance2D(joints.ankle, joints.toe);
  const heelLength = distance2D(joints.ankle, joints.heel);
  const footSoleLength = distance2D(joints.heel, joints.toe);

  const farHip = joints.farHip ?? joints.hip;
  const farKnee = joints.farKnee ?? joints.knee;
  const farAnkle = joints.farAnkle ?? joints.ankle;
  const farToe = joints.farToe ?? joints.toe;

  const supportFemurLength = distance2D(farHip, farKnee);
  const supportTibiaLength = distance2D(farKnee, farAnkle);
  const supportFootLength = distance2D(farAnkle, farToe);
  const supportHeelLength =
    'supportLeg' in poseOrJoints
      ? distance2D(poseOrJoints.supportLeg.ankle, poseOrJoints.supportLeg.heel)
      : heelLength;

  const upperArmLength = distance2D(joints.shoulder, joints.elbow);
  const forearmLength = distance2D(joints.elbow, joints.wrist);
  const handLength = distance2D(joints.wrist, joints.hand);

  const femurDriftPx = Math.abs(femurLength - lengths.femurLength);
  const tibiaDriftPx = Math.abs(tibiaLength - lengths.tibiaLength);
  const footDriftPx = Math.abs(footLength - lengths.footLength);
  const supportFemurDriftPx = Math.abs(supportFemurLength - lengths.femurLength);
  const supportTibiaDriftPx = Math.abs(supportTibiaLength - lengths.tibiaLength);
  const supportFootDriftPx = Math.abs(supportFootLength - lengths.footLength);

  const maxSegmentDriftPx = Math.max(
    femurDriftPx,
    tibiaDriftPx,
    footDriftPx,
    supportFemurDriftPx,
    supportTibiaDriftPx,
    supportFootDriftPx,
  );

  return Object.freeze({
    femurLength,
    tibiaLength,
    footLength,
    heelLength,
    footSoleLength,
    supportFemurLength,
    supportTibiaLength,
    supportFootLength,
    supportHeelLength,
    upperArmLength,
    forearmLength,
    handLength,
    femurDriftPx,
    tibiaDriftPx,
    footDriftPx,
    supportFemurDriftPx,
    supportTibiaDriftPx,
    supportFootDriftPx,
    maxSegmentDriftPx,
  });
}

function mirrorPoint2D(pt: Point2D, width = HIP_LEG_SEGMENT_LENGTHS.viewBoxWidth): Point2D {
  return Object.freeze({
    x: width - pt.x,
    y: pt.y,
  });
}

function mirrorLimbChain(chain: HipLegLimbChain, width = HIP_LEG_SEGMENT_LENGTHS.viewBoxWidth): HipLegLimbChain {
  return Object.freeze({
    ...chain,
    // Left limb is always solid; right limb is always dashed even when mirrored
    strokeStyle: chain.anatomicalSide === 'left' ? 'solid' : 'dashed',
    hip: mirrorPoint2D(chain.hip, width),
    knee: mirrorPoint2D(chain.knee, width),
    ankle: mirrorPoint2D(chain.ankle, width),
    heel: mirrorPoint2D(chain.heel, width),
    toe: mirrorPoint2D(chain.toe, width),
    thighAngleDeg: 180 - chain.thighAngleDeg,
    shinAngleDeg: 180 - chain.shinAngleDeg,
    footAngleDeg: 180 - chain.footAngleDeg,
  });
}

function mirrorArmChain(chain: HipLegArmChain, width = HIP_LEG_SEGMENT_LENGTHS.viewBoxWidth): HipLegArmChain {
  return Object.freeze({
    ...chain,
    strokeStyle: chain.anatomicalSide === 'left' ? 'solid' : 'dashed',
    shoulder: mirrorPoint2D(chain.shoulder, width),
    elbow: mirrorPoint2D(chain.elbow, width),
    wrist: mirrorPoint2D(chain.wrist, width),
    hand: mirrorPoint2D(chain.hand, width),
  });
}

export function mirrorHipLegPose(pose: HipLegDiagramPose): HipLegDiagramPose {
  if (pose.mirrored) return pose;
  const width = HIP_LEG_SEGMENT_LENGTHS.viewBoxWidth;
  const mirroredJoints: RigJointMap = Object.freeze({
    head: mirrorPoint2D(pose.joints.head, width),
    neck: mirrorPoint2D(pose.joints.neck, width),
    shoulder: mirrorPoint2D(pose.joints.shoulder, width),
    elbow: mirrorPoint2D(pose.joints.elbow, width),
    wrist: mirrorPoint2D(pose.joints.wrist, width),
    hand: mirrorPoint2D(pose.joints.hand, width),
    thoracic: mirrorPoint2D(pose.joints.thoracic, width),
    lumbar: mirrorPoint2D(pose.joints.lumbar, width),
    pelvis: mirrorPoint2D(pose.joints.pelvis, width),
    hip: mirrorPoint2D(pose.joints.hip, width),
    knee: mirrorPoint2D(pose.joints.knee, width),
    ankle: mirrorPoint2D(pose.joints.ankle, width),
    heel: mirrorPoint2D(pose.joints.heel, width),
    toe: mirrorPoint2D(pose.joints.toe, width),
    ...(pose.joints.farShoulder ? { farShoulder: mirrorPoint2D(pose.joints.farShoulder, width) } : {}),
    ...(pose.joints.farElbow ? { farElbow: mirrorPoint2D(pose.joints.farElbow, width) } : {}),
    ...(pose.joints.farWrist ? { farWrist: mirrorPoint2D(pose.joints.farWrist, width) } : {}),
    ...(pose.joints.farHip ? { farHip: mirrorPoint2D(pose.joints.farHip, width) } : {}),
    ...(pose.joints.farKnee ? { farKnee: mirrorPoint2D(pose.joints.farKnee, width) } : {}),
    ...(pose.joints.farAnkle ? { farAnkle: mirrorPoint2D(pose.joints.farAnkle, width) } : {}),
    ...(pose.joints.farToe ? { farToe: mirrorPoint2D(pose.joints.farToe, width) } : {}),
  });

  const workingLeg = mirrorLimbChain(pose.workingLeg, width);
  const supportLeg = mirrorLimbChain(pose.supportLeg, width);
  const nearArm = mirrorArmChain(pose.nearArm, width);
  const farArm = mirrorArmChain(pose.farArm, width);

  const mirroredInvariants: HipLegPelvisInvariants = Object.freeze({
    ...pose.invariants,
    pelvisCenter: mirrorPoint2D(pose.invariants.pelvisCenter, width),
    hipCenter: mirrorPoint2D(pose.invariants.hipCenter, width),
    supportHeelX: supportLeg.heel.x,
    supportHeelY: supportLeg.heel.y,
  });

  const mirroredPose: HipLegDiagramPose = Object.freeze({
    ...pose,
    mirrored: true,
    leftLimbStroke: 'solid',
    rightLimbStroke: 'dashed',
    joints: mirroredJoints,
    workingLeg,
    supportLeg,
    nearArm,
    farArm,
    invariants: mirroredInvariants,
    segmentLengths: getMeasuredSegmentLengths(
      {
        ...pose,
        joints: mirroredJoints,
        workingLeg,
        supportLeg,
      },
      HIP_LEG_SEGMENT_LENGTHS,
    ),
  });

  return mirroredPose;
}

export function getHipLegDiagramPose(
  movementIdOrAlias: string,
  phaseOrProgress: HipLegPhaseId | number = 'start',
  options?: {
    readonly activeSide?: AnatomicalSide;
    readonly mirrored?: boolean;
  },
): HipLegDiagramPose {
  const movementId = resolveHipLegMovementId(movementIdOrAlias) ?? 'hip-leg-single-leg-circle';
  const activeSide: AnatomicalSide = options?.activeSide ?? 'left';
  const supportSide: AnatomicalSide = activeSide === 'left' ? 'right' : 'left';
  const mirrored = Boolean(options?.mirrored);

  const progress =
    typeof phaseOrProgress === 'number'
      ? clamp01(phaseOrProgress)
      : phaseToDefaultProgress(phaseOrProgress);
  const phaseId: VisualPhaseId =
    typeof phaseOrProgress === 'number'
      ? progressToPhaseId(progress)
      : normalizeHipLegPhaseId(phaseOrProgress);
  const stageKey: HipLegStageKey =
    typeof phaseOrProgress === 'number'
      ? toHipLegStageKey(phaseId)
      : toHipLegStageKey(phaseOrProgress);

  if (movementId === 'hip-leg-single-leg-circle') {
    // Supine stationary torso & pelvis along neutral axis y = 136
    const head: Point2D = Object.freeze({ x: 56, y: 136 });
    const neck: Point2D = Object.freeze({ x: 74, y: 136 });
    const shoulder: Point2D = Object.freeze({ x: 92, y: 136 });
    const thoracic: Point2D = Object.freeze({ x: 118, y: 136 });
    const lumbar: Point2D = Object.freeze({ x: 142, y: 136 });
    const pelvis: Point2D = Object.freeze({ x: 164, y: 136 });
    const hip: Point2D = Object.freeze({ x: 168, y: 136 });

    const nearArm = solveArmChainFK({
      shoulder,
      upperArmAngleDeg: 10,
      forearmAngleDeg: 7,
      handAngleDeg: 0,
      anatomicalSide: activeSide,
    });
    const farArm = solveArmChainFK({
      shoulder,
      upperArmAngleDeg: 8,
      forearmAngleDeg: 5,
      handAngleDeg: 0,
      anatomicalSide: supportSide,
    });

    const supportLeg = solveAnchoredSupportLegFK({
      hip,
      thighDropPx: 2,
      shinDropPx: 2,
      anatomicalSide: supportSide,
    });

    const angleState = evaluateSingleLegCircleAngles(progress);
    const workingLeg = solveLegChainFK({
      hip,
      thighAngleDeg: angleState.thighAngleDeg,
      kneeFlexionDeg: angleState.kneeFlexionDeg,
      footOffsetDeg: angleState.footOffsetDeg,
      role: 'working',
      anatomicalSide: activeSide,
      ankleFlexionState: angleState.ankleFlexionState,
    });

    const joints: RigJointMap = Object.freeze({
      head,
      neck,
      shoulder,
      elbow: nearArm.elbow,
      wrist: nearArm.wrist,
      hand: nearArm.hand,
      thoracic,
      lumbar,
      pelvis,
      hip: workingLeg.hip,
      knee: workingLeg.knee,
      ankle: workingLeg.ankle,
      heel: workingLeg.heel,
      toe: workingLeg.toe,
      farShoulder: farArm.shoulder,
      farElbow: farArm.elbow,
      farWrist: farArm.wrist,
      farHip: supportLeg.hip,
      farKnee: supportLeg.knee,
      farAnkle: supportLeg.ankle,
      farToe: supportLeg.toe,
    });

    const collinearDev = computeCollinearityMaxDeviationPx(head, shoulder, pelvis, hip);
    const invariants: HipLegPelvisInvariants = Object.freeze({
      pelvisDriftMm: 0,
      pelvisDriftPx: 0,
      pelvisCenter: pelvis,
      hipCenter: hip,
      supportHeelX: supportLeg.heel.x,
      supportHeelY: supportLeg.heel.y,
      supportHeelAnchoredOnMat: Math.abs(supportLeg.heel.y - HIP_LEG_SEGMENT_LENGTHS.matSurfaceY) < 1e-9,
      earShoulderHipCollinear: collinearDev < 1e-6,
      earShoulderHipMaxDeviationPx: collinearDev,
      pelvisStacked: true,
      coronalCircumductionOffsetMm: angleState.coronalOffsetMm,
      circumductionAzimuthDeg: angleState.circumductionAzimuthDeg,
    });

    const unmirroredPose: HipLegDiagramPose = Object.freeze({
      movementId,
      phaseId,
      stageKey,
      progress,
      activeSide,
      supportSide,
      mirrored: false,
      leftLimbStroke: 'solid',
      rightLimbStroke: 'dashed',
      joints,
      workingLeg,
      supportLeg,
      nearArm,
      farArm,
      invariants,
      segmentLengths: getMeasuredSegmentLengths(
        {
          joints,
          workingLeg,
          supportLeg,
        } as HipLegDiagramPose,
        HIP_LEG_SEGMENT_LENGTHS,
      ),
      anatomicalAccuracyAssumed: false,
    });

    return mirrored ? mirrorHipLegPose(unmirroredPose) : unmirroredPose;
  }

  // Movement 2: Side Kick (`hip-leg-side-kick`)
  // Side-lying along back edge of mat: ear (head), shoulder, thoracic, lumbar, pelvis, hip collinear on y = 128
  const head: Point2D = Object.freeze({ x: 56, y: 128 });
  const neck: Point2D = Object.freeze({ x: 74, y: 128 });
  const shoulder: Point2D = Object.freeze({ x: 92, y: 128 });
  const thoracic: Point2D = Object.freeze({ x: 116, y: 128 });
  const lumbar: Point2D = Object.freeze({ x: 140, y: 128 });
  const pelvis: Point2D = Object.freeze({ x: 164, y: 128 });
  const hip: Point2D = Object.freeze({ x: 168, y: 128 });

  // Top stabilizing hand placed on mat in front of sternum; bottom arm supporting head
  const nearArm = solveArmChainFK({
    shoulder,
    upperArmAngleDeg: 24,
    forearmAngleDeg: 11,
    handAngleDeg: 0,
    anatomicalSide: activeSide,
  });
  const farArm = solveArmChainFK({
    shoulder,
    upperArmAngleDeg: 168,
    forearmAngleDeg: 185,
    handAngleDeg: 180,
    anatomicalSide: supportSide,
  });

  // Bottom support leg angled forward in classical pike alignment with heel anchored at y = 144
  const supportLeg = solveAnchoredSupportLegFK({
    hip,
    thighDropPx: 8,
    shinDropPx: 4,
    anatomicalSide: supportSide,
  });

  const sideKickAngles = evaluateSideKickAngles(progress);
  const workingLeg = solveLegChainFK({
    hip,
    thighAngleDeg: sideKickAngles.thighAngleDeg,
    kneeFlexionDeg: sideKickAngles.kneeFlexionDeg,
    footOffsetDeg: sideKickAngles.footOffsetDeg,
    role: 'working',
    anatomicalSide: activeSide,
    ankleFlexionState: sideKickAngles.ankleFlexionState,
  });

  const joints: RigJointMap = Object.freeze({
    head,
    neck,
    shoulder,
    elbow: nearArm.elbow,
    wrist: nearArm.wrist,
    hand: nearArm.hand,
    thoracic,
    lumbar,
    pelvis,
    hip: workingLeg.hip,
    knee: workingLeg.knee,
    ankle: workingLeg.ankle,
    heel: workingLeg.heel,
    toe: workingLeg.toe,
    farShoulder: farArm.shoulder,
    farElbow: farArm.elbow,
    farWrist: farArm.wrist,
    farHip: supportLeg.hip,
    farKnee: supportLeg.knee,
    farAnkle: supportLeg.ankle,
    farToe: supportLeg.toe,
  });

  const collinearDev = computeCollinearityMaxDeviationPx(head, shoulder, pelvis, hip);
  const invariants: HipLegPelvisInvariants = Object.freeze({
    pelvisDriftMm: 0,
    pelvisDriftPx: 0,
    pelvisCenter: pelvis,
    hipCenter: hip,
    supportHeelX: supportLeg.heel.x,
    supportHeelY: supportLeg.heel.y,
    supportHeelAnchoredOnMat: Math.abs(supportLeg.heel.y - HIP_LEG_SEGMENT_LENGTHS.matSurfaceY) < 1e-9,
    earShoulderHipCollinear: collinearDev < 1e-6,
    earShoulderHipMaxDeviationPx: collinearDev,
    pelvisStacked: Math.abs(workingLeg.hip.x - supportLeg.hip.x) < 1e-9,
    coronalCircumductionOffsetMm: 0,
    circumductionAzimuthDeg: 0,
  });

  const unmirroredPose: HipLegDiagramPose = Object.freeze({
    movementId,
    phaseId,
    stageKey,
    progress,
    activeSide,
    supportSide,
    mirrored: false,
    leftLimbStroke: 'solid',
    rightLimbStroke: 'dashed',
    joints,
    workingLeg,
    supportLeg,
    nearArm,
    farArm,
    invariants,
    segmentLengths: getMeasuredSegmentLengths(
      {
        joints,
        workingLeg,
        supportLeg,
      } as HipLegDiagramPose,
      HIP_LEG_SEGMENT_LENGTHS,
    ),
    anatomicalAccuracyAssumed: false,
  });

  return mirrored ? mirrorHipLegPose(unmirroredPose) : unmirroredPose;
}

/**
 * Samples continuous `t in [0, 1]` across `sampleCount` points (defaults to 241 samples: `i / 240`).
 */
export function sampleHipLegTrajectory(
  movementIdOrAlias: string,
  sampleCount: number = HIP_LEG_SEGMENT_LENGTHS.defaultSampleCount,
  options?: {
    readonly activeSide?: AnatomicalSide;
    readonly mirrored?: boolean;
  },
): readonly HipLegDiagramPose[] {
  const count = Math.max(2, Math.floor(sampleCount));
  const samples: HipLegDiagramPose[] = [];
  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    samples.push(getHipLegDiagramPose(movementIdOrAlias, t, options));
  }
  return Object.freeze(samples);
}

/**
 * Verifies rigid segment-length invariance (< 1e-6 drift) and pelvis/support-leg
 * stability invariants across all 241 continuous samples.
 */
export function verifyHipLegKinematicInvariants(
  movementIdOrAlias: string,
  sampleCount: number = HIP_LEG_SEGMENT_LENGTHS.defaultSampleCount,
  options?: {
    readonly activeSide?: AnatomicalSide;
    readonly mirrored?: boolean;
  },
): HipLegKinematicVerificationReport {
  const samples = sampleHipLegTrajectory(movementIdOrAlias, sampleCount, options);
  const first = samples[0];

  let maxFemurDriftPx = 0;
  let maxTibiaDriftPx = 0;
  let maxFootDriftPx = 0;
  let maxSupportFemurDriftPx = 0;
  let maxSupportTibiaDriftPx = 0;
  let maxSupportFootDriftPx = 0;
  let maxPelvisDriftPx = 0;
  let maxSupportHeelDriftPx = 0;
  let earShoulderHipCollinearAllSamples = true;
  let earShoulderHipMaxDeviationPx = 0;

  for (const sample of samples) {
    const seg = sample.segmentLengths;
    maxFemurDriftPx = Math.max(maxFemurDriftPx, seg.femurDriftPx);
    maxTibiaDriftPx = Math.max(maxTibiaDriftPx, seg.tibiaDriftPx);
    maxFootDriftPx = Math.max(maxFootDriftPx, seg.footDriftPx);
    maxSupportFemurDriftPx = Math.max(maxSupportFemurDriftPx, seg.supportFemurDriftPx);
    maxSupportTibiaDriftPx = Math.max(maxSupportTibiaDriftPx, seg.supportTibiaDriftPx);
    maxSupportFootDriftPx = Math.max(maxSupportFootDriftPx, seg.supportFootDriftPx);

    const pelvisDrift = distance2D(first.joints.pelvis, sample.joints.pelvis);
    maxPelvisDriftPx = Math.max(maxPelvisDriftPx, pelvisDrift);

    const supportHeelDrift = distance2D(first.supportLeg.heel, sample.supportLeg.heel);
    maxSupportHeelDriftPx = Math.max(maxSupportHeelDriftPx, supportHeelDrift);

    if (!sample.invariants.earShoulderHipCollinear) {
      earShoulderHipCollinearAllSamples = false;
    }
    earShoulderHipMaxDeviationPx = Math.max(
      earShoulderHipMaxDeviationPx,
      sample.invariants.earShoulderHipMaxDeviationPx,
    );
  }

  const maxOverallSegmentDriftPx = Math.max(
    maxFemurDriftPx,
    maxTibiaDriftPx,
    maxFootDriftPx,
    maxSupportFemurDriftPx,
    maxSupportTibiaDriftPx,
    maxSupportFootDriftPx,
  );

  const invariantPassed =
    maxOverallSegmentDriftPx < 1e-6 &&
    maxPelvisDriftPx < 1e-6 &&
    maxSupportHeelDriftPx < 1e-6 &&
    Math.abs(first.supportLeg.heel.y - HIP_LEG_SEGMENT_LENGTHS.matSurfaceY) < 1e-6 &&
    earShoulderHipCollinearAllSamples;

  return Object.freeze({
    movementId: first.movementId,
    sampleCount: samples.length,
    maxFemurDriftPx,
    maxTibiaDriftPx,
    maxFootDriftPx,
    maxSupportFemurDriftPx,
    maxSupportTibiaDriftPx,
    maxSupportFootDriftPx,
    maxOverallSegmentDriftPx,
    maxPelvisDriftPx,
    pelvisDriftMm: 0,
    maxSupportHeelDriftPx,
    supportHeelY: first.supportLeg.heel.y,
    supportHeelX: first.supportLeg.heel.x,
    earShoulderHipCollinearAllSamples,
    earShoulderHipMaxDeviationPx,
    invariantPassed,
  });
}
