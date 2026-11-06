import { INITIAL_EXERCISES } from '../../data/pilatesCatalog';
import type { HierarchyPilatesExercise } from '../../types/hierarchy';
import type { PilatesExercise, SequenceStep } from '../../types/pilates';
import { buildPlanInsights } from '../../utils/classInsights';
import {
  formatSecondsToMMSS,
  getSequenceDurations,
  getStepTiming,
  isRestStep,
} from '../../utils/sequenceEngine';
import {
  calculateApparatusTransitionDetail,
  calculateSequenceTimeBreakdown,
} from '../../utils/sequenceValidation';
import {
  adaptClassPlanForReview,
  adaptSequenceStepsForReview,
} from './classPlanReviewAdapter';
import {
  CLASS_PLAN_REVIEW_LIMITS,
  DEFAULT_CLASS_PLAN_REVIEW_BOUNDARY,
  type ClassPlanLateralityReviewSummary,
  type ClassPlanReviewIssue,
  type ClassPlanReviewIssueCategory,
  type ClassPlanReviewIssueCode,
  type ClassPlanReviewIssueSeverity,
  type ClassPlanReviewOptions,
  type ClassPlanReviewReport,
  type ClassPlanTimeReviewSummary,
  type ExistingUtilityParityCheck,
  type LateralityMovementGroupComparison,
  type NormalizedClassReviewItem,
  type NormalizedClassReviewPlan,
} from './classPlanReviewTypes';

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (seen.has(value)) {
    return value;
  }
  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      deepFreeze(item, seen);
    }
    return Object.freeze(value);
  }

  for (const key of Object.keys(value as Record<string, unknown>)) {
    const child = (value as Record<string, unknown>)[key];
    if (child !== null && typeof child === 'object') {
      deepFreeze(child, seen);
    }
  }
  return Object.freeze(value);
}

/**
 * Formats seconds into easy-to-read Korean duration text (e.g. `50분`, `4분 30초`, `45초`).
 * Returns `'시간 미정'` when seconds is `null`, `undefined`, or non-finite.
 */
export function formatReviewDurationKo(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || typeof seconds !== 'number' || !Number.isFinite(seconds)) {
    return '시간 미정';
  }
  const sign = seconds < 0 ? '-' : '';
  const absSec = Math.round(Math.abs(seconds));
  if (absSec === 0) {
    return '0초';
  }
  const mins = Math.floor(absSec / 60);
  const remSec = absSec % 60;
  if (mins > 0 && remSec > 0) {
    return `${sign}${mins}분 ${remSec}초`;
  }
  if (mins > 0) {
    return `${sign}${mins}분`;
  }
  return `${sign}${remSec}초`;
}

function buildSyntheticStepFromReviewItem(item: NormalizedClassReviewItem): SequenceStep {
  const durationMin =
    item.durationStatus === 'known' && item.knownTotalSec !== null
      ? item.knownTotalSec / 60
      : 0;

  return {
    kind: item.kind,
    stepId: item.itemId,
    order: item.order,
    blockCategory: item.blockCategory ?? 'core',
    exerciseId: item.exerciseId ?? '',
    durationMin,
    explanationSec: item.knownExplanationSec ?? 0,
    transitionSec: item.knownTransitionSec ?? 0,
    repetitions: item.repetitions ?? undefined,
    sets: item.sets ?? undefined,
    sideMode: item.sideMode,
    selectedLayer: 'standard',
    classSection: item.sectionRole,
    humanDraftId: item.humanDraftId,
    blockInstanceId: item.blockInstanceId,
    sourceBlockId: item.sourceBlockId,
    sourceBlockTitle: item.sourceBlockTitle,
  };
}

function resolveTargetConfig(
  plan: NormalizedClassReviewPlan,
  options?: ClassPlanReviewOptions,
): {
  targetMinutes: number | null;
  targetDurationStatus: 'known' | 'unspecified' | 'invalid';
} {
  if (options && 'targetMinutes' in options && options.targetMinutes !== undefined) {
    const raw = options.targetMinutes;
    if (raw === null) {
      return { targetMinutes: null, targetDurationStatus: 'unspecified' };
    }
    if (
      typeof raw === 'number' &&
      Number.isFinite(raw) &&
      raw >= CLASS_PLAN_REVIEW_LIMITS.MIN_TARGET_MINUTES &&
      raw <= CLASS_PLAN_REVIEW_LIMITS.MAX_TARGET_MINUTES &&
      Math.round(raw * 60) > 0
    ) {
      return { targetMinutes: raw, targetDurationStatus: 'known' };
    }
    return { targetMinutes: null, targetDurationStatus: 'invalid' };
  }
  return {
    targetMinutes: plan.targetMinutes,
    targetDurationStatus: plan.targetDurationStatus,
  };
}

/**
 * Verifies parity between the class plan review engine and existing read-only sequence utilities
 * (`getStepTiming`, `getSequenceDurations`, `calculateSequenceTimeBreakdown`, `buildPlanInsights`).
 */
