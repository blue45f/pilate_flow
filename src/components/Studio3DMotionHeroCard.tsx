import React, { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Box, ExternalLink, Image, Layers, ShieldAlert, Target, Wind } from 'lucide-react';
import { APPARATUS_LABELS, POSITION_LABELS } from '../data/pilatesCatalog';
import { getCatalogContinuousMotionAsset } from '../data/catalogMotionAssets';
import { getExpandedMovementVisualBinding } from '../data/expandedMovementVisualBindings';
import type { VisualPhaseId } from '../data/movementVisualRigCatalog';
import {
  hasDedicated3DExerciseRig,
  sampleUniversal3DExerciseRig,
} from '../data/universal3dExerciseRigs';
import type { BoxState, FootbarState, HeadrestState, PilatesExercise } from '../types/pilates';
import { ExerciseMotionArtwork } from './ExerciseMotionArtwork';
import { SpringVisualPills } from './SpringVisualPills';
import { StudioInteractive3DViewport } from './StudioInteractive3DViewport';
import '../styles/studio-motion-study.css';

export type Studio3DViewMode = 'motion' | 'compare' | VisualPhaseId;

export interface Studio3DMotionHeroCardProps {
  readonly exercise: PilatesExercise;
  readonly compact?: boolean;
  readonly active?: boolean;
}

const FOOTBAR_LABELS_KO: Record<FootbarState, string> = {
  high: '높음',
  mid: '중간',
  low: '낮음',
  down: '내림',
  none: '미사용',
};

const HEADREST_LABELS_KO: Record<HeadrestState, string> = {
  up: '올림',
  flat: '평평함',
  down: '내림',
};

const FRIENDLY_POSITION_KO: Record<PilatesExercise['bodyPosition'], string> = {
  supine: '편안히 누운 자세',
  prone: '엎드린 자세',
  'side-lying': '옆으로 누운 자세',
  seated: '바르게 앉은 자세',
  kneeling: '무릎 지지 자세',
  quadruped: '네발기기 자세',
  standing: '선 자세',
};

const BOX_LABELS_KO: Record<BoxState, string> = {
  none: '',
  'long-box': '롱박스',
  'short-box': '숏박스',
};

// eslint-disable-next-line react-refresh/only-export-components
export function formatExerciseSetupSummaryKo(exercise: PilatesExercise): string {
  const posKo =
    FRIENDLY_POSITION_KO[exercise.bodyPosition] ??
    POSITION_LABELS[exercise.bodyPosition]?.ko ??
    exercise.bodyPosition;
  if (exercise.apparatus === 'reformer') {
    const boxPart = BOX_LABELS_KO[exercise.box] ? ` · ${BOX_LABELS_KO[exercise.box]}` : '';
    return `풋바 ${FOOTBAR_LABELS_KO[exercise.footbar]} · 헤드레스트 ${HEADREST_LABELS_KO[exercise.headrest]}${boxPart}`;
  }
  if (exercise.apparatus === 'cadillac') {
    return `타워·바 안전핀 확인 · ${posKo}`;
  }
  if (exercise.apparatus === 'chair') {
    return `페달·핸들 고정 확인 · ${posKo}`;
  }
  if (exercise.apparatus === 'barrel') {
    return `바렐 정점·래더 간격 조절 · ${posKo}`;
  }
  const hasProps = exercise.props.some((prop) => prop !== 'none');
  return hasProps ? `매트 수평 정렬 · 소도구 위치 확인 (${posKo})` : `매트 수평 정렬 · ${posKo}`;
}

export const Studio3DMotionHeroCard: React.FC<Studio3DMotionHeroCardProps> = (props) => {
  const identityKey = `${props.exercise.id}:${props.exercise.apparatus}:${props.exercise.bodyPosition}`;
  return <Studio3DMotionHeroContent key={identityKey} {...props} />;
};

const POSTURE_FRAMES = [
  { phase: 'start' as const, stepNo: '01', label: '시작 자세' },
  { phase: 'middle' as const, stepNo: '02', label: '정점 자세' },
  { phase: 'end' as const, stepNo: '03', label: '종료 자세' },
];

