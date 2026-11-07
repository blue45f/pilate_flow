import {
  DEFAULT_OWNED_EQUIPMENT,
  EQUIPMENT_OPTIONS,
  getExerciseEquipment,
  isEquipmentId,
  PROP_IDS,
} from '../../data/equipmentCatalog';
import { PRESET_THEME_CATALOG } from '../../data/classBlockPresets';
import { INITIAL_EXERCISES } from '../../data/pilatesCatalog';
import type { PresetThemeId } from '../../types/classBlockPresets';
import type {
  ApparatusType,
  AutoGenerateCriteria,
  ClassBlockCategory,
  DifficultyLevel,
  LayerMode,
  PilatesExercise,
  PropType,
  StepSideMode,
} from '../../types/pilates';
import type { ClassSectionRole } from '../../types/sequenceMotion';
import { isExerciseAuthoringEligible } from '../../utils/exerciseAuthoring';
import { getMovementSectionRole } from '../../utils/hierarchyModel';
import { calculateStepTimeEstimate } from '../../utils/stepTimeEstimate';
import {
  deepFreezeCandidateResult,
  formatDurationSecondsKo,
  toPresetSuggestionDiagnosticValue,
} from './presetSuggestionDiagnostics';
import {
  PRESET_SUGGESTION_LIMITS,
  type NormalizedPresetSuggestionInput,
  type NormalizedSeedStep,
  type PresetSuggestionIssue,
  type PresetSuggestionIssueCategory,
  type PresetSuggestionIssueCode,
  type PresetSuggestionIssueSeverity,
  type PresetSuggestionRequest,
} from './presetSuggestionTypes';

const VALID_APPARATUS: ReadonlySet<ApparatusType | 'mixed'> = new Set<ApparatusType | 'mixed'>([
  'reformer',
  'cadillac',
  'chair',
  'barrel',
  'mat',
  'mixed',
]);

const VALID_SINGLE_APPARATUS: ReadonlySet<ApparatusType> = new Set<ApparatusType>([
  'reformer',
  'cadillac',
  'chair',
  'barrel',
  'mat',
]);

const VALID_LEVELS: ReadonlySet<DifficultyLevel> = new Set<DifficultyLevel>(['1.0', '1.5', '2.0']);

const VALID_LAYERS: ReadonlySet<LayerMode> = new Set<LayerMode>(['easy', 'standard', 'hard']);

const VALID_FOCUS_PRESETS: ReadonlySet<AutoGenerateCriteria['focusPreset']> = new Set([
  'full-body',
  'core-sculpt',
  'glute-lower',
  'posture-upper',
  'mobility-rehab',
]);

