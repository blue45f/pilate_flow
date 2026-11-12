import React, { useMemo, useState } from 'react';
import { CalendarPlus, CheckCircle2, RotateCcw, Sparkles, Wand2 } from 'lucide-react';
import { getEquipmentFamilies } from '../data/equipmentCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import type {
  InstructorLocation,
  InstructorScheduleData,
  InstructorScheduledClass,
  InstructorScheduleOccurrence,
} from '../types/instructorSchedule';
import type { ApparatusType, DifficultyLevel, SavedSequence } from '../types/pilates';
import {
  addScheduleDays,
  expandInstructorSchedule,
  formatScheduleDate,
  formatScheduleTime,
  localScheduleDate,
  scheduleMinutes,
  scheduleWeekStart,
} from '../utils/instructorSchedule';
import { resolveClassCardVisualMeta } from '../utils/memberBookingBridge';
import { SpringVisualPills } from './SpringVisualPills';

interface WeeklyPresetSpec {
  id: string;
  titleKo: string;
  subtitleKo: string;
  badgeKo: string;
  thumbUrl: string;
  springs: string;
  slots: ReadonlyArray<{
    weekday: number;
    startTime: string;
    endTime: string;
    title: string;
    apparatus: ApparatusType;
    level: DifficultyLevel;
    participantAlias: string;
  }>;
}

const WEEKLY_SCHEDULE_PRESETS: readonly WeeklyPresetSpec[] = [
  {
    id: 'preset-mwf-morning-balance',
    titleKo: '주 3일 오전 리포머·매트 밸런스',
    subtitleKo: '월·수·금 10:00 — 리포머 분절 & 매트 코어 순환 50분',
    badgeKo: '인기 · 월/수/금',
    thumbUrl: '/motion-studio3d/footwork-peak.png',
    springs: '2R 1B',
    slots: [
      {
        weekday: 1,
        startTime: '10:00',
        endTime: '10:50',
        title: '오전 리포머 코어 & 정렬',
        apparatus: 'reformer',
        level: '1.5',
        participantAlias: '오전 A반',
      },
      {
        weekday: 3,
        startTime: '10:00',
        endTime: '10:50',
        title: '수요 매트 척추 분절 & 호흡',
        apparatus: 'mat',
        level: '1.0',
        participantAlias: '오전 A반',
      },
      {
        weekday: 5,
        startTime: '10:00',
        endTime: '10:50',
        title: '금요 리포머 브릿징 & 하체',
        apparatus: 'reformer',
        level: '1.5',
        participantAlias: '오전 A반',
      },
    ],
  },
  {
    id: 'preset-tuth-evening-posture',
    titleKo: '평일 저녁 코어·체형 정렬 집중',
    subtitleKo: '화·목 19:00 / 20:00 — 직장인 그룹 리포머·체어 50분',
    badgeKo: '저녁 집중 · 화/목',
    thumbUrl: '/motion-studio3d/bridge-peak.png',
    springs: '1R 1B',
    slots: [
      {
        weekday: 2,
        startTime: '19:00',
        endTime: '19:50',
        title: '저녁 리포머 흉추·골반 정렬',
        apparatus: 'reformer',
        level: '1.5',
        participantAlias: '저녁 A반',
      },
      {
        weekday: 4,
        startTime: '19:00',
        endTime: '19:50',
        title: '목요 운다 체어 코어·하지 밸런스',
        apparatus: 'chair',
        level: '1.5',
        participantAlias: '저녁 B반',
      },
    ],
  },
  {
    id: 'preset-weekend-apparatus-circuit',
    titleKo: '주말 소그룹 4대 기구 순환',
    subtitleKo: '토 11:00 / 13:00 — 캐딜락·바렐·리포머 시그니처 50분',
    badgeKo: '주말 특화 · 토',
    thumbUrl: '/motion-studio3d/cadillac-cat-start.png',
    springs: '2Y · 푸시스루',
    slots: [
      {
        weekday: 6,
        startTime: '11:00',
        endTime: '11:50',
        title: '토요 캐딜락 전신 협응 & 스트레치',
        apparatus: 'cadillac',
        level: '1.5',
        participantAlias: '주말 소그룹 A',
      },
      {
        weekday: 6,
        startTime: '13:00',
        endTime: '13:50',
        title: '토요 래더 바렐 측굴 & 신전',
        apparatus: 'barrel',
        level: '1.5',
        participantAlias: '주말 소그룹 B',
      },
    ],
  },
];