const STUDIO_3D_HERO_UNSLOP_CSS = `
.pf-p07-clean-detail {
  gap: 10px !important;
}
.pf-p07-clean-detail .yt-preview-step-guide.pf-p07-top-tabs {
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: nowrap !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 8px !important;
  padding: 4px 6px !important;
  margin: 0 0 6px !important;
  border-radius: 12px !important;
  background: #f4f2ec !important;
  border: 1px solid rgba(31, 68, 53, 0.09) !important;
  box-shadow: none !important;
}
.pf-p07-clean-detail .yt-preview-step-guide .pf-step-guide-list {
  display: inline-flex !important;
  flex: 0 0 auto !important;
  flex-wrap: nowrap !important;
  align-items: center !important;
  gap: 2px !important;
  margin: 0 !important;
  padding: 2px !important;
  border-radius: 9px !important;
  background: rgba(31, 68, 53, 0.05) !important;
}
.pf-p07-clean-detail .yt-preview-step-guide .pf-step-guide-chip {
  min-height: 32px !important;
  min-width: 0 !important;
  padding: 4px 10px !important;
  border-radius: 7px !important;
  border: 1px solid transparent !important;
  background: transparent !important;
  color: #5b6961 !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  font-variant-numeric: tabular-nums !important;
  white-space: nowrap !important;
  box-shadow: none !important;
  transition: background-color 150ms cubic-bezier(0.22, 1, 0.36, 1), color 150ms cubic-bezier(0.22, 1, 0.36, 1), border-color 150ms cubic-bezier(0.22, 1, 0.36, 1);
}
.pf-p07-clean-detail .yt-preview-step-guide .pf-step-guide-chip[aria-current='step'],
.pf-p07-clean-detail .yt-preview-step-guide .pf-step-guide-chip.is-active {
  background: #ffffff !important;
  color: #1f4435 !important;
  font-weight: 600 !important;
  border-color: rgba(31, 68, 53, 0.12) !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
}
.pf-p07-clean-detail .yt-preview-step-guide .pf-step-guide-Subrow {
  display: inline-flex !important;
  flex: 1 1 0 !important;
  flex-wrap: nowrap !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: 8px !important;
  min-width: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
}
.pf-p07-clean-detail .yt-preview-step-guide .pf-step-guide-focus {
  flex: 0 1 auto !important;
  min-width: 0 !important;
  margin: 0 !important;
  font-size: 11.5px !important;
  font-weight: 400 !important;
  color: #6b766f !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  font-variant-numeric: tabular-nums !important;
}
.pf-p07-clean-detail .yt-preview-step-guide .pf-step-guide-nav {
  display: inline-flex !important;
  flex: 0 0 auto !important;
  flex-wrap: nowrap !important;
  gap: 4px !important;
}
.pf-p07-clean-detail .yt-preview-step-guide .pf-step-nav-btn {
  min-height: 32px !important;
  min-width: 0 !important;
  padding: 4px 9px !important;
  border-radius: 8px !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  white-space: nowrap !important;
}
@media (max-width: 719px) {
  .pf-p07-clean-detail .yt-preview-step-guide.pf-p07-top-tabs {
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 6px !important;
    padding: 6px !important;
  }
  .pf-p07-clean-detail .yt-preview-step-guide .pf-step-guide-list {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    width: 100% !important;
  }
  .pf-p07-clean-detail .yt-preview-step-guide .pf-step-guide-chip {
    min-height: 44px !important;
    padding: 4px 6px !important;
    font-size: 11.5px !important;
    justify-content: center !important;
    text-align: center !important;
    white-space: normal !important;
  }
  .pf-p07-clean-detail .yt-preview-step-guide .pf-step-guide-Subrow {
    display: flex !important;
    flex-direction: row !important;
    width: 100% !important;
    justify-content: space-between !important;
    gap: 6px !important;
  }
  .pf-p07-clean-detail .yt-preview-step-guide .pf-step-guide-focus {
    flex: 1 1 0 !important;
    font-size: 11px !important;
  }
  .pf-p07-clean-detail .yt-preview-step-guide .pf-step-nav-btn {
    min-height: 44px !important;
    padding: 4px 10px !important;
    font-size: 11.5px !important;
  }
}

.pf-studio3d-hero-card.pf-unslop-hero3d {
  display: grid;
  gap: 10px !important;
  padding: 12px !important;
  border-radius: 16px !important;
  background: #ffffff !important;
  border: 1px solid rgba(31, 68, 53, 0.10) !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
}
.pf-studio3d-hero-card.pf-unslop-hero3d.is-compact {
  padding: 10px !important;
  gap: 8px !important;
}
.pf-unslop-hero3d .pf-studio3d-hero-card__top {
  display: flex !important;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px 10px !important;
  margin-bottom: 0 !important;
}
.pf-unslop-hero3d .pf-studio3d-hero-card__badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.pf-unslop-hero3d .pf-studio3d-scope-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px !important;
  border-radius: 6px !important;
  background: #f4f2ec !important;
  color: #1f2d27 !important;
  border: 1px solid rgba(31, 68, 53, 0.10) !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  text-decoration: none;
  box-shadow: none !important;
}
.pf-unslop-hero3d a.pf-studio3d-scope-pill:hover {
  background: #ebe7dd !important;
}
.pf-unslop-hero3d .pf-studio3d-honest-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 4px !important;
  border-radius: 6px !important;
  background: transparent !important;
  color: #6b766f !important;
  font-size: 11.5px !important;
  font-weight: 400 !important;
}
.pf-unslop-hero3d .pf-studio3d-mode-tabs {
  width: auto !important;
  display: inline-flex !important;
  flex-wrap: nowrap !important;
  padding: 3px !important;
  gap: 2px !important;
  border-radius: 10px !important;
  background: #f2f0e9 !important;
  border: 1px solid rgba(31, 68, 53, 0.09) !important;
}
.pf-unslop-hero3d .pf-studio3d-mode-btn {
  min-height: 32px !important;
  min-width: 0 !important;
  padding: 4px 10px !important;
  border-radius: 7px !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  color: #5b6961 !important;
  background: transparent !important;
  border: 1px solid transparent !important;
  box-shadow: none !important;
  transition: background-color 150ms cubic-bezier(0.22, 1, 0.36, 1), color 150ms cubic-bezier(0.22, 1, 0.36, 1);
}
.pf-unslop-hero3d .pf-studio3d-mode-btn.is-active {
  background: #ffffff !important;
  color: #1f4435 !important;
  font-weight: 600 !important;
  border-color: rgba(31, 68, 53, 0.12) !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
}
.pf-unslop-hero3d .pf-hero-3d-modeler-panel {
  margin-top: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 10px !important;
  background: transparent !important;
}
.pf-unslop-hero3d .pf-orbit3d-canvas-wrap {
  border-radius: 10px !important;
  border: 1px solid rgba(31, 68, 53, 0.10) !important;
}
@media (min-width: 1024px) {
  .pf-unslop-hero3d:not(.is-compact) .pf-orbit3d-canvas-wrap {
    aspect-ratio: 16 / 9;
    max-height: min(40vh, 344px);
  }
}
@media (min-width: 640px) and (max-width: 1023px) {
  .pf-unslop-hero3d:not(.is-compact) .pf-orbit3d-canvas-wrap {
    aspect-ratio: 16 / 9.5;
    max-height: min(38vh, 356px);
  }
}
@media (max-width: 639px) {
  .pf-unslop-hero3d:not(.is-compact) .pf-orbit3d-canvas-wrap {
    aspect-ratio: 16 / 10;
    max-height: min(36vh, 236px);
  }
  .pf-unslop-hero3d .pf-studio3d-honest-pill {
    display: none;
  }
}
.pf-unslop-hero3d .pf-native-posture-stage,
.pf-unslop-hero3d .pf-studio3d-frame-thumb,
.pf-unslop-hero3d .pf-motion-image-compare,
.pf-unslop-hero3d .pf-detail-essential-pill,
.pf-unslop-hero3d .pf-detail-quick-cue-box {
  border-radius: 10px !important;
}
.pf-unslop-hero3d .pf-detail-essential-pill {
  padding: 10px 12px !important;
  gap: 4px !important;
  background: #faf9f5 !important;
  border: 1px solid rgba(31, 68, 53, 0.09) !important;
}
.pf-unslop-hero3d .pf-detail-essential-pill__label {
  font-size: 12px !important;
  font-weight: 400 !important;
  color: #6b766f !important;
  gap: 6px !important;
}
.pf-unslop-hero3d .pf-detail-essential-pill__label svg {
  color: #6b766f;
  flex-shrink: 0;
}
.pf-unslop-hero3d .pf-detail-essential-pill__val strong {
  font-size: 13.5px !important;
  font-weight: 500 !important;
  color: #1b2822 !important;
}
.pf-unslop-hero3d .pf-detail-essential-pill__val small {
  font-size: 12px !important;
  font-weight: 400 !important;
  color: #6b766f !important;
  font-variant-numeric: tabular-nums !important;
}
.pf-unslop-hero3d .pf-spring-pills {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}
.pf-unslop-hero3d .pf-spring-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 7px !important;
  border-radius: 6px !important;
  background: #ffffff !important;
  border: 1px solid rgba(31, 68, 53, 0.15) !important;
  box-shadow: 0 1px 0 rgba(31, 68, 53, 0.08) !important;
  color: #1b2822 !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  font-variant-numeric: tabular-nums !important;
}
.pf-unslop-hero3d .pf-studio3d-frame-thumb__num,
.pf-unslop-hero3d .pf-native-posture-frame > figcaption {
  font-variant-numeric: tabular-nums !important;
}
.pf-unslop-hero3d .pf-detail-quick-cue-box {
  padding: 12px !important;
  gap: 8px !important;
  border: 1px solid rgba(31, 68, 53, 0.09) !important;
}
.pf-unslop-hero3d .pf-detail-quick-cue-box__cues strong {
  font-size: 12.5px !important;
  font-weight: 600 !important;
  color: #1f4435 !important;
}
.pf-unslop-hero3d .pf-detail-layer-tab {
  border-radius: 7px !important;
  font-weight: 500 !important;
}
@media (pointer: coarse), (max-width: 767px) {
  .pf-unslop-hero3d .pf-studio3d-mode-btn,
  .pf-unslop-hero3d .pf-detail-layer-tab {
    min-height: 44px !important;
  }
}
.pf-unslop-hero3d .pf-detail-quick-cue-box__caution {
  border-radius: 8px !important;
  padding: 8px 10px !important;
  font-weight: 400 !important;
}
`;

