import {
  EQUIPMENT_IDS,
  PROP_IDS,
  getExerciseAvailability,
  getExerciseEquipment,
} from '../data/equipmentCatalog';
import type {
  ApparatusTransitionDetail,
  HierarchyPilatesExercise,
  HumanMovementDraft,
  LocalPersonalConstraint,
  SequenceSectionBreakdown,
  SequenceTimeBreakdown,
  SequenceValidationIssue,
  SequenceValidationReport,
} from '../types/hierarchy';
import type {
  DifficultyLevel,
  PilatesExercise,
  PropType,
  SequenceStep,
} from '../types/pilates';
import type { ClassSectionRole } from '../types/sequenceMotion';
import {
  fitSequenceDuration,
  getMovementKey,
  getStepTiming,
  isRestStep,
} from './sequenceEngine';

export interface ValidateSequenceOptions {
  targetMinutes: number;
  level: DifficultyLevel;
  availableEquipment?: readonly string[];
  ownedEquipment?: readonly string[];
  preferredProps?: readonly PropType[];
  ownedProps?: readonly PropType[];
  localConstraints?: LocalPersonalConstraint;
  humanDrafts?: readonly HumanMovementDraft[];
}

export type HumanDraftLookupOption =
  | { humanDrafts?: readonly HumanMovementDraft[] }
  | readonly HumanMovementDraft[]
  | undefined;

function extractHumanDrafts(
  option?: HumanDraftLookupOption,
): readonly HumanMovementDraft[] | undefined {
  if (!option) return undefined;
  if (Array.isArray(option)) return option;
  return (option as { humanDrafts?: readonly HumanMovementDraft[] }).humanDrafts;
}

export interface ResolvedStepMovement {
  exercise?: HierarchyPilatesExercise;
  matchedDraft?: HumanMovementDraft;
  isHumanCreated: boolean;
  missingDraftApparatus: boolean;
  missingDraftDuration: boolean;
}

function buildExerciseFromHumanDraft(
  draft: HumanMovementDraft,
  step: SequenceStep,
): HierarchyPilatesExercise {
  const displayName =
    draft.workingNameKo?.trim() || draft.ideaLine.trim() || `새 동작 초안 (${draft.id})`;
  const resolvedApparatus = draft.apparatus ?? 'reformer';
  const resolvedCategory =
    draft.blockCategory ??
    step.blockCategory ??
    (draft.sectionRole === 'preparation'
      ? 'warmup'
      : draft.sectionRole === 'cooldown'
        ? 'cooldown'
        : 'core');

  return {
    id: step.exerciseId || draft.id,
    nameKo: displayName,
    nameEn: displayName,
    apparatus: resolvedApparatus,
    requiredEquipment: draft.requiredEquipment
      ? [...draft.requiredEquipment]
      : [resolvedApparatus],
    props: draft.props ? [...draft.props] : ['none'],
    blockCategory: resolvedCategory,
    spinalPlanes: draft.spinalPlanes ? [...draft.spinalPlanes] : ['neutral'],
    bodyPosition: draft.bodyPosition ?? 'supine',
    level: draft.level ?? '1.5',
    defaultDurationMin: draft.defaultDurationMin ?? step.durationMin ?? 5,
    defaultRepetitions: draft.defaultRepetitions ?? step.repetitions,
    defaultSets: draft.defaultSets ?? step.sets,
    isUnilateral: draft.isUnilateral ?? false,
    springs: draft.springs ?? step.customSpringOverride ?? '1R 1B',
    box: draft.box ?? 'none',
    footbar: draft.footbar ?? 'mid',
    headrest: draft.headrest ?? 'up',
    targetMuscles: draft.targetMuscles ? [...draft.targetMuscles] : ['전신'],
    breathPattern: draft.breathPattern ?? '자연 호흡',
    cues: draft.cues?.length ? [...draft.cues] : [draft.ideaLine],
    precautions: draft.precautions ?? '',
    layers: {
      easy: draft.layers?.easy ?? draft.ideaLine,
      standard: draft.layers?.standard ?? draft.ideaLine,
      hard: draft.layers?.hard ?? draft.ideaLine,
    },
    youtube: {
      videoId: 'dQw4w9WgXcQ',
      channelName: 'Instructor Draft',
      videoTitle: displayName,
      startSec: 0,
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    },
    favoriteTag: 'none',
    isCustom: true,
    humanDraftId: draft.id,
    humanDraftRevision: draft.revision,
  };
}

/**
 * Resolves movement metadata for validation and timing.
 * Checks `step.exerciseSnapshot` first, then `exercises` catalog, then `humanDrafts`
 * (matching `step.humanDraftId` or `step.exerciseId`).
 * Human-created drafts are never treated as unknown exercises.
 */
export function resolveMovementForValidation(
  step: SequenceStep,
  exercises: readonly HierarchyPilatesExercise[],
  humanDrafts?: readonly HumanMovementDraft[],
): ResolvedStepMovement {
  if (isRestStep(step)) {
    return {
      exercise: undefined,
      matchedDraft: undefined,
      isHumanCreated: false,
      missingDraftApparatus: false,
      missingDraftDuration: false,
    };
  }

  const matchedDraft = humanDrafts?.find(
    (draft) =>
      (step.humanDraftId !== undefined && draft.id === step.humanDraftId) ||
      draft.id === step.exerciseId,
  );
  const catalogMatch = exercises.find((exercise) => exercise.id === step.exerciseId);
  const isHumanCreated = Boolean(
    step.humanDraftId ||
      step.exerciseSnapshot?.sourceOrigin === 'human-created' ||
      matchedDraft ||
      catalogMatch?.humanDraftId,
  );

  const missingDraftApparatus = Boolean(matchedDraft && matchedDraft.apparatus === undefined);
  const missingDraftDuration = Boolean(
    matchedDraft && matchedDraft.defaultDurationMin === undefined,
  );

  if (step.exerciseSnapshot) {
    const snap = step.exerciseSnapshot;
    const exercise: HierarchyPilatesExercise = {
      ...(catalogMatch ?? {
        youtube: {
          videoId: 'dQw4w9WgXcQ',
          channelName: 'Snapshot',
          videoTitle: snap.nameKo,
          startSec: 0,
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        },
        favoriteTag: 'none' as const,
      }),
      ...snap,
      requiredEquipment: snap.requiredEquipment ? [...snap.requiredEquipment] : undefined,
      props: [...snap.props],
      spinalPlanes: [...snap.spinalPlanes],
      targetMuscles: [...snap.targetMuscles],
      cues: [...snap.cues],
    };
    return {
      exercise,
      matchedDraft,
      isHumanCreated,
      missingDraftApparatus,
      missingDraftDuration,
    };
  }

  if (catalogMatch) {
    return {
      exercise: catalogMatch,
      matchedDraft,
      isHumanCreated,
      missingDraftApparatus,
      missingDraftDuration,
    };
  }

  if (matchedDraft) {
    return {
      exercise: buildExerciseFromHumanDraft(matchedDraft, step),
      matchedDraft,
      isHumanCreated: true,
      missingDraftApparatus,
      missingDraftDuration,
    };
  }

  if (step.humanDraftId) {
    const fallbackDraft: HumanMovementDraft = {
      id: step.humanDraftId,
      sourceOrigin: 'human-created',
      completenessStage: 'idea-only',
      ideaLine: step.instructorNote || `강사 생성 동작 (${step.humanDraftId})`,
      revision: step.humanDraftRevision ?? 1,
      revisionHistory: [],
      feelLogs: [],
      modificationLogs: [],
      photoReferences: [],
      safetyBoundary: {
        originType: 'instructor-created-draft',
        evaluationBasis: 'subjective-instructor-feel',
        aiSafetyGuaranteed: false,
        objectiveEfficacyClaimed: false,
        expertVerified: false,
        disclaimerKo: '강사 직접 생성 초안',
      },
      createdAt: '2026-04-01T00:00:00Z',
      updatedAt: '2026-04-01T00:00:00Z',
    };
    return {
      exercise: buildExerciseFromHumanDraft(fallbackDraft, step),
      matchedDraft: undefined,
      isHumanCreated: true,
      missingDraftApparatus: false,
      missingDraftDuration: false,
    };
  }

  return {
    exercise: undefined,
    matchedDraft: undefined,
    isHumanCreated: false,
    missingDraftApparatus: false,
    missingDraftDuration: false,
  };
}

