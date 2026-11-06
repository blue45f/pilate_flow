import { describe, expect, it } from 'vitest';
import type { DraftPhase } from '../models/types';
import {
  buildRehearsalTimeline,
  resolveRehearsalPosition,
  validateRehearsalPhases,
} from '../utils/motionDraftRehearsal';
import type { RehearsalValidTimeline } from '../utils/motionDraftRehearsal';

const phases: readonly DraftPhase[] = Object.freeze([
  Object.freeze({ id: 'setup', label: 'Setup', labelKo: '준비', start: 0, end: 0.125, sample: 0 }),
  Object.freeze({
    id: 'move',
    label: 'Move',
    labelKo: '이동',
    start: 0.125,
    end: 0.375,
    sample: 0.25,
  }),
  Object.freeze({
    id: 'turn',
    label: 'Turn',
    labelKo: '전환',
    start: 0.375,
    end: 0.5,
    sample: 0.4375,
  }),
  Object.freeze({
    id: 'return',
    label: 'Return',
    labelKo: '복귀',
    start: 0.5,
    end: 0.875,
    sample: 0.75,
  }),
  Object.freeze({
    id: 'finish',
    label: 'Finish',
    labelKo: '마무리',
    start: 0.875,
    end: 1,
    sample: 1,
  }),
]);

function changePhase(index: number, change: Partial<DraftPhase>): readonly DraftPhase[] {
  return phases.map((phase, phaseIndex) =>
    phaseIndex === index ? { ...phase, ...change } : phase,
  );
}

function validTimeline(start: number, end: number, seconds: number, repetitions: number) {
  const result = buildRehearsalTimeline(phases, start, end, seconds, repetitions);
  if (!result.valid) throw new Error(result.error);
  return result;
}

function expectInvalidPhases(value: readonly DraftPhase[]) {
  const result = validateRehearsalPhases(value);
  expect(result.valid).toBe(false);
  if (!result.valid) expect(result.error.trim().length).toBeGreaterThan(0);
  expect(buildRehearsalTimeline(value, 0, 4, 8, 1)).toEqual(result);
}

