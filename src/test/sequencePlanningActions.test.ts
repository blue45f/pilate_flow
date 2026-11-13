import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSequenceSnapshot, getActiveSequencePlanningCriteria, usePilatesStore } from '../store/usePilatesStore';
import type { AutoGenerateCriteria, SavedSequence, SequenceStep } from '../types/pilates';
import { syntheticPlanningExercise } from './planningFixtures';

const initialState = usePilatesStore.getState();
const mat = syntheticPlanningExercise('mat', 'core');
const reformer = syntheticPlanningExercise('reformer', 'footwork');
const cadillac = syntheticPlanningExercise('cadillac', 'upper-body');
const tower = { ...syntheticPlanningExercise('cadillac', 'core'), requiredEquipment: ['tower'] };
const criteria: AutoGenerateCriteria = {
  apparatus: 'mat',
  ownedApparatus: ['mat'],
  availableEquipment: ['mat'],
  preferredProps: ['none'],
  level: '1.0',
  targetMinutes: 50,
  targetGroupId: 'planning-group',
  focusPreset: 'full-body',
  defaultLayer: 'standard',
  excludeDaysWindow: 7,
};
const steps: SequenceStep[] = [{
  stepId: 'authored-first', order: 1, exerciseId: mat.id, blockCategory: 'core',
  durationMin: 4.25, selectedLayer: 'easy', explanationSec: 15, transitionSec: 20,
  instructorNote: 'Keep the teacher’s original note', repetitions: 6, sets: 2,
}];
const saved: SavedSequence = {
  id: 'saved-source', title: '내가 정한 수업 제목', subtitle: '직접 입력한 부제',
  apparatus: 'mat', level: '1.0', targetMinutes: 50, focusTags: ['내 수업'],
  createdAt: '2026-11-13T00:00:00.000Z', updatedAt: '2026-11-13T00:00:00.000Z',
  taughtCount: 2, steps: structuredClone(steps), criteriaSnapshot: structuredClone(criteria),
};

beforeEach(() => {
  localStorage.clear();
  usePilatesStore.setState({
    ...initialState,
    exercises: [mat, reformer, cadillac, tower],
    ownedApparatus: ['mat', 'reformer', 'cadillac', 'barrel'],
    ownedEquipment: ['mat', 'reformer', 'tower', 'ladder-barrel'],
    ownedProps: ['mini-ball'],
    activeSequenceId: saved.id,
    activeTitle: saved.title,
    activeSubtitle: saved.subtitle,
    activeApparatus: 'mat',
    activeLevel: '1.0',
    activeTargetMinutes: 50,
    activeTargetGroupId: 'planning-group',
    activeSteps: structuredClone(steps),
    lastCriteria: structuredClone(criteria),
    draftCriteria: structuredClone(criteria),
    savedSequences: [structuredClone(saved)],
    historyLogs: [],
    undoStack: [],
    generationError: null,
    saveFeedback: null,
    persistenceError: null,
  }, true);
});

afterEach(() => {
  vi.restoreAllMocks();
  usePilatesStore.setState(initialState, true);
  localStorage.clear();
});

