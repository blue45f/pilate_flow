// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { usePilatesStore } from '../../../store/usePilatesStore';
import { PilatesSettingsPage } from '../PilatesSettingsPage';
import {
  SETTINGS_PAGE_FIXTURE_PRESETS,
  cloneSettingsSnapshotInput,
  getSettingsFixturePreset,
} from '../settingsPageFixtures';
import {
  createMockSettingsActionRecorder,
  resolveSettingsPageViewModel,
  sanitizeSettingsText,
} from '../settingsPageModel';
import { SETTINGS_PAGE_SAFETY_CONTRACT } from '../types';

describe('Track B Independent Boundary, Security & Isolation Verification (parallel-page-settings-20261107)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('1. handles null, undefined, primitives, circular references, and throwing getters without crashing', () => {
    const primitives: unknown[] = [null, undefined, 0, -1, Number.NaN, 'raw-string', true, false, []];
    for (const input of primitives) {
      const vm = resolveSettingsPageViewModel(input);
      expect(vm.groups).toHaveLength(4);
      expect(vm.safety.canDeleteUserData).toBe(false);
      expect(vm.safety.canMutateAuthOrSecurityConfig).toBe(false);
      expect(vm.safety.hasDestructiveDeleteAction).toBe(false);
      expect(Object.isFrozen(vm)).toBe(true);
    }

    const circular: Record<string, unknown> = {
      preferReducedMotion: true,
    };
    circular.self = circular;
    circular.account = circular;
    circular.voice = circular;
    circular.install = circular;
    circular.data = circular;

    const hostileGetters: Record<string, unknown> = {};
    Object.defineProperty(hostileGetters, 'account', {
      enumerable: true,
      get() {
        throw new Error('boom account getter');
      },
    });
    Object.defineProperty(hostileGetters, 'data', {
      enumerable: true,
      get() {
        throw new Error('boom data getter');
      },
    });

    expect(() => resolveSettingsPageViewModel(circular)).not.toThrow();
    expect(() => resolveSettingsPageViewModel(hostileGetters)).not.toThrow();

    const { unmount } = render(<PilatesSettingsPage snapshot={circular} />);
    expect(screen.getByTestId('pilates-settings-page')).toBeTruthy();
    unmount();
  });

  it('2. blocks Object.prototype pollution keys (__proto__, constructor, prototype) and non-plain objects', () => {
    const protoPolluted = JSON.parse(
      '{"__proto__":{"polluted":true,"phase":"signed-in"},"account":{"__proto__":{"phase":"signed-in"},"constructor":{"name":"Evil"}},"data":{"savedSequenceCount":10,"ownedEquipmentIds":["reformer","__proto__","constructor"]}}',
    );
    const vm = resolveSettingsPageViewModel(protoPolluted);

    expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
    expect(vm.account.phase).toBe('signed-out');
    expect(vm.account.user).toBeNull();
    expect(vm.data.equipmentOptions.some((opt) => opt.id === '__proto__')).toBe(false);
    expect(vm.data.equipmentOptions.some((opt) => opt.id === 'constructor')).toBe(false);

    class CustomClass {
      phase = 'signed-in';
      user = { uid: 'u1', displayName: 'Injected', email: 'injected@example.com' };
    }
    const classInstanceVm = resolveSettingsPageViewModel({
      account: new CustomClass() as unknown as Record<string, unknown>,
    });
    expect(classInstanceVm.account.phase).toBe('signed-out');
    expect(classInstanceVm.account.user).toBeNull();
  });

  it('3. clamps negative, NaN, Infinity, and oversized counts to [0, 100000]', () => {
    const vm = resolveSettingsPageViewModel({
      data: {
        savedSequenceCount: -999,
        exerciseCount: Number.NaN,
        historyLogCount: Number.POSITIVE_INFINITY,
        recoveryStage: 'preview-ready',
        recoveryPreview: {
          sourceLabel: 'adversarial.json',
          bytes: 999_999_999,
          newItems: -42,
          conflicts: Number.NEGATIVE_INFINITY,
          restoredExamples: 123_456.78,
          changed: true,
          stale: false,
          diskBlocked: false,
        },
      },
    });

    expect(vm.data.savedSequenceCount).toBe(0);
    expect(vm.data.exerciseCount).toBe(98);
    expect(vm.data.historyLogCount).toBe(0);
    expect(vm.data.recoveryPreview?.bytes).toBe(100_000);
    expect(vm.data.recoveryPreview?.newItems).toBe(0);
    expect(vm.data.recoveryPreview?.conflicts).toBe(0);
    expect(vm.data.recoveryPreview?.restoredExamples).toBe(100_000);
  });

  it('4. redacts secrets (AIza, Bearer, JWT, ghp_, api_key) across account, voice, backup, and recovery preview fields and all 6 presets', () => {
    const rawGoogleKey = 'AIzaSyD9876543210abcdefghijklmnopqrstuv';
    const rawBearer = 'Bearer secret_live_token_9876543210abcdefghij';
    const rawJwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsIm5hbWUiOiJ0ZXN0In0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const rawGhToken = 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const rawApiKeyAssign = 'api_key="superSecretValue123456789"';

    const secretSnapshot = {
      account: {
        phase: 'unavailable' as const,
        operation: null,
        user: null,
        error: {
          code: `code-${rawGoogleKey}`,
          message: `Account failure with ${rawGoogleKey} and ${rawBearer}`,
        },
        notice: `Notice with ${rawJwt}`,
      },
      voice: {
        capabilityStatus: 'unsupported' as const,
        voiceName: `Voice ${rawGhToken}`,
        voiceLang: 'ko-KR',
        localService: false,
        enabled: false,
        speed: 1 as const,
        preferences: { movement: true, breath: true, time: true },
        error: `Voice error ${rawJwt} and ${rawApiKeyAssign}`,
      },
      data: {
        savedSequenceCount: 3,
        exerciseCount: 98,
        historyLogCount: 2,
        ownedEquipmentIds: ['reformer'],
        ownedPropIds: [],
        persistenceError: `Persistence error ${rawBearer}`,
        backupMessage: `Backup msg ${rawGhToken}`,
        recoveryStage: 'preview-ready' as const,
        recoveryPreview: {
          sourceLabel: `file-${rawGoogleKey}.json`,
          bytes: 4096,
          newItems: 1,
          conflicts: 0,
          restoredExamples: 0,
          changed: true,
          stale: false,
          diskBlocked: true,
          errorMessage: `Preview error ${rawApiKeyAssign}`,
        },
        rollbackPoint: null,
      },
    };

    const vm = resolveSettingsPageViewModel(secretSnapshot);
    expect(vm.safety.redactionApplied).toBe(true);

    const { container, unmount } = render(<PilatesSettingsPage snapshot={secretSnapshot} />);
    const fullText = container.textContent ?? '';
    expect(fullText).not.toContain(rawGoogleKey);
    expect(fullText).not.toContain('secret_live_token_9876543210abcdefghij');
    expect(fullText).not.toContain(rawJwt);
    expect(fullText).not.toContain(rawGhToken);
    expect(fullText).not.toContain('superSecretValue123456789');
    expect(fullText).toContain('[민감정보 보호됨]');
    unmount();

    // Verify all 6 presets never leak raw secrets in the rendered DOM
    for (const preset of SETTINGS_PAGE_FIXTURE_PRESETS) {
      const rendered = render(
        <PilatesSettingsPage snapshot={cloneSettingsSnapshotInput(preset.snapshot)} />,
      );
      const text = rendered.container.textContent ?? '';
      expect(text).not.toMatch(/AIza[0-9A-Za-z_-]{20,}/);
      expect(text).not.toMatch(/Bearer\s+[A-Za-z0-9._~+/-]{10,}/i);
      expect(text).not.toMatch(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/);
      expect(text).not.toMatch(/gh[pousr]_[A-Za-z0-9_]{20,}/);
      rendered.unmount();
    }
  });

  it('5. sanitizes dangerous operatingOrigin schemes (javascript:, data:, file:) to default HTTPS origin', () => {
    for (const badOrigin of [
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'file:///etc/passwd',
      'not-a-valid-url',
      'https://pilates-flow-atelier.web.app/custom/path?token=AIzaSyDummySecretKeyForRedactionTest12345#frag',
    ]) {
      const vm = resolveSettingsPageViewModel({
        account: {
          phase: 'unavailable',
          error: { code: 'auth/unsupported-host', message: '운영 도메인 외' },
          operatingOrigin: badOrigin,
        },
      });
      expect(vm.account.operatingOrigin).toBe('https://pilates-flow-atelier.web.app');
    }
  });

  it('6. mutates 0 keys in localStorage, sessionStorage, and usePilatesStore across all presets and interactive controls', () => {
    const initialStoreSnapshot = JSON.stringify({
      savedSequences: usePilatesStore.getState().savedSequences.length,
      exercises: usePilatesStore.getState().exercises.length,
      historyLogs: usePilatesStore.getState().historyLogs.length,
      ownedEquipment: usePilatesStore.getState().ownedEquipment,
      ownedProps: usePilatesStore.getState().ownedProps,
    });

    const recorder = createMockSettingsActionRecorder();

    for (const preset of SETTINGS_PAGE_FIXTURE_PRESETS) {
      const { container, unmount } = render(
        <PilatesSettingsPage
          snapshot={cloneSettingsSnapshotInput(preset.snapshot)}
          port={recorder.port}
        />,
      );

      const buttons = Array.from(container.querySelectorAll('button'));
      for (const btn of buttons) {
        if (!btn.disabled) {
          fireEvent.click(btn);
        }
      }

      const checkboxes = Array.from(
        container.querySelectorAll('input[type="checkbox"]'),
      ) as HTMLInputElement[];
      for (const checkbox of checkboxes) {
        if (!checkbox.disabled) {
          fireEvent.click(checkbox);
        }
      }

      unmount();
    }

    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);

    const afterStoreSnapshot = JSON.stringify({
      savedSequences: usePilatesStore.getState().savedSequences.length,
      exercises: usePilatesStore.getState().exercises.length,
      historyLogs: usePilatesStore.getState().historyLogs.length,
      ownedEquipment: usePilatesStore.getState().ownedEquipment,
      ownedProps: usePilatesStore.getState().ownedProps,
    });
    expect(afterStoreSnapshot).toBe(initialStoreSnapshot);
    expect(recorder.calls.length).toBeGreaterThan(0);
  });

  it('7. exposes zero destructive delete or security-config mutation controls across all 6 presets', () => {
    expect(SETTINGS_PAGE_SAFETY_CONTRACT.canDeleteUserData).toBe(false);
    expect(SETTINGS_PAGE_SAFETY_CONTRACT.hasDestructiveDeleteAction).toBe(false);
    expect(SETTINGS_PAGE_SAFETY_CONTRACT.canMutateAuthOrSecurityConfig).toBe(false);

    for (const preset of SETTINGS_PAGE_FIXTURE_PRESETS) {
      const { unmount } = render(
        <PilatesSettingsPage snapshot={cloneSettingsSnapshotInput(preset.snapshot)} />,
      );

      const root = screen.getByTestId('pilates-settings-page');
      expect(root.getAttribute('data-destructive-delete')).toBe('disabled');
      expect(root.getAttribute('data-auth-security-mutation')).toBe('disabled');

      const forbiddenButton = screen.queryByRole('button', {
        name: /삭제|초기화|비우기|파기|토큰 변경|키 변경|도메인 변경/,
      });
      expect(forbiddenButton).toBeNull();

      expect(screen.getByTestId('settings-data-no-delete-guard')).toBeTruthy();
      expect(screen.getByTestId('settings-account-security-readonly-badge')).toBeTruthy();
      unmount();
    }
  });

  it('8. guarantees 100% unique [id] attributes and independent state when two instances render simultaneously', () => {
    const presetA = getSettingsFixturePreset('default-local-studio');
    const presetB = getSettingsFixturePreset('signed-in-active-instructor');
    const recorderA = createMockSettingsActionRecorder();
    const recorderB = createMockSettingsActionRecorder();

    const { container } = render(
      <div>
        <div data-testid="instance-a">
          <PilatesSettingsPage
            snapshot={cloneSettingsSnapshotInput(presetA.snapshot)}
            port={recorderA.port}
          />
        </div>
        <div data-testid="instance-b">
          <PilatesSettingsPage
            snapshot={cloneSettingsSnapshotInput(presetB.snapshot)}
            port={recorderB.port}
          />
        </div>
      </div>,
    );

    const allElementsWithId = Array.from(container.querySelectorAll('[id]'));
    const ids = allElementsWithId.map((el) => el.id);
    expect(ids.length).toBeGreaterThanOrEqual(18);
    expect(new Set(ids).size).toBe(ids.length);

    const scopeA = within(screen.getByTestId('instance-a'));
    const scopeB = within(screen.getByTestId('instance-b'));

    expect(
      scopeA.getByTestId('settings-voice-speed-1').getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      scopeB.getByTestId('settings-voice-speed-1.15').getAttribute('aria-pressed'),
    ).toBe('true');

    // Change speed in instance A to 0.85x; instance B must remain 1.15x
    fireEvent.click(scopeA.getByTestId('settings-voice-speed-0.85'));
    expect(
      scopeA.getByTestId('settings-voice-speed-0.85').getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      scopeB.getByTestId('settings-voice-speed-1.15').getAttribute('aria-pressed'),
    ).toBe('true');
  });

  it('9. renders a single combined role="status" in the Install group when installStatus and offlineStatus="update-ready" are both active', () => {
    const unsupportedPreset = getSettingsFixturePreset('unsupported-host-update-ready');
    const { unmount } = render(
      <PilatesSettingsPage snapshot={cloneSettingsSnapshotInput(unsupportedPreset.snapshot)} />,
    );

    const installSection = screen.getByTestId('settings-group-install');
    const statusesInPreset = within(installSection).queryAllByRole('status');
    expect(statusesInPreset).toHaveLength(1);
    expect(statusesInPreset[0].textContent).toContain('새 버전이 준비됐어요');
    // B-F2: canInstall=true + installStatus='dismissed' normalizes to idle and shows install button
    expect(within(installSection).getByTestId('settings-install-action-btn')).toBeTruthy();
    unmount();

    // Also verify when installStatus='prompting' and offlineStatus='update-ready' simultaneously
    const bothActiveRender = render(
      <PilatesSettingsPage
        snapshot={{
          install: {
            standalone: false,
            installed: false,
            platform: 'browser',
            canInstall: true,
            installStatus: 'prompting',
            offlineStatus: 'update-ready',
          },
        }}
      />,
    );
    const installSection2 = bothActiveRender.getByTestId('settings-group-install');
    const statusesBoth = within(installSection2).queryAllByRole('status');
    expect(statusesBoth).toHaveLength(1);
    expect(statusesBoth[0].textContent).toContain('브라우저의 설치 창에서 선택해 주세요.');
    expect(statusesBoth[0].textContent).toContain('새 버전이 준비됐어요.');
    bothActiveRender.unmount();
  });

  it('10. enforces voice capability boundaries (no-korean-voice / unsupported cannot enable voice toggle)', () => {
    for (const status of ['no-korean-voice', 'unsupported'] as const) {
      const { unmount } = render(
        <PilatesSettingsPage
          snapshot={{
            voice: {
              capabilityStatus: status,
              localService: true,
              enabled: true,
            },
          }}
        />,
      );
      const toggleBtn = screen.getByTestId('settings-voice-enable-toggle') as HTMLButtonElement;
      const sampleBtn = screen.getByTestId('settings-voice-sample-btn') as HTMLButtonElement;
      expect(toggleBtn.disabled).toBe(true);
      expect(toggleBtn.getAttribute('aria-pressed')).toBe('false');
      expect(sampleBtn.disabled).toBe(true);
      unmount();
    }
  });

  it('11. disables restore apply button when recoveryPreview is stale or diskBlocked', () => {
    const warningPreset = getSettingsFixturePreset('storage-warning-stale-preview');
    const recorder = createMockSettingsActionRecorder();
    render(
      <PilatesSettingsPage
        snapshot={cloneSettingsSnapshotInput(warningPreset.snapshot)}
        port={recorder.port}
      />,
    );

    const applyBtn = screen.getByTestId('settings-data-preview-apply-btn') as HTMLButtonElement;
    const cancelBtn = screen.getByTestId('settings-data-preview-cancel-btn') as HTMLButtonElement;
    expect(applyBtn.disabled).toBe(true);
    expect(cancelBtn.disabled).toBe(false);
  });

  it('12. supports keyboard navigation (ArrowRight, ArrowLeft, End, Home) on group nav chips, data-reduced-motion attribute, and sanitizes action recorder inputs', () => {
    const { rerender } = render(<PilatesSettingsPage preferReducedMotion={true} />);
    expect(screen.getByTestId('pilates-settings-page').getAttribute('data-reduced-motion')).toBe(
      'true',
    );

    rerender(<PilatesSettingsPage snapshot={{ preferReducedMotion: true }} />);
    expect(screen.getByTestId('pilates-settings-page').getAttribute('data-reduced-motion')).toBe(
      'true',
    );

    const accountChip = screen.getByTestId('settings-nav-chip-account');
    const voiceChip = screen.getByTestId('settings-nav-chip-voice');
    const dataChip = screen.getByTestId('settings-nav-chip-data');

    accountChip.focus();
    fireEvent.keyDown(accountChip, { key: 'ArrowRight' });
    expect(voiceChip.getAttribute('aria-pressed')).toBe('true');
    expect(document.activeElement).toBe(voiceChip);

    fireEvent.keyDown(voiceChip, { key: 'End' });
    expect(dataChip.getAttribute('aria-pressed')).toBe('true');
    expect(document.activeElement).toBe(dataChip);

    fireEvent.keyDown(dataChip, { key: 'Home' });
    expect(accountChip.getAttribute('aria-pressed')).toBe('true');
    expect(document.activeElement).toBe(accountChip);

    // Action recorder boundary checks
    const recorder = createMockSettingsActionRecorder();
    recorder.port.onChangeVoiceSpeed?.(99 as unknown as 1);
    recorder.port.onSelectBackupFile?.(
      'backup-AIzaSyDummySecretKeyForRedactionTest12345.json',
      -500,
    );
    expect(recorder.calls).toEqual([
      { type: 'voice:change-speed', nextSpeed: 1 },
      {
        type: 'data:select-backup-file',
        fileName: 'backup-[민감정보 보호됨].json',
        byteSize: 0,
      },
    ]);
    expect(sanitizeSettingsText(12345, 'fallback').text).toBe('fallback');
  });
});
