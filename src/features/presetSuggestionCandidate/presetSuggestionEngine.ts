import {
  EQUIPMENT_OPTIONS,
  equipmentRequirementsSatisfied,
  getExerciseEquipment,
} from '../../data/equipmentCatalog';
import {
  OFFLINE_BLOCK_PRESETS,
  OFFLINE_CLASS_PRESETS,
  PRESET_THEME_CATALOG,
} from '../../data/classBlockPresets';
import {
  APPARATUS_LABELS,
  CANONICAL_BLOCKS,
  INITIAL_EXERCISES,
} from '../../data/pilatesCatalog';
import type {
  OfflineBlockPreset,
  OfflineClassPreset,
} from '../../types/classBlockPresets';
import type {
  AutoGenerateCriteria,
  ClassBlockCategory,
  ClassHistoryLog,
  ConditionTemplate,
  PilatesExercise,
  PropType,
  SavedSequence,
  SequenceStep,
  StepSideMode,
} from '../../types/pilates';
import type { ClassSectionRole } from '../../types/sequenceMotion';
import { inspectUnverifiedHealthOrRehabClaims } from '../../utils/classBlockPresetValidator';
import { isExerciseAuthoringEligible } from '../../utils/exerciseAuthoring';
import { createMovementSnapshot, getMovementSectionRole } from '../../utils/hierarchyModel';
import {
  analyzeSequence,
  applyTransitionAllowances,
  fitSequenceDuration,
  getMovementKey,
  getRecentlyTaughtExerciseIds,
  getSequenceDurations,
  getStepSideLabels,
  getStepTiming,
  isRestStep,
} from '../../utils/sequenceEngine';
import { adaptPresetSuggestionInput } from './presetSuggestionAdapter';
import {
  deepFreezeCandidateResult,
  detachNormalizedSuggestionInput,
  formatDurationSecondsKo,
} from './presetSuggestionDiagnostics';
import {
  DEFAULT_PRESET_SUGGESTION_TRUTH_BOUNDARY,
  PRESET_SUGGESTION_LIMITS,
  type CandidateStepTimingDetail,
  type CandidateTimeSummary,
  type CandidateUnilateralSummary,
  type NormalizedPresetSuggestionInput,
  type NormalizedSeedStep,
  type PresetCandidateSourceTier,
  type PresetSuggestionCandidate,
  type PresetSuggestionIssue,
  type PresetSuggestionRequest,
  type PresetSuggestionResult,
  type TargetFeasibilityReport,
  type TargetTimeImpossibilityReason,
} from './presetSuggestionTypes';

const DETERMINISTIC_REFERENCE_ISO = '2026-11-06T09:00:00.000Z';

const THEME_META_BY_ID = new Map(PRESET_THEME_CATALOG.map((meta) => [meta.id, meta]));

const SOURCE_TIER_LABELS_KO: Readonly<Record<PresetCandidateSourceTier, string>> = {
  'offline-class-preset-exact': '오프라인 수업 프리셋 정확 일치 초안',
  'offline-class-preset-adapted': '오프라인 수업 프리셋 시간·휴식 맞춤 초안',
  'offline-block-preset-assembly': '오프라인 재사용 블록 프리셋 조합 초안',
  'catalog-deterministic-composition': '검증 카탈로그 동작 ID 규칙 조합 초안',
};

function equipmentLabelKo(id: string): string {
  return EQUIPMENT_OPTIONS.find((item) => item.id === id)?.labelKo ?? id;
}

function buildVerifiableCatalogMap(
  exercises: readonly PilatesExercise[],
): Map<string, PilatesExercise> {
  const map = new Map<string, PilatesExercise>();
  for (const ex of exercises) {
    if (
      ex &&
      typeof ex === 'object' &&
      typeof ex.id === 'string' &&
      ex.id.trim().length > 0 &&
      isExerciseAuthoringEligible(ex) &&
      getExerciseEquipment(ex).requirementsKnown
    ) {
      map.set(ex.id, ex);
    }
  }
  return map;
}

function exerciseMatchesRequest(
  exercise: PilatesExercise,
  input: NormalizedPresetSuggestionInput,
  strictPropsFilter: boolean,
): boolean {
  const eq = getExerciseEquipment(exercise);
  if (!eq.requirementsKnown) return false;
  if (!equipmentRequirementsSatisfied(eq.requiredEquipment, input.availableEquipment)) {
    return false;
  }
  if (input.apparatus !== 'mixed' && exercise.apparatus !== input.apparatus) {
    return false;
  }
  if (Number(exercise.level) > Number(input.level)) {
    return false;
  }
  if (
    strictPropsFilter &&
    !exercise.props.every((prop) => prop === 'none' || input.preferredProps.includes(prop))
  ) {
    return false;
  }
  return true;
}

function computeRequiredEquipmentToCover(
  input: NormalizedPresetSuggestionInput,
  rawRequest?: PresetSuggestionRequest,
): string[] {
  const explicitEquip =
    rawRequest !== undefined &&
    (rawRequest.availableEquipment !== undefined || rawRequest.ownedApparatus !== undefined);
  if (explicitEquip) {
    return [...input.availableEquipment];
  }
  if (input.apparatus !== 'mixed') {
    return [input.apparatus];
  }
  return [];
}

function scoreExerciseForThemeAndCriteria(
  exercise: PilatesExercise,
  input: NormalizedPresetSuggestionInput,
  recentIds: ReadonlySet<string>,
  usedIds: ReadonlySet<string>,
  previous?: PilatesExercise,
  penalizeIds?: ReadonlySet<string>,
): number {
  const themeMeta = THEME_META_BY_ID.get(input.theme);
  let score = exercise.level === input.level ? 14 : 4;

  if (themeMeta?.primaryCategories.includes(exercise.blockCategory)) {
    score += 28;
  }
  if (
    input.preferredProps.length > 0 &&
    exercise.props.some((prop) => input.preferredProps.includes(prop))
  ) {
    score += 15;
  } else if (exercise.props.every((prop) => prop === 'none')) {
    score += 4;
  }

  if (input.focusPreset === 'core-sculpt' && exercise.blockCategory === 'core') score += 20;
  if (
    input.focusPreset === 'glute-lower' &&
    ['lower-body', 'bridging', 'footwork'].includes(exercise.blockCategory)
  ) {
    score += 20;
  }
  if (
    input.focusPreset === 'posture-upper' &&
    ['upper-body', 'extension'].includes(exercise.blockCategory)
  ) {
    score += 20;
  }
  if (input.focusPreset === 'mobility-rehab' && exercise.favoriteTag === 'rehab-posture') {
    score += 18;
  }

  if (recentIds.has(exercise.id)) score -= 120;
  if (usedIds.has(exercise.id)) score -= 250;
  if (penalizeIds?.has(exercise.id)) score -= 60;

  if (previous) {
    if (previous.springs === exercise.springs) score += 8;
    if (previous.box === exercise.box) score += 6;
    if (previous.bodyPosition === exercise.bodyPosition) score += 3;
  }
  return score;
}

/**
 * Deterministic bitmask search to cover all required equipment IDs with distinct movement families.
 */
function findDeterministicEquipmentCoverage(
  pool: readonly PilatesExercise[],
  requiredEquipment: readonly string[],
  input: NormalizedPresetSuggestionInput,
  recentIds: ReadonlySet<string>,
): { covered: boolean; exercises: PilatesExercise[]; missingEquipment: string[] } {
  if (requiredEquipment.length === 0) {
    return { covered: true, exercises: [], missingEquipment: [] };
  }

  const missingEquipment = requiredEquipment.filter(
    (eqId) => !pool.some((ex) => getExerciseEquipment(ex).requiredEquipment.includes(eqId)),
  );
  if (missingEquipment.length > 0) {
    return { covered: false, exercises: [], missingEquipment };
  }

  const groups = new Map<string, PilatesExercise[]>();
  for (const ex of pool) {
    const key = getMovementKey(ex);
    const list = groups.get(key) ?? [];
    list.push(ex);
    groups.set(key, list);
  }

  type Plan = { exercises: PilatesExercise[]; score: number };
  let plans = new Map<number, Plan>([[0, { exercises: [], score: 0 }]]);

  const maskFor = (ex: PilatesExercise): number =>
    requiredEquipment.reduce(
      (mask, id, idx) =>
        getExerciseEquipment(ex).requiredEquipment.includes(id) ? mask | (1 << idx) : mask,
      0,
    );

  for (const [, variants] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
    const next = new Map(plans);
    const sortedVariants = [...variants].sort((a, b) => a.id.localeCompare(b.id));
    for (const [mask, plan] of plans) {
      for (const ex of sortedVariants) {
        const coveredMask = mask | maskFor(ex);
        if (coveredMask === mask) continue;
        const candidate: Plan = {
          exercises: [...plan.exercises, ex],
          score:
            plan.score +
            scoreExerciseForThemeAndCriteria(ex, input, recentIds, new Set()),
        };
        const prev = next.get(coveredMask);
        if (
          !prev ||
          candidate.exercises.length < prev.exercises.length ||
          (candidate.exercises.length === prev.exercises.length && candidate.score > prev.score)
        ) {
          next.set(coveredMask, candidate);
        }
      }
    }
    plans = next;
  }

  const fullMask = (1 << requiredEquipment.length) - 1;
  const complete = plans.get(fullMask);
  if (!complete) {
    return { covered: false, exercises: [], missingEquipment: [] };
  }
  return { covered: true, exercises: complete.exercises, missingEquipment: [] };
}

function minimumStepFloorSec(step: Pick<SequenceStep, 'explanationSec' | 'transitionSec'>): number {
  return Math.ceil(
    Math.max(
      PRESET_SUGGESTION_LIMITS.MIN_ADJUSTABLE_STEP_FLOOR_SEC,
      (step.explanationSec ?? 0) +
        (step.transitionSec ?? 0) +
        PRESET_SUGGESTION_LIMITS.MIN_MOVEMENT_SEC,
    ),
  );
}

/**
 * Evaluates whether the requested target duration and rest budget are mathematically and
 * domain-wise achievable with verifiable catalog movements.
 */
