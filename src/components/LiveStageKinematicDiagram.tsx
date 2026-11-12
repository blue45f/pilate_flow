import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getCatalogContinuousMotionAsset } from '../data/catalogMotionAssets';
import type { CatalogMovementVisualAsset, VisualPhaseId } from '../data/movementVisualRigCatalog';
import type { PilatesExercise } from '../types/pilates';
import { MovementPhaseDiagramSvg } from './MovementPhaseDiagramSvg';

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

export const LiveStageKinematicDiagram: React.FC<LiveStageKinematicDiagramProps> = ({
  exercise,
  running,
  stepProgressRatio = 0,
  springsLabel,
}) => {
  const motionAsset = useMemo(() => getCatalogContinuousMotionAsset(exercise), [exercise]);
  const [reducedMotion, setReducedMotion] = useState<boolean>(
    () =>
      typeof window !== 'undefined' &&
      Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
  );
  const [manualStaticCompare, setManualStaticCompare] = useState(false);
  const [cycleProgress, setCycleProgress] = useState<number>(0.5);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
    };
    mql.addEventListener?.('change', onChange);
    return () => mql.removeEventListener?.('change', onChange);
  }, []);

  const isDualStaticMode = reducedMotion || manualStaticCompare;

  useEffect(() => {
    if (!running || isDualStaticMode || !motionAsset) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      startTimeRef.current = null;
      return undefined;
    }

    const cycleMs = 5600;
    const tick = (now: number) => {
      if (document.hidden) {
        rafRef.current = null;
        startTimeRef.current = null;
        return;
      }
      if (startTimeRef.current === null) {
        startTimeRef.current = now;
      }
      const elapsed = Math.max(0, now - startTimeRef.current);
      setCycleProgress((elapsed % cycleMs) / cycleMs);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      startTimeRef.current = null;
    };
  }, [running, isDualStaticMode, motionAsset]);

  if (!motionAsset) return null;

  const effectiveSampleRatio = running
    ? cycleProgress
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
      className="teaching-live-diagram-card"
      data-testid="live-stage-kinematic-diagram"
      data-exercise-id={exercise.id}
      data-apparatus={exercise.apparatus}
      data-reduced-motion-view={String(isDualStaticMode)}
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
              ? '모션 감소 설정 · 시작↔정점 정지 비교'
              : '정지 비교 · 시작↔정점 자세'
            : running
              ? `연속 모션 · ${PHASE_BADGE_TEXT[sampled.visualPhaseId]}`
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
          {isDualStaticMode ? '단일 모션 도해 보기' : '시작↔정점 나란히 보기'}
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
            label={`${exercise.nameKo} · ${PHASE_BADGE_TEXT[sampled.visualPhaseId]}`}
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
