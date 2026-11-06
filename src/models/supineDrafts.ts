import type { AnatomicalSide, DraftPhase, Point3, ScreenPoint } from "./types";

/**
 * SPDX-License-Identifier: 0BSD
 * Original project-authored 3D schematic geometry. No photographs, illustrations,
 * video, tracing, captured motion, or third-party code are used.
 * Public-source facts and authoring choices are separated in SUPINE-PROVENANCE.md.
 * These unreviewed drafts are not exact exercise assets or safety validation.
 */
export type SupineDraftId = "adult-supine-heel-slide" | "supine-knee-fold";
export const SUPINE_MODEL_VERSION = "original-supine-schematics-0.1.0";

export interface SupineDraftOptions {
  activeSide?: AnatomicalSide;
  mirrored?: boolean;
}

export interface SupineLeg {
  anatomicalSide: AnatomicalSide;
  role: "active" | "support";
  hip: Point3;
  knee: Point3;
  ankle: Point3;
  heel: Point3;
  toe: Point3;
}

export interface SupineBody {
  pelvisCenter: Point3;
  shoulderCenter: Point3;
  neck: Point3;
  headCenter: Point3;
  leftShoulder: Point3;
  rightShoulder: Point3;
  leftElbow: Point3;
  rightElbow: Point3;
  leftHand: Point3;
  rightHand: Point3;
  pelvisMatContact: Point3;
  upperBackMatContact: Point3;
  headMatContact: Point3;
}

export interface SupineContact {
  id: string;
  side: AnatomicalSide | null;
  point: Point3;
  target: "mat";
  /** `sliding` describes a translating contact constraint, not measured speed. */
  state: "fixed" | "sliding" | "lifted";
}

export interface SupineDraftPose {
  draftId: SupineDraftId;
  modelVersion: typeof SUPINE_MODEL_VERSION;
  progress: number;
  amount: number;
  phase: DraftPhase;
  phaseLabelKo: string;
  activeSide: AnatomicalSide;
  supportSide: AnatomicalSide;
  sideMode: "unilateral";
  camera: {
    id: "authored-left-near-supine-oblique";
    nearAnatomicalSide: "left";
    mirrored: boolean;
  };
  world: {
    body: SupineBody;
    legs: Record<AnatomicalSide, SupineLeg>;
  };
  contacts: SupineContact[];
}

function phases(
  move: string,
  turn: string,
  back: string,
): readonly DraftPhase[] {
  return Object.freeze(
    [
      {
        id: "setup",
        label: "두 무릎 굽힌 시작 배치",
        start: 0,
        end: 0.12,
        sample: 0,
      },
      { id: "move", label: move, start: 0.12, end: 0.42, sample: 0.29 },
      { id: "turn", label: turn, start: 0.42, end: 0.58, sample: 0.51 },
      { id: "return", label: back, start: 0.58, end: 0.88, sample: 0.74 },
      {
        id: "finish",
        label: "처음 배치로 돌아옴",
        start: 0.88,
        end: 1,
        sample: 1,
      },
    ].map(
      (phase) =>
        Object.freeze({ ...phase, labelKo: phase.label }) as DraftPhase,
    ),
  );
}

export const SUPINE_PHASES: Readonly<
  Record<SupineDraftId, readonly DraftPhase[]>
> = Object.freeze({
  "adult-supine-heel-slide": phases(
    "한쪽 뒤꿈치가 매트 위로 멀어짐",
    "다리가 펴진 배치 · 뒤꿈치 접촉",
    "뒤꿈치가 처음 자리로 돌아옴",
  ),
  "supine-knee-fold": phases(
    "굽힌 한쪽 다리의 발이 들림",
    "한쪽 발이 매트에서 떨어진 배치",
    "한쪽 발을 처음 자리에 내려놓음",
  ),
});

/** All lengths, drawing angles, projection, and phase boundaries are authoring choices. */
export const SUPINE_DIMENSIONS = Object.freeze({
  thigh: 82,
  shin: 84,
  hipHeight: 30,
  ankleHeight: 12,
  hipX: 300,
  sideDepth: 23,
  heelFromAnkleX: -8,
  toeFromAnkleX: 30,
  headRadius: 24,
});

