import { INITIAL_HISTORY_LOGS } from '../data/pilatesCatalog';
import type { ClassHistoryLog, SequenceStep } from '../types/pilates';
import { getStepTiming, isRestStep } from './sequenceEngine';

export interface DurationCalibrationSummary {
  sampleCount: number;
  avgPlannedSec: number;
  avgActualSec: number;
  avgDeltaSec: number;
  pacingRatio: number;
  tendency: 'overrun' | 'underrun' | 'balanced' | 'insufficient-data';
  recommendationKo: string;
}

const SAMPLE_LOG_IDS = new Set(INITIAL_HISTORY_LOGS.map((log) => log.id));

/**
 * Analyzes non-sample teaching logs that have both planned `stepsSnapshot` and
 * recorded `actualDurationSec` to compute the instructor's real-world pacing ratio.
 */
export function analyzeDurationCalibration(
  historyLogs: readonly ClassHistoryLog[],
  groupId = 'all',
): DurationCalibrationSummary {
  const validPairs: Array<{ plannedSec: number; actualSec: number }> = [];

  for (const log of historyLogs) {
    if (SAMPLE_LOG_IDS.has(log.id)) continue;
    if (groupId !== 'all' && log.groupId !== groupId) continue;
    if (
      typeof log.actualDurationSec !== 'number' ||
      !Number.isFinite(log.actualDurationSec) ||
      log.actualDurationSec <= 0 ||
      !log.stepsSnapshot?.length
    ) {
      continue;
    }
    const plannedSec = log.stepsSnapshot.reduce(
      (sum, step) => sum + getStepTiming(step).totalSec,
      0,
    );
    if (plannedSec > 0) {
      validPairs.push({ plannedSec, actualSec: log.actualDurationSec });
    }
  }

  if (validPairs.length === 0) {
    return {
      sampleCount: 0,
      avgPlannedSec: 0,
      avgActualSec: 0,
      avgDeltaSec: 0,
      pacingRatio: 1,
      tendency: 'insufficient-data',
      recommendationKo:
        '실제 소요 시간이 기록된 수업이 쌓이면 계획 대 실제 시간 보정 제안이 표시됩니다.',
    };
  }

  const totalPlanned = validPairs.reduce((sum, p) => sum + p.plannedSec, 0);
  const totalActual = validPairs.reduce((sum, p) => sum + p.actualSec, 0);
  const avgPlannedSec = Math.round(totalPlanned / validPairs.length);
  const avgActualSec = Math.round(totalActual / validPairs.length);
  const avgDeltaSec = avgActualSec - avgPlannedSec;
  const pacingRatio = Number((totalActual / Math.max(1, totalPlanned)).toFixed(3));

  if (Math.abs(avgDeltaSec) <= 90) {
    return {
      sampleCount: validPairs.length,
      avgPlannedSec,
      avgActualSec,
      avgDeltaSec,
      pacingRatio,
      tendency: 'balanced',
      recommendationKo: `최근 ${validPairs.length}회 수업의 계획 시간과 실제 소요 시간이 평균 1.5분 이내로 잘 맞습니다.`,
    };
  }

  const diffMin = Number((Math.abs(avgDeltaSec) / 60).toFixed(1));
  if (avgDeltaSec > 90) {
    return {
      sampleCount: validPairs.length,
      avgPlannedSec,
      avgActualSec,
      avgDeltaSec,
      pacingRatio,
      tendency: 'overrun',
      recommendationKo: `최근 ${validPairs.length}회 수업에서 계획보다 평균 +${diffMin}분 더 소요되었습니다. 동작당 전환 여유 시간을 +10초씩 반영해 보세요.`,
    };
  }

  return {
    sampleCount: validPairs.length,
    avgPlannedSec,
    avgActualSec,
    avgDeltaSec,
    pacingRatio,
    tendency: 'underrun',
    recommendationKo: `최근 ${validPairs.length}회 수업에서 계획보다 평균 -${diffMin}분 일찍 마쳤습니다. 본운동 반복이나 마무리 스트레칭을 조금 더 배분해 보세요.`,
  };
}

/**
 * Applies historical pacing calibration to a sequence of steps without mutating history.
 */
export function applyDurationCalibrationToSteps(
  steps: readonly SequenceStep[],
  calibration: DurationCalibrationSummary,
): SequenceStep[] {
  if (calibration.tendency === 'insufficient-data' || calibration.tendency === 'balanced') {
    return steps.map((st) => ({ ...st }));
  }
  const exerciseSteps = steps.filter((st) => !isRestStep(st));
  if (exerciseSteps.length === 0) return steps.map((st) => ({ ...st }));

  const perStepDeltaMin = Number(
    (calibration.avgDeltaSec / 60 / exerciseSteps.length).toFixed(2),
  );

  return steps.map((step) => {
    if (isRestStep(step) || step.locked) return { ...step };
    const nextDurationMin = Number(
      Math.max(1, Math.min(20, step.durationMin + perStepDeltaMin)).toFixed(2),
    );
    return {
      ...step,
      durationMin: nextDurationMin,
    };
  });
}
