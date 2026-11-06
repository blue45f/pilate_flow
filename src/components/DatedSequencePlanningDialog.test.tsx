import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES, INITIAL_SAVED_SEQUENCES } from '../data/pilatesCatalog';
import type {
  DatedSequencePlanAssignment,
  DatedSequencePlanningData,
} from '../types/datedSequencePlanning';
import type { InstructorScheduleData } from '../types/instructorSchedule';
import type { PilatesExercise, SavedSequence } from '../types/pilates';
import {
  createDatedPlanAssignment,
  getDatedPlanKey,
  getDatedPlanSourceFingerprint,
  previewDatedPlanWeekCopy,
} from '../utils/datedSequencePlanning';
import {
  DatedSequencePlanningDialog,
  type DatedSequencePlanningDialogProps,
} from './DatedSequencePlanningDialog';

const exercise: PilatesExercise = {
  ...INITIAL_EXERCISES[0],
  id: 'dated-exercise',
  nameKo: '계획 동작',
  requiredEquipment: ['mat'],
  props: [],
  apparatus: 'mat',
};
const sequence: SavedSequence = {
  ...INITIAL_SAVED_SEQUENCES[0],
  id: 'dated-sequence',
  title: '저장해 둔 계획',
  apparatus: 'mat',
  targetMinutes: 50,
  updatedAt: '2026-11-01T09:00:00.000Z',
  steps: [
    {
      stepId: 'work',
      order: 1,
      exerciseId: exercise.id,
      blockCategory: 'core',
      durationMin: 45,
      selectedLayer: 'standard',
      repetitions: 8,
      sets: 2,
      sideMode: 'left-then-right',
      instructorNote: '독립 사본의 메모',
    },
    {
      stepId: 'rest',
      order: 2,
      kind: 'rest',
      exerciseId: '',
      blockCategory: 'core',
      durationMin: 5,
      selectedLayer: 'standard',
    },
  ],
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
    {
      id: 'once',
      title: '한 번 수업',
      participantAlias: '',
      locationId: 'studio',
      startDate: '2026-11-03',
      startTime: '10:00',
      endTime: '10:50',
      recurrence: 'once',
      weekdays: [],
      notes: '',
    },
    {
      id: 'cancelled',
      title: '취소된 수업',
      participantAlias: '',
      locationId: 'studio',
      startDate: '2026-11-04',
      startTime: '11:00',
      endTime: '11:50',
      recurrence: 'once',
      weekdays: [],
      notes: '',
    },
    {
      id: 'closed',
      title: '휴무 수업',
      participantAlias: '',
      locationId: 'studio',
      startDate: '2026-11-05',
      startTime: '11:00',
      endTime: '11:50',
      recurrence: 'once',
      weekdays: [],
      notes: '',
    },
  ],
  exceptions: [
    {
      id: 'move',
      kind: 'reschedule',
      classId: 'weekly',
      originalDate: '2026-11-04',
      date: '2026-11-06',
      startTime: '13:00',
      endTime: '13:50',
      reason: '이번 주 변경',
    },
    {
      id: 'cancel',
      kind: 'cancel',
      classId: 'cancelled',
      originalDate: '2026-11-04',
      reason: '직접 취소',
    },
    { id: 'close', kind: 'closed', date: '2026-11-05', locationId: 'studio', reason: '장소 휴무' },
  ],
};

