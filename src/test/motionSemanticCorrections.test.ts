import { describe, expect, it } from 'vitest';
import { getCatalogContinuousMotionAsset } from '../data/catalogMotionAssets';
import { resolveCoreAbdominalDiagramId } from '../data/coreAbdominalDiagrams';
import { getMovementVisualAsset } from '../data/movementVisualRigCatalog';
import { resolveSpineArticulationDiagramByExerciseId } from '../data/spineArticulationDiagramData';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { getShoulderSupportRegistryIntegrationPayload } from '../data/shoulderSupportDiagrams';
import { resolveChairPedalTip } from '../utils/motionRigGeometry';
import type { Point2D, RigJointMap } from '../data/movementVisualRigCatalog';

const poseDistance = (a: Point2D, b: Point2D) => Math.hypot(a.x - b.x, a.y - b.y);

function sampledJoints(id: string): RigJointMap[] {
  const exercise = INITIAL_EXERCISES.find((item) => item.id === id)!;
  const motion = getCatalogContinuousMotionAsset(exercise)!;
  return Array.from({ length: 51 }, (_, index) => motion.samplePose(index / 50).joints);
}

describe('exercise-specific illustration semantics', () => {
  it('keeps a chest lift supported on the mat, with a small chest curl instead of a full roll-up', () => {
    const asset = getMovementVisualAsset('original-mat-chest-lift')!;
    const { start, middle, end } = asset.phases;
    expect(resolveSpineArticulationDiagramByExerciseId('original-mat-chest-lift')).toBeNull();
    expect(asset.archetypeId).toBe('mat-chest-lift-supported-head');
    for (const key of ['lumbar', 'pelvis', 'hip', 'knee', 'ankle', 'heel', 'toe'] as const) {
      expect(middle.joints[key], key).toEqual(start.joints[key]);
      expect(end.joints[key], key).toEqual(start.joints[key]);
    }
    expect(middle.joints.head.y).toBeLessThan(start.joints.head.y);
    expect(middle.joints.shoulder.y).toBeLessThan(start.joints.shoulder.y);
    expect(middle.joints.thoracic.y).toBeGreaterThan(middle.joints.shoulder.y);
    expect(middle.joints.head.x).toBeLessThan(middle.joints.hip.x);
    for (const phase of [start, middle, end]) {
      expect(
        Math.hypot(
          phase.joints.hand.x - phase.joints.head.x,
          phase.joints.hand.y - phase.joints.head.y,
        ),
      ).toBeLessThan(20);
    }
    expect(end.joints).toEqual(start.joints);

    const motion = getCatalogContinuousMotionAsset(
      INITIAL_EXERCISES.find((item) => item.id === asset.exerciseId)!,
    )!;
    for (const progress of [0, 0.13, 0.29, 0.5, 0.72, 0.91, 1]) {
      const frame = motion.samplePose(progress);
      expect(frame.joints.pelvis).toEqual(start.joints.pelvis);
      expect(frame.joints.heel).toEqual(start.joints.heel);
    }
  });

  it('keeps seated short-box abs separate from the supine single-leg-stretch model', () => {
    expect(resolveCoreAbdominalDiagramId('ex-core-02')).toBeNull();
    const shortBox = getMovementVisualAsset('ex-core-02')!;
    const stretch = getMovementVisualAsset('ex-core-03')!;
    expect(shortBox.archetypeId).not.toBe('core-single-leg-stretch');
    expect(shortBox.phases.middle.joints).not.toEqual(stretch.phases.middle.joints);
    for (const phase of Object.values(shortBox.phases)) {
      // Renderer box spans x=96..184 with its top at y=123. The hip marker
      // sits slightly above that surface to account for the body silhouette.
      expect(phase.joints.pelvis.x).toBeGreaterThan(96);
      expect(phase.joints.pelvis.x).toBeLessThan(184);
      expect(phase.joints.pelvis.y).toBeGreaterThanOrEqual(110);
      expect(phase.joints.pelvis.y).toBeLessThan(123);
    }
    for (const joints of sampledJoints(shortBox.exerciseId)) {
      expect(joints.pelvis).toEqual(shortBox.phases.start.joints.pelvis);
      expect(joints.ankle).toEqual(shortBox.phases.start.joints.ankle);
      expect(joints.farAnkle).toEqual(shortBox.phases.start.joints.farAnkle);
    }
  });

  it('keeps standing roll-down out of the seated spine roll-back override', () => {
    const standing = getMovementVisualAsset('ex-cooldown-02')!;
    const seated = getMovementVisualAsset('original-cadillac-seated-roll-back')!;
    expect(resolveSpineArticulationDiagramByExerciseId(standing.exerciseId)).toBeNull();
    expect(standing.phases.start.joints).not.toEqual(seated.phases.start.joints);
    expect(standing.phases.end.joints).toEqual(standing.phases.start.joints);
    expect(standing.phases.middle.joints.head.y).toBeGreaterThan(standing.phases.start.joints.head.y + 50);
    for (const joints of sampledJoints(standing.exerciseId)) {
      expect(joints.hip.y).toBeLessThan(joints.knee.y);
      expect(joints.knee.y).toBeLessThan(joints.ankle.y);
      for (const key of ['heel', 'toe', 'farHeel', 'farToe'] as const) {
        expect(joints[key], key).toEqual(standing.phases.start.joints[key]);
      }
    }
  });

  it('uses elbows, forearms and knees throughout the kneeling plank instead of a hand push-up', () => {
    const asset = getMovementVisualAsset('original-mat-forearm-plank')!;
    expect(getShoulderSupportRegistryIntegrationPayload().assets[asset.exerciseId]).toBeUndefined();
    expect(asset.archetypeId).toBe('mat-kneeling-forearm-support');
    for (const joints of sampledJoints(asset.exerciseId)) {
      for (const key of ['elbow', 'wrist', 'knee', 'farElbow', 'farWrist', 'farKnee'] as const) {
        expect(joints[key]!.y, key).toBeGreaterThanOrEqual(140);
        expect(joints[key]!.y, key).toBeLessThanOrEqual(147.5);
        expect(poseDistance(joints[key]!, asset.phases.start.joints[key]!), key).toBeLessThan(0.2);
      }
      expect(joints.shoulder.y).toBeLessThan(joints.elbow.y - 20);
      expect(Math.abs(joints.wrist.y - joints.elbow.y)).toBeLessThan(2);
    }
  });

  it('keeps fixed-seat support on the seat and floor without using the moving chair pedal', () => {
    const asset = getMovementVisualAsset('original-chair-incline-support')!;
    const motion = getCatalogContinuousMotionAsset(INITIAL_EXERCISES.find((item) => item.id === asset.exerciseId)!)!;
    expect(asset.archetypeId).not.toBe(getMovementVisualAsset('ex-plank-02')!.archetypeId);
    for (let i = 0; i <= 50; i += 1) {
      const frame = motion.samplePose(i / 50);
      expect(frame.interpolatedPhaseSpec.apparatusState.pedalAngleDeg).toBe(0);
      expect(frame.joints.hand.y).toBe(106);
      expect(frame.joints.farHand!.y).toBe(105);
      expect(frame.joints.toe.y).toBe(176);
      expect(frame.joints.farToe!.y).toBe(176);
      expect(frame.joints.toe.x).toBeGreaterThan(240);
      expect(frame.joints.pelvis.y).toBeGreaterThan(90);
    }
  });

  it('keeps one hand on the barrel ladder and both heels grounded while the other arm reaches', () => {
    const asset = getMovementVisualAsset('original-barrel-supported-arm-reach')!;
    const { start, middle } = asset.phases;
    expect(poseDistance(start.joints.hand, middle.joints.hand)).toBeGreaterThan(35);
    for (const joints of sampledJoints(asset.exerciseId)) {
      expect(joints.farHand).toEqual({ x: 84, y: 85 });
      expect(joints.farWrist).toEqual({ x: 86, y: 85 });
      expect(joints.heel.y).toBe(176);
      expect(joints.farHeel!.y).toBe(176);
      expect(joints.pelvis).toEqual(start.joints.pelvis);
    }
  });

  it('keeps the side-lying press foot on the bar while its supported body follows the carriage', () => {
    const asset = getMovementVisualAsset('original-reformer-side-lying-press')!;
    const motion = getCatalogContinuousMotionAsset(INITIAL_EXERCISES.find((item) => item.id === asset.exerciseId)!)!;
    expect(asset.archetypeId).not.toBe(getMovementVisualAsset('ex-lower-04')!.archetypeId);
    for (let i = 0; i <= 50; i += 1) {
      const frame = motion.samplePose(i / 50);
      expect(frame.joints.heel).toEqual({ x: 266, y: 126 });
      expect(frame.joints.toe).toEqual(asset.phases.start.joints.toe);
      for (const key of ['head', 'pelvis', 'hip'] as const) {
        const shift = frame.joints[key].x - asset.phases.start.joints[key].x;
        expect(Math.abs(shift + frame.interpolatedPhaseSpec.apparatusState.carriageOffsetPx), key).toBeLessThan(0.2);
      }
    }
  });

  it.each(['ex-upper-01', 'ex-kr-reformer-03', 'ex-global-reformer-03'])(
    'keeps %s knees and shins above the reformer carriage top instead of under the frame',
    (id) => {
      const asset = getMovementVisualAsset(id)!;
      for (const joints of sampledJoints(id)) {
        for (const key of ['knee', 'ankle', 'farKnee', 'farAnkle', 'toe', 'farToe'] as const) {
          expect(joints[key]!.y, key).toBeLessThanOrEqual(142);
          expect(joints[key]!.x, key).toBeGreaterThanOrEqual(38);
          expect(joints[key]!.x, key).toBeLessThanOrEqual(216);
          expect(joints[key], key).toEqual(asset.phases.start.joints[key]);
        }
      }
    },
  );

  it('keeps the step-up front sole on the seat and opposite forefoot on the exact rotating pedal', () => {
    const exercise = INITIAL_EXERCISES.find((item) => item.id === 'ex-lower-03')!;
    const asset = getMovementVisualAsset(exercise.id)!;
    const motion = getCatalogContinuousMotionAsset(exercise)!;
    for (let i = 0; i <= 50; i += 1) {
      const frame = motion.samplePose(i / 50);
      expect(frame.joints.heel).toEqual(asset.phases.start.joints.heel);
      expect(frame.joints.toe).toEqual(asset.phases.start.joints.toe);
      expect(frame.joints.toe.y).toBe(105);
      const tip = resolveChairPedalTip(frame.interpolatedPhaseSpec.apparatusState.pedalAngleDeg);
      expect(poseDistance(frame.joints.farToe!, tip)).toBeLessThan(0.8);
      expect(frame.joints.farAnkle!.x - frame.joints.farToe!.x).toBeCloseTo(8, 0);
      expect(frame.joints.farAnkle!.y - frame.joints.farToe!.y).toBeCloseTo(-8, 0);
    }
  });

  it('raises the longitudinal-roller support while keeping the feet on the mat', () => {
    const asset = getMovementVisualAsset('ex-warmup-03')!;
    expect(asset.props).toContain('foam-roller');
    expect(asset.archetypeId).toBe('mat-longitudinal-roller-arm-arc');
    for (const joints of sampledJoints(asset.exerciseId)) {
      for (const key of ['head', 'thoracic', 'lumbar', 'pelvis'] as const) {
        expect(joints[key].y).toBeLessThanOrEqual(128);
        // A sub-pixel breathing lift is allowed; the roller-supported trunk
        // must not drop to the old flat-mat position or rock its pelvis.
        expect(poseDistance(joints[key], asset.phases.start.joints[key]), key).toBeLessThanOrEqual(1.5);
      }
      expect(joints.heel.y).toBe(146);
      expect(joints.farHeel!.y).toBe(145);
    }
  });
});
