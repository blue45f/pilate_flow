import type { DraftPhase, Point3 } from "./types";

/**
 * Original mathematical schematic, authored as an isolated staged proposal.
 * Source text informs movement/structure facts, never coordinates or timing.
 * No external photographs, illustrations, film, tracing or motion capture used.
 * SPDX-License-Identifier: MIT. See accompanying full LICENSE and provenance.
 */
export type StandingSupportDraftId =
  "ladder-supported-hip-extension-slide" | "ladder-supported-side-leg-slide";
export type StandingSupportSide = "left" | "right";
export type StandingSupportScreenPoint = readonly [number, number];
export const STANDING_SUPPORT_MODEL_VERSION = "standing-support-original-0.1.0";
export const STANDING_SUPPORT_DRAFT_IDS: readonly StandingSupportDraftId[] =
  Object.freeze([
    "ladder-supported-hip-extension-slide",
    "ladder-supported-side-leg-slide",
  ]);
const phases = (rear: boolean): readonly DraftPhase[] =>
  Object.freeze(
    [
      { id: "setup", label: "시작 지지 배치", start: 0, end: 0.12, sample: 0 },
      {
        id: "move",
        label: rear ? "발 뒤로 슬라이드" : "발 옆으로 슬라이드",
        start: 0.12,
        end: 0.42,
        sample: 0.27,
      },
      { id: "turn", label: "뻗은 배치", start: 0.42, end: 0.58, sample: 0.5 },
      {
        id: "return",
        label: "발 돌아옴",
        start: 0.58,
        end: 0.88,
        sample: 0.73,
      },
      { id: "finish", label: "처음 지지 배치", start: 0.88, end: 1, sample: 1 },
    ].map((phase) =>
      Object.freeze({ ...phase, labelKo: phase.label } as DraftPhase),
    ),
  );
/** Five display fractions and holds are authoring choices, never exercise dosage. */
export const STANDING_SUPPORT_PHASES: Readonly<
  Record<StandingSupportDraftId, readonly DraftPhase[]>
