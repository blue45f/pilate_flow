import { APPARATUS_LABELS, CANONICAL_BLOCKS, INITIAL_HISTORY_LOGS } from '../data/pilatesCatalog';
import type {
  ApparatusType,
  ClassBlockCategory,
  ClassHistoryLog,
  PilatesExercise,
  SpinalPlane,
} from '../types/pilates';
import type {
  ClassHistoryLogWithSnapshot,
  ResolvedTeachingHistoryView,
} from '../types/teachingHistorySnapshot';
import { getStepTiming, isRestStep } from './sequenceEngine';
import { compareTeachingHistoryDates } from './teachingHistoryDate';

export type SpinalBalanceBucketId = 'neutral' | 'flexion' | 'extension' | 'lateral-rotation';

export interface SpinalPlaneBalanceMetric {
  readonly id: SpinalBalanceBucketId;
  readonly labelKo: string;
  readonly minutes: number;
  readonly sharePct: number;
}

export interface BodyFocusBalanceMetric {
  readonly category: ClassBlockCategory;
  readonly labelKo: string;
  readonly minutes: number;
  readonly stepCount: number;
  readonly sharePct: number;
}

export interface ApparatusShareMetric {
  readonly apparatus: ApparatusType | 'mixed';
  readonly labelKo: string;
  readonly sessionCount: number;
  readonly sharePct: number;
}

export interface TeachingBalanceInsightReport {
  readonly analyzedSessionCount: number;
  readonly snapshotSessionCount: number;
  readonly timedSessionCount: number;
  readonly totalMovementMinutes: number;
  readonly unclassifiedMovementMinutes: number;
  readonly avgActualOrPlannedMinutes: number | null;
  readonly avgRating: number;
  readonly spinalPlaneMetrics: readonly SpinalPlaneBalanceMetric[];
  readonly topBlockMetrics: readonly BodyFocusBalanceMetric[];
  readonly apparatusMetrics: readonly ApparatusShareMetric[];
  readonly underRepresentedPlaneId: SpinalBalanceBucketId | null;
  readonly coachingSuggestionKo: string;
  readonly recommendedPresetFocusKo: string;
}

const BUCKET_META: ReadonlyArray<{ id: SpinalBalanceBucketId; labelKo: string }> = [
  { id: 'neutral', labelKo: '중립 정렬' },
  { id: 'flexion', labelKo: '척추 굴곡' },
  { id: 'extension', labelKo: '척추 신전' },
  { id: 'lateral-rotation', labelKo: '측굴·회전' },
];

