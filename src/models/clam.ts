import type {
  AnatomicalSide,
  ClamLeg,
  DraftPhase,
  Point3,
  ScreenPoint,
} from "./types";
/**
 * Original schematic authoring draft, not a validated exercise demonstration.
 * Source descriptions and authored geometry are separated in clam-source-facts.json.
 * No photographs, video frames, motion capture, or source illustrations were reused.
 */
export const MODEL_VERSION = "clam-original-schematic-0.1.0";
export const EXERCISE_ID = "original-mat-clam";
export const PHASES: readonly DraftPhase[] = Object.freeze([
  Object.freeze({
    id: "setup",
    label: "시작 배치",
    labelKo: "시작 배치",
    start: 0,
    end: 0.12,
    sample: 0,
  }),
  Object.freeze({
    id: "move",
    label: "위쪽 무릎 열림",
    labelKo: "위쪽 무릎 열림",
    start: 0.12,
    end: 0.42,
    sample: 0.29,
  }),
  Object.freeze({
    id: "turn",
    label: "열린 배치",
    labelKo: "열린 배치",
    start: 0.42,
    end: 0.58,
    sample: 0.51,
  }),
  Object.freeze({
    id: "return",
    label: "위쪽 무릎 돌아옴",
    labelKo: "위쪽 무릎 돌아옴",
    start: 0.58,
    end: 0.88,
    sample: 0.74,
  }),
  Object.freeze({
    id: "finish",
    label: "처음 배치",
    labelKo: "처음 배치",
    start: 0.88,
    end: 1,
    sample: 1,
  }),
]);

const MAX_OPENING_RAD = 0.62; // An authored drawing parameter, not a clinical angle.
const WIDTH = 640;
const clone = (point: Point3): Point3 => [...point];
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
const multiply = (a: Point3, n: number): Point3 => [
  a[0] * n,
  a[1] * n,
  a[2] * n,
];
const dot = (a: Point3, b: Point3): number =>
  a.reduce((sum, v, i) => sum + v * b[i], 0);
const cross = (a: Point3, b: Point3): Point3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const length = (a: Point3) => Math.hypot(...a);
const smoothstep = (t: number) => t * t * (3 - 2 * t);

const FIXED = Object.freeze({
  topHip: Object.freeze([300, 0, 56] as const),
  bottomHip: Object.freeze([300, 0, 32] as const),
  bottomKnee: Object.freeze([390, 100, 22] as const),
  heelContact: Object.freeze([480, 0, 12] as const),
  toeContact: Object.freeze([514, 5, 12] as const),
  shoulder: Object.freeze([192, 0, 37] as const),
  headCenter: Object.freeze([125, 0, 46] as const),
  elbow: Object.freeze([226, 64, 20] as const),
  hand: Object.freeze([278, 54, 12] as const),
  headPillowContact: Object.freeze([125, 0, 18] as const),
  shoulderMatContact: Object.freeze([192, 0, 0] as const),
  pelvisMatContact: Object.freeze([300, 0, 0] as const),
  bottomHeelMatContact: Object.freeze([480, 0, 0] as const),
});

/** Orthographic camera: x is along the body, y across the mat, z above the mat. */
export function projectClamPoint(point: Point3, mirrored = false): ScreenPoint {
  const x = point[0] + point[1] * 0.08;
  return [mirrored ? WIDTH - x : x, 268 + point[1] * 0.32 - point[2]];
}

function openingAt(progress: number) {
  if (progress <= 0.12 || progress >= 0.88) return 0;
  if (progress < 0.42) return smoothstep((progress - 0.12) / 0.3);
  if (progress <= 0.58) return 1;
  return 1 - smoothstep((progress - 0.58) / 0.3);
}

function phaseAt(progress: number): DraftPhase {
  return PHASES.find((phase) => progress < phase.end) ?? PHASES.at(-1)!;
}

