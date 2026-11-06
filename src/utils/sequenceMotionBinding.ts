import ledger from '../data/motionStudyLedger.json';
import type { SequenceStep } from '../types/pilates';
import type {
  ClassSectionRole,
  SequenceMotionStudyBinding,
  SequenceMotionStudyBindingStatus,
} from '../types/sequenceMotion';

export const SEQUENCE_MOTION_STUDY_BINDING_VERSION = 1;

/** Deliberately imports the lightweight source ledger, never a model or motion renderer. */
export function createSequenceMotionStudyBinding(
  exerciseId: string,
  family: string,
  variantId: string,
): SequenceMotionStudyBinding | undefined {
  const entry = ledger.entries.find(
    (item) => item.family === family && item.variantId === variantId,
  );
  if (!exerciseId || !entry?.intendedExerciseIds.includes(exerciseId)) return undefined;
  return {
    version: SEQUENCE_MOTION_STUDY_BINDING_VERSION,
    family: entry.family,
    variantId: entry.variantId,
    sourceFingerprint: entry.sourceFingerprint,
  };
}

/** Reading an imported selection never changes it or substitutes another asset. */
export function assessSequenceMotionStudyBinding(
  exerciseId: string,
  binding: SequenceMotionStudyBinding | undefined,
): SequenceMotionStudyBindingStatus {
  if (!binding) return 'unbound';
  if (binding.version !== SEQUENCE_MOTION_STUDY_BINDING_VERSION) return 'unsupported';
  const entry = ledger.entries.find(
    (item) => item.family === binding.family && item.variantId === binding.variantId,
  );
  if (!entry) return 'unsupported';
  if (!exerciseId || !entry.intendedExerciseIds.includes(exerciseId)) return 'unrelated';
  return binding.sourceFingerprint === entry.sourceFingerprint ? 'matched' : 'stale';
}

function exerciseClassSection(step: SequenceStep): ClassSectionRole {
  if (step.classSection) return step.classSection;
  if (step.blockCategory === 'warmup') return 'preparation';
  if (step.blockCategory === 'cooldown') return 'cooldown';
  return 'main';
}

/** Unassigned rest follows the preceding exercise, then the next exercise at class start. */
export function getSequenceStepClassSection(
  step: SequenceStep,
  steps: readonly SequenceStep[] = [],
): ClassSectionRole {
  if (step.classSection) return step.classSection;
  if (step.kind !== 'rest') return exerciseClassSection(step);
  let index = steps.indexOf(step);
  if (index < 0) index = steps.findIndex((item) => item.stepId === step.stepId);
  if (index >= 0) {
    for (let previous = index - 1; previous >= 0; previous--)
      if (steps[previous].kind !== 'rest') return exerciseClassSection(steps[previous]);
    for (let next = index + 1; next < steps.length; next++)
      if (steps[next].kind !== 'rest') return exerciseClassSection(steps[next]);
  }
  return 'main';
}
