#!/usr/bin/env node
import { execFileSync, spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve } from 'node:path';

const ROOT_DIR = resolve(import.meta.dirname, '../..');
const DIST_DIR = join(ROOT_DIR, 'dist');
const DOCS_DIR = join(ROOT_DIR, 'docs/integrated-release-readiness-round3-20261107');
const EVIDENCE_DIR = join(DOCS_DIR, 'evidence');
const SCREENSHOT_DIR = join(EVIDENCE_DIR, 'screenshots');
const CHROMIUM_BINARY = '/usr/bin/chromium';

const REQUIRED_COMMITS = [
  { short: 'c6acd66', role: '설정 (Settings)', round: 'Round 1' },
  { short: 'f3c093e', role: '통합 (Integration)', round: 'Round 1' },
  { short: 'f95b188', role: '라이브러리 (Library)', round: 'Round 1' },
  { short: '4256230', role: '홈 (Home)', round: 'Round 1' },
  { short: '45839ff', role: '히스토리 (History)', round: 'Round 1' },
  { short: '338f912', role: '빌더 (Builder)', round: 'Round 1' },
  { short: '0d5e054', role: '통합 사용자 동선 Round 2 증적', round: 'Round 2' },
  { short: '55ce22d', role: '새 도해 구현 (D-01..D-05 접촉 정합성 수정)', round: 'Post-Round 2 Diagram Fix' },
  { short: 'b2d6022', role: '새 도해 구현 main 병합 커밋', round: 'Post-Round 2 Diagram Merge' },
];

const DIAGRAM_REVISIT_EXERCISES = [
  {
    exerciseId: 'original-reformer-strap-frog',
    nameKo: '스트랩 프로그 준비',
    defectId: 'D-01',
    expectedArchetype: 'reformer-strap-frog-isolated',
    expectedApparatus: 'reformer',
  },
  {
    exerciseId: 'ex-plank-01',
    nameKo: '리포머 롱 스트레치 & 엘리펀트 / 니 스트레치',
    defectId: 'D-02A',
    expectedArchetype: 'reformer-plank-long-stretch-isolated',
    expectedApparatus: 'reformer',
  },
  {
    exerciseId: 'ex-plank-02',
    nameKo: '운다 체어 파이크(Pike) & 플랭크 풀업',
    defectId: 'D-02B',
    expectedArchetype: 'chair-plank-pike-isolated',
    expectedApparatus: 'chair',
  },
  {
    exerciseId: 'ex-footwork-03',
    nameKo: '운다 체어 시티드 & 스탠딩 풋워크 프레스',
    defectId: 'D-04',
    expectedArchetype: 'chair-seated-pedal-footwork',
    expectedApparatus: 'chair',
  },
  {
    exerciseId: 'original-barrel-standing-hip-extension',
    nameKo: '래더 지지 힙 익스텐션',
    defectId: 'D-05',
    expectedArchetype: 'barrel-standing-hip-extension-isolated',
    expectedApparatus: 'barrel',
  },
];

// ============================================================================
// Track 1: Git Ancestry Verification (including 55ce22d and b2d6022)
// ============================================================================
function verifyGitAncestry() {
  const headSha = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  }).trim();
  const originMainSha = execFileSync('git', ['rev-parse', 'origin/main'], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  }).trim();

  const commits = REQUIRED_COMMITS.map((item) => {
    const fullSha = execFileSync('git', ['rev-parse', item.short], {
      cwd: ROOT_DIR,
      encoding: 'utf8',
    }).trim();
    const subject = execFileSync('git', ['show', '-s', '--format=%s', fullSha], {
      cwd: ROOT_DIR,
      encoding: 'utf8',
    }).trim();
    const commitDate = execFileSync('git', ['show', '-s', '--format=%ci', fullSha], {
      cwd: ROOT_DIR,
      encoding: 'utf8',
    }).trim();

    let isAncestorOfOriginMain = false;
    try {
      execFileSync('git', ['merge-base', '--is-ancestor', fullSha, 'origin/main'], {
        cwd: ROOT_DIR,
      });
      isAncestorOfOriginMain = true;
    } catch {
      isAncestorOfOriginMain = false;
    }

    let isAncestorOfHead = false;
    try {
      execFileSync('git', ['merge-base', '--is-ancestor', fullSha, 'HEAD'], {
        cwd: ROOT_DIR,
      });
      isAncestorOfHead = true;
    } catch {
      isAncestorOfHead = false;
    }

    if (!isAncestorOfOriginMain || !isAncestorOfHead) {
      throw new Error(
        `Required commit ${item.short} (${fullSha}) is NOT an ancestor of origin/main or HEAD`,
      );
    }

    return {
      ...item,
      fullSha,
      subject,
      commitDate,
      isAncestorOfOriginMain,
      isAncestorOfHead,
    };
  });

  return {
    headSha,
    originMainSha,
    allIncluded: commits.every((c) => c.isAncestorOfOriginMain && c.isAncestorOfHead),
    commits,
  };
}

