/**
 * SPDX-License-Identifier: MIT
 * Track I2 — Pelvis & Hip 2D Kinematic Model (Pelvic Curl & Bridge Family)
 *
 * Original 2D kinematic & geometric verification model for the 7 Pelvis & Hip
 * variants and 3 archetype keys. Not motion-capture or clinical measurement
 * (anatomicalAccuracyAssumed: false, professionalReviewCount: 0).
 */

import type {
  CatalogMovementVisualAsset,
  Point2D,
  RigJointMap,
  VisualPhaseId,
} from '../data/movementVisualRigCatalog';
import type { ApparatusType } from '../types/pilates';
import { PELVIS_HIP_TRUTHFULNESS_METADATA } from '../data/pelvisHipProvenance';

export const PELVIS_HIP_VARIANT_IDS = [
  'pelvis-mat-pelvic-curl',
  'original-mat-bridge',
  'pelvis-mat-shoulder-bridge',
  'original-reformer-supported-bridge',
  'ex-bridging-01',
  'ex-bridging-02',
  'original-cadillac-table-bridge',
] as const;

export type PelvisHipVariantId = (typeof PELVIS_HIP_VARIANT_IDS)[number];

export const PELVIS_HIP_ARCHETYPE_IDS = [
  'pelvis-bridging',
  'pelvis-curl',
  'shoulder-bridge',
] as const;

export type PelvisHipArchetypeId = (typeof PELVIS_HIP_ARCHETYPE_IDS)[number];

export type PelvisHipKeyId = PelvisHipVariantId | PelvisHipArchetypeId;

export type PelvisHipApparatusKind =
  | 'mat-pelvic-curl'
  | 'mat-bridge'
  | 'mat-shoulder-bridge'
  | 'reformer-supported-bridge'
  | 'reformer-bottom-lift'
  | 'cadillac-tower-bar'
  | 'cadillac-table-bridge';

export interface PelvisHipApparatusGeometry {
  readonly apparatus: ApparatusType;
  readonly apparatusKind: PelvisHipApparatusKind;
  readonly supportSurfaceY: number;
  readonly supportSurfaceKo: string;
  readonly footSupportKo: string;
  readonly footContactPoint: Point2D;
  readonly headrestState: 'flat';
  readonly carriageStopperChecked: boolean;
  readonly carriageOffsetsPx: readonly number[];
  readonly hasFootbar: boolean;
  readonly footbarPoint?: Point2D;
  readonly shoulderBlockX?: number;
  readonly hasMiniBallProp: boolean;
  readonly hasAngledTowerBar: boolean;
  readonly towerBarPivot?: Point2D;
  readonly towerBarTip?: Point2D;
  readonly hasSafetyStrap: boolean;
  readonly hasBottomSpring: boolean;
  readonly hasVerticalArmPosts: boolean;
  readonly verticalPostX?: number;
  readonly isSingleLegExtension: boolean;
  readonly pelvisTiltDegByPhase: readonly number[];
}

export interface PelvisHipCollinearityReport {
  readonly diagonalAngleDeg: number;
  readonly shoulderToHipAngleDeg: number;
  readonly hipToKneeAngleDeg: number;
  readonly angularDeviationDeg: number;
  readonly hipPerpendicularDistancePx: number;
  readonly thoracicPerpendicularOffsetPx: number;
  readonly lumbarPerpendicularOffsetPx: number;
  readonly isCollinear: boolean;
  readonly hasRibFlare: boolean;
}

export interface PelvisHipSupportSurfaceReport {
  readonly supportSurfaceY: number;
  readonly thoracicY: number;
  readonly lumbarY: number;
  readonly pelvisY: number;
  readonly thoracicInTargetBand: boolean;
  readonly lumbarInTargetBand: boolean;
  readonly pelvisInTargetBand: boolean;
  readonly legacyFloatingDefectResolved: boolean;
  readonly isGroundedOnSupport: boolean;
  readonly maxSupportGapPx: number;
}

export interface PelvisHipContinuousPose {
  readonly variantId: PelvisHipVariantId;
  readonly progress: number;
  readonly nearestPhase: VisualPhaseId;
  readonly phaseLabelKo: string;
  readonly joints: RigJointMap;
  readonly pelvisTiltDeg: number;
  readonly carriageOffsetPx: number;
  readonly collinearity: PelvisHipCollinearityReport;
  readonly supportCheck: PelvisHipSupportSurfaceReport;
}

export interface PelvisHipVariantValidationReport {
  readonly variantId: string;
  readonly archetypeId: string;
  readonly hasThreePhases: boolean;
  readonly endPhaseSupport: PelvisHipSupportSurfaceReport;
  readonly middlePhaseCollinearity: PelvisHipCollinearityReport;
  readonly truthfulnessVerified: boolean;
  readonly isValid: boolean;
}

function clampCoord(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.round(Math.min(max, Math.max(min, value)));
}

export function pelvisPt(x: number, y: number): Point2D {
  return Object.freeze({
    x: clampCoord(x, 16, 304),
    y: clampCoord(y, 16, 184),
  });
}

export function makePelvisHipJointMap(raw: RigJointMap): RigJointMap {
  const result: Record<string, Point2D> = {
    head: pelvisPt(raw.head.x, raw.head.y),
    neck: pelvisPt(raw.neck.x, raw.neck.y),
    shoulder: pelvisPt(raw.shoulder.x, raw.shoulder.y),
    elbow: pelvisPt(raw.elbow.x, raw.elbow.y),
    wrist: pelvisPt(raw.wrist.x, raw.wrist.y),
    hand: pelvisPt(raw.hand.x, raw.hand.y),
    thoracic: pelvisPt(raw.thoracic.x, raw.thoracic.y),
    lumbar: pelvisPt(raw.lumbar.x, raw.lumbar.y),
    pelvis: pelvisPt(raw.pelvis.x, raw.pelvis.y),
    hip: pelvisPt(raw.hip.x, raw.hip.y),
    knee: pelvisPt(raw.knee.x, raw.knee.y),
    ankle: pelvisPt(raw.ankle.x, raw.ankle.y),
    heel: pelvisPt(raw.heel.x, raw.heel.y),
    toe: pelvisPt(raw.toe.x, raw.toe.y),
  };
  if (raw.farShoulder) result.farShoulder = pelvisPt(raw.farShoulder.x, raw.farShoulder.y);
  if (raw.farElbow) result.farElbow = pelvisPt(raw.farElbow.x, raw.farElbow.y);
  if (raw.farWrist) result.farWrist = pelvisPt(raw.farWrist.x, raw.farWrist.y);
  if (raw.farHip) result.farHip = pelvisPt(raw.farHip.x, raw.farHip.y);
  if (raw.farKnee) result.farKnee = pelvisPt(raw.farKnee.x, raw.farKnee.y);
  if (raw.farAnkle) result.farAnkle = pelvisPt(raw.farAnkle.x, raw.farAnkle.y);
  if (raw.farToe) result.farToe = pelvisPt(raw.farToe.x, raw.farToe.y);
  return Object.freeze(result as unknown as RigJointMap);
}

