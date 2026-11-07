import {
  DEFAULT_OWNED_EQUIPMENT,
  EQUIPMENT_OPTIONS,
  PROP_OPTIONS,
} from '../../data/equipmentCatalog';
import {
  type MockSettingsActionRecorder,
  type SettingsAccountInput,
  type SettingsAccountViewModel,
  type SettingsDataInput,
  type SettingsDataViewModel,
  type SettingsGroupSummary,
  type SettingsInstallInput,
  type SettingsInstallViewModel,
  type SettingsPageSnapshotInput,
  type SettingsPageViewModel,
  type SettingsRecordedAction,
  type SettingsRecoveryPreviewSummary,
  type SettingsRollbackSummary,
  type SettingsVoiceInput,
  type SettingsVoicePreferenceKey,
  type SettingsVoiceSpeed,
  type SettingsVoiceViewModel,
} from './types';

const DEFAULT_OPERATING_ORIGIN = 'https://pilates-flow-atelier.web.app';
const MAX_SAFE_COUNT = 100_000;
const MAX_SAFE_STRING_LEN = 320;

const SECRET_PATTERNS: readonly RegExp[] = [
  /AIza[0-9A-Za-z_-]{20,}/g,
  /Bearer\s+[A-Za-z0-9._~+/-]+=*/gi,
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
  /(?:api[_-]?key|secret|token|password|passwd|credential)\s*[:=]\s*['"]?[A-Za-z0-9._~+/-]{8,}['"]?/gi,
  /gh[pousr]_[A-Za-z0-9_]{20,}/g,
];

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function readOwnProp(record: unknown, key: string): unknown {
  if (!isPlainRecord(record)) return undefined;
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

function clampSafeCount(raw: unknown, fallback = 0): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return fallback;
  }
  const floored = Math.floor(raw);
  if (floored < 0) return 0;
  if (floored > MAX_SAFE_COUNT) return MAX_SAFE_COUNT;
  return floored;
}

function deepFreeze<T>(obj: T, seen = new WeakSet<object>()): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (seen.has(obj as object)) {
    return obj;
  }
  seen.add(obj as object);
  for (const key of Object.keys(obj as object)) {
    const child = (obj as Record<string, unknown>)[key];
    if (child !== null && typeof child === 'object') {
      deepFreeze(child, seen);
    }
  }
  return Object.freeze(obj);
}

function normalizeOperatingOrigin(raw: unknown): { url: string; redacted: boolean } {
  const sanitized = sanitizeSettingsText(raw, DEFAULT_OPERATING_ORIGIN);
  try {
    const parsed = new URL(sanitized.text);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { url: DEFAULT_OPERATING_ORIGIN, redacted: sanitized.redacted };
    }
    return { url: parsed.origin, redacted: sanitized.redacted };
  } catch {
    return { url: DEFAULT_OPERATING_ORIGIN, redacted: sanitized.redacted };
  }
}

