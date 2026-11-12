import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getShellExtras, ICON_PATHS, pwaBuild, serviceWorkerSource } from '../../pwa-build';
import { syncAccountWorkspace } from '../../../src/lib/accountStorage';
import { createRecoveryStorageGuard, RECOVERY_STORAGE_KEY } from '../../../src/lib/recoveryStorageGuard';
import { getRecoveryStorageStatus, usePilatesStore } from '../../../src/store/usePilatesStore';
import { inspectBackupRecovery } from '../../../src/utils/backupRecoveryInspection';
import {
  captureStorageSnapshotDigest,
  populateSyntheticStorage,
  TRACK_A_INSTRUCTOR_ACCOUNT_ID,
  TRACK_A_STORAGE_KEYS,
  verifyStorageSnapshotIntegrity,
} from './synthetic-lesson-fixtures';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../..');
const PUBLIC_DIR = path.join(REPO_ROOT, 'public');
const DIST_DIR = path.join(REPO_ROOT, 'dist');

interface MockCachedResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  redirected: boolean;
  type: 'basic' | 'default' | 'error';
}

class VmResponse implements MockCachedResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  redirected: boolean;
  type: 'basic' | 'default' | 'error';

  constructor(
    body = '',
    init?: {
      status?: number;
      statusText?: string;
      headers?: Record<string, string>;
      redirected?: boolean;
      type?: 'basic' | 'default' | 'error';
    },
  ) {
    this.body = body;
    this.status = init?.status ?? 200;
    this.statusText = init?.statusText ?? 'OK';
    this.headers = { ...(init?.headers ?? {}) };
    this.redirected = init?.redirected ?? false;
    this.type = init?.type ?? 'basic';
  }

  static error(): VmResponse {
    return new VmResponse('', {
      status: 0,
      statusText: '',
      type: 'error',
    });
  }
}

interface SwHarnessOptions {
  origin?: string;
  initialCaches?: Map<string, Map<string, VmResponse>>;
  networkFetch?: (request: {
    url: string;
    method: string;
    mode?: string;
  }) => Promise<VmResponse>;
}

