import type { DraftPhase, Point3 } from "./types";

/**
 * Original analytic rig, authored while this work was an isolated staged draft.
 * Primary text informs a movement pattern, never these coordinates or timings.
 * No third-party image, film, tracing, motion capture or model is reproduced.
 * SPDX-License-Identifier: MIT. Full accompanying license is recorded in provenance.
 */
export type QuadrupedDraftId = "quadruped-arm-slide" | "quadruped-leg-slide";
export type QuadrupedSide = "left" | "right";
export type QuadrupedScreenPoint = readonly [number, number];
export const QUADRUPED_MODEL_VERSION = "quadruped-original-schematic-0.1.0";
export const QUADRUPED_DRAFT_IDS: readonly QuadrupedDraftId[] = Object.freeze([
  "quadruped-arm-slide",
  "quadruped-leg-slide",
]);
export const QUADRUPED_CANONICAL_COMPARISON_ID = "original-mat-quadruped-reach";

function phases(isArm: boolean): readonly DraftPhase[] {
  return Object.freeze(
    [
      { id: "setup", label: "시작 지지 배치", start: 0, end: 0.12, sample: 0 },
      {
        id: "move",
        label: isArm
          ? "한 손 앞 슬라이드"
          : "한 발 뒤 슬라이드 · 무릎 지지 해제",
        start: 0.12,
        end: 0.42,
        sample: 0.27,
      },
      { id: "turn", label: "뻗은 배치", start: 0.42, end: 0.58, sample: 0.5 },
      {
        id: "return",
        label: isArm ? "손 돌아옴" : "발 돌아옴 · 무릎 지지 복귀",
        start: 0.58,
        end: 0.88,
        sample: 0.73,
      },
      { id: "finish", label: "처음 지지 배치", start: 0.88, end: 1, sample: 1 },
    ].map((p) => Object.freeze({ ...p, labelKo: p.label } as DraftPhase)),
  );
}
/** Fractions, hold and smooth easing are authoring choices, not exercise dosage. */
export const QUADRUPED_PHASES: Readonly<
  Record<QuadrupedDraftId, readonly DraftPhase[]>
> = Object.freeze({
  "quadruped-arm-slide": phases(true),
  "quadruped-leg-slide": phases(false),
});

