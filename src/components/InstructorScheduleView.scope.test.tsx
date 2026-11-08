import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InstructorScheduleView } from './InstructorScheduleView';
import { usePilatesStore } from '../store/usePilatesStore';
import { revisionSchedule } from '../test/datedRevisionFixtures';
import { expandInstructorSchedule } from '../utils/instructorSchedule';

const original = usePilatesStore.getState();
beforeEach(() =>
  usePilatesStore.setState({
    ...original,
    instructorSchedule: revisionSchedule(),
    generationError: null,
  }),
);
afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
  vi.restoreAllMocks();
});
const openScope = () => {
  const trigger = screen.getByRole('button', { name: '회차 변경' });
  fireEvent.click(trigger);
  return { trigger, panel: within(screen.getByRole('complementary', { name: '회차 변경' })) };
};
const next = async () => {
  fireEvent.click(
    within(screen.getByRole('complementary', { name: '회차 변경' })).getByRole('button', {
      name: '다음',
    }),
  );
  return within(await screen.findByRole('dialog'));
};

describe('recurring schedule change scope', () => {
  it('shows the exact occurrence, defaults to one, and cancels without changing data or losing focus', async () => {
    render(<InstructorScheduleView today="2026-11-09" />);
    const before = structuredClone(usePilatesStore.getState().instructorSchedule);
    const { trigger, panel } = openScope();
    expect(panel.getByRole('radio', { name: /이번 회차만/ })).toBeChecked();
    expect(panel.getByText(/선택한 날짜\(2026년 11월 9일 \(월\)\)/)).toBeInTheDocument();
    expect(panel.getByText(/이미 따로 변경하거나 취소한 회차는 유지/)).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(panel.getByRole('heading', { name: '회차 변경' })).toHaveFocus());
    fireEvent.click(panel.getByRole('radio', { name: /반복 일정 전체/ }));
    fireEvent.click(panel.getByRole('button', { name: '취소' }));
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(usePilatesStore.getState().instructorSchedule).toEqual(before);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const again = openScope().panel;
    expect(again.getByRole('radio', { name: /이번 회차만/ })).toBeChecked();
    fireEvent.keyDown(again.getByRole('heading'), { key: 'Escape' });
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByRole('complementary', { name: '회차 변경' })).not.toBeInTheDocument();
  });

  it('opens the existing occurrence form and saves only the chosen exception', async () => {
    render(<InstructorScheduleView today="2026-11-09" />);
    const before = structuredClone(usePilatesStore.getState().instructorSchedule);
    openScope();
    const form = await next();
    expect(form.getByLabelText('변경 날짜')).toHaveValue('2026-11-09');
    expect(usePilatesStore.getState().instructorSchedule).toEqual(before);
    fireEvent.change(form.getByLabelText('변경 날짜'), { target: { value: '2026-11-10' } });
    fireEvent.change(form.getByLabelText('시작 시각'), { target: { value: '12:00' } });
    fireEvent.change(form.getByLabelText('종료 시각'), { target: { value: '12:50' } });
    fireEvent.click(form.getByRole('button', { name: '회차 변경 저장' }));
    const after = usePilatesStore.getState().instructorSchedule;
    expect(after.classes).toEqual(before.classes);
    expect(after.locations).toEqual(before.locations);
    expect(after.exceptions).toHaveLength(1);
    expect(after.exceptions[0]).toMatchObject({
      kind: 'reschedule',
      originalDate: '2026-11-09',
      date: '2026-11-10',
      startTime: '12:00',
    });
    expect(expandInstructorSchedule(after, '2026-11-16', '2026-11-16')[0].startTime).toBe('10:00');
  });

  it('opens the series form and retains pre-existing per-occurrence changes after saving', async () => {
    const data = revisionSchedule();
    data.exceptions = [
      {
        id: 'cancel',
        kind: 'cancel',
        classId: 'class',
        originalDate: '2026-11-16',
        reason: '개별 취소',
      },
      {
        id: 'move',
        kind: 'reschedule',
        classId: 'class',
        originalDate: '2026-11-23',
        date: '2026-11-24',
        startTime: '14:00',
        endTime: '14:50',
        reason: '개별 변경',
      },
    ];
    usePilatesStore.setState({ instructorSchedule: data });
    render(<InstructorScheduleView today="2026-11-09" />);
    const { panel } = openScope();
    fireEvent.click(panel.getByRole('radio', { name: /반복 일정 전체/ }));
    const form = await next();
    expect(screen.getByRole('dialog', { name: '수업 일정' })).toBeInTheDocument();
    expect(form.getByLabelText('시작 날짜')).toHaveValue('2026-11-02');
    fireEvent.change(form.getByLabelText('시작 시각'), { target: { value: '11:00' } });
    fireEvent.change(form.getByLabelText('종료 시각'), { target: { value: '11:50' } });
    fireEvent.click(form.getByRole('button', { name: '일정 저장' }));
    const after = usePilatesStore.getState().instructorSchedule;
    expect(after.exceptions).toEqual(data.exceptions);
    expect(after.classes).toHaveLength(1);
    expect(after.classes[0]).toMatchObject({
      startTime: '11:00',
      endTime: '11:50',
      recurrence: 'weekly',
    });
    expect(expandInstructorSchedule(after, '2026-11-24', '2026-11-24')[0].startTime).toBe('14:00');
  });

  it('blocks continuation if the selected class changes while the panel is open', () => {
    render(<InstructorScheduleView today="2026-11-09" />);
    const { panel } = openScope();
    act(() => {
      const data = revisionSchedule();
      data.classes[0].title = '외부에서 바꾼 제목';
      usePilatesStore.setState({ instructorSchedule: data });
    });
    expect(panel.getByRole('alert')).toHaveTextContent('일정이 바뀌었습니다');
    expect(panel.getByRole('button', { name: '다음' })).toBeDisabled();
    fireEvent.click(panel.getByRole('button', { name: '다음' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(usePilatesStore.getState().instructorSchedule.classes[0].title).toBe(
      '외부에서 바꾼 제목',
    );
  });

  it('rechecks the live store between Next and opening the form', async () => {
    render(<InstructorScheduleView today="2026-11-09" />);
    const { panel } = openScope();
    fireEvent.click(panel.getByRole('button', { name: '다음' }));
    act(() =>
      usePilatesStore.setState({ instructorSchedule: { ...revisionSchedule(), classes: [] } }),
    );
    await screen.findByText('일정이 바뀌었습니다. 변경하려는 회차를 다시 선택해 주세요.');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(usePilatesStore.getState().instructorSchedule.classes).toHaveLength(0);
  });

  it('uses the actual moved date for the choice and preserves original occurrence identity', async () => {
    const data = revisionSchedule();
    data.exceptions = [
      {
        id: 'move',
        kind: 'reschedule',
        classId: 'class',
        originalDate: '2026-11-09',
        date: '2026-11-10',
        startTime: '13:00',
        endTime: '13:50',
        reason: '개별 변경',
      },
    ];
    usePilatesStore.setState({ instructorSchedule: data });
    render(<InstructorScheduleView today="2026-11-10" />);
    const { panel } = openScope();
    expect(panel.getByText(/선택한 날짜\(2026년 11월 10일 \(화\)\)/)).toBeInTheDocument();
    const form = await next();
    expect(form.getByLabelText('변경 날짜')).toHaveValue('2026-11-10');
    fireEvent.change(form.getByLabelText('변경 날짜'), { target: { value: '2026-11-11' } });
    fireEvent.click(form.getByRole('button', { name: '회차 변경 저장' }));
    expect(usePilatesStore.getState().instructorSchedule.exceptions).toHaveLength(1);
    expect(usePilatesStore.getState().instructorSchedule.exceptions[0]).toMatchObject({
      originalDate: '2026-11-09',
      date: '2026-11-11',
    });
  });

  it('resets the choice when a different occurrence is selected', () => {
    const data = revisionSchedule();
    data.classes.push({
      ...data.classes[0],
      id: 'second',
      title: '두 번째 수업',
      startTime: '11:00',
      endTime: '11:50',
    });
    usePilatesStore.setState({ instructorSchedule: data });
    render(<InstructorScheduleView today="2026-11-09" />);
    fireEvent.click(
      within(screen.getByRole('article', { name: '직접 작성 수업 오전 10:00' })).getByRole(
        'button',
        { name: '회차 변경' },
      ),
    );
    fireEvent.click(screen.getByRole('radio', { name: /반복 일정 전체/ }));
    fireEvent.click(
      within(screen.getByRole('article', { name: '두 번째 수업 오전 11:00' })).getByRole('button', {
        name: '회차 변경',
      }),
    );
    const panel = within(screen.getByRole('complementary', { name: '회차 변경' }));
    expect(panel.getByText('두 번째 수업')).toBeInTheDocument();
    expect(panel.getByRole('radio', { name: /이번 회차만/ })).toBeChecked();
    expect(usePilatesStore.getState().instructorSchedule).toEqual(data);
  });

  it('returns focus to the visible day heading when navigation removed the opener', async () => {
    render(<InstructorScheduleView today="2026-11-09" />);
    const { panel } = openScope();
    fireEvent.change(screen.getByLabelText('기준 날짜'), { target: { value: '2026-11-10' } });
    expect(screen.queryByRole('button', { name: '회차 변경' })).not.toBeInTheDocument();
    fireEvent.click(panel.getByRole('button', { name: '취소' }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: '11월 10일 (화)' })).toHaveFocus(),
    );
    expect(usePilatesStore.getState().instructorSchedule).toEqual(revisionSchedule());
  });

  it('keeps one-time classes on the existing direct editing path', () => {
    const data = revisionSchedule();
    data.classes[0] = {
      ...data.classes[0],
      recurrence: 'once',
      weekdays: [],
      untilDate: undefined,
      startDate: '2026-11-09',
    };
    usePilatesStore.setState({ instructorSchedule: data });
    render(<InstructorScheduleView today="2026-11-09" />);
    fireEvent.click(screen.getByRole('button', { name: '이번 수업 변경' }));
    expect(screen.getByRole('dialog', { name: '회차 변경' })).toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: '회차 변경' })).not.toBeInTheDocument();
  });
});