> = Object.freeze({
  "ladder-supported-hip-extension-slide": phases(true),
  "ladder-supported-side-leg-slide": phases(false),
});
export const STANDING_SUPPORT_DRAWING_PARAMETERS = Object.freeze({
  thighLength: 69,
  shankLength: 68,
  upperArmLength: 67,
  forearmLength: 64,
  slideDistance: 32,
  selectedRungHeight: 188,
  selectedRungRadius: 4,
  palmRadius: 4,
  toeTipRadius: 4,
  heelRadius: 8,
});
export const STANDING_SUPPORT_PROVENANCE = Object.freeze({
  authoringStatusAtResearchTime: "isolated-staged-draft",
  authorship:
    "Original analytic body rig, Ladder Barrel schematic, React SVG and tests authored for this project",
  license:
    "MIT; original authored code and geometry only; external publisher works excluded",
  licenseFileAtResearchStage: "standing/LICENSE",
  sourceLedgerAtResearchStage: "research/standing-source-ledger.json",
  sourceCheckedAtUtc: "2026-11-05T00:55:40Z",
  sourceFactsLedger: "src/data/motionStandingSourceLedger.json",
  sourceFactsLedgerStatusAtAuthoring:
    "Intended root-owned installation path; this artifact was still isolated and staged when researched/authored",
  externalMediaCopied: false,
  externalMediaTraced: false,
  motionCaptureUsed: false,
  exactSourceVariantMatched: false,
  sourceVariantReconciliationRequired: true,
  matchedExercise: false,
  factualRecordsCanonicalSha256:
    "7c9ec0fe701d61d8835f4fd7b6c387d3c49565dc8dbe31dcb6e6224bcff9cc6d",
  sourceHashScope:
    "All six source_factual_records, including metadata and individual hashes, in the research ledger; excludes proposals/access_log and is not a hash of publisher files or authored geometry",
  adaptation:
    "NHS firm-support floor-standing slides adapted to an originally drawn Ladder Barrel rung; source exercise does not name Ladder Barrel",
  observedVersusChosen: {
    observedExercise:
      "RUH NHS describes holding a firm surface, sliding a leg sideways with toes forward, and sliding a leg backward while upright.",
    observedStructure:
      "Balanced Body guide describes rounded barrel, ladder uprights/crosspieces and adjustable spacing; these structure facts are separate from exercise evidence.",
    chosen:
      "Both hand/rung patches, exact floor patches, body and support-side fixation, two-link knee/hand geometry, dimensions, camera, ranges and phases are original authoring choices.",
  },
  sources: [
    {
      sourceId: "RUH-STANDING-SLIDES",
      factIds: ["RUH-START", "RUH-BACK", "RUH-SIDE"],
      factualRecordSha256:
        "a13eccc801230836124a55796ce97daae3a7563c77b4d3053fe5af31b8bea684",
      label: "RUH NHS · Hip strengthening exercises · Standing hip exercises",
      url: "https://www.ruh.nhs.uk/patients/patient_information/PHY033_Hip_strengthening_exercises.pdf",
      scope:
        "Generic firm-support exercise facts only; not an observed Ladder Barrel variant",
    },
    {
      sourceId: "BB-LADDER-GUIDE-2024",
      factIds: ["BB-STRUCTURE"],
      factualRecordSha256:
        "45ee23e13413211f7baae5b84eb9f54a71c371ccd67ef58142c97fb82b3d6d62",
      label: "Balanced Body · Ladder Barrel user guide · Structure",
      url: "https://s3.amazonaws.com/s3.pilates.com/User%20Guides/17656_UG_ladder_barrel%20FINAL%20web%207-23-24.pdf",
      scope:
        "Apparatus structure facts only; guide's barrel-supported stretches and frame-standing side bends are distinct from the proposed floor slides",
    },
    {
      sourceId: "MERRITHEW-LADDER-SUPPORT",
      factIds: ["MT-RUNGS"],
      factualRecordSha256:
        "11b7af58945e0bee046ac75bab7a07949c8cf361b47951220b68b9be455a9519",
      label: "Merrithew · Beat Client Boredom · Ladder Barrel support context",
      url: "https://www.merrithew.com/blog/post/2014-10-31/beat-client-boredom-3-barrels-to-refresh-pilates-workouts",
      scope:
        "General standing/vertical positions and rung support context only; not the selected one-foot floor slides",
    },
  ],
  drafts: {
    "ladder-supported-hip-extension-slide": {
      canonicalComparisonId: "original-barrel-standing-hip-extension",
      movement: "posterior +x floor slide",
      exactSourceVariantMatched: false,
    },
    "ladder-supported-side-leg-slide": {
      canonicalComparisonId: "original-barrel-standing-side-reach",
      movement: "anatomical lateral -y/+y floor slide",
      exactSourceVariantMatched: false,
    },
  },
  authoringChoices: [
    "Fixed pelvis, torso, head, both hands and opposite leg; movement of the active toe/heel patches only along a selected floor path",
    "Initially slightly flexed knees and constant-length two-link IK make each floor slide reachable with fixed hips",
    "Foot pose uses selected toe-tip and heel patches simultaneously; toe-only contact or exact source foot posture is not claimed",
    "Two fixed palms contact the top of an authored rung; hand IK, rung choice and grip are not manufacturer exercise instructions",
    "Barrel curved surface has no body contact in these floor-standing adaptations",
    "All apparatus/body dimensions, curves, phase fractions and projection are authoring choices, not manufacturer dimensions or settings",
  ],
  unknown: [
    "Exact Ladder Barrel exercise equivalence and source-variant reconciliation remain unapproved",
    "Precise hand/foot patches, knee flexion, complete torso fixation and support coordinates are not measured source facts",
    "RUH's slide wording does not directly establish continuous toe-tip/heel floor contact; this is a selected geometric constraint",
    "Strength, attachment, anchoring, spring/adjustment settings, forces, friction, loading, access/transfer and individual safety are not modeled or certified",
  ],
  professionalReviewCount: 0,
  approvedCatalogMappings: 0,
  exactAssetCount: 0,
  exactAssetReady: false,
  autoRecommendationEligible: false,
  safetyAssessment: "unassessed",
});