const VALID_SIDE_MODES: ReadonlySet<StepSideMode> = new Set<StepSideMode>([
  'together',
  'left',
  'right',
  'left-then-right',
  'right-then-left',
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

const THEME_BY_ID = new Map(PRESET_THEME_CATALOG.map((meta) => [meta.id, meta]));

const FOCUS_TO_DEFAULT_THEME: Readonly<Record<AutoGenerateCriteria['focusPreset'], PresetThemeId>> =
  {
    'full-body': 'full-body-flow',
    'core-sculpt': 'core-spinal-control',
    'glute-lower': 'lower-glute-balance',
    'posture-upper': 'upper-thoracic-opening',
    'mobility-rehab': 'breath-pelvic-foundation',
  };

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
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

function hasNonArrayContainerProperty(node: Record<string, unknown>): boolean {
  const keys = ['steps', 'items', 'blocks', 'children'] as const;
  return keys.some((key) => node[key] !== undefined && !Array.isArray(node[key]));
}

function isRecognizableSeedLeaf(raw: Record<string, unknown>): boolean {
  if (raw.kind === 'rest' || raw.kind === 'exercise') return true;
  if (
    nonEmptyString(raw.exerciseId) ||
    nonEmptyString(raw.stepId) ||
    nonEmptyString(raw.itemId) ||
    isPlainRecord(raw.timeEstimate) ||
    isPlainRecord(raw.exerciseSnapshot)
  ) {
    return true;
  }
  if (
    raw.durationMin !== undefined &&
    (raw.sideMode !== undefined ||
      raw.repetitions !== undefined ||
      raw.sets !== undefined ||
      raw.blockCategory !== undefined ||
      raw.locked !== undefined)
  ) {
    return true;
  }
  return false;
}

interface PendingSeedIssue {
  readonly code: PresetSuggestionIssueCode;
  readonly category: PresetSuggestionIssueCategory;
  readonly severity: PresetSuggestionIssueSeverity;
  readonly blocking: boolean;
  readonly stepId?: string;
  readonly stepIndex?: number;
  readonly relatedExerciseIds?: readonly string[];
  readonly titleKo: string;
  readonly messageKo: string;
  readonly detailKo?: string;
}

/**
 * Defensively normalizes a `PresetSuggestionRequest` without mutating or freezing caller-owned objects.
 * Explicitly detects:
 * - Nested cycles (`nested-cycle-detected`) and container depth overflows (`max-nesting-depth-exceeded`)
 * - Raw scan limit (`max-input-scan-exceeded`) and item count limit (`max-item-count-exceeded`)
 * - Unknown or unverifiable exercise IDs (`unknown-exercise-id`, `unverifiable-catalog-exercise`)
 * - Unknown equipment IDs (`unknown-equipment-id`)
 * - Unilateral timing mismatches (`unilateral-together-mismatch`, `unilateral-per-side-too-short`, `unilateral-time-estimate-mismatch`)
 * - Rest step / budget invalidity (`rest-duration-invalid`, `rest-exceeds-or-equals-target`, `rest-step-malformed`)
 * - Target / step duration bound violations (`target-duration-out-of-bounds`, `step-duration-out-of-bounds`)
 */
export function adaptPresetSuggestionInput(
  rawRequest: PresetSuggestionRequest | unknown,
): NormalizedPresetSuggestionInput {
  const req = isPlainRecord(rawRequest) ? (rawRequest as PresetSuggestionRequest) : {};

  const maxRawScanNodes =
    typeof req.maxRawScanNodes === 'number' &&
    Number.isInteger(req.maxRawScanNodes) &&
    req.maxRawScanNodes >= 1
      ? Math.min(req.maxRawScanNodes, PRESET_SUGGESTION_LIMITS.MAX_RAW_SCAN_NODES)
      : PRESET_SUGGESTION_LIMITS.MAX_RAW_SCAN_NODES;

  const maxItems =
    typeof req.maxItems === 'number' && Number.isInteger(req.maxItems) && req.maxItems >= 0
      ? Math.min(req.maxItems, PRESET_SUGGESTION_LIMITS.MAX_ITEMS)
      : PRESET_SUGGESTION_LIMITS.MAX_ITEMS;

  const maxNestingDepth =
    typeof req.maxNestingDepth === 'number' &&
    Number.isInteger(req.maxNestingDepth) &&
    req.maxNestingDepth >= 0
      ? Math.min(req.maxNestingDepth, PRESET_SUGGESTION_LIMITS.MAX_NESTING_DEPTH)
      : PRESET_SUGGESTION_LIMITS.MAX_NESTING_DEPTH;

  const maxCandidates =
    typeof req.maxCandidates === 'number' &&
    Number.isInteger(req.maxCandidates) &&
    req.maxCandidates >= 1
      ? Math.min(req.maxCandidates, PRESET_SUGGESTION_LIMITS.MAX_SUGGESTION_CANDIDATES)
      : 3;

  const exercises = Array.isArray(req.exercises) ? req.exercises : INITIAL_EXERCISES;
  const catalogMap = new Map<string, PilatesExercise>();
  const verifiableMap = new Map<string, PilatesExercise>();

  for (const ex of exercises) {
    if (isPlainRecord(ex) && typeof ex.id === 'string' && ex.id.trim().length > 0) {
      const typedEx = ex as unknown as PilatesExercise;
      catalogMap.set(typedEx.id, typedEx);
      if (
        isExerciseAuthoringEligible(typedEx) &&
        getExerciseEquipment(typedEx).requirementsKnown
      ) {
        verifiableMap.set(typedEx.id, typedEx);
      }
    }
  }

  const pendingIssues: PendingSeedIssue[] = [];

  // 1. Apparatus & Equipment validation
  const rawApparatus = req.apparatus;
  let apparatus: ApparatusType | 'mixed' = 'reformer';
  let apparatusValid = true;
  if (rawApparatus !== undefined) {
    if (typeof rawApparatus === 'string' && VALID_APPARATUS.has(rawApparatus as ApparatusType | 'mixed')) {
      apparatus = rawApparatus as ApparatusType | 'mixed';
    } else {
      apparatusValid = false;
      pendingIssues.push({
        code: 'unknown-equipment-id',
        category: 'unknown-id',
        severity: 'blocking',
        blocking: true,
        titleKo: '지원하지 않는 기구 분류 입력',
        messageKo:
          '선택한 수업 기구(apparatus)가 카탈로그 기구 분류(reformer, cadillac, chair, barrel, mat, mixed)에 해당하지 않습니다.',
        detailKo: `입력값: ${String(toPresetSuggestionDiagnosticValue(rawApparatus))}`,
      });
    }
  }

  const unknownEquipmentIds: string[] = [];
  let availableEquipment: string[] = [];

  if (req.availableEquipment !== undefined) {
    if (!Array.isArray(req.availableEquipment) || req.availableEquipment.length === 0) {
      unknownEquipmentIds.push('(빈 기구 목록)');
      pendingIssues.push({
        code: 'unknown-equipment-id',
        category: 'unknown-id',
        severity: 'blocking',
        blocking: true,
        titleKo: '사용 가능한 세부 기구 미선택',
        messageKo: '사용 가능한 세부 기구(availableEquipment)를 1개 이상 유효한 기구 ID로 지정해 주세요.',
      });
    } else {
      for (const item of req.availableEquipment) {
        if (typeof item === 'string' && isEquipmentId(item)) {
          if (!availableEquipment.includes(item)) {
            availableEquipment.push(item);
          }
        } else {
          const badId = String(toPresetSuggestionDiagnosticValue(item));
          if (!unknownEquipmentIds.includes(badId)) {
            unknownEquipmentIds.push(badId);
          }
        }
      }
      if (unknownEquipmentIds.length > 0) {
        pendingIssues.push({
          code: 'unknown-equipment-id',
          category: 'unknown-id',
          severity: 'blocking',
          blocking: true,
          titleKo: '등록되지 않은 세부 기구 ID 포함',
          messageKo: `카탈로그에 없는 세부 기구 ID(${unknownEquipmentIds.join(', ')})는 사용 가능하다고 가정하지 않습니다.`,
        });
      }
    }
  } else if (req.ownedApparatus !== undefined) {
    if (!Array.isArray(req.ownedApparatus) || req.ownedApparatus.length === 0) {
      unknownEquipmentIds.push('(빈 보유 기구 목록)');
      pendingIssues.push({
        code: 'unknown-equipment-id',
        category: 'unknown-id',
        severity: 'blocking',
        blocking: true,
        titleKo: '보유 기구 목록이 비어 있음',
        messageKo: '보유 기구(ownedApparatus)가 비어 있어 동작을 구성할 수 없습니다.',
      });
    } else {
      for (const item of req.ownedApparatus) {
        if (typeof item === 'string' && VALID_SINGLE_APPARATUS.has(item as ApparatusType)) {
          if (!availableEquipment.includes(item)) {
            availableEquipment.push(item);
          }
          for (const opt of EQUIPMENT_OPTIONS) {
            if (opt.apparatusFamily === item && !availableEquipment.includes(opt.id)) {
              availableEquipment.push(opt.id);
            }
          }
        } else {
          const badId = String(toPresetSuggestionDiagnosticValue(item));
          if (!unknownEquipmentIds.includes(badId)) {
            unknownEquipmentIds.push(badId);
          }
        }
      }
      if (
        apparatusValid &&
        apparatus !== 'mixed' &&
        !availableEquipment.includes(apparatus)
      ) {
        unknownEquipmentIds.push(apparatus);
        pendingIssues.push({
          code: 'unknown-equipment-id',
          category: 'unknown-id',
          severity: 'blocking',
          blocking: true,
          titleKo: '선택 기구와 보유 기구 불일치',
          messageKo: `선택한 기구(${apparatus})가 보유 기구 목록에 포함되어 있지 않습니다.`,
        });
      }
    }
  } else {
    if (apparatus === 'mixed') {
      availableEquipment = [
        ...DEFAULT_OWNED_EQUIPMENT,
        ...EQUIPMENT_OPTIONS.map((opt) => opt.id).filter(
          (id) => !DEFAULT_OWNED_EQUIPMENT.includes(id),
        ),
      ];
    } else {
      availableEquipment = [
        apparatus,
        ...EQUIPMENT_OPTIONS.filter(
          (opt) => opt.apparatusFamily === apparatus && opt.id !== apparatus,
        ).map((opt) => opt.id),
      ];
    }
  }

  // 2. Theme & FocusPreset validation
  const rawTheme = req.theme;
  let theme: PresetThemeId = 'full-body-flow';
  let themeValid = true;
  const validFocus =
    typeof req.focusPreset === 'string' &&
    VALID_FOCUS_PRESETS.has(req.focusPreset as AutoGenerateCriteria['focusPreset'])
      ? (req.focusPreset as AutoGenerateCriteria['focusPreset'])
      : undefined;

  if (rawTheme !== undefined) {
    if (typeof rawTheme === 'string' && THEME_BY_ID.has(rawTheme as PresetThemeId)) {
      theme = rawTheme as PresetThemeId;
    } else {
      themeValid = false;
      if (validFocus) {
        theme = FOCUS_TO_DEFAULT_THEME[validFocus];
      }
      pendingIssues.push({
        code: 'malformed-item-skipped',
        category: 'cycle-and-bounds',
        severity: 'warning',
        blocking: false,
        titleKo: '등록되지 않은 수업 주제(theme) 입력',
        messageKo: `입력된 주제(${String(toPresetSuggestionDiagnosticValue(rawTheme))})가 7대 프리셋 주제에 없어 기본 주제(${theme}) 기준으로 탐색합니다.`,
      });
    }
  } else if (validFocus) {
    theme = FOCUS_TO_DEFAULT_THEME[validFocus];
  }

  const focusPreset: AutoGenerateCriteria['focusPreset'] =
    validFocus ?? THEME_BY_ID.get(theme)?.defaultFocusPreset ?? 'full-body';

  // 3. Level, Props, Layer validation
  let level: DifficultyLevel = '1.5';
  let levelValid = true;
  if (req.level !== undefined) {
    if (typeof req.level === 'string' && VALID_LEVELS.has(req.level as DifficultyLevel)) {
      level = req.level as DifficultyLevel;
    } else {
      levelValid = false;
      pendingIssues.push({
        code: 'target-duration-out-of-bounds',
        category: 'target-impossibility',
        severity: 'blocking',
        blocking: true,
        titleKo: '유효하지 않은 난이도(level) 입력',
        messageKo: '최대 난이도는 1.0, 1.5, 2.0 중에서 선택해 주세요.',
        detailKo: `입력값: ${String(toPresetSuggestionDiagnosticValue(req.level))}`,
      });
    }
  }

  const preferredProps: PropType[] = Array.isArray(req.preferredProps)
    ? req.preferredProps.filter(
        (p): p is PropType => typeof p === 'string' && PROP_IDS.includes(p as PropType),
      )
    : [];

  const defaultLayer: LayerMode =
    typeof req.defaultLayer === 'string' && VALID_LAYERS.has(req.defaultLayer)
      ? req.defaultLayer
      : 'standard';

  const excludeDaysWindow =
    typeof req.excludeDaysWindow === 'number' &&
    Number.isFinite(req.excludeDaysWindow) &&
    req.excludeDaysWindow >= 0
      ? Math.min(365, Math.floor(req.excludeDaysWindow))
      : 10;

  // 4. Target Minutes validation
  const rawTargetMinutes = req.targetMinutes;
  let targetMinutes: number | null = null;
  let targetDurationStatus: 'known' | 'unspecified' | 'invalid';

  if (rawTargetMinutes === undefined || rawTargetMinutes === null) {
    targetDurationStatus = 'unspecified';
    pendingIssues.push({
      code: 'target-duration-out-of-bounds',
      category: 'target-impossibility',
      severity: 'blocking',
      blocking: true,
      titleKo: '목표 수업 시간 미지정',
      messageKo: `수업 목표 시간(targetMinutes)이 지정되지 않았습니다. ${PRESET_SUGGESTION_LIMITS.MIN_TARGET_MINUTES}분~${PRESET_SUGGESTION_LIMITS.MAX_TARGET_MINUTES}분 사이의 시간을 입력해 주세요.`,
    });
  } else if (
    typeof rawTargetMinutes !== 'number' ||
    !Number.isFinite(rawTargetMinutes) ||
    rawTargetMinutes < PRESET_SUGGESTION_LIMITS.MIN_TARGET_MINUTES ||
    rawTargetMinutes > PRESET_SUGGESTION_LIMITS.MAX_TARGET_MINUTES
  ) {
    targetDurationStatus = 'invalid';
    pendingIssues.push({
      code: 'target-duration-out-of-bounds',
      category: 'target-impossibility',
      severity: 'blocking',
      blocking: true,
      titleKo: '목표 수업 시간 범위 초과 또는 형식 오류',
      messageKo: `수업 목표 시간은 ${PRESET_SUGGESTION_LIMITS.MIN_TARGET_MINUTES}분 이상 ${PRESET_SUGGESTION_LIMITS.MAX_TARGET_MINUTES}분 이하의 유한한 숫자여야 합니다.`,
      detailKo: `입력값: ${String(toPresetSuggestionDiagnosticValue(rawTargetMinutes))}`,
    });
  } else {
    targetDurationStatus = 'known';
    targetMinutes = rawTargetMinutes;
  }

  // 5. Rest Minutes validation
  const rawRestMinutes = req.restMinutes;
  let restMinutes: number;
  let restStatus: 'none' | 'valid' | 'invalid';

  if (rawRestMinutes === undefined || rawRestMinutes === null || rawRestMinutes === 0) {
    restMinutes = 0;
    restStatus = 'none';
  } else if (
    typeof rawRestMinutes !== 'number' ||
    !Number.isFinite(rawRestMinutes) ||
    rawRestMinutes < 0 ||
    Math.round(rawRestMinutes * 60) <= 0
  ) {
    restMinutes = 0;
    restStatus = 'invalid';
    pendingIssues.push({
      code: 'rest-duration-invalid',
      category: 'rest-budget',
      severity: 'blocking',
      blocking: true,
      titleKo: '유효하지 않은 쉬는 시간(restMinutes) 입력',
      messageKo: '쉬는 시간은 0 이상인 유한한 분 단위 시간이어야 합니다.',
      detailKo: `입력값: ${String(toPresetSuggestionDiagnosticValue(rawRestMinutes))}`,
    });
  } else {
    restMinutes = rawRestMinutes;
    restStatus = 'valid';
    if (
      targetMinutes !== null &&
      Math.round(restMinutes * 60) >= Math.round(targetMinutes * 60)
    ) {
      pendingIssues.push({
        code: 'rest-exceeds-or-equals-target',
        category: 'rest-budget',
        severity: 'blocking',
        blocking: true,
        titleKo: '쉬는 시간이 목표 수업 시간 이상임',
        messageKo: `요청한 쉬는 시간(${formatDurationSecondsKo(Math.round(restMinutes * 60))})이 전체 목표 수업 시간(${formatDurationSecondsKo(Math.round(targetMinutes * 60))}) 이상이어서 실제 동작을 배치할 수 없습니다.`,
      });
    }
  }

  // 6. Seed Plan / Nested Container Traversal (Cycle, Depth, Scan Limit, Item Limit, ID & Timing checks)
  const seedSteps: NormalizedSeedStep[] = [];
  const seenStepIds = new Set<string>();
  const unknownExerciseIds: string[] = [];
  const unverifiableExerciseIds: string[] = [];
  const activeAncestors = new WeakSet<object>();

  let rawNodesScanned = 0;
  let maxDepthObserved = 0;
  let cycleDetectedCount = 0;
  let depthExceededCount = 0;
  let itemLimitExceededCount = 0;
  let scanLimitExceeded = false;
  let skippedMalformedCount = 0;

  function allocateStepId(rawId: string | undefined, index: number): {
    stepId: string;
    wasGenerated: boolean;
    wasDuplicateOrMissing: boolean;
  } {
    if (!rawId) {
      let candidate = `seed-step-${index + 1}`;
      let suffix = 1;
      while (seenStepIds.has(candidate)) {
        suffix += 1;
        candidate = `seed-step-${index + 1}-${suffix}`;
      }
      seenStepIds.add(candidate);
      return { stepId: candidate, wasGenerated: true, wasDuplicateOrMissing: true };
    }
    if (seenStepIds.has(rawId)) {
      let candidate = `${rawId}-dup-${index + 1}`;
      let suffix = 1;
      while (seenStepIds.has(candidate)) {
        suffix += 1;
        candidate = `${rawId}-dup-${index + 1}-${suffix}`;
      }
      seenStepIds.add(candidate);
      return { stepId: candidate, wasGenerated: true, wasDuplicateOrMissing: true };
    }
    seenStepIds.add(rawId);
    return { stepId: rawId, wasGenerated: false, wasDuplicateOrMissing: false };
  }

  function processSeedLeaf(raw: Record<string, unknown>, inheritedSection?: ClassSectionRole): void {
    if (seedSteps.length >= maxItems) {
      itemLimitExceededCount += 1;
      if (itemLimitExceededCount === 1) {
        pendingIssues.push({
          code: 'max-item-count-exceeded',
          category: 'cycle-and-bounds',
          severity: 'blocking',
          blocking: true,
          titleKo: '최대 허용 항목 수(상한) 초과',
          messageKo: `입력된 시퀀스 항목 수가 상한(${maxItems}개)을 초과하여 이후 항목을 처리하지 않았습니다.`,
        });
      }
      return;
    }

    const index = seedSteps.length;
    const rawId =
      nonEmptyString(raw.stepId) ?? nonEmptyString(raw.itemId) ?? nonEmptyString(raw.id);
    const { stepId, wasGenerated, wasDuplicateOrMissing } = allocateStepId(rawId, index);
    const stepIssueCodes: PresetSuggestionIssueCode[] = [];

    if (wasDuplicateOrMissing) {
      stepIssueCodes.push('duplicate-or-missing-step-id');
      pendingIssues.push({
        code: 'duplicate-or-missing-step-id',
        category: 'cycle-and-bounds',
        severity: 'notice',
        blocking: false,
        stepId,
        stepIndex: index,
        titleKo: rawId ? '중복된 항목 ID 분리' : '누락된 항목 ID 자동 부여',
        messageKo: rawId
          ? `중복된 항목 ID('${rawId}')를 '${stepId}'로 분리했습니다.`
          : `식별자가 없는 항목에 임시 ID('${stepId}')를 부여했습니다.`,
      });
    }

    const isRest = raw.kind === 'rest';
    const rawExerciseId = nonEmptyString(raw.exerciseId) ?? '';
    const locked = raw.locked === true;

    const rawDurationMin = raw.durationMin;
    const rawRepetitions = raw.repetitions;
    const rawSets = raw.sets;
    const rawSideMode = raw.sideMode;

    // Validate repetitions & sets
    let repetitions: number | undefined;
    if (rawRepetitions !== undefined && rawRepetitions !== null) {
      if (
        typeof rawRepetitions === 'number' &&
        Number.isInteger(rawRepetitions) &&
        rawRepetitions >= 1 &&
        rawRepetitions <= PRESET_SUGGESTION_LIMITS.MAX_REPETITIONS
      ) {
        repetitions = rawRepetitions;
      } else {
        stepIssueCodes.push('invalid-repetition-or-set');
        pendingIssues.push({
          code: 'invalid-repetition-or-set',
          category: 'cycle-and-bounds',
          severity: 'warning',
          blocking: false,
          stepId,
          stepIndex: index,
          titleKo: '유효하지 않은 반복 횟수(repetitions)',
          messageKo: `반복 횟수는 1~${PRESET_SUGGESTION_LIMITS.MAX_REPETITIONS} 사이의 정수여야 합니다.`,
          detailKo: `입력값: ${String(toPresetSuggestionDiagnosticValue(rawRepetitions))}`,
        });
      }
    }

    let sets: number | undefined;
    if (rawSets !== undefined && rawSets !== null) {
      if (
        typeof rawSets === 'number' &&
        Number.isInteger(rawSets) &&
        rawSets >= 1 &&
        rawSets <= PRESET_SUGGESTION_LIMITS.MAX_SETS
      ) {
        sets = rawSets;
      } else {
        if (!stepIssueCodes.includes('invalid-repetition-or-set')) {
          stepIssueCodes.push('invalid-repetition-or-set');
        }
        pendingIssues.push({
          code: 'invalid-repetition-or-set',
          category: 'cycle-and-bounds',
          severity: 'warning',
          blocking: false,
          stepId,
          stepIndex: index,
          titleKo: '유효하지 않은 세트 수(sets)',
          messageKo: `세트 수는 1~${PRESET_SUGGESTION_LIMITS.MAX_SETS} 사이의 정수여야 합니다.`,
          detailKo: `입력값: ${String(toPresetSuggestionDiagnosticValue(rawSets))}`,
        });
      }
    }

    let sideMode: StepSideMode | undefined;
    if (rawSideMode !== undefined && rawSideMode !== null) {
      if (typeof rawSideMode === 'string' && VALID_SIDE_MODES.has(rawSideMode as StepSideMode)) {
        sideMode = rawSideMode as StepSideMode;
      } else {
        stepIssueCodes.push('invalid-side-mode');
        pendingIssues.push({
          code: 'invalid-side-mode',
          category: 'unilateral-timing',
          severity: 'warning',
          blocking: false,
          stepId,
          stepIndex: index,
          titleKo: '유효하지 않은 좌우 모드(sideMode)',
          messageKo:
            'sideMode는 together, left, right, left-then-right, right-then-left 중 하나여야 합니다.',
          detailKo: `입력값: ${String(toPresetSuggestionDiagnosticValue(rawSideMode))}`,
        });
      }
    }

    if (isRest) {
      // Rest step rules from `sequenceEngine.validateRestBudget`:
      // exerciseId must be '', repetitions/sets/sideMode must be undefined, durationMin > 0
      const hasForbiddenRestFields =
        rawExerciseId.length > 0 ||
        rawRepetitions !== undefined ||
        rawSets !== undefined ||
        rawSideMode !== undefined;

      if (hasForbiddenRestFields) {
        stepIssueCodes.push('rest-step-malformed');
        pendingIssues.push({
          code: 'rest-step-malformed',
          category: 'rest-budget',
          severity: 'blocking',
          blocking: true,
          stepId,
          stepIndex: index,
          relatedExerciseIds: rawExerciseId ? [rawExerciseId] : [],
          titleKo: '휴식(rest) 항목에 동작 ID 또는 횟수·세트·좌우 속성이 포함됨',
          messageKo:
            '휴식 항목은 동작 ID(exerciseId)가 비어 있어야 하며 반복 횟수·세트·좌우 모드를 가질 수 없습니다.',
        });
      }

      let durationStatus: 'known' | 'unspecified' | 'invalid';
      let durationMin = 0;
      let totalSec = 0;

      if (rawDurationMin === undefined || rawDurationMin === null) {
        durationStatus = 'unspecified';
        stepIssueCodes.push('rest-duration-invalid');
        pendingIssues.push({
          code: 'rest-duration-invalid',
          category: 'rest-budget',
          severity: 'blocking',
          blocking: true,
          stepId,
          stepIndex: index,
          titleKo: '휴식 항목 시간 미지정',
          messageKo: '휴식 항목의 시간(durationMin)은 0보다 큰 유한한 값이어야 합니다.',
        });
      } else if (
        typeof rawDurationMin !== 'number' ||
        !Number.isFinite(rawDurationMin) ||
        rawDurationMin <= 0 ||
        Math.round(rawDurationMin * 60) <= 0 ||
        Math.round(rawDurationMin * 60) > PRESET_SUGGESTION_LIMITS.MAX_STEP_TOTAL_SEC
      ) {
        durationStatus = 'invalid';
        stepIssueCodes.push('rest-duration-invalid');
        pendingIssues.push({
          code: 'rest-duration-invalid',
          category: 'rest-budget',
          severity: 'blocking',
          blocking: true,
          stepId,
          stepIndex: index,
          titleKo: '유효하지 않은 휴식 항목 시간',
          messageKo: `휴식 항목 시간은 0초 초과 ${PRESET_SUGGESTION_LIMITS.MAX_STEP_TOTAL_SEC / 60}분 이하여야 합니다.`,
          detailKo: `입력값: ${String(toPresetSuggestionDiagnosticValue(rawDurationMin))}`,
        });
      } else {
        durationStatus = 'known';
        durationMin = rawDurationMin;
        totalSec = Math.round(rawDurationMin * 60);
      }

      seedSteps.push({
        stepId,
        stepIdWasGenerated: wasGenerated,
        index,
        order: index + 1,
        kind: 'rest',
        exerciseId: '',
        exerciseResolved: true,
        blockCategory: 'core',
        classSection: inheritedSection ?? 'main',
        durationStatus,
        durationMin,
        totalSec,
        movementSec: 0,
        perSideSec: 0,
        sides: 1,
        explanationSec: 0,
        transitionSec: 0,
        selectedLayer: 'standard',
        instructorNote: nonEmptyString(raw.instructorNote),
        locked,
        usedTimeEstimate: false,
        rawDurationMin: toPresetSuggestionDiagnosticValue(rawDurationMin),
        rawRepetitions: toPresetSuggestionDiagnosticValue(rawRepetitions),
        rawSets: toPresetSuggestionDiagnosticValue(rawSets),
        rawSideMode: toPresetSuggestionDiagnosticValue(rawSideMode),
        issueCodes: stepIssueCodes,
      });
      return;
    }

    // Exercise step resolution against verifiable catalog
    const catalogExercise = rawExerciseId ? catalogMap.get(rawExerciseId) : undefined;
    const verifiableExercise = rawExerciseId ? verifiableMap.get(rawExerciseId) : undefined;
    let exerciseResolved = false;

    if (!rawExerciseId || !catalogExercise) {
      const missingId = rawExerciseId || '(빈 동작 ID)';
      if (!unknownExerciseIds.includes(missingId)) {
        unknownExerciseIds.push(missingId);
      }
      stepIssueCodes.push('unknown-exercise-id');
      pendingIssues.push({
        code: 'unknown-exercise-id',
        category: 'unknown-id',
        severity: 'blocking',
        blocking: true,
        stepId,
        stepIndex: index,
        relatedExerciseIds: [missingId],
        titleKo: '카탈로그에 없는 동작 ID 감지',
        messageKo: `동작 ID('${missingId}')가 기존 검증 가능한 동작 카탈로그에 존재하지 않습니다. 없는 동작을 임의로 생성하지 않습니다.`,
      });
    } else if (!verifiableExercise) {
      if (!unverifiableExerciseIds.includes(rawExerciseId)) {
        unverifiableExerciseIds.push(rawExerciseId);
      }
      stepIssueCodes.push('unverifiable-catalog-exercise');
      pendingIssues.push({
        code: 'unverifiable-catalog-exercise',
        category: 'unknown-id',
        severity: 'blocking',
        blocking: true,
        stepId,
        stepIndex: index,
        relatedExerciseIds: [rawExerciseId],
        titleKo: '검증 계약 미충족 카탈로그 동작 ID',
        messageKo: `동작 ID('${rawExerciseId}')의 스키마 또는 필수 기구 요구사항이 검증 가능 계약을 충족하지 않습니다.`,
      });
    } else {
      exerciseResolved = true;
    }

    // TimeEstimate & durationMin resolution
    let usedTimeEstimate = false;
    let estimateTotalSec: number | null = null;
    let estimateExplanationSec: number | undefined;
    let estimateTransitionSec: number | undefined;
    let estimateSides: (1 | 2) | undefined;

    if (raw.timeEstimate !== undefined && raw.timeEstimate !== null) {
      const estimateResult = calculateStepTimeEstimate(raw.timeEstimate);
      if (estimateResult.success) {
        estimateTotalSec = estimateResult.totalSec;
        estimateExplanationSec = estimateResult.value.explanationSec;
        estimateTransitionSec = estimateResult.value.transitionSec;
        estimateSides = estimateResult.value.sides;
        if (repetitions === undefined) repetitions = estimateResult.value.repetitions;
        if (sets === undefined) sets = estimateResult.value.sets;
      } else {
        stepIssueCodes.push('time-estimate-out-of-bounds');
        pendingIssues.push({
          code: 'time-estimate-out-of-bounds',
          category: 'cycle-and-bounds',
          severity: 'warning',
          blocking: rawDurationMin === undefined || rawDurationMin === null,
          stepId,
          stepIndex: index,
          relatedExerciseIds: rawExerciseId ? [rawExerciseId] : [],
          titleKo: '세부 시간 계산(timeEstimate) 범위 또는 형식 오류',
          messageKo: estimateResult.message,
        });
      }
    }

    let durationStatus: 'known' | 'unspecified' | 'invalid';
    let durationMin = 0;
    let totalSec = 0;

    if (rawDurationMin === undefined || rawDurationMin === null) {
      if (estimateTotalSec !== null) {
        durationStatus = 'known';
        usedTimeEstimate = true;
        totalSec = estimateTotalSec;
        durationMin = estimateTotalSec / 60;
      } else {
        durationStatus = 'unspecified';
        stepIssueCodes.push('step-duration-out-of-bounds');
        pendingIssues.push({
          code: 'step-duration-out-of-bounds',
          category: 'cycle-and-bounds',
          severity: locked ? 'blocking' : 'warning',
          blocking: locked,
          stepId,
          stepIndex: index,
          relatedExerciseIds: rawExerciseId ? [rawExerciseId] : [],
          titleKo: '항목 수행 시간 미지정',
          messageKo: '항목의 배정 시간(durationMin)이 지정되지 않았습니다.',
        });
      }
    } else if (
      typeof rawDurationMin !== 'number' ||
      !Number.isFinite(rawDurationMin) ||
      Math.round(rawDurationMin * 60) < PRESET_SUGGESTION_LIMITS.MIN_STEP_TOTAL_SEC ||
      Math.round(rawDurationMin * 60) > PRESET_SUGGESTION_LIMITS.MAX_STEP_TOTAL_SEC
    ) {
      durationStatus = 'invalid';
      stepIssueCodes.push('step-duration-out-of-bounds');
      pendingIssues.push({
        code: 'step-duration-out-of-bounds',
        category: 'cycle-and-bounds',
        severity: 'blocking',
        blocking: true,
        stepId,
        stepIndex: index,
        relatedExerciseIds: rawExerciseId ? [rawExerciseId] : [],
        titleKo: '항목 시간 상·하한(30초~20분) 위반',
        messageKo: `각 동작 항목의 총시간은 ${PRESET_SUGGESTION_LIMITS.MIN_STEP_TOTAL_SEC}초 이상 ${PRESET_SUGGESTION_LIMITS.MAX_STEP_TOTAL_SEC / 60}분 이하여야 합니다.`,
        detailKo: `입력값: ${String(toPresetSuggestionDiagnosticValue(rawDurationMin))}`,
      });
    } else {
      durationStatus = 'known';
      durationMin = rawDurationMin;
      totalSec = Math.round(rawDurationMin * 60);
    }

    const rawExp = raw.explanationSec ?? estimateExplanationSec ?? 0;
    const rawTrans = raw.transitionSec ?? estimateTransitionSec ?? 0;
    const explanationSec =
      typeof rawExp === 'number' && Number.isFinite(rawExp) && rawExp >= 0
        ? Math.min(totalSec, Math.round(rawExp))
        : 0;
    const transitionSec =
      typeof rawTrans === 'number' && Number.isFinite(rawTrans) && rawTrans >= 0
        ? Math.min(Math.max(0, totalSec - explanationSec), Math.round(rawTrans))
        : 0;
    const movementSec = Math.max(0, totalSec - explanationSec - transitionSec);

    if (durationStatus === 'known' && movementSec < PRESET_SUGGESTION_LIMITS.MIN_MOVEMENT_SEC) {
      if (!stepIssueCodes.includes('step-duration-out-of-bounds')) {
        stepIssueCodes.push('step-duration-out-of-bounds');
      }
      pendingIssues.push({
        code: 'step-duration-out-of-bounds',
        category: 'cycle-and-bounds',
        severity: 'blocking',
        blocking: true,
        stepId,
        stepIndex: index,
        relatedExerciseIds: rawExerciseId ? [rawExerciseId] : [],
        titleKo: '순수 동작 수행 시간(movementSec) 30초 미만',
        messageKo: `설명(${explanationSec}초)과 전환(${transitionSec}초)을 제외한 순수 움직임 시간(${movementSec}초)이 최소 기준(${PRESET_SUGGESTION_LIMITS.MIN_MOVEMENT_SEC}초)보다 짧습니다.`,
      });
    }

    const isUnilateral = verifiableExercise?.isUnilateral ?? catalogExercise?.isUnilateral ?? false;
    const resolvedSideMode: StepSideMode | undefined =
      sideMode ?? (isUnilateral ? 'left-then-right' : 'together');

    const sides: 1 | 2 =
      resolvedSideMode === 'left-then-right' || resolvedSideMode === 'right-then-left'
        ? 2
        : resolvedSideMode
          ? 1
          : isUnilateral
            ? 2
            : 1;
    const perSideSec = movementSec / sides;

    // Unilateral checks on seed step
    if (isUnilateral && sideMode === 'together') {
      stepIssueCodes.push('unilateral-together-mismatch');
      pendingIssues.push({
        code: 'unilateral-together-mismatch',
        category: 'unilateral-timing',
        severity: 'blocking',
        blocking: true,
        stepId,
        stepIndex: index,
        relatedExerciseIds: rawExerciseId ? [rawExerciseId] : [],
        titleKo: '편측(unilateral) 동작에 양쪽 동시(together) 설정 불가',
        messageKo: `'${verifiableExercise?.nameKo ?? rawExerciseId}' 동작은 편측(isUnilateral: true) 동작이므로 'together'로 배치할 수 없습니다. 'left-then-right' 또는 좌·우 분할 스텝을 사용해 주세요.`,
      });
    }

    if (
      estimateSides !== undefined &&
      ((estimateSides === 2 && (sideMode === 'left' || sideMode === 'right' || sideMode === 'together')) ||
        (estimateSides === 1 && (sideMode === 'left-then-right' || sideMode === 'right-then-left')))
    ) {
      stepIssueCodes.push('unilateral-time-estimate-mismatch');
      pendingIssues.push({
        code: 'unilateral-time-estimate-mismatch',
        category: 'unilateral-timing',
        severity: 'warning',
        blocking: false,
        stepId,
        stepIndex: index,
        relatedExerciseIds: rawExerciseId ? [rawExerciseId] : [],
        titleKo: '세부 시간 계산(sides)과 좌우 모드(sideMode) 불일치',
        messageKo: `timeEstimate.sides(${estimateSides})와 항목 sideMode('${sideMode}')의 좌우 수행 횟수 가정이 일치하지 않습니다.`,
      });
    }

    if (
      durationStatus === 'known' &&
      sides === 2 &&
      perSideSec < PRESET_SUGGESTION_LIMITS.MIN_PER_SIDE_SEC
    ) {
      stepIssueCodes.push('unilateral-per-side-too-short');
      pendingIssues.push({
        code: 'unilateral-per-side-too-short',
        category: 'unilateral-timing',
        severity: 'blocking',
        blocking: true,
        stepId,
        stepIndex: index,
        relatedExerciseIds: rawExerciseId ? [rawExerciseId] : [],
        titleKo: '편측 순차 수행 시 한쪽당 수행 시간 부족',
        messageKo: `양쪽 순차 수행(${resolvedSideMode}) 시 한쪽당 수행 시간(${perSideSec}초)이 최소 ${PRESET_SUGGESTION_LIMITS.MIN_PER_SIDE_SEC}초 미만입니다.`,
      });
    }

    const blockCategory: ClassBlockCategory =
      typeof raw.blockCategory === 'string' &&
      VALID_BLOCK_CATEGORIES.has(raw.blockCategory as ClassBlockCategory)
        ? (raw.blockCategory as ClassBlockCategory)
        : (verifiableExercise?.blockCategory ?? 'core');

    const classSection: ClassSectionRole =
      typeof raw.classSection === 'string' &&
      VALID_SECTION_ROLES.has(raw.classSection as ClassSectionRole)
        ? (raw.classSection as ClassSectionRole)
        : (inheritedSection ?? getMovementSectionRole(blockCategory));

    const selectedLayer: LayerMode =
      typeof raw.selectedLayer === 'string' && VALID_LAYERS.has(raw.selectedLayer as LayerMode)
        ? (raw.selectedLayer as LayerMode)
        : defaultLayer;

    seedSteps.push({
      stepId,
      stepIdWasGenerated: wasGenerated,
      index,
      order: index + 1,
      kind: 'exercise',
      exerciseId: rawExerciseId,
      exerciseResolved,
      blockCategory,
      classSection,
      durationStatus,
      durationMin,
      totalSec,
      movementSec,
      perSideSec,
      sides,
      explanationSec,
      transitionSec,
      repetitions,
      sets,
      sideMode: resolvedSideMode,
      selectedLayer,
      customSpringOverride: nonEmptyString(raw.customSpringOverride),
      instructorNote: nonEmptyString(raw.instructorNote),
      locked,
      usedTimeEstimate,
      rawDurationMin: toPresetSuggestionDiagnosticValue(rawDurationMin),
      rawRepetitions: toPresetSuggestionDiagnosticValue(rawRepetitions),
      rawSets: toPresetSuggestionDiagnosticValue(rawSets),
      rawSideMode: toPresetSuggestionDiagnosticValue(rawSideMode),
      issueCodes: stepIssueCodes,
    });
  }

  function traverseSeedNode(
    node: unknown,
    depth: number,
    inheritedSection?: ClassSectionRole,
  ): void {
    rawNodesScanned += 1;
    if (rawNodesScanned > maxRawScanNodes) {
      if (!scanLimitExceeded) {
        scanLimitExceeded = true;
        pendingIssues.push({
          code: 'max-input-scan-exceeded',
          category: 'cycle-and-bounds',
          severity: 'blocking',
          blocking: true,
          titleKo: '입력 구조 최대 스캔 한도(상한) 초과',
          messageKo: `입력 노드가 최대 스캔 상한(${maxRawScanNodes}개)을 초과하여 탐색을 중단했습니다.`,
        });
      }
      return;
    }

    if (depth > maxDepthObserved) {
      maxDepthObserved = depth;
    }

    if (node === null || node === undefined || typeof node !== 'object') {
      skippedMalformedCount += 1;
      pendingIssues.push({
        code: 'malformed-item-skipped',
        category: 'cycle-and-bounds',
        severity: 'warning',
        blocking: false,
        titleKo: '잘못된 형식의 항목 제외',
        messageKo: '객체가 아닌 잘못된 항목(null, 원시값 등)을 건너뛰었습니다.',
        detailKo: `입력값: ${String(toPresetSuggestionDiagnosticValue(node))}`,
      });
      return;
    }

    if (activeAncestors.has(node)) {
      cycleDetectedCount += 1;
      pendingIssues.push({
        code: 'nested-cycle-detected',
        category: 'cycle-and-bounds',
        severity: 'blocking',
        blocking: true,
        titleKo: '중첩 구조 순환 참조(cycle) 감지',
        messageKo: `시퀀스·블록 중첩 컨테이너(깊이 ${depth})에서 자기 자신 또는 상위 컨테이너를 다시 참조하는 순환 참조(cycle)가 감지되어 무한 순회를 차단했습니다.`,
      });
      return;
    }

    if (depth > maxNestingDepth) {
      depthExceededCount += 1;
      pendingIssues.push({
        code: 'max-nesting-depth-exceeded',
        category: 'cycle-and-bounds',
        severity: 'blocking',
        blocking: true,
        titleKo: '중첩 깊이 상한 초과',
        messageKo: `중첩 컨테이너 깊이가 최대 허용 상한(${maxNestingDepth}단계)을 초과하여 하위 탐색을 중단했습니다.`,
      });
      return;
    }

    activeAncestors.add(node);

    if (Array.isArray(node)) {
      for (const child of node) {
        if (scanLimitExceeded) break;
        traverseSeedNode(child, depth + 1, inheritedSection);
      }
      activeAncestors.delete(node);
      return;
    }

    const record = node as Record<string, unknown>;
    const nextSection: ClassSectionRole | undefined =
      typeof record.sectionRole === 'string' &&
      VALID_SECTION_ROLES.has(record.sectionRole as ClassSectionRole)
        ? (record.sectionRole as ClassSectionRole)
        : inheritedSection;

    const childArrays = getContainerChildArrays(record);
    if (childArrays.length > 0) {
      for (const arr of childArrays) {
        for (const child of arr) {
          if (scanLimitExceeded) break;
          traverseSeedNode(child, depth + 1, nextSection);
        }
        if (scanLimitExceeded) break;
      }
      activeAncestors.delete(node);
      return;
    }

    if (hasNonArrayContainerProperty(record)) {
      skippedMalformedCount += 1;
      pendingIssues.push({
        code: 'malformed-item-skipped',
        category: 'cycle-and-bounds',
        severity: 'warning',
        blocking: false,
        titleKo: '손상된 컨테이너 속성 감지',
        messageKo: 'steps/items/blocks/children 속성이 배열이 아니어서 건너뛰었습니다.',
      });
      activeAncestors.delete(node);
      return;
    }

    if (isRecognizableSeedLeaf(record)) {
      processSeedLeaf(record, nextSection);
    } else if (depth > 0) {
      skippedMalformedCount += 1;
      pendingIssues.push({
        code: 'malformed-item-skipped',
        category: 'cycle-and-bounds',
        severity: 'warning',
        blocking: false,
        titleKo: '인식할 수 없는 빈 항목 또는 손상된 객체 제외',
        messageKo: '동작 ID나 휴식 구분이 없는 잘못된 객체를 건너뛰었습니다.',
      });
    }

    activeAncestors.delete(node);
  }

  if (req.seedPlan !== undefined && req.seedPlan !== null) {
    if (typeof req.seedPlan !== 'object') {
      skippedMalformedCount += 1;
      pendingIssues.push({
        code: 'malformed-item-skipped',
        category: 'cycle-and-bounds',
        severity: 'warning',
        blocking: false,
        titleKo: '유효하지 않은 시드 계획(seedPlan) 형식',
        messageKo: 'seedPlan은 시퀀스 객체 또는 스텝 배열이어야 합니다.',
      });
    } else if (Array.isArray(req.seedPlan)) {
      activeAncestors.add(req.seedPlan);
      for (const child of req.seedPlan) {
        if (scanLimitExceeded) break;
        traverseSeedNode(child, 1, undefined);
      }
      activeAncestors.delete(req.seedPlan);
    } else {
      traverseSeedNode(req.seedPlan, 0, undefined);
    }
  }

  // 7. Split left/right balance check across seedSteps
  const splitGroups = new Map<
    string,
    {
      exerciseId: string;
      leftSteps: NormalizedSeedStep[];
      rightSteps: NormalizedSeedStep[];
    }
  >();

  for (const step of seedSteps) {
    if (step.kind === 'rest' || !step.exerciseId) continue;
    if (step.sideMode === 'left' || step.sideMode === 'right') {
      const group = splitGroups.get(step.exerciseId) ?? {
        exerciseId: step.exerciseId,
        leftSteps: [],
        rightSteps: [],
      };
      if (step.sideMode === 'left') group.leftSteps.push(step);
      else group.rightSteps.push(step);
      splitGroups.set(step.exerciseId, group);
    }
  }

  for (const [exerciseId, group] of splitGroups) {
    const leftCount = group.leftSteps.length;
    const rightCount = group.rightSteps.length;
    const leftSec = group.leftSteps.reduce((acc, s) => acc + s.movementSec, 0);
    const rightSec = group.rightSteps.reduce((acc, s) => acc + s.movementSec, 0);
    const leftReps = group.leftSteps.map((s) => `${s.repetitions ?? '-'}:${s.sets ?? '-'}`).join(',');
    const rightReps = group.rightSteps
      .map((s) => `${s.repetitions ?? '-'}:${s.sets ?? '-'}`)
      .join(',');

    if (leftCount !== rightCount || leftSec !== rightSec || leftReps !== rightReps) {
      const combinedSteps = [...group.leftSteps, ...group.rightSteps];
      for (const s of combinedSteps) {
        if (!s.issueCodes.includes('unilateral-split-imbalance')) {
          (s.issueCodes as PresetSuggestionIssueCode[]).push('unilateral-split-imbalance');
        }
      }
      pendingIssues.push({
        code: 'unilateral-split-imbalance',
        category: 'unilateral-timing',
        severity: 'blocking',
        blocking: true,
        stepId: combinedSteps[0]?.stepId,
        stepIndex: combinedSteps[0]?.index,
        relatedExerciseIds: [exerciseId],
        titleKo: '좌·우 분할 편측 동작의 시간·횟수·짝 불균형',
        messageKo: `동작('${exerciseId}')의 왼쪽(${leftCount}개, 수행 ${leftSec}초)과 오른쪽(${rightCount}개, 수행 ${rightSec}초) 분할 스텝이 1:1로 일치하지 않습니다.`,
      });
    }
  }

  const adapterIssues: PresetSuggestionIssue[] = pendingIssues.map((item, idx) => ({
    id: `adapter-issue-${idx + 1}-${item.code}`,
    code: item.code,
    category: item.category,
    severity: item.severity,
    blocking: item.blocking,
    stepIds: item.stepId ? [item.stepId] : [],
    stepIndices: item.stepIndex !== undefined ? [item.stepIndex] : [],
    relatedExerciseIds: item.relatedExerciseIds ? [...item.relatedExerciseIds] : [],
    titleKo: item.titleKo,
    messageKo: item.messageKo,
    detailKo: item.detailKo,
  }));

  const isPartialSeedScan =
    cycleDetectedCount > 0 ||
    depthExceededCount > 0 ||
    itemLimitExceededCount > 0 ||
    scanLimitExceeded ||
    skippedMalformedCount > 0;

  return deepFreezeCandidateResult({
    apparatus,
    apparatusValid,
    availableEquipment,
    unknownEquipmentIds,
    theme,
    themeValid,
    focusPreset,
    level,
    levelValid,
    targetMinutes,
    targetDurationStatus,
    restMinutes,
    restStatus,
    preferredProps,
    defaultLayer,
    excludeDaysWindow,
    targetGroupId: nonEmptyString(req.targetGroupId),
    maxCandidates,
    seedSteps,
    isPartialSeedScan,
    rawNodesScanned,
    maxDepthObserved,
    cycleDetectedCount,
    depthExceededCount,
    itemLimitExceededCount,
    scanLimitExceeded,
    skippedMalformedCount,
    unknownExerciseIds,
    unverifiableExerciseIds,
    adapterIssues,
    rawTargetMinutes: toPresetSuggestionDiagnosticValue(rawTargetMinutes),
    rawRestMinutes: toPresetSuggestionDiagnosticValue(rawRestMinutes),
    rawApparatus: toPresetSuggestionDiagnosticValue(rawApparatus),
    rawTheme: toPresetSuggestionDiagnosticValue(rawTheme),
  });
}
