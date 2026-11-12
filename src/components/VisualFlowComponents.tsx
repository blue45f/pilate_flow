import React, { useEffect, useId, useMemo, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import type { ApparatusType, PilatesExercise, SequenceStep } from '../types/pilates';
import { isRestStep } from '../utils/sequenceEngine';
import {
  getApparatusPrimary3DThumb,
  resolveStudio3DMotionForExercise,
} from '../utils/studio3dMotionCatalog';

function isReducedMotionPreferred(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export interface VisualApparatusTileOption {
  readonly id: ApparatusType | 'all';
  readonly labelKo: string;
  readonly apparatus: ApparatusType | 'all';
  readonly count?: number;
  readonly disabled?: boolean;
}

const DEFAULT_APPARATUS_OPTIONS: readonly VisualApparatusTileOption[] = [
  { id: 'all', labelKo: '전체 기구', apparatus: 'all' },
  { id: 'reformer', labelKo: '리포머', apparatus: 'reformer' },
  { id: 'cadillac', labelKo: '캐딜락', apparatus: 'cadillac' },
  { id: 'chair', labelKo: '운다 체어', apparatus: 'chair' },
  { id: 'barrel', labelKo: '래더 바렐', apparatus: 'barrel' },
  { id: 'mat', labelKo: '매트', apparatus: 'mat' },
];

export type VisualApparatusPhotoStripProps = {
  readonly ariaLabel?: string;
  readonly options?: readonly VisualApparatusTileOption[];
  readonly selectedIds?: readonly string[];
  readonly activeApparatus?: ApparatusType | 'all';
  readonly includeAll?: boolean;
  readonly disabledApparatus?: readonly ApparatusType[];
  readonly compact?: boolean;
  readonly onSelect: (id: ApparatusType | 'all') => void;
  readonly layout?: 'bento' | 'scroll';
  readonly testId?: string;
};

/**
 * Interactive 3D studio photo tiles with hover/active spring elevation so users
 * choose apparatus visually at a glance without reading dense text labels.
 */
export const VisualApparatusPhotoStrip: React.FC<VisualApparatusPhotoStripProps> = ({
  ariaLabel = '기구별 3D 스튜디오 빠른 선택',
  options,
  selectedIds,
  activeApparatus,
  includeAll = true,
  disabledApparatus = [],
  compact = false,
  onSelect,
  layout,
  testId = 'visual-apparatus-photo-strip',
}) => {
  const resolvedLayout = layout ?? (compact ? 'scroll' : 'bento');
  const resolvedOptions = useMemo(() => {
    if (options && options.length > 0) return options;
    const base = includeAll
      ? DEFAULT_APPARATUS_OPTIONS
      : DEFAULT_APPARATUS_OPTIONS.filter((item) => item.apparatus !== 'all');
    if (!disabledApparatus.length) return base;
    const disabledSet = new Set<string>(disabledApparatus);
    return base.map((item) =>
      disabledSet.has(item.id) ? { ...item, disabled: true } : item,
    );
  }, [options, includeAll, disabledApparatus]);

  const resolvedSelectedIds = selectedIds ?? (activeApparatus ? [activeApparatus] : []);

  return (
    <div
      className={`pf-visual-apparatus-strip is-${resolvedLayout}`}
      role="group"
      aria-label={ariaLabel}
      data-testid={testId}
    >
      {resolvedOptions.map((opt) => {
        const isSelected = resolvedSelectedIds.includes(opt.id);
        const imgSrc =
          opt.apparatus === 'all'
            ? '/motion-studio3d/footwork-peak.png'
            : getApparatusPrimary3DThumb(opt.apparatus);
        return (
          <button
            key={opt.id}
            type="button"
            disabled={opt.disabled}
            aria-pressed={isSelected}
            className={`pf-visual-apparatus-card ${isSelected ? 'is-selected' : ''}`.trim()}
            onClick={() => onSelect(opt.id)}
          >
            <span className="pf-visual-apparatus-card__media" aria-hidden="true">
              <img src={imgSrc} alt="" loading="lazy" />
              {isSelected && <span className="pf-visual-apparatus-card__check">✓</span>}
            </span>
            <span className="pf-visual-apparatus-card__meta">
              <strong>{opt.labelKo}</strong>
              {opt.count !== undefined && <small>{opt.count}</small>}
            </span>
          </button>
        );
      })}
    </div>
  );
};

/**
 * Visual 3D Filmstrip showing the sequence's movement progression in images (Start -> Peak crossfade)
 * so instructors understand a class flow in 1 second without reading text lists.
 */
export const VisualSequenceFilmstrip: React.FC<{
  readonly steps: readonly SequenceStep[];
  readonly exercisesById?: ReadonlyMap<string, PilatesExercise>;
  readonly exercises?: readonly PilatesExercise[];
  readonly maxFrames?: number;
  readonly activeStepId?: string | null;
  readonly activeStepIndex?: number;
  readonly onSelectStep?: (step: SequenceStep, index: number, trigger: HTMLButtonElement) => void;
  readonly compact?: boolean;
  readonly testId?: string;
}> = ({
  steps,
  exercisesById,
  exercises,
  maxFrames = 8,
  activeStepId,
  activeStepIndex,
  onSelectStep,
  compact = false,
  testId = 'visual-sequence-filmstrip',
}) => {
  const resolvedMap = useMemo(() => {
    if (exercisesById) return exercisesById;
    return new Map((exercises ?? []).map((ex) => [ex.id, ex]));
  }, [exercisesById, exercises]);

  const movementEntries = steps
    .map((step, index) => ({
      step,
      index,
      exercise: !isRestStep(step) ? resolvedMap.get(step.exerciseId) : undefined,
    }))
    .filter((entry): entry is { step: SequenceStep; index: number; exercise: PilatesExercise } =>
      Boolean(entry.exercise),
    );

  if (movementEntries.length === 0) return null;

  const frameLimit = Number.isFinite(maxFrames) ? Math.max(1, Math.floor(maxFrames)) : 8;
  const visibleEntries = movementEntries.slice(0, frameLimit);
  const extraCount = Math.max(0, movementEntries.length - visibleEntries.length);

  return (
    <div
      className={`pf-visual-filmstrip ${compact ? 'is-compact' : ''}`.trim()}
      data-testid={testId}
      aria-label="시퀀스 비주얼 흐름 미리보기"
    >
      <p className="pf-visual-filmstrip__note">
        기구·동작군 대표 3D 포즈 · 개별 동작의 자세와 주의사항은 세부 안내에서 확인하세요.
      </p>
      <div className="pf-visual-filmstrip__rail">
        {visibleEntries.map(({ step, index, exercise }) => {
          const studio3d = resolveStudio3DMotionForExercise(exercise);
          const isActive =
            (activeStepId !== undefined && activeStepId !== null && activeStepId === step.stepId) ||
            (activeStepIndex !== undefined && activeStepIndex === index);
          const mediaStack = (
            <span className="pf-visual-filmstrip__media" aria-hidden="true">
              <img
                src={studio3d.startImg}
                alt=""
                loading="lazy"
                className="pf-visual-filmstrip__img-start"
              />
              <img
                src={studio3d.peakImg}
                alt=""
                loading="lazy"
                className="pf-visual-filmstrip__img-peak"
              />
            </span>
          );
          if (onSelectStep) {
            return (
              <button
                key={step.stepId}
                type="button"
                className={`pf-visual-filmstrip__frame ${isActive ? 'is-active' : ''}`.trim()}
                onClick={(e) => onSelectStep(step, index, e.currentTarget)}
                title={`${index + 1}. ${exercise.nameKo}`}
                aria-label={`필름스트립 ${index + 1}번 ${exercise.nameKo} 이동`}
                aria-pressed={isActive}
              >
                {mediaStack}
                <span className="pf-visual-filmstrip__num" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                {!compact && (
                  <span className="pf-visual-filmstrip__caption" aria-hidden="true">
                    {exercise.nameKo}
                  </span>
                )}
              </button>
            );
          }
          return (
            <div
              key={step.stepId}
              className={`pf-visual-filmstrip__frame is-static ${isActive ? 'is-active' : ''}`.trim()}
              role="img"
              aria-label={`${index + 1}. ${exercise.nameKo} 대표 3D 포즈`}
            >
              {mediaStack}
              <span className="pf-visual-filmstrip__num">{String(index + 1).padStart(2, '0')}</span>
            </div>
          );
        })}
        {extraCount > 0 && (
          <div
            className="pf-visual-filmstrip__more"
            aria-label={`미리보기 외 동작 ${extraCount}개`}
          >
            +{extraCount}컷
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Interactive Dual Start <-> Peak 3D Pose Strip with live trajectory vector HUD
 * and optional Start->Peak crossfade motion toggle on Atlas & Finder cards.
 */
export const VisualDual3DPoseStrip: React.FC<{
  readonly exercise: PilatesExercise;
  readonly interactive?: boolean;
}> = ({ exercise, interactive = true }) => {
  const studio3d = resolveStudio3DMotionForExercise(exercise);
  const markerId = useId();
  const [morphing, setMorphing] = useState(false);
  const [phaseTick, setPhaseTick] = useState<'start' | 'peak'>('peak');

  useEffect(() => {
    if (!morphing || isReducedMotionPreferred()) return;
    const timer = window.setInterval(() => {
      setPhaseTick((prev) => (prev === 'start' ? 'peak' : 'start'));
    }, 1150);
    return () => window.clearInterval(timer);
  }, [morphing]);

  const [fx, fy] = studio3d.trajectoryArc.from;
  const [cx, cy] = studio3d.trajectoryArc.ctrl;
  const [tx, ty] = studio3d.trajectoryArc.to;

  return (
    <div
      className={`pf-dual-3d-pose-strip ${morphing ? 'is-morphing' : ''}`.trim()}
      data-testid="visual-dual-3d-pose-strip"
    >
      <div className="pf-dual-3d-pose-strip__cell" aria-hidden="true">
        <img src={studio3d.startImg} alt="" loading="lazy" />
        <em>● 시작</em>
      </div>
      <div className="pf-dual-3d-pose-strip__cell is-peak" aria-hidden="true">
        <img
          src={studio3d.startImg}
          alt=""
          loading="lazy"
          className={`pf-dual-3d-pose-strip__ghost ${
            morphing && phaseTick === 'start' ? 'is-visible' : ''
          }`.trim()}
        />
        <img
          src={studio3d.peakImg}
          alt=""
          loading="lazy"
          className={`pf-dual-3d-pose-strip__main ${
            morphing && phaseTick === 'start' ? 'is-dimmed' : ''
          }`.trim()}
        />
        <svg
          viewBox="0 0 100 65.625"
          preserveAspectRatio="none"
          className="pf-dual-3d-pose-strip__vector"
        >
          <defs>
            <marker
              id={`pf-dual-vec-${markerId}`}
              viewBox="0 0 10 10"
              refX="7"
              refY="5"
              markerWidth="4.5"
              markerHeight="4.5"
              orient="auto"
            >
              <path
                d="M 1.5 1.5 L 8 5 L 1.5 8.5"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </marker>
          </defs>
          <path
            d={`M ${fx} ${fy * 0.65625} Q ${cx} ${cy * 0.65625} ${tx} ${ty * 0.65625}`}
            fill="none"
            stroke="#F59E0B"
            strokeWidth="1.8"
            strokeLinecap="round"
            className="pf-hud-trajectory-path"
            markerEnd={`url(#pf-dual-vec-${markerId})`}
          />
        </svg>
        <em>
          {morphing ? (phaseTick === 'start' ? '● 시작 전환' : '◆ 정점 수축') : '◆ 정점·궤적'}
        </em>
      </div>
      {interactive && !isReducedMotionPreferred() && (
        <button
          type="button"
          className={`pf-dual-3d-pose-strip__play ${morphing ? 'is-playing' : ''}`.trim()}
          aria-pressed={morphing}
          aria-label={`${exercise.nameKo} 3D 시작·정점 교차 모션 ${morphing ? '정지' : '재생'}`}
          onClick={(e) => {
            e.stopPropagation();
            setMorphing((prev) => !prev);
          }}
        >
          {morphing ? (
            <Pause size={11} aria-hidden="true" />
          ) : (
            <Play size={11} aria-hidden="true" />
          )}
          <span>{morphing ? '모션 정지' : '모션 재생'}</span>
        </button>
      )}
    </div>
  );
};

/**
 * Top-down architectural SVG glyph of a Pilates Reformer / Apparatus bed inside studio spot tiles
 * with subtle spring-guided carriage glide micro-motion when selected or hovered.
 */
export const VisualApparatusSpotGlyph: React.FC<{
  readonly apparatus?: ApparatusType;
  readonly selected?: boolean;
  readonly occupied?: boolean;
}> = ({ selected = false, occupied = false }) => (
  <svg
    className={`pf-spot-carriage-svg ${selected ? 'is-selected' : ''} ${occupied ? 'is-occupied' : ''}`.trim()}
    width="38"
    height="54"
    viewBox="0 0 38 54"
    fill="none"
    aria-hidden="true"
  >
    <rect
      x="3"
      y="2"
      width="32"
      height="50"
      rx="7"
      stroke="currentColor"
      strokeWidth="2"
      fill={selected ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255,255,255,0.65)'}
    />
    <line
      x1="8"
      y1="9"
      x2="30"
      y2="9"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <rect
      className="pf-spot-carriage-bed"
      x="7"
      y="16"
      width="24"
      height="25"
      rx="4"
      fill={selected ? '#A7F3D0' : occupied ? '#CBD5D0' : '#CBEAD9'}
    />
    <line x1="12" y1="45" x2="12" y2="49" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
    <line x1="19" y1="45" x2="19" y2="49" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
    <line x1="26" y1="45" x2="26" y2="49" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/**
 * Intuitive Spine Alignment & 4-Plane Balance SVG visual diagram with gentle axial breath motion.
 */
export const VisualSpineBalanceDiagram: React.FC<{
  readonly underRepresentedPlaneId?: string | null;
}> = ({ underRepresentedPlaneId }) => (
  <div
    className="pf-visual-spine-figure"
    data-testid="visual-spine-balance-diagram"
    aria-hidden="true"
  >
    <svg width="78" height="108" viewBox="0 0 78 108" fill="none">
      <rect x="2" y="2" width="74" height="104" rx="16" fill="#EDF7F2" stroke="#CDE5D9" />
      <circle
        className="pf-spine-head-node"
        cx="39"
        cy="18"
        r="7"
        fill="#0F6B4E"
        fillOpacity="0.18"
        stroke="#0F6B4E"
        strokeWidth="1.8"
      />
      <path
        className="pf-spine-curve-path"
        d="M39 27 C34 40, 44 56, 38 72 C35 80, 39 89, 39 95"
        stroke="#0F6B4E"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      {[33, 42, 51, 60, 69, 78, 87].map((cy, idx) => (
        <rect
          key={cy}
          className="pf-spine-vertebra"
          x={33 + (idx % 2 === 0 ? -1 : 1)}
          y={cy - 2}
          width="12"
          height="4"
          rx="2"
          fill={underRepresentedPlaneId ? '#14845F' : '#0F6B4E'}
        />
      ))}
      <path
        className="pf-spine-breath-arc is-left"
        d="M19 52 C19 42, 26 36, 30 36"
        stroke="#10B981"
        strokeWidth="1.6"
        strokeDasharray="3 2"
        strokeLinecap="round"
      />
      <path
        className="pf-spine-breath-arc is-right"
        d="M59 52 C59 62, 52 68, 48 68"
        stroke="#10B981"
        strokeWidth="1.6"
        strokeDasharray="3 2"
        strokeLinecap="round"
      />
    </svg>
  </div>
);

/**
 * Live Breath & Progress Halo Ring for LiveStageView so instructors and members feel
 * the calm Pilates ribcage breath cadence alongside remaining step progress.
 */
export const VisualBreathPacerRing: React.FC<{
  readonly running: boolean;
  readonly progressPct?: number;
  readonly phaseLabel?: string;
  readonly breathLabel?: string;
  readonly size?: number;
}> = ({ running, progressPct = 50, phaseLabel, breathLabel }) => {
  const radius = 21;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, Number.isFinite(progressPct) ? progressPct : 50));
  const dashOffset = circumference * (1 - clamped / 100);
  const resolvedLabel = phaseLabel || breathLabel || '흉곽 호흡 유지';

  return (
    <div
      className={`pf-breath-pacer-pill ${running ? 'is-breathing' : ''}`.trim()}
      data-testid="live-breath-pacer-ring"
      aria-hidden="true"
    >
      <span className="pf-breath-pacer-pill__ring-wrap">
        <span className="pf-breath-pacer-pill__halo" />
        <svg width="50" height="50" viewBox="0 0 50 50">
          <circle
            cx="25"
            cy="25"
            r={radius}
            fill="none"
            stroke="rgba(15, 107, 78, 0.16)"
            strokeWidth="3.5"
          />
          <circle
            cx="25"
            cy="25"
            r={radius}
            fill="none"
            stroke="#0F6B4E"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 25 25)"
            className="pf-breath-pacer-pill__progress"
          />
          <circle cx="25" cy="25" r="7" fill="#0F6B4E" className="pf-breath-pacer-pill__core" />
        </svg>
      </span>
      <span className="pf-breath-pacer-pill__copy">
        <strong>{running ? '호흡 페이서 작동 중' : '호흡 리듬 대기'}</strong>
        <small>
          {resolvedLabel} · 진행 {Math.round(clamped)}%
        </small>
      </span>
    </div>
  );
};
