import type { ApparatusType, SavedSequence } from '../types/pilates';
import type { InstructorScheduleData } from '../types/instructorSchedule';
import {
  addScheduleDays,
  expandInstructorSchedule,
  scheduleDateRange,
  scheduleWeekStart,
} from './instructorSchedule';
import { EQUIPMENT_OPTIONS } from '../data/equipmentCatalog';

export type MemberSlotBookingStatus =
  | 'AVAILABLE'
  | 'ALMOST_FULL'
  | 'WAITLIST'
  | 'CLOSED'
  | 'CANCELED';

export type MemberBookingActionIntent =
  | 'BOOK'
  | 'WAITLIST'
  | 'CANCEL_BOOKING'
  | 'CANCEL_WAITLIST';

export interface MemberPassSummary {
  readonly passId: string;
  readonly passTitle: string;
  readonly participantAlias: string;
  readonly remainingCount: number;
  readonly pendingReservedCount: number;
  readonly totalCount: number;
  readonly expiresAtIso: string;
}

export interface MemberBookableSlot {
  readonly id: string;
  readonly classId: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly title: string;
  readonly locationAlias: string;
  readonly apparatus: ApparatusType | 'mixed';
  readonly equipmentLabels: readonly string[];
  readonly occurrenceStatus: 'scheduled' | 'cancelled' | 'closed' | 'moved';
  readonly baseEnrolled: number;
  readonly maxCapacity: number;
  readonly baseWaitlist: number;
  readonly maxWaitlist: number;
  readonly freeCancelHoursBefore: number;
  readonly myState: 'NONE' | 'BOOKED' | 'WAITLISTED';
  readonly myWaitlistOrder?: number;
}

export interface PersistedMemberBookingState {
  readonly pass: MemberPassSummary;
  readonly slotDecisions: Record<
    string,
    {
      readonly state: 'BOOKED' | 'WAITLISTED';
      readonly waitlistOrder?: number;
      readonly updatedAt: string;
    }
  >;
}

export const MEMBER_BOOKING_STORAGE_KEY = 'pf_member_booking_portal_v1';

export function createDefaultMemberPass(todayIso: string): MemberPassSummary {
  return {
    passId: 'pass-group-20',
    passTitle: '4:1 기구 필라테스 20회권',
    participantAlias: '저녁A-04 (별칭)',
    remainingCount: 7,
    pendingReservedCount: 1,
    totalCount: 20,
    expiresAtIso: addScheduleDays(todayIso, 55),
  };
}

export function readPersistedMemberBookingState(
  todayIso: string,
): PersistedMemberBookingState {
  const fallback: PersistedMemberBookingState = {
    pass: createDefaultMemberPass(todayIso),
    slotDecisions: {},
  };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(MEMBER_BOOKING_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistedMemberBookingState>;
    if (!parsed || typeof parsed !== 'object' || !parsed.pass) return fallback;
    return {
      pass: {
        ...fallback.pass,
        ...parsed.pass,
        remainingCount: Math.max(0, Number(parsed.pass.remainingCount ?? 7)),
        pendingReservedCount: Math.max(0, Number(parsed.pass.pendingReservedCount ?? 1)),
        totalCount: Math.max(1, Number(parsed.pass.totalCount ?? 20)),
      },
      slotDecisions:
        parsed.slotDecisions && typeof parsed.slotDecisions === 'object'
          ? parsed.slotDecisions
          : {},
    };
  } catch {
    return fallback;
  }
}

export function writePersistedMemberBookingState(
  state: PersistedMemberBookingState,
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MEMBER_BOOKING_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors cleanly; state remains live in memory.
  }
}

export function deriveMemberSlotStatus(slot: MemberBookableSlot): MemberSlotBookingStatus {
  if (slot.occurrenceStatus === 'cancelled') return 'CANCELED';
  if (slot.occurrenceStatus === 'closed') return 'CLOSED';
  const effectiveEnrolled =
    slot.baseEnrolled + (slot.myState === 'BOOKED' ? 1 : 0);
  const effectiveWaitlist =
    slot.baseWaitlist + (slot.myState === 'WAITLISTED' ? 1 : 0);
  if (effectiveEnrolled < slot.maxCapacity - 1) return 'AVAILABLE';
  if (effectiveEnrolled === slot.maxCapacity - 1) return 'ALMOST_FULL';
  if (effectiveWaitlist < slot.maxWaitlist) return 'WAITLIST';
  return 'CLOSED';
}

export function resolveMemberActionIntent(
  slot: MemberBookableSlot,
): MemberBookingActionIntent | null {
  if (slot.occurrenceStatus === 'cancelled' || slot.occurrenceStatus === 'closed') {
    return null;
  }
  if (slot.myState === 'BOOKED') return 'CANCEL_BOOKING';
  if (slot.myState === 'WAITLISTED') return 'CANCEL_WAITLIST';
  const status = deriveMemberSlotStatus(slot);
  if (status === 'AVAILABLE' || status === 'ALMOST_FULL') return 'BOOK';
  if (status === 'WAITLIST') return 'WAITLIST';
  return null;
}

