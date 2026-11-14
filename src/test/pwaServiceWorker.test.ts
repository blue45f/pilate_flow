import { createHash } from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import {
  ICON_PATHS,
  createServiceWorkerSource,
  getMovementGuidePaths,
  getShellExtras,
  pwaBuild,
  serviceWorkerSource,
} from '../../scripts/pwa-build';

interface HarnessOptions {
  origin?: string;
  waiting?: unknown;
  shellExtras?: string[];
}

function harness(options: HarnessOptions = {}) {
  const handlers: Record<string, (event: unknown) => void> = {};
  const cached = { body: 'cached app shell' };
  const cache = {
    addAll: vi.fn().mockResolvedValue(undefined),
    match: vi.fn().mockResolvedValue(cached),
    put: vi.fn().mockResolvedValue(undefined),
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
    location: new URL(options.origin ?? 'https://example.test'),
    registration: {
      waiting: options.waiting ?? null,
    },
    addEventListener: (name: string, callback: (event: unknown) => void) => {
      handlers[name] = callback;
    },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
  };
  vm.runInNewContext(
    createServiceWorkerSource(
      'v2',
      ['assets/app-123.js', 'assets/app-123.css'],
      options.shellExtras,
    ),
    {
      self,
      caches,
      fetch,
      URL,
      Response,
    },
  );
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
  it.each(['svg', 'webp'])(
    'serves the shared-model %s cache without requesting external media',
    async (format) => {
      const h = harness();
      const assetPath = '/motion-artwork-v2/original-mat-chest-lift.middle.012345abcdef.' + format;
      const event = h.request(assetPath);
      expect(event).toHaveBeenCalledTimes(1);
      expect(await event.mock.calls[0][0]).toBe(h.cached);
      expect(h.fetch).not.toHaveBeenCalled();
      expect(h.cache.match).toHaveBeenCalledWith(assetPath);
      expect(h.request('/motion-artwork-v2/manifest.json')).not.toHaveBeenCalled();
      expect(h.request('https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg')).not.toHaveBeenCalled();
    },
  );
  it('serves a prewarmed lossless intermediate frame from the dedicated motion cache without network', async () => {
    const h = harness();
    const response = new Response('frame', { headers: { 'content-type': 'image/webp' } });
    const frameCache = { match: vi.fn().mockResolvedValue(response) };
    h.cache.match.mockResolvedValue(undefined);
    h.caches.open.mockImplementation(async (name: string) =>
      name === 'flow-atelier-studio3d-lossless-v3' ? frameCache : h.cache,
    );
    const event = h.request('/motion-studio3d/footwork-mid.webp');
    expect(event).toHaveBeenCalledTimes(1);
    expect(await event.mock.calls[0][0]).toBe(response);
    expect(h.fetch).not.toHaveBeenCalled();
    expect(frameCache.match).toHaveBeenCalledWith('/motion-studio3d/footwork-mid.webp');
  });
  it('keeps the pre-cache list and version in locale-independent UTF-16 order', async () => {
    const plugin = pwaBuild();
    const hook = plugin.generateBundle;
    const handler = typeof hook === 'function' ? hook : hook?.handler;
    if (!handler) throw new Error('Expected PWA bundle handler');
    const emitFile = vi.fn();
    const html = '<html>deterministic ordering fixture</html>';
    const bundle = {
      'assets/é.js': {},
      'assets/a.css': {},
      'assets/Z.js': {},
      'assets/가.js': {},
      'assets/z.js': {},
      'assets/a.js': {},
      'assets/A.js': {},
      'assets/ignored.map': {},
      'index.html': { type: 'asset', source: html },
    };
    const files = [
      'assets/A.js',
      'assets/Z.js',
      'assets/a.css',
      'assets/a.js',
      'assets/z.js',
      'assets/é.js',
      'assets/가.js',
    ];
    const shellExtras = getShellExtras();
    const hash = createHash('sha256').update(JSON.stringify(files)).update(html);
    for (const filePath of [
      ...ICON_PATHS.map((iconPath) => `public${iconPath}`),
      ...shellExtras.map((extraPath) => `public${extraPath}`),
    ]) {
      if (fs.existsSync(filePath)) {
        hash.update(fs.readFileSync(filePath));
      }
    }
    const version = hash
      .update(serviceWorkerSource('', files, shellExtras))
      .digest('hex')
      .slice(0, 16);
    await Reflect.apply(handler, { emitFile }, [{}, bundle, false]);
    expect(emitFile).toHaveBeenCalledExactlyOnceWith({
      type: 'asset',
      fileName: 'sw.js',
      source: serviceWorkerSource(version, files, shellExtras),
    });
  });

  it('keeps identical emitted worker versions when loaders serialize the generator differently', async () => {
    const hook = pwaBuild().generateBundle;
    const handler = typeof hook === 'function' ? hook : hook?.handler;
    if (!handler) throw new Error('Expected PWA bundle handler');
    const bundle = {
      'index.html': { type: 'asset', source: '<html>loader-independent fixture</html>' },
      'assets/app.js': { type: 'chunk', code: 'export const ready = true;' },
    };
    const emitFile = vi.fn();
    const serializableGenerator: { toString(): string } = serviceWorkerSource;
    const serialize = vi.spyOn(serializableGenerator, 'toString');
    try {
      serialize.mockReturnValue('function serviceWorkerSource() { /* Vite loader */ }');
      await Reflect.apply(handler, { emitFile }, [{}, bundle, false]);
      serialize.mockReturnValue('function serviceWorkerSource() { /* test loader */ }');
      await Reflect.apply(handler, { emitFile }, [{}, bundle, false]);
      expect(emitFile).toHaveBeenCalledTimes(2);
      expect(emitFile.mock.calls[0][0]).toEqual(emitFile.mock.calls[1][0]);
      expect(serialize).not.toHaveBeenCalled();
    } finally {
      serialize.mockRestore();
    }
  });

  it('builds its manifest after Vite prunes empty CSS-only chunks', () => {
    const plugin = pwaBuild();
    expect(plugin.enforce).toBe('post');
    expect(plugin.generateBundle).toMatchObject({ order: 'post' });
  });

  it('keeps ASSETS strictly matching check-pwa-build.mjs while precaching SHELL_EXTRAS on install', async () => {
    const source = serviceWorkerSource('v2', ['assets/app-123.js', 'assets/app-123.css']);
    const assetsMatch = source.match(/const ASSETS = (\[.*\]);/);
    expect(assetsMatch).not.toBeNull();
    const assets = JSON.parse(assetsMatch![1]) as string[];
    expect(assets).toEqual([
      '/index.html',
      '/icons/app-192.png',
      '/icons/app-512.png',
      '/icons/app-maskable-512.png',
      '/icons/apple-touch-icon.png',
      '/assets/app-123.js',
      '/assets/app-123.css',
    ]);
    for (const url of assets) {
      expect(url).toMatch(
        /^\/(?:index\.html|icons\/[a-z0-9-]+\.png|assets\/[A-Za-z0-9_.-]+\.(?:js|css))$/,
      );
    }

    const expectedExtras = getShellExtras();
    expect(expectedExtras).toContain('/site.webmanifest');
    expect(expectedExtras).toContain('/favicon.svg');
    expect(expectedExtras).toContain('/images/motion-atlas-v3/practitioner.webp');
    expect(expectedExtras).toContain('/images/motion-atlas-v3/equipment.webp');
    expect(expectedExtras).toContain('/images/movement-guides/mat-phase-alignment-guide.svg');
    expect(expectedExtras).toContain('/images/movement-guides/reformer-phase-alignment-guide.svg');
    expect(expectedExtras).toContain('/images/movement-guides/cadillac-phase-alignment-guide.svg');
    expect(expectedExtras).toContain('/images/movement-guides/chair-phase-alignment-guide.svg');
    expect(expectedExtras).toContain('/images/movement-guides/barrel-phase-alignment-guide.svg');
    expect(expectedExtras).toContain('/images/movement-guides/hip-leg-side-kick-guide.svg');
    expect(expectedExtras).toContain('/images/movement-guides/hip-leg-single-leg-circle-guide.svg');
    expect(expectedExtras).toContain(
      '/images/movement-guides/shoulder-support-leg-pull-front-guide.svg',
    );
    expect(expectedExtras).toContain('/images/movement-guides/shoulder-support-push-up-guide.svg');
    expect(expectedExtras).not.toContain('/images/movement-guides/MANIFEST.json');
    expect(expectedExtras).not.toContain('/images/movement-guides/hip-leg-manifest.json');
    expect(expectedExtras).not.toContain('/images/movement-guides/LICENSE.txt');

    const h = harness();
    const waitUntil = vi.fn();
    h.handlers.install({ waitUntil });
    await waitUntil.mock.calls[0][0];
    expect(h.cache.addAll).toHaveBeenCalledWith([...assets, ...expectedExtras]);
    expect(h.self.skipWaiting).not.toHaveBeenCalled();
    expect(h.self.clients.claim).not.toHaveBeenCalled();
  });

  it.each([
    'https://pilates-flow.web.app',
    'https://pilates-flow.firebaseapp.com',
    'https://pilates-flow.github.io',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
  ])(
    'keeps an open class on its existing worker at %s, including legacy update messages',
    async (origin) => {
      const h = harness({ origin });
      const install = vi.fn();
      h.handlers.install({ waitUntil: install });
      await install.mock.calls[0][0];
      h.handlers.message?.({ data: { type: 'SKIP_WAITING' } });
      h.handlers.message?.({ data: 'SKIP_WAITING' });
      expect(h.self.skipWaiting).not.toHaveBeenCalled();
      expect(h.self.clients.claim).not.toHaveBeenCalled();
      expect(h.caches.delete).not.toHaveBeenCalled();

      // The browser activates the waiting worker after its old clients close.
      const activate = vi.fn();
      h.handlers.activate({ waitUntil: activate });
      await activate.mock.calls[0][0];
      expect(h.caches.delete).toHaveBeenCalledExactlyOnceWith('flow-atelier-shell-old');
      expect(h.self.clients.claim).not.toHaveBeenCalled();
    },
  );

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

  it('never intercepts non-navigation or API requests that carry query strings', () => {
    const h = harness();
    expect(h.request('/?utm_source=pwa', 'cors')).not.toHaveBeenCalled();
    expect(h.request('/index.html?utm_source=pwa', 'cors')).not.toHaveBeenCalled();
    expect(h.request('/api/session?utm_source=pwa', 'cors')).not.toHaveBeenCalled();
    expect(h.request('/icons/app-192.png?v=1', 'no-cors')).not.toHaveBeenCalled();
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it.each(['/', '/?utm_source=pwa', '/?q=%ED%97%8C%EB%93%9C%EB%A0%88%EB%93%9C&apparatus=mat'])(
    'preserves the original navigation request (%s) online when no waiting worker exists',
    async (url) => {
      const h = harness();
      const response = h.request(url, 'navigate');
      expect((await response.mock.calls[0][0]).body).toBe('network');
      expect(h.fetch.mock.calls[0][0].url).toBe(new URL(url, h.self.location.origin).href);
      expect(h.cache.addAll).not.toHaveBeenCalled();
    },
  );

  it('serves cached /index.html first on navigation when a waiting service worker exists so HTML stays pinned to active chunks', async () => {
    const h = harness({ waiting: { state: 'installed' } });
    const response = h.request('/', 'navigate');
    expect(await response.mock.calls[0][0]).toBe(h.cached);
    expect(h.cache.match).toHaveBeenCalledWith('/index.html');
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it('falls back to network on navigation when a waiting service worker exists but cache is empty', async () => {
    const h = harness({ waiting: { state: 'installed' } });
    h.cache.match.mockResolvedValue(undefined as never);
    const response = h.request('/', 'navigate');
    expect((await response.mock.calls[0][0]).body).toBe('network');
    expect(h.fetch).toHaveBeenCalledTimes(1);
  });

  it('updates cached /index.html on 200 basic online navigation only when no waiting worker exists', async () => {
    const h = harness();
    const networkDoc = {
      body: '<html>fresh</html>',
      status: 200,
      type: 'basic',
      redirected: false,
      clone: vi.fn().mockReturnValue({ body: '<html>fresh</html>' }),
    };
    h.fetch.mockResolvedValueOnce(networkDoc);
    const response = h.request('/', 'navigate');
    expect(await response.mock.calls[0][0]).toBe(networkDoc);
    expect(h.cache.put).toHaveBeenCalledWith('/index.html', { body: '<html>fresh</html>' });
  });

  it('pins cached /index.html on navigation when an active worker wakes from idle and a sibling shell cache or installing worker exists', async () => {
    const h = harness();
    (
      h.self.registration as {
        active?: unknown;
        installing?: unknown;
        waiting: unknown;
      }
    ).active = { state: 'activated' };
    (
      h.self.registration as {
        active?: unknown;
        installing?: unknown;
        waiting: unknown;
      }
    ).installing = { state: 'installing' };
    const response = h.request('/', 'navigate');
    expect(await response.mock.calls[0][0]).toBe(h.cached);
    expect(h.cache.match).toHaveBeenCalledWith('/index.html');
    expect(h.fetch).not.toHaveBeenCalled();
    expect(h.cache.put).not.toHaveBeenCalled();
  });

  it('falls back to a sibling flow-atelier-shell-* cache when a chunk request misses in active CACHE and network fails offline', async () => {
    const h = harness();
    const v3ChunkResponse = { body: 'export const stage = "v3";', status: 200 };
    const v2Cache = {
      addAll: vi.fn().mockResolvedValue(undefined),
      match: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
    };
    const v3Cache = {
      addAll: vi.fn().mockResolvedValue(undefined),
      match: vi.fn(async (pathname: string) =>
        pathname === '/assets/LiveStageView-v3.js' ? v3ChunkResponse : undefined,
      ),
      put: vi.fn().mockResolvedValue(undefined),
    };
    h.caches.keys.mockResolvedValue(['flow-atelier-shell-v2', 'flow-atelier-shell-v3']);
    h.caches.open.mockImplementation(async (cacheName: string) =>
      cacheName === 'flow-atelier-shell-v3' ? v3Cache : v2Cache,
    );
    h.fetch.mockRejectedValueOnce(new Error('offline chunk miss'));

    const response = h.request('/assets/LiveStageView-v3.js', 'cors');
    expect(await response.mock.calls[0][0]).toBe(v3ChunkResponse);
    expect(v2Cache.match).toHaveBeenCalledWith('/assets/LiveStageView-v3.js');
    expect(v3Cache.match).toHaveBeenCalledWith('/assets/LiveStageView-v3.js');
    expect(v2Cache.put).not.toHaveBeenCalled();
  });

  it('does not intercept non-SVG metadata files under /images/movement-guides/', () => {
    const h = harness();
    expect(h.request('/images/movement-guides/MANIFEST.json', 'cors')).not.toHaveBeenCalled();
    expect(
      h.request('/images/movement-guides/hip-leg-manifest.json', 'cors'),
    ).not.toHaveBeenCalled();
    expect(h.request('/images/movement-guides/LICENSE.txt', 'cors')).not.toHaveBeenCalled();
  });

  it.each([
    '/',
    '/index.html',
    '/?utm_source=pwa',
    '/index.html?utm_source=pwa',
    '/?q=%ED%97%8C%EB%93%9C%EB%A0%88%EB%93%9C&apparatus=mat',
  ])('opens its exact cached app shell offline for root navigation %s', async (url) => {
    const h = harness();
    h.fetch.mockRejectedValue(new Error('offline'));
    const response = h.request(url, 'navigate');
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
    h.cache.match.mockResolvedValue(undefined as never);
    const response = (await h.request('/', 'navigate').mock.calls[0][0]) as Response;
    expect(response.type).toBe('error');
  });

  it.each([
    '/assets/app-123.js',
    '/icons/app-maskable-512.png',
    '/icons/apple-touch-icon.png',
    '/site.webmanifest',
    '/favicon.svg',
    '/images/movement-guides/reformer-phase-alignment-guide.svg',
    '/images/movement-guides/mat-phase-alignment-guide.svg',
  ])('uses cache-first with network fallback for shell asset %s', async (assetPath) => {
    const h = harness();
    const cachedResponse = h.request(assetPath);
    expect(await cachedResponse.mock.calls[0][0]).toBe(h.cached);
    expect(h.caches.open).toHaveBeenCalledWith('flow-atelier-shell-v2');
    expect(h.fetch).not.toHaveBeenCalled();

    h.cache.match.mockResolvedValueOnce(undefined as never);
    const networkAsset = {
      body: `fresh:${assetPath}`,
      status: 200,
      type: 'basic',
      clone: vi.fn().mockReturnValue({ body: `cloned:${assetPath}` }),
    };
    h.fetch.mockResolvedValueOnce(networkAsset);
    const fallbackResponse = h.request(assetPath);
    expect(await fallbackResponse.mock.calls[0][0]).toBe(networkAsset);
    expect(h.cache.put).toHaveBeenCalledWith(assetPath, { body: `cloned:${assetPath}` });
  });

  it('computes a 16-char SHA-256 version that changes when HTML, bundle chunks, icons, manifest, favicon, or movement guide SVGs change', () => {
    const plugin = pwaBuild();
    const generateBundle = plugin.generateBundle as {
      order: string;
      handler: (
        this: { emitFile: (file: { type: string; fileName: string; source: string }) => void },
        options: unknown,
        bundle: Record<string, { type: string; code?: string; source?: string }>,
      ) => void;
    };

    const runBuildWithOverride = (
      fileOverride?: { path: string; content: Buffer },
      bundleOverride?: Record<string, { type: string; code?: string; source?: string }>,
    ) => {
      const realReadFileSync = fs.readFileSync.bind(fs);
      const spy = vi.spyOn(fs, 'readFileSync').mockImplementation(((
        target: fs.PathOrFileDescriptor,
        ...args: unknown[]
      ) => {
        if (fileOverride && String(target) === fileOverride.path) {
          return fileOverride.content;
        }
        return realReadFileSync(target, ...(args as []));
      }) as typeof fs.readFileSync);

      try {
        const emitted: Array<{ type: string; fileName: string; source: string }> = [];
        const bundle: Record<string, { type: string; code?: string; source?: string }> = {
          'index.html': { type: 'asset', source: '<!doctype html><title>Atelier</title>' },
          'assets/app-123.js': { type: 'chunk', code: 'console.log("v1");' },
          'assets/app-123.css': { type: 'asset', source: 'body{margin:0}' },
          ...bundleOverride,
        };
        generateBundle.handler.call(
          {
            emitFile(file) {
              emitted.push(file);
            },
          },
          {},
          bundle,
        );
        const match = emitted[0]?.source.match(/const CACHE = PREFIX \+ "([a-f0-9]{16})";/);
        expect(match).not.toBeNull();
        return match![1];
      } finally {
        spy.mockRestore();
      }
    };

    const baselineVersion = runBuildWithOverride();
    expect(baselineVersion).toMatch(/^[a-f0-9]{16}$/);

    // Changing index.html changes version
    expect(
      runBuildWithOverride(undefined, {
        'index.html': { type: 'asset', source: '<!doctype html><title>Atelier v2</title>' },
      }),
    ).not.toBe(baselineVersion);

    // Changing JS chunk code changes version
    expect(
      runBuildWithOverride(undefined, {
        'assets/app-123.js': { type: 'chunk', code: 'console.log("v2");' },
      }),
    ).not.toBe(baselineVersion);

    // Changing any icon, manifest, favicon, or movement-guide SVG changes version
    const trackedStaticFiles = [
      ...ICON_PATHS.map((p) => `public${p}`),
      'public/site.webmanifest',
      'public/favicon.svg',
      'public/images/motion-atlas-v3/practitioner.webp',
      'public/images/motion-atlas-v3/equipment.webp',
      ...getMovementGuidePaths().map((p) => `public${p}`),
    ];
    for (const filePath of trackedStaticFiles) {
      const mutated = createHash('sha256').update(filePath).digest();
      const nextVersion = runBuildWithOverride({ path: filePath, content: mutated });
      expect(nextVersion, `Expected version change when mutating ${filePath}`).not.toBe(
        baselineVersion,
      );
    }
  });
});
