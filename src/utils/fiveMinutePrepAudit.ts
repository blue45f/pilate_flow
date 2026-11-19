import { getMovementProvenance } from '../data/movementProvenance';
import type { PilatesExercise, SequenceStep } from '../types/pilates';
import { isExerciseAutoEligible } from './exerciseReview';
import { getSequenceDurations, isRestStep } from './sequenceEngine';

export interface FiveMinutePrepStepStatus {
  readonly id: 'conditions' | 'movements' | 'time-fit' | 'live-ready';
  readonly stepNumber: 1 | 2 | 3 | 4;
  readonly titleKo: string;
  readonly detailKo: string;
  readonly done: boolean;
}

export interface FiveMinutePrepSummary {
  readonly completedSteps: number;
  readonly totalSteps: 4;
  readonly exerciseCount: number;
  readonly lockedCount: number;
  readonly restCount: number;
  readonly totalSec: number;
  readonly targetSec: number;
  readonly deltaSec: number;
  readonly reviewedCount: number;
  readonly unreviewedCount: number;
  readonly originalOrDedicatedCount: number;
  readonly videoOrReferenceCount: number;
  readonly steps: readonly FiveMinutePrepStepStatus[];
}

export function computeFiveMinutePrepSummary(params: {
  readonly activeSteps: readonly SequenceStep[];
  readonly exercisesById: ReadonlyMap<string, PilatesExercise>;
  readonly targetMinutes: number;
  readonly selectedEquipmentCount: number;
  readonly canStartClass: boolean;
}): FiveMinutePrepSummary {
  const { activeSteps, exercisesById, targetMinutes, selectedEquipmentCount, canStartClass } =
    params;

  const durations = getSequenceDurations(activeSteps as SequenceStep[]);
  const targetSec = Math.max(0, Math.round(targetMinutes * 60));
  const deltaSec = durations.totalSec - targetSec;

  let exerciseCount = 0;
  let lockedCount = 0;
  let restCount = 0;
  let reviewedCount = 0;
  let unreviewedCount = 0;
  let originalOrDedicatedCount = 0;
  let videoOrReferenceCount = 0;

  for (const step of activeSteps) {
    if (step.locked) lockedCount += 1;
    if (isRestStep(step)) {
      restCount += 1;
      continue;
    }
    exerciseCount += 1;
    const exercise = exercisesById.get(step.exerciseId);
    if (!exercise) {
      unreviewedCount += 1;
      continue;
    }
    if (isExerciseAutoEligible(exercise)) reviewedCount += 1;
    else unreviewedCount += 1;

    const provenance = getMovementProvenance(exercise);
    if (provenance.kind === 'original') originalOrDedicatedCount += 1;
    else videoOrReferenceCount += 1;
  }

  const step1Done = selectedEquipmentCount > 0 && targetMinutes >= 10 && targetMinutes <= 120;
  const step2Done = exerciseCount > 0;
  const step3Done = exerciseCount > 0 && deltaSec === 0;
  const step4Done = exerciseCount > 0 && canStartClass;

  const steps: FiveMinutePrepStepStatus[] = [
    {
      id: 'conditions',
      stepNumber: 1,
      titleKo: '조건 2탭 고정',
      detailKo: step1Done
        ? `${targetMinutes}분 · 기구 ${selectedEquipmentCount}종 선택됨`
        : '수업 시간과 사용할 기구를 먼저 선택하세요.',
      done: step1Done,
    },
    {
      id: 'movements',
      stepNumber: 2,
      titleKo: '핵심 동작 담기·잠금',
      detailKo: step2Done
        ? `${exerciseCount}개 동작${lockedCount > 0 ? ` · ${lockedCount}개 잠금` : ''}${restCount > 0 ? ` · 휴식 ${restCount}개` : ''}`
        : '오늘 수업 핵심 동작을 1개 이상 담아 보세요.',
      done: step2Done,
    },
    {
      id: 'time-fit',
      stepNumber: 3,
      titleKo: '목표 시간 맞추기',
      detailKo: !step2Done
        ? '동작을 담은 뒤 목표 시간에 맞출 수 있어요.'
        : deltaSec === 0
          ? `${targetMinutes}분 정각에 딱 맞췄어요.`
          : `목표 대비 ${Math.abs(Math.round(deltaSec / 60 * 10) / 10)}분 ${deltaSec > 0 ? '초과' : '부족'} · 잠긴 동작·휴식 유지 보정 가능`,
      done: step3Done,
    },
    {
      id: 'live-ready',
      stepNumber: 4,
      titleKo: '라이브 수업 뷰 전환',
      detailKo: step4Done
        ? '타이머·호흡·스프링 큐로 바로 수업을 시작할 수 있어요.'
        : '동작 구성과 항목 시간을 확인하면 바로 진행할 수 있어요.',
      done: step4Done,
    },
  ];

  const completedSteps = steps.filter((item) => item.done).length;

  return {
    completedSteps,
    totalSteps: 4,
    exerciseCount,
    lockedCount,
    restCount,
    totalSec: durations.totalSec,
    targetSec,
    deltaSec,
    reviewedCount,
    unreviewedCount,
    originalOrDedicatedCount,
    videoOrReferenceCount,
    steps,
  };
}