describe('atomic manual sequence planning actions', () => {
  it('starts a new document without changing its saved source and restores the exact authoring snapshot with one undo', () => {
    const before = usePilatesStore.getState();
    const snapshot = createSequenceSnapshot(before);
    const changed = vi.fn();
    const unsubscribe = usePilatesStore.subscribe(changed);
    const result = before.startBlankSequence();
    unsubscribe();

    const next = usePilatesStore.getState();
    expect(result.success).toBe(true);
    expect(result.sequenceId).toBe(next.activeSequenceId);
    expect(next.activeSequenceId).not.toBe(saved.id);
    expect(next.activeTitle).toBe('새 수업');
    expect(next.activeSteps).toEqual([]);
    expect(next.activeApparatus).toBe(before.activeApparatus);
    expect(next.activeTargetMinutes).toBe(before.activeTargetMinutes);
    expect(next.activeTargetGroupId).toBe(before.activeTargetGroupId);
    expect(next.draftCriteria).toEqual(next.lastCriteria);
    expect(next.savedSequences).toBe(before.savedSequences);
    expect(next.historyLogs).toBe(before.historyLogs);
    expect(next.undoStack).toEqual([snapshot]);
    expect(changed).toHaveBeenCalledTimes(1);

    next.undoSequence();
    expect(createSequenceSnapshot(usePilatesStore.getState())).toEqual(snapshot);
    expect(usePilatesStore.getState().savedSequences).toEqual([saved]);
  });

  it('saves the new blank-derived class under a new ID instead of overwriting the loaded source', () => {
    const state = usePilatesStore.getState();
    expect(state.startBlankSequence().success).toBe(true);
    expect(usePilatesStore.getState().insertExerciseIntoSequence(mat.id, { kind: 'end' }).success).toBe(true);
    const newSavedId = usePilatesStore.getState().saveCurrentSequenceToBinder();
    expect(newSavedId).not.toBe(saved.id);
    expect(usePilatesStore.getState().savedSequences).toHaveLength(2);
    expect(usePilatesStore.getState().savedSequences.find((item) => item.id === saved.id)).toEqual(saved);
  });

  it('applies changed apparatus conditions to the next insertion while preserving existing rows, title and timing', () => {
    const before = usePilatesStore.getState();
    expect(before.insertExerciseIntoSequence(reformer.id, { kind: 'end' }).success).toBe(false);
    const changed = vi.fn();
    const unsubscribe = usePilatesStore.subscribe(changed);
    const result = before.updateSequencePlanningConditions({ apparatus: 'reformer', targetMinutes: 45, level: '1.5' });
    unsubscribe();
    const applied = usePilatesStore.getState();
    expect(result.success).toBe(true);
    expect(result.message).toContain('기존 동작 1개');
    expect(changed).toHaveBeenCalledTimes(1);
    expect(applied.activeSteps).toBe(before.activeSteps);
    expect(applied.activeSteps).toEqual(steps);
    expect(applied.activeTitle).toBe(saved.title);
    expect(applied.activeSubtitle).toBe(saved.subtitle);
    expect(applied.activeSequenceId).toBe(saved.id);
    expect(applied.savedSequences).toBe(before.savedSequences);
    expect(applied.activeApparatus).toBe('reformer');
    expect(applied.activeTargetMinutes).toBe(45);
    expect(applied.lastCriteria).toMatchObject({ apparatus: 'reformer', availableEquipment: ['reformer'], targetMinutes: 45, level: '1.5' });
    expect(applied.draftCriteria).toEqual(applied.lastCriteria);
    expect(applied.insertExerciseIntoSequence(reformer.id, { kind: 'end' }).success).toBe(true);
    expect(usePilatesStore.getState().activeSteps.map((step) => step.exerciseId)).toEqual([mat.id, reformer.id]);
  });

  it('uses the applied insertion conditions when an advanced draft has unrelated apparatus and props', () => {
    const warmup = syntheticPlanningExercise('reformer', 'warmup');
    const applied: AutoGenerateCriteria = {
      ...criteria, apparatus: 'reformer', ownedApparatus: ['reformer'], availableEquipment: ['reformer'],
    };
    const pending: AutoGenerateCriteria = {
      ...criteria, apparatus: 'cadillac', ownedApparatus: ['cadillac'], availableEquipment: ['tower'],
      preferredProps: ['mini-ball'], planningGoals: ['mobility'], targetMinutes: 70,
    };
    usePilatesStore.setState({
      exercises: [...usePilatesStore.getState().exercises, warmup],
      activeApparatus: 'reformer',
      activeSteps: [{ ...steps[0], exerciseId: warmup.id, blockCategory: warmup.blockCategory }],
      lastCriteria: applied,
      draftCriteria: pending,
    });
    const before = usePilatesStore.getState();
    const changes = vi.fn();
    const unsubscribe = usePilatesStore.subscribe(changes);
    const effective = getActiveSequencePlanningCriteria(before);
    unsubscribe();
    expect(effective).toMatchObject({
      apparatus: 'reformer', availableEquipment: ['reformer'], preferredProps: ['none'], targetMinutes: 50,
    });
    expect(effective.planningGoals).toBeUndefined();
    expect(changes).not.toHaveBeenCalled();
    expect(usePilatesStore.getState()).toBe(before);
    effective.availableEquipment!.push('mat');
    effective.preferredProps.push('mini-ball');
    expect(before.lastCriteria?.availableEquipment).toEqual(['reformer']);
    expect(before.lastCriteria?.preferredProps).toEqual(['none']);
    expect(before.lastCriteria).toEqual(applied);
    expect(before.draftCriteria).toEqual(pending);

    expect(before.updateSequencePlanningConditions({ targetMinutes: 45 }).success).toBe(true);
    const next = usePilatesStore.getState();
    expect(next.lastCriteria).toMatchObject({
      apparatus: 'reformer', availableEquipment: ['reformer'], preferredProps: ['none'], targetMinutes: 45,
    });
    expect(next.lastCriteria?.planningGoals).toBeUndefined();
    expect(next.draftCriteria).toEqual(next.lastCriteria);
    expect(next.activeSteps).toBe(before.activeSteps);
    expect(next.savedSequences).toBe(before.savedSequences);
    expect(next.insertExerciseIntoSequence(reformer.id, { kind: 'end' }).success).toBe(true);
    expect(usePilatesStore.getState().activeSteps.map((step) => step.exerciseId)).toEqual([warmup.id, reformer.id]);
  });

  it('undoes a condition change in one step and leaves an identical application as a no-op', () => {
    const before = usePilatesStore.getState();
    const snapshot = createSequenceSnapshot(before);
    expect(before.updateSequencePlanningConditions({ apparatus: 'reformer', targetMinutes: 45 }).success).toBe(true);
    const applied = usePilatesStore.getState();
    expect(applied.updateSequencePlanningConditions({ apparatus: 'reformer', targetMinutes: 45 }).success).toBe(true);
    expect(usePilatesStore.getState()).toBe(applied);
    expect(applied.undoStack).toHaveLength(1);
    applied.undoSequence();
    expect(createSequenceSnapshot(usePilatesStore.getState())).toEqual(snapshot);
  });

  it('keeps exact owned equipment variants when only the apparatus family changes', () => {
    expect(usePilatesStore.getState().startBlankSequence({ apparatus: 'cadillac' }).success).toBe(true);
    const state = usePilatesStore.getState();
    expect(state.draftCriteria?.availableEquipment).toEqual(['tower']);
    expect(state.ownedEquipment).toEqual(['mat', 'reformer', 'tower', 'ladder-barrel']);
    expect(state.insertExerciseIntoSequence(cadillac.id, { kind: 'end' }).success).toBe(false);
    expect(state.insertExerciseIntoSequence(tower.id, { kind: 'end' }).success).toBe(true);

    expect(state.updateSequencePlanningConditions({ apparatus: 'mixed' }).success).toBe(true);
    expect(usePilatesStore.getState().draftCriteria?.availableEquipment).toEqual(state.ownedEquipment);
    expect(usePilatesStore.getState().ownedEquipment).toBe(state.ownedEquipment);
  });

  it('rejects unavailable or mismatched equipment and infeasible rest targets without losing the current draft', () => {
    const before = usePilatesStore.getState();
    const snapshot = createSequenceSnapshot(before);
    expect(before.startBlankSequence({ apparatus: 'chair' }).success).toBe(false);
    expect(createSequenceSnapshot(usePilatesStore.getState())).toEqual(snapshot);
    expect(before.updateSequencePlanningConditions({ apparatus: 'reformer', availableEquipment: ['mat'] }).success).toBe(false);
    expect(createSequenceSnapshot(usePilatesStore.getState())).toEqual(snapshot);
    expect(before.updateSequencePlanningConditions({ apparatus: 'cadillac', availableEquipment: ['cadillac'] }).success).toBe(false);
    expect(createSequenceSnapshot(usePilatesStore.getState())).toEqual(snapshot);
    expect(usePilatesStore.getState().undoStack).toEqual([]);

    const rest: SequenceStep = { kind: 'rest', stepId: 'long-rest', order: 2, exerciseId: '', blockCategory: 'core', selectedLayer: 'standard', durationMin: 15 };
    usePilatesStore.setState({ activeSteps: [...structuredClone(steps), rest] });
    const restSnapshot = createSequenceSnapshot(usePilatesStore.getState());
    expect(usePilatesStore.getState().updateSequencePlanningConditions({ targetMinutes: 10 }).success).toBe(false);
    expect(createSequenceSnapshot(usePilatesStore.getState())).toEqual(restSnapshot);
  });

  it('preserves current metadata and applied extras instead of an unapplied advanced draft when opening a blank class', () => {
    usePilatesStore.setState({
      activeApparatus: 'reformer', activeLevel: '1.5', activeTargetMinutes: 45,
      lastCriteria: { ...criteria, preferredProps: ['mini-ball'], planningGoals: ['mobility'] },
      draftCriteria: { ...criteria, apparatus: 'cadillac', availableEquipment: ['tower'], preferredProps: ['none'] },
    });
    const props = ['mini-ball'] as const;
    expect(usePilatesStore.getState().startBlankSequence().success).toBe(true);
    const next = usePilatesStore.getState();
    expect(next.draftCriteria).toMatchObject({
      apparatus: 'reformer', availableEquipment: ['reformer'], level: '1.5', targetMinutes: 45,
      preferredProps: [...props], planningGoals: ['mobility'],
    });
    expect(next.lastCriteria).toEqual(next.draftCriteria);
    expect(next.activeSteps).toEqual([]);
  });
});
