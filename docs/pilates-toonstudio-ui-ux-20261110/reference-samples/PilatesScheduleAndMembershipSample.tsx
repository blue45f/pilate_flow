import React, { useRef, useState } from 'react';

/**
 * [독립 참조 컴포넌트] Pilates-flow 모바일 회원 예약·정원/대기/마감/취소·회원권 오류 방지 샘플
 * - 강사 전용 운영 앱(src/)과 분리된 docs/ 하위 디자인·상태 전이 참조 샘플입니다.
 * - 보강 사항:
 *   1) 예약(BOOK), 대기 신청(WAITLIST), 예약 취소(CANCEL_BOOKING), 대기 취소(CANCEL_WAITLIST) 확인 모달 및 상태 전이를 명확히 분리했습니다.
 *   2) submittingRef 재진입 잠금을 실제 제출 구간(try / finally)에 설정·해제하여 중복 클릭 차감을 방지합니다.
 */

export type InstructorOccurrenceStatus = 'scheduled' | 'cancelled' | 'closed' | 'moved';
export type MemberSlotBookingStatus = 'AVAILABLE' | 'ALMOST_FULL' | 'WAITLIST' | 'CLOSED' | 'CANCELED';
export type BookingActionIntent = 'BOOK' | 'WAITLIST' | 'CANCEL_BOOKING' | 'CANCEL_WAITLIST';

export interface MemberPassLedger {
  readonly passId: string;
  readonly passTitle: string;
  readonly participantAlias: string;
  readonly remainingCount: number;
  readonly pendingReservedCount: number;
  readonly totalCount: number;
  readonly expiresAtIso: string;
}

export interface PilatesMemberClassSlot {
  readonly id: string;
  readonly classId: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly title: string;
  readonly locationAlias: string;
  readonly instructorAlias: string;
  readonly equipmentLabels: readonly string[];
  readonly recommendedLayer: 'easy' | 'standard' | 'hard';
  readonly occurrenceStatus: InstructorOccurrenceStatus;
  readonly currentEnrolled: number;
  readonly maxCapacity: number;
  readonly waitlistCount: number;
  readonly maxWaitlist: number;
  readonly freeCancelHoursBefore: number;
  readonly myState: 'NONE' | 'BOOKED' | 'WAITLISTED';
  readonly myWaitlistOrder?: number;
}

interface PendingDialogState {
  readonly slot: PilatesMemberClassSlot;
  readonly intent: BookingActionIntent;
}

function deriveMemberSlotStatus(slot: PilatesMemberClassSlot): MemberSlotBookingStatus {
  if (slot.occurrenceStatus === 'cancelled') return 'CANCELED';
  if (slot.occurrenceStatus === 'closed') return 'CLOSED';
  if (slot.currentEnrolled < slot.maxCapacity - 1) return 'AVAILABLE';
  if (slot.currentEnrolled === slot.maxCapacity - 1) return 'ALMOST_FULL';
  if (slot.waitlistCount < slot.maxWaitlist) return 'WAITLIST';
  return 'CLOSED';
}

function resolveSlotActionIntent(
  slot: PilatesMemberClassSlot,
  status: MemberSlotBookingStatus,
): BookingActionIntent | null {
  if (slot.occurrenceStatus === 'cancelled' || slot.occurrenceStatus === 'closed') {
    return null;
  }
  if (slot.myState === 'BOOKED') return 'CANCEL_BOOKING';
  if (slot.myState === 'WAITLISTED') return 'CANCEL_WAITLIST';
  if (status === 'AVAILABLE' || status === 'ALMOST_FULL') return 'BOOK';
  if (status === 'WAITLIST') return 'WAITLIST';
  return null;
}

const SLOT_BADGE_TOKENS: Record<
  MemberSlotBookingStatus,
  { readonly icon: string; readonly labelKo: string; readonly fg: string; readonly bg: string; readonly border: string }
