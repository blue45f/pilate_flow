import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getCatalogContinuousMotionAsset } from '../data/catalogMotionAssets';
import type { CatalogMovementVisualAsset, VisualPhaseId } from '../data/movementVisualRigCatalog';
import { hasCatalogMotionIdentityMismatch } from '../data/movementVisualRigCatalog';
import type { PilatesExercise } from '../types/pilates';
import { MovementPhaseDiagramSvg } from './MovementPhaseDiagramSvg';
import { useMotionPlaybackEnvironment } from '../hooks/useMotionPlaybackEnvironment';
import { getExpandedMovementVisualBinding } from '../data/expandedMovementVisualBindings';
import { MotionSourceOnlyNotice } from './MotionSourceOnlyNotice';
import { UnmodeledMotionNotice } from './UnmodeledMotionNotice';

export interface LiveStageKinematicDiagramProps {
  exercise: PilatesExercise;
  running: boolean;
  stepProgressRatio?: number;
  springsLabel?: string;
}

const PHASE_BADGE_TEXT: Record<VisualPhaseId, string> = {
  start: '1. 시작 자세 (준비·정렬)',
  middle: '2. 정점 자세 (최대 가동)',
  end: '3. 끝 자세 (제어 복귀)',
};

export const LiveStageKinematicDiagram: React.FC<LiveStageKinematicDiagramProps> = (props) => {
  const binding = getExpandedMovementVisualBinding(props.exercise);
  if (binding?.nativeMotionAvailable === false) {
    return (
      <MotionSourceOnlyNotice
        exerciseId={props.exercise.id}
        nameKo={props.exercise.nameKo}
        apparatus={props.exercise.apparatus}
        reasonKo={binding.reasonKo}
        sourceUrl={binding.sourceUrl}
        className="teaching-live-diagram-card"
      />
    );
  }
  if (hasCatalogMotionIdentityMismatch(props.exercise)) {
    return <UnmodeledMotionNotice exercise={props.exercise} className="teaching-live-diagram-card" />;
  }
  return <LiveStageKinematicDiagramContent {...props} />;
};

