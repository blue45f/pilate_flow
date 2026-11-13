import { GLOBAL_CRAWLED_REPERTOIRE_EXERCISES } from '../data/globalCrawledRepertoirePack';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import type { PilatesExercise } from '../types/pilates';

/** Resolve only a linked sequence identity; image filenames never identify a movement. */
export function resolveClassArtworkExercise(
  firstExerciseId: string | undefined,
  exercises: readonly PilatesExercise[] = [],
): PilatesExercise | undefined {
  if (!firstExerciseId) return undefined;
  return exercises.find((exercise) => exercise.id === firstExerciseId)
    ?? INITIAL_EXERCISES.find((exercise) => exercise.id === firstExerciseId)
    ?? GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.find((exercise) => exercise.id === firstExerciseId);
}
