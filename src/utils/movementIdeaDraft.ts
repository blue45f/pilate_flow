import { getEquipmentFamily } from '../data/equipmentCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import type { ApparatusType, DifficultyLevel, PilatesExercise, SequenceStep } from '../types/pilates';
import { exerciseRevision } from './exerciseReview';

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
  simulateSaveError?: boolean;
}

const IDEA_META_STORAGE_KEY = 'pilates-flow-movement-idea-meta-v1';
const IDEA_BUFFER_STORAGE_KEY = 'pilates-flow-movement-idea-buffer-v1';

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
  updatedAt: '',
};

let inMemoryMetaMap: Record<string, MovementIdeaMeta> = {};
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

export function isMovementIdeaExercise(exercise: PilatesExercise | undefined | null): boolean {
  if (!exercise) return false;
  return exercise.id.startsWith('ex-custom-idea-');
}

export function getMovementIdeaMetaMap(): Record<string, MovementIdeaMeta> {
  const stored = readStorageJson<Record<string, MovementIdeaMeta>>(IDEA_META_STORAGE_KEY, {});
  inMemoryMetaMap = { ...inMemoryMetaMap, ...stored };
  return inMemoryMetaMap;
}

export function getMovementIdeaMeta(exercise: PilatesExercise): MovementIdeaMeta {
  const map = getMovementIdeaMetaMap();
  const existing = map[exercise.id];
  if (existing) return existing;

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
  inMemoryBuffer = { ...EMPTY_BUFFER };
  activeSaveLock = false;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(IDEA_META_STORAGE_KEY);
      window.localStorage.removeItem(IDEA_BUFFER_STORAGE_KEY);
    }
  } catch {
    // Ignore in test cleanup.
  }
}

function buildDisplayTitle(ideaLine: string, workingTitle?: string): string {
  const explicit = (workingTitle ?? '').trim();
  if (explicit.length >= 2) return explicit.slice(0, 120);
  const cleaned = ideaLine.trim().replace(/\s+/g, ' ');
  if (cleaned.length >= 2) {
    return cleaned.length > 42 ? `${cleaned.slice(0, 42)}…` : cleaned;
  }
  if (cleaned.length === 1) {
    return `${cleaned} 동작 메모`;
  }
  return '';
}

export function saveMovementIdeaDraft(input: SaveMovementIdeaInput): {
  success: boolean;
  ok: boolean;
  exercise?: PilatesExercise;
  meta?: MovementIdeaMeta;
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

    const nameKo = buildDisplayTitle(trimmedIdea, input.workingTitle);
    const subjectiveFeeling = (input.subjectiveFeeling ?? '').trim();
    const adjustmentNote = (input.adjustmentNote ?? '').trim();
    const photoDataUrl = (input.photoDataUrl ?? '').trim();
    const triedByInstructor = Boolean(
      input.triedByInstructor || subjectiveFeeling || adjustmentNote || photoDataUrl,
    );

    const cues = [
      trimmedIdea,
      ...(adjustmentNote ? [`수정 메모: ${adjustmentNote}`] : []),
    ];
    const precautions = subjectiveFeeling
      ? `강사 주관적 느낌 메모 (전문가 검증·효과 보장 아님): ${subjectiveFeeling}`
      : existing?.precautions || '강사 직접 창작 초안 · 수업 전 개인별 상태를 직접 확인하세요.';

    const baseExercise: PilatesExercise = {
      id: existing?.id ?? `ex-custom-idea-${crypto.randomUUID()}`,
      nameKo,
      nameEn: existing?.nameEn ?? '내 창작 동작 메모',
      apparatus: chosenApparatus,
      requiredEquipment,
      props: existing?.props?.length ? [...existing.props] : ['none'],
      blockCategory: existing?.blockCategory ?? 'core',
      spinalPlanes: existing?.spinalPlanes ?? [],
      bodyPosition: existing?.bodyPosition ?? 'supine',
      level,
      defaultDurationMin: durationMin,
      isUnilateral: existing?.isUnilateral ?? false,
      springs: existing?.springs ?? '',
      box: existing?.box ?? 'none',
      footbar: existing?.footbar ?? 'none',
      headrest: existing?.headrest ?? 'flat',
      targetMuscles: existing?.targetMuscles ?? [],
      breathPattern: existing?.breathPattern ?? '',
      cues,
      precautions,
      layers: {
        easy: existing?.layers?.easy ?? '',
        standard: adjustmentNote,
        hard: existing?.layers?.hard ?? '',
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
      createdAt: existing ? getMovementIdeaMeta(existing).createdAt : now,
      updatedAt: now,
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
    };
  } finally {
    activeSaveLock = false;
  }
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
  const stepNoteParts = [
    ...(meta.subjectiveFeeling ? [`[느낌] ${meta.subjectiveFeeling}`] : []),
    ...(meta.adjustmentNote ? [`[수정] ${meta.adjustmentNote}`] : []),
  ];
  const combinedInstructorNote = stepNoteParts.join(' · ');

  // Ensure instructor self-check metadata is recorded with credentialVerified: false
  const now = new Date().toISOString();
  const baseWithPrecautions: PilatesExercise = {
    ...found,
    precautions:
      found.precautions.trim() ||
      '강사 직접 창작 메모 · 객관적 효과 판정이나 전문가 검증이 아닙니다.',
  };
  const checkedExercise: PilatesExercise = {
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

  // Idempotent if already in activeSteps: update the exercise and step note in store and return success
  const alreadyInSteps = state.activeSteps.some((step) => step.exerciseId === exerciseId);
  if (alreadyInSteps) {
    usePilatesStore.setState((store) => ({
      exercises: store.exercises.map((item) =>
        item.id === checkedExercise.id ? checkedExercise : item,
      ),
      activeSteps: store.activeSteps.map((step) =>
        step.exerciseId === checkedExercise.id && combinedInstructorNote
          ? { ...step, instructorNote: combinedInstructorNote }
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
        step.exerciseId === checkedExercise.id && combinedInstructorNote
          ? { ...step, instructorNote: combinedInstructorNote }
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
    durationMin: Math.max(1, Math.min(20, checkedExercise.defaultDurationMin || 3)),
    selectedLayer: 'standard',
    explanationSec: 20,
    transitionSec: afterAppend.activeSteps.length === 0 ? 0 : 15,
    ...(combinedInstructorNote ? { instructorNote: combinedInstructorNote } : {}),
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

