import { z } from 'zod';
import {
  draftModificationLogSchema,
  draftPhotoReferenceSchema,
  humanCreationStoragePayloadSchema,
  humanMovementDraftContentSchema,
  humanMovementDraftSchema,
  movementSafetyAndEfficacyBoundarySchema,
  movementSnapshotSchema,
  subjectiveFeelLogSchema,
} from '../schemas/hierarchySchema';
import type {
  DraftClassLinkOverrides,
  DraftModificationLog,
  DraftPhotoReference,
  DraftRevisionChangeType,
  DraftRevisionEntry,
  DraftStageReadinessResult,
  DraftUsageStage,
  HierarchyPilatesExercise,
  HumanDraftCompletenessStage,
  HumanMovementDraft,
  HumanMovementDraftContent,
  MovementSafetyAndEfficacyBoundary,
  MovementSnapshot,
  PreservedCreationInputState,
  SubjectiveFeelLog,
} from '../types/hierarchy';
import type {
  ApparatusType,
  ClassBlockCategory,
  DifficultyLevel,
  LayerMode,
  PropType,
  StepSideMode,
} from '../types/pilates';
import type { ClassSectionRole } from '../types/sequenceMotion';

export const DEFAULT_SUBJECTIVE_SAFETY_BOUNDARY: MovementSafetyAndEfficacyBoundary = Object.freeze({
  originType: 'instructor-created-draft',
  evaluationBasis: 'subjective-instructor-feel',
  aiSafetyGuaranteed: false,
  objectiveEfficacyClaimed: false,
  expertVerified: false,
  disclaimerKo:
    '강사가 직접 구상·시도하며 기록한 주관적 운동감 메모이며, 객관적 운동 효과 판정이나 전문가·AI 안전성 보증이 아닙니다.',
});

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val !== undefined) {
        cleaned[key] = stripUndefined(val);
      }
    }
    return cleaned as T;
  }
  return value;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    Object.freeze(value);
    for (const val of Object.values(value as Record<string, unknown>)) {
      if (val !== null && typeof val === 'object' && !Object.isFrozen(val)) {
        deepFreeze(val);
      }
    }
  }
  return value;
}

function extractContentSnapshot(source: HumanMovementDraftContent): HumanMovementDraftContent {
  const raw: HumanMovementDraftContent = {
    ideaLine: source.ideaLine,
    workingNameKo: source.workingNameKo,
    apparatus: source.apparatus,
    requiredEquipment: source.requiredEquipment ? [...source.requiredEquipment] : undefined,
    props: source.props ? [...source.props] : undefined,
    blockCategory: source.blockCategory,
    sectionRole: source.sectionRole,
    level: source.level,
    defaultDurationMin: source.defaultDurationMin,
    defaultRepetitions: source.defaultRepetitions,
    defaultSets: source.defaultSets,
    isUnilateral: source.isUnilateral,
    sideMode: source.sideMode,
    springs: source.springs,
    box: source.box,
    footbar: source.footbar,
    headrest: source.headrest,
    bodyPosition: source.bodyPosition,
    spinalPlanes: source.spinalPlanes ? [...source.spinalPlanes] : undefined,
    targetMuscles: source.targetMuscles ? [...source.targetMuscles] : undefined,
    breathPattern: source.breathPattern,
    cues: source.cues ? [...source.cues] : undefined,
    precautions: source.precautions,
    layers: source.layers ? { ...source.layers } : undefined,
    feelLogs: structuredClone(source.feelLogs) as SubjectiveFeelLog[],
    modificationLogs: structuredClone(source.modificationLogs) as DraftModificationLog[],
    photoReferences: structuredClone(source.photoReferences) as DraftPhotoReference[],
  };
  const stripped = stripUndefined(raw);
  return humanMovementDraftContentSchema.parse(stripped);
}

function computeCompletenessStage(
  content: HumanMovementDraftContent,
  previousStage?: HumanDraftCompletenessStage,
): HumanDraftCompletenessStage {
  if (content.apparatus !== undefined && content.defaultDurationMin !== undefined) {
    return 'class-ready';
  }
  if (previousStage === 'class-ready') {
    return 'class-ready';
  }
  if (
    content.feelLogs.length > 0 ||
    content.modificationLogs.length > 0 ||
    previousStage === 'practiced-recorded'
  ) {
    return 'practiced-recorded';
  }
  return 'idea-only';
}

