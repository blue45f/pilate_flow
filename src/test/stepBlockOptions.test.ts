import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cloudBackupDataSchema, stepSchema } from '../schemas/cloudBackupSchema';
import { usePilatesStore } from '../store/usePilatesStore';
import type { StepBlockOptions } from '../store/usePilatesStore';
import type { AutoGenerateCriteria, ClassHistoryLog, SequenceStep } from '../types/pilates';
import {
  formatSequenceAsStudioSheet,
  generateOptimal50MinSequence,
  getStepTiming,
  regenerateSequence,
} from '../utils/sequenceEngine';
import { SYNTHETIC_APPROVED_EXERCISES } from './planningFixtures';

const original = usePilatesStore.getState();
const fixtures = SYNTHETIC_APPROVED_EXERCISES.filter((exercise) => exercise.apparatus === 'mat');
const criteria: AutoGenerateCriteria = {
  apparatus: 'mat',
  availableEquipment: ['mat'],
  ownedApparatus: ['mat'],
  level: '1.0',
  focusPreset: 'full-body',
  preferredProps: [],
  excludeDaysWindow: 0,
  targetMinutes: 50,
  defaultLayer: 'standard',
};
const base: SequenceStep = {
  stepId: 'block-qa',
  order: 1,
  exerciseId: fixtures[0].id,
  blockCategory: fixtures[0].blockCategory,
  durationMin: 5,
  explanationSec: 20,
  transitionSec: 10,
  selectedLayer: 'standard',
  instructorNote: 'QA 이전 메모',
};
const rest: SequenceStep = {
  kind: 'rest',
  stepId: 'block-rest',
  order: 2,
  exerciseId: '',
  blockCategory: 'core',
  durationMin: 2,
  selectedLayer: 'standard',
};
beforeEach(() => {
  localStorage.clear();
  usePilatesStore.setState(
    {
      ...original,
      activeSteps: [base, rest],
      exercises: fixtures,
      activeApparatus: 'mat',
      activeLevel: '1.0',
      activeTargetMinutes: 50,
      draftCriteria: criteria,
      lastCriteria: null,
      ownedEquipment: ['mat'],
      ownedApparatus: ['mat'],
      ownedProps: [],
      undoStack: [],
      generationError: null,
      savedSequences: [],
      historyLogs: [],
      classGroups: [
        {
          id: 'qa-group',
          name: 'QA 별칭',
          type: 'group',
          defaultLevel: '1.0',
          scheduleLabel: '',
          notes: '',
        },
      ],
    },
    true,
  );
});
afterEach(() => {
  usePilatesStore.setState(original, true);
  localStorage.clear();
});

