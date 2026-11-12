import type { ApparatusType, SavedSequence } from '../types/pilates';
import type { InstructorScheduleData } from '../types/instructorSchedule';
import {
  addScheduleDays,
  expandInstructorSchedule,
  scheduleDateRange,
  scheduleWeekStart,
} from './instructorSchedule';
import { EQUIPMENT_OPTIONS, getEquipmentFamilies } from '../data/equipmentCatalog';

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

export interface StudioSpotMeta {
  readonly spotId: string;
  readonly zoneKo: string;
}

const STUDIO_SPOT_ZONES_KO = [
  '창가 앞열',
  '중앙 앞열',
  '거울 측면',
  '창가 뒷열',
  '중앙 뒷열',
  '거울 정면',
] as const;

function buildSpotCatalog(prefix: string): ReadonlyArray<StudioSpotMeta> {
  return STUDIO_SPOT_ZONES_KO.map((zoneKo, idx) => ({
    spotId: `${prefix}${idx + 1}`,
    zoneKo,
  }));
}

export const STUDIO_REFORMER_SPOTS: ReadonlyArray<StudioSpotMeta> = buildSpotCatalog('R');
export const STUDIO_CHAIR_SPOTS: ReadonlyArray<StudioSpotMeta> = buildSpotCatalog('C');
export const STUDIO_CADILLAC_SPOTS: ReadonlyArray<StudioSpotMeta> = buildSpotCatalog('K');
export const STUDIO_BARREL_SPOTS: ReadonlyArray<StudioSpotMeta> = buildSpotCatalog('B');
export const STUDIO_MAT_SPOTS: ReadonlyArray<StudioSpotMeta> = buildSpotCatalog('M');

export function getApparatusSpotCatalog(
  apparatus: ApparatusType | 'mixed',
): ReadonlyArray<StudioSpotMeta> {
  switch (apparatus) {
    case 'chair':
      return STUDIO_CHAIR_SPOTS;
    case 'cadillac':
      return STUDIO_CADILLAC_SPOTS;
    case 'barrel':
      return STUDIO_BARREL_SPOTS;
    case 'mat':
      return STUDIO_MAT_SPOTS;
    case 'reformer':
    case 'mixed':
    default:
      return STUDIO_REFORMER_SPOTS;
  }
}

export function getApparatusSpotLabelKo(apparatus: ApparatusType | 'mixed'): string {
  switch (apparatus) {
    case 'chair':
      return '체어';
    case 'cadillac':
      return '캐딜락';
    case 'barrel':
      return '바렐';
    case 'mat':
      return '매트';
    case 'mixed':
      return '복합 기구';
    case 'reformer':
    default:
      return '리포머';
  }
}

export function findSpotMetaById(
  apparatus: ApparatusType | 'mixed',
  spotId: string,
): StudioSpotMeta | undefined {
  return (
    getApparatusSpotCatalog(apparatus).find((item) => item.spotId === spotId) ??
    STUDIO_REFORMER_SPOTS.find((item) => item.spotId === spotId)
  );
}

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
  readonly mySpotId?: string;
  readonly myWaitlistOrder?: number;
}

export type PersistedMemberSlotDecision = {
  readonly state: 'BOOKED' | 'WAITLISTED';
  readonly spotId?: string;
  readonly slotTitle?: string;
  readonly slotDate?: string;
  readonly slotTime?: string;
  readonly waitlistOrder?: number;
  readonly updatedAt: string;
};

export interface PersistedMemberBookingState {
  readonly pass: MemberPassSummary;
  readonly slotDecisions: Record<string, PersistedMemberSlotDecision>;
}

export const MEMBER_BOOKING_STORAGE_KEY = 'pf_member_booking_portal_v1';
export const BOOKING_MISTAKE_GRACE_MS = 5 * 60 * 1000;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function sanitizeNonNegativeInt(
  value: unknown,
  fallbackValue: number,
  minValue = 0,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallbackValue;
  }
  const floored = Math.floor(value);
  if (minValue > 0 && floored < minValue) {
    return fallbackValue;
  }
  return Math.max(minValue, floored);
}

