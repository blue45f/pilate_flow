import { stepSchema } from '../schemas/cloudBackupSchema';
import { beforeEach, expect, it, vi } from 'vitest';
import {
  readTeachingRecovery,
  writeTeachingRecovery,
  clearTeachingRecovery,
  teachingRecoveryKey,
  teachingDraftFingerprint,
  type TeachingRecoverySnapshot,
} from './teachingSessionRecovery';
const steps = [
  {
    stepId: 'x',
    order: 1,
    exerciseId: 'qa',
    blockCategory: 'warmup' as const,
    durationMin: 1,
    selectedLayer: 'standard' as const,
  },
];
const fingerprint = teachingDraftFingerprint('qa', 'synthetic', steps);
const key = teachingRecoveryKey(null, 'qa');
const snapshot: TeachingRecoverySnapshot = {
  version: 1,
  fingerprint,
  savedAt: 100000,
  steps,
  clock: { index: 0, remainingMs: 57000, elapsedMs: 3000, elapsedByStep: { 0: 3000 } },
};
beforeEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});
it('scopes guest and individual accounts, independent of another tab local-owner marker', () => {
  expect(teachingRecoveryKey('a', 'qa')).not.toBe(key);
  expect(teachingRecoveryKey('b', 'qa')).not.toBe(teachingRecoveryKey('a', 'qa'));
  expect(teachingRecoveryKey(null, 'other')).not.toBe(key);
  writeTeachingRecovery(key, snapshot);
  expect(readTeachingRecovery(teachingRecoveryKey('a', 'qa'), fingerprint, 100001)).toBeNull();
  expect(readTeachingRecovery(key, fingerprint, 100001)?.clock.elapsedMs).toBe(3000);
});
it('rejects changed drafts, stale/future records, malformed clocks and missing steps without deleting data', () => {
  for (const value of [
    null,
    {},
    { ...snapshot, savedAt: 100002 },
    { ...snapshot, clock: { ...snapshot.clock, index: 4 } },
    { ...snapshot, clock: { ...snapshot.clock, remainingMs: 61000 } },
    { ...snapshot, clock: { ...snapshot.clock, elapsedMs: 2000 } },
    { ...snapshot, steps: [null] },
  ]) {
    sessionStorage.setItem(key, JSON.stringify(value));
    expect(readTeachingRecovery(key, fingerprint, 100001)).toBeNull();
    expect(sessionStorage.getItem(key)).toBe(JSON.stringify(value));
  }
  writeTeachingRecovery(key, snapshot);
  expect(readTeachingRecovery(key, 'new draft', 100001)).toBeNull();
  expect(readTeachingRecovery(key, fingerprint, 100000 + 13 * 3600 * 1000)).toBeNull();
  sessionStorage.setItem(key, 'broken json');
  expect(readTeachingRecovery(key, fingerprint)).toBeNull();
});
it('does not restore running/voice fields and clears only the selected session', () => {
  sessionStorage.setItem(
    key,
    JSON.stringify({
      ...snapshot,
      voiceEnabled: true,
      clock: { ...snapshot.clock, running: true, sampledAt: 4 },
    }),
  );
  const restored = readTeachingRecovery(key, fingerprint, 100001)!;
  expect(restored.clock).not.toHaveProperty('running');
  expect(restored).not.toHaveProperty('voiceEnabled');
  sessionStorage.setItem('unrelated', 'keep');
  expect(clearTeachingRecovery(key)).toBe(true);
  expect(sessionStorage.getItem('unrelated')).toBe('keep');
});
it('handles unavailable storage without throwing or silently claiming success', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('full');
  });
  expect(writeTeachingRecovery(key, snapshot)).toBe(false);
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  expect(readTeachingRecovery(key, fingerprint)).toBeNull();
});

it('matches schema-rehydrated object order but rejects material step and schedule changes', () => {
  const hydrated = steps.map((step) => stepSchema.parse(step));
  expect(teachingDraftFingerprint('qa', 'synthetic', hydrated)).toBe(fingerprint);
  expect(teachingDraftFingerprint('qa', 'synthetic', [{ ...steps[0], durationMin: 2 }])).not.toBe(
    fingerprint,
  );
  const originalContext = { date: '2026-11-17', locationId: 'fictional-a' };
  const reorderedContext = { locationId: 'fictional-a', date: '2026-11-17' };
  expect(teachingDraftFingerprint('qa', 'synthetic', hydrated, reorderedContext)).toBe(
    teachingDraftFingerprint('qa', 'synthetic', steps, originalContext),
  );
  expect(
    teachingDraftFingerprint('qa', 'synthetic', hydrated, {
      ...reorderedContext,
      locationId: 'fictional-b',
    }),
  ).not.toBe(teachingDraftFingerprint('qa', 'synthetic', steps, originalContext));
});
