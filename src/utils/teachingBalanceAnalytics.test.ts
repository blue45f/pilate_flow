import { describe, expect, it } from 'vitest';
import { INITIAL_EXERCISES, INITIAL_HISTORY_LOGS } from '../data/pilatesCatalog';
import type { ClassHistoryLog, PilatesExercise, SequenceStep } from '../types/pilates';
import type { ClassHistoryLogWithSnapshot } from '../types/teachingHistorySnapshot';
import { computeTeachingBalanceInsight } from './teachingBalanceAnalytics';
import {
  buildTeachingProgramSnapshot,
  resolveTeachingHistoryView,
} from './teachingHistorySnapshot';

const exercise: PilatesExercise = {
  ...INITIAL_EXERCISES[0],
  id: 'balance-exercise',
  nameKo: '스완이라고 불러도 분류는 보존 정보만 사용',
  spinalPlanes: ['neutral'],
};
const step = (overrides: Partial<SequenceStep> = {}): SequenceStep => ({
  stepId: 'balance-step',
  order: 1,
  exerciseId: exercise.id,
  blockCategory: 'core',
  durationMin: 2,
  explanationSec: 20,
  transitionSec: 10,
  selectedLayer: 'standard',
  ...overrides,
});
const log = (overrides: Partial<ClassHistoryLog> = {}): ClassHistoryLogWithSnapshot => ({
  ...INITIAL_HISTORY_LOGS[0],
  id: 'balance-log',
  taughtAt: '2026-11-12T10:00:00+09:00',
  exerciseIds: [exercise.id],
  stepsSnapshot: undefined,
  actualDurationSec: undefined,
  ...overrides,
});
function snapshotLog(
  steps: SequenceStep[] = [step()],
  exercises: PilatesExercise[] = [exercise],
): ClassHistoryLogWithSnapshot {
  const result = log();
  result.programSnapshot = buildTeachingProgramSnapshot({
    sequenceId: result.sequenceId,
    sequenceTitle: result.sequenceTitle,
    sourceKind: 'active-draft',
    taughtAt: result.taughtAt,
    capturedAt: result.taughtAt,
    groupId: result.groupId,
    steps,
    exercises,
  });
  return result;
}
function analyze(
  logs: ClassHistoryLogWithSnapshot[],
  liveExercises = [exercise],
  maxSessions?: number,
) {
  const exercisesMap = new Map(liveExercises.map((item) => [item.id, item]));
  return computeTeachingBalanceInsight({
    actualLogs: logs,
    resolvedHistoryMap: new Map(
      logs.map((item) => [item.id, resolveTeachingHistoryView(item, exercisesMap, [])]),
    ),
    exercisesMap,
    maxSessions,
  });
}