function buildAccountViewModel(rawAccount: unknown): {
  model: SettingsAccountViewModel;
  redacted: boolean;
} {
  let redacted = false;
  const rawPhase = readOwnProp(rawAccount, 'phase');
  const phase: SettingsAccountInput['phase'] =
    rawPhase === 'checking' ||
    rawPhase === 'signed-out' ||
    rawPhase === 'signed-in' ||
    rawPhase === 'unavailable'
      ? rawPhase
      : 'signed-out';

  const rawOp = readOwnProp(rawAccount, 'operation');
  const operation: SettingsAccountInput['operation'] =
    rawOp === 'signing-in' || rawOp === 'signing-out' ? rawOp : null;

  const rawUser = readOwnProp(rawAccount, 'user');
  let user: SettingsAccountViewModel['user'] = null;
  if (phase === 'signed-in' && isPlainRecord(rawUser)) {
    const uidRes = sanitizeSettingsText(readOwnProp(rawUser, 'uid'), 'local-account');
    const nameRes = sanitizeSettingsText(readOwnProp(rawUser, 'displayName'), '');
    const emailRes = sanitizeSettingsText(readOwnProp(rawUser, 'email'), '');
    redacted = redacted || uidRes.redacted || nameRes.redacted || emailRes.redacted;
    user = {
      uid: uidRes.text,
      displayName: nameRes.text || null,
      email: emailRes.text || null,
    };
  }

  const normalizedPhase: SettingsAccountInput['phase'] =
    phase === 'signed-in' && !user ? 'signed-out' : phase;

  const rawError = readOwnProp(rawAccount, 'error');
  let errorCode = '';
  let errorMessageKo: string | null = null;
  if (isPlainRecord(rawError)) {
    const codeRes = sanitizeSettingsText(readOwnProp(rawError, 'code'), '');
    const msgRes = sanitizeSettingsText(readOwnProp(rawError, 'message'), '');
    redacted = redacted || codeRes.redacted || msgRes.redacted;
    errorCode = codeRes.text;
    errorMessageKo = msgRes.text || null;
  }

  const noticeRes = sanitizeSettingsText(readOwnProp(rawAccount, 'notice'), '');
  const originRes = normalizeOperatingOrigin(readOwnProp(rawAccount, 'operatingOrigin'));
  redacted = redacted || noticeRes.redacted || originRes.redacted;

  const unsupportedHost =
    normalizedPhase === 'unavailable' && errorCode === 'auth/unsupported-host';
  const busy = normalizedPhase === 'checking' || operation !== null;

  const displayTarget = user?.displayName || user?.email || '계정';
  const avatarInitial = displayTarget.trim().charAt(0).toUpperCase() || '계';

  let currentStatusLabelKo = '이 기기 전용 (로그아웃됨)';
  if (normalizedPhase === 'checking') {
    currentStatusLabelKo = '로그인 상태 확인 중…';
  } else if (normalizedPhase === 'signed-in' && user) {
    const identityText = user.displayName || user.email || 'Google 계정';
    currentStatusLabelKo = `Google 로그인됨 (${identityText})`;
  } else if (unsupportedHost) {
    currentStatusLabelKo = '운영 주소 외 로그인 비활성 (로컬 보관 유지)';
  } else if (normalizedPhase === 'unavailable') {
    currentStatusLabelKo = '계정 연결 미확인 (로컬 보관 유지)';
  }

  return {
    model: {
      phase: normalizedPhase,
      operation,
      busy,
      unsupportedHost,
      user,
      avatarInitial,
      currentStatusLabelKo,
      storageBoundaryLabelKo: '이 브라우저 계정별 슬롯 보관 · 서버 자동 동기화 안 함',
      securityPolicyLabelKo: '인증·보안 설정 읽기 전용 (토큰·도메인·키 변경 금지)',
      errorMessageKo,
      noticeKo: noticeRes.text || null,
      operatingOrigin: originRes.url,
    },
    redacted,
  };
}

