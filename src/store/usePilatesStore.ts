import { createRecoveryStorageGuard, RECOVERY_STORAGE_KEY } from '../lib/recoveryStorageGuard';
import { inspectBackupRecovery } from '../utils/backupRecoveryInspection';
import { assessSequenceMotionStudyBinding } from '../utils/sequenceMotionBinding';
import type { BackupRecoveryOptions } from '../utils/backupRecoveryInspection';
import { resolveDatedPlanOccurrence, getDatedPlanWarnings } from '../utils/datedSequencePlanning';
import type {
  DatedSequencePlanningData,
  DatedSequencePlanState,
  DatedPlanOccurrenceSnapshot,
} from '../types/datedSequencePlanning';
import { createEmptyDatedSequencePlanning } from '../types/datedSequencePlanning';
import {
  createDatedPlanAssignment,
  setDatedPlanState,
  replaceDatedPlanSnapshot,
  previewDatedPlanWeekCopy,
  copyDatedPlanWeek,
  mergeDatedSequencePlanning,
} from '../utils/datedSequencePlanning';
import type { DatedWeekCopySkip } from '../utils/datedSequencePlanning';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { z } from 'zod';
import type { InstructorStudyState } from '../types/instructorStudy';
import { createEmptyInstructorStudyState } from '../types/instructorStudy';
import {
  instructorStudyStateSchema,
  studyExerciseIdSchema,
  studyTutorialTaskIdSchema,
} from '../schemas/instructorStudySchema';
import { mergeInstructorStudyState } from '../utils/instructorStudy';
import {
  captureGroupPlanningConditions,
  applyGroupPlanningConditionsToDraft,
  preserveCurrentGroupPlanningPreferences,
} from '../utils/instructorPlanning';
import { createEmptyInstructorSchedule } from '../types/instructorSchedule';
import type { InstructorScheduleData } from '../types/instructorSchedule';
import { instructorScheduleSchema } from '../schemas/instructorScheduleSchema';
import {
  CURATED_SEQUENCE_PROGRAMS,
  INITIAL_CLASS_GROUPS,
  INITIAL_EXERCISES,
  INITIAL_HISTORY_LOGS,
  INITIAL_SAVED_SEQUENCES,
} from '../data/pilatesCatalog';
import type {
  ApparatusType,
  AutoGenerateCriteria,
  ClassBlockCategory,
  ClassGroupProfile,
  ClassHistoryLog,
  ConditionTemplate,
  DifficultyLevel,
  FavoriteTag,
  LayerMode,
  PilatesExercise,
  PropType,
  ReformerBrand,
  SavedSequence,
  SequenceStep,
  StepPracticeOptions,
} from '../types/pilates';
import type {
  ClassHistoryLogWithSnapshot,
  TeachingProgramSnapshot,
} from '../types/teachingHistorySnapshot';
import {
  exerciseMatchesCriteria,
  fitSequenceDuration,
  generateOptimal50MinSequence,
  applyTransitionAllowances,
  getMovementKey,
  getSequenceDurations,
  isRestStep,
  optimizeSequenceTransitions,
  regenerateSequence,
  swapDuplicateStepsWithFresh,
} from '../utils/sequenceEngine';
import type { SequenceSection } from '../utils/sequenceEngine';
import {
  DEFAULT_OWNED_EQUIPMENT,
  getEquipmentFamilies,
  getExerciseEquipment,
  getEquipmentFamily,
  isEquipmentId,
  PROP_IDS,
} from '../data/equipmentCatalog';
import {
  apparatusSchema,
  levelSchema,
  textSchema,
  stepSchema,
  stepPracticeOptionsSchema,
  stepTimingOptionsSchema,
  stepBlockOptionsSchema,
  exerciseSchema,
  sequenceSchema,
  groupSchema,
  historySchema,
  criteriaSchema,
  recoveredDraftOriginSchema,
  templateSchema,
  equipmentSchema,
  propSchema,
  groupPlanningPreferencesSchema,
  datedSequencePlanningSchema,
} from '../schemas/cloudBackupSchema';

export type ActiveWorkspaceTab =
  'workbench' | 'atlas' | 'binder' | 'history' | 'stage' | 'schedule';
export type StepTimingOptions = z.input<typeof stepTimingOptionsSchema>;
export type StepBlockOptions = z.input<typeof stepBlockOptionsSchema>;
interface SequenceSnapshot {
  activeSequenceId: string;
  activeTitle: string;
  activeSubtitle: string;
  activeApparatus: ApparatusType | 'mixed';
  activeLevel: DifficultyLevel;
  activeTargetMinutes: number;
  activeTargetGroupId: string;
  activeSteps: SequenceStep[];
  lastCriteria: AutoGenerateCriteria | null;
  draftCriteria: AutoGenerateCriteria | null;
}
export interface DatedPlanningActionResult {
  success: boolean;
  message: string;
  assignmentId?: string;
  added?: number;
  skipped?: readonly DatedWeekCopySkip[];
  conflicts?: number;
}
export interface RestoreBackupResult {
  success: boolean;
  message: string;
  added?: number;
  unchanged?: boolean;
}
export interface PilatesStudioState extends SequenceSnapshot {
  activeTab: ActiveWorkspaceTab;
  themeMode: 'system' | 'light' | 'dark';
  reformerBrand: ReformerBrand;
  ownedApparatus: ApparatusType[];
  ownedEquipment: string[];
  ownedProps: PropType[];
  mobilePreviewMode: boolean;
  exercises: PilatesExercise[];
  savedSequences: SavedSequence[];
  classGroups: ClassGroupProfile[];
  historyLogs: ClassHistoryLog[];
  conditionTemplates: ConditionTemplate[];
  instructorSchedule: InstructorScheduleData;
  instructorStudyState?: InstructorStudyState;
  datedSequencePlanning?: DatedSequencePlanningData;
  generationError: string | null;
  saveFeedback: string | null;
  persistenceError: string | null;
  undoStack: SequenceSnapshot[];
  setActiveTab: (tab: ActiveWorkspaceTab) => void;
  loadDatedSequencePlanAsDraft: (
    assignmentId: string,
    expectedUpdatedAt?: string,
  ) => DatedPlanningActionResult;
  assignSequenceToOccurrence: (input: {
    sequenceId: string;
    classId: string;
    originalDate: string;
    state?: DatedSequencePlanState;
  }) => DatedPlanningActionResult;
  replaceDatedSequencePlanSnapshot: (input: {
    assignmentId: string;
    sequenceId: string;
    expectedUpdatedAt: string;
    expectedOccurrenceSnapshot: DatedPlanOccurrenceSnapshot;
    expectedSourceFingerprint: string;
  }) => DatedPlanningActionResult;
  setDatedSequencePlanState: (
    assignmentId: string,
    state: DatedSequencePlanState,
    expectedUpdatedAt?: string,
  ) => DatedPlanningActionResult;
  previewDatedSequencePlanWeekCopy: (
    sourceStartDate: string,
    targetStartDate: string,
  ) => ReturnType<typeof previewDatedPlanWeekCopy>;
  copyDatedSequencePlanWeek: (
    sourceStartDate: string,
    targetStartDate: string,
  ) => DatedPlanningActionResult;
  setInstructorSchedule: (data: InstructorScheduleData) => {
    success: boolean;
    message: string;
  };
  setInstructorStudyState: (data: InstructorStudyState) => {
    success: boolean;
    message: string;
  };
  toggleStudyBookmark: (exerciseId: string) => {
    success: boolean;
    message: string;
  };
  setRehearsalCueHidden: (hidden: boolean) => {
    success: boolean;
    message: string;
  };
  setStudyTutorialTaskCompleted: (
    taskId: string,
    completed: boolean,
  ) => { success: boolean; message: string };
  setThemeMode: (mode: 'system' | 'light' | 'dark') => void;
  setReformerBrand: (brand: ReformerBrand) => void;
  toggleOwnedApparatus: (apparatus: ApparatusType) => void;
  toggleOwnedEquipment: (equipmentId: string) => void;
  toggleOwnedProp: (prop: PropType) => void;
  setMobilePreviewMode: (enabled: boolean) => void;
  setActiveTargetGroupId: (groupId: string) => void;
  setActiveSequenceMeta: (meta: {
    title?: string;
    subtitle?: string;
    apparatus?: ApparatusType | 'mixed';
    level?: DifficultyLevel;
    targetMinutes?: number;
  }) => void;
  loadSequenceIntoWorkbench: (sequenceId: string) => void;
  applyCuratedProgram: (programId: string) => void;
  autoGenerateSequence: (criteria: AutoGenerateCriteria) => void;
  setLastCriteria: (criteria: AutoGenerateCriteria) => void;
  setDraftCriteria: (criteria: AutoGenerateCriteria) => void;
  toggleStepLock: (stepIndex: number) => void;
  regenerateUnlocked: (criteria: AutoGenerateCriteria, section?: SequenceSection) => void;
  fitActiveDuration: () => void;
  undoSequence: () => void;
  saveConditionTemplate: (name: string) => void;
  applyConditionTemplate: (id: string) => void;
  exportBackup: () => string;
  restoreBackup: (raw: string, options?: BackupRecoveryOptions) => RestoreBackupResult;
  replaceStepExercise: (stepIndex: number, exerciseId: string) => void;
  setStepPracticeOptions: (
    stepIndex: number,
    patch: StepPracticeOptions,
  ) => { success: boolean; message: string };
  setStepTimingOptions: (
    stepIndex: number,
    patch: StepTimingOptions,
  ) => { success: boolean; message: string };
  setStepBlockOptions: (
    stepIndex: number,
    patch: StepBlockOptions,
    expectedStep?: SequenceStep,
  ) => { success: boolean; message: string };
  adjustStepDuration: (stepIndex: number, deltaMin: number) => void;
  setStepLayer: (stepIndex: number, layer: LayerMode) => void;
  scaleAllStepsLayer: (layer: LayerMode) => void;
  updateStepNote: (stepIndex: number, note: string) => void;
  moveStep: (stepIndex: number, direction: 'up' | 'down') => void;
  removeStep: (stepIndex: number) => void;
  addRestStep: (durationMin: number, afterIndex?: number) => { success: boolean; message: string };
  setRestDuration: (
    stepIndex: number,
    durationMin: number,
  ) => { success: boolean; message: string };
  appendExerciseToSequence: (exerciseId: string, blockCategory?: ClassBlockCategory) => void;
  optimizeActiveTransitions: () => void;
  swapFreshExercisesForGroup: () => void;
  saveCurrentSequenceToBinder: (asNew?: boolean) => string;
  duplicateSavedSequence: (sequenceId: string) => string | undefined;
  deleteSavedSequence: (sequenceId: string) => void;
  loadHistoryIntoWorkbench: (logId: string) => void;
  addCustomExercise: (exercise: PilatesExercise) => void;
  addBatchExercisesFromClips: (
    newExercises: PilatesExercise[],
    loadAsSequence?: boolean,
    sequenceTitle?: string,
  ) => void;
  cycleExerciseFavoriteTag: (exerciseId: string) => void;
  setExerciseFavoriteTag: (exerciseId: string, tag: FavoriteTag) => void;
  logClassSession: (payload: {
    sequenceId: string;
    groupId: string;
    taughtAt: string;
    rating: 1 | 2 | 3 | 4 | 5;
    intensity: 'relaxed' | 'moderate' | 'intense';
    instructorReflection: string;
    actualDurationSec?: number;
    actualRestDurationSec?: number;
    stepsSnapshot?: SequenceStep[];
    sequenceTitle?: string;
    criteriaSnapshot?: AutoGenerateCriteria;
    programSnapshot?: TeachingProgramSnapshot;
  }) => void;
  addClassGroup: (group: Omit<ClassGroupProfile, 'id'>) => void;
  updateClassGroup: (
    groupId: string,
    patch: Partial<
      Pick<
        ClassGroupProfile,
        'name' | 'defaultLevel' | 'scheduleLabel' | 'notes' | 'planningPreferences'
      >
    >,
  ) => { success: boolean; message: string };
  saveCurrentConditionsToGroup: (groupId: string) => {
    success: boolean;
    message: string;
  };
  applyGroupPlanningConditions: (groupId: string) => {
    success: boolean;
    message: string;
  };
  applyGroupDefaultLevel: (groupId: string) => {
    success: boolean;
    message: string;
  };
  reuseGroupRecentCriteria: (groupId: string) => {
    success: boolean;
    message: string;
  };
  resetDemoData: () => void;
}

