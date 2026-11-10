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
});
