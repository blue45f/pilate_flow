#!/usr/bin/env node
/**
 * Track B Auditor Runner (`run-track-b-audit.mjs`)
 *
 * HONESTY MANDATE:
 * Real Apple Safari (macOS Safari / iOS Safari / iOS Simulator / WebKit) is NOT installed
 * or executed in this Debian 12 Linux environment (`realSafariExecuted: false`).
 * All iOS Safari, iPadOS Safari, and macOS Safari checks in this runner are mock/emulated
 * tests (Vitest + jsdom unit/integration tests and Headless Chromium 156 CDP User-Agent,
 * platform, viewport, and synthetic DOM event emulation).
 */

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../..');
const DIST_DIR = path.join(REPO_ROOT, 'dist');
const DOCS_OUT_DIR = path.join(REPO_ROOT, 'docs/pwa-audit-20261107/track-b');
const RESULTS_JSON_PATH = path.join(DOCS_OUT_DIR, 'track-b-results.json');
const VITEST_TARGET = 'scripts/pwa-audit-20261107/track-b/track-b-install-flow-mock.test.tsx';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function runVitestJson() {
  const tmpJsonFile = path.join(
    os.tmpdir(),
    `pwa-track-b-vitest-${process.pid}-${Date.now()}.json`,
  );
  try {
    const result = spawnSync(
      'pnpm',
      ['exec', 'vitest', 'run', VITEST_TARGET, '--reporter=json', `--outputFile=${tmpJsonFile}`],
      {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        maxBuffer: 16 * 1024 * 1024,
      },
    );

    if (!fs.existsSync(tmpJsonFile)) {
      throw new Error(
        `Vitest JSON output was not generated (status=${result.status}):\n${result.stderr || result.stdout}`,
      );
    }

    const parsed = JSON.parse(fs.readFileSync(tmpJsonFile, 'utf8'));
    const suiteAssertions = (parsed.testResults ?? []).flatMap((suite) =>
      (suite.assertionResults ?? []).map((assertion) => ({
        fullName: assertion.fullName,
        title: assertion.title,
        status: assertion.status,
        durationMs: Math.round(assertion.duration ?? 0),
      })),
    );

    return {
      exitCode: result.status ?? 1,
      success: Boolean(parsed.success && result.status === 0),
      numTotalTestSuites: parsed.numTotalTestSuites ?? 0,
      numPassedTestSuites: parsed.numPassedTestSuites ?? 0,
      numTotalTests: parsed.numTotalTests ?? 0,
      numPassedTests: parsed.numPassedTests ?? 0,
      numFailedTests: parsed.numFailedTests ?? 0,
      assertions: suiteAssertions,
    };
  } finally {
    if (fs.existsSync(tmpJsonFile)) {
      fs.rmSync(tmpJsonFile, { force: true });
    }
  }
}

function startStaticDistServer() {
  if (!fs.existsSync( path.join(DIST_DIR, 'index.html') )) {
    throw new Error(`dist/index.html not found at ${DIST_DIR}. Do not rebuild; check workspace.`);
  }

  const server = http.createServer((req, res) => {
    const urlObj = new URL(req.url ?? '/', 'http://127.0.0.1');
    const cleanPath = decodeURIComponent(urlObj.pathname);
    let filePath = path.join(DIST_DIR, cleanPath === '/' ? 'index.html' : cleanPath);

    if (!filePath.startsWith(DIST_DIR)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Failed to bind static server port'));
        return;
      }
      resolve({
        server,
        port: address.port,
        baseUrl: `http://127.0.0.1:${address.port}`,
        close: () =>
          new Promise((resClose) => {
            server.close(() => resClose());
          }),
      });
    });
  });
}