// ============================================================================
// Track 2: Safari / WebKit Runtime Probe & Static Compatibility Audit
// ============================================================================
function auditSafariWebKitCompatibility() {
  const candidateBinaries = [
    '/usr/bin/safari',
    '/usr/bin/MiniBrowser',
    '/usr/bin/WebKitWebProcess',
    '/usr/bin/epiphany',
    '/usr/bin/midori',
    '/usr/local/bin/webkit',
  ];
  const probedBinaries = candidateBinaries.map((binPath) => ({
    path: binPath,
    exists: existsSync(binPath),
  }));

  let playwrightWebkitCacheFound = false;
  const pwCacheDir = join(process.env.HOME || '/home/antigravity', '.cache/ms-playwright');
  if (existsSync(pwCacheDir)) {
    const entries = readdirSync(pwCacheDir);
    playwrightWebkitCacheFound = entries.some((e) => e.toLowerCase().includes('webkit'));
  }

  const webkitRuntimeAvailable =
    probedBinaries.some((b) => b.exists) || playwrightWebkitCacheFound;

  // Inspect index.html for Apple / Safari meta tags
  const indexHtml = readFileSync(join(ROOT_DIR, 'index.html'), 'utf8');
  const hasViewportFitCover = indexHtml.includes('viewport-fit=cover');
  const hasAppleMobileWebAppCapable = indexHtml.includes('name="apple-mobile-web-app-capable"');
  const hasAppleTouchIconLink = indexHtml.includes('rel="apple-touch-icon"');

  // Inspect PNG headers for apple-touch-icon and manifest icons
  const iconFiles = [
    'public/icons/apple-touch-icon.png',
    'public/icons/app-192.png',
    'public/icons/app-512.png',
    'public/icons/app-maskable-512.png',
  ];
  const iconChecks = iconFiles.map((relPath) => {
    const buf = readFileSync(join(ROOT_DIR, relPath));
    const pngSignature = buf.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return {
      file: relPath,
      validPngSignature: pngSignature,
      dimensions: `${width}x${height}`,
    };
  });

  // Inspect CSS files for backdrop-filter vs -webkit-backdrop-filter and 100dvh / safe-area-inset
  const stylesDir = join(ROOT_DIR, 'src/styles');
  const cssFiles = readdirSync(stylesDir).filter((f) => f.endsWith('.css'));
  const unprefixedBackdropFilterLocations = [];
  let safeAreaInsetCount = 0;
  let dvhUsageCount = 0;

  for (const file of cssFiles) {
    const content = readFileSync(join(stylesDir, file), 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('env(safe-area-inset-')) safeAreaInsetCount += 1;
      if (line.includes('100dvh')) dvhUsageCount += 1;
      if (
        /(?:^|[\s;])backdrop-filter\s*:/.test(line) &&
        !line.includes('-webkit-backdrop-filter')
      ) {
        const prevLine = lines[idx - 1] ?? '';
        const nextLine = lines[idx + 1] ?? '';
        if (
          !prevLine.includes('-webkit-backdrop-filter') &&
          !nextLine.includes('-webkit-backdrop-filter')
        ) {
          unprefixedBackdropFilterLocations.push({
            file: `src/styles/${file}`,
            line: idx + 1,
            declaration: line.trim(),
          });
        }
      }
    });
  }

  return {
    webkitRuntimeAvailable,
    safariRuntimeVerdict: webkitRuntimeAvailable
      ? 'VERIFIED'
      : 'UNVERIFIED (미검증 — Linux Debian 12 컨테이너에 Safari/WebKit 런타임 바이너리가 없으므로 Chromium 결과를 Safari PASS로 간주하지 않음)',
    probedBinaries,
    playwrightWebkitCacheFound,
    staticSafariCompatibility: {
      hasViewportFitCover,
      hasAppleMobileWebAppCapable,
      hasAppleTouchIconLink,
      iconChecks,
      safeAreaInsetCount,
      dvhUsageCount,
      unprefixedBackdropFilterCount: unprefixedBackdropFilterLocations.length,
      unprefixedBackdropFilterLocations,
    },
  };
}

// ============================================================================
// CDP Helper & Controllable Static Production Server
// ============================================================================
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.csv': 'text/csv; charset=utf-8',
  '.ico': 'image/x-icon',
};

function startControllableDistServer() {
  if (!existsSync(join(DIST_DIR, 'index.html'))) {
    execFileSync('pnpm', ['run', 'build'], { cwd: ROOT_DIR, stdio: 'inherit' });
  }
  const serverState = {
    rejectAllNetworkRequests: false,
    rejectedRequestsWhileOffline: [],
    servedRequestsCount: 0,
  };

  const server = createServer((req, res) => {
    const reqUrl = req.url ?? '/';
    if (serverState.rejectAllNetworkRequests) {
      serverState.rejectedRequestsWhileOffline.push(reqUrl);
      req.socket.destroy();
      return;
    }
    serverState.servedRequestsCount += 1;
    const reqPath = reqUrl.split('?')[0];
    const safePath = normalize(decodeURIComponent(reqPath)).replace(/^(\.\.(\/|\\|$))+/, '');
    let filePath = join(DIST_DIR, safePath === '/' ? 'index.html' : safePath);
    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
      filePath = join(DIST_DIR, 'index.html');
    }
    try {
      const data = readFileSync(filePath);
      const mime = MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-cache' });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 4173;
      resolve({
        server,
        serverState,
        baseUrl: `http://127.0.0.1:${port}/`,
      });
    });
  });
}

