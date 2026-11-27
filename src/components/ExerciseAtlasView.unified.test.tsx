import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { WORLD_PILATES_EXERCISES } from '../data/worldPilatesRepertoire1000';
import { CURATED_MULTI_WEEK_PROGRAMS } from '../utils/composableHierarchyEngine';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import { ExerciseAtlasView } from './ExerciseAtlasView';

const originalStore = usePilatesStore.getState();

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  usePilatesStore.setState(
    {
      ...originalStore,
      exercises: INITIAL_EXERCISES,
      activeSteps: [],
      activeTab: 'atlas',
      activeApparatus: 'reformer',
      activeLevel: '2.0',
      draftCriteria: null,
      lastCriteria: null,
      ownedApparatus: ['mat', 'reformer', 'cadillac', 'chair', 'barrel'],
      ownedEquipment: ['mat', 'reformer', 'cadillac', 'chair', 'barrel', 'ladder-barrel', 'spine-corrector'],
      ownedProps: [
        'none',
        'mini-ball',
        'magic-circle',
        'foam-roller',
        'loop-band',
        'theraband',
        'toning-ball',
        'bosu',
        'fitness-ball',
        'tube-band',
        'long-band',
        'dumbbell',
        'sliders',
        'yoga-block',
      ],
      exerciseBrowseScope: 'all',
      historyLogs: [],
      generationError: null,
    },
    true,
  );
});

afterEach(() => {
  cleanup();
  usePilatesStore.setState(originalStore, true);
  window.sessionStorage.clear();
  window.localStorage.clear();
});

