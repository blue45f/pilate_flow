import { openScheduleManagementAction } from '../test/scheduleManagementActions';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InstructorScheduleView } from './InstructorScheduleView';
import { usePilatesStore } from '../store/usePilatesStore';
import { revisionSchedule } from '../test/datedRevisionFixtures';
const original = usePilatesStore.getState();
beforeEach(() =>
  usePilatesStore.setState(
    { ...original, instructorSchedule: revisionSchedule(), generationError: null },
    true,
  ),
);
afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
});

describe('schedule date strip and agenda hierarchy', () => {
  it('keeps administration and automation collapsed and returns keyboard focus from management', () => {
    render(<InstructorScheduleView today="2026-11-04" />);
    const management = screen.getByText('일정 관리', { selector: 'summary' });
    const location = screen.getByRole('button', { name: '장소 관리' });
    expect(location).not.toBeVisible();
    expect(screen.getByTestId('schedule-advanced-planning')).not.toHaveAttribute('open');
    fireEvent.click(management);
    expect(location).toBeVisible();
    location.focus();
    fireEvent.keyDown(location, { key: 'Escape' });
    expect(location).not.toBeVisible();
    expect(management).toHaveFocus();
  });

  it('prepares the earliest rescheduled occurrence without replacing the current draft', () => {
    const schedule = revisionSchedule();
    schedule.exceptions = [
      {
        id: 'move-next',
        kind: 'reschedule',
        classId: 'class',
        originalDate: '2026-11-09',
        date: '2026-11-05',
        startTime: '13:00',
        endTime: '13:50',
        locationId: 'other-place',
        reason: '',
      },
    ];
    usePilatesStore.setState({ instructorSchedule: schedule });
    const before = usePilatesStore.getState();
    render(<InstructorScheduleView today="2026-11-04" />);
    const next = within(screen.getByTestId('schedule-next-class'));
    expect(next.getByRole('heading', { name: '오후 1:00 · 직접 작성 수업' })).toBeVisible();
    expect(next.getByText(/11월 5일.*다른 장소/)).toBeVisible();
    fireEvent.click(next.getByRole('button', { name: '이 수업 준비하기' }));
    const dialog = within(screen.getByRole('dialog', { name: '주·월 시퀀스 계획' }));
    expect(dialog.getByLabelText('계획 기준 날짜')).toHaveValue('2026-11-05');
    expect(dialog.getByRole('region', { name: '선택한 회차 계획' })).toHaveTextContent(
      '직접 작성 수업',
    );
    const after = usePilatesStore.getState();
    expect(after.activeSteps).toBe(before.activeSteps);
    expect(after.activeTitle).toBe(before.activeTitle);
    expect(after.savedSequences).toBe(before.savedSequences);
    expect(after.instructorSchedule).toBe(before.instructorSchedule);
  });

  it('shows one week with scheduled counts and a single keyboard entry', () => {
    render(<InstructorScheduleView today="2026-11-04" />);
    const strip = within(screen.getByRole('group', { name: '한 주 날짜 선택' }));
    expect(strip.getAllByRole('button')).toHaveLength(7);
    expect(strip.getByRole('button', { name: '11월 2일 (월) 예정 1회' })).toBeVisible();
    expect(strip.getByRole('button', { name: '11월 4일 (수) 예정 0회' })).toHaveAttribute(
      'aria-current',
      'date',
    );
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
    schedule.exceptions = [
      { id: 'cancelled', kind: 'cancel', classId: 'class', originalDate: '2026-11-02', reason: '' },
    ];
    usePilatesStore.setState({ instructorSchedule: schedule });
    render(<InstructorScheduleView today="2026-11-02" />);
    expect(screen.getByRole('button', { name: '11월 2일 (월) 예정 0회' })).toBeVisible();
    expect(screen.getByText('50분')).toBeVisible();
    expect(screen.getByText('취소', { selector: '.schedule-badge' })).toBeVisible();
    expect(screen.getByTestId('schedule-next-class')).toHaveTextContent('11월 9일');
  });
  it('opens a selected day from the week and pre-fills its empty-state add action', () => {
    render(<InstructorScheduleView today="2026-11-04" />);
    fireEvent.click(screen.getByRole('button', { name: '주간 보기' }));
    const date = screen.getByRole('button', { name: '11월 5일 (목) 예정 0회' });
    fireEvent.click(date);
    fireEvent.click(date);
    expect(screen.getByRole('button', { name: '일간 보기' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByLabelText('기준 날짜')).toHaveValue('2026-11-05');
    fireEvent.click(screen.getByRole('button', { name: '이 날짜에 수업 추가' }));
    expect(within(screen.getByRole('dialog')).getByLabelText('시작 날짜')).toHaveValue(
      '2026-11-05',
    );
  });
  it.each(['1900-01-01', '2199-12-31'])(
    'keeps date-strip keyboard navigation inside bounds at %s',
    (today) => {
      render(<InstructorScheduleView today={today} />);
      const selected = document.querySelector<HTMLButtonElement>(
        '.schedule-week-strip [aria-pressed="true"]',
      )!;
      selected.focus();
      fireEvent.keyDown(selected, { key: today.startsWith('1900') ? 'ArrowLeft' : 'ArrowRight' });
      expect(screen.getByLabelText('기준 날짜')).toHaveValue(today);
      expect(selected).toHaveFocus();
      expect(screen.getByRole('group', { name: '한 주 날짜 선택' })).toBeVisible();
    },
  );

  it('rejects duplicate location aliases when adding a new location', () => {
    render(<InstructorScheduleView today="2026-11-04" />);
    const initialLocationsCount = usePilatesStore.getState().instructorSchedule.locations.length;
    const existingAlias = usePilatesStore.getState().instructorSchedule.locations[0].alias;

    openScheduleManagementAction('장소 관리');
    const dialog = screen.getByRole('dialog');
    const aliasInput = within(dialog).getByLabelText('장소 별칭');
    fireEvent.change(aliasInput, { target: { value: `  ${existingAlias.toUpperCase()}  ` } });
    fireEvent.click(within(dialog).getByRole('button', { name: '장소 저장' }));

    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      '이미 등록된 장소 별칭입니다. 기존 장소를 선택해 수정해 주세요.',
    );
    expect(usePilatesStore.getState().instructorSchedule.locations).toHaveLength(
      initialLocationsCount,
    );
  });

  it('supports keyboard ArrowRight/ArrowLeft/Home/End navigation on the schedule view toggle group', () => {
    render(<InstructorScheduleView today="2026-11-04" />);
    const viewToggle = screen.getByRole('group', { name: '일정 보기' });
    const dayBtn = within(viewToggle).getByRole('button', { name: '일간 보기' });
    const weekBtn = within(viewToggle).getByRole('button', { name: '주간 보기' });

    expect(dayBtn).toHaveAttribute('aria-pressed', 'true');
    dayBtn.focus();

    fireEvent.keyDown(dayBtn, { key: 'ArrowRight' });
    expect(weekBtn).toHaveAttribute('aria-pressed', 'true');
    expect(weekBtn).toHaveFocus();

    fireEvent.keyDown(weekBtn, { key: 'ArrowLeft' });
    expect(dayBtn).toHaveAttribute('aria-pressed', 'true');
    expect(dayBtn).toHaveFocus();

    fireEvent.keyDown(dayBtn, { key: 'End' });
    expect(weekBtn).toHaveAttribute('aria-pressed', 'true');
    expect(weekBtn).toHaveFocus();

    fireEvent.keyDown(weekBtn, { key: 'Home' });
    expect(dayBtn).toHaveAttribute('aria-pressed', 'true');
    expect(dayBtn).toHaveFocus();
  });

  it('guards rapid double-submits in saveClosed so duplicate exceptions are not appended in the same tick', () => {
    render(<InstructorScheduleView today="2026-11-04" />);
    const initialExceptionsCount = usePilatesStore.getState().instructorSchedule.exceptions.length;

    openScheduleManagementAction('휴무 등록');
    const dialog = screen.getByRole('dialog');
    const form = dialog.querySelector('form')!;
    act(() => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });

    expect(usePilatesStore.getState().instructorSchedule.exceptions).toHaveLength(
      initialExceptionsCount + 1,
    );
  });
});
