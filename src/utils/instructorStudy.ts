import { instructorStudyStateSchema } from '../schemas/instructorStudySchema';
import type { InstructorStudyState } from '../types/instructorStudy';

export function cloneInstructorStudyState(value: InstructorStudyState): InstructorStudyState {
  return instructorStudyStateSchema.parse(value);
}

/** Whole explicit local state wins, including deliberate empty lists. Missing old fields preserve it. */
export function mergeInstructorStudyState(
  current: InstructorStudyState | undefined,
  incoming: InstructorStudyState | undefined,
): {
  state: InstructorStudyState | undefined;
  added: number;
  conflicts: number;
} {
  if (current !== undefined)
    return {
      state: cloneInstructorStudyState(current),
      added: 0,
      conflicts:
        incoming !== undefined && JSON.stringify(current) !== JSON.stringify(incoming) ? 1 : 0,
    };
  return {
    state: incoming === undefined ? undefined : cloneInstructorStudyState(incoming),
    added: incoming === undefined ? 0 : 1,
    conflicts: 0,
  };
}
