import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePilatesStore } from '../store/usePilatesStore';
import type { InstructorScheduledClass } from '../types/instructorSchedule';
import { addScheduleDays, localScheduleDate } from '../utils/instructorSchedule';
import { MEMBER_BOOKING_STORAGE_KEY } from '../utils/memberBookingBridge';
import { MemberBookingView } from './MemberBookingView';

const original = usePilatesStore.getState();

function makeClass(
  id: string,
  daysFromToday: number,
  locationId = 'mat-room',
): InstructorScheduledClass {
  return {
    id,
    title: `${id} 코어 정렬`,
    participantAlias: '오후반',
    locationId,
    startDate: addScheduleDays(localScheduleDate(), daysFromToday),
    startTime: '18:00',
    endTime: '18:50',
    recurrence: 'once',
    weekdays: [],
    notes: '',
  };
}

beforeEach(() => {
  window.localStorage.removeItem(MEMBER_BOOKING_STORAGE_KEY);
  usePilatesStore.setState({
    ...original,
    instructorSchedule: {
      locations: [
        { id: 'mat-room', alias: '매트룸', equipmentIds: ['mat'], propIds: [], notes: '' },
        { id: 'chair-room', alias: '체어룸', equipmentIds: ['chair'], propIds: [], notes: '' },
      ],
      classes: [],
      exceptions: [],
    },
  });
});

afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
  window.localStorage.removeItem(MEMBER_BOOKING_STORAGE_KEY);
  vi.useRealTimers();
});

describe('member schedule discovery', () => {
  it('crosses week boundaries with all filters intact and skips cancelled, closed, and moved dates', () => {
    const tomorrowChair = makeClass('chair-class', 1, 'chair-room');
    const cancelled = makeClass('cancelled-class', 2);
    const closed = makeClass('closed-class', 3);
    const moved = makeClass('moved-class', 4);
    const targetDate = addScheduleDays(localScheduleDate(), 9);
    usePilatesStore.setState({
      instructorSchedule: {
        ...usePilatesStore.getState().instructorSchedule,
        classes: [tomorrowChair, cancelled, closed, moved],
        exceptions: [
          {
            id: 'cancel',
            kind: 'cancel',
            classId: cancelled.id,
            originalDate: cancelled.startDate,
            reason: '취소',
          },
          {
            id: 'close',
            kind: 'closed',
            date: closed.startDate,
            locationId: 'mat-room',
            reason: '휴무',
          },
          {
            id: 'move',
            kind: 'reschedule',
            classId: moved.id,
            originalDate: moved.startDate,
            date: targetDate,
            startTime: '18:00',
            endTime: '18:50',
            reason: '일정 변경',
          },
        ],
      },
    });
    const before = usePilatesStore.getState();

    render(<MemberBookingView />);
    fireEvent.click(screen.getByRole('button', { name: '매트' }));
    fireEvent.click(screen.getByRole('button', { name: '코어·골반 정렬' }));
    fireEvent.click(screen.getByRole('button', { name: '예약 가능만 보기' }));

    const nextDay = screen.getByTestId('jump-next-class-day-btn');
    expect(nextDay).toHaveTextContent(targetDate.slice(5).replace('-', '/'));
    fireEvent.click(nextDay);

    expect(screen.getByTestId('member-quick-status-strip')).toHaveTextContent(targetDate);
    expect(screen.getByRole('button', { name: '매트' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: '코어·골반 정렬' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: '예약 가능만 보기' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      screen.getByRole('button', { name: 'moved-class 코어 정렬 예약하기' }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('member-empty-slots-card')).not.toBeInTheDocument();
    expect(usePilatesStore.getState()).toBe(before);
    expect(window.localStorage.getItem(MEMBER_BOOKING_STORAGE_KEY)).toBeNull();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('states the four-week search limit without inventing a next class date, and keeps filter reset available', () => {
    usePilatesStore.setState({
      instructorSchedule: {
        ...usePilatesStore.getState().instructorSchedule,
        classes: [makeClass('beyond-search-window', 35)],
      },
    });
    const before = usePilatesStore.getState();
    render(<MemberBookingView />);
    fireEvent.click(screen.getByRole('button', { name: '바렐' }));

    expect(screen.getByTestId('member-empty-slots-card')).toHaveTextContent(
      '다음 4주에 현재 조건에 맞는 수업이 없어요',
    );
    expect(screen.queryByTestId('jump-next-class-day-btn')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('reset-member-filters-btn'));
    expect(screen.getByRole('button', { name: '전체 기구' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('member-quick-status-strip')).toHaveTextContent(localScheduleDate());
    expect(screen.getByRole('button', { name: '다음 주 보기' })).toBeEnabled();
    expect(usePilatesStore.getState()).toBe(before);
  });

  it('respects availability-only discovery and identifies the local booking demonstration before any action', () => {
    const before = usePilatesStore.getState();
    render(<MemberBookingView />);
    expect(screen.getByTestId('member-booking-storage-notice')).toHaveTextContent(
      '수강권과 잔여 좌석은 예시',
    );
    expect(screen.getByTestId('member-booking-storage-notice')).toHaveTextContent(
      '예약·취소는 이 기기에만 기록',
    );

    fireEvent.click(screen.getByRole('button', { name: '캐딜락' }));
    fireEvent.click(screen.getByRole('button', { name: '예약 가능만 보기' }));
    expect(screen.queryByTestId('jump-next-class-day-btn')).not.toBeInTheDocument();
    expect(screen.getByTestId('member-empty-slots-card')).toHaveTextContent('다음 4주');
    fireEvent.click(screen.getByRole('button', { name: '예약 가능만 보기' }));
    expect(
      screen.getByRole('button', { name: '캐딜락 전신 협응 & 스트레치 대기 신청' }),
    ).toBeInTheDocument();
    expect(usePilatesStore.getState()).toBe(before);
    expect(window.localStorage.getItem(MEMBER_BOOKING_STORAGE_KEY)).toBeNull();
  });

  it('opens the last supported calendar week without generating dates outside the valid range', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2199, 11, 20, 12));
    usePilatesStore.setState({
      instructorSchedule: {
        ...usePilatesStore.getState().instructorSchedule,
        classes: [makeClass('last-date-class', 11)],
      },
    });
    render(<MemberBookingView />);
    fireEvent.click(screen.getByTestId('jump-next-class-day-btn'));

    expect(screen.getByTestId('member-quick-status-strip')).toHaveTextContent('2199-12-31');
    expect(screen.getByRole('button', { name: 'last-date-class 코어 정렬 예약하기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다음 주 보기' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '이전 주 보기' })).toBeEnabled();
    expect(screen.getByRole('group', { name: '요일별 날짜 선택' })).not.toHaveTextContent('01/01');
    expect(screen.getByRole('region', { name: '주간 수업 날짜 선택' })).not.toHaveTextContent('undefined');
  });
});
