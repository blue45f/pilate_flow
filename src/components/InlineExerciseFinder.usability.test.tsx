import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { resolvePatternReferencesForRenderer } from '../features/motionCoverage';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import type { AutoGenerateCriteria, PilatesExercise } from '../types/pilates';
import { isExerciseAutoEligible } from '../utils/exerciseReview';
import {
  INLINE_FINDER_QUERY_STORAGE_KEY,
  InlineExerciseFinder,
} from './InlineExerciseFinder';

const originalState = usePilatesStore.getState();
const initialCatalogJson = JSON.stringify(INITIAL_EXERCISES);

const baseCriteria: AutoGenerateCriteria = {
  apparatus: 'mat',
  ownedApparatus: ['mat', 'reformer'],
  availableEquipment: ['mat', 'reformer'],
  preferredProps: ['none'],
  level: '1.5',
  targetMinutes: 50,
  focusPreset: 'full-body',
  defaultLayer: 'standard',
  excludeDaysWindow: 0,
};

beforeEach(() => {
  window.sessionStorage.clear();
  vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
    throw new Error('Network calls are forbidden in InlineExerciseFinder usability tests');
  });
  usePilatesStore.setState(
    {
      ...originalState,
      exercises: [],
      activeSteps: [],
      activeSequenceId: 'syn-finder-usability-seq',
      activeApparatus: 'mat',
      activeLevel: '1.5',
      activeTargetMinutes: 50,
      ownedEquipment: ['mat', 'reformer'],
      ownedApparatus: ['mat', 'reformer'],
      ownedProps: [],
      exerciseBrowseScope: 'all',
      draftCriteria: baseCriteria,
      lastCriteria: null,
      generationError: null,
    },
    true,
  );
});

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  vi.restoreAllMocks();
  usePilatesStore.setState(originalState, true);
  expect(JSON.stringify(INITIAL_EXERCISES)).toBe(initialCatalogJson);
});