export function evaluatePresetTargetFeasibility(
  inputOrRequest: NormalizedPresetSuggestionInput | PresetSuggestionRequest,
  rawRequestContext?: PresetSuggestionRequest,
): {
  feasibility: TargetFeasibilityReport;
  feasibilityIssues: PresetSuggestionIssue[];
  eligibleExercises: PilatesExercise[];
  verifiableMap: Map<string, PilatesExercise>;
} {
  const isNormalized =
    inputOrRequest &&
    typeof inputOrRequest === 'object' &&
    'targetDurationStatus' in inputOrRequest &&
    'adapterIssues' in inputOrRequest;

  const input: NormalizedPresetSuggestionInput = isNormalized
    ? detachNormalizedSuggestionInput(inputOrRequest as NormalizedPresetSuggestionInput)
    : adaptPresetSuggestionInput(inputOrRequest);

  const rawReq = isNormalized ? rawRequestContext : (inputOrRequest as PresetSuggestionRequest);
  const exercises = Array.isArray(rawReq?.exercises) ? rawReq.exercises : INITIAL_EXERCISES;
  const verifiableMap = buildVerifiableCatalogMap(exercises);

  const strictPropsFilter =
    rawReq !== undefined && Array.isArray(rawReq.preferredProps);

  const eligibleExercises = [...verifiableMap.values()]
    .filter((ex) => exerciseMatchesRequest(ex, input, strictPropsFilter))
    .sort((a, b) => a.id.localeCompare(b.id));

  const impossibilityReasons: TargetTimeImpossibilityReason[] = [];
  const feasibilityIssues: PresetSuggestionIssue[] = [];

  const addReason = (reason: TargetTimeImpossibilityReason) => {
    if (!impossibilityReasons.includes(reason)) {
      impossibilityReasons.push(reason);
    }
  };

  if (!input.apparatusValid || input.unknownEquipmentIds.length > 0) {
    addReason('unknown-equipment-id');
  }

  if (input.targetDurationStatus !== 'known' || input.targetMinutes === null || !input.levelValid) {
    addReason('target-duration-out-of-bounds');
  }

  if (input.restStatus === 'invalid') {
    addReason('rest-duration-invalid');
  }

  const targetSec =
    input.targetMinutes !== null ? Math.round(input.targetMinutes * 60) : null;

  const seedRestSteps = input.seedSteps.filter((s) => s.kind === 'rest');
  const seedRestSec = seedRestSteps.reduce((acc, s) => acc + s.totalSec, 0);
  const requestedRestSec =
    input.restStatus === 'valid' && seedRestSec === 0
      ? Math.round(input.restMinutes * 60)
      : 0;
  const totalRestSec = seedRestSec + requestedRestSec;

  if (targetSec !== null && totalRestSec >= targetSec) {
    addReason('rest-exceeds-or-equals-target');
    if (!input.adapterIssues.some((i) => i.code === 'rest-exceeds-or-equals-target')) {
      feasibilityIssues.push({
        id: 'feasibility-issue-rest-exceeds-target',
        code: 'rest-exceeds-or-equals-target',
        category: 'rest-budget',
        severity: 'blocking',
        blocking: true,
        stepIds: seedRestSteps.map((s) => s.stepId),
        stepIndices: seedRestSteps.map((s) => s.index),
        relatedExerciseIds: [],
        titleKo: '휴식 합계가 전체 목표 수업 시간 이상임',
        messageKo: `휴식 시간 합계(${formatDurationSecondsKo(totalRestSec)})가 목표 수업 시간(${formatDurationSecondsKo(targetSec)}) 이상이어서 동작을 배정할 수 없습니다.`,
      });
    }
  }

  const seedExerciseSteps = input.seedSteps.filter((s) => s.kind === 'exercise');
  const lockedExerciseSteps = seedExerciseSteps.filter((s) => s.locked);
  const unlockedExerciseSteps = seedExerciseSteps.filter((s) => !s.locked);

  // Check if any locked step has an unknown or incompatible exercise or duplicate family
  const lockedFamilies = new Set<string>();
  const incompatibleLockedStepIds: string[] = [];
  const incompatibleLockedIndices: number[] = [];
  const incompatibleLockedExerciseIds: string[] = [];

  for (const lockedStep of lockedExerciseSteps) {
    const ex = verifiableMap.get(lockedStep.exerciseId);
    if (!ex || !exerciseMatchesRequest(ex, input, strictPropsFilter)) {
      incompatibleLockedStepIds.push(lockedStep.stepId);
      incompatibleLockedIndices.push(lockedStep.index);
      if (lockedStep.exerciseId) incompatibleLockedExerciseIds.push(lockedStep.exerciseId);
      continue;
    }
    const fam = getMovementKey(ex);
    if (lockedFamilies.has(fam)) {
      incompatibleLockedStepIds.push(lockedStep.stepId);
      incompatibleLockedIndices.push(lockedStep.index);
      incompatibleLockedExerciseIds.push(ex.id);
    }
    lockedFamilies.add(fam);
  }

  if (incompatibleLockedStepIds.length > 0) {
    addReason('locked-step-has-unknown-or-incompatible-exercise');
    feasibilityIssues.push({
      id: 'feasibility-issue-locked-incompatible',
      code: 'locked-steps-exceed-target',
      category: 'target-impossibility',
      severity: 'blocking',
      blocking: true,
      stepIds: incompatibleLockedStepIds,
      stepIndices: incompatibleLockedIndices,
      relatedExerciseIds: incompatibleLockedExerciseIds,
      titleKo: '잠긴(locked) 항목의 동작 조건 불일치 또는 중복',
      messageKo:
        '유지하도록 잠긴 항목 중에 카탈로그 미등록 동작, 선택한 기구·난이도·소도구 조건과 맞지 않는 동작, 또는 동일 계열 중복 동작이 포함되어 있습니다.',
    });
  }

  const lockedExerciseSec = lockedExerciseSteps.reduce((acc, s) => acc + s.totalSec, 0);

  if (targetSec !== null && lockedExerciseSec + totalRestSec > targetSec) {
    addReason('locked-steps-exceed-target');
    feasibilityIssues.push({
      id: 'feasibility-issue-locked-exceeds-target',
      code: 'locked-steps-exceed-target',
      category: 'target-impossibility',
      severity: 'blocking',
      blocking: true,
      stepIds: lockedExerciseSteps.map((s) => s.stepId),
      stepIndices: lockedExerciseSteps.map((s) => s.index),
      relatedExerciseIds: lockedExerciseSteps.map((s) => s.exerciseId).filter(Boolean),
      titleKo: '잠긴 동작과 휴식 시간의 합이 목표 시간을 초과함',
      messageKo: `잠긴 동작 시간(${formatDurationSecondsKo(lockedExerciseSec)})과 휴식 시간(${formatDurationSecondsKo(totalRestSec)})의 합계(${formatDurationSecondsKo(lockedExerciseSec + totalRestSec)})가 목표 수업 시간(${formatDurationSecondsKo(targetSec)})을 초과합니다.`,
    });
  }

  if (
    targetSec !== null &&
    seedExerciseSteps.length > 0 &&
    unlockedExerciseSteps.length === 0 &&
    lockedExerciseSec + totalRestSec !== targetSec
  ) {
    addReason('all-steps-locked-time-mismatch');
    feasibilityIssues.push({
      id: 'feasibility-issue-all-steps-locked',
      code: 'all-steps-locked-time-mismatch',
      category: 'target-impossibility',
      severity: 'blocking',
      blocking: true,
      stepIds: lockedExerciseSteps.map((s) => s.stepId),
      stepIndices: lockedExerciseSteps.map((s) => s.index),
      relatedExerciseIds: lockedExerciseSteps.map((s) => s.exerciseId).filter(Boolean),
      titleKo: '모든 동작이 잠겨 있어 목표 시간 조정 불가능',
      messageKo: `시드의 모든 동작 항목(${lockedExerciseSteps.length}개, 합계 ${formatDurationSecondsKo(lockedExerciseSec + totalRestSec)})이 잠겨 있어 목표 시간(${formatDurationSecondsKo(targetSec)})에 맞출 수 없습니다.`,
    });
  }

  const remainingAdjustableExerciseSec =
    targetSec !== null ? targetSec - totalRestSec - lockedExerciseSec : null;

  const uniqueFamiliesInPool = new Set(eligibleExercises.map(getMovementKey));
  for (const fam of lockedFamilies) {
    uniqueFamiliesInPool.delete(fam);
  }
  const uniqueMovementFamilyCount = uniqueFamiliesInPool.size + lockedFamilies.size;

  // Check equipment coverage
  const requiredEquipmentToCover = computeRequiredEquipmentToCover(input, rawReq);
  const lockedCoveredEquip = new Set(
    lockedExerciseSteps.flatMap((s) => {
      const ex = verifiableMap.get(s.exerciseId);
      return ex ? getExerciseEquipment(ex).requiredEquipment : [];
    }),
  );
  const stillMissingEquipment = requiredEquipmentToCover.filter(
    (eqId) => !lockedCoveredEquip.has(eqId),
  );
  const unlockedPool = eligibleExercises.filter(
    (ex) => !lockedFamilies.has(getMovementKey(ex)),
  );
  const coverageCheck = findDeterministicEquipmentCoverage(
    unlockedPool,
    stillMissingEquipment,
    input,
    new Set(),
  );

  // Minimum required movement count & adjustable floor
  let minRequiredMovementCount: number;
  let minRequiredAdjustableSec: number;
  let maxAdjustableSteps: number;

  if (seedExerciseSteps.length > 0) {
    minRequiredMovementCount = seedExerciseSteps.length;
    minRequiredAdjustableSec = unlockedExerciseSteps.reduce(
      (acc, s) =>
        acc +
        minimumStepFloorSec({
          explanationSec: s.explanationSec,
          transitionSec: s.transitionSec,
        }),
      0,
    );
    maxAdjustableSteps = unlockedExerciseSteps.length;
  } else {
    minRequiredMovementCount = Math.max(3, coverageCheck.exercises.length);
    // In a fresh sequence, step 1 has 20s exp + 0s trans + 30s mov -> floor 60s.
    // Subsequent steps have at least 20s exp + 15s trans + 30s mov = 65s (or 45s trans on equipment change -> 95s).
    const firstStepMin = 60;
    const subsequentMin = Math.max(0, minRequiredMovementCount - 1) * 65;
    minRequiredAdjustableSec = firstStepMin + subsequentMin;
    maxAdjustableSteps = uniqueFamiliesInPool.size;
  }

  if (
    eligibleExercises.length === 0 ||
    !coverageCheck.covered ||
    (seedExerciseSteps.length === 0 && uniqueMovementFamilyCount < minRequiredMovementCount)
  ) {
    addReason('insufficient-verifiable-catalog-movements');
    const detailEquip =
      coverageCheck.missingEquipment.length > 0
        ? ` (부족한 기구: ${coverageCheck.missingEquipment.map(equipmentLabelKo).join(', ')})`
        : '';
    feasibilityIssues.push({
      id: 'feasibility-issue-insufficient-catalog',
      code: 'insufficient-verifiable-catalog-movements',
      category: 'target-impossibility',
      severity: 'blocking',
      blocking: true,
      stepIds: [],
      stepIndices: [],
      relatedExerciseIds: [],
      titleKo: '조건에 맞는 검증 가능한 카탈로그 동작 부족',
      messageKo: `선택한 기구·소도구·난이도 조건을 만족하는 고유 카탈로그 동작(${uniqueMovementFamilyCount}종)이 부족하여 중복 없이 수업을 구성할 수 없습니다${detailEquip}.`,
    });
  }

  const minAchievableExerciseSec = lockedExerciseSec + minRequiredAdjustableSec;
  const maxAchievableExerciseSec =
    lockedExerciseSec + maxAdjustableSteps * PRESET_SUGGESTION_LIMITS.MAX_STEP_TOTAL_SEC;
  const minAchievableTotalSec = totalRestSec + minAchievableExerciseSec;
  const maxAchievableTotalSec = totalRestSec + maxAchievableExerciseSec;

  if (
    targetSec !== null &&
    remainingAdjustableExerciseSec !== null &&
    remainingAdjustableExerciseSec >= 0 &&
    unlockedExerciseSteps.length === 0 &&
    seedExerciseSteps.length > 0
  ) {
    // Handled above by all-steps-locked-time-mismatch if remainingAdjustableExerciseSec !== 0
  } else if (
    targetSec !== null &&
    remainingAdjustableExerciseSec !== null &&
    remainingAdjustableExerciseSec >= 0 &&
    remainingAdjustableExerciseSec < minRequiredAdjustableSec
  ) {
    if (totalRestSec > 0 && targetSec - lockedExerciseSec >= minRequiredAdjustableSec) {
      addReason('rest-leaves-insufficient-exercise-time');
      feasibilityIssues.push({
        id: 'feasibility-issue-rest-leaves-insufficient-time',
        code: 'rest-leaves-insufficient-exercise-time',
        category: 'rest-budget',
        severity: 'blocking',
        blocking: true,
        stepIds: seedRestSteps.map((s) => s.stepId),
        stepIndices: seedRestSteps.map((s) => s.index),
        relatedExerciseIds: [],
        titleKo: '쉬는 시간을 제외하면 최소 동작 수행 시간을 확보할 수 없음',
        messageKo: `목표 시간(${formatDurationSecondsKo(targetSec)})에서 휴식(${formatDurationSecondsKo(totalRestSec)})과 잠긴 동작(${formatDurationSecondsKo(lockedExerciseSec)})을 뺀 잔여 시간(${formatDurationSecondsKo(remainingAdjustableExerciseSec)})이 최소 필요 동작 시간(${formatDurationSecondsKo(minRequiredAdjustableSec)})보다 부족합니다.`,
      });
    }
    addReason('minimum-step-duration-exceeds-target');
    feasibilityIssues.push({
      id: 'feasibility-issue-min-step-exceeds-target',
      code: 'minimum-step-duration-exceeds-target',
      category: 'target-impossibility',
      severity: 'blocking',
      blocking: true,
      stepIds: unlockedExerciseSteps.map((s) => s.stepId),
      stepIndices: unlockedExerciseSteps.map((s) => s.index),
      relatedExerciseIds: unlockedExerciseSteps.map((s) => s.exerciseId).filter(Boolean),
      titleKo: '각 동작의 최소 수행·설명·전환 시간 합계가 목표 시간을 초과함',
      messageKo: `각 동작의 최소 보장 시간(최소 ${PRESET_SUGGESTION_LIMITS.MIN_MOVEMENT_SEC}초 수행 + 설명·전환, 스텝당 최소 ${PRESET_SUGGESTION_LIMITS.MIN_ADJUSTABLE_STEP_FLOOR_SEC}초)을 유지하면 최소 ${formatDurationSecondsKo(minAchievableTotalSec)}가 필요하여 목표 시간(${formatDurationSecondsKo(targetSec)})에 맞출 수 없습니다.`,
    });
  }

  if (
    targetSec !== null &&
    remainingAdjustableExerciseSec !== null &&
    remainingAdjustableExerciseSec >
      maxAdjustableSteps * PRESET_SUGGESTION_LIMITS.MAX_STEP_TOTAL_SEC
  ) {
    addReason('maximum-step-cap-cannot-reach-target');
    feasibilityIssues.push({
      id: 'feasibility-issue-max-cap-cannot-reach-target',
      code: 'maximum-step-cap-cannot-reach-target',
      category: 'target-impossibility',
      severity: 'blocking',
      blocking: true,
      stepIds: unlockedExerciseSteps.map((s) => s.stepId),
      stepIndices: unlockedExerciseSteps.map((s) => s.index),
      relatedExerciseIds: unlockedExerciseSteps.map((s) => s.exerciseId).filter(Boolean),
      titleKo: '스텝당 20분 상한 및 중복 동작 금지 계약으로 목표 시간 도달 불가능',
      messageKo: `각 동작 블록의 최대 시간 상한(${PRESET_SUGGESTION_LIMITS.MAX_STEP_TOTAL_SEC / 60}분)과 동일 동작 반복 금지 원칙을 지키면 최대 ${formatDurationSecondsKo(maxAchievableTotalSec)}까지만 구성 가능하여 목표 시간(${formatDurationSecondsKo(targetSec)})에 도달할 수 없습니다.`,
    });
  }

  const hasBlockingAdapterIssue = input.adapterIssues.some((issue) => issue.blocking);
  const feasible = impossibilityReasons.length === 0 && !hasBlockingAdapterIssue;

  const headlineKo = feasible
    ? `목표 ${formatDurationSecondsKo(targetSec)} (운동 ${formatDurationSecondsKo((targetSec ?? 0) - totalRestSec)} · 휴식 ${formatDurationSecondsKo(totalRestSec)}) 조건으로 검증 카탈로그 동작 조합이 가능합니다 (가능 범위: ${formatDurationSecondsKo(minAchievableTotalSec)} ~ ${formatDurationSecondsKo(maxAchievableTotalSec)}).`
    : `목표 시간 또는 입력 경계 조건 위반(${impossibilityReasons.length > 0 ? impossibilityReasons.join(', ') : '입력 진단 오류'})으로 인해 추천 초안 생성을 보류했습니다.`;

  const feasibility: TargetFeasibilityReport = deepFreezeCandidateResult({
    feasible,
    impossibilityReasons,
    targetMinutes: input.targetMinutes,
    targetSec,
    requestedRestSec,
    seedRestSec,
    totalRestSec,
    lockedExerciseSec,
    remainingAdjustableExerciseSec,
    minRequiredExerciseSec: minAchievableExerciseSec,
    maxAchievableExerciseSec,
    minAchievableTotalSec,
    maxAchievableTotalSec,
    eligibleExerciseCount: eligibleExercises.length,
    uniqueMovementFamilyCount,
    minRequiredMovementCount,
    headlineKo,
  });

  return {
    feasibility,
    feasibilityIssues,
    eligibleExercises,
    verifiableMap,
  };
}

