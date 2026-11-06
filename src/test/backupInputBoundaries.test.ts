import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import corpus from './fixtures/backup-recovery/backupInputBoundaryCorpus.json';
import { usePilatesStore } from '../store/usePilatesStore';
import {
  MAX_LOCAL_BACKUP_BYTES,
  backupRecoveryStateFingerprint,
  canonicalRecoveryContent,
  inspectBackupRecovery,
  type RecoveryCurrentState,
} from '../utils/backupRecoveryInspection';
import {
  BACKUP_ROLLBACK_STORAGE_KEY,
  attachProgramSnapshotToHistoryLog,
  buildTeachingProgramSnapshot,
  captureBackupPreRestoreState,
  cloneTeachingHistoryToNextClassDraft,
  collectDriftedSnapshotExercises,
  collectMissingSnapshotExercises,
  copyHistoryLogIntoWorkbenchSafely,
  inspectPersistedRollbackPoint,
  recordBackupRestoreRollbackPoint,
  reconstructStepsSnapshotFromHistoryLog,
  resetInMemoryBackupRollbackPointForTest,
  resolveTeachingHistoryView,
  rollbackLatestBackupRestore,
} from '../utils/teachingHistorySnapshot';
import {
  getHumanDraftForIdeaExercise,
  getMovementIdeaMetaMap,
  resetMovementIdeaStateForTests,
} from '../utils/movementIdeaDraft';
import { createEmptyInstructorSchedule } from '../types/instructorSchedule';
import type {
  ClassGroup,
  ClassHistoryLog,
  Exercise,
  SavedSequence,
  SequenceStep,
} from '../types/pilates';

const PERSIST_STORAGE_KEY = 'pilates-flow-atelier-storage-v3';
const MOVEMENT_IDEA_META_KEY = 'pilates-flow-movement-idea-meta-v1';

const originalStoreState = usePilatesStore.getState();

const baselineExercise = structuredClone(
  corpus.baselineState.customExercise,
) as unknown as Exercise;
const baselineSequence = structuredClone(
  corpus.baselineState.sequence,
) as unknown as SavedSequence;
const baselineGroup = structuredClone(
  corpus.baselineState.classGroup,
) as unknown as ClassGroup;
const baselineHistoryLog = structuredClone(
  corpus.baselineState.historyLog,
) as unknown as ClassHistoryLog;

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function stableJsonHash(value: unknown): string {
  return sha256(canonicalRecoveryContent(value));
}

function makeCurrentRecoveryState(
  overrides: Partial<RecoveryCurrentState> = {},
): RecoveryCurrentState {
  return {
    exercises: [structuredClone(baselineExercise)],
    savedSequences: [structuredClone(baselineSequence)],
    classGroups: [structuredClone(baselineGroup)],
    historyLogs: [structuredClone(baselineHistoryLog)],
    conditionTemplates: [],
    instructorSchedule: createEmptyInstructorSchedule(),
    instructorStudyState: undefined,
    datedSequencePlanning: undefined,
    ownedEquipment: ['mat'],
    ownedProps: ['mini-ball'],
    activeSequenceId: baselineSequence.id,
    activeTitle: baselineSequence.title,
    activeSubtitle: baselineSequence.subtitle,
    activeApparatus: baselineSequence.apparatus,
    activeLevel: baselineSequence.level,
    activeTargetMinutes: baselineSequence.targetMinutes,
    activeTargetGroupId: baselineGroup.id,
    activeSteps: structuredClone(baselineSequence.steps),
    draftCriteria: null,
    lastCriteria: null,
    ...overrides,
  };
}

function makeExportV3Payload(
  dataOverrides: Record<string, unknown> = {},
  envelopeOverrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    format: 'pilates-flow-atelier',
    version: 3,
    exportedAt: '2026-11-06T09:30:00.000Z',
    data: {
      exercises: [structuredClone(baselineExercise)],
      savedSequences: [structuredClone(baselineSequence)],
      classGroups: [structuredClone(baselineGroup)],
      historyLogs: [structuredClone(baselineHistoryLog)],
      conditionTemplates: [],
      ownedEquipment: ['mat'],
      ownedProps: ['mini-ball'],
      ...dataOverrides,
    },
    ...envelopeOverrides,
  };
}

function buildBoundedNestedObject(
  depth: number,
  leafValue: unknown = 'synthetic-leaf',
): Record<string, unknown> {
  if (depth > corpus.bounds.maxGeneratedNestingDepth) {
    throw new Error(
      `Requested nesting depth ${depth} exceeds corpus bound ${corpus.bounds.maxGeneratedNestingDepth}`,
    );
  }
  let current: Record<string, unknown> = { leaf: leafValue };
  for (let i = depth - 1; i >= 1; i -= 1) {
    current = { [`level_${i}`]: current };
  }
  return current;
}

function buildBoundedDeterministicString(byteLength: number, prefix = 'syn_'): string {
  if (byteLength > corpus.bounds.maxGeneratedStringBytes) {
    throw new Error(
      `Requested string length ${byteLength} exceeds corpus bound ${corpus.bounds.maxGeneratedStringBytes}`,
    );
  }
  const bodyLen = Math.max(0, byteLength - prefix.length);
  return prefix + 'x'.repeat(bodyLen);
}

interface BoundarySafetySnapshot {
  inputHash: string;
  currentStateHash: string;
  storeStateHash: string;
  persistedStorageRaw: string | null;
  rollbackStorageRaw: string | null;
  protoKeys: string[];
}

function captureBoundarySafetySnapshot(
  rawInput: string,
  currentState: RecoveryCurrentState,
): BoundarySafetySnapshot {
  const store = usePilatesStore.getState();
  return {
    inputHash: sha256(rawInput),
    currentStateHash: stableJsonHash(currentState),
    storeStateHash: stableJsonHash({
      exercises: store.exercises,
      savedSequences: store.savedSequences,
      classGroups: store.classGroups,
      historyLogs: store.historyLogs,
      conditionTemplates: store.conditionTemplates,
      activeSequenceId: store.activeSequenceId,
      activeTitle: store.activeTitle,
      activeSteps: store.activeSteps,
    }),
    persistedStorageRaw: window.localStorage.getItem(PERSIST_STORAGE_KEY),
    rollbackStorageRaw: window.localStorage.getItem(BACKUP_ROLLBACK_STORAGE_KEY),
    protoKeys: Object.getOwnPropertyNames(Object.prototype).sort(),
  };
}

