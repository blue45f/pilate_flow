import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { criteriaSchema, stepSchema } from '../schemas/cloudBackupSchema';
import { usePilatesStore } from '../store/usePilatesStore';
import type { AutoGenerateCriteria, PilatesExercise, SequenceStep } from '../types/pilates';
import { exerciseRevision } from '../utils/exerciseReview';
import {
  applyTransitionAllowances,
  fitSequenceDuration,
  generateOptimal50MinSequence,
  getSequenceDurations,
  getStepTiming,
  isRestStep,
  optimizeSequenceTransitions,
  regenerateSequence,
  swapDuplicateStepsWithFresh,
} from '../utils/sequenceEngine';

// Synthetic local reviews belong only to these fixtures; production data remains pending.
const fixtures: PilatesExercise[] = Array.from({ length: 16 }, (_, index) => {
  const record: PilatesExercise = {
    ...INITIAL_EXERCISES[0]!,
    id: `rest-fixture-${index}`,
    nameKo: `휴식 검증용 동작 ${index}`,
    nameEn: `Synthetic distinct movement ${index}`,
    movementFamily: `rest-fixture-family-${index}`,
    apparatus: 'mat',
    requiredEquipment: ['mat'],
    props: ['none'],
    level: '1.0',
    blockCategory: index === 0 ? 'warmup' : index === 1 ? 'cooldown' : 'core',
    defaultDurationMin: 4,
  };
  return {
    ...record,
    review: {
      status: 'approved',
      reviewerAlias: 'Synthetic test reviewer',
      reviewedAt: '2026-11-04T10:00:00.000Z',
      revision: exerciseRevision(record),
      scope: 'planning-metadata',
      credentialVerified: false,
    },
  };
});
const criteria: AutoGenerateCriteria = {
  apparatus: 'mat',
  availableEquipment: ['mat'],
  ownedApparatus: ['mat'],
  level: '1.0',
  focusPreset: 'full-body',
  preferredProps: [],
  excludeDaysWindow: 0,
  targetMinutes: 60,
  restMinutes: 5,
  defaultLayer: 'standard',
};
const rest = (id: string, durationMin: number): SequenceStep => ({
  kind: 'rest',
  stepId: id,
  order: 1,
  blockCategory: 'core',
  exerciseId: '',
  durationMin,
  selectedLayer: 'standard',
});

