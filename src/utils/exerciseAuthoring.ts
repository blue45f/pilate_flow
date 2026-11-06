import type { PilatesExercise } from '../types/pilates';
import { exerciseSchema } from '../schemas/cloudBackupSchema';

/** Valid planning data can be composed without changing its independent review record. */
export function isExerciseAuthoringEligible(exercise: PilatesExercise): boolean {
  return exerciseSchema.safeParse(exercise).success;
}
