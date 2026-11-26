import type { PilatesExercise, SequenceStep } from '../types/pilates';
import type { ClassSectionRole } from '../types/sequenceMotion';
import { getStepSideLabels, getStepTiming, isRestStep } from './sequenceEngine';
import { getSequenceStepClassSection } from './sequenceMotionBinding';

export interface BilateralStageProgress {
  readonly isBilateral: boolean;
  readonly firstSideLabelKo: string;
  readonly secondSideLabelKo: string;
  readonly currentPhaseKind:
    | 'rest'
    | 'explanation'
    | 'side-1'
    | 'side-2'
    | 'single-movement'
    | 'transition';
  readonly activeSideIndex: 1 | 2 | null;
  readonly sideRemainingSec: number | null;
  readonly perSideTotalSec: number | null;
  readonly sideProgressRatio: number;
  /** True within the 8-second window around the halfway bilateral switch point. */
  readonly isSwitchAlertWindow: boolean;
  readonly switchBannerKo: string | null;
}

/**
 * Computes exact unilateral/bilateral movement progress during Live Stage execution
 * so instructors teaching off the Reformer or Studio TV see symmetrical per-side timing
 * and an unmistakable halfway switch prompt (`⇄ 반대쪽 전환`).
 */
export function computeBilateralStageProgress(params: {
  readonly step: SequenceStep | undefined;
  readonly exercise: PilatesExercise | undefined;
  readonly remainingMs: number;
  readonly stepDurationMs: number;
}): BilateralStageProgress {
  const { step, exercise, remainingMs, stepDurationMs } = params;
  if (!step || isRestStep(step)) {
    return {
      isBilateral: false,
      firstSideLabelKo: '양쪽',
      secondSideLabelKo: '양쪽',
      currentPhaseKind: 'rest',
      activeSideIndex: null,
      sideRemainingSec: null,
      perSideTotalSec: null,
      sideProgressRatio: 0,
      isSwitchAlertWindow: false,
      switchBannerKo: null,
    };
  }

  const timing = getStepTiming(step, exercise);
  const sideLabels = getStepSideLabels(step, exercise);
  const isBilateral = timing.sides === 2 && sideLabels.length >= 2;
  const firstSideLabelKo = sideLabels[0] ?? '왼쪽';
  const secondSideLabelKo = sideLabels[1] ?? '오른쪽';

  const totalSec = Math.max(1, stepDurationMs / 1000);
  const clampedRemainingSec = Math.max(0, Math.min(totalSec, remainingMs / 1000));
  const elapsedSec = Math.max(0, totalSec - clampedRemainingSec);

  const explanationEndSec = timing.explanationSec;
  const movementEndSec = timing.explanationSec + timing.movementSec;

  if (elapsedSec < explanationEndSec) {
    return {
      isBilateral,
      firstSideLabelKo,
      secondSideLabelKo,
      currentPhaseKind: 'explanation',
      activeSideIndex: null,
      sideRemainingSec: isBilateral ? Math.round(timing.perSideSec ?? timing.movementSec / 2) : null,
      perSideTotalSec: isBilateral ? Math.round(timing.perSideSec ?? timing.movementSec / 2) : null,
      sideProgressRatio: 0,
      isSwitchAlertWindow: false,
      switchBannerKo: isBilateral
        ? `${firstSideLabelKo} 먼저 준비 · 각 ${Math.round(timing.perSideSec ?? timing.movementSec / 2)}초`
        : null,
    };
  }

  if (elapsedSec >= movementEndSec) {
    return {
      isBilateral,
      firstSideLabelKo,
      secondSideLabelKo,
      currentPhaseKind: 'transition',
      activeSideIndex: null,
      sideRemainingSec: 0,
      perSideTotalSec: isBilateral ? Math.round(timing.perSideSec ?? timing.movementSec / 2) : null,
      sideProgressRatio: 1,
      isSwitchAlertWindow: false,
      switchBannerKo: null,
    };
  }

  const movementElapsedSec = elapsedSec - explanationEndSec;
  const movementTotalSec = Math.max(1, timing.movementSec);

  if (!isBilateral) {
    return {
      isBilateral: false,
      firstSideLabelKo,
      secondSideLabelKo,
      currentPhaseKind: 'single-movement',
      activeSideIndex: null,
      sideRemainingSec: null,
      perSideTotalSec: null,
      sideProgressRatio: Math.min(1, Math.max(0, movementElapsedSec / movementTotalSec)),
      isSwitchAlertWindow: false,
      switchBannerKo: null,
    };
  }

  const halfMovementSec = movementTotalSec / 2;
  const perSideTotalSec = Math.max(1, Math.round(halfMovementSec));

  if (movementElapsedSec < halfMovementSec) {
    const side1Remaining = Math.max(0, Math.ceil(halfMovementSec - movementElapsedSec));
    const nearSwitch = side1Remaining <= 6;
    return {
      isBilateral: true,
      firstSideLabelKo,
      secondSideLabelKo,
      currentPhaseKind: 'side-1',
      activeSideIndex: 1,
      sideRemainingSec: side1Remaining,
      perSideTotalSec,
      sideProgressRatio: Math.min(0.5, movementElapsedSec / movementTotalSec),
      isSwitchAlertWindow: nearSwitch,
      switchBannerKo: nearSwitch
        ? `⇄ 곧 ${secondSideLabelKo} 전환 (${side1Remaining}초 후)`
        : `1측 · ${firstSideLabelKo} 진행 중 (${side1Remaining}초 남음)`,
    };
  }

  const side2Elapsed = movementElapsedSec - halfMovementSec;
  const side2Remaining = Math.max(0, Math.ceil(halfMovementSec - side2Elapsed));
  const justSwitched = side2Elapsed <= 5;

  return {
    isBilateral: true,
    firstSideLabelKo,
    secondSideLabelKo,
    currentPhaseKind: 'side-2',
    activeSideIndex: 2,
    sideRemainingSec: side2Remaining,
    perSideTotalSec,
    sideProgressRatio: Math.min(1, Math.max(0.5, movementElapsedSec / movementTotalSec)),
    isSwitchAlertWindow: justSwitched,
    switchBannerKo: justSwitched
      ? `⇄ 지금 ${secondSideLabelKo} 전환 · 동일 템포 시작`
      : `2측 · ${secondSideLabelKo} 진행 중 (${side2Remaining}초 남음)`,
  };
}

export interface StageSectionSummary {
  readonly role: ClassSectionRole;
  readonly labelKo: string;
  readonly firstStepIndex: number;
  readonly stepCount: number;
  readonly completedCount: number;
}

const SECTION_LABELS_KO: Record<ClassSectionRole, string> = {
  preparation: '준비',
  main: '메인',
  cooldown: '마무리',
};

export function summarizeStageSections(
  steps: readonly SequenceStep[],
  checkedStepIds: ReadonlySet<string>,
): readonly StageSectionSummary[] {
  const roles: ClassSectionRole[] = ['preparation', 'main', 'cooldown'];
  return roles
    .map((role) => {
      let firstStepIndex = -1;
      let stepCount = 0;
      let completedCount = 0;
      steps.forEach((step, idx) => {
        const stepRole = getSequenceStepClassSection(step, steps);
        if (stepRole !== role) return;
        if (firstStepIndex < 0) firstStepIndex = idx;
        stepCount += 1;
        if (checkedStepIds.has(step.stepId)) {
          completedCount += 1;
        }
      });
      return {
        role,
        labelKo: SECTION_LABELS_KO[role],
        firstStepIndex,
        stepCount,
        completedCount,
      };
    })
    .filter((item) => item.stepCount > 0);
}
