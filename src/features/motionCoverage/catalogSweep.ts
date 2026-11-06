import { MOTION_PATTERN_REFERENCES } from '../../data/motionPatternReferences';
import { INITIAL_EXERCISES } from '../../data/pilatesCatalog';
import { MotionCoveragePlaybackController } from './playbackController';
import { verifyZeroDuplicateVisualAssets } from './poseOverrides';
import type { MotionSupportMode, ResolveMotionCoverageOptions } from './types';

export interface RepresentativeHarnessTarget {
  readonly id: string;
  readonly labelKo: string;
  readonly expectedMode: MotionSupportMode;
}

export const MOTION_COVERAGE_HARNESS_REPRESENTATIVE_TARGETS: readonly RepresentativeHarnessTarget[] =
  Object.freeze([
    {
      id: 'ex-warmup-01',
      labelKo: '대표 이산 2D 3단계 (ex-warmup-01 · 3단계 도해)',
      expectedMode: 'three-phase-2d',
    },
    {
      id: 'original-mat-ankle-reach',
      labelKo: '대표 2D 평면 연속 초안 (original-mat-ankle-reach)',
      expectedMode: 'continuous-2d',
    },
    {
      id: 'original-mat-quadruped-reach',
      labelKo: '대표 3D→2D 사선 투영 초안 (original-mat-quadruped-reach)',
      expectedMode: 'projected-3d',
    },
    {
      id: 'unknown-nonexistent-id-999',
      labelKo: '대표 미지원/누락 검수 (unknown-nonexistent-id-999)',
      expectedMode: 'missing',
    },
  ]);

export interface CatalogPlaybackSweepResult {
  readonly totalCatalogCount: number;
  readonly countsByMode: Readonly<Record<MotionSupportMode, number>>;
  readonly reused2dPoseAssetCount: number;
  readonly newlyCreatedAssetCount: number;
  readonly unreviewedPatternReferenceCount: number;
  readonly discreteExercisesNeverPlayedCount: number;
  readonly continuousExercisesVerifiedCount: number;
  readonly representativeModesVerified: Readonly<Record<MotionSupportMode, boolean>>;
  readonly canonicalMotionReadyTrueCount: number;
  readonly manualReadyTrueCount: number;
  readonly true3dSupportedTrueCount: number;
  readonly controllerDestroyedCleanly: boolean;
}

/**
 * Programmatic verification harness that iterates over all 98 catalog descriptors plus
 * the representative missing target using a single `MotionCoveragePlaybackController` instance,
 * verifying play/pause/seek/step-select/switch and confirming zero leaked frames/listeners.
 */
