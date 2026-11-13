import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { compareCodeUnits } from '../src/utils/compareCodeUnits';

export const ICON_PATHS = [
  '/icons/app-192.png',
  '/icons/app-512.png',
  '/icons/app-maskable-512.png',
  '/icons/apple-touch-icon.png',
] as const;

export function getMovementGuidePaths(
  movementGuideDir = path.join('public', 'images', 'movement-guides'),
): string[] {
  if (!fs.existsSync(movementGuideDir)) return [];
  return fs
    .readdirSync(movementGuideDir)
    .filter((file) => file.endsWith('.svg'))
    .sort(compareCodeUnits)
    .map((file) => `/images/movement-guides/${file}`);
}

export function getShellExtras(
  movementGuideDir = path.join('public', 'images', 'movement-guides'),
): string[] {
  return ['/site.webmanifest', '/favicon.svg', ...getMovementGuidePaths(movementGuideDir)];
}

/** A build-scoped cache: never mix a new HTML document with an old JS graph. */
export function pwaBuild(): Plugin {
  return {
    name: 'flow-atelier-pwa',
    apply: 'build',
    enforce: 'post',
    generateBundle: {
      order: 'post',
      handler(_, bundle) {
        const files = Object.keys(bundle)
          .filter((file) => /\.(?:js|css)$/.test(file))
          .sort(compareCodeUnits);
        const html = bundle['index.html'];
        const hash = createHash('sha256')
          .update(JSON.stringify(files))
          .update(html?.type === 'asset' ? html.source : '');

        for (const file of files) {
          const entry = bundle[file];
          if (entry?.type === 'chunk' && typeof entry.code === 'string') {
            hash.update(entry.code);
          } else if (entry?.type === 'asset' && entry.source !== undefined) {
            hash.update(entry.source);
          }
        }

        const shellExtras = getShellExtras();
        const staticInputPaths = [
          ...ICON_PATHS.map((iconPath) => `public${iconPath}`),
          ...shellExtras.map((extraPath) => `public${extraPath}`),
        ];
        for (const filePath of staticInputPaths) {
          if (fs.existsSync(filePath)) {
            hash.update(fs.readFileSync(filePath));
          }
        }

        // Hash the worker that browsers receive, with a fixed version placeholder.
        // Function serialization varies between the Vite and test module loaders.
        const version = hash
          .update(serviceWorkerSource('', files, shellExtras))
          .digest('hex')
          .slice(0, 16);
        this.emitFile({
          type: 'asset',
          fileName: 'sw.js',
          source: serviceWorkerSource(version, files, shellExtras),
        });
      },
    },
  };
}

export function serviceWorkerSource(
  version: string,
  files: string[],
  shellExtras: string[] = getShellExtras(),
) {
  const normalizedFiles = files.map((file) => (file.startsWith('/') ? file : `/${file}`));
  const assets = Array.from(new Set(['/index.html', ...ICON_PATHS, ...normalizedFiles]));
  const extras = Array.from(new Set(shellExtras.filter((item) => !assets.includes(item))));
  return `/* Flow Atelier app shell. No user data, auth, APIs or third-party media. */
const PREFIX = 'flow-atelier-shell-';
const CACHE = PREFIX + ${JSON.stringify(version)};
const ASSETS = ${JSON.stringify(assets)};
const SHELL_EXTRAS = ${JSON.stringify(extras)};
const PRECACHE = [...ASSETS, ...SHELL_EXTRAS];
let activated = false;
const toDocumentResponse = (cached) =>
  cached && cached.redirected
    ? new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers: cached.headers,
      })
    : cached;
const hasWaitingUpdate = async () => {
  if (
    self.registration &&
    (self.registration.waiting || (self.registration.active && self.registration.installing))
  ) {
    return true;
  }
  if (
    (!activated && !(self.registration && self.registration.active)) ||
    typeof caches.keys !== 'function'
  ) {
    return false;
  }
  const keys = await caches.keys();
  return Array.isArray(keys) && keys.some((key) => key.startsWith(PREFIX) && key !== CACHE);
};
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)),
  );
  // No skipWaiting: an open lesson must keep its existing version.
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(PREFIX) && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => {
        activated = true;
      }),
  );
  // No clients.claim or forced reload. Existing tabs keep their state.
});
// Older app tabs send SKIP_WAITING automatically. Do not honor that legacy
// message: activation and old-cache cleanup must wait until those tabs close.
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Navigations outside the app root (including /__/auth/* and auth callback params) are never intercepted.
  if (
    request.mode === 'navigate' &&
    (url.pathname === '/' || url.pathname === '/index.html') &&
    !/(?:^|[?&])(?:code|state|oobCode|apiKey)=/.test(url.search)
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        if (await hasWaitingUpdate()) {
          const pinned = (await cache.match('/index.html')) || (await cache.match('/'));
          if (pinned) return toDocumentResponse(pinned);
          try {
            return await fetch(request);
          } catch {
            return Response.error();
          }
        }
        try {
          const response = await fetch(request);
          if (
            !(await hasWaitingUpdate()) &&
            response &&
            response.status === 200 &&
            response.type === 'basic' &&
            !response.redirected &&
            typeof cache.put === 'function'
          ) {
            await cache.put(
              '/index.html',
              typeof response.clone === 'function' ? response.clone() : response,
            );
          }
          return response;
        } catch {
          const cached = (await cache.match('/index.html')) || (await cache.match('/'));
          if (!cached) return Response.error();
          return toDocumentResponse(cached);
        }
      })(),
    );
    return;
  }
  if (url.search || url.pathname === '/index.html') return;
  const isShellAsset =
    PRECACHE.includes(url.pathname) ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    (url.pathname.startsWith('/images/movement-guides/') && url.pathname.endsWith('.svg')) ||
    (url.pathname.startsWith('/motion-artwork-v2/') && url.pathname.endsWith('.svg')) ||
    (url.pathname.startsWith('/motion-studio3d/') && (url.pathname.endsWith('.png') || url.pathname.endsWith('.webp')));
  if (!isShellAsset) return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(url.pathname);
      if (cached) return cached;
      if (url.pathname.startsWith('/motion-studio3d/')) {
        const motionCache = await caches.open('flow-atelier-studio3d-lossless-v3');
        const prewarmed = await motionCache.match(url.pathname);
        if (prewarmed) return prewarmed;
      }
      try {
        const response = await fetch(request);
        if (
          response &&
          response.status === 200 &&
          response.type === 'basic' &&
          typeof cache.put === 'function'
        ) {
          await cache.put(
            url.pathname,
            typeof response.clone === 'function' ? response.clone() : response,
          );
        }
        return response;
      } catch (error) {
        if (typeof caches.keys === 'function') {
          const keys = await caches.keys();
          for (const key of Array.isArray(keys) ? keys : []) {
            if (key.startsWith(PREFIX) && key !== CACHE) {
              const siblingCache = await caches.open(key);
              const siblingMatch = await siblingCache.match(url.pathname);
              if (siblingMatch) return siblingMatch;
            }
          }
        }
        throw error;
      }
    }),
  );
});
`;
}

export const createServiceWorkerSource = serviceWorkerSource;
