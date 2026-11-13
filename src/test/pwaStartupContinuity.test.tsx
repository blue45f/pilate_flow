import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { render, createRoot } = vi.hoisted(() => {
  const render = vi.fn();
  return { render, createRoot: vi.fn(() => ({ render })) };
});
vi.mock('react-dom/client', () => ({ default: { createRoot } }));
vi.mock('../App', () => ({ App: () => null }));
vi.mock('../lib/cloudSync', () => ({
  bootstrapCloudSession: vi.fn().mockResolvedValue(undefined),
}));

let browser: EventTarget & {
  location: { reload: ReturnType<typeof vi.fn> };
  isSecureContext: boolean;
};
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv('PROD', true);
  browser = Object.assign(new EventTarget(), {
    location: { reload: vi.fn() },
    isSecureContext: true,
  });
  vi.stubGlobal('window', browser);
  document.body.innerHTML = '<div id="root"></div>';
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  delete (navigator as unknown as { serviceWorker?: unknown }).serviceWorker;
  document.body.innerHTML = '';
});

describe('production startup update continuity', () => {
  it('announces a waiting update without forcing activation or reloading the active screen', async () => {
    const waiting = { postMessage: vi.fn() };
    const registration = Object.assign(new EventTarget(), {
      active: {},
      waiting,
      installing: null,
      update: vi.fn().mockResolvedValue(undefined),
    });
    const worker = Object.assign(new EventTarget(), {
      controller: {},
      register: vi.fn().mockResolvedValue(registration),
    });
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: worker });

    await import('../main');
    const pwa = await import('../lib/pwa');
    expect(worker.register).toHaveBeenCalledExactlyOnceWith('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });
    expect(pwa.getPwaState().offlineStatus).toBe('update-ready');
    expect(waiting.postMessage).not.toHaveBeenCalled();
    worker.dispatchEvent(new Event('controllerchange'));
    expect(browser.location.reload).not.toHaveBeenCalled();
    expect(render).toHaveBeenCalledTimes(1);

    // Connectivity changes still check for updates; deferral never disables discovery.
    browser.dispatchEvent(new Event('online'));
    expect(registration.update).toHaveBeenCalledTimes(1);
    expect(pwa.getPwaState().offlineStatus).toBe('update-ready');
  });
});
