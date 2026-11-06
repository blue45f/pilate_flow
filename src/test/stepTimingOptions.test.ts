import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { stepSchema, stepTimingOptionsSchema } from '../schemas/cloudBackupSchema';
import { usePilatesStore } from '../store/usePilatesStore';
import type { StepTimingOptions } from '../store/usePilatesStore';
import type { SequenceStep } from '../types/pilates';
import { getSequenceDurations, getStepTiming } from '../utils/sequenceEngine';
import { SYNTHETIC_APPROVED_EXERCISES } from './planningFixtures';

const original = usePilatesStore.getState();
const exercise = SYNTHETIC_APPROVED_EXERCISES[0];
const base: SequenceStep = {
  stepId: 'timing-qa',
  order: 1,
  exerciseId: exercise.id,
  blockCategory: exercise.blockCategory,
  durationMin: 5,
  explanationSec: 20,
  transitionSec: 10,
  selectedLayer: 'standard',
  repetitions: 8,
  sideMode: 'left-then-right',
  instructorNote: 'QA 강사 메모',
  customSpringOverride: 'QA 이전 설정',
};
const rest: SequenceStep = {
  kind: 'rest',
  stepId: 'timing-rest',
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
      activeSteps: [{ ...base }, { ...rest }],
      exercises: [exercise],
      activeApparatus: 'mat',
      activeLevel: '1.0',
      activeTargetMinutes: 50,
      undoStack: [],
      generationError: null,
      savedSequences: [],
      historyLogs: [],
    },
    true,
  );
});
afterEach(() => {
  usePilatesStore.setState(original, true);
  localStorage.clear();
});

