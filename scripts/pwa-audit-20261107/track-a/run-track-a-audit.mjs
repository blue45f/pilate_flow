#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../..');
const DIST_DIR = path.join(REPO_ROOT, 'dist');
const DOCS_TRACK_A_DIR = path.join(REPO_ROOT, 'docs/pwa-audit-20261107/track-a');
const RESULTS_JSON_PATH = path.join(DOCS_TRACK_A_DIR, 'track-a-results.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

function canonicalRecoveryContent(value) {
  const normalize = (item) => {
    if (Array.isArray(item)) return item.map(normalize);
    if (item !== null && typeof item === 'object') {
      return Object.fromEntries(
        Object.entries(item)
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([k, v]) => [k, normalize(v)]),
      );
    }
    return item;
  };
  return JSON.stringify(normalize(value));
}

function computeCanonicalSha256(value) {
  return createHash('sha256').update(canonicalRecoveryContent(value), 'utf8').digest('hex');
}

function computeRawSha256(raw) {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

function computeDigestFromRawMap(rawMap, expectedKeys) {
  const perKey = {};
  let totalBytes = 0;
  for (const key of [...expectedKeys].sort()) {
    const raw = rawMap[key];
    if (typeof raw !== 'string') {
      throw new Error(`Missing expected localStorage key in browser snapshot: ${key}`);
    }
    const bytes = Buffer.byteLength(raw, 'utf8');
    totalBytes += bytes;
    const parsed = key.endsWith(':active-owner') ? raw : JSON.parse(raw);
    perKey[key] = {
      bytes,
      rawSha256: computeRawSha256(raw),
      canonicalSha256: computeCanonicalSha256(parsed),
    };
  }

  const mainRaw = rawMap['pilates-flow-atelier-storage-v3'];
  const mainParsed = JSON.parse(mainRaw);
  const st = mainParsed.state;
  const domainSummary = {
    activeSequenceId: st.activeSequenceId,
    activeTargetMinutes: st.activeTargetMinutes,
    activeStepsCount: st.activeSteps.length,
    activeStepsTotalMinutes: st.activeSteps.reduce((sum, s) => sum + s.durationMin, 0),
    customExercisesCount: st.exercises.filter((e) => e.isCustom).length,
    totalExercisesCount: st.exercises.length,
    savedSequencesCount: st.savedSequences.length,
    classGroupsCount: st.classGroups.length,
    historyLogsCount: st.historyLogs.length,
    conditionTemplatesCount: st.conditionTemplates.length,
    scheduledClassesCount: st.instructorSchedule.classes.length,
    datedAssignmentsCount: st.datedSequencePlanning.assignments.length,
    bookmarkedExercisesCount: st.instructorStudyState.bookmarkedExerciseIds.length,
  };

  const overallSha256 = computeCanonicalSha256({
    perKey: Object.fromEntries(Object.entries(perKey).map(([k, v]) => [k, v.canonicalSha256])),
    domainSummary,
  });

  return {
    overallSha256,
    keyCount: Object.keys(perKey).length,
    totalBytes,
    perKey,
    domainSummary,
  };
}

function startStaticDistServer(distDir) {
  const originalSw = fs.readFileSync(path.join(distDir, 'sw.js'), 'utf8');
  const v1Match = originalSw.match(/const CACHE = PREFIX \+ "([^"]+)";/);
  const v1Version = v1Match ? v1Match[1] : 'unknown';
  let activeSwVersion = v1Version;
  const requestLog = [];

  const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url ?? '/', 'http://127.0.0.1');
    const pathname = decodeURIComponent(reqUrl.pathname);
    requestLog.push({ method: req.method, pathname, search: reqUrl.search });

    if (pathname === '/sw.js') {
      const body =
        activeSwVersion === v1Version
          ? originalSw
          : originalSw.replace(
              `const CACHE = PREFIX + "${v1Version}";`,
              `const CACHE = PREFIX + "${activeSwVersion}";`,
            );
      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      });
      res.end(body);
      return;
    }

    const relativePath = pathname === '/' ? '/index.html' : pathname;
    const safePath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
    const filePath = path.join(distDir, safePath);

    if (!filePath.startsWith(distDir) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';
    const content = fs.readFileSync(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': pathname === '/' || pathname === '/index.html' ? 'no-cache' : 'public, max-age=3600',
    });
    res.end(content);
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({
        server,
        port: addr.port,
        v1Version,
        requestLog,
        setSwVersion(nextVersion) {
          activeSwVersion = nextVersion;
        },
        close() {
          return new Promise((resClose) => server.close(() => resClose()));
        },
      });
    });
  });
}

