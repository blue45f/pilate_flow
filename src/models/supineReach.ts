/** Original, unreviewed schematic geometry. Units and timing are author choices. */
export const SUPINE_REACH_IDS = ['supine-single-leg-reach-v1'] as const;
export const SUPINE_REACH_MODEL_VERSION = 'supine-reach-authored-3d-v1' as const;

export type SupineReachPoint = readonly [number, number, number];
export type SupineReachScreenPoint = readonly [number, number];
export type SupineReachSide = 'left' | 'right';
export type SupineReachSides<T> = Readonly<Record<SupineReachSide, T>>;

export interface SupineReachPhase {
  readonly id: 'setup' | 'move' | 'turn' | 'return' | 'finish';
  readonly label: string;
  readonly labelKo?: string;
  readonly start: number;
  readonly end: number;
  readonly sample: number;
  readonly displayBehavior: 'hold' | 'move';
}

export const SUPINE_REACH_PHASES: readonly SupineReachPhase[] = Object.freeze([
  Object.freeze({
    id: 'setup',
    label: '가슴을 든 테이블톱 배치',
    labelKo: '가슴을 든 테이블톱 배치',
    start: 0,
    end: 0.12,
    sample: 0,
    displayBehavior: 'hold',
  }),
  Object.freeze({
    id: 'move',
    label: '선택한 다리 뻗기',
    labelKo: '선택한 다리 뻗기',
    start: 0.12,
    end: 0.42,
    sample: 0.27,
    displayBehavior: 'move',
  }),
  Object.freeze({
    id: 'turn',
    label: '뻗은 저작 배치',
    labelKo: '뻗은 저작 배치',
    start: 0.42,
    end: 0.58,
    sample: 0.5,
    displayBehavior: 'hold',
  }),
  Object.freeze({
    id: 'return',
    label: '같은 다리 되돌리기',
    labelKo: '같은 다리 되돌리기',
    start: 0.58,
    end: 0.88,
    sample: 0.73,
    displayBehavior: 'move',
  }),
  Object.freeze({
    id: 'finish',
    label: '가슴을 든 테이블톱 배치',
    labelKo: '가슴을 든 테이블톱 배치',
    start: 0.88,
    end: 1,
    sample: 1,
    displayBehavior: 'hold',
  }),
]);

export const SUPINE_REACH_PARAMS = Object.freeze({
  limbLengths: Object.freeze({ thigh: 82, shin: 84, upperArm: 61, forearm: 59 }),
  anglesDegrees: Object.freeze({
    initialThigh: 90,
    extendedThigh: 30,
    initialShin: 0,
    extendedShin: 30,
  }),
  hipDepth: 23,
  shoulderDepth: 34,
  handPatchDepthOffset: 10,
  handPatchHeightOffset: 10,
  elbowOutwardWeight: 1,
  elbowUpWeight: 0.35,
  reachMargin: 1,
  footHeelOffset: Object.freeze([-4, 0, -3] as const),
  footToeOffset: Object.freeze([22, 0, -2] as const),
  trajectorySamples: 41,
  projection: Object.freeze({
    width: 640,
    height: 360,
    origin: Object.freeze([-130, 262] as const),
    scale: 1.4,
    depthX: 0.32,
    depthY: 0.32,
  }),
});

export interface SupineReachLeg {
  readonly hip: SupineReachPoint;
  readonly knee: SupineReachPoint;
  readonly ankle: SupineReachPoint;
  readonly heel: SupineReachPoint;
  readonly toe: SupineReachPoint;
  readonly thighAngle: number;
  readonly shinAngle: number;
  readonly kneeAngle: number;
  readonly kneeTopPatches: SupineReachSides<SupineReachPoint>;
}

export interface SupineReachArm {
  readonly shoulder: SupineReachPoint;
  readonly elbow: SupineReachPoint;
  readonly wrist: SupineReachPoint;
  readonly handPatch: SupineReachPoint;
  readonly targetPoint: SupineReachPoint;
  readonly targetSide: SupineReachSide;
}

