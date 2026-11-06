import { getEquipmentFamily } from '../data/equipmentCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import type {
  ClassSequenceSnapshot,
  DraftRevisionEntry,
  HierarchyPilatesExercise,
  HumanMovementDraft,
  ReusableBlock,
} from '../types/hierarchy';
import type {
  ApparatusType,
  DifficultyLevel,
  LayerMode,
  PilatesExercise,
  SequenceStep,
  StepSideMode,
} from '../types/pilates';
import type { ClassSectionRole } from '../types/sequenceMotion';
import { exerciseRevision } from './exerciseReview';
import {
  type ReusableBlockTimingSummary,
  addItemToReusableBlock,
  addReusableBlockToLibrary,
  createClassSequenceSnapshot,
  createHumanDraftMovementSnapshot,
  createReusableBlock,
  insertReusableBlockIntoSequence,
  moveItemInReusableBlock,
  summarizeReusableBlockTiming,
} from './hierarchyModel';
import {
  DEFAULT_HUMAN_DRAFT_STORAGE_KEY,
  addModificationLogToDraft,
  addPhotoReferenceToDraft,
  addSubjectiveFeelToDraft,
  createHumanMovementIdeaDraft,
  forkHumanDraftVariant,
  refineHumanDraftMetadata,
  restoreHumanDraftRevision,
  updateHumanDraftVariants,
} from './humanMovementCreation';

export interface MovementIdeaMeta {
  exerciseId: string;
  ideaLine: string;
  workingTitle: string;
  subjectiveFeeling: string;
  adjustmentNote: string;
  photoDataUrl: string;
  triedByInstructor: boolean;
  createdAt: string;
  updatedAt: string;
  easyVariation?: string;
  standardVariation?: string;
  hardVariation?: string;
  variantLabelKo?: string;
  parentDraftId?: string;
  parentDraftRevision?: number;
  revision?: number;
  revisionHistory?: readonly DraftRevisionEntry[];
  repetitions?: number;
  sets?: number;
  sideMode?: StepSideMode;
  explanationSec?: number;
  transitionSec?: number;
  sectionRole?: ClassSectionRole;
}

export interface MovementIdeaWorkingBuffer {
  editingExerciseId: string | null;
  ideaLine: string;
  workingTitle: string;
  subjectiveFeeling: string;
  adjustmentNote: string;
  photoDataUrl: string;
  triedByInstructor: boolean;
  apparatus: ApparatusType | '';
  durationMin: string;
  level: DifficultyLevel | '';
  easyVariation?: string;
  hardVariation?: string;
  variantLabelKo?: string;
  repetitions?: string;
  sets?: string;
  sideMode?: StepSideMode | '';
  explanationSec?: string;
  transitionSec?: string;
  sectionRole?: ClassSectionRole | '';
  updatedAt: string;
}

export interface SaveMovementIdeaInput {
  existingExerciseId?: string | null;
  ideaLine: string;
  workingTitle?: string;
  subjectiveFeeling?: string;
  adjustmentNote?: string;
  photoDataUrl?: string;
  triedByInstructor?: boolean;
  apparatus?: ApparatusType | '';
  durationMin?: number;
  level?: DifficultyLevel | '';
  easyVariation?: string;
  standardVariation?: string;
  hardVariation?: string;
  variantLabelKo?: string;
  repetitions?: number;
  sets?: number;
  sideMode?: StepSideMode | '';
  explanationSec?: number;
  transitionSec?: number;
  sectionRole?: ClassSectionRole | '';
  simulateSaveError?: boolean;
}

const IDEA_META_STORAGE_KEY = 'pilates-flow-movement-idea-meta-v1';
const IDEA_BUFFER_STORAGE_KEY = 'pilates-flow-movement-idea-buffer-v1';
const IDEA_REUSABLE_BLOCKS_STORAGE_KEY = 'pilates-flow-movement-idea-reusable-blocks-v1';

const EMPTY_BUFFER: MovementIdeaWorkingBuffer = {
  editingExerciseId: null,
  ideaLine: '',
  workingTitle: '',
  subjectiveFeeling: '',
  adjustmentNote: '',
  photoDataUrl: '',
  triedByInstructor: false,
  apparatus: '',
  durationMin: '3',
  level: '',
  easyVariation: '',
  hardVariation: '',
  variantLabelKo: '',
  repetitions: '',
  sets: '',
  sideMode: '',
  explanationSec: '20',
  transitionSec: '15',
  sectionRole: '',
  updatedAt: '',
};

let inMemoryMetaMap: Record<string, MovementIdeaMeta> = {};
let inMemoryHumanDraftMap: Record<string, HumanMovementDraft> = {};
let inMemoryReusableBlocks: ReusableBlock[] = [];
let inMemoryBuffer: MovementIdeaWorkingBuffer = { ...EMPTY_BUFFER };
let activeSaveLock = false;

function readStorageJson<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return fallback;
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorageJson<T>(key: string, value: T): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Keep in-memory state intact even if storage quota or permission is restricted.
  }
}

function isSupportedLocalPhotoUri(uri: string): boolean {
  const trimmed = uri.trim();
  if (!trimmed) return false;
  if (/https?:\/\//i.test(trimmed)) {
    return /^data:image\/svg\+xml/i.test(trimmed);
  }
  return (
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('local-photo://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('asset://') ||
    trimmed.startsWith('file://')
  );
}

function persistHumanDraftMap(): void {
  writeStorageJson(DEFAULT_HUMAN_DRAFT_STORAGE_KEY, {
    format: 'pilates-flow-human-creation-v1',
    version: 1,
    exportedAt: new Date().toISOString(),
    humanMovementDrafts: Object.values(inMemoryHumanDraftMap),
    reusableBlocks: inMemoryReusableBlocks,
  });
}

export function isMovementIdeaExercise(exercise: PilatesExercise | undefined | null): boolean {
  if (!exercise) return false;
  return exercise.id.startsWith('ex-custom-idea-');
}

export function getMovementIdeaMetaMap(): Record<string, MovementIdeaMeta> {
  const stored = readStorageJson<Record<string, MovementIdeaMeta>>(IDEA_META_STORAGE_KEY, {});
  inMemoryMetaMap = { ...inMemoryMetaMap, ...stored };
  return inMemoryMetaMap;
}

export function getHumanDraftForIdeaExercise(exerciseId: string): HumanMovementDraft | undefined {
  return inMemoryHumanDraftMap[exerciseId];
}

export function getMovementIdeaMeta(exercise: PilatesExercise): MovementIdeaMeta {
  const map = getMovementIdeaMetaMap();
  const existing = map[exercise.id];
  const draft = inMemoryHumanDraftMap[exercise.id];
  if (existing) {
    if (draft) {
      return {
        ...existing,
        revision: draft.revision,
        revisionHistory: draft.revisionHistory,
        parentDraftId: draft.parentDraftId ?? existing.parentDraftId,
        parentDraftRevision: draft.parentDraftRevision ?? existing.parentDraftRevision,
        variantLabelKo: draft.variantLabelKo ?? existing.variantLabelKo,
        easyVariation: draft.layers?.easy ?? existing.easyVariation,
        standardVariation: draft.layers?.standard ?? existing.standardVariation,
        hardVariation: draft.layers?.hard ?? existing.hardVariation,
      };
    }
    return existing;
  }

  const ideaLine = exercise.cues[0] || exercise.nameKo;
  const adjustmentNote = exercise.layers?.standard || '';
  const subjectiveFeeling = exercise.precautions || '';
  return {
    exerciseId: exercise.id,
    ideaLine,
    workingTitle: exercise.nameKo,
    subjectiveFeeling,
    adjustmentNote,
    photoDataUrl: '',
    triedByInstructor: Boolean(subjectiveFeeling || adjustmentNote),
    createdAt: exercise.createdAt || new Date().toISOString(),
    updatedAt: exercise.createdAt || new Date().toISOString(),
    easyVariation: exercise.layers?.easy || '',
    standardVariation: exercise.layers?.standard || '',
    hardVariation: exercise.layers?.hard || '',
    revision: draft?.revision ?? 1,
    revisionHistory: draft?.revisionHistory ?? [],
  };
}

export function loadMovementIdeaWorkingBuffer(): MovementIdeaWorkingBuffer {
  const stored = readStorageJson<MovementIdeaWorkingBuffer | null>(IDEA_BUFFER_STORAGE_KEY, null);
  if (stored && typeof stored.ideaLine === 'string') {
    inMemoryBuffer = { ...EMPTY_BUFFER, ...stored };
  }
  return inMemoryBuffer;
}

export function saveMovementIdeaWorkingBuffer(
  partial: Partial<MovementIdeaWorkingBuffer>,
): MovementIdeaWorkingBuffer {
  inMemoryBuffer = {
    ...inMemoryBuffer,
    ...partial,
    updatedAt: new Date().toISOString(),
  };
  writeStorageJson(IDEA_BUFFER_STORAGE_KEY, inMemoryBuffer);
  return inMemoryBuffer;
}

export function clearMovementIdeaWorkingBuffer(): void {
  inMemoryBuffer = { ...EMPTY_BUFFER };
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(IDEA_BUFFER_STORAGE_KEY);
    }
  } catch {
    // Ignore storage removal errors.
  }
}

