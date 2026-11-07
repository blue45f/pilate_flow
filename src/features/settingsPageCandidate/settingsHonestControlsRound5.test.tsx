// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePilatesStore } from '../../store/usePilatesStore';
import {
  PilatesSettingsPage,
  SETTINGS_PAGE_FIXTURE_PRESETS,
  cloneSettingsSnapshotInput,
  createMockSettingsActionRecorder,
  resetSettingsCandidateSessionForTests,
} from './index';

describe('settingsHonestControlsRound5 — Honest Unconnected Controls, Safe Guidance & Contract Verification', () => {
  beforeEach(() => {
    resetSettingsCandidateSessionForTests();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    resetSettingsCandidateSessionForTests();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('1. [실제 App.tsx 진입 경로] Enables connected controls (export, equipment, props, group nav) and disables all unconnected controls without fake success', () => {
    const onExportBackupJson = vi.fn();
    const onToggleOwnedEquipment = vi.fn();
    const onToggleOwnedProp = vi.fn();

    render(
      <PilatesSettingsPage
        snapshot={{
          data: {
            savedSequenceCount: 3,
            exerciseCount: 98,
            historyLogCount: 5,
            ownedEquipmentIds: ['reformer', 'mat'],
            ownedPropIds: ['mini-ball'],
            persistenceError: null,
            backupMessage: '',
          },
        }}
        port={{
          onExportBackupJson,
          onToggleOwnedEquipment,
          onToggleOwnedProp,
        }}
      />,
    );

    // 1) Connected controls MUST be enabled and functional
    const exportBtn = screen.getByTestId('settings-data-export-btn') as HTMLButtonElement;
    const chairCheck = screen.getByTestId('settings-equipment-check-chair') as HTMLInputElement;
    const ringCheck = screen.getByTestId('settings-prop-check-magic-circle') as HTMLInputElement;
    const navVoice = screen.getByTestId('settings-nav-chip-voice') as HTMLButtonElement;

    expect(exportBtn.disabled).toBe(false);
    expect(chairCheck.disabled).toBe(false);
    expect(ringCheck.disabled).toBe(false);
    expect(navVoice.disabled).toBe(false);

    fireEvent.click(exportBtn);
    expect(onExportBackupJson).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('settings-data-message').textContent).toContain(
      '백업 파일 내보내기를 요청했습니다.',
    );

    fireEvent.click(chairCheck);
    expect(onToggleOwnedEquipment).toHaveBeenCalledWith('chair');
    expect(chairCheck.checked).toBe(true);

    fireEvent.click(ringCheck);
    expect(onToggleOwnedProp).toHaveBeenCalledWith('magic-circle');
    expect(ringCheck.checked).toBe(true);

    // 2) Unconnected controls MUST be disabled and MUST NOT fake success on click
    const signInBtn = screen.getByTestId('settings-account-signin-btn') as HTMLButtonElement;
    const voiceToggle = screen.getByTestId('settings-voice-enable-toggle') as HTMLButtonElement;
    const sampleBtn = screen.getByTestId('settings-voice-sample-btn') as HTMLButtonElement;
    const recheckBtn = screen.getByTestId('settings-voice-recheck-btn') as HTMLButtonElement;
    const motionBtn = screen.getByTestId('settings-reduced-motion-toggle') as HTMLButtonElement;
    const speed085 = screen.getByTestId('settings-voice-speed-0.85') as HTMLButtonElement;
    const speed100 = screen.getByTestId('settings-voice-speed-1') as HTMLButtonElement;
    const speed115 = screen.getByTestId('settings-voice-speed-1.15') as HTMLButtonElement;
    const prefMove = screen.getByTestId('settings-voice-pref-movement') as HTMLInputElement;
    const prefBreath = screen.getByTestId('settings-voice-pref-breath') as HTMLInputElement;
    const prefTime = screen.getByTestId('settings-voice-pref-time') as HTMLInputElement;
    const importBtn = screen.getByTestId('settings-data-import-btn') as HTMLButtonElement;

    for (const control of [
      signInBtn,
      voiceToggle,
      sampleBtn,
      recheckBtn,
      motionBtn,
      speed085,
      speed100,
      speed115,
      prefMove,
      prefBreath,
      prefTime,
      importBtn,
    ]) {
      expect(control.disabled).toBe(true);
    }

    // Attempt clicks on disabled controls: state must not change and no fake inspection/voice message may appear
    fireEvent.click(voiceToggle);
    fireEvent.click(speed085);
    fireEvent.click(importBtn);

    expect(voiceToggle.getAttribute('aria-pressed')).toBe('false');
    expect(speed085.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByTestId('settings-data-message').textContent).not.toContain(
      '백업 JSON 파일을 읽기 전용으로 검사합니다',
    );
  });

  it('2. [안전한 안내 문구] Renders concise, plain-Korean guidance pointing to existing real app features for each unconnected group', () => {
    render(
      <PilatesSettingsPage
        snapshot={{
          data: {
            savedSequenceCount: 1,
            exerciseCount: 98,
            historyLogCount: 0,
            ownedEquipmentIds: ['reformer'],
            ownedPropIds: [],
          },
        }}
        port={{
          onExportBackupJson: vi.fn(),
          onToggleOwnedEquipment: vi.fn(),
          onToggleOwnedProp: vi.fn(),
        }}
      />,
    );

    expect(screen.getByTestId('settings-account-unconnected-guide').textContent).toContain(
      '바로 위 ‘Google 계정 연결’에서 로그인·계정 전환을 이용해 주세요.',
    );
    expect(screen.getByTestId('settings-voice-unconnected-guide').textContent).toContain(
      '‘수업 진행’ 화면의 ‘기기 음성 안내’에서 수업마다 직접 설정해 주세요.',
    );
    expect(screen.getByTestId('settings-voice-speed-status').textContent).toBe(
      '1.0x (기본 고정 · 수업 화면 속도 변경 미지원)',
    );
    expect(screen.getByTestId('settings-install-unconnected-guide').textContent).toContain(
      '메뉴의 ‘앱 설치’ 버튼이나 아래 브라우저 메뉴 설치 방법을 이용해 주세요.',
    );
    expect(screen.getByTestId('settings-data-unconnected-guide').textContent).toContain(
      '바로 위 ‘백업 불러오기’ 버튼을 이용해 주세요.',
    );
  });

  it('3. [포트 미연결 상태별 버튼 방어] Disables signed-in switch/signout, unavailable recheck, preview apply/cancel, and rollback buttons when their ports are omitted', () => {
    const { rerender } = render(
      <PilatesSettingsPage
        snapshot={{
          account: {
            phase: 'signed-in',
            operation: null,
            user: { uid: 'u-1', displayName: '테스트 강사', email: 'instructor@example.test' },
            error: null,
            notice: '',
          },
          data: {
            recoveryStage: 'preview-ready',
            recoveryPreview: {
              sourceLabel: 'sample.json',
              bytes: 2048,
              newItems: 2,
              conflicts: 0,
              restoredExamples: 0,
              changed: true,
              stale: false,
              diskBlocked: false,
            },
          },
        }}
        port={{}}
      />,
    );

    expect(
      (screen.getByTestId('settings-account-switch-btn') as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByTestId('settings-account-signout-btn') as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByTestId('settings-data-preview-apply-btn') as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByTestId('settings-data-preview-cancel-btn') as HTMLButtonElement).disabled,
    ).toBe(true);

    rerender(
      <PilatesSettingsPage
        snapshot={{
          account: {
            phase: 'unavailable',
            operation: null,
            user: null,
            error: { code: 'auth/network-timeout', message: '네트워크 지연' },
            notice: '',
          },
          data: {
            recoveryStage: 'rollback-available',
            rollbackPoint: {
              addedCount: 2,
              createdAtLabel: '방금 전',
            },
          },
        }}
        port={{}}
      />,
    );

    expect(
      (screen.getByTestId('settings-account-recheck-btn') as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByTestId('settings-data-rollback-btn') as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByTestId('settings-data-rollback-dismiss-btn') as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('4. [개발 용어·장문 보고문 금지] Never renders developer jargon or internal implementation identifiers in the user-facing DOM across real entry and all presets', () => {
    const forbiddenDevTerms =
      /\b(?:LiveStage|LiveStageView|PwaPanel|PwaInstallPanel|RecoveryPreview|CloudSyncPanel|useClassVoiceGuidance|usePilatesStore|props|callback|snapshot|DOM|hook|candidate|mock|undefined|null)\b/i;

    const { container: realEntryContainer, unmount: unmountRealEntry } = render(
      <PilatesSettingsPage
        snapshot={{
          data: {
            savedSequenceCount: 4,
            exerciseCount: 98,
            historyLogCount: 6,
            ownedEquipmentIds: ['reformer', 'mat'],
            ownedPropIds: [],
          },
        }}
        port={{
          onExportBackupJson: vi.fn(),
          onToggleOwnedEquipment: vi.fn(),
          onToggleOwnedProp: vi.fn(),
        }}
      />,
    );

    expect(realEntryContainer.textContent ?? '').not.toMatch(forbiddenDevTerms);
    unmountRealEntry();

    const recorder = createMockSettingsActionRecorder();
    for (const preset of SETTINGS_PAGE_FIXTURE_PRESETS) {
      const { container, unmount } = render(
        <PilatesSettingsPage
          snapshot={cloneSettingsSnapshotInput(preset.snapshot)}
          port={recorder.port}
        />,
      );
      expect(container.textContent ?? '').not.toMatch(forbiddenDevTerms);
      unmount();
    }
  });

  it('5. [실제 진입 재방문 일관성 및 원본 보호] Preserves connected equipment/prop/tab changes across modal close/reopen while keeping unconnected controls disabled and mutating 0 storage keys', () => {
    const restoreSpy = vi.spyOn(usePilatesStore.getState(), 'restoreBackup');
    const onExportBackupJson = vi.fn();
    const onToggleOwnedEquipment = vi.fn();
    const onToggleOwnedProp = vi.fn();

    const { unmount } = render(
      <PilatesSettingsPage
        snapshot={{
          data: {
            savedSequenceCount: 4,
            exerciseCount: 98,
            historyLogCount: 6,
            ownedEquipmentIds: ['reformer', 'mat'],
            ownedPropIds: ['mini-ball'],
          },
        }}
        port={{
          onExportBackupJson,
          onToggleOwnedEquipment,
          onToggleOwnedProp,
        }}
      />,
    );

    fireEvent.click(screen.getByTestId('settings-nav-chip-data'));
    fireEvent.click(screen.getByTestId('settings-equipment-check-chair'));
    fireEvent.click(screen.getByTestId('settings-prop-check-foam-roller'));
    fireEvent.click(screen.getByTestId('settings-data-export-btn'));

    unmount();

    render(
      <PilatesSettingsPage
        snapshot={{
          data: {
            savedSequenceCount: 4,
            exerciseCount: 98,
            historyLogCount: 6,
            ownedEquipmentIds: ['reformer', 'mat'],
            ownedPropIds: ['mini-ball'],
          },
        }}
        port={{
          onExportBackupJson,
          onToggleOwnedEquipment,
          onToggleOwnedProp,
        }}
      />,
    );

    expect(screen.getByTestId('settings-nav-chip-data').getAttribute('aria-pressed')).toBe('true');
    expect(
      (screen.getByTestId('settings-equipment-check-chair') as HTMLInputElement).checked,
    ).toBe(true);
    expect(
      (screen.getByTestId('settings-prop-check-foam-roller') as HTMLInputElement).checked,
    ).toBe(true);
    expect(
      (screen.getByTestId('settings-voice-enable-toggle') as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByTestId('settings-data-import-btn') as HTMLButtonElement).disabled,
    ).toBe(true);

    expect(restoreSpy).not.toHaveBeenCalled();
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    restoreSpy.mockRestore();
  });
});
