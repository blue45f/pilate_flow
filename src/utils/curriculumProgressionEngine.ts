import type { ClassHistoryLog, DifficultyLevel, PilatesExercise } from '../types/pilates';
import { isRestStep } from './sequenceEngine';

export interface WeeklyProgressionMilestone {
  weekNumber: 1 | 2 | 3 | 4;
  themeKo: string;
  recommendedLevel: DifficultyLevel;
  focusSpinalPlanes: ReadonlyArray<'flexion' | 'extension' | 'lateral' | 'rotation'>;
  noveltyRatioTarget: number;
  rationaleKo: string;
}

export interface GroupCurriculumProgressionReport {
  groupId: string;
  recentSessionCount: number;
  repeatedExerciseIds: string[];
  underusedSpinalPlanes: Array<'flexion' | 'extension' | 'lateral' | 'rotation'>;
  milestones: WeeklyProgressionMilestone[];
}

const ALL_PLANES: ReadonlyArray<'flexion' | 'extension' | 'lateral' | 'rotation'> = [
  'flexion',
  'extension',
  'lateral',
  'rotation',
];

/**
 * Analyzes a class group's recent teaching logs and synthesizes a 4-week progressive
 * Pilates curriculum plan balancing spinal movement planes and repetition novelty.
 */
export function buildFourWeekCurriculumProgression(input: {
  groupId: string;
  baseLevel: DifficultyLevel;
  historyLogs: readonly ClassHistoryLog[];
  exercises: readonly PilatesExercise[];
}): GroupCurriculumProgressionReport {
  const exerciseMap = new Map(input.exercises.map((ex) => [ex.id, ex]));
  const groupLogs = input.historyLogs
    .filter((log) => input.groupId === 'all' || log.groupId === input.groupId)
    .slice(0, 6);

  const exerciseCounts = new Map<string, number>();
  const planeCounts = new Map<'flexion' | 'extension' | 'lateral' | 'rotation', number>(
    ALL_PLANES.map((p) => [p, 0]),
  );

  for (const log of groupLogs) {
    const ids = log.stepsSnapshot
      ? log.stepsSnapshot.filter((st) => !isRestStep(st)).map((st) => st.exerciseId)
      : log.exerciseIds;

    for (const exId of new Set(ids)) {
      exerciseCounts.set(exId, (exerciseCounts.get(exId) ?? 0) + 1);
      const ex = exerciseMap.get(exId);
      for (const plane of ex?.spinalPlanes ?? []) {
        planeCounts.set(plane, (planeCounts.get(plane) ?? 0) + 1);
      }
    }
  }

  const repeatedExerciseIds = [...exerciseCounts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  const sortedPlanes = [...planeCounts.entries()].sort((a, b) => a[1] - b[1]);
  const underusedSpinalPlanes = sortedPlanes.slice(0, 2).map(([plane]) => plane);

  const elevatedLevel: DifficultyLevel =
    input.baseLevel === '1.0' ? '1.5' : input.baseLevel === '1.5' ? '2.0' : '2.0';

  const milestones: WeeklyProgressionMilestone[] = [
    {
      weekNumber: 1,
      themeKo: '1주차 · 호흡·중립 골반 정렬 및 기초 코어 인지',
      recommendedLevel: input.baseLevel,
      focusSpinalPlanes: ['flexion', underusedSpinalPlanes[0] ?? 'extension'],
      noveltyRatioTarget: 0.25,
      rationaleKo: '익숙한 기초 동작 75%로 호흡과 기구 세팅 안정감을 확보합니다.',
    },
    {
      weekNumber: 2,
      themeKo: '2주차 · 부족했던 척추 평면 보완 및 가동성 확장',
      recommendedLevel: input.baseLevel,
      focusSpinalPlanes:
        underusedSpinalPlanes.length >= 2
          ? [underusedSpinalPlanes[0]!, underusedSpinalPlanes[1]!]
          : ['extension', 'rotation'],
      noveltyRatioTarget: 0.35,
      rationaleKo: '최근 수업에서 비중이 낮았던 움직임 평면을 본운동 초반에 배치합니다.',
    },
    {
      weekNumber: 3,
      themeKo: '3주차 · 편측 협응 및 스프링 저항·레버리지 도전',
      recommendedLevel: elevatedLevel,
      focusSpinalPlanes: ['lateral', 'rotation'],
      noveltyRatioTarget: 0.4,
      rationaleKo: '좌우 비대칭 협응과 심화 레이어(Hard) 변형을 1~2개 도입합니다.',
    },
    {
      weekNumber: 4,
      themeKo: '4주차 · 전신 통합 플로우 및 주간 피드백 리캡',
      recommendedLevel: input.baseLevel,
      focusSpinalPlanes: ['flexion', 'extension', 'lateral', 'rotation'],
      noveltyRatioTarget: 0.2,
      rationaleKo: '4대 척추 움직임 평면을 고르게 연결하고 회원 성취감을 높입니다.',
    },
  ];

  return {
    groupId: input.groupId,
    recentSessionCount: groupLogs.length,
    repeatedExerciseIds,
    underusedSpinalPlanes,
    milestones,
  };
}
