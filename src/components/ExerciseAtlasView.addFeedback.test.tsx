import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadNativeExerciseArtwork } from '../utils/lazyExerciseArtwork';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { getCatalogContinuousMotionAsset } from '../data/catalogMotionAssets';
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
const renderAtlas = (initialView: 'catalog' | 'tools' = 'catalog') =>
  render(<ExerciseAtlasView initialView={initialView} onOpenYouTubePreview={vi.fn()} onOpenClipper={vi.fn()} />);

// Feedback journeys use a prepared renderer; deferred loading has its own regression suite.
beforeAll(async () => { await loadNativeExerciseArtwork(); });

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
      exerciseBrowseScope: 'all',
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

  it('surfaces real target muscle tags, active filter chips, Korean prop/level search, and empty-state recovery', () => {
    const { container } = renderAtlas('tools');

    // Unapproved catalog cards display real targetMuscles and clickable focus tags instead of placeholder
    expect(container.textContent).not.toContain('미검수 입력값 · 검토할 계획 자료');
    const focusTagButtons = container.querySelectorAll('.movement-focus-tag');
    expect(focusTagButtons.length).toBeGreaterThan(0);

    // Clicking a focus tag filters by that muscle and renders an active filter chip
    const firstTag = focusTagButtons[0] as HTMLButtonElement;
    const tagLabel = firstTag.textContent?.replace(/^#/, '') ?? '';
    fireEvent.click(firstTag);
    const activeChipGroup = screen.getByRole('group', { name: '적용된 검색·필터' });
    expect(activeChipGroup).toHaveTextContent(`검색: ${tagLabel}`);

    // Clearing via the active filter chip restores all movements
    fireEvent.click(screen.getByRole('button', { name: `검색: ${tagLabel} 필터 해제` }));
    expect(screen.queryByRole('group', { name: '적용된 검색·필터' })).toBeNull();

    // Korean prop search ("써클링") finds exercises requiring magic circle
    const searchInput = screen.getByRole('searchbox', { name: '동작 검색' });
    fireEvent.change(searchInput, { target: { value: '써클링' } });
    expect(container.querySelectorAll('.movement-card').length).toBeGreaterThan(0);

    // Empty search shows query context and "검색어 지우기" action
    fireEvent.change(searchInput, { target: { value: '없는동작검색어999' } });
    const emptyRegion = container.querySelector('.library-empty') as HTMLElement;
    expect(emptyRegion).not.toBeNull();
    expect(emptyRegion).toHaveTextContent('‘없는동작검색어999’ 검색어');
    const emptyClearBtn = Array.from(emptyRegion.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('검색어 지우기'),
    );
    expect(emptyClearBtn).toBeDefined();
    fireEvent.click(emptyClearBtn!);
    expect(container.querySelector('.library-empty')).toBeNull();
  });

  it('reflects persistent sequence selection state, pattern tile selection, and studio thumbnails with precise kinematic previews', () => {
    const { container } = renderAtlas('tools');

    // Add mat movement and verify persistent in-sequence state remains even after toast timer expires
    add(mat.nameKo);
    act(() => vi.advanceTimersByTime(3000));
    const matCard = screen
      .getByRole('button', { name: mat.nameKo })
      .closest('.movement-card') as HTMLElement;
    expect(matCard).toHaveClass('is-selected', 'is-in-sequence');
    expect(matCard.querySelector('.movement-selected-badge')).toHaveTextContent('수업안 포함');
    expect(container.querySelector('.ml-selection-return')).toHaveAttribute(
      'data-has-selection',
      'true',
    );
    const addedState = usePilatesStore.getState();

    // Pattern tile reflects aria-pressed and .is-selected when active
    const draftSummary = screen.getByLabelText('패턴 도해 초안');
    fireEvent.click(draftSummary);
    fireEvent(draftSummary.closest('details')!, new Event('toggle'));
    const firstTile = container.querySelector('.ml-pattern-tile') as HTMLButtonElement;
    expect(firstTile).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(firstTile);
    expect(firstTile).toHaveAttribute('aria-pressed', 'true');
    expect(firstTile).toHaveClass('is-selected');
    expect(
      within(screen.getByRole('region', { name: '선택한 패턴 도해 미리보기' })).getByRole(
        'heading',
        { name: '패턴 도해 미리보기' },
      ),
    ).toBeInTheDocument();

    // Card and dedicated preview use the same movement model; a custom record remains a labelled representative.
    expect(matCard.querySelector('.exercise-motion-artwork')).toHaveAttribute(
      'data-exercise-id',
      mat.id,
    );
    expect(matCard.querySelector('.exercise-motion-artwork')).toHaveAttribute(
      'data-match-scope',
      'representative-pattern',
    );
    expect(matCard.querySelector('img[src*="/motion-studio3d/"]')).toBeNull();
    expect(
      within(matCard).getByRole('button', { name: `${mat.nameKo} 상세 보기` }),
    ).toHaveAccessibleDescription(
      `${getCatalogContinuousMotionAsset(mat)!.visualAsset.archetypeTitleKo} · 동작 패턴 도해`,
    );
    expect(matCard.querySelector('.pf-b05-card-overlay-top')).toHaveTextContent('매트');
    expect(matCard.querySelector('.movement-position-badge')).toHaveTextContent(
      '수파인 (누운 자세)',
    );
    expect(matCard.querySelector('.movement-target')).toHaveTextContent('합성 QA 분류');
    expect(
      within(matCard).getByRole('button', { name: '합성 QA 분류 태그로 검색' }),
    ).toHaveAttribute('aria-pressed', 'false');

    const kinematicPreviewBtn = within(matCard).getByRole('button', {
      name: `${mat.nameKo} 기구학 도해 보기`,
    });
    expect(kinematicPreviewBtn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(kinematicPreviewBtn);
    expect(kinematicPreviewBtn).toHaveAttribute('aria-pressed', 'true');
    expect(firstTile).toHaveAttribute('aria-pressed', 'false');
    expect(
      within(screen.getByRole('region', { name: '선택한 패턴 도해 미리보기' })).getByRole(
        'heading',
        { name: '기구학 연속 도해 미리보기' },
      ),
    ).toBeInTheDocument();
    const player = screen.getByTestId('catalog-motion-interactive-player');
    expect(player).toHaveAttribute('data-exercise-id', mat.id);
    expect(player).toHaveAttribute('data-motion-family', 'catalog-kinematic');
    expect(player).toHaveAttribute('data-professional-review', 'unreviewed');
    expect(player).toHaveTextContent('단계 1 / 5');
    expect(player).toHaveTextContent('일시정지 · 자동 재생 없음');
    const diagramImg = player.querySelector('svg[role="img"]');
    expect(diagramImg).toHaveAttribute('data-exercise-id', mat.id);
    expect(diagramImg).toHaveAttribute('data-apparatus', 'mat');
    expect(diagramImg).toHaveAttribute('data-body-position', 'supine');
    expect(diagramImg).toHaveAttribute('data-anatomical-accuracy-assumed', 'false');
    expect(matCard).toHaveClass('is-selected', 'is-in-sequence');
    expect(usePilatesStore.getState().exercises).toBe(addedState.exercises);
    expect(usePilatesStore.getState().activeSteps).toBe(addedState.activeSteps);
    expect(usePilatesStore.getState().instructorStudyState).toBe(addedState.instructorStudyState);
  });
});