export function resetMovementIdeaStateForTests(): void {
  inMemoryMetaMap = {};
  inMemoryHumanDraftMap = {};
  inMemoryReusableBlocks = [];
  inMemoryBuffer = { ...EMPTY_BUFFER };
  activeSaveLock = false;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(IDEA_META_STORAGE_KEY);
      window.localStorage.removeItem(IDEA_BUFFER_STORAGE_KEY);
      window.localStorage.removeItem(IDEA_REUSABLE_BLOCKS_STORAGE_KEY);
      window.localStorage.removeItem(DEFAULT_HUMAN_DRAFT_STORAGE_KEY);
    }
  } catch {
    // Ignore in test cleanup.
  }
}

function buildDisplayTitle(ideaLine: string, workingTitle?: string, variantLabelKo?: string): string {
  const explicit = (workingTitle ?? '').trim();
  const baseTitle =
    explicit.length >= 2
      ? explicit.slice(0, 100)
      : (() => {
          const cleaned = ideaLine.trim().replace(/\s+/g, ' ');
          if (cleaned.length >= 2) {
            return cleaned.length > 42 ? `${cleaned.slice(0, 42)}…` : cleaned;
          }
          if (cleaned.length === 1) {
            return `${cleaned} 동작 메모`;
          }
          return '';
        })();

  const trimmedVariant = (variantLabelKo ?? '').trim();
  if (trimmedVariant && baseTitle && !baseTitle.includes(trimmedVariant)) {
    return `${baseTitle} (${trimmedVariant})`.slice(0, 120);
  }
  return baseTitle;
}

export function calculateIdeaStepTimeBreakdown(input: {
  durationMin: number;
  explanationSec?: number;
  transitionSec?: number;
}): {
  durationMin: number;
  totalSec: number;
  movementSec: number;
  explanationSec: number;
  transitionSec: number;
} {
  const safeDurationMin =
    Number.isFinite(input.durationMin) && input.durationMin >= 0.5 && input.durationMin <= 20
      ? input.durationMin
      : 3;
  const totalSec = Math.max(30, Math.round(safeDurationMin * 60));
  const rawExplanation =
    typeof input.explanationSec === 'number' && Number.isFinite(input.explanationSec)
      ? Math.max(0, Math.round(input.explanationSec))
      : 20;
  const rawTransition =
    typeof input.transitionSec === 'number' && Number.isFinite(input.transitionSec)
      ? Math.max(0, Math.round(input.transitionSec))
      : 15;
  const clampedExplanation = Math.min(rawExplanation, Math.max(0, totalSec - 10));
  const clampedTransition = Math.min(
    rawTransition,
    Math.max(0, totalSec - clampedExplanation - 10),
  );
  const movementSec = Math.max(0, totalSec - clampedExplanation - clampedTransition);
  return {
    durationMin: safeDurationMin,
    totalSec,
    movementSec,
    explanationSec: clampedExplanation,
    transitionSec: clampedTransition,
  };
}

