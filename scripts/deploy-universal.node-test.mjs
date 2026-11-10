import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import {
  ATELIER_V2_ASSET_PATHS,
  acquireDeployLock,
  markReleaseVerifiedLive,
  resolveFirebaseAuth,
  restorePreviousVerifiedRelease,
  snapshotVerifiedRelease,
  validateCliArgs,
  verifyLiveDeployment,
} from './deploy-universal.mjs';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));

function makePngBytes(width = 512, height = 512) {
  const buf = Buffer.alloc(24);
  Buffer.from('89504e470d0a1a0a', 'hex').copy(buf);
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  return buf;
}

function createDistCheckoutFixture(t, entryName = 'index-NewHash99.js', cssName = 'index-Style99.css') {
  const root = mkdtempSync(path.join(projectRoot, '.deploy-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const dist = path.join(root, 'dist');
  mkdirSync(path.join(dist, 'assets'), { recursive: true });
  mkdirSync(path.join(dist, 'icons'), { recursive: true });
  mkdirSync(path.join(dist, 'images', 'atelier-v2'), { recursive: true });

  writeFileSync(
    path.join(dist, 'index.html'),
    `<!doctype html><html><head><link rel="stylesheet" href="./assets/${cssName}"><script type="module" src="./assets/${entryName}"></script></head><body><div id="root"></div></body></html>`,
  );
  writeFileSync(
    path.join(dist, 'assets', entryName),
    `export const v2 = "${ATELIER_V2_ASSET_PATHS[0]}";`,
  );
  writeFileSync(path.join(dist, 'assets', cssName), 'body { margin: 0; }');
  writeFileSync(path.join(dist, 'icons', 'app-192.png'), makePngBytes(192, 192));
  writeFileSync(path.join(dist, 'icons', 'apple-touch-icon.png'), makePngBytes(180, 180));
  for (const v2Path of ATELIER_V2_ASSET_PATHS) {
    writeFileSync(path.join(dist, v2Path.slice(1)), makePngBytes(1024, 1024));
  }
  const assets = ['/index.html', `/assets/${entryName}`, `/assets/${cssName}`, '/icons/app-192.png'];
  writeFileSync(path.join(dist, 'sw.js'), `const ASSETS = ${JSON.stringify(assets)};`);
  writeFileSync(
    path.join(dist, 'site.webmanifest'),
    JSON.stringify({
      id: '/',
      scope: '/',
      start_url: '/',
      display: 'standalone',
      icons: [{ src: '/icons/app-192.png', sizes: '192x192' }],
    }),
  );

  return { root, dist, entryName, cssName, assets };
}

function makeMockFetch(routes) {
  return async (input) => {
    const url = new URL(String(input));
    const route = routes[url.pathname];
    if (!route) {
      return {
        ok: false,
        status: 404,
        headers: { get: () => 'text/plain' },
        text: async () => 'Not Found',
      };
    }
    const status = route.status ?? 200;
    const headersMap = new Map(
      Object.entries(route.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]),
    );
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: {
        get(name) {
          return headersMap.get(name.toLowerCase()) ?? null;
        },
      },
      text: async () => route.body ?? '',
    };
  };
}

test('validateCliArgs rejects unknown, removed, or conflicting flags so typos never trigger live deploy', () => {
  assert.throws(() => validateCliArgs(['--parallel']), /Unsupported CLI flag/);
  assert.throws(() => validateCliArgs(['--bootstrap']), /Unsupported CLI flag/);
  assert.throws(() => validateCliArgs(['--dry-run']), /Unsupported CLI flag/);
  assert.throws(() => validateCliArgs(['--check-env', '--rollback']), /Conflicting modes/);
  assert.ok(validateCliArgs(['--check-env']).has('--check-env'));
});

