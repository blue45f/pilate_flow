import { describe, expect, it, vi } from 'vitest';
import vm from 'node:vm';
import { serviceWorkerSource, pwaBuild } from '../../scripts/pwa-build';

function harness() {
  const handlers: Record<string, (event: unknown) => void> = {};
  const cached = { body: 'cached app shell' };
  const cache = {
    addAll: vi.fn().mockResolvedValue(undefined),
    match: vi.fn().mockResolvedValue(cached),
  };
  const caches = {
    open: vi.fn().mockResolvedValue(cache),
    keys: vi
      .fn()
      .mockResolvedValue(['flow-atelier-shell-old', 'flow-atelier-shell-v2', 'other-app-cache']),
    delete: vi.fn().mockResolvedValue(true),
  };
  const fetch = vi.fn().mockResolvedValue({ body: 'network' });
  const self = {
    location: { origin: 'https://example.test' },
    addEventListener: (name: string, callback: (event: unknown) => void) => {
      handlers[name] = callback;
    },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
  };
  vm.runInNewContext(serviceWorkerSource('v2', ['assets/app-123.js', 'assets/app-123.css']), {
    self,
    caches,
    fetch,
    URL,
    Response,
  });
  const request = (url: string, mode = 'cors', method = 'GET') => {
    const respondWith = vi.fn();
    handlers.fetch({
      request: { url: new URL(url, self.location.origin).href, mode, method },
      respondWith,
    });
    return respondWith;
  };
  return { handlers, cached, cache, caches, fetch, self, request };
}
describe('static-only service worker', () => {
  it('builds its manifest after Vite prunes empty CSS-only chunks', () => {
    const plugin = pwaBuild();
    expect(plugin.enforce).toBe('post');
    expect(plugin.generateBundle).toMatchObject({ order: 'post' });
  });
  it('precaches only the app shell and leaves existing clients alone', async () => {
    const h = harness();
    const waitUntil = vi.fn();
    h.handlers.install({ waitUntil });
    await waitUntil.mock.calls[0][0];
    expect(h.cache.addAll).toHaveBeenCalledWith([
      '/index.html',
      '/icons/app-192.png',
      '/icons/app-512.png',
      '/assets/app-123.js',
      '/assets/app-123.css',
    ]);
    expect(h.self.skipWaiting).not.toHaveBeenCalled();
    expect(h.self.clients.claim).not.toHaveBeenCalled();
  });
  it('cleans only obsolete app shell caches, never user or third party caches', async () => {
    const h = harness();
    const waitUntil = vi.fn();
    h.handlers.activate({ waitUntil });
    await waitUntil.mock.calls[0][0];
    expect(h.caches.delete).toHaveBeenCalledExactlyOnceWith('flow-atelier-shell-old');
  });
  it.each([
    '/__/auth/handler',
    '/__/auth/iframe',
    '/api/session',
    '/?code=secret&state=match',
    '/?oobCode=private',
    '/assets/app-123.js?token=private',
    'https://firestore.googleapis.com/',
    'https://youtube.com/embed/id',
  ])('never intercepts %s', (url) => {
    const h = harness();
    expect(h.request(url, 'navigate')).not.toHaveBeenCalled();
    expect(h.fetch).not.toHaveBeenCalled();
  });
  it('never intercepts POST or unknown assets', () => {
    const h = harness();
    expect(h.request('/', 'navigate', 'POST')).not.toHaveBeenCalled();
    expect(h.request('/private.json')).not.toHaveBeenCalled();
  });
  it('preserves the original navigation request online, without caching the response', async () => {
    const h = harness();
    const response = h.request('/', 'navigate');
    expect((await response.mock.calls[0][0]).body).toBe('network');
    expect(h.fetch.mock.calls[0][0].url).toBe('https://example.test/');
    expect(h.cache.addAll).not.toHaveBeenCalled();
  });
  it('opens its exact cached app shell offline', async () => {
    const h = harness();
    h.fetch.mockRejectedValue(new Error('offline'));
    const response = h.request('/', 'navigate');
    expect(await response.mock.calls[0][0]).toBe(h.cached);
    expect(h.cache.match).toHaveBeenCalledWith('/index.html');
  });
  it('neutralizes cleanUrls redirect metadata without changing the cached document', async () => {
    const h = harness();
    h.fetch.mockRejectedValue(new Error('offline'));
    const cached = new Response('<html>saved app shell</html>', {
      status: 200,
      statusText: 'OK',
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'content-security-policy': "default-src 'self'",
      },
    });
    Object.defineProperties(cached, {
      redirected: { value: true },
      url: { value: 'https://example.test/' },
    });
    h.cache.match.mockResolvedValueOnce(cached as never);
    const response = (await h.request('/', 'navigate').mock.calls[0][0]) as Response;
    expect(response).not.toBe(cached);
    expect(response.redirected).toBe(false);
    expect(response.url).toBe('');
    expect(response.status).toBe(200);
    expect(response.statusText).toBe('OK');
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');
    expect(response.headers.get('content-security-policy')).toBe("default-src 'self'");
    expect(await response.text()).toBe('<html>saved app shell</html>');
    expect(h.cache.addAll).not.toHaveBeenCalled();
    expect(h.caches.delete).not.toHaveBeenCalled();
  });
  it('fails closed when the cached document is missing', async () => {
    const h = harness();
    h.fetch.mockRejectedValue(new Error('offline'));
    h.cache.match.mockResolvedValueOnce(undefined as never);
    const response = (await h.request('/', 'navigate').mock.calls[0][0]) as Response;
    expect(response.type).toBe('error');
  });
  it('uses only this version cache for hashed assets', async () => {
    const h = harness();
    const response = h.request('/assets/app-123.js');
    expect(await response.mock.calls[0][0]).toBe(h.cached);
    expect(h.caches.open).toHaveBeenCalledWith('flow-atelier-shell-v2');
    expect(h.fetch).not.toHaveBeenCalled();
  });
});
