import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES, INITIAL_SAVED_SEQUENCES } from '../data/pilatesCatalog';
import type {
  DatedSequencePlanAssignment,
  DatedSequencePlanningData,
} from '../types/datedSequencePlanning';
import type { InstructorScheduleData } from '../types/instructorSchedule';
import type { PilatesExercise, SavedSequence } from '../types/pilates';
import {
  copyDatedPlanWeek,
  createDatedPlanAssignment,
  getDatedPlanSourceFingerprint,
  previewDatedPlanWeekCopy,
  replaceDatedPlanSnapshot,
} from '../utils/datedSequencePlanning';
import {
  DATED_PLANNING_DRAFT_STORAGE_KEY,
  DatedSequencePlanningDialog,
  type DatedSequencePlanningDialogProps,
} from './DatedSequencePlanningDialog';

const matExercise: PilatesExercise = {
  ...INITIAL_EXERCISES[0],
  id: 'flow-safety-mat-ex',
  nameKo: '합성 매트 호흡 정렬',
  requiredEquipment: ['mat'],
  props: [],
  apparatus: 'mat',
};

const reformerExercise: PilatesExercise = {
  ...INITIAL_EXERCISES[0],
  id: 'flow-safety-reformer-ex',
  nameKo: '합성 리포머 풀스트랩',
  requiredEquipment: ['reformer'],
  props: ['magic-circle'],
  apparatus: 'reformer',
};

const matSequence: SavedSequence = {
  ...INITIAL_SAVED_SEQUENCES[0],
  id: 'flow-seq-mat-50',
  title: '매트 코어 50분 안',
  apparatus: 'mat',
  level: '1.5',
  targetMinutes: 50,
  updatedAt: '2026-11-01T09:00:00.000Z',
  steps: [
    {
      stepId: 'mat-step-1',
      order: 1,
      exerciseId: matExercise.id,
      blockCategory: 'core',
      durationMin: 45,
      selectedLayer: 'standard',
      repetitions: 8,
      sets: 2,
      sideMode: 'left-then-right',
    },
    {
      stepId: 'mat-step-rest',
      order: 2,
      kind: 'rest',
      exerciseId: '',
      blockCategory: 'cooldown',
      durationMin: 5,
      selectedLayer: 'standard',
    },
  ],
};

const mismatchSequence: SavedSequence = {
  ...matSequence,
  id: 'flow-seq-reformer-60',
  title: '리포머 집중 60분 안',
  apparatus: 'reformer',
  level: '2.0',
  targetMinutes: 60,
  updatedAt: '2026-11-02T10:00:00.000Z',
  steps: [
    {
      stepId: 'ref-step-1',
      order: 1,
      exerciseId: reformerExercise.id,
      blockCategory: 'core',
      durationMin: 60,
      selectedLayer: 'hard',
      repetitions: 10,
      sets: 2,
      sideMode: 'together',
    },
  ],
};

const nextWeekExistingSequence: SavedSequence = {
  ...matSequence,
  id: 'flow-seq-next-week-existing',
  title: '다음 주 수요일 기존 유지 안',
  targetMinutes: 45,
  updatedAt: '2026-11-03T10:00:00.000Z',
  steps: [
    {
      ...matSequence.steps[0],
      durationMin: 40,
      instructorNote: '덮어쓰면 안 되는 다음 주 메모',
    },
    {
      ...matSequence.steps[1],
      durationMin: 5,
    },
  ],
};

const baseSchedule: InstructorScheduleData = {
  locations: [
    { id: 'studio-mat', alias: '매트 룸 A', equipmentIds: ['mat'], propIds: [], notes: '' },
  ],
  classes: [
    {
      id: 'mw-class',
      title: '월수 오전 매트반',
      participantAlias: '오전 A반',
      locationId: 'studio-mat',
      startDate: '2026-11-02',
      startTime: '09:00',
      endTime: '09:50',
      recurrence: 'weekly',
      weekdays: [1, 3],
      untilDate: '2026-12-31',
      notes: '',
    },
    {
      id: 'tue-once',
      title: '화요 특강 수업',
      participantAlias: '',
      locationId: 'studio-mat',
      startDate: '2026-11-03',
      startTime: '11:00',
      endTime: '11:50',
      recurrence: 'once',
      weekdays: [],
      notes: '',
    },
    {
      id: 'thu-weekly',
      title: '목요 저녁 매트반',
      participantAlias: '저녁 B반',
      locationId: 'studio-mat',
      startDate: '2026-11-05',
      startTime: '19:00',
      endTime: '19:50',
      recurrence: 'weekly',
      weekdays: [4],
      untilDate: '2026-12-31',
      notes: '',
    },
    {
      id: 'fri-cancelled',
      title: '금요 취소 수업',
      participantAlias: '',
      locationId: 'studio-mat',
      startDate: '2026-11-06',
      startTime: '10:00',
      endTime: '10:50',
      recurrence: 'once',
      weekdays: [],
      notes: '',
    },
  ],
  exceptions: [
    {
      id: 'cancel-fri',
      kind: 'cancel',
      classId: 'fri-cancelled',
      originalDate: '2026-11-06',
      reason: '강사 일정 조정',
    },
    {
      id: 'close-next-thu',
      kind: 'closed',
      date: '2026-11-12',
      locationId: 'studio-mat',
      reason: '다음 주 목요일 휴관',
    },
  ],
};