/**
 * Resolves the exercise definition for a sequence step, prioritizing `step.exerciseSnapshot`,
 * then `exercises`, then `humanDrafts`.
 */
export function resolveStepExercise(
  step: SequenceStep,
  exercises: readonly PilatesExercise[],
  humanDrafts?: readonly HumanMovementDraft[],
): PilatesExercise | undefined {
  return resolveMovementForValidation(step, exercises, humanDrafts).exercise;
}

/**
 * Enforces the strict boundary between AI catalog-only auto-recommendations and
 * human-created movement freedom.
 */
export function validateMovementSourceBoundary(input: {
  mode: 'ai-auto-recommendation' | 'human-creation';
  candidateIds: readonly string[];
  catalogExercises: readonly HierarchyPilatesExercise[];
  humanDrafts?: readonly HumanMovementDraft[];
}): {
  allowed: boolean;
  rejectedIds: string[];
  reasonKo: string;
} {
  const { mode, candidateIds, catalogExercises, humanDrafts = [] } = input;
  const humanDraftIdSet = new Set(humanDrafts.map((draft) => draft.id));
  const catalogMap = new Map(catalogExercises.map((exercise) => [exercise.id, exercise]));

  if (mode === 'ai-auto-recommendation') {
    const rejectedIds = candidateIds.filter((id) => {
      if (humanDraftIdSet.has(id)) return true;
      const catalogMatch = catalogMap.get(id);
      if (!catalogMatch) return true;
      if (catalogMatch.humanDraftId) return true;
      return false;
    });

    return {
      allowed: rejectedIds.length === 0,
      rejectedIds,
      reasonKo:
        rejectedIds.length === 0
          ? '모든 추천 후보 동작이 검증된 카탈로그 범위 내에 있습니다.'
          : `AI 자동 추천은 카탈로그에 등록·검증된 동작만 사용할 수 있으며, 미검증 초안이나 임의 생성 ID(${rejectedIds.join(', ')})는 추천할 수 없습니다.`,
    };
  }

  // mode === 'human-creation': both catalog exercises AND human-created drafts are allowed
  const rejectedIds = candidateIds.filter(
    (id) => !catalogMap.has(id) && !humanDraftIdSet.has(id),
  );

  return {
    allowed: rejectedIds.length === 0,
    rejectedIds,
    reasonKo:
      rejectedIds.length === 0
        ? '강사가 직접 만든 새 동작 초안과 카탈로그 동작 모두 블록·시퀀스·수업에 자유롭게 사용할 수 있습니다.'
        : `카탈로그 및 강사 초안 목록에서 찾을 수 없는 ID(${rejectedIds.join(', ')})가 포함되어 있습니다.`,
  };
}

/**
 * Resolves the class section role (`preparation` | `main` | `cooldown`) for a step.
 */
export function resolveStepSectionRole(
  step: SequenceStep,
  exercise?: PilatesExercise,
  matchedDraft?: HumanMovementDraft,
): ClassSectionRole {
  if (step.classSection) return step.classSection;
  if (matchedDraft?.sectionRole) return matchedDraft.sectionRole;
  const category = step.blockCategory || exercise?.blockCategory;
  if (category === 'warmup') return 'preparation';
  if (category === 'cooldown') return 'cooldown';
  return 'main';
}

function sectionRank(role: ClassSectionRole): number {
  if (role === 'preparation') return 0;
  if (role === 'main') return 1;
  return 2;
}

function computeStepDifficultyScore(step: SequenceStep, exercise: PilatesExercise): number {
  const base = Number(exercise.level);
  const modifier =
    step.selectedLayer === 'hard' ? 0.25 : step.selectedLayer === 'easy' ? -0.25 : 0;
  return base + modifier;
}

/**
 * 1. Automatic Time Summation & Apparatus Transition Calculation
 */
export function calculateApparatusTransitionDetail(
  fromStep: SequenceStep,
  toStep: SequenceStep,
  fromStepIndex: number,
  toStepIndex: number,
  exercises: readonly PilatesExercise[],
  humanDrafts?: readonly HumanMovementDraft[],
): ApparatusTransitionDetail {
  const fromExercise = resolveStepExercise(fromStep, exercises, humanDrafts);
  const toExercise = resolveStepExercise(toStep, exercises, humanDrafts);

  const apparatusChanged = Boolean(
    fromExercise && toExercise && fromExercise.apparatus !== toExercise.apparatus,
  );

  const fromEquipmentSig = fromExercise
    ? [...getExerciseEquipment(fromExercise).requiredEquipment].sort().join('|')
    : '';
  const toEquipmentSig = toExercise
    ? [...getExerciseEquipment(toExercise).requiredEquipment].sort().join('|')
    : '';
  const equipmentChanged = Boolean(
    fromExercise && toExercise && (fromEquipmentSig !== toEquipmentSig || apparatusChanged),
  );

  const boxChanged = Boolean(
    fromExercise && toExercise && fromExercise.box !== toExercise.box,
  );

  const fromSpring = fromStep.customSpringOverride || fromExercise?.springs || '';
  const toSpring = toStep.customSpringOverride || toExercise?.springs || '';
  const springChanged = Boolean(fromExercise && toExercise && fromSpring !== toSpring);

  const positionChanged = Boolean(
    fromExercise && toExercise && fromExercise.bodyPosition !== toExercise.bodyPosition,
  );

  let recommendedTransitionSec = 10;
  if (apparatusChanged || equipmentChanged) {
    recommendedTransitionSec = 45;
  } else if (boxChanged) {
    recommendedTransitionSec = 25;
  } else if (springChanged || positionChanged) {
    recommendedTransitionSec = 15;
  }

  const configuredTransitionSec = getStepTiming(toStep, toExercise).transitionSec;

  return {
    fromStepIndex,
    toStepIndex,
    fromExerciseId: fromExercise?.id ?? fromStep.exerciseId,
    toExerciseId: toExercise?.id ?? toStep.exerciseId,
    apparatusChanged,
    equipmentChanged,
    boxChanged,
    springChanged,
    positionChanged,
    recommendedTransitionSec,
    configuredTransitionSec,
  };
}

