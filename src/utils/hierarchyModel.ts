import { getExerciseEquipment } from '../data/equipmentCatalog';
import {
  classBlockSnapshotSchema,
  movementSnapshotSchema,
  reusableBlockSchema,
  sequenceSourceProvenanceSchema,
} from '../schemas/hierarchySchema';
import type {
  ClassBlockSnapshot,
  ClassSequenceSnapshot,
  DraftClassLinkOverrides,
  HierarchyPilatesExercise,
  HumanMovementDraft,
  MovementSafetyAndEfficacyBoundary,
  MovementSnapshot,
  MovementUnitSummary,
  ReusableBlock,
  ReusableBlockItem,
  SequenceSourceProvenance,
} from '../types/hierarchy';
import type {
  ApparatusType,
  ClassBlockCategory,
  DifficultyLevel,
  LayerMode,
  PilatesExercise,
  SequenceStep,
  StepSideMode,
} from '../types/pilates';
import type { ClassSectionRole } from '../types/sequenceMotion';
import { isExerciseAutoEligible } from './exerciseReview';
import { getStepTiming, isRestStep } from './sequenceEngine';

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      deepFreeze(item);
    }
    return Object.freeze(value);
  }
  for (const key of Object.keys(value as Record<string, unknown>)) {
    const child = (value as Record<string, unknown>)[key];
    if (child !== null && typeof child === 'object') {
      deepFreeze(child);
    }
  }
  return Object.freeze(value);
}

function levelToScore(level: DifficultyLevel): number {
  switch (level) {
    case '2.0':
      return 3;
    case '1.5':
      return 2;
    case '1.0':
    default:
      return 1;
  }
}

function scoreToLevel(score: number): DifficultyLevel {
  if (score >= 3) return '2.0';
  if (score >= 2) return '1.5';
  return '1.0';
}

function defaultBlockCategoryForSection(sectionRole?: ClassSectionRole): ClassBlockCategory {
  if (sectionRole === 'preparation') return 'warmup';
  if (sectionRole === 'cooldown') return 'cooldown';
  return 'core';
}

const DEFAULT_HUMAN_DRAFT_SAFETY_BOUNDARY: MovementSafetyAndEfficacyBoundary = {
  originType: 'instructor-created-draft',
  evaluationBasis: 'subjective-instructor-feel',
  aiSafetyGuaranteed: false,
  objectiveEfficacyClaimed: false,
  expertVerified: false,
  disclaimerKo:
    '강사가 직접 구상·시도하며 기록한 주관적 초안이며, 객관적 효과나 AI/전문가 안전성 보증을 의미하지 않습니다.',
};

function evaluateHumanDraftLinkGuidance(
  draft: HumanMovementDraft,
  overrides?: DraftClassLinkOverrides,
): {
  missingRecommendedFields: Array<'apparatus' | 'durationMin' | 'sectionRole' | 'sideMode'>;
  guidanceNoticesKo: string[];
} {
  const missingRecommendedFields: Array<'apparatus' | 'durationMin' | 'sectionRole' | 'sideMode'> =
    [];
  const guidanceNoticesKo: string[] = [];

  if (!overrides?.apparatus && !draft.apparatus) {
    missingRecommendedFields.push('apparatus');
    guidanceNoticesKo.push(
      '기구(apparatus)가 아직 지정되지 않아 기본값(매트)으로 연결했습니다. 추후 실제 사용 기구로 수정할 수 있습니다.',
    );
  }

  if (overrides?.durationMin === undefined && draft.defaultDurationMin === undefined) {
    missingRecommendedFields.push('durationMin');
    guidanceNoticesKo.push(
      '수행 시간(durationMin)이 미정이어서 기본 시간(4분)으로 배정했습니다. 수업 흐름에 맞춰 조정해 주세요.',
    );
  }

  if (
    !overrides?.sectionRole &&
    !draft.sectionRole &&
    !overrides?.blockCategory &&
    !draft.blockCategory
  ) {
    missingRecommendedFields.push('sectionRole');
    guidanceNoticesKo.push(
      '수업 구간 역할( 준비 / 메인 / 쿨다운 )이 미정이어서 기본 구간으로 배치했습니다.',
    );
  }

  if (
    !overrides?.sideMode &&
    !draft.sideMode &&
    overrides?.isUnilateral === undefined &&
    draft.isUnilateral === undefined
  ) {
    missingRecommendedFields.push('sideMode');
    guidanceNoticesKo.push(
      '좌우 구분(편측/양측)이 아직 기록되지 않아 양쪽 함께(together) 기본값으로 설정했습니다.',
    );
  }

  if (draft.completenessStage === 'idea-only' && guidanceNoticesKo.length === 0) {
    guidanceNoticesKo.push(
      '한 줄 아이디어 단계의 초안이 연결되었습니다. 직접 해본 느낌과 수정할 점을 추후 보완할 수 있습니다.',
    );
  }

  return { missingRecommendedFields, guidanceNoticesKo };
}

export function createHumanDraftMovementSnapshot(
  draft: HumanMovementDraft,
  overrides?: DraftClassLinkOverrides,
  capturedAt?: string,
): MovementSnapshot {
  const timestamp = capturedAt ?? new Date().toISOString();
  const apparatus: ApparatusType = overrides?.apparatus ?? draft.apparatus ?? 'mat';
  const sectionRole: ClassSectionRole =
    overrides?.sectionRole ??
    draft.sectionRole ??
    (draft.blockCategory ? getMovementSectionRole(draft.blockCategory) : 'main');
  const blockCategory: ClassBlockCategory =
    overrides?.blockCategory ?? draft.blockCategory ?? defaultBlockCategoryForSection(sectionRole);
  const level: DifficultyLevel = overrides?.level ?? draft.level ?? '1.0';
  const defaultDurationMin = overrides?.durationMin ?? draft.defaultDurationMin ?? 4;
  const defaultRepetitions = overrides?.repetitions ?? draft.defaultRepetitions;
  const defaultSets = overrides?.sets ?? draft.defaultSets;
  const isUnilateral = overrides?.isUnilateral ?? draft.isUnilateral ?? false;
  const nameKo =
    overrides?.workingNameKo?.trim() || draft.workingNameKo?.trim() || draft.ideaLine.trim();
  const requiredEquipment =
    draft.requiredEquipment && draft.requiredEquipment.length > 0
      ? [...draft.requiredEquipment]
      : [apparatus];

  const rawSnapshot: MovementSnapshot = {
    id: draft.id,
    nameKo,
    nameEn: draft.workingNameKo?.trim() || draft.ideaLine.trim(),
    apparatus,
    requiredEquipment,
    movementFamily: `human-draft-${draft.id}`,
    blockCategory,
    level,
    defaultDurationMin,
    defaultRepetitions,
    defaultSets,
    isUnilateral,
    springs: overrides?.springs ?? draft.springs ?? '',
    box: draft.box ?? 'none',
    footbar: draft.footbar ?? 'none',
    headrest: draft.headrest ?? 'flat',
    props: draft.props && draft.props.length > 0 ? [...draft.props] : ['none'],
    spinalPlanes:
      draft.spinalPlanes && draft.spinalPlanes.length > 0 ? [...draft.spinalPlanes] : ['neutral'],
    bodyPosition: draft.bodyPosition ?? 'supine',
    targetMuscles: draft.targetMuscles ? [...draft.targetMuscles] : [],
    breathPattern: draft.breathPattern ?? '',
    cues: draft.cues && draft.cues.length > 0 ? [...draft.cues] : [draft.ideaLine],
    precautions: draft.precautions ?? '',
    layers: {
      easy: draft.layers?.easy ?? draft.ideaLine,
      standard: draft.layers?.standard ?? draft.ideaLine,
      hard: draft.layers?.hard ?? draft.ideaLine,
    },
    capturedAt: timestamp,
    sourceOrigin: 'human-created',
    humanDraftId: draft.id,
    humanDraftRevision: draft.revision,
    ideaLineSnapshot: draft.ideaLine,
    feelLogsSnapshot: draft.feelLogs.map((log) => structuredClone(log)),
    modificationLogsSnapshot: draft.modificationLogs.map((log) => structuredClone(log)),
    photoReferencesSnapshot: draft.photoReferences.map((ref) => structuredClone(ref)),
    safetyBoundarySnapshot: structuredClone(
      draft.safetyBoundary ?? DEFAULT_HUMAN_DRAFT_SAFETY_BOUNDARY,
    ),
  };

  const validated = movementSnapshotSchema.parse(rawSnapshot) as MovementSnapshot;
  return deepFreeze(validated);
}

