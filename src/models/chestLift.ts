import type { AnatomicalSide, DraftPhase, Point3, ScreenPoint } from './types';

export const CHEST_LIFT_DRAFT_ID = 'supine-chest-lift' as const;
export const MODEL_VERSION = 'chest-lift-authored-chain-v1';
export const CHEST_LIFT_MODEL_VERSION = MODEL_VERSION;

/** All dimensions, articulation angles, contacts and projection values are authored. */
export const CHEST_LIFT_PARAMS = Object.freeze({
  spineLengths: Object.freeze([0.18, 0.22, 0.23, 0.14, 0.12] as const),
  liftAngles: Object.freeze([0, 0.14, 0.43, 0.62, 0.48] as const),
  headRotation: 0.22,
  headOffset: Object.freeze([0.1, 0, 0.015] as const),
  handOffset: Object.freeze([0.025, 0.006, -0.03] as const),
  limbLengths: Object.freeze({ upperArm: 0.285, forearm: 0.265 }),
  radii: Object.freeze({
    pelvis: 0.17,
    lumbar: 0.17,
    lowerThorax: 0.135,
    upperThorax: 0.135,
    neck: 0.032,
    upperArm: 0.026,
    forearm: 0.024,
    hand: 0.016,
    thigh: 0.065,
    shin: 0.038,
    foot: 0.04,
    head: Object.freeze({ x: 0.135, y: 0.095, z: 0.13 }),
  }),
  torsoWidths: Object.freeze([0.115, 0.12, 0.16, 0.165] as const),
  torsoVertices: 16,
  headVertices: 72,
  reachMargin: 0.012,
  projection: Object.freeze({
    width: 640,
    height: 380,
    origin: Object.freeze([330, 300] as const),
    scaleX: 165,
    scaleZ: 180,
    depthX: 65,
    depthY: 25,
  }),
});

export const params = CHEST_LIFT_PARAMS;

export const PHASES: readonly DraftPhase[] = Object.freeze([
  Object.freeze({
    id: 'setup',
    label: 'Setup',
    labelKo: '준비',
    start: 0,
    end: 0.12,
    sample: 0,
    displayBehavior: 'hold',
  }),
  Object.freeze({
    id: 'move',
    label: 'Lift',
    labelKo: '상체 들어 올리기',
    start: 0.12,
    end: 0.42,
    sample: 0.27,
    displayBehavior: 'move',
  }),
  Object.freeze({
    id: 'turn',
    label: 'Pause',
    labelKo: '잠시 유지',
    start: 0.42,
    end: 0.58,
    sample: 0.5,
    displayBehavior: 'hold',
  }),
  Object.freeze({
    id: 'return',
    label: 'Lower',
    labelKo: '내려오기',
    start: 0.58,
    end: 0.88,
    sample: 0.73,
    displayBehavior: 'move',
  }),
  Object.freeze({
    id: 'finish',
    label: 'Finish',
    labelKo: '마무리',
    start: 0.88,
    end: 1,
    sample: 1,
    displayBehavior: 'hold',
  }),
]);
export const CHEST_LIFT_PHASES = PHASES;

export type ChestLiftSides<T> = Record<AnatomicalSide, T>;

export interface ChestLiftSpine {
  pelvis: Point3;
  lumbar: Point3;
  lowerThorax: Point3;
  upperThorax: Point3;
  neckMid: Point3;
  occiput: Point3;
  points: Point3[];
  angles: number[];
}

export interface ChestLiftHead {
  center: Point3;
  rotation: number;
  outline: Point3[];
  nose: Point3;
  chin: Point3;
  eye: Point3;
  occipitalPatches: ChestLiftSides<Point3>;
}

export interface ChestLiftArm {
  shoulder: Point3;
  elbow: Point3;
  wrist: Point3;
  handPatch: Point3;
  target: Point3;
  upperLength: number;
  forearmLength: number;
  handLength: number;
  wristRotation: number;
}

