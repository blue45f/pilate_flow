import { describe, expect, it } from "vitest";
import {
  getSupineDraftPose,
  projectSupinePoint,
  SUPINE_DIMENSIONS,
  SUPINE_PHASES,
} from "./supineDrafts";
import type { SupineDraftId, SupineLeg } from "./supineDrafts";
import type { AnatomicalSide, Point3 } from "./types";

const IDS: readonly SupineDraftId[] = [
  "adult-supine-heel-slide",
  "supine-knee-fold",
];
const SIDES: readonly AnatomicalSide[] = ["left", "right"];
const distance = (a: Point3, b: Point3) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const legPoints = (leg: SupineLeg): Point3[] => [
  leg.hip,
  leg.knee,
  leg.ankle,
  leg.heel,
  leg.toe,
];
const reflectSide = (point: Point3): Point3 => [point[0], -point[1], point[2]];

describe("original supine schematic mechanics", () => {
  it.each(IDS.flatMap((id) => SIDES.map((activeSide) => ({ id, activeSide }))))(
    "keeps fixed segments, supports, contacts and finite points in 1,002 $id / $activeSide poses",
    ({ id, activeSide }) => {
      const start = getSupineDraftPose(id, 0, { activeSide });
      const supportSide = start.supportSide;
      const activeStart = start.world.legs[activeSide];
      const initialFootLengths = [
        distance(activeStart.heel, activeStart.ankle),
        distance(activeStart.ankle, activeStart.toe),
        distance(activeStart.heel, activeStart.toe),
      ];
      for (const mirrored of [false, true]) {
        for (let sample = 0; sample <= 500; sample++) {
          const pose = getSupineDraftPose(id, sample / 500, {
            activeSide,
            mirrored,
          });
          expect(pose.world.body).toEqual(start.world.body);
          expect(pose.world.legs[supportSide]).toEqual(
            start.world.legs[supportSide],
          );
          expect(pose.world.legs[activeSide].hip).toEqual(activeStart.hip);
          expect(pose.world.legs[activeSide].role).toBe("active");
          expect(pose.world.legs[supportSide].role).toBe("support");
          for (const side of SIDES) {
            const leg = pose.world.legs[side];
            expect(distance(leg.hip, leg.knee)).toBeCloseTo(
              SUPINE_DIMENSIONS.thigh,
              8,
            );
            expect(distance(leg.knee, leg.ankle)).toBeCloseTo(
              SUPINE_DIMENSIONS.shin,
              8,
            );
            const lengths = [
              distance(leg.heel, leg.ankle),
              distance(leg.ankle, leg.toe),
              distance(leg.heel, leg.toe),
            ];
            lengths.forEach((length, index) =>
              expect(length).toBeCloseTo(initialFootLengths[index], 8),
            );
            for (const point of legPoints(leg)) {
              expect(point.every(Number.isFinite)).toBe(true);
              expect(point[2]).toBeGreaterThanOrEqual(-1e-10);
              expect(point[1]).toBe(side === "left" ? 23 : -23);
              const screen = projectSupinePoint(point, mirrored);
              expect(screen[0]).toBeGreaterThan(35);
              expect(screen[0]).toBeLessThan(605);
              expect(screen[1]).toBeGreaterThan(110);
              expect(screen[1]).toBeLessThan(325);
            }
          }
          for (const contact of pose.contacts) {
            expect(contact.point.every(Number.isFinite)).toBe(true);
            if (contact.state === "lifted") {
              expect(contact.point[2]).toBeGreaterThan(0);
              expect(contact.side).toBe(activeSide);
              expect(id).toBe("supine-knee-fold");
            } else expect(contact.point[2]).toBe(0);
            if (contact.side === supportSide || contact.side === null)
              expect(contact.state).toBe("fixed");
          }
          for (const point of Object.values(pose.world.body))
            expect(point.every(Number.isFinite)).toBe(true);
        }
      }
    },
  );

  it("slides the active heel along the mat to a straight leg and back", () => {
    for (const activeSide of SIDES) {
      const start = getSupineDraftPose("adult-supine-heel-slide", 0, {
        activeSide,
      });
      const end = getSupineDraftPose("adult-supine-heel-slide", 0.51, {
        activeSide,
      });
      const startLeg = start.world.legs[activeSide];
      const leg = end.world.legs[activeSide];
      expect(leg.heel[0]).toBeGreaterThan(startLeg.heel[0] + 45);
      expect(leg.heel[2]).toBe(0);
      expect(leg.toe[2]).toBe(0);
      expect(distance(leg.hip, leg.ankle)).toBeCloseTo(
        SUPINE_DIMENSIONS.thigh + SUPINE_DIMENSIONS.shin,
        8,
      );
      expect(distance(startLeg.hip, startLeg.ankle)).toBeLessThan(
        distance(leg.hip, leg.ankle),
      );
      expect(
        end.contacts.filter((c) => c.side === activeSide).map((c) => c.state),
      ).toEqual(["sliding", "sliding"]);
    }
  });

  it("lifts both active heel and toe with constant knee bend while the support foot stays put", () => {
    for (const activeSide of SIDES) {
      const start = getSupineDraftPose("supine-knee-fold", 0, { activeSide });
      const end = getSupineDraftPose("supine-knee-fold", 0.51, { activeSide });
      const initial = start.world.legs[activeSide];
      const leg = end.world.legs[activeSide];
      expect(leg.heel[2]).toBeGreaterThan(80);
      expect(leg.toe[2]).toBeGreaterThan(80);
      expect(leg.knee[0]).toBeCloseTo(leg.hip[0], 8);
      expect(leg.knee[2]).toBeCloseTo(leg.ankle[2], 8);
      expect(distance(leg.hip, leg.ankle)).toBeCloseTo(
        distance(initial.hip, initial.ankle),
        8,
      );
      expect(
        end.contacts.filter((c) => c.side === activeSide).map((c) => c.state),
      ).toEqual(["lifted", "lifted"]);
      for (const t of [0.13, 0.2, 0.41, 0.58, 0.75, 0.87]) {
        const moving = getSupineDraftPose("supine-knee-fold", t, {
          activeSide,
        });
        expect(moving.world.legs[activeSide].heel[2]).toBeGreaterThan(0);
        expect(moving.world.legs[activeSide].toe[2]).toBeGreaterThan(0);
        expect(moving.world.legs[start.supportSide]).toEqual(
          start.world.legs[start.supportSide],
        );
      }
    }
  });

  it("has five gapless phases, finite representative samples and an exactly closed cycle", () => {
    for (const id of IDS) {
      const phases = SUPINE_PHASES[id];
      expect(phases.map((p) => p.id)).toEqual([
        "setup",
        "move",
        "turn",
        "return",
        "finish",
      ]);
      expect(phases[0].start).toBe(0);
      expect(phases.at(-1)!.end).toBe(1);
      phases.forEach((phase, index) => {
        if (index) expect(phase.start).toBe(phases[index - 1].end);
        expect(phase.sample).toBeGreaterThanOrEqual(phase.start);
        expect(phase.sample).toBeLessThanOrEqual(phase.end);
        expect(getSupineDraftPose(id, phase.sample).phase.id).toBe(phase.id);
      });
      for (const activeSide of SIDES) {
        for (const mirrored of [false, true]) {
          const first = getSupineDraftPose(id, 0, { activeSide, mirrored });
          const last = getSupineDraftPose(id, 1, { activeSide, mirrored });
          expect(last.world).toEqual(first.world);
          expect(last.contacts).toEqual(first.contacts);
          expect(last.amount).toBe(0);
          expect(last.phase.id).toBe("finish");
        }
      }
    }
  });

  it("switches anatomical side by reflection independently of display mirroring", () => {
    for (const id of IDS) {
      for (const t of [0, 0.13, 0.29, 0.51, 0.74, 0.87, 1]) {
        const left = getSupineDraftPose(id, t, { activeSide: "left" });
        const right = getSupineDraftPose(id, t, { activeSide: "right" });
        for (const [a, b] of [
          ["left", "right"],
          ["right", "left"],
        ] as const) {
          legPoints(left.world.legs[a]).forEach((point, index) => {
            expect(reflectSide(point)).toEqual(
              legPoints(right.world.legs[b])[index],
            );
          });
          expect(left.world.legs[a].role).toBe(right.world.legs[b].role);
        }
        for (const activeSide of SIDES) {
          const normal = getSupineDraftPose(id, t, { activeSide });
          const mirrored = getSupineDraftPose(id, t, {
            activeSide,
            mirrored: true,
          });
          expect(mirrored.world).toEqual(normal.world);
          expect(mirrored.contacts).toEqual(normal.contacts);
          expect(mirrored.activeSide).toBe(activeSide);
          for (const side of SIDES) {
            for (const point of legPoints(normal.world.legs[side])) {
              const original = projectSupinePoint(point);
              const reflected = projectSupinePoint(point, true);
              expect(original[0] + reflected[0]).toBeCloseTo(640, 10);
              expect(original[1]).toBe(reflected[1]);
            }
          }
        }
      }
    }
  });

  it("joins phase boundaries continuously without a positional jump", () => {
    for (const id of IDS) {
      for (const activeSide of SIDES) {
        for (const boundary of [0.12, 0.42, 0.58, 0.88]) {
          const before = getSupineDraftPose(id, boundary - 1e-7, {
            activeSide,
          });
          const after = getSupineDraftPose(id, boundary + 1e-7, { activeSide });
          legPoints(before.world.legs[activeSide]).forEach((point, index) => {
            expect(
              distance(point, legPoints(after.world.legs[activeSide])[index]),
            ).toBeLessThan(1e-4);
          });
        }
      }
    }
  });

  it("validates inputs, clamps finite progress and returns fresh unshared point arrays", () => {
    for (const id of IDS) {
      for (const progress of [NaN, Infinity, -Infinity])
        expect(() => getSupineDraftPose(id, progress)).toThrow(
          "progress must be finite",
        );
      expect(getSupineDraftPose(id, -20).world).toEqual(
        getSupineDraftPose(id, 0).world,
      );
      expect(getSupineDraftPose(id, 20).world).toEqual(
        getSupineDraftPose(id, 1).world,
      );
      expect(getSupineDraftPose(id, -20).progress).toBe(0);
      expect(getSupineDraftPose(id, 20).progress).toBe(1);
      const pose = getSupineDraftPose(id, 0.51);
      const again = getSupineDraftPose(id, 0.51);
      expect(pose.world).not.toBe(again.world);
      expect(pose.world.legs.right.heel).not.toBe(again.world.legs.right.heel);
      expect(pose.contacts.find((c) => c.id === "right-heel")!.point).not.toBe(
        pose.world.legs.right.heel,
      );
    }
    expect(() =>
      getSupineDraftPose("original-mat-heel-slide" as SupineDraftId, 0),
    ).toThrow("Unknown independent");
    expect(() =>
      getSupineDraftPose("supine-knee-fold", 0, {
        activeSide: "top" as AnatomicalSide,
      }),
    ).toThrow("activeSide");
    expect(() =>
      getSupineDraftPose("supine-knee-fold", 0, {
        mirrored: "true" as unknown as boolean,
      }),
    ).toThrow("mirrored");
  });
});