/**
 * Ensures any split `'left'` and `'right'` steps for the same exercise have identical
 * `durationMin`, `explanationSec`, and `transitionSec` while preserving the exact total seconds.
 */
function enforceSplitUnilateralParity(steps: SequenceStep[]): SequenceStep[] {
  const result = steps.map((s) => ({ ...s }));
  const groups = new Map<string, { leftIndices: number[]; rightIndices: number[] }>();

  result.forEach((step, idx) => {
    if (isRestStep(step)) return;
    if (step.sideMode === 'left' || step.sideMode === 'right') {
      const entry = groups.get(step.exerciseId) ?? { leftIndices: [], rightIndices: [] };
      if (step.sideMode === 'left') entry.leftIndices.push(idx);
      else entry.rightIndices.push(idx);
      groups.set(step.exerciseId, entry);
    }
  });

  for (const [, group] of groups) {
    const pairCount = Math.min(group.leftIndices.length, group.rightIndices.length);
    for (let i = 0; i < pairCount; i++) {
      const lIdx = group.leftIndices[i];
      const rIdx = group.rightIndices[i];
      const lStep = result[lIdx];
      const rStep = result[rIdx];
      if (lStep.locked || rStep.locked) continue;

      const lSec = Math.round(lStep.durationMin * 60);
      const rSec = Math.round(rStep.durationMin * 60);
      const sumSec = lSec + rSec;

      const sharedExp = Math.min(lStep.explanationSec ?? 20, rStep.explanationSec ?? 20);
      const sharedTrans = Math.min(lStep.transitionSec ?? 15, rStep.transitionSec ?? 15);

      if (sumSec % 2 === 0) {
        const halfSec = sumSec / 2;
        result[lIdx] = {
          ...lStep,
          durationMin: halfSec / 60,
          explanationSec: sharedExp,
          transitionSec: sharedTrans,
        };
        result[rIdx] = {
          ...rStep,
          durationMin: halfSec / 60,
          explanationSec: sharedExp,
          transitionSec: sharedTrans,
        };
      } else {
        // Borrow or lend 1 second from a non-split unlocked exercise step so both sides match to the exact second
        const donorIdx = result.findIndex(
          (s, idx) =>
            idx !== lIdx &&
            idx !== rIdx &&
            !isRestStep(s) &&
            !s.locked &&
            s.sideMode !== 'left' &&
            s.sideMode !== 'right' &&
            Math.round(s.durationMin * 60) > minimumStepFloorSec(s),
        );
        if (donorIdx >= 0) {
          const donorSec = Math.round(result[donorIdx].durationMin * 60) - 1;
          result[donorIdx] = { ...result[donorIdx], durationMin: donorSec / 60 };
          const halfSec = (sumSec + 1) / 2;
          result[lIdx] = {
            ...lStep,
            durationMin: halfSec / 60,
            explanationSec: sharedExp,
            transitionSec: sharedTrans,
          };
          result[rIdx] = {
            ...rStep,
            durationMin: halfSec / 60,
            explanationSec: sharedExp,
            transitionSec: sharedTrans,
          };
        }
      }
    }
  }

  return result;
}

