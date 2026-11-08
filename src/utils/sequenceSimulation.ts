import { exerciseSchema, stepSchema } from '../schemas/cloudBackupSchema';
import type { PilatesExercise, SequenceStep } from '../types/pilates';
import { getExerciseReviewState } from './exerciseReview';
import { getMovementKey, getStepSideLabels, getStepTiming, isRestStep } from './sequenceEngine';

export type SimulationSegmentKind = 'teaching' | 'movement' | 'transition' | 'rest' | 'unavailable';
export type SimulationGateCode =
  | 'invalid-input'
  | 'empty-sequence'
  | 'no-exercises'
  | 'invalid-step'
  | 'missing-exercise'
  | 'invalid-exercise'
  | 'ambiguous-exercise'
  | 'unreviewed-exercise'
  | 'duplicate-movement'
  | 'invalid-target'
  | 'target-mismatch';

export interface SimulationSegment {
  readonly id: string;
  readonly kind: SimulationSegmentKind;
  readonly label: string;
  readonly stepIndex: number;
  readonly stepId: string;
  readonly exerciseId?: string;
  readonly startSec: number;
  readonly endSec: number;
  readonly durationSec: number;
  readonly sideIndex?: 0 | 1;
  readonly sideLabel?: string;
}

export interface SimulationStep {
  readonly stepIndex: number;
  readonly stepId: string;
  readonly exerciseId?: string;
  readonly title: string;
  readonly isRest: boolean;
  readonly reviewState: 'approved' | 'pending' | 'stale' | 'missing' | 'invalid' | 'not-applicable';
  readonly repetitions?: number;
  readonly sets?: number;
  readonly sideLabels: readonly string[];
  readonly startSec: number;
  readonly endSec: number;
  readonly durationSec: number;
  readonly segmentStartIndex: number;
  readonly segmentCount: number;
}

export interface SimulationTotals {
  readonly totalSec: number;
  /** All non-rest planned segments, including unavailable budget; not movement alone. */
  readonly exerciseSec: number;
  readonly movementSec: number;
  readonly teachingSec: number;
  readonly transitionSec: number;
  readonly restSec: number;
  readonly unavailableSec: number;
}

export interface SimulationGateReason {
  readonly code: SimulationGateCode;
  readonly message: string;
  readonly stepIndices: readonly number[];
}

export interface SequenceSimulation {
  readonly segments: readonly SimulationSegment[];
  readonly steps: readonly SimulationStep[];
  readonly totals: SimulationTotals;
  /** Compare the snapshot target without blocking a valid rehearsal. Omission derives the plan total. */
  readonly targetSec: number | null;
  readonly targetSource: 'provided' | 'plan-total';
  readonly deltaSec: number | null;
  readonly gate: {
    readonly canRehearse: boolean;
    readonly reasons: readonly SimulationGateReason[];
  };
}

export interface SimulationPosition {
  readonly status: 'empty' | 'active' | 'complete';
  readonly timeSec: number;
  readonly remainingSec: number;
  readonly segmentIndex: number | null;
  readonly segment: SimulationSegment | null;
  readonly stepIndex: number | null;
  readonly elapsedInSegmentSec: number;
  readonly remainingInSegmentSec: number;
}

/** Only a bounded, interpretable budget survives an invalid step; no invalid motion is synthesized. */
function invalidStepBudget(step: unknown): number {
  if (!step || typeof step !== 'object') return 0;
  const minutes = (step as { durationMin?: unknown }).durationMin;
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0 || minutes > 120)
    return 0;
  return Math.max(0, Math.round(minutes * 60));
}

/**
 * Pure, independently frozen plan summary. Contains no cue text, clinical instruction, motion
 * assets, timers, store calls or history writes. Pending plans may be inspected; the UI must use
 * gate.canRehearse before running a rehearsal clock. A local planning review is not expert approval.
 * Phase order matches LiveStage: explanation -> movement side(s) -> transition, or one rest block.
 * getStepTiming supplies whole-second step budgets; paired sides can each contain a half second.
 */
