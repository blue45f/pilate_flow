import { z } from 'zod';
import {
  cloudBackupDataSchema,
  criteriaSchema,
  sequenceSchema,
  stepSchema,
  textSchema,
  apparatusSchema,
  levelSchema,
} from '../schemas/cloudBackupSchema';
import { instructorScheduleSchema } from '../schemas/instructorScheduleSchema';
import {
  INITIAL_CLASS_GROUPS,
  INITIAL_EXERCISES,
  INITIAL_SAVED_SEQUENCES,
} from '../data/pilatesCatalog';
import { getEquipmentFamilies } from '../data/equipmentCatalog';
import type {
  AutoGenerateCriteria,
  ClassGroupProfile,
  ClassHistoryLog,
  ConditionTemplate,
  PilatesExercise,
  PropType,
  SavedSequence,
  SequenceStep,
  ApparatusType,
  DifficultyLevel,
} from '../types/pilates';
import type { InstructorScheduleData } from '../types/instructorSchedule';
import type { InstructorStudyState } from '../types/instructorStudy';
import type { DatedSequencePlanningData } from '../types/datedSequencePlanning';
import type { HumanMovementDraft, ReusableBlock } from '../types/hierarchy';
import { createEmptyDatedSequencePlanning } from '../types/datedSequencePlanning';
import { mergeDatedSequencePlanning } from './datedSequencePlanning';
import { mergeInstructorStudyState } from './instructorStudy';
import { preserveCurrentGroupPlanningPreferences } from './instructorPlanning';

/** Matches the existing file picker. Cloud backup retains its separate2MiB policy. */
export const MAX_LOCAL_BACKUP_BYTES = 15_000_000;
export type RecoverySourceKind =
  'export-v3' | 'persisted-v3' | 'persisted-original-v0' | 'bare-data';
export interface RecoveryCurrentState {
  exercises: PilatesExercise[];
  savedSequences: SavedSequence[];
  classGroups: ClassGroupProfile[];
  historyLogs: ClassHistoryLog[];
  humanMovementDrafts?: HumanMovementDraft[];
  reusableBlocks?: ReusableBlock[];
  conditionTemplates: ConditionTemplate[];
  instructorSchedule: InstructorScheduleData;
  instructorStudyState?: InstructorStudyState;
  datedSequencePlanning?: DatedSequencePlanningData;
  ownedEquipment: string[];
  ownedProps: PropType[];
  lastCriteria: AutoGenerateCriteria | null;
  draftCriteria: AutoGenerateCriteria | null;
  activeSequenceId: string;
  activeTitle: string;
  activeSubtitle: string;
  activeApparatus: ApparatusType | 'mixed';
  activeLevel: DifficultyLevel;
  activeTargetMinutes: number;
  activeTargetGroupId: string;
  activeSteps: SequenceStep[];
}
export type RecoveryNextState = Pick<
  RecoveryCurrentState,
  | 'exercises'
  | 'savedSequences'
  | 'classGroups'
  | 'historyLogs'
  | 'humanMovementDrafts'
  | 'reusableBlocks'
  | 'conditionTemplates'
  | 'instructorSchedule'
  | 'instructorStudyState'
  | 'datedSequencePlanning'
  | 'ownedEquipment'
  | 'ownedProps'
  | 'lastCriteria'
  | 'draftCriteria'
> & { ownedApparatus: ApparatusType[] };
export interface RecoveryCountRow {
  key: string;
  label: string;
  incoming: number;
  newItems: number;
  keptExisting: number;
  conflicts: number;
  restoredExamples: number;
}
export interface RecoveryNotice {
  code: string;
  message: string;
  count?: number;
}
export interface RecoverySummary {
  sourceKind: RecoverySourceKind;
  sourceLabel: string;
  bytes: number;
  rows: RecoveryCountRow[];
  newItems: number;
  conflicts: number;
  restoredExamples: number;
  legacyDraftIncluded: boolean;
  changed: boolean;
  notices: RecoveryNotice[];
}
export interface BackupRecoveryOptions {
  expectedStateFingerprint?: string;
  /** Checked by the store against its observed disk baseline; the inspection itself is pure. */
  expectedStorageFingerprint?: string;
}
export type BackupRecoveryInspection =
  | {
      success: true;
      summary: RecoverySummary;
      stateFingerprint: string;
      next: RecoveryNextState;
      added: number;
      message: string;
    }
  | {
      success: false;
      code: string;
      message: string;
      unsupportedItems?: number;
    };
class InspectionError extends Error {
  constructor(
    public code: string,
    message: string,
    public unsupportedItems?: number,
  ) {
    super(message);
  }
}
const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const DANGEROUS_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
export const MAX_BACKUP_JSON_DEPTH = 64;

function assertSafeJsonInputTree(root: unknown, maxDepth = MAX_BACKUP_JSON_DEPTH): void {
  const stack: Array<{ value: unknown; depth: number }> = [{ value: root, depth: 0 }];
  while (stack.length > 0) {
    const current = stack.pop()!;
    const { value, depth } = current;
    if (value === null || typeof value !== 'object') continue;
    if (depth > maxDepth) {
      throw new InspectionError(
        'invalid_data',
        '백업 JSON의 중첩 깊이가 허용 상한을 초과하여 복원을 적용하지 않았습니다.',
      );
    }
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i += 1) {
        stack.push({ value: value[i], depth: depth + 1 });
      }
      continue;
    }
    const ownNames = Object.getOwnPropertyNames(value);
    for (let i = 0; i < ownNames.length; i += 1) {
      const key = ownNames[i];
      if (DANGEROUS_OBJECT_KEYS.has(key)) {
        throw new InspectionError(
          'unsupported_fields',
          '백업 파일에 허용되지 않는 프로토타입 예약 키(__proto__·constructor·prototype)가 포함되어 복원하지 않았습니다.',
          1,
        );
      }
      stack.push({
        value: (value as Record<string, unknown>)[key],
        depth: depth + 1,
      });
    }
  }
}

