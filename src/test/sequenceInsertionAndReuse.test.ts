import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSequenceSnapshot, usePilatesStore } from '../store/usePilatesStore';
import type { AutoGenerateCriteria, SavedSequence, SequenceStep } from '../types/pilates';
import { syntheticPlanningExercise } from './planningFixtures';

const original = usePilatesStore.getState();
const warmup = syntheticPlanningExercise('mat', 'warmup');
const core = syntheticPlanningExercise('mat', 'core');
const bridge = syntheticPlanningExercise('mat', 'bridging');
const cooldown = syntheticPlanningExercise('mat', 'cooldown');
const chair = syntheticPlanningExercise('chair', 'core');
const criteria: AutoGenerateCriteria = {
  apparatus: 'mat',
  ownedApparatus: ['mat'],
  availableEquipment: ['mat'],
  preferredProps: ['none'],
  level: '1.0',
  targetMinutes: 50,
  focusPreset: 'full-body',
  defaultLayer: 'easy',
  excludeDaysWindow: 0,
};
const initialSteps: SequenceStep[] = [
  {
    stepId: 'warmup',
    order: 1,
    exerciseId: warmup.id,
    blockCategory: 'warmup',
    durationMin: 2.25,
    selectedLayer: 'easy',
    instructorNote: '보존할 첫 항목 메모',
    explanationSec: 15,
    transitionSec: 0,
  },
  {
    kind: 'rest',
    stepId: 'rest',
    order: 2,
    exerciseId: '',
    blockCategory: 'core',
    durationMin: 1,
    selectedLayer: 'standard',
    instructorNote: '보존할 휴식',
  },
  {
    stepId: 'cooldown',
    order: 3,
    exerciseId: cooldown.id,
    blockCategory: 'cooldown',
    durationMin: 3.5,
    selectedLayer: 'standard',
    instructorNote: '보존할 마지막 항목 메모',
    explanationSec: 10,
    transitionSec: 30,
  },
];

