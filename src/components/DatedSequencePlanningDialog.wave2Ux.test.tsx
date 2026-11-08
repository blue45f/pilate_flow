import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES, INITIAL_SAVED_SEQUENCES } from '../data/pilatesCatalog';
import type { DatedSequencePlanAssignment } from '../types/datedSequencePlanning';
import type { InstructorScheduleData } from '../types/instructorSchedule';
import type { PilatesExercise, SavedSequence } from '../types/pilates';
import {
  createDatedPlanAssignment,
  previewDatedPlanWeekCopy,
} from '../utils/datedSequencePlanning';
import {
  DATED_PLANNING_DRAFT_STORAGE_KEY,
  DatedSequencePlanningDialog,
  type DatedSequencePlanningDialogProps,
} from './DatedSequencePlanningDialog';

const exercise: PilatesExercise = {
  ...INITIAL_EXERCISES[0],
  id: 'wave2-dated-exercise',
  nameKo: '계획 동작',
  requiredEquipment: ['mat'],
  props: [],
  apparatus: 'mat',
};

const sequenceA: SavedSequence = {
  ...INITIAL_SAVED_SEQUENCES[0],
  id: 'wave2-seq-a',
  title: '아침 매트 흐름 A',
  apparatus: 'mat',
  targetMinutes: 50,
  updatedAt: '2026-11-01T09:00:00.000Z',
  steps: [
    {
      stepId: 'work-a',
      order: 1,
      exerciseId: exercise.id,
      blockCategory: 'core',
      durationMin: 45,
      selectedLayer: 'standard',
      repetitions: 8,
      sets: 2,
      sideMode: 'left-then-right',
    },
  ],
};

const sequenceB: SavedSequence = {
  ...sequenceA,
  id: 'wave2-seq-b',
  title: '저녁 코어 수정본 B',
  targetMinutes: 45,
  updatedAt: '2026-11-02T10:00:00.000Z',
};

const schedule: InstructorScheduleData = {
  locations: [
    { id: 'studio', alias: '내 스튜디오', equipmentIds: ['mat'], propIds: [], notes: '' },
  ],
  classes: [
    {
      id: 'weekly',
      title: '반복 수업',
      participantAlias: '내 반',
      locationId: 'studio',
      startDate: '2026-11-02',
      startTime: '09:00',
      endTime: '09:50',
      recurrence: 'weekly',
      weekdays: [1, 3],
      untilDate: '2026-12-31',
      notes: '',
    },
  ],
  exceptions: [],
};

function createSavedAssignment(
  originalDate = '2026-11-02',
  classId = 'weekly',
  source = sequenceA,
): DatedSequencePlanAssignment {
  const result = createDatedPlanAssignment({
    schedule,
    sequence: source,
    classId,
    originalDate,
    now: '2026-11-01T10:00:00.000Z',
    assignmentId: `${classId}-${originalDate}`,
  });
  if (!result.success) throw new Error(result.message);
  return result.assignment;
}

function buildProps(
  overrides: Partial<DatedSequencePlanningDialogProps> = {},
): DatedSequencePlanningDialogProps {
  const planning = overrides.planning ?? { assignments: [] };
  return {
    initialDate: '2026-11-04',
    schedule,
    savedSequences: [sequenceA, sequenceB],
    exercises: [exercise],
    planning,
    onClose: vi.fn(),
    onAssign: vi.fn(() => ({ success: true, message: '회차 계획 저장' })),
    onSetState: vi.fn(() => ({ success: true, message: '정리 상태 변경' })),
    onPreviewWeekCopy: vi.fn((sourceStartDate, targetStartDate) =>
      previewDatedPlanWeekCopy({ schedule, planning, sourceStartDate, targetStartDate }),
    ),
    onCopyWeek: vi.fn(() => ({ success: true, message: '다음 주에 빈 회차만 복사' })),
    onLoadDraft: vi.fn(() => ({ success: true, message: '새 작업 사본 열기' })),
    onReplaceSnapshot: vi.fn(() => ({ success: true, message: '이 회차 수정본 연결' })),
    ...overrides,
  };
}

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

