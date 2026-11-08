import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InstructorScheduleView } from './InstructorScheduleView';
import { usePilatesStore } from '../store/usePilatesStore';
import { revisionSchedule } from '../test/datedRevisionFixtures';
const original = usePilatesStore.getState();
beforeEach(() => usePilatesStore.setState({ ...original, instructorSchedule: revisionSchedule(), generationError: null }, true));
afterEach(() => { cleanup(); usePilatesStore.setState(original, true); });

describe('schedule date strip and agenda hierarchy', () => {
  it('shows one week with scheduled counts and a single keyboard entry', () => {
    render(<InstructorScheduleView today="2026-11-04" />);
    const strip = within(screen.getByRole('group', { name: '한 주 날짜 선택' }));
    expect(strip.getAllByRole('button')).toHaveLength(7);
    expect(strip.getByRole('button', { name: '11월 2일 (월) 예정 1회' })).toBeVisible();
    expect(strip.getByRole('button', { name: '11월 4일 (수) 예정 0회' })).toHaveAttribute('aria-current', 'date');
    expect(document.querySelectorAll('.schedule-week-strip [tabindex="0"]')).toHaveLength(1);
  });
  it('changes days by keyboard across week and year boundaries without mutating records', () => {
    const before = usePilatesStore.getState();
    render(<InstructorScheduleView today="2026-12-31" />);
    let selected = screen.getByRole('button', { name: '12월 31일 (목) 예정 0회' });
    selected.focus();
    fireEvent.keyDown(selected, { key: 'ArrowRight' });
    selected = screen.getByRole('button', { name: '1월 1일 (금) 예정 0회' });
    expect(selected).toHaveFocus();
    expect(screen.getByLabelText('기준 날짜')).toHaveValue('2027-01-01');
    fireEvent.keyDown(selected, { key: 'End' });
    selected = screen.getByRole('button', { name: '1월 3일 (일) 예정 0회' });
    expect(selected).toHaveFocus();
    fireEvent.keyDown(selected, { key: 'ArrowRight' });
    expect(screen.getByRole('button', { name: '1월 4일 (월) 예정 0회' })).toHaveFocus();
    expect(document.querySelectorAll('.schedule-week-strip [tabindex="0"]')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: '오늘로' }));
    expect(screen.getByLabelText('기준 날짜')).toHaveValue('2026-12-31');
    const after = usePilatesStore.getState();
    expect(after.instructorSchedule).toBe(before.instructorSchedule);
    expect(after.savedSequences).toBe(before.savedSequences);
    expect(after.historyLogs).toBe(before.historyLogs);
    expect(after.activeSteps).toBe(before.activeSteps);
  });
  it('excludes cancelled classes from counts and displays the original duration', () => {
    const schedule = revisionSchedule();
    schedule.exceptions = [{ id: 'cancelled', kind: 'cancel', classId: 'class', originalDate: '2026-11-02', reason: '' }];
    usePilatesStore.setState({ instructorSchedule: schedule });
    render(<InstructorScheduleView today="2026-11-02" />);
    expect(screen.getByRole('button', { name: '11월 2일 (월) 예정 0회' })).toBeVisible();
    expect(screen.getByText('50분')).toBeVisible();
    expect(screen.getByText('취소', { selector: '.schedule-badge' })).toBeVisible();
  });
  it('opens a selected day from the week and pre-fills its empty-state add action', () => {
    render(<InstructorScheduleView today="2026-11-04" />);
    fireEvent.click(screen.getByRole('button', { name: '주간 보기' }));
    const date = screen.getByRole('button', { name: '11월 5일 (목) 예정 0회' });
    fireEvent.click(date);
    fireEvent.click(date);
    expect(screen.getByRole('button', { name: '일간 보기' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('기준 날짜')).toHaveValue('2026-11-05');
    fireEvent.click(screen.getByRole('button', { name: '이 날짜에 수업 추가' }));
    expect(within(screen.getByRole('dialog')).getByLabelText('시작 날짜')).toHaveValue('2026-11-05');
  });
  it.each(['1900-01-01', '2199-12-31'])('keeps date-strip keyboard navigation inside bounds at %s', (today) => {
    render(<InstructorScheduleView today={today} />);
    const selected = document.querySelector<HTMLButtonElement>('.schedule-week-strip [aria-pressed="true"]')!;
    selected.focus();
    fireEvent.keyDown(selected, { key: today.startsWith('1900') ? 'ArrowLeft' : 'ArrowRight' });
    expect(screen.getByLabelText('기준 날짜')).toHaveValue(today);
    expect(selected).toHaveFocus();
    expect(screen.getByRole('group', { name: '한 주 날짜 선택' })).toBeVisible();
  });
});
