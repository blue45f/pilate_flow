import { describe, expect, it } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { cloudBackupDataSchema, recoveredDraftOriginSchema } from '../schemas/cloudBackupSchema';
import type {
  AutoGenerateCriteria,
  ClassGroupProfile,
  ClassHistoryLog,
  SavedSequence,
  SequenceStep,
} from '../types/pilates';
import { createEmptyInstructorSchedule } from '../types/instructorSchedule';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import { revisionAssigned, revisionSchedule, revisionSource } from '../test/datedRevisionFixtures';
import { isExerciseAutoEligible } from './exerciseReview';
import { getDatedPlanSourceFingerprint, replaceDatedPlanSnapshot } from './datedSequencePlanning';
import {
  backupRecoveryStateFingerprint,
  canonicalRecoveryContent,
  inspectBackupRecovery,
  MAX_LOCAL_BACKUP_BYTES,
} from './backupRecoveryInspection';
import type { RecoveryCurrentState } from './backupRecoveryInspection';
import { createBackupService } from '../../backend/backupService';
import type { BackupRecord, BackupRepository } from '../../backend/backupService';

const NOW = '2026-11-05T10:00:00.000Z';
const mat = syntheticPlanningExercise('mat', 'core', 'alpha', false);
const reformer = syntheticPlanningExercise('reformer', 'core', 'beta', false);

function group(id = 'qa-current-group'): ClassGroupProfile {
  return {
    id,
    name: 'QA_PRIVATE_GROUP_ALIAS',
    type: 'group',
    defaultLevel: '1.0',
    scheduleLabel: '',
    notes: '',
  };
}

function criteria(patch: Partial<AutoGenerateCriteria> = {}): AutoGenerateCriteria {
  return {
    apparatus: 'mixed',
    availableEquipment: ['mat', 'reformer'],
    ownedApparatus: ['mat', 'reformer'],
    level: '1.5',
    focusPreset: 'full-body',
    preferredProps: [],
    excludeDaysWindow: 14,
    targetMinutes: 50,
    restMinutes: 5,
    defaultLayer: 'easy',
    targetGroupId: 'qa-source-group',
    instructorObservations: ['posterior-pelvic-tilt'],
    ...patch,
  };
}

function movement(exerciseId = mat.id, order = 1): SequenceStep {
  return {
    stepId: `qa-movement-${order}`,
    order,
    exerciseId,
    blockCategory: 'core',
    durationMin: 5,
    selectedLayer: 'standard',
    explanationSec: 20,
    transitionSec: 10,
    repetitions: 8,
    sets: 2,
    sideMode: 'left-then-right',
    instructorNote: 'QA_PRIVATE_CUE_NOT_FOR_PREVIEW',
    customSpringOverride: 'QA_PRIVATE_CLASS_SETTING',
    locked: true,
  };
}

function sequence(id = 'qa-saved'): SavedSequence {
  return {
    id,
    title: 'QA_PRIVATE_PLAN_TITLE',
    subtitle: 'QA source metadata',
    apparatus: 'mat',
    level: '1.0',
    focusTags: [],
    targetMinutes: 50,
    steps: [movement()],
    createdAt: NOW,
    updatedAt: NOW,
    taughtCount: 0,
  };
}

function history(id = 'qa-history'): ClassHistoryLog {
  return {
    id,
    sequenceId: 'historical-deleted-sequence',
    sequenceTitle: 'QA historical title',
    groupId: 'historical-deleted-group',
    groupName: 'QA historical alias',
    taughtAt: NOW,
    apparatus: 'mat',
    level: '1.0',
    exerciseIds: [mat.id],
    rating: 4,
    intensity: 'moderate',
    instructorReflection: 'QA_PRIVATE_HISTORY_NOTE',
    stepsSnapshot: [movement()],
  };
}