export interface SupineReachBody {
  readonly pelvis: SupineReachPoint;
  readonly lowerTrunk: SupineReachPoint;
  readonly chest: SupineReachPoint;
  readonly shoulders: SupineReachSides<SupineReachPoint>;
  readonly spine: readonly SupineReachPoint[];
  readonly torsoRings: readonly (readonly SupineReachPoint[])[];
  readonly matPatches: { readonly pelvis: SupineReachPoint; readonly lowerTrunk: SupineReachPoint };
  readonly head: {
    readonly center: SupineReachPoint;
    readonly outline: readonly SupineReachPoint[];
    readonly nose: SupineReachPoint;
    readonly eye: SupineReachPoint;
    readonly chin: SupineReachPoint;
  };
}

export interface SupineReachContact {
  readonly id: string;
  readonly bodyPart: 'pelvis' | 'lower-trunk' | 'hand' | 'head' | 'chest' | 'foot';
  readonly side?: SupineReachSide;
  readonly surface: 'mat' | 'retained-knee' | 'none';
  readonly state: 'fixed' | 'maintained' | 'not-supported';
  readonly point: SupineReachPoint;
  readonly targetPoint: SupineReachPoint | null;
  readonly targetSide?: SupineReachSide;
  readonly geometryBasis: 'authored-only';
}

export interface SupineReachPose {
  readonly variantId: (typeof SUPINE_REACH_IDS)[number];
  readonly family: 'supine-reach';
  readonly modelVersion: typeof SUPINE_REACH_MODEL_VERSION;
  readonly progress: number;
  readonly amount: number;
  readonly phase: SupineReachPhase;
  readonly activeSide: SupineReachSide;
  readonly retainedSide: SupineReachSide;
  readonly mirrored: boolean;
  readonly body: SupineReachBody;
  readonly legs: SupineReachSides<SupineReachLeg>;
  readonly arms: SupineReachSides<SupineReachArm>;
  readonly contacts: readonly SupineReachContact[];
  readonly equipment: {
    readonly mat: { readonly planeZ: 0; readonly corners: readonly SupineReachPoint[] };
  };
  readonly camera: typeof SUPINE_REACH_PARAMS.projection;
  readonly trajectory: {
    readonly landmark: 'active-ankle';
    readonly points: readonly SupineReachPoint[];
    readonly direction: 'extension' | 'return' | null;
    readonly directionPoints: readonly SupineReachPoint[];
  };
  readonly proposalStatus: 'unreviewed-original-schematic';
  readonly review: { readonly status: 'unreviewed'; readonly professionalReviewCount: 0 };
  readonly exactSourceVariantMatched: false;
  readonly exactAssetReady: false;
  readonly autoRecommendationEligible: false;
}

const copy = (p: SupineReachPoint): SupineReachPoint => [p[0], p[1], p[2]];
const add = (a: SupineReachPoint, b: SupineReachPoint): SupineReachPoint => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
];
const subtract = (a: SupineReachPoint, b: SupineReachPoint): SupineReachPoint => [
  a[0] - b[0],
  a[1] - b[1],
  a[2] - b[2],
];
const scale = (p: SupineReachPoint, k: number): SupineReachPoint => [p[0] * k, p[1] * k, p[2] * k];
const dot = (a: SupineReachPoint, b: SupineReachPoint) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const magnitude = (p: SupineReachPoint) => Math.hypot(...p);
const radians = (degrees: number) => (degrees * Math.PI) / 180;

function freeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

function smooth(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return Math.max(0, Math.min(1, t * t * t * (10 + t * (-15 + 6 * t))));
}

function amountAt(progress: number): number {
  if (progress <= 0.12 || progress >= 0.88) return 0;
  if (progress < 0.42) return smooth((progress - 0.12) / 0.3);
  if (progress <= 0.58) return 1;
  return smooth((0.88 - progress) / 0.3);
}