function assignment(
  originalDate = '2026-11-02',
  classId = 'weekly',
  source = sequence,
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

function props(
  overrides: Partial<DatedSequencePlanningDialogProps> = {},
): DatedSequencePlanningDialogProps {
  const planning = overrides.planning ?? { assignments: [] };
  return {
    initialDate: '2026-11-04',
    schedule,
    savedSequences: [sequence],
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

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('dated occurrence revision', () => {
  const revised: SavedSequence = {
    ...sequence,
    id: 'saved-revision',
    title: '직접 저장한 45분 수정본',
    apparatus: 'mixed',
    targetMinutes: 45,
    updatedAt: '2026-11-04T10:00:00.000Z',
    steps: sequence.steps.map((step, index) =>
      index === 0
        ? { ...step, durationMin: 40, repetitions: 12, instructorNote: '수정본에 저장한 메모' }
        : { ...step },
    ),
  };

  function reviewRevision() {
    fireEvent.click(screen.getByText('이 회차에 저장한 수정본 연결'));
    fireEvent.change(screen.getByLabelText('이 회차에 연결할 저장 수정본'), {
      target: { value: revised.id },
    });
    fireEvent.click(screen.getByRole('button', { name: '수정본 차이 확인' }));
    return within(screen.getByRole('group', { name: '이 회차 계획 수정 미리보기' }));
  }

  it('requires a saved-plan choice, difference preview and explicit one-occurrence confirmation', () => {
    const saved = { ...assignment(), state: 'prepared' as const };
    const input = props({
      initialOccurrence: saved,
      planning: { assignments: [saved] },
      savedSequences: [sequence, revised],
    });
    render(<DatedSequencePlanningDialog {...input} />);
    const preview = reviewRevision();
    expect(input.onReplaceSnapshot).not.toHaveBeenCalled();
    const table = preview.getByRole('table', { name: '원래 회차 2026-11-02의 계획·일정 비교' });
    expect(
      within(table).getByRole('row', { name: /전체 계획 · 휴식 포함 50:00 45:00/ }),
    ).toBeVisible();
    expect(
      within(table).getByRole('row', { name: /저장 목표·난이도·기구 분류 .*매트 .*혼합 기구/ }),
    ).toBeVisible();
    expect(preview.getByText(/준비 표시는 작성 중으로 돌아갑니다/)).toBeVisible();
    expect(
      preview.getByText(/다른 회차·저장 시퀀스·실제 수업 기록은 변경하지 않습니다/),
    ).toBeVisible();
    fireEvent.click(preview.getByRole('button', { name: '수정본 연결 취소' }));
    expect(input.onReplaceSnapshot).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '수정본 차이 확인' }));
    fireEvent.click(screen.getByRole('button', { name: '이 회차만 수정본으로 바꾸기 확인' }));
    expect(input.onReplaceSnapshot).toHaveBeenCalledWith({
      assignmentId: saved.id,
      sequenceId: revised.id,
      expectedUpdatedAt: saved.updatedAt,
      expectedOccurrenceSnapshot: saved.occurrenceSnapshot,
      expectedSourceFingerprint: getDatedPlanSourceFingerprint(revised),
    });
  });

  it('invalidates a preview when the saved source changes without changing its timestamp', () => {
    const saved = assignment();
    const input = props({
      initialOccurrence: saved,
      planning: { assignments: [saved] },
      savedSequences: [sequence, revised],
    });
    const { rerender } = render(<DatedSequencePlanningDialog {...input} />);
    reviewRevision();
    const changed = {
      ...revised,
      steps: revised.steps.map((step, index) =>
        index === 0 ? { ...step, repetitions: 18 } : step,
      ),
    };
    rerender(<DatedSequencePlanningDialog {...input} savedSequences={[sequence, changed]} />);
    expect(screen.getByRole('button', { name: '이 회차만 수정본으로 바꾸기 확인' })).toBeDisabled();
    expect(screen.getByText(/ 수정본 차이를 다시 확인해 주세요/)).toBeVisible();
    expect(input.onReplaceSnapshot).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '수정본 차이 확인' }));
    fireEvent.click(screen.getByRole('button', { name: '이 회차만 수정본으로 바꾸기 확인' }));
    expect(input.onReplaceSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedSourceFingerprint: getDatedPlanSourceFingerprint(changed),
      }),
    );
    expect(getDatedPlanSourceFingerprint(changed)).not.toBe(getDatedPlanSourceFingerprint(revised));
  });

  it('invalidates the preview when the assignment version changes', () => {
    const saved = assignment();
    const input = props({
      initialOccurrence: saved,
      planning: { assignments: [saved] },
      savedSequences: [sequence, revised],
    });
    const { rerender } = render(<DatedSequencePlanningDialog {...input} />);
    reviewRevision();
    rerender(
      <DatedSequencePlanningDialog
        {...input}
        planning={{
          assignments: [{ ...saved, state: 'prepared', updatedAt: '2026-11-04T11:00:00.000Z' }],
        }}
      />,
    );
    expect(screen.getByRole('button', { name: '이 회차만 수정본으로 바꾸기 확인' })).toBeDisabled();
    expect(input.onReplaceSnapshot).not.toHaveBeenCalled();
  });

  it('explicitly previews and rebinds a moved date/time/venue while ordinary load stays blocked', () => {
    const saved = assignment();
    const movedSchedule: InstructorScheduleData = {
      ...schedule,
      locations: [
        ...schedule.locations,
        { ...schedule.locations[0], id: 'new-venue', alias: '변경 공간' },
      ],
      exceptions: [
        ...schedule.exceptions,
        {
          id: 'move-first',
          kind: 'reschedule',
          classId: 'weekly',
          originalDate: '2026-11-02',
          date: '2026-11-03',
          startTime: '14:00',
          endTime: '14:50',
          locationId: 'new-venue',
          reason: '장소·시간 변경',
        },
      ],
    };
    const input = props({
      initialOccurrence: saved,
      schedule: movedSchedule,
      planning: { assignments: [saved] },
      savedSequences: [sequence, revised],
    });
    render(<DatedSequencePlanningDialog {...input} />);
    expect(screen.getByRole('button', { name: '작업 사본으로 편집' })).toBeDisabled();
    const preview = reviewRevision();
    expect(
      preview.getByRole('row', {
        name: /회차 날짜·시각·장소 2026-11-02 09:00–09:50 · 내 스튜디오 2026-11-03 14:00–14:50 · 변경 공간/,
      }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: '이 회차만 수정본으로 바꾸기 확인' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '이 회차만 수정본으로 바꾸기 확인' }));
    expect(input.onReplaceSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        assignmentId: saved.id,
        expectedOccurrenceSnapshot: {
          date: '2026-11-03',
          startTime: '14:00',
          endTime: '14:50',
          locationId: 'new-venue',
        },
      }),
    );
  });

  it('keeps prior complete planning versions inspectable and separate from actual class history', () => {
    const previous = { ...assignment(), state: 'prepared' as const };
    const current = {
      ...previous,
      state: 'draft' as const,
      sourceSequenceId: revised.id,
      sequenceSnapshot: revised,
      priorVersions: [previous],
      updatedAt: '2026-11-04T11:00:00.000Z',
    };
    render(
      <DatedSequencePlanningDialog
        {...props({
          initialOccurrence: current,
          planning: { assignments: [current] },
          savedSequences: [sequence, revised],
        })}
      />,
    );
    fireEvent.click(screen.getByText('계획 변경 이력 1개 · 실제 수업 기록과 별개'));
    fireEvent.click(screen.getByText(`이전 버전 1 · ${sequence.title}`));
    const history = document.querySelector('.dated-planning-version-history')!;
    expect(within(history as HTMLElement).getByText('독립 사본의 메모')).toBeVisible();
    expect(within(history as HTMLElement).getByText(/왼쪽 → 오른쪽 · 8회 × 2세트/)).toBeVisible();
    expect(within(history as HTMLElement).getByText(/당시 상태: 준비 표시/)).toBeVisible();
    expect(within(history as HTMLElement).queryByRole('button')).not.toBeInTheDocument();
    expect(previous.sequenceSnapshot.steps[0].repetitions).toBe(8);
  });

  it('reports a rejected stale commit without replacing or dismissing the current plan', () => {
    const saved = assignment();
    const input = props({
      initialOccurrence: saved,
      planning: { assignments: [saved] },
      savedSequences: [sequence, revised],
      onReplaceSnapshot: vi.fn(() => ({
        success: false,
        message: '다른 곳에서 계획이 변경되었습니다. 다시 확인해 주세요.',
      })),
    });
    render(<DatedSequencePlanningDialog {...input} />);
    reviewRevision();
    fireEvent.click(screen.getByRole('button', { name: '이 회차만 수정본으로 바꾸기 확인' }));
    expect(screen.getByRole('alert')).toHaveTextContent('다른 곳에서 계획이 변경되었습니다.');
    expect(screen.getByRole('group', { name: '이 회차 계획 수정 미리보기' })).toBeVisible();
    expect(input.onClose).not.toHaveBeenCalled();
    expect(saved.sequenceSnapshot.title).toBe(sequence.title);
  });
});

