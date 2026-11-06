import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';

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
          .sort();
        const html = bundle['index.html'];
        const version = createHash('sha256')
          .update(JSON.stringify(files))
          .update(html?.type === 'asset' ? html.source : '')
          .update(readFileSync('public/icons/app-192.png'))
          .update(readFileSync('public/icons/app-512.png'))
          .update(serviceWorkerSource.toString())
          .digest('hex')
          .slice(0, 16);
        this.emitFile({
          type: 'asset',
          fileName: 'sw.js',
          source: serviceWorkerSource(version, files),
        });
      },
    },
  };
}

export function serviceWorkerSource(version: string, files: string[]) {
  const assets = [
    '/index.html',
    '/icons/app-192.png',
    '/icons/app-512.png',
    ...files.map((file) => `/${file}`),
  ];
  return `/* Flow Atelier app shell. No user data, auth, APIs or third-party media. */
const PREFIX = 'flow-atelier-shell-';
const CACHE = PREFIX + ${JSON.stringify(version)};
const ASSETS = ${JSON.stringify(assets)};
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  // No skipWaiting: an open lesson must keep its existing version.
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith(PREFIX) && key !== CACHE).map((key) => caches.delete(key)))));
  // No clients.claim or forced reload. Existing tabs keep their state.
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.search) return;
  // Navigations outside the app root (including /__/auth/*) are never intercepted.
  if (request.mode === 'navigate' && (url.pathname === '/' || url.pathname === '/index.html')) {
    event.respondWith(fetch(request).catch(async () => {
      const cache = await caches.open(CACHE);
      return (await cache.match('/index.html')) || Response.error();
    }));
    return;
  }
  if (!ASSETS.includes(url.pathname) || url.pathname === '/index.html') return;
  event.respondWith(caches.open(CACHE).then(async (cache) => (await cache.match(url.pathname)) || fetch(request)));
});
`;
}
