import { INITIAL_HISTORY_LOGS } from '../data/pilatesCatalog';
import type { ClassHistoryLog, PilatesExercise, SequenceStep } from '../types/pilates';
import { getStepSideLabels, getStepTiming, isRestStep } from './sequenceEngine';

export interface SideBudget {
  leftSec: number;
  rightSec: number;
  togetherSec: number;
  unspecifiedSec: number;
}

export interface BodyTagCoverage {
  label: string;
  movementSec: number;
  stepCount: number;
  shareOfMovement: number;
}

export interface PlanInsights {
  totalSec: number;
  movementSec: number;
  explanationSec: number;
  transitionSec: number;
  restSec: number;
  exerciseStepCount: number;
  restStepCount: number;
  bodyTags: BodyTagCoverage[];
  missingExercise: { movementSec: number; stepCount: number };
  untagged: { movementSec: number; stepCount: number };
  sides: SideBudget;
  sideRows: Array<
    SideBudget & { stepId: string; name: string; labels: string[]; movementSec: number }
  >;
}

const emptySides = (): SideBudget => ({
  leftSec: 0,
  rightSec: 0,
  togetherSec: 0,
  unspecifiedSec: 0,
});

/** Declared planning metadata and time budgets, never measured muscle or physical load. */
export function buildPlanInsights(
  steps: readonly SequenceStep[],
  exercises: readonly PilatesExercise[],
): PlanInsights {
  const exerciseMap = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const coverage = new Map<string, Omit<BodyTagCoverage, 'shareOfMovement'>>();
  const result: PlanInsights = {
    totalSec: 0,
    movementSec: 0,
    explanationSec: 0,
    transitionSec: 0,
    restSec: 0,
    exerciseStepCount: 0,
    restStepCount: 0,
    bodyTags: [],
    missingExercise: { movementSec: 0, stepCount: 0 },
    untagged: { movementSec: 0, stepCount: 0 },
    sides: emptySides(),
    sideRows: [],
  };
  for (const step of steps) {
    const rest = isRestStep(step);
    const exercise = rest ? undefined : exerciseMap.get(step.exerciseId);
    const timing = getStepTiming(step, exercise);
    result.totalSec += timing.totalSec;
    if (rest) {
      result.restStepCount += 1;
      result.restSec += timing.totalSec;
      continue;
    }
    result.exerciseStepCount += 1;
    result.movementSec += timing.movementSec;
    result.explanationSec += timing.explanationSec;
    result.transitionSec += timing.transitionSec;
    const tags = [
      ...new Set(exercise?.targetMuscles.map((tag) => tag.trim()).filter(Boolean) ?? []),
    ];
    if (!exercise || !tags.length) {
      const unknown = exercise ? result.untagged : result.missingExercise;
      unknown.movementSec += timing.movementSec;
      unknown.stepCount += 1;
    }
    for (const label of tags) {
      const tag = coverage.get(label) ?? { label, movementSec: 0, stepCount: 0 };
      tag.movementSec += timing.movementSec;
      tag.stepCount += 1;
      coverage.set(label, tag);
    }
    const sides = emptySides();
    switch (step.sideMode) {
      case 'left':
        sides.leftSec = timing.movementSec;
        break;
      case 'right':
        sides.rightSec = timing.movementSec;
        break;
      case 'left-then-right':
      case 'right-then-left':
        sides.leftSec = timing.perSideSec;
        sides.rightSec = timing.perSideSec;
        break;
      case 'together':
        sides.togetherSec = timing.movementSec;
        break;
      default:
        sides.unspecifiedSec = timing.movementSec;
    }
    result.sides.leftSec += sides.leftSec;
    result.sides.rightSec += sides.rightSec;
    result.sides.togetherSec += sides.togetherSec;
    result.sides.unspecifiedSec += sides.unspecifiedSec;
    result.sideRows.push({
      ...sides,
      stepId: step.stepId,
      name: exercise?.nameKo ?? '동작 정보 없음',
      labels: exercise || step.sideMode ? getStepSideLabels(step, exercise) : ['좌우 정보 없음'],
      movementSec: timing.movementSec,
    });
  }
  result.bodyTags = [...coverage.values()]
    .map((tag) => ({
      ...tag,
      shareOfMovement: result.movementSec > 0 ? tag.movementSec / result.movementSec : 0,
    }))
    .sort((a, b) => b.movementSec - a.movementSec || a.label.localeCompare(b.label, 'ko'));
  return result;
}

