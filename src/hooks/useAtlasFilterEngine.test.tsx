import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { syncAccountWorkspace } from '../lib/accountStorage';
import { usePilatesStore } from '../store/usePilatesStore';
import { INITIAL_ATLAS_FILTERS, useAtlasFilterEngine } from './useAtlasFilterEngine';
import { workspaceBrowseStorageKey } from './useWorkspaceBrowseState';

const original = usePilatesStore.getState();
function AtlasHarness() {
  const { filters, update, setFilters, activeFilterChips } = useAtlasFilterEngine({
    exercises: original.exercises,
    historyLogs: [],
    activeTargetGroupId: '',
    exerciseBrowseScope: 'all',
    ownedEquipment: [],
    ownedProps: [],
  });
  return <>
    <input aria-label="동작 검색" value={filters.search} onChange={(event) => update('search', event.target.value)} />
    <button onClick={() => update('favorite', 'saved')}>저장된 동작</button>
    <button onClick={() => setFilters({ ...INITIAL_ATLAS_FILTERS })}>초기화</button>
    <output aria-label="검색 조건">{activeFilterChips.map((chip) => chip.label).join(' · ')}</output>
  </>;
}

beforeEach(() => {
  syncAccountWorkspace(null);
  localStorage.clear();
  usePilatesStore.setState(original, true);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  syncAccountWorkspace(null);
  usePilatesStore.setState(original, true);
  localStorage.clear();
  sessionStorage.removeItem('pf_atlas_discovery_recovery_v1');
});

describe('atlas browsing within each workspace', () => {
  it('switches a mounted library immediately and resets only the current owner', () => {
    render(<AtlasHarness />);
    const input = () => screen.getByRole('textbox', { name: '동작 검색' });
    fireEvent.change(input(), { target: { value: '게스트 풋워크' } });
    act(() => syncAccountWorkspace('atlas-a'));
    expect(input()).toHaveValue('');
    fireEvent.change(input(), { target: { value: 'A 개인 노트' } });
    fireEvent.click(screen.getByRole('button', { name: '저장된 동작' }));
    act(() => syncAccountWorkspace('atlas-b'));
    expect(input()).toHaveValue('');
    expect(screen.getByLabelText('검색 조건')).toHaveTextContent('');
    fireEvent.change(input(), { target: { value: 'B 서클' } });
    act(() => syncAccountWorkspace('atlas-a'));
    expect(input()).toHaveValue('A 개인 노트');
    expect(screen.getByLabelText('검색 조건')).toHaveTextContent('즐겨찾기: 저장됨');
    fireEvent.click(screen.getByRole('button', { name: '초기화' }));
    expect(sessionStorage.getItem(workspaceBrowseStorageKey('atlas', 'atlas-a'))).toBeNull();
    act(() => syncAccountWorkspace('atlas-b'));
    expect(input()).toHaveValue('B 서클');
    act(() => syncAccountWorkspace(null));
    expect(input()).toHaveValue('게스트 풋워크');
  });

  it('does not assign old ownerless searches to a guest or a signed-in account', () => {
    sessionStorage.setItem('pf_atlas_discovery_recovery_v1', JSON.stringify({ search: '이전 사용자 메모' }));
    render(<AtlasHarness />);
    expect(screen.getByRole('textbox')).toHaveValue('');
    act(() => syncAccountWorkspace('atlas-new-account'));
    expect(screen.getByRole('textbox')).toHaveValue('');
    expect(sessionStorage.getItem(workspaceBrowseStorageKey('atlas', 'atlas-new-account'))).toBeNull();
  });

  it('recovers known filters without crashing on unknown positions or duplicating tags', () => {
    sessionStorage.setItem(workspaceBrowseStorageKey('atlas', null), JSON.stringify({
      search: '브릿지', position: '__proto__', level: '9', equipment: ['mat', 'mat', 'unknown'],
      motionDraft: 'obsolete', favorite: 'saved', props: ['unknown'],
    }));
    const before = usePilatesStore.getState();
    const changes = vi.fn();
    const unsubscribe = usePilatesStore.subscribe(changes);
    const first = render(<AtlasHarness />);
    expect(screen.getByRole('textbox')).toHaveValue('브릿지');
    expect(screen.getByLabelText('검색 조건')).toHaveTextContent('기구: 매트');
    expect(screen.getByLabelText('검색 조건')).not.toHaveTextContent('unknown');
    expect(screen.getByLabelText('검색 조건')).not.toHaveTextContent('자세:');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '롤 업' } });
    first.unmount();
    render(<AtlasHarness />);
    expect(screen.getByRole('textbox')).toHaveValue('롤 업');
    expect(usePilatesStore.getState()).toBe(before);
    expect(changes).not.toHaveBeenCalled();
    unsubscribe();
  });
});
