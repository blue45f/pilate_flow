import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  ShieldCheck,
  Sparkles,
  Ticket,
  WifiOff,
} from 'lucide-react';
import { PfBadge } from '../design-system';
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
  buildMemberSlotsForDate,
  computeStudioSpotStates,
  deriveMemberSlotStatus,
  findSpotMetaById,
  getApparatusSpotLabelKo,
  getApparatusStudio3dImage,
  isSlotPastFreeCancelDeadline,
  pickDefaultOpenSpotId,
  readPersistedMemberBookingState,
  resolveMemberActionIntent,
  writePersistedMemberBookingState,
} from '../utils/memberBookingBridge';
import { LightDismissDialog } from './LightDismissDialog';
import '../styles/member-booking.css';
import '../styles/atelier-luxury-v2.css';

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'] as const;

const APPARATUS_FILTERS: ReadonlyArray<{ value: 'all' | ApparatusType; label: string }> = [
  { value: 'all', label: '전체 기구' },
  { value: 'reformer', label: '리포머' },
  { value: 'chair', label: '체어' },
  { value: 'cadillac', label: '캐딜락' },
  { value: 'barrel', label: '바렐' },
  { value: 'mat', label: '매트' },
];

function formatDateBadge(dateIso: string): { weekday: string; monthDay: string } {
  const [y, m, d] = dateIso.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return {
    weekday: WEEKDAY_KO[dt.getDay()] ?? '',
    monthDay: `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`,
  };
}

