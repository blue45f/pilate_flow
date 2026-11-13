import { openScheduleManagementAction } from '../test/scheduleManagementActions';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InstructorScheduleView } from './InstructorScheduleView';
import { usePilatesStore } from '../store/usePilatesStore';
import { createEmptyInstructorSchedule } from '../types/instructorSchedule';

const original = usePilatesStore.getState();
beforeEach(() =>
  usePilatesStore.setState({
    ...original,
    instructorSchedule: createEmptyInstructorSchedule(),
    generationError: null,
  }),
);
afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
  vi.restoreAllMocks();
});

function addPlace() {
  openScheduleManagementAction('장소 관리');
  const dialog = within(screen.getByRole('dialog', { name: '장소 관리' }));
  fireEvent.change(dialog.getByLabelText('장소 별칭'), { target: { value: 'QA 공간 별칭' } });
  fireEvent.click(dialog.getByRole('checkbox', { name: '타워' }));
  fireEvent.click(dialog.getByRole('checkbox', { name: '루프 밴드' }));
  fireEvent.click(dialog.getByRole('button', { name: '장소 저장' }));
  fireEvent.click(dialog.getAllByRole('button', { name: '닫기' })[0]);
}

function openClass(title = 'QA 별칭 수업') {
  fireEvent.click(screen.getByRole('button', { name: '수업 추가' }));
  const dialog = within(screen.getByRole('dialog', { name: '수업 일정' }));
  fireEvent.change(dialog.getByLabelText('수업 제목'), { target: { value: title } });
  fireEvent.change(dialog.getByLabelText('반·회원 별칭'), { target: { value: 'QA 반 별칭' } });
  return dialog;
}

