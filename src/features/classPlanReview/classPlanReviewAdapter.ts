import { INITIAL_EXERCISES } from '../../data/pilatesCatalog';
import type { OfflineBlockPreset, OfflineClassPreset } from '../../types/classBlockPresets';
import type {
  ClassBlockSnapshot,
  ClassSequenceSnapshot,
  HierarchyPilatesExercise,
  HumanMovementDraft,
  MovementSnapshot,
  ReusableBlock,
  ReusableBlockItem,
} from '../../types/hierarchy';
import type {
  ApparatusType,
  ClassBlockCategory,
  PilatesExercise,
  SavedSequence,
  SequenceStep,
  StepSideMode,
} from '../../types/pilates';
import type { ClassSectionRole } from '../../types/sequenceMotion';
import { getMovementSectionRole, summarizeReusableBlockTiming } from '../../utils/hierarchyModel';
import {
  getMovementKey,
  getStepSideLabels,
  getStepTiming,
  isRestStep,
} from '../../utils/sequenceEngine';
import {
  resolveMovementForValidation,
  resolveStepSectionRole,
} from '../../utils/sequenceValidation';
import { calculateStepTimeEstimate } from '../../utils/stepTimeEstimate';
import {
  CLASS_PLAN_REVIEW_LIMITS,
  type ClassPlanReviewIssue,
  type ClassPlanReviewIssueCode,
  type ClassPlanReviewOptions,
  type NormalizedClassReviewItem,
  type NormalizedClassReviewPlan,
  type ReviewItemDurationStatus,
  type ReviewItemLateralityStatus,
  type ReviewItemSourceKind,
} from './classPlanReviewTypes';

const VALID_SIDE_MODES: ReadonlySet<StepSideMode> = new Set<StepSideMode>([
  'together',
  'left',
  'right',
  'left-then-right',
  'right-then-left',
]);

const VALID_APPARATUS: ReadonlySet<ApparatusType> = new Set<ApparatusType>([
  'reformer',
  'cadillac',
  'chair',
  'barrel',
  'mat',
]);

const VALID_BLOCK_CATEGORIES: ReadonlySet<ClassBlockCategory> = new Set<ClassBlockCategory>([
  'warmup',
  'footwork',
  'bridging',
  'core',
  'upper-body',
  'lower-body',
  'plank',
  'extension',
  'feet-in-straps',
  'cooldown',
]);

const VALID_SECTION_ROLES: ReadonlySet<ClassSectionRole> = new Set<ClassSectionRole>([
  'preparation',
  'main',
  'cooldown',
]);

const HARD_RAW_SCAN_LIMIT = 10000;

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

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isValidSideMode(value: unknown): value is StepSideMode {
  return typeof value === 'string' && VALID_SIDE_MODES.has(value as StepSideMode);
}

function isValidApparatus(value: unknown): value is ApparatusType {
  return typeof value === 'string' && VALID_APPARATUS.has(value as ApparatusType);
}

function isValidBlockCategory(value: unknown): value is ClassBlockCategory {
  return typeof value === 'string' && VALID_BLOCK_CATEGORIES.has(value as ClassBlockCategory);
}

function isValidSectionRole(value: unknown): value is ClassSectionRole {
  return typeof value === 'string' && VALID_SECTION_ROLES.has(value as ClassSectionRole);
}

interface ParentContainerContext {
  readonly blockInstanceId?: string;
  readonly sourceBlockId?: string;
  readonly sourceBlockTitle?: string;
  readonly sectionRole?: ClassSectionRole;
  readonly blockCategory?: ClassBlockCategory;
  readonly apparatus?: ApparatusType;
}

function getContainerChildArrays(node: Record<string, unknown>): readonly unknown[][] {
  if (node.presetKind === 'reusable-block') {
    if (Array.isArray(node.items)) return [node.items];
    if (Array.isArray(node.steps)) return [node.steps];
    return [];
  }

  const arrays: unknown[][] = [];
  if (Array.isArray(node.steps)) arrays.push(node.steps);
  if (Array.isArray(node.items)) arrays.push(node.items);
  if (Array.isArray(node.blocks)) arrays.push(node.blocks);
  if (Array.isArray(node.children)) arrays.push(node.children);
  return arrays;
}

function hasAnyNonArrayContainerProperty(node: Record<string, unknown>): boolean {
  const keys = ['steps', 'items', 'blocks', 'children'] as const;
  return keys.some((key) => node[key] !== undefined && !Array.isArray(node[key]));
}

function isContainerNode(node: unknown): boolean {
  if (Array.isArray(node)) return true;
  if (!isPlainRecord(node)) return false;
  return getContainerChildArrays(node).length > 0;
}

function isRecognizableLeafItem(raw: Record<string, unknown>): boolean {
  if (raw.kind === 'rest' || raw.kind === 'exercise' || raw.kind === 'draft') {
    return true;
  }
  if (
    nonEmptyString(raw.exerciseId) ||
    nonEmptyString(raw.humanDraftId) ||
    nonEmptyString(raw.nameKo) ||
    nonEmptyString(raw.workingNameKo) ||
    nonEmptyString(raw.ideaLine) ||
    nonEmptyString(raw.title) ||
    nonEmptyString(raw.nameEn)
  ) {
    return true;
  }
  if (raw.sourceOrigin === 'human-created') {
    return true;
  }
  if (isPlainRecord(raw.exerciseSnapshot) || isPlainRecord(raw.timeEstimate)) {
    return true;
  }
  if (
    raw.durationMin !== undefined &&
    (nonEmptyString(raw.stepId) ||
      nonEmptyString(raw.itemId) ||
      nonEmptyString(raw.id) ||
      nonEmptyString(raw.instructorNote) ||
      raw.sideMode !== undefined ||
      raw.repetitions !== undefined ||
      raw.sets !== undefined ||
      isValidBlockCategory(raw.blockCategory) ||
      isValidApparatus(raw.apparatus))
  ) {
    return true;
  }
  return false;
}