test('verifyLiveDeployment succeeds only when entry hash, JS chunk, SW precache, and all 4 V2 PNGs match', async (t) => {
  const { root, entryName, cssName, assets } = createDistCheckoutFixture(t);
  const v2Routes = Object.fromEntries(
    ATELIER_V2_ASSET_PATHS.map((p) => [p, { headers: { 'content-type': 'image/png' } }]),
  );

  process.exitCode = 0;
  const summary = await verifyLiveDeployment({
    rootDir: root,
    quiet: true,
    fetchImpl: makeMockFetch({
      '/index.html': {
        headers: { 'content-type': 'text/html; charset=utf-8' },
        body: `<link rel="stylesheet" href="./assets/${cssName}"><script type="module" src="./assets/${entryName}"></script>`,
      },
      [`/assets/${entryName}`]: {
        headers: { 'content-type': 'application/javascript' },
      },
      '/sw.js': {
        headers: { 'content-type': 'application/javascript' },
        body: `const ASSETS = ${JSON.stringify(assets)};`,
      },
      ...v2Routes,
    }),
  });

  assert.equal(summary.verified, true);
  assert.equal(summary.bundleMatchesLocalDist, true);
  assert.equal(summary.v2Studio3dAssetsLive, true);
  assert.equal(process.exitCode, 0);
});

test('verifyLiveDeployment fails with exitCode 2 when live bundle hash mismatches local dist (no false positive)', async (t) => {
  const { root } = createDistCheckoutFixture(t, 'index-LocalNew99.js', 'index-Style99.css');
  const v2Routes = Object.fromEntries(
    ATELIER_V2_ASSET_PATHS.map((p) => [p, { headers: { 'content-type': 'image/png' } }]),
  );

  process.exitCode = 0;
  const summary = await verifyLiveDeployment({
    rootDir: root,
    quiet: true,
    fetchImpl: makeMockFetch({
      '/index.html': {
        headers: { 'content-type': 'text/html' },
        body: '<link rel="stylesheet" href="./assets/index-Style99.css"><script type="module" src="./assets/index-StaleOld00.js"></script>',
      },
      '/assets/index-StaleOld00.js': {
        headers: { 'content-type': 'application/javascript' },
      },
      '/sw.js': {
        headers: { 'content-type': 'application/javascript' },
        body: 'const ASSETS = ["/index.html","/assets/index-StaleOld00.js"];',
      },
      ...v2Routes,
    }),
  });

  assert.equal(summary.bundleMatchesLocalDist, false);
  assert.equal(summary.verified, false);
  assert.equal(process.exitCode, 2);
  process.exitCode = 0;
});

test('verifyLiveDeployment fails when any of the 4 Atelier V2 PNGs is missing or entry JS returns HTML fallback', async (t) => {
  const { root, entryName, cssName, assets } = createDistCheckoutFixture(t);
  const partialV2Routes = Object.fromEntries(
    ATELIER_V2_ASSET_PATHS.slice(0, 3).map((p) => [p, { headers: { 'content-type': 'image/png' } }]),
  );

  process.exitCode = 0;
  const summary = await verifyLiveDeployment({
    rootDir: root,
    quiet: true,
    fetchImpl: makeMockFetch({
      '/index.html': {
        headers: { 'content-type': 'text/html' },
        body: `<link rel="stylesheet" href="./assets/${cssName}"><script type="module" src="./assets/${entryName}"></script>`,
      },
      [`/assets/${entryName}`]: {
        headers: { 'content-type': 'text/html' },
      },
      '/sw.js': {
        headers: { 'content-type': 'application/javascript' },
        body: `const ASSETS = ${JSON.stringify(assets)};`,
      },
      ...partialV2Routes,
    }),
  });

  assert.equal(summary.entryScriptLive, false);
  assert.equal(summary.v2Studio3dAssetsLive, false);
  assert.equal(summary.verified, false);
  assert.equal(process.exitCode, 2);
  process.exitCode = 0;
});

