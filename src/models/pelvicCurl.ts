/** SPDX-License-Identifier: MIT. Original articulated schematic; not source-measured anatomy. */
import type { AnatomicalSide, DraftPhase, Point3, ScreenPoint } from './types';

export const PELVIC_CURL_DRAFT_ID = 'articulated-pelvic-curl' as const;
export const PELVIC_CURL_MODEL_VERSION = 'original-articulated-pelvic-curl-0.1.0';
export interface PelvicCurlPhase extends DraftPhase {
  readonly displayBehavior: 'hold' | 'move' | 'unknown';
}
export const PELVIC_CURL_PHASES: readonly PelvicCurlPhase[] = Object.freeze([
  {
    id: 'setup',
    label: '무릎 굽힌 누운 배치',
    start: 0,
    end: 0.12,
    sample: 0.06,
    displayBehavior: 'hold',
  },
  {
    id: 'move',
    label: '골반 말림 뒤 척추 링크가 차례로 올라감',
    start: 0.12,
    end: 0.42,
    sample: 0.3,
    displayBehavior: 'move',
  },
  {
    id: 'turn',
    label: '저작한 높이에서 정지',
    start: 0.42,
    end: 0.58,
    sample: 0.5,
    displayBehavior: 'hold',
  },
  {
    id: 'return',
    label: '가슴 쪽부터 저작 척추 링크를 내림',
    start: 0.58,
    end: 0.88,
    sample: 0.7,
    displayBehavior: 'move',
  },
  {
    id: 'finish',
    label: '처음 누운 배치로 복귀',
    start: 0.88,
    end: 1,
    sample: 0.94,
    displayBehavior: 'hold',
  },
]);

const rad = (degrees: number) => (degrees * Math.PI) / 180;
export const PELVIC_CURL_DRAWING_PARAMETERS = Object.freeze({
  spineLengths: Object.freeze([34, 35, 35, 34]),
  restSpineAngles: Object.freeze([0, rad(9), rad(-9), 0]),
  rollDelays: Object.freeze([0.45, 0.3, 0.15, 0]),
  spineHalfDepth: 24,
  upperAnchorX: 160,
  upperAnchorZ: 24,
  ankleX: 404,
  ankleZ: 18,
  legHalfWidth: 22,
  thighLength: 86,
  shankLength: 88,
  initialTuckFraction: 0.22,
  pelvicAxisTuckAngle: rad(12),
  viewportWidth: 640,
  viewportHeight: 360,
});

export const PELVIC_CURL_PROVENANCE = Object.freeze({
  authoringStatusAtResearchTime: 'isolated-staged-original-draft',
  authorship:
    'Original constant-length spine chain, leg IK, contact model, projection and native SVG; no source frames or tracing',
  license: 'MIT; original code and geometry only; external publisher works excluded',
  sourceId: 'basi-cjkelly-pelvic-curl-v1',
  sourceUrl: 'https://www.basipilates.com/pilates/10-essential-pilates-exercises-for-beginners/',
  sourceTitle: '10 Essential Pilates Exercises for Beginners / Section 1 Pelvic Curl',
  sourcePublisher: 'BASI Pilates',
  sourceArticleByline: 'CJ Kelly, NCPT, Owner Gumption Collective',
  sourceFooterAuthorLabel: 'By SecoSan; role not established',
  sourcePublishedDate: '2019-10-16',
  sourceCheckedAtUtc: '2026-11-05T04:10:56Z',
  factualRecordSha256: 'e9411fd267a52e66b1070b777487b79f02987bdd3ea3c5028088a60756c5a8b1',
  hashScope:
    'canonical JSON factualRecord only in research/basi-mat-source-ledger.json; not source HTML, authored geometry or review',
  sourceFacts:
    'Bent knees and knees/heels about sit-bone width; long arms pressing mat; abdominal pelvic tuck before glute engagement and articulated roll up; knee-to-shoulder-blade line cue; sternum/spine lower toward mat',
  sourcePopulation:
    'Beginner fundamentals education; no exact age, diagnosis, credential verification or individual suitability established',
  authoredChoices:
    'Initial lumbar arch and flattening, four link angles/lengths/delays, chosen upper-back/head/arm supports, foot patches, pelvic axis and peak line fit, all timing, dimensions, projection and forces omitted',
  unknown:
    'Exact flat-foot/sole/heel/palm/head/scapula patches, contact pressures, actual vertebral mechanics, joint ranges, equipment/material behavior and personal safety',
  variantBoundary:
    'An original approximation of an articulated roll, distinct from the legacy rigid 2D bridge; no single-leg, band, ball, raised-foot or lifted-arm variation',
  externalMediaObserved: false,
  externalMediaCopiedOrTraced: false,
  observedMediaTimestamps: Object.freeze([]),
  professionalReviewCount: 0,
  approvedCatalogMappings: 0,
  exactAssetCount: 0,
  exactSourceVariantMatched: false,
  sourceVariantReconciliationRequired: true,
  autoRecommendationEligible: false,
});

