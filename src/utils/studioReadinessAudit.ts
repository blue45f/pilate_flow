import type { PilatesExercise, SequenceStep } from '../types/pilates';
import { getStepTiming, isRestStep } from './sequenceEngine';

export interface StudioReadinessAuditResult {
  score: number;
  apparatusSwitchCount: number;
  coveredSpinalPlanes: Array<'flexion' | 'extension' | 'lateral' | 'rotation'>;
  missingSpinalPlanes: Array<'flexion' | 'extension' | 'lateral' | 'rotation'>;
  sideSymmetryBalanced: boolean;
  missingSpringStepCount: number;
  summaryLabelKo: string;
}

const ALL_SPINAL_PLANES: ReadonlyArray<'flexion' | 'extension' | 'lateral' | 'rotation'> = [
  'flexion',
  'extension',
  'lateral',
  'rotation',
];

/**
 * Evaluates a sequence's studio operational readiness across 4 deterministic axes:
 * 1) Apparatus switch minimization
 * 2) Spinal 4-plane coverage diversity
 * 3) Left/Right anatomical time symmetry
 * 4) Spring setting completeness for spring-based apparatus
 */
export function auditSequenceStudioReadiness(
  steps: readonly SequenceStep[],
  exercisesById: ReadonlyMap<string, PilatesExercise>,
): StudioReadinessAuditResult {
  const nonRestSteps = steps.filter((st) => !isRestStep(st));
  if (nonRestSteps.length === 0) {
    return {
      score: 0,
      apparatusSwitchCount: 0,
      coveredSpinalPlanes: [],
      missingSpinalPlanes: [...ALL_SPINAL_PLANES],
      sideSymmetryBalanced: true,
      missingSpringStepCount: 0,
      summaryLabelKo: '동작을 추가하면 스튜디오 운영 준비도를 점검합니다.',
    };
  }

  let apparatusSwitchCount = 0;
  let prevApparatus: string | null = null;
  let leftSec = 0;
  let rightSec = 0;
  let missingSpringStepCount = 0;
  const coveredSet = new Set<'flexion' | 'extension' | 'lateral' | 'rotation'>();

  for (const step of nonRestSteps) {
    const ex = exercisesById.get(step.exerciseId);
    if (!ex) continue;

    if (prevApparatus !== null && prevApparatus !== ex.apparatus) {
      apparatusSwitchCount += 1;
    }
    prevApparatus = ex.apparatus;

    for (const plane of ex.spinalPlanes ?? []) {
      coveredSet.add(plane);
    }

    const timing = getStepTiming(step, ex);
    if (step.sideMode === 'left') leftSec += timing.movementSec;
    else if (step.sideMode === 'right') rightSec += timing.movementSec;
    else if (step.sideMode === 'left-then-right' || step.sideMode === 'right-then-left') {
      leftSec += timing.perSideSec;
      rightSec += timing.perSideSec;
    }

    const needsSprings =
      ex.apparatus === 'reformer' || ex.apparatus === 'cadillac' || ex.apparatus === 'chair';
    const hasSprings = Boolean((step.customSpringOverride ?? ex.springs ?? '').trim());
    if (needsSprings && !hasSprings) {
      missingSpringStepCount += 1;
    }
  }

  const coveredSpinalPlanes = ALL_SPINAL_PLANES.filter((p) => coveredSet.has(p));
  const missingSpinalPlanes = ALL_SPINAL_PLANES.filter((p) => !coveredSet.has(p));
  const sideSymmetryBalanced = Math.abs(leftSec - rightSec) <= 30;

  let score = 100;
  score -= Math.min(25, apparatusSwitchCount * 8);
  score -= missingSpinalPlanes.length * 10;
  if (!sideSymmetryBalanced) score -= 20;
  score -= Math.min(20, missingSpringStepCount * 10);
  score = Math.max(0, Math.min(100, score));

  const summaryLabelKo =
    score >= 85
      ? `스튜디오 준비도 우수 (${score}점 · 척추 ${coveredSpinalPlanes.length}/4평면 · 기구 전환 ${apparatusSwitchCount}회)`
      : `스튜디오 준비도 ${score}점 · 척추 ${coveredSpinalPlanes.length}/4평면 · 기구 전환 ${apparatusSwitchCount}회${
          !sideSymmetryBalanced ? ' · 좌우 시간 비대칭 확인' : ''
        }`;

  return {
    score,
    apparatusSwitchCount,
    coveredSpinalPlanes,
    missingSpinalPlanes,
    sideSymmetryBalanced,
    missingSpringStepCount,
    summaryLabelKo,
  };
}
