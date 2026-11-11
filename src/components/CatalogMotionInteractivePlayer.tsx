import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react';
import type { CatalogContinuousMotionAsset } from '../data/catalogMotionAssets';
import type { CatalogMovementVisualAsset, VisualPhaseId } from '../data/movementVisualRigCatalog';
import { MovementPhaseDiagramSvg } from './MovementPhaseDiagramSvg';

export interface CatalogMotionThumbnailProps {
  asset: CatalogContinuousMotionAsset;
  className?: string;
}

export function CatalogMotionThumbnail({
  asset,
  className = '',
}: CatalogMotionThumbnailProps): React.JSX.Element {
  const [hoverProgress, setHoverProgress] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const stopHoverLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    startTimeRef.current = null;
    setHoverProgress(null);
  }, []);

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
      if (
        typeof window === 'undefined' ||
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ) {
        return;
      }
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      startTimeRef.current = null;

      const cycleMs = 4200;
      const step = (now: number) => {
        if (startTimeRef.current === null) {
          startTimeRef.current = now;
        }
        const elapsed = Math.max(0, now - startTimeRef.current);
        const nextP = (elapsed % cycleMs) / cycleMs;
        setHoverProgress(nextP);
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [],
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
      className={`motion-pattern-thumbnail catalog-motion-thumbnail ${
        sampledHover ? 'is-hover-playing' : ''
      } ${className}`.trim()}
      data-motion-variant={asset.variantId}
      data-motion-family="catalog-kinematic"
      data-exercise-id={asset.exerciseId}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={stopHoverLoop}
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
}

type CatalogRepeatMode = 1 | 2 | 3 | 'loop';

export function CatalogMotionInteractivePlayer({
  asset,
  active = true,
  className = '',
}: CatalogMotionInteractivePlayerProps): React.JSX.Element {
  const id = useId();
  const wrapperRef = useRef<HTMLElement>(null);
  const frameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
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
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
  );

  const stillMode = reducedMotion || staticOnly;

  const cancelFrame = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
    }
    frameRef.current = null;
    lastTimestampRef.current = null;
  }, []);

  const pause = useCallback(() => {
    clockRef.current.playing = false;
    cancelFrame();
    setPlaying(false);
  }, [cancelFrame]);

  const seek = useCallback(
    (nextValue: number) => {
      const clamped = Math.max(0, Math.min(1, Number(nextValue.toFixed(4))));
      pause();
      clockRef.current.progress = clamped;
      clockRef.current.cycleIndex = 1;
      setCycleIndex(1);
      setProgress(clamped);
    },
    [pause],
  );

  useEffect(() => {
    if (!active && clockRef.current.playing) {
      pause();
    }
  }, [active, pause]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const handleChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
      if (event.matches) {
        pause();
      }
    };
    preference?.addEventListener('change', handleChange);
    return () => preference?.removeEventListener('change', handleChange);
  }, [pause]);

  useEffect(() => {
    const mountedClock = clockRef.current;
    const handleVisibility = () => {
      if (document.hidden) pause();
    };
    const handlePageHide = () => pause();
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      mountedClock.playing = false;
      cancelFrame();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [cancelFrame, pause]);

  const togglePlay = () => {
    if (clockRef.current.playing) {
      pause();
      return;
    }
    if (!active || stillMode || document.hidden) return;
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
      if (!clockRef.current.playing || !active || stillMode || document.hidden) {
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
            const wrapped = rawNext % 1;
            clockRef.current.cycleIndex += 1;
            clockRef.current.progress = wrapped;
            setCycleIndex(clockRef.current.cycleIndex);
            setProgress(wrapped);
          } else {
            clockRef.current.progress = 1;
            setProgress(1);
            pause();
            return;
          }
        } else {
          clockRef.current.progress = rawNext;
          setProgress(rawNext);
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
    : repeat === 'loop'
      ? '연속 반복 재생'
      : repeat > 1
        ? `${repeat}회 반복 재생`
        : '한 주기 재생';

  return (
    <section
      ref={wrapperRef}
      className={`motion-pattern-preview catalog-motion-interactive-player ${className}`.trim()}
      aria-label="관련 패턴 모션 초안"
      data-testid="catalog-motion-interactive-player"
      data-exercise-id={asset.exerciseId}
      data-motion-variant={asset.variantId}
      data-motion-family="catalog-kinematic"
      data-motion-status="authored-kinematic-guide"
      data-exact-canonical-match="false"
      data-professional-review="unreviewed"
      data-true-3d="false"
      data-manual-ready="false"
    >
      <header className="mpp-heading">
        <div>
          <p className="mpp-eyebrow">STUDIO KINEMATIC 5-PHASE · 기구학 연속 도해</p>
          <h3 id={`${id}-title`}>{asset.titleKo}</h3>
        </div>
        <span className="mpp-status">출처 대조 완료 · 전문가 검수 전</span>
      </header>
      <p className="mpp-variant">{asset.motionSubtitleKo}</p>
      <p className="mpp-equipment">{asset.apparatusControlNoteKo}</p>

      <figure className="mpp-figure">
        <MovementPhaseDiagramSvg
          asset={interpolatedVisualAsset}
          phase={sampledPose.visualPhaseId}
          activeSide={side}
          mirrored={mirrored}
          showAlignment
          showDirection
          showMuscles
          showGhostStartPose
          label={`${asset.titleKo} · ${sampledPose.phase.labelKo}`}
        />
        <figcaption>
          {sampledPose.phase.labelKo} <span>{sampledPose.phase.cueKo}</span>
        </figcaption>
      </figure>

      <p className="mpp-support">{asset.biomechFocusKo}</p>

      <div className="mpp-controls" role="group" aria-label="기구학 도해 재생 제어">
        <button
          type="button"
          className="mpp-play"
          disabled={!active || stillMode}
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
              if (![0.5, 0.75, 1].includes(nextSpeed)) return;
              clockRef.current.speed = nextSpeed;
              setSpeed(nextSpeed);
              pause();
            }}
          >
            <option value="0.5">0.5×</option>
            <option value="0.75">0.75×</option>
            <option value="1">1×</option>
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
          onChange={(event) => seek(Number(event.target.value) / 1000)}
        />
      </label>

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
        {asset.phases.map((item) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={sampledPose.phase.id === item.id}
            onClick={() => seek(item.sample)}
          >
            {item.labelKo}
          </button>
        ))}
      </div>

      <div className="mpp-view-options">
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

      {/* 3-Phase Quick Still Cards */}
      <div
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
            { phaseId: 'start' as VisualPhaseId, label: '시작 자세', sample: 0.06 },
            { phaseId: 'middle' as VisualPhaseId, label: '중간 정점 자세', sample: 0.5 },
            { phaseId: 'end' as VisualPhaseId, label: '끝 복귀 자세', sample: 0.94 },
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
              style={{ minHeight: '44px', width: '100%', marginBottom: '6px' }}
              onClick={() => seek(stage.sample)}
            >
              {stage.label} 보기
            </button>
            <MovementPhaseDiagramSvg
              asset={asset.visualAsset}
              phase={stage.phaseId}
              activeSide={side}
              mirrored={mirrored}
              compact
            />
          </div>
        ))}
      </div>

      <details className="mpp-source-details">
        <summary>출처 대조 · 기구 세팅 · 제작 근거 보기</summary>
        <p>
          <strong>{asset.sourceVerificationCategoryKo}</strong> (대조 기준일: {asset.auditCheckedAt})
        </p>
        <p>{asset.apparatusControlNoteKo}</p>
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