export interface ChestLiftLeg {
  hip: Point3;
  knee: Point3;
  ankle: Point3;
  heel: Point3;
  toe: Point3;
}

export interface ChestLiftContact {
  id: string;
  side?: AnatomicalSide;
  point: Point3;
  targetPoint: Point3;
  state: 'fixed' | 'grounded' | 'released' | 'maintained';
  sourceNamedSupport?: 'head-hand' | 'scapula-mat';
  geometryBasis: 'authored-only';
}

export interface ChestLiftPose {
  draftId: typeof CHEST_LIFT_DRAFT_ID;
  modelVersion: typeof MODEL_VERSION;
  proposalStatus: 'variant-proposal';
  review: { status: 'unreviewed'; professionalReviewCount: 0 };
  exactSourceVariantMatched: false;
  sourceVariantReconciliationRequired: true;
  exactAssetReady: false;
  autoRecommendationEligible: false;
  sideMode: 'bilateral';
  progress: number;
  lift: number;
  activeSide: AnatomicalSide;
  mirrored: boolean;
  phase: DraftPhase;
  phaseLabelKo: string;
  spine: ChestLiftSpine;
  head: ChestLiftHead;
  arms: ChestLiftSides<ChestLiftArm>;
  legs: ChestLiftSides<ChestLiftLeg>;
  scapularInferiorTips: ChestLiftSides<Point3>;
  torsoRings: Point3[][];
  matCorners: Point3[];
  contacts: ChestLiftContact[];
}

export interface ChestLiftOptions {
  activeSide?: AnatomicalSide;
  mirrored?: boolean;
}

const copy = (point: Point3): Point3 => [point[0], point[1], point[2]];
const add = (a: Point3, b: Point3): Point3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const subtract = (a: Point3, b: Point3): Point3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Point3, amount: number): Point3 => [a[0] * amount, a[1] * amount, a[2] * amount];
const dot = (a: Point3, b: Point3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const length = (a: Point3) => Math.hypot(a[0], a[1], a[2]);

/** Sagittal rotation about the transverse y-axis, with positive x bending upward. */
function rotate(point: Point3, angle: number): Point3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [point[0] * c - point[2] * s, point[1], point[0] * s + point[2] * c];
}

const transform = (point: Point3, origin: Point3, angle: number): Point3 =>
  add(origin, rotate(point, angle));

function smootherstep(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return Math.max(0, Math.min(1, t * t * t * (10 + t * (-15 + 6 * t))));
}

function liftAt(progress: number): number {
  if (progress <= 0.12 || progress >= 0.88) return 0;
  if (progress < 0.42) return smootherstep((progress - 0.12) / 0.3);
  if (progress <= 0.58) return 1;
  return smootherstep((0.88 - progress) / 0.3);
}

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.values(value).forEach((child) => deepFreeze(child));
    Object.freeze(value);
  }
  return value;
}

function buildSpine(lift: number): ChestLiftSpine {
  const points: Point3[] = [[0, 0, CHEST_LIFT_PARAMS.radii.pelvis]];
  const angles = CHEST_LIFT_PARAMS.liftAngles.map((angle) => angle * lift);
  CHEST_LIFT_PARAMS.spineLengths.forEach((segmentLength, index) => {
    points.push(add(points[index], rotate([segmentLength, 0, 0], angles[index])));
  });
  return {
    pelvis: copy(points[0]),
    lumbar: copy(points[1]),
    lowerThorax: copy(points[2]),
    upperThorax: copy(points[3]),
    neckMid: copy(points[4]),
    occiput: copy(points[5]),
    points: points.map(copy),
    angles,
  };
}