function syncHumanDraftOnSave(
  exerciseId: string,
  input: {
    ideaLine: string;
    workingTitle?: string;
    subjectiveFeeling: string;
    adjustmentNote: string;
    photoDataUrl: string;
    apparatus?: ApparatusType;
    level?: DifficultyLevel;
    durationMin?: number;
    repetitions?: number;
    sets?: number;
    sideMode?: StepSideMode;
    sectionRole?: ClassSectionRole;
    easyVariation?: string;
    standardVariation?: string;
    hardVariation?: string;
    variantLabelKo?: string;
    now: string;
  },
): HumanMovementDraft {
  const existingDraft = inMemoryHumanDraftMap[exerciseId];
  const prevFeel = existingDraft?.feelLogs.at(-1)?.feelNoteKo ?? '';
  const prevMod = existingDraft?.modificationLogs.at(-1)?.modificationPointKo ?? '';
  const prevPhoto = existingDraft?.photoReferences.at(-1)?.localRefUri ?? '';

  if (!existingDraft) {
    let draft = createHumanMovementIdeaDraft({
      id: exerciseId,
      ideaLine: input.ideaLine,
      workingNameKo: input.workingTitle?.trim() || undefined,
      apparatus: input.apparatus,
      sectionRole: input.sectionRole,
      level: input.level,
      defaultDurationMin: input.durationMin,
      defaultRepetitions: input.repetitions,
      defaultSets: input.sets,
      isUnilateral: input.sideMode ? input.sideMode !== 'together' : undefined,
      sideMode: input.sideMode,
      now: input.now,
    });

    if (input.subjectiveFeeling) {
      draft = addSubjectiveFeelToDraft(draft, {
        feelNoteKo: input.subjectiveFeeling,
        now: input.now,
      });
    }
    if (input.adjustmentNote) {
      draft = addModificationLogToDraft(draft, {
        modificationPointKo: input.adjustmentNote,
        now: input.now,
      });
    }
    if (input.photoDataUrl && isSupportedLocalPhotoUri(input.photoDataUrl)) {
      draft = addPhotoReferenceToDraft(draft, {
        localRefUri: input.photoDataUrl,
        captionKo: '내 동작 참고 스케치',
        now: input.now,
      });
    }
    if (
      input.easyVariation?.trim() ||
      input.hardVariation?.trim() ||
      input.variantLabelKo?.trim()
    ) {
      draft = updateHumanDraftVariants(draft, {
        easy: input.easyVariation,
        standard: input.standardVariation || input.adjustmentNote || input.ideaLine,
        hard: input.hardVariation,
        variantLabelKo: input.variantLabelKo,
        now: input.now,
      });
    }

    inMemoryHumanDraftMap[exerciseId] = draft;
    persistHumanDraftMap();
    return draft;
  }

  let draft = existingDraft;
  let updatedOnce = false;

  if (input.subjectiveFeeling && input.subjectiveFeeling !== prevFeel) {
    draft = addSubjectiveFeelToDraft(draft, {
      feelNoteKo: input.subjectiveFeeling,
      now: input.now,
    });
    updatedOnce = true;
  }

  if (input.adjustmentNote && input.adjustmentNote !== prevMod) {
    draft = addModificationLogToDraft(draft, {
      modificationPointKo: input.adjustmentNote,
      now: input.now,
    });
    updatedOnce = true;
  }

  if (
    input.photoDataUrl &&
    input.photoDataUrl !== prevPhoto &&
    isSupportedLocalPhotoUri(input.photoDataUrl)
  ) {
    draft = addPhotoReferenceToDraft(draft, {
      localRefUri: input.photoDataUrl,
      captionKo: '내 동작 참고 스케치',
      now: input.now,
    });
    updatedOnce = true;
  }

  const prevEasy = draft.layers?.easy ?? '';
  const prevHard = draft.layers?.hard ?? '';
  const prevVariantLabel = draft.variantLabelKo ?? '';
  if (
    (input.easyVariation !== undefined && input.easyVariation.trim() !== prevEasy) ||
    (input.hardVariation !== undefined && input.hardVariation.trim() !== prevHard) ||
    (input.variantLabelKo !== undefined && input.variantLabelKo.trim() !== prevVariantLabel)
  ) {
    if (
      input.easyVariation?.trim() ||
      input.hardVariation?.trim() ||
      input.variantLabelKo?.trim() ||
      input.adjustmentNote?.trim()
    ) {
      draft = updateHumanDraftVariants(draft, {
        easy: input.easyVariation,
        standard: input.standardVariation || input.adjustmentNote || input.ideaLine,
        hard: input.hardVariation,
        variantLabelKo: input.variantLabelKo,
        now: input.now,
      });
      updatedOnce = true;
    }
  }

  const metadataChanged =
    input.ideaLine !== draft.ideaLine ||
    (input.workingTitle?.trim() || undefined) !== draft.workingNameKo ||
    (input.apparatus && input.apparatus !== draft.apparatus) ||
    (input.durationMin !== undefined && input.durationMin !== draft.defaultDurationMin) ||
    (input.repetitions !== undefined && input.repetitions !== draft.defaultRepetitions) ||
    (input.sets !== undefined && input.sets !== draft.defaultSets) ||
    (input.sideMode && input.sideMode !== draft.sideMode);

  if (metadataChanged || !updatedOnce) {
    draft = refineHumanDraftMetadata(draft, {
      ideaLine: input.ideaLine,
      workingNameKo: input.workingTitle?.trim() || undefined,
      apparatus: input.apparatus ?? draft.apparatus,
      sectionRole: input.sectionRole ?? draft.sectionRole,
      level: input.level ?? draft.level,
      defaultDurationMin: input.durationMin ?? draft.defaultDurationMin,
      defaultRepetitions: input.repetitions ?? draft.defaultRepetitions,
      defaultSets: input.sets ?? draft.defaultSets,
      isUnilateral: input.sideMode ? input.sideMode !== 'together' : draft.isUnilateral,
      sideMode: input.sideMode ?? draft.sideMode,
      now: input.now,
    });
  }

  inMemoryHumanDraftMap[exerciseId] = draft;
  persistHumanDraftMap();
  return draft;
}

