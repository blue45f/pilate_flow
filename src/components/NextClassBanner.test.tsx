import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePilatesStore } from '../store/usePilatesStore';
import type { InstructorScheduledClass } from '../types/instructorSchedule';
import { createEmptyInstructorSchedule } from '../types/instructorSchedule';
import type { SavedSequence, SequenceStep } from '../types/pilates';
import { isExerciseAutoEligible } from '../utils/exerciseReview';
import { getDatedPlanSourceFingerprint } from '../utils/datedSequencePlanning';
import { NextClassBanner } from './NextClassBanner';

const original = usePilatesStore.getState();
const scheduledClass = (id: string, startTime: string): InstructorScheduledClass => ({
  id,
  title: `합성 ${id} 수업`,
  participantAlias: '합성 반 별칭',
  locationId: 'qa-location',
  startDate: '2026-11-04',
  startTime,
  endTime: '12:00',
  recurrence: 'once',
  weekdays: [],
  notes: '',
});
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 4, 10, 0));
  usePilatesStore.setState({
    ...original,
    instructorSchedule: createEmptyInstructorSchedule(),
    datedSequencePlanning: undefined,
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  usePilatesStore.setState(original, true);
});

function installDatedLesson(withMasterLink: boolean) {
  const originalExercise = {
    ...original.exercises[0],
    id: 'qa-dated-cadillac',
    requiredEquipment: ['cadillac'],
    props: ['loop-band'] as const,
    review: undefined,
  };
  const revisedExercise = {
    ...original.exercises[0],
    id: 'qa-dated-chair',
    requiredEquipment: ['chair'],
    props: ['mini-ball'] as const,
    review: undefined,
  };
  const source: SavedSequence = {
    id: 'qa-dated-original',
    title: '합성 날짜별 원본',
    subtitle: '',
    apparatus: 'cadillac',
    level: '1.0',
    focusTags: [],
    targetMinutes: 99,
    createdAt: '',
    updatedAt: '',
    taughtCount: 0,
    steps: [
      {
        stepId: 'dated-motion',
        order: 1,
        blockCategory: 'warmup',
        exerciseId: originalExercise.id,
        durationMin: 45,
        selectedLayer: 'standard',
      },
      {
        stepId: 'dated-rest',
        order: 2,
        blockCategory: 'core',
        exerciseId: '',
        kind: 'rest',
        durationMin: 5,
        selectedLayer: 'standard',
      },
    ],
  };
  const revised: SavedSequence = {
    ...source,
    id: 'qa-dated-revised',
    title: '합성 날짜별 수정본',
    apparatus: 'chair',
    steps: [
      { ...source.steps[0], exerciseId: revisedExercise.id, durationMin: 55 },
      { ...source.steps[1] },
    ],
  };
  const item = {
    ...scheduledClass('날짜별', '11:00'),
    ...(withMasterLink ? { linkSavedSequenceId: source.id } : {}),
  };
  usePilatesStore.setState({
    exercises: [
      { ...originalExercise, props: [...originalExercise.props] },
      { ...revisedExercise, props: [...revisedExercise.props] },
    ],
    savedSequences: [source, revised],
    instructorSchedule: {
      locations: [
        {
          id: 'qa-location',
          alias: '합성 원래 장소',
          equipmentIds: ['cadillac'],
          propIds: [],
          notes: '',
        },
        {
          id: 'qa-other-location',
          alias: '합성 이동 장소',
          equipmentIds: ['chair'],
          propIds: [],
          notes: '',
        },
      ],
      classes: [item],
      exceptions: [],
    },
  });
  expect(
    usePilatesStore.getState().assignSequenceToOccurrence({
      sequenceId: source.id,
      classId: item.id,
      originalDate: '2026-11-04',
      state: 'prepared',
    }).success,
  ).toBe(true);
  return { source, revised, item };
}

