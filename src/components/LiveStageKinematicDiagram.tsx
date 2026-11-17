import React, { useEffect, useMemo, useRef, useState } from 'react';
import { APPARATUS_LABELS } from '../data/pilatesCatalog';
import type { VisualPhaseId } from '../data/movementVisualRigCatalog';
import {
  hasDedicated3DExerciseRig,
  sampleUniversal3DExerciseRig,
} from '../data/universal3dExerciseRigs';
import { useMotionPlaybackEnvironment } from '../hooks/useMotionPlaybackEnvironment';
import type { PilatesExercise } from '../types/pilates';
import { renderRealtimeStudio3DFrame } from '../utils/realtimeStudio3dEngine';
import { sampleStudioMotionCycle, STUDIO_MOTION_CYCLE_MS } from '../utils/studioMotionPlayback';
import { ExerciseMotionArtwork } from './ExerciseMotionArtwork';

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

export const LiveStageKinematicDiagram: React.FC<LiveStageKinematicDiagramProps> = (props) => (
  <LiveStageKinematicDiagramContent {...props} />
);

const LiveStageKinematicDiagramContent: React.FC<LiveStageKinematicDiagramProps> = ({
  exercise,
  running,
  stepProgressRatio = 0,
  springsLabel,
}) => {
  const wrapperRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { canAnimate, reducedMotion } = useMotionPlaybackEnvironment(wrapperRef);
  const [manualStaticCompare, setManualStaticCompare] = useState(false);
  const [cycleFrame, setCycleFrame] = useState({ exerciseId: '', progress: 0 });
  const clockRef = useRef({ exerciseId: exercise.id, progress: 0 });
  const rafRef = useRef<number | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);

  const isDualStaticMode = reducedMotion || manualStaticCompare;

  useEffect(() => {
    if (!running || isDualStaticMode || !canAnimate) return undefined;
    if (clockRef.current.exerciseId !== exercise.id) {
      clockRef.current = { exerciseId: exercise.id, progress: 0 };
    }
    let lastTimestamp: number | null = null;
    const tick = (now: number) => {
      if (document.hidden) return;
      const elapsed = lastTimestamp === null ? 0 : Math.min(100, Math.max(0, now - lastTimestamp));
      lastTimestamp = now;
      clockRef.current.progress =
        (clockRef.current.progress + elapsed / STUDIO_MOTION_CYCLE_MS) % 1;
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
  }, [running, isDualStaticMode, canAnimate, exercise.id]);

  const effectiveSampleRatio =
    cycleFrame.exerciseId === exercise.id
      ? cycleFrame.progress
      : stepProgressRatio > 0.04 && stepProgressRatio < 0.96
        ? stepProgressRatio
        : 0.5;

  const cycle = sampleStudioMotionCycle(effectiveSampleRatio);
  const visualPhaseId: VisualPhaseId =
    cycle.id === 'setup' || cycle.id === 'finish'
      ? 'start'
      : cycle.id === 'turn'
        ? 'middle'
        : 'end';

  const rigMeta = useMemo(
    () => sampleUniversal3DExerciseRig(exercise, cycle.pose),
    [exercise, cycle.pose],
  );
  const dedicated3d = hasDedicated3DExerciseRig(exercise);

  useEffect(() => {
    if (isDualStaticMode) return;
    const canvas = canvasRef.current;
    if (!canvas || typeof canvas.getContext !== 'function') return;
    if (
      typeof navigator !== 'undefined' &&
      /jsdom/i.test(navigator.userAgent) &&
      !('mock' in canvas.getContext)
    ) {
      return;
    }
    let ctx: CanvasRenderingContext2D | null;
    try {
      ctx = canvas.getContext('2d');
    } catch {
      return;
    }
    if (!ctx) return;
    const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;
    const cssW = canvas.clientWidth || 640;
    const cssH = canvas.clientHeight || 400;
    if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
    }
    ctx.save();
    ctx.scale(dpr, dpr);
    renderRealtimeStudio3DFrame({
      ctx,
      width: cssW,
      height: cssH,
      exercise,
      phaseT: cycle.pose,
      yawDeg: -34,
      pitchDeg: 21,
      zoom: 1.05,
      shader: 'studio-pbr',
      springOverride: springsLabel,
    });
    ctx.restore();
    setCanvasReady(true);
  }, [exercise, cycle.pose, isDualStaticMode, springsLabel]);

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
      data-3d-rig-scope={dedicated3d ? 'dedicated-3d-rig' : 'procedural-3d-synthesis'}
      data-anatomical-accuracy-assumed="false"
      aria-label={`${exercise.nameKo} 실시간 3D 동작 도해`}
    >
      <div className="teaching-live-diagram-head">
        <span
          className="teaching-live-diagram-phase-pill"
          data-testid="live-stage-diagram-phase-label"
        >
          {isDualStaticMode
            ? reducedMotion
              ? '모션 감소 설정 · 3D 시작→정점→끝 복귀 3단계 비교'
              : '3D 정지 비교 · 시작→정점→끝 복귀 연결'
            : running
              ? `3D 연속 모션 · ${cycle.label}`
              : PHASE_BADGE_TEXT[visualPhaseId]}
        </span>
        <button
          type="button"
          className="teaching-live-diagram-mode-btn"
          data-testid="live-stage-diagram-static-toggle"
          aria-pressed={isDualStaticMode}
          disabled={reducedMotion}
          onClick={() => setManualStaticCompare((prev) => !prev)}
        >
          {isDualStaticMode ? '단일 3D 모션 보기' : '시작·정점·끝 나란히 보기'}
        </button>
      </div>

      {isDualStaticMode ? (
        <div className="teaching-live-diagram-dual-grid" data-testid="live-stage-diagram-dual-grid">
          <figure className="teaching-live-diagram-frame">
            <figcaption className="teaching-live-diagram-caption">
              <strong>● 1. 시작 자세</strong>
              <span>준비·초기 정렬</span>
            </figcaption>
            <ExerciseMotionArtwork
              exercise={exercise}
              phase="start"
              decorative={false}
              label={`${exercise.nameKo} 3D 시작 자세 도해`}
            />
          </figure>
          <figure className="teaching-live-diagram-frame">
            <figcaption className="teaching-live-diagram-caption">
              <strong>◆ 2. 정점(끝 가동) 자세</strong>
              <span>{rigMeta.poseFeatureKo}</span>
            </figcaption>
            <ExerciseMotionArtwork
              exercise={exercise}
              phase="middle"
              decorative={false}
              label={`${exercise.nameKo} 3D 정점 자세 도해`}
            />
          </figure>
          <figure className="teaching-live-diagram-frame">
            <figcaption className="teaching-live-diagram-caption">
              <strong>↺ 3. 끝 복귀 자세 (시작 연결)</strong>
              <span>제어 복귀 전환</span>
            </figcaption>
            <ExerciseMotionArtwork
              exercise={exercise}
              phase="end"
              decorative={false}
              label={`${exercise.nameKo} 3D 끝 복귀 자세 도해`}
            />
          </figure>
        </div>
      ) : (
        <figure className="teaching-live-diagram-single">
          <canvas
            ref={canvasRef}
            className="pf-orbit3d-canvas"
            style={{
              width: '100%',
              aspectRatio: '16 / 10',
              borderRadius: '12px',
              display: 'block',
            }}
            aria-label={`${exercise.nameKo} · 3D ${cycle.label}`}
          />
          {!canvasReady && (
            <div className="sr-only">
              <ExerciseMotionArtwork exercise={exercise} phase={visualPhaseId} />
            </div>
          )}
          <figcaption className="teaching-live-diagram-single-caption">
            <span>{cycle.label}</span>
            {springsLabel ? <span>스프링 · {springsLabel}</span> : null}
          </figcaption>
        </figure>
      )}

      <div className="teaching-live-diagram-meta">
        <span className="teaching-live-diagram-anchor" data-testid="live-stage-diagram-anchors">
          ■ 3D 기구·동작 포인트: {APPARATUS_LABELS[exercise.apparatus].ko} · {rigMeta.poseFeatureKo}
        </span>
        <span
          className="teaching-live-diagram-review-badge"
          data-testid="live-stage-diagram-review-note"
        >
          3D 기하·기구접점 재구성됨 · 개인별 임상 각도는 강사 검토 필요
        </span>
      </div>
    </section>
  );
};