> = {
  AVAILABLE: {
    icon: '●',
    labelKo: '예약 가능',
    fg: 'var(--pf-color-status-success-text, #254B29)',
    bg: 'var(--pf-color-ai-draft-bg, #EEF2EA)',
    border: 'var(--pf-color-border-default, #D5DDD0)',
  },
  ALMOST_FULL: {
    icon: '▲',
    labelKo: '마감 임박 · 잔여 1석',
    fg: 'var(--pf-color-status-warning-text, #6B4010)',
    bg: 'var(--pf-color-ai-memo-bg, #F4F1E3)',
    border: '#E0D4C4',
  },
  WAITLIST: {
    icon: '◆',
    labelKo: '대기 가능',
    fg: 'var(--pf-color-status-warning-text, #6B4010)',
    bg: 'var(--pf-color-ai-memo-bg, #F4F1E3)',
    border: '#E0D4C4',
  },
  CLOSED: {
    icon: '■',
    labelKo: '정원 마감',
    fg: 'var(--pf-color-text-muted, #526358)',
    bg: 'var(--pf-color-bg-surface-subtle, #F3F5EE)',
    border: 'var(--pf-color-border-default, #D5DDD0)',
  },
  CANCELED: {
    icon: '✕',
    labelKo: '폐강 안내',
    fg: 'var(--pf-color-status-danger-text, #8A341E)',
    bg: '#FFF1F2',
    border: '#FECDD3',
  },
};

