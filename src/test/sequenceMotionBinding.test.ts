import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ledger from '../data/motionStudyLedger.json';
import {
  cloudBackupDataSchema,
  sequenceMotionStudyBindingSchema,
  stepSchema,
} from '../schemas/cloudBackupSchema';
import { usePilatesStore } from '../store/usePilatesStore';
import type { StepBlockOptions } from '../store/usePilatesStore';
import type { AutoGenerateCriteria, SequenceStep } from '../types/pilates';
import type { SequenceMotionStudyBinding } from '../types/sequenceMotion';
import {
  assessSequenceMotionStudyBinding,
  createSequenceMotionStudyBinding,
  getSequenceStepClassSection,
} from '../utils/sequenceMotionBinding';
import {
  generateOptimal50MinSequence,
  getStepTiming,
  regenerateSequence,
} from '../utils/sequenceEngine';
import { exerciseRevision, isExerciseAutoEligible } from '../utils/exerciseReview';
import { parseRecoverableNativeBackup } from '../../backend/backupValidation';
import { stepSchema as retainedV6StepSchema } from '../../deployment/appdeploy/platform-source/src/schemas/cloudBackupSchema';
import { SYNTHETIC_APPROVED_EXERCISES, syntheticPlanningExercise } from './planningFixtures';

const entry = ledger.entries.find((item) => item.intendedExerciseIds.length > 0)!;
// Only synthetic QA exercise metadata receives a test-only review, never a catalog item.
const linkedExercise = {
  ...syntheticPlanningExercise('mat', 'warmup', 'alpha', false),
  id: entry.intendedExerciseIds[0],
};
const fixtures = [
  {
    ...linkedExercise,
    review: {
      status: 'approved' as const,
      scope: 'planning-metadata' as const,
      credentialVerified: false as const,
      reviewerAlias: 'Synthetic QA reviewer · test only',
      reviewedAt: '2026-11-05T01:00:00.000Z',
      revision: exerciseRevision(linkedExercise),
    },
  },
  ...SYNTHETIC_APPROVED_EXERCISES.filter(
    (exercise) =>
      exercise.apparatus === 'mat' && exercise.movementFamily !== linkedExercise.movementFamily,
  ),
];
const fresh = createSequenceMotionStudyBinding(linkedExercise.id, entry.family, entry.variantId)!;
const stale = { ...fresh, sourceFingerprint: '0'.repeat(64) };
const future: SequenceMotionStudyBinding = {
  version: 7,
  family: 'future-family',
  variantId: 'future-variant',
  sourceFingerprint: 'a'.repeat(64),
  futureSelection: { cues: ['opaque future metadata'], nested: { marker: true } },
};
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
  stepId: 'qa-motion-bound-step',
  order: 1,
  exerciseId: linkedExercise.id,
  blockCategory: 'warmup',
  durationMin: 5,
  explanationSec: 20,
  transitionSec: 10,
  selectedLayer: 'standard',
};
const rest: SequenceStep = {
  kind: 'rest',
  stepId: 'qa-motion-rest',
  order: 2,
  exerciseId: '',
  blockCategory: 'core',
  durationMin: 2,
  selectedLayer: 'standard',
};
const original = usePilatesStore.getState();
beforeEach(() => {
  localStorage.clear();
  usePilatesStore.setState(
    {
      ...original,
      activeSequenceId: 'qa-motion-working',
      activeSteps: structuredClone([base, rest]),
      exercises: structuredClone(fixtures),
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
      classGroups: [],
    },
    true,
  );
});
afterEach(() => {
  usePilatesStore.setState(original, true);
  localStorage.clear();
});

