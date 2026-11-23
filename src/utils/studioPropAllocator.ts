import {
  APPARATUS_LABELS,
  PROP_LABELS,
  REFORMER_BRAND_META,
} from '../data/pilatesCatalog';
import type {
  ApparatusType,
  DifficultyLevel,
  PilatesExercise,
  PropType,
  ReformerBrand,
  SequenceStep,
  SpinalPlane,
} from '../types/pilates';
import { isRestStep } from './sequenceEngine';

/**
 * Instructor operation mode that tailors UI surface complexity:
 * - `freelance` (default): focused on class delivery, venue equipment/spring presets,
 *   one-tap prop-shortage adaptation, and simple class-count / fee tracking.
 * - `solo-owner`: adds post-class member message drafts, studio FAQ 1-tap copy,
 *   and monthly sequence balance reports.
 * - `center-manager`: adds multi-room concurrent prop conflict detection,
 *   first/second-half timeshare scheduling, emergency room/apparatus conversion,
 *   and 3-minute substitute-instructor handoff briefs.
 */
export type StudioRoleMode = 'freelance' | 'solo-owner' | 'center-manager';

export const STUDIO_ROLE_STORAGE_KEY = 'pf_studio_role_mode_v1';
export const FREELANCE_FEE_LOG_STORAGE_KEY = 'pf_freelance_session_log_v1';

export interface StudioRoleMeta {
  readonly id: StudioRoleMode;
  readonly labelKo: string;
  readonly shortLabelKo: string;
  readonly subtitleKo: string;
  readonly badgeKo: string;
}

export const STUDIO_ROLE_MODES: readonly StudioRoleMeta[] = [
  {
    id: 'freelance',
    labelKo: '프리랜서 강사',
    shortLabelKo: '프리랜서',
    subtitleKo: '출강 센터별 스프링 자동 전환 · 교보재 부족 1탭 대체 · 내 출강 횟수 집계',
    badgeKo: '수업 집중',
  },
  {
    id: 'solo-owner',
    labelKo: '1인 스튜디오',
    shortLabelKo: '1인 운영',
    subtitleKo: '교보재 자동 대체 + 수업 후 회원 카톡 초안 · FAQ 1탭 복사 · 월간 수업 밸런스',
    badgeKo: '회원 소통',
  },
  {
    id: 'center-manager',
    labelKo: '다강사 센터',
    shortLabelKo: '다강사 센터',
    subtitleKo: '동시간대 타 룸 교보재 충돌 감지 · 전/후반 교차 배분 · 기구 전환 · 대강 3분 인수인계',
    badgeKo: '센터 배분',
  },
] as const;

export function isStudioRoleMode(value: unknown): value is StudioRoleMode {
  return value === 'freelance' || value === 'solo-owner' || value === 'center-manager';
}

export function loadSavedStudioRoleMode(
  fallback: StudioRoleMode = 'freelance',
): StudioRoleMode {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return fallback;
    const raw = window.localStorage.getItem(STUDIO_ROLE_STORAGE_KEY);
    return isStudioRoleMode(raw) ? raw : fallback;
  } catch {
    return fallback;
  }
}

export function saveStudioRoleMode(mode: StudioRoleMode): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(STUDIO_ROLE_STORAGE_KEY, mode);
  } catch {
    // Ignore storage quota or private-mode restrictions gracefully.
  }
}

export type StudioAccessoryId = 'long-box' | 'short-box' | 'jumpboard';
export type StudioResourceItemId = Exclude<PropType, 'none'> | StudioAccessoryId;

export interface StudioResourceMeta {
  readonly id: StudioResourceItemId;
  readonly labelKo: string;
  readonly kind: 'prop' | 'accessory';
  readonly defaultQuantity: number;
  readonly featuredInPanel: boolean;
}

export const STUDIO_RESOURCE_CATALOG: readonly StudioResourceMeta[] = [
  { id: 'mini-ball', labelKo: '미니볼', kind: 'prop', defaultQuantity: 10, featuredInPanel: true },
  { id: 'magic-circle', labelKo: '써클링', kind: 'prop', defaultQuantity: 6, featuredInPanel: true },
  { id: 'foam-roller', labelKo: '폼롤러', kind: 'prop', defaultQuantity: 8, featuredInPanel: true },
  { id: 'loop-band', labelKo: '루프밴드', kind: 'prop', defaultQuantity: 12, featuredInPanel: true },
  { id: 'toning-ball', labelKo: '토닝볼', kind: 'prop', defaultQuantity: 8, featuredInPanel: true },
  { id: 'bosu', labelKo: '보수', kind: 'prop', defaultQuantity: 4, featuredInPanel: true },
  { id: 'dumbbell', labelKo: '덤벨', kind: 'prop', defaultQuantity: 6, featuredInPanel: true },
  { id: 'long-box', labelKo: '롱박스', kind: 'accessory', defaultQuantity: 6, featuredInPanel: true },
  { id: 'short-box', labelKo: '숏박스', kind: 'accessory', defaultQuantity: 6, featuredInPanel: true },
  { id: 'jumpboard', labelKo: '점프보드', kind: 'accessory', defaultQuantity: 4, featuredInPanel: true },
  { id: 'theraband', labelKo: '탄력 밴드', kind: 'prop', defaultQuantity: 10, featuredInPanel: false },
  { id: 'sliders', labelKo: '슬라이더', kind: 'prop', defaultQuantity: 6, featuredInPanel: false },
  { id: 'yoga-block', labelKo: '요가 블록', kind: 'prop', defaultQuantity: 8, featuredInPanel: false },
  { id: 'fitness-ball', labelKo: '짐볼', kind: 'prop', defaultQuantity: 4, featuredInPanel: false },
  { id: 'tube-band', labelKo: '튜브 밴드', kind: 'prop', defaultQuantity: 8, featuredInPanel: false },
  { id: 'long-band', labelKo: '롱 밴드', kind: 'prop', defaultQuantity: 8, featuredInPanel: false },
] as const;

const RESOURCE_META_MAP = new Map<StudioResourceItemId, StudioResourceMeta>(
  STUDIO_RESOURCE_CATALOG.map((item) => [item.id, item]),
);

export function getStudioResourceLabelKo(id: StudioResourceItemId | 'none'): string {
  if (id === 'none') return '맨몸 (소도구 없음)';
  const meta = RESOURCE_META_MAP.get(id);
  if (meta) return meta.labelKo;
  return PROP_LABELS[id as PropType]?.ko ?? id;
}

export function isAccessoryResource(id: StudioResourceItemId): id is StudioAccessoryId {
  return id === 'long-box' || id === 'short-box' || id === 'jumpboard';
}

export interface StudioRoomCapacity {
  readonly roomId: string;
  readonly roomNameKo: string;
  readonly primaryApparatus: ApparatusType;
  readonly secondaryApparatus?: readonly ApparatusType[];
  readonly totalUnits: number;
  readonly operationalUnits: number;
  readonly classFormat: 'group' | 'duet' | 'private';
}

export interface StudioResourceInventory {
  readonly studioLabelKo: string;
  readonly quantities: Record<StudioResourceItemId, number>;
  readonly rooms: readonly StudioRoomCapacity[];
}

export function createDefaultResourceQuantities(
  overrides?: Partial<Record<StudioResourceItemId, number>>,
): Record<StudioResourceItemId, number> {
  const base = {} as Record<StudioResourceItemId, number>;
  for (const item of STUDIO_RESOURCE_CATALOG) {
    base[item.id] = item.defaultQuantity;
  }
  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        base[key as StudioResourceItemId] = Math.max(0, Math.floor(value));
      }
    }
  }
  return base;
}

export const DEFAULT_STUDIO_INVENTORY: StudioResourceInventory = {
  studioLabelKo: '우리 스튜디오 기본 보유량',
  quantities: createDefaultResourceQuantities(),
  rooms: [
    {
      roomId: 'room-a-reformer',
      roomNameKo: 'A룸 · 리포머 6:1',
      primaryApparatus: 'reformer',
      secondaryApparatus: ['mat'],
      totalUnits: 6,
      operationalUnits: 6,
      classFormat: 'group',
    },
    {
      roomId: 'room-b-chair-barrel',
      roomNameKo: 'B룸 · 체어·바렐 6:1',
      primaryApparatus: 'chair',
      secondaryApparatus: ['barrel', 'mat'],
      totalUnits: 6,
      operationalUnits: 6,
      classFormat: 'group',
    },
    {
      roomId: 'room-c-cadillac-private',
      roomNameKo: 'C룸 · 1:1 캐딜락',
      primaryApparatus: 'cadillac',
      secondaryApparatus: ['reformer', 'mat'],
      totalUnits: 2,
      operationalUnits: 2,
      classFormat: 'private',
    },
  ],
};