function createServiceWorkerVmHarness(
  swCode: string,
  options: SwHarnessOptions = {},
) {
  const origin = options.origin ?? 'https://pilates-flow.local';
  const cacheStore = options.initialCaches ?? new Map<string, Map<string, VmResponse>>();
  const listeners = new Map<string, Array<(event: unknown) => void>>();
  let skipWaitingCalled = false;
  let clientsClaimCalled = false;

  const currentNetworkFetch = {
    fn:
      options.networkFetch ??
      (async (req: { url: string }) => {
        const pathname = new URL(req.url).pathname;
        return new VmResponse(`network:${pathname}`, {
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': pathname.endsWith('.html') ? 'text/html' : 'application/javascript' },
        });
      }),
  };

  const cachesApi = {
    async open(cacheName: string) {
      if (!cacheStore.has(cacheName)) {
        cacheStore.set(cacheName, new Map<string, VmResponse>());
      }
      const bucket = cacheStore.get(cacheName)!;
      return {
        async addAll(urls: string[]) {
          for (const url of urls) {
            const res = await currentNetworkFetch.fn({
              url: new URL(url, origin).toString(),
              method: 'GET',
            });
            bucket.set(url, res);
          }
        },
        async match(urlOrPath: string) {
          const normalized = urlOrPath.startsWith('http')
            ? new URL(urlOrPath).pathname
            : urlOrPath;
          return bucket.get(normalized);
        },
        async put(urlOrPath: string, response: VmResponse) {
          const normalized = urlOrPath.startsWith('http')
            ? new URL(urlOrPath).pathname
            : urlOrPath;
          bucket.set(normalized, response);
        },
      };
    },
    async keys() {
      return [...cacheStore.keys()];
    },
    async delete(cacheName: string) {
      return cacheStore.delete(cacheName);
    },
  };

  const selfObject = {
    location: new URL(origin),
    skipWaiting: () => {
      skipWaitingCalled = true;
    },
    clients: {
      claim: () => {
        clientsClaimCalled = true;
      },
    },
    addEventListener: (type: string, handler: (event: unknown) => void) => {
      const list = listeners.get(type) ?? [];
      list.push(handler);
      listeners.set(type, list);
    },
  };

  const context = vm.createContext({
    self: selfObject,
    caches: cachesApi,
    URL,
    Response: VmResponse,
    fetch: (request: { url: string; method: string; mode?: string }) =>
      currentNetworkFetch.fn(request),
  });

  vm.runInContext(swCode, context);

  return {
    cacheStore,
    get skipWaitingCalled() {
      return skipWaitingCalled;
    },
    get clientsClaimCalled() {
      return clientsClaimCalled;
    },
    setNetworkFetch(
      fn: (request: { url: string; method: string; mode?: string }) => Promise<VmResponse>,
    ) {
      currentNetworkFetch.fn = fn;
    },
    async dispatchInstall() {
      const handlers = listeners.get('install') ?? [];
      const promises: Promise<unknown>[] = [];
      for (const handler of handlers) {
        handler({
          waitUntil(p: Promise<unknown>) {
            promises.push(p);
          },
        });
      }
      await Promise.all(promises);
    },
    async dispatchActivate() {
      const handlers = listeners.get('activate') ?? [];
      const promises: Promise<unknown>[] = [];
      for (const handler of handlers) {
        handler({
          waitUntil(p: Promise<unknown>) {
            promises.push(p);
          },
        });
      }
      await Promise.all(promises);
    },
    async dispatchFetch(input: {
      url: string;
      method?: string;
      mode?: string;
    }): Promise<{ intercepted: boolean; response: VmResponse | null }> {
      const handlers = listeners.get('fetch') ?? [];
      let responsePromise: Promise<VmResponse> | null = null;
      const fullUrl = input.url.startsWith('http')
        ? input.url
        : new URL(input.url, origin).toString();
      const request = {
        url: fullUrl,
        method: input.method ?? 'GET',
        mode: input.mode ?? 'cors',
      };
      for (const handler of handlers) {
        handler({
          request,
          respondWith(p: Promise<VmResponse> | VmResponse) {
            responsePromise = Promise.resolve(p);
          },
        });
      }
      if (!responsePromise) {
        return { intercepted: false, response: null };
      }
      const response = await responsePromise;
      return { intercepted: true, response };
    },
  };
}