function detectSourceModelKind(
  source: unknown,
  forcedKind?: NormalizedClassReviewPlan['sourceModelKind'],
): NormalizedClassReviewPlan['sourceModelKind'] {
  if (forcedKind) return forcedKind;
  if (source === null || source === undefined || typeof source !== 'object') {
    return 'corrupted-input';
  }
  if (Array.isArray(source)) {
    return 'step-array';
  }

  const record = source as Record<string, unknown>;
  const childArrays = getContainerChildArrays(record);

  if (childArrays.length === 0) {
    if (hasAnyNonArrayContainerProperty(record)) {
      return 'corrupted-input';
    }
    const hasPlanMetadata =
      nonEmptyString(record.title) !== undefined ||
      record.targetMinutes !== undefined ||
      record.durationMinutes !== undefined ||
      record.durationMin !== undefined;
    if (!hasPlanMetadata) {
      return 'corrupted-input';
    }
    return 'composite-object';
  }

  if (typeof record.snapshotId === 'string' && Array.isArray(record.steps)) {
    return 'class-snapshot';
  }
  if (
    record.presetKind === 'class-sequence' ||
    (typeof record.durationMinutes === 'number' &&
      Array.isArray(record.steps) &&
      record.targetMinutes === undefined)
  ) {
    return 'class-preset';
  }
  if (
    record.presetKind === 'reusable-block' ||
    (Array.isArray(record.items) &&
      !Array.isArray(record.steps) &&
      !Array.isArray(record.blocks) &&
      !Array.isArray(record.children) &&
      (typeof record.sectionRole === 'string' || typeof record.version === 'number'))
  ) {
    return 'reusable-block';
  }
  if (
    Array.isArray(record.steps) &&
    !Array.isArray(record.items) &&
    !Array.isArray(record.blocks) &&
    !Array.isArray(record.children)
  ) {
    return 'saved-sequence';
  }
  return 'composite-object';
}

function buildFallbackSyntheticExercise(params: {
  id: string;
  nameKo: string;
  nameEn?: string;
  movementFamily?: string;
  apparatus?: ApparatusType;
  blockCategory?: ClassBlockCategory;
  isUnilateral?: boolean;
}): PilatesExercise {
  return {
    id: params.id,
    nameKo: params.nameKo,
    nameEn: params.nameEn ?? params.nameKo,
    movementFamily: params.movementFamily,
    apparatus: params.apparatus ?? 'mat',
    props: ['none'],
    blockCategory: params.blockCategory ?? 'core',
    spinalPlanes: ['neutral'],
    bodyPosition: 'supine',
    level: '1.0',
    defaultDurationMin: 4,
    isUnilateral: params.isUnilateral ?? false,
    springs: '',
    box: 'none',
    footbar: 'none',
    headrest: 'flat',
    targetMuscles: [],
    breathPattern: '',
    cues: [],
    precautions: '',
    layers: {
      easy: '',
      standard: '',
      hard: '',
    },
    youtube: {
      videoId: 'dQw4w9WgXcQ',
      channelName: 'Local Review',
      videoTitle: params.nameKo,
      startSec: 0,
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    },
    favoriteTag: 'none',
  };
}

function normalizeTargetMinutes(rawTarget: unknown): {
  targetMinutes: number | null;
  targetDurationStatus: 'known' | 'unspecified' | 'invalid';
} {
  if (rawTarget === undefined || rawTarget === null) {
    return {
      targetMinutes: null,
      targetDurationStatus: 'unspecified',
    };
  }
  if (
    typeof rawTarget === 'number' &&
    Number.isFinite(rawTarget) &&
    rawTarget >= CLASS_PLAN_REVIEW_LIMITS.MIN_TARGET_MINUTES &&
    rawTarget <= CLASS_PLAN_REVIEW_LIMITS.MAX_TARGET_MINUTES &&
    Math.round(rawTarget * 60) > 0
  ) {
    return {
      targetMinutes: rawTarget,
      targetDurationStatus: 'known',
    };
  }
  return {
    targetMinutes: null,
    targetDurationStatus: 'invalid',
  };
}

function hasDirectSelfOrAncestorProperty(
  raw: Record<string, unknown>,
  activeAncestors: WeakSet<object>,
): boolean {
  for (const key of Object.keys(raw)) {
    const val = raw[key];
    if (val !== null && typeof val === 'object') {
      if (val === raw || activeAncestors.has(val)) {
        return true;
      }
    }
  }
  return false;
}