/** Canonical persisted JSON content. This is not a signature or an authentication token. */
export function canonicalRecoveryContent(value: unknown): string {
  const normalize = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(normalize);
    if (item !== null && typeof item === 'object')
      return Object.fromEntries(
        Object.entries(item)
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([key, entry]) => [key, normalize(entry)]),
      );
    return item;
  };
  return JSON.stringify(normalize(value));
}
export function backupRecoveryStateFingerprint(state: RecoveryCurrentState): string {
  return canonicalRecoveryContent({
    exercises: state.exercises,
    savedSequences: state.savedSequences,
    classGroups: state.classGroups,
    historyLogs: state.historyLogs,
    ...(state.humanMovementDrafts !== undefined
      ? { humanMovementDrafts: state.humanMovementDrafts }
      : {}),
    ...(state.reusableBlocks !== undefined ? { reusableBlocks: state.reusableBlocks } : {}),
    conditionTemplates: state.conditionTemplates,
    instructorSchedule: state.instructorSchedule,
    instructorStudyState: state.instructorStudyState,
    datedSequencePlanning: state.datedSequencePlanning,
    ownedEquipment: state.ownedEquipment,
    ownedProps: state.ownedProps,
    lastCriteria: state.lastCriteria,
    draftCriteria: state.draftCriteria,
    workspace: {
      id: state.activeSequenceId,
      title: state.activeTitle,
      subtitle: state.activeSubtitle,
      apparatus: state.activeApparatus,
      level: state.activeLevel,
      target: state.activeTargetMinutes,
      group: state.activeTargetGroupId,
      steps: state.activeSteps,
    },
  });
}
function strippedKeys(raw: unknown, checked: unknown): number {
  if (Array.isArray(raw) && Array.isArray(checked))
    return raw.reduce((sum, value, index) => sum + strippedKeys(value, checked[index]), 0);
  if (!isObject(raw) || !isObject(checked)) return 0;
  return Object.keys(raw).reduce(
    (sum, key) => sum + (own(checked, key) ? strippedKeys(raw[key], checked[key]) : 1),
    0,
  );
}
const isoTimestamp = z
  .string()
  .datetime()
  .refine((value) => {
    const date = new Date(value);
    return (
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(value) &&
      Number.isFinite(date.getTime()) &&
      value.slice(0, 19) === date.toISOString().slice(0, 19)
    );
  });
const exportEnvelope = z
  .object({
    format: z.literal('pilates-flow-atelier'),
    version: z.literal(3),
    exportedAt: isoTimestamp,
    data: z.record(z.unknown()),
  })
  .strict();
const persistedEnvelope = z
  .object({ version: z.union([z.literal(0), z.literal(3)]), state: z.record(z.unknown()) })
  .strict();