export interface PelvicCurlOptions {
  activeSide?: AnatomicalSide;
  mirrored?: boolean;
}
export interface PelvicCurlLeg {
  anatomicalSide: AnatomicalSide;
  hip: Point3;
  knee: Point3;
  ankle: Point3;
  heel: Point3;
  toe: Point3;
}
export interface PelvicCurlArm {
  anatomicalSide: AnatomicalSide;
  shoulder: Point3;
  elbow: Point3;
  hand: Point3;
}
export interface PelvicCurlWorld {
  headCenter: Point3;
  neck: Point3;
  upperBack: Point3;
  pelvisCenter: Point3;
  leftShoulder: Point3;
  leftElbow: Point3;
  leftHand: Point3;
  rightShoulder: Point3;
  rightElbow: Point3;
  rightHand: Point3;
  leftHip: Point3;
  leftKnee: Point3;
  leftAnkle: Point3;
  leftHeel: Point3;
  leftToe: Point3;
  rightHip: Point3;
  rightKnee: Point3;
  rightAnkle: Point3;
  rightHeel: Point3;
  rightToe: Point3;
}
export interface PelvicCurlContact {
  id: string;
  anatomicalSide: AnatomicalSide | null;
  role:
    | 'head-support'
    | 'upper-back-support'
    | 'arm-support'
    | 'heel-support'
    | 'forefoot-support'
    | 'pelvis-support'
    | 'spine-support';
  target: 'mat';
  state: 'fixed' | 'supported' | 'released';
  evidence: 'authored-contact-patch';
  sourceContactType: 'arms-press-mat' | 'low-back-mat-during-tuck' | 'support-map-not-established';
  bodyCenter: Point3;
  surfaceOffset: Point3;
  point: Point3;
  targetPoint: Point3;
}
export interface PelvicCurlPose {
  draftId: typeof PELVIC_CURL_DRAFT_ID;
  intendedComparisonId: 'original-mat-bridge';
  modelVersion: typeof PELVIC_CURL_MODEL_VERSION;
  progress: number;
  amount: number;
  tuckAmount: number;
  rollAmount: number;
  phase: PelvicCurlPhase;
  phaseLabelKo: string;
  sideMode: 'bilateral';
  activeSide: AnatomicalSide;
  world: PelvicCurlWorld;
  screen: Record<keyof PelvicCurlWorld, ScreenPoint>;
  arms: Record<AnatomicalSide, PelvicCurlArm>;
  legs: Record<AnatomicalSide, PelvicCurlLeg>;
  spine: {
    joints: readonly Point3[];
    angles: readonly number[];
    segmentLengths: readonly number[];
    upperProfile: readonly Point3[];
    lowerProfile: readonly Point3[];
    interpretation: 'authored-four-link-chain-not-measured-vertebrae';
  };
  pelvisAxis: readonly [Point3, Point3];
  contacts: readonly PelvicCurlContact[];
  mat: { topZ: 0; corners: readonly Point3[]; material: 'not-established' };
  peakLine: {
    interpretation: 'authored-line-fit-not-source-measurement';
    chosenPeakAngle: number;
    referenceStart: Point3;
    referenceEnd: Point3;
  };
  forces: 'not-modeled';
  camera: { mirrored: boolean; projection: 'authored-oblique-orthographic'; width: 640 };
  review: { status: 'unreviewed'; professionalReviewCount: 0 };
  exactSourceVariantMatched: false;
  sourceVariantReconciliationRequired: true;
  approvedCatalogMapping: false;
  exactAssetReady: false;
  autoRecommendationEligible: false;
  safetyAssessment: 'unassessed';
}

const add = (a: Point3, b: Point3): Point3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

