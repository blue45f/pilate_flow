import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import { createEmptyInstructorSchedule } from '../types/instructorSchedule';
import type { AutoGenerateCriteria, SequenceStep } from '../types/pilates';
import { SequenceWorkbench } from './SequenceWorkbench';

const original = usePilatesStore.getState();
const originalWidth = window.innerWidth;
const exercises = [
  { ...syntheticPlanningExercise('mat', 'warmup'), nameKo: '준비 동작' },
  { ...syntheticPlanningExercise('mat', 'cooldown'), nameKo: '마무리 동작' },
  { ...syntheticPlanningExercise('mat', 'core'), nameKo: '추가 동작 A' },
  { ...syntheticPlanningExercise('mat', 'bridging'), nameKo: '추가 동작 B' },
];
const steps: SequenceStep[] = exercises.slice(0, 2).map((exercise, index) => ({
  stepId: `context-insertion-${index}`,
  order: index + 1,
  exerciseId: exercise.id,
  blockCategory: exercise.blockCategory,
  durationMin: 4,
  selectedLayer: 'standard',
}));
const criteria: AutoGenerateCriteria = {
  apparatus: 'mat',
  ownedApparatus: ['mat'],
  availableEquipment: ['mat'],
  preferredProps: ['none'],
  level: '1.0',
  targetMinutes: 30,
  focusPreset: 'full-body',
  defaultLayer: 'standard',
  excludeDaysWindow: 0,
};
const resize = (width: number) => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  fireEvent(window, new Event('resize'));
};
const renderWorkbench = () =>
  render(
    <SequenceWorkbench
      onOpenYouTubePreview={vi.fn()}
      onOpenClipper={vi.fn()}
      onOpenLogModal={vi.fn()}
    />,
  );
const picker = () => within(screen.getByRole('dialog', { name: '수업에 넣을 동작 고르기' }));

beforeEach(() => {
  sessionStorage.clear();
  usePilatesStore.setState(
    {
      ...original,
      activeTab: 'workbench',
      activeSequenceId: 'context-insertion-sequence',
      activeTitle: '위치 추가 수업',
      activeSteps: structuredClone(steps),
      activeApparatus: 'mat',
      activeLevel: '1.0',
      activeTargetMinutes: 30,
      exercises,
      ownedEquipment: ['mat'],
      ownedProps: [],
      draftCriteria: criteria,
      lastCriteria: null,
      instructorSchedule: createEmptyInstructorSchedule(),
      historyLogs: [],
      savedSequences: [],
      undoStack: [],
      generationError: null,
      saveFeedback: null,
    },
    true,
  );
});

afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
  sessionStorage.clear();
  resize(originalWidth);
});