function makeAssignment(
  classId: string,
  originalDate: string,
  source: SavedSequence = matSequence,
  state: 'draft' | 'prepared' = 'draft',
  schedule: InstructorScheduleData = baseSchedule,
): DatedSequencePlanAssignment {
  const created = createDatedPlanAssignment({
    schedule,
    sequence: source,
    classId,
    originalDate,
    state,
    now: '2026-11-01T12:00:00.000Z',
    assignmentId: `assign-${classId}-${originalDate}`,
  });
  if (!created.success) throw new Error(created.message);
  return created.assignment;
}

function buildDialogProps(
  overrides: Partial<DatedSequencePlanningDialogProps> = {},
): DatedSequencePlanningDialogProps {
  const planning = overrides.planning ?? { assignments: [] };
  const schedule = overrides.schedule ?? baseSchedule;
  return {
    initialDate: '2026-11-04',
    schedule,
    savedSequences: [matSequence, mismatchSequence, nextWeekExistingSequence],
    exercises: [matExercise, reformerExercise],
    planning,
    onClose: vi.fn(),
    onAssign: vi.fn(() => ({ success: true, message: '회차 계획 저장 완료' })),
    onSetState: vi.fn(() => ({ success: true, message: '정리 상태 업데이트 완료' })),
    onPreviewWeekCopy: vi.fn((sourceStartDate, targetStartDate) =>
      previewDatedPlanWeekCopy({ schedule, planning, sourceStartDate, targetStartDate }),
    ),
    onCopyWeek: vi.fn(() => ({ success: true, message: '다음 주 빈 회차 복사 완료' })),
    onLoadDraft: vi.fn(() => ({ success: true, message: '독립 작업 사본 전환 완료' })),
    onReplaceSnapshot: vi.fn(() => ({ success: true, message: '이 회차 수정본 교체 완료' })),
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

describe('DatedSequencePlanningDialog usability, cancellation, double-click, and copy/replace honesty', () => {
  it('filters unassigned occurrences, previews pre-save venue/time warnings, cancels draft selection cleanly across close/reopen, and supports Escape / detail close focus return', () => {
    const monPrepared = makeAssignment('mw-class', '2026-11-02', matSequence, 'prepared');
    const firstProps = buildDialogProps({
      planning: { assignments: [monPrepared] },
    });
    const { unmount } = render(<DatedSequencePlanningDialog {...firstProps} />);

    // Filter bar separates all 5 week rows vs the 3 unassigned scheduled occurrences
    const filterGroup = screen.getByRole('group', { name: '회차 계획 필터' });
    const allFilterBtn = within(filterGroup).getByRole('button', { name: '전체 (5)' });
    const unassignedFilterBtn = within(filterGroup).getByRole('button', { name: '미지정 (3)' });
    expect(allFilterBtn).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(unassignedFilterBtn);
    expect(unassignedFilterBtn).toHaveAttribute('aria-pressed', 'true');
    const occurrencesSection = screen.getByRole('region', { name: '계획할 수업 회차' });
    expect(within(occurrencesSection).getAllByRole('article')).toHaveLength(3);
    expect(
      within(occurrencesSection).queryByRole('article', { name: '2026-11-02 월수 오전 매트반 예정' }),
    ).not.toBeInTheDocument();

    // Pick Wed 2026-11-04 unassigned occurrence -> row highlights '선택됨' and focuses the sequence <select>
    const wedRow = within(occurrencesSection).getByRole('article', {
      name: '2026-11-04 월수 오전 매트반 예정',
    });
    const assignTriggerBtn = within(wedRow).getByRole('button', { name: '회차 계획 지정' });
    fireEvent.click(assignTriggerBtn);
    expect(wedRow).toHaveAttribute('data-selected', 'true');
    expect(within(wedRow).getByText('선택됨')).toBeVisible();

    const detail = within(screen.getByRole('region', { name: '선택한 회차 계획' }));
    const select = detail.getByLabelText('이 회차에 사용할 저장 시퀀스');
    expect(select).toHaveFocus();

    // Selecting mismatchSequence surfaces live venue/equipment/prop & duration warnings BEFORE saving
    fireEvent.change(select, { target: { value: mismatchSequence.id } });
    const candidateSummary = detail.getByTestId('dated-planning-candidate-summary');
    expect(candidateSummary).toHaveTextContent('목표 60분 · 난이도 2.0 · 리포머 · 단계 1개');
    expect(candidateSummary).toHaveTextContent('장소 준비물 부족: 리포머, 써클링 · 매직 서클');
    expect(candidateSummary).toHaveTextContent(/10분 초과/);
    expect(firstProps.onAssign).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(DATED_PLANNING_DRAFT_STORAGE_KEY)).toContain(
      mismatchSequence.id,
    );

    // Cancel selection ('선택 취소') clears both the UI select and sessionStorage draft so reopen starts clean
    fireEvent.click(detail.getByRole('button', { name: '선택 취소' }));
    expect(select).toHaveValue('');
    expect(select).toHaveFocus();
    expect(detail.queryByTestId('dated-planning-candidate-summary')).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem(DATED_PLANNING_DRAFT_STORAGE_KEY)).toBeNull();

    unmount();

    // Reopen directly on Wed 2026-11-04 -> cancelled draft is NOT restored, and Mon 2026-11-02 inline Escape / close works cleanly
    const reopenProps = buildDialogProps({
      initialOccurrence: { classId: 'mw-class', originalDate: '2026-11-04' },
      planning: { assignments: [monPrepared] },
    });
    render(<DatedSequencePlanningDialog {...reopenProps} />);
    const reopenedDetail = within(screen.getByRole('region', { name: '선택한 회차 계획' }));
    expect(reopenedDetail.getByLabelText('이 회차에 사용할 저장 시퀀스')).toHaveValue('');
    expect(reopenedDetail.queryByTestId('dated-planning-draft-restored')).not.toBeInTheDocument();

    // Close occurrence detail -> returns to list without closing the dialog
    fireEvent.click(reopenedDetail.getByRole('button', { name: '회차 선택 닫기' }));
    expect(screen.queryByRole('region', { name: '선택한 회차 계획' })).not.toBeInTheDocument();
    expect(reopenProps.onClose).not.toHaveBeenCalled();

    // Open Mon 2026-11-02 prepared plan, verify bilateral side labels ('왼쪽 → 오른쪽' & '양쪽 함께') and prop warning, and cancel sub-panels via Escape
    const monRow = screen.getByRole('article', { name: '2026-11-02 월수 오전 매트반 예정' });
    fireEvent.click(within(monRow).getByRole('button', { name: '저장 계획 보기' }));
    const monDetail = within(screen.getByRole('region', { name: '선택한 회차 계획' }));
    fireEvent.click(monDetail.getByText('저장한 계획 단계 2개 보기'));
    expect(monDetail.getByText(/왼쪽 → 오른쪽 · 8회 × 2세트/)).toBeVisible();

    fireEvent.click(monDetail.getByText('이 회차에 저장한 수정본 연결'));
    fireEvent.change(monDetail.getByLabelText('이 회차에 연결할 저장 수정본'), {
      target: { value: mismatchSequence.id },
    });
    const diffBtn = monDetail.getByRole('button', { name: '수정본 차이 확인' });
    fireEvent.click(diffBtn);
    const revisionGroup = monDetail.getByRole('group', { name: '이 회차 계획 수정 미리보기' });
    fireEvent.click(within(revisionGroup).getByText('선택한 수정본의 전체 계획 단계 보기'));
    expect(within(revisionGroup).getByText(/양쪽 함께 · 10회 × 2세트/)).toBeVisible();
    expect(
      within(revisionGroup).getByText('장소 준비물 부족: 리포머, 써클링 · 매직 서클'),
    ).toBeVisible();
    fireEvent.keyDown(revisionGroup, { key: 'Escape' });
    expect(
      monDetail.queryByRole('group', { name: '이 회차 계획 수정 미리보기' }),
    ).not.toBeInTheDocument();
    expect(diffBtn).toHaveFocus();

    const editBtn = screen.getByRole('button', { name: '작업 사본으로 편집' });
    fireEvent.click(editBtn);
    const confirmGroup = screen.getByRole('group', { name: '작업 사본 열기 확인' });
    fireEvent.keyDown(confirmGroup, { key: 'Escape' });
    expect(screen.queryByRole('group', { name: '작업 사본 열기 확인' })).not.toBeInTheDocument();
    expect(editBtn).toHaveFocus();
    expect(reopenProps.onClose).not.toHaveBeenCalled();
  });

  it('resets occurrence detail, filter pills, and replace banner on date/mode transitions while marking open week-copy previews stale', () => {
    const monAssigned = makeAssignment('mw-class', '2026-11-02', matSequence, 'draft');
    const dialogProps = buildDialogProps({
      planning: { assignments: [monAssigned] },
    });
    render(<DatedSequencePlanningDialog {...dialogProps} />);

    // Activate '미지정 (3)' filter, open Mon via '전체 (5)', and open week copy preview
    const filterGroup = screen.getByRole('group', { name: '회차 계획 필터' });
    fireEvent.click(within(filterGroup).getByRole('button', { name: '미지정 (3)' }));
    expect(within(filterGroup).getByRole('button', { name: '미지정 (3)' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // Switching view mode resets occurrence filter back to 'all'
    fireEvent.click(screen.getByRole('button', { name: '일간' }));
    fireEvent.click(screen.getByRole('button', { name: '주간' }));
    expect(
      within(screen.getByRole('group', { name: '회차 계획 필터' })).getByRole('button', {
        name: '전체 (5)',
      }),
    ).toHaveAttribute('aria-pressed', 'true');

    // Open Mon detail + open week copy preview, then navigate to next week
    fireEvent.click(
      within(
        screen.getByRole('article', { name: '2026-11-02 월수 오전 매트반 예정' }),
      ).getByRole('button', { name: '저장 계획 보기' }),
    );
    expect(screen.getByRole('region', { name: '선택한 회차 계획' })).toBeVisible();

    fireEvent.click(screen.getByText('선택한 주를 다음 주로 복사'));
    fireEvent.click(screen.getByRole('button', { name: '다음 주 복사 미리보기' }));
    expect(screen.getByRole('button', { name: '표시한 빈 회차에만 복사' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: '계획 다음 기간' }));
    expect(screen.getByLabelText('계획 기준 날짜')).toHaveValue('2026-11-09');
    expect(screen.queryByRole('region', { name: '선택한 회차 계획' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '표시한 빈 회차에만 복사' })).toBeDisabled();
    expect(screen.getByText(/복사 미리보기를 다시 확인해 주세요/)).toBeVisible();

    // Dismiss stale preview via '미리보기 닫기' and restore focus to '다음 주 복사 미리보기'
    fireEvent.click(screen.getByRole('button', { name: '미리보기 닫기' }));
    expect(screen.queryByLabelText('주간 복사 미리보기')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다음 주 복사 미리보기' })).toHaveFocus();
  });

  it('guards rapid double-clicks across assign, state toggle, snapshot replace, week copy, draft load, and schedule handoff while keeping failures retryable', () => {
    // 1. Assign: first attempt fails -> retryable; rapid double-click on success -> called once
    let assignAttempt = 0;
    const onAssign = vi.fn(() => {
      assignAttempt += 1;
      if (assignAttempt === 1) {
        return { success: false, message: '일시적 검증 실패 · 다시 시도 가능' };
      }
      return { success: true, message: '회차 계획 저장 완료' };
    });
    const assignProps = buildDialogProps({
      initialOccurrence: { classId: 'mw-class', originalDate: '2026-11-04' },
      onAssign,
    });
    const { unmount: unmountAssign } = render(<DatedSequencePlanningDialog {...assignProps} />);
    const select = screen.getByLabelText('이 회차에 사용할 저장 시퀀스');
    fireEvent.change(select, { target: { value: matSequence.id } });
    const saveBtn = screen.getByRole('button', { name: '이 회차에 계획 사본 저장' });

    // First click fails -> shows alert and stays retryable
    fireEvent.click(saveBtn);
    expect(onAssign).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert')).toHaveTextContent('일시적 검증 실패');

    // Rapid double-click on retry -> succeeds once and ignores the duplicate second click
    fireEvent.click(saveBtn);
    fireEvent.click(saveBtn);
    expect(onAssign).toHaveBeenCalledTimes(2);
    unmountAssign();

    // 2. State toggle + Snapshot replace + Week copy + Draft load + Schedule handoff double-click guards
    let currentPlanning: DatedSequencePlanningData = {
      assignments: [makeAssignment('mw-class', '2026-11-02', matSequence, 'draft')],
    };
    const onSetState = vi.fn(() => ({ success: true, message: '준비 표시 완료' }));
    const onReplaceSnapshot = vi.fn((input) => {
      const replaced = replaceDatedPlanSnapshot({
        schedule: baseSchedule,
        planning: currentPlanning,
        assignmentId: input.assignmentId,
        sequence: nextWeekExistingSequence,
        expectedUpdatedAt: input.expectedUpdatedAt,
        expectedOccurrenceSnapshot: input.expectedOccurrenceSnapshot,
        expectedSourceFingerprint: input.expectedSourceFingerprint,
        now: '2026-11-04T15:00:00.000Z',
      });
      if (replaced.success) currentPlanning = replaced.planning;
      return { success: replaced.success, message: replaced.message };
    });
    const onCopyWeek = vi.fn(() => ({ success: true, message: '다음 주 2건 복사 완료' }));
    const onLoadDraft = vi.fn(() => ({ success: true, message: '작업대 열기 완료' }));
    const onLoadSuccess = vi.fn();
    const onOpenScheduleDate = vi.fn();
    const onClose = vi.fn();

    const { rerender, unmount: unmountMain } = render(
      <DatedSequencePlanningDialog
        {...buildDialogProps({
          initialOccurrence: { classId: 'mw-class', originalDate: '2026-11-02' },
          planning: currentPlanning,
          onSetState,
          onReplaceSnapshot,
          onCopyWeek,
          onLoadDraft,
          onLoadSuccess,
          onOpenScheduleDate,
          onClose,
        })}
      />,
    );

    const stateBtn = screen.getByRole('button', { name: '준비 표시로 바꾸기' });
    fireEvent.click(stateBtn);
    fireEvent.click(stateBtn);
    expect(onSetState).toHaveBeenCalledTimes(1);
    expect(onSetState).toHaveBeenCalledWith(
      currentPlanning.assignments[0].id,
      'prepared',
      currentPlanning.assignments[0].updatedAt,
    );

    // Replace snapshot with double-click + verify replace outcome banner reflects actual new snapshot
    fireEvent.click(screen.getByText('이 회차에 저장한 수정본 연결'));
    fireEvent.change(screen.getByLabelText('이 회차에 연결할 저장 수정본'), {
      target: { value: nextWeekExistingSequence.id },
    });
    fireEvent.click(screen.getByRole('button', { name: '수정본 차이 확인' }));
    const confirmReplaceBtn = screen.getByRole('button', {
      name: '이 회차만 수정본으로 바꾸기 확인',
    });
    const originalAssignment = currentPlanning.assignments[0];
    fireEvent.click(confirmReplaceBtn);
    fireEvent.click(confirmReplaceBtn);
    expect(onReplaceSnapshot).toHaveBeenCalledTimes(1);
    expect(onReplaceSnapshot).toHaveBeenCalledWith({
      assignmentId: originalAssignment.id,
      sequenceId: nextWeekExistingSequence.id,
      expectedUpdatedAt: originalAssignment.updatedAt,
      expectedOccurrenceSnapshot: originalAssignment.occurrenceSnapshot,
      expectedSourceFingerprint: getDatedPlanSourceFingerprint(nextWeekExistingSequence),
    });

    rerender(
      <DatedSequencePlanningDialog
        {...buildDialogProps({
          initialOccurrence: { classId: 'mw-class', originalDate: '2026-11-02' },
          planning: currentPlanning,
          onSetState,
          onReplaceSnapshot,
          onCopyWeek,
          onLoadDraft,
          onLoadSuccess,
          onOpenScheduleDate,
          onClose,
        })}
      />,
    );
    const replaceOutcome = screen.getByTestId('dated-planning-replace-outcome');
    expect(replaceOutcome).toHaveTextContent(
      `‘${matSequence.title}’ → ‘${nextWeekExistingSequence.title}’`,
    );
    expect(replaceOutcome).toHaveTextContent('작성 중');

    // Week copy double-click guard
    fireEvent.click(screen.getByText('선택한 주를 다음 주로 복사'));
    fireEvent.click(screen.getByRole('button', { name: '다음 주 복사 미리보기' }));
    const confirmCopyBtn = screen.getByRole('button', { name: '표시한 빈 회차에만 복사' });
    fireEvent.click(confirmCopyBtn);
    fireEvent.click(confirmCopyBtn);
    expect(onCopyWeek).toHaveBeenCalledTimes(1);

    // Draft load double-click guard
    fireEvent.click(screen.getByRole('button', { name: '작업 사본으로 편집' }));
    const confirmLoadBtn = screen.getByRole('button', { name: '새 작업 사본 열기 확인' });
    fireEvent.click(confirmLoadBtn);
    fireEvent.click(confirmLoadBtn);
    expect(onLoadDraft).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onLoadSuccess).toHaveBeenCalledTimes(1);
    unmountMain();

    // Schedule date handoff double-click guard
    const handoffClose = vi.fn();
    const handoffOpenDate = vi.fn();
    render(
      <DatedSequencePlanningDialog
        {...buildDialogProps({
          onClose: handoffClose,
          onOpenScheduleDate: handoffOpenDate,
        })}
      />,
    );
    const openScheduleBtn = screen.getByRole('button', { name: '선택 날짜 일정 열기' });
    fireEvent.click(openScheduleBtn);
    fireEvent.click(openScheduleBtn);
    expect(handoffOpenDate).toHaveBeenCalledTimes(1);
    expect(handoffClose).toHaveBeenCalledTimes(1);
  });

  it('displays actual copied items and all skipped reasons honestly after week copy, never overwrites existing next-week plans, and navigates directly to next week', () => {
    const monSource = makeAssignment('mw-class', '2026-11-02', matSequence, 'prepared');
    const wedSource = makeAssignment('mw-class', '2026-11-04', matSequence, 'draft');
    const tueOnceSource = makeAssignment('tue-once', '2026-11-03', matSequence, 'draft');
    const thuSource = makeAssignment('thu-weekly', '2026-11-05', matSequence, 'draft');
    const nextWedExisting = makeAssignment(
      'mw-class',
      '2026-11-11',
      nextWeekExistingSequence,
      'prepared',
    );

    let livePlanning: DatedSequencePlanningData = {
      assignments: [monSource, wedSource, tueOnceSource, thuSource, nextWedExisting],
    };
    let idSeq = 0;

    const { rerender } = render(
      <DatedSequencePlanningDialog
        {...buildDialogProps({
          planning: livePlanning,
          onPreviewWeekCopy: (sourceStartDate, targetStartDate) =>
            previewDatedPlanWeekCopy({
              schedule: baseSchedule,
              planning: livePlanning,
              sourceStartDate,
              targetStartDate,
            }),
          onCopyWeek: (sourceStartDate, targetStartDate) => {
            const copied = copyDatedPlanWeek({
              schedule: baseSchedule,
              planning: livePlanning,
              sourceStartDate,
              targetStartDate,
              now: '2026-11-08T18:00:00.000Z',
              createId: () => `copied-next-${++idSeq}`,
            });
            if (copied.success) {
              livePlanning = copied.planning;
            }
            return { success: copied.success, message: copied.message };
          },
        })}
      />,
    );

    fireEvent.click(screen.getByText('선택한 주를 다음 주로 복사'));
    expect(
      screen.getByText(/이번 주 연결 계획 4개 · 다음 주 기존 계획 1개 그대로 유지/),
    ).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: '다음 주 복사 미리보기' }));
    const previewRegion = screen.getByLabelText('주간 복사 미리보기');
    expect(within(previewRegion).getByText('새 사본 1개 · 제외 3개 · 기존 계획 충돌 1개')).toBeVisible();
    expect(within(previewRegion).getByText('새로 복사할 빈 회차 (1개)')).toBeVisible();
    expect(within(previewRegion).getByText('제외·유지 항목 (3개)')).toBeVisible();

    fireEvent.click(within(previewRegion).getByRole('button', { name: '표시한 빈 회차에만 복사' }));

    // Rerender with updated livePlanning from copyDatedPlanWeek
    rerender(
      <DatedSequencePlanningDialog
        {...buildDialogProps({
          planning: livePlanning,
          onPreviewWeekCopy: (sourceStartDate, targetStartDate) =>
            previewDatedPlanWeekCopy({
              schedule: baseSchedule,
              planning: livePlanning,
              sourceStartDate,
              targetStartDate,
            }),
        })}
      />,
    );

    const outcome = screen.getByTestId('dated-planning-copy-outcome');
    expect(outcome).toHaveTextContent('복사 완료 요약 · 새 사본 1개 · 건너뜀·유지 3개');
    expect(outcome).toHaveTextContent(/월수 오전 매트반 · 2026-11-09 09:00 · 매트 룸 A · 매트 코어 50분 안 \(작성 중\)/);
    expect(outcome).toHaveTextContent(/월수 오전 매트반 · 2026-11-11 · 기존 계획 있음 · 그대로 유지/);
    expect(outcome).toHaveTextContent(/화요 특강 수업 · 2026-11-10 · 다음 주에 해당 회차 없음/);
    expect(outcome).toHaveTextContent(/목요 저녁 매트반 · 2026-11-12 · 대상 회차가 취소·휴무/);

    // Verify existing next-week plan (2026-11-11) was NOT overwritten and newly copied 2026-11-09 starts as 'draft'
    const preservedWed = livePlanning.assignments.find(
      (item) => item.classId === 'mw-class' && item.originalDate === '2026-11-11',
    )!;
    expect(preservedWed.state).toBe('prepared');
    expect(preservedWed.sequenceSnapshot.title).toBe(nextWeekExistingSequence.title);

    const copiedMon = livePlanning.assignments.find(
      (item) => item.classId === 'mw-class' && item.originalDate === '2026-11-09',
    )!;
    expect(copiedMon.state).toBe('draft');
    expect(copiedMon.sequenceSnapshot.title).toBe(matSequence.title);

    // One-tap jump to next week (2026-11-09) clears summary and displays next week's classes
    fireEvent.click(
      within(outcome).getByRole('button', { name: '다음 주 회차 보기 (2026-11-09)' }),
    );
    expect(screen.getByLabelText('계획 기준 날짜')).toHaveValue('2026-11-09');
    expect(screen.queryByTestId('dated-planning-copy-outcome')).not.toBeInTheDocument();
    expect(
      screen.getByRole('article', { name: '2026-11-09 월수 오전 매트반 예정' }),
    ).toHaveTextContent('작성 중');
  });

  it('handles empty day, empty saved sequences, all-assigned filter state, and zero-candidate week copy gracefully', () => {
    // 1. Empty day ('2026-11-07' Saturday) with scheduled classes in the same week offers a 1-tap switch to week view
    const { unmount } = render(
      <DatedSequencePlanningDialog
        {...buildDialogProps({
          initialDate: '2026-11-07',
          initialMode: 'day',
          savedSequences: [],
        })}
      />,
    );

    expect(
      screen.getByText('이 기간에 등록된 수업 회차가 없습니다. 일정 화면에서 수업을 먼저 등록해 주세요.'),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '이번 주 수업 보기 (4회)' }));
    expect(screen.getByRole('button', { name: '주간' })).toHaveAttribute('aria-pressed', 'true');

    // Empty savedSequences disables <select> cleanly with clear guidance
    const monArticle = screen.getByRole('article', { name: '2026-11-02 월수 오전 매트반 예정' });
    fireEvent.click(within(monArticle).getByRole('button', { name: '회차 계획 지정' }));
    const emptySelect = screen.getByLabelText('이 회차에 사용할 저장 시퀀스');
    expect(emptySelect).toBeDisabled();
    expect(screen.getByText('먼저 작업대에서 시퀀스를 저장해 주세요.')).toBeVisible();
    expect(screen.getByRole('button', { name: '이 회차에 계획 사본 저장' })).toBeDisabled();

    // Zero-candidate week copy preview explains empty state and keeps commit button disabled
    fireEvent.click(screen.getByText('선택한 주를 다음 주로 복사'));
    expect(
      screen.getByText(/이번 주 연결 계획 0개.*이번 주 회차에 계획을 먼저 연결하면/),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '다음 주 복사 미리보기' }));
    expect(
      screen.getByText(
        '새로 복사할 빈 회차가 없습니다. 기존 계획과 취소·휴무 회차는 변경하지 않습니다.',
      ),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: '표시한 빈 회차에만 복사' })).toBeDisabled();
    unmount();

    // 2. When 'unassigned' filter is active and the last unassigned scheduled item gets assigned via prop update, shows '전체 회차 보기' recovery
    const monPlan = makeAssignment('mw-class', '2026-11-02', matSequence, 'prepared');
    const tuePlan = makeAssignment('tue-once', '2026-11-03', matSequence, 'draft');
    const wedPlan = makeAssignment('mw-class', '2026-11-04', matSequence, 'draft');
    const thuPlan = makeAssignment('thu-weekly', '2026-11-05', matSequence, 'draft');
    const { rerender } = render(
      <DatedSequencePlanningDialog
        {...buildDialogProps({
          planning: { assignments: [monPlan, tuePlan, wedPlan] },
        })}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '미지정 (1)' }));
    expect(screen.getAllByRole('article')).toHaveLength(1);

    rerender(
      <DatedSequencePlanningDialog
        {...buildDialogProps({
          planning: { assignments: [monPlan, tuePlan, wedPlan, thuPlan] },
        })}
      />,
    );
    expect(
      screen.getByText('이 기간의 예정 수업은 모두 계획 사본이 연결되어 있습니다.'),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '전체 회차 보기' }));
    expect(screen.getAllByRole('article')).toHaveLength(5);
  });

  it('does not claim unverified previews before props update, distinguishes 0 and partial additions, and prevents unrelated occurrence additions from polluting the copy summary', () => {
    const copyIsolationSchedule: InstructorScheduleData = {
      locations: baseSchedule.locations,
      classes: [
        baseSchedule.classes[0],
        baseSchedule.classes[1],
        {
          id: 'next-fri-once',
          title: '다음 주 금요 별도 특강',
          participantAlias: '',
          locationId: 'studio-mat',
          startDate: '2026-11-13',
          startTime: '15:00',
          endTime: '15:50',
          recurrence: 'once',
          weekdays: [],
          notes: '',
        },
      ],
      exceptions: [],
    };

    const monSource = makeAssignment(
      'mw-class',
      '2026-11-02',
      matSequence,
      'prepared',
      copyIsolationSchedule,
    );
    const wedSource = makeAssignment(
      'mw-class',
      '2026-11-04',
      matSequence,
      'draft',
      copyIsolationSchedule,
    );
    const initialPlanning: DatedSequencePlanningData = {
      assignments: [monSource, wedSource],
    };

    // 1. Late props update -> pending state must NOT claim 2 new copies before planning prop updates
    const { rerender, unmount } = render(
      <DatedSequencePlanningDialog
        {...buildDialogProps({
          schedule: copyIsolationSchedule,
          planning: initialPlanning,
          onPreviewWeekCopy: (sourceStartDate, targetStartDate) =>
            previewDatedPlanWeekCopy({
              schedule: copyIsolationSchedule,
              planning: initialPlanning,
              sourceStartDate,
              targetStartDate,
            }),
          onCopyWeek: vi.fn(() => ({
            success: true,
            message: '다음 주 빈 회차 복사 요청 처리됨',
          })),
        })}
      />,
    );

    fireEvent.click(screen.getByText('선택한 주를 다음 주로 복사'));
    fireEvent.click(screen.getByRole('button', { name: '다음 주 복사 미리보기' }));
    const preview = screen.getByLabelText('주간 복사 미리보기');
    expect(within(preview).getByText('새 사본 2개 · 제외 0개 · 기존 계획 충돌 0개')).toBeVisible();
    fireEvent.click(within(preview).getByRole('button', { name: '표시한 빈 회차에만 복사' }));

    // Before planning prop updates: verified copy count is 0, status is 'pending-props'
    const pendingOutcome = screen.getByTestId('dated-planning-copy-outcome');
    expect(pendingOutcome).toHaveAttribute('data-copy-status', 'pending-props');
    expect(pendingOutcome).toHaveTextContent(
      '복사 반영 확인 중 · 확인된 새 사본 0개 (요청 후보 2개) · 건너뜀·유지 0개',
    );
    expect(pendingOutcome).not.toHaveTextContent('복사된 다음 주 회차');

    // 2. Intermediate prop update adds ONLY unrelated occurrences (source week, target week non-proposal, week+2)
    const unrelatedSourceTue = makeAssignment(
      'tue-once',
      '2026-11-03',
      matSequence,
      'draft',
      copyIsolationSchedule,
    );
    const unrelatedTargetFri = makeAssignment(
      'next-fri-once',
      '2026-11-13',
      matSequence,
      'draft',
      copyIsolationSchedule,
    );
    const unrelatedTwoWeeksOut = makeAssignment(
      'mw-class',
      '2026-11-16',
      matSequence,
      'draft',
      copyIsolationSchedule,
    );

    rerender(
      <DatedSequencePlanningDialog
        {...buildDialogProps({
          schedule: copyIsolationSchedule,
          planning: {
            assignments: [
              ...initialPlanning.assignments,
              unrelatedSourceTue,
              unrelatedTargetFri,
              unrelatedTwoWeeksOut,
            ],
          },
        })}
      />,
    );

    const unpollutedZeroOutcome = screen.getByTestId('dated-planning-copy-outcome');
    expect(unpollutedZeroOutcome).toHaveAttribute('data-copy-status', 'zero-copied');
    expect(unpollutedZeroOutcome).toHaveTextContent(
      '복사 후 추가된 계획 없음 · 확인된 새 사본 0개 · 건너뜀·유지 0개 · 미반영 후보 2개',
    );
    expect(unpollutedZeroOutcome).not.toHaveTextContent('화요 특강 수업');
    expect(unpollutedZeroOutcome).not.toHaveTextContent('다음 주 금요 별도 특강');
    expect(unpollutedZeroOutcome).not.toHaveTextContent('2026-11-16');

    // 3. Delayed copy prop update lands PARTIALLY (only 2026-11-09 copied; 2026-11-11 occupied by conflicting existing sequence) + another week's plan (2026-11-18)
    const copiedNextMon: DatedSequencePlanAssignment = {
      ...makeAssignment('mw-class', '2026-11-09', matSequence, 'draft', copyIsolationSchedule),
      id: 'actual-copied-2026-11-09',
    };
    const conflictingNextWed: DatedSequencePlanAssignment = {
      ...makeAssignment(
        'mw-class',
        '2026-11-11',
        nextWeekExistingSequence,
        'prepared',
        copyIsolationSchedule,
      ),
      id: 'concurrent-existing-2026-11-11',
    };
    const unrelatedLaterWed = makeAssignment(
      'mw-class',
      '2026-11-18',
      matSequence,
      'draft',
      copyIsolationSchedule,
    );

    rerender(
      <DatedSequencePlanningDialog
        {...buildDialogProps({
          schedule: copyIsolationSchedule,
          planning: {
            assignments: [
              ...initialPlanning.assignments,
              unrelatedSourceTue,
              unrelatedTargetFri,
              unrelatedTwoWeeksOut,
              copiedNextMon,
              conflictingNextWed,
              unrelatedLaterWed,
            ],
          },
        })}
      />,
    );

    const partialOutcome = screen.getByTestId('dated-planning-copy-outcome');
    expect(partialOutcome).toHaveAttribute('data-copy-status', 'partial-copied');
    expect(partialOutcome).toHaveTextContent(
      '일부만 복사됨 · 새 사본 1개 (요청 후보 2개 중) · 건너뜀·유지 1개',
    );
    expect(partialOutcome).toHaveTextContent(
      /월수 오전 매트반 · 2026-11-09 09:00 · 매트 룸 A · 매트 코어 50분 안 \(작성 중\)/,
    );
    expect(partialOutcome).toHaveTextContent(
      /월수 오전 매트반 · 2026-11-11 · 기존 계획 있음 · 그대로 유지/,
    );
    expect(partialOutcome).not.toHaveTextContent('다음 주 금요 별도 특강');
    expect(partialOutcome).not.toHaveTextContent('2026-11-16');
    expect(partialOutcome).not.toHaveTextContent('2026-11-18');
    unmount();

    // 4. Succeeded with 0 added (store contract where added: 0 keeps planning reference unchanged)
    const singleSourcePlanning: DatedSequencePlanningData = { assignments: [monSource] };
    const concurrentOccupiedPlanning: DatedSequencePlanningData = {
      assignments: [
        monSource,
        makeAssignment(
          'mw-class',
          '2026-11-09',
          nextWeekExistingSequence,
          'prepared',
          copyIsolationSchedule,
        ),
      ],
    };

    render(
      <DatedSequencePlanningDialog
        {...buildDialogProps({
          schedule: copyIsolationSchedule,
          planning: singleSourcePlanning,
          onPreviewWeekCopy: (sourceStartDate, targetStartDate) =>
            previewDatedPlanWeekCopy({
              schedule: copyIsolationSchedule,
              planning: singleSourcePlanning,
              sourceStartDate,
              targetStartDate,
            }),
          onCopyWeek: (sourceStartDate, targetStartDate) => {
            const zeroResult = copyDatedPlanWeek({
              schedule: copyIsolationSchedule,
              planning: concurrentOccupiedPlanning,
              sourceStartDate,
              targetStartDate,
              now: '2026-11-08T19:00:00.000Z',
              createId: () => 'unused-copy-id',
            });
            return zeroResult.success
              ? {
                  success: true,
                  message: zeroResult.message,
                  added: zeroResult.added,
                  skipped: zeroResult.skipped,
                  conflicts: zeroResult.conflicts,
                }
              : zeroResult;
          },
        })}
      />,
    );

    fireEvent.click(screen.getByText('선택한 주를 다음 주로 복사'));
    fireEvent.click(screen.getByRole('button', { name: '다음 주 복사 미리보기' }));
    fireEvent.click(screen.getByRole('button', { name: '표시한 빈 회차에만 복사' }));

    const zeroAddedOutcome = screen.getByTestId('dated-planning-copy-outcome');
    expect(zeroAddedOutcome).toHaveAttribute('data-copy-status', 'zero-copied');
    expect(zeroAddedOutcome).toHaveTextContent(
      '복사 후 추가된 계획 없음 · 확인된 새 사본 0개 · 건너뜀·유지 1개',
    );
    expect(zeroAddedOutcome).toHaveTextContent(
      /월수 오전 매트반 · 2026-11-09 · 기존 계획 있음 · 그대로 유지/,
    );
    expect(zeroAddedOutcome).not.toHaveTextContent('복사된 다음 주 회차');
  });
});
