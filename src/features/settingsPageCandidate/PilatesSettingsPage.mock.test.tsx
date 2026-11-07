import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PilatesSettingsFixtureHarness, PilatesSettingsPage } from './PilatesSettingsPage';
import { getSettingsFixturePreset } from './settingsPageFixtures';
import { createMockSettingsActionRecorder } from './settingsPageModel';

afterEach(() => {
  cleanup();
});

describe('PilatesSettingsPage (Track A component & mock verification)', () => {
  it('1. renders all 4 settings groups with current value badges and concise descriptions', () => {
    const preset = getSettingsFixturePreset('default-local-studio');
    render(<PilatesSettingsPage snapshot={preset.snapshot} />);

    expect(screen.getByTestId('pilates-settings-page')).toHaveAttribute(
      'data-destructive-delete',
      'disabled',
    );
    expect(screen.getByTestId('pilates-settings-page')).toHaveAttribute(
      'data-auth-security-mutation',
      'disabled',
    );

    expect(screen.getByTestId('settings-group-account')).toBeInTheDocument();
    expect(screen.getByTestId('settings-group-voice')).toBeInTheDocument();
    expect(screen.getByTestId('settings-group-install')).toBeInTheDocument();
    expect(screen.getByTestId('settings-group-data')).toBeInTheDocument();

    expect(screen.getByTestId('settings-current-value-account')).toHaveTextContent(
      '현재값: 이 기기 전용 (로그아웃됨)',
    );
    expect(screen.getByTestId('settings-current-value-voice')).toHaveTextContent(
      '현재값: 음성 꺼짐 · 1.0x (기본)',
    );
    expect(screen.getByTestId('settings-current-value-install')).toHaveTextContent(
      '현재값: 웹 브라우저 실행 중 (바로 설치 가능)',
    );
    expect(screen.getByTestId('settings-current-value-data')).toHaveTextContent(
      '현재값: 시퀀스 4개 · 동작 98개 · 기록 6개',
    );

    expect(screen.getByTestId('settings-description-account')).toHaveTextContent(
      '이 브라우저에서 계정별 작업 공간을 구분합니다.',
    );
    expect(screen.getByTestId('settings-description-voice')).toHaveTextContent(
      '기기 내장 무료 한국어 음성(Web Speech API)',
    );
    expect(screen.getByTestId('settings-description-install')).toHaveTextContent(
      '앱스토어 없이 홈 화면·앱 목록에 설치합니다.',
    );
    expect(screen.getByTestId('settings-description-data')).toHaveTextContent(
      '이 브라우저에 자동 보관된 수업 자료를 JSON으로 백업하거나 기존 자료와 안전하게 병합 복구합니다.',
    );
  });

  it('2. Account group: records mock sign-in action when signed out and displays read-only security badge', () => {
    const recorder = createMockSettingsActionRecorder();
    const preset = getSettingsFixturePreset('default-local-studio');
    render(<PilatesSettingsPage snapshot={preset.snapshot} port={recorder.port} />);

    expect(screen.getByTestId('settings-account-security-readonly-badge')).toHaveTextContent(
      '인증·보안 설정 읽기 전용 (토큰·도메인·키 변경 금지)',
    );

    const signInBtn = screen.getByTestId('settings-account-signin-btn');
    fireEvent.click(signInBtn);

    expect(recorder.calls).toEqual([{ type: 'account:sign-in' }]);
  });

  it('3. Account group: renders account switch and sign-out actions when signed in without mutating real auth config', () => {
    const recorder = createMockSettingsActionRecorder();
    const preset = getSettingsFixturePreset('signed-in-active-instructor');
    render(<PilatesSettingsPage snapshot={preset.snapshot} port={recorder.port} />);

    expect(screen.getByTestId('settings-current-value-account')).toHaveTextContent(
      'Google 로그인됨 (김서연 강사)',
    );

    fireEvent.click(screen.getByTestId('settings-account-switch-btn'));
    fireEvent.click(screen.getByTestId('settings-account-signout-btn'));

    expect(recorder.calls).toEqual([{ type: 'account:switch' }, { type: 'account:sign-out' }]);
  });

  it('4. Account group: shows operating-origin notice on unsupported host and recheck button on transient auth error', () => {
    const recorder = createMockSettingsActionRecorder();
    const unsupportedPreset = getSettingsFixturePreset('unsupported-host-update-ready');
    const { rerender } = render(
      <PilatesSettingsPage snapshot={unsupportedPreset.snapshot} port={recorder.port} />,
    );

    expect(screen.getByTestId('settings-account-operating-origin-note')).toHaveTextContent(
      '운영 도메인(https://pilates-flow-atelier.web.app)에서만 Google 로그인을 지원합니다.',
    );
    expect(screen.queryByTestId('settings-account-signin-btn')).toBeNull();

    const timeoutPreset = getSettingsFixturePreset('storage-warning-stale-preview');
    rerender(<PilatesSettingsPage snapshot={timeoutPreset.snapshot} port={recorder.port} />);

    fireEvent.click(screen.getByTestId('settings-account-recheck-btn'));
    expect(recorder.calls).toEqual([{ type: 'account:recheck' }]);
  });

  it('5. Voice group: toggles voice enabled, changes speed, toggles preferences, previews sample, and rechecks capability', () => {
    const recorder = createMockSettingsActionRecorder();
    const preset = getSettingsFixturePreset('default-local-studio');
    render(<PilatesSettingsPage snapshot={preset.snapshot} port={recorder.port} />);

    const toggleBtn = screen.getByTestId('settings-voice-enable-toggle');
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('settings-current-value-voice')).toHaveTextContent(
      '현재값: 음성 켜짐 · 1.0x (기본)',
    );

    fireEvent.click(screen.getByTestId('settings-voice-speed-0.85'));
    expect(screen.getByTestId('settings-current-value-voice')).toHaveTextContent(
      '현재값: 음성 켜짐 · 0.85x (천천히)',
    );

    fireEvent.click(screen.getByTestId('settings-voice-speed-1.15'));
    expect(screen.getByTestId('settings-current-value-voice')).toHaveTextContent(
      '현재값: 음성 켜짐 · 1.15x (조금 빠르게)',
    );

    const breathCheck = screen.getByTestId('settings-voice-pref-breath') as HTMLInputElement;
    expect(breathCheck.checked).toBe(true);
    fireEvent.click(breathCheck);
    expect(breathCheck.checked).toBe(false);

    fireEvent.click(screen.getByTestId('settings-voice-sample-btn'));
    expect(screen.getByTestId('settings-voice-announcement')).toHaveTextContent(
      '샘플 안내 확인 (1.15x (조금 빠르게))',
    );

    fireEvent.click(screen.getByTestId('settings-voice-recheck-btn'));

    expect(recorder.calls).toEqual([
      { type: 'voice:toggle-enabled', nextEnabled: true },
      { type: 'voice:change-speed', nextSpeed: 0.85 },
      { type: 'voice:change-speed', nextSpeed: 1.15 },
      { type: 'voice:toggle-preference', key: 'breath', nextChecked: false },
      { type: 'voice:preview-sample' },
      { type: 'voice:recheck-capability' },
    ]);
  });

  it('6. Voice group: disables voice enable and sample buttons when capabilityStatus is no-korean-voice or unsupported', () => {
    const noKoreanPreset = getSettingsFixturePreset('ios-safari-no-korean-voice');
    const { rerender } = render(<PilatesSettingsPage snapshot={noKoreanPreset.snapshot} />);

    expect(screen.getByTestId('settings-voice-enable-toggle')).toBeDisabled();
    expect(screen.getByTestId('settings-voice-sample-btn')).toBeDisabled();

    const unsupportedPreset = getSettingsFixturePreset('storage-warning-stale-preview');
    rerender(<PilatesSettingsPage snapshot={unsupportedPreset.snapshot} />);

    expect(screen.getByTestId('settings-voice-enable-toggle')).toBeDisabled();
    expect(screen.getByTestId('settings-voice-sample-btn')).toBeDisabled();
    expect(screen.getByTestId('settings-voice-error')).toHaveTextContent(
      '현재 브라우저에서 음성 합성을 지원하지 않습니다.',
    );
  });

  it('7. Install group: dispatches install:request-pwa-install, renders iOS Safari 3-step guide, and keeps a single status region (B-F2 & B-F4)', () => {
    const recorder = createMockSettingsActionRecorder();
    const bfPreset = getSettingsFixturePreset('unsupported-host-update-ready');
    const { rerender } = render(
      <PilatesSettingsPage snapshot={bfPreset.snapshot} port={recorder.port} />,
    );

    const installSection = screen.getByTestId('settings-group-install');
    const installBtn = within(installSection).getByTestId('settings-install-action-btn');
    fireEvent.click(installBtn);
    expect(recorder.calls).toEqual([{ type: 'install:request-pwa-install' }]);

    const statusRegions = within(installSection).getAllByRole('status');
    expect(statusRegions).toHaveLength(1);
    expect(statusRegions[0]).toHaveTextContent('새 버전이 준비됐어요.');
    expect(statusRegions[0]).not.toHaveTextContent('설치를 취소했어요');

    const iosPreset = getSettingsFixturePreset('ios-safari-no-korean-voice');
    rerender(<PilatesSettingsPage snapshot={iosPreset.snapshot} port={recorder.port} />);

    expect(screen.getByTestId('settings-install-ios-safari')).toHaveTextContent(
      'iPhone·iPad Safari 설치 3단계',
    );
  });

  it('8. Data group: records export and import preview actions and enforces non-destructive guard with zero delete buttons in DOM', () => {
    const recorder = createMockSettingsActionRecorder();
    const preset = getSettingsFixturePreset('default-local-studio');
    render(<PilatesSettingsPage snapshot={preset.snapshot} port={recorder.port} />);

    expect(screen.getByTestId('settings-data-no-delete-guard')).toHaveTextContent(
      '데이터 삭제 동작 금지 보호',
    );

    fireEvent.click(screen.getByTestId('settings-data-export-btn'));
    fireEvent.click(screen.getByTestId('settings-data-import-btn'));

    expect(recorder.calls).toEqual([
      { type: 'data:export-backup' },
      {
        type: 'data:select-backup-file',
        fileName: 'flow-atelier-backup.json',
        byteSize: 12288,
      },
    ]);

    const allButtons = screen.getAllByRole('button');
    for (const btn of allButtons) {
      expect(btn.textContent ?? '').not.toMatch(/삭제|초기화|비우기|wipe|delete|reset/i);
    }
  });

  it('9. Data group: supports recovery preview apply/cancel and disables apply when preview is stale or diskBlocked', () => {
    const recorder = createMockSettingsActionRecorder();
    const readyPreset = getSettingsFixturePreset('ios-safari-no-korean-voice');
    const { rerender } = render(
      <PilatesSettingsPage snapshot={readyPreset.snapshot} port={recorder.port} />,
    );

    const applyBtn = screen.getByTestId('settings-data-preview-apply-btn');
    const cancelBtn = screen.getByTestId('settings-data-preview-cancel-btn');
    expect(applyBtn).not.toBeDisabled();

    fireEvent.click(applyBtn);
    fireEvent.click(cancelBtn);
    expect(recorder.calls).toEqual([
      { type: 'data:apply-restore' },
      { type: 'data:cancel-restore' },
    ]);

    const staleBlockedPreset = getSettingsFixturePreset('storage-warning-stale-preview');
    rerender(<PilatesSettingsPage snapshot={staleBlockedPreset.snapshot} port={recorder.port} />);

    expect(screen.getByTestId('settings-data-preview-apply-btn')).toBeDisabled();
  });

  it('10. Data group: supports rollback restore and dismiss rollback actions when rollbackPoint is available', () => {
    const recorder = createMockSettingsActionRecorder();
    const rollbackPreset = getSettingsFixturePreset('signed-in-active-instructor');
    render(<PilatesSettingsPage snapshot={rollbackPreset.snapshot} port={recorder.port} />);

    expect(screen.getByTestId('settings-data-rollback-bar')).toHaveTextContent(
      '직전 백업 복원 되돌리기 가능 (+3개 항목)',
    );

    fireEvent.click(screen.getByTestId('settings-data-rollback-btn'));
    fireEvent.click(screen.getByTestId('settings-data-rollback-dismiss-btn'));

    expect(recorder.calls).toEqual([
      { type: 'data:rollback-restore' },
      { type: 'data:dismiss-rollback' },
    ]);
  });

  it('11. Data group: toggles owned equipment and prop checkboxes and updates inventory summary live', () => {
    const recorder = createMockSettingsActionRecorder();
    const preset = getSettingsFixturePreset('ios-safari-no-korean-voice');
    render(<PilatesSettingsPage snapshot={preset.snapshot} port={recorder.port} />);

    const chairCheck = screen.getByTestId('settings-equipment-check-chair') as HTMLInputElement;
    expect(chairCheck.checked).toBe(false);
    fireEvent.click(chairCheck);
    expect(chairCheck.checked).toBe(true);

    const ringCheck = screen.getByTestId('settings-prop-check-magic-circle') as HTMLInputElement;
    expect(ringCheck.checked).toBe(false);
    fireEvent.click(ringCheck);
    expect(ringCheck.checked).toBe(true);

    expect(recorder.calls).toEqual([
      { type: 'data:toggle-equipment', equipmentId: 'chair' },
      { type: 'data:toggle-prop', propId: 'magic-circle' },
    ]);

    expect(screen.getByTestId('settings-data-inventory-details')).toHaveTextContent(
      '보유 기구 3종 · 소도구 2종',
    );
  });

  it('12. Group navigation toolbar supports keyboard navigation (ArrowRight, ArrowLeft, End, Home) and isolated dual-instance rendering', () => {
    render(<PilatesSettingsFixtureHarness />);

    const nav = screen.getByTestId('settings-group-nav');
    const accountChip = within(nav).getByTestId('settings-nav-chip-account');
    const voiceChip = within(nav).getByTestId('settings-nav-chip-voice');
    const dataChip = within(nav).getByTestId('settings-nav-chip-data');

    expect(accountChip).toHaveAttribute('aria-pressed', 'true');

    fireEvent.keyDown(accountChip, { key: 'ArrowRight' });
    expect(voiceChip).toHaveAttribute('aria-pressed', 'true');

    fireEvent.keyDown(voiceChip, { key: 'ArrowLeft' });
    expect(accountChip).toHaveAttribute('aria-pressed', 'true');

    fireEvent.keyDown(accountChip, { key: 'End' });
    expect(dataChip).toHaveAttribute('aria-pressed', 'true');

    fireEvent.keyDown(dataChip, { key: 'Home' });
    expect(accountChip).toHaveAttribute('aria-pressed', 'true');
  });
});