class CdpSession {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.consoleErrors = [];
    this.pageErrors = [];

    this.ws.addEventListener('message', (event) => {
      const data = JSON.parse(String(event.data));
      if (typeof data.id === 'number') {
        const entry = this.pending.get(data.id);
        if (entry) {
          this.pending.delete(data.id);
          if (data.error) {
            entry.reject(new Error(data.error.message ?? 'CDP error'));
          } else {
            entry.resolve(data.result);
          }
        }
      } else if (data.method === 'Runtime.exceptionThrown') {
        this.pageErrors.push(
          data.params?.exceptionDetails?.text ||
            data.params?.exceptionDetails?.exception?.description ||
            'Unknown page exception',
        );
      } else if (data.method === 'Runtime.consoleAPICalled') {
        if (data.params?.type === 'error') {
          const text = (data.params.args ?? [])
            .map((a) => a.value ?? a.description ?? '')
            .join(' ');
          this.consoleErrors.push(text);
        }
      }
    });
  }

  static async connect(wsUrl) {
    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', () => resolve(), { once: true });
      ws.addEventListener(
        'error',
        (err) => reject(new Error(`WebSocket error: ${String(err)}`)),
        { once: true },
      );
    });
    return new CdpSession(ws);
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      const desc =
        res.exceptionDetails.exception?.description ??
        res.exceptionDetails.text ??
        'Evaluation failed';
      throw new Error(`Runtime.evaluate exception: ${desc}`);
    }
    return res.result?.value;
  }

  async screenshot(filePath) {
    const { data } = await this.send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
    });
    writeFileSync(filePath, Buffer.from(data, 'base64'));
  }

  close() {
    this.ws.close();
  }
}

async function launchIsolatedChromium(userDataDir) {
  if (!existsSync(CHROMIUM_BINARY)) {
    throw new Error(`Chromium binary not found at ${CHROMIUM_BINARY}`);
  }
  const proc = spawn(
    CHROMIUM_BINARY,
    [
      '--headless',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--remote-debugging-port=0',
      `--user-data-dir=${userDataDir}`,
      'about:blank',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );

  const wsUrl = await new Promise((resolve, reject) => {
    let stderr = '';
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for DevTools listening URL:\n${stderr}`));
    }, 15000);
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match?.[1]) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
    proc.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Chromium exited early with code ${code}:\n${stderr}`));
    });
  });

  const match = wsUrl.match(/^ws:\/\/127\.0\.0\.1:(\d+)\//);
  const debugPort = Number(match[1]);
  const targetsRes = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
  const targets = await targetsRes.json();
  const pageTarget = targets.find((t) => t.type === 'page');
  if (!pageTarget?.webSocketDebuggerUrl) {
    throw new Error('No page target found in Chromium');
  }
  const cdp = await CdpSession.connect(pageTarget.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('DOM.enable');
  await cdp.send('Network.enable');
  return { proc, cdp };
}

async function waitForCondition(cdp, predicateExpr, timeoutMs = 10000, description = 'condition') {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ok = await cdp.evaluate(predicateExpr);
      if (ok) return ok;
    } catch {
      // Ignore transient navigation evaluation errors
    }
    await new Promise((r) => setTimeout(r, 80));
  }
  let debugSnapshot = null;
  try {
    debugSnapshot = await cdp.evaluate(`({
      href: location.href,
      title: document.title,
      h1: document.querySelector('h1')?.textContent?.trim() ?? null,
      bodyPreview: document.body?.innerText?.slice(0, 350) ?? null
    })`);
  } catch {
    debugSnapshot = { error: 'unavailable' };
  }
  throw new Error(
    `Timed out waiting for ${description} after ${timeoutMs}ms. State: ${JSON.stringify(debugSnapshot)}`,
  );
}