describe('ExerciseAtlasView unified 1,752 catalog integration', () => {
  it('auto-merges 1,752 movements into one unified catalog without world-encyclopedia split or role="tab"', () => {
    const { container } = render(
      <ExerciseAtlasView onOpenYouTubePreview={vi.fn()} onOpenClipper={vi.fn()} />,
    );

    // INITIAL_EXERCISES stays immutable at 158
    expect(INITIAL_EXERCISES).toHaveLength(158);
    expect(WORLD_PILATES_EXERCISES).toHaveLength(1752);

    // Zero role="tab" elements (preserves simplified catalog accessibility invariant)
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();

    // Confusing split label and redundant bottom WorldRepertoireExplorerBar are completely gone
    expect(screen.queryByTestId('world-repertoire-explorer')).not.toBeInTheDocument();
    expect(container.textContent).not.toContain('세계 대백과');

    // Tools are disclosed only when needed and all four remain reachable.
    const materials = screen.getByText('연습·프로그램').closest('details')!;
    expect(materials).not.toHaveAttribute('open');
    fireEvent.click(within(materials).getByText('연습·프로그램'));
    expect(materials).toHaveAttribute('open');
    const quickHub = screen.getByTestId('atlas-quick-hub');
    const quickButtons = within(quickHub).getAllByRole('button');
    expect(quickButtons).toHaveLength(4);
    expect(quickHub).toHaveTextContent(`4·8주 프로그램 ${CURATED_MULTI_WEEK_PROGRAMS.length}종`);
    expect(quickHub).toHaveTextContent('동작 연습');
    expect(quickHub).toHaveTextContent('필라테스 기초 원리');
    expect(quickHub).toHaveTextContent('기구 NFC · QR');

    // The results count stays visible while scope counts live with their controls.
    const summary = screen.getByTestId('atlas-results-summary');
    expect(summary).toHaveTextContent('1,752개 동작');
    fireEvent.click(screen.getByRole('button', { name: /^필터/ }));
    expect(screen.getByRole('group', { name: '추가 검색 조건' })).toBeVisible();

    // Unified scope row uses role="group" + aria-pressed buttons
    const scopeRow = screen.getByTestId('atlas-unified-scope-row');
    expect(scopeRow).toHaveAttribute('role', 'group');
    expect(screen.getByTestId('atlas-scope-all')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('atlas-scope-all')).toHaveTextContent('전체 1,752');
    expect(screen.getByTestId('atlas-scope-3d')).toHaveTextContent('그림 있는 동작 1,752');
    expect(screen.getByTestId('atlas-scope-atomic')).toHaveTextContent('대표 동작 524');
    expect(screen.getByTestId('atlas-scope-fusion')).toHaveTextContent('바레·기능성 운동 152');
    expect(screen.getByTestId('atlas-scope-programs')).toHaveTextContent('4·8주 프로그램 13');

    // Every exercise card preserves the exact 3-button Calm Atelier contract
    const cards = container.querySelectorAll('.flow-atlas__card');
    expect(cards.length).toBe(12);
    for (const card of Array.from(cards)) {
      expect(within(card as HTMLElement).getAllByRole('button')).toHaveLength(3);
    }
  });

  it('switches scopes cleanly across unified 3D precision (1,752), atomic (524), fusion (152), and inline 4·8-week programs (13)', () => {
    const { container } = render(
      <ExerciseAtlasView onOpenYouTubePreview={vi.fn()} onOpenClipper={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /^필터/ }));

    // 1. 3D precision scope -> 1,752 (all 524 atomics directly rendered + 1,228 parent-matched variations)
    fireEvent.click(screen.getByTestId('atlas-scope-3d'));
    expect(screen.getByTestId('atlas-scope-3d')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('atlas-results-summary')).toHaveTextContent('1,752개 동작');

    // 2. Atomic scope -> 524
    fireEvent.click(screen.getByTestId('atlas-scope-atomic'));
    expect(screen.getByTestId('atlas-results-summary')).toHaveTextContent('524개 동작');

    // 3. Fusion scope -> 152 fusion cards with quiet '퓨전' origin tag and 3 buttons per card
    fireEvent.click(screen.getByTestId('atlas-scope-fusion'));
    expect(screen.getByTestId('atlas-results-summary')).toHaveTextContent('152개 동작');
    const firstFusionCard = container.querySelector('.flow-atlas__card') as HTMLElement;
    expect(firstFusionCard).not.toBeNull();
    expect(within(firstFusionCard).getByText('퓨전')).toBeInTheDocument();
    expect(within(firstFusionCard).getAllByRole('button')).toHaveLength(3);

    // 4. Programs scope -> 13 curated multi-week programs rendered inline
    fireEvent.click(screen.getByTestId('atlas-scope-programs'));
    const programsGrid = screen.getByTestId('atlas-unified-programs-grid');
    expect(within(programsGrid).getAllByRole('article')).toHaveLength(13);

    // Applying Week 1 hydrates store exercises, populates activeSteps, and navigates to workbench
    const firstProgram = CURATED_MULTI_WEEK_PROGRAMS[0]!;
    fireEvent.click(screen.getByTestId(`atlas-apply-program-${firstProgram.id}`));
    const state = usePilatesStore.getState();
    expect(state.activeTab).toBe('workbench');
    expect(state.activeTitle).toContain(firstProgram.titleKo);
    expect(state.activeSteps.length).toBeGreaterThan(0);
    expect(state.exercises.length).toBeGreaterThanOrEqual(INITIAL_EXERCISES.length);
  });

  it('hydrates world-only movements natively on preview, favorite, and add without duplicating counts', () => {
    const onPreview = vi.fn();
    const { container } = render(
      <ExerciseAtlasView onOpenYouTubePreview={onPreview} onOpenClipper={vi.fn()} />,
    );

    // Filter to Reformer + fusion scope so the displayed card is a world-only reformer movement
    fireEvent.click(
      within(screen.getByRole('group', { name: '기구 선택' })).getByRole('button', {
        name: '리포머',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: /^필터/ }));
    fireEvent.click(screen.getByTestId('atlas-scope-fusion'));
    const firstCard = container.querySelector('.flow-atlas__card') as HTMLElement;
    const exerciseId = firstCard.getAttribute('data-exercise-id')!;
    expect(INITIAL_EXERCISES.some((ex) => ex.id === exerciseId)).toBe(false);

    // 1. Preview hydrates into store & calls onOpenYouTubePreview
    const buttons = within(firstCard).getAllByRole('button');
    fireEvent.click(buttons[0]!);
    expect(onPreview).toHaveBeenCalledTimes(1);
    expect(usePilatesStore.getState().exercises.some((ex) => ex.id === exerciseId)).toBe(true);

    // 2. Favorite persists to store, stays in place, and keeps total deduplicated at 1,752
    fireEvent.click(buttons[1]!);
    expect(
      usePilatesStore.getState().exercises.find((ex) => ex.id === exerciseId)?.favoriteTag,
    ).toBe('signature');
    expect(screen.getByTestId('atlas-scope-all')).toHaveTextContent('전체 1,752');

    // 3. Add to sequence appends cleanly
    fireEvent.click(buttons[2]!);
    expect(usePilatesStore.getState().activeSteps.some((step) => step.exerciseId === exerciseId)).toBe(
      true,
    );
  });

  it('keeps fixture mode (< 100 exercises) isolated from world repertoire auto-merge', () => {
    const fixtures = [
      syntheticPlanningExercise('mat', 'warmup'),
      syntheticPlanningExercise('reformer', 'core'),
      syntheticPlanningExercise('chair', 'lower-body'),
    ];
    usePilatesStore.setState({ exercises: fixtures });

    const { container } = render(
      <ExerciseAtlasView onOpenYouTubePreview={vi.fn()} onOpenClipper={vi.fn()} />,
    );

    expect(container.querySelectorAll('.flow-atlas__card')).toHaveLength(3);
    expect(screen.getByTestId('atlas-scope-all')).toHaveTextContent('전체 3');
  });
});
