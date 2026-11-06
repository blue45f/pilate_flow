import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LateralDraftFigure } from "../components/LateralDraftFigure";
import {
  getLateralDraftPose,
  LATERAL_DRAFT_IDS,
  LATERAL_PHASES,
  LATERAL_PROVENANCE,
  projectLateralPoint,
} from "../models/lateralDrafts";
import type {
  LateralDraftId,
  LateralDraftPose,
  LateralWorld,
} from "../models/lateralDrafts";
import type { AnatomicalSide, Point3 } from "../models/types";

const distance = (a: Point3, b: Point3) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
function segmentLengths(pose: LateralDraftPose): number[] {
  const lengths: number[] = [];
  for (const side of ["left", "right"] as const) {
    const l = pose.legs[side];
    const a = pose.arms[side];
    lengths.push(
      distance(l.hip, l.knee),
      distance(l.knee, l.ankle),
      distance(l.ankle, l.heel),
      distance(l.heel, l.toe),
      distance(a.shoulder, a.elbow),
      distance(a.elbow, a.hand),
    );
  }
  lengths.push(
    distance(pose.world.topShoulder, pose.world.bottomShoulder),
    distance(pose.world.headCenter, pose.world.nose),
  );
  for (const ring of pose.torsoRings) {
    for (let index = 0; index < ring.length; index++)
      lengths.push(distance(ring[index], ring[(index + 1) % ring.length]));
  }
  return lengths;
}
const fixedLift: readonly (keyof LateralWorld)[] = [
  "topHip",
  "bottomHip",
  "bottomKnee",
  "bottomAnkle",
  "bottomHeel",
  "bottomToe",
  "bottomShoulder",
  "bottomElbow",
  "bottomHand",
  "topShoulder",
  "topElbow",
  "topHand",
  "pelvisCenter",
  "chestCenter",
  "headCenter",
  "nose",
];
const fixedOpenBook: readonly (keyof LateralWorld)[] = [
  "topHip",
  "topKnee",
  "topAnkle",
  "topHeel",
  "topToe",
  "bottomHip",
  "bottomKnee",
  "bottomAnkle",
  "bottomHeel",
  "bottomToe",
  "bottomShoulder",
  "bottomElbow",
  "bottomHand",
  "pelvisCenter",
  "headCenter",
];

