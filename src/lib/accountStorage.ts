import { RECOVERY_STORAGE_KEY } from './recoveryStorageGuard';
import { usePilatesStore } from '../store/usePilatesStore';
import type { PilatesStudioState } from '../store/usePilatesStore';
import { syncMovementIdeaAccountScope } from '../utils/movementIdeaDraft';

export const ACCOUNT_STORAGE_PREFIX = `${RECOVERY_STORAGE_KEY}:account:`;
export const GUEST_STORAGE_KEY = `${RECOVERY_STORAGE_KEY}:guest`;
export const ACTIVE_OWNER_KEY = `${RECOVERY_STORAGE_KEY}:active-owner`;
export const KNOWN_ACCOUNTS_KEY = `${RECOVERY_STORAGE_KEY}:known-accounts`;
export const PRESERVED_STORAGE_PREFIX = `${RECOVERY_STORAGE_KEY}:preserved:`;

export function accountStorageKey(userId: string): string {
  return `${ACCOUNT_STORAGE_PREFIX}${userId}`;
}

function readOwner(): string | null {
  try {
    return localStorage.getItem(ACTIVE_OWNER_KEY)?.trim() || null;
  } catch {
    return null;
  }
}

// Capture the owner of this tab's hydrated state. Another tab must never relabel our data.
let tabOwner = readOwner();
let switching = false;

/** Identity of this tab's hydrated workspace, even if another tab changes the shared marker. */
export function getActiveWorkspaceOwner(): string | null {
  return tabOwner;
}

function ownerKey(owner: string | null) {
  return owner === null ? GUEST_STORAGE_KEY : accountStorageKey(owner);
}

function serialize(state: PilatesStudioState): string {
  const options = usePilatesStore.persist.getOptions();
  return JSON.stringify({
    state: options.partialize ? options.partialize(state) : state,
    version: options.version ?? 3,
  });
}

function cleanState(): PilatesStudioState {
  return Object.fromEntries(
    Object.entries(usePilatesStore.getInitialState()).map(([key, value]) => [
      key,
      typeof value === 'function' ? value : structuredClone(value),
    ]),
  ) as unknown as PilatesStudioState;
}

function parseSnapshot(raw: string | null): PilatesStudioState {
  const clean = cleanState();
  if (raw === null) return clean;
  const parsed: unknown = JSON.parse(raw);
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    Array.isArray(parsed) ||
    !('version' in parsed) ||
    (parsed.version !== 0 && parsed.version !== 3) ||
    !('state' in parsed) ||
    !parsed.state ||
    typeof parsed.state !== 'object' ||
    Array.isArray(parsed.state)
  )
    throw new Error('Invalid account workspace snapshot');
  const merge = usePilatesStore.persist.getOptions().merge;
  return merge ? merge(parsed.state, clean) : { ...clean, ...parsed.state };
}

function knownAccounts(): string[] {
  const raw = localStorage.getItem(KNOWN_ACCOUNTS_KEY);
  if (raw === null) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) {
    throw new Error('Invalid account workspace index');
  }
  return parsed as string[];
}

/** Switching never destroys a pre-existing, different snapshot, even from a stale tab. */
function savePreservingPrevious(key: string, raw: string): void {
  const previous = localStorage.getItem(key);
  if (previous !== null && previous !== raw) {
    localStorage.setItem(
      `${PRESERVED_STORAGE_PREFIX}${crypto.randomUUID()}`,
      JSON.stringify({ sourceKey: key, preservedAt: new Date().toISOString(), raw: previous }),
    );
  }
  localStorage.setItem(key, raw);
}

// Mirror the actual in-memory state synchronously. Do not reread the shared working-copy key
// in a later microtask: a different account/tab may already have replaced that key.
usePilatesStore.subscribe((state) => {
  if (switching) return;
  try {
    localStorage.setItem(ownerKey(tabOwner), serialize(state));
    const liveOwnerRaw = readOwner();
    const liveOwner = liveOwnerRaw === '__anonymous__' ? null : liveOwnerRaw;
    if (liveOwner !== tabOwner) return;
    if (tabOwner === null) localStorage.removeItem(ACTIVE_OWNER_KEY);
    else localStorage.setItem(ACTIVE_OWNER_KEY, tabOwner);
  } catch {
    // The main store reports primary-storage errors. Account-slot failures are retried
    // synchronously before any transition; failure prevents that transition.
  }
});

