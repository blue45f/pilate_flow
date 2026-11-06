/** SPDX-License-Identifier: 0BSD. Unreviewed original procedural schematics.
 * Source facts and authored rig choices: tension-provenance.md. */
import type { AnatomicalSide, DraftPhase, Point3, ScreenPoint } from "./types";
import { getReformerStrapArmPressGeometry } from "./reformerStrapArmPress";
import { getCadillacArmSpringPressGeometry } from "./cadillacArmSpringPress";
export type TensionDraftId =
  "reformer-supine-strap-arm-press" | "cadillac-supine-arm-spring-press";
export interface TensionDraftOptions {
  activeSide?: AnatomicalSide;
  mirrored?: boolean;
}
export interface TensionArm {
  anatomicalSide: AnatomicalSide;
  role: "bilateral";
  shoulder: Point3;
  elbow: Point3;
  hand: Point3;
}
export interface TensionLeg {
  anatomicalSide: AnatomicalSide;
  hip: Point3;
  knee: Point3;
  ankle: Point3;
  heel: Point3;
  toe: Point3;
}
export interface TensionBody {
  pelvisCenter: Point3;
  shoulderCenter: Point3;
  neck: Point3;
  headCenter: Point3;
}
export interface TensionContact {
  id: string;
  side: AnatomicalSide | null;
  point: Point3;
  localAnchor: Point3;
  frame: "carriage" | "table" | "handle";
  target:
    | "head-support"
    | "back-support"
    | "pelvis-support"
    | "heel-support"
    | "toe-support"
    | "handle-grip"
    | "ankle-ball";
  state: "supported" | "grasped";
}
export interface TensionRope {
  kind: "rope";
  side: AnatomicalSide;
  hand: Point3;
  pulley: Point3;
  carriageAnchor: Point3;
  referenceLength: number;
  geometricLength: number;
  segments: readonly (readonly [Point3, Point3])[];
}
export interface TensionSpring {
  kind: "visual-spring";
  side: AnatomicalSide;
  anchor: Point3;
  handle: Point3;
  visualLength: number;
  coil: readonly Point3[];
  force: "not-modeled";
}
export interface ReformerTensionEquipment {
  kind: "reformer";
  frame: readonly Point3[];
  rails: readonly (readonly [Point3, Point3])[];
  carriage: {
    origin: Point3;
    displacement: number;
    deck: readonly Point3[];
    headrest: readonly Point3[];
  };
  pulleys: Record<AnatomicalSide, Point3>;
  carriageAnchors: Record<AnatomicalSide, Point3>;
  lines: Record<AnatomicalSide, TensionRope>;
  ball: {
    kind: "generic-unspecified-ball";
    center: Point3;
    radius: number;
    sourceSizeVerified: false;
    pressure: "not-modeled";
  };
  springForce: "not-modeled";
  settings: "not-modeled";
}
export interface CadillacTensionEquipment {
  kind: "cadillac";
  table: { origin: Point3; corners: readonly Point3[] };
  frame: {
    uprights: readonly (readonly [Point3, Point3])[];
    top: readonly Point3[];
  };
  anchors: Record<AnatomicalSide, Point3>;
  lines: Record<AnatomicalSide, TensionSpring>;
  springForce: "not-modeled";
  settings: "not-modeled";
}
export interface TensionGeometry<
  E extends ReformerTensionEquipment | CadillacTensionEquipment,