function insertMidpointRestStep(
  exerciseSteps: SequenceStep[],
  restMinutes: number,
  candidateId: string,
): SequenceStep[] {
  if (restMinutes <= 0) {
    return exerciseSteps.map((s, idx) => ({ ...s, order: idx + 1 }));
  }
  const restStep: SequenceStep = {
    kind: 'rest',
    stepId: `${candidateId}-rest-1`,
    order: exerciseSteps.length + 1,
    blockCategory: 'core',
    exerciseId: '',
    durationMin: restMinutes,
    selectedLayer: 'standard',
  };

  const halfwaySec = getSequenceDurations(exerciseSteps).exerciseSec / 2;
  let elapsed = 0;
  let insertion = 1;
  let bestDistance = Infinity;

  exerciseSteps.forEach((step, idx) => {
    elapsed += getStepTiming(step).totalSec;
    // Do not split an immediate left->right pair at the midpoint
    const nextStep = exerciseSteps[idx + 1];
    const isMidSplitPair =
      step.sideMode === 'left' &&
      nextStep &&
      nextStep.sideMode === 'right' &&
      nextStep.exerciseId === step.exerciseId;

    if (
      !isMidSplitPair &&
      (exerciseSteps.length === 1 || idx < exerciseSteps.length - 1) &&
      Math.abs(elapsed - halfwaySec) < bestDistance
    ) {
      insertion = idx + 1;
      bestDistance = Math.abs(elapsed - halfwaySec);
    }
  });

  const combined = [...exerciseSteps];
  combined.splice(insertion, 0, restStep);
  return combined.map((step, idx) => ({ ...step, order: idx + 1 }));
}

function buildStepDetailsAndSummaries(
  steps: readonly SequenceStep[],
  verifiableMap: Map<string, PilatesExercise>,
  targetMinutes: number,
): {
  stepDetails: CandidateStepTimingDetail[];
  timing: CandidateTimeSummary;
  unilateral: CandidateUnilateralSummary;
} {
  let exerciseSec = 0;
  let restSec = 0;
  let movementSec = 0;
  let explanationSec = 0;
  let transitionSec = 0;
  let minStepTotalSec = Infinity;
  let maxStepTotalSec = 0;
  let minMovementSec = Infinity;

  let unilateralExerciseStepCount = 0;
  let sequentialBothStepCount = 0;
  let splitLeftStepCount = 0;
  let splitRightStepCount = 0;
  let bilateralTogetherStepCount = 0;
  let leftTotalSec = 0;
  let rightTotalSec = 0;
  let minPerSideSec: number | null = null;
  const unilateralTogetherMismatchIds: string[] = [];

  const splitByExercise = new Map<
    string,
    { leftSec: number; rightSec: number; leftCount: number; rightCount: number }
  >();

  const stepDetails: CandidateStepTimingDetail[] = steps.map((step, idx) => {
    const ex = isRestStep(step) ? undefined : verifiableMap.get(step.exerciseId);
    const stepTiming = getStepTiming(step, ex);
    const sideLabelsKo = getStepSideLabels(step, ex);
    const classSection: ClassSectionRole =
      step.classSection ?? getMovementSectionRole(step.blockCategory);

    if (isRestStep(step)) {
      restSec += stepTiming.totalSec;
      return {
        stepId: step.stepId,
        order: idx + 1,
        kind: 'rest',
        exerciseId: '',
        exerciseNameKo: '휴식 (Rest)',
        blockCategory: step.blockCategory,
        classSection,
        isUnilateral: false,
        sideLabelsKo: [],
        sides: 1,
        totalSec: stepTiming.totalSec,
        movementSec: 0,
        perSideSec: 0,
        explanationSec: 0,
        transitionSec: 0,
        restSec: stepTiming.totalSec,
        durationMin: step.durationMin,
        locked: Boolean(step.locked),
      };
    }

    exerciseSec += stepTiming.totalSec;
    movementSec += stepTiming.movementSec;
    explanationSec += stepTiming.explanationSec;
    transitionSec += stepTiming.transitionSec;
    minStepTotalSec = Math.min(minStepTotalSec, stepTiming.totalSec);
    maxStepTotalSec = Math.max(maxStepTotalSec, stepTiming.totalSec);
    minMovementSec = Math.min(minMovementSec, stepTiming.movementSec);

    const isUnilateral = Boolean(ex?.isUnilateral);
    if (isUnilateral) {
      unilateralExerciseStepCount += 1;
      if (step.sideMode === 'together') {
        if (!unilateralTogetherMismatchIds.includes(step.exerciseId)) {
          unilateralTogetherMismatchIds.push(step.exerciseId);
        }
      }
    }

    if (step.sideMode === 'left-then-right' || step.sideMode === 'right-then-left' || (!step.sideMode && isUnilateral)) {
      sequentialBothStepCount += 1;
      leftTotalSec += stepTiming.perSideSec;
      rightTotalSec += stepTiming.perSideSec;
      minPerSideSec =
        minPerSideSec === null
          ? stepTiming.perSideSec
          : Math.min(minPerSideSec, stepTiming.perSideSec);
    } else if (step.sideMode === 'left') {
      splitLeftStepCount += 1;
      leftTotalSec += stepTiming.movementSec;
      minPerSideSec =
        minPerSideSec === null
          ? stepTiming.movementSec
          : Math.min(minPerSideSec, stepTiming.movementSec);
      const entry = splitByExercise.get(step.exerciseId) ?? {
        leftSec: 0,
        rightSec: 0,
        leftCount: 0,
        rightCount: 0,
      };
      entry.leftSec += stepTiming.movementSec;
      entry.leftCount += 1;
      splitByExercise.set(step.exerciseId, entry);
    } else if (step.sideMode === 'right') {
      splitRightStepCount += 1;
      rightTotalSec += stepTiming.movementSec;
      minPerSideSec =
        minPerSideSec === null
          ? stepTiming.movementSec
          : Math.min(minPerSideSec, stepTiming.movementSec);
      const entry = splitByExercise.get(step.exerciseId) ?? {
        leftSec: 0,
        rightSec: 0,
        leftCount: 0,
        rightCount: 0,
      };
      entry.rightSec += stepTiming.movementSec;
      entry.rightCount += 1;
      splitByExercise.set(step.exerciseId, entry);
    } else {
      bilateralTogetherStepCount += 1;
    }

    return {
      stepId: step.stepId,
      order: idx + 1,
      kind: 'exercise',
      exerciseId: step.exerciseId,
      exerciseNameKo: ex?.nameKo ?? step.exerciseId,
      apparatus: ex?.apparatus,
      blockCategory: step.blockCategory,
      classSection,
      isUnilateral,
      sideMode: step.sideMode,
      sideLabelsKo,
      sides: stepTiming.sides,
      totalSec: stepTiming.totalSec,
      movementSec: stepTiming.movementSec,
      perSideSec: stepTiming.perSideSec,
      explanationSec: stepTiming.explanationSec,
      transitionSec: stepTiming.transitionSec,
      restSec: 0,
      durationMin: step.durationMin,
      locked: Boolean(step.locked),
    };
  });

  const imbalancedExerciseIds: string[] = [];
  for (const [exId, split] of splitByExercise) {
    if (split.leftCount !== split.rightCount || split.leftSec !== split.rightSec) {
      imbalancedExerciseIds.push(exId);
    }
  }

  const totalSec = exerciseSec + restSec;
  const targetSec = Math.round(targetMinutes * 60);
  const deltaSec = totalSec - targetSec;
  const safeMinStep = minStepTotalSec === Infinity ? 0 : minStepTotalSec;
  const safeMinMove = minMovementSec === Infinity ? 0 : minMovementSec;

  const withinStepDurationBounds =
    safeMinStep >= PRESET_SUGGESTION_LIMITS.MIN_STEP_TOTAL_SEC &&
    maxStepTotalSec <= PRESET_SUGGESTION_LIMITS.MAX_STEP_TOTAL_SEC &&
    safeMinMove >= PRESET_SUGGESTION_LIMITS.MIN_MOVEMENT_SEC;

  const timing: CandidateTimeSummary = {
    targetMinutes,
    targetSec,
    totalSec,
    totalMinutes: Number((totalSec / 60).toFixed(2)),
    exerciseSec,
    restSec,
    movementSec,
    explanationSec,
    transitionSec,
    deltaSec,
    exactTargetMatch: deltaSec === 0,
    minStepTotalSec: safeMinStep,
    maxStepTotalSec,
    minMovementSec: safeMinMove,
    withinStepDurationBounds,
  };

  const leftRightDiffSec = Math.abs(leftTotalSec - rightTotalSec);
  const unilateralBalanced =
    imbalancedExerciseIds.length === 0 &&
    unilateralTogetherMismatchIds.length === 0 &&
    leftRightDiffSec === 0 &&
    (minPerSideSec === null || minPerSideSec >= PRESET_SUGGESTION_LIMITS.MIN_PER_SIDE_SEC);

  const unilateral: CandidateUnilateralSummary = {
    unilateralBalanced,
    unilateralExerciseStepCount,
    sequentialBothStepCount,
    splitLeftStepCount,
    splitRightStepCount,
    bilateralTogetherStepCount,
    leftTotalSec,
    rightTotalSec,
    leftRightDiffSec,
    minPerSideSec,
    imbalancedExerciseIds,
    unilateralTogetherMismatchIds,
    summaryKo:
      unilateralExerciseStepCount === 0
        ? '양측 동시(together) 동작으로만 구성된 초안입니다.'
        : `편측 동작 ${unilateralExerciseStepCount}개 (양쪽 순차 ${sequentialBothStepCount}개 · 좌우 분할 ${splitLeftStepCount + splitRightStepCount}개) — 좌 ${formatDurationSecondsKo(leftTotalSec)} / 우 ${formatDurationSecondsKo(rightTotalSec)} (차이 ${formatDurationSecondsKo(leftRightDiffSec)})`,
  };

  return { stepDetails, timing, unilateral };
}