export const QUADRUPED_PROVENANCE = Object.freeze({
  authoringStatusAtResearchTime: "isolated-staged-draft",
  authorship:
    "Original procedural rig, geometric solver and React SVG authored for this project",
  license: "MIT; applies only to the original authored code and geometry",
  licenseFileAtResearchStage: "quadruped/LICENSE",
  installedLicenseFile: "src/models/QUADRUPED-LICENSE.txt",
  installedSourceFactsLedger: "src/data/motionQuadrupedSourceLedger.json",
  sourceLedgerAtResearchStage: "research/quadruped-source-ledger.json",
  sourceFactsCanonicalSha256:
    "b93b9ef0d1803c6844a8ec3129a964110b80e2b379ed4b12124b662dcece64c9",
  sourceHashScope:
    "Aggregate covers all five source_facts records in the research ledger, including metadata and individual hashes, serialized as canonical JSON; it is not a hash of publisher source bytes or BH-SLIDE alone",
  externalMediaCopied: false,
  externalMediaTraced: false,
  motionCaptureUsed: false,
  downloadedModelsUsed: false,
  sourceUse:
    "Primary text facts and outbound links only; external source copyrights are not licensed by this MIT notice",
  researchDateUtc: "2026-11-04",
  canonicalComparisonId: QUADRUPED_CANONICAL_COMPARISON_ID,
  relationship:
    "Two proposed variants of the same canonical movement, not two new independent catalog movements or approved mappings",
  sources: [
    {
      sourceId: "BH-SLIDE",
      factIds: ["BH1", "BH2", "BH3"],
      factualRecordSha256:
        "ae6e744caf61b171ccaa05d378bafa172fb11f1b1ee8baa519949a07c22b3d4f",
      label:
        "Body Harmonics · Arm & Leg Reach · How to build up to the full exercise",
      url: "https://www.bodyharmonics.com/arm-leg-reach/",
      observed:
        "The educator describes sliding one limb out and in, one at a time, before the opposite arm-and-leg and later lifted progressions.",
      scope:
        "Floor slide is supported by the progression context; the explicit no-lift wording is attached to the subsequent two-limb slide step.",
    },
  ],
  sourceRights: {
    termsUrl: "https://www.bodyharmonics.com/terms/",
    imagesVideoAndLayoutsReused: false,
    sourceMediaEmbedded: false,
    coordinatesDerivedFromMedia: false,
  },
  authoringChoices: [
    "Every coordinate, proportion, phase duration, easing, camera and slide distance",
    "A fixed torso, pelvis, shoulders, head and the other three primary hand/knee supports",
    "Arm variant: modest elbow flexion at setup, a short forward palm slide and two-link elbow motion to preserve both arm lengths",
    "Leg variant: chosen toe-tip ground patch slides while the active knee releases support and moves via two-link IK; the foot is not lifted",
    "A mathematical contact patch is not a measurement of pressure, load, friction, balance, forces or personal safety",
  ],
  unknown: [
    "Exact palm/finger or instep/toe contact patches are not stated in the primary text",
    "Exact active-knee release, stationary support coordinates and joint coupling are not source observations",
    "The authored elbow bend and numerical ranges need professional review before any exact catalog mapping",
    "The source's later combined-limb and lifted stages are not modeled by these separate single-limb cycles",
  ],
  drafts: {
    "quadruped-arm-slide": {
      title: "네발기기 한 팔 슬라이드",
      variant:
        "팔꿈치를 조금 굽힌 시작 배치에서 한 손바닥 접점을 앞으로 미끄러뜨리는 저작 제안",
      activeLimb: "arm",
      contactChoice:
        "A selected palm-surface point stays on the mat; no claim of a fully flat palm or measured pressure distribution",
    },
    "quadruped-leg-slide": {
      title: "네발기기 한 다리 슬라이드",
      variant:
        "발가락 접점을 뒤로 미끄러뜨리며 해당 무릎의 매트 지지를 해제하는 저작 제안",
      activeLimb: "leg",
      contactChoice:
        "A selected toe-tip surface point remains on the mat, while the active knee is released until return",
    },
  },
  professionalReviewCount: 0,
  approvedCatalogMappings: 0,
  exactAssetCount: 0,
  exactAssetReady: false,
  autoRecommendationEligible: false,
});

export interface QuadrupedLimb {
  anatomicalSide: QuadrupedSide;
  shoulder: Point3;
  elbow: Point3;
  hand: Point3;
  hip: Point3;
  knee: Point3;
  ankle: Point3;
  heel: Point3;
  toe: Point3;
}
export interface QuadrupedContact {
  id: string;
  anatomicalSide: QuadrupedSide;
  patch: "palm" | "knee" | "toe-tip";
  role: "primary-support" | "secondary-foot-contact";
  target: "mat";
  state: "fixed" | "sliding" | "released";
  evidence: "authored-contact-choice";
  bodyCenter: Point3;
  surfaceOffset: Point3;
  point: Point3;
  targetPoint: Point3;
}
export interface QuadrupedWorld {
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
  shoulderCenter: Point3;
  pelvisCenter: Point3;
  headCenter: Point3;
  nose: Point3;
  neck: Point3;
}
export interface QuadrupedDraftPose {
  draftId: QuadrupedDraftId;
  canonicalComparisonId: typeof QUADRUPED_CANONICAL_COMPARISON_ID;
  proposalStatus: "variant-proposal";
  authoringStatusAtResearchTime: "isolated-staged-draft";
  modelVersion: string;
  progress: number;
  phase: DraftPhase;
  phaseLabelKo: string;
  amount: number;
  activeSide: QuadrupedSide;
  supportSide: QuadrupedSide;
  activeLimb: "arm" | "leg";
  mirrored: boolean;
  limbs: Record<QuadrupedSide, QuadrupedLimb>;
  world: QuadrupedWorld;
  screen: Record<keyof QuadrupedWorld, QuadrupedScreenPoint>;
  contacts: readonly QuadrupedContact[];
  torso: readonly Point3[];
  support: { id: "mat"; topZ: 0; corners: readonly Point3[] };
  camera: {
    projection: "authored-oblique-orthographic";
    mirrored: boolean;
    width: 640;
  };
  drawingParameters: typeof QUADRUPED_DRAWING_PARAMETERS;
  review: { status: "unreviewed"; professionalReviewCount: 0 };
  exactAssetCount: 0;
  exactAssetReady: false;
  autoRecommendationEligible: false;
  safetyAssessment: "unassessed";
}

