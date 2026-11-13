import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import { InlineExerciseFinder } from './InlineExerciseFinder';
import { ExerciseAtlasView } from './ExerciseAtlasView';
import { InventoryPanel } from './InventoryPanel';
import { CourseReferenceBrowser } from './CourseReferenceBrowser';
import type { PilatesExercise } from '../types/pilates';

const original = usePilatesStore.getState();
const mat = {
  ...syntheticPlanningExercise('mat', 'warmup'),
  id: 'sync-mat',
  nameKo: '싱크 매트',
  props: ['none'],
} as PilatesExercise;
const tower = {
  ...syntheticPlanningExercise('cadillac', 'core'),
  id: 'sync-tower',
  nameKo: '싱크 타워',
  requiredEquipment: ['tower'],
  props: ['none'],
} as PilatesExercise;
const withProp = {
  ...mat,
  id: 'sync-prop',
  nameKo: '싱크 볼',
  props: ['mini-ball'],
} as PilatesExercise;
const combination = {
  ...mat,
  id: 'sync-combined',
  nameKo: '싱크 복합',
  requiredEquipment: ['mat', 'chair'],
};
const unknown = { ...mat, id: 'sync-unknown', nameKo: '싱크 미확인', requiredEquipment: [] };
const exercises = [mat, tower, withProp, combination, unknown];

beforeEach(() => {
  usePilatesStore.setState(
    {
      ...original,
      exercises,
      ownedEquipment: ['mat', 'cadillac'],
      ownedProps: [],
      exerciseBrowseScope: 'owned',
      activeSteps: [],
    },
    true,
  );
});
afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
});

