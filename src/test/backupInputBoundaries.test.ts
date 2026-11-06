import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import corpus from './fixtures/backup-recovery/backupInputBoundaryCorpus.json';
import { usePilatesStore } from '../store/usePilatesStore';
import {
  MAX_BACKUP_JSON_DEPTH,
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
  getMovementIdeaMeta,
  getMovementIdeaMetaMap,
  getSavedHumanMovementDrafts,
  resetMovementIdeaStateForTests,
} from '../utils/movementIdeaDraft';
import { createEmptyInstructorSchedule } from '../types/instructorSchedule';
import type {
  ClassGroupProfile,
  ClassHistoryLog,
  PilatesExercise,
  SavedSequence,
  SequenceStep,
} from '../types/pilates';
import type { ClassHistoryLogWithSnapshot } from '../types/teachingHistorySnapshot';

const PERSIST_STORAGE_KEY = 'pilates-flow-atelier-storage-v3';
const MOVEMENT_IDEA_META_KEY = 'pilates-flow-movement-idea-meta-v1';

const originalStoreState = usePilatesStore.getState();

const baselineExercise = structuredClone(
  corpus.baselineState.customExercise,
) as unknown as PilatesExercise;
const baselineSequence = structuredClone(
  corpus.baselineState.sequence,
) as unknown as SavedSequence;
const baselineGroup = structuredClone(
  corpus.baselineState.classGroup,
) as unknown as ClassGroupProfile;
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

    it('BND-REF-004 [RESOLVED D1]: rejects unexpected fields on domain records (savedSequences, steps, exercises, youtube, classGroups, historyLogs, programSnapshot) while preserving allowlisted hierarchy/snapshot/extension fields', () => {
      const unknownOnExercise = makeExportV3Payload({
        exercises: [
          {
            ...baselineExercise,
            unexpectedExerciseSecretField: { nested: 'unvalidated-exercise-payload' },
          },
        ],
      });
      assertRejectedWithoutSideEffects(JSON.stringify(unknownOnExercise), 'unsupported_fields');

      const unknownOnYoutube = makeExportV3Payload({
        exercises: [
          {
            ...baselineExercise,
            youtube: {
              ...baselineExercise.youtube,
              unexpectedYoutubeKey: 'unvalidated-youtube',
            },
          },
        ],
      });
      assertRejectedWithoutSideEffects(JSON.stringify(unknownOnYoutube), 'unsupported_fields');

      const unknownOnSequence = makeExportV3Payload({
        savedSequences: [
          {
            ...baselineSequence,
            unexpectedSequenceField: 'unvalidated-sequence-payload',
          },
        ],
      });
      assertRejectedWithoutSideEffects(JSON.stringify(unknownOnSequence), 'unsupported_fields');

      const unknownOnStep = makeExportV3Payload({
        savedSequences: [
          {
            ...baselineSequence,
            steps: [
              {
                ...baselineSequence.steps[0],
                unexpectedStepField: 'unvalidated-step-payload',
              },
            ],
          },
        ],
      });
      assertRejectedWithoutSideEffects(JSON.stringify(unknownOnStep), 'unsupported_fields');

      const unknownOnGroup = makeExportV3Payload({
        classGroups: [
          {
            ...baselineGroup,
            unexpectedGroupField: 'unvalidated-group-payload',
          },
        ],
      });
      assertRejectedWithoutSideEffects(JSON.stringify(unknownOnGroup), 'unsupported_fields');

      const unknownOnHistory = makeExportV3Payload({
        historyLogs: [
          {
            ...baselineHistoryLog,
            unexpectedHistoryField: 'unvalidated-history-payload',
          },
        ],
      });
      assertRejectedWithoutSideEffects(JSON.stringify(unknownOnHistory), 'unsupported_fields');

      // Verify allowlisted hierarchy/snapshot/extension fields remain accepted without error
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
      const allowlistedPayload = makeExportV3Payload({
        exercises: [
          {
            ...baselineExercise,
            defaultRepetitions: 8,
            defaultSets: 2,
            sourceOrigin: 'human-created',
            humanDraftId: 'draft-allowlist-1',
            humanDraftRevision: 2,
            historicalExtension: { marker: true },
            youtube: {
              ...baselineExercise.youtube,
              historicalVideoLabel: 'synthetic only',
            },
          },
        ],
        savedSequences: [
          {
            ...baselineSequence,
            version: 2,
            historicalPlanLabel: 'synthetic only',
            steps: [
              {
                ...baselineSequence.steps[0],
                blockInstanceId: 'blk-inst-1',
                sourceBlockId: 'blk-src-1',
                sourceBlockVersion: 1,
                sourceBlockTitle: '합성 블록',
                blockInstanceDetached: false,
                humanDraftId: 'draft-allowlist-1',
                humanDraftRevision: 2,
                futureStep: { keep: [1, 2] },
                historicalStepLabel: 'synthetic only',
              },
              baselineSequence.steps[1],
            ],
          },
        ],
        historyLogs: [
          {
            ...baselineHistoryLog,
            programSnapshot: validSnapshot,
          },
        ],
      });
      const currentEmpty = makeCurrentRecoveryState({
        exercises: [],
        savedSequences: [],
        classGroups: [],
        historyLogs: [],
      });
      const allowlistedResult = inspectBackupRecovery(
        JSON.stringify(allowlistedPayload),
        currentEmpty,
      );
      expect(allowlistedResult.success).toBe(true);
    });

    it('BND-REF-005 [RESOLVED D3]: rejects partial/malformed historyLog.programSnapshot at inspectBackupRecovery and falls back safely without TypeError in history snapshot consumers', () => {
      for (const badProgramSnapshot of [
        {
          snapshotVersion: 1,
          capturedAt: '2026-11-06T09:00:00.000Z',
          items: null,
          exercisesById: null,
        },
        {
          snapshotVersion: 2,
          recordKind: 'completed-history',
          sourceKind: 'saved-sequence',
          sourceSequenceId: baselineSequence.id,
          sourceSequenceTitle: baselineSequence.title,
          sourceSubtitle: baselineSequence.subtitle,
          taughtAt: '2026-11-06T09:00:00.000Z',
          capturedAt: '2026-11-06T09:00:00.000Z',
          completionFingerprint: 'fp',
          timing: { plannedTotalSec: 600, plannedExerciseSec: 600, plannedRestSec: 0 },
          exercisesById: {},
          items: [],
        },
        {
          snapshotVersion: 1,
          recordKind: 'completed-history',
          sourceKind: 'saved-sequence',
          sourceSequenceId: baselineSequence.id,
          sourceSequenceTitle: baselineSequence.title,
          sourceSubtitle: baselineSequence.subtitle,
          taughtAt: '2026-11-06T09:00:00.000Z',
          capturedAt: '2026-11-06T09:00:00.000Z',
          completionFingerprint: 'fp',
          timing: null,
          exercisesById: {},
          items: [],
        },
      ]) {
        const malformedPayload = makeExportV3Payload({
          historyLogs: [
            {
              ...baselineHistoryLog,
              programSnapshot: badProgramSnapshot,
            },
          ],
        });
        assertRejectedWithoutSideEffects(JSON.stringify(malformedPayload), 'invalid_data');
      }

      // Direct consumer defensive fallback when handed a malformed in-memory log
      const corruptedLog = {
        ...structuredClone(baselineHistoryLog),
        programSnapshot: {
          snapshotVersion: 1,
          capturedAt: '2026-11-06T09:00:00.000Z',
          items: null,
          exercisesById: null,
        },
        sequenceSnapshot: {
          steps: null,
          exerciseSnapshots: null,
        },
      } as unknown as ClassHistoryLog;

      const exercisesMap = new Map([[baselineExercise.id, baselineExercise]]);
      const fallbackView = resolveTeachingHistoryView(corruptedLog, exercisesMap);
      expect(fallbackView.hasPreservedSnapshot).toBe(false);
      expect(fallbackView.steps).toHaveLength(2);
      expect(fallbackView.steps[0].exerciseId).toBe(baselineExercise.id);

      expect(collectMissingSnapshotExercises(corruptedLog, [baselineExercise])).toEqual([]);
      expect(collectDriftedSnapshotExercises(corruptedLog, [baselineExercise]).size).toBe(0);
      expect(
        reconstructStepsSnapshotFromHistoryLog({ ...corruptedLog, stepsSnapshot: undefined }),
      ).toBeNull();
      const cloned = cloneTeachingHistoryToNextClassDraft(corruptedLog, [baselineExercise]);
      expect(cloned).not.toBeNull();
      expect(cloned?.steps).toHaveLength(2);
    });

    it('BND-REF-006 [RESOLVED D4]: rejects duplicate stepId in sequences/history snapshots with duplicate_id and rejects dangling/mismatched exerciseId in programSnapshot.items with missing_exercise', () => {
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

      const dupSequenceStepsPayload = makeExportV3Payload({
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
      });
      assertRejectedWithoutSideEffects(JSON.stringify(dupSequenceStepsPayload), 'duplicate_id');

      const dupHistoryStepsPayload = makeExportV3Payload({
        historyLogs: [
          {
            ...baselineHistoryLog,
            stepsSnapshot: [
              baselineSequence.steps[0],
              {
                ...baselineSequence.steps[0],
                order: 2,
              },
            ],
          },
        ],
      });
      assertRejectedWithoutSideEffects(JSON.stringify(dupHistoryStepsPayload), 'duplicate_id');

      const dupProgramSnapshotItemsPayload = makeExportV3Payload({
        historyLogs: [
          {
            ...baselineHistoryLog,
            programSnapshot: {
              ...validSnapshot,
              items: [
                validSnapshot.items[0],
                {
                  ...validSnapshot.items[0],
                  order: 2,
                },
              ],
            },
          },
        ],
      });
      assertRejectedWithoutSideEffects(
        JSON.stringify(dupProgramSnapshotItemsPayload),
        'duplicate_id',
      );

      const danglingProgramSnapshotItemPayload = makeExportV3Payload({
        historyLogs: [
          {
            ...baselineHistoryLog,
            programSnapshot: {
              ...validSnapshot,
              items: [
                {
                  ...validSnapshot.items[0],
                  exerciseId: 'dangling-snapshot-only-exercise-id',
                  exerciseSnapshot: undefined,
                  movementSnapshot: undefined,
                },
                validSnapshot.items[1],
              ],
            },
          },
        ],
      });
      assertRejectedWithoutSideEffects(
        JSON.stringify(danglingProgramSnapshotItemPayload),
        'missing_exercise',
      );

      const mismatchedSnapshotIdPayload = makeExportV3Payload({
        historyLogs: [
          {
            ...baselineHistoryLog,
            programSnapshot: {
              ...validSnapshot,
              items: [
                {
                  ...validSnapshot.items[0],
                  exerciseId: 'mismatched-step-exercise-id',
                  // validSnapshot.items[0].exerciseSnapshot.id is still baselineExercise.id
                },
                validSnapshot.items[1],
              ],
            },
          },
        ],
      });
      assertRejectedWithoutSideEffects(
        JSON.stringify(mismatchedSnapshotIdPayload),
        'missing_exercise',
      );
    });

    it('BND-REF-007 [RESOLVED D5]: rejects rollback points with missing version (unsupported-version) or corrupted elements inside preRestoreState arrays (invalid-shape)', () => {
      const current = makeCurrentRecoveryState();
      const before = captureBoundarySafetySnapshot('{}', current);

      // 1. Missing version is rejected with 'unsupported-version'
      const missingVersionRollbackRaw = JSON.stringify({
        id: 'rb-missing-version',
        capturedAt: '2026-11-06T09:00:00.000Z',
        addedCount: 1,
        postRestoreStateFingerprint: 'fp-missing-ver',
        postRestoreStorageFingerprint: 'fp-storage-missing-ver',
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
      const missingVerInspected = inspectPersistedRollbackPoint(missingVersionRollbackRaw);
      expect(missingVerInspected.valid).toBe(false);
      if (!missingVerInspected.valid) {
        expect(missingVerInspected.reason).toBe('unsupported-version');
      }

      // 2. Corrupted elements inside preRestoreState arrays are rejected with 'invalid-shape' for both version 0 and version 1
      for (const ver of [0, 1]) {
        const corruptedElementsRaw = JSON.stringify({
          version: ver,
          id: `rb-corrupted-elements-v${ver}`,
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
        window.localStorage.setItem(BACKUP_ROLLBACK_STORAGE_KEY, corruptedElementsRaw);
        resetInMemoryBackupRollbackPointForTest();

        const inspected = inspectPersistedRollbackPoint(corruptedElementsRaw);
        expect(inspected.valid).toBe(false);
        if (!inspected.valid) {
          expect(inspected.reason).toBe('invalid-shape');
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

    it('BND-LIM-004 [RESOLVED D6]: enforces max(1000) on historyLog.stepsSnapshot and exerciseIds, rejects >20,000 char strings, and rejects JSON nesting depth > MAX_BACKUP_JSON_DEPTH (64)', () => {
      expect(MAX_BACKUP_JSON_DEPTH).toBe(64);

      const historySteps1001: SequenceStep[] = Array.from({ length: 1001 }, (_, idx) => ({
        kind: 'exercise',
        stepId: `hist-step-${idx + 1}`,
        order: idx + 1,
        blockCategory: 'extension',
        exerciseId: baselineExercise.id,
        durationMin: 1,
        selectedLayer: 'standard',
      }));

      const overHistoryStepsPayload = makeExportV3Payload({
        historyLogs: [
          {
            ...baselineHistoryLog,
            stepsSnapshot: historySteps1001,
          },
        ],
      });
      assertRejectedWithoutSideEffects(JSON.stringify(overHistoryStepsPayload), 'invalid_data');

      const overHistoryExIdsPayload = makeExportV3Payload({
        historyLogs: [
          {
            ...baselineHistoryLog,
            exerciseIds: Array.from({ length: 1001 }, () => baselineExercise.id),
          },
        ],
      });
      assertRejectedWithoutSideEffects(JSON.stringify(overHistoryExIdsPayload), 'invalid_data');

      const long256kString = buildBoundedDeterministicString(262144, 'overlimit_256k_');
      const overStringPayload = makeExportV3Payload({
        historyLogs: [
          {
            ...baselineHistoryLog,
            instructorReflection: long256kString,
          },
        ],
      });
      assertRejectedWithoutSideEffects(JSON.stringify(overStringPayload), 'invalid_data');

      // Deeply nested JSON (depth 72 > MAX_BACKUP_JSON_DEPTH = 64) inside allowlisted futureStep is rejected before schema traversal
      const deep72Object = buildBoundedNestedObject(72, 'deep-leaf');
      const overDepthPayload = makeExportV3Payload({
        savedSequences: [
          {
            ...baselineSequence,
            steps: [
              {
                ...baselineSequence.steps[0],
                futureStep: deep72Object,
              },
              baselineSequence.steps[1],
            ],
          },
        ],
      });
      const startMs = performance.now();
      assertRejectedWithoutSideEffects(JSON.stringify(overDepthPayload), 'invalid_data');
      const elapsedMs = performance.now() - startMs;
      expect(elapsedMs).toBeLessThan(corpus.bounds.maxCaseDurationMs);

      // Moderate nesting depth (depth 8 <= 64) inside allowlisted futureStep remains accepted
      const shallow8Object = buildBoundedNestedObject(8, 'shallow-leaf');
      const okDepthPayload = makeExportV3Payload({
        savedSequences: [
          {
            ...baselineSequence,
            steps: [
              {
                ...baselineSequence.steps[0],
                futureStep: shallow8Object,
              },
              baselineSequence.steps[1],
            ],
          },
        ],
      });
      const current = makeCurrentRecoveryState();
      expect(inspectBackupRecovery(JSON.stringify(okDepthPayload), current).success).toBe(true);
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

    it('BND-PROTO-002 [RESOLVED D2]: rejects own __proto__/constructor/prototype keys anywhere in backup JSON, prevents local prototype mutation in canonicalRecoveryContent / getMovementIdeaMetaMap, and guards resolveTeachingHistoryView against exerciseId="constructor"', () => {
      // 1. export-v3 data.__proto__ and nested __proto__/constructor/prototype keys are rejected with unsupported_fields
      const protoAtExportV3DataRaw =
        '{"format":"pilates-flow-atelier","version":3,"exportedAt":"2026-11-06T09:30:00.000Z","data":{"__proto__":{"polluted":"data"},"exercises":[],"savedSequences":[],"classGroups":[],"historyLogs":[]}}';
      assertRejectedWithoutSideEffects(protoAtExportV3DataRaw, 'unsupported_fields');

      const nestedProtoInStepRaw =
        '{"format":"pilates-flow-atelier","version":3,"exportedAt":"2026-11-06T09:30:00.000Z","data":{"exercises":[],"savedSequences":[{"id":"seq-1","title":"t","subtitle":"s","apparatus":"mat","level":"1.0","focusTags":[],"targetMinutes":50,"createdAt":"2026-11-06T00:00:00Z","updatedAt":"2026-11-06T00:00:00Z","taughtCount":0,"steps":[{"stepId":"st-1","order":1,"blockCategory":"extension","exerciseId":"custom-boundary-swan-prep","durationMin":10,"selectedLayer":"standard","futureStep":{"__proto__":{"polluted":"nested"}}}]}],"classGroups":[],"historyLogs":[]}}';
      assertRejectedWithoutSideEffects(nestedProtoInStepRaw, 'unsupported_fields');

      // 2. canonicalRecoveryContent strips own __proto__/constructor/prototype keys without mutating local prototypes
      const parsedWithOwnProto = JSON.parse(
        '{"__proto__":{"polluted":"canon"},"constructor":{"bad":1},"prototype":{"bad":2},"safeKey":"ok"}',
      );
      const canonical = canonicalRecoveryContent(parsedWithOwnProto);
      expect(canonical).toBe('{"safeKey":"ok"}');

      // 3. getMovementIdeaMetaMap & getScopedHumanDraftMap ignore __proto__/constructor/prototype keys and never mutate map prototypes
      resetMovementIdeaStateForTests();
      window.localStorage.setItem(
        MOVEMENT_IDEA_META_KEY,
        '{"__proto__":{"revision":1,"pollutedLocalMap":true},"constructor":{"revision":1,"pollutedCtor":true},"ex-valid-idea":{"exerciseId":"ex-valid-idea","ideaLine":"정상 아이디어","workingTitle":"정상","subjectiveFeeling":"","adjustmentNote":"","photoDataUrl":"","triedByInstructor":false,"createdAt":"2026-11-06T00:00:00Z","updatedAt":"2026-11-06T00:00:00Z","revision":1}}',
      );
      const ideaMetaMap = getMovementIdeaMetaMap();
      expect(Object.getPrototypeOf(ideaMetaMap)).toBe(Object.prototype);
      expect((ideaMetaMap as unknown as Record<string, unknown>).pollutedLocalMap).toBeUndefined();
      expect(Object.prototype.hasOwnProperty.call(ideaMetaMap, '__proto__')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(ideaMetaMap, 'constructor')).toBe(false);
      expect(
        getMovementIdeaMeta({ ...baselineExercise, id: 'constructor' }).ideaLine,
      ).toBe(baselineExercise.cues[0]);
      expect(
        getMovementIdeaMeta({ ...baselineExercise, id: 'ex-valid-idea' }).ideaLine,
      ).toBe('정상 아이디어');

      const savedDrafts = getSavedHumanMovementDrafts();
      expect(Array.isArray(savedDrafts)).toBe(true);
      expect(getHumanDraftForIdeaExercise('__proto__')).toBeUndefined();
      expect(getHumanDraftForIdeaExercise('constructor')).toBeUndefined();

      // 4. resolveTeachingHistoryView safely handles exerciseId: "constructor" or "__proto__" without throwing TypeError
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
      const logWithConstructorExId: ClassHistoryLogWithSnapshot = {
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
      const resolvedView = resolveTeachingHistoryView(logWithConstructorExId, exercisesMap);
      expect(resolvedView.steps).toHaveLength(1);
      expect(resolvedView.steps[0].isMissingUnrecoverable).toBe(true);
      expect(resolvedView.missingUnrecoverableExerciseIds).toContain('constructor');

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

      const fingerprint1 = backupRecoveryStateFingerprint({
        ...currentEmpty,
        ...inspect1.next,
      });

      const restore1 = usePilatesStore.getState().restoreBackup(export1);
      expect(restore1.success).toBe(true);

      const export2 = usePilatesStore.getState().exportBackup();
      const inspect2 = inspectBackupRecovery(export2, currentEmpty);
      expect(inspect2.success).toBe(true);
      if (!inspect2.success) return;

      const fingerprint2 = backupRecoveryStateFingerprint({
        ...currentEmpty,
        ...inspect2.next,
      });
      expect(fingerprint2).toBe(fingerprint1);

      // Mutate live customExercise after history completion and verify history snapshot remains immutable
      const mutatedLiveExercise: PilatesExercise = {
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