export function buildSequenceSimulation(
  steps: readonly SequenceStep[],
  exercises: readonly PilatesExercise[],
  targetMinutes?: number,
): SequenceSimulation {
  const segments: SimulationSegment[] = [];
  const summaries: SimulationStep[] = [];
  const reasons = new Map<SimulationGateCode, { message: string; indices: Set<number> }>();
  const reason = (code: SimulationGateCode, message: string, indices: number[] = []) => {
    const entry = reasons.get(code) ?? { message, indices: new Set<number>() };
    indices.forEach((index) => entry.indices.add(index));
    reasons.set(code, entry);
  };
  const inputSteps = Array.isArray(steps) ? steps : [];
  const inputExercises = Array.isArray(exercises) ? exercises : [];
  if (!Array.isArray(steps) || !Array.isArray(exercises))
    reason('invalid-input', '계획 또는 동작 목록의 형식을 확인해 주세요.');
  if (!inputSteps.length) reason('empty-sequence', '검토할 수업 항목이 없습니다.');
  const records = new Map<string, PilatesExercise[]>();
  for (const exercise of inputExercises) {
    if (!exercise || typeof exercise !== 'object' || typeof exercise.id !== 'string') continue;
    records.set(exercise.id, [...(records.get(exercise.id) ?? []), exercise]);
  }
  const movementKeys = new Map<string, number[]>();
  const stepIds = new Map<string, number[]>();
  let offset = 0;
  let nonRestCount = 0;
  for (const [stepIndex, input] of inputSteps.entries()) {
    const parsed = stepSchema.safeParse(input);
    const rawId =
      input && typeof input === 'object' && typeof input.stepId === 'string'
        ? input.stepId
        : `invalid-step-${stepIndex}`;
    const step =
      parsed.success && getStepTiming(parsed.data as SequenceStep).totalSec > 0
        ? (parsed.data as SequenceStep)
        : undefined;
    const startSec = offset;
    const segmentStartIndex = segments.length;
    const isRest = !!step && isRestStep(step);
    const exerciseId = step && !isRest ? step.exerciseId : undefined;
    let title = isRest ? '휴식' : '동작 정보 없음';
    let reviewState: SimulationStep['reviewState'] = isRest ? 'not-applicable' : 'missing';
    let sideLabels: string[] = [];
    const append = (
      kind: SimulationSegmentKind,
      durationSec: number,
      label: string,
      sideIndex?: 0 | 1,
      sideLabel?: string,
    ) => {
      if (!Number.isFinite(durationSec) || durationSec <= 0) return;
      const segment: SimulationSegment = {
        id: `${stepIndex}:${segments.length - segmentStartIndex}:${kind}`,
        kind,
        label,
        stepIndex,
        stepId: rawId,
        ...(exerciseId ? { exerciseId } : {}),
        startSec: offset,
        endSec: offset + durationSec,
        durationSec,
        ...(sideIndex === undefined ? {} : { sideIndex }),
        ...(sideLabel ? { sideLabel } : {}),
      };
      segments.push(Object.freeze(segment));
      offset = segment.endSec;
    };
    if (!step) {
      reason('invalid-step', '형식 또는 시간이 올바르지 않은 계획 항목을 확인해 주세요.', [
        stepIndex,
      ]);
      title = '유효하지 않은 계획 항목';
      reviewState = 'invalid';
      append('unavailable', invalidStepBudget(input), '계획 정보 확인 필요');
    } else {
      stepIds.set(step.stepId, [...(stepIds.get(step.stepId) ?? []), stepIndex]);
      if (isRest) append('rest', getStepTiming(step).totalSec, '휴식');
      else {
        nonRestCount += 1;
        const matches = records.get(step.exerciseId) ?? [];
        const record = matches.length === 1 ? matches[0] : undefined;
        const validRecord = record ? exerciseSchema.safeParse(record) : undefined;
        if (!matches.length)
          reason('missing-exercise', '삭제되었거나 찾을 수 없는 동작이 있습니다.', [stepIndex]);
        else if (matches.length !== 1)
          reason(
            'ambiguous-exercise',
            '같은 ID의 동작 자료가 여러 개여서 해당 동작을 확인할 수 없습니다.',
            [stepIndex],
          );
        else if (!validRecord?.success) {
          reason('invalid-exercise', '형식이 올바르지 않은 동작 자료를 확인해 주세요.', [
            stepIndex,
          ]);
          reviewState = 'invalid';
        }
        if (!record || !validRecord?.success)
          append('unavailable', getStepTiming(step).totalSec, '동작 정보 확인 필요');
        else {
          title = record.nameKo || record.nameEn || '이름 없는 동작';
          reviewState = getExerciseReviewState(record);
          const key = getMovementKey(record);
          movementKeys.set(key, [...(movementKeys.get(key) ?? []), stepIndex]);
          const timing = getStepTiming(step, record);
          sideLabels = getStepSideLabels(step, record);
          append('teaching', timing.explanationSec, '설명 · 세팅');
          for (let side = 0; side < timing.sides; side++) {
            const sideLabel = sideLabels[side];
            append(
              'movement',
              timing.perSideSec,
              timing.sides === 2 || step.sideMode ? `수행 · ${sideLabel}` : '수행',
              side as 0 | 1,
              sideLabel,
            );
          }
          append('transition', timing.transitionSec, '다음 동작 전환');
        }
      }
    }
    summaries.push(
      Object.freeze({
        stepIndex,
        stepId: rawId,
        ...(exerciseId ? { exerciseId } : {}),
        title,
        isRest,
        reviewState,
        ...(step?.repetitions === undefined ? {} : { repetitions: step.repetitions }),
        ...(step?.sets === undefined ? {} : { sets: step.sets }),
        sideLabels: Object.freeze(sideLabels),
        startSec,
        endSec: offset,
        durationSec: offset - startSec,
        segmentStartIndex,
        segmentCount: segments.length - segmentStartIndex,
      }),
    );
  }
  if (inputSteps.length && nonRestCount === 0)
    reason('no-exercises', '진행할 동작이 없습니다. 휴식 외의 동작을 추가해 주세요.');
  for (const indices of stepIds.values())
    if (indices.length > 1) reason('invalid-step', '중복된 항목 ID를 확인해 주세요.', indices);
  for (const indices of movementKeys.values())
    if (indices.length > 1)
      reason(
        'duplicate-movement',
        '같은 동작을 여러 구간에서 반복합니다. 의도한 순서인지 확인해 주세요.',
        indices,
      );
  const totals = {
    totalSec: offset,
    exerciseSec: 0,
    movementSec: 0,
    teachingSec: 0,
    transitionSec: 0,
    restSec: 0,
    unavailableSec: 0,
  };
  for (const segment of segments) {
    if (segment.kind === 'rest') totals.restSec += segment.durationSec;
    else {
      totals.exerciseSec += segment.durationSec;
      if (segment.kind === 'teaching') totals.teachingSec += segment.durationSec;
      if (segment.kind === 'movement') totals.movementSec += segment.durationSec;
      if (segment.kind === 'transition') totals.transitionSec += segment.durationSec;
      if (segment.kind === 'unavailable') totals.unavailableSec += segment.durationSec;
    }
  }
  const targetSource = targetMinutes === undefined ? 'plan-total' : 'provided';
  const rawRequestedSec =
    targetMinutes === undefined
      ? totals.totalSec
      : typeof targetMinutes === 'number'
        ? targetMinutes * 60
        : NaN;
  const requestedSec =
    Number.isFinite(rawRequestedSec) &&
    Math.abs(rawRequestedSec - Math.round(rawRequestedSec)) < 1e-6
      ? Math.round(rawRequestedSec)
      : rawRequestedSec;
  const targetSec =
    Number.isFinite(requestedSec) &&
    (targetMinutes === undefined || (typeof targetMinutes === 'number' && requestedSec > 0))
      ? requestedSec
      : null;
  if (targetSec === null) reason('invalid-target', '리허설 목표 시간을 확인해 주세요.');
  else if (totals.totalSec !== targetSec)
    reason(
      'target-mismatch',
      `목표보다 ${Math.abs(totals.totalSec - targetSec)
        .toFixed(1)
        .replace(
          /\.0$/,
          '',
        )}초 ${totals.totalSec > targetSec ? '길어요' : '짧아요'}. 현재 계획 시간으로 미리볼 수 있습니다.`,
    );
  return Object.freeze({
    segments: Object.freeze(segments),
    steps: Object.freeze(summaries),
    totals: Object.freeze(totals),
    targetSec,
    targetSource,
    deltaSec: targetSec === null ? null : totals.totalSec - targetSec,
    gate: Object.freeze({
      canRehearse: [...reasons.keys()].every(
        (code) => code === 'target-mismatch' || code === 'duplicate-movement',
      ),
      reasons: Object.freeze(
        [...reasons.entries()].map(([code, entry]) =>
          Object.freeze({
            code,
            message: entry.message,
            stepIndices: Object.freeze([...entry.indices].sort((a, b) => a - b)),
          }),
        ),
      ),
    }),
  });
}