export function runMotionCoverageCatalogSweep(
  options: ResolveMotionCoverageOptions = {},
): CatalogPlaybackSweepResult {
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrameId = 1;
  let clockMs = 1000;

  const controller = new MotionCoveragePlaybackController({
    exerciseOrId: INITIAL_EXERCISES[0]?.id ?? 'ex-warmup-01',
    resolveOptions: options,
    isReducedMotion: () => false,
    isDocumentHidden: () => false,
    requestFrame: (cb) => {
      const id = nextFrameId++;
      frames.set(id, cb);
      return id;
    },
    cancelFrame: (id) => {
      frames.delete(id);
    },
    now: () => clockMs,
  });

  const countsByMode: Record<MotionSupportMode, number> = {
    'three-phase-2d': 0,
    'continuous-2d': 0,
    'projected-3d': 0,
    missing: 0,
  };

  let canonicalMotionReadyTrueCount = 0;
  let manualReadyTrueCount = 0;
  let true3dSupportedTrueCount = 0;
  let discreteExercisesNeverPlayedCount = 0;
  let continuousExercisesVerifiedCount = 0;
  const representativeModesVerified: Record<MotionSupportMode, boolean> = {
    'three-phase-2d': false,
    'continuous-2d': false,
    'projected-3d': false,
    missing: false,
  };

  for (const exercise of INITIAL_EXERCISES) {
    const snap = controller.switchExercise(exercise.id, options);
    countsByMode[snap.mode] += 1;
    canonicalMotionReadyTrueCount += Number(snap.canonicalMotionReady);
    manualReadyTrueCount += Number(snap.manualReady);
    true3dSupportedTrueCount += Number(snap.true3dSupported);

    if (snap.mode === 'three-phase-2d') {
      const playStarted = controller.play({ explicitUserAction: true });
      const afterPlayAttempt = controller.getSnapshot();
      controller.selectPhase('middle');
      const atMiddle = controller.getSnapshot();
      controller.selectPhase('end');
      const atEnd = controller.getSnapshot();
      controller.restart();
      const atReset = controller.getSnapshot();

      if (
        !playStarted &&
        !afterPlayAttempt.playing &&
        !afterPlayAttempt.isContinuousInterpolated &&
        afterPlayAttempt.progress === null &&
        frames.size === 0 &&
        atMiddle.selectedPhase === 'middle' &&
        atEnd.selectedPhase === 'end' &&
        atReset.selectedPhase === 'start'
      ) {
        discreteExercisesNeverPlayedCount += 1;
        representativeModesVerified['three-phase-2d'] = true;
      }
    } else if (snap.mode === 'continuous-2d' || snap.mode === 'projected-3d') {
      const playStarted = controller.play({ explicitUserAction: true });
      const pendingCallbacks = [...frames.values()];
      frames.clear();
      clockMs += 16;
      for (const cb of pendingCallbacks) {
        cb(clockMs);
      }
      const nextCallbacks = [...frames.values()];
      frames.clear();
      clockMs += 2000;
      for (const cb of nextCallbacks) {
        cb(clockMs);
      }
      const playingSnap = controller.getSnapshot();
      controller.seek(0.75);
      const soughtSnap = controller.getSnapshot();
      controller.pause();
      const pausedSnap = controller.getSnapshot();
      controller.restart();
      const resetSnap = controller.getSnapshot();

      if (
        playStarted &&
        playingSnap.isContinuousInterpolated &&
        typeof playingSnap.progress === 'number' &&
        Number.isFinite(playingSnap.progress) &&
        playingSnap.progress > 0 &&
        soughtSnap.progress === 0.75 &&
        !pausedSnap.playing &&
        resetSnap.progress === 0 &&
        frames.size === 0
      ) {
        continuousExercisesVerifiedCount += 1;
        representativeModesVerified[snap.mode] = true;
      }
    }
  }

  const missingSnap = controller.switchExercise('unknown-nonexistent-id-999', options);
  const missingPlayStarted = controller.play({ explicitUserAction: true });
  if (
    missingSnap.mode === 'missing' &&
    !missingPlayStarted &&
    !missingSnap.playing &&
    missingSnap.progress === null &&
    missingSnap.selectedPhase === null &&
    frames.size === 0
  ) {
    representativeModesVerified.missing = true;
  }

  controller.destroy();
  const reuseReport = verifyZeroDuplicateVisualAssets();

  return Object.freeze({
    totalCatalogCount: INITIAL_EXERCISES.length,
    countsByMode: Object.freeze(countsByMode),
    reused2dPoseAssetCount: reuseReport.reusedByIdentityCount,
    newlyCreatedAssetCount: reuseReport.duplicateAssetCount,
    unreviewedPatternReferenceCount: MOTION_PATTERN_REFERENCES.length,
    discreteExercisesNeverPlayedCount,
    continuousExercisesVerifiedCount,
    representativeModesVerified: Object.freeze(representativeModesVerified),
    canonicalMotionReadyTrueCount,
    manualReadyTrueCount,
    true3dSupportedTrueCount,
    controllerDestroyedCleanly:
      controller.isDestroyed() &&
      !controller.hasPendingFrame() &&
      controller.activeListenerCount() === 0 &&
      frames.size === 0,
  });
}
