import { describe, expect, it } from 'vitest';
import { INITIAL_EXERCISES, INITIAL_HISTORY_LOGS } from '../data/pilatesCatalog';
import type {
  ClassHistoryLog,
  PilatesExercise,
  SequenceStep,
  StepSideMode,
} from '../types/pilates';
import { buildHistoryInsights, buildPlanInsights } from './classInsights';

const exercise: PilatesExercise = {
  ...INITIAL_EXERCISES[0],
  id: 'analysis-exercise',
  nameKo: '검토용 동작',
  targetMuscles: ['코어', '둔근'],
  isUnilateral: true,
};
const step = (overrides: Partial<SequenceStep> = {}): SequenceStep => ({
  stepId: 'analysis-step',
  order: 1,
  exerciseId: exercise.id,
  blockCategory: 'core',
  durationMin: 2,
  selectedLayer: 'standard',
  ...overrides,
});
const log = (overrides: Partial<ClassHistoryLog> = {}): ClassHistoryLog => ({
  ...INITIAL_HISTORY_LOGS[0],
  id: 'my-record',
  intensity: 'moderate',
  rating: 3,
  ...overrides,
});

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    Object.values(value).forEach((child) => deepFreeze(child));
  }
  return value;
}

describe('declared plan composition', () => {
  it('conserves whole-plan timing and keeps rest out of movement, tags, and sides', () => {
    const result = buildPlanInsights(
      [
        step({ explanationSec: 20, transitionSec: 10, sideMode: 'left' }),
        step({ stepId: 'rest', kind: 'rest', exerciseId: '', durationMin: 0.5 }),
      ],
      [exercise],
    );
    expect(result).toMatchObject({
      totalSec: 150,
      movementSec: 90,
      explanationSec: 20,
      transitionSec: 10,
      restSec: 30,
      exerciseStepCount: 1,
      restStepCount: 1,
    });
    expect(result.movementSec + result.explanationSec + result.transitionSec + result.restSec).toBe(
      result.totalSec,
    );
    expect(result.sideRows).toHaveLength(1);
    expect(result.sides).toEqual({ leftSec: 90, rightSec: 0, togetherSec: 0, unspecifiedSec: 0 });
    expect(result.bodyTags.every((tag) => tag.movementSec === 90)).toBe(true);
  });

  it('credits overlapping tags their full movement time once per unique trimmed tag', () => {
    const result = buildPlanInsights(
      [step()],
      [{ ...exercise, targetMuscles: ['코어', ' 코어 ', '', '둔근', '둔근'] }],
    );
    expect(result.bodyTags).toHaveLength(2);
    expect(result.bodyTags).toEqual(
      expect.arrayContaining([
        { label: '코어', movementSec: 120, stepCount: 1, shareOfMovement: 1 },
        { label: '둔근', movementSec: 120, stepCount: 1, shareOfMovement: 1 },
      ]),
    );
    expect(result.bodyTags.reduce((sum, tag) => sum + tag.shareOfMovement, 0)).toBe(2);
  });

  it('separates missing exercises from empty tags and retains all movement in the denominator', () => {
    const result = buildPlanInsights(
      [
        step(),
        step({ stepId: 'untagged', exerciseId: 'untagged' }),
        step({ stepId: 'missing', exerciseId: 'missing' }),
      ],
      [exercise, { ...exercise, id: 'untagged', targetMuscles: [] }],
    );
    expect(result.untagged).toEqual({ movementSec: 120, stepCount: 1 });
    expect(result.missingExercise).toEqual({ movementSec: 120, stepCount: 1 });
    expect(result.movementSec).toBe(360);
    expect(result.bodyTags.every((tag) => tag.shareOfMovement === 1 / 3)).toBe(true);
  });

  it('uses only explicitly declared anatomical sides and keeps default unilateral sides unknown', () => {
    const modes: Array<StepSideMode | undefined> = [
      'left',
      'right',
      'left-then-right',
      'right-then-left',
      'together',
      undefined,
    ];
    const result = buildPlanInsights(
      modes.map((sideMode, index) =>
        step({
          stepId: String(index),
          durationMin: 1.75,
          explanationSec: 20,
          transitionSec: 10,
          sideMode,
        }),
      ),
      [exercise],
    );
    expect(result.sides).toEqual({
      leftSec: 150,
      rightSec: 150,
      togetherSec: 75,
      unspecifiedSec: 75,
    });
    expect(result.sideRows[2]).toMatchObject({
      labels: ['왼쪽', '오른쪽'],
      leftSec: 37.5,
      rightSec: 37.5,
    });
    expect(result.sideRows[3].labels).toEqual(['오른쪽', '왼쪽']);
    expect(result.sideRows[5]).toMatchObject({
      labels: ['첫 번째 쪽', '반대쪽'],
      leftSec: 0,
      rightSec: 0,
      unspecifiedSec: 75,
    });
    expect(Object.values(result.sides).reduce((sum, sec) => sum + sec, 0)).toBe(result.movementSec);
  });

  it('keeps undeclared bilateral metadata distinct from an explicit together choice', () => {
    const result = buildPlanInsights([step()], [{ ...exercise, isUnilateral: false }]);
    expect(result.sides).toEqual({ leftSec: 0, rightSec: 0, togetherSec: 0, unspecifiedSec: 120 });
    expect(result.sideRows[0].labels).toEqual(['함께']);
  });

  it('keeps missing-exercise side labels unknown while retaining explicit anatomical sides', () => {
    const result = buildPlanInsights(
      [step(), step({ stepId: 'explicit-left', sideMode: 'left' })],
      [],
    );
    expect(result.sideRows[0]).toMatchObject({
      labels: ['좌우 정보 없음'],
      leftSec: 0,
      rightSec: 0,
      togetherSec: 0,
      unspecifiedSec: 120,
    });
    expect(result.sideRows[1]).toMatchObject({ labels: ['왼쪽'], leftSec: 120 });
  });

  it('handles empty, rest-only, and zero-duration plans without invalid percentages', () => {
    expect(buildPlanInsights([], []).totalSec).toBe(0);
    const restOnly = buildPlanInsights(
      [step({ kind: 'rest', exerciseId: '', durationMin: 1 })],
      [],
    );
    expect(restOnly).toMatchObject({
      totalSec: 60,
      movementSec: 0,
      restSec: 60,
      bodyTags: [],
      sideRows: [],
    });
    const zero = buildPlanInsights([step({ durationMin: 0 })], [exercise]);
    expect(zero.bodyTags.every((tag) => tag.shareOfMovement === 0)).toBe(true);
  });

  it('does not mutate frozen inputs or reorder the draft', () => {
    const steps = deepFreeze([step({ order: 2 }), step({ stepId: 'second', order: 1 })]);
    const exercises = deepFreeze([structuredClone(exercise)]);
    const before = structuredClone({ steps, exercises });
    buildPlanInsights(steps, exercises);
    expect({ steps, exercises }).toEqual(before);
  });
});