function sanitizeSlotDecisions(
  raw: unknown,
): Record<string, PersistedMemberSlotDecision> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const clean: Record<string, PersistedMemberSlotDecision> = {};
  for (const [slotId, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!slotId || !entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const record = entry as Record<string, unknown>;
    if (record.state !== 'BOOKED' && record.state !== 'WAITLISTED') continue;
    clean[slotId] = {
      state: record.state,
      spotId: typeof record.spotId === 'string' ? record.spotId : undefined,
      slotTitle: typeof record.slotTitle === 'string' ? record.slotTitle : undefined,
      slotDate:
        typeof record.slotDate === 'string' && ISO_DATE_PATTERN.test(record.slotDate)
          ? record.slotDate
          : undefined,
      slotTime: typeof record.slotTime === 'string' ? record.slotTime : undefined,
      waitlistOrder:
        typeof record.waitlistOrder === 'number' && Number.isFinite(record.waitlistOrder)
          ? Math.max(1, Math.floor(record.waitlistOrder))
          : undefined,
      updatedAt:
        typeof record.updatedAt === 'string' && record.updatedAt
          ? record.updatedAt
          : new Date(0).toISOString(),
    };
  }
  return clean;
}

function stableSlotBaseEnrolled(classId: string, dateIso: string): number {
  const seed = `${classId}:${dateIso}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return (hash % 4) + 2;
}

export function getApparatusStudio3dImage(apparatus: ApparatusType | 'mixed'): string {
  switch (apparatus) {
    case 'cadillac':
      return '/images/atelier-v2/cadillac-studio-3d.png';
    case 'chair':
      return '/images/atelier-v2/chair-studio-3d.png';
    case 'barrel':
      return '/images/atelier-v2/barrel-studio-3d.png';
    case 'mat':
      return '/images/atelier-ring-still-life.png';
    case 'reformer':
    case 'mixed':
    default:
      return '/images/atelier-v2/reformer-studio-3d.png';
  }
}

export function computeStudioSpotStates(slot: MemberBookableSlot): ReadonlyArray<{
  readonly spotId: string;
  readonly zoneKo: string;
  readonly occupiedByOther: boolean;
}> {
  const catalog = getApparatusSpotCatalog(slot.apparatus);
  const spots = catalog.slice(0, Math.max(1, Math.min(catalog.length, slot.maxCapacity)));
  const occupiedOrder = [2, 0, 5, 3, 4, 1].filter((idx) => idx < spots.length);
  const occupiedCount = Math.min(spots.length, Math.max(0, slot.baseEnrolled));
  const occupiedIndices = new Set(occupiedOrder.slice(0, occupiedCount));

  return spots.map((spot, idx) => ({
    spotId: spot.spotId,
    zoneKo: spot.zoneKo,
    occupiedByOther: occupiedIndices.has(idx),
  }));
}

export function pickDefaultOpenSpotId(slot: MemberBookableSlot): string {
  const states = computeStudioSpotStates(slot);
  const fallbackSpot = getApparatusSpotCatalog(slot.apparatus)[0]?.spotId ?? 'R1';
  return states.find((s) => !s.occupiedByOther)?.spotId ?? states[0]?.spotId ?? fallbackSpot;
}

export function isSlotPastFreeCancelDeadline(
  slot: Pick<MemberBookableSlot, 'date' | 'startTime' | 'freeCancelHoursBefore'> &
    Partial<Pick<MemberBookableSlot, 'occurrenceStatus'>>,
  decisionUpdatedAt?: string,
  nowMs: number = Date.now(),
): boolean {
  if (slot.occurrenceStatus && slot.occurrenceStatus !== 'scheduled') {
    return false;
  }
  if (decisionUpdatedAt) {
    const bookedAtMs = Date.parse(decisionUpdatedAt);
    if (
      Number.isFinite(bookedAtMs) &&
      nowMs - bookedAtMs >= 0 &&
      nowMs - bookedAtMs < BOOKING_MISTAKE_GRACE_MS
    ) {
      return false;
    }
  }
  const [year, month, day] = slot.date.split('-').map(Number);
  const [hour, minute] = slot.startTime.split(':').map(Number);
  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) {
    return false;
  }
  const slotStartMs = new Date(year, month - 1, day, hour, minute, 0, 0).getTime();
  if (!Number.isFinite(slotStartMs)) return false;
  return slotStartMs - nowMs < slot.freeCancelHoursBefore * 3_600_000;
}

export function createDefaultMemberPass(todayIso: string): MemberPassSummary {
  return {
    passId: 'pass-group-20',
    passTitle: '6:1 기구 필라테스 20회권',
    participantAlias: '저녁A-04 (별칭)',
    remainingCount: 7,
    pendingReservedCount: 0,
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
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || !parsed.pass) {
      return fallback;
    }
    const rawPass = parsed.pass as Partial<MemberPassSummary>;
    const totalCount = sanitizeNonNegativeInt(rawPass.totalCount, 20, 1);
    const remainingCount = Math.min(
      totalCount,
      sanitizeNonNegativeInt(rawPass.remainingCount, 7, 0),
    );
    const slotDecisions = sanitizeSlotDecisions(parsed.slotDecisions);
    const activeBookedCount = Object.values(slotDecisions).filter(
      (item) => item.state === 'BOOKED',
    ).length;
    const expiresAtIso =
      typeof rawPass.expiresAtIso === 'string' && ISO_DATE_PATTERN.test(rawPass.expiresAtIso)
        ? rawPass.expiresAtIso
        : fallback.pass.expiresAtIso;

    return {
      pass: {
        passId:
          typeof rawPass.passId === 'string' && rawPass.passId.trim()
            ? rawPass.passId
            : fallback.pass.passId,
        passTitle:
          typeof rawPass.passTitle === 'string' && rawPass.passTitle.trim()
            ? rawPass.passTitle
            : fallback.pass.passTitle,
        participantAlias:
          typeof rawPass.participantAlias === 'string' && rawPass.participantAlias.trim()
            ? rawPass.participantAlias
            : fallback.pass.participantAlias,
        remainingCount,
        pendingReservedCount: activeBookedCount,
        totalCount,
        expiresAtIso,
      },
      slotDecisions,
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
  if (slot.occurrenceStatus === 'closed' || slot.occurrenceStatus === 'moved') {
    return 'CLOSED';
  }
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
  todayIso?: string,
): MemberBookingActionIntent | null {
  if (todayIso && slot.date < todayIso) {
    return null;
  }
  if (slot.myState === 'BOOKED') return 'CANCEL_BOOKING';
  if (slot.myState === 'WAITLISTED') return 'CANCEL_WAITLIST';
  if (slot.occurrenceStatus !== 'scheduled') {
    return null;
  }
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
      title: '체어 하체·코어 집중 플로우',
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
      mySpotId: decision?.spotId,
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
  // Clamp to the last supported schedule date so the final week of 2199 never exceeds the valid range.
  const rawWeekEnd = addScheduleDays(weekStart, 6);
  const weekEnd = rawWeekEnd > '2199-12-31' ? '2199-12-31' : rawWeekEnd;
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
  const slots: MemberBookableSlot[] = dayRows.map((row) => {
    const location = schedule.locations.find((loc) => loc.id === row.locationId);
    const linkedSeq = row.linkSavedSequenceId
      ? savedSequences.find((seq) => seq.id === row.linkSavedSequenceId)
      : undefined;
    const eqLabels = (location?.equipmentIds ?? [])
      .map((id) => EQUIPMENT_OPTIONS.find((item) => item.id === id)?.labelKo ?? id)
      .slice(0, 3);
    const locFamilies = getEquipmentFamilies(location?.equipmentIds ?? []);
    const apparatus: ApparatusType | 'mixed' =
      linkedSeq?.apparatus ??
      (locFamilies.length > 1 ? 'mixed' : (locFamilies[0] ?? 'reformer'));
    const decision = decisions[row.id];
    const deterministicEnrolled = stableSlotBaseEnrolled(row.classId, row.date);

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
      mySpotId: decision?.spotId,
      myWaitlistOrder: decision?.waitlistOrder,
    };
  });

  return { slots, weekCounts };
}