describe('bounded dated sequence planning dialog', () => {
  it('provides month/week/day navigation without expanding the default schedule page', () => {
    const input = props();
    render(<DatedSequencePlanningDialog {...input} />);
    expect(screen.getByRole('dialog', { name: '주·월 시퀀스 계획' })).toBeVisible();
    expect(screen.getByRole('button', { name: '주간' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('2026-11-02 – 2026-11-08 · 예정 3회')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '월간' }));
    expect(screen.getByRole('region', { name: '월간 계획 날짜 선택' })).toBeVisible();
    expect(screen.getByRole('button', { name: '2026-11-30 예정 1회 계획 0개' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /2026-11-31/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '계획 다음 기간' }));
    expect(screen.getByLabelText('계획 기준 날짜')).toHaveValue('2026-12-01');
    fireEvent.click(screen.getByRole('button', { name: '계획 이전 기간' }));
    fireEvent.click(screen.getByRole('button', { name: '2026-11-03 예정 1회 계획 0개' }));
    fireEvent.click(screen.getByRole('button', { name: '일간' }));
    expect(screen.getByText('2026-11-03 – 2026-11-03 · 예정 1회')).toBeVisible();
    expect(input.onAssign).not.toHaveBeenCalled();
    expect(input.onCopyWeek).not.toHaveBeenCalled();
  });

  it('assigns only after selection and an explicit save, using original recurrence identity after a move', () => {
    const input = props();
    render(<DatedSequencePlanningDialog {...input} />);
    const moved = within(screen.getByRole('article', { name: '2026-11-04 반복 수업 이동' }));
    expect(moved.queryByRole('button', { name: '회차 계획 지정' })).not.toBeInTheDocument();
    fireEvent.click(moved.getByRole('button', { name: '변경 날짜로 보기' }));
    expect(screen.getByLabelText('계획 기준 날짜')).toHaveValue('2026-11-06');
    const details = within(screen.getByRole('region', { name: '선택한 회차 계획' }));
    expect(details.getByText(/원래 회차 2026-11-04 · 현재 2026-11-06/)).toBeVisible();
    fireEvent.change(details.getByLabelText('이 회차에 사용할 저장 시퀀스'), {
      target: { value: sequence.id },
    });
    expect(input.onAssign).not.toHaveBeenCalled();
    fireEvent.click(details.getByRole('button', { name: '이 회차에 계획 사본 저장' }));
    expect(input.onAssign).toHaveBeenCalledWith({
      sequenceId: sequence.id,
      classId: 'weekly',
      originalDate: '2026-11-04',
      state: 'draft',
    });
  });

  it('shows cancelled and closed occurrences without allowing new plan assignment', () => {
    const input = props();
    render(<DatedSequencePlanningDialog {...input} />);
    for (const name of ['2026-11-04 취소된 수업 취소', '2026-11-05 휴무 수업 휴무']) {
      const row = within(screen.getByRole('article', { name }));
      expect(row.getByRole('button', { name: '계획 연결 불가' })).toBeDisabled();
    }
    expect(input.onAssign).not.toHaveBeenCalled();
  });

  it('shows the immutable snapshot, rest/count/side details and changed or missing source metadata', () => {
    const saved = assignment();
    const input = props({
      initialOccurrence: saved,
      planning: { assignments: [saved] },
      savedSequences: [
        { ...sequence, title: '나중에 바꾼 원본', updatedAt: '2026-11-03T10:00:00.000Z' },
      ],
    });
    const { rerender } = render(<DatedSequencePlanningDialog {...input} />);
    const detail = screen.getByRole('region', { name: '선택한 회차 계획' });
    expect(within(detail).getByRole('heading', { name: sequence.title })).toBeVisible();
    expect(within(detail).getByText(/계획 50:00 · 그 안의 휴식 05:00/)).toBeVisible();
    expect(within(detail).getByText(/원본 시퀀스가 이후 수정되었습니다/)).toBeVisible();
    fireEvent.click(within(detail).getByText('저장한 계획 단계 2개 보기'));
    expect(within(detail).getByText(/왼쪽 → 오른쪽 · 8회 × 2세트/)).toBeVisible();
    expect(within(detail).getByText('독립 사본의 메모')).toBeVisible();
    rerender(<DatedSequencePlanningDialog {...input} savedSequences={[]} />);
    expect(within(detail).getByText(/저장 원본을 찾을 수 없어도/)).toBeVisible();
    expect(saved.sequenceSnapshot.title).toBe(sequence.title);
  });

  it('labels prepared as organization and sends an expected-version state change explicitly', () => {
    const saved = assignment();
    const input = props({ initialOccurrence: saved, planning: { assignments: [saved] } });
    render(<DatedSequencePlanningDialog {...input} />);
    const detail = within(screen.getByRole('region', { name: '선택한 회차 계획' }));
    expect(
      detail.getByText(/전문가 검수·동작 적합성·리허설 가능 여부·실제 수업 완료/),
    ).toBeVisible();
    fireEvent.click(detail.getByRole('button', { name: '준비 표시로 바꾸기' }));
    expect(input.onSetState).toHaveBeenCalledWith(saved.id, 'prepared', saved.updatedAt);
  });

  it('requires explicit confirmation before loading a separate workbench draft', () => {
    const saved = assignment();
    const input = props({
      initialOccurrence: saved,
      planning: { assignments: [saved] },
      exercises: [{ ...exercise, requiredEquipment: ['cadillac'] }],
    });
    render(<DatedSequencePlanningDialog {...input} />);
    fireEvent.click(screen.getByRole('button', { name: '작업 사본으로 편집' }));
    expect(input.onLoadDraft).not.toHaveBeenCalled();
    expect(screen.getByRole('group', { name: '작업 사본 열기 확인' })).toHaveTextContent(
      '이전 초안은 실행 취소로 복원',
    );
    const confirmation = within(screen.getByRole('group', { name: '작업 사본 열기 확인' }));
    expect(
      confirmation.getByText(
        '독립 초안에는 장소 연결이 유지되지 않습니다. 수업 전 실제 장소의 기구·소도구를 직접 확인하세요.',
      ),
    ).toBeVisible();
    expect(confirmation.getByText('장소 준비물 부족: 캐딜락')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '돌아가기' }));
    expect(input.onLoadDraft).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '작업 사본으로 편집' }));
    fireEvent.click(screen.getByRole('button', { name: '새 작업 사본 열기 확인' }));
    expect(input.onLoadDraft).toHaveBeenCalledWith(saved.id, saved.updatedAt);
    expect(input.onClose).toHaveBeenCalledTimes(1);
  });

  it('closes the native dialog while mounted before parent dismissal and navigation', () => {
    const events: string[] = [];
    const saved = assignment();
    vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function (
      this: HTMLDialogElement,
    ) {
      expect(this.querySelector('.dated-planning')).not.toBeNull();
      events.push('native-close');
      this.removeAttribute('open');
    });
    const input = props({
      initialOccurrence: saved,
      planning: { assignments: [saved] },
      onClose: vi.fn(() => events.push('parent-close')),
      onLoadSuccess: vi.fn(() => events.push('navigate')),
    });
    const { container } = render(<DatedSequencePlanningDialog {...input} />);
    fireEvent.click(screen.getByRole('button', { name: '작업 사본으로 편집' }));
    fireEvent.click(screen.getByRole('button', { name: '새 작업 사본 열기 확인' }));
    expect(events).toEqual(['native-close', 'parent-close', 'navigate']);
    fireEvent(container.querySelector('dialog')!, new Event('close'));
    expect(input.onClose).toHaveBeenCalledTimes(1);
  });

  it('does not invent bilateral labels when exercise metadata is missing', () => {
    const saved = assignment('2026-11-02', 'weekly', {
      ...sequence,
      steps: sequence.steps.map((step) => ({ ...step, sideMode: undefined })),
    });
    render(
      <DatedSequencePlanningDialog
        {...props({
          initialOccurrence: saved,
          planning: { assignments: [saved] },
          exercises: [],
        })}
      />,
    );
    fireEvent.click(screen.getByText('저장한 계획 단계 2개 보기'));
    expect(screen.getByText(/좌우 정보 없음 · 8회 × 2세트/)).toBeVisible();
    expect(screen.queryByText(/함께 · 8회/)).not.toBeInTheDocument();
  });

  it('blocks prepare and load when the live occurrence context drifts', () => {
    const saved = assignment();
    const changed = {
      ...schedule,
      classes: schedule.classes.map((item) =>
        item.id === 'weekly' ? { ...item, startTime: '08:00' } : item,
      ),
    };
    const input = props({
      initialOccurrence: saved,
      schedule: changed,
      planning: { assignments: [saved] },
    });
    render(<DatedSequencePlanningDialog {...input} />);
    expect(screen.getByRole('button', { name: '준비 표시로 바꾸기' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '작업 사본으로 편집' })).toBeDisabled();
    expect(screen.getByText(/저장 후 회차의 날짜·시각·장소가 변경/)).toBeVisible();
    expect(input.onLoadDraft).not.toHaveBeenCalled();
  });

  it('retains inspectable plans when the original class disappears', () => {
    const saved = assignment();
    render(
      <DatedSequencePlanningDialog
        {...props({ schedule: { ...schedule, classes: [] }, planning: { assignments: [saved] } })}
      />,
    );
    fireEvent.click(screen.getByText('원본 회차를 찾을 수 없는 저장 계획 1개'));
    fireEvent.click(
      screen.getByRole('button', { name: `2026-11-02 · ${sequence.title} · 사본 확인` }),
    );
    expect(screen.getByRole('heading', { name: '원본 수업을 찾을 수 없는 계획' })).toBeVisible();
    expect(screen.getByRole('heading', { name: sequence.title })).toBeVisible();
    expect(screen.getByRole('button', { name: '작업 사본으로 편집' })).toBeDisabled();
  });

  it('previews finite next-week candidates and every skip/conflict before an insert-only commit', () => {
    const planning: DatedSequencePlanningData = {
      assignments: [
        assignment(),
        assignment('2026-11-04'),
        assignment('2026-11-11'),
        assignment('2026-11-03', 'once'),
      ],
    };
    const input = props({ planning });
    render(<DatedSequencePlanningDialog {...input} />);
    fireEvent.click(screen.getByText('선택한 주를 다음 주로 복사'));
    expect(screen.getByText('2026-11-02–2026-11-08 → 2026-11-09–2026-11-15')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: '표시한 빈 회차에만 복사' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다음 주 복사 미리보기' }));
    expect(input.onPreviewWeekCopy).toHaveBeenCalledWith('2026-11-02', '2026-11-09');
    expect(input.onCopyWeek).not.toHaveBeenCalled();
    expect(screen.getByText('새 사본 1개 · 제외 2개 · 기존 계획 충돌 1개')).toBeVisible();
    expect(screen.getByText(/기존 계획 있음 · 그대로 유지/)).toBeVisible();
    expect(screen.getByText(/다음 주에 해당 회차 없음/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '표시한 빈 회차에만 복사' }));
    expect(input.onCopyWeek).toHaveBeenCalledWith('2026-11-02', '2026-11-09');
  });

  it('invalidates a prior preview when planning changes or the user changes the selected week', () => {
    const saved = assignment();
    const input = props({ planning: { assignments: [saved] } });
    const { rerender } = render(<DatedSequencePlanningDialog {...input} />);
    fireEvent.click(screen.getByText('선택한 주를 다음 주로 복사'));
    fireEvent.click(screen.getByRole('button', { name: '다음 주 복사 미리보기' }));
    expect(screen.getByRole('button', { name: '표시한 빈 회차에만 복사' })).toBeEnabled();
    rerender(
      <DatedSequencePlanningDialog
        {...input}
        planning={{ assignments: [saved, assignment('2026-11-09')] }}
      />,
    );
    expect(screen.getByRole('button', { name: '표시한 빈 회차에만 복사' })).toBeDisabled();
    expect(screen.getByText(/복사 미리보기를 다시 확인/)).toBeVisible();
    fireEvent.change(screen.getByLabelText('계획 기준 날짜'), { target: { value: '2026-11-16' } });
    expect(screen.getByRole('button', { name: '표시한 빈 회차에만 복사' })).toBeDisabled();
    expect(input.onCopyWeek).not.toHaveBeenCalled();
  });

  it('keeps dates bounded and refuses a copy whose destination seven-day window exceeds the range', () => {
    const input = props({ initialDate: '2199-12-31' });
    render(<DatedSequencePlanningDialog {...input} />);
    fireEvent.click(screen.getByRole('button', { name: '일간' }));
    fireEvent.click(screen.getByRole('button', { name: '계획 다음 기간' }));
    expect(screen.getByLabelText('계획 기준 날짜')).toHaveValue('2199-12-31');
    expect(screen.getByRole('alert')).toHaveTextContent('1900년부터 2199년');
    fireEvent.click(screen.getByText('선택한 주를 다음 주로 복사'));
    expect(screen.getByRole('button', { name: '다음 주 복사 미리보기' })).toBeDisabled();
    expect(input.onPreviewWeekCopy).not.toHaveBeenCalled();
  });

  it('exposes an error for failed actions without closing or claiming success', () => {
    const saved = assignment();
    const input = props({
      initialOccurrence: saved,
      planning: { assignments: [saved] },
      onLoadDraft: vi.fn(() => ({ success: false, message: '현재 일정이 바뀌었습니다.' })),
    });
    render(<DatedSequencePlanningDialog {...input} />);
    fireEvent.click(screen.getByRole('button', { name: '작업 사본으로 편집' }));
    fireEvent.click(screen.getByRole('button', { name: '새 작업 사본 열기 확인' }));
    expect(screen.getByRole('alert')).toHaveTextContent('현재 일정이 바뀌었습니다.');
    expect(input.onClose).not.toHaveBeenCalled();
    expect(getDatedPlanKey(saved.classId, saved.originalDate)).toBe('["weekly","2026-11-02"]');
  });
});
