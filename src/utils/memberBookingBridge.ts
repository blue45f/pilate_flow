import type {
  ApparatusType,
  DifficultyLevel,
  PilatesExercise,
  PropType,
  SavedSequence,
  SequenceStep,
} from '../types/pilates';
import type { DatedSequencePlanAssignment } from '../types/datedSequencePlanning';
import type { InstructorScheduleData } from '../types/instructorSchedule';
import {
  addScheduleDays,
  expandInstructorSchedule,
  scheduleDateRange,
  scheduleWeekStart,
} from './instructorSchedule';
import { EQUIPMENT_OPTIONS, getEquipmentFamilies } from '../data/equipmentCatalog';
import { CANONICAL_BLOCKS, INITIAL_EXERCISES, PROP_LABELS } from '../data/pilatesCatalog';
import { GLOBAL_CRAWLED_REPERTOIRE_EXERCISES } from '../data/globalCrawledRepertoirePack';
import { isRestStep } from './sequenceEngine';
import {
  getApparatusPrimary3DThumb,
  resolveStudio3DMotionForExercise,
} from './studio3dMotionCatalog';

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

export function formatDifficultyBadgeKo(level: DifficultyLevel | null | undefined): string {
  switch (level) {
    case '1.0':
      return 'Lv 1.0 · 입문·기초';
    case '1.5':
      return 'Lv 1.5 · 초중급';
    case '2.0':
      return 'Lv 2.0 · 중상급';
    default:
      return '난이도 미지정';
  }
}

export function getDefaultApparatusSpringsHint(apparatus: ApparatusType | 'mixed'): string {
  switch (apparatus) {
    case 'chair':
      return '1R 1Y (페달)';
    case 'cadillac':
      return '1B (푸쉬스루)';
    case 'barrel':
      return '래더 고정';
    case 'mat':
      return '스프링 사용 없음';
    case 'reformer':
    case 'mixed':
    default:
      return '2R 1B';
  }
}

function inferLevelFromTitle(title: string | undefined): DifficultyLevel | null {
  const hay = (title ?? '').toLowerCase();
  if (!hay) return null;
  if (/2\.0|심화|상급|중상급|advanced/.test(hay)) return '2.0';
  if (/1\.5|초중급|중급|intermediate/.test(hay)) return '1.5';
  if (/1\.0|입문|기초|릴리즈|호흡|정렬|beginner|foundation/.test(hay)) return '1.0';
  return null;
}

function inferApparatusFromTitle(title: string | undefined): ApparatusType | null {
  const hay = (title ?? '').toLowerCase();
  if (!hay) return null;
  if (/체어|운다|chair|wunda/.test(hay)) return 'chair';
  if (/캐딜락|타워|푸쉬스루|푸시스루|롤다운\s*바|cadillac|tower/.test(hay)) return 'cadillac';
  if (/바렐|스파인\s*코렉터|아크|barrel|spine\s*corrector/.test(hay)) return 'barrel';
  if (/매트|소도구\s*매트|mat/.test(hay)) return 'mat';
  if (/리포머|reformer/.test(hay)) return 'reformer';
  return null;
}

export interface SequenceLikeForCardMeta {
  readonly title?: string;
  readonly apparatus?: ApparatusType | 'mixed';
  readonly level?: DifficultyLevel;
  readonly focusTags?: readonly string[];
  readonly steps?: readonly SequenceStep[];
}

export interface ClassCardVisualMeta {
  readonly apparatus: ApparatusType | 'mixed';
  readonly apparatusLabelKo: string;
  readonly studio3dThumbUrl: string;
  readonly studio3dTitleKo: string;
  readonly level: DifficultyLevel | null;
  readonly levelBadgeKo: string;
  readonly springs: string;
  readonly isSequenceLinked: boolean;
  readonly springSourceLabelKo: '연결 시퀀스' | '기구 기본 세팅';
  /** Privacy-safe member bridge fields (never exposes instructorNote or clinical data) */
  readonly focusTagsKo: readonly string[];
  readonly propBadgesKo: readonly string[];
  readonly flowPhaseSummaryKo: string;
  readonly memberPrepTipKo: string;
}

function mapPropIdToLabelKo(propId: string): string | null {
  if (!propId || propId === 'none') return null;
  if (Object.prototype.hasOwnProperty.call(PROP_LABELS, propId)) {
    const raw = PROP_LABELS[propId as PropType].ko;
    return raw.replace(/\s*·.*$/, '');
  }
  return propId;
}

