import { RECOVERY_STORAGE_KEY } from './recoveryStorageGuard';
import { usePilatesStore } from '../store/usePilatesStore';
import type { PilatesStudioState } from '../store/usePilatesStore';

export const ACCOUNT_STORAGE_PREFIX = `${RECOVERY_STORAGE_KEY}:account:`;
export const GUEST_STORAGE_KEY = `${RECOVERY_STORAGE_KEY}:guest`;
export const ACTIVE_OWNER_KEY = `${RECOVERY_STORAGE_KEY}:active-owner`;
export const KNOWN_ACCOUNTS_KEY = `${RECOVERY_STORAGE_KEY}:known-accounts`;

export function accountStorageKey(userId: string): string {
  return `${ACCOUNT_STORAGE_PREFIX}${userId}`;
}

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage write errors in restricted or quota-exhausted environments.
  }
}

function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage remove errors in restricted environments.
  }
}

function readKnownAccounts(): string[] {
  const raw = safeGetItem(KNOWN_ACCOUNTS_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string' && item.length > 0)
      : [];
  } catch {
    return [];
  }
}

function addKnownAccount(userId: string): void {
  const current = readKnownAccounts();
  if (!current.includes(userId)) {
    safeSetItem(KNOWN_ACCOUNTS_KEY, JSON.stringify([...current, userId]));
  }
}

function buildCleanState(): PilatesStudioState {
  const base = usePilatesStore.getInitialState();
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(base)) {
    clean[key] = typeof value === 'function' ? value : structuredClone(value);
  }
  return clean as unknown as PilatesStudioState;
}

let isSyncingWorkspace = false;

function serializeStoreState(state: PilatesStudioState): string | null {
  try {
    const options = usePilatesStore.persist.getOptions();
    const partial = options.partialize ? options.partialize(state) : state;
    return JSON.stringify({
      state: partial,
      version: options.version ?? 3,
    });
  } catch {
    return safeGetItem(RECOVERY_STORAGE_KEY);
  }
}

function mirrorStateToOwnerStorage(state: PilatesStudioState): void {
  if (isSyncingWorkspace) return;
  const activeOwner = safeGetItem(ACTIVE_OWNER_KEY)?.trim() || null;
  const serialized = serializeStoreState(state);
  if (serialized === null) return;
  if (activeOwner) {
    safeSetItem(accountStorageKey(activeOwner), serialized);
  } else {
    safeSetItem(GUEST_STORAGE_KEY, serialized);
  }
}

usePilatesStore.subscribe((state) => {
  mirrorStateToOwnerStorage(state);
  queueMicrotask(() => {
    if (isSyncingWorkspace) return;
    const activeOwner = safeGetItem(ACTIVE_OWNER_KEY)?.trim() || null;
    const latestRaw = safeGetItem(RECOVERY_STORAGE_KEY);
    if (latestRaw === null) return;
    if (activeOwner) {
      safeSetItem(accountStorageKey(activeOwner), latestRaw);
    } else {
      safeSetItem(GUEST_STORAGE_KEY, latestRaw);
    }
  });
});

function applyWorkspaceSnapshot(savedRaw: string | null): void {
  isSyncingWorkspace = true;
  try {
    usePilatesStore.setState(buildCleanState(), true);
    if (savedRaw !== null) {
      safeSetItem(RECOVERY_STORAGE_KEY, savedRaw);
    } else {
      safeRemoveItem(RECOVERY_STORAGE_KEY);
    }
    void usePilatesStore.persist.rehydrate();
  } finally {
    isSyncingWorkspace = false;
  }
}

/**
 * Synchronize the browser's persisted studio workspace with the authenticated account.
 * Each account gets an isolated localStorage slot (`pilates-flow-atelier-storage-v3:account:<userId>`),
 * preserving work across page reloads, sign-out/re-entry, and multi-account switching.
 */
export function syncAccountWorkspace(nextUserId: string | null): void {
  const normalizedNext = nextUserId?.trim() || null;
  const prevOwner = safeGetItem(ACTIVE_OWNER_KEY)?.trim() || null;
  const currentRaw = safeGetItem(RECOVERY_STORAGE_KEY);

  // Case A: Same signed-in owner (e.g. page refresh or status re-bootstrap)
  if (normalizedNext !== null && prevOwner === normalizedNext) {
    addKnownAccount(normalizedNext);
    const accountKey = accountStorageKey(normalizedNext);
    const savedAccountRaw = safeGetItem(accountKey);
    if (currentRaw !== null) {
      safeSetItem(accountKey, currentRaw);
      return;
    }
    if (savedAccountRaw !== null) {
      applyWorkspaceSnapshot(savedAccountRaw);
    }
    return;
  }

  // Case B: Signing in when no active owner is currently set (initial login or re-entry after logout)
  if (normalizedNext !== null && prevOwner === null) {
    const accountKey = accountStorageKey(normalizedNext);
    const savedAccountRaw = safeGetItem(accountKey);
    const knownAccounts = readKnownAccounts();

    if (savedAccountRaw !== null) {
      if (currentRaw !== null) {
        safeSetItem(GUEST_STORAGE_KEY, currentRaw);
      }
      safeSetItem(ACTIVE_OWNER_KEY, normalizedNext);
      addKnownAccount(normalizedNext);
      if (savedAccountRaw !== currentRaw) {
        applyWorkspaceSnapshot(savedAccountRaw);
      }
      return;
    }

    // Brand-new account on this browser
    safeSetItem(ACTIVE_OWNER_KEY, normalizedNext);
    addKnownAccount(normalizedNext);
    if (knownAccounts.length === 0) {
      // Very first account on this browser adopts any existing in-progress local workspace
      if (currentRaw !== null) {
        safeSetItem(accountKey, currentRaw);
      }
      return;
    }

    // Another account previously used this browser; start this new account with a clean workspace
    applyWorkspaceSnapshot(null);
    return;
  }

  // Case C: Direct switch from prevOwner to normalizedNext
  if (normalizedNext !== null && prevOwner !== null && prevOwner !== normalizedNext) {
    if (currentRaw !== null) {
      safeSetItem(accountStorageKey(prevOwner), currentRaw);
    }
    safeSetItem(ACTIVE_OWNER_KEY, normalizedNext);
    addKnownAccount(normalizedNext);
    const nextAccountRaw = safeGetItem(accountStorageKey(normalizedNext));
    applyWorkspaceSnapshot(nextAccountRaw);
    return;
  }

  // Case D: Sign-out from prevOwner
  if (normalizedNext === null && prevOwner !== null) {
    if (currentRaw !== null) {
      safeSetItem(accountStorageKey(prevOwner), currentRaw);
    }
    safeRemoveItem(ACTIVE_OWNER_KEY);
    safeRemoveItem(GUEST_STORAGE_KEY);
    applyWorkspaceSnapshot(null);
  }
}