function finalizeCandidate(params: {
  candidateId: string;
  rank: number;
  matchScore: number;
  sourceTier: PresetCandidateSourceTier;
  sourcePresetId?: string;
  sourceBlockPresetIds: readonly string[];
  titleKo: string;
  subtitleKo: string;
  rationaleKo: string;
  editingGuideKo: string;
  input: NormalizedPresetSuggestionInput;
  rawSteps: SequenceStep[];
  verifiableMap: Map<string, PilatesExercise>;
  historyLogs: readonly ClassHistoryLog[];
  referenceIso: string;
}): PresetSuggestionCandidate | null {
  const {
    candidateId,
    rank,
    matchScore,
    sourceTier,
    sourcePresetId,
    sourceBlockPresetIds,
    titleKo,
    subtitleKo,
    rationaleKo,
    editingGuideKo,
    input,
    rawSteps,
    verifiableMap,
    historyLogs,
    referenceIso,
  } = params;

  if (input.targetMinutes === null) return null;

  // Verify every non-rest step references a verifiable catalog exercise ID
  const verifiedExerciseIds: string[] = [];
  for (const step of rawSteps) {
    if (isRestStep(step)) continue;
    const ex = verifiableMap.get(step.exerciseId);
    if (!ex) return null;
    verifiedExerciseIds.push(ex.id);
  }
  if (verifiedExerciseIds.length === 0) return null;

  // Attach fresh catalog snapshots and deterministic stepIds
  const detachedSteps: SequenceStep[] = rawSteps.map((step, idx) => {
    if (isRestStep(step)) {
      return {
        kind: 'rest',
        stepId: step.stepId || `${candidateId}-step-${idx + 1}-rest`,
        order: idx + 1,
        blockCategory: step.blockCategory ?? 'core',
        exerciseId: '',
        durationMin: step.durationMin,
        selectedLayer: 'standard',
        instructorNote: step.instructorNote,
        locked: Boolean(step.locked),
      };
    }
    const ex = verifiableMap.get(step.exerciseId)!;
    const sideMode: StepSideMode =
      step.sideMode && (!ex.isUnilateral || step.sideMode !== 'together')
        ? step.sideMode
        : ex.isUnilateral
          ? 'left-then-right'
          : 'together';

    return {
      ...step,
      kind: 'exercise',
      stepId: step.stepId || `${candidateId}-step-${idx + 1}-${ex.id}`,
      order: idx + 1,
      blockCategory: step.blockCategory ?? ex.blockCategory,
      classSection: step.classSection ?? getMovementSectionRole(step.blockCategory ?? ex.blockCategory),
      exerciseId: ex.id,
      sideMode,
      selectedLayer: step.selectedLayer ?? input.defaultLayer,
      locked: Boolean(step.locked),
      exerciseSnapshot: createMovementSnapshot(ex, referenceIso),
    };
  });

  const { stepDetails, timing, unilateral } = buildStepDetailsAndSummaries(
    detachedSteps,
    verifiableMap,
    input.targetMinutes,
  );

  if (
    !timing.exactTargetMatch ||
    !timing.withinStepDurationBounds ||
    !unilateral.unilateralBalanced
  ) {
    return null;
  }

  // Health/rehab claim safety check on all generated text
  const textSafety = inspectUnverifiedHealthOrRehabClaims(
    [titleKo, subtitleKo, rationaleKo, editingGuideKo, DEFAULT_PRESET_SUGGESTION_TRUTH_BOUNDARY.disclaimerKo].join(' '),
  );
  if (!textSafety.safe) {
    return null;
  }

  const requiredEquipment = [
    ...new Set(
      verifiedExerciseIds.flatMap(
        (id) => getExerciseEquipment(verifiableMap.get(id)!).requiredEquipment,
      ),
    ),
  ];

  const recommendedProps = [
    ...new Set(
      verifiedExerciseIds.flatMap((id) =>
        verifiableMap.get(id)!.props.filter((p): p is PropType => p !== 'none'),
      ),
    ),
  ];

  const analytics = analyzeSequence(
    detachedSteps,
    verifiableMap,
    [...historyLogs],
    input.targetGroupId,
    input.targetMinutes,
  );

  const themeMeta = THEME_META_BY_ID.get(input.theme);
  const themeLabelKo = themeMeta?.labelKo ?? input.theme;
  const restMinutes = Number((timing.restSec / 60).toFixed(2));

  const criteriaSnapshot: AutoGenerateCriteria = {
    apparatus: input.apparatus,
    availableEquipment: [...input.availableEquipment],
    level: input.level,
    focusPreset: input.focusPreset,
    preferredProps: [...input.preferredProps],
    excludeDaysWindow: input.excludeDaysWindow,
    targetGroupId: input.targetGroupId,
    targetMinutes: input.targetMinutes,
    restMinutes: restMinutes > 0 ? restMinutes : undefined,
    defaultLayer: input.defaultLayer,
  };

  const sequenceDraft: SavedSequence = {
    id: `seq-${candidateId}`,
    title: titleKo,
    subtitle: subtitleKo,
    apparatus: input.apparatus,
    level: input.level,
    focusTags: [themeLabelKo, SOURCE_TIER_LABELS_KO[sourceTier], '편집 가능한 초안'],
    targetMinutes: input.targetMinutes,
    steps: detachedSteps.map((s) => ({ ...s })),
    createdAt: referenceIso,
    updatedAt: referenceIso,
    taughtCount: 0,
    version: 1,
    criteriaSnapshot,
    sourceProvenance: {
      kind: sourcePresetId ? 'saved-sequence-clone' : 'manual',
      sourceId: sourcePresetId ?? candidateId,
      sourceTitle: titleKo,
      sourceSequenceId: sourcePresetId,
      sourceVersion: 1,
      clonedAt: referenceIso,
      summaryKo: `${SOURCE_TIER_LABELS_KO[sourceTier]} (${candidateId}) — 기존 카탈로그 동작 ID 조합 초안`,
    },
  };

  const conditionTemplate: ConditionTemplate = {
    id: `tpl-${candidateId}`,
    name: `${titleKo} 조건 템플릿`,
    criteria: {
      ...criteriaSnapshot,
      availableEquipment: [...input.availableEquipment],
      preferredProps: [...input.preferredProps],
    },
    createdAt: referenceIso,
  };

  return {
    candidateId,
    rank,
    matchScore: Math.min(100, Math.max(1, Math.round(matchScore))),
    sourceTier,
    sourceTierLabelKo: SOURCE_TIER_LABELS_KO[sourceTier],
    sourcePresetId,
    sourceBlockPresetIds: [...sourceBlockPresetIds],
    titleKo,
    subtitleKo,
    rationaleKo,
    editingGuideKo,
    apparatus: input.apparatus,
    requiredEquipment,
    recommendedProps,
    theme: input.theme,
    themeLabelKo,
    focusPreset: input.focusPreset,
    level: input.level,
    targetMinutes: input.targetMinutes,
    restMinutes,
    transitionScore: analytics.transitionScore,
    verifiedExerciseIds,
    steps: detachedSteps,
    stepDetails,
    timing,
    unilateral,
    sequenceDraft,
    conditionTemplate,
    truthBoundary: DEFAULT_PRESET_SUGGESTION_TRUTH_BOUNDARY,
  };
}

/**
 * Tier 1: Exact or duration/rest-adapted candidates from `OFFLINE_CLASS_PRESETS`.
 */
function buildTier1ClassPresetCandidates(params: {
  input: NormalizedPresetSuggestionInput;
  classPresets: readonly OfflineClassPreset[];
  verifiableMap: Map<string, PilatesExercise>;
  strictPropsFilter: boolean;
  totalRestSec: number;
  historyLogs: readonly ClassHistoryLog[];
  referenceIso: string;
}): PresetSuggestionCandidate[] {
  const {
    input,
    classPresets,
    verifiableMap,
    strictPropsFilter,
    totalRestSec,
    historyLogs,
    referenceIso,
  } = params;

  if (input.seedSteps.length > 0 || input.targetMinutes === null) {
    return [];
  }

  const targetMinutes = input.targetMinutes;
  const restMinutes = totalRestSec / 60;

  const matchingPresets = classPresets
    .filter((preset) => {
      if (preset.apparatus !== input.apparatus) return false;
      if (!equipmentRequirementsSatisfied(preset.requiredEquipment, input.availableEquipment)) {
        return false;
      }
      if (Number(preset.level) > Number(input.level)) return false;
      return preset.steps.every((step) => {
        if (isRestStep(step)) return true;
        const ex = verifiableMap.get(step.exerciseId);
        return ex ? exerciseMatchesRequest(ex, input, strictPropsFilter) : false;
      });
    })
    .map((preset) => {
      let score = 70;
      const exactDuration = preset.durationMinutes === targetMinutes && totalRestSec === 0;
      if (exactDuration) score += 16;
      else {
        const diffMin = Math.abs(preset.durationMinutes - targetMinutes);
        score += Math.max(0, 12 - Math.round(diffMin / 4));
      }
      if (preset.theme === input.theme) score += 20;
      else if (preset.focusPreset === input.focusPreset) score += 12;
      if (preset.level === input.level) score += 6;
      return { preset, score, exactDuration };
    })
    .sort(
      (a, b) =>
        Number(b.exactDuration) - Number(a.exactDuration) ||
        b.score - a.score ||
        a.preset.id.localeCompare(b.preset.id),
    );

  const results: PresetSuggestionCandidate[] = [];

  for (const { preset, score, exactDuration } of matchingPresets) {
    if (results.length >= 2) break;
    const candidateId = exactDuration
      ? `cand-t1-exact-${preset.id}`
      : `cand-t1-adapted-${preset.id}-${targetMinutes}m-r${totalRestSec}s`;

    try {
      let steps: SequenceStep[] = preset.steps.map((s, idx) => ({
        ...s,
        stepId: `${candidateId}-step-${idx + 1}-${s.exerciseId || 'rest'}`,
        order: idx + 1,
        locked: false,
      }));

      if (!exactDuration) {
        const exerciseOnly = steps.filter((s) => !isRestStep(s));
        const withRest = insertMidpointRestStep(exerciseOnly, restMinutes, candidateId);
        const fitted = fitSequenceDuration(withRest, targetMinutes);
        steps = enforceSplitUnilateralParity(fitted);
      }

      const sourceTier: PresetCandidateSourceTier = exactDuration
        ? 'offline-class-preset-exact'
        : 'offline-class-preset-adapted';

      const candidate = finalizeCandidate({
        candidateId,
        rank: results.length + 1,
        matchScore: score,
        sourceTier,
        sourcePresetId: preset.id,
        sourceBlockPresetIds: preset.composedBlockPresetIds,
        titleKo: exactDuration
          ? `${preset.title} (프리셋 초안)`
          : `${preset.title} (${targetMinutes}분${restMinutes > 0 ? ` · 휴식 ${formatDurationSecondsKo(totalRestSec)}` : ''} 맞춤 초안)`,
        subtitleKo: preset.subtitle,
        rationaleKo: exactDuration
          ? `선택한 기구(${preset.apparatus})·주제(${preset.themeLabelKo})·목표 시간(${targetMinutes}분)에 정확히 부합하는 기존 오프라인 수업 프리셋('${preset.id}')의 편집용 복사본입니다.`
          : `기존 오프라인 수업 프리셋('${preset.id}', 기본 ${preset.durationMinutes}분)의 검증된 동작 구성을 유지하면서 목표 시간(${targetMinutes}분)과 휴식(${formatDurationSecondsKo(totalRestSec)})에 맞춰 스텝 시간을 비례 배분한 초안입니다.`,
        editingGuideKo: preset.editingGuideKo,
        input,
        rawSteps: steps,
        verifiableMap,
        historyLogs,
        referenceIso,
      });

      if (candidate) {
        results.push(candidate);
      }
    } catch {
      // If a preset cannot be fitted within 30s-20m bounds for the requested targetMinutes, skip it cleanly
    }
  }

  return results;
}

