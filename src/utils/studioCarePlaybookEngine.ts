import type { DatedSequencePlanAssignment } from '../types/datedSequencePlanning';
import type { InstructorScheduleData, InstructorScheduleOccurrence } from '../types/instructorSchedule';
import type { ClassGroupProfile, ClassHistoryLog, SavedSequence } from '../types/pilates';

export type StudioCareCategory =
  | 'unplanned-class'
  | 'condition-orientation'
  | 'return-care'
  | 'routine-refresh';

export interface StudioCarePlaybookItem {
  readonly id: string;
  readonly category: StudioCareCategory;
  readonly badgeKo: string;
  readonly urgencyTone: 'amber' | 'sage' | 'terra' | 'slate';
  readonly targetLabelKo: string;
  readonly headlineKo: string;
  readonly rationaleKo: string;
  readonly checklistKo: readonly string[];
  readonly copyableMessageDraftKo: string;
  readonly relatedOccurrence?: {
    readonly classId: string;
    readonly originalDate: string;
    readonly date: string;
    readonly startTime: string;
  };
}

export interface StudioCareBriefing {
  readonly generatedForDate: string;
  readonly items: readonly StudioCarePlaybookItem[];
  readonly provenanceNoteKo: string;
}

function daysBetweenIso(fromIso: string, toIso: string): number {
  const parse = (iso: string): number => {
    const clean = iso.slice(0, 10);
    const [y, m, d] = clean.split('-').map(Number);
    return Date.UTC(y || 2026, (m || 1) - 1, d || 1);
  };
  return Math.round((parse(toIso) - parse(fromIso)) / 86_400_000);
}

/**
 * Synthesizes BodyCodi AI & Mariana Tek-inspired instructor studio care & communication playbooks
 * strictly from local schedule, group notes, and teaching history — zero external API calls,
 * zero automated messaging, and explicit local-record provenance.
 */
