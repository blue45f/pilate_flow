import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getEquipmentFamilies } from '../data/equipmentCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import type { PilatesExercise, PropType } from '../types/pilates';
import { EquipmentDiscoveryScope } from './EquipmentDiscoveryScope';
import { InventoryPanel } from './InventoryPanel';

const originalState = usePilatesStore.getState();

function seedSyntheticInventory(options: {
  ownedEquipment: string[];
  ownedProps: PropType[];
  exerciseBrowseScope?: 'owned' | 'all';
}) {
  const sampleMat = {
    ...syntheticPlanningExercise('mat', 'warmup'),
    id: 'inv-usability-mat',
    nameKo: '합성 매트 호흡',
    props: ['none'],
  } as PilatesExercise;

  usePilatesStore.setState(
    {
      ...originalState,
      exercises: [sampleMat],
      ownedEquipment: [...options.ownedEquipment],
      ownedApparatus: getEquipmentFamilies(options.ownedEquipment),
      ownedProps: [...options.ownedProps],
      exerciseBrowseScope: options.exerciseBrowseScope ?? 'owned',
      activeSteps: [
        {
          stepId: 'inv-step-1',
          order: 1,
          blockCategory: 'warmup',
          exerciseId: sampleMat.id,
          durationMin: 5,
          selectedLayer: 'standard',
        },
      ],
    },
    true,
  );
}

beforeEach(() => {
  localStorage.clear();
  seedSyntheticInventory({
    ownedEquipment: ['mat', 'reformer'],
    ownedProps: ['foam-roller'],
    exerciseBrowseScope: 'owned',
  });
});

