/** Detect completed external writes to the local workspace before persistence or recovery. */
export const RECOVERY_STORAGE_KEY = 'pilates-flow-atelier-storage-v3';

export type RecoveryStorageStatus =
  | { ok: true; fingerprint: string }
  | {
      ok: false;
      code: 'storage_unavailable' | 'storage_invalid' | 'storage_changed' | 'storage_preview_stale';
      message: string;
    };

const unavailable = (): RecoveryStorageStatus => ({
  ok: false,
  code: 'storage_unavailable',
  message:
    '브라우저 저장 자료를 안전하게 확인할 수 없어 복원을 적용하지 않았습니다. 현재 작업을 내보내고 저장 권한·여유 공간을 확인해 주세요.',
});

/** Keep unknown fields in the comparison. Only these two display-only fields are ignored. */
function persistedFingerprint(raw: string | null): RecoveryStorageStatus {
  if (raw === null) return { ok: true, fingerprint: 'missing' };
  try {
    const value: unknown = JSON.parse(raw);
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      !('version' in value) ||
      (value.version !== 0 && value.version !== 3) ||
      !('state' in value) ||
      !value.state ||
      typeof value.state !== 'object' ||
      Array.isArray(value.state)
    )
      throw new Error('unsupported persisted envelope');
    const state: Record<string, unknown> = { ...value.state };
    if (
      typeof state.activeTab === 'string' &&
      ['workbench', 'atlas', 'binder', 'history', 'stage', 'schedule'].includes(state.activeTab)
    )
      delete state.activeTab;
    if (
      typeof state.themeMode === 'string' &&
      ['system', 'light', 'dark'].includes(state.themeMode)
    )
      delete state.themeMode;
    const normalize = (item: unknown): unknown => {
      if (typeof item === 'number' && !Number.isFinite(item))
        throw new Error('non-finite persisted number');
      if (Array.isArray(item)) return item.map(normalize);
      if (item !== null && typeof item === 'object') {
        const object = item as Record<string, unknown>;
        return Object.fromEntries(
          Object.keys(object)
            .sort()
            .map((key) => [key, normalize(object[key])]),
        );
      }
      return item;
    };
    // An in-memory content comparison, not a cryptographic digest, signature or credential.
    return { ok: true, fingerprint: JSON.stringify(normalize({ ...value, state })) };
  } catch {
    return {
      ok: false,
      code: 'storage_invalid',
      message:
        '브라우저 저장 자료의 형식·버전을 확인할 수 없어 복원을 적용하지 않았습니다. 원본 저장 자료와 현재 작업을 먼저 보관해 주세요.',
    };
  }
}

export function createRecoveryStorageGuard(read: () => string | null) {
  let baselineRaw: string | null | undefined;
  let baseline: RecoveryStorageStatus | undefined;
  let comparedRaw: string | null | undefined;
  let compared: RecoveryStorageStatus | undefined;
  let writeFailed = false;

  function compare(
    raw: string | null,
    expectedFingerprint?: string,
    retryFailedWrite = false,
  ): RecoveryStorageStatus {
    if (baselineRaw === undefined || (writeFailed && !retryFailedWrite)) return unavailable();
    baseline ??= persistedFingerprint(baselineRaw);
    if (!baseline.ok) return baseline;
    let current = baseline;
    if (raw !== baselineRaw) {
      if (comparedRaw !== raw || !compared) {
        comparedRaw = raw;
        compared = persistedFingerprint(raw);
      }
      if (!compared.ok) return compared;
      current = compared;
    }
    if (current.fingerprint !== baseline.fingerprint)
      return {
        ok: false,
        code: 'storage_changed',
        message:
          '다른 탭 또는 창에서 브라우저 저장 자료가 바뀌어 복원을 적용하지 않았습니다. 현재 작업을 내보내 보관하고, 다른 탭의 자료를 확인한 뒤 새로 열어 주세요. 자동으로 합치거나 덮어쓰지 않았습니다.',
      };
    if (expectedFingerprint !== undefined && current.fingerprint !== expectedFingerprint)
      return {
        ok: false,
        code: 'storage_preview_stale',
        message:
          '검토 후 브라우저 저장 자료가 달라졌습니다. 현재 자료로 다시 검토한 뒤 적용해 주세요.',
      };
    return current;
  }

  return {
    observedRead(raw: string | null) {
      baselineRaw = raw;
      baseline = persistedFingerprint(raw);
    },
    observedReadFailure() {
      baselineRaw = undefined;
      baseline = undefined;
    },
    observedWrite(raw: string | null) {
      baselineRaw = raw;
      baseline = undefined;
      comparedRaw = undefined;
      compared = undefined;
      writeFailed = false;
    },
    observedWriteFailure() {
      writeFailed = true;
    },
    clearFailedWriteIfUnchanged(expectedFingerprint: string) {
      try {
        if (compare(read(), expectedFingerprint, true).ok) writeFailed = false;
      } catch {
        writeFailed = true;
      }
    },
    /** Compare the actual key before writing. Matching owned bytes need no JSON parsing. */
    writeIssue(): Extract<RecoveryStorageStatus, { ok: false }> | null {
      try {
        const raw = read();
        if (raw === baselineRaw && (!baseline || baseline.ok)) return null;
        const status = compare(raw, undefined, true);
        return status.ok ? null : status;
      } catch {
        return {
          ok: false,
          code: 'storage_unavailable',
          message: '브라우저 저장 자료를 읽지 못했습니다. 저장 권한을 확인해 주세요.',
        };
      }
    },
    /** Observations and repeated previews never adopt the current disk as the baseline. */
    check(
      expectedFingerprint?: string,
      { retryFailedWrite = false }: { retryFailedWrite?: boolean } = {},
    ): RecoveryStorageStatus {
      try {
        return compare(read(), expectedFingerprint, retryFailedWrite);
      } catch {
        return unavailable();
      }
    },
  };
}

export const workspaceStorageGuard = createRecoveryStorageGuard(() =>
  localStorage.getItem(RECOVERY_STORAGE_KEY),
);
