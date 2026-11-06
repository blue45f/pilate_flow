import { describe, expect, it } from "vitest";
import {
  buildStoryboardTimeline,
  decodeStoryboardJson,
  encodeStoryboardJson,
  formatStoryboardTime,
  makeMotionBlock,
  makeRestBlock,
  resolveStoryboardPosition,
} from "../utils/motionStoryboard";
import type {
  MotionStoryboardDraft,
  StoryboardBlock,
} from "../utils/motionStoryboard";

const drafts: readonly MotionStoryboardDraft[] = Object.freeze([
  Object.freeze({
    id: "both",
    title: "양쪽 제안",
    sideMode: "bilateral",
    status: "variant-proposal",
    expertReviewCount: 0,
  }),
  Object.freeze({
    id: "one",
    title: "한쪽 제안",
    sideMode: "unilateral",
    status: "variant-proposal",
    expertReviewCount: 0,
  }),
]);

const both = () => makeMotionBlock("motion-1", drafts[0]);
const one = () => makeMotionBlock("motion-2", drafts[1]);
const rest = () => makeRestBlock("rest-1");
const unsafeBlock = (value: unknown) => value as StoryboardBlock;
const unsafeDraft = (value: unknown) => value as MotionStoryboardDraft;

describe("motion storyboard snapshot validation and display-time accounting", () => {
  it("starts empty and assigns finite authoring defaults only when a block is explicitly made", () => {
    const timeline = buildStoryboardTimeline([], drafts);
    expect(timeline).toEqual({
      valid: true,
      errors: [],
      segments: [],
      motionSeconds: 0,
      restSeconds: 0,
      totalSeconds: 0,
    });
    expect(resolveStoryboardPosition(timeline, 0)).toBeNull();
    expect(both()).toEqual({
      id: "motion-1",
      kind: "motion",
      draftId: "both",
      side: "together",
      cycles: 1,
      secondsPerCycle: 8,
      mirrored: false,
    });
    expect(one().side).toBe("right");
    expect(rest()).toEqual({ id: "rest-1", kind: "rest", seconds: 15 });
  });

  it("expands cycles once and partitions motion/rest seconds without counting bilateral twice", () => {
    const blocks = Object.freeze([
      Object.freeze({ ...both(), cycles: 3 as const, secondsPerCycle: 10 }),
      Object.freeze(rest()),
      Object.freeze({
        ...one(),
        cycles: 2 as const,
        secondsPerCycle: 6,
        side: "left" as const,
        mirrored: true,
      }),
    ]);
    const before = JSON.stringify({ blocks, drafts });
    const timeline = buildStoryboardTimeline(blocks, drafts);
    expect(timeline.valid).toBe(true);
    expect(timeline.motionSeconds).toBe(42);
    expect(timeline.restSeconds).toBe(15);
    expect(timeline.totalSeconds).toBe(57);
    expect(timeline.motionSeconds + timeline.restSeconds).toBe(
      timeline.totalSeconds,
    );
    expect(
      timeline.segments.map((segment) => [
        segment.startSeconds,
        segment.endSeconds,
      ]),
    ).toEqual([
      [0, 10],
      [10, 20],
      [20, 30],
      [30, 45],
      [45, 51],
      [51, 57],
    ]);
    expect(timeline.segments.map((segment) => segment.index)).toEqual([
      0, 1, 2, 3, 4, 5,
    ]);
    expect(timeline.segments[3]).toEqual({
      index: 3,
      blockId: "rest-1",
      blockIndex: 1,
      kind: "rest",
      startSeconds: 30,
      endSeconds: 45,
      seconds: 15,
    });
    expect(timeline.segments[4]).toMatchObject({
      kind: "motion",
      blockIndex: 2,
      draftId: "one",
      cycleIndex: 0,
      side: "left",
      mirrored: true,
    });
    expect(timeline.segments[5]).toMatchObject({ cycleIndex: 1 });
    expect(JSON.stringify({ blocks, drafts })).toBe(before);
  });

  it("uses catalog membership instead of a fixed ID enum or object-property lookup", () => {
    for (const unknownId of [
      "missing",
      "__proto__",
      "constructor",
      "<script>alert(1)</script>",
    ]) {
      const timeline = buildStoryboardTimeline(
        [{ ...both(), draftId: unknownId }],
        drafts,
      );
      expect(timeline.valid).toBe(false);
      expect(timeline.errors.join(" ")).toContain("현재 제안 목록");
      expect(timeline.segments).toEqual([]);
    }
    const explicitDraft: MotionStoryboardDraft = {
      id: "__proto__",
      title: "명시된 제안",
      sideMode: "unilateral",
      status: "variant-proposal",
    };
    expect(
      buildStoryboardTimeline(
        [makeMotionBlock("explicit", explicitDraft)],
        [explicitDraft],
      ).valid,
    ).toBe(true);
  });

  it("keeps anatomical side separate from view mirroring and refuses side-mode mismatches", () => {
    for (const side of ["left", "right"] as const) {
      expect(buildStoryboardTimeline([{ ...both(), side }], drafts).valid).toBe(
        false,
      );
      const timeline = buildStoryboardTimeline(
        [{ ...one(), side, mirrored: true }],
        drafts,
      );
      expect(timeline.valid).toBe(true);
      expect(timeline.segments[0]).toMatchObject({ side, mirrored: true });
    }
    expect(
      buildStoryboardTimeline([{ ...one(), side: "together" }], drafts).valid,
    ).toBe(false);
    expect(
      buildStoryboardTimeline(
        [unsafeBlock({ ...one(), side: "screen-left" })],
        drafts,
      ).valid,
    ).toBe(false);
    expect(
      buildStoryboardTimeline(
        [unsafeBlock({ ...one(), mirrored: "yes" })],
        drafts,
      ).valid,
    ).toBe(false);
  });

  it("atomically rejects any invalid block instead of quietly shortening the authored sequence", () => {
    const timeline = buildStoryboardTimeline(
      [both(), { ...rest(), seconds: 0 }, one()],
      drafts,
    );
    expect(timeline.valid).toBe(false);
    expect(timeline.errors).toHaveLength(1);
    expect(timeline.errors[0]).toContain("블록 2");
    expect(timeline.segments).toEqual([]);
    expect(timeline.motionSeconds).toBe(0);
    expect(timeline.restSeconds).toBe(0);
    expect(timeline.totalSeconds).toBe(0);
    expect(resolveStoryboardPosition(timeline, 2)).toBeNull();
  });

  it.each([
    0,
    -1,
    4,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ])("rejects invalid finite cycle count %s", (cycles) => {
    expect(
      buildStoryboardTimeline([unsafeBlock({ ...both(), cycles })], drafts)
        .valid,
    ).toBe(false);
  });

  it.each([0, 1, 31, -2, 2.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid per-cycle display seconds %s",
    (secondsPerCycle) => {
      expect(
        buildStoryboardTimeline([{ ...both(), secondsPerCycle }], drafts).valid,
      ).toBe(false);
    },
  );

  it.each([0, -1, 121, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid rest display seconds %s",
    (seconds) => {
      expect(
        buildStoryboardTimeline([{ ...rest(), seconds }], drafts).valid,
      ).toBe(false);
    },
  );

  it("accepts exact finite limits for cycles, motion seconds and rest seconds", () => {
    for (const secondsPerCycle of [2, 30]) {
      for (const cycles of [1, 3] as const) {
        expect(
          buildStoryboardTimeline(
            [{ ...both(), secondsPerCycle, cycles }],
            drafts,
          ).totalSeconds,
        ).toBe(secondsPerCycle * cycles);
      }
    }
    for (const seconds of [1, 120]) {
      expect(
        buildStoryboardTimeline([{ ...rest(), seconds }], drafts).totalSeconds,
      ).toBe(seconds);
    }
  });

  it("rejects duplicate/blank block IDs and unsupported block kinds", () => {
    expect(buildStoryboardTimeline([both(), both()], drafts).valid).toBe(false);
    expect(
      buildStoryboardTimeline([{ ...both(), id: "  " }], drafts).valid,
    ).toBe(false);
    expect(
      buildStoryboardTimeline([unsafeBlock({ id: "x", kind: "class" })], drafts)
        .valid,
    ).toBe(false);
    expect(buildStoryboardTimeline([unsafeBlock(null)], drafts).valid).toBe(
      false,
    );
  });

  it("rejects catalog duplicates, invalid side metadata, reviewed status and any supplied nonzero expert count", () => {
    const invalidCatalogs: readonly MotionStoryboardDraft[][] = [
      [drafts[0], drafts[0]],
      [unsafeDraft({ ...drafts[0], sideMode: "alternate" })],
      [unsafeDraft({ ...drafts[0], status: "approved" })],
      [unsafeDraft({ ...drafts[0], expertReviewCount: 1 })],
      [unsafeDraft({ ...drafts[0], expertReviewCount: -1 })],
      [unsafeDraft({ ...drafts[0], expertReviewCount: Number.NaN })],
      [unsafeDraft({ ...drafts[0], id: "" })],
      [unsafeDraft(null)],
    ];
    for (const catalog of invalidCatalogs) {
      const timeline = buildStoryboardTimeline([both()], catalog);
      expect(timeline.valid).toBe(false);
      expect(timeline.errors.length).toBeGreaterThan(0);
      expect(timeline.segments).toEqual([]);
    }
  });
});

describe("strict review-only storyboard files", () => {
  const envelope = (
    blocks: unknown = [both(), rest(), one()],
    extra: object = {},
  ) =>
    JSON.stringify({
      format: "pilates-motion-storyboard",
      version: 1,
      purpose: "unreviewed-authoring-preview",
      blocks,
      ...extra,
    });

  it("round trips authored blocks only, without draft definitions or class/approval fields", () => {
    const blocks = [
      both(),
      rest(),
      { ...one(), side: "left" as const, mirrored: true },
    ];
    const result = encodeStoryboardJson(blocks, drafts);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(decodeStoryboardJson(result.json, drafts)).toEqual({
      ok: true,
      blocks,
    });
    expect(Object.keys(JSON.parse(result.json))).toEqual([
      "format",
      "version",
      "purpose",
      "blocks",
    ]);
    expect(result.json).not.toMatch(/approved|history|classId|sources|title/);
    expect(decodeStoryboardJson(envelope([]), drafts)).toEqual({
      ok: true,
      blocks: [],
    });
  });

  it.each([
    { version: 2 },
    { purpose: "certified-workout" },
    { format: "user-backup" },
    { approved: true },
    { __proto__: null, classId: "real-class" },
  ])("rejects incompatible or extra envelope data %j", (extra) => {
    expect(decodeStoryboardJson(envelope(undefined, extra), drafts).ok).toBe(
      false,
    );
  });

  it("rejects unknown IDs, side mismatches, invalid finite bounds, duplicate IDs and extra block fields atomically", () => {
    const invalid = [
      { ...both(), draftId: "unavailable" },
      { ...both(), draftId: "__proto__" },
      { ...both(), side: "left" },
      { ...one(), side: "together" },
      { ...both(), cycles: 0 },
      { ...both(), cycles: 4 },
      { ...both(), cycles: 1.5 },
      { ...both(), secondsPerCycle: 1 },
      { ...both(), secondsPerCycle: 31 },
      { ...both(), secondsPerCycle: Number.NaN },
      { ...both(), mirrored: "yes" },
      { ...rest(), seconds: 0 },
      { ...rest(), seconds: 121 },
      { ...both(), approved: true },
      { ...both(), id: "x".repeat(101) },
      { ...both(), id: " spaced " },
      { kind: "class", id: "class" },
      null,
    ];
    for (const block of invalid) {
      const result = decodeStoryboardJson(envelope([one(), block]), drafts);
      expect(result.ok).toBe(false);
      expect(result).not.toHaveProperty("blocks");
    }
    expect(decodeStoryboardJson(envelope([both(), both()]), drafts).ok).toBe(
      false,
    );
    expect(
      decodeStoryboardJson(envelope([one(), rest()]), [drafts[0]]).ok,
    ).toBe(false);
  });

  it("bounds block counts and UTF-8 bytes before accepting a file", () => {
    const fifty = Array.from({ length: 50 }, (_, index) => ({
      ...rest(),
      id: `r-${index}`,
    }));
    expect(decodeStoryboardJson(envelope(fifty), drafts).ok).toBe(true);
    expect(
      decodeStoryboardJson(
        envelope([...fifty, { ...rest(), id: "r-50" }]),
        drafts,
      ).ok,
    ).toBe(false);
    expect(
      buildStoryboardTimeline([...fifty, { ...rest(), id: "r-50" }], drafts)
        .valid,
    ).toBe(false);
    expect(decodeStoryboardJson(" ".repeat(65_537), drafts).ok).toBe(false);
    expect(
      decodeStoryboardJson(
        envelope([], { extra: "한".repeat(23_000) }),
        drafts,
      ),
    ).toEqual({ ok: false, error: "제작 조합 파일은 64KiB 이하여야 합니다." });
  });

  it("rejects malformed shapes and preserves caller-owned source arrays on failure", () => {
    const blocks = Object.freeze([Object.freeze(one()), Object.freeze(rest())]);
    const before = JSON.stringify({ drafts, blocks });
    for (const raw of [
      "{",
      "null",
      "[]",
      "{}",
      envelope(null),
      envelope({ 0: both() }),
    ]) {
      expect(decodeStoryboardJson(raw, drafts).ok).toBe(false);
    }
    expect(
      encodeStoryboardJson([{ ...both(), secondsPerCycle: 0 }], drafts).ok,
    ).toBe(false);
    expect(JSON.stringify({ drafts, blocks })).toBe(before);
  });
});

describe("storyboard position resolution and finite cuts", () => {
  const timeline = buildStoryboardTimeline(
    [
      { ...both(), cycles: 2, secondsPerCycle: 4 },
      { ...rest(), seconds: 3 },
      { ...one(), secondsPerCycle: 2 },
    ],
    drafts,
  );

  it("calculates actual per-cycle phase rather than a single whole-sequence percentage", () => {
    expect(resolveStoryboardPosition(timeline, 2)).toMatchObject({
      segment: { kind: "motion", draftId: "both", cycleIndex: 0 },
      progress: 0.5,
    });
    expect(resolveStoryboardPosition(timeline, 6)).toMatchObject({
      segment: { kind: "motion", draftId: "both", cycleIndex: 1 },
      progress: 0.5,
    });
    expect(resolveStoryboardPosition(timeline, 12)).toMatchObject({
      segment: { kind: "motion", draftId: "one", cycleIndex: 0 },
      progress: 0.5,
    });
  });

  it("cuts to each next cycle and to a distinct rest segment at exact boundaries", () => {
    expect(resolveStoryboardPosition(timeline, 4)).toMatchObject({
      segment: { index: 1 },
      progress: 0,
    });
    expect(resolveStoryboardPosition(timeline, 8)).toMatchObject({
      segment: { kind: "rest" },
      progress: 0,
    });
    expect(resolveStoryboardPosition(timeline, 9.5)).toMatchObject({
      segment: { kind: "rest" },
      progress: 0.5,
    });
    expect(resolveStoryboardPosition(timeline, 11)).toMatchObject({
      segment: { draftId: "one" },
      progress: 0,
    });
  });

  it("holds the last finite frame without wrapping or inventing another cycle", () => {
    expect(resolveStoryboardPosition(timeline, 13)).toMatchObject({
      segment: { index: 3, draftId: "one" },
      progress: 1,
      elapsedSeconds: 13,
    });
    expect(resolveStoryboardPosition(timeline, 1_000)).toEqual(
      resolveStoryboardPosition(timeline, 13),
    );
    expect(resolveStoryboardPosition(timeline, -4)).toMatchObject({
      progress: 0,
      elapsedSeconds: 0,
    });
    expect(resolveStoryboardPosition(timeline, Number.NaN)).toMatchObject({
      progress: 0,
      elapsedSeconds: 0,
    });
  });

  it("formats display seconds without introducing workout prescriptions", () => {
    expect(formatStoryboardTime(0)).toBe("0:00");
    expect(formatStoryboardTime(59.9)).toBe("0:59");
    expect(formatStoryboardTime(125)).toBe("2:05");
    expect(formatStoryboardTime(-1)).toBe("0:00");
    expect(formatStoryboardTime(Number.NaN)).toBe("0:00");
  });
});