export function calculateSequenceTimeBreakdown(
  steps: readonly SequenceStep[],
  exercises: readonly PilatesExercise[],
  targetMinutes: number,
  options?: HumanDraftLookupOption,
): SequenceTimeBreakdown {
  const humanDrafts = extractHumanDrafts(options);
  let movementSec = 0;
  let explanationSec = 0;
  let transitionSec = 0;
  let restSec = 0;
  let exerciseSec = 0;

  const sectionDurations: SequenceSectionBreakdown = {
    preparationSec: 0,
    mainSec: 0,
    cooldownSec: 0,
    restSec: 0,
  };

  const transitions: ApparatusTransitionDetail[] = [];
  let prevExerciseStep: SequenceStep | undefined;
  let prevExerciseIndex = -1;

  steps.forEach((step, index) => {
    if (isRestStep(step)) {
      const timing = getStepTiming(step);
      restSec += timing.totalSec;
      sectionDurations.restSec += timing.totalSec;
      return;
    }

    const resolved = resolveMovementForValidation(step, exercises, humanDrafts);
    const exercise = resolved.exercise;
    const timing = getStepTiming(step, exercise);

    movementSec += timing.movementSec;
    explanationSec += timing.explanationSec;
    transitionSec += timing.transitionSec;
    exerciseSec += timing.totalSec;

    const section = resolveStepSectionRole(step, exercise, resolved.matchedDraft);
    if (section === 'preparation') {
      sectionDurations.preparationSec += timing.totalSec;
    } else if (section === 'cooldown') {
      sectionDurations.cooldownSec += timing.totalSec;
    } else {
      sectionDurations.mainSec += timing.totalSec;
    }

    if (prevExerciseStep !== undefined) {
      transitions.push(
        calculateApparatusTransitionDetail(
          prevExerciseStep,
          step,
          prevExerciseIndex,
          index,
          exercises,
          humanDrafts,
        ),
      );
    }

    prevExerciseStep = step;
    prevExerciseIndex = index;
  });

  const totalSec = exerciseSec + restSec;
  const totalMinutes = Number((totalSec / 60).toFixed(2));
  const safeTargetMinutes = Number.isFinite(targetMinutes) ? Math.max(0, targetMinutes) : 0;
  const targetSec = Math.round(safeTargetMinutes * 60);
  const deltaSec = totalSec - targetSec;

  const recommendedAdditionalTransitionSec = transitions.reduce(
    (sum, item) => sum + Math.max(0, item.recommendedTransitionSec - item.configuredTransitionSec),
    0,
  );
  const effectiveTotalWithRecommendedTransitionSec = totalSec + recommendedAdditionalTransitionSec;

  return {
    movementSec,
    explanationSec,
    transitionSec,
    restSec,
    exerciseSec,
    totalSec,
    totalMinutes,
    targetSec,
    targetMinutes: safeTargetMinutes,
    deltaSec,
    recommendedAdditionalTransitionSec,
    effectiveTotalWithRecommendedTransitionSec,
    sectionDurations,
    transitions,
  };
}

function fitStepsFallbackProportional(
  steps: SequenceStep[],
  targetMinutes: number,
): SequenceStep[] {
  const targetSec = Math.max(0, Math.round(targetMinutes * 60));
  const adjustable = steps
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => !step.locked && !isRestStep(step));

  if (adjustable.length === 0) return steps;

  const fixedSec = steps
    .filter((step) => step.locked || isRestStep(step))
    .reduce((sum, step) => sum + getStepTiming(step).totalSec, 0);

  const remainingSec = Math.max(0, targetSec - fixedSec);
  const currentAdjustableTotals = adjustable.map(({ step }) =>
    Math.max(1, getStepTiming(step).totalSec),
  );
  const weightSum = currentAdjustableTotals.reduce((a, b) => a + b, 0);

  const exactShares = currentAdjustableTotals.map((weight, idx) => ({
    idx,
    exact: (remainingSec * weight) / weightSum,
  }));
  const allocated = exactShares.map((item) => Math.floor(item.exact));
  let leftover = remainingSec - allocated.reduce((a, b) => a + b, 0);

  const sortedForRemainder = [...exactShares].sort(
    (a, b) => (b.exact % 1) - (a.exact % 1) || a.idx - b.idx,
  );
  for (const item of sortedForRemainder) {
    if (leftover <= 0) break;
    allocated[item.idx] += 1;
    leftover -= 1;
  }

  const allocatedByStepIndex = new Map<number, number>();
  adjustable.forEach(({ index }, i) => {
    allocatedByStepIndex.set(index, allocated[i]);
  });

  return steps.map((step, index) => {
    const newSec = allocatedByStepIndex.get(index);
    if (newSec === undefined) return step;
    const expSec = Math.max(0, Math.round(step.explanationSec ?? 0));
    const transSec = Math.max(0, Math.round(step.transitionSec ?? 0));
    if (newSec < expSec + transSec) {
      const clampedExp = Math.min(expSec, Math.floor(newSec / 3));
      const clampedTrans = Math.min(transSec, Math.floor(newSec / 3));
      return {
        ...step,
        durationMin: newSec / 60,
        explanationSec: clampedExp,
        transitionSec: clampedTrans,
      };
    }
    return {
      ...step,
      durationMin: newSec / 60,
    };
  });
}

export function applyAutoApparatusTransitions(
  steps: readonly SequenceStep[],
  exercises: readonly PilatesExercise[],
  fitToTargetMinutesOrOptions?:
    | number
    | { fitToTargetMinutes?: number; humanDrafts?: readonly HumanMovementDraft[] }
    | readonly HumanMovementDraft[],
  options?: HumanDraftLookupOption,
): SequenceStep[] {
  const fitToTargetMinutes =
    typeof fitToTargetMinutesOrOptions === 'number'
      ? fitToTargetMinutesOrOptions
      : fitToTargetMinutesOrOptions &&
          !Array.isArray(fitToTargetMinutesOrOptions) &&
          typeof fitToTargetMinutesOrOptions === 'object'
        ? (fitToTargetMinutesOrOptions as { fitToTargetMinutes?: number }).fitToTargetMinutes
        : undefined;

  const humanDrafts =
    extractHumanDrafts(options) ??
    (typeof fitToTargetMinutesOrOptions === 'object'
      ? extractHumanDrafts(fitToTargetMinutesOrOptions as HumanDraftLookupOption)
      : undefined);

  let prevExerciseStep: SequenceStep | undefined;
  let prevExerciseIndex = -1;

  const updated = steps.map((step, index): SequenceStep => {
    if (isRestStep(step)) {
      return { ...step };
    }

    if (step.locked) {
      const cloned = { ...step };
      prevExerciseStep = cloned;
      prevExerciseIndex = index;
      return cloned;
    }

    let nextTransitionSec = 0;
    if (prevExerciseStep !== undefined) {
      const detail = calculateApparatusTransitionDetail(
        prevExerciseStep,
        step,
        prevExerciseIndex,
        index,
        exercises,
        humanDrafts,
      );
      nextTransitionSec = detail.recommendedTransitionSec;
    }

    const explanationSec = Math.max(0, Math.round(step.explanationSec ?? 0));
    const minTotalSec = explanationSec + nextTransitionSec + 30;
    const currentTotalSec = Math.max(0, Math.round(step.durationMin * 60));
    const nextDurationMin =
      currentTotalSec < minTotalSec ? minTotalSec / 60 : step.durationMin;

    const nextStep: SequenceStep = {
      ...step,
      transitionSec: nextTransitionSec,
      durationMin: nextDurationMin,
    };

    prevExerciseStep = nextStep;
    prevExerciseIndex = index;
    return nextStep;
  });

  if (
    fitToTargetMinutes !== undefined &&
    Number.isFinite(fitToTargetMinutes) &&
    fitToTargetMinutes > 0
  ) {
    try {
      return fitSequenceDuration(updated, fitToTargetMinutes);
    } catch {
      return fitStepsFallbackProportional(updated, fitToTargetMinutes);
    }
  }

  return updated;
}

export const applyCalculatedTransitionAllowances = applyAutoApparatusTransitions;

/**
 * 2. Sequence Multi-Rule Validator
 */
