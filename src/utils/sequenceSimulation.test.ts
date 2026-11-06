import { describe, expect, it } from 'vitest';
import type { PilatesExercise, SequenceStep } from '../types/pilates';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import { exerciseRevision } from './exerciseReview';
import { buildSequenceSimulation, seekSequenceSimulation } from './sequenceSimulation';

const a = syntheticPlanningExercise('mat', 'warmup');
const b = syntheticPlanningExercise('mat', 'lower-body');
const c = syntheticPlanningExercise('mat', 'cooldown');
const exercises = [a, b, c];
const steps: SequenceStep[] = [
  {
    stepId: 'a',
    order: 9,
    exerciseId: a.id,
    blockCategory: 'warmup',
    selectedLayer: 'standard',
    durationMin: 14,
    explanationSec: 30,
    transitionSec: 30,
  },
  {
    stepId: 'b',
    order: 2,
    exerciseId: b.id,
    blockCategory: 'lower-body',
    selectedLayer: 'standard',
    durationMin: 17,
    explanationSec: 30,
    transitionSec: 30,
    sideMode: 'left-then-right',
  },
  {
    stepId: 'rest',
    order: 1,
    kind: 'rest',
    exerciseId: '',
    blockCategory: 'core',
    selectedLayer: 'standard',
    durationMin: 2,
  },
  {
    stepId: 'c',
    order: 8,
    exerciseId: c.id,
    blockCategory: 'cooldown',
    selectedLayer: 'standard',
    durationMin: 17,
    explanationSec: 45,
    transitionSec: 15,
    sideMode: 'left',
  },
];

function locallyReviewed(exercise: PilatesExercise): PilatesExercise {
  return {
    ...exercise,
    review: {
      status: 'approved',
      scope: 'planning-metadata',
      credentialVerified: false,
      reviewerAlias: 'Synthetic QA only',
      reviewedAt: '2026-11-04T10:00:00.000Z',
      revision: exerciseRevision(exercise),
    },
  };
}

function expectPartition(model: ReturnType<typeof buildSequenceSimulation>) {
  let end = 0;
  for (const segment of model.segments) {
    expect(segment.startSec).toBe(end);
    expect(segment.endSec - segment.startSec).toBe(segment.durationSec);
    expect(segment.durationSec).toBeGreaterThan(0);
    end = segment.endSec;
  }
  expect(end).toBe(model.totals.totalSec);
  const totals = model.totals;
  expect(
    totals.movementSec +
      totals.teachingSec +
      totals.transitionSec +
      totals.restSec +
      totals.unavailableSec,
  ).toBe(totals.totalSec);
  expect(totals.exerciseSec + totals.restSec).toBe(totals.totalSec);
}