// ============================================================================
// Track 3: PWA Installability, Service Worker Cache & Offline Re-entry Sequence Preservation
// ============================================================================
async function runPwaAndOfflinePreservationTrack(cdp, baseUrl, serverState) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });

  await cdp.send('Page.navigate', { url: baseUrl });
  await waitForCondition(
    cdp,
    `Boolean(document.querySelector('#main-content'))`,
    10000,
    'initial load for SW registration',
  );

  // Wait for Service Worker registration and activation, plus CacheStorage population
  await waitForCondition(
    cdp,
    `(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const reg = await navigator.serviceWorker.getRegistration('/');
      return Boolean(reg && reg.active && reg.active.state === 'activated');
    })()`,
    15000,
    'Service Worker active === activated',
  );

  // Reload once so the active Service Worker controls the client (since sw.js intentionally omits clients.claim() on first install)
  await cdp.send('Page.reload', { ignoreCache: false });
  await waitForCondition(
    cdp,
    `Boolean(document.querySelector('#main-content') && navigator.serviceWorker?.controller)`,
    10000,
    'Page controlled by active Service Worker after reload',
  );

  // Inspect manifest, SW registration, and CacheStorage inventory
  const pwaAudit = await cdp.evaluate(`(async () => {
    const manifestLink = document.querySelector('link[rel="manifest"]')?.getAttribute('href');
    const manifestRes = await fetch(manifestLink);
    const manifestJson = await manifestRes.json();
    const cacheKeys = await caches.keys();
    const shellCacheName = cacheKeys.find((k) => k.startsWith('flow-atelier-shell-')) ?? null;
    let cachedUrls = [];
    if (shellCacheName) {
      const cache = await caches.open(shellCacheName);
      const requests = await cache.keys();
      cachedUrls = requests.map((r) => new URL(r.url).pathname).sort();
    }
    const reg = await navigator.serviceWorker.getRegistration('/');
    return {
      isSecureContext: window.isSecureContext,
      manifestHref: manifestLink,
      manifestId: manifestJson.id,
      manifestStartUrl: manifestJson.start_url,
      manifestScope: manifestJson.scope,
      manifestDisplay: manifestJson.display,
      manifestIconsCount: manifestJson.icons?.length ?? 0,
      hasServiceWorkerController: Boolean(navigator.serviceWorker.controller),
      swScope: reg?.scope ?? null,
      swActiveState: reg?.active?.state ?? null,
      shellCacheName,
      cachedAssetCount: cachedUrls.length,
      hasCachedIndexHtml: cachedUrls.includes('/index.html'),
      hasCachedAppIcons:
        cachedUrls.includes('/icons/app-192.png') && cachedUrls.includes('/icons/app-512.png'),
      cachedJsCount: cachedUrls.filter((u) => u.endsWith('.js')).length,
      cachedCssCount: cachedUrls.filter((u) => u.endsWith('.css')).length,
    };
  })()`);

  // Verify PwaInstallPanel inside Settings dialog ('데이터 백업과 사용 안내')
  await cdp.evaluate(`(() => {
    // Dispatch synthetic beforeinstallprompt event to verify install prompt handling in isolated profile
    const evt = new Event('beforeinstallprompt', { cancelable: true });
    evt.prompt = async () => {};
    evt.userChoice = Promise.resolve({ outcome: 'accepted' });
    window.dispatchEvent(evt);

    const btn = document.querySelector('button[aria-label="데이터 백업과 사용 안내"]');
    btn?.click();
  })()`);
  await waitForCondition(
    cdp,
    `Boolean(document.querySelector('.pwa-install-panel'))`,
    10000,
    'PwaInstallPanel visible in Settings dialog',
  );
  await cdp.evaluate(`(() => {
    const notes = document.querySelector('.pwa-install-panel details.pwa-install-notes');
    if (notes) notes.open = true;
  })()`);

  const pwaSettingsCardState = await cdp.evaluate(`(() => {
    const card = document.querySelector('.pwa-install-panel');
    const text = card?.innerText ?? '';
    const installBtn = card?.querySelector('button.pwa-install-action');
    return {
      rendered: Boolean(card),
      showsOfflineReadyBadge: text.includes('기본 화면을 오프라인에서 열 준비가 됐어요.'),
      showsCanInstallButtonAfterSyntheticPrompt: Boolean(installBtn),
      installButtonLabel: installBtn?.textContent?.trim() ?? null,
      cardTextSummary: text.replace(/\\s+/g, ' ').trim(),
    };
  })()`);

  await cdp.screenshot(join(SCREENSHOT_DIR, 'r3-01-pwa-settings-offline-ready.png'));

  // Close Settings dialog
  await cdp.evaluate(`(() => {
    const openDialog = Array.from(document.querySelectorAll('dialog[open]')).at(-1);
    openDialog?.querySelector('button[aria-label="닫기"]')?.click();
  })()`);
  await waitForCondition(
    cdp,
    `document.querySelectorAll('dialog[open]').length === 0`,
    10000,
    'Settings dialog closed',
  );

  // Create and save a synthetic sequence containing D-01 & D-02A exercises + 1 rest step
  // Start from '새 수업 만들기' -> switch apparatus to '리포머' -> add 2 reformer exercises -> add 1 rest step -> save
  await cdp.evaluate(`(() => {
    const newClassBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('새 수업 만들기') && b.closest('[aria-label="새 수업 및 최근 수업 전환"]')
    );
    newClassBtn?.click();
  })()`);
  await waitForCondition(
    cdp,
    `Boolean(document.querySelector('[aria-label="첫 수업안 준비"]'))`,
    10000,
    'Empty Home welcome state',
  );

  // Switch apparatus to '리포머' in empty Home quick conditions and add 2 reformer exercises via Atlas
  await cdp.evaluate(`(() => {
    const navButtons = Array.from(document.querySelectorAll('nav button'));
    const atlasBtn = navButtons.find(
      (b) => b.getClientRects().length > 0 && b.textContent?.includes('동작')
    ) || navButtons.find((b) => b.textContent?.includes('동작'));
    atlasBtn?.click();
  })()`);
  await waitForCondition(
    cdp,
    `Array.from(document.querySelectorAll('button[aria-label$="수업안에 추가"]')).length > 0`,
    10000,
    'Atlas loaded for synthetic sequence setup',
  );
  await cdp.evaluate(`(() => {
    const group = document.querySelector('[aria-label="기구 선택"]');
    const matBtn = Array.from(group?.querySelectorAll('button') ?? []).find((b) =>
      b.textContent?.includes('매트')
    );
    matBtn?.click();
  })()`);
  await waitForCondition(
    cdp,
    `Boolean(Array.from(document.querySelectorAll('[aria-label="기구 선택"] button')).find((b) => b.textContent?.includes('매트') && b.getAttribute('aria-pressed') === 'true'))`,
    10000,
    'Atlas filtered to 매트',
  );
  await cdp.evaluate(`(() => {
    document.querySelectorAll('button[aria-label$="수업안에 추가"]')[0]?.click();
  })()`);
  await waitForCondition(
    cdp,
    `document.querySelectorAll('.movement-card.is-in-sequence').length >= 1`,
    10000,
    'First synthetic exercise added',
  );
  await cdp.evaluate(`(() => {
    document.querySelectorAll('button[aria-label$="수업안에 추가"]')[1]?.click();
  })()`);
  await waitForCondition(
    cdp,
    `document.querySelectorAll('.movement-card.is-in-sequence').length >= 2`,
    10000,
    'Second synthetic exercise added',
  );

  // Return to Workbench, insert a Rest step, set synthetic sequence title, and save
  await cdp.evaluate(`(() => {
    const navButtons = Array.from(document.querySelectorAll('nav button'));
    const wbBtn = navButtons.find(
      (b) => b.getClientRects().length > 0 && b.textContent?.includes('수업') && !b.textContent?.includes('기록')
    ) || navButtons.find((b) => b.textContent?.includes('오늘의 수업'));
    wbBtn?.click();
  })()`);
  await waitForCondition(
    cdp,
    `document.querySelectorAll('.sequence-order-card').length === 2`,
    10000,
    'Workbench has 2 exercise cards',
  );

  await cdp.evaluate(`(() => {
    const restDetails = document.querySelector('details.rest-insert-control');
    if (restDetails) {
      restDetails.open = true;
      const insertRestBtn = Array.from(restDetails.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('이 위치에 휴식 넣기')
      );
      insertRestBtn?.click();
    }
  })()`);
  await waitForCondition(
    cdp,
    `document.querySelectorAll('.sequence-order-card').length === 3`,
    10000,
    'Workbench has 3 steps (2 exercises + 1 rest)',
  );

  const syntheticTitle = '[합성-R3] 오프라인 재진입 수업안 보존 검증';
  await cdp.evaluate(`(() => {
    const titleInput = document.querySelector('input[aria-label="시퀀스 제목"]');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    setter?.call(titleInput, ${JSON.stringify(syntheticTitle)});
    titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    titleInput.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await new Promise((r) => setTimeout(r, 80));
  await cdp.evaluate(`(() => {
    document.querySelector('button.save-flow')?.click();
  })()`);
  await new Promise((r) => setTimeout(r, 120));

  const preOfflineSnapshot = await cdp.evaluate(`(() => {
    const titleInput = document.querySelector('input[aria-label="시퀀스 제목"]');
    const stepIds = Array.from(document.querySelectorAll('.sequence-order-card')).map((el) =>
      el.getAttribute('data-order-step')
    );
    const stepHeadings = Array.from(document.querySelectorAll('.sequence-order-card h3')).map((el) =>
      el.textContent?.trim() ?? ''
    );
    const rawStorage = window.localStorage.getItem('pilates-flow-atelier-storage-v3') ?? '';
    const parsed = rawStorage ? JSON.parse(rawStorage) : null;
    const savedSeqTitles = (parsed?.state?.savedSequences ?? []).map((s) => s.title);
    return {
      title: titleInput?.value ?? '',
      stepCount: stepIds.length,
      stepIds,
      stepHeadings,
      savedSeqTitles,
      hasSavedSyntheticSequence: savedSeqTitles.includes(${JSON.stringify(syntheticTitle)}),
      localStorageBytes: rawStorage.length,
    };
  })()`);

  // =========================================================================
  // Switch BOTH Server and Browser to Offline Mode & Re-enter App
  // =========================================================================
  serverState.rejectAllNetworkRequests = true;
  serverState.rejectedRequestsWhileOffline = [];
  await cdp.send('Network.emulateNetworkConditions', {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0,
  });

  // Reload / Re-enter while completely offline
  await cdp.send('Page.reload', { ignoreCache: false });
  await waitForCondition(
    cdp,
    `Boolean(document.querySelector('input[aria-label="시퀀스 제목"]')) && document.querySelectorAll('.sequence-order-card').length === 3`,
    10000,
    'Offline re-entry rendered SequenceWorkbench with 3 preserved steps',
  );

  const postOfflineSnapshot = await cdp.evaluate(`(() => {
    const titleInput = document.querySelector('input[aria-label="시퀀스 제목"]');
    const stepIds = Array.from(document.querySelectorAll('.sequence-order-card')).map((el) =>
      el.getAttribute('data-order-step')
    );
    const stepHeadings = Array.from(document.querySelectorAll('.sequence-order-card h3')).map((el) =>
      el.textContent?.trim() ?? ''
    );
    const rawStorage = window.localStorage.getItem('pilates-flow-atelier-storage-v3') ?? '';
    const parsed = rawStorage ? JSON.parse(rawStorage) : null;
    const savedSeqTitles = (parsed?.state?.savedSequences ?? []).map((s) => s.title);
    return {
      navigatorOnLine: navigator.onLine,
      controlledByServiceWorker: Boolean(navigator.serviceWorker?.controller),
      title: titleInput?.value ?? '',
      stepCount: stepIds.length,
      stepIds,
      stepHeadings,
      savedSeqTitles,
      hasSavedSyntheticSequence: savedSeqTitles.includes(${JSON.stringify(syntheticTitle)}),
      localStorageBytes: rawStorage.length,
    };
  })()`);

  await cdp.screenshot(join(SCREENSHOT_DIR, 'r3-02-offline-reentry-sequence-preserved.png'));

  // Also test navigating to ExerciseAtlasView and SequencePlanPreview while still offline!
  await cdp.evaluate(`(() => {
    document.querySelector('button.v3-preview-button')?.click();
  })()`);
  await waitForCondition(
    cdp,
    `Boolean(document.querySelector('dialog.sequence-plan-preview[open]'))`,
    10000,
    'SequencePlanPreview opened while offline',
  );
  await cdp.evaluate(`(() => {
    const dialog = document.querySelector('dialog.sequence-plan-preview[open]');
    dialog?.querySelector('button[aria-label="닫기"]')?.click();
  })()`);

  // Probe the query-string offline navigation residual risk (/?utm_source=pwa)
  const queryStringOfflineProbe = await cdp.evaluate(`(async () => {
    try {
      const res = await fetch('/?utm_source=pwa', { headers: { Accept: 'text/html' } });
      return { ok: res.ok, status: res.status };
    } catch (err) {
      return {
        ok: false,
        error: String(err),
        reason: 'sw.js line 58 (if (... || url.search) return;) skips requests with query parameters',
      };
    }
  })()`);

  // Restore online state
  serverState.rejectAllNetworkRequests = false;
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });

  const sequencePreservedExactly =
    preOfflineSnapshot.title === postOfflineSnapshot.title &&
    preOfflineSnapshot.stepCount === postOfflineSnapshot.stepCount &&
    JSON.stringify(preOfflineSnapshot.stepIds) === JSON.stringify(postOfflineSnapshot.stepIds) &&
    JSON.stringify(preOfflineSnapshot.stepHeadings) ===
      JSON.stringify(postOfflineSnapshot.stepHeadings) &&
    postOfflineSnapshot.hasSavedSyntheticSequence;

  if (!sequencePreservedExactly) {
    throw new Error(
      `Offline sequence preservation failed: pre=${JSON.stringify(preOfflineSnapshot)}, post=${JSON.stringify(postOfflineSnapshot)}`,
    );
  }

  return {
    pwaAudit,
    pwaSettingsCardState,
    preOfflineSnapshot,
    postOfflineSnapshot,
    sequencePreservedExactly,
    queryStringOfflineProbe,
  };
}

// ============================================================================
// Track 4: Re-visiting Diagram-Included Paths (55ce22d / b2d6022)
// ============================================================================
async function runDiagramPathsRevisitTrack(cdp, baseUrl) {
  const viewportChecks = [];

  for (const vp of [
    { width: 320, height: 740, mobile: true, label: '320px' },
    { width: 1440, height: 900, mobile: false, label: '1440px' },
  ]) {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.mobile,
    });

    await cdp.send('Page.navigate', { url: baseUrl });
    await waitForCondition(
      cdp,
      `Boolean(document.querySelector('#main-content'))`,
      10000,
      `Main content at ${vp.label}`,
    );

    // 1. Navigate to ExerciseAtlasView ('동작 라이브러리')
    await cdp.evaluate(`(() => {
      const navButtons = Array.from(document.querySelectorAll('nav button'));
      const atlasBtn = navButtons.find(
        (b) => b.getClientRects().length > 0 && b.textContent?.includes('동작')
      ) || navButtons.find((b) => b.textContent?.includes('동작'));
      atlasBtn?.click();
    })()`);
    await waitForCondition(
      cdp,
      `Boolean(document.querySelector('[aria-label="모션으로 살펴보기"]'))`,
      10000,
      `ExerciseAtlasView pattern discovery rail at ${vp.label}`,
    );

    // Click first pattern tile in '모션으로 살펴보기' to open '선택한 패턴 도해 미리보기'
    await cdp.evaluate(`(() => {
      const firstTile = document.querySelector('.ml-pattern-tile');
      firstTile?.click();
    })()`);
    await waitForCondition(
      cdp,
      `Boolean(document.querySelector('[aria-label="선택한 패턴 도해 미리보기"] svg'))`,
      10000,
      `MotionPatternPreview open at ${vp.label}`,
    );

    const patternPreviewMetrics = await cdp.evaluate(`(() => {
      const preview = document.querySelector('[aria-label="선택한 패턴 도해 미리보기"]');
      const svgCount = preview?.querySelectorAll('svg').length ?? 0;
      const overflowPx = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
      return {
        svgCount,
        overflowPx,
        zeroHorizontalOverflow: overflowPx === 0,
      };
    })()`);

    await cdp.screenshot(join(SCREENSHOT_DIR, `r3-03-atlas-pattern-preview-${vp.width}.png`));

    // Close pattern preview
    await cdp.evaluate(`(() => {
      document.querySelector('button[aria-label="패턴 도해 미리보기 닫기"]')?.click();
    })()`);

    // 2. Visit & Re-visit each of the 5 D-01..D-05 exercises in YouTubeClipModal -> MovementDiagramReference ('참고 자세 그림')
    const exerciseDiagramResults = [];
    for (const target of DIAGRAM_REVISIT_EXERCISES) {
      // Search by Korean name in ExerciseAtlasView
      await cdp.evaluate(`(() => {
        const resetBtn = Array.from(document.querySelectorAll('button')).find((b) =>
          b.textContent?.includes('필터 초기화')
        );
        resetBtn?.click();
        const searchInput = document.querySelector('input[aria-label="동작 검색"]');
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        setter?.call(searchInput, ${JSON.stringify(target.nameKo)});
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        searchInput.dispatchEvent(new Event('change', { bubbles: true }));
      })()`);

      await waitForCondition(
        cdp,
        `Array.from(document.querySelectorAll('.movement-card h2 button')).some((b) => b.textContent?.trim() === ${JSON.stringify(target.nameKo)})`,
        10000,
        `Search card for ${target.nameKo} at ${vp.label}`,
      );

      // Open detail modal (YouTubeClipModal)
      await cdp.evaluate(`(() => {
        const titleBtn = Array.from(document.querySelectorAll('.movement-card h2 button')).find(
          (b) => b.textContent?.trim() === ${JSON.stringify(target.nameKo)}
        );
        titleBtn?.click();
      })()`);

      await waitForCondition(
        cdp,
        `Boolean(document.querySelector('details.movement-diagram-reference'))`,
        10000,
        `YouTubeClipModal with details.movement-diagram-reference for ${target.nameKo}`,
      );

      // Expand '참고 자세 그림' (<details class="movement-diagram-reference">)
      await cdp.evaluate(`(() => {
        const details = document.querySelector('details.movement-diagram-reference');
        if (details) {
          details.open = true;
          details.dispatchEvent(new Event('toggle'));
        }
      })()`);

      await waitForCondition(
        cdp,
        `Boolean(document.querySelector('svg.movement-phase-diagram-svg'))`,
        10000,
        `MovementPhaseDiagramSvg rendered for ${target.nameKo}`,
      );

      const diagramCheck = await cdp.evaluate(`(() => {
        const svg = document.querySelector('svg.movement-phase-diagram-svg');
        const outerHtml = svg?.outerHTML ?? '';
        const hasNaNOrUndefined = /NaN|undefined/.test(outerHtml);
        const archetype = svg?.getAttribute('data-archetype-id') ?? null;
        const apparatus = svg?.getAttribute('data-apparatus') ?? null;
        const phase = svg?.getAttribute('data-phase') ?? null;
        const jointNodeCount = svg?.querySelectorAll('[data-joint-node]').length ?? 0;
        const sectionText =
          document.querySelector('.movement-diagram-reference-content')?.innerText ?? '';
        const hasHonestDisclaimer = sectionText.includes(
          '해부학적 정확성과 운동 안전성은 검증되지 않았어요'
        );
        const overflowPx = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
        return {
          exerciseId: ${JSON.stringify(target.exerciseId)},
          defectId: ${JSON.stringify(target.defectId)},
          nameKo: ${JSON.stringify(target.nameKo)},
          archetype,
          apparatus,
          phase,
          jointNodeCount,
          hasNaNOrUndefined,
          hasHonestDisclaimer,
          overflowPx,
          zeroHorizontalOverflow: overflowPx === 0,
        };
      })()`);

      if (
        diagramCheck.archetype !== target.expectedArchetype ||
        diagramCheck.apparatus !== target.expectedApparatus ||
        diagramCheck.hasNaNOrUndefined ||
        !diagramCheck.hasHonestDisclaimer ||
        !diagramCheck.zeroHorizontalOverflow
      ) {
        throw new Error(
          `Diagram verification failed for ${target.exerciseId} at ${vp.label}: ${JSON.stringify(diagramCheck)}`,
        );
      }

      if (target.defectId === 'D-01' || target.defectId === 'D-04') {
        await cdp.screenshot(
          join(SCREENSHOT_DIR, `r3-04-diagram-${target.defectId.toLowerCase()}-${vp.width}.png`),
        );
      }

      // Close YouTubeClipModal
      await cdp.evaluate(`(() => {
        const openDialog = Array.from(document.querySelectorAll('dialog[open]')).at(-1);
        const closeBtn =
          openDialog?.querySelector('button[aria-label="닫기"]') ||
          Array.from(openDialog?.querySelectorAll('button') ?? []).find((b) =>
            b.textContent?.includes('닫기')
          );
        closeBtn?.click();
      })()`);
      await waitForCondition(
        cdp,
        `!document.querySelector('details.movement-diagram-reference')`,
        10000,
        `YouTubeClipModal closed for ${target.nameKo}`,
      );

      exerciseDiagramResults.push(diagramCheck);
    }

    // 3. Re-visit SequenceWorkbench -> SequencePlanPreview ('시퀀스 미리보기') -> back to ExerciseAtlasView -> re-open D-01 diagram
    await cdp.evaluate(`(() => {
      const navButtons = Array.from(document.querySelectorAll('nav button'));
      const wbBtn = navButtons.find(
        (b) => b.getClientRects().length > 0 && b.textContent?.includes('수업') && !b.textContent?.includes('기록')
      ) || navButtons.find((b) => b.textContent?.includes('오늘의 수업'));
      wbBtn?.click();
    })()`);
    await waitForCondition(
      cdp,
      `document.querySelectorAll('.sequence-order-card').length >= 2`,
      10000,
      `Workbench re-visited at ${vp.label}`,
    );

    await cdp.evaluate(`(() => {
      document.querySelector('button.v3-preview-button')?.click();
    })()`);
    await waitForCondition(
      cdp,
      `Boolean(document.querySelector('dialog.sequence-plan-preview[open]'))`,
      10000,
      `SequencePlanPreview re-visited at ${vp.label}`,
    );
    const planPreviewOverflow = await cdp.evaluate(`(() => {
      const overflowPx = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
      const svgCount = document.querySelectorAll('dialog.sequence-plan-preview svg').length;
      return { overflowPx, zeroHorizontalOverflow: overflowPx === 0, svgCount };
    })()`);
    await cdp.evaluate(`(() => {
      const dialog = document.querySelector('dialog.sequence-plan-preview[open]');
      dialog?.querySelector('button[aria-label="닫기"]')?.click();
    })()`);

    viewportChecks.push({
      viewport: vp.label,
      patternPreviewMetrics,
      exerciseDiagramResults,
      planPreviewOverflow,
    });
  }

  return viewportChecks;
}

async function main() {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });

  console.log('[1/4] Verifying Git ancestry (including 55ce22d and b2d6022 on origin/main)...');
  const ancestry = verifyGitAncestry();
  console.log('      PASS: origin/main =', ancestry.originMainSha);

  console.log('[2/4] Auditing Safari/WebKit runtime availability & static compatibility...');
  const safariWebkitAudit = auditSafariWebKitCompatibility();
  console.log('      Safari/WebKit verdict:', safariWebkitAudit.safariRuntimeVerdict);

  const { server: httpServer, serverState, baseUrl } = await startControllableDistServer();
  console.log(`[3/4] Controllable static production server listening at ${baseUrl}`);

  const userDataDir = mkdtempSync(join(tmpdir(), 'pilates-round3-isolated-'));
  let chromiumProc = null;
  let cdp = null;

  try {
    const launched = await launchIsolatedChromium(userDataDir);
    chromiumProc = launched.proc;
    cdp = launched.cdp;

    console.log('  -> Running Track 3: PWA installability, SW cache & offline sequence preservation...');
    const pwaOfflineTrack = await runPwaAndOfflinePreservationTrack(cdp, baseUrl, serverState);
    console.log(
      `     PASS Track 3: cachedAssets=${pwaOfflineTrack.pwaAudit.cachedAssetCount}, offlineReady=${pwaOfflineTrack.pwaSettingsCardState.showsOfflineReadyBadge}, sequencePreserved=${pwaOfflineTrack.sequencePreservedExactly}`,
    );

    console.log('  -> Running Track 4: Diagram-included paths re-visit (D-01..D-05 at 320px & 1440px)...');
    const diagramRevisitTrack = await runDiagramPathsRevisitTrack(cdp, baseUrl);
    console.log(
      `     PASS Track 4: verified ${diagramRevisitTrack.length} viewports x ${DIAGRAM_REVISIT_EXERCISES.length} diagram exercises`,
    );

    const summary = {
      verifiedAt: new Date().toISOString(),
      suite: 'integrated-release-readiness-round3-20261107',
      ancestry,
      safariWebkitAudit,
      pwaOfflineTrack,
      diagramRevisitTrack,
      consoleErrorCount: cdp.consoleErrors.length,
      pageErrorCount: cdp.pageErrors.length,
      consoleErrors: cdp.consoleErrors,
      pageErrors: cdp.pageErrors,
      overallChromiumTracksPass:
        ancestry.allIncluded &&
        pwaOfflineTrack.pwaAudit.hasServiceWorkerController &&
        pwaOfflineTrack.pwaAudit.cachedAssetCount === 42 &&
        pwaOfflineTrack.sequencePreservedExactly &&
        diagramRevisitTrack.every((v) =>
          v.exerciseDiagramResults.every((r) => r.zeroHorizontalOverflow && !r.hasNaNOrUndefined),
        ) &&
        cdp.pageErrors.length === 0,
    };

    const outputPath = join(EVIDENCE_DIR, 'round3-verification-summary.json');
    writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
    console.log(`[4/4] Wrote Round 3 verification summary to ${outputPath}`);

    if (!summary.overallChromiumTracksPass) {
      console.error('One or more Round 3 gates failed:', JSON.stringify(summary, null, 2));
      process.exitCode = 1;
    }
  } finally {
    try {
      cdp?.close();
    } catch {
      // ignore
    }
    if (chromiumProc) {
      chromiumProc.kill('SIGKILL');
    }
    await new Promise((resolve) => httpServer.close(() => resolve()));
    rmSync(userDataDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