export function validateSequenceStructure(
  steps: readonly SequenceStep[],
  exercises: readonly PilatesExercise[],
  options: ValidateSequenceOptions,
): SequenceValidationReport {
  const issues: SequenceValidationIssue[] = [];
  const humanDrafts = options.humanDrafts;
  const timeBreakdown = calculateSequenceTimeBreakdown(steps, exercises, options.targetMinutes, {
    humanDrafts,
  });

  const nonRestEntries: Array<{
    step: SequenceStep;
    stepIndex: number;
    exercise?: PilatesExercise;
    matchedDraft?: HumanMovementDraft;
    isHumanCreated: boolean;
    missingDraftApparatus: boolean;
    missingDraftDuration: boolean;
  }> = [];
  const restEntries: Array<{ step: SequenceStep; stepIndex: number }> = [];

  steps.forEach((step, stepIndex) => {
    if (isRestStep(step)) {
      restEntries.push({ step, stepIndex });
    } else {
      const resolved = resolveMovementForValidation(step, exercises, humanDrafts);
      nonRestEntries.push({
        step,
        stepIndex,
        ...resolved,
      });
    }
  });

  // --- 1. Timing Validation ---
  if (nonRestEntries.length === 0) {
    issues.push({
      code: 'empty-sequence',
      category: 'timing',
      severity: 'error',
      messageKo: '수업 시퀀스에 포함된 동작이 없습니다. 최소 1개 이상의 동작을 추가해 주세요.',
      stepIndices: [],
      fixable: false,
    });
  }

  if (Math.abs(timeBreakdown.deltaSec) >= 1) {
    issues.push({
      code: 'target-duration-mismatch',
      category: 'timing',
      severity: 'error',
      messageKo: `총 수업 시간(${timeBreakdown.totalMinutes}분)이 목표 시간(${timeBreakdown.targetMinutes}분)과 ${Math.abs(timeBreakdown.deltaSec)}초 차이납니다.`,
      stepIndices: nonRestEntries.map((entry) => entry.stepIndex),
      fixable: true,
    });
  }

  const invalidRestIndices = restEntries
    .filter(
      ({ step }) =>
        !Number.isFinite(step.durationMin) ||
        step.durationMin <= 0 ||
        Math.round(step.durationMin * 60) <= 0,
    )
    .map(({ stepIndex }) => stepIndex);

  if (
    invalidRestIndices.length > 0 ||
    (timeBreakdown.targetSec > 0 && timeBreakdown.restSec >= timeBreakdown.targetSec)
  ) {
    issues.push({
      code: 'rest-budget-exceeded',
      category: 'timing',
      severity: 'error',
      messageKo:
        invalidRestIndices.length > 0
          ? '휴식 시간은 0초보다 커야 합니다.'
          : '휴식 시간 합계가 전체 목표 수업 시간 이상입니다. 휴식 시간을 줄여 주세요.',
      stepIndices:
        invalidRestIndices.length > 0
          ? invalidRestIndices
          : restEntries.map((entry) => entry.stepIndex),
      fixable: true,
    });
  }

  const underbudgetedTransitions = timeBreakdown.transitions.filter(
    (transition) => transition.equipmentChanged && transition.configuredTransitionSec < 30,
  );
  if (underbudgetedTransitions.length > 0) {
    issues.push({
      code: 'transition-underbudgeted',
      category: 'timing',
      severity: 'warning',
      messageKo: '기구 전환이 발생하는 구간에 최소 30초 이상의 전환 시간 배정을 권장합니다.',
      stepIndices: [...new Set(underbudgetedTransitions.map((item) => item.toStepIndex))],
      exerciseIds: [...new Set(underbudgetedTransitions.map((item) => item.toExerciseId))],
      fixable: true,
    });
  }

  // --- 1b. Human Draft Metadata Guidance (`draft-readiness`) ---
  const incompleteDraftEntries = nonRestEntries.filter(
    (entry) => entry.missingDraftApparatus || entry.missingDraftDuration,
  );
  if (incompleteDraftEntries.length > 0) {
    const missingDetails = incompleteDraftEntries.map((entry) => {
      const missingParts: string[] = [];
      if (entry.missingDraftApparatus) missingParts.push('기구');
      if (entry.missingDraftDuration) missingParts.push('기본 소요 시간');
      return `${entry.exercise?.nameKo ?? entry.step.exerciseId}(${missingParts.join('·')})`;
    });
    issues.push({
      code: 'draft-metadata-guidance',
      category: 'draft-readiness',
      severity: 'warning',
      messageKo: `강사 생성 동작 초안의 권장 메타데이터[${missingDetails.join(', ')}]가 아직 미입력 상태입니다. 수업 전 또는 진행 중 기구·시간을 확인해 주세요.`,
      stepIndices: incompleteDraftEntries.map((entry) => entry.stepIndex),
      exerciseIds: [
        ...new Set(
          incompleteDraftEntries.map(
            (entry) => entry.matchedDraft?.id ?? entry.exercise?.id ?? entry.step.exerciseId,
          ),
        ),
      ],
      fixable: true,
    });
  }

  // --- 2. Left/Right Pairing & Time Balance (`side-balance`) ---
  let unilateralStepCount = 0;
  let balancedCount = 0;
  const unpairedLeftIds = new Set<string>();
  const unpairedRightIds = new Set<string>();
  const imbalancedExerciseIds = new Set<string>();

  const unilateralSplitGroups = new Map<
    string,
    Array<{ step: SequenceStep; stepIndex: number; exercise: PilatesExercise }>
  >();
  const bilateralMismatchIndices: number[] = [];
  const bilateralMismatchExerciseIds = new Set<string>();

  for (const entry of nonRestEntries) {
    const { step, stepIndex, exercise } = entry;
    if (!exercise || !exercise.isUnilateral) continue;

    unilateralStepCount += 1;

    if (step.sideMode === 'together') {
      bilateralMismatchIndices.push(stepIndex);
      bilateralMismatchExerciseIds.add(exercise.id);
      imbalancedExerciseIds.add(exercise.id);
      continue;
    }

    if (step.sideMode === 'left' || step.sideMode === 'right') {
      const key = getMovementKey(exercise);
      const list = unilateralSplitGroups.get(key) ?? [];
      list.push({ step, stepIndex, exercise });
      unilateralSplitGroups.set(key, list);
      continue;
    }

    // 'left-then-right', 'right-then-left', or default undefined (both sides included)
    balancedCount += 1;
  }

  if (bilateralMismatchIndices.length > 0) {
    issues.push({
      code: 'unilateral-bilateral-mode-mismatch',
      category: 'side-balance',
      severity: 'warning',
      messageKo: '편측(Unilateral) 동작이 양쪽 동시 수행(together)으로 설정되어 있습니다.',
      stepIndices: bilateralMismatchIndices,
      exerciseIds: [...bilateralMismatchExerciseIds],
      fixable: true,
    });
  }

  for (const [, group] of unilateralSplitGroups) {
    const leftItems = group.filter((item) => item.step.sideMode === 'left');
    const rightItems = group.filter((item) => item.step.sideMode === 'right');
    const groupIndices = group.map((item) => item.stepIndex);
    const groupExerciseIds = [...new Set(group.map((item) => item.exercise.id))];

    if (leftItems.length !== rightItems.length) {
      if (leftItems.length > rightItems.length) {
        groupExerciseIds.forEach((id) => unpairedLeftIds.add(id));
      } else {
        groupExerciseIds.forEach((id) => unpairedRightIds.add(id));
      }
      groupExerciseIds.forEach((id) => imbalancedExerciseIds.add(id));

      issues.push({
        code: 'unilateral-missing-pair',
        category: 'side-balance',
        severity: 'error',
        messageKo:
          '편측 동작의 왼쪽/오른쪽 짝이 맞지 않습니다. 반대쪽 스텝을 추가하거나 양쪽 순차 모드로 변경해 주세요.',
        stepIndices: groupIndices,
        exerciseIds: groupExerciseIds,
        fixable: true,
      });
      continue;
    }

    const leftMovementSec = leftItems.reduce(
      (sum, item) => sum + getStepTiming(item.step, item.exercise).movementSec,
      0,
    );
    const rightMovementSec = rightItems.reduce(
      (sum, item) => sum + getStepTiming(item.step, item.exercise).movementSec,
      0,
    );

    let groupBalanced = true;

    if (Math.abs(leftMovementSec - rightMovementSec) > 1) {
      groupBalanced = false;
      groupExerciseIds.forEach((id) => imbalancedExerciseIds.add(id));
      issues.push({
        code: 'unilateral-duration-imbalance',
        category: 'side-balance',
        severity: 'error',
        messageKo: `편측 동작의 좌우 수행 시간이 불균형합니다 (왼쪽 ${leftMovementSec}초 vs 오른쪽 ${rightMovementSec}초).`,
        stepIndices: groupIndices,
        exerciseIds: groupExerciseIds,
        fixable: true,
      });
    }

    const hasRepsOrSetsImbalance = leftItems.some((leftItem, idx) => {
      const rightItem = rightItems[idx];
      if (!rightItem) return true;
      return (
        leftItem.step.repetitions !== rightItem.step.repetitions ||
        leftItem.step.sets !== rightItem.step.sets
      );
    });

    if (hasRepsOrSetsImbalance) {
      groupBalanced = false;
      groupExerciseIds.forEach((id) => imbalancedExerciseIds.add(id));
      issues.push({
        code: 'unilateral-reps-imbalance',
        category: 'side-balance',
        severity: 'warning',
        messageKo: '편측 동작의 좌우 횟수(Reps) 또는 세트(Sets) 설정이 서로 다릅니다.',
        stepIndices: groupIndices,
        exerciseIds: groupExerciseIds,
        fixable: true,
      });
    }

    if (groupBalanced) {
      balancedCount += group.length;
    }
  }

  // --- 3. General Difficulty Flow (`difficulty-flow`) ---
  const prepEntries: typeof nonRestEntries = [];
  const mainEntries: typeof nonRestEntries = [];
  const cooldownEntries: typeof nonRestEntries = [];

  let maxSectionRankSeen = -1;
  const invertedSectionIndices: number[] = [];

  for (const entry of nonRestEntries) {
    const role = resolveStepSectionRole(entry.step, entry.exercise, entry.matchedDraft);
    const rank = sectionRank(role);
    if (rank < maxSectionRankSeen) {
      invertedSectionIndices.push(entry.stepIndex);
    } else {
      maxSectionRankSeen = rank;
    }

    if (role === 'preparation') prepEntries.push(entry);
    else if (role === 'cooldown') cooldownEntries.push(entry);
    else mainEntries.push(entry);
  }

  const hasPreparation = prepEntries.length > 0;
  const hasMain = mainEntries.length > 0;
  const hasCooldown = cooldownEntries.length > 0;
  const sectionOrderValid = invertedSectionIndices.length === 0;

  if (nonRestEntries.length >= 3 && !hasPreparation) {
    issues.push({
      code: 'missing-preparation',
      category: 'difficulty-flow',
      severity: 'warning',
      messageKo: '수업 도입부(Preparation / 워밍업) 구간이 없습니다.',
      stepIndices: nonRestEntries.map((e) => e.stepIndex),
      fixable: true,
    });
  }

  if (nonRestEntries.length >= 3 && !hasCooldown) {
    issues.push({
      code: 'missing-cooldown',
      category: 'difficulty-flow',
      severity: 'warning',
      messageKo: '수업 마무리(Cooldown / 쿨다운) 구간이 없습니다.',
      stepIndices: nonRestEntries.map((e) => e.stepIndex),
      fixable: true,
    });
  }

  if (!sectionOrderValid) {
    issues.push({
      code: 'section-order-inverted',
      category: 'difficulty-flow',
      severity: 'warning',
      messageKo: '수업 구간 순서(도입 → 메인 → 마무리)가 뒤섞여 있습니다.',
      stepIndices: invertedSectionIndices,
      fixable: true,
    });
  }

  const levelExceededEntries = nonRestEntries.filter(
    (entry) => entry.exercise && Number(entry.exercise.level) > Number(options.level),
  );
  if (levelExceededEntries.length > 0) {
    issues.push({
      code: 'level-exceeds-target',
      category: 'difficulty-flow',
      severity: 'error',
      messageKo: `목표 수업 난이도(Lv.${options.level})를 초과하는 동작이 포함되어 있습니다.`,
      stepIndices: levelExceededEntries.map((e) => e.stepIndex),
      exerciseIds: [...new Set(levelExceededEntries.map((e) => e.exercise!.id))],
      fixable: true,
    });
  }

  type ScoredNonRestEntry = (typeof nonRestEntries)[number] & { exercise: PilatesExercise };

  const avgScoreFor = (entries: typeof nonRestEntries): number => {
    const scored = entries.filter((e): e is ScoredNonRestEntry => Boolean(e.exercise));
    if (scored.length === 0) return 0;
    const sum = scored.reduce(
      (acc, item) => acc + computeStepDifficultyScore(item.step, item.exercise),
      0,
    );
    return Number((sum / scored.length).toFixed(2));
  };

  const preparationAvgScore = avgScoreFor(prepEntries);
  const mainAvgScore = avgScoreFor(mainEntries);
  const cooldownAvgScore = avgScoreFor(cooldownEntries);

  if (hasPreparation && hasMain && preparationAvgScore > mainAvgScore + 0.1) {
    issues.push({
      code: 'warmup-difficulty-spike',
      category: 'difficulty-flow',
      severity: 'warning',
      messageKo: '워밍업(도입) 구간의 평균 난이도가 메인 구간보다 높습니다.',
      stepIndices: prepEntries.map((e) => e.stepIndex),
      exerciseIds: prepEntries.filter((e) => e.exercise).map((e) => e.exercise!.id),
      fixable: true,
    });
  }

  if (hasCooldown && hasMain && cooldownAvgScore > mainAvgScore + 0.1) {
    issues.push({
      code: 'cooldown-difficulty-high',
      category: 'difficulty-flow',
      severity: 'warning',
      messageKo: '쿨다운(마무리) 구간의 평균 난이도가 메인 구간보다 높습니다.',
      stepIndices: cooldownEntries.map((e) => e.stepIndex),
      exerciseIds: cooldownEntries.filter((e) => e.exercise).map((e) => e.exercise!.id),
      fixable: true,
    });
  }

  const abruptJumpIndices = new Set<number>();
  const abruptJumpExerciseIds = new Set<string>();
  const scoredNonRest = nonRestEntries.filter(
    (entry): entry is (typeof nonRestEntries)[number] & { exercise: PilatesExercise } =>
      Boolean(entry.exercise),
  );
  for (let i = 1; i < scoredNonRest.length; i++) {
    const prev = scoredNonRest[i - 1];
    const curr = scoredNonRest[i];
    const prevScore = computeStepDifficultyScore(prev.step, prev.exercise);
    const currScore = computeStepDifficultyScore(curr.step, curr.exercise);
    if (Math.abs(currScore - prevScore) >= 1.0) {
      abruptJumpIndices.add(prev.stepIndex);
      abruptJumpIndices.add(curr.stepIndex);
      abruptJumpExerciseIds.add(prev.exercise.id);
      abruptJumpExerciseIds.add(curr.exercise.id);
    }
  }
  if (abruptJumpIndices.size > 0) {
    issues.push({
      code: 'abrupt-level-jump',
      category: 'difficulty-flow',
      severity: 'warning',
      messageKo: '연속된 동작 간 난이도 급변(1.0 이상 차이)이 감지되었습니다.',
      stepIndices: [...abruptJumpIndices].sort((a, b) => a - b),
      exerciseIds: [...abruptJumpExerciseIds],
      fixable: true,
    });
  }

  // --- 4. Duplicate Movements (`duplicate`) ---
  const movementGroups = new Map<
    string,
    Array<(typeof scoredNonRest)[number]>
  >();
  for (const entry of scoredNonRest) {
    const key = getMovementKey(entry.exercise);
    const list = movementGroups.get(key) ?? [];
    list.push(entry);
    movementGroups.set(key, list);
  }

  const duplicateExerciseIds = new Set<string>();
  for (const [, group] of movementGroups) {
    if (group.length <= 1) continue;
    const isComplementaryUnilateralPair =
      group.length === 2 &&
      group.every((item) => item.exercise.isUnilateral) &&
      ((group[0].step.sideMode === 'left' && group[1].step.sideMode === 'right') ||
        (group[0].step.sideMode === 'right' && group[1].step.sideMode === 'left'));

    if (!isComplementaryUnilateralPair) {
      const groupExerciseIds = [...new Set(group.map((item) => item.exercise.id))];
      groupExerciseIds.forEach((id) => duplicateExerciseIds.add(id));
      issues.push({
        code: 'duplicate-movement',
        category: 'duplicate',
        severity: 'error',
        messageKo: '동일한 동작(또는 기구 변형 동작)이 시퀀스 내에 중복 배치되어 있습니다.',
        stepIndices: group.map((item) => item.stepIndex),
        exerciseIds: groupExerciseIds,
        fixable: true,
      });
    }
  }

  // --- 5. Selected Equipment & Constraints (`equipment-constraint` & `personal-constraint`) ---
  // CRITICAL RULE: Never flag a human-created movement draft as 'unknown-exercise'
  const unknownEntries = nonRestEntries.filter(
    (entry) => !entry.exercise && !entry.isHumanCreated,
  );
  if (unknownEntries.length > 0) {
    issues.push({
      code: 'unknown-exercise',
      category: 'equipment-constraint',
      severity: 'error',
      messageKo: '카탈로그에서 찾을 수 없는 미등록 동작이 포함되어 있습니다.',
      stepIndices: unknownEntries.map((e) => e.stepIndex),
      exerciseIds: [...new Set(unknownEntries.map((e) => e.step.exerciseId).filter(Boolean))],
      fixable: false,
    });
  }

  const effectiveEquipment: readonly string[] =
    options.availableEquipment && options.ownedEquipment
      ? options.availableEquipment.filter((id) => options.ownedEquipment!.includes(id))
      : (options.availableEquipment ?? options.ownedEquipment ?? EQUIPMENT_IDS);

  const effectiveProps: readonly PropType[] =
    options.preferredProps && options.ownedProps
      ? options.preferredProps.filter((prop) => options.ownedProps!.includes(prop))
      : (options.preferredProps ?? options.ownedProps ?? PROP_IDS);

  const equipmentMismatchIndices: number[] = [];
  const equipmentMismatchExerciseIds = new Set<string>();
  const violatedEquipmentSet = new Set<string>();

  const propMismatchIndices: number[] = [];
  const propMismatchExerciseIds = new Set<string>();

  for (const entry of scoredNonRest) {
    // If a human draft did not specify apparatus yet, it already receives draft-metadata-guidance warning
    if (entry.missingDraftApparatus && !entry.matchedDraft?.requiredEquipment?.length) {
      continue;
    }

    const availability = getExerciseAvailability(
      entry.exercise,
      effectiveEquipment,
      effectiveProps,
    );

    if (!availability.requirementsKnown || availability.missingEquipment.length > 0) {
      equipmentMismatchIndices.push(entry.stepIndex);
      equipmentMismatchExerciseIds.add(entry.exercise.id);
      if (availability.missingEquipment.length > 0) {
        availability.missingEquipment.forEach((id) => violatedEquipmentSet.add(id));
      } else {
        violatedEquipmentSet.add(entry.exercise.apparatus);
      }
    }

    if (availability.missingProps.length > 0) {
      propMismatchIndices.push(entry.stepIndex);
      propMismatchExerciseIds.add(entry.exercise.id);
    }
  }

  if (equipmentMismatchIndices.length > 0) {
    issues.push({
      code: 'equipment-mismatch',
      category: 'equipment-constraint',
      severity: 'error',
      messageKo: '선택하거나 보유한 기구 조건에 맞지 않는 동작이 포함되어 있습니다.',
      stepIndices: equipmentMismatchIndices,
      exerciseIds: [...equipmentMismatchExerciseIds],
      fixable: true,
    });
  }

  if (propMismatchIndices.length > 0) {
    issues.push({
      code: 'prop-mismatch',
      category: 'equipment-constraint',
      severity: 'error',
      messageKo: '사용 가능한 소도구 목록에 없는 소도구가 필요한 동작이 포함되어 있습니다.',
      stepIndices: propMismatchIndices,
      exerciseIds: [...propMismatchExerciseIds],
      fixable: true,
    });
  }

  if (
    options.availableEquipment &&
    options.availableEquipment.length >= 2 &&
    scoredNonRest.length > 0
  ) {
    const usedEquipment = new Set(
      scoredNonRest.flatMap((entry) => getExerciseEquipment(entry.exercise).requiredEquipment),
    );
    const unusedEquipment = options.availableEquipment.filter((id) => !usedEquipment.has(id));
    if (unusedEquipment.length > 0) {
      unusedEquipment.forEach((id) => violatedEquipmentSet.add(id));
      issues.push({
        code: 'equipment-coverage-missing',
        category: 'equipment-constraint',
        severity: 'warning',
        messageKo: `선택한 기구 중 시퀀스에 사용되지 않은 기구(${unusedEquipment.join(', ')})가 있습니다.`,
        stepIndices: [],
        fixable: true,
      });
    }
  }

  if (options.localConstraints) {
    const {
      avoidSpinalPlanes = [],
      avoidBodyPositions = [],
      precautionKeywords = [],
      maxLevel,
    } = options.localConstraints;

    const precautionStepIndices: number[] = [];
    const precautionExerciseIds = new Set<string>();

    for (const entry of scoredNonRest) {
      const { exercise, stepIndex } = entry;
      const planeHit = avoidSpinalPlanes.some((plane) => exercise.spinalPlanes.includes(plane));
      const positionHit = avoidBodyPositions.includes(exercise.bodyPosition);
      const keywordHit = precautionKeywords.some((keyword) => {
        const trimmed = keyword.trim().toLowerCase();
        if (!trimmed) return false;
        const searchable = [
          exercise.precautions,
          ...exercise.cues,
          exercise.nameKo,
          exercise.nameEn,
        ]
          .join(' ')
          .toLowerCase();
        return searchable.includes(trimmed);
      });
      const maxLevelHit =
        maxLevel !== undefined && Number(exercise.level) > Number(maxLevel);

      if (planeHit || positionHit || keywordHit || maxLevelHit) {
        precautionStepIndices.push(stepIndex);
        precautionExerciseIds.add(exercise.id);
      }
    }

    if (precautionStepIndices.length > 0) {
      issues.push({
        code: 'local-precaution-warning',
        category: 'personal-constraint',
        severity: 'warning',
        messageKo:
          '강사가 설정한 개인 주의사항(체위·척추면·금기 키워드·난이도)에 해당하는 동작이 있습니다.',
        stepIndices: precautionStepIndices,
        exerciseIds: [...precautionExerciseIds],
        fixable: true,
      });
    }
  }

  const hasError = issues.some((issue) => issue.severity === 'error');

  return {
    valid: !hasError,
    canConfirmClass: !hasError,
    timeBreakdown,
    issues,
    sideBalanceSummary: {
      unilateralStepCount,
      balancedCount,
      unpairedLeftIds: [...unpairedLeftIds],
      unpairedRightIds: [...unpairedRightIds],
      imbalancedExerciseIds: [...imbalancedExerciseIds],
    },
    difficultyFlowSummary: {
      hasPreparation,
      hasMain,
      hasCooldown,
      sectionOrderValid,
      preparationAvgScore,
      mainAvgScore,
      cooldownAvgScore,
    },
    duplicateExerciseIds: [...duplicateExerciseIds],
    violatedEquipmentIds: [...violatedEquipmentSet],
  };
}