function pickBestSequenceForSlot(
  sequences: readonly SavedSequence[],
  preferredApparatus: ApparatusType | null,
  slotMinutes: number,
  recentSequenceIds: ReadonlySet<string>,
  usedInBatch: Set<string>,
): SavedSequence | undefined {
  if (!sequences.length) return undefined;
  const scored = sequences.map((seq) => {
    let score = 0;
    if (preferredApparatus && seq.apparatus === preferredApparatus) score += 40;
    else if (preferredApparatus && seq.apparatus === 'mixed') score += 15;
    const diffMin = Math.abs(seq.targetMinutes - slotMinutes);
    score += Math.max(0, 20 - diffMin);
    if (!recentSequenceIds.has(seq.id)) score += 15;
    if (!usedInBatch.has(seq.id)) score += 12;
    return { seq, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const chosen = scored[0]?.seq;
  if (chosen) usedInBatch.add(chosen.id);
  return chosen;
}

function inferPreferredApparatus(
  occ: InstructorScheduleOccurrence,
  location: InstructorLocation | undefined,
): ApparatusType | null {
  const title = occ.title.toLowerCase();
  if (title.includes('리포머') || title.includes('reformer')) return 'reformer';
  if (title.includes('체어') || title.includes('chair')) return 'chair';
  if (title.includes('캐딜락') || title.includes('cadillac')) return 'cadillac';
  if (title.includes('바렐') || title.includes('barrel')) return 'barrel';
  if (title.includes('매트') || title.includes('mat')) return 'mat';
  if (location?.equipmentIds.length) {
    const families = getEquipmentFamilies(location.equipmentIds);
    return families[0] ?? null;
  }
  return null;
}

export const AiSmartScheduleGeneratorCard: React.FC = () => {
  const schedule = usePilatesStore((s) => s.instructorSchedule);
  const savedSequences = usePilatesStore((s) => s.savedSequences);
  const exercises = usePilatesStore((s) => s.exercises);
  const historyLogs = usePilatesStore((s) => s.historyLogs);
  const datedPlanning = usePilatesStore((s) => s.datedSequencePlanning);
  const setInstructorSchedule = usePilatesStore((s) => s.setInstructorSchedule);

  const [undoSnapshot, setUndoSnapshot] = useState<InstructorScheduleData | null>(null);
  const [feedback, setFeedback] = useState<string>('');

  const today = localScheduleDate();
  const windowEnd = addScheduleDays(today, 13);

  const recentSequenceIds = useMemo(
    () => new Set(historyLogs.slice(0, 6).map((log) => log.sequenceId)),
    [historyLogs],
  );

  const unlinkedProposals = useMemo(() => {
    const rows = expandInstructorSchedule(schedule, today, windowEnd).filter(
      (row) => row.status === 'scheduled' && !row.linkSavedSequenceId,
    );
    const datedKeys = new Set(
      (datedPlanning?.assignments ?? []).map((a) => `${a.classId}@${a.originalDate}`),
    );
    const unlinked = rows.filter((row) => !datedKeys.has(`${row.classId}@${row.originalDate}`));
    // Group by classId so recurring classes link cleanly once
    const uniqueByClass = new Map<string, InstructorScheduleOccurrence>();
    for (const row of unlinked) {
      if (!uniqueByClass.has(row.classId)) uniqueByClass.set(row.classId, row);
    }
    const usedInBatch = new Set<string>();
    return Array.from(uniqueByClass.values())
      .slice(0, 6)
      .flatMap((occ) => {
        const location = schedule.locations.find((loc) => loc.id === occ.locationId);
        const preferred = inferPreferredApparatus(occ, location);
        const slotMinutes = Math.max(
          30,
          scheduleMinutes(occ.endTime) - scheduleMinutes(occ.startTime),
        );
        const matchedSeq = pickBestSequenceForSlot(
          savedSequences,
          preferred,
          slotMinutes,
          recentSequenceIds,
          usedInBatch,
        );
        if (!matchedSeq) return [];
        const visual = resolveClassCardVisualMeta({
          sequence: matchedSeq,
          exercises,
          title: matchedSeq.title,
          fallbackLevel: matchedSeq.level,
        });
        return [{ occ, location, matchedSeq, visual }];
      });
  }, [schedule, today, windowEnd, datedPlanning, savedSequences, recentSequenceIds, exercises]);

  const handleAutoLinkUnassigned = () => {
    if (!unlinkedProposals.length) return;
    const prevSnapshot: InstructorScheduleData = structuredClone(schedule);
    const mapByClassId = new Map(
      unlinkedProposals.map((item) => [item.occ.classId, item.matchedSeq.id]),
    );
    const nextClasses = schedule.classes.map((cls) => {
      const assignedSeqId = mapByClassId.get(cls.id);
      return assignedSeqId ? { ...cls, linkSavedSequenceId: assignedSeqId } : cls;
    });
    const res = setInstructorSchedule({
      ...schedule,
      classes: nextClasses,
    });
    if (res.success) {
      setUndoSnapshot(prevSnapshot);
      setFeedback(
        `미연결 수업 ${unlinkedProposals.length}건에 기구·시간 맞춤 시퀀스를 원탭 배정했어요.`,
      );
    }
  };

  const handleApplyWeeklyPreset = (preset: WeeklyPresetSpec) => {
    const prevSnapshot: InstructorScheduleData = structuredClone(schedule);
    let nextLocations = [...schedule.locations];
    let targetLocation = nextLocations[0];
    if (!targetLocation) {
      targetLocation = {
        id: `loc-studio-main-${Date.now()}`,
        alias: '본점 스튜디오 A룸',
        equipmentIds: ['reformer', 'cadillac', 'chair', 'barrel', 'mat'],
        propIds: [],
        notes: '기본 스튜디오 룸',
      };
      nextLocations = [targetLocation];
    }

    const weekStart = scheduleWeekStart(today);
    const untilDate = addScheduleDays(weekStart, 84);
    const usedInBatch = new Set<string>();
    const existingRows = expandInstructorSchedule(schedule, weekStart, addScheduleDays(weekStart, 13));

    const createdClasses: InstructorScheduledClass[] = [];
    for (const slot of preset.slots) {
      const hasOverlap = existingRows.some(
        (row) =>
          row.status === 'scheduled' &&
          new Date(`${row.date}T12:00:00`).getDay() === slot.weekday &&
          slot.startTime < row.endTime &&
          row.startTime < slot.endTime,
      );
      if (hasOverlap) continue;
      const matchedSeq = pickBestSequenceForSlot(
        savedSequences,
        slot.apparatus,
        50,
        recentSequenceIds,
        usedInBatch,
      );
      createdClasses.push({
        id: `cls-ai-${preset.id}-${slot.weekday}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: slot.title,
        participantAlias: slot.participantAlias,
        locationId: targetLocation.id,
        startDate: weekStart,
        startTime: slot.startTime,
        endTime: slot.endTime,
        recurrence: 'weekly',
        weekdays: [slot.weekday],
        untilDate,
        linkSavedSequenceId: matchedSeq?.id,
        notes: `${preset.titleKo} · 자동 편성`,
      });
    }

    if (createdClasses.length === 0) {
      setFeedback('선택한 시간대에 이미 등록된 수업이 있어 기존 일정을 안전하게 유지했어요.');
      return;
    }

    const res = setInstructorSchedule({
      ...schedule,
      locations: nextLocations,
      classes: [...schedule.classes, ...createdClasses],
    });
    if (res.success) {
      setUndoSnapshot(prevSnapshot);
      setFeedback(
        `‘${preset.titleKo}’ 주간 수업 ${createdClasses.length}건과 맞춤 시퀀스를 한 번에 편성했어요.`,
      );
    }
  };

  const handleUndo = () => {
    if (!undoSnapshot) return;
    const res = setInstructorSchedule(undoSnapshot);
    if (res.success) {
      setUndoSnapshot(null);
      setFeedback('방금 자동 편성·배정한 일정을 이전 상태로 되돌렸어요.');
    }
  };

  return (
    <section
      className="pf-ai-smart-schedule-card"
      data-testid="ai-smart-schedule-generator-card"
      aria-label="맞춤 시퀀스 및 주간 스케줄 원탭 자동 편성"
    >
      <div className="pf-ai-smart-schedule-card__head">
        <div>
          <span className="pf-studio-kicker-pill">
            <Sparkles size={13} aria-hidden="true" /> SMART FLOW &amp; SCHEDULE
          </span>
          <h3>주간 수업 &amp; 맞춤 시퀀스 1탭 자동 편성</h3>
          <p>
            장소별 보유 기구와 최근 수업 이력을 대조해 중복 없이 시퀀스를 배정하거나 주간 시간표를
            바로 채웁니다.
          </p>
        </div>
        {undoSnapshot && (
          <button
            type="button"
            className="btn-secondary pf-ai-undo-btn"
            data-testid="ai-smart-schedule-undo-btn"
            onClick={handleUndo}
          >
            <RotateCcw size={14} aria-hidden="true" /> 방금 편성 되돌리기
          </button>
        )}
      </div>

      {feedback && (
        <p className="pf-ai-smart-feedback" role="status">
          <CheckCircle2 size={15} aria-hidden="true" />
          <span>{feedback}</span>
        </p>
      )}

      {unlinkedProposals.length > 0 && (
        <div className="pf-ai-unlinked-box" data-testid="ai-unlinked-auto-assign-box">
          <div className="pf-ai-unlinked-box__top">
            <div>
              <strong>시퀀스 미연결 수업 {unlinkedProposals.length}건 자동 매칭 준비됨</strong>
              <span>보유 기구·수업 시간·최근 진행 이력 겹침 회피 기준</span>
            </div>
            <button
              type="button"
              className="btn-primary"
              data-testid="ai-auto-assign-unlinked-btn"
              onClick={handleAutoLinkUnassigned}
            >
              <Wand2 size={15} aria-hidden="true" /> 미연결 {unlinkedProposals.length}건 원탭 플로우 배정
            </button>
          </div>
          <div className="pf-ai-unlinked-list">
            {unlinkedProposals.map(({ occ, matchedSeq, visual }) => (
              <div key={occ.id} className="pf-ai-unlinked-item">
                <img
                  src={visual.studio3dThumbUrl}
                  alt=""
                  aria-hidden="true"
                  className="pf-ai-unlinked-thumb"
                />
                <div className="pf-ai-unlinked-meta">
                  <strong>
                    {formatScheduleDate(occ.date)} {formatScheduleTime(occ.startTime)} · {occ.title}
                  </strong>
                  <span>→ 추천 연결: {matchedSeq.title}</span>
                  <div className="pf-ai-unlinked-pills">
                    <span className="pf-class-apparatus-pill">{visual.apparatusLabelKo} 3D</span>
                    {visual.springs && <SpringVisualPills springs={visual.springs} />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pf-ai-preset-grid" role="group" aria-label="주간 스케줄 자동 편성 프리셋">
        {WEEKLY_SCHEDULE_PRESETS.map((preset) => (
          <div key={preset.id} className="pf-ai-preset-card">
            <div className="pf-ai-preset-card__media">
              <img src={preset.thumbUrl} alt="" aria-hidden="true" loading="lazy" />
              <span className="pf-ai-preset-badge">{preset.badgeKo}</span>
              <div className="pf-ai-preset-springs">
                <SpringVisualPills springs={preset.springs} />
              </div>
            </div>
            <div className="pf-ai-preset-card__body">
              <strong>{preset.titleKo}</strong>
              <p>{preset.subtitleKo}</p>
              <button
                type="button"
                className="btn-secondary pf-ai-preset-apply-btn"
                data-testid={`apply-weekly-preset-${preset.id}`}
                onClick={() => handleApplyWeeklyPreset(preset)}
              >
                <CalendarPlus size={14} aria-hidden="true" /> 주간 일정 + 시퀀스 1탭 편성
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
