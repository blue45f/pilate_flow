import { describe, expect, it } from "vitest";
import {
  getApparatusDraftPose,
  projectApparatusPoint,
  APPARATUS_PHASES,
} from "./apparatusDrafts";
import type { ApparatusDraftId, ApparatusLeg } from "./apparatusDrafts";
import {
  REFORMER_DIMENSIONS,
  getReformerFootworkGeometry,
} from "./reformerFootwork";
import {
  CHAIR_DIMENSIONS,
  getChairPedalPressGeometry,
} from "./chairPedalPress";
import type { AnatomicalSide, Point3 } from "./types";
const IDS: readonly ApparatusDraftId[] = [
  "reformer-parallel-footwork",
  "chair-seated-pedal-press",
];
const SIDES: readonly AnatomicalSide[] = ["left", "right"];
const distance = (a: Point3, b: Point3) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const subtract = (a: Point3, b: Point3): Point3 => [
  a[0] - b[0],
  a[1] - b[1],
  a[2] - b[2],
];
const legPoints = (leg: ApparatusLeg): Point3[] => [
  leg.hip,
  leg.knee,
  leg.ankle,
  leg.heel,
  leg.toe,
];
const sampleCases = IDS.flatMap((id) =>
  SIDES.flatMap((activeSide) =>
    [false, true].map((mirrored) => ({ id, activeSide, mirrored })),
  ),
);
describe("independent original apparatus mechanics", () => {
  it.each(sampleCases)(
    "201 finite length/contact poses: $id / $activeSide / mirrored=$mirrored",
    ({ id, activeSide, mirrored }) => {
      const start = getApparatusDraftPose(id, 0, { activeSide, mirrored });
      const dims =
        id === "reformer-parallel-footwork"
          ? REFORMER_DIMENSIONS
          : CHAIR_DIMENSIONS;
      for (let sample = 0; sample <= 200; sample++) {
        const pose = getApparatusDraftPose(id, sample / 200, {
          activeSide,
          mirrored,
        });
        expect(pose.sideMode).toBe("bilateral");
        expect(pose.activeSide).toBe(activeSide);
        for (const side of SIDES) {
          const leg = pose.world.legs[side],
            initial = start.world.legs[side];
          expect(leg.anatomicalSide).toBe(side);
          expect(leg.role).toBe("bilateral");
          expect(distance(leg.hip, leg.knee)).toBeCloseTo(dims.thigh, 8);
          expect(distance(leg.knee, leg.ankle)).toBeCloseTo(dims.shin, 8);
          expect(distance(leg.heel, leg.ankle)).toBeCloseTo(
            distance(initial.heel, initial.ankle),
            8,
          );
          expect(distance(leg.heel, leg.toe)).toBeCloseTo(
            distance(initial.heel, initial.toe),
            8,
          );
          expect(distance(leg.ankle, leg.toe)).toBeCloseTo(
            distance(initial.ankle, initial.toe),
            8,
          );
          for (const point of legPoints(leg)) {
            expect(point.every(Number.isFinite)).toBe(true);
            expect(point[2]).toBeGreaterThan(0);
            expect(point[1]).toBe(side === "left" ? 24 : -24);
            const screen = projectApparatusPoint(point, mirrored);
            expect(screen[0]).toBeGreaterThan(40);
            expect(screen[0]).toBeLessThan(600);
            expect(screen[1]).toBeGreaterThan(75);
            expect(screen[1]).toBeLessThan(310);
          }
        }
        for (const contact of pose.world.contacts) {
          expect(contact.point.every(Number.isFinite)).toBe(true);
          expect(contact.state).toBe("fixed-on-support");
        }
        for (const point of Object.values(pose.world.body))
          expect(point.every(Number.isFinite)).toBe(true);
        expect(pose.review).toEqual({
          professionalReviewCount: 0,
          exactAsset: false,
          autoSubstitution: false,
        });
      }
    },
  );
  it("moves carriage, head, back, pelvis and arms rigidly together while heel/bar contacts remain fixed", () => {
    const first = getApparatusDraftPose("reformer-parallel-footwork", 0);
    if (first.draftId !== "reformer-parallel-footwork")
      throw new Error("draft discrimination");
    for (let sample = 0; sample <= 200; sample++) {
      const pose = getApparatusDraftPose(
        "reformer-parallel-footwork",
        sample / 200,
      );
      if (pose.draftId !== "reformer-parallel-footwork")
        throw new Error("draft discrimination");
      const eq = pose.world.equipment,
        initial = first.world.equipment;
      const displacement = eq.carriage.displacement;
      expect(displacement).toBeLessThanOrEqual(0);
      expect(eq.footbar).toEqual(initial.footbar);
      expect(eq.railEnds).toEqual(initial.railEnds);
      expect(eq.frameCorners).toEqual(initial.frameCorners);
      for (const key of Object.keys(
        first.world.body,
      ) as (keyof typeof first.world.body)[]) {
        const delta = subtract(pose.world.body[key], first.world.body[key]);
        expect(delta[0]).toBeCloseTo(displacement, 9);
        expect(delta[1]).toBe(0);
        expect(delta[2]).toBe(0);
      }
      pose.world.contacts.forEach((contact) => {
        if (contact.frame === "carriage") {
          const relative = subtract(contact.point, eq.carriage.origin);
          relative.forEach((n, i) =>
            expect(n).toBeCloseTo(contact.localAnchor[i], 9),
          );
        } else expect(contact.point).toEqual(contact.localAnchor);
      });
      for (const side of SIDES) {
        const leg = pose.world.legs[side];
        expect(leg.heel).toEqual(initial.footbar.heelAnchors[side]);
        expect(leg.ankle).toEqual(first.world.legs[side].ankle);
        expect(leg.toe).toEqual(first.world.legs[side].toe);
        expect(subtract(leg.hip, first.world.legs[side].hip)[0]).toBeCloseTo(
          displacement,
          9,
        );
      }
    }
    const end = getApparatusDraftPose("reformer-parallel-footwork", 0.51);
    expect(end.world.body.pelvisCenter[0]).toBeLessThan(
      first.world.body.pelvisCenter[0] - 40,
    );
    expect(
      distance(end.world.legs.left.hip, end.world.legs.left.ankle),
    ).toBeGreaterThan(
      distance(first.world.legs.left.hip, first.world.legs.left.ankle) + 40,
    );
  });
  it("keeps chair seat/hip fixed and heel contact on a rigid pedal arc around its fixed hinge", () => {
    const first = getApparatusDraftPose("chair-seated-pedal-press", 0);
    if (first.draftId !== "chair-seated-pedal-press")
      throw new Error("draft discrimination");
    for (let sample = 0; sample <= 200; sample++) {
      const pose = getApparatusDraftPose(
        "chair-seated-pedal-press",
        sample / 200,
      );
      if (pose.draftId !== "chair-seated-pedal-press")
        throw new Error("draft discrimination");
      const eq = pose.world.equipment,
        pedal = eq.pedal;
      expect(eq.kind).toBe("pilates-chair");
      expect(eq.isOrdinaryChair).toBe(false);
      expect(eq.seat).toEqual(first.world.equipment.seat);
      expect(pedal.hinge).toEqual(first.world.equipment.pedal.hinge);
      expect(pose.world.body).toEqual(first.world.body);
      const tangent: Point3 = [Math.cos(pedal.angle), 0, Math.sin(pedal.angle)];
      for (const side of SIDES) {
        const leg = pose.world.legs[side],
          relative = subtract(leg.heel, pedal.hinge);
        expect(leg.hip).toEqual(first.world.legs[side].hip);
        expect(leg.heel).toEqual(pedal.heelAnchors[side]);
        expect(Math.hypot(relative[0], relative[2])).toBeCloseTo(
          CHAIR_DIMENSIONS.heelRadius,
          9,
        );
        expect(relative[0] * tangent[2] - relative[2] * tangent[0]).toBeCloseTo(
          0,
          9,
        );
        expect(eq.seat.sitBoneAnchors[side][2]).toBe(
          CHAIR_DIMENSIONS.seatHeight,
        );
        const heelContact = pose.world.contacts.find(
          (c) => c.id === `${side}-heel-pedal`,
        )!;
        expect(heelContact.point).toEqual(leg.heel);
        expect(heelContact.localAnchor).toEqual([
          102,
          side === "left" ? 24 : -24,
          0,
        ]);
      }
      expect(distance(pedal.corners[0], pedal.corners[1])).toBeCloseTo(
        pedal.length,
        9,
      );
      expect(distance(pedal.corners[1], pedal.corners[2])).toBeCloseTo(
        pedal.width,
        9,
      );
      expect(
        pose.world.contacts
          .filter((c) => c.target === "chair-seat")
          .map((c) => c.point),
      ).toEqual(
        first.world.contacts
          .filter((c) => c.target === "chair-seat")
          .map((c) => c.point),
      );
    }
    const pressed = getApparatusDraftPose("chair-seated-pedal-press", 0.51);
    expect(pressed.world.legs.left.heel[2]).toBeLessThan(
      first.world.legs.left.heel[2] - 35,
    );
    expect(pressed.world.legs.left.heel[0]).not.toBe(
      first.world.legs.left.heel[0],
    );
  });
  it("uses bilateral symmetric anatomy and changes only projection under mirroring or side metadata", () => {
    for (const id of IDS)
      for (const p of [0, 0.13, 0.29, 0.51, 0.74, 0.87, 1]) {
        const normal = getApparatusDraftPose(id, p, { activeSide: "left" });
        const mirror = getApparatusDraftPose(id, p, {
          activeSide: "right",
          mirrored: true,
        });
        expect(mirror.world).toEqual(normal.world);
        expect(mirror.activeSide).toBe("right");
        legPoints(normal.world.legs.left).forEach((point, i) => {
          expect([point[0], -point[1], point[2]]).toEqual(
            legPoints(normal.world.legs.right)[i],
          );
          const a = projectApparatusPoint(point),
            b = projectApparatusPoint(point, true);
          expect(a[0] + b[0]).toBeCloseTo(640, 10);
          expect(a[1]).toBe(b[1]);
        });
      }
  });
  it("has five gapless sampled phases and exactly closed geometry/contact/equipment cycles", () => {
    for (const id of IDS) {
      const phases = APPARATUS_PHASES[id];
      expect(phases.map((p) => p.id)).toEqual([
        "setup",
        "move",
        "turn",
        "return",
        "finish",
      ]);
      phases.forEach((p, i) => {
        if (i) expect(p.start).toBe(phases[i - 1].end);
        expect(getApparatusDraftPose(id, p.sample).phase.id).toBe(p.id);
      });
      for (const activeSide of SIDES)
        for (const mirrored of [false, true])
          expect(
            getApparatusDraftPose(id, 1, { activeSide, mirrored }).world,
          ).toEqual(
            getApparatusDraftPose(id, 0, { activeSide, mirrored }).world,
          );
      for (const boundary of [0.12, 0.42, 0.58, 0.88]) {
        const before = getApparatusDraftPose(id, boundary - 1e-7),
          after = getApparatusDraftPose(id, boundary + 1e-7);
        legPoints(before.world.legs.left).forEach((point, i) =>
          expect(
            distance(point, legPoints(after.world.legs.left)[i]),
          ).toBeLessThan(1e-5),
        );
      }
    }
  });
  it("validates finite inputs and independent IDs, and clamps finite progress", () => {
    for (const id of IDS) {
      for (const p of [NaN, Infinity, -Infinity])
        expect(() => getApparatusDraftPose(id, p)).toThrow("finite");
      expect(getApparatusDraftPose(id, -4).progress).toBe(0);
      expect(getApparatusDraftPose(id, 4).progress).toBe(1);
      expect(getApparatusDraftPose(id, -4).world).toEqual(
        getApparatusDraftPose(id, 0).world,
      );
      expect(getApparatusDraftPose(id, 4).world).toEqual(
        getApparatusDraftPose(id, 1).world,
      );
    }
    expect(() =>
      getApparatusDraftPose(
        "original-reformer-parallel-footwork" as ApparatusDraftId,
        0,
      ),
    ).toThrow("Unknown independent");
    expect(() =>
      getApparatusDraftPose("chair-seated-pedal-press", 0, {
        activeSide: "top" as AnatomicalSide,
      }),
    ).toThrow("activeSide");
    expect(() =>
      getApparatusDraftPose("chair-seated-pedal-press", 0, {
        mirrored: "true" as unknown as boolean,
      }),
    ).toThrow("mirrored");
    for (const fn of [getChairPedalPressGeometry, getReformerFootworkGeometry])
      for (const q of [NaN, Infinity, -0.01, 1.01])
        expect(() => fn(q)).toThrow("finite");
  });
});
