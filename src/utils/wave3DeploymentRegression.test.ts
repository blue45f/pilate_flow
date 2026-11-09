import { describe, expect, it } from 'vitest';
import { INITIAL_EXERCISES, INITIAL_HISTORY_LOGS } from '../data/pilatesCatalog';
import type { SequenceStep } from '../types/pilates';
import { buildPlanInsights } from './classInsights';
import { buildFourWeekCurriculumProgression } from './curriculumProgressionEngine';

const exercise = { ...INITIAL_EXERCISES[0], id: 'synthetic-neutral-movement' };
const step: SequenceStep = {
  stepId: 'synthetic-neutral-step', order: 1, exerciseId: exercise.id,
  blockCategory: 'core', durationMin: 2, selectedLayer: 'standard',
};

describe('movement-plane deployment regression', () => {
  it('does not count neutral as a movement plane or duplicate declared plane time', () => {
    const report = buildPlanInsights([step], [
      { ...exercise, spinalPlanes: ['neutral', 'flexion', 'flexion'] },
    ]);
    expect(report.movementSec).toBe(120);
    expect(report.spinalPlanes).toHaveLength(4);
    expect(report.spinalPlanes.find((item) => item.plane === 'flexion'))
      .toMatchObject({ movementSec: 120, stepCount: 1 });
    expect(report.spinalPlanes.filter((item) => item.plane !== 'flexion')
      .every((item) => item.movementSec === 0 && item.stepCount === 0)).toBe(true);
  });

  it('keeps neutral out of curriculum recommendations and supports all-group history', () => {
    const historyLogs = [
      { ...INITIAL_HISTORY_LOGS[0], id: 'synthetic-history', groupId: 'synthetic-group',
        exerciseIds: [exercise.id], stepsSnapshot: [step] },
    ];
    const report = buildFourWeekCurriculumProgression({
      groupId: 'all', baseLevel: '1.0', historyLogs,
      exercises: [{ ...exercise, spinalPlanes: ['neutral', 'flexion'] }],
    });
    expect(report.recentSessionCount).toBe(1);
    expect(report.underusedSpinalPlanes).toEqual(['extension', 'lateral']);
    expect(report.milestones.flatMap((item) => item.focusSpinalPlanes)).not.toContain('neutral');
    expect(buildFourWeekCurriculumProgression({
      groupId: 'other-group', baseLevel: '1.0', historyLogs, exercises: [exercise],
    }).recentSessionCount).toBe(0);
  });
});