export const validateSequenceHierarchy = validateSequenceStructure;

/**
 * 3. Instructor Fix Helpers
 */
function equalizePairSteps(
  leftStep: SequenceStep,
  rightStep: SequenceStep,
): [SequenceStep, SequenceStep] {
  if (leftStep.locked && rightStep.locked) {
    return [leftStep, rightStep];
  }

  if (leftStep.locked) {
    return [
      leftStep,
      {
        ...rightStep,
        durationMin: leftStep.durationMin,
        explanationSec: leftStep.explanationSec,
        transitionSec: leftStep.transitionSec,
        repetitions: leftStep.repetitions,
        sets: leftStep.sets,
      },
    ];
  }

  if (rightStep.locked) {
    return [
      {
        ...leftStep,
        durationMin: rightStep.durationMin,
        explanationSec: rightStep.explanationSec,
        transitionSec: rightStep.transitionSec,
        repetitions: rightStep.repetitions,
        sets: rightStep.sets,
      },
      rightStep,
    ];
  }

  const avgDurationSec = Math.round(
    ((leftStep.durationMin + rightStep.durationMin) / 2) * 60,
  );
  const equalDurationMin = Math.max(30, avgDurationSec) / 60;
  const hasExp = leftStep.explanationSec !== undefined || rightStep.explanationSec !== undefined;
  const avgExp = hasExp
    ? Math.round(((leftStep.explanationSec ?? 0) + (rightStep.explanationSec ?? 0)) / 2)
    : undefined;
  const hasTrans = leftStep.transitionSec !== undefined || rightStep.transitionSec !== undefined;
  const avgTrans = hasTrans
    ? Math.round(((leftStep.transitionSec ?? 0) + (rightStep.transitionSec ?? 0)) / 2)
    : undefined;

  const equalReps =
    leftStep.repetitions !== undefined || rightStep.repetitions !== undefined
      ? Math.max(leftStep.repetitions ?? 0, rightStep.repetitions ?? 0)
      : undefined;
  const equalSets =
    leftStep.sets !== undefined || rightStep.sets !== undefined
      ? Math.max(leftStep.sets ?? 0, rightStep.sets ?? 0)
      : undefined;

  return [
    {
      ...leftStep,
      durationMin: equalDurationMin,
      ...(avgExp !== undefined ? { explanationSec: avgExp } : {}),
      ...(avgTrans !== undefined ? { transitionSec: avgTrans } : {}),
      repetitions: equalReps,
      sets: equalSets,
    },
    {
      ...rightStep,
      durationMin: equalDurationMin,
      ...(avgExp !== undefined ? { explanationSec: avgExp } : {}),
      ...(avgTrans !== undefined ? { transitionSec: avgTrans } : {}),
      repetitions: equalReps,
      sets: equalSets,
    },
  ];
}

