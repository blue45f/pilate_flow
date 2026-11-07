import type { NormalizedPresetSuggestionInput } from './presetSuggestionTypes';

/**
 * Safely detaches diagnostic values without traversing, freezing, or invoking coercion hooks
 * on caller-owned objects (including `Object.create(null)` or deeply nested malformed objects).
 */
export function toPresetSuggestionDiagnosticValue(value: unknown): unknown {
  if (
    value === null ||
    value === undefined ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  if (typeof value === 'string') {
    return value.length <= 2000 ? value : `${value.slice(0, 2000)}… (긴 입력 생략)`;
  }
  if (Array.isArray(value)) {
    return '[배열 형식의 입력]';
  }
  if (typeof value === 'object') {
    return '[객체 형식의 입력]';
  }
  return `[${typeof value} 형식의 입력]`;
}

/**
 * Deeply freezes newly constructed candidate/report objects while guarding against cycles.
 * Must only be called on freshly detached internal structures, never on caller-owned inputs.
 */
export function deepFreezeCandidateResult<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (seen.has(value)) {
    return value;
  }
  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      deepFreezeCandidateResult(item, seen);
    }
    return Object.freeze(value);
  }

  for (const key of Object.keys(value as Record<string, unknown>)) {
    const child = (value as Record<string, unknown>)[key];
    if (child !== null && typeof child === 'object') {
      deepFreezeCandidateResult(child, seen);
    }
  }
  return Object.freeze(value);
}

/**
 * Clones a `NormalizedPresetSuggestionInput` so that passing a caller-owned normalized input
 * directly to the analyzer/engine never freezes or mutates the caller's object references.
 */
export function detachNormalizedSuggestionInput(
  input: NormalizedPresetSuggestionInput,
): NormalizedPresetSuggestionInput {
  return {
    ...input,
    availableEquipment: [...input.availableEquipment],
    unknownEquipmentIds: [...input.unknownEquipmentIds],
    preferredProps: [...input.preferredProps],
    unknownExerciseIds: [...input.unknownExerciseIds],
    unverifiableExerciseIds: [...input.unverifiableExerciseIds],
    rawTargetMinutes: toPresetSuggestionDiagnosticValue(input.rawTargetMinutes),
    rawRestMinutes: toPresetSuggestionDiagnosticValue(input.rawRestMinutes),
    rawApparatus: toPresetSuggestionDiagnosticValue(input.rawApparatus),
    rawTheme: toPresetSuggestionDiagnosticValue(input.rawTheme),
    seedSteps: input.seedSteps.map((step) => ({
      ...step,
      rawDurationMin: toPresetSuggestionDiagnosticValue(step.rawDurationMin),
      rawRepetitions: toPresetSuggestionDiagnosticValue(step.rawRepetitions),
      rawSets: toPresetSuggestionDiagnosticValue(step.rawSets),
      rawSideMode: toPresetSuggestionDiagnosticValue(step.rawSideMode),
      issueCodes: [...step.issueCodes],
    })),
    adapterIssues: input.adapterIssues.map((issue) => ({
      ...issue,
      stepIds: [...issue.stepIds],
      stepIndices: [...issue.stepIndices],
      relatedExerciseIds: [...issue.relatedExerciseIds],
    })),
  };
}

/**
 * Formats whole seconds into readable Korean text (`50분`, `4분 30초`, `45초`).
 */
export function formatDurationSecondsKo(seconds: number | null | undefined): string {
  if (
    seconds === null ||
    seconds === undefined ||
    typeof seconds !== 'number' ||
    !Number.isFinite(seconds)
  ) {
    return '시간 미정';
  }
  const sign = seconds < 0 ? '-' : '';
  const absSec = Math.round(Math.abs(seconds));
  if (absSec === 0) {
    return '0초';
  }
  const mins = Math.floor(absSec / 60);
  const remSec = absSec % 60;
  if (mins > 0 && remSec > 0) {
    return `${sign}${mins}분 ${remSec}초`;
  }
  if (mins > 0) {
    return `${sign}${mins}분`;
  }
  return `${sign}${remSec}초`;
}