export interface HistoryInsightRow {
  id: string;
  sequenceTitle: string;
  groupName: string;
  taughtAt: string;
  isExample: boolean;
  plannedTotalSec: number | null;
  plannedRestSec: number | null;
  recordedTargetSec: number | null;
  actualTotalSec: number | null;
  actualRestSec: number | null;
  totalDeltaSec: number | null;
  restDeltaSec: number | null;
  intensity: ClassHistoryLog['intensity'];
  rating: ClassHistoryLog['rating'];
}

export interface HistoryInsights {
  rows: HistoryInsightRow[];
  excludedExamples: number;
  intensityCounts: Record<ClassHistoryLog['intensity'], number>;
  actualTotalCount: number;
  actualRestCount: number;
  plannedSnapshotCount: number;
}

const exampleHistoryIds = new Set(INITIAL_HISTORY_LOGS.map((log) => log.id));
const recordedSeconds = (value: number | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;

/** Historical plan values come exclusively from the individual record's stepsSnapshot. */
export function buildHistoryInsights(
  logs: readonly ClassHistoryLog[],
  { includeExamples = false }: { includeExamples?: boolean } = {},
): HistoryInsights {
  const result: HistoryInsights = {
    rows: [],
    excludedExamples: 0,
    intensityCounts: { relaxed: 0, moderate: 0, intense: 0 },
    actualTotalCount: 0,
    actualRestCount: 0,
    plannedSnapshotCount: 0,
  };
  for (const log of logs) {
    const isExample = exampleHistoryIds.has(log.id);
    if (isExample && !includeExamples) {
      result.excludedExamples += 1;
      continue;
    }
    let plannedTotalSec: number | null = null;
    let plannedRestSec: number | null = null;
    if (log.stepsSnapshot !== undefined) {
      plannedTotalSec = 0;
      plannedRestSec = 0;
      result.plannedSnapshotCount += 1;
      for (const step of log.stepsSnapshot) {
        const timing = getStepTiming(step);
        const rest = isRestStep(step);
        plannedTotalSec += timing.totalSec;
        if (rest) plannedRestSec += timing.totalSec;
      }
    }
    const actualTotalSec = recordedSeconds(log.actualDurationSec);
    const actualRestSec = recordedSeconds(log.actualRestDurationSec);
    const targetMinutes = recordedSeconds(log.criteriaSnapshot?.targetMinutes);
    if (actualTotalSec !== null) result.actualTotalCount += 1;
    if (actualRestSec !== null) result.actualRestCount += 1;
    result.intensityCounts[log.intensity] += 1;
    result.rows.push({
      id: log.id,
      sequenceTitle: log.sequenceTitle,
      groupName: log.groupName,
      taughtAt: log.taughtAt,
      isExample,
      plannedTotalSec,
      plannedRestSec,
      recordedTargetSec: targetMinutes === null ? null : targetMinutes * 60,
      actualTotalSec,
      actualRestSec,
      totalDeltaSec:
        actualTotalSec !== null && plannedTotalSec !== null
          ? actualTotalSec - plannedTotalSec
          : null,
      restDeltaSec:
        actualRestSec !== null && plannedRestSec !== null ? actualRestSec - plannedRestSec : null,
      intensity: log.intensity,
      rating: log.rating,
    });
  }
  result.rows.sort((a, b) => Date.parse(b.taughtAt) - Date.parse(a.taughtAt));
  return result;
}