describe('Wave2-4 DatedSequencePlanningDialog 3-step guided flow & draft recovery', () => {
  it('renders the 3-step guided header with live 지금 할 일 guidance and navigates across steps via 이전 단계 / 다음 단계', () => {
    render(<DatedSequencePlanningDialog {...buildProps()} />);

    const stepGuide = screen.getByTestId('dated-planning-step-guide');
    expect(stepGuide).toBeVisible();

    const step1Btn = within(stepGuide).getByRole('button', { name: '1 기간·날짜 선택' });
    const step2Btn = within(stepGuide).getByRole('button', { name: '2 수업 회차 선택' });
    const step3Btn = within(stepGuide).getByRole('button', { name: '3 시퀀스 배정·주간 복사' });
    const prevBtn = within(stepGuide).getByRole('button', { name: '이전 단계' });
    const nextBtn = within(stepGuide).getByRole('button', { name: '다음 단계' });

    expect(prevBtn).toHaveClass('pf-step-nav-btn');
    expect(nextBtn).toHaveClass('pf-step-nav-btn');

    // Initial state without initialOccurrence is Step 1
    expect(step1Btn).toHaveAttribute('aria-current', 'step');
    expect(prevBtn).toBeDisabled();
    expect(nextBtn).toBeEnabled();
    expect(screen.getByTestId('dated-planning-next-action')).toHaveTextContent(/지금 할 일:/);

    // Advance to Step 2 -> focuses first occurrence action button
    fireEvent.click(nextBtn);
    expect(step2Btn).toHaveAttribute('aria-current', 'step');
    expect(prevBtn).toBeEnabled();
    expect(nextBtn).toBeEnabled();
    const occurrencesRegion = screen.getByRole('region', { name: '계획할 수업 회차' });
    expect(occurrencesRegion.contains(document.activeElement)).toBe(true);

    // Advance to Step 3 -> focuses copy summary when no occurrence is selected yet
    fireEvent.click(nextBtn);
    expect(step3Btn).toHaveAttribute('aria-current', 'step');
    expect(nextBtn).toBeDisabled();
    expect(prevBtn).toBeEnabled();

    // Navigate back to Step 2 and Step 1 via 이전 단계
    fireEvent.click(prevBtn);
    expect(step2Btn).toHaveAttribute('aria-current', 'step');
    fireEvent.click(prevBtn);
    expect(step1Btn).toHaveAttribute('aria-current', 'step');
    expect(prevBtn).toBeDisabled();

    // Selecting an occurrence automatically advances to Step 3
    const firstAssignBtn = within(occurrencesRegion).getAllByRole('button', {
      name: '회차 계획 지정',
    })[0];
    fireEvent.click(firstAssignBtn);
    expect(step3Btn).toHaveAttribute('aria-current', 'step');
    expect(screen.getByTestId('dated-planning-next-action')).toHaveTextContent(
      /시퀀스 목록에서 사용할 구성을 고르고/,
    );
  });

  it('persists unsaved sequenceId selection in sessionStorage (pf_dated_planning_draft_v1), restores it with 선택 초안 복원됨 on reopen, and clears it on save', () => {
    const targetOccurrence = { classId: 'weekly', originalDate: '2026-11-02' };
    const firstProps = buildProps();
    const { unmount } = render(<DatedSequencePlanningDialog {...firstProps} />);

    // Open without user edits does not write to sessionStorage
    expect(window.sessionStorage.getItem(DATED_PLANNING_DRAFT_STORAGE_KEY)).toBeNull();

    // Select occurrence and choose sequenceA without saving
    const assignBtns = screen.getAllByRole('button', { name: '회차 계획 지정' });
    fireEvent.click(assignBtns[0]);
    const detail = within(screen.getByRole('region', { name: '선택한 회차 계획' }));
    const select = detail.getByLabelText('이 회차에 사용할 저장 시퀀스');
    fireEvent.change(select, { target: { value: sequenceA.id } });

    expect(select).toHaveValue(sequenceA.id);
    expect(firstProps.onAssign).not.toHaveBeenCalled();

    const rawDraft = window.sessionStorage.getItem(DATED_PLANNING_DRAFT_STORAGE_KEY);
    expect(rawDraft).not.toBeNull();
    expect(rawDraft).toContain(sequenceA.id);
    expect(rawDraft).toContain(targetOccurrence.originalDate);

    // Close dialog before clicking save
    unmount();

    // Reopen dialog for that occurrence
    const reopenProps = buildProps({ initialOccurrence: targetOccurrence });
    render(<DatedSequencePlanningDialog {...reopenProps} />);

    const reopenedDetail = within(screen.getByRole('region', { name: '선택한 회차 계획' }));
    expect(reopenedDetail.getByLabelText('이 회차에 사용할 저장 시퀀스')).toHaveValue(
      sequenceA.id,
    );
    expect(reopenedDetail.getByTestId('dated-planning-draft-restored')).toHaveTextContent(
      /선택 초안 복원됨/,
    );

    // Save the plan -> clears sessionStorage draft and removes restored notice
    fireEvent.click(reopenedDetail.getByRole('button', { name: '이 회차에 계획 사본 저장' }));
    expect(reopenProps.onAssign).toHaveBeenCalledWith({
      sequenceId: sequenceA.id,
      classId: targetOccurrence.classId,
      originalDate: targetOccurrence.originalDate,
      state: 'draft',
    });
    expect(window.sessionStorage.getItem(DATED_PLANNING_DRAFT_STORAGE_KEY)).toBeNull();
    expect(screen.queryByTestId('dated-planning-draft-restored')).not.toBeInTheDocument();
  });

  it('persists and restores unsaved revisionSequenceId selection across close/reopen and clears on confirm', () => {
    const saved = createSavedAssignment('2026-11-02', 'weekly', sequenceA);
    const firstProps = buildProps({
      initialOccurrence: saved,
      planning: { assignments: [saved] },
    });
    const { unmount } = render(<DatedSequencePlanningDialog {...firstProps} />);

    fireEvent.click(screen.getByText('이 회차에 저장한 수정본 연결'));
    fireEvent.change(screen.getByLabelText('이 회차에 연결할 저장 수정본'), {
      target: { value: sequenceB.id },
    });

    expect(window.sessionStorage.getItem(DATED_PLANNING_DRAFT_STORAGE_KEY)).toContain(
      sequenceB.id,
    );

    unmount();

    const reopenProps = buildProps({
      initialOccurrence: saved,
      planning: { assignments: [saved] },
    });
    render(<DatedSequencePlanningDialog {...reopenProps} />);

    expect(screen.getByTestId('dated-planning-draft-restored')).toHaveTextContent(
      /선택 초안 복원됨/,
    );
    fireEvent.click(screen.getByText('이 회차에 저장한 수정본 연결'));
    expect(screen.getByLabelText('이 회차에 연결할 저장 수정본')).toHaveValue(sequenceB.id);

    fireEvent.click(screen.getByRole('button', { name: '수정본 차이 확인' }));
    fireEvent.click(screen.getByRole('button', { name: '이 회차만 수정본으로 바꾸기 확인' }));
    expect(reopenProps.onReplaceSnapshot).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem(DATED_PLANNING_DRAFT_STORAGE_KEY)).toBeNull();
  });
});
