import { describe, expect, it } from 'vitest';
import {
  getSupineReachPose,
  projectSupineReachPoint,
  SUPINE_REACH_IDS,
  SUPINE_REACH_MODEL_VERSION,
  SUPINE_REACH_PARAMS,
  SUPINE_REACH_PHASES,
} from './supineReach';
import type { SupineReachPoint, SupineReachPose, SupineReachSide } from './supineReach';

const sides = ['left', 'right'] as const;
const distance = (a: SupineReachPoint, b: SupineReachPoint) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const geometry = (pose: SupineReachPose) => ({
  body: pose.body,
  legs: pose.legs,
  arms: pose.arms,
  contacts: pose.contacts,
  equipment: pose.equipment,
  camera: pose.camera,
  trajectory: pose.trajectory,
});
const landmarks = (pose: SupineReachPose): SupineReachPoint[] => [
  ...pose.body.spine,
  ...pose.body.torsoRings.flat(),
  ...pose.body.head.outline,
  pose.body.head.center,
  pose.body.head.nose,
  pose.body.head.chin,
  pose.body.head.eye,
  ...pose.equipment.mat.corners,
  ...pose.trajectory.points,
  ...sides.flatMap((side) => {
    const leg = pose.legs[side];
    const arm = pose.arms[side];
    return [
      leg.hip,
      leg.knee,
      leg.ankle,
      leg.heel,
      leg.toe,
      arm.shoulder,
      arm.elbow,
      arm.wrist,
      arm.handPatch,
      arm.targetPoint,
    ];
  }),
  ...pose.contacts.flatMap((contact) =>
    contact.targetPoint ? [contact.point, contact.targetPoint] : [contact.point],
  ),
];

