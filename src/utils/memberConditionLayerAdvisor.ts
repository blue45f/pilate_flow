import type {
  AutoGenerateCriteria,
  PilatesExercise,
  SequenceStep,
} from '../types/pilates';
import { isRestStep } from './sequenceEngine';

export interface StepLayerAdvice {
  stepId: string;
  exerciseId: string;
  exerciseTitleKo: string;
  currentLayer: 'easy' | 'standard' | 'hard';
  recommendedLayer: 'easy' | 'standard' | 'hard';
  reasonKo: string;
}

/**
 * Evaluates active sequence steps against instructor observations (pelvic tilt)
 * and planning goals to recommend safe, targeted layer adjustments (`easy`/`standard`/`hard`).
 */
export function buildMemberConditionLayerAdvice(
  steps: readonly SequenceStep[],
  exercisesById: ReadonlyMap<string, PilatesExercise>,
  criteria: Pick<
    AutoGenerateCriteria,
    'level' | 'planningGoals' | 'instructorObservations'
  >,
): {
  advices: StepLayerAdvice[];
  changedCount: number;
  summaryKo: string;
} {
  const goals = new Set(criteria.planningGoals ?? []);
  const observations = new Set(criteria.instructorObservations ?? []);
  const hasPelvicObservation =
    observations.has('anterior-pelvic-tilt') || observations.has('posterior-pelvic-tilt');

  const advices: StepLayerAdvice[] = [];

  for (const step of steps) {
    if (isRestStep(step)) continue;
    const ex = exercisesById.get(step.exerciseId);
    if (!ex) continue;

    const currentLayer = step.selectedLayer ?? 'standard';
    let recommendedLayer: 'easy' | 'standard' | 'hard' = currentLayer;
    let reasonKo = '현재 레이어 유지';

    const planes = ex.spinalPlanes ?? [];
    if (hasPelvicObservation && (planes.includes('extension') || ex.level === '2.0')) {
      recommendedLayer = 'easy';
      reasonKo = '골반 경사 관찰 메모 반영 · 요추 과신전 예방을 위해 가볍게(Easy) 레이어 권장';
    } else if (goals.has('mobility') && planes.includes('rotation')) {
      recommendedLayer = 'easy';
      reasonKo = '가동성 목표 반영 · 가동 범위 확보를 위해 가볍게(Easy) 레이어 권장';
    } else if (
      goals.has('strength') &&
      !hasPelvicObservation &&
      criteria.level === '2.0' &&
      (ex.blockCategory === 'core' || ex.blockCategory === 'plank')
    ) {
      recommendedLayer = 'hard';
      reasonKo = '근력 강화 목표 및 중상급(Lv 2.0) 반영 · 코어 도전(Hard) 레이어 권장';
    }

    advices.push({
      stepId: step.stepId,
      exerciseId: step.exerciseId,
      exerciseTitleKo: ex.nameKo,
      currentLayer,
      recommendedLayer,
      reasonKo,
    });
  }

  const changedCount = advices.filter((a) => a.currentLayer !== a.recommendedLayer).length;
  const summaryKo =
    changedCount > 0
      ? `관찰 메모·계획 목표 기준 ${changedCount}개 동작에 맞춤 레이어 조정 권장`
      : '현재 시퀀스의 동작 레이어가 수업 목표·관찰 조건과 잘 맞습니다.';

  return { advices, changedCount, summaryKo };
}

export function applyRecommendedLayersToSteps(
  steps: readonly SequenceStep[],
  advices: readonly StepLayerAdvice[],
): SequenceStep[] {
  const adviceByStepId = new Map(advices.map((a) => [a.stepId, a.recommendedLayer]));
  return steps.map((st) => {
    const rec = adviceByStepId.get(st.stepId);
    if (!rec || isRestStep(st) || st.locked) return st;
    return { ...st, selectedLayer: rec };
  });
}
