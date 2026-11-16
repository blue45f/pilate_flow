import { describe, expect, it } from 'vitest';
import { getCatalogContinuousMotionAsset } from '../data/catalogMotionAssets';
import { getExpandedMovementVisualBinding } from '../data/expandedMovementVisualBindings';
import { getMovementVisualAsset } from '../data/movementVisualRigCatalog';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { resolveRigHeadFrame } from './motionRigGeometry';
import { getPractitionerFootTargets, getPractitionerTorsoRows, mapSpriteTriangle, PRACTITIONER_FOOT_ANCHORS } from './generatedPractitionerArt';

describe('stable practitioner geometry', () => {
  it('keeps the face on the same anatomical side when wrists and toes cross the previous heuristic thresholds', () => {
    const setup = getMovementVisualAsset('ex-core-01')!.phases.start.joints;
    const baseline = resolveRigHeadFrame(setup, setup);
    for (const offset of [-100, -10, 0, 10, 100]) {
      const pose = { ...setup, wrist: { ...setup.wrist, y: setup.shoulder.y + offset }, toe: { ...setup.toe, y: setup.heel.y + offset } };
      expect(resolveRigHeadFrame(pose, setup)).toEqual(baseline);
    }
  });

  it('has no abrupt face reversal across all 98 continuous authored motion cycles', () => {
    const native = INITIAL_EXERCISES.filter((exercise) => getExpandedMovementVisualBinding(exercise)?.nativeMotionAvailable !== false);
    expect(native).toHaveLength(98);
    for (const exercise of native) {
      const motion = getCatalogContinuousMotionAsset(exercise)!;
      const setup = motion.visualAsset.phases.start.joints;
      let previous = resolveRigHeadFrame(motion.samplePose(0).joints, setup).faceAxis;
      for (let sample = 1; sample <= 1000; sample++) {
        const frame = resolveRigHeadFrame(motion.samplePose(sample / 1000).joints, setup);
        expect(frame.faceAxis.x * previous.x + frame.faceAxis.y * previous.y, `${exercise.id} at ${sample}`).toBeGreaterThan(0.9);
        previous = frame.faceAxis;
      }
    }
  }, 15000);

  it('uses a finite setup orientation if an incoming head axis degenerates', () => {
    const setup = getMovementVisualAsset('ex-core-01')!.phases.start.joints;
    expect(resolveRigHeadFrame({ ...setup, head: setup.neck }, setup)).toEqual(resolveRigHeadFrame(setup, setup));
  });

  it('maps all three cloth triangle vertices to their intended transformed locations', () => {
    const source = [{ x: 20, y: 30 }, { x: 80, y: 30 }, { x: 20, y: 90 }];
    const target = [{ x: 105, y: 45 }, { x: 134, y: 52 }, { x: 98, y: 81 }];
    const transform = mapSpriteTriangle(source, target);
    const [a,b,c,d,e,f] = transform.slice(7, -1).split(' ').map(Number);
    for (let index = 0; index < 3; index++) {
      expect(a * source[index].x + c * source[index].y + e).toBeCloseTo(target[index].x, 3);
      expect(b * source[index].x + d * source[index].y + f).toBeCloseTo(target[index].y, 3);
    }
  });

  it('assigns cloth by setup arc length and keeps those material positions through a spine curl', () => {
    const setup = [{ x: 0, y: 0 }, { x: 0, y: 10 }, { x: 0, y: 50 }, { x: 0, y: 100 }];
    const curled = [{ x: 0, y: 0 }, { x: 7, y: 9 }, { x: 25, y: 38 }, { x: 8, y: 70 }];
    const rest = getPractitionerTorsoRows(setup, setup, 28, 1);
    const pose = getPractitionerTorsoRows(curled, setup, 28, 1);
    expect(rest[4].textureV).toBeCloseTo(0.1, 5);
    expect(rest[8].textureV).toBeCloseTo(0.5, 5);
    expect(rest[0].textureV).toBe(0);
    expect(rest.at(-1)!.textureV).toBe(1);
    expect(pose.map((row) => row.textureV)).toEqual(rest.map((row) => row.textureV));
    const flipped = getPractitionerTorsoRows(curled, setup, 28, -1);
    for (let index = 0; index < pose.length; index++) {
      const row = pose[index];
      expect(Math.hypot(row.right.x - row.left.x, row.right.y - row.left.y)).toBeCloseTo(28, 5);
      expect(flipped[index].left).toEqual(row.right);
      expect(flipped[index].right).toEqual(row.left);
    }
    const tapered = getPractitionerTorsoRows(curled, setup, 28, 1, 14);
    const widths = tapered.map((row) => Math.hypot(row.right.x - row.left.x, row.right.y - row.left.y));
    expect(tapered.map((row) => row.textureV)).toEqual(rest.map((row) => row.textureV));
    expect(widths[0]).toBeCloseTo(28, 5);
    expect(widths.at(-1)).toBeCloseTo(14, 5);
    for (let index = 0; index < tapered.length; index++) {
      if (tapered[index].textureV <= 0.82) expect(widths[index]).toBeCloseTo(28, 5);
      if (index > 0) expect(widths[index]).toBeLessThanOrEqual(widths[index - 1] + 0.00001);
    }
  });

  it('keeps the sock sole planted without collapsing its cuff when the ankle approaches the contact line', () => {
    const heel = { x: 252, y: 148 }, toe = { x: 274, y: 148 };
    const setupAnkle = { x: 258, y: 146 };
    for (const ankleY of [146, 147.9, 148, 148.1]) {
      const targets = getPractitionerFootTargets({ x: 258, y: ankleY }, heel, toe, setupAnkle, heel, toe, 1);
      expect(targets[0].y).toBeCloseTo(142.5, 5);
      expect(targets[1]).toEqual(heel);
      expect(targets[2]).toEqual(toe);
      const [a, b, c, d, e, f] = mapSpriteTriangle(PRACTITIONER_FOOT_ANCHORS, targets).slice(7, -1).split(' ').map(Number);
      for (const index of [1, 2]) {
        const source = PRACTITIONER_FOOT_ANCHORS[index];
        expect(a * source.x + c * source.y + e).toBeCloseTo(targets[index].x, 2);
        expect(b * source.x + d * source.y + f).toBeCloseTo(targets[index].y, 2);
      }
    }
  });
});
