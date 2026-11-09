import type { PilatesExercise, SequenceStep } from '../types/pilates';
import { getSequenceStepClassSection } from './sequenceMotionBinding';
import { getStepTiming, isRestStep } from './sequenceEngine';

export interface StepPacingPoint {
  order: number;
  stepId: string;
  titleKo: string;
  section: 'warmup' | 'main' | 'cooldown' | 'rest';
  rpeScore: number;
  durationSec: number;
  cumulativeMin: number;
}

export interface ClassPacingSimulationResult {
  points: StepPacingPoint[];
  peakRpe: number;
  avgRpe: number;
  abruptSpikeCount: number;
  pacingVerdictKo: string;
}

/**
 * Simulates the physiological exertion curve (RPE 1~10) across a Pilates sequence
 * to verify smooth warm-up ramp, main flow peak, and cool-down recovery.
 */
export function simulateClassEnergyCurve(
  steps: readonly SequenceStep[],
  exercisesById: ReadonlyMap<string, PilatesExercise>,
): ClassPacingSimulationResult {
  if (steps.length === 0) {
    return {
      points: [],
      peakRpe: 0,
      avgRpe: 0,
      abruptSpikeCount: 0,
      pacingVerdictKo: '동작을 추가하면 수업 에너지 곡선(RPE 1~10)을 시뮬레이션합니다.',
    };
  }

  const points: StepPacingPoint[] = [];
  let cumulativeSec = 0;
  let abruptSpikeCount = 0;

  steps.forEach((step, idx) => {
    const ex = exercisesById.get(step.exerciseId);
    const timing = getStepTiming(step, ex);
    cumulativeSec += timing.totalSec;

    if (isRestStep(step)) {
      points.push({
        order: idx + 1,
        stepId: step.stepId,
        titleKo: '휴식',
        section: 'rest',
        rpeScore: 2,
        durationSec: timing.totalSec,
        cumulativeMin: Number((cumulativeSec / 60).toFixed(1)),
      });
      return;
    }

    const rawSection = getSequenceStepClassSection(step);
    const section = rawSection === 'preparation' ? 'warmup' : rawSection;
    const baseByLevel = ex?.level === '2.0' ? 7 : ex?.level === '1.5' ? 5.5 : 4;
    const layerDelta =
      step.selectedLayer === 'hard' ? 1.5 : step.selectedLayer === 'easy' ? -1.0 : 0;
    const sectionDelta = section === 'warmup' ? -1.2 : section === 'cooldown' ? -1.8 : 0.8;

    const rpeScore = Number(
      Math.max(2, Math.min(9.5, baseByLevel + layerDelta + sectionDelta)).toFixed(1),
    );

    const prevPoint = points.at(-1);
    if (prevPoint && Math.abs(rpeScore - prevPoint.rpeScore) >= 3.5) {
      abruptSpikeCount += 1;
    }

    points.push({
      order: idx + 1,
      stepId: step.stepId,
      titleKo: ex?.nameKo ?? '동작',
      section,
      rpeScore,
      durationSec: timing.totalSec,
      cumulativeMin: Number((cumulativeSec / 60).toFixed(1)),
    });
  });

  const peakRpe = Math.max(...points.map((p) => p.rpeScore));
  const avgRpe = Number(
    (points.reduce((sum, p) => sum + p.rpeScore, 0) / Math.max(1, points.length)).toFixed(1),
  );

  const pacingVerdictKo =
    abruptSpikeCount === 0
      ? `완만한 아치형 에너지 곡선 유지 중 (평균 RPE ${avgRpe} · 최고 RPE ${peakRpe})`
      : `강도 급변 구간 ${abruptSpikeCount}곳 감지 (평균 RPE ${avgRpe} · 최고 RPE ${peakRpe} · 중간 완충 동작 권장)`;

  return {
    points,
    peakRpe,
    avgRpe,
    abruptSpikeCount,
    pacingVerdictKo,
  };
}