function buildVoiceViewModel(rawVoice: unknown): {
  model: SettingsVoiceViewModel;
  redacted: boolean;
} {
  let redacted = false;
  const rawCap = readOwnProp(rawVoice, 'capabilityStatus');
  const capabilityStatus: SettingsVoiceInput['capabilityStatus'] =
    rawCap === 'available' || rawCap === 'no-korean-voice' || rawCap === 'unsupported'
      ? rawCap
      : 'available';

  const nameRes = sanitizeSettingsText(
    readOwnProp(rawVoice, 'voiceName'),
    capabilityStatus === 'available' ? '한국어 기기 내장 음성' : '',
  );
  const langRes = sanitizeSettingsText(
    readOwnProp(rawVoice, 'voiceLang'),
    capabilityStatus === 'available' ? 'ko-KR' : '',
  );
  const errRes = sanitizeSettingsText(readOwnProp(rawVoice, 'error'), '');
  const statusRes = sanitizeSettingsText(readOwnProp(rawVoice, 'statusAnnouncementKo'), '');
  redacted =
    redacted || nameRes.redacted || langRes.redacted || errRes.redacted || statusRes.redacted;

  const rawLocal = readOwnProp(rawVoice, 'localService');
  const localService =
    capabilityStatus === 'available' ? (typeof rawLocal === 'boolean' ? rawLocal : true) : false;

  const canToggleEnabled = capabilityStatus === 'available' && localService;
  const rawEnabled = readOwnProp(rawVoice, 'enabled');
  const enabled = canToggleEnabled && rawEnabled === true;

  const rawSpeed = readOwnProp(rawVoice, 'speed');
  const speed: SettingsVoiceSpeed =
    rawSpeed === 0.85 || rawSpeed === 1 || rawSpeed === 1.15 ? rawSpeed : 1;

  const rawPrefs = readOwnProp(rawVoice, 'preferences');
  const movement =
    isPlainRecord(rawPrefs) && typeof readOwnProp(rawPrefs, 'movement') === 'boolean'
      ? (readOwnProp(rawPrefs, 'movement') as boolean)
      : true;
  const breath =
    isPlainRecord(rawPrefs) && typeof readOwnProp(rawPrefs, 'breath') === 'boolean'
      ? (readOwnProp(rawPrefs, 'breath') as boolean)
      : true;
  const time =
    isPlainRecord(rawPrefs) && typeof readOwnProp(rawPrefs, 'time') === 'boolean'
      ? (readOwnProp(rawPrefs, 'time') as boolean)
      : true;

  const activeLabels: string[] = [];
  if (movement) activeLabels.push('동작·단계');
  if (breath) activeLabels.push('호흡 메모');
  if (time) activeLabels.push('남은 시간');

  const enabledPreferenceCount = activeLabels.length;
  const currentPreferencesLabelKo =
    enabledPreferenceCount > 0
      ? `${activeLabels.join(' · ')} (${enabledPreferenceCount}/3 켜짐)`
      : '선택된 안내 항목 없음 (0/3)';

  const speedName =
    speed === 0.85 ? '0.85x (천천히)' : speed === 1.15 ? '1.15x (조금 빠르게)' : '1.0x (기본)';

  let currentCapabilityLabelKo: string;
  if (capabilityStatus === 'available' && localService) {
    currentCapabilityLabelKo = nameRes.text
      ? `기기 내장 한국어 음성 준비됨 (${nameRes.text})`
      : '기기 내장 한국어 음성 준비됨';
  } else if (capabilityStatus === 'no-korean-voice') {
    currentCapabilityLabelKo = '기기 한국어 음성 미확인 · 화면 대본 제공';
  } else {
    currentCapabilityLabelKo = '음성 합성 미지원 환경 · 화면 대본 전용';
  }

  const defaultAnnouncement = canToggleEnabled
    ? enabled
      ? `수업 한국어 음성 안내 켜짐 · ${speedName} · ${currentPreferencesLabelKo}`
      : `수업 한국어 음성 안내 꺼짐 (수업 중 수동 시작 가능) · ${speedName}`
    : currentCapabilityLabelKo;

  return {
    model: {
      capabilityStatus,
      voiceName: nameRes.text || null,
      voiceLang: langRes.text || null,
      localService,
      canToggleEnabled,
      enabled,
      speed,
      preferences: { movement, breath, time },
      enabledPreferenceCount,
      currentCapabilityLabelKo,
      currentSpeedLabelKo: speedName,
      currentPreferencesLabelKo,
      privacyBoundaryLabelKo: '무료 온디바이스 음성 전용 · 외부 유료 API 전송 없음',
      errorMessageKo: errRes.text || null,
      statusAnnouncementKo: statusRes.text || defaultAnnouncement,
    },
    redacted,
  };
}

