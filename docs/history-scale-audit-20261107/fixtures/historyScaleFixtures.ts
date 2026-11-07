import type {
  ClassGroup,
  PilatesExercise,
  SavedSequence,
  SequenceStep,
} from '../../../src/types/pilates';
import type {
  ClassHistoryLogWithSnapshot,
} from '../../../src/types/teachingHistorySnapshot';
import {
  buildTeachingProgramSnapshot,
} from '../../../src/utils/teachingHistorySnapshot';

export interface HistoryScaleFixtureBundle {
  scale: number;
  classGroups: ClassGroup[];
  savedSequences: SavedSequence[];
  exercises: PilatesExercise[];
  historyLogs: ClassHistoryLogWithSnapshot[];
  metadata: {
    sameNameClassTitle: string;
    sameNameLogIds: string[];
    longKoreanLogId: string;
    midnightBoundaryLogIds: string[];
    emptyGroupId: string;
    driftModifiedLogId: string;
    driftDeletedSnapshotLogId: string;
    driftDeletedUnrecoverableLogId: string;
  };
}

export const LONG_KOREAN_SEQUENCE_TITLE =
  '코어 안정화 및 흉추 신전·견갑골 하강 조절과 고관절 외회전-내전근 협응을 위한 리포머·캐딜락 복합 시퀀스 심화 프로그램 (초보자 허리 과신전 방지 및 호흡-골반저근 연결 큐잉 집중 55분 코스)';

export const LONG_KOREAN_GROUP_NAME =
  '화·목 저녁 2교시 직장인 체형교정 및 코어·둔근 강화 소그룹 집중 케어 A반 (정원 6명)';

export const LONG_KOREAN_REFLECTION = [
  '1교시 워밍업 풋워크 구간에서 우측 골반이 먼저 들리는 보상 패턴이 관찰되어 스프링을 2R1B에서 2R로 낮추고 천골 접지 큐잉을 먼저 제공함.',
  '헌드레드 진입 전 흉식 호흡에서 늑골 하각이 벌어지지 않도록 날숨 끝에서 복횡근 수축 유지를 3초간 확인한 뒤 컬업 높이를 조절함.',
  '브릿징 및 햄스트링 컬 연결 시 무릎 안쪽 흔들림을 줄이기 위해 미니볼 내전근 등척성 수축을 병행하였으며, 다음 수업에서는 사이드 킥 시리즈와 스완 프렙을 추가해 후면 사슬 협응을 점검할 예정.',
].join('\n');

const makeStep = (
  stepId: string,
  order: number,
  exerciseId: string,
  durationMin: number,
  customNote = '',
): SequenceStep => ({
  stepId,
  order,
  kind: 'exercise',
  exerciseId,
  blockCategory: order === 1 ? 'warmup' : order % 3 === 0 ? 'bridging' : 'core',
  durationMin,
  movementSec: Math.max(60, durationMin * 60 - 60),
  explanationSec: 30,
  transitionSec: 30,
  selectedLayer: 'standard',
  customNote,
});