describe('explicit source identity and whole-class role', () => {
  it('preserves a new isolated family beside an old binding through native backup formats without approving either', () => {
    const reach = ledger.entries.find((item) => item.family === 'supine-reach')!;
    expect(reach).toBeDefined();
    const exerciseId = reach.intendedExerciseIds[0];
    const pending = original.exercises.find((item) => item.id === exerciseId)!;
    expect(pending).toBeDefined();
    expect(isExerciseAutoEligible(pending)).toBe(false);
    const binding = {
      ...createSequenceMotionStudyBinding(exerciseId, reach.family, reach.variantId)!,
      futureSelection: { marker: ['synthetic independent-family backup QA'] },
    };
    const steps: SequenceStep[] = [
      { ...base, durationMin: 4, classSection: 'preparation', motionStudy: { ...fresh, legacyMarker: { retained: true } } },
      {
        ...base, stepId: 'qa-isolated-reach-step', order: 2, exerciseId,
        blockCategory: pending.blockCategory, durationMin: 6, classSection: 'main',
        sideMode: 'left-then-right', repetitions: 6, sets: 1, motionStudy: binding,
      },
    ];
    const catalogBefore = structuredClone(original.exercises);
    usePilatesStore.setState({
      exercises: original.exercises, activeSteps: steps, activeTargetMinutes: 10,
      draftCriteria: { ...criteria, targetMinutes: 10 },
    });
    const id = usePilatesStore.getState().saveCurrentSequenceToBinder(true);
    const raw = usePilatesStore.getState().exportBackup();
    const parsed = parseRecoverableNativeBackup(raw);
    expect(parsed.savedSequences.find((item) => item.id === id)?.steps).toEqual(steps);
    expect(retainedV6StepSchema.parse(steps[1])).toEqual(steps[1]);
    usePilatesStore.setState({ activeSteps: [], savedSequences: [] });
    expect(usePilatesStore.getState().restoreBackup(raw).success).toBe(true);
    usePilatesStore.getState().loadSequenceIntoWorkbench(id);
    expect(usePilatesStore.getState().activeSteps).toEqual(steps);
    expect(assessSequenceMotionStudyBinding(steps[0].exerciseId, usePilatesStore.getState().activeSteps[0].motionStudy)).toBe('matched');
    expect(assessSequenceMotionStudyBinding(exerciseId, usePilatesStore.getState().activeSteps[1].motionStudy)).toBe('matched');
    expect(usePilatesStore.getState().exercises).toEqual(catalogBefore);
    expect(usePilatesStore.getState().historyLogs).toHaveLength(0);
    expect(createSequenceMotionStudyBinding(steps[0].exerciseId, reach.family, reach.variantId)).toBeUndefined();
    expect(assessSequenceMotionStudyBinding(exerciseId, { ...binding, sourceFingerprint: '0'.repeat(64) })).toBe('stale');
  });

  it('builds only current related selections and distinguishes unresolved states without fallback', () => {
    expect(fresh).toEqual({
      version: 1,
      family: entry.family,
      variantId: entry.variantId,
      sourceFingerprint: entry.sourceFingerprint,
    });
    expect(
      createSequenceMotionStudyBinding('unrelated', entry.family, entry.variantId),
    ).toBeUndefined();
    expect(
      createSequenceMotionStudyBinding(linkedExercise.id, entry.family, 'missing'),
    ).toBeUndefined();
    expect(createSequenceMotionStudyBinding('', entry.family, entry.variantId)).toBeUndefined();
    expect(assessSequenceMotionStudyBinding(linkedExercise.id, undefined)).toBe('unbound');
    expect(assessSequenceMotionStudyBinding(linkedExercise.id, fresh)).toBe('matched');
    expect(assessSequenceMotionStudyBinding(linkedExercise.id, stale)).toBe('stale');
    expect(assessSequenceMotionStudyBinding(linkedExercise.id, future)).toBe('unsupported');
    expect(
      assessSequenceMotionStudyBinding(linkedExercise.id, { ...fresh, family: 'unknown' }),
    ).toBe('unsupported');
    expect(assessSequenceMotionStudyBinding('unrelated', fresh)).toBe('unrelated');
    expect(assessSequenceMotionStudyBinding('', fresh)).toBe('unrelated');
  });

  it('bounds known binding structure while preserving future versions and opaque JSON exactly', () => {
    expect(sequenceMotionStudyBindingSchema.parse(future)).toEqual(future);
    for (const patch of [
      { version: 0 },
      { version: 1.5 },
      { version: Infinity },
      { family: '' },
      { family: 'x'.repeat(121) },
      { variantId: '' },
      { variantId: 'x'.repeat(301) },
      { sourceFingerprint: 'f'.repeat(63) },
      { sourceFingerprint: 'g'.repeat(64) },
    ])
      expect(sequenceMotionStudyBindingSchema.safeParse({ ...fresh, ...patch }).success).toBe(
        false,
      );
    expect(stepSchema.parse(base)).not.toHaveProperty('motionStudy');
    // Imported rest metadata is retained for review, but it is never a playable relation.
    expect(stepSchema.parse({ ...rest, motionStudy: future }).motionStudy).toEqual(future);
  });

  it('derives legacy roles and adjacent rest without sorting, and honors an explicit role', () => {
    const main = { ...base, stepId: 'main', blockCategory: 'core' as const };
    const cooldown = { ...base, stepId: 'cooldown', blockCategory: 'cooldown' as const };
    const steps = [rest, base, { ...rest, stepId: 'middle-rest' }, main, cooldown];
    const before = structuredClone(steps);
    expect(steps.map((step) => getSequenceStepClassSection(step, steps))).toEqual([
      'preparation',
      'preparation',
      'preparation',
      'main',
      'cooldown',
    ]);
    expect(getSequenceStepClassSection({ ...main, classSection: 'preparation' })).toBe(
      'preparation',
    );
    expect(getSequenceStepClassSection({ ...rest, classSection: 'cooldown' }, steps)).toBe(
      'cooldown',
    );
    expect(getSequenceStepClassSection(rest, [rest])).toBe('main');
    expect(steps).toEqual(before);
    expect(
      getStepTiming({
        ...base,
        classSection: 'cooldown',
        motionStudy: { ...fresh, side: 'right', cadence: 99 },
      }),
    ).toEqual(getStepTiming(base));
  });
});

