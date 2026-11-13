import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import type { AutoGenerateCriteria, PilatesExercise } from '../types/pilates';
import { isExerciseAutoEligible } from '../utils/exerciseReview';
import { ATLAS_DISCOVERY_RECOVERY_KEY, ExerciseAtlasView } from './ExerciseAtlasView';

const originalState = usePilatesStore.getState();

const matWarmup = syntheticPlanningExercise('mat', 'warmup', 'alpha', true);
const matCorePending = syntheticPlanningExercise('mat', 'core', 'beta', false);
const matLowerUnilateral = syntheticPlanningExercise('mat', 'lower-body', 'alpha', true);
const matCooldown = syntheticPlanningExercise('mat', 'cooldown', 'alpha', true);
const matSameFamilyVariant: PilatesExercise = {
  ...syntheticPlanningExercise('mat', 'bridging', 'beta', true),
  id: 'qa-synthetic-mat-bridging-family-dup',
  nameKo: '합성 QA 매트 브릿지 변형 B',
  nameEn: 'Synthetic QA Mat Bridge Variant B',
  movementFamily: matWarmup.movementFamily,
};
const chairMismatch = syntheticPlanningExercise('chair', 'core', 'alpha', true);
const matAdvancedMismatch: PilatesExercise = {
  ...syntheticPlanningExercise('mat', 'plank', 'alpha', true),
  id: 'qa-synthetic-mat-plank-lv2',
  nameKo: '합성 QA 매트 심화 플랭크',
  level: '2.0',
};