/** Seek is inspection only. Finite values clamp; nonfinite values reset to zero. Boundaries are [start,end). */
export function seekSequenceSimulation(
  model: SequenceSimulation,
  elapsedSec: number,
): SimulationPosition {
  const total = model.totals.totalSec;
  const timeSec = Number.isFinite(elapsedSec) ? Math.max(0, Math.min(total, elapsedSec)) : 0;
  const inactive = (status: 'empty' | 'complete'): SimulationPosition =>
    Object.freeze({
      status,
      timeSec,
      remainingSec: Math.max(0, total - timeSec),
      segmentIndex: null,
      segment: null,
      stepIndex: null,
      elapsedInSegmentSec: 0,
      remainingInSegmentSec: 0,
    });
  if (!model.segments.length || total <= 0) return inactive('empty');
  if (timeSec >= total) return inactive('complete');
  let low = 0,
    high = model.segments.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (timeSec >= model.segments[middle].endSec) low = middle + 1;
    else high = middle;
  }
  const segment = model.segments[low];
  return Object.freeze({
    status: 'active',
    timeSec,
    remainingSec: total - timeSec,
    segmentIndex: low,
    segment,
    stepIndex: segment.stepIndex,
    elapsedInSegmentSec: timeSec - segment.startSec,
    remainingInSegmentSec: segment.endSec - timeSec,
  });
}
