import { describe, expect, it } from 'vitest';
import type { PilatesExercise, SequenceStep } from '../types/pilates';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import { exerciseRevision } from './exerciseReview';
import {
  buildConnectedClassSections,
  CONNECTED_STUDY_DISPLAY_CYCLE_SEC,
  resolveConnectedMotionStudy,
} from './connectedMotionStudy';
import { createSequenceMotionStudyBinding } from './sequenceMotionBinding';
import { getMotionStudyEntry } from './motionStudyStages';
import { buildSequenceSimulation, seekSequenceSimulation } from './sequenceSimulation';

const exerciseId = 'original-mat-clam';
const entry = getMotionStudyEntry('existing-proposal', 'side-lying-clam')!;

function fixture(overrides: Partial<SequenceStep> = {}, reviewed = true) {
  const base = syntheticPlanningExercise('mat', 'lower-body', 'alpha', false);
  const record: PilatesExercise = {
    ...base,
    id: exerciseId,
    movementFamily: exerciseId,
    isUnilateral: true,
  };
  const exercise: PilatesExercise = reviewed
    ? {
        ...record,
        review: {
          status: 'approved',
          scope: 'planning-metadata',
          credentialVerified: false,
          reviewerAlias: 'Synthetic QA only',
          reviewedAt: '2026-11-05T00:00:00Z',
          revision: exerciseRevision(record),
        },
      }
    : record;
  const step: SequenceStep = {
    stepId: 'connected-fixture',
    order: 1,
    blockCategory: 'lower-body',
    exerciseId,
    durationMin: 1,
    selectedLayer: 'standard',
    sideMode: 'left-then-right',
    explanationSec: 8,
    transitionSec: 4,
    motionStudy: createSequenceMotionStudyBinding(
      exerciseId,
      'existing-proposal',
      'side-lying-clam',
    ),
    ...overrides,
  };
  const steps = [step];
  const model = buildSequenceSimulation(steps, [exercise], 1);
  const at = (seconds: number, options = {}) =>
    resolveConnectedMotionStudy({
      model,
      steps,
      position: seekSequenceSimulation(model, seconds),
      ...options,
    });
  return { step, steps, exercise, model, at };
}