export function saveMovementIdeaDraft(input: SaveMovementIdeaInput): {
  success: boolean;
  ok: boolean;
  exercise?: PilatesExercise;
  meta?: MovementIdeaMeta;
  draft?: HumanMovementDraft;
  error?: string;
} {
  if (activeSaveLock) {
    const state = usePilatesStore.getState();
    const existing = input.existingExerciseId
      ? state.exercises.find((item) => item.id === input.existingExerciseId)
      : state.exercises.find((item) => isMovementIdeaExercise(item));
    if (existing) {
      return {
        success: true,
        ok: true,
        exercise: existing,
        meta: getMovementIdeaMeta(existing),
        draft: inMemoryHumanDraftMap[existing.id],
      };
    }
  }

  const trimmedIdea = input.ideaLine.trim();
  if (!trimmedIdea) {
    return {
      success: false,
      ok: false,
      error: '떠오른 동작 아이디어를 한 줄로 적어 주세요.',
    };
  }

  if (input.simulateSaveError) {
    return {
      success: false,
      ok: false,
      error: '초안 저장을 완료하지 못했습니다. 작성한 내용은 그대로 유지되니 다시 시도해 주세요.',
    };
  }

  activeSaveLock = true;
  try {
    const state = usePilatesStore.getState();
    const now = new Date().toISOString();
    const existing = input.existingExerciseId
      ? state.exercises.find((item) => item.id === input.existingExerciseId)
      : undefined;
    const existingMeta = existing ? getMovementIdeaMeta(existing) : undefined;

    // Deduplicate rapid repeated clicks with the exact same 1-line idea within 2 seconds
    if (!existing) {
      const recentDuplicate = state.exercises.find((item) => {
        if (!isMovementIdeaExercise(item)) return false;
        const meta = getMovementIdeaMeta(item);
        const ageMs = Date.now() - new Date(meta.createdAt).getTime();
        return meta.ideaLine === trimmedIdea && ageMs >= 0 && ageMs < 2000;
      });
      if (recentDuplicate) {
        return {
          success: true,
          ok: true,
          exercise: recentDuplicate,
          meta: getMovementIdeaMeta(recentDuplicate),
          draft: inMemoryHumanDraftMap[recentDuplicate.id],
        };
      }
    }

    const fallbackEquipment =
      state.draftCriteria?.availableEquipment?.[0] ||
      (state.activeApparatus !== 'mixed' ? state.activeApparatus : undefined) ||
      state.ownedEquipment[0] ||
      'mat';
    const chosenApparatus: ApparatusType =
      input.apparatus ||
      existing?.apparatus ||
      getEquipmentFamily(fallbackEquipment) ||
      'mat';
    const requiredEquipment =
      input.apparatus
        ? [input.apparatus]
        : existing?.requiredEquipment?.length
          ? [...existing.requiredEquipment]
          : [fallbackEquipment];

    const durationMin =
      typeof input.durationMin === 'number' &&
      Number.isFinite(input.durationMin) &&
      input.durationMin >= 0.5 &&
      input.durationMin <= 20
        ? input.durationMin
        : existing?.defaultDurationMin ?? 3;

    const level: DifficultyLevel =
      input.level ||
      existing?.level ||
      state.draftCriteria?.level ||
      state.activeLevel ||
      '1.0';

    const variantLabelKo =
      input.variantLabelKo !== undefined
        ? input.variantLabelKo.trim()
        : existingMeta?.variantLabelKo ?? '';
    const nameKo = buildDisplayTitle(trimmedIdea, input.workingTitle, variantLabelKo);
    const subjectiveFeeling = (input.subjectiveFeeling ?? '').trim();
    const adjustmentNote = (input.adjustmentNote ?? '').trim();
    const photoDataUrl = (input.photoDataUrl ?? '').trim();
    const easyVariation =
      input.easyVariation !== undefined
        ? input.easyVariation.trim()
        : existing?.layers?.easy ?? '';
    const hardVariation =
      input.hardVariation !== undefined
        ? input.hardVariation.trim()
        : existing?.layers?.hard ?? '';
    const standardVariation =
      input.standardVariation !== undefined
        ? input.standardVariation.trim()
        : adjustmentNote;
    const repetitions =
      typeof input.repetitions === 'number' &&
      Number.isFinite(input.repetitions) &&
      input.repetitions >= 1
        ? Math.round(input.repetitions)
        : existingMeta?.repetitions;
    const sets =
      typeof input.sets === 'number' && Number.isFinite(input.sets) && input.sets >= 1
        ? Math.round(input.sets)
        : existingMeta?.sets;
    const sideMode: StepSideMode | undefined =
      input.sideMode || existingMeta?.sideMode || undefined;
    const explanationSec =
      typeof input.explanationSec === 'number' && Number.isFinite(input.explanationSec)
        ? Math.max(0, Math.round(input.explanationSec))
        : existingMeta?.explanationSec;
    const transitionSec =
      typeof input.transitionSec === 'number' && Number.isFinite(input.transitionSec)
        ? Math.max(0, Math.round(input.transitionSec))
        : existingMeta?.transitionSec;
    const sectionRole: ClassSectionRole | undefined =
      input.sectionRole || existingMeta?.sectionRole || undefined;

    const triedByInstructor = Boolean(
      input.triedByInstructor || subjectiveFeeling || adjustmentNote || photoDataUrl,
    );

    const exerciseId = existing?.id ?? `ex-custom-idea-${crypto.randomUUID()}`;
    const humanDraft = syncHumanDraftOnSave(exerciseId, {
      ideaLine: trimmedIdea,
      workingTitle: input.workingTitle,
      subjectiveFeeling,
      adjustmentNote,
      photoDataUrl,
      apparatus: input.apparatus || undefined,
      level: input.level || undefined,
      durationMin,
      repetitions,
      sets,
      sideMode,
      sectionRole,
      easyVariation,
      standardVariation,
      hardVariation,
      variantLabelKo,
      now,
    });

    const cues = [
      trimmedIdea,
      ...(adjustmentNote ? [`수정 메모: ${adjustmentNote}`] : []),
    ];
    const precautions = subjectiveFeeling
      ? `강사 주관적 느낌 메모 (전문가 검증·효과 보장 아님): ${subjectiveFeeling}`
      : existing?.precautions || '강사 직접 창작 초안 · 수업 전 개인별 상태를 직접 확인하세요.';

    const baseExercise: HierarchyPilatesExercise = {
      id: exerciseId,
      nameKo,
      nameEn: existing?.nameEn ?? '내 창작 동작 메모',
      apparatus: chosenApparatus,
      requiredEquipment,
      props: existing?.props?.length ? [...existing.props] : ['none'],
      blockCategory:
        sectionRole === 'preparation'
          ? 'warmup'
          : sectionRole === 'cooldown'
            ? 'cooldown'
            : existing?.blockCategory ?? 'core',
      spinalPlanes: existing?.spinalPlanes ?? [],
      bodyPosition: existing?.bodyPosition ?? 'supine',
      level,
      defaultDurationMin: durationMin,
      defaultRepetitions: repetitions,
      defaultSets: sets,
      isUnilateral: sideMode ? sideMode !== 'together' : existing?.isUnilateral ?? false,
      springs: existing?.springs ?? '',
      box: existing?.box ?? 'none',
      footbar: existing?.footbar ?? 'none',
      headrest: existing?.headrest ?? 'flat',
      targetMuscles: existing?.targetMuscles ?? [],
      breathPattern: existing?.breathPattern ?? '',
      cues,
      precautions,
      layers: {
        easy: easyVariation,
        standard: standardVariation,
        hard: hardVariation,
      },
      youtube: existing?.youtube ?? {
        videoId: '',
        channelName: '',
        videoTitle: '',
        url: '',
        startSec: 0,
      },
      favoriteTag: existing?.favoriteTag ?? 'none',
      isCustom: true,
      createdAt: existing?.createdAt ?? now,
      humanDraftId: humanDraft.id,
      humanDraftRevision: humanDraft.revision,
    };

    // Preserve self-check review if already approved or if instructor recorded their trial reflection
    if (existing?.review || triedByInstructor) {
      baseExercise.review = {
        status: 'approved',
        reviewerAlias: existing?.review?.reviewerAlias || '내 창작·직접 시도 메모',
        reviewedAt: now,
        revision: exerciseRevision(baseExercise),
        scope: 'planning-metadata',
        credentialVerified: false,
      };
    }

    try {
      if (existing) {
        usePilatesStore.setState((store) => ({
          exercises: store.exercises.map((item) =>
            item.id === baseExercise.id ? baseExercise : item,
          ),
        }));
      } else {
        usePilatesStore.getState().addCustomExercise(baseExercise);
      }
    } catch {
      return {
        success: false,
        ok: false,
        error:
          '저장에 실패했습니다. 작성 중인 내용은 이 화면에 그대로 보관되어 있습니다.',
      };
    }

    const meta: MovementIdeaMeta = {
      exerciseId: baseExercise.id,
      ideaLine: trimmedIdea,
      workingTitle: (input.workingTitle ?? '').trim(),
      subjectiveFeeling,
      adjustmentNote,
      photoDataUrl,
      triedByInstructor,
      createdAt: existingMeta ? existingMeta.createdAt : now,
      updatedAt: now,
      easyVariation,
      standardVariation,
      hardVariation,
      variantLabelKo,
      parentDraftId: humanDraft.parentDraftId ?? existingMeta?.parentDraftId,
      parentDraftRevision: humanDraft.parentDraftRevision ?? existingMeta?.parentDraftRevision,
      revision: humanDraft.revision,
      revisionHistory: humanDraft.revisionHistory,
      repetitions,
      sets,
      sideMode,
      explanationSec,
      transitionSec,
      sectionRole,
    };

    const nextMap = {
      ...getMovementIdeaMetaMap(),
      [baseExercise.id]: meta,
    };
    inMemoryMetaMap = nextMap;
    writeStorageJson(IDEA_META_STORAGE_KEY, nextMap);
    clearMovementIdeaWorkingBuffer();

    return {
      success: true,
      ok: true,
      exercise: baseExercise,
      meta,
      draft: humanDraft,
    };
  } finally {
    activeSaveLock = false;
  }
}

/**
 * Restores a previous revision (`v1`, `v2`, ...) non-destructively (creates `v(N+1)` with `parentRevision: targetRevision`)
 * and updates the live exercise & metadata without altering any past class snapshots.
 */
