import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { usePilatesStore } from '../store/usePilatesStore';
import { inspectBackupRecovery, canonicalRecoveryContent } from '../utils/backupRecoveryInspection';
import { createEmptyInstructorSchedule } from '../types/instructorSchedule';
import { syntheticPlanningExercise } from './planningFixtures';
import type { SavedSequence, SequenceStep } from '../types/pilates';

const original = usePilatesStore.getState();
const exercise = syntheticPlanningExercise('mat', 'core', 'alpha', false);
const step: SequenceStep = {
  stepId: 'qa-recovery-working',
  order: 1,
  exerciseId: exercise.id,
  blockCategory: 'core',
  durationMin: 12,
  selectedLayer: 'easy',
  locked: true,
  instructorNote: '현재의 개인 초안',
};
const source: SavedSequence = {
  id: 'qa-recovery-saved',
  title: '이전 저장 수업',
  subtitle: '',
  apparatus: 'mat',
  level: '1.0',
  targetMinutes: 50,
  focusTags: [],
  steps: [
    { ...step, stepId: 'qa-imported', durationMin: 48 },
    {
      stepId: 'qa-imported-rest',
      order: 2,
      kind: 'rest',
      exerciseId: '',
      blockCategory: 'core',
      durationMin: 2,
      selectedLayer: 'standard',
      locked: true,
    },
  ],
  createdAt: '',
  updatedAt: '',
  taughtCount: 0,
};
function file(data: Record<string, unknown> = {}) {
  return JSON.stringify({
    format: 'pilates-flow-atelier',
    version: 3,
    exportedAt: '2026-11-05T01:00:00.000Z',
    data: {
      exercises: [exercise],
      savedSequences: [source],
      classGroups: [],
      historyLogs: [],
      ...data,
    },
  });
}
function workspace() {
  const state = usePilatesStore.getState();
  return {
    id: state.activeSequenceId,
    title: state.activeTitle,
    subtitle: state.activeSubtitle,
    steps: state.activeSteps,
    apparatus: state.activeApparatus,
    level: state.activeLevel,
    target: state.activeTargetMinutes,
    group: state.activeTargetGroupId,
    draft: state.draftCriteria,
    last: state.lastCriteria,
    undo: state.undoStack,
  };
}
function references() {
  const state = usePilatesStore.getState();
  return {
    exercises: state.exercises,
    saved: state.savedSequences,
    groups: state.classGroups,
    history: state.historyLogs,
    templates: state.conditionTemplates,
    schedule: state.instructorSchedule,
    study: state.instructorStudyState,
    dated: state.datedSequencePlanning,
    owned: state.ownedEquipment,
    props: state.ownedProps,
    workspace: workspace(),
  };
}
beforeEach(() =>
  usePilatesStore.setState({
    ...original,
    exercises: [structuredClone(exercise)],
    savedSequences: [],
    classGroups: [],
    historyLogs: [],
    conditionTemplates: [],
    instructorSchedule: createEmptyInstructorSchedule(),
    instructorStudyState: undefined,
    datedSequencePlanning: undefined,
    ownedEquipment: ['mat'],
    ownedApparatus: ['mat'],
    ownedProps: [],
    activeSequenceId: 'qa-working',
    activeTitle: '현재 초안',
    activeSubtitle: '현재 작업 보존',
    activeApparatus: 'mat',
    activeLevel: '1.0',
    activeTargetMinutes: 50,
    activeTargetGroupId: '',
    activeSteps: [structuredClone(step)],
    draftCriteria: null,
    lastCriteria: null,
    undoStack: [],
    saveFeedback: null,
  }),
);
afterEach(() => usePilatesStore.setState(original, true));

