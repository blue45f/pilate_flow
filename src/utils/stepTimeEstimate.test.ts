import { describe, expect, it } from 'vitest';
import { calculateStepTimeEstimate } from './stepTimeEstimate';
import { stepSchema } from '../schemas/cloudBackupSchema';
export const estimateFixture = {
  version: 1 as const,
  repetitions: 4,
  sets: 2,
  sides: 2 as const,
  secondsPerRep: 3,
  holdSecPerRep: 1,
  breathsPerSet: 2,
  secondsPerBreath: 5,
  restBetweenSetsSec: 10,
  sideSwitchSec: 15,
  explanationSec: 20,
  transitionSec: 10,
};
describe('explicit instructor time estimates', () => {
  it('counts repetitions/sets/sides, additional hold/breath, between-set rest and overhead exactly once', () => {
    expect(calculateStepTimeEstimate(estimateFixture)).toMatchObject({
      success: true,
      movingSec: 48,
      holdingSec: 16,
      breathingSec: 40,
      restingSec: 20,
      switchingSec: 15,
      totalSec: 169,
      durationMin: 169 / 60,
    });
  });
  it('adds no between-set rest for one set and no side switch for simultaneous or single-side work', () => {
    expect(calculateStepTimeEstimate({ ...estimateFixture, sides: 1, sets: 1 })).toMatchObject({
      success: true,
      restingSec: 0,
      switchingSec: 0,
      totalSec: 56,
    });
  });
  it.each([
    { repetitions: 0 },
    { sets: 1.5 },
    { sides: 3 },
    { secondsPerRep: NaN },
    { holdSecPerRep: -1 },
    { breathsPerSet: 2, secondsPerBreath: 0 },
    { transitionSec: Infinity },
    { repetitions: 1000 },
    {
      secondsPerRep: 1,
      repetitions: 1,
      sets: 1,
      sides: 1,
      explanationSec: 0,
      transitionSec: 0,
      breathsPerSet: 0,
      holdSecPerRep: 0,
    },
  ])('rejects invalid or out-of-range assumptions %j', (patch) => {
    expect(calculateStepTimeEstimate({ ...estimateFixture, ...patch }).success).toBe(false);
  });
  it('accepts legacy steps without an estimate and validates present saved assumptions', () => {
    const step = {
      stepId: 'fixture',
      order: 1,
      blockCategory: 'core',
      exerciseId: 'fixture',
      durationMin: 169 / 60,
      selectedLayer: 'standard',
    };
    expect(stepSchema.safeParse(step).success).toBe(true);
    expect(stepSchema.safeParse({ ...step, timeEstimate: estimateFixture }).success).toBe(true);
    expect(
      stepSchema.safeParse({ ...step, timeEstimate: { ...estimateFixture, secondsPerRep: -1 } })
        .success,
    ).toBe(false);
    expect(
      stepSchema.safeParse({ ...step, kind: 'rest', exerciseId: '', timeEstimate: estimateFixture })
        .success,
    ).toBe(false);
  });
});