describe('connected study projection of one parent clock', () => {
  it('holds the authored setup throughout teaching and uses only movement time for display cycles', () => {
    const { at } = fixture();
    const setup = entry.phases.find((phase) => phase.id === 'setup')!;
    const main = entry.stages.find((stage) => stage.id === 'main')!;
    for (const seconds of [0, 4, 7.5]) {
      expect(at(seconds)).toMatchObject({ kind: 'study', static: true, progress: setup.sample });
      expect(at(seconds).stage?.id).toBe('setup');
    }
    const movement = at(10);
    expect(movement.kind).toBe('study');
    expect(movement.progress).toBeCloseTo(main.start + (main.end - main.start) * (2 / 8));
    expect(movement.static).toBe(false);
    expect(at(10 + CONNECTED_STUDY_DISPLAY_CYCLE_SEC).progress).toBeCloseTo(movement.progress);
    expect(at(10)).toEqual(movement);
  });

  it('maps anatomical side boundaries from the selected segment and never derives time from counts', () => {
    const ordinary = fixture();
    const counted = fixture({ repetitions: 999, sets: 99 });
    expect(ordinary.at(31.5)).toMatchObject({ side: 'left', anatomicalSide: 'left' });
    expect(ordinary.at(32)).toMatchObject({ side: 'right', anatomicalSide: 'right' });
    expect(counted.model.totals).toEqual(ordinary.model.totals);
    expect(counted.at(35).progress).toBe(ordinary.at(35).progress);
    const reverse = fixture({ sideMode: 'right-then-left' });
    expect(reverse.at(8).side).toBe('right');
    expect(reverse.at(32).side).toBe('left');
  });

  it('uses a neutral transition, an authored finish, and no synthetic rest figure', () => {
    const { at } = fixture();
    expect(at(56)).toMatchObject({ kind: 'transition', static: true });
    expect(at(56).entry).toBeUndefined();
    const finish = entry.phases.find((phase) => phase.id === 'finish')!;
    expect(at(60)).toMatchObject({
      kind: 'study',
      static: true,
      progress: finish.sample,
      side: 'right',
    });
    const rest = fixture({
      kind: 'rest',
      exerciseId: '',
      motionStudy: undefined,
      sideMode: undefined,
      explanationSec: 0,
      transitionSec: 0,
    });
    expect(rest.at(20)).toMatchObject({ kind: 'rest', static: true });
    expect(rest.at(20).entry).toBeUndefined();
  });

  it('keeps reduced motion and unavailable hosts on a stable authored main still while normal paused seeks show their position', () => {
    const { at } = fixture();
    expect(at(10).progress).not.toBe(at(12).progress);
    for (const options of [{ reducedMotion: true }, { active: false }]) {
      expect(at(10, options).static).toBe(true);
      expect(at(10, options).progress).toBe(at(12, options).progress);
      expect(at(10, options).stage?.id).toBe('main');
    }
  });

  it('never invents an anatomical side for paired or unspecified unilateral work', () => {
    const paired = fixture({ sideMode: 'together' });
    expect(paired.at(10)).toMatchObject({ side: 'both', static: true });
    expect(paired.at(10).anatomicalSide).toBeUndefined();
    const unspecified = fixture({ sideMode: undefined });
    expect(unspecified.at(10)).toMatchObject({ side: 'unknown', static: true });
    expect(unspecified.at(10).anatomicalSide).toBeUndefined();
  });

  it.each([
    ['unbound', () => undefined],
    [
      'stale',
      (binding: NonNullable<SequenceStep['motionStudy']>) => ({
        ...binding,
        sourceFingerprint: '0'.repeat(64),
      }),
    ],
    [
      'unsupported',
      (binding: NonNullable<SequenceStep['motionStudy']>) => ({ ...binding, version: 999 }),
    ],
    [
      'unsupported',
      (binding: NonNullable<SequenceStep['motionStudy']>) => ({
        ...binding,
        variantId: 'unknown-motion',
      }),
    ],
  ] as const)('withholds assets for %s saved bindings', (status, mutate) => {
    const base = fixture();
    const { at } = fixture({ motionStudy: mutate(base.step.motionStudy!) });
    const result = at(10);
    expect(result).toMatchObject({ kind: 'unavailable', bindingStatus: status, static: true });
    expect(result.entry).toBeUndefined();
    expect(result.reason).toBeTruthy();
  });

  it('keeps bilateral assets on parent-controlled cycles without claiming an arbitrary side', () => {
    const { step, exercise } = fixture();
    const bilateralId = 'original-mat-ankle-reach';
    const steps: SequenceStep[] = [
      {
        ...step,
        exerciseId: bilateralId,
        sideMode: 'together',
        motionStudy: createSequenceMotionStudyBinding(
          bilateralId,
          'existing-proposal',
          'supported-heel-raise',
        ),
      },
    ];
    const model = buildSequenceSimulation(steps, [{ ...exercise, id: bilateralId }], 1);
    const at = (seconds: number) =>
      resolveConnectedMotionStudy({
        model,
        steps,
        position: seekSequenceSimulation(model, seconds),
      });
    expect(at(10)).toMatchObject({ kind: 'study', side: 'both', static: false });
    expect(at(10).anatomicalSide).toBeUndefined();
    expect(at(10).progress).not.toBe(at(12).progress);
  });

  it('reports the actual next item during transition, including an intervening rest', () => {
    const { step, exercise } = fixture();
    const steps: SequenceStep[] = [
      step,
      {
        stepId: 'next-rest',
        kind: 'rest',
        order: 2,
        blockCategory: 'core',
        exerciseId: '',
        durationMin: 0.5,
        selectedLayer: 'standard',
      },
      { ...step, stepId: 'later-exercise', order: 3 },
    ];
    const model = buildSequenceSimulation(steps, [exercise]);
    const state = resolveConnectedMotionStudy({
      model,
      steps,
      position: seekSequenceSimulation(model, 57),
    });
    expect(state).toMatchObject({ kind: 'transition', nextStepIndex: 1 });
    expect(state.entry).toBeUndefined();
  });

  it('holds a bilateral reference still when the plan asks for one anatomical side', () => {
    const { step, exercise } = fixture();
    const bilateralId = 'original-mat-ankle-reach';
    const steps: SequenceStep[] = [
      {
        ...step,
        exerciseId: bilateralId,
        sideMode: 'left',
        motionStudy: createSequenceMotionStudyBinding(
          bilateralId,
          'existing-proposal',
          'supported-heel-raise',
        ),
      },
    ];
    const model = buildSequenceSimulation(steps, [{ ...exercise, id: bilateralId }]);
    const at = (seconds: number) =>
      resolveConnectedMotionStudy({
        model,
        steps,
        position: seekSequenceSimulation(model, seconds),
      });
    expect(at(10)).toMatchObject({ kind: 'study', side: 'left', static: true });
    expect(at(10).progress).toBe(at(12).progress);
    expect(at(10).phase?.id).toBe('turn');
  });

  it('withholds unrelated bindings and never chooses a first related asset as fallback', () => {
    const { at } = fixture({ exerciseId: 'unrelated-fixture' });
    expect(at(10)).toMatchObject({ kind: 'unavailable', bindingStatus: 'unrelated' });
    expect(at(10).entry).toBeUndefined();
    const unbound = fixture({ motionStudy: undefined });
    expect(unbound.at(10).entry).toBeUndefined();
  });

  it('allows a matched pending binding to be inspected without opening the existing rehearsal gate', () => {
    const { at, model } = fixture({}, false);
    expect(model.gate.canRehearse).toBe(false);
    const before = JSON.stringify(model.gate);
    expect(at(10)).toMatchObject({ kind: 'study', bindingStatus: 'matched' });
    expect(JSON.stringify(model.gate)).toBe(before);
    expect(at(10)).not.toHaveProperty('canPlay');
  });

  it('withholds an asset when the timeline itself cannot identify a valid exercise', () => {
    const { steps } = fixture();
    const model = buildSequenceSimulation(steps, [], 1);
    const state = resolveConnectedMotionStudy({
      model,
      steps,
      position: seekSequenceSimulation(model, 12),
    });
    expect(state).toMatchObject({ kind: 'unavailable', bindingStatus: 'matched' });
    expect(state.entry).toBeUndefined();
  });

  it('handles empty timelines and follows manual selection without borrowing the other segment side or progress', () => {
    const empty = buildSequenceSimulation([], []);
    expect(
      resolveConnectedMotionStudy({
        model: empty,
        steps: [],
        position: seekSequenceSimulation(empty, 0),
      }),
    ).toMatchObject({ kind: 'empty', stepIndex: null, static: true });
    const { step, exercise } = fixture();
    const steps = [step, { ...step, stepId: 'second', sideMode: 'right' as const }];
    const model = buildSequenceSimulation(steps, [exercise], 2);
    const state = resolveConnectedMotionStudy({
      model,
      steps,
      selectedIndex: 1,
      position: seekSequenceSimulation(model, 20),
    });
    expect(state).toMatchObject({ kind: 'study', side: 'right', static: true });
    expect(state.progress).toBe(entry.phases.find((phase) => phase.id === 'setup')!.sample);
  });
});