/**
 * Tier 2: Deterministic assembly of `preparation` + `main` + `cooldown` blocks from `OFFLINE_BLOCK_PRESETS`.
 */
function buildTier2BlockAssemblyCandidate(params: {
  input: NormalizedPresetSuggestionInput;
  blockPresets: readonly OfflineBlockPreset[];
  verifiableMap: Map<string, PilatesExercise>;
  strictPropsFilter: boolean;
  totalRestSec: number;
  historyLogs: readonly ClassHistoryLog[];
  referenceIso: string;
}): PresetSuggestionCandidate | null {
  const {
    input,
    blockPresets,
    verifiableMap,
    strictPropsFilter,
    totalRestSec,
    historyLogs,
    referenceIso,
  } = params;

  if (input.seedSteps.length > 0 || input.targetMinutes === null) {
    return null;
  }

  const targetMinutes = input.targetMinutes;
  const restMinutes = totalRestSec / 60;
  const exerciseSecBudget = Math.round(targetMinutes * 60) - totalRestSec;

  const eligibleBlocks = blockPresets.filter((block) => {
    if (input.apparatus !== 'mixed' && block.apparatus !== input.apparatus) return false;
    if (!equipmentRequirementsSatisfied(block.requiredEquipment, input.availableEquipment)) {
      return false;
    }
    if (Number(block.level) > Number(input.level)) return false;
    return block.items.every((item) => {
      const ex = verifiableMap.get(item.exerciseId);
      return ex ? exerciseMatchesRequest(ex, input, strictPropsFilter) : false;
    });
  });

  const prepBlocks = eligibleBlocks
    .filter((b) => b.sectionRole === 'preparation')
    .sort(
      (a, b) =>
        Number(b.theme === input.theme) - Number(a.theme === input.theme) ||
        a.id.localeCompare(b.id),
    );
  const mainBlocks = eligibleBlocks
    .filter((b) => b.sectionRole === 'main')
    .sort(
      (a, b) =>
        Number(b.theme === input.theme) - Number(a.theme === input.theme) ||
        a.id.localeCompare(b.id),
    );
  const cooldownBlocks = eligibleBlocks
    .filter((b) => b.sectionRole === 'cooldown')
    .sort(
      (a, b) =>
        Number(b.theme === input.theme) - Number(a.theme === input.theme) ||
        a.id.localeCompare(b.id),
    );

  if (prepBlocks.length === 0 || mainBlocks.length === 0) {
    return null;
  }

  const chosenBlocks: OfflineBlockPreset[] = [];
  const usedMovementFamilies = new Set<string>();

  const canAddBlock = (block: OfflineBlockPreset): boolean => {
    const familiesInBlock = new Set<string>();
    for (const item of block.items) {
      const ex = verifiableMap.get(item.exerciseId);
      if (!ex) return false;
      const key = getMovementKey(ex);
      if (usedMovementFamilies.has(key)) return false;
      familiesInBlock.add(key);
    }
    return true;
  };

  const commitBlock = (block: OfflineBlockPreset) => {
    chosenBlocks.push(block);
    for (const item of block.items) {
      const ex = verifiableMap.get(item.exerciseId);
      if (ex) usedMovementFamilies.add(getMovementKey(ex));
    }
  };

  const prepPick = prepBlocks.find(canAddBlock);
  if (!prepPick) return null;
  commitBlock(prepPick);

  const mainPick1 = mainBlocks.find(canAddBlock);
  if (!mainPick1) return null;
  commitBlock(mainPick1);

  if (exerciseSecBudget >= 35 * 60) {
    const mainPick2 = mainBlocks.find((b) => b.id !== mainPick1.id && canAddBlock(b));
    if (mainPick2) commitBlock(mainPick2);
  }

  const cooldownPick = cooldownBlocks.find(canAddBlock);
  if (cooldownPick) {
    commitBlock(cooldownPick);
  }

  const candidateId = `cand-t2-blocks-${chosenBlocks.map((b) => b.id).join('-')}-${targetMinutes}m`;

  const rawExerciseSteps: SequenceStep[] = [];
  chosenBlocks.forEach((block) => {
    block.items.forEach((item) => {
      const stepIdx = rawExerciseSteps.length;
      rawExerciseSteps.push({
        kind: 'exercise',
        stepId: `${candidateId}-step-${stepIdx + 1}-${item.exerciseId}`,
        order: stepIdx + 1,
        blockCategory: item.blockCategory,
        classSection: block.sectionRole,
        exerciseId: item.exerciseId,
        durationMin: item.durationMin,
        explanationSec: item.explanationSec ?? 20,
        transitionSec: item.transitionSec ?? (stepIdx === 0 ? 0 : 15),
        repetitions: item.repetitions,
        sets: item.sets,
        sideMode: item.sideMode,
        selectedLayer: item.selectedLayer ?? input.defaultLayer,
        customSpringOverride: item.customSpringOverride,
        instructorNote: item.instructorNote,
        sourceBlockId: block.id,
        sourceBlockVersion: block.version,
        sourceBlockTitle: block.title,
        locked: false,
      });
    });
  });

  try {
    const withTransitions = applyTransitionAllowances(rawExerciseSteps, verifiableMap);
    const withRest = insertMidpointRestStep(withTransitions, restMinutes, candidateId);
    const fitted = fitSequenceDuration(withRest, targetMinutes);
    const balanced = enforceSplitUnilateralParity(fitted);

    const themeMeta = THEME_META_BY_ID.get(input.theme);
    const apparatusLabel =
      input.apparatus === 'mixed' ? '혼합 기구' : APPARATUS_LABELS[input.apparatus].ko;

    return finalizeCandidate({
      candidateId,
      rank: 2,
      matchScore: 86,
      sourceTier: 'offline-block-preset-assembly',
      sourceBlockPresetIds: chosenBlocks.map((b) => b.id),
      titleKo: `${apparatusLabel} ${targetMinutes}분 ${themeMeta?.labelKo ?? ''} 블록 조합 초안`,
      subtitleKo: `${chosenBlocks.map((b) => b.title).join(' + ')} 기반 편집용 시퀀스`,
      rationaleKo: `기존 오프라인 재사용 블록 프리셋(${chosenBlocks.map((b) => `'${b.id}'`).join(', ')})을 도입·메인·마무리 흐름으로 조립하고 목표 시간(${targetMinutes}분)에 맞춘 초안입니다.`,
      editingGuideKo:
        '블록 단위로 묶인 동작 순서·반복 횟수·시간은 강사가 수업 대상에 맞춰 자유롭게 수정하거나 분리할 수 있습니다.',
      input,
      rawSteps: balanced,
      verifiableMap,
      historyLogs,
      referenceIso,
    });
  } catch {
    return null;
  }
}

/**
 * Tier 3: Deterministic composition directly from verifiable catalog exercise IDs (`INITIAL_EXERCISES`).
 * Also handles adapting/completing caller-supplied `seedSteps` (including locked steps).
 */
