import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import {
  getExerciseMotionReference,
  getMotionPrototype,
  MOTION_PROTOTYPES,
  MOTION_REFERENCE_SOURCE,
} from '../data/motionReferences';
import type { MotionPrototypeReference } from '../data/motionReferences';
import { clampMotionProgress, getMotionPhase, getMotionPose } from '../utils/motionReferenceModel';
import type { AnatomicalSide, MotionPoint, MotionPrototypeId } from '../utils/motionReferenceModel';
import type { MotionPatternReference } from '../data/motionPatternReferences';
import {
  resolvePatternReferencesForRenderer,
  resolveRenderableMotionDescriptor,
} from '../features/motionCoverage';
import { MotionPatternPreview } from './MotionPatternPreview';
import '../styles/motion-reference.css';

export interface MotionReferencePlayerProps {
  exerciseId?: string;
  exerciseName?: string;
  mode?: 'exercise' | 'prototype-lab';
  active?: boolean;
  kind?: 'exercise' | 'rest';
  className?: string;
}

const pointsPath = (points: readonly MotionPoint[]) =>
  points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');

function MotionPoseDrawing({
  clip,
  progress,
  side,
  mirrored,
  caption,
}: {
  clip: MotionPrototypeReference;
  progress: number;
  side: AnatomicalSide;
  mirrored: boolean;
  caption: string;
}) {
  const id = useId();
  const pose = getMotionPose(clip.id, progress, side);
  const { joints, legs } = pose;
  return (
    <svg
      className="motion-reference-scene"
      viewBox="65 80 440 160"
      role="img"
      aria-labelledby={`${id}-title ${id}-description`}
      data-view-mirrored={mirrored}
    >
      <title id={`${id}-title`}>
        {clip.title} 기획 도해 · {caption}
      </title>
      <desc id={`${id}-description`}>
        전문가 미검수 2D 개념 도해입니다. 실선은 해부학적 왼쪽, 점선은 해부학적 오른쪽입니다.
        {mirrored ? ' 그림만 화면에서 반전했으며 몸의 좌우 이름은 유지합니다.' : ' 화면 반전 없음.'}
      </desc>
      <rect className="motion-reference-mat" x="102" y="217" width="380" height="9" rx="4.5" />
      <g data-motion-drawing transform={mirrored ? 'translate(570 0) scale(-1 1)' : undefined}>
        {(['right', 'left'] as const).map((anatomicalSide) => {
          const leg = legs[anatomicalSide];
          return (
            <path
              key={anatomicalSide}
              data-anatomical-side={anatomicalSide}
              data-active={leg.active}
              className={`motion-reference-leg ${anatomicalSide === 'right' ? 'is-far' : ''}`}
              d={pointsPath([leg.hip, leg.knee, leg.ankle, leg.heel, leg.toe])}
            />
          );
        })}
        <path className="motion-reference-torso" d={pointsPath([joints.shoulder, joints.hip])} />
        <path className="motion-reference-arm" d="M 165 201 L 208 211 L 251 212" />
        <path className="motion-reference-neck" d={pointsPath([joints.neck, joints.shoulder])} />
        <circle className="motion-reference-head" cx={joints.head.x} cy={joints.head.y} r="20" />
        <path className="motion-reference-nose" d="M 125 177 l 8 -5 l 5 6" />
        {(['left', 'right'] as const).map((anatomicalSide) => (
          <g key={anatomicalSide}>
            <circle
              className="motion-reference-joint"
              cx={legs[anatomicalSide].knee.x}
              cy={legs[anatomicalSide].knee.y}
              r="3.5"
            />
            <circle
              className="motion-reference-anchor"
              data-contact-side={anatomicalSide}
              data-contact-type={
                clip.id === 'heel-slide' && side === anatomicalSide ? 'slide' : 'fixed'
              }
              cx={legs[anatomicalSide].heel.x}
              cy="217"
              r="3"
            />
          </g>
        ))}
        <circle className="motion-reference-anchor" data-contact="head" cx="127" cy="217" r="3" />
        <circle
          className="motion-reference-anchor"
          data-contact="shoulder"
          cx="166"
          cy="217"
          r="3"
        />
      </g>
    </svg>
  );
}

