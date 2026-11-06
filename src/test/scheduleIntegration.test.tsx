import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InstructorScheduleView } from '../components/InstructorScheduleView';
import { INITIAL_CLASS_GROUPS, INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import { createEmptyInstructorSchedule } from '../types/instructorSchedule';
import type { AutoGenerateCriteria, SavedSequence, SequenceStep } from '../types/pilates';
import { isExerciseAutoEligible } from '../utils/exerciseReview';
import { formatScheduleDate } from '../utils/instructorSchedule';
import { syntheticPlanningExercise } from './planningFixtures';

const original = usePilatesStore.getState();
const production = structuredClone(INITIAL_EXERCISES);
const productionIds = new Set(production.map((exercise) => exercise.id));
const today = '2026-11-02'; // Monday: recurrence/date behavior must not depend on the runner's clock.
const locationAlias = '합성 QA 아주 긴 한글 수업 준비 장소 별칭 · 실제 장소 아님';
const weeklyTitle = '합성 QA 월수 저녁반의 휴식 포함 반복 수업 · 실제 일정 아님';
const exercises = (['warmup', 'bridging', 'core', 'upper-body', 'cooldown'] as const).map((block) =>
  syntheticPlanningExercise('reformer', block),
);
const exerciseSteps: SequenceStep[] = exercises.map((exercise, index) => ({
  stepId: `qa-schedule-motion-${index}`,
  order: index + 1,
  exerciseId: exercise.id,
  blockCategory: exercise.blockCategory,
  durationMin: 11,
  selectedLayer: 'standard',
}));
const steps: SequenceStep[] = [
  ...exerciseSteps.slice(0, 2),
  {
    kind: 'rest',
    stepId: 'qa-schedule-locked-rest',
    order: 3,
    exerciseId: '',
    blockCategory: 'core',
    durationMin: 5,
    selectedLayer: 'standard',
    locked: true,
    instructorNote: '합성 QA 현재 초안의 잠근 휴식',
  },
  ...exerciseSteps.slice(2).map((step, index) => ({ ...step, order: index + 4 })),
];
const criteria: AutoGenerateCriteria = {
  apparatus: 'reformer',
  ownedApparatus: ['reformer'],
  availableEquipment: ['reformer'],
  level: '1.0',
  focusPreset: 'full-body',
  preferredProps: ['none'],
  excludeDaysWindow: 0,
  targetMinutes: 60,
  restMinutes: 5,
  defaultLayer: 'standard',
};
const saved: SavedSequence = {
  id: 'qa-schedule-linked-plan',
  title: '합성 QA 동작 55분과 휴식 5분인 연결 계획',
  subtitle: '합성 검증용 · 실제 수업용 아님',
  apparatus: 'reformer',
  level: '1.0',
  focusTags: [],
  targetMinutes: 60,
  steps,
  createdAt: '2026-11-01T12:00:00Z',
  updatedAt: '2026-11-01T12:00:00Z',
  taughtCount: 1,
  criteriaSnapshot: criteria,
};
const protectedDraft = () => {
  const state = usePilatesStore.getState();
  return structuredClone({
    activeSequenceId: state.activeSequenceId,
    activeTitle: state.activeTitle,
    activeSteps: state.activeSteps,
    activeTargetMinutes: state.activeTargetMinutes,
    lastCriteria: state.lastCriteria,
    draftCriteria: state.draftCriteria,
    historyLogs: state.historyLogs,
    ownedEquipment: state.ownedEquipment,
    ownedProps: state.ownedProps,
  });
};
const day = (date: string) =>
  within(screen.getByRole('region', { name: formatScheduleDate(date) }));
const lesson = (date: string, title: string) =>
  within(day(date).getByRole('article', { name: new RegExp(title) }));
const createLocation = () => {
  fireEvent.click(screen.getByRole('button', { name: '장소 관리' }));
  const dialog = within(screen.getByRole('dialog', { name: '장소 관리' }));
  fireEvent.change(dialog.getByLabelText('장소 별칭'), { target: { value: locationAlias } });
  fireEvent.click(dialog.getByRole('checkbox', { name: '매트' }));
  fireEvent.click(dialog.getByRole('button', { name: '장소 저장' }));
  const location = usePilatesStore.getState().instructorSchedule.locations[0];
  fireEvent.click(dialog.getAllByRole('button', { name: '닫기' }).at(-1)!);
  return location;
};
const createLesson = (
  title: string,
  start: string,
  end: string,
  options: { weekly?: boolean; link?: boolean } = {},
) => {
  fireEvent.click(screen.getByRole('button', { name: '수업 추가' }));
  const dialog = within(screen.getByRole('dialog', { name: '수업 일정' }));
  fireEvent.change(dialog.getByLabelText('수업 제목'), { target: { value: title } });
  fireEvent.change(dialog.getByLabelText('반·회원 별칭'), {
    target: { value: '합성 QA 이름 대신 사용하는 긴 한글 반 별칭' },
  });
  fireEvent.change(dialog.getByLabelText('시작 날짜'), { target: { value: today } });
  fireEvent.change(dialog.getByLabelText('시작 시각'), { target: { value: start } });
  fireEvent.change(dialog.getByLabelText('종료 시각'), { target: { value: end } });
  if (options.weekly) {
    fireEvent.change(dialog.getByLabelText('반복'), { target: { value: 'weekly' } });
    fireEvent.click(dialog.getByRole('checkbox', { name: '수요일' }));
    fireEvent.change(dialog.getByLabelText('반복 종료 날짜'), { target: { value: '2026-11-04' } });
  }
  if (options.link)
    fireEvent.change(dialog.getByLabelText('연결 시퀀스'), { target: { value: saved.id } });
  fireEvent.click(dialog.getByRole('button', { name: '일정 저장' }));
  return usePilatesStore
    .getState()
    .instructorSchedule.classes.find((item) => item.title === title)!;
};

describe('actual local schedule forms with a rest-inclusive plan', { timeout: 60000 }, () => {
  beforeEach(() => {
    localStorage.clear();
    usePilatesStore.setState(
      {
        ...original,
        exercises: [...INITIAL_EXERCISES, ...exercises],
        instructorSchedule: createEmptyInstructorSchedule(),
        classGroups: INITIAL_CLASS_GROUPS,
        activeSequenceId: saved.id,
        activeTitle: saved.title,
        activeSteps: structuredClone(steps),
        activeTargetMinutes: 60,
        activeApparatus: 'reformer',
        activeLevel: '1.0',
        lastCriteria: criteria,
        draftCriteria: criteria,
        savedSequences: [structuredClone(saved)],
        historyLogs: [
          {
            id: 'qa-schedule-existing-history',
            sequenceId: saved.id,
            sequenceTitle: saved.title,
            groupId: INITIAL_CLASS_GROUPS[0].id,
            groupName: '합성 QA 과거 반 별칭',
            taughtAt: '2026-11-01T12:00:00Z',
            apparatus: 'reformer',
            level: '1.0',
            exerciseIds: exercises.map((exercise) => exercise.id),
            rating: 4,
            intensity: 'moderate',
            instructorReflection: '합성 QA 보존할 과거 회고',
            actualDurationSec: 3600,
            actualRestDurationSec: 300,
            stepsSnapshot: structuredClone(steps),
            criteriaSnapshot: criteria,
          },
        ],
        ownedApparatus: ['mat', 'reformer'],
        ownedEquipment: ['mat', 'reformer'],
        ownedProps: [],
        generationError: null,
        saveFeedback: null,
        undoStack: [],
      },
      true,
    );
  });
  afterEach(() => {
    cleanup();
    expect(INITIAL_EXERCISES).toEqual(production);
    expect(
      usePilatesStore.getState().exercises.filter((exercise) => productionIds.has(exercise.id)),
    ).toEqual(production);
    expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
    usePilatesStore.setState(original, true);
    localStorage.clear();
  });

  it('creates an exact local weekly schedule, changes only one occurrence, and preserves the locked draft/history through JSON recovery', async () => {
    const before = protectedDraft();
    render(<InstructorScheduleView today={today} />);
    expect(
      screen.getByRole('heading', { name: '수업할 장소를 먼저 등록해 주세요' }),
    ).toBeInTheDocument();
    expect(usePilatesStore.getState().instructorSchedule).toEqual(createEmptyInstructorSchedule());
    const location = createLocation();
    expect(location).toMatchObject({ alias: locationAlias, equipmentIds: ['mat'], propIds: [] });
    const weekly = createLesson(weeklyTitle, '10:00', '11:00', { weekly: true });
    expect(weekly).toMatchObject({
      startDate: today,
      startTime: '10:00',
      endTime: '11:00',
      weekdays: [1, 3],
      untilDate: '2026-11-04',
      locationId: location.id,
    });
    fireEvent.click(screen.getByRole('button', { name: '주간 보기' }));
    expect(lesson('2026-11-04', weeklyTitle).getByText('예정')).toBeInTheDocument();
    fireEvent.click(lesson(today, weeklyTitle).getByRole('button', { name: '이번 수업 취소' }));
    expect(lesson(today, weeklyTitle).getByText('취소')).toBeInTheDocument();
    expect(lesson('2026-11-04', weeklyTitle).getByText('예정')).toBeInTheDocument();
    fireEvent.click(lesson(today, weeklyTitle).getByRole('button', { name: '원래 일정 복원' }));
    fireEvent.click(lesson(today, weeklyTitle).getByRole('button', { name: '이번 수업 변경' }));
    const move = within(screen.getByRole('dialog', { name: '회차 변경' }));
    fireEvent.change(move.getByLabelText('변경 날짜'), { target: { value: '2026-11-03' } });
    fireEvent.change(move.getByLabelText('시작 시각'), { target: { value: '12:00' } });
    fireEvent.change(move.getByLabelText('종료 시각'), { target: { value: '13:00' } });
    fireEvent.change(move.getByLabelText('변경 메모'), {
      target: { value: '합성 QA 한 회차만 이동' },
    });
    fireEvent.click(move.getByRole('button', { name: '회차 변경 저장' }));
    expect(lesson(today, weeklyTitle).getByText('이동')).toBeInTheDocument();
    expect(lesson('2026-11-03', weeklyTitle).getByText('변경된 회차')).toBeInTheDocument();
    expect(usePilatesStore.getState().instructorSchedule.classes).toEqual([weekly]);
    const expected = structuredClone(usePilatesStore.getState().instructorSchedule);
    const backup = usePilatesStore.getState().exportBackup();
    const key = 'pilates-flow-atelier-storage-v3';
    expect(JSON.parse(localStorage.getItem(key)!).state.instructorSchedule).toEqual(expected);
    act(() => {
      usePilatesStore.getState().setInstructorSchedule(createEmptyInstructorSchedule());
    });
    act(() => expect(usePilatesStore.getState().restoreBackup(backup).success).toBe(true));
    expect(usePilatesStore.getState().instructorSchedule).toEqual(expected);
    await act(async () => usePilatesStore.persist.rehydrate());
    expect(usePilatesStore.getState().instructorSchedule).toEqual(expected);
    expect(protectedDraft()).toEqual(before);
    fireEvent.click(
      lesson('2026-11-03', weeklyTitle).getByRole('button', { name: '원래 일정 복원' }),
    );
    expect(usePilatesStore.getState().instructorSchedule.exceptions).toEqual([]);
    fireEvent.change(screen.getByLabelText('기준 날짜'), { target: { value: '2026-11-09' } });
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    expect(usePilatesStore.getState().instructorSchedule.classes).toEqual([weekly]);
  });

  it('shows rest-inclusive length and exact venue shortages, distinguishes adjacent from overlapping slots, and preserves a missing plan link', () => {
    const before = protectedDraft();
    render(<InstructorScheduleView today={today} />);
    createLocation();
    const linked = createLesson('합성 QA 연결 수업', '10:00', '10:50', { link: true });
    const article = lesson(today, linked.title);
    expect(article.getByText(/계획 60분 \(쉬는 시간 포함\) · 일정 50분/)).toBeInTheDocument();
    expect(article.getByText(/장소 준비물 부족:.*리포머/)).toBeInTheDocument();
    createLesson('합성 QA 바로 이어지는 수업', '10:50', '11:40');
    expect(screen.queryByText(/시간 겹침/)).not.toBeInTheDocument();
    createLesson('합성 QA 두 수업과 겹치는 수업', '10:45', '11:00');
    expect(screen.getByText(/시간 겹침 2건/)).toBeInTheDocument();
    fireEvent.click(
      lesson(today, '합성 QA 두 수업과 겹치는 수업').getByRole('button', {
        name: '이번 수업 취소',
      }),
    );
    expect(screen.queryByText(/시간 겹침/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '장소 관리' }));
    const locations = within(screen.getByRole('dialog', { name: '장소 관리' }));
    fireEvent.click(locations.getByRole('button', { name: locationAlias }));
    expect(locations.getByText(/일정 또는 휴무에 사용 중인 장소/)).toBeInTheDocument();
    expect(locations.queryByRole('button', { name: '장소 삭제' })).not.toBeInTheDocument();
    fireEvent.click(locations.getAllByRole('button', { name: '닫기' }).at(-1)!);
    act(() => usePilatesStore.setState({ savedSequences: [] }));
    expect(
      lesson(today, linked.title).getByText(/연결한 저장 시퀀스를 찾을 수 없습니다/),
    ).toBeInTheDocument();
    expect(
      usePilatesStore.getState().instructorSchedule.classes.find((item) => item.id === linked.id)
        ?.linkSavedSequenceId,
    ).toBe(saved.id);
    expect(protectedDraft()).toEqual(before);
  });

  it('applies and restores a closure without changing base lessons or reporting their overlaps while closed', () => {
    const before = protectedDraft();
    render(<InstructorScheduleView today={today} />);
    createLocation();
    createLesson('합성 QA 휴무 확인 A', '10:00', '11:00');
    createLesson('합성 QA 휴무 확인 B', '10:30', '11:30');
    const classes = structuredClone(usePilatesStore.getState().instructorSchedule.classes);
    expect(screen.getByText(/시간 겹침 1건/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '휴무 등록' }));
    const closure = within(screen.getByRole('dialog', { name: '휴무 등록' }));
    expect(closure.getByLabelText('휴무 날짜')).toHaveValue(today);
    expect(closure.getByLabelText('휴무 장소')).toHaveValue('');
    fireEvent.change(closure.getByLabelText('휴무 메모'), {
      target: { value: '합성 QA 날짜 전체 휴무' },
    });
    fireEvent.click(closure.getByRole('button', { name: '휴무 저장' }));
    expect(screen.queryByText(/시간 겹침/)).not.toBeInTheDocument();
    expect(lesson(today, classes[0].title).getByText('휴무')).toBeInTheDocument();
    expect(lesson(today, classes[1].title).getByText('휴무')).toBeInTheDocument();
    expect(usePilatesStore.getState().instructorSchedule.classes).toEqual(classes);
    fireEvent.click(day(today).getByRole('button', { name: '휴무 해제' }));
    expect(usePilatesStore.getState().instructorSchedule.exceptions).toEqual([]);
    expect(screen.getByText(/시간 겹침 1건/)).toBeInTheDocument();
    expect(usePilatesStore.getState().instructorSchedule.classes).toEqual(classes);
    expect(protectedDraft()).toEqual(before);
  });
});