describe('Workbench contextual insertion', () => {
  it('uses a fresh end placement when a different class is loaded into the mounted Workbench', () => {
    renderWorkbench();
    fireEvent.click(screen.getByRole('button', { name: '1번 준비 동작 뒤에 동작 추가' }));
    expect(picker().getByRole('combobox', { name: '동작 추가 위치' })).toHaveValue(
      `step:${steps[0].stepId}`,
    );
    fireEvent.click(picker().getByRole('button', { name: '수업 구성으로 돌아가기' }));
    act(() => usePilatesStore.setState({ activeSequenceId: 'other-context-class' }));

    const toolbar = within(screen.getByRole('group', { name: '시퀀스 편집 도구' }));
    fireEvent.click(toolbar.getByRole('button', { name: '동작 추가' }));
    expect(picker().getByRole('combobox', { name: '동작 추가 위치' })).toHaveValue('end');
    fireEvent.click(picker().getByRole('button', { name: '수업 구성으로 돌아가기' }));
    act(() => usePilatesStore.setState({ activeSequenceId: 'context-insertion-sequence' }));
    fireEvent.click(toolbar.getByRole('button', { name: '동작 추가' }));
    expect(picker().getByRole('combobox', { name: '동작 추가 위치' })).toHaveValue('end');
    expect(usePilatesStore.getState().activeSteps).toEqual(steps);
    expect(usePilatesStore.getState().undoStack).toHaveLength(0);
  });

  it.each([390, 1440])(
    'preserves the chosen position across cancel/reopen and inserts successive choices at %ipx',
    async (width) => {
      resize(width);
      renderWorkbench();
      const before = usePilatesStore.getState();
      const opener = screen.getByRole('button', { name: '1번 준비 동작 뒤에 동작 추가' });
      opener.focus();
      fireEvent.click(opener);
      const position = picker().getByRole('combobox', { name: '동작 추가 위치' });
      expect(position).toHaveValue(`step:${steps[0].stepId}`);
      fireEvent.change(position, { target: { value: 'start' } });
      fireEvent.change(position, { target: { value: `step:${steps[0].stepId}` } });
      const search = picker().getByRole('searchbox');
      fireEvent.change(search, { target: { value: '추가 동작' } });
      fireEvent.click(picker().getByRole('button', { name: '수업 구성으로 돌아가기' }));
      expect(usePilatesStore.getState()).toBe(before);
      await waitFor(() => expect(opener).toHaveFocus());

      const toolbar = within(screen.getByRole('group', { name: '시퀀스 편집 도구' }));
      fireEvent.click(toolbar.getByRole('button', { name: '동작 추가' }));
      expect(picker().getByRole('combobox', { name: '동작 추가 위치' })).toBe(position);
      expect(position).toHaveValue(`step:${steps[0].stepId}`);
      expect(picker().getByRole('searchbox')).toHaveValue('추가 동작');
      fireEvent.click(picker().getByRole('button', { name: '추가 동작 A 수업안에 추가' }));
      fireEvent.click(picker().getByRole('button', { name: '추가 동작 B 수업안에 추가' }));
      expect(usePilatesStore.getState().activeSteps.map((step) => step.exerciseId)).toEqual([
        exercises[0].id,
        exercises[2].id,
        exercises[3].id,
        exercises[1].id,
      ]);
      expect(usePilatesStore.getState().undoStack).toHaveLength(2);
      fireEvent.click(picker().getByRole('button', { name: '수업 구성으로 돌아가기' }));
      fireEvent.click(toolbar.getByRole('button', { name: '되돌리기' }));
      fireEvent.click(toolbar.getByRole('button', { name: '되돌리기' }));
      expect(usePilatesStore.getState().activeSteps).toEqual(steps);
      expect(usePilatesStore.getState().activeTitle).toBe('위치 추가 수업');
    },
    10_000,
  );

  it('opens a blocked contextual position with an explanation instead of silently appending', () => {
    usePilatesStore.setState({ activeSteps: [steps[0], { ...steps[1], locked: true }] });
    renderWorkbench();
    const before = usePilatesStore.getState();
    fireEvent.click(screen.getByRole('button', { name: '1번 준비 동작 뒤에 동작 추가' }));
    const position = picker().getByRole('combobox', { name: '동작 추가 위치' });
    expect(position).toHaveValue(`step:${steps[0].stepId}`);
    expect(position).toHaveAttribute('aria-invalid', 'true');
    expect(picker().getByRole('alert')).toHaveTextContent('잠긴 항목의 위치를 유지');
    expect(picker().getByRole('button', { name: '추가 동작 A 수업안에 추가' })).toBeDisabled();
    expect(usePilatesStore.getState()).toBe(before);

    fireEvent.change(position, { target: { value: `step:${steps[1].stepId}` } });
    fireEvent.click(picker().getByRole('button', { name: '추가 동작 A 수업안에 추가' }));
    expect(usePilatesStore.getState().activeSteps[1]).toBe(before.activeSteps[1]);
    expect(usePilatesStore.getState().activeSteps[2].exerciseId).toBe(exercises[2].id);
    expect(usePilatesStore.getState().undoStack).toHaveLength(1);
  });
});