function launchIsolatedChromium(userDataDir) {
  const args = [
    '--headless',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-features=BackForwardCache',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-port=0',
    `--user-data-dir=${userDataDir}`,
    'about:blank',
  ];

  const proc = spawn('/usr/bin/chromium', args, {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  return new Promise((resolve, reject) => {
    let stderrBuf = '';
    const timeout = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error(`Timed out waiting for Chromium DevTools endpoint. stderr: ${stderrBuf}`));
    }, 15000);

    proc.stderr.on('data', (chunk) => {
      stderrBuf += chunk.toString('utf8');
      const match = stderrBuf.match(/DevTools listening on (ws:\/\/127\.0\.0\.1:(\d+)\/devtools\/browser\/[^\s]+)/);
      if (match) {
        clearTimeout(timeout);
        resolve({
          proc,
          browserWsUrl: match[1],
          debugPort: Number(match[2]),
        });
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function connectCdpPage(debugPort) {
  const listRes = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
  const targets = await listRes.json();
  const pageTarget = targets.find((t) => t.type === 'page') ?? targets[0];
  if (!pageTarget?.webSocketDebuggerUrl) {
    throw new Error(`No inspectable page target found on port ${debugPort}`);
  }

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', () => resolve(), { once: true });
    ws.addEventListener('error', (err) => reject(err), { once: true });
  });

  let nextId = 1;
  const pending = new Map();
  const eventListeners = new Map();

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(typeof event.data === 'string' ? event.data : event.data.toString());
    if (typeof msg.id === 'number') {
      const entry = pending.get(msg.id);
      if (entry) {
        pending.delete(msg.id);
        if (msg.error) {
          entry.reject(new Error(`CDP error (${msg.error.code}): ${msg.error.message}`));
        } else {
          entry.resolve(msg.result);
        }
      }
    } else if (msg.method) {
      const handlers = eventListeners.get(msg.method) ?? [];
      for (const h of handlers) h(msg.params);
    }
  });

  function send(method, params = {}) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(expression, awaitPromise = true) {
    const res = await send('Runtime.evaluate', {
      expression,
      awaitPromise,
      returnByValue: true,
    });
    if (res.exceptionDetails) {
      throw new Error(
        `Runtime.evaluate exception: ${res.exceptionDetails.text} ${res.exceptionDetails.exception?.description ?? ''}`,
      );
    }
    return res.result?.value;
  }

  function close() {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  }

  return { send, evaluate, close };
}

async function waitForCondition(fn, timeoutMs = 15000, intervalMs = 100, label = 'condition') {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const val = await fn();
    if (val) return val;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Timeout waiting for ${label} after ${timeoutMs}ms`);
}

async function main() {
  const startedAt = new Date().toISOString();
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pwa-track-a-'));
  const userDataDir = path.join(tempRoot, 'chromium-profile');
  const vitestJsonPath = path.join(tempRoot, 'vitest-results.json');
  const seedJsonPath = path.join(tempRoot, 'synthetic-seed.json');
  fs.mkdirSync(userDataDir, { recursive: true });

  let httpServer = null;
  let chromium = null;
  let cdp = null;

  try {
    console.log('[Track A] 1/3 Running Vitest suite (track-a-sw-cache-data-preservation.test.ts)...');
    const vitestRun = spawnSync(
      'pnpm',
      [
        'exec',
        'vitest',
        'run',
        'scripts/pwa-audit-20261107/track-a/track-a-sw-cache-data-preservation.test.ts',
        '--reporter=json',
        `--outputFile=${vitestJsonPath}`,
      ],
      {
        cwd: REPO_ROOT,
        env: {
          ...process.env,
          TRACK_A_SEED_OUT_PATH: seedJsonPath,
        },
        encoding: 'utf8',
      },
    );

    if (vitestRun.status !== 0) {
      throw new Error(`Vitest failed with status ${vitestRun.status}:\n${vitestRun.stdout}\n${vitestRun.stderr}`);
    }

    const vitestReport = JSON.parse(fs.readFileSync(vitestJsonPath, 'utf8'));
    const seedPayload = JSON.parse(fs.readFileSync(seedJsonPath, 'utf8'));
    const expectedKeys = Object.keys(seedPayload.rawByKey).sort();
    const baselineDigest = seedPayload.baselineDigest;

    console.log(
      `[Track A] Vitest passed: ${vitestReport.numPassedTests}/${vitestReport.numTotalTests} tests green. Baseline SHA-256: ${baselineDigest.overallSha256}`,
    );

    console.log('[Track A] 2/3 Starting local static server & isolated Headless Chromium...');
    httpServer = await startStaticDistServer(DIST_DIR);
    const originUrl = `http://127.0.0.1:${httpServer.port}/`;
    const v1CacheName = `flow-atelier-shell-${httpServer.v1Version}`;
    const v2Version = 'v2audit';
    const v2CacheName = `flow-atelier-shell-${v2Version}`;

    chromium = await launchIsolatedChromium(userDataDir);
    cdp = await connectCdpPage(chromium.debugPort);

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');

    // Phase 1: Initial load, SW v1 registration & synthetic Pilates dataset seeding
    await cdp.send('Page.navigate', { url: originUrl });
    await waitForCondition(
      () =>
        cdp.evaluate(`(async () => {
          if (document.readyState !== 'complete') return false;
          if (!('serviceWorker' in navigator)) return false;
          const reg = await navigator.serviceWorker.ready;
          return Boolean(reg && reg.active && reg.active.state === 'activated');
        })()`),
      15000,
      150,
      'initial SW v1 activation',
    );

    // Seed all 7 synthetic localStorage keys into Chromium
    await cdp.evaluate(
      `(() => {
        const rawByKey = ${JSON.stringify(seedPayload.rawByKey)};
        localStorage.clear();
        for (const [k, v] of Object.entries(rawByKey)) {
          localStorage.setItem(k, v);
        }
        return Object.keys(rawByKey).length;
      })()`,
      false,
    );

    // Reload so the app hydrates from the synthetic Pilates dataset under active SW v1 controller
    await cdp.send('Page.reload', { ignoreCache: false });
    const phase1State = await waitForCondition(
      () =>
        cdp.evaluate(`(async () => {
          if (document.readyState !== 'complete') return null;
          const rootText = document.getElementById('root')?.innerText ?? '';
          if (!rootText || rootText.trim().length < 20) return null;
          const reg = await navigator.serviceWorker.getRegistration('/');
          if (!reg?.active || !navigator.serviceWorker.controller) return null;
          const cacheKeys = await caches.keys();
          const v1Cache = await caches.open(${JSON.stringify(v1CacheName)});
          const cachedRequests = await v1Cache.keys();
          const rawStorage = {};
          for (const key of ${JSON.stringify(expectedKeys)}) {
            rawStorage[key] = localStorage.getItem(key);
          }
          window.__trackAOpenLessonMarker = 'lesson-in-progress-no-reload';
          return {
            title: document.title,
            rootTextLength: rootText.length,
            hasSyntheticTitleInDom: rootText.includes('리포머 중급') || rootText.includes('Flow Atelier'),
            controllerScriptURL: navigator.serviceWorker.controller.scriptURL,
            activeState: reg.active.state,
            waitingState: reg.waiting ? reg.waiting.state : null,
            cacheKeys,
            cachedEntryCount: cachedRequests.length,
            cachedPaths: cachedRequests.map((r) => new URL(r.url).pathname).sort(),
            rawStorage,
          };
        })()`),
      15000,
      150,
      'hydrated DOM & SW v1 controller',
    );

    const phase1Digest = computeDigestFromRawMap(phase1State.rawStorage, expectedKeys);
    if (phase1Digest.overallSha256 !== baselineDigest.overallSha256) {
      throw new Error(
        `Phase 1 digest mismatch: expected ${baselineDigest.overallSha256}, got ${phase1Digest.overallSha256}`,
      );
    }

    // Phase 2: Offline network emulation & offline reload revisit
    await cdp.send('Network.emulateNetworkConditions', {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    });

    await cdp.send('Page.reload', { ignoreCache: false });
    const phase2OfflineState = await waitForCondition(
      () =>
        cdp.evaluate(`(async () => {
          if (document.readyState !== 'complete') return null;
          const rootText = document.getElementById('root')?.innerText ?? '';
          if (!rootText || rootText.trim().length < 20) return null;
          const cacheKeys = await caches.keys();
          const rawStorage = {};
          for (const key of ${JSON.stringify(expectedKeys)}) {
            rawStorage[key] = localStorage.getItem(key);
          }
          window.__trackAOpenLessonMarker = 'lesson-in-progress-no-reload';
          return {
            navigatorOnLine: navigator.onLine,
            title: document.title,
            rootTextLength: rootText.length,
            hasController: Boolean(navigator.serviceWorker.controller),
            cacheKeys,
            rawStorage,
          };
        })()`),
      15000,
      150,
      'offline reload render & data preservation',
    );

    const phase2Digest = computeDigestFromRawMap(phase2OfflineState.rawStorage, expectedKeys);
    if (phase2Digest.overallSha256 !== baselineDigest.overallSha256) {
      throw new Error(
        `Phase 2 offline digest mismatch: expected ${baselineDigest.overallSha256}, got ${phase2Digest.overallSha256}`,
      );
    }

    // Phase 3: Restore online, switch server /sw.js to v2audit, trigger registration.update()
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    });
    httpServer.setSwVersion(v2Version);

    const phase3WaitingState = await waitForCondition(
      () =>
        cdp.evaluate(`(async () => {
          const reg = await navigator.serviceWorker.getRegistration('/');
          if (!reg) return null;
          await reg.update();
          if (!reg.waiting || reg.waiting.state !== 'installed') return null;
          const cacheKeys = (await caches.keys()).sort();
          const rawStorage = {};
          for (const key of ${JSON.stringify(expectedKeys)}) {
            rawStorage[key] = localStorage.getItem(key);
          }
          return {
            activeState: reg.active ? reg.active.state : null,
            waitingState: reg.waiting ? reg.waiting.state : null,
            openLessonMarkerPreserved: window.__trackAOpenLessonMarker === 'lesson-in-progress-no-reload',
            cacheKeys,
            rawStorage,
          };
        })()`),
      15000,
      200,
      'SW v2 waiting state & parallel cache population',
    );

    const phase3Digest = computeDigestFromRawMap(phase3WaitingState.rawStorage, expectedKeys);
    if (phase3Digest.overallSha256 !== baselineDigest.overallSha256) {
      throw new Error(
        `Phase 3 waiting update digest mismatch: expected ${baselineDigest.overallSha256}, got ${phase3Digest.overallSha256}`,
      );
    }
    if (!phase3WaitingState.openLessonMarkerPreserved) {
      throw new Error('Open lesson tab was unexpectedly reloaded during v2 waiting install');
    }

    // Phase 4: Navigate away to about:blank to release v1 client, then re-open app so v2 activates
    await cdp.send('Page.navigate', { url: 'about:blank' });
    await waitForCondition(
      () => cdp.evaluate(`document.readyState === 'complete' && location.href === 'about:blank'`, false),
      10000,
      100,
      'about:blank navigation',
    );
    await new Promise((r) => setTimeout(r, 800));

    await cdp.send('Page.navigate', { url: originUrl });
    const phase4ActivatedState = await waitForCondition(
      () =>
        cdp.evaluate(`(async () => {
          if (document.readyState !== 'complete') return null;
          const rootText = document.getElementById('root')?.innerText ?? '';
          if (!rootText || rootText.trim().length < 20) return null;
          const reg = await navigator.serviceWorker.getRegistration('/');
          if (!reg?.active || reg.active.state !== 'activated' || reg.waiting !== null) return null;
          const cacheKeys = (await caches.keys()).sort();
          if (!cacheKeys.includes(${JSON.stringify(v2CacheName)}) || cacheKeys.includes(${JSON.stringify(v1CacheName)})) {
            return null;
          }
          const rawStorage = {};
          for (const key of ${JSON.stringify(expectedKeys)}) {
            rawStorage[key] = localStorage.getItem(key);
          }
          return {
            title: document.title,
            rootTextLength: rootText.length,
            activeState: reg.active.state,
            waitingState: reg.waiting,
            cacheKeys,
            rawStorage,
          };
        })()`),
      15000,
      150,
      'SW v2 activation & obsolete v1 cache deletion',
    );

    const phase4Digest = computeDigestFromRawMap(phase4ActivatedState.rawStorage, expectedKeys);
    if (phase4Digest.overallSha256 !== baselineDigest.overallSha256) {
      throw new Error(
        `Phase 4 v2 activated digest mismatch: expected ${baselineDigest.overallSha256}, got ${phase4Digest.overallSha256}`,
      );
    }

    // Phase 5: Offline revisit under v2 to confirm activated v2 serves offline cleanly with 0-byte data loss
    await cdp.send('Network.emulateNetworkConditions', {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    });
    await cdp.send('Page.reload', { ignoreCache: false });
    const phase5V2OfflineState = await waitForCondition(
      () =>
        cdp.evaluate(`(async () => {
          if (document.readyState !== 'complete') return null;
          const rootText = document.getElementById('root')?.innerText ?? '';
          if (!rootText || rootText.trim().length < 20) return null;
          const cacheKeys = (await caches.keys()).sort();
          const rawStorage = {};
          for (const key of ${JSON.stringify(expectedKeys)}) {
            rawStorage[key] = localStorage.getItem(key);
          }
          return {
            navigatorOnLine: navigator.onLine,
            title: document.title,
            rootTextLength: rootText.length,
            cacheKeys,
            rawStorage,
          };
        })()`),
      15000,
      150,
      'Phase 5 offline revisit under v2',
    );

    const phase5Digest = computeDigestFromRawMap(phase5V2OfflineState.rawStorage, expectedKeys);
    if (phase5Digest.overallSha256 !== baselineDigest.overallSha256) {
      throw new Error(
        `Phase 5 v2 offline digest mismatch: expected ${baselineDigest.overallSha256}, got ${phase5Digest.overallSha256}`,
      );
    }

    // Close CDP and Chromium before cleaning up temp directory
    cdp.close();
    cdp = null;
    chromium.proc.kill('SIGTERM');
    await new Promise((resolve) => {
      chromium.proc.once('exit', () => resolve());
      setTimeout(() => {
        try {
          chromium.proc.kill('SIGKILL');
        } catch {
          // ignore
        }
        resolve();
      }, 3000);
    });
    chromium = null;

    await httpServer.close();
    httpServer = null;

    fs.rmSync(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    const tempDirCleaned = !fs.existsSync(tempRoot);

    console.log('[Track A] 3/3 Writing structured audit evidence report to docs/pwa-audit-20261107/track-a/track-a-results.json...');
    fs.mkdirSync(DOCS_TRACK_A_DIR, { recursive: true });

    const resultsPayload = {
      track: 'Track A — Manifest / Service-Worker / Cache Version Update, Offline Revisit & Existing Lesson Data Preservation',
      executedAt: startedAt,
      completedAt: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: `${os.platform()} ${os.release()}`,
        chromiumBinary: '/usr/bin/chromium',
        isolatedTempDirPattern: path.join(os.tmpdir(), 'pwa-track-a-*'),
        isolatedTempDirCleanedUp: tempDirCleaned,
      },
      vitestSuite: {
        testFile: 'scripts/pwa-audit-20261107/track-a/track-a-sw-cache-data-preservation.test.ts',
        success: vitestReport.success,
        numTotalTests: vitestReport.numTotalTests,
        numPassedTests: vitestReport.numPassedTests,
        numFailedTests: vitestReport.numFailedTests,
        assertions: (vitestReport.testResults?.[0]?.assertionResults ?? []).map((a) => ({
          title: a.title,
          fullName: a.fullName,
          status: a.status,
          durationMs: a.duration,
        })),
      },
      chromiumCdpE2e: {
        v1CacheName,
        v2CacheName,
        phase1InitialHydrationAndSwV1: {
          title: phase1State.title,
          rootTextLength: phase1State.rootTextLength,
          hasSyntheticTitleInDom: phase1State.hasSyntheticTitleInDom,
          activeState: phase1State.activeState,
          waitingState: phase1State.waitingState,
          cacheKeys: phase1State.cacheKeys,
          cachedEntryCount: phase1State.cachedEntryCount,
          storageSha256: phase1Digest.overallSha256,
          matchesBaseline100Percent: phase1Digest.overallSha256 === baselineDigest.overallSha256,
        },
        phase2OfflineReloadUnderV1: {
          navigatorOnLine: phase2OfflineState.navigatorOnLine,
          title: phase2OfflineState.title,
          rootTextLength: phase2OfflineState.rootTextLength,
          hasController: phase2OfflineState.hasController,
          cacheKeys: phase2OfflineState.cacheKeys,
          storageSha256: phase2Digest.overallSha256,
          matchesBaseline100Percent: phase2Digest.overallSha256 === baselineDigest.overallSha256,
        },
        phase3OnlineV2WaitingUpdate: {
          activeState: phase3WaitingState.activeState,
          waitingState: phase3WaitingState.waitingState,
          openLessonMarkerPreservedWithoutAutoReload: phase3WaitingState.openLessonMarkerPreserved,
          cacheKeys: phase3WaitingState.cacheKeys,
          bothV1AndV2CachesPresentWhileWaiting:
            phase3WaitingState.cacheKeys.includes(v1CacheName) &&
            phase3WaitingState.cacheKeys.includes(v2CacheName),
          storageSha256: phase3Digest.overallSha256,
          matchesBaseline100Percent: phase3Digest.overallSha256 === baselineDigest.overallSha256,
        },
        phase4NavigateAwayAndReopenV2Activate: {
          title: phase4ActivatedState.title,
          rootTextLength: phase4ActivatedState.rootTextLength,
          activeState: phase4ActivatedState.activeState,
          waitingState: phase4ActivatedState.waitingState,
          cacheKeys: phase4ActivatedState.cacheKeys,
          obsoleteV1CacheDeleted: !phase4ActivatedState.cacheKeys.includes(v1CacheName),
          v2CacheActiveOnly:
            phase4ActivatedState.cacheKeys.length === 1 &&
            phase4ActivatedState.cacheKeys[0] === v2CacheName,
          storageSha256: phase4Digest.overallSha256,
          matchesBaseline100Percent: phase4Digest.overallSha256 === baselineDigest.overallSha256,
        },
        phase5OfflineReloadUnderV2: {
          navigatorOnLine: phase5V2OfflineState.navigatorOnLine,
          title: phase5V2OfflineState.title,
          rootTextLength: phase5V2OfflineState.rootTextLength,
          cacheKeys: phase5V2OfflineState.cacheKeys,
          storageSha256: phase5Digest.overallSha256,
          matchesBaseline100Percent: phase5Digest.overallSha256 === baselineDigest.overallSha256,
        },
      },
      syntheticDataPreservation: {
        baselineOverallSha256: baselineDigest.overallSha256,
        totalKeysVerified: baselineDigest.keyCount,
        totalBytesVerified: baselineDigest.totalBytes,
        zeroByteLossAcrossAllLifecycleTransitions: true,
        domainSummary: baselineDigest.domainSummary,
        perKeyDigests: baselineDigest.perKey,
      },
      findings: [
        {
          id: 'A-F1',
          severity: 'low',
          title: '보조 PWA 정적 자산 4종(site.webmanifest, favicon.svg, apple-touch-icon.png, app-maskable-512.png) 프리캐시(ASSETS) 및 버전 해시 입력 누락',
          files: ['scripts/pwa-build.ts', 'dist/sw.js'],
          reproducedInTest: true,
          summary:
            'serviceWorkerSource()의 ASSETS 배열과 pwaBuild()의 SHA-256 버전 계산 입력에 /site.webmanifest, /favicon.svg, /icons/apple-touch-icon.png, /icons/app-maskable-512.png 4개 파일이 누락되어 오프라인 상태에서 해당 URL 요청 시 서비스 워커가 응답을 가로채지 않으며, 해당 파일만 단독 수정될 경우 SW 캐시 버전 해시가 갱신되지 않습니다.',
        },
        {
          id: 'A-F2',
          severity: 'medium',
          title: '대기 중(waiting)인 신규 SW(v2)가 존재할 때 온라인 루트 탐색(/) 시 신규 v2 HTML과 기존 활성 v1 SW 컨트롤러 간 버전 불일치 가능성',
          files: ['scripts/pwa-build.ts', 'dist/sw.js'],
          reproducedInTest: true,
          summary:
            '열린 수업을 보호하기 위해 skipWaiting()을 호출하지 않는 설계에서, v2 SW가 waiting 상태일 때 기존 탭에서 온라인 새로고침(/)을 수행하면 활성 v1 SW의 network-first 전략이 서버의 최신 v2 index.html(v2 해시 청크 참조)을 반환합니다. 모든 탭을 닫아 v2가 활성화되기 전에 오프라인으로 전환되면, v1 SW의 ASSETS 목록에는 v2 청크 경로가 없어 오프라인 청크 요청이 실패할 수 있습니다.',
        },
        {
          id: 'A-F3',
          severity: 'low',
          title: '최초 서비스 워커 설치 시 worker.state가 installed(registration.waiting)를 거치는 순간 offlineStatus가 일시적으로 update-ready로 표시됨',
          files: ['src/lib/pwa.ts'],
          reproducedInTest: true,
          summary:
            'src/lib/pwa.ts의 update() 함수가 registration.active 존재 여부를 확인하지 않고 registration.waiting ? "update-ready" : ...를 평가하여, 기존 활성 컨트롤러가 없는 최초 설치(registration.active === null) 중에도 워커가 installed 상태에 도달해 waiting 슬롯에 잠시 머무는 동안 offlineStatus가 "update-ready"로 보고됩니다.',
        },
      ],
    };

    fs.writeFileSync(RESULTS_JSON_PATH, `${JSON.stringify(resultsPayload, null, 2)}\n`, 'utf8');
    console.log(`[Track A] Audit complete. Results saved to ${RESULTS_JSON_PATH}`);
  } finally {
    if (cdp) {
      try {
        cdp.close();
      } catch {
        // ignore
      }
    }
    if (chromium?.proc) {
      try {
        chromium.proc.kill('SIGKILL');
      } catch {
        // ignore
      }
    }
    if (httpServer) {
      try {
        await httpServer.close();
      } catch {
        // ignore
      }
    }
    if (fs.existsSync(tempRoot)) {
      fs.rmSync(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
  }
}

main().catch((err) => {
  console.error('[Track A] Audit failed:', err);
  process.exitCode = 1;
});
