import type { DraftPhase } from '../models/types';

export type RehearsalPhaseValidation =
  { readonly valid: true } | { readonly valid: false; readonly error: string };

export interface RehearsalValidTimeline {
  readonly valid: true;
  readonly startProgress: number;
  readonly endProgress: number;
  readonly rangeFraction: number;
  readonly rangeSeconds: number;
  readonly totalSeconds: number;
  readonly repetitions: 1 | 2 | 3;
  readonly cycleSeconds: number;
}

export type RehearsalTimeline =
  RehearsalValidTimeline | { readonly valid: false; readonly error: string };

export interface RehearsalPosition {
  readonly progress: number;
  /** One-based repetition number; this never exceeds the finite authored limit. */
  readonly repetition: number;
  readonly atEnd: boolean;
  readonly rangeElapsedSeconds: number;
}

const PHASE_IDS = ['setup', 'move', 'turn', 'return', 'finish'] as const;

const isNonemptyLabel = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

/** Validate only the supplied definition. No motion registry or exercise store is read. */
export function validateRehearsalPhases(phases: readonly DraftPhase[]): RehearsalPhaseValidation {
  if (!Array.isArray(phases) || phases.length !== PHASE_IDS.length) {
    return { valid: false, error: '준비·이동·전환·복귀·마무리의 다섯 단계가 필요합니다.' };
  }
  let previousEnd = 0;
  for (let index = 0; index < PHASE_IDS.length; index += 1) {
    const phase = phases[index];
    if (!phase || phase.id !== PHASE_IDS[index]) {
      return { valid: false, error: '준비·이동·전환·복귀·마무리 단계 순서를 확인해 주세요.' };
    }
    if (
      !isNonemptyLabel(phase.label) ||
      (phase.labelKo !== undefined && !isNonemptyLabel(phase.labelKo))
    ) {
      return { valid: false, error: `${index + 1}번째 단계의 이름이 비어 있습니다.` };
    }
    if (
      !Number.isFinite(phase.start) ||
      !Number.isFinite(phase.end) ||
      phase.start < 0 ||
      phase.end > 1 ||
      phase.end <= phase.start
    ) {
      return {
        valid: false,
        error: `${index + 1}번째 단계 범위는 0~1 안의 양수 구간이어야 합니다.`,
      };
    }
    if (phase.start !== previousEnd) {
      return {
        valid: false,
        error: '단계 범위는 0에서 시작하여 빈틈이나 겹침 없이 이어져야 합니다.',
      };
    }
    if (!Number.isFinite(phase.sample) || phase.sample < phase.start || phase.sample > phase.end) {
      return {
        valid: false,
        error: `${index + 1}번째 단계의 정지 그림 위치가 해당 범위를 벗어났습니다.`,
      };
    }
    previousEnd = phase.end;
  }
  if (previousEnd !== 1) {
    return { valid: false, error: '마지막 단계는 전체 주기의 끝인 1에서 끝나야 합니다.' };
  }
  return { valid: true };
}

const isRepetitionCount = (value: number): value is 1 | 2 | 3 =>
  value === 1 || value === 2 || value === 3;

/**
 * cycleSeconds is the full original cycle's display time. Selecting fewer phases
 * keeps that original rate; the selected fraction is multiplied once per repeat.
 */
export function buildRehearsalTimeline(
  phases: readonly DraftPhase[],
  startPhaseIndex: number,
  endPhaseIndex: number,
  cycleSeconds: number,
  repetitions: number,
): RehearsalTimeline {
  const phaseValidation = validateRehearsalPhases(phases);
  if (!phaseValidation.valid) return phaseValidation;
  if (
    !Number.isInteger(startPhaseIndex) ||
    !Number.isInteger(endPhaseIndex) ||
    startPhaseIndex < 0 ||
    endPhaseIndex > 4 ||
    startPhaseIndex > endPhaseIndex
  ) {
    return {
      valid: false,
      error: '시작과 끝 단계를 확인해 주세요. 끝 단계는 시작과 같거나 이후여야 합니다.',
    };
  }
  if (!Number.isInteger(cycleSeconds) || cycleSeconds < 2 || cycleSeconds > 30) {
    return { valid: false, error: '전체 주기의 표시 시간은 2~30초의 정수로 입력해 주세요.' };
  }
  if (!isRepetitionCount(repetitions)) {
    return { valid: false, error: '표시 반복 수는 1·2·3 중에서 선택해 주세요.' };
  }
  const startProgress = phases[startPhaseIndex].start;
  const endProgress = phases[endPhaseIndex].end;
  const rangeFraction = endProgress - startProgress;
  const rangeSeconds = cycleSeconds * rangeFraction;
  return {
    valid: true,
    startProgress,
    endProgress,
    rangeFraction,
    rangeSeconds,
    totalSeconds: rangeSeconds * repetitions,
    repetitions,
    cycleSeconds,
  };
}

/**
 * Resolve a finite display position, using a cut back to the selected start at
 * each intermediate boundary. The final boundary holds the selected end pose.
 */
export function resolveRehearsalPosition(
  timeline: RehearsalValidTimeline,
  elapsedSeconds: number,
): RehearsalPosition {
  const elapsed = Number.isFinite(elapsedSeconds)
    ? Math.min(timeline.totalSeconds, Math.max(0, elapsedSeconds))
    : 0;
  if (elapsed === timeline.totalSeconds) {
    return {
      progress: timeline.endProgress,
      repetition: timeline.repetitions,
      atEnd: true,
      rangeElapsedSeconds: timeline.rangeSeconds,
    };
  }
  // The authored repetition count is at most three. Compare explicit boundaries
  // to avoid a floating-point division rounding an exact cut to the prior repeat.
  let completedRepetitions = 0;
  while (
    completedRepetitions + 1 < timeline.repetitions &&
    elapsed >= (completedRepetitions + 1) * timeline.rangeSeconds
  ) {
    completedRepetitions += 1;
  }
  const rangeElapsedSeconds = elapsed - completedRepetitions * timeline.rangeSeconds;
  const progress =
    timeline.startProgress + timeline.rangeFraction * (rangeElapsedSeconds / timeline.rangeSeconds);
  return {
    progress: Math.min(timeline.endProgress, Math.max(timeline.startProgress, progress)),
    repetition: completedRepetitions + 1,
    atEnd: false,
    rangeElapsedSeconds,
  };
}