describe('atomic instructor-entered step timing and spring notes', () => {
  it('edits only supplied fields without inferring duration from repetitions or changing the reusable exercise', () => {
    const source = usePilatesStore.getState().exercises;
    const before = JSON.stringify(source);
    const result = usePilatesStore.getState().setStepTimingOptions(0, {
      durationMin: 4,
      explanationSec: 25,
      transitionSec: 15,
      customSpringOverride: '  QA 이번 수업 기구 메모  ',
    });
    expect(result.success).toBe(true);
    expect(result.message).toContain('강사 입력');
    expect(usePilatesStore.getState().activeSteps[0]).toEqual({
      ...base,
      durationMin: 4,
      explanationSec: 25,
      transitionSec: 15,
      customSpringOverride: 'QA 이번 수업 기구 메모',
    });
    expect(getSequenceDurations(usePilatesStore.getState().activeSteps)).toEqual({
      totalSec: 360,
      exerciseSec: 240,
      restSec: 120,
    });
    expect(getStepTiming(usePilatesStore.getState().activeSteps[0], exercise)).toMatchObject({
      totalSec: 240,
      movementSec: 200,
      sides: 2,
      perSideSec: 100,
    });
    expect(usePilatesStore.getState().exercises).toBe(source);
    expect(JSON.stringify(source)).toBe(before);
    expect(usePilatesStore.getState().activeSteps[1]).toEqual(rest);
    usePilatesStore.getState().undoSequence();
    expect(usePilatesStore.getState().activeSteps[0]).toEqual(base);
  });

  it('distinguishes omitted keys from explicit clears and keeps a zero overhead value', () => {
    expect(usePilatesStore.getState().setStepTimingOptions(0, { explanationSec: 0 }).success).toBe(
      true,
    );
    expect(usePilatesStore.getState().activeSteps[0]).toMatchObject({
      explanationSec: 0,
      transitionSec: 10,
      customSpringOverride: base.customSpringOverride,
      durationMin: 5,
    });
    usePilatesStore.getState().setStepTimingOptions(0, {
      explanationSec: undefined,
      transitionSec: undefined,
      customSpringOverride: undefined,
    });
    expect(usePilatesStore.getState().activeSteps[0]).not.toHaveProperty('explanationSec');
    expect(usePilatesStore.getState().activeSteps[0]).not.toHaveProperty('transitionSec');
    expect(usePilatesStore.getState().activeSteps[0]).not.toHaveProperty('customSpringOverride');
    expect(usePilatesStore.getState().activeSteps[0].durationMin).toBe(5);
    usePilatesStore.getState().setStepTimingOptions(0, { customSpringOverride: 'QA 다시 입력' });
    usePilatesStore.getState().setStepTimingOptions(0, { customSpringOverride: '   ' });
    expect(usePilatesStore.getState().activeSteps[0]).not.toHaveProperty('customSpringOverride');
  });

  it.each([0.5, 20])(
    'accepts a new duration boundary of %s minutes with a valid overhead budget',
    (durationMin) => {
      expect(usePilatesStore.getState().setStepTimingOptions(0, { durationMin }).success).toBe(
        true,
      );
      expect(usePilatesStore.getState().activeSteps[0].durationMin).toBe(durationMin);
    },
  );

  it('preserves valid unchanged legacy durations and notes above new-editor limits', () => {
    const legacy = {
      ...base,
      durationMin: 35,
      explanationSec: 1500,
      transitionSec: 300,
      customSpringOverride: '기'.repeat(700),
      legacyExtra: 'preserve',
    };
    expect(stepSchema.safeParse(legacy).success).toBe(true);
    usePilatesStore.setState({ activeSteps: [legacy, rest] });
    expect(
      usePilatesStore.getState().setStepTimingOptions(0, { customSpringOverride: 'QA 새 메모' })
        .success,
    ).toBe(true);
    expect(usePilatesStore.getState().activeSteps[0]).toMatchObject({
      durationMin: 35,
      explanationSec: 1500,
      transitionSec: 300,
      legacyExtra: 'preserve',
    });
    expect(usePilatesStore.getState().setStepTimingOptions(0, { durationMin: 35 }).success).toBe(
      false,
    );
    expect(
      usePilatesStore.getState().setStepTimingOptions(0, { explanationSec: 1500 }).success,
    ).toBe(false);
  });

  it('rejects an oversized time budget and a rounded-seconds overflow without clamping either field', () => {
    const before = usePilatesStore.getState().activeSteps;
    const undo = usePilatesStore.getState().undoStack;
    for (const patch of [
      { durationMin: 0.5, explanationSec: 20, transitionSec: 11 },
      { explanationSec: 300 },
      { durationMin: 0.5, explanationSec: 15.5, transitionSec: 14.5 },
    ]) {
      expect(usePilatesStore.getState().setStepTimingOptions(0, patch).success).toBe(false);
      expect(usePilatesStore.getState().activeSteps).toBe(before);
      expect(usePilatesStore.getState().undoStack).toBe(undo);
    }
    expect(
      usePilatesStore
        .getState()
        .setStepTimingOptions(0, { durationMin: 0.5, explanationSec: 15, transitionSec: 15 })
        .success,
    ).toBe(true);
    expect(getStepTiming(usePilatesStore.getState().activeSteps[0], exercise)).toMatchObject({
      totalSec: 30,
      movementSec: 0,
      explanationSec: 15,
      transitionSec: 15,
    });
  });

  it('rejects malformed patches, forbidden fields, duration clearing, rests, locks, and invalid indices atomically', () => {
    usePilatesStore.setState({
      activeSteps: [base, rest, { ...base, stepId: 'locked', order: 3, locked: true }],
    });
    const before = usePilatesStore.getState().activeSteps;
    const undo = usePilatesStore.getState().undoStack;
    const requests: [number, unknown][] = [
      [0, { durationMin: undefined }],
      [0, { durationMin: 0.49 }],
      [0, { durationMin: 20.1 }],
      [0, { durationMin: NaN }],
      [0, { durationMin: Infinity }],
      [0, { explanationSec: -1 }],
      [0, { explanationSec: 1201 }],
      [0, { transitionSec: Infinity }],
      [0, { transitionSec: -1 }],
      [0, { customSpringOverride: '기'.repeat(501) }],
      [0, { repetitions: 8 }],
      [0, { apparatus: 'chair' }],
      [0, null],
      [0, { durationMin: '5' }],
      [1, { durationMin: 2 }],
      [2, { transitionSec: 10 }],
      [-1, {}],
      [0.5, {}],
      [NaN, {}],
    ];
    for (const [index, patch] of requests) {
      expect(
        usePilatesStore.getState().setStepTimingOptions(index, patch as StepTimingOptions).success,
      ).toBe(false);
      expect(usePilatesStore.getState().activeSteps).toBe(before);
      expect(usePilatesStore.getState().undoStack).toBe(undo);
    }
    expect(stepTimingOptionsSchema.safeParse({ durationMin: undefined }).success).toBe(false);
    expect(
      stepTimingOptionsSchema.safeParse({ customSpringOverride: `  ${'기'.repeat(500)}  ` })
        .success,
    ).toBe(true);
  });

  it('does not create an undo entry for an empty patch and saves edited settings in the v3 export', () => {
    const undo = usePilatesStore.getState().undoStack;
    expect(usePilatesStore.getState().setStepTimingOptions(0, {}).success).toBe(true);
    expect(usePilatesStore.getState().undoStack).toBe(undo);
    usePilatesStore.getState().setStepTimingOptions(0, {
      durationMin: 3,
      explanationSec: 20,
      transitionSec: 15,
      customSpringOverride: 'QA 직접 입력',
    });
    const savedId = usePilatesStore.getState().saveCurrentSequenceToBinder(true);
    const saved = usePilatesStore.getState().savedSequences.find((value) => value.id === savedId)!;
    const raw = JSON.parse(usePilatesStore.getState().exportBackup());
    expect(saved.steps[0]).toMatchObject({
      durationMin: 3,
      explanationSec: 20,
      transitionSec: 15,
      customSpringOverride: 'QA 직접 입력',
      repetitions: 8,
      sideMode: 'left-then-right',
    });
    expect(
      raw.data.savedSequences.find((value: { id: string }) => value.id === savedId).steps[0],
    ).toEqual(saved.steps[0]);
    expect(raw.version).toBe(3);
  });
});
