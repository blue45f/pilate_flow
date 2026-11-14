import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { PilatesExercise } from '../types/pilates';
import { resolveClassArtworkExercise } from '../utils/classArtworkExercise';
import { ExerciseMotionArtwork } from './ExerciseMotionArtwork';
import { StudioMotionImage } from './StudioMotionImage';

interface ClassMotionArtworkProps {
  firstExerciseId?: string;
  exercises: readonly PilatesExercise[];
  fallbackSrc: string;
  className?: string;
  deferUntilVisible?: boolean;
  'data-testid'?: string;
}

/** Class-level banners share exercise artwork whenever their linked sequence identifies a model. */
export const ClassMotionArtwork = memo(function ClassMotionArtwork({
  firstExerciseId,
  exercises,
  fallbackSrc,
  className,
  deferUntilVisible = false,
  'data-testid': testId,
}: ClassMotionArtworkProps) {
  const placeholder = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(
    () => !deferUntilVisible || typeof IntersectionObserver === 'undefined',
  );
  useEffect(() => {
    if (!deferUntilVisible || visible || !placeholder.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(placeholder.current);
    return () => observer.disconnect();
  }, [deferUntilVisible, visible]);
  const exercise = useMemo(
    () => resolveClassArtworkExercise(firstExerciseId, exercises),
    [firstExerciseId, exercises],
  );
  if (deferUntilVisible && !visible)
    return (
      <span
        ref={placeholder}
        className={className}
        aria-hidden="true"
        data-testid={testId}
        data-artwork-deferred="true"
        style={{ display: 'block', aspectRatio: '8 / 5', background: '#eef1e9' }}
      />
    );
  return exercise ? (
    <ExerciseMotionArtwork exercise={exercise} className={className} data-testid={testId} />
  ) : (
    <StudioMotionImage
      src={fallbackSrc}
      alt=""
      aria-hidden="true"
      loading="lazy"
      className={className}
      data-testid={testId}
    />
  );
});
