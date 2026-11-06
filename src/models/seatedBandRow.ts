/** SPDX-License-Identifier: MIT. Original analytic schematic; no copied media or motion. */
import type { AnatomicalSide, DraftPhase, Point3, ScreenPoint } from './types';

export const SEATED_BAND_ROW_DRAFT_ID = 'floor-seated-band-row' as const;
export const SEATED_BAND_ROW_MODEL_VERSION = 'original-seated-band-row-0.1.0';
export interface SeatedBandRowPhase extends DraftPhase {
  readonly displayBehavior: 'hold' | 'move' | 'unknown';
}

/** All phase fractions, pauses and dimensions below are original drawing choices. */
export const SEATED_BAND_ROW_PHASES: readonly SeatedBandRowPhase[] = Object.freeze([
  {
    id: 'setup',
    label: '바닥 앉기 · 양팔 편 배치',
    start: 0,
    end: 0.12,
    sample: 0.06,
    displayBehavior: 'hold',
  },
  {
    id: 'move',
    label: '양팔꿈치를 굽혀 밴드 끝을 몸 쪽으로',
    start: 0.12,
    end: 0.42,
    sample: 0.29,
    displayBehavior: 'move',
  },
  {
    id: 'turn',
    label: '손이 가까워진 저작 배치',
    start: 0.42,
    end: 0.58,
    sample: 0.5,
    displayBehavior: 'hold',
  },
  {
    id: 'return',
    label: '양팔을 펴며 처음 배치로',
    start: 0.58,
    end: 0.88,
    sample: 0.73,
    displayBehavior: 'move',
  },
  {
    id: 'finish',
    label: '처음 배치로 돌아옴',
    start: 0.88,
    end: 1,
    sample: 0.94,
    displayBehavior: 'hold',
  },
]);

export const SEATED_BAND_ROW_DRAWING_PARAMETERS = Object.freeze({
  upperArmLength: 72,
  forearmLength: 70,
  handStartX: 272,
  handEndX: 160,
  handStartZ: 172,
  handEndZ: 140,
  heelRadius: 8,
  solePlaneX: 333,
  solePatchZ: 34,
  viewportWidth: 640,
  viewportHeight: 360,
});

export const SEATED_BAND_ROW_PROVENANCE = Object.freeze({
  authoringStatus: 'isolated-staged-original-draft',
  authorship:
    'Original analytic joint solver, contact topology and native SVG; no source media, frames, tracing or motion capture',
  sourceId: 'harvard-floor-seated-band-row-v1',
  sourceUrl:
    'https://www.harvardhealth.org/healthy-aging-and-longevity/simple-core-strengtheners-for-every-day-of-the-week',
  sourceTitle: 'Simple core strengtheners for every day of the week',
  publisher: 'Harvard Health Publishing',
  byline: 'Heidi Godman',
  sourcePublishedDate: '2022-09-01',
  sourceCheckedDate: '2026-11-05',
  factualRecordSha256: '3fc44322a735ac2ed6d31947c9177181fcb930172ced2fff7687c43619d85d7a',
  factualRecordScope:
    'canonical JSON of factualRecord only in research/selected-pattern-source-ledger.json; not a publisher, asset or review hash',
  sourceInstructionFacts:
    'Floor sitting, legs extended in front, a long elastic band around soles, each end in a hand; bend elbows and pull toward body with back straight and elbows close, then straighten arms',
  sourcePopulation:
    'Healthy-aging education; exact age/diagnosis unspecified; publication editorial review is not model review',
  authoredChoices:
    'Foot orientation and sole patches, seated pelvis and heel floor patches, fixed torso/legs, exact grip and hand/elbow paths, band routing geometry, projection, all numerical dimensions, phase fractions and timing',
  unknown:
    'Individual suitability, exact contact pressures, locked knees, manufacturer band construction, rest length, tension/load, dimensions and safe setup',
  variantBoundary:
    'Floor-seated source only; ordinary-chair NHS alternative and independent fixed anchors are not merged',
  externalSourceRights:
    'Reference-only; no source media embedded or copied; no reuse license claimed',
  originalCodeLicense: 'MIT; external source works excluded',
  professionalReviewCount: 0,
  approvedCatalogMappings: 0,
  exactAssetCount: 0,
  exactSourceVariantMatched: false,
  sourceVariantReconciliationRequired: true,
  autoRecommendationEligible: false,
});