function launchIsolatedChromium(tempProfileDir) {
  return new Promise((resolve, reject) => {
    const args = [
      '--headless',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-default-browser-check',
      '--no-proxy-server',
      '--remote-debugging-port=0',
      `--user-data-dir=${tempProfileDir}`,
      'about:blank',
    ];

    const child = spawn('/usr/bin/chromium', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderrBuf = '';
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        child.kill('SIGKILL');
        reject(new Error(`Timed out waiting for Chromium DevTools WS URL. Stderr:\n${stderrBuf}`));
      }
    }, 15000);

    const onData = (chunk) => {
      stderrBuf += chunk.toString();
      const match = stderrBuf.match(/DevTools listening on (ws:\/\/127\.0\.0\.1:\d+\/[^\s]+)/);
      if (match && !resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve({
          child,
          browserWsUrl: match[1],
        });
      }
    };

    child.stderr.on('data', onData);
    child.stdout.on('data', onData);
    child.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(err);
      }
    });
    child.on('exit', (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(new Error(`Chromium exited prematurely with code ${code}. Stderr:\n${stderrBuf}`));
      }
    });
  });
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.nextId = 1;
    this.pending = new Map();
    this.eventListeners = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', () => resolve(), { once: true });
      this.ws.addEventListener('error', (err) => reject(err), { once: true });
    });

    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(String(event.data));
      if (typeof msg.id === 'number') {
        const entry = this.pending.get(msg.id);
        if (entry) {
          this.pending.delete(msg.id);
          if (msg.error) {
            entry.reject(new Error(`CDP error (${msg.error.code}): ${msg.error.message}`));
          } else {
            entry.resolve(msg.result);
          }
        }
      } else if (msg.method) {
        const key = msg.sessionId ? `${msg.sessionId}:${msg.method}` : msg.method;
        const handlers = this.eventListeners.get(key);
        if (handlers) {
          for (const handler of [...handlers]) {
            handler(msg.params);
          }
        }
      }
    });
  }

  send(method, params = {}, sessionId = undefined) {
    const id = this.nextId++;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(payload));
    });
  }

  async evaluate(sessionId, expression) {
    const res = await this.send(
      'Runtime.evaluate',
      {
        expression,
        awaitPromise: true,
        returnByValue: true,
      },
      sessionId,
    );
    if (res.exceptionDetails) {
      throw new Error(
        `Runtime.evaluate exception: ${res.exceptionDetails.text} ${res.exceptionDetails.exception?.description ?? ''}`,
      );
    }
    return res.result?.value;
  }

  close() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
  }
}

async function createScenarioSession(cdp, { baseUrl, width, height, mobile, userAgent, platform }) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', {
    targetId,
    flatten: true,
  });

  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Runtime.enable', {}, sessionId);
  await cdp.send('DOM.enable', {}, sessionId);

  await cdp.send(
    'Emulation.setDeviceMetricsOverride',
    {
      width,
      height,
      deviceScaleFactor: mobile ? 3 : 1,
      mobile,
    },
    sessionId,
  );

  await cdp.send(
    'Emulation.setUserAgentOverride',
    {
      userAgent,
      platform,
    },
    sessionId,
  );

  // Suppress unsolicited native Chromium C++ AppBannerManager beforeinstallprompt events
  // so emulated iOS scenarios (where WebKit never fires beforeinstallprompt) and
  // deterministic Android lifecycle steps are controlled exclusively by __trackBSynthetic events.
  await cdp.send(
    'Page.addScriptToEvaluateOnNewDocument',
    {
      source: `
        window.__nativeBeforeInstallPromptCount = 0;
        window.addEventListener(
          'beforeinstallprompt',
          (event) => {
            if (!event.__trackBSynthetic) {
              window.__nativeBeforeInstallPromptCount += 1;
              event.preventDefault();
              event.stopImmediatePropagation();
            }
          },
          true
        );
      `,
    },
    sessionId,
  );

  await cdp.send('Page.navigate', { url: baseUrl }, sessionId);

  // Wait for React app and .pwa-sidebar-button to mount
  await cdp.evaluate(
    sessionId,
    `new Promise((resolve, reject) => {
      const deadline = Date.now() + 10000;
      const tick = () => {
        if (document.querySelector('.pwa-sidebar-button')) {
          resolve(true);
          return;
        }
        if (Date.now() > deadline) {
          reject(new Error('Timed out waiting for .pwa-sidebar-button to mount'));
          return;
        }
        setTimeout(tick, 50);
      };
      tick();
    })`,
  );

  return {
    targetId,
    sessionId,
    close: async () => {
      await cdp.send('Target.closeTarget', { targetId });
    },
  };
}

