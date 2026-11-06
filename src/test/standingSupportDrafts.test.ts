import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StandingSupportDraftFigure } from "../components/StandingSupportDraftFigure";
import {
  getStandingSupportDraftPose,
  projectStandingSupportPoint,
  STANDING_SUPPORT_DRAFT_IDS,
  STANDING_SUPPORT_DRAWING_PARAMETERS,
  STANDING_SUPPORT_PHASES,
  STANDING_SUPPORT_PROVENANCE,
} from "../models/standingSupportDrafts";
import type {
  StandingSupportDraftId,
  StandingSupportDraftPose,
  StandingSupportSide,
  StandingSupportWorld,
} from "../models/standingSupportDrafts";
import type { Point3 } from "../models/types";

const distance = (a: Point3, b: Point3) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const sides: readonly StandingSupportSide[] = ["left", "right"];
function lengths(pose: StandingSupportDraftPose): number[] {
  return sides.flatMap((side) => {
    const l = pose.legs[side];
    const a = pose.arms[side];
    return [
      distance(l.hip, l.knee),
      distance(l.knee, l.ankle),
      distance(l.ankle, l.heel),
      distance(l.heel, l.toe),
      distance(a.shoulder, a.elbow),
      distance(a.elbow, a.hand),
    ];
  });
}
describe("original standing support proposals: mechanics do not certify safety", () => {
  for (const draftId of STANDING_SUPPORT_DRAFT_IDS) {
    it.each(sides)(
      `${draftId}: 1001 samples keep bones, opposite side, hand/rung and foot/floor contacts for %s`,
      (activeSide) => {
        const start = getStandingSupportDraftPose(draftId, 0, { activeSide });
        const baseline = lengths(start);
        const moving = new Set([
          `${activeSide}Knee`,
          `${activeSide}Ankle`,
          `${activeSide}Heel`,
          `${activeSide}Toe`,
        ]);
        let maxLengthError = 0;
        let maxFixedError = 0;
        let maxMirrorError = 0;
        let maxContactError = 0;
        let minHeight = Infinity;
        let minBodyToBarrelGap = Infinity;
        let allFinite = true;
        let allStatesCorrect = true;
        let allSidesCorrect = true;
        for (let sample = 0; sample <= 1000; sample++) {
          const pose = getStandingSupportDraftPose(draftId, sample / 1000, {
            activeSide,
          });
          const mirror = getStandingSupportDraftPose(draftId, sample / 1000, {
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
          ) as (keyof StandingSupportWorld)[]) {
            const point = pose.world[key];
            minHeight = Math.min(minHeight, point[2]);
            minBodyToBarrelGap = Math.min(minBodyToBarrelGap, point[0] - 200);
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
          const rung = pose.apparatus.rungs.find((r) => r.selected)!;
          for (const c of pose.contacts) {
            const surface: Point3 = [
              c.bodyCenter[0] + c.surfaceOffset[0],
              c.bodyCenter[1] + c.surfaceOffset[1],
              c.bodyCenter[2] + c.surfaceOffset[2],
            ];
            maxContactError = Math.max(
              maxContactError,
              distance(c.point, surface),
              distance(c.point, c.targetPoint),
            );
            if (c.state === "fixed")
              maxFixedError = Math.max(
                maxFixedError,
                distance(
                  c.point,
                  start.contacts.find((original) => original.id === c.id)!
                    .point,
                ),
              );
            if (c.target === "floor") allStatesCorrect &&= c.point[2] === 0;
            if (c.target === "ladder-rung")
              allStatesCorrect &&=
                c.point[0] === rung.start[0] &&
                c.point[2] === rung.centerHeight + rung.radius &&
                c.point[1] >= rung.start[1] &&
                c.point[1] <= rung.end[1] &&
                c.state === "fixed";
            allStatesCorrect &&= c.evidence === "authored-contact-choice";
          }
          allStatesCorrect &&=
            pose.contacts.filter((c) => c.state === "sliding").length ===
              (pose.amount > 0 ? 2 : 0) &&
            pose.contacts
              .filter((c) => c.role === "standing-foot-support")
              .every((c) => c.state === "fixed") &&
            pose.contacts.filter((c) => c.role === "hand-support").length === 2;
          allSidesCorrect &&=
            pose.activeSide === activeSide &&
            mirror.activeSide === activeSide &&
            pose.legs.left.anatomicalSide === "left" &&
            pose.arms.right.anatomicalSide === "right" &&
            pose.legs.left.hip[1] < 0 &&
            pose.legs.right.hip[1] > 0;
        }
        expect(maxLengthError).toBeLessThan(1e-9);
        expect(maxFixedError).toBe(0);
        expect(maxMirrorError).toBeLessThan(1e-9);
        expect(maxContactError).toBeLessThan(1e-9);
        expect(minHeight).toBeGreaterThanOrEqual(0);
        expect(minBodyToBarrelGap).toBeGreaterThan(40);
        expect(allFinite && allStatesCorrect && allSidesCorrect).toBe(true);
        const finish = getStandingSupportDraftPose(draftId, 1, { activeSide });
        expect(finish.world).toEqual(start.world);
        expect(finish.contacts).toEqual(start.contacts);
        expect(finish.apparatus).toEqual(start.apparatus);
        expect(finish.torso).toEqual(start.torso);
        expect(
          getStandingSupportDraftPose(draftId, 0.5, { activeSide }).torso,
        ).toEqual(start.torso);
      },
    );
  }
  it.each(sides)(
    "has genuinely orthogonal rear and anatomical lateral foot paths for %s",
    (activeSide) => {
      const rearStart = getStandingSupportDraftPose(
        "ladder-supported-hip-extension-slide",
        0,
        { activeSide },
      );
      const rear = getStandingSupportDraftPose(
        "ladder-supported-hip-extension-slide",
        0.5,
        { activeSide },
      );
      const side = getStandingSupportDraftPose(
        "ladder-supported-side-leg-slide",
        0.5,
        { activeSide },
      );
      const r = rear.legs[activeSide].toe;
      const s = side.legs[activeSide].toe;
      const start = rearStart.legs[activeSide].toe;
      const backward: Point3 = [
        r[0] - start[0],
        r[1] - start[1],
        r[2] - start[2],
      ];
      const lateral: Point3 = [
        s[0] - start[0],
        s[1] - start[1],
        s[2] - start[2],
      ];
      expect(backward).toEqual([32, 0, 0]);
      expect(lateral).toEqual([0, activeSide === "left" ? -32 : 32, 0]);
      expect(
        backward.reduce((sum, value, index) => sum + value * lateral[index], 0),
      ).toBe(0);
      expect(rear.world).not.toEqual(side.world);
      expect(rear.legs[activeSide].knee).not.toEqual(
        rearStart.legs[activeSide].knee,
      );
      expect(side.legs[activeSide].knee).not.toEqual(
        rearStart.legs[activeSide].knee,
      );
    },
  );
  it("selects the actual left/right moving limb independently from camera mirror", () => {
    for (const id of STANDING_SUPPORT_DRAFT_IDS) {
      const rest = getStandingSupportDraftPose(id, 0);
      const left = getStandingSupportDraftPose(id, 0.5, { activeSide: "left" });
      const right = getStandingSupportDraftPose(id, 0.5, {
        activeSide: "right",
      });
      expect(left.world.leftToe).not.toEqual(rest.world.leftToe);
      expect(right.world.leftToe).toEqual(rest.world.leftToe);
      expect(
        getStandingSupportDraftPose(id, 0.5, {
          activeSide: "left",
          mirrored: true,
        }).world,
      ).toEqual(left.world);
    }
    expect(projectStandingSupportPoint([100, 20, 40])).toEqual([161.4, 287.2]);
    expect(projectStandingSupportPoint([100, 20, 40], true)).toEqual([
      478.6, 287.2,
    ]);
  });
  it("draws a complete fixed Ladder Barrel structure separately from its selected floor-standing exercise", () => {
    const pose = getStandingSupportDraftPose(
      "ladder-supported-side-leg-slide",
      0.5,
    );
    const apparatus = pose.apparatus;
    expect(apparatus.kind).toBe("original-ladder-barrel-schematic");
    expect(apparatus.uprights).toHaveLength(2);
    expect(apparatus.rungs.length).toBeGreaterThan(3);
    expect(apparatus.rails).toHaveLength(2);
    expect(apparatus.barrelFrontArc.length).toBeGreaterThan(12);
    expect(apparatus.baseFloorPoints.every((p) => p[2] === 0)).toBe(true);
    expect(apparatus.barrelBodyContact).toBe(false);
    expect(apparatus.floorStanding).toBe(true);
    expect(apparatus.manufacturerDimensions).toBe(false);
    expect(apparatus.supportStrengthAssessed).toBe(false);
    const maxFrameX = Math.max(...apparatus.baseCorners.map((p) => p[0]));
    expect(
      pose.contacts
        .filter((c) => c.target === "floor")
        .every((c) => c.point[0] > maxFrameX),
    ).toBe(true);
    expect(pose.contacts.some((c) => String(c.target).includes("barrel"))).toBe(
      false,
    );
  });
  it("keeps exact-source matching false and separates exercise, structure and authored adaptation", () => {
    for (const id of STANDING_SUPPORT_DRAFT_IDS) {
      const pose = getStandingSupportDraftPose(id, 0.5);
      expect(pose.exactSourceVariantMatched).toBe(false);
      expect(pose.proposalStatus).toBe("variant-proposal");
      expect(pose.review.professionalReviewCount).toBe(0);
      expect(pose.exactAssetReady).toBe(false);
      expect(pose.exactAssetCount).toBe(0);
      expect(pose.autoRecommendationEligible).toBe(false);
      expect(pose.safetyAssessment).toBe("unassessed");
    }
    expect(STANDING_SUPPORT_PROVENANCE.exactSourceVariantMatched).toBe(false);
    expect(STANDING_SUPPORT_PROVENANCE.authoringStatusAtResearchTime).toBe(
      "isolated-staged-draft",
    );
    expect(STANDING_SUPPORT_PROVENANCE.sourceFactsLedger).toBe(
      "src/data/motionStandingSourceLedger.json",
    );
    expect(STANDING_SUPPORT_PROVENANCE.externalMediaCopied).toBe(false);
    expect(STANDING_SUPPORT_PROVENANCE.externalMediaTraced).toBe(false);
    expect(STANDING_SUPPORT_PROVENANCE.motionCaptureUsed).toBe(false);
    expect(STANDING_SUPPORT_DRAWING_PARAMETERS.slideDistance).toBe(32);
  });
  it("provides contiguous five phases and continuous points at every boundary", () => {
    for (const id of STANDING_SUPPORT_DRAFT_IDS) {
      const phases = STANDING_SUPPORT_PHASES[id];
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
        expect(getStandingSupportDraftPose(id, phase.sample).phase.id).toBe(
          phase.id,
        );
        if (index > 0) {
          expect(phase.start).toBe(phases[index - 1].end);
          const before = getStandingSupportDraftPose(id, phase.start - 1e-8);
          const after = getStandingSupportDraftPose(id, phase.start + 1e-8);
          for (const key of Object.keys(
            before.world,
          ) as (keyof StandingSupportWorld)[])
            expect(distance(before.world[key], after.world[key])).toBeLessThan(
              1e-8,
            );
        }
      });
    }
  });
  it("guards finite input, unknown IDs, sides and mirror values, and clamps finite progress", () => {
    for (const p of [NaN, Infinity, -Infinity])
      expect(() =>
        getStandingSupportDraftPose("ladder-supported-hip-extension-slide", p),
      ).toThrow(TypeError);
    expect(() =>
      getStandingSupportDraftPose(
        "original-barrel-standing-side-reach" as StandingSupportDraftId,
        0,
      ),
    ).toThrow(TypeError);
    expect(() =>
      getStandingSupportDraftPose("ladder-supported-side-leg-slide", 0, {
        activeSide: "top" as StandingSupportSide,
      }),
    ).toThrow(TypeError);
    expect(() =>
      getStandingSupportDraftPose("ladder-supported-side-leg-slide", 0, {
        mirrored: 1 as unknown as boolean,
      }),
    ).toThrow(TypeError);
    expect(
      getStandingSupportDraftPose("ladder-supported-side-leg-slide", -1)
        .progress,
    ).toBe(0);
    expect(
      getStandingSupportDraftPose("ladder-supported-side-leg-slide", 2)
        .progress,
    ).toBe(1);
    expect(
      getStandingSupportDraftPose("ladder-supported-side-leg-slide", 0.3),
    ).toEqual(
      getStandingSupportDraftPose("ladder-supported-side-leg-slide", 0.3),
    );
  });
  it("SSR renders unique accessible labels, real frames, original apparatus and contact distinctions", () => {
    const views = STANDING_SUPPORT_DRAFT_IDS.flatMap((draftId) =>
      sides.map((activeSide) =>
        createElement(StandingSupportDraftFigure, {
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
      (m) => m[1],
    );
    const descriptions = [...markup.matchAll(/<desc id="([^"]+)"/g)].map(
      (m) => m[1],
    );
    expect(new Set(titles).size).toBe(4);
    expect(new Set(descriptions).size).toBe(4);
    for (const title of titles)
      expect(markup).toContain(`aria-labelledby="${title}"`);
    for (const desc of descriptions)
      expect(markup).toContain(`aria-describedby="${desc}"`);
    expect([...markup.matchAll(/role="img"/g)]).toHaveLength(4);
    expect([...markup.matchAll(/data-progress="0.5"/g)]).toHaveLength(4);
    expect(markup).toContain('data-active-floor-path="posterior"');
    expect(markup).toContain('data-active-floor-path="lateral"');
    expect(markup).toContain(
      'data-contact="left-palm-rung" data-contact-target="ladder-rung" data-contact-state="fixed"',
    );
    expect(markup).toContain(
      'data-contact="right-toe-tip-floor" data-contact-target="floor" data-contact-state="sliding"',
    );
    expect(markup).toContain('data-barrel-body-contact="false"');
    expect(markup).toContain('data-apparatus-rung="rung-5"');
    expect(markup).toContain("일반 지지 동작을 래더로 바꾼 저작 변형");
    expect(markup).toContain("제작 선택");
    expect(markup).not.toContain("<image");
    expect(markup).not.toContain("<video");
    const start = renderToStaticMarkup(
      createElement(StandingSupportDraftFigure, {
        draftId: "ladder-supported-side-leg-slide",
        progress: -1,
      }),
    );
    const finish = renderToStaticMarkup(
      createElement(StandingSupportDraftFigure, {
        draftId: "ladder-supported-side-leg-slide",
        progress: 2,
      }),
    );
    expect(start).toContain('data-progress="0"');
    expect(finish).toContain('data-progress="1"');
    expect(start).toContain(
      'data-contact="right-toe-tip-floor" data-contact-target="floor" data-contact-state="fixed"',
    );
  });
});