export function resolvePelvisHipVariantId(idOrKey: string): PelvisHipVariantId {
  switch (idOrKey) {
    case 'pelvis-mat-pelvic-curl':
    case 'pelvis-curl':
      return 'pelvis-mat-pelvic-curl';
    case 'original-mat-bridge':
    case 'pelvis-bridging':
    case 'pelvis-mat-bridge':
    case 'supine-articulated-bridge':
      return 'original-mat-bridge';
    case 'pelvis-mat-shoulder-bridge':
    case 'shoulder-bridge':
      return 'pelvis-mat-shoulder-bridge';
    case 'original-reformer-supported-bridge':
      return 'original-reformer-supported-bridge';
    case 'ex-bridging-01':
      return 'ex-bridging-01';
    case 'ex-bridging-02':
      return 'ex-bridging-02';
    case 'original-cadillac-table-bridge':
      return 'original-cadillac-table-bridge';
    default:
      return 'original-mat-bridge';
  }
}

/**
 * Signed perpendicular offset of a point `p` relative to the line `shoulder -> knee`.
 * Positive values mean `p.y` is greater than (below/softer than) the diagonal line in SVG coordinates;
 * negative values mean `p.y` is above the diagonal line (indicating rib flare or lumbar hyperextension).
 */
function computeSignedVerticalOffsetFromLine(
  from: Point2D,
  to: Point2D,
  point: Point2D,
): number {
  const dx = to.x - from.x;
  if (Math.abs(dx) < 1e-6) return 0;
  const t = (point.x - from.x) / dx;
  const expectedY = from.y + t * (to.y - from.y);
  return Math.round((point.y - expectedY) * 100) / 100;
}

function computePerpendicularDistanceToLine(
  from: Point2D,
  to: Point2D,
  point: Point2D,
): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return 0;
  const area2 = Math.abs(dy * point.x - dx * point.y + to.x * from.y - to.y * from.x);
  return Math.round((area2 / len) * 100) / 100;
}

/**
 * Evaluates the `shoulder - hip - knee` diagonal collinearity and checks that the
 * thoracic and lumbar segments do not flare above the bridge diagonal line.
 */
export function computePelvisHipCollinearity(
  joints: RigJointMap,
  toleranceDeg = 4.0,
): PelvisHipCollinearityReport {
  const { shoulder, thoracic, lumbar, hip, knee } = joints;
  const dxTotal = knee.x - shoulder.x;
  const dyTotal = shoulder.y - knee.y; // positive upward in SVG
  const diagonalAngleDeg =
    Math.round(((Math.atan2(dyTotal, dxTotal) * 180) / Math.PI) * 100) / 100;

  const shoulderToHipAngleDeg =
    Math.round(
      ((Math.atan2(shoulder.y - hip.y, hip.x - shoulder.x) * 180) / Math.PI) * 100,
    ) / 100;
  const hipToKneeAngleDeg =
    Math.round(
      ((Math.atan2(hip.y - knee.y, knee.x - hip.x) * 180) / Math.PI) * 100,
    ) / 100;

  const angularDeviationDeg =
    Math.round(Math.abs(shoulderToHipAngleDeg - hipToKneeAngleDeg) * 100) / 100;
  const hipPerpendicularDistancePx = computePerpendicularDistanceToLine(
    shoulder,
    knee,
    hip,
  );
  const thoracicPerpendicularOffsetPx = computeSignedVerticalOffsetFromLine(
    shoulder,
    knee,
    thoracic,
  );
  const lumbarPerpendicularOffsetPx = computeSignedVerticalOffsetFromLine(
    shoulder,
    knee,
    lumbar,
  );

  const isCollinear =
    angularDeviationDeg <= toleranceDeg && hipPerpendicularDistancePx <= 3.0;
  const hasRibFlare =
    thoracicPerpendicularOffsetPx < -1.5 || lumbarPerpendicularOffsetPx < -1.5;

  return Object.freeze({
    diagonalAngleDeg,
    shoulderToHipAngleDeg,
    hipToKneeAngleDeg,
    angularDeviationDeg,
    hipPerpendicularDistancePx,
    thoracicPerpendicularOffsetPx,
    lumbarPerpendicularOffsetPx,
    isCollinear,
    hasRibFlare,
  });
}

/**
 * Verifies that the `end` phase returns thoracic (`y = 141..143`), lumbar (`y = 141..143`),
 * and pelvis (`y = 143..144`) to the mat/carriage/table support surface (`y = 143..144`)
 * instead of floating in mid-air (`y = 126..138` in the legacy catalog).
 */