describe('one-apply block settings and optional sets', () => {
  it('bounds optional sets, rejects sets on rest, and never infers a duration from counts or sets', () => {
    expect(stepSchema.parse(base)).not.toHaveProperty('sets');
    for (const sets of [1, 100]) expect(stepSchema.safeParse({ ...base, sets }).success).toBe(true);
    for (const sets of [0, -1, 1.5, 101, NaN, Infinity, '2', null])
      expect(stepSchema.safeParse({ ...base, sets }).success).toBe(false);
    expect(stepSchema.safeParse({ ...rest, sets: 2 }).success).toBe(false);
    expect(getStepTiming({ ...base, repetitions: 999, sets: 99 }, fixtures[0])).toEqual(
      getStepTiming(base, fixtures[0]),
    );
    const text = formatSequenceAsStudioSheet(
      'QA',
      '',
      [{ ...base, repetitions: 8, sets: 2 }],
      new Map([[fixtures[0].id, fixtures[0]]]),
      'balanced-body',
    );
    expect(text).toContain('횟수: 8회 · 세트: 2세트 (강사 입력)');
  });

  it('commits time, spring note, counts, sets, sides and instructor note as exactly one undoable edit', () => {
    const catalog = usePilatesStore.getState().exercises;
    const patch: StepBlockOptions = {
      durationMin: 4,
      explanationSec: 25,
      transitionSec: 15,
      customSpringOverride: '  QA 이번 수업 설정  ',
      repetitions: 8,
      sets: 2,
      sideMode: 'right-then-left',
      instructorNote: 'QA 새로운 강사 메모',
    };
    expect(usePilatesStore.getState().setStepBlockOptions(0, patch).success).toBe(true);
    expect(usePilatesStore.getState().activeSteps[0]).toEqual({
      ...base,
      ...patch,
      customSpringOverride: 'QA 이번 수업 설정',
    });
    expect(usePilatesStore.getState().undoStack).toHaveLength(1);
    expect(usePilatesStore.getState().exercises).toBe(catalog);
    expect(usePilatesStore.getState().activeSteps[1]).toBe(rest);
    usePilatesStore.getState().undoSequence();
    expect(usePilatesStore.getState().activeSteps[0]).toEqual(base);
    expect(usePilatesStore.getState().undoStack).toHaveLength(0);
  });

  it('leaves every field and undo untouched when valid counts accompany an invalid timing or note patch', () => {
    const before = usePilatesStore.getState().activeSteps;
    const undo = usePilatesStore.getState().undoStack;
    for (const patch of [
      {
        repetitions: 8,
        sets: 2,
        sideMode: 'left',
        durationMin: 0.5,
        explanationSec: 20,
        transitionSec: 11,
      },
      { repetitions: 8, sets: 2, customSpringOverride: 'QA note', durationMin: undefined },
      { repetitions: 8, sets: 2, customSpringOverride: '기'.repeat(501) },
      { repetitions: 8, sets: 2, instructorNote: '기'.repeat(20001) },
    ]) {
      expect(
        usePilatesStore.getState().setStepBlockOptions(0, patch as StepBlockOptions).success,
      ).toBe(false);
      expect(usePilatesStore.getState().activeSteps).toBe(before);
      expect(usePilatesStore.getState().undoStack).toBe(undo);
    }
  });

  it('preserves omitted values and clears only explicitly undefined optional keys', () => {
    usePilatesStore
      .getState()
      .setStepBlockOptions(0, {
        repetitions: 8,
        sets: 2,
        sideMode: 'left',
        customSpringOverride: 'QA spring',
      });
    usePilatesStore.getState().setStepBlockOptions(0, { sets: 3 });
    expect(usePilatesStore.getState().activeSteps[0]).toMatchObject({
      repetitions: 8,
      sets: 3,
      sideMode: 'left',
      instructorNote: base.instructorNote,
      durationMin: 5,
    });
    usePilatesStore
      .getState()
      .setStepBlockOptions(0, {
        sets: undefined,
        repetitions: undefined,
        sideMode: undefined,
        instructorNote: undefined,
        customSpringOverride: undefined,
        explanationSec: undefined,
        transitionSec: undefined,
      });
    const value = usePilatesStore.getState().activeSteps[0];
    for (const key of [
      'sets',
      'repetitions',
      'sideMode',
      'instructorNote',
      'customSpringOverride',
      'explanationSec',
      'transitionSec',
    ])
      expect(value).not.toHaveProperty(key);
    expect(value.durationMin).toBe(5);
    const undo = usePilatesStore.getState().undoStack;
    expect(usePilatesStore.getState().setStepBlockOptions(0, {}).success).toBe(true);
    expect(usePilatesStore.getState().undoStack).toBe(undo);
  });

  it('rejects locked/rest/invalid-index edits and preserves the individual practice setter contract', () => {
    usePilatesStore.setState({
      activeSteps: [base, rest, { ...base, stepId: 'locked', order: 3, locked: true }],
    });
    const before = usePilatesStore.getState().activeSteps;
    const undo = usePilatesStore.getState().undoStack;
    for (const [index, patch] of [
      [1, { sets: 2 }],
      [2, { repetitions: 8, sets: 2 }],
      [-1, {}],
      [0.5, {}],
      [NaN, {}],
      [99, {}],
      [0, { sets: 0 }],
      [0, { sets: 101 }],
      [0, { sets: 2.5 }],
      [0, { locked: false }],
      [0, null],
    ] as [number, unknown][]) {
      expect(
        usePilatesStore.getState().setStepBlockOptions(index, patch as StepBlockOptions).success,
      ).toBe(false);
      expect(usePilatesStore.getState().activeSteps).toBe(before);
      expect(usePilatesStore.getState().undoStack).toBe(undo);
    }
    expect(usePilatesStore.getState().setStepPracticeOptions(0, { sets: 2 }).success).toBe(true);
    expect(usePilatesStore.getState().activeSteps[0].sets).toBe(2);
    expect(usePilatesStore.getState().setStepPracticeOptions(0, { sets: undefined }).success).toBe(
      true,
    );
    expect(usePilatesStore.getState().activeSteps[0]).not.toHaveProperty('sets');
  });

  it('keeps valid legacy timing unchanged when only practice/note fields are applied', () => {
    usePilatesStore.setState({
      activeSteps: [{ ...base, durationMin: 35, explanationSec: 1500, transitionSec: 300 }],
    });
    expect(
      usePilatesStore
        .getState()
        .setStepBlockOptions(0, { repetitions: 8, sets: 2, instructorNote: 'QA note' }).success,
    ).toBe(true);
    expect(usePilatesStore.getState().activeSteps[0]).toMatchObject({
      durationMin: 35,
      explanationSec: 1500,
      transitionSec: 300,
      sets: 2,
    });
  });

  it('retains sets through locked regeneration while clearing them with a replaced unlocked movement', () => {
    const generated = generateOptimal50MinSequence(criteria, fixtures, []);
    const locked = { ...generated[0], locked: true, repetitions: 8, sets: 2 };
    const unlocked = { ...generated[1], repetitions: 10, sets: 3 };
    const result = regenerateSequence(
      criteria,
      fixtures,
      [],
      [locked, unlocked, ...generated.slice(2)],
    );
    expect(result[0]).toBe(locked);
    expect(result[0].sets).toBe(2);
    expect(result[1].sets).toBeUndefined();
    usePilatesStore.getState().setStepBlockOptions(0, { repetitions: 8, sets: 2 });
    usePilatesStore.getState().replaceStepExercise(0, fixtures[1].id);
    expect(usePilatesStore.getState().activeSteps[0]).toMatchObject({
      exerciseId: fixtures[1].id,
      repetitions: undefined,
      sets: undefined,
    });
  });

  it('preserves sets in saved clones, history replay, local rehydration and v3 JSON recovery', async () => {
    usePilatesStore
      .getState()
      .setStepBlockOptions(0, {
        repetitions: 8,
        sets: 2,
        sideMode: 'left-then-right',
        instructorNote: 'QA 전체 옵션',
      });
    const savedId = usePilatesStore.getState().saveCurrentSequenceToBinder(true);
    const copyId = usePilatesStore.getState().duplicateSavedSequence(savedId);
    expect(
      usePilatesStore.getState().savedSequences.find((value) => value.id === copyId)?.steps[0].sets,
    ).toBe(2);
    usePilatesStore
      .getState()
      .logClassSession({
        sequenceId: savedId,
        groupId: 'qa-group',
        taughtAt: '2026-11-04T10:00:00.000Z',
        rating: 4,
        intensity: 'moderate',
        instructorReflection: 'QA 보존',
        stepsSnapshot: usePilatesStore.getState().activeSteps,
      });
    const log: ClassHistoryLog = usePilatesStore.getState().historyLogs[0];
    expect(log.stepsSnapshot?.[0].sets).toBe(2);
    const raw = usePilatesStore.getState().exportBackup();
    expect(cloudBackupDataSchema.parse(JSON.parse(raw).data).savedSequences[0].steps[0].sets).toBe(
      2,
    );
    const persisted = localStorage.getItem('pilates-flow-atelier-storage-v3')!;
    usePilatesStore.setState({ activeSteps: [], savedSequences: [], historyLogs: [] });
    localStorage.setItem('pilates-flow-atelier-storage-v3', persisted);
    await usePilatesStore.persist.rehydrate();
    expect(usePilatesStore.getState().activeSteps[0].sets).toBe(2);
    usePilatesStore.getState().loadHistoryIntoWorkbench(log.id);
    expect(usePilatesStore.getState().activeSteps[0].sets).toBe(2);
    usePilatesStore.setState({ activeSteps: [], savedSequences: [], historyLogs: [] });
    expect(usePilatesStore.getState().restoreBackup(raw).success).toBe(true);
    usePilatesStore.getState().loadSequenceIntoWorkbench(savedId);
    expect(usePilatesStore.getState().activeSteps[0].sets).toBe(2);
  });
});
