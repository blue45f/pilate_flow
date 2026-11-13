import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Ticket,
  WifiOff,
} from 'lucide-react';
import { PfBadge, type PfBadgeTone } from '../design-system';
import { usePilatesStore } from '../store/usePilatesStore';
import type { ApparatusType } from '../types/pilates';
import {
  addScheduleDays,
  formatScheduleTime,
  localScheduleDate,
  scheduleDateRange,
  scheduleWeekStart,
} from '../utils/instructorSchedule';
import {
  type MemberBookableSlot,
  type MemberBookingActionIntent,
  type MemberSlotBookingStatus,
  type PersistedMemberBookingState,
  type PersistedMemberSlotDecision,
  buildMemberSlotsForDate,
  computeStudioSpotStates,
  deriveMemberSlotStatus,
  findSpotMetaById,
  formatDifficultyBadgeKo,
  getApparatusSpotLabelKo,
  getApparatusStudio3dImage,
  getDefaultApparatusSpringsHint,
  isSlotPastFreeCancelDeadline,
  pickDefaultOpenSpotId,
  readPersistedMemberBookingState,
  resolveMemberActionIntent,
  writePersistedMemberBookingState,
} from '../utils/memberBookingBridge';
import { LightDismissDialog } from './LightDismissDialog';
import { SpringVisualPills } from './SpringVisualPills';
import { StudioInteractive3DViewport } from './StudioInteractive3DViewport';
import { VisualApparatusSpotGlyph } from './VisualFlowComponents';
import '../styles/member-booking.css';
import '../styles/atelier-luxury-v2.css';

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'] as const;
const FIRST_SCHEDULE_DATE = '1900-01-01';
const LAST_SCHEDULE_DATE = '2199-12-31';

function clampScheduleDate(date: string): string {
  if (date < FIRST_SCHEDULE_DATE) return FIRST_SCHEDULE_DATE;
  if (date > LAST_SCHEDULE_DATE) return LAST_SCHEDULE_DATE;
  return date;
}

const APPARATUS_FILTERS: ReadonlyArray<{ value: 'all' | ApparatusType; label: string }> = [
  { value: 'all', label: '전체 기구' },
  { value: 'reformer', label: '리포머' },
  { value: 'chair', label: '체어' },
  { value: 'cadillac', label: '캐딜락' },
  { value: 'barrel', label: '바렐' },
  { value: 'mat', label: '매트' },
];

type MemberFocusFilter = 'all' | 'core' | 'lower' | 'stretch' | 'props';

const FOCUS_PROP_FILTERS: ReadonlyArray<{ value: MemberFocusFilter; label: string }> = [
  { value: 'all', label: '전체 포커스' },
  { value: 'core', label: '코어·골반 정렬' },
  { value: 'lower', label: '둔근·하지 집중' },
  { value: 'stretch', label: '흉추·스트레치' },
  { value: 'props', label: '소도구 활용' },
];

function slotMatchesFocusFilter(slot: MemberBookableSlot, filter: MemberFocusFilter): boolean {
  if (filter === 'all') return true;
  const hay = [
    slot.title,
    ...(slot.focusTagsKo ?? []),
    ...(slot.propBadgesKo ?? []),
    ...slot.equipmentLabels,
  ]
    .join(' ')
    .toLowerCase();
  if (filter === 'props') {
    const hasDedicatedProp = (slot.propBadgesKo ?? []).some(
      (badge) => !badge.includes('소도구 없음'),
    );
    return hasDedicatedProp || /폼롤러|미니볼|써클링|세라밴드|요가블록|아크/.test(hay);
  }
  if (filter === 'core') return /코어|복횡근|골반|정렬|복부/.test(hay);
  if (filter === 'lower') return /둔근|하지|하체|중둔근|대퇴|힙|런지/.test(hay);
  if (filter === 'stretch') return /흉추|스트레치|신장|이완|가동성|견갑|협응/.test(hay);
  return true;
}

function slotMatchesFilters(
  slot: MemberBookableSlot,
  apparatus: 'all' | ApparatusType,
  focus: MemberFocusFilter,
  availableOnly: boolean,
): boolean {
  if (apparatus !== 'all' && slot.apparatus !== apparatus) return false;
  if (!slotMatchesFocusFilter(slot, focus)) return false;
  if (!availableOnly) return true;
  const status = deriveMemberSlotStatus(slot);
  return slot.myState === 'BOOKED' || status === 'AVAILABLE' || status === 'ALMOST_FULL';
}

type MemberDialogIntent = MemberBookingActionIntent | 'CHANGE_SPOT';

function formatDateBadge(dateIso: string): { weekday: string; monthDay: string } {
  const [y, m, d] = dateIso.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return {
    weekday: WEEKDAY_KO[dt.getDay()] ?? '',
    monthDay: `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`,
  };
}

function formatFreeCancelDeadlineKo(
  slot: Pick<MemberBookableSlot, 'date' | 'startTime' | 'freeCancelHoursBefore'>,
): string | null {
  const [y, m, d] = slot.date.split('-').map(Number);
  const [hh, mm] = slot.startTime.split(':').map(Number);
  if (!y || !m || !d || Number.isNaN(hh) || Number.isNaN(mm)) return null;
  const deadline = new Date(y, m - 1, d, hh, mm, 0, 0);
  if (!Number.isFinite(deadline.getTime())) return null;
  deadline.setTime(deadline.getTime() - slot.freeCancelHoursBefore * 3_600_000);
  const month = String(deadline.getMonth() + 1).padStart(2, '0');
  const day = String(deadline.getDate()).padStart(2, '0');
  const weekday = WEEKDAY_KO[deadline.getDay()] ?? '';
  const timeLabel = formatScheduleTime(
    `${String(deadline.getHours()).padStart(2, '0')}:${String(deadline.getMinutes()).padStart(2, '0')}`,
  );
  return `${month}/${day}(${weekday}) ${timeLabel}`;
}

function statusPillMeta(
  slot: MemberBookableSlot,
  status: MemberSlotBookingStatus,
  todayIso: string,
): { label: string; tone: PfBadgeTone } {
  if (slot.date < todayIso) {
    const spotPart = slot.myState === 'BOOKED' && slot.mySpotId ? ` · ${slot.mySpotId}번 자리` : '';
    return {
      label: slot.myState === 'BOOKED' ? `✓ 수강 완료${spotPart}` : '■ 종료된 수업',
      tone: 'neutral',
    };
  }
  if (slot.myState === 'BOOKED') {
    if (slot.occurrenceStatus === 'cancelled') {
      return { label: '✕ 폐강 · 횟수 복원 가능', tone: 'danger' };
    }
    if (slot.occurrenceStatus === 'moved') {
      return { label: '▲ 일정 변경 · 예약 정리 필요', tone: 'warning' };
    }
    if (slot.occurrenceStatus === 'closed') {
      return { label: '■ 마감 변경 · 예약 취소 가능', tone: 'warning' };
    }
    const spotPart = slot.mySpotId ? ` · ${slot.mySpotId}번 자리` : '';
    return { label: `✓ 내 예약 확정${spotPart}`, tone: 'sage' };
  }
  if (slot.myState === 'WAITLISTED') {
    if (slot.occurrenceStatus !== 'scheduled') {
      return { label: '✕ 수업 변경 · 대기 정리', tone: 'warning' };
    }
    return {
      label: `⏳ 내 대기 ${slot.myWaitlistOrder ?? 1}번`,
      tone: 'warning',
    };
  }
  if (slot.occurrenceStatus === 'cancelled') {
    return { label: '✕ 폐강 안내', tone: 'danger' };
  }
  if (slot.occurrenceStatus === 'moved') {
    return { label: '■ 일정 변경됨', tone: 'neutral' };
  }
  switch (status) {
    case 'AVAILABLE':
      return { label: '● 예약 가능', tone: 'sage' };
    case 'ALMOST_FULL':
      return { label: '▲ 마감 임박 · 잔여 1석', tone: 'warning' };
    case 'WAITLIST':
      return { label: '◆ 대기 신청 가능', tone: 'warning' };
    case 'CLOSED':
      return { label: '■ 정원 마감', tone: 'neutral' };
    case 'CANCELED':
      return { label: '✕ 폐강 안내', tone: 'danger' };
  }
}

function ctaButtonLabel(
  slot: MemberBookableSlot,
  intent: MemberBookingActionIntent | null,
  todayIso: string,
): string {
  if (slot.date < todayIso) return '종료됨';
  if (intent === 'CANCEL_BOOKING') return '예약 취소';
  if (intent === 'CANCEL_WAITLIST') return '대기 취소';
  if (slot.occurrenceStatus === 'cancelled') return '폐강됨';
  if (slot.occurrenceStatus === 'moved') return '일정 변경됨';
  if (intent === 'BOOK') return '예약하기';
  if (intent === 'WAITLIST') return '대기 신청';
  return '마감됨';
}

export type MemberPortalSection = 'schedule' | 'bookings' | 'wallet';

export interface MemberBookingViewProps {
  readonly onSwitchToInstructor?: () => void;
  readonly activeSection?: MemberPortalSection;
}