function buildFallbackStudioWeekSlots(
  selectedDate: string,
  decisions: PersistedMemberBookingState['slotDecisions'],
): MemberBookableSlot[] {
  const templates: ReadonlyArray<{
    suffix: string;
    startTime: string;
    endTime: string;
    title: string;
    locationAlias: string;
    apparatus: ApparatusType;
    equipmentLabels: readonly string[];
    baseEnrolled: number;
    maxCapacity: number;
    baseWaitlist: number;
  }> = [
    {
      suffix: 'am-reformer',
      startTime: '10:00',
      endTime: '10:50',
      title: '리포머 호흡 & 골반 정렬',
      locationAlias: '본점 A룸',
      apparatus: 'reformer',
      equipmentLabels: ['리포머', '폼롤러'],
      baseEnrolled: 3,
      maxCapacity: 6,
      baseWaitlist: 0,
    },
    {
      suffix: 'pm-chair',
      startTime: '19:00',
      endTime: '19:50',
      title: '리포머·체어 코어 집중 플로우',
      locationAlias: '본점 A룸',
      apparatus: 'chair',
      equipmentLabels: ['체어', '미니볼'],
      baseEnrolled: 5,
      maxCapacity: 6,
      baseWaitlist: 0,
    },
    {
      suffix: 'pm-cadillac',
      startTime: '20:00',
      endTime: '20:50',
      title: '캐딜락 전신 협응 & 스트레치',
      locationAlias: '본점 B룸',
      apparatus: 'cadillac',
      equipmentLabels: ['캐딜락', '써클링'],
      baseEnrolled: 6,
      maxCapacity: 6,
      baseWaitlist: 1,
    },
  ];

  return templates.map((tpl) => {
    const id = `sample-slot-${selectedDate}-${tpl.suffix}`;
    const decision = decisions[id];
    return {
      id,
      classId: tpl.suffix,
      date: selectedDate,
      startTime: tpl.startTime,
      endTime: tpl.endTime,
      title: tpl.title,
      locationAlias: tpl.locationAlias,
      apparatus: tpl.apparatus,
      equipmentLabels: tpl.equipmentLabels,
      occurrenceStatus: 'scheduled',
      baseEnrolled: tpl.baseEnrolled,
      maxCapacity: tpl.maxCapacity,
      baseWaitlist: tpl.baseWaitlist,
      maxWaitlist: 3,
      freeCancelHoursBefore: 12,
      myState: decision?.state ?? 'NONE',
      myWaitlistOrder: decision?.waitlistOrder,
    };
  });
}

export function buildMemberSlotsForDate(params: {
  readonly selectedDate: string;
  readonly schedule: InstructorScheduleData;
  readonly savedSequences: readonly SavedSequence[];
  readonly decisions: PersistedMemberBookingState['slotDecisions'];
}): { readonly slots: MemberBookableSlot[]; readonly weekCounts: Record<string, number> } {
  const { selectedDate, schedule, savedSequences, decisions } = params;
  const weekStart = scheduleWeekStart(selectedDate);
  const weekEnd = addScheduleDays(weekStart, 6);
  const weekDates = scheduleDateRange(weekStart, weekEnd);

  const hasInstructorClasses = schedule.classes.length > 0;
  const expandedWeek = hasInstructorClasses
    ? expandInstructorSchedule(schedule, weekStart, weekEnd)
    : [];

  const weekCounts: Record<string, number> = {};
  for (const d of weekDates) {
    weekCounts[d] = hasInstructorClasses
      ? expandedWeek.filter((row) => row.date === d && row.status === 'scheduled').length
      : 3;
  }

  if (!hasInstructorClasses) {
    return {
      slots: buildFallbackStudioWeekSlots(selectedDate, decisions),
      weekCounts,
    };
  }

  const dayRows = expandedWeek.filter((row) => row.date === selectedDate);
  const slots: MemberBookableSlot[] = dayRows.map((row, idx) => {
    const location = schedule.locations.find((loc) => loc.id === row.locationId);
    const linkedSeq = row.linkSavedSequenceId
      ? savedSequences.find((seq) => seq.id === row.linkSavedSequenceId)
      : undefined;
    const eqLabels = (location?.equipmentIds ?? [])
      .map((id) => EQUIPMENT_OPTIONS.find((item) => item.id === id)?.labelKo ?? id)
      .slice(0, 3);
    const apparatus: ApparatusType | 'mixed' =
      linkedSeq?.apparatus ??
      ((location?.equipmentIds[0] as ApparatusType | undefined) ?? 'reformer');
    const decision = decisions[row.id];
    const deterministicEnrolled = (idx * 2 + 2) % 6;

    return {
      id: row.id,
      classId: row.classId,
      date: row.date,
      startTime: row.startTime,
      endTime: row.endTime,
      title: row.title,
      locationAlias: location?.alias || '스튜디오 룸',
      apparatus,
      equipmentLabels: eqLabels.length > 0 ? eqLabels : ['리포머'],
      occurrenceStatus: row.status,
      baseEnrolled: Math.min(5, deterministicEnrolled),
      maxCapacity: 6,
      baseWaitlist: 0,
      maxWaitlist: 3,
      freeCancelHoursBefore: 12,
      myState: decision?.state ?? 'NONE',
      myWaitlistOrder: decision?.waitlistOrder,
    };
  });

  return { slots, weekCounts };
}