export const QUADRUPED_DRAWING_PARAMETERS = Object.freeze({
  upperArmLength: 75,
  forearmLength: 73,
  thighLength: 138,
  shankLength: Math.hypot(100, 2),
  armSlideDistance: 42,
  legSlideDistance: 75,
  palmCenterHeight: 8,
  kneeRadius: 12,
  toeTipRadius: 4,
});
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
const norm = (p: Point3) => Math.hypot(...p);

/** Constant-length two-link solution in the plane selected by a bend hint. */
function twoLink(
  root: Point3,
  end: Point3,
  lengthA: number,
  lengthB: number,
  bendHint: Point3,
): Point3 {
  const offset = subtract(end, root);
  const d = norm(offset);
  if (
    d < 1e-9 ||
    d > lengthA + lengthB + 1e-9 ||
    d < Math.abs(lengthA - lengthB) - 1e-9
  )
    throw new RangeError(
      "authored endpoint is outside the two-link rig's reachable range",
    );
  const axis = scale(offset, 1 / d);
  const hint = subtract(bendHint, scale(axis, dot(bendHint, axis)));
  const bend = scale(hint, 1 / norm(hint));
  const along = (lengthA ** 2 - lengthB ** 2 + d ** 2) / (2 * d);
  const perpendicular = Math.sqrt(Math.max(0, lengthA ** 2 - along ** 2));
  return add(add(root, scale(axis, along)), scale(bend, perpendicular));
}
function amountAt(p: number): number {
  const smooth = (t: number) => t * t * (3 - 2 * t);
  if (p <= 0.12 || p >= 0.88) return 0;
  if (p < 0.42) return smooth((p - 0.12) / 0.3);
  if (p <= 0.58) return 1;
  return 1 - smooth((p - 0.58) / 0.3);
}

/** x: head→feet, y: transverse (left negative), z: above mat. Screen mirror only. */
export function projectQuadrupedPoint(
  p: Point3,
  mirrored = false,
): QuadrupedScreenPoint {
  const x = p[0] + p[1] * 0.18;
  return [mirrored ? 640 - x : x, 300 + p[1] * 0.32 - p[2] * 0.95];
}

function makeLimb(
  side: QuadrupedSide,
  activeSide: QuadrupedSide,
  isArm: boolean,
  q: number,
): QuadrupedLimb {
  const y = side === "left" ? -38 : 38;
  const shoulder: Point3 = [190, y, 148];
  const hip: Point3 = [330, y, 150];
  const parameters = QUADRUPED_DRAWING_PARAMETERS;
  const hand: Point3 = [
    190 - (side === activeSide && isArm ? parameters.armSlideDistance * q : 0),
    y,
    parameters.palmCenterHeight,
  ];
  const ankle: Point3 = [
    430 + (side === activeSide && !isArm ? parameters.legSlideDistance * q : 0),
    y,
    10,
  ];
  const elbow = twoLink(
    shoulder,
    hand,
    parameters.upperArmLength,
    parameters.forearmLength,
    [1, 0, 0],
  );
  const knee: Point3 =
    side === activeSide && !isArm && q > 0
      ? twoLink(
          hip,
          ankle,
          parameters.thighLength,
          parameters.shankLength,
          [-1, 0, 0],
        )
      : [330, y, 12];
  return {
    anatomicalSide: side,
    shoulder,
    elbow,
    hand,
    hip,
    knee,
    ankle,
    heel: add(ankle, [8, 0, -2]),
    toe: add(ankle, [32, 0, -6]),
  };
}

/**
 * Two variants of one canonical comparison; this is never a catalog ID lookup.
 * Parent playback owns clocks, speed and pausing. This function is deterministic.
 */