describe("original lateral geometry: mechanical properties, not motion approval", () => {
  for (const id of LATERAL_DRAFT_IDS) {
    it.each(["left", "right"] as const)(
      `${id}: fixed lengths, supports and camera at 1001 samples, active %s`,
      (activeSide) => {
        const start = getLateralDraftPose(id, 0, { activeSide });
        const fixedKeys =
          id === "side-lying-straight-leg-lift" ? fixedLift : fixedOpenBook;
        const originalLengths = segmentLengths(start);
        const supportSide: AnatomicalSide =
          activeSide === "left" ? "right" : "left";
        let maxLengthError = 0;
        let maxFixedError = 0;
        let maxContactError = 0;
        let maxMirrorError = 0;
        let maxWorldMirrorError = 0;
        let minWorldZ = Infinity;
        let allFinite = true;
        let allSidesCorrect = true;
        let allTargetsCorrect = true;
        let allStatusUnreviewed = true;
        for (let sample = 0; sample <= 1000; sample++) {
          const pose = getLateralDraftPose(id, sample / 1000, { activeSide });
          const mirrored = getLateralDraftPose(id, sample / 1000, {
            activeSide,
            mirrored: true,
          });
          const lengths = segmentLengths(pose);
          for (let index = 0; index < lengths.length; index++) {
            maxLengthError = Math.max(
              maxLengthError,
              Math.abs(lengths[index] - originalLengths[index]),
            );
          }
          for (const key of fixedKeys)
            maxFixedError = Math.max(
              maxFixedError,
              distance(start.world[key], pose.world[key]),
            );
          for (const key of Object.keys(pose.world) as (keyof LateralWorld)[]) {
            const world = pose.world[key];
            minWorldZ = Math.min(minWorldZ, world[2]);
            allFinite &&=
              world.every(Number.isFinite) &&
              pose.screen[key].every(Number.isFinite);
            maxWorldMirrorError = Math.max(
              maxWorldMirrorError,
              distance(world, mirrored.world[key]),
            );
            maxMirrorError = Math.max(
              maxMirrorError,
              Math.abs(mirrored.screen[key][0] - (640 - pose.screen[key][0])),
              Math.abs(mirrored.screen[key][1] - pose.screen[key][1]),
            );
          }
          for (const c of pose.contacts) {
            const bodySurface: Point3 = [
              c.bodyCenter[0] + c.surfaceOffset[0],
              c.bodyCenter[1] + c.surfaceOffset[1],
              c.bodyCenter[2] + c.surfaceOffset[2],
            ];
            maxContactError = Math.max(
              maxContactError,
              distance(bodySurface, c.point),
            );
            if (c.state === "fixed")
              maxContactError = Math.max(
                maxContactError,
                distance(c.point, c.targetPoint),
              );
            if (c.target === "mat")
              allTargetsCorrect &&=
                c.targetPoint[2] === 0 && c.state === "fixed";
            if (c.target === "head-pad")
              allTargetsCorrect &&= c.targetPoint[2] === 12;
          }
          allSidesCorrect &&=
            pose.activeSide === activeSide &&
            pose.supportSide === supportSide &&
            pose.legs[activeSide].placement === "top" &&
            pose.arms[activeSide].placement === "top" &&
            pose.legs[supportSide].placement === "bottom" &&
            mirrored.activeSide === activeSide;
          allStatusUnreviewed &&=
            pose.review.professionalReviewCount === 0 &&
            pose.safetyAssessment === "unassessed" &&
            pose.exactAssetReady === false &&
            pose.autoRecommendationEligible === false;
        }
        expect(maxLengthError).toBeLessThan(1e-9);
        expect(maxFixedError).toBe(0);
        expect(maxContactError).toBeLessThan(1e-9);
        expect(maxMirrorError).toBeLessThan(1e-9);
        expect(maxWorldMirrorError).toBe(0);
        expect(minWorldZ).toBeGreaterThanOrEqual(0);
        expect(
          allFinite &&
            allSidesCorrect &&
            allTargetsCorrect &&
            allStatusUnreviewed,
        ).toBe(true);
        expect(getLateralDraftPose(id, 1, { activeSide }).world).toEqual(
          start.world,
        );
        expect(getLateralDraftPose(id, 1, { activeSide }).contacts).toEqual(
          start.contacts,
        );
        expect(getLateralDraftPose(id, 1, { activeSide }).torsoRings).toEqual(
          start.torsoRings,
        );
      },
    );
  }

  it("raises a genuinely straight leg while its hip stays fixed; does not rotate a clam knee", () => {
    const start = getLateralDraftPose("side-lying-straight-leg-lift", 0);
    const apex = getLateralDraftPose("side-lying-straight-leg-lift", 0.5);
    const leg = apex.legs.right;
    expect(
      distance(leg.hip, leg.knee) + distance(leg.knee, leg.ankle),
    ).toBeCloseTo(distance(leg.hip, leg.ankle), 10);
    expect(apex.world.topHip).toEqual(start.world.topHip);
    expect(apex.world.topAnkle[2]).toBeGreaterThan(
      start.world.topAnkle[2] + 80,
    );
    expect(apex.world.topHeel).not.toEqual(start.world.topHeel);
    expect(apex.angles.thoraxOpeningRad).toBe(0);
    expect(
      apex.contacts.some(
        (c) => c.side === apex.activeSide && c.id.includes("leg"),
      ),
    ).toBe(false);
  });

  it("opens the upper shoulder and torso, turns the head, releases joined hands and keeps bent knees together", () => {
    const start = getLateralDraftPose("side-lying-open-book", 0);
    const apex = getLateralDraftPose("side-lying-open-book", 0.5);
    expect(apex.world.topShoulder).not.toEqual(start.world.topShoulder);
    expect(apex.world.chestCenter).not.toEqual(start.world.chestCenter);
    expect(apex.torsoRings).not.toEqual(start.torsoRings);
    expect(apex.world.nose).not.toEqual(start.world.nose);
    expect(apex.world.topHand[1]).toBeLessThan(0);
    expect(apex.world.topHand[2]).toBeGreaterThan(0);
    expect(start.contacts.find((c) => c.id === "hands-together")?.state).toBe(
      "fixed",
    );
    expect(apex.contacts.find((c) => c.id === "hands-together")?.state).toBe(
      "released",
    );
    expect(apex.contacts.find((c) => c.id === "knees-together")?.state).toBe(
      "fixed",
    );
    expect(apex.contacts.some((c) => c.id === "top-hand-mat")).toBe(false);
    expect(apex.angles.upperLegLiftRad).toBe(0);
  });

  it("keeps anatomical labels independent of both mirrored projection and which side lies uppermost", () => {
    for (const id of LATERAL_DRAFT_IDS) {
      const right = getLateralDraftPose(id, 0.5, { activeSide: "right" });
      const left = getLateralDraftPose(id, 0.5, {
        activeSide: "left",
        mirrored: true,
      });
      expect(left.world).toEqual(right.world);
      expect(left.legs.left.anatomicalSide).toBe("left");
      expect(left.legs.right.anatomicalSide).toBe("right");
      expect(left.arms.left.placement).toBe("top");
      expect(left.arms.right.placement).toBe("bottom");
      expect(left.contacts.find((c) => c.id === "lower-knee-mat")?.side).toBe(
        "right",
      );
      expect(projectLateralPoint([100, 20, 30], true)).toEqual([537.6, 245]);
    }
  });

  it("publishes contiguous five-phase closed cycles and explicit unreviewed provenance", () => {
    for (const id of LATERAL_DRAFT_IDS) {
      const phases = LATERAL_PHASES[id];
      expect(phases.map((p) => p.id)).toEqual([
        "setup",
        "move",
        "turn",
        "return",
        "finish",
      ]);
      expect(phases[0].start).toBe(0);
      expect(phases.at(-1)?.end).toBe(1);
      phases.forEach((phase, index) => {
        if (index > 0) expect(phase.start).toBe(phases[index - 1].end);
        expect(getLateralDraftPose(id, phase.sample).phase.id).toBe(phase.id);
      });
      expect(LATERAL_PROVENANCE.drafts[id].mismatched.length).toBeGreaterThan(
        0,
      );
      expect(
        LATERAL_PROVENANCE.drafts[id].sources.every(
          (source) => new URL(source.url).protocol === "https:",
        ),
      ).toBe(true);
    }
    expect(LATERAL_PROVENANCE.professionalReviewCount).toBe(0);
    expect(LATERAL_PROVENANCE.exactAssetCount).toBe(0);
    expect(LATERAL_PROVENANCE.autoRecommendationEligible).toBe(false);
    expect(LATERAL_PROVENANCE.sourceMediaReused).toBe(false);
    expect(LATERAL_PROVENANCE.sourceMediaTraced).toBe(false);
    expect(LATERAL_PROVENANCE.motionCaptureUsed).toBe(false);
  });

  it("clamps finite progress and rejects unsupported IDs, sides, mirror values and nonfinite progress", () => {
    expect(getLateralDraftPose("side-lying-open-book", -1).progress).toBe(0);
    expect(getLateralDraftPose("side-lying-open-book", 2).progress).toBe(1);
    for (const p of [NaN, Infinity, -Infinity])
      expect(() => getLateralDraftPose("side-lying-open-book", p)).toThrow(
        TypeError,
      );
    expect(() =>
      getLateralDraftPose("side-lying-clam" as LateralDraftId, 0),
    ).toThrow(TypeError);
    expect(() =>
      getLateralDraftPose("side-lying-open-book", 0, {
        activeSide: "upper" as AnatomicalSide,
      }),
    ).toThrow(TypeError);
    expect(() =>
      getLateralDraftPose("side-lying-open-book", 0, {
        mirrored: "true" as unknown as boolean,
      }),
    ).toThrow(TypeError);
  });

  it("renders the actual frame with normalized metadata, unique accessible labels and visible declared supports", () => {
    const figures = LATERAL_DRAFT_IDS.flatMap((draftId) =>
      [false, true].map((mirrored) =>
        createElement(LateralDraftFigure, {
          key: `${draftId}-${mirrored}`,
          draftId,
          progress: 0.5,
          activeSide: "left",
          mirrored,
        }),
      ),
    );
    const markup = renderToStaticMarkup(createElement("div", null, figures));
    const titleIds = [...markup.matchAll(/<title id="([^"]+)"/g)].map(
      (match) => match[1],
    );
    const descriptionIds = [...markup.matchAll(/<desc id="([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(new Set(titleIds).size).toBe(4);
    expect(new Set(descriptionIds).size).toBe(4);
    for (const id of titleIds)
      expect(markup).toContain(`aria-labelledby="${id}"`);
    for (const id of descriptionIds)
      expect(markup).toContain(`aria-describedby="${id}"`);
    expect([...markup.matchAll(/data-active-side="left"/g)]).toHaveLength(4);
    expect([...markup.matchAll(/data-support="head-pad"/g)]).toHaveLength(4);
    expect(markup).toContain("제작 선택");
    expect(markup).toContain(
      'data-contact="hands-together" data-contact-state="released"',
    );
    expect(markup).not.toContain("<image");
    const start = renderToStaticMarkup(
      createElement(LateralDraftFigure, {
        draftId: "side-lying-open-book",
        progress: -1,
      }),
    );
    const finish = renderToStaticMarkup(
      createElement(LateralDraftFigure, {
        draftId: "side-lying-open-book",
        progress: 2,
      }),
    );
    expect(start).toContain('data-progress="0"');
    expect(finish).toContain('data-progress="1"');
    expect(start).toContain(
      'data-contact="hands-together" data-contact-state="fixed"',
    );
  });
});
