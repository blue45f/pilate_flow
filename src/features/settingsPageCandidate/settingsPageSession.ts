import { SETTINGS_PAGE_FIXTURE_PRESETS } from './settingsPageFixtures';
import {
  type MockSettingsActionRecorder,
  type SettingsGroupId,
  type SettingsRecordedAction,
  type SettingsVoicePreferenceKey,
  type SettingsVoiceSpeed,
} from './types';

const MAX_SAFE_COUNT = 100_000;
const MAX_SAFE_STRING_LEN = 320;

const SECRET_PATTERNS: readonly RegExp[] = [
  /AIza[0-9A-Za-z_-]{20,}/g,
  /Bearer\s+[A-Za-z0-9._~+/-]+=*/gi,
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
  /(?:api[_-]?key|secret|token|password|passwd|credential)\s*[:=]\s*['"]?[A-Za-z0-9._~+/-]{8,}['"]?/gi,
  /gh[pousr]_[A-Za-z0-9_]{20,}/g,
];

export function isPlainSettingsRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function safeReadSettingsProp(record: unknown, key: string): unknown {
  if (!isPlainSettingsRecord(record)) return undefined;
  if (key === '__proto__' || key === 'constructor' || key === 'prototype') return undefined;
  if (!Object.prototype.hasOwnProperty.call(record, key)) return undefined;
  try {
    return record[key];
  } catch {
    return undefined;
  }
}

export function sanitizeSettingsText(
  raw: unknown,
  fallback = '',
): { text: string; redacted: boolean } {
  if (typeof raw !== 'string') {
    return { text: fallback, redacted: false };
  }
  let cleaned = Array.from(raw, (ch) => {
    const code = ch.charCodeAt(0);
    return code <= 0x1f || code === 0x7f ? ' ' : ch;
  })
    .join('')
    .trim();
  if (!cleaned) {
    return { text: fallback, redacted: false };
  }
  let redacted = false;
  for (const pattern of SECRET_PATTERNS) {
    const next = cleaned.replace(pattern, '[민감정보 보호됨]');
    if (next !== cleaned) {
      redacted = true;
      cleaned = next;
    }
  }
  if (cleaned.length > MAX_SAFE_STRING_LEN) {
    cleaned = `${cleaned.slice(0, MAX_SAFE_STRING_LEN)}…`;
  }
  return { text: cleaned, redacted };
}

export function clampSafeSettingsCount(raw: unknown, fallback = 0): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return fallback;
  }
  const floored = Math.floor(raw);
  if (floored < 0) return 0;
  if (floored > MAX_SAFE_COUNT) return MAX_SAFE_COUNT;
  return floored;
}

export function createMockSettingsActionRecorder(
  delegate?: Partial<MockSettingsActionRecorder['port']>,
): MockSettingsActionRecorder {
  const recorded: SettingsRecordedAction[] = [];

  const record = (action: SettingsRecordedAction) => {
    recorded.push(Object.freeze({ ...action }));
  };

  const port: MockSettingsActionRecorder['port'] = Object.freeze({
    onRequestGoogleSignIn: () => {
      record({ type: 'account:sign-in' });
      delegate?.onRequestGoogleSignIn?.();
    },
    onRequestAccountSwitch: () => {
      record({ type: 'account:switch' });
      delegate?.onRequestAccountSwitch?.();
    },
    onRequestSignOut: () => {
      record({ type: 'account:sign-out' });
      delegate?.onRequestSignOut?.();
    },
    onRequestAuthRecheck: () => {
      record({ type: 'account:recheck' });
      delegate?.onRequestAuthRecheck?.();
    },
    onToggleVoiceEnabled: (nextEnabled: boolean) => {
      record({ type: 'voice:toggle-enabled', nextEnabled: Boolean(nextEnabled) });
      delegate?.onToggleVoiceEnabled?.(Boolean(nextEnabled));
    },
    onChangeVoiceSpeed: (nextSpeed: SettingsVoiceSpeed) => {
      const safeSpeed: SettingsVoiceSpeed =
        nextSpeed === 0.85 || nextSpeed === 1 || nextSpeed === 1.15 ? nextSpeed : 1;
      record({ type: 'voice:change-speed', nextSpeed: safeSpeed });
      delegate?.onChangeVoiceSpeed?.(safeSpeed);
    },
    onToggleVoicePreference: (key: SettingsVoicePreferenceKey, nextChecked: boolean) => {
      if (key !== 'movement' && key !== 'breath' && key !== 'time') return;
      record({ type: 'voice:toggle-preference', key, nextChecked: Boolean(nextChecked) });
      delegate?.onToggleVoicePreference?.(key, Boolean(nextChecked));
    },
    onRecheckVoiceCapability: () => {
      record({ type: 'voice:recheck-capability' });
      delegate?.onRecheckVoiceCapability?.();
    },
    onPreviewVoiceSample: () => {
      record({ type: 'voice:preview-sample' });
      delegate?.onPreviewVoiceSample?.();
    },
    onToggleReducedMotion: (nextReducedMotion: boolean) => {
      record({
        type: 'motion:toggle-reduced-motion',
        nextReducedMotion: Boolean(nextReducedMotion),
      });
      delegate?.onToggleReducedMotion?.(Boolean(nextReducedMotion));
    },
    onRequestPwaInstall: () => {
      record({ type: 'install:request-pwa-install' });
      delegate?.onRequestPwaInstall?.();
    },
    onExportBackupJson: () => {
      record({ type: 'data:export-backup' });
      delegate?.onExportBackupJson?.();
    },
    onSelectBackupFile: (fileName: string, byteSize: number) => {
      const safeName = sanitizeSettingsText(fileName, 'backup.json').text;
      const safeBytes = clampSafeSettingsCount(byteSize, 0);
      record({ type: 'data:select-backup-file', fileName: safeName, byteSize: safeBytes });
      delegate?.onSelectBackupFile?.(safeName, safeBytes);
    },
    onApplyBackupRestore: () => {
      record({ type: 'data:apply-restore' });
      delegate?.onApplyBackupRestore?.();
    },
    onCancelBackupRestore: () => {
      record({ type: 'data:cancel-restore' });
      delegate?.onCancelBackupRestore?.();
    },
    onRollbackBackupRestore: () => {
      record({ type: 'data:rollback-restore' });
      delegate?.onRollbackBackupRestore?.();
    },
    onDismissRollbackBanner: () => {
      record({ type: 'data:dismiss-rollback' });
      delegate?.onDismissRollbackBanner?.();
    },
    onToggleOwnedEquipment: (equipmentId: string) => {
      const safeId = sanitizeSettingsText(equipmentId, '').text;
      if (!safeId) return;
      record({ type: 'data:toggle-equipment', equipmentId: safeId });
      delegate?.onToggleOwnedEquipment?.(safeId);
    },
    onToggleOwnedProp: (propId: string) => {
      const safeId = sanitizeSettingsText(propId, '').text;
      if (!safeId) return;
      record({ type: 'data:toggle-prop', propId: safeId });
      delegate?.onToggleOwnedProp?.(safeId);
    },
  });

  return {
    get calls() {
      return recorded.slice();
    },
    port,
    clear() {
      recorded.length = 0;
    },
  };
}

