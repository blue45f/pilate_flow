import { isScheduleDate } from "../schemas/instructorScheduleSchema";
import type { DatedSequencePlanningData } from "../types/datedSequencePlanning";
import type {
  InstructorScheduleData,
  InstructorScheduleOccurrence,
} from "../types/instructorSchedule";
import type { PilatesExercise, SavedSequence } from "../types/pilates";
import { getDatedPlanKey, getDatedPlanWarnings } from "./datedSequencePlanning";
import {
  addScheduleDays,
  findInstructorScheduleConflicts,
  getSchedulePlanWarnings,
  localScheduleDate,
  scheduleDateObject,
  scheduleDateRange,
} from "./instructorSchedule";

const MIN_DATE = "1900-01-01";
const MAX_DATE = "2199-12-31";

/** Local noon avoids UTC and DST date shifts. Each month contains at most 31 dates. */
export function planningCalendarMonth(date: string) {
  if (!isScheduleDate(date))
    throw new Error("날짜는 1900년부터 2199년까지 선택해 주세요.");
  const start = `${date.slice(0, 7)}-01`;
  const last = scheduleDateObject(start);
  last.setMonth(last.getMonth() + 1, 0);
  const end = localScheduleDate(last);
  return {
    start,
    end,
    dates: scheduleDateRange(start, end),
    leadingDays: (scheduleDateObject(start).getDay() + 6) % 7,
  };
}

/** Period buttons open the first day; PageUp/PageDown retain the day where possible. */
export function shiftPlanningCalendarMonth(
  date: string,
  direction: -1 | 1,
  retainDay = false,
): string | null {
  if (!isScheduleDate(date)) return null;
  const first = scheduleDateObject(`${date.slice(0, 7)}-01`);
  first.setMonth(first.getMonth() + direction);
  const candidate = localScheduleDate(first);
  if (!isScheduleDate(candidate)) return null;
  if (retainDay)
    first.setDate(
      Math.min(
        Number(date.slice(8)),
        Number(planningCalendarMonth(candidate).end.slice(8)),
      ),
    );
  return localScheduleDate(first);
}

/** Arrow/Home/End/Page keys change only the selected local date, never schedule data. */
export function planningCalendarKeyDate(
  date: string,
  key: string,
): string | null {
  if (!isScheduleDate(date)) return null;
  if (key === "PageUp" || key === "PageDown")
    return (
      shiftPlanningCalendarMonth(date, key === "PageUp" ? -1 : 1, true) ?? date
    );
  const weekday = (scheduleDateObject(date).getDay() + 6) % 7;
  const offsets: Readonly<Record<string, number>> = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -7,
    ArrowDown: 7,
    Home: -weekday,
    End: 6 - weekday,
  };
  const offset = offsets[key];
  if (offset === undefined) return null;
  const candidate = addScheduleDays(date, offset);
  return candidate < MIN_DATE
    ? MIN_DATE
    : candidate > MAX_DATE
      ? MAX_DATE
      : candidate;
}

export interface PlanningCalendarDaySummary {
  scheduled: number;
  prepared: number;
  draft: number;
  unassigned: number;
  linked: number;
  warnings: number;
  conflicts: number;
  cancelled: number;
  closed: number;
  moved: number;
  closures: number;
}

export function emptyPlanningCalendarDay(): PlanningCalendarDaySummary {
  return {
    scheduled: 0,
    prepared: 0,
    draft: 0,
    unassigned: 0,
    linked: 0,
    warnings: 0,
    conflicts: 0,
    cancelled: 0,
    closed: 0,
    moved: 0,
    closures: 0,
  };
}

/** Reuse the already-bounded occurrence expansion and existing warning rules. No writes. */
export function summarizePlanningCalendar(input: {
  monthDate: string;
  rows: readonly InstructorScheduleOccurrence[];
  schedule: InstructorScheduleData;
  planning?: DatedSequencePlanningData;
  sequences: readonly SavedSequence[];
  exercises: readonly PilatesExercise[];
}): Map<string, PlanningCalendarDaySummary> {
  const month = planningCalendarMonth(input.monthDate);
  const days = new Map<string, PlanningCalendarDaySummary>();
  const dayRows = new Map<string, InstructorScheduleOccurrence[]>();
  const assignments = new Map(
    (input.planning?.assignments ?? []).map((assignment) => [
      getDatedPlanKey(assignment.classId, assignment.originalDate),
      assignment,
    ]),
  );
  const ensure = (date: string) => {
    if (!days.has(date)) days.set(date, emptyPlanningCalendarDay());
    return days.get(date)!;
  };
  for (const row of input.rows) {
    if (row.date < month.start || row.date > month.end) continue;
    const day = ensure(row.date);
    if (!dayRows.has(row.date)) dayRows.set(row.date, []);
    dayRows.get(row.date)!.push(row);
    if (row.status !== "scheduled") {
      day[row.status] += 1;
      continue;
    }
    day.scheduled += 1;
    const assignment = assignments.get(
      getDatedPlanKey(row.classId, row.originalDate),
    );
    if (assignment)
      day[assignment.state === "prepared" ? "prepared" : "draft"] += 1;
    else {
      day.unassigned += 1;
      if (
        input.sequences.some(
          (sequence) => sequence.id === row.linkSavedSequenceId,
        )
      )
        day.linked += 1;
    }
    const warnings = assignment
      ? getDatedPlanWarnings({
          assignment,
          schedule: input.schedule,
          exercises: input.exercises,
        })
      : getSchedulePlanWarnings(
          row,
          input.schedule,
          input.sequences,
          input.exercises,
        );
    if (warnings.length) day.warnings += 1;
  }
  for (const [date, rows] of dayRows)
    ensure(date).conflicts = findInstructorScheduleConflicts(rows).length;
  for (const exception of input.schedule.exceptions)
    if (
      exception.kind === "closed" &&
      exception.date >= month.start &&
      exception.date <= month.end
    )
      ensure(exception.date).closures += 1;
  return days;
}

export function describePlanningCalendarDay(
  day: PlanningCalendarDaySummary,
): string {
  const parts = [
    `준비 표시 ${day.prepared}회`,
    `작성 중 ${day.draft}회`,
    `날짜별 계획 미지정 ${day.unassigned}회`,
  ];
  if (day.linked) parts.push(`저장 계획 연결 ${day.linked}회`);
  if (day.warnings) parts.push(`시간·장소·연결 등 확인 필요 ${day.warnings}회`);
  if (day.conflicts) parts.push(`시간 겹침 ${day.conflicts}건`);
  if (day.cancelled) parts.push(`취소 ${day.cancelled}회`);
  if (day.closed || day.closures)
    parts.push(`휴무${day.closed ? ` ${day.closed}회` : ""}`);
  if (day.moved) parts.push(`다른 날짜로 이동 ${day.moved}회`);
  return parts.join(" · ");
}