export function computePelvisHipEndSupportCheck(
  joints: RigJointMap,
  supportSurfaceY = 144,
): PelvisHipSupportSurfaceReport {
  const thoracicY = joints.thoracic.y;
  const lumbarY = joints.lumbar.y;
  const pelvisY = joints.pelvis.y;

  const thoracicInTargetBand = thoracicY >= 141 && thoracicY <= 143;
  const lumbarInTargetBand = lumbarY >= 141 && lumbarY <= 143;
  const pelvisInTargetBand = pelvisY >= 143 && pelvisY <= 144;

  // Legacy floating bug had thoracic at 128 or 136, lumbar at 126 or 138, pelvis at 127
  const legacyFloatingDefectResolved =
    thoracicY >= 140 && lumbarY >= 140 && pelvisY >= 140;

  const maxSupportGapPx = Math.round(
    Math.max(
      Math.abs(supportSurfaceY - thoracicY),
      Math.abs(supportSurfaceY - lumbarY),
      Math.abs(supportSurfaceY - pelvisY),
    ) * 10,
  ) / 10;

  const isGroundedOnSupport =
    thoracicInTargetBand &&
    lumbarInTargetBand &&
    pelvisInTargetBand &&
    legacyFloatingDefectResolved &&
    maxSupportGapPx <= 3;

  return Object.freeze({
    supportSurfaceY,
    thoracicY,
    lumbarY,
    pelvisY,
    thoracicInTargetBand,
    lumbarInTargetBand,
    pelvisInTargetBand,
    legacyFloatingDefectResolved,
    isGroundedOnSupport,
    maxSupportGapPx,
  });
}

export interface PelvisHipKinematicBlueprint {
  readonly variantId: PelvisHipVariantId;
  readonly archetypeId: string;
  readonly apparatusGeometry: PelvisHipApparatusGeometry;
  readonly startJoints: RigJointMap;
  readonly middleJoints: RigJointMap;
  readonly endJoints: RigJointMap;
}

export const PELVIS_HIP_KINEMATIC_BLUEPRINTS: Readonly<
  Record<PelvisHipVariantId, PelvisHipKinematicBlueprint>