function deriveBlockApparatusAndLevel(
  items: readonly ReusableBlockItem[],
  exercises?: readonly PilatesExercise[],
  fallbackApparatus: ApparatusType | 'mixed' = 'reformer',
  fallbackLevel: DifficultyLevel = '1.0',
  humanDrafts?: readonly HumanMovementDraft[],
): { apparatus: ApparatusType | 'mixed'; level: DifficultyLevel } {
  const exerciseMap = exercises ? new Map(exercises.map((ex) => [ex.id, ex])) : undefined;
  const draftMap = humanDrafts ? new Map(humanDrafts.map((d) => [d.id, d])) : undefined;

  const resolved = items
    .map((item) => {
      if (item.exerciseSnapshot) return item.exerciseSnapshot;
      const ex = exerciseMap?.get(item.exerciseId);
      if (ex) return ex;
      const draft = draftMap?.get(item.humanDraftId ?? item.exerciseId);
      if (draft) {
        return {
          apparatus: draft.apparatus ?? ('mat' as ApparatusType),
          level: draft.level ?? ('1.0' as DifficultyLevel),
        };
      }
      return undefined;
    })
    .filter((ex): ex is { apparatus: ApparatusType; level: DifficultyLevel } => ex !== undefined);

  if (resolved.length === 0) {
    return { apparatus: fallbackApparatus, level: fallbackLevel };
  }

  const distinctApparatus = new Set(resolved.map((ex) => ex.apparatus));
  const apparatus: ApparatusType | 'mixed' =
    distinctApparatus.size === 1 ? resolved[0].apparatus : 'mixed';
  const maxScore = Math.max(...resolved.map((ex) => levelToScore(ex.level)));
  const level = scoreToLevel(maxScore);

  return { apparatus, level };
}

function cloneSequenceStep(step: SequenceStep): SequenceStep {
  return {
    ...step,
    motionStudy: step.motionStudy ? structuredClone(step.motionStudy) : undefined,
    exerciseSnapshot: step.exerciseSnapshot
      ? deepFreeze(structuredClone(step.exerciseSnapshot))
      : undefined,
  };
}

function renumberSteps(steps: readonly SequenceStep[]): SequenceStep[] {
  return steps.map((step, index) => ({
    ...cloneSequenceStep(step),
    order: index + 1,
  }));
}

/**
 * Tier 1 — Movement (동작) unit management
 */
export function getMovementSectionRole(category: ClassBlockCategory): ClassSectionRole {
  if (category === 'warmup') return 'preparation';
  if (category === 'cooldown') return 'cooldown';
  return 'main';
}

export function getMovementUnitSummary(exercise: HierarchyPilatesExercise): MovementUnitSummary {
  const { requiredEquipment } = getExerciseEquipment(exercise);
  return {
    id: exercise.id,
    nameKo: exercise.nameKo,
    nameEn: exercise.nameEn,
    apparatus: exercise.apparatus,
    requiredEquipment: [...requiredEquipment],
    defaultDurationMin: exercise.defaultDurationMin,
    defaultRepetitions: exercise.defaultRepetitions ?? (exercise.isUnilateral ? 6 : 8),
    defaultSets: exercise.defaultSets ?? 2,
    isUnilateral: exercise.isUnilateral,
    level: exercise.level,
    blockCategory: exercise.blockCategory,
    sectionRole: getMovementSectionRole(exercise.blockCategory),
    props: [...exercise.props],
    springs: exercise.springs,
    isApproved: isExerciseAutoEligible(exercise),
    sourceOrigin: exercise.humanDraftId ? 'human-created' : 'catalog',
    humanDraftRevision: exercise.humanDraftRevision,
  };
}

export function assertKnownCatalogMovement(
  exerciseId: string,
  exercises: readonly HierarchyPilatesExercise[],
): HierarchyPilatesExercise {
  const found = exercises.find((ex) => ex.id === exerciseId);
  if (!found) {
    throw new Error(`등록되지 않은 동작 ID입니다: ${exerciseId}`);
  }
  return found;
}

export function createMovementSnapshot(
  exercise: HierarchyPilatesExercise,
  capturedAt?: string,
): MovementSnapshot {
  const timestamp = capturedAt ?? new Date().toISOString();
  const requiredEquipment =
    exercise.requiredEquipment && exercise.requiredEquipment.length > 0
      ? [...exercise.requiredEquipment]
      : [...getExerciseEquipment(exercise).requiredEquipment];

  const rawSnapshot: MovementSnapshot = {
    id: exercise.id,
    nameKo: exercise.nameKo,
    nameEn: exercise.nameEn,
    apparatus: exercise.apparatus,
    requiredEquipment,
    movementFamily: exercise.movementFamily,
    blockCategory: exercise.blockCategory,
    level: exercise.level,
    defaultDurationMin: exercise.defaultDurationMin,
    defaultRepetitions: exercise.defaultRepetitions,
    defaultSets: exercise.defaultSets,
    isUnilateral: exercise.isUnilateral,
    springs: exercise.springs,
    box: exercise.box,
    footbar: exercise.footbar,
    headrest: exercise.headrest,
    props: [...exercise.props],
    spinalPlanes: [...exercise.spinalPlanes],
    bodyPosition: exercise.bodyPosition,
    targetMuscles: [...exercise.targetMuscles],
    breathPattern: exercise.breathPattern,
    cues: [...exercise.cues],
    precautions: exercise.precautions,
    layers: {
      easy: exercise.layers.easy,
      standard: exercise.layers.standard,
      hard: exercise.layers.hard,
    },
    capturedAt: timestamp,
    sourceOrigin: exercise.humanDraftId ? 'human-created' : 'catalog',
    humanDraftId: exercise.humanDraftId,
    humanDraftRevision: exercise.humanDraftRevision,
  };

  const validated = movementSnapshotSchema.parse(rawSnapshot) as MovementSnapshot;
  return deepFreeze(validated);
}