export function restoreMovementIdeaRevision(
  exerciseId: string,
  targetRevision: number,
): {
  success: boolean;
  ok: boolean;
  exercise?: PilatesExercise;
  meta?: MovementIdeaMeta;
  draft?: HumanMovementDraft;
  message: string;
} {
  const state = usePilatesStore.getState();
  const existing = state.exercises.find((item) => item.id === exerciseId);
  const existingDraft = inMemoryHumanDraftMap[exerciseId];
  if (!existing || !existingDraft) {
    return {
      success: false,
      ok: false,
      message: '복원할 초안 버전 정보를 찾을 수 없습니다.',
    };
  }

  try {
    const now = new Date().toISOString();
    const restoredDraft = restoreHumanDraftRevision(existingDraft, targetRevision, now);
    inMemoryHumanDraftMap[exerciseId] = restoredDraft;
    persistHumanDraftMap();

    const restoredFeel = restoredDraft.feelLogs.at(-1)?.feelNoteKo ?? '';
    const restoredMod = restoredDraft.modificationLogs.at(-1)?.modificationPointKo ?? '';
    const restoredPhoto = restoredDraft.photoReferences.at(-1)?.localRefUri ?? '';
    const restoredEasy = restoredDraft.layers?.easy ?? '';
    const restoredHard = restoredDraft.layers?.hard ?? '';
    const restoredStandard = restoredDraft.layers?.standard ?? restoredMod;
    const restoredVariantLabel = restoredDraft.variantLabelKo ?? '';
    const triedByInstructor = Boolean(restoredFeel || restoredMod || restoredPhoto);

    const nameKo = buildDisplayTitle(
      restoredDraft.ideaLine,
      restoredDraft.workingNameKo,
      restoredVariantLabel,
    );

    const updatedExercise: HierarchyPilatesExercise = {
      ...existing,
      nameKo,
      apparatus: restoredDraft.apparatus ?? existing.apparatus,
      level: restoredDraft.level ?? existing.level,
      defaultDurationMin: restoredDraft.defaultDurationMin ?? existing.defaultDurationMin,
      defaultRepetitions: restoredDraft.defaultRepetitions,
      defaultSets: restoredDraft.defaultSets,
      isUnilateral: restoredDraft.isUnilateral ?? existing.isUnilateral,
      cues: [
        restoredDraft.ideaLine,
        ...(restoredMod ? [`수정 메모: ${restoredMod}`] : []),
      ],
      precautions: restoredFeel
        ? `강사 주관적 느낌 메모 (전문가 검증·효과 보장 아님): ${restoredFeel}`
        : '강사 직접 창작 초안 · 수업 전 개인별 상태를 직접 확인하세요.',
      layers: {
        easy: restoredEasy,
        standard: restoredStandard,
        hard: restoredHard,
      },
      humanDraftId: restoredDraft.id,
      humanDraftRevision: restoredDraft.revision,
    };

    if (existing.review || triedByInstructor) {
      updatedExercise.review = {
        status: 'approved',
        reviewerAlias: existing.review?.reviewerAlias || '내 창작·직접 시도 메모',
        reviewedAt: now,
        revision: exerciseRevision(updatedExercise),
        scope: 'planning-metadata',
        credentialVerified: false,
      };
    }

    usePilatesStore.setState((store) => ({
      exercises: store.exercises.map((item) =>
        item.id === updatedExercise.id ? updatedExercise : item,
      ),
    }));

    const prevMeta = getMovementIdeaMeta(existing);
    const nextMeta: MovementIdeaMeta = {
      ...prevMeta,
      ideaLine: restoredDraft.ideaLine,
      workingTitle: restoredDraft.workingNameKo ?? '',
      subjectiveFeeling: restoredFeel,
      adjustmentNote: restoredMod,
      photoDataUrl: restoredPhoto,
      triedByInstructor,
      updatedAt: now,
      easyVariation: restoredEasy,
      standardVariation: restoredStandard,
      hardVariation: restoredHard,
      variantLabelKo: restoredVariantLabel,
      parentDraftId: restoredDraft.parentDraftId,
      parentDraftRevision: restoredDraft.parentDraftRevision,
      revision: restoredDraft.revision,
      revisionHistory: restoredDraft.revisionHistory,
      repetitions: restoredDraft.defaultRepetitions,
      sets: restoredDraft.defaultSets,
      sideMode: restoredDraft.sideMode,
      sectionRole: restoredDraft.sectionRole,
    };

    const nextMap = {
      ...getMovementIdeaMetaMap(),
      [updatedExercise.id]: nextMeta,
    };
    inMemoryMetaMap = nextMap;
    writeStorageJson(IDEA_META_STORAGE_KEY, nextMap);

    return {
      success: true,
      ok: true,
      exercise: updatedExercise,
      meta: nextMeta,
      draft: restoredDraft,
      message: `v${targetRevision} 버전 내용을 새 리비전(v${restoredDraft.revision})으로 복원했습니다. (이전 이력과 과거 수업 기록은 모두 보존됩니다)`,
    };
  } catch (error) {
    return {
      success: false,
      ok: false,
      message:
        error instanceof Error ? error.message : '선택한 버전으로 복원하지 못했습니다.',
    };
  }
}

/**
 * Forks a new independent variant movement draft from an existing idea exercise (`forkHumanDraftVariant`),
 * keeping the original movement and any past class snapshots untouched.
 */
