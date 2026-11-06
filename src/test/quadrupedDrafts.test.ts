import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QuadrupedDraftFigure } from "../components/QuadrupedDraftFigure";
import {
  getQuadrupedDraftPose,
  projectQuadrupedPoint,
  QUADRUPED_CANONICAL_COMPARISON_ID,
  QUADRUPED_DRAFT_IDS,
  QUADRUPED_DRAWING_PARAMETERS,
  QUADRUPED_PHASES,
  QUADRUPED_PROVENANCE,
} from "../models/quadrupedDrafts";
import type {
  QuadrupedDraftId,
  QuadrupedDraftPose,
  QuadrupedSide,
  QuadrupedWorld,
} from "../models/quadrupedDrafts";
import type { Point3 } from "../models/types";

const distance = (a: Point3, b: Point3) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const sides: readonly QuadrupedSide[] = ["left", "right"];
function lengths(pose: QuadrupedDraftPose): number[] {
  return sides.flatMap((side) => {
    const l = pose.limbs[side];
    return [
      distance(l.shoulder, l.elbow),
      distance(l.elbow, l.hand),
      distance(l.hip, l.knee),
      distance(l.knee, l.ankle),
      distance(l.ankle, l.heel),
      distance(l.heel, l.toe),
    ];
  });
}

