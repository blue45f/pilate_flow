import { instructorStudyStateSchema } from '../schemas/instructorStudySchema';
import type { InstructorStudyState } from '../types/instructorStudy';

function canonicalJson(value: unknown): string {
  const canonical = (entry: unknown): unknown => {
    if (Array.isArray(entry)) return entry.map(canonical);
    if (entry !== null && typeof entry === 'object')
      return Object.fromEntries(
        Object.entries(entry)
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([key, item]) => [key, canonical(item)]),
      );
    return entry;
  };
  return JSON.stringify(canonical(value));
}

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
        incoming !== undefined && canonicalJson(current) !== canonicalJson(incoming) ? 1 : 0,
    };
  return {
    state: incoming === undefined ? undefined : cloneInstructorStudyState(incoming),
    added: incoming === undefined ? 0 : 1,
    conflicts: 0,
  };
}