> {
  body: TensionBody;
  arms: Record<AnatomicalSide, TensionArm>;
  legs: Record<AnatomicalSide, TensionLeg>;
  contacts: TensionContact[];
  equipment: E;
}
interface TensionPoseBase {
  modelVersion: "original-tension-schematics-0.1.0";
  progress: number;
  amount: number;
  phase: DraftPhase;
  phaseLabelKo: string;
  sideMode: "bilateral";
  activeSide: AnatomicalSide;
  camera: { nearAnatomicalSide: "left"; mirrored: boolean };
  review: {
    professionalReviewCount: 0;
    exactAsset: false;
    autoSubstitution: false;
  };
}
export type ReformerTensionPose = TensionPoseBase & {
  draftId: "reformer-supine-strap-arm-press";
  world: TensionGeometry<ReformerTensionEquipment>;
};
export type CadillacTensionPose = TensionPoseBase & {
  draftId: "cadillac-supine-arm-spring-press";
  world: TensionGeometry<CadillacTensionEquipment>;
};
export type TensionDraftPose = ReformerTensionPose | CadillacTensionPose;
function phases(
  move: string,
  turn: string,
  back: string,
): readonly DraftPhase[] {
  const ids = ["setup", "move", "turn", "return", "finish"] as const,
    labels = ["시작 배치", move, turn, back, "처음 배치로 돌아옴"],
    starts = [0, 0.12, 0.42, 0.58, 0.88],
    ends = [0.12, 0.42, 0.58, 0.88, 1],
    samples = [0, 0.29, 0.51, 0.74, 1];
  return Object.freeze(
    ids.map((id, i) =>
      Object.freeze({
        id,
        label: labels[i],
        labelKo: labels[i],
        start: starts[i],
        end: ends[i],
        sample: samples[i],
      }),
    ),
  );
}
export const TENSION_PHASES: Readonly<
  Record<TensionDraftId, readonly DraftPhase[]>
> = Object.freeze({
  "reformer-supine-strap-arm-press": phases(
    "양손이 내려가며 캐리지 이동",
    "양손이 낮아진 배치 · 로프 길이 유지",
    "양손과 캐리지가 처음 배치로 복귀",
  ),
  "cadillac-supine-arm-spring-press": phases(
    "굽힌 양팔로 손을 내림",
    "손이 낮아진 배치 · 시각적 스프링 변화",
    "굽힌 양팔이 처음 배치로 복귀",
  ),
});
/** World x head→feet, y width (anatomical left positive), z height; floor z=0. */
export function projectTensionPoint(p: Point3, mirrored = false): ScreenPoint {
  const x = p[0] + p[1] * 0.17;
  return [mirrored ? 640 - x : x, 306 + p[1] * 0.25 - p[2] * 0.74];
}
function amountAt(p: number) {
  const s = (t: number) => t * t * (3 - 2 * t);
  if (p <= 0.12 || p >= 0.88) return 0;
  if (p < 0.42) return s((p - 0.12) / 0.3);
  if (p <= 0.58) return 1;
  return 1 - s((p - 0.58) / 0.3);
}
export function getTensionDraftPose(
  draftId: TensionDraftId,
  progress: number,
  { activeSide = "right", mirrored = false }: TensionDraftOptions = {},
): TensionDraftPose {
  if (
    draftId !== "reformer-supine-strap-arm-press" &&
    draftId !== "cadillac-supine-arm-spring-press"
  )
    throw new TypeError("Unknown independent tension draft ID.");
  if (!Number.isFinite(progress))
    throw new TypeError("progress must be finite");
  if (activeSide !== "left" && activeSide !== "right")
    throw new TypeError("activeSide must be left or right");
  if (typeof mirrored !== "boolean")
    throw new TypeError("mirrored must be boolean");
  const p = Math.max(0, Math.min(1, progress)),
    amount = amountAt(p),
    phase =
      TENSION_PHASES[draftId].find((v) => p < v.end) ??
      TENSION_PHASES[draftId].at(-1)!;
  const base = {
    modelVersion: "original-tension-schematics-0.1.0" as const,
    progress: p,
    amount,
    phase,
    phaseLabelKo: phase.labelKo ?? phase.label,
    sideMode: "bilateral" as const,
    activeSide,
    camera: { nearAnatomicalSide: "left" as const, mirrored },
    review: {
      professionalReviewCount: 0 as const,
      exactAsset: false as const,
      autoSubstitution: false as const,
    },
  };
  return draftId === "reformer-supine-strap-arm-press"
    ? { ...base, draftId, world: getReformerStrapArmPressGeometry(amount) }
    : { ...base, draftId, world: getCadillacArmSpringPressGeometry(amount) };
}