function buildHead(spine: ChestLiftSpine, lift: number): ChestLiftHead {
  const rotation = CHEST_LIFT_PARAMS.headRotation * lift;
  const center = transform(CHEST_LIFT_PARAMS.headOffset, spine.occiput, rotation);
  const r = CHEST_LIFT_PARAMS.radii.head;
  const outline = Array.from({ length: CHEST_LIFT_PARAMS.headVertices }, (_, index) => {
    const angle = (index * Math.PI * 2) / CHEST_LIFT_PARAMS.headVertices;
    return transform([r.x * Math.cos(angle), 0, r.z * Math.sin(angle)], center, rotation);
  });
  // These paired patches lie on the authored head ellipsoid. They do not model
  // finger interlacing, hand pressure or a validated anatomical contact area.
  const patchX = -0.095;
  const patchY = 0.028;
  const patchZ = -r.z * Math.sqrt(1 - (patchX / r.x) ** 2 - (patchY / r.y) ** 2);
  return {
    center,
    rotation,
    outline,
    nose: transform([0.03, 0, 0.156], center, rotation),
    chin: transform([-0.105, 0, 0.08], center, rotation),
    eye: transform([0.07, -0.075, 0.11], center, rotation),
    occipitalPatches: {
      left: transform([patchX, patchY, patchZ], center, rotation),
      right: transform([patchX, -patchY, patchZ], center, rotation),
    },
  };
}

function buildArm(side: AnatomicalSide, spine: ChestLiftSpine, head: ChestLiftHead): ChestLiftArm {
  const sign = side === 'left' ? 1 : -1;
  const shoulder = transform([0.005, sign * 0.145, 0.02], spine.upperThorax, spine.angles[2]);
  const target = copy(head.occipitalPatches[side]);
  const offset: Point3 = [
    CHEST_LIFT_PARAMS.handOffset[0],
    sign * CHEST_LIFT_PARAMS.handOffset[1],
    CHEST_LIFT_PARAMS.handOffset[2],
  ];
  const wrist = transform(offset, target, head.rotation);
  const delta = subtract(wrist, shoulder);
  const distance = length(delta);
  const { upperArm, forearm } = CHEST_LIFT_PARAMS.limbLengths;
  if (
    distance <= Math.abs(upperArm - forearm) + CHEST_LIFT_PARAMS.reachMargin ||
    distance >= upperArm + forearm - CHEST_LIFT_PARAMS.reachMargin
  ) {
    throw new RangeError('Authored chest-lift hand target is outside the arm reach margin.');
  }
  const direction = scale(delta, 1 / distance);
  const preferred: Point3 = [0, sign * 0.78, 1];
  const perpendicular = subtract(preferred, scale(direction, dot(preferred, direction)));
  const perpendicularLength = length(perpendicular);
  if (perpendicularLength <= 1e-9)
    throw new RangeError('Authored chest-lift elbow plane is degenerate.');
  const bend = scale(perpendicular, 1 / perpendicularLength);
  const along = (upperArm ** 2 - forearm ** 2 + distance ** 2) / (2 * distance);
  const heightSquared = upperArm ** 2 - along ** 2;
  if (heightSquared <= 0)
    throw new RangeError('Authored chest-lift arm has no continuous bent solution.');
  const elbow = add(add(shoulder, scale(direction, along)), scale(bend, Math.sqrt(heightSquared)));
  const forearmAngle = Math.atan2(wrist[2] - elbow[2], wrist[0] - elbow[0]);
  return {
    shoulder,
    elbow,
    wrist,
    handPatch: copy(target),
    target,
    upperLength: upperArm,
    forearmLength: forearm,
    handLength: length(offset),
    wristRotation: head.rotation - forearmAngle,
  };
}

function buildLeg(side: AnatomicalSide): ChestLiftLeg {
  const sign = side === 'left' ? 1 : -1;
  return {
    hip: [-0.03, sign * 0.07, 0.17],
    knee: [-0.43, sign * 0.055, 0.62],
    ankle: [-0.84, sign * 0.06, 0.09],
    heel: [-0.87, sign * 0.06, 0.04],
    toe: [-1.03, sign * 0.06, 0.04],
  };
}

