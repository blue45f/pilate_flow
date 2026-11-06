/**
 * SPDX-License-Identifier: 0BSD
 * Original apparatus schematics; no media, tracing or captured motion.
 * Public facts and authored support/geometry choices are separate in apparatus-provenance.md.
 */
import type { AnatomicalSide, DraftPhase, Point3, ScreenPoint } from "./types";
import { getReformerFootworkGeometry } from "./reformerFootwork";
import { getChairPedalPressGeometry } from "./chairPedalPress";

export type ApparatusDraftId =
  "reformer-parallel-footwork" | "chair-seated-pedal-press";
export interface ApparatusDraftOptions {
  activeSide?: AnatomicalSide;
  mirrored?: boolean;
}
export interface ApparatusLeg {
  anatomicalSide: AnatomicalSide;
  role: "bilateral";
  hip: Point3;
  knee: Point3;
  ankle: Point3;
  heel: Point3;
  toe: Point3;
}
export interface ApparatusBody {
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
}
export interface ApparatusContact {
  id: string;
  side: AnatomicalSide | null;
  point: Point3;
  target:
    | "footbar"
    | "carriage-pelvis"
    | "carriage-back"
    | "carriage-headrest"
    | "chair-seat"
    | "chair-pedal";
  frame: "world" | "carriage" | "chair-seat" | "chair-pedal";
  localAnchor: Point3;
  state: "fixed-on-support";
}
export interface ReformerEquipment {
  kind: "reformer";
  frameCorners: readonly Point3[];
  railEnds: readonly (readonly [Point3, Point3])[];
  carriage: {
    origin: Point3;
    displacement: number;
    deck: readonly Point3[];
    headrest: readonly Point3[];
    shoulderBlocks: readonly (readonly Point3[])[];
  };
  footbar: {
    heelAnchors: Record<AnatomicalSide, Point3>;
    railEnds: readonly [Point3, Point3];
    struts: readonly (readonly [Point3, Point3])[];
    fixedForDrawing: true;
  };
  springs: "not-modeled";
  manufacturerSpecifics: "not-modeled";
}
export interface ChairEquipment {
  kind: "pilates-chair";
  isPilatesChair: true;
  isOrdinaryChair: false;
  seat: {
    origin: Point3;
    corners: readonly Point3[];
    sitBoneAnchors: Record<AnatomicalSide, Point3>;
  };
  frameCorners: readonly Point3[];
  pedal: {
    hinge: Point3;
    hingeAxis: "y";
    angle: number;
    length: number;
    width: number;
    corners: readonly Point3[];
    heelAnchors: Record<AnatomicalSide, Point3>;
  };
  springs: "not-modeled";
  manufacturerSpecifics: "not-modeled";
}
export interface ApparatusGeometry<
  E extends ReformerEquipment | ChairEquipment,
> {
  body: ApparatusBody;
  legs: Record<AnatomicalSide, ApparatusLeg>;
  contacts: ApparatusContact[];
  equipment: E;
}
interface ApparatusPoseBase {
  draftId: ApparatusDraftId;
  modelVersion: "original-apparatus-schematics-0.1.0";
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
export type ReformerDraftPose = ApparatusPoseBase & {
  draftId: "reformer-parallel-footwork";
  world: ApparatusGeometry<ReformerEquipment>;
};
export type ChairDraftPose = ApparatusPoseBase & {
  draftId: "chair-seated-pedal-press";
  world: ApparatusGeometry<ChairEquipment>;
};
export type ApparatusDraftPose = ReformerDraftPose | ChairDraftPose;
function phases(
  move: string,
  turn: string,
  back: string,
): readonly DraftPhase[] {
  const labels = ["시작 배치", move, turn, back, "처음 배치로 돌아옴"];
  const ids = ["setup", "move", "turn", "return", "finish"] as const;
  const starts = [0, 0.12, 0.42, 0.58, 0.88],
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
export const APPARATUS_PHASES: Readonly<
  Record<ApparatusDraftId, readonly DraftPhase[]>
> = Object.freeze({
  "reformer-parallel-footwork": phases(
    "양 무릎을 펴며 캐리지 이동",
    "캐리지가 멀어진 배치",
    "양 무릎을 굽히며 캐리지 복귀",
  ),
  "chair-seated-pedal-press": phases(
    "양 뒤꿈치로 회전 페달 내림",
    "회전 페달이 내려간 배치",
    "회전 페달이 처음 자리로 복귀",
  ),
});
export function projectApparatusPoint(
  p: Point3,
  mirrored = false,
): ScreenPoint {
  const x = p[0] + p[1] * 0.18;
  return [mirrored ? 640 - x : x, 304 + p[1] * 0.28 - p[2] * 0.76];
}
function envelope(p: number) {
  const smooth = (t: number) => t * t * (3 - 2 * t);
  if (p <= 0.12 || p >= 0.88) return 0;
  if (p < 0.42) return smooth((p - 0.12) / 0.3);
  if (p <= 0.58) return 1;
  return 1 - smooth((p - 0.58) / 0.3);
}
export function getApparatusDraftPose(
  draftId: ApparatusDraftId,
  progress: number,
  { activeSide = "right", mirrored = false }: ApparatusDraftOptions = {},
): ApparatusDraftPose {
  if (
    draftId !== "reformer-parallel-footwork" &&
    draftId !== "chair-seated-pedal-press"
  )
    throw new TypeError("Unknown independent apparatus draft ID.");
  if (!Number.isFinite(progress))
    throw new TypeError("progress must be finite");
  if (activeSide !== "left" && activeSide !== "right")
    throw new TypeError("activeSide must be left or right");
  if (typeof mirrored !== "boolean")
    throw new TypeError("mirrored must be boolean");
  const p = Math.max(0, Math.min(1, progress)),
    amount = envelope(p);
  const phase =
    APPARATUS_PHASES[draftId].find((phase) => p < phase.end) ??
    APPARATUS_PHASES[draftId].at(-1)!;
  const base = {
    modelVersion: "original-apparatus-schematics-0.1.0" as const,
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
  return draftId === "reformer-parallel-footwork"
    ? { ...base, draftId, world: getReformerFootworkGeometry(amount) }
    : { ...base, draftId, world: getChairPedalPressGeometry(amount) };
}
