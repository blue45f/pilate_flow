import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { usePilatesStore } from '../store/usePilatesStore';
import type { AutoGenerateCriteria, SequenceStep } from '../types/pilates';
import { SYNTHETIC_APPROVED_EXERCISES, syntheticPlanningExercise } from './planningFixtures';

const original = usePilatesStore.getState();
const criteria: AutoGenerateCriteria = {
  apparatus: 'mat',
  ownedApparatus: ['mat'],
  availableEquipment: ['mat'],
  preferredProps: ['none'],
  level: '1.0',
  targetMinutes: 50,
  focusPreset: 'full-body',
  defaultLayer: 'standard',
  excludeDaysWindow: 0,
};
beforeEach(() => {
  localStorage.clear();
  usePilatesStore.setState(
    {
      ...original,
      activeSteps: [],
      savedSequences: [],
      undoStack: [],
      activeApparatus: 'mat',
      activeLevel: '1.0',
      activeTargetMinutes: 50,
      ownedEquipment: ['mat'],
      ownedProps: [],
      draftCriteria: criteria,
      lastCriteria: null,
      generationError: null,
    },
    true,
  );
});
afterEach(() => {
  usePilatesStore.setState(original, true);
  localStorage.clear();
});

describe('authoring without synthetic review approval', () => {
  it.each(['pending', 'stale'] as const)(
    'adds, saves and undoes a %s exercise without changing its review',
    (status) => {
      const base = syntheticPlanningExercise('mat', 'warmup', 'alpha', status === 'stale');
      const exercise = status === 'stale' ? { ...base, cues: [...base.cues, 'Edited cue'] } : base;
      const before = structuredClone(exercise);
      usePilatesStore.setState({ exercises: [exercise] });
      usePilatesStore.getState().appendExerciseToSequence(exercise.id);
      expect(usePilatesStore.getState().generationError).toBeNull();
      expect(usePilatesStore.getState().activeSteps).toHaveLength(1);
      const id = usePilatesStore.getState().saveCurrentSequenceToBinder(true);
      expect(
        usePilatesStore.getState().savedSequences.find((item) => item.id === id)?.steps[0]
          .exerciseId,
      ).toBe(exercise.id);
      usePilatesStore.getState().undoSequence();
      expect(usePilatesStore.getState().activeSteps).toEqual([]);
      expect(usePilatesStore.getState().exercises).toEqual([before]);
    },
  );

  it('automatically composes pending local records without manufacturing approval', () => {
    const exercises = SYNTHETIC_APPROVED_EXERCISES.map(
      ({ review: _review, ...exercise }) => exercise,
    );
    const before = structuredClone(exercises);
    usePilatesStore.setState({ exercises });
    usePilatesStore.getState().autoGenerateSequence(criteria);
    const state = usePilatesStore.getState();
    expect(state.generationError).toBeNull();
    expect(state.activeSteps.length).toBeGreaterThan(0);
    expect(state.activeSteps.reduce((sum, step) => sum + step.durationMin, 0)).toBeCloseTo(50);
    expect(state.exercises).toEqual(before);
    expect(state.exercises.every((exercise) => !exercise.review)).toBe(true);
  });
});

const steps: SequenceStep[] = ['a', 'b', 'c', 'd'].map((id, index) => ({
  stepId: id,
  order: index + 1,
  exerciseId: `fixture-${id}`,
  blockCategory: 'core',
  durationMin: index + 2,
  selectedLayer: 'standard',
  instructorNote: `Keep ${id}`,
}));
describe('stable-ID reordering', () => {
  beforeEach(() => usePilatesStore.setState({ activeSteps: structuredClone(steps) }));
  it('moves in both directions with one undo entry per move and preserves step metadata', () => {
    expect(usePilatesStore.getState().reorderStep('a', 'c')).toBe(true);
    expect(usePilatesStore.getState().activeSteps).toEqual(
      [steps[1], steps[2], steps[0], steps[3]].map((step, index) => ({
        ...step,
        order: index + 1,
      })),
    );
    expect(usePilatesStore.getState().undoStack).toHaveLength(1);
    usePilatesStore.getState().undoSequence();
    expect(usePilatesStore.getState().activeSteps).toEqual(steps);
    expect(usePilatesStore.getState().reorderStep('d', 'b')).toBe(true);
    expect(usePilatesStore.getState().activeSteps.map((step) => step.stepId)).toEqual([
      'a',
      'd',
      'b',
      'c',
    ]);
    expect(usePilatesStore.getState().undoStack).toHaveLength(1);
  });
  it.each([
    ['missing', 'b'],
    ['a', 'missing'],
    ['a', 'a'],
  ])('rejects %s to %s without editing or an undo entry', (source, target) => {
    const before = usePilatesStore.getState();
    expect(before.reorderStep(source, target)).toBe(false);
    expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
    expect(usePilatesStore.getState().undoStack).toBe(before.undoStack);
  });
  it.each([
    ['a', 'd'],
    ['d', 'a'],
    ['b', 'c'],
    ['a', 'b'],
  ])('preserves locked barriers for %s to %s', (source, target) => {
    usePilatesStore.setState({
      activeSteps: steps.map((step) => ({ ...step, locked: step.stepId === 'b' })),
    });
    const before = usePilatesStore.getState();
    expect(before.reorderStep(source, target)).toBe(false);
    expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
    expect(usePilatesStore.getState().undoStack).toHaveLength(0);
  });
  it('allows removing the last unlocked step and undo restores it', () => {
    usePilatesStore.setState({ activeSteps: [steps[0]] });
    usePilatesStore.getState().removeStep(0);
    expect(usePilatesStore.getState().activeSteps).toEqual([]);
    usePilatesStore.getState().undoSequence();
    expect(usePilatesStore.getState().activeSteps).toEqual([steps[0]]);
  });
});