function buildTorsoRings(spine: ChestLiftSpine): Point3[][] {
  const centers = [spine.pelvis, spine.lumbar, spine.lowerThorax, spine.upperThorax];
  const angles = [0, 0, spine.angles[1], spine.angles[2]];
  const radii = [
    CHEST_LIFT_PARAMS.radii.pelvis,
    CHEST_LIFT_PARAMS.radii.lumbar,
    CHEST_LIFT_PARAMS.radii.lowerThorax,
    CHEST_LIFT_PARAMS.radii.upperThorax,
  ];
  return centers.map((center, ringIndex) =>
    Array.from({ length: CHEST_LIFT_PARAMS.torsoVertices }, (_, index) => {
      const angle = (index * Math.PI * 2) / CHEST_LIFT_PARAMS.torsoVertices;
      return transform(
        [
          0,
          CHEST_LIFT_PARAMS.torsoWidths[ringIndex] * Math.cos(angle),
          radii[ringIndex] * Math.sin(angle),
        ],
        center,
        angles[ringIndex],
      );
    }),
  );
}

function buildContacts(
  spine: ChestLiftSpine,
  arms: ChestLiftSides<ChestLiftArm>,
  legs: ChestLiftSides<ChestLiftLeg>,
  scapularTips: ChestLiftSides<Point3>,
  lift: number,
): ChestLiftContact[] {
  const contacts: ChestLiftContact[] = [
    {
      id: 'pelvis-authored',
      point: [spine.pelvis[0], 0, 0],
      targetPoint: [0, 0, 0],
      state: 'fixed',
      geometryBasis: 'authored-only',
    },
    {
      id: 'lower-back-authored',
      point: [spine.lumbar[0], 0, 0],
      targetPoint: [CHEST_LIFT_PARAMS.spineLengths[0], 0, 0],
      state: 'fixed',
      geometryBasis: 'authored-only',
    },
  ];
  for (const side of ['left', 'right'] as const) {
    const leg = legs[side];
    contacts.push(
      {
        id: `${side}-head-hand`,
        side,
        point: copy(arms[side].handPatch),
        targetPoint: copy(arms[side].target),
        state: 'maintained',
        sourceNamedSupport: 'head-hand',
        geometryBasis: 'authored-only',
      },
      {
        id: `${side}-scapula-mat`,
        side,
        point: copy(scapularTips[side]),
        targetPoint: [0.52, side === 'left' ? 0.12 : -0.12, 0],
        state: lift === 0 ? 'grounded' : 'released',
        sourceNamedSupport: 'scapula-mat',
        geometryBasis: 'authored-only',
      },
      {
        id: `${side}-heel-authored`,
        side,
        point: [leg.heel[0], leg.heel[1], leg.heel[2] - CHEST_LIFT_PARAMS.radii.foot],
        targetPoint: [leg.heel[0], leg.heel[1], 0],
        state: 'fixed',
        geometryBasis: 'authored-only',
      },
      {
        id: `${side}-toe-authored`,
        side,
        point: [leg.toe[0], leg.toe[1], leg.toe[2] - CHEST_LIFT_PARAMS.radii.foot],
        targetPoint: [leg.toe[0], leg.toe[1], 0],
        state: 'fixed',
        geometryBasis: 'authored-only',
      },
      {
        id: `${side}-foot-authored`,
        side,
        point: [(leg.heel[0] + leg.toe[0]) / 2, leg.heel[1], 0],
        targetPoint: [(leg.heel[0] + leg.toe[0]) / 2, leg.heel[1], 0],
        state: 'fixed',
        geometryBasis: 'authored-only',
      },
    );
  }
  return contacts;
}