export interface SeatedBandRowOptions {
  activeSide?: AnatomicalSide;
  mirrored?: boolean;
}
export interface SeatedBandRowArm {
  anatomicalSide: AnatomicalSide;
  role: 'bilateral';
  shoulder: Point3;
  elbow: Point3;
  hand: Point3;
}
export interface SeatedBandRowLeg {
  anatomicalSide: AnatomicalSide;
  hip: Point3;
  knee: Point3;
  ankle: Point3;
  heel: Point3;
  toe: Point3;
  solePatch: Point3;
}
export interface SeatedBandRowWorld {
  pelvisCenter: Point3;
  shoulderCenter: Point3;
  neck: Point3;
  headCenter: Point3;
  leftHip: Point3;
  leftKnee: Point3;
  leftAnkle: Point3;
  leftHeel: Point3;
  leftToe: Point3;
  leftSole: Point3;
  leftShoulder: Point3;
  leftElbow: Point3;
  leftHand: Point3;
  rightHip: Point3;
  rightKnee: Point3;
  rightAnkle: Point3;
  rightHeel: Point3;
  rightToe: Point3;
  rightSole: Point3;
  rightShoulder: Point3;
  rightElbow: Point3;
  rightHand: Point3;
}
export interface SeatedBandRowContact {
  id: string;
  anatomicalSide: AnatomicalSide;
  role: 'seated-support' | 'heel-support' | 'sole-band' | 'hand-band-end';
  target: 'floor' | 'band-middle' | 'band-end';
  state: 'fixed' | 'attached';
  evidence: 'authored-contact-patch';
  sourceContactType: 'seated-floor' | 'unspecified-foot-floor' | 'soles-band' | 'hand-band-end';
  bodyCenter: Point3;
  surfaceOffset: Point3;
  point: Point3;
  targetPoint: Point3;
}
export interface SeatedBandRowPose {
  draftId: typeof SEATED_BAND_ROW_DRAFT_ID;
  intendedComparisonId: 'original-mat-band-row';
  modelVersion: typeof SEATED_BAND_ROW_MODEL_VERSION;
  progress: number;
  amount: number;
  phase: SeatedBandRowPhase;
  phaseLabelKo: string;
  sideMode: 'bilateral';
  activeSide: AnatomicalSide;
  arms: Record<AnatomicalSide, SeatedBandRowArm>;
  legs: Record<AnatomicalSide, SeatedBandRowLeg>;
  world: SeatedBandRowWorld;
  screen: Record<keyof SeatedBandRowWorld, ScreenPoint>;
  torso: readonly Point3[];
  floor: { topZ: 0; corners: readonly Point3[] };
  contacts: readonly SeatedBandRowContact[];
  band: {
    kind: 'long-elastic-resistance-band';
    productConstruction: 'unspecified';
    closedLoopProductClaimed: false;
    points: readonly Point3[];
    segments: readonly (readonly [Point3, Point3])[];
    visualPathLength: number;
    force: 'not-modeled';
    restLength: 'not-established';
    configuration: 'authored-open-path-around-soles';
  };
  camera: { projection: 'authored-oblique-orthographic'; mirrored: boolean; width: 640 };
  review: { status: 'unreviewed'; professionalReviewCount: 0 };
  exactSourceVariantMatched: false;
  sourceVariantReconciliationRequired: true;
  approvedCatalogMapping: false;
  exactAssetReady: false;
  autoRecommendationEligible: false;
  safetyAssessment: 'unassessed';
}

