import { describe, expect, it } from 'vitest';
import { getCatalogContinuousMotionAsset } from '../data/catalogMotionAssets';
import { getExpandedMovementVisualBinding } from '../data/expandedMovementVisualBindings';
import { getMovementVisualAsset } from '../data/movementVisualRigCatalog';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { resolveRigHeadFrame } from './motionRigGeometry';
import { mapSpriteTriangle } from './generatedPractitionerArt';

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
});
