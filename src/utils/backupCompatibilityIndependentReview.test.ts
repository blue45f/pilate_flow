import type { ClassHistoryLogWithSnapshot } from '../types/teachingHistorySnapshot';
import { describe, it, expect, afterEach } from 'vitest';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import { cloudBackupDataSchema } from '../schemas/cloudBackupSchema';
import { parseRecoverableNativeBackup } from '../../backend/backupValidation';
import { usePilatesStore, type PilatesStudioState } from '../store/usePilatesStore';
import { backupRecoveryStateFingerprint, inspectBackupRecovery } from './backupRecoveryInspection';
import {
  buildTeachingProgramSnapshot,
  reconstructStepsSnapshotFromHistoryLog,
  captureBackupPreRestoreState,
  recordBackupRestoreRollbackPoint,
  getLatestBackupRollbackPoint,
  clearBackupRestoreRollbackPoint,
  rollbackLatestBackupRestore,
  isValidBackupPreRestoreDomainState,
} from './teachingHistorySnapshot';
import { syncAccountWorkspace, accountStorageKey, ACTIVE_OWNER_KEY } from '../lib/accountStorage';
import type { SequenceStep, ClassHistoryLog, ApparatusType } from '../types/pilates';
const initialStore = usePilatesStore.getState();
afterEach(() => {
  clearBackupRestoreRollbackPoint();
  syncAccountWorkspace(null);
  usePilatesStore.setState(initialStore, true);
  localStorage.clear();
});

const now = '2026-11-06T10:00:00.000Z';
const ex = syntheticPlanningExercise('mat', 'core', 'alpha', false);
const step: SequenceStep = {
  stepId: 'review-step-1',
  order: 1,
  exerciseId: ex.id,
  blockCategory: 'core',
  durationMin: 5,
  selectedLayer: 'standard',
  repetitions: 8,
  sets: 2,
  sideMode: 'right-then-left',
  classSection: 'preparation',
  timeEstimate: {
    version: 1,
    repetitions: 8,
    sets: 2,
    sides: 2,
    secondsPerRep: 3,
    holdSecPerRep: 0,
    breathsPerSet: 0,
    secondsPerBreath: 0,
    restBetweenSetsSec: 10,
    sideSwitchSec: 5,
    explanationSec: 20,
    transitionSec: 10,
  },
  motionStudy: {
    version: 2,
    family: 'future-compatible-family',
    variantId: 'review-variant',
    sourceFingerprint: 'a'.repeat(64),
  },
};
function snapshot() {
  return buildTeachingProgramSnapshot({
    sequenceId: 'review-seq',
    sequenceTitle: 'Compatibility fixture',
    sourceKind: 'saved-sequence',
    groupId: '',
    taughtAt: now,
    steps: [structuredClone(step)],
    exercises: [structuredClone(ex)],
    apparatus: 'mat',
    level: '1.0',
    targetMinutes: 50,
  });
}
function log(): ClassHistoryLogWithSnapshot {
  return {
    id: 'review-log',
    sequenceId: 'review-seq',
    sequenceTitle: 'Compatibility fixture',
    groupId: '',
    groupName: '',
    taughtAt: now,
    apparatus: 'mat',
    level: '1.0',
    exerciseIds: [ex.id],
    rating: 4,
    intensity: 'moderate',
    instructorReflection: '',
    programSnapshot: snapshot(),
  };
}
function data() {
  return { exercises: [ex], savedSequences: [], classGroups: [], historyLogs: [log()] };
}
function raw(payload: unknown) {
  return JSON.stringify({
    format: 'pilates-flow-atelier',
    version: 3,
    exportedAt: now,
    data: payload,
  });
}
function current(): PilatesStudioState {
  return {
    ...usePilatesStore.getState(),
    exercises: [],
    savedSequences: [],
    historyLogs: [],
    classGroups: [],
    conditionTemplates: [],
    activeSteps: [],
    activeSequenceId: 'current',
    draftCriteria: null,
    lastCriteria: null,
  };
}
describe('independent main compatibility review', () => {
  it('baseline native-v3 wire keeps all six modern step fields intact', () => {
    const payload = data();
    payload.historyLogs[0].stepsSnapshot = [structuredClone(step)];
    const parsed = cloudBackupDataSchema.parse(payload);
    expect(parsed.historyLogs[0].stepsSnapshot?.[0]).toEqual(step);
    expect(parseRecoverableNativeBackup(raw(payload)).historyLogs[0].stepsSnapshot?.[0]).toEqual(
      step,
    );
    expect(inspectBackupRecovery(raw(payload), current()).success).toBe(true);
  });
  it('accepts a deleted catalog movement backed by valid inline program snapshots', () => {
    const payload = data();
    payload.exercises = [];
    const result = inspectBackupRecovery(raw(payload), current());
    expect(result).toMatchObject({ success: true });
  });
  it('preserves modern fields when restoring programSnapshot without stepsSnapshot', () => {
    const original = log();
    const reconstructed = reconstructStepsSnapshotFromHistoryLog(original)!;
    expect(reconstructed[0]).toMatchObject({
      timeEstimate: step.timeEstimate,
      motionStudy: step.motionStudy,
      classSection: step.classSection,
    });
  });
  it('preserves modern fields from sequenceSnapshot-only fallback', () => {
    const original = {
      ...log(),
      programSnapshot: undefined,
      sequenceSnapshot: snapshot().sequenceSnapshot,
    } as ClassHistoryLog;
    const reconstructed = reconstructStepsSnapshotFromHistoryLog(original)!;
    expect(reconstructed[0]).toMatchObject({
      timeEstimate: step.timeEstimate,
      motionStudy: step.motionStudy,
      classSection: step.classSection,
    });
  });
  it('captures rollback domain independently from later nested mutations', () => {
    const state = {
      ...current(),
      exercises: [structuredClone(ex)],
      ownedApparatus: ['mat'] as ApparatusType[],
    };
    const before = state.exercises[0].nameKo;
    const captured = captureBackupPreRestoreState(state);
    state.exercises[0].nameKo = 'MUTATED AFTER CAPTURE';
    expect(captured.exercises[0].nameKo).toBe(before);
  });
});