describe('rest inside total class time', () => {
  it.each([
    [50, 5],
    [60, 10],
    [50, 0.5],
  ])('keeps %s total minutes inclusive of %s rest minutes', (targetMinutes, restMinutes) => {
    const durations = getSequenceDurations(
      generateOptimal50MinSequence({ ...criteria, targetMinutes, restMinutes }, fixtures, []),
    );
    expect(durations).toEqual({
      totalSec: targetMinutes * 60,
      exerciseSec: (targetMinutes - restMinutes) * 60,
      restSec: restMinutes * 60,
    });
  });
  it('uses the 60 minute total as 55 exercise minutes plus 5 rest minutes', () => {
    const steps = generateOptimal50MinSequence(criteria, fixtures, []);
    expect(getSequenceDurations(steps)).toEqual({
      totalSec: 3600,
      exerciseSec: 3300,
      restSec: 300,
    });
    const index = steps.findIndex(isRestStep);
    expect(index).toBeGreaterThan(0);
    expect(index).toBeLessThan(steps.length - 1);
    const before = getSequenceDurations(steps.slice(0, index)).exerciseSec;
    expect(Math.abs(before - 1650)).toBeLessThanOrEqual(
      Math.max(
        ...steps.filter((step) => !isRestStep(step)).map((step) => getStepTiming(step).totalSec),
      ),
    );
  });

  it('returns one rest countdown without movement, sides, explanation or transitions', () => {
    expect(getStepTiming(rest('r', 5), { ...fixtures[0]!, isUnilateral: true })).toEqual({
      totalSec: 300,
      movementSec: 0,
      perSideSec: 0,
      sides: 1,
      explanationSec: 0,
      transitionSec: 0,
    });
  });

  it.each([-1, NaN, Infinity, 60, 61])(
    'rejects an invalid automatic rest budget %s',
    (restMinutes) => {
      expect(criteriaSchema.safeParse({ ...criteria, restMinutes }).success).toBe(false);
      expect(() =>
        generateOptimal50MinSequence({ ...criteria, restMinutes }, fixtures, []),
      ).toThrow();
    },
  );

  it('preserves legacy exercise records while rejecting fake rest exercise references', () => {
    const exercise = generateOptimal50MinSequence(
      { ...criteria, restMinutes: 0 },
      fixtures,
      [],
    )[0]!;
    expect(stepSchema.safeParse(exercise).success).toBe(true);
    expect(stepSchema.safeParse(rest('r', 5)).success).toBe(true);
    expect(stepSchema.safeParse({ ...rest('r', 5), exerciseId: fixtures[0]!.id }).success).toBe(
      false,
    );
    expect(stepSchema.safeParse({ ...exercise, exerciseId: '' }).success).toBe(false);
  });

  it('preserves multiple rest objects and a locked movement while fitting to 63 minutes', () => {
    const generated = generateOptimal50MinSequence({ ...criteria, restMinutes: 0 }, fixtures, []);
    const locked = { ...generated[0]!, locked: true };
    const a = rest('a', 3),
      b = { ...rest('b', 5), locked: true };
    const steps = [locked, ...generated.slice(1, 3), a, ...generated.slice(3), b];
    const fitted = fitSequenceDuration(steps, 63);
    expect(fitted[0]).toBe(locked);
    expect(fitted[3]).toBe(a);
    expect(fitted.at(-1)).toBe(b);
    expect(getSequenceDurations(fitted)).toEqual({
      totalSec: 3780,
      exerciseSec: 3300,
      restSec: 480,
    });
    const map = new Map(fixtures.map((exercise) => [exercise.id, exercise]));
    expect(applyTransitionAllowances(fitted, map)[3]).toBe(a);
    expect(optimizeSequenceTransitions(fitted, map)[3]).toBe(a);
  });

  it('retains all rest steps during regeneration and freshness changes', () => {
    const generated = generateOptimal50MinSequence(criteria, fixtures, []);
    const existingRest = generated.find(isRestStep)!;
    const replaced = regenerateSequence({ ...criteria, restMinutes: 0 }, fixtures, [], generated);
    expect(replaced[generated.indexOf(existingRest)]).toBe(existingRest);
    const refreshed = swapDuplicateStepsWithFresh(replaced, fixtures, [], undefined, criteria);
    expect(refreshed.find(isRestStep)).toBe(existingRest);
    expect(getSequenceDurations(replaced).totalSec).toBe(3600);
  });

  it('fails rather than stretch rest or lose the exercise budget', () => {
    expect(() => fitSequenceDuration([rest('all', 10)], 10)).toThrow(/휴식/);
    expect(() =>
      generateOptimal50MinSequence({ ...criteria, restMinutes: 59.9 }, fixtures, []),
    ).toThrow();
    expect(() => generateOptimal50MinSequence(criteria, INITIAL_EXERCISES, [])).toThrow(/승인/);
  });
});