/** Finite original schematic; body geometry is bilateral and never mirrored in world space. */
export function getChestLiftPose(progress: number, options: ChestLiftOptions = {}): ChestLiftPose {
  if (!Number.isFinite(progress)) throw new RangeError('Chest-lift progress must be finite.');
  if (typeof options !== 'object' || options === null || Array.isArray(options)) {
    throw new TypeError('Chest-lift options must be an object.');
  }
  const activeSide = options.activeSide === undefined ? 'right' : options.activeSide;
  const mirrored = options.mirrored === undefined ? false : options.mirrored;
  if (activeSide !== 'left' && activeSide !== 'right')
    throw new TypeError('Chest-lift anatomical side is invalid.');
  if (typeof mirrored !== 'boolean') throw new TypeError('Chest-lift mirroring must be boolean.');
  const clamped = Math.max(0, Math.min(1, progress));
  const lift = liftAt(clamped);
  const spine = buildSpine(lift);
  const head = buildHead(spine, lift);
  const arms = { left: buildArm('left', spine, head), right: buildArm('right', spine, head) };
  const legs = { left: buildLeg('left'), right: buildLeg('right') };
  const scapularInferiorTips = {
    left: transform([-0.11, 0.12, -0.17], spine.upperThorax, spine.angles[2]),
    right: transform([-0.11, -0.12, -0.17], spine.upperThorax, spine.angles[2]),
  };
  // Algebraically identical to the local rigid transform above, expressed
  // without subtracting two almost equal heights near the mat contact.
  const scapularHeight =
    2 * 0.17 * Math.sin(spine.angles[2] / 2) ** 2 +
    CHEST_LIFT_PARAMS.spineLengths[1] * Math.sin(spine.angles[1]) +
    (CHEST_LIFT_PARAMS.spineLengths[2] - 0.11) * Math.sin(spine.angles[2]);
  scapularInferiorTips.left = [
    scapularInferiorTips.left[0],
    scapularInferiorTips.left[1],
    scapularHeight,
  ];
  scapularInferiorTips.right = [
    scapularInferiorTips.right[0],
    scapularInferiorTips.right[1],
    scapularHeight,
  ];
  const phase = PHASES.find((item) => clamped < item.end) ?? PHASES[PHASES.length - 1];
  return deepFreeze<ChestLiftPose>({
    draftId: CHEST_LIFT_DRAFT_ID,
    modelVersion: MODEL_VERSION,
    proposalStatus: 'variant-proposal',
    review: { status: 'unreviewed', professionalReviewCount: 0 },
    exactSourceVariantMatched: false,
    sourceVariantReconciliationRequired: true,
    exactAssetReady: false,
    autoRecommendationEligible: false,
    sideMode: 'bilateral',
    progress: clamped,
    lift,
    activeSide,
    mirrored,
    phase: { ...phase },
    phaseLabelKo: phase.labelKo ?? phase.label,
    spine,
    head,
    arms,
    legs,
    scapularInferiorTips,
    torsoRings: buildTorsoRings(spine),
    matCorners: [
      [-1.12, -0.42, 0],
      [1.2, -0.42, 0],
      [1.2, 0.42, 0],
      [-1.12, 0.42, 0],
    ],
    contacts: buildContacts(spine, arms, legs, scapularInferiorTips, lift),
  });
}

/** View reflection only: anatomical side labels and world points are unchanged. */
export function projectChestLiftPoint(point: Point3, mirrored = false): ScreenPoint {
  if (
    !Array.isArray(point) ||
    point.length !== 3 ||
    ![0, 1, 2].every((index) => Number.isFinite(point[index]))
  ) {
    throw new RangeError('Chest-lift projection requires three finite world coordinates.');
  }
  if (typeof mirrored !== 'boolean') throw new TypeError('Chest-lift mirroring must be boolean.');
  const p = CHEST_LIFT_PARAMS.projection;
  const x = p.origin[0] - point[0] * p.scaleX + point[1] * p.depthX;
  return Object.freeze([
    mirrored ? p.width - x : x,
    p.origin[1] - point[2] * p.scaleZ + point[1] * p.depthY,
  ] as const);
}
