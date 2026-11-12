import React, { useEffect, useMemo, useState } from 'react';
import { Flame, Layers, Pause, Play, ShieldAlert, Sparkles, Wind } from 'lucide-react';
import { APPARATUS_LABELS, POSITION_LABELS } from '../data/pilatesCatalog';
import type { PilatesExercise } from '../types/pilates';
import { resolveStudio3DMotionForExercise } from '../utils/studio3dMotionCatalog';
import { SpringVisualPills } from './SpringVisualPills';

export type Studio3DViewMode = 'onion' | 'start' | 'peak' | 'loop';

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
  const [loopTick, setLoopTick] = useState<'start' | 'peak'>('start');

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
      setLoopTick((prev) => (prev === 'start' ? 'peak' : 'start'));
    }, 1250);
    return () => window.clearInterval(id);
  }, [mode, reducedMotion]);

  const showPeakPrimary =
    mode === 'onion' || mode === 'peak' || (mode === 'loop' && loopTick === 'peak');
  const showStartGhost = mode === 'onion';
  const showHudVectors = mode === 'onion' || mode === 'peak' || mode === 'loop';

  const [fx, fy] = spec.trajectoryArc.from;
  const [cx, cy] = spec.trajectoryArc.ctrl;
  const [tx, ty] = spec.trajectoryArc.to;
  const [ax, ay] = spec.anchorPoint;

  const muscleLabel =
    exercise.targetMuscles.slice(0, 2).join(' · ') || spec.activeMuscleSummaryKo;
  const topCues = exercise.cues.filter((c) => c.trim().length > 0).slice(0, 2);

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
            className={`pf-studio3d-mode-btn ${mode === 'onion' ? 'is-active' : ''}`}
            aria-pressed={mode === 'onion'}
            onClick={() => setMode('onion')}
          >
            ◐ 궤적 겹침
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
              onClick={() => setMode((prev) => (prev === 'loop' ? 'onion' : 'loop'))}
            >
              {mode === 'loop' ? <Pause size={12} aria-hidden="true" /> : <Play size={12} aria-hidden="true" />}
              <span>{mode === 'loop' ? '정지' : '반복'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="pf-studio3d-stage">
        <img
          src={showPeakPrimary ? spec.peakImg : spec.startImg}
          alt={`${exercise.nameKo} ${showPeakPrimary ? '정점' : '시작'} 3D 스튜디오 가이드`}
          className="pf-studio3d-stage__base"
        />
        {showStartGhost && (
          <img
            src={spec.startImg}
            alt=""
            aria-hidden="true"
            className="pf-studio3d-stage__ghost"
          />
        )}
        {showHudVectors && (
          <svg
            viewBox="0 0 100 65.625"
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
              d={`M ${fx} ${fy * 0.65625} Q ${cx} ${cy * 0.65625} ${tx} ${ty * 0.65625}`}
              fill="none"
              stroke="#C9822B"
              strokeWidth="1.15"
              strokeLinecap="round"
              markerEnd={`url(#pf-3d-arrow-${exercise.id})`}
            />
            <rect
              x={ax - 1.3}
              y={ay * 0.65625 - 1.3}
              width="2.6"
              height="2.6"
              rx="0.5"
              fill="#173D34"
              stroke="#FFFFFF"
              strokeWidth="0.55"
            />
          </svg>
        )}
        <div className="pf-studio3d-stage__chips-top">
          <span className="pf-studio3d-chip is-dark">
            {mode === 'start'
              ? '● 1단계 시작 셋업'
              : mode === 'peak'
                ? '◆ 3단계 정점 & 주동근'
                : mode === 'loop'
                  ? `▶ 연속 교차 (${loopTick === 'start' ? '시작' : '정점'})`
                  : '◐ 시작 잔상(28%) + 이동 궤적'}
          </span>
          <span className="pf-studio3d-chip is-light">
            {APPARATUS_LABELS[exercise.apparatus]?.ko ?? exercise.apparatus} ·{' '}
            {POSITION_LABELS[exercise.bodyPosition]?.ko ?? exercise.bodyPosition}
          </span>
        </div>
        <div className="pf-studio3d-stage__chips-bottom">
          <span className="pf-studio3d-chip is-muscle">
            <Flame size={12} aria-hidden="true" /> 활성 타겟: {muscleLabel}
          </span>
          <span className="pf-studio3d-chip is-anchor">■ {spec.anchorLabelKo}</span>
        </div>
      </div>

      {!compact && (
        <>
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
