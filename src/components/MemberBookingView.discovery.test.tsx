import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RECOVERY_STORAGE_KEY } from '../lib/recoveryStorageGuard';
import { usePilatesStore } from '../store/usePilatesStore';
import type { InstructorScheduledClass } from '../types/instructorSchedule';
import { addScheduleDays, localScheduleDate } from '../utils/instructorSchedule';
import { MEMBER_BOOKING_STORAGE_KEY, readPersistedMemberBookingState } from '../utils/memberBookingBridge';
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
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 26, 8));
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
    fireEvent.click(screen.getByRole('button', { name: '코어·바른 자세' }));
    fireEvent.click(screen.getByRole('button', { name: '예약 가능만 보기' }));

    const nextDay = screen.getByTestId('jump-next-class-day-btn');
    expect(nextDay).toHaveTextContent(targetDate.slice(5).replace('-', '/'));
    fireEvent.click(nextDay);

    expect(screen.getByTestId('member-quick-status-strip')).toHaveTextContent(targetDate);
    expect(screen.getByRole('button', { name: '매트' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: '코어·바른 자세' })).toHaveAttribute(
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


describe('회원 예약 확정 시 수업 및 수강권 재검증', () => {
  function selectSampleBooking() {
    render(<MemberBookingView />);
    fireEvent.click(screen.getByRole('button', { name: '리포머 호흡 & 골반 정렬 예약하기' }));
  }

  it('예약 시간 일부가 겹치는 수업을 안내하고 종료 시각에 바로 시작하는 다음 수업을 허용한다', () => {
    const booked = makeClass('첫 수업', 0);
    const overlap = { ...makeClass('겹치는 수업', 0), startTime: '18:30', endTime: '19:20' };
    const following = { ...makeClass('다음 수업', 0), startTime: '18:50', endTime: '19:40' };
    usePilatesStore.setState({
      instructorSchedule: { ...usePilatesStore.getState().instructorSchedule, classes: [booked, overlap, following] },
    });
    render(<MemberBookingView />);
    fireEvent.click(screen.getByRole('button', { name: '첫 수업 코어 정렬 예약하기' }));
    fireEvent.click(screen.getByRole('button', { name: '차감 동의 후 예약 확정' }));
    fireEvent.click(screen.getByRole('button', { name: '겹치는 수업 코어 정렬 예약하기' }));
    expect(screen.getByRole('alert')).toHaveTextContent('첫 수업 코어 정렬');
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '다음 수업 코어 정렬 예약하기' }));
    fireEvent.click(screen.getByRole('button', { name: '차감 동의 후 예약 확정' }));
    expect(readPersistedMemberBookingState(localScheduleDate()).pass.remainingCount).toBe(5);
  });

  it('자리 확인 중 수업이 시작되면 예약을 확정하지 않고 예약 가능 목록에서도 제외한다', () => {
    vi.setSystemTime(new Date(2026, 10, 26, 9, 59));
    selectSampleBooking();
    vi.setSystemTime(new Date(2026, 10, 26, 10));
    fireEvent(document, new Event('visibilitychange'));
    fireEvent.click(screen.getByRole('button', { name: '차감 동의 후 예약 확정' }));
    expect(screen.getByRole('button', { name: '리포머 호흡 & 골반 정렬 접수 종료' })).toBeDisabled();
    expect(screen.getByText('수업 진행 중')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '예약 가능만 보기' }));
    expect(screen.queryByRole('heading', { name: '리포머 호흡 & 골반 정렬' })).toBeNull();
    expect(window.localStorage.getItem(MEMBER_BOOKING_STORAGE_KEY)).toBeNull();
  });

  it('확인창에서 삭제된 회차에는 수강권을 쓰지 않는다', () => {
    const selectedClass = makeClass('매트 저녁반', 0);
    const schedule = usePilatesStore.getState().instructorSchedule;
    usePilatesStore.setState({ instructorSchedule: { ...schedule, classes: [selectedClass] } });
    render(<MemberBookingView />);
    fireEvent.click(screen.getByRole('button', { name: '매트 저녁반 코어 정렬 예약하기' }));
    act(() => usePilatesStore.setState({ instructorSchedule: schedule }));
    fireEvent.click(screen.getByRole('button', { name: '차감 동의 후 예약 확정' }));

    expect(screen.getByRole('alert')).toHaveTextContent('최신 수업 일정');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTestId('member-pass-metrics')).toHaveTextContent('7 / 20회');
    expect(window.localStorage.getItem(MEMBER_BOOKING_STORAGE_KEY)).toBeNull();
  });

  it.each(['예약', '자리 변경'] as const)('다른 탭이 폐강한 회차의 %s을 확정하지 않고 필터와 최신 강사 자료를 보존한다', (action) => {
    const lesson = makeClass('저녁반', 0);
    const schedule = { ...usePilatesStore.getState().instructorSchedule, classes: [lesson] };
    usePilatesStore.setState({ instructorSchedule: schedule });
    render(<MemberBookingView />);
    fireEvent.click(screen.getByRole('button', { name: '매트' }));
    fireEvent.click(screen.getByRole('button', { name: '저녁반 코어 정렬 예약하기' }));
    if (action === '자리 변경') {
      fireEvent.click(screen.getByRole('button', { name: '차감 동의 후 예약 확정' }));
      fireEvent.click(screen.getByRole('button', { name: '저녁반 코어 정렬 기구 자리 변경' }));
    }

    const beforeWallet = localStorage.getItem(MEMBER_BOOKING_STORAGE_KEY);
    const envelope = JSON.parse(localStorage.getItem(RECOVERY_STORAGE_KEY)!);
    envelope.state.instructorSchedule.exceptions = [{
      id: 'cancel-lesson', kind: 'cancel', classId: lesson.id, originalDate: lesson.startDate, reason: '휴강',
    }];
    const saved = JSON.stringify(envelope);
    localStorage.setItem(RECOVERY_STORAGE_KEY, saved);
    // storage 이벤트가 도착하기 전에 확정해도 디스크의 폐강 기록이 우선한다.
    fireEvent.click(screen.getByTestId('confirm-member-booking-btn'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent('수업 상태가 변경');
    expect(localStorage.getItem(MEMBER_BOOKING_STORAGE_KEY)).toBe(beforeWallet);
    expect(screen.getByRole('button', { name: '매트' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByText(/폐강/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: '다음 주 보기' }));
    expect(localStorage.getItem(RECOVERY_STORAGE_KEY)).toBe(saved);
    expect(usePilatesStore.getState().instructorSchedule).toBe(schedule);
  });

  it('열어 둔 예시 대기 신청에서 강사가 새 시간표를 발행하면 최신 수업만 보여 준다', () => {
    render(<MemberBookingView />);
    fireEvent.click(screen.getByRole('button', { name: '캐딜락 전신 협응 & 스트레치 대기 신청' }));
    const envelope = JSON.parse(localStorage.getItem(RECOVERY_STORAGE_KEY)!);
    envelope.state.instructorSchedule.classes = [makeClass('실제 매트반', 0)];
    const saved = JSON.stringify(envelope);
    localStorage.setItem(RECOVERY_STORAGE_KEY, saved);
    fireEvent(window, new StorageEvent('storage', {
      key: RECOVERY_STORAGE_KEY, newValue: saved, storageArea: window.localStorage,
    }));
    expect(screen.getByRole('heading', { name: '실제 매트반 코어 정렬' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '대기 신청 확정' }));
    expect(screen.getByRole('alert')).toHaveTextContent('시간표가 변경');
    expect(localStorage.getItem(MEMBER_BOOKING_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(RECOVERY_STORAGE_KEY)).toBe(saved);
  });

  it('저장 실패 후 확인창에서 같은 자리로 다시 확정할 수 있고 1회만 차감한다', () => {
    selectSampleBooking();
    fireEvent.click(screen.getByTestId('spot-btn-R5'));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('저장 공간 부족', 'QuotaExceededError');
    });
    try {
      const confirm = screen.getByRole('button', { name: '차감 동의 후 예약 확정' });
      fireEvent.click(confirm);
      expect(screen.getByRole('alert')).toHaveTextContent('이 기기에 저장하지 못했습니다');
      expect(screen.getByTestId('spot-btn-R5')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('member-pass-metrics')).toHaveTextContent('7 / 20회');
      expect(window.localStorage.getItem(MEMBER_BOOKING_STORAGE_KEY)).toBeNull();
      fireEvent.click(confirm);
      const persisted = readPersistedMemberBookingState(localScheduleDate());
      expect(persisted.pass.remainingCount).toBe(6);
      expect(Object.values(persisted.slotDecisions)).toMatchObject([{ state: 'BOOKED', spotId: 'R5' }]);
      expect(screen.queryByRole('dialog')).toBeNull();
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('확인창을 연 뒤 다른 탭에서 갱신한 수강권을 덮어쓰지 않는다', () => {
    selectSampleBooking();
    const originalPass = readPersistedMemberBookingState(localScheduleDate()).pass;
    const otherTabState = JSON.stringify({
      pass: { ...originalPass, remainingCount: 0 },
      slotDecisions: {},
    });
    window.localStorage.setItem(MEMBER_BOOKING_STORAGE_KEY, otherTabState);
    fireEvent.click(screen.getByRole('button', { name: '차감 동의 후 예약 확정' }));
    expect(screen.getByRole('alert')).toHaveTextContent('예약 내역이 변경');
    expect(screen.getByTestId('member-pass-metrics')).toHaveTextContent('0 / 20회');
    expect(window.localStorage.getItem(MEMBER_BOOKING_STORAGE_KEY)).toBe(otherTabState);
  });

  it('취소 확인 중 실수 복구 시간이 끝나면 미복원 동의를 다시 받는다', () => {
    const bookedAt = new Date(2026, 10, 26, 9).getTime();
    vi.setSystemTime(bookedAt);
    selectSampleBooking();
    fireEvent.click(screen.getByRole('button', { name: '차감 동의 후 예약 확정' }));
    fireEvent.click(screen.getByRole('button', { name: '리포머 호흡 & 골반 정렬 예약 취소' }));
    const confirm = screen.getByRole('button', { name: '예약 취소 확정' });
    vi.setSystemTime(bookedAt + 5 * 60_000);
    fireEvent.click(confirm);

    expect(screen.getByRole('button', { name: '위약 차감 동의 후 취소 확정' })).toBeDisabled();
    expect(readPersistedMemberBookingState(localScheduleDate()).pass.pendingReservedCount).toBe(1);
    fireEvent.click(screen.getByRole('checkbox', { name: /횟수 미복원/ }));
    fireEvent.click(screen.getByRole('button', { name: '위약 차감 동의 후 취소 확정' }));
    const final = readPersistedMemberBookingState(localScheduleDate());
    expect(final.slotDecisions).toEqual({});
    expect(final.pass.remainingCount).toBe(6);
  });
});