export const MemberBookingView: React.FC<MemberBookingViewProps> = ({
  onSwitchToInstructor,
  activeSection,
}) => {
  const schedule = usePilatesStore((s) => s.instructorSchedule);
  const savedSequences = usePilatesStore((s) => s.savedSequences);
  const exercises = usePilatesStore((s) => s.exercises);
  const datedSequencePlanning = usePilatesStore((s) => s.datedSequencePlanning);
  const todayIso = localScheduleDate();

  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [apparatusFilter, setApparatusFilter] = useState<'all' | ApparatusType>('all');
  const [focusFilter, setFocusFilter] = useState<MemberFocusFilter>('all');
  const [availableOnly, setAvailableOnly] = useState<boolean>(false);
  const [hasInteractedSchedule, setHasInteractedSchedule] = useState<boolean>(false);
  const [portalState, setPortalState] = useState<PersistedMemberBookingState>(() =>
    readPersistedMemberBookingState(todayIso),
  );
  const livePortalRef = useRef<PersistedMemberBookingState>(portalState);
  const confirmLockRef = useRef<boolean>(false);
  const nextDialogSeqRef = useRef<number>(0);
  const consumedDialogSeqRef = useRef<number>(0);

  const [pendingAction, setPendingAction] = useState<{
    dialogSeq: number;
    slot: MemberBookableSlot;
    intent: MemberDialogIntent;
  } | null>(null);
  const [selectedSpotId, setSelectedSpotId] = useState<string>('R2');
  const selectedSpotIdRef = useRef<string>('R2');
  const [lateCancelAgreed, setLateCancelAgreed] = useState<boolean>(false);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine !== false : true,
  );
  const [simulateOffline, setSimulateOffline] = useState(false);

  const dayButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const spotButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectSpot = (nextSpotId: string) => {
    selectedSpotIdRef.current = nextSpotId;
    setSelectedSpotId(nextSpotId);
  };

  useEffect(() => {
    livePortalRef.current = portalState;
  }, [portalState]);

  useEffect(() => {
    if (!activeSection) return;
    const sectionId =
      activeSection === 'wallet'
        ? 'member-wallet-section'
        : activeSection === 'bookings'
          ? 'member-bookings-section'
          : 'member-schedule-section';
    document.getElementById(sectionId)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, [activeSection]);

  useEffect(() => {
    const onOnline = () => setIsBrowserOnline(true);
    const onOffline = () => setIsBrowserOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const isOfflineReadOnly = !isBrowserOnline || simulateOffline;
  const isPassExpired = portalState.pass.expiresAtIso < selectedDate;

  const weekStart = useMemo(() => scheduleWeekStart(selectedDate), [selectedDate]);
  const weekDates = useMemo(
    () => scheduleDateRange(weekStart, clampScheduleDate(addScheduleDays(weekStart, 6))),
    [weekStart],
  );

  const { slots: daySlots, weekCounts } = useMemo(
    () =>
      buildMemberSlotsForDate({
        selectedDate,
        schedule,
        savedSequences,
        decisions: portalState.slotDecisions,
        exercises,
        datedAssignments: datedSequencePlanning?.assignments ?? [],
      }),
    [
      selectedDate,
      schedule,
      savedSequences,
      portalState.slotDecisions,
      exercises,
      datedSequencePlanning,
    ],
  );

  const apparatusSlotCounts = useMemo(() => {
    const counts: Record<'all' | ApparatusType, number> = {
      all: 0,
      reformer: 0,
      chair: 0,
      cadillac: 0,
      barrel: 0,
      mat: 0,
    };
    for (const slot of daySlots) {
      if (availableOnly) {
        const st = deriveMemberSlotStatus(slot);
        if (!(slot.myState === 'BOOKED' || st === 'AVAILABLE' || st === 'ALMOST_FULL')) {
          continue;
        }
      }
      counts.all += 1;
      if (slot.apparatus !== 'mixed') {
        counts[slot.apparatus] += 1;
      }
    }
    return counts;
  }, [daySlots, availableOnly]);

  const filteredSlots = useMemo(
    () =>
      daySlots.filter((slot) =>
        slotMatchesFilters(slot, apparatusFilter, focusFilter, availableOnly),
      ),
    [daySlots, apparatusFilter, focusFilter, availableOnly],
  );

  const nextMatchingClassDate = useMemo(() => {
    if (filteredSlots.length > 0) return null;
    const nextDate = addScheduleDays(selectedDate, 1);
    const firstDate = nextDate < todayIso ? todayIso : nextDate;
    // This is a bounded discovery shortcut, not a change to booking eligibility.
    // Only search when the current result list is empty.
    for (let offset = 0; offset < 28; offset += 1) {
      const date = addScheduleDays(firstDate, offset);
      if (date > LAST_SCHEDULE_DATE) break;
      const { slots } = buildMemberSlotsForDate({
        selectedDate: date,
        schedule,
        savedSequences,
        decisions: portalState.slotDecisions,
        exercises,
        datedAssignments: datedSequencePlanning?.assignments ?? [],
      });
      if (
        slots.some(
          (slot) =>
            slot.occurrenceStatus === 'scheduled' &&
            slotMatchesFilters(slot, apparatusFilter, focusFilter, availableOnly),
        )
      ) {
        return date;
      }
    }
    return null;
  }, [
    filteredSlots.length,
    selectedDate,
    todayIso,
    schedule,
    savedSequences,
    portalState.slotDecisions,
    exercises,
    datedSequencePlanning,
    apparatusFilter,
    focusFilter,
    availableOnly,
  ]);

  const myActiveBookingEntries = useMemo(
    () =>
      Object.entries(portalState.slotDecisions).sort(([, a], [, b]) => {
        const dateCmp = (a.slotDate ?? '').localeCompare(b.slotDate ?? '');
        if (dateCmp !== 0) return dateCmp;
        return (a.slotTime ?? '').localeCompare(b.slotTime ?? '');
      }),
    [portalState.slotDecisions],
  );

  const passRatio = Math.min(
    1,
    Math.max(0, portalState.pass.remainingCount / Math.max(1, portalState.pass.totalCount)),
  );
  const ringCircumference = 2 * Math.PI * 36;
  const ringOffset = ringCircumference * (1 - passRatio);

  const activeStepIndex: 1 | 2 | 3 = pendingAction
    ? 3
    : hasInteractedSchedule
      ? 2
      : 1;

  const updatePortalState = (next: PersistedMemberBookingState) => {
    livePortalRef.current = next;
    setPortalState(next);
    writePersistedMemberBookingState(next);
  };

  const closePendingDialog = () => {
    if (confirmLockRef.current) return;
    setPendingAction(null);
    setLateCancelAgreed(false);
  };

  const resolveSlotFromDecision = (
    slotId: string,
    decision: PersistedMemberSlotDecision,
    decisionsMap: PersistedMemberBookingState['slotDecisions'],
  ): MemberBookableSlot => {
    const targetDate = decision.slotDate ?? selectedDate;
    const matched = buildMemberSlotsForDate({
      selectedDate: targetDate,
      schedule,
      savedSequences,
      decisions: decisionsMap,
      exercises,
      datedAssignments: datedSequencePlanning?.assignments ?? [],
    }).slots.find((item) => item.id === slotId);
    if (matched) return matched;

    return {
      id: slotId,
      classId: slotId,
      date: targetDate,
      startTime: decision.slotTime ?? '10:00',
      endTime: decision.slotTime ?? '10:50',
      title: decision.slotTitle ?? '예약한 수업',
      locationAlias: '스튜디오 룸',
      apparatus: 'reformer',
      equipmentLabels: ['리포머'],
      occurrenceStatus: 'cancelled',
      baseEnrolled: 0,
      maxCapacity: 6,
      baseWaitlist: 0,
      maxWaitlist: 3,
      freeCancelHoursBefore: 12,
      myState: decision.state,
      mySpotId: decision.spotId,
      myWaitlistOrder: decision.waitlistOrder,
    };
  };

  const findSameTimeConflict = (
    targetSlot: MemberBookableSlot,
    decisionsMap: PersistedMemberBookingState['slotDecisions'],
  ): PersistedMemberSlotDecision | null => {
    for (const [otherId, dec] of Object.entries(decisionsMap)) {
      if (
        otherId !== targetSlot.id &&
        dec.state === 'BOOKED' &&
        dec.slotDate === targetSlot.date &&
        dec.slotTime === targetSlot.startTime
      ) {
        return dec;
      }
    }
    return null;
  };

  const handleSlotActionClick = (slot: MemberBookableSlot, preferredSpotId?: string) => {
    if (confirmLockRef.current) return;
    setHasInteractedSchedule(true);
    setErrorAlert(null);
    setFeedbackBanner(null);

    if (isOfflineReadOnly) {
      setErrorAlert(
        '오프라인 상태에서는 시간표와 수강권 현황만 확인할 수 있습니다. 네트워크 연결 후 예약·취소를 진행해 주세요.',
      );
      return;
    }

    const currentPortal = livePortalRef.current;
    const latestDecision = currentPortal.slotDecisions[slot.id];
    const latestSlot: MemberBookableSlot = {
      ...slot,
      myState: latestDecision?.state ?? 'NONE',
      mySpotId: latestDecision?.spotId,
      myWaitlistOrder: latestDecision?.waitlistOrder,
    };
    const intent = resolveMemberActionIntent(latestSlot, todayIso);
    if (!intent) return;

    if (intent === 'BOOK' || intent === 'WAITLIST') {
      if (currentPortal.pass.expiresAtIso < latestSlot.date) {
        setErrorAlert(
          `선택한 수업일(${latestSlot.date})이 수강권 만료일(${currentPortal.pass.expiresAtIso}) 이후여서 신청할 수 없습니다. 센터에 기간 연장을 문의해 주세요.`,
        );
        return;
      }
      if (currentPortal.pass.remainingCount <= 0) {
        setErrorAlert(
          '남은 수강권 횟수가 0회여서 예약 및 대기 신청을 진행할 수 없습니다. 기존 예약을 정리하거나 수강권을 갱신한 뒤 이용해 주세요.',
        );
        return;
      }
      const sameTimeBooked = findSameTimeConflict(latestSlot, currentPortal.slotDecisions);
      if (sameTimeBooked) {
        setErrorAlert(
          `같은 시각(${latestSlot.date} ${formatScheduleTime(latestSlot.startTime)})에 이미 예약한 수업('${sameTimeBooked.slotTitle ?? '기존 수업'}')이 있습니다. 기존 예약을 먼저 취소한 뒤 신청해 주세요.`,
        );
        return;
      }
      if (intent === 'BOOK') {
        const spotStates = computeStudioSpotStates(latestSlot);
        const validPreferred =
          preferredSpotId &&
          spotStates.some((item) => item.spotId === preferredSpotId && !item.occupiedByOther)
            ? preferredSpotId
            : pickDefaultOpenSpotId(latestSlot);
        selectSpot(validPreferred);
      }
    }

    setLateCancelAgreed(false);
    setPendingAction({
      dialogSeq: ++nextDialogSeqRef.current,
      slot: latestSlot,
      intent,
    });
  };

  const handleOpenChangeSpot = (slot: MemberBookableSlot) => {
    if (confirmLockRef.current) return;
    setHasInteractedSchedule(true);
    setErrorAlert(null);
    setFeedbackBanner(null);

    if (isOfflineReadOnly) {
      setErrorAlert(
        '오프라인 상태에서는 기구 자리를 변경할 수 없습니다. 네트워크 연결 후 다시 시도해 주세요.',
      );
      return;
    }

    const currentPortal = livePortalRef.current;
    const latestDecision = currentPortal.slotDecisions[slot.id];
    if (!latestDecision || latestDecision.state !== 'BOOKED') return;

    const latestSlot: MemberBookableSlot = {
      ...slot,
      myState: 'BOOKED',
      mySpotId: latestDecision.spotId,
      myWaitlistOrder: latestDecision.waitlistOrder,
    };

    if (latestSlot.date < todayIso || latestSlot.occurrenceStatus !== 'scheduled') {
      setErrorAlert('이미 종료되었거나 일정이 변경된 수업은 자리를 변경할 수 없습니다.');
      return;
    }

    const alternativeOpenSpot = computeStudioSpotStates(latestSlot).find(
      (item) => !item.occupiedByOther && item.spotId !== latestDecision.spotId,
    );
    if (!alternativeOpenSpot) {
      setErrorAlert('현재 다른 빈 자리가 없어 기구 자리를 변경할 수 없습니다.');
      return;
    }

    selectSpot(alternativeOpenSpot.spotId);
    setLateCancelAgreed(false);
    setPendingAction({
      dialogSeq: ++nextDialogSeqRef.current,
      slot: latestSlot,
      intent: 'CHANGE_SPOT',
    });
  };

  const isPendingLateCancel = useMemo(() => {
    if (pendingAction?.intent !== 'CANCEL_BOOKING') return false;
    const decision = portalState.slotDecisions[pendingAction.slot.id];
    return isSlotPastFreeCancelDeadline(pendingAction.slot, decision?.updatedAt);
  }, [pendingAction, portalState.slotDecisions]);

  const confirmPendingAction = () => {
    if (
      !pendingAction ||
      confirmLockRef.current ||
      consumedDialogSeqRef.current === pendingAction.dialogSeq ||
      isOfflineReadOnly
    ) {
      return;
    }

    const currentPortal = livePortalRef.current;
    const activeSpotId = selectedSpotIdRef.current;
    const { slot, intent, dialogSeq } = pendingAction;
    const existingDecision = currentPortal.slotDecisions[slot.id];
    const lateCancel =
      intent === 'CANCEL_BOOKING' &&
      isSlotPastFreeCancelDeadline(slot, existingDecision?.updatedAt);

    if (lateCancel && !lateCancelAgreed) {
      return;
    }
    if (intent === 'CHANGE_SPOT' && existingDecision?.spotId === activeSpotId) {
      return;
    }

    confirmLockRef.current = true;
    consumedDialogSeqRef.current = dialogSeq;

    try {
      const nowIso = new Date().toISOString();
      const nextDecisions = { ...currentPortal.slotDecisions };
      let nextRemaining = currentPortal.pass.remainingCount;
      let message = '';

      const liveSlot =
        buildMemberSlotsForDate({
          selectedDate: slot.date,
          schedule,
          savedSequences,
          decisions: currentPortal.slotDecisions,
          exercises,
          datedAssignments: datedSequencePlanning?.assignments ?? [],
        }).slots.find((item) => item.id === slot.id) ?? slot;

      if (intent === 'CHANGE_SPOT') {
        if (!existingDecision || existingDecision.state !== 'BOOKED') {
          setPendingAction(null);
          return;
        }
        if (liveSlot.date < todayIso || liveSlot.occurrenceStatus !== 'scheduled') {
          setErrorAlert('수업 상태가 변경되어 기구 자리를 변경하지 못했습니다.');
          setPendingAction(null);
          return;
        }
        const chosenSpot = computeStudioSpotStates(liveSlot).find(
          (item) => item.spotId === activeSpotId,
        );
        if (!chosenSpot || chosenSpot.occupiedByOther || activeSpotId === existingDecision.spotId) {
          setErrorAlert('선택한 기구 자리가 방금 마감되었습니다. 다른 빈 자리를 선택해 주세요.');
          setPendingAction(null);
          return;
        }
        const prevSpotId = existingDecision.spotId ?? '기존';
        const spotMeta = findSpotMetaById(liveSlot.apparatus, activeSpotId);
        const apparatusNameKo = getApparatusSpotLabelKo(liveSlot.apparatus);
        const nextSpotDesc = spotMeta
          ? `${spotMeta.spotId}(${spotMeta.zoneKo})`
          : activeSpotId;
        nextDecisions[slot.id] = {
          ...existingDecision,
          spotId: activeSpotId,
        };
        message = `'${slot.title}' 기구 자리를 ${apparatusNameKo} ${prevSpotId}번 → ${nextSpotDesc}번으로 변경했습니다. (추가 차감 없음 · 남은 수강권 ${nextRemaining}회)`;
      } else {
        if (resolveMemberActionIntent(liveSlot, todayIso) !== intent) {
          setErrorAlert(
            '수업 상태가 변경되었습니다. 최신 예약 가능 상태를 확인한 뒤 다시 시도해 주세요.',
          );
          setPendingAction(null);
          return;
        }

        if (intent === 'BOOK') {
          if (existingDecision?.state === 'BOOKED') {
            setPendingAction(null);
            return;
          }
          if (liveSlot.date < todayIso || currentPortal.pass.expiresAtIso < liveSlot.date) {
            setErrorAlert('예약 가능한 수업일 또는 수강권 유효기간 범위를 벗어났습니다.');
            setPendingAction(null);
            return;
          }
          if (nextRemaining <= 0) {
            setErrorAlert('남은 수강권 횟수가 부족해 예약을 확정하지 못했습니다.');
            setPendingAction(null);
            return;
          }
          if (findSameTimeConflict(liveSlot, currentPortal.slotDecisions)) {
            setErrorAlert('같은 시각에 이미 예약된 다른 수업이 있어 중복 예약을 차단했습니다.');
            setPendingAction(null);
            return;
          }
          const chosenSpot = computeStudioSpotStates(liveSlot).find(
            (item) => item.spotId === activeSpotId,
          );
          if (!chosenSpot || chosenSpot.occupiedByOther) {
            setErrorAlert('선택한 기구 자리가 이미 마감되었습니다. 다른 자리를 선택해 주세요.');
            setPendingAction(null);
            return;
          }
          const spotMeta = findSpotMetaById(liveSlot.apparatus, activeSpotId);
          const apparatusNameKo = getApparatusSpotLabelKo(slot.apparatus);
          const spotDesc = spotMeta
            ? `${apparatusNameKo} ${spotMeta.spotId}(${spotMeta.zoneKo})`
            : `${apparatusNameKo} ${activeSpotId}`;
          nextRemaining -= 1;
          nextDecisions[slot.id] = {
            state: 'BOOKED',
            spotId: activeSpotId,
            slotTitle: slot.title,
            slotDate: slot.date,
            slotTime: slot.startTime,
            updatedAt: nowIso,
          };
          message = `'${slot.title}' (${formatScheduleTime(slot.startTime)} · ${spotDesc}) 예약이 확정되었습니다. 남은 수강권 ${nextRemaining}회`;
        } else if (intent === 'WAITLIST') {
          if (existingDecision?.state === 'WAITLISTED') {
            setPendingAction(null);
            return;
          }
          if (nextRemaining <= 0) {
            setErrorAlert('남은 수강권 횟수가 0회여서 대기 신청을 확정하지 못했습니다.');
            setPendingAction(null);
            return;
          }
          if (findSameTimeConflict(liveSlot, currentPortal.slotDecisions)) {
            setErrorAlert('같은 시각에 이미 예약된 다른 수업이 있어 대기 신청을 차단했습니다.');
            setPendingAction(null);
            return;
          }
          const waitlistOrder = slot.baseWaitlist + 1;
          nextDecisions[slot.id] = {
            state: 'WAITLISTED',
            slotTitle: slot.title,
            slotDate: slot.date,
            slotTime: slot.startTime,
            waitlistOrder,
            updatedAt: nowIso,
          };
          message = `'${slot.title}' 대기 ${waitlistOrder}번으로 접수했습니다. 빈자리가 나면 순번대로 안내됩니다.`;
        } else if (intent === 'CANCEL_BOOKING') {
          if (!existingDecision || existingDecision.state !== 'BOOKED') {
            setPendingAction(null);
            return;
          }
          delete nextDecisions[slot.id];
          if (lateCancel) {
            message = `'${slot.title}' 예약을 취소했습니다. 무료 취소 기한(${slot.freeCancelHoursBefore}시간 전) 경과로 수강권 횟수는 복원되지 않습니다 (남은 수강권 ${nextRemaining}회).`;
          } else {
            nextRemaining = Math.min(currentPortal.pass.totalCount, nextRemaining + 1);
            message = `'${slot.title}' 예약을 취소하고 수강권 1회를 복원했습니다. 남은 수강권 ${nextRemaining}회`;
          }
        } else if (intent === 'CANCEL_WAITLIST') {
          if (!existingDecision || existingDecision.state !== 'WAITLISTED') {
            setPendingAction(null);
            return;
          }
          delete nextDecisions[slot.id];
          message = `'${slot.title}' 대기 신청을 취소했습니다.`;
        }
      }

      const nextPendingReserved = Object.values(nextDecisions).filter(
        (item) => item?.state === 'BOOKED',
      ).length;

      updatePortalState({
        pass: {
          ...currentPortal.pass,
          remainingCount: nextRemaining,
          pendingReservedCount: nextPendingReserved,
        },
        slotDecisions: nextDecisions,
      });
      setPendingAction(null);
      setLateCancelAgreed(false);
      setErrorAlert(null);
      setFeedbackBanner(message);
    } finally {
      confirmLockRef.current = false;
    }
  };

  const handleWeekKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIdx = -1;
    if (event.key === 'ArrowRight') nextIdx = Math.min(weekDates.length - 1, index + 1);
    else if (event.key === 'ArrowLeft') nextIdx = Math.max(0, index - 1);
    else if (event.key === 'Home') nextIdx = 0;
    else if (event.key === 'End') nextIdx = weekDates.length - 1;

    if (nextIdx >= 0 && nextIdx !== index) {
      event.preventDefault();
      setHasInteractedSchedule(true);
      setSelectedDate(weekDates[nextIdx]);
      dayButtonRefs.current[nextIdx]?.focus();
    }
  };

  const pendingSpotStates = useMemo(
    () =>
      pendingAction?.intent === 'BOOK' || pendingAction?.intent === 'CHANGE_SPOT'
        ? computeStudioSpotStates(pendingAction.slot)
        : [],
    [pendingAction],
  );

  useEffect(() => {
    spotButtonRefs.current.length = pendingSpotStates.length;
  }, [pendingSpotStates.length]);

  const isNavigableSpotIndex = (idx: number): boolean => {
    const spot = pendingSpotStates[idx];
    if (!spot || spot.occupiedByOther) return false;
    if (
      pendingAction?.intent === 'CHANGE_SPOT' &&
      pendingAction.slot.mySpotId === spot.spotId
    ) {
      return false;
    }
    return true;
  };

  const handleSpotKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (pendingSpotStates.length === 0) return;
    const openIndices = pendingSpotStates
      .map((_, idx) => (isNavigableSpotIndex(idx) ? idx : -1))
      .filter((idx) => idx >= 0);
    if (openIndices.length === 0) return;

    const activeSelectedIdx = pendingSpotStates.findIndex(
      (spot) => spot.spotId === selectedSpotIdRef.current,
    );
    const originIdx = openIndices.includes(index)
      ? index
      : activeSelectedIdx >= 0 && openIndices.includes(activeSelectedIdx)
        ? activeSelectedIdx
        : openIndices[0]!;
    const currentOpenPos = openIndices.indexOf(originIdx);
    const cols = typeof window !== 'undefined' && window.innerWidth <= 639 ? 2 : 3;
    let targetSpotIdx: number;

    if (event.key === 'Home') {
      targetSpotIdx = openIndices[0] ?? -1;
    } else if (event.key === 'End') {
      targetSpotIdx = openIndices[openIndices.length - 1] ?? -1;
    } else if (event.key === 'ArrowRight') {
      const nextPos =
        currentOpenPos >= 0 ? (currentOpenPos + 1) % openIndices.length : 0;
      targetSpotIdx = openIndices[nextPos] ?? -1;
    } else if (event.key === 'ArrowLeft') {
      const prevPos =
        currentOpenPos >= 0
          ? (currentOpenPos - 1 + openIndices.length) % openIndices.length
          : 0;
      targetSpotIdx = openIndices[prevPos] ?? -1;
    } else if (event.key === 'ArrowDown') {
      const directBelow = originIdx + cols;
      if (directBelow < pendingSpotStates.length && isNavigableSpotIndex(directBelow)) {
        targetSpotIdx = directBelow;
      } else {
        targetSpotIdx = openIndices.find((idx) => idx > originIdx) ?? openIndices[0] ?? -1;
      }
    } else if (event.key === 'ArrowUp') {
      const directAbove = originIdx - cols;
      if (directAbove >= 0 && isNavigableSpotIndex(directAbove)) {
        targetSpotIdx = directAbove;
      } else {
        const rev = [...openIndices].reverse();
        targetSpotIdx = rev.find((idx) => idx < originIdx) ?? rev[0] ?? -1;
      }
    } else {
      return;
    }

    if (targetSpotIdx >= 0 && targetSpotIdx !== originIdx) {
      event.preventDefault();
      const targetSpot = pendingSpotStates[targetSpotIdx];
      if (targetSpot) {
        selectSpot(targetSpot.spotId);
        spotButtonRefs.current[targetSpotIdx]?.focus();
      }
    } else if (targetSpotIdx >= 0) {
      event.preventDefault();
      spotButtonRefs.current[targetSpotIdx]?.focus();
    }
  };

  const pendingApparatusLabelKo = pendingAction
    ? getApparatusSpotLabelKo(pendingAction.slot.apparatus)
    : '기구';

  const selectedSpotMeta = useMemo(
    () =>
      pendingAction
        ? findSpotMetaById(pendingAction.slot.apparatus, selectedSpotId)
        : undefined,
    [pendingAction, selectedSpotId],
  );

  const pendingFreeCancelDeadlineKo = useMemo(
    () => (pendingAction ? formatFreeCancelDeadlineKo(pendingAction.slot) : null),
    [pendingAction],
  );

  const pendingRepresentativeExercise = useMemo(() => {
    if (!pendingAction) return null;
    const targetApparatus =
      pendingAction.slot.apparatus === 'mixed' ? 'reformer' : pendingAction.slot.apparatus;
    return (
      exercises.find((ex) => ex.apparatus === targetApparatus) ??
      exercises[0] ??
      null
    );
  }, [pendingAction, exercises]);

  const resetScheduleFilters = () => {
    setHasInteractedSchedule(true);
    setApparatusFilter('all');
    setFocusFilter('all');
    setAvailableOnly(false);
  };

  return (
    <section
      className="pf-member-view"
      aria-labelledby="workspace-main-heading"
      data-testid="member-booking-view"
    >
      <header className="pf-member-header">
        <div>
          <span className="eyebrow">MEMBER BOOKING &amp; SPOT WALLET</span>
          <h1 id="workspace-main-heading" tabIndex={-1}>
            회원 수업 예약·수강권
          </h1>
          <p>남은 횟수를 확인하고, 원하는 날짜와 수업별 빈 자리를 골라 바로 예약하세요.</p>
          <p className="pf-member-demo-notice" data-testid="member-booking-storage-notice">
            <strong>예약 체험</strong>
            <span>수강권과 잔여 좌석은 예시이며, 예약·취소는 이 기기에만 기록됩니다.</span>
          </p>
        </div>
        {onSwitchToInstructor && (
          <button
            type="button"
            className="pf-member-chip"
            onClick={onSwitchToInstructor}
          >
            강사 작업실로 돌아가기
          </button>
        )}
      </header>

      <div
        className="pf-member-quick-status-strip"
        data-testid="member-quick-status-strip"
        role="region"
        aria-label="회원 예약 빠른 현황"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '8px 14px',
          marginBottom: '12px',
          padding: '10px 14px',
          borderRadius: '14px',
          background: '#e6efe9',
          border: '1px solid #bfd3c6',
          color: '#1f4d3f',
          fontSize: '0.88rem',
        }}
      >
        <strong>남은 수강권 {portalState.pass.remainingCount}회</strong>
        <span>예약 확정 {portalState.pass.pendingReservedCount}건</span>
        <span>선택 날짜 {selectedDate}</span>
      </div>

      <ol className="pf-member-steps" aria-label="회원 예약 3단계 안내" data-testid="member-step-guide">
        <li
          className={activeStepIndex === 1 ? 'is-active' : activeStepIndex > 1 ? 'is-done' : ''}
          aria-current={activeStepIndex === 1 ? 'step' : undefined}
        >
          1. 내 수강권·남은 횟수 확인
        </li>
        <li
          className={activeStepIndex === 2 ? 'is-active' : activeStepIndex > 2 ? 'is-done' : ''}
          aria-current={activeStepIndex === 2 ? 'step' : undefined}
        >
          2. 날짜·빈 자리 수업 선택
        </li>
        <li
          className={activeStepIndex === 3 ? 'is-active' : ''}
          aria-current={activeStepIndex === 3 ? 'step' : undefined}
        >
          3. 기구 자리·취소 기준 확인 후 확정
        </li>
      </ol>

      {isOfflineReadOnly && (
        <div
          className="status error"
          role="alert"
          data-testid="member-offline-banner"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <WifiOff size={18} aria-hidden="true" />
          <span>
            현재 오프라인 읽기 전용 상태입니다. 시간표·잔여 횟수 조회만 가능하며 예약·취소는 연결 복구 후 진행할 수 있습니다.
          </span>
        </div>
      )}

      <section
        id="member-wallet-section"
        className="pf-member-wallet-hero"
        aria-label="내 수강권 현황"
      >
        <div>
          <span className="eyebrow">
            <Ticket size={14} aria-hidden="true" style={{ verticalAlign: 'middle' }} /> 내 수강권 지갑 · ATELIER PASS
          </span>
          <h2>{portalState.pass.passTitle}</h2>
          <div className="pf-member-wallet-metrics" data-testid="member-pass-metrics">
            <span>
              <strong>잔여/총 횟수:</strong> {portalState.pass.remainingCount} /{' '}
              {portalState.pass.totalCount}회
            </span>
            <span>
              <strong>예약 확정:</strong> {portalState.pass.pendingReservedCount}건
            </span>
            <span>
              <strong>유효기간:</strong> {portalState.pass.expiresAtIso}까지
            </span>
            <span>
              <strong>수업 별칭:</strong> {portalState.pass.participantAlias}
            </span>
          </div>
          {isPassExpired && (
            <p
              style={{
                margin: '8px 0 0',
                fontSize: '0.82rem',
                color: '#fde68a',
                fontWeight: 600,
              }}
            >
              선택한 날짜({selectedDate})는 수강권 유효기간 이후입니다. 만료일 이전 날짜를 선택해 주세요.
            </p>
          )}
        </div>

        <div className="pf-member-wallet-ring" aria-hidden="true">
          <svg width="92" height="92" viewBox="0 0 88 88">
            <circle
              cx="44"
              cy="44"
              r="36"
              fill="none"
              stroke="rgba(255, 253, 248, 0.2)"
              strokeWidth="7"
            />
            <circle
              cx="44"
              cy="44"
              r="36"
              fill="none"
              stroke="#ebd3a4"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringOffset}
              transform="rotate(-90 44 44)"
            />
          </svg>
          <div className="pf-member-wallet-ring__label">
            <strong>{portalState.pass.remainingCount}회</strong>
            <small>남음</small>
          </div>
        </div>
      </section>

      {myActiveBookingEntries.length > 0 ? (
        <section
          id="member-bookings-section"
          className="pf-member-my-bookings"
          aria-label="내 예약 및 대기 현황"
          data-testid="member-my-bookings-strip"
        >
          <strong style={{ fontSize: '0.92rem', color: '#183d33' }}>
            <CheckCircle2
              size={15}
              aria-hidden="true"
              style={{ verticalAlign: 'middle', marginRight: '5px' }}
            />
            내가 신청한 수업 ({myActiveBookingEntries.length}건)
          </strong>
          {myActiveBookingEntries.map(([slotId, info]) => {
            const resolvedSlot = resolveSlotFromDecision(
              slotId,
              info,
              portalState.slotDecisions,
            );
            const titleText = info.slotTitle ?? resolvedSlot.title;
            const spotMeta =
              info.state === 'BOOKED' && info.spotId
                ? findSpotMetaById(resolvedSlot.apparatus, info.spotId)
                : undefined;
            const isUpcomingActionable = resolvedSlot.date >= todayIso;
            const canChangeBookedSpot =
              isUpcomingActionable &&
              info.state === 'BOOKED' &&
              resolvedSlot.occurrenceStatus === 'scheduled' &&
              computeStudioSpotStates(resolvedSlot).some(
                (item) => !item.occupiedByOther && item.spotId !== info.spotId,
              );

            const bookedThumb =
              resolvedSlot.studio3dThumbUrl ??
              getApparatusStudio3dImage(resolvedSlot.apparatus);
            const bookedSprings =
              resolvedSlot.representativeSprings ??
              getDefaultApparatusSpringsHint(resolvedSlot.apparatus);
            const bookedLevelBadge =
              resolvedSlot.levelBadgeKo ??
              formatDifficultyBadgeKo(resolvedSlot.level ?? null);

            return (
              <div key={slotId} className="pf-member-my-bookings__item">
                <div className="pf-member-my-booking-lead">
                  <img
                    src={bookedThumb}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    className="pf-member-my-booking-thumb"
                  />
                  <div>
                    <strong>{titleText}</strong>
                    <span style={{ marginLeft: '8px', fontSize: '0.84rem', color: '#4c5d54' }}>
                      {info.slotDate ? `${info.slotDate} ` : ''}
                      {info.slotTime ? formatScheduleTime(info.slotTime) : ''}
                      {info.state === 'BOOKED' && info.spotId
                        ? ` · ${info.spotId}번 자리${spotMeta ? `(${spotMeta.zoneKo})` : ''}`
                        : ''}
                      {info.state === 'WAITLISTED' ? ` · 대기 ${info.waitlistOrder ?? 1}번` : ''}
                    </span>
                    <div className="pf-class-badges-strip pf-class-badges-strip--compact">
                      <PfBadge tone="sage">{bookedLevelBadge}</PfBadge>
                      <SpringVisualPills springs={bookedSprings} />
                      {resolvedSlot.focusTagsKo?.[0] && (
                        <span className="pf-member-focus-pill">
                          {resolvedSlot.focusTagsKo[0]}
                        </span>
                      )}
                      {resolvedSlot.propBadgesKo?.[0] &&
                        !resolvedSlot.propBadgesKo[0].includes('소도구 없음') && (
                          <span className="pf-member-prop-pill">
                            소도구 · {resolvedSlot.propBadgesKo[0]}
                          </span>
                        )}
                    </div>
                  </div>
                </div>
                <div className="pf-member-my-bookings__actions">
                  {info.slotDate && info.slotDate !== selectedDate && (
                    <button
                      type="button"
                      className="pf-member-chip"
                      onClick={() => {
                        setHasInteractedSchedule(true);
                        setSelectedDate(info.slotDate!);
                      }}
                    >
                      해당 날짜 보기
                    </button>
                  )}
                  {canChangeBookedSpot && (
                    <button
                      type="button"
                      className="pf-member-chip"
                      data-testid={`my-booking-change-spot-${slotId}`}
                      disabled={isOfflineReadOnly}
                      aria-label={`${titleText} 내 예약 자리 변경`}
                      onClick={() => handleOpenChangeSpot(resolvedSlot)}
                    >
                      <ArrowLeftRight size={14} aria-hidden="true" /> 자리 변경
                    </button>
                  )}
                  {isUpcomingActionable && (
                    <button
                      type="button"
                      className="pf-member-chip"
                      data-testid={`my-booking-cancel-${slotId}`}
                      disabled={isOfflineReadOnly}
                      aria-label={`${titleText} 내 예약에서 바로 취소`}
                      onClick={() => handleSlotActionClick(resolvedSlot)}
                    >
                      {info.state === 'WAITLISTED' ? '대기 취소' : '바로 취소'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      ) : activeSection === 'bookings' ? (
        <section
          id="member-bookings-section"
          className="pf-member-pass-card pf-member-empty-card"
          aria-label="내 예약 및 대기 현황"
          data-testid="member-my-bookings-empty"
        >
          <div>
            <strong style={{ display: 'block', marginBottom: '4px' }}>
              예정된 내 예약이 아직 없어요
            </strong>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#4c5d54' }}>
              아래 주간 시간표에서 원하는 기구와 빈 자리를 골라 바로 예약해 보세요.
            </p>
          </div>
          <button
            type="button"
            className="pf-member-chip"
            onClick={() => {
              document
                .getElementById('member-schedule-section')
                ?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
            }}
          >
            시간표에서 수업 고르기
          </button>
        </section>
      ) : null}

      {errorAlert && (
        <p className="status error" role="alert" data-testid="member-booking-error">
          {errorAlert}
        </p>
      )}
      {feedbackBanner && (
        <p className="status" role="status" data-testid="member-booking-feedback">
          {feedbackBanner}
        </p>
      )}

      <section id="member-schedule-section" aria-label="주간 수업 날짜 선택">
        <div className="pf-member-filter-row" style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarDays size={18} aria-hidden="true" />
            <strong>
              {weekDates[0]} ~ {weekDates[weekDates.length - 1]}
            </strong>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className="pf-member-chip"
              aria-label="이전 주 보기"
              disabled={weekDates[0] === FIRST_SCHEDULE_DATE}
              onClick={() => {
                setHasInteractedSchedule(true);
                setSelectedDate(clampScheduleDate(addScheduleDays(selectedDate, -7)));
              }}
            >
              <ChevronLeft size={16} aria-hidden="true" /> 이전 주
            </button>
            <button
              type="button"
              className="pf-member-chip"
              onClick={() => {
                setHasInteractedSchedule(true);
                setSelectedDate(todayIso);
              }}
            >
              오늘
            </button>
            <button
              type="button"
              className="pf-member-chip"
              aria-label="다음 주 보기"
              disabled={weekDates[weekDates.length - 1] === LAST_SCHEDULE_DATE}
              onClick={() => {
                setHasInteractedSchedule(true);
                setSelectedDate(clampScheduleDate(addScheduleDays(selectedDate, 7)));
              }}
            >
              다음 주 <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div
          className="pf-member-week-grid"
          role="group"
          aria-label="요일별 날짜 선택"
        >
          {weekDates.map((dateIso, idx) => {
            const { weekday, monthDay } = formatDateBadge(dateIso);
            const isSelected = dateIso === selectedDate;
            const count = weekCounts[dateIso] ?? 0;
            return (
              <button
                key={dateIso}
                ref={(el) => {
                  dayButtonRefs.current[idx] = el;
                }}
                type="button"
                className="pf-member-chip pf-member-day-btn"
                aria-pressed={isSelected}
                aria-current={dateIso === todayIso ? 'date' : undefined}
                onClick={() => {
                  setHasInteractedSchedule(true);
                  setSelectedDate(dateIso);
                }}
                onKeyDown={(e) => handleWeekKeyDown(e, idx)}
              >
                <span style={{ fontSize: '0.76rem', opacity: 0.85 }}>{weekday}</span>
                <strong style={{ fontSize: '0.88rem' }}>{monthDay}</strong>
                <small style={{ fontSize: '0.72rem', opacity: 0.85 }}>{count}수업</small>
              </button>
            );
          })}
        </div>
      </section>

      <div className="pf-member-filter-row">
        <div
          className="pf-member-apparatus-chips"
          role="group"
          aria-label="기구별 수업 필터"
        >
          {APPARATUS_FILTERS.map((filter) => {
            const count = apparatusSlotCounts[filter.value];
            return (
              <button
                key={filter.value}
                type="button"
                className="pf-member-chip"
                aria-pressed={apparatusFilter === filter.value}
                onClick={() => {
                  setHasInteractedSchedule(true);
                  setApparatusFilter(filter.value);
                }}
              >
                <span>{filter.label}</span>
                <span className="pf-member-chip__count" aria-hidden="true">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="pf-member-chip"
          data-testid="filter-available-only-chip"
          aria-pressed={availableOnly}
          onClick={() => {
            setHasInteractedSchedule(true);
            setAvailableOnly((v) => !v);
          }}
        >
          <Sparkles size={14} aria-hidden="true" style={{ verticalAlign: 'middle' }} /> 예약 가능만 보기
        </button>
      </div>

      <div
        className="pf-member-focus-filter-row"
        role="group"
        aria-label="수업 포커스·소도구 빠른 필터"
        data-testid="member-focus-filter-group"
      >
        {FOCUS_PROP_FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            className="pf-member-chip"
            data-testid={`member-focus-chip-${item.value}`}
            aria-pressed={focusFilter === item.value}
            onClick={() => {
              setHasInteractedSchedule(true);
              setFocusFilter(item.value);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="pf-member-slot-list" aria-label="선택한 날짜의 수업 목록">
        {filteredSlots.length === 0 ? (
          <div
            className="pf-member-pass-card pf-member-empty-card"
            role="status"
            data-testid="member-empty-slots-card"
          >
            <div>
              <strong style={{ display: 'block', marginBottom: '4px' }}>
                {daySlots.length === 0
                  ? '선택한 날짜에는 개설된 수업이 없어요'
                  : '선택한 기구·포커스·예약 가능 필터에 맞는 수업이 없어요'}
              </strong>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#4c5d54' }}>
                {nextMatchingClassDate
                  ? '현재 필터에 맞는 다음 수업일을 찾았어요. 조건을 유지한 채 이동할 수 있어요.'
                  : '다음 4주에 현재 조건에 맞는 수업이 없어요. 다른 주를 살펴보거나 필터를 바꿔 보세요.'}
              </p>
            </div>
            <div className="pf-member-empty-actions">
              {(apparatusFilter !== 'all' || focusFilter !== 'all' || availableOnly) && (
                <button
                  type="button"
                  className="pf-member-chip"
                  data-testid="reset-member-filters-btn"
                  onClick={resetScheduleFilters}
                >
                  <RotateCcw size={14} aria-hidden="true" /> 필터 초기화
                </button>
              )}
              {nextMatchingClassDate && (
                <button
                  type="button"
                  className="pf-member-chip"
                  data-testid="jump-next-class-day-btn"
                  onClick={() => {
                    setHasInteractedSchedule(true);
                    setSelectedDate(nextMatchingClassDate);
                  }}
                >
                  다음 수업일 보기 ({nextMatchingClassDate.slice(5).replace('-', '/')})
                </button>
              )}
            </div>
          </div>
        ) : (
          filteredSlots.map((slot) => {
            const status = deriveMemberSlotStatus(slot);
            const pill = statusPillMeta(slot, status, todayIso);
            const intent = resolveMemberActionIntent(slot, todayIso);
            const ctaLabel = ctaButtonLabel(slot, intent, todayIso);
            const effectiveEnrolled =
              slot.baseEnrolled + (slot.myState === 'BOOKED' ? 1 : 0);
            const effectiveWaitlist =
              slot.baseWaitlist + (slot.myState === 'WAITLISTED' ? 1 : 0);
            const isCancelAction =
              intent === 'CANCEL_BOOKING' || intent === 'CANCEL_WAITLIST';
            const studioArtSrc =
              slot.studio3dThumbUrl ?? getApparatusStudio3dImage(slot.apparatus);
            const slotLevelBadge =
              slot.levelBadgeKo ?? formatDifficultyBadgeKo(slot.level ?? null);
            const slotLevelTone: PfBadgeTone =
              slot.level === '2.0'
                ? 'warning'
                : slot.level === '1.5'
                  ? 'brand'
                  : slot.level === '1.0'
                    ? 'sage'
                    : 'neutral';
            const slotSprings =
              slot.representativeSprings ?? getDefaultApparatusSpringsHint(slot.apparatus);
            const slotSpringSource = slot.springSourceLabelKo ?? '기구 기본 세팅';
            const freeCancelDeadlineKo = formatFreeCancelDeadlineKo(slot);
            const slotSpotStates =
              intent === 'BOOK' || slot.myState === 'BOOKED'
                ? computeStudioSpotStates(slot)
                : [];
            const openSpots = slotSpotStates.filter((s) => !s.occupiedByOther);
            const canChangeThisSlotSpot =
              slot.myState === 'BOOKED' &&
              slot.date >= todayIso &&
              slot.occurrenceStatus === 'scheduled' &&
              openSpots.some((s) => s.spotId !== slot.mySpotId);

            return (
              <article
                key={slot.id}
                className={`pf-member-slot-card ${slot.myState === 'BOOKED' ? 'is-my-booked' : ''}`.trim()}
                data-testid={`member-slot-${slot.id}`}
              >
                <img
                  src={studioArtSrc}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className="pf-member-slot-art"
                  data-testid={`member-slot-3d-preview-${slot.id}`}
                />
                <div className="pf-member-slot-main">
                  <div className="pf-member-slot-time-row">
                    <strong>
                      {formatScheduleTime(slot.startTime)} – {formatScheduleTime(slot.endTime)}
                    </strong>
                    <span>· {slot.locationAlias}</span>
                    <PfBadge tone={pill.tone}>{pill.label}</PfBadge>
                  </div>
                  <h3>{slot.title}</h3>
                  <div
                    className="pf-class-badges-strip pf-member-slot-badges-row"
                    data-testid={`member-slot-badges-${slot.id}`}
                  >
                    <span className="pf-class-apparatus-pill">
                      {getApparatusSpotLabelKo(slot.apparatus)} 3D
                    </span>
                    <PfBadge
                      tone={slotLevelTone}
                      data-testid={`member-slot-level-badge-${slot.id}`}
                    >
                      {slotLevelBadge}
                    </PfBadge>
                    <span
                      className="pf-class-spring-wrap"
                      data-testid={`member-slot-spring-pills-${slot.id}`}
                    >
                      <small className="pf-class-spring-source">{slotSpringSource}</small>
                      <SpringVisualPills springs={slotSprings} />
                    </span>
                  </div>
                  {(slot.focusTagsKo?.length || slot.propBadgesKo?.length || slot.flowPhaseSummaryKo) && (
                    <div
                      className="pf-member-focus-bridge"
                      data-testid={`member-slot-focus-bridge-${slot.id}`}
                    >
                      {slot.focusTagsKo?.slice(0, 3).map((tag) => (
                        <span key={tag} className="pf-member-focus-pill">
                          포커스 · {tag}
                        </span>
                      ))}
                      {slot.propBadgesKo?.slice(0, 2).map((propLabel) => (
                        <span
                          key={propLabel}
                          className={`pf-member-prop-pill ${
                            propLabel.includes('소도구 없음') ? 'is-neutral' : ''
                          }`.trim()}
                        >
                          {propLabel.includes('소도구 없음') ? propLabel : `소도구 · ${propLabel}`}
                        </span>
                      ))}
                      {slot.flowPhaseSummaryKo && (
                        <span className="pf-member-flow-summary">
                          {slot.flowPhaseSummaryKo}
                        </span>
                      )}
                    </div>
                  )}
                  <p className="pf-member-slot-meta">
                    기구: {slot.equipmentLabels.join(' · ')} · 정원 {effectiveEnrolled}/
                    {slot.maxCapacity}명 (남은 자리 {Math.max(0, slot.maxCapacity - effectiveEnrolled)}석)
                    {effectiveWaitlist > 0 ? ` · 대기 ${effectiveWaitlist}명` : ''} ·{' '}
                    {freeCancelDeadlineKo
                      ? `${freeCancelDeadlineKo}까지 무료 취소 (${slot.freeCancelHoursBefore}시간 전)`
                      : `수업 ${slot.freeCancelHoursBefore}시간 전까지 무료 취소`}
                  </p>
                  {intent === 'BOOK' && openSpots.length > 0 && (
                    <div
                      className="pf-member-open-spots"
                      role="group"
                      aria-label={`${slot.title} 바로 선택 가능한 빈 자리`}
                      data-testid={`open-spots-preview-${slot.id}`}
                    >
                      <span className="pf-member-open-spots__label">빈 자리 바로 선택:</span>
                      {openSpots.slice(0, 4).map((spot) => (
                        <button
                          key={spot.spotId}
                          type="button"
                          className="pf-member-quick-spot-btn"
                          data-testid={`quick-spot-${slot.id}-${spot.spotId}`}
                          disabled={isOfflineReadOnly}
                          aria-label={`${slot.title} ${spot.spotId} ${spot.zoneKo} 자리로 바로 예약 확인`}
                          onClick={() => handleSlotActionClick(slot, spot.spotId)}
                        >
                          <MapPin size={12} aria-hidden="true" />
                          <span>
                            {spot.spotId} {spot.zoneKo}
                          </span>
                        </button>
                      ))}
                      {openSpots.length > 4 && (
                        <span className="pf-member-open-spots__label">
                          외 {openSpots.length - 4}석
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="pf-member-slot-actions">
                  <button
                    type="button"
                    className={`pf-member-slot-cta ${isCancelAction ? 'is-secondary' : ''}`.trim()}
                    disabled={!intent || isOfflineReadOnly}
                    aria-label={`${slot.title} ${ctaLabel}`}
                    onClick={() => handleSlotActionClick(slot)}
                  >
                    {ctaLabel}
                  </button>
                  {canChangeThisSlotSpot && (
                    <button
                      type="button"
                      className="pf-member-chip"
                      data-testid={`slot-change-spot-${slot.id}`}
                      disabled={isOfflineReadOnly}
                      aria-label={`${slot.title} 기구 자리 변경`}
                      onClick={() => handleOpenChangeSpot(slot)}
                    >
                      <ArrowLeftRight size={14} aria-hidden="true" /> 자리 변경
                    </button>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>

      <details className="pf-member-pass-card">
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
          개인정보 보호·안전 안내 및 연결 상태 점검
        </summary>
        <p style={{ marginTop: '10px', fontSize: '0.88rem', lineHeight: 1.55 }}>
          <ShieldCheck
            size={15}
            aria-hidden="true"
            style={{ verticalAlign: 'middle', marginRight: '4px' }}
          />
          실명·연락처·민감 건강정보 대신 수업 별칭({portalState.pass.participantAlias})으로만 이 기기에
          예약 상태를 기록합니다. 임신·수술 이력·급성 통증이 있는 경우 수업 시작 전 담당 강사에게 직접 알려 주세요.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
          <button
            type="button"
            className="pf-member-chip"
            aria-pressed={simulateOffline}
            onClick={() => setSimulateOffline((prev) => !prev)}
          >
            {simulateOffline ? '오프라인 미리보기 해제' : '오프라인 읽기 전용 미리보기'}
          </button>
        </div>
      </details>

      {pendingAction && (
        <LightDismissDialog
          open={Boolean(pendingAction)}
          onClose={closePendingDialog}
          onBeforeClose={() => !confirmLockRef.current}
          variant="sheet"
          title={
            pendingAction.intent === 'BOOK'
              ? `${pendingApparatusLabelKo} 자리 선택 및 예약 확인`
              : pendingAction.intent === 'CHANGE_SPOT'
                ? `${pendingApparatusLabelKo} 자리 변경 (추가 차감 없음)`
                : pendingAction.intent === 'WAITLIST'
                  ? '대기 신청 확인'
                  : pendingAction.intent === 'CANCEL_BOOKING'
                    ? isPendingLateCancel
                      ? '무료 취소 기한 경과 · 위약 차감 확인'
                      : '예약 취소 및 횟수 복원 확인'
                    : '대기 신청 취소 확인'
          }
          subtitle={`${pendingAction.slot.date} ${formatScheduleTime(
            pendingAction.slot.startTime,
          )} · ${pendingAction.slot.title}`}
          maxWidth="520px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {(pendingAction.intent === 'BOOK' || pendingAction.intent === 'CHANGE_SPOT') && (
              <>
                <div
                  className="pf-spot-dialog-3d-banner"
                  data-testid="member-spot-dialog-3d-banner"
                >
                  <img
                    src={
                      pendingAction.slot.studio3dThumbUrl ??
                      getApparatusStudio3dImage(pendingAction.slot.apparatus)
                    }
                    alt=""
                    aria-hidden="true"
                    className="pf-spot-dialog-3d-banner__img"
                  />
                  <div className="pf-spot-dialog-3d-banner__info">
                    <strong>{pendingApparatusLabelKo} 스튜디오 3D 기구·스프링 안내</strong>
                    <div className="pf-class-badges-strip">
                      <PfBadge
                        tone={
                          pendingAction.slot.level === '2.0'
                            ? 'warning'
                            : pendingAction.slot.level === '1.5'
                              ? 'brand'
                              : pendingAction.slot.level === '1.0'
                                ? 'sage'
                                : 'neutral'
                        }
                      >
                        {pendingAction.slot.levelBadgeKo ??
                          formatDifficultyBadgeKo(pendingAction.slot.level ?? null)}
                      </PfBadge>
                      <SpringVisualPills
                        springs={
                          pendingAction.slot.representativeSprings ??
                          getDefaultApparatusSpringsHint(pendingAction.slot.apparatus)
                        }
                      />
                    </div>
                    {(pendingAction.slot.focusTagsKo?.length ||
                      pendingAction.slot.propBadgesKo?.length ||
                      pendingAction.slot.memberPrepTipKo) && (
                      <div
                        className="pf-member-dialog-bridge"
                        data-testid="member-dialog-focus-props-bridge"
                      >
                        <div className="pf-member-focus-bridge">
                          {pendingAction.slot.focusTagsKo?.slice(0, 3).map((tag) => (
                            <span key={tag} className="pf-member-focus-pill">
                              포커스 · {tag}
                            </span>
                          ))}
                          {pendingAction.slot.propBadgesKo?.slice(0, 2).map((propLabel) => (
                            <span
                              key={propLabel}
                              className={`pf-member-prop-pill ${
                                propLabel.includes('소도구 없음') ? 'is-neutral' : ''
                              }`.trim()}
                            >
                              {propLabel.includes('소도구 없음')
                                ? propLabel
                                : `소도구 · ${propLabel}`}
                            </span>
                          ))}
                        </div>
                        {pendingAction.slot.flowPhaseSummaryKo && (
                          <small className="pf-member-dialog-bridge__flow">
                            수업 흐름: {pendingAction.slot.flowPhaseSummaryKo}
                          </small>
                        )}
                        {pendingAction.slot.memberPrepTipKo && (
                          <small className="pf-member-dialog-bridge__tip">
                            수업 준비 안내: {pendingAction.slot.memberPrepTipKo}
                          </small>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {pendingRepresentativeExercise && (
                  <details
                    className="pf-member-360-drawer"
                    data-testid="member-spot-360-preview-drawer"
                  >
                    <summary>
                      🌐 수업 대표 기구 동작 360° 3D로 미리보기 · 드래그 회전
                    </summary>
                    <div className="pf-member-360-drawer__body">
                      <StudioInteractive3DViewport
                        exercise={pendingRepresentativeExercise}
                        compact
                      />
                      <small className="pf-member-360-drawer__note">
                        기구 움직임 방향 이해를 돕는 참고용 3D 시뮬레이션이며 실제 수업 동작·스프링 강도는 현장 강사가 회원 컨디션에 맞춰 안내합니다.
                      </small>
                    </div>
                  </details>
                )}
                <div className="pf-studio-spot-map" data-testid="member-spot-map">
                  <div className="pf-studio-spot-map__zone">
                    <MapPin size={12} aria-hidden="true" style={{ verticalAlign: 'middle' }} /> 스튜디오
                    창가 &amp; 전면 거울 방향 · 원하는 {pendingApparatusLabelKo} 자리를 선택하세요
                  </div>
                  <div
                    className="pf-studio-spot-grid"
                    role="group"
                    aria-label={`${pendingApparatusLabelKo} 자리 선택`}
                  >
                    {pendingSpotStates.map((spot, spotIdx) => {
                      const isCurrentMySpot =
                        pendingAction.intent === 'CHANGE_SPOT' &&
                        pendingAction.slot.mySpotId === spot.spotId;
                      const isSpotDisabled = spot.occupiedByOther || isCurrentMySpot;
                      const isPicked = selectedSpotId === spot.spotId && !isSpotDisabled;
                      return (
                        <button
                          key={spot.spotId}
                          ref={(el) => {
                            spotButtonRefs.current[spotIdx] = el;
                          }}
                          type="button"
                          className={`pf-studio-spot-btn ${isCurrentMySpot ? 'is-current-my-spot' : ''}`.trim()}
                          data-testid={`spot-btn-${spot.spotId}`}
                          disabled={isSpotDisabled}
                          tabIndex={isSpotDisabled ? -1 : isPicked ? 0 : -1}
                          aria-pressed={isPicked}
                          aria-label={`${spot.spotId} ${spot.zoneKo} ${
                            spot.occupiedByOther
                              ? '마감'
                              : isCurrentMySpot
                                ? '현재 내 자리'
                                : isPicked
                                  ? '선택됨'
                                  : '선택 가능'
                          }`}
                          onClick={() => selectSpot(spot.spotId)}
                          onKeyDown={(e) => handleSpotKeyDown(e, spotIdx)}
                        >
                          <VisualApparatusSpotGlyph
                            apparatus={pendingAction.slot.apparatus === 'mixed' ? 'reformer' : pendingAction.slot.apparatus}
                            selected={isPicked}
                            occupied={spot.occupiedByOther}
                          />
                          <strong>{spot.spotId}</strong>
                          <small>{spot.zoneKo}</small>
                          <small style={{ fontWeight: 700 }}>
                            {spot.occupiedByOther
                              ? '예약 마감'
                              : isPicked
                                ? '✓ 선택됨'
                                : isCurrentMySpot
                                  ? '현재 내 자리'
                                  : '선택 가능'}
                          </small>
                        </button>
                      );
                    })}
                  </div>
                  <p className="pf-studio-spot-hint">
                    키보드 방향키(←·→·↑·↓)로도 빈 자리만 빠르게 이동할 수 있어요.
                  </p>
                </div>

                {pendingAction.intent === 'BOOK' ? (
                  <div className="pf-member-dialog-summary" data-testid="member-booking-summary">
                    선택 자리:{' '}
                    <strong>
                      {pendingApparatusLabelKo} {selectedSpotId}번
                      {selectedSpotMeta ? ` (${selectedSpotMeta.zoneKo})` : ''}
                    </strong>{' '}
                    · 예약 확정 시 수강권 <strong>1회</strong>가 차감됩니다 (예약 전{' '}
                    <strong>{portalState.pass.remainingCount}회</strong> → 확정 후{' '}
                    <strong>{portalState.pass.remainingCount - 1}회</strong>).
                    <br />
                    무료 취소 마감:{' '}
                    <strong>
                      {pendingFreeCancelDeadlineKo
                        ? `${pendingFreeCancelDeadlineKo} (수업 ${pendingAction.slot.freeCancelHoursBefore}시간 전)`
                        : `수업 시작 ${pendingAction.slot.freeCancelHoursBefore}시간 전`}
                    </strong>
                    까지 취소하면 차감된 횟수가 그대로 복원됩니다.
                  </div>
                ) : (
                  <div className="pf-member-dialog-summary" data-testid="member-change-spot-summary">
                    현재 내 자리(<strong>{pendingAction.slot.mySpotId ?? '-'}번</strong>)에서{' '}
                    <strong>
                      {pendingApparatusLabelKo} {selectedSpotId}번
                      {selectedSpotMeta ? ` (${selectedSpotMeta.zoneKo})` : ''}
                    </strong>
                    으로 변경합니다. 수강권 횟수는 추가 차감되지 않습니다 (남은 횟수{' '}
                    <strong>{portalState.pass.remainingCount}회</strong> 유지).
                  </div>
                )}
              </>
            )}
            {pendingAction.intent === 'WAITLIST' && (
              <div className="pf-member-dialog-summary">
                정원이 모두 차 대기 순번(<strong>{pendingAction.slot.baseWaitlist + 1}번</strong>)으로
                접수합니다. 대기 신청만으로는 횟수가 차감되지 않으며, 결원 발생 시 수업 시작 2시간 전까지 순번대로 안내해
                드립니다.
              </div>
            )}
            {pendingAction.intent === 'CANCEL_BOOKING' && !isPendingLateCancel && (
              <div className="pf-member-dialog-summary">
                무료 취소 마감(
                <strong>
                  {pendingFreeCancelDeadlineKo
                    ? `${pendingFreeCancelDeadlineKo} · 수업 ${pendingAction.slot.freeCancelHoursBefore}시간 전`
                    : `수업 ${pendingAction.slot.freeCancelHoursBefore}시간 전`}
                </strong>
                ) 이전 취소이므로 차감된 수강권 <strong>1회</strong>가 즉시 복원됩니다 (현재{' '}
                <strong>{portalState.pass.remainingCount}회</strong> → 취소 후{' '}
                <strong>{portalState.pass.remainingCount + 1}회</strong>).
              </div>
            )}
            {pendingAction.intent === 'CANCEL_BOOKING' && isPendingLateCancel && (
              <>
                <p
                  className="status error"
                  role="alert"
                  data-testid="late-cancel-warning"
                  style={{ margin: 0, lineHeight: 1.55 }}
                >
                  무료 취소 마감(
                  {pendingFreeCancelDeadlineKo
                    ? `${pendingFreeCancelDeadlineKo} · 수업 ${pendingAction.slot.freeCancelHoursBefore}시간 전`
                    : `수업 ${pendingAction.slot.freeCancelHoursBefore}시간 전`}
                  )이 지나 지금 취소하시면 수강권{' '}
                  <strong>1회가 복원되지 않고 차감 상태(잔여 {portalState.pass.remainingCount}회)</strong>로 유지됩니다.
                </p>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    minHeight: '44px',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    data-testid="late-cancel-agree-checkbox"
                    checked={lateCancelAgreed}
                    onChange={(e) => setLateCancelAgreed(e.target.checked)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span>무료 취소 기한 경과에 따른 횟수 미복원(위약 차감) 규정을 확인했습니다.</span>
                </label>
              </>
            )}
            {pendingAction.intent === 'CANCEL_WAITLIST' && (
              <div className="pf-member-dialog-summary">
                현재 접수된 대기 순번을 취소합니다. 수강권 횟수 변동은 없습니다.
              </div>
            )}

            <div className="pf-member-dialog-actions">
              <button
                type="button"
                className="pf-member-chip"
                onClick={closePendingDialog}
              >
                닫기
              </button>
              <button
                type="button"
                className="pf-member-slot-cta"
                data-testid="confirm-member-booking-btn"
                disabled={
                  (isPendingLateCancel && !lateCancelAgreed) ||
                  (pendingAction.intent === 'CHANGE_SPOT' &&
                    selectedSpotId === pendingAction.slot.mySpotId)
                }
                onClick={confirmPendingAction}
              >
                {pendingAction.intent === 'BOOK'
                  ? '차감 동의 후 예약 확정'
                  : pendingAction.intent === 'CHANGE_SPOT'
                    ? '선택한 자리로 변경 확정'
                    : pendingAction.intent === 'WAITLIST'
                      ? '대기 신청 확정'
                      : pendingAction.intent === 'CANCEL_BOOKING'
                        ? isPendingLateCancel
                          ? '위약 차감 동의 후 취소 확정'
                          : '예약 취소 확정'
                        : '대기 취소 확정'}
              </button>
            </div>
          </div>
        </LightDismissDialog>
      )}
    </section>
  );
};
