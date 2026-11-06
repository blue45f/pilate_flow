import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cloudBackupDataSchema, stepBlockOptionsSchema } from '../schemas/cloudBackupSchema';
import { usePilatesStore } from '../store/usePilatesStore';
import type { StepBlockOptions } from '../store/usePilatesStore';
import type { SequenceStep } from '../types/pilates';
import { isExerciseAutoEligible } from '../utils/exerciseReview';
import { getStepTiming } from '../utils/sequenceEngine';
import { syntheticPlanningExercise } from './planningFixtures';

const original = usePilatesStore.getState();
const exercise = syntheticPlanningExercise('mat', 'core', 'alpha', false);
const step: SequenceStep = {
  stepId: 'qa-layer-step',
  order: 1,
  exerciseId: exercise.id,
  blockCategory: 'core',
  durationMin: 5,
  explanationSec: 20,
  transitionSec: 10,
  selectedLayer: 'standard',
  repetitions: 6,
  sets: 1,
  sideMode: 'together',
  instructorNote: 'QA 이전 수업 메모',
};
const rest: SequenceStep = {
  stepId: 'qa-layer-rest',
  order: 2,
  kind: 'rest',
  exerciseId: '',
  blockCategory: 'core',
  durationMin: 2,
  selectedLayer: 'standard',
};
beforeEach(() =>
  usePilatesStore.setState({
    ...original,
    activeSteps: [step, rest],
    exercises: [structuredClone(exercise)],
    undoStack: [],
    savedSequences: [],
    historyLogs: [],
    activeLevel: '1.0',
    activeTargetMinutes: 50,
    generationError: null,
  }),
);
afterEach(() => usePilatesStore.setState(original, true));

describe('atomic block authored-layer selection', () => {
  it('applies layer with timing/count/side/notes in one edit and restores the whole previous block with one Undo', () => {
    const before = usePilatesStore.getState();
    const patch: StepBlockOptions = {
      selectedLayer: 'easy',
      durationMin: 4,
      explanationSec: 25,
      transitionSec: 15,
      repetitions: 8,
      sets: 2,
      sideMode: 'right-then-left',
      customSpringOverride: '  QA 수업 기구 설정  ',
      instructorNote: 'QA 함께 저장한 메모',
    };
    expect(before.setStepBlockOptions(0, patch).success).toBe(true);
    const after = usePilatesStore.getState();
    expect(after.activeSteps[0]).toEqual({
      ...step,
      ...patch,
      customSpringOverride: 'QA 수업 기구 설정',
    });
    expect(after.activeSteps[1]).toBe(rest);
    expect(after.undoStack).toHaveLength(1);
    for (const key of [
      'exercises',
      'classGroups',
      'savedSequences',
      'historyLogs',
      'ownedEquipment',
      'ownedProps',
      'draftCriteria',
      'lastCriteria',
      'activeLevel',
      'activeTargetMinutes',
    ] as const)
      expect(after[key]).toBe(before[key]);
    expect(after.exercises.filter(isExerciseAutoEligible)).toHaveLength(0);
    expect(after.exercises[0].layers).toEqual(exercise.layers);
    after.undoSequence();
    expect(usePilatesStore.getState().activeSteps).toEqual([step, rest]);
    expect(usePilatesStore.getState().undoStack).toHaveLength(0);
  });

  it('preserves omitted layer, changes only an explicitly selected authored layer, and keeps duration independent', () => {
    const oldTiming = getStepTiming(step, exercise);
    expect(
      usePilatesStore.getState().setStepBlockOptions(0, { selectedLayer: 'hard' }).success,
    ).toBe(true);
    expect(usePilatesStore.getState().activeSteps[0].selectedLayer).toBe('hard');
    expect(getStepTiming(usePilatesStore.getState().activeSteps[0], exercise)).toEqual(oldTiming);
    expect(
      usePilatesStore.getState().setStepBlockOptions(0, { instructorNote: 'QA 메모만 수정' })
        .success,
    ).toBe(true);
    expect(usePilatesStore.getState().activeSteps[0].selectedLayer).toBe('hard');
    const backup = JSON.parse(usePilatesStore.getState().exportBackup());
    expect(cloudBackupDataSchema.parse(backup.data).activeDraft?.steps[0].selectedLayer).toBe(
      'hard',
    );
    expect(usePilatesStore.getState().activeLevel).toBe('1.0');
    expect(usePilatesStore.getState().exercises.filter(isExerciseAutoEligible)).toHaveLength(0);
  });

  it('rejects invalid or explicitly cleared layers together with otherwise-valid counts/time without any partial edit or Undo', () => {
    for (const selectedLayer of [undefined, null, '', 'easier', 'left', 1, false, {}, []]) {
      const before = usePilatesStore.getState();
      const patch = {
        selectedLayer,
        repetitions: 8,
        sets: 2,
        durationMin: 4,
        instructorNote: 'QA 유효한 메모',
      };
      expect(stepBlockOptionsSchema.safeParse(patch).success).toBe(false);
      expect(before.setStepBlockOptions(0, patch as StepBlockOptions).success).toBe(false);
      expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
      expect(usePilatesStore.getState().undoStack).toBe(before.undoStack);
      expect(usePilatesStore.getState().exercises).toBe(before.exercises);
    }
    const before = usePilatesStore.getState();
    expect(
      before.setStepBlockOptions(0, {
        selectedLayer: 'easy',
        durationMin: 0.5,
        explanationSec: 20,
        transitionSec: 11,
      }).success,
    ).toBe(false);
    expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
    expect(usePilatesStore.getState().undoStack).toBe(before.undoStack);
  });

  it('retains locked/rest/missing-index guards for layer patches', () => {
    usePilatesStore.setState({
      activeSteps: [step, rest, { ...step, stepId: 'qa-locked', order: 3, locked: true }],
    });
    for (const index of [1, 2, -1, 0.5, NaN, 99]) {
      const before = usePilatesStore.getState();
      expect(
        before.setStepBlockOptions(index, { selectedLayer: 'easy', repetitions: 8 }).success,
      ).toBe(false);
      expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
      expect(usePilatesStore.getState().undoStack).toBe(before.undoStack);
    }
  });

  it('does not invent a layer when the exercise is missing or its selected authored description is empty', () => {
    for (const exercises of [[], [{ ...exercise, layers: { ...exercise.layers, hard: '   ' } }]]) {
      usePilatesStore.setState({ exercises });
      const before = usePilatesStore.getState();
      const result = before.setStepBlockOptions(0, {
        selectedLayer: 'hard',
        repetitions: 8,
        instructorNote: 'QA 보류',
      });
      expect(result.success).toBe(false);
      expect(result.message).toContain('작성된 설명');
      expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
      expect(usePilatesStore.getState().undoStack).toBe(before.undoStack);
      expect(usePilatesStore.getState().exercises).toBe(before.exercises);
    }
  });
});