function buildInstallViewModel(rawInstall: unknown): SettingsInstallViewModel {
  const standalone = readOwnProp(rawInstall, 'standalone') === true;
  const installed = standalone || readOwnProp(rawInstall, 'installed') === true;

  const rawPlatform = readOwnProp(rawInstall, 'platform');
  const platform: SettingsInstallInput['platform'] =
    rawPlatform === 'ios-safari' || rawPlatform === 'ios-other' || rawPlatform === 'browser'
      ? rawPlatform
      : 'browser';

  const canInstall = !installed && readOwnProp(rawInstall, 'canInstall') === true;

  const rawInstallStatus = readOwnProp(rawInstall, 'installStatus');
  const parsedInstallStatus: SettingsInstallInput['installStatus'] =
    rawInstallStatus === 'idle' ||
    rawInstallStatus === 'prompting' ||
    rawInstallStatus === 'accepted' ||
    rawInstallStatus === 'dismissed' ||
    rawInstallStatus === 'error'
      ? rawInstallStatus
      : 'idle';

  const effectiveInstallStatus: SettingsInstallInput['installStatus'] =
    canInstall && (parsedInstallStatus === 'dismissed' || parsedInstallStatus === 'error')
      ? 'idle'
      : parsedInstallStatus;

  const rawOfflineStatus = readOwnProp(rawInstall, 'offlineStatus');
  const offlineStatus: SettingsInstallInput['offlineStatus'] =
    rawOfflineStatus === 'unavailable' ||
    rawOfflineStatus === 'preparing' ||
    rawOfflineStatus === 'ready' ||
    rawOfflineStatus === 'update-ready' ||
    rawOfflineStatus === 'error'
      ? rawOfflineStatus
      : 'unavailable';

  const showInstallButton =
    !installed && canInstall && effectiveInstallStatus !== 'prompting' && platform === 'browser';

  let currentRunModeLabelKo = '웹 브라우저에서 실행 중 (수동 설치 안내)';
  if (standalone) {
    currentRunModeLabelKo = '앱(Standalone)으로 실행 중';
  } else if (installed) {
    currentRunModeLabelKo = '설치 완료 (홈 화면·앱 목록에서 열기)';
  } else if (showInstallButton) {
    currentRunModeLabelKo = '웹 브라우저 실행 중 (바로 설치 가능)';
  } else if (platform === 'ios-safari') {
    currentRunModeLabelKo = 'iOS Safari 실행 중 (공유 → 홈 화면에 추가)';
  } else if (platform === 'ios-other') {
    currentRunModeLabelKo = 'iOS 브라우저 실행 중 (Safari에서 설치 가능)';
  }

  let currentOfflineLabelKo = '온라인 연결 필요 (오프라인 미확인)';
  let offlineDetailSummaryKo =
    '현재 오프라인 준비를 확인하지 못했어요. 인터넷에 연결해서 사용해 주세요.';
  if (offlineStatus === 'ready') {
    currentOfflineLabelKo = '오프라인 기본 화면 준비 완료';
    offlineDetailSummaryKo = '기본 화면을 오프라인에서 열 준비가 됐어요.';
  } else if (offlineStatus === 'preparing') {
    currentOfflineLabelKo = '오프라인 기본 화면 준비 중';
    offlineDetailSummaryKo =
      '기본 화면을 기기에 준비하고 있어요. 처음에는 인터넷 연결을 유지해 주세요.';
  } else if (offlineStatus === 'update-ready') {
    currentOfflineLabelKo = '새 버전 대기 중 (수업 후 재실행 시 적용)';
    offlineDetailSummaryKo =
      '새 버전이 준비됐어요. 수업을 마치고 백업한 뒤 모든 탭과 앱 창을 닫고 다시 열어 주세요. 작성 중 자동으로 새로고침하지 않아요.';
  }

  const statusParts: string[] = [];
  if (standalone) {
    statusParts.push('지금 앱으로 실행 중이에요.');
  } else if (installed) {
    statusParts.push('브라우저에서 설치 완료를 확인했어요. 홈 화면이나 앱 목록에서 열어 주세요.');
  } else if (effectiveInstallStatus === 'prompting') {
    statusParts.push('브라우저의 설치 창에서 선택해 주세요.');
  } else if (effectiveInstallStatus === 'accepted') {
    statusParts.push('설치를 요청했어요. 기기의 설치가 끝나면 앱 목록에서 열어 주세요.');
  } else if (effectiveInstallStatus === 'dismissed') {
    statusParts.push(
      '설치를 취소했어요. 계속 웹에서 사용하거나 브라우저 메뉴에서 다시 설치할 수 있어요.',
    );
  } else if (effectiveInstallStatus === 'error') {
    statusParts.push('설치 창을 열지 못했어요. 아래 브라우저 메뉴 방법으로 다시 시도해 주세요.');
  }
  if (offlineStatus === 'update-ready') {
    statusParts.push(
      '새 버전이 준비됐어요. 작성 중 자동으로 새로고침하지 않으며, 수업을 마친 뒤 앱 창을 다시 열면 적용됩니다.',
    );
  }

  const manualGuideOpenByDefault =
    !installed && !showInstallButton && effectiveInstallStatus !== 'prompting';

  return {
    standalone,
    installed,
    platform,
    canInstall,
    showInstallButton,
    effectiveInstallStatus,
    offlineStatus,
    currentRunModeLabelKo,
    currentOfflineLabelKo,
    liveStatusAnnouncementKo: statusParts.length > 0 ? statusParts.join(' ') : null,
    offlineDetailSummaryKo,
    manualGuideOpenByDefault,
  };
}

