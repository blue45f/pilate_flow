import { describe, expect, it } from "vitest";
import {
  getTensionDraftPose,
  projectTensionPoint,
  TENSION_PHASES,
} from "./tensionDrafts";
import type { TensionDraftId, TensionArm, TensionLeg } from "./tensionDrafts";
import {
  REFORMER_TENSION_DIMENSIONS,
  getReformerStrapArmPressGeometry,
} from "./reformerStrapArmPress";
import {
  CADILLAC_TENSION_DIMENSIONS,
  getCadillacArmSpringPressGeometry,
} from "./cadillacArmSpringPress";
import type { AnatomicalSide, Point3 } from "./types";
const IDS: readonly TensionDraftId[] = [
  "reformer-supine-strap-arm-press",
  "cadillac-supine-arm-spring-press",
];
const SIDES: readonly AnatomicalSide[] = ["left", "right"];
const dist = (a: Point3, b: Point3) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const delta = (a: Point3, b: Point3): Point3 => [
  a[0] - b[0],
  a[1] - b[1],
  a[2] - b[2],
];
const armPoints = (a: TensionArm): Point3[] => [a.shoulder, a.elbow, a.hand];
const legPoints = (a: TensionLeg): Point3[] => [
  a.hip,
  a.knee,
  a.ankle,
  a.heel,
  a.toe,
];
const cases = IDS.flatMap((id) =>
  SIDES.flatMap((activeSide) =>
    [false, true].map((mirrored) => ({ id, activeSide, mirrored })),
  ),
);
describe("original tension rig mechanics", () => {
  it.each(cases)(
    "201 finite fixed-bone poses: $id / $activeSide / mirror=$mirrored",
    ({ id, activeSide, mirrored }) => {
      const dims =
        id === "reformer-supine-strap-arm-press"
          ? REFORMER_TENSION_DIMENSIONS
          : CADILLAC_TENSION_DIMENSIONS;
      const start = getTensionDraftPose(id, 0, { activeSide, mirrored });
      for (let i = 0; i <= 200; i++) {
        const pose = getTensionDraftPose(id, i / 200, { activeSide, mirrored });
        expect(pose.sideMode).toBe("bilateral");
        expect(pose.activeSide).toBe(activeSide);
        for (const side of SIDES) {
          const a = pose.world.arms[side],
            leg = pose.world.legs[side],
            initial = start.world.legs[side];
          expect(a.anatomicalSide).toBe(side);
          expect(a.role).toBe("bilateral");
          expect(dist(a.shoulder, a.elbow)).toBeCloseTo(dims.upperArm, 8);
          expect(dist(a.elbow, a.hand)).toBeCloseTo(dims.forearm, 8);
          expect(dist(leg.hip, leg.knee)).toBeCloseTo(dims.thigh, 8);
          expect(dist(leg.knee, leg.ankle)).toBeCloseTo(dims.shin, 8);
          expect(dist(leg.heel, leg.ankle)).toBeCloseTo(
            dist(initial.heel, initial.ankle),
            8,
          );
          expect(dist(leg.toe, leg.ankle)).toBeCloseTo(
            dist(initial.toe, initial.ankle),
            8,
          );
          expect(dist(leg.heel, leg.toe)).toBeCloseTo(
            dist(initial.heel, initial.toe),
            8,
          );
          for (const p of [...armPoints(a), ...legPoints(leg)]) {
            expect(p.every(Number.isFinite)).toBe(true);
            expect(p[2]).toBeGreaterThan(0);
            const s = projectTensionPoint(p, mirrored);
            expect(s[0]).toBeGreaterThan(35);
            expect(s[0]).toBeLessThan(605);
            expect(s[1]).toBeGreaterThan(110);
            expect(s[1]).toBeLessThan(305);
          }
          const grip = pose.world.contacts.find(
            (c) => c.id === `${side}-handle`,
          )!;
          expect(grip.point).toEqual(a.hand);
          expect(grip.target).toBe("handle-grip");
          expect(grip.state).toBe("grasped");
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
  it("conserves both rope lengths with fixed pulleys while every carriage-supported point translates", () => {
    const start = getTensionDraftPose("reformer-supine-strap-arm-press", 0);
    if (start.draftId !== "reformer-supine-strap-arm-press")
      throw new Error("discrimination");
    const first = start.world.equipment;
    for (let i = 0; i <= 300; i++) {
      const pose = getTensionDraftPose(
        "reformer-supine-strap-arm-press",
        i / 300,
      );
      if (pose.draftId !== "reformer-supine-strap-arm-press")
        throw new Error("discrimination");
      const eq = pose.world.equipment,
        d = eq.carriage.displacement;
      expect(eq.frame).toEqual(first.frame);
      expect(eq.rails).toEqual(first.rails);
      expect(eq.pulleys).toEqual(first.pulleys);
      expect(eq.carriage.origin[0]).toBeGreaterThan(35);
      for (const side of SIDES) {
        const r = eq.lines[side];
        expect(
          dist(r.hand, r.pulley) + dist(r.pulley, r.carriageAnchor),
        ).toBeCloseTo(first.lines[side].referenceLength, 8);
        expect(r.geometricLength).toBeCloseTo(r.referenceLength, 8);
        expect(r.hand).toEqual(pose.world.arms[side].hand);
        expect(r.pulley).toEqual(first.pulleys[side]);
        expect(
          delta(r.carriageAnchor, first.carriageAnchors[side])[0],
        ).toBeCloseTo(d, 9);
        legPoints(pose.world.legs[side]).forEach((p, j) => {
          const diff = delta(p, legPoints(start.world.legs[side])[j]);
          expect(diff[0]).toBeCloseTo(d, 9);
          expect(diff[1]).toBe(0);
          expect(diff[2]).toBe(0);
        });
      }
      for (const key of Object.keys(
        start.world.body,
      ) as (keyof typeof start.world.body)[]) {
        const v = delta(pose.world.body[key], start.world.body[key]);
        expect(v[0]).toBeCloseTo(d, 9);
        expect(v[1]).toBe(0);
        expect(v[2]).toBe(0);
      }
      for (const c of pose.world.contacts.filter((c) => c.frame === "carriage"))
        delta(c.point, eq.carriage.origin).forEach((n, j) =>
          expect(n).toBeCloseTo(c.localAnchor[j], 9),
        );
      expect(eq.springForce).toBe("not-modeled");
      expect(eq.settings).toBe("not-modeled");
    }
    const end = getTensionDraftPose("reformer-supine-strap-arm-press", 0.51);
    expect(end.world.body.headCenter[0]).toBeLessThan(
      start.world.body.headCenter[0] - 40,
    );
    expect(end.world.arms.left.hand[2]).toBeLessThan(
      start.world.arms.left.hand[2] - 80,
    );
  });
  it("keeps the Cadillac table/frame/feet/body fixed and changes only visual spring length with the arm path", () => {
    const start = getTensionDraftPose("cadillac-supine-arm-spring-press", 0);
    if (start.draftId !== "cadillac-supine-arm-spring-press")
      throw new Error("discrimination");
    for (let i = 0; i <= 300; i++) {
      const pose = getTensionDraftPose(
        "cadillac-supine-arm-spring-press",
        i / 300,
      );
      if (pose.draftId !== "cadillac-supine-arm-spring-press")
        throw new Error("discrimination");
      const eq = pose.world.equipment;
      expect(eq.table).toEqual(start.world.equipment.table);
      expect(eq.frame).toEqual(start.world.equipment.frame);
      expect(eq.anchors).toEqual(start.world.equipment.anchors);
      expect(pose.world.body).toEqual(start.world.body);
      expect(pose.world.legs).toEqual(start.world.legs);
      for (const side of SIDES) {
        const s = eq.lines[side];
        expect(s.anchor).toEqual(eq.anchors[side]);
        expect(s.handle).toEqual(pose.world.arms[side].hand);
        expect(s.visualLength).toBeCloseTo(dist(s.anchor, s.handle), 9);
        expect(dist(s.coil[0], s.anchor)).toBeLessThan(1e-10);
        expect(dist(s.coil.at(-1)!, s.handle)).toBeLessThan(1e-10);
        expect(s.coil.every((p) => p.every(Number.isFinite))).toBe(true);
        expect(s.force).toBe("not-modeled");
        expect(pose.world.legs[side].heel[2]).toBe(88);
        expect(pose.world.legs[side].toe[2]).toBe(88);
      }
      for (const c of pose.world.contacts.filter((c) => c.frame === "table"))
        delta(c.point, eq.table.origin).forEach((n, j) =>
          expect(n).toBeCloseTo(c.localAnchor[j], 9),
        );
    }
    const end = getTensionDraftPose("cadillac-supine-arm-spring-press", 0.51);
    if (end.draftId !== "cadillac-supine-arm-spring-press")
      throw new Error("discrimination");
    expect(end.world.equipment.lines.left.visualLength).toBeGreaterThan(
      start.world.equipment.lines.left.visualLength + 70,
    );
  });
  it("preserves the explicit unspecified ball variant and authored bilateral medial-ankle contacts", () => {
    for (const p of [0, 0.2, 0.51, 0.74, 1]) {
      const pose = getTensionDraftPose("reformer-supine-strap-arm-press", p);
      if (pose.draftId !== "reformer-supine-strap-arm-press")
        throw new Error("discrimination");
      const ball = pose.world.equipment.ball;
      expect(ball.kind).toBe("generic-unspecified-ball");
      expect(ball.sourceSizeVerified).toBe(false);
      expect(ball.pressure).toBe("not-modeled");
      for (const side of SIDES) {
        const c = pose.world.contacts.find(
          (c) => c.id === `${side}-ankle-ball`,
        )!;
        expect(dist(c.point, ball.center)).toBeCloseTo(ball.radius, 9);
        expect(dist(c.point, pose.world.legs[side].ankle)).toBeCloseTo(10, 9);
        expect(pose.world.legs[side].heel[2]).toBeGreaterThan(
          pose.world.equipment.carriage.origin[2] + 80,
        );
      }
    }
  });
  it("keeps bilateral anatomy independent of input-side labels and view reflection", () => {
    for (const id of IDS)
      for (const p of [0, 0.13, 0.29, 0.51, 0.74, 0.87, 1]) {
        const a = getTensionDraftPose(id, p, { activeSide: "left" }),
          b = getTensionDraftPose(id, p, {
            activeSide: "right",
            mirrored: true,
          });
        expect(b.world).toEqual(a.world);
        for (const pair of [
          [armPoints(a.world.arms.left), armPoints(a.world.arms.right)],
          [legPoints(a.world.legs.left), legPoints(a.world.legs.right)],
        ])
          pair[0].forEach((point, i) => {
            expect([point[0], -point[1], point[2]]).toEqual(pair[1][i]);
            const s = projectTensionPoint(point),
              m = projectTensionPoint(point, true);
            expect(s[0] + m[0]).toBeCloseTo(640, 10);
            expect(s[1]).toBe(m[1]);
          });
      }
  });
  it("has five sampled gapless phases, continuous boundaries and exact closed geometry/support cycles", () => {
    for (const id of IDS) {
      const phases = TENSION_PHASES[id];
      expect(phases.map((p) => p.id)).toEqual([
        "setup",
        "move",
        "turn",
        "return",
        "finish",
      ]);
      phases.forEach((p, i) => {
        if (i) expect(p.start).toBe(phases[i - 1].end);
        expect(getTensionDraftPose(id, p.sample).phase.id).toBe(p.id);
      });
      for (const activeSide of SIDES)
        for (const mirrored of [false, true])
          expect(
            getTensionDraftPose(id, 1, { activeSide, mirrored }).world,
          ).toEqual(getTensionDraftPose(id, 0, { activeSide, mirrored }).world);
      for (const p of [0.12, 0.42, 0.58, 0.88]) {
        const before = getTensionDraftPose(id, p - 1e-7),
          after = getTensionDraftPose(id, p + 1e-7);
        armPoints(before.world.arms.left).forEach((point, i) =>
          expect(dist(point, armPoints(after.world.arms.left)[i])).toBeLessThan(
            1e-5,
          ),
        );
      }
    }
  });
  it("rejects nonfinite and canonical inputs and clamps finite progress", () => {
    for (const id of IDS) {
      for (const p of [NaN, Infinity, -Infinity])
        expect(() => getTensionDraftPose(id, p)).toThrow("finite");
      expect(getTensionDraftPose(id, -3).progress).toBe(0);
      expect(getTensionDraftPose(id, 3).progress).toBe(1);
      expect(getTensionDraftPose(id, -3).world).toEqual(
        getTensionDraftPose(id, 0).world,
      );
      expect(getTensionDraftPose(id, 3).world).toEqual(
        getTensionDraftPose(id, 1).world,
      );
    }
    expect(() =>
      getTensionDraftPose(
        "original-reformer-supine-arm-press" as TensionDraftId,
        0,
      ),
    ).toThrow("Unknown independent");
    expect(() =>
      getTensionDraftPose(IDS[0], 0, { activeSide: "top" as AnatomicalSide }),
    ).toThrow("activeSide");
    expect(() =>
      getTensionDraftPose(IDS[0], 0, {
        mirrored: "true" as unknown as boolean,
      }),
    ).toThrow("mirrored");
    for (const fn of [
      getReformerStrapArmPressGeometry,
      getCadillacArmSpringPressGeometry,
    ])
      for (const q of [NaN, Infinity, -0.01, 1.01])
        expect(() => fn(q)).toThrow("finite");
  });
});