describe('Track A — Manifest, Service Worker Cache Lifecycle, Offline Revisit & Synthetic Lesson Data Preservation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('Test 1: verifies manifest & dist/ build artifact contract, PNG signatures/dimensions, and pwaBuild() deterministic 16-char SHA-256 version', () => {
    const publicManifestRaw = readFileSync(path.join(PUBLIC_DIR, 'site.webmanifest'), 'utf8');
    const distManifestRaw = readFileSync(path.join(DIST_DIR, 'site.webmanifest'), 'utf8');
    expect(distManifestRaw).toBe(publicManifestRaw);

    const manifest = JSON.parse(distManifestRaw) as {
      id: string;
      name: string;
      short_name: string;
      lang: string;
      start_url: string;
      scope: string;
      display: string;
      background_color: string;
      theme_color: string;
      icons: Array<{ src: string; sizes: string; type: string; purpose: string }>;
    };

    expect(manifest.id).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.lang).toBe('ko');
    expect(manifest.theme_color).toBe('#234c3f');
    expect(manifest.background_color).toBe('#f6f5f0');
    expect(manifest.icons).toEqual([
      { src: '/icons/app-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/app-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/app-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ]);

    for (const icon of manifest.icons) {
      const iconPath = path.join(DIST_DIR, icon.src);
      expect(existsSync(iconPath)).toBe(true);
      const bytes = readFileSync(iconPath);
      expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      const width = bytes.readUInt32BE(16);
      const height = bytes.readUInt32BE(20);
      expect(`${width}x${height}`).toBe(icon.sizes);
    }

    const appleTouchIconPath = path.join(DIST_DIR, 'icons/apple-touch-icon.png');
    expect(existsSync(appleTouchIconPath)).toBe(true);
    const appleBytes = readFileSync(appleTouchIconPath);
    expect(appleBytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(appleBytes.readUInt32BE(16)).toBeGreaterThan(0);
    expect(appleBytes.readUInt32BE(20)).toBeGreaterThan(0);

    const plugin = pwaBuild();
    expect(plugin.name).toBe('flow-atelier-pwa');
    expect(plugin.apply).toBe('build');
    expect(plugin.enforce).toBe('post');
    const generateBundle = plugin.generateBundle as {
      order: string;
      handler: (
        this: { emitFile: (emitted: { type: string; fileName: string; source: string }) => void },
        options: unknown,
        bundle: Record<string, { type: string; source?: string; code?: string }>,
      ) => void;
    };
    expect(generateBundle.order).toBe('post');

    const distAssets = readdirSync(path.join(DIST_DIR, 'assets'))
      .filter((file) => /\.(?:js|css)$/.test(file))
      .map((file) => `assets/${file}`)
      .sort();
    const distHtml = readFileSync(path.join(DIST_DIR, 'index.html'), 'utf8');

    const hash = createHash('sha256')
      .update(JSON.stringify(distAssets))
      .update(distHtml);
    for (const file of distAssets) {
      hash.update(readFileSync(path.join(DIST_DIR, file), 'utf8'));
    }
    const shellExtras = getShellExtras(path.join(PUBLIC_DIR, 'images', 'movement-guides'));
    const staticInputPaths = [
      ...ICON_PATHS.map((iconPath) => path.join(PUBLIC_DIR, iconPath)),
      ...shellExtras.map((extraPath) => path.join(PUBLIC_DIR, extraPath)),
    ];
    for (const filePath of staticInputPaths) {
      if (existsSync(filePath)) {
        hash.update(readFileSync(filePath));
      }
    }
    const expectedVersion = hash
      .update(serviceWorkerSource('', distAssets, shellExtras))
      .digest('hex')
      .slice(0, 16);

    expect(expectedVersion).toMatch(/^[a-f0-9]{16}$/);

    const emittedFiles: Array<{ type: string; fileName: string; source: string }> = [];
    const bundleMock: Record<string, { type: string; source?: string; code?: string }> = {
      'index.html': { type: 'asset', source: distHtml },
    };
    for (const file of distAssets) {
      const content = readFileSync(path.join(DIST_DIR, file), 'utf8');
      bundleMock[file] = file.endsWith('.js')
        ? { type: 'chunk', code: content }
        : { type: 'asset', source: content };
    }
    generateBundle.handler.call(
      {
        emitFile(file) {
          emittedFiles.push(file);
        },
      },
      {},
      bundleMock,
    );

    expect(emittedFiles).toHaveLength(1);
    expect(emittedFiles[0]?.fileName).toBe('sw.js');

    const distSwRaw = readFileSync(path.join(DIST_DIR, 'sw.js'), 'utf8');
    expect(emittedFiles[0]?.source).toBe(distSwRaw);
    expect(distSwRaw).toContain(`const CACHE = PREFIX + "${expectedVersion}";`);

    const assetsMatch = distSwRaw.match(/const ASSETS = (\[.*\]);/);
    expect(assetsMatch).not.toBeNull();
    const swAssets = JSON.parse(assetsMatch![1]) as string[];
    expect(new Set(swAssets).size).toBe(swAssets.length);
    for (const assetFile of distAssets) {
      expect(swAssets).toContain(`/${assetFile}`);
    }
  });

  it('Test 2: verifies Service Worker version update lifecycle (v1 -> v2 -> v3) without skipWaiting/clients.claim and with selective cache cleanup', async () => {
    const sharedCacheStore = new Map<string, Map<string, VmResponse>>();
    sharedCacheStore.set(
      'user-custom-cache',
      new Map([['/custom-entry', new VmResponse('keep-user-cache')]]),
    );
    sharedCacheStore.set(
      'workbox-other',
      new Map([['/workbox-entry', new VmResponse('keep-workbox-cache')]]),
    );

    const v1Files = ['assets/index-v1.js', 'assets/index-v1.css'];
    const v2Files = ['assets/index-v2.js', 'assets/index-v2.css'];
    const v3Files = ['assets/index-v3.js', 'assets/index-v3.css'];

    const swV1 = createServiceWorkerVmHarness(
      serviceWorkerSource('1111111111111111', v1Files),
      { initialCaches: sharedCacheStore },
    );
    await swV1.dispatchInstall();
    expect(swV1.skipWaitingCalled).toBe(false);
    expect(swV1.clientsClaimCalled).toBe(false);
    expect(sharedCacheStore.has('flow-atelier-shell-1111111111111111')).toBe(true);
    expect(sharedCacheStore.get('flow-atelier-shell-1111111111111111')?.size).toBe(
      1 + ICON_PATHS.length + v1Files.length + getShellExtras().length,
    );

    await swV1.dispatchActivate();
    expect(swV1.clientsClaimCalled).toBe(false);

    // Install v2 while v1 is still active and serving open lessons
    const swV2 = createServiceWorkerVmHarness(
      serviceWorkerSource('2222222222222222', v2Files),
      { initialCaches: sharedCacheStore },
    );
    await swV2.dispatchInstall();
    expect(swV2.skipWaitingCalled).toBe(false);

    // Both v1 and v2 caches coexist while v2 is waiting
    expect(sharedCacheStore.has('flow-atelier-shell-1111111111111111')).toBe(true);
    expect(sharedCacheStore.has('flow-atelier-shell-2222222222222222')).toBe(true);

    // Open v1 lesson continues to be served from v1 cache even when network is offline
    swV1.setNetworkFetch(async () => {
      throw new Error('offline during open v1 lesson');
    });
    const v1ChunkRes = await swV1.dispatchFetch({ url: '/assets/index-v1.js' });
    expect(v1ChunkRes.intercepted).toBe(true);
    expect(v1ChunkRes.response?.body).toBe('network:/assets/index-v1.js');

    // Activate v2 after v1 tab closes: deletes ONLY flow-atelier-shell-1111111111111111
    await swV2.dispatchActivate();
    expect(swV2.clientsClaimCalled).toBe(false);
    expect(sharedCacheStore.has('flow-atelier-shell-1111111111111111')).toBe(false);
    expect(sharedCacheStore.has('flow-atelier-shell-2222222222222222')).toBe(true);
    expect(sharedCacheStore.has('user-custom-cache')).toBe(true);
    expect(sharedCacheStore.has('workbox-other')).toBe(true);

    // Upgrade to v3
    const swV3 = createServiceWorkerVmHarness(
      serviceWorkerSource('3333333333333333', v3Files),
      { initialCaches: sharedCacheStore },
    );
    await swV3.dispatchInstall();
    expect(sharedCacheStore.has('flow-atelier-shell-2222222222222222')).toBe(true);
    expect(sharedCacheStore.has('flow-atelier-shell-3333333333333333')).toBe(true);
    await swV3.dispatchActivate();
    expect([...sharedCacheStore.keys()].sort()).toEqual([
      'flow-atelier-shell-3333333333333333',
      'user-custom-cache',
      'workbox-other',
    ]);
  });

  it('Test 3: verifies offline revisit, cleanUrls redirect neutralization, fail-closed Response.error(), and strict bypass of auth/API/query/POST/cross-origin', async () => {
    const cacheStore = new Map<string, Map<string, VmResponse>>();
    const files = ['assets/index-C7TJ7aoR.js', 'assets/index-Bofjvovv.css'];
    const sw = createServiceWorkerVmHarness(serviceWorkerSource('bad4e3f640aa9380', files), {
      initialCaches: cacheStore,
      networkFetch: async (req) => {
        const pathname = new URL(req.url).pathname;
        if (pathname === '/index.html') {
          // Simulate Firebase Hosting cleanUrls where cached /index.html was marked redirected
          return new VmResponse('<!doctype html><title>Flow Atelier</title>', {
            status: 200,
            statusText: 'OK',
            headers: { 'content-type': 'text/html; charset=utf-8', 'x-clean-urls': '1' },
            redirected: true,
          });
        }
        return new VmResponse(`asset:${pathname}`, {
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/javascript' },
        });
      },
    });

    await sw.dispatchInstall();
    await sw.dispatchActivate();

    // Switch network to offline
    sw.setNetworkFetch(async () => {
      throw new Error('net::ERR_INTERNET_DISCONNECTED');
    });

    // Offline navigation to '/' neutralizes redirected flag while preserving body/status/headers
    const navRoot = await sw.dispatchFetch({ url: '/', mode: 'navigate' });
    expect(navRoot.intercepted).toBe(true);
    expect(navRoot.response?.status).toBe(200);
    expect(navRoot.response?.statusText).toBe('OK');
    expect(navRoot.response?.headers['content-type']).toBe('text/html; charset=utf-8');
    expect(navRoot.response?.headers['x-clean-urls']).toBe('1');
    expect(navRoot.response?.body).toContain('Flow Atelier');
    expect(navRoot.response?.redirected).toBe(false);

    // Offline navigation when cached /index.html is not redirected returns cached directly
    const shellBucket = cacheStore.get('flow-atelier-shell-bad4e3f640aa9380')!;
    shellBucket.set(
      '/index.html',
      new VmResponse('<!doctype html><title>Direct Cached</title>', {
        status: 200,
        redirected: false,
      }),
    );
    const navIndex = await sw.dispatchFetch({ url: '/index.html', mode: 'navigate' });
    expect(navIndex.intercepted).toBe(true);
    expect(navIndex.response?.redirected).toBe(false);
    expect(navIndex.response?.body).toContain('Direct Cached');

    // Fail-closed Response.error() when /index.html is missing from cache during offline navigation
    shellBucket.delete('/index.html');
    const navMissing = await sw.dispatchFetch({ url: '/', mode: 'navigate' });
    expect(navMissing.intercepted).toBe(true);
    expect(navMissing.response?.type).toBe('error');
    expect(navMissing.response?.status).toBe(0);

    // Strict bypasses: auth paths, API paths, query strings, POST requests, non-navigate /index.html, cross-origin
    const bypassCases: Array<{ url: string; method?: string; mode?: string }> = [
      { url: '/__/auth/handler', mode: 'navigate' },
      { url: '/__/auth/iframe', mode: 'cors' },
      { url: '/api/sync', mode: 'cors' },
      { url: '/?code=oauth_code_123', mode: 'navigate' },
      { url: '/index.html?oobCode=reset_token_456', mode: 'navigate' },
      { url: '/assets/index-C7TJ7aoR.js?v=123', mode: 'cors' },
      { url: '/assets/index-C7TJ7aoR.js', method: 'POST', mode: 'cors' },
      { url: '/index.html', method: 'GET', mode: 'cors' },
      { url: 'https://www.googleapis.com/identitytoolkit/v3/relyingparty', mode: 'cors' },
    ];

    for (const testCase of bypassCases) {
      const result = await sw.dispatchFetch(testCase);
      expect(result.intercepted, `Expected strict bypass for ${testCase.url}`).toBe(false);
    }
  });

  it('Test 4: preserves 100% of synthetic Pilates lesson data across full SW lifecycle (v1 install -> offline revisit -> v2 waiting -> v2 activate -> offline revisit)', async () => {
    // Align module-level tabOwner with ACTIVE_OWNER_KEY (as happens on browser page load when localStorage is already seeded)
    localStorage.setItem(TRACK_A_STORAGE_KEYS.activeOwnerKey, TRACK_A_INSTRUCTOR_ACCOUNT_ID);
    syncAccountWorkspace(TRACK_A_INSTRUCTOR_ACCOUNT_ID);

    const dataset = populateSyntheticStorage(localStorage);
    const baselineDigest = captureStorageSnapshotDigest(localStorage);
    if (process.env.TRACK_A_SEED_OUT_PATH) {
      writeFileSync(
        process.env.TRACK_A_SEED_OUT_PATH,
        JSON.stringify({ rawByKey: dataset.rawByKey, baselineDigest }),
        'utf8',
      );
    }

    expect(baselineDigest.keyCount).toBe(7);
    expect(baselineDigest.domainSummary).toEqual({
      activeSequenceId: 'seq-track-a-active-50m',
      activeTargetMinutes: 50,
      activeStepsCount: 10,
      activeStepsTotalMinutes: 50,
      customExercisesCount: 2,
      totalExercisesCount: dataset.persistedEnvelope.state.exercises.length,
      savedSequencesCount: 2,
      classGroupsCount: dataset.persistedEnvelope.state.classGroups.length,
      historyLogsCount: 1,
      conditionTemplatesCount: 2,
      scheduledClassesCount: 2,
      datedAssignmentsCount: 2,
      bookmarkedExercisesCount: 4,
    });

    // Verify recoveryStorageGuard and store hydration
    const externalGuard = createRecoveryStorageGuard(() =>
      localStorage.getItem(RECOVERY_STORAGE_KEY),
    );
    externalGuard.observedRead(localStorage.getItem(RECOVERY_STORAGE_KEY));
    const initialGuardCheck = externalGuard.check();
    expect(initialGuardCheck.ok).toBe(true);

    await usePilatesStore.persist.rehydrate();
    syncAccountWorkspace(TRACK_A_INSTRUCTOR_ACCOUNT_ID);

    const storeAfterHydrate = usePilatesStore.getState();
    expect(storeAfterHydrate.activeSequenceId).toBe('seq-track-a-active-50m');
    expect(storeAfterHydrate.activeApparatus).toBe('reformer');
    expect(storeAfterHydrate.activeLevel).toBe('1.5');
    expect(storeAfterHydrate.activeTargetMinutes).toBe(50);
    expect(storeAfterHydrate.exerciseBrowseScope).toBe('all');
    expect(storeAfterHydrate.activeSteps).toHaveLength(10);
    expect(storeAfterHydrate.savedSequences).toHaveLength(2);
    expect(storeAfterHydrate.historyLogs).toHaveLength(1);
    expect(storeAfterHydrate.conditionTemplates).toHaveLength(2);
    expect(storeAfterHydrate.instructorSchedule.classes).toHaveLength(2);
    expect(storeAfterHydrate.datedSequencePlanning?.assignments).toHaveLength(2);
    expect(storeAfterHydrate.instructorStudyState?.bookmarkedExerciseIds).toHaveLength(4);

    // Capture digest after store hydration & account workspace sync
    const hydratedDigest = captureStorageSnapshotDigest(localStorage);
    expect(verifyStorageSnapshotIntegrity(baselineDigest, hydratedDigest)).toEqual({
      intact: true,
      zeroByteLoss: true,
      overallSha256Match: true,
      mismatchedKeys: [],
    });

    // Run full SW lifecycle (v1 install -> offline revisit -> v2 waiting -> v2 activate -> offline revisit)
    const cacheStore = new Map<string, Map<string, VmResponse>>();
    const swV1 = createServiceWorkerVmHarness(
      serviceWorkerSource('v100000000000001', ['assets/index-v1.js']),
      { initialCaches: cacheStore },
    );
    await swV1.dispatchInstall();
    await swV1.dispatchActivate();

    // Step A: Offline revisit on v1
    swV1.setNetworkFetch(async () => {
      throw new Error('offline revisit v1');
    });
    const offlineNavV1 = await swV1.dispatchFetch({ url: '/', mode: 'navigate' });
    expect(offlineNavV1.intercepted).toBe(true);
    expect(offlineNavV1.response?.status).toBe(200);
    await usePilatesStore.persist.rehydrate();
    const afterV1OfflineDigest = captureStorageSnapshotDigest(localStorage);
    expect(verifyStorageSnapshotIntegrity(baselineDigest, afterV1OfflineDigest).intact).toBe(true);

    // Step B: Online v2 waiting update while v1 lesson is open
    const swV2 = createServiceWorkerVmHarness(
      serviceWorkerSource('v200000000000002', ['assets/index-v2.js']),
      { initialCaches: cacheStore },
    );
    await swV2.dispatchInstall();
    const afterV2WaitingDigest = captureStorageSnapshotDigest(localStorage);
    expect(verifyStorageSnapshotIntegrity(baselineDigest, afterV2WaitingDigest).intact).toBe(true);

    // Step C: v2 activates and user revisits offline
    await swV2.dispatchActivate();
    swV2.setNetworkFetch(async () => {
      throw new Error('offline revisit v2');
    });
    const offlineNavV2 = await swV2.dispatchFetch({ url: '/', mode: 'navigate' });
    expect(offlineNavV2.intercepted).toBe(true);
    expect(offlineNavV2.response?.status).toBe(200);
    await usePilatesStore.persist.rehydrate();

    expect(usePilatesStore.getState().exerciseBrowseScope).toBe('all');
    const finalDigest = captureStorageSnapshotDigest(localStorage);
    expect(verifyStorageSnapshotIntegrity(baselineDigest, finalDigest)).toEqual({
      intact: true,
      zeroByteLoss: true,
      overallSha256Match: true,
      mismatchedKeys: [],
    });

    // Verify recoveryStorageGuard & backup export/inspection remain 100% valid
    const storeStatus = getRecoveryStorageStatus();
    expect(storeStatus.ok).toBe(true);
    const exportedJson = usePilatesStore.getState().exportBackup();
    const inspection = inspectBackupRecovery(exportedJson, usePilatesStore.getState());
    expect(inspection.success).toBe(true);
    if (inspection.success) {
      expect(inspection.summary.conflicts).toBe(0);
    }

    for (const key of Object.values(TRACK_A_STORAGE_KEYS)) {
      expect(localStorage.getItem(key)).not.toBeNull();
    }
  });

  describe('Test 5: Verifies Track P4 remediations for Track A audit findings (A-F1, A-F2, A-F3)', () => {
    it('Finding A-F1 (Remediated): auxiliary PWA assets (site.webmanifest, favicon.svg, apple-touch-icon.png, app-maskable-512.png) are precached and included in version hash input', async () => {
      const swCode = readFileSync(path.join(DIST_DIR, 'sw.js'), 'utf8');
      const assetsMatch = swCode.match(/const ASSETS = (\[.*\]);/);
      const shellExtrasMatch = swCode.match(/const SHELL_EXTRAS = (\[.*\]);/);
      const swAssets = JSON.parse(assetsMatch![1]) as string[];
      const swExtras = JSON.parse(shellExtrasMatch![1]) as string[];
      const precacheList = [...swAssets, ...swExtras];

      const auxiliaryPwaFiles = [
        '/site.webmanifest',
        '/favicon.svg',
        '/icons/apple-touch-icon.png',
        '/icons/app-maskable-512.png',
      ];

      for (const file of auxiliaryPwaFiles) {
        expect(existsSync(path.join(DIST_DIR, file))).toBe(true);
        expect(precacheList).toContain(file);
      }

      const sw = createServiceWorkerVmHarness(swCode);
      await sw.dispatchInstall();
      await sw.dispatchActivate();
      sw.setNetworkFetch(async () => {
        throw new Error('offline');
      });

      for (const file of auxiliaryPwaFiles) {
        const res = await sw.dispatchFetch({ url: file, mode: 'cors' });
        expect(res.intercepted).toBe(true);
        expect(res.response?.status).toBe(200);
      }

      // Also verify pwa-build.ts source includes these files in its SHA-256 hash calculation
      const pwaBuildSource = readFileSync(path.join(REPO_ROOT, 'scripts/pwa-build.ts'), 'utf8');
      expect(pwaBuildSource).toContain('/icons/app-192.png');
      expect(pwaBuildSource).toContain('/icons/app-512.png');
      expect(pwaBuildSource).toContain('/site.webmanifest');
      expect(pwaBuildSource).toContain('/favicon.svg');
      expect(pwaBuildSource).toContain('/icons/apple-touch-icon.png');
      expect(pwaBuildSource).toContain('/icons/app-maskable-512.png');
    });

    it('Finding A-F2 (Remediated): online root navigation (/) while v2 SW is waiting serves v1 cached /index.html instead of fetching v2 HTML under active v1 SW controller', async () => {
      const cacheStore = new Map<string, Map<string, VmResponse>>();
      const v1Files = ['assets/index-v1.js'];
      const v2Files = ['assets/index-v2.js'];

      // v1 installs and activates
      const swV1 = createServiceWorkerVmHarness(
        serviceWorkerSource('v111111111111111', v1Files),
        { initialCaches: cacheStore },
      );
      await swV1.dispatchInstall();
      await swV1.dispatchActivate();

      // New deployment happens on server: / now serves v2 HTML referencing /assets/index-v2.js,
      // and v2 SW installs into waiting state (no skipWaiting) while v1 SW still controls the tab.
      const swV2 = createServiceWorkerVmHarness(
        serviceWorkerSource('v222222222222222', v2Files),
        { initialCaches: cacheStore },
      );
      await swV2.dispatchInstall();

      swV1.setNetworkFetch(async (req) => {
        const pathname = new URL(req.url).pathname;
        if (pathname === '/') {
          return new VmResponse(
            '<!doctype html><script type="module" src="/assets/index-v2.js"></script>',
            { status: 200 },
          );
        }
        throw new Error(`network unavailable for ${pathname}`);
      });

      // User reloads '/' while online: active v1 SW detects waiting v2 cache via hasWaitingUpdate()
      // and serves v1's cached /index.html so HTML and JS chunks never mismatch!
      const onlineReload = await swV1.dispatchFetch({ url: '/', mode: 'navigate' });
      expect(onlineReload.intercepted).toBe(true);
      expect(onlineReload.response?.body).toBe('network:/index.html');
      expect(onlineReload.response?.body).not.toContain('/assets/index-v2.js');

      // v1's own script remains served from v1's cache offline
      const v1ScriptUnderV1Controller = await swV1.dispatchFetch({
        url: '/assets/index-v1.js',
        mode: 'cors',
      });
      expect(v1ScriptUnderV1Controller.intercepted).toBe(true);
      expect(v1ScriptUnderV1Controller.response?.body).toBe('network:/assets/index-v1.js');
    });

    it('Finding A-F3 (Remediated): during first-time SW install, pwa.ts keeps offlineStatus as "preparing" when worker enters registration.waiting before active exists', async () => {
      vi.resetModules();
      vi.stubGlobal('isSecureContext', true);
      vi.stubGlobal(
        'matchMedia',
        vi.fn(() => Object.assign(new EventTarget(), { matches: false })),
      );

      const worker = Object.assign(new EventTarget(), {
        state: 'installing' as ServiceWorkerState,
      });
      const registration = Object.assign(new EventTarget(), {
        active: null as ServiceWorker | null,
        waiting: null as ServiceWorker | null,
        installing: worker as ServiceWorker | null,
      });

      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: {
          register: vi.fn().mockResolvedValue(registration),
        },
      });

      const pwa = await import('../../../src/lib/pwa');
      pwa.startPwa();
      await Promise.resolve();
      expect(pwa.getPwaState().offlineStatus).toBe('preparing');

      // First-time install completes downloading/caching: worker state becomes 'installed'
      // and browser places worker in registration.waiting while registration.active is still null.
      worker.state = 'installed';
      registration.installing = null;
      registration.waiting = worker as unknown as ServiceWorker;
      worker.dispatchEvent(new Event('statechange'));

      // Because update() checks `registration.waiting && registration.active ? 'update-ready' : ...`,
      // a brand-new first install remains 'preparing' until activation completes.
      expect(registration.active).toBeNull();
      expect(pwa.getPwaState().offlineStatus).toBe('preparing');

      // Once activation completes, it becomes 'ready'
      worker.state = 'activated';
      registration.waiting = null;
      registration.active = worker as unknown as ServiceWorker;
      worker.dispatchEvent(new Event('statechange'));
      expect(pwa.getPwaState().offlineStatus).toBe('ready');

      vi.unstubAllGlobals();
    });
  });
});