function current(): RecoveryCurrentState {
  return {
    exercises: [structuredClone(mat)],
    savedSequences: [],
    classGroups: [group()],
    historyLogs: [],
    conditionTemplates: [],
    instructorSchedule: createEmptyInstructorSchedule(),
    ownedEquipment: ['mat'],
    ownedProps: [],
    lastCriteria: null,
    draftCriteria: null,
    activeSequenceId: 'qa-current-unsaved',
    activeTitle: 'QA_CURRENT_DRAFT_UNCHANGED',
    activeSubtitle: 'QA current subtitle',
    activeApparatus: 'mat',
    activeLevel: '1.0',
    activeTargetMinutes: 50,
    activeTargetGroupId: 'qa-current-group',
    activeSteps: [movement()],
  };
}

function data(patch: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    exercises: [],
    savedSequences: [],
    classGroups: [],
    historyLogs: [],
    ...patch,
  };
}

function native(payload: unknown = data(), patch: Record<string, unknown> = {}): string {
  return JSON.stringify({
    format: 'pilates-flow-atelier',
    version: 3,
    exportedAt: NOW,
    data: payload,
    ...patch,
  });
}

function legacy(version: 0 | 3 = 3): {
  version: 0 | 3;
  state: Record<string, unknown>;
} {
  const steps: SequenceStep[] = [
    { ...movement(), durationMin: 22 },
    { ...movement(reformer.id, 2), durationMin: 23, selectedLayer: 'hard' },
    {
      stepId: 'qa-source-rest',
      order: 3,
      kind: 'rest',
      exerciseId: '',
      blockCategory: 'cooldown',
      durationMin: 5,
      selectedLayer: 'standard',
      locked: true,
    },
  ];
  return {
    version,
    state: {
      ...data({
        exercises: [structuredClone(mat), structuredClone(reformer)],
        classGroups: [group('qa-source-group')],
      }),
      activeSequenceId: 'qa-source-unsaved',
      activeTitle: 'QA_PRIVATE_LEGACY_TITLE',
      activeSubtitle: 'QA exact original subtitle',
      activeApparatus: 'mixed',
      activeLevel: '1.5',
      activeTargetMinutes: 50,
      activeTargetGroupId: 'qa-source-group',
      activeSteps: steps,
      activeTab: 'workbench',
      themeMode: 'dark',
      ...(version === 3
        ? {
            draftCriteria: criteria(),
            lastCriteria: criteria({ level: '1.0', planningGoals: ['mobility'] }),
          }
        : {}),
    },
  };
}

function checked(raw: string, state = current()) {
  const result = inspectBackupRecovery(raw, state);
  expect(result.success, result.success ? undefined : result.message).toBe(true);
  if (!result.success) throw new Error(result.message);
  return result;
}

function reverseKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseKeys);
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .reverse()
        .map(([key, entry]) => [key, reverseKeys(entry)]),
    );
  return value;
}

function freeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const entry of Object.values(value)) freeze(entry);
    Object.freeze(value);
  }
  return value;
}

function versionedDate() {
  const prior = revisionAssigned();
  const revised = revisionSource('qa-revised-date-source');
  const result = replaceDatedPlanSnapshot({
    schedule: revisionSchedule(),
    planning: prior.planning,
    assignmentId: prior.assignment.id,
    sequence: revised,
    expectedUpdatedAt: prior.assignment.updatedAt,
    expectedOccurrenceSnapshot: prior.assignment.occurrenceSnapshot,
    expectedSourceFingerprint: getDatedPlanSourceFingerprint(revised),
    now: '2026-11-05T11:00:00.000Z',
  });
  if (!result.success) throw new Error(result.message);
  return result.planning;
}

function memoryService() {
  const records = new Map<string, BackupRecord>();
  const files = new Map<string, string>();
  const repository: BackupRepository = {
    get: async (owner) => records.get(owner) ?? null,
    create: async (owner, record) => {
      if (records.has(owner)) return false;
      records.set(owner, { ...record });
      return true;
    },
    replace: async (owner, previous, record) => {
      if (records.get(owner)?.revision !== previous) return false;
      records.set(owner, { ...record });
      return true;
    },
    write: async (path, raw) => {
      files.set(path, raw);
      return true;
    },
    read: async (path) => files.get(path) ?? null,
    removeFile: async (path) => {
      files.delete(path);
      return true;
    },
  };
  return { service: createBackupService(repository), files, records };
}