const SIDES = ["right", "left"] as const;
const copy = (p: Point3): Point3 => [...p];
const smoothstep = (p: number) => p * p * (3 - 2 * p);
const sideDepth = (side: AnatomicalSide) =>
  side === "left" ? SUPINE_DIMENSIONS.sideDepth : -SUPINE_DIMENSIONS.sideDepth;

const INITIAL_ANKLE_X =
  SUPINE_DIMENSIONS.hipX +
  Math.sqrt(
    SUPINE_DIMENSIONS.thigh ** 2 +
      SUPINE_DIMENSIONS.shin ** 2 -
      (SUPINE_DIMENSIONS.hipHeight - SUPINE_DIMENSIONS.ankleHeight) ** 2,
  );
const EXTENDED_ANKLE_X =
  SUPINE_DIMENSIONS.hipX +
  Math.sqrt(
    (SUPINE_DIMENSIONS.thigh + SUPINE_DIMENSIONS.shin) ** 2 -
      (SUPINE_DIMENSIONS.hipHeight - SUPINE_DIMENSIONS.ankleHeight) ** 2,
  );

/** x: head→feet, y: mat depth (left positive), z: height; mat is z=0. */
export function projectSupinePoint(
  point: Point3,
  mirrored = false,
): ScreenPoint {
  const x = point[0] + point[1] * 0.24;
  return [mirrored ? 640 - x : x, 286 + point[1] * 0.5 - point[2] * 1.05];
}

function amountAt(progress: number) {
  if (progress <= 0.12 || progress >= 0.88) return 0;
  if (progress < 0.42) return smoothstep((progress - 0.12) / 0.3);
  if (progress <= 0.58) return 1;
  return 1 - smoothstep((progress - 0.58) / 0.3);
}

/** Exact two-link sagittal geometry, using the knee-above-mat solution. */
function kneeBetween(hip: Point3, ankle: Point3): Point3 {
  const dx = ankle[0] - hip[0];
  const dz = ankle[2] - hip[2];
  const distance = Math.hypot(dx, dz);
  const { thigh, shin } = SUPINE_DIMENSIONS;
  if (distance === 0 || distance > thigh + shin + 1e-9)
    throw new RangeError("Authored leg cannot reach the ankle target.");
  const along = (thigh ** 2 - shin ** 2 + distance ** 2) / (2 * distance);
  const radial = Math.sqrt(Math.max(0, thigh ** 2 - along ** 2));
  return [
    hip[0] + (dx * along - dz * radial) / distance,
    hip[1],
    hip[2] + (dz * along + dx * radial) / distance,
  ];
}

function startingLeg(side: AnatomicalSide): SupineLeg {
  const y = sideDepth(side);
  const hip: Point3 = [SUPINE_DIMENSIONS.hipX, y, SUPINE_DIMENSIONS.hipHeight];
  const ankle: Point3 = [INITIAL_ANKLE_X, y, SUPINE_DIMENSIONS.ankleHeight];
  return {
    anatomicalSide: side,
    role: "support",
    hip,
    knee: kneeBetween(hip, ankle),
    ankle,
    heel: [INITIAL_ANKLE_X + SUPINE_DIMENSIONS.heelFromAnkleX, y, 0],
    toe: [INITIAL_ANKLE_X + SUPINE_DIMENSIONS.toeFromAnkleX, y, 0],
  };
}

function rotateAboutHip(point: Point3, hip: Point3, angle: number): Point3 {
  const x = point[0] - hip[0];
  const z = point[2] - hip[2];
  return [
    hip[0] + x * Math.cos(angle) - z * Math.sin(angle),
    point[1],
    hip[2] + x * Math.sin(angle) + z * Math.cos(angle),
  ];
}

