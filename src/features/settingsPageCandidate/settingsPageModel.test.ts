import { describe, expect, it, vi } from 'vitest';
import {
  cloneSettingsSnapshotInput,
  getSettingsFixturePreset,
  SETTINGS_PAGE_FIXTURE_PRESETS,
} from './settingsPageFixtures';
import {
  createMockSettingsActionRecorder,
  resolveSettingsPageViewModel,
  sanitizeSettingsText,
} from './settingsPageModel';
import { SETTINGS_PAGE_SAFETY_CONTRACT, type SettingsPageSnapshotInput } from './types';

describe('settingsPageModel (Track A unit verification)', () => {
  it('1. enforces SETTINGS_PAGE_SAFETY_CONTRACT invariants and touch spacing minimums', () => {
    expect(Object.isFrozen(SETTINGS_PAGE_SAFETY_CONTRACT)).toBe(true);
    expect(Object.isFrozen(SETTINGS_PAGE_SAFETY_CONTRACT.groups)).toBe(true);
    expect(Object.isFrozen(SETTINGS_PAGE_SAFETY_CONTRACT.supportedViewports)).toBe(true);

    expect(SETTINGS_PAGE_SAFETY_CONTRACT.featureId).toBe('parallel-page-settings-20261107');
    expect(SETTINGS_PAGE_SAFETY_CONTRACT.ownsLocalSettingsUiOnly).toBe(true);
    expect(SETTINGS_PAGE_SAFETY_CONTRACT.modifiesSharedRoutesOrStoreOrTheme).toBe(false);
    expect(SETTINGS_PAGE_SAFETY_CONTRACT.canMutateAuthOrSecurityConfig).toBe(false);
    expect(SETTINGS_PAGE_SAFETY_CONTRACT.canDeleteUserData).toBe(false);
    expect(SETTINGS_PAGE_SAFETY_CONTRACT.hasDestructiveDeleteAction).toBe(false);
    expect(SETTINGS_PAGE_SAFETY_CONTRACT.usesMockAdaptersInTests).toBe(true);
    expect(SETTINGS_PAGE_SAFETY_CONTRACT.groups).toEqual(['account', 'voice', 'install', 'data']);
    expect(SETTINGS_PAGE_SAFETY_CONTRACT.minTouchTargetPx).toBe(44);
    expect(SETTINGS_PAGE_SAFETY_CONTRACT.minTouchGapPx).toBe(8);
    expect(SETTINGS_PAGE_SAFETY_CONTRACT.supportedViewports).toEqual([320, 390, 768, 1440]);
  });

  it('2. resolves all 4 concise groups with currentValueBadgeKo, shortDescriptionKo, secondaryValueKo, and safetyNoteKo', () => {
    const preset = getSettingsFixturePreset('default-local-studio');
    const vm = resolveSettingsPageViewModel(preset.snapshot);

    expect(vm.groups).toHaveLength(4);
    expect(vm.groups.map((g) => g.id)).toEqual(['account', 'voice', 'install', 'data']);
    expect(vm.groups.map((g) => g.order)).toEqual([1, 2, 3, 4]);

    for (const group of vm.groups) {
      expect(group.titleKo.length).toBeGreaterThan(2);
      expect(group.shortDescriptionKo.length).toBeGreaterThan(10);
      expect(group.currentValueBadgeKo.length).toBeGreaterThan(2);
      expect(group.secondaryValueKo.length).toBeGreaterThan(2);
      expect(group.safetyNoteKo.length).toBeGreaterThan(2);
    }

    expect(vm.groups[0].currentValueBadgeKo).toContain('이 기기 전용 (로그아웃됨)');
    expect(vm.groups[1].currentValueBadgeKo).toContain('음성 꺼짐 · 1.0x (기본)');
    expect(vm.groups[2].currentValueBadgeKo).toContain('웹 브라우저 실행 중 (바로 설치 가능)');
    expect(vm.groups[3].currentValueBadgeKo).toContain('시퀀스 4개 · 동작 98개 · 기록 6개');
  });

  it('3. never mutates or freezes the caller input object or its nested arrays while deeply freezing the returned view model', () => {
    const callerEquip = ['reformer', 'mat'];
    const callerProps = ['mini-ball'];
    const callerAccount = {
      phase: 'signed-in' as const,
      operation: null,
      user: {
        uid: 'u-1',
        displayName: '박지민 강사',
        email: 'jimin@example.test',
      },
      error: null,
      notice: '안내 메시지',
    };
    const callerVoicePrefs = { movement: true, breath: false, time: true };
    const callerInput: SettingsPageSnapshotInput = {
      account: callerAccount,
      voice: {
        capabilityStatus: 'available',
        voiceName: 'Yuna',
        voiceLang: 'ko-KR',
        localService: true,
        enabled: true,
        speed: 1.15,
        preferences: callerVoicePrefs,
        error: '',
      },
      install: {
        standalone: false,
        installed: false,
        platform: 'browser',
        canInstall: true,
        installStatus: 'idle',
        offlineStatus: 'ready',
      },
      data: {
        savedSequenceCount: 3,
        exerciseCount: 98,
        historyLogCount: 2,
        ownedEquipmentIds: callerEquip,
        ownedPropIds: callerProps,
        persistenceError: null,
        backupMessage: '',
        recoveryStage: 'idle',
        recoveryPreview: null,
        rollbackPoint: null,
      },
    };

    const vm = resolveSettingsPageViewModel(callerInput);

    expect(Object.isFrozen(callerInput)).toBe(false);
    expect(Object.isFrozen(callerAccount)).toBe(false);
    expect(Object.isFrozen(callerVoicePrefs)).toBe(false);
    expect(Object.isFrozen(callerEquip)).toBe(false);
    expect(Object.isFrozen(callerProps)).toBe(false);

    callerEquip.push('chair');
    expect(callerEquip).toEqual(['reformer', 'mat', 'chair']);

    expect(Object.isFrozen(vm)).toBe(true);
    expect(Object.isFrozen(vm.groups)).toBe(true);
    expect(Object.isFrozen(vm.groups[0])).toBe(true);
    expect(Object.isFrozen(vm.account)).toBe(true);
    expect(Object.isFrozen(vm.account.user)).toBe(true);
    expect(Object.isFrozen(vm.voice)).toBe(true);
    expect(Object.isFrozen(vm.voice.preferences)).toBe(true);
    expect(Object.isFrozen(vm.install)).toBe(true);
    expect(Object.isFrozen(vm.data)).toBe(true);
    expect(Object.isFrozen(vm.data.equipmentOptions)).toBe(true);
    expect(Object.isFrozen(vm.safety)).toBe(true);
  });

  it('4. B-F2 fix: normalizes stale dismissed or error installStatus to idle and enables install button when canInstall is true', () => {
    const dismissedVm = resolveSettingsPageViewModel({
      install: {
        standalone: false,
        installed: false,
        platform: 'browser',
        canInstall: true,
        installStatus: 'dismissed',
        offlineStatus: 'ready',
      },
    });

    expect(dismissedVm.install.effectiveInstallStatus).toBe('idle');
    expect(dismissedVm.install.showInstallButton).toBe(true);
    expect(dismissedVm.install.liveStatusAnnouncementKo).toBeNull();

    const errorVm = resolveSettingsPageViewModel({
      install: {
        standalone: false,
        installed: false,
        platform: 'browser',
        canInstall: true,
        installStatus: 'error',
        offlineStatus: 'ready',
      },
    });

    expect(errorVm.install.effectiveInstallStatus).toBe('idle');
    expect(errorVm.install.showInstallButton).toBe(true);
    expect(errorVm.install.liveStatusAnnouncementKo).toBeNull();
  });

  it('5. B-F2 retention: preserves dismissed or error status message when canInstall is false', () => {
    const dismissedNoPromptVm = resolveSettingsPageViewModel({
      install: {
        standalone: false,
        installed: false,
        platform: 'browser',
        canInstall: false,
        installStatus: 'dismissed',
        offlineStatus: 'ready',
      },
    });

    expect(dismissedNoPromptVm.install.effectiveInstallStatus).toBe('dismissed');
    expect(dismissedNoPromptVm.install.showInstallButton).toBe(false);
    expect(dismissedNoPromptVm.install.liveStatusAnnouncementKo).toContain('설치를 취소했어요');
  });

  it('6. B-F4 fix: combines install status and offline update-ready into a single clean liveStatusAnnouncementKo string', () => {
    const singleUpdateVm = resolveSettingsPageViewModel({
      install: {
        standalone: false,
        installed: false,
        platform: 'browser',
        canInstall: true,
        installStatus: 'dismissed',
        offlineStatus: 'update-ready',
      },
    });

    expect(singleUpdateVm.install.effectiveInstallStatus).toBe('idle');
    expect(singleUpdateVm.install.liveStatusAnnouncementKo).toBe(
      '새 버전이 준비됐어요. 작성 중 자동으로 새로고침하지 않으며, 수업을 마친 뒤 앱 창을 다시 열면 적용됩니다.',
    );

    const combinedVm = resolveSettingsPageViewModel({
      install: {
        standalone: true,
        installed: true,
        platform: 'browser',
        canInstall: false,
        installStatus: 'idle',
        offlineStatus: 'update-ready',
      },
    });

    expect(combinedVm.install.liveStatusAnnouncementKo).toContain('지금 앱으로 실행 중이에요.');
    expect(combinedVm.install.liveStatusAnnouncementKo).toContain('새 버전이 준비됐어요.');
  });

  it('7. redacts sensitive tokens (AIza, Bearer, JWT eyJ, apiKey=, ghp_) via sanitizeSettingsText and marks safety.redactionApplied', () => {
    const rawSecrets =
      `오류: ${['AIza', 'SyDummySecretKeyForRedactionTest12345'].join('')} / Bearer secretToken_987654321 / eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c / apiKey=mySuperSecretKey12345 / ${['ghp_', 'abcdefghijklmnopqrstuvwxyz012345'].join('')}`;

    const sanitized = sanitizeSettingsText(rawSecrets);
    expect(sanitized.redacted).toBe(true);
    expect(sanitized.text).not.toContain('AIzaSyDummy');
    expect(sanitized.text).not.toContain('Bearer secretToken');
    expect(sanitized.text).not.toContain('eyJhbGci');
    expect(sanitized.text).not.toContain('mySuperSecretKey12345');
    expect(sanitized.text).not.toContain('ghp_abcdefghijk');
    expect(sanitized.text).toContain('[민감정보 보호됨]');

    const preset = getSettingsFixturePreset('adversarial-untrusted-input');
    const vm = resolveSettingsPageViewModel(preset.snapshot);

    expect(vm.safety.redactionApplied).toBe(true);
    expect(vm.safety.canMutateAuthOrSecurityConfig).toBe(false);
    expect(vm.safety.canDeleteUserData).toBe(false);
    expect(vm.safety.hasDestructiveDeleteAction).toBe(false);
    expect(vm.account.errorMessageKo).toContain('[민감정보 보호됨]');
    expect(vm.account.errorMessageKo).not.toContain('AIzaSy');
    expect(vm.data.backupMessageKo).toContain('[민감정보 보호됨]');
    expect(vm.data.backupMessageKo).not.toContain('ghp_123456');
  });

  it('8. clamps out-of-range counts and falls back safely on malformed or prototype-polluted input', () => {
    const polluted = Object.create(null) as Record<string, unknown>;
    polluted.account = {
      phase: 'signed-in',
      user: null,
      operatingOrigin: 'javascript:alert(1)',
    };
    polluted.data = {
      savedSequenceCount: -42,
      exerciseCount: Number.NaN,
      historyLogCount: 999_999_999,
      recoveryStage: 'preview-ready',
      recoveryPreview: null,
    };

    const vm = resolveSettingsPageViewModel(polluted);
    expect(vm.account.phase).toBe('signed-out');
    expect(vm.account.operatingOrigin).toBe('https://pilates-flow-atelier.web.app');
    expect(vm.data.savedSequenceCount).toBe(0);
    expect(vm.data.exerciseCount).toBe(98);
    expect(vm.data.historyLogCount).toBe(100_000);
    expect(vm.data.recoveryStage).toBe('idle');
  });

  it('9. normalizes voice capability, speed, and preferences accurately when voice is unavailable or unsupported', () => {
    const noKoreanVm = resolveSettingsPageViewModel({
      voice: {
        capabilityStatus: 'no-korean-voice',
        localService: false,
        enabled: true,
        speed: 0.85,
        preferences: { movement: false, breath: false, time: false },
      },
    });

    expect(noKoreanVm.voice.canToggleEnabled).toBe(false);
    expect(noKoreanVm.voice.enabled).toBe(false);
    expect(noKoreanVm.voice.speed).toBe(0.85);
    expect(noKoreanVm.voice.enabledPreferenceCount).toBe(0);
    expect(noKoreanVm.voice.currentPreferencesLabelKo).toContain('선택된 안내 항목 없음 (0/3)');
    expect(noKoreanVm.voice.currentCapabilityLabelKo).toContain('기기 한국어 음성 미확인');
  });

  it('10. resolves account states including checking, signed-in avatar initial, and unsupportedHost flag', () => {
    const checkingVm = resolveSettingsPageViewModel({
      account: { phase: 'checking' },
    });
    expect(checkingVm.account.busy).toBe(true);
    expect(checkingVm.account.currentStatusLabelKo).toBe('로그인 상태 확인 중…');

    const unsupportedVm = resolveSettingsPageViewModel({
      account: {
        phase: 'unavailable',
        error: { code: 'auth/unsupported-host', message: '운영 도메인 외' },
      },
    });
    expect(unsupportedVm.account.unsupportedHost).toBe(true);
    expect(unsupportedVm.account.currentStatusLabelKo).toContain('운영 주소 외 로그인 비활성');

    const signedInVm = resolveSettingsPageViewModel({
      account: {
        phase: 'signed-in',
        user: { uid: 'u1', displayName: '김서연 강사', email: 'seoyeon@example.test' },
      },
    });
    expect(signedInVm.account.avatarInitial).toBe('김');
    expect(signedInVm.account.currentStatusLabelKo).toBe('Google 로그인됨 (김서연 강사)');
  });

  it('11. records all mock actions in createMockSettingsActionRecorder, forwards to delegate, and supports clear()', () => {
    const onSignIn = vi.fn();
    const onSpeed = vi.fn();
    const recorder = createMockSettingsActionRecorder({
      onRequestGoogleSignIn: onSignIn,
      onChangeVoiceSpeed: onSpeed,
    });

    recorder.port.onRequestGoogleSignIn?.();
    recorder.port.onRequestAccountSwitch?.();
    recorder.port.onRequestSignOut?.();
    recorder.port.onRequestAuthRecheck?.();
    recorder.port.onToggleVoiceEnabled?.(true);
    recorder.port.onChangeVoiceSpeed?.(1.15);
    recorder.port.onToggleVoicePreference?.('breath', false);
    recorder.port.onRecheckVoiceCapability?.();
    recorder.port.onPreviewVoiceSample?.();
    recorder.port.onRequestPwaInstall?.();
    recorder.port.onExportBackupJson?.();
    recorder.port.onSelectBackupFile?.('my-backup.json', 4096);
    recorder.port.onApplyBackupRestore?.();
    recorder.port.onCancelBackupRestore?.();
    recorder.port.onRollbackBackupRestore?.();
    recorder.port.onDismissRollbackBanner?.();
    recorder.port.onToggleOwnedEquipment?.('reformer');
    recorder.port.onToggleOwnedProp?.('mini-ball');

    expect(onSignIn).toHaveBeenCalledTimes(1);
    expect(onSpeed).toHaveBeenCalledWith(1.15);
    expect(recorder.calls).toHaveLength(18);
    expect(recorder.calls[0]).toEqual({ type: 'account:sign-in' });
    expect(recorder.calls[4]).toEqual({ type: 'voice:toggle-enabled', nextEnabled: true });
    expect(recorder.calls[5]).toEqual({ type: 'voice:change-speed', nextSpeed: 1.15 });
    expect(recorder.calls[6]).toEqual({
      type: 'voice:toggle-preference',
      key: 'breath',
      nextChecked: false,
    });
    expect(recorder.calls[9]).toEqual({ type: 'install:request-pwa-install' });
    expect(recorder.calls[11]).toEqual({
      type: 'data:select-backup-file',
      fileName: 'my-backup.json',
      byteSize: 4096,
    });
    expect(recorder.calls[16]).toEqual({
      type: 'data:toggle-equipment',
      equipmentId: 'reformer',
    });
    expect(recorder.calls[17]).toEqual({
      type: 'data:toggle-prop',
      propId: 'mini-ball',
    });

    recorder.clear();
    expect(recorder.calls).toHaveLength(0);
  });

  it('12. provides all 6 synthetic fixture presets and supports safe deep cloning via cloneSettingsSnapshotInput', () => {
    expect(SETTINGS_PAGE_FIXTURE_PRESETS).toHaveLength(6);
    for (const preset of SETTINGS_PAGE_FIXTURE_PRESETS) {
      const cloned = cloneSettingsSnapshotInput(preset.snapshot);
      expect(cloned).toEqual(preset.snapshot);
      expect(cloned).not.toBe(preset.snapshot);
      const vm = resolveSettingsPageViewModel(cloned);
      expect(vm.groups).toHaveLength(4);
    }
  });
});