const dataKeys = new Set(Object.keys(cloudBackupDataSchema.shape));
const workspaceKeys = new Set([
  'activeSequenceId',
  'activeTitle',
  'activeSubtitle',
  'activeApparatus',
  'activeLevel',
  'activeTargetMinutes',
  'activeTargetGroupId',
  'activeSteps',
  'activeTab',
  'themeMode',
  'reformerBrand',
  'mobilePreviewMode',
]);
const legacyDraftSchema = z.object({
  activeSequenceId: textSchema.min(1),
  activeTitle: textSchema,
  activeSubtitle: textSchema,
  activeApparatus: z.union([apparatusSchema, z.literal('mixed')]),
  activeLevel: levelSchema,
  activeTargetMinutes: z.number().finite().min(10).max(120),
  activeTargetGroupId: textSchema,
  activeSteps: z.array(stepSchema).min(1).max(1000),
});
/** Stable identity only; full semantic equality is still checked on a generated-ID collision. */
function legacyDraftId(content: unknown): string {
  let hash = 0x6c62272e07bb014262b821756295c58dn;
  const mask = (1n << 128n) - 1n;
  for (const byte of new TextEncoder().encode(canonicalRecoveryContent(content)))
    hash = ((hash ^ BigInt(byte)) * 0x0000000001000000000000000013bn) & mask;
  return `backup-legacy-draft-${hash.toString(16).padStart(32, '0')}`;
}
function legacyDraft(state: Record<string, unknown>, version: 0 | 3): SavedSequence | undefined {
  if (!own(state, 'activeSteps')) return undefined;
  if (!Array.isArray(state.activeSteps))
    throw new InspectionError(
      'legacy_draft_invalid',
      '이전 작업대의 블록 목록이 올바르지 않아 별도 초안으로 보존할 수 없습니다.',
    );
  if (!state.activeSteps.length) return undefined;
  const parsed = legacyDraftSchema.safeParse(state);
  if (!parsed.success) {
    const labels: Record<string, string> = {
      activeSequenceId: '초안 식별자',
      activeTitle: '수업 제목',
      activeSubtitle: '부제목',
      activeApparatus: '기구 분류',
      activeLevel: '선택 난이도',
      activeTargetMinutes: '목표 시간',
      activeTargetGroupId: '반 연결',
      activeSteps: '블록·잠금·휴식 값',
    };
    const fields = [
      ...new Set(
        parsed.error.issues.map((issue) => labels[String(issue.path[0])] ?? '초안 메타데이터'),
      ),
    ];
    throw new InspectionError(
      'legacy_draft_invalid',
      `이전 초안의 ${fields.join('·')}을 확인할 수 없어 복원을 적용하지 않았습니다. 누락값은 추정하지 않습니다.`,
    );
  }
  if (version === 3 && !own(state, 'draftCriteria') && !own(state, 'lastCriteria'))
    throw new InspectionError(
      'legacy_criteria_missing',
      '이전 초안의 작성 조건 기록이 없어 별도 초안으로 보존할 수 없습니다. 원본 파일을 유지해 주세요.',
    );
  const parseCriteria = (key: 'draftCriteria' | 'lastCriteria') => {
    if (!own(state, key) || state[key] === null) return null;
    const criteria = criteriaSchema.parse(state[key]);
    if (strippedKeys(state[key], criteria))
      throw new InspectionError(
        'unsupported_fields',
        '이전 초안 조건에 현재 앱이 보존할 수 없는 추가 항목이 있습니다.',
      );
    return criteria;
  };
  const draftCriteria = parseCriteria('draftCriteria'),
    lastCriteria = parseCriteria('lastCriteria');
  const value = parsed.data;
  const origin = {
    format:
      version === 0 ? ('persisted-workspace-v0' as const) : ('persisted-workspace-v3' as const),
    sourceSequenceId: value.activeSequenceId,
    activeTargetGroupId: value.activeTargetGroupId,
    draftCriteria,
    lastCriteria,
    criteriaPresence: { draft: own(state, 'draftCriteria'), last: own(state, 'lastCriteria') },
    timestamps: 'unrecorded',
  };
  const content = {
    title: value.activeTitle,
    subtitle: value.activeSubtitle,
    apparatus: value.activeApparatus,
    level: value.activeLevel,
    targetMinutes: value.activeTargetMinutes,
    steps: value.activeSteps,
    origin,
  };
  return sequenceSchema.parse({
    id: legacyDraftId(content),
    title: value.activeTitle,
    subtitle: value.activeSubtitle,
    apparatus: value.activeApparatus,
    level: value.activeLevel,
    targetMinutes: value.activeTargetMinutes,
    focusTags: [],
    steps: value.activeSteps,
    createdAt: '',
    updatedAt: '',
    taughtCount: 0,
    ...((draftCriteria ?? lastCriteria) ? { criteriaSnapshot: draftCriteria ?? lastCriteria } : {}),
    recoveredDraftOrigin: origin,
  });
}
function hasDuplicateStepIds(steps: ReadonlyArray<{ stepId: string }> | undefined): boolean {
  if (!steps || steps.length <= 1) return false;
  const seen = new Set<string>();
  for (const step of steps) {
    if (seen.has(step.stepId)) return true;
    seen.add(step.stepId);
  }
  return false;
}

function hasInvalidHistorySnapshotExerciseRefs(
  log: z.infer<typeof cloudBackupDataSchema>['historyLogs'][number],
  known: Set<string>,
): boolean {
  const snapshotExerciseIds = new Set<string>();
  if (log.programSnapshot) {
    const { exercisesById, items } = log.programSnapshot;
    for (const [key, exSnap] of Object.entries(exercisesById)) {
      if (DANGEROUS_OBJECT_KEYS.has(key) || exSnap.id !== key) {
        return true;
      }
      snapshotExerciseIds.add(key);
    }
    for (const item of items) {
      if (item.kind === 'rest') {
        if (item.exerciseId !== '') return true;
        continue;
      }
      if (!item.exerciseId || DANGEROUS_OBJECT_KEYS.has(item.exerciseId)) {
        return true;
      }
      if (item.exerciseSnapshot !== undefined && item.exerciseSnapshot.id !== item.exerciseId) {
        return true;
      }
      if (item.movementSnapshot !== undefined && item.movementSnapshot.id !== item.exerciseId) {
        return true;
      }
      const inExercisesById =
        own(exercisesById, item.exerciseId) &&
        exercisesById[item.exerciseId]?.id === item.exerciseId;
      const inItemSnapshot =
        item.exerciseSnapshot?.id === item.exerciseId ||
        item.movementSnapshot?.id === item.exerciseId;
      if (inItemSnapshot) {
        snapshotExerciseIds.add(item.exerciseId);
      }
      if (!known.has(item.exerciseId) && !inExercisesById && !inItemSnapshot) {
        return true;
      }
    }
  }
  const sequenceSnapshots = [log.sequenceSnapshot, log.programSnapshot?.sequenceSnapshot];
  for (const seqSnap of sequenceSnapshots) {
    if (!seqSnap) continue;
    for (const [key, moveSnap] of Object.entries(seqSnap.exerciseSnapshots)) {
      if (DANGEROUS_OBJECT_KEYS.has(key) || moveSnap.id !== key) {
        return true;
      }
      snapshotExerciseIds.add(key);
    }
    for (const step of seqSnap.steps) {
      if (step.kind === 'rest') continue;
      if (!step.exerciseId || DANGEROUS_OBJECT_KEYS.has(step.exerciseId)) {
        return true;
      }
      if (step.exerciseSnapshot !== undefined && step.exerciseSnapshot.id !== step.exerciseId) {
        return true;
      }
      const inSnapMap =
        own(seqSnap.exerciseSnapshots, step.exerciseId) &&
        seqSnap.exerciseSnapshots[step.exerciseId]?.id === step.exerciseId;
      const inStepSnap = step.exerciseSnapshot?.id === step.exerciseId;
      if (inStepSnap) {
        snapshotExerciseIds.add(step.exerciseId);
      }
      if (!known.has(step.exerciseId) && !inSnapMap && !inStepSnap) {
        return true;
      }
    }
  }
  if (log.stepsSnapshot) {
    for (const step of log.stepsSnapshot) {
      if (step.kind === 'rest') continue;
      if (!step.exerciseId || DANGEROUS_OBJECT_KEYS.has(step.exerciseId)) {
        return true;
      }
      if (step.exerciseSnapshot !== undefined && step.exerciseSnapshot.id !== step.exerciseId) {
        return true;
      }
      if (step.exerciseSnapshot?.id === step.exerciseId) {
        snapshotExerciseIds.add(step.exerciseId);
      }
    }
    if (
      log.stepsSnapshot.some(
        (step) =>
          step.kind !== 'rest' &&
          !known.has(step.exerciseId) &&
          !snapshotExerciseIds.has(step.exerciseId),
      )
    ) {
      return true;
    }
  }
  if (
    log.exerciseIds.some(
      (id) =>
        DANGEROUS_OBJECT_KEYS.has(id) || (!known.has(id) && !snapshotExerciseIds.has(id)),
    )
  ) {
    return true;
  }
  return false;
}

