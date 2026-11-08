import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  INSTALL_FLOW_FIXTURES,
  TRACK_B_AUDIT_DISCLOSURE,
  applyMockBrowserProfile,
  createMockBeforeInstallPromptEvent,
  type MockBrowserProfile,
} from './install-flow-fixtures';

interface TrackedWindowListener {
  type: string;
  listener: EventListenerOrEventListenerObject;
  options?: boolean | AddEventListenerOptions;
}

const trackedWindowListeners: TrackedWindowListener[] = [];
const originalWindowAddEventListener = window.addEventListener.bind(window);
const originalWindowRemoveEventListener = window.removeEventListener.bind(window);

async function loadFreshPwaSuite() {
  vi.resetModules();
  const pwaModule = await import('../../../src/lib/pwa');
  const panelModule = await import('../../../src/components/PwaInstallPanel');
  return {
    startPwa: pwaModule.startPwa,
    getPwaState: pwaModule.getPwaState,
    requestPwaInstall: pwaModule.requestPwaInstall,
    PwaInstallPanel: panelModule.PwaInstallPanel,
  };
}

function getFixture(category: keyof typeof INSTALL_FLOW_FIXTURES, id: string): MockBrowserProfile {
  const found = INSTALL_FLOW_FIXTURES[category].find((item) => item.id === id);
  if (!found) {
    throw new Error(`Missing fixture ${category}/${id}`);
  }
  return found;
}

beforeEach(() => {
  trackedWindowListeners.length = 0;
  window.addEventListener = ((
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ) => {
    trackedWindowListeners.push({ type, listener, options });
    return originalWindowAddEventListener(type, listener, options);
  }) as typeof window.addEventListener;
});

afterEach(() => {
  cleanup();
  for (const item of trackedWindowListeners) {
    originalWindowRemoveEventListener(item.type, item.listener, item.options);
  }
  trackedWindowListeners.length = 0;
  window.addEventListener = originalWindowAddEventListener;
  vi.restoreAllMocks();
});