export interface FreelanceVenuePreset {
  readonly id: string;
  readonly venueLabelKo: string;
  readonly reformerBrand: ReformerBrand;
  readonly defaultHeadcount: number;
  readonly feePerClassKrw: number;
  readonly availableApparatus: readonly ApparatusType[];
  readonly propQuantities: Partial<Record<StudioResourceItemId, number>>;
  readonly noteKo: string;
}

export const DEFAULT_FREELANCE_VENUE_PRESETS: readonly FreelanceVenuePreset[] = [
  {
    id: 'venue-a-intopilates',
    venueLabelKo: 'A 센터 · 인투필라테스 6:1',
    reformerBrand: 'intopilates',
    defaultHeadcount: 6,
    feePerClassKrw: 45_000,
    availableApparatus: ['reformer', 'chair', 'barrel', 'mat'],
    propQuantities: {
      'mini-ball': 10,
      'magic-circle': 6,
      'foam-roller': 8,
      'loop-band': 12,
      'long-box': 6,
      'short-box': 6,
    },
    noteKo: '빨강(강)·파랑(중)·노랑(약) 국내 표준 스프링 구성',
  },
  {
    id: 'venue-b-balanced-body',
    venueLabelKo: 'B 센터 · 밸런스드 바디 6:1',
    reformerBrand: 'balanced-body',
    defaultHeadcount: 6,
    feePerClassKrw: 50_000,
    availableApparatus: ['reformer', 'cadillac', 'chair', 'mat'],
    propQuantities: {
      'mini-ball': 8,
      'magic-circle': 4,
      'foam-roller': 6,
      'loop-band': 10,
      'toning-ball': 6,
      'long-box': 6,
      'short-box': 4,
    },
    noteKo: 'Red·Blue·Yellow 장력 기준 · 써클링 4개 소량 보유',
  },
  {
    id: 'venue-c-stott-private',
    venueLabelKo: 'C 센터 · 스탓 1:1·듀엣',
    reformerBrand: 'stott',
    defaultHeadcount: 2,
    feePerClassKrw: 60_000,
    availableApparatus: ['reformer', 'cadillac', 'chair', 'barrel', 'mat'],
    propQuantities: {
      'mini-ball': 4,
      'magic-circle': 4,
      'foam-roller': 4,
      'bosu': 2,
      'jumpboard': 2,
    },
    noteKo: 'Red(1.0)·Blue(0.5)·White(0.25) 세밀 장력 표기',
  },
];

export interface FreelanceSessionEntry {
  readonly id: string;
  readonly venueId: string;
  readonly venueLabelKo: string;
  readonly classCount: number;
  readonly feePerClassKrw: number;
}

export interface FreelanceEarningsSummary {
  readonly totalClasses: number;
  readonly totalFeeKrw: number;
  readonly averageFeeKrw: number;
  readonly byVenue: ReadonlyArray<{
    readonly venueId: string;
    readonly venueLabelKo: string;
    readonly classCount: number;
    readonly subtotalKrw: number;
  }>;
}

export function summarizeFreelanceEarnings(
  entries: readonly FreelanceSessionEntry[],
): FreelanceEarningsSummary {
  const byVenueMap = new Map<
    string,
    { venueId: string; venueLabelKo: string; classCount: number; subtotalKrw: number }
  >();
  let totalClasses = 0;
  let totalFeeKrw = 0;

  for (const entry of entries) {
    const safeCount = Math.max(0, Math.floor(entry.classCount));
    const safeFee = Math.max(0, Math.floor(entry.feePerClassKrw));
    if (safeCount === 0) continue;
    const subtotal = safeCount * safeFee;
    totalClasses += safeCount;
    totalFeeKrw += subtotal;
    const existing = byVenueMap.get(entry.venueId);
    if (existing) {
      existing.classCount += safeCount;
      existing.subtotalKrw += subtotal;
    } else {
      byVenueMap.set(entry.venueId, {
        venueId: entry.venueId,
        venueLabelKo: entry.venueLabelKo,
        classCount: safeCount,
        subtotalKrw: subtotal,
      });
    }
  }

  return {
    totalClasses,
    totalFeeKrw,
    averageFeeKrw: totalClasses > 0 ? Math.round(totalFeeKrw / totalClasses) : 0,
    byVenue: [...byVenueMap.values()],
  };
}

export interface VenueSpringAdaptationResult {
  readonly venue: FreelanceVenuePreset;
  readonly adaptedSteps: SequenceStep[];
  readonly updatedStepCount: number;
  readonly brandLabelKo: string;
  readonly summaryKo: string;
}

export function adaptSequenceSpringsForVenue(
  steps: readonly SequenceStep[],
  exercises: readonly PilatesExercise[],
  venue: FreelanceVenuePreset,
): VenueSpringAdaptationResult {
  const exerciseMap = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const brandMeta = REFORMER_BRAND_META[venue.reformerBrand];
  let updatedStepCount = 0;

  const adaptedSteps = steps.map((step) => {
    if (isRestStep(step)) return { ...step };
    const exercise = exerciseMap.get(step.exerciseId);
    if (!exercise) return { ...step };
    const rawSpring = (step.customSpringOverride ?? exercise.springs).trim();
    const mappedLabel = brandMeta.springMapping[rawSpring];
    if (!mappedLabel) {
      return { ...step };
    }
    updatedStepCount += 1;
    const cleanedPrevNote = (step.instructorNote ?? '')
      .replace(/\s*\[출강 스프링[^\]]*\]/g, '')
      .trim();
    const venueNote = `[출강 스프링 · ${brandMeta.nameKo.split(' ')[0]}] ${mappedLabel}`;
    return {
      ...step,
      instructorNote: cleanedPrevNote ? `${cleanedPrevNote} · ${venueNote}` : venueNote,
    };
  });

  return {
    venue,
    adaptedSteps,
    updatedStepCount,
    brandLabelKo: brandMeta.nameKo,
    summaryKo: `${venue.venueLabelKo} 기준(${brandMeta.note})으로 ${updatedStepCount}개 동작 스프링 안내를 맞췄어요.`,
  };
}

export type PropUsageWindow = 'full-class' | 'first-half' | 'second-half';

export interface ConcurrentRoomSession {
  readonly sessionId: string;
  readonly roomId: string;
  readonly roomNameKo: string;
  readonly instructorAliasKo: string;
  readonly date?: string;
  readonly startTime?: string;
  readonly durationMin?: number;
  readonly headcount: number;
  readonly primaryApparatus: ApparatusType;
  /** Resources needed 1-per-member during this concurrent class. */
  readonly requiredResourcesPerMember: readonly StudioResourceItemId[];
  /** Optional explicit quantity overrides (e.g. shared props). */
  readonly explicitResourceQuantities?: Partial<Record<StudioResourceItemId, number>>;
  readonly propUsageWindow?: PropUsageWindow;
  readonly active?: boolean;
}

export const DEFAULT_CONCURRENT_SESSIONS: readonly ConcurrentRoomSession[] = [
  {
    sessionId: 'slot-room-b-1000',
    roomId: 'room-b-chair-barrel',
    roomNameKo: 'B룸 · 체어·바렐',
    instructorAliasKo: 'B룸 담당 강사',
    date: '2026-11-24',
    startTime: '10:00',
    durationMin: 50,
    headcount: 6,
    primaryApparatus: 'chair',
    requiredResourcesPerMember: ['magic-circle', 'long-box'],
    propUsageWindow: 'full-class',
    active: true,
  },
  {
    sessionId: 'slot-room-c-1000',
    roomId: 'room-c-cadillac-private',
    roomNameKo: 'C룸 · 1:1 캐딜락',
    instructorAliasKo: 'C룸 담당 강사',
    date: '2026-11-24',
    startTime: '10:00',
    durationMin: 50,
    headcount: 2,
    primaryApparatus: 'cadillac',
    requiredResourcesPerMember: ['foam-roller'],
    propUsageWindow: 'full-class',
    active: false,
  },
];

