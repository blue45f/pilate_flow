// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  PilatesScheduleAndMembershipSample,
  type MemberPassLedger,
  type PilatesMemberClassSlot,
} from './PilatesScheduleAndMembershipSample';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-12T08:00:00+09:00'));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const SAMPLE_PASS: MemberPassLedger = {
  passId: 'pass_ref_01',
  passTitle: '기구 필라테스 10회권',
  participantAlias: '소나무회원',
  remainingCount: 5,
  pendingReservedCount: 1,
  totalCount: 10,
  expiresAtIso: '2026-12-31',
};

const SAMPLE_SLOTS: readonly PilatesMemberClassSlot[] = [
  {
    id: 'slot_avail',
    classId: 'cls_01',
    date: '2026-11-12',
    startTime: '09:00',
    endTime: '09:50',
    title: '모닝 코어 리포머',
    locationAlias: '리포머 A룸',
    instructorAlias: '김서연 강사',
    equipmentLabels: ['리포머'],
    recommendedLayer: 'standard',
    occurrenceStatus: 'scheduled',
    currentEnrolled: 2,
    maxCapacity: 6,
    waitlistCount: 0,
    maxWaitlist: 2,
    freeCancelHoursBefore: 24,
    myState: 'NONE',
  },
  {
    id: 'slot_booked',
    classId: 'cls_02',
    date: '2026-11-12',
    startTime: '11:00',
    endTime: '11:50',
    title: '체형교정 캐딜락',
    locationAlias: '캐딜락 B룸',
    instructorAlias: '박지훈 강사',
    equipmentLabels: ['캐딜락'],
    recommendedLayer: 'easy',
    occurrenceStatus: 'scheduled',
    currentEnrolled: 2,
    maxCapacity: 2,
    waitlistCount: 0,
    maxWaitlist: 2,
    freeCancelHoursBefore: 24,
    myState: 'BOOKED',
  },
  {
    id: 'slot_waitlist',
    classId: 'cls_03',
    date: '2026-11-12',
    startTime: '19:00',
    endTime: '19:50',
    title: '이브닝 바렐 밸런스',
    locationAlias: '바렐 C룸',
    instructorAlias: '이하은 강사',
    equipmentLabels: ['바렐'],
    recommendedLayer: 'hard',
    occurrenceStatus: 'scheduled',
    currentEnrolled: 4,
    maxCapacity: 4,
    waitlistCount: 1,
    maxWaitlist: 3,
    freeCancelHoursBefore: 24,
    myState: 'NONE',
  },
];

/**
 * Simulates the HTML5 / W3C UI Events keyboard activation sequence in jsdom:
 * - Enter on <button>: keydown -> (if not defaultPrevented: native click) -> optional keydown(repeat) -> keyup
 * - Space (' ') on <button> / <input type="checkbox">: keydown -> optional keydown(repeat) -> keyup -> (if keyup not defaultPrevented: native click)
 * - Escape: keydown -> optional keydown(repeat) -> keyup
 * Note: This models the browser event contract deterministically inside jsdom; it is NOT a substitute for a real browser engine.
 */
function dispatchBrowserKeySequence(
  key: 'Enter' | ' ' | 'Escape',
  options?: { readonly repeatCount?: number },
): void {
  const repeatCount = options?.repeatCount ?? 0;
  const originTarget = (document.activeElement as HTMLElement | null) ?? document.body;

  const kdAllowed = fireEvent.keyDown(originTarget, { key, repeat: false });
  if (
    key === 'Enter' &&
    kdAllowed &&
    originTarget instanceof HTMLButtonElement &&
    !originTarget.disabled
  ) {
    fireEvent.click(originTarget);
  }

  for (let i = 0; i < repeatCount; i += 1) {
    const repeatTarget = (document.activeElement as HTMLElement | null) ?? document.body;
    const repeatAllowed = fireEvent.keyDown(repeatTarget, { key, repeat: true });
    if (
      key === 'Enter' &&
      repeatAllowed &&
      repeatTarget instanceof HTMLButtonElement &&
      !repeatTarget.disabled
    ) {
      fireEvent.click(repeatTarget);
    }
  }

  const releaseTarget = (document.activeElement as HTMLElement | null) ?? document.body;
  const kuAllowed = fireEvent.keyUp(releaseTarget, { key });
  if (key === ' ' && kuAllowed) {
    if (releaseTarget instanceof HTMLInputElement && releaseTarget.type === 'checkbox' && !releaseTarget.disabled) {
      fireEvent.click(releaseTarget);
    } else if (releaseTarget instanceof HTMLButtonElement && !releaseTarget.disabled && kdAllowed) {
      fireEvent.click(releaseTarget);
    } else if (
      releaseTarget instanceof HTMLButtonElement &&
      !releaseTarget.disabled &&
      releaseTarget !== originTarget
    ) {
      fireEvent.click(releaseTarget);
    }
  }
}

