/** Local, unreviewed motion-authoring data. No exercise or planning registry is consulted. */
export interface MotionStoryboardDraft {
  readonly id: string;
  readonly title: string;
  readonly sideMode: "bilateral" | "unilateral";
  readonly status: "variant-proposal";
  readonly expertReviewCount?: number;
  readonly professionalReviewCount?: number;
}

export type StoryboardSide = "left" | "right" | "together";

export interface StoryboardMotionBlock {
  readonly id: string;
  readonly kind: "motion";
  readonly draftId: string;
  readonly side: StoryboardSide;
  readonly cycles: 1 | 2 | 3;
  readonly secondsPerCycle: number;
  readonly mirrored: boolean;
}

export interface StoryboardRestBlock {
  readonly id: string;
  readonly kind: "rest";
  readonly seconds: number;
}

export type StoryboardBlock = StoryboardMotionBlock | StoryboardRestBlock;

interface StoryboardSegmentBase {
  readonly index: number;
  readonly blockId: string;
  readonly blockIndex: number;
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly seconds: number;
}

export interface StoryboardMotionSegment extends StoryboardSegmentBase {
  readonly kind: "motion";
  readonly draftId: string;
  readonly cycleIndex: number;
  readonly side: StoryboardSide;
  readonly mirrored: boolean;
}

export interface StoryboardRestSegment extends StoryboardSegmentBase {
  readonly kind: "rest";
}

export type StoryboardSegment = StoryboardMotionSegment | StoryboardRestSegment;

export interface StoryboardTimeline {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly segments: readonly StoryboardSegment[];
  readonly motionSeconds: number;
  readonly restSeconds: number;
  readonly totalSeconds: number;
}

export interface StoryboardPosition {
  readonly segment: StoryboardSegment;
  readonly progress: number;
  readonly elapsedSeconds: number;
}

export const STORYBOARD_DEFAULT_CYCLE_SECONDS = 8;
export const STORYBOARD_DEFAULT_REST_SECONDS = 15;
export const STORYBOARD_MAX_BLOCKS = 50;
export const STORYBOARD_MAX_JSON_BYTES = 65_536;

const integerInRange = (
  value: unknown,
  minimum: number,
  maximum: number,
): value is number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= minimum &&
  value <= maximum;

const nonemptyId = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

/**
 * A bad block/catalog invalidates the whole snapshot, so an omitted invalid block
 * can never silently shorten or change the authored simulation.
 */