test('resolveFirebaseAuth never exposes --token on CLI argv and blocks non-interactive ambient auth hijacking', (t) => {
  const tmpHome = mkdtempSync(path.join(os.tmpdir(), 'pf-auth-test-'));
  t.after(() => rmSync(tmpHome, { recursive: true, force: true }));

  const tokenAuth = resolveFirebaseAuth({
    rootDir: tmpHome,
    env: { FIREBASE_TOKEN: 'ci-scoped-token-placeholder' },
    homeDir: tmpHome,
    isInteractive: false,
  });
  assert.equal(tokenAuth.ready, true);
  assert.ok(!tokenAuth.extraArgs.includes('--token'));
  assert.deepEqual(tokenAuth.extraArgs, ['--non-interactive']);
  assert.equal(tokenAuth.extraEnv.FIREBASE_TOKEN, 'ci-scoped-token-placeholder');

  const configstoreDir = path.join(tmpHome, '.config', 'configstore');
  mkdirSync(configstoreDir, { recursive: true });
  writeFileSync(path.join(configstoreDir, 'firebase-tools.json'), '{"user":"demo"}');

  const blockedAmbient = resolveFirebaseAuth({
    rootDir: tmpHome,
    env: {},
    homeDir: tmpHome,
    isInteractive: false,
    allowAmbientAuth: false,
  });
  assert.equal(blockedAmbient.ready, false);
  assert.equal(blockedAmbient.source, 'ambient-blocked-non-interactive');

  const interactiveAmbient = resolveFirebaseAuth({
    rootDir: tmpHome,
    env: {},
    homeDir: tmpHome,
    isInteractive: true,
  });
  assert.equal(interactiveAmbient.ready, true);
  assert.equal(interactiveAmbient.extraEnv.HOME, undefined);
});

test('acquireDeployLock blocks concurrent active PIDs and recovers stale dead-PID locks', (t) => {
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'pf-lock-test-'));
  t.after(() => rmSync(tmpDir, { recursive: true, force: true }));
  const lockPath = path.join(tmpDir, 'deploy.lock');

  const lock = acquireDeployLock(lockPath, { mode: 'deploy' });
  assert.throws(() => acquireDeployLock(lockPath, { mode: 'deploy' }), /already running/);
  lock.release();

  writeFileSync(lockPath, JSON.stringify({ pid: 99999999, startedAt: '2026-01-01T00:00:00Z' }));
  const recovered = acquireDeployLock(lockPath, { mode: 'rollback' });
  recovered.release();
});

test('snapshotVerifiedRelease and restorePreviousVerifiedRelease perform deterministic dist rollback', (t) => {
  const { root, dist } = createDistCheckoutFixture(t, 'index-GoodV1.js', 'index-GoodV1.css');
  const snap1 = snapshotVerifiedRelease(root, { gitCommit: 'aaaa111' });
  markReleaseVerifiedLive(root, snap1.releaseId);

  writeFileSync(
    path.join(dist, 'index.html'),
    '<!doctype html><html><head><script type="module" src="./assets/index-BrokenV2.js"></script></head></html>',
  );
  writeFileSync(
    path.join(dist, 'assets', 'index-BrokenV2.js'),
    `export const broken = "${ATELIER_V2_ASSET_PATHS[0]}";`,
  );
  rmSync(path.join(dist, 'assets', 'index-GoodV1.js'));
  writeFileSync(
    path.join(dist, 'sw.js'),
    'const ASSETS = ["/index.html","/assets/index-BrokenV2.js","/assets/index-GoodV1.css","/icons/app-192.png"];',
  );
  const snap2 = snapshotVerifiedRelease(root, { gitCommit: 'bbbb222' });

  const restored = restorePreviousVerifiedRelease(root, { excludeReleaseId: snap2.releaseId });
  assert.equal(restored.releaseId, snap1.releaseId);
  const restoredHtml = readFileSync(path.join(dist, 'index.html'), 'utf8');
  assert.match(restoredHtml, /index-GoodV1\.js/);
});