export function balanceSequenceSides(
  steps: readonly SequenceStep[],
  exercises: readonly PilatesExercise[],
  options?: HumanDraftLookupOption,
): SequenceStep[] {
  const humanDrafts = extractHumanDrafts(options);
  const working = steps.map((step) => ({ ...step }));

  // Step 1: Convert `sideMode === 'together'` on unlocked unilateral exercises to `'left-then-right'`
  for (let i = 0; i < working.length; i++) {
    const step = working[i];
    if (isRestStep(step) || step.locked) continue;
    const exercise = resolveStepExercise(step, exercises, humanDrafts);
    if (exercise?.isUnilateral && step.sideMode === 'together') {
      working[i] = {
        ...step,
        sideMode: 'left-then-right',
      };
    }
  }

  // Step 2: Group split ('left' | 'right') unilateral steps by movement key
  const groups = new Map<string, number[]>();
  working.forEach((step, idx) => {
    if (isRestStep(step)) return;
    const exercise = resolveStepExercise(step, exercises, humanDrafts);
    if (!exercise?.isUnilateral) return;
    if (step.sideMode === 'left' || step.sideMode === 'right') {
      const key = getMovementKey(exercise);
      const indices = groups.get(key) ?? [];
      indices.push(idx);
      groups.set(key, indices);
    }
  });

  const insertionsAfter = new Map<number, SequenceStep[]>();

  for (const [, indices] of groups) {
    const leftIndices = indices.filter((i) => working[i].sideMode === 'left');
    const rightIndices = indices.filter((i) => working[i].sideMode === 'right');

    // If there are two steps of the same side (e.g. left + left) and one is unlocked, flip it
    while (leftIndices.length - rightIndices.length >= 2) {
      const flipCandidateIdx = [...leftIndices].reverse().find((i) => !working[i].locked);
      if (flipCandidateIdx === undefined) break;
      working[flipCandidateIdx] = { ...working[flipCandidateIdx], sideMode: 'right' };
      leftIndices.splice(leftIndices.indexOf(flipCandidateIdx), 1);
      rightIndices.push(flipCandidateIdx);
    }
    while (rightIndices.length - leftIndices.length >= 2) {
      const flipCandidateIdx = [...rightIndices].reverse().find((i) => !working[i].locked);
      if (flipCandidateIdx === undefined) break;
      working[flipCandidateIdx] = { ...working[flipCandidateIdx], sideMode: 'left' };
      rightIndices.splice(rightIndices.indexOf(flipCandidateIdx), 1);
      leftIndices.push(flipCandidateIdx);
    }

    const pairCount = Math.min(leftIndices.length, rightIndices.length);
    for (let p = 0; p < pairCount; p++) {
      const lIdx = leftIndices[p];
      const rIdx = rightIndices[p];
      const [eqLeft, eqRight] = equalizePairSteps(working[lIdx], working[rIdx]);
      working[lIdx] = eqLeft;
      working[rIdx] = eqRight;
    }

    // Handle any remaining unpaired steps
    const unpairedIndices = [
      ...leftIndices.slice(pairCount),
      ...rightIndices.slice(pairCount),
    ];
    for (const uIdx of unpairedIndices) {
      const step = working[uIdx];
      if (!step.locked) {
        working[uIdx] = {
          ...step,
          sideMode: 'left-then-right',
        };
      } else {
        const oppositeSide = step.sideMode === 'left' ? 'right' : 'left';
        const partner: SequenceStep = {
          ...step,
          stepId: `${step.stepId}-pair-${oppositeSide}`,
          sideMode: oppositeSide,
          locked: false,
        };
        const list = insertionsAfter.get(uIdx) ?? [];
        list.push(partner);
        insertionsAfter.set(uIdx, list);
      }
    }
  }

  const finalSteps: SequenceStep[] = [];
  working.forEach((step, idx) => {
    finalSteps.push(step);
    const extras = insertionsAfter.get(idx);
    if (extras) {
      finalSteps.push(...extras);
    }
  });

  return finalSteps.map((step, idx) => ({
    ...step,
    order: idx + 1,
  }));
}