export interface CandidateVoiceOverride {
  enabled?: boolean;
  speed?: SettingsVoiceSpeed;
  preferences?: Partial<Record<SettingsVoicePreferenceKey, boolean>>;
  sampleNotice?: string;
}

export interface CandidateInstallOverride {
  requestFeedback?: string;
  manualGuideOpen?: boolean;
  offlineNotesOpen?: boolean;
}

export interface CandidateSessionSlice {
  activeGroup?: SettingsGroupId;
  voice: CandidateVoiceOverride;
  reducedMotion?: boolean;
  install: CandidateInstallOverride;
  equip: Record<string, boolean>;
  props: Record<string, boolean>;
  feedback: string;
}

const STATIC_PRESET_SNAPSHOTS = new Set<unknown>(
  SETTINGS_PAGE_FIXTURE_PRESETS.map((item) => item.snapshot),
);

let snapshotSessionMap = new WeakMap<object, CandidateSessionSlice>();
const namedSessionMap = new Map<string, CandidateSessionSlice>();
let uncontrolledEntrySession: CandidateSessionSlice = {
  voice: {},
  install: {},
  equip: {},
  props: {},
  feedback: '',
};

export function resetSettingsCandidateSessionForTests(): void {
  snapshotSessionMap = new WeakMap<object, CandidateSessionSlice>();
  namedSessionMap.clear();
  uncontrolledEntrySession = {
    voice: {},
    install: {},
    equip: {},
    props: {},
    feedback: '',
  };
}

export function safeSettingsBaselineKey(value: unknown): string {
  if (value === undefined) return '__undefined__';
  if (value === null) return '__null__';
  if (typeof value !== 'object') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return '__unserializable__';
  }
}

export function isDataOnlyEntrySnapshot(
  snapshot: unknown,
  preferReducedMotionProp: boolean | undefined,
): boolean {
  if (typeof snapshot !== 'object' || snapshot === null || Array.isArray(snapshot)) {
    return false;
  }
  if (STATIC_PRESET_SNAPSHOTS.has(snapshot)) return false;
  const hasData = safeReadSettingsProp(snapshot, 'data') !== undefined;
  const hasAccount = safeReadSettingsProp(snapshot, 'account') !== undefined;
  const hasVoice = safeReadSettingsProp(snapshot, 'voice') !== undefined;
  const hasInstall = safeReadSettingsProp(snapshot, 'install') !== undefined;
  const hasMotion = safeReadSettingsProp(snapshot, 'preferReducedMotion') !== undefined;
  return (
    hasData &&
    !hasAccount &&
    !hasVoice &&
    !hasInstall &&
    !hasMotion &&
    preferReducedMotionProp === undefined
  );
}

export function readPersistedSettingsSessionSlice(
  snapshot: unknown,
  preferReducedMotionProp: boolean | undefined,
  sessionKey: string | undefined,
): CandidateSessionSlice | null {
  if (sessionKey && namedSessionMap.has(sessionKey)) {
    return namedSessionMap.get(sessionKey) ?? null;
  }
  if (isDataOnlyEntrySnapshot(snapshot, preferReducedMotionProp)) {
    return uncontrolledEntrySession;
  }
  if (
    typeof snapshot === 'object' &&
    snapshot !== null &&
    !STATIC_PRESET_SNAPSHOTS.has(snapshot)
  ) {
    return snapshotSessionMap.get(snapshot) ?? null;
  }
  return null;
}

export function writePersistedSettingsSessionSlice(
  snapshot: unknown,
  preferReducedMotionProp: boolean | undefined,
  sessionKey: string | undefined,
  nextSlice: CandidateSessionSlice,
): void {
  if (sessionKey) {
    namedSessionMap.set(sessionKey, nextSlice);
  }
  if (isDataOnlyEntrySnapshot(snapshot, preferReducedMotionProp)) {
    uncontrolledEntrySession = nextSlice;
    return;
  }
  if (
    typeof snapshot === 'object' &&
    snapshot !== null &&
    !STATIC_PRESET_SNAPSHOTS.has(snapshot)
  ) {
    snapshotSessionMap.set(snapshot, nextSlice);
  }
}
