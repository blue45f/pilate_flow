import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

  it('uses one detail callback for the artwork, name and view action, preserving source-only artwork', () => {
    const onOpen = vi.fn();
    render(<ExerciseAtlasView onOpenYouTubePreview={onOpen} onOpenClipper={vi.fn()} />);
    const nativeCard = screen.getByRole('article', { name: `${native.nameKo} 동작` });
    expect(nativeCard.querySelector('.exercise-motion-artwork img')).toHaveAttribute(
      'src',
      getExerciseArtworkFrame(native)!.src,
    );
    fireEvent.click(within(nativeCard).getByRole('button', { name: `${native.nameKo} 상세 보기` }));
    fireEvent.click(within(nativeCard).getByRole('button', { name: native.nameKo }));
    fireEvent.click(
      within(nativeCard).getByRole('button', { name: `${native.nameKo} 자세히 보기` }),
    );
    expect(onOpen).toHaveBeenCalledTimes(3);
    expect(onOpen.mock.calls.every(([exercise]) => exercise.id === native.id)).toBe(true);
    const sourceCard = screen.getByRole('article', { name: `${sourceOnly.nameKo} 동작` });
    expect(sourceCard.querySelector('.exercise-motion-artwork')).toHaveAttribute(
      'data-match-scope',
      'source-video-only',
    );
    expect(sourceCard.querySelector('[data-layer="kinematic-figure"]')).toBeNull();
    fireEvent.click(
      within(sourceCard).getByRole('button', { name: `${sourceOnly.nameKo} 영상 보기` }),
    );
    expect(onOpen).toHaveBeenLastCalledWith(sourceOnly);
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
      expect(screen.getByRole('button', { name: exercises[12].nameKo })).toHaveFocus(),
    );
    expect(screen.queryByRole('button', { name: '동작 더 보기' })).toBeNull();
  });
});