/** x runs from head toward feet; positive y is anatomical left; z is up. */
function buildBody(): SupineReachBody {
  const spine: SupineReachPoint[] = [
    [300, 0, 28],
    [281, 0, 26],
    [260, 0, 28],
    [242, 0, 32],
    [228, 0, 40],
    [218, 0, 51],
    [205, 0, 65],
  ];
  const widths = [28, 26, 25, 29, 32, 34];
  const heights = [28, 26, 25, 23, 20, 13];
  const headCenter: SupineReachPoint = [195, 0, 87];
  return {
    pelvis: copy(spine[0]),
    lowerTrunk: copy(spine[1]),
    chest: copy(spine[4]),
    shoulders: { left: [218, 34, 51], right: [218, -34, 51] },
    spine,
    torsoRings: spine.slice(0, 6).map((center, index) =>
      Array.from({ length: 16 }, (_, vertex) => {
        const angle = (vertex * Math.PI * 2) / 16;
        return [
          center[0],
          widths[index] * Math.cos(angle),
          center[2] + heights[index] * Math.sin(angle),
        ] as const;
      }),
    ),
    matPatches: { pelvis: [300, 0, 0], lowerTrunk: [281, 0, 0] },
    head: {
      center: headCenter,
      outline: Array.from({ length: 48 }, (_, vertex) => {
        const angle = (vertex * Math.PI * 2) / 48;
        return [
          headCenter[0] + 19 * Math.cos(angle),
          0,
          headCenter[2] + 22 * Math.sin(angle),
        ] as const;
      }),
      nose: [217, 0, 88],
      eye: [205, 13, 93],
      chin: [209, 0, 72],
    },
  };
}

function rotateFoot(offset: SupineReachPoint, angle: number): SupineReachPoint {
  return [
    offset[0] * Math.cos(angle) - offset[2] * Math.sin(angle),
    offset[1],
    offset[0] * Math.sin(angle) + offset[2] * Math.cos(angle),
  ];
}

function buildLeg(side: SupineReachSide, amount: number): SupineReachLeg {
  const p = SUPINE_REACH_PARAMS;
  const hip: SupineReachPoint = [300, side === 'left' ? p.hipDepth : -p.hipDepth, 28];
  const thighAngle = radians(
    p.anglesDegrees.initialThigh +
      amount * (p.anglesDegrees.extendedThigh - p.anglesDegrees.initialThigh),
  );
  const shinAngle = radians(
    p.anglesDegrees.initialShin +
      amount * (p.anglesDegrees.extendedShin - p.anglesDegrees.initialShin),
  );
  // Writing the exact tabletop x avoids a tiny cos(pi/2) cycle-closure offset.
  const knee: SupineReachPoint = [
    hip[0] + (amount === 0 ? 0 : p.limbLengths.thigh * Math.cos(thighAngle)),
    hip[1],
    hip[2] + p.limbLengths.thigh * Math.sin(thighAngle),
  ];
  const ankle: SupineReachPoint = [
    knee[0] + p.limbLengths.shin * Math.cos(shinAngle),
    knee[1],
    knee[2] + p.limbLengths.shin * Math.sin(shinAngle),
  ];
  return {
    hip,
    knee,
    ankle,
    heel: add(ankle, rotateFoot(p.footHeelOffset, shinAngle)),
    toe: add(ankle, rotateFoot(p.footToeOffset, shinAngle)),
    thighAngle,
    shinAngle,
    kneeAngle: Math.PI - Math.abs(thighAngle - shinAngle),
    kneeTopPatches: {
      left: [knee[0], knee[1] + p.handPatchDepthOffset, knee[2] + p.handPatchHeightOffset],
      right: [knee[0], knee[1] - p.handPatchDepthOffset, knee[2] + p.handPatchHeightOffset],
    },
  };
}