function assertBoundarySafetyInvariants(
  before: BoundarySafetySnapshot,
  rawInput: string,
  currentState: RecoveryCurrentState,
): void {
  const after = captureBoundarySafetySnapshot(rawInput, currentState);
  expect(after.inputHash).toBe(before.inputHash);
  expect(after.currentStateHash).toBe(before.currentStateHash);
  expect(after.storeStateHash).toBe(before.storeStateHash);
  expect(after.persistedStorageRaw).toBe(before.persistedStorageRaw);
  expect(after.rollbackStorageRaw).toBe(before.rollbackStorageRaw);
  expect(after.protoKeys).toEqual(before.protoKeys);
  expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
  expect(({} as Record<string, unknown>).polluted).toBeUndefined();
}

function assertRejectedWithoutSideEffects(
  rawInput: string,
  expectedCode: string | string[],
): ReturnType<typeof inspectBackupRecovery> {
  const current = makeCurrentRecoveryState();
  const before = captureBoundarySafetySnapshot(rawInput, current);

  const inspection = inspectBackupRecovery(rawInput, current);
  expect(inspection.success).toBe(false);
  if (!inspection.success) {
    const allowed = Array.isArray(expectedCode) ? expectedCode : [expectedCode];
    expect(allowed).toContain(inspection.code);
  }

  const restoreResult = usePilatesStore.getState().restoreBackup(rawInput);
  expect(restoreResult.success).toBe(false);

  assertBoundarySafetyInvariants(before, rawInput, current);
  return inspection;
}

