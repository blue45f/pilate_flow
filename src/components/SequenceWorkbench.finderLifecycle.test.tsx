import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import { createEmptyInstructorSchedule } from '../types/instructorSchedule';
import { isExerciseAutoEligible } from '../utils/exerciseReview';
import { SequenceWorkbench } from './SequenceWorkbench';

const original = usePilatesStore.getState();
const originalWidth = window.innerWidth;
const catalogSnapshot = JSON.stringify(INITIAL_EXERCISES);
const pending = INITIAL_EXERCISES.find((exercise) => exercise.id === 'original-mat-bridge')!;

function resize(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
  });
  fireEvent(window, new Event('resize'));
}

function renderWorkbench() {
  return render(
    <SequenceWorkbench
      onOpenYouTubePreview={vi.fn()}
      onOpenClipper={vi.fn()}
      onOpenLogModal={vi.fn()}
    />,
  );
}

function finderCount(container: HTMLElement) {
  return container.querySelectorAll('.inline-exercise-finder').length;
}

beforeEach(() => {
  resize(390);
  usePilatesStore.setState(
    {
      ...original,
      activeTab: 'workbench',
      activeSteps: [],
      activeTitle: '보존할 찾기 전 수업안',
      exercises: INITIAL_EXERCISES,
      instructorSchedule: createEmptyInstructorSchedule(),
      draftCriteria: null,
      lastCriteria: null,
      historyLogs: [],
      savedSequences: [],
      generationError: null,
      persistenceError: null,
      saveFeedback: null,
    },
    true,
  );
});

afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
  resize(originalWidth);
  vi.restoreAllMocks();
});

describe('contextual finder mount lifecycle', () => {
  it('mounts the real mobile finder on demand, retains local filters on reopening, and never mounts two finders', () => {
    const before = usePilatesStore.getState();
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem');
    const storeChange = vi.fn();
    const unsubscribe = usePilatesStore.subscribe(storeChange);
    const { container } = renderWorkbench();
    expect(finderCount(container)).toBe(0);

    fireEvent.click(screen.getByRole('button', { name: '동작 고르기' }));
    const dialog = screen.getByRole('dialog', {
      name: '수업에 넣을 동작 고르기',
    });
    const firstFinder = within(dialog).getByRole('complementary', {
      name: '작업대 동작 찾기',
    });
    const finder = within(firstFinder);
    const search = finder.getByRole('searchbox', {
      name: '동작 이름 또는 등록된 부위 태그 검색',
    });
    expect(finderCount(container)).toBe(1);
    fireEvent.change(search, { target: { value: pending.nameKo } });
    fireEvent.click(finder.getByRole('button', { name: '필터' }));
    fireEvent.click(finder.getByRole('button', { name: '매트' }));
    expect(finder.getByRole('button', { name: '매트' })).toHaveAttribute('aria-pressed', 'true');
    expect(finder.getByRole('status')).toHaveTextContent('1개 결과');

    fireEvent.click(within(dialog).getByRole('button', { name: '수업 구성으로 돌아가기' }));
    expect(
      screen.queryByRole('dialog', { name: '수업에 넣을 동작 고르기' }),
    ).not.toBeInTheDocument();
    expect(finderCount(container)).toBe(1);
    expect(firstFinder.isConnected).toBe(true);
    expect(search).toHaveValue(pending.nameKo);

    fireEvent.click(screen.getByRole('button', { name: '동작 고르기' }));
    const reopened = screen.getByRole('dialog', {
      name: '수업에 넣을 동작 고르기',
    });
    expect(within(reopened).getByRole('complementary', { name: '작업대 동작 찾기' })).toBe(
      firstFinder,
    );
    expect(finderCount(container)).toBe(1);
    expect(
      finder.getByRole('searchbox', {
        name: '동작 이름 또는 등록된 부위 태그 검색',
      }),
    ).toHaveValue(pending.nameKo);
    expect(finder.getByRole('button', { name: '매트' })).toHaveAttribute('aria-pressed', 'true');
    expect(finder.getByRole('status')).toHaveTextContent('1개 결과');

    resize(1440);
    expect(finderCount(container)).toBe(1);
    expect(
      container.querySelector('.inline-exercise-finder')?.closest('.v2-inline-finder'),
    ).not.toBeNull();
    resize(390);
    expect(finderCount(container)).toBe(1);
    expect(
      container.querySelector('.inline-exercise-finder')?.closest('.workbench-finder-dialog'),
    ).not.toBeNull();

    expect(usePilatesStore.getState()).toBe(before);
    expect(storeChange).not.toHaveBeenCalled();
    expect(storageWrite).not.toHaveBeenCalled();
    expect(JSON.stringify(INITIAL_EXERCISES)).toBe(catalogSnapshot);
    expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
    unsubscribe();
  });

  it('mounts one real desktop finder and no never-opened mobile finder when narrowing the viewport', () => {
    resize(1440);
    const before = usePilatesStore.getState();
    const { container } = renderWorkbench();
    expect(finderCount(container)).toBe(1);
    expect(screen.getByRole('complementary', { name: '작업대 동작 찾기' })).toBeInTheDocument();
    resize(390);
    expect(finderCount(container)).toBe(0);
    resize(1440);
    expect(finderCount(container)).toBe(1);
    expect(usePilatesStore.getState()).toBe(before);
    expect(JSON.stringify(INITIAL_EXERCISES)).toBe(catalogSnapshot);
  });
});