/**
 * The SDK calls this only for an observed authenticated UID or observed sign-out.
 * Account snapshots remain local to this browser. This is not a server authorization boundary.
 */
export function syncAccountWorkspace(nextUserId: string | null): void {
  const nextOwner = nextUserId?.trim() || null;
  const accounts = knownAccounts();
  const currentRaw = serialize(usePilatesStore.getState());
  const currentKey = ownerKey(tabOwner);

  if (nextOwner === tabOwner) {
    // This may be the first verified session after reload. Preserve a differing account
    // slot rather than overwriting it with the global working copy.
    const saved = localStorage.getItem(currentKey);
    if (saved === null) localStorage.setItem(currentKey, currentRaw);
    if (nextOwner !== null && !accounts.includes(nextOwner)) {
      localStorage.setItem(KNOWN_ACCOUNTS_KEY, JSON.stringify([...accounts, nextOwner]));
    }
    syncMovementIdeaAccountScope(tabOwner ?? '__anonymous__', nextOwner ?? '__anonymous__');
    return;
  }

  const nextKey = ownerKey(nextOwner);
  const savedNext = localStorage.getItem(nextKey);
  // Preserve the existing first-login adoption behavior, with a retained guest copy.
  const adoptGuest =
    nextOwner !== null && tabOwner === null && savedNext === null && accounts.length === 0;
  const nextRaw = adoptGuest ? currentRaw : savedNext;
  // Validate before changing any active workspace.
  const nextState = parseSnapshot(nextRaw);
  const serializedNext = serialize(nextState);

  // All potentially failing preservation writes occur before replacing the visible state.
  savePreservingPrevious(currentKey, currentRaw);
  if (savedNext === null) localStorage.setItem(nextKey, serializedNext);
  const sharedRaw = localStorage.getItem(RECOVERY_STORAGE_KEY);
  if (sharedRaw !== null && sharedRaw !== currentRaw && sharedRaw !== serializedNext) {
    localStorage.setItem(
      `${PRESERVED_STORAGE_PREFIX}${crypto.randomUUID()}`,
      JSON.stringify({
        sourceKey: RECOVERY_STORAGE_KEY,
        preservedAt: new Date().toISOString(),
        raw: sharedRaw,
      }),
    );
  }
  if (nextOwner !== null && !accounts.includes(nextOwner)) {
    localStorage.setItem(KNOWN_ACCOUNTS_KEY, JSON.stringify([...accounts, nextOwner]));
  }
  // A failed metadata write must not leave the next account's working copy labelled
  // as the previous account. Preserve the old marker if the following write fails.
  const previousMarker = localStorage.getItem(ACTIVE_OWNER_KEY);
  try {
    if (nextOwner === null) localStorage.removeItem(ACTIVE_OWNER_KEY);
    else localStorage.setItem(ACTIVE_OWNER_KEY, nextOwner);
    localStorage.setItem(RECOVERY_STORAGE_KEY, serializedNext);
  } catch (cause) {
    if (previousMarker === null) localStorage.removeItem(ACTIVE_OWNER_KEY);
    else localStorage.setItem(ACTIVE_OWNER_KEY, previousMarker);
    throw cause;
  }

  switching = true;
  try {
    const previousOwner = tabOwner;
    tabOwner = nextOwner;
    syncMovementIdeaAccountScope(previousOwner ?? '__anonymous__', nextOwner ?? '__anonymous__');
    // One validated commit, no asynchronous rehydrate window. Store persistence refreshes
    // its recovery fingerprint so JSON recovery keeps its existing stale-tab protection.
    usePilatesStore.setState(nextState, true);
  } finally {
    switching = false;
  }
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('storage', (event: StorageEvent) => {
    if (switching) return;
    if (event.key !== ACTIVE_OWNER_KEY) return;
    const rawOwner = event.newValue?.trim() || null;
    const nextOwner = rawOwner === '__anonymous__' ? null : rawOwner;
    if (nextOwner !== tabOwner) {
      try {
        syncAccountWorkspace(nextOwner);
      } catch {
        // Keep current workspace if storage transition fails.
      }
    }
  });
}
