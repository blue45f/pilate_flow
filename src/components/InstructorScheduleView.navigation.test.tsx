import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InstructorScheduleView } from './InstructorScheduleView';
import { usePilatesStore } from '../store/usePilatesStore';
import { revisionSchedule } from '../test/datedRevisionFixtures';
const original = usePilatesStore.getState();
beforeEach(() => usePilatesStore.setState({ ...original, instructorSchedule: revisionSchedule() }, true));
afterEach(() => { cleanup(); usePilatesStore.setState(original, true); });

describe('schedule period navigation', () => {
  it('opens a day from the week with heading focus and unchanged user records', () => {
    const before = usePilatesStore.getState();
    render(<InstructorScheduleView today="2026-11-04" />);
    fireEvent.click(screen.getByRole('button', { name: '주간 보기' }));
    fireEvent.click(screen.getByRole('button', { name: '11월 6일 (금) 일간 보기' }));
    expect(screen.getByLabelText('기준 날짜')).toHaveValue('2026-11-06');
    expect(screen.getByRole('heading', { name: '11월 6일 (금)' })).toHaveFocus();
    expect(screen.getByRole('button', { name: '일간 보기' })).toHaveAttribute('aria-pressed', 'true');
    const after = usePilatesStore.getState();
    expect(after.instructorSchedule).toBe(before.instructorSchedule);
    expect(after.historyLogs).toBe(before.historyLogs);
    expect(after.savedSequences).toBe(before.savedSequences);
    expect(after.activeSteps).toBe(before.activeSteps);
    fireEvent.click(screen.getByRole('button', { name: '주간 보기' }));
    expect(screen.getByLabelText('기준 날짜')).toHaveValue('2026-11-06');
  });
  it.each(['1900-01-01', '2199-12-31'])('disables navigation outside the supported date range at %s', (today) => {
    render(<InstructorScheduleView today={today} />);
    const blocked = today.startsWith('1900') ? '이전 기간' : '다음 기간';
    expect(screen.getByRole('button', { name: blocked })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '주간 보기' }));
    expect(screen.getByRole('button', { name: blocked })).toBeDisabled();
    expect(screen.getByLabelText('기준 날짜')).toHaveValue(today);
  });
});
