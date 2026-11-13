import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import type { AutoGenerateCriteria, SequenceStep } from '../types/pilates';
import { InlineExerciseFinder } from './InlineExerciseFinder';

const original = usePilatesStore.getState();
const exercises = [
  { ...syntheticPlanningExercise('mat', 'warmup'), nameKo: '준비 동작' },
  { ...syntheticPlanningExercise('mat', 'cooldown'), nameKo: '마무리 동작' },
  { ...syntheticPlanningExercise('mat', 'core'), nameKo: '추가 동작 A' },
  { ...syntheticPlanningExercise('mat', 'bridging'), nameKo: '추가 동작 B' },
];
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
const originalSteps: SequenceStep[] = exercises.slice(0, 2).map((exercise, index) => ({
  stepId: `insertion-anchor-${index}`,
  order: index + 1,
  exerciseId: exercise.id,
  blockCategory: exercise.blockCategory,
  durationMin: 4,
  selectedLayer: 'standard',
}));
const order = () => usePilatesStore.getState().activeSteps.map((step) => step.exerciseId);
const position = () => screen.getByRole('combobox', { name: '동작 추가 위치' });
const add = (index: number) =>
  fireEvent.click(screen.getByRole('button', { name: `${exercises[index].nameKo} 수업안에 추가` }));

beforeEach(() => {
  sessionStorage.clear();
  usePilatesStore.setState(
    {
      ...original,
      exercises,
      activeSteps: structuredClone(originalSteps),
      activeSequenceId: 'insertion-fixture',
      activeApparatus: 'mat',
      activeLevel: '1.0',
      activeTargetMinutes: 30,
      ownedEquipment: ['mat'],
      ownedProps: [],
      exerciseBrowseScope: 'all',
      draftCriteria: criteria,
      lastCriteria: null,
      undoStack: [],
      generationError: null,
    },
    true,
  );
});

afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
  sessionStorage.clear();
});