function buildDataViewModel(rawData: unknown): {
  model: SettingsDataViewModel;
  redacted: boolean;
} {
  let redacted = false;
  const savedSequenceCount = clampSafeCount(readOwnProp(rawData, 'savedSequenceCount'), 0);
  const exerciseCount = clampSafeCount(readOwnProp(rawData, 'exerciseCount'), 98);
  const historyLogCount = clampSafeCount(readOwnProp(rawData, 'historyLogCount'), 0);

  const rawEquip = readOwnProp(rawData, 'ownedEquipmentIds');
  const ownedEquipSet = new Set<string>(
    Array.isArray(rawEquip)
      ? rawEquip.filter((item): item is string => typeof item === 'string')
      : DEFAULT_OWNED_EQUIPMENT,
  );

  const rawProps = readOwnProp(rawData, 'ownedPropIds');
  const ownedPropSet = new Set<string>(
    Array.isArray(rawProps)
      ? rawProps.filter((item): item is string => typeof item === 'string' && item !== 'none')
      : [],
  );

  const equipmentOptions = EQUIPMENT_OPTIONS.map((item) => ({
    id: item.id,
    labelKo: item.labelKo,
    selected: ownedEquipSet.has(item.id),
  }));

  const propOptions = PROP_OPTIONS.filter((item) => item.id !== 'none').map((item) => ({
    id: item.id,
    labelKo: item.labelKo,
    selected: ownedPropSet.has(item.id),
  }));

  const selectedEquipmentCount = equipmentOptions.filter((item) => item.selected).length;
  const selectedPropCount = propOptions.filter((item) => item.selected).length;

  const persistErrRes = sanitizeSettingsText(readOwnProp(rawData, 'persistenceError'), '');
  const backupMsgRes = sanitizeSettingsText(readOwnProp(rawData, 'backupMessage'), '');
  redacted = redacted || persistErrRes.redacted || backupMsgRes.redacted;

  const rawStage = readOwnProp(rawData, 'recoveryStage');
  let recoveryStage: SettingsDataInput['recoveryStage'] =
    rawStage === 'idle' ||
    rawStage === 'reading' ||
    rawStage === 'preview-ready' ||
    rawStage === 'preview-error' ||
    rawStage === 'rollback-available'
      ? rawStage
      : 'idle';

  const rawPreview = readOwnProp(rawData, 'recoveryPreview');
  let recoveryPreview: SettingsRecoveryPreviewSummary | null = null;
  if (isPlainRecord(rawPreview)) {
    const srcRes = sanitizeSettingsText(readOwnProp(rawPreview, 'sourceLabel'), '백업 JSON 파일');
    const errRes = sanitizeSettingsText(readOwnProp(rawPreview, 'errorMessage'), '');
    redacted = redacted || srcRes.redacted || errRes.redacted;
    recoveryPreview = {
      sourceLabel: srcRes.text,
      bytes: clampSafeCount(readOwnProp(rawPreview, 'bytes'), 1024),
      newItems: clampSafeCount(readOwnProp(rawPreview, 'newItems'), 0),
      conflicts: clampSafeCount(readOwnProp(rawPreview, 'conflicts'), 0),
      restoredExamples: clampSafeCount(readOwnProp(rawPreview, 'restoredExamples'), 0),
      changed: readOwnProp(rawPreview, 'changed') !== false,
      stale: readOwnProp(rawPreview, 'stale') === true,
      diskBlocked: readOwnProp(rawPreview, 'diskBlocked') === true,
      ...(errRes.text ? { errorMessage: errRes.text } : {}),
    };
  }

  const rawRollback = readOwnProp(rawData, 'rollbackPoint');
  let rollbackPoint: SettingsRollbackSummary | null = null;
  if (isPlainRecord(rawRollback)) {
    const labelRes = sanitizeSettingsText(readOwnProp(rawRollback, 'createdAtLabel'), '');
    redacted = redacted || labelRes.redacted;
    rollbackPoint = {
      addedCount: clampSafeCount(readOwnProp(rawRollback, 'addedCount'), 1),
      ...(labelRes.text ? { createdAtLabel: labelRes.text } : {}),
    };
  }

  if (recoveryStage === 'preview-ready' && !recoveryPreview) {
    recoveryStage = 'idle';
  }
  if (recoveryStage === 'rollback-available' && !rollbackPoint) {
    recoveryStage = 'idle';
  }

  const currentRecordsSummaryKo = `시퀀스 ${savedSequenceCount}개 · 동작 ${exerciseCount}개 · 기록 ${historyLogCount}개`;
  const currentInventorySummaryKo = `보유 기구 ${selectedEquipmentCount}종 · 소도구 ${selectedPropCount}종`;

  let currentRecoveryLabelKo = '복구 대기 없음 · 자동 보관 중';
  if (recoveryStage === 'reading') {
    currentRecoveryLabelKo = '백업 파일 읽는 중 (원본 무변경)';
  } else if (recoveryStage === 'preview-error') {
    currentRecoveryLabelKo = '백업 파일 형식 확인 필요 (원본 유지됨)';
  } else if (recoveryStage === 'preview-ready' && recoveryPreview) {
    const kb = Math.max(1, Math.ceil(recoveryPreview.bytes / 1024));
    currentRecoveryLabelKo = `복구 전 확인 중 (${recoveryPreview.sourceLabel} · ${kb}KB · 신규 ${recoveryPreview.newItems}개)`;
  } else if (recoveryStage === 'rollback-available' && rollbackPoint) {
    currentRecoveryLabelKo = `직전 복원 되돌리기 가능 (+${rollbackPoint.addedCount}개 반영됨)`;
  }

  return {
    model: {
      savedSequenceCount,
      exerciseCount,
      historyLogCount,
      equipmentOptions,
      propOptions,
      selectedEquipmentCount,
      selectedPropCount,
      currentRecordsSummaryKo,
      currentInventorySummaryKo,
      currentRecoveryLabelKo,
      nonDestructivePolicyLabelKo:
        '데이터 삭제·초기화 동작 금지 · 백업 내보내기와 안전한 병합 복구만 지원',
      persistenceErrorKo: persistErrRes.text || null,
      backupMessageKo: backupMsgRes.text || null,
      recoveryStage,
      recoveryPreview,
      rollbackPoint,
    },
    redacted,
  };
}