const LiveStageKinematicDiagramContent: React.FC<LiveStageKinematicDiagramProps> = ({
  exercise,
  running,
  stepProgressRatio = 0,
  springsLabel,
}) => {
  const motionAsset = useMemo(() => getCatalogContinuousMotionAsset(exercise), [exercise]);
  const wrapperRef = useRef<HTMLElement | null>(null);
  const { canAnimate, reducedMotion } = useMotionPlaybackEnvironment(wrapperRef);
  const [manualStaticCompare, setManualStaticCompare] = useState(false);
  const [cycleFrame, setCycleFrame] = useState({ exerciseId: '', progress: 0 });
  const clockRef = useRef({ exerciseId: exercise.id, progress: 0 });
  const rafRef = useRef<number | null>(null);

  const isDualStaticMode = reducedMotion || manualStaticCompare;

  useEffect(() => {
    if (!running || isDualStaticMode || !motionAsset || !canAnimate) return undefined;
    if (clockRef.current.exerciseId !== exercise.id) {
      clockRef.current = { exerciseId: exercise.id, progress: 0 };
    }
    let lastTimestamp: number | null = null;
    const tick = (now: number) => {
      if (document.hidden) return;
      const elapsed = lastTimestamp === null ? 0 : Math.min(100, Math.max(0, now - lastTimestamp));
      lastTimestamp = now;
      clockRef.current.progress = (clockRef.current.progress + elapsed / motionAsset.durationMs) % 1;
      setCycleFrame({ exerciseId: exercise.id, progress: clockRef.current.progress });
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [running, isDualStaticMode, motionAsset, canAnimate, exercise.id]);

  if (!motionAsset) return null;

  const effectiveSampleRatio = cycleFrame.exerciseId === exercise.id
    ? cycleFrame.progress
    : stepProgressRatio > 0.04 && stepProgressRatio < 0.96
      ? stepProgressRatio
      : 0.5;

  const sampled = motionAsset.samplePose(effectiveSampleRatio);
  const effectiveAsset: CatalogMovementVisualAsset = {
    ...motionAsset.visualAsset,
    phases: {
      ...motionAsset.visualAsset.phases,
      [sampled.visualPhaseId]: sampled.interpolatedPhaseSpec,
    },
  };

  const anchorLabels = motionAsset.visualAsset.phases.middle.fixedAnchors
    .slice(0, 2)
    .map((anchor) => anchor.surfaceKo)
    .join(' · ');

  return (
    <section
      ref={wrapperRef}
      className="teaching-live-diagram-card"
      data-testid="live-stage-kinematic-diagram"
      data-exercise-id={exercise.id}
      data-apparatus={exercise.apparatus}
      data-reduced-motion-view={String(isDualStaticMode)}
      data-motion-playing={running && canAnimate && !isDualStaticMode}
      data-motion-progress={cycleFrame.exerciseId === exercise.id ? cycleFrame.progress : 0}
      data-anatomical-accuracy-assumed="false"
      aria-label={`${exercise.nameKo} 연결형 동작 도해`}
    >
      <div className="teaching-live-diagram-head">
        <span
          className="teaching-live-diagram-phase-pill"
          data-testid="live-stage-diagram-phase-label"
        >
          {isDualStaticMode
            ? reducedMotion
              ? '모션 감소 설정 · 시작→정점→끝 복귀 3단계 비교'
              : '정지 비교 · 시작→정점→끝 복귀 연결'
            : running
              ? `연속 모션 · ${sampled.phase.labelKo}`
              : PHASE_BADGE_TEXT[sampled.visualPhaseId]}
        </span>
        <button
          type="button"
          className="teaching-live-diagram-mode-btn"
          data-testid="live-stage-diagram-static-toggle"
          aria-pressed={isDualStaticMode}
          disabled={reducedMotion}
          onClick={() => setManualStaticCompare((prev) => !prev)}
        >
          {isDualStaticMode ? '단일 모션 도해 보기' : '시작·정점·끝 나란히 보기'}
        </button>
      </div>

      {isDualStaticMode ? (
        <div
          className="teaching-live-diagram-dual-grid"
          data-testid="live-stage-diagram-dual-grid"
        >
          <figure className="teaching-live-diagram-frame">
            <figcaption className="teaching-live-diagram-caption">
              <strong>● 1. 시작 자세</strong>
              <span>{motionAsset.visualAsset.phases.start.shortTitleKo}</span>
            </figcaption>
            <MovementPhaseDiagramSvg
              asset={motionAsset.visualAsset}
              phase="start"
              showAlignment
              showDirection
              showMuscles
              showGhostStartPose={false}
              label={`${exercise.nameKo} 시작 자세 도해`}
            />
          </figure>
          <figure className="teaching-live-diagram-frame">
            <figcaption className="teaching-live-diagram-caption">
              <strong>◆ 2. 정점(끝 가동) 자세</strong>
              <span>{motionAsset.visualAsset.phases.middle.shortTitleKo}</span>
            </figcaption>
            <MovementPhaseDiagramSvg
              asset={motionAsset.visualAsset}
              phase="middle"
              showAlignment
              showDirection
              showMuscles
              showGhostStartPose
              label={`${exercise.nameKo} 정점 자세 도해`}
            />
          </figure>
          <figure className="teaching-live-diagram-frame">
            <figcaption className="teaching-live-diagram-caption">
              <strong>↺ 3. 끝 복귀 자세 (시작 연결)</strong>
              <span>{motionAsset.visualAsset.phases.end.shortTitleKo}</span>
            </figcaption>
            <MovementPhaseDiagramSvg
              asset={motionAsset.visualAsset}
              phase="end"
              showAlignment
              showDirection
              showMuscles
              showGhostStartPose
              label={`${exercise.nameKo} 끝 복귀 자세 도해`}
            />
          </figure>
        </div>
      ) : (
        <figure className="teaching-live-diagram-single">
          <MovementPhaseDiagramSvg
            asset={effectiveAsset}
            phase={sampled.visualPhaseId}
            showAlignment
            showDirection
            showMuscles
            showGhostStartPose
            label={`${exercise.nameKo} · ${sampled.phase.labelKo}`}
          />
          <figcaption className="teaching-live-diagram-single-caption">
            <span>{sampled.phase.labelKo}</span>
            {springsLabel ? <span>스프링 · {springsLabel}</span> : null}
          </figcaption>
        </figure>
      )}

      <div className="teaching-live-diagram-meta">
        <span className="teaching-live-diagram-anchor" data-testid="live-stage-diagram-anchors">
          ■ 기구 지지점: {anchorLabels || motionAsset.visualAsset.phases.middle.apparatusState.supportSurfaceKo}
        </span>
        <span
          className="teaching-live-diagram-review-badge"
          data-testid="live-stage-diagram-review-note"
        >
          기하·신체연결·기구접점 확인됨 · 개인별 임상 각도는 강사 검토 필요
        </span>
      </div>
    </section>
  );
};