const add = (a: Point3, b: Point3): Point3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const distance = (a: Point3, b: Point3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** x forward, y anatomical left positive, z above floor. Mirroring changes projection only. */
export function projectSeatedBandRowPoint(p: Point3, mirrored = false): ScreenPoint {
  const x = 65 + p[0] * 1.04 + p[1] * 0.48;
  return [mirrored ? 640 - x : x, 310 + p[1] * 0.27 - p[2] * 0.84];
}

function amountAt(p: number): number {
  const smooth = (t: number) => t * t * (3 - 2 * t);
  if (p <= 0.12 || p >= 0.88) return 0;
  if (p < 0.42) return smooth((p - 0.12) / 0.3);
  if (p <= 0.58) return 1;
  return 1 - smooth((p - 0.58) / 0.3);
}

/** Original two-circle elbow solution in the arm's vertical plane; elbows stay near the body. */
function makeArm(side: AnatomicalSide, q: number): SeatedBandRowArm {
  const y = side === 'left' ? 31 : -31;
  const shoulder: Point3 = [130, y, 172];
  const hand: Point3 = [272 - 112 * q, y, 172 - 32 * q];
  const dx = hand[0] - shoulder[0];
  const dz = hand[2] - shoulder[2];
  const d = Math.hypot(dx, dz);
  const a = SEATED_BAND_ROW_DRAWING_PARAMETERS.upperArmLength;
  const b = SEATED_BAND_ROW_DRAWING_PARAMETERS.forearmLength;
  if (d > a + b + 1e-9 || d < Math.abs(a - b) - 1e-9 || d < 1e-9)
    throw new RangeError('Authored hand target is outside the arm rig.');
  const along = (a * a - b * b + d * d) / (2 * d);
  const height = Math.sqrt(Math.max(0, a * a - along * along));
  const elbow: Point3 = [
    shoulder[0] + (dx / d) * along + (dz / d) * height,
    y,
    shoulder[2] + (dz / d) * along - (dx / d) * height,
  ];
  return { anatomicalSide: side, role: 'bilateral', shoulder, elbow, hand };
}

function makeLeg(side: AnatomicalSide): SeatedBandRowLeg {
  const y = side === 'left' ? 18 : -18;
  return {
    anatomicalSide: side,
    hip: [130, y, 28],
    knee: [222, y, 18],
    ankle: [312, y, 18],
    heel: [325, y, 8],
    toe: [325, y, 60],
    solePatch: [333, y, 34],
  };
}

/** Pure sampling only. Parent owns all playback, interaction and timing. */
export function getSeatedBandRowPose(
  progress: number,
  { activeSide = 'right', mirrored = false }: SeatedBandRowOptions = {},
): SeatedBandRowPose {
  if (!Number.isFinite(progress)) throw new RangeError('progress must be finite');
  if (activeSide !== 'left' && activeSide !== 'right')
    throw new TypeError('unknown anatomical side');
  if (typeof mirrored !== 'boolean') throw new TypeError('mirrored must be boolean');
  const p = Math.max(0, Math.min(1, progress));
  const q = amountAt(p);
  const leftArm = makeArm('left', q),
    rightArm = makeArm('right', q);
  const leftLeg = makeLeg('left'),
    rightLeg = makeLeg('right');
  const world: SeatedBandRowWorld = {
    pelvisCenter: [130, 0, 28],
    shoulderCenter: [130, 0, 172],
    neck: [130, 0, 194],
    headCenter: [130, 0, 218],
    leftHip: leftLeg.hip,
    leftKnee: leftLeg.knee,
    leftAnkle: leftLeg.ankle,
    leftHeel: leftLeg.heel,
    leftToe: leftLeg.toe,
    leftSole: leftLeg.solePatch,
    leftShoulder: leftArm.shoulder,
    leftElbow: leftArm.elbow,
    leftHand: leftArm.hand,
    rightHip: rightLeg.hip,
    rightKnee: rightLeg.knee,
    rightAnkle: rightLeg.ankle,
    rightHeel: rightLeg.heel,
    rightToe: rightLeg.toe,
    rightSole: rightLeg.solePatch,
    rightShoulder: rightArm.shoulder,
    rightElbow: rightArm.elbow,
    rightHand: rightArm.hand,
  };
  const points: readonly Point3[] = [
    leftArm.hand,
    leftLeg.solePatch,
    rightLeg.solePatch,
    rightArm.hand,
  ];
  const segments = points
    .slice(1)
    .map((point, index): readonly [Point3, Point3] => [points[index], point]);
  const contacts: SeatedBandRowContact[] = [];
  for (const side of ['left', 'right'] as const) {
    const leg = side === 'left' ? leftLeg : rightLeg;
    const arm = side === 'left' ? leftArm : rightArm;
    const pelvisCenter: Point3 = [130, side === 'left' ? 12 : -12, 28];
    const pelvisOffset: Point3 = [0, 0, -28],
      heelOffset: Point3 = [0, 0, -8];
    const soleOffset: Point3 = [21, 0, 16];
    const contact = (
      role: SeatedBandRowContact['role'],
      target: SeatedBandRowContact['target'],
      sourceContactType: SeatedBandRowContact['sourceContactType'],
      bodyCenter: Point3,
      surfaceOffset: Point3,
      targetPoint: Point3,
    ): SeatedBandRowContact => ({
      id: `${side}-${role}`,
      anatomicalSide: side,
      role,
      target,
      state: target === 'floor' ? 'fixed' : 'attached',
      evidence: 'authored-contact-patch',
      sourceContactType,
      bodyCenter,
      surfaceOffset,
      point: add(bodyCenter, surfaceOffset),
      targetPoint,
    });
    contacts.push(
      contact('seated-support', 'floor', 'seated-floor', pelvisCenter, pelvisOffset, [
        130,
        pelvisCenter[1],
        0,
      ]),
      contact('heel-support', 'floor', 'unspecified-foot-floor', leg.heel, heelOffset, [
        325,
        leg.heel[1],
        0,
      ]),
      contact(
        'sole-band',
        'band-middle',
        'soles-band',
        leg.ankle,
        soleOffset,
        points[side === 'left' ? 1 : 2],
      ),
      contact(
        'hand-band-end',
        'band-end',
        'hand-band-end',
        arm.hand,
        [0, 0, 0],
        points[side === 'left' ? 0 : 3],
      ),
    );
  }
  const phase = SEATED_BAND_ROW_PHASES.find((item) => p < item.end) ?? SEATED_BAND_ROW_PHASES[4];
  return {
    draftId: SEATED_BAND_ROW_DRAFT_ID,
    intendedComparisonId: 'original-mat-band-row',
    modelVersion: SEATED_BAND_ROW_MODEL_VERSION,
    progress: p,
    amount: q,
    phase,
    phaseLabelKo: phase.label,
    sideMode: 'bilateral',
    activeSide,
    arms: { left: leftArm, right: rightArm },
    legs: { left: leftLeg, right: rightLeg },
    world,
    screen: Object.fromEntries(
      Object.entries(world).map(([key, point]) => [
        key,
        projectSeatedBandRowPoint(point, mirrored),
      ]),
    ) as Record<keyof SeatedBandRowWorld, ScreenPoint>,
    torso: [
      [114, -25, 0],
      [114, -32, 172],
      [146, -32, 172],
      [146, -25, 0],
      [114, 25, 0],
      [114, 32, 172],
      [146, 32, 172],
      [146, 25, 0],
    ],
    floor: {
      topZ: 0,
      corners: [
        [65, -65, 0],
        [395, -65, 0],
        [395, 65, 0],
        [65, 65, 0],
      ],
    },
    contacts,
    band: {
      kind: 'long-elastic-resistance-band',
      productConstruction: 'unspecified',
      closedLoopProductClaimed: false,
      points,
      segments,
      visualPathLength: segments.reduce((sum, [a, b]) => sum + distance(a, b), 0),
      force: 'not-modeled',
      restLength: 'not-established',
      configuration: 'authored-open-path-around-soles',
    },
    camera: { projection: 'authored-oblique-orthographic', mirrored, width: 640 },
    review: { status: 'unreviewed', professionalReviewCount: 0 },
    exactSourceVariantMatched: false,
    sourceVariantReconciliationRequired: true,
    approvedCatalogMapping: false,
    exactAssetReady: false,
    autoRecommendationEligible: false,
    safetyAssessment: 'unassessed',
  };
}
