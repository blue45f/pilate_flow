import {
  createSequenceSnapshot,
  getActiveSequencePlanningCriteria,
  usePilatesStore,
  type PilatesStudioState,
} from '../store/usePilatesStore';
import type { PilatesExercise, SequenceStep } from '../types/pilates';
import { isExerciseAuthoringEligible } from './exerciseAuthoring';
import { exerciseMatchesCriteria, getMovementKey, getSequenceDurations } from './sequenceEngine';

export interface SequenceGapFillPlan {
  candidates: PilatesExercise[];
  addedSec: number;
  remainingSec: number;
}

export function planSequenceGapFill(state: PilatesStudioState): SequenceGapFillPlan {
  const budget =
    Math.round(state.activeTargetMinutes * 60) - getSequenceDurations(state.activeSteps).totalSec;
  const empty = { candidates: [], addedSec: 0, remainingSec: Math.max(0, budget) };
  const slots = 1000 - state.activeSteps.length;
  if (!state.activeSteps.length || budget <= 0 || slots <= 0) return empty;

  const criteria = getActiveSequencePlanningCriteria(state);
  criteria.availableEquipment = criteria.availableEquipment?.filter((id) =>
    state.ownedEquipment.includes(id),
  );
  const usedIds = new Set(state.activeSteps.map((step) => step.exerciseId));
  const usedMovements = new Set(
    state.exercises.filter((ex) => usedIds.has(ex.id)).map(getMovementKey),
  );
  // For each duration, two different movement families suffice for every valid single or pair.
  const familiesByDuration = new Map<number, Set<string>>();
  const candidates = state.exercises.flatMap((exercise) => {
    const seconds = Math.round(exercise.defaultDurationMin * 60);
    const families = familiesByDuration.get(seconds);
    if (seconds < 1 || seconds > budget || families?.size === 2) return [];
    if (!isExerciseAuthoringEligible(exercise) || !exerciseMatchesCriteria(exercise, criteria))
      return [];
    const key = getMovementKey(exercise);
    if (usedMovements.has(key) || families?.has(key)) return [];
    if (families) families.add(key);
    else familiesByDuration.set(seconds, new Set([key]));
    return [{ exercise, seconds, key }];
  });

  let best: SequenceGapFillPlan = empty;
  // A single movement wins ties. Within equally good plans, keep the catalog order.
  for (const candidate of candidates) {
    if (candidate.seconds > best.addedSec) {
      best = {
        candidates: [candidate.exercise],
        addedSec: candidate.seconds,
        remainingSec: budget - candidate.seconds,
      };
    }
  }
  if (best.remainingSec === 0 || slots === 1) return best;
  for (const [index, first] of candidates.entries()) {
    for (let secondIndex = index + 1; secondIndex < candidates.length; secondIndex++) {
      const second = candidates[secondIndex]!;
      const seconds = first.seconds + second.seconds;
      if (first.key === second.key || seconds > budget || seconds <= best.addedSec) continue;
      best = {
        candidates: [first.exercise, second.exercise],
        addedSec: seconds,
        remainingSec: budget - seconds,
      };
      if (best.remainingSec === 0) return best;
    }
  }
  return best;
}

export function applySequenceGapFill(
  expected: PilatesStudioState,
  plan: SequenceGapFillPlan,
): string {
  if (usePilatesStore.getState() !== expected || !plan.candidates.length) {
    return '수업 구성이 바뀌었습니다. 현재 남은 시간의 추천을 다시 확인해 주세요.';
  }
  const layer = getActiveSequencePlanningCriteria(expected).defaultLayer;
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const steps: SequenceStep[] = plan.candidates.map((exercise, index) => ({
    stepId: `gap-fill-${stamp}-${index}`,
    order: expected.activeSteps.length + index + 1,
    exerciseId: exercise.id,
    blockCategory: exercise.blockCategory,
    durationMin: exercise.defaultDurationMin,
    selectedLayer: layer,
  }));
  const message = `추천 동작 ${steps.length}개를 수업표 끝에 추가했어요. 되돌리기로 복구할 수 있습니다.`;
  usePilatesStore.setState({
    activeSteps: [...expected.activeSteps, ...steps],
    undoStack: [...expected.undoStack.slice(-19), createSequenceSnapshot(expected)],
    redoStack: [],
    generationError: null,
    saveFeedback: message,
  });
  return message;
}
