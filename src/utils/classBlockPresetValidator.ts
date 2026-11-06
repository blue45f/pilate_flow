import { equipmentRequirementsSatisfied } from '../data/equipmentCatalog';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { inspectSensitiveHealthText } from '../schemas/freeAiAssistantSchema';
import { reusableBlockSchema } from '../schemas/hierarchySchema';
import type {
  BlankDraftSessionBundle,
  BlankDraftStarterOption,
  CatalogPresetAuditReport,
  HealthClaimInspectionResult,
  InstantiatedClassPresetResult,
  OfflineBlockPreset,
  OfflineClassPreset,
  PresetFilterCriteria,
  PresetSimilarityPair,
  SingleBlockPresetValidationResult,
  SingleClassPresetValidationResult,
  StartBlankDraftOptions,
} from '../types/classBlockPresets';
import type {
  P1MovementSnapshotContract,
  P1ReusableBlockContract,
  P1ReusableBlockStepContract,
} from '../types/freeAiAssistant';
import type {
  HumanMovementDraft,
  MovementSnapshot,
  ReusableBlock,
  ReusableBlockItem,
} from '../types/hierarchy';
import type {
  ApparatusType,
  AutoGenerateCriteria,
  ClassBlockCategory,
  ConditionTemplate,
  DifficultyLevel,
  PilatesExercise,
  SavedSequence,
  SequenceStep,
} from '../types/pilates';
import type { ClassSectionRole } from '../types/sequenceMotion';
import {
  createMovementSnapshot,
  createReusableBlock,
  editSequenceStepWithIsolation,
  getMovementSectionRole,
  insertReusableBlockIntoSequence,
  linkHumanDraftToReusableBlock,
  linkHumanDraftToSequence,
  scaleReusableBlockDuration,
} from './hierarchyModel';
import {
  createHumanMovementIdeaDraft,
  evaluateDraftStageReadiness,
} from './humanMovementCreation';
import type { MovementIdeaWorkingBuffer } from './movementIdeaDraft';
import {
  analyzeSequence,
  fitSequenceDuration,
  getMovementKey,
  getStepTiming,
  isRestStep,
} from './sequenceEngine';
import {
  calculateApparatusTransitionDetail,
  validateSequenceStructure,
} from './sequenceValidation';

/**
 * 1. Health / Rehab / Medical Claim Inspector
 * Catches unverified health, rehabilitation, medical efficacy, pain cure, clinical guarantee,
 * or posture cure claims while allowing explicit negative safety disclaimers.
 */
export const UNVERIFIED_HEALTH_REHAB_CLAIM_PATTERNS: readonly RegExp[] = [
  /치료/,
  /완치/,
  /재활\s*(?:효과|보장|치료|완치|처방|프로그램|완화|전문|클리닉)/,
  /통증\s*(?:제거|완치|치료|해소\s*보장|완화\s*보장|완화\s*효과|경감\s*보장|근본\s*해결)/,
  /체형\s*교정\s*(?:보장|효과\s*확정|완치|보증|100%)/,
  /의학적\s*(?:효능|효과|검증|보장|입증|처방)/,
  /임상\s*(?:검증|입증|효능|보장|결과\s*보증)/,
  /질병\s*(?:예방\s*보장|치료|완치)/,
  /질환\s*(?:치료|완치|개선\s*보장|해결)/,
  /디스크\s*(?:치료|완치|교정|재활|회복)/,
  /측만증\s*(?:치료|완치|교정\s*보장)/,
  /거북목\s*(?:완치|치료|100%\s*교정)/,
  /라운드\s*숄더\s*(?:완치|치료|100%\s*교정)/,
  /100%\s*(?:교정|치료|완치|통증\s*해소|회복)/,
] as const;

/**
 * Patterns matching explicit negative safety disclaimers where medical/rehab/treatment efficacy
 * is explicitly disclaimed (e.g., "치료·재활·통증 완화 효과를 주장하거나 보장하지 않습니다").
 * Only the negated disclaimer clause is stripped so any positive claim in the same text is still caught.
 */
const SAFE_NEGATIVE_DISCLAIMER_PATTERNS: readonly RegExp[] = [
  /(?:의학적[·,\s]*|임상적[·,\s]*)?(?:진단[·,\s]*)?(?:치료|재활|통증\s*(?:완화|해소|제거|관리)|체형\s*교정|교정|질병\s*예방|의학적\s*효능|임상\s*검증)(?:[·,\s/및또는이나과와]*(?:의학적|임상적|진단|치료|재활|통증\s*(?:완화|해소|제거|관리)|체형\s*교정|교정|질병\s*예방|운동|효과|효능|목적|처방|보증|검증))*[을를이의은는도]?\s*(?:주장하거나\s*보장하지\s*않(?:습니다|으며|고)|주장하지\s*않(?:습니다|으며|고)|보장하지\s*않(?:습니다|으며|고)|보증하지\s*않(?:습니다|으며|고)|대신하지\s*않(?:습니다|으며|고)|목적이\s*아니(?:며|고|라|ㄴ)|아닙니다|아니며|아닌)/g,
  /미검토\s*창작\s*동작\s*및\s*AI\s*제안은\s*안전성이나\s*운동·교정·치료\s*효과를\s*보장하지\s*않습니다/g,
];

function stripSafeNegativeDisclaimers(text: string): string {
  let cleaned = text;
  for (const disclaimerRegex of SAFE_NEGATIVE_DISCLAIMER_PATTERNS) {
    cleaned = cleaned.replace(disclaimerRegex, ' ');
  }
  return cleaned;
}

export function inspectUnverifiedHealthOrRehabClaims(text: string): HealthClaimInspectionResult {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return {
      safe: true,
      matchedClaims: [],
    };
  }

  const strippedText = stripSafeNegativeDisclaimers(text);
  const matchedClaims: string[] = [];

  for (const pattern of UNVERIFIED_HEALTH_REHAB_CLAIM_PATTERNS) {
    const match = strippedText.match(pattern);
    if (match?.[0]) {
      const token = match[0].trim();
      if (token && !matchedClaims.includes(token)) {
        matchedClaims.push(token);
      }
    }
  }

  const sensitiveResult = inspectSensitiveHealthText(strippedText);
  if (sensitiveResult.hasSensitiveData) {
    for (const category of sensitiveResult.matchedCategories) {
      if (!matchedClaims.includes(category)) {
        matchedClaims.push(category);
      }
    }
  }

  if (matchedClaims.length === 0) {
    return {
      safe: true,
      matchedClaims: [],
    };
  }

  return {
    safe: false,
    matchedClaims,
    reasonKo: `검증되지 않은 건강·재활·의학적 치료 또는 민감 질환 표현(${matchedClaims.join(', ')})이 감지되었습니다. 프리셋은 순수 움직임·수업 구성 목적으로만 제공되어야 합니다.`,
  };
}

export function inspectPresetObjectHealthClaims(
  texts: readonly string[],
): HealthClaimInspectionResult {
  const combinedMatches: string[] = [];

  for (const text of texts) {
    if (!text) continue;
    const result = inspectUnverifiedHealthOrRehabClaims(text);
    if (!result.safe) {
      for (const claim of result.matchedClaims) {
        if (!combinedMatches.includes(claim)) {
          combinedMatches.push(claim);
        }
      }
    }
  }

  if (combinedMatches.length === 0) {
    return {
      safe: true,
      matchedClaims: [],
    };
  }

  return {
    safe: false,
    matchedClaims: combinedMatches,
    reasonKo: `프리셋 텍스트에서 검증되지 않은 건강·재활·치료 효능 주장(${combinedMatches.join(', ')})이 감지되었습니다.`,
  };
}

/**
 * 2. Duplicate & Superficial Rename Detection
 */
function normalizePresetTitle(title: string): string {
  return title
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\-_·•()[\]{}:;,.!?/\\|+&'"]+/g, '');
}

export function getPresetExerciseSignature(
  stepsOrItems: readonly { exerciseId: string; sideMode?: string }[],
): string {
  return stepsOrItems
    .filter(
      (entry) => typeof entry.exerciseId === 'string' && entry.exerciseId.trim().length > 0,
    )
    .map((entry) => `${entry.exerciseId.trim()}:${entry.sideMode?.trim() || 'default'}`)
    .join('>');
}