export interface StandingSupportLeg {
  anatomicalSide: StandingSupportSide;
  hip: Point3;
  knee: Point3;
  ankle: Point3;
  heel: Point3;
  toe: Point3;
}
export interface StandingSupportArm {
  anatomicalSide: StandingSupportSide;
  shoulder: Point3;
  elbow: Point3;
  hand: Point3;
}
export interface StandingSupportContact {
  id: string;
  anatomicalSide: StandingSupportSide;
  target: "floor" | "ladder-rung";
  patch: "palm" | "toe-tip" | "heel";
  role: "hand-support" | "standing-foot-support" | "moving-foot-slide";
  state: "fixed" | "sliding";
  evidence: "authored-contact-choice";
  bodyCenter: Point3;
  surfaceOffset: Point3;
  point: Point3;
  targetPoint: Point3;
}
export interface StandingSupportWorld {
  leftShoulder: Point3;
  leftElbow: Point3;
  leftHand: Point3;
  leftHip: Point3;
  leftKnee: Point3;
  leftAnkle: Point3;
  leftHeel: Point3;
  leftToe: Point3;
  rightShoulder: Point3;
  rightElbow: Point3;
  rightHand: Point3;
  rightHip: Point3;
  rightKnee: Point3;
  rightAnkle: Point3;
  rightHeel: Point3;
  rightToe: Point3;
  headCenter: Point3;
  nose: Point3;
  neck: Point3;
  chestCenter: Point3;
  pelvisCenter: Point3;
}
export interface StandingSupportApparatus {
  kind: "original-ladder-barrel-schematic";
  isGenericChair: false;
  manufacturerDimensions: false;
  supportStrengthAssessed: false;
  barrelBodyContact: false;
  floorStanding: true;
  baseCorners: readonly Point3[];
  baseFloorPoints: readonly Point3[];
  rails: readonly (readonly [Point3, Point3])[];
  uprights: readonly (readonly [Point3, Point3])[];
  rungs: readonly {
    id: string;
    centerHeight: number;
    radius: number;
    start: Point3;
    end: Point3;
    selected: boolean;
  }[];
  barrelFrontArc: readonly Point3[];
  barrelBackArc: readonly Point3[];
  barrelFrontBottom: readonly Point3[];
  barrelBackBottom: readonly Point3[];
  barrelSupports: readonly (readonly [Point3, Point3])[];
}
export interface StandingSupportDraftPose {
  draftId: StandingSupportDraftId;
  canonicalComparisonId:
    | "original-barrel-standing-hip-extension"
    | "original-barrel-standing-side-reach";
  modelVersion: string;
  authoringStatusAtResearchTime: "isolated-staged-draft";
  proposalStatus: "variant-proposal";
  exactSourceVariantMatched: false;
  progress: number;
  amount: number;
  phase: DraftPhase;
  phaseLabelKo: string;
  activeSide: StandingSupportSide;
  supportSide: StandingSupportSide;
  mirrored: boolean;
  path: "posterior" | "lateral";
  legs: Record<StandingSupportSide, StandingSupportLeg>;
  arms: Record<StandingSupportSide, StandingSupportArm>;
  world: StandingSupportWorld;
  screen: Record<keyof StandingSupportWorld, StandingSupportScreenPoint>;
  torso: readonly Point3[];
  contacts: readonly StandingSupportContact[];
  apparatus: StandingSupportApparatus;
  floor: { topZ: 0; corners: readonly Point3[] };
  camera: {
    projection: "authored-oblique-orthographic";
    width: 640;
    mirrored: boolean;
  };
  drawingParameters: typeof STANDING_SUPPORT_DRAWING_PARAMETERS;
  review: { status: "unreviewed"; professionalReviewCount: 0 };
  exactAssetCount: 0;
  exactAssetReady: false;
  autoRecommendationEligible: false;
  safetyAssessment: "unassessed";
}