function PrototypePlayback({ clip, active }: { clip: MotionPrototypeReference; active: boolean }) {
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [side, setSide] = useState<AnatomicalSide>('left');
  const [mirrored, setMirrored] = useState(false);
  const [staticOnly, setStaticOnly] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
  );
  const [announcement, setAnnouncement] = useState('일시정지 상태입니다. 자동 재생하지 않습니다.');
  const wrapper = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const lastTimestamp = useRef<number | null>(null);
  const clock = useRef({ progress: 0, playing: false, speed: 1 });
  const canRun = useRef({ active, visible: true, reduced: reducedMotion, static: false });
  const stillMode = reducedMotion || staticOnly;

  const cancelFrame = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    lastTimestamp.current = null;
  }, []);
  const pause = useCallback(
    (message?: string) => {
      clock.current.playing = false;
      cancelFrame();
      setPlaying(false);
      if (message) setAnnouncement(message);
    },
    [cancelFrame],
  );
  const seek = useCallback(
    (value: number, message?: string) => {
      const next = clampMotionProgress(value);
      pause();
      clock.current.progress = next;
      setProgress(next);
      setAnnouncement(message ?? `${getMotionPhase(next).label}를 정지 화면으로 표시합니다.`);
    },
    [pause],
  );

  useEffect(() => {
    canRun.current.active = active;
    if (!active && clock.current.playing) pause('숨겨진 플레이어를 일시정지했습니다.');
  }, [active, pause]);
  useEffect(() => {
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const change = (event: MediaQueryListEvent) => {
      canRun.current.reduced = event.matches;
      setReducedMotion(event.matches);
      if (event.matches) pause('동작 줄이기 설정에 따라 정지 화면으로 전환했습니다.');
    };
    preference?.addEventListener('change', change);
    return () => preference?.removeEventListener('change', change);
  }, [pause]);
  useEffect(() => {
    const mountedClock = clock.current;
    const hidden = () => {
      if (document.hidden) pause('백그라운드에서 일시정지했습니다.');
    };
    const pageHidden = () => pause();
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('pagehide', pageHidden);
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(
            (entries) => {
              const entry = entries[0];
              if (!entry) return;
              canRun.current.visible = entry.isIntersecting;
              if (!entry.isIntersecting && clock.current.playing)
                pause('화면 밖의 플레이어를 일시정지했습니다.');
            },
            { threshold: 0.01 },
          );
    if (wrapper.current) observer?.observe(wrapper.current);
    return () => {
      mountedClock.playing = false;
      cancelFrame();
      observer?.disconnect();
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('pagehide', pageHidden);
    };
  }, [cancelFrame, pause]);

  const play = () => {
    if (clock.current.playing) {
      pause('일시정지했습니다.');
      return;
    }
    const allowed = canRun.current;
    if (
      !active ||
      !allowed.active ||
      !allowed.visible ||
      allowed.reduced ||
      allowed.static ||
      document.hidden
    )
      return;
    if (clock.current.progress >= 1) {
      clock.current.progress = 0;
      setProgress(0);
    }
    clock.current.playing = true;
    setPlaying(true);
    setAnnouncement('개념 도해를 한 주기만 재생합니다. 운동 시간이 아닙니다.');
    lastTimestamp.current = null;
    const tick = (now: number) => {
      frame.current = null;
      const current = canRun.current;
      if (!clock.current.playing) return;
      if (
        !current.active ||
        !current.visible ||
        current.reduced ||
        current.static ||
        document.hidden ||
        !Number.isFinite(now)
      ) {
        pause();
        return;
      }
      if (lastTimestamp.current !== null) {
        const next = clampMotionProgress(
          clock.current.progress +
            (Math.max(0, now - lastTimestamp.current) / clip.durationMs) * clock.current.speed,
        );
        clock.current.progress = next;
        setProgress(next);
        if (next >= 1) {
          pause('한 주기 미리보기가 끝났습니다. 끝 자세에서 멈춥니다.');
          return;
        }
      }
      lastTimestamp.current = now;
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  };
  const selectSide = (next: AnatomicalSide) => {
    setSide(next);
    seek(0, `몸 기준 ${next === 'left' ? '왼쪽' : '오른쪽'}을 선택하고 시작 자세에서 멈췄습니다.`);
  };

  return (
    <div className="motion-reference-playback" ref={wrapper} data-playing={playing}>
      <h4>{clip.title} · 전문가 미검수 시안</h4>
      <p className="motion-reference-limitation">
        {clip.limitation} {clip.additionalLimitation}
      </p>
      <MotionPoseDrawing
        clip={clip}
        progress={progress}
        side={side}
        mirrored={mirrored}
        caption={getMotionPhase(progress).label}
      />
      <div className="motion-reference-legend">
        <span>실선: 해부학적 왼쪽</span>
        <span>점선: 해부학적 오른쪽</span>
        <span>{mirrored ? '화면 반전 켜짐' : '화면 반전 없음'}</span>
      </div>
      <div className="motion-reference-position" aria-live="off">
        <span>{getMotionPhase(progress).label}</span>
        <span>{Math.round(progress * 100)}%</span>
      </div>
      <input
        aria-label="모션 미리보기 위치"
        aria-valuetext={`${getMotionPhase(progress).label}, ${Math.round(progress * 100)}퍼센트`}
        aria-live="off"
        type="range"
        min="0"
        max="1000"
        step="1"
        value={Math.round(progress * 1000)}
        onChange={(event) => seek(Number(event.currentTarget.value) / 1000)}
      />
      <div className="motion-reference-controls">
        <button
          type="button"
          className="motion-reference-play"
          onClick={play}
          disabled={!active || stillMode}
        >
          {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
          {playing ? '일시정지' : '모션 한 번 재생'}
        </button>
        <button type="button" onClick={() => seek(0)}>
          <RotateCcw size={15} aria-hidden="true" />
          처음으로
        </button>
        <label>
          미리보기 속도
          <select
            aria-label="모션 미리보기 속도"
            value={speed}
            onChange={(event) => {
              const next = Number(event.currentTarget.value);
              if (![0.5, 0.75, 1].includes(next)) return;
              clock.current.speed = next;
              setSpeed(next);
              pause('미리보기 속도를 바꾸고 일시정지했습니다.');
            }}
          >
            <option value="0.5">0.5×</option>
            <option value="0.75">0.75×</option>
            <option value="1">1×</option>
          </select>
        </label>
      </div>
      <div className="motion-reference-options">
        {clip.sideMode === 'unilateral' && (
          <fieldset>
            <legend>몸 기준으로 움직일 쪽</legend>
            <button type="button" aria-pressed={side === 'left'} onClick={() => selectSide('left')}>
              해부학적 왼쪽
            </button>
            <button
              type="button"
              aria-pressed={side === 'right'}
              onClick={() => selectSide('right')}
            >
              해부학적 오른쪽
            </button>
          </fieldset>
        )}
        <label>
          <input
            type="checkbox"
            checked={mirrored}
            onChange={(event) => {
              setMirrored(event.currentTarget.checked);
              seek(0, '그림의 화면 반전만 바꾸었습니다. 몸의 좌우 이름은 유지합니다.');
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
              const next = event.currentTarget.checked;
              canRun.current.static = next;
              setStaticOnly(next);
              pause(
                next ? '정지 화면 모드입니다.' : '모션 모드를 선택했습니다. 일시정지 상태입니다.',
              );
            }}
          />
          정지 화면만 보기
        </label>
      </div>
      {reducedMotion && (
        <p className="motion-reference-muted">
          시스템의 동작 줄이기 설정에 따라 정지 화면만 표시합니다.
        </p>
      )}
      <p className="motion-reference-muted">
        한 주기 6.5초는 미리보기 시간입니다. 호흡·반복·운동 시간을 처방하지 않습니다.
      </p>
      <div className="motion-reference-stills" aria-label="정지 단계 도해">
        {[
          { label: '시작', progress: 0 },
          { label: '전환', progress: 0.53 },
          { label: '끝', progress: 1 },
        ].map((stage) => (
          <div key={stage.label}>
            <button type="button" onClick={() => seek(stage.progress)}>
              {stage.label} 자세 보기
            </button>
            <MotionPoseDrawing
              clip={clip}
              progress={stage.progress}
              side={side}
              mirrored={mirrored}
              caption={`${stage.label} 정지 화면`}
            />
            <p>{clip.stages[stage.label === '시작' ? 0 : stage.label === '전환' ? 1 : 2]}</p>
          </div>
        ))}
      </div>
      <details className="motion-reference-provenance">
        <summary>제작 근거·접점·검토 상태</summary>
        <p>{clip.description}</p>
        <p>
          접점 가정: {clip.contacts.join(' · ')}. 접점 표시는 원형 모델의 제작 가정이며 실제 기구
          접촉 검수 전입니다.
        </p>
        <dl>
          <dt>원본 제작</dt>
          <dd>제공된 원본의 절차적 2D 도해</dd>
          <dt>사실 참조</dt>
          <dd>
            <a href={clip.source.url} target="_blank" rel="noopener noreferrer">
              {clip.source.title}
            </a>{' '}
            · 참조 원문 미디어를 복제한 애셋이 아닙니다.
          </dd>
          <dt>전문가 승인</dt>
          <dd>0 · 미검수</dd>
          <dt>개인별 적합성</dt>
          <dd>평가하지 않음</dd>
          <dt>원본 모델 파일 SHA-256</dt>
          <dd>
            <code>{clip.assetSha256}</code>
          </dd>
          <dt>클립 데이터 지문 SHA-256</dt>
          <dd>
            <code>{clip.dataSha256}</code>
          </dd>
          <dt>원본 ZIP SHA-256</dt>
          <dd>
            <code>{MOTION_REFERENCE_SOURCE.archiveSha256}</code>
          </dd>
        </dl>
        <p>
          출처·직접 제작·전문 검수는 별개입니다. 애셋 해시는 일치 여부를 기록하며 정확성이나
          안전성을 승인하지 않습니다.
        </p>
      </details>
      <p className="motion-reference-announcement" role="status" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}

function PrototypeLab({ active }: { active: boolean }) {
  const [prototypeId, setPrototypeId] = useState<MotionPrototypeId>('bridge-pattern');
  const clip = getMotionPrototype(prototypeId);
  if (!clip) return null;
  return (
    <section className="motion-reference motion-reference-lab" aria-label="독립 모션 시안 실험실">
      <header>
        <span className="motion-reference-badge">미검수 기획 도해 · 수업 시범 사용 불가</span>
        <h3>원본 모션 시안 살펴보기</h3>
        <p>
          실제 동작 98개의 제작 완료 모션 0개 · 전문가 승인 0개. 아래 두 시안은 어느 동작 ID에도
          연결하지 않았습니다.
        </p>
      </header>
      <label className="motion-reference-clip-select">
        살펴볼 독립 시안
        <select
          aria-label="독립 모션 시안 선택"
          value={prototypeId}
          onChange={(event) => {
            if (
              event.currentTarget.value === 'bridge-pattern' ||
              event.currentTarget.value === 'heel-slide'
            )
              setPrototypeId(event.currentTarget.value);
          }}
        >
          {MOTION_PROTOTYPES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      </label>
      <PrototypePlayback key={clip.id} clip={clip} active={active} />
    </section>
  );
}

function RelatedPatternReferences({
  references,
  exerciseName,
  active,
  className,
}: {
  references: readonly MotionPatternReference[];
  exerciseName: string;
  active: boolean;
  className: string;
}) {
  const [variantId, setVariantId] = useState(references[0].variantId);
  const selected =
    references.find((reference) => reference.variantId === variantId) ?? references[0];
  return (
    <section
      className={`motion-reference-related ${className}`}
      aria-label="관련 패턴 모션 초안"
      data-motion-status="related-draft"
      data-exact-motion-status="not_authored"
    >
      <div className="motion-related-context">
        <p>
          {exerciseName}에 연결한 관련 패턴 {references.length}개
        </p>
        <span>정확한 모션 애셋 제작 전</span>
      </div>
      {references.length > 1 && (
        <label className="motion-reference-clip-select">
          살펴볼 관련 변형
          <select
            aria-label="관련 모션 초안 선택"
            value={selected.variantId}
            onChange={(event) =>
              setVariantId(
                references.find((reference) => reference.variantId === event.target.value)
                  ?.variantId ?? references[0].variantId,
              )
            }
          >
            {references.map((reference) => (
              <option key={reference.variantId} value={reference.variantId}>
                {reference.title}
              </option>
            ))}
          </select>
        </label>
      )}
      <MotionPatternPreview reference={selected} active={active} />
    </section>
  );
}

import { getCatalogContinuousMotionAsset } from '../data/catalogMotionAssets';
import { CatalogMotionInteractivePlayer } from './CatalogMotionInteractivePlayer';

/** Related authored drafts and catalog 5-phase kinematic assets are discoverable without granting clinical approval. */
export function MotionReferencePlayer({
  exerciseId,
  exerciseName,
  mode = 'exercise',
  active = true,
  kind = 'exercise',
  className = '',
}: MotionReferencePlayerProps) {
  if (kind === 'rest') return null;
  if (mode === 'prototype-lab' && !exerciseId?.trim()) return <PrototypeLab active={active} />;
  const reference = exerciseId ? getExerciseMotionReference(exerciseId) : null;
  const descriptor = resolveRenderableMotionDescriptor(exerciseId);
  const patterns = exerciseId ? resolvePatternReferencesForRenderer(exerciseId) : [];
  const name = exerciseName || reference?.exerciseName || '이 동작';
  if (patterns.length)
    return (
      <RelatedPatternReferences
        key={exerciseId}
        references={patterns}
        exerciseName={name}
        active={active}
        className={className}
      />
    );
  const catalogMotion = exerciseId ? getCatalogContinuousMotionAsset(exerciseId) : null;
  if (catalogMotion) {
    return (
      <CatalogMotionInteractivePlayer
        key={exerciseId}
        asset={catalogMotion}
        active={active}
        className={className}
      />
    );
  }
  return (
    <section
      className={`motion-reference motion-reference-pending ${className}`}
      aria-label="동작 모션 제작 상태"
      data-motion-status="not_authored"
      data-motion-coverage-mode={descriptor.mode}
      data-readiness-state={descriptor.readinessState}
      data-three-phase-schematic={descriptor.resolution.threePhase2d.supported ? 'true' : 'false'}
      data-true-3d="false"
      data-manual-ready="false"
    >
      <span className="motion-reference-badge">커스텀 도해 가이드</span>
      <h3>기본 자세 가이드를 참조하세요</h3>
      <p>{name}의 준비 자세·전환 메모와 출처를 함께 살펴보세요.</p>
      <p className="motion-reference-muted">
        동작 노트의 준비 자세·전환 메모와 출처를 함께 살펴보세요.
      </p>
    </section>
  );
}