export function resolveSettingsPageViewModel(
  input?: SettingsPageSnapshotInput | unknown,
): SettingsPageViewModel {
  const rawAccount = readOwnProp(input, 'account');
  const rawVoice = readOwnProp(input, 'voice');
  const rawInstall = readOwnProp(input, 'install');
  const rawData = readOwnProp(input, 'data');
  const preferReducedMotion = readOwnProp(input, 'preferReducedMotion') === true;

  const accountRes = buildAccountViewModel(rawAccount);
  const voiceRes = buildVoiceViewModel(rawVoice);
  const installModel = buildInstallViewModel(rawInstall);
  const dataRes = buildDataViewModel(rawData);

  const redactionApplied = accountRes.redacted || voiceRes.redacted || dataRes.redacted;

  const groups: SettingsGroupSummary[] = [
    {
      id: 'account',
      order: 1,
      eyebrow: 'GROUP 1 · ACCOUNT',
      titleKo: '계정 연결',
      shortDescriptionKo:
        '이 브라우저에서 계정별 작업 공간을 구분합니다. 로그인만으로 서버에 자동 업로드되지 않습니다.',
      currentValueBadgeKo: accountRes.model.currentStatusLabelKo,
      secondaryValueKo: accountRes.model.storageBoundaryLabelKo,
      safetyNoteKo: accountRes.model.securityPolicyLabelKo,
    },
    {
      id: 'voice',
      order: 2,
      eyebrow: 'GROUP 2 · VOICE GUIDANCE',
      titleKo: '한국어 음성 안내',
      shortDescriptionKo:
        '기기 내장 무료 한국어 음성(Web Speech API)과 화면 대본으로 수업 진행·동작 설명을 보조합니다.',
      currentValueBadgeKo: `${voiceRes.model.enabled ? '음성 켜짐' : '음성 꺼짐'} · ${voiceRes.model.currentSpeedLabelKo}`,
      secondaryValueKo: `${voiceRes.model.currentCapabilityLabelKo} · ${voiceRes.model.currentPreferencesLabelKo}`,
      safetyNoteKo: voiceRes.model.privacyBoundaryLabelKo,
    },
    {
      id: 'install',
      order: 3,
      eyebrow: 'GROUP 3 · APP INSTALL',
      titleKo: '앱 설치 및 오프라인',
      shortDescriptionKo:
        '앱스토어 없이 홈 화면·앱 목록에 설치합니다. 수업 작성 중에는 새 버전이 와도 자동 새로고침하지 않습니다.',
      currentValueBadgeKo: installModel.currentRunModeLabelKo,
      secondaryValueKo: installModel.currentOfflineLabelKo,
      safetyNoteKo: '설치는 기기 간 동기화가 아니며, 기기 이동 전 전체 JSON 백업이 필요합니다.',
    },
    {
      id: 'data',
      order: 4,
      eyebrow: 'GROUP 4 · DATA & EQUIPMENT',
      titleKo: '데이터 관리 및 보유 기구',
      shortDescriptionKo:
        '이 브라우저에 자동 보관된 수업 자료를 JSON으로 백업하거나 기존 자료와 안전하게 병합 복구합니다.',
      currentValueBadgeKo: dataRes.model.currentRecordsSummaryKo,
      secondaryValueKo: `${dataRes.model.currentInventorySummaryKo} · ${dataRes.model.currentRecoveryLabelKo}`,
      safetyNoteKo: dataRes.model.nonDestructivePolicyLabelKo,
    },
  ];

  const viewModel: SettingsPageViewModel = {
    groups,
    account: accountRes.model,
    voice: voiceRes.model,
    install: installModel,
    data: dataRes.model,
    preferReducedMotion,
    safety: {
      canMutateAuthOrSecurityConfig: false,
      canDeleteUserData: false,
      hasDestructiveDeleteAction: false,
      redactionApplied,
    },
  };

  return deepFreeze(viewModel);
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
      const safeBytes = clampSafeCount(byteSize, 0);
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