describe('rehearsal phase validation', () => {
  it('accepts five contiguous ordered spans and inclusive endpoint samples without mutating them', () => {
    const before = JSON.stringify(phases);
    expect(validateRehearsalPhases(phases)).toEqual({ valid: true });
    const withoutKorean = phases.map((phase) => ({ ...phase, labelKo: undefined }));
    expect(validateRehearsalPhases(withoutKorean)).toEqual({ valid: true });
    expect(JSON.stringify(phases)).toBe(before);
  });

  it('requires exactly five phases in setup/move/turn/return/finish order', () => {
    expectInvalidPhases([]);
    expectInvalidPhases(phases.slice(0, 4));
    expectInvalidPhases([...phases, phases[4]]);
    expectInvalidPhases(changePhase(1, { id: 'turn' }));
    expectInvalidPhases([phases[1], phases[0], ...phases.slice(2)]);
    expectInvalidPhases([phases[0], null, ...phases.slice(2)] as unknown as readonly DraftPhase[]);
    expectInvalidPhases(null as unknown as readonly DraftPhase[]);
  });

  it('requires complete exact coverage from zero to one without gaps or overlaps', () => {
    expectInvalidPhases(changePhase(0, { start: 0.01, sample: 0.01 }));
    expectInvalidPhases(changePhase(4, { end: 0.99, sample: 0.99 }));
    expectInvalidPhases(changePhase(1, { start: 0.125 + Number.EPSILON }));
    expectInvalidPhases(changePhase(1, { start: 0.1 }));
    expectInvalidPhases(changePhase(1, { end: 0.125, sample: 0.125 }));
    expectInvalidPhases(changePhase(1, { end: 0.1, sample: 0.1 }));
    expectInvalidPhases(changePhase(0, { start: -0.1 }));
    expectInvalidPhases(changePhase(4, { end: 1.1 }));
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects nonfinite phase start, end or sample %s',
    (value) => {
      expectInvalidPhases(changePhase(2, { start: value }));
      expectInvalidPhases(changePhase(2, { end: value }));
      expectInvalidPhases(changePhase(2, { sample: value }));
    },
  );

  it('requires every finite sample to lie inside its own phase and every supplied label to be nonempty', () => {
    expectInvalidPhases(changePhase(2, { sample: 0.374 }));
    expectInvalidPhases(changePhase(2, { sample: 0.501 }));
    expectInvalidPhases(changePhase(2, { label: '' }));
    expectInvalidPhases(changePhase(2, { label: ' \t\n ' }));
    expectInvalidPhases(changePhase(2, { labelKo: '  ' }));
    expectInvalidPhases(changePhase(2, { label: null } as unknown as Partial<DraftPhase>));
    expectInvalidPhases(changePhase(2, { labelKo: null } as unknown as Partial<DraftPhase>));
    expect(validateRehearsalPhases(changePhase(2, { sample: phases[2].start }))).toEqual({
      valid: true,
    });
    expect(validateRehearsalPhases(changePhase(2, { sample: phases[2].end }))).toEqual({
      valid: true,
    });
  });
});

describe('finite rehearsal range accounting', () => {
  it('leaves explicit or unrecognized display metadata untouched and never changes time based on phase identity', () => {
    const markedPhases = phases.map((phase, index) => ({
      ...phase,
      displayBehavior: ['hold', 'move', 'unknown', 'future-value', undefined][index],
    })) as unknown as readonly DraftPhase[];
    const before = JSON.stringify(markedPhases);
    expect(buildRehearsalTimeline(markedPhases, 0, 0, 8, 2)).toEqual(
      buildRehearsalTimeline(phases, 0, 0, 8, 2),
    );
    expect(buildRehearsalTimeline(markedPhases, 0, 4, 8, 3)).toEqual(
      buildRehearsalTimeline(phases, 0, 4, 8, 3),
    );
    expect(JSON.stringify(markedPhases)).toBe(before);
  });

  it('retains the original full-cycle rate when rehearsing a selected phase fraction', () => {
    expect(validTimeline(0, 4, 8, 3)).toEqual({
      valid: true,
      startProgress: 0,
      endProgress: 1,
      rangeFraction: 1,
      rangeSeconds: 8,
      totalSeconds: 24,
      repetitions: 3,
      cycleSeconds: 8,
    });
    expect(validTimeline(1, 2, 8, 3)).toEqual({
      valid: true,
      startProgress: 0.125,
      endProgress: 0.5,
      rangeFraction: 0.375,
      rangeSeconds: 3,
      totalSeconds: 9,
      repetitions: 3,
      cycleSeconds: 8,
    });
    expect(validTimeline(2, 2, 8, 2)).toMatchObject({
      startProgress: 0.375,
      endProgress: 0.5,
      rangeFraction: 0.125,
      rangeSeconds: 1,
      totalSeconds: 2,
    });
  });

  it('accounts for every inclusive phase range with the same original fraction formula', () => {
    for (let start = 0; start < phases.length; start += 1) {
      for (let end = start; end < phases.length; end += 1) {
        for (const cycleSeconds of [2, 8, 30]) {
          for (const repetitions of [1, 2, 3]) {
            const timeline = validTimeline(start, end, cycleSeconds, repetitions);
            const fraction = phases[end].end - phases[start].start;
            expect(timeline.rangeFraction).toBe(fraction);
            expect(timeline.rangeSeconds).toBe(cycleSeconds * fraction);
            expect(timeline.totalSeconds).toBe(timeline.rangeSeconds * repetitions);
          }
        }
      }
    }
  });

  it.each([
    [-1, 4],
    [0, 5],
    [3, 2],
    [0.5, 4],
    [0, 3.5],
    [Number.NaN, 4],
    [0, Number.NaN],
    [Number.POSITIVE_INFINITY, 4],
    [0, Number.POSITIVE_INFINITY],
    [Number.NEGATIVE_INFINITY, 4],
  ])('rejects invalid start/end indexes %s and %s', (start, end) => {
    const timeline = buildRehearsalTimeline(phases, start, end, 8, 1);
    expect(timeline.valid).toBe(false);
    if (!timeline.valid) expect(timeline.error).toContain('시작과 끝 단계를 확인해 주세요.');
  });

  it.each([0, 1, 31, -1, 2.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects invalid full-cycle display seconds %s',
    (cycleSeconds) => {
      const timeline = buildRehearsalTimeline(phases, 0, 4, cycleSeconds, 1);
      expect(timeline.valid).toBe(false);
      if (!timeline.valid) expect(timeline.error).toContain('2~30초');
    },
  );

  it.each([0, -1, 4, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects invalid repetition count %s',
    (repetitions) => {
      const timeline = buildRehearsalTimeline(phases, 0, 4, 8, repetitions);
      expect(timeline.valid).toBe(false);
      if (!timeline.valid) expect(timeline.error).toContain('1·2·3');
    },
  );
});

describe('rehearsal position and repetition boundaries', () => {
  const timeline: RehearsalValidTimeline = validTimeline(1, 2, 8, 3);

  it('moves the actual selected model progress at the retained full-cycle rate', () => {
    expect(resolveRehearsalPosition(timeline, 0)).toEqual({
      progress: 0.125,
      repetition: 1,
      atEnd: false,
      rangeElapsedSeconds: 0,
    });
    expect(resolveRehearsalPosition(timeline, 1.5)).toEqual({
      progress: 0.3125,
      repetition: 1,
      atEnd: false,
      rangeElapsedSeconds: 1.5,
    });
    expect(resolveRehearsalPosition(timeline, 4.5)).toEqual({
      progress: 0.3125,
      repetition: 2,
      atEnd: false,
      rangeElapsedSeconds: 1.5,
    });
    expect(resolveRehearsalPosition(timeline, 7.5)).toEqual({
      progress: 0.3125,
      repetition: 3,
      atEnd: false,
      rangeElapsedSeconds: 1.5,
    });
  });

  it('cuts to the start of the next repetition only at intermediate boundaries', () => {
    expect(resolveRehearsalPosition(timeline, 3)).toEqual({
      progress: 0.125,
      repetition: 2,
      atEnd: false,
      rangeElapsedSeconds: 0,
    });
    expect(resolveRehearsalPosition(timeline, 6)).toEqual({
      progress: 0.125,
      repetition: 3,
      atEnd: false,
      rangeElapsedSeconds: 0,
    });
    const beforeCut = resolveRehearsalPosition(timeline, 3 - 1e-8);
    expect(beforeCut.repetition).toBe(1);
    expect(beforeCut.progress).toBeCloseTo(0.5);
    expect(beforeCut.atEnd).toBe(false);
    const afterCut = resolveRehearsalPosition(timeline, 3 + 1e-8);
    expect(afterCut.repetition).toBe(2);
    expect(afterCut.progress).toBeCloseTo(0.125);
  });

  it('holds the final selected end rather than wrapping or exceeding the authored limit', () => {
    const end = { progress: 0.5, repetition: 3, atEnd: true, rangeElapsedSeconds: 3 };
    expect(resolveRehearsalPosition(timeline, 9)).toEqual(end);
    expect(resolveRehearsalPosition(timeline, 90_000)).toEqual(end);
    const justBeforeEnd = resolveRehearsalPosition(timeline, 9 - 1e-8);
    expect(justBeforeEnd.repetition).toBe(3);
    expect(justBeforeEnd.atEnd).toBe(false);
    expect(justBeforeEnd.progress).toBeLessThan(0.5);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'resolves invalid/nonfinite or negative elapsed time %s to the selected start',
    (elapsed) => {
      expect(resolveRehearsalPosition(timeline, elapsed)).toEqual(
        resolveRehearsalPosition(timeline, 0),
      );
    },
  );

  it('preserves exact computed cuts for nonbinary fractions as well as finite full-cycle ends', () => {
    const bounds = [0, 0.1, 0.3, 0.6, 0.9, 1];
    const nonbinaryPhases = phases.map((phase, index) => ({
      ...phase,
      start: bounds[index],
      end: bounds[index + 1],
      sample: (bounds[index] + bounds[index + 1]) / 2,
    }));
    const result = buildRehearsalTimeline(nonbinaryPhases, 1, 3, 7, 3);
    if (!result.valid) throw new Error(result.error);
    for (const completed of [1, 2]) {
      expect(resolveRehearsalPosition(result, result.rangeSeconds * completed)).toEqual({
        progress: result.startProgress,
        repetition: completed + 1,
        atEnd: false,
        rangeElapsedSeconds: 0,
      });
    }
    expect(resolveRehearsalPosition(result, result.totalSeconds)).toEqual({
      progress: result.endProgress,
      repetition: 3,
      atEnd: true,
      rangeElapsedSeconds: result.rangeSeconds,
    });
    const single = validTimeline(0, 4, 30, 1);
    expect(resolveRehearsalPosition(single, 30)).toEqual({
      progress: 1,
      repetition: 1,
      atEnd: true,
      rangeElapsedSeconds: 30,
    });
  });
});