async function openInstallDialogInDom(cdp, sessionId, isMobile) {
  return cdp.evaluate(
    sessionId,
    `new Promise((resolve, reject) => {
      const menuBtn = document.querySelector('button[aria-label="메뉴 열기"]');
      if (${isMobile ? 'true' : 'false'} && menuBtn) {
        menuBtn.click();
      }
      const installBtn = document.querySelector('.pwa-sidebar-button');
      if (!installBtn) {
        reject(new Error('.pwa-sidebar-button not found'));
        return;
      }
      installBtn.click();
      const deadline = Date.now() + 5000;
      const waitDialog = () => {
        const panel = document.querySelector('dialog[open] .pwa-install-panel');
        if (panel) {
          resolve(true);
          return;
        }
        if (Date.now() > deadline) {
          reject(new Error('Timed out waiting for dialog[open] .pwa-install-panel'));
          return;
        }
        setTimeout(waitDialog, 30);
      };
      waitDialog();
    })`,
  );
}

async function runCdpScenarios(baseUrl, cdp) {
  const scenarios = [];

  // Scenario 1: Mocked iOS Safari UA at 390x844
  {
    const session = await createScenarioSession(cdp, {
      baseUrl,
      width: 390,
      height: 844,
      mobile: true,
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.3 Mobile/15E148 Safari/604.1',
      platform: 'iPhone',
    });
    try {
      await openInstallDialogInDom(cdp, session.sessionId, true);
      const snapshot = await cdp.evaluate(
        session.sessionId,
        `(() => {
          const panel = document.querySelector('dialog[open] .pwa-install-panel');
          const steps = Array.from(panel.querySelectorAll('ol > li')).map((li) => li.textContent.trim());
          const installBtn = panel.querySelector('.pwa-install-action');
          const manualDetails = panel.querySelector('details:not(.pwa-install-notes)');
          const notesText = panel.querySelector('details.pwa-install-notes')?.textContent ?? '';
          return {
            heading: panel.querySelector('#pwa-install-heading')?.textContent?.trim(),
            orderedStepsCount: steps.length,
            orderedSteps: steps,
            hasInstallButton: Boolean(installBtn),
            hasManualFallbackDetails: Boolean(manualDetails),
            hasStorageSeparationWarning: notesText.includes('Safari와 홈 화면 앱의 자료가 따로 보일 수 있으니'),
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
            noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth + 1,
          };
        })()`,
      );

      const passed =
        snapshot.orderedStepsCount === 3 &&
        snapshot.orderedSteps[0].includes('공유') &&
        snapshot.orderedSteps[1].includes('홈 화면에 추가') &&
        snapshot.orderedSteps[2].includes('웹 앱으로 열기') &&
        !snapshot.hasInstallButton &&
        !snapshot.hasManualFallbackDetails &&
        snapshot.hasStorageSeparationWarning &&
        snapshot.noHorizontalOverflow;

      scenarios.push({
        id: 'cdp-scenario-1-ios-safari-mock',
        name: 'Scenario 1: Mocked iOS Safari UA (390x844) via Emulation.setUserAgentOverride (NOT real Safari)',
        emulatedOnly: true,
        realSafariExecuted: false,
        viewport: { width: 390, height: 844 },
        passed,
        details: snapshot,
      });
    } finally {
      await session.close();
    }
  }

  // Scenario 2: Mocked iOS Chrome (CriOS) UA at 390x844
  {
    const session = await createScenarioSession(cdp, {
      baseUrl,
      width: 390,
      height: 844,
      mobile: true,
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/134.0.6998.99 Mobile/15E148 Safari/604.1',
      platform: 'iPhone',
    });
    try {
      await openInstallDialogInDom(cdp, session.sessionId, true);
      const snapshot = await cdp.evaluate(
        session.sessionId,
        `(() => {
          const panel = document.querySelector('dialog[open] .pwa-install-panel');
          const panelText = panel.textContent ?? '';
          const orderedStepsCount = panel.querySelectorAll('ol > li').length;
          const installBtn = panel.querySelector('.pwa-install-action');
          return {
            hasOpenInSafariGuidance: panelText.includes('이 주소를 Safari에서 연 다음 공유 → 홈 화면에 추가를 선택하세요.'),
            orderedStepsCount,
            hasInstallButton: Boolean(installBtn),
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
            noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth + 1,
          };
        })()`,
      );

      const passed =
        snapshot.hasOpenInSafariGuidance &&
        snapshot.orderedStepsCount === 0 &&
        !snapshot.hasInstallButton &&
        snapshot.noHorizontalOverflow;

      scenarios.push({
        id: 'cdp-scenario-2-ios-chrome-crios-mock',
        name: 'Scenario 2: Mocked iOS Chrome CriOS UA (390x844) via Emulation.setUserAgentOverride',
        emulatedOnly: true,
        realSafariExecuted: false,
        viewport: { width: 390, height: 844 },
        passed,
        details: snapshot,
      });
    } finally {
      await session.close();
    }
  }

  // Scenario 3: Mocked Android Chrome at 412x915 (Prompt Branching, Dismissal, Re-exposure, Acceptance, appinstalled)
  {
    const session = await createScenarioSession(cdp, {
      baseUrl,
      width: 412,
      height: 915,
      mobile: true,
      userAgent:
        'Mozilla/5.0 (Linux; Android 15; Pixel 9 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36',
      platform: 'Linux armv81',
    });
    try {
      await openInstallDialogInDom(cdp, session.sessionId, true);

      const flowResult = await cdp.evaluate(
        session.sessionId,
        `new Promise(async (resolve, reject) => {
          try {
            const getPanel = () => document.querySelector('dialog[open] .pwa-install-panel');
            const getFallbackDetails = () => getPanel()?.querySelector('details:not(.pwa-install-notes)');
            const getInstallBtn = () => getPanel()?.querySelector('.pwa-install-action');
            const getStatusTexts = () =>
              Array.from(getPanel()?.querySelectorAll('[role="status"]') ?? []).map((el) => el.textContent.trim());

            // 1. Initial state before beforeinstallprompt
            const initial = {
              nativeBeforeInstallPromptInterceptedCount: window.__nativeBeforeInstallPromptCount ?? 0,
              hasInstallButton: Boolean(getInstallBtn()),
              fallbackDetailsOpen: Boolean(getFallbackDetails()?.open),
            };

            // 2. Dispatch first synthetic beforeinstallprompt
            let resolveFirstChoice;
            let firstPromptCalls = 0;
            const firstEvent = new Event('beforeinstallprompt', { cancelable: true });
            firstEvent.__trackBSynthetic = true;
            firstEvent.prompt = () => {
              firstPromptCalls += 1;
              return Promise.resolve();
            };
            firstEvent.userChoice = new Promise((r) => {
              resolveFirstChoice = r;
            });
            window.dispatchEvent(firstEvent);
            await new Promise((r) => setTimeout(r, 30));

            const afterFirstPromptEvent = {
              defaultPrevented: firstEvent.defaultPrevented,
              firstPromptCallsBeforeClick: firstPromptCalls,
              hasInstallButton: Boolean(getInstallBtn()),
              installButtonText: getInstallBtn()?.textContent?.trim() ?? null,
              fallbackDetailsOpen: Boolean(getFallbackDetails()?.open),
            };

            // 3. Click install button -> prompting state -> resolve dismissed
            getInstallBtn().click();
            await new Promise((r) => setTimeout(r, 20));
            const duringPrompting = {
              hasInstallButton: Boolean(getInstallBtn()),
              statusTexts: getStatusTexts(),
            };

            resolveFirstChoice({ outcome: 'dismissed' });
            await new Promise((r) => setTimeout(r, 30));

            const afterDismissed = {
              firstPromptCallsAfterClick: firstPromptCalls,
              hasInstallButton: Boolean(getInstallBtn()),
              fallbackDetailsOpen: Boolean(getFallbackDetails()?.open),
              statusTexts: getStatusTexts(),
            };

            // 4. Close and reopen dialog before any new beforeinstallprompt
            const closeBtn = document.querySelector('dialog[open] button[aria-label="닫기"]');
            closeBtn.click();
            await new Promise((r) => setTimeout(r, 40));
            const dialogClosed = !document.querySelector('dialog[open] .pwa-install-panel');

            const menuBtn = document.querySelector('button[aria-label="메뉴 열기"]');
            if (menuBtn) menuBtn.click();
            document.querySelector('.pwa-sidebar-button').click();
            await new Promise((r) => setTimeout(r, 40));

            const afterReopenBeforeSecondEvent = {
              dialogClosedInBetween: dialogClosed,
              hasInstallButton: Boolean(getInstallBtn()),
              fallbackDetailsOpen: Boolean(getFallbackDetails()?.open),
              statusTexts: getStatusTexts(),
            };

            // 5. Dispatch second fresh beforeinstallprompt -> verify re-exposure
            let resolveSecondChoice;
            let secondPromptCalls = 0;
            const secondEvent = new Event('beforeinstallprompt', { cancelable: true });
            secondEvent.__trackBSynthetic = true;
            secondEvent.prompt = () => {
              secondPromptCalls += 1;
              return Promise.resolve();
            };
            secondEvent.userChoice = new Promise((r) => {
              resolveSecondChoice = r;
            });
            window.dispatchEvent(secondEvent);
            await new Promise((r) => setTimeout(r, 30));

            const afterSecondPromptReExposure = {
              hasInstallButton: Boolean(getInstallBtn()),
              fallbackDetailsOpen: Boolean(getFallbackDetails()?.open),
              statusTexts: getStatusTexts(),
              findingBF2StaleDismissedBannerPresentAlongsideButton:
                Boolean(getInstallBtn()) &&
                getStatusTexts().some((t) => t.includes('설치를 취소했어요.')),
            };

            // 6. Click re-exposed button -> resolve outcome: 'accepted'
            getInstallBtn().click();
            resolveSecondChoice({ outcome: 'accepted' });
            await new Promise((r) => setTimeout(r, 30));

            const afterAcceptedBeforeAppInstalled = {
              secondPromptCalls,
              hasInstallButton: Boolean(getInstallBtn()),
              statusTexts: getStatusTexts(),
            };

            // 7. Dispatch appinstalled
            window.dispatchEvent(new Event('appinstalled'));
            await new Promise((r) => setTimeout(r, 30));

            const afterAppInstalled = {
              hasInstallButton: Boolean(getInstallBtn()),
              statusTexts: getStatusTexts(),
              noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth + 1,
            };

            resolve({
              initial,
              afterFirstPromptEvent,
              duringPrompting,
              afterDismissed,
              afterReopenBeforeSecondEvent,
              afterSecondPromptReExposure,
              afterAcceptedBeforeAppInstalled,
              afterAppInstalled,
            });
          } catch (err) {
            reject(err);
          }
        })`,
      );

      const passed =
        !flowResult.initial.hasInstallButton &&
        flowResult.initial.fallbackDetailsOpen &&
        flowResult.afterFirstPromptEvent.defaultPrevented &&
        flowResult.afterFirstPromptEvent.firstPromptCallsBeforeClick === 0 &&
        flowResult.afterFirstPromptEvent.hasInstallButton &&
        !flowResult.afterFirstPromptEvent.fallbackDetailsOpen &&
        !flowResult.duringPrompting.hasInstallButton &&
        flowResult.duringPrompting.statusTexts.some((t) =>
          t.includes('브라우저의 설치 창에서 선택해 주세요.'),
        ) &&
        flowResult.afterDismissed.firstPromptCallsAfterClick === 1 &&
        !flowResult.afterDismissed.hasInstallButton &&
        flowResult.afterDismissed.fallbackDetailsOpen &&
        flowResult.afterDismissed.statusTexts.some((t) => t.includes('설치를 취소했어요.')) &&
        flowResult.afterReopenBeforeSecondEvent.dialogClosedInBetween &&
        !flowResult.afterReopenBeforeSecondEvent.hasInstallButton &&
        flowResult.afterReopenBeforeSecondEvent.fallbackDetailsOpen &&
        flowResult.afterSecondPromptReExposure.hasInstallButton &&
        flowResult.afterAcceptedBeforeAppInstalled.secondPromptCalls === 1 &&
        flowResult.afterAcceptedBeforeAppInstalled.statusTexts.some((t) =>
          t.includes('설치를 요청했어요.'),
        ) &&
        !flowResult.afterAppInstalled.hasInstallButton &&
        flowResult.afterAppInstalled.statusTexts.some((t) =>
          t.includes('브라우저에서 설치 완료를 확인했어요.'),
        ) &&
        flowResult.afterAppInstalled.noHorizontalOverflow;

      scenarios.push({
        id: 'cdp-scenario-3-android-chrome-lifecycle-mock',
        name: 'Scenario 3: Mocked Android Chrome (412x915) Prompt Branching, Dismissal, Re-exposure, Accepted, and appinstalled',
        emulatedOnly: true,
        realSafariExecuted: false,
        viewport: { width: 412, height: 915 },
        passed,
        details: flowResult,
      });
    } finally {
      await session.close();
    }
  }

  // Scenario 4: Unsupported browser fallback at 1280x800
  {
    const session = await createScenarioSession(cdp, {
      baseUrl,
      width: 1280,
      height: 800,
      mobile: false,
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:136.0) Gecko/20100101 Firefox/136.0',
      platform: 'Linux x86_64',
    });
    try {
      await openInstallDialogInDom(cdp, session.sessionId, false);
      const snapshot = await cdp.evaluate(
        session.sessionId,
        `(() => {
          const panel = document.querySelector('dialog[open] .pwa-install-panel');
          const installBtn = panel.querySelector('.pwa-install-action');
          const fallbackDetails = panel.querySelector('details:not(.pwa-install-notes)');
          const fallbackText = fallbackDetails?.textContent ?? '';
          return {
            hasInstallButton: Boolean(installBtn),
            fallbackDetailsOpen: Boolean(fallbackDetails?.open),
            fallbackSummary: fallbackDetails?.querySelector('summary')?.textContent?.trim(),
            hasAndroidChromeManualSteps: fallbackText.includes('Android Chrome에서는 ⋮ 메뉴 → 홈 화면에 추가 → 설치를 선택하세요.'),
            hasMacSafariManualSteps: fallbackText.includes('Mac Safari에서는 파일 → Dock에 추가를 선택하세요.'),
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
            noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth + 1,
          };
        })()`,
      );

      const passed =
        !snapshot.hasInstallButton &&
        snapshot.fallbackDetailsOpen &&
        snapshot.fallbackSummary === '설치 버튼이 보이지 않나요?' &&
        snapshot.hasAndroidChromeManualSteps &&
        snapshot.hasMacSafariManualSteps &&
        snapshot.noHorizontalOverflow;

      scenarios.push({
        id: 'cdp-scenario-4-unsupported-browser-fallback',
        name: 'Scenario 4: Unsupported Browser Fallback (1280x800 Desktop Firefox UA without beforeinstallprompt)',
        emulatedOnly: true,
        realSafariExecuted: false,
        viewport: { width: 1280, height: 800 },
        passed,
        details: snapshot,
      });
    } finally {
      await session.close();
    }
  }

  return scenarios;
}