describe('PilatesScheduleAndMembershipSample reference UI regression suite', () => {
  it('opens booking confirmation for available slots and deducts 1 credit upon confirmation', () => {
    render(
      <PilatesScheduleAndMembershipSample
        pass={SAMPLE_PASS}
        slots={SAMPLE_SLOTS}
        selectedDate="2026-11-12"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '09:00 모닝 코어 리포머 예약하기' }));
    expect(screen.getByRole('heading', { name: '수강권 차감 및 예약 확정 확인' })).toBeTruthy();

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '1회 차감 동의 및 예약 확정' }));

    expect(screen.getByRole('status').textContent).toContain('수강권 1회가 차감되어 남은 횟수는 4회입니다');
  });

  it('routes cancel button on booked slots to cancellation refund confirmation rather than 1-credit deduction', () => {
    render(
      <PilatesScheduleAndMembershipSample
        pass={SAMPLE_PASS}
        slots={SAMPLE_SLOTS}
        selectedDate="2026-11-12"
      />,
    );

    // Even when slot currentEnrolled === maxCapacity (2/2), myState === BOOKED must remain cancellable
    const cancelBtn = screen.getByRole('button', { name: '11:00 체형교정 캐딜락 예약 취소' });
    expect((cancelBtn as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(cancelBtn);
    expect(screen.getByRole('heading', { name: '예약 취소 및 수강권 복구 확인' })).toBeTruthy();
    expect(screen.queryByText('1회 차감 동의 및 예약 확정')).toBeNull();

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '예약 취소 확정' }));

    expect(screen.getByRole('status').textContent).toContain('예약을 취소했습니다. 수강권 1회가 복구되어 현재 남은 횟수는 6회입니다');
  });

  it('routes waitlist button to waitlist confirmation and supports subsequent waitlist cancellation', () => {
    render(
      <PilatesScheduleAndMembershipSample
        pass={SAMPLE_PASS}
        slots={SAMPLE_SLOTS}
        selectedDate="2026-11-12"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '19:00 이브닝 바렐 밸런스 대기 신청' }));
    expect(screen.getByRole('heading', { name: '대기 신청 및 보류 차감 확인' })).toBeTruthy();

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '대기 신청 확정' }));

    expect(screen.getByRole('status').textContent).toContain('현재 대기 2번으로 접수했습니다');

    const cancelWaitBtn = screen.getByRole('button', { name: '19:00 이브닝 바렐 밸런스 대기 2번 취소' });
    fireEvent.click(cancelWaitBtn);
    expect(screen.getByRole('heading', { name: '대기 취소 및 보류 횟수 복구 확인' })).toBeTruthy();

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '대기 취소 확정' }));

    expect(screen.getByRole('status').textContent).toContain('대기 신청을 취소했습니다');
  });

  it('prevents duplicate credit deduction or duplicate refund on synchronous rapid consecutive clicks', () => {
    render(
      <PilatesScheduleAndMembershipSample
        pass={SAMPLE_PASS}
        slots={SAMPLE_SLOTS}
        selectedDate="2026-11-12"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '09:00 모닝 코어 리포머 예약하기' }));
    fireEvent.click(screen.getByRole('checkbox'));

    const confirmBookBtn = screen.getByRole('button', {
      name: '1회 차감 동의 및 예약 확정',
    }) as HTMLButtonElement;

    // Trigger 3 consecutive synchronous DOM clicks in the same batch before React commits unmount
    act(() => {
      confirmBookBtn.click();
      confirmBookBtn.click();
      confirmBookBtn.click();
    });

    const passSummary = screen.getByRole('article', { name: '내 수강권 현황' });
    expect(passSummary.textContent).toContain('남은 횟수: 4회 / 10회');
    expect(passSummary.textContent).toContain('예약 중 홀드: 2회');

    const morningSlot = screen.getByRole('article', { name: '09:00 모닝 코어 리포머' });
    expect(morningSlot.textContent).toContain('정원 3/6명');

    // Now test rapid consecutive clicks on cancellation refund for the same slot
    fireEvent.click(within(morningSlot).getByRole('button', { name: '09:00 모닝 코어 리포머 예약 취소' }));
    fireEvent.click(screen.getByRole('checkbox'));

    const confirmCancelBtn = screen.getByRole('button', {
      name: '예약 취소 확정',
    }) as HTMLButtonElement;

    act(() => {
      confirmCancelBtn.click();
      confirmCancelBtn.click();
      confirmCancelBtn.click();
    });

    expect(passSummary.textContent).toContain('남은 횟수: 5회 / 10회');
    expect(passSummary.textContent).toContain('예약 중 홀드: 1회');
    expect(morningSlot.textContent).toContain('정원 2/6명');
  });

  it('handles rapid repeated book-cancel-book cycles and immediate same-tick re-click after transition', () => {
    render(
      <PilatesScheduleAndMembershipSample
        pass={SAMPLE_PASS}
        slots={SAMPLE_SLOTS}
        selectedDate="2026-11-12"
      />,
    );

    const morningSlot = screen.getByRole('article', { name: '09:00 모닝 코어 리포머' });
    const slotActionBtn = within(morningSlot).getByRole('button') as HTMLButtonElement;

    // Cycle 1: Confirm BOOK and immediately click the same slot button in the exact same synchronous tick
    fireEvent.click(slotActionBtn);
    fireEvent.click(screen.getByRole('checkbox'));
    const confirmBookBtn = screen.getByRole('button', {
      name: '1회 차감 동의 및 예약 확정',
    }) as HTMLButtonElement;

    act(() => {
      confirmBookBtn.click();
      slotActionBtn.click();
    });

    // Must immediately open CANCEL_BOOKING (not stale BOOK) with unchecked agreement
    expect(screen.getByRole('heading', { name: '예약 취소 및 수강권 복구 확인' })).toBeTruthy();
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
    expect(
      (screen.getByRole('button', { name: '예약 취소 확정' }) as HTMLButtonElement).disabled,
    ).toBe(true);

    // Cycle 2: Confirm CANCEL_BOOKING and immediately re-click slot button in the same tick
    fireEvent.click(screen.getByRole('checkbox'));
    const confirmCancelBtn = screen.getByRole('button', {
      name: '예약 취소 확정',
    }) as HTMLButtonElement;

    act(() => {
      confirmCancelBtn.click();
      slotActionBtn.click();
    });

    expect(screen.getByRole('heading', { name: '수강권 차감 및 예약 확정 확인' })).toBeTruthy();
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);

    // Complete Cycle 3 BOOK and verify final balanced counts
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '1회 차감 동의 및 예약 확정' }));

    const passSummary = screen.getByRole('article', { name: '내 수강권 현황' });
    expect(passSummary.textContent).toContain('남은 횟수: 4회 / 10회');
    expect(passSummary.textContent).toContain('예약 중 홀드: 2회');
    expect(morningSlot.textContent).toContain('정원 3/6명');
  });

  it('tracks deduction, hold, and refund counts accurately across combined confirmed booking and waitlist flows', () => {
    const twoCreditPass: MemberPassLedger = {
      ...SAMPLE_PASS,
      remainingCount: 2,
      pendingReservedCount: 0,
    };
    const slotsWithLastWaitlistSpot: readonly PilatesMemberClassSlot[] = [
      SAMPLE_SLOTS[0],
      {
        ...SAMPLE_SLOTS[2],
        waitlistCount: 2,
        maxWaitlist: 3,
      },
    ];

    render(
      <PilatesScheduleAndMembershipSample
        pass={twoCreditPass}
        slots={slotsWithLastWaitlistSpot}
        selectedDate="2026-11-12"
      />,
    );

    const passSummary = screen.getByRole('article', { name: '내 수강권 현황' });

    // 1. Confirmed booking (-1 credit, +1 hold, +1 enrolled)
    fireEvent.click(screen.getByRole('button', { name: '09:00 모닝 코어 리포머 예약하기' }));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '1회 차감 동의 및 예약 확정' }));

    expect(passSummary.textContent).toContain('남은 횟수: 1회 / 10회');
    expect(passSummary.textContent).toContain('예약 중 홀드: 1회');

    // 2. Waitlist registration on last waitlist spot (-1 credit, +1 hold, +1 waitlist -> 3/3)
    fireEvent.click(screen.getByRole('button', { name: '19:00 이브닝 바렐 밸런스 대기 신청' }));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '대기 신청 확정' }));

    expect(passSummary.textContent).toContain('남은 횟수: 0회 / 10회');
    expect(passSummary.textContent).toContain('예약 중 홀드: 2회');
    expect(passSummary.textContent).toContain('✕ 잔여 횟수 없음');

    const eveningSlot = screen.getByRole('article', { name: '19:00 이브닝 바렐 밸런스' });
    expect(eveningSlot.textContent).toContain('정원 4/4명 · 대기 3/3명');

    // Even though waitlist is now full (3/3 -> CLOSED badge), the member's waitlist cancel remains active
    fireEvent.click(within(eveningSlot).getByRole('button', { name: '19:00 이브닝 바렐 밸런스 대기 3번 취소' }));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '대기 취소 확정' }));

    expect(passSummary.textContent).toContain('남은 횟수: 1회 / 10회');
    expect(passSummary.textContent).toContain('예약 중 홀드: 1회');
    expect(eveningSlot.textContent).toContain('정원 4/4명 · 대기 2/3명');

    // 3. Cancel confirmed booking (+1 credit, -1 hold, -1 enrolled) -> returns to initial ledger
    fireEvent.click(screen.getByRole('button', { name: '09:00 모닝 코어 리포머 예약 취소' }));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '예약 취소 확정' }));

    expect(passSummary.textContent).toContain('남은 횟수: 2회 / 10회');
    expect(passSummary.textContent).toContain('예약 중 홀드: 0회');
  });

  it('enforces zero remaining credits and inclusive/exclusive expiry boundaries while preserving cancellations', () => {
    const boundarySlots: readonly PilatesMemberClassSlot[] = [
      {
        ...SAMPLE_SLOTS[0],
        id: 'slot_expiry_day',
        date: '2026-12-31',
      },
      {
        ...SAMPLE_SLOTS[1],
        id: 'slot_booked_on_zero',
        date: '2026-12-31',
      },
      {
        ...SAMPLE_SLOTS[2],
        id: 'slot_after_expiry',
        date: '2027-01-01',
      },
    ];

    const zeroCreditPass: MemberPassLedger = {
      ...SAMPLE_PASS,
      remainingCount: 0,
      pendingReservedCount: 1,
      expiresAtIso: '2026-12-31',
    };

    const { rerender } = render(
      <PilatesScheduleAndMembershipSample
        pass={zeroCreditPass}
        slots={boundarySlots}
        selectedDate="2026-12-31"
      />,
    );

    // At 0 credits on exact expiry day: new booking is blocked, alert is shown
    fireEvent.click(screen.getByRole('button', { name: '09:00 모닝 코어 리포머 예약하기' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('alert').textContent).toContain('현재 수강권의 남은 횟수가 0회입니다');

    // Existing booked slot can still be cancelled, restoring remainingCount from 0 -> 1
    fireEvent.click(screen.getByRole('button', { name: '11:00 체형교정 캐딜락 예약 취소' }));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '예약 취소 확정' }));

    const passSummary = screen.getByRole('article', { name: '내 수강권 현황' });
    expect(passSummary.textContent).toContain('남은 횟수: 1회 / 10회');
    expect(passSummary.textContent).toContain('● 정상 이용 중');

    // Slot whose own class date ('2027-01-01') is after expiresAtIso ('2026-12-31') is blocked
    fireEvent.click(screen.getByRole('button', { name: '19:00 이브닝 바렐 밸런스 대기 신청' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('alert').textContent).toContain(
      '선택하신 수업 날짜(2027-01-01)가 수강권 만료일(2026-12-31) 이후입니다',
    );

    // Exact expiry day ('2026-12-31' === expiresAtIso) is inclusive and allows booking
    fireEvent.click(screen.getByRole('button', { name: '09:00 모닝 코어 리포머 예약하기' }));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '1회 차감 동의 및 예약 확정' }));
    expect(passSummary.textContent).toContain('남은 횟수: 0회 / 10회');

    // Switching selectedDate past expiry ('2027-01-01') marks pass expired for selectedDate
    rerender(
      <PilatesScheduleAndMembershipSample
        pass={zeroCreditPass}
        slots={boundarySlots}
        selectedDate="2027-01-01"
      />,
    );
    expect(passSummary.textContent).toContain('✕ 선택일 기준 만료');
  });

  it('clears stale dialog and agreement state when switching selected class, hitting blocked slots, or changing schedule props', () => {
    const zeroCreditPass: MemberPassLedger = {
      ...SAMPLE_PASS,
      remainingCount: 0,
      pendingReservedCount: 1,
    };

    const { rerender } = render(
      <PilatesScheduleAndMembershipSample
        pass={SAMPLE_PASS}
        slots={SAMPLE_SLOTS}
        selectedDate="2026-11-12"
      />,
    );

    // 1. Open dialog for 09:00 class and check agreement
    fireEvent.click(screen.getByRole('button', { name: '09:00 모닝 코어 리포머 예약하기' }));
    fireEvent.click(screen.getByRole('checkbox'));
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true);

    // 2. Switch directly to 19:00 waitlist class without closing -> must update target and reset checkbox
    fireEvent.click(screen.getByRole('button', { name: '19:00 이브닝 바렐 밸런스 대기 신청' }));
    const switchedDialog = screen.getByRole('dialog');
    expect(switchedDialog.textContent).toContain('19:00 이브닝 바렐 밸런스');
    expect((within(switchedDialog).getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
    expect(
      (within(switchedDialog).getByRole('button', { name: '대기 신청 확정' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    // 3. With 0 remaining credits, open valid CANCEL_BOOKING dialog, arm checkbox, then click blocked BOOK slot
    rerender(
      <PilatesScheduleAndMembershipSample
        pass={zeroCreditPass}
        slots={SAMPLE_SLOTS}
        selectedDate="2026-11-12"
      />,
    );
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '11:00 체형교정 캐딜락 예약 취소' }));
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('dialog').textContent).toContain('11:00 체형교정 캐딜락');

    // Clicking blocked 09:00 BOOK slot must close the armed 11:00 dialog rather than leaving it open
    fireEvent.click(screen.getByRole('button', { name: '09:00 모닝 코어 리포머 예약하기' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('alert').textContent).toContain('현재 수강권의 남은 횟수가 0회입니다');

    // 4. Re-open 11:00 cancel dialog, arm checkbox, then transition to offline -> dialog must close
    fireEvent.click(screen.getByRole('button', { name: '11:00 체형교정 캐딜락 예약 취소' }));
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('dialog')).toBeTruthy();

    rerender(
      <PilatesScheduleAndMembershipSample
        pass={zeroCreditPass}
        slots={SAMPLE_SLOTS}
        selectedDate="2026-11-12"
        isOffline={true}
      />,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('인터넷 연결이 끊어져');
  });

  it('exposes modal dialog role, accessible names/descriptions, and moves initial focus inside upon open', () => {
    render(
      <PilatesScheduleAndMembershipSample
        pass={SAMPLE_PASS}
        slots={SAMPLE_SLOTS}
        selectedDate="2026-11-12"
      />,
    );

    const bookBtn = screen.getByRole('button', { name: '09:00 모닝 코어 리포머 예약하기' });
    bookBtn.focus();
    fireEvent.click(bookBtn);

    const bookDialog = screen.getByRole('dialog', { name: '수강권 차감 및 예약 확정 확인' });
    expect(bookDialog.getAttribute('aria-modal')).toBe('true');
    const describedById = bookDialog.getAttribute('aria-describedby');
    expect(describedById).toBeTruthy();
    expect(document.getElementById(describedById!)?.textContent).toContain('09:00 모닝 코어 리포머');
    expect(document.activeElement).toBe(within(bookDialog).getByRole('checkbox'));

    // Switching directly to a cancel slot updates dialog accessible name and focuses the new dialog checkbox
    fireEvent.click(screen.getByRole('button', { name: '11:00 체형교정 캐딜락 예약 취소' }));
    const cancelDialog = screen.getByRole('dialog', { name: '예약 취소 및 수강권 복구 확인' });
    expect(document.activeElement).toBe(within(cancelDialog).getByRole('checkbox'));
  });

  it('traps Tab and Shift+Tab focus within the open modal dialog across unchecked and checked states', () => {
    render(
      <PilatesScheduleAndMembershipSample
        pass={SAMPLE_PASS}
        slots={SAMPLE_SLOTS}
        selectedDate="2026-11-12"
      />,
    );

    const outsideSlotBtn = screen.getByRole('button', { name: '19:00 이브닝 바렐 밸런스 대기 신청' });
    fireEvent.click(screen.getByRole('button', { name: '09:00 모닝 코어 리포머 예약하기' }));

    const dialog = screen.getByRole('dialog', { name: '수강권 차감 및 예약 확정 확인' });
    const checkbox = within(dialog).getByRole('checkbox');
    const closeBtn = within(dialog).getByRole('button', { name: '닫기' });

    // Unchecked state: enabled controls are [checkbox, closeBtn] (confirm CTA is disabled)
    expect(document.activeElement).toBe(checkbox);

    // Shift+Tab from first control wraps to last control (closeBtn)
    const backwardWrap = fireEvent.keyDown(checkbox, { key: 'Tab', shiftKey: true });
    expect(backwardWrap).toBe(false);
    expect(document.activeElement).toBe(closeBtn);

    // Tab from last control wraps back to first control (checkbox)
    const forwardWrap = fireEvent.keyDown(closeBtn, { key: 'Tab', shiftKey: false });
    expect(forwardWrap).toBe(false);
    expect(document.activeElement).toBe(checkbox);

    // If focus escapes outside dialog, Tab pulls focus back to first control inside dialog
    outsideSlotBtn.focus();
    expect(document.activeElement).toBe(outsideSlotBtn);
    fireEvent.keyDown(outsideSlotBtn, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(checkbox);

    // Checked state: confirm CTA becomes enabled [checkbox, confirmBtn, closeBtn]
    fireEvent.click(checkbox);
    const confirmBtn = within(dialog).getByRole('button', { name: '1회 차감 동의 및 예약 확정' });
    expect((confirmBtn as HTMLButtonElement).disabled).toBe(false);

    closeBtn.focus();
    fireEvent.keyDown(closeBtn, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(checkbox);

    fireEvent.keyDown(checkbox, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(closeBtn);
  });

  it('treats Escape and Close button equivalently, restores focus to the trigger, and resets stale consent on reopen', () => {
    render(
      <PilatesScheduleAndMembershipSample
        pass={SAMPLE_PASS}
        slots={SAMPLE_SLOTS}
        selectedDate="2026-11-12"
      />,
    );

    const bookTrigger = screen.getByRole('button', { name: '09:00 모닝 코어 리포머 예약하기' });
    bookTrigger.focus();
    fireEvent.click(bookTrigger);

    // Arm consent checkbox, then dismiss via Escape
    const firstCheckbox = screen.getByRole('checkbox') as HTMLInputElement;
    fireEvent.click(firstCheckbox);
    expect(firstCheckbox.checked).toBe(true);

    const escapeAllowed = fireEvent.keyDown(firstCheckbox, { key: 'Escape' });
    expect(escapeAllowed).toBe(false);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(bookTrigger);

    const passSummary = screen.getByRole('article', { name: '내 수강권 현황' });
    expect(passSummary.textContent).toContain('남은 횟수: 5회 / 10회');
    expect(passSummary.textContent).toContain('예약 중 홀드: 1회');

    // Reopen same slot -> no stale checked consent may remain
    fireEvent.click(bookTrigger);
    const reopenedCheckbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(reopenedCheckbox.checked).toBe(false);
    expect(
      (screen.getByRole('button', { name: '1회 차감 동의 및 예약 확정' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    // Arm consent again, then dismiss via Close button -> equivalent behavior & focus restoration
    fireEvent.click(reopenedCheckbox);
    expect(reopenedCheckbox.checked).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(bookTrigger);
    expect(passSummary.textContent).toContain('남은 횟수: 5회 / 10회');

    // Also verify cancel flow trigger restoration and reopen reset via keyboard Enter on Close button
    const cancelTrigger = screen.getByRole('button', { name: '11:00 체형교정 캐딜락 예약 취소' });
    cancelTrigger.focus();
    fireEvent.click(cancelTrigger);
    fireEvent.click(screen.getByRole('checkbox'));

    const closeBtn = screen.getByRole('button', { name: '닫기' });
    closeBtn.focus();
    fireEvent.keyDown(closeBtn, { key: 'Enter' });

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(cancelTrigger);

    fireEvent.click(cancelTrigger);
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
  });

  it('activates booking and waitlist CTAs via keyboard while preventing disabled bypass and preserving duplicate-submit defense', () => {
    const slotsWithClosedAndCanceled: readonly PilatesMemberClassSlot[] = [
      ...SAMPLE_SLOTS,
      {
        ...SAMPLE_SLOTS[0],
        id: 'slot_closed_full',
        startTime: '14:00',
        endTime: '14:50',
        title: '정원마감 체어',
        currentEnrolled: 4,
        maxCapacity: 4,
        waitlistCount: 2,
        maxWaitlist: 2,
        myState: 'NONE',
      },
      {
        ...SAMPLE_SLOTS[0],
        id: 'slot_canceled_cls',
        startTime: '16:00',
        endTime: '16:50',
        title: '폐강 바렐',
        occurrenceStatus: 'cancelled',
        myState: 'NONE',
      },
    ];

    render(
      <PilatesScheduleAndMembershipSample
        pass={SAMPLE_PASS}
        slots={slotsWithClosedAndCanceled}
        selectedDate="2026-11-12"
      />,
    );

    // 1. Disabled slot CTAs (CLOSED / CANCELED) cannot be bypassed via Enter, Space, or DOM disabled removal
    const closedBtn = screen.getByRole('button', { name: '14:00 정원마감 체어 마감됨' }) as HTMLButtonElement;
    const canceledBtn = screen.getByRole('button', { name: '16:00 폐강 바렐 폐강' }) as HTMLButtonElement;
    expect(closedBtn.disabled).toBe(true);
    expect(canceledBtn.disabled).toBe(true);

    fireEvent.keyDown(closedBtn, { key: 'Enter' });
    fireEvent.keyDown(canceledBtn, { key: ' ' });
    closedBtn.disabled = false;
    fireEvent.click(closedBtn);
    expect(screen.queryByRole('dialog')).toBeNull();

    // 2. Enabled booking CTA opens via keyboard Enter
    const bookBtn = screen.getByRole('button', { name: '09:00 모닝 코어 리포머 예약하기' });
    bookBtn.focus();
    fireEvent.keyDown(bookBtn, { key: 'Enter' });

    const bookDialog = screen.getByRole('dialog', { name: '수강권 차감 및 예약 확정 확인' });
    const confirmBookBtn = within(bookDialog).getByRole('button', {
      name: '1회 차감 동의 및 예약 확정',
    }) as HTMLButtonElement;

    // 3. Disabled confirm CTA (before consent) cannot be bypassed via Enter, Space, or DOM disabled tampering
    expect(confirmBookBtn.disabled).toBe(true);
    fireEvent.keyDown(confirmBookBtn, { key: 'Enter' });
    fireEvent.keyDown(confirmBookBtn, { key: ' ' });
    confirmBookBtn.disabled = false;
    fireEvent.click(confirmBookBtn);
    expect(screen.queryByRole('dialog')).toBe(bookDialog);

    const passSummary = screen.getByRole('article', { name: '내 수강권 현황' });
    expect(passSummary.textContent).toContain('남은 횟수: 5회 / 10회');

    // 4. After checking consent, rapid keyboard Enter + Space + click in one batch deducts only 1 credit and returns focus
    fireEvent.click(within(bookDialog).getByRole('checkbox'));
    expect(confirmBookBtn.disabled).toBe(false);

    act(() => {
      fireEvent.keyDown(confirmBookBtn, { key: 'Enter' });
      fireEvent.keyDown(confirmBookBtn, { key: ' ' });
      confirmBookBtn.click();
    });

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(passSummary.textContent).toContain('남은 횟수: 4회 / 10회');
    expect(passSummary.textContent).toContain('예약 중 홀드: 2회');

    const updatedMorningBtn = screen.getByRole('button', {
      name: '09:00 모닝 코어 리포머 예약 취소',
    });
    expect(document.activeElement).toBe(updatedMorningBtn);

    // 5. Enabled waitlist CTA opens via keyboard Space and confirms via keyboard Space
    const waitlistBtn = screen.getByRole('button', { name: '19:00 이브닝 바렐 밸런스 대기 신청' });
    waitlistBtn.focus();
    fireEvent.keyDown(waitlistBtn, { key: ' ' });

    const waitlistDialog = screen.getByRole('dialog', { name: '대기 신청 및 보류 차감 확인' });
    fireEvent.click(within(waitlistDialog).getByRole('checkbox'));
    const confirmWaitlistBtn = within(waitlistDialog).getByRole('button', {
      name: '대기 신청 확정',
    });
    fireEvent.keyDown(confirmWaitlistBtn, { key: ' ' });

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(passSummary.textContent).toContain('남은 횟수: 3회 / 10회');
    expect(passSummary.textContent).toContain('예약 중 홀드: 3회');
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: '19:00 이브닝 바렐 밸런스 대기 2번 취소' }),
    );
  });

  it('guards full Enter/Space keydown->repeat->keyup->click sequences against involuntary consent toggle, duplicate deduction, or post-confirm reopen', () => {
    render(
      <PilatesScheduleAndMembershipSample
        pass={SAMPLE_PASS}
        slots={SAMPLE_SLOTS}
        selectedDate="2026-11-12"
      />,
    );

    const passSummary = screen.getByRole('article', { name: '내 수강권 현황' });
    const bookBtn = screen.getByRole('button', { name: '09:00 모닝 코어 리포머 예약하기' });
    bookBtn.focus();

    // 1. Open dialog via Space with key-repeat + keyup landing on the newly focused checkbox:
    //    consent checkbox must NOT auto-toggle on the opening Space key release!
    dispatchBrowserKeySequence(' ', { repeatCount: 3 });

    const bookDialog = screen.getByRole('dialog', { name: '수강권 차감 및 예약 확정 확인' });
    const checkbox = within(bookDialog).getByRole('checkbox') as HTMLInputElement;
    expect(document.activeElement).toBe(checkbox);
    expect(checkbox.checked).toBe(false);
    expect(
      (within(bookDialog).getByRole('button', { name: '1회 차감 동의 및 예약 확정' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    // 2. Now press Space directly on checkbox -> toggles consent to true via normal keyup click
    dispatchBrowserKeySequence(' ', { repeatCount: 2 });
    expect(checkbox.checked).toBe(true);

    // 3. Confirm booking via Enter with key-repeat + keyup landing on restored trigger button:
    //    must deduct 1 credit once (5 -> 4), close modal, keep focus on trigger, and NOT reopen cancel dialog!
    const confirmBookBtn = within(bookDialog).getByRole('button', {
      name: '1회 차감 동의 및 예약 확정',
    });
    confirmBookBtn.focus();
    dispatchBrowserKeySequence('Enter', { repeatCount: 3 });

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(passSummary.textContent).toContain('남은 횟수: 4회 / 10회');
    expect(passSummary.textContent).toContain('예약 중 홀드: 2회');

    const cancelMorningBtn = screen.getByRole('button', {
      name: '09:00 모닝 코어 리포머 예약 취소',
    });
    expect(document.activeElement).toBe(cancelMorningBtn);

    // 4. Open cancel dialog via Enter sequence, consent via Space sequence, confirm via Space sequence + repeat:
    //    must refund 1 credit once (4 -> 5) and NOT re-open booking dialog on Space release!
    dispatchBrowserKeySequence('Enter', { repeatCount: 2 });
    const cancelDialog = screen.getByRole('dialog', { name: '예약 취소 및 수강권 복구 확인' });
    expect((within(cancelDialog).getByRole('checkbox') as HTMLInputElement).checked).toBe(false);

    dispatchBrowserKeySequence(' ');
    const confirmCancelBtn = within(cancelDialog).getByRole('button', { name: '예약 취소 확정' });
    confirmCancelBtn.focus();
    dispatchBrowserKeySequence(' ', { repeatCount: 3 });

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(passSummary.textContent).toContain('남은 횟수: 5회 / 10회');
    expect(passSummary.textContent).toContain('예약 중 홀드: 1회');
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: '09:00 모닝 코어 리포머 예약하기' }),
    );
  });

  it('prevents trailing keyup right after Close or Escape dismissal from reopening the modal across open-close-reopen cycles', () => {
    render(
      <PilatesScheduleAndMembershipSample
        pass={SAMPLE_PASS}
        slots={SAMPLE_SLOTS}
        selectedDate="2026-11-12"
      />,
    );

    const bookTrigger = screen.getByRole('button', { name: '09:00 모닝 코어 리포머 예약하기' });
    bookTrigger.focus();

    // Cycle 1: Open via Enter -> check consent -> dismiss via Space on Close button (with repeat + keyup on restored trigger)
    dispatchBrowserKeySequence('Enter');
    const dialog1 = screen.getByRole('dialog', { name: '수강권 차감 및 예약 확정 확인' });
    dispatchBrowserKeySequence(' ');
    expect((within(dialog1).getByRole('checkbox') as HTMLInputElement).checked).toBe(true);

    const closeBtn1 = within(dialog1).getByRole('button', { name: '닫기' });
    closeBtn1.focus();
    dispatchBrowserKeySequence(' ', { repeatCount: 2 });

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(bookTrigger);

    // Cycle 2: Re-open directly from restored trigger via Space -> consent reset -> dismiss via Escape (with repeat + keyup)
    dispatchBrowserKeySequence(' ');
    const dialog2 = screen.getByRole('dialog', { name: '수강권 차감 및 예약 확정 확인' });
    const checkbox2 = within(dialog2).getByRole('checkbox') as HTMLInputElement;
    expect(checkbox2.checked).toBe(false);

    dispatchBrowserKeySequence(' ');
    expect(checkbox2.checked).toBe(true);

    dispatchBrowserKeySequence('Escape', { repeatCount: 2 });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(bookTrigger);

    // Cycle 3: Re-open via Enter -> dismiss via Enter on Close button (with repeat + keyup) -> focus remains on trigger
    dispatchBrowserKeySequence('Enter');
    const dialog3 = screen.getByRole('dialog', { name: '수강권 차감 및 예약 확정 확인' });
    expect((within(dialog3).getByRole('checkbox') as HTMLInputElement).checked).toBe(false);

    const closeBtn3 = within(dialog3).getByRole('button', { name: '닫기' });
    closeBtn3.focus();
    dispatchBrowserKeySequence('Enter', { repeatCount: 2 });

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(bookTrigger);
  });

  it('blocks background CTA keyboard activation, removes background tab stops, and shields background slots while modal is open', () => {
    render(
      <PilatesScheduleAndMembershipSample
        pass={SAMPLE_PASS}
        slots={SAMPLE_SLOTS}
        selectedDate="2026-11-12"
      />,
    );

    const bookBtn = screen.getByRole('button', { name: '09:00 모닝 코어 리포머 예약하기' });
    const cancelBtn = screen.getByRole('button', { name: '11:00 체형교정 캐딜락 예약 취소' });
    const waitlistBtn = screen.getByRole('button', { name: '19:00 이브닝 바렐 밸런스 대기 신청' });
    const slotList = screen.getByTestId('pilates-slot-list');

    expect(bookBtn.getAttribute('tabindex')).toBeNull();
    expect(slotList.style.pointerEvents).toBe('');

    bookBtn.focus();
    dispatchBrowserKeySequence('Enter');

    const dialog = screen.getByRole('dialog', { name: '수강권 차감 및 예약 확정 확인' });
    const backdrop = screen.getByTestId('pilates-modal-backdrop');
    const checkbox = within(dialog).getByRole('checkbox');

    // Background slot list disables pointer-events and all background slot CTAs drop out of tab order
    expect(backdrop.style.position).toBe('fixed');
    expect(slotList.style.pointerEvents).toBe('none');
    expect(bookBtn.getAttribute('tabindex')).toBe('-1');
    expect(cancelBtn.getAttribute('tabindex')).toBe('-1');
    expect(waitlistBtn.getAttribute('tabindex')).toBe('-1');

    // If focus is forced onto a background CTA, Enter and Space must NOT switch/activate it and must return focus to dialog
    waitlistBtn.focus();
    expect(document.activeElement).toBe(waitlistBtn);
    dispatchBrowserKeySequence('Enter');
    expect(screen.getByRole('dialog', { name: '수강권 차감 및 예약 확정 확인' })).toBe(dialog);
    expect(document.activeElement).toBe(checkbox);

    cancelBtn.focus();
    dispatchBrowserKeySequence(' ');
    expect(screen.getByRole('dialog', { name: '수강권 차감 및 예약 확정 확인' })).toBe(dialog);
    expect(document.activeElement).toBe(checkbox);
    expect((checkbox as HTMLInputElement).checked).toBe(false);

    // Clicking empty backdrop neither drops focus outside dialog nor triggers background CTAs
    const mousedownAllowed = fireEvent.mouseDown(backdrop);
    expect(mousedownAllowed).toBe(false);
    fireEvent.click(backdrop);
    expect(document.activeElement).toBe(checkbox);

    // Clicking dialog container whitespace and pressing Tab moves cleanly to first dialog control
    dialog.focus();
    expect(document.activeElement).toBe(dialog);
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(checkbox);

    // Closing modal restores normal background tab stops and pointer-events
    dispatchBrowserKeySequence('Escape');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(slotList.style.pointerEvents).toBe('');
    expect(bookBtn.getAttribute('tabindex')).toBeNull();
    expect(cancelBtn.getAttribute('tabindex')).toBeNull();
    expect(waitlistBtn.getAttribute('tabindex')).toBeNull();
    expect(document.activeElement).toBe(bookBtn);
  });

  it('maintains unique dialog IDs and isolated focus/Escape ownership across two sample instances on the same screen', () => {
    const passA: MemberPassLedger = {
      ...SAMPLE_PASS,
      passId: 'pass_inst_a',
      participantAlias: '오전회원A',
      remainingCount: 5,
    };
    const passB: MemberPassLedger = {
      ...SAMPLE_PASS,
      passId: 'pass_inst_b',
      participantAlias: '오후회원B',
      remainingCount: 3,
    };

    // Mount via two separate render() roots on the same document to verify cross-root ID uniqueness as well
    const viewA = render(
      <div data-testid="sample-instance-a">
        <PilatesScheduleAndMembershipSample
          pass={passA}
          slots={SAMPLE_SLOTS}
          selectedDate="2026-11-12"
        />
      </div>,
    );
    const viewB = render(
      <div data-testid="sample-instance-b">
        <PilatesScheduleAndMembershipSample
          pass={passB}
          slots={SAMPLE_SLOTS}
          selectedDate="2026-11-12"
        />
      </div>,
    );

    const scopeA = within(viewA.getByTestId('sample-instance-a'));
    const scopeB = within(viewB.getByTestId('sample-instance-b'));

    const bookBtnA = scopeA.getByRole('button', { name: '09:00 모닝 코어 리포머 예약하기' });
    const bookBtnB = scopeB.getByRole('button', { name: '09:00 모닝 코어 리포머 예약하기' });

    // 1. Open Instance A modal -> Instance B background CTAs also become non-tabbable & pointer-shielded
    bookBtnA.focus();
    dispatchBrowserKeySequence('Enter');

    const dialogA = scopeA.getByRole('dialog', { name: '수강권 차감 및 예약 확정 확인' });
    const checkboxA = within(dialogA).getByRole('checkbox');
    expect(document.activeElement).toBe(checkboxA);
    expect(bookBtnB.getAttribute('tabindex')).toBe('-1');
    expect(scopeB.getByTestId('pilates-slot-list').style.pointerEvents).toBe('none');

    // Keyboard Enter/Space on Instance B button while Instance A modal is open is blocked and returns focus to Instance A modal
    bookBtnB.focus();
    dispatchBrowserKeySequence('Enter');
    expect(scopeB.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(checkboxA);

    // 2. If Instance B dialog is also opened programmatically, both dialogs have unique IDs and Instance B owns top-level focus/Escape
    fireEvent.click(bookBtnB);
    const dialogB = scopeB.getByRole('dialog', { name: '수강권 차감 및 예약 확정 확인' });
    const checkboxB = within(dialogB).getByRole('checkbox');
    const closeBtnB = within(dialogB).getByRole('button', { name: '닫기' });

    const titleIdA = dialogA.getAttribute('aria-labelledby')!;
    const titleIdB = dialogB.getAttribute('aria-labelledby')!;
    const descIdA = dialogA.getAttribute('aria-describedby')!;
    const descIdB = dialogB.getAttribute('aria-describedby')!;

    expect(titleIdA).not.toBe(titleIdB);
    expect(descIdA).not.toBe(descIdB);
    expect(document.querySelectorAll(`[id="${titleIdA}"]`).length).toBe(1);
    expect(document.querySelectorAll(`[id="${titleIdB}"]`).length).toBe(1);
    expect(document.querySelectorAll(`[id="${descIdA}"]`).length).toBe(1);
    expect(document.querySelectorAll(`[id="${descIdB}"]`).length).toBe(1);

    // Tab / Shift+Tab inside Instance B must stay inside Instance B (Instance A must NOT steal focus)
    expect(document.activeElement).toBe(checkboxB);
    fireEvent.keyDown(checkboxB, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(closeBtnB);
    fireEvent.keyDown(closeBtnB, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(checkboxB);

    // Escape dismisses ONLY topmost Instance B dialog and restores focus to Instance B's trigger
    dispatchBrowserKeySequence('Escape');
    expect(scopeB.queryByRole('dialog')).toBeNull();
    expect(scopeA.queryByRole('dialog')).toBe(dialogA);
    expect(document.activeElement).toBe(bookBtnB);

    // Subsequent Tab returns focus into remaining open Instance A dialog, and Escape closes Instance A -> bookBtnA
    fireEvent.keyDown(bookBtnB, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(checkboxA);

    dispatchBrowserKeySequence('Escape');
    expect(scopeA.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(bookBtnA);
    expect(bookBtnB.getAttribute('tabindex')).toBeNull();
    expect(scopeB.getByTestId('pilates-slot-list').style.pointerEvents).toBe('');
  });
});