function parseMinutesOfDay(timeText?: string): number | null {
  if (!timeText) return null;
  const match = timeText.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
}

export function isTimeSlotOverlapping(
  mySlot: { readonly date?: string; readonly startTime?: string; readonly durationMin?: number },
  other: { readonly date?: string; readonly startTime?: string; readonly durationMin?: number },
): boolean {
  if (mySlot.date && other.date && mySlot.date !== other.date) {
    return false;
  }
  const myStart = parseMinutesOfDay(mySlot.startTime);
  const otherStart = parseMinutesOfDay(other.startTime);
  if (myStart === null || otherStart === null) {
    return true;
  }
  const myEnd = myStart + Math.max(10, mySlot.durationMin ?? 50);
  const otherEnd = otherStart + Math.max(10, other.durationMin ?? 50);
  return myStart < otherEnd && otherStart < myEnd;
}

export function extractStepRequiredResources(
  step: SequenceStep,
  exercise?: PilatesExercise,
): StudioResourceItemId[] {
  if (isRestStep(step)) return [];
  const required = new Set<StudioResourceItemId>();

  if (step.propOverride !== undefined) {
    if (step.propOverride !== 'none') {
      required.add(step.propOverride);
    }
  } else if (exercise) {
    for (const prop of exercise.props) {
      if (prop !== 'none') {
        required.add(prop);
      }
    }
  }

  const effectiveBox = step.boxOverride ?? exercise?.box ?? 'none';
  if (effectiveBox === 'long-box') required.add('long-box');
  if (effectiveBox === 'short-box') required.add('short-box');

  if (exercise) {
    const textForJumpboard = `${exercise.id} ${exercise.nameKo} ${exercise.nameEn}`;
    if (/점프보드|jump\s*board|jumpboard/i.test(textForJumpboard)) {
      required.add('jumpboard');
    }
  }

  return [...required];
}

export interface OtherRoomResourceUsage {
  readonly sessionId: string;
  readonly roomNameKo: string;
  readonly instructorAliasKo: string;
  readonly count: number;
  readonly usageWindow: PropUsageWindow;
}

export interface ResourceAllocationEntry {
  readonly resourceId: StudioResourceItemId;
  readonly labelKo: string;
  readonly kind: 'prop' | 'accessory';
  readonly totalInventory: number;
  readonly otherRoomsUsed: number;
  readonly otherRoomBreakdown: readonly OtherRoomResourceUsage[];
  readonly remainingBeforeMyClass: number;
  readonly myClassNeeded: number;
  readonly remainingAfterMyClass: number;
  readonly shortage: number;
  readonly status: 'ok' | 'tight' | 'conflict';
  readonly affectedStepIds: readonly string[];
  readonly affectedStepOrders: readonly number[];
}

export interface ApparatusCapacityConflict {
  readonly roomId: string;
  readonly roomNameKo: string;
  readonly requestedApparatus: ApparatusType;
  readonly roomPrimaryApparatus: ApparatusType;
  readonly totalUnits: number;
  readonly operationalUnits: number;
  readonly neededUnits: number;
  readonly shortageUnits: number;
  readonly reasonKo: string;
  readonly fallbackApparatusCandidates: readonly ApparatusType[];
}

export interface DetectConflictsInput {
  readonly steps: readonly SequenceStep[];
  readonly exercises: readonly PilatesExercise[];
  readonly inventory: StudioResourceInventory;
  readonly myHeadcount: number;
  readonly concurrentSessions: readonly ConcurrentRoomSession[];
  readonly myRoomId?: string;
  readonly date?: string;
  readonly startTime?: string;
  readonly durationMin?: number;
}

export interface TimeSlotResourceConflictReport {
  readonly slotLabelKo: string;
  readonly myHeadcount: number;
  readonly myRoom: StudioRoomCapacity | null;
  readonly activeConcurrentSessions: readonly ConcurrentRoomSession[];
  readonly resourceAllocations: readonly ResourceAllocationEntry[];
  readonly conflictingResources: readonly ResourceAllocationEntry[];
  readonly availableSubstituteProps: readonly ResourceAllocationEntry[];
  readonly apparatusConflict: ApparatusCapacityConflict | null;
  readonly hasAnyConflict: boolean;
  readonly summaryHeadlineKo: string;
}

function resolveSessionResourceCount(
  session: ConcurrentRoomSession,
  resourceId: StudioResourceItemId,
): number {
  const explicit = session.explicitResourceQuantities?.[resourceId];
  if (typeof explicit === 'number' && Number.isFinite(explicit)) {
    return Math.max(0, Math.floor(explicit));
  }
  if (session.requiredResourcesPerMember.includes(resourceId)) {
    return Math.max(0, Math.floor(session.headcount));
  }
  return 0;
}