export function forkMovementIdeaVariant(
  sourceExerciseId: string,
  input: {
    variantLabelKo: string;
    ideaLine?: string;
    workingTitle?: string;
    easyVariation?: string;
    standardVariation?: string;
    hardVariation?: string;
    apparatus?: ApparatusType | '';
    durationMin?: number;
    level?: DifficultyLevel | '';
  },
): {
  success: boolean;
  ok: boolean;
  exercise?: PilatesExercise;
  meta?: MovementIdeaMeta;
  draft?: HumanMovementDraft;
  message: string;
} {
  const state = usePilatesStore.getState();
  const sourceEx = state.exercises.find((item) => item.id === sourceExerciseId);
  if (!sourceEx) {
    return {
      success: false,
      ok: false,
      message: '변형을 파생할 원본 동작 초안을 찾을 수 없습니다.',
    };
  }

  const trimmedLabel = input.variantLabelKo.trim();
  if (!trimmedLabel) {
    return {
      success: false,
      ok: false,
      message: '새 변형 초안의 구분 이름(예: 쉬운 변형, 리포머 변형)을 적어 주세요.',
    };
  }

  const sourceMeta = getMovementIdeaMeta(sourceEx);
  const sourceDraft =
    inMemoryHumanDraftMap[sourceExerciseId] ??
    createHumanMovementIdeaDraft({
      id: sourceExerciseId,
      ideaLine: sourceMeta.ideaLine,
      workingNameKo: sourceMeta.workingTitle || undefined,
      apparatus: sourceEx.apparatus,
      level: sourceEx.level,
      defaultDurationMin: sourceEx.defaultDurationMin,
    });

  const now = new Date().toISOString();
  const newExerciseId = `ex-custom-idea-${crypto.randomUUID()}`;

  try {
    const branchedDraft = forkHumanDraftVariant(sourceDraft, {
      id: newExerciseId,
      variantLabelKo: trimmedLabel,
      ideaLine: input.ideaLine?.trim() || sourceDraft.ideaLine,
      workingNameKo: input.workingTitle?.trim() || sourceDraft.workingNameKo,
      apparatus: input.apparatus || sourceDraft.apparatus,
      level: input.level || sourceDraft.level,
      defaultDurationMin: input.durationMin ?? sourceDraft.defaultDurationMin,
      layers: {
        easy: input.easyVariation ?? sourceMeta.easyVariation ?? sourceEx.layers.easy,
        standard:
          input.standardVariation ?? sourceMeta.adjustmentNote ?? sourceEx.layers.standard,
        hard: input.hardVariation ?? sourceMeta.hardVariation ?? sourceEx.layers.hard,
      },
      now,
    });

    inMemoryHumanDraftMap[newExerciseId] = branchedDraft;
    persistHumanDraftMap();

    const nameKo = buildDisplayTitle(
      branchedDraft.ideaLine,
      branchedDraft.workingNameKo,
      trimmedLabel,
    );

    const newExercise: HierarchyPilatesExercise = {
      ...structuredClone(sourceEx),
      id: newExerciseId,
      nameKo,
      apparatus: branchedDraft.apparatus ?? sourceEx.apparatus,
      level: branchedDraft.level ?? sourceEx.level,
      defaultDurationMin: branchedDraft.defaultDurationMin ?? sourceEx.defaultDurationMin,
      cues: [
        branchedDraft.ideaLine,
        ...(sourceMeta.adjustmentNote ? [`수정 메모: ${sourceMeta.adjustmentNote}`] : []),
      ],
      layers: {
        easy: branchedDraft.layers?.easy ?? '',
        standard: branchedDraft.layers?.standard ?? sourceMeta.adjustmentNote,
        hard: branchedDraft.layers?.hard ?? '',
      },
      isCustom: true,
      createdAt: now,
      humanDraftId: branchedDraft.id,
      humanDraftRevision: branchedDraft.revision,
    };

    newExercise.review = {
      status: 'approved',
      reviewerAlias: '내 창작·변형 파생 메모',
      reviewedAt: now,
      revision: exerciseRevision(newExercise),
      scope: 'planning-metadata',
      credentialVerified: false,
    };

    usePilatesStore.getState().addCustomExercise(newExercise);

    const newMeta: MovementIdeaMeta = {
      ...sourceMeta,
      exerciseId: newExerciseId,
      ideaLine: branchedDraft.ideaLine,
      workingTitle: branchedDraft.workingNameKo ?? sourceMeta.workingTitle,
      easyVariation: branchedDraft.layers?.easy ?? '',
      standardVariation: branchedDraft.layers?.standard ?? '',
      hardVariation: branchedDraft.layers?.hard ?? '',
      variantLabelKo: trimmedLabel,
      parentDraftId: sourceDraft.id,
      parentDraftRevision: sourceDraft.revision,
      revision: branchedDraft.revision,
      revisionHistory: branchedDraft.revisionHistory,
      createdAt: now,
      updatedAt: now,
    };

    const nextMap = {
      ...getMovementIdeaMetaMap(),
      [newExerciseId]: newMeta,
    };
    inMemoryMetaMap = nextMap;
    writeStorageJson(IDEA_META_STORAGE_KEY, nextMap);

    return {
      success: true,
      ok: true,
      exercise: newExercise,
      meta: newMeta,
      draft: branchedDraft,
      message: `‘${nameKo}’ 새 변형 초안(원본 v${sourceDraft.revision} 기반)을 복제해 저장했습니다.`,
    };
  } catch (error) {
    return {
      success: false,
      ok: false,
      message:
        error instanceof Error ? error.message : '변형 초안 파생 저장에 실패했습니다.',
    };
  }
}

export function getSavedReusableBlocks(): ReusableBlock[] {
  const stored = readStorageJson<ReusableBlock[]>(IDEA_REUSABLE_BLOCKS_STORAGE_KEY, []);
  if (stored.length > 0 && inMemoryReusableBlocks.length === 0) {
    inMemoryReusableBlocks = stored;
  }
  return inMemoryReusableBlocks;
}

export function getReusableBlockTimingSummary(block: ReusableBlock): ReusableBlockTimingSummary {
  const state = usePilatesStore.getState();
  return summarizeReusableBlockTiming(
    block,
    state.exercises,
    Object.values(inMemoryHumanDraftMap),
  );
}

/**
 * Creates a new `ReusableBlock` or adds a movement idea to an existing `ReusableBlock` (`동작 → 재사용 블록`).
 * Editing a reusable block increments `block.version` and never mutates already-inserted sequence steps or past classes.
 */
export function saveIdeaToReusableBlock(input: {
  exerciseId: string;
  blockId?: string;
  blockTitle?: string;
  sectionRole?: ClassSectionRole;
  durationMin?: number;
  explanationSec?: number;
  transitionSec?: number;
  repetitions?: number;
  sets?: number;
  sideMode?: StepSideMode;
}): {
  success: boolean;
  ok: boolean;
  block?: ReusableBlock;
  blocks: ReusableBlock[];
  timingSummary?: ReusableBlockTimingSummary;
  message: string;
} {
  const state = usePilatesStore.getState();
  const exercise = state.exercises.find((item) => item.id === input.exerciseId);
  if (!exercise) {
    return {
      success: false,
      ok: false,
      blocks: getSavedReusableBlocks(),
      message: '재사용 블록에 담을 동작 초안을 먼저 저장해 주세요.',
    };
  }

  const meta = getMovementIdeaMeta(exercise);
  const humanDraft =
    inMemoryHumanDraftMap[exercise.id] ??
    createHumanMovementIdeaDraft({
      id: exercise.id,
      ideaLine: meta.ideaLine,
      workingNameKo: meta.workingTitle || undefined,
      apparatus: exercise.apparatus,
      level: exercise.level,
      defaultDurationMin: exercise.defaultDurationMin,
    });
  inMemoryHumanDraftMap[exercise.id] = humanDraft;

  const durationMin = input.durationMin ?? exercise.defaultDurationMin ?? 3;
  const timing = calculateIdeaStepTimeBreakdown({
    durationMin,
    explanationSec: input.explanationSec ?? meta.explanationSec,
    transitionSec: input.transitionSec ?? meta.transitionSec,
  });
  const repetitions = input.repetitions ?? meta.repetitions;
  const sets = input.sets ?? meta.sets;
  const sideMode: StepSideMode =
    input.sideMode ?? meta.sideMode ?? (exercise.isUnilateral ? 'left-then-right' : 'together');
  const sectionRole: ClassSectionRole =
    input.sectionRole ?? meta.sectionRole ?? 'main';

  const currentBlocks = getSavedReusableBlocks();
  const existingBlock = input.blockId
    ? currentBlocks.find((item) => item.id === input.blockId)
    : undefined;

  try {
    let targetBlock: ReusableBlock;
    if (existingBlock) {
      const snapshot = createHumanDraftMovementSnapshot(humanDraft, {
        apparatus: exercise.apparatus,
        sectionRole,
        durationMin: timing.durationMin,
        repetitions,
        sets,
        isUnilateral: sideMode !== 'together',
        sideMode,
      });
      targetBlock = addItemToReusableBlock(
        existingBlock,
        {
          exerciseId: exercise.id,
          durationMin: timing.durationMin,
          explanationSec: timing.explanationSec,
          transitionSec: timing.transitionSec,
          repetitions,
          sets,
          sideMode,
          selectedLayer: 'standard',
          exerciseSnapshot: snapshot,
          humanDraftId: humanDraft.id,
          humanDraftRevision: humanDraft.revision,
          humanDrafts: Object.values(inMemoryHumanDraftMap),
        },
        state.exercises,
        Object.values(inMemoryHumanDraftMap),
      );
    } else {
      const title =
        (input.blockTitle ?? '').trim() || `${exercise.nameKo} 재사용 블록`;
      targetBlock = createReusableBlock(
        {
          title,
          sectionRole,
          items: [
            {
              exerciseId: exercise.id,
              blockCategory: exercise.blockCategory,
              durationMin: timing.durationMin,
              explanationSec: timing.explanationSec,
              transitionSec: timing.transitionSec,
              repetitions,
              sets,
              sideMode,
              selectedLayer: 'standard',
              humanDraftId: humanDraft.id,
              humanDraftRevision: humanDraft.revision,
            },
          ],
          humanDrafts: Object.values(inMemoryHumanDraftMap),
        },
        state.exercises,
        Object.values(inMemoryHumanDraftMap),
      );
    }

    inMemoryReusableBlocks = addReusableBlockToLibrary(currentBlocks, targetBlock);
    writeStorageJson(IDEA_REUSABLE_BLOCKS_STORAGE_KEY, inMemoryReusableBlocks);
    persistHumanDraftMap();

    const timingSummary = getReusableBlockTimingSummary(targetBlock);
    return {
      success: true,
      ok: true,
      block: targetBlock,
      blocks: inMemoryReusableBlocks,
      timingSummary,
      message: existingBlock
        ? `‘${targetBlock.title}’ 블록(v${targetBlock.version})에 동작을 추가했습니다. (기존 수업 시퀀스 복사본과 과거 수업은 변경되지 않습니다)`
        : `‘${targetBlock.title}’ 재사용 블록(v1 · 총 ${timingSummary.totalDurationMin}분)을 만들었습니다.`,
    };
  } catch (error) {
    return {
      success: false,
      ok: false,
      blocks: currentBlocks,
      message:
        error instanceof Error ? error.message : '재사용 블록 저장에 실패했습니다.',
    };
  }
}

