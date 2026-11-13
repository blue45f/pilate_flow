import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ORIGINAL_MOVEMENTS } from '../data/originalMovements';
import { usePilatesStore } from '../store/usePilatesStore';
import { CourseReferenceBrowser } from './CourseReferenceBrowser';
import { ATLAS_DISCOVERY_RECOVERY_KEY, ExerciseAtlasView } from './ExerciseAtlasView';

const original = usePilatesStore.getState();

beforeEach(() => {
  window.sessionStorage.removeItem(ATLAS_DISCOVERY_RECOVERY_KEY);
  usePilatesStore.setState(
    {
      ...original,
      exercises: ORIGINAL_MOVEMENTS,
      activeSteps: [],
      historyLogs: [],
      activeTab: 'atlas',
      exerciseBrowseScope: 'all',
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
  render(<ExerciseAtlasView initialView="tools" onOpenYouTubePreview={vi.fn()} onOpenClipper={vi.fn()} />);

describe('Wave1-2 Library 3-step guided discovery, sessionStorage recovery, and empty-result reset', () => {
  it('updates the 3-step discovery strip dynamically across filter/search, card selection, and inspector close', async () => {
    renderAtlas();

    const stepBar = screen.getByTestId('atlas-flow-step-bar');
    expect(stepBar).toHaveAttribute('data-active-step', '1');
    expect(stepBar).toHaveTextContent('1 기구·검색어로 좁히기');
    expect(stepBar).toHaveTextContent('2 동작 카드 선택');
    expect(stepBar).toHaveTextContent('3 세부 안내 확인·수업안 추가');

    const step1 = stepBar.querySelector('[data-step="1"]')!;
    const step2 = stepBar.querySelector('[data-step="2"]')!;
    const step3 = stepBar.querySelector('[data-step="3"]')!;
    expect(step1).toHaveAttribute('data-state', 'current');
    expect(step1).toHaveAttribute('aria-current', 'step');
    expect(step2).toHaveAttribute('data-state', 'upcoming');
    expect(step3).toHaveAttribute('data-state', 'upcoming');

    // Step 1 -> Step 2 when search/filter is applied
    const searchInput = screen.getByRole('searchbox', { name: '동작 검색' });
    fireEvent.change(searchInput, { target: { value: '호흡' } });
    expect(stepBar).toHaveAttribute('data-active-step', '2');
    expect(step1).toHaveAttribute('data-state', 'done');
    expect(step2).toHaveAttribute('data-state', 'current');
    expect(step2).toHaveAttribute('aria-current', 'step');

    // Step 2 -> Step 3 when a movement card is selected for inspection
    const targetMovement = ORIGINAL_MOVEMENTS.find((item) => item.nameKo.includes('호흡'))!;
    fireEvent.click(screen.getByRole('button', { name: targetMovement.nameKo }));

    expect(stepBar).toHaveAttribute('data-active-step', '3');
    expect(step2).toHaveAttribute('data-state', 'done');
    expect(step2).toHaveTextContent(`${targetMovement.nameKo} 선택됨`);
    expect(step3).toHaveAttribute('data-state', 'current');
    expect(step3).toHaveAttribute('aria-current', 'step');

    const inspector = screen.getByRole('complementary', { name: '선택한 동작 정보' });
    expect(within(inspector).getByTestId('inspector-flow-step-badge')).toHaveTextContent(
      '3 세부 안내 확인·수업안 추가',
    );
    expect(inspector).toHaveTextContent(
      '개인 검토 전 · 직접 추가 가능 (자동 추천·AI 초안 제외)',
    );
    expect(within(inspector).queryByTestId('brief-template-badge')).not.toBeInTheDocument();
    fireEvent.click(within(inspector).getByText('도해·기구 설정 참고', { selector: 'summary' }));
    await waitFor(() =>
      expect(inspector).toHaveTextContent('기구·구간 공통 참고 · 원문 확인 필요'),
    );
    expect(inspector).not.toHaveTextContent('교차 검증 완료 · 수업 즉시 활용');

    // Closing the inspector preserves the search query and returns to Step 2
    fireEvent.click(within(inspector).getByRole('button', { name: '선택한 동작 정보 닫기' }));
    expect(stepBar).toHaveAttribute('data-active-step', '2');
    expect(searchInput).toHaveValue('호흡');
  });

  it('persists and recovers search query and focus/pattern filters via sessionStorage (pf_atlas_discovery_recovery_v1) and clears with 1-click 검색·필터 초기화', async () => {
    const { unmount } = renderAtlas();

    // Select a target muscle focus tag and a motionDraft pattern filter
    const searchInput = screen.getByRole('searchbox', { name: '동작 검색' });
    fireEvent.change(searchInput, { target: { value: '코어' } });
    fireEvent.click(screen.getByRole('button', { name: '필터' }));
    fireEvent.change(screen.getByRole('combobox', { name: '모션 제작 초안' }), {
      target: { value: 'proposal' },
    });

    const savedRaw = window.sessionStorage.getItem(ATLAS_DISCOVERY_RECOVERY_KEY);
    expect(savedRaw).not.toBeNull();
    const savedParsed = JSON.parse(savedRaw!);
    expect(savedParsed).toMatchObject({
      search: '코어',
      motionDraft: 'proposal',
    });

    // Simulate navigating away and returning to ExerciseAtlasView
    unmount();
    renderAtlas();

    const recoveredSearch = screen.getByRole('searchbox', { name: '동작 검색' });
    expect(recoveredSearch).toHaveValue('코어');
    expect(screen.getByTestId('atlas-flow-step-bar')).toHaveAttribute('data-active-step', '2');
    const activeChipGroup = screen.getByRole('group', { name: '적용된 검색·필터' });
    expect(activeChipGroup).toHaveTextContent('검색: 코어');
    expect(activeChipGroup).toHaveTextContent('도해 초안 있음');

    // 1-click '검색·필터 초기화' clears state and removes sessionStorage entry
    fireEvent.click(screen.getByRole('button', { name: /검색·필터 초기화/ }));
    expect(recoveredSearch).toHaveValue('');
    expect(window.sessionStorage.getItem(ATLAS_DISCOVERY_RECOVERY_KEY)).toBeNull();
    expect(screen.getByTestId('atlas-flow-step-bar')).toHaveAttribute('data-active-step', '1');
    await waitFor(() => expect(recoveredSearch).toHaveFocus());
  });

  it('explains which search and filters produced 0 results in ExerciseAtlasView and CourseReferenceBrowser and resets in 1 click', async () => {
    renderAtlas();

    const searchInput = screen.getByRole('searchbox', { name: '동작 검색' });
    const apparatusGroup = screen.getByRole('group', { name: '기구 선택' });
    fireEvent.click(within(apparatusGroup).getByRole('button', { name: '리포머' }));
    fireEvent.change(searchInput, { target: { value: '존재하지않는동작이름999' } });

    const emptySummary = screen.getByTestId('atlas-empty-filter-summary');
    expect(emptySummary).toHaveTextContent('‘존재하지않는동작이름999’ 검색어');
    expect(emptySummary).toHaveTextContent('필터 1개 적용 중');
    expect(emptySummary).toHaveTextContent('기구: 리포머');

    fireEvent.click(screen.getByRole('button', { name: '검색·필터 초기화' }));
    expect(screen.queryByTestId('atlas-empty-filter-summary')).toBeNull();
    expect(searchInput).toHaveValue('');
    expect(window.sessionStorage.getItem(ATLAS_DISCOVERY_RECOVERY_KEY)).toBeNull();

    cleanup();

    render(<CourseReferenceBrowser />);
    const courseSearch = screen.getByRole('searchbox', { name: '수업 영상 검색' });
    fireEvent.click(screen.getByRole('button', { name: '한국어 표기' }));
    fireEvent.change(courseSearch, { target: { value: '없는수업영상검색어999' } });

    const courseEmptySummary = screen.getByTestId('course-empty-filter-summary');
    expect(courseEmptySummary).toHaveTextContent('검색: 없는수업영상검색어999');
    expect(courseEmptySummary).toHaveTextContent('한국어 제목·설명');

    fireEvent.click(screen.getByRole('button', { name: '필터 초기화' }));
    expect(screen.queryByTestId('course-empty-filter-summary')).toBeNull();
    expect(courseSearch).toHaveValue('');
  });
});
