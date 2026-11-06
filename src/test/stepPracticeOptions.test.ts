import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  cloudBackupDataSchema,
  historySchema,
  sequenceSchema,
  stepSchema,
} from '../schemas/cloudBackupSchema';
import { usePilatesStore } from '../store/usePilatesStore';
import type {
  AutoGenerateCriteria,
  ClassHistoryLog,
  SequenceStep,
  StepPracticeOptions,
  StepSideMode,
} from '../types/pilates';
import { SYNTHETIC_APPROVED_EXERCISES } from './planningFixtures';
import {
  fitSequenceDuration,
  formatSequenceAsStudioSheet,
  generateOptimal50MinSequence,
  getStepSideLabels,
  getStepTiming,
  regenerateSequence,
  swapDuplicateStepsWithFresh,
} from '../utils/sequenceEngine';

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
const step = (index = 0): SequenceStep => ({
  stepId: `practice-${index}`,
  order: index + 1,
  exerciseId: fixtures[index].id,
  blockCategory: fixtures[index].blockCategory,
  durationMin: 5,
  explanationSec: 20,
  transitionSec: 10,
  selectedLayer: 'standard',
});
const rest: SequenceStep = {
  kind: 'rest',
  stepId: 'rest',
  order: 3,
  exerciseId: '',
  blockCategory: 'core',
  durationMin: 2,
  selectedLayer: 'standard',
};

describe('step repetitions and anatomical side semantics', () => {
  it('accepts legacy steps and bounds count without adding a default count or side', () => {
    const legacy = step();
    expect(stepSchema.parse(legacy)).toEqual(legacy);
    for (const repetitions of [1, 1000])
      expect(stepSchema.safeParse({ ...legacy, repetitions }).success).toBe(true);
    for (const repetitions of [0, -1, 1.5, 1001, NaN, Infinity, '8', null])
      expect(stepSchema.safeParse({ ...legacy, repetitions }).success).toBe(false);
    expect(stepSchema.safeParse({ ...legacy, sideMode: 'mirror-left' }).success).toBe(false);
    expect(stepSchema.safeParse({ ...rest, repetitions: 8 }).success).toBe(false);
    expect(stepSchema.safeParse({ ...rest, sideMode: 'together' }).success).toBe(false);
    expect(stepSchema.safeParse(rest).success).toBe(true);
  });

  it.each<[StepSideMode, 1 | 2, string[]]>([
    ['together', 1, ['양쪽 함께']],
    ['left', 1, ['왼쪽']],
    ['right', 1, ['오른쪽']],
    ['left-then-right', 2, ['왼쪽', '오른쪽']],
    ['right-then-left', 2, ['오른쪽', '왼쪽']],
  ])('honors %s independently of catalog defaults and count', (sideMode, sides, labels) => {
    for (const isUnilateral of [true, false]) {
      const exercise = { ...fixtures[0], isUnilateral };
      const value = { ...step(), sideMode, repetitions: 999 };
      const timing = getStepTiming(value, exercise);
      expect(timing).toEqual({
        totalSec: 300,
        movementSec: 270,
        perSideSec: 270 / sides,
        sides,
        explanationSec: 20,
        transitionSec: 10,
      });
      expect(getStepSideLabels(value, exercise)).toEqual(labels);
      expect(getStepTiming({ ...value, repetitions: 1 }, exercise)).toEqual(timing);
    }
  });

  it('keeps legacy unilateral order unknown and rests free of movement sides', () => {
    expect(getStepTiming(step(), { ...fixtures[0], isUnilateral: true }).sides).toBe(2);
    expect(getStepSideLabels(step(), { ...fixtures[0], isUnilateral: true })).toEqual([
      '첫 번째 쪽',
      '반대쪽',
    ]);
    expect(getStepTiming(step(), { ...fixtures[0], isUnilateral: false }).sides).toBe(1);
    expect(getStepSideLabels(step(), { ...fixtures[0], isUnilateral: false })).toEqual(['함께']);
    expect(getStepSideLabels(rest, { ...fixtures[0], isUnilateral: true })).toEqual([]);
    expect(() => fitSequenceDuration([step(), { ...rest, repetitions: 3 }], 50)).toThrow();
  });

  it('exports explicit anatomical order and counts without a false both-sides tag on a single side', () => {
    const exercise = { ...fixtures[0], isUnilateral: true };
    const map = new Map([[exercise.id, exercise]]);
    const sheet = formatSequenceAsStudioSheet(
      'QA',
      '',
      [{ ...step(), repetitions: 8, sideMode: 'left' }],
      map,
      'balanced-body',
    );
    expect(sheet).toContain('[왼쪽]');
    expect(sheet).toContain('횟수: 8회 (강사 입력)');
    expect(sheet).not.toContain('양쪽 포함');
    expect(
      formatSequenceAsStudioSheet(
        'QA',
        '',
        [{ ...step(), sideMode: 'right-then-left' }],
        map,
        'balanced-body',
      ),
    ).toContain('[오른쪽 → 왼쪽]');
  });

  it('preserves options through fitting and locked regeneration while clearing regenerated options', () => {
    const generated = generateOptimal50MinSequence(criteria, fixtures, []);
    const locked = {
      ...generated[0],
      locked: true,
      repetitions: 8,
      sideMode: 'right-then-left' as const,
    };
    const unlocked = { ...generated[1], repetitions: 12, sideMode: 'left' as const };
    const values = [locked, unlocked, ...generated.slice(2)];
    expect(fitSequenceDuration(values, 51)[0]).toBe(locked);
    expect(fitSequenceDuration(values, 51)[1]).toMatchObject({ repetitions: 12, sideMode: 'left' });
    const regenerated = regenerateSequence(criteria, fixtures, [], values);
    expect(regenerated[0]).toBe(locked);
    expect(regenerated[1].repetitions).toBeUndefined();
    expect(regenerated[1].sideMode).toBeUndefined();
  });

  it('keeps locked options and clears the options when freshness changes the movement', () => {
    const locked = { ...step(0), locked: true, repetitions: 8, sideMode: 'left' as const };
    const unlocked = { ...step(2), repetitions: 10, sideMode: 'right' as const };
    const log: ClassHistoryLog = {
      id: 'qa-log',
      sequenceId: 'qa',
      sequenceTitle: 'QA',
      groupId: 'qa-group',
      groupName: 'QA',
      taughtAt: new Date().toISOString(),
      apparatus: 'mat',
      level: '1.0',
      exerciseIds: [locked.exerciseId, unlocked.exerciseId],
      rating: 4,
      intensity: 'moderate',
      instructorReflection: '',
    };
    const changed = swapDuplicateStepsWithFresh([locked, unlocked], fixtures, [log]);
    expect(changed[0]).toBe(locked);
    expect(changed[1].exerciseId).not.toBe(unlocked.exerciseId);
    expect(changed[1].repetitions).toBeUndefined();
    expect(changed[1].sideMode).toBeUndefined();
  });
});

