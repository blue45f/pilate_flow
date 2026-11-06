import { describe, expect, it } from 'vitest';
import { createRecoveryStorageGuard } from './recoveryStorageGuard';

const data = (version = 3, state: Record<string, unknown> = { exercises: [] }) =>
  JSON.stringify({ version, state });

describe('recovery-only disk observation', () => {
  it.each([0, 3])(
    'accepts an observed version %s and advances on confirmed owned writes',
    (version) => {
      let disk = data(version);
      const guard = createRecoveryStorageGuard(() => disk);
      guard.observedRead(disk);
      const first = guard.check();
      expect(first.ok).toBe(true);
      disk = data(3, { exercises: ['owned edit'] });
      guard.observedWrite(disk);
      expect(guard.check().ok).toBe(true);
      if (first.ok)
        expect(guard.check(first.fingerprint)).toMatchObject({
          ok: false,
          code: 'storage_preview_stale',
        });
    },
  );

  it('never promotes an external value by checking repeatedly or supplying its token', () => {
    let disk = data();
    const guard = createRecoveryStorageGuard(() => disk);
    guard.observedRead(disk);
    disk = data(3, { exercises: ['external'] });
    for (let count = 0; count < 3; count++)
      expect(guard.check()).toMatchObject({ ok: false, code: 'storage_changed' });
    expect(guard.check('external')).toMatchObject({ ok: false, code: 'storage_changed' });
  });

  it('canonicalizes key order and ignores only activeTab/themeMode, preserving unknown state/envelope fields', () => {
    let disk = JSON.stringify({
      version: 3,
      state: { exercises: [], activeTab: 'atlas', themeMode: 'dark', future: { a: 1, b: 2 } },
      extension: 1,
    });
    const guard = createRecoveryStorageGuard(() => disk);
    guard.observedRead(disk);
    disk = JSON.stringify({
      extension: 1,
      state: { future: { b: 2, a: 1 }, themeMode: 'light', exercises: [], activeTab: 'binder' },
      version: 3,
    });
    expect(guard.check().ok).toBe(true);
    disk = JSON.stringify({
      extension: 2,
      state: { exercises: [], future: { a: 1, b: 2 } },
      version: 3,
    });
    expect(guard.check()).toMatchObject({ ok: false, code: 'storage_changed' });
    disk = JSON.stringify({
      extension: 1,
      state: { exercises: [], future: { a: 1, b: 3 } },
      version: 3,
    });
    expect(guard.check()).toMatchObject({ ok: false, code: 'storage_changed' });
  });

  it.each([
    '{',
    '{}',
    'null',
    data(99),
    JSON.stringify({ version: 3, state: [] }),
    '{"version":3,"state":{"unknown":1e309}}',
  ])(
    'fails closed on unreadable or unsupported disk without normalizing it to empty: %s',
    (raw) => {
      let disk = data();
      const guard = createRecoveryStorageGuard(() => disk);
      guard.observedRead(disk);
      disk = raw;
      expect(guard.check()).toMatchObject({ ok: false, code: 'storage_invalid' });
    },
  );

  it('does not adopt initially malformed data even if a later unobserved read becomes valid', () => {
    let disk = '{';
    const guard = createRecoveryStorageGuard(() => disk);
    guard.observedRead(disk);
    disk = data();
    expect(guard.check()).toMatchObject({ ok: false, code: 'storage_invalid' });
  });

  it.each(['activeTab', 'themeMode'])(
    'preserves malformed/unknown data under %s rather than ignoring it as display-only',
    (field) => {
      let disk = data(3, { exercises: [], activeTab: 'atlas', themeMode: 'dark' });
      const guard = createRecoveryStorageGuard(() => disk);
      guard.observedRead(disk);
      disk = data(3, { exercises: [], [field]: { syntheticUnknownData: true } });
      expect(guard.check()).toMatchObject({ ok: false, code: 'storage_changed' });
      disk = data(3, { exercises: [], [field]: 'unknown-future-value' });
      expect(guard.check()).toMatchObject({ ok: false, code: 'storage_changed' });
    },
  );

  it('distinguishes an observed empty store from an unobserved deletion', () => {
    let disk: string | null = null;
    const guard = createRecoveryStorageGuard(() => disk);
    expect(guard.check()).toMatchObject({ ok: false, code: 'storage_unavailable' });
    guard.observedRead(null);
    expect(guard.check().ok).toBe(true);
    disk = data();
    guard.observedWrite(disk);
    disk = null;
    expect(guard.check()).toMatchObject({ ok: false, code: 'storage_changed' });
    guard.observedWrite(null);
    expect(guard.check().ok).toBe(true);
  });

  it('fails without adopting anything on access failure and latches a failed own write until confirmed success', () => {
    let denied = false;
    const disk = data();
    const guard = createRecoveryStorageGuard(() => {
      if (denied) throw new DOMException('Synthetic denied', 'SecurityError');
      return disk;
    });
    guard.observedRead(disk);
    denied = true;
    expect(guard.check()).toMatchObject({ ok: false, code: 'storage_unavailable' });
    denied = false;
    expect(guard.check().ok).toBe(true);
    guard.observedWriteFailure();
    expect(guard.check()).toMatchObject({ ok: false, code: 'storage_unavailable' });
    guard.observedWrite(disk);
    expect(guard.check().ok).toBe(true);
    guard.observedReadFailure();
    expect(guard.check()).toMatchObject({ ok: false, code: 'storage_unavailable' });
  });
});
