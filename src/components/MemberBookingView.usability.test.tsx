import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { usePilatesStore } from '../store/usePilatesStore';
import { addScheduleDays, localScheduleDate } from '../utils/instructorSchedule';
import {
  MEMBER_BOOKING_STORAGE_KEY,
  type PersistedMemberBookingState,
} from '../utils/memberBookingBridge';
import { MemberBookingView } from './MemberBookingView';

describe('MemberBookingView usability improvements (discovery, quick-spot, change-spot, direct cancel, keyboard & mobile)', () => {
  const initialSchedule = structuredClone(usePilatesStore.getState().instructorSchedule);

  beforeEach(() => {
    window.localStorage.removeItem(MEMBER_BOOKING_STORAGE_KEY);
    usePilatesStore.setState({
      instructorSchedule: {
        ...structuredClone(initialSchedule),
        classes: [],
        exceptions: [],
      },
    });
  });

  afterEach(() => {
    cleanup();
    window.localStorage.removeItem(MEMBER_BOOKING_STORAGE_KEY);
    usePilatesStore.setState({
      instructorSchedule: structuredClone(initialSchedule),
    });
  });

  it('shows per-apparatus class counts and recovers from zero-result filters in one tap', () => {
    render(<MemberBookingView />);

    const barrelChip = screen.getByRole('button', { name: '바렐' });
    fireEvent.click(barrelChip);
    expect(barrelChip).toHaveAttribute('aria-pressed', 'true');

    const emptyCard = screen.getByTestId('member-empty-slots-card');
    expect(emptyCard).toHaveTextContent('선택한 기구·예약 가능 필터에 맞는 수업이 없어요');

    const resetBtn = screen.getByTestId('reset-member-filters-btn');
    fireEvent.click(resetBtn);

    expect(screen.getByRole('button', { name: '전체 기구' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      screen.getByRole('button', { name: '리포머 호흡 & 골반 정렬 예약하기' }),
    ).toBeInTheDocument();
  });

  it('preselects an open spot directly from the slot card, supports Escape cancel recovery, and navigates open spots via arrow keys', async () => {
    const todayIso = localScheduleDate();
    const slotId = `sample-slot-${todayIso}-am-reformer`;

    render(<MemberBookingView />);

    const previewGroup = screen.getByTestId(`open-spots-preview-${slotId}`);
    expect(previewGroup).toBeInTheDocument();
    // computeStudioSpotStates for baseEnrolled=3 occupies indices [2, 0, 5] (R3, R1, R6); open spots are R2, R4, R5
    expect(screen.queryByTestId(`quick-spot-${slotId}-R6`)).toBeNull();

    // Tap R5 directly on the slot card so the sheet opens with R5 preselected and roving tabIndex=0
    const quickSpotR5 = screen.getByTestId(`quick-spot-${slotId}-R5`);
    fireEvent.click(quickSpotR5);

    const spotMap = await screen.findByTestId('member-spot-map');
    const spotR2 = within(spotMap).getByTestId('spot-btn-R2');
    const spotR4 = within(spotMap).getByTestId('spot-btn-R4');
    const spotR5 = within(spotMap).getByTestId('spot-btn-R5');
    const spotR6 = within(spotMap).getByTestId('spot-btn-R6');

    expect(spotR6).toBeDisabled();
    expect(spotR5).toHaveAttribute('aria-pressed', 'true');
    expect(spotR5).toHaveAttribute('tabindex', '0');
    expect(spotR2).toHaveAttribute('tabindex', '-1');
    expect(screen.getByTestId('member-booking-summary')).toHaveTextContent(
      '리포머 R5번 (중앙 뒷열)',
    );
    expect(screen.getByTestId('member-booking-summary')).toHaveTextContent('무료 취소 마감:');

    // Keyboard navigation skips occupied spots (R1, R3, R6) and moves strictly across open spots (R2, R4, R5)
    spotR5.focus();
    fireEvent.keyDown(spotR5, { key: 'ArrowLeft' });
    expect(spotR4).toHaveAttribute('aria-pressed', 'true');
    expect(document.activeElement).toBe(spotR4);
    expect(screen.getByTestId('member-booking-summary')).toHaveTextContent(
      '리포머 R4번 (창가 뒷열)',
    );

    fireEvent.keyDown(spotR4, { key: 'ArrowRight' });
    expect(spotR5).toHaveAttribute('aria-pressed', 'true');
    expect(document.activeElement).toBe(spotR5);

    // ArrowRight from last open spot R5 skips occupied R6 and R1, wrapping to first open spot R2
    fireEvent.keyDown(spotR5, { key: 'ArrowRight' });
    expect(spotR2).toHaveAttribute('aria-pressed', 'true');
    expect(document.activeElement).toBe(spotR2);
    expect(screen.getByTestId('member-booking-summary')).toHaveTextContent(
      '리포머 R2번 (중앙 앞열)',
    );

    fireEvent.keyDown(spotR2, { key: 'End' });
    expect(spotR5).toHaveAttribute('aria-pressed', 'true');
    expect(document.activeElement).toBe(spotR5);

    fireEvent.keyDown(spotR5, { key: 'Home' });
    expect(spotR2).toHaveAttribute('aria-pressed', 'true');
    expect(document.activeElement).toBe(spotR2);

    // Pressing Escape (native cancel event) dismisses without deducting pass credits
    const dialog = spotMap.closest('dialog')!;
    fireEvent(dialog, new Event('cancel', { cancelable: true }));

    await waitFor(() => {
      expect(screen.queryByTestId('member-spot-map')).toBeNull();
    });
    expect(screen.getByTestId('member-pass-metrics')).toHaveTextContent('7 / 20회');
  });

  it('guards rapid double-clicks, changes booked spot with zero pass deduction while preserving updatedAt, and cancels directly from my-bookings strip across dates', async () => {
    const todayIso = localScheduleDate();
    const slotId = `sample-slot-${todayIso}-am-reformer`;

    render(<MemberBookingView activeSection="bookings" />);

    // Empty state is rendered when activeSection="bookings" has 0 reservations
    expect(screen.getByTestId('member-my-bookings-empty')).toBeInTheDocument();

    // Book Reformer slot at R2 and fire rapid double-click on confirm
    fireEvent.click(screen.getByTestId(`quick-spot-${slotId}-R2`));
    const confirmBtn = await screen.findByTestId('confirm-member-booking-btn');
    fireEvent.click(confirmBtn);
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByTestId('member-pass-metrics')).toHaveTextContent('6 / 20회');
      expect(screen.getByTestId('member-pass-metrics')).toHaveTextContent('예약 확정: 1건');
    });

    const persistedAfterBook = JSON.parse(
      window.localStorage.getItem(MEMBER_BOOKING_STORAGE_KEY) ?? '{}',
    ) as PersistedMemberBookingState;
    expect(persistedAfterBook.slotDecisions[slotId]?.spotId).toBe('R2');
    const originalUpdatedAt = persistedAfterBook.slotDecisions[slotId]?.updatedAt;
    expect(originalUpdatedAt).toBeTruthy();

    // Switch calendar to next week so today's slot is off-screen, then change spot directly from my-bookings strip
    fireEvent.click(screen.getByRole('button', { name: '다음 주 보기' }));

    const myBookingChangeSpotBtn = screen.getByTestId(`my-booking-change-spot-${slotId}`);
    fireEvent.click(myBookingChangeSpotBtn);

    const changeMap = await screen.findByTestId('member-spot-map');
    expect(within(changeMap).getByTestId('spot-btn-R2')).toBeDisabled();
    expect(within(changeMap).getByTestId('spot-btn-R6')).toBeDisabled();
    expect(within(changeMap).getByTestId('spot-btn-R4')).toHaveAttribute('aria-pressed', 'true');

    // Explicitly pick open spot R5 (overriding default R4) and confirm preservation of user selection
    const targetR5 = within(changeMap).getByTestId('spot-btn-R5');
    expect(targetR5).not.toBeDisabled();
    fireEvent.click(targetR5);
    expect(targetR5).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('member-change-spot-summary')).toHaveTextContent(
      '리포머 R5번 (중앙 뒷열)',
    );

    const confirmChangeBtn = screen.getByTestId('confirm-member-booking-btn');
    expect(confirmChangeBtn).toHaveTextContent('선택한 자리로 변경 확정');
    fireEvent.click(confirmChangeBtn);

    await waitFor(() => {
      expect(screen.getByTestId('member-booking-feedback')).toHaveTextContent(
        'R2번 → R5(중앙 뒷열)번으로 변경했습니다',
      );
    });
    expect(screen.getByTestId('member-pass-metrics')).toHaveTextContent('6 / 20회');

    const persistedAfterSpotChange = JSON.parse(
      window.localStorage.getItem(MEMBER_BOOKING_STORAGE_KEY) ?? '{}',
    ) as PersistedMemberBookingState;
    expect(persistedAfterSpotChange.slotDecisions[slotId]?.spotId).toBe('R5');
    expect(persistedAfterSpotChange.slotDecisions[slotId]?.updatedAt).toBe(originalUpdatedAt);

    // Cancel directly from my-bookings strip without switching back to today's date
    const directCancelBtn = screen.getByTestId(`my-booking-cancel-${slotId}`);
    fireEvent.click(directCancelBtn);
    const confirmCancelBtn = await screen.findByTestId('confirm-member-booking-btn');
    fireEvent.click(confirmCancelBtn);

    await waitFor(() => {
      expect(screen.getByTestId('member-pass-metrics')).toHaveTextContent('7 / 20회');
      expect(screen.getByTestId('member-pass-metrics')).toHaveTextContent('예약 확정: 0건');
    });
  });

  it('blocks duplicate booking on the same date and start time with a clear Korean conflict alert', async () => {
    const tomorrowIso = addScheduleDays(localScheduleDate(), 1);
    window.localStorage.setItem(
      MEMBER_BOOKING_STORAGE_KEY,
      JSON.stringify({
        pass: {
          passId: 'pass-group-20',
          passTitle: '6:1 기구 필라테스 20회권',
          participantAlias: '저녁A-04 (별칭)',
          remainingCount: 5,
          pendingReservedCount: 1,
          totalCount: 20,
          expiresAtIso: addScheduleDays(tomorrowIso, 30),
        },
        slotDecisions: {
          'other-parallel-room-slot': {
            state: 'BOOKED',
            spotId: 'C1',
            slotTitle: 'B룸 체어 동시간 수업',
            slotDate: tomorrowIso,
            slotTime: '10:00',
            updatedAt: new Date().toISOString(),
          },
        },
      }),
    );

    render(<MemberBookingView />);

    // Select tomorrow on the week strip or jump via my-bookings strip
    fireEvent.click(screen.getByRole('button', { name: '해당 날짜 보기' }));

    const duplicateTimeBookBtn = screen.getByRole('button', {
      name: '리포머 호흡 & 골반 정렬 예약하기',
    });
    fireEvent.click(duplicateTimeBookBtn);

    expect(await screen.findByTestId('member-booking-error')).toHaveTextContent(
      "이미 예약한 수업('B룸 체어 동시간 수업')이 있습니다",
    );
    expect(screen.queryByTestId('member-spot-map')).toBeNull();
  });

  it('maintains >= 44px / 48px touch targets, mobile responsive layout rules, and prefers-reduced-motion in member-booking.css', () => {
    const cssText = readFileSync(
      resolve(process.cwd(), 'src/styles/member-booking.css'),
      'utf8',
    );
    expect(cssText).toContain('.pf-member-quick-spot-btn');
    expect(cssText).toContain('min-height: 44px;');
    expect(cssText).toContain('min-height: 48px;');
    expect(cssText).toContain('@media (max-width: 767px)');
    expect(cssText).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