const Studio3DMotionHeroContent: React.FC<Studio3DMotionHeroCardProps> = ({
  exercise,
  compact = false,
  active = true,
}) => {
  const motionAsset = useMemo(() => getCatalogContinuousMotionAsset(exercise), [exercise]);
  const binding = getExpandedMovementVisualBinding(exercise);
  const dedicated3d = hasDedicated3DExerciseRig(exercise);
  const rigSample = useMemo(() => sampleUniversal3DExerciseRig(exercise, 1), [exercise]);
  const rigDescription = rigSample.rigId === exercise.id
    ? '동작별 3D 도해'
    : dedicated3d ? '같은 동작군의 대표 자세' : '자세 유형을 바탕으로 만든 도해';
  const [mode, setMode] = useState<Studio3DViewMode>('motion');
  const [previewLayer, setPreviewLayer] = useState<'easy' | 'standard' | 'hard'>('standard');
  const prefersReduced = useReducedMotion();
  const useAnimatedPill =
    !prefersReduced && !(typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent));
  const postureMode = mode !== 'motion';
  const activePhase: VisualPhaseId = mode === 'start' ? 'start' : mode === 'end' ? 'end' : 'middle';
  const muscleLabel = exercise.targetMuscles.slice(0, 2).join(' · ') || '동작별 안내 확인';
  const topCues = exercise.cues.filter((cue) => cue.trim().length > 0).slice(0, 2);
  const setupSummaryKo = useMemo(() => formatExerciseSetupSummaryKo(exercise), [exercise]);
  const postureFrames = POSTURE_FRAMES.map((item) =>
    item.phase === 'end' && dedicated3d && motionAsset?.endPoseLabelKo
      ? { ...item, label: motionAsset.endPoseLabelKo }
      : item,
  );

  return (
    <section
      className={`pf-studio3d-hero-card pf-unified-motion-hero pf-unslop-hero3d ${compact ? 'is-compact' : ''}`.trim()}
      data-testid="studio-3d-motion-hero-card"
      data-motion-mode={mode}
      data-match-scope={dedicated3d ? 'catalog-authored-pattern' : 'representative-pattern'}
      data-3d-rig-scope={rigSample.rigScope}
      data-anatomical-accuracy-assumed="false"
      aria-label={`${exercise.nameKo} 3D 동작 흐름과 자세 프레임`}
    >
      <style>{STUDIO_3D_HERO_UNSLOP_CSS}</style>
      <div className="pf-studio3d-hero-card__top">
        <div className="pf-studio3d-hero-card__badges">
          <span className="pf-studio3d-scope-pill">
            {APPARATUS_LABELS[exercise.apparatus]?.ko ?? exercise.apparatus} ·{' '}
            {FRIENDLY_POSITION_KO[exercise.bodyPosition] ??
              POSITION_LABELS[exercise.bodyPosition]?.ko ??
              exercise.bodyPosition}
          </span>
          <span className="pf-studio3d-honest-pill">
            {rigDescription} · {dedicated3d ? '실제 자세와 범위는 강사가 확인하세요.' : '동작 설명과 함께 확인하세요.'}
          </span>
          {binding?.sourceUrl && (
            <a
              href={binding.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pf-studio3d-scope-pill"
            >
              제작자 동작 영상 보기 <ExternalLink size={14} strokeWidth={1.5} aria-hidden="true" />
            </a>
          )}
        </div>
        <div
          className="pf-studio3d-mode-tabs pf-motion-view-tabs"
          role="group"
          aria-label="동작 보기 방식"
        >
          <button
            type="button"
            className={`pf-studio3d-mode-btn ${mode === 'motion' ? 'is-active' : ''}`}
            aria-pressed={mode === 'motion'}
            onClick={() => setMode('motion')}
          >
            {mode === 'motion' &&
              (useAnimatedPill ? (
                <motion.span
                  layoutId={`pf-hero3d-mode-${exercise.id}`}
                  className="pf-seg-pill"
                  aria-hidden="true"
                  transition={{ type: 'spring', duration: 0.24, bounce: 0 }}
                />
              ) : (
                <span className="pf-seg-pill" aria-hidden="true" />
              ))}
            <Box size={15} strokeWidth={1.5} aria-hidden="true" /> <span>3D 모션</span>
          </button>
          <button
            type="button"
            className={`pf-studio3d-mode-btn ${postureMode ? 'is-active' : ''}`}
            aria-pressed={postureMode}
            onClick={() => setMode('start')}
          >
            {postureMode &&
              (useAnimatedPill ? (
                <motion.span
                  layoutId={`pf-hero3d-mode-${exercise.id}`}
                  className="pf-seg-pill"
                  aria-hidden="true"
                  transition={{ type: 'spring', duration: 0.24, bounce: 0 }}
                />
              ) : (
                <span className="pf-seg-pill" aria-hidden="true" />
              ))}
            <Image size={15} strokeWidth={1.5} aria-hidden="true" /> <span>3D 자세 프레임</span>
          </button>
        </div>
      </div>

      {!dedicated3d && (
        <div
          className="pf-motion-illustration-note"
          data-testid="studio-motion-study-player"
          data-match-scope="representative-pattern"
        >
          <h4 style={{ margin: 0, fontSize: '0.84rem', fontWeight: 500 }}>
            {rigSample.poseFeatureKo}
          </h4>
          <span>절차적 3D 재구성 · 이 동작의 세부 수행은 연결 영상에서 확인하세요.</span>
        </div>
      )}

      {mode === 'motion' && (
        <div className="pf-hero-3d-modeler-panel" data-testid="interactive-3d-modeler-panel">
          <StudioInteractive3DViewport exercise={exercise} compact={compact} active={active} />
        </div>
      )}

      {postureMode && (
        <div className="pf-motion-illustration-view">
          <p className="pf-motion-illustration-note">
            <strong>{dedicated3d ? exercise.nameKo : rigSample.poseFeatureKo}</strong>
            <span>{rigSample.poseFeatureKo} · 3D 시작·정점·종료 자세</span>
          </p>
          <div
            className={`pf-native-posture-stage ${mode === 'compare' ? 'is-comparing' : ''}`}
            data-active-pose={activePhase}
          >
            {postureFrames
              .filter((item) => mode === 'compare' || item.phase === activePhase)
              .map((item) => (
                <figure key={item.phase} className="pf-native-posture-frame">
                  <ExerciseMotionArtwork
                    exercise={exercise}
                    phase={item.phase}
                    decorative={false}
                  />
                  <figcaption>
                    {item.stepNo} · {item.label}
                  </figcaption>
                </figure>
              ))}
          </div>
          <div
            className="pf-studio3d-frame-strip pf-illustration-frame-strip"
            data-testid="studio-3d-frame-strip"
            role="group"
            aria-label="자세 프레임 단계 보기"
          >
            {postureFrames.map((item) => (
              <button
                key={item.phase}
                type="button"
                aria-pressed={mode === item.phase}
                className={`pf-studio3d-frame-thumb ${mode === item.phase ? 'is-active' : ''}`}
                onClick={() => setMode(item.phase)}
              >
                <span className="pf-studio3d-frame-thumb__art">
                  <ExerciseMotionArtwork exercise={exercise} phase={item.phase} />
                  <span className="pf-studio3d-frame-thumb__num">{item.stepNo}</span>
                </span>
                <span className="pf-studio3d-frame-thumb__label">{item.label}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="pf-motion-image-compare"
            aria-pressed={mode === 'compare'}
            onClick={() => setMode((previous) => (previous === 'compare' ? 'start' : 'compare'))}
          >
            <Layers size={15} strokeWidth={1.5} aria-hidden="true" /> 세 자세 나란히 보기
          </button>
        </div>
      )}

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
                <Layers size={15} strokeWidth={1.5} aria-hidden="true" /> 권장 스프링 · 셋업
              </span>
              <div className="pf-detail-essential-pill__val">
                {exercise.springs ? (
                  <SpringVisualPills springs={exercise.springs} />
                ) : (
                  <strong>기구별 직접 설정</strong>
                )}
                <small>{setupSummaryKo}</small>
              </div>
            </div>
            <div className="pf-detail-essential-pill">
              <span className="pf-detail-essential-pill__label">
                <Wind size={15} strokeWidth={1.5} aria-hidden="true" /> 호흡 · 리듬
              </span>
              <div className="pf-detail-essential-pill__val">
                <strong>{exercise.breathPattern || '자연스러운 흉곽 호흡 유지'}</strong>
                <small>수업 계획의 호흡 안내</small>
              </div>
            </div>
            <div className="pf-detail-essential-pill">
              <span className="pf-detail-essential-pill__label">
                <Target size={15} strokeWidth={1.5} aria-hidden="true" /> 주동근 · 계획 시간
              </span>
              <div className="pf-detail-essential-pill__val">
                <strong>{muscleLabel}</strong>
                <small>
                  기본 {exercise.defaultDurationMin}분{exercise.isUnilateral ? ' (양쪽 포함)' : ''}{' '}
                  · Lv {exercise.level}
                </small>
              </div>
            </div>
          </div>

          {(topCues.length > 0 ||
            exercise.layers.easy ||
            exercise.layers.standard ||
            exercise.layers.hard ||
            exercise.precautions?.trim()) && (
            <div className="pf-detail-quick-cue-box" data-testid="detail-quick-cue-box">
              {topCues.length > 0 && (
                <div className="pf-detail-quick-cue-box__cues">
                  <strong>핵심 티칭 큐</strong>
                  <ul>
                    {topCues.map((cue, idx) => (
                      <li key={idx}>{cue}</li>
                    ))}
                  </ul>
                </div>
              )}
              {(exercise.layers.easy || exercise.layers.standard || exercise.layers.hard) && (
                <div
                  className="pf-detail-layer-switcher"
                  data-testid="detail-layer-switcher"
                  role="group"
                  aria-label="난이도별 변형 큐 보기"
                >
                  <div className="pf-detail-layer-switcher__tabs">
                    <span>회원별 강도 조절</span>
                    {(
                      [
                        { id: 'easy', label: '완화' },
                        { id: 'standard', label: '기본' },
                        { id: 'hard', label: '심화' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={`pf-detail-layer-tab ${previewLayer === opt.id ? 'is-active' : ''}`}
                        aria-pressed={previewLayer === opt.id}
                        onClick={() => setPreviewLayer(opt.id)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p className="pf-detail-layer-switcher__text">
                    {exercise.layers[previewLayer] || '기본 동작 안내에 따라 진행합니다'}
                  </p>
                </div>
              )}
              {exercise.precautions?.trim() && (
                <p className="pf-detail-quick-cue-box__caution">
                  <ShieldAlert size={15} strokeWidth={1.5} aria-hidden="true" />
                  <span>
                    <strong>주의 포인트:</strong> {exercise.precautions}
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