export function buildStudioCareBriefing(params: {
  readonly selectedDate: string;
  readonly occurrences: readonly InstructorScheduleOccurrence[];
  readonly schedule: InstructorScheduleData;
  readonly classGroups: readonly ClassGroupProfile[];
  readonly historyLogs: readonly ClassHistoryLog[];
  readonly savedSequences: readonly SavedSequence[];
  readonly datedAssignments: readonly DatedSequencePlanAssignment[];
}): StudioCareBriefing {
  const {
    selectedDate,
    occurrences,
    classGroups,
    historyLogs,
    savedSequences,
    datedAssignments,
  } = params;

  const items: StudioCarePlaybookItem[] = [];
  const activeOccurrences = occurrences.filter((row) => row.status === 'scheduled');

  // 1. Unplanned upcoming classes on selected date/week
  for (const row of activeOccurrences) {
    const hasDated = datedAssignments.some(
      (a) => a.classId === row.classId && a.originalDate === row.originalDate,
    );
    const hasLinked = Boolean(
      row.linkSavedSequenceId && savedSequences.some((s) => s.id === row.linkSavedSequenceId),
    );
    if (!hasDated && !hasLinked) {
      items.push({
        id: `care-unplanned-${row.classId}-${row.date}`,
        category: 'unplanned-class',
        badgeKo: '수업안 미연결',
        urgencyTone: 'amber',
        targetLabelKo: `${row.date} ${row.startTime} · ${row.title}`,
        headlineKo: '시작 전 시퀀스와 기구 스프링 구성을 연결해 두세요',
        rationaleKo:
          '아직 연결된 수업 시퀀스가 없어 현장 기구 전환 및 시간 배분이 흔들릴 수 있습니다.',
        checklistKo: [
          '저장한 수업 연결 또는 날짜별 맞춤 사본 배정',
          '수업 시작 5분 전 풋바·헤드레스트·기본 스프링 점검',
        ],
        copyableMessageDraftKo: `안녕하세요 회원님 :) ${row.date} ${row.startTime} '${row.title}' 수업을 앞두고 오늘 컨디션이나 특별히 뻐근한 부위(목·어깨·허리·손목 등)가 있으시면 편하게 말씀해 주세요. 맞춤 스프링과 완화 변형으로 준비해 두겠습니다!`,
        relatedOccurrence: {
          classId: row.classId,
          originalDate: row.originalDate,
          date: row.date,
          startTime: row.startTime,
        },
      });
      if (items.length >= 2) break;
    }
  }

  // 2. Group condition orientation (from classGroups notes / preferences)
  for (const group of classGroups) {
    const note = (group.notes || '').trim();
    if (!note) continue;
    const hasSensitivity = /목|어깨|손목|허리|무릎|골반|완화|초보|입문|체력|복귀/.test(note);
    if (!hasSensitivity) continue;
    items.push({
      id: `care-group-cond-${group.id}`,
      category: 'condition-orientation',
      badgeKo: group.type === 'private' ? '개인레슨 컨디션' : '그룹 컨디션 케어',
      urgencyTone: 'sage',
      targetLabelKo: `${group.name} (${group.scheduleLabel})`,
      headlineKo: '기록된 반 특성을 반영해 워밍업과 완화 레이어를 먼저 안내하세요',
      rationaleKo: `그룹 메모 근거: "${note.slice(0, 90)}${note.length > 90 ? '…' : ''}"`,
      checklistKo: [
        '초반 5분 흉곽 호흡·견갑 안정화로 과긴장 부위 이완',
        '플랭크·상체 지지 구간에서 완화(Easy) 레이어 대안 함께 제시',
      ],
      copyableMessageDraftKo: `${group.name} 회원님들, 오늘 수업은 평소 메모해 둔 컨디션 포인트(${note.slice(0, 36)})를 고려해 부담 없는 정렬 워밍업부터 차근차근 시작할 예정입니다. 수업 중 불편한 동작은 언제든 말씀해 주세요 :)`,
    });
    if (items.length >= 4) break;
  }

  // 3. Long gap / return care (groups with latest history log >= 10 days before selectedDate)
  for (const group of classGroups) {
    const groupLogs = historyLogs
      .filter((log) => log.groupId === group.id || log.groupName === group.name)
      .sort((a, b) => b.taughtAt.localeCompare(a.taughtAt));
    const latest = groupLogs[0];
    if (!latest) continue;
    const gapDays = daysBetweenIso(latest.taughtAt, selectedDate);
    if (gapDays >= 10) {
      items.push({
        id: `care-gap-${group.id}`,
        category: 'return-care',
        badgeKo: `${gapDays}일 공백 케어`,
        urgencyTone: 'terra',
        targetLabelKo: `${group.name} · 마지막 기록 ${latest.taughtAt.slice(0, 10)}`,
        headlineKo: '오랜만의 수업 복귀 감각을 깨우는 가동성 중심 도입부를 추천해요',
        rationaleKo: `최근 기록('${latest.sequenceTitle}') 이후 ${gapDays}일이 지났습니다. 첫 10분은 호흡과 척추 분절 감각 회복에 집중하면 만족도가 높아집니다.`,
        checklistKo: [
          '지난 수업 이후 일상 통증·컨디션 변화 30초 체크',
          '고강도 코어 진입 전 골반 시계·브리지 분절 충분히 확보',
        ],
        copyableMessageDraftKo: `안녕하세요 ${group.name} 회원님 :) 지난 '${latest.sequenceTitle}' 수업 이후 오랜만에 뵙네요! 굳어 있던 등·골반을 편안하게 깨우는 호흡과 스트레치부터 기분 좋게 준비해 두겠습니다. 내일 스튜디오에서 뵐게요!`,
      });
      break;
    }

    // 4. Consecutive identical sequence refresh check
    const secondLatest = groupLogs[1];
    if (secondLatest && secondLatest.sequenceId === latest.sequenceId) {
      items.push({
        id: `care-refresh-${group.id}`,
        category: 'routine-refresh',
        badgeKo: '시퀀스 리프레시',
        urgencyTone: 'slate',
        targetLabelKo: `${group.name} · '${latest.sequenceTitle}' 연속 진행`,
        headlineKo: '최근 2회 동일 시퀀스를 진행했어요 · 소도구나 측면·회전 변형을 더해 보세요',
        rationaleKo:
          '익숙한 흐름을 유지하되 써클링·미니볼 또는 측면(Lateral) 동작 1~2개만 변주해도 회원 체감 신선도가 크게 올라갑니다.',
        checklistKo: [
          '풋워크 또는 브리지 구간에 미니볼·써클링 내전근 연결 추가',
          '마무리 구간에 오픈북·머메이드 등 흉추 회전/측굴 배치',
        ],
        copyableMessageDraftKo: `${group.name} 회원님, 지난 시간 안정적으로 소화하신 '${latest.sequenceTitle}' 흐름을 바탕으로 이번 수업에는 새로운 소도구 협응 동작을 한 단계 더 준비했습니다. 함께 상쾌하게 움직여 봐요!`,
      });
      break;
    }
  }

  return {
    generatedForDate: selectedDate,
    items: items.slice(0, 4),
    provenanceNoteKo:
      '이 기기의 일정·그룹 메모·진행 기록만 읽어 정리한 강사용 참고 카드입니다 (외부 전송·자동 발송 없음).',
  };
}