export function buildStoryboardTimeline(
  blocks: readonly StoryboardBlock[],
  drafts: readonly MotionStoryboardDraft[],
): StoryboardTimeline {
  const errors: string[] = [];
  if (blocks.length > STORYBOARD_MAX_BLOCKS) {
    return {
      valid: false,
      errors: ["제작 조합은 최대 50개 블록까지 표시할 수 있습니다."],
      segments: [],
      motionSeconds: 0,
      restSeconds: 0,
      totalSeconds: 0,
    };
  }
  const catalog = new Map<string, MotionStoryboardDraft>();
  drafts.forEach((draft, index) => {
    if (!draft || !nonemptyId(draft.id)) {
      errors.push(`제안 ${index + 1}: 유효한 제안 ID가 필요합니다.`);
      return;
    }
    if (catalog.has(draft.id))
      errors.push(`제안 ${index + 1}: 중복된 제안 ID입니다.`);
    if (draft.sideMode !== "bilateral" && draft.sideMode !== "unilateral") {
      errors.push(`제안 ${index + 1}: 좌우 구분 정보가 유효하지 않습니다.`);
    }
    if (draft.status !== "variant-proposal") {
      errors.push(`제안 ${index + 1}: 미검토 변형 제안만 조합할 수 있습니다.`);
    }
    if (
      (draft.expertReviewCount !== undefined &&
        draft.expertReviewCount !== 0) ||
      (draft.professionalReviewCount !== undefined &&
        draft.professionalReviewCount !== 0)
    ) {
      errors.push(
        `제안 ${index + 1}: 전문가 검토 0건인 미검토 제작 제안만 조합할 수 있습니다.`,
      );
    }
    catalog.set(draft.id, draft);
  });

  const blockIds = new Set<string>();
  const segments: StoryboardSegment[] = [];
  let motionSeconds = 0;
  let restSeconds = 0;
  let totalSeconds = 0;
  blocks.forEach((block, blockIndex) => {
    const label = `블록 ${blockIndex + 1}`;
    if (!block || !nonemptyId(block.id)) {
      errors.push(`${label}: 유효한 블록 ID가 필요합니다.`);
      return;
    }
    if (blockIds.has(block.id)) errors.push(`${label}: 중복된 블록 ID입니다.`);
    blockIds.add(block.id);
    if (block.kind === "rest") {
      if (!integerInRange(block.seconds, 1, 120)) {
        errors.push(`${label}: 쉬는 화면은 1~120초의 정수로 입력해 주세요.`);
        return;
      }
      segments.push({
        index: segments.length,
        blockId: block.id,
        blockIndex,
        kind: "rest",
        startSeconds: totalSeconds,
        endSeconds: totalSeconds + block.seconds,
        seconds: block.seconds,
      });
      restSeconds += block.seconds;
      totalSeconds += block.seconds;
      return;
    }
    if (block.kind !== "motion") {
      errors.push(`${label}: 알 수 없는 블록 종류입니다.`);
      return;
    }
    const draft =
      typeof block.draftId === "string"
        ? catalog.get(block.draftId)
        : undefined;
    if (!draft)
      errors.push(`${label}: 현재 제안 목록에 있는 모션을 선택해 주세요.`);
    const validCycles = integerInRange(block.cycles, 1, 3);
    const validSeconds = integerInRange(block.secondsPerCycle, 2, 30);
    if (!validCycles)
      errors.push(`${label}: 주기 수는 1~3회의 정수로 입력해 주세요.`);
    if (!validSeconds)
      errors.push(
        `${label}: 주기별 표시 시간은 2~30초의 정수로 입력해 주세요.`,
      );
    if (typeof block.mirrored !== "boolean")
      errors.push(`${label}: 화면 반전 값이 유효하지 않습니다.`);
    const validSide =
      draft?.sideMode === "bilateral"
        ? block.side === "together"
        : draft?.sideMode === "unilateral" &&
          (block.side === "left" || block.side === "right");
    if (draft && !validSide) {
      errors.push(
        `${label}: 양쪽 모션은 함께, 한쪽 모션은 몸의 왼쪽 또는 오른쪽을 선택해 주세요.`,
      );
    }
    if (
      !draft ||
      !validCycles ||
      !validSeconds ||
      !validSide ||
      typeof block.mirrored !== "boolean"
    )
      return;
    for (let cycleIndex = 0; cycleIndex < block.cycles; cycleIndex += 1) {
      segments.push({
        index: segments.length,
        blockId: block.id,
        blockIndex,
        kind: "motion",
        draftId: draft.id,
        cycleIndex,
        side: block.side,
        mirrored: block.mirrored,
        startSeconds: totalSeconds,
        endSeconds: totalSeconds + block.secondsPerCycle,
        seconds: block.secondsPerCycle,
      });
      motionSeconds += block.secondsPerCycle;
      totalSeconds += block.secondsPerCycle;
    }
  });
  if (!Number.isSafeInteger(totalSeconds))
    errors.push("총 표시 시간이 유효한 범위를 벗어났습니다.");
  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      segments: [],
      motionSeconds: 0,
      restSeconds: 0,
      totalSeconds: 0,
    };
  }
  return {
    valid: true,
    errors,
    segments,
    motionSeconds,
    restSeconds,
    totalSeconds,
  };
}

/** Each cut selects the next segment; the finite final frame remains at progress 1. */
export function resolveStoryboardPosition(
  timeline: StoryboardTimeline,
  elapsedSeconds: number,
): StoryboardPosition | null {
  if (
    !timeline.valid ||
    timeline.segments.length === 0 ||
    timeline.totalSeconds <= 0
  )
    return null;
  const elapsed = Math.max(
    0,
    Math.min(
      timeline.totalSeconds,
      Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0,
    ),
  );
  const segment =
    elapsed === timeline.totalSeconds
      ? timeline.segments[timeline.segments.length - 1]
      : timeline.segments.find(
          (item) => elapsed >= item.startSeconds && elapsed < item.endSeconds,
        );
  if (!segment) return null;
  return {
    segment,
    elapsedSeconds: elapsed,
    progress: Math.max(
      0,
      Math.min(1, (elapsed - segment.startSeconds) / segment.seconds),
    ),
  };
}

