import { stepSchema } from '../schemas/cloudBackupSchema';
import type { SequenceStep } from '../types/pilates';
import { getStepTiming } from './sequenceEngine';

export const TEACHING_RECOVERY_PREFIX = 'pf_teaching_recovery_v1';
const MAX_BYTES = 256_000;
const MAX_AGE_MS = 12 * 60 * 60 * 1000;
const MAX_ELAPSED_MS = 24 * 60 * 60 * 1000;

export interface RecoverableTeachingClock {
  completionOverrides?: Record<string, boolean>;
  index: number;
  remainingMs: number;
  elapsedMs: number;
  elapsedByStep: Record<number, number>;
}
export interface TeachingRecoverySnapshot {
  version: 1;
  fingerprint: string;
  savedAt: number;
  steps: SequenceStep[];
  clock: RecoverableTeachingClock;
}

export function readCompletionOverrides(value: unknown, steps: SequenceStep[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const knownIds = new Set(steps.map((step) => step.stepId));
  const overrides = Object.fromEntries(
    Object.entries(value).filter(
      ([id, checked]) => knownIds.has(id) && typeof checked === 'boolean',
    ),
  ) as Record<string, boolean>;
  return Object.keys(overrides).length ? overrides : undefined;
}

/** Tab-scoped, account-scoped recovery only. Never part of cloud backups or completed history. */
export function teachingRecoveryKey(owner: string | null, sequenceId: string): string {
  return `${TEACHING_RECOVERY_PREFIX}:${owner === null ? 'guest' : `account:${encodeURIComponent(owner)}`}:${encodeURIComponent(sequenceId)}`;
}
export function teachingDraftFingerprint(
  sequenceId: string,
  title: string,
  steps: SequenceStep[],
  scheduleContext?: unknown,
): string {
  // Hydration validates and reconstructs objects; property insertion order is not a draft edit.
  return JSON.stringify({ sequenceId, title, steps, scheduleContext }, (_key, value: unknown) => {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
    }
    return value;
  });
}

export function readTeachingRecovery(
  key: string,
  fingerprint: string,
  now = Date.now(),
): TeachingRecoverySnapshot | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw || raw.length > MAX_BYTES) return null;
    const value = JSON.parse(raw) as TeachingRecoverySnapshot;
    if (
      !value ||
      value.version !== 1 ||
      value.fingerprint !== fingerprint ||
      !Number.isFinite(value.savedAt) ||
      value.savedAt > now ||
      now - value.savedAt > MAX_AGE_MS ||
      !Array.isArray(value.steps) ||
      !value.steps.length ||
      value.steps.length > 500 ||
      !value.steps.every((step) => stepSchema.safeParse(step).success) ||
      new Set(value.steps.map((step) => step.stepId)).size !== value.steps.length
    )
      return null;
    const c = value.clock;
    if (
      !c ||
      !Number.isInteger(c.index) ||
      c.index < 0 ||
      c.index >= value.steps.length ||
      !Number.isFinite(c.remainingMs) ||
      c.remainingMs < 0 ||
      c.remainingMs > Math.max(1000, getStepTiming(value.steps[c.index]).totalSec * 1000) ||
      !Number.isFinite(c.elapsedMs) ||
      c.elapsedMs < 0 ||
      c.elapsedMs > MAX_ELAPSED_MS ||
      !c.elapsedByStep ||
      typeof c.elapsedByStep !== 'object' ||
      Array.isArray(c.elapsedByStep)
    )
      return null;
    let elapsed = 0;
    for (const [index, ms] of Object.entries(c.elapsedByStep)) {
      if (
        !/^(0|[1-9]\d*)$/.test(index) ||
        Number(index) >= value.steps.length ||
        !Number.isFinite(ms) ||
        ms < 0 ||
        ms > MAX_ELAPSED_MS
      )
        return null;
      elapsed += ms;
    }
    if (Math.abs(elapsed - c.elapsedMs) > 1) return null;
    // Reconstruct only understood fields. Running, voice and wake-lock state are never restored.
    return {
      version: 1,
      fingerprint,
      savedAt: value.savedAt,
      steps: structuredClone(value.steps),
      clock: {
        completionOverrides: readCompletionOverrides(c.completionOverrides, value.steps),
        index: c.index,
        remainingMs: c.remainingMs,
        elapsedMs: c.elapsedMs,
        elapsedByStep: { ...c.elapsedByStep },
      },
    };
  } catch {
    return null;
  }
}

export function writeTeachingRecovery(key: string, snapshot: TeachingRecoverySnapshot): boolean {
  try {
    const raw = JSON.stringify(snapshot);
    if (raw.length > MAX_BYTES) return false;
    sessionStorage.setItem(key, raw);
    return true;
  } catch {
    return false;
  }
}
export function clearTeachingRecovery(key: string): boolean {
  try {
    sessionStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
