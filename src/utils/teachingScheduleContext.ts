import { z } from 'zod';
import { scheduleDateSchema, scheduleTimeSchema } from '../schemas/instructorScheduleSchema';
import type {
  InstructorScheduleData,
  InstructorScheduleOccurrence,
} from '../types/instructorSchedule';
import type { PilatesExercise, SavedSequence, SequenceStep } from '../types/pilates';
import { resolveDatedPlanOccurrence } from './datedSequencePlanning';
import { getSchedulePlanWarnings } from './instructorSchedule';
import { getSequenceDurations } from './sequenceEngine';

const id = z.string().min(1).max(200);

/** Local draft context only. Never a teaching approval or a mutable schedule link. */
export const teachingScheduleContextSchema = z
  .object({
    draftSequenceId: id,
    classId: id,
    originalDate: scheduleDateSchema,
    date: scheduleDateSchema,
    startTime: scheduleTimeSchema,
    endTime: scheduleTimeSchema,
    locationId: id,
    locationAlias: z.string().max(100),
    classTitle: z.string().max(100),
  })
  .strict();

export type TeachingScheduleContext = z.infer<typeof teachingScheduleContextSchema>;

export function matchingTeachingScheduleContext(
  context: unknown,
  draftSequenceId: string,
): TeachingScheduleContext | undefined {
  const parsed = teachingScheduleContextSchema.safeParse(context);
  return parsed.success && parsed.data.draftSequenceId === draftSequenceId
    ? parsed.data
    : undefined;
}

/** Recalculate against the current draft, but never silently move its captured venue/date. */
export function teachingScheduleWarnings(
  context: TeachingScheduleContext,
  steps: SequenceStep[],
  schedule: InstructorScheduleData,
  exercises: PilatesExercise[],
): string[] {
  const current = resolveDatedPlanOccurrence(schedule, context.classId, context.originalDate);
  const warnings: string[] = [];
  if (current.status !== 'scheduled' || !current.occurrence) {
    warnings.push('가져온 회차가 취소·휴무 또는 삭제되었습니다. 실제 일정을 확인하세요.');
  } else if (
    current.occurrence.date !== context.date ||
    current.occurrence.startTime !== context.startTime ||
    current.occurrence.endTime !== context.endTime ||
    current.occurrence.locationId !== context.locationId
  ) {
    warnings.push('가져온 뒤 날짜·시간·장소가 변경되었습니다. 아래는 가져올 때의 일정입니다.');
  }
  const sequence: SavedSequence = {
    id: context.draftSequenceId,
    title: context.classTitle,
    subtitle: '',
    apparatus: 'mixed',
    level: '1.0',
    focusTags: [],
    targetMinutes: getSequenceDurations(steps).totalSec / 60,
    steps,
    taughtCount: 0,
    createdAt: '',
    updatedAt: '',
  };
  const row: InstructorScheduleOccurrence = {
    id: `${context.classId}@${context.originalDate}`,
    classId: context.classId,
    originalDate: context.originalDate,
    date: context.date,
    startTime: context.startTime,
    endTime: context.endTime,
    locationId: context.locationId,
    title: context.classTitle,
    participantAlias: '',
    notes: '',
    status: 'scheduled',
    linkSavedSequenceId: sequence.id,
  };
  return [...warnings, ...getSchedulePlanWarnings(row, schedule, [sequence], exercises)];
}
