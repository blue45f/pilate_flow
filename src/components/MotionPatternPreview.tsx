import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react';
import type { MotionPatternReference } from '../data/motionPatternReferences';
import { DraftPlaybackController } from '../models/DraftPlaybackController';
import type { DraftPlaybackState, DraftRepeatCount } from '../models/DraftPlaybackController';
import type { AnatomicalSide, DraftPhase } from '../models/types';
import { MotionDraftFigure } from './MotionDraftFigure';
import { MotionAuthoringBatchFigure } from './MotionAuthoringBatchFigure';
import { SupineReachFigure } from './SupineReachFigure';
import { MotionPhaseContextPanel } from './MotionPhaseContextPanel';
import '../styles/motion-pattern-preview.css';

interface PatternFigureProps {
  reference: MotionPatternReference;
  progress: number;
  activeSide?: AnatomicalSide;
  mirrored?: boolean;
  className?: string;
}

function PatternFigure({
  reference,
  progress,
  activeSide = 'left',
  mirrored = false,
  className,
}: PatternFigureProps) {
  const label = `${reference.title} · 관련 패턴 원본 도식 초안 · 전문가 미검토`;
  switch (reference.family) {
    case 'existing-proposal':
      return (
        <MotionDraftFigure
          draftId={reference.variantId}
          progress={progress}
          activeSide={activeSide}
          mirrored={mirrored}
          className={className}
          label={label}
        />
      );
    case 'authoring-batch':
      return (
        <MotionAuthoringBatchFigure
          variantId={reference.variantId}
          progress={progress}
          activeSide={activeSide}
          mirrored={mirrored}
          className={className}
          label={label}
        />
      );
    case 'supine-reach':
      return (
        <SupineReachFigure
          progress={progress}
          activeSide={activeSide}
          mirrored={mirrored}
          className={className}
          label={label}
        />
      );
  }
}

/** A deterministic still rendered from the selected asset's own authored geometry. */
export function MotionPatternThumbnail({
  reference,
  className = '',
}: {
  reference: MotionPatternReference;
  className?: string;
}) {
  const progress = reference.definition.phases.find((phase) => phase.id === 'turn')?.sample ?? 0.5;
  return (
    <div
      className={`motion-pattern-thumbnail ${className}`}
      data-motion-variant={reference.variantId}
      data-motion-family={reference.family}
    >
      <PatternFigure reference={reference} progress={progress} />
    </div>
  );
}

/** Inline reference viewer. No approval, sequencing or canonical asset state is written. */
export function MotionPatternPreview({
  reference,
  active = true,
}: {
  reference: MotionPatternReference;
  active?: boolean;
}) {
  return (
    <PatternPlayback
      key={`${reference.family}:${reference.variantId}`}
      reference={reference}
      active={active}
    />
  );
}

