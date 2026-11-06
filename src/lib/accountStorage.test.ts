import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RECOVERY_STORAGE_KEY } from './recoveryStorageGuard';

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  localStorage.clear();
});

async function load() {
  const { usePilatesStore, getRecoveryStorageStatus } = await import('../store/usePilatesStore');
  const storage = await import('./accountStorage');
  return { store: usePilatesStore, getRecoveryStorageStatus, ...storage };
}
function title(raw: string | null): string | undefined {
  return raw ? JSON.parse(raw).state.activeTitle : undefined;
}

describe('account-local workspace preservation', () => {
  it('adopts the first guest workspace, preserves it, and restores account edits after logout/re-entry', async () => {
    const s = await load();
    s.store.getState().setActiveSequenceMeta({ title: 'guest original' });
    s.syncAccountWorkspace('a');
    expect(s.store.getState().activeTitle).toBe('guest original');
    expect(title(localStorage.getItem(s.GUEST_STORAGE_KEY))).toBe('guest original');
    s.store.getState().setActiveSequenceMeta({ title: 'account A edits' });
    s.syncAccountWorkspace(null);
    expect(title(localStorage.getItem(s.accountStorageKey('a')))).toBe('account A edits');
    expect(s.store.getState().activeTitle).toBe('guest original');
    s.syncAccountWorkspace('a');
    expect(s.store.getState().activeTitle).toBe('account A edits');
  });

  it('isolates A and B, starts a second new account clean, and survives repeated switches', async () => {
    const s = await load();
    s.syncAccountWorkspace('a');
    s.store.getState().setActiveSequenceMeta({ title: 'private A' });
    s.syncAccountWorkspace('b');
    expect(s.store.getState().activeTitle).not.toBe('private A');
    s.store.getState().setActiveSequenceMeta({ title: 'private B' });
    s.syncAccountWorkspace('a');
    expect(s.store.getState().activeTitle).toBe('private A');
    s.syncAccountWorkspace('b');
    expect(s.store.getState().activeTitle).toBe('private B');
    expect(title(localStorage.getItem(s.accountStorageKey('a')))).toBe('private A');
  });

  it('routes edits by this tab owner even if another tab changes the global owner marker', async () => {
    const s = await load();
    s.syncAccountWorkspace('a');
    const bRaw = JSON.stringify({ state: { activeTitle: 'untouched B' }, version: 3 });
    localStorage.setItem(s.accountStorageKey('b'), bRaw);
    localStorage.setItem(s.ACTIVE_OWNER_KEY, 'b');
    localStorage.setItem(RECOVERY_STORAGE_KEY, bRaw);
    s.store.getState().setActiveSequenceMeta({ title: 'still A edits' });
    await Promise.resolve();
    expect(title(localStorage.getItem(s.accountStorageKey('a')))).toBe('still A edits');
    expect(localStorage.getItem(s.accountStorageKey('b'))).toBe(bRaw);
    s.syncAccountWorkspace('b');
    expect(s.store.getState().activeTitle).toBe('untouched B');
  });

  it('preserves a differing pre-existing snapshot before switching out a stale tab', async () => {
    const s = await load();
    s.syncAccountWorkspace('a');
    s.store.getState().setActiveSequenceMeta({ title: 'this tab A' });
    const otherRaw = JSON.stringify({ state: { activeTitle: 'other tab A' }, version: 3 });
    localStorage.setItem(s.accountStorageKey('a'), otherRaw);
    s.syncAccountWorkspace('b');
    const preserved = Object.keys(localStorage).filter((key) =>
      key.startsWith(s.PRESERVED_STORAGE_PREFIX),
    );
    expect(preserved.some((key) => JSON.parse(localStorage.getItem(key)!).raw === otherRaw)).toBe(
      true,
    );
    expect(title(localStorage.getItem(s.accountStorageKey('a')))).toBe('this tab A');
  });

  it('does not change the active workspace when preserving a prior snapshot fails', async () => {
    const s = await load();
    s.syncAccountWorkspace('a');
    s.store.getState().setActiveSequenceMeta({ title: 'do not lose A' });
    localStorage.setItem(
      s.accountStorageKey('a'),
      '{"state":{"activeTitle":"older A"},"version":3}',
    );
    const set = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key.startsWith(s.PRESERVED_STORAGE_PREFIX)) throw new Error('quota');
      set.call(this, key, value);
    });
    expect(() => s.syncAccountWorkspace('b')).toThrow('quota');
    expect(s.store.getState().activeTitle).toBe('do not lose A');
    expect(localStorage.getItem(s.ACTIVE_OWNER_KEY)).toBe('a');
    expect(title(localStorage.getItem(s.accountStorageKey('a')))).toBe('older A');
  });

  it('leaves the working copy unchanged when a new owner marker cannot be saved', async () => {
    const s = await load();
    s.syncAccountWorkspace('a');
    s.store.getState().setActiveSequenceMeta({ title: 'unchanged A' });
    const working = localStorage.getItem(RECOVERY_STORAGE_KEY);
    const set = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === s.ACTIVE_OWNER_KEY && value === 'b') throw new Error('metadata quota');
      set.call(this, key, value);
    });
    expect(() => s.syncAccountWorkspace('b')).toThrow('metadata quota');
    expect(localStorage.getItem(RECOVERY_STORAGE_KEY)).toBe(working);
    expect(localStorage.getItem(s.ACTIVE_OWNER_KEY)).toBe('a');
    expect(s.store.getState().activeTitle).toBe('unchanged A');
  });

  it('rejects a corrupt destination snapshot without clearing either account', async () => {
    const s = await load();
    s.syncAccountWorkspace('a');
    s.store.getState().setActiveSequenceMeta({ title: 'safe A' });
    const aRaw = localStorage.getItem(s.accountStorageKey('a'));
    localStorage.setItem(s.accountStorageKey('b'), 'corrupted raw B');
    expect(() => s.syncAccountWorkspace('b')).toThrow();
    expect(s.store.getState().activeTitle).toBe('safe A');
    expect(localStorage.getItem(s.accountStorageKey('a'))).toBe(aRaw);
    expect(localStorage.getItem(s.accountStorageKey('b'))).toBe('corrupted raw B');
  });

  it('retains old backup/session keys and restores per-account work after module reload', async () => {
    const legacyKey = 'pilates-flow-atelier-account-backup-v3:a';
    localStorage.setItem(legacyKey, 'legacy backup');
    localStorage.setItem('pilates-flow-atelier-firebase-session-v1', 'old profile');
    const s = await load();
    s.syncAccountWorkspace('a');
    s.store.getState().setActiveSequenceMeta({ title: 'A before reload' });
    vi.resetModules();
    const reloaded = await load();
    reloaded.syncAccountWorkspace('a');
    expect(reloaded.store.getState().activeTitle).toBe('A before reload');
    reloaded.syncAccountWorkspace(null);
    reloaded.syncAccountWorkspace('a');
    expect(reloaded.store.getState().activeTitle).toBe('A before reload');
    expect(localStorage.getItem(legacyKey)).toBe('legacy backup');
    expect(localStorage.getItem('pilates-flow-atelier-firebase-session-v1')).toBe('old profile');
  });

  it('retains the recovery storage guard baseline after each validated transition', async () => {
    const s = await load();
    s.syncAccountWorkspace('a');
    s.store.getState().setActiveSequenceMeta({ title: 'A' });
    s.syncAccountWorkspace('b');
    expect(s.getRecoveryStorageStatus().ok).toBe(true);
    s.syncAccountWorkspace(null);
    expect(s.getRecoveryStorageStatus().ok).toBe(true);
    s.syncAccountWorkspace('a');
    expect(s.getRecoveryStorageStatus().ok).toBe(true);
  });

  it('isolates savedSequences and historyLogs across refresh, logout/re-entry, and account switching', async () => {
    const s = await load();
    const initialSavedCount = s.store.getState().savedSequences.length;
    const initialHistoryCount = s.store.getState().historyLogs.length;
    s.store.getState().setActiveSequenceMeta({ title: '게스트 초안 시퀀스' });
    s.store.getState().saveCurrentSequenceToBinder(true);
    expect(s.store.getState().savedSequences).toHaveLength(initialSavedCount + 1);

    // 1. First login as Account A adopts guest workspace
    s.syncAccountWorkspace('account-a');
    expect(s.store.getState().savedSequences[0]?.title).toBe('게스트 초안 시퀀스');

    // Account A adds a new saved sequence and a teaching history record
    s.store.getState().setActiveSequenceMeta({ title: '강사 A 전용 리포머 시퀀스' });
    const seqAId = s.store.getState().saveCurrentSequenceToBinder(true);
    const firstGroupId = s.store.getState().classGroups[0]?.id ?? 'group-1';
    s.store.getState().logClassSession({
      sequenceId: seqAId,
      groupId: firstGroupId,
      taughtAt: '2026-11-06T09:00:00.000Z',
      rating: 5,
      intensity: 'moderate',
      instructorReflection: '강사 A 수업 기록',
    });
    expect(s.store.getState().savedSequences).toHaveLength(initialSavedCount + 2);
    expect(s.store.getState().historyLogs).toHaveLength(initialHistoryCount + 1);

    // 2. Refresh persistence while signed in as Account A
    vi.resetModules();
    const refreshed = await load();
    refreshed.syncAccountWorkspace('account-a');
    expect(refreshed.store.getState().savedSequences[0]?.title).toBe('강사 A 전용 리포머 시퀀스');
    expect(refreshed.store.getState().savedSequences[1]?.title).toBe('게스트 초안 시퀀스');
    expect(refreshed.store.getState().historyLogs[0]?.instructorReflection).toBe(
      '강사 A 수업 기록',
    );

    // 3. Logout restores original guest workspace; re-entry restores Account A
    refreshed.syncAccountWorkspace(null);
    expect(refreshed.store.getState().savedSequences).toHaveLength(initialSavedCount + 1);
    expect(refreshed.store.getState().savedSequences[0]?.title).toBe('게스트 초안 시퀀스');
    expect(refreshed.store.getState().historyLogs).toHaveLength(initialHistoryCount);

    refreshed.syncAccountWorkspace('account-a');
    expect(refreshed.store.getState().savedSequences).toHaveLength(initialSavedCount + 2);
    expect(refreshed.store.getState().historyLogs).toHaveLength(initialHistoryCount + 1);

    // 4. Account switch to Account B starts clean and keeps Account A & B strictly separated
    refreshed.syncAccountWorkspace('account-b');
    expect(refreshed.store.getState().savedSequences).toHaveLength(initialSavedCount);
    expect(refreshed.store.getState().historyLogs).toHaveLength(initialHistoryCount);

    refreshed.store.getState().setActiveSequenceMeta({ title: '강사 B 전용 시퀀스' });
    refreshed.store.getState().saveCurrentSequenceToBinder(true);
    expect(refreshed.store.getState().savedSequences[0]?.title).toBe('강사 B 전용 시퀀스');

    refreshed.syncAccountWorkspace('account-a');
    expect(refreshed.store.getState().savedSequences[0]?.title).toBe('강사 A 전용 리포머 시퀀스');
    expect(refreshed.store.getState().historyLogs[0]?.instructorReflection).toBe(
      '강사 A 수업 기록',
    );
  });
});
