import React, { useEffect, useMemo, useState } from 'react';
import { Flame, Layers, Orbit, Pause, Play, ShieldAlert, Sparkles, Wind } from 'lucide-react';
import { APPARATUS_LABELS, POSITION_LABELS } from '../data/pilatesCatalog';
import type { PilatesExercise } from '../types/pilates';
import { resolveStudio3DMotionForExercise } from '../utils/studio3dMotionCatalog';
import { SpringVisualPills } from './SpringVisualPills';
import { StudioInteractive3DViewport } from './StudioInteractive3DViewport';

export type Studio3DViewMode = 'onion' | 'start' | 'mid' | 'peak' | 'loop' | 'orbit3d';

const LOOP_SEQUENCE = ['start', 'mid', 'peak', 'return'] as const;
type LoopBeat = (typeof LOOP_SEQUENCE)[number];

function prefersReducedMotionNow(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export interface Studio3DMotionHeroCardProps {
  readonly exercise: PilatesExercise;
  readonly compact?: boolean;
}

export const Studio3DMotionHeroCard: React.FC<Studio3DMotionHeroCardProps> = ({
  exercise,
  compact = false,
}) => {
  const spec = useMemo(() => resolveStudio3DMotionForExercise(exercise), [exercise]);
  const [reducedMotion, setReducedMotion] = useState<boolean>(prefersReducedMotionNow);
  const [mode, setMode] = useState<Studio3DViewMode>('onion');
  const [beatIdx, setBeatIdx] = useState<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => {
      setReducedMotion(mql.matches);
      if (mql.matches) {
        setMode((prev) => (prev === 'loop' ? 'onion' : prev));
      }
    };
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (mode !== 'loop' || reducedMotion) return;
    const id = window.setInterval(() => {
      setBeatIdx((prev) => (prev + 1) % LOOP_SEQUENCE.length);
    }, 680);
    return () => window.clearInterval(id);
  }, [mode, reducedMotion]);

  const currentLoopBeat: LoopBeat = LOOP_SEQUENCE[beatIdx] ?? 'start';
  const activePose: 'start' | 'mid' | 'peak' =
    mode === 'start'
      ? 'start'
      : mode === 'mid'
        ? 'mid'
        : mode === 'peak' || mode === 'onion' || mode === 'orbit3d'
          ? 'peak'
          : currentLoopBeat === 'start'
            ? 'start'
            : currentLoopBeat === 'peak'
              ? 'peak'
              : 'mid';

  const showStartGhost = mode === 'onion';
  const showMidGhost = mode === 'onion';
  const showHudVectors = mode === 'onion' || mode === 'peak' || mode === 'loop';

  const [fx, fy] = spec.trajectoryArc.from;
  const [cx, cy] = spec.trajectoryArc.ctrl;
  const [tx, ty] = spec.trajectoryArc.to;
  const [ax, ay] = spec.anchorPoint;

  const muscleLabel =
    exercise.targetMuscles.slice(0, 2).join(' · ') || spec.activeMuscleSummaryKo;
  const topCues = exercise.cues.filter((c) => c.trim().length > 0).slice(0, 2);

  const stageStatusLabel =
    mode === 'start'
      ? '● 1단계 시작 셋업'
      : mode === 'mid'
        ? '◐ 2단계 추진·분절 전환'
        : mode === 'peak'
          ? '◆ 3단계 정점 & 주동근'
          : mode === 'loop'
            ? `▶ 연속 4박자 (${
                currentLoopBeat === 'start'
                  ? '1 시작'
                  : currentLoopBeat === 'mid'
                    ? '2 추진'
                    : currentLoopBeat === 'peak'
                      ? '3 정점'
                      : '4 복귀'
              })`
            : '◎ 3프레임 궤적 + 정점 근육';

  return (
    <section
      className={`pf-studio3d-hero-card ${compact ? 'is-compact' : ''}`.trim()}
      data-testid="studio-3d-motion-hero-card"
      data-motion-mode={mode}
      data-match-scope={spec.matchScope}
      data-anatomical-accuracy-assumed="false"
      aria-label={`${exercise.nameKo} 3D 스튜디오 모션 및 3초 핵심 요약`}
    >
      <div className="pf-studio3d-hero-card__top">
        <div className="pf-studio3d-hero-card__badges">
          <span className="pf-studio3d-scope-pill">{spec.matchScopeBadgeKo}</span>
          <span className="pf-studio3d-honest-pill">
            임상 각도·개인 적합성은 강사 현장 확인
          </span>
        </div>
        <div
          className="pf-studio3d-mode-tabs"
          role="group"
          aria-label="3D 모션 단계 보기 방식"
        >
          <button
            type="button"
            className={`pf-studio3d-mode-btn ${mode === 'start' ? 'is-active' : ''}`}
            aria-pressed={mode === 'start'}
            onClick={() => setMode('start')}
          >
            ● 시작
          </button>
          <button
            type="button"
            className={`pf-studio3d-mode-btn ${mode === 'mid' ? 'is-active' : ''}`}
            aria-pressed={mode === 'mid'}
            onClick={() => setMode('mid')}
          >
            ◐ 추진
          </button>
          <button
            type="button"
            className={`pf-studio3d-mode-btn ${mode === 'onion' ? 'is-active' : ''}`}
            aria-pressed={mode === 'onion'}
            onClick={() => setMode('onion')}
          >
            ◎ 궤적 겹침
          </button>
          <button
            type="button"
            className={`pf-studio3d-mode-btn ${mode === 'peak' ? 'is-active' : ''}`}
            aria-pressed={mode === 'peak'}
            onClick={() => setMode('peak')}
          >
            ◆ 정점 근육
          </button>
          {!reducedMotion && (
            <button
              type="button"
              className={`pf-studio3d-mode-btn ${mode === 'loop' ? 'is-active' : ''}`}
              aria-pressed={mode === 'loop'}
              onClick={() => {
                setBeatIdx(0);
                setMode((prev) => (prev === 'loop' ? 'onion' : 'loop'));
              }}
            >
              {mode === 'loop' ? (
                <Pause size={12} aria-hidden="true" />
              ) : (
                <Play size={12} aria-hidden="true" />
              )}
              <span>{mode === 'loop' ? '정지' : '4박자 모션'}</span>
            </button>
          )}
          <button
            type="button"
            className={`pf-studio3d-mode-btn is-orbit3d ${mode === 'orbit3d' ? 'is-active' : ''}`}
            data-testid="studio-3d-orbit-mode-btn"
            aria-pressed={mode === 'orbit3d'}
            onClick={() => setMode((prev) => (prev === 'orbit3d' ? 'onion' : 'orbit3d'))}
          >
            <Orbit size={12} aria-hidden="true" />
            <span>360° 각도</span>
          </button>
        </div>
      </div>

      {mode === 'orbit3d' ? (
        <StudioInteractive3DViewport exercise={exercise} compact={compact} />
      ) : (
        <div className="pf-studio3d-stage" data-active-pose={activePose}>
          <img
            src={spec.startImg}
            alt={activePose === 'start' ? `${exercise.nameKo} 시작 3D 스튜디오 가이드` : ''}
            aria-hidden={activePose === 'start' ? undefined : 'true'}
            className={`pf-studio3d-stage__layer pf-studio3d-stage__base ${
              activePose === 'start'
                ? 'is-primary'
                : showStartGhost
                  ? 'is-onion-ghost'
                  : 'is-hidden-pose'
            }`}
          />
          <img
            src={spec.midImg}
            alt={activePose === 'mid' ? `${exercise.nameKo} 추진 전환 3D 스튜디오 가이드` : ''}
            aria-hidden={activePose === 'mid' ? undefined : 'true'}
            className={`pf-studio3d-stage__layer pf-studio3d-stage__mid ${
              activePose === 'mid'
                ? 'is-primary'
                : showMidGhost
                  ? 'is-onion-mid-ghost'
                  : 'is-hidden-pose'
            }`}
          />
          <img
            src={spec.peakImg}
            alt={activePose === 'peak' ? `${exercise.nameKo} 정점 3D 스튜디오 가이드` : ''}
            aria-hidden={activePose === 'peak' ? undefined : 'true'}
            className={`pf-studio3d-stage__layer pf-studio3d-stage__peak ${
              activePose === 'peak' ? 'is-primary' : 'is-hidden-pose'
            }`}
          />
          {showHudVectors && (
            <svg
              viewBox="0 0 100 65"
              preserveAspectRatio="none"
              className="pf-studio3d-stage__hud"
              aria-hidden="true"
            >
              <defs>
                <marker
                  id={`pf-3d-arrow-${exercise.id}`}
                  viewBox="0 0 10 10"
                  refX="7"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto"
                >
                  <path
                    d="M 1.5 1.5 L 8 5 L 1.5 8.5"
                    fill="none"
                    stroke="#C9822B"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </marker>
              </defs>
              <path
                d={`M ${fx} ${fy * 0.65} Q ${cx} ${cy * 0.65} ${tx} ${ty * 0.65}`}
                fill="none"
                stroke="#C9822B"
                strokeWidth="1.2"
                strokeLinecap="round"
                className="pf-hud-trajectory-path"
                markerEnd={`url(#pf-3d-arrow-${exercise.id})`}
              />
              <circle
                cx={tx}
                cy={ty * 0.65}
                r="2.0"
                fill="rgba(217, 107, 79, 0.22)"
                stroke="#D96B4F"
                strokeWidth="0.55"
                className="pf-hud-peak-pulse"
              />
              <rect
                x={ax - 1.25}
                y={ay * 0.65 - 1.25}
                width="2.5"
                height="2.5"
                rx="0.5"
                fill="#173D34"
                stroke="#FFFFFF"
                strokeWidth="0.55"
              />
            </svg>
          )}
          <div className="pf-studio3d-stage__chips-top">
            <span className="pf-studio3d-chip is-dark">{stageStatusLabel}</span>
            <span className="pf-studio3d-chip is-light">
              {exercise.springs ? (
                <SpringVisualPills springs={exercise.springs} />
              ) : (
                <>
                  {APPARATUS_LABELS[exercise.apparatus]?.ko ?? exercise.apparatus} ·{' '}
                  {POSITION_LABELS[exercise.bodyPosition]?.ko ?? exercise.bodyPosition}
                </>
              )}
            </span>
          </div>
          <div className="pf-studio3d-stage__chips-bottom">
            <span className="pf-studio3d-chip is-muscle">
              <Flame size={12} aria-hidden="true" /> 활성 타겟: {muscleLabel}
            </span>
            <span className="pf-studio3d-chip is-anchor">■ {spec.anchorLabelKo}</span>
          </div>
        </div>
      )}

      {!compact && (
        <>
          <div
            className="pf-studio3d-frame-strip"
            data-testid="studio-3d-frame-strip"
            aria-label="4단계 3D 모션 키프레임 및 360도 각도 스트립"
          >
            {[
              {
                key: 'start',
                stepNo: '01',
                label: '시작 셋업',
                img: spec.startImg,
                isActive:
                  mode === 'start' || (mode === 'loop' && currentLoopBeat === 'start'),
                onSelect: () => setMode('start'),
              },
              {
                key: 'mid',
                stepNo: '02',
                label: '추진 전환',
                img: spec.midImg,
                isActive:
                  mode === 'mid' || (mode === 'loop' && currentLoopBeat === 'mid'),
                onSelect: () => setMode('mid'),
              },
              {
                key: 'peak',
                stepNo: '03',
                label: '정점 수축',
                img: spec.peakImg,
                isActive:
                  mode === 'peak' ||
                  mode === 'onion' ||
                  (mode === 'loop' && currentLoopBeat === 'peak'),
                onSelect: () => setMode('peak'),
              },
              {
                key: 'return',
                stepNo: '04',
                label: '원심 복귀',
                img: spec.midImg,
                isActive: mode === 'loop' && currentLoopBeat === 'return',
                onSelect: () => {
                  if (!reducedMotion) {
                    setBeatIdx(3);
                    setMode('loop');
                  } else {
                    setMode('mid');
                  }
                },
              },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                className={`pf-studio3d-frame-thumb ${item.isActive ? 'is-active' : ''}`}
                onClick={item.onSelect}
              >
                <span className="pf-studio3d-frame-thumb__art">
                  <img src={item.img} alt="" aria-hidden="true" loading="lazy" />
                  <span className="pf-studio3d-frame-thumb__num">{item.stepNo}</span>
                </span>
                <span className="pf-studio3d-frame-thumb__label">{item.label}</span>
              </button>
            ))}
          </div>

          <div
            className="pf-detail-essential-3-strip"
            data-testid="detail-essential-3-strip"
            role="region"
            aria-label="수업 직전 3초 핵심 세팅·호흡·타겟 요약"
          >
            <div className="pf-detail-essential-pill">
              <span className="pf-detail-essential-pill__label">
                <Layers size={13} aria-hidden="true" /> 권장 스프링 · 셋업
              </span>
              <div className="pf-detail-essential-pill__val">
                {exercise.springs ? (
                  <SpringVisualPills springs={exercise.springs} />
                ) : (
                  <strong>기구별 직접 설정</strong>
                )}
                <small>
                  풋바 {exercise.footbar} · 헤드레스트 {exercise.headrest}
                </small>
              </div>
            </div>
            <div className="pf-detail-essential-pill">
              <span className="pf-detail-essential-pill__label">
                <Wind size={13} aria-hidden="true" /> 호흡 · 리듬
              </span>
              <div className="pf-detail-essential-pill__val">
                <strong>{exercise.breathPattern || '자연스러운 흉곽 호흡 유지'}</strong>
                <small>{spec.excursionLabelKo}</small>
              </div>
            </div>
            <div className="pf-detail-essential-pill">
              <span className="pf-detail-essential-pill__label">
                <Sparkles size={13} aria-hidden="true" /> 주동근 · 계획 시간
              </span>
              <div className="pf-detail-essential-pill__val">
                <strong>{muscleLabel}</strong>
                <small>
                  기본 {exercise.defaultDurationMin}분
                  {exercise.isUnilateral ? ' (양쪽 포함)' : ''} · Lv {exercise.level}
                </small>
              </div>
            </div>
          </div>

          {(topCues.length > 0 || exercise.precautions?.trim()) && (
            <div className="pf-detail-quick-cue-box" data-testid="detail-quick-cue-box">
              {topCues.length > 0 && (
                <div className="pf-detail-quick-cue-box__cues">
                  <strong>즉시 티칭 큐</strong>
                  <ul>
                    {topCues.map((cue, idx) => (
                      <li key={idx}>{cue}</li>
                    ))}
                  </ul>
                </div>
              )}
              {exercise.precautions?.trim() && (
                <p className="pf-detail-quick-cue-box__caution">
                  <ShieldAlert size={14} aria-hidden="true" />
                  <span>
                    <strong>주의:</strong> {exercise.precautions}
                  </span>
                </p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
};
