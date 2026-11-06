import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, CalendarPlus, CalendarRange, MapPin } from 'lucide-react';
import { EQUIPMENT_OPTIONS, getExerciseEquipment, PROP_OPTIONS } from '../data/equipmentCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import {
  addScheduleDays,
  expandInstructorSchedule,
  formatScheduleDate,
  localScheduleDate,
  scheduleMinutes,
} from '../utils/instructorSchedule';
import { getSequenceDurations, isRestStep } from '../utils/sequenceEngine';
import '../styles/next-class-banner.css';

interface NextClassBannerProps {
  compact?: boolean;
  /** Preserve real upcoming context; fold only the empty setup banner. */
  collapseEmpty?: boolean;
}

/** Calendar context only: opening this card never loads or changes the current draft. */
export function NextClassBanner({
  compact = false,
  collapseEmpty = false,
}: NextClassBannerProps = {}) {
  const schedule = usePilatesStore((state) => state.instructorSchedule);
  const sequences = usePilatesStore((state) => state.savedSequences);
  const datedPlanning = usePilatesStore((state) => state.datedSequencePlanning);
  const exercises = usePilatesStore((state) => state.exercises);
  const groups = usePilatesStore((state) => state.classGroups);
  const activeGroupId = usePilatesStore((state) => state.activeTargetGroupId);
  const openSchedule = usePilatesStore((state) => state.setActiveTab);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const refresh = () => setNow(new Date());
    const interval = window.setInterval(refresh, 60_000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const upcoming = useMemo(() => {
    const today = localScheduleDate(now);
    return expandInstructorSchedule(schedule, today, addScheduleDays(today, 30)).find((row) => {
      if (row.status !== 'scheduled') return false;
      const [year, month, day] = row.date.split('-').map(Number);
      const [hour, minute] = row.startTime.split(':').map(Number);
      return new Date(year, month - 1, day, hour, minute).getTime() >= now.getTime();
    });
  }, [schedule, now]);

  const assignment = upcoming
    ? datedPlanning?.assignments.find(
        (item) => item.classId === upcoming.classId && item.originalDate === upcoming.originalDate,
      )
    : undefined;
  const plan =
    assignment?.sequenceSnapshot ??
    sequences.find((item) => item.id === upcoming?.linkSavedSequenceId);
  const contextChanged =
    !!assignment &&
    !!upcoming &&
    (assignment.occurrenceSnapshot.date !== upcoming.date ||
      assignment.occurrenceSnapshot.startTime !== upcoming.startTime ||
      assignment.occurrenceSnapshot.endTime !== upcoming.endTime ||
      assignment.occurrenceSnapshot.locationId !== upcoming.locationId);
  const location = schedule.locations.find((item) => item.id === upcoming?.locationId);
  const activeGroup = groups.find((group) => group.id === activeGroupId);
  const planDuration = plan ? getSequenceDurations([...plan.steps]).totalSec / 60 : null;
  const planRequirements = useMemo(() => {
    const equipment = new Set<string>();
    const props = new Set<string>();
    const movementSteps = plan?.steps.filter((step) => !isRestStep(step)) ?? [];
    let unknown = !movementSteps.length;
    for (const step of movementSteps) {
      const exercise = exercises.find((item) => item.id === step.exerciseId);
      if (!exercise) {
        unknown = true;
        continue;
      }
      const requirements = getExerciseEquipment(exercise);
      if (!requirements.requirementsKnown) unknown = true;
      requirements.requiredEquipment.forEach((id) => {
        const option = EQUIPMENT_OPTIONS.find((item) => item.id === id);
        if (option) equipment.add(option.labelKo);
      });
      requirements.requiredProps.forEach((id) => {
        const option = PROP_OPTIONS.find((item) => item.id === id);
        if (option) props.add(option.labelKo);
      });
    }
    return {
      labels: [...equipment, ...props],
      unknown,
      reformer: movementSteps.some((step) => {
        const exercise = exercises.find((item) => item.id === step.exerciseId);
        return exercise && getExerciseEquipment(exercise).requiredEquipment.includes('reformer');
      }),
    };
  }, [plan, exercises]);

  if (!upcoming) {
    const emptyBanner = (
      <section
        className={`next-class-banner next-class-banner-empty ${compact ? 'is-compact' : ''}`}
        aria-label="다음 수업"
      >
        <div className="next-class-empty-icon" aria-hidden="true">
          <CalendarRange size={25} />
        </div>
        <div className="next-class-empty-copy">
          <span className="next-class-eyebrow">앞으로 30일</span>
          <h2>다가오는 수업 일정이 없어요</h2>
          <p>
            {activeGroup
              ? `수업 준비 중 · ${activeGroup.name}`
              : '날짜와 장소를 등록해 다음 수업을 준비하세요.'}
          </p>
        </div>
        <button
          type="button"
          className="next-class-empty-action"
          onClick={() => openSchedule('schedule')}
        >
          <CalendarPlus size={17} /> 일정 추가
        </button>
      </section>
    );
    return collapseEmpty ? (
      <details className="workbench-schedule-context">
        <summary>일정 확인·추가</summary>
        {emptyBanner}
      </details>
    ) : (
      emptyBanner
    );
  }

  const slotMinutes = scheduleMinutes(upcoming.endTime) - scheduleMinutes(upcoming.startTime);
  const durationLabel =
    planDuration === null
      ? `일정 ${slotMinutes}분 · ${upcoming.linkSavedSequenceId ? '연결 계획 확인 필요' : '계획 미연결'}`
      : `${assignment ? '회차 계획' : '계획'} ${Number(planDuration.toFixed(2))}분 · 휴식 포함`;
  const requirementsLabel = planRequirements.labels.length
    ? `준비물 메모: ${planRequirements.labels.join(' · ')}${planRequirements.unknown ? ' · 일부 확인 필요' : ''}`
    : '기구·소도구 확인 필요';

  return (
    <section className={`next-class-banner ${compact ? 'is-compact' : ''}`} aria-label="다음 수업">
      <button
        type="button"
        className="next-class-open"
        onClick={() => openSchedule('schedule')}
        aria-label={`${formatScheduleDate(upcoming.date)} ${upcoming.startTime} ${upcoming.title} 일정 보기`}
      >
        <div className="next-class-when">
          <span className="next-class-eyebrow">
            다음 수업 · {formatScheduleDate(upcoming.date)}
          </span>
          <time dateTime={`${upcoming.date}T${upcoming.startTime}`}>{upcoming.startTime}</time>
          <span className="next-class-end">– {upcoming.endTime}</span>
        </div>
        <div className="next-class-copy">
          <h2>{upcoming.title}</h2>
          <p className="next-class-place">
            <MapPin size={14} aria-hidden="true" />
            {[upcoming.participantAlias, location?.alias || '장소 미등록']
              .filter(Boolean)
              .join(' · ')}
          </p>
          <div className="next-class-tags">
            <span>{durationLabel}</span>
            {plan && Math.abs((planDuration ?? 0) - slotMinutes) > 0.05 && (
              <span>일정 {slotMinutes}분</span>
            )}
          </div>
          <p className="next-class-equipment">{requirementsLabel}</p>
          {contextChanged && (
            <p className="next-class-equipment">회차 날짜·시간·장소 변경 확인 필요</p>
          )}
          {upcoming.linkSavedSequenceId && !plan && (
            <p className="next-class-equipment">연결한 계획을 찾을 수 없어요.</p>
          )}
        </div>
        <span className="next-class-view">
          <span>일정 보기</span> <ArrowUpRight size={17} />
        </span>
      </button>
      {planRequirements.reformer && (
        <figure className="next-class-reference-image">
          <img src="/images/atelier-reformer-still-life.png" alt="" loading="lazy" />
          <figcaption>AI 참고 이미지 · 실제 장소 아님</figcaption>
        </figure>
      )}
    </section>
  );
}