describe('whole-class plan simulation timeline', () => {
  it('matches teaching → movement side(s) → transition and rests in actual array order for a 50 minute plan', () => {
    const model = buildSequenceSimulation(steps, exercises, 50);
    expect(model.totals).toEqual({
      totalSec: 3000,
      exerciseSec: 2880,
      movementSec: 2700,
      teachingSec: 105,
      transitionSec: 75,
      restSec: 120,
      unavailableSec: 0,
    });
    expect(model.targetSec).toBe(3000);
    expect(model.targetSource).toBe('provided');
    expect(model.deltaSec).toBe(0);
    expect(model.gate).toEqual({ canRehearse: true, reasons: [] });
    expect(
      model.segments.map(({ kind, stepIndex, startSec, endSec, sideLabel }) => [
        kind,
        stepIndex,
        startSec,
        endSec,
        sideLabel,
      ]),
    ).toEqual([
      ['teaching', 0, 0, 30, undefined],
      ['movement', 0, 30, 810, '함께'],
      ['transition', 0, 810, 840, undefined],
      ['teaching', 1, 840, 870, undefined],
      ['movement', 1, 870, 1350, '왼쪽'],
      ['movement', 1, 1350, 1830, '오른쪽'],
      ['transition', 1, 1830, 1860, undefined],
      ['rest', 2, 1860, 1980, undefined],
      ['teaching', 3, 1980, 2025, undefined],
      ['movement', 3, 2025, 2985, '왼쪽'],
      ['transition', 3, 2985, 3000, undefined],
    ]);
    expect(
      model.steps.map(({ stepId, startSec, endSec, segmentStartIndex, segmentCount }) => [
        stepId,
        startSec,
        endSec,
        segmentStartIndex,
        segmentCount,
      ]),
    ).toEqual([
      ['a', 0, 840, 0, 3],
      ['b', 840, 1860, 3, 4],
      ['rest', 1860, 1980, 7, 1],
      ['c', 1980, 3000, 8, 3],
    ]);
    expectPartition(model);
  });

  it('omits zero-length phases and divides odd movement seconds without multiplying the budget', () => {
    const model = buildSequenceSimulation(
      [
        {
          ...steps[1],
          durationMin: 61 / 60,
          explanationSec: 10,
          transitionSec: 0,
          sideMode: 'right-then-left',
        },
      ],
      exercises,
      61 / 60,
    );
    expect(
      model.segments.map(({ kind, durationSec, sideLabel }) => [kind, durationSec, sideLabel]),
    ).toEqual([
      ['teaching', 10, undefined],
      ['movement', 25.5, '오른쪽'],
      ['movement', 25.5, '왼쪽'],
    ]);
    expect(model.totals.totalSec).toBe(61);
    expect(model.totals.movementSec).toBe(51);
    expect(seekSequenceSimulation(model, 35.5).segment?.sideLabel).toBe('왼쪽');
    expectPartition(model);
    const zeroOverhead = buildSequenceSimulation(
      [{ ...steps[0], explanationSec: 0, transitionSec: 0 }],
      exercises,
    );
    expect(zeroOverhead.segments).toHaveLength(1);
    expect(zeroOverhead.segments[0].kind).toBe('movement');
  });

  it('keeps teacher repetitions and sets as metadata without creating extra segments or time', () => {
    const plain = buildSequenceSimulation(steps, exercises, 50);
    const withCounts = buildSequenceSimulation(
      steps.map((step) =>
        step.kind === 'rest' ? step : { ...step, repetitions: 1000, sets: 100 },
      ),
      exercises,
      50,
    );
    expect(withCounts.segments).toEqual(plain.segments);
    expect(withCounts.totals).toEqual(plain.totals);
    expect(withCounts.steps[0]).toMatchObject({ repetitions: 1000, sets: 100 });
  });

  it('uses truthful unknown default side order and explicit single/together overrides', () => {
    const unknownOrder = buildSequenceSimulation([{ ...steps[1], sideMode: undefined }], exercises);
    expect(
      unknownOrder.segments
        .filter((segment) => segment.kind === 'movement')
        .map((segment) => segment.sideLabel),
    ).toEqual(['첫 번째 쪽', '반대쪽']);
    for (const [sideMode, sideLabel] of [
      ['left', '왼쪽'],
      ['right', '오른쪽'],
      ['together', '양쪽 함께'],
    ] as const) {
      const model = buildSequenceSimulation([{ ...steps[1], sideMode }], exercises);
      const movement = model.segments.filter((segment) => segment.kind === 'movement');
      expect(movement).toHaveLength(1);
      expect(movement[0]).toMatchObject({ durationSec: 960, sideLabel });
      expectPartition(model);
    }
  });

  it('returns a deeply frozen primitive snapshot without cue text or mutable source references', () => {
    const inputSteps = steps.map((step) => ({
      ...step,
      instructorNote: 'Private teacher draft text',
    }));
    const inputExercises: PilatesExercise[] = JSON.parse(JSON.stringify(exercises));
    const beforeSteps = JSON.stringify(inputSteps),
      beforeExercises = JSON.stringify(inputExercises);
    const model = buildSequenceSimulation(inputSteps, inputExercises, 50);
    expect(JSON.stringify(inputSteps)).toBe(beforeSteps);
    expect(JSON.stringify(inputExercises)).toBe(beforeExercises);
    inputSteps[0].durationMin = 20;
    inputExercises[0].nameKo = 'Changed after snapshot';
    inputExercises[0].cues.push('Later private cue');
    expect(model.steps[0].title).toBe(a.nameKo);
    expect(model.totals.totalSec).toBe(3000);
    expect(JSON.stringify(model)).not.toContain('Private teacher draft text');
    expect(JSON.stringify(model)).not.toContain(a.cues[0]);
    for (const value of [
      model,
      model.steps,
      model.steps[0],
      model.steps[0].sideLabels,
      model.segments,
      model.segments[0],
      model.totals,
      model.gate,
      model.gate.reasons,
    ])
      expect(Object.isFrozen(value)).toBe(true);
    const frozenSteps = Object.freeze(steps.map((step) => Object.freeze({ ...step })));
    expect(() => buildSequenceSimulation(frozenSteps, Object.freeze(exercises), 50)).not.toThrow();
  });

  it.each(['pending', 'stale'] as const)(
    'allows inspection and timed rehearsal for %s notes without changing review evidence',
    (state) => {
      const changed: PilatesExercise =
        state === 'pending'
          ? { ...a, review: undefined }
          : { ...a, cues: [...a.cues, 'Changed material content'] };
      const model = buildSequenceSimulation(steps, [changed, b, c], 50);
      expect(model.steps[0].reviewState).toBe(state);
      expect(model.gate.canRehearse).toBe(true);
      expect(model.gate.reasons).toEqual([]);
      expect(changed.review).toEqual(state === 'pending' ? undefined : a.review);
      expect(seekSequenceSimulation(model, 60).segment?.kind).toBe('movement');
      expect(model.totals.totalSec).toBe(3000);
      expect(JSON.stringify(model)).not.toContain(changed.cues[0]);
    },
  );

  it('retains the missing exercise budget as unavailable rather than inventing motion or a default side', () => {
    const model = buildSequenceSimulation(
      [{ ...steps[0], exerciseId: 'missing' }, ...steps.slice(1)],
      exercises,
      50,
    );
    expect(model.gate.canRehearse).toBe(false);
    expect(
      model.gate.reasons.find((reason) => reason.code === 'missing-exercise')?.stepIndices,
    ).toEqual([0]);
    expect(model.segments[0]).toMatchObject({ kind: 'unavailable', durationSec: 840 });
    expect(model.segments.filter((segment) => segment.stepIndex === 0)).toHaveLength(1);
    expect(model.segments[0]).not.toHaveProperty('sideLabel');
    expect(model.steps[0].sideLabels).toEqual([]);
    expect(model.totals.unavailableSec).toBe(840);
    expect(model.totals.totalSec).toBe(3000);
    expectPartition(model);
  });

  it('fails closed on malformed or ambiguous exercise records while ignoring unrelated catalog duplicates', () => {
    const invalid = { ...a, isUnilateral: 'unknown' } as unknown as PilatesExercise;
    for (const [catalog, code] of [
      [[invalid, b, c], 'invalid-exercise'],
      [[a, { ...a, nameKo: 'Ambiguous second record' }, b, c], 'ambiguous-exercise'],
    ] as const) {
      const model = buildSequenceSimulation(steps, catalog, 50);
      expect(model.gate.canRehearse).toBe(false);
      expect(model.gate.reasons.some((reason) => reason.code === code)).toBe(true);
      expect(model.segments[0].kind).toBe('unavailable');
      expectPartition(model);
    }
    const unused = syntheticPlanningExercise('chair', 'core');
    expect(
      buildSequenceSimulation(steps, [...exercises, unused, unused], 50).gate.canRehearse,
    ).toBe(true);
  });

  it('uses the common normalized movement key for duplicate detection without deleting inspection segments', () => {
    const first = locallyReviewed({
      ...a,
      movementFamily: undefined,
      nameEn: 'Reformer Mermaid 5min',
      nameKo: '머메이드',
    });
    const second = locallyReviewed({
      ...b,
      movementFamily: undefined,
      nameEn: 'Cadillac Mermaid 10min',
      nameKo: '머메이드',
    });
    const model = buildSequenceSimulation(steps, [first, second, c], 50);
    expect(model.gate.canRehearse).toBe(true);
    expect(
      model.gate.reasons.find((reason) => reason.code === 'duplicate-movement')?.stepIndices,
    ).toEqual([0, 1]);
    expect(model.gate.reasons.some((reason) => reason.code === 'unreviewed-exercise')).toBe(false);
    expect(model.steps).toHaveLength(4);
    expect(model.totals.totalSec).toBe(3000);
  });

  it('reports target differences without blocking rehearsal and derives an optional target', () => {
    for (const target of [49, 50.001, 55]) {
      const model = buildSequenceSimulation(steps, exercises, target);
      expect(model.gate.canRehearse).toBe(true);
      expect(model.totals.totalSec).toBe(3000);
      expect(model.gate.reasons.some((reason) => reason.code === 'target-mismatch')).toBe(true);
      expect(model.deltaSec).toBe(3000 - target * 60);
    }
    const derived = buildSequenceSimulation(steps, exercises);
    expect(derived.targetSource).toBe('plan-total');
    expect(derived.targetSec).toBe(3000);
    expect(derived.gate.canRehearse).toBe(true);
  });

  it.each([0, -1, NaN, Infinity, '50', null, {}, Symbol('target'), 1n])(
    'blocks an invalid provided target %s without changing timeline time',
    (target) => {
      const model = buildSequenceSimulation(steps, exercises, target as number);
      expect(model.targetSec).toBeNull();
      expect(model.deltaSec).toBeNull();
      expect(model.gate.canRehearse).toBe(false);
      expect(model.gate.reasons.some((reason) => reason.code === 'invalid-target')).toBe(true);
      expect(model.totals.totalSec).toBe(3000);
    },
  );

  it('handles empty, rest-only, duplicate-step-ID and malformed plans without inventing movement', () => {
    const empty = buildSequenceSimulation([], exercises);
    expect(empty.gate.canRehearse).toBe(false);
    expect(empty.gate.reasons.map((reason) => reason.code)).toEqual(['empty-sequence']);
    expect(seekSequenceSimulation(empty, 0)).toMatchObject({
      status: 'empty',
      segment: null,
      stepIndex: null,
    });
    const restOnly = buildSequenceSimulation([steps[2]], exercises, 2);
    expect(restOnly.gate.reasons.some((reason) => reason.code === 'no-exercises')).toBe(true);
    expect(restOnly.segments.map((segment) => segment.kind)).toEqual(['rest']);
    const duplicateId = buildSequenceSimulation(
      [steps[0], { ...steps[1], stepId: steps[0].stepId }],
      exercises,
    );
    expect(duplicateId.gate.reasons.some((reason) => reason.code === 'invalid-step')).toBe(true);
    const badMetadata = buildSequenceSimulation(
      [{ ...steps[0], durationMin: 1, explanationSec: 70 }],
      exercises,
    );
    expect(badMetadata.segments).toHaveLength(1);
    expect(badMetadata.segments[0]).toMatchObject({ kind: 'unavailable', durationSec: 60 });
    expect(badMetadata.gate.canRehearse).toBe(false);
    expectPartition(badMetadata);
    const wrongArray = buildSequenceSimulation(
      null as unknown as SequenceStep[],
      undefined as unknown as PilatesExercise[],
    );
    expect(wrongArray.gate.reasons.some((reason) => reason.code === 'invalid-input')).toBe(true);
  });

  it.each([NaN, Infinity, -1, 0, 0.001, 121])(
    'rejects an uninterpretable step duration %s without an invalid clock',
    (durationMin) => {
      const model = buildSequenceSimulation([{ ...steps[0], durationMin }], exercises);
      expect(model.gate.canRehearse).toBe(false);
      expect(model.gate.reasons.some((reason) => reason.code === 'invalid-step')).toBe(true);
      expect(model.totals.totalSec).toBe(0);
      expect(seekSequenceSimulation(model, 0).status).toBe('empty');
    },
  );
});