const groupProfilePatchSchema = z
  .object({
    planningPreferences: groupPlanningPreferencesSchema.optional(),
    name: z
      .string()
      .trim()
      .min(1, '그룹 별칭을 입력해 주세요.')
      .max(60, '그룹 별칭은 60자 이내로 입력해 주세요.')
      .optional(),
    defaultLevel: levelSchema.optional(),
    scheduleLabel: z.string().trim().max(120, '일정은 120자 이내로 입력해 주세요.').optional(),
    notes: z.string().trim().max(1000, '진행 메모는 1000자 이내로 입력해 주세요.').optional(),
  })
  .strict();
const sampleHistoryIds = new Set(INITIAL_HISTORY_LOGS.map((log) => log.id));

const settingsSchema = z.object({
  activeTab: z.enum(['workbench', 'atlas', 'binder', 'history', 'stage', 'schedule']).optional(),
  themeMode: z.enum(['system', 'light', 'dark']).optional(),
  reformerBrand: z.enum(['balanced-body', 'stott', 'intopilates', 'classical']).optional(),
  ownedApparatus: z.array(apparatusSchema).optional(),
  ownedEquipment: z.array(equipmentSchema).optional(),
  ownedProps: z.array(propSchema).optional(),
  mobilePreviewMode: z.boolean().optional(),
  activeSequenceId: textSchema.optional(),
  activeTitle: textSchema.optional(),
  activeSubtitle: textSchema.optional(),
  activeApparatus: z.union([apparatusSchema, z.literal('mixed')]).optional(),
  activeLevel: levelSchema.optional(),
  activeTargetMinutes: z.number().finite().min(10).max(120).optional(),
  activeTargetGroupId: textSchema.optional(),
  activeSteps: z.array(stepSchema).optional(),
  lastCriteria: criteriaSchema.nullable().optional(),
  draftCriteria: criteriaSchema.nullable().optional(),
  conditionTemplates: z.array(templateSchema).optional(),
});

const recoveryStorageGuard = createRecoveryStorageGuard(() =>
  localStorage.getItem(RECOVERY_STORAGE_KEY),
);
/** Read-only: never sets feedback, rehydrates, writes, or adopts another tab's data. */
export function getRecoveryStorageStatus(expectedFingerprint?: string) {
  return recoveryStorageGuard.check(expectedFingerprint);
}

// Storage errors must not interrupt editing or claim a successful browser save.
let lastStorageError: string | null = null;
function storageResult(error: unknown | null): void {
  lastStorageError =
    error === null
      ? null
      : '브라우저 저장 공간에 기록하지 못했습니다. 현재 작업을 JSON으로 백업하고 저장 권한과 여유 공간을 확인해 주세요.';
  const message = lastStorageError;
  queueMicrotask(() => {
    if (lastStorageError !== message) return;
    const state = usePilatesStore.getState();
    if (state.persistenceError !== message || (message !== null && state.saveFeedback !== null))
      usePilatesStore.setState({
        persistenceError: message,
        ...(message ? { saveFeedback: null } : {}),
      });
  });
}
const browserStorage = createJSONStorage(() => ({
  getItem: (name: string) => {
    try {
      const raw = localStorage.getItem(name);
      if (name === RECOVERY_STORAGE_KEY) recoveryStorageGuard.observedRead(raw);
      storageResult(null);
      return raw;
    } catch (error) {
      if (name === RECOVERY_STORAGE_KEY) recoveryStorageGuard.observedReadFailure();
      storageResult(error);
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    try {
      localStorage.setItem(name, value);
      if (name === RECOVERY_STORAGE_KEY) recoveryStorageGuard.observedWrite(value);
      storageResult(null);
    } catch (error) {
      if (name === RECOVERY_STORAGE_KEY) recoveryStorageGuard.observedWriteFailure();
      storageResult(error);
    }
  },
  removeItem: (name: string) => {
    try {
      localStorage.removeItem(name);
      if (name === RECOVERY_STORAGE_KEY) recoveryStorageGuard.observedWrite(null);
      storageResult(null);
    } catch (error) {
      if (name === RECOVERY_STORAGE_KEY) recoveryStorageGuard.observedWriteFailure();
      storageResult(error);
    }
  },
}));

const defaultSequence = {
  id: 'draft-first-class',
  title: '매트 50분 수업',
  subtitle: '최대 Lv 1.0 · 조건 기반 추천 · 강사 검토용',
  apparatus: 'mat' as const,
  level: '1.0' as const,
  targetMinutes: 50,
  steps: [] as SequenceStep[],
};
const newId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
// Bindings may contain opaque future JSON; snapshots must never share their nested objects.
const cloneSteps = (steps: SequenceStep[]) => steps.map((step) => structuredClone(step));
const cloneCriteria = (criteria: AutoGenerateCriteria): AutoGenerateCriteria => ({
  ...criteria,
  ownedApparatus: criteria.ownedApparatus ? [...criteria.ownedApparatus] : undefined,
  availableEquipment: criteria.availableEquipment ? [...criteria.availableEquipment] : undefined,
  planningGoals: criteria.planningGoals ? [...criteria.planningGoals] : undefined,
  instructorObservations: criteria.instructorObservations
    ? [...criteria.instructorObservations]
    : undefined,
  preferredProps: [...criteria.preferredProps],
});
function snapshot(state: PilatesStudioState): SequenceSnapshot {
  return {
    activeSequenceId: state.activeSequenceId,
    activeTitle: state.activeTitle,
    activeSubtitle: state.activeSubtitle,
    activeApparatus: state.activeApparatus,
    activeLevel: state.activeLevel,
    activeTargetMinutes: state.activeTargetMinutes,
    activeTargetGroupId: state.activeTargetGroupId,
    activeSteps: cloneSteps(state.activeSteps),
    lastCriteria: state.lastCriteria ? cloneCriteria(state.lastCriteria) : null,
    draftCriteria: state.draftCriteria ? cloneCriteria(state.draftCriteria) : null,
  };
}
function edit(
  state: PilatesStudioState,
  next: Partial<PilatesStudioState>,
): Partial<PilatesStudioState> {
  return {
    undoStack: [...state.undoStack.slice(-19), snapshot(state)],
    generationError: null,
    saveFeedback: null,
    ...next,
  };
}

/** Pure validation/merge shared by individual editors and the one-apply block sheet. */
function editedStepOptions(
  step: SequenceStep,
  patch: StepBlockOptions,
): { next: SequenceStep } | { message: string } {
  const next = { ...step };
  if (patch.durationMin !== undefined) next.durationMin = patch.durationMin;
  if (patch.selectedLayer !== undefined) next.selectedLayer = patch.selectedLayer;
  if (Object.prototype.hasOwnProperty.call(patch, 'classSection')) {
    if (patch.classSection === undefined || patch.classSection === null) delete next.classSection;
    else next.classSection = patch.classSection;
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'motionStudy')) {
    if (patch.motionStudy === null) delete next.motionStudy;
    else if (patch.motionStudy !== undefined) {
      if (assessSequenceMotionStudyBinding(step.exerciseId, patch.motionStudy) !== 'matched')
        return { message: '현재 동작과 연결할 수 있는 최신 동작 자료를 다시 선택해 주세요.' };
      next.motionStudy = structuredClone(patch.motionStudy);
    }
  }
  for (const key of ['repetitions', 'sets', 'explanationSec', 'transitionSec'] as const) {
    if (!Object.prototype.hasOwnProperty.call(patch, key)) continue;
    const value = patch[key];
    if (value === undefined) delete next[key];
    else next[key] = value;
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'sideMode')) {
    if (patch.sideMode === undefined) delete next.sideMode;
    else next.sideMode = patch.sideMode;
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'instructorNote')) {
    if (patch.instructorNote === undefined) delete next.instructorNote;
    else next.instructorNote = patch.instructorNote;
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'customSpringOverride')) {
    if (patch.customSpringOverride) next.customSpringOverride = patch.customSpringOverride;
    else delete next.customSpringOverride;
  }
  const timingChanged = ['durationMin', 'explanationSec', 'transitionSec'].some((key) =>
    Object.prototype.hasOwnProperty.call(patch, key),
  );
  const roundedOverhead =
    Math.round(next.explanationSec ?? 0) + Math.round(next.transitionSec ?? 0);
  if (
    !stepSchema.safeParse(next).success ||
    (timingChanged && roundedOverhead > Math.round(next.durationMin * 60))
  )
    return {
      message:
        '동작 설정을 확인해 주세요. 설명·전환 시간의 합계는 초 단위로 표시한 전체 시간을 넘을 수 없습니다.',
    };
  return { next };
}
function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const used = new Set(existing.map((item) => item.id));
  return [
    ...existing,
    ...incoming.filter((item) => {
      if (used.has(item.id)) return false;
      used.add(item.id);
      return true;
    }),
  ];
}
function mergeSchedule(
  existing: InstructorScheduleData,
  incoming?: InstructorScheduleData,
): { schedule: InstructorScheduleData; added: number; conflicts: number } {
  if (!incoming) return { schedule: existing, added: 0, conflicts: 0 };
  let added = 0;
  let conflicts = 0;
  for (const key of ['locations', 'classes', 'exceptions'] as const) {
    const local = new Map(existing[key].map((item) => [item.id, JSON.stringify(item)]));
    for (const item of incoming[key]) {
      if (!local.has(item.id)) added += 1;
      else if (local.get(item.id) !== JSON.stringify(item)) conflicts += 1;
    }
  }
  const parsed = instructorScheduleSchema.safeParse({
    locations: mergeById(existing.locations, incoming.locations),
    classes: mergeById(existing.classes, incoming.classes),
    exceptions: mergeById(existing.exceptions, incoming.exceptions),
  });
  if (!parsed.success)
    throw new Error(
      '일정 병합 후 같은 회차의 예외 또는 연결 정보가 충돌합니다. 기존 자료를 보존했으며 백업을 적용하지 않았습니다. 일정 내용을 확인해 주세요.',
    );
  return { schedule: parsed.data, added, conflicts };
}
function activeCriteria(state: PilatesStudioState): AutoGenerateCriteria {
  const source = state.lastCriteria ?? state.draftCriteria;
  const stepEquipment = [
    ...new Set(
      state.activeSteps.flatMap((step) => {
        const exercise = state.exercises.find((item) => item.id === step.exerciseId);
        return exercise ? getExerciseEquipment(exercise).requiredEquipment : [];
      }),
    ),
  ];
  const selected =
    source?.availableEquipment ??
    (stepEquipment.length
      ? stepEquipment
      : state.activeApparatus === 'mixed'
        ? []
        : [state.activeApparatus]);
  return {
    focusPreset: 'full-body',
    excludeDaysWindow: 10,
    defaultLayer: 'standard',
    ...source,
    apparatus: state.activeSteps.length
      ? state.activeApparatus
      : (source?.apparatus ?? state.activeApparatus),
    ownedApparatus: getEquipmentFamilies(selected),
    availableEquipment: selected,
    preferredProps: (source?.preferredProps ?? state.ownedProps).filter(
      (prop) => prop === 'none' || state.ownedProps.includes(prop),
    ),
    level: state.activeSteps.length ? state.activeLevel : (source?.level ?? state.activeLevel),
    targetGroupId: source?.targetGroupId ?? state.activeTargetGroupId,
    targetMinutes: state.activeSteps.length
      ? state.activeTargetMinutes
      : (source?.targetMinutes ?? state.activeTargetMinutes),
    restMinutes: state.activeSteps.length
      ? getSequenceDurations(state.activeSteps).restSec / 60
      : (source?.restMinutes ?? 0),
  };
}
function duplicatesAnotherStep(
  state: PilatesStudioState,
  exercise: PilatesExercise,
  replacingIndex?: number,
): boolean {
  const key = getMovementKey(exercise);
  return state.activeSteps.some((step, index) => {
    if (index === replacingIndex) return false;
    const existing = state.exercises.find((item) => item.id === step.exerciseId);
    return existing ? getMovementKey(existing) === key : false;
  });
}
function restDurationError(steps: SequenceStep[], targetMinutes: number): string | undefined {
  if (!Number.isFinite(targetMinutes) || targetMinutes <= 0)
    return '전체 수업 시간을 확인해 주세요.';
  if (
    steps.some(
      (step) =>
        isRestStep(step) &&
        (!Number.isFinite(step.durationMin) ||
          step.durationMin <= 0 ||
          Math.round(step.durationMin * 60) < 1),
    )
  )
    return '휴식 시간은 0보다 큰 유효한 시간으로 입력해 주세요.';
  if (getSequenceDurations(steps).restSec >= Math.round(targetMinutes * 60))
    return '휴식 합계는 전체 수업 시간보다 작아야 합니다. 휴식을 줄이거나 수업 시간을 늘려 주세요.';
}
function resolveCriteria(
  request: AutoGenerateCriteria,
  state: PilatesStudioState,
): AutoGenerateCriteria {
  const selected = [
    ...new Set(
      request.availableEquipment ??
        (request.apparatus === 'mixed' ? (request.ownedApparatus ?? []) : [request.apparatus]),
    ),
  ];
  const criteria = {
    ...cloneCriteria(request),
    ownedApparatus: getEquipmentFamilies(selected),
    availableEquipment: selected,
  };
  if (criteria.ownedApparatus.some((apparatus) => !state.ownedApparatus.includes(apparatus))) {
    throw new Error(
      '추천 조건에 현재 보유하지 않은 기구가 있습니다. 보유 기구 설정과 조건을 확인해 주세요.',
    );
  }
  if (
    criteria.availableEquipment.some(
      (id) => !isEquipmentId(id) || !state.ownedEquipment.includes(id),
    )
  ) {
    throw new Error(
      '추천 조건에 현재 보유하지 않은 세부 기구가 있습니다. 보유 기구를 확인해 주세요.',
    );
  }
  if (criteria.preferredProps.some((prop) => prop !== 'none' && !state.ownedProps.includes(prop))) {
    throw new Error(
      '추천 조건에 현재 보유하지 않은 소도구가 있습니다. 보유 소도구를 확인해 주세요.',
    );
  }
  return criteria;
}
function criteriaForSteps(
  state: PilatesStudioState,
  steps: SequenceStep[],
  apparatus: ApparatusType | 'mixed',
  level: DifficultyLevel,
  targetMinutes: number,
  source?: AutoGenerateCriteria | null,
): AutoGenerateCriteria {
  const map = new Map(state.exercises.map((exercise) => [exercise.id, exercise]));
  const actual = steps
    .flatMap((step) => {
      const exercise = map.get(step.exerciseId);
      return exercise ? getExerciseEquipment(exercise).requiredEquipment : [];
    })
    .filter(isEquipmentId);
  const actualEquipment = [
    ...new Set(actual.length ? actual : apparatus === 'mixed' ? [] : [apparatus]),
  ];
  const equipment = [
    ...new Set([
      ...(source?.availableEquipment ?? []).filter((id) =>
        actualEquipment.includes(id as (typeof actualEquipment)[number]),
      ),
      ...actualEquipment,
    ]),
  ];
  const requiredProps = steps.flatMap((step) => {
    const exercise = map.get(step.exerciseId);
    return exercise ? getExerciseEquipment(exercise).requiredProps : [];
  });
  return {
    focusPreset: 'full-body',
    excludeDaysWindow: 14,
    defaultLayer: 'standard',
    ...source,
    apparatus,
    level,
    targetMinutes: Math.max(10, Math.min(120, targetMinutes)),
    restMinutes: getSequenceDurations(steps).restSec / 60,
    availableEquipment: equipment,
    ownedApparatus: getEquipmentFamilies(equipment),
    preferredProps: [...new Set([...(source?.preferredProps ?? []), ...requiredProps])],
    targetGroupId: source?.targetGroupId ?? state.activeTargetGroupId,
  };
}
function activeCriteriaSnapshot(
  state: PilatesStudioState,
  steps = state.activeSteps,
): AutoGenerateCriteria {
  return cloneCriteria(
    criteriaForSteps(
      state,
      steps,
      state.activeApparatus,
      state.activeLevel,
      state.activeTargetMinutes,
      state.draftCriteria ?? state.lastCriteria,
    ),
  );
}
function draftForBackup(state: PilatesStudioState): SavedSequence | undefined {
  if (!state.activeSteps.length) return undefined;
  const saved = state.savedSequences.find((sequence) => sequence.id === state.activeSequenceId);
  if (
    saved &&
    saved.title === state.activeTitle &&
    saved.subtitle === state.activeSubtitle &&
    saved.apparatus === state.activeApparatus &&
    saved.level === state.activeLevel &&
    saved.targetMinutes === state.activeTargetMinutes &&
    JSON.stringify(saved.steps) === JSON.stringify(state.activeSteps)
  )
    return undefined;
  const contents = JSON.stringify(snapshot(state));
  let hash = 2166136261;
  for (const character of contents) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  const now = new Date().toISOString();
  return {
    id: `backup-draft-${state.activeSequenceId.slice(-220)}-${(hash >>> 0).toString(36)}`,
    title: `${state.activeTitle} (백업 초안)`,
    subtitle: state.activeSubtitle,
    apparatus: state.activeApparatus,
    level: state.activeLevel,
    focusTags: ['백업 초안'],
    targetMinutes: state.activeTargetMinutes,
    steps: cloneSteps(state.activeSteps),
    createdAt: now,
    updatedAt: now,
    taughtCount: 0,
    criteriaSnapshot: activeCriteriaSnapshot(state),
    ...(saved?.recoveredDraftOrigin
      ? { recoveredDraftOrigin: recoveredDraftOriginSchema.parse(saved.recoveredDraftOrigin) }
      : {}),
  };
}
function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : '조건을 확인해 주세요. 초안은 그대로 보존했습니다.';
}
const sampleSequences = () =>
  INITIAL_SAVED_SEQUENCES.map((sequence) => ({
    ...sequence,
    steps: cloneSteps(sequence.steps),
    taughtCount: 0,
    lastTaughtAt: undefined,
  }));