describe("quadruped proposals: mathematical properties, not safety or motion approval", () => {
  for (const draftId of QUADRUPED_DRAFT_IDS) {
    it.each(sides)(
      `${draftId}: 1001 samples preserve bones, three primary supports and camera anatomy for %s`,
      (activeSide) => {
        const start = getQuadrupedDraftPose(draftId, 0, { activeSide });
        const baseline = lengths(start);
        const moving = new Set(
          draftId === "quadruped-arm-slide"
            ? [`${activeSide}Elbow`, `${activeSide}Hand`]
            : [
                `${activeSide}Knee`,
                `${activeSide}Ankle`,
                `${activeSide}Heel`,
                `${activeSide}Toe`,
              ],
        );
        let maxLengthError = 0;
        let maxFixedError = 0;
        let maxMirrorError = 0;
        let maxContactError = 0;
        let maxClearance = 0;
        let minSurfaceHeight = Infinity;
        let minWorldHeight = Infinity;
        let allFinite = true;
        let allStatesCorrect = true;
        let allSidesCorrect = true;
        for (let sample = 0; sample <= 1000; sample++) {
          const pose = getQuadrupedDraftPose(draftId, sample / 1000, {
            activeSide,
          });
          const mirror = getQuadrupedDraftPose(draftId, sample / 1000, {
            activeSide,
            mirrored: true,
          });
          lengths(pose).forEach((value, index) => {
            maxLengthError = Math.max(
              maxLengthError,
              Math.abs(value - baseline[index]),
            );
          });
          for (const key of Object.keys(
            pose.world,
          ) as (keyof QuadrupedWorld)[]) {
            const point = pose.world[key];
            minWorldHeight = Math.min(minWorldHeight, point[2]);
            allFinite &&=
              point.every(Number.isFinite) &&
              pose.screen[key].every(Number.isFinite);
            if (!moving.has(key))
              maxFixedError = Math.max(
                maxFixedError,
                distance(point, start.world[key]),
              );
            maxMirrorError = Math.max(
              maxMirrorError,
              distance(point, mirror.world[key]),
              Math.abs(mirror.screen[key][0] - (640 - pose.screen[key][0])),
              Math.abs(mirror.screen[key][1] - pose.screen[key][1]),
            );
          }
          for (const c of pose.contacts) {
            const actualSurface: Point3 = [
              c.bodyCenter[0] + c.surfaceOffset[0],
              c.bodyCenter[1] + c.surfaceOffset[1],
              c.bodyCenter[2] + c.surfaceOffset[2],
            ];
            maxContactError = Math.max(
              maxContactError,
              distance(c.point, actualSurface),
            );
            minSurfaceHeight = Math.min(minSurfaceHeight, c.point[2]);
            if (c.state !== "released")
              maxContactError = Math.max(
                maxContactError,
                distance(c.point, c.targetPoint),
              );
            if (c.state === "fixed") {
              const original = start.contacts.find((item) => item.id === c.id)!;
              maxFixedError = Math.max(
                maxFixedError,
                distance(c.point, original.point),
              );
            }
            maxClearance = Math.max(
              maxClearance,
              c.state === "released" ? c.point[2] : 0,
            );
            allStatesCorrect &&=
              c.targetPoint[2] === 0 &&
              c.evidence === "authored-contact-choice";
          }
          const primary = pose.contacts.filter(
            (c) => c.role === "primary-support",
          );
          allStatesCorrect &&=
            primary.length === 4 &&
            primary.filter((c) => c.state === "fixed").length ===
              (pose.amount > 0 ? 3 : 4);
          const activePatch = pose.contacts.find(
            (c) =>
              c.anatomicalSide === activeSide &&
              c.patch === (pose.activeLimb === "arm" ? "palm" : "toe-tip"),
          )!;
          const activeKnee = pose.contacts.find(
            (c) => c.anatomicalSide === activeSide && c.patch === "knee",
          )!;
          allStatesCorrect &&=
            activePatch.state === (pose.amount > 0 ? "sliding" : "fixed") &&
            activeKnee.state ===
              (pose.activeLimb === "leg" && pose.amount > 0
                ? "released"
                : "fixed");
          allSidesCorrect &&=
            pose.activeSide === activeSide &&
            mirror.activeSide === activeSide &&
            pose.limbs.left.anatomicalSide === "left" &&
            pose.limbs.right.anatomicalSide === "right" &&
            pose.limbs.left.shoulder[1] < 0 &&
            pose.limbs.right.shoulder[1] > 0;
          expect(pose.torso).toEqual(start.torso);
        }
        expect(maxLengthError).toBeLessThan(1e-9);
        expect(maxFixedError).toBe(0);
        expect(maxMirrorError).toBeLessThan(1e-9);
        expect(maxContactError).toBeLessThan(1e-9);
        expect(minSurfaceHeight).toBeGreaterThanOrEqual(-1e-9);
        expect(minWorldHeight).toBeGreaterThanOrEqual(0);
        expect(allFinite && allStatesCorrect && allSidesCorrect).toBe(true);
        if (draftId === "quadruped-arm-slide") expect(maxClearance).toBe(0);
        else expect(maxClearance).toBeGreaterThan(20);
        const finish = getQuadrupedDraftPose(draftId, 1, { activeSide });
        expect(finish.world).toEqual(start.world);
        expect(finish.contacts).toEqual(start.contacts);
        expect(finish.torso).toEqual(start.torso);
      },
    );
  }

  it("uses actual elbow coupling for a short forward hand slide and no leg motion", () => {
    const start = getQuadrupedDraftPose("quadruped-arm-slide", 0);
    const apex = getQuadrupedDraftPose("quadruped-arm-slide", 0.5);
    expect(start.world.rightHand[0] - apex.world.rightHand[0]).toBe(
      QUADRUPED_DRAWING_PARAMETERS.armSlideDistance,
    );
    expect(apex.world.rightElbow).not.toEqual(start.world.rightElbow);
    expect(apex.world.rightShoulder).toEqual(start.world.rightShoulder);
    expect(apex.world.rightKnee).toEqual(start.world.rightKnee);
    expect(apex.world.rightHand[2]).toBe(8);
    const l = apex.limbs.right;
    expect(distance(l.shoulder, l.elbow)).toBeCloseTo(75, 10);
    expect(distance(l.elbow, l.hand)).toBeCloseTo(73, 10);
  });

  it("keeps a toe patch on the mat while actually lifting the sliding side's knee support", () => {
    const start = getQuadrupedDraftPose("quadruped-leg-slide", 0, {
      activeSide: "left",
    });
    const apex = getQuadrupedDraftPose("quadruped-leg-slide", 0.5, {
      activeSide: "left",
    });
    const toe = apex.contacts.find((c) => c.id === "left-toe-tip")!;
    const knee = apex.contacts.find((c) => c.id === "left-knee")!;
    expect(apex.world.leftToe[0] - start.world.leftToe[0]).toBe(75);
    expect(toe.point[2]).toBe(0);
    expect(toe.state).toBe("sliding");
    expect(knee.state).toBe("released");
    expect(knee.point[2]).toBeGreaterThan(20);
    expect(apex.world.leftKnee[0]).toBeGreaterThan(start.world.leftKnee[0]);
    expect(apex.world.leftHand).toEqual(start.world.leftHand);
    expect(apex.world.rightKnee).toEqual(start.world.rightKnee);
  });

  it("changes actual anatomical limb geometry on side selection while mirroring changes only projection", () => {
    for (const draftId of QUADRUPED_DRAFT_IDS) {
      const left = getQuadrupedDraftPose(draftId, 0.5, { activeSide: "left" });
      const right = getQuadrupedDraftPose(draftId, 0.5, {
        activeSide: "right",
      });
      const rest = getQuadrupedDraftPose(draftId, 0);
      const key = draftId === "quadruped-arm-slide" ? "leftHand" : "leftToe";
      expect(left.world[key]).not.toEqual(rest.world[key]);
      expect(right.world[key]).toEqual(rest.world[key]);
      expect(
        getQuadrupedDraftPose(draftId, 0.5, {
          activeSide: "left",
          mirrored: true,
        }).world,
      ).toEqual(left.world);
    }
    expect(projectQuadrupedPoint([100, 20, 40])).toEqual([103.6, 268.4]);
    expect(projectQuadrupedPoint([100, 20, 40], true)).toEqual([536.4, 268.4]);
  });

  it("exposes two unapproved variants of one canonical comparison and a fact/choice boundary", () => {
    expect(QUADRUPED_DRAFT_IDS).toHaveLength(2);
    for (const draftId of QUADRUPED_DRAFT_IDS) {
      const pose = getQuadrupedDraftPose(draftId, 0.5);
      expect(pose.canonicalComparisonId).toBe(
        QUADRUPED_CANONICAL_COMPARISON_ID,
      );
      expect(pose.proposalStatus).toBe("variant-proposal");
      expect(pose.authoringStatusAtResearchTime).toBe("isolated-staged-draft");
      expect(pose.review.professionalReviewCount).toBe(0);
      expect(pose.exactAssetCount).toBe(0);
      expect(pose.exactAssetReady).toBe(false);
      expect(pose.autoRecommendationEligible).toBe(false);
      expect(pose.safetyAssessment).toBe("unassessed");
    }
    expect(QUADRUPED_PROVENANCE.sources[0].sourceId).toBe("BH-SLIDE");
    expect(QUADRUPED_PROVENANCE.authoringChoices.length).toBeGreaterThan(4);
    expect(QUADRUPED_PROVENANCE.externalMediaCopied).toBe(false);
    expect(QUADRUPED_PROVENANCE.externalMediaTraced).toBe(false);
    expect(QUADRUPED_PROVENANCE.motionCaptureUsed).toBe(false);
  });

  it("has contiguous five-phase closed cycles and continuous motion at every phase boundary", () => {
    for (const draftId of QUADRUPED_DRAFT_IDS) {
      const phases = QUADRUPED_PHASES[draftId];
      expect(phases.map((phase) => phase.id)).toEqual([
        "setup",
        "move",
        "turn",
        "return",
        "finish",
      ]);
      expect(phases[0].start).toBe(0);
      expect(phases.at(-1)?.end).toBe(1);
      phases.forEach((phase, index) => {
        expect(getQuadrupedDraftPose(draftId, phase.sample).phase.id).toBe(
          phase.id,
        );
        if (index > 0) {
          expect(phase.start).toBe(phases[index - 1].end);
          const before = getQuadrupedDraftPose(draftId, phase.start - 1e-8);
          const after = getQuadrupedDraftPose(draftId, phase.start + 1e-8);
          for (const key of Object.keys(
            before.world,
          ) as (keyof QuadrupedWorld)[])
            expect(distance(before.world[key], after.world[key])).toBeLessThan(
              1e-8,
            );
        }
      });
    }
  });

  it("rejects invalid inputs and clamps finite progress without any playback clock", () => {
    for (const progress of [NaN, Infinity, -Infinity])
      expect(() =>
        getQuadrupedDraftPose("quadruped-arm-slide", progress),
      ).toThrow(TypeError);
    expect(() =>
      getQuadrupedDraftPose(
        "original-mat-quadruped-reach" as QuadrupedDraftId,
        0,
      ),
    ).toThrow(TypeError);
    expect(() =>
      getQuadrupedDraftPose("quadruped-arm-slide", 0, {
        activeSide: "upper" as QuadrupedSide,
      }),
    ).toThrow(TypeError);
    expect(() =>
      getQuadrupedDraftPose("quadruped-arm-slide", 0, {
        mirrored: "false" as unknown as boolean,
      }),
    ).toThrow(TypeError);
    expect(getQuadrupedDraftPose("quadruped-arm-slide", -4).progress).toBe(0);
    expect(getQuadrupedDraftPose("quadruped-leg-slide", 5).progress).toBe(1);
    expect(getQuadrupedDraftPose("quadruped-leg-slide", 0.3)).toEqual(
      getQuadrupedDraftPose("quadruped-leg-slide", 0.3),
    );
  });

  it("renders unique ARIA labels, normalized frame metadata and genuine per-variant contact states", () => {
    const views = QUADRUPED_DRAFT_IDS.flatMap((draftId) =>
      sides.map((activeSide) =>
        createElement(QuadrupedDraftFigure, {
          key: `${draftId}-${activeSide}`,
          draftId,
          progress: 0.5,
          activeSide,
          mirrored: activeSide === "left",
        }),
      ),
    );
    const markup = renderToStaticMarkup(createElement("div", null, views));
    const titles = [...markup.matchAll(/<title id="([^"]+)"/g)].map(
      (match) => match[1],
    );
    const descriptions = [...markup.matchAll(/<desc id="([^"]+)"/g)].map(
      (match) => match[1],
    );
    expect(new Set(titles).size).toBe(4);
    expect(new Set(descriptions).size).toBe(4);
    for (const title of titles)
      expect(markup).toContain(`aria-labelledby="${title}"`);
    for (const description of descriptions)
      expect(markup).toContain(`aria-describedby="${description}"`);
    expect([...markup.matchAll(/role="img"/g)]).toHaveLength(4);
    expect([...markup.matchAll(/data-progress="0.5"/g)]).toHaveLength(4);
    expect(markup).toContain(
      'data-contact="left-palm" data-contact-state="sliding"',
    );
    expect(markup).toContain(
      'data-contact="right-toe-tip" data-contact-state="sliding"',
    );
    expect(markup).toContain(
      'data-contact="left-knee" data-contact-state="released"',
    );
    expect(markup).toContain('data-view-mirrored="true"');
    expect(markup).toContain("같은 동작의 변형 제안");
    expect(markup).toContain("제작 선택");
    expect(markup).not.toContain("<image");
    expect(markup).not.toContain("<video");
    const start = renderToStaticMarkup(
      createElement(QuadrupedDraftFigure, {
        draftId: "quadruped-leg-slide",
        progress: -1,
      }),
    );
    const finish = renderToStaticMarkup(
      createElement(QuadrupedDraftFigure, {
        draftId: "quadruped-leg-slide",
        progress: 2,
      }),
    );
    expect(start).toContain('data-progress="0"');
    expect(finish).toContain('data-progress="1"');
    expect(start).toContain(
      'data-contact="right-knee" data-contact-state="fixed"',
    );
  });
});