function defaultFocusTagsForApparatus(
  apparatus: ApparatusType | 'mixed',
  title?: string,
): string[] {
  const hay = (title ?? '').toLowerCase();
  const tags: string[] = [];
  if (/호흡|정렬|교정/.test(hay)) tags.push('호흡·골반 정렬');
  if (/코어|복부/.test(hay)) tags.push('심부 코어');
  if (/하체|힙|둔근|런지/.test(hay)) tags.push('둔근·하지 밸런스');
  if (/상체|어깨|흉추|스트레치/.test(hay)) tags.push('흉추·견갑 가동성');
  if (/측굴|바렐|사이드/.test(hay)) tags.push('측면 사슬 신장');
  if (tags.length > 0) return tags.slice(0, 3);

  switch (apparatus) {
    case 'chair':
      return ['하지 밸런스', '코어 제어'];
    case 'cadillac':
      return ['척추 분절', '전신 협응'];
    case 'barrel':
      return ['측면 사슬', '흉추 신전'];
    case 'mat':
      return ['호흡·코어', '척추 정렬'];
    case 'reformer':
    case 'mixed':
    default:
      return ['전신 밸런스', '코어·하지 정렬'];
  }
}

export function resolveClassCardVisualMeta(params: {
  readonly sequence?: SequenceLikeForCardMeta;
  readonly exercises?: readonly PilatesExercise[];
  readonly locationEquipmentIds?: readonly string[];
  readonly locationPropIds?: readonly string[];
  readonly fallbackApparatus?: ApparatusType | 'mixed';
  readonly title?: string;
  readonly fallbackLevel?: DifficultyLevel | null;
}): ClassCardVisualMeta {
  const {
    sequence,
    exercises,
    locationEquipmentIds = [],
    locationPropIds = [],
    fallbackApparatus,
    title,
    fallbackLevel = null,
  } = params;

  const catalog =
    exercises && exercises.length > 0
      ? exercises
      : [...INITIAL_EXERCISES, ...GLOBAL_CRAWLED_REPERTOIRE_EXERCISES];
  const byId = new Map<string, PilatesExercise>();
  for (const ex of catalog) {
    byId.set(ex.id, ex);
  }
  for (const crawled of GLOBAL_CRAWLED_REPERTOIRE_EXERCISES) {
    if (!byId.has(crawled.id)) {
      byId.set(crawled.id, crawled);
    }
  }

  let firstExercise: PilatesExercise | undefined;
  let linkedSpring: string | undefined;
  const collectedMuscles: string[] = [];
  const collectedProps = new Set<string>();
  let warmupMin = 0;
  let mainMin = 0;
  let cooldownMin = 0;
  let moveStepCount = 0;

  if (sequence?.steps && sequence.steps.length > 0) {
    for (const step of sequence.steps) {
      if (!step || isRestStep(step)) continue;
      moveStepCount += 1;
      const ex = byId.get(step.exerciseId);
      if (!firstExercise && ex) {
        firstExercise = ex;
      }
      const candidateSpring = step.customSpringOverride?.trim() || ex?.springs?.trim();
      if (!linkedSpring && candidateSpring) {
        linkedSpring = candidateSpring;
      }
      if (ex) {
        for (const m of ex.targetMuscles.slice(0, 2)) {
          if (m && !collectedMuscles.includes(m)) collectedMuscles.push(m);
        }
        for (const p of ex.props) {
          const label = mapPropIdToLabelKo(p);
          if (label) collectedProps.add(label);
        }
      }
      if (step.blockCategory === 'warmup') warmupMin += step.durationMin;
      else if (step.blockCategory === 'cooldown') cooldownMin += step.durationMin;
      else mainMin += step.durationMin;
    }
  }

  for (const locProp of locationPropIds) {
    const label = mapPropIdToLabelKo(locProp);
    if (label && collectedProps.size < 3 && !sequence) {
      collectedProps.add(label);
    }
  }

  const locFamilies = getEquipmentFamilies([...locationEquipmentIds]);
  const titleApparatus = inferApparatusFromTitle(title ?? sequence?.title);

  let apparatus: ApparatusType | 'mixed';
  if (sequence?.apparatus && sequence.apparatus !== 'mixed') {
    apparatus = sequence.apparatus;
  } else if (firstExercise) {
    apparatus = firstExercise.apparatus;
  } else if (fallbackApparatus && fallbackApparatus !== 'mixed') {
    apparatus = fallbackApparatus;
  } else if (titleApparatus && (locFamilies.length === 0 || locFamilies.includes(titleApparatus))) {
    apparatus = titleApparatus;
  } else if (locFamilies.length === 1) {
    apparatus = locFamilies[0]!;
  } else if (locFamilies.length > 1) {
    apparatus = titleApparatus ?? 'mixed';
  } else {
    apparatus = titleApparatus ?? fallbackApparatus ?? 'reformer';
  }

  const motionSpec = firstExercise ? resolveStudio3DMotionForExercise(firstExercise) : null;
  const studio3dThumbUrl = motionSpec
    ? motionSpec.peakImg
    : getApparatusPrimary3DThumb(apparatus);
  const studio3dTitleKo = motionSpec
    ? motionSpec.titleKo
    : `${getApparatusSpotLabelKo(apparatus)} 스튜디오 3D 프리뷰`;

  const resolvedLevel: DifficultyLevel | null =
    sequence?.level ?? inferLevelFromTitle(title) ?? fallbackLevel;
  const isSequenceLinked = Boolean(sequence && moveStepCount > 0);
  const springs = linkedSpring || getDefaultApparatusSpringsHint(apparatus);

  // Build privacy-safe focus tags
  const rawSeqFocus = (sequence?.focusTags ?? [])
    .map((t) => t.trim())
    .filter((t) => Boolean(t) && !/시그니처|동선/.test(t));
  let focusTagsKo: string[] = [...rawSeqFocus, ...collectedMuscles].slice(0, 3);
  if (focusTagsKo.length === 0 && firstExercise) {
    const blockMeta = CANONICAL_BLOCKS.find((b) => b.category === firstExercise.blockCategory);
    if (blockMeta) focusTagsKo = [blockMeta.nameKo];
  }
  if (focusTagsKo.length === 0) {
    focusTagsKo = defaultFocusTagsForApparatus(apparatus, title);
  }

  const propBadgesKo =
    collectedProps.size > 0 ? [...collectedProps].slice(0, 3) : ['기구 중심 (소도구 없음)'];

  const flowPhaseSummaryKo = isSequenceLinked
    ? [
        warmupMin > 0 ? `예열 ${Math.round(warmupMin)}분` : '',
        mainMin > 0 ? `본운동 ${Math.round(mainMin)}분` : '',
        cooldownMin > 0 ? `마무리 ${Math.round(cooldownMin)}분` : '',
      ]
        .filter(Boolean)
        .join(' → ') || `연결 동작 ${moveStepCount}개 구성`
    : '예열 호흡 → 기구 본운동 → 마무리 이완';

  const propPrepNote =
    collectedProps.size > 0
      ? `소도구(${[...collectedProps].slice(0, 2).join('·')}) 스튜디오 비치됨`
      : '별도 개인 소도구 불필요';
  const memberPrepTipKo = `논슬립 토삭스 착용 권장 · ${propPrepNote}`;

  return {
    apparatus,
    apparatusLabelKo: getApparatusSpotLabelKo(apparatus),
    studio3dThumbUrl,
    studio3dTitleKo,
    level: resolvedLevel,
    levelBadgeKo: formatDifficultyBadgeKo(resolvedLevel),
    springs,
    isSequenceLinked,
    springSourceLabelKo: linkedSpring ? '연결 시퀀스' : '기구 기본 세팅',
    focusTagsKo,
    propBadgesKo,
    flowPhaseSummaryKo,
    memberPrepTipKo,
  };
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
  readonly level?: DifficultyLevel;
  readonly levelBadgeKo?: string;
  readonly representativeSprings?: string;
  readonly springSourceLabelKo?: '연결 시퀀스' | '기구 기본 세팅';
  readonly studio3dThumbUrl?: string;
  readonly studio3dTitleKo?: string;
  readonly isSequenceLinked?: boolean;
  readonly focusTagsKo?: readonly string[];
  readonly propBadgesKo?: readonly string[];
  readonly flowPhaseSummaryKo?: string;
  readonly memberPrepTipKo?: string;
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
  return getApparatusPrimary3DThumb(apparatus);
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
    focusTagsKo: readonly string[];
    propBadgesKo: readonly string[];
    flowPhaseSummaryKo: string;
    memberPrepTipKo: string;
    level: DifficultyLevel;
    springs: string;
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
      focusTagsKo: ['호흡·골반 정렬', '복횡근', '척추 분절'],
      propBadgesKo: ['폼롤러'],
      flowPhaseSummaryKo: '예열 8분 → 본운동 36분 → 마무리 6분',
      memberPrepTipKo: '논슬립 토삭스 착용 권장 · 소도구(폼롤러) 스튜디오 비치됨',
      level: '1.0',
      springs: '2R 1B',
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
      focusTagsKo: ['둔근·하지 밸런스', '심부 코어', '중둔근'],
      propBadgesKo: ['미니볼'],
      flowPhaseSummaryKo: '예열 6분 → 본운동 38분 → 마무리 6분',
      memberPrepTipKo: '논슬립 토삭스 착용 권장 · 소도구(미니볼) 스튜디오 비치됨',
      level: '1.5',
      springs: '1R 1Y (페달)',
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
      focusTagsKo: ['흉추·견갑 가동성', '전신 협응', '햄스트링 이완'],
      propBadgesKo: ['써클링'],
      flowPhaseSummaryKo: '예열 6분 → 본운동 36분 → 마무리 8분',
      memberPrepTipKo: '논슬립 토삭스 착용 권장 · 소도구(써클링) 스튜디오 비치됨',
      level: '1.5',
      springs: '1B (푸쉬스루)',
      baseEnrolled: 6,
      maxCapacity: 6,
      baseWaitlist: 1,
    },
  ];

  return templates.map((tpl) => {
    const id = `sample-slot-${selectedDate}-${tpl.suffix}`;
    const decision = decisions[id];
    const thumbUrl = getApparatusPrimary3DThumb(tpl.apparatus);
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
      level: tpl.level,
      levelBadgeKo: formatDifficultyBadgeKo(tpl.level),
      representativeSprings: tpl.springs,
      springSourceLabelKo: '기구 기본 세팅',
      studio3dThumbUrl: thumbUrl,
      studio3dTitleKo: `${getApparatusSpotLabelKo(tpl.apparatus)} 스튜디오 3D 프리뷰`,
      isSequenceLinked: false,
      focusTagsKo: tpl.focusTagsKo,
      propBadgesKo: tpl.propBadgesKo,
      flowPhaseSummaryKo: tpl.flowPhaseSummaryKo,
      memberPrepTipKo: tpl.memberPrepTipKo,
    };
  });
}