describe('InlineExerciseFinder individual filter chips, non-destructive 0-result recovery, and position return', () => {
  it('removes individual filter chips while drawer is closed, recovers 0 results via query-only clear without losing filters, and keeps store/setItem untouched', async () => {
    const synMatShort: PilatesExercise = {
      ...syntheticPlanningExercise('mat', 'warmup', 'alpha', false),
      id: 'syn-ief-mat-short',
      nameKo: '합성 매트 호흡 준비',
      targetMuscles: ['복부'],
      defaultDurationMin: 3,
    };
    const synMatMediumGlute: PilatesExercise = {
      ...syntheticPlanningExercise('mat', 'bridging', 'beta', false),
      id: 'syn-ief-mat-glute',
      nameKo: '합성 매트 브릿지',
      targetMuscles: ['둔근'],
      defaultDurationMin: 4,
    };
    const synReformerMediumGlute: PilatesExercise = {
      ...syntheticPlanningExercise('reformer', 'lower-body', 'alpha', true),
      id: 'syn-ief-reformer-glute',
      nameKo: '합성 리포머 풋워크',
      targetMuscles: ['둔근'],
      defaultDurationMin: 5,
    };
    const synChairLong: PilatesExercise = {
      ...syntheticPlanningExercise('chair', 'core', 'alpha', false),
      id: 'syn-ief-chair-long',
      nameKo: '합성 체어 코어',
      targetMuscles: ['복부'],
      defaultDurationMin: 6,
    };

    usePilatesStore.setState({
      exercises: [synMatShort, synMatMediumGlute, synReformerMediumGlute, synChairLong],
    });
    const beforeStore = usePilatesStore.getState();
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const storeSubscribeSpy = vi.fn();
    const unsubscribe = usePilatesStore.subscribe(storeSubscribeSpy);

    render(<InlineExerciseFinder onOpenExercise={vi.fn()} />);

    // Open filter drawer, apply 2 equipment + bodyTag + duration, then close the drawer
    const filterToggleBtn = screen.getByRole('button', { name: '필터' });
    fireEvent.click(filterToggleBtn);
    fireEvent.click(screen.getByRole('button', { name: '매트' }));
    fireEvent.click(screen.getByRole('button', { name: '리포머' }));
    fireEvent.click(screen.getByRole('tab', { name: '부위' }));
    fireEvent.change(screen.getByLabelText('등록된 부위 태그'), { target: { value: '둔근' } });
    fireEvent.click(screen.getByRole('tab', { name: '시간' }));
    fireEvent.click(screen.getByRole('button', { name: '3분 초과–5분' }));

    // Close the filter drawer (4 active filters)
    fireEvent.click(screen.getByRole('button', { name: '필터 4' }));
    expect(screen.getByRole('button', { name: '필터 4' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getAllByRole('article')).toHaveLength(2);

    // Applied condition chips stay visible when drawer is closed and support keyboard arrow focus
    const chipGroup = screen.getByRole('group', { name: '적용된 찾기 조건' });
    const matChip = within(chipGroup).getByRole('button', { name: '매트 필터 해제' });
    const reformerChip = within(chipGroup).getByRole('button', { name: '리포머 필터 해제' });
    const durationChip = within(chipGroup).getByRole('button', {
      name: '시간 3분 초과–5분 필터 해제',
    });

    matChip.focus();
    fireEvent.keyDown(chipGroup, { key: 'ArrowRight' });
    expect(reformerChip).toHaveFocus();
    fireEvent.keyDown(chipGroup, { key: 'End' });
    expect(durationChip).toHaveFocus();
    fireEvent.keyDown(chipGroup, { key: 'Home' });
    expect(matChip).toHaveFocus();

    // Remove ONLY '매트' chip -> leaves '리포머' + '둔근' + '3분 초과–5분' intact (1 result) and hands focus to next chip
    fireEvent.click(matChip);
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(
      screen.getByRole('article', { name: '합성 리포머 풋워크 동작 노트' }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        within(screen.getByRole('group', { name: '적용된 찾기 조건' })).getByRole('button', {
          name: '리포머 필터 해제',
        }),
      ).toHaveFocus(),
    );

    // Typing a typo produces 0 results while preserving all 3 active chips; '검색어만 지우기' restores results without wiping filters
    const searchBox = screen.getByRole('searchbox', {
      name: '동작 이름 또는 등록된 부위 태그 검색',
    });
    fireEvent.change(searchBox, { target: { value: '오타검색어999' } });
    expect(screen.getByText('조건에 맞는 동작이 없어요')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '적용된 찾기 조건' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '검색어만 지우기' }));
    expect(searchBox).toHaveValue('');
    expect(window.sessionStorage.getItem(INLINE_FINDER_QUERY_STORAGE_KEY)).toBeNull();
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('button', { name: '필터 3' })).toBeInTheDocument();
    await waitFor(() => expect(searchBox).toHaveFocus());

    // Inline '검색어 지우기' icon button also clears only query while keeping active filter chips
    fireEvent.change(searchBox, { target: { value: '풋워크' } });
    fireEvent.click(screen.getByRole('button', { name: '검색어 지우기' }));
    expect(searchBox).toHaveValue('');
    expect(screen.getByRole('button', { name: '필터 3' })).toBeInTheDocument();

    // Removing the remaining 3 chips hands focus back to search input cleanly
    fireEvent.click(screen.getByRole('button', { name: '리포머 필터 해제' }));
    fireEvent.click(screen.getByRole('button', { name: '부위 둔근 필터 해제' }));
    fireEvent.click(screen.getByRole('button', { name: '시간 3분 초과–5분 필터 해제' }));
    expect(screen.queryByRole('group', { name: '적용된 찾기 조건' })).toBeNull();
    expect(screen.getAllByRole('article')).toHaveLength(4);
    await waitFor(() => expect(searchBox).toHaveFocus());

    expect(usePilatesStore.getState()).toBe(beforeStore);
    expect(storeSubscribeSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('preserves classEquipment vs owned-equipment boundaries, suitability checks, and pending-note direct add without granting auto-review', () => {
    const pendingMatOk: PilatesExercise = {
      ...syntheticPlanningExercise('mat', 'warmup', 'alpha', false),
      id: 'syn-pending-mat-ok',
      nameKo: '합성 미검토 매트 동작',
      props: ['none'],
    };
    const matNeedsUnownedBall: PilatesExercise = {
      ...syntheticPlanningExercise('mat', 'core', 'beta', true),
      id: 'syn-mat-unowned-ball',
      nameKo: '합성 미니볼 매트 동작',
      props: ['mini-ball'],
    };
    const reformerUnowned: PilatesExercise = {
      ...syntheticPlanningExercise('reformer', 'footwork', 'alpha', true),
      id: 'syn-reformer-unowned',
      nameKo: '합성 미보유 리포머 동작',
      props: ['none'],
    };

    usePilatesStore.setState({
      exercises: [pendingMatOk, matNeedsUnownedBall, reformerUnowned],
      ownedEquipment: ['mat'],
      ownedApparatus: ['mat'],
      ownedProps: [],
      exerciseBrowseScope: 'owned',
      draftCriteria: {
        ...baseCriteria,
        apparatus: 'mat',
        ownedApparatus: ['mat'],
        availableEquipment: ['mat'],
      },
    });

    render(<InlineExerciseFinder onOpenExercise={vi.fn()} classEquipment={['mat']} />);

    // Owned scope filters out unowned prop ('mini-ball') and unowned apparatus ('reformer')
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(
      screen.getByRole('article', { name: '합성 미검토 매트 동작 동작 노트' }),
    ).toBeInTheDocument();

    // Switching to '전체 장비 보기' shows all 3; narrowing to '수업 기구로 좁히기' shows the 2 Mat exercises without mutating ownedEquipment
    fireEvent.click(screen.getByRole('button', { name: '전체 장비 보기' }));
    expect(screen.getAllByRole('article')).toHaveLength(3);

    fireEvent.click(screen.getByRole('button', { name: '수업 기구로 좁히기' }));
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(usePilatesStore.getState().ownedEquipment).toEqual(['mat']);

    // Directly adding a pending (unreviewed) note succeeds for manual composition without marking it auto-eligible
    expect(isExerciseAutoEligible(pendingMatOk)).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: '합성 미검토 매트 동작 수업안에 추가' }));
    expect(usePilatesStore.getState().activeSteps).toHaveLength(1);
    expect(usePilatesStore.getState().activeSteps[0]?.exerciseId).toBe(pendingMatOk.id);
    expect(
      screen.getByText('합성 미검토 매트 동작 동작을 수업안에 추가했어요.'),
    ).toBeInTheDocument();
    const afterExercise = usePilatesStore
      .getState()
      .exercises.find((item) => item.id === pendingMatOk.id)!;
    expect(isExerciseAutoEligible(afterExercise)).toBe(false);
  });

  it('returns to the selected card from detail/preview, handles Escape and active=false preview lifecycle, and rescues focus on add', async () => {
    const mappedTemplate = INITIAL_EXERCISES.find(
      (item) =>
        item.apparatus === 'mat' &&
        item.props.every((prop) => prop === 'none') &&
        Number(item.level) <= 1.5 &&
        resolvePatternReferencesForRenderer(item).length > 0,
    )!;
    const mappedRefs = resolvePatternReferencesForRenderer(mappedTemplate);
    expect(mappedRefs.length).toBeGreaterThan(0);

    // Confirm renderer safety contract: tampering with catalog apparatus rejects mismatched pattern drafts
    expect(
      resolvePatternReferencesForRenderer({
        ...structuredClone(mappedTemplate),
        apparatus: 'reformer',
      }),
    ).toEqual([]);

    const mappedSynthetic: PilatesExercise = {
      ...structuredClone(mappedTemplate),
      nameKo: '합성 8번 패턴 도해 동작',
      nameEn: 'Synthetic Pattern Mapped 8',
      cues: ['합성 큐 8-1'],
      precautions: '합성 주의점 8',
      review: undefined,
    };
    expect(resolvePatternReferencesForRenderer(mappedSynthetic)).toHaveLength(mappedRefs.length);

    const syntheticNine: PilatesExercise[] = Array.from({ length: 9 }, (_, index) => {
      if (index === 7) {
        return mappedSynthetic;
      }
      return {
        ...syntheticPlanningExercise('mat', 'core', index % 2 === 0 ? 'alpha' : 'beta', false),
        id: `syn-page-item-${index}`,
        movementFamily: `syn-family-${index}`,
        nameKo: `합성 목록 동작 ${index + 1}`,
        nameEn: `Synthetic List Movement ${index + 1}`,
        props: ['none'],
        level: '1.0',
      };
    });

    usePilatesStore.setState({ exercises: syntheticNine });
    const onOpenExercise = vi.fn();
    const outerKeyDownSpy = vi.fn();

    const { rerender } = render(
      <div onKeyDown={outerKeyDownSpy}>
        <InlineExerciseFinder onOpenExercise={onOpenExercise} active />
      </div>,
    );

    // Reveal page 2 and open detail on 8th card (index 7)
    fireEvent.click(screen.getByRole('button', { name: /동작 더 보기/ }));
    expect(screen.getAllByRole('article')).toHaveLength(9);

    fireEvent.click(screen.getByRole('button', { name: '합성 8번 패턴 도해 동작 상세 보기' }));
    expect(onOpenExercise).toHaveBeenCalledWith(syntheticNine[7]);
    expect(
      screen.getByRole('article', { name: '합성 8번 패턴 도해 동작 동작 노트' }),
    ).toHaveAttribute('data-last-visited', 'true');

    // Type and clear query so pagination resets to 6 cards (8th card is now hidden on page 2)
    const searchBox = screen.getByRole('searchbox', {
      name: '동작 이름 또는 등록된 부위 태그 검색',
    });
    fireEvent.change(searchBox, { target: { value: '합성' } });
    fireEvent.click(screen.getByRole('button', { name: '검색어 지우기' }));
    expect(screen.getAllByRole('article')).toHaveLength(6);
    await waitFor(() => expect(searchBox).toHaveFocus());

    const jumpBtn = screen.getByRole('button', {
      name: '방금 본 합성 8번 패턴 도해 동작 카드 위치로 이동',
    });
    expect(jumpBtn).toHaveTextContent('방금 본 위치 펼치기');
    fireEvent.click(jumpBtn);

    // Automatically expands pagination and focuses the 8th card's title button
    expect(screen.getAllByRole('article')).toHaveLength(9);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '합성 8번 패턴 도해 동작' })).toHaveFocus(),
    );

    // Open inline motion preview on 8th card; Escape closes ONLY preview (no bubble) and returns focus to trigger
    const draftTrigger = screen.getByRole('button', { name: `${mappedRefs[0].title} 초안 보기` });
    fireEvent.click(draftTrigger);
    const previewRegion = screen.getByRole('region', { name: '선택한 모션 초안' });
    expect(previewRegion).toHaveFocus();

    outerKeyDownSpy.mockClear();
    fireEvent.keyDown(previewRegion, { key: 'Escape' });
    expect(screen.queryByRole('region', { name: '선택한 모션 초안' })).toBeNull();
    expect(outerKeyDownSpy).not.toHaveBeenCalled();
    expect(draftTrigger).toHaveFocus();

    // Re-open preview, verify active=false pauses playback without auto-resuming, then insert step from preview
    fireEvent.click(draftTrigger);
    fireEvent.click(screen.getByRole('button', { name: '한 주기 재생' }));
    expect(screen.getByRole('button', { name: '일시정지' })).toBeEnabled();

    rerender(
      <div onKeyDown={outerKeyDownSpy}>
        <InlineExerciseFinder onOpenExercise={onOpenExercise} active={false} />
      </div>,
    );
    expect(screen.getByRole('button', { name: '한 주기 재생' })).toBeDisabled();

    rerender(
      <div onKeyDown={outerKeyDownSpy}>
        <InlineExerciseFinder onOpenExercise={onOpenExercise} active />
      </div>,
    );
    expect(screen.getByRole('button', { name: '한 주기 재생' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: '일시정지' })).toBeNull();

    fireEvent.click(
      screen.getByRole('button', { name: '합성 8번 패턴 도해 동작 초안 확인 후 시퀀스 삽입' }),
    );
    expect(usePilatesStore.getState().activeSteps).toHaveLength(1);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '모션 초안 닫기' })).toHaveFocus(),
    );
    fireEvent.click(screen.getByRole('button', { name: '모션 초안 닫기' }));
    expect(draftTrigger).toHaveFocus();

    // Adding directly from a card rescues focus onto that card's heading button when its add button becomes disabled
    fireEvent.click(screen.getByRole('button', { name: '합성 목록 동작 1 수업안에 추가' }));
    expect(usePilatesStore.getState().activeSteps).toHaveLength(2);
    expect(
      screen.getByRole('button', { name: '합성 목록 동작 1 이미 수업안에 있음' }),
    ).toBeDisabled();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '합성 목록 동작 1' })).toHaveFocus(),
    );
  });

  it('enforces >=44px touch targets, 340px/390px narrow-width layouts, keep-all wrapping, and prefers-reduced-motion in owned CSS', () => {
    const finderCss = readFileSync(
      resolve(process.cwd(), 'src/styles/inline-exercise-finder.css'),
      'utf8',
    );
    const contextCss = readFileSync(
      resolve(process.cwd(), 'src/styles/finder-class-context.css'),
      'utf8',
    );

    expect(finderCss).toContain('min-height: 44px');
    expect(finderCss).toContain('@media (max-width: 390px)');
    expect(finderCss).toContain('@media (max-width: 340px)');
    expect(finderCss).toContain('@media (prefers-reduced-motion: reduce)');
    expect(finderCss).toContain('word-break: keep-all');

    expect(contextCss).toContain('min-height: 44px');
    expect(contextCss).toContain('@media (max-width: 390px)');
    expect(contextCss).toContain('@media (prefers-reduced-motion: reduce)');
    expect(contextCss).toContain('word-break: keep-all');
  });
});
