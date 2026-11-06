import React, { useEffect, useId, useMemo, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MotionAuthoringBatchFigure } from '../../components/MotionAuthoringBatchFigure';
import { MotionDraftFigure } from '../../components/MotionDraftFigure';
import {
  MovementPhaseDiagramSvg,
  MovementTriptychDiagramSvg,
} from '../../components/MovementPhaseDiagramSvg';
import { SupineReachFigure } from '../../components/SupineReachFigure';
import { INITIAL_EXERCISES } from '../../data/pilatesCatalog';
import { MOTION_PATTERN_REFERENCES } from '../../data/motionPatternReferences';
import {
  MOVEMENT_VISUAL_ASSETS,
  type VisualPhaseId,
} from '../../data/movementVisualRigCatalog';
import type { BatchVariantId } from '../../models/motionAuthoringBatch';
import type { MotionDraftId } from '../../models/types';
import { getMotionPose, type MotionPoint } from '../../utils/motionReferenceModel';
import {
  resolveRenderableMotionDescriptor,
  toExerciseEvidenceMotionOverlay,
} from './adapters';
import {
  DISCRETE_VISUAL_PHASES,
  DRAFT_REPEAT_COUNTS,
  DRAFT_SPEEDS,
  MotionCoveragePlaybackController,
  type DraftRepeatCount,
  type DraftSpeed,
  type MotionCoveragePlaybackControllerOptions,
  type MotionCoveragePlaybackSnapshot,
} from './playbackController';
import { verifyZeroDuplicateVisualAssets } from './poseOverrides';
import type { MotionSupportMode, ResolveMotionCoverageOptions } from './types';

export interface RepresentativeHarnessTarget {
  readonly id: string;
  readonly labelKo: string;
  readonly expectedMode: MotionSupportMode;
}

// eslint-disable-next-line react-refresh/only-export-components
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
  readonly newlyCreatedAssetCount: 0;
  readonly unreviewedPatternReferenceCount: number;
  readonly discreteExercisesNeverPlayedCount: number;
  readonly continuousExercisesVerifiedCount: number;
  readonly representativeModesVerified: Readonly<Record<MotionSupportMode, boolean>>;
  readonly canonicalMotionReadyTrueCount: 0;
  readonly manualReadyTrueCount: 0;
  readonly true3dSupportedTrueCount: 0;
  readonly controllerDestroyedCleanly: boolean;
}

/**
 * Programmatic verification harness that iterates over all 98 catalog descriptors plus
 * the representative missing target using a single `MotionCoveragePlaybackController` instance,
 * verifying play/pause/seek/step-select/switch and confirming zero leaked frames/listeners.
 */
// eslint-disable-next-line react-refresh/only-export-components
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
    newlyCreatedAssetCount: 0,
    unreviewedPatternReferenceCount: MOTION_PATTERN_REFERENCES.length,
    discreteExercisesNeverPlayedCount,
    continuousExercisesVerifiedCount,
    representativeModesVerified: Object.freeze(representativeModesVerified),
    canonicalMotionReadyTrueCount: 0,
    manualReadyTrueCount: 0,
    true3dSupportedTrueCount: 0,
    controllerDestroyedCleanly:
      controller.isDestroyed() &&
      !controller.hasPendingFrame() &&
      controller.activeListenerCount() === 0 &&
      frames.size === 0,
  });
}

export interface MotionCoveragePreviewHarnessProps {
  readonly initialExerciseOrId?: string;
  readonly resolveOptions?: ResolveMotionCoverageOptions;
  readonly controllerOptions?: Partial<
    Pick<
      MotionCoveragePlaybackControllerOptions,
      'requestFrame' | 'cancelFrame' | 'now' | 'isReducedMotion' | 'isDocumentHidden'
    >
  >;
  readonly onSnapshotChange?: (snapshot: MotionCoveragePlaybackSnapshot) => void;
}

const TOUCH_BUTTON_STYLE: React.CSSProperties = {
  minHeight: '44px',
  minWidth: '44px',
  padding: '8px 12px',
  boxSizing: 'border-box',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  fontSize: '0.875rem',
  lineHeight: 1.25,
  borderRadius: '8px',
  border: '1px solid rgba(40, 54, 48, 0.25)',
  background: '#f8faf8',
  color: '#1b2621',
  cursor: 'pointer',
  maxWidth: '100%',
  wordBreak: 'keep-all',
};