function computeLongestCommonSubsequenceLength(
  seqA: readonly string[],
  seqB: readonly string[],
): number {
  const m = seqA.length;
  const n = seqB.length;
  if (m === 0 || n === 0) return 0;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array<number>(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (seqA[i - 1] === seqB[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp[m][n];
}

function computeExerciseListSimilarityMetrics(
  itemsA: readonly { exerciseId: string; sideMode?: string }[],
  itemsB: readonly { exerciseId: string; sideMode?: string }[],
): {
  jaccardSimilarity: number;
  orderedOverlapRatio: number;
  identicalSignature: boolean;
} {
  const validA = itemsA.filter((item) => item.exerciseId && item.exerciseId.trim().length > 0);
  const validB = itemsB.filter((item) => item.exerciseId && item.exerciseId.trim().length > 0);

  const idsA = validA.map((item) => item.exerciseId.trim());
  const idsB = validB.map((item) => item.exerciseId.trim());

  const setA = new Set(idsA);
  const setB = new Set(idsB);
  const unionSize = new Set([...setA, ...setB]).size;
  const intersectionSize = [...setA].filter((id) => setB.has(id)).length;

  const jaccardSimilarity =
    unionSize === 0 ? 1 : Number((intersectionSize / unionSize).toFixed(4));

  const lcsLen = computeLongestCommonSubsequenceLength(idsA, idsB);
  const maxLen = Math.max(idsA.length, idsB.length);
  const orderedOverlapRatio = maxLen === 0 ? 1 : Number((lcsLen / maxLen).toFixed(4));

  const sigA = getPresetExerciseSignature(validA);
  const sigB = getPresetExerciseSignature(validB);
  const identicalSignature = sigA.length > 0 && sigA === sigB;

  return {
    jaccardSimilarity,
    orderedOverlapRatio,
    identicalSignature,
  };
}

export function computePresetSimilarity(
  presetA: OfflineClassPreset,
  presetB: OfflineClassPreset,
): PresetSimilarityPair {
  const { jaccardSimilarity, orderedOverlapRatio, identicalSignature } =
    computeExerciseListSimilarityMetrics(presetA.steps, presetB.steps);

  const sameApparatus = presetA.apparatus === presetB.apparatus;
  const sameDuration = presetA.durationMinutes === presetB.durationMinutes;
  const sameLevel = presetA.level === presetB.level;
  const sameNormalizedTitle =
    normalizePresetTitle(presetA.title) === normalizePresetTitle(presetB.title);

  const isDuplicateRisk =
    sameNormalizedTitle ||
    identicalSignature ||
    (sameApparatus && sameDuration && jaccardSimilarity >= 0.65) ||
    (jaccardSimilarity >= 0.85 && orderedOverlapRatio >= 0.85);

  return {
    presetAId: presetA.id,
    presetBId: presetB.id,
    presetATitle: presetA.title,
    presetBTitle: presetB.title,
    jaccardSimilarity,
    orderedOverlapRatio,
    sameApparatus,
    sameDuration,
    sameLevel,
    isDuplicateRisk,
  };
}

export function computeBlockPresetSimilarity(
  blockA: OfflineBlockPreset,
  blockB: OfflineBlockPreset,
): PresetSimilarityPair {
  const { jaccardSimilarity, orderedOverlapRatio, identicalSignature } =
    computeExerciseListSimilarityMetrics(blockA.items, blockB.items);

  const sameApparatus = blockA.apparatus === blockB.apparatus;
  const sameDuration = Math.round(blockA.durationMin * 60) === Math.round(blockB.durationMin * 60);
  const sameLevel = blockA.level === blockB.level;
  const sameNormalizedTitle =
    normalizePresetTitle(blockA.title) === normalizePresetTitle(blockB.title);

  const isDuplicateRisk =
    sameNormalizedTitle ||
    identicalSignature ||
    (sameApparatus && sameDuration && jaccardSimilarity >= 0.65) ||
    (jaccardSimilarity >= 0.85 && orderedOverlapRatio >= 0.85);

  return {
    presetAId: blockA.id,
    presetBId: blockB.id,
    presetATitle: blockA.title,
    presetBTitle: blockB.title,
    jaccardSimilarity,
    orderedOverlapRatio,
    sameApparatus,
    sameDuration,
    sameLevel,
    isDuplicateRisk,
  };
}

/**
 * 3. Single Block Preset & Single Class Preset Validators
 */
export function validateOfflineBlockPreset(
  block: OfflineBlockPreset,
  exercises: readonly PilatesExercise[] = INITIAL_EXERCISES,
): SingleBlockPresetValidationResult {
  const errorsKo: string[] = [];
  const warningsKo: string[] = [];
  const exerciseMap = new Map(exercises.map((ex) => [ex.id, ex]));

  // 1. Check all item exerciseIds exist in catalog & level <= block.level
  const unknownExerciseIds: string[] = [];
  const levelExceededIds: string[] = [];

  for (const item of block.items) {
    const ex = exerciseMap.get(item.exerciseId);
    if (!ex) {
      if (!unknownExerciseIds.includes(item.exerciseId)) {
        unknownExerciseIds.push(item.exerciseId);
      }
    } else if (Number(ex.level) > Number(block.level)) {
      if (!levelExceededIds.includes(ex.id)) {
        levelExceededIds.push(ex.id);
      }
    }
  }

  const catalogExercisesResolved = block.items.length > 0 && unknownExerciseIds.length === 0;
  if (!catalogExercisesResolved) {
    errorsKo.push(
      unknownExerciseIds.length > 0
        ? `카탈로그에 존재하지 않는 동작 ID(${unknownExerciseIds.join(', ')})가 블록에 포함되어 있습니다.`
        : '블록에 포함된 동작이 없습니다.',
    );
  }
  if (levelExceededIds.length > 0) {
    errorsKo.push(
      `블록 목표 난이도(Lv.${block.level})를 초과하는 동작(${levelExceededIds.join(', ')})이 포함되어 있습니다.`,
    );
  }

  // 2. Check time breakdown
  const targetSec = Math.round(block.durationMin * 60);
  let actualTotalSec = 0;
  let calcMovementSec = 0;
  let calcExplanationSec = 0;
  let calcTransitionSec = 0;
  let itemTimingValid = block.items.length > 0;

  for (const item of block.items) {
    const itemTotalSec = Math.round(item.durationMin * 60);
    const expSec = Math.max(0, Math.round(item.explanationSec ?? 0));
    const transSec = Math.max(0, Math.round(item.transitionSec ?? 0));
    const moveSec = itemTotalSec - expSec - transSec;

    actualTotalSec += itemTotalSec;
    calcMovementSec += Math.max(0, moveSec);
    calcExplanationSec += expSec;
    calcTransitionSec += transSec;

    if (expSec + transSec > itemTotalSec || moveSec < 30) {
      itemTimingValid = false;
      errorsKo.push(
        `블록 항목(${item.exerciseId})의 순수 움직임 시간(${moveSec}초)이 30초 미만이거나 설명·전환 시간이 전체 시간을 초과합니다.`,
      );
    }
  }

  const deltaSec = actualTotalSec - targetSec;
  const breakdownMatches =
    block.timeBreakdown.totalSec === targetSec &&
    block.timeBreakdown.movementSec === calcMovementSec &&
    block.timeBreakdown.explanationSec === calcExplanationSec &&
    block.timeBreakdown.transitionSec === calcTransitionSec;

  const timeSumMatchesTarget = deltaSec === 0 && itemTimingValid && breakdownMatches;
  if (deltaSec !== 0) {
    errorsKo.push(
      `블록 항목 시간 합계(${actualTotalSec}초)가 블록 목표 시간(${targetSec}초)과 일치하지 않습니다.`,
    );
  } else if (!breakdownMatches) {
    errorsKo.push('블록 timeBreakdown 메타데이터 합계가 실제 항목 시간 합계와 일치하지 않습니다.');
  }

  // 3. Unilateral balance check on items
  const imbalancedExerciseIdsSet = new Set<string>();
  const splitGroups = new Map<
    string,
    Array<{ item: ReusableBlockItem; exercise: PilatesExercise }>
  >();

  for (const item of block.items) {
    const ex = exerciseMap.get(item.exerciseId);
    if (!ex || !ex.isUnilateral) continue;

    if (item.sideMode === 'together') {
      imbalancedExerciseIdsSet.add(ex.id);
      errorsKo.push(
        `편측 동작(${ex.nameKo})이 양쪽 동시 수행('together')으로 잘못 설정되어 있습니다.`,
      );
      continue;
    }

    if (item.sideMode === 'left' || item.sideMode === 'right') {
      const key = getMovementKey(ex);
      const list = splitGroups.get(key) ?? [];
      list.push({ item, exercise: ex });
      splitGroups.set(key, list);
    }
  }

  for (const [, group] of splitGroups) {
    const leftItems = group.filter((entry) => entry.item.sideMode === 'left');
    const rightItems = group.filter((entry) => entry.item.sideMode === 'right');
    const exIds = [...new Set(group.map((entry) => entry.exercise.id))];

    if (leftItems.length !== rightItems.length) {
      exIds.forEach((id) => imbalancedExerciseIdsSet.add(id));
      errorsKo.push(
        `편측 분할 동작(${exIds.join(', ')})의 좌/우 항목 개수가 일치하지 않습니다.`,
      );
      continue;
    }

    const leftMoveSec = leftItems.reduce((sum, entry) => {
      const total = Math.round(entry.item.durationMin * 60);
      const exp = Math.round(entry.item.explanationSec ?? 0);
      const trans = Math.round(entry.item.transitionSec ?? 0);
      return sum + (total - exp - trans);
    }, 0);
    const rightMoveSec = rightItems.reduce((sum, entry) => {
      const total = Math.round(entry.item.durationMin * 60);
      const exp = Math.round(entry.item.explanationSec ?? 0);
      const trans = Math.round(entry.item.transitionSec ?? 0);
      return sum + (total - exp - trans);
    }, 0);

    if (Math.abs(leftMoveSec - rightMoveSec) > 1) {
      exIds.forEach((id) => imbalancedExerciseIdsSet.add(id));
      errorsKo.push(
        `편측 분할 동작(${exIds.join(', ')})의 좌우 수행 시간이 불균형합니다.`,
      );
    }

    const repsOrSetsMismatch = leftItems.some((leftEntry, idx) => {
      const rightEntry = rightItems[idx];
      return (
        !rightEntry ||
        leftEntry.item.repetitions !== rightEntry.item.repetitions ||
        leftEntry.item.sets !== rightEntry.item.sets
      );
    });
    if (repsOrSetsMismatch) {
      exIds.forEach((id) => imbalancedExerciseIdsSet.add(id));
      errorsKo.push(
        `편측 분할 동작(${exIds.join(', ')})의 좌우 횟수(repetitions) 또는 세트(sets)가 불일치합니다.`,
      );
    }
  }

  const imbalancedExerciseIds = [...imbalancedExerciseIdsSet];
  const unilateralBalanced = imbalancedExerciseIds.length === 0;

  // 4. Transition continuity across items in the block
  const blockSteps: SequenceStep[] = block.items.map((item, idx) => ({
    kind: 'exercise',
    stepId: item.itemId,
    order: idx + 1,
    blockCategory: item.blockCategory,
    exerciseId: item.exerciseId,
    durationMin: item.durationMin,
    explanationSec: item.explanationSec,
    transitionSec: item.transitionSec,
    repetitions: item.repetitions,
    sets: item.sets,
    sideMode: item.sideMode,
    selectedLayer: item.selectedLayer,
    customSpringOverride: item.customSpringOverride,
    instructorNote: item.instructorNote,
    classSection: block.sectionRole,
  }));

  let transitionFlowValid = true;
  for (let i = 1; i < blockSteps.length; i++) {
    const detail = calculateApparatusTransitionDetail(
      blockSteps[i - 1],
      blockSteps[i],
      i - 1,
      i,
      exercises,
    );
    if (detail.equipmentChanged && detail.configuredTransitionSec < 30) {
      transitionFlowValid = false;
      errorsKo.push(
        `블록 내 기구 전환 구간(${detail.fromExerciseId} → ${detail.toExerciseId})의 전환 시간(${detail.configuredTransitionSec}초)이 30초 미만입니다.`,
      );
    }
  }

  if (block.apparatus !== 'mixed') {
    const mismatchedApparatus = block.items.filter((item) => {
      const ex = exerciseMap.get(item.exerciseId);
      return ex && ex.apparatus !== block.apparatus;
    });
    if (mismatchedApparatus.length > 0) {
      transitionFlowValid = false;
      errorsKo.push(
        `단일 기구 블록(${block.apparatus})에 다른 기구 동작이 포함되어 있습니다.`,
      );
    }
  }

  // 5. P1 reusableBlockSchema & P5 P1ReusableBlockContract validation
  const p1Parse = reusableBlockSchema.safeParse(block);
  const p1SchemaValid = p1Parse.success;
  if (!p1SchemaValid) {
    errorsKo.push(
      `P1 reusableBlockSchema 검증 실패: ${p1Parse.error.issues.map((i) => i.message).join('; ')}`,
    );
  }

  const p5StepsMatchItems =
    Array.isArray(block.steps) &&
    block.steps.length === block.items.length &&
    block.steps.length > 0 &&
    block.steps.every((step, idx) => {
      const item = block.items[idx];
      return (
        Boolean(item) &&
        step.exerciseId === item.exerciseId &&
        step.blockCategory === item.blockCategory &&
        step.durationMin === item.durationMin &&
        step.selectedLayer === item.selectedLayer
      );
    });

  const safetyBoundaryValid =
    block.safetyBoundary?.aiUsed === false &&
    block.safetyBoundary?.medicalOrRehabEfficacyClaimed === false &&
    block.safetyBoundary?.expertClinicalVerified === false &&
    block.safetyBoundary?.editableByInstructor === true &&
    typeof block.safetyBoundary?.disclaimerKo === 'string' &&
    block.safetyBoundary.disclaimerKo.trim().length > 0;

  const p5ContractValid =
    block.presetKind === 'reusable-block' &&
    block.isReviewed === true &&
    p5StepsMatchItems &&
    safetyBoundaryValid;

  if (!p5ContractValid) {
    errorsKo.push(
      'P5 P1ReusableBlockContract 구조 계약(isReviewed === true, steps/items 동기화, safetyBoundary)을 충족하지 않습니다.',
    );
  }

  // 6. Health / Rehab / Medical Claim inspection
  const rawHealthClaimCheck = inspectPresetObjectHealthClaims([
    block.title,
    block.description ?? '',
    block.targetAudienceSummaryKo,
    block.flowRationaleKo,
    block.unilateralBalanceNoteKo,
    block.editingGuideKo,
    block.safetyBoundary?.disclaimerKo ?? '',
    ...block.items.map((item) => item.instructorNote ?? ''),
    ...block.steps.map((step) => step.instructorNote ?? ''),
  ]);

  const healthClaimCheck: HealthClaimInspectionResult =
    block.safetyBoundary?.medicalOrRehabEfficacyClaimed === false
      ? rawHealthClaimCheck
      : {
          safe: false,
          matchedClaims: [
            ...rawHealthClaimCheck.matchedClaims,
            'medicalOrRehabEfficacyClaimed !== false',
          ],
          reasonKo:
            'safetyBoundary.medicalOrRehabEfficacyClaimed 필드는 반드시 false여야 합니다.',
        };

  if (!healthClaimCheck.safe && healthClaimCheck.reasonKo) {
    errorsKo.push(healthClaimCheck.reasonKo);
  }

  // 7. Edit isolation verification
  let editIsolationVerified: boolean;
  try {
    const snapshotBefore = JSON.stringify({
      id: block.id,
      title: block.title,
      durationMin: block.durationMin,
      items: block.items.map((item) => ({
        itemId: item.itemId,
        exerciseId: item.exerciseId,
        durationMin: item.durationMin,
        instructorNote: item.instructorNote,
      })),
    });

    if (catalogExercisesResolved && block.items.length > 0) {
      const instantiatedBlock = instantiateBlockPresetAsReusableBlock(
        block,
        { title: `${block.title} [편집본]` },
        exercises,
      );
      instantiatedBlock.title = '변경된 블록 제목';
      if (instantiatedBlock.items[0]) {
        instantiatedBlock.items[0].durationMin = 15;
        instantiatedBlock.items[0].instructorNote = '인스턴스 수정 노트';
      }

      const inserted = insertBlockPresetIntoSequence([], block, undefined, exercises);
      if (inserted.steps.length > 0) {
        const editedSteps = editSequenceStepWithIsolation(inserted.steps, 0, {
          durationMin: 12,
          instructorNote: '시퀀스 단계 수정 테스트',
        });
        editedSteps[0].durationMin = 11;
      }
    }

    const snapshotAfter = JSON.stringify({
      id: block.id,
      title: block.title,
      durationMin: block.durationMin,
      items: block.items.map((item) => ({
        itemId: item.itemId,
        exerciseId: item.exerciseId,
        durationMin: item.durationMin,
        instructorNote: item.instructorNote,
      })),
    });

    editIsolationVerified = snapshotBefore === snapshotAfter;
  } catch {
    editIsolationVerified = false;
  }

  if (!editIsolationVerified) {
    errorsKo.push('블록 프리셋 인스턴스화 및 편집 격리(Edit Isolation) 검증에 실패했습니다.');
  }

  const valid =
    catalogExercisesResolved &&
    timeSumMatchesTarget &&
    unilateralBalanced &&
    transitionFlowValid &&
    p1SchemaValid &&
    p5ContractValid &&
    healthClaimCheck.safe &&
    editIsolationVerified &&
    errorsKo.length === 0;

  return {
    blockId: block.id,
    valid,
    catalogExercisesResolved,
    unknownExerciseIds,
    timeSumMatchesTarget,
    targetSec,
    actualTotalSec,
    deltaSec,
    unilateralBalanced,
    imbalancedExerciseIds,
    transitionFlowValid,
    p1SchemaValid,
    p5ContractValid,
    healthClaimCheck,
    editIsolationVerified,
    errorsKo,
    warningsKo,
  };
}

export function validateOfflineClassPreset(
  preset: OfflineClassPreset,
  exercises: readonly PilatesExercise[] = INITIAL_EXERCISES,
): SingleClassPresetValidationResult {
  const errorsKo: string[] = [];
  const warningsKo: string[] = [];
  const exerciseMap = new Map(exercises.map((ex) => [ex.id, ex]));

  // 1. Check all non-rest step exerciseIds exist in exercises
  const nonRestSteps = preset.steps.filter((step) => !isRestStep(step));
  const unknownExerciseIds: string[] = [];
  for (const step of nonRestSteps) {
    if (!exerciseMap.has(step.exerciseId) && !unknownExerciseIds.includes(step.exerciseId)) {
      unknownExerciseIds.push(step.exerciseId);
    }
  }
  const catalogExercisesResolved = nonRestSteps.length > 0 && unknownExerciseIds.length === 0;
  if (!catalogExercisesResolved) {
    errorsKo.push(
      unknownExerciseIds.length > 0
        ? `카탈로그에 등록되지 않은 동작 ID(${unknownExerciseIds.join(', ')})가 시퀀스에 포함되어 있습니다.`
        : '시퀀스에 포함된 동작이 없습니다.',
    );
  }

  // 2. Run P1 validateSequenceStructure
  const sequenceReport = validateSequenceStructure(
    preset.steps as SequenceStep[],
    exercises,
    {
      targetMinutes: preset.durationMinutes,
      level: preset.level,
    },
  );

  for (const issue of sequenceReport.issues) {
    if (issue.severity === 'error') {
      errorsKo.push(issue.messageKo);
    } else {
      warningsKo.push(issue.messageKo);
    }
  }

  // Check each step's movementSec >= 30 and preset.timeBreakdown consistency
  const targetSec = sequenceReport.timeBreakdown.targetSec;
  const actualTotalSec = sequenceReport.timeBreakdown.totalSec;
  const deltaSec = sequenceReport.timeBreakdown.deltaSec;

  const everyStepHasEnoughMovement = nonRestSteps.every((step) => {
    const ex = exerciseMap.get(step.exerciseId);
    const timing = getStepTiming(step, ex);
    const totalSec = Math.round(step.durationMin * 60);
    const rawExp = Math.round(step.explanationSec ?? 0);
    const rawTrans = Math.round(step.transitionSec ?? 0);
    return rawExp + rawTrans <= totalSec && timing.movementSec >= 30;
  });

  if (!everyStepHasEnoughMovement) {
    errorsKo.push(
      '시퀀스 내 일부 동작의 순수 움직임 시간(movementSec)이 30초 미만이거나 설명·전환 시간이 초과되었습니다.',
    );
  }

  const timeBreakdownConsistent =
    preset.timeBreakdown.totalSec === actualTotalSec &&
    preset.timeBreakdown.targetSec === targetSec;

  if (!timeBreakdownConsistent) {
    errorsKo.push('프리셋 timeBreakdown 메타데이터가 실제 시퀀스 시간 분석 결과와 다릅니다.');
  }

  const timeSumMatchesTarget =
    Math.abs(deltaSec) === 0 && everyStepHasEnoughMovement && timeBreakdownConsistent;

  // Unilateral balance check
  const imbalancedExerciseIds = sequenceReport.sideBalanceSummary.imbalancedExerciseIds;
  const unilateralBalanced =
    imbalancedExerciseIds.length === 0 &&
    sequenceReport.sideBalanceSummary.unpairedLeftIds.length === 0 &&
    sequenceReport.sideBalanceSummary.unpairedRightIds.length === 0 &&
    !sequenceReport.issues.some((issue) => issue.category === 'side-balance');

  // 3. Transition continuity via analyzeSequence
  const analytics = analyzeSequence(
    preset.steps as SequenceStep[],
    exerciseMap,
    [],
    undefined,
    preset.durationMinutes,
  );
  const transitionScore = analytics.transitionScore;
  const hasUnderbudgetedTransition = sequenceReport.issues.some(
    (issue) => issue.code === 'transition-underbudgeted',
  );
  const transitionFlowValid = transitionScore >= 85 && !hasUnderbudgetedTransition;
  if (!transitionFlowValid) {
    errorsKo.push(
      `기구·스프링·체위 전환 흐름 점수(${transitionScore}점)가 기준(85점) 미만이거나 전환 시간이 부족합니다.`,
    );
  }

  // Difficulty flow check
  const difficultyFlowValid =
    sequenceReport.difficultyFlowSummary.hasPreparation &&
    sequenceReport.difficultyFlowSummary.hasMain &&
    sequenceReport.difficultyFlowSummary.hasCooldown &&
    sequenceReport.difficultyFlowSummary.sectionOrderValid &&
    !sequenceReport.issues.some((issue) => issue.category === 'difficulty-flow');

  // 4. Health / Rehab / Medical Claim inspection
  const rawHealthClaimCheck = inspectPresetObjectHealthClaims([
    preset.title,
    preset.subtitle,
    preset.userSummaryKo,
    preset.flowRationaleKo,
    preset.unilateralBalanceNoteKo,
    preset.editingGuideKo,
    preset.safetyBoundary?.disclaimerKo ?? '',
    ...preset.focusTags,
    ...preset.steps.map((step) => step.instructorNote ?? ''),
  ]);

  const boundaryValid =
    preset.safetyBoundary?.aiUsed === false &&
    preset.safetyBoundary?.medicalOrRehabEfficacyClaimed === false &&
    preset.safetyBoundary?.expertClinicalVerified === false &&
    preset.safetyBoundary?.editableByInstructor === true &&
    typeof preset.safetyBoundary?.disclaimerKo === 'string' &&
    preset.safetyBoundary.disclaimerKo.trim().length > 0;

  const healthClaimCheck: HealthClaimInspectionResult = boundaryValid
    ? rawHealthClaimCheck
    : {
        safe: false,
        matchedClaims: [
          ...rawHealthClaimCheck.matchedClaims,
          'safetyBoundary 계약 위반',
        ],
        reasonKo:
          '프리셋 safetyBoundary(aiUsed: false, medicalOrRehabEfficacyClaimed: false, expertClinicalVerified: false, editableByInstructor: true) 계약이 위반되었습니다.',
      };

  if (!healthClaimCheck.safe && healthClaimCheck.reasonKo) {
    errorsKo.push(healthClaimCheck.reasonKo);
  }

  // 5. Edit Isolation verification
  let editIsolationVerified: boolean;
  try {
    const beforeSnapshot = JSON.stringify({
      id: preset.id,
      title: preset.title,
      durationMinutes: preset.durationMinutes,
      steps: preset.steps.map((step) => ({
        stepId: step.stepId,
        exerciseId: step.exerciseId,
        durationMin: step.durationMin,
        instructorNote: step.instructorNote,
      })),
    });

    if (preset.steps.length > 0) {
      const instantiated = instantiateClassPresetAsEditableSequence(
        preset,
        { title: `${preset.title} [강사 편집 테스트]` },
        exercises,
      );
      instantiated.sequence.title = '수정된 시퀀스 제목';
      const editedSteps = editSequenceStepWithIsolation(instantiated.sequence.steps, 0, {
        durationMin: 14,
        instructorNote: '격리 테스트용 강사 노트 변경',
      });
      if (editedSteps[0]) {
        editedSteps[0].durationMin = 13;
      }
    }

    const afterSnapshot = JSON.stringify({
      id: preset.id,
      title: preset.title,
      durationMinutes: preset.durationMinutes,
      steps: preset.steps.map((step) => ({
        stepId: step.stepId,
        exerciseId: step.exerciseId,
        durationMin: step.durationMin,
        instructorNote: step.instructorNote,
      })),
    });

    editIsolationVerified = beforeSnapshot === afterSnapshot;
  } catch {
    editIsolationVerified = false;
  }

  if (!editIsolationVerified) {
    errorsKo.push('수업 프리셋 인스턴스화 및 편집 격리(Edit Isolation) 검증에 실패했습니다.');
  }

  const valid =
    catalogExercisesResolved &&
    timeSumMatchesTarget &&
    unilateralBalanced &&
    transitionFlowValid &&
    difficultyFlowValid &&
    healthClaimCheck.safe &&
    editIsolationVerified &&
    sequenceReport.valid &&
    sequenceReport.canConfirmClass &&
    errorsKo.length === 0 &&
    warningsKo.length === 0;

  return {
    presetId: preset.id,
    valid,
    catalogExercisesResolved,
    unknownExerciseIds,
    timeSumMatchesTarget,
    targetSec,
    actualTotalSec,
    deltaSec,
    unilateralBalanced,
    imbalancedExerciseIds,
    transitionFlowValid,
    transitionScore,
    difficultyFlowValid,
    healthClaimCheck,
    editIsolationVerified,
    sequenceReport,
    errorsKo,
    warningsKo,
  };
}

/**
 * 4. Full Catalog Audit
 */
export function auditPresetCatalog(
  classPresets: readonly OfflineClassPreset[],
  blockPresets: readonly OfflineBlockPreset[],
  blankStarters: readonly BlankDraftStarterOption[],
  exercises: readonly PilatesExercise[] = INITIAL_EXERCISES,
): CatalogPresetAuditReport {
  const classPresetResults = classPresets.map((preset) =>
    validateOfflineClassPreset(preset, exercises),
  );
  const blockPresetResults = blockPresets.map((block) =>
    validateOfflineBlockPreset(block, exercises),
  );

  // Duplicate normalized titles or IDs detection
  const duplicateTitleIdSet = new Set<string>();
  const titleMap = new Map<string, string[]>();
  const idMap = new Map<string, number>();

  for (const item of [
    ...classPresets.map((p) => ({ id: p.id, title: p.title })),
    ...blockPresets.map((b) => ({ id: b.id, title: b.title })),
    ...blankStarters.map((s) => ({ id: s.id, title: s.titleKo })),
  ]) {
    idMap.set(item.id, (idMap.get(item.id) ?? 0) + 1);
    const normTitle = normalizePresetTitle(item.title);
    const list = titleMap.get(normTitle) ?? [];
    list.push(item.id);
    titleMap.set(normTitle, list);
  }

  for (const [id, count] of idMap) {
    if (count > 1) duplicateTitleIdSet.add(id);
  }
  for (const [, ids] of titleMap) {
    if (ids.length > 1) {
      ids.forEach((id) => duplicateTitleIdSet.add(id));
    }
  }

  // Duplicate exercise signatures detection
  const duplicateSignatureIdSet = new Set<string>();
  const classSigMap = new Map<string, string[]>();
  for (const preset of classPresets) {
    const sig = getPresetExerciseSignature(preset.steps);
    const list = classSigMap.get(sig) ?? [];
    list.push(preset.id);
    classSigMap.set(sig, list);
  }
  for (const [, ids] of classSigMap) {
    if (ids.length > 1) {
      ids.forEach((id) => duplicateSignatureIdSet.add(id));
    }
  }

  const blockSigMap = new Map<string, string[]>();
  for (const block of blockPresets) {
    const sig = getPresetExerciseSignature(block.items);
    const list = blockSigMap.get(sig) ?? [];
    list.push(block.id);
    blockSigMap.set(sig, list);
  }
  for (const [, ids] of blockSigMap) {
    if (ids.length > 1) {
      ids.forEach((id) => duplicateSignatureIdSet.add(id));
    }
  }

  // Pairwise similarity detection
  const highSimilarityPairs: PresetSimilarityPair[] = [];
  for (let i = 0; i < classPresets.length; i++) {
    for (let j = i + 1; j < classPresets.length; j++) {
      const pair = computePresetSimilarity(classPresets[i], classPresets[j]);
      if (pair.isDuplicateRisk) {
        highSimilarityPairs.push(pair);
      }
    }
  }

  for (let i = 0; i < blockPresets.length; i++) {
    for (let j = i + 1; j < blockPresets.length; j++) {
      const pair = computeBlockPresetSimilarity(blockPresets[i], blockPresets[j]);
      if (pair.isDuplicateRisk) {
        highSimilarityPairs.push(pair);
      }
    }
  }

  // Health claim violations across class presets, block presets, and blank starters
  const healthClaimViolations: Array<{ id: string; matchedClaims: readonly string[] }> = [];

  for (const res of classPresetResults) {
    if (!res.healthClaimCheck.safe) {
      healthClaimViolations.push({
        id: res.presetId,
        matchedClaims: res.healthClaimCheck.matchedClaims,
      });
    }
  }

  for (const res of blockPresetResults) {
    if (!res.healthClaimCheck.safe) {
      healthClaimViolations.push({
        id: res.blockId,
        matchedClaims: res.healthClaimCheck.matchedClaims,
      });
    }
  }

  let blankStartersValid = blankStarters.length > 0;
  for (const starter of blankStarters) {
    const starterClaimResult = inspectPresetObjectHealthClaims([
      starter.titleKo,
      starter.subtitleKo,
      starter.descriptionKo,
      starter.recommendedForKo,
      starter.placeholderIdeaPromptKo,
      starter.safetyBoundary?.disclaimerKo ?? '',
      ...starter.progressiveStepsGuideKo,
    ]);
    const boundaryOk =
      starter.safetyBoundary?.aiUsed === false &&
      starter.safetyBoundary?.medicalOrRehabEfficacyClaimed === false &&
      starter.safetyBoundary?.expertClinicalVerified === false &&
      starter.safetyBoundary?.editableByInstructor === true;

    if (!starterClaimResult.safe || !boundaryOk) {
      blankStartersValid = false;
      healthClaimViolations.push({
        id: starter.id,
        matchedClaims: starterClaimResult.safe
          ? ['safetyBoundary 계약 위반']
          : starterClaimResult.matchedClaims,
      });
    }
  }

  const duplicateTitleIds = [...duplicateTitleIdSet];
  const duplicateSignatureIds = [...duplicateSignatureIdSet];

  const valid =
    classPresets.length > 0 &&
    blockPresets.length > 0 &&
    blankStartersValid &&
    classPresetResults.every((r) => r.valid) &&
    blockPresetResults.every((r) => r.valid) &&
    duplicateTitleIds.length === 0 &&
    duplicateSignatureIds.length === 0 &&
    highSimilarityPairs.length === 0 &&
    healthClaimViolations.length === 0;

  const summaryKo = valid
    ? `수업 프리셋 ${classPresets.length}종, 재사용 블록 프리셋 ${blockPresets.length}종, 빈 초안 시작 옵션 ${blankStarters.length}종 모두 카탈로그 정합성·시간 합산·좌우 균형·전환 동선·중복 방지·비의학 안전 경계·편집 격리 검증을 통과했습니다.`
    : `프리셋 카탈로그 감사 실패: 수업 오류 ${classPresetResults.filter((r) => !r.valid).length}건, 블록 오류 ${blockPresetResults.filter((r) => !r.valid).length}건, 중복 제목 ${duplicateTitleIds.length}건, 중복 구성 ${duplicateSignatureIds.length}건, 유사도 위험 쌍 ${highSimilarityPairs.length}건, 건강·재활 표현 위반 ${healthClaimViolations.length}건.`;

  return {
    valid,
    classPresetCount: classPresets.length,
    blockPresetCount: blockPresets.length,
    blankStarterCount: blankStarters.length,
    classPresetResults,
    blockPresetResults,
    duplicateTitleIds,
    duplicateSignatureIds,
    highSimilarityPairs,
    healthClaimViolations,
    summaryKo,
  };
}

/**
 * 5. Filtering & Lookup
 */
export function filterOfflineClassPresets(
  presets: readonly OfflineClassPreset[],
  criteria?: PresetFilterCriteria,
): OfflineClassPreset[] {
  if (!criteria) return [...presets];

  const query = criteria.searchQuery?.trim().toLowerCase() ?? '';

  return presets.filter((preset) => {
    if (
      criteria.durationMinutes !== undefined &&
      preset.durationMinutes !== criteria.durationMinutes
    ) {
      return false;
    }
    if (criteria.theme !== undefined && preset.theme !== criteria.theme) {
      return false;
    }
    if (criteria.apparatus !== undefined && preset.apparatus !== criteria.apparatus) {
      return false;
    }
    if (
      criteria.availableEquipment !== undefined &&
      criteria.availableEquipment.length > 0 &&
      !equipmentRequirementsSatisfied(preset.requiredEquipment, criteria.availableEquipment)
    ) {
      return false;
    }
    if (criteria.level !== undefined && preset.level !== criteria.level) {
      return false;
    }
    if (
      criteria.sectionRole !== undefined &&
      !preset.steps.some(
        (step) =>
          (step.classSection ?? getMovementSectionRole(step.blockCategory)) ===
          criteria.sectionRole,
      )
    ) {
      return false;
    }
    if (
      criteria.category !== undefined &&
      !preset.steps.some((step) => step.blockCategory === criteria.category)
    ) {
      return false;
    }
    if (query.length > 0) {
      const haystack = [
        preset.title,
        preset.subtitle,
        preset.themeLabelKo,
        preset.userSummaryKo,
        preset.flowRationaleKo,
        ...preset.focusTags,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }
    return true;
  });
}

export function filterOfflineBlockPresets(
  presets: readonly OfflineBlockPreset[],
  criteria?: PresetFilterCriteria,
): OfflineBlockPreset[] {
  if (!criteria) return [...presets];

  const query = criteria.searchQuery?.trim().toLowerCase() ?? '';

  return presets.filter((block) => {
    if (
      criteria.durationMinutes !== undefined &&
      Math.round(block.durationMin) !== criteria.durationMinutes
    ) {
      return false;
    }
    if (criteria.theme !== undefined && block.theme !== criteria.theme) {
      return false;
    }
    if (criteria.apparatus !== undefined && block.apparatus !== criteria.apparatus) {
      return false;
    }
    if (
      criteria.availableEquipment !== undefined &&
      criteria.availableEquipment.length > 0 &&
      !equipmentRequirementsSatisfied(block.requiredEquipment, criteria.availableEquipment)
    ) {
      return false;
    }
    if (criteria.level !== undefined && block.level !== criteria.level) {
      return false;
    }
    if (criteria.sectionRole !== undefined && block.sectionRole !== criteria.sectionRole) {
      return false;
    }
    if (
      criteria.category !== undefined &&
      block.category !== criteria.category &&
      !block.items.some((item) => item.blockCategory === criteria.category)
    ) {
      return false;
    }
    if (query.length > 0) {
      const haystack = [
        block.title,
        block.description ?? '',
        block.themeLabelKo,
        block.targetAudienceSummaryKo,
        block.flowRationaleKo,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }
    return true;
  });
}

/**
 * 6. Editable Instantiation & P1/P5 Adapters
 */
export function instantiateClassPresetAsEditableSequence(
  preset: OfflineClassPreset,
  overrides?: {
    title?: string;
    subtitle?: string;
    targetMinutes?: number;
    level?: DifficultyLevel;
    nowIso?: string;
  },
  exercises: readonly PilatesExercise[] = INITIAL_EXERCISES,
): InstantiatedClassPresetResult {
  const timestamp = overrides?.nowIso ?? new Date().toISOString();
  const targetMinutes = overrides?.targetMinutes ?? preset.durationMinutes;
  const level = overrides?.level ?? preset.level;
  const title = overrides?.title?.trim() || preset.title;
  const subtitle = overrides?.subtitle?.trim() || preset.subtitle;
  const exerciseMap = new Map(exercises.map((ex) => [ex.id, ex]));
  const cloneSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  let editableSteps: SequenceStep[] = preset.steps.map((step, index) => {
    const catalogEx = exerciseMap.get(step.exerciseId);
    const snapshot: MovementSnapshot | undefined = step.exerciseSnapshot
      ? structuredClone(step.exerciseSnapshot)
      : catalogEx
        ? createMovementSnapshot(catalogEx, timestamp)
        : undefined;

    return {
      ...structuredClone(step),
      stepId: `${preset.id}-edit-${cloneSuffix}-step-${index + 1}`,
      order: index + 1,
      locked: false,
      exerciseSnapshot: snapshot,
    };
  });

  if (
    targetMinutes !== preset.durationMinutes &&
    Number.isFinite(targetMinutes) &&
    targetMinutes >= 10 &&
    targetMinutes <= 120
  ) {
    try {
      editableSteps = fitSequenceDuration(editableSteps, targetMinutes);
    } catch {
      const scale = targetMinutes / preset.durationMinutes;
      editableSteps = editableSteps.map((step) => ({
        ...step,
        durationMin: Number(Math.max(1, step.durationMin * scale).toFixed(2)),
      }));
    }
  }

  const criteria: AutoGenerateCriteria = {
    apparatus: preset.apparatus,
    availableEquipment: [...preset.requiredEquipment],
    level,
    focusPreset: preset.focusPreset,
    preferredProps: [...preset.recommendedProps],
    excludeDaysWindow: 10,
    targetMinutes,
    defaultLayer: 'standard',
  };

  const sequence: SavedSequence = {
    id: `seq-preset-${preset.id}-${cloneSuffix}`,
    title,
    subtitle,
    apparatus: preset.apparatus,
    level,
    focusTags: [...preset.focusTags],
    targetMinutes,
    steps: editableSteps,
    createdAt: timestamp,
    updatedAt: timestamp,
    taughtCount: 0,
    version: 1,
    criteriaSnapshot: criteria,
    sourceProvenance: {
      kind: 'saved-sequence-clone',
      sourceId: preset.id,
      sourceTitle: preset.title,
      sourceSequenceId: preset.id,
      sourceVersion: 1,
      sourceUpdatedAt: preset.updatedAt,
      clonedAt: timestamp,
      summaryKo: `오프라인 수업 프리셋 '${preset.title}'에서 복제된 강사 편집 시퀀스`,
    },
  };

  const conditionTemplate: ConditionTemplate = {
    id: `tpl-preset-${preset.id}-${cloneSuffix}`,
    name: `${title} 조건 템플릿`,
    criteria: structuredClone(criteria),
    createdAt: timestamp,
  };

  return {
    sequence,
    conditionTemplate,
    sourcePresetId: preset.id,
    isEditableCopy: true,
  };
}

export function instantiateBlockPresetAsReusableBlock(
  blockPreset: OfflineBlockPreset,
  overrides?: {
    title?: string;
    durationMin?: number;
    nowIso?: string;
  },
  exercises: readonly PilatesExercise[] = INITIAL_EXERCISES,
): ReusableBlock {
  const timestamp = overrides?.nowIso ?? new Date().toISOString();
  const cloneSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  let block = createReusableBlock(
    {
      id: `${blockPreset.id}-copy-${cloneSuffix}`,
      title: overrides?.title?.trim() || blockPreset.title,
      description: blockPreset.description,
      sectionRole: blockPreset.sectionRole,
      now: timestamp,
      items: blockPreset.items.map((item) => ({
        exerciseId: item.exerciseId,
        blockCategory: item.blockCategory,
        durationMin: item.durationMin,
        explanationSec: item.explanationSec,
        transitionSec: item.transitionSec,
        repetitions: item.repetitions,
        sets: item.sets,
        sideMode: item.sideMode,
        selectedLayer: item.selectedLayer,
        customSpringOverride: item.customSpringOverride,
        instructorNote: item.instructorNote,
        exerciseSnapshot: item.exerciseSnapshot
          ? structuredClone(item.exerciseSnapshot)
          : undefined,
      })),
    },
    exercises,
  );

  if (
    overrides?.durationMin !== undefined &&
    Number.isFinite(overrides.durationMin) &&
    overrides.durationMin > 0 &&
    Math.round(overrides.durationMin * 60) !== Math.round(blockPreset.durationMin * 60)
  ) {
    block = scaleReusableBlockDuration(block, overrides.durationMin, timestamp);
  }

  return block;
}

export function insertBlockPresetIntoSequence(
  steps: readonly SequenceStep[],
  blockPreset: OfflineBlockPreset,
  options?: {
    insertAtIndex?: number;
    targetDurationMin?: number;
  },
  exercises: readonly PilatesExercise[] = INITIAL_EXERCISES,
): { steps: SequenceStep[]; blockInstanceId: string } {
  const reusableBlock = instantiateBlockPresetAsReusableBlock(
    blockPreset,
    {
      durationMin: options?.targetDurationMin,
    },
    exercises,
  );

  const afterStepIndex =
    options?.insertAtIndex === undefined
      ? undefined
      : options.insertAtIndex <= 0
        ? -1
        : Math.min(steps.length, options.insertAtIndex) - 1;

  return insertReusableBlockIntoSequence(steps, reusableBlock, {
    afterStepIndex,
    sectionRoleOverride: blockPreset.sectionRole,
  });
}

export function toP5ReusableBlockContract(
  block: ReusableBlock | OfflineBlockPreset,
): P1ReusableBlockContract {
  const category: ClassBlockCategory =
    'category' in block && block.category
      ? block.category
      : (block.items[0]?.blockCategory ??
        (block.sectionRole === 'preparation'
          ? 'warmup'
          : block.sectionRole === 'cooldown'
            ? 'cooldown'
            : 'core'));

  const durationMin =
    'durationMin' in block && typeof block.durationMin === 'number'
      ? block.durationMin
      : Number(block.items.reduce((sum, item) => sum + item.durationMin, 0).toFixed(2));

  const isReviewed =
    'isReviewed' in block && typeof block.isReviewed === 'boolean'
      ? block.isReviewed
      : block.items.every(
          (item) =>
            !item.humanDraftId && item.exerciseSnapshot?.sourceOrigin !== 'human-created',
        );

  const steps: P1ReusableBlockStepContract[] = block.items.map((item) => {
    const snap = item.exerciseSnapshot;
    const contractSnapshot: P1MovementSnapshotContract | undefined = snap
      ? {
          id: snap.id,
          nameKo: snap.nameKo,
          nameEn: snap.nameEn,
          apparatus: snap.apparatus,
          requiredEquipment: snap.requiredEquipment ? [...snap.requiredEquipment] : undefined,
          movementFamily: snap.movementFamily,
          capturedAt: snap.capturedAt,
        }
      : undefined;

    return {
      exerciseId: item.exerciseId,
      blockCategory: item.blockCategory,
      durationMin: item.durationMin,
      selectedLayer: item.selectedLayer,
      instructorNote: item.instructorNote,
      exerciseSnapshot: contractSnapshot,
    };
  });

  return {
    id: block.id,
    title: block.title,
    description: block.description,
    apparatus: block.apparatus,
    level: block.level,
    category,
    durationMin,
    steps,
    isReviewed,
  };
}

/**
 * 7. Blank Draft Starter Builders (새 동작 창작 사용자용 빈 초안 시작)
 */
function buildSectionFrameSteps(
  apparatus: ApparatusType | 'mixed',
  level: DifficultyLevel,
  targetMinutes: number,
  exercises: readonly PilatesExercise[],
  timestamp: string,
): SequenceStep[] {
  const targetApparatus: ApparatusType = apparatus === 'mixed' ? 'reformer' : apparatus;
  const eligible = exercises.filter(
    (ex) => ex.apparatus === targetApparatus && Number(ex.level) <= Number(level),
  );
  const pool = eligible.length >= 3 ? eligible : exercises;

  const prepEx =
    pool.find((ex) => ex.blockCategory === 'warmup') ??
    exercises.find((ex) => ex.blockCategory === 'warmup') ??
    exercises[0];
  const mainEx =
    pool.find((ex) => ex.blockCategory === 'core' && !ex.isUnilateral) ??
    pool.find((ex) => !['warmup', 'cooldown'].includes(ex.blockCategory) && !ex.isUnilateral) ??
    exercises.find((ex) => ex.blockCategory === 'core') ??
    exercises[1] ??
    exercises[0];
  const cooldownEx =
    pool.find((ex) => ex.blockCategory === 'cooldown' && !ex.isUnilateral) ??
    pool.find((ex) => ex.blockCategory === 'cooldown') ??
    exercises.find((ex) => ex.blockCategory === 'cooldown') ??
    exercises[exercises.length - 1];

  const safeTotalMin = Math.max(10, targetMinutes || 30);
  const prepMin = Math.max(2, Math.round(safeTotalMin * 0.2));
  const cooldownMin = Math.max(2, Math.round(safeTotalMin * 0.2));
  const mainMin = Math.max(2, safeTotalMin - prepMin - cooldownMin);

  const frameEntries: Array<{
    ex: PilatesExercise;
    role: ClassSectionRole;
    durationMin: number;
    noteKo: string;
  }> = [
    {
      ex: prepEx,
      role: 'preparation',
      durationMin: prepMin,
      noteKo: '도입(Preparation) 기본 프레임 — 자유롭게 교체하거나 시간을 조정하세요.',
    },
    {
      ex: mainEx,
      role: 'main',
      durationMin: mainMin,
      noteKo: '메인(Main) 기본 프레임 — 직접 만든 새 동작이나 블록을 여기에 연결하세요.',
    },
    {
      ex: cooldownEx,
      role: 'cooldown',
      durationMin: cooldownMin,
      noteKo: '쿨다운(Cooldown) 기본 프레임 — 수업 마무리 호흡·이완 구간입니다.',
    },
  ];

  return frameEntries.map((entry, idx) => ({
    kind: 'exercise',
    stepId: `frame-step-${idx + 1}-${entry.ex.id}`,
    order: idx + 1,
    blockCategory: entry.ex.blockCategory,
    exerciseId: entry.ex.id,
    durationMin: entry.durationMin,
    explanationSec: 20,
    transitionSec: idx === 0 ? 0 : 25,
    sideMode: entry.ex.isUnilateral ? 'left-then-right' : 'together',
    selectedLayer: 'standard',
    instructorNote: entry.noteKo,
    classSection: entry.role,
    locked: false,
    exerciseSnapshot: createMovementSnapshot(entry.ex, timestamp),
  }));
}

export function startFromBlankDraftOption(
  starter: BlankDraftStarterOption,
  options?: StartBlankDraftOptions,
  exercises: readonly PilatesExercise[] = INITIAL_EXERCISES,
): BlankDraftSessionBundle {
  const nowIso = options?.nowIso ?? new Date().toISOString();
  const resolvedApparatus = options?.apparatus ?? starter.defaultApparatus;
  const singleApparatus: ApparatusType | undefined =
    resolvedApparatus !== 'mixed' ? resolvedApparatus : undefined;
  const resolvedLevel: DifficultyLevel = options?.level ?? starter.defaultLevel;
  const resolvedDurationMinutes = Math.max(
    1,
    options?.durationMinutes ?? starter.defaultDurationMinutes,
  );
  const resolvedSectionRole: ClassSectionRole =
    options?.sectionRole ?? starter.defaultSectionRole ?? 'main';
  const resolvedBlockCategory: ClassBlockCategory | undefined =
    options?.blockCategory ?? starter.defaultBlockCategory;

  const explicitIdeaLine = options?.ideaLine?.trim();
  const effectiveIdeaLine = explicitIdeaLine || starter.placeholderIdeaPromptKo;

  // Always create a clean in-memory working buffer without mutating global storage
  const movementIdeaBuffer: MovementIdeaWorkingBuffer = {
    editingExerciseId: null,
    ideaLine: explicitIdeaLine ?? '',
    workingTitle: options?.workingNameKo?.trim() ?? '',
    subjectiveFeeling: '',
    adjustmentNote: '',
    photoDataUrl: '',
    triedByInstructor: false,
    apparatus: singleApparatus ?? '',
    durationMin: String(Math.min(20, Math.max(1, resolvedDurationMinutes))),
    level: resolvedLevel,
    updatedAt: nowIso,
  };

  const safetyBoundary = structuredClone(starter.safetyBoundary);
  const guidanceNoticesKo: string[] = [...starter.progressiveStepsGuideKo];

  if (starter.starterKind === 'blank-movement-idea') {
    const humanMovementDraft = createHumanMovementIdeaDraft({
      ideaLine: effectiveIdeaLine,
      workingNameKo: options?.workingNameKo?.trim() || undefined,
      apparatus: options?.apparatus && options.apparatus !== 'mixed' ? options.apparatus : undefined,
      sectionRole: options?.sectionRole,
      blockCategory: options?.blockCategory,
      level: options?.level,
      defaultDurationMin: options?.durationMinutes,
      isUnilateral: options?.isUnilateral,
      now: nowIso,
    });

    const readiness = evaluateDraftStageReadiness(humanMovementDraft, 'idea-save');
    for (const notice of readiness.guidanceNoticesKo) {
      if (!guidanceNoticesKo.includes(notice)) {
        guidanceNoticesKo.push(notice);
      }
    }

    return {
      starterId: starter.id,
      starterKind: starter.starterKind,
      createdAt: nowIso,
      safetyBoundary,
      humanMovementDraft,
      movementIdeaBuffer: {
        ...movementIdeaBuffer,
        ideaLine: humanMovementDraft.ideaLine,
      },
      guidanceNoticesKo,
    };
  }

  if (starter.starterKind === 'blank-reusable-block') {
    const itemDurationMin = Math.min(20, Math.max(1, resolvedDurationMinutes));
    const humanMovementDraft = createHumanMovementIdeaDraft({
      ideaLine: effectiveIdeaLine,
      workingNameKo: options?.workingNameKo?.trim() || undefined,
      apparatus: singleApparatus,
      sectionRole: resolvedSectionRole,
      blockCategory: resolvedBlockCategory,
      level: resolvedLevel,
      defaultDurationMin: itemDurationMin,
      isUnilateral: options?.isUnilateral,
      now: nowIso,
    });

    const initialBlock = createReusableBlock(
      {
        title: options?.title?.trim() || starter.titleKo,
        description: options?.subtitle?.trim() || starter.descriptionKo,
        sectionRole: resolvedSectionRole,
        now: nowIso,
        humanDrafts: [humanMovementDraft],
        items: [
          {
            exerciseId: humanMovementDraft.id,
            humanDraftId: humanMovementDraft.id,
            humanDraftRevision: humanMovementDraft.revision,
            blockCategory:
              resolvedBlockCategory ??
              (resolvedSectionRole === 'preparation'
                ? 'warmup'
                : resolvedSectionRole === 'cooldown'
                  ? 'cooldown'
                  : 'core'),
            durationMin: itemDurationMin,
            selectedLayer: options?.selectedLayer ?? 'standard',
            sideMode: options?.isUnilateral ? 'left-then-right' : 'together',
            instructorNote: '직접 만든 새 동작 초안 — 자유롭게 수정하거나 다른 동작을 추가하세요.',
          },
        ],
      },
      exercises,
      [humanMovementDraft],
    );

    const readiness = evaluateDraftStageReadiness(humanMovementDraft, 'block-link');
    for (const notice of readiness.guidanceNoticesKo) {
      if (!guidanceNoticesKo.includes(notice)) {
        guidanceNoticesKo.push(notice);
      }
    }

    return {
      starterId: starter.id,
      starterKind: starter.starterKind,
      createdAt: nowIso,
      safetyBoundary,
      humanMovementDraft,
      movementIdeaBuffer: {
        ...movementIdeaBuffer,
        ideaLine: humanMovementDraft.ideaLine,
      },
      reusableBlockDraft: initialBlock,
      guidanceNoticesKo,
    };
  }

  if (starter.starterKind === 'blank-class-sequence') {
    const targetMinutes = Math.max(10, resolvedDurationMinutes);
    let steps: SequenceStep[] = starter.includeSectionFrameSteps
      ? buildSectionFrameSteps(
          resolvedApparatus,
          resolvedLevel,
          targetMinutes,
          exercises,
          nowIso,
        )
      : [];

    let humanMovementDraft: HumanMovementDraft | undefined;
    if (explicitIdeaLine) {
      humanMovementDraft = createHumanMovementIdeaDraft({
        ideaLine: explicitIdeaLine,
        workingNameKo: options?.workingNameKo?.trim() || undefined,
        apparatus: singleApparatus,
        sectionRole: resolvedSectionRole,
        blockCategory: resolvedBlockCategory,
        level: resolvedLevel,
        defaultDurationMin: Math.min(10, Math.max(2, Math.round(targetMinutes * 0.15))),
        isUnilateral: options?.isUnilateral,
        now: nowIso,
      });

      const linked = linkHumanDraftToSequence(steps, humanMovementDraft, {
        overrides: {
          apparatus: singleApparatus,
          sectionRole: resolvedSectionRole,
          blockCategory: resolvedBlockCategory,
          level: resolvedLevel,
          selectedLayer: options?.selectedLayer,
          isUnilateral: options?.isUnilateral,
        },
        now: nowIso,
      });
      steps = linked.steps;
      for (const notice of linked.guidanceNoticesKo) {
        if (!guidanceNoticesKo.includes(notice)) {
          guidanceNoticesKo.push(notice);
        }
      }
    }

    const sequenceDraft: SavedSequence = {
      id: `seq-blank-${starter.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: options?.title?.trim() || starter.titleKo,
      subtitle: options?.subtitle?.trim() || starter.subtitleKo,
      apparatus: resolvedApparatus,
      level: resolvedLevel,
      focusTags: ['강사 직접 구성', '빈 초안 시작'],
      targetMinutes,
      steps,
      createdAt: nowIso,
      updatedAt: nowIso,
      taughtCount: 0,
      version: 1,
      sourceProvenance: {
        kind: 'manual',
        sourceId: starter.id,
        sourceTitle: starter.titleKo,
        clonedAt: nowIso,
        summaryKo: `빈 수업 시퀀스 초안('${starter.titleKo}')에서 강사가 직접 시작한 시퀀스`,
      },
    };

    return {
      starterId: starter.id,
      starterKind: starter.starterKind,
      createdAt: nowIso,
      safetyBoundary,
      humanMovementDraft,
      movementIdeaBuffer,
      sequenceDraft,
      guidanceNoticesKo,
    };
  }

  // 'blank-custom-movement-showcase'
  const targetMinutes = Math.max(15, resolvedDurationMinutes);
  const customDurationMin = Math.min(10, Math.max(3, Math.round(targetMinutes * 0.25)));
  const humanMovementDraft = createHumanMovementIdeaDraft({
    ideaLine: effectiveIdeaLine,
    workingNameKo: options?.workingNameKo?.trim() || '내 창작 동작 쇼케이스 초안',
    apparatus: singleApparatus ?? 'reformer',
    sectionRole: 'main',
    blockCategory: resolvedBlockCategory ?? 'core',
    level: resolvedLevel,
    defaultDurationMin: customDurationMin,
    isUnilateral: options?.isUnilateral ?? false,
    now: nowIso,
  });

  // Create a seed block and link the human draft via linkHumanDraftToReusableBlock
  const baseBlock = createReusableBlock(
    {
      title: options?.title?.trim() || `${starter.titleKo} 블록`,
      description: starter.descriptionKo,
      sectionRole: 'main',
      now: nowIso,
      humanDrafts: [humanMovementDraft],
      items: [
        {
          exerciseId: humanMovementDraft.id,
          humanDraftId: humanMovementDraft.id,
          humanDraftRevision: humanMovementDraft.revision,
          blockCategory: resolvedBlockCategory ?? 'core',
          durationMin: customDurationMin,
          selectedLayer: options?.selectedLayer ?? 'standard',
          sideMode: options?.isUnilateral ? 'left-then-right' : 'together',
          instructorNote:
            '직접 만든 새 동작을 연습·점검하는 메인 쇼케이스 항목입니다. 느낀 점과 수정할 점을 기록해 보세요.',
        },
      ],
    },
    exercises,
    [humanMovementDraft],
  );

  // Also verify linkHumanDraftToReusableBlock guidance
  const linkCheck = linkHumanDraftToReusableBlock(
    baseBlock,
    humanMovementDraft,
    {
      apparatus: singleApparatus ?? 'reformer',
      sectionRole: 'main',
      blockCategory: resolvedBlockCategory ?? 'core',
      level: resolvedLevel,
      durationMin: customDurationMin,
      selectedLayer: options?.selectedLayer ?? 'standard',
    },
    nowIso,
  );
  for (const notice of linkCheck.guidanceNoticesKo) {
    if (!guidanceNoticesKo.includes(notice)) {
      guidanceNoticesKo.push(notice);
    }
  }

  const reusableBlockDraft = baseBlock;

  const baseFrameSteps = buildSectionFrameSteps(
    resolvedApparatus,
    resolvedLevel,
    targetMinutes,
    exercises,
    nowIso,
  );
  const prepStep = baseFrameSteps[0];
  const cooldownStep = baseFrameSteps[baseFrameSteps.length - 1];
  const remainingMin = Math.max(4, targetMinutes - customDurationMin);
  const prepMin = Math.max(2, Math.floor(remainingMin / 2));
  const cooldownMin = Math.max(2, remainingMin - prepMin);

  const prepAndCooldown: SequenceStep[] = [
    { ...prepStep, durationMin: prepMin, order: 1 },
    { ...cooldownStep, durationMin: cooldownMin, order: 2 },
  ];

  const inserted = insertReusableBlockIntoSequence(prepAndCooldown, reusableBlockDraft, {
    afterStepIndex: 0,
    sectionRoleOverride: 'main',
  });

  const sequenceDraft: SavedSequence = {
    id: `seq-showcase-${starter.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: options?.title?.trim() || starter.titleKo,
    subtitle: options?.subtitle?.trim() || starter.subtitleKo,
    apparatus: resolvedApparatus,
    level: resolvedLevel,
    focusTags: ['새 동작 쇼케이스', '강사 직접 창작', '비AI 오프라인'],
    targetMinutes,
    steps: inserted.steps,
    createdAt: nowIso,
    updatedAt: nowIso,
    taughtCount: 0,
    version: 1,
    sourceProvenance: {
      kind: 'manual',
      sourceId: starter.id,
      sourceTitle: starter.titleKo,
      clonedAt: nowIso,
      summaryKo: `새 동작 창작 쇼케이스('${starter.titleKo}')에서 생성된 편집 가능 시퀀스`,
    },
  };

  return {
    starterId: starter.id,
    starterKind: starter.starterKind,
    createdAt: nowIso,
    safetyBoundary,
    humanMovementDraft,
    movementIdeaBuffer: {
      ...movementIdeaBuffer,
      ideaLine: humanMovementDraft.ideaLine,
    },
    reusableBlockDraft,
    sequenceDraft,
    guidanceNoticesKo,
  };
}
