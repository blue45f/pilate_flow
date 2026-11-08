import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let trackedListeners: Array<[string, EventListenerOrEventListenerObject]>;
let mediaQuery: EventTarget & { matches: boolean };

beforeEach(() => {
  vi.resetModules();
  trackedListeners = [];
  const originalAdd = window.addEventListener.bind(window);
  vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
    if (listener) trackedListeners.push([type, listener]);
    return originalAdd(type, listener, options);
  });
  mediaQuery = Object.assign(new EventTarget(), { matches: false });
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mediaQuery),
  );
  vi.stubGlobal('isSecureContext', true);
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
    'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/134.0.0.0 Mobile Safari/537.36',
  );
  vi.spyOn(navigator, 'platform', 'get').mockReturnValue('Linux armv81');
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 5 });
  Object.defineProperty(navigator, 'standalone', { configurable: true, value: false });
});

afterEach(() => {
  cleanup();
  for (const [type, listener] of trackedListeners) {
    window.removeEventListener(type, listener);
  }
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete (navigator as unknown as { serviceWorker?: unknown }).serviceWorker;
});

function createInstallEvent(outcome: 'accepted' | 'dismissed' = 'dismissed') {
  return Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome }),
  });
}

describe('P4 PWA Install Panel & Lifecycle Fixes', () => {
  describe('Fix 2: Offline launch -> online auto-recovery', () => {
    it('retries service worker registration when window "online" fires after an offline registration failure, and cleans up the listener', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      const activeRegistration = Object.assign(new EventTarget(), {
        active: { state: 'activated' },
        waiting: null,
        installing: null,
      });
      const register = vi
        .fn()
        .mockRejectedValueOnce(new Error('Failed to fetch /sw.js while offline'))
        .mockResolvedValueOnce(activeRegistration);

      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: { controller: null, register },
      });

      const pwa = await import('../lib/pwa');
      const { PwaInstallPanel } = await import('../components/PwaInstallPanel');

      pwa.startPwa({ registerServiceWorker: true });
      render(<PwaInstallPanel />);

      await act(async () => {
        await Promise.resolve();
      });

      expect(register).toHaveBeenCalledTimes(1);
      expect(pwa.getPwaState().offlineStatus).toBe('error');
      expect(
        screen.getByText('현재 오프라인 준비를 확인하지 못했어요. 인터넷에 연결해서 사용해 주세요.'),
      ).toBeInTheDocument();

      // Network recovers -> dispatch 'online'
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
      await act(async () => {
        window.dispatchEvent(new Event('online'));
        await Promise.resolve();
      });

      expect(register).toHaveBeenCalledTimes(2);
      expect(pwa.getPwaState().offlineStatus).toBe('ready');
      expect(screen.getByText('기본 화면을 오프라인에서 열 준비가 됐어요.')).toBeInTheDocument();

      // Subsequent online events do not re-register once succeeded
      await act(async () => {
        window.dispatchEvent(new Event('online'));
        await Promise.resolve();
      });
      expect(register).toHaveBeenCalledTimes(2);
    });

    it('cleans up the online retry listener when the cleanup function returned by registerPwaServiceWorker is called', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      const register = vi.fn().mockRejectedValue(new Error('offline'));
      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: { controller: null, register },
      });

      const pwa = await import('../lib/pwa');
      const stop = pwa.registerPwaServiceWorker();
      await Promise.resolve();

      expect(register).toHaveBeenCalledTimes(1);
      stop();

      window.dispatchEvent(new Event('online'));
      await Promise.resolve();
      expect(register).toHaveBeenCalledTimes(1);
    });
  });

  describe('Fix 3: iOS in-app and alternative browser detection', () => {
    it.each([
      [
        'KakaoTalk iOS in-app',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 11.1.0 Safari/604.1',
      ],
      [
        'NAVER iOS in-app',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1 NAVER(inapp; search; 2000; 12.11.2; 16PRO)',
      ],
      [
        'Google Search App (GSA) iOS',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/356.0.728943210 Mobile/15E148 Safari/604.1',
      ],
      [
        'Naver Whale iOS',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Whale/3.6.0.4222 Mobile/15E148 Safari/604.1',
      ],
      [
        'Instagram iOS in-app',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 365.0.0.0.00 Safari/604.1',
      ],
      [
        'Facebook (FBAN/FBAV) iOS in-app',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/490.0.0] Safari/604.1',
      ],
      [
        'LINE iOS in-app',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/15.2.0',
      ],
      [
        'Chrome iOS (CriOS)',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/134.0.0.0 Mobile/15E148 Safari/604.1',
      ],
      [
        'Firefox iOS (FxiOS)',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/135.0 Mobile/15E148 Safari/605.1.15',
      ],
      [
        'Edge iOS (EdgiOS)',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 EdgiOS/134.0.0.0 Mobile/15E148 Safari/605.1.15',
      ],
      [
        'Opera iOS (OPiOS)',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) OPiOS/5.4.0 Mobile/15E148 Safari/605.1.15',
      ],
    ])(
      'classifies %s as ios-other and instructs opening in Safari first',
      async (_label, userAgent) => {
        vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent);
        vi.spyOn(navigator, 'platform', 'get').mockReturnValue('iPhone');

        const pwa = await import('../lib/pwa');
        const { PwaInstallPanel } = await import('../components/PwaInstallPanel');

        expect(pwa.detectPwaPlatform(navigator)).toBe('ios-other');
        pwa.startPwa({ registerServiceWorker: false });
        expect(pwa.getPwaState().platform).toBe('ios-other');

        const { container } = render(<PwaInstallPanel />);
        expect(
          screen.getByText('이 주소를 Safari에서 연 다음 공유 → 홈 화면에 추가를 선택하세요.'),
        ).toBeInTheDocument();
        expect(container.querySelectorAll('ol > li')).toHaveLength(0);
        expect(screen.queryByRole('button', { name: /이 기기에 설치/ })).not.toBeInTheDocument();
      },
    );
  });

  describe('Fix 4a: First install update-ready false positive prevention', () => {
    it('does not report update-ready during a fresh first install when registration.active was null before installing reached installed', async () => {
      const installingWorker = Object.assign(new EventTarget(), {
        state: 'installing' as ServiceWorkerState,
      });
      const registration = Object.assign(new EventTarget(), {
        active: null as ServiceWorker | null,
        waiting: null as ServiceWorker | null,
        installing: null as ServiceWorker | null,
      });

      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: {
          controller: null,
          register: vi.fn().mockResolvedValue(registration),
        },
      });

      const onUpdateReady = vi.fn();
      const onReady = vi.fn();
      const pwa = await import('../lib/pwa');
      const { PwaInstallPanel } = await import('../components/PwaInstallPanel');

      pwa.registerPwaServiceWorker({ onUpdateReady, onReady });
      render(<PwaInstallPanel />);

      await act(async () => {
        await Promise.resolve();
      });

      expect(pwa.getPwaState().offlineStatus).toBe('preparing');

      // Browser fires updatefound for first install while registration.active is still null
      registration.installing = installingWorker as unknown as ServiceWorker;
      act(() => {
        registration.dispatchEvent(new Event('updatefound'));
      });

      // Worker reaches 'installed' (and enters waiting slot briefly before activating)
      installingWorker.state = 'installed';
      registration.installing = null;
      registration.waiting = installingWorker as unknown as ServiceWorker;
      act(() => {
        installingWorker.dispatchEvent(new Event('statechange'));
      });

      expect(onUpdateReady).not.toHaveBeenCalled();
      expect(pwa.getPwaState().offlineStatus).toBe('preparing');
      expect(screen.queryByText(/새 버전이 준비됐어요/)).not.toBeInTheDocument();

      // Worker finishes activating -> transitions to 'ready'
      installingWorker.state = 'activated';
      registration.waiting = null;
      registration.active = installingWorker as unknown as ServiceWorker;
      act(() => {
        installingWorker.dispatchEvent(new Event('statechange'));
      });

      expect(onUpdateReady).not.toHaveBeenCalled();
      expect(onReady).toHaveBeenCalledTimes(1);
      expect(pwa.getPwaState().offlineStatus).toBe('ready');
    });

    it('reports update-ready when a new worker reaches installed while an existing active worker is already present', async () => {
      const existingWorker = Object.assign(new EventTarget(), {
        state: 'activated' as ServiceWorkerState,
      });
      const nextWorker = Object.assign(new EventTarget(), {
        state: 'installing' as ServiceWorkerState,
      });
      const registration = Object.assign(new EventTarget(), {
        active: existingWorker as unknown as ServiceWorker | null,
        waiting: null as ServiceWorker | null,
        installing: null as ServiceWorker | null,
      });

      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: {
          controller: existingWorker,
          register: vi.fn().mockResolvedValue(registration),
        },
      });

      const onUpdateReady = vi.fn();
      const pwa = await import('../lib/pwa');
      const { PwaInstallPanel } = await import('../components/PwaInstallPanel');

      pwa.registerPwaServiceWorker({ onUpdateReady });
      render(<PwaInstallPanel />);

      await act(async () => {
        await Promise.resolve();
      });
      expect(pwa.getPwaState().offlineStatus).toBe('ready');

      registration.installing = nextWorker as unknown as ServiceWorker;
      act(() => {
        registration.dispatchEvent(new Event('updatefound'));
      });

      nextWorker.state = 'installed';
      registration.installing = null;
      registration.waiting = nextWorker as unknown as ServiceWorker;
      act(() => {
        nextWorker.dispatchEvent(new Event('statechange'));
      });

      expect(onUpdateReady).toHaveBeenCalledTimes(1);
      expect(pwa.getPwaState().offlineStatus).toBe('update-ready');
      expect(screen.getByText(/새 버전이 준비됐어요/)).toBeInTheDocument();
    });
  });

  describe('Fix 4b: Re-prompt resets installStatus to idle and hides stale dismissed/error banner', () => {
    it('resets installStatus to idle and removes the dismissed message when a fresh beforeinstallprompt arrives', async () => {
      const pwa = await import('../lib/pwa');
      const { PwaInstallPanel } = await import('../components/PwaInstallPanel');

      pwa.startPwa({ registerServiceWorker: false });
      render(<PwaInstallPanel />);

      const firstPrompt = createInstallEvent('dismissed');
      act(() => {
        window.dispatchEvent(firstPrompt);
      });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /이 기기에 설치/ }));
      });

      expect(pwa.getPwaState().installStatus).toBe('dismissed');
      expect(screen.getByText(/설치를 취소했어요/)).toBeInTheDocument();

      // Fresh beforeinstallprompt arrives
      const secondPrompt = createInstallEvent('accepted');
      act(() => {
        window.dispatchEvent(secondPrompt);
      });

      expect(pwa.getPwaState()).toMatchObject({
        canInstall: true,
        installStatus: 'idle',
      });
      expect(screen.getByRole('button', { name: /이 기기에 설치/ })).toBeInTheDocument();
      expect(screen.queryByText(/설치를 취소했어요/)).not.toBeInTheDocument();
    });
  });

  describe('Fix 4c: Standalone display-mode media query exit updates installed to false', () => {
    it('sets installed and standalone to false when leaving standalone mode, allowing subsequent install prompts', async () => {
      mediaQuery.matches = true;
      const pwa = await import('../lib/pwa');
      const { PwaInstallPanel } = await import('../components/PwaInstallPanel');

      pwa.startPwa({ registerServiceWorker: false });
      render(<PwaInstallPanel />);

      expect(pwa.getPwaState()).toMatchObject({
        standalone: true,
        installed: true,
      });
      expect(screen.getByText('지금 앱으로 실행 중이에요.')).toBeInTheDocument();

      // Leave standalone display mode
      mediaQuery.matches = false;
      act(() => {
        mediaQuery.dispatchEvent(Object.assign(new Event('change'), { matches: false }));
      });

      expect(pwa.getPwaState()).toMatchObject({
        standalone: false,
        installed: false,
      });

      // Subsequent beforeinstallprompt now exposes the install button
      const promptEvent = createInstallEvent('accepted');
      act(() => {
        window.dispatchEvent(promptEvent);
      });

      expect(pwa.getPwaState().canInstall).toBe(true);
      expect(screen.getByRole('button', { name: /이 기기에 설치/ })).toBeInTheDocument();
    });
  });
});