function adaptInternal(
  source: unknown,
  options?: ClassPlanReviewOptions & {
    planId?: string;
    title?: string;
    forcedKind?: NormalizedClassReviewPlan['sourceModelKind'];
  },
): NormalizedClassReviewPlan {
  const sourceModelKind = detectSourceModelKind(source, options?.forcedKind);
  const sourceRecord = isPlainRecord(source) ? source : undefined;

  const maxItems =
    options?.maxItems !== undefined &&
    typeof options.maxItems === 'number' &&
    Number.isFinite(options.maxItems) &&
    options.maxItems >= 0
      ? Math.min(CLASS_PLAN_REVIEW_LIMITS.MAX_ITEMS, Math.floor(options.maxItems))
      : CLASS_PLAN_REVIEW_LIMITS.MAX_ITEMS;

  const maxNestingDepth =
    options?.maxNestingDepth !== undefined &&
    typeof options.maxNestingDepth === 'number' &&
    Number.isFinite(options.maxNestingDepth) &&
    options.maxNestingDepth >= 0
      ? Math.min(CLASS_PLAN_REVIEW_LIMITS.MAX_NESTING_DEPTH, Math.floor(options.maxNestingDepth))
      : CLASS_PLAN_REVIEW_LIMITS.MAX_NESTING_DEPTH;

  // Resolve exercises, humanDrafts, and exerciseSnapshots without mutating inputs
  const sourceExercises =
    sourceRecord && Array.isArray(sourceRecord.exercises)
      ? (sourceRecord.exercises.filter(isPlainRecord) as unknown as readonly HierarchyPilatesExercise[])
      : undefined;
  const effectiveExercises: readonly HierarchyPilatesExercise[] =
    options?.exercises ?? sourceExercises ?? INITIAL_EXERCISES;

  const exerciseMap = new Map<string, HierarchyPilatesExercise>();
  for (const ex of effectiveExercises) {
    if (isPlainRecord(ex) && nonEmptyString(ex.id)) {
      exerciseMap.set(ex.id.trim(), ex);
    }
  }

  const combinedDrafts: HumanMovementDraft[] = [];
  if (options?.humanDrafts && Array.isArray(options.humanDrafts)) {
    for (const draft of options.humanDrafts) {
      if (isPlainRecord(draft) && nonEmptyString(draft.id)) {
        combinedDrafts.push(draft as unknown as HumanMovementDraft);
      }
    }
  }
  if (sourceRecord && Array.isArray(sourceRecord.humanDrafts)) {
    for (const draft of sourceRecord.humanDrafts) {
      if (isPlainRecord(draft) && nonEmptyString(draft.id)) {
        combinedDrafts.push(draft as unknown as HumanMovementDraft);
      }
    }
  }
  const draftMap = new Map<string, HumanMovementDraft>();
  for (const draft of combinedDrafts) {
    draftMap.set(draft.id.trim(), draft);
  }

  const snapshotMap = new Map<string, MovementSnapshot>();
  if (sourceRecord && isPlainRecord(sourceRecord.exerciseSnapshots)) {
    for (const [key, snap] of Object.entries(sourceRecord.exerciseSnapshots)) {
      if (isPlainRecord(snap)) {
        snapshotMap.set(key, snap as unknown as MovementSnapshot);
      }
    }
  }

  // Block snapshot lookup by stepId for ClassSequenceSnapshot
  const blockSnapshotByStepId = new Map<string, ClassBlockSnapshot>();
  if (sourceRecord && Array.isArray(sourceRecord.blockSnapshots)) {
    for (const blockSnap of sourceRecord.blockSnapshots) {
      if (isPlainRecord(blockSnap) && Array.isArray(blockSnap.stepIds)) {
        for (const stepId of blockSnap.stepIds) {
          if (typeof stepId === 'string') {
            blockSnapshotByStepId.set(stepId, blockSnap as unknown as ClassBlockSnapshot);
          }
        }
      }
    }
  }

  // Resolve planId & title
  const planId =
    nonEmptyString(options?.planId) ??
    nonEmptyString(sourceRecord?.snapshotId) ??
    nonEmptyString(sourceRecord?.id) ??
    'review-plan-default';

  const title =
    nonEmptyString(options?.title) ??
    nonEmptyString(sourceRecord?.title) ??
    (sourceModelKind === 'corrupted-input' ? '입력 확인 필요 수업안' : '이름 없는 수업 계획');

  // Resolve targetMinutes
  const rawTargetMinutes =
    options && 'targetMinutes' in options && options.targetMinutes !== undefined
      ? options.targetMinutes
      : sourceRecord
        ? sourceRecord.targetMinutes !== undefined
          ? sourceRecord.targetMinutes
          : sourceRecord.durationMinutes !== undefined
            ? sourceRecord.durationMinutes
            : sourceRecord.durationMin
        : undefined;

  const { targetMinutes, targetDurationStatus } = normalizeTargetMinutes(rawTargetMinutes);

  const adapterIssues: ClassPlanReviewIssue[] = [];
  const pushAdapterIssue = (
    code: ClassPlanReviewIssueCode,
    category: ClassPlanReviewIssue['category'],
    severity: ClassPlanReviewIssue['severity'],
    itemIds: readonly string[],
    itemIndices: readonly number[],
    titleKo: string,
    messageKo: string,
    factualDetailKo?: string,
  ) => {
    adapterIssues.push({
      id: `adapter-issue-${adapterIssues.length + 1}-${code}`,
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

  if (sourceModelKind === 'corrupted-input') {
    pushAdapterIssue(
      'malformed-item-skipped',
      'input-diagnostic',
      'diagnostic',
      [],
      [],
      '수업 계획 입력 형식을 확인할 수 없습니다',
      '전달된 수업 계획 데이터가 비어 있거나 올바른 객체·배열 형식이 아니어서 빈 계획으로 안전하게 처리했습니다.',
      `입력 타입: ${source === null ? 'null' : typeof source}`,
    );
  }

  if (targetDurationStatus === 'invalid') {
    pushAdapterIssue(
      'invalid-target-duration',
      'timing',
      'warning',
      [],
      [],
      '목표 수업 시간 입력값을 확인해 주세요',
      `목표 수업 시간은 ${CLASS_PLAN_REVIEW_LIMITS.MIN_TARGET_MINUTES}분 이상 ${CLASS_PLAN_REVIEW_LIMITS.MAX_TARGET_MINUTES}분 이하의 유한한 숫자여야 합니다.`,
      `입력된 목표 시간 값: ${String(rawTargetMinutes)}`,
    );
  }

  const items: NormalizedClassReviewItem[] = [];
  const usedItemIds = new Set<string>();
  const duplicateIdCounters = new Map<string, number>();
  const activeAncestors = new WeakSet<object>();
  const seenContainersInPath = new Set<object>();

  let totalRawItemsSeen = 0;
  let skippedMalformedCount = 0;
  let truncatedByMaxItems = false;
  let maxDepthReached = 0;
  let circularReferenceCount = 0;
  let maxDepthIssueEmitted = false;
  let maxItemsIssueEmitted = false;

  const recordCircularReference = (detailKo: string) => {
    circularReferenceCount += 1;
    pushAdapterIssue(
      'circular-reference-detected',
      'input-diagnostic',
      'diagnostic',
      [],
      [],
      '순환 참조 구조가 감지되어 안전하게 건너뛰었습니다',
      '블록이나 동작 목록이 자기 자신 또는 상위 계획을 다시 가리키는 순환 구조가 발견되어 무한 반복 없이 해당 참조를 건너뛰었습니다.',
      detailKo,
    );
  };

  const recordMaxDepthExceeded = (depthAttempted: number) => {
    maxDepthReached = Math.max(maxDepthReached, depthAttempted);
    if (!maxDepthIssueEmitted) {
      maxDepthIssueEmitted = true;
      pushAdapterIssue(
        'max-nesting-depth-exceeded',
        'input-diagnostic',
        'diagnostic',
        [],
        [],
        '블록 중첩 깊이 제한을 초과했습니다',
        `허용된 최대 중첩 깊이(${maxNestingDepth}단계)를 초과하는 하위 블록은 안전을 위해 더 이상 탐색하지 않았습니다.`,
        `요청된 깊이: ${depthAttempted}단계 / 최대 허용: ${maxNestingDepth}단계`,
      );
    }
  };

  const recordMaxItemsExceeded = () => {
    truncatedByMaxItems = true;
    if (!maxItemsIssueEmitted) {
      maxItemsIssueEmitted = true;
      pushAdapterIssue(
        'max-item-count-exceeded',
        'input-diagnostic',
        'diagnostic',
        [],
        [],
        '최대 검토 항목 수를 초과하여 일부 항목만 포함했습니다',
        `한 번에 검토할 수 있는 최대 항목 수(${maxItems}개)를 초과하여 처음 ${maxItems}개 항목까지만 검토 목록에 반영했습니다.`,
        `최대 허용 항목 수: ${maxItems}개`,
      );
    }
  };

  const normalizeLeafItem = (
    raw: Record<string, unknown>,
    parentCtx: ParentContainerContext,
    leafDepth: number,
  ) => {
    maxDepthReached = Math.max(maxDepthReached, leafDepth);
    totalRawItemsSeen += 1;

    if (hasDirectSelfOrAncestorProperty(raw, activeAncestors)) {
      recordCircularReference('항목 내부 속성이 상위 컨테이너 또는 자기 자신을 참조합니다.');
    }

    if (!isRecognizableLeafItem(raw)) {
      skippedMalformedCount += 1;
      pushAdapterIssue(
        'malformed-item-skipped',
        'input-diagnostic',
        'diagnostic',
        [],
        [],
        '인식할 수 없는 빈 항목을 건너뛰었습니다',
        '동작 이름, ID, 휴식 구분 등 필수 식별 정보가 없는 항목이 포함되어 있어 검토 목록에서 제외했습니다.',
      );
      return;
    }

    if (items.length >= maxItems) {
      recordMaxItemsExceeded();
      return;
    }

    const index = items.length;
    const order = index + 1;
    const itemIssueCodes: ClassPlanReviewIssueCode[] = [];
    const addItemIssueCode = (code: ClassPlanReviewIssueCode) => {
      if (!itemIssueCodes.includes(code)) {
        itemIssueCodes.push(code);
      }
    };

    // 1. Stable Item ID resolution
    const rawCandidateId =
      nonEmptyString(raw.stepId) ?? nonEmptyString(raw.itemId) ?? nonEmptyString(raw.id);

    let itemId: string;
    let itemIdWasGenerated = false;

    if (!rawCandidateId) {
      let candidate = `review-item-${index + 1}`;
      let suffix = 2;
      while (usedItemIds.has(candidate)) {
        candidate = `review-item-${index + 1}__dup-${suffix}`;
        suffix += 1;
      }
      itemId = candidate;
      itemIdWasGenerated = true;
      usedItemIds.add(itemId);
      addItemIssueCode('duplicate-or-missing-item-id');
      pushAdapterIssue(
        'duplicate-or-missing-item-id',
        'input-diagnostic',
        'diagnostic',
        [itemId],
        [index],
        '항목 고유 ID가 없어 임시 ID를 부여했습니다',
        `${order}번째 항목에 고유 식별자(stepId/itemId)가 비어 있어 '${itemId}'로 자동 지정했습니다.`,
      );
    } else if (usedItemIds.has(rawCandidateId)) {
      let dupNum = (duplicateIdCounters.get(rawCandidateId) ?? 1) + 1;
      let candidate = `${rawCandidateId}__dup-${dupNum}`;
      while (usedItemIds.has(candidate)) {
        dupNum += 1;
        candidate = `${rawCandidateId}__dup-${dupNum}`;
      }
      duplicateIdCounters.set(rawCandidateId, dupNum);
      itemId = candidate;
      itemIdWasGenerated = true;
      usedItemIds.add(itemId);
      addItemIssueCode('duplicate-or-missing-item-id');
      pushAdapterIssue(
        'duplicate-or-missing-item-id',
        'input-diagnostic',
        'diagnostic',
        [itemId],
        [index],
        '중복된 항목 ID가 감지되어 구분 ID를 부여했습니다',
        `'${rawCandidateId}' ID가 여러 항목에서 중복 사용되어 ${order}번째 항목을 '${itemId}'로 구분했습니다.`,
      );
    } else {
      itemId = rawCandidateId;
      usedItemIds.add(itemId);
      duplicateIdCounters.set(rawCandidateId, 1);
    }

    // 2. Determine kind & movement identity
    const isRest =
      raw.kind === 'rest' ||
      isRestStep({ kind: raw.kind === 'rest' ? 'rest' : 'exercise' });

    const rawExerciseId = nonEmptyString(raw.exerciseId);
    const rawHumanDraftId = nonEmptyString(raw.humanDraftId);
    const inlineSnapshot = isPlainRecord(raw.exerciseSnapshot)
      ? (raw.exerciseSnapshot as unknown as MovementSnapshot)
      : rawExerciseId
        ? snapshotMap.get(rawExerciseId)
        : undefined;

    const matchedDraft =
      (rawHumanDraftId ? draftMap.get(rawHumanDraftId) : undefined) ??
      (rawExerciseId ? draftMap.get(rawExerciseId) : undefined) ??
      (raw.sourceOrigin === 'human-created' && nonEmptyString(raw.ideaLine)
        ? (raw as unknown as HumanMovementDraft)
        : undefined);

    const catalogMatch = rawExerciseId ? exerciseMap.get(rawExerciseId) : undefined;

    // Also invoke resolveMovementForValidation to reuse shared resolution logic
    const syntheticStepForResolution: SequenceStep = {
      kind: isRest ? 'rest' : 'exercise',
      stepId: itemId,
      order,
      blockCategory: isValidBlockCategory(raw.blockCategory) ? raw.blockCategory : 'core',
      exerciseId: rawExerciseId ?? '',
      durationMin:
        typeof raw.durationMin === 'number' && Number.isFinite(raw.durationMin)
          ? raw.durationMin
          : 0,
      selectedLayer: 'standard',
      humanDraftId: rawHumanDraftId,
      exerciseSnapshot: inlineSnapshot,
    };
    const validationResolved = resolveMovementForValidation(
      syntheticStepForResolution,
      effectiveExercises,
      combinedDrafts,
    );

    const inlineDraftNameKo =
      nonEmptyString(raw.workingNameKo) ??
      nonEmptyString(raw.nameKo) ??
      nonEmptyString(raw.ideaLine) ??
      nonEmptyString(raw.title) ??
      nonEmptyString(raw.nameEn);

    let sourceKind: ReviewItemSourceKind;
    let displayNameKo: string;
    let isHumanCreated = false;
    let isNameOnlyDraft = false;

    if (isRest) {
      sourceKind = 'rest';
      displayNameKo =
        nonEmptyString(raw.instructorNote) ??
        nonEmptyString(raw.nameKo) ??
        nonEmptyString(raw.title) ??
        '휴식';
    } else if (
      matchedDraft ||
      rawHumanDraftId ||
      raw.sourceOrigin === 'human-created' ||
      inlineSnapshot?.sourceOrigin === 'human-created' ||
      catalogMatch?.humanDraftId
    ) {
      isHumanCreated = true;
      const hasFullDraftObject = Boolean(
        matchedDraft ||
          rawHumanDraftId ||
          raw.completenessStage !== undefined ||
          inlineSnapshot?.sourceOrigin === 'human-created' ||
          catalogMatch?.humanDraftId,
      );
      sourceKind = hasFullDraftObject ? 'human-draft' : 'name-only-draft';
      displayNameKo =
        inlineDraftNameKo ??
        nonEmptyString(inlineSnapshot?.nameKo) ??
        nonEmptyString(matchedDraft?.workingNameKo) ??
        nonEmptyString(matchedDraft?.ideaLine) ??
        nonEmptyString(catalogMatch?.nameKo) ??
        nonEmptyString(raw.instructorNote) ??
        `강사 창작 동작 (${rawHumanDraftId ?? rawExerciseId ?? itemId})`;
    } else if (catalogMatch || inlineSnapshot) {
      sourceKind = 'catalog-exercise';
      displayNameKo =
        nonEmptyString(inlineSnapshot?.nameKo) ??
        nonEmptyString(catalogMatch?.nameKo) ??
        inlineDraftNameKo ??
        rawExerciseId ??
        itemId;
    } else if (inlineDraftNameKo || raw.kind === 'draft') {
      sourceKind = 'name-only-draft';
      isHumanCreated = true;
      isNameOnlyDraft = true;
      displayNameKo = inlineDraftNameKo ?? nonEmptyString(raw.instructorNote) ?? '이름만 입력된 동작 초안';
    } else if (rawExerciseId) {
      sourceKind = 'unknown-exercise';
      displayNameKo = nonEmptyString(raw.instructorNote) ?? `미등록 동작 (${rawExerciseId})`;
      addItemIssueCode('unknown-catalog-exercise');
      pushAdapterIssue(
        'unknown-catalog-exercise',
        'input-diagnostic',
        'warning',
        [itemId],
        [index],
        '카탈로그에서 찾을 수 없는 동작 ID입니다',
        `'${rawExerciseId}' ID에 해당하는 카탈로그 동작이나 강사 초안 정보를 찾지 못했습니다.`,
      );
    } else {
      sourceKind = 'name-only-draft';
      isHumanCreated = true;
      isNameOnlyDraft = true;
      displayNameKo = nonEmptyString(raw.instructorNote) ?? `이름 미입력 동작 (${itemId})`;
    }

    // Resolve optional apparatus, blockCategory, sectionRole (never force on name-only drafts)
    const resolvedBlockCategory: ClassBlockCategory | undefined = isRest
      ? undefined
      : isValidBlockCategory(raw.blockCategory)
        ? raw.blockCategory
        : isValidBlockCategory(matchedDraft?.blockCategory)
          ? matchedDraft.blockCategory
          : isValidBlockCategory(inlineSnapshot?.blockCategory)
            ? inlineSnapshot.blockCategory
            : isValidBlockCategory(catalogMatch?.blockCategory)
              ? catalogMatch.blockCategory
              : parentCtx.blockCategory;

    const resolvedApparatus: ApparatusType | undefined = isRest
      ? undefined
      : isValidApparatus(raw.apparatus)
        ? raw.apparatus
        : isValidApparatus(matchedDraft?.apparatus)
          ? matchedDraft.apparatus
          : isValidApparatus(inlineSnapshot?.apparatus)
            ? inlineSnapshot.apparatus
            : isValidApparatus(catalogMatch?.apparatus)
              ? catalogMatch.apparatus
              : parentCtx.apparatus;

    const resolvedSectionRole: ClassSectionRole | undefined = isRest
      ? undefined
      : isValidSectionRole(raw.classSection)
        ? raw.classSection
        : isValidSectionRole(raw.sectionRole)
          ? raw.sectionRole
          : isValidSectionRole(parentCtx.sectionRole)
            ? parentCtx.sectionRole
            : isValidSectionRole(matchedDraft?.sectionRole)
              ? matchedDraft.sectionRole
              : resolvedBlockCategory
                ? catalogMatch
                  ? resolveStepSectionRole(
                      { ...syntheticStepForResolution, blockCategory: resolvedBlockCategory },
                      catalogMatch,
                      matchedDraft,
                    )
                  : getMovementSectionRole(resolvedBlockCategory)
                : undefined;

    if (
      isHumanCreated &&
      (sourceKind === 'name-only-draft' ||
        (!resolvedApparatus && !resolvedBlockCategory) ||
        raw.durationMin === undefined ||
        raw.durationMin === null)
    ) {
      if (
        sourceKind === 'name-only-draft' ||
        (!resolvedApparatus && !resolvedBlockCategory)
      ) {
        isNameOnlyDraft = true;
      }
    }

    // 3. Repetitions & Sets validation
    const rawRepetitions = raw.repetitions;
    let repetitions: number | null = null;
    let hasInvalidRepetitionOrSet = false;

    if (rawRepetitions !== undefined && rawRepetitions !== null) {
      if (
        typeof rawRepetitions === 'number' &&
        Number.isInteger(rawRepetitions) &&
        rawRepetitions >= 1 &&
        rawRepetitions <= CLASS_PLAN_REVIEW_LIMITS.MAX_REPETITIONS
      ) {
        repetitions = rawRepetitions;
      } else {
        hasInvalidRepetitionOrSet = true;
      }
    }

    const rawSets = raw.sets;
    let sets: number | null = null;
    if (rawSets !== undefined && rawSets !== null) {
      if (
        typeof rawSets === 'number' &&
        Number.isInteger(rawSets) &&
        rawSets >= 1 &&
        rawSets <= CLASS_PLAN_REVIEW_LIMITS.MAX_SETS
      ) {
        sets = rawSets;
      } else {
        hasInvalidRepetitionOrSet = true;
      }
    }

    if (hasInvalidRepetitionOrSet) {
      addItemIssueCode('invalid-repetition-or-set');
      pushAdapterIssue(
        'invalid-repetition-or-set',
        'input-diagnostic',
        'warning',
        [itemId],
        [index],
        `'${displayNameKo}' 항목의 횟수·세트 입력값을 확인해 주세요`,
        `횟수(1~${CLASS_PLAN_REVIEW_LIMITS.MAX_REPETITIONS}회)와 세트(1~${CLASS_PLAN_REVIEW_LIMITS.MAX_SETS}세트)는 양의 정수여야 합니다.`,
        `입력된 횟수: ${String(rawRepetitions)}, 세트: ${String(rawSets)}`,
      );
    }

    // 4. Laterality normalization (facts only, never guess from name)
    const rawSideMode = raw.sideMode;
    let sideMode: StepSideMode | undefined;
    let hasInvalidSideMode = false;

    if (rawSideMode !== undefined && rawSideMode !== null) {
      if (isValidSideMode(rawSideMode)) {
        sideMode = rawSideMode;
      } else {
        hasInvalidSideMode = true;
        addItemIssueCode('invalid-side-mode');
        pushAdapterIssue(
          'invalid-side-mode',
          'input-diagnostic',
          'warning',
          [itemId],
          [index],
          `'${displayNameKo}' 항목의 좌우 설정값이 올바르지 않습니다`,
          `인식할 수 없는 좌우 설정값('${String(rawSideMode)}')이 입력되어 좌우 미지정 상태로 분류했습니다.`,
        );
      }
    } else if (!isRest && matchedDraft?.sideMode && isValidSideMode(matchedDraft.sideMode)) {
      sideMode = matchedDraft.sideMode;
    }

    const explicitIsUnilateral: boolean | null = isRest
      ? null
      : typeof raw.isUnilateral === 'boolean'
        ? raw.isUnilateral
        : matchedDraft !== undefined
          ? typeof matchedDraft.isUnilateral === 'boolean'
            ? matchedDraft.isUnilateral
            : null
          : inlineSnapshot !== undefined && inlineSnapshot.sourceOrigin !== 'human-created'
            ? typeof inlineSnapshot.isUnilateral === 'boolean'
              ? inlineSnapshot.isUnilateral
              : null
            : catalogMatch !== undefined && !catalogMatch.humanDraftId
              ? typeof catalogMatch.isUnilateral === 'boolean'
                ? catalogMatch.isUnilateral
                : null
              : null;

    let lateralityStatus: ReviewItemLateralityStatus;
    let sideLabelsKo: string[];

    const exerciseForSideHelper =
      explicitIsUnilateral !== null
        ? (catalogMatch ??
          buildFallbackSyntheticExercise({
            id: rawExerciseId ?? itemId,
            nameKo: displayNameKo,
            isUnilateral: explicitIsUnilateral,
          }))
        : undefined;

    if (isRest) {
      lateralityStatus = 'not-applicable';
      sideLabelsKo = [];
    } else if (hasInvalidSideMode) {
      lateralityStatus = 'unknown';
      sideLabelsKo = ['좌우 설정 오류'];
    } else if (sideMode !== undefined) {
      const stepForLabels: SequenceStep = {
        ...syntheticStepForResolution,
        sideMode,
      };
      sideLabelsKo = getStepSideLabels(stepForLabels, exerciseForSideHelper);
      switch (sideMode) {
        case 'left':
          lateralityStatus = 'left';
          break;
        case 'right':
          lateralityStatus = 'right';
          break;
        case 'left-then-right':
        case 'right-then-left':
          lateralityStatus = 'both-sequential';
          break;
        case 'together':
          lateralityStatus = 'together';
          break;
      }
    } else if (explicitIsUnilateral === true) {
      lateralityStatus = 'both-sequential';
      sideLabelsKo = getStepSideLabels(syntheticStepForResolution, exerciseForSideHelper);
    } else if (explicitIsUnilateral === false) {
      lateralityStatus = 'together';
      sideLabelsKo = getStepSideLabels(syntheticStepForResolution, exerciseForSideHelper);
    } else {
      lateralityStatus = 'unknown';
      sideLabelsKo = ['좌우 미지정'];
    }

    // 5. Timing normalization (never double-count, never fake missing time as 0)
    const rawDurationMin = raw.durationMin;
    let durationStatus: ReviewItemDurationStatus;
    let knownTotalSec: number | null = null;
    let knownMovementSec: number | null = null;
    let knownExplanationSec: number | null = null;
    let knownTransitionSec: number | null = null;
    let knownRestSec: number | null = null;
    let knownPerSideSec: number | null = null;
    let usedTimeEstimateFallback = false;

    const hasExplicitDurationProp = Object.prototype.hasOwnProperty.call(raw, 'durationMin');

    if (rawDurationMin === undefined || rawDurationMin === null) {
      const estimateResult =
        raw.timeEstimate !== undefined && raw.timeEstimate !== null
          ? calculateStepTimeEstimate(raw.timeEstimate)
          : null;

      if (estimateResult && estimateResult.success) {
        durationStatus = 'known';
        usedTimeEstimateFallback = true;
        const stepForTiming: SequenceStep = {
          ...syntheticStepForResolution,
          durationMin: estimateResult.durationMin,
          explanationSec: estimateResult.value.explanationSec,
          transitionSec: estimateResult.value.transitionSec,
          sideMode,
        };
        const timing = getStepTiming(stepForTiming, exerciseForSideHelper);
        knownTotalSec = timing.totalSec;
        if (isRest) {
          knownRestSec = timing.totalSec;
          knownMovementSec = 0;
          knownExplanationSec = 0;
          knownTransitionSec = 0;
          knownPerSideSec = 0;
        } else {
          knownMovementSec = timing.movementSec;
          knownExplanationSec = timing.explanationSec;
          knownTransitionSec = timing.transitionSec;
          knownRestSec = 0;
          knownPerSideSec =
            estimateResult.value.sides === 2 ? timing.movementSec / 2 : timing.perSideSec;
        }
      } else if (
        !hasExplicitDurationProp &&
        matchedDraft &&
        typeof matchedDraft.defaultDurationMin === 'number' &&
        Number.isFinite(matchedDraft.defaultDurationMin) &&
        matchedDraft.defaultDurationMin > 0 &&
        matchedDraft.defaultDurationMin <= CLASS_PLAN_REVIEW_LIMITS.MAX_ITEM_DURATION_MIN &&
        Math.round(matchedDraft.defaultDurationMin * 60) > 0
      ) {
        durationStatus = 'known';
        const stepForTiming: SequenceStep = {
          ...syntheticStepForResolution,
          durationMin: matchedDraft.defaultDurationMin,
          sideMode,
        };
        const timing = getStepTiming(stepForTiming, exerciseForSideHelper);
        knownTotalSec = timing.totalSec;
        knownMovementSec = timing.movementSec;
        knownExplanationSec = timing.explanationSec;
        knownTransitionSec = timing.transitionSec;
        knownRestSec = 0;
        knownPerSideSec = timing.perSideSec;
      } else {
        durationStatus = 'unspecified';
      }
    } else {
      const isValidDuration =
        typeof rawDurationMin === 'number' &&
        Number.isFinite(rawDurationMin) &&
        rawDurationMin > 0 &&
        rawDurationMin <= CLASS_PLAN_REVIEW_LIMITS.MAX_ITEM_DURATION_MIN &&
        Math.round(rawDurationMin * 60) > 0;

      if (!isValidDuration) {
        durationStatus = 'invalid';
        if (isRest) {
          addItemIssueCode('rest-duration-invalid');
          pushAdapterIssue(
            'rest-duration-invalid',
            'timing',
            'warning',
            [itemId],
            [index],
            `'${displayNameKo}' 휴식 시간 입력값을 확인해 주세요`,
            `휴식 시간은 0보다 크고 ${CLASS_PLAN_REVIEW_LIMITS.MAX_ITEM_DURATION_MIN}분 이하인 유한한 숫자여야 합니다.`,
            `입력된 휴식 시간 값: ${String(rawDurationMin)}`,
          );
        } else {
          addItemIssueCode('invalid-item-duration');
          pushAdapterIssue(
            'invalid-item-duration',
            'timing',
            'warning',
            [itemId],
            [index],
            `'${displayNameKo}' 동작 시간 입력값을 확인해 주세요`,
            `동작 시간은 0보다 크고 ${CLASS_PLAN_REVIEW_LIMITS.MAX_ITEM_DURATION_MIN}분 이하인 유한한 숫자여야 합니다. 잘못된 시간은 0초로 처리하지 않고 합산에서 제외했습니다.`,
            `입력된 시간 값: ${String(rawDurationMin)}`,
          );
        }
      } else {
        durationStatus = 'known';
        const totalItemSec = Math.round(rawDurationMin * 60);

        const rawExp = raw.explanationSec;
        const expProvided = rawExp !== undefined && rawExp !== null;
        const expValid =
          !expProvided ||
          (typeof rawExp === 'number' &&
            Number.isFinite(rawExp) &&
            rawExp >= 0 &&
            rawExp <= CLASS_PLAN_REVIEW_LIMITS.MAX_SUB_DURATION_SEC);

        const rawTrans = raw.transitionSec;
        const transProvided = rawTrans !== undefined && rawTrans !== null;
        const transValid =
          !transProvided ||
          (typeof rawTrans === 'number' &&
            Number.isFinite(rawTrans) &&
            rawTrans >= 0 &&
            rawTrans <= CLASS_PLAN_REVIEW_LIMITS.MAX_SUB_DURATION_SEC);

        const safeExpNum = expValid && typeof rawExp === 'number' ? Math.round(rawExp) : 0;
        const safeTransNum = transValid && typeof rawTrans === 'number' ? Math.round(rawTrans) : 0;
        const subExceedsTotal = expValid && transValid && safeExpNum + safeTransNum > totalItemSec;

        if (!expValid || !transValid || subExceedsTotal) {
          addItemIssueCode('invalid-sub-duration');
          pushAdapterIssue(
            'invalid-sub-duration',
            'timing',
            'warning',
            [itemId],
            [index],
            `'${displayNameKo}' 항목의 설명·전환 세부 시간을 확인해 주세요`,
            subExceedsTotal
              ? `설명 시간(${safeExpNum}초)과 전환 시간(${safeTransNum}초)의 합이 항목 전체 시간(${totalItemSec}초)을 초과합니다.`
              : `설명 시간과 전환 시간은 0초 이상 ${CLASS_PLAN_REVIEW_LIMITS.MAX_SUB_DURATION_SEC}초 이하의 유한한 숫자여야 합니다.`,
          );
        }

        const stepForTiming: SequenceStep = {
          ...syntheticStepForResolution,
          durationMin: rawDurationMin,
          explanationSec: expValid && typeof rawExp === 'number' ? rawExp : 0,
          transitionSec: transValid && typeof rawTrans === 'number' ? rawTrans : 0,
          sideMode,
        };
        const timing = getStepTiming(stepForTiming, exerciseForSideHelper);

        knownTotalSec = timing.totalSec;
        if (isRest) {
          knownRestSec = timing.totalSec;
          knownMovementSec = 0;
          knownExplanationSec = 0;
          knownTransitionSec = 0;
          knownPerSideSec = 0;
        } else {
          knownMovementSec = timing.movementSec;
          knownExplanationSec = timing.explanationSec;
          knownTransitionSec = timing.transitionSec;
          knownRestSec = 0;
          knownPerSideSec = timing.perSideSec;
        }
      }
    }

    // 6. Movement Key
    let movementKey: string;
    if (isRest) {
      movementKey = 'rest';
    } else if (catalogMatch) {
      movementKey = getMovementKey(catalogMatch);
    } else if (validationResolved.exercise && !isNameOnlyDraft) {
      movementKey = getMovementKey(validationResolved.exercise);
    } else {
      const syntheticForKey = buildFallbackSyntheticExercise({
        id: rawExerciseId ?? rawHumanDraftId ?? itemId,
        nameKo: displayNameKo,
        nameEn:
          sourceKind === 'unknown-exercise' && rawExerciseId ? rawExerciseId : displayNameKo,
        movementFamily: inlineSnapshot?.movementFamily,
      });
      movementKey = getMovementKey(syntheticForKey);
    }

    // 7. Block provenance metadata
    const matchedBlockSnap = blockSnapshotByStepId.get(itemId);
    const blockInstanceId =
      nonEmptyString(raw.blockInstanceId) ??
      parentCtx.blockInstanceId ??
      matchedBlockSnap?.blockInstanceId;
    const sourceBlockId =
      nonEmptyString(raw.sourceBlockId) ??
      parentCtx.sourceBlockId ??
      matchedBlockSnap?.sourceBlockId;
    const sourceBlockTitle =
      nonEmptyString(raw.sourceBlockTitle) ??
      parentCtx.sourceBlockTitle ??
      matchedBlockSnap?.sourceBlockTitle;

    items.push({
      itemId,
      itemIdWasGenerated,
      index,
      order,
      kind: isRest ? 'rest' : 'exercise',
      sourceKind,
      displayNameKo,
      exerciseId: rawExerciseId,
      humanDraftId: rawHumanDraftId ?? matchedDraft?.id,
      blockInstanceId,
      sourceBlockId,
      sourceBlockTitle,
      sectionRole: resolvedSectionRole,
      blockCategory: resolvedBlockCategory,
      apparatus: resolvedApparatus,
      isNameOnlyDraft,
      isHumanCreated,
      durationStatus,
      rawDurationMin,
      knownTotalSec,
      knownMovementSec,
      knownExplanationSec,
      knownTransitionSec,
      knownRestSec,
      knownPerSideSec,
      usedTimeEstimateFallback,
      repetitions,
      sets,
      hasInvalidRepetitionOrSet,
      rawRepetitions,
      rawSets,
      lateralityStatus,
      sideMode,
      rawSideMode,
      isUnilateral: explicitIsUnilateral,
      sideLabelsKo,
      movementKey,
      itemIssueCodes,
    });
  };

  const traverseArrayElements = (
    elements: readonly unknown[],
    parentCtx: ParentContainerContext,
    currentDepth: number,
  ) => {
    if (activeAncestors.has(elements) || seenContainersInPath.has(elements)) {
      recordCircularReference('동작/블록 배열이 상위 배열을 다시 참조하는 순환 구조입니다.');
      return;
    }

    activeAncestors.add(elements);
    seenContainersInPath.add(elements);

    const scanLimit = Math.min(elements.length, HARD_RAW_SCAN_LIMIT);
    for (let i = 0; i < scanLimit; i += 1) {
      const element = elements[i];

      if (element !== null && typeof element === 'object') {
        if (activeAncestors.has(element) || seenContainersInPath.has(element)) {
          recordCircularReference(
            `배열의 ${i + 1}번째 요소가 상위 컨테이너 객체를 다시 참조하고 있습니다.`,
          );
          continue;
        }
      }

      if (isContainerNode(element)) {
        const nextContainerDepth = currentDepth + 1;
        if (nextContainerDepth > maxNestingDepth) {
          recordMaxDepthExceeded(nextContainerDepth);
          continue;
        }
        maxDepthReached = Math.max(maxDepthReached, nextContainerDepth);
        traverseContainer(element as Record<string, unknown> | readonly unknown[], parentCtx, nextContainerDepth);
      } else if (isPlainRecord(element)) {
        normalizeLeafItem(element, parentCtx, currentDepth + 1);
      } else {
        // null, undefined, or primitive in array
        maxDepthReached = Math.max(maxDepthReached, currentDepth + 1);
        totalRawItemsSeen += 1;
        skippedMalformedCount += 1;
        pushAdapterIssue(
          'malformed-item-skipped',
          'input-diagnostic',
          'diagnostic',
          [],
          [],
          '유효하지 않은 형식의 항목을 건너뛰었습니다',
          `목록의 ${i + 1}번째 요소(${element === null ? 'null' : typeof element})는 올바른 동작/휴식 객체가 아니어서 제외했습니다.`,
        );
      }
    }

    activeAncestors.delete(elements);
    seenContainersInPath.delete(elements);
  };

  const traverseContainer = (
    container: Record<string, unknown> | readonly unknown[],
    inheritedCtx: ParentContainerContext,
    currentDepth: number,
  ) => {
    if (Array.isArray(container)) {
      traverseArrayElements(container, inheritedCtx, currentDepth);
      return;
    }

    const containerRecord = container as Record<string, unknown>;

    if (activeAncestors.has(containerRecord) || seenContainersInPath.has(containerRecord)) {
      recordCircularReference('컨테이너 객체가 상위 컨테이너를 다시 참조하는 순환 구조입니다.');
      return;
    }

    activeAncestors.add(containerRecord);
    seenContainersInPath.add(containerRecord);

    const nextCtx: ParentContainerContext = {
      blockInstanceId:
        nonEmptyString(containerRecord.blockInstanceId) ?? inheritedCtx.blockInstanceId,
      sourceBlockId:
        nonEmptyString(containerRecord.blockId) ??
        (currentDepth > 0 ? nonEmptyString(containerRecord.id) : undefined) ??
        inheritedCtx.sourceBlockId,
      sourceBlockTitle:
        (currentDepth > 0 ? nonEmptyString(containerRecord.title) : undefined) ??
        inheritedCtx.sourceBlockTitle,
      sectionRole: isValidSectionRole(containerRecord.sectionRole)
        ? containerRecord.sectionRole
        : inheritedCtx.sectionRole,
      blockCategory: isValidBlockCategory(containerRecord.category)
        ? containerRecord.category
        : isValidBlockCategory(containerRecord.blockCategory)
          ? containerRecord.blockCategory
          : inheritedCtx.blockCategory,
      apparatus: isValidApparatus(containerRecord.apparatus)
        ? containerRecord.apparatus
        : inheritedCtx.apparatus,
    };

    const childArrays = getContainerChildArrays(containerRecord);
    for (const arr of childArrays) {
      traverseArrayElements(arr, nextCtx, currentDepth);
    }

    activeAncestors.delete(containerRecord);
    seenContainersInPath.delete(containerRecord);
  };

  if (sourceModelKind !== 'corrupted-input' && source !== null && typeof source === 'object') {
    traverseContainer(source as Record<string, unknown> | readonly unknown[], {}, 0);
  }

  const normalizedPlan: NormalizedClassReviewPlan = {
    planId,
    title,
    sourceModelKind,
    targetMinutes,
    targetDurationStatus,
    rawTargetMinutes,
    items,
    adapterIssues,
    stats: {
      totalRawItemsSeen,
      normalizedItemCount: items.length,
      skippedMalformedCount,
      truncatedByMaxItems,
      maxDepthReached,
      circularReferenceCount,
    },
  };

  return deepFreeze(normalizedPlan);
}

/**
 * Adapts any supported class plan input (SavedSequence, ClassSequenceSnapshot, OfflineClassPreset,
 * ReusableBlock, OfflineBlockPreset, raw step/draft array, composite container, or untrusted input)
 * into an immutable `NormalizedClassReviewPlan`.
 */
export function adaptClassPlanForReview(
  source: unknown,
  options?: ClassPlanReviewOptions,
): NormalizedClassReviewPlan {
  return adaptInternal(source, options);
}

/**
 * Adapts a `SavedSequence` into an immutable `NormalizedClassReviewPlan`.
 */
export function adaptSavedSequenceForReview(
  sequence: SavedSequence,
  options?: ClassPlanReviewOptions,
): NormalizedClassReviewPlan {
  return adaptInternal(sequence, {
    ...options,
    forcedKind: isPlainRecord(sequence) && Array.isArray(sequence.steps)
      ? 'saved-sequence'
      : undefined,
  });
}

/**
 * Adapts an immutable `ClassSequenceSnapshot` into a `NormalizedClassReviewPlan`.
 */
export function adaptClassSnapshotForReview(
  snapshot: ClassSequenceSnapshot,
  options?: ClassPlanReviewOptions,
): NormalizedClassReviewPlan {
  return adaptInternal(snapshot, {
    ...options,
    forcedKind: isPlainRecord(snapshot) && Array.isArray(snapshot.steps)
      ? 'class-snapshot'
      : undefined,
  });
}

/**
 * Adapts a `ReusableBlock` or `OfflineBlockPreset` into a `NormalizedClassReviewPlan`.
 */
export function adaptReusableBlockForReview(
  block: ReusableBlock | OfflineBlockPreset,
  options?: ClassPlanReviewOptions,
): NormalizedClassReviewPlan {
  let fallbackTitle: string | undefined;
  if (
    isPlainRecord(block) &&
    Array.isArray(block.items) &&
    block.items.every(
      (item: ReusableBlockItem | unknown) =>
        isPlainRecord(item) &&
        typeof item.durationMin === 'number' &&
        Number.isFinite(item.durationMin) &&
        item.durationMin > 0,
    )
  ) {
    try {
      const summary = summarizeReusableBlockTiming(
        block as ReusableBlock,
        options?.exercises ?? INITIAL_EXERCISES,
        options?.humanDrafts,
      );
      if (summary.blockId && !nonEmptyString(block.title)) {
        fallbackTitle = `재사용 블록 (${summary.blockId})`;
      }
    } catch {
      // Defensive fallback if block contains partial/custom items
    }
  }

  return adaptInternal(block, {
    ...options,
    title: nonEmptyString(isPlainRecord(block) ? block.title : undefined) ?? fallbackTitle,
    forcedKind: isPlainRecord(block) && Array.isArray(block.items)
      ? 'reusable-block'
      : undefined,
  });
}

/**
 * Adapts a readonly array of `SequenceStep` items into a `NormalizedClassReviewPlan`.
 */
export function adaptSequenceStepsForReview(
  steps: readonly SequenceStep[],
  options?: ClassPlanReviewOptions & { planId?: string; title?: string },
): NormalizedClassReviewPlan {
  return adaptInternal(steps, {
    ...options,
    forcedKind: Array.isArray(steps) ? 'step-array' : undefined,
  });
}

/**
 * Adapts an `OfflineClassPreset` into a `NormalizedClassReviewPlan`.
 */
export function adaptClassPresetForReview(
  preset: OfflineClassPreset,
  options?: ClassPlanReviewOptions,
): NormalizedClassReviewPlan {
  return adaptInternal(preset, {
    ...options,
    forcedKind: isPlainRecord(preset) && Array.isArray(preset.steps)
      ? 'class-preset'
      : undefined,
  });
}