describe('historical plans and directly recorded values', () => {
  it('uses only the history snapshot for planned timing and labels the recorded target separately', () => {
    const result = buildHistoryInsights([
      log({
        stepsSnapshot: [
          step({ durationMin: 3 }),
          step({ kind: 'rest', exerciseId: '', durationMin: 1 }),
        ],
        criteriaSnapshot: {
          apparatus: 'mat',
          level: '1.0',
          focusPreset: 'full-body',
          preferredProps: [],
          excludeDaysWindow: 0,
          targetMinutes: 50,
          defaultLayer: 'standard',
        },
        actualDurationSec: 300,
        actualRestDurationSec: 40,
      }),
    ]);
    expect(result.rows[0]).toMatchObject({
      plannedTotalSec: 240,
      plannedRestSec: 60,
      recordedTargetSec: 3000,
      actualTotalSec: 300,
      actualRestSec: 40,
      totalDeltaSec: 60,
      restDeltaSec: -20,
    });
    expect(result.rows[0]).not.toHaveProperty('actualMovementSec');
  });

  it('preserves explicit zero actual values and an explicitly empty plan snapshot', () => {
    const result = buildHistoryInsights([
      log({ stepsSnapshot: [], actualDurationSec: 0, actualRestDurationSec: 0 }),
    ]);
    expect(result.rows[0]).toMatchObject({
      plannedTotalSec: 0,
      plannedRestSec: 0,
      actualTotalSec: 0,
      actualRestSec: 0,
      totalDeltaSec: 0,
      restDeltaSec: 0,
    });
    expect(result).toMatchObject({
      actualTotalCount: 1,
      actualRestCount: 1,
      plannedSnapshotCount: 1,
    });
  });

  it('keeps missing snapshots and missing actual values unknown rather than zero or current plans', () => {
    const result = buildHistoryInsights([log()]);
    expect(result.rows[0]).toMatchObject({
      plannedTotalSec: null,
      plannedRestSec: null,
      actualTotalSec: null,
      actualRestSec: null,
      totalDeltaSec: null,
      restDeltaSec: null,
      recordedTargetSec: null,
    });
    expect(result).toMatchObject({
      actualTotalCount: 0,
      actualRestCount: 0,
      plannedSnapshotCount: 0,
    });
  });

  it.each([NaN, Infinity, -Infinity, -1])(
    'treats invalid recorded seconds %s as unknown',
    (value) => {
      const result = buildHistoryInsights([
        log({ stepsSnapshot: [step()], actualDurationSec: value, actualRestDurationSec: value }),
      ]);
      expect(result.rows[0]).toMatchObject({
        actualTotalSec: null,
        actualRestSec: null,
        totalDeltaSec: null,
        restDeltaSec: null,
      });
    },
  );

  it('does not invent an actual total when only actual rest was recorded', () => {
    const result = buildHistoryInsights([log({ actualRestDurationSec: 0 })]);
    expect(result.rows[0]).toMatchObject({
      actualTotalSec: null,
      actualRestSec: 0,
      totalDeltaSec: null,
    });
    expect(result).toMatchObject({ actualTotalCount: 0, actualRestCount: 1 });
  });

  it('excludes initial examples by ID by default and labels every example when included', () => {
    const logs = [...INITIAL_HISTORY_LOGS, log()];
    const normal = buildHistoryInsights(logs);
    expect(normal.rows.map((row) => row.id)).toEqual(['my-record']);
    expect(normal.excludedExamples).toBe(INITIAL_HISTORY_LOGS.length);
    const all = buildHistoryInsights(logs, { includeExamples: true });
    expect(all.rows.filter((row) => row.isExample)).toHaveLength(INITIAL_HISTORY_LOGS.length);
    expect(all.rows.find((row) => row.id === 'my-record')?.isExample).toBe(false);
  });

  it('keeps intensity categorical and satisfaction independent without ordinal averages', () => {
    const result = buildHistoryInsights([
      log({ id: 'a', intensity: 'relaxed', rating: 5 }),
      log({ id: 'b', intensity: 'moderate', rating: 1 }),
      log({ id: 'c', intensity: 'intense', rating: 3 }),
    ]);
    expect(result.intensityCounts).toEqual({ relaxed: 1, moderate: 1, intense: 1 });
    expect(result.rows.map((row) => [row.intensity, row.rating])).toEqual([
      ['relaxed', 5],
      ['moderate', 1],
      ['intense', 3],
    ]);
    expect(result).not.toHaveProperty('averageIntensity');
    expect(result).not.toHaveProperty('averageRating');
  });

  it('does not mutate frozen history records or their snapshots', () => {
    const logs = deepFreeze([log({ stepsSnapshot: [step()], actualDurationSec: 0 })]);
    const before = structuredClone(logs);
    buildHistoryInsights(logs);
    expect(logs).toEqual(before);
  });

  it('orders recorded lessons by their actual instant across valid timezone offsets', () => {
    const result = buildHistoryInsights([
      log({ id: 'earlier-local-date', taughtAt: '2026-11-05T01:00:00+09:00' }),
      log({ id: 'later-instant', taughtAt: '2026-11-04T23:00:00Z' }),
    ]);
    expect(result.rows.map((row) => row.id)).toEqual(['later-instant', 'earlier-local-date']);
  });
});
