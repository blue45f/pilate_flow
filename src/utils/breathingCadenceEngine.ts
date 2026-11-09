import type { DifficultyLevel, PilatesExercise, SequenceStep } from '../types/pilates';
import { isRestStep } from './sequenceEngine';

export interface BreathingCadenceCue {
  stepId: string;
  exerciseId: string;
  inhalePhaseKo: string;
  exhalePhaseKo: string;
  tempoRatio: string;
  cycleDurationSec: number;
  estimatedCycles: number;
  summaryCueKo: string;
}

/**
 * Synthesizes deterministic Pilates breathing cadence and tempo cues per step
 * based on spinal plane mechanics, difficulty layer, and duration.
 */
export function buildStepBreathingCadence(
  step: SequenceStep,
  exercise?: PilatesExercise,
  level: DifficultyLevel = '1.5',
): BreathingCadenceCue {
  if (isRestStep(step)) {
    const totalSec = Math.max(15, Math.round(step.durationMin * 60));
    return {
      stepId: step.stepId,
      exerciseId: step.exerciseId,
      inhalePhaseKo: '코로 깊게 흉곽 측면 확장 들숨 (4초)',
      exhalePhaseKo: '입으로 길게 복부 이완 날숨 (6초)',
      tempoRatio: '4:0:6',
      cycleDurationSec: 10,
      estimatedCycles: Math.max(1, Math.round(totalSec / 10)),
      summaryCueKo: '회복 호흡 4:6 · 흉곽 이완',
    };
  }

  const planes = exercise?.spinalPlanes ?? [];
  const cycleDurationSec = level === '1.0' ? 10 : level === '1.5' ? 8 : 6;
  const totalSec = Math.max(20, Math.round(step.durationMin * 60));
  const estimatedCycles = Math.max(2, Math.round(totalSec / cycleDurationSec));

  if (planes.includes('extension')) {
    return {
      stepId: step.stepId,
      exerciseId: step.exerciseId,
      inhalePhaseKo: '들숨에 흉추 상부 신전·가슴 열기',
      exhalePhaseKo: '날숨에 복횡근 수축하며 중립 복귀',
      tempoRatio: '4:1:3',
      cycleDurationSec,
      estimatedCycles,
      summaryCueKo: `신전 호흡 (4:1:3) · 약 ${estimatedCycles}호흡 사이클`,
    };
  }

  if (planes.includes('rotation') || planes.includes('lateral')) {
    return {
      stepId: step.stepId,
      exerciseId: step.exerciseId,
      inhalePhaseKo: '들숨에 척추 축성 신장(Axial Elongation) 준비',
      exhalePhaseKo: '날숨에 복사근 수축하며 회전·측굴 정점 이동',
      tempoRatio: '3:1:4',
      cycleDurationSec,
      estimatedCycles,
      summaryCueKo: `회전·측굴 호흡 (3:1:4) · 약 ${estimatedCycles}호흡 사이클`,
    };
  }

  return {
    stepId: step.stepId,
    exerciseId: step.exerciseId,
    inhalePhaseKo: '들숨에 골반·흉곽 중립 정렬 준비',
    exhalePhaseKo: '날숨에 파워하우스 수축하며 주동작 수행',
    tempoRatio: '3:0:5',
    cycleDurationSec,
    estimatedCycles,
    summaryCueKo: `코어 굴곡·안정화 호흡 (3:0:5) · 약 ${estimatedCycles}호흡 사이클`,
  };
}

export function summarizeSequenceBreathingCadence(
  steps: readonly SequenceStep[],
  exercisesById: ReadonlyMap<string, PilatesExercise>,
  level: DifficultyLevel = '1.5',
): {
  cues: BreathingCadenceCue[];
  totalEstimatedBreathCycles: number;
  headlineKo: string;
} {
  const cues = steps.map((st) =>
    buildStepBreathingCadence(st, exercisesById.get(st.exerciseId), level),
  );
  const totalEstimatedBreathCycles = cues.reduce((sum, item) => sum + item.estimatedCycles, 0);
  return {
    cues,
    totalEstimatedBreathCycles,
    headlineKo: `전체 약 ${totalEstimatedBreathCycles}회 호흡 사이클 · 척추 평면별 들숨/날숨 템포 자동 배정`,
  };
}
