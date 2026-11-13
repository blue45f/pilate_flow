import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import { isExerciseAutoEligible } from '../utils/exerciseReview';
import { ATLAS_DISCOVERY_RECOVERY_KEY, ExerciseAtlasView } from './ExerciseAtlasView';

vi.mock('./KinematicSchematicShowcase', () => ({
  KinematicSchematicShowcase: ({
    onQuickSearchKeyword,
  }: {
    onQuickSearchKeyword: (value: string) => void;
  }) => (
    <button type="button" onClick={() => onQuickSearchKeyword('호흡')}>
      도해에서 호흡 찾기
    </button>
  ),
}));

const original = usePilatesStore.getState();
const pending = syntheticPlanningExercise('mat', 'warmup', 'alpha', false);
const other = syntheticPlanningExercise('reformer', 'warmup', 'beta', false);

beforeEach(() => {
  window.sessionStorage.removeItem(ATLAS_DISCOVERY_RECOVERY_KEY);
  usePilatesStore.setState(
    {
      ...original,
      exercises: [pending, other],
      activeSteps: [],
      historyLogs: [],
      activeTab: 'atlas',
      activeApparatus: 'mat',
      activeLevel: '1.0',
      draftCriteria: null,
      lastCriteria: null,
      exerciseBrowseScope: 'all',
      generationError: null,
    },
    true,
  );
});

afterEach(() => {
  cleanup();
  window.sessionStorage.removeItem(ATLAS_DISCOVERY_RECOVERY_KEY);
  usePilatesStore.setState(original, true);
});

const renderAtlas = () =>
  render(<ExerciseAtlasView onOpenYouTubePreview={vi.fn()} onOpenClipper={vi.fn()} />);

describe('library focused on finding and adding movements', () => {
  it('starts with one equipment selector and results before optional reference tools', () => {
    const { container } = renderAtlas();
    const search = screen.getByRole('region', { name: '동작 검색과 필터' });
    const results = container.querySelector('.library-notes-workspace')!;
    const references = screen.getByRole('region', { name: '동작 도해와 참고 자료' });

    expect(screen.getAllByRole('group', { name: '기구 선택' })).toHaveLength(1);
    expect(screen.queryByRole('group', { name: '기구별 3D 스튜디오 빠른 선택' })).toBeNull();
    expect(screen.queryByRole('complementary', { name: '선택한 동작 정보' })).toBeNull();
    expect(search.compareDocumentPosition(results) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      results.compareDocumentPosition(references) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: '도해에서 호흡 찾기' })).toBeNull();
  });

  it('keeps optional diagrams available, mounts them on demand and returns to search', async () => {
    renderAtlas();
    const summary = screen.getByText('동작 도해', { selector: 'summary span' });
    fireEvent.click(summary);
    const example = await screen.findByRole('button', { name: '도해에서 호흡 찾기' });
    fireEvent.click(example);

    const search = screen.getByRole('searchbox', { name: '동작 검색' });
    await waitFor(() => expect(search).toHaveFocus());
    expect(search).toHaveValue('호흡');
    fireEvent.click(summary);
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: '도해에서 호흡 찾기' })).toBeNull(),
    );
    expect(search).toHaveValue('호흡');
  });

  it('preserves search and filters when adding without implying or changing personal review', async () => {
    renderAtlas();
    const equipment = screen.getByRole('group', { name: '기구 선택' });
    fireEvent.click(within(equipment).getByRole('button', { name: '매트' }));
    const search = screen.getByRole('searchbox', { name: '동작 검색' });
    fireEvent.change(search, { target: { value: pending.nameKo } });
    const card = screen
      .getByRole('button', { name: pending.nameKo })
      .closest('.movement-card') as HTMLElement;
    expect(card).toHaveTextContent('개인 검토 전');
    expect(card).not.toHaveTextContent('교차 검증 완료');

    fireEvent.click(within(card).getByRole('button', { name: `${pending.nameKo} 수업안에 추가` }));
    expect(usePilatesStore.getState().activeSteps).toHaveLength(1);
    expect(isExerciseAutoEligible(usePilatesStore.getState().exercises[0])).toBe(false);
    expect(search).toHaveValue(pending.nameKo);
    expect(within(equipment).getByRole('button', { name: '매트' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(card).toHaveTextContent('추가됨');

    fireEvent.click(within(card).getByRole('button', { name: pending.nameKo }));
    const inspector = screen.getByRole('complementary', { name: '선택한 동작 정보' });
    await waitFor(() =>
      expect(within(inspector).getByRole('heading', { name: '선택한 동작 정보' })).toHaveFocus(),
    );
    expect(inspector).toHaveTextContent('개인 검토 전');
    expect(inspector.querySelector('.pf-inspector-3sec-grid')).not.toHaveTextContent('풋바');
    expect(
      within(inspector).getByRole('button', { name: '선택한 동작 수업안에 추가' }),
    ).toHaveTextContent('추가됨');
    expect(screen.queryByTestId('studio-3d-motion-hero-card')).not.toBeInTheDocument();
    const referenceGuide = within(inspector).getByText('도해·기구 설정 참고', {
      selector: 'summary',
    });
    expect(referenceGuide.closest('details')).not.toHaveAttribute('open');
    fireEvent.click(referenceGuide);
    expect(await screen.findByTestId('studio-3d-motion-hero-card')).toBeVisible();
  });
});
