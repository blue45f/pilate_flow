import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ACTIVE_OWNER_KEY, getActiveWorkspaceOwner, syncAccountWorkspace } from '../lib/accountStorage';
import { usePilatesStore } from '../store/usePilatesStore';
import { useWorkspaceBrowseState, workspaceBrowseStorageKey } from './useWorkspaceBrowseState';

const original = usePilatesStore.getState();
const defaults = { query: '' };
const parse = (value: unknown, fallback: typeof defaults) => {
  if (!value || typeof value !== 'object' || !('query' in value) || typeof value.query !== 'string') {
    return fallback;
  }
  return { query: value.query };
};

function BrowseHarness() {
  const [value, setValue] = useWorkspaceBrowseState('history', defaults, parse);
  return (
    <input
      aria-label="기록 검색"
      value={value.query}
      onChange={(event) => setValue({ query: event.target.value })}
    />
  );
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
});

describe('workspace-scoped browsing continuity', () => {
  it('restores navigation state on remount without writing the lesson store or local workspace', () => {
    const before = usePilatesStore.getState();
    const changes = vi.fn();
    const unsubscribe = usePilatesStore.subscribe(changes);
    const localSnapshot = { ...localStorage };
    const first = render(<BrowseHarness />);
    const key = workspaceBrowseStorageKey('history', null);
    expect(sessionStorage.getItem(key)).toBeNull();

    fireEvent.change(screen.getByRole('textbox', { name: '기록 검색' }), { target: { value: '호흡 기록' } });
    expect(JSON.parse(sessionStorage.getItem(key)!)).toEqual({ query: '호흡 기록' });
    first.unmount();
    render(<BrowseHarness />);

    expect(screen.getByRole('textbox', { name: '기록 검색' })).toHaveValue('호흡 기록');
    expect(usePilatesStore.getState()).toBe(before);
    expect(changes).not.toHaveBeenCalled();
    expect({ ...localStorage }).toEqual(localSnapshot);
    unsubscribe();
  });

  it('switches to the current tab owner immediately and keeps guest, A, and B preferences separate', () => {
    render(<BrowseHarness />);
    const query = () => screen.getByRole('textbox', { name: '기록 검색' });
    fireEvent.change(query(), { target: { value: '게스트 검색' } });

    act(() => syncAccountWorkspace('browse-account-a'));
    expect(query()).toHaveValue('');
    fireEvent.change(query(), { target: { value: 'A 검색' } });
    const aKey = workspaceBrowseStorageKey('history', 'browse-account-a');
    const bKey = workspaceBrowseStorageKey('history', 'browse-account-b');
    expect(JSON.parse(sessionStorage.getItem(aKey)!)).toEqual({ query: 'A 검색' });

    // A different tab's shared marker must not relabel this tab's hydrated data.
    localStorage.setItem(ACTIVE_OWNER_KEY, 'browse-account-b');
    act(() => usePilatesStore.getState().setActiveSequenceMeta({ title: 'A 수업 편집' }));
    expect(getActiveWorkspaceOwner()).toBe('browse-account-a');
    expect(query()).toHaveValue('A 검색');
    expect(sessionStorage.getItem(bKey)).toBeNull();

    act(() => syncAccountWorkspace('browse-account-b'));
    expect(query()).toHaveValue('');
    expect(sessionStorage.getItem(bKey)).toBeNull();
    fireEvent.change(query(), { target: { value: 'B 검색' } });
    expect(JSON.parse(sessionStorage.getItem(bKey)!)).toEqual({ query: 'B 검색' });
    expect(JSON.parse(sessionStorage.getItem(aKey)!)).toEqual({ query: 'A 검색' });

    act(() => syncAccountWorkspace('browse-account-a'));
    expect(query()).toHaveValue('A 검색');
    act(() => syncAccountWorkspace(null));
    expect(query()).toHaveValue('게스트 검색');
  });

  it.each(['{broken', JSON.stringify({ query: 42 }), 'x'.repeat(16_385)])(
    'ignores malformed or oversized session data without changing workspace data (%#)',
    (raw) => {
      const key = workspaceBrowseStorageKey('history', null);
      sessionStorage.setItem(key, raw);
      const before = usePilatesStore.getState();
      render(<BrowseHarness />);
      expect(screen.getByRole('textbox', { name: '기록 검색' })).toHaveValue('');
      expect(sessionStorage.getItem(key)).toBe(raw);
      expect(usePilatesStore.getState()).toBe(before);
    },
  );

  it('keeps browsing usable when session storage reads and writes are denied', () => {
    const before = usePilatesStore.getState();
    const originalGet = Storage.prototype.getItem;
    const originalSet = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (this: Storage, key) {
      if (this === sessionStorage) throw new DOMException('blocked', 'SecurityError');
      return originalGet.call(this, key);
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (this === sessionStorage) throw new DOMException('full', 'QuotaExceededError');
      originalSet.call(this, key, value);
    });

    render(<BrowseHarness />);
    fireEvent.change(screen.getByRole('textbox', { name: '기록 검색' }), { target: { value: '계속 검색' } });
    expect(screen.getByRole('textbox', { name: '기록 검색' })).toHaveValue('계속 검색');
    expect(usePilatesStore.getState()).toBe(before);
  });
});