describe('next class context from actual local schedule', () => {
  it('starts empty and opens the schedule without loading or changing the draft', () => {
    const steps = usePilatesStore.getState().activeSteps;
    render(<NextClassBanner />);
    expect(screen.getByText('다가오는 수업 일정이 없어요')).toBeInTheDocument();
    expect(screen.queryByText('18:00')).not.toBeInTheDocument();
    expect(screen.queryByText(/Studio A/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '일정 추가' }));
    expect(usePilatesStore.getState().activeTab).toBe('schedule');
    expect(usePilatesStore.getState().activeSteps).toBe(steps);
    expect(usePilatesStore.getState().exercises.filter(isExerciseAutoEligible)).toHaveLength(0);
  });

  it('chooses the actual moved future occurrence and uses linked plan totals and requirements, excluding rests', () => {
    const exercise = {
      ...original.exercises[0],
      id: 'qa-pending-banner',
      requiredEquipment: ['cadillac'],
      props: ['loop-band'] as const,
      review: undefined,
    };
    const steps: SequenceStep[] = [
      {
        stepId: 'qa-movement',
        order: 1,
        blockCategory: 'warmup',
        exerciseId: exercise.id,
        durationMin: 50,
        selectedLayer: 'standard',
      },
      {
        stepId: 'qa-rest',
        order: 2,
        blockCategory: 'core',
        exerciseId: '',
        kind: 'rest',
        durationMin: 10,
        selectedLayer: 'standard',
      },
    ];
    const plan: SavedSequence = {
      id: 'qa-banner-plan',
      title: '합성 연결 계획',
      subtitle: '',
      apparatus: 'cadillac',
      level: '1.0',
      focusTags: [],
      targetMinutes: 99,
      steps,
      createdAt: '',
      updatedAt: '',
      taughtCount: 0,
    };
    const moved = {
      ...scheduledClass('이동', '09:00'),
      startDate: '2026-11-03',
      linkSavedSequenceId: plan.id,
    };
    usePilatesStore.setState({
      exercises: [{ ...exercise, props: [...exercise.props] }],
      savedSequences: [plan],
      instructorSchedule: {
        locations: [
          {
            id: 'qa-location',
            alias: '합성 공간',
            equipmentIds: ['tower'],
            propIds: [],
            notes: '',
          },
        ],
        classes: [
          scheduledClass('지난', '09:00'),
          scheduledClass('취소', '10:15'),
          moved,
          scheduledClass('나중', '11:00'),
        ],
        exceptions: [
          {
            id: 'qa-cancel',
            kind: 'cancel',
            classId: '취소',
            originalDate: '2026-11-04',
            reason: '',
          },
          {
            id: 'qa-move',
            kind: 'reschedule',
            classId: moved.id,
            originalDate: '2026-11-03',
            date: '2026-11-04',
            startTime: '10:30',
            endTime: '11:20',
            reason: '',
          },
        ],
      },
    });
    const draft = usePilatesStore.getState().activeSteps;
    render(<NextClassBanner compact />);
    expect(screen.getByText('10:30')).toBeInTheDocument();
    expect(screen.getByText('합성 이동 수업')).toBeInTheDocument();
    expect(screen.getByText('계획 60분 · 휴식 포함')).toBeInTheDocument();
    expect(screen.getByText('일정 50분')).toBeInTheDocument();
    expect(screen.getByText('준비물 메모: 캐딜락 · 루프 밴드')).toBeInTheDocument();
    expect(screen.queryByText(/타워/)).not.toBeInTheDocument();
    expect(screen.queryByText(/99분/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /10:30 합성 이동 수업 일정 보기/ }));
    expect(usePilatesStore.getState().activeSteps).toBe(draft);
  });

  it('does not infer required equipment from the venue or show classes beyond the 30-day window', () => {
    const upcoming = { ...scheduledClass('미연결', '11:00'), endTime: '11:45' };
    usePilatesStore.setState({
      instructorSchedule: {
        locations: [
          {
            id: 'qa-location',
            alias: '합성 공간',
            equipmentIds: ['reformer'],
            propIds: [],
            notes: '',
          },
        ],
        classes: [upcoming],
        exceptions: [],
      },
    });
    const { rerender } = render(<NextClassBanner />);
    expect(screen.getByText('일정 45분 · 계획 미연결')).toBeInTheDocument();
    expect(screen.getByText('기구·소도구 확인 필요')).toBeInTheDocument();
    expect(screen.queryByText(/리포머/)).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    act(() =>
      usePilatesStore.setState({
        instructorSchedule: {
          locations: [],
          classes: [{ ...upcoming, startDate: '2026-12-05' }],
          exceptions: [],
        },
      }),
    );
    rerender(<NextClassBanner />);
    expect(screen.getByText('다가오는 수업 일정이 없어요')).toBeInTheDocument();
  });

  it('prefers the dated immutable plan totals and requirements after the linked Binder source is edited or deleted', () => {
    const { source, revised } = installDatedLesson(true);
    const assignment = usePilatesStore.getState().datedSequencePlanning!.assignments[0];
    usePilatesStore.setState({
      savedSequences: [{ ...revised, id: source.id, title: '합성 바인더 수정됨' }],
    });
    render(<NextClassBanner />);
    expect(screen.getByText('회차 계획 50분 · 휴식 포함')).toBeInTheDocument();
    expect(screen.getByText('준비물 메모: 캐딜락 · 루프 밴드')).toBeInTheDocument();
    expect(screen.queryByText(/체어|미니볼|99분/)).not.toBeInTheDocument();
    expect(screen.queryByText(/계획 미연결/)).not.toBeInTheDocument();
    expect(screen.queryByText('회차 날짜·시간·장소 변경 확인 필요')).not.toBeInTheDocument();
    act(() => usePilatesStore.setState({ savedSequences: [] }));
    expect(screen.getByText('회차 계획 50분 · 휴식 포함')).toBeInTheDocument();
    expect(screen.getByText('준비물 메모: 캐딜락 · 루프 밴드')).toBeInTheDocument();
    expect(screen.queryByText('연결한 계획을 찾을 수 없어요.')).not.toBeInTheDocument();
    expect(usePilatesStore.getState().datedSequencePlanning!.assignments[0]).toBe(assignment);
    expect(usePilatesStore.getState().exercises.filter(isExerciseAutoEligible)).toHaveLength(0);
  });

  it('updates to the current dated revision instead of its prior version or the unlinked master', () => {
    const { revised } = installDatedLesson(false);
    render(<NextClassBanner compact />);
    expect(screen.getByText('회차 계획 50분 · 휴식 포함')).toBeInTheDocument();
    const state = usePilatesStore.getState(),
      assignment = state.datedSequencePlanning!.assignments[0];
    act(() => {
      expect(
        state.replaceDatedSequencePlanSnapshot({
          assignmentId: assignment.id,
          sequenceId: revised.id,
          expectedUpdatedAt: assignment.updatedAt,
          expectedOccurrenceSnapshot: assignment.occurrenceSnapshot,
          expectedSourceFingerprint: getDatedPlanSourceFingerprint(revised),
        }).success,
      ).toBe(true);
    });
    expect(screen.getByText('회차 계획 60분 · 휴식 포함')).toBeInTheDocument();
    expect(screen.getByText('준비물 메모: 체어 · 미니볼')).toBeInTheDocument();
    expect(screen.queryByText('회차 계획 50분 · 휴식 포함')).not.toBeInTheDocument();
    expect(screen.queryByText(/캐딜락|루프 밴드|99분|계획 미연결/)).not.toBeInTheDocument();
    const current = usePilatesStore.getState().datedSequencePlanning!.assignments[0];
    expect(current.priorVersions![0].sequenceSnapshot.steps[0].durationMin).toBe(45);
    expect(current.sequenceSnapshot.steps[0].durationMin).toBe(55);
  });

  it('finds a moved occurrence by its original date and warns on context drift without changing plans or the draft', () => {
    const { item } = installDatedLesson(false),
      schedule = usePilatesStore.getState().instructorSchedule;
    usePilatesStore.setState({
      instructorSchedule: {
        ...schedule,
        exceptions: [
          {
            id: 'qa-dated-move',
            kind: 'reschedule',
            classId: item.id,
            originalDate: '2026-11-04',
            date: '2026-11-05',
            startTime: '09:00',
            endTime: '09:50',
            locationId: 'qa-other-location',
            reason: '',
          },
        ],
      },
    });
    const before = usePilatesStore.getState();
    render(<NextClassBanner />);
    expect(screen.getByText('09:00')).toBeInTheDocument();
    expect(screen.getByText('회차 계획 50분 · 휴식 포함')).toBeInTheDocument();
    expect(screen.getByText('회차 날짜·시간·장소 변경 확인 필요')).toBeInTheDocument();
    expect(screen.getByText('준비물 메모: 캐딜락 · 루프 밴드')).toBeInTheDocument();
    expect(screen.queryByText(/계획 미연결/)).not.toBeInTheDocument();
    expect(usePilatesStore.getState()).toBe(before);
    fireEvent.click(screen.getByRole('button', { name: /09:00 합성 날짜별 수업 일정 보기/ }));
    const after = usePilatesStore.getState();
    expect(after.activeTab).toBe('schedule');
    for (const key of [
      'activeSequenceId',
      'activeTitle',
      'activeSteps',
      'draftCriteria',
      'lastCriteria',
      'datedSequencePlanning',
      'savedSequences',
      'historyLogs',
      'exercises',
      'ownedEquipment',
      'ownedProps',
      'undoStack',
    ] as const)
      expect(after[key]).toBe(before[key]);
    expect(after.exercises.filter(isExerciseAutoEligible)).toHaveLength(0);
  });
});