function buildTier3CatalogCompositionCandidate(params: {
  input: NormalizedPresetSuggestionInput;
  rawRequest?: PresetSuggestionRequest;
  eligibleExercises: readonly PilatesExercise[];
  verifiableMap: Map<string, PilatesExercise>;
  totalRestSec: number;
  historyLogs: readonly ClassHistoryLog[];
  referenceIso: string;
  variationIndex: number;
  penalizeIds?: ReadonlySet<string>;
}): PresetSuggestionCandidate | null {
  const {
    input,
    rawRequest,
    eligibleExercises,
    verifiableMap,
    totalRestSec,
    historyLogs,
    referenceIso,
    variationIndex,
    penalizeIds,
  } = params;

  if (input.targetMinutes === null) return null;
  const targetMinutes = input.targetMinutes;
  const restMinutes = totalRestSec / 60;
  const candidateId = `cand-t3-catalog-${input.apparatus}-${input.theme}-${targetMinutes}m-v${variationIndex + 1}`;

  const seedExerciseSteps = input.seedSteps.filter((s) => s.kind === 'exercise');
  const seedRestSteps = input.seedSteps.filter((s) => s.kind === 'rest');

  // Case A: Caller supplied seed exercise steps to retain/fit
  if (seedExerciseSteps.length > 0) {
    if (variationIndex > 0) return null;
    try {
      const rebuiltSteps: SequenceStep[] = input.seedSteps.map((s: NormalizedSeedStep, idx: number) => {
        if (s.kind === 'rest') {
          return {
            kind: 'rest',
            stepId: s.stepId,
            order: idx + 1,
            blockCategory: 'core',
            exerciseId: '',
            durationMin: s.durationMin,
            selectedLayer: 'standard',
            instructorNote: s.instructorNote,
            locked: s.locked,
          };
        }
        const ex = verifiableMap.get(s.exerciseId)!;
        return {
          kind: 'exercise',
          stepId: s.stepId,
          order: idx + 1,
          blockCategory: s.blockCategory,
          classSection: s.classSection,
          exerciseId: ex.id,
          durationMin: s.durationStatus === 'known' ? s.durationMin : ex.defaultDurationMin,
          explanationSec: s.explanationSec || PRESET_SUGGESTION_LIMITS.DEFAULT_EXPLANATION_SEC,
          transitionSec: s.transitionSec,
          repetitions: s.repetitions,
          sets: s.sets,
          sideMode: s.sideMode ?? (ex.isUnilateral ? 'left-then-right' : 'together'),
          selectedLayer: s.selectedLayer,
          customSpringOverride: s.customSpringOverride,
          instructorNote: s.instructorNote,
          locked: s.locked,
        };
      });

      const withAllowances = applyTransitionAllowances(rebuiltSteps, verifiableMap).map(
        (step, idx) => {
          const orig = rebuiltSteps[idx];
          if (orig.locked || isRestStep(orig)) return orig;
          return {
            ...step,
            transitionSec: Math.max(step.transitionSec ?? 0, orig.transitionSec ?? 0),
          };
        },
      );

      const withRequestedRest =
        seedRestSteps.length === 0 && restMinutes > 0
          ? insertMidpointRestStep(withAllowances, restMinutes, candidateId)
          : withAllowances.map((s, idx) => ({ ...s, order: idx + 1 }));

      const fitted = fitSequenceDuration(withRequestedRest, targetMinutes);
      const balanced = enforceSplitUnilateralParity(fitted);

      const themeMeta = THEME_META_BY_ID.get(input.theme);
      return finalizeCandidate({
        candidateId,
        rank: 1,
        matchScore: 90,
        sourceTier: 'catalog-deterministic-composition',
        sourceBlockPresetIds: [],
        titleKo: `시드 유지 · ${themeMeta?.labelKo ?? input.theme} ${targetMinutes}분 맞춤 초안`,
        subtitleKo: '기존 입력 동작 및 잠금 조건을 보존하여 목표 시간에 맞춘 편집용 시퀀스',
        rationaleKo: `입력된 시드 동작(${seedExerciseSteps.length}개)과 잠금 설정을 유지하면서 검증된 카탈로그 메타데이터와 목표 시간(${targetMinutes}분)에 맞게 시간을 배분한 초안입니다.`,
        editingGuideKo:
          '잠긴 항목은 기존 시간과 속성을 그대로 유지하며, 잠금 해제 후 자유롭게 순서를 바꾸거나 시간을 조절할 수 있습니다.',
        input,
        rawSteps: balanced,
        verifiableMap,
        historyLogs,
        referenceIso,
      });
    } catch {
      return null;
    }
  }

  // Case B: Fresh deterministic composition from verifiable catalog exercises
  const recentIds = getRecentlyTaughtExerciseIds(
    [...historyLogs],
    input.excludeDaysWindow,
    input.targetGroupId,
    new Date(referenceIso),
  );

  const requiredEquipment = computeRequiredEquipmentToCover(input, rawRequest);
  const coverage = findDeterministicEquipmentCoverage(
    eligibleExercises,
    requiredEquipment,
    input,
    recentIds,
  );
  if (!coverage.covered) return null;

  const selected: PilatesExercise[] = [...coverage.exercises];

  const pickNextExercise = (preferredCategory: ClassBlockCategory): PilatesExercise | undefined => {
    const usedKeys = new Set(selected.map(getMovementKey));
    const unused = eligibleExercises.filter((ex) => !usedKeys.has(getMovementKey(ex)));
    if (unused.length === 0) return undefined;

    const sameCategory = unused.filter((ex) => ex.blockCategory === preferredCategory);
    const mainPool = unused.filter(
      (ex) => !['warmup', 'cooldown'].includes(ex.blockCategory),
    );
    const candidates =
      sameCategory.length > 0 ? sameCategory : mainPool.length > 0 ? mainPool : unused;
    const usedIds = new Set(selected.map((ex) => ex.id));
    const prev = selected.at(-1);

    return [...candidates].sort(
      (a, b) =>
        scoreExerciseForThemeAndCriteria(b, input, recentIds, usedIds, prev, penalizeIds) -
          scoreExerciseForThemeAndCriteria(a, input, recentIds, usedIds, prev, penalizeIds) ||
        a.id.localeCompare(b.id),
    )[0];
  };

  // Ensure warmup and cooldown anchors
  for (const anchorCategory of ['warmup', 'cooldown'] as const) {
    if (!selected.some((ex) => ex.blockCategory === anchorCategory)) {
      const anchor = pickNextExercise(anchorCategory);
      if (anchor) selected.push(anchor);
    }
  }

  const exerciseSecBudget = Math.round(targetMinutes * 60) - totalRestSec;
  const exerciseMinutesBudget = exerciseSecBudget / 60;

  const themeMeta = THEME_META_BY_ID.get(input.theme);
  const themeCategories: ClassBlockCategory[] = themeMeta
    ? [...themeMeta.primaryCategories]
    : CANONICAL_BLOCKS.map((b) => b.category);

  // Compute safe target step count that respects both min floor (~75s/step) and max cap (20m/step)
  const maxPossibleByFloor = Math.max(1, Math.floor(exerciseSecBudget / 95));
  const minNeededByCap = Math.max(1, Math.ceil(exerciseSecBudget / PRESET_SUGGESTION_LIMITS.MAX_STEP_TOTAL_SEC));

  let nominalCount: number;
  if (exerciseMinutesBudget <= 12) nominalCount = 3;
  else if (exerciseMinutesBudget <= 18) nominalCount = 4;
  else if (exerciseMinutesBudget <= 25) nominalCount = 5;
  else if (exerciseMinutesBudget <= 35) nominalCount = 6;
  else if (exerciseMinutesBudget <= 48) nominalCount = 8;
  else nominalCount = 10;

  const uniqueAvailableCount = new Set(eligibleExercises.map(getMovementKey)).size;
  const desiredCount = Math.min(
    uniqueAvailableCount,
    maxPossibleByFloor,
    Math.max(selected.length, minNeededByCap, nominalCount),
  );

  const categoryCycle: ClassBlockCategory[] = [
    ...themeCategories.filter((c) => c !== 'warmup' && c !== 'cooldown'),
    ...CANONICAL_BLOCKS.map((b) => b.category).filter(
      (c) => c !== 'warmup' && c !== 'cooldown' && !themeCategories.includes(c),
    ),
  ];

  let cursor = 0;
  while (selected.length < desiredCount && cursor < categoryCycle.length * 4) {
    const cat = categoryCycle[cursor % categoryCycle.length] ?? 'core';
    cursor += 1;
    const picked = pickNextExercise(cat);
    if (!picked) break;
    selected.push(picked);
  }

  const equipmentOrder = (ex: PilatesExercise): number => {
    if (requiredEquipment.length === 0) return 0;
    return Math.min(
      ...getExerciseEquipment(ex).requiredEquipment.map((id) => {
        const idx = requiredEquipment.indexOf(id);
        return idx >= 0 ? idx : 99;
      }),
    );
  };

  const sectionOrder = (ex: PilatesExercise): number =>
    ex.blockCategory === 'warmup' ? 0 : ex.blockCategory === 'cooldown' ? 2 : 1;

  selected.sort(
    (a, b) =>
      sectionOrder(a) - sectionOrder(b) ||
      equipmentOrder(a) - equipmentOrder(b) ||
      CANONICAL_BLOCKS.findIndex((blk) => blk.category === a.blockCategory) -
        CANONICAL_BLOCKS.findIndex((blk) => blk.category === b.blockCategory) ||
      a.id.localeCompare(b.id),
  );

  const prelimSteps: SequenceStep[] = selected.map((ex, idx) => ({
    kind: 'exercise',
    stepId: `${candidateId}-step-${idx + 1}-${ex.id}`,
    order: idx + 1,
    blockCategory: ex.blockCategory,
    classSection: getMovementSectionRole(ex.blockCategory),
    exerciseId: ex.id,
    durationMin: ex.defaultDurationMin,
    explanationSec: PRESET_SUGGESTION_LIMITS.DEFAULT_EXPLANATION_SEC,
    transitionSec: 0,
    repetitions: ex.isUnilateral ? 6 : 8,
    sets: 2,
    sideMode: ex.isUnilateral ? 'left-then-right' : 'together',
    selectedLayer: input.defaultLayer,
    locked: false,
  }));

  try {
    const withTransitions = applyTransitionAllowances(prelimSteps, verifiableMap);
    const withRest = insertMidpointRestStep(withTransitions, restMinutes, candidateId);
    const fitted = fitSequenceDuration(withRest, targetMinutes);
    const balanced = enforceSplitUnilateralParity(fitted);

    const apparatusLabel =
      input.apparatus === 'mixed'
        ? '혼합 기구'
        : APPARATUS_LABELS[input.apparatus].ko;
    const variationTag = variationIndex === 0 ? '추천 구성 A' : `대안 구성 B`;

    return finalizeCandidate({
      candidateId,
      rank: variationIndex + 1,
      matchScore: variationIndex === 0 ? 88 : 82,
      sourceTier: 'catalog-deterministic-composition',
      sourceBlockPresetIds: [],
      titleKo: `${apparatusLabel} ${targetMinutes}분 ${themeMeta?.labelKo ?? input.theme} (${variationTag})`,
      subtitleKo: `${themeMeta?.summaryKo ?? '검증 가능한 카탈로그 동작 ID 기반 결정론적 수업 초안'}`,
      rationaleKo: `사용자가 지정한 기구(${apparatusLabel})·주제(${themeMeta?.labelKo ?? input.theme})·목표 시간(${targetMinutes}분${restMinutes > 0 ? `, 휴식 ${formatDurationSecondsKo(totalRestSec)} 포함` : ''})에 맞춰 카탈로그의 검증 가능한 동작 ID ${selected.length}종만 중복 없이 조합한 결정론적 초안입니다.`,
      editingGuideKo:
        '추천된 모든 동작은 기존 카탈로그 동작 ID를 참조하는 편집 가능한 초안입니다. 강사가 순서·시간·세트·좌우 모드를 자유롭게 수정할 수 있습니다.',
      input,
      rawSteps: balanced,
      verifiableMap,
      historyLogs,
      referenceIso,
    });
  } catch {
    return null;
  }
}