describe('atomic persisted class bindings', () => {
  it('applies role, binding and counts once, clones nested metadata, and undoes the whole edit', () => {
    const before = usePilatesStore.getState();
    const catalog = before.exercises;
    const binding = { ...fresh, extension: { selectedBy: ['teacher'] } };
    expect(
      before.setStepBlockOptions(
        0,
        { classSection: 'main', motionStudy: binding, repetitions: 8, sideMode: 'right' },
        structuredClone(before.activeSteps[0]),
      ).success,
    ).toBe(true);
    const after = usePilatesStore.getState();
    expect(after.undoStack).toHaveLength(1);
    expect(after.activeSteps[0]).toMatchObject({
      classSection: 'main',
      motionStudy: binding,
      repetitions: 8,
      sideMode: 'right',
    });
    expect(after.activeSteps[0].motionStudy).not.toBe(binding);
    binding.extension.selectedBy.push('external mutation');
    expect(after.activeSteps[0].motionStudy?.extension).toEqual({ selectedBy: ['teacher'] });
    expect(after.exercises).toBe(catalog);
    expect(getStepTiming(after.activeSteps[0])).toEqual(getStepTiming(base));
    after.undoSequence();
    expect(usePilatesStore.getState().activeSteps).toEqual([base, rest]);
  });

  it('rejects stale, unsupported, unrelated, rest and locked selections atomically', () => {
    const before = usePilatesStore.getState();
    for (const [index, binding] of [
      [0, stale],
      [0, future],
      [0, { ...fresh, variantId: 'missing' }],
      [1, fresh],
    ] as const) {
      expect(
        before.setStepBlockOptions(index, {
          motionStudy: binding,
          classSection: 'main',
          repetitions: 8,
        }).success,
      ).toBe(false);
      expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
      expect(usePilatesStore.getState().undoStack).toBe(before.undoStack);
    }
    usePilatesStore.setState({ activeSteps: [{ ...base, exerciseId: fixtures[1].id }] });
    expect(usePilatesStore.getState().setStepBlockOptions(0, { motionStudy: fresh }).success).toBe(
      false,
    );
    usePilatesStore.setState({ activeSteps: [{ ...base, locked: true }] });
    expect(
      usePilatesStore
        .getState()
        .setStepBlockOptions(0, { motionStudy: fresh, classSection: 'cooldown' }).success,
    ).toBe(false);
    usePilatesStore.setState({ activeSteps: [base] });
    for (const patch of [{ motionStudy: undefined }, { classSection: 'warmup' }])
      expect(
        usePilatesStore.getState().setStepBlockOptions(0, patch as StepBlockOptions).success,
      ).toBe(false);
  });

  it('keeps unreviewed exercises unapproved when selecting a related study', () => {
    const unreviewed = structuredClone(linkedExercise);
    usePilatesStore.setState({ exercises: [unreviewed] });
    expect(usePilatesStore.getState().setStepBlockOptions(0, { motionStudy: fresh }).success).toBe(
      true,
    );
    expect(usePilatesStore.getState().exercises[0]).toBe(unreviewed);
    expect(isExerciseAutoEligible(usePilatesStore.getState().exercises[0])).toBe(false);
    expect(usePilatesStore.getState().exercises[0]).not.toHaveProperty('review');
  });

  it('rejects a stale expected snapshot after a binding, role, lock or index identity change', () => {
    for (const changed of [
      { ...base, motionStudy: fresh },
      { ...base, classSection: 'main' as const },
      { ...base, locked: true },
      { ...base, stepId: 'different-step' },
    ]) {
      usePilatesStore.setState({ activeSteps: [changed], undoStack: [] });
      const before = usePilatesStore.getState();
      expect(before.setStepBlockOptions(0, { repetitions: 8 }, base).success).toBe(false);
      expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
      expect(usePilatesStore.getState().undoStack).toBe(before.undoStack);
    }
  });

  it('preserves imported unresolved selections on other edits until an explicit clear or fresh rebind', () => {
    for (const binding of [stale, future]) {
      usePilatesStore.setState({
        activeSteps: [{ ...base, motionStudy: structuredClone(binding), classSection: 'cooldown' }],
      });
      expect(
        usePilatesStore.getState().setStepBlockOptions(0, { instructorNote: 'teacher note' })
          .success,
      ).toBe(true);
      expect(usePilatesStore.getState().activeSteps[0].motionStudy).toEqual(binding);
      expect(
        usePilatesStore.getState().setStepBlockOptions(0, { motionStudy: fresh }).success,
      ).toBe(true);
      expect(usePilatesStore.getState().activeSteps[0].motionStudy).toEqual(fresh);
      expect(
        usePilatesStore.getState().setStepBlockOptions(0, { motionStudy: null, classSection: null })
          .success,
      ).toBe(true);
      expect(usePilatesStore.getState().activeSteps[0]).not.toHaveProperty('motionStudy');
      expect(usePilatesStore.getState().activeSteps[0]).not.toHaveProperty('classSection');
    }
  });

  it('clears exercise-specific source binding on replacement while preserving explicit role and unknown step data', () => {
    const enriched = {
      ...base,
      motionStudy: fresh,
      classSection: 'cooldown' as const,
      futureStep: { keep: [1, 2] },
    };
    usePilatesStore.setState({ activeSteps: [enriched] });
    usePilatesStore.getState().replaceStepExercise(0, fixtures[1].id);
    expect(usePilatesStore.getState().activeSteps[0]).toMatchObject({
      exerciseId: fixtures[1].id,
      classSection: 'cooldown',
      futureStep: { keep: [1, 2] },
    });
    expect(usePilatesStore.getState().activeSteps[0].motionStudy).toBeUndefined();
    usePilatesStore.getState().undoSequence();
    expect(usePilatesStore.getState().activeSteps[0]).toEqual(enriched);
    expect(usePilatesStore.getState().activeSteps[0].motionStudy).not.toBe(enriched.motionStudy);
  });

  it('retains unresolved JSON and isolates nested references through save/load/duplicate/history/rehydration/recovery', async () => {
    const enriched = {
      ...base,
      classSection: 'preparation' as const,
      motionStudy: structuredClone(future),
      futureStep: { markers: ['preserved'] },
    };
    const importedRest = { ...rest, motionStudy: structuredClone(future) };
    usePilatesStore.setState({ activeSteps: [enriched, importedRest] });
    const id = usePilatesStore.getState().saveCurrentSequenceToBinder(true);
    const copyId = usePilatesStore.getState().duplicateSavedSequence(id);
    const saved = usePilatesStore.getState().savedSequences.find((item) => item.id === id)!;
    const copy = usePilatesStore.getState().savedSequences.find((item) => item.id === copyId)!;
    expect(saved.steps[0]).toEqual(enriched);
    expect(copy.steps[0]).toEqual(enriched);
    expect(saved.steps[0].motionStudy?.futureSelection).not.toBe(
      enriched.motionStudy.futureSelection,
    );
    expect(copy.steps[0].motionStudy?.futureSelection).not.toBe(
      saved.steps[0].motionStudy?.futureSelection,
    );
    usePilatesStore.getState().logClassSession({
      sequenceId: id,
      groupId: '',
      taughtAt: '2026-11-05T01:00:00.000Z',
      rating: 4,
      intensity: 'moderate',
      instructorReflection: 'synthetic QA only',
    });
    const log = usePilatesStore.getState().historyLogs[0];
    expect(log.stepsSnapshot?.[0]).toEqual(enriched);
    expect(log.stepsSnapshot?.[0].motionStudy).not.toBe(saved.steps[0].motionStudy);
    const raw = usePilatesStore.getState().exportBackup();
    const wire = cloudBackupDataSchema.parse(JSON.parse(raw).data);
    expect(wire.savedSequences.find((item) => item.id === id)?.steps[1]).toEqual(importedRest);
    expect(wire.savedSequences.find((item) => item.id === id)?.steps[0]).toEqual(enriched);
    expect(
      parseRecoverableNativeBackup(raw).savedSequences.find((item) => item.id === id)?.steps[0],
    ).toEqual(enriched);
    expect(retainedV6StepSchema.parse(enriched)).toEqual(enriched);
    const persisted = localStorage.getItem('pilates-flow-atelier-storage-v3')!;
    usePilatesStore.setState({ activeSteps: [], savedSequences: [], historyLogs: [] });
    localStorage.setItem('pilates-flow-atelier-storage-v3', persisted);
    await usePilatesStore.persist.rehydrate();
    expect(usePilatesStore.getState().activeSteps[0]).toEqual(enriched);
    usePilatesStore.getState().loadHistoryIntoWorkbench(log.id);
    expect(usePilatesStore.getState().activeSteps[0]).toEqual(enriched);
    usePilatesStore.setState({ activeSteps: [], savedSequences: [], historyLogs: [] });
    expect(usePilatesStore.getState().restoreBackup(raw).success).toBe(true);
    usePilatesStore.getState().loadSequenceIntoWorkbench(id);
    expect(usePilatesStore.getState().activeSteps[0]).toEqual(enriched);
    expect(
      assessSequenceMotionStudyBinding(
        enriched.exerciseId,
        usePilatesStore.getState().activeSteps[0].motionStudy,
      ),
    ).toBe('unsupported');
  });
});

describe('partial regeneration respects role and source identity', () => {
  it('keeps locked and untargeted bindings exactly, uses explicit role for scope, and clears replaced exercise bindings', () => {
    const generated = generateOptimal50MinSequence(criteria, fixtures, []);
    const steps = generated.map((step, index) => ({
      ...step,
      classSection: index === 1 ? ('preparation' as const) : ('main' as const),
      motionStudy: structuredClone(future),
      futureStep: { marker: index },
      locked: index === 0,
    }));
    const result = regenerateSequence(criteria, fixtures, [], steps, 'warmup');
    expect(result[0]).toBe(steps[0]);
    for (let index = 2; index < steps.length; index++) expect(result[index]).toBe(steps[index]);
    expect(result[1].classSection).toBe('preparation');
    expect(result[1]).toMatchObject({ futureStep: { marker: 1 } });
    if (result[1].exerciseId !== steps[1].exerciseId) expect(result[1].motionStudy).toBeUndefined();
    else expect(result[1].motionStudy).toEqual(future);
    expect(fixtures.every(isExerciseAutoEligible)).toBe(true);
  });
});