describe('original unreviewed supine reach geometry', () => {
  it('declares the isolated variant and five author-chosen hold/move intervals', () => {
    const pose = getSupineReachPose(0);
    expect(SUPINE_REACH_IDS).toEqual(['supine-single-leg-reach-v1']);
    expect(pose.variantId).toBe(SUPINE_REACH_IDS[0]);
    expect(pose.family).toBe('supine-reach');
    expect(pose.modelVersion).toBe(SUPINE_REACH_MODEL_VERSION);
    expect(pose.activeSide).toBe('left');
    expect(pose.retainedSide).toBe('right');
    expect(
      SUPINE_REACH_PHASES.map(({ id, start, end, sample, displayBehavior }) => [
        id,
        start,
        end,
        sample,
        displayBehavior,
      ]),
    ).toEqual([
      ['setup', 0, 0.12, 0, 'hold'],
      ['move', 0.12, 0.42, 0.27, 'move'],
      ['turn', 0.42, 0.58, 0.5, 'hold'],
      ['return', 0.58, 0.88, 0.73, 'move'],
      ['finish', 0.88, 1, 1, 'hold'],
    ]);
    expect(SUPINE_REACH_PHASES.every((phase) => phase.labelKo && phase.label)).toBe(true);
    expect(pose.review).toEqual({ status: 'unreviewed', professionalReviewCount: 0 });
    expect(pose.exactSourceVariantMatched).toBe(false);
    expect(pose.exactAssetReady).toBe(false);
    expect(pose.autoRecommendationEligible).toBe(false);
    expect(Object.isFrozen(pose.body.spine[0])).toBe(true);
  });

  it('clamps finite progress and rejects nonfinite coordinates and invalid options', () => {
    expect(getSupineReachPose(-2).progress).toBe(0);
    expect(getSupineReachPose(2).progress).toBe(1);
    for (const value of [NaN, Infinity, -Infinity])
      expect(() => getSupineReachPose(value)).toThrow(RangeError);
    expect(() => getSupineReachPose(0, { activeSide: 'front' as SupineReachSide })).toThrow(
      TypeError,
    );
    expect(() => getSupineReachPose(0, { mirrored: 'yes' as unknown as boolean })).toThrow(
      TypeError,
    );
    expect(() =>
      getSupineReachPose(0, null as unknown as Parameters<typeof getSupineReachPose>[1]),
    ).toThrow(TypeError);
    expect(() =>
      getSupineReachPose(0, [] as unknown as Parameters<typeof getSupineReachPose>[1]),
    ).toThrow(TypeError);
    const sparsePoint = new Array<number>(3);
    sparsePoint[0] = 0;
    sparsePoint[2] = 0;
    for (const point of [[0, NaN, 0], [0, Infinity, 0], [0, 0], sparsePoint]) {
      expect(() => projectSupineReachPoint(point as unknown as SupineReachPoint)).toThrow(
        RangeError,
      );
    }
    expect(() => projectSupineReachPoint([0, 0, 0], 1 as unknown as boolean)).toThrow(TypeError);
  });

  it('preserves the chosen lower static profile as an authored art regression, not a clinical standard', () => {
    for (const activeSide of sides) {
      const pose = getSupineReachPose(0.5, { activeSide });
      const retained = pose.legs[pose.retainedSide];
      // These relative limits distinguish this chosen low profile from the earlier
      // tall silhouette. They do not define a correct human chest-lift angle.
      expect(pose.body.shoulders.left[2] - pose.body.pelvis[2]).toBeLessThan(
        SUPINE_REACH_PARAMS.limbLengths.thigh * 0.35,
      );
      expect(pose.body.head.center[2]).toBeLessThan(retained.knee[2]);
      expect(Math.max(...pose.body.head.outline.map((point) => point[2]))).toBeLessThan(
        retained.kneeTopPatches.left[2],
      );
      expect(pose.body.head.eye[2]).toBeGreaterThan(pose.body.head.nose[2]);
      expect(
        pose.body.torsoRings.slice(2).every((ring) => ring.every((point) => point[2] > 0)),
      ).toBe(true);
      for (const side of sides) {
        const arm = pose.arms[side];
        const reach = distance(arm.shoulder, arm.targetPoint);
        expect(reach).toBeLessThan(
          SUPINE_REACH_PARAMS.limbLengths.upperArm +
            SUPINE_REACH_PARAMS.limbLengths.forearm -
            SUPINE_REACH_PARAMS.reachMargin,
        );
      }
    }
  });

  for (const activeSide of sides) {
    for (const mirrored of [false, true]) {
      it(`preserves lengths, fixed parts, contacts and view bounds at 241 samples (${activeSide}, mirror ${mirrored})`, () => {
        const initial = getSupineReachPose(0, { activeSide, mirrored });
        const retainedSide = initial.retainedSide;
        const bodyBaseline = JSON.stringify(initial.body);
        const retainedBaseline = JSON.stringify(initial.legs[retainedSide]);
        const armsBaseline = JSON.stringify(initial.arms);
        const fixedContactsBaseline = JSON.stringify(
          initial.contacts.filter((contact) => contact.bodyPart !== 'foot'),
        );
        let maxLengthError = 0;
        let minimumFootHeight = Infinity;
        let allStationary = true;
        let allFiniteInView = true;
        let allContactsAnchored = true;
        for (let sample = 0; sample <= 240; sample += 1) {
          const pose = getSupineReachPose(sample / 240, { activeSide, mirrored });
          allStationary &&=
            JSON.stringify(pose.body) === bodyBaseline &&
            JSON.stringify(pose.legs[retainedSide]) === retainedBaseline &&
            JSON.stringify(pose.arms) === armsBaseline &&
            JSON.stringify(pose.contacts.filter((contact) => contact.bodyPart !== 'foot')) ===
              fixedContactsBaseline;
          for (const side of sides) {
            const leg = pose.legs[side];
            const arm = pose.arms[side];
            maxLengthError = Math.max(
              maxLengthError,
              Math.abs(distance(leg.hip, leg.knee) - SUPINE_REACH_PARAMS.limbLengths.thigh),
              Math.abs(distance(leg.knee, leg.ankle) - SUPINE_REACH_PARAMS.limbLengths.shin),
              Math.abs(
                distance(arm.shoulder, arm.elbow) - SUPINE_REACH_PARAMS.limbLengths.upperArm,
              ),
              Math.abs(distance(arm.elbow, arm.wrist) - SUPINE_REACH_PARAMS.limbLengths.forearm),
            );
            minimumFootHeight = Math.min(
              minimumFootHeight,
              leg.ankle[2],
              leg.heel[2] - 5,
              leg.toe[2] - 5,
            );
            allContactsAnchored &&=
              distance(arm.handPatch, pose.legs[retainedSide].kneeTopPatches[side]) === 0;
          }
          for (const contact of pose.contacts) {
            if (contact.surface === 'mat') {
              allContactsAnchored &&=
                contact.state === 'fixed' &&
                contact.point[2] === 0 &&
                contact.targetPoint !== null &&
                distance(contact.point, contact.targetPoint) === 0 &&
                (contact.bodyPart === 'pelvis' || contact.bodyPart === 'lower-trunk');
            } else if (contact.surface === 'retained-knee') {
              allContactsAnchored &&=
                contact.bodyPart === 'hand' &&
                contact.state === 'maintained' &&
                contact.targetSide === retainedSide &&
                contact.targetPoint !== null &&
                distance(contact.point, contact.targetPoint) === 0;
            } else {
              allContactsAnchored &&=
                contact.state === 'not-supported' && contact.targetPoint === null;
            }
          }
          for (const point of landmarks(pose)) {
            const screen = projectSupineReachPoint(point, mirrored);
            allFiniteInView &&=
              point.every(Number.isFinite) &&
              screen.every(Number.isFinite) &&
              screen[0] >= 8 &&
              screen[0] <= 632 &&
              screen[1] >= 55 &&
              screen[1] <= 306;
          }
        }
        expect(maxLengthError).toBeLessThan(1e-10);
        expect(minimumFootHeight).toBeGreaterThan(0);
        expect(allStationary).toBe(true);
        expect(allContactsAnchored).toBe(true);
        expect(allFiniteInView).toBe(true);
        expect(
          initial.contacts
            .filter((contact) => contact.surface === 'mat')
            .map((contact) => contact.bodyPart),
        ).toEqual(['pelvis', 'lower-trunk']);
        expect(
          initial.contacts
            .filter((contact) => contact.state === 'not-supported')
            .map((contact) => contact.bodyPart),
        ).toEqual(['head', 'chest', 'foot', 'foot']);
        expect(
          initial.body.torsoRings[0].some(
            (point) => distance(point, initial.body.matPatches.pelvis) < 1e-10,
          ),
        ).toBe(true);
        expect(
          initial.body.torsoRings[1].some(
            (point) => distance(point, initial.body.matPatches.lowerTrunk) < 1e-10,
          ),
        ).toBe(true);
      });
    }
  }

  it('closes the cycle exactly and holds all geometry and trajectory metadata inside hold phases', () => {
    for (const activeSide of sides) {
      const start = getSupineReachPose(0, { activeSide });
      const finish = getSupineReachPose(1, { activeSide });
      expect(geometry(finish)).toEqual(geometry(start));
      expect(start.amount).toBe(0);
      expect(finish.amount).toBe(0);
      expect(start.body.head.center[2]).toBeGreaterThan(0);
      for (const [first, second] of [
        [0.01, 0.11],
        [0.43, 0.57],
        [0.89, 0.99],
      ]) {
        expect(geometry(getSupineReachPose(first, { activeSide }))).toEqual(
          geometry(getSupineReachPose(second, { activeSide })),
        );
      }
    }
  });

  it('is continuous across each half-open phase boundary and reverses the same authored path', () => {
    for (const activeSide of sides) {
      for (const boundary of [0.12, 0.42, 0.58, 0.88]) {
        const before = getSupineReachPose(boundary - 1e-6, { activeSide });
        const after = getSupineReachPose(boundary + 1e-6, { activeSide });
        expect(distance(before.legs[activeSide].ankle, after.legs[activeSide].ankle)).toBeLessThan(
          1e-8,
        );
        expect(Math.abs(before.amount - after.amount)).toBeLessThan(1e-10);
      }
      expect(
        [0.12, 0.42, 0.58, 0.88, 1].map((progress) => getSupineReachPose(progress).phase.id),
      ).toEqual(['move', 'turn', 'return', 'finish', 'finish']);
      const move = getSupineReachPose(0.27, { activeSide });
      const returning = getSupineReachPose(0.73, { activeSide });
      expect(move.amount).toBeCloseTo(returning.amount, 12);
      expect(move.legs).toEqual(returning.legs);
      expect(move.trajectory.direction).toBe('extension');
      expect(returning.trajectory.direction).toBe('return');
      expect(move.trajectory.directionPoints).toEqual(move.trajectory.points);
      expect(returning.trajectory.directionPoints).toEqual([...move.trajectory.points].reverse());
      expect(move.trajectory.points[0]).toEqual(
        getSupineReachPose(0, { activeSide }).legs[activeSide].ankle,
      );
      expect(move.trajectory.points.at(-1)).toEqual(
        getSupineReachPose(0.5, { activeSide }).legs[activeSide].ankle,
      );
      for (const progress of [0, 0.06, 0.5, 0.94, 1]) {
        const hold = getSupineReachPose(progress, { activeSide });
        expect(hold.trajectory.direction).toBeNull();
        expect(hold.trajectory.directionPoints).toEqual([]);
      }
    }
  });

  it('reflects screen x only and keeps anatomical identity and the selected leg unchanged', () => {
    for (const activeSide of sides) {
      const normal = getSupineReachPose(0.31, { activeSide });
      const mirrored = getSupineReachPose(0.31, { activeSide, mirrored: true });
      expect(geometry(mirrored)).toEqual(geometry(normal));
      expect(mirrored.activeSide).toBe(normal.activeSide);
      expect(mirrored.retainedSide).toBe(normal.retainedSide);
      for (const point of landmarks(normal)) {
        const a = projectSupineReachPoint(point);
        const b = projectSupineReachPoint(point, true);
        expect(a[0] + b[0]).toBeCloseTo(640, 12);
        expect(b[1]).toBe(a[1]);
      }
      expect(normal.legs.left.hip[1]).toBeGreaterThan(0);
      expect(normal.legs.right.hip[1]).toBeLessThan(0);
    }
  });
});