afterEach(() => {
  cleanup();
  usePilatesStore.setState(originalState, true);
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('InventoryPanel selection summary and quick finder usability', () => {
  it('distinguishes unselected apparatus from no-props-selected without fake save or bulk mutation buttons', () => {
    seedSyntheticInventory({
      ownedEquipment: [],
      ownedProps: [],
      exerciseBrowseScope: 'owned',
    });

    render(<InventoryPanel />);
    const panel = within(screen.getByRole('region', { name: '내 보유 기구와 소도구' }));

    expect(panel.getAllByRole('checkbox')).toHaveLength(21);
    expect(panel.queryByRole('checkbox', { name: '소도구 없음' })).not.toBeInTheDocument();
    expect(panel.queryByRole('button', { name: /저장|적용 완료|전체 선택|전체 해제/ })).toBeNull();

    const summary = within(panel.getByTestId('inventory-selection-summary'));
    expect(summary.getByText('선택 현황 · 기구 0/8 · 소도구 0/13')).toBeVisible();
    expect(summary.getByText('체크 즉시 반영')).toBeVisible();
    expect(summary.getByTestId('inventory-no-equipment-notice')).toHaveTextContent(
      '기구 미선택 · 맨몸·매트 동작도 ‘매트’를 선택해야 내 보유 장비 범위에 표시됩니다.',
    );
    expect(summary.getByTestId('inventory-no-props-notice')).toHaveTextContent(
      '선택한 소도구 없음 · 소도구 없이 하는 동작(‘소도구 없음’)은 별도 체크 없이 선택한 기구만으로 포함됩니다.',
    );

    fireEvent.click(panel.getByRole('checkbox', { name: '매트' }));
    expect(usePilatesStore.getState().ownedEquipment).toEqual(['mat']);
    expect(summary.queryByTestId('inventory-no-equipment-notice')).toBeNull();
    expect(summary.getByText('선택 현황 · 기구 1/8 · 소도구 0/13')).toBeVisible();
    expect(summary.getByText('매트')).toBeVisible();
    expect(summary.getByTestId('inventory-no-props-notice')).toBeVisible();

    fireEvent.click(panel.getByRole('checkbox', { name: '루프 밴드' }));
    expect(usePilatesStore.getState().ownedProps).toEqual(['loop-band']);
    expect(summary.queryByTestId('inventory-no-props-notice')).toBeNull();
    expect(summary.getByText('선택 현황 · 기구 1/8 · 소도구 1/13')).toBeVisible();
    expect(summary.getByText(/루프 밴드/)).toBeVisible();
    expect(summary.getByText(/‘소도구 없음’ 동작도 함께 포함/)).toBeVisible();
  });

  it('keeps independent multi-selection without apparatus or prop variant substitution', () => {
    seedSyntheticInventory({
      ownedEquipment: ['cadillac'],
      ownedProps: ['theraband'],
    });

    render(<InventoryPanel />);
    const panel = within(screen.getByRole('region', { name: '내 보유 기구와 소도구' }));

    expect(panel.getByRole('checkbox', { name: '캐딜락' })).toBeChecked();
    expect(panel.getByRole('checkbox', { name: '타워' })).not.toBeChecked();
    expect(panel.getByRole('checkbox', { name: '탄력 밴드 · 종류 미지정' })).toBeChecked();
    expect(panel.getByRole('checkbox', { name: '루프 밴드' })).not.toBeChecked();
    expect(panel.getByRole('checkbox', { name: '튜브 밴드' })).not.toBeChecked();
    expect(panel.getByRole('checkbox', { name: '롱 밴드' })).not.toBeChecked();

    fireEvent.click(panel.getByRole('checkbox', { name: '스파인 코렉터' }));
    fireEvent.click(panel.getByRole('checkbox', { name: '미니볼' }));

    expect(panel.getByRole('checkbox', { name: '래더 바렐' })).not.toBeChecked();
    expect(panel.getByRole('checkbox', { name: '바렐 · 종류 미지정' })).not.toBeChecked();
    expect(usePilatesStore.getState().ownedEquipment).toEqual(['cadillac', 'spine-corrector']);
    expect(usePilatesStore.getState().ownedApparatus).toEqual(['cadillac', 'barrel']);
    expect(usePilatesStore.getState().ownedProps).toEqual(['theraband', 'mini-ball']);
  });

  it('preserves hidden selections across section collapse, search, filter switching, and view reset', () => {
    render(<InventoryPanel />);
    const panel = within(screen.getByRole('region', { name: '내 보유 기구와 소도구' }));

    const collapseEquipmentBtn = panel.getByRole('button', { name: '기구 목록 접기' });
    expect(collapseEquipmentBtn).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(collapseEquipmentBtn);

    expect(panel.getByRole('button', { name: '기구 목록 펼치기' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(panel.queryByRole('checkbox', { name: '매트' })).toBeNull();
    expect(panel.getByTestId('inventory-equipment-collapsed-summary')).toHaveTextContent(
      '접힘 · 선택된 기구: 매트, 리포머',
    );
    expect(panel.getByText(/화면 밖 선택 2개 그대로 유지됨/)).toBeVisible();
    expect(usePilatesStore.getState().ownedEquipment).toEqual(['mat', 'reformer']);

    const searchInput = panel.getByRole('searchbox', { name: '보유 기구·소도구 찾기' });
    fireEvent.change(searchInput, { target: { value: '루프밴드' } });
    expect(panel.getAllByRole('checkbox')).toHaveLength(1);
    fireEvent.click(panel.getByRole('checkbox', { name: '루프 밴드' }));

    expect(usePilatesStore.getState().ownedEquipment).toEqual(['mat', 'reformer']);
    expect(usePilatesStore.getState().ownedProps).toEqual(['foam-roller', 'loop-band']);
    expect(panel.getByText(/화면 밖 선택 3개 그대로 유지됨/)).toBeVisible();

    fireEvent.change(searchInput, { target: { value: '' } });
    fireEvent.click(panel.getByRole('button', { name: '선택됨 (4)' }));
    expect(panel.getAllByRole('checkbox')).toHaveLength(4);
    expect(panel.getByRole('checkbox', { name: '매트' })).toBeChecked();
    expect(panel.getByRole('checkbox', { name: '리포머' })).toBeChecked();
    expect(panel.getByRole('checkbox', { name: '폼롤러' })).toBeChecked();
    expect(panel.getByRole('checkbox', { name: '루프 밴드' })).toBeChecked();

    fireEvent.click(panel.getByRole('checkbox', { name: '폼롤러' }));
    expect(usePilatesStore.getState().ownedProps).toEqual(['loop-band']);
    expect(panel.getByRole('button', { name: '선택됨 (3)' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(panel.getAllByRole('checkbox')).toHaveLength(3);

    fireEvent.click(panel.getByRole('button', { name: '보유 장비 찾기 초기화' }));
    expect(panel.getByRole('button', { name: '전체 (21)' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(panel.getAllByRole('checkbox')).toHaveLength(21);
    expect(usePilatesStore.getState().ownedEquipment).toEqual(['mat', 'reformer']);
    expect(usePilatesStore.getState().ownedProps).toEqual(['loop-band']);
  });

  it('handles whitespace queries, empty search results, and empty selected filter recovery safely', () => {
    seedSyntheticInventory({
      ownedEquipment: ['chair'],
      ownedProps: [],
    });

    render(<InventoryPanel />);
    const panel = within(screen.getByRole('region', { name: '내 보유 기구와 소도구' }));
    const searchInput = panel.getByRole('searchbox', { name: '보유 기구·소도구 찾기' });

    fireEvent.change(searchInput, { target: { value: '   ' } });
    expect(panel.getAllByRole('checkbox')).toHaveLength(21);
    fireEvent.click(panel.getByRole('button', { name: '보유 장비 검색어 지우기' }));
    expect(searchInput).toHaveValue('');
    expect(searchInput).toHaveFocus();

    fireEvent.change(searchInput, { target: { value: '없는장비이름' } });
    const emptyNotice = panel.getByTestId('inventory-empty-results');
    expect(emptyNotice).toHaveTextContent('‘없는장비이름’에 해당하는 기구·소도구가 없습니다.');
    expect(emptyNotice).toHaveTextContent('기존에 선택한 장비 1개는 그대로 유지됩니다.');
    expect(usePilatesStore.getState().ownedEquipment).toEqual(['chair']);

    fireEvent.click(within(emptyNotice).getByRole('button', { name: '전체 항목 다시 보기' }));
    expect(searchInput).toHaveValue('');
    expect(searchInput).toHaveFocus();
    expect(panel.getAllByRole('checkbox')).toHaveLength(21);
    expect(panel.getByRole('checkbox', { name: '체어' })).toBeChecked();

    fireEvent.click(panel.getByRole('checkbox', { name: '체어' }));
    expect(usePilatesStore.getState().ownedEquipment).toEqual([]);

    fireEvent.click(panel.getByRole('button', { name: '선택됨 (0)' }));
    const emptySelected = panel.getByTestId('inventory-empty-results');
    expect(emptySelected).toHaveTextContent('현재 체크한 기구·소도구가 없습니다.');
    fireEvent.click(within(emptySelected).getByRole('button', { name: '전체 항목 다시 보기' }));
    expect(panel.getAllByRole('checkbox')).toHaveLength(21);
    expect(usePilatesStore.getState().ownedEquipment).toEqual([]);
    expect(usePilatesStore.getState().ownedProps).toEqual([]);
  });

  it('supports keyboard roving across filter chips and clears non-empty search on Escape without bubbling', () => {
    const parentKeyDown = vi.fn();
    render(
      <div onKeyDown={parentKeyDown}>
        <InventoryPanel />
      </div>,
    );
    const panel = within(screen.getByRole('region', { name: '내 보유 기구와 소도구' }));

    const allChip = panel.getByRole('button', { name: '전체 (21)' });
    allChip.focus();
    expect(allChip).toHaveFocus();

    fireEvent.keyDown(allChip, { key: 'ArrowRight' });
    const selectedChip = panel.getByRole('button', { name: '선택됨 (3)' });
    expect(selectedChip).toHaveFocus();
    expect(selectedChip).toHaveAttribute('aria-pressed', 'true');
    expect(panel.getAllByRole('checkbox')).toHaveLength(3);

    fireEvent.keyDown(selectedChip, { key: 'End' });
    const propsChip = panel.getByRole('button', { name: '소도구만 (13)' });
    expect(propsChip).toHaveFocus();
    expect(propsChip).toHaveAttribute('aria-pressed', 'true');
    expect(panel.getAllByRole('checkbox')).toHaveLength(13);

    fireEvent.keyDown(propsChip, { key: 'Home' });
    expect(panel.getByRole('button', { name: '전체 (21)' })).toHaveFocus();
    expect(panel.getAllByRole('checkbox')).toHaveLength(21);

    fireEvent.keyDown(panel.getByRole('button', { name: '전체 (21)' }), { key: 'ArrowLeft' });
    expect(panel.getByRole('button', { name: '소도구만 (13)' })).toHaveFocus();
    fireEvent.click(panel.getByRole('button', { name: '전체 (21)' }));

    expect(usePilatesStore.getState().ownedEquipment).toEqual(['mat', 'reformer']);
    expect(usePilatesStore.getState().ownedProps).toEqual(['foam-roller']);

    parentKeyDown.mockClear();
    const searchInput = panel.getByRole('searchbox', { name: '보유 기구·소도구 찾기' });
    fireEvent.change(searchInput, { target: { value: '캐리지' } });
    expect(panel.getAllByRole('checkbox')).toHaveLength(1);
    expect(panel.getByRole('checkbox', { name: '리포머' })).toBeChecked();

    fireEvent.keyDown(searchInput, { key: 'Escape' });
    expect(searchInput).toHaveValue('');
    expect(panel.getAllByRole('checkbox')).toHaveLength(21);
    expect(parentKeyDown).not.toHaveBeenCalled();

    fireEvent.keyDown(searchInput, { key: 'Escape' });
    expect(parentKeyDown).toHaveBeenCalledTimes(1);
  });

  it('preserves the owned/all discovery scope boundary and active class draft across inventory interactions', () => {
    seedSyntheticInventory({
      ownedEquipment: ['mat'],
      ownedProps: ['mini-ball'],
      exerciseBrowseScope: 'all',
    });

    const beforeSteps = usePilatesStore.getState().activeSteps;
    const beforeDraftCriteria = usePilatesStore.getState().draftCriteria;

    render(
      <>
        <InventoryPanel />
        <EquipmentDiscoveryScope />
      </>,
    );

    const panel = within(screen.getByRole('region', { name: '내 보유 기구와 소도구' }));
    const scopeSection = within(screen.getByRole('region', { name: '장비 탐색 범위' }));

    expect(panel.getByTestId('inventory-browse-scope-note')).toHaveTextContent(
      '탐색 상태: 전체 장비 보기 중',
    );

    fireEvent.click(panel.getByRole('button', { name: '소도구만 (13)' }));
    fireEvent.click(panel.getByRole('checkbox', { name: '짐볼' }));
    fireEvent.click(panel.getByRole('button', { name: '보유 장비 찾기 초기화' }));

    expect(usePilatesStore.getState().exerciseBrowseScope).toBe('all');
    expect(usePilatesStore.getState().ownedEquipment).toEqual(['mat']);
    expect(usePilatesStore.getState().ownedProps).toEqual(['mini-ball', 'fitness-ball']);
    expect(usePilatesStore.getState().activeSteps).toBe(beforeSteps);
    expect(usePilatesStore.getState().draftCriteria).toBe(beforeDraftCriteria);

    fireEvent.click(scopeSection.getByRole('button', { name: '내 보유 장비' }));
    expect(panel.getByTestId('inventory-browse-scope-note')).toHaveTextContent(
      '탐색 적용: 내 보유 장비',
    );
    expect(usePilatesStore.getState().ownedEquipment).toEqual(['mat']);
    expect(usePilatesStore.getState().ownedProps).toEqual(['mini-ball', 'fitness-ball']);
  });
});