function fixedBody(): SupineBody {
  return {
    pelvisCenter: [300, 0, 30],
    shoulderCenter: [185, 0, 30],
    neck: [152, 0, 30],
    headCenter: [120, 0, 24],
    leftShoulder: [185, 34, 30],
    rightShoulder: [185, -34, 30],
    leftElbow: [230, 53, 12],
    rightElbow: [230, -53, 12],
    leftHand: [280, 58, 6],
    rightHand: [280, -58, 6],
    pelvisMatContact: [300, 0, 0],
    upperBackMatContact: [185, 0, 0],
    headMatContact: [120, 0, 0],
  };
}

export function getSupineDraftPose(
  draftId: SupineDraftId,
  progress: number,
  { activeSide = "right", mirrored = false }: SupineDraftOptions = {},
): SupineDraftPose {
  if (draftId !== "adult-supine-heel-slide" && draftId !== "supine-knee-fold")
    throw new TypeError("Unknown independent supine draft ID.");
  if (!Number.isFinite(progress))
    throw new TypeError("progress must be finite");
  if (activeSide !== "left" && activeSide !== "right")
    throw new TypeError("activeSide must be left or right");
  if (typeof mirrored !== "boolean")
    throw new TypeError("mirrored must be boolean");
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const amount = amountAt(clampedProgress);
  const legs: Record<AnatomicalSide, SupineLeg> = {
    left: startingLeg("left"),
    right: startingLeg("right"),
  };
  const active = legs[activeSide];
  active.role = "active";
  if (draftId === "adult-supine-heel-slide") {
    const travel = (EXTENDED_ANKLE_X - INITIAL_ANKLE_X) * amount;
    active.ankle = [active.ankle[0] + travel, active.ankle[1], active.ankle[2]];
    active.heel = [active.heel[0] + travel, active.heel[1], 0];
    active.toe = [active.toe[0] + travel, active.toe[1], 0];
    active.knee = kneeBetween(active.hip, active.ankle);
  } else {
    // The bent leg and foot form one rigid display linkage about the fixed hip.
    // The source's foot-lift is retained; no second leg is animated in this cycle.
    const initialThighAngle = Math.atan2(
      active.knee[2] - active.hip[2],
      active.knee[0] - active.hip[0],
    );
    const rotation = (Math.PI / 2 - initialThighAngle) * amount;
    for (const key of ["knee", "ankle", "heel", "toe"] as const) {
      active[key] = rotateAboutHip(active[key], active.hip, rotation);
    }
    // Avoid signed zero and tiny floating-point residuals at exact floor contact.
    if (amount === 0)
      Object.assign(active, startingLeg(activeSide), { role: "active" });
  }
  const body = fixedBody();
  const contacts: SupineContact[] = SIDES.flatMap((side) => {
    const leg = legs[side];
    const state: SupineContact["state"] =
      side !== activeSide || amount === 0
        ? "fixed"
        : draftId === "adult-supine-heel-slide"
          ? "sliding"
          : "lifted";
    return (["heel", "toe"] as const).map((part) => ({
      id: `${side}-${part}`,
      side,
      point: copy(leg[part]),
      target: "mat" as const,
      state,
    }));
  });
  for (const [id, point] of [
    ["head", body.headMatContact],
    ["upper-back", body.upperBackMatContact],
    ["pelvis", body.pelvisMatContact],
  ] as const) {
    contacts.push({
      id,
      side: null,
      point: copy(point),
      target: "mat",
      state: "fixed",
    });
  }
  const phase =
    SUPINE_PHASES[draftId].find((item) => clampedProgress < item.end) ??
    SUPINE_PHASES[draftId].at(-1)!;
  return {
    draftId,
    modelVersion: SUPINE_MODEL_VERSION,
    progress: clampedProgress,
    amount,
    phase,
    phaseLabelKo: phase.labelKo ?? phase.label,
    activeSide,
    supportSide: activeSide === "right" ? "left" : "right",
    sideMode: "unilateral",
    camera: {
      id: "authored-left-near-supine-oblique",
      nearAnatomicalSide: "left",
      mirrored,
    },
    world: { body, legs },
    contacts,
  };
}
