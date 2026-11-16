import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import { getExerciseArtworkFrame } from '../utils/exerciseArtworkCache';
import { ExerciseAtlasView } from './ExerciseAtlasView';

const original = usePilatesStore.getState();
const mat = syntheticPlanningExercise('mat', 'core');
const chair = syntheticPlanningExercise('chair', 'core');
const native = INITIAL_EXERCISES.find((exercise) => exercise.id === 'original-mat-chest-lift')!;
const sourceOnly = INITIAL_EXERCISES.find(
  (exercise) => exercise.id === 'expanded-mat-leg-pull-front',
)!;
const ladder = {
  ...syntheticPlanningExercise('barrel', 'core'),
  id: 'qa-ladder-only',
  nameKo: '래더 바렐 테스트',
  requiredEquipment: ['ladder-barrel'],
};
const corrector = {
  ...syntheticPlanningExercise('barrel', 'core'),
  id: 'qa-corrector-only',
  nameKo: '스파인 코렉터 테스트',
  requiredEquipment: ['spine-corrector'],
};

beforeEach(() => {
  window.sessionStorage.clear();
  usePilatesStore.setState(
    {
      ...original,
      exercises: [mat, chair, native, sourceOnly, ladder, corrector],
      activeSteps: [],
      activeTab: 'atlas',
      activeApparatus: 'mat',
      activeLevel: '1.0',
      exerciseBrowseScope: 'all',
      ownedEquipment: ['mat', 'chair'],
      ownedProps: [],
      historyLogs: [],
    },
    true,
  );
});

afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
  window.sessionStorage.clear();
});