function parseInput(raw: string) {
  const bytes = new TextEncoder().encode(raw).byteLength;
  if (bytes > MAX_LOCAL_BACKUP_BYTES)
    throw new InspectionError('too_large', '15MB 이하의 백업 파일을 선택해 주세요.');
  const input: unknown = JSON.parse(raw);
  if (!isObject(input))
    throw new InspectionError('invalid_format', '알려진 전체 JSON 백업 형식을 확인해 주세요.');
  assertSafeJsonInputTree(input);
  let sourceKind: RecoverySourceKind,
    data: Record<string, unknown>,
    draft: SavedSequence | undefined;
  if (own(input, 'format') || own(input, 'data')) {
    if (input.format === 'pilates-motion-review-packet')
      throw new InspectionError(
        'unsupported_format',
        '이 파일은 동작 대조 자료이며 수업 백업이 아닙니다. 전체 백업에서 내보낸 JSON 파일을 선택해 주세요.',
      );
    if (input.format !== 'pilates-flow-atelier')
      throw new InspectionError(
        'unsupported_format',
        '이 앱에서 지원하는 Pilates Flow 백업 형식이 아닙니다.',
      );
    if (input.version !== 3)
      throw new InspectionError(
        'unsupported_version',
        '이 백업 버전은 현재 앱에서 지원하지 않습니다. 원본 파일을 보관해 주세요.',
      );
    const extra = Object.keys(input).filter(
      (key) => !['format', 'version', 'exportedAt', 'data'].includes(key),
    );
    if (extra.length)
      throw new InspectionError(
        'unsupported_fields',
        '백업 파일 구조에 현재 앱이 보존할 수 없는 추가 항목이 있습니다.',
        extra.length,
      );
    const envelope = exportEnvelope.safeParse(input);
    if (!envelope.success)
      throw new InspectionError(
        'invalid_envelope',
        '백업의 내보낸 시각과 전체 파일 구조를 확인해 주세요. 현재 형식은 유효한 ISO 시각을 포함해야 합니다.',
      );
    sourceKind = 'export-v3';
    data = envelope.data.data;
  } else if (own(input, 'state') || own(input, 'version')) {
    if (input.version !== 0 && input.version !== 3)
      throw new InspectionError(
        'unsupported_version',
        '이전 브라우저 저장 자료는 확인된 원본 버전0과 버전3만 지원합니다.',
      );
    const envelope = persistedEnvelope.safeParse(input);
    if (!envelope.success)
      throw new InspectionError(
        'invalid_envelope',
        '이전 브라우저 저장 자료의 버전과 state 구조를 확인해 주세요.',
      );
    const state = envelope.data.state;
    const unsupported = Object.keys(state).filter(
      (key) => !dataKeys.has(key) && !workspaceKeys.has(key),
    );
    if (unsupported.length)
      throw new InspectionError(
        'unsupported_fields',
        '이전 저장 자료에 현재 앱이 보존할 수 없는 항목이 있습니다. 원본 파일을 유지해 주세요.',
        unsupported.length,
      );
    if (own(state, 'activeDraft'))
      throw new InspectionError(
        'legacy_draft_ambiguous',
        '이전 자료에 두 종류의 초안 구조가 섞여 있어 추정 없이 복원할 수 없습니다.',
      );
    sourceKind = envelope.data.version === 0 ? 'persisted-original-v0' : 'persisted-v3';
    data = Object.fromEntries(Object.entries(state).filter(([key]) => dataKeys.has(key)));
    draft = legacyDraft(state, envelope.data.version);
  } else {
    sourceKind = 'bare-data';
    data = input;
  }
  const checked = cloudBackupDataSchema.parse(data);
  const unsupported = strippedKeys(data, checked);
  if (unsupported)
    throw new InspectionError(
      'unsupported_fields',
      '현재 앱에서 보존할 수 없는 추가 항목이 있어 복원하지 않았습니다. 원본 파일을 유지해 주세요.',
      unsupported,
    );
  const recordSets = [
    checked.exercises,
    checked.savedSequences,
    checked.classGroups,
    checked.historyLogs,
    checked.conditionTemplates ?? [],
    checked.humanMovementDrafts ?? [],
    checked.reusableBlocks ?? [],
  ];
  for (const records of recordSets)
    if (new Set(records.map((record) => record.id)).size !== records.length)
      throw new InspectionError(
        'duplicate_id',
        '같은 유형 안에 중복된 자료 ID가 있어 안전하게 병합할 수 없습니다. 어떤 항목도 적용하지 않았습니다.',
      );
  if (
    checked.activeDraft &&
    checked.savedSequences.some((record) => record.id === checked.activeDraft!.id)
  )
    throw new InspectionError(
      'duplicate_id',
      '저장 수업과 백업 초안이 같은 ID를 사용합니다. 원본 파일을 확인해 주세요.',
    );
  if (draft) {
    const same = checked.savedSequences.find((record) => record.id === draft.id);
    if (same && canonicalRecoveryContent(same) !== canonicalRecoveryContent(draft))
      throw new InspectionError(
        'legacy_draft_collision',
        '이전 초안의 복구 식별자가 다른 수업 내용과 충돌합니다. 어떤 자료도 적용하지 않았습니다.',
      );
    if (!same) checked.activeDraft = sequenceSchema.parse(draft);
  }
  if (
    checked.savedSequences.some((sequence) => hasDuplicateStepIds(sequence.steps)) ||
    hasDuplicateStepIds(checked.activeDraft?.steps) ||
    checked.historyLogs.some(
      (log) =>
        hasDuplicateStepIds(log.stepsSnapshot) ||
        hasDuplicateStepIds(log.programSnapshot?.items) ||
        hasDuplicateStepIds(log.sequenceSnapshot?.steps) ||
        hasDuplicateStepIds(log.programSnapshot?.sequenceSnapshot?.steps),
    )
  ) {
    throw new InspectionError(
      'duplicate_id',
      '같은 수업 또는 이력 스냅샷 안에 중복된 stepId가 있어 안전하게 복원할 수 없습니다. 어떤 항목도 적용하지 않았습니다.',
    );
  }
  return { sourceKind, data: checked, draft, bytes };
}
function mergeRecords<T extends { id: string }>(
  key: string,
  label: string,
  existing: T[],
  incoming: T[],
  defaults: T[] = [],
): { records: T[]; row: RecoveryCountRow } {
  const baseline = new Map(defaults.map((record) => [record.id, record]));
  const local = new Map(existing.map((record) => [record.id, record]));
  const updates = new Map<string, T>();
  const row: RecoveryCountRow = {
    key,
    label,
    incoming: incoming.length,
    newItems: 0,
    keptExisting: 0,
    conflicts: 0,
    restoredExamples: 0,
  };
  const additions: T[] = [];
  for (const record of incoming) {
    const current = local.get(record.id);
    if (!current) {
      additions.push(record);
      row.newItems++;
      continue;
    }
    if (canonicalRecoveryContent(current) === canonicalRecoveryContent(record)) {
      row.keptExisting++;
      continue;
    }
    const example = baseline.get(record.id);
    if (example && canonicalRecoveryContent(current) === canonicalRecoveryContent(example)) {
      updates.set(record.id, record);
      row.restoredExamples++;
    } else {
      row.keptExisting++;
      row.conflicts++;
    }
  }
  return {
    records:
      updates.size || additions.length
        ? [...existing.map((record) => updates.get(record.id) ?? record), ...additions]
        : existing,
    row,
  };
}
function parseFailure(error: unknown): Extract<BackupRecoveryInspection, { success: false }> {
  if (error instanceof InspectionError)
    return {
      success: false,
      code: error.code,
      message: error.message,
      ...(error.unsupportedItems !== undefined ? { unsupportedItems: error.unsupportedItems } : {}),
    };
  if (error instanceof SyntaxError)
    return {
      success: false,
      code: 'invalid_json',
      message: 'JSON 파일을 읽을 수 없습니다. 원본 백업 파일을 확인해 주세요.',
    };
  return {
    success: false,
    code: 'invalid_data',
    message:
      '백업의 필수 자료·조건·블록 형식이 올바르지 않습니다. 어떤 자료도 적용하지 않았습니다.',
  };
}