const clone = (p: Point3): Point3 => [...p];
const add = (a: Point3, b: Point3): Point3 => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
];
const subtract = (a: Point3, b: Point3): Point3 => [
  a[0] - b[0],
  a[1] - b[1],
  a[2] - b[2],
];
const scale = (p: Point3, n: number): Point3 => [p[0] * n, p[1] * n, p[2] * n];
const dot = (a: Point3, b: Point3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const length = (p: Point3) => Math.hypot(...p);
function twoLink(
  root: Point3,
  end: Point3,
  a: number,
  b: number,
  hint: Point3,
): Point3 {
  const vector = subtract(end, root);
  const d = length(vector);
  if (d < 1e-9 || d > a + b + 1e-9 || d < Math.abs(a - b) - 1e-9)
    throw new RangeError(
      "authored endpoint is outside the two-link rig's reachable range",
    );
  const axis = scale(vector, 1 / d);
  const inPlane = subtract(hint, scale(axis, dot(hint, axis)));
  const bend = scale(inPlane, 1 / length(inPlane));
  const along = (a * a - b * b + d * d) / (2 * d);
  return add(
    add(root, scale(axis, along)),
    scale(bend, Math.sqrt(Math.max(0, a * a - along * along))),
  );
}
function amountAt(p: number): number {
  const smooth = (t: number) => t * t * (3 - 2 * t);
  if (p <= 0.12 || p >= 0.88) return 0;
  if (p < 0.42) return smooth((p - 0.12) / 0.3);
  if (p <= 0.58) return 1;
  return 1 - smooth((p - 0.58) / 0.3);
}
/** x: fore/aft (front toward ladder is -x); y: left(-)/right(+); z above floor. */
export function projectStandingSupportPoint(
  point: Point3,
  mirrored = false,
): StandingSupportScreenPoint {
  const x = 46 + point[0] * 1.05 + point[1] * 0.52;
  return [mirrored ? 640 - x : x, 312 + point[1] * 0.32 - point[2] * 0.78];
}
function makeApparatus(): StandingSupportApparatus {
  const arc = (y: number): readonly Point3[] =>
    Array.from({ length: 25 }, (_, index): Point3 => {
      const angle = (Math.PI * index) / 24;
      return [140 + 60 * Math.cos(angle), y, 145 + 80 * Math.sin(angle)];
    });
  return {
    kind: "original-ladder-barrel-schematic",
    isGenericChair: false,
    manufacturerDimensions: false,
    supportStrengthAssessed: false,
    barrelBodyContact: false,
    floorStanding: true,
    baseCorners: [
      [58, -86, 10],
      [276, -86, 10],
      [276, 86, 10],
      [58, 86, 10],
    ],
    baseFloorPoints: [
      [58, -86, 0],
      [276, -86, 0],
      [276, 86, 0],
      [58, 86, 0],
    ],
    rails: [
      [
        [70, -76, 14],
        [270, -76, 14],
      ],
      [
        [70, 76, 14],
        [270, 76, 14],
      ],
    ],
    uprights: [
      [
        [258, -72, 10],
        [258, -72, 244],
      ],
      [
        [258, 72, 10],
        [258, 72, 244],
      ],
    ],
    rungs: [28, 68, 108, 148, 188, 228].map((z, index) => ({
      id: `rung-${index + 1}`,
      centerHeight: z,
      radius: 4,
      start: [258, -72, z],
      end: [258, 72, z],
      selected: z === 188,
    })),
    barrelFrontArc: arc(65),
    barrelBackArc: arc(-65),
    barrelFrontBottom: [
      [80, 65, 75],
      [200, 65, 75],
    ],
    barrelBackBottom: [
      [80, -65, 75],
      [200, -65, 75],
    ],
    barrelSupports: [
      [
        [96, -53, 10],
        [96, -53, 75],
      ],
      [
        [184, -53, 10],
        [184, -53, 75],
      ],
      [
        [96, 53, 10],
        [96, 53, 75],
      ],
      [
        [184, 53, 10],
        [184, 53, 75],
      ],
    ],
  };
}
function makeLeg(
  side: StandingSupportSide,
  active: StandingSupportSide,
  posterior: boolean,
  q: number,
): StandingSupportLeg {
  const sign = side === "left" ? -1 : 1;
  const y = sign * 24;
  const hip: Point3 = [370, y, 143];
  const movement =
    side === active ? STANDING_SUPPORT_DRAWING_PARAMETERS.slideDistance * q : 0;
  const ankle: Point3 = [
    370 + (posterior ? movement : 0),
    y + (posterior ? 0 : sign * movement),
    10,
  ];
  const knee = twoLink(
    hip,
    ankle,
    STANDING_SUPPORT_DRAWING_PARAMETERS.thighLength,
    STANDING_SUPPORT_DRAWING_PARAMETERS.shankLength,
    [-1, 0, 0],
  );
  return {
    anatomicalSide: side,
    hip,
    knee,
    ankle,
    heel: add(ankle, [8, 0, -2]),
    toe: add(ankle, [-20, 0, -6]),
  };
}
function makeArm(side: StandingSupportSide): StandingSupportArm {
  const y = side === "left" ? -28 : 28;
  const shoulder: Point3 = [370, y, 232];
  const hand: Point3 = [258, y, 196];
  return {
    anatomicalSide: side,
    shoulder,
    hand,
    elbow: twoLink(
      shoulder,
      hand,
      STANDING_SUPPORT_DRAWING_PARAMETERS.upperArmLength,
      STANDING_SUPPORT_DRAWING_PARAMETERS.forearmLength,
      [0, 0, -1],
    ),
  };
}

/** Pure pose sampling; parent owns paused state, playback clock and controls. */
export function getStandingSupportDraftPose(
  id: StandingSupportDraftId,
  progress: number,
  {
    activeSide = "right",
    mirrored = false,
  }: { activeSide?: StandingSupportSide; mirrored?: boolean } = {},
): StandingSupportDraftPose {
  if (!STANDING_SUPPORT_DRAFT_IDS.includes(id))
    throw new TypeError("unknown standing support draft ID");
  if (!Number.isFinite(progress))
    throw new TypeError("progress must be finite");
  if (activeSide !== "left" && activeSide !== "right")
    throw new TypeError("activeSide must be left or right");
  if (typeof mirrored !== "boolean")
    throw new TypeError("mirrored must be boolean");
  const p = Math.max(0, Math.min(1, progress));
  const q = amountAt(p);
  const posterior = id === "ladder-supported-hip-extension-slide";
  const supportSide: StandingSupportSide =
    activeSide === "left" ? "right" : "left";
  const left = makeLeg("left", activeSide, posterior, q);
  const right = makeLeg("right", activeSide, posterior, q);
  const leftArm = makeArm("left");
  const rightArm = makeArm("right");
  const world: StandingSupportWorld = {
    leftShoulder: leftArm.shoulder,
    leftElbow: leftArm.elbow,
    leftHand: leftArm.hand,
    leftHip: left.hip,
    leftKnee: left.knee,
    leftAnkle: left.ankle,
    leftHeel: left.heel,
    leftToe: left.toe,
    rightShoulder: rightArm.shoulder,
    rightElbow: rightArm.elbow,
    rightHand: rightArm.hand,
    rightHip: right.hip,
    rightKnee: right.knee,
    rightAnkle: right.ankle,
    rightHeel: right.heel,
    rightToe: right.toe,
    headCenter: [370, 0, 274],
    nose: [349, 0, 268],
    neck: [370, 0, 249],
    chestCenter: [370, 0, 220],
    pelvisCenter: [370, 0, 143],
  };
  const screen = Object.fromEntries(
    Object.entries(world).map(([key, point]) => [
      key,
      projectStandingSupportPoint(point, mirrored),
    ]),
  ) as Record<keyof StandingSupportWorld, StandingSupportScreenPoint>;
  const contacts: StandingSupportContact[] = [];
  for (const [leg, arm] of [
    [left, leftArm],
    [right, rightArm],
  ] as const) {
    const sliding = leg.anatomicalSide === activeSide && q > 0;
    const handOffset: Point3 = [0, 0, -4];
    const palm = add(arm.hand, handOffset);
    contacts.push({
      id: `${leg.anatomicalSide}-palm-rung`,
      anatomicalSide: leg.anatomicalSide,
      target: "ladder-rung",
      patch: "palm",
      role: "hand-support",
      state: "fixed",
      evidence: "authored-contact-choice",
      bodyCenter: clone(arm.hand),
      surfaceOffset: handOffset,
      point: palm,
      targetPoint: [258, arm.hand[1], 192],
    });
    for (const patch of [
      { name: "toe-tip", center: leg.toe, radius: 4 },
      { name: "heel", center: leg.heel, radius: 8 },
    ] as const) {
      const point = add(patch.center, [0, 0, -patch.radius]);
      contacts.push({
        id: `${leg.anatomicalSide}-${patch.name}-floor`,
        anatomicalSide: leg.anatomicalSide,
        target: "floor",
        patch: patch.name,
        role:
          leg.anatomicalSide === activeSide
            ? "moving-foot-slide"
            : "standing-foot-support",
        state: sliding ? "sliding" : "fixed",
        evidence: "authored-contact-choice",
        bodyCenter: clone(patch.center),
        surfaceOffset: [0, 0, -patch.radius],
        point,
        targetPoint: [point[0], point[1], 0],
      });
    }
  }
  const phase =
    STANDING_SUPPORT_PHASES[id].find((part) => p < part.end) ??
    STANDING_SUPPORT_PHASES[id].at(-1)!;
  return {
    draftId: id,
    canonicalComparisonId: posterior
      ? "original-barrel-standing-hip-extension"
      : "original-barrel-standing-side-reach",
    modelVersion: STANDING_SUPPORT_MODEL_VERSION,
    authoringStatusAtResearchTime: "isolated-staged-draft",
    proposalStatus: "variant-proposal",
    exactSourceVariantMatched: false,
    progress: p,
    amount: q,
    phase,
    phaseLabelKo: phase.label,
    activeSide,
    supportSide,
    mirrored,
    path: posterior ? "posterior" : "lateral",
    legs: { left, right },
    arms: { left: leftArm, right: rightArm },
    world,
    screen,
    contacts,
    torso: [
      [356, -22, 143],
      [356, -26, 233],
      [384, -26, 233],
      [384, -22, 143],
      [356, 22, 143],
      [356, 26, 233],
      [384, 26, 233],
      [384, 22, 143],
    ],
    apparatus: makeApparatus(),
    floor: {
      topZ: 0,
      corners: [
        [44, -105, 0],
        [455, -105, 0],
        [455, 105, 0],
        [44, 105, 0],
      ],
    },
    camera: {
      projection: "authored-oblique-orthographic",
      width: 640,
      mirrored,
    },
    drawingParameters: STANDING_SUPPORT_DRAWING_PARAMETERS,
    review: { status: "unreviewed", professionalReviewCount: 0 },
    exactAssetCount: 0,
    exactAssetReady: false,
    autoRecommendationEligible: false,
    safetyAssessment: "unassessed",
  };
}