export function resolveCatalogOrHumanMovement(
  exerciseId: string,
  exercises: readonly HierarchyPilatesExercise[],
  humanDrafts?: readonly HumanMovementDraft[],
  existingSnapshot?: MovementSnapshot,
  capturedAt?: string,
): {
  id: string;
  nameKo: string;
  apparatus: ApparatusType;
  blockCategory: ClassBlockCategory;
  sectionRole: ClassSectionRole;
  level: DifficultyLevel;
  defaultDurationMin: number;
  defaultRepetitions?: number;
  defaultSets?: number;
  isUnilateral: boolean;
  sideMode: StepSideMode;
  snapshot: MovementSnapshot;
  humanDraftId?: string;
  humanDraftRevision?: number;
  sourceOrigin: 'catalog' | 'human-created';
} {
  const matchedDraft = humanDrafts?.find((draft) => draft.id === exerciseId);
  if (matchedDraft) {
    const snapshot = createHumanDraftMovementSnapshot(matchedDraft, undefined, capturedAt);
    const sectionRole =
      matchedDraft.sectionRole ?? getMovementSectionRole(snapshot.blockCategory);
    return {
      id: matchedDraft.id,
      nameKo: snapshot.nameKo,
      apparatus: snapshot.apparatus,
      blockCategory: snapshot.blockCategory,
      sectionRole,
      level: snapshot.level,
      defaultDurationMin: snapshot.defaultDurationMin,
      defaultRepetitions: snapshot.defaultRepetitions,
      defaultSets: snapshot.defaultSets,
      isUnilateral: snapshot.isUnilateral,
      sideMode: matchedDraft.sideMode ?? (snapshot.isUnilateral ? 'left-then-right' : 'together'),
      snapshot,
      humanDraftId: matchedDraft.id,
      humanDraftRevision: matchedDraft.revision,
      sourceOrigin: 'human-created',
    };
  }

  const catalogEx = exercises.find((ex) => ex.id === exerciseId);
  if (catalogEx) {
    const snapshot = createMovementSnapshot(catalogEx, capturedAt);
    return {
      id: catalogEx.id,
      nameKo: catalogEx.nameKo,
      apparatus: catalogEx.apparatus,
      blockCategory: catalogEx.blockCategory,
      sectionRole: getMovementSectionRole(catalogEx.blockCategory),
      level: catalogEx.level,
      defaultDurationMin: catalogEx.defaultDurationMin,
      defaultRepetitions: catalogEx.defaultRepetitions,
      defaultSets: catalogEx.defaultSets,
      isUnilateral: catalogEx.isUnilateral,
      sideMode: catalogEx.isUnilateral ? 'left-then-right' : 'together',
      snapshot,
      humanDraftId: catalogEx.humanDraftId,
      humanDraftRevision: catalogEx.humanDraftRevision,
      sourceOrigin: catalogEx.humanDraftId ? 'human-created' : 'catalog',
    };
  }

  if (existingSnapshot) {
    const frozenExisting = deepFreeze(
      movementSnapshotSchema.parse({
        ...structuredClone(existingSnapshot),
        capturedAt: existingSnapshot.capturedAt || capturedAt || new Date().toISOString(),
      }) as MovementSnapshot,
    );
    return {
      id: frozenExisting.id,
      nameKo: frozenExisting.nameKo,
      apparatus: frozenExisting.apparatus,
      blockCategory: frozenExisting.blockCategory,
      sectionRole: getMovementSectionRole(frozenExisting.blockCategory),
      level: frozenExisting.level,
      defaultDurationMin: frozenExisting.defaultDurationMin,
      defaultRepetitions: frozenExisting.defaultRepetitions,
      defaultSets: frozenExisting.defaultSets,
      isUnilateral: frozenExisting.isUnilateral,
      sideMode: frozenExisting.isUnilateral ? 'left-then-right' : 'together',
      snapshot: frozenExisting,
      humanDraftId: frozenExisting.humanDraftId,
      humanDraftRevision: frozenExisting.humanDraftRevision,
      sourceOrigin: frozenExisting.sourceOrigin ?? 'catalog',
    };
  }

  const fallbackCatalog = assertKnownCatalogMovement(exerciseId, exercises);
  const snapshot = createMovementSnapshot(fallbackCatalog, capturedAt);
  return {
    id: fallbackCatalog.id,
    nameKo: fallbackCatalog.nameKo,
    apparatus: fallbackCatalog.apparatus,
    blockCategory: fallbackCatalog.blockCategory,
    sectionRole: getMovementSectionRole(fallbackCatalog.blockCategory),
    level: fallbackCatalog.level,
    defaultDurationMin: fallbackCatalog.defaultDurationMin,
    defaultRepetitions: fallbackCatalog.defaultRepetitions,
    defaultSets: fallbackCatalog.defaultSets,
    isUnilateral: fallbackCatalog.isUnilateral,
    sideMode: fallbackCatalog.isUnilateral ? 'left-then-right' : 'together',
    snapshot,
    sourceOrigin: 'catalog',
  };
}

export function resolveStepMovement(
  step: SequenceStep,
  exercises: readonly PilatesExercise[],
  humanDrafts?: readonly HumanMovementDraft[],
): MovementSnapshot | PilatesExercise | undefined {
  if (isRestStep(step)) return undefined;
  if (step.exerciseSnapshot) return step.exerciseSnapshot;
  const catalogMatch = exercises.find((ex) => ex.id === step.exerciseId);
  if (catalogMatch) return catalogMatch;
  const draftId = step.humanDraftId ?? step.exerciseId;
  const draftMatch = humanDrafts?.find((draft) => draft.id === draftId);
  if (draftMatch) {
    return createHumanDraftMovementSnapshot(draftMatch);
  }
  return undefined;
}

/**
 * Tier 2 — Reusable Block (재사용 블록) template & isolated sequence-instance operations
 */
