// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  PilatesScheduleAndMembershipSample,
  type MemberPassLedger,
  type PilatesMemberClassSlot,
} from './PilatesScheduleAndMembershipSample';

afterEach(() => {
  cleanup();
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
});