describe('file recovery preview and atomic store commit', () => {
  it('keeps inspection read-only, rejects stale workbench changes, and applies exactly the rechecked plan', () => {
    const before = usePilatesStore.getState(),
      raw = file(),
      inspection = inspectBackupRecovery(raw, before);
    expect(inspection.success).toBe(true);
    if (!inspection.success) return;
    expect(usePilatesStore.getState()).toBe(before);
    usePilatesStore.setState({ activeSteps: [{ ...step, instructorNote: '検討後の現在メモ' }] });
    const changed = references();
    expect(
      usePilatesStore
        .getState()
        .restoreBackup(raw, { expectedStateFingerprint: inspection.stateFingerprint }).success,
    ).toBe(false);
    expect(references()).toEqual(changed);
    const next = inspectBackupRecovery(raw, usePilatesStore.getState());
    expect(next.success).toBe(true);
    if (!next.success) return;
    const currentWorkspace = workspace();
    expect(
      usePilatesStore
        .getState()
        .restoreBackup(raw, { expectedStateFingerprint: next.stateFingerprint }),
    ).toMatchObject({ success: true, added: 1, unchanged: false });
    expect(canonicalRecoveryContent(usePilatesStore.getState().savedSequences)).toBe(
      canonicalRecoveryContent(next.next.savedSequences),
    );
    expect(workspace()).toEqual(currentWorkspace);
    expect(usePilatesStore.getState().draftCriteria).toBeNull();
    expect(usePilatesStore.getState().lastCriteria).toBeNull();
    const records = usePilatesStore.getState().savedSequences;
    expect(usePilatesStore.getState().restoreBackup(raw)).toMatchObject({
      success: true,
      added: 0,
      unchanged: true,
    });
    expect(usePilatesStore.getState().savedSequences).toBe(records);
  });

  it('rejects future/foreign/duplicate/malformed files without partial record, inventory or working-draft changes', () => {
    const future = JSON.parse(file());
    future.version = 99;
    const duplicate = JSON.parse(file());
    duplicate.data.exercises.push(duplicate.data.exercises[0]);
    const unsupported = JSON.parse(file());
    unsupported.data.futurePersonalField = { private: 'не выводить' };
    for (const raw of [
      '{',
      '{}',
      JSON.stringify(future),
      JSON.stringify(duplicate),
      JSON.stringify(unsupported),
      file({ savedSequences: [{ ...source, steps: [{ ...step, exerciseId: 'missing' }] }] }),
    ]) {
      const before = references();
      expect(usePilatesStore.getState().restoreBackup(raw).success).toBe(false);
      expect(references()).toEqual(before);
    }
  });

  it('recovers the proven original-v0 workspace as one independent repeatable Binder copy with unknown dates/criteria', () => {
    const legacy = {
      version: 0,
      state: {
        exercises: [exercise],
        savedSequences: [],
        classGroups: [],
        historyLogs: [],
        ownedApparatus: ['mat'],
        activeSequenceId: 'qa-original-identity',
        activeTitle: '이전 작업대 원제목',
        activeSubtitle: '이전 부제목',
        activeApparatus: 'mat',
        activeLevel: '1.0',
        activeTargetMinutes: 50,
        activeTargetGroupId: 'old-group-reference',
        activeSteps: source.steps,
      },
    };
    const raw = JSON.stringify(legacy),
      before = workspace();
    expect(usePilatesStore.getState().restoreBackup(raw)).toMatchObject({
      success: true,
      added: 1,
    });
    const restored = usePilatesStore.getState().savedSequences[0]!;
    expect(restored.id).toMatch(/^backup-legacy-draft-/);
    expect(restored.id).not.toBe(legacy.state.activeSequenceId);
    expect(restored.title).toBe(legacy.state.activeTitle);
    expect(restored.steps).toEqual(source.steps);
    expect(restored.recoveredDraftOrigin).toMatchObject({
      format: 'persisted-workspace-v0',
      sourceSequenceId: 'qa-original-identity',
      activeTargetGroupId: 'old-group-reference',
      timestamps: 'unrecorded',
      criteriaPresence: { draft: false, last: false },
      draftCriteria: null,
      lastCriteria: null,
    });
    expect(restored.createdAt).toBe('');
    expect(restored.updatedAt).toBe('');
    expect(restored).not.toHaveProperty('criteriaSnapshot');
    expect(workspace()).toEqual(before);
    expect(usePilatesStore.getState().restoreBackup(raw)).toMatchObject({
      success: true,
      added: 0,
      unchanged: true,
    });
    expect(usePilatesStore.getState().savedSequences).toHaveLength(1);
    const exported = usePilatesStore.getState().exportBackup();
    expect(inspectBackupRecovery(exported, usePilatesStore.getState()).success).toBe(true);
  });

  it('preserves original conditions/group references without applying them to a nonempty current workspace', () => {
    const criteria = {
      apparatus: 'mat',
      availableEquipment: ['mat'],
      level: '1.5',
      focusPreset: 'full-body',
      preferredProps: [],
      excludeDaysWindow: 0,
      targetMinutes: 60,
      defaultLayer: 'hard',
      targetGroupId: 'historical-group',
      instructorObservations: ['posterior-pelvic-tilt'],
    };
    const last = { ...criteria, level: '1.0', targetMinutes: 50, defaultLayer: 'easy' };
    const raw = JSON.stringify({
      version: 3,
      state: {
        exercises: [exercise],
        savedSequences: [],
        classGroups: [],
        historyLogs: [],
        activeSequenceId: 'qa-original',
        activeTitle: '원제목',
        activeSubtitle: '',
        activeApparatus: 'mat',
        activeLevel: '1.0',
        activeTargetMinutes: 50,
        activeTargetGroupId: 'different-original-group',
        activeSteps: source.steps,
        draftCriteria: criteria,
        lastCriteria: last,
      },
    });
    const before = workspace();
    expect(usePilatesStore.getState().restoreBackup(raw).success).toBe(true);
    const recovered = usePilatesStore.getState().savedSequences[0]!;
    expect(recovered.recoveredDraftOrigin?.draftCriteria).toEqual(criteria);
    expect(recovered.recoveredDraftOrigin?.lastCriteria).toEqual(last);
    expect(recovered.criteriaSnapshot).toEqual(criteria);
    expect(recovered.recoveredDraftOrigin?.activeTargetGroupId).toBe('different-original-group');
    expect(workspace()).toEqual(before);
  });

  it('keeps known empty exports a no-op and rejects incomplete legacy source metadata without guesses', () => {
    const raw = file({ exercises: [], savedSequences: [] }),
      before = references();
    const result = usePilatesStore.getState().restoreBackup(raw);
    expect(result).toMatchObject({ success: true, added: 0, unchanged: true });
    expect(result.message).toContain('바꿀 자료가 없습니다');
    expect(references()).toEqual(before);
    const missing = JSON.stringify({
      version: 0,
      state: {
        exercises: [exercise],
        savedSequences: [],
        classGroups: [],
        historyLogs: [],
        activeSteps: source.steps,
        activeSequenceId: 'id',
        activeApparatus: 'mat',
        activeLevel: '1.0',
        activeTargetMinutes: 50,
        activeTargetGroupId: '',
        activeSubtitle: '',
      },
    });
    const failure = usePilatesStore.getState().restoreBackup(missing);
    expect(failure.success).toBe(false);
    expect(failure.message).toContain('수업 제목');
    expect(references()).toEqual(before);
  });
  it('retains deep-copied legacy provenance through ordinary save, save-as-new, duplicate and unsaved export', () => {
    const raw = JSON.stringify({
      version: 0,
      state: {
        exercises: [exercise],
        savedSequences: [],
        classGroups: [],
        historyLogs: [],
        activeSequenceId: 'qa-lineage-source',
        activeTitle: '원래 초안',
        activeSubtitle: '',
        activeApparatus: 'mat',
        activeLevel: '1.0',
        activeTargetMinutes: 50,
        activeTargetGroupId: 'old-group',
        activeSteps: source.steps,
      },
    });
    expect(usePilatesStore.getState().restoreBackup(raw).success).toBe(true);
    const restored = usePilatesStore.getState().savedSequences[0]!;
    const origin = structuredClone(restored.recoveredDraftOrigin!);
    usePilatesStore.getState().loadSequenceIntoWorkbench(restored.id);
    usePilatesStore.getState().toggleStepLock(0);
    usePilatesStore.getState().updateStepNote(0, '새로 작성한 강사 메모');
    const beforeSave = JSON.parse(usePilatesStore.getState().exportBackup());
    expect(beforeSave.data.activeDraft.recoveredDraftOrigin).toEqual(origin);
    const savedId = usePilatesStore.getState().saveCurrentSequenceToBinder();
    expect(savedId).toBe(restored.id);
    const saved = usePilatesStore
      .getState()
      .savedSequences.find((record) => record.id === savedId)!;
    expect(saved.recoveredDraftOrigin).toEqual(origin);
    expect(saved.recoveredDraftOrigin).not.toBe(restored.recoveredDraftOrigin);
    const newId = usePilatesStore.getState().saveCurrentSequenceToBinder(true);
    const newRecord = usePilatesStore
      .getState()
      .savedSequences.find((record) => record.id === newId)!;
    expect(newRecord.recoveredDraftOrigin).toEqual(origin);
    expect(newRecord.recoveredDraftOrigin).not.toBe(saved.recoveredDraftOrigin);
    const copyId = usePilatesStore.getState().duplicateSavedSequence(savedId)!;
    const copy = usePilatesStore.getState().savedSequences.find((record) => record.id === copyId)!;
    expect(copy.recoveredDraftOrigin).toEqual(origin);
    expect(copy.recoveredDraftOrigin).not.toBe(saved.recoveredDraftOrigin);
    const exported = usePilatesStore.getState().exportBackup();
    const inspected = inspectBackupRecovery(exported, usePilatesStore.getState());
    expect(inspected.success).toBe(true);
    if (inspected.success)
      expect(
        inspected.next.savedSequences.every(
          (record) => record.recoveredDraftOrigin?.sourceSequenceId === 'qa-lineage-source',
        ),
      ).toBe(true);
  });
});
