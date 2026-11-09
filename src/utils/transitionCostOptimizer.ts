import type { PilatesExercise, SequenceStep } from '../types/pilates';
import { getSequenceStepClassSection } from './sequenceMotionBinding';
import { isRestStep } from './sequenceEngine';

export interface TransitionCostAnalysis {
  totalCostScore: number;
  apparatusSwitches: number;
  bodyPositionFlips: number;
  springChanges: number;
  optimizedCostScore: number;
  potentialSavingsScore: number;
  summaryKo: string;
}

const sectionBucketOf = (step: SequenceStep): 'warmup' | 'main' | 'cooldown' | 'rest' => {
  if (isRestStep(step)) return 'rest';
  const role = getSequenceStepClassSection(step);
  return role === 'preparation' ? 'warmup' : role;
};

export function computePairTransitionCost(
  prevStep: SequenceStep,
  nextStep: SequenceStep,
  exercisesById: ReadonlyMap<string, PilatesExercise>,
): { cost: number; apparatusSwitch: boolean; positionFlip: boolean; springChange: boolean } {
  if (isRestStep(prevStep) || isRestStep(nextStep)) {
    return { cost: 0, apparatusSwitch: false, positionFlip: false, springChange: false };
  }
  const prevEx = exercisesById.get(prevStep.exerciseId);
  const nextEx = exercisesById.get(nextStep.exerciseId);
  if (!prevEx || !nextEx) {
    return { cost: 0, apparatusSwitch: false, positionFlip: false, springChange: false };
  }

  const apparatusSwitch = prevEx.apparatus !== nextEx.apparatus;
  const positionFlip = prevEx.bodyPosition !== nextEx.bodyPosition;
  const prevSpring = (prevStep.customSpringOverride ?? prevEx.springs ?? '').trim();
  const nextSpring = (nextStep.customSpringOverride ?? nextEx.springs ?? '').trim();
  const springChange = Boolean(prevSpring && nextSpring && prevSpring !== nextSpring);

  const cost =
    (apparatusSwitch ? 30 : 0) + (positionFlip ? 12 : 0) + (springChange ? 8 : 0);

  return { cost, apparatusSwitch, positionFlip, springChange };
}

/**
 * Reorders unlocked exercise steps within each contiguous class section run
 * using a greedy nearest-neighbor heuristic to minimize apparatus/posture/spring transitions,
 * while strictly keeping locked steps and rest steps in their exact indices.
 */
export function suggestTransitionOptimizedOrder(
  steps: readonly SequenceStep[],
  exercisesById: ReadonlyMap<string, PilatesExercise>,
): SequenceStep[] {
  if (steps.length <= 2) return [...steps];

  const result = [...steps];
  let runStart = 0;

  while (runStart < result.length) {
    const bucket = sectionBucketOf(result[runStart]!);
    let runEnd = runStart + 1;
    while (runEnd < result.length && sectionBucketOf(result[runEnd]!) === bucket) {
      runEnd += 1;
    }

    if (bucket !== 'rest' && runEnd - runStart > 1) {
      const unlockedIndices: number[] = [];
      const unlockedPool: SequenceStep[] = [];
      for (let i = runStart; i < runEnd; i += 1) {
        const st = result[i]!;
        if (!st.locked && !isRestStep(st)) {
          unlockedIndices.push(i);
          unlockedPool.push(st);
        }
      }

      if (unlockedPool.length > 1) {
        const remaining = [...unlockedPool];
        for (const targetIdx of unlockedIndices) {
          const prevStep = targetIdx > 0 ? result[targetIdx - 1] : undefined;
          if (!prevStep || isRestStep(prevStep)) {
            result[targetIdx] = remaining.shift()!;
            continue;
          }
          let bestIdx = 0;
          let bestCost = Number.POSITIVE_INFINITY;
          for (let j = 0; j < remaining.length; j += 1) {
            const candidate = remaining[j]!;
            const { cost } = computePairTransitionCost(prevStep, candidate, exercisesById);
            if (cost < bestCost) {
              bestCost = cost;
              bestIdx = j;
            }
          }
          result[targetIdx] = remaining.splice(bestIdx, 1)[0]!;
        }
      }
    }

    runStart = runEnd;
  }

  return result;
}

export function analyzeSequenceTransitionCost(
  steps: readonly SequenceStep[],
  exercisesById: ReadonlyMap<string, PilatesExercise>,
): TransitionCostAnalysis {
  let totalCostScore = 0;
  let apparatusSwitches = 0;
  let bodyPositionFlips = 0;
  let springChanges = 0;

  for (let i = 1; i < steps.length; i += 1) {
    const pair = computePairTransitionCost(steps[i - 1]!, steps[i]!, exercisesById);
    totalCostScore += pair.cost;
    if (pair.apparatusSwitch) apparatusSwitches += 1;
    if (pair.positionFlip) bodyPositionFlips += 1;
    if (pair.springChange) springChanges += 1;
  }

  const optimizedSteps = suggestTransitionOptimizedOrder(steps, exercisesById);
  let optimizedCostScore = 0;
  for (let i = 1; i < optimizedSteps.length; i += 1) {
    optimizedCostScore += computePairTransitionCost(
      optimizedSteps[i - 1]!,
      optimizedSteps[i]!,
      exercisesById,
    ).cost;
  }

  const potentialSavingsScore = Math.max(0, totalCostScore - optimizedCostScore);
  const summaryKo =
    potentialSavingsScore > 0
      ? `기구 전환 ${apparatusSwitches}회 · 체위 변경 ${bodyPositionFlips}회 · 스프링 변경 ${springChanges}회 (동선 최적화 시 전환 부하 -${potentialSavingsScore}점 절감 가능)`
      : `기구 전환 ${apparatusSwitches}회 · 체위 변경 ${bodyPositionFlips}회 · 스프링 변경 ${springChanges}회 (현재 구간 내 최적 동선 유지 중)`;

  return {
    totalCostScore,
    apparatusSwitches,
    bodyPositionFlips,
    springChanges,
    optimizedCostScore,
    potentialSavingsScore,
    summaryKo,
  };
}