describe('whole class section budgets', () => {
  it('counts teaching, movement, transition and adjacent rest once using the timeline budgets', () => {
    const { step, exercise } = fixture();
    const rest = (stepId: string): SequenceStep => ({
      stepId,
      kind: 'rest',
      order: 1,
      blockCategory: 'core',
      exerciseId: '',
      durationMin: 0.5,
      selectedLayer: 'standard',
    });
    const steps: SequenceStep[] = [
      rest('leading-rest'),
      { ...step, stepId: 'warm', blockCategory: 'warmup' },
      rest('warm-rest'),
      { ...step, stepId: 'main', blockCategory: 'core' },
      { ...step, stepId: 'explicit-cool', blockCategory: 'core', classSection: 'cooldown' },
      rest('cool-rest'),
    ];
    const model = buildSequenceSimulation(steps, [exercise]);
    const sections = buildConnectedClassSections(steps, model);
    expect(
      sections.map((section) => [section.role, section.durationSec, section.stepIndices]),
    ).toEqual([
      ['preparation', 120, [0, 1, 2]],
      ['main', 60, [3]],
      ['cooldown', 90, [4, 5]],
    ]);
    expect(sections.reduce((sum, section) => sum + section.durationSec, 0)).toBe(
      model.totals.totalSec,
    );
    expect(sections.every((section) => section.label.length > 0)).toBe(true);
  });

  it('honors an explicit rest section, defaults unassigned standalone rest to main and retains invalid timeline budgets', () => {
    const { step } = fixture();
    const steps: SequenceStep[] = [
      {
        ...step,
        kind: 'rest',
        exerciseId: '',
        classSection: 'preparation',
        sideMode: undefined,
        motionStudy: undefined,
        explanationSec: 0,
        transitionSec: 0,
      },
    ];
    const model = buildSequenceSimulation(steps, []);
    expect(
      buildConnectedClassSections(steps, model).find((section) => section.role === 'preparation')
        ?.durationSec,
    ).toBe(60);
    const unassigned = steps.map((item) => ({ ...item, classSection: undefined }));
    expect(
      buildConnectedClassSections(unassigned, model).find((section) => section.role === 'main')
        ?.durationSec,
    ).toBe(60);
    const invalid = [{ ...step, durationMin: -1 }];
    const invalidModel = buildSequenceSimulation(invalid, []);
    expect(
      buildConnectedClassSections(invalid, invalidModel).reduce(
        (sum, section) => sum + section.durationSec,
        0,
      ),
    ).toBe(invalidModel.totals.totalSec);
  });
});
