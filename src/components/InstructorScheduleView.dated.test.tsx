import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePilatesStore } from '../store/usePilatesStore';
import { InstructorScheduleView } from './InstructorScheduleView';

const original = usePilatesStore.getState();
beforeEach(() =>
  usePilatesStore.setState(
    {
      ...original,
      activeTab: 'schedule',
      instructorSchedule: {
        locations: [
          { id: 'test-venue', alias: '작은 공간', equipmentIds: ['mat'], propIds: [], notes: '' },
        ],
        classes: [
          {
            id: 'dated-class',
            title: '회차 계획 수업',
            participantAlias: '',
            locationId: 'test-venue',
            startDate: '2026-11-04',
            startTime: '09:00',
            endTime: '09:50',
            recurrence: 'once',
            weekdays: [],
            notes: '',
          },
        ],
        exceptions: [],
      },
      datedSequencePlanning: undefined,
      generationError: null,
    },
    true,
  ),
);
afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
  vi.restoreAllMocks();
});

describe('dated occurrence revision store wiring', () => {
  function prepareSavedRevision() {
    const state = usePilatesStore.getState();
    const source = state.savedSequences[0];
    const revised = {
      ...source,
      id: 'explicitly-saved-revision',
      title: '명시적으로 저장한 이 회차 수정본',
      targetMinutes: 45,
      updatedAt: '2026-11-05T10:00:00.000Z',
      steps: [
        {
          ...source.steps[0],
          durationMin: 40,
          repetitions: 12,
          sets: 2,
          instructorNote: '수정본 메모',
        },
        {
          stepId: 'revision-rest',
          kind: 'rest' as const,
          order: 2,
          exerciseId: '',
          blockCategory: 'core' as const,
          durationMin: 5,
          selectedLayer: 'standard' as const,
        },
      ],
    };
    usePilatesStore.setState({ savedSequences: [...state.savedSequences, revised] });
    const assigned = state.assignSequenceToOccurrence({
      sequenceId: source.id,
      classId: 'dated-class',
      originalDate: '2026-11-04',
    });
    expect(assigned.success).toBe(true);
    const assignment = usePilatesStore.getState().datedSequencePlanning!.assignments[0];
    expect(
      state.setDatedSequencePlanState(assignment.id, 'prepared', assignment.updatedAt).success,
    ).toBe(true);
    return { source, revised };
  }

  function reviewAndConfirm(revisedId: string) {
    fireEvent.click(screen.getByRole('button', { name: '날짜별 계획' }));
    fireEvent.click(screen.getByText('이 회차에 저장한 수정본 연결'));
    fireEvent.change(screen.getByLabelText('이 회차에 연결할 저장 수정본'), {
      target: { value: revisedId },
    });
    fireEvent.click(screen.getByRole('button', { name: '수정본 차이 확인' }));
    fireEvent.click(screen.getByRole('button', { name: '이 회차만 수정본으로 바꾸기 확인' }));
  }

  it('updates only the confirmed occurrence, preserves its full prior version and leaves workbench/Binder/history untouched', () => {
    const { source, revised } = prepareSavedRevision();
    const state = usePilatesStore.getState();
    usePilatesStore.setState({
      instructorSchedule: {
        ...state.instructorSchedule,
        classes: [
          ...state.instructorSchedule.classes,
          { ...state.instructorSchedule.classes[0], id: 'other-date', startDate: '2026-11-05' },
        ],
      },
    });
    expect(
      state.assignSequenceToOccurrence({
        sequenceId: source.id,
        classId: 'other-date',
        originalDate: '2026-11-05',
      }).success,
    ).toBe(true);
    const before = usePilatesStore.getState();
    const previous = structuredClone(before.datedSequencePlanning!.assignments[0]);
    const other = structuredClone(before.datedSequencePlanning!.assignments[1]);
    const binder = structuredClone(before.savedSequences);
    const history = structuredClone(before.historyLogs);
    render(<InstructorScheduleView today="2026-11-04" />);
    reviewAndConfirm(revised.id);
    const after = usePilatesStore.getState();
    const changed = after.datedSequencePlanning!.assignments.find(
      (item) => item.classId === 'dated-class',
    )!;
    expect(changed.state).toBe('draft');
    expect(changed.sequenceSnapshot).toEqual(revised);
    expect(changed.priorVersions).toEqual([previous]);
    expect(
      after.datedSequencePlanning!.assignments.find((item) => item.classId === 'other-date'),
    ).toEqual(other);
    expect(after.savedSequences).toEqual(binder);
    expect(after.historyLogs).toEqual(history);
    expect(after.activeSteps).toEqual(before.activeSteps);
    expect(after.activeTitle).toBe(before.activeTitle);
    expect(after.draftCriteria).toEqual(before.draftCriteria);
    expect(after.instructorSchedule).toEqual(before.instructorSchedule);
  });

  it('rebinds a moved occurrence only after explicit old/new context review and retains its previous context', () => {
    const { revised } = prepareSavedRevision();
    const state = usePilatesStore.getState();
    const previous = structuredClone(state.datedSequencePlanning!.assignments[0]);
    usePilatesStore.setState({
      instructorSchedule: {
        ...state.instructorSchedule,
        locations: [
          ...state.instructorSchedule.locations,
          { ...state.instructorSchedule.locations[0], id: 'alternate-venue', alias: '다른 공간' },
        ],
        exceptions: [
          {
            id: 'explicit-rebind-move',
            kind: 'reschedule',
            classId: 'dated-class',
            originalDate: '2026-11-04',
            date: '2026-11-06',
            startTime: '13:00',
            endTime: '13:50',
            locationId: 'alternate-venue',
            reason: '직접 옮김',
          },
        ],
      },
    });
    render(<InstructorScheduleView today="2026-11-06" />);
    fireEvent.click(screen.getByRole('button', { name: '날짜별 계획' }));
    expect(screen.getByRole('button', { name: '작업 사본으로 편집' })).toBeDisabled();
    fireEvent.click(screen.getByText('이 회차에 저장한 수정본 연결'));
    fireEvent.change(screen.getByLabelText('이 회차에 연결할 저장 수정본'), {
      target: { value: revised.id },
    });
    fireEvent.click(screen.getByRole('button', { name: '수정본 차이 확인' }));
    const preview = within(screen.getByRole('group', { name: '이 회차 계획 수정 미리보기' }));
    expect(
      preview.getByRole('row', {
        name: /회차 날짜·시각·장소 2026-11-04 09:00–09:50 · 작은 공간 2026-11-06 13:00–13:50 · 다른 공간/,
      }),
    ).toBeVisible();
    fireEvent.click(preview.getByRole('button', { name: '이 회차만 수정본으로 바꾸기 확인' }));
    const changed = usePilatesStore.getState().datedSequencePlanning!.assignments[0];
    expect(changed.originalDate).toBe('2026-11-04');
    expect(changed.occurrenceSnapshot).toEqual({
      date: '2026-11-06',
      startTime: '13:00',
      endTime: '13:50',
      locationId: 'alternate-venue',
    });
    expect(changed.priorVersions?.[0]).toEqual(previous);
    expect(changed.state).toBe('draft');
  });
});