export function moveIdeaReusableBlockItem(
  blockId: string,
  itemIndex: number,
  direction: 'up' | 'down',
): {
  success: boolean;
  ok: boolean;
  block?: ReusableBlock;
  blocks: ReusableBlock[];
  timingSummary?: ReusableBlockTimingSummary;
  message: string;
} {
  const currentBlocks = getSavedReusableBlocks();
  const found = currentBlocks.find((item) => item.id === blockId);
  if (!found) {
    return {
      success: false,
      ok: false,
      blocks: currentBlocks,
      message: '순서를 변경할 재사용 블록을 찾을 수 없습니다.',
    };
  }

  try {
    const updatedBlock = moveItemInReusableBlock(found, itemIndex, direction);
    inMemoryReusableBlocks = addReusableBlockToLibrary(currentBlocks, updatedBlock);
    writeStorageJson(IDEA_REUSABLE_BLOCKS_STORAGE_KEY, inMemoryReusableBlocks);
    persistHumanDraftMap();
    const timingSummary = getReusableBlockTimingSummary(updatedBlock);
    return {
      success: true,
      ok: true,
      block: updatedBlock,
      blocks: inMemoryReusableBlocks,
      timingSummary,
      message: `‘${updatedBlock.title}’ 블록 순서를 변경했습니다 (v${updatedBlock.version}). 이미 수업에 넣은 복사본과 과거 수업은 바뀌지 않습니다.`,
    };
  } catch (error) {
    return {
      success: false,
      ok: false,
      blocks: currentBlocks,
      message: error instanceof Error ? error.message : '블록 순서 변경에 실패했습니다.',
    };
  }
}

/**
 * Copies a `ReusableBlock` into the current class sequence (`재사용 블록 → 시퀀스`) with an isolated `blockInstanceId`.
 * Subsequent edits to the block template or sequence steps never mutate each other or past classes.
 */
export function insertIdeaReusableBlockToCurrentClass(blockId: string): {
  success: boolean;
  ok: boolean;
  blockInstanceId?: string;
  addedStepCount: number;
  message: string;
} {
  const currentBlocks = getSavedReusableBlocks();
  const block = currentBlocks.find((item) => item.id === blockId);
  if (!block) {
    return {
      success: false,
      ok: false,
      addedStepCount: 0,
      message: '수업에 넣을 재사용 블록을 찾을 수 없습니다.',
    };
  }

  const state = usePilatesStore.getState();
  const inserted = insertReusableBlockIntoSequence(state.activeSteps, block);
  const blockApparatusList =
    block.apparatus === 'mixed'
      ? ['mat', 'reformer']
      : [block.apparatus];
  const nextOwnedEquipment = Array.from(
    new Set([...state.ownedEquipment, ...blockApparatusList]),
  );

  usePilatesStore.setState({
    activeSteps: inserted.steps,
    ownedEquipment: nextOwnedEquipment,
    generationError: null,
    saveFeedback: `‘${block.title}’ 재사용 블록(v${block.version}) 복사본을 현재 수업 시퀀스에 추가했습니다.`,
  });

  return {
    success: true,
    ok: true,
    blockInstanceId: inserted.blockInstanceId,
    addedStepCount: block.items.length,
    message: `‘${block.title}’ 재사용 블록(${block.items.length}개 동작)을 현재 수업 시퀀스에 복사해 넣었습니다.`,
  };
}

/**
 * Captures a deep-frozen `ClassSequenceSnapshot` (`시퀀스 → 수업`) of the current class so that any future
 * modifications to movement drafts, variants, or reusable blocks never alter past classes.
 */
export function captureCurrentClassHierarchySnapshot(title?: string): ClassSequenceSnapshot {
  const state = usePilatesStore.getState();
  return createClassSequenceSnapshot(
    {
      id: `seq-${Date.now()}`,
      title: title || state.activeTitle || '내 필라테스 수업',
      subtitle: '강사 창작 동작 포함 수업 스냅샷',
      apparatus: state.activeApparatus,
      level: state.activeLevel,
      targetMinutes: state.activeTargetMinutes,
      steps: state.activeSteps,
      humanDrafts: Object.values(inMemoryHumanDraftMap),
    },
    state.exercises,
    undefined,
    Object.values(inMemoryHumanDraftMap),
  );
}

/**
 * Adds a user-created movement idea directly to the current class sequence (`activeSteps`)
 * without blocking it behind "catalog-only" or mismatched equipment filters, while keeping
 * `credentialVerified: false` so it never claims expert certification or medical/AI guarantee.
 */
