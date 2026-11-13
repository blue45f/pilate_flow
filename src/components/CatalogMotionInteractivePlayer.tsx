import React, { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  StepBack,
  StepForward,
} from 'lucide-react';
import type { CatalogContinuousMotionAsset } from '../data/catalogMotionAssets';
import type { CatalogMovementVisualAsset, VisualPhaseId } from '../data/movementVisualRigCatalog';
import { getMovementVisualAsset } from '../data/movementVisualRigCatalog';
import { getExpandedMovementVisualBinding } from '../data/expandedMovementVisualBindings';
import { ApparatusIllustrationSvg } from './ApparatusStudioArtwork';
import { MovementPhaseDiagramSvg } from './MovementPhaseDiagramSvg';
import { MotionSourceOnlyNotice } from './MotionSourceOnlyNotice';
import { useMotionPlaybackEnvironment } from '../hooks/useMotionPlaybackEnvironment';
import '../styles/motion-pattern-preview.css';
import '../styles/studio-motion-study.css';
import '../styles/exercise-motion-artwork.css';

const StillMovementPhaseDiagram = memo(MovementPhaseDiagramSvg);
const PREVIEW_FRAME_RATE = 60;
const RENDER_INTERVAL_MS = 1000 / PREVIEW_FRAME_RATE;
const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.5] as const;

export interface CatalogMotionThumbnailProps {
  asset: CatalogContinuousMotionAsset;
  className?: string;
}

export function CatalogMotionThumbnail({
  asset,
  className = '',
}: CatalogMotionThumbnailProps): React.JSX.Element {
  if (getExpandedMovementVisualBinding(asset.exerciseId)?.nativeMotionAvailable === false) {
    return (
      <div
        className={`motion-pattern-thumbnail catalog-motion-thumbnail exercise-motion-artwork ${className}`.trim()}
        data-exercise-id={asset.exerciseId}
        data-match-scope="source-video-only"
        data-native-motion-available="false"
        role="img"
        aria-label={`${asset.visualAsset.nameKo} · 영상으로 동작 확인`}
      >
        <ApparatusIllustrationSvg apparatus={asset.apparatus} />
        <span className="exercise-motion-artwork__label">
          <strong>영상 참고</strong>
        </span>
      </div>
    );
  }
  return <CatalogMotionThumbnailContent asset={asset} className={className} />;
}

function CatalogMotionThumbnailContent({
  asset,
  className = '',
}: CatalogMotionThumbnailProps): React.JSX.Element {
  const [hoverProgress, setHoverProgress] = useState<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const lastPaintRef = useRef<number | null>(null);

  const stopHoverLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    startTimeRef.current = null;
    lastPaintRef.current = null;
    setHoverProgress(null);
  }, []);
  const { canAnimate } = useMotionPlaybackEnvironment(wrapperRef, stopHoverLoop);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const handlePointerEnter = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType && event.pointerType !== 'mouse') return;
      if (!canAnimate) return;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      startTimeRef.current = null;
      lastPaintRef.current = null;

      const cycleMs = asset.durationMs;
      const step = (now: number) => {
        if (document.hidden) {
          stopHoverLoop();
          return;
        }
        if (startTimeRef.current === null) {
          startTimeRef.current = now;
        }
        const elapsed = Math.max(0, now - startTimeRef.current);
        if (
          lastPaintRef.current === null ||
          now - lastPaintRef.current >= RENDER_INTERVAL_MS - 0.5
        ) {
          setHoverProgress((elapsed % cycleMs) / cycleMs);
          lastPaintRef.current = now;
        }
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [asset.durationMs, canAnimate, stopHoverLoop],
  );

  const sampledHover = useMemo(
    () => (hoverProgress !== null ? asset.samplePose(hoverProgress) : null),
    [asset, hoverProgress],
  );

  const effectiveAsset: CatalogMovementVisualAsset = useMemo(() => {
    if (!sampledHover) return asset.visualAsset;
    return {
      ...asset.visualAsset,
      phases: {
        ...asset.visualAsset.phases,
        [sampledHover.visualPhaseId]: sampledHover.interpolatedPhaseSpec,
      },
    };
  }, [asset.visualAsset, sampledHover]);

  return (
    <div
      ref={wrapperRef}
      className={`motion-pattern-thumbnail catalog-motion-thumbnail ${
        sampledHover ? 'is-hover-playing' : ''
      } ${className}`.trim()}
      data-motion-variant={asset.variantId}
      data-motion-family="catalog-kinematic"
      data-exercise-id={asset.exerciseId}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={stopHoverLoop}
      onPointerCancel={stopHoverLoop}
    >
      <MovementPhaseDiagramSvg
        asset={effectiveAsset}
        phase={sampledHover ? sampledHover.visualPhaseId : 'middle'}
        compact
        showGhostStartPose
        label={`${asset.titleKo} · 정점 단계 도해`}
      />
    </div>
  );
}