export function createReusableBlock(
  input: {
    id?: string;
    title: string;
    description?: string;
    sectionRole: ClassSectionRole;
    items: Array<{
      itemId?: string;
      exerciseId: string;
      blockCategory?: ClassBlockCategory;
      durationMin?: number;
      explanationSec?: number;
      transitionSec?: number;
      repetitions?: number;
      sets?: number;
      sideMode?: StepSideMode;
      selectedLayer?: LayerMode;
      customSpringOverride?: string;
      instructorNote?: string;
      exerciseSnapshot?: MovementSnapshot;
      humanDraftId?: string;
      humanDraftRevision?: number;
    }>;
    now?: string;
    humanDrafts?: readonly HumanMovementDraft[];
  },
  exercises: readonly PilatesExercise[],
  humanDrafts?: readonly HumanMovementDraft[],
): ReusableBlock {
  const timestamp = input.now ?? new Date().toISOString();
  const blockId =
    input.id?.trim() || `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const effectiveDrafts = humanDrafts ?? input.humanDrafts;

  const items: ReusableBlockItem[] = input.items.map((item, index) => {
    const resolved = resolveCatalogOrHumanMovement(
      item.humanDraftId ?? item.exerciseId,
      exercises,
      effectiveDrafts,
      item.exerciseSnapshot,
      timestamp,
    );
    return {
      itemId: item.itemId?.trim() || `${blockId}-item-${index + 1}`,
      order: index + 1,
      exerciseId: resolved.id,
      blockCategory: item.blockCategory ?? resolved.blockCategory,
      durationMin: item.durationMin ?? resolved.defaultDurationMin,
      explanationSec: item.explanationSec,
      transitionSec: item.transitionSec,
      repetitions: item.repetitions ?? resolved.defaultRepetitions,
      sets: item.sets ?? resolved.defaultSets,
      sideMode: item.sideMode ?? resolved.sideMode,
      selectedLayer: item.selectedLayer ?? 'standard',
      customSpringOverride: item.customSpringOverride,
      instructorNote: item.instructorNote,
      exerciseSnapshot: resolved.snapshot,
      humanDraftId: resolved.humanDraftId ?? item.humanDraftId,
      humanDraftRevision: resolved.humanDraftRevision ?? item.humanDraftRevision,
    };
  });

  const { apparatus, level } = deriveBlockApparatusAndLevel(
    items,
    exercises,
    'reformer',
    '1.0',
    effectiveDrafts,
  );

  const candidate: ReusableBlock = {
    id: blockId,
    title: input.title.trim(),
    description: input.description,
    sectionRole: input.sectionRole,
    apparatus,
    level,
    items,
    version: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const parsed = reusableBlockSchema.parse(candidate) as ReusableBlock;
  return {
    ...parsed,
    items: parsed.items.map((item) => ({
      ...item,
      exerciseSnapshot: item.exerciseSnapshot ? deepFreeze(item.exerciseSnapshot) : undefined,
    })),
  };
}

export function createReusableBlockFromSteps(
  input: {
    id?: string;
    title: string;
    description?: string;
    sectionRole?: ClassSectionRole;
    steps: readonly SequenceStep[];
    now?: string;
    humanDrafts?: readonly HumanMovementDraft[];
  },
  exercises: readonly PilatesExercise[],
  humanDrafts?: readonly HumanMovementDraft[],
): ReusableBlock {
  const nonRestSteps = input.steps.filter((step) => !isRestStep(step));
  if (nonRestSteps.length === 0) {
    throw new Error('재사용 블록에는 최소 1개 이상의 동작이 포함되어야 합니다.');
  }

  const firstStep = nonRestSteps[0];
  const sectionRole =
    input.sectionRole ??
    firstStep.classSection ??
    getMovementSectionRole(firstStep.blockCategory);

  return createReusableBlock(
    {
      id: input.id,
      title: input.title,
      description: input.description,
      sectionRole,
      now: input.now,
      humanDrafts: humanDrafts ?? input.humanDrafts,
      items: nonRestSteps.map((step) => ({
        exerciseId: step.exerciseId,
        blockCategory: step.blockCategory,
        durationMin: step.durationMin,
        explanationSec: step.explanationSec,
        transitionSec: step.transitionSec,
        repetitions: step.repetitions,
        sets: step.sets,
        sideMode: step.sideMode,
        selectedLayer: step.selectedLayer,
        customSpringOverride: step.customSpringOverride,
        instructorNote: step.instructorNote,
        exerciseSnapshot: step.exerciseSnapshot,
        humanDraftId: step.humanDraftId,
        humanDraftRevision: step.humanDraftRevision,
      })),
    },
    exercises,
    humanDrafts ?? input.humanDrafts,
  );
}

function cloneReusableBlock(block: ReusableBlock): ReusableBlock {
  return {
    ...block,
    items: block.items.map((item, idx) => ({
      ...item,
      order: idx + 1,
      exerciseSnapshot: item.exerciseSnapshot
        ? deepFreeze(structuredClone(item.exerciseSnapshot))
        : undefined,
    })),
  };
}

export function addReusableBlockToLibrary(
  blocks: readonly ReusableBlock[],
  block: ReusableBlock,
): ReusableBlock[] {
  const parsed = reusableBlockSchema.parse(block) as ReusableBlock;
  const cloned = cloneReusableBlock(parsed);
  const existingIdx = blocks.findIndex((item) => item.id === cloned.id);
  if (existingIdx >= 0) {
    return blocks.map((item, idx) => (idx === existingIdx ? cloned : cloneReusableBlock(item)));
  }
  return [...blocks.map(cloneReusableBlock), cloned];
}

export function deleteReusableBlockFromLibrary(
  blocks: readonly ReusableBlock[],
  blockId: string,
): ReusableBlock[] {
  return blocks.filter((block) => block.id !== blockId).map(cloneReusableBlock);
}

export function duplicateReusableBlockInLibrary(
  blocks: readonly ReusableBlock[],
  blockId: string,
  now?: string,
): { blocks: ReusableBlock[]; duplicated: ReusableBlock } {
  const source = blocks.find((block) => block.id === blockId);
  if (!source) {
    throw new Error(`복제할 재사용 블록을 찾을 수 없습니다: ${blockId}`);
  }
  const timestamp = now ?? new Date().toISOString();
  const newBlockId = `${source.id}-copy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const duplicatedItems: ReusableBlockItem[] = source.items.map((item, index) => ({
    ...item,
    itemId: `${newBlockId}-item-${index + 1}`,
    order: index + 1,
    exerciseSnapshot: item.exerciseSnapshot
      ? deepFreeze(structuredClone(item.exerciseSnapshot))
      : undefined,
  }));

  const duplicatedCandidate: ReusableBlock = {
    ...source,
    id: newBlockId,
    title: `${source.title} (복사본)`,
    items: duplicatedItems,
    version: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const parsed = reusableBlockSchema.parse(duplicatedCandidate) as ReusableBlock;
  const duplicated = cloneReusableBlock(parsed);

  return {
    blocks: [...blocks.map(cloneReusableBlock), duplicated],
    duplicated,
  };
}

export function updateReusableBlockTemplate(
  blocks: readonly ReusableBlock[],
  blockId: string,
  patch: {
    title?: string;
    description?: string;
    sectionRole?: ClassSectionRole;
    items?: ReusableBlockItem[];
    humanDrafts?: readonly HumanMovementDraft[];
  },
  exercises: readonly PilatesExercise[],
  nowOrHumanDrafts?: string | readonly HumanMovementDraft[],
  humanDrafts?: readonly HumanMovementDraft[],
): ReusableBlock[] {
  const targetIndex = blocks.findIndex((block) => block.id === blockId);
  if (targetIndex < 0) {
    throw new Error(`수정할 재사용 블록을 찾을 수 없습니다: ${blockId}`);
  }

  const current = blocks[targetIndex];
  const timestamp =
    typeof nowOrHumanDrafts === 'string' ? nowOrHumanDrafts : new Date().toISOString();
  const effectiveDrafts = Array.isArray(nowOrHumanDrafts)
    ? nowOrHumanDrafts
    : (humanDrafts ?? patch.humanDrafts);
  const rawItems = patch.items ?? current.items;

  const normalizedItems: ReusableBlockItem[] = rawItems.map((item, index) => {
    const resolved = resolveCatalogOrHumanMovement(
      item.humanDraftId ?? item.exerciseId,
      exercises,
      effectiveDrafts,
      item.exerciseSnapshot,
      timestamp,
    );
    return {
      ...item,
      itemId: item.itemId?.trim() || `${current.id}-item-${current.version + 1}-${index + 1}`,
      order: index + 1,
      exerciseId: resolved.id,
      blockCategory: item.blockCategory ?? resolved.blockCategory,
      durationMin: item.durationMin ?? resolved.defaultDurationMin,
      selectedLayer: item.selectedLayer ?? 'standard',
      sideMode: item.sideMode ?? resolved.sideMode,
      exerciseSnapshot: resolved.snapshot,
      humanDraftId: resolved.humanDraftId ?? item.humanDraftId,
      humanDraftRevision: resolved.humanDraftRevision ?? item.humanDraftRevision,
    };
  });

  const { apparatus, level } = deriveBlockApparatusAndLevel(
    normalizedItems,
    exercises,
    current.apparatus,
    current.level,
    effectiveDrafts,
  );

  const updatedCandidate: ReusableBlock = {
    ...current,
    title: patch.title !== undefined ? patch.title.trim() : current.title,
    description: patch.description !== undefined ? patch.description : current.description,
    sectionRole: patch.sectionRole ?? current.sectionRole,
    apparatus,
    level,
    items: normalizedItems,
    version: current.version + 1,
    updatedAt: timestamp,
  };

  const parsed = reusableBlockSchema.parse(updatedCandidate) as ReusableBlock;
  const updatedBlock = cloneReusableBlock(parsed);

  return blocks.map((block, index) =>
    index === targetIndex ? updatedBlock : cloneReusableBlock(block),
  );
}

export function addItemToReusableBlock(
  block: ReusableBlock,
  itemInput: {
    exerciseId: string;
    durationMin?: number;
    selectedLayer?: LayerMode;
    sideMode?: StepSideMode;
    repetitions?: number;
    sets?: number;
    explanationSec?: number;
    transitionSec?: number;
    instructorNote?: string;
    exerciseSnapshot?: MovementSnapshot;
    humanDraftId?: string;
    humanDraftRevision?: number;
    humanDrafts?: readonly HumanMovementDraft[];
  },
  exercises: readonly PilatesExercise[],
  nowOrHumanDrafts?: string | readonly HumanMovementDraft[],
  humanDrafts?: readonly HumanMovementDraft[],
): ReusableBlock {
  const timestamp =
    typeof nowOrHumanDrafts === 'string' ? nowOrHumanDrafts : new Date().toISOString();
  const effectiveDrafts = Array.isArray(nowOrHumanDrafts)
    ? nowOrHumanDrafts
    : (humanDrafts ?? itemInput.humanDrafts);

  const resolved = resolveCatalogOrHumanMovement(
    itemInput.humanDraftId ?? itemInput.exerciseId,
    exercises,
    effectiveDrafts,
    itemInput.exerciseSnapshot,
    timestamp,
  );
  const nextVersion = block.version + 1;
  const newOrder = block.items.length + 1;

  const newItem: ReusableBlockItem = {
    itemId: `${block.id}-item-v${nextVersion}-${newOrder}`,
    order: newOrder,
    exerciseId: resolved.id,
    blockCategory: resolved.blockCategory,
    durationMin: itemInput.durationMin ?? resolved.defaultDurationMin,
    explanationSec: itemInput.explanationSec,
    transitionSec: itemInput.transitionSec,
    repetitions: itemInput.repetitions ?? resolved.defaultRepetitions,
    sets: itemInput.sets ?? resolved.defaultSets,
    sideMode: itemInput.sideMode ?? resolved.sideMode,
    selectedLayer: itemInput.selectedLayer ?? 'standard',
    instructorNote: itemInput.instructorNote,
    exerciseSnapshot: resolved.snapshot,
    humanDraftId: resolved.humanDraftId ?? itemInput.humanDraftId,
    humanDraftRevision: resolved.humanDraftRevision ?? itemInput.humanDraftRevision,
  };

  const nextItems = [
    ...block.items.map((item, idx) => ({
      ...item,
      order: idx + 1,
      exerciseSnapshot: item.exerciseSnapshot
        ? deepFreeze(structuredClone(item.exerciseSnapshot))
        : undefined,
    })),
    newItem,
  ];

  const { apparatus, level } = deriveBlockApparatusAndLevel(
    nextItems,
    exercises,
    block.apparatus,
    block.level,
    effectiveDrafts,
  );

  const candidate: ReusableBlock = {
    ...block,
    apparatus,
    level,
    items: nextItems,
    version: nextVersion,
    updatedAt: timestamp,
  };

  return cloneReusableBlock(reusableBlockSchema.parse(candidate) as ReusableBlock);
}

export function linkHumanDraftToReusableBlock(
  block: ReusableBlock,
  draft: HumanMovementDraft,
  overrides?: DraftClassLinkOverrides,
  now?: string,
): {
  block: ReusableBlock;
  guidanceNoticesKo: string[];
  missingRecommendedFields: Array<'apparatus' | 'durationMin' | 'sectionRole' | 'sideMode'>;
} {
  const timestamp = now ?? new Date().toISOString();
  const { missingRecommendedFields, guidanceNoticesKo } = evaluateHumanDraftLinkGuidance(
    draft,
    overrides,
  );

  const effectiveSectionRole =
    overrides?.sectionRole ?? draft.sectionRole ?? block.sectionRole ?? 'main';
  const snapshot = createHumanDraftMovementSnapshot(
    draft,
    {
      ...overrides,
      sectionRole: effectiveSectionRole,
    },
    timestamp,
  );

  const nextVersion = block.version + 1;
  const newOrder = block.items.length + 1;

  const newItem: ReusableBlockItem = {
    itemId: `${block.id}-item-v${nextVersion}-${newOrder}`,
    order: newOrder,
    exerciseId: draft.id,
    blockCategory: snapshot.blockCategory,
    durationMin: snapshot.defaultDurationMin,
    repetitions: snapshot.defaultRepetitions,
    sets: snapshot.defaultSets,
    sideMode:
      overrides?.sideMode ??
      draft.sideMode ??
      (snapshot.isUnilateral ? 'left-then-right' : 'together'),
    selectedLayer: overrides?.selectedLayer ?? 'standard',
    customSpringOverride: overrides?.springs,
    instructorNote: overrides?.instructorNote,
    exerciseSnapshot: snapshot,
    humanDraftId: draft.id,
    humanDraftRevision: draft.revision,
  };

  const nextItems = [
    ...block.items.map((item, idx) => ({
      ...item,
      order: idx + 1,
      exerciseSnapshot: item.exerciseSnapshot
        ? deepFreeze(structuredClone(item.exerciseSnapshot))
        : undefined,
    })),
    newItem,
  ];

  const { apparatus, level } = deriveBlockApparatusAndLevel(
    nextItems,
    undefined,
    block.apparatus,
    block.level,
    [draft],
  );

  const candidate: ReusableBlock = {
    ...block,
    apparatus,
    level,
    items: nextItems,
    version: nextVersion,
    updatedAt: timestamp,
  };

  const updatedBlock = cloneReusableBlock(reusableBlockSchema.parse(candidate) as ReusableBlock);
  return {
    block: updatedBlock,
    guidanceNoticesKo,
    missingRecommendedFields,
  };
}

export function linkHumanDraftToSequence(
  steps: readonly SequenceStep[],
  draft: HumanMovementDraft,
  options?: {
    overrides?: DraftClassLinkOverrides;
    afterStepIndex?: number;
    now?: string;
  },
): {
  steps: SequenceStep[];
  stepId: string;
  guidanceNoticesKo: string[];
  missingRecommendedFields: Array<'apparatus' | 'durationMin' | 'sectionRole' | 'sideMode'>;
} {
  const timestamp = options?.now ?? new Date().toISOString();
  const overrides = options?.overrides;
  const { missingRecommendedFields, guidanceNoticesKo } = evaluateHumanDraftLinkGuidance(
    draft,
    overrides,
  );

  const snapshot = createHumanDraftMovementSnapshot(draft, overrides, timestamp);
  const classSection: ClassSectionRole =
    overrides?.sectionRole ??
    draft.sectionRole ??
    getMovementSectionRole(snapshot.blockCategory);

  const stepId = `step-human-${draft.id}-r${draft.revision}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const newStep: SequenceStep = {
    kind: 'exercise',
    stepId,
    order: 1,
    blockCategory: snapshot.blockCategory,
    exerciseId: draft.id,
    durationMin: snapshot.defaultDurationMin,
    repetitions: snapshot.defaultRepetitions,
    sets: snapshot.defaultSets,
    sideMode:
      overrides?.sideMode ??
      draft.sideMode ??
      (snapshot.isUnilateral ? 'left-then-right' : 'together'),
    selectedLayer: overrides?.selectedLayer ?? 'standard',
    customSpringOverride: overrides?.springs,
    instructorNote: overrides?.instructorNote,
    classSection,
    humanDraftId: draft.id,
    humanDraftRevision: draft.revision,
    exerciseSnapshot: snapshot,
  };

  const clonedExisting = steps.map(cloneSequenceStep);
  const insertAt =
    options?.afterStepIndex === undefined
      ? clonedExisting.length
      : options.afterStepIndex < 0
        ? 0
        : Math.min(clonedExisting.length, options.afterStepIndex + 1);

  const combined = [
    ...clonedExisting.slice(0, insertAt),
    newStep,
    ...clonedExisting.slice(insertAt),
  ];

  return {
    steps: renumberSteps(combined),
    stepId,
    guidanceNoticesKo,
    missingRecommendedFields,
  };
}

export function removeItemFromReusableBlock(
  block: ReusableBlock,
  itemIndex: number,
  now?: string,
): ReusableBlock {
  if (itemIndex < 0 || itemIndex >= block.items.length) {
    throw new Error(`유효하지 않은 블록 항목 인덱스입니다: ${itemIndex}`);
  }
  if (block.items.length <= 1) {
    throw new Error('재사용 블록에는 최소 1개 이상의 동작이 포함되어야 합니다.');
  }

  const timestamp = now ?? new Date().toISOString();
  const nextItems = block.items
    .filter((_, idx) => idx !== itemIndex)
    .map((item, idx) => ({
      ...item,
      order: idx + 1,
      exerciseSnapshot: item.exerciseSnapshot
        ? deepFreeze(structuredClone(item.exerciseSnapshot))
        : undefined,
    }));

  const { apparatus, level } = deriveBlockApparatusAndLevel(
    nextItems,
    undefined,
    block.apparatus,
    block.level,
  );

  const candidate: ReusableBlock = {
    ...block,
    apparatus,
    level,
    items: nextItems,
    version: block.version + 1,
    updatedAt: timestamp,
  };

  return cloneReusableBlock(reusableBlockSchema.parse(candidate) as ReusableBlock);
}

export function moveItemInReusableBlock(
  block: ReusableBlock,
  itemIndex: number,
  direction: 'up' | 'down',
  now?: string,
): ReusableBlock {
  if (itemIndex < 0 || itemIndex >= block.items.length) {
    throw new Error(`유효하지 않은 블록 항목 인덱스입니다: ${itemIndex}`);
  }

  const timestamp = now ?? new Date().toISOString();
  const targetIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
  const clonedItems = block.items.map((item) => ({
    ...item,
    exerciseSnapshot: item.exerciseSnapshot
      ? deepFreeze(structuredClone(item.exerciseSnapshot))
      : undefined,
  }));

  if (targetIndex >= 0 && targetIndex < clonedItems.length) {
    const temp = clonedItems[itemIndex];
    clonedItems[itemIndex] = clonedItems[targetIndex];
    clonedItems[targetIndex] = temp;
  }

  const nextItems = clonedItems.map((item, idx) => ({
    ...item,
    order: idx + 1,
  }));

  const candidate: ReusableBlock = {
    ...block,
    items: nextItems,
    version: block.version + 1,
    updatedAt: timestamp,
  };

  return cloneReusableBlock(reusableBlockSchema.parse(candidate) as ReusableBlock);
}

export function adjustReusableBlockItemDuration(
  block: ReusableBlock,
  itemIndex: number,
  durationMin: number,
  now?: string,
): ReusableBlock {
  if (itemIndex < 0 || itemIndex >= block.items.length) {
    throw new Error(`유효하지 않은 블록 항목 인덱스입니다: ${itemIndex}`);
  }
  if (!Number.isFinite(durationMin) || durationMin < 0.5 || durationMin > 20) {
    throw new Error('블록 동작 시간은 0.5분 이상 20분 이하로 입력해 주세요.');
  }

  const timestamp = now ?? new Date().toISOString();
  const nextItems = block.items.map((item, idx) => ({
    ...item,
    order: idx + 1,
    durationMin: idx === itemIndex ? durationMin : item.durationMin,
    exerciseSnapshot: item.exerciseSnapshot
      ? deepFreeze(structuredClone(item.exerciseSnapshot))
      : undefined,
  }));

  const candidate: ReusableBlock = {
    ...block,
    items: nextItems,
    version: block.version + 1,
    updatedAt: timestamp,
  };

  return cloneReusableBlock(reusableBlockSchema.parse(candidate) as ReusableBlock);
}

function allocateScaledDurationsMin(
  items: ReadonlyArray<{
    durationMin: number;
    explanationSec?: number;
    transitionSec?: number;
  }>,
  targetTotalMin: number,
): number[] {
  if (!Number.isFinite(targetTotalMin) || targetTotalMin <= 0) {
    throw new Error('목표 총 시간은 0보다 큰 유한한 값이어야 합니다.');
  }
  if (items.length === 0) {
    return [];
  }

  const minSecondsList = items.map((item) =>
    Math.ceil(Math.max(30, (item.explanationSec ?? 0) + (item.transitionSec ?? 0) + 30)),
  );
  const minTotalSec = minSecondsList.reduce((sum, sec) => sum + sec, 0);
  const targetTotalSec = Math.round(targetTotalMin * 60);

  if (targetTotalSec < minTotalSec) {
    throw new Error(
      '목표 시간이 각 동작의 최소 수행 시간(설명·전환 + 30초 또는 최소 30초) 합계보다 작습니다.',
    );
  }

  const maxStepSec = 20 * 60;
  if (targetTotalSec > items.length * maxStepSec) {
    throw new Error('목표 시간이 각 동작의 최대 시간(20분) 합계를 초과합니다.');
  }

  const currentSecs = items.map((item, idx) =>
    Math.max(minSecondsList[idx], Math.round(item.durationMin * 60)),
  );
  const weights = currentSecs.map((sec, idx) => Math.max(1, sec - minSecondsList[idx] + 30));

  const allocatedSec = [...minSecondsList];
  let spare = targetTotalSec - minTotalSec;
  let open = allocatedSec.map((_, idx) => idx).filter((idx) => allocatedSec[idx] < maxStepSec);

  while (spare > 0 && open.length > 0) {
    const weightSum = open.reduce((sum, idx) => sum + weights[idx], 0);
    const capped = open.filter(
      (idx) => (spare * weights[idx]) / weightSum >= maxStepSec - allocatedSec[idx],
    );
    if (capped.length > 0) {
      for (const idx of capped) {
        spare -= maxStepSec - allocatedSec[idx];
        allocatedSec[idx] = maxStepSec;
      }
      open = open.filter((idx) => !capped.includes(idx));
      continue;
    }

    const shares = open.map((idx) => ({
      idx,
      exact: (spare * weights[idx]) / weightSum,
    }));
    for (const { idx, exact } of shares) {
      allocatedSec[idx] += Math.floor(exact);
    }
    let leftover = spare - shares.reduce((sum, { exact }) => sum + Math.floor(exact), 0);
    shares.sort((a, b) => (b.exact % 1) - (a.exact % 1) || a.idx - b.idx);
    for (const { idx } of shares) {
      if (leftover-- <= 0) break;
      allocatedSec[idx] += 1;
    }
    spare = 0;
  }

  const resultMin = allocatedSec.map((sec) => Number((sec / 60).toFixed(6)));
  if (resultMin.length > 0) {
    const sumExceptLast = resultMin
      .slice(0, -1)
      .reduce((sum, duration) => sum + duration, 0);
    const lastMin = Number((targetTotalMin - sumExceptLast).toFixed(6));
    const minLastMin = minSecondsList[resultMin.length - 1] / 60;
    if (lastMin >= minLastMin && lastMin <= 20) {
      resultMin[resultMin.length - 1] = lastMin;
    }
  }

  return resultMin;
}

export function scaleReusableBlockDuration(
  block: ReusableBlock,
  targetTotalMin: number,
  now?: string,
): ReusableBlock {
  const scaledDurations = allocateScaledDurationsMin(block.items, targetTotalMin);
  const timestamp = now ?? new Date().toISOString();

  const nextItems = block.items.map((item, idx) => ({
    ...item,
    order: idx + 1,
    durationMin: scaledDurations[idx],
    exerciseSnapshot: item.exerciseSnapshot
      ? deepFreeze(structuredClone(item.exerciseSnapshot))
      : undefined,
  }));

  const candidate: ReusableBlock = {
    ...block,
    items: nextItems,
    version: block.version + 1,
    updatedAt: timestamp,
  };

  return cloneReusableBlock(reusableBlockSchema.parse(candidate) as ReusableBlock);
}

/**
 * Tier 2 — Sequence-instance operations (operate ONLY on SequenceStep[]; NEVER mutate ReusableBlock templates)
 */
export function insertReusableBlockIntoSequence(
  steps: readonly SequenceStep[],
  block: ReusableBlock,
  options?: {
    afterStepIndex?: number;
    sectionRoleOverride?: ClassSectionRole;
    instanceId?: string;
  },
): { steps: SequenceStep[]; blockInstanceId: string } {
  const blockInstanceId =
    options?.instanceId?.trim() ||
    `block-inst-${block.id}-v${block.version}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const sectionRole = options?.sectionRoleOverride ?? block.sectionRole;

  const sortedItems = [...block.items].sort((a, b) => a.order - b.order);
  const instantiatedSteps: SequenceStep[] = sortedItems.map((item, index) => ({
    kind: 'exercise',
    stepId: `${blockInstanceId}-step-${index + 1}-${item.exerciseId}`,
    order: index + 1,
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
    classSection: sectionRole,
    blockInstanceId,
    sourceBlockId: block.id,
    sourceBlockVersion: block.version,
    sourceBlockTitle: block.title,
    blockInstanceDetached: false,
    humanDraftId: item.humanDraftId ?? item.exerciseSnapshot?.humanDraftId,
    humanDraftRevision: item.humanDraftRevision ?? item.exerciseSnapshot?.humanDraftRevision,
    exerciseSnapshot: item.exerciseSnapshot ? structuredClone(item.exerciseSnapshot) : undefined,
  }));

  const clonedExisting = steps.map(cloneSequenceStep);
  const insertAt =
    options?.afterStepIndex === undefined
      ? clonedExisting.length
      : options.afterStepIndex < 0
        ? 0
        : Math.min(clonedExisting.length, options.afterStepIndex + 1);

  const combined = [
    ...clonedExisting.slice(0, insertAt),
    ...instantiatedSteps,
    ...clonedExisting.slice(insertAt),
  ];

  return {
    steps: renumberSteps(combined),
    blockInstanceId,
  };
}

export function editSequenceStepWithIsolation(
  steps: readonly SequenceStep[],
  stepIndex: number,
  patch: Partial<SequenceStep>,
): SequenceStep[] {
  if (stepIndex < 0 || stepIndex >= steps.length) {
    throw new Error(`유효하지 않은 시퀀스 단계 인덱스입니다: ${stepIndex}`);
  }

  const targetBlockInstanceId = steps[stepIndex].blockInstanceId;
  const nextSteps = steps.map((step, index) => {
    const cloned = cloneSequenceStep(step);
    if (index === stepIndex) {
      const patched: SequenceStep = {
        ...cloned,
        ...patch,
      };
      if (targetBlockInstanceId) {
        patched.blockInstanceDetached = true;
      }
      return patched;
    }
    if (targetBlockInstanceId && cloned.blockInstanceId === targetBlockInstanceId) {
      return {
        ...cloned,
        blockInstanceDetached: true,
      };
    }
    return cloned;
  });

  return renumberSteps(nextSteps);
}

export function duplicateSequenceBlockInstance(
  steps: readonly SequenceStep[],
  blockInstanceId: string,
  newInstanceId?: string,
): { steps: SequenceStep[]; duplicatedInstanceId: string } {
  const instanceIndices = steps
    .map((step, idx) => (step.blockInstanceId === blockInstanceId ? idx : -1))
    .filter((idx) => idx >= 0);

  if (instanceIndices.length === 0) {
    throw new Error(`복제할 블록 인스턴스를 시퀀스에서 찾을 수 없습니다: ${blockInstanceId}`);
  }

  const duplicatedInstanceId =
    newInstanceId?.trim() ||
    `${blockInstanceId}-copy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const duplicatedSteps: SequenceStep[] = instanceIndices.map((stepIdx, itemIdx) => {
    const sourceStep = cloneSequenceStep(steps[stepIdx]);
    return {
      ...sourceStep,
      stepId: `${duplicatedInstanceId}-step-${itemIdx + 1}-${sourceStep.exerciseId}`,
      blockInstanceId: duplicatedInstanceId,
    };
  });

  const lastIndex = instanceIndices[instanceIndices.length - 1];
  const clonedAll = steps.map(cloneSequenceStep);
  const combined = [
    ...clonedAll.slice(0, lastIndex + 1),
    ...duplicatedSteps,
    ...clonedAll.slice(lastIndex + 1),
  ];

  return {
    steps: renumberSteps(combined),
    duplicatedInstanceId,
  };
}

export function removeSequenceBlockInstance(
  steps: readonly SequenceStep[],
  blockInstanceId: string,
): SequenceStep[] {
  const hasInstance = steps.some((step) => step.blockInstanceId === blockInstanceId);
  if (!hasInstance) {
    throw new Error(`삭제할 블록 인스턴스를 시퀀스에서 찾을 수 없습니다: ${blockInstanceId}`);
  }

  const remaining = steps
    .filter((step) => step.blockInstanceId !== blockInstanceId || step.locked === true)
    .map((step) => {
      const cloned = cloneSequenceStep(step);
      if (cloned.blockInstanceId === blockInstanceId) {
        return {
          ...cloned,
          blockInstanceDetached: true,
        };
      }
      return cloned;
    });

  const nonRestRemaining = remaining.filter((step) => !isRestStep(step));
  if (nonRestRemaining.length === 0) {
    throw new Error('시퀀스에는 최소 1개 이상의 동작이 남아 있어야 합니다.');
  }

  return renumberSteps(remaining);
}

export function moveSequenceBlockInstance(
  steps: readonly SequenceStep[],
  blockInstanceId: string,
  direction: 'up' | 'down',
): SequenceStep[] {
  const hasInstance = steps.some((step) => step.blockInstanceId === blockInstanceId);
  if (!hasInstance) {
    throw new Error(`이동할 블록 인스턴스를 시퀀스에서 찾을 수 없습니다: ${blockInstanceId}`);
  }

  const groups: Array<{ instanceId?: string; steps: SequenceStep[] }> = [];
  const targetSteps = steps
    .filter((step) => step.blockInstanceId === blockInstanceId)
    .map(cloneSequenceStep);
  let targetInserted = false;

  for (const step of steps) {
    if (step.blockInstanceId === blockInstanceId) {
      if (!targetInserted) {
        groups.push({ instanceId: blockInstanceId, steps: targetSteps });
        targetInserted = true;
      }
      continue;
    }

    const cloned = cloneSequenceStep(step);
    const prevGroup = groups.at(-1);
    if (
      cloned.blockInstanceId &&
      prevGroup &&
      prevGroup.instanceId === cloned.blockInstanceId
    ) {
      prevGroup.steps.push(cloned);
    } else {
      groups.push({ instanceId: cloned.blockInstanceId, steps: [cloned] });
    }
  }

  const groupIndex = groups.findIndex((group) => group.instanceId === blockInstanceId);
  const swapIndex = direction === 'up' ? groupIndex - 1 : groupIndex + 1;

  if (swapIndex >= 0 && swapIndex < groups.length) {
    const temp = groups[groupIndex];
    groups[groupIndex] = groups[swapIndex];
    groups[swapIndex] = temp;
  }

  return renumberSteps(groups.flatMap((group) => group.steps));
}

export function adjustSequenceBlockInstanceDuration(
  steps: readonly SequenceStep[],
  blockInstanceId: string,
  targetTotalMin: number,
): SequenceStep[] {
  const instanceEntries = steps
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => step.blockInstanceId === blockInstanceId);

  if (instanceEntries.length === 0) {
    throw new Error(`시간을 조정할 블록 인스턴스를 시퀀스에서 찾을 수 없습니다: ${blockInstanceId}`);
  }
  if (!Number.isFinite(targetTotalMin) || targetTotalMin <= 0) {
    throw new Error('블록 목표 시간은 0보다 큰 유한한 값이어야 합니다.');
  }

  const lockedEntries = instanceEntries.filter(({ step }) => Boolean(step.locked));
  const unlockedEntries = instanceEntries.filter(({ step }) => !step.locked);

  if (unlockedEntries.length === 0) {
    throw new Error('블록 인스턴스의 모든 동작이 잠겨 있어 시간을 조정할 수 없습니다.');
  }

  const lockedMin = lockedEntries.reduce((sum, { step }) => sum + step.durationMin, 0);
  const remainingTargetMin = targetTotalMin - lockedMin;

  const allocatedMin = allocateScaledDurationsMin(
    unlockedEntries.map(({ step }) => step),
    remainingTargetMin,
  );
  const allocatedByStepIndex = new Map<number, number>(
    unlockedEntries.map(({ index }, idx) => [index, allocatedMin[idx]]),
  );

  const nextSteps = steps.map((step, index) => {
    const cloned = cloneSequenceStep(step);
    if (cloned.blockInstanceId !== blockInstanceId) {
      return cloned;
    }
    const nextDuration = allocatedByStepIndex.get(index) ?? cloned.durationMin;
    return {
      ...cloned,
      durationMin: nextDuration,
      blockInstanceDetached: true,
    };
  });

  return renumberSteps(nextSteps);
}

/**
 * Tier 4 — Class (수업) immutable snapshot & clone provenance
 */
export function createClassSequenceSnapshot(
  sequence: {
    id: string;
    title: string;
    subtitle: string;
    apparatus: ApparatusType | 'mixed';
    level: DifficultyLevel;
    targetMinutes: number;
    steps: readonly SequenceStep[];
    version?: number;
    updatedAt?: string;
    sourceProvenance?: SequenceSourceProvenance;
    humanDrafts?: readonly HumanMovementDraft[];
  },
  exercises: readonly PilatesExercise[],
  capturedAt?: string,
  humanDrafts?: readonly HumanMovementDraft[],
): ClassSequenceSnapshot {
  const timestamp = capturedAt ?? new Date().toISOString();
  const effectiveDrafts = humanDrafts ?? sequence.humanDrafts;
  const exerciseMap = new Map(exercises.map((ex) => [ex.id, ex]));
  const draftMap = new Map((effectiveDrafts ?? []).map((draft) => [draft.id, draft]));

  const exerciseSnapshots: Record<string, MovementSnapshot> = {};
  const blockGroupMap = new Map<string, ClassBlockSnapshot>();

  let movementSec = 0;
  let explanationSec = 0;
  let transitionSec = 0;
  let restSec = 0;

  const frozenSteps: SequenceStep[] = sequence.steps.map((step, index) => {
    const cloned = cloneSequenceStep(step);
    cloned.order = index + 1;

    if (isRestStep(cloned)) {
      const timing = getStepTiming(cloned);
      restSec += timing.totalSec;
      return deepFreeze(cloned);
    }

    const candidateDraftId =
      cloned.humanDraftId ?? cloned.exerciseSnapshot?.humanDraftId ?? cloned.exerciseId;
    const matchedDraft = draftMap.get(candidateDraftId);
    const catalogEx = exerciseMap.get(cloned.exerciseId);

    let snapshot: MovementSnapshot;
    if (matchedDraft) {
      snapshot = createHumanDraftMovementSnapshot(
        matchedDraft,
        {
          blockCategory: cloned.blockCategory,
          durationMin: cloned.durationMin,
          repetitions: cloned.repetitions,
          sets: cloned.sets,
          sideMode: cloned.sideMode,
          selectedLayer: cloned.selectedLayer,
          springs: cloned.customSpringOverride,
        },
        timestamp,
      );
      cloned.humanDraftId = matchedDraft.id;
      cloned.humanDraftRevision = matchedDraft.revision;
    } else if (
      cloned.exerciseSnapshot &&
      (cloned.exerciseSnapshot.sourceOrigin === 'human-created' ||
        cloned.humanDraftId ||
        !catalogEx)
    ) {
      snapshot = deepFreeze(
        movementSnapshotSchema.parse({
          ...structuredClone(cloned.exerciseSnapshot),
          capturedAt: cloned.exerciseSnapshot.capturedAt || timestamp,
        }) as MovementSnapshot,
      );
      if (snapshot.humanDraftId) {
        cloned.humanDraftId = snapshot.humanDraftId;
      }
      if (snapshot.humanDraftRevision !== undefined) {
        cloned.humanDraftRevision = snapshot.humanDraftRevision;
      }
    } else if (catalogEx) {
      snapshot = createMovementSnapshot(catalogEx, timestamp);
    } else {
      snapshot = createMovementSnapshot(
        assertKnownCatalogMovement(cloned.exerciseId, exercises),
        timestamp,
      );
    }

    cloned.exerciseSnapshot = snapshot;
    exerciseSnapshots[cloned.exerciseId] = snapshot;

    const timing = getStepTiming(cloned);
    movementSec += timing.movementSec;
    explanationSec += timing.explanationSec;
    transitionSec += timing.transitionSec;

    if (cloned.blockInstanceId) {
      const existingBlock = blockGroupMap.get(cloned.blockInstanceId);
      if (existingBlock) {
        existingBlock.stepIds.push(cloned.stepId);
        if (cloned.blockInstanceDetached) {
          existingBlock.detached = true;
        }
      } else {
        const blockSnap: ClassBlockSnapshot = classBlockSnapshotSchema.parse({
          blockInstanceId: cloned.blockInstanceId,
          sourceBlockId: cloned.sourceBlockId ?? cloned.blockInstanceId,
          sourceBlockVersion: cloned.sourceBlockVersion ?? 1,
          sourceBlockTitle: cloned.sourceBlockTitle ?? '재사용 블록',
          detached: Boolean(cloned.blockInstanceDetached),
          stepIds: [cloned.stepId],
        });
        blockGroupMap.set(cloned.blockInstanceId, blockSnap);
      }
    }

    return deepFreeze(cloned);
  });

  const totalSec = movementSec + explanationSec + transitionSec + restSec;
  const blockSnapshots = [...blockGroupMap.values()].map((item) => deepFreeze(item));

  const snapshot: ClassSequenceSnapshot = {
    snapshotId: `snapshot-${sequence.id}-v${sequence.version ?? 1}-${timestamp}`,
    capturedAt: timestamp,
    sourceSequenceId: sequence.id,
    sourceSequenceVersion: sequence.version ?? 1,
    sourceSequenceUpdatedAt: sequence.updatedAt,
    title: sequence.title,
    subtitle: sequence.subtitle,
    apparatus: sequence.apparatus,
    level: sequence.level,
    targetMinutes: sequence.targetMinutes,
    steps: frozenSteps,
    exerciseSnapshots: deepFreeze(exerciseSnapshots),
    blockSnapshots: deepFreeze(blockSnapshots),
    timeBreakdown: deepFreeze({
      movementSec,
      explanationSec,
      transitionSec,
      restSec,
      totalSec,
    }),
    sourceProvenance: sequence.sourceProvenance
      ? deepFreeze(structuredClone(sequence.sourceProvenance))
      : undefined,
  };

  return deepFreeze(snapshot);
}

function reconstructExerciseFromSnapshot(snapshot: MovementSnapshot): HierarchyPilatesExercise {
  return {
    id: snapshot.id,
    nameKo: snapshot.nameKo,
    nameEn: snapshot.nameEn,
    apparatus: snapshot.apparatus,
    requiredEquipment: snapshot.requiredEquipment
      ? [...snapshot.requiredEquipment]
      : [snapshot.apparatus],
    movementFamily: snapshot.movementFamily,
    props: [...snapshot.props],
    blockCategory: snapshot.blockCategory,
    spinalPlanes: [...snapshot.spinalPlanes],
    bodyPosition: snapshot.bodyPosition,
    level: snapshot.level,
    defaultDurationMin: snapshot.defaultDurationMin,
    defaultRepetitions: snapshot.defaultRepetitions,
    defaultSets: snapshot.defaultSets,
    isUnilateral: snapshot.isUnilateral,
    springs: snapshot.springs,
    box: snapshot.box,
    footbar: snapshot.footbar,
    headrest: snapshot.headrest,
    targetMuscles: [...snapshot.targetMuscles],
    breathPattern: snapshot.breathPattern,
    cues: [...snapshot.cues],
    precautions: snapshot.precautions,
    layers: {
      easy: snapshot.layers.easy,
      standard: snapshot.layers.standard,
      hard: snapshot.layers.hard,
    },
    youtube: {
      videoId: '',
      channelName: '스냅샷 복원 동작',
      videoTitle: snapshot.nameKo,
      startSec: 0,
      url: '',
    },
    favoriteTag: 'none',
    isCustom: true,
    createdAt: snapshot.capturedAt,
    humanDraftId: snapshot.humanDraftId,
    humanDraftRevision: snapshot.humanDraftRevision,
  };
}

export function cloneClassSnapshotToDraft(
  snapshot: ClassSequenceSnapshot,
  currentExercises: readonly HierarchyPilatesExercise[],
  options?: {
    sourceKind?: 'history-snapshot' | 'dated-plan-snapshot';
    sourceId?: string;
    sourceTaughtAt?: string;
    now?: string;
  },
): {
  title: string;
  subtitle: string;
  apparatus: ApparatusType | 'mixed';
  level: DifficultyLevel;
  targetMinutes: number;
  steps: SequenceStep[];
  restoredExercises: HierarchyPilatesExercise[];
  sourceProvenance: SequenceSourceProvenance;
} {
  const clonedAt = options?.now ?? new Date().toISOString();
  const sourceKind = options?.sourceKind ?? 'history-snapshot';
  const sourceId = options?.sourceId ?? snapshot.snapshotId;
  const currentIds = new Set(currentExercises.map((ex) => ex.id));
  const restoredExercisesMap = new Map<string, PilatesExercise>();
  const instanceIdMap = new Map<string, string>();

  const clonedSteps: SequenceStep[] = snapshot.steps.map((step, index) => {
    const rawClone = structuredClone(step) as SequenceStep;
    const stepSuffix = isRestStep(rawClone) ? 'rest' : rawClone.exerciseId;

    let mappedBlockInstanceId: string | undefined;
    if (rawClone.blockInstanceId) {
      mappedBlockInstanceId = instanceIdMap.get(rawClone.blockInstanceId);
      if (!mappedBlockInstanceId) {
        mappedBlockInstanceId = `${rawClone.blockInstanceId}-clone-${index + 1}`;
        instanceIdMap.set(rawClone.blockInstanceId, mappedBlockInstanceId);
      }
    }

    const embeddedSnapshot =
      !isRestStep(rawClone)
        ? rawClone.exerciseSnapshot ?? snapshot.exerciseSnapshots[rawClone.exerciseId]
        : undefined;

    if (
      !isRestStep(rawClone) &&
      embeddedSnapshot &&
      !currentIds.has(rawClone.exerciseId) &&
      !restoredExercisesMap.has(rawClone.exerciseId)
    ) {
      restoredExercisesMap.set(
        rawClone.exerciseId,
        reconstructExerciseFromSnapshot(embeddedSnapshot),
      );
    }

    return {
      ...rawClone,
      stepId: `draft-clone-${sourceId}-step-${index + 1}-${stepSuffix}`.slice(0, 280),
      order: index + 1,
      blockInstanceId: mappedBlockInstanceId,
      humanDraftId: rawClone.humanDraftId ?? embeddedSnapshot?.humanDraftId,
      humanDraftRevision: rawClone.humanDraftRevision ?? embeddedSnapshot?.humanDraftRevision,
      exerciseSnapshot: embeddedSnapshot
        ? deepFreeze(structuredClone(embeddedSnapshot))
        : undefined,
    };
  });

  for (const [exerciseId, exSnapshot] of Object.entries(snapshot.exerciseSnapshots)) {
    if (!currentIds.has(exerciseId) && !restoredExercisesMap.has(exerciseId)) {
      restoredExercisesMap.set(exerciseId, reconstructExerciseFromSnapshot(exSnapshot));
    }
  }

  const kindLabelKo =
    sourceKind === 'dated-plan-snapshot' ? '일정 수업 스냅샷' : '과거 수업 기록 스냅샷';
  const taughtSuffix = options?.sourceTaughtAt ? ` (${options.sourceTaughtAt})` : '';
  const summaryKo = `${kindLabelKo} '${snapshot.title}' v${snapshot.sourceSequenceVersion}${taughtSuffix}에서 복제된 독립 초안입니다.`;

  const sourceProvenance: SequenceSourceProvenance = sequenceSourceProvenanceSchema.parse({
    kind: sourceKind,
    sourceId,
    sourceTitle: snapshot.title,
    sourceSequenceId: snapshot.sourceSequenceId,
    sourceVersion: snapshot.sourceSequenceVersion,
    sourceUpdatedAt: snapshot.sourceSequenceUpdatedAt,
    sourceTaughtAt: options?.sourceTaughtAt,
    clonedAt,
    summaryKo,
  });

  return {
    title: `${snapshot.title} (복제 초안)`,
    subtitle: snapshot.subtitle,
    apparatus: snapshot.apparatus,
    level: snapshot.level,
    targetMinutes: snapshot.targetMinutes,
    steps: clonedSteps,
    restoredExercises: [...restoredExercisesMap.values()],
    sourceProvenance,
  };
}