export function addMovementIdeaToCurrentClass(exerciseId: string): {
  success: boolean;
  ok: boolean;
  alreadyAdded?: boolean;
  message: string;
} {
  const state = usePilatesStore.getState();
  const found = state.exercises.find((item) => item.id === exerciseId);
  if (!found) {
    return {
      success: false,
      ok: false,
      message: '초안 동작을 찾지 못했습니다. 다시 저장해 주세요.',
    };
  }

  const meta = getMovementIdeaMeta(found);
  const humanDraft = inMemoryHumanDraftMap[found.id];
  const stepNoteParts = [
    ...(meta.subjectiveFeeling ? [`[느낌] ${meta.subjectiveFeeling}`] : []),
    ...(meta.adjustmentNote ? [`[수정] ${meta.adjustmentNote}`] : []),
    ...(meta.variantLabelKo ? [`[변형] ${meta.variantLabelKo}`] : []),
  ];
  const combinedInstructorNote = stepNoteParts.join(' · ');

  const timing = calculateIdeaStepTimeBreakdown({
    durationMin: found.defaultDurationMin || 3,
    explanationSec: meta.explanationSec,
    transitionSec: meta.transitionSec,
  });

  // Ensure instructor self-check metadata is recorded with credentialVerified: false
  const now = new Date().toISOString();
  const baseWithPrecautions: HierarchyPilatesExercise = {
    ...found,
    precautions:
      found.precautions.trim() ||
      '강사 직접 창작 메모 · 객관적 효과 판정이나 전문가 검증이 아닙니다.',
    humanDraftId: humanDraft?.id ?? found.id,
    humanDraftRevision: humanDraft?.revision ?? meta.revision ?? 1,
  };
  const checkedExercise: HierarchyPilatesExercise = {
    ...baseWithPrecautions,
    review: {
      status: 'approved',
      reviewerAlias: found.review?.reviewerAlias || '내 창작·직접 시도 메모',
      reviewedAt: now,
      revision: exerciseRevision(baseWithPrecautions),
      scope: 'planning-metadata',
      credentialVerified: false,
    },
  };

  const embeddedSnapshot = humanDraft
    ? createHumanDraftMovementSnapshot(humanDraft, {
        apparatus: checkedExercise.apparatus,
        durationMin: timing.durationMin,
        repetitions: meta.repetitions,
        sets: meta.sets,
        sideMode: meta.sideMode,
      })
    : undefined;

  // Idempotent if already in activeSteps: update the exercise and step note in store and return success
  const alreadyInSteps = state.activeSteps.some((step) => step.exerciseId === exerciseId);
  if (alreadyInSteps) {
    usePilatesStore.setState((store) => ({
      exercises: store.exercises.map((item) =>
        item.id === checkedExercise.id ? checkedExercise : item,
      ),
      activeSteps: store.activeSteps.map((step) =>
        step.exerciseId === checkedExercise.id
          ? {
              ...step,
              durationMin: timing.durationMin,
              explanationSec: timing.explanationSec,
              transitionSec: timing.transitionSec,
              ...(meta.repetitions !== undefined ? { repetitions: meta.repetitions } : {}),
              ...(meta.sets !== undefined ? { sets: meta.sets } : {}),
              ...(meta.sideMode ? { sideMode: meta.sideMode } : {}),
              ...(combinedInstructorNote ? { instructorNote: combinedInstructorNote } : {}),
              ...(embeddedSnapshot ? { exerciseSnapshot: embeddedSnapshot } : {}),
              humanDraftId: checkedExercise.humanDraftId,
              humanDraftRevision: checkedExercise.humanDraftRevision,
            }
          : step,
      ),
      generationError: null,
      saveFeedback: `‘${checkedExercise.nameKo}’ 수정 내용을 현재 수업 시퀀스에 반영했습니다.`,
    }));
    return {
      success: true,
      ok: true,
      alreadyAdded: true,
      message: `‘${checkedExercise.nameKo}’ 수정 내용을 현재 수업에 반영했습니다.`,
    };
  }

  // First update the exercise and ensure ownedEquipment includes its equipment so store never blocks user-created movements
  const reqEq = checkedExercise.requiredEquipment ?? [checkedExercise.apparatus];
  const nextOwnedEquipment = Array.from(new Set([...state.ownedEquipment, ...reqEq]));
  const nextOwnedApparatus = Array.from(
    new Set([...state.ownedApparatus, checkedExercise.apparatus]),
  );

  usePilatesStore.setState((store) => ({
    exercises: store.exercises.map((item) =>
      item.id === checkedExercise.id ? checkedExercise : item,
    ),
    ownedEquipment: nextOwnedEquipment,
    ownedApparatus: nextOwnedApparatus,
    generationError: null,
  }));

  // Try standard store append first
  usePilatesStore.getState().appendExerciseToSequence(checkedExercise.id, checkedExercise.blockCategory);
  const afterAppend = usePilatesStore.getState();
  if (afterAppend.activeSteps.some((step) => step.exerciseId === checkedExercise.id)) {
    usePilatesStore.setState((store) => ({
      activeSteps: store.activeSteps.map((step) =>
        step.exerciseId === checkedExercise.id
          ? {
              ...step,
              durationMin: timing.durationMin,
              explanationSec: timing.explanationSec,
              transitionSec: timing.transitionSec,
              ...(meta.repetitions !== undefined ? { repetitions: meta.repetitions } : {}),
              ...(meta.sets !== undefined ? { sets: meta.sets } : {}),
              ...(meta.sideMode ? { sideMode: meta.sideMode } : {}),
              ...(combinedInstructorNote ? { instructorNote: combinedInstructorNote } : {}),
              ...(embeddedSnapshot ? { exerciseSnapshot: embeddedSnapshot } : {}),
              humanDraftId: checkedExercise.humanDraftId,
              humanDraftRevision: checkedExercise.humanDraftRevision,
            }
          : step,
      ),
      generationError: null,
      saveFeedback: `‘${checkedExercise.nameKo}’ 동작을 현재 수업에 넣었습니다. (내 창작 메모 · 전문가 검증 아님)`,
    }));
    return {
      success: true,
      ok: true,
      message: `‘${checkedExercise.nameKo}’ 동작을 현재 수업에 넣었습니다.`,
    };
  }

  // Fallback: if draftCriteria had a different apparatus/level filter, append directly to activeSteps
  // so the instructor's own movement is never blocked by catalog-only or criteria filters.
  const newStep: SequenceStep = {
    stepId: `step-idea-${crypto.randomUUID()}`,
    order: afterAppend.activeSteps.length + 1,
    blockCategory: checkedExercise.blockCategory,
    exerciseId: checkedExercise.id,
    durationMin: timing.durationMin,
    selectedLayer: 'standard' as LayerMode,
    explanationSec: timing.explanationSec,
    transitionSec: afterAppend.activeSteps.length === 0 ? 0 : timing.transitionSec,
    ...(meta.repetitions !== undefined ? { repetitions: meta.repetitions } : {}),
    ...(meta.sets !== undefined ? { sets: meta.sets } : {}),
    ...(meta.sideMode ? { sideMode: meta.sideMode } : {}),
    ...(combinedInstructorNote ? { instructorNote: combinedInstructorNote } : {}),
    ...(embeddedSnapshot ? { exerciseSnapshot: embeddedSnapshot } : {}),
    humanDraftId: checkedExercise.humanDraftId,
    humanDraftRevision: checkedExercise.humanDraftRevision,
  };

  usePilatesStore.setState((store) => ({
    activeSteps: [...store.activeSteps, newStep],
    generationError: null,
    saveFeedback: `‘${checkedExercise.nameKo}’ 동작을 현재 수업에 넣었습니다. (내 창작 메모 · 전문가 검증 아님)`,
  }));

  return {
    success: true,
    ok: true,
    message: `‘${checkedExercise.nameKo}’ 동작을 현재 수업에 넣었습니다.`,
  };
}

export const readMovementIdeaDraft = getMovementIdeaMeta;
export const clearIdeaWorkingBuffer = clearMovementIdeaWorkingBuffer;
export const readIdeaWorkingBuffer = loadMovementIdeaWorkingBuffer;
export const saveMovementIdeaToStore = saveMovementIdeaDraft;
