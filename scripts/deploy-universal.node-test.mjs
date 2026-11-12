import assert from 'node:assert/strict';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import {
  ATELIER_V2_ASSET_PATHS,
  acquireDeployLock,
  formatDeployDoctorReport,
  isPlaceholderCredentialValue,
  loadLocalDeployEnvMap,
  markReleaseVerifiedLive,
  parseServiceAccountJsonString,
  prepareAuthExecutionEnv,
  resolveFirebaseAuth,
  restoreManualRollbackRelease,
  restorePreviousVerifiedRelease,
  snapshotVerifiedRelease,
  validateCliArgs,
  verifyLiveDeployment,
} from './deploy-universal.mjs';
import { importServiceAccountFile, upsertEnvFileEntries } from './setup-deploy-auth.mjs';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));

function makePngBytes(width = 512, height = 512) {
  const buf = Buffer.alloc(24);
  Buffer.from('89504e470d0a1a0a', 'hex').copy(buf);
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  return buf;
}

function createDistCheckoutFixture(
  t,
  entryName = 'index-NewHash99.js',
  cssName = 'index-Style99.css',
) {
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
  const assets = [
    '/index.html',
    `/assets/${entryName}`,
    `/assets/${cssName}`,
    '/icons/app-192.png',
  ];
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

test('validateCliArgs rejects unknown, removed, or conflicting flags and accepts --doctor / --wait-cdn', () => {
  assert.throws(() => validateCliArgs(['--parallel']), /Unsupported CLI flag/);
  assert.throws(() => validateCliArgs(['--bootstrap']), /Unsupported CLI flag/);
  assert.throws(() => validateCliArgs(['--dry-run']), /Unsupported CLI flag/);
  assert.throws(() => validateCliArgs(['--check-env', '--rollback']), /Conflicting modes/);
  assert.throws(() => validateCliArgs(['--doctor', '--check-env']), /Conflicting modes/);
  assert.ok(validateCliArgs(['--check-env']).has('--check-env'));
  assert.ok(validateCliArgs(['--doctor']).has('--doctor'));
  assert.ok(validateCliArgs(['--verify-live', '--wait-cdn']).has('--wait-cdn'));
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
      '/': {
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

test('verifyLiveDeployment retries CDN edge propagation when maxAttempts > 1 and succeeds once edge updates', async (t) => {
  const { root, entryName, cssName, assets } = createDistCheckoutFixture(
    t,
    'index-FreshV3.js',
    'index-FreshV3.css',
  );
  const v2Routes = Object.fromEntries(
    ATELIER_V2_ASSET_PATHS.map((p) => [p, { headers: { 'content-type': 'image/png' } }]),
  );

  let indexHits = 0;
  process.exitCode = 0;
  const summary = await verifyLiveDeployment({
    rootDir: root,
    quiet: true,
    maxAttempts: 3,
    retryDelayMs: 5,
    fetchImpl: async (input) => {
      const url = new URL(String(input));
      if (url.pathname === '/') {
        indexHits += 1;
        const servedEntry = indexHits < 2 ? 'index-StaleEdge.js' : entryName;
        return {
          ok: true,
          status: 200,
          headers: {
            get: (name) => (name.toLowerCase() === 'content-type' ? 'text/html' : null),
          },
          text: async () =>
            `<link rel="stylesheet" href="./assets/${cssName}"><script type="module" src="./assets/${servedEntry}"></script>`,
        };
      }
      return makeMockFetch({
        '/assets/index-StaleEdge.js': { headers: { 'content-type': 'application/javascript' } },
        [`/assets/${entryName}`]: { headers: { 'content-type': 'application/javascript' } },
        '/sw.js': {
          headers: { 'content-type': 'application/javascript' },
          body: `const ASSETS = ${JSON.stringify(assets)};`,
        },
        ...v2Routes,
      })(input);
    },
  });

  assert.equal(summary.verified, true);
  assert.equal(summary.attemptsUsed, 2);
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
      '/': {
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
    ATELIER_V2_ASSET_PATHS.slice(0, 3).map((p) => [
      p,
      { headers: { 'content-type': 'image/png' } },
    ]),
  );

  process.exitCode = 0;
  const summary = await verifyLiveDeployment({
    rootDir: root,
    quiet: true,
    fetchImpl: makeMockFetch({
      '/': {
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

test('resolveFirebaseAuth supports env, .env.local, .firebase/service-account.json, and Base64 JSON while never exposing --token on CLI argv', (t) => {
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

  // Fallback to .env.local when .env.deploy.local is absent
  writeFileSync(path.join(tmpHome, '.env.local'), 'FIREBASE_TOKEN=local-env-token-placeholder\n');
  const envLocalAuth = resolveFirebaseAuth({
    rootDir: tmpHome,
    env: {},
    homeDir: tmpHome,
    isInteractive: false,
  });
  assert.equal(envLocalAuth.ready, true);
  assert.equal(envLocalAuth.source, 'file:.env.local(FIREBASE_TOKEN)');
  rmSync(path.join(tmpHome, '.env.local'));

  // Base64-encoded service account JSON + ephemeral temp file cleanup
  const syntheticSaJson = JSON.stringify({
    type: 'service_account',
    project_id: 'deskcloud-fleet-auth',
    client_email: 'deploy-bot@deskcloud-fleet-auth.iam.gserviceaccount.com',
    private_key: 'synthetic-test-key-material',
  });
  const base64Sa = Buffer.from(syntheticSaJson, 'utf8').toString('base64');
  assert.equal(parseServiceAccountJsonString(base64Sa)?.project_id, 'deskcloud-fleet-auth');

  writeFileSync(path.join(tmpHome, '.env.deploy.local'), `FIREBASE_SERVICE_ACCOUNT=${base64Sa}\n`);
  const inlineSaAuth = resolveFirebaseAuth({
    rootDir: tmpHome,
    env: {},
    homeDir: tmpHome,
    isInteractive: false,
  });
  assert.equal(inlineSaAuth.ready, true);
  assert.equal(inlineSaAuth.source, 'file:.env.deploy.local(FIREBASE_SERVICE_ACCOUNT)');
  const prepared = prepareAuthExecutionEnv(inlineSaAuth);
  assert.ok(existsSync(prepared.extraEnv.GOOGLE_APPLICATION_CREDENTIALS));
  prepared.cleanup();
  assert.equal(existsSync(prepared.extraEnv.GOOGLE_APPLICATION_CREDENTIALS), false);
  rmSync(path.join(tmpHome, '.env.deploy.local'));

  // importServiceAccountFile writes .firebase/service-account.json + .env.deploy.local
  const externalSaPath = path.join(tmpHome, 'downloaded-sa.json');
  writeFileSync(externalSaPath, syntheticSaJson);
  upsertEnvFileEntries(path.join(tmpHome, '.env.deploy.local'), { KEEP_OTHER_KEY: 'yes' });
  const imported = importServiceAccountFile(externalSaPath, tmpHome);
  assert.equal(imported.projectId, 'deskcloud-fleet-auth');
  const fileSaAuth = resolveFirebaseAuth({
    rootDir: tmpHome,
    env: {},
    homeDir: tmpHome,
    isInteractive: false,
  });
  assert.equal(fileSaAuth.ready, true);
  assert.equal(fileSaAuth.source, 'file:.env.deploy.local(GOOGLE_APPLICATION_CREDENTIALS)');
  assert.match(readFileSync(path.join(tmpHome, '.env.deploy.local'), 'utf8'), /KEEP_OTHER_KEY=yes/);
  rmSync(path.join(tmpHome, '.env.deploy.local'));
  rmSync(path.join(tmpHome, '.firebase'), { recursive: true, force: true });

  // Non-interactive ambient auth remains blocked unless explicitly allowed
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

test('isPlaceholderCredentialValue flags template values but keeps real tokens that merely contain such words', () => {
  for (const placeholder of [
    'placeholder-set-your-token-here',
    'PLACEHOLDER',
    '<your-firebase-token>',
    '${FIREBASE_TOKEN}',
    'your-token-here',
    'changeme',
    'replace-me',
    'xxxxxxxx',
    'redacted',
  ]) {
    assert.equal(isPlaceholderCredentialValue(placeholder), true, placeholder);
  }
  for (const realLike of [
    'ci-scoped-token-placeholder',
    'synthetic-token-with-example-word',
    'local-env-token-placeholder',
    '',
  ]) {
    assert.equal(isPlaceholderCredentialValue(realLike), false, realLike);
  }
  assert.equal(isPlaceholderCredentialValue(undefined), false);
});

test('resolveFirebaseAuth ignores placeholder credentials so lower-priority real sources (incl. ambient CLI login) win', (t) => {
  const tmpHome = mkdtempSync(path.join(os.tmpdir(), 'pf-auth-placeholder-test-'));
  t.after(() => rmSync(tmpHome, { recursive: true, force: true }));

  // Placeholder in .env.deploy.local must not shadow a real token in .env.local
  writeFileSync(
    path.join(tmpHome, '.env.deploy.local'),
    'FIREBASE_TOKEN=placeholder-set-your-token-here\n',
  );
  writeFileSync(path.join(tmpHome, '.env.local'), 'FIREBASE_TOKEN=real-local-token\n');
  const localEnv = loadLocalDeployEnvMap(tmpHome);
  assert.equal(localEnv.values.FIREBASE_TOKEN, 'real-local-token');
  assert.equal(localEnv.keySources.FIREBASE_TOKEN, '.env.local');
  assert.equal(localEnv.placeholderKeys.FIREBASE_TOKEN, '.env.deploy.local');
  const shadowed = resolveFirebaseAuth({
    rootDir: tmpHome,
    env: { FIREBASE_TOKEN: '<your-token>' },
    homeDir: tmpHome,
    isInteractive: false,
  });
  assert.equal(shadowed.ready, true);
  assert.equal(shadowed.source, 'file:.env.local(FIREBASE_TOKEN)');
  assert.equal(shadowed.extraEnv.FIREBASE_TOKEN, 'real-local-token');
  rmSync(path.join(tmpHome, '.env.local'));

  // Placeholder-only env files fall through to ambient `firebase login` credentials
  const noRealSource = resolveFirebaseAuth({
    rootDir: tmpHome,
    env: {},
    homeDir: tmpHome,
    isInteractive: false,
  });
  assert.equal(noRealSource.ready, false);
  assert.equal(noRealSource.source, 'none');

  const configstoreDir = path.join(tmpHome, '.config', 'configstore');
  mkdirSync(configstoreDir, { recursive: true });
  writeFileSync(path.join(configstoreDir, 'firebase-tools.json'), '{"user":"demo"}');
  const ambient = resolveFirebaseAuth({
    rootDir: tmpHome,
    env: {},
    homeDir: tmpHome,
    isInteractive: false,
    allowAmbientAuth: true,
  });
  assert.equal(ambient.ready, true);
  assert.equal(ambient.source, 'home:configstore/firebase-tools.json');
  assert.equal(ambient.extraEnv.FIREBASE_TOKEN, undefined);
});

test('formatDeployDoctorReport renders clear Korean next-step guidance without leaking secrets', () => {
  const report = formatDeployDoctorReport({
    configValid: true,
    site: 'pilates-flow-atelier',
    projectId: 'deskcloud-fleet-auth',
    productionUrl: 'https://pilates-flow-atelier.web.app',
    onCanonicalBranch: true,
    branch: 'main',
    workingTreeClean: true,
    headCommit: '9860211',
    distReadyForDeploy: true,
    distEntryJs: '/assets/index-Test.js',
    firebaseAuthReady: false,
    firebaseAuthSource: 'none',
    recommendedNextCommand: 'pnpm deploy:auth',
  });
  assert.match(report, /pnpm deploy:auth/);
  assert.match(report, /pilates-flow-atelier/);
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

function stageRollbackFixtureVersion(
  root,
  name,
  { cssName = `${name}.css`, verified = true } = {},
) {
  const dist = path.join(root, 'dist');
  const entryName = `${name}.js`;
  rmSync(path.join(dist, 'assets'), { recursive: true, force: true });
  mkdirSync(path.join(dist, 'assets'));
  writeFileSync(
    path.join(dist, 'index.html'),
    `<html><head><link rel="stylesheet" href="./assets/${cssName}"><script type="module" src="./assets/${entryName}"></script></head></html>`,
  );
  writeFileSync(
    path.join(dist, 'assets', entryName),
    `export const image = "${ATELIER_V2_ASSET_PATHS[0]}";`,
  );
  writeFileSync(path.join(dist, 'assets', cssName), 'body { margin: 0; }');
  writeFileSync(
    path.join(dist, 'sw.js'),
    `const ASSETS = ${JSON.stringify(['/index.html', `/assets/${entryName}`, `/assets/${cssName}`, '/icons/app-192.png'])};`,
  );
  const snapshot = snapshotVerifiedRelease(root, { gitCommit: name });
  if (verified) markReleaseVerifiedLive(root, snapshot.releaseId);
  return snapshot;
}

function mockLiveRollbackIndex(root, release) {
  return makeMockFetch({
    '/': {
      headers: { 'content-type': 'text/html; charset=utf-8' },
      body: readFileSync(path.join(root, release.snapshotDir, 'index.html'), 'utf8'),
    },
  });
}

test('manual rollback excludes the actual live release and duplicate live snapshots, independent of local dist', async (t) => {
  const { root, dist } = createDistCheckoutFixture(t);
  const previous = stageRollbackFixtureVersion(root, 'index-PreviousGood');
  const current = stageRollbackFixtureVersion(root, 'index-CurrentGood');
  const ledgerPath = path.join(root, '.firebase', 'release-history.json');
  const ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'));
  const duplicate = { ...current, releaseId: `${current.releaseId}-duplicate`, verifiedLive: true };
  cpSync(
    path.join(root, current.snapshotDir),
    path.join(root, '.firebase', 'releases', duplicate.releaseId),
    { recursive: true },
  );
  ledger.releases.unshift(duplicate);
  writeFileSync(ledgerPath, JSON.stringify(ledger));
  stageRollbackFixtureVersion(root, 'index-LocalPending', { verified: false });

  const restored = await restoreManualRollbackRelease(root, {
    fetchImpl: mockLiveRollbackIndex(root, current),
  });
  assert.equal(restored.releaseId, previous.releaseId);
  assert.match(readFileSync(path.join(dist, 'index.html'), 'utf8'), /index-PreviousGood\.js/);
});

test('manual rollback from a failed unverified deployment restores the latest verified release', async (t) => {
  const { root, dist } = createDistCheckoutFixture(t);
  stageRollbackFixtureVersion(root, 'index-OlderGood');
  const good = stageRollbackFixtureVersion(root, 'index-LatestGood');
  const failed = stageRollbackFixtureVersion(root, 'index-FailedNew', { verified: false });
  const restored = await restoreManualRollbackRelease(root, {
    fetchImpl: mockLiveRollbackIndex(root, failed),
  });
  assert.equal(restored.releaseId, good.releaseId);
  assert.match(readFileSync(path.join(dist, 'index.html'), 'utf8'), /index-LatestGood\.js/);
});

test('manual rollback distinguishes CSS-only releases sharing the same JavaScript entry', async (t) => {
  const { root, dist } = createDistCheckoutFixture(t);
  const previous = stageRollbackFixtureVersion(root, 'index-SharedJs', {
    cssName: 'index-PreviousStyle.css',
  });
  const current = stageRollbackFixtureVersion(root, 'index-SharedJs', {
    cssName: 'index-CurrentStyle.css',
  });
  const restored = await restoreManualRollbackRelease(root, {
    fetchImpl: mockLiveRollbackIndex(root, current),
  });
  assert.equal(restored.releaseId, previous.releaseId);
  assert.match(readFileSync(path.join(dist, 'index.html'), 'utf8'), /index-PreviousStyle\.css/);
});

test('manual rollback fails before changing dist when live identity is unreachable, denied or not an app', async (t) => {
  const { root, dist } = createDistCheckoutFixture(t);
  stageRollbackFixtureVersion(root, 'index-PreviousGood');
  const current = stageRollbackFixtureVersion(root, 'index-CurrentGood');
  const initialHtml = readFileSync(path.join(dist, 'index.html'), 'utf8');
  const ledgerPath = path.join(root, '.firebase', 'release-history.json');
  const initialLedger = readFileSync(ledgerPath, 'utf8');
  const realMock = mockLiveRollbackIndex(root, current);
  const failures = [
    async () => {
      throw new Error('network unavailable');
    },
    makeMockFetch({
      '/': { status: 401, headers: { 'content-type': 'text/html' }, body: '<html>Sign in</html>' },
    }),
    makeMockFetch({
      '/': { headers: { 'content-type': 'text/html' }, body: '<html>Sign in</html>' },
    }),
    makeMockFetch({ '/': { headers: { 'content-type': 'application/json' }, body: '{}' } }),
  ];
  for (const fetchImpl of failures) {
    await assert.rejects(
      restoreManualRollbackRelease(root, { fetchImpl }),
      /No snapshot was restored/,
    );
    assert.equal(readFileSync(path.join(dist, 'index.html'), 'utf8'), initialHtml);
    assert.equal(readFileSync(ledgerPath, 'utf8'), initialLedger);
  }
  await restoreManualRollbackRelease(root, {
    fetchImpl: (input, init) => {
      assert.equal(init.redirect, 'error');
      assert.equal(init.headers['Cache-Control'], 'no-cache');
      assert.ok(init.signal instanceof AbortSignal);
      return realMock(input);
    },
  });
});

test('manual rollback refuses to redeploy the live bundle when no older verified release exists', async (t) => {
  const { root, dist } = createDistCheckoutFixture(t);
  const current = stageRollbackFixtureVersion(root, 'index-OnlyGood');
  const initialHtml = readFileSync(path.join(dist, 'index.html'), 'utf8');
  await assert.rejects(
    restoreManualRollbackRelease(root, { fetchImpl: mockLiveRollbackIndex(root, current) }),
    /No verified local release snapshot/,
  );
  assert.equal(readFileSync(path.join(dist, 'index.html'), 'utf8'), initialHtml);
});
