import { EQUIPMENT_OPTIONS, getExerciseAvailability, PROP_OPTIONS } from '../data/equipmentCatalog';
import { isScheduleDate } from '../schemas/instructorScheduleSchema';
import type {
  InstructorScheduleData,
  InstructorScheduledClass,
  InstructorScheduleOccurrence,
} from '../types/instructorSchedule';
import type { PilatesExercise, SavedSequence } from '../types/pilates';
import { getSequenceDurations } from './sequenceEngine';

export const SCHEDULE_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

export function localScheduleDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function scheduleDateObject(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export function addScheduleDays(value: string, days: number): string {
  const date = scheduleDateObject(value);
  date.setDate(date.getDate() + days);
  return localScheduleDate(date);
}

export function scheduleWeekStart(value: string): string {
  return addScheduleDays(value, -((scheduleDateObject(value).getDay() + 6) % 7));
}

export function scheduleDateRange(start: string, end: string): string[] {
  if (!isScheduleDate(start) || !isScheduleDate(end) || end < start)
    throw new Error('올바른 일정 조회 기간을 선택해 주세요.');
  const dates: string[] = [];
  for (let date = start; date <= end; date = addScheduleDays(date, 1)) {
    if (dates.length >= 370) throw new Error('일정 조회는 한 번에 370일까지 가능합니다.');
    dates.push(date);
  }
  return dates;
}

export function formatScheduleDate(value: string): string {
  if (!isScheduleDate(value)) return '날짜 미상';
  const date = scheduleDateObject(value);
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${SCHEDULE_WEEKDAYS[date.getDay()]})`;
}

export function scheduleMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function formatScheduleTime(value: string): string {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) return '시각 미상';
  const [hours, minutes] = value.split(':').map(Number);
  return `${hours < 12 ? '오전' : '오후'} ${hours % 12 || 12}:${String(minutes).padStart(2, '0')}`;
}

export function scheduledClassOccursOn(item: InstructorScheduledClass, date: string): boolean {
  if (item.recurrence === 'once') return item.startDate === date;
  return (
    date >= item.startDate &&
    date <= (item.untilDate ?? '') &&
    item.weekdays.includes(scheduleDateObject(date).getDay())
  );
}

export function expandInstructorSchedule(
  data: InstructorScheduleData,
  start: string,
  end: string,
): InstructorScheduleOccurrence[] {
  const dates = scheduleDateRange(start, end);
  const result: InstructorScheduleOccurrence[] = [];
  const exceptions = new Map(
    data.exceptions
      .filter((item) => item.kind !== 'closed')
      .map((item) => [`${item.classId}@${item.originalDate}`, item]),
  );
  const isClosed = (date: string, locationId: string) =>
    data.exceptions.find(
      (item) =>
        item.kind === 'closed' &&
        item.date === date &&
        (!item.locationId || item.locationId === locationId),
    );
  const occurrence = (
    item: InstructorScheduledClass,
    date: string,
  ): InstructorScheduleOccurrence => ({
    id: `${item.id}@${date}`,
    classId: item.id,
    originalDate: date,
    date,
    startTime: item.startTime,
    endTime: item.endTime,
    locationId: item.locationId,
    title: item.title,
    participantAlias: item.participantAlias,
    linkSavedSequenceId: item.linkSavedSequenceId,
    notes: item.notes,
    status: 'scheduled',
  });
  for (const item of data.classes) {
    for (const date of dates) {
      if (!scheduledClassOccursOn(item, date)) continue;
      const row = occurrence(item, date);
      const exception = exceptions.get(row.id);
      if (exception?.kind === 'reschedule') {
        if (exception.date !== date)
          result.push({
            ...row,
            status: 'moved',
            movedTo: exception.date,
            reason: exception.reason,
          });
        continue;
      }
      if (exception?.kind === 'cancel')
        result.push({ ...row, status: 'cancelled', reason: exception.reason });
      else {
        const closed = isClosed(date, item.locationId);
        result.push(closed ? { ...row, status: 'closed', reason: closed.reason } : row);
      }
    }
  }
  // Scan exceptions independently: an original occurrence outside this view can move into it.
  for (const exception of data.exceptions) {
    if (exception.kind !== 'reschedule' || exception.date < start || exception.date > end) continue;
    const item = data.classes.find((value) => value.id === exception.classId);
    if (!item || !scheduledClassOccursOn(item, exception.originalDate)) continue;
    const row = {
      ...occurrence(item, exception.originalDate),
      id: `${item.id}@${exception.originalDate}:rescheduled`,
      date: exception.date,
      startTime: exception.startTime,
      endTime: exception.endTime,
      locationId: exception.locationId ?? item.locationId,
      movedFrom: exception.originalDate,
      reason: exception.reason,
    };
    const closed = isClosed(row.date, row.locationId);
    result.push(closed ? { ...row, status: 'closed', reason: closed.reason } : row);
  }
  return result.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.startTime.localeCompare(b.startTime) ||
      a.id.localeCompare(b.id),
  );
}

export interface InstructorScheduleConflict {
  leftId: string;
  rightId: string;
  date: string;
  startTime: string;
  endTime: string;
}

export function findInstructorScheduleConflicts(
  rows: readonly InstructorScheduleOccurrence[],
): InstructorScheduleConflict[] {
  const active = rows.filter((row) => row.status === 'scheduled');
  const result: InstructorScheduleConflict[] = [];
  for (let i = 0; i < active.length; i++)
    for (let j = i + 1; j < active.length; j++) {
      const left = active[i],
        right = active[j];
      if (
        left.date !== right.date ||
        left.startTime >= right.endTime ||
        right.startTime >= left.endTime
      )
        continue;
      result.push({
        leftId: left.id,
        rightId: right.id,
        date: left.date,
        startTime: left.startTime > right.startTime ? left.startTime : right.startTime,
        endTime: left.endTime < right.endTime ? left.endTime : right.endTime,
      });
    }
  return result;
}

export function getSchedulePlanWarnings(
  row: InstructorScheduleOccurrence,
  data: InstructorScheduleData,
  sequences: readonly SavedSequence[],
  exercises: readonly PilatesExercise[],
): string[] {
  if (!row.linkSavedSequenceId) return [];
  const sequence = sequences.find((item) => item.id === row.linkSavedSequenceId);
  if (!sequence) return ['연결한 저장 시퀀스를 찾을 수 없습니다. 다시 선택해 주세요.'];
  const warnings: string[] = [];
  const duration = getSequenceDurations(sequence.steps).totalSec / 60;
  const slot = scheduleMinutes(row.endTime) - scheduleMinutes(row.startTime);
  if (Math.abs(duration - slot) > 0.05)
    warnings.push(
      `계획 ${Number(duration.toFixed(1))}분 (쉬는 시간 포함) · 일정 ${slot}분: ${duration > slot ? `${Number((duration - slot).toFixed(1))}분 초과` : `${Number((slot - duration).toFixed(1))}분 여유`}`,
    );
  const location = data.locations.find((item) => item.id === row.locationId);
  if (!location) return [...warnings, '등록된 장소를 찾을 수 없습니다.'];
  const missingEquipment = new Set<string>(),
    missingProps = new Set<string>();
  let unknown = false;
  for (const step of sequence.steps) {
    if (step.kind === 'rest') continue;
    const exercise = exercises.find((item) => item.id === step.exerciseId);
    if (!exercise) {
      unknown = true;
      continue;
    }
    const available = getExerciseAvailability(exercise, location.equipmentIds, location.propIds);
    if (!available.requirementsKnown) unknown = true;
    available.missingEquipment.forEach((id) =>
      missingEquipment.add(EQUIPMENT_OPTIONS.find((item) => item.id === id)?.labelKo ?? id),
    );
    available.missingProps.forEach((id) =>
      missingProps.add(PROP_OPTIONS.find((item) => item.id === id)?.labelKo ?? id),
    );
  }
  if (missingEquipment.size || missingProps.size)
    warnings.push(`장소 준비물 부족: ${[...missingEquipment, ...missingProps].join(', ')}`);
  if (unknown)
    warnings.push('일부 동작의 준비물 정보를 확인할 수 없습니다. 수업 전에 확인해 주세요.');
  return warnings;
}