function simpleState(): PilatesStudioState {
  return {
    ...current(),
    exercises: [structuredClone(ex)],
    ownedEquipment: ['mat'],
    ownedApparatus: ['mat'],
    ownedProps: [],
    instructorSchedule: { locations: [], classes: [], exceptions: [] },
    datedSequencePlanning: { assignments: [] },
    instructorStudyState: undefined,
  };
}
describe('additional candidate isolation and compatibility checks', () => {
  it('accepts a deleted movement with valid inline legacy snapshots without timeEstimate', () => {
    const payload = data();
    payload.exercises = [];
    delete payload.historyLogs[0].programSnapshot!.sequenceSnapshot!.steps[0].timeEstimate;
    expect(inspectBackupRecovery(raw(payload), current())).toMatchObject({ success: true });
  });
  it('preserves arbitrary previously supported extension metadata on an exercise and step', () => {
    const payload = data();
    Object.assign(payload.exercises[0], { userDefinedTrainingNotes: { tag: 'keep-exact' } });
    delete payload.historyLogs[0].programSnapshot!.sequenceSnapshot!.steps[0].timeEstimate;
    expect(inspectBackupRecovery(raw(payload), current())).toMatchObject({ success: true });
  });
  it('record isolates its input and getter result from valid-looking external mutation', () => {
    clearBackupRestoreRollbackPoint();
    const state = simpleState();
    const pre = captureBackupPreRestoreState(state);
    expect(isValidBackupPreRestoreDomainState(pre)).toBe(true);
    const originalName = pre.exercises[0].nameKo;
    recordBackupRestoreRollbackPoint({
      preRestoreState: pre,
      addedCount: 1,
      postRestoreStateFingerprint: backupRecoveryStateFingerprint(state),
      postRestoreStorageFingerprint: null,
    });
    pre.exercises[0].nameKo = 'mutation-through-record-input';
    expect(getLatestBackupRollbackPoint()!.preRestoreState.exercises[0].nameKo).toBe(originalName);
  });
  it('getter does not hand out the mutable internal rollback point', () => {
    clearBackupRestoreRollbackPoint();
    const state = simpleState();
    const pre = captureBackupPreRestoreState(state);
    const originalName = pre.exercises[0].nameKo;
    recordBackupRestoreRollbackPoint({
      preRestoreState: pre,
      addedCount: 1,
      postRestoreStateFingerprint: backupRecoveryStateFingerprint(state),
      postRestoreStorageFingerprint: null,
    });
    getLatestBackupRollbackPoint()!.preRestoreState.exercises[0].nameKo = 'mutation-through-getter';
    expect(getLatestBackupRollbackPoint()!.preRestoreState.exercises[0].nameKo).toBe(originalName);
  });
  it('rollback keeps the store untouched when storage guard says unavailable with null fingerprint', () => {
    clearBackupRestoreRollbackPoint();
    const state = simpleState();
    const pre = captureBackupPreRestoreState(state);
    let writes = 0;
    recordBackupRestoreRollbackPoint({
      preRestoreState: pre,
      addedCount: 1,
      postRestoreStateFingerprint: backupRecoveryStateFingerprint(state),
      postRestoreStorageFingerprint: null,
    });
    const outcome = rollbackLatestBackupRestore({
      getState: () => state,
      setState: () => {
        writes++;
      },
      checkStorage: () => ({ ok: false, code: 'storage_unavailable' }),
    });
    expect(outcome.success).toBe(false);
    expect(writes).toBe(0);
  });
});