const matClassCriteria: AutoGenerateCriteria = {
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

const renderAtlas = () =>
  render(<ExerciseAtlasView initialView="tools" onOpenYouTubePreview={vi.fn()} onOpenClipper={vi.fn()} />);

beforeEach(() => {
  window.sessionStorage.removeItem(ATLAS_DISCOVERY_RECOVERY_KEY);
  usePilatesStore.setState(
    {
      ...originalState,
      exercises: [
        matWarmup,
        matCorePending,
        matLowerUnilateral,
        matCooldown,
        matSameFamilyVariant,
        chairMismatch,
        matAdvancedMismatch,
        ...INITIAL_EXERCISES,
      ],
      activeSteps: [],
      activeApparatus: 'mat',
      activeLevel: '1.0',
      activeTargetMinutes: 50,
      draftCriteria: matClassCriteria,
      lastCriteria: null,
      ownedEquipment: ['mat', 'reformer', 'chair'],
      ownedApparatus: ['mat', 'reformer', 'chair'],
      ownedProps: [],
      exerciseBrowseScope: 'all',
      generationError: null,
    },
    true,
  );
});

afterEach(() => {
  cleanup();
  window.sessionStorage.removeItem(ATLAS_DISCOVERY_RECOVERY_KEY);
  usePilatesStore.setState(originalState, true);
  vi.useRealTimers();
  expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
});

describe('ExerciseAtlasView movement comparison, pre-add readiness cues, and sequence selection persistence', () => {
  it('compares 2-3 movements side-by-side across search/filter changes, opens kinematic diagrams, enforces the 3-item cap politely, and keeps selection when adding', async () => {
    renderAtlas();

    // Pin first synthetic movement: tray appears collapsed (1/3)
    const compareBtn1 = screen.getByRole('button', { name: `${matWarmup.nameKo} 비교 담기` });
    expect(compareBtn1).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(compareBtn1);
    expect(compareBtn1).toHaveAttribute('aria-pressed', 'true');

    const compareRegion = screen.getByRole('region', { name: '선택 동작 비교' });
    expect(compareRegion).toHaveTextContent('비교 후보 1/3개');
    expect(
      within(compareRegion).getByRole('button', { name: '비교표 펼치기 (1)' }),
    ).toHaveAttribute('aria-expanded', 'false');

    // Pin second unreviewed synthetic movement: comparison grid auto-expands (2/3)
    const compareBtn2 = screen.getByRole('button', { name: `${matCorePending.nameKo} 비교 담기` });
    fireEvent.click(compareBtn2);
    expect(compareBtn2).toHaveAttribute('aria-pressed', 'true');
    expect(compareRegion).toHaveTextContent('비교 후보 2/3개');
    expect(within(compareRegion).getByRole('button', { name: '비교표 접기' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    const card1 = screen.getByTestId(`atlas-compare-card-${matWarmup.id}`);
    const card2 = screen.getByTestId(`atlas-compare-card-${matCorePending.id}`);
    expect(card1).toHaveTextContent('내 개인 검토 완료');
    expect(card2).toHaveTextContent('개인 검토 전 · 자동 추천 제외');
    expect(card2).toHaveTextContent(matCorePending.precautions);

    // Filter to an unrelated query so both compared exercises leave the filtered grid
    const searchToolsRegion = screen.getByRole('region', { name: '동작 검색과 필터' });
    const searchLandmark = within(searchToolsRegion).getByRole('search', { name: '동작 검색창' });
    const searchInput = within(searchLandmark).getByRole('searchbox', { name: '동작 검색' });
    fireEvent.change(searchInput, { target: { value: '존재하지않는필터검색어777' } });
    expect(screen.getByText('조건에 맞는 동작이 없어요.')).toBeInTheDocument();

    // Compared items persist across zero-result filters with honest out-of-filter indicator
    expect(within(card1).getByText('현재 필터 밖 · 비교 유지됨')).toBeInTheDocument();
    expect(within(card2).getByText('현재 필터 밖 · 비교 유지됨')).toBeInTheDocument();

    // Opening diagram preview directly from comparison card works even while filtered out
    fireEvent.click(
      within(card2).getByRole('button', { name: `비교함에서 ${matCorePending.nameKo} 도해 미리보기` }),
    );
    expect(
      within(screen.getByRole('region', { name: '선택한 패턴 도해 미리보기' })).getByRole(
        'heading',
        { name: '기구학 연속 도해 미리보기' },
      ),
    ).toBeInTheDocument();

    // Both search-bar clear and empty-result recovery clear expose distinct landmark/group context and descriptions
    const searchBarClearBtn = within(searchLandmark).getByRole('button', { name: '검색어 지우기' });
    const emptyRecoveryGroup = screen.getByRole('group', { name: '빈 검색 결과 복구' });
    const emptyRecoveryClearBtn = within(emptyRecoveryGroup).getByRole('button', {
      name: '검색어 지우기',
    });
    expect(searchBarClearBtn).toHaveAccessibleDescription('동작 검색');
    expect(emptyRecoveryClearBtn).toHaveAccessibleDescription('조건에 맞는 동작이 없어요.');

    // Clear search from the search landmark, restore focus, pin 3rd unilateral movement, and verify 4th is politely rejected
    fireEvent.click(searchBarClearBtn);
    expect(searchInput).toHaveValue('');
    await waitFor(() => expect(searchInput).toHaveFocus());

    fireEvent.click(
      screen.getByRole('button', { name: `${matLowerUnilateral.nameKo} 비교 담기` }),
    );
    expect(compareRegion).toHaveTextContent('비교 후보 3/3개');
    expect(
      screen.getByTestId(`atlas-compare-card-${matLowerUnilateral.id}`),
    ).toHaveTextContent('양쪽 포함');

    const fourthCompareBtn = screen.getByRole('button', {
      name: `${matCooldown.nameKo} 비교 담기`,
    });
    fireEvent.click(fourthCompareBtn);
    expect(fourthCompareBtn).toHaveAttribute('aria-pressed', 'false');
    expect(compareRegion).toHaveTextContent('비교 후보 3/3개');
    expect(screen.queryByTestId(`atlas-compare-card-${matCooldown.id}`)).toBeNull();
    expect(compareRegion).toHaveTextContent('최대 3개 동작까지 담을 수 있어요');
    expect(screen.queryByRole('alert')).toBeNull();

    // Add unreviewed movement directly from comparison card without approving it; verify comparison & filter state persist
    fireEvent.change(searchInput, { target: { value: '합성 QA' } });
    const activeCard2 = screen.getByTestId(`atlas-compare-card-${matCorePending.id}`);
    fireEvent.click(
      within(activeCard2).getByRole('button', {
        name: `비교함에서 ${matCorePending.nameKo} 수업안에 추가`,
      }),
    );

    const storeAfter = usePilatesStore.getState();
    expect(storeAfter.activeSteps).toHaveLength(1);
    expect(storeAfter.activeSteps[0]?.exerciseId).toBe(matCorePending.id);
    // Optional review contract preserved: adding never auto-approves an unreviewed movement
    expect(
      isExerciseAutoEligible(
        storeAfter.exercises.find((item) => item.id === matCorePending.id)!,
      ),
    ).toBe(false);

    // Search query, comparison tray, catalog card, and sequence return strip all stay synchronized
    expect(searchInput).toHaveValue('합성 QA');
    expect(compareRegion).toHaveTextContent('비교 후보 3/3개');
    expect(activeCard2).toHaveTextContent('수업안 포함 · #1');
    const catalogCard2 = screen
      .getByRole('button', { name: matCorePending.nameKo })
      .closest('.movement-card') as HTMLElement;
    expect(catalogCard2).toHaveClass('is-in-sequence', 'is-compared');
    expect(catalogCard2.querySelector('.movement-selected-badge')).toHaveTextContent(
      '수업안 포함 · #1',
    );
    const returnBar = document.querySelector('.ml-selection-return') as HTMLElement;
    expect(returnBar).toHaveAttribute('data-has-selection', 'true');
    expect(returnBar).toHaveTextContent(`#1 ${matCorePending.nameKo}`);
  }, 15000); // Covers the full comparison, filtering, motion-preview and add flow with real SVGs.

  it('surfaces pre-click sequence order, movement-family conflict, and class-criteria mismatch badges while preserving duplicate/criteria alert feedback', () => {
    vi.useFakeTimers();
    renderAtlas();

    // Current class criteria summary is visible upfront
    expect(screen.getByTestId('atlas-current-class-criteria')).toHaveTextContent(
      '현재 수업 기준: 매트 · 최대 Lv 1.0 · 목표 50분',
    );

    // Pre-click mismatch cues distinguish apparatus mismatch vs max-level mismatch
    expect(screen.getByTestId(`card-mismatch-${chairMismatch.id}`)).toHaveTextContent(
      '수업 기구 확인 · 현재 매트',
    );
    expect(screen.getByTestId(`card-mismatch-${matAdvancedMismatch.id}`)).toHaveTextContent(
      '난이도 확인 · 최대 Lv 1.0',
    );

    // Add matWarmup -> immediate '추가됨', then after 2700ms transitions to persistent '수업안 #1 포함' (not '추가됨')
    const warmupAddBtn = screen.getByRole('button', { name: `${matWarmup.nameKo} 수업안에 추가` });
    fireEvent.click(warmupAddBtn);
    expect(warmupAddBtn).toHaveTextContent('추가됨');

    act(() => {
      vi.advanceTimersByTime(2700);
    });
    expect(warmupAddBtn).not.toHaveTextContent('추가됨');
    expect(warmupAddBtn).toHaveTextContent('수업안 #1 포함');
    expect(warmupAddBtn).toHaveClass('is-in-sequence-cta');

    // Sibling movement sharing the same movementFamily now surfaces a pre-click conflict badge
    const conflictBadge = screen.getByTestId(`card-conflict-${matSameFamilyVariant.id}`);
    expect(conflictBadge).toHaveTextContent(`동일 계열 포함됨 · #1 ${matWarmup.nameKo}`);

    // Clicking add on the family-conflicting movement still preserves the store's duplicate rejection & role="alert"
    fireEvent.click(
      screen.getByRole('button', { name: `${matSameFamilyVariant.nameKo} 수업안에 추가` }),
    );
    expect(usePilatesStore.getState().activeSteps).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveTextContent(/중복/);
  });

  it('supports Escape key focus recovery on comparison panel, sequence-chip inspection across filters, sessionStorage filter recovery, and mobile/reduced-motion CSS rules', async () => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 390 });

    try {
      const { unmount } = renderAtlas();

      // Pin 2 items so comparison grid expands, then press Escape inside comparison panel -> collapses and restores focus to toggle button
      const firstCompareBtn = screen.getByRole('button', {
        name: `${matWarmup.nameKo} 비교 담기`,
      });
      fireEvent.click(firstCompareBtn);
      fireEvent.click(screen.getByRole('button', { name: `${matCorePending.nameKo} 비교 담기` }));

      const compareRegion = screen.getByRole('region', { name: '선택 동작 비교' });
      const collapseBtn = within(compareRegion).getByRole('button', { name: '비교표 접기' });
      expect(collapseBtn).toHaveAttribute('aria-expanded', 'true');

      fireEvent.keyDown(compareRegion, { key: 'Escape' });
      const expandBtn = within(compareRegion).getByRole('button', { name: '비교표 펼치기 (2)' });
      expect(expandBtn).toHaveAttribute('aria-expanded', 'false');
      await waitFor(() => expect(expandBtn).toHaveFocus());

      // Add matWarmup, filter it out of results, then click its chip in the sticky sequence strip -> opens inspector & focuses heading
      fireEvent.click(screen.getByRole('button', { name: `${matWarmup.nameKo} 수업안에 추가` }));
      const searchInput = screen.getByRole('searchbox', { name: '동작 검색' });
      fireEvent.change(searchInput, { target: { value: '스완' } });

      const seqChip = screen.getByRole('button', {
        name: `담긴 동작 1번 ${matWarmup.nameKo} 정보 보기`,
      });
      fireEvent.click(seqChip);

      const inspector = screen.getByRole('complementary', { name: '선택한 동작 정보' });
      await waitFor(() =>
        expect(within(inspector).getByRole('heading', { name: '선택한 동작 정보' })).toHaveFocus(),
      );
      expect(inspector).toHaveTextContent(matWarmup.nameKo);
      expect(inspector).toHaveTextContent('현재 검색 결과에 없는 동작입니다. 선택한 정보는 유지했어요.');

      // Clear compared items while filtered -> safely falls back focus to search input when last trigger card is filtered out
      fireEvent.click(within(compareRegion).getByRole('button', { name: /비교 비우기/ }));
      expect(screen.queryByRole('region', { name: '선택 동작 비교' })).toBeNull();
      await waitFor(() => expect(searchInput).toHaveFocus());

      // Verify sessionStorage filter recovery contract and safety/provenance disclaimers remain intact
      expect(window.sessionStorage.getItem(ATLAS_DISCOVERY_RECOVERY_KEY)).not.toBeNull();
      expect(
        screen.getByText('관련 패턴 참고용 · 검증된 운동 시범이 아닙니다.'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('개인 검토 상태와 출처는 동작 상세에서 확인하세요.'),
      ).toBeInTheDocument();

      unmount();
      renderAtlas();
      expect(screen.getByRole('searchbox', { name: '동작 검색' })).toHaveValue('스완');
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        writable: true,
        value: originalWidth,
      });
    }

    // Verify dedicated CSS enforces >= 44px touch targets, 390px/600px responsive rules, Korean wrap rules, and prefers-reduced-motion
    const usabilityCss = readFileSync(
      resolve(process.cwd(), 'src/components/ExerciseAtlasView.usability.css'),
      'utf8',
    );
    expect(usabilityCss).toContain('min-height: 44px');
    expect(usabilityCss).toContain('min-width: 44px');
    expect(usabilityCss).toContain('word-break: keep-all');
    expect(usabilityCss).toContain('overflow-wrap: anywhere');
    expect(usabilityCss).toContain('@media (max-width: 600px)');
    expect(usabilityCss).toContain('@media (max-width: 390px)');
    expect(usabilityCss).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