const exampleHistoryIds = new Set(INITIAL_HISTORY_LOGS.map((log) => log.id));
const secondsOrNull = (value: number | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
const ownValue = <T>(record: Record<string, T> | undefined, key: string): T | undefined =>
  record && Object.hasOwn(record, key) ? record[key] : undefined;
const roundMinutes = (seconds: number) => Number((seconds / 60).toFixed(1));

function planeBuckets(planes: readonly SpinalPlane[] | undefined): Set<SpinalBalanceBucketId> {
  const buckets = new Set<SpinalBalanceBucketId>();
  for (const plane of planes ?? []) {
    if (plane === 'lateral' || plane === 'rotation') buckets.add('lateral-rotation');
    else if (plane === 'neutral' || plane === 'extension' || plane === 'flexion')
      buckets.add(plane);
  }
  return buckets;
}

/** Historical composition uses preserved metadata and timing, never today's catalog defaults. */
export function computeTeachingBalanceInsight(params: {
  readonly actualLogs: readonly ClassHistoryLog[];
  readonly resolvedHistoryMap: ReadonlyMap<string, ResolvedTeachingHistoryView>;
  readonly exercisesMap: ReadonlyMap<string, PilatesExercise>;
  readonly maxSessions?: number;
}): TeachingBalanceInsightReport {
  const { actualLogs, resolvedHistoryMap, maxSessions = 10 } = params;
  const sessionLimit = Number.isFinite(maxSessions) ? Math.max(1, Math.floor(maxSessions)) : 10;
  const targetLogs = [...actualLogs]
    .filter((log) => !exampleHistoryIds.has(log.id))
    .sort(compareTeachingHistoryDates)
    .slice(0, sessionLimit);
  const planeSeconds: Record<SpinalBalanceBucketId, number> = {
    neutral: 0,
    flexion: 0,
    extension: 0,
    'lateral-rotation': 0,
  };
  const blockStats = new Map<ClassBlockCategory, { seconds: number; stepCount: number }>();
  const apparatusCounts = new Map<ApparatusType | 'mixed', number>();
  let totalMovementSec = 0;
  let unclassifiedMovementSec = 0;
  let totalSessionSec = 0;
  let timedSessionCount = 0;
  let snapshotSessionCount = 0;
  let ratingSum = 0;

  const countMovement = (
    category: ClassBlockCategory,
    movementSec: number,
    planes: readonly SpinalPlane[] | undefined,
  ) => {
    const seconds = secondsOrNull(movementSec) ?? 0;
    if (seconds === 0) return;
    totalMovementSec += seconds;
    const previous = blockStats.get(category) ?? { seconds: 0, stepCount: 0 };
    blockStats.set(category, {
      seconds: previous.seconds + seconds,
      stepCount: previous.stepCount + 1,
    });
    const buckets = planeBuckets(planes);
    if (buckets.size === 0) unclassifiedMovementSec += seconds;
    for (const bucket of buckets) planeSeconds[bucket] += seconds / buckets.size;
  };

  for (const log of targetLogs) {
    ratingSum += log.rating;
    const withSnapshot = log as ClassHistoryLogWithSnapshot;
    const program = withSnapshot.programSnapshot;
    const sequence = withSnapshot.sequenceSnapshot ?? program?.sequenceSnapshot;
    const rawSteps = sequence?.steps ?? log.stepsSnapshot;
    const resolved = resolvedHistoryMap.get(log.id);
    const apparatus = sequence?.apparatus ?? resolved?.apparatus ?? log.apparatus;
    apparatusCounts.set(apparatus, (apparatusCounts.get(apparatus) ?? 0) + 1);

    const snapshotPlannedSec =
      secondsOrNull(program?.timing.plannedTotalSec) ??
      secondsOrNull(sequence?.timeBreakdown.totalSec) ??
      (rawSteps ? rawSteps.reduce((sum, step) => sum + getStepTiming(step).totalSec, 0) : null);
    const sessionSec =
      secondsOrNull(log.actualDurationSec) ??
      secondsOrNull(program?.timing.actualDurationSec) ??
      snapshotPlannedSec;
    if (sessionSec !== null) {
      totalSessionSec += sessionSec;
      timedSessionCount += 1;
    }

    if (program && program.items.length > 0) {
      snapshotSessionCount += 1;
      for (const item of program.items) {
        if (item.kind === 'rest') continue;
        const savedExercise =
          item.exerciseSnapshot ?? ownValue(program.exercisesById, item.exerciseId);
        const savedMovement =
          item.movementSnapshot ?? ownValue(sequence?.exerciseSnapshots, item.exerciseId);
        countMovement(
          item.blockCategory,
          item.movementSec,
          savedExercise?.spinalPlanes ?? savedMovement?.spinalPlanes,
        );
      }
    } else if (rawSteps) {
      snapshotSessionCount += 1;
      for (const step of rawSteps) {
        if (isRestStep(step)) continue;
        const savedMovement = ownValue(sequence?.exerciseSnapshots, step.exerciseId);
        countMovement(
          step.blockCategory,
          getStepTiming(step).movementSec,
          savedMovement?.spinalPlanes,
        );
      }
    }
  }

  const classifiedMovementSec = totalMovementSec - unclassifiedMovementSec;
  const spinalPlaneMetrics = BUCKET_META.map(({ id, labelKo }) => ({
    id,
    labelKo,
    minutes: roundMinutes(planeSeconds[id]),
    sharePct:
      classifiedMovementSec > 0 ? Math.round((planeSeconds[id] / classifiedMovementSec) * 100) : 0,
  }));
  // A small share is a composition cue, not a physical assessment or a required prescription.
  const lowest = [...spinalPlaneMetrics].sort((a, b) => a.sharePct - b.sharePct)[0];
  const underRepresentedPlaneId =
    classifiedMovementSec > 0 &&
    unclassifiedMovementSec === 0 &&
    snapshotSessionCount === targetLogs.length &&
    lowest.sharePct < 18
      ? lowest.id
      : null;
  const incomplete = unclassifiedMovementSec > 0 || snapshotSessionCount < targetLogs.length;
  let coachingSuggestionKo =
    '분류된 움직임이 네 구간에 포함되어 있습니다. 수업 목표와 회원 컨디션에 맞춰 다음 구성을 검토해 주세요.';
  let recommendedPresetFocusKo = '최근 수업 구성 돌아보기';
  if (targetLogs.length === 0) {
    coachingSuggestionKo =
      '수업 완료 후 기록을 남기면 저장된 움직임 분류와 블록 분포를 이 기기에서 살펴볼 수 있습니다.';
    recommendedPresetFocusKo = '첫 수업 기록 대기 중';
  } else if (classifiedMovementSec === 0 || incomplete) {
    coachingSuggestionKo =
      '움직임 분류 또는 시간 스냅샷이 없는 기록이 있어 전체 구성을 판단할 수 없습니다. 보존된 정보가 있는 구간만 표시합니다.';
    recommendedPresetFocusKo = '기록 정보 확인 필요';
  } else if (underRepresentedPlaneId) {
    const label = BUCKET_META.find((bucket) => bucket.id === underRepresentedPlaneId)!.labelKo;
    coachingSuggestionKo = `선택한 기록에서 ${label} 비중이 가장 작습니다. 다음 계획에서 이 구간을 다룰지는 회원 컨디션과 수업 목표를 보고 강사가 판단해 주세요.`;
    recommendedPresetFocusKo = `${label} 구성 검토`;
  }

  return {
    analyzedSessionCount: targetLogs.length,
    snapshotSessionCount,
    timedSessionCount,
    totalMovementMinutes: roundMinutes(totalMovementSec),
    unclassifiedMovementMinutes: roundMinutes(unclassifiedMovementSec),
    avgActualOrPlannedMinutes:
      timedSessionCount > 0 ? Math.round(totalSessionSec / timedSessionCount / 60) : null,
    avgRating: targetLogs.length > 0 ? Number((ratingSum / targetLogs.length).toFixed(1)) : 0,
    spinalPlaneMetrics,
    topBlockMetrics: [...blockStats.entries()]
      .sort((a, b) => b[1].seconds - a[1].seconds)
      .slice(0, 4)
      .map(([category, stat]) => ({
        category,
        labelKo: CANONICAL_BLOCKS.find((item) => item.category === category)?.nameKo ?? category,
        minutes: roundMinutes(stat.seconds),
        stepCount: stat.stepCount,
        sharePct: totalMovementSec > 0 ? Math.round((stat.seconds / totalMovementSec) * 100) : 0,
      })),
    apparatusMetrics: [...apparatusCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([apparatus, sessionCount]) => ({
        apparatus,
        labelKo: apparatus === 'mixed' ? '여러 기구' : APPARATUS_LABELS[apparatus].ko,
        sessionCount,
        sharePct: Math.round((sessionCount / targetLogs.length) * 100),
      })),
    underRepresentedPlaneId,
    coachingSuggestionKo,
    recommendedPresetFocusKo,
  };
}
