import { useMemo } from 'react';
import { getCatalogContinuousMotionAsset } from '../data/catalogMotionAssets';
import { getExpandedMovementVisualBinding } from '../data/expandedMovementVisualBindings';
import { getMovementVisualAsset } from '../data/movementVisualRigCatalog';
import { MovementPhaseDiagramSvg } from './MovementPhaseDiagramSvg';
import {
  ApparatusExerciseArtwork,
  ExerciseMotionArtworkSurface,
  type ExerciseMotionArtworkProps,
} from './ExerciseMotionArtworkSurface';

/** Loaded for a custom exercise, uncached pose, or failed cache image only. */
export default function NativeExerciseMotionArtwork({
  phase = 'middle',
  ...props
}: ExerciseMotionArtworkProps) {
  const { exercise, label } = props;
  const sourceOnly = getExpandedMovementVisualBinding(exercise)?.nativeMotionAvailable === false;
  const motion = useMemo(
    () => (sourceOnly ? null : getCatalogContinuousMotionAsset(exercise)),
    [exercise, sourceOnly],
  );
  if (sourceOnly || !motion)
    return (
      <ApparatusExerciseArtwork
        {...props}
        phase={phase}
        status={sourceOnly ? 'source-only' : 'unmodeled'}
      />
    );
  const representative = !getMovementVisualAsset(exercise.id);
  const phaseLabel =
    phase === 'end' ? motion.endPoseLabelKo : phase === 'start' ? '시작 자세' : '정점 자세';
  const frameLabel =
    label ??
    (representative ? motion.visualAsset.archetypeTitleKo : exercise.nameKo) +
      ' · ' +
      phaseLabel +
      ' · ' +
      (representative ? '대표 패턴 참고' : '계획용 동작 도해');
  return (
    <ExerciseMotionArtworkSurface
      {...props}
      phase={phase}
      frameLabel={frameLabel}
      scope={representative ? 'representative-pattern' : 'catalog-authored-pattern'}
      renderer="inline-native-svg"
      badge={
        representative
          ? {
              kind: 'representative-pattern',
              title: '대표 패턴',
              description: motion.visualAsset.archetypeTitleKo,
            }
          : undefined
      }
    >
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
    </ExerciseMotionArtworkSurface>
  );
}
