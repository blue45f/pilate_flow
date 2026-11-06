import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { BATCH_VARIANTS } from '../data/motionAuthoringBatch';
import { BATCH_PHASES } from '../models/motionAuthoringBatch';
import type { BatchSide, BatchVariantId } from '../models/motionAuthoringBatch';
import { DraftPlaybackController } from '../models/DraftPlaybackController';
import type { DraftPlaybackState } from '../models/DraftPlaybackController';
import { MotionAuthoringBatchFigure } from './MotionAuthoringBatchFigure';
import '../styles/motion-authoring-batch.css';

export interface MotionAuthoringBatchPlayerProps {
  variantId?: BatchVariantId;
  onVariantChange?: (id: BatchVariantId) => void;
  active?: boolean;
  className?: string;
}

/** Isolated draft review surface. State is ephemeral and never grants exercise approval. */
export function MotionAuthoringBatchPlayer({
  variantId,
  onVariantChange,
  active = true,
  className = '',
}: MotionAuthoringBatchPlayerProps) {
  const id = useId();
  const wrapper = useRef<HTMLElement>(null);
  const [localSelectedId, setSelectedId] = useState<BatchVariantId>(
    variantId ?? BATCH_VARIANTS[0].id,
  );
  const selectedId = variantId ?? localSelectedId;
  const [activeSide, setActiveSide] = useState<BatchSide>('left');
  const [mirrored, setMirrored] = useState(false);
  const [staticOnly, setStaticOnly] = useState(false);
  const [state, setState] = useState<DraftPlaybackState>({ progress: 0, speed: 1, playing: false });
  const [preference] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null,
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
  const selected = BATCH_VARIANTS.find((entry) => entry.id === selectedId) ?? BATCH_VARIANTS[0];
  const phases = BATCH_PHASES[selected.id];
  const phase = phases.find((entry) => state.progress < entry.end) ?? phases[phases.length - 1];
  const stillMode = reducedMotion || staticOnly;

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
    if (!variantId) return;
    controller.reset();
  }, [controller, variantId]);

  useEffect(() => {
    const change = (event: MediaQueryListEvent) => {
      if (event.matches) {
        allowed.current = false;
        controller.pause();
      }
      setReducedMotion(event.matches);
    };
    preference?.addEventListener('change', change);
    return () => preference?.removeEventListener('change', change);
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

  const chooseVariant = (value: BatchVariantId) => {
    controller.reset();
    setSelectedId(value);
    onVariantChange?.(value);
  };

  return (
    <section
      ref={wrapper}
      className={`motion-authoring-batch ${className}`}
      aria-labelledby={`${id}-title`}
      data-motion-review-status="unreviewed"
      data-exact-asset-ready="false"
    >
      <header className="mab-header">
        <div>
          <p className="mab-eyebrow">원본 모션 제작 초안</p>
          <h2 id={`${id}-title`}>새 변형 도해 살펴보기</h2>
        </div>
        <span className="mab-status">전문가 미검토</span>
      </header>
      <p className="mab-note">
        정확한 운동 시범으로 승인되지 않은 제작 제안입니다. 안전성 미평가 · 자동 추천 제외.
      </p>
      <label className="mab-picker">
        제작 제안
        <select
          aria-label="새 모션 제작 제안"
          value={selectedId}
          onChange={(event) => chooseVariant(event.target.value as BatchVariantId)}
        >
          {BATCH_VARIANTS.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.title}
            </option>
          ))}
        </select>
      </label>
      <figure className="mab-figure">
        <MotionAuthoringBatchFigure
          variantId={selected.id}
          progress={state.progress}
          activeSide={activeSide}
          mirrored={mirrored}
          className="mab-scene"
        />
        <figcaption>
          <strong>
            {selected.title} · {phase.label}
          </strong>
          <span>{selected.variant}</span>
          <span>{selected.supportSummary}</span>
        </figcaption>
      </figure>
      <p className="mab-legend">
        실선: 몸의 왼쪽 · 점선: 몸의 오른쪽 · 채운 원: 고정 제작 접점 · 빈 원과 점선: 해제된 제작
        접점
      </p>
      <div className="mab-controls" role="group" aria-label="도해 재생">
        <button
          type="button"
          disabled={!active || stillMode}
          onClick={() => (state.playing ? controller.pause() : controller.play())}
        >
          {state.playing ? '일시정지' : '한 주기 재생'}
        </button>
        <button type="button" className="mab-secondary" onClick={() => controller.reset()}>
          처음으로
        </button>
        <label>
          도해 속도
          <select
            aria-label="새 모션 도해 속도"
            value={state.speed}
            onChange={(event) => controller.setSpeed(Number(event.target.value))}
          >
            <option value={0.5}>0.5×</option>
            <option value={0.75}>0.75×</option>
            <option value={1}>1×</option>
          </select>
        </label>
      </div>
      <label className="mab-progress">
        도해 위치
        <input
          aria-label="새 모션 도해 위치"
          aria-valuetext={`${Math.round(state.progress * 100)}퍼센트 · ${phase.label}`}
          type="range"
          min="0"
          max="1000"
          step="1"
          value={Math.round(state.progress * 1000)}
          onChange={(event) => controller.seek(Number(event.target.value) / 1000)}
        />
      </label>
      <div className="mab-phases" role="group" aria-label="새 모션 정지 단계">
        {phases.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className="mab-secondary"
            aria-pressed={phase.id === entry.id}
            onClick={() => controller.seek(entry.sample)}
          >
            {entry.label}
          </button>
        ))}
      </div>
      <div className="mab-view-controls">
        <label>
          {selected.sideMode === 'bilateral'
            ? '양쪽 함께'
            : selected.id === 'chair-seated-overhead-sidebend-v1'
              ? '몸통이 기울어지는 쪽'
              : '움직이는 다리'}
          <select
            aria-label="새 모션 해부학적 쪽"
            disabled={selected.sideMode === 'bilateral'}
            value={selected.sideMode === 'bilateral' ? 'together' : activeSide}
            onChange={(event) => {
              controller.reset();
              setActiveSide(event.target.value as BatchSide);
            }}
          >
            {selected.sideMode === 'bilateral' ? (
              <option value="together">양쪽 함께</option>
            ) : (
              <>
                <option value="left">몸의 왼쪽</option>
                <option value="right">몸의 오른쪽</option>
              </>
            )}
          </select>
        </label>
        <label className="mab-checkbox">
          <input
            type="checkbox"
            checked={mirrored}
            onChange={(event) => {
              controller.reset();
              setMirrored(event.target.checked);
            }}
          />
          화면만 반전 · 몸의 좌우 유지
        </label>
        <label className="mab-checkbox">
          <input
            type="checkbox"
            checked={staticOnly}
            onChange={(event) => {
              controller.pause();
              setStaticOnly(event.target.checked);
            }}
          />
          정지 그림으로 보기
        </label>
      </div>
      <p className="mab-playback-state" role="status" aria-live="polite">
        {reducedMotion
          ? '동작 줄이기 설정에 따라 정지 단계와 위치 조절로 표시합니다.'
          : staticOnly
            ? '정지 그림 모드입니다. 단계 버튼이나 위치 조절을 사용하세요.'
            : state.playing
              ? '도해 한 주기를 재생 중입니다.'
              : state.progress >= 1
                ? '한 주기 재생을 마쳤습니다. 일시정지 상태입니다.'
                : '일시정지 상태입니다. 자동 재생하지 않습니다.'}
      </p>
      <p className="mab-note">
        8초 한 주기와 속도는 그림 검토를 위한 표시값입니다. 실제 수행 시간·횟수·호흡·스프링·가동
        범위를 처방하지 않습니다.
      </p>
      <details className="mab-evidence">
        <summary>출처와 이 변형의 차이 보기</summary>
        <p className="mab-note">
          공개 본문 사실을 참고했습니다. 출처 영상 시청·전문가 검수는 완료하지 않았습니다.
        </p>
        <div>
          <h3>참고한 패턴</h3>
          <ul>
            {selected.matched.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>별도로 만든 변형</h3>
          <ul>
            {selected.mismatched.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>확인하지 않은 부분</h3>
          <ul>
            {selected.unknown.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </div>
        <ul>
          {selected.sources.map((entry) => (
            <li key={entry.sourceId}>
              <a href={entry.url} target="_blank" rel="noreferrer">
                {entry.label} · 새 탭
              </a>
              <p>{entry.context}</p>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