/**
 * Primary deterministic entry point for recommending and adapting Pilates class preset candidates.
 * Never mutates or freezes caller-owned inputs, never invokes external APIs, never invents exercise IDs,
 * and explicitly surfaces nested cycles, unknown IDs, unilateral timing rules, rest budgets,
 * upper bounds, and target-time impossibility reasons.
 */
export function suggestPresetCandidates(
  request: PresetSuggestionRequest | unknown,
): PresetSuggestionResult {
  const normalizedInput = adaptPresetSuggestionInput(request);
  const rawReq =
    request !== null && typeof request === 'object' && !Array.isArray(request)
      ? (request as PresetSuggestionRequest)
      : undefined;

  const referenceIso =
    typeof rawReq?.referenceDateIso === 'string' &&
    Number.isFinite(new Date(rawReq.referenceDateIso).getTime())
      ? rawReq.referenceDateIso
      : DETERMINISTIC_REFERENCE_ISO;

  const historyLogs = Array.isArray(rawReq?.historyLogs) ? rawReq.historyLogs : [];
  const classPresets = Array.isArray(rawReq?.classPresets)
    ? rawReq.classPresets
    : OFFLINE_CLASS_PRESETS;
  const blockPresets = Array.isArray(rawReq?.blockPresets)
    ? rawReq.blockPresets
    : OFFLINE_BLOCK_PRESETS;
  const strictPropsFilter =
    rawReq !== undefined && Array.isArray(rawReq.preferredProps);

  const { feasibility, feasibilityIssues, eligibleExercises, verifiableMap } =
    evaluatePresetTargetFeasibility(normalizedInput, rawReq);

  const allIssues: PresetSuggestionIssue[] = [
    ...normalizedInput.adapterIssues,
    ...feasibilityIssues,
  ];
  const blockingIssues = allIssues.filter((issue) => issue.blocking);
  const warningIssues = allIssues.filter((issue) => !issue.blocking);

  if (!feasibility.feasible || blockingIssues.length > 0) {
    return deepFreezeCandidateResult({
      status: 'blocked',
      statusHeadlineKo: feasibility.headlineKo,
      normalizedInput,
      feasibility,
      candidates: [],
      recommendedCandidate: null,
      issues: allIssues,
      blockingIssues,
      warningIssues,
      truthBoundary: DEFAULT_PRESET_SUGGESTION_TRUTH_BOUNDARY,
    });
  }

  const rawCandidates: PresetSuggestionCandidate[] = [];
  const seenSignatures = new Set<string>();

  const addUniqueCandidate = (cand: PresetSuggestionCandidate | null) => {
    if (!cand) return;
    const sig = cand.steps
      .map((s) => `${s.kind ?? 'exercise'}:${s.exerciseId}:${s.sideMode ?? ''}:${Math.round(s.durationMin * 60)}`)
      .join('|');
    if (seenSignatures.has(sig)) return;
    seenSignatures.add(sig);
    rawCandidates.push(cand);
  };

  // Tier 1: Exact or adapted OfflineClassPreset
  const tier1 = buildTier1ClassPresetCandidates({
    input: normalizedInput,
    classPresets,
    verifiableMap,
    strictPropsFilter,
    totalRestSec: feasibility.totalRestSec,
    historyLogs,
    referenceIso,
  });
  for (const cand of tier1) {
    addUniqueCandidate(cand);
  }

  // Tier 2: OfflineBlockPreset assembly
  const tier2 = buildTier2BlockAssemblyCandidate({
    input: normalizedInput,
    blockPresets,
    verifiableMap,
    strictPropsFilter,
    totalRestSec: feasibility.totalRestSec,
    historyLogs,
    referenceIso,
  });
  addUniqueCandidate(tier2);

  // Tier 3: Deterministic catalog composition (primary + optional alternative)
  const tier3Primary = buildTier3CatalogCompositionCandidate({
    input: normalizedInput,
    rawRequest: rawReq,
    eligibleExercises,
    verifiableMap,
    totalRestSec: feasibility.totalRestSec,
    historyLogs,
    referenceIso,
    variationIndex: 0,
  });
  addUniqueCandidate(tier3Primary);

  if (rawCandidates.length < normalizedInput.maxCandidates && tier3Primary) {
    const primaryMainIds = new Set(
      tier3Primary.steps
        .filter((s) => !isRestStep(s) && !['warmup', 'cooldown'].includes(s.blockCategory))
        .map((s) => s.exerciseId),
    );
    const tier3Alt = buildTier3CatalogCompositionCandidate({
      input: normalizedInput,
      rawRequest: rawReq,
      eligibleExercises,
      verifiableMap,
      totalRestSec: feasibility.totalRestSec,
      historyLogs,
      referenceIso,
      variationIndex: 1,
      penalizeIds: primaryMainIds,
    });
    addUniqueCandidate(tier3Alt);
  }

  if (rawCandidates.length === 0) {
    const fallbackIssue: PresetSuggestionIssue = {
      id: 'engine-issue-no-candidate-assembled',
      code: 'insufficient-verifiable-catalog-movements',
      category: 'target-impossibility',
      severity: 'blocking',
      blocking: true,
      stepIds: [],
      stepIndices: [],
      relatedExerciseIds: [],
      titleKo: '시간·전환·편측 균형 계약을 동시에 만족하는 조합을 찾지 못함',
      messageKo:
        '선택한 기구·시간·휴식 조건에서 스텝당 30초~20분 범위와 편측 균형을 동시에 만족하는 후보를 구성하지 못했습니다.',
    };
    return deepFreezeCandidateResult({
      status: 'blocked',
      statusHeadlineKo: fallbackIssue.messageKo,
      normalizedInput,
      feasibility: {
        ...feasibility,
        feasible: false,
        impossibilityReasons: [
          ...feasibility.impossibilityReasons,
          'insufficient-verifiable-catalog-movements',
        ],
      },
      candidates: [],
      recommendedCandidate: null,
      issues: [...allIssues, fallbackIssue],
      blockingIssues: [...blockingIssues, fallbackIssue],
      warningIssues,
      truthBoundary: DEFAULT_PRESET_SUGGESTION_TRUTH_BOUNDARY,
    });
  }

  const rankedCandidates = rawCandidates
    .slice(0, normalizedInput.maxCandidates)
    .map((cand, idx) => ({
      ...cand,
      rank: idx + 1,
    }));

  const recommendedCandidate = rankedCandidates[0] ?? null;

  return deepFreezeCandidateResult({
    status: 'ready',
    statusHeadlineKo: `기구(${normalizedInput.apparatus}) · 주제(${recommendedCandidate?.themeLabelKo ?? normalizedInput.theme}) · 목표 ${normalizedInput.targetMinutes}분 기준으로 검증 카탈로그 동작 ID만 사용한 편집 가능 초안 ${rankedCandidates.length}건을 준비했습니다.`,
    normalizedInput,
    feasibility,
    candidates: rankedCandidates,
    recommendedCandidate,
    issues: allIssues,
    blockingIssues,
    warningIssues,
    truthBoundary: DEFAULT_PRESET_SUGGESTION_TRUTH_BOUNDARY,
  });
}

/**
 * Produces an un-frozen, isolated editable copy of a `PresetSuggestionCandidate`
 * so the instructor can freely mutate title, steps, durations, or notes without
 * affecting the frozen candidate result or catalog presets.
 */
export function instantiateSuggestedCandidateAsEditableDraft(
  candidate: PresetSuggestionCandidate,
  overrides?: {
    readonly titleKo?: string;
    readonly subtitleKo?: string;
    readonly copyIdSuffix?: string;
    readonly nowIso?: string;
  },
): {
  sequence: SavedSequence;
  conditionTemplate: ConditionTemplate;
  steps: SequenceStep[];
  sourceCandidateId: string;
  isEditableDraft: true;
  truthBoundary: typeof DEFAULT_PRESET_SUGGESTION_TRUTH_BOUNDARY;
} {
  const suffix = overrides?.copyIdSuffix?.trim() || 'editable-copy';
  const nowIso = overrides?.nowIso ?? DETERMINISTIC_REFERENCE_ISO;
  const title = overrides?.titleKo?.trim() || candidate.titleKo;
  const subtitle = overrides?.subtitleKo?.trim() || candidate.subtitleKo;

  const steps: SequenceStep[] = candidate.steps.map((step, idx) => ({
    ...structuredClone(step),
    stepId: `${candidate.candidateId}-${suffix}-step-${idx + 1}`,
    order: idx + 1,
    locked: false,
  }));

  const sequence: SavedSequence = {
    ...structuredClone(candidate.sequenceDraft),
    id: `seq-${candidate.candidateId}-${suffix}`,
    title,
    subtitle,
    steps,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const conditionTemplate: ConditionTemplate = {
    ...structuredClone(candidate.conditionTemplate),
    id: `tpl-${candidate.candidateId}-${suffix}`,
    name: `${title} 조건 템플릿`,
    createdAt: nowIso,
  };

  return {
    sequence,
    conditionTemplate,
    steps,
    sourceCandidateId: candidate.candidateId,
    isEditableDraft: true,
    truthBoundary: DEFAULT_PRESET_SUGGESTION_TRUTH_BOUNDARY,
  };
}
