import { describe, expect, it } from 'vitest';
import type { AnatomicalSide, Point3 } from '../models/types';
import {
  CHEST_LIFT_DRAFT_ID,
  CHEST_LIFT_PARAMS,
  MODEL_VERSION,
  PHASES,
  getChestLiftPose,
  projectChestLiftPoint,
} from '../models/chestLift';
import type { ChestLiftOptions, ChestLiftPose } from '../models/chestLift';

const sides = ['left', 'right'] as const;
const distance = (a: Point3, b: Point3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const localHeadPoint = (point: Point3, pose: ChestLiftPose): Point3 => {
  const x = point[0] - pose.head.center[0];
  const z = point[2] - pose.head.center[2];
  const angle = pose.head.rotation;
  return [
    x * Math.cos(angle) + z * Math.sin(angle),
    point[1] - pose.head.center[1],
    -x * Math.sin(angle) + z * Math.cos(angle),
  ];
};

function geometry(pose: ChestLiftPose) {
  return {
    spine: pose.spine,
    head: pose.head,
    arms: pose.arms,
    legs: pose.legs,
    scapularInferiorTips: pose.scapularInferiorTips,
    torsoRings: pose.torsoRings,
    matCorners: pose.matCorners,
    contacts: pose.contacts,
  };
}

function points(pose: ChestLiftPose): Point3[] {
  return [
    ...pose.spine.points,
    pose.head.center,
    ...pose.head.outline,
    pose.head.nose,
    pose.head.chin,
    pose.head.eye,
    ...sides.flatMap((side) => {
      const arm = pose.arms[side];
      return [
        pose.head.occipitalPatches[side],
        arm.shoulder,
        arm.elbow,
        arm.wrist,
        arm.handPatch,
        arm.target,
        ...Object.values(pose.legs[side]),
        pose.scapularInferiorTips[side],
      ];
    }),
    ...pose.torsoRings.flat(),
    ...pose.matCorners,
    ...pose.contacts.flatMap((contact) => [contact.point, contact.targetPoint]),
  ];
}

/** Straight capsule endpoints bound all intervening capsule surface heights. */
function minimumSurfaceHeight(pose: ChestLiftPose): number {
  const r = CHEST_LIFT_PARAMS.radii;
  const headMinimum =
    pose.head.center[2] -
    Math.hypot(r.head.x * Math.sin(pose.head.rotation), r.head.z * Math.cos(pose.head.rotation));
  const clearances = [
    headMinimum,
    ...pose.head.outline.map((point) => point[2]),
    ...pose.torsoRings.flat().map((point) => point[2]),
    Math.min(pose.spine.upperThorax[2], pose.spine.neckMid[2], pose.spine.occiput[2]) - r.neck,
    ...sides.flatMap((side) => {
      const arm = pose.arms[side];
      const leg = pose.legs[side];
      return [
        Math.min(arm.shoulder[2], arm.elbow[2]) - r.upperArm,
        Math.min(arm.elbow[2], arm.wrist[2]) - r.forearm,
        Math.min(arm.wrist[2], arm.handPatch[2]) - r.hand,
        Math.min(leg.hip[2], leg.knee[2]) - r.thigh,
        Math.min(leg.knee[2], leg.ankle[2]) - r.shin,
        Math.min(leg.ankle[2], leg.heel[2], leg.toe[2]) - r.foot,
        pose.scapularInferiorTips[side][2],
      ];
    }),
  ];
  return Math.min(...clearances);
}

function objectReferences(value: unknown, result = new Set<object>()): Set<object> {
  if (typeof value !== 'object' || value === null || result.has(value)) return result;
  result.add(value);
  Object.values(value).forEach((child) => objectReferences(child, result));
  return result;
}

describe('authored bilateral chest-lift model', () => {
  it('makes proposal/review boundaries explicit and exposes five finite phases with authored hold metadata', () => {
    const pose = getChestLiftPose(0);
    expect(pose).toMatchObject({
      draftId: CHEST_LIFT_DRAFT_ID,
      modelVersion: MODEL_VERSION,
      sideMode: 'bilateral',
      proposalStatus: 'variant-proposal',
      review: { status: 'unreviewed', professionalReviewCount: 0 },
      exactSourceVariantMatched: false,
      sourceVariantReconciliationRequired: true,
      exactAssetReady: false,
      autoRecommendationEligible: false,
    });
    expect(PHASES.map((phase) => phase.id)).toEqual(['setup', 'move', 'turn', 'return', 'finish']);
    expect(PHASES.map((phase) => [phase.start, phase.end])).toEqual([
      [0, 0.12],
      [0.12, 0.42],
      [0.42, 0.58],
      [0.58, 0.88],
      [0.88, 1],
    ]);
    expect(PHASES.map((phase) => phase.displayBehavior)).toEqual([
      'hold',
      'move',
      'hold',
      'move',
      'hold',
    ]);
    for (const phase of PHASES) {
      expect(phase.sample).toBeGreaterThanOrEqual(phase.start);
      expect(phase.sample).toBeLessThanOrEqual(phase.end);
      expect(getChestLiftPose(phase.sample).phase.id).toBe(phase.id);
    }
    expect(getChestLiftPose(1).phaseLabelKo).toBe('마무리');
  });

  it('holds authored geometry on all three hold ranges and closes the finite cycle exactly', () => {
    const rest = geometry(getChestLiftPose(0));
    const lifted = geometry(getChestLiftPose(0.5));
    for (const progress of [0, 0.03, 0.1, 0.12, 0.88, 0.93, 0.99, 1]) {
      expect(geometry(getChestLiftPose(progress))).toEqual(rest);
    }
    for (const progress of [0.42, 0.45, 0.5, 0.55, 0.58]) {
      expect(geometry(getChestLiftPose(progress))).toEqual(lifted);
    }
    const interior = getChestLiftPose(0.27);
    expect(interior.lift).toBeCloseTo(0.5, 14);
    expect(geometry(interior)).not.toEqual(rest);
    expect(geometry(interior)).not.toEqual(lifted);
    expect(interior.head.center[2]).toBeGreaterThan(getChestLiftPose(0).head.center[2]);
    expect(interior.head.center[2]).toBeLessThan(getChestLiftPose(0.5).head.center[2]);
  });

  it('keeps every link and hand closure, reach margin and authored body surface clear across the whole cycle', () => {
    const base = getChestLiftPose(0);
    let maximumLengthError = 0;
    let maximumClosureError = 0;
    let minimumClearance = Number.POSITIVE_INFINITY;
    let minimumReachMargin = Number.POSITIVE_INFINITY;
    let maximumElbowStep = 0;
    let minimumLiftedScapula = Number.POSITIVE_INFINITY;
    let allFinite = true;
    let legsStayFixed = true;
    let rootStaysFixed = true;
    let continuousOutwardBranch = true;
    let previous = base;
    for (let index = 0; index <= 400; index += 1) {
      const pose = getChestLiftPose(index / 400);
      allFinite &&= points(pose).every(
        (point) => point.length === 3 && point.every(Number.isFinite),
      );
      legsStayFixed &&= JSON.stringify(pose.legs) === JSON.stringify(base.legs);
      rootStaysFixed &&=
        JSON.stringify([pose.spine.pelvis, pose.spine.lumbar]) ===
        JSON.stringify([base.spine.pelvis, base.spine.lumbar]);
      minimumClearance = Math.min(minimumClearance, minimumSurfaceHeight(pose));
      for (let segment = 0; segment < CHEST_LIFT_PARAMS.spineLengths.length; segment += 1) {
        maximumLengthError = Math.max(
          maximumLengthError,
          Math.abs(
            distance(pose.spine.points[segment], pose.spine.points[segment + 1]) -
              CHEST_LIFT_PARAMS.spineLengths[segment],
          ),
        );
      }
      maximumLengthError = Math.max(
        maximumLengthError,
        Math.abs(
          distance(pose.spine.occiput, pose.head.center) -
            Math.hypot(...CHEST_LIFT_PARAMS.headOffset),
        ),
      );
      for (const side of sides) {
        const arm = pose.arms[side];
        maximumLengthError = Math.max(
          maximumLengthError,
          Math.abs(distance(arm.shoulder, arm.elbow) - arm.upperLength),
          Math.abs(distance(arm.elbow, arm.wrist) - arm.forearmLength),
          Math.abs(distance(arm.wrist, arm.handPatch) - arm.handLength),
        );
        maximumClosureError = Math.max(
          maximumClosureError,
          distance(arm.handPatch, arm.target),
          distance(arm.target, pose.head.occipitalPatches[side]),
        );
        const reach = distance(arm.shoulder, arm.wrist);
        minimumReachMargin = Math.min(
          minimumReachMargin,
          reach - Math.abs(arm.upperLength - arm.forearmLength),
          arm.upperLength + arm.forearmLength - reach,
        );
        maximumElbowStep = Math.max(
          maximumElbowStep,
          distance(previous.arms[side].elbow, arm.elbow),
        );
        const sign = side === 'left' ? 1 : -1;
        continuousOutwardBranch &&= sign * arm.elbow[1] > sign * arm.shoulder[1];
        if (pose.lift > 0)
          minimumLiftedScapula = Math.min(minimumLiftedScapula, pose.scapularInferiorTips[side][2]);
      }
      previous = pose;
    }
    expect(allFinite).toBe(true);
    expect(legsStayFixed).toBe(true);
    expect(rootStaysFixed).toBe(true);
    expect(continuousOutwardBranch).toBe(true);
    expect(maximumLengthError).toBeLessThan(1e-12);
    expect(maximumClosureError).toBeLessThan(1e-12);
    expect(minimumReachMargin).toBeGreaterThan(CHEST_LIFT_PARAMS.reachMargin);
    expect(minimumClearance).toBeGreaterThanOrEqual(-1e-14);
    expect(minimumLiftedScapula).toBeGreaterThan(0);
    expect(maximumElbowStep).toBeLessThan(0.03);
  });

  it('articulates the upper trunk, cervical link and head independently while keeping head contact patches rigid', () => {
    const base = getChestLiftPose(0);
    const peak = getChestLiftPose(0.5);
    expect(peak.spine.angles[1]).not.toBe(peak.spine.angles[2]);
    expect(peak.head.rotation - peak.spine.angles[4]).not.toBe(
      base.head.rotation - base.spine.angles[4],
    );
    expect(peak.head.rotation).not.toBe(peak.spine.angles[2]);
    for (const progress of [0, 0.2, 0.27, 0.38, 0.5, 0.67, 0.73, 0.83, 1]) {
      const pose = getChestLiftPose(progress);
      for (const side of sides) {
        const local = localHeadPoint(pose.head.occipitalPatches[side], pose);
        const original = localHeadPoint(base.head.occipitalPatches[side], base);
        expect(distance(local, original)).toBeLessThan(1e-12);
        const r = CHEST_LIFT_PARAMS.radii.head;
        expect((local[0] / r.x) ** 2 + (local[1] / r.y) ** 2 + (local[2] / r.z) ** 2).toBeCloseTo(
          1,
          12,
        );
        expect(pose.arms[side].wristRotation).not.toBeNaN();
      }
    }
    expect(peak.spine.upperThorax[2]).toBeGreaterThan(base.spine.upperThorax[2]);
    expect(peak.spine.pelvis).toEqual(base.spine.pelvis);
    expect(peak.spine.lumbar).toEqual(base.spine.lumbar);
  });

  it('releases scapular landmarks with the upper trunk while distinguishing source-named support from authored support geometry', () => {
    const base = getChestLiftPose(0);
    const peak = getChestLiftPose(0.5);
    for (const side of sides) {
      expect(base.scapularInferiorTips[side][2]).toBe(0);
      expect(peak.scapularInferiorTips[side][2]).toBeGreaterThan(0.08);
      expect(base.contacts.find((contact) => contact.id === `${side}-scapula-mat`)?.state).toBe(
        'grounded',
      );
      expect(peak.contacts.find((contact) => contact.id === `${side}-scapula-mat`)?.state).toBe(
        'released',
      );
    }
    for (const pose of [base, peak]) {
      expect(pose.contacts.every((contact) => contact.geometryBasis === 'authored-only')).toBe(
        true,
      );
      expect(
        pose.contacts.filter((contact) => contact.sourceNamedSupport === 'head-hand'),
      ).toHaveLength(2);
      expect(
        pose.contacts.filter((contact) => contact.sourceNamedSupport === 'scapula-mat'),
      ).toHaveLength(2);
      for (const contact of pose.contacts.filter((item) => !item.sourceNamedSupport)) {
        expect(contact.id).toMatch(/authored$/);
        expect(contact.state).toBe('fixed');
        expect(contact.point).toEqual(contact.targetPoint);
      }
    }
  });

  it('keeps paired arms/legs symmetric and treats side and mirror as metadata plus view projection only', () => {
    const pose = getChestLiftPose(0.27);
    for (const activeSide of sides) {
      for (const mirrored of [false, true]) {
        const alternative = getChestLiftPose(0.27, { activeSide, mirrored });
        expect(alternative.activeSide).toBe(activeSide);
        expect(alternative.mirrored).toBe(mirrored);
        expect(geometry(alternative)).toEqual(geometry(pose));
      }
    }
    for (const key of ['shoulder', 'elbow', 'wrist', 'handPatch', 'target'] as const) {
      expect(pose.arms.left[key]).toEqual([
        pose.arms.right[key][0],
        -pose.arms.right[key][1],
        pose.arms.right[key][2],
      ]);
    }
    for (const key of ['hip', 'knee', 'ankle', 'heel', 'toe'] as const) {
      expect(pose.legs.left[key]).toEqual([
        pose.legs.right[key][0],
        -pose.legs.right[key][1],
        pose.legs.right[key][2],
      ]);
    }
    for (const point of points(pose)) {
      const normal = projectChestLiftPoint(point);
      const mirrored = projectChestLiftPoint(point, true);
      expect(mirrored[0]).toBe(CHEST_LIFT_PARAMS.projection.width - normal[0]);
      expect(mirrored[1]).toBe(normal[1]);
      expect(normal.every(Number.isFinite)).toBe(true);
    }
  });

  it('returns fresh deeply frozen poses, projections and parameter trees without shared mutable arrays', () => {
    const first = getChestLiftPose(0.27);
    const next = getChestLiftPose(0.27);
    const firstReferences = objectReferences(first);
    const nextReferences = objectReferences(next);
    expect([...firstReferences].every((value) => Object.isFrozen(value))).toBe(true);
    expect([...objectReferences(CHEST_LIFT_PARAMS)].every((value) => Object.isFrozen(value))).toBe(
      true,
    );
    expect([...objectReferences(PHASES)].every((value) => Object.isFrozen(value))).toBe(true);
    expect([...firstReferences].some((value) => nextReferences.has(value))).toBe(false);
    expect(first.spine.pelvis).not.toBe(first.spine.points[0]);
    expect(first.arms.left.target).not.toBe(first.head.occipitalPatches.left);
    expect(first.phase).not.toBe(PHASES[1]);
    expect(Reflect.set(first.head.center, '0', 999)).toBe(false);
    expect(first).toEqual(next);
    const a = projectChestLiftPoint(first.head.center);
    const b = projectChestLiftPoint(first.head.center);
    expect(Object.isFrozen(a)).toBe(true);
    expect(a).not.toBe(b);
  });

  it('clamps only finite progress and rejects invalid runtime inputs without inventing a pose', () => {
    expect(getChestLiftPose(-100)).toEqual(getChestLiftPose(0));
    expect(getChestLiftPose(100)).toEqual(getChestLiftPose(1));
    for (const progress of [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      '0',
      null,
    ]) {
      expect(() => getChestLiftPose(progress as number)).toThrow(RangeError);
    }
    for (const options of [
      null,
      [],
      { activeSide: 'screen-left' },
      { activeSide: null },
      { mirrored: 'false' },
      { mirrored: null },
    ]) {
      expect(() => getChestLiftPose(0, options as unknown as ChestLiftOptions)).toThrow(TypeError);
    }
    const invalidPoints = [
      [0, 0],
      [0, 0, 0, 0],
      [0, Number.NaN, 0],
      [0, Number.POSITIVE_INFINITY, 0],
      Object.assign(new Array<number>(3), { 0: 0, 2: 0 }),
      null,
    ];
    for (const point of invalidPoints) {
      expect(() => projectChestLiftPoint(point as unknown as Point3)).toThrow(RangeError);
    }
    expect(() => projectChestLiftPoint([0, 0, 0], 'true' as unknown as boolean)).toThrow(TypeError);
    expect(getChestLiftPose(0).activeSide).toBe('right' satisfies AnatomicalSide);
  });
});
