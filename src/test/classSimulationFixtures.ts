import type { PilatesExercise, SequenceStep } from '../types/pilates';
import { syntheticPlanningExercise } from './planningFixtures';

/** Synthetic arithmetic fixtures only; no original catalog record is approved or edited. */
export function classSimulationFixture(
  targetMinutes: 17 | 50 | 60 = 50,
  oddPairedMovement = false,
): {
  title: string;
  targetMinutes: number;
  exercises: PilatesExercise[];
  steps: SequenceStep[];
  expected: {
    totalSec: number;
    movementSec: number;
    teachingSec: number;
    transitionSec: number;
    restSec: number;
    pairedSideSec: number;
  };
} {
  const exercises = [
    syntheticPlanningExercise('mat', 'warmup'),
    syntheticPlanningExercise('mat', 'lower-body'),
    syntheticPlanningExercise('mat', 'cooldown'),
  ];
  const budgets = {
    17: [240, 360, 120, 300],
    50: [840, 1020, 120, 1020],
    60: [1020, 1080, 300, 1200],
  }[targetMinutes];
  const [firstSec, pairedSec, restSec, lastSec] = budgets;
  const oddSecond = oddPairedMovement ? 1 : 0;
  const steps: SequenceStep[] = [
    {
      stepId: 'qa-class-simulation-first',
      order: 7,
      exerciseId: exercises[0].id,
      blockCategory: 'warmup',
      durationMin: (firstSec - oddSecond) / 60,
      explanationSec: 30,
      transitionSec: 30,
      selectedLayer: 'standard',
      repetitions: 8,
      sets: 2,
      sideMode: 'together',
      instructorNote: '합성 QA 첫 블록 메모 · 실제 운동용 아님',
      locked: true,
    },
    {
      stepId: 'qa-class-simulation-paired',
      order: 2,
      exerciseId: exercises[1].id,
      blockCategory: 'lower-body',
      durationMin: (pairedSec + oddSecond) / 60,
      explanationSec: 30,
      transitionSec: 30,
      selectedLayer: 'easy',
      repetitions: 12,
      sets: 3,
      sideMode: 'left-then-right',
    },
    {
      kind: 'rest',
      stepId: 'qa-class-simulation-rest',
      order: 15,
      exerciseId: '',
      blockCategory: 'core',
      durationMin: restSec / 60,
      selectedLayer: 'standard',
      instructorNote: '합성 QA 휴식 메모 · 운동 큐 아님',
    },
    {
      stepId: 'qa-class-simulation-last',
      order: 1,
      exerciseId: exercises[2].id,
      blockCategory: 'cooldown',
      durationMin: lastSec / 60,
      explanationSec: 45,
      transitionSec: 15,
      selectedLayer: 'hard',
      sideMode: 'right',
    },
  ];
  return {
    title: `합성 QA 전체 수업 ${targetMinutes}분 · 실제 운동 아님`,
    targetMinutes,
    exercises,
    steps,
    expected: {
      totalSec: targetMinutes * 60,
      movementSec: { 17: 720, 50: 2700, 60: 3120 }[targetMinutes],
      teachingSec: 105,
      transitionSec: 75,
      restSec,
      pairedSideSec: (pairedSec + oddSecond - 60) / 2,
    },
  };
}
