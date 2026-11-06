import { describe, expect, it } from 'vitest';
import {
  clampMotionProgress,
  getMotionEnvelope,
  getMotionPhase,
  getMotionPose,
  MODEL_VERSION,
  SEGMENT_LENGTHS,
  solveMotionKnee,
  VIEW,
} from './motionReferenceModel';
import type { AnatomicalSide, MotionPoint, MotionPrototypeId } from './motionReferenceModel';

const prototypes: MotionPrototypeId[] = ['bridge-pattern', 'heel-slide'];
const sides: AnatomicalSide[] = ['left', 'right'];
// 1,001 progress values × two prototypes × two anatomical sides = 4,004 poses.
const samples = Array.from({ length: 1001 }, (_, index) => index / 1000);
const distance = (a: MotionPoint, b: MotionPoint) => Math.hypot(a.x - b.x, a.y - b.y);
const samePoint = (a: MotionPoint, b: MotionPoint) => a.x === b.x && a.y === b.y;
const expectPoint = (actual: MotionPoint, expected: MotionPoint) => {
  expect(actual.x).toBeCloseTo(expected.x, 10);
  expect(actual.y).toBeCloseTo(expected.y, 10);
};

describe('original lab motion geometry', () => {
  it('retains the original model version, view and segment constants', () => {
    expect(MODEL_VERSION).toBe('0.1.0-draft');
    expect(VIEW).toEqual({ id: 'left-lateral', nearAnatomicalSide: 'left', mirrored: false });
    expect(SEGMENT_LENGTHS).toEqual({ thigh: 86, shin: 88, torso: 108 });
    expect(Object.isFrozen(VIEW)).toBe(true);
    expect(Object.isFrozen(SEGMENT_LENGTHS)).toBe(true);
  });

  it('preserves phase boundaries, envelope plateaus and finite clamping', () => {
    expect(clampMotionProgress(-4)).toBe(0);
    expect(clampMotionProgress(4)).toBe(1);
    expect(clampMotionProgress(0.37)).toBe(0.37);
    const phases = [
      [0, 'setup'],
      [0.149999, 'setup'],
      [0.15, 'move'],
      [0.479999, 'move'],
      [0.48, 'turn'],
      [0.579999, 'turn'],
      [0.58, 'return'],
      [0.919999, 'return'],
      [0.92, 'finish'],
      [1, 'finish'],
    ] as const;
    for (const [progress, phase] of phases) expect(getMotionPhase(progress).id).toBe(phase);
    for (const progress of [0, 0.15, 0.92, 1]) expect(getMotionEnvelope(progress)).toBe(0);
    for (const progress of [0.48, 0.53, 0.58]) expect(getMotionEnvelope(progress)).toBe(1);
    expect(getMotionEnvelope(0.315)).toBeCloseTo(0.5, 14);
    expect(getMotionEnvelope(0.75)).toBeCloseTo(0.5, 14);
  });

  it.each(prototypes)('keeps every sampled %s joint finite and each segment length fixed', (id) => {
    const failures: string[] = [];
    for (const side of sides) {
      for (const progress of samples) {
        const pose = getMotionPose(id, progress, side);
        const points = [
          ...Object.values(pose.joints),
          ...sides.flatMap((legSide) => {
            const leg = pose.legs[legSide];
            return [leg.hip, leg.knee, leg.ankle, leg.heel, leg.toe];
          }),
        ];
        if (points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y)))
          failures.push(`${side}/${progress}: nonfinite joint`);
        if (Math.abs(distance(pose.joints.shoulder, pose.joints.hip) - SEGMENT_LENGTHS.torso) > 1e-10)
          failures.push(`${side}/${progress}: torso length`);
        for (const legSide of sides) {
          const leg = pose.legs[legSide];
          if (Math.abs(distance(leg.hip, leg.knee) - SEGMENT_LENGTHS.thigh) > 1e-10)
            failures.push(`${side}/${progress}/${legSide}: thigh length`);
          if (Math.abs(distance(leg.knee, leg.ankle) - SEGMENT_LENGTHS.shin) > 1e-10)
            failures.push(`${side}/${progress}/${legSide}: shin length`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it('holds bridge head, shoulder and feet contacts while raising the pelvis', () => {
    const initial = getMotionPose('bridge-pattern', 0);
    const failures: string[] = [];
    for (const progress of samples) {
      const pose = getMotionPose('bridge-pattern', progress);
      if (
        !samePoint(pose.joints.head, initial.joints.head) ||
        !samePoint(pose.joints.neck, initial.joints.neck) ||
        !samePoint(pose.joints.shoulder, initial.joints.shoulder)
      ) failures.push(`${progress}: head/neck/shoulder contact`);
      for (const side of sides) {
        if (
          !samePoint(pose.legs[side].ankle, initial.legs[side].ankle) ||
          !samePoint(pose.legs[side].heel, initial.legs[side].heel) ||
          !samePoint(pose.legs[side].toe, initial.legs[side].toe) ||
          !pose.legs[side].active
        ) failures.push(`${progress}/${side}: foot contact or bilateral activity`);
      }
    }
    expect(failures).toEqual([]);
    const peak = getMotionPose('bridge-pattern', 0.53);
    expect(peak.joints.hip.y).toBeLessThan(initial.joints.hip.y);
    const torso = {
      x: peak.joints.hip.x - peak.joints.shoulder.x,
      y: peak.joints.hip.y - peak.joints.shoulder.y,
    };
    const thigh = {
      x: peak.legs.left.knee.x - peak.joints.hip.x,
      y: peak.legs.left.knee.y - peak.joints.hip.y,
    };
    expect(torso.x * thigh.y - torso.y * thigh.x).toBeCloseTo(0, 8);
  });

  it.each(sides)('moves only the anatomical %s heel with a fixed pelvis and opposite leg', (side) => {
    const opposite = side === 'left' ? 'right' : 'left';
    const initial = getMotionPose('heel-slide', 0, side);
    const failures: string[] = [];
    for (const progress of samples) {
      const pose = getMotionPose('heel-slide', progress, side);
      if (JSON.stringify(pose.joints) !== JSON.stringify(initial.joints))
        failures.push(`${progress}: pelvis/head/shoulder changed`);
      if (JSON.stringify(pose.legs[opposite]) !== JSON.stringify(initial.legs[opposite]))
        failures.push(`${progress}: opposite leg changed`);
      if (!samePoint(pose.legs[side].hip, initial.legs[side].hip))
        failures.push(`${progress}: active hip changed`);
      if (pose.legs[side].heel.y !== 210 || pose.legs[side].toe.y !== 210)
        failures.push(`${progress}: foot left contact plane`);
      if (Math.abs(pose.legs[side].heel.x - initial.legs[side].heel.x - 40 * pose.q) > 1e-10)
        failures.push(`${progress}: heel travel differs from envelope`);
      if (!pose.legs[side].active || pose.legs[opposite].active)
        failures.push(`${progress}: wrong active anatomical side`);
      if (pose.view.nearAnatomicalSide !== 'left' || pose.view.mirrored)
        failures.push(`${progress}: view changed`);
    }
    expect(failures).toEqual([]);
    expect(getMotionPose('heel-slide', 0.53, side).legs[side].heel.x).toBe(
      initial.legs[side].heel.x + 40,
    );
  });

  it.each(prototypes)('returns %s to the same geometry at the end and clamps outside progress', (id) => {
    for (const side of sides) {
      const start = getMotionPose(id, 0, side);
      const finish = getMotionPose(id, 1, side);
      expect(finish.joints).toEqual(start.joints);
      expect(finish.legs).toEqual(start.legs);
      expect(start.q).toBe(0);
      expect(finish.q).toBe(0);
      expect(start.phase.id).toBe('setup');
      expect(finish.phase.id).toBe('finish');
      expect(getMotionPose(id, -2, side)).toEqual(start);
      expect(getMotionPose(id, 2, side)).toEqual(finish);
    }
  });

  it('matches representative coordinates captured directly from the verified original source', () => {
    // Golden coordinates from motion-model.mjs, not a second implementation of the solver.
    const bridgePeak = getMotionPose('bridge-pattern', 0.53, 'left');
    expectPoint(bridgePeak.joints.hip, { x: 268.0530069905921, y: 162.65620614339542 });
    expectPoint(bridgePeak.legs.left.knee, { x: 349.31743848310066, y: 134.5120739983214 });
    expectPoint(bridgePeak.legs.right.knee, { x: 350.10959085790137, y: 129.912914900292 });
    const bridgeHalf = getMotionPose('bridge-pattern', 0.315, 'right');
    expectPoint(bridgeHalf.joints.hip, { x: 272.50287497289435, y: 180.07968687472157 });
    expectPoint(bridgeHalf.legs.left.knee, { x: 346.68002117364796, y: 136.5624376336214 });
    const leftPeak = getMotionPose('heel-slide', 0.53, 'left');
    expectPoint(leftPeak.legs.left.knee, { x: 357.8975999944473, y: 179.10045727612138 });
    expect(leftPeak.legs.left.ankle).toEqual({ x: 442, y: 205 });
    const rightReturn = getMotionPose('heel-slide', 0.75, 'right');
    expectPoint(rightReturn.legs.right.knee, { x: 348.6711085826823, y: 148.3358986613655 });
    expect(rightReturn.legs.right.ankle).toEqual({ x: 416, y: 205 });
  });

  it('rejects unreachable and nonfinite targets instead of concealing them with clamping', () => {
    const hip = { x: 0, y: 0 };
    for (const ankle of [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 175, y: 0 }])
      expect(() => solveMotionKnee(hip, ankle)).toThrow('Unreachable leg target');
    expect(() => solveMotionKnee(hip, { x: NaN, y: 0 })).toThrow(RangeError);
    expect(() => solveMotionKnee(hip, { x: 100, y: 0 }, -86, 88)).toThrow(RangeError);
    expect(() => solveMotionKnee(hip, { x: 100, y: 0 }, 86, Infinity)).toThrow(RangeError);
    const upperBranch = solveMotionKnee(hip, { x: 100, y: 0 });
    expect(upperBranch.y).toBeLessThan(0);
    expect(distance(hip, upperBranch)).toBeCloseTo(86, 10);
    expect(distance(upperBranch, { x: 100, y: 0 })).toBeCloseTo(88, 10);
  });

  it('fails closed for unknown prototype, side and nonfinite progress inputs', () => {
    for (const id of ['roll-up', 'constructor', '', null, undefined])
      expect(() => getMotionPose(id as MotionPrototypeId, 0.5)).toThrow('Unknown clip');
    for (const side of ['front', 'LEFT', '', null])
      expect(() => getMotionPose('heel-slide', 0.5, side as AnatomicalSide)).toThrow(
        'Unknown anatomical side',
      );
    for (const progress of [NaN, Infinity, -Infinity, '0.5', null, undefined]) {
      const bad = progress as number;
      expect(() => clampMotionProgress(bad)).toThrow('Motion progress must be finite');
      expect(() => getMotionEnvelope(bad)).toThrow(RangeError);
      expect(() => getMotionPhase(bad)).toThrow(RangeError);
      for (const id of prototypes) expect(() => getMotionPose(id, bad)).toThrow(RangeError);
    }
  });

  it('returns independent deterministic poses without allowing one render to corrupt another', () => {
    const first = getMotionPose('heel-slide', 0.53);
    const before = structuredClone(first);
    Reflect.set(first.legs.left.ankle, 'x', -999);
    Reflect.set(first.joints.hip, 'y', -999);
    const next = getMotionPose('heel-slide', 0.53);
    expect(next).toEqual(before);
    expect(next.joints).not.toBe(first.joints);
    expect(next.legs.left).not.toBe(first.legs.left);
    expect(next.legs.left.knee).not.toBe(first.legs.left.knee);
    expect(Reflect.set(VIEW, 'mirrored', true)).toBe(false);
    expect(next.view.mirrored).toBe(false);
  });
});