export const balanceSequenceUnilateralSides = balanceSequenceSides;

export function normalizeSequenceDifficultyFlow(
  steps: readonly SequenceStep[],
  exercises: readonly PilatesExercise[],
  options?: HumanDraftLookupOption,
): SequenceStep[] {
  const humanDrafts = extractHumanDrafts(options);
  const cloned = steps.map((step) => ({ ...step }));

  // Collect unlocked non-rest steps and sort them stably by section role (preparation -> main -> cooldown)
  const unlockedExerciseIndices: number[] = [];
  const unlockedExerciseSteps: Array<{
    step: SequenceStep;
    originalOrder: number;
    rank: number;
  }> = [];

  cloned.forEach((step, idx) => {
    if (isRestStep(step) || step.locked) return;
    const resolved = resolveMovementForValidation(step, exercises, humanDrafts);
    const role = resolveStepSectionRole(step, resolved.exercise, resolved.matchedDraft);
    unlockedExerciseIndices.push(idx);
    unlockedExerciseSteps.push({
      step,
      originalOrder: idx,
      rank: sectionRank(role),
    });
  });

  unlockedExerciseSteps.sort(
    (a, b) => a.rank - b.rank || a.originalOrder - b.originalOrder,
  );

  unlockedExerciseIndices.forEach((targetIdx, i) => {
    cloned[targetIdx] = unlockedExerciseSteps[i].step;
  });

  // Ensure preparation and cooldown exist if >= 3 non-rest steps
  const nonRestIndices = cloned
    .map((step, idx) => (isRestStep(step) ? -1 : idx))
    .filter((idx) => idx >= 0);

  if (nonRestIndices.length >= 3) {
    const roles = nonRestIndices.map((idx) => {
      const resolved = resolveMovementForValidation(cloned[idx], exercises, humanDrafts);
      return resolveStepSectionRole(cloned[idx], resolved.exercise, resolved.matchedDraft);
    });
    if (!roles.includes('preparation')) {
      const firstUnlockedIdx = nonRestIndices.find((idx) => !cloned[idx].locked);
      if (firstUnlockedIdx !== undefined) {
        cloned[firstUnlockedIdx] = {
          ...cloned[firstUnlockedIdx],
          classSection: 'preparation',
        };
      }
    }
    if (!roles.includes('cooldown')) {
      const lastUnlockedIdx = [...nonRestIndices].reverse().find((idx) => !cloned[idx].locked);
      if (lastUnlockedIdx !== undefined) {
        cloned[lastUnlockedIdx] = {
          ...cloned[lastUnlockedIdx],
          classSection: 'cooldown',
        };
      }
    }
  }

  // Calculate main section average score
  const getSectionEntries = (targetRole: ClassSectionRole) =>
    nonRestIndices
      .map((idx) => {
        const resolved = resolveMovementForValidation(cloned[idx], exercises, humanDrafts);
        return {
          idx,
          step: cloned[idx],
          exercise: resolved.exercise,
          matchedDraft: resolved.matchedDraft,
        };
      })
      .filter(
        (
          item,
        ): item is {
          idx: number;
          step: SequenceStep;
          exercise: PilatesExercise;
          matchedDraft: HumanMovementDraft | undefined;
        } =>
          Boolean(item.exercise) &&
          resolveStepSectionRole(item.step, item.exercise, item.matchedDraft) === targetRole,
      );

  const avgScore = (
    items: Array<{ idx: number; step: SequenceStep; exercise: PilatesExercise }>,
  ) =>
    items.length === 0
      ? 0
      : items.reduce((sum, item) => sum + computeStepDifficultyScore(item.step, item.exercise), 0) /
        items.length;

  const mainItems = getSectionEntries('main');
  const mainAvg = avgScore(mainItems);

  const softenSectionIfSpiking = (targetRole: 'preparation' | 'cooldown') => {
    let sectionItems = getSectionEntries(targetRole);
    if (sectionItems.length === 0 || mainItems.length === 0) return;

    if (avgScore(sectionItems) > mainAvg + 0.1) {
      for (const item of sectionItems) {
        if (!item.step.locked && item.step.selectedLayer === 'hard') {
          cloned[item.idx] = { ...cloned[item.idx], selectedLayer: 'standard' };
        }
      }
      sectionItems = getSectionEntries(targetRole);
    }

    if (avgScore(sectionItems) > mainAvg + 0.1) {
      for (const item of sectionItems) {
        if (!item.step.locked && item.step.selectedLayer !== 'easy') {
          cloned[item.idx] = { ...cloned[item.idx], selectedLayer: 'easy' };
        }
      }
    }
  };

  softenSectionIfSpiking('preparation');
  softenSectionIfSpiking('cooldown');

  return cloned.map((step, idx) => ({
    ...step,
    order: idx + 1,
  }));
}

