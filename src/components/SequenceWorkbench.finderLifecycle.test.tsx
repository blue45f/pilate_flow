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

function seedExistingClass() {
  usePilatesStore.setState({
    activeSequenceId: 'finder-lifecycle-existing-class',
    activeApparatus: 'mat',
    activeSteps: [{
      stepId: 'finder-lifecycle-existing-step',
      order: 1,
      exerciseId: pending.id,
      blockCategory: pending.blockCategory,
      durationMin: 4,
      selectedLayer: 'standard',
    }],
    undoStack: [],
  });
}

function openEditorFinder() {
  const actions = within(screen.getByRole('group', { name: '시퀀스 편집 도구' }));
  fireEvent.click(actions.getByRole('button', { name: '동작 추가' }));
}

function finderCount(container: HTMLElement) {
  return container.querySelectorAll('.inline-exercise-finder').length;
}

beforeEach(() => {
  window.sessionStorage.clear();
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
  it.each([390, 1440])(
    'mounts on demand at %ipx and preserves the same finder across closing and resizing',
    (width) => {
      resize(width);
      seedExistingClass();
      const before = usePilatesStore.getState();
      const storageWrite = vi.spyOn(Storage.prototype, 'setItem');
      const storeChange = vi.fn();
      const unsubscribe = usePilatesStore.subscribe(storeChange);
      const { container } = renderWorkbench();
      expect(finderCount(container)).toBe(0);

      openEditorFinder();
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

      openEditorFinder();
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
        container.querySelector('.inline-exercise-finder')?.closest('.workbench-finder-dialog'),
      ).not.toBeNull();
      expect(container.querySelector('.inline-exercise-finder')).toBe(firstFinder);
      expect(search).toHaveValue(pending.nameKo);
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
    },
  );

  it('does not mount the finder before it is requested at any viewport', () => {
    resize(1440);
    const before = usePilatesStore.getState();
    const { container } = renderWorkbench();
    for (const width of [1440, 1150, 390, 1440]) {
      resize(width);
      expect(finderCount(container)).toBe(0);
      expect(
        screen.queryByRole('complementary', { name: '작업대 동작 찾기' }),
      ).not.toBeInTheDocument();
    }
    expect(usePilatesStore.getState()).toBe(before);
    expect(JSON.stringify(INITIAL_EXERCISES)).toBe(catalogSnapshot);
  });

  it('ignores a queued native close after the picker has reopened', () => {
    seedExistingClass();
    renderWorkbench();
    openEditorFinder();
    const dialog = screen.getByRole('dialog', { name: '수업에 넣을 동작 고르기' });
    fireEvent.click(within(dialog).getByRole('button', { name: '수업 구성으로 돌아가기' }));
    openEditorFinder();
    fireEvent(dialog, new Event('close'));
    expect(screen.getByRole('dialog', { name: '수업에 넣을 동작 고르기' })).toBe(dialog);
    expect(dialog).toHaveAttribute('open');
  });
  it('closes from the focused search with Escape without clearing the retained query', () => {
    resize(1440);
    seedExistingClass();
    const before = usePilatesStore.getState();
    renderWorkbench();
    openEditorFinder();
    const dialog = screen.getByRole('dialog', { name: '수업에 넣을 동작 고르기' });
    const search = within(dialog).getByRole('searchbox');
    fireEvent.change(search, { target: { value: pending.nameKo } });
    fireEvent.keyDown(search, { key: 'Escape' });
    expect(
      screen.queryByRole('dialog', { name: '수업에 넣을 동작 고르기' }),
    ).not.toBeInTheDocument();
    openEditorFinder();
    expect(
      within(screen.getByRole('dialog', { name: '수업에 넣을 동작 고르기' })).getByRole(
        'searchbox',
      ),
    ).toBe(search);
    expect(search).toHaveValue(pending.nameKo);
    expect(usePilatesStore.getState()).toBe(before);
  });
});