function PatternPlayback({
  reference,
  active,
}: {
  reference: MotionPatternReference;
  active: boolean;
}) {
  const id = useId();
  const wrapper = useRef<HTMLElement>(null);
  const [side, setSide] = useState<AnatomicalSide>('left');
  const [mirrored, setMirrored] = useState(false);
  const [staticOnly, setStaticOnly] = useState(false);
  const [repeatCount, setRepeatCount] = useState<DraftRepeatCount>(1);
  const [state, setState] = useState<DraftPlaybackState>({ progress: 0, speed: 1, playing: false });
  const [preference] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia?.('(prefers-reduced-motion: reduce)')
      : undefined,
  );
  const [reducedMotion, setReducedMotion] = useState(preference?.matches ?? false);
  const visible = useRef(true);
  const allowed = useRef(false);
  const [controller] = useState(
    () =>
      new DraftPlaybackController({
        requestFrame: (callback) => window.requestAnimationFrame(callback),
        cancelFrame: (frame) => window.cancelAnimationFrame(frame),
        onChange: setState,
        canPlay: () => false,
      }),
  );
  const definition = reference.definition;
  const phases: readonly DraftPhase[] = definition.phases;
  const phase = phases.find((item) => state.progress < item.end) ?? phases[phases.length - 1];
  const phaseIndex = Math.max(
    0,
    phases.findIndex((item) => item.id === phase.id),
  );
  const prevPhase = phases[phaseIndex - 1];
  const nextPhase = phases[phaseIndex + 1];
  const stillMode = reducedMotion || staticOnly;
  const solidFollowsSelectedSide =
    reference.family === 'existing-proposal' &&
    [
      'side-lying-clam',
      'side-lying-straight-leg-lift',
      'side-lying-open-book',
      'adult-supine-heel-slide',
      'supine-knee-fold',
    ].includes(reference.variantId);
  const solidSide = solidFollowsSelectedSide ? side : 'left';

  useLayoutEffect(() => {
    allowed.current = active && !stillMode;
    controller.setCanPlay(() => allowed.current && visible.current && !document.hidden);
    if (!allowed.current) controller.pause();
    return () => {
      allowed.current = false;
      controller.setCanPlay(() => false);
    };
  }, [active, controller, stillMode]);

  useEffect(() => {
    const changed = (event: MediaQueryListEvent) => {
      if (event.matches) {
        allowed.current = false;
        controller.pause();
      }
      setReducedMotion(event.matches);
    };
    preference?.addEventListener('change', changed);
    return () => preference?.removeEventListener('change', changed);
  }, [controller, preference]);

  useEffect(() => {
    const hidden = () => {
      if (document.hidden) controller.pause();
    };
    const pageHidden = () => controller.pause();
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(
            ([entry]) => {
              if (!entry) return;
              visible.current = entry.isIntersecting;
              if (!entry.isIntersecting) controller.pause();
            },
            { threshold: 0.01 },
          );
    if (wrapper.current) observer?.observe(wrapper.current);
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('pagehide', pageHidden);
    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('pagehide', pageHidden);
      controller.destroy();
    };
  }, [controller]);

  return (
    <section
      ref={wrapper}
      className="motion-pattern-preview"
      aria-labelledby={`${id}-title`}
      data-motion-variant={reference.variantId}
      data-motion-family={reference.family}
      data-exact-canonical-match="false"
      data-professional-review="unreviewed"
    >
      <header className="mpp-heading">
        <div>
          <p className="mpp-eyebrow">관련 패턴 · 원본 도식 초안</p>
          <h3 id={`${id}-title`}>{reference.title}</h3>
        </div>
        <span className="mpp-status">전문가 미검토</span>
      </header>
      <p className="mpp-variant">{reference.variant}</p>
      <p className="mpp-equipment">{reference.equipment.join(' · ')}</p>
      <figure className="mpp-figure">
        <PatternFigure
          reference={reference}
          progress={state.progress}
          activeSide={side}
          mirrored={mirrored}
        />
        <figcaption>
          {phase.labelKo ?? phase.label} <span>정확한 동작 시범으로 검증되지 않은 참고 도해</span>
        </figcaption>
      </figure>
      <p className="mpp-support">{definition.supportSummary ?? definition.supportNote}</p>
      <p className="mpp-anatomy">
        실선: 몸의 {solidSide === 'left' ? '왼쪽' : '오른쪽'} · 점선: 몸의{' '}
        {solidSide === 'left' ? '오른쪽' : '왼쪽'} · 화면 반전과 몸의 좌우는 별도입니다.
        {reference.family === 'supine-reach' && ' 두 겹 윤곽: 움직이는 다리.'}
      </p>
      <div className="mpp-controls" role="group" aria-label="관련 패턴 도해 재생">
        <button
          type="button"
          className="mpp-play"
          disabled={!active || stillMode}
          onClick={() => (state.playing ? controller.pause() : controller.play())}
        >
          {state.playing ? (
            <Pause size={17} aria-hidden="true" />
          ) : (
            <Play size={17} aria-hidden="true" />
          )}
          {state.playing ? '일시정지' : '한 주기 재생'}
        </button>
        <button
          type="button"
          className="mpp-reset"
          aria-label="관련 패턴 처음으로"
          onClick={() => controller.reset()}
        >
          <RotateCcw size={16} aria-hidden="true" />
        </button>
        <label>
          반복
          <select
            aria-label="관련 패턴 도해 반복"
            value={repeatCount}
            onChange={(event) => {
              const next = Number(event.target.value) as DraftRepeatCount;
              setRepeatCount(next);
              controller.setRepeatCount(next);
            }}
          >
            <option value="1">1회</option>
            <option value="2">2회</option>
            <option value="3">3회</option>
          </select>
        </label>
        <label>
          속도
          <select
            aria-label="관련 패턴 도해 속도"
            value={state.speed}
            onChange={(event) => controller.setSpeed(Number(event.target.value))}
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
          value={Math.round(state.progress * 1000)}
          aria-valuetext={`${Math.round(state.progress * 100)}퍼센트 · ${phase.labelKo ?? phase.label}`}
          onChange={(event) => controller.seek(Number(event.target.value) / 1000)}
        />
      </label>
      <div className="mpp-phase-stepper" role="group" aria-label="관련 패턴 단계 이동">
        <button
          type="button"
          aria-label="이전 도해 단계"
          disabled={!prevPhase}
          onClick={() => prevPhase && controller.seek(prevPhase.sample)}
        >
          <ChevronLeft size={15} aria-hidden="true" /> 이전 단계
        </button>
        <span className="mpp-phase-counter">
          단계 {phaseIndex + 1} / {phases.length} · {phase.labelKo ?? phase.label}
        </span>
        <button
          type="button"
          aria-label="다음 도해 단계"
          disabled={!nextPhase}
          onClick={() => nextPhase && controller.seek(nextPhase.sample)}
        >
          다음 단계 <ChevronRight size={15} aria-hidden="true" />
        </button>
      </div>
      <div className="mpp-phases" role="group" aria-label="관련 패턴 정지 단계">
        {phases.map((item) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={phase.id === item.id}
            onClick={() => controller.seek(item.sample)}
          >
            {item.labelKo ?? item.label}
          </button>
        ))}
      </div>
      <MotionPhaseContextPanel
        reference={reference}
        progress={state.progress}
        showCycleSupport={false}
      />
      <div className="mpp-view-options">
        {definition.sideMode === 'unilateral' && (
          <label>
            {definition.sideControlLabel ?? '움직이는 몸의 쪽'}
            <select
              aria-label="관련 패턴 해부학적 쪽"
              value={side}
              onChange={(event) => {
                controller.reset();
                setSide(event.target.value as AnatomicalSide);
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
              controller.reset();
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
              controller.pause();
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
            : state.playing
              ? repeatCount > 1
                ? `도해 반복 재생 중 (${controller.currentCycle()} / ${repeatCount}회)`
                : '도해 한 주기를 재생합니다.'
              : state.progress >= 1
                ? repeatCount > 1
                  ? `반복 재생 끝 (${repeatCount}회) · 일시정지`
                  : '한 주기 끝 · 일시정지'
                : repeatCount > 1
                  ? `일시정지 · ${repeatCount}회 반복 설정 · 자동 재생 없음`
                  : '일시정지 · 자동 재생 없음'}
      </p>
      <details className="mpp-source-details">
        <summary>변형 차이·제작 근거 보기</summary>
        <p>{reference.context}</p>
        <p>{definition.supportSummary ?? definition.supportNote}</p>
        <h4>참고한 패턴</h4>
        <ul>
          {definition.matched.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
        <h4>이 변형의 차이</h4>
        <ul>
          {definition.mismatched.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
        <h4>확인 전인 부분</h4>
        <ul>
          {definition.unknown.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
        <ul>
          {definition.sources.map((source) => (
            <li key={source.url}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.label} ↗
              </a>
              {source.context && <p>{source.context}</p>}
            </li>
          ))}
        </ul>
        <p>
          직접 만든 좌표와 도형입니다. 전문가 검토 0건 · 자동 추천 제외. 도해 한 주기 8초와 표시
          속도는 실제 수행 시간·횟수·호흡·기구 설정을 뜻하지 않습니다.
        </p>
        <dl className="mpp-asset-record">
          <dt>변형 ID</dt>
          <dd>
            <code>{reference.variantId}</code>
          </dd>
          <dt>애셋 버전</dt>
          <dd>{reference.assetVersion ?? '별도 버전 기록 없음'}</dd>
          <dt>애셋 SHA-256</dt>
          <dd>
            <code>{reference.assetSha256 ?? '별도 애셋 지문 기록 없음'}</code>
          </dd>
        </dl>
      </details>
    </section>
  );
}
