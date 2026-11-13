import { memo, useMemo, useState, type CSSProperties } from 'react';
import { getCatalogContinuousMotionAsset } from '../data/catalogMotionAssets';
import { getExpandedMovementVisualBinding } from '../data/expandedMovementVisualBindings';
import { getMovementVisualAsset, type VisualPhaseId } from '../data/movementVisualRigCatalog';
import { APPARATUS_LABELS } from '../data/pilatesCatalog';
import type { PilatesExercise } from '../types/pilates';
import { getExerciseArtworkFrame } from '../utils/exerciseArtworkCache';
import { ApparatusIllustrationSvg } from './ApparatusStudioArtwork';
import { MovementPhaseDiagramSvg } from './MovementPhaseDiagramSvg';
import '../styles/exercise-motion-artwork.css';

export interface ExerciseMotionArtworkProps {
  exercise: PilatesExercise;
  phase?: VisualPhaseId;
  className?: string;
  decorative?: boolean;
  label?: string;
  style?: CSSProperties;
  'data-testid'?: string;
}

const PHASE_LABELS: Record<VisualPhaseId, string> = {
  start: '시작 자세',
  middle: '정점 자세',
  end: '종료 자세',
};

/** One static frame from the same authored rig used by the motion player. */
export const ExerciseMotionArtwork = memo(function ExerciseMotionArtwork({
  exercise,
  phase = 'middle',
  className = '',
  decorative = true,
  label,
  style,
  'data-testid': testId,
}: ExerciseMotionArtworkProps) {
  const binding = getExpandedMovementVisualBinding(exercise);
  const sourceOnly = binding?.nativeMotionAvailable === false;
  const cachedFrame = sourceOnly ? undefined : getExerciseArtworkFrame(exercise, phase);
  const [failedFrameSrc, setFailedFrameSrc] = useState<string | null>(null);
  const useCachedFrame = Boolean(cachedFrame && cachedFrame.src !== failedFrameSrc);
  const representative =
    /^expanded-|^crawled-/.test(exercise.id) || !getMovementVisualAsset(exercise.id);
  const motion = useMemo(
    () => sourceOnly || (useCachedFrame && !representative) ? null : getCatalogContinuousMotionAsset(exercise),
    [exercise, sourceOnly, useCachedFrame, representative],
  );
  const unmodeled = !sourceOnly && !useCachedFrame && !motion;
  const apparatusOnly = sourceOnly || unmodeled;
  const frameLabel =
    label ??
    (sourceOnly
      ? `${exercise.nameKo} · 영상으로 동작 확인 · 기구 안내 이미지`
      : unmodeled
        ? `${exercise.nameKo} · 전용 도해 없음 · ${APPARATUS_LABELS[exercise.apparatus].ko} 기구 안내 이미지`
        : `${representative ? motion?.visualAsset.archetypeTitleKo : exercise.nameKo} · ${cachedFrame?.labelKo ?? (phase === 'end' ? motion?.endPoseLabelKo : undefined) ?? PHASE_LABELS[phase]} · ${representative ? '대표 패턴 참고' : '계획용 동작 도해'}`);

  return (
    <span
      className={`exercise-motion-artwork ${className}`.trim()}
      style={style}
      aria-hidden={decorative ? 'true' : undefined}
      role={apparatusOnly && !decorative ? 'img' : undefined}
      aria-label={apparatusOnly && !decorative ? frameLabel : undefined}
      title={representative || unmodeled ? frameLabel : undefined}
      data-testid={testId}
      data-exercise-id={exercise.id}
      data-motion-phase={apparatusOnly ? undefined : phase}
      data-match-scope={sourceOnly ? 'source-video-only' : unmodeled ? 'unmodeled-exercise' : representative ? 'representative-pattern' : 'catalog-authored-pattern'}
      data-motion-source={sourceOnly ? 'creator-video-reference' : unmodeled ? 'apparatus-reference' : 'authored-kinematic-reference'}
      data-native-motion-available={!apparatusOnly}
      data-artwork-renderer={apparatusOnly ? 'apparatus-reference' : useCachedFrame ? 'cached-native-svg' : 'inline-native-svg'}
      data-professional-review="unreviewed"
      data-anatomical-accuracy-assumed="false"
    >
      {apparatusOnly ? (
        <ApparatusIllustrationSvg apparatus={exercise.apparatus} />
      ) : useCachedFrame && cachedFrame ? (
        <img
          className="movement-phase-diagram-svg"
          src={cachedFrame.src}
          alt={decorative ? '' : frameLabel}
          width={cachedFrame.width}
          height={cachedFrame.height}
          loading="lazy"
          decoding="async"
          data-exercise-id={exercise.id}
          data-phase={phase}
          onError={() => setFailedFrameSrc(cachedFrame.src)}
        />
      ) : motion ? (
        <MovementPhaseDiagramSvg
          asset={motion.visualAsset}
          phase={phase}
          compact
          showAlignment={false}
          showDirection={false}
          showMuscles={false}
          showGhostStartPose={false}
          label={frameLabel}
        />
      ) : null}
      {(representative || apparatusOnly) && (
        <span className="exercise-motion-artwork__label" data-artwork-label={sourceOnly ? 'source-video' : unmodeled ? 'apparatus-reference' : 'representative-pattern'}>
          <strong>{sourceOnly ? '영상 참고' : unmodeled ? '기구 안내' : '대표 패턴'}</strong>
          <span>{sourceOnly ? `${APPARATUS_LABELS[exercise.apparatus].ko} · 기구 안내` : unmodeled ? '수정한 동작 · 전용 도해 없음' : motion?.visualAsset.archetypeTitleKo}</span>
        </span>
      )}
    </span>
  );
});
