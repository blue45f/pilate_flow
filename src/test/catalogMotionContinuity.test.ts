import { describe, expect, it } from 'vitest';
import { getCatalogContinuousMotionAsset } from '../data/catalogMotionAssets';
import { getExpandedMovementVisualBinding } from '../data/expandedMovementVisualBindings';
import { getMovementVisualAsset, type Point2D, type RigJointMap } from '../data/movementVisualRigCatalog';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { normalizeRigJointMap } from '../utils/motionRigGeometry';

const nativeMotions = INITIAL_EXERCISES
  .filter((exercise) => getExpandedMovementVisualBinding(exercise)?.nativeMotionAvailable !== false)
  .map((exercise) => getCatalogContinuousMotionAsset(exercise)!);

const farChain = [
  'farShoulder', 'farElbow', 'farWrist', 'farHand',
  'farHip', 'farKnee', 'farAnkle', 'farHeel', 'farToe',
] as const;

const distance = (a: Point2D, b: Point2D) => Math.hypot(a.x - b.x, a.y - b.y);

function largestTravel(a: RigJointMap, b: RigJointMap): number {
  return Math.max(...Object.entries(a).map(([key, point]) => {
    const other = b[key as keyof RigJointMap];
    return other ? distance(point, other) : Number.POSITIVE_INFINITY;
  }));
}

describe('catalog motion continuity and explicit cycle completion', () => {
  it('preserves partial authored far-side contacts when their shoulder or hip was omitted', () => {
    const raw = getMovementVisualAsset('original-mat-quadruped-reach')!;
    const partial = raw.phases.middle.joints;
    expect(partial.farWrist).toBeDefined();
    const complete = normalizeRigJointMap(partial, raw.phases.start.joints);
    for (const [key, point] of Object.entries(partial)) {
      expect(complete[key as keyof RigJointMap], key).toEqual(point);
    }
    for (const key of farChain) expect(complete[key], key).toBeDefined();

    const motion = getCatalogContinuousMotionAsset(raw.exerciseId)!;
    for (let index = 0; index <= 100; index += 1) {
      const pose = motion.samplePose(index / 100).joints;
      expect(pose.farWrist, `planted wrist at ${index}`).toEqual(raw.phases.start.joints.farWrist);
    }
  });

  it('retains both complete limb chains and stays continuous at every native keyframe and loop boundary', () => {
    expect(nativeMotions).toHaveLength(98);
    for (const motion of nativeMotions) {
      const expectedKeys = Object.keys(motion.samplePose(0).joints).sort();
      for (const frame of motion.keyframes) {
        const before = motion.samplePose(Math.max(0, frame.progress - 0.0001));
        const exact = motion.samplePose(frame.progress);
        const after = motion.samplePose(frame.progress === 1 ? 0 : frame.progress + 0.0001);
        for (const pose of [before, exact, after]) {
          expect(Object.keys(pose.joints).sort(), `${motion.exerciseId} ${frame.id}`).toEqual(expectedKeys);
          for (const key of farChain) expect(pose.joints[key], key).toBeDefined();
          for (const point of Object.values(pose.joints)) {
            expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(true);
          }
        }
        // Coordinates are rounded to tenths in the drawing sampler.
        expect(largestTravel(before.joints, after.joints), `${motion.exerciseId} ${frame.id}`)
          .toBeLessThan(0.3);
      }
      expect(motion.samplePose(1).joints, motion.exerciseId).toEqual(motion.samplePose(0).joints);
    }
  });

  it('does not flip an IK bend branch inside a phase, including clam and long-stretch projections', () => {
    for (const motion of nativeMotions) {
      let previous = motion.samplePose(0).joints;
      let largestFrameChange = 0;
      for (let index = 1; index <= 1000; index += 1) {
        const next = motion.samplePose(index / 1000).joints;
        largestFrameChange = Math.max(largestFrameChange, largestTravel(previous, next));
        previous = next;
      }
      // The old branch flip moved the clam knee 46.8 drawing units in one step.
      expect(largestFrameChange, motion.exerciseId).toBeLessThan(3);
    }
  });

  it('keeps the far foot local to its own ankle when the near knee is lifted', () => {
    for (const id of ['original-mat-knee-fold', 'original-cadillac-table-knee-fold', 'original-mat-side-leg-lift']) {
      const motion = getCatalogContinuousMotionAsset(id)!;
      const setup = motion.samplePose(0).joints;
      const setupFootLength = distance(setup.farAnkle!, setup.farToe!);
      for (let index = 0; index <= 100; index += 1) {
        const pose = motion.samplePose(index / 100).joints;
        expect(distance(pose.farAnkle!, pose.farToe!), `${id} at ${index}`)
          .toBeLessThan(setupFootLength + 1);
        expect(distance(pose.farAnkle!, pose.farHeel!), `${id} heel at ${index}`)
          .toBeLessThan(20);
      }
    }
  });

  it('preserves the authored final pose and gives large resets their own visible time', () => {
    for (const id of ['original-cadillac-seated-roll-back', 'original-barrel-seated-spine-reach']) {
      const motion = getCatalogContinuousMotionAsset(id)!;
      const end = motion.samplePose(motion.authoredEndProgress).joints;
      const start = motion.samplePose(0).joints;
      expect(end).toEqual(motion.visualAsset.phases.end.joints);
      expect(largestTravel(end, start)).toBeGreaterThan(40);
      expect(motion.endPoseLabelKo).toBe('마무리 자세');
      expect(motion.finishBehavior).toBe('return-to-setup');
      expect(motion.durationMs * (1 - motion.authoredEndProgress)).toBeGreaterThanOrEqual(2000);
      const between = motion.samplePose((motion.authoredEndProgress + 1) / 2).joints;
      expect(largestTravel(between, start)).toBeGreaterThan(10);
      expect(largestTravel(between, end)).toBeGreaterThan(10);
      expect(motion.samplePose(1).joints).toEqual(start);
    }
    expect(new Set(nativeMotions.map((motion) => motion.durationMs)).size).toBeGreaterThan(2);
    for (const motion of nativeMotions) {
      expect(motion.previewTimingOnly).toBe(true);
      expect(motion.anatomicalAccuracyAssumed).toBe(false);
      expect(motion.professionalReviewCount).toBe(0);
    }
  });

  it('adds an explicit opposite knee lift and a central exchange pose before closing the cycle', () => {
    for (const id of ['original-mat-knee-fold', 'original-cadillac-table-knee-fold']) {
      const motion = getCatalogContinuousMotionAsset(id)!;
      const opposite = motion.keyframes.find((frame) => frame.id === 'opposite-lift')!;
      expect(opposite.provenance).toBe('procedural-transition');
      expect(motion.finishBehavior).toBe('alternate-side');
      const setup = motion.samplePose(0).joints;
      const pose = motion.samplePose(opposite.progress).joints;
      for (const key of ['ankle', 'heel', 'toe', 'pelvis', 'thoracic', 'head'] as const) {
        expect(pose[key], `${id} supports ${key}`).toEqual(setup[key]);
      }
      expect(distance(pose.farAnkle!, setup.farAnkle!)).toBeGreaterThan(25);
      expect(motion.samplePose(1).joints).toEqual(setup);
    }

    const stretch = getCatalogContinuousMotionAsset('original-mat-single-leg-stretch')!;
    const exchange = stretch.keyframes.find((frame) => frame.id === 'exchange-middle')!;
    expect(exchange.progress).toBeGreaterThan(stretch.authoredEndProgress);
    expect(stretch.samplePose(exchange.progress).joints).toEqual(stretch.visualAsset.phases.middle.joints);
  });
});