export function getQuadrupedDraftPose(
  id: QuadrupedDraftId,
  progress: number,
  {
    activeSide = "right",
    mirrored = false,
  }: { activeSide?: QuadrupedSide; mirrored?: boolean } = {},
): QuadrupedDraftPose {
  if (!QUADRUPED_DRAFT_IDS.includes(id))
    throw new TypeError("unknown quadruped draft ID");
  if (!Number.isFinite(progress))
    throw new TypeError("progress must be finite");
  if (activeSide !== "left" && activeSide !== "right")
    throw new TypeError("activeSide must be left or right");
  if (typeof mirrored !== "boolean")
    throw new TypeError("mirrored must be boolean");
  const p = Math.max(0, Math.min(1, progress));
  const q = amountAt(p);
  const isArm = id === "quadruped-arm-slide";
  const supportSide: QuadrupedSide = activeSide === "left" ? "right" : "left";
  const left = makeLimb("left", activeSide, isArm, q);
  const right = makeLimb("right", activeSide, isArm, q);
  const world: QuadrupedWorld = {
    leftShoulder: left.shoulder,
    leftElbow: left.elbow,
    leftHand: left.hand,
    leftHip: left.hip,
    leftKnee: left.knee,
    leftAnkle: left.ankle,
    leftHeel: left.heel,
    leftToe: left.toe,
    rightShoulder: right.shoulder,
    rightElbow: right.elbow,
    rightHand: right.hand,
    rightHip: right.hip,
    rightKnee: right.knee,
    rightAnkle: right.ankle,
    rightHeel: right.heel,
    rightToe: right.toe,
    shoulderCenter: [190, 0, 148],
    pelvisCenter: [330, 0, 150],
    headCenter: [132, 0, 158],
    nose: [111, 0, 149],
    neck: [165, 0, 153],
  };
  const screen = Object.fromEntries(
    Object.entries(world).map(([key, point]) => [
      key,
      projectQuadrupedPoint(point, mirrored),
    ]),
  ) as Record<keyof QuadrupedWorld, QuadrupedScreenPoint>;
  const contacts: QuadrupedContact[] = [];
  for (const limb of [left, right]) {
    const isActive = limb.anatomicalSide === activeSide && q > 0;
    const patches = [
      {
        patch: "palm",
        center: limb.hand,
        radius: 8,
        state: isActive && isArm ? "sliding" : "fixed",
        role: "primary-support",
      },
      {
        patch: "knee",
        center: limb.knee,
        radius: 12,
        state: isActive && !isArm ? "released" : "fixed",
        role: "primary-support",
      },
      {
        patch: "toe-tip",
        center: limb.toe,
        radius: 4,
        state: isActive && !isArm ? "sliding" : "fixed",
        role: "secondary-foot-contact",
      },
    ] as const;
    for (const patch of patches) {
      const point = add(patch.center, [0, 0, -patch.radius]);
      contacts.push({
        id: `${limb.anatomicalSide}-${patch.patch}`,
        anatomicalSide: limb.anatomicalSide,
        patch: patch.patch,
        role: patch.role,
        target: "mat",
        state: patch.state,
        evidence: "authored-contact-choice",
        bodyCenter: clone(patch.center),
        surfaceOffset: [0, 0, -patch.radius],
        point,
        targetPoint: [point[0], point[1], 0],
      });
    }
  }
  const phase =
    QUADRUPED_PHASES[id].find((part) => p < part.end) ??
    QUADRUPED_PHASES[id].at(-1)!;
  return {
    draftId: id,
    canonicalComparisonId: QUADRUPED_CANONICAL_COMPARISON_ID,
    proposalStatus: "variant-proposal",
    authoringStatusAtResearchTime: "isolated-staged-draft",
    modelVersion: QUADRUPED_MODEL_VERSION,
    progress: p,
    phase,
    phaseLabelKo: phase.label,
    amount: q,
    activeSide,
    supportSide,
    activeLimb: isArm ? "arm" : "leg",
    mirrored,
    limbs: { left, right },
    world,
    screen,
    contacts,
    // Fixed rigid torso surfaces: intentionally no observed stabilization/force claim.
    torso: [
      [179, -31, 134],
      [179, -31, 164],
      [340, -31, 166],
      [340, -31, 134],
      [179, 31, 134],
      [179, 31, 164],
      [340, 31, 166],
      [340, 31, 134],
    ],
    support: {
      id: "mat",
      topZ: 0,
      corners: [
        [58, -100, 0],
        [594, -100, 0],
        [594, 100, 0],
        [58, 100, 0],
      ],
    },
    camera: {
      projection: "authored-oblique-orthographic",
      mirrored,
      width: 640,
    },
    drawingParameters: QUADRUPED_DRAWING_PARAMETERS,
    review: { status: "unreviewed", professionalReviewCount: 0 },
    exactAssetCount: 0,
    exactAssetReady: false,
    autoRecommendationEligible: false,
    safetyAssessment: "unassessed",
  };
}