describe('read-only recovery inspection and safe legacy conversion', () => {
  it('identifies nativev3 and bare known data, including an explicit no-op empty backup', () => {
    const state = current();
    const before = canonicalRecoveryContent(state);
    const exported = checked(native(), state);
    expect(exported.summary.sourceKind).toBe('export-v3');
    expect(exported.summary.exportedAt).toBe(NOW);
    expect(exported.next).not.toHaveProperty('exportedAt');
    expect(exported.summary.changed).toBe(false);
    expect(exported.summary.newItems).toBe(0);
    expect(exported.message).toContain('추가하거나 바꿀 자료가 없습니다');
    const bare = checked(JSON.stringify(data()), state);
    expect(bare.summary.sourceKind).toBe('bare-data');
    expect(bare.summary.exportedAt).toBeUndefined();
    expect(bare.summary.notices.some((notice) => notice.code === 'legacy_format')).toBe(true);
    expect(canonicalRecoveryContent(state)).toBe(before);
  });

  it.each([0, 3] as const)('does not infer an export time from a legacy v%s backup', (version) => {
    const state = freeze(current());
    const before = canonicalRecoveryContent(state);
    const result = checked(JSON.stringify(legacy(version)), state);
    expect(result.summary.exportedAt).toBeUndefined();
    expect(result.next).not.toHaveProperty('exportedAt');
    expect(canonicalRecoveryContent(state)).toBe(before);
  });

  it('rejects foreign, future and ambiguous envelopes without touching current data', () => {
    const state = freeze(current());
    const before = canonicalRecoveryContent(state);
    for (const [raw, code] of [
      [native(data(), { format: 'foreign-planner' }), 'unsupported_format'],
      [native(data(), { version: 99 }), 'unsupported_version'],
      [JSON.stringify({ version: 1, state: data() }), 'unsupported_version'],
      [JSON.stringify({ version: 4, state: data() }), 'unsupported_version'],
      [native(data(), { state: data() }), 'unsupported_fields'],
      [JSON.stringify({ data: data() }), 'unsupported_format'],
    ]) {
      expect(inspectBackupRecovery(raw, state)).toMatchObject({ success: false, code });
      expect(canonicalRecoveryContent(state)).toBe(before);
    }
  });

  it('requires a real UTC ISO export timestamp rather than permissive Date.parse rollover', () => {
    for (const exportedAt of [
      '',
      '2026-11-05',
      '2026-02-30T10:00:00.000Z',
      '2026-13-05T10:00:00.000Z',
      '2026-11-05T25:00:00.000Z',
      '2026-11-05T10:00:00+09:00',
      '2026-11-05T10:00:00.1234567890Z',
    ])
      expect(inspectBackupRecovery(native(data(), { exportedAt }), current())).toMatchObject({
        success: false,
        code: 'invalid_envelope',
      });
    expect(checked(native(data(), { exportedAt: '2026-11-05T10:00:00Z' })).summary.exportedAt).toBe(
      '2026-11-05T10:00:00Z',
    );
  });

  it('rejects malformed JSON, meaningless foreign objects and fields that would otherwise be stripped', () => {
    expect(inspectBackupRecovery('{broken', current())).toMatchObject({
      success: false,
      code: 'invalid_json',
    });
    for (const raw of ['{}', '[]', 'null', JSON.stringify({ unrelated: true })])
      expect(inspectBackupRecovery(raw, current()).success).toBe(false);
    const extra = inspectBackupRecovery(native(data({ futureFeature: {} })), current());
    expect(extra).toMatchObject({
      success: false,
      code: 'unsupported_fields',
      unsupportedItems: 1,
    });
    const source = legacy();
    source.state.draftCriteria = { ...criteria(), unsupportedPrivateField: 'QA_PRIVATE_VALUE' };
    const result = inspectBackupRecovery(JSON.stringify(source), current());
    expect(result).toMatchObject({ success: false, code: 'unsupported_fields' });
    expect(JSON.stringify(result)).not.toContain('QA_PRIVATE_VALUE');
  });

  it('rejects duplicate record IDs in every top-level collection before merging', () => {
    const records: [string, unknown][] = [
      ['exercises', mat],
      ['savedSequences', sequence()],
      ['classGroups', group('qa-duplicate')],
      ['historyLogs', history()],
      [
        'conditionTemplates',
        { id: 'qa-template', name: 'QA', criteria: criteria(), createdAt: NOW },
      ],
    ];
    const state = freeze(current());
    const before = canonicalRecoveryContent(state);
    for (const [key, record] of records) {
      const raw = native(data({ [key]: [record, structuredClone(record)] }));
      expect(inspectBackupRecovery(raw, state)).toMatchObject({
        success: false,
        code: 'duplicate_id',
      });
      expect(canonicalRecoveryContent(state)).toBe(before);
    }
  });

  it('rejects an incoming Binder/activeDraft identity alias instead of choosing one silently', () => {
    const saved = sequence();
    const result = inspectBackupRecovery(
      native(
        data({ savedSequences: [saved], activeDraft: { ...saved, title: 'QA different draft' } }),
      ),
      current(),
    );
    expect(result).toMatchObject({ success: false, code: 'duplicate_id' });
  });

  it('preserves a complete legacyv3 workspace as an independent Binder draft with exact origin and no inspection writes', () => {
    const source = legacy();
    const state = freeze(current());
    const before = canonicalRecoveryContent(state);
    const result = checked(JSON.stringify(source), state);
    const recovered = result.next.savedSequences.find((item) => item.recoveredDraftOrigin)!;
    expect(result.summary.sourceKind).toBe('persisted-v3');
    expect(result.summary.legacyDraftIncluded).toBe(true);
    expect(recovered.id).toMatch(/^backup-legacy-draft-[0-9a-f]{32}$/);
    expect(recovered.id).not.toBe(source.state.activeSequenceId);
    expect(recovered.id).not.toBe(state.activeSequenceId);
    expect(recovered.steps).toEqual(source.state.activeSteps);
    expect(recovered.steps[0]).toMatchObject({
      locked: true,
      repetitions: 8,
      sets: 2,
      sideMode: 'left-then-right',
      explanationSec: 20,
      transitionSec: 10,
      instructorNote: 'QA_PRIVATE_CUE_NOT_FOR_PREVIEW',
    });
    expect(recovered.steps[2]).toMatchObject({ kind: 'rest', exerciseId: '', locked: true });
    expect(recovered).toMatchObject({
      title: source.state.activeTitle,
      subtitle: source.state.activeSubtitle,
      apparatus: 'mixed',
      level: '1.5',
      targetMinutes: 50,
      createdAt: '',
      updatedAt: '',
      taughtCount: 0,
    });
    expect(recovered.recoveredDraftOrigin).toEqual({
      format: 'persisted-workspace-v3',
      sourceSequenceId: source.state.activeSequenceId,
      activeTargetGroupId: source.state.activeTargetGroupId,
      draftCriteria: source.state.draftCriteria,
      lastCriteria: source.state.lastCriteria,
      criteriaPresence: { draft: true, last: true },
      timestamps: 'unrecorded',
    });
    expect(recovered.criteriaSnapshot).toEqual(source.state.draftCriteria);
    expect(result.next.draftCriteria).toBe(state.draftCriteria);
    expect(result.next.lastCriteria).toBe(state.lastCriteria);
    expect(result.next).not.toHaveProperty('activeSteps');
    expect(result.next.historyLogs).toEqual(state.historyLogs);
    expect(result.next.exercises.filter(isExerciseAutoEligible)).toHaveLength(0);
    expect(canonicalRecoveryContent(state)).toBe(before);
    const previewOnly = JSON.stringify(result.summary);
    for (const secret of [
      'QA_PRIVATE_LEGACY_TITLE',
      'QA_PRIVATE_CUE_NOT_FOR_PREVIEW',
      'QA_PRIVATE_GROUP_ALIAS',
    ])
      expect(previewOnly).not.toContain(secret);
  });

  it('supports proven originalv0 with explicitly unknown criteria andv3 with recorded null criteria', () => {
    const original = checked(JSON.stringify(legacy(0)));
    const recovered = original.next.savedSequences[0];
    expect(original.summary.sourceKind).toBe('persisted-original-v0');
    expect(recovered.recoveredDraftOrigin).toMatchObject({
      format: 'persisted-workspace-v0',
      draftCriteria: null,
      lastCriteria: null,
      criteriaPresence: { draft: false, last: false },
      timestamps: 'unrecorded',
    });
    expect(recovered).not.toHaveProperty('criteriaSnapshot');
    const nullable = legacy();
    nullable.state.draftCriteria = null;
    nullable.state.lastCriteria = null;
    const next = checked(JSON.stringify(nullable)).next.savedSequences[0];
    expect(next.recoveredDraftOrigin?.criteriaPresence).toEqual({ draft: true, last: true });
    expect(next.recoveredDraftOrigin?.draftCriteria).toBeNull();
    expect(next).not.toHaveProperty('criteriaSnapshot');
  });

  it('rejects missing legacy metadata or unsupportedv3 criteria instead of filling values from current state', () => {
    const state = freeze(current());
    const before = canonicalRecoveryContent(state);
    for (const field of [
      'activeTitle',
      'activeSubtitle',
      'activeApparatus',
      'activeLevel',
      'activeTargetMinutes',
      'activeTargetGroupId',
    ]) {
      const source = legacy();
      delete source.state[field];
      expect(inspectBackupRecovery(JSON.stringify(source), state)).toMatchObject({
        success: false,
        code: 'legacy_draft_invalid',
      });
      expect(canonicalRecoveryContent(state)).toBe(before);
    }
    const noCriteria = legacy();
    delete noCriteria.state.draftCriteria;
    delete noCriteria.state.lastCriteria;
    expect(inspectBackupRecovery(JSON.stringify(noCriteria), state)).toMatchObject({
      success: false,
      code: 'legacy_criteria_missing',
    });
    const ambiguous = legacy();
    ambiguous.state.activeDraft = sequence();
    expect(inspectBackupRecovery(JSON.stringify(ambiguous), state)).toMatchObject({
      success: false,
      code: 'legacy_draft_ambiguous',
    });
  });

  it('keeps rest and exercise-reference validation atomic for legacy drafts, stored plans and historical logs', () => {
    const state = freeze(current());
    const before = canonicalRecoveryContent(state);
    const invalidRest = legacy();
    const steps = structuredClone(invalidRest.state.activeSteps) as SequenceStep[];
    steps[2].durationMin = 50;
    invalidRest.state.activeSteps = steps;
    expect(inspectBackupRecovery(JSON.stringify(invalidRest), state).success).toBe(false);
    for (const payload of [
      data({ savedSequences: [{ ...sequence(), steps: [movement('qa-missing')] }] }),
      data({ activeDraft: { ...sequence(), steps: [movement('qa-missing')] } }),
      data({ historyLogs: [{ ...history(), exerciseIds: ['qa-missing'] }] }),
      data({ historyLogs: [{ ...history(), stepsSnapshot: [movement('qa-missing')] }] }),
    ]) {
      expect(inspectBackupRecovery(native(payload), state)).toMatchObject({
        success: false,
        code: 'missing_exercise',
      });
      expect(canonicalRecoveryContent(state)).toBe(before);
    }
  });

  it('deduplicates repeat legacy imports despite JSON ordering and whitespace differences', () => {
    const source = legacy();
    const state = current();
    const first = checked(JSON.stringify(source), state);
    const applied = { ...state, ...first.next };
    const reordered = JSON.stringify(reverseKeys(source), null, 2);
    const again = checked(reordered, applied);
    expect(again.next.savedSequences).toHaveLength(1);
    expect(again.next.savedSequences[0]).toEqual(first.next.savedSequences[0]);
    expect(again.summary.newItems).toBe(0);
    expect(again.summary.changed).toBe(false);
    expect(checked(JSON.stringify(source, null, 4), applied).next.savedSequences).toHaveLength(1);
  });

  it('rejects generated legacy-ID/content collisions against incoming or current Binder records only', () => {
    const source = legacy();
    const recovered = checked(JSON.stringify(source)).next.savedSequences[0];
    const different = { ...recovered, title: 'QA collision with different content' };
    const withCurrent = current();
    withCurrent.savedSequences = [different];
    const before = canonicalRecoveryContent(withCurrent);
    expect(inspectBackupRecovery(JSON.stringify(source), withCurrent)).toMatchObject({
      success: false,
      code: 'legacy_draft_collision',
    });
    expect(canonicalRecoveryContent(withCurrent)).toBe(before);
    source.state.savedSequences = [different];
    expect(inspectBackupRecovery(JSON.stringify(source), current())).toMatchObject({
      success: false,
      code: 'legacy_draft_collision',
    });
  });

  it('reports actual builtin replacement versus edited-local conflicts and permits normal local-wins identity differences', () => {
    const state = current();
    const first = structuredClone(INITIAL_EXERCISES[0]);
    const second = structuredClone(INITIAL_EXERCISES[1]);
    state.exercises = [first, { ...second, nameKo: 'QA local edit wins' }];
    state.activeSteps = [];
    state.savedSequences = [{ ...sequence('qa-normal-id'), title: 'QA local saved edit' }];
    const raw = native(
      data({
        exercises: [
          { ...first, nameKo: 'QA recovered builtin edit' },
          { ...second, nameKo: 'QA competing remote edit' },
          structuredClone(mat),
        ],
        savedSequences: [{ ...sequence('qa-normal-id'), title: 'QA imported saved edit' }],
      }),
    );
    const result = checked(raw, state);
    expect(result.summary.rows.find((row) => row.key === 'exercises')).toMatchObject({
      incoming: 3,
      newItems: 1,
      restoredExamples: 1,
      keptExisting: 1,
      conflicts: 1,
    });
    expect(result.next.exercises.find((item) => item.id === first.id)?.nameKo).toBe(
      'QA recovered builtin edit',
    );
    expect(result.next.exercises.find((item) => item.id === second.id)?.nameKo).toBe(
      'QA local edit wins',
    );
    expect(result.summary.rows.find((row) => row.key === 'savedSequences')).toMatchObject({
      newItems: 0,
      restoredExamples: 0,
      keptExisting: 1,
      conflicts: 1,
    });
    expect(result.next.savedSequences[0].title).toBe('QA local saved edit');
    expect(state.exercises[0].nameKo).toBe(first.nameKo);
  });

  it('roundtrips full legacy origin in a native envelope and the in-memory private backup service without network or identity creation', async () => {
    const imported = checked(JSON.stringify(legacy()));
    const payload = data({
      exercises: imported.next.exercises,
      savedSequences: imported.next.savedSequences,
      classGroups: imported.next.classGroups,
      historyLogs: imported.next.historyLogs,
    });
    const raw = native(payload);
    const rechecked = checked(raw);
    const expected = imported.next.savedSequences[0];
    expect(rechecked.summary.sourceKind).toBe('export-v3');
    expect(rechecked.next.savedSequences[0]).toEqual(expected);
    expect(cloudBackupDataSchema.parse(payload).savedSequences[0].recoveredDraftOrigin).toEqual(
      expected.recoveredDraftOrigin,
    );
    const { service, files } = memoryService();
    const saved = await service.save('qa-unit-memory-principal', {
      requestId: '10000000-0000-4000-8000-000000000001',
      baseRevision: null,
      raw,
    });
    expect(saved.exists).toBe(true);
    const read = await service.read('qa-unit-memory-principal');
    expect(read.raw).toBe(raw);
    expect(JSON.parse(read.raw).data.savedSequences[0].recoveredDraftOrigin).toEqual(
      expected.recoveredDraftOrigin,
    );
    const path = [...files.keys()][0];
    expect(path).toBeDefined();
    files.set(path!, 'QA corrupted in-memory storage bytes');
    await expect(service.read('qa-unit-memory-principal')).rejects.toMatchObject({
      code: 'backup_unavailable',
    });
  });

  it('rejects inconsistent origin presence/version flags and unknown origin fields instead of dropping provenance', () => {
    const recovered = checked(JSON.stringify(legacy())).next.savedSequences[0];
    const origin = recovered.recoveredDraftOrigin!;
    for (const candidate of [
      { ...origin, criteriaPresence: { draft: false, last: true } },
      { ...origin, format: 'persisted-workspace-v4' },
      { ...origin, timestamps: '2020-01-01' },
      { ...origin, inferredClinicalApproval: true },
    ]) {
      expect(recoveredDraftOriginSchema.safeParse(candidate).success).toBe(false);
      expect(
        inspectBackupRecovery(
          native(
            data({
              savedSequences: [{ ...recovered, recoveredDraftOrigin: candidate }],
            }),
          ),
          current(),
        ).success,
      ).toBe(false);
    }
  });

  it('keeps orphan dated versions and dormant bookmarks without fabricating current sources or exercises', () => {
    const dated = versionedDate();
    const state = current();
    const before = canonicalRecoveryContent(state);
    const result = checked(
      native(
        data({
          datedSequencePlanning: dated,
          instructorStudyState: {
            bookmarkedExerciseIds: ['qa-dormant-exercise'],
            rehearsalCueHidden: true,
            completedTutorialTaskIds: [],
          },
        }),
      ),
      state,
    );
    expect(result.next.datedSequencePlanning).toEqual(dated);
    expect(result.next.datedSequencePlanning!.assignments[0].priorVersions).toHaveLength(1);
    expect(result.summary.notices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'dormant_dated', count: 1 }),
        expect.objectContaining({ code: 'dormant_bookmark', count: 1 }),
      ]),
    );
    expect(result.next.exercises.map((item) => item.id)).toEqual([mat.id]);
    expect(result.next.exercises.filter(isExerciseAutoEligible)).toHaveLength(0);
    expect(canonicalRecoveryContent(state)).toBe(before);
  });

  it('keeps local semantic date assignments and rejects cross-occurrence ID aliases or corrupted prior versions atomically', () => {
    const dated = versionedDate();
    const state = current();
    state.datedSequencePlanning = dated;
    const local = dated.assignments[0];
    const changedId = {
      ...local,
      id: 'qa-same-occurrence-other-id',
      priorVersions: undefined,
      state: 'prepared',
    };
    const sameOccurrence = checked(
      native(data({ datedSequencePlanning: { assignments: [changedId] } })),
      state,
    );
    expect(sameOccurrence.next.datedSequencePlanning).toEqual(dated);
    expect(sameOccurrence.summary.rows.find((row) => row.key === 'dated')).toMatchObject({
      newItems: 0,
      keptExisting: 1,
      conflicts: 1,
    });
    const before = canonicalRecoveryContent(state);
    const alias = { ...local, classId: 'qa-other-class', priorVersions: undefined };
    expect(
      inspectBackupRecovery(
        native(data({ datedSequencePlanning: { assignments: [alias] } })),
        state,
      ),
    ).toMatchObject({ success: false, code: 'dated_conflict' });
    const corrupt = JSON.parse(JSON.stringify(dated));
    corrupt.assignments[0].priorVersions[0].updatedAt = corrupt.assignments[0].updatedAt;
    expect(
      inspectBackupRecovery(native(data({ datedSequencePlanning: corrupt })), state).success,
    ).toBe(false);
    expect(canonicalRecoveryContent(state)).toBe(before);
  });

  it('preserves explicit empty study state and cleared local group preferences without applying source conditions', () => {
    const state = current();
    state.instructorStudyState = {
      bookmarkedExerciseIds: [],
      rehearsalCueHidden: true,
      completedTutorialTaskIds: [],
    };
    state.classGroups[0].planningPreferences = {};
    const before = canonicalRecoveryContent(state);
    const reusable = criteria();
    delete reusable.targetGroupId;
    delete reusable.instructorObservations;
    const result = checked(
      native(
        data({
          classGroups: [
            {
              ...group(),
              planningPreferences: {
                ageBand: '60-plus',
                experience: 'new',
                conditions: reusable,
              },
            },
          ],
          instructorStudyState: {
            bookmarkedExerciseIds: ['qa-dormant-exercise'],
            rehearsalCueHidden: false,
            completedTutorialTaskIds: ['qa:completed'],
          },
        }),
      ),
      state,
    );
    expect(result.next.instructorStudyState).toEqual(state.instructorStudyState);
    expect(result.next.classGroups[0].planningPreferences).toEqual({});
    expect(result.summary.rows.find((row) => row.key === 'study')?.conflicts).toBe(1);
    expect(result.next.draftCriteria).toBe(state.draftCriteria);
    expect(result.next.lastCriteria).toBe(state.lastCriteria);
    expect(canonicalRecoveryContent(state)).toBe(before);
    expect(checked(native(), state).next.instructorStudyState).toEqual(state.instructorStudyState);
  });

  it('detects semantic schedule conflicts introduced only after combining two independently valid schedules', () => {
    const state = current();
    state.instructorSchedule = revisionSchedule();
    state.instructorSchedule.exceptions = [
      {
        id: 'qa-local-cancel',
        kind: 'cancel',
        classId: 'class',
        originalDate: '2026-11-02',
        reason: '',
      },
    ];
    const incoming = revisionSchedule();
    incoming.exceptions = [
      {
        id: 'qa-other-cancel',
        kind: 'cancel',
        classId: 'class',
        originalDate: '2026-11-02',
        reason: '',
      },
    ];
    const before = canonicalRecoveryContent(state);
    expect(
      inspectBackupRecovery(native(data({ instructorSchedule: incoming })), state),
    ).toMatchObject({
      success: false,
      code: 'schedule_conflict',
    });
    expect(canonicalRecoveryContent(state)).toBe(before);
  });

  it('rejects stale preflight after protected edits but ignores ephemeral UI feedback and navigation', () => {
    const state = current();
    const raw = native(data({ savedSequences: [sequence()] }));
    const preview = checked(raw, state);
    const edits: ((copy: RecoveryCurrentState) => void)[] = [
      (copy) => {
        copy.activeSteps[0].locked = false;
      },
      (copy) => {
        copy.activeTitle = 'QA changed current draft';
      },
      (copy) => {
        copy.historyLogs.push(history());
      },
      (copy) => {
        copy.instructorStudyState = {
          bookmarkedExerciseIds: [],
          rehearsalCueHidden: false,
          completedTutorialTaskIds: [],
        };
      },
      (copy) => {
        copy.datedSequencePlanning = versionedDate();
      },
      (copy) => {
        copy.ownedEquipment.push('reformer');
      },
    ];
    for (const edit of edits) {
      const copy = structuredClone(state);
      edit(copy);
      const before = canonicalRecoveryContent(copy);
      expect(
        inspectBackupRecovery(raw, copy, { expectedStateFingerprint: preview.stateFingerprint }),
      ).toMatchObject({ success: false, code: 'stale_preflight' });
      expect(canonicalRecoveryContent(copy)).toBe(before);
    }
    const uiOnly = Object.assign(structuredClone(state), {
      activeTab: 'schedule',
      generationError: 'QA feedback',
      saveFeedback: 'QA status',
    });
    expect(backupRecoveryStateFingerprint(uiOnly)).toBe(preview.stateFingerprint);
    const commitPlan = inspectBackupRecovery(raw, uiOnly, {
      expectedStateFingerprint: preview.stateFingerprint,
    });
    expect(commitPlan.success).toBe(true);
    if (!commitPlan.success) throw new Error(commitPlan.message);
    expect(commitPlan.next).toEqual(preview.next);
  });

  it('uses UTF8 byte size and rejects oversized input without exposing source data in the error', () => {
    const raw = native(data({ exercises: [{ ...mat, nameKo: '합성 한국어 노트' }] }));
    const small = checked(raw);
    expect(small.summary.bytes).toBe(new TextEncoder().encode(raw).byteLength);
    expect(small.summary.bytes).toBeGreaterThan(raw.length);
    const oversized = JSON.stringify('한'.repeat(Math.floor(MAX_LOCAL_BACKUP_BYTES / 3) + 1));
    expect(oversized.length).toBeLessThan(MAX_LOCAL_BACKUP_BYTES);
    const result = inspectBackupRecovery(oversized, current());
    expect(result).toMatchObject({ success: false, code: 'too_large' });
    expect(JSON.stringify(result).length).toBeLessThan(500);
    expect(JSON.stringify(result)).not.toContain('QA_PRIVATE');
  });
});
