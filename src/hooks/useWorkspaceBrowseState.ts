import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { getActiveWorkspaceOwner } from '../lib/accountStorage';
import { usePilatesStore } from '../store/usePilatesStore';

export const WORKSPACE_BROWSE_STORAGE_PREFIX = 'pf_workspace_browse_v1';
export type WorkspaceBrowsePage = 'schedule' | 'history' | 'atlas';

export function workspaceBrowseStorageKey(page: WorkspaceBrowsePage, owner: string | null): string {
  const scope = owner === null ? 'guest' : `account:${encodeURIComponent(owner)}`;
  return `${WORKSPACE_BROWSE_STORAGE_PREFIX}:${scope}:${page}`;
}

const subscribeToWorkspace = (onChange: () => void) => usePilatesStore.subscribe(onChange);
const serverOwner = () => null;

function readBrowseState<T>(key: string, defaults: T, parse: (value: unknown, defaults: T) => T): T {
  try {
    if (typeof window === 'undefined') return defaults;
    const raw = window.sessionStorage.getItem(key);
    if (!raw || raw.length > 16_384) return defaults;
    return parse(JSON.parse(raw), defaults);
  } catch {
    return defaults;
  }
}

/** Browsing preferences are session-only and scoped to the hydrated workspace owner. */
export function useWorkspaceBrowseState<T>(
  page: WorkspaceBrowsePage,
  defaults: T,
  parse: (value: unknown, defaults: T) => T,
  shouldPersist?: (value: T) => boolean,
): readonly [T, Dispatch<SetStateAction<T>>] {
  const owner = useSyncExternalStore(subscribeToWorkspace, getActiveWorkspaceOwner, serverOwner);
  const key = workspaceBrowseStorageKey(page, owner);
  const recovered = useMemo(() => readBrowseState(key, defaults, parse), [key, defaults, parse]);
  const [entry, setEntry] = useState(() => ({ key, value: recovered, changed: false }));
  // Account switching is committed before the store notification. Do not render or
  // persist the previous owner's value while waiting for another interaction.
  const value = entry.key === key ? entry.value : recovered;

  const update = useCallback<Dispatch<SetStateAction<T>>>((next) => {
    setEntry((previous) => {
      const current = previous.key === key ? previous.value : recovered;
      const nextValue = typeof next === 'function'
        ? (next as (previous: T) => T)(current)
        : next;
      return { key, value: nextValue, changed: true };
    });
  }, [key, recovered]);

  useEffect(() => {
    if (entry.key !== key || !entry.changed || typeof window === 'undefined') return;
    try {
      if (shouldPersist && !shouldPersist(entry.value)) {
        window.sessionStorage.removeItem(key);
      } else {
        window.sessionStorage.setItem(key, JSON.stringify(entry.value));
      }
    } catch {
      // Browsing still works when session storage is blocked or full.
    }
  }, [entry, key, shouldPersist]);

  return [value, update];
}