describe('Track B — PWA Install Flow Mock Audit Suite (realSafariExecuted: false)', () => {
  it('declares honesty disclosure metadata explicitly (realSafariExecuted: false)', () => {
    expect(TRACK_B_AUDIT_DISCLOSURE.realSafariExecuted).toBe(false);
    expect(TRACK_B_AUDIT_DISCLOSURE.realIosDeviceExecuted).toBe(false);
    expect(TRACK_B_AUDIT_DISCLOSURE.realAndroidDeviceExecuted).toBe(false);
  });

  describe('Test Group 1: iOS Safari & iPadOS Install Guide Mock Tests (Emulated UA/Platform — NOT Real Safari)', () => {
    it('detects platform="ios-safari" on mocked iPhone Safari and renders 3-step install guide + storage separation warning without install button', async () => {
      const profile = getFixture('ios-safari-iphone', 'ios-safari-iphone-browser-tab');
      applyMockBrowserProfile(profile);
      const { startPwa, getPwaState, PwaInstallPanel } = await loadFreshPwaSuite();

      startPwa({ registerServiceWorker: false });
      expect(getPwaState()).toMatchObject({
        platform: 'ios-safari',
        standalone: false,
        installed: false,
        canInstall: false,
      });

      const { container } = render(<PwaInstallPanel />);

      const orderedSteps = container.querySelectorAll('ol > li');
      expect(orderedSteps).toHaveLength(3);
      expect(orderedSteps[0]?.textContent).toContain('공유');
      expect(orderedSteps[1]?.textContent).toContain('홈 화면에 추가');
      expect(orderedSteps[2]?.textContent).toContain('웹 앱으로 열기');
      expect(orderedSteps[2]?.textContent).toContain('추가');

      expect(
        screen.getByText(/Safari와 홈 화면 앱의 자료가 따로 보일 수 있으니/),
      ).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /이 기기에 설치/ })).not.toBeInTheDocument();
      expect(screen.queryByText('설치 버튼이 보이지 않나요?')).not.toBeInTheDocument();
    });

    it('detects platform="ios-safari" on mocked iPadOS desktop-class UA (MacIntel + maxTouchPoints=5) and renders 3-step guide', async () => {
      const profile = getFixture('ios-safari-ipad-desktop-ua', 'ios-safari-ipad-desktop-ua-tab');
      applyMockBrowserProfile(profile);
      const { startPwa, getPwaState, PwaInstallPanel } = await loadFreshPwaSuite();

      startPwa({ registerServiceWorker: false });
      expect(getPwaState().platform).toBe('ios-safari');

      const { container } = render(<PwaInstallPanel />);
      expect(container.querySelectorAll('ol > li')).toHaveLength(3);
      expect(screen.queryByRole('button', { name: /이 기기에 설치/ })).not.toBeInTheDocument();
    });

    it.each(INSTALL_FLOW_FIXTURES['ios-other-browsers'].map((f) => [f.id, f.label, f]))(
      'detects platform="ios-other" for %s (%s) and prompts user to open in Safari',
      async (_id, _label, profile) => {
        applyMockBrowserProfile(profile);
        const { startPwa, getPwaState, PwaInstallPanel } = await loadFreshPwaSuite();

        startPwa({ registerServiceWorker: false });
        expect(getPwaState().platform).toBe('ios-other');

        const { container } = render(<PwaInstallPanel />);
        expect(
          screen.getByText('이 주소를 Safari에서 연 다음 공유 → 홈 화면에 추가를 선택하세요.'),
        ).toBeInTheDocument();
        expect(container.querySelectorAll('ol > li')).toHaveLength(0);
        expect(screen.queryByRole('button', { name: /이 기기에 설치/ })).not.toBeInTheDocument();
      },
    );

    it('detects standalone mode via both iOS navigator.standalone === true and matchMedia("(display-mode: standalone)")', async () => {
      const iosStandaloneProfile = getFixture('ios-safari-iphone', 'ios-safari-iphone-standalone');
      applyMockBrowserProfile(iosStandaloneProfile);
      const suite1 = await loadFreshPwaSuite();

      suite1.startPwa({ registerServiceWorker: false });
      expect(suite1.getPwaState()).toMatchObject({
        standalone: true,
        installed: true,
        platform: 'ios-safari',
      });

      const { unmount } = render(<suite1.PwaInstallPanel />);
      expect(screen.getByRole('status')).toHaveTextContent('지금 앱으로 실행 중이에요.');
      expect(screen.queryByRole('button', { name: /이 기기에 설치/ })).not.toBeInTheDocument();
      unmount();

      // Also verify standard matchMedia('(display-mode: standalone)')
      const androidProfile = {
        ...getFixture('android-chrome', 'android-15-chrome-mobile'),
        displayModeStandalone: true,
      };
      applyMockBrowserProfile(androidProfile);
      const suite2 = await loadFreshPwaSuite();

      suite2.startPwa({ registerServiceWorker: false });
      expect(suite2.getPwaState()).toMatchObject({
        standalone: true,
        installed: true,
        platform: 'browser',
      });

      render(<suite2.PwaInstallPanel />);
      expect(screen.getByRole('status')).toHaveTextContent('지금 앱으로 실행 중이에요.');
    });
  });

  describe('Test Group 2: Android Install Prompt Branching & Single-Use Guard', () => {
    it('intercepts beforeinstallprompt (defaultPrevented=true) without auto-prompting, sets canInstall=true, collapses <details>, and exposes install button', async () => {
      const profile = getFixture('android-chrome', 'android-15-chrome-mobile');
      applyMockBrowserProfile(profile);
      const { startPwa, getPwaState, PwaInstallPanel } = await loadFreshPwaSuite();

      startPwa({ registerServiceWorker: false });
      const { container } = render(<PwaInstallPanel />);

      const fallbackDetails = container.querySelector('details:not(.pwa-install-notes)');
      expect(fallbackDetails).toHaveAttribute('open');

      const promptEvent = createMockBeforeInstallPromptEvent();
      act(() => {
        window.dispatchEvent(promptEvent);
      });

      expect(promptEvent.defaultPrevented).toBe(true);
      expect(promptEvent.prompt).toHaveBeenCalledTimes(0);
      expect(getPwaState().canInstall).toBe(true);
      expect(screen.getByRole('button', { name: /이 기기에 설치/ })).toBeInTheDocument();
      expect(fallbackDetails).not.toHaveAttribute('open');
    });

    it('transitions to installStatus="prompting" on click, hides install button, and blocks duplicate concurrent requestPwaInstall() calls', async () => {
      const profile = getFixture('android-chrome', 'android-15-chrome-mobile');
      applyMockBrowserProfile(profile);
      const { startPwa, getPwaState, requestPwaInstall, PwaInstallPanel } =
        await loadFreshPwaSuite();

      startPwa({ registerServiceWorker: false });
      render(<PwaInstallPanel />);

      const promptEvent = createMockBeforeInstallPromptEvent();
      act(() => {
        window.dispatchEvent(promptEvent);
      });

      const installButton = screen.getByRole('button', { name: /이 기기에 설치/ });
      fireEvent.click(installButton);

      // Concurrent duplicate invocation while prompting must be a no-op
      await act(async () => {
        void requestPwaInstall();
      });

      expect(promptEvent.prompt).toHaveBeenCalledTimes(1);
      expect(getPwaState()).toMatchObject({
        canInstall: false,
        installStatus: 'prompting',
      });
      expect(screen.queryByRole('button', { name: /이 기기에 설치/ })).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent(
        '브라우저의 설치 창에서 선택해 주세요.',
      );

      await act(async () => {
        promptEvent.resolveChoice({ outcome: 'accepted' });
        await promptEvent.userChoice;
      });
    });

    it('separates outcome="accepted" (installed=false) from appinstalled event (installed=true)', async () => {
      const profile = getFixture('android-chrome', 'android-15-chrome-mobile');
      applyMockBrowserProfile(profile);
      const { startPwa, getPwaState, PwaInstallPanel } = await loadFreshPwaSuite();

      startPwa({ registerServiceWorker: false });
      render(<PwaInstallPanel />);

      const promptEvent = createMockBeforeInstallPromptEvent();
      act(() => {
        window.dispatchEvent(promptEvent);
      });

      fireEvent.click(screen.getByRole('button', { name: /이 기기에 설치/ }));

      await act(async () => {
        promptEvent.resolveChoice({ outcome: 'accepted' });
        await promptEvent.userChoice;
      });

      expect(getPwaState()).toMatchObject({
        installed: false,
        canInstall: false,
        installStatus: 'accepted',
      });
      expect(screen.getByRole('status')).toHaveTextContent(
        '설치를 요청했어요. 기기의 설치가 끝나면 앱 목록에서 열어 주세요.',
      );

      act(() => {
        window.dispatchEvent(new Event('appinstalled'));
      });

      expect(getPwaState()).toMatchObject({
        installed: true,
        canInstall: false,
        installStatus: 'idle',
      });
      expect(screen.getByRole('status')).toHaveTextContent(
        '브라우저에서 설치 완료를 확인했어요. 홈 화면이나 앱 목록에서 열어 주세요.',
      );
    });

    it('handles race condition where appinstalled fires before userChoice resolves cleanly', async () => {
      const profile = getFixture('android-chrome', 'android-15-chrome-mobile');
      applyMockBrowserProfile(profile);
      const { startPwa, getPwaState, PwaInstallPanel } = await loadFreshPwaSuite();

      startPwa({ registerServiceWorker: false });
      render(<PwaInstallPanel />);

      const promptEvent = createMockBeforeInstallPromptEvent();
      act(() => {
        window.dispatchEvent(promptEvent);
      });

      fireEvent.click(screen.getByRole('button', { name: /이 기기에 설치/ }));

      // appinstalled fires first while userChoice is still pending
      act(() => {
        window.dispatchEvent(new Event('appinstalled'));
      });

      expect(getPwaState()).toMatchObject({
        installed: true,
        canInstall: false,
        installStatus: 'idle',
      });

      await act(async () => {
        promptEvent.resolveChoice({ outcome: 'accepted' });
        await promptEvent.userChoice;
      });

      // Must remain installed: true, installStatus: 'idle'
      expect(getPwaState()).toMatchObject({
        installed: true,
        canInstall: false,
        installStatus: 'idle',
      });
      expect(screen.getByRole('status')).toHaveTextContent(
        '브라우저에서 설치 완료를 확인했어요. 홈 화면이나 앱 목록에서 열어 주세요.',
      );
    });
  });

  describe('Test Group 3: Dismissal & Re-exposure After Dismissal (거절 후 재노출) + Error Recovery', () => {
    it('sets canInstall=false, installStatus="dismissed", shows dismissal guidance, and auto-expands manual <details open>', async () => {
      const profile = getFixture('android-chrome', 'android-15-chrome-mobile');
      applyMockBrowserProfile(profile);
      const { startPwa, getPwaState, PwaInstallPanel } = await loadFreshPwaSuite();

      startPwa({ registerServiceWorker: false });
      const { container } = render(<PwaInstallPanel />);

      const promptEvent = createMockBeforeInstallPromptEvent();
      act(() => {
        window.dispatchEvent(promptEvent);
      });

      fireEvent.click(screen.getByRole('button', { name: /이 기기에 설치/ }));

      await act(async () => {
        promptEvent.resolveChoice({ outcome: 'dismissed' });
        await promptEvent.userChoice;
      });

      expect(getPwaState()).toMatchObject({
        canInstall: false,
        installStatus: 'dismissed',
        installed: false,
      });
      expect(screen.queryByRole('button', { name: /이 기기에 설치/ })).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent(
        '설치를 취소했어요. 계속 웹에서 사용하거나 브라우저 메뉴에서 다시 설치할 수 있어요.',
      );

      const fallbackDetails = container.querySelector('details:not(.pwa-install-notes)');
      expect(fallbackDetails).toHaveAttribute('open');
    });

    it('retains dismissed status and open manual fallback without a dead button when unmounting and remounting <PwaInstallPanel />', async () => {
      const profile = getFixture('android-chrome', 'android-15-chrome-mobile');
      applyMockBrowserProfile(profile);
      const { startPwa, PwaInstallPanel } = await loadFreshPwaSuite();

      startPwa({ registerServiceWorker: false });
      const firstRender = render(<PwaInstallPanel />);

      const promptEvent = createMockBeforeInstallPromptEvent({ immediateOutcome: 'dismissed' });
      act(() => {
        window.dispatchEvent(promptEvent);
      });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /이 기기에 설치/ }));
      });

      // Unmount (close dialog) and remount (reopen dialog) before any new browser event
      firstRender.unmount();
      const secondRender = render(<PwaInstallPanel />);

      expect(screen.queryByRole('button', { name: /이 기기에 설치/ })).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent(
        '설치를 취소했어요. 계속 웹에서 사용하거나 브라우저 메뉴에서 다시 설치할 수 있어요.',
      );
      const fallbackDetails = secondRender.container.querySelector(
        'details:not(.pwa-install-notes)',
      );
      expect(fallbackDetails).toHaveAttribute('open');
    });

    it('re-exposes "이 기기에 설치" button when a fresh beforeinstallprompt fires after dismissal or error, and invokes the new prompt()', async () => {
      const profile = getFixture('android-chrome', 'android-15-chrome-mobile');
      applyMockBrowserProfile(profile);
      const { startPwa, getPwaState, PwaInstallPanel } = await loadFreshPwaSuite();

      startPwa({ registerServiceWorker: false });
      render(<PwaInstallPanel />);

      // 1st prompt: user dismisses
      const firstEvent = createMockBeforeInstallPromptEvent({ immediateOutcome: 'dismissed' });
      act(() => {
        window.dispatchEvent(firstEvent);
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /이 기기에 설치/ }));
      });
      expect(getPwaState().canInstall).toBe(false);
      expect(getPwaState().installStatus).toBe('dismissed');

      // 2nd fresh beforeinstallprompt dispatched by browser: re-exposes button
      const secondEvent = createMockBeforeInstallPromptEvent({
        promptRejectsWith: new Error('Simulated prompt failure'),
      });
      act(() => {
        window.dispatchEvent(secondEvent);
      });
      expect(getPwaState().canInstall).toBe(true);
      const reExposedButton = screen.getByRole('button', { name: /이 기기에 설치/ });
      expect(reExposedButton).toBeInTheDocument();

      // Clicking invokes secondEvent.prompt() (which rejects -> installStatus: 'error')
      await act(async () => {
        fireEvent.click(reExposedButton);
      });
      expect(secondEvent.prompt).toHaveBeenCalledTimes(1);
      expect(getPwaState().installStatus).toBe('error');
      expect(screen.getByRole('status')).toHaveTextContent(
        '설치 창을 열지 못했어요. 아래 브라우저 메뉴 방법으로 다시 시도해 주세요.',
      );

      // 3rd fresh beforeinstallprompt after error: re-exposes button and succeeds
      const thirdEvent = createMockBeforeInstallPromptEvent({ immediateOutcome: 'accepted' });
      act(() => {
        window.dispatchEvent(thirdEvent);
      });
      expect(getPwaState().canInstall).toBe(true);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /이 기기에 설치/ }));
      });
      expect(thirdEvent.prompt).toHaveBeenCalledTimes(1);
      expect(getPwaState().installStatus).toBe('accepted');
    });
  });

  describe('Test Group 4: Unsupported Browser / Private Window / Insecure Context Fallback', () => {
    it.each(INSTALL_FLOW_FIXTURES['unsupported-browsers'].map((f) => [f.id, f.label, f]))(
      'renders open manual fallback without install button for %s (%s)',
      async (_id, _label, profile) => {
        applyMockBrowserProfile(profile);
        const { startPwa, getPwaState, PwaInstallPanel } = await loadFreshPwaSuite();

        await act(async () => {
          startPwa({ registerServiceWorker: true });
        });

        expect(getPwaState().platform).toBe('browser');
        expect(getPwaState().canInstall).toBe(false);

        const { container } = render(<PwaInstallPanel />);
        expect(screen.queryByRole('button', { name: /이 기기에 설치/ })).not.toBeInTheDocument();

        const fallbackDetails = container.querySelector('details:not(.pwa-install-notes)');
        expect(fallbackDetails).toHaveAttribute('open');
        expect(
          screen.getByText(/Android Chrome에서는 ⋮ 메뉴 → 홈 화면에 추가 → 설치를 선택하세요/),
        ).toBeInTheDocument();
        expect(
          screen.getByText(/Mac Safari에서는 파일 → Dock에 추가를 선택하세요/),
        ).toBeInTheDocument();

        if (!profile.isSecureContext || !profile.serviceWorkerSupported) {
          expect(getPwaState().offlineStatus).toBe('unavailable');
          expect(
            screen.getByText(
              '현재 오프라인 준비를 확인하지 못했어요. 인터넷에 연결해서 사용해 주세요.',
            ),
          ).toBeInTheDocument();
        }
      },
    );
  });

  describe('Test Group 5: Verifies Track P4 Remediations for Audit Findings in src/lib/pwa.ts & src/components/PwaInstallPanel.tsx', () => {
    it.each(INSTALL_FLOW_FIXTURES['ios-inapp-browsers'].map((f) => [f.id, f.label, f]))(
      '[Finding B-F1 Remediated] classifies iOS in-app/third-party WebKit browser %s (%s) as "ios-other"',
      async (_id, _label, profile) => {
        applyMockBrowserProfile(profile);
        const { startPwa, getPwaState, PwaInstallPanel } = await loadFreshPwaSuite();

        startPwa({ registerServiceWorker: false });

        expect(getPwaState().platform).toBe('ios-other');
        expect(profile.idealPlatform).toBe('ios-other');

        const { container } = render(<PwaInstallPanel />);
        expect(container.querySelectorAll('ol > li')).toHaveLength(0);
        expect(
          screen.getByText(
            '이 주소를 Safari에서 연 다음 공유 → 홈 화면에 추가를 선택하세요.',
          ),
        ).toBeInTheDocument();
      },
    );

    it('[Finding B-F2 Remediated] resets stale installStatus ("dismissed" / "error") to "idle" when a new beforeinstallprompt arrives', async () => {
      const profile = getFixture('android-chrome', 'android-15-chrome-mobile');
      applyMockBrowserProfile(profile);
      const { startPwa, getPwaState, PwaInstallPanel } = await loadFreshPwaSuite();

      startPwa({ registerServiceWorker: false });
      render(<PwaInstallPanel />);

      const firstEvent = createMockBeforeInstallPromptEvent({ immediateOutcome: 'dismissed' });
      act(() => {
        window.dispatchEvent(firstEvent);
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /이 기기에 설치/ }));
      });

      expect(getPwaState().installStatus).toBe('dismissed');

      const secondEvent = createMockBeforeInstallPromptEvent();
      act(() => {
        window.dispatchEvent(secondEvent);
      });

      expect(getPwaState()).toMatchObject({
        canInstall: true,
        installStatus: 'idle',
      });

      expect(screen.getByRole('button', { name: /이 기기에 설치/ })).toBeInTheDocument();
      expect(
        screen.queryByText(
          '설치를 취소했어요. 계속 웹에서 사용하거나 브라우저 메뉴에서 다시 설치할 수 있어요.',
        ),
      ).not.toBeInTheDocument();
    });

    it('[Finding B-F3 Remediated] display-mode standalone -> false transition updates installed=false and allows future beforeinstallprompt events', async () => {
      const profile = {
        ...getFixture('android-chrome', 'android-15-chrome-mobile'),
        displayModeStandalone: true,
      };
      const env = applyMockBrowserProfile(profile);
      const { startPwa, getPwaState, PwaInstallPanel } = await loadFreshPwaSuite();

      startPwa({ registerServiceWorker: false });
      expect(getPwaState()).toMatchObject({
        standalone: true,
        installed: true,
      });

      render(<PwaInstallPanel />);

      act(() => {
        env.matchMediaController.setStandalone(false);
      });

      expect(getPwaState()).toMatchObject({
        standalone: false,
        installed: false,
      });

      const promptEvent = createMockBeforeInstallPromptEvent();
      act(() => {
        window.dispatchEvent(promptEvent);
      });

      expect(getPwaState().canInstall).toBe(true);
      expect(screen.getByRole('button', { name: /이 기기에 설치/ })).toBeInTheDocument();
    });

    it('[Finding B-F4 Remediated] prevents spurious update-ready <p role="status"> during first-time waiting install when installStatus !== "idle"', async () => {
      const profile = getFixture('android-chrome', 'android-15-chrome-mobile');
      applyMockBrowserProfile(profile, { registrationState: 'waiting' });
      const { startPwa, getPwaState, PwaInstallPanel } = await loadFreshPwaSuite();

      await act(async () => {
        startPwa({ registerServiceWorker: true });
      });

      expect(getPwaState().offlineStatus).toBe('preparing');

      render(<PwaInstallPanel />);

      const promptEvent = createMockBeforeInstallPromptEvent({ immediateOutcome: 'dismissed' });
      act(() => {
        window.dispatchEvent(promptEvent);
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /이 기기에 설치/ }));
      });

      const statusElements = screen.getAllByRole('status');
      expect(statusElements).toHaveLength(1);
      expect(statusElements[0]).toHaveTextContent('설치를 취소했어요.');
    });
  });
});