describe('preserved teaching composition analysis', () => {
  it('excludes demo records itself and selects the most recent dates without mutating input', () => {
    const older = log({ id: 'older', taughtAt: '2026-11-01', rating: 1 });
    const recent = log({ id: 'recent', taughtAt: '2026-11-12', rating: 5 });
    const logs = [older, INITIAL_HISTORY_LOGS[0], recent];
    const report = analyze(logs, [], 1);
    expect(report.analyzedSessionCount).toBe(1);
    expect(report.avgRating).toBe(5);
    expect(logs.map((item) => item.id)).toEqual(['older', INITIAL_HISTORY_LOGS[0].id, 'recent']);
    expect(analyze([INITIAL_HISTORY_LOGS[0]]).analyzedSessionCount).toBe(0);
  });

  it('retains frozen metadata after catalog changes/deletion and excludes explanation, transitions and rests', () => {
    const extension = {
      ...exercise,
      spinalPlanes: ['extension'] as PilatesExercise['spinalPlanes'],
    };
    const record = snapshotLog(
      [
        step(),
        step({ stepId: 'rest', exerciseId: '', kind: 'rest', durationMin: 3 }),
        step({ stepId: 'zero', durationMin: 0, explanationSec: 0, transitionSec: 0 }),
      ],
      [extension],
    );
    const changedCatalog = [
      { ...exercise, spinalPlanes: ['flexion'] as PilatesExercise['spinalPlanes'] },
    ];
    const report = analyze([record], changedCatalog);
    expect(report.totalMovementMinutes).toBe(1.5);
    expect(report.spinalPlaneMetrics.find((item) => item.id === 'extension')).toMatchObject({
      minutes: 1.5,
      sharePct: 100,
    });
    expect(report.spinalPlaneMetrics.find((item) => item.id === 'flexion')?.sharePct).toBe(0);
    expect(report.topBlockMetrics[0].stepCount).toBe(1);
    expect(analyze([record], []).spinalPlaneMetrics).toEqual(report.spinalPlaneMetrics);
  });

  it('uses each captured item before the shared exercise map and conserves split category time', () => {
    const record = snapshotLog([step(), step({ stepId: 'second', order: 2 })]);
    record.programSnapshot!.items[0].exerciseSnapshot!.spinalPlanes = [
      'extension',
      'rotation',
      'lateral',
      'rotation',
    ];
    record.programSnapshot!.items[1].exerciseSnapshot!.spinalPlanes = ['neutral'];
    const report = analyze([record]);
    expect(report.totalMovementMinutes).toBe(3);
    expect(report.spinalPlaneMetrics.find((item) => item.id === 'extension')?.sharePct).toBe(25);
    expect(report.spinalPlaneMetrics.find((item) => item.id === 'lateral-rotation')?.sharePct).toBe(
      25,
    );
    expect(report.spinalPlaneMetrics.find((item) => item.id === 'neutral')?.sharePct).toBe(50);
  });

  it('preserves P1 sequence snapshot classification without consulting live metadata', () => {
    const record = snapshotLog();
    record.sequenceSnapshot = record.programSnapshot!.sequenceSnapshot;
    expect(record.sequenceSnapshot).toBeDefined();
    record.programSnapshot = undefined;
    expect(
      analyze([record], []).spinalPlaneMetrics.find((item) => item.id === 'neutral')?.sharePct,
    ).toBe(100);
  });

  it('does not infer movement or balanced composition from a legacy name/category or missing snapshot', () => {
    const legacy = log({ stepsSnapshot: [step()] });
    const report = analyze([legacy]);
    expect(report.totalMovementMinutes).toBe(1.5);
    expect(report.unclassifiedMovementMinutes).toBe(1.5);
    expect(report.spinalPlaneMetrics.every((item) => item.sharePct === 0)).toBe(true);
    expect(report.underRepresentedPlaneId).toBeNull();
    expect(report.recommendedPresetFocusKo).toBe('기록 정보 확인 필요');
    const withoutSnapshot = analyze([log()]);
    expect(withoutSnapshot.avgActualOrPlannedMinutes).toBeNull();
    expect(withoutSnapshot.snapshotSessionCount).toBe(0);
    expect(withoutSnapshot.totalMovementMinutes).toBe(0);
  });

  it('does not fall through an explicitly empty saved classification to the changed catalog', () => {
    const record = snapshotLog([step()], [{ ...exercise, spinalPlanes: [] }]);
    const report = analyze([record]);
    expect(report.unclassifiedMovementMinutes).toBe(1.5);
    expect(report.underRepresentedPlaneId).toBeNull();
  });

  it('averages only known actual or saved plan times and preserves recorded zero', () => {
    const record = snapshotLog();
    record.actualDurationSec = 600;
    const unknown = log({ id: 'no-timing' });
    const zero = log({ id: 'zero-timing', actualDurationSec: 0 });
    const report = analyze([record, unknown, zero]);
    expect(report.analyzedSessionCount).toBe(3);
    expect(report.timedSessionCount).toBe(2);
    expect(report.avgActualOrPlannedMinutes).toBe(5);
    expect(analyze([snapshotLog()]).avgActualOrPlannedMinutes).toBe(2);
  });

  it('normalizes nonfinite/fractional analysis windows without losing all records', () => {
    expect(analyze([log()], [], Number.NaN).analyzedSessionCount).toBe(1);
    expect(analyze([log()], [], 0).analyzedSessionCount).toBe(1);
    expect(analyze([log(), log({ id: 'another' })], [], 1.9).analyzedSessionCount).toBe(1);
  });
});