export function makeMotionBlock(
  id: string,
  draft: MotionStoryboardDraft,
): StoryboardMotionBlock {
  return {
    id,
    kind: "motion",
    draftId: draft.id,
    side: draft.sideMode === "bilateral" ? "together" : "right",
    cycles: 1,
    secondsPerCycle: STORYBOARD_DEFAULT_CYCLE_SECONDS,
    mirrored: false,
  };
}

export function makeRestBlock(id: string): StoryboardRestBlock {
  return { id, kind: "rest", seconds: STORYBOARD_DEFAULT_REST_SECONDS };
}

/** Display-time label only; this does not describe prescribed exercise duration. */
export function formatStoryboardTime(seconds: number): string {
  const finiteSeconds = Number.isFinite(seconds)
    ? Math.max(0, Math.floor(seconds))
    : 0;
  return `${Math.floor(finiteSeconds / 60)}:${String(finiteSeconds % 60).padStart(2, "0")}`;
}

export type StoryboardImportResult =
  | { readonly ok: true; readonly blocks: readonly StoryboardBlock[] }
  | { readonly ok: false; readonly error: string };

export type StoryboardExportResult =
  | { readonly ok: true; readonly json: string }
  | { readonly ok: false; readonly error: string };

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
) {
  const keys = Object.keys(value);
  return (
    keys.length === expected.length &&
    keys.every((key) => expected.includes(key))
  );
}

function utf8Bytes(value: string) {
  let count = 0;
  for (const character of value) {
    const point = character.codePointAt(0) ?? 0;
    count += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
  }
  return count;
}

/** Strict versioned authoring file; imports never map into a workout/class registry. */
export function decodeStoryboardJson(
  raw: string,
  drafts: readonly MotionStoryboardDraft[],
): StoryboardImportResult {
  if (
    typeof raw !== "string" ||
    raw.length > STORYBOARD_MAX_JSON_BYTES ||
    utf8Bytes(raw) > STORYBOARD_MAX_JSON_BYTES
  ) {
    return { ok: false, error: "제작 조합 파일은 64KiB 이하여야 합니다." };
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { ok: false, error: "올바른 JSON 제작 조합 파일이 아닙니다." };
  }
  if (
    !record(value) ||
    !exactKeys(value, ["format", "version", "purpose", "blocks"]) ||
    value.format !== "pilates-motion-storyboard" ||
    value.version !== 1 ||
    value.purpose !== "unreviewed-authoring-preview"
  ) {
    return {
      ok: false,
      error: "버전 1의 미검토 제작 조합 파일만 불러올 수 있습니다.",
    };
  }
  if (
    !Array.isArray(value.blocks) ||
    value.blocks.length > STORYBOARD_MAX_BLOCKS
  ) {
    return {
      ok: false,
      error: "제작 조합은 최대 50개 블록까지 불러올 수 있습니다.",
    };
  }
  for (const block of value.blocks) {
    if (
      !record(block) ||
      typeof block.id !== "string" ||
      block.id.length > 100 ||
      block.id.trim() !== block.id ||
      !block.id.length
    ) {
      return { ok: false, error: "블록 ID가 유효하지 않습니다." };
    }
    const keys =
      block.kind === "motion"
        ? [
            "id",
            "kind",
            "draftId",
            "side",
            "cycles",
            "secondsPerCycle",
            "mirrored",
          ]
        : block.kind === "rest"
          ? ["id", "kind", "seconds"]
          : [];
    if (
      !keys.length ||
      !exactKeys(block, keys) ||
      (block.kind === "motion" &&
        (typeof block.draftId !== "string" || block.draftId.length > 160))
    ) {
      return {
        ok: false,
        error: "알 수 없는 블록 종류 또는 허용되지 않은 필드가 있습니다.",
      };
    }
  }
  const blocks = value.blocks as StoryboardBlock[];
  const timeline = buildStoryboardTimeline(blocks, drafts);
  if (!timeline.valid) return { ok: false, error: timeline.errors.join(" ") };
  return { ok: true, blocks };
}

export function encodeStoryboardJson(
  blocks: readonly StoryboardBlock[],
  drafts: readonly MotionStoryboardDraft[],
): StoryboardExportResult {
  try {
    const json = JSON.stringify(
      {
        format: "pilates-motion-storyboard",
        version: 1,
        purpose: "unreviewed-authoring-preview",
        blocks,
      },
      null,
      2,
    );
    const result = decodeStoryboardJson(json, drafts);
    return result.ok ? { ok: true, json } : result;
  } catch {
    return { ok: false, error: "유효한 제작 조합만 저장할 수 있습니다." };
  }
}
