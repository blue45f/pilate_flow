import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import type { AutoGenerateCriteria } from '../types/pilates';
import { ExerciseAtlasView } from './ExerciseAtlasView';

const original = usePilatesStore.getState();
const mat = syntheticPlanningExercise('mat', 'core');
const chair = syntheticPlanningExercise('chair', 'core');
const conditions: AutoGenerateCriteria = {
  apparatus: 'mat',
  availableEquipment: ['mat'],
  ownedApparatus: ['mat'],
  preferredProps: ['none'],
  level: '1.0',
  focusPreset: 'full-body',
  excludeDaysWindow: 0,
  targetMinutes: 50,
  defaultLayer: 'standard',
};
const add = (name: string) =>
  fireEvent.click(screen.getByRole('button', { name: `${name} 수업안에 추가` }));
const renderAtlas = () =>
  render(<ExerciseAtlasView onOpenYouTubePreview={vi.fn()} onOpenClipper={vi.fn()} />);

beforeEach(() => {
  vi.useFakeTimers();
  usePilatesStore.setState(
    {
      ...original,
      exercises: [mat, chair, ...INITIAL_EXERCISES],
      activeSteps: [],
      activeApparatus: 'mat',
      activeLevel: '1.0',
      activeTargetMinutes: 50,
      draftCriteria: conditions,
      lastCriteria: null,
      ownedEquipment: ['mat', 'chair'],
      ownedApparatus: ['mat', 'chair'],
      ownedProps: [],
      generationError: null,
    },
    true,
  );
});
afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
  vi.useRealTimers();
});

describe('Atlas reports actual append outcome', () => {
  it('replaces a recent success with an honest duplicate error, preserving steps and cancelling the old dismissal timer', () => {
    renderAtlas();
    add(mat.nameKo);
    const success = screen
      .getByText(`${mat.nameKo} · 현재 수업안에 추가했어요.`)
      .closest('[role="status"]')!;
    expect(success.querySelector('.lucide-check')).not.toBeNull();
    expect(screen.getByRole('button', { name: `${mat.nameKo} 수업안에 추가` })).toHaveTextContent(
      '추가됨',
    );
    act(() => vi.advanceTimersByTime(500));
    const before = usePilatesStore.getState();
    add(mat.nameKo);
    const after = usePilatesStore.getState();
    expect(after.activeSteps).toBe(before.activeSteps);
    expect(after.activeSteps).toHaveLength(1);
    expect(after.undoStack).toBe(before.undoStack);
    expect(after.generationError).toMatch(/중복/);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(after.generationError!);
    expect(alert.querySelector('.lucide-info')).not.toBeNull();
    expect(alert.querySelector('.lucide-check')).toBeNull();
    expect(
      screen.getByRole('button', { name: `${mat.nameKo} 수업안에 추가` }),
    ).not.toHaveTextContent('추가됨');
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.getByRole('alert')).toHaveTextContent(after.generationError!);
    expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
  });

  it('shows a criteria failure instead of an added label without changing the draft or production notes', () => {
    renderAtlas();
    const before = usePilatesStore.getState();
    add(chair.nameKo);
    const after = usePilatesStore.getState();
    expect(after.activeSteps).toBe(before.activeSteps);
    expect(after.undoStack).toBe(before.undoStack);
    expect(after.generationError).toMatch(/현재 선택한 기구/);
    expect(screen.getByRole('alert')).toHaveTextContent(after.generationError!);
    expect(screen.getByRole('alert').querySelector('.lucide-check')).toBeNull();
    expect(
      screen.getByRole('button', { name: `${chair.nameKo} 수업안에 추가` }),
    ).not.toHaveTextContent('추가됨');
    expect(
      after.exercises.filter((item) =>
        INITIAL_EXERCISES.some((originalNote) => originalNote.id === item.id),
      ),
    ).toEqual(INITIAL_EXERCISES);
    expect(INITIAL_EXERCISES.filter((item) => item.review?.status === 'approved')).toHaveLength(0);
  });

  it('returns to success feedback only after a later actual insertion and dismisses that success normally', () => {
    renderAtlas();
    add(chair.nameKo);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    add(mat.nameKo);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(usePilatesStore.getState().activeSteps).toHaveLength(1);
    expect(usePilatesStore.getState().activeSteps[0].exerciseId).toBe(mat.id);
    expect(usePilatesStore.getState().generationError).toBeNull();
    expect(screen.getByText(`${mat.nameKo} · 현재 수업안에 추가했어요.`)).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2700));
    expect(screen.queryByText(`${mat.nameKo} · 현재 수업안에 추가했어요.`)).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: `${mat.nameKo} 수업안에 추가` }),
    ).not.toHaveTextContent('추가됨');
  });
});