export function buildMemberSlotsForDate(params: {
  readonly selectedDate: string;
  readonly schedule: InstructorScheduleData;
  readonly savedSequences: readonly SavedSequence[];
  readonly decisions: PersistedMemberBookingState['slotDecisions'];
  readonly exercises?: readonly PilatesExercise[];
  readonly datedAssignments?: readonly DatedSequencePlanAssignment[];
}): { readonly slots: MemberBookableSlot[]; readonly weekCounts: Record<string, number> } {
  const {
    selectedDate,
    schedule,
    savedSequences,
    decisions,
    exercises,
    datedAssignments = [],
  } = params;
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
    const datedMatch = datedAssignments.find(
      (item) =>
        item.classId === row.classId &&
        item.originalDate === row.originalDate &&
        item.occurrenceSnapshot.date === row.date &&
        item.occurrenceSnapshot.startTime === row.startTime &&
        item.occurrenceSnapshot.endTime === row.endTime &&
        item.occurrenceSnapshot.locationId === row.locationId,
    );
    const linkedSeq = row.linkSavedSequenceId
      ? savedSequences.find((seq) => seq.id === row.linkSavedSequenceId)
      : undefined;
    const activeSequence = datedMatch?.sequenceSnapshot ?? linkedSeq;

    const eqLabels = (location?.equipmentIds ?? [])
      .map((id) => EQUIPMENT_OPTIONS.find((item) => item.id === id)?.labelKo ?? id)
      .slice(0, 3);
    const visualMeta = resolveClassCardVisualMeta({
      sequence: activeSequence,
      exercises,
      locationEquipmentIds: location?.equipmentIds,
      locationPropIds: location?.propIds,
      title: row.title,
      fallbackLevel: null,
    });
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
      apparatus: visualMeta.apparatus,
      equipmentLabels: eqLabels.length > 0 ? eqLabels : [visualMeta.apparatusLabelKo],
      occurrenceStatus: row.status,
      baseEnrolled: Math.min(5, deterministicEnrolled),
      maxCapacity: 6,
      baseWaitlist: 0,
      maxWaitlist: 3,
      freeCancelHoursBefore: 12,
      myState: decision?.state ?? 'NONE',
      mySpotId: decision?.spotId,
      myWaitlistOrder: decision?.waitlistOrder,
      level: visualMeta.level ?? undefined,
      levelBadgeKo: visualMeta.levelBadgeKo,
      representativeSprings: visualMeta.springs,
      springSourceLabelKo: visualMeta.springSourceLabelKo,
      studio3dThumbUrl: visualMeta.studio3dThumbUrl,
      studio3dTitleKo: visualMeta.studio3dTitleKo,
      isSequenceLinked: visualMeta.isSequenceLinked,
      focusTagsKo: visualMeta.focusTagsKo,
      propBadgesKo: visualMeta.propBadgesKo,
      flowPhaseSummaryKo: visualMeta.flowPhaseSummaryKo,
      memberPrepTipKo: visualMeta.memberPrepTipKo,
    };
  });

  return { slots, weekCounts };
}