function statusPillMeta(
  slot: MemberBookableSlot,
  status: MemberSlotBookingStatus,
  todayIso: string,
): { label: string; tone: 'sage' | 'terracotta' | 'warning' | 'danger' | 'neutral' } {
  if (slot.occurrenceStatus === 'cancelled') {
    return { label: '✕ 폐강 안내', tone: 'danger' };
  }
  if (slot.date < todayIso) {
    const spotPart = slot.myState === 'BOOKED' && slot.mySpotId ? ` · ${slot.mySpotId}번 자리` : '';
    return {
      label: slot.myState === 'BOOKED' ? `✓ 수강 완료${spotPart}` : '■ 종료된 수업',
      tone: 'neutral',
    };
  }
  if (slot.myState === 'BOOKED') {
    const spotPart = slot.mySpotId ? ` · ${slot.mySpotId}번 자리` : '';
    return { label: `✓ 내 예약 확정${spotPart}`, tone: 'sage' };
  }
  if (slot.myState === 'WAITLISTED') {
    return {
      label: `⏳ 내 대기 ${slot.myWaitlistOrder ?? 1}번`,
      tone: 'terracotta',
    };
  }
  switch (status) {
    case 'AVAILABLE':
      return { label: '● 예약 가능', tone: 'sage' };
    case 'ALMOST_FULL':
      return { label: '▲ 마감 임박 · 잔여 1석', tone: 'warning' };
    case 'WAITLIST':
      return { label: '◆ 대기 신청 가능', tone: 'terracotta' };
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
  if (slot.occurrenceStatus === 'cancelled') return '폐강됨';
  if (slot.date < todayIso) return '종료됨';
  if (intent === 'BOOK') return '예약하기';
  if (intent === 'WAITLIST') return '대기 신청';
  if (intent === 'CANCEL_BOOKING') return '예약 취소';
  if (intent === 'CANCEL_WAITLIST') return '대기 취소';
  return '마감됨';
}

export type MemberPortalSection = 'schedule' | 'bookings' | 'wallet';

export interface MemberBookingViewProps {
  readonly onSwitchToInstructor?: () => void;
  readonly activeSection?: MemberPortalSection;
}

export const MemberBookingView: React.FC<MemberBookingViewProps> = ({
  onSwitchToInstructor,
}) => {
  const schedule = usePilatesStore((s) => s.instructorSchedule);
  const savedSequences = usePilatesStore((s) => s.savedSequences);
  const todayIso = localScheduleDate();

  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [apparatusFilter, setApparatusFilter] = useState<'all' | ApparatusType>('all');
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
    intent: MemberBookingActionIntent;
  } | null>(null);
  const [selectedSpotId, setSelectedSpotId] = useState<string>('R2');
  const [lateCancelAgreed, setLateCancelAgreed] = useState<boolean>(false);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine !== false : true,
  );
  const [simulateOffline, setSimulateOffline] = useState(false);

  const dayButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    livePortalRef.current = portalState;
  }, [portalState]);

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
    () => scheduleDateRange(weekStart, addScheduleDays(weekStart, 6)),
    [weekStart],
  );

  const { slots: daySlots, weekCounts } = useMemo(
    () =>
      buildMemberSlotsForDate({
        selectedDate,
        schedule,
        savedSequences,
        decisions: portalState.slotDecisions,
      }),
    [selectedDate, schedule, savedSequences, portalState.slotDecisions],
  );

  const filteredSlots = useMemo(
    () =>
      daySlots.filter((slot) => {
        if (apparatusFilter !== 'all' && slot.apparatus !== apparatusFilter) {
          return false;
        }
        if (availableOnly) {
          const st = deriveMemberSlotStatus(slot);
          return slot.myState === 'BOOKED' || st === 'AVAILABLE' || st === 'ALMOST_FULL';
        }
        return true;
      }),
    [daySlots, apparatusFilter, availableOnly],
  );

  const myActiveBookingEntries = useMemo(
    () =>
      Object.entries(portalState.slotDecisions).sort(([, a], [, b]) =>
        (a.slotDate ?? '').localeCompare(b.slotDate ?? ''),
      ),
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

  const handleSlotActionClick = (slot: MemberBookableSlot) => {
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
      if (intent === 'BOOK') {
        setSelectedSpotId(pickDefaultOpenSpotId(latestSlot));
      }
    }

    setLateCancelAgreed(false);
    setPendingAction({
      dialogSeq: ++nextDialogSeqRef.current,
      slot: latestSlot,
      intent,
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
    const { slot, intent, dialogSeq } = pendingAction;
    const existingDecision = currentPortal.slotDecisions[slot.id];
    const lateCancel =
      intent === 'CANCEL_BOOKING' &&
      isSlotPastFreeCancelDeadline(slot, existingDecision?.updatedAt);

    if (lateCancel && !lateCancelAgreed) {
      return;
    }

    confirmLockRef.current = true;
    consumedDialogSeqRef.current = dialogSeq;

    try {
      const nowIso = new Date().toISOString();
      const nextDecisions = { ...currentPortal.slotDecisions };
      let nextRemaining = currentPortal.pass.remainingCount;
      let message = '';

      if (intent === 'BOOK') {
        if (existingDecision?.state === 'BOOKED') {
          setPendingAction(null);
          return;
        }
        if (nextRemaining <= 0) {
          setErrorAlert('남은 수강권 횟수가 부족해 예약을 확정하지 못했습니다.');
          setPendingAction(null);
          return;
        }
        const spotMeta = findSpotMetaById(slot.apparatus, selectedSpotId);
        const apparatusNameKo = getApparatusSpotLabelKo(slot.apparatus);
        const spotDesc = spotMeta
          ? `${apparatusNameKo} ${spotMeta.spotId}(${spotMeta.zoneKo})`
          : `${apparatusNameKo} ${selectedSpotId}`;
        nextRemaining -= 1;
        nextDecisions[slot.id] = {
          state: 'BOOKED',
          spotId: selectedSpotId,
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
    () => (pendingAction?.intent === 'BOOK' ? computeStudioSpotStates(pendingAction.slot) : []),
    [pendingAction],
  );

  const pendingApparatusLabelKo = pendingAction
    ? getApparatusSpotLabelKo(pendingAction.slot.apparatus)
    : '기구';

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
          <p>남은 횟수를 확인하고, 원하는 날짜와 수업별 기구 자리를 골라 바로 예약하세요.</p>
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
          2. 날짜·기구별 수업 선택
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
            <Ticket size={14} aria-hidden="true" style={{ verticalAlign: 'middle' }} /> ATELIER PASS WALLET
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

      {myActiveBookingEntries.length > 0 && (
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
          {myActiveBookingEntries.map(([slotId, info]) => (
            <div key={slotId} className="pf-member-my-bookings__item">
              <div>
                <strong>{info.slotTitle ?? '예약한 수업'}</strong>
                <span style={{ marginLeft: '8px', fontSize: '0.84rem', color: '#4c5d54' }}>
                  {info.slotDate ? `${info.slotDate} ` : ''}
                  {info.slotTime ? formatScheduleTime(info.slotTime) : ''}
                  {info.state === 'BOOKED' && info.spotId ? ` · ${info.spotId}번 자리` : ''}
                  {info.state === 'WAITLISTED' ? ` · 대기 ${info.waitlistOrder ?? 1}번` : ''}
                </span>
              </div>
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
            </div>
          ))}
        </section>
      )}

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
              {weekDates[0]} ~ {weekDates[6]}
            </strong>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className="pf-member-chip"
              aria-label="이전 주 보기"
              onClick={() => {
                setHasInteractedSchedule(true);
                setSelectedDate(addScheduleDays(selectedDate, -7));
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
              onClick={() => {
                setHasInteractedSchedule(true);
                setSelectedDate(addScheduleDays(selectedDate, 7));
              }}
            >
              다음 주 <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div
          role="group"
          aria-label="요일별 날짜 선택"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            gap: '6px',
          }}
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
                className="pf-member-chip"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px 4px',
                  minHeight: '60px',
                  borderRadius: '12px',
                }}
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
          {APPARATUS_FILTERS.map((filter) => (
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
              {filter.label}
            </button>
          ))}
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

      <div className="pf-member-slot-list" aria-label="선택한 날짜의 수업 목록">
        {filteredSlots.length === 0 ? (
          <div className="pf-member-pass-card">
            <p style={{ margin: 0 }}>
              선택한 날짜·필터 조건에 열린 수업이 없습니다. ‘예약 가능만 보기’를 해제하거나 ‘전체 기구’를 선택해 보세요.
            </p>
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
            const studioArtSrc = getApparatusStudio3dImage(slot.apparatus);

            return (
              <article
                key={slot.id}
                className="pf-member-slot-card"
                data-testid={`member-slot-${slot.id}`}
              >
                <img
                  src={studioArtSrc}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  style={{
                    width: '88px',
                    height: '64px',
                    objectFit: 'cover',
                    borderRadius: '12px',
                    border: '1px solid rgba(201, 166, 107, 0.35)',
                    flexShrink: 0,
                  }}
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
                  <p className="pf-member-slot-meta">
                    기구: {slot.equipmentLabels.join(' · ')} · 정원 {effectiveEnrolled}/
                    {slot.maxCapacity}명 (남은 자리 {Math.max(0, slot.maxCapacity - effectiveEnrolled)}석)
                    {effectiveWaitlist > 0 ? ` · 대기 ${effectiveWaitlist}명` : ''} · 수업{' '}
                    {slot.freeCancelHoursBefore}시간 전까지 무료 취소
                  </p>
                </div>
                <button
                  type="button"
                  className={`pf-member-slot-cta ${isCancelAction ? 'is-secondary' : ''}`.trim()}
                  disabled={!intent || isOfflineReadOnly}
                  aria-label={`${slot.title} ${ctaLabel}`}
                  onClick={() => handleSlotActionClick(slot)}
                >
                  {ctaLabel}
                </button>
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
          title={
            pendingAction.intent === 'BOOK'
              ? `${pendingApparatusLabelKo} 자리 선택 및 예약 확인`
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
            {pendingAction.intent === 'BOOK' && (
              <>
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
                    {pendingSpotStates.map((spot) => {
                      const isPicked = selectedSpotId === spot.spotId && !spot.occupiedByOther;
                      return (
                        <button
                          key={spot.spotId}
                          type="button"
                          className="pf-studio-spot-btn"
                          data-testid={`spot-btn-${spot.spotId}`}
                          disabled={spot.occupiedByOther}
                          aria-pressed={isPicked}
                          aria-label={`${spot.spotId} ${spot.zoneKo} ${
                            spot.occupiedByOther ? '마감' : isPicked ? '선택됨' : '선택 가능'
                          }`}
                          onClick={() => setSelectedSpotId(spot.spotId)}
                        >
                          <strong>{spot.spotId}</strong>
                          <small>{spot.zoneKo}</small>
                          <small style={{ fontWeight: 700 }}>
                            {spot.occupiedByOther ? '예약 마감' : isPicked ? '✓ 선택됨' : '선택 가능'}
                          </small>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <p style={{ margin: 0, lineHeight: 1.55 }}>
                  선택 자리: <strong>{pendingApparatusLabelKo} {selectedSpotId}번</strong> · 예약 확정 시 수강권{' '}
                  <strong>1회</strong>가 차감됩니다 (예약 전{' '}
                  <strong>{portalState.pass.remainingCount}회</strong> → 확정 후{' '}
                  <strong>{portalState.pass.remainingCount - 1}회</strong>). 수업 시작{' '}
                  <strong>{pendingAction.slot.freeCancelHoursBefore}시간 전</strong>까지 취소하면 차감된
                  횟수가 그대로 복원됩니다.
                </p>
              </>
            )}
            {pendingAction.intent === 'WAITLIST' && (
              <p style={{ margin: 0, lineHeight: 1.55 }}>
                정원이 모두 차 대기 순번(<strong>{pendingAction.slot.baseWaitlist + 1}번</strong>)으로
                접수합니다. 대기 신청만으로는 횟수가 차감되지 않으며, 결원 발생 시 수업 시작 2시간 전까지 순번대로 안내해
                드립니다.
              </p>
            )}
            {pendingAction.intent === 'CANCEL_BOOKING' && !isPendingLateCancel && (
              <p style={{ margin: 0, lineHeight: 1.55 }}>
                무료 취소 기한(수업 {pendingAction.slot.freeCancelHoursBefore}시간 전) 내 취소이므로
                차감된 수강권 <strong>1회</strong>가 즉시 복원됩니다 (현재{' '}
                <strong>{portalState.pass.remainingCount}회</strong> → 취소 후{' '}
                <strong>{portalState.pass.remainingCount + 1}회</strong>).
              </p>
            )}
            {pendingAction.intent === 'CANCEL_BOOKING' && isPendingLateCancel && (
              <>
                <p
                  className="status error"
                  role="alert"
                  data-testid="late-cancel-warning"
                  style={{ margin: 0, lineHeight: 1.55 }}
                >
                  무료 취소 기한(수업 {pendingAction.slot.freeCancelHoursBefore}시간 전)이 지나 지금 취소하시면
                  수강권 <strong>1회가 복원되지 않고 차감 상태(잔여 {portalState.pass.remainingCount}회)</strong>로 유지됩니다.
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
              <p style={{ margin: 0, lineHeight: 1.55 }}>
                현재 접수된 대기 순번을 취소합니다. 수강권 횟수 변동은 없습니다.
              </p>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
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
                disabled={isPendingLateCancel && !lateCancelAgreed}
                onClick={confirmPendingAction}
              >
                {pendingAction.intent === 'BOOK'
                  ? '차감 동의 후 예약 확정'
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