describe('position-aware finder insertion', () => {
  it('starts at the end for each different class without carrying an earlier class anchor back', () => {
    render(<InlineExerciseFinder onOpenExercise={vi.fn()} />);
    fireEvent.change(position(), { target: { value: `step:${originalSteps[0].stepId}` } });
    act(() => usePilatesStore.setState({ activeSequenceId: 'different-insertion-class' }));
    expect(position()).toHaveValue('end');
    act(() => usePilatesStore.setState({ activeSequenceId: 'insertion-fixture' }));
    expect(position()).toHaveValue('end');
    expect(usePilatesStore.getState().activeSteps).toEqual(originalSteps);
    expect(usePilatesStore.getState().undoStack).toHaveLength(0);
  });

  it('adds successive choices after the selected row in selection order, with one undo per add', () => {
    render(<InlineExerciseFinder onOpenExercise={vi.fn()} />);
    const before = usePilatesStore.getState();
    fireEvent.change(position(), { target: { value: `step:${originalSteps[0].stepId}` } });
    expect(usePilatesStore.getState()).toBe(before);

    add(2);
    const insertedA = usePilatesStore.getState().activeSteps[1];
    expect(order()).toEqual([exercises[0].id, exercises[2].id, exercises[1].id]);
    expect(position()).toHaveValue(`step:${insertedA.stepId}`);
    expect(screen.getByText(`2번에 ${exercises[2].nameKo} 동작을 추가했습니다.`)).toBeVisible();

    add(3);
    expect(order()).toEqual([exercises[0].id, exercises[2].id, exercises[3].id, exercises[1].id]);
    expect(usePilatesStore.getState().undoStack).toHaveLength(2);
    act(() => usePilatesStore.getState().undoSequence());
    expect(order()).toEqual([exercises[0].id, exercises[2].id, exercises[1].id]);
    act(() => usePilatesStore.getState().undoSequence());
    expect(usePilatesStore.getState().activeSteps).toEqual(originalSteps);
    expect(usePilatesStore.getState().draftCriteria).toEqual(criteria);
  });

  it('follows the chosen step identity after a reorder instead of retaining its old index', () => {
    render(<InlineExerciseFinder onOpenExercise={vi.fn()} />);
    fireEvent.change(position(), { target: { value: `step:${originalSteps[0].stepId}` } });
    act(() => {
      usePilatesStore.getState().reorderStep(originalSteps[0].stepId, originalSteps[1].stepId);
    });
    expect(position()).toHaveValue(`step:${originalSteps[0].stepId}`);
    expect(within(position()).getByRole('option', { name: '2번 준비 동작 뒤' })).toBeEnabled();
    add(2);
    expect(order()).toEqual([exercises[1].id, exercises[0].id, exercises[2].id]);
  });

  it('keeps custom ideas and catalog choices in the same insertion order with their own undo entries', () => {
    const idea = {
      ...exercises[2],
      id: 'ex-custom-idea-insertion-fixture',
      nameKo: '창작 삽입 동작',
    };
    usePilatesStore.setState({ exercises: [exercises[0], exercises[1], idea, exercises[3]] });
    render(<InlineExerciseFinder onOpenExercise={vi.fn()} />);
    fireEvent.change(position(), { target: { value: `step:${originalSteps[0].stepId}` } });
    fireEvent.click(screen.getByRole('button', { name: '창작 삽입 동작 수업안에 추가' }));
    const ideaStep = usePilatesStore.getState().activeSteps[1];
    expect(ideaStep).toMatchObject({ exerciseId: idea.id, humanDraftId: idea.id });
    expect(position()).toHaveValue(`step:${ideaStep.stepId}`);
    add(3);
    expect(order()).toEqual([exercises[0].id, idea.id, exercises[3].id, exercises[1].id]);
    expect(usePilatesStore.getState().undoStack).toHaveLength(2);
    act(() => usePilatesStore.getState().undoSequence());
    act(() => usePilatesStore.getState().undoSequence());
    expect(usePilatesStore.getState().activeSteps).toEqual(originalSteps);
  });

  it('requires explicit recovery when the chosen anchor disappears and never falls back to append', () => {
    render(<InlineExerciseFinder onOpenExercise={vi.fn()} />);
    fireEvent.change(position(), { target: { value: `step:${originalSteps[0].stepId}` } });
    act(() => usePilatesStore.getState().removeStep(0));
    const afterRemoval = usePilatesStore.getState();
    expect(position()).toHaveValue(`step:${originalSteps[0].stepId}`);
    expect(position()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('추가 위치를 다시 선택');
    const addButton = screen.getByRole('button', { name: '추가 동작 A 수업안에 추가' });
    expect(addButton).toBeDisabled();
    fireEvent.click(addButton);
    expect(usePilatesStore.getState()).toBe(afterRemoval);

    fireEvent.change(position(), { target: { value: 'end' } });
    expect(addButton).toBeEnabled();
    expect(position()).not.toHaveAttribute('aria-invalid');
    add(2);
    expect(order()).toEqual([exercises[1].id, exercises[2].id]);
  });

  it('explains unavailable locked positions while allowing insertion after the last locked row', () => {
    usePilatesStore.setState({
      activeSteps: [originalSteps[0], { ...originalSteps[1], locked: true }],
    });
    render(<InlineExerciseFinder onOpenExercise={vi.fn()} />);
    expect(within(position()).getByRole('option', { name: /맨 앞/ })).toBeDisabled();
    expect(within(position()).getByRole('option', { name: /1번 준비 동작 뒤/ })).toBeDisabled();
    expect(within(position()).getByRole('option', { name: '2번 마무리 동작 뒤' })).toBeEnabled();
    expect(screen.getByText(/잠긴 항목의 위치를 바꾸는 곳에는 추가할 수 없어요/)).toBeVisible();
    const locked = usePilatesStore.getState().activeSteps[1];
    fireEvent.change(position(), { target: { value: `step:${locked.stepId}` } });
    add(2);
    expect(usePilatesStore.getState().activeSteps[1]).toBe(locked);
    expect(order()).toEqual([exercises[0].id, exercises[1].id, exercises[2].id]);
  });

  it('uses the selected insertion predecessor for the same-spring shortcut', () => {
    usePilatesStore.setState({
      activeSteps: [
        { ...originalSteps[0], customSpringOverride: '2R' },
        { ...originalSteps[1], customSpringOverride: '1B' },
      ],
    });
    render(<InlineExerciseFinder onOpenExercise={vi.fn()} />);
    expect(screen.getByTestId('ief-same-spring-chip')).toHaveTextContent('직전 스프링 유지 (1B)');
    fireEvent.change(position(), { target: { value: `step:${originalSteps[0].stepId}` } });
    expect(screen.getByTestId('ief-same-spring-chip')).toHaveTextContent('직전 스프링 유지 (2R)');
    fireEvent.change(position(), { target: { value: 'start' } });
    expect(screen.queryByTestId('ief-same-spring-chip')).not.toBeInTheDocument();
  });
});