export function checkExistingUtilityParity(
  steps: readonly SequenceStep[],
  exercises: readonly PilatesExercise[],
  targetMinutes?: number,
): ExistingUtilityParityCheck {
  const safeExercises = Array.isArray(exercises) ? exercises : INITIAL_EXERCISES;
  const exerciseMap = new Map<string, PilatesExercise>(
    safeExercises.map((ex) => [ex.id, ex]),
  );

  const normalized = adaptSequenceStepsForReview(steps, {
    exercises: safeExercises,
    targetMinutes,
  });

  // 1. Check step-by-step timing against getStepTiming
  let stepTimingMatches = normalized.items.length === steps.length;
  if (stepTimingMatches) {
    for (let i = 0; i < steps.length; i += 1) {
      const step = steps[i];
      const item = normalized.items[i];
      const exercise = isRestStep(step) ? undefined : exerciseMap.get(step.exerciseId);
      const expected = getStepTiming(step, exercise);

      if (item.durationStatus !== 'known' || item.knownTotalSec !== expected.totalSec) {
        stepTimingMatches = false;
        break;
      }

      if (isRestStep(step)) {
        if (item.knownRestSec !== expected.totalSec || item.knownMovementSec !== 0) {
          stepTimingMatches = false;
          break;
        }
      } else if (
        item.knownMovementSec !== expected.movementSec ||
        item.knownExplanationSec !== expected.explanationSec ||
        item.knownTransitionSec !== expected.transitionSec ||
        item.knownPerSideSec !== expected.perSideSec
      ) {
        stepTimingMatches = false;
        break;
      }
    }
  }

  // 2. Check aggregate totals against getSequenceDurations and calculateSequenceTimeBreakdown
  const effectiveTargetMin =
    typeof targetMinutes === 'number' && Number.isFinite(targetMinutes) && targetMinutes > 0
      ? targetMinutes
      : 50;
  const seqDur = getSequenceDurations([...steps]);
  const breakdown = calculateSequenceTimeBreakdown(steps, safeExercises, effectiveTargetMin);

  let knownMovementSec = 0;
  let knownExplanationSec = 0;
  let knownTransitionSec = 0;
  let knownRestSec = 0;

  for (const item of normalized.items) {
    if (item.durationStatus === 'known' && item.knownTotalSec !== null) {
      if (item.kind === 'rest') {
        knownRestSec += item.knownRestSec ?? item.knownTotalSec;
      } else {
        knownMovementSec += item.knownMovementSec ?? 0;
        knownExplanationSec += item.knownExplanationSec ?? 0;
        knownTransitionSec += item.knownTransitionSec ?? 0;
      }
    }
  }
  const knownExerciseSec = knownMovementSec + knownExplanationSec + knownTransitionSec;
  const knownTotalSec = knownExerciseSec + knownRestSec;

  const sequenceDurationsMatches =
    knownTotalSec === seqDur.totalSec &&
    knownExerciseSec === seqDur.exerciseSec &&
    knownRestSec === seqDur.restSec &&
    knownTotalSec === breakdown.totalSec &&
    knownMovementSec === breakdown.movementSec &&
    knownExplanationSec === breakdown.explanationSec &&
    knownTransitionSec === breakdown.transitionSec &&
    knownRestSec === breakdown.restSec;

  // 3. Check explicit left/right/together seconds against buildPlanInsights(steps, exercises).sides
  const insights = buildPlanInsights(steps, safeExercises);
  let explicitLeftSec = 0;
  let explicitRightSec = 0;
  let explicitTogetherSec = 0;

  for (const item of normalized.items) {
    if (item.kind === 'rest' || item.durationStatus !== 'known') continue;
    const movSec = item.knownMovementSec ?? 0;
    const perSide = item.knownPerSideSec ?? 0;
    switch (item.sideMode) {
      case 'left':
        explicitLeftSec += movSec;
        break;
      case 'right':
        explicitRightSec += movSec;
        break;
      case 'left-then-right':
      case 'right-then-left':
        explicitLeftSec += perSide;
        explicitRightSec += perSide;
        break;
      case 'together':
        explicitTogetherSec += movSec;
        break;
      default:
        break;
    }
  }

  const planInsightsSidesMatches =
    explicitLeftSec === insights.sides.leftSec &&
    explicitRightSec === insights.sides.rightSec &&
    explicitTogetherSec === insights.sides.togetherSec;

  return deepFreeze({
    checked: true,
    stepTimingMatches,
    sequenceDurationsMatches,
    planInsightsSidesMatches,
  });
}

/**
 * Performs a pure, deterministic review of a `NormalizedClassReviewPlan`.
 * Never mutates inputs and deep-freezes the returned `ClassPlanReviewReport`.
 */