const ACTIVE_TOUCH_BUTTON_STYLE: React.CSSProperties = {
  ...TOUCH_BUTTON_STYLE,
  background: '#1f4d3b',
  color: '#ffffff',
  border: '1px solid #1f4d3b',
  fontWeight: 600,
};

const TOUCH_SELECT_STYLE: React.CSSProperties = {
  minHeight: '44px',
  minWidth: '44px',
  width: '100%',
  maxWidth: '100%',
  padding: '8px 10px',
  boxSizing: 'border-box',
  fontSize: '0.875rem',
  borderRadius: '8px',
  border: '1px solid rgba(40, 54, 48, 0.28)',
  background: '#ffffff',
  color: '#1b2621',
};

function pointsToSvgPath(points: readonly MotionPoint[]): string {
  return points
    .map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`)
    .join(' ');
}

/**
 * Isolated local inspection preview harness (`src/features/motionCoverage/MotionCoveragePreviewHarness.tsx`).
 * - Iterates over all 98 catalog descriptors + representative missing fixture.
 * - Uses `MotionCoveragePlaybackController` to drive continuous drafts (`projected-3d`, `continuous-2d`)
 *   and discrete 3-step selection (`three-phase-2d`, 77 exercises) without fake interpolation.
 * - Enforces >= 44px touch targets, keyboard shortcuts, and responsive 320px/390px zero-overflow layout.
 * - Cleans up all RAF handles and listeners on pause, exercise switch, background tab, and unmount.
 */
export const MotionCoveragePreviewHarness: React.FC<
  MotionCoveragePreviewHarnessProps
> = ({
  initialExerciseOrId = 'ex-warmup-01',
  resolveOptions,
  controllerOptions,
  onSnapshotChange,
}) => {
  const uid = useId();
  const [includeLabPrototypes, setIncludeLabPrototypes] = useState<boolean>(
    Boolean(resolveOptions?.includeLabPrototypesInContinuous2d),
  );
  const [modeFilter, setModeFilter] = useState<'all' | MotionSupportMode>('all');

  const mergedResolveOptions = useMemo<ResolveMotionCoverageOptions>(
    () => ({
      ...resolveOptions,
      includeLabPrototypesInContinuous2d: includeLabPrototypes,
    }),
    [resolveOptions, includeLabPrototypes],
  );

  const [controllerState] = useState(() => {
    let setSnapRef: ((nextSnap: MotionCoveragePlaybackSnapshot) => void) | null =
      null;
    const ctrl = new MotionCoveragePlaybackController({
      exerciseOrId: initialExerciseOrId,
      resolveOptions: mergedResolveOptions,
      ...controllerOptions,
      onChange: (nextSnap) => {
        setSnapRef?.(nextSnap);
        onSnapshotChange?.(nextSnap);
      },
    });
    return {
      ctrl,
      bindSetSnap: (fn: (nextSnap: MotionCoveragePlaybackSnapshot) => void) => {
        setSnapRef = fn;
      },
    };
  });

  const controller = controllerState.ctrl;
  const [snapshot, setSnapshot] = useState<MotionCoveragePlaybackSnapshot>(() =>
    controller.getSnapshot(),
  );

  useEffect(() => {
    controllerState.bindSetSnap(setSnapshot);
    return () => {
      controller.destroy();
    };
  }, [controller, controllerState]);

  const catalogDescriptors = useMemo(
    () =>
      INITIAL_EXERCISES.map((exercise, index) => ({
        index,
        exercise,
        descriptor: resolveRenderableMotionDescriptor(exercise, mergedResolveOptions),
      })),
    [mergedResolveOptions],
  );

  const filteredCatalogDescriptors = useMemo(() => {
    if (modeFilter === 'all') return catalogDescriptors;
    return catalogDescriptors.filter((item) => item.descriptor.mode === modeFilter);
  }, [catalogDescriptors, modeFilter]);

  const modeCounts = useMemo(() => {
    const counts: Record<MotionSupportMode, number> = {
      'three-phase-2d': 0,
      'continuous-2d': 0,
      'projected-3d': 0,
      missing: 0,
    };
    for (const item of catalogDescriptors) {
      counts[item.descriptor.mode] += 1;
    }
    return counts;
  }, [catalogDescriptors]);

  const activeCatalogEntry = useMemo(
    () =>
      catalogDescriptors.find((item) => item.exercise.id === snapshot.exerciseId) ??
      null,
    [catalogDescriptors, snapshot.exerciseId],
  );

  const currentFilteredIndex = useMemo(
    () =>
      filteredCatalogDescriptors.findIndex(
        (item) => item.exercise.id === snapshot.exerciseId,
      ),
    [filteredCatalogDescriptors, snapshot.exerciseId],
  );

  const handleSelectExercise = (nextExerciseId: string) => {
    const nextSnap = controller.switchExercise(nextExerciseId, mergedResolveOptions);
    setSnapshot(nextSnap);
    onSnapshotChange?.(nextSnap);
  };

  const handleToggleLabPrototypes = (checked: boolean) => {
    setIncludeLabPrototypes(checked);
    const nextOptions: ResolveMotionCoverageOptions = {
      ...resolveOptions,
      includeLabPrototypesInContinuous2d: checked,
    };
    const nextSnap = controller.switchExercise(snapshot.exerciseId, nextOptions);
    setSnapshot(nextSnap);
    onSnapshotChange?.(nextSnap);
  };

  const handlePrevExercise = () => {
    if (filteredCatalogDescriptors.length === 0) return;
    const prevIdx =
      currentFilteredIndex <= 0
        ? filteredCatalogDescriptors.length - 1
        : currentFilteredIndex - 1;
    const target = filteredCatalogDescriptors[prevIdx];
    if (target) handleSelectExercise(target.exercise.id);
  };

  const handleNextExercise = () => {
    if (filteredCatalogDescriptors.length === 0) return;
    const nextIdx =
      currentFilteredIndex < 0 ||
      currentFilteredIndex >= filteredCatalogDescriptors.length - 1
        ? 0
        : currentFilteredIndex + 1;
    const target = filteredCatalogDescriptors[nextIdx];
    if (target) handleSelectExercise(target.exercise.id);
  };

  const handleStageKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      controller.prevPhase();
      setSnapshot(controller.getSnapshot());
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      controller.nextPhase();
      setSnapshot(controller.getSnapshot());
    } else if (event.key === 'Home') {
      event.preventDefault();
      controller.restart();
      setSnapshot(controller.getSnapshot());
    } else if (event.key === ' ' && snapshot.isContinuousInterpolated) {
      event.preventDefault();
      if (snapshot.playing) {
        controller.pause();
      } else {
        controller.play({ explicitUserAction: true });
      }
      setSnapshot(controller.getSnapshot());
    }
  };

  const evidenceOverlay = useMemo(
    () =>
      activeCatalogEntry
        ? toExerciseEvidenceMotionOverlay(
            activeCatalogEntry.exercise,
            mergedResolveOptions,
          )
        : toExerciseEvidenceMotionOverlay(snapshot.exerciseId, mergedResolveOptions),
    [activeCatalogEntry, snapshot.exerciseId, mergedResolveOptions],
  );

  const activePhaseFor2d: VisualPhaseId = snapshot.selectedPhase ?? 'start';
  const activeDescriptor = snapshot.descriptor;
  const activePatternRef = snapshot.activePatternReference;
  const activeLabProto = snapshot.activeLabPrototype;
  const continuousProgress = snapshot.progress ?? 0;

  return (
    <section
      aria-labelledby={`${uid}-harness-title`}
      data-testid="motion-coverage-preview-harness"
      data-exercise-id={snapshot.exerciseId}
      data-motion-mode={snapshot.mode}
      data-control-kind={snapshot.controlKind}
      data-playing={String(snapshot.playing)}
      data-continuous-interpolated={String(snapshot.isContinuousInterpolated)}
      data-auto-interpolated-from-discrete="false"
      data-canonical-ready="false"
      data-manual-ready="false"
      data-true-3d="false"
      data-webgl-3d-ready="false"
      data-anatomical-verified="false"
      data-expert-verified="false"
      data-reduced-motion={String(snapshot.reducedMotion)}
      data-catalog-total={String(INITIAL_EXERCISES.length)}
      data-reused-2d-asset-count={String(MOVEMENT_VISUAL_ASSETS.length)}
      data-pattern-reference-count={String(MOTION_PATTERN_REFERENCES.length)}
      style={{
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        padding: '12px',
        borderRadius: '12px',
        border: '1px solid rgba(40, 54, 48, 0.2)',
        background: '#fcfdfc',
        color: '#1b2621',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <header
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginBottom: '12px',
          maxWidth: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <h2
            id={`${uid}-harness-title`}
            style={{ margin: 0, fontSize: '1.05rem', lineHeight: 1.3 }}
          >
            모션 도해 지원 수준 로컬 검수 프리뷰 (98종 카탈로그 순회)
          </h2>
          <span
            data-testid="harness-truth-pill"
            style={{
              fontSize: '0.78rem',
              padding: '4px 8px',
              borderRadius: '999px',
              background: '#eef3ef',
              color: '#254235',
              maxWidth: '100%',
            }}
          >
            기존 98 포즈 재사용 · 미검토 연속 초안 21종(22패턴) · 정식 3D/승인 0건
          </span>
        </div>

        <p
          data-testid="harness-mode-distinction-banner"
          style={{
            margin: 0,
            padding: '8px 10px',
            borderRadius: '8px',
            background: '#f2f6f3',
            fontSize: '0.82rem',
            lineHeight: 1.45,
          }}
        >
          {snapshot.modeDistinctionLabelKo}
        </p>

        <p
          data-testid="harness-safety-privacy-notice"
          style={{
            margin: 0,
            fontSize: '0.78rem',
            lineHeight: 1.4,
            color: '#46584f',
          }}
        >
          안내: 본 검수 화면은 동작 도해 구조 확인용이며 실제 운동 효과나 안전성을 보장하지 않습니다.
          개인 건강정보·사진·웹캠 데이터를 수집하거나 외부로 전송하지 않습니다.
        </p>
      </header>

      {/* Representative Quick Targets (4 canonical states) */}
      <div
        role="group"
        aria-label="대표 지원 상태 빠른 전환"
        data-testid="harness-representative-targets"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          marginBottom: '12px',
          maxWidth: '100%',
        }}
      >
        {MOTION_COVERAGE_HARNESS_REPRESENTATIVE_TARGETS.map((target) => {
          const isCurrent = snapshot.exerciseId === target.id;
          return (
            <button
              key={target.id}
              type="button"
              data-testid={`harness-rep-${target.expectedMode}`}
              aria-pressed={isCurrent}
              style={isCurrent ? ACTIVE_TOUCH_BUTTON_STYLE : TOUCH_BUTTON_STYLE}
              onClick={() => handleSelectExercise(target.id)}
            >
              {target.labelKo}
            </button>
          );
        })}
      </div>

      {/* Mode Filter & 98-Exercise Catalog Traversal Controls */}
      <div
        role="region"
        aria-label="98개 카탈로그 동작 순회 제어"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '10px',
          borderRadius: '10px',
          background: '#f4f7f5',
          marginBottom: '12px',
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div
          role="group"
          aria-label="지원 수준별 필터"
          style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}
        >
          <button
            type="button"
            data-testid="harness-filter-all"
            aria-pressed={modeFilter === 'all'}
            style={modeFilter === 'all' ? ACTIVE_TOUCH_BUTTON_STYLE : TOUCH_BUTTON_STYLE}
            onClick={() => setModeFilter('all')}
          >
            전체 카탈로그 ({INITIAL_EXERCISES.length}종)
          </button>
          <button
            type="button"
            data-testid="harness-filter-three-phase-2d"
            aria-pressed={modeFilter === 'three-phase-2d'}
            style={
              modeFilter === 'three-phase-2d'
                ? ACTIVE_TOUCH_BUTTON_STYLE
                : TOUCH_BUTTON_STYLE
            }
            onClick={() => setModeFilter('three-phase-2d')}
          >
            이산 2D 3단계 ({modeCounts['three-phase-2d']}종)
          </button>
          <button
            type="button"
            data-testid="harness-filter-continuous-2d"
            aria-pressed={modeFilter === 'continuous-2d'}
            style={
              modeFilter === 'continuous-2d'
                ? ACTIVE_TOUCH_BUTTON_STYLE
                : TOUCH_BUTTON_STYLE
            }
            onClick={() => setModeFilter('continuous-2d')}
          >
            2D 연속 초안 ({modeCounts['continuous-2d']}종)
          </button>
          <button
            type="button"
            data-testid="harness-filter-projected-3d"
            aria-pressed={modeFilter === 'projected-3d'}
            style={
              modeFilter === 'projected-3d'
                ? ACTIVE_TOUCH_BUTTON_STYLE
                : TOUCH_BUTTON_STYLE
            }
            onClick={() => setModeFilter('projected-3d')}
          >
            3D→2D 사선 투영 초안 ({modeCounts['projected-3d']}종)
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '8px',
            maxWidth: '100%',
          }}
        >
          <button
            type="button"
            data-testid="harness-prev-exercise"
            aria-label="이전 카탈로그 동작"
            style={TOUCH_BUTTON_STYLE}
            onClick={handlePrevExercise}
          >
            ◀ 이전 동작
          </button>
          <button
            type="button"
            data-testid="harness-next-exercise"
            aria-label="다음 카탈로그 동작"
            style={TOUCH_BUTTON_STYLE}
            onClick={handleNextExercise}
          >
            다음 동작 ▶
          </button>
          <span
            data-testid="harness-catalog-position"
            style={{ fontSize: '0.84rem', fontWeight: 600 }}
          >
            {activeCatalogEntry
              ? `카탈로그 ${activeCatalogEntry.index + 1} / ${INITIAL_EXERCISES.length} · ${activeCatalogEntry.exercise.nameKo}`
              : `비카탈로그 검수 대상 · ${snapshot.exerciseId}`}
          </span>
        </div>

        <label
          htmlFor={`${uid}-exercise-select`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            fontSize: '0.84rem',
            maxWidth: '100%',
          }}
        >
          <span>동작 직접 선택 (98개 카탈로그 + 미지원 검수 fixture)</span>
          <select
            id={`${uid}-exercise-select`}
            aria-label="검수할 동작 선택"
            data-testid="harness-exercise-select"
            value={snapshot.exerciseId}
            style={TOUCH_SELECT_STYLE}
            onChange={(event) => handleSelectExercise(event.target.value)}
          >
            {filteredCatalogDescriptors.map(({ index, exercise, descriptor }) => (
              <option key={exercise.id} value={exercise.id}>
                [{index + 1}/98] {exercise.id} · {exercise.nameKo} ({descriptor.mode})
              </option>
            ))}
            <option value="unknown-nonexistent-id-999">
              [미지원 검수] unknown-nonexistent-id-999 (missing)
            </option>
          </select>
        </label>

        <label
          style={{
            minHeight: '44px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.82rem',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            data-testid="harness-toggle-lab-prototypes"
            checked={includeLabPrototypes}
            onChange={(event) => handleToggleLabPrototypes(event.target.checked)}
            style={{ width: '20px', height: '20px' }}
          />
          <span>
            연구실 전용 2D 연속 프로토타입 2종(bridge-pattern, heel-slide) opt-in 포함 검수
          </span>
        </label>
      </div>

      {/* Live Playback / Step Status Banner */}
      <div
        role="status"
        aria-live="polite"
        data-testid="harness-playback-status"
        style={{
          padding: '10px 12px',
          borderRadius: '8px',
          background: '#e9f0ec',
          marginBottom: '12px',
          fontSize: '0.86rem',
          fontWeight: 600,
          lineHeight: 1.4,
        }}
      >
        {snapshot.statusLabelKo}
      </div>

      {/* Mode-Specific Interactive Controls & Stage */}
      <div
        tabIndex={0}
        role="region"
        aria-label="모션 도해 검수 스테이지 (좌우 방향키로 단계 이동, 스페이스바로 연속 초안 재생/일시정지)"
        data-testid="harness-interactive-stage"
        onKeyDown={handleStageKeyDown}
        style={{
          padding: '12px',
          borderRadius: '10px',
          border: '1px solid rgba(40, 54, 48, 0.18)',
          background: '#ffffff',
          marginBottom: '12px',
          maxWidth: '100%',
          boxSizing: 'border-box',
          overflowX: 'hidden',
        }}
      >
        <div style={{ marginBottom: '10px' }}>
          <strong data-testid="harness-descriptor-badge">
            {activeDescriptor.badgeLabelKo}
          </strong>
          <p
            data-testid="harness-descriptor-disclaimer"
            style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#46584f' }}
          >
            {activeDescriptor.disclaimerKo}
          </p>
        </div>

        {/* Continuous Draft Controls (ONLY for projected-3d and continuous-2d) */}
        {snapshot.controlKind === 'continuous-draft-playback' && (
          <div
            data-testid="harness-continuous-controls"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              marginBottom: '12px',
              padding: '10px',
              borderRadius: '8px',
              background: '#f5f8f6',
              maxWidth: '100%',
              boxSizing: 'border-box',
            }}
          >
            {snapshot.availableVariantIds.length > 1 && (
              <div
                role="group"
                aria-label="관련 패턴 초안 변형 선택"
                style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}
              >
                {snapshot.availableVariantIds.map((variantId, idx) => (
                  <button
                    key={variantId}
                    type="button"
                    data-testid={`harness-variant-${variantId}`}
                    aria-pressed={snapshot.activeVariantIndex === idx}
                    style={
                      snapshot.activeVariantIndex === idx
                        ? ACTIVE_TOUCH_BUTTON_STYLE
                        : TOUCH_BUTTON_STYLE
                    }
                    onClick={() => controller.selectVariantIndex(idx)}
                  >
                    패턴 변형 {idx + 1}: {variantId}
                  </button>
                ))}
              </div>
            )}

            <div
              role="group"
              aria-label="연속 초안 재생 제어"
              style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}
            >
              <button
                type="button"
                data-testid="harness-play-pause-btn"
                style={
                  snapshot.playing ? ACTIVE_TOUCH_BUTTON_STYLE : TOUCH_BUTTON_STYLE
                }
                onClick={() => {
                  if (snapshot.playing) {
                    controller.pause();
                  } else {
                    controller.play({ explicitUserAction: true });
                  }
                }}
              >
                {snapshot.playing
                  ? '일시정지'
                  : snapshot.reducedMotion
                    ? '명시적 수동 재생 (동작 줄이기 설정 중)'
                    : '한 주기 재생'}
              </button>

              <button
                type="button"
                data-testid="harness-restart-btn"
                style={TOUCH_BUTTON_STYLE}
                onClick={() => controller.restart()}
              >
                처음으로 (0%)
              </button>
            </div>

            <label
              htmlFor={`${uid}-seek-range`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                fontSize: '0.84rem',
                maxWidth: '100%',
              }}
            >
              <span>
                연속 초안 진행 위치: {Math.round(continuousProgress * 100)}%
                {snapshot.continuousPhaseLabelKo
                  ? ` · ${snapshot.continuousPhaseLabelKo}`
                  : ''}
              </span>
              <input
                id={`${uid}-seek-range`}
                type="range"
                aria-label="연속 초안 진행 위치"
                data-testid="harness-seek-slider"
                min="0"
                max="100"
                step="1"
                value={Math.round(continuousProgress * 100)}
                onChange={(event) =>
                  controller.seek(Number(event.target.value) / 100)
                }
                style={{
                  width: '100%',
                  maxWidth: '100%',
                  minHeight: '44px',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                }}
              />
            </label>

            <div
              role="group"
              aria-label="재생 속도 선택"
              style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}
            >
              {DRAFT_SPEEDS.map((spd: DraftSpeed) => (
                <button
                  key={spd}
                  type="button"
                  data-testid={`harness-speed-${spd}`}
                  aria-pressed={snapshot.speed === spd}
                  style={
                    snapshot.speed === spd
                      ? ACTIVE_TOUCH_BUTTON_STYLE
                      : TOUCH_BUTTON_STYLE
                  }
                  onClick={() => controller.setSpeed(spd)}
                >
                  속도 {spd}×
                </button>
              ))}
            </div>

            <div
              role="group"
              aria-label="반복 횟수 선택"
              style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}
            >
              {DRAFT_REPEAT_COUNTS.map((cnt: DraftRepeatCount) => (
                <button
                  key={cnt}
                  type="button"
                  data-testid={`harness-repeat-${cnt}`}
                  aria-pressed={snapshot.repeatCount === cnt}
                  style={
                    snapshot.repeatCount === cnt
                      ? ACTIVE_TOUCH_BUTTON_STYLE
                      : TOUCH_BUTTON_STYLE
                  }
                  onClick={() => controller.setRepeatCount(cnt)}
                >
                  반복 {cnt}회
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Discrete 3-Phase Controls (for the 77 three-phase-2d exercises + parallel 2D phase inspection) */}
        {snapshot.mode !== 'missing' && (
          <div
            data-testid="harness-discrete-phase-controls"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginBottom: '12px',
              padding: '10px',
              borderRadius: '8px',
              background: '#f8faf9',
              maxWidth: '100%',
              boxSizing: 'border-box',
            }}
          >
            <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
              {snapshot.mode === 'three-phase-2d'
                ? '이산 2D 3단계 수동 선택 (연속 모션 자동 보간 없음 · 77종)'
                : '병행 2D 3단계 기준 포즈 빠른 이동'}
            </span>
            <div
              role="group"
              aria-label="2D 3단계 선택"
              style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}
            >
              <button
                type="button"
                data-testid="harness-phase-prev"
                style={TOUCH_BUTTON_STYLE}
                disabled={activePhaseFor2d === 'start'}
                onClick={() => controller.prevPhase()}
              >
                이전 단계
              </button>
              {DISCRETE_VISUAL_PHASES.map((phaseId) => {
                const labelKo =
                  phaseId === 'start'
                    ? '1. 시작(준비)'
                    : phaseId === 'middle'
                      ? '2. 중간(전개)'
                      : '3. 끝(복귀)';
                const isSelected = activePhaseFor2d === phaseId;
                return (
                  <button
                    key={phaseId}
                    type="button"
                    data-testid={`harness-phase-${phaseId}`}
                    aria-pressed={isSelected}
                    style={
                      isSelected ? ACTIVE_TOUCH_BUTTON_STYLE : TOUCH_BUTTON_STYLE
                    }
                    onClick={() => controller.selectPhase(phaseId)}
                  >
                    {labelKo}
                  </button>
                );
              })}
              <button
                type="button"
                data-testid="harness-phase-next"
                style={TOUCH_BUTTON_STYLE}
                disabled={activePhaseFor2d === 'end'}
                onClick={() => controller.nextPhase()}
              >
                다음 단계
              </button>
            </div>
          </div>
        )}

        {/* Continuous Draft Figure Surface (when projected-3d or continuous-2d) */}
        {(snapshot.mode === 'projected-3d' || snapshot.mode === 'continuous-2d') && (
          <div
            data-testid="harness-continuous-figure-surface"
            data-variant-id={snapshot.activeVariantId ?? ''}
            data-progress={String(continuousProgress)}
            style={{
              width: '100%',
              maxWidth: '100%',
              overflow: 'hidden',
              marginBottom: '12px',
              padding: '8px',
              borderRadius: '8px',
              background: '#f3f6f4',
              boxSizing: 'border-box',
            }}
          >
            <p
              style={{
                margin: '0 0 6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#254235',
              }}
            >
              {snapshot.mode === 'projected-3d'
                ? `미검토 3D→2D SVG 사선 투영 연속 초안 (${snapshot.activeVariantId}) · 실제 3D(WebGL) 아님`
                : `미검토 2D 평면 연속 초안 (${snapshot.activeVariantId})`}
            </p>
            <div style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
              {activePatternRef?.family === 'existing-proposal' && (
                <MotionDraftFigure
                  draftId={activePatternRef.variantId as MotionDraftId}
                  progress={continuousProgress}
                />
              )}
              {activePatternRef?.family === 'authoring-batch' && (
                <MotionAuthoringBatchFigure
                  variantId={activePatternRef.variantId as BatchVariantId}
                  progress={continuousProgress}
                />
              )}
              {activePatternRef?.family === 'supine-reach' && (
                <SupineReachFigure progress={continuousProgress} />
              )}
              {!activePatternRef && activeLabProto && (
                <svg
                  viewBox="65 80 440 160"
                  role="img"
                  aria-label={`${activeLabProto.title} 연구실 2D 프로토타입 도해`}
                  data-testid="harness-lab-prototype-svg"
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                >
                  {(() => {
                    const pose = getMotionPose(
                      activeLabProto.id,
                      continuousProgress,
                      'left',
                    );
                    return (
                      <g>
                        <rect
                          x="102"
                          y="217"
                          width="380"
                          height="9"
                          rx="4.5"
                          fill="#d6dfd9"
                        />
                        <path
                          d={pointsToSvgPath([
                            pose.joints.shoulder,
                            pose.joints.hip,
                          ])}
                          stroke="#1f4d3b"
                          strokeWidth="6"
                          fill="none"
                        />
                        <path
                          d={pointsToSvgPath([
                            pose.legs.left.hip,
                            pose.legs.left.knee,
                            pose.legs.left.ankle,
                            pose.legs.left.heel,
                            pose.legs.left.toe,
                          ])}
                          stroke="#1f4d3b"
                          strokeWidth="5"
                          fill="none"
                        />
                      </g>
                    );
                  })()}
                </svg>
              )}
            </div>
          </div>
        )}

        {/* Reused 98-Exercise 2D 3-Phase Schematic Surface */}
        {activeDescriptor.mode !== 'missing' && (
          <div
            data-testid="harness-reused-2d-surface"
            data-selected-phase={activePhaseFor2d}
            style={{
              width: '100%',
              maxWidth: '100%',
              overflow: 'hidden',
              boxSizing: 'border-box',
            }}
          >
            <p
              style={{
                margin: '0 0 6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#2c3e35',
              }}
            >
              기존 98 카탈로그 2D 3단계 포즈 에셋 재사용 (중복 생성 0건 · 현재 선택 단계:{' '}
              {activePhaseFor2d})
            </p>
            {(() => {
              const phaseProps =
                activeDescriptor.mode === 'three-phase-2d'
                  ? activeDescriptor.phasePropsByPhase[activePhaseFor2d]
                  : activeDescriptor.fallbackPhasePropsByPhase?.[activePhaseFor2d] ??
                    null;
              const triptychProps =
                activeDescriptor.mode === 'three-phase-2d'
                  ? activeDescriptor.triptychProps
                  : activeDescriptor.fallbackTriptychProps;

              return (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    width: '100%',
                    maxWidth: '100%',
                    overflow: 'hidden',
                  }}
                >
                  {phaseProps && (
                    <div
                      data-testid="harness-single-phase-diagram"
                      style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}
                    >
                      <MovementPhaseDiagramSvg
                        {...phaseProps}
                        phase={activePhaseFor2d}
                      />
                    </div>
                  )}
                  {triptychProps && (
                    <div
                      data-testid="harness-triptych-diagram"
                      style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}
                    >
                      <MovementTriptychDiagramSvg
                        {...triptychProps}
                        selectedPhase={activePhaseFor2d}
                        onSelectPhase={(nextPhase) =>
                          controller.selectPhase(nextPhase)
                        }
                      />
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Missing / Unsupported Truthful Fallback */}
        {activeDescriptor.mode === 'missing' && (
          <div
            data-testid="harness-missing-surface"
            style={{
              padding: '12px',
              borderRadius: '8px',
              background: '#fbf3f2',
              border: '1px solid rgba(168, 56, 48, 0.25)',
              color: '#5c231f',
              fontSize: '0.84rem',
            }}
          >
            <p style={{ margin: '0 0 6px', fontWeight: 600 }}>
              미지원 동작 (missing) · 모션 도해 및 연속 재생 비활성
            </p>
            <p style={{ margin: '0 0 8px' }}>
              사유: {activeDescriptor.resolution.evidenceSummaryKo}
            </p>
            <ul style={{ margin: 0, paddingLeft: '18px' }}>
              {activeDescriptor.resolution.rejectedCandidates.map((rej) => (
                <li key={`${rej.candidateId}-${rej.reason}`}>
                  [{rej.reason}] {rej.detailKo}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Truthfulness & Verification Ledger DL */}
      <dl
        data-testid="harness-truth-ledger"
        style={{
          margin: 0,
          padding: '10px',
          borderRadius: '8px',
          background: '#f4f7f5',
          fontSize: '0.8rem',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          gap: '6px',
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div>
          <dt style={{ fontWeight: 600 }}>지원 수준 요약</dt>
          <dd style={{ margin: 0 }}>{evidenceOverlay.supportLevelLabelKo}</dd>
        </div>
        <div>
          <dt style={{ fontWeight: 600 }}>이산 2D vs 연속 모션 구분</dt>
          <dd style={{ margin: 0 }}>{evidenceOverlay.continuousVsDiscreteLabelKo}</dd>
        </div>
        <div>
          <dt style={{ fontWeight: 600 }}>2D SVG 투영 vs 진짜 3D 구분</dt>
          <dd style={{ margin: 0 }}>{evidenceOverlay.threeDimensionalTruthLabelKo}</dd>
        </div>
        <div>
          <dt style={{ fontWeight: 600 }}>정식 승인·해부학 검증 상태</dt>
          <dd style={{ margin: 0 }}>{evidenceOverlay.verificationTruthLabelKo}</dd>
        </div>
      </dl>
    </section>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export function mountMotionCoveragePreviewHarness(
  container: HTMLElement,
  props: MotionCoveragePreviewHarnessProps = {},
): Root {
  const root = createRoot(container);
  root.render(<MotionCoveragePreviewHarness {...props} />);
  return root;
}