describe('everyday Atlas catalog and preserved advanced workspace', () => {
  it('starts with search, apparatus and concise cards while keeping research tools behind one action', () => {
    const { container } = render(
      <ExerciseAtlasView onOpenYouTubePreview={vi.fn()} onOpenClipper={vi.fn()} />,
    );
    expect(screen.getByRole('heading', { name: '동작 라이브러리', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: '동작 검색' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '기구 선택' })).toBeInTheDocument();
    expect(container.querySelectorAll('.flow-atlas__card')).toHaveLength(6);
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /비교 담기/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: '모션으로 살펴보기' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '자료와 고급 도구' }));
    expect(screen.getByRole('tab', { name: '동작 노트 6' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `${mat.nameKo} 비교 담기` })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '자료와 고급 도구', level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText('패턴 도해 초안')).toHaveTextContent('22종 · 검토용');
    expect(container.querySelector('.ml-pattern-rail')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '동작 라이브러리로 돌아가기' }));
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(container.querySelectorAll('.flow-atlas__card')).toHaveLength(6);
  });

  it('uses one preview target per card, preserving native artwork and source-only provenance', () => {
    const onOpen = vi.fn();
    render(<ExerciseAtlasView onOpenYouTubePreview={onOpen} onOpenClipper={vi.fn()} />);
    const nativeCard = screen.getByRole('article', { name: `${native.nameKo} 동작` });
    expect(nativeCard.querySelector('.exercise-motion-artwork img')).toHaveAttribute(
      'src',
      getExerciseArtworkFrame(native)!.src,
    );
    const preview = within(nativeCard).getByRole('button', { name: `${native.nameKo} 미리보기` });
    expect(preview).toHaveAccessibleDescription('계획용 동작 도해');
    // One preview target, one favorite control, one add action. Artwork uses the title's hit area.
    expect(within(nativeCard).getAllByRole('button')).toHaveLength(3);
    expect(within(nativeCard).getAllByRole('button')[0]).toBe(preview);
    expect(nativeCard.querySelector('.flow-atlas__art button')).toBeNull();
    expect(nativeCard.querySelector('.exercise-motion-artwork img')).toHaveAttribute(
      'loading',
      'lazy',
    );
    fireEvent.click(preview);
    expect(onOpen).toHaveBeenCalledExactlyOnceWith(native);
    const sourceCard = screen.getByRole('article', { name: `${sourceOnly.nameKo} 동작` });
    expect(sourceCard.querySelector('.exercise-motion-artwork')).toHaveAttribute(
      'data-match-scope',
      'source-video-only',
    );
    expect(sourceCard.querySelector('[data-layer="kinematic-figure"]')).toBeNull();
    fireEvent.click(
      within(sourceCard).getByRole('button', { name: `${sourceOnly.nameKo} 미리보기` }),
    );
    expect(onOpen).toHaveBeenLastCalledWith(sourceOnly);
    expect(within(sourceCard).getByText('원본 영상 참고')).toBeInTheDocument();
    expect(within(sourceCard).queryByText('계획용 동작 도해')).not.toBeInTheDocument();
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('browses apparatus families without treating their exact equipment as owned', () => {
    render(<ExerciseAtlasView onOpenYouTubePreview={vi.fn()} onOpenClipper={vi.fn()} />);
    const before = usePilatesStore.getState().ownedEquipment;
    fireEvent.click(
      within(screen.getByRole('group', { name: '기구 선택' })).getByRole('button', {
        name: '바렐',
      }),
    );
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getByRole('article', { name: `${ladder.nameKo} 동작` })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: `${corrector.nameKo} 동작` })).toBeInTheDocument();
    expect(usePilatesStore.getState().ownedEquipment).toBe(before);
    fireEvent.click(
      within(screen.getByRole('group', { name: '기구 선택' })).getByRole('button', {
        name: '전체',
      }),
    );
    expect(screen.getAllByRole('article')).toHaveLength(6);
  });

  it('preserves search and favorite filters through advanced tools and a new catalog mount', async () => {
    const view = render(
      <ExerciseAtlasView onOpenYouTubePreview={vi.fn()} onOpenClipper={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('button', { name: `${mat.nameKo} 즐겨찾기 추가` }));
    fireEvent.click(screen.getByRole('button', { name: '즐겨찾기' }));
    fireEvent.change(screen.getByRole('searchbox', { name: '동작 검색' }), {
      target: { value: '합성 QA' },
    });
    expect(screen.getAllByRole('article')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /^필터/ }));
    expect(screen.getByRole('group', { name: '추가 검색 조건' })).toBeInTheDocument();
    expect(document.querySelector('.flow-atlas-tools')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '자세·소도구 등 더 자세한 조건' }));
    expect(screen.getByRole('searchbox', { name: '동작 검색' })).toHaveValue('합성 QA');
    expect(document.querySelector('.flow-atlas-tools')).toHaveAttribute(
      'data-filters-expanded',
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: '동작 라이브러리로 돌아가기' }));
    await waitFor(() => expect(screen.getByRole('searchbox', { name: '동작 검색' })).toHaveFocus());
    expect(screen.getByRole('button', { name: '즐겨찾기' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    view.unmount();
    render(<ExerciseAtlasView onOpenYouTubePreview={vi.fn()} onOpenClipper={vi.fn()} />);
    expect(screen.getByRole('searchbox', { name: '동작 검색' })).toHaveValue('합성 QA');
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('button', { name: `${mat.nameKo} 즐겨찾기 해제` })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('filters in place, restores the trigger on Escape, and keeps browse choices separate from class settings', async () => {
    const intermediate = {
      ...mat,
      id: 'qa-intermediate-short',
      nameKo: '중급 짧은 동작',
      level: '1.5' as const,
      defaultDurationMin: 2,
    };
    const long = {
      ...intermediate,
      id: 'qa-intermediate-long',
      nameKo: '중급 긴 동작',
      defaultDurationMin: 6,
    };
    usePilatesStore.setState({ exercises: [mat, chair, intermediate, long] });
    const before = usePilatesStore.getState();
    const view = render(
      <ExerciseAtlasView onOpenYouTubePreview={vi.fn()} onOpenClipper={vi.fn()} />,
    );
    const search = screen.getByRole('searchbox', { name: '동작 검색' });
    const filterButton = screen.getByRole('button', { name: /^필터/ });
    expect(filterButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('combobox', { name: '난이도' })).toBeNull();
    fireEvent.click(filterButton);
    expect(filterButton).toHaveAttribute('aria-expanded', 'true');
    fireEvent.change(screen.getByRole('combobox', { name: '난이도' }), {
      target: { value: '1.5' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: '동작 시간' }), {
      target: { value: 'short' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: '내 보유 장비로 가능한 동작만' }));
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(
      screen.getByRole('article', { name: `${intermediate.nameKo} 동작` }),
    ).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: '동작 검색' })).toBe(search);
    expect(document.querySelector('.flow-atlas-tools')).toBeNull();
    const after = usePilatesStore.getState();
    expect(after.activeApparatus).toBe(before.activeApparatus);
    expect(after.activeLevel).toBe(before.activeLevel);
    expect(after.draftCriteria).toBe(before.draftCriteria);
    expect(after.activeSteps).toBe(before.activeSteps);
    expect(after.ownedEquipment).toBe(before.ownedEquipment);
    expect(after.exerciseBrowseScope).toBe('owned');
    const duration = screen.getByRole('combobox', { name: '동작 시간' });
    duration.focus();
    fireEvent.keyDown(duration, { key: 'Escape' });
    expect(filterButton).toHaveFocus();
    expect(filterButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: '난이도: 중급 필터 해제' })).toBeInTheDocument();
    view.unmount();
    render(<ExerciseAtlasView onOpenYouTubePreview={vi.fn()} onOpenClipper={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /^필터/ }));
    expect(screen.getByRole('combobox', { name: '난이도' })).toHaveValue('1.5');
    expect(screen.getByRole('combobox', { name: '동작 시간' })).toHaveValue('short');
    expect(screen.getByRole('checkbox', { name: '내 보유 장비로 가능한 동작만' })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: '조건 초기화' }));
    expect(screen.getAllByRole('article')).toHaveLength(4);
    expect(usePilatesStore.getState().exerciseBrowseScope).toBe('all');
    await waitFor(() => expect(screen.getByRole('searchbox', { name: '동작 검색' })).toHaveFocus());
  });

  it('turns the added card action into the existing class route without a duplicate append or error', () => {
    const onOpen = vi.fn();
    render(<ExerciseAtlasView onOpenYouTubePreview={onOpen} onOpenClipper={vi.fn()} />);
    const card = screen.getByRole('article', { name: `${mat.nameKo} 동작` });
    fireEvent.click(within(card).getByRole('button', { name: `${mat.nameKo} 수업안에 추가` }));
    const added = usePilatesStore.getState();
    expect(added.activeSteps).toHaveLength(1);
    expect(added.activeSteps[0].exerciseId).toBe(mat.id);
    expect(within(card).queryByRole('button', { name: `${mat.nameKo} 수업안에 추가` })).toBeNull();
    fireEvent.click(within(card).getByRole('button', { name: `${mat.nameKo} 미리보기` }));
    expect(onOpen).toHaveBeenCalledExactlyOnceWith(
      added.exercises.find((item) => item.id === mat.id),
    );
    fireEvent.click(within(card).getByRole('button', { name: `${mat.nameKo} 담긴 수업안 보기` }));
    const after = usePilatesStore.getState();
    expect(after).toEqual({ ...added, activeTab: 'workbench' });
    expect(after.activeTab).toBe('workbench');
    expect(after.activeSteps).toBe(added.activeSteps);
    expect(after.undoStack).toBe(added.undoStack);
    expect(after.draftCriteria).toBe(added.draftCriteria);
    expect(after.generationError).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('scopes recent add feedback to the active class when a different draft replaces it', () => {
    usePilatesStore.setState({ activeSequenceId: 'qa-library-first-draft' });
    render(<ExerciseAtlasView onOpenYouTubePreview={vi.fn()} onOpenClipper={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: `${mat.nameKo} 수업안에 추가` }));
    const firstDraft = usePilatesStore.getState();
    expect(screen.getByText(`${mat.nameKo} · 현재 수업안에 추가했어요.`)).toBeInTheDocument();
    act(() => {
      usePilatesStore.setState({
        activeSequenceId: 'qa-library-recovered-draft',
        activeTitle: '복원한 합성 QA 수업',
        activeSteps: [],
      });
    });
    expect(screen.getByRole('button', { name: `${mat.nameKo} 수업안에 추가` })).toHaveTextContent(
      '수업에 담기',
    );
    expect(screen.queryByText(`${mat.nameKo} · 현재 수업안에 추가했어요.`)).toBeNull();
    expect(screen.queryByRole('button', { name: `${mat.nameKo} 담긴 수업안 보기` })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: `${mat.nameKo} 수업안에 추가` }));
    const recoveredDraft = usePilatesStore.getState();
    expect(recoveredDraft.activeSequenceId).toBe('qa-library-recovered-draft');
    expect(recoveredDraft.activeTitle).toBe('복원한 합성 QA 수업');
    expect(recoveredDraft.activeSteps).toHaveLength(1);
    expect(recoveredDraft.activeSteps[0].stepId).not.toBe(firstDraft.activeSteps[0].stepId);
    fireEvent.click(screen.getByRole('button', { name: `${mat.nameKo} 담긴 수업안 보기` }));
    expect(usePilatesStore.getState().activeSequenceId).toBe(recoveredDraft.activeSequenceId);
    expect(usePilatesStore.getState().activeSteps).toBe(recoveredDraft.activeSteps);
  });

  it('returns search focus when removing a favorite also removes its filtered card', () => {
    render(<ExerciseAtlasView onOpenYouTubePreview={vi.fn()} onOpenClipper={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: `${mat.nameKo} 즐겨찾기 추가` }));
    fireEvent.click(screen.getByRole('button', { name: '즐겨찾기' }));
    const favorite = screen.getByRole('button', { name: `${mat.nameKo} 즐겨찾기 해제` });
    favorite.focus();
    fireEvent.click(favorite);
    expect(screen.queryByRole('article', { name: `${mat.nameKo} 동작` })).toBeNull();
    expect(screen.getByRole('searchbox', { name: '동작 검색' })).toHaveFocus();
    expect(usePilatesStore.getState().activeSteps).toHaveLength(0);
    expect(
      usePilatesStore.getState().exercises.find((item) => item.id === mat.id)?.favoriteTag,
    ).toBe('none');
  });

  it('recovers an empty owned-only search and returns directly to the existing class builder', async () => {
    usePilatesStore.setState({ exerciseBrowseScope: 'owned' });
    render(<ExerciseAtlasView onOpenYouTubePreview={vi.fn()} onOpenClipper={vi.fn()} />);
    fireEvent.change(screen.getByRole('searchbox', { name: '동작 검색' }), {
      target: { value: '없는동작999' },
    });
    expect(screen.getByRole('heading', { name: '조건에 맞는 동작이 없어요.' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '전체 동작 보기' }));
    expect(usePilatesStore.getState().exerciseBrowseScope).toBe('all');
    expect(screen.getAllByRole('article')).toHaveLength(6);
    await waitFor(() => expect(screen.getByRole('searchbox', { name: '동작 검색' })).toHaveFocus());
    fireEvent.click(screen.getByRole('button', { name: '수업 만들기' }));
    expect(usePilatesStore.getState().activeTab).toBe('workbench');
  });

  it('reveals the next cards on request and moves keyboard focus to the first new result', async () => {
    const exercises = INITIAL_EXERCISES.slice(0, 14);
    usePilatesStore.setState({ exercises });
    const { container } = render(
      <ExerciseAtlasView onOpenYouTubePreview={vi.fn()} onOpenClipper={vi.fn()} />,
    );
    expect(container.querySelectorAll('.flow-atlas__card')).toHaveLength(12);
    fireEvent.click(screen.getByRole('button', { name: '동작 더 보기' }));
    expect(container.querySelectorAll('.flow-atlas__card')).toHaveLength(14);
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: `${exercises[12].nameKo} 미리보기` }),
      ).toHaveFocus(),
    );
    expect(screen.queryByRole('button', { name: '동작 더 보기' })).toBeNull();
  });
});