/** Read only. Commit must rebuild this plan from current state rather than trusting cached output. */
export function inspectBackupRecovery(
  raw: string,
  current: RecoveryCurrentState,
  options: BackupRecoveryOptions = {},
): BackupRecoveryInspection {
  try {
    const stateFingerprint = backupRecoveryStateFingerprint(current);
    if (
      options.expectedStateFingerprint !== undefined &&
      options.expectedStateFingerprint !== stateFingerprint
    )
      throw new InspectionError(
        'stale_preflight',
        '검토 후 현재 작업 자료가 변경되었습니다. 복구 내용을 다시 읽어 확인해 주세요.',
      );
    const parsed = parseInput(raw),
      data = parsed.data;
    if (parsed.draft) {
      const local = current.savedSequences.find((record) => record.id === parsed.draft!.id);
      if (local && canonicalRecoveryContent(local) !== canonicalRecoveryContent(parsed.draft))
        throw new InspectionError(
          'legacy_draft_collision',
          '이전 초안의 복구 식별자와 현재 저장 수업의 내용이 다릅니다. 현재 자료와 원본 파일을 유지했습니다.',
        );
    }
    const exercises = mergeRecords(
      'exercises',
      '동작 노트',
      current.exercises,
      data.exercises,
      INITIAL_EXERCISES,
    );
    const known = new Set([
      ...exercises.records.map((record) => record.id),
      ...(current.humanMovementDrafts ?? []).map((draft) => draft.id),
      ...(data.humanMovementDrafts ?? []).map((draft) => draft.id),
    ]);
    const importedSequences = [
      ...data.savedSequences,
      ...(data.activeDraft ? [data.activeDraft] : []),
    ];
    if (
      importedSequences.some((sequence) =>
        sequence.steps.some(
          (step) =>
            step.kind !== 'rest' &&
            (DANGEROUS_OBJECT_KEYS.has(step.exerciseId) ||
              (step.exerciseSnapshot !== undefined &&
                step.exerciseSnapshot.id !== step.exerciseId) ||
              (!known.has(step.exerciseId) &&
                step.exerciseSnapshot?.id !== step.exerciseId)),
        ),
      )
    )
      throw new InspectionError(
        'missing_exercise',
        '백업의 저장 수업·초안이 참조하는 동작이 없습니다. 전체 백업을 확인해 주세요.',
      );
    if (data.historyLogs.some((log) => hasInvalidHistorySnapshotExerciseRefs(log, known)))
      throw new InspectionError(
        'missing_exercise',
        '백업의 수업 기록이 참조하는 동작이 없습니다. 전체 백업을 확인해 주세요.',
      );
    const sequences = mergeRecords(
      'savedSequences',
      '저장 수업·복구 초안',
      current.savedSequences,
      importedSequences,
      INITIAL_SAVED_SEQUENCES,
    );
    const groups = mergeRecords(
      'classGroups',
      '반 프로필',
      current.classGroups,
      data.classGroups,
      INITIAL_CLASS_GROUPS,
    );
    const history = mergeRecords(
      'historyLogs',
      '실제 수업 기록',
      current.historyLogs,
      data.historyLogs,
    );
    const templates = mergeRecords(
      'conditionTemplates',
      '조건 템플릿',
      current.conditionTemplates,
      data.conditionTemplates ?? [],
    );
    const scheduleRows: RecoveryCountRow[] = [];
    let schedule = current.instructorSchedule;
    if (data.instructorSchedule) {
      const locations = mergeRecords(
        'locations',
        '장소',
        schedule.locations,
        data.instructorSchedule.locations,
      );
      const classes = mergeRecords(
        'classes',
        '강사 일정',
        schedule.classes,
        data.instructorSchedule.classes,
      );
      const exceptions = mergeRecords(
        'exceptions',
        '일정 예외',
        schedule.exceptions,
        data.instructorSchedule.exceptions,
      );
      const result = instructorScheduleSchema.safeParse({
        locations: locations.records,
        classes: classes.records,
        exceptions: exceptions.records,
      });
      if (!result.success)
        throw new InspectionError(
          'schedule_conflict',
          '일정 병합 후 장소 연결이나 같은 회차의 예외가 충돌합니다. 기존 자료를 보존했으며 복원을 적용하지 않았습니다.',
        );
      schedule = result.data;
      scheduleRows.push(locations.row, classes.row, exceptions.row);
    }
    const study = mergeInstructorStudyState(
      current.instructorStudyState,
      data.instructorStudyState,
    );
    let dated;
    try {
      dated =
        current.datedSequencePlanning === undefined && data.datedSequencePlanning === undefined
          ? { planning: undefined, added: 0, conflicts: 0 }
          : mergeDatedSequencePlanning(
              current.datedSequencePlanning ?? createEmptyDatedSequencePlanning(),
              data.datedSequencePlanning,
            );
    } catch {
      throw new InspectionError(
        'dated_conflict',
        '날짜별 계획의 ID가 다른 회차와 충돌합니다. 기존 스냅샷을 유지했고 복원을 적용하지 않았습니다.',
      );
    }
    const ownedEquipment = [
      ...new Set([
        ...current.ownedEquipment,
        ...(data.ownedEquipment ?? data.ownedApparatus ?? []),
      ]),
    ];
    const ownedProps = [
      ...new Set([
        ...current.ownedProps,
        ...(data.ownedProps ?? data.lastCriteria?.preferredProps ?? []).filter(
          (prop) => prop !== 'none',
        ),
      ]),
    ];
    const humanDrafts =
      current.humanMovementDrafts !== undefined || data.humanMovementDrafts !== undefined
        ? mergeRecords(
            'humanMovementDrafts',
            '새 동작 창작 초안',
            current.humanMovementDrafts ?? [],
            data.humanMovementDrafts ?? [],
          )
        : undefined;
    const reusableBlocks =
      current.reusableBlocks !== undefined || data.reusableBlocks !== undefined
        ? mergeRecords(
            'reusableBlocks',
            '재사용 블록 템플릿',
            current.reusableBlocks ?? [],
            data.reusableBlocks ?? [],
          )
        : undefined;
    const next: RecoveryNextState = {
      exercises: exercises.records,
      savedSequences: sequences.records,
      classGroups: preserveCurrentGroupPlanningPreferences(current.classGroups, groups.records),
      historyLogs: history.records,
      ...(humanDrafts !== undefined ? { humanMovementDrafts: humanDrafts.records } : {}),
      ...(reusableBlocks !== undefined ? { reusableBlocks: reusableBlocks.records } : {}),
      conditionTemplates: templates.records,
      instructorSchedule: schedule,
      instructorStudyState: study.state,
      datedSequencePlanning: dated.planning,
      ownedEquipment,
      ownedProps,
      ownedApparatus: getEquipmentFamilies(ownedEquipment),
      lastCriteria: current.activeSteps.length
        ? current.lastCriteria
        : (current.lastCriteria ?? data.lastCriteria ?? null),
      draftCriteria: current.activeSteps.length
        ? current.draftCriteria
        : (current.draftCriteria ?? data.draftCriteria ?? null),
    };
    const rows = [
      exercises.row,
      sequences.row,
      groups.row,
      history.row,
      templates.row,
      ...(data.humanMovementDrafts !== undefined && humanDrafts ? [humanDrafts.row] : []),
      ...(data.reusableBlocks !== undefined && reusableBlocks ? [reusableBlocks.row] : []),
      ...scheduleRows,
    ];
    if (data.instructorStudyState !== undefined)
      rows.push({
        key: 'study',
        label: '개인 학습 설정',
        incoming: 1,
        newItems: study.added,
        keptExisting: current.instructorStudyState === undefined ? 0 : 1,
        conflicts: study.conflicts,
        restoredExamples: 0,
      });
    if (data.datedSequencePlanning !== undefined)
      rows.push({
        key: 'dated',
        label: '날짜별 수업안',
        incoming: data.datedSequencePlanning.assignments.length,
        newItems: dated.added,
        keptExisting: data.datedSequencePlanning.assignments.length - dated.added,
        conflicts: dated.conflicts,
        restoredExamples: 0,
      });
    const incomingEquipment = [...new Set(data.ownedEquipment ?? data.ownedApparatus ?? [])];
    if (data.ownedEquipment !== undefined || data.ownedApparatus !== undefined)
      rows.push({
        key: 'ownedEquipment',
        label: '보유 기구 설정',
        incoming: incomingEquipment.length,
        newItems: incomingEquipment.filter((id) => !current.ownedEquipment.includes(id)).length,
        keptExisting: incomingEquipment.filter((id) => current.ownedEquipment.includes(id)).length,
        conflicts: 0,
        restoredExamples: 0,
      });
    const incomingProps = [
      ...new Set(
        (data.ownedProps ?? data.lastCriteria?.preferredProps ?? []).filter(
          (prop) => prop !== 'none',
        ),
      ),
    ];
    if (data.ownedProps !== undefined || data.lastCriteria !== undefined)
      rows.push({
        key: 'ownedProps',
        label: '보유 소도구 설정',
        incoming: incomingProps.length,
        newItems: incomingProps.filter((id) => !current.ownedProps.includes(id)).length,
        keptExisting: incomingProps.filter((id) => current.ownedProps.includes(id)).length,
        conflicts: 0,
        restoredExamples: 0,
      });
    const conditionKeys = (['draftCriteria', 'lastCriteria'] as const).filter(
      (key) => data[key] !== undefined,
    );
    if (conditionKeys.length)
      rows.push({
        key: 'criteria',
        label: '이전 수업 조건',
        incoming: conditionKeys.length,
        newItems: conditionKeys.filter(
          (key) => canonicalRecoveryContent(current[key]) !== canonicalRecoveryContent(next[key]),
        ).length,
        keptExisting: conditionKeys.filter(
          (key) => canonicalRecoveryContent(current[key]) === canonicalRecoveryContent(next[key]),
        ).length,
        conflicts: conditionKeys.filter(
          (key) =>
            canonicalRecoveryContent(current[key]) === canonicalRecoveryContent(next[key]) &&
            canonicalRecoveryContent(data[key]) !== canonicalRecoveryContent(current[key]),
        ).length,
        restoredExamples: 0,
      });
    const notices: RecoveryNotice[] = [];
    const filledConditions = conditionKeys.filter(
      (key) => current.activeSteps.length === 0 && current[key] === null && next[key] !== null,
    ).length;
    if (filledConditions)
      notices.push({
        code: 'empty_conditions_filled',
        message:
          '블록이 없는 작업대의 비어 있는 수업 조건·최근 조건을 백업 값으로 채웁니다. 현재 제목·반 선택·시간·블록·잠금은 유지합니다.',
        count: filledConditions,
      });
    if (parsed.sourceKind !== 'export-v3')
      notices.push({
        code: 'legacy_format',
        message: '이전 형식입니다. 원래 내보낸 시각과 생성자를 검증하지 않습니다.',
      });
    if (parsed.sourceKind === 'persisted-v3' || parsed.sourceKind === 'persisted-original-v0')
      notices.push({
        code: 'local_preferences',
        message: '이전 화면·테마 설정은 적용하지 않으며 현재 블록·제목·시간·잠금은 유지합니다.',
      });
    if (parsed.draft)
      notices.push({
        code: 'legacy_draft',
        message:
          '이전 작업대는 기록된 원래 조건·잠금·휴식을 담은 별도 바인더 초안으로 보관합니다. 현재 블록·제목·시간·잠금은 유지하며 원래 작성 시각은 미기록으로 보존합니다.',
        count: 1,
      });
    if (
      parsed.draft?.recoveredDraftOrigin &&
      !parsed.draft.recoveredDraftOrigin.criteriaPresence.draft &&
      !parsed.draft.recoveredDraftOrigin.criteriaPresence.last
    )
      notices.push({
        code: 'legacy_conditions_unrecorded',
        message:
          '초기 원본에는 작성 조건이 기록되지 않았습니다. 미기록 상태로 보존하며 조건을 추정하지 않습니다.',
      });
    const groupIds = new Set(next.classGroups.map((record) => record.id));
    const unresolvedGroups = new Set(
      importedSequences
        .flatMap((record) => [
          record.criteriaSnapshot?.targetGroupId,
          record.recoveredDraftOrigin?.activeTargetGroupId,
          record.recoveredDraftOrigin?.draftCriteria?.targetGroupId,
          record.recoveredDraftOrigin?.lastCriteria?.targetGroupId,
        ])
        .filter((id): id is string => !!id && !groupIds.has(id)),
    ).size;
    if (unresolvedGroups)
      notices.push({
        code: 'dormant_group',
        message:
          '찾을 수 없는 이전 반 연결은 원본 조건에 남겨 두며 다른 반으로 재배정하지 않습니다.',
        count: unresolvedGroups,
      });
    const classIds = new Set(schedule.classes.map((record) => record.id)),
      savedIds = new Set(next.savedSequences.map((record) => record.id));
    const orphanDates = (dated.planning?.assignments ?? []).filter(
      (record) => !classIds.has(record.classId) || !savedIds.has(record.sourceSequenceId),
    ).length;
    if (orphanDates)
      notices.push({
        code: 'dormant_dated',
        message:
          '원래 일정이나 바인더 원본이 없는 날짜별 수업안도 독립 스냅샷과 이전 버전 그대로 보존합니다.',
        count: orphanDates,
      });
    const missingDatedExercises = new Set(
      (dated.planning?.assignments ?? [])
        .flatMap((record) => [
          record.sequenceSnapshot,
          ...(record.priorVersions ?? []).map((version) => version.sequenceSnapshot),
        ])
        .flatMap((sequence) =>
          sequence.steps
            .filter((step) => step.kind !== 'rest' && !known.has(step.exerciseId))
            .map((step) => step.exerciseId),
        ),
    );
    if (missingDatedExercises.size)
      notices.push({
        code: 'dormant_dated_exercise',
        message:
          '날짜별 원본·이전 버전에 남은 동작 연결은 대기 상태로 보존합니다. 현재 동작으로 임의 교체하지 않습니다.',
        count: missingDatedExercises.size,
      });
    const missingBookmarks =
      study.state?.bookmarkedExerciseIds.filter((id) => !known.has(id)).length ?? 0;
    if (missingBookmarks)
      notices.push({
        code: 'dormant_bookmark',
        message: '현재 동작 목록에 없는 북마크는 연결 대기 상태로 보존합니다.',
        count: missingBookmarks,
      });
    const oldDomain = {
      exercises: current.exercises,
      savedSequences: current.savedSequences,
      classGroups: current.classGroups,
      historyLogs: current.historyLogs,
      ...(humanDrafts !== undefined
        ? { humanMovementDrafts: current.humanMovementDrafts ?? [] }
        : {}),
      ...(reusableBlocks !== undefined
        ? { reusableBlocks: current.reusableBlocks ?? [] }
        : {}),
      conditionTemplates: current.conditionTemplates,
      instructorSchedule: current.instructorSchedule,
      instructorStudyState: current.instructorStudyState,
      datedSequencePlanning: current.datedSequencePlanning,
      ownedEquipment: current.ownedEquipment,
      ownedProps: current.ownedProps,
      ownedApparatus: getEquipmentFamilies(current.ownedEquipment),
      lastCriteria: current.lastCriteria,
      draftCriteria: current.draftCriteria,
    };
    const changed = canonicalRecoveryContent(oldDomain) !== canonicalRecoveryContent(next);
    const newItems = rows.reduce((sum, row) => sum + row.newItems, 0),
      conflicts = rows.reduce((sum, row) => sum + row.conflicts, 0),
      restoredExamples = rows.reduce((sum, row) => sum + row.restoredExamples, 0);
    const sourceLabel =
      parsed.sourceKind === 'export-v3'
        ? 'Pilates Flow 전체 백업 v3'
        : parsed.sourceKind === 'persisted-v3'
          ? '이전 브라우저 저장 자료 v3'
          : parsed.sourceKind === 'persisted-original-v0'
            ? '초기 원본 브라우저 저장 자료 v0'
            : '이전 전체 자료 형식';
    const baseMessage = changed
      ? `${newItems}개 새 자료를 추가하고 기본 예시 ${restoredExamples}개를 복원했습니다. 수정한 기존 자료와 현재 초안의 블록·제목·시간·잠금은 유지했습니다.`
      : '추가하거나 바꿀 자료가 없습니다. 현재 자료와 초안을 그대로 유지했습니다.';
    const message =
      baseMessage +
      (filledConditions
        ? ` 비어 있던 수업 조건·최근 조건 ${filledConditions}개를 백업 값으로 채웠습니다.`
        : '') +
      `${conflicts ? ` 충돌 ${conflicts}개는 현재 자료를 유지했습니다.` : ''}${dated.conflicts ? ` 같은 회차의 날짜별 계획 ${dated.conflicts}개는 현재 스냅샷을 유지했습니다.` : ''}${study.conflicts ? ' 개인 학습 상태는 현재 로컬 설정을 유지했습니다.' : ''}${scheduleRows.some((row) => row.conflicts) ? ` 같은 ID의 일정 ${scheduleRows.reduce((sum, row) => sum + row.conflicts, 0)}개는 기존 로컬 내용을 유지했습니다.` : ''}`;
    return {
      success: true,
      summary: {
        sourceKind: parsed.sourceKind,
        sourceLabel,
        bytes: parsed.bytes,
        rows,
        newItems,
        conflicts,
        restoredExamples,
        legacyDraftIncluded: !!parsed.draft,
        changed,
        notices,
      },
      stateFingerprint,
      next,
      added: newItems,
      message,
    };
  } catch (error) {
    return parseFailure(error);
  }
}
