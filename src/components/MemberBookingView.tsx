import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, ShieldCheck, Ticket, WifiOff } from 'lucide-react';
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
  deriveMemberSlotStatus,
  readPersistedMemberBookingState,
  resolveMemberActionIntent,
  writePersistedMemberBookingState,
} from '../utils/memberBookingBridge';
import { LightDismissDialog } from './LightDismissDialog';
import '../styles/member-booking.css';

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
): { label: string; tone: 'sage' | 'terracotta' | 'warning' | 'danger' | 'neutral' } {
  if (slot.myState === 'BOOKED') {
    return { label: '✓ 내 예약 확정', tone: 'sage' };
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
): string {
  if (slot.occurrenceStatus === 'cancelled') return '폐강됨';
  if (intent === 'BOOK') return '예약하기';
  if (intent === 'WAITLIST') return '대기 신청';
  if (intent === 'CANCEL_BOOKING') return '예약 취소';
  if (intent === 'CANCEL_WAITLIST') return '대기 취소';
  return '마감됨';
}

export interface MemberBookingViewProps {
  readonly onSwitchToInstructor?: () => void;
}

export const MemberBookingView: React.FC<MemberBookingViewProps> = ({
  onSwitchToInstructor,
}) => {
  const schedule = usePilatesStore((s) => s.instructorSchedule);
  const savedSequences = usePilatesStore((s) => s.savedSequences);
  const todayIso = localScheduleDate();

  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [apparatusFilter, setApparatusFilter] = useState<'all' | ApparatusType>('all');
  const [portalState, setPortalState] = useState<PersistedMemberBookingState>(() =>
    readPersistedMemberBookingState(todayIso),
  );
  const [pendingAction, setPendingAction] = useState<{
    slot: MemberBookableSlot;
    intent: MemberBookingActionIntent;
  } | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine !== false : true,
  );
  const [simulateOffline, setSimulateOffline] = useState(false);

  const dayButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

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
      apparatusFilter === 'all'
        ? daySlots
        : daySlots.filter((slot) => slot.apparatus === apparatusFilter),
    [daySlots, apparatusFilter],
  );

  const activeStepIndex = pendingAction ? 3 : feedbackBanner ? 3 : 2;

  const updatePortalState = (next: PersistedMemberBookingState) => {
    setPortalState(next);
    writePersistedMemberBookingState(next);
  };

  const handleSlotActionClick = (slot: MemberBookableSlot) => {
    setErrorAlert(null);
    setFeedbackBanner(null);

    if (isOfflineReadOnly) {
      setErrorAlert(
        '오프라인 상태에서는 시간표와 수강권 현황만 확인할 수 있습니다. 네트워크 연결 후 예약·취소를 진행해 주세요.',
      );
      return;
    }

    const intent = resolveMemberActionIntent(slot);
    if (!intent) return;

    if (intent === 'BOOK' || intent === 'WAITLIST') {
      if (isPassExpired) {
        setErrorAlert(
          `선택한 수업일(${selectedDate})이 수강권 만료일(${portalState.pass.expiresAtIso}) 이후여서 예약할 수 없습니다. 센터에 기간 연장을 문의해 주세요.`,
        );
        return;
      }
      if (intent === 'BOOK' && portalState.pass.remainingCount <= 0) {
        setErrorAlert(
          '남은 수강권 횟수가 0회입니다. 기존 예약을 정리하거나 수강권을 갱신한 뒤 예약해 주세요.',
        );
        return;
      }
    }

    setPendingAction({ slot, intent });
  };

  const confirmPendingAction = () => {
    if (!pendingAction) return;
    const { slot, intent } = pendingAction;
    const nowIso = new Date().toISOString();
    const nextDecisions = { ...portalState.slotDecisions };
    let nextRemaining = portalState.pass.remainingCount;
    let nextPendingReserved = portalState.pass.pendingReservedCount;
    let message = '';

    if (intent === 'BOOK') {
      if (nextRemaining <= 0) {
        setErrorAlert('남은 수강권 횟수가 부족해 예약을 확정하지 못했습니다.');
        setPendingAction(null);
        return;
      }
      nextRemaining -= 1;
      nextPendingReserved += 1;
      nextDecisions[slot.id] = { state: 'BOOKED', updatedAt: nowIso };
      message = `'${slot.title}' (${formatScheduleTime(slot.startTime)}) 예약이 확정되었습니다. 남은 수강권 ${nextRemaining}회`;
    } else if (intent === 'WAITLIST') {
      const waitlistOrder = slot.baseWaitlist + 1;
      nextDecisions[slot.id] = {
        state: 'WAITLISTED',
        waitlistOrder,
        updatedAt: nowIso,
      };
      message = `'${slot.title}' 대기 ${waitlistOrder}번으로 접수했습니다. 빈자리가 나면 순번대로 안내됩니다.`;
    } else if (intent === 'CANCEL_BOOKING') {
      delete nextDecisions[slot.id];
      nextRemaining = Math.min(portalState.pass.totalCount, nextRemaining + 1);
      nextPendingReserved = Math.max(0, nextPendingReserved - 1);
      message = `'${slot.title}' 예약을 취소하고 수강권 1회를 복원했습니다. 남은 수강권 ${nextRemaining}회`;
    } else if (intent === 'CANCEL_WAITLIST') {
      delete nextDecisions[slot.id];
      message = `'${slot.title}' 대기 신청을 취소했습니다.`;
    }

    updatePortalState({
      pass: {
        ...portalState.pass,
        remainingCount: nextRemaining,
        pendingReservedCount: nextPendingReserved,
      },
      slotDecisions: nextDecisions,
    });
    setPendingAction(null);
    setErrorAlert(null);
    setFeedbackBanner(message);
  };

  const handleWeekKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIdx = -1;
    if (event.key === 'ArrowRight') nextIdx = Math.min(weekDates.length - 1, index + 1);
    else if (event.key === 'ArrowLeft') nextIdx = Math.max(0, index - 1);
    else if (event.key === 'Home') nextIdx = 0;
    else if (event.key === 'End') nextIdx = weekDates.length - 1;

    if (nextIdx >= 0 && nextIdx !== index) {
      event.preventDefault();
      setSelectedDate(weekDates[nextIdx]);
      dayButtonRefs.current[nextIdx]?.focus();
    }
  };

  return (
    <section
      className="pf-member-view"
      aria-labelledby="workspace-main-heading"
      data-testid="member-booking-view"
    >
      <header className="pf-member-header">
        <div>
          <span className="eyebrow">MEMBER BOOKING &amp; PASS</span>
          <h1 id="workspace-main-heading" tabIndex={-1}>
            회원 수업 예약·수강권
          </h1>
          <p>남은 횟수와 취소 기준을 먼저 확인하고, 원하는 날짜의 기구 수업을 바로 예약하세요.</p>
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

      <ol className="pf-member-steps" aria-label="회원 예약 3단계 안내">
        <li className={activeStepIndex === 1 ? 'is-active' : ''}>
          1. 내 수강권·남은 횟수 확인
        </li>
        <li className={activeStepIndex === 2 ? 'is-active' : ''}>
          2. 날짜·기구별 수업 선택
        </li>
        <li className={activeStepIndex === 3 ? 'is-active' : ''}>
          3. 차감·취소 기준 확인 후 확정
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

      <section className="pf-member-pass-card" aria-label="내 수강권 현황">
        <div className="pf-member-pass-top">
          <div>
            <span className="eyebrow">
              <Ticket size={14} aria-hidden="true" style={{ verticalAlign: 'middle' }} /> 내 수강권
            </span>
            <h2>{portalState.pass.passTitle}</h2>
          </div>
          <PfBadge tone={isPassExpired || portalState.pass.remainingCount === 0 ? 'danger' : 'sage'}>
            {isPassExpired
              ? '기간 만료 확인 필요'
              : portalState.pass.remainingCount === 0
                ? '잔여 횟수 없음'
                : `남은 횟수 ${portalState.pass.remainingCount}회`}
          </PfBadge>
        </div>
        <div className="pf-member-pass-metrics" data-testid="member-pass-metrics">
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
      </section>

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

      <section aria-label="주간 수업 날짜 선택">
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
              onClick={() => setSelectedDate(addScheduleDays(selectedDate, -7))}
            >
              <ChevronLeft size={16} aria-hidden="true" /> 이전 주
            </button>
            <button
              type="button"
              className="pf-member-chip"
              onClick={() => setSelectedDate(todayIso)}
            >
              오늘
            </button>
            <button
              type="button"
              className="pf-member-chip"
              aria-label="다음 주 보기"
              onClick={() => setSelectedDate(addScheduleDays(selectedDate, 7))}
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
                onClick={() => setSelectedDate(dateIso)}
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
              onClick={() => setApparatusFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pf-member-slot-list" aria-label="선택한 날짜의 수업 목록">
        {filteredSlots.length === 0 ? (
          <div className="pf-member-pass-card">
            <p style={{ margin: 0 }}>
              선택한 날짜·기구 조건에 열린 수업이 없습니다. 다른 요일이나 ‘전체 기구’를 선택해 보세요.
            </p>
          </div>
        ) : (
          filteredSlots.map((slot) => {
            const status = deriveMemberSlotStatus(slot);
            const pill = statusPillMeta(slot, status);
            const intent = resolveMemberActionIntent(slot);
            const ctaLabel = ctaButtonLabel(slot, intent);
            const effectiveEnrolled =
              slot.baseEnrolled + (slot.myState === 'BOOKED' ? 1 : 0);
            const effectiveWaitlist =
              slot.baseWaitlist + (slot.myState === 'WAITLISTED' ? 1 : 0);
            const isCancelAction =
              intent === 'CANCEL_BOOKING' || intent === 'CANCEL_WAITLIST';

            return (
              <article
                key={slot.id}
                className="pf-member-slot-card"
                data-testid={`member-slot-${slot.id}`}
              >
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
                    {slot.maxCapacity}명
                    {effectiveWaitlist > 0 ? ` (대기 ${effectiveWaitlist}명)` : ''} · 수업{' '}
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
          onClose={() => setPendingAction(null)}
          title={
            pendingAction.intent === 'BOOK'
              ? '수업 예약 확인'
              : pendingAction.intent === 'WAITLIST'
                ? '대기 신청 확인'
                : pendingAction.intent === 'CANCEL_BOOKING'
                  ? '예약 취소 및 횟수 복원 확인'
                  : '대기 신청 취소 확인'
          }
          subtitle={`${pendingAction.slot.date} ${formatScheduleTime(
            pendingAction.slot.startTime,
          )} · ${pendingAction.slot.title}`}
          maxWidth="480px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pendingAction.intent === 'BOOK' && (
              <p style={{ margin: 0, lineHeight: 1.55 }}>
                예약 확정 시 수강권 <strong>1회</strong>가 차감됩니다 (예약 전{' '}
                <strong>{portalState.pass.remainingCount}회</strong> → 확정 후{' '}
                <strong>{portalState.pass.remainingCount - 1}회</strong>). 수업 시작{' '}
                <strong>{pendingAction.slot.freeCancelHoursBefore}시간 전</strong>까지 취소하면 차감된
                횟수가 그대로 복원됩니다.
              </p>
            )}
            {pendingAction.intent === 'WAITLIST' && (
              <p style={{ margin: 0, lineHeight: 1.55 }}>
                정원이 모두 차 대기 순번(<strong>{pendingAction.slot.baseWaitlist + 1}번</strong>)으로
                접수합니다. 대기 신청만으로는 횟수가 차감되지 않으며, 결원 발생 시 예약 전환 여부를 안내해
                드립니다.
              </p>
            )}
            {pendingAction.intent === 'CANCEL_BOOKING' && (
              <p style={{ margin: 0, lineHeight: 1.55 }}>
                무료 취소 기한(수업 {pendingAction.slot.freeCancelHoursBefore}시간 전) 내 취소 시
                차감된 수강권 <strong>1회</strong>가 즉시 복원됩니다 (현재{' '}
                <strong>{portalState.pass.remainingCount}회</strong> → 취소 후{' '}
                <strong>{portalState.pass.remainingCount + 1}회</strong>).
              </p>
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
                onClick={() => setPendingAction(null)}
              >
                닫기
              </button>
              <button
                type="button"
                className="pf-member-slot-cta"
                data-testid="confirm-member-booking-btn"
                onClick={confirmPendingAction}
              >
                {pendingAction.intent === 'BOOK'
                  ? '차감 동의 후 예약 확정'
                  : pendingAction.intent === 'WAITLIST'
                    ? '대기 신청 확정'
                    : pendingAction.intent === 'CANCEL_BOOKING'
                      ? '예약 취소 확정'
                      : '대기 취소 확정'}
              </button>
            </div>
          </div>
        </LightDismissDialog>
      )}
    </section>
  );
};