const original = usePilatesStore.getState();
describe('manual rest and persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    usePilatesStore.setState(
      {
        ...original,
        exercises: fixtures,
        activeSteps: generateOptimal50MinSequence({ ...criteria, restMinutes: 0 }, fixtures, []),
        activeTargetMinutes: 60,
        activeApparatus: 'mat',
        activeLevel: '1.0',
        lastCriteria: null,
        draftCriteria: criteria,
        ownedEquipment: ['mat'],
        ownedApparatus: ['mat'],
        ownedProps: [],
        historyLogs: [],
        savedSequences: [],
        undoStack: [],
      },
      true,
    );
  });
  afterEach(() => {
    usePilatesStore.setState(original, true);
    localStorage.clear();
  });

  it('adds, edits, moves, locks, unlocks and removes an actual rest', () => {
    expect(usePilatesStore.getState().addRestStep(5, 0).success).toBe(true);
    expect(isRestStep(usePilatesStore.getState().activeSteps[1]!)).toBe(true);
    expect(usePilatesStore.getState().setRestDuration(1, 3).success).toBe(true);
    usePilatesStore.getState().moveStep(1, 'down');
    expect(isRestStep(usePilatesStore.getState().activeSteps[2]!)).toBe(true);
    usePilatesStore.getState().toggleStepLock(2);
    const locked = usePilatesStore.getState().activeSteps[2];
    expect(usePilatesStore.getState().setRestDuration(2, 4).success).toBe(false);
    usePilatesStore.getState().fitActiveDuration();
    expect(usePilatesStore.getState().activeSteps[2]).toBe(locked);
    usePilatesStore.getState().toggleStepLock(2);
    usePilatesStore.getState().removeStep(2);
    expect(usePilatesStore.getState().activeSteps.some(isRestStep)).toBe(false);
  });

  it.each([-1, 0, NaN, Infinity, 60, 61])(
    'rejects invalid manual rest %s atomically',
    (minutes) => {
      const before = usePilatesStore.getState();
      expect(before.addRestStep(minutes).success).toBe(false);
      expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
      expect(usePilatesStore.getState().undoStack).toBe(before.undoStack);
    },
  );

  it('checks the sum of rests and preserves actual rests in saved/history/backup snapshots', () => {
    const store = usePilatesStore.getState();
    expect(store.addRestStep(5, 0).success).toBe(true);
    expect(store.addRestStep(10).success).toBe(true);
    const before = usePilatesStore.getState().activeSteps;
    expect(store.addRestStep(45).success).toBe(false);
    expect(usePilatesStore.getState().activeSteps).toBe(before);
    store.fitActiveDuration();
    const id = store.saveCurrentSequenceToBinder(true);
    store.logClassSession({
      sequenceId: id,
      groupId: '',
      taughtAt: '2026-11-04T10:00:00.000Z',
      rating: 4,
      intensity: 'moderate',
      instructorReflection: '',
    });
    const log = usePilatesStore.getState().historyLogs[0]!;
    expect(log.exerciseIds).not.toContain('');
    expect(log.stepsSnapshot?.filter(isRestStep)).toHaveLength(2);
    expect(log.criteriaSnapshot?.restMinutes).toBe(15);
    const backup = store.exportBackup();
    expect(store.restoreBackup(backup).success).toBe(true);
    expect(
      usePilatesStore
        .getState()
        .savedSequences.find((sequence) => sequence.id === id)!
        .steps.filter(isRestStep),
    ).toHaveLength(2);
    expect(
      JSON.parse(localStorage.getItem('pilates-flow-atelier-storage-v3')!).state.activeSteps.filter(
        (step: SequenceStep) => isRestStep(step),
      ),
    ).toHaveLength(2);
  });

  it('uses the snapshot for history replay references and keeps rest without catalog lookups', () => {
    const store = usePilatesStore.getState();
    store.addRestStep(5, 0);
    store.fitActiveDuration();
    const id = store.saveCurrentSequenceToBinder(true);
    store.logClassSession({
      sequenceId: id,
      groupId: '',
      taughtAt: '2026-11-04T10:00:00.000Z',
      rating: 4,
      intensity: 'moderate',
      instructorReflection: '',
    });
    const log = usePilatesStore.getState().historyLogs[0]!;
    usePilatesStore.setState({
      historyLogs: [{ ...log, exerciseIds: [...log.exerciseIds, ''] }],
      activeSteps: [],
    });
    store.loadHistoryIntoWorkbench(log.id);
    expect(usePilatesStore.getState().generationError).toBeNull();
    expect(usePilatesStore.getState().activeSteps.filter(isRestStep)).toHaveLength(1);
  });
});