/** x toward feet, y anatomical left positive, z above mat. Mirror affects screens only. */
export function projectPelvicCurlPoint(p: Point3, mirrored = false): ScreenPoint {
  const x = 35 + p[0] * 1.14 + p[1] * 0.4;
  return [mirrored ? 640 - x : x, 290 + p[1] * 0.24 - p[2] * 0.95];
}
function amountAt(p: number): number {
  if (p <= 0.12 || p >= 0.88) return 0;
  if (p < 0.42) return smooth((p - 0.12) / 0.3);
  if (p <= 0.58) return 1;
  return 1 - smooth((p - 0.58) / 0.3);
}
function peakAngle(): number {
  const d = PELVIC_CURL_DRAWING_PARAMETERS;
  const dx = d.ankleX - d.upperAnchorX,
    dz = d.ankleZ - d.upperAnchorZ;
  const distance = Math.hypot(dx, dz);
  const reach = d.spineLengths.reduce((sum, value) => sum + value, 0) + d.thighLength;
  const cosine =
    (distance * distance + reach * reach - d.shankLength * d.shankLength) / (2 * distance * reach);
  return Math.atan2(dz, dx) + Math.acos(Math.max(-1, Math.min(1, cosine)));
}
function makeSpine(q: number) {
  const d = PELVIC_CURL_DRAWING_PARAMETERS;
  const tuck = smooth(q / d.initialTuckFraction);
  const roll = clamp01((q - d.initialTuckFraction) / (1 - d.initialTuckFraction));
  const peak = peakAngle();
  const angles = d.spineLengths.map(
    (_, index) =>
      d.restSpineAngles[index] * (1 - tuck) +
      peak * smooth((roll - d.rollDelays[index]) / (1 - d.rollDelays[index])),
  );
  const joints: Point3[] = [[d.upperAnchorX, 0, d.upperAnchorZ]];
  for (let i = 0; i < d.spineLengths.length; i++) {
    joints.push(
      add(joints[i], [
        d.spineLengths[i] * Math.cos(angles[i]),
        0,
        d.spineLengths[i] * Math.sin(angles[i]),
      ]),
    );
  }
  return { joints, angles, tuck, roll, peak };
}
/** Original two-circle knee solution with an upward bend; bone lengths never depend on phase. */
function makeLeg(side: AnatomicalSide, pelvis: Point3): PelvicCurlLeg {
  const d = PELVIC_CURL_DRAWING_PARAMETERS;
  const y = side === 'left' ? d.legHalfWidth : -d.legHalfWidth;
  const hip: Point3 = [pelvis[0], y, pelvis[2]],
    ankle: Point3 = [d.ankleX, y, d.ankleZ];
  const dx = ankle[0] - hip[0],
    dz = ankle[2] - hip[2],
    distance = Math.hypot(dx, dz);
  const a = d.thighLength,
    b = d.shankLength;
  if (distance > a + b + 1e-9 || distance < Math.abs(a - b) - 1e-9 || distance < 1e-9)
    throw new RangeError('Authored pelvis path makes the fixed-foot knee target unreachable');
  const along = (a * a - b * b + distance * distance) / (2 * distance);
  const height = Math.sqrt(Math.max(0, a * a - along * along));
  const knee: Point3 = [
    hip[0] + (dx / distance) * along - (dz / distance) * height,
    y,
    hip[2] + (dz / distance) * along + (dx / distance) * height,
  ];
  return { anatomicalSide: side, hip, knee, ankle, heel: [390, y, 8], toe: [425, y, 6] };
}
function makeArm(side: AnatomicalSide): PelvicCurlArm {
  const sign = side === 'left' ? 1 : -1;
  return {
    anatomicalSide: side,
    shoulder: [160, sign * 34, 24],
    elbow: [222, sign * 43, 12],
    hand: [286, sign * 45, 8],
  };
}

