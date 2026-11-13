import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_HISTORY_LOGS } from '../data/pilatesCatalog';
import { getActiveWorkspaceOwner } from '../lib/accountStorage';
import { workspaceBrowseStorageKey } from '../hooks/useWorkspaceBrowseState';
import { usePilatesStore } from '../store/usePilatesStore';
import { revisionAssigned, revisionExercise, revisionSchedule, revisionSource } from '../test/datedRevisionFixtures';
import { MEMBER_BOOKING_STORAGE_KEY } from '../utils/memberBookingBridge';
import { InstructorScheduleView } from './InstructorScheduleView';

const original = usePilatesStore.getState();
const today = '2026-11-05';

beforeEach(() => {
  localStorage.clear();
  const dated = revisionAssigned('2026-11-09');
  usePilatesStore.setState({
    ...original,
    activeTab: 'schedule',
    activeSteps: [],
    activeSequenceId: 'empty-schedule-draft',
    instructorSchedule: revisionSchedule(),
    datedSequencePlanning: { assignments: [{ ...dated.assignment, state: 'draft' }] },
    savedSequences: [revisionSource()],
    exercises: [revisionExercise],
    historyLogs: [],
    undoStack: [],
    generationError: null,
  }, true);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  usePilatesStore.setState(original, true);
  localStorage.clear();
});

describe('instructor schedule preparation and browsing continuity', () => {
  it('shows recorded preparation status without fabricating enrollment or attendance', () => {
    localStorage.setItem(MEMBER_BOOKING_STORAGE_KEY, JSON.stringify({
      pass: { remainingCount: 7, totalCount: 20 },
      slotDecisions: { 'class:2026-11-09': { state: 'BOOKED' } },
    }));
    const before = usePilatesStore.getState();
    const { container } = render(<InstructorScheduleView today="2026-11-09" />);
    const row = screen.getByRole('article', { name: /직접 작성 수업.*10:00/ });

    expect(within(row).getByText('사본 준비 전')).toBeVisible();
    expect(within(row).getByRole('button', { name: '회차 사본으로 준비' })).toBeEnabled();
    expect(row).toHaveTextContent('검증 장소');
    expect(row).toHaveTextContent('50분');
    expect(container.querySelector('.schedule-slot-capacity-pill')).toBeNull();
    expect(row).not.toHaveTextContent(/출석·좌석|잔여\s*\d|\d+\s*\/\s*6/);
    expect(usePilatesStore.getState()).toBe(before);
  });

  it('returns to the selected week and preparation filter after opening an occurrence draft', () => {
    const first = render(<InstructorScheduleView today={today} />);
    const beforeBrowse = usePilatesStore.getState();
    fireEvent.change(screen.getByLabelText('기준 날짜'), { target: { value: '2026-11-09' } });
    fireEvent.click(screen.getByRole('button', { name: '주간 보기' }));
    fireEvent.click(screen.getByRole('button', { name: /^준비 필요 \(1\)/ }));
    expect(usePilatesStore.getState()).toBe(beforeBrowse);

    fireEvent.click(screen.getByRole('button', { name: '회차 사본으로 준비' }));
    const afterOpen = usePilatesStore.getState();
    expect(afterOpen.activeTab).toBe('workbench');
    expect(afterOpen.activeSteps.map((step) => step.exerciseId)).toEqual(
      revisionSource().steps.map((step) => step.exerciseId),
    );
    expect(afterOpen.instructorSchedule).toBe(beforeBrowse.instructorSchedule);
    expect(afterOpen.datedSequencePlanning).toBe(beforeBrowse.datedSequencePlanning);
    expect(afterOpen.savedSequences).toBe(beforeBrowse.savedSequences);
    expect(afterOpen.historyLogs).toBe(beforeBrowse.historyLogs);

    // App switches these views by mounting/unmounting; return within the same session.
    first.unmount();
    usePilatesStore.getState().setActiveTab('schedule');
    const afterReturn = usePilatesStore.getState();
    render(<InstructorScheduleView today={today} />);
    expect(screen.getByLabelText('기준 날짜')).toHaveValue('2026-11-09');
    expect(screen.getByRole('button', { name: '주간 보기' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^준비 필요 \(1\)/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('article', { name: /직접 작성 수업.*10:00/ })).toBeVisible();
    expect(usePilatesStore.getState()).toBe(afterReturn);

    fireEvent.click(screen.getByRole('button', { name: '오늘로' }));
    expect(screen.getByLabelText('기준 날짜')).toHaveValue(today);
    expect(screen.getByRole('button', { name: '일간 보기' })).toHaveAttribute('aria-pressed', 'true');
    expect(usePilatesStore.getState()).toBe(afterReturn);
  });

  it('uses actual teaching feedback in the briefing and excludes matching example feedback', () => {
    const sample = {
      ...INITIAL_HISTORY_LOGS[0],
      sequenceId: revisionSource().id,
      instructorReflection: '손목 부담 예시 메모',
    };
    usePilatesStore.setState({ historyLogs: [sample] });
    const before = usePilatesStore.getState();
    render(<InstructorScheduleView today="2026-11-09" />);
    expect(screen.getByTestId('schedule-preclass-briefing-strip')).not.toHaveTextContent('지난 메모:');
    expect(usePilatesStore.getState()).toBe(before);

    const actual = { ...sample, id: 'actual-schedule-note', instructorReflection: '무릎 부담 합성 메모' };
    act(() => usePilatesStore.setState({ historyLogs: [sample, actual] }));
    const afterRecorded = usePilatesStore.getState();
    const briefing = screen.getByTestId('schedule-preclass-briefing-strip');
    expect(briefing).toHaveTextContent('지난 메모: 무릎 굴곡·체중 압박 완화');
    expect(briefing).not.toHaveTextContent('손목 지지 부담 완화');
    expect(usePilatesStore.getState()).toBe(afterRecorded);
  });

  it('uses safe defaults for invalid recovered dates and filter values', () => {
    sessionStorage.setItem(workspaceBrowseStorageKey('schedule', getActiveWorkspaceOwner()), JSON.stringify({
      selectedDate: '2026-02-31', mode: 'year', prepFilter: 'attendance',
    }));
    const before = usePilatesStore.getState();
    render(<InstructorScheduleView today={today} />);
    expect(screen.getByLabelText('기준 날짜')).toHaveValue(today);
    expect(screen.getByRole('button', { name: '일간 보기' })).toHaveAttribute('aria-pressed', 'true');
    expect(usePilatesStore.getState()).toBe(before);
  });
});