export function buildSyntheticHistoryScaleDataset(
  count: 100 | 1000,
  baseExercises: PilatesExercise[],
): HistoryScaleFixtureBundle {
  const ex0 = baseExercises[0];
  const ex1 = baseExercises[1] ?? baseExercises[0];
  const ex2 = baseExercises[2] ?? baseExercises[0];
  const ex3 = baseExercises[3] ?? baseExercises[0];

  const classGroups: ClassGroup[] = [
    {
      id: 'scale-group-evening-a',
      name: '화·목 저녁 A반',
      type: 'group',
      defaultLevel: '1.5',
      scheduleLabel: '화·목 19:30',
      notes: '',
    },
    {
      id: 'scale-group-morning-b',
      name: '월·수·금 오전 B반',
      type: 'group',
      defaultLevel: '1.0',
      scheduleLabel: '월·수·금 10:00',
      notes: '',
    },
    {
      id: 'scale-group-private-c',
      name: '개인 레슨 집중반',
      type: 'private',
      defaultLevel: '2.0',
      scheduleLabel: '상시 예약',
      notes: '',
    },
    {
      id: 'scale-group-long-ko',
      name: LONG_KOREAN_GROUP_NAME,
      type: 'group',
      defaultLevel: '1.5',
      scheduleLabel: '화·목 20:30',
      notes: '',
    },
    {
      id: 'scale-group-empty-archive',
      name: '기록 없는 휴강·특강반 (빈필터 검증)',
      type: 'group',
      defaultLevel: '1.0',
      scheduleLabel: '토 09:00',
      notes: '',
    },
  ];

  const savedSequences: SavedSequence[] = [
    {
      id: 'scale-seq-recurring-core',
      title: '화·목 저녁 리포머 코어 & 골반 정렬 50분 (2026 가을 개편본)',
      subtitle: '현재 수정된 시퀀스 계획본',
      apparatus: 'reformer',
      level: '1.5',
      targetGroupId: 'scale-group-evening-a',
      steps: [
        makeStep('seq-step-1', 1, ex0.id, 10, '현재 계획본 노트'),
        makeStep('seq-step-2', 2, ex1.id, 15, '현재 계획본 노트 2'),
      ],
      createdAt: '2026-01-01T09:00:00.000Z',
      updatedAt: '2026-11-06T12:00:00.000Z',
      lastTaughtAt: '2026-11-06T19:30:00.000Z',
    },
  ];

  const exercises: PilatesExercise[] = baseExercises.map((item, idx) =>
    idx === 0 ? { ...item, nameKo: `${item.nameKo} (카탈로그 개정명)` } : item,
  );

  const sameNameClassTitle = '화·목 저녁 리포머 코어 & 골반 정렬 50분';
  const sameNameLogIds: string[] = [];
  const midnightBoundaryLogIds: string[] = [];
  const historyLogs: ClassHistoryLogWithSnapshot[] = [];

  const midnightCases = [
    {
      id: 'scale-log-midnight-1',
      taughtAt: '2026-11-06T14:50:00.000Z',
      title: sameNameClassTitle,
      groupId: 'scale-group-evening-a',
      groupName: '화·목 저녁 A반',
      note: '자정 전후 경계 테스트 1: UTC 14:50 (KST 23:50)',
    },
    {
      id: 'scale-log-midnight-2',
      taughtAt: '2026-11-06T15:10:00.000Z',
      title: sameNameClassTitle,
      groupId: 'scale-group-evening-a',
      groupName: '화·목 저녁 A반',
      note: '자정 전후 경계 테스트 2: UTC 15:10 (KST 익일 00:10)',
    },
    {
      id: 'scale-log-midnight-3',
      taughtAt: '2026-11-06T23:55:00.000Z',
      title: '심야 개인 레슨 흉추 가동성 플로우',
      groupId: 'scale-group-private-c',
      groupName: '개인 레슨 집중반',
      note: '자정 전후 경계 테스트 3: UTC 23:55 직전 기록',
    },
    {
      id: 'scale-log-midnight-4',
      taughtAt: '2026-11-07T00:05:00.000Z',
      title: '심야 개인 레슨 흉추 가동성 플로우',
      groupId: 'scale-group-private-c',
      groupName: '개인 레슨 집중반',
      note: '자정 전후 경계 테스트 4: UTC 00:05 직후 기록 (로컬 PST 기준 동일 일자이나 UTC 날짜 키 분리 여부 검증)',
    },
    {
      id: 'scale-log-midnight-5',
      taughtAt: '2026-11-05T12:00:00.000Z',
      title: sameNameClassTitle,
      groupId: 'scale-group-evening-a',
      groupName: '화·목 저녁 A반',
      note: '자정 전후 경계 테스트 5: LogSessionModal 기본 T12:00 저장 패턴',
    },
    {
      id: 'scale-log-midnight-6',
      taughtAt: '2026-11-05T00:00:00.000Z',
      title: sameNameClassTitle,
      groupId: 'scale-group-morning-b',
      groupName: '월·수·금 오전 B반',
      note: '자정 전후 경계 테스트 6: UTC 00:00 정각 기록',
    },
  ];

  for (const item of midnightCases) {
    midnightBoundaryLogIds.push(item.id);
    if (item.title === sameNameClassTitle) sameNameLogIds.push(item.id);
    historyLogs.push({
      id: item.id,
      sequenceId: 'scale-seq-recurring-core',
      sequenceTitle: item.title,
      groupId: item.groupId,
      groupName: item.groupName,
      apparatus: 'reformer',
      level: '1.5',
      taughtAt: item.taughtAt,
      actualDurationSec: 3000,
      actualRestDurationSec: 120,
      instructorReflection: item.note,
      intensity: 'moderate',
      rating: 5,
      exerciseIds: [ex0.id, ex1.id],
      stepsSnapshot: [
        makeStep(`${item.id}-s1`, 1, ex0.id, 25),
        makeStep(`${item.id}-s2`, 2, ex1.id, 25),
      ],
    });
  }

  const longKoreanLogId = 'scale-log-long-korean';
  const denseSteps: SequenceStep[] = Array.from({ length: 12 }, (_, idx) => {
    const chosen = [ex0, ex1, ex2, ex3][idx % 4];
    return makeStep(
      `long-ko-step-${idx + 1}`,
      idx + 1,
      chosen.id,
      idx % 2 === 0 ? 5 : 4,
      `단계 ${idx + 1} 상세 큐잉 메모`,
    );
  });
  historyLogs.push({
    id: longKoreanLogId,
    sequenceId: 'scale-seq-long-ko',
    sequenceTitle: LONG_KOREAN_SEQUENCE_TITLE,
    groupId: 'scale-group-long-ko',
    groupName: LONG_KOREAN_GROUP_NAME,
    apparatus: 'mixed',
    level: '2.0',
    taughtAt: '2026-11-04T19:30:00.000Z',
    actualDurationSec: 3300,
    actualRestDurationSec: 180,
    instructorReflection: LONG_KOREAN_REFLECTION,
    intensity: 'intense',
    rating: 5,
    exerciseIds: denseSteps.map((s) => s.exerciseId),
    stepsSnapshot: denseSteps,
  });

  const driftModifiedLogId = 'scale-log-drift-modified';
  const originalExercisesForDrift: PilatesExercise[] = baseExercises.map((item, idx) =>
    idx === 0
      ? {
          ...item,
          nameKo: '풋워크 오리지널 스냅샷 명칭 (개정 전 보존본)',
        }
      : item,
  );
  const driftModifiedSteps = [
    makeStep('drift-mod-s1', 1, ex0.id, 15, '당시 보존된 원본 스프링 및 큐잉 메모'),
    makeStep('drift-mod-s2', 2, ex1.id, 15, '두 번째 동작 메모'),
  ];
  const driftModifiedSnapshot = buildTeachingProgramSnapshot({
    sequenceId: 'scale-seq-recurring-core',
    sequenceTitle: '원본 보존 검증용 리포머 코어 시퀀스 (당시 제목)',
    sequenceSubtitle: '당시 부제 스냅샷',
    sourceKind: 'saved-sequence',
    apparatus: 'reformer',
    level: '1.5',
    targetMinutes: 30,
    taughtAt: '2026-11-03T19:30:00.000Z',
    groupId: 'scale-group-evening-a',
    steps: driftModifiedSteps,
    exercises: originalExercisesForDrift,
    reusableBlocks: [],
    humanDrafts: [],
    actualDurationSec: 1800,
  });
  historyLogs.push({
    id: driftModifiedLogId,
    sequenceId: 'scale-seq-recurring-core',
    sequenceTitle: '원본 보존 검증용 리포머 코어 시퀀스 (당시 제목)',
    groupId: 'scale-group-evening-a',
    groupName: '화·목 저녁 A반',
    apparatus: 'reformer',
    level: '1.5',
    taughtAt: '2026-11-03T19:30:00.000Z',
    actualDurationSec: 1800,
    instructorReflection: '원본 시퀀스와 동작 이름이 이후 수정되어도 당시 스냅샷이 그대로 유지되는지 검증.',
    intensity: 'moderate',
    rating: 5,
    exerciseIds: [ex0.id, ex1.id],
    stepsSnapshot: driftModifiedSteps,
    programSnapshot: driftModifiedSnapshot,
  });

  const driftDeletedSnapshotLogId = 'scale-log-drift-deleted-recoverable';
  const deletedExerciseItem: PilatesExercise = {
    ...ex0,
    id: 'ex-deleted-custom-historical-01',
    nameKo: '삭제된 창작 아티큘레이팅 브릿지 (스냅샷 보존 동작)',
    nameEn: 'Articulating Bridge Snapshot',
  };
  const driftDeletedSteps = [
    makeStep('drift-del-s1', 1, deletedExerciseItem.id, 12, '삭제되었으나 스냅샷에 보존된 동작'),
    makeStep('drift-del-s2', 2, ex1.id, 13),
  ];
  const driftDeletedProgramSnapshot = buildTeachingProgramSnapshot({
    sequenceId: 'scale-seq-deleted-ex',
    sequenceTitle: '삭제된 동작 포함 스냅샷 보존 수업 기록',
    sequenceSubtitle: '',
    sourceKind: 'active-draft',
    apparatus: 'reformer',
    level: '1.5',
    targetMinutes: 25,
    taughtAt: '2026-11-02T10:00:00.000Z',
    groupId: 'scale-group-morning-b',
    steps: driftDeletedSteps,
    exercises: [deletedExerciseItem, ...baseExercises],
    reusableBlocks: [],
    humanDrafts: [],
    actualDurationSec: 1500,
  });
  historyLogs.push({
    id: driftDeletedSnapshotLogId,
    sequenceId: 'scale-seq-deleted-ex',
    sequenceTitle: '삭제된 동작 포함 스냅샷 보존 수업 기록',
    groupId: 'scale-group-morning-b',
    groupName: '월·수·금 오전 B반',
    apparatus: 'reformer',
    level: '1.5',
    taughtAt: '2026-11-02T10:00:00.000Z',
    actualDurationSec: 1500,
    instructorReflection: '원본 동작 삭제 후에도 상세 모달에서 당시 스냅샷 정보를 열람 가능해야 함.',
    intensity: 'moderate',
    rating: 4,
    exerciseIds: [deletedExerciseItem.id, ex1.id],
    stepsSnapshot: driftDeletedSteps,
    programSnapshot: driftDeletedProgramSnapshot,
  });

  const driftDeletedUnrecoverableLogId = 'scale-log-drift-unrecoverable';
  historyLogs.push({
    id: driftDeletedUnrecoverableLogId,
    sequenceId: 'scale-seq-legacy-unrecoverable',
    sequenceTitle: '구버전 스냅샷 미보존 삭제 동작 수업 (재사용 차단 검증)',
    groupId: 'scale-group-morning-b',
    groupName: '월·수·금 오전 B반',
    apparatus: 'reformer',
    level: '1.0',
    taughtAt: '2026-11-01T10:00:00.000Z',
    instructorReflection: '구버전 기록에서 동작이 삭제되어 재사용 버튼이 안전하게 비활성화되는지 검증.',
    intensity: 'relaxed',
    rating: 3,
    exerciseIds: ['ex-legacy-missing-999'],
  });

  const baseUtcMs = Date.UTC(2026, 9, 31, 10, 30, 0);
  const activeGroups = classGroups.slice(0, 4);
  const remaining = count - historyLogs.length;

  for (let i = 0; i < remaining; i += 1) {
    const dayOffset = Math.floor(i / 3);
    const sessionSlot = i % 3;
    const hourOffsetMs = sessionSlot === 0 ? 0 : sessionSlot === 1 ? 4.5 * 3600_000 : 9.5 * 3600_000;
    const taughtAtIso = new Date(baseUtcMs - dayOffset * 86_400_000 + hourOffsetMs).toISOString();

    const isSameNameRecurring = i < 24;
    const group = activeGroups[i % activeGroups.length];
    const logId = `scale-log-gen-${String(i + 1).padStart(4, '0')}`;
    const title = isSameNameRecurring
      ? sameNameClassTitle
      : i % 5 === 0
        ? `리포머 & 체어 하체 정렬·둔근 활성화 시퀀스 #${i + 1}`
        : i % 5 === 1
          ? `오전 소그룹 코어 호흡 및 흉추 가동성 플로우 #${i + 1}`
          : i % 5 === 2
            ? `개인 레슨 척추 분절 및 견갑 안정화 집중 케어 #${i + 1}`
            : i % 5 === 3
              ? `캐딜락·배럴 전신 신전 및 고관절 유연성 회복 #${i + 1}`
              : `주말 집중 리포머 파워하우스 & 밸런스 챌린지 #${i + 1}`;

    if (isSameNameRecurring) sameNameLogIds.push(logId);

    const s1 = [ex0, ex1, ex2, ex3][i % 4];
    const s2 = [ex0, ex1, ex2, ex3][(i + 1) % 4];
    const s3 = [ex0, ex1, ex2, ex3][(i + 2) % 4];

    historyLogs.push({
      id: logId,
      sequenceId: isSameNameRecurring ? 'scale-seq-recurring-core' : `scale-seq-${(i % 15) + 1}`,
      sequenceTitle: title,
      groupId: group.id,
      groupName: group.name,
      apparatus: i % 4 === 0 ? 'mixed' : 'reformer',
      level: group.defaultLevel,
      taughtAt: taughtAtIso,
      actualDurationSec: 2700 + (i % 4) * 180,
      actualRestDurationSec: i % 2 === 0 ? 120 : 60,
      instructorReflection: `누적 기록 #${i + 1} (${taughtAtIso.slice(0, 10)}): ${group.name} 수업 완료. 호흡 템포와 골반 중립 유지 상태 양호.`,
      intensity: i % 3 === 0 ? 'relaxed' : i % 3 === 1 ? 'moderate' : 'intense',
      rating: ((i % 3) + 3) as 3 | 4 | 5,
      exerciseIds: [s1.id, s2.id, s3.id],
      stepsSnapshot: [
        makeStep(`${logId}-s1`, 1, s1.id, 12),
        makeStep(`${logId}-s2`, 2, s2.id, 18),
        makeStep(`${logId}-s3`, 3, s3.id, 15),
      ],
    });
  }

  return {
    scale: count,
    classGroups,
    savedSequences,
    exercises,
    historyLogs,
    metadata: {
      sameNameClassTitle,
      sameNameLogIds,
      longKoreanLogId,
      midnightBoundaryLogIds,
      emptyGroupId: 'scale-group-empty-archive',
      driftModifiedLogId,
      driftDeletedSnapshotLogId,
      driftDeletedUnrecoverableLogId,
    },
  };
}
