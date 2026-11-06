import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let listeners: Array<[string, EventListenerOrEventListenerObject]>;
let media: EventTarget & { matches: boolean };
beforeEach(() => {
  vi.resetModules();
  listeners = [];
  const add = window.addEventListener.bind(window);
  vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
    if (listener) listeners.push([type, listener]);
    add(type, listener, options);
  });
  media = Object.assign(new EventTarget(), { matches: false });
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => media),
  );
  vi.stubGlobal('isSecureContext', true);
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Chrome');
  Object.defineProperty(navigator, 'standalone', { configurable: true, value: false });
});
afterEach(() => {
  for (const [type, listener] of listeners) window.removeEventListener(type, listener);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete (navigator as unknown as { serviceWorker?: unknown }).serviceWorker;
});
function installEvent(outcome: 'accepted' | 'dismissed' = 'dismissed') {
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome }),
  });
  window.dispatchEvent(event);
  return event;
}
async function start() {
  const pwa = await import('./pwa');
  pwa.startPwa({ registerServiceWorker: false });
  return pwa;
}
describe('PWA install lifecycle', () => {
  it('captures early availability without automatically prompting, then only consumes once', async () => {
    const pwa = await start();
    const event = installEvent();
    expect(event.defaultPrevented).toBe(true);
    expect(event.prompt).not.toHaveBeenCalled();
    expect(pwa.getPwaState().canInstall).toBe(true);
    await Promise.all([pwa.requestPwaInstall(), pwa.requestPwaInstall()]);
    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(pwa.getPwaState()).toMatchObject({
      installed: false,
      canInstall: false,
      installStatus: 'dismissed',
    });
    await pwa.requestPwaInstall();
    expect(event.prompt).toHaveBeenCalledTimes(1);
    const retry = installEvent();
    expect(pwa.getPwaState()).toMatchObject({ installStatus: 'dismissed', canInstall: true });
    await pwa.requestPwaInstall();
    expect(retry.prompt).toHaveBeenCalledTimes(1);
  });
  it('does not treat acceptance as installation, and only appinstalled confirms completion', async () => {
    const pwa = await start();
    installEvent('accepted');
    await pwa.requestPwaInstall();
    expect(pwa.getPwaState()).toMatchObject({ installed: false, installStatus: 'accepted' });
    window.dispatchEvent(new Event('appinstalled'));
    expect(pwa.getPwaState()).toMatchObject({
      installed: true,
      canInstall: false,
      installStatus: 'idle',
    });
    const later = installEvent();
    await pwa.requestPwaInstall();
    expect(later.prompt).not.toHaveBeenCalled();
  });
  it('does not regress completion when appinstalled arrives before userChoice', async () => {
    const pwa = await start();
    const event = installEvent('accepted');
    event.prompt.mockImplementation(async () => {
      window.dispatchEvent(new Event('appinstalled'));
    });
    await pwa.requestPwaInstall();
    expect(pwa.getPwaState()).toMatchObject({ installed: true, installStatus: 'idle' });
  });
  it('recovers from a failed prompt when a new browser event arrives', async () => {
    const pwa = await start();
    const event = installEvent();
    event.prompt.mockRejectedValue(new Error('not allowed'));
    await pwa.requestPwaInstall();
    expect(pwa.getPwaState().installStatus).toBe('error');
    installEvent();
    expect(pwa.getPwaState()).toMatchObject({ installStatus: 'error', canInstall: true });
  });
  it('detects standalone initially and after a display mode change', async () => {
    media.matches = true;
    const pwa = await start();
    expect(pwa.getPwaState().standalone).toBe(true);
    media.matches = false;
    media.dispatchEvent(new Event('change'));
    expect(pwa.getPwaState().standalone).toBe(false);
    media.matches = true;
    media.dispatchEvent(new Event('change'));
    expect(pwa.getPwaState().standalone).toBe(true);
  });
  it.each([
    ['Mozilla/5.0 (iPhone) Version/27.0 Mobile Safari/605.1.15', 'ios-safari'],
    ['Mozilla/5.0 (iPhone) CriOS/140.0 Mobile Safari/604.1', 'ios-other'],
  ])('detects iOS guidance for %s', async (agent, platform) => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(agent);
    const pwa = await start();
    expect(pwa.getPwaState().platform).toBe(platform);
  });
  it('detects iPad desktop user agent and navigator.standalone', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla Macintosh Safari');
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');
    Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 5 });
    Object.defineProperty(navigator, 'standalone', { configurable: true, value: true });
    const pwa = await start();
    expect(pwa.getPwaState()).toMatchObject({ platform: 'ios-safari', standalone: true });
  });
  it('registers only once and reports waiting updates without forcing activation', async () => {
    const registration = Object.assign(new EventTarget(), {
      active: {},
      waiting: {},
      installing: null,
    });
    const register = vi.fn().mockResolvedValue(registration);
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register } });
    const pwa = await import('./pwa');
    pwa.startPwa();
    pwa.startPwa();
    await Promise.resolve();
    expect(register).toHaveBeenCalledExactlyOnceWith('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });
    expect(pwa.getPwaState().offlineStatus).toBe('update-ready');
  });
  it('reports registration failure without interrupting install or local data', async () => {
    localStorage.setItem('pwa-test-draft', 'keep');
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { register: vi.fn().mockRejectedValue(new Error('offline')) },
    });
    const pwa = await import('./pwa');
    pwa.startPwa();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(pwa.getPwaState().offlineStatus).toBe('error');
    expect(localStorage.getItem('pwa-test-draft')).toBe('keep');
    installEvent();
    expect(pwa.getPwaState().canInstall).toBe(true);
  });
});