/**
 * Rotate the top knee around the fixed hip–heel axis. Both segment lengths stay
 * constant in model space. This geometric constraint is not a biomechanical model.
 */
function getTopKnee(angleRad: number) {
  const hipToHeel = subtract(FIXED.heelContact, FIXED.topHip);
  const axis = multiply(hipToHeel, 1 / length(hipToHeel));
  const center = multiply(add(FIXED.topHip, FIXED.heelContact), 0.5);
  const radial: Point3 = [0, 100, 0];
  const rotated = add(
    add(
      multiply(radial, Math.cos(angleRad)),
      multiply(cross(axis, radial), Math.sin(angleRad)),
    ),
    multiply(axis, dot(axis, radial) * (1 - Math.cos(angleRad))),
  );
  return add(center, rotated);
}

export function getClamPose(
  progress: number,
  {
    activeSide = "right",
    mirrored = false,
  }: { activeSide?: AnatomicalSide; mirrored?: boolean } = {},
) {
  if (!Number.isFinite(progress))
    throw new TypeError("progress must be finite");
  if (activeSide !== "left" && activeSide !== "right")
    throw new TypeError("activeSide must be left or right");
  if (typeof mirrored !== "boolean")
    throw new TypeError("mirrored must be boolean");
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const opening = openingAt(clampedProgress);
  const topKnee = getTopKnee(MAX_OPENING_RAD * opening);
  const supportSide: AnatomicalSide = activeSide === "right" ? "left" : "right";
  const top: ClamLeg = {
    anatomicalSide: activeSide,
    placement: "top",
    hip: clone(FIXED.topHip),
    knee: topKnee,
    heel: clone(FIXED.heelContact),
    toe: clone(FIXED.toeContact),
  };
  const bottom: ClamLeg = {
    anatomicalSide: supportSide,
    placement: "bottom",
    hip: clone(FIXED.bottomHip),
    knee: clone(FIXED.bottomKnee),
    heel: clone(FIXED.heelContact),
    toe: clone(FIXED.toeContact),
  };
  const legs = { [activeSide]: top, [supportSide]: bottom } as Record<
    AnatomicalSide,
    ClamLeg
  >;
  const world = {
    topHip: top.hip,
    topKnee: top.knee,
    bottomHip: bottom.hip,
    bottomKnee: bottom.knee,
    topHeel: top.heel,
    bottomHeel: bottom.heel,
    topToe: top.toe,
    bottomToe: bottom.toe,
    shoulder: clone(FIXED.shoulder),
    headCenter: clone(FIXED.headCenter),
    elbow: clone(FIXED.elbow),
    hand: clone(FIXED.hand),
  };
  const screen = Object.fromEntries(
    Object.entries(world).map(([key, point]) => [
      key,
      projectClamPoint(point, mirrored),
    ]),
  ) as Record<keyof typeof world, ScreenPoint>;
  return {
    exerciseId: EXERCISE_ID,
    modelVersion: MODEL_VERSION,
    progress: clampedProgress,
    phase: phaseAt(clampedProgress).id,
    phaseLabelKo: phaseAt(clampedProgress).labelKo,
    opening,
    openingRad: MAX_OPENING_RAD * opening,
    activeSide,
    supportSide,
    mirrored,
    camera: { projection: "authored-oblique-orthographic", mirrored },
    legs,
    world,
    screen,
    anchors: {
      headPillow: clone(FIXED.headPillowContact),
      shoulderMat: clone(FIXED.shoulderMatContact),
      pelvisMat: clone(FIXED.pelvisMatContact),
      heelTogether: clone(FIXED.heelContact),
      bottomHeelMat: clone(FIXED.bottomHeelMatContact),
    },
    review: { status: "unreviewed", professionalReviewCount: 0 },
    safetyAssessment: "unassessed",
    autoRecommendationEligible: false,
  };
}

export type ClamPose = ReturnType<typeof getClamPose>;