describe('instructor schedule workflow', () => {
  it('closes native dialogs while their form is still mounted on save, footer close, and X', () => {
    const closedWithForm: boolean[] = [];
    vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function (
      this: HTMLDialogElement,
    ) {
      closedWithForm.push(!!this.querySelector('form'));
      this.removeAttribute('open');
    });
    render(<InstructorScheduleView today="2026-11-04" />);
    addPlace();
    const form = openClass();
    fireEvent.click(form.getByRole('button', { name: '일정 저장' }));
    const again = openClass('QA 취소 수업');
    fireEvent.click(again.getAllByRole('button', { name: '닫기' })[1]);
    fireEvent.click(screen.getByRole('button', { name: '이번 수업 변경' }));
    fireEvent.click(
      within(screen.getByRole('dialog', { name: '회차 변경' })).getAllByRole('button', {
        name: '닫기',
      })[0],
    );
    openScheduleManagementAction('휴무 등록');
    fireEvent.click(
      within(screen.getByRole('dialog', { name: '휴무 등록' })).getByRole('button', {
        name: '휴무 저장',
      }),
    );
    expect(closedWithForm).toHaveLength(5);
    expect(closedWithForm.every(Boolean)).toBe(true);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('starts empty, saves exact place inventory, creates a weekly class and cancels/restores only one occurrence', () => {
    render(<InstructorScheduleView today="2026-11-04" />);
    expect(
      screen.getByRole('heading', { name: '수업할 장소를 먼저 등록해 주세요' }),
    ).toBeInTheDocument();
    expect(usePilatesStore.getState().instructorSchedule.classes).toHaveLength(0);
    addPlace();
    expect(usePilatesStore.getState().instructorSchedule.locations[0]).toMatchObject({
      alias: 'QA 공간 별칭',
      equipmentIds: ['tower'],
      propIds: ['loop-band'],
    });
    const dialog = openClass();
    fireEvent.change(dialog.getByLabelText('반복'), { target: { value: 'weekly' } });
    fireEvent.change(dialog.getByLabelText('반복 종료 날짜'), { target: { value: '2026-11-18' } });
    fireEvent.click(dialog.getByRole('button', { name: '일정 저장' }));
    expect(usePilatesStore.getState().instructorSchedule.classes[0]).toMatchObject({
      recurrence: 'weekly',
      weekdays: [3],
      untilDate: '2026-11-18',
    });
    const row = within(screen.getByRole('article', { name: 'QA 별칭 수업 오전 9:00' }));
    fireEvent.click(row.getByRole('button', { name: '이번 수업 취소' }));
    expect(screen.getByText('취소', { exact: true })).toBeInTheDocument();
    expect(usePilatesStore.getState().instructorSchedule.classes).toHaveLength(1);
    expect(usePilatesStore.getState().instructorSchedule.exceptions[0]).toMatchObject({
      kind: 'cancel',
      originalDate: '2026-11-04',
    });
    fireEvent.click(
      within(screen.getByRole('article')).getByRole('button', { name: '원래 일정 복원' }),
    );
    expect(usePilatesStore.getState().instructorSchedule.exceptions).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: '주간 보기' }));
    expect(screen.getByRole('region', { name: '11월 2일 (월)' })).toBeInTheDocument();
  });

  it('moves one occurrence to a new date and marks a closure without erasing the original schedule', () => {
    render(<InstructorScheduleView today="2026-11-04" />);
    addPlace();
    const form = openClass();
    fireEvent.click(form.getByRole('button', { name: '일정 저장' }));
    fireEvent.click(screen.getByRole('button', { name: '이번 수업 변경' }));
    const move = within(screen.getByRole('dialog', { name: '회차 변경' }));
    fireEvent.change(move.getByLabelText('변경 날짜'), { target: { value: '2026-11-12' } });
    fireEvent.change(move.getByLabelText('시작 시각'), { target: { value: '13:00' } });
    fireEvent.change(move.getByLabelText('종료 시각'), { target: { value: '14:00' } });
    fireEvent.click(move.getByRole('button', { name: '회차 변경 저장' }));
    expect(screen.getByRole('article', { name: 'QA 별칭 수업 오후 1:00' })).toBeInTheDocument();
    expect(usePilatesStore.getState().instructorSchedule.classes[0].startDate).toBe('2026-11-04');
    openScheduleManagementAction('휴무 등록');
    fireEvent.click(
      within(screen.getByRole('dialog', { name: '휴무 등록' })).getByRole('button', {
        name: '휴무 저장',
      }),
    );
    expect(
      within(screen.getByRole('article')).getByText('휴무', { exact: true }),
    ).toBeInTheDocument();
    expect(usePilatesStore.getState().instructorSchedule.classes).toHaveLength(1);
    expect(usePilatesStore.getState().instructorSchedule.exceptions).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: '휴무 해제' })[0]);
    expect(screen.getByRole('button', { name: '이번 수업 취소' })).toBeInTheDocument();
  });

  it('shows rest-inclusive plan duration, exact location inventory and actual interval conflicts', () => {
    const exercise = {
      ...original.exercises[0],
      id: 'qa-exercise',
      requiredEquipment: ['cadillac'],
      props: [],
    };
    const sequence = {
      ...original.savedSequences[0],
      id: 'qa-plan',
      title: 'QA 연결 계획',
      targetMinutes: 50,
      steps: [
        { ...original.savedSequences[0].steps[0], exerciseId: exercise.id, durationMin: 45 },
        {
          ...original.savedSequences[0].steps[0],
          stepId: 'qa-rest',
          kind: 'rest' as const,
          exerciseId: '',
          durationMin: 5,
        },
      ],
    };
    usePilatesStore.setState({ exercises: [exercise], savedSequences: [sequence] });
    render(<InstructorScheduleView today="2026-11-04" />);
    addPlace();
    const form = openClass('QA 첫 수업');
    fireEvent.change(form.getByLabelText('종료 시각'), { target: { value: '09:45' } });
    fireEvent.change(form.getByLabelText('연결 시퀀스'), { target: { value: sequence.id } });
    fireEvent.click(form.getByRole('button', { name: '일정 저장' }));
    expect(
      screen.getByText(/계획 50분 \(쉬는 시간 포함\) · 일정 45분: 5분 초과/),
    ).toBeInTheDocument();
    expect(screen.getByText('장소 준비물 부족: 캐딜락')).toBeInTheDocument();
    const second = openClass('QA 겹친 수업');
    fireEvent.change(second.getByLabelText('시작 시각'), { target: { value: '09:30' } });
    fireEvent.change(second.getByLabelText('종료 시각'), { target: { value: '10:20' } });
    fireEvent.click(second.getByRole('button', { name: '일정 저장' }));
    expect(screen.getByText(/시간 겹침 1건/)).toBeInTheDocument();
    expect(usePilatesStore.getState().instructorSchedule.classes).toHaveLength(2);
  });

  it('keeps invalid edits atomic and exposes the validation error inside the open form', () => {
    render(<InstructorScheduleView today="2026-11-04" />);
    addPlace();
    const form = openClass();
    fireEvent.change(form.getByLabelText('종료 시각'), { target: { value: '08:00' } });
    fireEvent.click(form.getByRole('button', { name: '일정 저장' }));
    expect(form.getByRole('alert')).toHaveTextContent(/종료 시각/);
    expect(usePilatesStore.getState().instructorSchedule.classes).toHaveLength(0);
  });
});