export function analyzeNormalizedClassPlan(
  plan: NormalizedClassReviewPlan,
  options?: ClassPlanReviewOptions,
): ClassPlanReviewReport {
  const effectiveExercises: readonly HierarchyPilatesExercise[] =
    options?.exercises ?? INITIAL_EXERCISES;
  const effectiveDrafts = options?.humanDrafts;

  const { targetMinutes, targetDurationStatus } = resolveTargetConfig(plan, options);

  // Start with adapter issues cloned cleanly
  const issues: ClassPlanReviewIssue[] = plan.adapterIssues.map((issue, idx) => ({
    id: `review-issue-${idx + 1}-${issue.code}`,
    code: issue.code,
    category: issue.category,
    severity: issue.severity,
    itemIds: [...issue.itemIds],
    itemIndices: [...issue.itemIndices],
    titleKo: issue.titleKo,
    messageKo: issue.messageKo,
    factualDetailKo: issue.factualDetailKo,
  }));

  const pushReviewIssue = (
    code: ClassPlanReviewIssueCode,
    category: ClassPlanReviewIssueCategory,
    severity: ClassPlanReviewIssueSeverity,
    itemIds: readonly string[],
    itemIndices: readonly number[],
    titleKo: string,
    messageKo: string,
    factualDetailKo?: string,
  ) => {
    issues.push({
      id: `review-issue-${issues.length + 1}-${code}`,
      code,
      category,
      severity,
      itemIds: [...itemIds],
      itemIndices: [...itemIndices],
      titleKo,
      messageKo,
      factualDetailKo,
    });
  };

  // --- 1. Timing Analysis ---
  let knownMovementSec = 0;
  let knownExplanationSec = 0;
  let knownTransitionSec = 0;
  let knownRestSec = 0;
  let knownTimeItemCount = 0;

  const unspecifiedTimeItemIds: string[] = [];
  const unspecifiedTimeItemIndices: number[] = [];
  const invalidTimeItemIds: string[] = [];
  const invalidTimeItemIndices: number[] = [];

  let preparationSec = 0;
  let mainSec = 0;
  let cooldownSec = 0;
  let restSectionSec = 0;
  let unspecifiedSectionSec = 0;

  let exerciseItemCount = 0;
  let restItemCount = 0;
  let creativeDraftItemCount = 0;
  let nameOnlyDraftItemCount = 0;

  for (const item of plan.items) {
    if (item.kind === 'rest') {
      restItemCount += 1;
    } else {
      exerciseItemCount += 1;
    }
    if (item.isHumanCreated) {
      creativeDraftItemCount += 1;
    }
    if (item.isNameOnlyDraft) {
      nameOnlyDraftItemCount += 1;
    }

    if (item.durationStatus === 'known' && item.knownTotalSec !== null) {
      knownTimeItemCount += 1;
      if (item.kind === 'rest') {
        const rSec = item.knownRestSec ?? item.knownTotalSec;
        knownRestSec += rSec;
        restSectionSec += rSec;
      } else {
        const mSec = item.knownMovementSec ?? 0;
        const eSec = item.knownExplanationSec ?? 0;
        const tSec = item.knownTransitionSec ?? 0;
        const totalItemSec = mSec + eSec + tSec;

        knownMovementSec += mSec;
        knownExplanationSec += eSec;
        knownTransitionSec += tSec;

        if (item.sectionRole === 'preparation') {
          preparationSec += totalItemSec;
        } else if (item.sectionRole === 'main') {
          mainSec += totalItemSec;
        } else if (item.sectionRole === 'cooldown') {
          cooldownSec += totalItemSec;
        } else {
          unspecifiedSectionSec += totalItemSec;
        }
      }
    } else if (item.durationStatus === 'unspecified') {
      unspecifiedTimeItemIds.push(item.itemId);
      unspecifiedTimeItemIndices.push(item.index);
    } else if (item.durationStatus === 'invalid') {
      invalidTimeItemIds.push(item.itemId);
      invalidTimeItemIndices.push(item.index);
    }
  }

  const knownExerciseSec = knownMovementSec + knownExplanationSec + knownTransitionSec;
  const knownTotalSec = knownExerciseSec + knownRestSec;
  const knownTotalMinutes = Number((knownTotalSec / 60).toFixed(2));
  const unspecifiedTimeItemCount = unspecifiedTimeItemIds.length;
  const invalidTimeItemCount = invalidTimeItemIds.length;
  const isPartialTotal = unspecifiedTimeItemCount > 0 || invalidTimeItemCount > 0;

  const targetSec =
    targetDurationStatus === 'known' && targetMinutes !== null
      ? Math.round(targetMinutes * 60)
      : null;

  const knownDeltaSec = targetSec !== null ? knownTotalSec - targetSec : null;
  const exactTargetMatch =
    targetSec !== null &&
    !isPartialTotal &&
    plan.items.length > 0 &&
    Math.abs(knownDeltaSec ?? 0) === 0;

  if (plan.items.length === 0 || exerciseItemCount === 0) {
    pushReviewIssue(
      'empty-class-plan',
      'timing',
      'notice',
      [],
      [],
      '수업 계획에 포함된 동작이 없습니다',
      plan.items.length === 0
        ? '아직 추가된 동작이나 블록이 없습니다. 카탈로그 동작 또는 직접 만든 동작 초안을 추가해 보세요.'
        : '현재 휴식 항목만 있고 운동 동작이 없습니다. 최소 1개 이상의 동작을 추가해 주세요.',
    );
  }

  if (
    targetDurationStatus === 'invalid' &&
    !issues.some((issue) => issue.code === 'invalid-target-duration')
  ) {
    pushReviewIssue(
      'invalid-target-duration',
      'timing',
      'warning',
      [],
      [],
      '목표 수업 시간 입력값을 확인해 주세요',
      `목표 수업 시간은 ${CLASS_PLAN_REVIEW_LIMITS.MIN_TARGET_MINUTES}분~${CLASS_PLAN_REVIEW_LIMITS.MAX_TARGET_MINUTES}분 범위의 유한한 숫자여야 합니다.`,
    );
  }

  if (targetDurationStatus === 'unspecified') {
    pushReviewIssue(
      'target-duration-unspecified',
      'timing',
      'info',
      [],
      [],
      '목표 수업 시간이 지정되지 않았습니다',
      `목표 시간이 설정되지 않아 현재 입력된 항목들의 확인된 시간 합계(${formatReviewDurationKo(knownTotalSec)})만 집계했습니다.`,
    );
  }

  if (unspecifiedTimeItemCount > 0) {
    const unspecifiedNames = plan.items
      .filter((item) => item.durationStatus === 'unspecified')
      .map((item) => item.displayNameKo)
      .slice(0, 4);
    const namesPreview =
      unspecifiedNames.length < unspecifiedTimeItemCount
        ? `${unspecifiedNames.join(', ')} 외 ${unspecifiedTimeItemCount - unspecifiedNames.length}개`
        : unspecifiedNames.join(', ');

    pushReviewIssue(
      'unspecified-item-duration',
      'timing',
      'notice',
      unspecifiedTimeItemIds,
      unspecifiedTimeItemIndices,
      `시간이 아직 입력되지 않은 항목이 ${unspecifiedTimeItemCount}개 있습니다`,
      `${namesPreview} 항목에 소요 시간이 입력되지 않았습니다. 미지정 항목은 임의로 0초로 처리하지 않고, 확인된 시간 합계(${formatReviewDurationKo(knownTotalSec)})와 별도로 구분했습니다.`,
      `시간 미지정 항목 수: ${unspecifiedTimeItemCount}개 (${unspecifiedTimeItemIds.join(', ')})`,
    );
  }

  if (targetSec !== null && knownDeltaSec !== null && Math.abs(knownDeltaSec) >= 1) {
    const absDeltaText = formatReviewDurationKo(Math.abs(knownDeltaSec));
    const directionKo = knownDeltaSec > 0 ? `${absDeltaText} 더 깁니다` : `${absDeltaText} 부족합니다`;
    const partialSuffixKo = isPartialTotal
      ? ` (참고: 시간 미지정 ${unspecifiedTimeItemCount}개${invalidTimeItemCount > 0 ? `·시간 입력 오류 ${invalidTimeItemCount}개` : ''} 항목은 합산 전입니다)`
      : '';

    const affectedIds =
      unspecifiedTimeItemIds.length > 0
        ? unspecifiedTimeItemIds
        : plan.items.map((item) => item.itemId);
    const affectedIndices =
      unspecifiedTimeItemIndices.length > 0
        ? unspecifiedTimeItemIndices
        : plan.items.map((item) => item.index);

    pushReviewIssue(
      'target-duration-difference',
      'timing',
      isPartialTotal ? 'notice' : 'warning',
      affectedIds,
      affectedIndices,
      `확인된 수업 시간 합계가 목표 시간과 ${absDeltaText} 차이납니다`,
      `목표 시간(${formatReviewDurationKo(targetSec)}) 대비 현재 확인된 시간 합계(${formatReviewDurationKo(knownTotalSec)})가 ${directionKo}.${partialSuffixKo}`,
      `확인된 시간: ${formatReviewDurationKo(knownTotalSec)} (${formatSecondsToMMSS(knownTotalSec)}) / 목표 시간: ${formatReviewDurationKo(targetSec)} (${formatSecondsToMMSS(targetSec)}) / 차이: ${knownDeltaSec > 0 ? '+' : ''}${knownDeltaSec}초`,
    );
  }

  if (targetSec !== null && targetSec > 0 && knownRestSec >= targetSec) {
    const restItems = plan.items.filter((item) => item.kind === 'rest');
    pushReviewIssue(
      'rest-exceeds-target',
      'timing',
      'warning',
      restItems.map((item) => item.itemId),
      restItems.map((item) => item.index),
      '휴식 시간 합계가 전체 목표 수업 시간 이상입니다',
      `휴식 시간 합계(${formatReviewDurationKo(knownRestSec)})가 목표 수업 시간(${formatReviewDurationKo(targetSec)}) 이상으로 편성되어 있습니다. 휴식 시간을 줄이거나 목표 시간을 확인해 주세요.`,
    );
  }

  // Equipment transition check for consecutive known catalog/apparatus exercises
  const shortTransitionItemIds: string[] = [];
  const shortTransitionItemIndices: number[] = [];
  let prevExerciseItem: NormalizedClassReviewItem | undefined;

  for (const item of plan.items) {
    if (item.kind === 'rest') continue;

    if (
      prevExerciseItem !== undefined &&
      prevExerciseItem.apparatus !== undefined &&
      item.apparatus !== undefined &&
      item.durationStatus === 'known'
    ) {
      const fromStep = buildSyntheticStepFromReviewItem(prevExerciseItem);
      const toStep = buildSyntheticStepFromReviewItem(item);
      const transitionDetail = calculateApparatusTransitionDetail(
        fromStep,
        toStep,
        prevExerciseItem.index,
        item.index,
        effectiveExercises,
        effectiveDrafts,
      );

      if (
        (transitionDetail.equipmentChanged || prevExerciseItem.apparatus !== item.apparatus) &&
        (item.knownTransitionSec ?? 0) < 30
      ) {
        shortTransitionItemIds.push(item.itemId);
        shortTransitionItemIndices.push(item.index);
      }
    }

    prevExerciseItem = item;
  }

  if (shortTransitionItemIds.length > 0) {
    pushReviewIssue(
      'equipment-transition-short',
      'timing',
      'notice',
      shortTransitionItemIds,
      shortTransitionItemIndices,
      '기구 전환 구간의 전환 시간이 30초 미만입니다',
      '이전 동작과 사용 기구가 달라지는 구간에서는 기구 이동·세팅을 위해 30초 이상의 전환 시간 배정을 권장합니다.',
      `기구 전환 확인 권장 항목: ${shortTransitionItemIds.join(', ')}`,
    );
  }

  // Build timing headline & detail note in easy Korean
  let timingHeadlineKo: string;
  if (plan.items.length === 0) {
    timingHeadlineKo = '등록된 항목이 없어 확인된 수업 시간이 없습니다.';
  } else if (targetSec !== null && exactTargetMatch) {
    timingHeadlineKo = `총 ${formatReviewDurationKo(knownTotalSec)}으로 목표 수업 시간(${formatReviewDurationKo(targetSec)})과 정확히 일치합니다.`;
  } else if (targetSec !== null && knownDeltaSec !== null) {
    const diffText = formatReviewDurationKo(Math.abs(knownDeltaSec));
    const dir = knownDeltaSec > 0 ? '초과' : '부족';
    const partialNote = isPartialTotal
      ? ` (시간 미지정 ${unspecifiedTimeItemCount}개${invalidTimeItemCount > 0 ? `·오류 ${invalidTimeItemCount}개` : ''} 별도)`
      : '';
    timingHeadlineKo = `확인된 총 시간 ${formatReviewDurationKo(knownTotalSec)} — 목표(${formatReviewDurationKo(targetSec)}) 대비 ${diffText} ${dir}${partialNote}`;
  } else {
    const partialNote = isPartialTotal
      ? ` (시간 미지정 ${unspecifiedTimeItemCount}개${invalidTimeItemCount > 0 ? `·오류 ${invalidTimeItemCount}개` : ''} 별도)`
      : '';
    timingHeadlineKo = `확인된 총 시간 ${formatReviewDurationKo(knownTotalSec)}${partialNote}`;
  }

  const timingDetailNoteKo = `운동 수행 ${formatReviewDurationKo(knownMovementSec)} · 설명 ${formatReviewDurationKo(knownExplanationSec)} · 전환 ${formatReviewDurationKo(knownTransitionSec)} · 휴식 ${formatReviewDurationKo(knownRestSec)} (합계 ${formatSecondsToMMSS(knownTotalSec)})`;

  const timingSummary: ClassPlanTimeReviewSummary = {
    knownTotalSec,
    knownTotalMinutes,
    knownExerciseSec,
    knownMovementSec,
    knownExplanationSec,
    knownTransitionSec,
    knownRestSec,
    targetSec,
    targetMinutes,
    targetDurationStatus,
    knownDeltaSec,
    exactTargetMatch,
    isPartialTotal,
    knownTimeItemCount,
    unspecifiedTimeItemCount,
    unspecifiedTimeItemIds,
    invalidTimeItemCount,
    invalidTimeItemIds,
    sectionKnownSec: {
      preparationSec,
      mainSec,
      cooldownSec,
      restSec: restSectionSec,
      unspecifiedSectionSec,
    },
    headlineKo: timingHeadlineKo,
    detailNoteKo: timingDetailNoteKo,
  };

  // --- 2. Laterality Analysis (Factual Only, Never Claim Safety) ---
  let explicitLeftItemCount = 0;
  let explicitRightItemCount = 0;
  let bothSequentialItemCount = 0;
  let togetherItemCount = 0;
  const unknownLateralityItemIds: string[] = [];
  const unknownLateralityItemIndices: number[] = [];
  const unilateralTogetherMismatchItemIds: string[] = [];
  const unilateralTogetherMismatchItemIndices: number[] = [];

  let knownLeftMovementSec = 0;
  let knownRightMovementSec = 0;
  let knownTogetherMovementSec = 0;
  let knownUnknownSideMovementSec = 0;

  const splitGroupsMap = new Map<string, NormalizedClassReviewItem[]>();

  for (const item of plan.items) {
    if (item.kind === 'rest') {
      continue;
    }

    const movSec = item.durationStatus === 'known' ? (item.knownMovementSec ?? 0) : 0;
    const perSideSec = item.durationStatus === 'known' ? (item.knownPerSideSec ?? 0) : 0;

    if (item.isUnilateral === true && item.sideMode === 'together') {
      unilateralTogetherMismatchItemIds.push(item.itemId);
      unilateralTogetherMismatchItemIndices.push(item.index);
    }

    switch (item.lateralityStatus) {
      case 'left': {
        explicitLeftItemCount += 1;
        knownLeftMovementSec += movSec;
        const group = splitGroupsMap.get(item.movementKey) ?? [];
        group.push(item);
        splitGroupsMap.set(item.movementKey, group);
        break;
      }
      case 'right': {
        explicitRightItemCount += 1;
        knownRightMovementSec += movSec;
        const group = splitGroupsMap.get(item.movementKey) ?? [];
        group.push(item);
        splitGroupsMap.set(item.movementKey, group);
        break;
      }
      case 'both-sequential': {
        bothSequentialItemCount += 1;
        if (item.sideMode === 'left-then-right' || item.sideMode === 'right-then-left') {
          knownLeftMovementSec += perSideSec;
          knownRightMovementSec += perSideSec;
        } else {
          knownUnknownSideMovementSec += movSec;
        }
        break;
      }
      case 'together': {
        togetherItemCount += 1;
        knownTogetherMovementSec += movSec;
        break;
      }
      case 'unknown': {
        unknownLateralityItemIds.push(item.itemId);
        unknownLateralityItemIndices.push(item.index);
        knownUnknownSideMovementSec += movSec;
        break;
      }
      default:
        break;
    }
  }

  const unknownLateralityItemCount = unknownLateralityItemIds.length;
  const knownLeftRightDiffSec = knownLeftMovementSec - knownRightMovementSec;

  const splitMovementComparisons: LateralityMovementGroupComparison[] = [];
  const unpairedLeftItemIds: string[] = [];
  const unpairedRightItemIds: string[] = [];
  const imbalancedMovementGroupKeys: string[] = [];

  for (const [movementKey, groupItems] of splitGroupsMap.entries()) {
    const leftItems = groupItems.filter((item) => item.lateralityStatus === 'left');
    const rightItems = groupItems.filter((item) => item.lateralityStatus === 'right');

    const leftItemIds = leftItems.map((item) => item.itemId);
    const rightItemIds = rightItems.map((item) => item.itemId);
    const groupItemIds = groupItems.map((item) => item.itemId);
    const groupItemIndices = groupItems.map((item) => item.index);

    const leftCount = leftItems.length;
    const rightCount = rightItems.length;

    const groupLeftSec = leftItems.reduce(
      (sum, item) => sum + (item.durationStatus === 'known' ? (item.knownMovementSec ?? 0) : 0),
      0,
    );
    const groupRightSec = rightItems.reduce(
      (sum, item) => sum + (item.durationStatus === 'known' ? (item.knownMovementSec ?? 0) : 0),
      0,
    );

    const hasUnspecifiedTimeOnLeftOrRight = groupItems.some(
      (item) => item.durationStatus !== 'known',
    );

    const countMatched = leftCount > 0 && rightCount > 0 && leftCount === rightCount;
    const timeDiffSec = Math.abs(groupLeftSec - groupRightSec);
    const timeMatched = !hasUnspecifiedTimeOnLeftOrRight && countMatched && timeDiffSec < 1;

    let repsAndSetsMatched = true;
    if (leftCount > 0 && rightCount > 0) {
      const pairCount = Math.min(leftCount, rightCount);
      for (let i = 0; i < pairCount; i += 1) {
        if (
          leftItems[i].repetitions !== rightItems[i].repetitions ||
          leftItems[i].sets !== rightItems[i].sets
        ) {
          repsAndSetsMatched = false;
          break;
        }
      }
    }

    const displayNameKo = groupItems[0]?.displayNameKo ?? movementKey;

    if (leftCount !== rightCount) {
      if (leftCount > rightCount) {
        unpairedLeftItemIds.push(...leftItemIds);
      } else {
        unpairedRightItemIds.push(...rightItemIds);
      }
      pushReviewIssue(
        'laterality-unpaired-side',
        'laterality',
        'warning',
        groupItemIds,
        groupItemIndices,
        `'${displayNameKo}' 동작의 왼쪽·오른쪽 편성 횟수가 다릅니다`,
        `'${displayNameKo}' 동작이 왼쪽 ${leftCount}회, 오른쪽 ${rightCount}회로 편성되어 반대쪽 짝이 맞지 않습니다. 반대쪽 항목을 추가하거나 양쪽 순차 수행('left-then-right')으로 설정할 수 있습니다.`,
        `왼쪽 항목: ${leftCount}개 / 오른쪽 항목: ${rightCount}개`,
      );
    }

    if (timeDiffSec >= 1) {
      pushReviewIssue(
        'laterality-time-difference',
        'laterality',
        'notice',
        groupItemIds,
        groupItemIndices,
        `'${displayNameKo}' 동작의 왼쪽·오른쪽 수행 시간이 서로 다릅니다`,
        `'${displayNameKo}' 동작의 확인된 수행 시간이 왼쪽 ${formatReviewDurationKo(groupLeftSec)}, 오른쪽 ${formatReviewDurationKo(groupRightSec)}으로 ${formatReviewDurationKo(timeDiffSec)} 차이가 있습니다.`,
        `왼쪽 수행 시간: ${groupLeftSec}초 / 오른쪽 수행 시간: ${groupRightSec}초`,
      );
    }

    if (leftCount > 0 && rightCount > 0 && !repsAndSetsMatched) {
      pushReviewIssue(
        'laterality-reps-or-sets-difference',
        'laterality',
        'notice',
        groupItemIds,
        groupItemIndices,
        `'${displayNameKo}' 동작의 좌우 횟수 또는 세트 기록이 다릅니다`,
        `'${displayNameKo}' 동작의 왼쪽과 오른쪽에 입력된 반복 횟수(Reps) 또는 세트(Sets)가 서로 다릅니다.`,
      );
    }

    if (!countMatched || !timeMatched || !repsAndSetsMatched) {
      imbalancedMovementGroupKeys.push(movementKey);
    }

    let statusSummaryKo: string;
    if (!countMatched) {
      statusSummaryKo = `왼쪽 ${leftCount}회 · 오른쪽 ${rightCount}회 (짝 미일치)`;
    } else if (hasUnspecifiedTimeOnLeftOrRight) {
      statusSummaryKo = `왼쪽 ${leftCount}회 · 오른쪽 ${rightCount}회 (일부 시간 미지정)`;
    } else if (!timeMatched) {
      statusSummaryKo = `왼쪽 ${formatReviewDurationKo(groupLeftSec)} vs 오른쪽 ${formatReviewDurationKo(groupRightSec)} (${formatReviewDurationKo(timeDiffSec)} 차이)`;
    } else if (!repsAndSetsMatched) {
      statusSummaryKo = `좌우 시간 일치 (${formatReviewDurationKo(groupLeftSec)}), 횟수·세트 상이`;
    } else {
      statusSummaryKo = `왼쪽·오른쪽 각 ${leftCount}회 (${formatReviewDurationKo(groupLeftSec)}) 동일 편성`;
    }

    splitMovementComparisons.push({
      movementKey,
      displayNameKo,
      leftItemIds,
      rightItemIds,
      leftCount,
      rightCount,
      knownLeftMovementSec: groupLeftSec,
      knownRightMovementSec: groupRightSec,
      hasUnspecifiedTimeOnLeftOrRight,
      countMatched,
      timeMatched,
      repsAndSetsMatched,
      statusSummaryKo,
    });
  }

  if (unilateralTogetherMismatchItemIds.length > 0) {
    const mismatchNames = plan.items
      .filter((item) => unilateralTogetherMismatchItemIds.includes(item.itemId))
      .map((item) => item.displayNameKo)
      .join(', ');

    pushReviewIssue(
      'laterality-unilateral-together-mismatch',
      'laterality',
      'notice',
      unilateralTogetherMismatchItemIds,
      unilateralTogetherMismatchItemIndices,
      '편측 동작이 양쪽 동시 수행(together)으로 설정되어 있습니다',
      `${mismatchNames} 동작은 한쪽씩 수행하는 편측 동작이지만 좌우 모드가 '양쪽 함께(together)'로 기록되어 있습니다. 의도한 진행 방식인지 확인해 주세요.`,
    );
  }

  if (unknownLateralityItemCount > 0) {
    pushReviewIssue(
      'laterality-unknown-items-present',
      'laterality',
      'info',
      unknownLateralityItemIds,
      unknownLateralityItemIndices,
      `좌우 수행 방식이 지정되지 않은 항목이 ${unknownLateralityItemCount}개 있습니다`,
      `총 ${unknownLateralityItemCount}개 항목에 좌우 구분(왼쪽/오른쪽/양쪽 함께)이 기록되지 않아 임의로 분류하지 않고 '좌우 미지정' 상태로 남겼습니다.`,
    );
  }

  // --- 3. Creative / Name-Only Draft Informational Guidance ---
  const draftsWithUnsetOptionalFields = plan.items.filter(
    (item) =>
      (item.isNameOnlyDraft || item.isHumanCreated) &&
      (item.durationStatus === 'unspecified' || item.lateralityStatus === 'unknown'),
  );

  if (draftsWithUnsetOptionalFields.length > 0) {
    pushReviewIssue(
      'creative-draft-optional-fields-unset',
      'draft-info',
      'info',
      draftsWithUnsetOptionalFields.map((item) => item.itemId),
      draftsWithUnsetOptionalFields.map((item) => item.index),
      '직접 만든 동작 초안의 선택 항목(시간·좌우)을 필요할 때 보완할 수 있습니다',
      '이름만 적은 창작 동작 초안도 해부학·기구·카테고리 분류 없이 그대로 수업 계획에서 검토할 수 있습니다. 원하실 때 소요 시간이나 좌우 구분만 추가로 입력해 보세요.',
    );
  }

  let lateralityHeadlineKo: string;
  if (exerciseItemCount === 0) {
    lateralityHeadlineKo = '검토할 운동 동작이 없습니다.';
  } else if (
    unpairedLeftItemIds.length === 0 &&
    unpairedRightItemIds.length === 0 &&
    Math.abs(knownLeftRightDiffSec) < 1 &&
    unilateralTogetherMismatchItemIds.length === 0
  ) {
    lateralityHeadlineKo =
      unknownLateralityItemCount > 0
        ? `확인된 좌우 편성 시간은 동일하며(왼쪽 ${formatReviewDurationKo(knownLeftMovementSec)} · 오른쪽 ${formatReviewDurationKo(knownRightMovementSec)}), 좌우 미지정 항목이 ${unknownLateralityItemCount}개 있습니다.`
        : `왼쪽(${formatReviewDurationKo(knownLeftMovementSec)})과 오른쪽(${formatReviewDurationKo(knownRightMovementSec)}) 수행 시간이 균등하게 편성되어 있습니다.`;
  } else {
    lateralityHeadlineKo = `확인된 좌우 수행 시간: 왼쪽 ${formatReviewDurationKo(knownLeftMovementSec)} vs 오른쪽 ${formatReviewDurationKo(knownRightMovementSec)} (차이 ${formatReviewDurationKo(Math.abs(knownLeftRightDiffSec))})`;
  }

  const lateralityCautionNoteKo =
    '좌우 횟수 및 시간 비교는 수업 계획표에 기록된 편성 사실만 요약한 것이며, 실제 신체적 균형이나 운동 효과·안전성을 보증하지 않습니다.';

  const lateralitySummary: ClassPlanLateralityReviewSummary = {
    explicitLeftItemCount,
    explicitRightItemCount,
    bothSequentialItemCount,
    togetherItemCount,
    unknownLateralityItemCount,
    unknownLateralityItemIds,
    unilateralTogetherMismatchItemIds,
    knownLeftMovementSec,
    knownRightMovementSec,
    knownTogetherMovementSec,
    knownUnknownSideMovementSec,
    knownLeftRightDiffSec,
    splitMovementComparisons,
    unpairedLeftItemIds,
    unpairedRightItemIds,
    imbalancedMovementGroupKeys,
    headlineKo: lateralityHeadlineKo,
    cautionNoteKo: lateralityCautionNoteKo,
  };

  // --- 4. Parity Check ---
  const knownStepsForParity = plan.items
    .filter((item) => item.durationStatus === 'known')
    .map(buildSyntheticStepFromReviewItem);

  const parity =
    plan.items.length > 0 && plan.items.every((item) => item.durationStatus === 'known')
      ? checkExistingUtilityParity(
          knownStepsForParity,
          effectiveExercises,
          targetMinutes ?? undefined,
        )
      : {
          checked: false,
          stepTimingMatches: true,
          sequenceDurationsMatches: true,
          planInsightsSidesMatches: true,
        };

  const summaryHeadlineKo = `${plan.title} — ${timingHeadlineKo} / ${lateralityHeadlineKo}`;

  const report: ClassPlanReviewReport = {
    boundary: DEFAULT_CLASS_PLAN_REVIEW_BOUNDARY,
    plan,
    timing: timingSummary,
    laterality: lateralitySummary,
    issues,
    counts: {
      totalItems: plan.items.length,
      exerciseItems: exerciseItemCount,
      restItems: restItemCount,
      creativeDraftItems: creativeDraftItemCount,
      nameOnlyDraftItems: nameOnlyDraftItemCount,
      issueCount: issues.length,
    },
    parity,
    summaryHeadlineKo,
  };

  return deepFreeze(report);
}

/**
 * End-to-end read-only entry point: adapts any class plan input and returns an immutable `ClassPlanReviewReport`.
 */
export function reviewClassPlan(
  source: unknown,
  options?: ClassPlanReviewOptions,
): ClassPlanReviewReport {
  const normalizedPlan = adaptClassPlanForReview(source, options);
  return analyzeNormalizedClassPlan(normalizedPlan, options);
}
