import React, { useMemo, useState } from 'react';
import { Image, Layers, Play, ShieldAlert, Sparkles, Wind } from 'lucide-react';
import { APPARATUS_LABELS, POSITION_LABELS } from '../data/pilatesCatalog';
import { getCatalogContinuousMotionAsset } from '../data/catalogMotionAssets';
import { getExpandedMovementVisualBinding } from '../data/expandedMovementVisualBindings';
import { getMovementVisualAsset, type VisualPhaseId } from '../data/movementVisualRigCatalog';
import type { PilatesExercise } from '../types/pilates';
import { CatalogMotionInteractivePlayer } from './CatalogMotionInteractivePlayer';
import { ExerciseMotionArtwork } from './ExerciseMotionArtwork';
import { MotionSourceOnlyNotice } from './MotionSourceOnlyNotice';
import { UnmodeledMotionNotice } from './UnmodeledMotionNotice';
import { SpringVisualPills } from './SpringVisualPills';
import '../styles/studio-motion-study.css';

export type Studio3DViewMode = 'motion' | 'compare' | VisualPhaseId;

export interface Studio3DMotionHeroCardProps {
  readonly exercise: PilatesExercise;
  readonly compact?: boolean;
  readonly active?: boolean;
}

export const Studio3DMotionHeroCard: React.FC<Studio3DMotionHeroCardProps> = (props) => (
  <Studio3DMotionHeroContent key={props.exercise.id} {...props} />
);

const POSTURE_FRAMES = [
  { phase: 'start' as const, stepNo: '01', label: '시작 자세' },
  { phase: 'middle' as const, stepNo: '02', label: '정점 자세' },
  { phase: 'end' as const, stepNo: '03', label: '종료 자세' },
];

const Studio3DMotionHeroContent: React.FC<Studio3DMotionHeroCardProps> = ({
  exercise,
  compact = false,
  active = true,
}) => {
  const motionAsset = useMemo(() => getCatalogContinuousMotionAsset(exercise), [exercise]);
  const binding = getExpandedMovementVisualBinding(exercise);
  const sourceOnly = binding?.nativeMotionAvailable === false;
  const unmodeled = !sourceOnly && !motionAsset;
  const hasNativeMotion = !sourceOnly && !unmodeled;
  // A source-backed exercise entry is not evidence that a dedicated motion was authored.
  const representative =
    /^expanded-|^crawled-/.test(exercise.id) || !getMovementVisualAsset(exercise.id);
  const [mode, setMode] = useState<Studio3DViewMode>('motion');
  const postureMode = mode !== 'motion';
  const activePhase: VisualPhaseId = mode === 'start' ? 'start' : mode === 'end' ? 'end' : 'middle';
  const patternTitle = representative ? motionAsset?.visualAsset.archetypeTitleKo : exercise.nameKo;
  const muscleLabel = exercise.targetMuscles.slice(0, 2).join(' · ') || '동작별 안내 확인';
  const topCues = exercise.cues.filter((cue) => cue.trim().length > 0).slice(0, 2);
  const postureFrames = POSTURE_FRAMES.map((item) =>
    item.phase === 'end' ? { ...item, label: motionAsset?.endPoseLabelKo ?? item.label } : item,
  );

  return (
    <section
      className={`pf-studio3d-hero-card pf-unified-motion-hero ${compact ? 'is-compact' : ''}`.trim()}
      data-testid="studio-3d-motion-hero-card"
      data-motion-mode={sourceOnly ? 'source-video' : unmodeled ? 'apparatus-reference' : mode}
      data-match-scope={
        sourceOnly
          ? 'source-video-only'
          : unmodeled
            ? 'unmodeled-exercise'
            : representative
              ? 'representative-pattern'
              : 'catalog-authored-pattern'
      }
      data-anatomical-accuracy-assumed="false"
      aria-label={`${exercise.nameKo} 동작 흐름과 자세 프레임`}
    >
      <div className="pf-studio3d-hero-card__top">
        <div className="pf-studio3d-hero-card__badges">
          <span className="pf-studio3d-scope-pill">
            {APPARATUS_LABELS[exercise.apparatus]?.ko ?? exercise.apparatus} ·{' '}
            {POSITION_LABELS[exercise.bodyPosition]?.ko ?? exercise.bodyPosition}
          </span>
          <span className="pf-studio3d-honest-pill">
            {sourceOnly ? '제작자 영상으로 동작 확인' : unmodeled ? '수정한 동작 · 전용 도해 없음' : '임상 각도·개인 적합성은 강사 현장 확인'}
          </span>
        </div>
        {hasNativeMotion && (
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
              <Play size={14} aria-hidden="true" /> 동작 재생
            </button>
            <button
              type="button"
              className={`pf-studio3d-mode-btn ${postureMode ? 'is-active' : ''}`}
              aria-pressed={postureMode}
              onClick={() => setMode('start')}
            >
              <Image size={14} aria-hidden="true" /> 자세 프레임
            </button>
          </div>
        )}
      </div>

      {sourceOnly && binding && (
        <MotionSourceOnlyNotice
          exerciseId={exercise.id}
          nameKo={exercise.nameKo}
          apparatus={exercise.apparatus}
          reasonKo={binding.reasonKo}
          sourceUrl={binding.sourceUrl}
        />
      )}

      {unmodeled && (
        <UnmodeledMotionNotice exercise={exercise} />
      )}

      {hasNativeMotion && mode === 'motion' && motionAsset && (
        <CatalogMotionInteractivePlayer
          asset={motionAsset}
          active={active}
          presentation="studio"
          compact={compact}
          representative={representative}
        />
      )}

      {hasNativeMotion && postureMode && (
        <div className="pf-motion-illustration-view">
          <p className="pf-motion-illustration-note">
            <strong>{patternTitle}</strong>
            <span>
              {representative
                ? '대표 패턴의 시작·정점·종료 자세입니다.'
                : '재생 중인 동작과 같은 모델의 시작·정점·종료 자세입니다.'}
            </span>
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
            <Layers size={14} aria-hidden="true" /> 세 자세 나란히 보기
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
                <small>수업 계획의 호흡 안내</small>
              </div>
            </div>
            <div className="pf-detail-essential-pill">
              <span className="pf-detail-essential-pill__label">
                <Sparkles size={13} aria-hidden="true" /> 주동근 · 계획 시간
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