> = Object.freeze({
  'pelvis-mat-pelvic-curl': Object.freeze({
    variantId: 'pelvis-mat-pelvic-curl',
    archetypeId: 'pelvis-curl',
    apparatusGeometry: Object.freeze({
      apparatus: 'mat',
      apparatusKind: 'mat-pelvic-curl',
      supportSurfaceY: 144,
      supportSurfaceKo: '매트 수파인 수평 지지면 (y:144)',
      footSupportKo: '좌골 너비 양발 뒤꿈치·발바닥 매트 고정 (250,148)',
      footContactPoint: pelvisPt(250, 148),
      headrestState: 'flat',
      carriageStopperChecked: false,
      carriageOffsetsPx: Object.freeze([0, 0, 0]),
      hasFootbar: false,
      hasMiniBallProp: false,
      hasAngledTowerBar: false,
      hasSafetyStrap: false,
      hasBottomSpring: false,
      hasVerticalArmPosts: false,
      isSingleLegExtension: false,
      pelvisTiltDegByPhase: Object.freeze([8, 22, 0]),
    }),
    startJoints: makePelvisHipJointMap({
      head: { x: 54, y: 142 },
      neck: { x: 72, y: 142 },
      shoulder: { x: 92, y: 140 },
      elbow: { x: 126, y: 145 },
      wrist: { x: 158, y: 146 },
      hand: { x: 172, y: 146 },
      thoracic: { x: 124, y: 142 },
      lumbar: { x: 154, y: 142 },
      pelvis: { x: 184, y: 144 },
      hip: { x: 192, y: 143 },
      knee: { x: 226, y: 98 },
      ankle: { x: 256, y: 146 },
      heel: { x: 250, y: 148 },
      toe: { x: 272, y: 148 },
      farHip: { x: 192, y: 143 },
      farKnee: { x: 224, y: 98 },
      farAnkle: { x: 254, y: 146 },
      farToe: { x: 270, y: 148 },
    }),
    middleJoints: makePelvisHipJointMap({
      head: { x: 54, y: 142 },
      neck: { x: 72, y: 141 },
      shoulder: { x: 92, y: 140 },
      elbow: { x: 126, y: 145 },
      wrist: { x: 158, y: 146 },
      hand: { x: 172, y: 146 },
      thoracic: { x: 124, y: 128 },
      lumbar: { x: 154, y: 116 },
      pelvis: { x: 184, y: 103 },
      hip: { x: 192, y: 100 },
      knee: { x: 232, y: 84 },
      ankle: { x: 256, y: 146 },
      heel: { x: 250, y: 148 },
      toe: { x: 272, y: 148 },
      farHip: { x: 192, y: 100 },
      farKnee: { x: 230, y: 85 },
      farAnkle: { x: 254, y: 146 },
      farToe: { x: 270, y: 148 },
    }),
    endJoints: makePelvisHipJointMap({
      head: { x: 54, y: 142 },
      neck: { x: 72, y: 142 },
      shoulder: { x: 92, y: 140 },
      elbow: { x: 126, y: 145 },
      wrist: { x: 158, y: 146 },
      hand: { x: 172, y: 146 },
      thoracic: { x: 124, y: 142 },
      lumbar: { x: 154, y: 142 },
      pelvis: { x: 184, y: 144 },
      hip: { x: 192, y: 143 },
      knee: { x: 226, y: 98 },
      ankle: { x: 256, y: 146 },
      heel: { x: 250, y: 148 },
      toe: { x: 272, y: 148 },
      farHip: { x: 192, y: 143 },
      farKnee: { x: 224, y: 98 },
      farAnkle: { x: 254, y: 146 },
      farToe: { x: 270, y: 148 },
    }),
  }),

  'original-mat-bridge': Object.freeze({
    variantId: 'original-mat-bridge',
    archetypeId: 'pelvis-bridging',
    apparatusGeometry: Object.freeze({
      apparatus: 'mat',
      apparatusKind: 'mat-bridge',
      supportSurfaceY: 144,
      supportSurfaceKo: '매트 수파인 수평 지지면 (y:144)',
      footSupportKo: '양발 삼각 지지점(뒤꿈치·제1·5중족골) 수직 지면반력 (252,148)',
      footContactPoint: pelvisPt(252, 148),
      headrestState: 'flat',
      carriageStopperChecked: false,
      carriageOffsetsPx: Object.freeze([0, 0, 0]),
      hasFootbar: false,
      hasMiniBallProp: false,
      hasAngledTowerBar: false,
      hasSafetyStrap: false,
      hasBottomSpring: false,
      hasVerticalArmPosts: false,
      isSingleLegExtension: false,
      pelvisTiltDegByPhase: Object.freeze([0, 18, 0]),
    }),
    startJoints: makePelvisHipJointMap({
      head: { x: 54, y: 142 },
      neck: { x: 72, y: 142 },
      shoulder: { x: 92, y: 140 },
      elbow: { x: 128, y: 145 },
      wrist: { x: 160, y: 146 },
      hand: { x: 174, y: 146 },
      thoracic: { x: 124, y: 142 },
      lumbar: { x: 154, y: 142 },
      pelvis: { x: 184, y: 144 },
      hip: { x: 192, y: 143 },
      knee: { x: 228, y: 96 },
      ankle: { x: 258, y: 146 },
      heel: { x: 252, y: 148 },
      toe: { x: 274, y: 148 },
      farHip: { x: 192, y: 143 },
      farKnee: { x: 226, y: 96 },
      farAnkle: { x: 256, y: 146 },
      farToe: { x: 272, y: 148 },
    }),
    middleJoints: makePelvisHipJointMap({
      head: { x: 54, y: 142 },
      neck: { x: 72, y: 141 },
      shoulder: { x: 92, y: 140 },
      elbow: { x: 128, y: 145 },
      wrist: { x: 160, y: 146 },
      hand: { x: 174, y: 146 },
      thoracic: { x: 124, y: 127 },
      lumbar: { x: 154, y: 114 },
      pelvis: { x: 184, y: 101 },
      hip: { x: 192, y: 98 },
      knee: { x: 234, y: 80 },
      ankle: { x: 258, y: 146 },
      heel: { x: 252, y: 148 },
      toe: { x: 274, y: 148 },
      farHip: { x: 192, y: 98 },
      farKnee: { x: 232, y: 81 },
      farAnkle: { x: 256, y: 146 },
      farToe: { x: 272, y: 148 },
    }),
    endJoints: makePelvisHipJointMap({
      head: { x: 54, y: 142 },
      neck: { x: 72, y: 142 },
      shoulder: { x: 92, y: 140 },
      elbow: { x: 128, y: 145 },
      wrist: { x: 160, y: 146 },
      hand: { x: 174, y: 146 },
      thoracic: { x: 124, y: 142 },
      lumbar: { x: 154, y: 142 },
      pelvis: { x: 184, y: 144 },
      hip: { x: 192, y: 143 },
      knee: { x: 228, y: 96 },
      ankle: { x: 258, y: 146 },
      heel: { x: 252, y: 148 },
      toe: { x: 274, y: 148 },
      farHip: { x: 192, y: 143 },
      farKnee: { x: 226, y: 96 },
      farAnkle: { x: 256, y: 146 },
      farToe: { x: 272, y: 148 },
    }),
  }),

  'pelvis-mat-shoulder-bridge': Object.freeze({
    variantId: 'pelvis-mat-shoulder-bridge',
    archetypeId: 'shoulder-bridge',
    apparatusGeometry: Object.freeze({
      apparatus: 'mat',
      apparatusKind: 'mat-shoulder-bridge',
      supportSurfaceY: 144,
      supportSurfaceKo: '매트 수파인 견갑대·지지측 발 삼각 지지면 (y:144)',
      footSupportKo: '지지측 발(farAnkle: 256,146) 매트 고정 + 가동측 다리(ankle: 264,68) 사선 신전',
      footContactPoint: pelvisPt(256, 146),
      headrestState: 'flat',
      carriageStopperChecked: false,
      carriageOffsetsPx: Object.freeze([0, 0, 0]),
      hasFootbar: false,
      hasMiniBallProp: false,
      hasAngledTowerBar: false,
      hasSafetyStrap: false,
      hasBottomSpring: false,
      hasVerticalArmPosts: false,
      isSingleLegExtension: true,
      pelvisTiltDegByPhase: Object.freeze([0, 18, 0]),
    }),
    startJoints: makePelvisHipJointMap({
      head: { x: 54, y: 142 },
      neck: { x: 72, y: 142 },
      shoulder: { x: 92, y: 140 },
      elbow: { x: 128, y: 145 },
      wrist: { x: 162, y: 146 },
      hand: { x: 176, y: 146 },
      thoracic: { x: 124, y: 142 },
      lumbar: { x: 154, y: 142 },
      pelvis: { x: 184, y: 144 },
      hip: { x: 192, y: 143 },
      knee: { x: 226, y: 96 },
      ankle: { x: 256, y: 146 },
      heel: { x: 250, y: 148 },
      toe: { x: 272, y: 148 },
      farHip: { x: 192, y: 143 },
      farKnee: { x: 226, y: 96 },
      farAnkle: { x: 256, y: 146 },
      farToe: { x: 272, y: 148 },
    }),
    middleJoints: makePelvisHipJointMap({
      head: { x: 54, y: 142 },
      neck: { x: 72, y: 141 },
      shoulder: { x: 92, y: 140 },
      elbow: { x: 128, y: 145 },
      wrist: { x: 162, y: 146 },
      hand: { x: 176, y: 146 },
      thoracic: { x: 124, y: 127 },
      lumbar: { x: 154, y: 114 },
      pelvis: { x: 184, y: 101 },
      hip: { x: 192, y: 98 },
      knee: { x: 228, y: 83 },
      ankle: { x: 264, y: 68 },
      heel: { x: 260, y: 72 },
      toe: { x: 278, y: 61 },
      farHip: { x: 192, y: 98 },
      farKnee: { x: 228, y: 90 },
      farAnkle: { x: 256, y: 146 },
      farToe: { x: 272, y: 148 },
    }),
    endJoints: makePelvisHipJointMap({
      head: { x: 54, y: 142 },
      neck: { x: 72, y: 142 },
      shoulder: { x: 92, y: 140 },
      elbow: { x: 128, y: 145 },
      wrist: { x: 162, y: 146 },
      hand: { x: 176, y: 146 },
      thoracic: { x: 124, y: 142 },
      lumbar: { x: 154, y: 142 },
      pelvis: { x: 184, y: 144 },
      hip: { x: 192, y: 143 },
      knee: { x: 226, y: 96 },
      ankle: { x: 256, y: 146 },
      heel: { x: 250, y: 148 },
      toe: { x: 272, y: 148 },
      farHip: { x: 192, y: 143 },
      farKnee: { x: 226, y: 96 },
      farAnkle: { x: 256, y: 146 },
      farToe: { x: 272, y: 148 },
    }),
  }),

  'original-reformer-supported-bridge': Object.freeze({
    variantId: 'original-reformer-supported-bridge',
    archetypeId: 'reformer-supported-bridge-isolated',
    apparatusGeometry: Object.freeze({
      apparatus: 'reformer',
      apparatusKind: 'reformer-supported-bridge',
      supportSurfaceY: 143,
      supportSurfaceKo: '리포머 캐리지 베드(y:143) · 헤드레스트 Flat · 홈 스토퍼 고정 점검',
      footSupportKo: '고정 풋바 상단 양발 뒤꿈치·발아치 지지 (266,126)',
      footContactPoint: pelvisPt(266, 126),
      headrestState: 'flat',
      carriageStopperChecked: true,
      carriageOffsetsPx: Object.freeze([0, 2, 0]),
      hasFootbar: true,
      footbarPoint: pelvisPt(266, 126),
      shoulderBlockX: 74,
      hasMiniBallProp: false,
      hasAngledTowerBar: false,
      hasSafetyStrap: false,
      hasBottomSpring: false,
      hasVerticalArmPosts: false,
      isSingleLegExtension: false,
      pelvisTiltDegByPhase: Object.freeze([0, 16, 0]),
    }),
    startJoints: makePelvisHipJointMap({
      head: { x: 52, y: 141 },
      neck: { x: 68, y: 141 },
      shoulder: { x: 88, y: 139 },
      elbow: { x: 122, y: 142 },
      wrist: { x: 152, y: 143 },
      hand: { x: 166, y: 143 },
      thoracic: { x: 118, y: 142 },
      lumbar: { x: 148, y: 142 },
      pelvis: { x: 178, y: 143 },
      hip: { x: 186, y: 142 },
      knee: { x: 226, y: 92 },
      ankle: { x: 262, y: 122 },
      heel: { x: 266, y: 126 },
      toe: { x: 276, y: 118 },
      farHip: { x: 186, y: 142 },
      farKnee: { x: 224, y: 92 },
      farAnkle: { x: 260, y: 122 },
      farToe: { x: 274, y: 118 },
    }),
    middleJoints: makePelvisHipJointMap({
      head: { x: 52, y: 141 },
      neck: { x: 68, y: 140 },
      shoulder: { x: 88, y: 139 },
      elbow: { x: 122, y: 142 },
      wrist: { x: 152, y: 143 },
      hand: { x: 166, y: 143 },
      thoracic: { x: 118, y: 126 },
      lumbar: { x: 148, y: 112 },
      pelvis: { x: 178, y: 99 },
      hip: { x: 186, y: 95 },
      knee: { x: 228, y: 76 },
      ankle: { x: 262, y: 122 },
      heel: { x: 266, y: 126 },
      toe: { x: 276, y: 118 },
      farHip: { x: 186, y: 95 },
      farKnee: { x: 226, y: 77 },
      farAnkle: { x: 260, y: 122 },
      farToe: { x: 274, y: 118 },
    }),
    endJoints: makePelvisHipJointMap({
      head: { x: 52, y: 141 },
      neck: { x: 68, y: 141 },
      shoulder: { x: 88, y: 139 },
      elbow: { x: 122, y: 142 },
      wrist: { x: 152, y: 143 },
      hand: { x: 166, y: 143 },
      thoracic: { x: 118, y: 142 },
      lumbar: { x: 148, y: 142 },
      pelvis: { x: 178, y: 143 },
      hip: { x: 186, y: 142 },
      knee: { x: 226, y: 92 },
      ankle: { x: 262, y: 122 },
      heel: { x: 266, y: 126 },
      toe: { x: 276, y: 118 },
      farHip: { x: 186, y: 142 },
      farKnee: { x: 224, y: 92 },
      farAnkle: { x: 260, y: 122 },
      farToe: { x: 274, y: 118 },
    }),
  }),

  'ex-bridging-01': Object.freeze({
    variantId: 'ex-bridging-01',
    archetypeId: 'reformer-bottom-lift-hamstring-curl',
    apparatusGeometry: Object.freeze({
      apparatus: 'reformer',
      apparatusKind: 'reformer-bottom-lift',
      supportSurfaceY: 143,
      supportSurfaceKo: '리포머 캐리지 베드(y:143) · 헤드레스트 Flat · 거상 시 홈 스토퍼 체크 및 정점 컬 활주',
      footSupportKo: '고정 풋바 상단 뒤꿈치 견인 지지 (266,126) + 무릎 미니볼 조임',
      footContactPoint: pelvisPt(266, 126),
      headrestState: 'flat',
      carriageStopperChecked: true,
      carriageOffsetsPx: Object.freeze([0, 18, 0]),
      hasFootbar: true,
      footbarPoint: pelvisPt(266, 126),
      shoulderBlockX: 74,
      hasMiniBallProp: true,
      hasAngledTowerBar: false,
      hasSafetyStrap: false,
      hasBottomSpring: false,
      hasVerticalArmPosts: false,
      isSingleLegExtension: false,
      pelvisTiltDegByPhase: Object.freeze([4, 20, 0]),
    }),
    startJoints: makePelvisHipJointMap({
      head: { x: 52, y: 141 },
      neck: { x: 68, y: 141 },
      shoulder: { x: 88, y: 139 },
      elbow: { x: 122, y: 142 },
      wrist: { x: 152, y: 143 },
      hand: { x: 166, y: 143 },
      thoracic: { x: 118, y: 142 },
      lumbar: { x: 148, y: 142 },
      pelvis: { x: 178, y: 143 },
      hip: { x: 186, y: 142 },
      knee: { x: 226, y: 92 },
      ankle: { x: 262, y: 122 },
      heel: { x: 266, y: 126 },
      toe: { x: 276, y: 118 },
      farHip: { x: 186, y: 142 },
      farKnee: { x: 224, y: 92 },
      farAnkle: { x: 260, y: 122 },
      farToe: { x: 274, y: 118 },
    }),
    middleJoints: makePelvisHipJointMap({
      head: { x: 58, y: 141 },
      neck: { x: 74, y: 140 },
      shoulder: { x: 94, y: 139 },
      elbow: { x: 128, y: 142 },
      wrist: { x: 158, y: 143 },
      hand: { x: 172, y: 143 },
      thoracic: { x: 124, y: 126 },
      lumbar: { x: 154, y: 113 },
      pelvis: { x: 184, y: 100 },
      hip: { x: 192, y: 97 },
      knee: { x: 236, y: 78 },
      ankle: { x: 262, y: 122 },
      heel: { x: 266, y: 126 },
      toe: { x: 276, y: 118 },
      farHip: { x: 192, y: 97 },
      farKnee: { x: 234, y: 79 },
      farAnkle: { x: 260, y: 122 },
      farToe: { x: 274, y: 118 },
    }),
    endJoints: makePelvisHipJointMap({
      head: { x: 52, y: 141 },
      neck: { x: 68, y: 141 },
      shoulder: { x: 88, y: 139 },
      elbow: { x: 122, y: 142 },
      wrist: { x: 152, y: 143 },
      hand: { x: 166, y: 143 },
      thoracic: { x: 118, y: 142 },
      lumbar: { x: 148, y: 142 },
      pelvis: { x: 178, y: 143 },
      hip: { x: 186, y: 142 },
      knee: { x: 226, y: 92 },
      ankle: { x: 262, y: 122 },
      heel: { x: 266, y: 126 },
      toe: { x: 276, y: 118 },
      farHip: { x: 186, y: 142 },
      farKnee: { x: 224, y: 92 },
      farAnkle: { x: 260, y: 122 },
      farToe: { x: 274, y: 118 },
    }),
  }),

  'ex-bridging-02': Object.freeze({
    variantId: 'ex-bridging-02',
    archetypeId: 'cadillac-tower-bar-shoulder-bridge',
    apparatusGeometry: Object.freeze({
      apparatus: 'cadillac',
      apparatusKind: 'cadillac-tower-bar',
      supportSurfaceY: 143,
      supportSurfaceKo: '캐딜락 테이블 매트(y:143) · 하단 스프링 + 안전 스트랩 경사 타워바 지지',
      footSupportKo: '풋 엔드 경사 타워바 상단 양발 아치 훅 지지 (244,82)',
      footContactPoint: pelvisPt(244, 82),
      headrestState: 'flat',
      carriageStopperChecked: false,
      carriageOffsetsPx: Object.freeze([0, 6, 0]),
      hasFootbar: false,
      hasMiniBallProp: false,
      hasAngledTowerBar: true,
      towerBarPivot: pelvisPt(286, 145),
      towerBarTip: pelvisPt(240, 82),
      hasSafetyStrap: true,
      hasBottomSpring: true,
      hasVerticalArmPosts: false,
      isSingleLegExtension: false,
      pelvisTiltDegByPhase: Object.freeze([6, 24, 0]),
    }),
    startJoints: makePelvisHipJointMap({
      head: { x: 54, y: 141 },
      neck: { x: 72, y: 141 },
      shoulder: { x: 90, y: 140 },
      elbow: { x: 124, y: 143 },
      wrist: { x: 154, y: 144 },
      hand: { x: 168, y: 144 },
      thoracic: { x: 122, y: 142 },
      lumbar: { x: 152, y: 142 },
      pelvis: { x: 182, y: 143 },
      hip: { x: 190, y: 142 },
      knee: { x: 218, y: 96 },
      ankle: { x: 242, y: 88 },
      heel: { x: 238, y: 94 },
      toe: { x: 252, y: 82 },
      farHip: { x: 190, y: 142 },
      farKnee: { x: 216, y: 97 },
      farAnkle: { x: 240, y: 89 },
      farToe: { x: 250, y: 83 },
    }),
    middleJoints: makePelvisHipJointMap({
      head: { x: 54, y: 141 },
      neck: { x: 72, y: 140 },
      shoulder: { x: 90, y: 140 },
      elbow: { x: 124, y: 143 },
      wrist: { x: 154, y: 144 },
      hand: { x: 168, y: 144 },
      thoracic: { x: 118, y: 124 },
      lumbar: { x: 146, y: 108 },
      pelvis: { x: 174, y: 92 },
      hip: { x: 182, y: 87 },
      knee: { x: 218, y: 66 },
      ankle: { x: 244, y: 82 },
      heel: { x: 240, y: 88 },
      toe: { x: 254, y: 76 },
      farHip: { x: 182, y: 87 },
      farKnee: { x: 216, y: 67 },
      farAnkle: { x: 242, y: 83 },
      farToe: { x: 252, y: 77 },
    }),
    endJoints: makePelvisHipJointMap({
      head: { x: 54, y: 141 },
      neck: { x: 72, y: 141 },
      shoulder: { x: 90, y: 140 },
      elbow: { x: 124, y: 143 },
      wrist: { x: 154, y: 144 },
      hand: { x: 168, y: 144 },
      thoracic: { x: 122, y: 142 },
      lumbar: { x: 152, y: 142 },
      pelvis: { x: 182, y: 143 },
      hip: { x: 190, y: 142 },
      knee: { x: 218, y: 96 },
      ankle: { x: 242, y: 88 },
      heel: { x: 238, y: 94 },
      toe: { x: 252, y: 82 },
      farHip: { x: 190, y: 142 },
      farKnee: { x: 216, y: 97 },
      farAnkle: { x: 240, y: 89 },
      farToe: { x: 250, y: 83 },
    }),
  }),

  'original-cadillac-table-bridge': Object.freeze({
    variantId: 'original-cadillac-table-bridge',
    archetypeId: 'cadillac-table-bridge-isolated',
    apparatusGeometry: Object.freeze({
      apparatus: 'cadillac',
      apparatusKind: 'cadillac-table-bridge',
      supportSurfaceY: 143,
      supportSurfaceKo: '캐딜락 수평 테이블 베드(y:143) · 수직 기둥(Upright Poles) 양손 지지 · 무스프링',
      footSupportKo: '수평 캐딜락 테이블 상면 양발 평행 접지 (250,144 · 가동 바 미사용)',
      footContactPoint: pelvisPt(250, 144),
      headrestState: 'flat',
      carriageStopperChecked: false,
      carriageOffsetsPx: Object.freeze([0, 0, 0]),
      hasFootbar: false,
      hasMiniBallProp: false,
      hasAngledTowerBar: false,
      hasSafetyStrap: false,
      hasBottomSpring: false,
      hasVerticalArmPosts: true,
      verticalPostX: 26,
      isSingleLegExtension: false,
      pelvisTiltDegByPhase: Object.freeze([0, 16, 0]),
    }),
    startJoints: makePelvisHipJointMap({
      head: { x: 54, y: 141 },
      neck: { x: 72, y: 141 },
      shoulder: { x: 92, y: 140 },
      elbow: { x: 68, y: 134 },
      wrist: { x: 44, y: 124 },
      hand: { x: 34, y: 118 },
      thoracic: { x: 122, y: 142 },
      lumbar: { x: 152, y: 142 },
      pelvis: { x: 182, y: 143 },
      hip: { x: 190, y: 142 },
      knee: { x: 226, y: 96 },
      ankle: { x: 254, y: 140 },
      heel: { x: 250, y: 144 },
      toe: { x: 268, y: 144 },
      farHip: { x: 190, y: 142 },
      farKnee: { x: 224, y: 96 },
      farAnkle: { x: 252, y: 140 },
      farToe: { x: 266, y: 144 },
    }),
    middleJoints: makePelvisHipJointMap({
      head: { x: 54, y: 141 },
      neck: { x: 72, y: 140 },
      shoulder: { x: 92, y: 140 },
      elbow: { x: 68, y: 134 },
      wrist: { x: 44, y: 124 },
      hand: { x: 34, y: 118 },
      thoracic: { x: 124, y: 127 },
      lumbar: { x: 154, y: 115 },
      pelvis: { x: 184, y: 103 },
      hip: { x: 192, y: 100 },
      knee: { x: 232, y: 84 },
      ankle: { x: 254, y: 140 },
      heel: { x: 250, y: 144 },
      toe: { x: 268, y: 144 },
      farHip: { x: 192, y: 100 },
      farKnee: { x: 230, y: 85 },
      farAnkle: { x: 252, y: 140 },
      farToe: { x: 266, y: 144 },
    }),
    endJoints: makePelvisHipJointMap({
      head: { x: 54, y: 141 },
      neck: { x: 72, y: 141 },
      shoulder: { x: 92, y: 140 },
      elbow: { x: 68, y: 134 },
      wrist: { x: 44, y: 124 },
      hand: { x: 34, y: 118 },
      thoracic: { x: 122, y: 142 },
      lumbar: { x: 152, y: 142 },
      pelvis: { x: 182, y: 143 },
      hip: { x: 190, y: 142 },
      knee: { x: 226, y: 96 },
      ankle: { x: 254, y: 140 },
      heel: { x: 250, y: 144 },
      toe: { x: 268, y: 144 },
      farHip: { x: 190, y: 142 },
      farKnee: { x: 224, y: 96 },
      farAnkle: { x: 252, y: 140 },
      farToe: { x: 266, y: 144 },
    }),
  }),
});

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpPoint(p1: Point2D, p2: Point2D, t: number): Point2D {
  return pelvisPt(lerp(p1.x, p2.x, t), lerp(p1.y, p2.y, t));
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * Evaluates a continuous 2D pose at `progress` in `[0, 1]` with sequential
 * spinal articulation:
 * - Roll-up (`0 -> 0.5`): pelvis/hip lead first, followed by lumbar, then thoracic.
 * - Roll-down (`0.5 -> 1.0`): thoracic softens first, followed by lumbar, then pelvis
 *   landing completely on the mat/carriage/table support surface (`y = 143..144`) in neutral.
 */
export function evaluatePelvisHipContinuousPose(
  variantOrArchetypeId: string,
  progress: number,
): PelvisHipContinuousPose {
  const variantId = resolvePelvisHipVariantId(variantOrArchetypeId);
  const blueprint = PELVIS_HIP_KINEMATIC_BLUEPRINTS[variantId];
  const p = clamp01(progress);

  let nearestPhase: VisualPhaseId = 'start';
  let phaseLabelKo = '시작 자세 (수파인 중립 준비)';
  if (p >= 0.35 && p <= 0.65) {
    nearestPhase = 'middle';
    phaseLabelKo = '중간 자세 (브리지 사선 정점)';
  } else if (p > 0.65) {
    nearestPhase = 'end';
    phaseLabelKo = '끝 자세 (순차 분절 하강 및 지지면 완전 복귀)';
  }

  let joints: RigJointMap;
  let pelvisTiltDeg: number;
  let carriageOffsetPx: number;

  const [startTilt, midTilt, endTilt] = blueprint.apparatusGeometry.pelvisTiltDegByPhase;
  const [startOffset, midOffset, endOffset] = blueprint.apparatusGeometry.carriageOffsetsPx;

  if (p <= 0) {
    joints = blueprint.startJoints;
    pelvisTiltDeg = startTilt;
    carriageOffsetPx = startOffset;
  } else if (Math.abs(p - 0.5) < 1e-6) {
    joints = blueprint.middleJoints;
    pelvisTiltDeg = midTilt;
    carriageOffsetPx = midOffset;
  } else if (p >= 1) {
    joints = blueprint.endJoints;
    pelvisTiltDeg = endTilt;
    carriageOffsetPx = endOffset;
  } else if (p < 0.5) {
    const u = p / 0.5;
    // Sequential roll-up: pelvis leads (early curve), lumbar mid, thoracic last
    const tPelvis = clamp01(Math.pow(u, 0.75));
    const tLumbar = clamp01(u);
    const tThoracic = clamp01(Math.pow(u, 1.35));
    const s = blueprint.startJoints;
    const m = blueprint.middleJoints;
    joints = makePelvisHipJointMap({
      head: lerpPoint(s.head, m.head, u),
      neck: lerpPoint(s.neck, m.neck, u),
      shoulder: lerpPoint(s.shoulder, m.shoulder, u),
      elbow: lerpPoint(s.elbow, m.elbow, u),
      wrist: lerpPoint(s.wrist, m.wrist, u),
      hand: lerpPoint(s.hand, m.hand, u),
      thoracic: lerpPoint(s.thoracic, m.thoracic, tThoracic),
      lumbar: lerpPoint(s.lumbar, m.lumbar, tLumbar),
      pelvis: lerpPoint(s.pelvis, m.pelvis, tPelvis),
      hip: lerpPoint(s.hip, m.hip, tPelvis),
      knee: lerpPoint(s.knee, m.knee, u),
      ankle: lerpPoint(s.ankle, m.ankle, u),
      heel: lerpPoint(s.heel, m.heel, u),
      toe: lerpPoint(s.toe, m.toe, u),
      ...(s.farHip && m.farHip ? { farHip: lerpPoint(s.farHip, m.farHip, tPelvis) } : {}),
      ...(s.farKnee && m.farKnee ? { farKnee: lerpPoint(s.farKnee, m.farKnee, u) } : {}),
      ...(s.farAnkle && m.farAnkle ? { farAnkle: lerpPoint(s.farAnkle, m.farAnkle, u) } : {}),
      ...(s.farToe && m.farToe ? { farToe: lerpPoint(s.farToe, m.farToe, u) } : {}),
    });
    pelvisTiltDeg = Math.round(lerp(startTilt, midTilt, u) * 10) / 10;
    carriageOffsetPx = Math.round(lerp(startOffset, midOffset, u) * 10) / 10;
  } else {
    const u = (p - 0.5) / 0.5;
    // Sequential roll-down: thoracic descends first, lumbar second, pelvis lands last into neutral
    const tThoracic = clamp01(Math.pow(u, 0.7));
    const tLumbar = clamp01(u);
    const tPelvis = clamp01(Math.pow(u, 1.35));
    const m = blueprint.middleJoints;
    const e = blueprint.endJoints;
    joints = makePelvisHipJointMap({
      head: lerpPoint(m.head, e.head, u),
      neck: lerpPoint(m.neck, e.neck, u),
      shoulder: lerpPoint(m.shoulder, e.shoulder, u),
      elbow: lerpPoint(m.elbow, e.elbow, u),
      wrist: lerpPoint(m.wrist, e.wrist, u),
      hand: lerpPoint(m.hand, e.hand, u),
      thoracic: lerpPoint(m.thoracic, e.thoracic, tThoracic),
      lumbar: lerpPoint(m.lumbar, e.lumbar, tLumbar),
      pelvis: lerpPoint(m.pelvis, e.pelvis, tPelvis),
      hip: lerpPoint(m.hip, e.hip, tPelvis),
      knee: lerpPoint(m.knee, e.knee, u),
      ankle: lerpPoint(m.ankle, e.ankle, u),
      heel: lerpPoint(m.heel, e.heel, u),
      toe: lerpPoint(m.toe, e.toe, u),
      ...(m.farHip && e.farHip ? { farHip: lerpPoint(m.farHip, e.farHip, tPelvis) } : {}),
      ...(m.farKnee && e.farKnee ? { farKnee: lerpPoint(m.farKnee, e.farKnee, u) } : {}),
      ...(m.farAnkle && e.farAnkle ? { farAnkle: lerpPoint(m.farAnkle, e.farAnkle, u) } : {}),
      ...(m.farToe && e.farToe ? { farToe: lerpPoint(m.farToe, e.farToe, u) } : {}),
    });
    pelvisTiltDeg = Math.round(lerp(midTilt, endTilt, u) * 10) / 10;
    carriageOffsetPx = Math.round(lerp(midOffset, endOffset, u) * 10) / 10;
  }

  return Object.freeze({
    variantId,
    progress: p,
    nearestPhase,
    phaseLabelKo,
    joints,
    pelvisTiltDeg,
    carriageOffsetPx,
    collinearity: computePelvisHipCollinearity(joints),
    supportCheck: computePelvisHipEndSupportCheck(
      joints,
      blueprint.apparatusGeometry.supportSurfaceY,
    ),
  });
}

export function validatePelvisHipVariantAsset(
  asset: CatalogMovementVisualAsset,
): PelvisHipVariantValidationReport {
  const variantId = resolvePelvisHipVariantId(asset.exerciseId);
  const blueprint = PELVIS_HIP_KINEMATIC_BLUEPRINTS[variantId];
  const hasThreePhases = Boolean(
    asset.phases.start && asset.phases.middle && asset.phases.end,
  );
  const endPhaseSupport = computePelvisHipEndSupportCheck(
    asset.phases.end.joints,
    blueprint.apparatusGeometry.supportSurfaceY,
  );
  const middlePhaseCollinearity = computePelvisHipCollinearity(
    asset.phases.middle.joints,
  );
  const truthfulnessVerified =
    asset.anatomicalAccuracyAssumed === false &&
    PELVIS_HIP_TRUTHFULNESS_METADATA.professionalReviewCount === 0 &&
    PELVIS_HIP_TRUTHFULNESS_METADATA.sourceFrameMappings === 0 &&
    PELVIS_HIP_TRUTHFULNESS_METADATA.motionCaptureBacked === false;

  const isValid =
    hasThreePhases &&
    endPhaseSupport.isGroundedOnSupport &&
    middlePhaseCollinearity.isCollinear &&
    !middlePhaseCollinearity.hasRibFlare &&
    truthfulnessVerified;

  return Object.freeze({
    variantId: asset.exerciseId,
    archetypeId: asset.archetypeId,
    hasThreePhases,
    endPhaseSupport,
    middlePhaseCollinearity,
    truthfulnessVerified,
    isValid,
  });
}