describe('rollback owner isolation', () => {
  it('does not allow rollback A after switching to B with identical post-restore content', () => {
    clearBackupRestoreRollbackPoint();
    localStorage.clear();
    syncAccountWorkspace('independent-owner-a');
    const post = simpleState();
    usePilatesStore.setState(post);
    const pre = captureBackupPreRestoreState({
      ...post,
      exercises: [{ ...ex, nameKo: 'PRIVATE OWNER A BEFORE RESTORE' }],
    });
    recordBackupRestoreRollbackPoint({
      preRestoreState: pre,
      addedCount: 1,
      postRestoreStateFingerprint: backupRecoveryStateFingerprint(usePilatesStore.getState()),
      postRestoreStorageFingerprint: null,
    });
    const options = usePilatesStore.persist.getOptions();
    localStorage.setItem(
      accountStorageKey('independent-owner-b'),
      JSON.stringify({ version: 3, state: options.partialize!(usePilatesStore.getState()) }),
    );
    syncAccountWorkspace('independent-owner-b');
    expect(localStorage.getItem(ACTIVE_OWNER_KEY)).toBe('independent-owner-b');
    usePilatesStore.setState(post);
    expect(backupRecoveryStateFingerprint(usePilatesStore.getState())).toBe(
      backupRecoveryStateFingerprint(post),
    );
    const outcome = rollbackLatestBackupRestore({
      getState: usePilatesStore.getState,
      setState: usePilatesStore.setState,
      checkStorage: () => ({ ok: true }),
    });
    expect(outcome.success).toBe(false);
    expect(usePilatesStore.getState().exercises[0].nameKo).not.toBe(
      'PRIVATE OWNER A BEFORE RESTORE',
    );
  });
});

describe('program-only metadata and point envelope guards', () => {
  it('retains explicit section, time assumptions and opaque motion binding without a nested sequence snapshot', () => {
    const original = log();
    delete original.programSnapshot!.sequenceSnapshot;
    const restored = reconstructStepsSnapshotFromHistoryLog(original)!;
    expect(restored[0]).toMatchObject({
      classSection: step.classSection,
      timeEstimate: step.timeEstimate,
      motionStudy: step.motionStudy,
    });
  });
  it('rejects non-finite addedCount before recording a rollback point', () => {
    clearBackupRestoreRollbackPoint();
    const state = simpleState();
    recordBackupRestoreRollbackPoint({
      preRestoreState: captureBackupPreRestoreState(state),
      addedCount: Number.POSITIVE_INFINITY,
      postRestoreStateFingerprint: backupRecoveryStateFingerprint(state),
      postRestoreStorageFingerprint: null,
    });
    expect(getLatestBackupRollbackPoint()).toBeNull();
  });
});


describe('rollback write verification', () => {
  it('reverts a failed rollback write even when the captured disk fingerprint was unavailable', () => {
    const state = simpleState();
    const pre = captureBackupPreRestoreState(state);
    pre.exercises[0].nameKo = 'before-restore';
    recordBackupRestoreRollbackPoint({
      preRestoreState: pre,
      addedCount: 1,
      postRestoreStateFingerprint: backupRecoveryStateFingerprint(state),
      postRestoreStorageFingerprint: null,
    });
    let current = state;
    let checks = 0;
    const outcome = rollbackLatestBackupRestore({
      getState: () => current,
      setState: (partial) => { current = { ...current, ...partial }; },
      checkStorage: () => ++checks === 1 ? { ok: true } : { ok: false, code: 'storage_unavailable' },
    });
    expect(outcome.success).toBe(false);
    expect(checks).toBe(2);
    expect(current.exercises).toEqual(state.exercises);
    expect(getLatestBackupRollbackPoint()).not.toBeNull();
  });
});