function getDominantSequenceApparatus(
  steps: readonly SequenceStep[],
  exerciseMap: ReadonlyMap<string, PilatesExercise>,
): ApparatusType {
  const counts = new Map<ApparatusType, number>();
  for (const step of steps) {
    if (isRestStep(step)) continue;
    const ex = exerciseMap.get(step.exerciseId);
    if (!ex) continue;
    counts.set(ex.apparatus, (counts.get(ex.apparatus) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : 'reformer';
}

export function detectTimeSlotResourceConflicts(
  input: DetectConflictsInput,
): TimeSlotResourceConflictReport {
  const {
    steps,
    exercises,
    inventory,
    concurrentSessions,
    myRoomId,
    date,
    startTime,
    durationMin = 50,
  } = input;

  const myHeadcount = Math.max(1, Math.floor(input.myHeadcount));
  const exerciseMap = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const myRoom =
    (myRoomId ? inventory.rooms.find((room) => room.roomId === myRoomId) : inventory.rooms[0]) ??
    null;

  const activeConcurrentSessions = concurrentSessions.filter((session) => {
    if (session.active === false) return false;
    if (myRoom && session.roomId === myRoom.roomId) return false;
    return isTimeSlotOverlapping({ date, startTime, durationMin }, session);
  });

  // Collect resources needed by my sequence
  const myNeededStepMap = new Map<
    StudioResourceItemId,
    { stepIds: string[]; stepOrders: number[] }
  >();
  steps.forEach((step, idx) => {
    const ex = exerciseMap.get(step.exerciseId);
    const reqs = extractStepRequiredResources(step, ex);
    for (const resourceId of reqs) {
      const entry = myNeededStepMap.get(resourceId) ?? { stepIds: [], stepOrders: [] };
      entry.stepIds.push(step.stepId);
      entry.stepOrders.push(step.order || idx + 1);
      myNeededStepMap.set(resourceId, entry);
    }
  });

  const resourceAllocations: ResourceAllocationEntry[] = STUDIO_RESOURCE_CATALOG.map((meta) => {
    const totalInventory = Math.max(0, Math.floor(inventory.quantities[meta.id] ?? 0));
    const otherRoomBreakdown: OtherRoomResourceUsage[] = [];
    let otherRoomsUsed = 0;

    for (const session of activeConcurrentSessions) {
      const used = resolveSessionResourceCount(session, meta.id);
      if (used > 0) {
        otherRoomsUsed += used;
        otherRoomBreakdown.push({
          sessionId: session.sessionId,
          roomNameKo: session.roomNameKo,
          instructorAliasKo: session.instructorAliasKo,
          count: used,
          usageWindow: session.propUsageWindow ?? 'full-class',
        });
      }
    }

    const remainingBeforeMyClass = Math.max(0, totalInventory - otherRoomsUsed);
    const myUsage = myNeededStepMap.get(meta.id);
    const myClassNeeded = myUsage ? myHeadcount : 0;
    const shortage = Math.max(0, myClassNeeded - remainingBeforeMyClass);
    const remainingAfterMyClass = Math.max(0, remainingBeforeMyClass - myClassNeeded);

    let status: 'ok' | 'tight' | 'conflict' = 'ok';
    if (shortage > 0) {
      status = 'conflict';
    } else if (myClassNeeded > 0 && remainingAfterMyClass <= 1) {
      status = 'tight';
    }

    return {
      resourceId: meta.id,
      labelKo: meta.labelKo,
      kind: meta.kind,
      totalInventory,
      otherRoomsUsed,
      otherRoomBreakdown,
      remainingBeforeMyClass,
      myClassNeeded,
      remainingAfterMyClass,
      shortage,
      status,
      affectedStepIds: myUsage?.stepIds ?? [],
      affectedStepOrders: myUsage?.stepOrders ?? [],
    };
  });

  const conflictingResources = resourceAllocations.filter((item) => item.shortage > 0);
  const availableSubstituteProps = resourceAllocations
    .filter((item) => item.kind === 'prop' && item.remainingBeforeMyClass >= myHeadcount)
    .sort((a, b) => b.remainingBeforeMyClass - a.remainingBeforeMyClass);

  // Room apparatus capacity & mismatch detection
  const dominantApparatus = getDominantSequenceApparatus(steps, exerciseMap);
  let apparatusConflict: ApparatusCapacityConflict | null = null;

  if (myRoom) {
    const roomSupportsDominant =
      myRoom.primaryApparatus === dominantApparatus ||
      (myRoom.secondaryApparatus?.includes(dominantApparatus) ?? false);

    const buildFallbackCandidates = (excludeApparatus: ApparatusType): ApparatusType[] => {
      const candidates: ApparatusType[] = [];
      for (const room of inventory.rooms) {
        if (room.operationalUnits >= myHeadcount && room.primaryApparatus !== excludeApparatus) {
          if (!candidates.includes(room.primaryApparatus)) {
            candidates.push(room.primaryApparatus);
          }
        }
        for (const sec of room.secondaryApparatus ?? []) {
          if (sec !== excludeApparatus && !candidates.includes(sec)) {
            candidates.push(sec);
          }
        }
      }
      if (!candidates.includes('chair') && excludeApparatus !== 'chair') candidates.push('chair');
      if (!candidates.includes('barrel') && excludeApparatus !== 'barrel') candidates.push('barrel');
      if (!candidates.includes('mat') && excludeApparatus !== 'mat') candidates.push('mat');
      return candidates;
    };

    if (!roomSupportsDominant && dominantApparatus !== 'mat') {
      apparatusConflict = {
        roomId: myRoom.roomId,
        roomNameKo: myRoom.roomNameKo,
        requestedApparatus: dominantApparatus,
        roomPrimaryApparatus: myRoom.primaryApparatus,
        totalUnits: myRoom.totalUnits,
        operationalUnits: myRoom.operationalUnits,
        neededUnits: myHeadcount,
        shortageUnits: myHeadcount,
        reasonKo: `${myRoom.roomNameKo}은 ${APPARATUS_LABELS[myRoom.primaryApparatus].ko} 중심 공간이라 ${APPARATUS_LABELS[dominantApparatus].ko} 시퀀스를 바로 진행하기 어려워요.`,
        fallbackApparatusCandidates: (
          [
            myRoom.primaryApparatus,
            ...(myRoom.secondaryApparatus ?? []),
            'mat',
          ] as ApparatusType[]
        ).filter((value, index, arr) => arr.indexOf(value) === index),
      };
    } else if (dominantApparatus !== 'mat' && myRoom.operationalUnits < myHeadcount) {
      const shortageUnits = myHeadcount - myRoom.operationalUnits;
      apparatusConflict = {
        roomId: myRoom.roomId,
        roomNameKo: myRoom.roomNameKo,
        requestedApparatus: dominantApparatus,
        roomPrimaryApparatus: myRoom.primaryApparatus,
        totalUnits: myRoom.totalUnits,
        operationalUnits: myRoom.operationalUnits,
        neededUnits: myHeadcount,
        shortageUnits,
        reasonKo: `${myRoom.roomNameKo} 가용 ${APPARATUS_LABELS[myRoom.primaryApparatus].ko}가 ${myRoom.operationalUnits}대로 수업 인원(${myHeadcount}명)보다 ${shortageUnits}대 부족해요.`,
        fallbackApparatusCandidates: buildFallbackCandidates(dominantApparatus),
      };
    }
  }

  const hasAnyConflict = conflictingResources.length > 0 || apparatusConflict !== null;
  const slotLabelKo =
    date && startTime
      ? `${date} ${startTime} (${durationMin}분)`
      : startTime
        ? `${startTime} 타임 (${durationMin}분)`
        : `현재 수업 타임 (${durationMin}분)`;

  let summaryHeadlineKo = '지금 수업에 필요한 교보재와 기구가 모두 여유 있어요.';
  if (apparatusConflict && conflictingResources.length > 0) {
    const names = conflictingResources.map((item) => `${item.labelKo} ${item.shortage}개`).join(', ');
    summaryHeadlineKo = `기구 ${apparatusConflict.shortageUnits}대 및 교보재(${names}) 부족이 감지됐어요.`;
  } else if (apparatusConflict) {
    summaryHeadlineKo = apparatusConflict.reasonKo;
  } else if (conflictingResources.length > 0) {
    const names = conflictingResources.map((item) => `${item.labelKo} ${item.shortage}개`).join(', ');
    summaryHeadlineKo = `동시간대 수업과 겹쳐 ${names} 부족해요. 아래 버튼 하나로 자동 정리할 수 있어요.`;
  }

  return {
    slotLabelKo,
    myHeadcount,
    myRoom,
    activeConcurrentSessions,
    resourceAllocations,
    conflictingResources,
    availableSubstituteProps,
    apparatusConflict,
    hasAnyConflict,
    summaryHeadlineKo,
  };
}

export type AutoAdaptStrategyId =
  | 'swap-available-prop'
  | 'stagger-half-class'
  | 'adapt-room-apparatus';

export interface StepAdaptationDiff {
  readonly stepId: string;
  readonly order: number;
  readonly beforeExerciseId: string;
  readonly afterExerciseId: string;
  readonly beforeExerciseNameKo: string;
  readonly afterExerciseNameKo: string;
  readonly beforeResourceLabelKo: string;
  readonly afterResourceLabelKo: string;
  readonly beforeSprings: string;
  readonly afterSprings: string;
  readonly cueSyncNoteKo: string;
  readonly changeKind: 'prop-swapped' | 'reordered-timeshare' | 'apparatus-converted' | 'kept-locked';
}

export interface TimeShareSplitPlan {
  readonly sharedResourceLabelsKo: readonly string[];
  readonly myPropWindow: 'first-half' | 'second-half';
  readonly otherRoomPropWindow: 'first-half' | 'second-half';
  readonly handoverMinuteMark: number;
  readonly myPropBlockMinutes: number;
  readonly coordinationSummaryKo: string;
  readonly copyableRoomNoticeKo: string;
}

export interface AutoAdaptStrategyOption {
  readonly strategyId: AutoAdaptStrategyId;
  readonly titleKo: string;
  readonly buttonLabelKo: string;
  readonly summaryKo: string;
  readonly recommended: boolean;
  readonly applicable: boolean;
  readonly unapplicableReasonKo?: string;
  readonly adaptedSteps: SequenceStep[];
  readonly targetApparatus?: ApparatusType | 'mixed';
  readonly changes: readonly StepAdaptationDiff[];
  readonly timeShareSchedule?: TimeShareSplitPlan;
  readonly preservedSpinalPlanes: readonly SpinalPlane[];
  readonly remainingShortageCount: number;
}

export interface AutoAdaptSequenceInput {
  readonly steps: readonly SequenceStep[];
  readonly exercises: readonly PilatesExercise[];
  readonly conflictReport: TimeSlotResourceConflictReport;
  readonly preferredFallbackApparatus?: ApparatusType;
  readonly preferredSubstituteProp?: PropType;
  readonly preserveLockedSteps?: boolean;
}

export interface AutoAdaptPlanResult {
  readonly strategies: readonly AutoAdaptStrategyOption[];
  readonly recommendedStrategyId: AutoAdaptStrategyId | null;
}

const PROP_BIOMECHANICAL_SUBSTITUTES: Readonly<
  Record<StudioResourceItemId, readonly PropType[]>
> = {
  'magic-circle': ['mini-ball', 'loop-band', 'theraband', 'none'],
  'mini-ball': ['magic-circle', 'yoga-block', 'loop-band', 'none'],
  'foam-roller': ['mini-ball', 'yoga-block', 'none'],
  'loop-band': ['theraband', 'mini-ball', 'magic-circle', 'none'],
  theraband: ['loop-band', 'long-band', 'mini-ball', 'none'],
  'toning-ball': ['dumbbell', 'theraband', 'none'],
  dumbbell: ['toning-ball', 'theraband', 'none'],
  bosu: ['mini-ball', 'none'],
  sliders: ['loop-band', 'none'],
  'yoga-block': ['mini-ball', 'none'],
  'fitness-ball': ['mini-ball', 'none'],
  'tube-band': ['theraband', 'loop-band', 'none'],
  'long-band': ['theraband', 'loop-band', 'none'],
  'long-box': ['none'],
  'short-box': ['none'],
  jumpboard: ['none'],
};

const PROP_CUE_SYNC_HINTS: Readonly<Record<PropType, string>> = {
  none: '소도구 없이 맨몸 정렬로 진행 · 내전근과 복부 중심 연결을 호흡으로 유지해요.',
  'mini-ball': '미니볼로 대체 · 무릎 사이나 등 뒤에 가볍게 지지해 30% 부드러운 압력을 유지해요.',
  'magic-circle': '써클링으로 대체 · 손목·무릎 정렬을 유지하며 일정한 탄성 저항을 느껴요.',
  'foam-roller': '폼롤러로 대체 · 척추 길이를 길게 유지하며 균형 감각에 집중해요.',
  'loop-band': '루프밴드로 대체 · 허벅지 바깥쪽 외전 텐션이 풀리지 않게 천천히 조절해요.',
  theraband: '탄력 밴드로 대체 · 팔꿈치 과신전을 줄이고 견갑골 안정성을 유지해요.',
  'toning-ball': '토닝볼로 대체 · 손목이 꺾이지 않게 가벼운 무게로 어깨 라인을 정돈해요.',
  dumbbell: '가벼운 덤벨로 대체 · 목에 힘이 들어가지 않게 겨드랑이 아래 힘을 연결해요.',
  bosu: '보수로 대체 · 발바닥 세 지점을 고르게 딛고 중심을 천천히 잡아요.',
  sliders: '슬라이더로 대체 · 복부 중심을 유지하며 미끄러지는 범위를 작게 시작해요.',
  'yoga-block': '요가 블록으로 대체 · 좌골과 손목 높이를 편하게 맞춰 정렬을 보조해요.',
  'fitness-ball': '짐볼로 대체 · 골반 흔들림을 줄이며 호흡에 맞춰 천천히 움직여요.',
  'tube-band': '튜브 밴드로 대체 · 당기는 순간 갈비뼈가 들뜨지 않게 호흡을 내쉬어요.',
  'long-band': '롱 밴드로 대체 · 양쪽 장력을 고르게 유지하며 전신 연결을 느껴요.',
};

const LEVEL_NUMERIC: Record<DifficultyLevel, number> = {
  '1.0': 1,
  '1.5': 1.5,
  '2.0': 2,
};

function collectSpinalPlanes(
  steps: readonly SequenceStep[],
  exerciseMap: ReadonlyMap<string, PilatesExercise>,
): SpinalPlane[] {
  const planes = new Set<SpinalPlane>();
  for (const step of steps) {
    if (isRestStep(step)) continue;
    const ex = exerciseMap.get(step.exerciseId);
    if (!ex) continue;
    for (const plane of ex.spinalPlanes) {
      planes.add(plane);
    }
  }
  return [...planes];
}

function formatResourceListLabel(resources: readonly StudioResourceItemId[]): string {
  if (resources.length === 0) return '맨몸 (소도구 없음)';
  return resources.map((item) => getStudioResourceLabelKo(item)).join(' + ');
}

function countOverlap<T>(a: readonly T[], b: readonly T[]): number {
  const setB = new Set(b);
  let count = 0;
  for (const item of a) {
    if (setB.has(item)) count += 1;
  }
  return count;
}

function chooseBestAvailableProp(
  conflictingId: StudioResourceItemId,
  availableSet: ReadonlySet<StudioResourceItemId>,
  preferredSubstituteProp?: PropType,
): PropType {
  if (
    preferredSubstituteProp &&
    (preferredSubstituteProp === 'none' || availableSet.has(preferredSubstituteProp))
  ) {
    return preferredSubstituteProp;
  }
  const preferenceList = PROP_BIOMECHANICAL_SUBSTITUTES[conflictingId] ?? ['none'];
  for (const candidate of preferenceList) {
    if (candidate === 'none') return 'none';
    if (availableSet.has(candidate)) return candidate;
  }
  return 'none';
}

function pickCompatibleCatalogReplacement(params: {
  readonly currentExercise: PilatesExercise;
  readonly candidates: readonly PilatesExercise[];
  readonly blockedResources: ReadonlySet<StudioResourceItemId>;
  readonly usedExerciseIds: ReadonlySet<string>;
  readonly targetApparatus?: ApparatusType;
  readonly preferredProp?: PropType;
}): PilatesExercise | null {
  const {
    currentExercise,
    candidates,
    blockedResources,
    usedExerciseIds,
    targetApparatus,
    preferredProp,
  } = params;

  let bestExercise: PilatesExercise | null = null;
  let bestScore = -Infinity;

  for (const candidate of candidates) {
    if (candidate.id === currentExercise.id) continue;
    if (targetApparatus && candidate.apparatus !== targetApparatus) continue;

    // Exclude candidates requiring any blocked resource
    const candidateProps = candidate.props.filter((p) => p !== 'none');
    const usesBlockedProp = candidateProps.some((p) => blockedResources.has(p));
    const usesBlockedBox =
      (candidate.box === 'long-box' && blockedResources.has('long-box')) ||
      (candidate.box === 'short-box' && blockedResources.has('short-box'));
    if (usesBlockedProp || usesBlockedBox) continue;

    let score = 0;
    if (candidate.blockCategory === currentExercise.blockCategory) score += 45;
    else if (
      (currentExercise.blockCategory === 'feet-in-straps' &&
        (candidate.blockCategory === 'lower-body' || candidate.blockCategory === 'cooldown')) ||
      (currentExercise.blockCategory === 'footwork' && candidate.blockCategory === 'lower-body')
    ) {
      score += 24;
    }

    score += countOverlap(currentExercise.spinalPlanes, candidate.spinalPlanes) * 16;
    score += countOverlap(currentExercise.targetMuscles, candidate.targetMuscles) * 10;

    if (candidate.bodyPosition === currentExercise.bodyPosition) score += 8;
    const levelDiff = Math.abs(LEVEL_NUMERIC[candidate.level] - LEVEL_NUMERIC[currentExercise.level]);
    score += levelDiff === 0 ? 12 : levelDiff <= 0.5 ? 6 : -4;

    if (preferredProp && preferredProp !== 'none' && candidate.props.includes(preferredProp)) {
      score += 14;
    } else if (preferredProp === 'none' && candidateProps.length === 0) {
      score += 10;
    }

    if (candidate.springs === currentExercise.springs) score += 6;
    if (usedExerciseIds.has(candidate.id)) score -= 28;

    if (score > bestScore) {
      bestScore = score;
      bestExercise = candidate;
    }
  }

  return bestScore >= 20 ? bestExercise : null;
}

/**
 * Strategy 1: Swap conflicting props/boxes only for affected steps, preserving
 * target muscles, block flow, and spring efficiency, while syncing instructor notes.
 */
function buildSwapAvailablePropStrategy(
  input: AutoAdaptSequenceInput,
  exerciseMap: ReadonlyMap<string, PilatesExercise>,
): AutoAdaptStrategyOption {
  const { steps, exercises, conflictReport, preferredSubstituteProp, preserveLockedSteps = true } =
    input;
  const blockedResources = new Set<StudioResourceItemId>(
    conflictReport.conflictingResources.map((item) => item.resourceId),
  );
  const availablePropSet = new Set<StudioResourceItemId>(
    conflictReport.availableSubstituteProps.map((item) => item.resourceId),
  );

  if (blockedResources.size === 0) {
    return {
      strategyId: 'swap-available-prop',
      titleKo: '남는 소도구로 자동 대체',
      buttonLabelKo: '남는 소도구로 자동 바꾸기',
      summaryKo: '현재 부족한 소도구가 없어 시퀀스를 그대로 진행할 수 있어요.',
      recommended: false,
      applicable: false,
      unapplicableReasonKo: '부족한 교보재가 없습니다.',
      adaptedSteps: steps.map((step, idx) => ({ ...step, order: idx + 1 })),
      changes: [],
      preservedSpinalPlanes: collectSpinalPlanes(steps, exerciseMap),
      remainingShortageCount: 0,
    };
  }

  const usedIds = new Set(steps.filter((s) => !isRestStep(s)).map((s) => s.exerciseId));
  const changes: StepAdaptationDiff[] = [];
  let remainingShortageCount = 0;

  const adaptedSteps: SequenceStep[] = steps.map((step, idx) => {
    const order = idx + 1;
    if (isRestStep(step)) return { ...step, order };

    const exercise = exerciseMap.get(step.exerciseId);
    if (!exercise) return { ...step, order };

    const stepResources = extractStepRequiredResources(step, exercise);
    const conflictingOnStep = stepResources.filter((res) => blockedResources.has(res));
    if (conflictingOnStep.length === 0) {
      return { ...step, order };
    }

    if (preserveLockedSteps && step.locked) {
      remainingShortageCount += 1;
      changes.push({
        stepId: step.stepId,
        order,
        beforeExerciseId: exercise.id,
        afterExerciseId: exercise.id,
        beforeExerciseNameKo: exercise.nameKo,
        afterExerciseNameKo: exercise.nameKo,
        beforeResourceLabelKo: formatResourceListLabel(stepResources),
        afterResourceLabelKo: `${formatResourceListLabel(stepResources)} (잠금 유지)`,
        beforeSprings: step.customSpringOverride ?? exercise.springs,
        afterSprings: step.customSpringOverride ?? exercise.springs,
        cueSyncNoteKo: '잠금된 동작이라 자동 변경하지 않았어요. 필요하면 잠금을 풀고 다시 눌러주세요.',
        changeKind: 'kept-locked',
      });
      return { ...step, order };
    }

    const primaryConflict = conflictingOnStep[0];
    const chosenProp = chooseBestAvailableProp(
      primaryConflict,
      availablePropSet,
      preferredSubstituteProp,
    );

    const replacement = pickCompatibleCatalogReplacement({
      currentExercise: exercise,
      candidates: exercises.filter((ex) => ex.apparatus === exercise.apparatus),
      blockedResources,
      usedExerciseIds: usedIds,
      targetApparatus: exercise.apparatus,
      preferredProp: chosenProp,
    });

    if (replacement) {
      usedIds.add(replacement.id);
      const nextStep: SequenceStep = {
        ...step,
        order,
        exerciseId: replacement.id,
        propOverride: replacement.props.some((p) => p !== 'none')
          ? replacement.props.find((p) => p !== 'none' && !blockedResources.has(p)) ?? 'none'
          : chosenProp !== 'none' && !isAccessoryResource(primaryConflict)
            ? chosenProp
            : 'none',
        boxOverride: replacement.box,
        customSpringOverride: replacement.springs,
        instructorNote: `${getStudioResourceLabelKo(primaryConflict)} 부족 → ${replacement.nameKo} 자동 대체 (${PROP_CUE_SYNC_HINTS[chosenProp]})`,
      };
      const afterResources = extractStepRequiredResources(nextStep, replacement);
      changes.push({
        stepId: step.stepId,
        order,
        beforeExerciseId: exercise.id,
        afterExerciseId: replacement.id,
        beforeExerciseNameKo: exercise.nameKo,
        afterExerciseNameKo: replacement.nameKo,
        beforeResourceLabelKo: formatResourceListLabel(stepResources),
        afterResourceLabelKo: formatResourceListLabel(afterResources),
        beforeSprings: step.customSpringOverride ?? exercise.springs,
        afterSprings: nextStep.customSpringOverride ?? replacement.springs,
        cueSyncNoteKo: PROP_CUE_SYNC_HINTS[chosenProp],
        changeKind: 'prop-swapped',
      });
      return nextStep;
    }

    // In-place safe prop/box substitution when keeping the exact same movement
    const nextBox =
      conflictingOnStep.includes('long-box') || conflictingOnStep.includes('short-box')
        ? ('none' as const)
        : step.boxOverride ?? exercise.box;
    const nextProp: PropType = isAccessoryResource(primaryConflict)
      ? step.propOverride ?? exercise.props[0] ?? 'none'
      : chosenProp;
    const cueSyncNoteKo = isAccessoryResource(primaryConflict)
      ? `${getStudioResourceLabelKo(primaryConflict)} 없이 캐리지 직접 지지로 전환 · 지지면이 넓어져 초보 회원도 안정적으로 따라올 수 있어요.`
      : `${getStudioResourceLabelKo(primaryConflict)} 대신 ${getStudioResourceLabelKo(nextProp)}로 전환 · ${PROP_CUE_SYNC_HINTS[nextProp]}`;

    const nextStep: SequenceStep = {
      ...step,
      order,
      propOverride: nextProp,
      boxOverride: nextBox,
      instructorNote: cueSyncNoteKo,
    };
    const afterResources = extractStepRequiredResources(nextStep, exercise);

    changes.push({
      stepId: step.stepId,
      order,
      beforeExerciseId: exercise.id,
      afterExerciseId: exercise.id,
      beforeExerciseNameKo: exercise.nameKo,
      afterExerciseNameKo: `${exercise.nameKo} (${getStudioResourceLabelKo(nextProp)})`,
      beforeResourceLabelKo: formatResourceListLabel(stepResources),
      afterResourceLabelKo: formatResourceListLabel(afterResources),
      beforeSprings: step.customSpringOverride ?? exercise.springs,
      afterSprings: step.customSpringOverride ?? exercise.springs,
      cueSyncNoteKo,
      changeKind: 'prop-swapped',
    });
    return nextStep;
  });

  const swappedCount = changes.filter((c) => c.changeKind === 'prop-swapped').length;
  const recommendedPropLabel = getStudioResourceLabelKo(
    chooseBestAvailableProp(
      conflictReport.conflictingResources[0].resourceId,
      availablePropSet,
      preferredSubstituteProp,
    ),
  );

  return {
    strategyId: 'swap-available-prop',
    titleKo: '남는 소도구로 자동 대체',
    buttonLabelKo: '남는 소도구로 자동 바꾸기',
    summaryKo: `부족한 교보재 동작 ${swappedCount}개만 여유 있는 ${recommendedPropLabel}·대체 동작으로 자동 전환하고 큐 메모까지 맞췄어요.`,
    recommended: conflictReport.apparatusConflict === null && swappedCount > 0,
    applicable: swappedCount > 0,
    adaptedSteps,
    changes,
    preservedSpinalPlanes: collectSpinalPlanes(adaptedSteps, exerciseMap),
    remainingShortageCount,
  };
}

/**
 * Strategy 2: Staggered First-Half / Second-Half Timeshare so two rooms can share
 * a limited pool (e.g. 6 magic circles for 12 total members across A/B rooms).
 */
function buildStaggerHalfClassStrategy(
  input: AutoAdaptSequenceInput,
  exerciseMap: ReadonlyMap<string, PilatesExercise>,
): AutoAdaptStrategyOption {
  const { steps, conflictReport } = input;
  const conflicts = conflictReport.conflictingResources;

  if (conflicts.length === 0) {
    return {
      strategyId: 'stagger-half-class',
      titleKo: '전·후반 교차 타임셰어',
      buttonLabelKo: '전·후반 교차 배치',
      summaryKo: '동시간대 교보재 충돌이 없어 교차 배치가 필요하지 않아요.',
      recommended: false,
      applicable: false,
      unapplicableReasonKo: '부족한 교보재가 없습니다.',
      adaptedSteps: steps.map((step, idx) => ({ ...step, order: idx + 1 })),
      changes: [],
      preservedSpinalPlanes: collectSpinalPlanes(steps, exerciseMap),
      remainingShortageCount: 0,
    };
  }

  // Timeshare works cleanly when total studio inventory can cover my class alone
  // AND there is at least one other room sharing the same resource.
  const canCoverSingleRoom = conflicts.every(
    (entry) =>
      entry.totalInventory >= conflictReport.myHeadcount && entry.otherRoomsUsed > 0,
  );

  if (!canCoverSingleRoom) {
    return {
      strategyId: 'stagger-half-class',
      titleKo: '전·후반 교차 타임셰어',
      buttonLabelKo: '전·후반 교차 배치',
      summaryKo: '센터 전체 보유 수량이 한 반 인원보다 적어 교차 사용만으로 해결하기 어려워요.',
      recommended: false,
      applicable: false,
      unapplicableReasonKo:
        '보유 총량이 내 수업 인원보다 적거나 단독 부족 상태입니다. 소도구 자동 대체를 이용해 주세요.',
      adaptedSteps: steps.map((step, idx) => ({ ...step, order: idx + 1 })),
      changes: [],
      preservedSpinalPlanes: collectSpinalPlanes(steps, exerciseMap),
      remainingShortageCount: conflicts.length,
    };
  }

  const blockedSet = new Set(conflicts.map((entry) => entry.resourceId));
  const otherUsesFirstHalf = conflicts.some((entry) =>
    entry.otherRoomBreakdown.some((b) => b.usageWindow === 'first-half'),
  );
  const myPropWindow: 'first-half' | 'second-half' = otherUsesFirstHalf
    ? 'second-half'
    : 'first-half';
  const otherRoomPropWindow: 'first-half' | 'second-half' =
    myPropWindow === 'first-half' ? 'second-half' : 'first-half';

  const warmupSteps: SequenceStep[] = [];
  const cooldownSteps: SequenceStep[] = [];
  const propMiddleSteps: SequenceStep[] = [];
  const nonPropMiddleSteps: SequenceStep[] = [];

  for (const step of steps) {
    const ex = exerciseMap.get(step.exerciseId);
    const reqs = extractStepRequiredResources(step, ex);
    const usesShared = reqs.some((r) => blockedSet.has(r));

    if (step.blockCategory === 'warmup') {
      warmupSteps.push(step);
    } else if (step.blockCategory === 'cooldown') {
      cooldownSteps.push(step);
    } else if (usesShared) {
      propMiddleSteps.push(step);
    } else {
      nonPropMiddleSteps.push(step);
    }
  }

  // Keep warmup at start & cooldown at end for spinal safety; cluster shared-prop steps
  // cleanly into first-half or second-half.
  const orderedRaw: SequenceStep[] =
    myPropWindow === 'first-half'
      ? [...warmupSteps, ...propMiddleSteps, ...nonPropMiddleSteps, ...cooldownSteps]
      : [...warmupSteps, ...nonPropMiddleSteps, ...propMiddleSteps, ...cooldownSteps];

  let propBlockMinutes = 0;
  let runningMinutes = 0;
  let handoverMinuteMark = 25;
  const sharedLabels = conflicts.map((entry) => entry.labelKo);
  const sharedNamesText = sharedLabels.join('·');

  const adaptedSteps = orderedRaw.map((step, idx) => {
    const order = idx + 1;
    const ex = exerciseMap.get(step.exerciseId);
    const reqs = extractStepRequiredResources(step, ex);
    const usesShared = reqs.some((r) => blockedSet.has(r));

    if (usesShared) {
      propBlockMinutes += step.durationMin;
    }
    runningMinutes += step.durationMin;

    const isLastSharedInFirstHalf =
      myPropWindow === 'first-half' &&
      usesShared &&
      idx === warmupSteps.length + propMiddleSteps.length - 1;
    const isFirstSharedInSecondHalf =
      myPropWindow === 'second-half' &&
      usesShared &&
      idx === warmupSteps.length + nonPropMiddleSteps.length;

    if (isLastSharedInFirstHalf) {
      handoverMinuteMark = Math.min(35, Math.max(15, runningMinutes));
    } else if (isFirstSharedInSecondHalf) {
      handoverMinuteMark = Math.min(35, Math.max(15, runningMinutes - step.durationMin));
    }

    const cleanedNote = (step.instructorNote ?? '')
      .replace(/\s*\[교차 타임셰어[^\]]*\]/g, '')
      .trim();
    const tag = isLastSharedInFirstHalf
      ? `[교차 타임셰어 · ${handoverMinuteMark}분 종료 후 ${sharedNamesText} 타 룸 전달]`
      : isFirstSharedInSecondHalf
        ? `[교차 타임셰어 · ${handoverMinuteMark}분부터 ${sharedNamesText} 수령 후 진행]`
        : '';

    return {
      ...step,
      order,
      instructorNote: tag ? (cleanedNote ? `${cleanedNote} ${tag}` : tag) : step.instructorNote,
    };
  });

  const originalIndexById = new Map(steps.map((s, idx) => [s.stepId, idx + 1]));
  const changes: StepAdaptationDiff[] = [];

  adaptedSteps.forEach((step) => {
    const prevOrder = originalIndexById.get(step.stepId) ?? step.order;
    const ex = exerciseMap.get(step.exerciseId);
    if (!ex) return;
    const reqs = extractStepRequiredResources(step, ex);
    const usesShared = reqs.some((r) => blockedSet.has(r));
    if (prevOrder !== step.order || usesShared) {
      changes.push({
        stepId: step.stepId,
        order: step.order,
        beforeExerciseId: ex.id,
        afterExerciseId: ex.id,
        beforeExerciseNameKo: `${prevOrder}번 · ${ex.nameKo}`,
        afterExerciseNameKo: `${step.order}번 · ${ex.nameKo}`,
        beforeResourceLabelKo: formatResourceListLabel(reqs),
        afterResourceLabelKo: usesShared
          ? `${formatResourceListLabel(reqs)} (${myPropWindow === 'first-half' ? '전반 집중' : '후반 집중'})`
          : formatResourceListLabel(reqs),
        beforeSprings: step.customSpringOverride ?? ex.springs,
        afterSprings: step.customSpringOverride ?? ex.springs,
        cueSyncNoteKo: usesShared
          ? myPropWindow === 'first-half'
            ? `전반 ${handoverMinuteMark}분 안에 소도구 구간을 마치고 바구니에 모아 전달해요.`
            : `전반 ${handoverMinuteMark}분은 기구·맨몸으로 진행 후 후반에 소도구를 받아 써요.`
          : '예열·본운동 순서를 부드럽게 재배치했어요.',
        changeKind: 'reordered-timeshare',
      });
    }
  });

  const myRoomName = conflictReport.myRoom?.roomNameKo ?? '내 수업 룸';
  const otherRoomNames = [
    ...new Set(
      conflicts.flatMap((entry) => entry.otherRoomBreakdown.map((b) => b.roomNameKo)),
    ),
  ].join('·');

  const coordinationSummaryKo =
    myPropWindow === 'first-half'
      ? `${myRoomName}(전반 0~${handoverMinuteMark}분 ${sharedNamesText} 집중) ↔ ${otherRoomNames || '타 룸'}(후반 ${handoverMinuteMark}~50분 사용)으로 겹침 없이 교차 배분해요.`
      : `${otherRoomNames || '타 룸'}(전반 0~${handoverMinuteMark}분 사용) ↔ ${myRoomName}(후반 ${handoverMinuteMark}~50분 ${sharedNamesText} 사용)으로 교차 배분해요.`;

  const copyableRoomNoticeKo = [
    `[교보재 교차 사용 안내 · ${conflictReport.slotLabelKo}]`,
    `• 공유 교보재: ${sharedNamesText}`,
    myPropWindow === 'first-half'
      ? `• ${myRoomName}: 전반 0~${handoverMinuteMark}분 사용 후 문 앞 바구니 정리`
      : `• ${otherRoomNames || '타 룸'}: 전반 0~${handoverMinuteMark}분 우선 사용`,
    myPropWindow === 'first-half'
      ? `• ${otherRoomNames || '타 룸'}: 후반 ${handoverMinuteMark}~50분 수령 사용`
      : `• ${myRoomName}: 후반 ${handoverMinuteMark}~50분 수령 사용`,
    '서로 수업 흐름 끊기지 않게 교대 시점만 맞춰요 :)',
  ].join('\n');

  return {
    strategyId: 'stagger-half-class',
    titleKo: '전·후반 교차 타임셰어',
    buttonLabelKo: '전·후반 교차 배치',
    summaryKo: coordinationSummaryKo,
    recommended: false,
    applicable: true,
    adaptedSteps,
    changes,
    timeShareSchedule: {
      sharedResourceLabelsKo: sharedLabels,
      myPropWindow,
      otherRoomPropWindow,
      handoverMinuteMark,
      myPropBlockMinutes: propBlockMinutes,
      coordinationSummaryKo,
      copyableRoomNoticeKo,
    },
    preservedSpinalPlanes: collectSpinalPlanes(adaptedSteps, exerciseMap),
    remainingShortageCount: 0,
  };
}

/**
 * Strategy 3: Emergency Room / Apparatus Auto-Conversion (e.g. broken reformer or
 * moved to Chair/Mat/Barrel room) keeping target muscles, spinal 4-plane balance,
 * block flow, and difficulty level intact.
 */
function buildAdaptRoomApparatusStrategy(
  input: AutoAdaptSequenceInput,
  exerciseMap: ReadonlyMap<string, PilatesExercise>,
): AutoAdaptStrategyOption {
  const { steps, exercises, conflictReport, preferredFallbackApparatus, preserveLockedSteps = true } =
    input;
  const blockedResources = new Set<StudioResourceItemId>(
    conflictReport.conflictingResources.map((item) => item.resourceId),
  );

  const currentDominant = getDominantSequenceApparatus(steps, exerciseMap);
  const targetApparatus: ApparatusType =
    preferredFallbackApparatus ??
    conflictReport.apparatusConflict?.fallbackApparatusCandidates[0] ??
    (currentDominant === 'reformer' ? 'chair' : currentDominant === 'chair' ? 'mat' : 'reformer');

  const targetPool = exercises.filter((ex) => ex.apparatus === targetApparatus);
  const matFallbackPool = exercises.filter((ex) => ex.apparatus === 'mat');
  const usedIds = new Set<string>();
  const changes: StepAdaptationDiff[] = [];
  let usedSecondaryMat = false;

  const adaptedSteps: SequenceStep[] = steps.map((step, idx) => {
    const order = idx + 1;
    if (isRestStep(step)) return { ...step, order };

    const exercise = exerciseMap.get(step.exerciseId);
    if (!exercise) return { ...step, order };

    if (preserveLockedSteps && step.locked && exercise.apparatus === targetApparatus) {
      usedIds.add(exercise.id);
      return { ...step, order };
    }

    // If already on target apparatus and no blocked prop, keep as-is
    const stepReqs = extractStepRequiredResources(step, exercise);
    if (
      exercise.apparatus === targetApparatus &&
      !stepReqs.some((res) => blockedResources.has(res))
    ) {
      usedIds.add(exercise.id);
      return { ...step, order };
    }

    let replacement = pickCompatibleCatalogReplacement({
      currentExercise: exercise,
      candidates: targetPool,
      blockedResources,
      usedExerciseIds: usedIds,
      targetApparatus,
    });

    // If target apparatus has no match for a reformer-specific block (like feet-in-straps),
    // cleanly pick the highest-scoring exercise on targetApparatus (relaxed block) or Mat fallback
    if (!replacement) {
      replacement =
        targetPool.find((ex) => !usedIds.has(ex.id) && ex.blockCategory === exercise.blockCategory) ??
        targetPool.find(
          (ex) =>
            !usedIds.has(ex.id) &&
            countOverlap(ex.spinalPlanes, exercise.spinalPlanes) > 0,
        ) ??
        pickCompatibleCatalogReplacement({
          currentExercise: exercise,
          candidates: matFallbackPool,
          blockedResources,
          usedExerciseIds: usedIds,
          targetApparatus: 'mat',
        }) ??
        targetPool[idx % Math.max(1, targetPool.length)] ??
        matFallbackPool[idx % Math.max(1, matFallbackPool.length)] ??
        exercise;
    }

    if (replacement.apparatus === 'mat' && targetApparatus !== 'mat') {
      usedSecondaryMat = true;
    }

    usedIds.add(replacement.id);
    const safeProps = replacement.props.filter((p) => p !== 'none' && !blockedResources.has(p));
    const nextStep: SequenceStep = {
      ...step,
      order,
      exerciseId: replacement.id,
      blockCategory: step.blockCategory,
      customSpringOverride: replacement.springs,
      propOverride: safeProps[0] ?? 'none',
      boxOverride: targetApparatus === 'reformer' ? replacement.box : 'none',
      footbarOverride: targetApparatus === 'reformer' ? replacement.footbar : 'none',
      headrestOverride: targetApparatus === 'reformer' ? replacement.headrest : 'flat',
      instructorNote: `${APPARATUS_LABELS[exercise.apparatus].ko} → ${APPARATUS_LABELS[replacement.apparatus].ko} 자동 전환 (목표 부위·척추 흐름 유지)`,
    };

    changes.push({
      stepId: step.stepId,
      order,
      beforeExerciseId: exercise.id,
      afterExerciseId: replacement.id,
      beforeExerciseNameKo: `${APPARATUS_LABELS[exercise.apparatus].short} · ${exercise.nameKo}`,
      afterExerciseNameKo: `${APPARATUS_LABELS[replacement.apparatus].short} · ${replacement.nameKo}`,
      beforeResourceLabelKo: APPARATUS_LABELS[exercise.apparatus].ko,
      afterResourceLabelKo: APPARATUS_LABELS[replacement.apparatus].ko,
      beforeSprings: step.customSpringOverride ?? exercise.springs,
      afterSprings: replacement.springs,
      cueSyncNoteKo: `${replacement.targetMuscles.slice(0, 2).join('·')} 중심 · ${replacement.springs}`,
      changeKind: 'apparatus-converted',
    });

    return nextStep;
  });

  const targetLabel = APPARATUS_LABELS[targetApparatus].ko;
  const convertedCount = changes.length;

  return {
    strategyId: 'adapt-room-apparatus',
    titleKo: `${targetLabel} 기구 자동 전환`,
    buttonLabelKo: '기구 변경 자동 전환',
    summaryKo: usedSecondaryMat
      ? `기존 수업의 목표 부위·척추 4평면·난이도를 유지하면서 ${targetLabel}(+매트 연계) 시퀀스 ${convertedCount}개 동작으로 즉시 바꿨어요.`
      : `기존 수업의 목표 부위·척추 4평면·난이도를 유지하면서 ${targetLabel} 시퀀스 ${convertedCount}개 동작으로 즉시 바꿨어요.`,
    recommended: conflictReport.apparatusConflict !== null,
    applicable: convertedCount > 0,
    unapplicableReasonKo:
      convertedCount === 0 ? `이미 ${targetLabel} 중심으로 구성된 시퀀스예요.` : undefined,
    adaptedSteps,
    targetApparatus: usedSecondaryMat ? 'mixed' : targetApparatus,
    changes,
    preservedSpinalPlanes: collectSpinalPlanes(adaptedSteps, exerciseMap),
    remainingShortageCount: 0,
  };
}

export function autoAdaptSequenceForResources(
  input: AutoAdaptSequenceInput,
): AutoAdaptPlanResult {
  const exerciseMap = new Map(input.exercises.map((exercise) => [exercise.id, exercise]));

  const swapStrategy = buildSwapAvailablePropStrategy(input, exerciseMap);
  const staggerStrategy = buildStaggerHalfClassStrategy(input, exerciseMap);
  const apparatusStrategy = buildAdaptRoomApparatusStrategy(input, exerciseMap);

  const strategies: AutoAdaptStrategyOption[] = [
    swapStrategy,
    staggerStrategy,
    apparatusStrategy,
  ];

  const recommended =
    strategies.find((strategy) => strategy.recommended && strategy.applicable) ??
    strategies.find((strategy) => strategy.applicable) ??
    null;

  return {
    strategies,
    recommendedStrategyId: recommended?.strategyId ?? null,
  };
}