describe('pure timeline seek boundaries', () => {
  const model = buildSequenceSimulation(steps, exercises, 50);
  it.each(model.segments.map((segment, index) => [segment.startSec, index] as const))(
    'selects the next phase exactly at %s seconds',
    (time, index) => {
      const position = seekSequenceSimulation(model, time);
      expect(position).toMatchObject({
        status: 'active',
        segmentIndex: index,
        stepIndex: model.segments[index].stepIndex,
        elapsedInSegmentSec: 0,
        remainingInSegmentSec: model.segments[index].durationSec,
      });
      expect(position.segment).toBe(model.segments[index]);
      expect(Object.isFrozen(position)).toBe(true);
    },
  );

  it('keeps the preceding phase just before a boundary and returns no current phase at exact end', () => {
    expect(seekSequenceSimulation(model, 1860 - 0.001).segment?.kind).toBe('transition');
    expect(seekSequenceSimulation(model, 1860).segment?.kind).toBe('rest');
    expect(seekSequenceSimulation(model, 3000)).toEqual({
      status: 'complete',
      timeSec: 3000,
      remainingSec: 0,
      segmentIndex: null,
      segment: null,
      stepIndex: null,
      elapsedInSegmentSec: 0,
      remainingInSegmentSec: 0,
    });
    expect(seekSequenceSimulation(model, 9999).status).toBe('complete');
  });

  it('clamps finite seek values, resets nonfinite values, and returns elapsed/remaining values without mutating the plan', () => {
    const before = JSON.stringify(model);
    for (const time of [-100, NaN, Infinity, -Infinity])
      expect(seekSequenceSimulation(model, time).timeSec).toBe(0);
    expect(seekSequenceSimulation(model, 900)).toMatchObject({
      timeSec: 900,
      remainingSec: 2100,
      elapsedInSegmentSec: 30,
      remainingInSegmentSec: 450,
      stepIndex: 1,
    });
    expect(JSON.stringify(model)).toBe(before);
  });
});