describe('schedule dated-plan entry integration', () => {
  it('preserves compact venue/exception controls and opens one separate planning dialog', () => {
    render(<InstructorScheduleView today="2026-11-04" />);
    expect(screen.getByRole('button', { name: '장소 관리' })).toBeVisible();
    expect(screen.getByRole('button', { name: '휴무 등록' })).toBeVisible();
    expect(screen.getByRole('button', { name: '이번 수업 변경' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '월간' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '주·월 시퀀스 계획' }));
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('button', { name: '월간' })).toBeVisible();
  });

  it('saves a selected sequence snapshot to the occurrence without changing actual history or its source', () => {
    const beforeHistory = usePilatesStore.getState().historyLogs;
    const beforeSequences = structuredClone(usePilatesStore.getState().savedSequences);
    render(<InstructorScheduleView today="2026-11-04" />);
    fireEvent.click(screen.getByRole('button', { name: '날짜별 계획' }));
    const dialog = within(screen.getByRole('dialog', { name: '주·월 시퀀스 계획' }));
    const source = beforeSequences[0];
    fireEvent.change(dialog.getByLabelText('이 회차에 사용할 저장 시퀀스'), {
      target: { value: source.id },
    });
    fireEvent.click(dialog.getByRole('button', { name: '이 회차에 계획 사본 저장' }));
    const state = usePilatesStore.getState();
    expect(state.datedSequencePlanning?.assignments).toHaveLength(1);
    expect(state.datedSequencePlanning?.assignments[0]).toMatchObject({
      classId: 'dated-class',
      originalDate: '2026-11-04',
      state: 'draft',
      sequenceSnapshot: { title: source.title },
    });
    expect(state.historyLogs).toEqual(beforeHistory);
    expect(state.savedSequences).toEqual(beforeSequences);
  });

  it('uses the assigned snapshot for venue/time warnings after its live source changes', () => {
    const state = usePilatesStore.getState();
    const source = {
      ...state.savedSequences[0],
      id: 'fixed-plan',
      title: '연결 당시 50분 사본',
      targetMinutes: 50,
      steps: [{ ...state.savedSequences[0].steps[0], durationMin: 50 }],
    };
    usePilatesStore.setState({ savedSequences: [source] });
    expect(
      state.assignSequenceToOccurrence({
        sequenceId: source.id,
        classId: 'dated-class',
        originalDate: '2026-11-04',
      }).success,
    ).toBe(true);
    const current = usePilatesStore.getState();
    usePilatesStore.setState({
      savedSequences: [
        {
          ...source,
          title: '나중에 바꾼 10분 원본',
          steps: [{ ...source.steps[0], durationMin: 10 }],
        },
      ],
      instructorSchedule: {
        ...current.instructorSchedule,
        classes: current.instructorSchedule.classes.map((item) => ({
          ...item,
          endTime: '09:30',
          linkSavedSequenceId: source.id,
        })),
      },
    });
    render(<InstructorScheduleView today="2026-11-04" />);
    expect(screen.getByText(/계획 50분 \(쉬는 시간 포함\) · 일정 30분: 20분 초과/)).toBeVisible();
    expect(screen.queryByText(/계획 10분.*20분 여유/)).not.toBeInTheDocument();
    expect(screen.getByText('날짜별 계획: 연결 당시 50분 사본 · 작성 중')).toBeVisible();
  });

  it('opens a new independent draft only after closing the planning dialog, preserving saved lessons', () => {
    const initial = usePilatesStore.getState();
    const source = initial.savedSequences[0];
    expect(
      initial.assignSequenceToOccurrence({
        sequenceId: source.id,
        classId: 'dated-class',
        originalDate: '2026-11-04',
      }).success,
    ).toBe(true);
    const before = usePilatesStore.getState();
    const snapshots = structuredClone(before.datedSequencePlanning);
    const saved = structuredClone(before.savedSequences);
    const logs = structuredClone(before.historyLogs);
    const close = vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function (
      this: HTMLDialogElement,
    ) {
      expect(usePilatesStore.getState().activeTab).toBe('schedule');
      expect(this.querySelector('.dated-planning')).not.toBeNull();
      this.removeAttribute('open');
    });
    render(<InstructorScheduleView today="2026-11-04" />);
    fireEvent.click(screen.getByRole('button', { name: '날짜별 계획' }));
    fireEvent.click(screen.getByRole('button', { name: '작업 사본으로 편집' }));
    fireEvent.click(screen.getByRole('button', { name: '새 작업 사본 열기 확인' }));
    const after = usePilatesStore.getState();
    expect(close).toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: '주·월 시퀀스 계획' })).not.toBeInTheDocument();
    expect(after.activeTab).toBe('workbench');
    expect(after.activeSequenceId).not.toBe(source.id);
    expect(after.activeSequenceId).toMatch(/^draft-dated-/);
    expect(after.savedSequences).toEqual(saved);
    expect(after.historyLogs).toEqual(logs);
    expect(after.datedSequencePlanning).toEqual(snapshots);
    expect(after.undoStack.length).toBeGreaterThan(before.undoStack.length);
  });
});