export function mergeSplitUnilateralPairsForRehearsal(
  steps: readonly SequenceStep[],
  exercises: readonly PilatesExercise[],
  options?: HumanDraftLookupOption,
): SequenceStep[] {
  const humanDrafts = extractHumanDrafts(options);
  const working = steps.map((step) => ({ ...step }));
  const consumedIndices = new Set<number>();
  const mergedResult: SequenceStep[] = [];

  for (let i = 0; i < working.length; i++) {
    if (consumedIndices.has(i)) continue;
    const step = working[i];
    if (isRestStep(step)) {
      mergedResult.push(step);
      continue;
    }

    const exercise = resolveStepExercise(step, exercises, humanDrafts);
    if (
      !exercise ||
      !exercise.isUnilateral ||
      (step.sideMode !== 'left' && step.sideMode !== 'right')
    ) {
      mergedResult.push(step);
      continue;
    }

    const targetOppositeSide = step.sideMode === 'left' ? 'right' : 'left';
    const key = getMovementKey(exercise);

    let partnerIndex = -1;
    for (let j = i + 1; j < working.length; j++) {
      if (consumedIndices.has(j)) continue;
      const candidate = working[j];
      if (isRestStep(candidate) || candidate.sideMode !== targetOppositeSide) continue;
      const candidateEx = resolveStepExercise(candidate, exercises, humanDrafts);
      if (candidateEx && candidateEx.isUnilateral && getMovementKey(candidateEx) === key) {
        partnerIndex = j;
        break;
      }
    }

    if (partnerIndex === -1) {
      mergedResult.push(step);
      continue;
    }

    consumedIndices.add(partnerIndex);
    const partner = working[partnerIndex];
    const partnerEx = resolveStepExercise(partner, exercises, humanDrafts);

    const firstTiming = getStepTiming(step, exercise);
    const secondTiming = getStepTiming(partner, partnerEx);
    const combinedTotalSec = firstTiming.totalSec + secondTiming.totalSec;
    const combinedExplanationSec = firstTiming.explanationSec + secondTiming.explanationSec;
    const combinedTransitionSec = firstTiming.transitionSec + secondTiming.transitionSec;

    mergedResult.push({
      ...step,
      durationMin: combinedTotalSec / 60,
      explanationSec: combinedExplanationSec,
      transitionSec: combinedTransitionSec,
      sideMode: 'left-then-right',
      repetitions: step.repetitions ?? partner.repetitions,
      sets: step.sets ?? partner.sets,
    });
  }

  return mergedResult.map((step, idx) => ({
    ...step,
    order: idx + 1,
  }));
}
