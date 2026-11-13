import { memo, useMemo } from 'react';
import type { PilatesExercise } from '../types/pilates';
import { resolveClassArtworkExercise } from '../utils/classArtworkExercise';
import { ExerciseMotionArtwork } from './ExerciseMotionArtwork';
import { StudioMotionImage } from './StudioMotionImage';

interface ClassMotionArtworkProps {
  firstExerciseId?: string;
  exercises: readonly PilatesExercise[];
  fallbackSrc: string;
  className?: string;
  'data-testid'?: string;
}

/** Class-level banners share exercise artwork whenever their linked sequence identifies a model. */
export const ClassMotionArtwork = memo(function ClassMotionArtwork({
  firstExerciseId,
  exercises,
  fallbackSrc,
  className,
  'data-testid': testId,
}: ClassMotionArtworkProps) {
  const exercise = useMemo(
    () => resolveClassArtworkExercise(firstExerciseId, exercises),
    [firstExerciseId, exercises],
  );
  return exercise ? (
    <ExerciseMotionArtwork exercise={exercise} className={className} data-testid={testId} />
  ) : (
    <StudioMotionImage src={fallbackSrc} alt="" aria-hidden="true" loading="lazy" className={className} data-testid={testId} />
  );
});