describe('Deterministic Synthetic Backup & History Input Boundary Corpus', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetInMemoryBackupRollbackPointForTest();
    resetMovementIdeaStateForTests();

    usePilatesStore.setState({
      ...originalStoreState,
      exercises: [structuredClone(baselineExercise)],
      savedSequences: [structuredClone(baselineSequence)],
      classGroups: [structuredClone(baselineGroup)],
      historyLogs: [structuredClone(baselineHistoryLog)],
      conditionTemplates: [],
      instructorSchedule: createEmptyInstructorSchedule(),
      instructorStudyState: undefined,
      datedSequencePlanning: undefined,
      ownedEquipment: ['mat'],
      ownedApparatus: ['mat'],
      ownedProps: ['mini-ball'],
      activeSequenceId: baselineSequence.id,
      activeTitle: baselineSequence.title,
      activeSubtitle: baselineSequence.subtitle,
      activeApparatus: baselineSequence.apparatus,
      activeLevel: baselineSequence.level,
      activeTargetMinutes: baselineSequence.targetMinutes,
      activeTargetGroupId: baselineGroup.id,
      activeSteps: structuredClone(baselineSequence.steps),
      draftCriteria: null,
      lastCriteria: null,
      undoStack: [],
      saveFeedback: null,
    });
  });

  afterEach(() => {
    delete (Object.prototype as Record<string, unknown>).polluted;
    window.localStorage.clear();
    resetInMemoryBackupRollbackPointForTest();
    resetMovementIdeaStateForTests();
    usePilatesStore.setState(originalStoreState, true);
  });

  it('validates corpus metadata, seed determinism, and finite resource upper bounds', () => {
    expect(corpus.schemaVersion).toBe(1);
    expect(corpus.corpusSeed).toBe('pilates-backup-boundary-seed-20261106-v1');
    expect(corpus.bounds.maxPayloadBytes).toBe(MAX_LOCAL_BACKUP_BYTES);
    expect(corpus.bounds.maxGeneratedStringBytes).toBeLessThanOrEqual(262144);
    expect(corpus.bounds.maxGeneratedArrayLength).toBeLessThanOrEqual(2000);
    expect(corpus.bounds.maxGeneratedNestingDepth).toBeLessThanOrEqual(128);
    expect(corpus.cases.length).toBe(27);
  });

  describe('1. Missing & Unsupported Version / Envelope Boundaries (BND-VER-001..007)', () => {
    it('BND-VER-001 & BND-VER-002: rejects export envelope with missing or null version without side effects', () => {
      const missingVersion = makeExportV3Payload();
      delete missingVersion.version;
      assertRejectedWithoutSideEffects(JSON.stringify(missingVersion), 'unsupported_version');

      const nullVersion = makeExportV3Payload({}, { version: null });
      assertRejectedWithoutSideEffects(JSON.stringify(nullVersion), 'unsupported_version');
    });

    it('BND-VER-003: rejects export envelope with negative, zero, legacy (1, 2), and future (4, 99, MAX_SAFE_INTEGER) versions', () => {
      for (const badVersion of [-1, 0, 1, 2, 4, 99, Number.MAX_SAFE_INTEGER, '3', 'v3', {}]) {
        const raw = JSON.stringify(makeExportV3Payload({}, { version: badVersion }));
        assertRejectedWithoutSideEffects(raw, 'unsupported_version');
      }
    });

    it('BND-VER-004: rejects persisted state wrapper ({ version, state }) with unsupported versions', () => {
      const validPayload = makeExportV3Payload();
      for (const badPersistedVersion of [-1, 1, 2, 4, 99, Number.MAX_SAFE_INTEGER, null, '3']) {
        const raw = JSON.stringify({
          version: badPersistedVersion,
          state: validPayload.data,
        });
        assertRejectedWithoutSideEffects(raw, 'unsupported_version');
      }
      const missingPersistedVersion = JSON.stringify({
        state: validPayload.data,
      });
      assertRejectedWithoutSideEffects(missingPersistedVersion, 'unsupported_version');
    });

    it('BND-VER-005: rejects unsupported format identifiers, non-object JSON roots, and malformed JSON', () => {
      const foreignFormat = JSON.stringify(
        makeExportV3Payload({}, { format: 'foreign-pilates-app' }),
      );
      assertRejectedWithoutSideEffects(foreignFormat, 'unsupported_format');

      for (const nonObjectRaw of ['[]', '[1,2,3]', '"string-root"', '42', 'true', 'null']) {
        assertRejectedWithoutSideEffects(nonObjectRaw, 'invalid_format');
      }

      for (const malformedRaw of ['', '   ', '{"format":"pilates-flow-atelier",', '{unquoted:1}']) {
        assertRejectedWithoutSideEffects(malformedRaw, 'invalid_json');
      }
    });

    it('BND-VER-006: rejects export envelope with non-UTC or unparseable exportedAt timestamp', () => {
      for (const badExportedAt of [
        'not-a-timestamp',
        '2026-11-06T09:30:00+09:00',
        '2026-13-45T99:99:99.000Z',
        '',
      ]) {
        const raw = JSON.stringify(makeExportV3Payload({}, { exportedAt: badExportedAt }));
        assertRejectedWithoutSideEffects(raw, 'invalid_envelope');
      }
    });

    it('BND-VER-007: rejects rollback storage record with unsupported versions or malformed JSON without overwriting store state', () => {
      const current = makeCurrentRecoveryState();
      const before = captureBoundarySafetySnapshot('{}', current);

      for (const badVersion of [-1, 2, 4, 99, '1', null]) {
        const badRollbackRaw = JSON.stringify({
          version: badVersion,
          id: 'rb-bad-ver',
          capturedAt: '2026-11-06T09:00:00.000Z',
          addedCount: 1,
          postRestoreStateFingerprint: 'fp-test',
          postRestoreStorageFingerprint: 'fp-storage',
          preRestoreState: {
            exercises: [baselineExercise],
            savedSequences: [baselineSequence],
            classGroups: [baselineGroup],
            historyLogs: [baselineHistoryLog],
            conditionTemplates: [],
            instructorSchedule: createEmptyInstructorSchedule(),
            ownedEquipment: ['mat'],
            ownedApparatus: ['mat'],
            ownedProps: ['mini-ball'],
            lastCriteria: null,
            draftCriteria: null,
          },
        });
        window.localStorage.setItem(BACKUP_ROLLBACK_STORAGE_KEY, badRollbackRaw);
        resetInMemoryBackupRollbackPointForTest();

        const inspection = inspectPersistedRollbackPoint(badRollbackRaw);
        expect(inspection.valid).toBe(false);
        if (!inspection.valid) {
          expect(inspection.reason).toBe('unsupported-version');
        }

        const rollbackOutcome = rollbackLatestBackupRestore({
          getState: () => usePilatesStore.getState(),
          setState: (patch) => usePilatesStore.setState(patch),
        });
        expect(rollbackOutcome.success).toBe(false);
        expect(rollbackOutcome.reason).toBe('no-rollback-point');
      }

      window.localStorage.removeItem(BACKUP_ROLLBACK_STORAGE_KEY);
      assertBoundarySafetyInvariants(before, '{}', current);
    });
  });

  describe('2. Reproducible Legacy-to-Current Format Conversion (BND-LEG-001..005)', () => {
    it('BND-LEG-001, BND-LEG-002, BND-LEG-003: converts bare-data, persisted-original-v0, and persisted-v3 into identical normalized state and export-v3', () => {
      const exportEnvelope = makeExportV3Payload();
      const bareDataRaw = JSON.stringify(exportEnvelope.data);
      const persistedV0Raw = JSON.stringify({
        version: 0,
        state: {
          ...(exportEnvelope.data as Record<string, unknown>),
          activeSequenceId: baselineSequence.id,
          activeTitle: baselineSequence.title,
          activeSubtitle: baselineSequence.subtitle,
          activeApparatus: baselineSequence.apparatus,
          activeLevel: baselineSequence.level,
          activeTargetMinutes: baselineSequence.targetMinutes,
          activeTargetGroupId: baselineGroup.id,
          activeSteps: baselineSequence.steps,
          draftCriteria: null,
          lastCriteria: null,
        },
      });
      const persistedV3Raw = JSON.stringify({
        version: 3,
        state: JSON.parse(persistedV0Raw).state,
      });

      const current = makeCurrentRecoveryState({ savedSequences: [], historyLogs: [] });
      const bareResult = inspectBackupRecovery(bareDataRaw, current);
      const v0Result = inspectBackupRecovery(persistedV0Raw, current);
      const v3Result = inspectBackupRecovery(persistedV3Raw, current);

      expect(bareResult.success).toBe(true);
      expect(v0Result.success).toBe(true);
      expect(v3Result.success).toBe(true);

      if (bareResult.success && v0Result.success && v3Result.success) {
        expect(bareResult.summary.sourceKind).toBe('bare-data');
        expect(v0Result.summary.sourceKind).toBe('persisted-original-v0');
        expect(v3Result.summary.sourceKind).toBe('persisted-v3');

        // Domain collections (exercises, classGroups, historyLogs, primary savedSequence) normalize identically
        expect(v0Result.next.exercises).toEqual(v3Result.next.exercises);
        expect(v0Result.next.classGroups).toEqual(v3Result.next.classGroups);
        expect(v0Result.next.historyLogs).toEqual(v3Result.next.historyLogs);
        expect(v0Result.next.savedSequences[0]).toEqual(v3Result.next.savedSequences[0]);
        expect(v0Result.next.savedSequences[1]?.recoveredDraftOrigin?.format).toBe(
          'persisted-workspace-v0',
        );
        expect(v3Result.next.savedSequences[1]?.recoveredDraftOrigin?.format).toBe(
          'persisted-workspace-v3',
        );

        // Restoring persisted-original-v0 and re-exporting yields valid export-v3
        const restoreRes = usePilatesStore.getState().restoreBackup(persistedV0Raw);
        expect(restoreRes.success).toBe(true);

        const exportedV3Raw = usePilatesStore.getState().exportBackup();
        const exportedParsed = JSON.parse(exportedV3Raw);
        expect(exportedParsed.format).toBe('pilates-flow-atelier');
        expect(exportedParsed.version).toBe(3);

        const reInspected = inspectBackupRecovery(exportedV3Raw, current);
        expect(reInspected.success).toBe(true);
        if (reInspected.success) {
          expect(reInspected.summary.sourceKind).toBe('export-v3');
        }
      }
    });

    it('BND-LEG-004: resolves and clones legacy ClassHistoryLog without programSnapshot (stepsSnapshot-only and exerciseIds-only) without auto-recording new history', () => {
      const legacyStepsOnlyLog: ClassHistoryLog = {
        ...structuredClone(baselineHistoryLog),
        id: 'hist-legacy-steps-only',
      };
      const legacyExerciseIdsOnlyLog: ClassHistoryLog = {
        ...structuredClone(baselineHistoryLog),
        id: 'hist-legacy-exids-only',
        stepsSnapshot: undefined,
      };

      const exercisesMap = new Map([[baselineExercise.id, baselineExercise]]);

      const viewFromSteps = resolveTeachingHistoryView(legacyStepsOnlyLog, exercisesMap);
      expect(viewFromSteps.hasPreservedSnapshot).toBe(false);
      expect(viewFromSteps.steps).toHaveLength(2);
      expect(viewFromSteps.steps[0].exerciseId).toBe(baselineExercise.id);

      const viewFromExIds = resolveTeachingHistoryView(legacyExerciseIdsOnlyLog, exercisesMap);
      expect(viewFromExIds.hasPreservedSnapshot).toBe(false);
      expect(viewFromExIds.steps).toHaveLength(1);
      expect(viewFromExIds.steps[0].exerciseId).toBe(baselineExercise.id);

      const historyCountBefore = usePilatesStore.getState().historyLogs.length;
      const clonedDraft = cloneTeachingHistoryToNextClassDraft(legacyStepsOnlyLog, [
        baselineExercise,
      ]);
      expect(clonedDraft).not.toBeNull();
      expect(clonedDraft?.steps).toHaveLength(2);
      expect(clonedDraft?.sourceProvenance.kind).toBe('history-snapshot');
      // Cloning legacy history to draft NEVER records a completed history log
      expect(usePilatesStore.getState().historyLogs.length).toBe(historyCountBefore);
    });

    it('BND-LEG-005: upgrades legacy v0 rollback record deterministically and restores pre-restore state safely', () => {
      const preRestoreState = captureBackupPreRestoreState({
        exercises: [baselineExercise],
        savedSequences: [baselineSequence],
        classGroups: [baselineGroup],
        historyLogs: [baselineHistoryLog],
        conditionTemplates: [],
        instructorSchedule: createEmptyInstructorSchedule(),
        ownedEquipment: ['mat'],
        ownedApparatus: ['mat'],
        ownedProps: ['mini-ball'],
        lastCriteria: null,
        draftCriteria: null,
      });

      const currentFp = backupRecoveryStateFingerprint(usePilatesStore.getState());
      const point = recordBackupRestoreRollbackPoint({
        preRestoreState,
        addedCount: 1,
        postRestoreStateFingerprint: currentFp,
        postRestoreStorageFingerprint: 'legacy-v0-storage-fp',
        now: '2026-11-06T09:30:00.000Z',
      });

      const stored = JSON.parse(
        window.localStorage.getItem(BACKUP_ROLLBACK_STORAGE_KEY) || '{}',
      );
      stored.version = 0; // simulate legacy v0 persisted rollback point
      const legacyV0Raw = JSON.stringify(stored);
      window.localStorage.setItem(BACKUP_ROLLBACK_STORAGE_KEY, legacyV0Raw);
      resetInMemoryBackupRollbackPointForTest();

      const inspected = inspectPersistedRollbackPoint(legacyV0Raw);
      expect(inspected.valid).toBe(true);
      if (inspected.valid) {
        expect(inspected.version).toBe(0);
        expect(inspected.point.id).toBe(point.id);
      }

      const outcome = rollbackLatestBackupRestore({
        getState: () => usePilatesStore.getState(),
        setState: (patch) => usePilatesStore.setState(patch),
        checkStorage: () => ({ ok: true }),
      });
      expect(outcome.success).toBe(true);
    });
  });

  describe('3. Duplicate IDs, Broken References & Unexpected Fields (BND-REF-001..007)', () => {
    it('BND-REF-001: rejects top-level duplicate IDs across all domain collections and savedSequences vs activeDraft', () => {
      const dupExercises = makeExportV3Payload({
        exercises: [baselineExercise, { ...baselineExercise, nameKo: '중복 동작' }],
      });
      assertRejectedWithoutSideEffects(JSON.stringify(dupExercises), 'duplicate_id');

      const dupSequences = makeExportV3Payload({
        savedSequences: [baselineSequence, { ...baselineSequence, title: '중복 시퀀스' }],
      });
      assertRejectedWithoutSideEffects(JSON.stringify(dupSequences), 'duplicate_id');

      const dupGroups = makeExportV3Payload({
        classGroups: [baselineGroup, { ...baselineGroup, name: '중복 그룹' }],
      });
      assertRejectedWithoutSideEffects(JSON.stringify(dupGroups), 'duplicate_id');

      const dupHistory = makeExportV3Payload({
        historyLogs: [baselineHistoryLog, { ...baselineHistoryLog, sequenceTitle: '중복 이력' }],
      });
      assertRejectedWithoutSideEffects(JSON.stringify(dupHistory), 'duplicate_id');

      const dupSavedAndActiveDraft = makeExportV3Payload({
        savedSequences: [baselineSequence],
        activeDraft: {
          ...baselineSequence,
          title: 'ActiveDraft colliding with savedSequence ID',
        },
      });
      assertRejectedWithoutSideEffects(JSON.stringify(dupSavedAndActiveDraft), 'duplicate_id');
    });

    it('BND-REF-002: rejects dangling exerciseId references in savedSequences.steps, activeDraft.steps, historyLogs.exerciseIds, and historyLogs.stepsSnapshot', () => {
      const danglingSeqStep = makeExportV3Payload({
        savedSequences: [
          {
            ...baselineSequence,
            steps: [
              {
                ...baselineSequence.steps[0],
                exerciseId: 'non-existent-exercise-999',
              },
            ],
          },
        ],
      });
      assertRejectedWithoutSideEffects(JSON.stringify(danglingSeqStep), 'missing_exercise');

      const danglingActiveDraftStep = makeExportV3Payload({
        activeDraft: {
          ...baselineSequence,
          id: 'seq-active-draft-unique',
          steps: [
            {
              ...baselineSequence.steps[0],
              exerciseId: 'non-existent-draft-exercise-999',
            },
          ],
        },
      });
      assertRejectedWithoutSideEffects(
        JSON.stringify(danglingActiveDraftStep),
        'missing_exercise',
      );

      const danglingHistoryExId = makeExportV3Payload({
        historyLogs: [
          {
            ...baselineHistoryLog,
            exerciseIds: ['non-existent-history-ex-999'],
            stepsSnapshot: undefined,
          },
        ],
      });
      assertRejectedWithoutSideEffects(JSON.stringify(danglingHistoryExId), 'missing_exercise');

      const danglingHistoryStepExId = makeExportV3Payload({
        historyLogs: [
          {
            ...baselineHistoryLog,
            stepsSnapshot: [
              {
                ...baselineSequence.steps[0],
                exerciseId: 'non-existent-step-snapshot-ex-999',
              },
            ],
          },
        ],
      });
      assertRejectedWithoutSideEffects(
        JSON.stringify(danglingHistoryStepExId),
        'missing_exercise',
      );
    });

    it('BND-REF-003: rejects unknown fields on strict roots (envelope, data, draftCriteria, instructorSchedule, instructorStudyState, datedSequencePlanning)', () => {
      const unknownAtEnvelope = makeExportV3Payload({}, { unexpectedRootField: 'bad' });
      assertRejectedWithoutSideEffects(JSON.stringify(unknownAtEnvelope), 'unsupported_fields');

      const unknownAtData = makeExportV3Payload({ unexpectedDataField: 'bad' });
      assertRejectedWithoutSideEffects(JSON.stringify(unknownAtData), 'unsupported_fields');

      const unknownAtCriteria = makeExportV3Payload({
        draftCriteria: {
          apparatus: 'mat',
          level: '1.0',
          focusPreset: 'full-body',
          preferredProps: [],
          excludeDaysWindow: 7,
          targetMinutes: 50,
          defaultLayer: 'standard',
          unexpectedCriteriaField: 'bad',
        },
      });
      assertRejectedWithoutSideEffects(JSON.stringify(unknownAtCriteria), 'unsupported_fields');

      const unknownAtSchedule = makeExportV3Payload({
        instructorSchedule: {
          ...createEmptyInstructorSchedule(),
          unexpectedScheduleField: true,
        },
      });
      assertRejectedWithoutSideEffects(JSON.stringify(unknownAtSchedule), [
        'unsupported_fields',
        'invalid_data',
      ]);

      const unknownAtStudyState = makeExportV3Payload({
        instructorStudyState: {
          unexpectedStudyKey: 'bad',
        },
      });
      assertRejectedWithoutSideEffects(JSON.stringify(unknownAtStudyState), [
        'unsupported_fields',
        'invalid_data',
      ]);
    });

    it('BND-REF-004 [REPRODUCED_DEFECT D1]: documents that .passthrough() on sequence/step/exercise/group/history schemas bypasses strippedKeys and retains arbitrary unknown fields', () => {
      const payloadWithNestedUnknowns = makeExportV3Payload({
        exercises: [
          {
            ...baselineExercise,
            unexpectedExerciseSecretField: { nested: 'unvalidated-exercise-payload' },
          },
        ],
        savedSequences: [
          {
            ...baselineSequence,
            unexpectedSequenceField: 'unvalidated-sequence-payload',
            steps: [
              {
                ...baselineSequence.steps[0],
                unexpectedStepField: 'unvalidated-step-payload',
              },
            ],
          },
        ],
        classGroups: [
          {
            ...baselineGroup,
            unexpectedGroupField: 'unvalidated-group-payload',
          },
        ],
        historyLogs: [
          {
            ...baselineHistoryLog,
            unexpectedHistoryField: 'unvalidated-history-payload',
          },
        ],
      });

      const currentEmpty = makeCurrentRecoveryState({
        exercises: [],
        savedSequences: [],
        classGroups: [],
        historyLogs: [],
      });
      const result = inspectBackupRecovery(JSON.stringify(payloadWithNestedUnknowns), currentEmpty);

      if (process.env.BACKUP_BOUNDARY_FAIL_ON_DEFECTS === '1') {
        expect(result.success).toBe(false);
        return;
      }

      // Reproduced Defect D1: .passthrough() causes Zod to keep the keys in `checked`, so `!own(checked, key)` is false
      expect(result.success).toBe(true);
      if (result.success) {
        expect(
          (result.next.savedSequences[0] as unknown as Record<string, unknown>)
            .unexpectedSequenceField,
        ).toBe('unvalidated-sequence-payload');
      }
    });

    it('BND-REF-005 [REPRODUCED_DEFECT D3]: documents that partial/malformed historyLog.programSnapshot passes inspectBackupRecovery and throws TypeError in resolveTeachingHistoryView / collectMissingSnapshotExercises', () => {
      const malformedSnapshotPayload = makeExportV3Payload({
        historyLogs: [
          {
            ...baselineHistoryLog,
            programSnapshot: {
              snapshotVersion: 1,
              capturedAt: '2026-11-06T09:00:00.000Z',
              items: null,
              exercisesById: null,
            },
          },
        ],
      });

      const currentEmpty = makeCurrentRecoveryState({
        historyLogs: [],
      });
      const inspection = inspectBackupRecovery(
        JSON.stringify(malformedSnapshotPayload),
        currentEmpty,
      );

      if (process.env.BACKUP_BOUNDARY_FAIL_ON_DEFECTS === '1') {
        expect(inspection.success).toBe(false);
        return;
      }

      // Reproduced Defect D3: inspectBackupRecovery accepts malformed programSnapshot, which then crashes history consumers
      expect(inspection.success).toBe(true);
      if (inspection.success) {
        const corruptedLog = inspection.next.historyLogs[0];
        const exercisesMap = new Map([[baselineExercise.id, baselineExercise]]);
        expect(() => resolveTeachingHistoryView(corruptedLog, exercisesMap)).toThrow(TypeError);
        expect(() => collectMissingSnapshotExercises(corruptedLog, [baselineExercise])).toThrow(
          TypeError,
        );
      }
    });

    it('BND-REF-006 [REPRODUCED_DEFECT D4]: documents that duplicate stepId in sequence.steps and dangling exerciseId inside historyLog.programSnapshot.items are accepted without validation', () => {
      const validSnapshot = buildTeachingProgramSnapshot({
        sourceKind: 'saved-sequence',
        sequenceId: baselineSequence.id,
        sequenceTitle: baselineSequence.title,
        groupId: baselineGroup.id,
        taughtAt: '2026-11-06T09:00:00.000Z',
        capturedAt: '2026-11-06T09:00:00.000Z',
        steps: baselineSequence.steps,
        exercises: [baselineExercise],
      });

      const payloadWithDupStepAndDanglingSnapshotItem = makeExportV3Payload({
        savedSequences: [
          {
            ...baselineSequence,
            steps: [
              baselineSequence.steps[0],
              {
                ...baselineSequence.steps[0],
                order: 2,
                // Duplicate stepId: 'step-boundary-1'
              },
            ],
          },
        ],
        historyLogs: [
          {
            ...baselineHistoryLog,
            programSnapshot: {
              ...validSnapshot,
              items: [
                {
                  ...validSnapshot.items[0],
                  exerciseId: 'dangling-snapshot-only-exercise-id',
                },
              ],
            },
          },
        ],
      });

      const current = makeCurrentRecoveryState();
      const result = inspectBackupRecovery(
        JSON.stringify(payloadWithDupStepAndDanglingSnapshotItem),
        current,
      );

      if (process.env.BACKUP_BOUNDARY_FAIL_ON_DEFECTS === '1') {
        expect(result.success).toBe(false);
        return;
      }

      // Reproduced Defect D4: Neither duplicate step.stepId nor dangling programSnapshot.items[].exerciseId is rejected
      expect(result.success).toBe(true);
    });

    it('BND-REF-007 [REPRODUCED_DEFECT D5]: documents that inspectPersistedRollbackPoint accepts non-object elements inside state arrays and coerces missing version to 1', () => {
      const corruptedRollbackRaw = JSON.stringify({
        // version is omitted -> coerced to 1
        id: 'rb-shallow-array',
        capturedAt: '2026-11-06T09:00:00.000Z',
        addedCount: 1,
        postRestoreStateFingerprint: 'fp-shallow',
        postRestoreStorageFingerprint: 'fp-storage-shallow',
        preRestoreState: {
          exercises: [null, 'corrupted-exercise-element'],
          savedSequences: [null, 12345],
          classGroups: ['not-a-group'],
          historyLogs: [null],
          conditionTemplates: [],
          instructorSchedule: createEmptyInstructorSchedule(),
          ownedEquipment: ['mat'],
          ownedApparatus: ['mat'],
          ownedProps: [],
          lastCriteria: null,
          draftCriteria: null,
        },
      });

      const inspected = inspectPersistedRollbackPoint(corruptedRollbackRaw);

      if (process.env.BACKUP_BOUNDARY_FAIL_ON_DEFECTS === '1') {
        expect(inspected.valid).toBe(false);
        return;
      }

      // Reproduced Defect D5: shallow Array.isArray check marks corrupted element arrays as valid and coerces missing version to 1
      expect(inspected.valid).toBe(true);
      if (inspected.valid) {
        expect(inspected.version).toBe(1);
      }
    });
  });

  describe('4. Bounded Long Strings, Large Arrays & Deep Nesting (BND-LIM-001..004)', () => {
    it('BND-LIM-001: enforces MAX_LOCAL_BACKUP_BYTES (15 MB UTF-8) before JSON.parse', () => {
      // Construct a deterministic synthetic string just over 15,000,000 bytes (within corpus.bounds.maxOversizeTestBytes)
      const paddingLen = MAX_LOCAL_BACKUP_BYTES + 32;
      expect(paddingLen).toBeLessThanOrEqual(corpus.bounds.maxOversizeTestBytes);
      const oversizeRaw = `{"format":"pilates-flow-atelier","version":3,"pad":"${'a'.repeat(paddingLen)}"}`;

      const current = makeCurrentRecoveryState();
      const startMs = performance.now();
      const inspection = inspectBackupRecovery(oversizeRaw, current);
      const elapsedMs = performance.now() - startMs;

      expect(inspection.success).toBe(false);
      if (!inspection.success) {
        expect(inspection.code).toBe('too_large');
      }
      expect(elapsedMs).toBeLessThan(corpus.bounds.maxCaseDurationMs);
    });

    it('BND-LIM-002: enforces textSchema (20,000 chars) and idSchema (300 chars) boundaries on schema-validated string fields', () => {
      // Exact 20,000 chars on sequence.subtitle is accepted
      const exact20k = buildBoundedDeterministicString(20000, 'ok_');
      const valid20kPayload = makeExportV3Payload({
        savedSequences: [{ ...baselineSequence, subtitle: exact20k }],
      });
      const current = makeCurrentRecoveryState();
      expect(inspectBackupRecovery(JSON.stringify(valid20kPayload), current).success).toBe(true);

      // 20,001 chars on sequence.subtitle is rejected
      const over20k = buildBoundedDeterministicString(20001, 'bad_');
      const invalid20kPayload = makeExportV3Payload({
        savedSequences: [{ ...baselineSequence, subtitle: over20k }],
      });
      assertRejectedWithoutSideEffects(JSON.stringify(invalid20kPayload), 'invalid_data');

      // 301 chars on sequence.id is rejected
      const over300Id = buildBoundedDeterministicString(301, 'id_');
      const invalidIdPayload = makeExportV3Payload({
        savedSequences: [{ ...baselineSequence, id: over300Id }],
      });
      assertRejectedWithoutSideEffects(JSON.stringify(invalidIdPayload), 'invalid_data');
    });

    it('BND-LIM-003: enforces sequence.steps (max 1,000) and conditionTemplates (max 1,000) array bounds', () => {
      const steps1001: SequenceStep[] = Array.from({ length: 1001 }, (_, idx) => ({
        kind: 'exercise',
        stepId: `step-bound-${idx + 1}`,
        order: idx + 1,
        blockCategory: 'extension',
        exerciseId: baselineExercise.id,
        durationMin: 1,
        selectedLayer: 'standard',
      }));

      const overStepsPayload = makeExportV3Payload({
        savedSequences: [
          {
            ...baselineSequence,
            targetMinutes: 2000,
            steps: steps1001,
          },
        ],
      });
      assertRejectedWithoutSideEffects(JSON.stringify(overStepsPayload), 'invalid_data');
    });

    it('BND-LIM-004 [REPRODUCED_DEFECT D6]: documents unbounded array length on historyLog.stepsSnapshot/exerciseIds (1,500 items), 256KB strings, and depth-128 nested JSON on .passthrough() fields', () => {
      const historySteps1500: SequenceStep[] = Array.from({ length: 1500 }, (_, idx) => ({
        kind: 'exercise',
        stepId: `hist-step-${idx + 1}`,
        order: idx + 1,
        blockCategory: 'extension',
        exerciseId: baselineExercise.id,
        durationMin: 1,
        selectedLayer: 'standard',
      }));
      const long256kString = buildBoundedDeterministicString(262144, 'passthrough_256k_');
      const deep128Object = buildBoundedNestedObject(128, 'deep-passthrough-leaf');

      const payload = makeExportV3Payload({
        historyLogs: [
          {
            ...baselineHistoryLog,
            exerciseIds: Array.from({ length: 1500 }, () => baselineExercise.id),
            stepsSnapshot: historySteps1500,
            unboundedPassthroughText: long256kString,
            unboundedPassthroughDepth: deep128Object,
          },
        ],
      });

      const current = makeCurrentRecoveryState();
      const startMs = performance.now();
      const result = inspectBackupRecovery(JSON.stringify(payload), current);
      const elapsedMs = performance.now() - startMs;

      expect(elapsedMs).toBeLessThan(corpus.bounds.maxCaseDurationMs);

      if (process.env.BACKUP_BOUNDARY_FAIL_ON_DEFECTS === '1') {
        expect(result.success).toBe(false);
        return;
      }

      // Reproduced Defect D6: historyLog.stepsSnapshot (1,500 > 1,000), 256KB passthrough string, and depth-128 passthrough object are accepted
      expect(result.success).toBe(true);
    });
  });

  describe('5. __proto__, constructor & prototype Key Boundaries (BND-PROTO-001..002)', () => {
    it('BND-PROTO-001: guarantees zero global Object.prototype pollution and zero partial storage writes when __proto__/constructor/prototype keys appear at envelope root, bare-data root, or data constructor/prototype', () => {
      const protoAtRootRaw =
        '{"format":"pilates-flow-atelier","version":3,"exportedAt":"2026-11-06T09:30:00.000Z","__proto__":{"polluted":"root"},"constructor":{"prototype":{"polluted":"ctor"}},"data":{"exercises":[],"savedSequences":[],"classGroups":[],"historyLogs":[]}}';
      assertRejectedWithoutSideEffects(protoAtRootRaw, 'unsupported_fields');

      const constructorAtDataRaw =
        '{"format":"pilates-flow-atelier","version":3,"exportedAt":"2026-11-06T09:30:00.000Z","data":{"constructor":{"prototype":{"polluted":"ctor"}},"prototype":{"polluted":"proto"},"exercises":[],"savedSequences":[],"classGroups":[],"historyLogs":[]}}';
      assertRejectedWithoutSideEffects(constructorAtDataRaw, 'unsupported_fields');

      const bareDataWithProtoRaw =
        '{"__proto__":{"polluted":"bare"},"exercises":[],"savedSequences":[],"classGroups":[],"historyLogs":[]}';
      assertRejectedWithoutSideEffects(bareDataWithProtoRaw, 'unsupported_fields');

      expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    });

    it('BND-PROTO-002 [REPRODUCED_DEFECT D2]: documents z.record(__proto__) stripping in export-v3 data, local prototype mutation in getMovementIdeaMetaMap, and TypeError when exerciseId is "constructor"', () => {
      // 1. In export-v3 envelope, data: z.record(z.unknown()) assigns result['__proto__'] = ...,
      // mutating the intermediate data object prototype and erasing '__proto__' from Object.keys(data) before strippedKeys runs
      const protoAtExportV3DataRaw =
        '{"format":"pilates-flow-atelier","version":3,"exportedAt":"2026-11-06T09:30:00.000Z","data":{"__proto__":{"polluted":"data"},"exercises":[],"savedSequences":[],"classGroups":[],"historyLogs":[]}}';
      const current = makeCurrentRecoveryState();
      const protoInDataResult = inspectBackupRecovery(protoAtExportV3DataRaw, current);

      // 2. getMovementIdeaMetaMap when localStorage contains a "__proto__" key with revision: 1
      resetMovementIdeaStateForTests();
      window.localStorage.setItem(
        MOVEMENT_IDEA_META_KEY,
        '{"__proto__":{"revision":1,"pollutedLocalMap":true}}',
      );
      const ideaMetaMap = getMovementIdeaMetaMap();

      // 3. resolveTeachingHistoryView when programSnapshot item has exerciseId: "constructor"
      const validSnapshot = buildTeachingProgramSnapshot({
        sourceKind: 'saved-sequence',
        sequenceId: baselineSequence.id,
        sequenceTitle: baselineSequence.title,
        groupId: baselineGroup.id,
        taughtAt: '2026-11-06T09:00:00.000Z',
        capturedAt: '2026-11-06T09:00:00.000Z',
        steps: baselineSequence.steps,
        exercises: [baselineExercise],
      });
      const logWithConstructorExId: ClassHistoryLog = {
        ...structuredClone(baselineHistoryLog),
        programSnapshot: {
          ...validSnapshot,
          items: [
            {
              ...validSnapshot.items[0],
              exerciseSnapshot: undefined,
              movementSnapshot: undefined,
              exerciseId: 'constructor',
            },
          ],
        },
      };
      const exercisesMap = new Map([[baselineExercise.id, baselineExercise]]);

      if (process.env.BACKUP_BOUNDARY_FAIL_ON_DEFECTS === '1') {
        expect(protoInDataResult.success).toBe(false);
        expect(Object.getPrototypeOf(ideaMetaMap)).toBe(Object.prototype);
        expect(() =>
          resolveTeachingHistoryView(logWithConstructorExId, exercisesMap),
        ).not.toThrow();
        return;
      }

      // Reproduced Defect D2a: export-v3 data.__proto__ bypasses strippedKeys because z.record() mutates envelope.data.data prototype
      expect(protoInDataResult.success).toBe(true);

      // Reproduced Defect D2b: merged[id] = entry in getMovementIdeaMetaMap mutates local map prototype when id === '__proto__'
      expect(Object.getPrototypeOf(ideaMetaMap)).not.toBe(Object.prototype);
      expect((ideaMetaMap as unknown as Record<string, unknown>).pollutedLocalMap).toBe(true);

      // Reproduced Defect D2c: snapshot.exercisesById['constructor'] resolves to Object constructor and throws TypeError on sourceEx.layers[item.selectedLayer]
      expect(() => resolveTeachingHistoryView(logWithConstructorExId, exercisesMap)).toThrow(
        TypeError,
      );

      // Verify global Object.prototype was NEVER polluted even under D2
      expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
      expect((Object.prototype as Record<string, unknown>).pollutedLocalMap).toBeUndefined();
    });
  });

  describe('6. Multi-Cycle Round-Trip Idempotence & Snapshot Immutability (BND-RT-001)', () => {
    it('BND-RT-001: preserves canonical fingerprint, custom exercises, and immutable history programSnapshot across repeated export -> inspect -> normalize -> restore -> export cycles', () => {
      const programSnapshot = buildTeachingProgramSnapshot({
        sourceKind: 'saved-sequence',
        sequenceId: baselineSequence.id,
        sequenceTitle: baselineSequence.title,
        groupId: baselineGroup.id,
        taughtAt: baselineHistoryLog.taughtAt,
        capturedAt: baselineHistoryLog.taughtAt,
        steps: baselineSequence.steps,
        exercises: [baselineExercise],
      });

      usePilatesStore.setState({
        exercises: [structuredClone(baselineExercise)],
        savedSequences: [structuredClone(baselineSequence)],
        classGroups: [structuredClone(baselineGroup)],
        historyLogs: [structuredClone(baselineHistoryLog)],
      });

      attachProgramSnapshotToHistoryLog(
        baselineHistoryLog.id,
        programSnapshot,
        (updater) => usePilatesStore.setState(updater),
      );

      const export1 = usePilatesStore.getState().exportBackup();
      const currentEmpty = makeCurrentRecoveryState({
        exercises: [],
        savedSequences: [],
        classGroups: [],
        historyLogs: [],
      });

      const inspect1 = inspectBackupRecovery(export1, currentEmpty);
      expect(inspect1.success).toBe(true);
      if (!inspect1.success) return;

      const fingerprint1 = backupRecoveryStateFingerprint(inspect1.next);

      const restore1 = usePilatesStore.getState().restoreBackup(export1);
      expect(restore1.success).toBe(true);

      const export2 = usePilatesStore.getState().exportBackup();
      const inspect2 = inspectBackupRecovery(export2, currentEmpty);
      expect(inspect2.success).toBe(true);
      if (!inspect2.success) return;

      const fingerprint2 = backupRecoveryStateFingerprint(inspect2.next);
      expect(fingerprint2).toBe(fingerprint1);

      // Mutate live customExercise after history completion and verify history snapshot remains immutable
      const mutatedLiveExercise: Exercise = {
        ...structuredClone(baselineExercise),
        nameKo: '사후 수정된 라이브 스완 동작 이름',
        springs: '사후 변경된 스프링 설정',
      };
      const restoredLog = usePilatesStore.getState().historyLogs[0];
      const exercisesMap = new Map([[mutatedLiveExercise.id, mutatedLiveExercise]]);
      const historyView = resolveTeachingHistoryView(restoredLog, exercisesMap);

      expect(historyView.hasPreservedSnapshot).toBe(true);
      expect(historyView.steps[0].nameKo).toBe(baselineExercise.nameKo);
      expect(historyView.steps[0].isCatalogModified).toBe(true);

      const drifted = collectDriftedSnapshotExercises(restoredLog, [mutatedLiveExercise]);
      expect(drifted.size).toBe(1);
      expect(drifted.has(baselineExercise.id)).toBe(true);

      const reconstructed = reconstructStepsSnapshotFromHistoryLog({
        ...restoredLog,
        stepsSnapshot: undefined,
      });
      expect(reconstructed).toHaveLength(2);

      // Copy history log into workbench safely without mutating historyLogs
      const historyCountBeforeCopy = usePilatesStore.getState().historyLogs.length;
      const copyRes = copyHistoryLogIntoWorkbenchSafely(restoredLog.id, {
        getState: () => usePilatesStore.getState(),
        setState: (updater) => usePilatesStore.setState(updater),
      });
      expect(copyRes.ok).toBe(true);
      expect(usePilatesStore.getState().historyLogs.length).toBe(historyCountBeforeCopy);
      expect(getHumanDraftForIdeaExercise(baselineExercise.id)).toBeUndefined();
    });
  });

  describe('7. Boundary Harness Self Negative Controls (BND-NEG-001)', () => {
    it('BND-NEG-001: detects simulated input mutation, simulated partial storage write, and simulated prototype pollution', () => {
      if (process.env.BACKUP_BOUNDARY_INJECT_NEGATIVE_CONTROL === '1') {
        throw new Error(
          'INTENTIONAL_NEGATIVE_CONTROL_FAILURE: simulated boundary invariant violation triggered via BACKUP_BOUNDARY_INJECT_NEGATIVE_CONTROL=1',
        );
      }

      const raw = '{"format":"pilates-flow-atelier","version":999}';
      const current = makeCurrentRecoveryState();
      const before = captureBoundarySafetySnapshot(raw, current);

      // 1. Simulated current state mutation must be caught by assertBoundarySafetyInvariants
      const mutatedCurrent = structuredClone(current);
      mutatedCurrent.activeTitle = 'MUTATED_DURING_INSPECTION';
      expect(() => assertBoundarySafetyInvariants(before, raw, mutatedCurrent)).toThrow();

      // 2. Simulated partial localStorage write must be caught by assertBoundarySafetyInvariants
      window.localStorage.setItem(PERSIST_STORAGE_KEY, '{"partial":"corrupted-write"}');
      expect(() => assertBoundarySafetyInvariants(before, raw, current)).toThrow();
      if (before.persistedStorageRaw === null) {
        window.localStorage.removeItem(PERSIST_STORAGE_KEY);
      } else {
        window.localStorage.setItem(PERSIST_STORAGE_KEY, before.persistedStorageRaw);
      }

      // 3. Simulated global prototype pollution must be caught by assertBoundarySafetyInvariants
      (Object.prototype as Record<string, unknown>).polluted = 'simulated';
      expect(() => assertBoundarySafetyInvariants(before, raw, current)).toThrow();
      delete (Object.prototype as Record<string, unknown>).polluted;

      // Clean state passes invariant verification
      assertBoundarySafetyInvariants(before, raw, current);
    });
  });
});