describe('equipment discovery scope synchronization', () => {
  it('immediately applies settings changes to both mounted search surfaces without changing the class', () => {
    render(
      <>
        <InventoryPanel />
        <InlineExerciseFinder onOpenExercise={vi.fn()} />
        <ExerciseAtlasView initialView="tools" onOpenYouTubePreview={vi.fn()} onOpenClipper={vi.fn()} />
      </>,
    );
    const before = usePilatesStore.getState();
    const finder = within(screen.getByRole('complementary', { name: '작업대 동작 찾기' }));
    const atlas = within(screen.getByRole('tabpanel', { name: /동작 노트/ }));
    expect(finder.getByRole('article', { name: '싱크 매트 동작 노트' })).toBeVisible();
    expect(finder.queryByRole('article', { name: '싱크 타워 동작 노트' })).toBeNull();
    expect(atlas.queryByRole('button', { name: '싱크 볼' })).toBeNull();
    const inventory = within(screen.getByRole('region', { name: '내 보유 기구와 소도구' }));
    fireEvent.click(inventory.getByRole('checkbox', { name: '미니볼' }));
    expect(finder.getByRole('article', { name: '싱크 볼 동작 노트' })).toBeVisible();
    expect(atlas.getByRole('button', { name: '싱크 볼' })).toBeVisible();
    fireEvent.click(inventory.getByRole('checkbox', { name: '타워' }));
    expect(finder.getByRole('article', { name: '싱크 타워 동작 노트' })).toBeVisible();
    fireEvent.click(inventory.getByRole('checkbox', { name: '체어' }));
    expect(finder.getByRole('article', { name: '싱크 복합 동작 노트' })).toBeVisible();
    expect(finder.queryByRole('article', { name: '싱크 미확인 동작 노트' })).toBeNull();
    fireEvent.click(inventory.getByRole('checkbox', { name: '매트' }));
    expect(finder.queryByRole('article', { name: '싱크 매트 동작 노트' })).toBeNull();
    expect(atlas.queryByRole('button', { name: '싱크 복합' })).toBeNull();
    const after = usePilatesStore.getState();
    expect(after.activeSteps).toBe(before.activeSteps);
    expect(after.draftCriteria).toBe(before.draftCriteria);
    expect(after.exercises).toBe(before.exercises);
  });

  it('shares explicit all/owned selection and preserves the scope across local reset and remount', () => {
    const { unmount } = render(
      <>
        <InlineExerciseFinder onOpenExercise={vi.fn()} />
        <ExerciseAtlasView initialView="tools" onOpenYouTubePreview={vi.fn()} onOpenClipper={vi.fn()} />
      </>,
    );
    const finder = within(screen.getByRole('complementary', { name: '작업대 동작 찾기' }));
    fireEvent.click(finder.getByRole('button', { name: '전체 장비 보기' }));
    expect(
      screen
        .getAllByRole('button', { name: '전체 장비 보기' })
        .every((button) => button.getAttribute('aria-pressed') === 'true'),
    ).toBe(true);
    expect(finder.getAllByRole('article')).toHaveLength(5);
    fireEvent.change(finder.getByRole('searchbox'), { target: { value: '싱크' } });
    fireEvent.click(finder.getByRole('button', { name: '동작 찾기 검색·필터 초기화' }));
    expect(usePilatesStore.getState().exerciseBrowseScope).toBe('all');
    unmount();
    render(<InlineExerciseFinder onOpenExercise={vi.fn()} />);
    expect(screen.getAllByRole('article')).toHaveLength(5);
    fireEvent.click(screen.getByRole('button', { name: '내 보유 장비' }));
    expect(screen.getAllByRole('article')).toHaveLength(1);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '없는 검색어' } });
    fireEvent.click(screen.getByRole('button', { name: '검색·필터 초기화' }));
    expect(usePilatesStore.getState().exerciseBrowseScope).toBe('owned');
    expect(screen.getAllByRole('article')).toHaveLength(1);
  });

  it('shows an honest empty inventory and never treats unknown requirements as equipment-free', () => {
    usePilatesStore.setState({ ownedEquipment: [], ownedProps: [] });
    render(<InlineExerciseFinder onOpenExercise={vi.fn()} />);
    expect(screen.queryByRole('article')).toBeNull();
    expect(screen.getByText(/내 보유 장비 범위에서 결과가 없습니다/)).toBeVisible();
    fireEvent.click(screen.getByText('보유 장비 범위 필터 설정 (0종)'));
    expect(screen.getByText(/매트 동작도 매트를 선택해야/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '보유 장비 조건만 해제' }));
    expect(screen.getAllByRole('article')).toHaveLength(5);
    expect(usePilatesStore.getState().ownedEquipment).toEqual([]);
    expect(usePilatesStore.getState().ownedProps).toEqual([]);
  });

  it('applies the shared scope to public references and course links without inventing requirements', () => {
    render(<ExerciseAtlasView initialView="tools" onOpenYouTubePreview={vi.fn()} onOpenClipper={vi.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: /공개 자료/ }));
    expect(
      screen.getByRole('checkbox', { name: /내 보유 기구·소도구로 모두 가능한 자료만/ }),
    ).toBeChecked();
    fireEvent.click(screen.getByRole('tab', { name: /수업 영상/ }));
    expect(screen.getByText(/전체 필수 장비가 확인된 링크가 없어/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '보유 장비 조건만 해제' }));
    expect(usePilatesStore.getState().exerciseBrowseScope).toBe('all');
    expect(screen.getAllByRole('article').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('tab', { name: /공개 자료/ }));
    expect(
      screen.getByRole('checkbox', { name: /내 보유 기구·소도구로 모두 가능한 자료만/ }),
    ).not.toBeChecked();
  });

  it('recovers empty public reference results with an explicit all-equipment choice', () => {
    usePilatesStore.setState({ ownedEquipment: [] });
    render(<ExerciseAtlasView initialView="tools" onOpenYouTubePreview={vi.fn()} onOpenClipper={vi.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: /공개 자료/ }));
    fireEvent.click(screen.getByRole('button', { name: '전체 참고 자료 보기' }));
    expect(usePilatesStore.getState().exerciseBrowseScope).toBe('all');
    expect(screen.getAllByRole('article').length).toBeGreaterThan(0);
    expect(usePilatesStore.getState().ownedEquipment).toEqual([]);
  });

  it('searches recorded prop labels within the currently owned scope', () => {
    render(<InlineExerciseFinder onOpenExercise={vi.fn()} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '미니볼' } });
    expect(screen.queryByRole('article')).toBeNull();
    act(() => usePilatesStore.getState().toggleOwnedProp('mini-ball'));
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('article', { name: '싱크 볼 동작 노트' })).toBeVisible();
  });

  it('retains the owned scope when course search filters reset', () => {
    render(<CourseReferenceBrowser />);
    fireEvent.click(screen.getByRole('button', { name: '필터 초기화' }));
    expect(usePilatesStore.getState().exerciseBrowseScope).toBe('owned');
    expect(screen.getByText(/전체 필수 장비가 확인된 링크가 없어/)).toBeVisible();
  });

  it('resets pagination after inventory changes and all/owned changes', () => {
    usePilatesStore.setState({
      exercises: Array.from({ length: 13 }, (_, index) => ({
        ...mat,
        id: 'paging-' + index,
        nameKo: '매트 ' + index,
      })),
    });
    render(<InlineExerciseFinder onOpenExercise={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /동작 더 보기/ }));
    expect(screen.getAllByRole('article')).toHaveLength(12);
    act(() => usePilatesStore.getState().toggleOwnedProp('mini-ball'));
    expect(screen.getAllByRole('article')).toHaveLength(6);
    fireEvent.click(screen.getByRole('button', { name: /동작 더 보기/ }));
    fireEvent.click(screen.getByRole('button', { name: '전체 장비 보기' }));
    expect(screen.getAllByRole('article')).toHaveLength(6);
  });
});

describe('equipment browsing persistence', () => {
  it('saves scope with inventory, accepts old storage, and rejects invalid scope independently', () => {
    const options = usePilatesStore.persist.getOptions();
    usePilatesStore.getState().setExerciseBrowseScope('all');
    const state = usePilatesStore.getState();
    const persisted = options.partialize!(state);
    expect(persisted).toMatchObject({
      exerciseBrowseScope: 'all',
      ownedEquipment: ['mat', 'cadillac'],
    });
    const reloaded = options.merge!(persisted, original);
    expect(reloaded.exerciseBrowseScope).toBe('all');
    expect(reloaded.ownedEquipment).toEqual(['mat', 'cadillac']);
    expect(options.merge!({ ownedEquipment: [], ownedProps: [] }, state)).toMatchObject({
      exerciseBrowseScope: 'owned',
      ownedEquipment: [],
      ownedProps: [],
    });
    expect(
      options.merge!({ exerciseBrowseScope: 'bogus', ownedEquipment: ['tower'] }, state),
    ).toMatchObject({ exerciseBrowseScope: 'owned', ownedEquipment: ['tower'] });
  });
});