const original = usePilatesStore.getState();
describe('atomic practice options and v3 preservation', () => {
  beforeEach(() => {
    localStorage.clear();
    usePilatesStore.setState(
      {
        ...original,
        activeSteps: [step(0), step(2), rest],
        exercises: fixtures,
        activeApparatus: 'mat',
        activeLevel: '1.0',
        activeTargetMinutes: 50,
        ownedEquipment: ['mat'],
        ownedApparatus: ['mat'],
        ownedProps: [],
        lastCriteria: null,
        draftCriteria: criteria,
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
        undoStack: [],
        generationError: null,
      },
      true,
    );
  });
  afterEach(() => {
    usePilatesStore.setState(original, true);
    localStorage.clear();
  });

  it('updates specified keys, clears explicit undefined, preserves time and catalog records, and supports undo', () => {
    const catalog = usePilatesStore.getState().exercises;
    expect(
      usePilatesStore
        .getState()
        .setStepPracticeOptions(0, { repetitions: 8, sideMode: 'right-then-left' }).success,
    ).toBe(true);
    expect(usePilatesStore.getState().activeSteps[0]).toMatchObject({
      repetitions: 8,
      sideMode: 'right-then-left',
      durationMin: 5,
    });
    usePilatesStore.getState().setStepPracticeOptions(0, { repetitions: 10 });
    expect(usePilatesStore.getState().activeSteps[0].sideMode).toBe('right-then-left');
    usePilatesStore.getState().setStepPracticeOptions(0, { repetitions: undefined });
    expect(usePilatesStore.getState().activeSteps[0]).not.toHaveProperty('repetitions');
    expect(usePilatesStore.getState().activeSteps[0].sideMode).toBe('right-then-left');
    usePilatesStore.getState().setStepPracticeOptions(0, { sideMode: undefined });
    expect(usePilatesStore.getState().activeSteps[0]).not.toHaveProperty('sideMode');
    usePilatesStore.getState().undoSequence();
    expect(usePilatesStore.getState().activeSteps[0].sideMode).toBe('right-then-left');
    expect(usePilatesStore.getState().exercises).toBe(catalog);
  });

  it('rejects malformed patches, rests, locked and invalid indices without changing steps or undo', () => {
    usePilatesStore.getState().toggleStepLock(1);
    const before = usePilatesStore.getState().activeSteps;
    const undo = usePilatesStore.getState().undoStack;
    const requests: [number, unknown][] = [
      [0, { repetitions: 0 }],
      [0, { repetitions: 1.5 }],
      [0, { repetitions: 1001 }],
      [0, { sideMode: 'mirror-left' }],
      [0, { durationMin: 5 }],
      [0, null],
      [1, { repetitions: 8 }],
      [2, { sideMode: 'left' }],
      [-1, {}],
      [0.5, {}],
      [NaN, {}],
    ];
    for (const [index, patch] of requests) {
      expect(
        usePilatesStore.getState().setStepPracticeOptions(index, patch as StepPracticeOptions)
          .success,
      ).toBe(false);
      expect(usePilatesStore.getState().activeSteps).toBe(before);
      expect(usePilatesStore.getState().undoStack).toBe(undo);
    }
  });

  it('preserves options across moving, cloning and locking, and clears them on a different exercise replacement', () => {
    usePilatesStore.getState().setStepPracticeOptions(0, { repetitions: 8, sideMode: 'left' });
    usePilatesStore.getState().moveStep(0, 'down');
    expect(usePilatesStore.getState().activeSteps[1]).toMatchObject({
      repetitions: 8,
      sideMode: 'left',
    });
    usePilatesStore.getState().toggleStepLock(1);
    expect(usePilatesStore.getState().activeSteps[1]).toMatchObject({
      repetitions: 8,
      sideMode: 'left',
      locked: true,
    });
    usePilatesStore.getState().toggleStepLock(1);
    const sameId = usePilatesStore.getState().activeSteps[1].exerciseId;
    usePilatesStore.getState().replaceStepExercise(1, sameId);
    expect(usePilatesStore.getState().activeSteps[1].repetitions).toBe(8);
    usePilatesStore.getState().replaceStepExercise(1, fixtures[1].id);
    expect(usePilatesStore.getState().activeSteps[1]).toMatchObject({
      exerciseId: fixtures[1].id,
      repetitions: undefined,
      sideMode: undefined,
    });
    usePilatesStore.getState().setStepPracticeOptions(1, { repetitions: 6, sideMode: 'right' });
    const savedId = usePilatesStore.getState().saveCurrentSequenceToBinder(true);
    const copyId = usePilatesStore.getState().duplicateSavedSequence(savedId);
    expect(
      usePilatesStore.getState().savedSequences.find((value) => value.id === copyId)?.steps[1],
    ).toMatchObject({ repetitions: 6, sideMode: 'right' });
  });

  it('retains options in local rehydration, saved/history replay, and complete JSON recovery', async () => {
    usePilatesStore
      .getState()
      .setStepPracticeOptions(0, { repetitions: 8, sideMode: 'left-then-right' });
    const savedId = usePilatesStore.getState().saveCurrentSequenceToBinder(true);
    const steps = usePilatesStore.getState().activeSteps;
    usePilatesStore
      .getState()
      .logClassSession({
        sequenceId: savedId,
        groupId: 'qa-group',
        taughtAt: '2026-11-04T10:00:00.000Z',
        rating: 4,
        intensity: 'moderate',
        instructorReflection: 'QA 기록',
        stepsSnapshot: steps,
      });
    const saved = usePilatesStore.getState().savedSequences[0],
      log = usePilatesStore.getState().historyLogs[0];
    expect(sequenceSchema.parse(saved).steps[0]).toMatchObject({
      repetitions: 8,
      sideMode: 'left-then-right',
    });
    expect(historySchema.parse(log).stepsSnapshot?.[0]).toMatchObject({
      repetitions: 8,
      sideMode: 'left-then-right',
    });
    usePilatesStore.getState().updateStepNote(0, 'QA 아직 저장하지 않은 초안 메모');
    const raw = usePilatesStore.getState().exportBackup();
    expect(cloudBackupDataSchema.parse(JSON.parse(raw).data).activeDraft?.steps[0]).toMatchObject({
      repetitions: 8,
      sideMode: 'left-then-right',
    });
    const persisted = localStorage.getItem('pilates-flow-atelier-storage-v3')!;
    usePilatesStore.setState({ activeSteps: [], savedSequences: [], historyLogs: [] });
    localStorage.setItem('pilates-flow-atelier-storage-v3', persisted);
    await usePilatesStore.persist.rehydrate();
    expect(usePilatesStore.getState().activeSteps[0]).toMatchObject({
      repetitions: 8,
      sideMode: 'left-then-right',
    });
    usePilatesStore.getState().loadHistoryIntoWorkbench(log.id);
    expect(usePilatesStore.getState().activeSteps[0]).toMatchObject({
      repetitions: 8,
      sideMode: 'left-then-right',
    });
    usePilatesStore.setState({ activeSteps: [], savedSequences: [], historyLogs: [] });
    expect(usePilatesStore.getState().restoreBackup(raw).success).toBe(true);
    usePilatesStore.getState().loadSequenceIntoWorkbench(savedId);
    expect(usePilatesStore.getState().activeSteps[0]).toMatchObject({
      repetitions: 8,
      sideMode: 'left-then-right',
    });
  });
});