export const usePilatesStore = create<PilatesStudioState>()(
  persist(
    (set, get) => ({
      activeTab: 'workbench',
      themeMode: 'light',
      reformerBrand: 'intopilates',
      ownedApparatus: ['reformer', 'cadillac', 'chair', 'barrel', 'mat'],
      ownedEquipment: [...DEFAULT_OWNED_EQUIPMENT],
      ownedProps: [],
      mobilePreviewMode: false,
      exercises: INITIAL_EXERCISES,
      savedSequences: sampleSequences(),
      classGroups: INITIAL_CLASS_GROUPS,
      historyLogs: [],
      instructorSchedule: createEmptyInstructorSchedule(),
      instructorStudyState: undefined,
      datedSequencePlanning: undefined,
      activeSequenceId: defaultSequence.id,
      activeTitle: defaultSequence.title,
      activeSubtitle: defaultSequence.subtitle,
      activeApparatus: defaultSequence.apparatus,
      activeLevel: defaultSequence.level,
      activeTargetMinutes: defaultSequence.targetMinutes,
      activeTargetGroupId: INITIAL_CLASS_GROUPS[0]?.id ?? '',
      activeSteps: cloneSteps(defaultSequence.steps),
      lastCriteria: null,
      draftCriteria: null,
      generationError: null,
      saveFeedback: null,
      persistenceError: null,
      conditionTemplates: [],
      undoStack: [],
      setActiveTab: (activeTab) => set({ activeTab }),
      loadDatedSequencePlanAsDraft: (assignmentId, expectedUpdatedAt) => {
        const state = get();
        const assignment = state.datedSequencePlanning?.assignments.find(
          (item) => item.id === assignmentId,
        );
        if (
          !assignment ||
          (expectedUpdatedAt !== undefined && expectedUpdatedAt !== assignment.updatedAt)
        ) {
          const message =
            '불러올 날짜별 계획이 없거나 변경되었습니다. 현재 계획을 다시 확인해 주세요.';
          set({ generationError: message });
          return { success: false, message };
        }
        const resolved = resolveDatedPlanOccurrence(
          state.instructorSchedule,
          assignment.classId,
          assignment.originalDate,
        );
        const row = resolved.occurrence;
        if (
          resolved.status !== 'scheduled' ||
          !row ||
          row.date !== assignment.occurrenceSnapshot.date ||
          row.startTime !== assignment.occurrenceSnapshot.startTime ||
          row.endTime !== assignment.occurrenceSnapshot.endTime ||
          row.locationId !== assignment.occurrenceSnapshot.locationId
        ) {
          const message =
            '회차가 취소·휴무·삭제되었거나 날짜·시각·장소가 바뀌었습니다. 기존 스냅샷을 유지했으며 현재 초안은 바꾸지 않았습니다.';
          set({ generationError: message });
          return { success: false, message };
        }
        const parsed = sequenceSchema.safeParse(assignment.sequenceSnapshot);
        if (!parsed.success || parsed.data.targetMinutes < 10 || parsed.data.targetMinutes > 120) {
          const message = '불러올 계획의 형식과 10–120분 수업 시간을 확인해 주세요.';
          set({ generationError: message });
          return { success: false, message };
        }
        const sequence = parsed.data;
        const criteria = sequence.criteriaSnapshot
          ? cloneCriteria(sequence.criteriaSnapshot)
          : null;
        if (criteria) {
          delete criteria.targetGroupId;
          delete criteria.instructorObservations;
        }
        const warnings = getDatedPlanWarnings({
          assignment,
          schedule: state.instructorSchedule,
          exercises: state.exercises,
        });
        const message = `날짜별 계획을 새 초안 사본으로 불러왔습니다. 이전 초안은 실행 취소로 복구할 수 있습니다.${warnings.length ? ` 기구·시간 등 확인 사항 ${warnings.length}개가 있습니다.` : ''}`;
        set(
          edit(state, {
            activeSequenceId: newId('draft-dated'),
            activeTitle: sequence.title,
            activeSubtitle: sequence.subtitle,
            activeApparatus: sequence.apparatus,
            activeLevel: sequence.level,
            activeTargetMinutes: sequence.targetMinutes,
            activeTargetGroupId: '',
            activeSteps: cloneSteps(sequence.steps),
            draftCriteria: criteria,
            lastCriteria: null,
            saveFeedback: message,
          }),
        );
        return { success: true, message };
      },
      assignSequenceToOccurrence: (input) => {
        const state = get();
        const sequence = state.savedSequences.find((item) => item.id === input.sequenceId);
        if (!sequence) {
          const message = '연결할 저장 시퀀스를 찾을 수 없습니다. 바인더에 먼저 저장해 주세요.';
          set({ generationError: message });
          return { success: false, message };
        }
        const result = createDatedPlanAssignment({
          ...input,
          sequence,
          schedule: state.instructorSchedule,
          planning: state.datedSequencePlanning,
          now: new Date().toISOString(),
          assignmentId: newId('dated-plan'),
        });
        if (!result.success) {
          set({ generationError: result.message });
          return result;
        }
        set({
          datedSequencePlanning: result.planning,
          generationError: null,
          saveFeedback: result.message,
        });
        return {
          success: true,
          message: result.message,
          assignmentId: result.assignment.id,
        };
      },
      replaceDatedSequencePlanSnapshot: (input) => {
        const state = get();
        const sequence = state.savedSequences.find((item) => item.id === input.sequenceId);
        if (!sequence) {
          const message =
            '교체할 저장 시퀀스를 찾을 수 없습니다. 수정한 계획을 바인더에 먼저 저장해 주세요.';
          set({ generationError: message });
          return { success: false, message };
        }
        const result = replaceDatedPlanSnapshot({
          assignmentId: input.assignmentId,
          expectedUpdatedAt: input.expectedUpdatedAt,
          expectedOccurrenceSnapshot: input.expectedOccurrenceSnapshot,
          expectedSourceFingerprint: input.expectedSourceFingerprint,
          sequence,
          schedule: state.instructorSchedule,
          planning: state.datedSequencePlanning ?? createEmptyDatedSequencePlanning(),
          now: new Date().toISOString(),
        });
        if (!result.success) {
          set({ generationError: result.message });
          return result;
        }
        set({
          datedSequencePlanning: result.planning,
          generationError: null,
          saveFeedback: result.message,
        });
        return { success: true, message: result.message, assignmentId: result.assignment.id };
      },
      setDatedSequencePlanState: (assignmentId, state, expectedUpdatedAt) => {
        const current = get();
        const result = setDatedPlanState({
          assignmentId,
          state,
          expectedUpdatedAt,
          schedule: current.instructorSchedule,
          planning: current.datedSequencePlanning ?? createEmptyDatedSequencePlanning(),
          now: new Date().toISOString(),
        });
        if (!result.success) {
          set({ generationError: result.message });
          return result;
        }
        set({
          datedSequencePlanning: result.planning,
          generationError: null,
          saveFeedback: result.message,
        });
        return { success: true, message: result.message };
      },
      previewDatedSequencePlanWeekCopy: (sourceStartDate, targetStartDate) => {
        const state = get();
        return previewDatedPlanWeekCopy({
          sourceStartDate,
          targetStartDate,
          schedule: state.instructorSchedule,
          planning: state.datedSequencePlanning ?? createEmptyDatedSequencePlanning(),
        });
      },
      copyDatedSequencePlanWeek: (sourceStartDate, targetStartDate) => {
        const state = get();
        const result = copyDatedPlanWeek({
          sourceStartDate,
          targetStartDate,
          schedule: state.instructorSchedule,
          planning: state.datedSequencePlanning ?? createEmptyDatedSequencePlanning(),
          now: new Date().toISOString(),
          createId: () => newId('dated-plan'),
        });
        if (!result.success) {
          set({ generationError: result.message });
          return result;
        }
        set({
          ...(result.added ? { datedSequencePlanning: result.planning } : {}),
          generationError: null,
          saveFeedback: result.message,
        });
        return {
          success: true,
          message: result.message,
          added: result.added,
          skipped: result.skipped,
          conflicts: result.conflicts,
        };
      },
      setInstructorStudyState: (data) => {
        const parsed = instructorStudyStateSchema.safeParse(data);
        if (!parsed.success) {
          const message = '개인 학습 상태의 동작·과제 ID와 표시 설정을 확인해 주세요.';
          set({ generationError: message });
          return { success: false, message };
        }
        const message =
          '개인 학습 상태를 저장했습니다. 동작 검토·자격·수업 기록은 변경하지 않았습니다.';
        set({
          instructorStudyState: parsed.data,
          generationError: null,
          saveFeedback: message,
        });
        return { success: true, message };
      },
      toggleStudyBookmark: (exerciseId) => {
        const state = get();
        const base = state.instructorStudyState ?? createEmptyInstructorStudyState();
        const exists = base.bookmarkedExerciseIds.includes(exerciseId);
        if (
          !studyExerciseIdSchema.safeParse(exerciseId).success ||
          (!exists && !state.exercises.some((exercise) => exercise.id === exerciseId))
        ) {
          const message = '북마크에 추가할 동작을 찾을 수 없습니다.';
          set({ generationError: message });
          return { success: false, message };
        }
        return get().setInstructorStudyState({
          ...base,
          bookmarkedExerciseIds: exists
            ? base.bookmarkedExerciseIds.filter((id) => id !== exerciseId)
            : [...base.bookmarkedExerciseIds, exerciseId],
        });
      },
      setRehearsalCueHidden: (hidden) => {
        const base = get().instructorStudyState ?? createEmptyInstructorStudyState();
        return get().setInstructorStudyState({
          ...base,
          rehearsalCueHidden: hidden,
        });
      },
      setStudyTutorialTaskCompleted: (taskId, completed) => {
        if (
          !studyTutorialTaskIdSchema.safeParse(taskId).success ||
          typeof completed !== 'boolean'
        ) {
          const message = '개인 학습 과제의 ID와 완료 상태를 확인해 주세요.';
          set({ generationError: message });
          return { success: false, message };
        }
        const base = get().instructorStudyState ?? createEmptyInstructorStudyState();
        return get().setInstructorStudyState({
          ...base,
          completedTutorialTaskIds: completed
            ? [...new Set([...base.completedTutorialTaskIds, taskId])]
            : base.completedTutorialTaskIds.filter((id) => id !== taskId),
        });
      },
      setInstructorSchedule: (data) => {
        const parsed = instructorScheduleSchema.safeParse(data);
        if (!parsed.success) {
          const message = parsed.error.issues[0]?.message ?? '일정 내용을 확인해 주세요.';
          set({ generationError: message });
          return { success: false, message };
        }
        set({
          instructorSchedule: parsed.data,
          generationError: null,
          saveFeedback: '이 브라우저의 일정을 저장했습니다.',
        });
        return {
          success: true,
          message: lastStorageError ?? '이 브라우저의 일정을 저장했습니다.',
        };
      },
      setThemeMode: (themeMode) => set({ themeMode }),
      setReformerBrand: (reformerBrand) => set({ reformerBrand }),
      toggleOwnedApparatus: (apparatus) =>
        set((state) => {
          const exists = state.ownedApparatus.includes(apparatus);
          if (exists && state.ownedApparatus.length === 1) return state;
          const ownedEquipment = exists
            ? state.ownedEquipment.filter((id) => getEquipmentFamily(id) !== apparatus)
            : [...new Set([...state.ownedEquipment, apparatus])];
          return {
            ownedEquipment,
            ownedApparatus: getEquipmentFamilies(ownedEquipment),
          };
        }),
      toggleOwnedEquipment: (equipmentId) =>
        set((state) => {
          if (!isEquipmentId(equipmentId)) return state;
          const ownedEquipment = state.ownedEquipment.includes(equipmentId)
            ? state.ownedEquipment.filter((id) => id !== equipmentId)
            : [...state.ownedEquipment, equipmentId];
          return {
            ownedEquipment,
            ownedApparatus: getEquipmentFamilies(ownedEquipment),
          };
        }),
      toggleOwnedProp: (prop) =>
        set((state) => {
          if (prop === 'none' || !PROP_IDS.includes(prop)) return state;
          return {
            ownedProps: state.ownedProps.includes(prop)
              ? state.ownedProps.filter((id) => id !== prop)
              : [...state.ownedProps, prop],
          };
        }),
      setMobilePreviewMode: (mobilePreviewMode) => set({ mobilePreviewMode }),
      setActiveTargetGroupId: (activeTargetGroupId) => set({ activeTargetGroupId }),
      setDraftCriteria: (criteria) => {
        const parsed = criteriaSchema.safeParse(criteria);
        if (!parsed.success) {
          set({ generationError: '수업 시간과 기구 등 조건을 확인해 주세요.' });
          return;
        }
        set({
          draftCriteria: cloneCriteria(parsed.data),
          generationError: null,
        });
      },
      setLastCriteria: (criteria) => {
        const parsed = criteriaSchema.safeParse(criteria);
        if (!parsed.success) {
          set({ generationError: '수업 시간과 기구 등 조건을 확인해 주세요.' });
          return;
        }
        set({
          lastCriteria: cloneCriteria(parsed.data),
          generationError: null,
        });
      },
      setActiveSequenceMeta: (meta) =>
        set((state) => {
          const message = restDurationError(
            state.activeSteps,
            meta.targetMinutes ?? state.activeTargetMinutes,
          );
          if (message) return { generationError: message };
          return edit(state, {
            activeTitle: meta.title ?? state.activeTitle,
            activeSubtitle: meta.subtitle ?? state.activeSubtitle,
            activeApparatus: meta.apparatus ?? state.activeApparatus,
            activeLevel: meta.level ?? state.activeLevel,
            activeTargetMinutes: meta.targetMinutes ?? state.activeTargetMinutes,
          });
        }),
      loadSequenceIntoWorkbench: (sequenceId) => {
        const state = get();
        const found = state.savedSequences.find((sequence) => sequence.id === sequenceId);
        if (!found) return;
        set(
          edit(state, {
            draftCriteria: cloneCriteria(
              found.criteriaSnapshot ??
                criteriaForSteps(
                  state,
                  found.steps,
                  found.apparatus,
                  found.level,
                  found.targetMinutes,
                ),
            ),
            activeSequenceId: found.id,
            activeTitle: found.title,
            activeSubtitle: found.subtitle,
            activeApparatus: found.apparatus,
            activeLevel: found.level,
            activeTargetMinutes: found.targetMinutes,
            activeSteps: cloneSteps(found.steps).map((step, index) => ({
              ...step,
              order: index + 1,
            })),
            activeTab: 'workbench',
          }),
        );
      },
      applyCuratedProgram: (programId) => {
        const state = get();
        const program = CURATED_SEQUENCE_PROGRAMS.find((item) => item.id === programId);
        if (!program) return;
        const criteria: AutoGenerateCriteria = {
          apparatus:
            program.requiredApparatus.length > 1
              ? 'mixed'
              : (program.requiredApparatus[0] ?? 'mat'),
          ownedApparatus: program.requiredApparatus.filter((apparatus) =>
            state.ownedApparatus.includes(apparatus),
          ),
          level: program.level,
          focusPreset: program.focusPreset,
          preferredProps: [...state.ownedProps],
          availableEquipment: program.requiredApparatus,
          excludeDaysWindow: 10,
          targetGroupId: state.activeTargetGroupId,
          targetMinutes: program.durationMinutes,
          defaultLayer: 'standard',
        };
        if (
          criteria.ownedApparatus?.length !== program.requiredApparatus.length ||
          program.requiredApparatus.some((id) => !state.ownedEquipment.includes(id))
        ) {
          set({
            generationError: '이 추천 수업에 필요한 기구가 보유 기구에 없습니다.',
          });
          return;
        }
        try {
          const activeSteps = generateOptimal50MinSequence(
            criteria,
            state.exercises,
            state.historyLogs,
          );
          set(
            edit(state, {
              activeSequenceId: newId('seq-program'),
              activeTitle: program.titleKo,
              activeSubtitle: program.subtitleKo,
              activeApparatus: criteria.apparatus,
              activeLevel: criteria.level,
              activeTargetMinutes: criteria.targetMinutes,
              activeSteps,
              lastCriteria: cloneCriteria(criteria),
              draftCriteria: cloneCriteria(criteria),
              activeTab: 'workbench',
            }),
          );
        } catch (error) {
          set({ generationError: errorMessage(error) });
        }
      },
      autoGenerateSequence: (request) => {
        const state = get();
        try {
          const criteria = resolveCriteria(request, state);
          const activeSteps = generateOptimal50MinSequence(
            criteria,
            state.exercises,
            state.historyLogs,
          );
          const label: Record<ApparatusType | 'mixed', string> = {
            mat: '매트',
            reformer: '리포머',
            cadillac: '캐딜락',
            chair: '체어',
            barrel: '바렐',
            mixed: '혼합 기구',
          };
          set(
            edit(state, {
              activeSequenceId: newId('seq-custom'),
              activeTitle: `${label[criteria.apparatus]} ${criteria.targetMinutes}분 수업`,
              activeSubtitle: `최대 Lv ${criteria.level} · 조건 기반 추천 · 강사 검토용`,
              activeApparatus: criteria.apparatus,
              activeLevel: criteria.level,
              activeTargetMinutes: criteria.targetMinutes,
              activeTargetGroupId: criteria.targetGroupId ?? state.activeTargetGroupId,
              activeSteps,
              lastCriteria: cloneCriteria(criteria),
              draftCriteria: cloneCriteria(criteria),
            }),
          );
        } catch (error) {
          set({ generationError: errorMessage(error) });
        }
      },
      regenerateUnlocked: (request, section) => {
        const state = get();
        try {
          const criteria = resolveCriteria(request, state);
          const activeSteps = regenerateSequence(
            criteria,
            state.exercises,
            state.historyLogs,
            state.activeSteps,
            section,
          );
          set(
            edit(state, {
              activeSteps,
              lastCriteria: cloneCriteria(criteria),
              draftCriteria: cloneCriteria(criteria),
              ...(activeSteps.some((step) => step.locked)
                ? {
                    saveFeedback: '잠긴 항목의 기존 동작·설명·전환 시간은 유지했습니다.',
                  }
                : {}),
              activeApparatus: criteria.apparatus,
              activeLevel: criteria.level,
              activeTargetMinutes: criteria.targetMinutes,
              activeTargetGroupId: criteria.targetGroupId ?? state.activeTargetGroupId,
            }),
          );
        } catch (error) {
          set({ generationError: errorMessage(error) });
        }
      },
      fitActiveDuration: () => {
        const state = get();
        try {
          set(
            edit(state, {
              activeSteps: fitSequenceDuration(state.activeSteps, state.activeTargetMinutes),
            }),
          );
        } catch (error) {
          set({ generationError: errorMessage(error) });
        }
      },
      undoSequence: () =>
        set((state) => {
          const previous = state.undoStack.at(-1);
          return previous
            ? {
                ...previous,
                undoStack: state.undoStack.slice(0, -1),
                generationError: null,
                saveFeedback: null,
              }
            : state;
        }),
      toggleStepLock: (index) =>
        set((state) =>
          state.activeSteps[index]
            ? edit(state, {
                activeSteps: state.activeSteps.map((step, i) =>
                  i === index ? { ...step, locked: !step.locked } : step,
                ),
              })
            : state,
        ),
      replaceStepExercise: (index, exerciseId) =>
        set((state) => {
          const step = state.activeSteps[index];
          if (!step || step.locked || isRestStep(step)) return state;
          if (step.exerciseId === exerciseId) return state;
          const exercise = state.exercises.find((item) => item.id === exerciseId);
          if (exercise && duplicatesAnotherStep(state, exercise, index))
            return {
              generationError:
                '같은 동작의 중복 구성은 추가할 수 없습니다. 다른 동작을 선택해 주세요.',
            };
          if (
            !exercise ||
            !exerciseMatchesCriteria(exercise, activeCriteria(state)) ||
            !getExerciseEquipment(exercise).requiredEquipment.every((id) =>
              state.ownedEquipment.includes(id),
            ) ||
            !getExerciseEquipment(exercise).requiredProps.every((prop) =>
              state.ownedProps.includes(prop),
            )
          )
            return {
              generationError:
                '선택한 동작이 현재 기구·소도구 또는 최대 난이도 조건과 맞지 않습니다.',
            };
          return edit(state, {
            activeSteps: state.activeSteps.map((item, i) =>
              i === index
                ? {
                    ...item,
                    exerciseId,
                    blockCategory: exercise.blockCategory,
                    customSpringOverride: undefined,
                    repetitions: undefined,
                    sets: undefined,
                    sideMode: undefined,
                    motionStudy: undefined,
                  }
                : item,
            ),
          });
        }),
      setStepPracticeOptions: (index, patch) => {
        const state = get();
        const step = Number.isInteger(index) ? state.activeSteps[index] : undefined;
        const parsed = stepPracticeOptionsSchema.safeParse(patch);
        if (!step || step.locked || isRestStep(step) || !parsed.success) {
          const message = !step
            ? '옵션을 바꿀 동작을 선택해 주세요.'
            : step.locked
              ? '잠긴 동작은 횟수·좌우를 바꿀 수 없습니다. 먼저 잠금을 해제해 주세요.'
              : isRestStep(step)
                ? '휴식에는 횟수나 좌우를 지정할 수 없습니다.'
                : '횟수는 1–1000, 세트는 1–100 사이 정수로, 좌우는 제공된 선택값으로 입력해 주세요.';
          set({ generationError: message });
          return { success: false, message };
        }
        if (!Object.keys(parsed.data).length)
          return { success: true, message: '변경할 옵션이 없습니다.' };
        const merged = editedStepOptions(step, parsed.data);
        if ('message' in merged) {
          set({ generationError: merged.message });
          return { success: false, message: merged.message };
        }
        const next = merged.next;
        set(
          edit(state, {
            activeSteps: state.activeSteps.map((item, i) => (i === index ? next : item)),
          }),
        );
        return {
          success: true,
          message: '횟수와 좌우를 저장했습니다. 전체 수행 시간은 유지됩니다.',
        };
      },
      setStepTimingOptions: (index, patch) => {
        const state = get();
        const step = Number.isInteger(index) ? state.activeSteps[index] : undefined;
        const parsed = stepTimingOptionsSchema.safeParse(patch);
        if (!step || step.locked || isRestStep(step) || !parsed.success) {
          const message = !step
            ? '시간을 바꿀 동작을 선택해 주세요.'
            : step.locked
              ? '잠긴 동작은 시간·기구 메모를 바꿀 수 없습니다. 먼저 잠금을 해제해 주세요.'
              : isRestStep(step)
                ? '휴식 시간은 휴식 편집에서 바꿔 주세요.'
                : '전체 시간은 0.5–20분, 설명·전환은 0–1200초, 기구 메모는 500자 이내로 입력해 주세요. 전체 시간은 지울 수 없습니다.';
          set({ generationError: message });
          return { success: false, message };
        }
        if (!Object.keys(parsed.data).length)
          return { success: true, message: '변경할 설정이 없습니다.' };
        const merged = editedStepOptions(step, parsed.data);
        if ('message' in merged) {
          set({ generationError: merged.message });
          return { success: false, message: merged.message };
        }
        const next = merged.next;
        set(
          edit(state, {
            activeSteps: state.activeSteps.map((item, i) => (i === index ? next : item)),
          }),
        );
        return {
          success: true,
          message: '이번 수업의 강사 입력 시간·기구 메모를 저장했습니다.',
        };
      },
      setStepBlockOptions: (index, patch, expectedStep) => {
        const state = get();
        const step = Number.isInteger(index) ? state.activeSteps[index] : undefined;
        if (expectedStep && JSON.stringify(step) !== JSON.stringify(expectedStep)) {
          const message =
            '다른 편집으로 이 블록이 바뀌었습니다. 현재 값을 다시 불러온 뒤 확인해 주세요.';
          set({ generationError: message });
          return { success: false, message };
        }
        const parsed = stepBlockOptionsSchema.safeParse(patch);
        if (!step || step.locked || isRestStep(step) || !parsed.success) {
          const message = !step
            ? '설정을 바꿀 동작을 선택해 주세요.'
            : step.locked
              ? '잠긴 동작은 설정을 바꿀 수 없습니다. 먼저 잠금을 해제해 주세요.'
              : isRestStep(step)
                ? '휴식에는 동작 설정을 적용할 수 없습니다. 휴식 편집을 이용해 주세요.'
                : '전체 시간 0.5–20분, 설명·전환 0–1200초, 횟수 1–1000회, 세트 1–100과 메모 길이를 확인해 주세요.';
          set({ generationError: message });
          return { success: false, message };
        }
        if (!Object.keys(parsed.data).length)
          return { success: true, message: '변경할 설정이 없습니다.' };
        if (
          parsed.data.motionStudy &&
          !state.exercises.some((exercise) => exercise.id === step.exerciseId)
        ) {
          const message = '연결할 동작 자료를 찾을 수 없습니다. 현재 동작을 먼저 확인해 주세요.';
          set({ generationError: message });
          return { success: false, message };
        }
        if (parsed.data.selectedLayer !== undefined) {
          const exercise = state.exercises.find((item) => item.id === step.exerciseId);
          const authoredLayer = exercise?.layers?.[parsed.data.selectedLayer];
          if (typeof authoredLayer !== 'string' || !authoredLayer.trim()) {
            const message =
              '선택한 변형의 작성된 설명을 찾을 수 없습니다. 동작 자료를 먼저 확인해 주세요.';
            set({ generationError: message });
            return { success: false, message };
          }
        }
        const merged = editedStepOptions(step, parsed.data);
        if ('message' in merged) {
          set({ generationError: merged.message });
          return { success: false, message: merged.message };
        }
        set(
          edit(state, {
            activeSteps: state.activeSteps.map((item, i) => (i === index ? merged.next : item)),
          }),
        );
        return {
          success: true,
          message: '이번 수업의 강사 입력 블록 설정을 한 번에 저장했습니다.',
        };
      },
      adjustStepDuration: (index, deltaMin) =>
        set((state) => {
          const step = state.activeSteps[index];
          if (!step || step.locked || !Number.isFinite(deltaMin)) return state;
          if (isRestStep(step)) {
            const activeSteps = state.activeSteps.map((item, i) =>
              i === index ? { ...item, durationMin: item.durationMin + deltaMin } : item,
            );
            const message = restDurationError(activeSteps, state.activeTargetMinutes);
            return message ? { generationError: message } : edit(state, { activeSteps });
          }
          const min = Math.max(
            1,
            ((step.explanationSec ?? 0) + (step.transitionSec ?? 0) + 30) / 60,
          );
          return edit(state, {
            activeSteps: state.activeSteps.map((item, i) =>
              i === index
                ? {
                    ...item,
                    durationMin: Math.max(min, Math.min(20, item.durationMin + deltaMin)),
                  }
                : item,
            ),
          });
        }),
      setStepLayer: (index, layer) =>
        set((state) =>
          !state.activeSteps[index] ||
          state.activeSteps[index].locked ||
          isRestStep(state.activeSteps[index])
            ? state
            : edit(state, {
                activeSteps: state.activeSteps.map((step, i) =>
                  i === index ? { ...step, selectedLayer: layer } : step,
                ),
              }),
        ),
      scaleAllStepsLayer: (layer) =>
        set((state) =>
          edit(state, {
            activeSteps: state.activeSteps.map((step) =>
              step.locked || isRestStep(step) ? step : { ...step, selectedLayer: layer },
            ),
          }),
        ),
      updateStepNote: (index, note) =>
        set((state) =>
          !state.activeSteps[index] || state.activeSteps[index].locked
            ? state
            : edit(state, {
                activeSteps: state.activeSteps.map((step, i) =>
                  i === index ? { ...step, instructorNote: note } : step,
                ),
              }),
        ),
      moveStep: (index, direction) =>
        set((state) => {
          const target = index + (direction === 'up' ? -1 : 1);
          if (
            !state.activeSteps[index] ||
            !state.activeSteps[target] ||
            state.activeSteps[index].locked ||
            state.activeSteps[target].locked
          )
            return state;
          const next = [...state.activeSteps];
          [next[index], next[target]] = [next[target], next[index]];
          return edit(state, {
            activeSteps: next.map((step, i) => (step.locked ? step : { ...step, order: i + 1 })),
          });
        }),
      removeStep: (index) =>
        set((state) => {
          if (
            !state.activeSteps[index] ||
            state.activeSteps[index].locked ||
            (state.activeSteps.length <= 1 && !isRestStep(state.activeSteps[index]))
          )
            return state;
          return edit(state, {
            activeSteps: state.activeSteps
              .filter((_, i) => i !== index)
              .map((step, i) => (step.locked ? step : { ...step, order: i + 1 })),
          });
        }),
      addRestStep: (durationMin, afterIndex) => {
        const state = get();
        const index = afterIndex ?? state.activeSteps.length - 1;
        if (!Number.isInteger(index) || index < -1 || index >= state.activeSteps.length) {
          const message = '휴식을 넣을 위치를 확인해 주세요.';
          set({ generationError: message });
          return { success: false, message };
        }
        const criteria = activeCriteria(state);
        const rest: SequenceStep = {
          kind: 'rest',
          stepId: newId('rest'),
          order: index + 2,
          blockCategory: 'core',
          exerciseId: '',
          durationMin,
          selectedLayer: 'standard',
        };
        const activeSteps = [...state.activeSteps];
        activeSteps.splice(index + 1, 0, rest);
        const message = restDurationError(activeSteps, criteria.targetMinutes);
        if (message) {
          set({ generationError: message });
          return { success: false, message };
        }
        set(
          edit(state, {
            activeSteps: activeSteps.map((step, i) =>
              step.locked ? step : { ...step, order: i + 1 },
            ),
            ...(!state.activeSteps.length
              ? {
                  activeTargetMinutes: criteria.targetMinutes,
                  activeApparatus: criteria.apparatus,
                  activeLevel: criteria.level,
                }
              : {}),
          }),
        );
        return {
          success: true,
          message:
            '수업 총시간 안에 휴식을 추가했습니다. 시간 맞추기로 동작 시간을 조정할 수 있습니다.',
        };
      },
      setRestDuration: (index, durationMin) => {
        const state = get();
        const step = state.activeSteps[index];
        if (!step || !isRestStep(step) || step.locked) {
          const message = step?.locked
            ? '잠긴 휴식은 시간을 바꿀 수 없습니다. 먼저 잠금을 해제해 주세요.'
            : '시간을 바꿀 휴식을 선택해 주세요.';
          set({ generationError: message });
          return { success: false, message };
        }
        const activeSteps = state.activeSteps.map((item, i) =>
          i === index ? { ...item, durationMin } : item,
        );
        const message = restDurationError(activeSteps, state.activeTargetMinutes);
        if (message) {
          set({ generationError: message });
          return { success: false, message };
        }
        set(edit(state, { activeSteps }));
        return { success: true, message: '휴식 시간을 변경했습니다.' };
      },
      appendExerciseToSequence: (exerciseId, blockCategory) =>
        set((state) => {
          const exercise = state.exercises.find((item) => item.id === exerciseId);
          if (!exercise) return state;
          if (duplicatesAnotherStep(state, exercise))
            return {
              generationError:
                '같은 동작의 중복 구성은 추가할 수 없습니다. 다른 동작을 선택해 주세요.',
            };
          const criteria = activeCriteria(state);
          const equipment = getExerciseEquipment(exercise);
          if (
            !exerciseMatchesCriteria(exercise, criteria) ||
            !equipment.requiredEquipment.every((id) => state.ownedEquipment.includes(id)) ||
            !equipment.requiredProps.every((prop) => state.ownedProps.includes(prop))
          )
            return {
              generationError:
                '현재 선택한 기구·소도구와 최대 난이도 조건에 맞는 동작만 추가할 수 있습니다.',
            };
          const previous = state.exercises.find(
            (item) => item.id === state.activeSteps.at(-1)?.exerciseId,
          );
          const previousEquipment = previous
            ? [...getExerciseEquipment(previous).requiredEquipment].sort().join('|')
            : '';
          const transitionSec = !state.activeSteps.length
            ? 0
            : previousEquipment === [...equipment.requiredEquipment].sort().join('|')
              ? 15
              : 45;
          return edit(state, {
            activeSteps: [
              ...state.activeSteps,
              {
                stepId: newId('step-add'),
                order: state.activeSteps.length + 1,
                blockCategory: blockCategory ?? exercise.blockCategory,
                exerciseId,
                durationMin: Math.max(
                  1,
                  (20 + transitionSec + 30) / 60,
                  Math.min(20, exercise.defaultDurationMin),
                ),
                selectedLayer: criteria.defaultLayer,
                explanationSec: 20,
                transitionSec,
              },
            ],
            ...(!state.activeSteps.length
              ? {
                  activeApparatus: criteria.apparatus,
                  activeLevel: criteria.level,
                  activeTargetMinutes: criteria.targetMinutes,
                  activeTargetGroupId: criteria.targetGroupId ?? state.activeTargetGroupId,
                }
              : {}),
          });
        }),
      optimizeActiveTransitions: () => {
        const state = get();
        try {
          const map = new Map(state.exercises.map((exercise) => [exercise.id, exercise]));
          const optimized = optimizeSequenceTransitions(state.activeSteps, map);
          const activeSteps = fitSequenceDuration(
            applyTransitionAllowances(optimized, map),
            state.activeTargetMinutes,
          );
          set(
            edit(state, {
              activeSteps,
              ...(activeSteps.some((step) => step.locked)
                ? {
                    saveFeedback: '잠긴 항목의 기존 동작·설명·전환 시간은 유지했습니다.',
                  }
                : {}),
            }),
          );
        } catch (error) {
          set({ generationError: errorMessage(error) });
        }
      },
      swapFreshExercisesForGroup: () => {
        const state = get();
        try {
          const criteria = resolveCriteria(activeCriteria(state), state);
          const activeSteps = swapDuplicateStepsWithFresh(
            state.activeSteps,
            state.exercises,
            state.historyLogs,
            state.activeTargetGroupId,
            criteria,
          );
          set(
            edit(state, {
              activeSteps,
              ...(activeSteps.some((step) => step.locked)
                ? {
                    saveFeedback: '잠긴 항목의 기존 동작·설명·전환 시간은 유지했습니다.',
                  }
                : {}),
            }),
          );
        } catch (error) {
          set({ generationError: errorMessage(error) });
        }
      },
      saveCurrentSequenceToBinder: (asNew = false) => {
        const state = get();
        const existing = state.savedSequences.find(
          (sequence) => sequence.id === state.activeSequenceId,
        );
        const id = !asNew && existing ? existing.id : newId('seq');
        const now = new Date().toISOString();
        const sequence: SavedSequence = {
          id,
          title: state.activeTitle,
          subtitle: state.activeSubtitle,
          apparatus: state.activeApparatus,
          level: state.activeLevel,
          focusTags: existing?.focusTags ?? ['내 수업'],
          targetMinutes: state.activeTargetMinutes,
          steps: cloneSteps(state.activeSteps),
          createdAt: !asNew && existing ? existing.createdAt : now,
          updatedAt: now,
          taughtCount: !asNew && existing ? existing.taughtCount : 0,
          lastTaughtAt: !asNew && existing ? existing.lastTaughtAt : undefined,
          criteriaSnapshot: activeCriteriaSnapshot(state),
          ...(existing?.recoveredDraftOrigin
            ? {
                recoveredDraftOrigin: recoveredDraftOriginSchema.parse(
                  existing.recoveredDraftOrigin,
                ),
              }
            : {}),
        };
        set({
          savedSequences:
            !asNew && existing
              ? state.savedSequences.map((item) => (item.id === id ? sequence : item))
              : [sequence, ...state.savedSequences],
          activeSequenceId: id,
          saveFeedback: '이 브라우저에 수업을 저장했습니다.',
        });
        return id;
      },
      duplicateSavedSequence: (sequenceId) => {
        const state = get();
        const source = state.savedSequences.find((sequence) => sequence.id === sequenceId);
        if (!source) return undefined;
        const id = newId('seq-copy');
        const now = new Date().toISOString();
        set({
          savedSequences: [
            {
              ...source,
              ...(source.recoveredDraftOrigin
                ? {
                    recoveredDraftOrigin: recoveredDraftOriginSchema.parse(
                      source.recoveredDraftOrigin,
                    ),
                  }
                : {}),
              id,
              title: `${source.title} (복사)`,
              steps: cloneSteps(source.steps),
              criteriaSnapshot: source.criteriaSnapshot
                ? cloneCriteria(source.criteriaSnapshot)
                : undefined,
              createdAt: now,
              updatedAt: now,
              taughtCount: 0,
              lastTaughtAt: undefined,
            },
            ...state.savedSequences,
          ],
          saveFeedback: '수업을 복사했습니다.',
        });
        return id;
      },
      deleteSavedSequence: (sequenceId) =>
        set((state) => ({
          savedSequences: state.savedSequences.filter((sequence) => sequence.id !== sequenceId),
        })),
      loadHistoryIntoWorkbench: (logId) => {
        const state = get();
        const log = state.historyLogs.find((item) => item.id === logId);
        if (!log) return;
        const exerciseMap = new Map(state.exercises.map((exercise) => [exercise.id, exercise]));
        const exerciseIds = log.stepsSnapshot
          ? log.stepsSnapshot.filter((step) => !isRestStep(step)).map((step) => step.exerciseId)
          : log.exerciseIds;
        if (exerciseIds.some((id) => !exerciseMap.has(id))) {
          set({
            generationError:
              '이 기록에 사용한 동작 자료를 찾을 수 없습니다. 전체 백업에서 동작을 먼저 복원해 주세요.',
          });
          return;
        }
        const steps: SequenceStep[] =
          log.stepsSnapshot ??
          log.exerciseIds.map((exerciseId, index) => {
            const exercise = exerciseMap.get(exerciseId)!;
            return {
              stepId: newId('step-history'),
              order: index + 1,
              blockCategory: exercise.blockCategory,
              exerciseId,
              durationMin: exercise.defaultDurationMin,
              selectedLayer: 'standard',
            };
          });
        const copiedMinutes = getSequenceDurations(steps).totalSec / 60;
        const copiedCriteria = criteriaForSteps(
          state,
          steps,
          log.apparatus,
          log.level,
          copiedMinutes,
          log.criteriaSnapshot,
        );
        const families = getEquipmentFamilies(copiedCriteria.availableEquipment ?? []);
        copiedCriteria.apparatus = families.length > 1 ? 'mixed' : (families[0] ?? log.apparatus);
        copiedCriteria.targetGroupId = log.groupId;
        if (log.criteriaSnapshot?.targetGroupId !== log.groupId)
          delete copiedCriteria.instructorObservations;
        const checked = criteriaSchema.safeParse(copiedCriteria);
        if (!checked.success) {
          set({
            generationError:
              (copiedCriteria.restMinutes ?? 0) >= copiedCriteria.targetMinutes
                ? '기록의 휴식 합계가 지원하는 새 수업 목표 시간 이상입니다. 기록과 현재 초안은 그대로 보존했습니다.'
                : '이 기록을 유효한 수업 조건으로 복사할 수 없습니다. 기록과 현재 초안은 그대로 보존했습니다.',
          });
          return;
        }
        const criteria = checked.data;
        set(
          edit(state, {
            draftCriteria: cloneCriteria(criteria),
            lastCriteria: cloneCriteria(criteria),
            activeSequenceId: newId('seq-history'),
            activeTitle: `${log.sequenceTitle} (기록에서 복사)`,
            activeSubtitle: log.stepsSnapshot
              ? `${log.taughtAt.slice(0, 10)} 수업 구성 사본`
              : '동작별 시간 미기록 · 현재 기본값으로 복원',
            activeApparatus: criteria.apparatus,
            activeLevel: criteria.level,
            activeTargetGroupId: log.groupId,
            activeTargetMinutes: criteria.targetMinutes,
            activeSteps: cloneSteps(steps),
            activeTab: 'workbench',
            ...(copiedMinutes !== criteria.targetMinutes
              ? {
                  saveFeedback: `기록의 항목·시간은 그대로 복사했습니다. 새 수업 목표는 지원 범위인 ${criteria.targetMinutes}분으로 설정했습니다. 시작 전에 시간을 조정해 주세요.`,
                }
              : {}),
          }),
        );
      },
      addCustomExercise: (exercise) =>
        set((state) => ({ exercises: mergeById(state.exercises, [exercise]) })),
      addBatchExercisesFromClips: (newExercises, loadAsSequence = false, sequenceTitle) => {
        const state = get();
        const exercises = mergeById(state.exercises, newExercises);
        if (!loadAsSequence || !newExercises.length) {
          set({ exercises });
          return;
        }
        const steps: SequenceStep[] = newExercises.map((exercise, index) => ({
          stepId: newId('step-clip'),
          order: index + 1,
          blockCategory: exercise.blockCategory,
          exerciseId: exercise.id,
          durationMin: exercise.defaultDurationMin,
          selectedLayer: 'standard',
        }));
        const total = steps.reduce((sum, step) => sum + step.durationMin, 0);
        const now = new Date().toISOString();
        const apparatus: ApparatusType | 'mixed' =
          new Set(newExercises.map((exercise) => exercise.apparatus)).size > 1
            ? 'mixed'
            : newExercises[0].apparatus;
        const level = [...newExercises].sort((a, b) => Number(b.level) - Number(a.level))[0].level;
        const sequence: SavedSequence = {
          id: newId('seq-clip'),
          title: sequenceTitle || `영상 참고 수업 (${total}분)`,
          subtitle: '직접 입력한 타임스탬프 · 강사 검토용',
          apparatus,
          level,
          focusTags: ['영상 참고'],
          targetMinutes: total,
          steps,
          createdAt: now,
          updatedAt: now,
          taughtCount: 0,
        };
        set(
          edit(state, {
            exercises,
            savedSequences: [sequence, ...state.savedSequences],
            activeSequenceId: sequence.id,
            activeTitle: sequence.title,
            activeSubtitle: sequence.subtitle,
            activeApparatus: apparatus,
            activeLevel: level,
            activeTargetMinutes: total,
            activeSteps: cloneSteps(steps),
            activeTab: 'workbench',
          }),
        );
      },
      cycleExerciseFavoriteTag: (exerciseId) =>
        set((state) => {
          const tags: FavoriteTag[] = [
            'none',
            'signature',
            'member-love',
            'rehab-posture',
            'burn-sculpt',
          ];
          return {
            exercises: state.exercises.map((exercise) =>
              exercise.id === exerciseId
                ? {
                    ...exercise,
                    favoriteTag: tags[(tags.indexOf(exercise.favoriteTag) + 1) % tags.length],
                  }
                : exercise,
            ),
          };
        }),
      setExerciseFavoriteTag: (exerciseId, tag) =>
        set((state) => ({
          exercises: state.exercises.map((exercise) =>
            exercise.id === exerciseId ? { ...exercise, favoriteTag: tag } : exercise,
          ),
        })),
      logClassSession: (payload) =>
        set((state) => {
          const sequence = state.savedSequences.find((item) => item.id === payload.sequenceId);
          const group = state.classGroups.find((item) => item.id === payload.groupId);
          const isActive = payload.sequenceId === state.activeSequenceId;
          const steps = cloneSteps(
            payload.stepsSnapshot ??
              (isActive ? state.activeSteps : (sequence?.steps ?? state.activeSteps)),
          );
          const log: ClassHistoryLogWithSnapshot = {
            id: newId('log'),
            sequenceId: payload.sequenceId,
            sequenceTitle:
              payload.sequenceTitle ??
              (isActive ? state.activeTitle : (sequence?.title ?? state.activeTitle)),
            groupId: payload.groupId,
            groupName: group?.name ?? '개별 수업',
            taughtAt: payload.taughtAt,
            apparatus: isActive
              ? state.activeApparatus
              : (sequence?.apparatus ?? state.activeApparatus),
            level: isActive ? state.activeLevel : (sequence?.level ?? state.activeLevel),
            exerciseIds: steps.filter((step) => !isRestStep(step)).map((step) => step.exerciseId),
            rating: payload.rating,
            intensity: payload.intensity,
            instructorReflection: payload.instructorReflection,
            stepsSnapshot: steps,
            criteriaSnapshot: payload.criteriaSnapshot
              ? cloneCriteria(payload.criteriaSnapshot)
              : isActive
                ? activeCriteriaSnapshot(state)
                : sequence?.criteriaSnapshot
                  ? cloneCriteria(sequence.criteriaSnapshot)
                  : undefined,
            ...(payload.actualDurationSec !== undefined
              ? { actualDurationSec: payload.actualDurationSec }
              : {}),
            ...(payload.actualRestDurationSec !== undefined
              ? { actualRestDurationSec: payload.actualRestDurationSec }
              : {}),
            ...(payload.programSnapshot
              ? { programSnapshot: structuredClone(payload.programSnapshot) }
              : {}),
          };
          const checkedLog = historySchema.safeParse(log);
          if (!checkedLog.success)
            return {
              generationError:
                checkedLog.error.issues[0]?.message ??
                '수업 기록의 시간과 동작 정보를 확인해 주세요.',
            };
          return {
            historyLogs: [log, ...state.historyLogs],
            savedSequences: state.savedSequences.map((item) =>
              item.id === payload.sequenceId
                ? {
                    ...item,
                    taughtCount: item.taughtCount + 1,
                    lastTaughtAt: payload.taughtAt,
                  }
                : item,
            ),
            generationError: null,
            saveFeedback: '수업 기록을 이 브라우저에 저장했습니다.',
          };
        }),
      addClassGroup: (group) =>
        set((state) => ({
          classGroups: [...state.classGroups, { ...group, id: newId('group') }],
        })),
      updateClassGroup: (groupId, patch) => {
        const state = get();
        const group = state.classGroups.find((item) => item.id === groupId);
        if (!group) {
          const message = '수정할 수업 대상을 찾을 수 없습니다.';
          set({ generationError: message });
          return { success: false, message };
        }
        const parsed = groupProfilePatchSchema.safeParse(patch);
        if (!parsed.success) {
          const message = parsed.error.issues[0]?.message ?? '수업 대상 정보를 확인해 주세요.';
          set({ generationError: message });
          return { success: false, message };
        }
        const changes = Object.fromEntries(
          Object.entries(parsed.data).filter(([, value]) => value !== undefined),
        );
        if (!Object.keys(changes).length) {
          const message = '수정할 대상 정보를 입력해 주세요.';
          set({ generationError: message });
          return { success: false, message };
        }
        const message = `${changes.name ?? group.name} 대상 정보를 저장했습니다. 이전 수업 기록의 별칭은 유지했습니다.`;
        set({
          classGroups: state.classGroups.map((item) =>
            item.id === groupId ? { ...item, ...changes } : item,
          ),
          generationError: null,
          saveFeedback: message,
        });
        return { success: true, message };
      },
      saveCurrentConditionsToGroup: (groupId) => {
        const state = get();
        const group = state.classGroups.find((item) => item.id === groupId);
        if (!group) {
          const message = '조건을 저장할 수업 대상을 찾을 수 없습니다.';
          set({ generationError: message });
          return { success: false, message };
        }
        try {
          const conditions = captureGroupPlanningConditions(
            state.draftCriteria ?? state.lastCriteria ?? activeCriteria(state),
            state,
          );
          const planningPreferences = groupPlanningPreferencesSchema.parse({
            ...group.planningPreferences,
            conditions,
          });
          const message = `${group.name} 대상에 현재 조건을 저장했습니다. 개인 관찰과 다른 대상의 ID는 복사하지 않았습니다.`;
          set({
            classGroups: state.classGroups.map((item) =>
              item.id === groupId ? { ...item, planningPreferences } : item,
            ),
            generationError: null,
            saveFeedback: message,
          });
          return { success: true, message };
        } catch (error) {
          const message = errorMessage(error);
          set({ generationError: message });
          return { success: false, message };
        }
      },
      applyGroupPlanningConditions: (groupId) => {
        const state = get();
        const group = state.classGroups.find((item) => item.id === groupId);
        if (!group) {
          const message = '조건을 적용할 수업 대상을 찾을 수 없습니다.';
          set({ generationError: message });
          return { success: false, message };
        }
        try {
          const criteria = cloneCriteria(applyGroupPlanningConditionsToDraft(group, state));
          delete criteria.instructorObservations;
          const message = `${group.name}의 저장 조건을 초안 조건에 적용했습니다. 현재 시퀀스와 이전 생성 조건은 유지했습니다.`;
          set({
            draftCriteria: criteria,
            activeTargetGroupId: group.id,
            generationError: null,
            saveFeedback: message,
          });
          return { success: true, message };
        } catch (error) {
          const message = errorMessage(error);
          set({ generationError: message });
          return { success: false, message };
        }
      },
      applyGroupDefaultLevel: (groupId) => {
        const state = get();
        const group = state.classGroups.find((item) => item.id === groupId);
        if (!group || !levelSchema.safeParse(group.defaultLevel).success) {
          const message = '적용할 수업 대상의 기본 난이도를 확인해 주세요.';
          set({ generationError: message });
          return { success: false, message };
        }
        const parsed = criteriaSchema.safeParse({
          ...(state.draftCriteria ?? state.lastCriteria ?? activeCriteria(state)),
          level: group.defaultLevel,
          targetGroupId: groupId,
        });
        if (!parsed.success) {
          const message = '수업 시간과 기구 등 현재 조건을 확인한 뒤 기본 난이도를 적용해 주세요.';
          set({ generationError: message });
          return { success: false, message };
        }
        const message = `${group.name}의 기본 난이도 Lv ${group.defaultLevel}을 조건에 적용했습니다. 현재 시퀀스는 유지했습니다.`;
        set({
          draftCriteria: cloneCriteria(parsed.data),
          activeTargetGroupId: groupId,
          generationError: null,
          saveFeedback: message,
        });
        return { success: true, message };
      },
      reuseGroupRecentCriteria: (groupId) => {
        const state = get();
        const group = state.classGroups.find((item) => item.id === groupId);
        if (!group) {
          const message = '조건을 불러올 수업 대상을 찾을 수 없습니다.';
          set({ generationError: message });
          return { success: false, message };
        }
        const candidates = state.historyLogs
          .filter(
            (log) =>
              log.groupId === groupId &&
              !sampleHistoryIds.has(log.id) &&
              Number.isFinite(Date.parse(log.taughtAt)),
          )
          .map((log) => ({
            log,
            parsed: criteriaSchema.safeParse(log.criteriaSnapshot),
          }))
          .filter((candidate) => candidate.parsed.success)
          .sort((a, b) => Date.parse(b.log.taughtAt) - Date.parse(a.log.taughtAt));
        const latest = candidates[0];
        if (!latest || !latest.parsed.success) {
          const message = `${group.name} 대상의 재사용할 수업 조건 기록이 없습니다. 이 대상의 조건을 직접 설정해 주세요.`;
          set({ generationError: message });
          return { success: false, message };
        }
        const criteria = cloneCriteria({
          ...latest.parsed.data,
          targetGroupId: groupId,
        });
        try {
          const checked = resolveCriteria(criteria, state);
          if (!checked.availableEquipment?.length)
            throw new Error(
              '기록에 사용할 기구가 지정되어 있지 않습니다. 수업 조건을 직접 확인해 주세요.',
            );
          if (
            criteria.apparatus !== 'mixed' &&
            !getEquipmentFamilies(checked.availableEquipment).includes(criteria.apparatus)
          )
            throw new Error(
              '기록의 기구 조건이 서로 맞지 않습니다. 수업 조건을 직접 확인해 주세요.',
            );
        } catch (error) {
          const message = `${errorMessage(error)} 현재 조건과 시퀀스는 유지했습니다.`;
          set({ generationError: message });
          return { success: false, message };
        }
        const message = `${group.name}의 ${latest.log.taughtAt.slice(0, 10)} 수업 조건을 불러왔습니다. 현재 시퀀스는 유지했습니다.`;
        set({
          draftCriteria: criteria,
          activeTargetGroupId: groupId,
          generationError: null,
          saveFeedback: message,
        });
        return { success: true, message };
      },
      saveConditionTemplate: (name) => {
        const state = get();
        const trimmed = name.trim();
        if (!trimmed) {
          set({ generationError: '조건 이름을 입력해 주세요.' });
          return;
        }
        const criteria = state.draftCriteria ?? state.lastCriteria ?? activeCriteria(state);
        if (!criteriaSchema.safeParse(criteria).success) {
          set({ generationError: '유효한 수업 조건을 먼저 입력해 주세요.' });
          return;
        }
        set({
          conditionTemplates: [
            {
              id: newId('template'),
              name: trimmed,
              criteria: cloneCriteria(criteria),
              createdAt: new Date().toISOString(),
            },
            ...state.conditionTemplates,
          ],
          saveFeedback: '수업 조건을 저장했습니다.',
        });
      },
      applyConditionTemplate: (id) => {
        const state = get();
        const template = state.conditionTemplates.find((item) => item.id === id);
        if (!template) return;
        set({
          draftCriteria: cloneCriteria(template.criteria),
          lastCriteria: cloneCriteria(template.criteria),
          generationError: null,
          saveFeedback: `${template.name} 조건을 불러왔습니다.`,
        });
      },
      exportBackup: () => {
        const state = get();
        return JSON.stringify(
          {
            format: 'pilates-flow-atelier',
            version: 3,
            exportedAt: new Date().toISOString(),
            data: {
              exercises: state.exercises,
              savedSequences: state.savedSequences,
              classGroups: state.classGroups,
              historyLogs: state.historyLogs,
              conditionTemplates: state.conditionTemplates,
              instructorSchedule: state.instructorSchedule,
              instructorStudyState: state.instructorStudyState,
              datedSequencePlanning: state.datedSequencePlanning,
              lastCriteria: state.lastCriteria,
              draftCriteria: state.draftCriteria,
              activeDraft: draftForBackup(state),
              ownedApparatus: state.ownedApparatus,
              ownedEquipment: state.ownedEquipment,
              ownedProps: state.ownedProps,
            },
          },
          null,
          2,
        );
      },
      restoreBackup: (raw, options) => {
        const disk = getRecoveryStorageStatus(options?.expectedStorageFingerprint);
        if (!disk.ok) return { success: false, message: disk.message };
        const inspection = inspectBackupRecovery(raw, get(), options);
        // Failure and no-op results stay local to the caller; even a feedback-only set persists.
        if (!inspection.success) return { success: false, message: inspection.message };
        if (!inspection.summary.changed)
          return {
            success: true,
            message: inspection.message,
            added: inspection.added,
            unchanged: true,
          };
        // Recheck after planning, immediately before the only changed commit.
        const finalDisk = getRecoveryStorageStatus(disk.fingerprint);
        if (!finalDisk.ok) return { success: false, message: finalDisk.message };
        set({ ...inspection.next, saveFeedback: inspection.message, generationError: null });
        return {
          success: true,
          message: lastStorageError
            ? `${inspection.message} ${lastStorageError}`
            : inspection.message,
          added: inspection.added,
          unchanged: false,
        };
      },
      resetDemoData: () =>
        set((state) =>
          edit(state, {
            exercises: INITIAL_EXERCISES,
            savedSequences: sampleSequences(),
            classGroups: INITIAL_CLASS_GROUPS,
            historyLogs: [],
            conditionTemplates: [],
            lastCriteria: null,
            draftCriteria: null,
            activeSequenceId: defaultSequence.id,
            activeTitle: defaultSequence.title,
            activeSubtitle: defaultSequence.subtitle,
            activeApparatus: defaultSequence.apparatus,
            activeLevel: defaultSequence.level,
            activeTargetMinutes: defaultSequence.targetMinutes,
            activeSteps: cloneSteps(defaultSequence.steps),
          }),
        ),
    }),
    {
      name: RECOVERY_STORAGE_KEY,
      version: 3,
      storage: browserStorage,
      migrate: (persisted) => persisted as PilatesStudioState,
      partialize: (state) => ({
        exercises: state.exercises,
        savedSequences: state.savedSequences,
        classGroups: state.classGroups,
        historyLogs: state.historyLogs,
        conditionTemplates: state.conditionTemplates,
        instructorSchedule: state.instructorSchedule,
        instructorStudyState: state.instructorStudyState,
        datedSequencePlanning: state.datedSequencePlanning,
        activeTab: state.activeTab,
        themeMode: state.themeMode,
        reformerBrand: state.reformerBrand,
        ownedApparatus: state.ownedApparatus,
        ownedEquipment: state.ownedEquipment,
        ownedProps: state.ownedProps,
        mobilePreviewMode: state.mobilePreviewMode,
        ...snapshot(state),
      }),
      merge: (persisted, current) => {
        if (!persisted || typeof persisted !== 'object') return current;
        const raw = persisted as Record<string, unknown>;
        const settings = settingsSchema.safeParse(raw);
        const next = { ...current, ...(settings.success ? settings.data : {}) };
        const equipment = z.array(equipmentSchema).safeParse(raw.ownedEquipment);
        const oldApparatus = z.array(apparatusSchema).safeParse(raw.ownedApparatus);
        if (equipment.success) next.ownedEquipment = [...new Set(equipment.data)];
        else if (oldApparatus.success) next.ownedEquipment = [...new Set(oldApparatus.data)];
        next.ownedApparatus = getEquipmentFamilies(next.ownedEquipment);
        const props = z.array(propSchema).safeParse(raw.ownedProps);
        const oldCriteria = criteriaSchema.safeParse(raw.lastCriteria);
        if (props.success)
          next.ownedProps = [...new Set(props.data.filter((prop) => prop !== 'none'))];
        else if (oldCriteria.success)
          next.ownedProps = [
            ...new Set(oldCriteria.data.preferredProps.filter((prop) => prop !== 'none')),
          ];
        const exercises = z.array(exerciseSchema).safeParse(raw.exercises);
        if (exercises.success) next.exercises = mergeById(exercises.data, INITIAL_EXERCISES);
        const sequences = z.array(sequenceSchema).safeParse(raw.savedSequences);
        if (sequences.success) next.savedSequences = sequences.data;
        const groups = z.array(groupSchema).safeParse(raw.classGroups);
        if (groups.success)
          next.classGroups = preserveCurrentGroupPlanningPreferences(
            current.classGroups,
            groups.data,
          );
        else if (raw.classGroups !== undefined)
          next.generationError =
            '저장된 대상 프로필의 형식을 읽을 수 없어 현재 대상 정보를 유지했습니다. 전체 JSON 백업을 보관해 주세요.';
        const history = z.array(historySchema).safeParse(raw.historyLogs);
        if (history.success) next.historyLogs = history.data;
        if (raw.datedSequencePlanning !== undefined) {
          const planning = datedSequencePlanningSchema.safeParse(raw.datedSequencePlanning);
          if (planning.success) {
            try {
              const merged = mergeDatedSequencePlanning(
                current.datedSequencePlanning ?? createEmptyDatedSequencePlanning(),
                planning.data,
              );
              next.datedSequencePlanning = merged.planning;
              if (merged.conflicts)
                next.generationError =
                  '같은 회차의 날짜별 계획은 현재 로컬 스냅샷을 유지해 복원했습니다.';
            } catch (error) {
              next.generationError = errorMessage(error);
            }
          } else
            next.generationError =
              '저장된 날짜별 계획 형식을 읽을 수 없어 현재 스냅샷을 유지했습니다. 전체 JSON 백업을 보관해 주세요.';
        }
        if (raw.instructorStudyState !== undefined) {
          const study = instructorStudyStateSchema.safeParse(raw.instructorStudyState);
          if (study.success) {
            const merged = mergeInstructorStudyState(current.instructorStudyState, study.data);
            next.instructorStudyState = merged.state;
            if (merged.conflicts)
              next.generationError = '개인 학습 상태는 현재 로컬 설정을 유지해 복원했습니다.';
          } else
            next.generationError =
              '저장된 개인 학습 상태의 형식이 올바르지 않아 현재 설정을 유지했습니다. 전체 JSON 백업을 보관해 주세요.';
        }
        if (raw.instructorSchedule !== undefined) {
          const schedule = instructorScheduleSchema.safeParse(raw.instructorSchedule);
          if (schedule.success) {
            try {
              const merged = mergeSchedule(current.instructorSchedule, schedule.data);
              next.instructorSchedule = merged.schedule;
              if (merged.conflicts)
                next.generationError =
                  '같은 ID의 일정은 현재 로컬 내용을 유지해 복원했습니다. 백업과 일정 내용을 확인해 주세요.';
            } catch (error) {
              next.generationError = errorMessage(error);
            }
          } else {
            next.generationError =
              '저장된 일정 형식을 읽을 수 없어 현재 일정을 유지했습니다. 전체 JSON 백업을 보관하고 일정 내용을 확인해 주세요.';
          }
        }
        return next;
      },
    },
  ),
);