function formatErrorMessageKo(error: unknown, fallbackMessageKo: string): string {
  if (error instanceof z.ZodError) {
    const firstIssue = error.issues[0];
    return firstIssue?.message || fallbackMessageKo;
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallbackMessageKo;
}

export interface CreateHumanMovementIdeaInput {
  id?: string;
  ideaLine: string;
  workingNameKo?: string;
  apparatus?: ApparatusType;
  sectionRole?: ClassSectionRole;
  blockCategory?: ClassBlockCategory;
  level?: DifficultyLevel;
  defaultDurationMin?: number;
  defaultRepetitions?: number;
  defaultSets?: number;
  isUnilateral?: boolean;
  sideMode?: StepSideMode;
  springs?: string;
  props?: readonly PropType[];
  now?: string;
}

/**
 * Creates a human-authored movement draft requiring ONLY `ideaLine`.
 * All classification, equipment, anatomy, duration, and L/R fields remain optional (`undefined` when omitted).
 */
export function createHumanMovementIdeaDraft(
  input: CreateHumanMovementIdeaInput,
): HumanMovementDraft {
  const trimmedIdea = typeof input.ideaLine === 'string' ? input.ideaLine.trim() : '';
  if (!trimmedIdea) {
    throw new Error('최소 한 줄의 동작 아이디어를 입력해 주세요.');
  }

  const timestamp = input.now ?? new Date().toISOString();
  const draftId =
    input.id?.trim() || `human-draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const initialContent = extractContentSnapshot(
    stripUndefined({
      ideaLine: trimmedIdea,
      workingNameKo: input.workingNameKo?.trim() || undefined,
      apparatus: input.apparatus,
      sectionRole: input.sectionRole,
      blockCategory: input.blockCategory,
      level: input.level,
      defaultDurationMin: input.defaultDurationMin,
      defaultRepetitions: input.defaultRepetitions,
      defaultSets: input.defaultSets,
      isUnilateral: input.isUnilateral,
      sideMode: input.sideMode,
      springs: input.springs?.trim() || undefined,
      props: input.props ? [...input.props] : undefined,
      feelLogs: [],
      modificationLogs: [],
      photoReferences: [],
    }),
  );

  const initialRevisionEntry: DraftRevisionEntry = deepFreeze({
    revision: 1,
    savedAt: timestamp,
    changeType: 'initial-idea',
    summaryKo: '한 줄 아이디어 초안 저장',
    contentSnapshot: extractContentSnapshot(initialContent),
  });

  const safetyBoundary = movementSafetyAndEfficacyBoundarySchema.parse({
    ...DEFAULT_SUBJECTIVE_SAFETY_BOUNDARY,
  });

  const candidateDraft = stripUndefined({
    ...initialContent,
    id: draftId,
    sourceOrigin: 'human-created' as const,
    completenessStage: 'idea-only' as const,
    revision: 1,
    revisionHistory: [initialRevisionEntry],
    safetyBoundary,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const parsed = humanMovementDraftSchema.parse(candidateDraft);
  deepFreeze(parsed.revisionHistory);
  deepFreeze(parsed.safetyBoundary);
  return parsed;
}

/**
 * Appends a subjective instructor feel note after trying the movement.
 * Strictly enforces epistemic boundary (`objectiveEfficacyClaimed: false`, `safetyGuaranteed: false`, `expertVerified: false`).
 */
export function addSubjectiveFeelToDraft(
  draft: HumanMovementDraft,
  input: {
    id?: string;
    feelNoteKo: string;
    perceivedIntensity?: 'gentle' | 'moderate' | 'challenging';
    cautionFeelKo?: string;
    objectiveEfficacyClaimed?: boolean;
    safetyGuaranteed?: boolean;
    expertVerified?: boolean;
    aiSafetyGuaranteed?: boolean;
    now?: string;
  },
): HumanMovementDraft {
  const rawRecord = input as Record<string, unknown>;
  if (
    rawRecord.objectiveEfficacyClaimed === true ||
    rawRecord.safetyGuaranteed === true ||
    rawRecord.expertVerified === true ||
    rawRecord.aiSafetyGuaranteed === true
  ) {
    throw new Error(
      'EPISTEMIC_BOUNDARY_VIOLATION: 주관적 운동감 기록을 객관적 효과 판정이나 전문가·AI 안전성 보증으로 표시할 수 없습니다.',
    );
  }

  const timestamp = input.now ?? new Date().toISOString();
  const nextRevision = draft.revision + 1;
  const feelId = input.id?.trim() || `feel-${draft.id}-r${nextRevision}`;

  const validatedFeel = subjectiveFeelLogSchema.parse(
    stripUndefined({
      id: feelId,
      recordedAt: timestamp,
      feelNoteKo: typeof input.feelNoteKo === 'string' ? input.feelNoteKo.trim() : '',
      perceivedIntensity: input.perceivedIntensity,
      cautionFeelKo: input.cautionFeelKo?.trim() || undefined,
      evaluationBasis: 'subjective-instructor-feel' as const,
      objectiveEfficacyClaimed: false as const,
      safetyGuaranteed: false as const,
      expertVerified: false as const,
    }),
  );

  const nextContent = extractContentSnapshot({
    ...draft,
    feelLogs: [...draft.feelLogs, validatedFeel],
  });

  const revisionEntry: DraftRevisionEntry = deepFreeze({
    revision: nextRevision,
    parentRevision: draft.revision,
    savedAt: timestamp,
    changeType: 'feel-added',
    summaryKo: `직접 해본 주관적 느낌 기록 추가 (${validatedFeel.feelNoteKo.slice(0, 40)})`,
    contentSnapshot: extractContentSnapshot(nextContent),
  });

  const nextStage = computeCompletenessStage(nextContent, draft.completenessStage);

  const updated = humanMovementDraftSchema.parse(
    stripUndefined({
      ...draft,
      ...nextContent,
      completenessStage: nextStage,
      revision: nextRevision,
      revisionHistory: [...draft.revisionHistory, revisionEntry],
      updatedAt: timestamp,
    }),
  );

  deepFreeze(updated.revisionHistory);
  deepFreeze(updated.safetyBoundary);
  return updated;
}

/**
 * Appends a modification point note after practicing the draft movement.
 */
export function addModificationLogToDraft(
  draft: HumanMovementDraft,
  input: {
    id?: string;
    modificationPointKo: string;
    setupOrSpringChangeKo?: string;
    cueChangeKo?: string;
    now?: string;
  },
): HumanMovementDraft {
  const timestamp = input.now ?? new Date().toISOString();
  const nextRevision = draft.revision + 1;
  const modId = input.id?.trim() || `mod-${draft.id}-r${nextRevision}`;

  const validatedMod = draftModificationLogSchema.parse(
    stripUndefined({
      id: modId,
      recordedAt: timestamp,
      modificationPointKo:
        typeof input.modificationPointKo === 'string' ? input.modificationPointKo.trim() : '',
      setupOrSpringChangeKo: input.setupOrSpringChangeKo?.trim() || undefined,
      cueChangeKo: input.cueChangeKo?.trim() || undefined,
      appliedToRevision: nextRevision,
    }),
  );

  const nextContent = extractContentSnapshot({
    ...draft,
    modificationLogs: [...draft.modificationLogs, validatedMod],
  });

  const revisionEntry: DraftRevisionEntry = deepFreeze({
    revision: nextRevision,
    parentRevision: draft.revision,
    savedAt: timestamp,
    changeType: 'modification-added',
    summaryKo: `수정할 점 기록 추가 (${validatedMod.modificationPointKo.slice(0, 40)})`,
    contentSnapshot: extractContentSnapshot(nextContent),
  });

  const nextStage = computeCompletenessStage(nextContent, draft.completenessStage);

  const updated = humanMovementDraftSchema.parse(
    stripUndefined({
      ...draft,
      ...nextContent,
      completenessStage: nextStage,
      revision: nextRevision,
      revisionHistory: [...draft.revisionHistory, revisionEntry],
      updatedAt: timestamp,
    }),
  );

  deepFreeze(updated.revisionHistory);
  deepFreeze(updated.safetyBoundary);
  return updated;
}

/**
 * Appends a local-only photo reference (`local-photo://`, `blob:`, `asset://`, `file://`).
 * Blocks external `http://` or `https://` URLs and enforces `externalAiUploadAllowed: false`.
 */
export function addPhotoReferenceToDraft(
  draft: HumanMovementDraft,
  input: {
    id?: string;
    localRefUri: string;
    captionKo?: string;
    angleTag?: 'setup' | 'start-pose' | 'end-pose' | 'modification';
    externalAiUploadAllowed?: boolean;
    now?: string;
  },
): HumanMovementDraft {
  if ((input as Record<string, unknown>).externalAiUploadAllowed === true) {
    throw new Error(
      'EXTERNAL_PHOTO_UPLOAD_FORBIDDEN: 초안 사진 참조는 외부 AI로 업로드할 수 없습니다.',
    );
  }

  const timestamp = input.now ?? new Date().toISOString();
  const nextRevision = draft.revision + 1;
  const photoId = input.id?.trim() || `photo-${draft.id}-r${nextRevision}`;

  const validatedPhoto = draftPhotoReferenceSchema.parse(
    stripUndefined({
      id: photoId,
      localRefUri: typeof input.localRefUri === 'string' ? input.localRefUri.trim() : '',
      captionKo: input.captionKo?.trim() || undefined,
      angleTag: input.angleTag,
      capturedAt: timestamp,
      externalAiUploadAllowed: false as const,
    }),
  );

  const nextContent = extractContentSnapshot({
    ...draft,
    photoReferences: [...draft.photoReferences, validatedPhoto],
  });

  const revisionEntry: DraftRevisionEntry = deepFreeze({
    revision: nextRevision,
    parentRevision: draft.revision,
    savedAt: timestamp,
    changeType: 'photo-added',
    summaryKo: `로컬 동작 사진 참조 추가 (${validatedPhoto.captionKo ?? validatedPhoto.localRefUri})`,
    contentSnapshot: extractContentSnapshot(nextContent),
  });

  const updated = humanMovementDraftSchema.parse(
    stripUndefined({
      ...draft,
      ...nextContent,
      revision: nextRevision,
      revisionHistory: [...draft.revisionHistory, revisionEntry],
      updatedAt: timestamp,
    }),
  );

  deepFreeze(updated.revisionHistory);
  deepFreeze(updated.safetyBoundary);
  return updated;
}

/**
 * Progressively refines optional metadata on a human movement draft.
 */
export function refineHumanDraftMetadata(
  draft: HumanMovementDraft,
  patch: Partial<
    Omit<HumanMovementDraftContent, 'feelLogs' | 'modificationLogs' | 'photoReferences'>
  > & {
    summaryKo?: string;
    now?: string;
  },
): HumanMovementDraft {
  const timestamp = patch.now ?? new Date().toISOString();
  const nextRevision = draft.revision + 1;

  const { summaryKo } = patch;
  const contentPatchRecord: Record<string, unknown> = { ...patch };
  delete contentPatchRecord.summaryKo;
  delete contentPatchRecord.now;
  const sanitizedPatch = stripUndefined(
    contentPatchRecord as Partial<
      Omit<HumanMovementDraftContent, 'feelLogs' | 'modificationLogs' | 'photoReferences'>
    >,
  );

  if (
    'ideaLine' in sanitizedPatch &&
    (typeof sanitizedPatch.ideaLine !== 'string' || sanitizedPatch.ideaLine.trim().length === 0)
  ) {
    throw new Error('최소 한 줄의 동작 아이디어를 입력해 주세요.');
  }

  const mergedContent = extractContentSnapshot({
    ideaLine:
      typeof sanitizedPatch.ideaLine === 'string'
        ? sanitizedPatch.ideaLine.trim()
        : draft.ideaLine,
    workingNameKo:
      typeof sanitizedPatch.workingNameKo === 'string'
        ? sanitizedPatch.workingNameKo.trim() || undefined
        : draft.workingNameKo,
    apparatus: sanitizedPatch.apparatus ?? draft.apparatus,
    requiredEquipment: sanitizedPatch.requiredEquipment ?? draft.requiredEquipment,
    props: sanitizedPatch.props ?? draft.props,
    blockCategory: sanitizedPatch.blockCategory ?? draft.blockCategory,
    sectionRole: sanitizedPatch.sectionRole ?? draft.sectionRole,
    level: sanitizedPatch.level ?? draft.level,
    defaultDurationMin: sanitizedPatch.defaultDurationMin ?? draft.defaultDurationMin,
    defaultRepetitions: sanitizedPatch.defaultRepetitions ?? draft.defaultRepetitions,
    defaultSets: sanitizedPatch.defaultSets ?? draft.defaultSets,
    isUnilateral: sanitizedPatch.isUnilateral ?? draft.isUnilateral,
    sideMode: sanitizedPatch.sideMode ?? draft.sideMode,
    springs: sanitizedPatch.springs ?? draft.springs,
    box: sanitizedPatch.box ?? draft.box,
    footbar: sanitizedPatch.footbar ?? draft.footbar,
    headrest: sanitizedPatch.headrest ?? draft.headrest,
    bodyPosition: sanitizedPatch.bodyPosition ?? draft.bodyPosition,
    spinalPlanes: sanitizedPatch.spinalPlanes ?? draft.spinalPlanes,
    targetMuscles: sanitizedPatch.targetMuscles ?? draft.targetMuscles,
    breathPattern: sanitizedPatch.breathPattern ?? draft.breathPattern,
    cues: sanitizedPatch.cues ?? draft.cues,
    precautions: sanitizedPatch.precautions ?? draft.precautions,
    layers: sanitizedPatch.layers
      ? { ...(draft.layers ?? {}), ...sanitizedPatch.layers }
      : draft.layers,
    feelLogs: draft.feelLogs,
    modificationLogs: draft.modificationLogs,
    photoReferences: draft.photoReferences,
  });

  const patchKeys = Object.keys(sanitizedPatch);
  const changeType: DraftRevisionChangeType =
    patchKeys.length === 1 && patchKeys[0] === 'ideaLine' ? 'idea-updated' : 'metadata-refined';

  const nextStage = computeCompletenessStage(mergedContent, draft.completenessStage);

  const revisionEntry: DraftRevisionEntry = deepFreeze({
    revision: nextRevision,
    parentRevision: draft.revision,
    savedAt: timestamp,
    changeType,
    summaryKo:
      summaryKo?.trim() ||
      (changeType === 'idea-updated'
        ? '한 줄 아이디어 내용 수정'
        : '동작 세부 설정 및 메타데이터 보완'),
    contentSnapshot: extractContentSnapshot(mergedContent),
  });

  const updated = humanMovementDraftSchema.parse(
    stripUndefined({
      id: draft.id,
      sourceOrigin: 'human-created' as const,
      ...mergedContent,
      completenessStage: nextStage,
      revision: nextRevision,
      revisionHistory: [...draft.revisionHistory, revisionEntry],
      safetyBoundary: draft.safetyBoundary,
      createdAt: draft.createdAt,
      updatedAt: timestamp,
    }),
  );

  deepFreeze(updated.revisionHistory);
  deepFreeze(updated.safetyBoundary);
  return updated;
}

/**
 * Restores an earlier revision snapshot non-destructively by creating a new revision `draft.revision + 1`
 * with `parentRevision: targetRevision` and `changeType: 'restored-revision'`, keeping all prior history intact.
 */
export function restoreHumanDraftRevision(
  draft: HumanMovementDraft,
  targetRevision: number,
  now?: string,
): HumanMovementDraft {
  const targetEntry = draft.revisionHistory.find((entry) => entry.revision === targetRevision);
  if (!targetEntry) {
    throw new Error(`복원할 버전(v${targetRevision})을 수정 이력에서 찾을 수 없습니다.`);
  }

  const timestamp = now ?? new Date().toISOString();
  const nextRevision = draft.revision + 1;
  const restoredContent = extractContentSnapshot(targetEntry.contentSnapshot);
  const nextStage = computeCompletenessStage(restoredContent);

  const restoredRevisionEntry: DraftRevisionEntry = deepFreeze({
    revision: nextRevision,
    parentRevision: targetRevision,
    savedAt: timestamp,
    changeType: 'restored-revision',
    summaryKo: `v${targetRevision} 시점의 초안 상태로 복원`,
    contentSnapshot: extractContentSnapshot(restoredContent),
  });

  // Build new draft object from scratch so fields added in later revisions that were undefined in vTarget are omitted
  const updated = humanMovementDraftSchema.parse(
    stripUndefined({
      id: draft.id,
      sourceOrigin: 'human-created' as const,
      ...restoredContent,
      completenessStage: nextStage,
      revision: nextRevision,
      revisionHistory: [...draft.revisionHistory, restoredRevisionEntry],
      safetyBoundary: draft.safetyBoundary,
      createdAt: draft.createdAt,
      updatedAt: timestamp,
    }),
  );

  deepFreeze(updated.revisionHistory);
  deepFreeze(updated.safetyBoundary);
  return updated;
}

/**
 * Evaluates stage-specific readiness for saving an idea vs linking it to a block, sequence, or class.
 * Never blocks saving an idea (`canSaveIdeaDraft: true`) and always provides non-blocking fallbacks (`canLinkWithFallbacks: true`).
 */
export function evaluateDraftStageReadiness(
  draft: HumanMovementDraft,
  stage: DraftUsageStage,
  overrides?: DraftClassLinkOverrides,
): DraftStageReadinessResult {
  const missingRecommendedFields: Array<'apparatus' | 'durationMin' | 'sectionRole' | 'sideMode'> =
    [];

  const rawApparatus = overrides?.apparatus ?? draft.apparatus;
  const rawDurationMin = overrides?.durationMin ?? draft.defaultDurationMin;
  const rawSectionRole = overrides?.sectionRole ?? draft.sectionRole;
  const rawSideMode = overrides?.sideMode ?? draft.sideMode;

  if (rawApparatus === undefined) missingRecommendedFields.push('apparatus');
  if (rawDurationMin === undefined) missingRecommendedFields.push('durationMin');
  if (rawSectionRole === undefined) missingRecommendedFields.push('sectionRole');
  if (rawSideMode === undefined) missingRecommendedFields.push('sideMode');

  const resolvedApparatus: ApparatusType = rawApparatus ?? 'mat';
  const resolvedSectionRole: ClassSectionRole =
    rawSectionRole ??
    (overrides?.blockCategory === 'warmup' || draft.blockCategory === 'warmup'
      ? 'preparation'
      : overrides?.blockCategory === 'cooldown' || draft.blockCategory === 'cooldown'
        ? 'cooldown'
        : 'main');
  const resolvedBlockCategory: ClassBlockCategory =
    overrides?.blockCategory ??
    draft.blockCategory ??
    (resolvedSectionRole === 'preparation'
      ? 'warmup'
      : resolvedSectionRole === 'cooldown'
        ? 'cooldown'
        : 'core');
  const resolvedLevel: DifficultyLevel = overrides?.level ?? draft.level ?? '1.0';
  const resolvedDurationMin: number = rawDurationMin ?? 4;
  const resolvedRepetitions = overrides?.repetitions ?? draft.defaultRepetitions;
  const resolvedSets = overrides?.sets ?? draft.defaultSets;
  const resolvedIsUnilateral: boolean =
    overrides?.isUnilateral ??
    draft.isUnilateral ??
    (rawSideMode !== undefined && rawSideMode !== 'together');
  const resolvedSideMode: StepSideMode =
    rawSideMode ?? (resolvedIsUnilateral ? 'left-then-right' : 'together');
  const resolvedLayer: LayerMode = overrides?.selectedLayer ?? 'standard';
  const resolvedNameKo = (
    overrides?.workingNameKo?.trim() ||
    draft.workingNameKo?.trim() ||
    draft.ideaLine.trim()
  ).slice(0, 200);

  const guidanceNoticesKo: string[] = [];

  if (stage === 'idea-save') {
    guidanceNoticesKo.push(
      '아이디어 초안 저장 단계에서는 한 줄 아이디어만 있으면 즉시 저장되며, 기구·시간·해부학 정보는 나중에 보완할 수 있습니다.',
    );
  } else if (missingRecommendedFields.length > 0) {
    if (missingRecommendedFields.includes('apparatus')) {
      guidanceNoticesKo.push(
        `[${stage}] 기구가 아직 지정되지 않아 기본 기구('mat')로 연결됩니다. 필요 시 기구를 선택해 주세요.`,
      );
    }
    if (missingRecommendedFields.includes('durationMin')) {
      guidanceNoticesKo.push(
        `[${stage}] 수행 시간이 지정되지 않아 기본 시간(${resolvedDurationMin}분)으로 배정됩니다.`,
      );
    }
    if (missingRecommendedFields.includes('sectionRole')) {
      guidanceNoticesKo.push(
        `[${stage}] 수업 구간 역할이 지정되지 않아 기본 구간('${resolvedSectionRole}')으로 배정됩니다.`,
      );
    }
    if (missingRecommendedFields.includes('sideMode')) {
      guidanceNoticesKo.push(
        `[${stage}] 좌·우 수행 방식이 지정되지 않아 기본값('${resolvedSideMode}')으로 배정됩니다.`,
      );
    }
  }

  guidanceNoticesKo.push(draft.safetyBoundary.disclaimerKo);

  return {
    stage,
    canSaveIdeaDraft: true,
    canLinkDirectly: missingRecommendedFields.length === 0,
    canLinkWithFallbacks: true,
    missingRecommendedFields,
    guidanceNoticesKo,
    resolvedExercise: stripUndefined({
      id: draft.id,
      nameKo: resolvedNameKo,
      apparatus: resolvedApparatus,
      sectionRole: resolvedSectionRole,
      blockCategory: resolvedBlockCategory,
      level: resolvedLevel,
      durationMin: resolvedDurationMin,
      repetitions: resolvedRepetitions,
      sets: resolvedSets,
      isUnilateral: resolvedIsUnilateral,
      sideMode: resolvedSideMode,
      selectedLayer: resolvedLayer,
    }),
    safetyBoundary: draft.safetyBoundary,
  };
}

/**
 * Produces a deep-frozen `MovementSnapshot` from a `HumanMovementDraft`, preserving
 * the exact revision, idea line, subjective feel logs, modification logs, local photo references,
 * and epistemic safety boundary.
 */
export function createMovementSnapshotFromHumanDraft(
  draft: HumanMovementDraft,
  overrides?: DraftClassLinkOverrides,
  capturedAt?: string,
): MovementSnapshot {
  const readiness = evaluateDraftStageReadiness(draft, 'class-confirm', overrides);
  const { resolvedExercise } = readiness;
  const timestamp = capturedAt ?? new Date().toISOString();

  const cautionFeel = draft.feelLogs.find((item) => item.cautionFeelKo)?.cautionFeelKo;
  const candidateSnapshot = stripUndefined({
    id: draft.id,
    nameKo: resolvedExercise.nameKo,
    nameEn: draft.workingNameKo?.trim() || 'Instructor Draft Movement',
    apparatus: resolvedExercise.apparatus,
    requiredEquipment: draft.requiredEquipment?.length
      ? [...draft.requiredEquipment]
      : [resolvedExercise.apparatus],
    blockCategory: resolvedExercise.blockCategory,
    level: resolvedExercise.level,
    defaultDurationMin: resolvedExercise.durationMin,
    defaultRepetitions: resolvedExercise.repetitions,
    defaultSets: resolvedExercise.sets,
    isUnilateral: resolvedExercise.isUnilateral,
    springs: overrides?.springs?.trim() || draft.springs?.trim() || 'Bodyweight',
    box: draft.box ?? 'none',
    footbar: draft.footbar ?? 'none',
    headrest: draft.headrest ?? 'flat',
    props: draft.props?.length ? [...draft.props] : (['none'] as PropType[]),
    spinalPlanes: draft.spinalPlanes?.length ? [...draft.spinalPlanes] : (['neutral'] as const),
    bodyPosition: draft.bodyPosition ?? 'supine',
    targetMuscles: draft.targetMuscles?.length ? [...draft.targetMuscles] : [],
    breathPattern: draft.breathPattern?.trim() || '자연스러운 흉식 호흡 유지',
    cues: draft.cues?.length ? [...draft.cues] : [draft.ideaLine],
    precautions:
      draft.precautions?.trim() ||
      cautionFeel ||
      '강사 주관적 초안 동작 — 개인 컨디션 및 가동범위 확인 필수',
    layers: {
      easy: draft.layers?.easy?.trim() || '가동범위를 작게 줄여 안정적인 범위에서 진행합니다.',
      standard: draft.layers?.standard?.trim() || draft.ideaLine,
      hard:
        draft.layers?.hard?.trim() ||
        '정렬을 유지한 상태에서 템포와 버티기 컨트롤을 섬세하게 높입니다.',
    },
    capturedAt: timestamp,
    sourceOrigin: 'human-created' as const,
    humanDraftId: draft.id,
    humanDraftRevision: draft.revision,
    ideaLineSnapshot: draft.ideaLine,
    feelLogsSnapshot: structuredClone(draft.feelLogs) as SubjectiveFeelLog[],
    modificationLogsSnapshot: structuredClone(draft.modificationLogs) as DraftModificationLog[],
    photoReferencesSnapshot: structuredClone(draft.photoReferences) as DraftPhotoReference[],
    safetyBoundarySnapshot: structuredClone(draft.safetyBoundary),
  });

  const validated = movementSnapshotSchema.parse(candidateSnapshot);
  return deepFreeze(validated);
}

/**
 * Converts a `HumanMovementDraft` into a `PilatesExercise` (`isCustom: true`, `humanDraftId`, `humanDraftRevision`)
 * without requiring any upfront anatomy fields.
 */
export function convertHumanDraftToPilatesExercise(
  draft: HumanMovementDraft,
  overrides?: DraftClassLinkOverrides,
): HierarchyPilatesExercise {
  const snapshot = createMovementSnapshotFromHumanDraft(draft, overrides, draft.updatedAt);

  return stripUndefined({
    id: snapshot.id,
    nameKo: snapshot.nameKo,
    nameEn: snapshot.nameEn,
    apparatus: snapshot.apparatus,
    requiredEquipment: snapshot.requiredEquipment ? [...snapshot.requiredEquipment] : undefined,
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
    layers: { ...snapshot.layers },
    youtube: {
      videoId: 'local-draft-only',
      channelName: '강사 직접 작성 초안',
      videoTitle: snapshot.nameKo,
      startSec: 0,
      url: 'https://www.youtube.com/watch?v=local-draft-only',
      note: draft.safetyBoundary.disclaimerKo,
    },
    favoriteTag: 'none' as const,
    isCustom: true,
    createdAt: draft.createdAt,
    humanDraftId: draft.id,
    humanDraftRevision: draft.revision,
  });
}

export interface HumanDraftStorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface HumanDraftRepositoryState {
  drafts: HumanMovementDraft[];
  preservedInput: PreservedCreationInputState | null;
  lastErrorKo: string | null;
}

export interface HumanDraftOperationResult {
  ok: boolean;
  draft?: HumanMovementDraft;
  drafts: HumanMovementDraft[];
  preservedInput: PreservedCreationInputState | null;
  errorKo: string | null;
}

export const DEFAULT_HUMAN_DRAFT_STORAGE_KEY = 'pilates_flow_human_movement_drafts_v1';

/**
 * Creates a stateful repository for human-created movement drafts that guarantees
 * user input and existing revision history are NEVER lost on validation or storage failures.
 */
export function createHumanDraftRepository(options?: {
  storage?: HumanDraftStorageAdapter;
  storageKey?: string;
  initialDrafts?: readonly HumanMovementDraft[];
}) {
  const storageKey = options?.storageKey ?? DEFAULT_HUMAN_DRAFT_STORAGE_KEY;
  const storage = options?.storage;

  let drafts: HumanMovementDraft[] = [];
  let preservedInput: PreservedCreationInputState | null = null;
  let lastErrorKo: string | null = null;

  if (options?.initialDrafts?.length) {
    drafts = options.initialDrafts.map((d) => humanMovementDraftSchema.parse(structuredClone(d)));
  } else if (storage) {
    try {
      const raw = storage.getItem(storageKey);
      if (raw) {
        const parsed = humanCreationStoragePayloadSchema.parse(JSON.parse(raw));
        drafts = parsed.humanMovementDrafts;
      }
    } catch (error) {
      lastErrorKo = formatErrorMessageKo(
        error,
        '저장된 초안 데이터를 불러오는 중 오류가 발생했습니다.',
      );
    }
  }

  const persistToStorage = (
    nextDrafts: HumanMovementDraft[],
    attemptedInput: Omit<PreservedCreationInputState, 'failedAt' | 'reasonKo'>,
    now?: string,
  ): boolean => {
    if (!storage) return true;
    const timestamp = now ?? new Date().toISOString();
    const payload = humanCreationStoragePayloadSchema.parse({
      format: 'pilates-flow-human-creation-v1',
      version: 1,
      exportedAt: timestamp,
      humanMovementDrafts: nextDrafts.map((item) => stripUndefined(structuredClone(item))),
    });
    try {
      storage.setItem(storageKey, JSON.stringify(payload));
      return true;
    } catch (storageErr) {
      const reasonKo = formatErrorMessageKo(
        storageErr,
        '브라우저/로컬 저장소 기록에 실패하여 입력 상태를 임시 보존했습니다.',
      );
      lastErrorKo = reasonKo;
      preservedInput = stripUndefined({
        ...attemptedInput,
        failedAt: timestamp,
        reasonKo,
      });
      return false;
    }
  };

  const recordFailure = (
    error: unknown,
    fallbackMessageKo: string,
    attemptedInput: Omit<PreservedCreationInputState, 'failedAt' | 'reasonKo'>,
    now?: string,
  ): HumanDraftOperationResult => {
    const timestamp = now ?? new Date().toISOString();
    const reasonKo = formatErrorMessageKo(error, fallbackMessageKo);
    lastErrorKo = reasonKo;
    preservedInput = stripUndefined({
      ...attemptedInput,
      failedAt: timestamp,
      reasonKo,
    });
    return {
      ok: false,
      draft: undefined,
      drafts: structuredClone(drafts),
      preservedInput: structuredClone(preservedInput),
      errorKo: lastErrorKo,
    };
  };

  return {
    get drafts(): HumanMovementDraft[] {
      return structuredClone(drafts);
    },
    get preservedInput(): PreservedCreationInputState | null {
      return preservedInput ? structuredClone(preservedInput) : null;
    },
    get lastErrorKo(): string | null {
      return lastErrorKo;
    },
    getState(): HumanDraftRepositoryState {
      return {
        drafts: structuredClone(drafts),
        preservedInput: preservedInput ? structuredClone(preservedInput) : null,
        lastErrorKo,
      };
    },
    getDraftById(draftId: string): HumanMovementDraft | undefined {
      const found = drafts.find((item) => item.id === draftId);
      return found ? structuredClone(found) : undefined;
    },
    clearPreservedInput(): void {
      preservedInput = null;
      lastErrorKo = null;
    },

    saveIdeaDraft(input: CreateHumanMovementIdeaInput): HumanDraftOperationResult {
      try {
        const created = createHumanMovementIdeaDraft(input);
        const existingIdx = drafts.findIndex((item) => item.id === created.id);
        const nextDrafts =
          existingIdx >= 0
            ? drafts.map((item, idx) => (idx === existingIdx ? created : item))
            : [...drafts, created];

        // Keep in-memory state updated even if storage write throws so work in RAM is never lost
        drafts = nextDrafts;

        const storedOk = persistToStorage(
          nextDrafts,
          {
            draftId: created.id,
            ideaLine: input.ideaLine,
            workingNameKo: input.workingNameKo,
          },
          input.now,
        );

        if (!storedOk) {
          return {
            ok: false,
            draft: structuredClone(created),
            drafts: structuredClone(drafts),
            preservedInput: structuredClone(preservedInput),
            errorKo: lastErrorKo,
          };
        }

        preservedInput = null;
        lastErrorKo = null;
        return {
          ok: true,
          draft: structuredClone(created),
          drafts: structuredClone(drafts),
          preservedInput: null,
          errorKo: null,
        };
      } catch (error) {
        return recordFailure(
          error,
          '새 동작 아이디어 초안 저장에 실패했습니다.',
          {
            draftId: input.id,
            ideaLine: input.ideaLine,
            workingNameKo: input.workingNameKo,
          },
          input.now,
        );
      }
    },

    appendFeelLog(
      draftId: string,
      input: Parameters<typeof addSubjectiveFeelToDraft>[1],
    ): HumanDraftOperationResult {
      const existing = drafts.find((item) => item.id === draftId);
      if (!existing) {
        return recordFailure(
          new Error(`대상 초안(${draftId})을 찾을 수 없습니다.`),
          '대상 초안을 찾을 수 없습니다.',
          {
            draftId,
            pendingFeelNoteKo: input.feelNoteKo,
          },
          input.now,
        );
      }

      try {
        const updated = addSubjectiveFeelToDraft(existing, input);
        const nextDrafts = drafts.map((item) => (item.id === draftId ? updated : item));
        drafts = nextDrafts;

        const storedOk = persistToStorage(
          nextDrafts,
          {
            draftId,
            ideaLine: existing.ideaLine,
            pendingFeelNoteKo: input.feelNoteKo,
          },
          input.now,
        );

        if (!storedOk) {
          return {
            ok: false,
            draft: structuredClone(updated),
            drafts: structuredClone(drafts),
            preservedInput: structuredClone(preservedInput),
            errorKo: lastErrorKo,
          };
        }

        preservedInput = null;
        lastErrorKo = null;
        return {
          ok: true,
          draft: structuredClone(updated),
          drafts: structuredClone(drafts),
          preservedInput: null,
          errorKo: null,
        };
      } catch (error) {
        return recordFailure(
          error,
          '느낀 점 기록 추가에 실패했습니다.',
          {
            draftId,
            ideaLine: existing.ideaLine,
            pendingFeelNoteKo: input.feelNoteKo,
          },
          input.now,
        );
      }
    },

    appendModificationLog(
      draftId: string,
      input: Parameters<typeof addModificationLogToDraft>[1],
    ): HumanDraftOperationResult {
      const existing = drafts.find((item) => item.id === draftId);
      if (!existing) {
        return recordFailure(
          new Error(`대상 초안(${draftId})을 찾을 수 없습니다.`),
          '대상 초안을 찾을 수 없습니다.',
          {
            draftId,
            pendingModificationPointKo: input.modificationPointKo,
          },
          input.now,
        );
      }

      try {
        const updated = addModificationLogToDraft(existing, input);
        const nextDrafts = drafts.map((item) => (item.id === draftId ? updated : item));
        drafts = nextDrafts;

        const storedOk = persistToStorage(
          nextDrafts,
          {
            draftId,
            ideaLine: existing.ideaLine,
            pendingModificationPointKo: input.modificationPointKo,
          },
          input.now,
        );

        if (!storedOk) {
          return {
            ok: false,
            draft: structuredClone(updated),
            drafts: structuredClone(drafts),
            preservedInput: structuredClone(preservedInput),
            errorKo: lastErrorKo,
          };
        }

        preservedInput = null;
        lastErrorKo = null;
        return {
          ok: true,
          draft: structuredClone(updated),
          drafts: structuredClone(drafts),
          preservedInput: null,
          errorKo: null,
        };
      } catch (error) {
        return recordFailure(
          error,
          '수정할 점 기록 추가에 실패했습니다.',
          {
            draftId,
            ideaLine: existing.ideaLine,
            pendingModificationPointKo: input.modificationPointKo,
          },
          input.now,
        );
      }
    },

    appendPhotoReference(
      draftId: string,
      input: Parameters<typeof addPhotoReferenceToDraft>[1],
    ): HumanDraftOperationResult {
      const existing = drafts.find((item) => item.id === draftId);
      if (!existing) {
        return recordFailure(
          new Error(`대상 초안(${draftId})을 찾을 수 없습니다.`),
          '대상 초안을 찾을 수 없습니다.',
          {
            draftId,
            pendingPhotoUri: input.localRefUri,
          },
          input.now,
        );
      }

      try {
        const updated = addPhotoReferenceToDraft(existing, input);
        const nextDrafts = drafts.map((item) => (item.id === draftId ? updated : item));
        drafts = nextDrafts;

        const storedOk = persistToStorage(
          nextDrafts,
          {
            draftId,
            ideaLine: existing.ideaLine,
            pendingPhotoUri: input.localRefUri,
          },
          input.now,
        );

        if (!storedOk) {
          return {
            ok: false,
            draft: structuredClone(updated),
            drafts: structuredClone(drafts),
            preservedInput: structuredClone(preservedInput),
            errorKo: lastErrorKo,
          };
        }

        preservedInput = null;
        lastErrorKo = null;
        return {
          ok: true,
          draft: structuredClone(updated),
          drafts: structuredClone(drafts),
          preservedInput: null,
          errorKo: null,
        };
      } catch (error) {
        return recordFailure(
          error,
          '사진 참조 추가에 실패했습니다.',
          {
            draftId,
            ideaLine: existing.ideaLine,
            pendingPhotoUri: input.localRefUri,
          },
          input.now,
        );
      }
    },

    refineMetadata(
      draftId: string,
      patch: Parameters<typeof refineHumanDraftMetadata>[1],
    ): HumanDraftOperationResult {
      const existing = drafts.find((item) => item.id === draftId);
      const pendingOverrides: DraftClassLinkOverrides = stripUndefined({
        workingNameKo: patch.workingNameKo,
        apparatus: patch.apparatus,
        sectionRole: patch.sectionRole,
        blockCategory: patch.blockCategory,
        level: patch.level,
        durationMin: patch.defaultDurationMin,
        repetitions: patch.defaultRepetitions,
        sets: patch.defaultSets,
        isUnilateral: patch.isUnilateral,
        sideMode: patch.sideMode,
        springs: patch.springs,
      });

      if (!existing) {
        return recordFailure(
          new Error(`대상 초안(${draftId})을 찾을 수 없습니다.`),
          '대상 초안을 찾을 수 없습니다.',
          {
            draftId,
            ideaLine: patch.ideaLine,
            workingNameKo: patch.workingNameKo,
            pendingOverrides,
          },
          patch.now,
        );
      }

      try {
        const updated = refineHumanDraftMetadata(existing, patch);
        const nextDrafts = drafts.map((item) => (item.id === draftId ? updated : item));
        drafts = nextDrafts;

        const storedOk = persistToStorage(
          nextDrafts,
          {
            draftId,
            ideaLine: patch.ideaLine ?? existing.ideaLine,
            workingNameKo: patch.workingNameKo ?? existing.workingNameKo,
            pendingOverrides,
          },
          patch.now,
        );

        if (!storedOk) {
          return {
            ok: false,
            draft: structuredClone(updated),
            drafts: structuredClone(drafts),
            preservedInput: structuredClone(preservedInput),
            errorKo: lastErrorKo,
          };
        }

        preservedInput = null;
        lastErrorKo = null;
        return {
          ok: true,
          draft: structuredClone(updated),
          drafts: structuredClone(drafts),
          preservedInput: null,
          errorKo: null,
        };
      } catch (error) {
        return recordFailure(
          error,
          '초안 세부 설정 수정에 실패했습니다.',
          {
            draftId,
            ideaLine: patch.ideaLine ?? existing.ideaLine,
            workingNameKo: patch.workingNameKo ?? existing.workingNameKo,
            pendingOverrides,
          },
          patch.now,
        );
      }
    },

    restoreRevision(
      draftId: string,
      targetRevision: number,
      now?: string,
    ): HumanDraftOperationResult {
      const existing = drafts.find((item) => item.id === draftId);
      if (!existing) {
        return recordFailure(
          new Error(`대상 초안(${draftId})을 찾을 수 없습니다.`),
          '대상 초안을 찾을 수 없습니다.',
          { draftId },
          now,
        );
      }

      try {
        const updated = restoreHumanDraftRevision(existing, targetRevision, now);
        const nextDrafts = drafts.map((item) => (item.id === draftId ? updated : item));
        drafts = nextDrafts;

        const storedOk = persistToStorage(
          nextDrafts,
          {
            draftId,
            ideaLine: existing.ideaLine,
          },
          now,
        );

        if (!storedOk) {
          return {
            ok: false,
            draft: structuredClone(updated),
            drafts: structuredClone(drafts),
            preservedInput: structuredClone(preservedInput),
            errorKo: lastErrorKo,
          };
        }

        preservedInput = null;
        lastErrorKo = null;
        return {
          ok: true,
          draft: structuredClone(updated),
          drafts: structuredClone(drafts),
          preservedInput: null,
          errorKo: null,
        };
      } catch (error) {
        return recordFailure(
          error,
          `v${targetRevision} 버전 복원에 실패했습니다.`,
          {
            draftId,
            ideaLine: existing.ideaLine,
          },
          now,
        );
      }
    },

    exportBackup(now?: string): string {
      const payload = humanCreationStoragePayloadSchema.parse({
        format: 'pilates-flow-human-creation-v1',
        version: 1,
        exportedAt: now ?? new Date().toISOString(),
        humanMovementDrafts: drafts.map((item) => stripUndefined(structuredClone(item))),
      });
      return JSON.stringify(payload, null, 2);
    },

    restoreBackup(rawJson: string | unknown, now?: string): HumanDraftOperationResult {
      try {
        const parsedJson: unknown = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
        const validated = humanCreationStoragePayloadSchema.parse(parsedJson);
        const restoredDrafts = validated.humanMovementDrafts.map((item) => {
          const parsedItem = humanMovementDraftSchema.parse(stripUndefined(structuredClone(item)));
          deepFreeze(parsedItem.revisionHistory);
          deepFreeze(parsedItem.safetyBoundary);
          return parsedItem;
        });

        drafts = restoredDrafts;
        const storedOk = persistToStorage(restoredDrafts, {}, now);
        if (!storedOk) {
          return {
            ok: false,
            drafts: structuredClone(drafts),
            preservedInput: structuredClone(preservedInput),
            errorKo: lastErrorKo,
          };
        }

        preservedInput = null;
        lastErrorKo = null;
        return {
          ok: true,
          drafts: structuredClone(drafts),
          preservedInput: null,
          errorKo: null,
        };
      } catch (error) {
        return recordFailure(
          error,
          '백업 데이터를 복원하는 중 형식 오류가 발생하여 기존 초안 상태를 유지했습니다.',
          {
            ideaLine: typeof rawJson === 'string' ? rawJson.slice(0, 200) : undefined,
          },
          now,
        );
      }
    },
  };
}