async function main() {
  console.log('[Track B Audit] Running Vitest + React Testing Library mock suite...');
  const vitestResults = runVitestJson();
  console.log(
    `[Track B Audit] Vitest finished: ${vitestResults.numPassedTests}/${vitestResults.numTotalTests} passed.`,
  );

  const tempProfileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pwa-track-b-'));
  let staticServer = null;
  let chromiumProc = null;
  let cdp = null;
  let cdpScenarios = [];

  try {
    staticServer = await startStaticDistServer();
    console.log(`[Track B Audit] Serving dist/ on ${staticServer.baseUrl}`);

    chromiumProc = await launchIsolatedChromium(tempProfileDir);
    console.log('[Track B Audit] Connected to isolated Headless Chromium via CDP.');

    cdp = new CdpClient(chromiumProc.browserWsUrl);
    await cdp.connect();

    cdpScenarios = await runCdpScenarios(staticServer.baseUrl, cdp);
    for (const s of cdpScenarios) {
      console.log(`[Track B Audit] ${s.passed ? 'PASS' : 'FAIL'} - ${s.name}`);
    }
  } finally {
    if (cdp) {
      cdp.close();
    }
    if (chromiumProc?.child) {
      chromiumProc.child.kill('SIGTERM');
      await new Promise((resolve) => {
        const timer = setTimeout(() => {
          chromiumProc.child.kill('SIGKILL');
          resolve();
        }, 3000);
        chromiumProc.child.once('exit', () => {
          clearTimeout(timer);
          resolve();
        });
      });
    }
    if (staticServer) {
      await staticServer.close();
    }
    if (fs.existsSync(tempProfileDir)) {
      fs.rmSync(tempProfileDir, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100,
      });
    }
  }

  const findings = [
    {
      id: 'B-F1',
      severity: 'medium',
      title:
        'iOS 인앱 브라우저 및 서드파티 WebKit 브라우저(KAKAOTALK, NAVER(inapp), GSA, Whale)가 ios-safari로 오분류됨',
      location: 'src/lib/pwa.ts:52-53',
      status: 'reproduced-in-mock-test',
      summary:
        'navigator.userAgent에 Safari/ 토큰이 포함되고 CriOS|FxiOS|EdgiOS|OPiOS에 해당하지 않는 iOS 인앱 브라우저(카카오톡, 네이버 앱, Google 앱 GSA, 웨일 등)가 ios-safari로 분류되어 "이 주소를 Safari에서 연 다음..." 안내 대신 Safari 전용 3단계 안내가 노출됨.',
    },
    {
      id: 'B-F2',
      severity: 'low',
      title:
        '설치 취소(dismissed) 또는 오류(error) 이후 새 beforeinstallprompt 수신 시 이전 상태 문구와 재노출된 설치 버튼이 동시에 표시됨',
      location: 'src/lib/pwa.ts:68, src/components/PwaInstallPanel.tsx:19-43',
      status: 'reproduced-in-mock-and-cdp',
      summary:
        'beforeinstallprompt 핸들러가 canInstall: true만 발행하고 installStatus를 idle로 초기화하지 않아, 재노출된 "이 기기에 설치" 버튼 바로 아래에 이전 "설치를 취소했어요..." 또는 "설치 창을 열지 못했어요..." 문구가 함께 남음.',
    },
    {
      id: 'B-F3',
      severity: 'low',
      title:
        'display-mode: standalone 해제(change 이벤트) 시 installed: true가 고정되어 이후 beforeinstallprompt 수신이 차단됨',
      location: 'src/lib/pwa.ts:59-64, src/lib/pwa.ts:68',
      status: 'reproduced-in-mock-test',
      summary:
        'matchMedia("(display-mode: standalone)")의 change 리스너가 standalone: false로 전환될 때 installed를 갱신하지 않아 installed: true가 유지되며, 이후 브라우저 탭에서 발생하는 beforeinstallprompt 이벤트가 무시됨.',
    },
    {
      id: 'B-F4',
      severity: 'low',
      title:
        'installStatus !== "idle"(또는 standalone/installed) 상태와 offlineStatus === "update-ready"가 동시에 활성화될 때 복수의 role="status" 영역이 렌더링됨',
      location: 'src/components/PwaInstallPanel.tsx:12-43, src/components/PwaInstallPanel.tsx:82',
      status: 'reproduced-in-mock-test',
      summary:
        '설치 상태 배너(<p role="status">)와 하단 업데이트 준비 배너(<p role="status">)가 동시에 존재할 수 있어 보조기술(스크린 리더) 및 단일 role="status" 탐색 시 중첩 알림이 발생할 수 있음.',
    },
  ];

  const allCdpPassed = cdpScenarios.length === 4 && cdpScenarios.every((s) => s.passed);
  const overallSuccess = vitestResults.success && allCdpPassed;

  const outputPayload = {
    track: 'track-b',
    title:
      'Track B — iOS Safari 설치 안내, Android 설치 프롬프트 분기/거절 후 재노출, 미지원 브라우저 안내 모의 테스트 감사 결과',
    generatedAt: new Date().toISOString(),
    environmentDisclosure: {
      os: 'Debian GNU/Linux 12 (bookworm)',
      nodeVersion: process.version,
      chromiumBinary: '/usr/bin/chromium',
      realSafariExecuted: false,
      realIosDeviceExecuted: false,
      realAndroidDeviceExecuted: false,
      honestyStatement:
        '본 검증은 Linux 환경에서 수행된 모의 테스트(Vitest + jsdom 단위/통합 모의 테스트 및 독립 Headless Chromium CDP User-Agent/플랫폼/이벤트 에뮬레이션) 결과이며, 실제 Apple Safari(macOS/iOS Safari, WebKit) 및 실물 iOS/Android 기기는 실행되지 않았습니다(realSafariExecuted: false).',
    },
    overallSuccess,
    vitestSuite: vitestResults,
    cdpBrowserScenarios: cdpScenarios,
    findings,
  };

  fs.mkdirSync(DOCS_OUT_DIR, { recursive: true });
  fs.writeFileSync(RESULTS_JSON_PATH, `${JSON.stringify(outputPayload, null, 2)}\n`, 'utf8');
  console.log(`[Track B Audit] Wrote results to ${RESULTS_JSON_PATH}`);

  if (!overallSuccess) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('[Track B Audit] Fatal error:', err);
  process.exitCode = 1;
});