beforeEach(() => {
  localStorage.clear();
  usePilatesStore.setState(
    {
      ...original,
      exercises: structuredClone([warmup, core, bridge, cooldown, chair]),
      ownedEquipment: ['mat'],
      ownedApparatus: ['mat'],
      ownedProps: [],
      activeTab: 'workbench',
      activeSequenceId: 'current-draft',
      activeTitle: '현재 작성 중 수업',
      activeSubtitle: '이전 메모',
      activeApparatus: 'mat',
      activeLevel: '1.0',
      activeTargetMinutes: 50,
      activeTargetGroupId: 'current-group',
      activeSteps: structuredClone(initialSteps),
      draftCriteria: structuredClone(criteria),
      lastCriteria: null,
      savedSequences: [],
      historyLogs: [],
      undoStack: [],
      generationError: null,
      saveFeedback: null,
    },
    true,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  usePilatesStore.setState(original, true);
  localStorage.clear();
});

describe('stable-position movement insertion', () => {
  it('inserts a complete step after the chosen row in one update and restores the whole draft with one undo', () => {
    const before = usePilatesStore.getState();
    const snapshot = createSequenceSnapshot(before);
    const observed = vi.fn();
    const unsubscribe = usePilatesStore.subscribe(observed);
    const result = before.insertExerciseIntoSequence(core.id, { kind: 'step', stepId: 'warmup' });
    unsubscribe();
    const after = usePilatesStore.getState();
    expect(result.success).toBe(true);
    expect(observed).toHaveBeenCalledTimes(1);
    expect(after.activeSteps.map((step) => step.stepId)).toEqual([
      'warmup',
      result.stepId,
      'rest',
      'cooldown',
    ]);
    expect(after.activeSteps[1]).toMatchObject({
      order: 2,
      exerciseId: core.id,
      selectedLayer: 'easy',
      explanationSec: 20,
      transitionSec: 15,
    });
    expect(after.activeSteps.filter((step) => step.stepId !== result.stepId)).toEqual(
      initialSteps.map((step, index) => ({ ...step, order: index === 0 ? 1 : index + 2 })),
    );
    expect(after.exercises).toBe(before.exercises);
    expect(after.undoStack).toHaveLength(1);
    after.undoSequence();
    expect(createSequenceSnapshot(usePilatesStore.getState())).toEqual(snapshot);
  });

  it('keeps consecutive choices in selection order and leaves the original following rows intact', () => {
    const first = usePilatesStore
      .getState()
      .insertExerciseIntoSequence(core.id, { kind: 'step', stepId: 'rest' });
    const second = usePilatesStore
      .getState()
      .insertExerciseIntoSequence(bridge.id, { kind: 'step', stepId: first.stepId! });
    expect(second.success).toBe(true);
    expect(usePilatesStore.getState().activeSteps.map((step) => step.stepId)).toEqual([
      'warmup',
      'rest',
      first.stepId,
      second.stepId,
      'cooldown',
    ]);
    expect(usePilatesStore.getState().undoStack).toHaveLength(2);
    usePilatesStore.getState().undoSequence();
    expect(usePilatesStore.getState().activeSteps.map((step) => step.stepId)).toEqual([
      'warmup',
      'rest',
      first.stepId,
      'cooldown',
    ]);
  });

  it('supports the first position and keeps the legacy append path at the end', () => {
    const first = usePilatesStore.getState().insertExerciseIntoSequence(core.id, { kind: 'start' });
    expect(first.success).toBe(true);
    expect(usePilatesStore.getState().activeSteps[0]).toMatchObject({
      stepId: first.stepId,
      transitionSec: 0,
      order: 1,
    });
    usePilatesStore.getState().appendExerciseToSequence(bridge.id);
    expect(usePilatesStore.getState().activeSteps.at(-1)?.exerciseId).toBe(bridge.id);
  });

  it('resolves an anchor by its live ID after reordering instead of using its previous index', () => {
    expect(usePilatesStore.getState().reorderStep('cooldown', 'warmup')).toBe(true);
    const result = usePilatesStore
      .getState()
      .insertExerciseIntoSequence(core.id, { kind: 'step', stepId: 'warmup' });
    expect(result.success).toBe(true);
    expect(usePilatesStore.getState().activeSteps.map((step) => step.stepId)).toEqual([
      'cooldown',
      'warmup',
      result.stepId,
      'rest',
    ]);
  });

  it('rejects a removed anchor, duplicates, missing exercises and unavailable equipment without any writes', () => {
    const before = usePilatesStore.getState();
    const write = vi.spyOn(Storage.prototype, 'setItem');
    expect(
      before.insertExerciseIntoSequence(core.id, { kind: 'step', stepId: 'removed' }).success,
    ).toBe(false);
    expect(before.insertExerciseIntoSequence(warmup.id, { kind: 'end' }).success).toBe(false);
    expect(before.insertExerciseIntoSequence('missing-exercise', { kind: 'end' }).success).toBe(
      false,
    );
    expect(before.insertExerciseIntoSequence(chair.id, { kind: 'end' }).success).toBe(false);
    expect(usePilatesStore.getState()).toBe(before);
    expect(write).not.toHaveBeenCalled();
  });

  it('keeps locked rows at their exact positions while allowing insertion after the last locked row', () => {
    usePilatesStore.setState({
      activeSteps: initialSteps.map((step) =>
        step.stepId === 'rest' ? { ...step, locked: true } : step,
      ),
    });
    const before = usePilatesStore.getState();
    expect(before.insertExerciseIntoSequence(core.id, { kind: 'start' }).success).toBe(false);
    expect(
      before.insertExerciseIntoSequence(core.id, { kind: 'step', stepId: 'warmup' }).success,
    ).toBe(false);
    expect(usePilatesStore.getState()).toBe(before);
    const result = before.insertExerciseIntoSequence(core.id, { kind: 'step', stepId: 'rest' });
    expect(result.success).toBe(true);
    expect(usePilatesStore.getState().activeSteps[1]).toBe(before.activeSteps[1]);
    expect(usePilatesStore.getState().activeSteps[2].stepId).toBe(result.stepId);
  });

  it('adopts current conditions when adding the first item to an empty class', () => {
    usePilatesStore.setState({
      activeSteps: [],
      activeTargetMinutes: 30,
      draftCriteria: { ...criteria, targetGroupId: 'selected-group' },
    });
    const result = usePilatesStore
      .getState()
      .insertExerciseIntoSequence(core.id, { kind: 'start' });
    expect(result.success).toBe(true);
    expect(usePilatesStore.getState()).toMatchObject({
      activeTargetMinutes: 50,
      activeTargetGroupId: 'selected-group',
    });
  });
});

describe('transactional saved-class reuse', () => {
  const source: SavedSequence = {
    id: 'source-class',
    title: '재사용할 저장 수업',
    subtitle: '저장된 수업 메모',
    apparatus: 'mat',
    level: '1.0',
    focusTags: ['수업 분류'],
    targetMinutes: 45,
    steps: structuredClone(initialSteps),
    criteriaSnapshot: {
      ...criteria,
      targetMinutes: 45,
      targetGroupId: 'source-group',
      planningGoals: ['mobility'],
    },
    taughtCount: 3,
    lastTaughtAt: '2026-11-01T10:00:00.000Z',
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
  };

  beforeEach(() => usePilatesStore.setState({ savedSequences: [structuredClone(source)] }));

  it('creates and opens one independent copy atomically, preserving source/history/group and one-step undo', () => {
    const before = usePilatesStore.getState();
    const snapshot = createSequenceSnapshot(before);
    const observed = vi.fn();
    const unsubscribe = usePilatesStore.subscribe(observed);
    const result = before.openSavedSequenceCopy(source.id, before);
    unsubscribe();
    const after = usePilatesStore.getState();
    const copy = after.savedSequences.find((item) => item.id === result.sequenceId)!;
    expect(result.success).toBe(true);
    expect(observed).toHaveBeenCalledTimes(1);
    expect(after.savedSequences).toHaveLength(2);
    expect(after.savedSequences[1]).toBe(before.savedSequences[0]);
    expect(after.savedSequences[1]).toEqual(source);
    expect(after.historyLogs).toBe(before.historyLogs);
    expect(copy).toMatchObject({
      title: `${source.title} (복사)`,
      taughtCount: 0,
      lastTaughtAt: undefined,
    });
    expect(copy.steps).toEqual(source.steps);
    expect(copy.steps).not.toBe(before.savedSequences[0].steps);
    expect(copy.steps[0]).not.toBe(before.savedSequences[0].steps[0]);
    expect(copy.focusTags).not.toBe(before.savedSequences[0].focusTags);
    expect(copy.criteriaSnapshot?.planningGoals).not.toBe(
      before.savedSequences[0].criteriaSnapshot?.planningGoals,
    );
    expect(after.activeSteps).toEqual(copy.steps);
    expect(after.activeSteps).not.toBe(copy.steps);
    expect(after.activeSteps[0]).not.toBe(copy.steps[0]);
    expect(after.draftCriteria).toEqual(copy.criteriaSnapshot);
    expect(after.draftCriteria).not.toBe(copy.criteriaSnapshot);
    expect(after.activeTargetGroupId).toBe('current-group');
    expect(after.activeSequenceId).toBe(copy.id);
    expect(after.activeTab).toBe('workbench');
    expect(after.undoStack).toHaveLength(1);
    after.undoSequence();
    const restored = usePilatesStore.getState();
    expect(createSequenceSnapshot(restored)).toEqual(snapshot);
    expect(restored.savedSequences).toHaveLength(2);
  });

  it('rejects a stale preview after a newer edit and leaves both source and newer workspace unchanged', () => {
    const preview = usePilatesStore.getState();
    preview.updateStepNote(0, '미리보기 이후 작성한 메모');
    const current = usePilatesStore.getState();
    const write = vi.spyOn(Storage.prototype, 'setItem');
    expect(current.openSavedSequenceCopy(source.id, preview).success).toBe(false);
    expect(usePilatesStore.getState()).toBe(current);
    expect(write).not.toHaveBeenCalled();
  });

  it('rejects repeated activation of the same confirmed intent without creating another copy', () => {
    const intent = usePilatesStore.getState();
    expect(intent.openSavedSequenceCopy(source.id, intent).success).toBe(true);
    const committed = usePilatesStore.getState();
    expect(committed.openSavedSequenceCopy(source.id, intent).success).toBe(false);
    expect(usePilatesStore.getState()).toBe(committed);
    expect(committed.savedSequences).toHaveLength(2);
  });

  it('rejects a missing saved class without changing the workspace or persistence', () => {
    const current = usePilatesStore.getState();
    const write = vi.spyOn(Storage.prototype, 'setItem');
    expect(current.openSavedSequenceCopy('removed-source', current).success).toBe(false);
    expect(usePilatesStore.getState()).toBe(current);
    expect(write).not.toHaveBeenCalled();
  });
});