export interface CatalogMotionInteractivePlayerProps {
  asset: CatalogContinuousMotionAsset;
  active?: boolean;
  className?: string;
  presentation?: 'reference' | 'studio';
  compact?: boolean;
  representative?: boolean;
}

type CatalogRepeatMode = 1 | 2 | 3 | 'loop';

export function CatalogMotionInteractivePlayer({
  asset,
  ...props
}: CatalogMotionInteractivePlayerProps): React.JSX.Element {
  const binding = getExpandedMovementVisualBinding(asset.exerciseId);
  if (binding?.nativeMotionAvailable === false) {
    return (
      <MotionSourceOnlyNotice
        exerciseId={asset.exerciseId}
        nameKo={asset.visualAsset.nameKo}
        apparatus={asset.apparatus}
        reasonKo={binding.reasonKo}
        sourceUrl={binding.sourceUrl}
        className={props.className}
      />
    );
  }
  return (
    <CatalogMotionInteractivePlayerContent
      key={`${asset.exerciseId}:${asset.variantId}:${asset.factualRecordSha256}`}
      asset={asset}
      {...props}
    />
  );
}

function CatalogMotionInteractivePlayerContent({
  asset,
  active = true,
  className = '',
  presentation = 'reference',
  compact = false,
  representative = /^expanded-|^crawled-/.test(asset.exerciseId) ||
    !getMovementVisualAsset(asset.exerciseId),
}: CatalogMotionInteractivePlayerProps): React.JSX.Element {
  const id = useId();
  const wrapperRef = useRef<HTMLElement>(null);
  const frameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const lastPaintRef = useRef<number | null>(null);
  const clockRef = useRef<{
    progress: number;
    playing: boolean;
    speed: number;
    repeat: CatalogRepeatMode;
    cycleIndex: number;
  }>({
    progress: 0,
    playing: false,
    speed: 1,
    repeat: 1,
    cycleIndex: 1,
  });

  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [repeat, setRepeat] = useState<CatalogRepeatMode>(1);
  const [cycleIndex, setCycleIndex] = useState<number>(1);
  const [side, setSide] = useState<'left' | 'right'>('right');
  const [mirrored, setMirrored] = useState(false);
  const [staticOnly, setStaticOnly] = useState(false);
  const [showGuides, setShowGuides] = useState(presentation !== 'studio');
  const [showMuscles, setShowMuscles] = useState(presentation !== 'studio');
  const [showTrail, setShowTrail] = useState(presentation !== 'studio');
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const isStudio = presentation === 'studio';
  const frameCount = Math.round((asset.durationMs / 1000) * PREVIEW_FRAME_RATE);
  const transitionFrames = asset.keyframes.filter(
    (frame, index, frames) =>
      frame.provenance === 'procedural-transition' &&
      frames.findIndex((candidate) => candidate.labelKo === frame.labelKo) === index,
  );

  const cancelFrame = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
    }
    frameRef.current = null;
    lastTimestampRef.current = null;
    lastPaintRef.current = null;
  }, []);

  const pause = useCallback(() => {
    clockRef.current.playing = false;
    cancelFrame();
    setPlaying(false);
  }, [cancelFrame]);
  const { canAnimate, reducedMotion } = useMotionPlaybackEnvironment(wrapperRef, pause);
  const stillMode = reducedMotion || staticOnly;

  const seek = useCallback(
    (nextValue: number) => {
      const clamped = Math.max(0, Math.min(1, Number.isFinite(nextValue) ? nextValue : 0));
      pause();
      clockRef.current.progress = clamped;
      clockRef.current.cycleIndex = 1;
      setCycleIndex(1);
      setProgress(clamped);
    },
    [pause],
  );

  const stepFrame = (direction: -1 | 1) => {
    const currentFrame = clockRef.current.progress * frameCount;
    const nextFrame =
      direction > 0
        ? Math.floor(currentFrame + 0.000001) + 1
        : Math.ceil(currentFrame - 0.000001) - 1;
    seek(nextFrame / frameCount);
  };

  useEffect(() => {
    if (!active && clockRef.current.playing) {
      pause();
    }
  }, [active, pause]);

  useEffect(() => {
    const mountedClock = clockRef.current;
    return () => {
      mountedClock.playing = false;
      cancelFrame();
    };
  }, [cancelFrame]);

  const togglePlay = () => {
    if (clockRef.current.playing) {
      pause();
      return;
    }
    if (!active || stillMode || !canAnimate) return;
    if (clockRef.current.progress >= 1) {
      clockRef.current.progress = 0;
      clockRef.current.cycleIndex = 1;
      setCycleIndex(1);
      setProgress(0);
    }
    clockRef.current.playing = true;
    setPlaying(true);
    lastTimestampRef.current = null;

    const tick = (now: number) => {
      frameRef.current = null;
      if (!clockRef.current.playing || !active || stillMode || !canAnimate || document.hidden) {
        pause();
        return;
      }
      if (lastTimestampRef.current !== null) {
        const dt = Math.max(0, now - lastTimestampRef.current);
        const rawNext =
          clockRef.current.progress + (dt / asset.durationMs) * clockRef.current.speed;
        const currentRepeat = clockRef.current.repeat;

        if (rawNext >= 1) {
          if (currentRepeat === 'loop') {
            const wrapped = rawNext % 1;
            clockRef.current.progress = wrapped;
            setProgress(wrapped);
          } else if (clockRef.current.cycleIndex < currentRepeat) {
            const nextCycle = clockRef.current.cycleIndex + Math.floor(rawNext);
            if (nextCycle > currentRepeat) {
              clockRef.current.progress = 1;
              clockRef.current.cycleIndex = currentRepeat;
              setCycleIndex(currentRepeat);
              setProgress(1);
              pause();
              return;
            }
            clockRef.current.cycleIndex = nextCycle;
            clockRef.current.progress = rawNext % 1;
            setCycleIndex(nextCycle);
            setProgress(clockRef.current.progress);
          } else {
            clockRef.current.progress = 1;
            setProgress(1);
            pause();
            return;
          }
        } else {
          clockRef.current.progress = rawNext;
          if (
            lastPaintRef.current === null ||
            now - lastPaintRef.current >= RENDER_INTERVAL_MS - 0.5
          ) {
            setProgress(rawNext);
            lastPaintRef.current = now;
          }
        }
      }
      lastTimestampRef.current = now;
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  };

  const sampledPose = useMemo(() => asset.samplePose(progress), [asset, progress]);

  const interpolatedVisualAsset: CatalogMovementVisualAsset = useMemo(
    () => ({
      ...asset.visualAsset,
      phases: {
        ...asset.visualAsset.phases,
        [sampledPose.visualPhaseId]: sampledPose.interpolatedPhaseSpec,
      },
    }),
    [asset.visualAsset, sampledPose],
  );

  const phaseIndex = asset.phases.findIndex((p) => p.id === sampledPose.phase.id);
  const prevPhase = asset.phases[phaseIndex - 1];
  const nextPhase = asset.phases[phaseIndex + 1];

  const playButtonLabel = playing
    ? '일시정지'
    : isStudio
      ? '모션 재생'
      : repeat === 'loop'
        ? '연속 반복 재생'
        : repeat > 1
          ? `${repeat}회 반복 재생`
          : '한 주기 재생';

  return (
    <section
      ref={wrapperRef}
      className={`motion-pattern-preview catalog-motion-interactive-player ${isStudio ? 'is-studio' : ''} ${compact ? 'is-compact' : ''} ${className}`.trim()}
      aria-label={
        isStudio ? `${asset.visualAsset.nameKo} 동작 프레임 플레이어` : '관련 패턴 모션 초안'
      }
      data-testid={isStudio ? 'studio-motion-study-player' : 'catalog-motion-interactive-player'}
      data-exercise-id={asset.exerciseId}
      data-motion-variant={asset.variantId}
      data-motion-family="catalog-kinematic"
      data-motion-status="authored-kinematic-guide"
      data-exact-canonical-match="false"
      data-professional-review="unreviewed"
      data-true-3d="false"
      data-manual-ready="false"
      data-motion-playing={playing && canAnimate && !stillMode}
      data-motion-progress={progress}
      data-match-scope={representative ? 'representative-pattern' : 'catalog-authored-pattern'}
    >
      <header className="mpp-heading">
        <div>
          <p className="mpp-eyebrow">
            {isStudio
              ? 'MOTION STUDY · 5단계 동작'
              : '기구학 5단계 연속·3단계 도해 · 출처 대조 확인'}
          </p>
          <h3 id={`${id}-title`}>
            {representative
              ? asset.visualAsset.archetypeTitleKo
              : isStudio
                ? asset.visualAsset.nameKo
                : asset.titleKo}
          </h3>
        </div>
        <span className="mpp-status">
          {representative
            ? '대표 패턴 참고'
            : isStudio
              ? '동작 패턴 참고'
              : '출처 대조 완료 · 전문가 검수 전'}
        </span>
      </header>
      {representative && (
        <p className="mpp-representative-note">
          기구·자세가 유사한 대표 패턴입니다. 이 동작의 세부 수행은 연결 영상에서 확인하세요.
        </p>
      )}
      {!isStudio && <p className="mpp-variant">{asset.motionSubtitleKo}</p>}
      {!isStudio && <p className="mpp-equipment">{asset.apparatusControlNoteKo}</p>}

      <figure className="mpp-figure">
        <MovementPhaseDiagramSvg
          asset={interpolatedVisualAsset}
          phase={sampledPose.visualPhaseId}
          activeSide={side}
          mirrored={mirrored}
          showAlignment={showGuides}
          showDirection={showGuides}
          showMuscles={showMuscles}
          showGhostStartPose={showTrail}
          label={`${representative ? asset.visualAsset.archetypeTitleKo : asset.titleKo} · ${sampledPose.phase.labelKo}`}
        />
        <figcaption>
          {sampledPose.phase.labelKo} <span>{sampledPose.phase.cueKo}</span>
        </figcaption>
      </figure>

      {!isStudio && <p className="mpp-support">{asset.biomechFocusKo}</p>}

      <div className="mpp-controls" role="group" aria-label="기구학 도해 재생 제어">
        <button
          type="button"
          className="mpp-play"
          disabled={!active || stillMode || !canAnimate}
          onClick={togglePlay}
        >
          {playing ? <Pause size={17} aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}
          {playButtonLabel}
        </button>
        <button
          type="button"
          className="mpp-reset"
          aria-label="관련 패턴 처음으로"
          onClick={() => seek(0)}
        >
          <RotateCcw size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="mpp-frame-step"
          aria-label="이전 프레임"
          disabled={progress <= 0}
          onClick={() => stepFrame(-1)}
        >
          <StepBack size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="mpp-frame-step"
          aria-label="다음 프레임"
          disabled={progress >= 1}
          onClick={() => stepFrame(1)}
        >
          <StepForward size={16} aria-hidden="true" />
        </button>
        <label>
          반복
          <select
            aria-label="관련 패턴 도해 반복"
            value={String(repeat)}
            onChange={(event) => {
              const raw = event.target.value;
              const nextRepeat: CatalogRepeatMode =
                raw === 'loop' ? 'loop' : raw === '2' ? 2 : raw === '3' ? 3 : 1;
              clockRef.current.repeat = nextRepeat;
              clockRef.current.cycleIndex = 1;
              setRepeat(nextRepeat);
              setCycleIndex(1);
              seek(0);
            }}
          >
            <option value="1">1회</option>
            <option value="2">2회</option>
            <option value="3">3회</option>
            <option value="loop">연속</option>
          </select>
        </label>
        <label>
          속도
          <select
            aria-label="관련 패턴 도해 속도"
            value={speed}
            onChange={(event) => {
              const nextSpeed = Number(event.target.value);
              if (!PLAYBACK_SPEEDS.some((allowedSpeed) => allowedSpeed === nextSpeed)) return;
              clockRef.current.speed = nextSpeed;
              setSpeed(nextSpeed);
              pause();
            }}
          >
            {PLAYBACK_SPEEDS.map((allowedSpeed) => (
              <option key={allowedSpeed} value={allowedSpeed}>
                {allowedSpeed}×
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mpp-seek" htmlFor={`${id}-seek`}>
        도해 위치
        <input
          id={`${id}-seek`}
          type="range"
          min="0"
          max="1000"
          step="1"
          value={Math.round(progress * 1000)}
          aria-valuetext={`${Math.round(progress * 100)}퍼센트 · ${sampledPose.phase.labelKo}`}
          aria-describedby={`${id}-frame-help`}
          onChange={(event) => seek(Number(event.target.value) / 1000)}
          onKeyDown={(event) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            event.preventDefault();
            stepFrame(event.key === 'ArrowLeft' ? -1 : 1);
          }}
        />
      </label>
      <div className="mpp-frame-readout" aria-live="off">
        <span>
          프레임 {Math.round(progress * frameCount)} / {frameCount}
        </span>
        <span>
          {((progress * asset.durationMs) / 1000).toFixed(2)} /{' '}
          {(asset.durationMs / 1000).toFixed(0)}초
        </span>
      </div>
      <p id={`${id}-frame-help`} className="sr-only">
        좌우 방향키로 한 프레임씩 이동합니다. 재생 시간은 참고 모션의 길이입니다.
      </p>

      <div className="mpp-phase-stepper" role="group" aria-label="도해 단계 이동">
        <button
          type="button"
          aria-label="이전 도해 단계"
          disabled={!prevPhase}
          onClick={() => prevPhase && seek(prevPhase.sample)}
        >
          <ChevronLeft size={15} aria-hidden="true" /> 이전 단계
        </button>
        <span className="mpp-phase-counter">
          단계 {phaseIndex + 1} / {asset.phases.length} · {sampledPose.phase.labelKo}
        </span>
        <button
          type="button"
          aria-label="다음 도해 단계"
          disabled={!nextPhase}
          onClick={() => nextPhase && seek(nextPhase.sample)}
        >
          다음 단계 <ChevronRight size={15} aria-hidden="true" />
        </button>
      </div>

      <div className="mpp-phases" role="group" aria-label="관련 패턴 정지 단계">
        {asset.phases.map((item, index) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={sampledPose.phase.id === item.id}
            aria-label={item.labelKo}
            onClick={() => seek(item.sample)}
          >
            {isStudio && (
              <span className="mpp-phase-number">{String(index + 1).padStart(2, '0')}</span>
            )}
            {isStudio
              ? [
                  '준비',
                  '움직임',
                  '정점',
                  asset.finishBehavior === 'hold-return' ? '복귀' : '종료 자세',
                  asset.finishBehavior === 'alternate-side' ? '반대쪽 연결' : '마무리',
                ][index]
              : item.labelKo}
          </button>
        ))}
      </div>

      {transitionFrames.length > 0 && (
        <div className="mpp-transitions" role="group" aria-label="연결 자세 이동">
          <span>연결 자세</span>
          {transitionFrames.map((frame) => (
            <button
              key={frame.id}
              type="button"
              aria-pressed={Math.abs(progress - frame.progress) < 0.015}
              onClick={() => seek(frame.progress)}
            >
              {frame.labelKo}
            </button>
          ))}
        </div>
      )}

      <div className="mpp-view-options">
        <label>
          <input
            type="checkbox"
            checked={showGuides}
            onChange={(event) => setShowGuides(event.target.checked)}
          />
          정렬·방향 가이드
        </label>
        <label>
          <input
            type="checkbox"
            checked={showMuscles}
            onChange={(event) => setShowMuscles(event.target.checked)}
          />
          근육 표시
        </label>
        <label>
          <input
            type="checkbox"
            checked={showTrail}
            onChange={(event) => setShowTrail(event.target.checked)}
          />
          시작 자세 겹쳐 보기
        </label>
        {asset.sideMode === 'unilateral' && (
          <label>
            움직이는 몸의 쪽
            <select
              aria-label="관련 패턴 해부학적 쪽"
              value={side}
              onChange={(event) => {
                seek(0);
                setSide(event.target.value as 'left' | 'right');
              }}
            >
              <option value="left">몸의 왼쪽</option>
              <option value="right">몸의 오른쪽</option>
            </select>
          </label>
        )}
        <label>
          <input
            type="checkbox"
            checked={mirrored}
            onChange={(event) => {
              seek(0);
              setMirrored(event.target.checked);
            }}
          />
          화면만 좌우 반전
        </label>
        <label>
          <input
            type="checkbox"
            checked={stillMode}
            disabled={reducedMotion}
            onChange={(event) => {
              pause();
              setStaticOnly(event.target.checked);
            }}
          />
          정지 화면만 보기
        </label>
      </div>

      <p className="mpp-playback-state" role="status" aria-live="polite">
        {reducedMotion
          ? '동작 줄이기 설정 · 정지 단계로 살펴보세요.'
          : staticOnly
            ? '정지 화면 모드 · 단계나 위치를 선택하세요.'
            : playing
              ? repeat === 'loop'
                ? '도해를 연속 반복 재생합니다.'
                : repeat > 1
                  ? `도해 반복 재생 중 (${cycleIndex} / ${repeat}회)`
                  : '도해 한 주기를 재생합니다.'
              : progress >= 1
                ? repeat !== 'loop' && repeat > 1
                  ? `반복 재생 끝 (${repeat}회) · 일시정지`
                  : '한 주기 끝 · 일시정지'
                : '일시정지 · 자동 재생 없음'}
      </p>

      {!isStudio && (
        <p
          className="mpp-cycle-continuity"
          data-testid="catalog-motion-cycle-continuity"
          style={{
            margin: '6px 0 4px',
            fontSize: '0.78rem',
            color: 'var(--pf-color-text-secondary, #47584d)',
          }}
        >
          시작 정렬 → 정점 유지 → {asset.endPoseLabelKo}(
          {Math.round(asset.authoredEndProgress * 100)}%)
          {' → '}
          {asset.finishBehavior === 'alternate-side' ? '반대쪽 연결' : '시작 자세로 마무리'}. 도해
          주기는 {Number((asset.durationMs / 1000).toFixed(1))}초이며 수업 시간과 별도로 재생됩니다.
        </p>
      )}

      {/* 3-Phase Quick Still Cards */}
      {isStudio && (
        <button
          type="button"
          className="mpp-compare-toggle"
          aria-expanded={comparisonOpen}
          aria-controls={`${id}-still-comparison`}
          onClick={() => setComparisonOpen((previous) => !previous)}
        >
          {comparisonOpen ? '단계 비교 접기' : '시작·정점·종료 한눈에 비교'}
        </button>
      )}
      {(!isStudio || comparisonOpen) && (
        <div
          id={`${id}-still-comparison`}
          className="motion-reference-stills"
          aria-label="시작·중간·끝 3단계 정지 도해"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '8px',
            marginTop: '8px',
          }}
        >
          {(
            [
              {
                phaseId: 'start' as VisualPhaseId,
                label: '시작 자세',
                badge: '1 시작 정렬',
                sample: asset.phases[0].sample,
                ghost: false,
              },
              {
                phaseId: 'middle' as VisualPhaseId,
                label: '중간 정점 자세',
                badge: '2 정점 가동',
                sample:
                  asset.keyframes.find(
                    (frame) =>
                      frame.visualPhaseId === 'middle' && frame.provenance === 'catalog-pose',
                  )?.progress ?? asset.phases[2].sample,
                ghost: true,
              },
              {
                phaseId: 'end' as VisualPhaseId,
                label: asset.endPoseLabelKo,
                badge:
                  asset.finishBehavior === 'hold-return' ? '3 복귀 유지' : '3 종료 후 준비로 연결',
                sample: asset.authoredEndProgress,
                ghost: true,
              },
            ] as const
          ).map((stage) => (
            <div
              key={stage.phaseId}
              className="mpp-still-stage-card"
              style={{
                padding: '8px',
                borderRadius: '10px',
                border: '1px solid var(--pf-color-border-default, #D5DDD0)',
                backgroundColor: 'var(--pf-color-bg-surface, #FFFEF9)',
              }}
            >
              <button
                type="button"
                className="mpp-still-stage-btn"
                aria-pressed={Math.abs(progress - stage.sample) < 0.04}
                style={{ minHeight: '44px', width: '100%', marginBottom: '6px' }}
                onClick={() => seek(stage.sample)}
              >
                {stage.label} 보기 ({stage.badge})
              </button>
              <StillMovementPhaseDiagram
                asset={asset.visualAsset}
                phase={stage.phaseId}
                activeSide={side}
                mirrored={mirrored}
                showGhostStartPose={stage.ghost}
                compact
              />
            </div>
          ))}
        </div>
      )}

      <details className="mpp-source-details">
        <summary>
          {representative
            ? '대표 패턴 · 공통 참고자료 보기'
            : '출처 대조 · 기구 세팅 · 제작 근거 보기'}
        </summary>
        {!representative && (
          <p>
            <strong>{asset.sourceVerificationCategoryKo}</strong> (대조 기준일:{' '}
            {asset.auditCheckedAt})
          </p>
        )}
        <p>
          {representative
            ? `${asset.visualAsset.archetypeTitleKo}의 공통 패턴을 표시합니다. 동작별 전용 모션이나 영상과 일치하는 프레임으로 검증된 자료는 아닙니다.`
            : asset.apparatusControlNoteKo}
        </p>
        <ul>
          {asset.matchedReliableSources.map((src) => (
            <li key={src.id}>
              <a href={src.url} target="_blank" rel="noopener noreferrer">
                {src.titleKo} ({src.publisherKo}) ↗
              </a>
            </li>
          ))}
        </ul>
        <dl className="mpp-asset-record">
          <dt>도해 변형 ID</dt>
          <dd>
            <code>{asset.variantId}</code>
          </dd>
          <dt>아키타입 ID</dt>
          <dd>
            <code>{asset.visualAsset.archetypeId}</code>
          </dd>
          <dt>원장 검증 SHA-256</dt>
          <dd>
            <code>{asset.factualRecordSha256}</code>
          </dd>
        </dl>
      </details>
    </section>
  );
}