/** Two fixed-length links; outward elbow direction is chosen in three dimensions. */
function buildArm(
  side: SupineReachSide,
  body: SupineReachBody,
  retained: SupineReachLeg,
  retainedSide: SupineReachSide,
): SupineReachArm {
  const shoulder = copy(body.shoulders[side]);
  const target = copy(retained.kneeTopPatches[side]);
  const delta = subtract(target, shoulder);
  const distance = magnitude(delta);
  const { upperArm, forearm } = SUPINE_REACH_PARAMS.limbLengths;
  if (
    distance >= upperArm + forearm - SUPINE_REACH_PARAMS.reachMargin ||
    distance <= Math.abs(upperArm - forearm) + SUPINE_REACH_PARAMS.reachMargin
  ) {
    throw new RangeError('Supine reach hand target is outside the authored arm reach margin.');
  }
  const direction = scale(delta, 1 / distance);
  const preferred: SupineReachPoint = [
    0,
    side === 'left'
      ? SUPINE_REACH_PARAMS.elbowOutwardWeight
      : -SUPINE_REACH_PARAMS.elbowOutwardWeight,
    SUPINE_REACH_PARAMS.elbowUpWeight,
  ];
  const orthogonal = subtract(preferred, scale(direction, dot(preferred, direction)));
  const orthogonalLength = magnitude(orthogonal);
  if (orthogonalLength < 1e-9) throw new RangeError('Supine reach elbow plane is degenerate.');
  const along = (upperArm ** 2 - forearm ** 2 + distance ** 2) / (2 * distance);
  const height = Math.sqrt(upperArm ** 2 - along ** 2);
  const elbow = add(
    add(shoulder, scale(direction, along)),
    scale(orthogonal, height / orthogonalLength),
  );
  return {
    shoulder,
    elbow,
    wrist: copy(target),
    handPatch: copy(target),
    targetPoint: target,
    targetSide: retainedSide,
  };
}

function buildContacts(
  body: SupineReachBody,
  legs: SupineReachSides<SupineReachLeg>,
  arms: SupineReachSides<SupineReachArm>,
  retainedSide: SupineReachSide,
): SupineReachContact[] {
  const contacts: SupineReachContact[] = [
    {
      id: 'pelvis-mat-authored',
      bodyPart: 'pelvis',
      surface: 'mat',
      state: 'fixed',
      point: copy(body.matPatches.pelvis),
      targetPoint: copy(body.matPatches.pelvis),
      geometryBasis: 'authored-only',
    },
    {
      id: 'lower-trunk-mat-authored',
      bodyPart: 'lower-trunk',
      surface: 'mat',
      state: 'fixed',
      point: copy(body.matPatches.lowerTrunk),
      targetPoint: copy(body.matPatches.lowerTrunk),
      geometryBasis: 'authored-only',
    },
    {
      id: 'head-not-mat-supported',
      bodyPart: 'head',
      surface: 'none',
      state: 'not-supported',
      point: copy(body.head.center),
      targetPoint: null,
      geometryBasis: 'authored-only',
    },
    {
      id: 'chest-not-mat-supported',
      bodyPart: 'chest',
      surface: 'none',
      state: 'not-supported',
      point: copy(body.chest),
      targetPoint: null,
      geometryBasis: 'authored-only',
    },
  ];
  for (const side of ['left', 'right'] as const) {
    contacts.push(
      {
        id: `${side}-hand-retained-knee`,
        bodyPart: 'hand',
        side,
        surface: 'retained-knee',
        state: 'maintained',
        point: copy(arms[side].handPatch),
        targetPoint: copy(legs[retainedSide].kneeTopPatches[side]),
        targetSide: retainedSide,
        geometryBasis: 'authored-only',
      },
      {
        id: `${side}-foot-not-mat-supported`,
        bodyPart: 'foot',
        side,
        surface: 'none',
        state: 'not-supported',
        point: copy(legs[side].ankle),
        targetPoint: null,
        geometryBasis: 'authored-only',
      },
    );
  }
  return contacts;
}