export const PilatesScheduleAndMembershipSample: React.FC<{
  readonly pass: MemberPassLedger;
  readonly slots: readonly PilatesMemberClassSlot[];
  readonly selectedDate: string;
  readonly isOffline?: boolean;
}> = ({ pass, slots, selectedDate, isOffline = false }) => {
  const [localPass, setLocalPass] = useState<MemberPassLedger>(pass);
  const [localSlots, setLocalSlots] = useState<readonly PilatesMemberClassSlot[]>(slots);
  const [pendingDialog, setPendingDialog] = useState<PendingDialogState | null>(null);
  const [policyAgreed, setPolicyAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ readonly tone: 'status' | 'alert'; readonly text: string } | null>(null);
  const submittingRef = useRef(false);

  const isExpiredForDate = selectedDate > localPass.expiresAtIso;
  const isExhausted = localPass.remainingCount <= 0;

  const handleOpenSlotAction = (slot: PilatesMemberClassSlot, intent: BookingActionIntent) => {
    if (submittingRef.current) return;
    if (isOffline) {
      setFeedback({
        tone: 'alert',
        text: '오프라인 상태에서는 실시간 정원과 수강권 잔여 횟수를 확인할 수 없습니다. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.',
      });
      return;
    }
    if (intent === 'BOOK' || intent === 'WAITLIST') {
      if (isExpiredForDate) {
        setFeedback({
          tone: 'alert',
          text: `선택하신 수업 날짜(${selectedDate})가 수강권 만료일(${localPass.expiresAtIso}) 이후입니다. 만료일 이전 날짜를 선택해 주세요.`,
        });
        return;
      }
      if (isExhausted) {
        setFeedback({
          tone: 'alert',
          text: '현재 수강권의 남은 횟수가 0회입니다. 스튜디오에 수강권 연장이나 재등록을 문의해 주세요.',
        });
        return;
      }
    }
    setPolicyAgreed(false);
    setPendingDialog({ slot, intent });
  };

  const handleConfirmAction = () => {
    if (!pendingDialog || !policyAgreed || submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const { slot, intent } = pendingDialog;

      if (intent === 'BOOK') {
        const nextRemaining = Math.max(0, localPass.remainingCount - 1);
        setLocalPass((prev) => ({
          ...prev,
          remainingCount: Math.max(0, prev.remainingCount - 1),
          pendingReservedCount: prev.pendingReservedCount + 1,
        }));
        setLocalSlots((prev) =>
          prev.map((item) =>
            item.id === slot.id
              ? {
                  ...item,
                  currentEnrolled: Math.min(item.maxCapacity, item.currentEnrolled + 1),
                  myState: 'BOOKED',
                  myWaitlistOrder: undefined,
                }
              : item,
          ),
        );
        setFeedback({
          tone: 'status',
          text: `${slot.date} ${slot.startTime} [${slot.title}] 예약을 확정했습니다. 수강권 1회가 차감되어 남은 횟수는 ${nextRemaining}회입니다.`,
        });
      } else if (intent === 'WAITLIST') {
        const nextOrder = slot.waitlistCount + 1;
        setLocalPass((prev) => ({
          ...prev,
          remainingCount: Math.max(0, prev.remainingCount - 1),
          pendingReservedCount: prev.pendingReservedCount + 1,
        }));
        setLocalSlots((prev) =>
          prev.map((item) =>
            item.id === slot.id
              ? {
                  ...item,
                  waitlistCount: Math.min(item.maxWaitlist, item.waitlistCount + 1),
                  myState: 'WAITLISTED',
                  myWaitlistOrder: nextOrder,
                }
              : item,
          ),
        );
        setFeedback({
          tone: 'status',
          text: `현재 대기 ${nextOrder}번으로 접수했습니다. 앞선 예약이 취소되면 수업 시작 2시간 전까지 순서대로 자동 승급됩니다.`,
        });
      } else if (intent === 'CANCEL_BOOKING') {
        const nextRemaining = Math.min(localPass.totalCount, localPass.remainingCount + 1);
        setLocalPass((prev) => ({
          ...prev,
          remainingCount: Math.min(prev.totalCount, prev.remainingCount + 1),
          pendingReservedCount: Math.max(0, prev.pendingReservedCount - 1),
        }));
        setLocalSlots((prev) =>
          prev.map((item) =>
            item.id === slot.id
              ? {
                  ...item,
                  currentEnrolled: Math.max(0, item.currentEnrolled - 1),
                  myState: 'NONE',
                  myWaitlistOrder: undefined,
                }
              : item,
          ),
        );
        setFeedback({
          tone: 'status',
          text: `[${slot.title}] 예약을 취소했습니다. 수강권 1회가 복구되어 현재 남은 횟수는 ${nextRemaining}회입니다.`,
        });
      } else if (intent === 'CANCEL_WAITLIST') {
        const nextRemaining = Math.min(localPass.totalCount, localPass.remainingCount + 1);
        setLocalPass((prev) => ({
          ...prev,
          remainingCount: Math.min(prev.totalCount, prev.remainingCount + 1),
          pendingReservedCount: Math.max(0, prev.pendingReservedCount - 1),
        }));
        setLocalSlots((prev) =>
          prev.map((item) =>
            item.id === slot.id
              ? {
                  ...item,
                  waitlistCount: Math.max(0, item.waitlistCount - 1),
                  myState: 'NONE',
                  myWaitlistOrder: undefined,
                }
              : item,
          ),
        );
        setFeedback({
          tone: 'status',
          text: `[${slot.title}] 대기 신청을 취소했습니다. 보류 중이던 수강권 1회가 복구되어 남은 횟수는 ${nextRemaining}회입니다.`,
        });
      }

      setPendingDialog(null);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <section
      aria-label="필라테스 회원 수업 예약"
      style={{
        backgroundColor: 'var(--pf-color-bg-canvas, #F7F5EF)',
        color: 'var(--pf-color-text-primary, #1E3129)',
        padding: 'var(--pf-space-4, 16px)',
        maxWidth: 480,
        margin: '0 auto',
        fontFamily: 'var(--pf-font-sans, Pretendard, sans-serif)',
      }}
    >
      {isOffline && (
        <div
          role="status"
          aria-live="polite"
          style={{
            backgroundColor: 'var(--pf-color-ai-memo-bg, #F4F1E3)',
            color: 'var(--pf-color-status-warning-text, #6B4010)',
            border: '1px solid #E0D4C4',
            borderRadius: 'var(--pf-radius-md, 12px)',
            padding: '12px 16px',
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          인터넷 연결이 끊어져 이 기기에 마지막으로 저장된 시간표를 보여드리고 있어요. 실시간 잔여석 확인과 예약·취소는 연결 복구 후 가능합니다.
        </div>
      )}

      <article
        aria-label="내 수강권 현황"
        style={{
          backgroundColor: 'var(--pf-color-bg-surface, #FFFEF9)',
          border: '1px solid var(--pf-color-border-default, #D5DDD0)',
          borderRadius: 'var(--pf-radius-lg, 16px)',
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div>
            <span style={{ fontSize: 11, color: 'var(--pf-color-text-muted, #526358)' }}>
              회원 별칭: {localPass.participantAlias}
            </span>
            <h2 style={{ margin: '2px 0 0', fontSize: 18 }}>{localPass.passTitle}</h2>
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 9999,
              backgroundColor: isExpiredForDate || isExhausted ? '#FFF1F2' : '#EEF2EA',
              color:
                isExpiredForDate || isExhausted
                  ? 'var(--pf-color-status-danger-text, #8A341E)'
                  : 'var(--pf-color-status-success-text, #254B29)',
            }}
          >
            {isExpiredForDate ? '✕ 선택일 기준 만료' : isExhausted ? '✕ 잔여 횟수 없음' : '● 정상 이용 중'}
          </span>
        </div>

        <div
          style={{
            marginTop: 12,
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px 16px',
            fontSize: 14,
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--pf-color-text-secondary, #3D4F45)',
          }}
        >
          <span>
            남은 횟수: <strong>{localPass.remainingCount}회</strong> / {localPass.totalCount}회
          </span>
          <span>예약 중 홀드: {localPass.pendingReservedCount}회</span>
          <span>
            만료일: <strong>{localPass.expiresAtIso}</strong>
          </span>
        </div>
      </article>

      {feedback && (
        <p
          role={feedback.tone}
          aria-live={feedback.tone === 'alert' ? 'assertive' : 'polite'}
          style={{
            backgroundColor: feedback.tone === 'alert' ? '#FFF1F2' : '#EEF2EA',
            color:
              feedback.tone === 'alert'
                ? 'var(--pf-color-status-danger-text, #8A341E)'
                : 'var(--pf-color-status-success-text, #254B29)',
            border: '1px solid var(--pf-color-border-default, #D5DDD0)',
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {feedback.text}
        </p>
      )}

      {localSlots.length === 0 ? (
        <div
          style={{
            backgroundColor: 'var(--pf-color-bg-surface, #FFFEF9)',
            border: '1px dashed var(--pf-color-border-default, #D5DDD0)',
            borderRadius: 16,
            padding: 32,
            textAlign: 'center',
            color: 'var(--pf-color-text-muted, #526358)',
            fontSize: 14,
          }}
        >
          선택하신 날짜에는 개설된 수업이 없거나 센터 휴무일입니다. 주간 날짜 선택에서 다른 요일을 확인해 보세요.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {localSlots.map((slot) => {
            const status = deriveMemberSlotStatus(slot);
            const badge = SLOT_BADGE_TOKENS[status];
            const actionIntent = resolveSlotActionIntent(slot, status);
            const disabled = isOffline || isSubmitting || actionIntent === null;

            const buttonLabel =
              slot.myState === 'BOOKED'
                ? '예약 취소'
                : slot.myState === 'WAITLISTED'
                  ? `대기 ${slot.myWaitlistOrder ?? 1}번 취소`
                  : actionIntent === 'WAITLIST'
                    ? '대기 신청'
                    : status === 'CLOSED'
                      ? '마감됨'
                      : status === 'CANCELED'
                        ? '폐강'
                        : '예약하기';

            return (
              <article
                key={slot.id}
                aria-label={`${slot.startTime} ${slot.title}`}
                style={{
                  backgroundColor: 'var(--pf-color-bg-surface, #FFFEF9)',
                  border: '1px solid var(--pf-color-border-default, #D5DDD0)',
                  borderRadius: 16,
                  padding: 16,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                      <strong style={{ fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>
                        {slot.startTime} – {slot.endTime}
                      </strong>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 6,
                          backgroundColor: badge.bg,
                          color: badge.fg,
                          border: `1px solid ${badge.border}`,
                        }}
                      >
                        <span aria-hidden="true" style={{ marginRight: 4 }}>
                          {badge.icon}
                        </span>
                        {badge.labelKo}
                      </span>
                    </div>
                    <h3 style={{ margin: '8px 0 4px', fontSize: 17 }}>{slot.title}</h3>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--pf-color-text-secondary, #3D4F45)' }}>
                      {slot.locationAlias} · {slot.instructorAlias} · 기구: {slot.equipmentLabels.join(', ')} · 권장 레이어({slot.recommendedLayer})
                    </p>
                    <p
                      style={{
                        margin: '6px 0 0',
                        fontSize: 13,
                        color: 'var(--pf-color-text-muted, #526358)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      정원 {slot.currentEnrolled}/{slot.maxCapacity}명
                      {slot.waitlistCount > 0 ? ` · 대기 ${slot.waitlistCount}/${slot.maxWaitlist}명` : ''}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (actionIntent) {
                        handleOpenSlotAction(slot, actionIntent);
                      }
                    }}
                    aria-label={`${slot.startTime} ${slot.title} ${buttonLabel}`}
                    style={{
                      minHeight: 48,
                      minWidth: 96,
                      padding: '0 14px',
                      borderRadius: 9,
                      border: '1px solid var(--pf-color-action-primary, #173D34)',
                      backgroundColor: disabled
                        ? 'var(--pf-color-bg-surface-subtle, #F3F5EE)'
                        : 'var(--pf-color-action-primary, #173D34)',
                      color: disabled ? 'var(--pf-color-text-muted, #526358)' : '#FFFFFF',
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {buttonLabel}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {pendingDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pf-booking-confirm-heading"
          style={{
            marginTop: 16,
            backgroundColor: 'var(--pf-color-bg-surface, #FFFEF9)',
            border: '2px solid var(--pf-color-action-primary, #173D34)',
            borderRadius: 16,
            padding: 16,
          }}
        >
          <h4 id="pf-booking-confirm-heading" style={{ margin: '0 0 8px', fontSize: 17 }}>
            {pendingDialog.intent === 'BOOK'
              ? '수강권 차감 및 예약 확정 확인'
              : pendingDialog.intent === 'WAITLIST'
                ? '대기 신청 및 보류 차감 확인'
                : pendingDialog.intent === 'CANCEL_BOOKING'
                  ? '예약 취소 및 수강권 복구 확인'
                  : '대기 취소 및 보류 횟수 복구 확인'}
          </h4>
          <p
            style={{
              margin: '0 0 12px',
              fontSize: 13,
              lineHeight: 1.6,
              color: 'var(--pf-color-text-secondary, #3D4F45)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {pendingDialog.intent === 'BOOK' && (
              <>
                [{pendingDialog.slot.date} {pendingDialog.slot.startTime} {pendingDialog.slot.title}] 예약 시 수강권 1회가 차감됩니다 (차감 전{' '}
                <strong>{localPass.remainingCount}회</strong> → 차감 후{' '}
                <strong>{Math.max(0, localPass.remainingCount - 1)}회</strong>). 수업 시작 {pendingDialog.slot.freeCancelHoursBefore}시간 전 이후 취소 시에는 횟수가 복구되지 않습니다.
              </>
            )}
            {pendingDialog.intent === 'WAITLIST' && (
              <>
                [{pendingDialog.slot.date} {pendingDialog.slot.startTime} {pendingDialog.slot.title}] 대기{' '}
                <strong>{pendingDialog.slot.waitlistCount + 1}번</strong>으로 신청하며 수강권 1회가 보류 차감됩니다 (보류 전{' '}
                <strong>{localPass.remainingCount}회</strong> → 보류 후{' '}
                <strong>{Math.max(0, localPass.remainingCount - 1)}회</strong>). 미승급 또는 수업 전 대기 취소 시 100% 복구됩니다.
              </>
            )}
            {pendingDialog.intent === 'CANCEL_BOOKING' && (
              <>
                [{pendingDialog.slot.date} {pendingDialog.slot.startTime} {pendingDialog.slot.title}] 예약을 취소합니다. 무료 취소 마감({pendingDialog.slot.freeCancelHoursBefore}시간 전) 이내 취소 시 수강권 1회가 복구됩니다 (현재{' '}
                <strong>{localPass.remainingCount}회</strong> → 복구 후{' '}
                <strong>{Math.min(localPass.totalCount, localPass.remainingCount + 1)}회</strong>).
              </>
            )}
            {pendingDialog.intent === 'CANCEL_WAITLIST' && (
              <>
                [{pendingDialog.slot.date} {pendingDialog.slot.startTime} {pendingDialog.slot.title}] 대기 신청을 취소하고 보류된 수강권 1회를 즉시 복구합니다 (현재{' '}
                <strong>{localPass.remainingCount}회</strong> → 복구 후{' '}
                <strong>{Math.min(localPass.totalCount, localPass.remainingCount + 1)}회</strong>).
              </>
            )}
          </p>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              minHeight: 44,
              fontSize: 13,
              marginBottom: 12,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={policyAgreed}
              onChange={(e) => setPolicyAgreed(e.target.checked)}
              style={{ width: 18, height: 18 }}
            />
            <span>
              {pendingDialog.intent === 'BOOK'
                ? `1회 차감 및 무료 취소 마감 기한(${pendingDialog.slot.freeCancelHoursBefore}시간 전)을 확인했습니다.`
                : pendingDialog.intent === 'WAITLIST'
                  ? `대기 순번(${pendingDialog.slot.waitlistCount + 1}번) 및 자동 승급·복구 기준을 확인했습니다.`
                  : '취소 및 수강권 복구 안내를 확인했습니다.'}
            </span>
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              disabled={!policyAgreed || isSubmitting}
              onClick={handleConfirmAction}
              style={{
                flex: 1,
                minHeight: 48,
                borderRadius: 9,
                border: 'none',
                backgroundColor:
                  policyAgreed && !isSubmitting
                    ? 'var(--pf-color-action-primary, #173D34)'
                    : 'var(--pf-color-bg-surface-subtle, #F3F5EE)',
                color: policyAgreed && !isSubmitting ? '#FFFFFF' : 'var(--pf-color-text-muted, #526358)',
                fontWeight: 600,
                fontSize: 14,
                cursor: policyAgreed && !isSubmitting ? 'pointer' : 'not-allowed',
              }}
            >
              {pendingDialog.intent === 'BOOK'
                ? '1회 차감 동의 및 예약 확정'
                : pendingDialog.intent === 'WAITLIST'
                  ? '대기 신청 확정'
                  : pendingDialog.intent === 'CANCEL_BOOKING'
                    ? '예약 취소 확정'
                    : '대기 취소 확정'}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setPendingDialog(null)}
              style={{
                minHeight: 48,
                padding: '0 16px',
                borderRadius: 9,
                border: '1px solid var(--pf-color-border-default, #D5DDD0)',
                backgroundColor: 'var(--pf-color-bg-surface, #FFFEF9)',
                color: 'var(--pf-color-text-primary, #1E3129)',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
