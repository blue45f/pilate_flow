import type { EquipmentId } from '../data/equipmentCatalog';
import type { PropType } from './pilates';

/** Local calendar dates/times: no implicit UTC conversion or external calendar identity. */
export interface InstructorLocation {
  id: string;
  alias: string;
  equipmentIds: EquipmentId[];
  propIds: Exclude<PropType, 'none'>[];
  notes: string;
}

export interface InstructorScheduledClass {
  id: string;
  title: string;
  participantAlias: string;
  locationId: string;
  startDate: string;
  startTime: string;
  endTime: string;
  recurrence: 'once' | 'weekly';
  /** 0 = Sunday, 1 = Monday, ... 6 = Saturday. */
  weekdays: number[];
  untilDate?: string;
  linkSavedSequenceId?: string;
  notes: string;
}

export type InstructorScheduleException =
  | { id: string; kind: 'closed'; date: string; locationId?: string; reason: string }
  | { id: string; kind: 'cancel'; classId: string; originalDate: string; reason: string }
  | {
      id: string;
      kind: 'reschedule';
      classId: string;
      originalDate: string;
      date: string;
      startTime: string;
      endTime: string;
      locationId?: string;
      reason: string;
    };

export interface InstructorScheduleData {
  locations: InstructorLocation[];
  classes: InstructorScheduledClass[];
  exceptions: InstructorScheduleException[];
}

export interface InstructorScheduleOccurrence {
  id: string;
  classId: string;
  originalDate: string;
  date: string;
  startTime: string;
  endTime: string;
  locationId: string;
  title: string;
  participantAlias: string;
  linkSavedSequenceId?: string;
  notes: string;
  status: 'scheduled' | 'cancelled' | 'closed' | 'moved';
  movedFrom?: string;
  movedTo?: string;
  reason?: string;
}

export function createEmptyInstructorSchedule(): InstructorScheduleData {
  return { locations: [], classes: [], exceptions: [] };
}