/** Pure pose evaluation; playback, side selection and pauses belong to the parent. */
export function getSupineReachPose(
  progress: number,
  options: { activeSide?: SupineReachSide; mirrored?: boolean } = {},
): SupineReachPose {
  if (!Number.isFinite(progress)) throw new RangeError('Supine reach progress must be finite.');
  if (typeof options !== 'object' || options === null || Array.isArray(options))
    throw new TypeError('Supine reach options must be an object.');
  const activeSide = options.activeSide === undefined ? 'left' : options.activeSide;
  const mirrored = options.mirrored === undefined ? false : options.mirrored;
  if (activeSide !== 'left' && activeSide !== 'right')
    throw new TypeError('Supine reach active side is invalid.');
  if (typeof mirrored !== 'boolean') throw new TypeError('Supine reach mirroring must be boolean.');
  const clamped = Math.max(0, Math.min(1, progress));
  const amount = amountAt(clamped);
  const phase = SUPINE_REACH_PHASES.find((entry) => clamped < entry.end) ?? SUPINE_REACH_PHASES[4];
  const retainedSide = activeSide === 'left' ? 'right' : 'left';
  const body = buildBody();
  const legs = {
    left: buildLeg('left', activeSide === 'left' ? amount : 0),
    right: buildLeg('right', activeSide === 'right' ? amount : 0),
  };
  const arms = {
    left: buildArm('left', body, legs[retainedSide], retainedSide),
    right: buildArm('right', body, legs[retainedSide], retainedSide),
  };
  const path = Array.from(
    { length: SUPINE_REACH_PARAMS.trajectorySamples },
    (_, index) => buildLeg(activeSide, index / (SUPINE_REACH_PARAMS.trajectorySamples - 1)).ankle,
  );
  const direction = phase.id === 'move' ? 'extension' : phase.id === 'return' ? 'return' : null;
  return freeze<SupineReachPose>({
    variantId: SUPINE_REACH_IDS[0],
    family: 'supine-reach',
    modelVersion: SUPINE_REACH_MODEL_VERSION,
    progress: clamped,
    amount,
    phase,
    activeSide,
    retainedSide,
    mirrored,
    body,
    legs,
    arms,
    contacts: buildContacts(body, legs, arms, retainedSide),
    equipment: {
      mat: {
        planeZ: 0,
        corners: [
          [120, -70, 0],
          [510, -70, 0],
          [510, 70, 0],
          [120, 70, 0],
        ],
      },
    },
    camera: SUPINE_REACH_PARAMS.projection,
    trajectory: {
      landmark: 'active-ankle',
      points: path,
      direction,
      directionPoints:
        direction === 'extension'
          ? path.map(copy)
          : direction === 'return'
            ? [...path].reverse().map(copy)
            : [],
    },
    proposalStatus: 'unreviewed-original-schematic',
    review: { status: 'unreviewed', professionalReviewCount: 0 },
    exactSourceVariantMatched: false,
    exactAssetReady: false,
    autoRecommendationEligible: false,
  });
}

/** Reflect only screen x: anatomical coordinates and side identities never swap. */
export function projectSupineReachPoint(
  point: SupineReachPoint,
  mirrored = false,
): SupineReachScreenPoint {
  if (
    !Array.isArray(point) ||
    point.length !== 3 ||
    ![0, 1, 2].every((index) => Number.isFinite(point[index]))
  )
    throw new RangeError('Supine reach projection requires three finite coordinates.');
  if (typeof mirrored !== 'boolean') throw new TypeError('Supine reach mirroring must be boolean.');
  const p = SUPINE_REACH_PARAMS.projection;
  const x = p.origin[0] + point[0] * p.scale + point[1] * p.depthX;
  return Object.freeze([
    mirrored ? p.width - x : x,
    p.origin[1] - point[2] * p.scale + point[1] * p.depthY,
  ] as const);
}