/** Pure single-model sampling. Parent owns the clock, playback and phase UI. */
export function getPelvicCurlPose(
  progress: number,
  { activeSide = 'right', mirrored = false }: PelvicCurlOptions = {},
): PelvicCurlPose {
  if (!Number.isFinite(progress)) throw new RangeError('progress must be finite');
  if (activeSide !== 'left' && activeSide !== 'right')
    throw new TypeError('unknown anatomical side');
  if (typeof mirrored !== 'boolean') throw new TypeError('mirrored must be boolean');
  const p = clamp01(progress),
    q = amountAt(p),
    chain = makeSpine(q);
  const pelvis = chain.joints[chain.joints.length - 1];
  const left = makeLeg('left', pelvis),
    right = makeLeg('right', pelvis);
  const leftArm = makeArm('left'),
    rightArm = makeArm('right');
  const world: PelvicCurlWorld = {
    headCenter: [95, 0, 22],
    neck: [125, 0, 24],
    upperBack: chain.joints[0],
    pelvisCenter: pelvis,
    leftShoulder: leftArm.shoulder,
    leftElbow: leftArm.elbow,
    leftHand: leftArm.hand,
    rightShoulder: rightArm.shoulder,
    rightElbow: rightArm.elbow,
    rightHand: rightArm.hand,
    leftHip: left.hip,
    leftKnee: left.knee,
    leftAnkle: left.ankle,
    leftHeel: left.heel,
    leftToe: left.toe,
    rightHip: right.hip,
    rightKnee: right.knee,
    rightAnkle: right.ankle,
    rightHeel: right.heel,
    rightToe: right.toe,
  };
  const contacts: PelvicCurlContact[] = [];
  const contact = (
    id: string,
    side: AnatomicalSide | null,
    role: PelvicCurlContact['role'],
    bodyCenter: Point3,
    surfaceOffset: Point3,
    fixed: boolean,
    sourceContactType: PelvicCurlContact['sourceContactType'],
  ) => {
    const point = add(bodyCenter, surfaceOffset);
    contacts.push({
      id,
      anatomicalSide: side,
      role,
      target: 'mat',
      state: fixed ? 'fixed' : point[2] <= 1e-9 ? 'supported' : 'released',
      evidence: 'authored-contact-patch',
      sourceContactType,
      bodyCenter,
      surfaceOffset,
      point,
      targetPoint: [point[0], point[1], 0],
    });
  };
  contact(
    'head-mat',
    null,
    'head-support',
    world.headCenter,
    [0, 0, -22],
    true,
    'support-map-not-established',
  );
  for (const side of ['left', 'right'] as const) {
    const leg = side === 'left' ? left : right,
      arm = side === 'left' ? leftArm : rightArm;
    contact(
      `${side}-upper-back`,
      side,
      'upper-back-support',
      arm.shoulder,
      [0, 0, -24],
      true,
      'support-map-not-established',
    );
    contact(`${side}-arm`, side, 'arm-support', arm.hand, [0, 0, -8], true, 'arms-press-mat');
    contact(
      `${side}-heel`,
      side,
      'heel-support',
      leg.heel,
      [0, 0, -8],
      true,
      'support-map-not-established',
    );
    contact(
      `${side}-forefoot`,
      side,
      'forefoot-support',
      leg.toe,
      [0, 0, -6],
      true,
      'support-map-not-established',
    );
  }
  contact(
    'pelvis-mat',
    null,
    'pelvis-support',
    pelvis,
    [0, 0, -24],
    false,
    'support-map-not-established',
  );
  chain.joints.slice(1, -1).forEach((point, index) => {
    contact(
      `spine-${index + 1}-mat`,
      null,
      'spine-support',
      point,
      [0, 0, -24],
      false,
      'support-map-not-established',
    );
  });
  const axisAngle =
    chain.angles[chain.angles.length - 1] -
    PELVIC_CURL_DRAWING_PARAMETERS.pelvicAxisTuckAngle * chain.tuck;
  const axis: Point3 = [16 * Math.cos(axisAngle), 0, 16 * Math.sin(axisAngle)];
  const phase = PELVIC_CURL_PHASES.find((item) => p < item.end) ?? PELVIC_CURL_PHASES[4];
  const reach =
    PELVIC_CURL_DRAWING_PARAMETERS.spineLengths.reduce((sum, value) => sum + value, 0) +
    PELVIC_CURL_DRAWING_PARAMETERS.thighLength;
  return {
    draftId: PELVIC_CURL_DRAFT_ID,
    intendedComparisonId: 'original-mat-bridge',
    modelVersion: PELVIC_CURL_MODEL_VERSION,
    progress: p,
    amount: q,
    tuckAmount: chain.tuck,
    rollAmount: chain.roll,
    phase,
    phaseLabelKo: phase.label,
    sideMode: 'bilateral',
    activeSide,
    world,
    screen: Object.fromEntries(
      Object.entries(world).map(([key, point]) => [key, projectPelvicCurlPoint(point, mirrored)]),
    ) as Record<keyof PelvicCurlWorld, ScreenPoint>,
    arms: { left: leftArm, right: rightArm },
    legs: { left, right },
    spine: {
      joints: chain.joints,
      angles: chain.angles,
      segmentLengths: [...PELVIC_CURL_DRAWING_PARAMETERS.spineLengths],
      upperProfile: chain.joints.map((point) => add(point, [0, 0, 24])),
      lowerProfile: chain.joints.map((point) => add(point, [0, 0, -24])),
      interpretation: 'authored-four-link-chain-not-measured-vertebrae',
    },
    pelvisAxis: [add(pelvis, [-axis[0], 0, -axis[2]]), add(pelvis, axis)],
    contacts,
    mat: {
      topZ: 0,
      corners: [
        [60, -70, 0],
        [465, -70, 0],
        [465, 70, 0],
        [60, 70, 0],
      ],
      material: 'not-established',
    },
    peakLine: {
      interpretation: 'authored-line-fit-not-source-measurement',
      chosenPeakAngle: chain.peak,
      referenceStart: chain.joints[0],
      referenceEnd: add(chain.joints[0], [
        reach * Math.cos(chain.peak),
        0,
        reach * Math.sin(chain.peak),
      ]),
    },
    forces: 'not-modeled',
    camera: { mirrored, projection: 'authored-oblique-orthographic', width: 640 },
    review: { status: 'unreviewed', professionalReviewCount: 0 },
    exactSourceVariantMatched: false,
    sourceVariantReconciliationRequired: true,
    approvedCatalogMapping: false,
    exactAssetReady: false,
    autoRecommendationEligible: false,
    safetyAssessment: 'unassessed',
  };
}
