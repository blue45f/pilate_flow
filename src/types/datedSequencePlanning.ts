import type { SavedSequence } from './pilates';

export type DeepReadonlyPlan<T> = T extends readonly (infer U)[]
  ? readonly DeepReadonlyPlan<U>[]
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonlyPlan<T[K]> }
    : T;

/** Organization only. Neither state is a review, credential, or teaching permission. */
export type DatedSequencePlanState = 'draft' | 'prepared';

export interface DatedPlanOccurrenceSnapshot {
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly locationId: string;
}

/** A complete historical assignment, without recursively nesting earlier history. */
export interface DatedSequencePlanVersion {
  readonly id: string;
  readonly classId: string;
  /** Original recurrence date remains the identity after moving the visible occurrence. */
  readonly originalDate: string;
  readonly state: DatedSequencePlanState;
  readonly sourceSequenceId: string;
  readonly sourceSequenceUpdatedAt: string;
  readonly sequenceSnapshot: DeepReadonlyPlan<SavedSequence>;
  readonly occurrenceSnapshot: DatedPlanOccurrenceSnapshot;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DatedSequencePlanAssignment extends DatedSequencePlanVersion {
  /** Old v3 assignments omit this field. Existing versions are never pruned. */
  readonly priorVersions?: readonly DatedSequencePlanVersion[];
}

export interface DatedSequencePlanningData {
  readonly assignments: readonly DatedSequencePlanAssignment[];
}

export function createEmptyDatedSequencePlanning(): DatedSequencePlanningData {
  return Object.freeze({ assignments: Object.freeze([]) });
}

/** Copy only JSON-compatible data; refuse unsupported passthrough values rather than drop them. */
export function cloneAndFreezePlan<T>(input: T): DeepReadonlyPlan<T> {
  const clone = (value: unknown, ancestors: Set<object>): unknown => {
    if (
      value === null ||
      value === undefined ||
      typeof value === 'string' ||
      typeof value === 'boolean'
    )
      return value;
    if (typeof value === 'number') {
      if (!Number.isFinite(value))
        throw new Error('계획 스냅샷에는 유한한 숫자만 저장할 수 있습니다.');
      return value;
    }
    if (typeof value !== 'object')
      throw new Error('계획 스냅샷은 JSON 자료로 저장할 수 있어야 합니다.');
    if (ancestors.has(value)) throw new Error('계획 스냅샷에 순환 참조를 저장할 수 없습니다.');
    if (
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null
    )
      throw new Error('계획 스냅샷에 지원되지 않는 객체가 있습니다.');
    ancestors.add(value);
    const copied = Array.isArray(value)
      ? value.map((item) => clone(item, ancestors))
      : Object.fromEntries(
          Object.entries(value).map(([key, item]) => [key, clone(item, ancestors)]),
        );
    ancestors.delete(value);
    return Object.freeze(copied);
  };
  return clone(input, new Set()) as DeepReadonlyPlan<T>;
}
