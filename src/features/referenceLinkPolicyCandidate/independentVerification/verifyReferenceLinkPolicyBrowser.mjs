#!/usr/bin/env node
/**
 * Independent Browser Verification Harness for `src/features/referenceLinkPolicyCandidate`
 *
 * Launches a local Vite dev server on 127.0.0.1 and drives headless Chromium via CDP
 * (or Playwright if pre-installed) against:
 *   http://127.0.0.1:<port>/src/features/referenceLinkPolicyCandidate/browserFixture.html
 *
 * Verifies:
 * 1. Responsive layout & >=44px interactive touch targets at 320px, 390px, 768px, and 1440px
 *    with zero horizontal document overflow.
 * 2. Zero external network requests (only 127.0.0.1 / data: / about:blank allowed).
 * 3. Zero iframes before user click, manual click-to-load mounting the local synthetic iframe
 *    fixture (`autoplay=0`, `rel=0`), simulated embed-blocked / error fallback to external-link-only,
 *    PII query value redaction in rendered DOM, and multi-instance DOM `[id]` uniqueness.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../..');

const VIEWPORT_WIDTHS = [320, 390, 768, 1440];

function resolveChromiumBinary() {
  const candidates = [
    process.env.CHROMIUM_PATH,
    '/usr/lib/chromium/chromium',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
  ].filter(Boolean);

  for (const bin of candidates) {
    if (fs.existsSync(bin)) {
      return bin;
    }
  }
  throw new Error('No local Chromium/Chrome binary found.');
}

async function launchHeadlessChromiumCdp() {
  const binary = resolveChromiumBinary();
  const proc = spawn(
    binary,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-background-networking',
      '--disable-sync',
      '--disable-default-apps',
      '--disable-extensions',
      '--no-first-run',
      '--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1 , EXCLUDE localhost',
      '--remote-debugging-port=0',
      'about:blank',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );

  const wsBrowserUrl = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error('Timed out waiting for Chromium DevTools listening URL'));
    }, 10000);

    let stderrBuf = '';
    proc.stderr.on('data', (chunk) => {
      stderrBuf += chunk.toString();
      const match = stderrBuf.match(/DevTools listening on (ws:\/\/127\.0\.0\.1:\d+\/[^\s]+)/);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });

    proc.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Chromium exited prematurely with code ${code}: ${stderrBuf}`));
    });
  });

  const portMatch = wsBrowserUrl.match(/127\.0\.0\.1:(\d+)/);
  const cdpPort = Number(portMatch[1]);
  const targetsRes = await fetch(`http://127.0.0.1:${cdpPort}/json/list`);
  const targets = await targetsRes.json();
  const pageTarget = targets.find((t) => t.type === 'page') ?? targets[0];
  if (!pageTarget?.webSocketDebuggerUrl) {
    proc.kill('SIGKILL');
    throw new Error('No inspectable page target found in Chromium CDP.');
  }

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
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
          entry.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        } else {
          entry.resolve(msg.result);
        }
      }
    } else if (msg.method) {
      const handlers = eventListeners.get(msg.method);
      if (handlers) {
        for (const fn of handlers) {
          fn(msg.params);
        }
      }
    }
  });

  function send(method, params = {}) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  function on(method, handler) {
    if (!eventListeners.has(method)) {
      eventListeners.set(method, []);
    }
    eventListeners.get(method).push(handler);
  }

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (res.exceptionDetails) {
      throw new Error(
        `Runtime.evaluate exception: ${
          res.exceptionDetails.exception?.description || res.exceptionDetails.text
        }`,
      );
    }
    return res.result?.value;
  }

  async function waitForFunction(predicateSource, timeoutMs = 8000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const ok = await evaluate(`Boolean((${predicateSource})())`);
      if (ok) return;
      await new Promise((r) => setTimeout(r, 60));
    }
    throw new Error(`waitForFunction timed out: ${predicateSource}`);
  }

  async function close() {
    try {
      ws.close();
    } catch {
      // ignore
    }
    proc.kill('SIGKILL');
  }

  return { send, on, evaluate, waitForFunction, close };
}

async function main() {
  let viteServer = null;
  let cdp = null;

  try {
    viteServer = await createServer({
      root: projectRoot,
      logLevel: 'silent',
      server: {
        host: '127.0.0.1',
        port: 0,
        strictPort: false,
      },
    });
    await viteServer.listen();
    const addr = viteServer.httpServer?.address();
    const vitePort = typeof addr === 'object' && addr ? addr.port : 0;
    const fixtureUrl = `http://127.0.0.1:${vitePort}/src/features/referenceLinkPolicyCandidate/browserFixture.html`;

    cdp = await launchHeadlessChromiumCdp();
    const networkRequests = [];
    const externalNetworkRequests = [];

    cdp.on('Network.requestWillBeSent', (params) => {
      const reqUrl = params?.request?.url ?? '';
      networkRequests.push(reqUrl);
      if (reqUrl && !reqUrl.startsWith('data:') && !reqUrl.startsWith('about:')) {
        try {
          const parsed = new URL(reqUrl);
          if (parsed.hostname !== '127.0.0.1' && parsed.hostname !== 'localhost') {
            externalNetworkRequests.push(reqUrl);
          }
        } catch {
          externalNetworkRequests.push(reqUrl);
        }
      }
    });

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');

    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await cdp.send('Page.navigate', { url: fixtureUrl });
    await cdp.waitForFunction(
      '() => window.__referenceLinkPolicyFixture__ && document.querySelector("[data-testid=\\"reference-link-policy-harness\\"]")',
    );

    // 1. Verify catalog sample in-memory audit via fixture API
    const catalogAudit = await cdp.evaluate(
      'window.__referenceLinkPolicyFixture__.auditCatalogSamples()',
    );
    if (
      !catalogAudit.allSamplesPassSchemeCheck ||
      !catalogAudit.allWebsitesAndPortalsSeparatedAsExternalOnly ||
      !catalogAudit.allYoutubeEmbedsEnforceNoAutoplayAndNocookie ||
      !catalogAudit.observationPointsNeverTransplantedAsSeekParams ||
      catalogAudit.networkRequestsMade !== 0 ||
      catalogAudit.videosDownloaded !== 0
    ) {
      throw new Error(`Catalog sample audit failed: ${JSON.stringify(catalogAudit)}`);
    }

    // 2. Verify all 4 viewports (320px, 390px, 768px, 1440px)
    const viewportReports = {};
    for (const width of VIEWPORT_WIDTHS) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width,
        height: 900,
        deviceScaleFactor: 1,
        mobile: width < 768,
      });
      await cdp.evaluate(
        'new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))',
      );
      const metrics = await cdp.evaluate(`(() => {
        const docScrollWidth = document.documentElement.scrollWidth;
        const innerWidth = window.innerWidth;
        const root = document.querySelector('[data-testid="reference-link-policy-preview"]');
        const rootRect = root.getBoundingClientRect();
        const buttons = Array.from(document.querySelectorAll('.rlpc-btn, .rlpc-candidate-item'));
        const undersized = buttons
          .map((el) => {
            const r = el.getBoundingClientRect();
            return {
              testId: el.getAttribute('data-testid') || el.textContent.trim().slice(0, 24),
              width: Math.round(r.width * 10) / 10,
              height: Math.round(r.height * 10) / 10,
            };
          })
          .filter((b) => b.width < 44 || b.height < 44);
        return {
          viewportWidth: innerWidth,
          docScrollWidth,
          zeroHorizontalOverflow: docScrollWidth <= innerWidth && rootRect.width <= innerWidth,
          interactiveControlCount: buttons.length,
          allMeet44pxTarget: undersized.length === 0,
          undersized,
        };
      })()`);

      if (!metrics.zeroHorizontalOverflow || !metrics.allMeet44pxTarget) {
        throw new Error(`Viewport ${width}px check failed: ${JSON.stringify(metrics)}`);
      }
      viewportReports[width] = metrics;
    }

    // 3. Verify manual click-to-load synthetic iframe & embed-blocked fallback
    const lifecycleVerification = await cdp.evaluate(`(async () => {
      const initialIframeCount = document.querySelectorAll('iframe').length;
      const loadBtn = document.querySelector('[data-testid="rlpc-manual-load-embed-btn"]');
      if (!loadBtn) throw new Error('Manual load button missing in idle state');
      loadBtn.click();
      await new Promise((r) => setTimeout(r, 80));

      const iframe = document.querySelector('[data-testid="rlpc-synthetic-iframe"]');
      if (!iframe) throw new Error('Synthetic iframe did not mount after user click');
      const iframeSrc = iframe.getAttribute('src');
      const canonicalEmbedUrl = iframe.getAttribute('data-canonical-embed-url');
      const allowAttr = iframe.getAttribute('allow');

      // Wait for local syntheticEmbedFrame.html to load inside iframe
      await new Promise((r) => setTimeout(r, 150));
      const frameDoc = iframe.contentDocument;
      const frameRootText = frameDoc?.getElementById('synthetic-embed-frame-root')?.textContent?.trim() || '';

      // Click simulate embed blocked -> must unmount iframe and show external-only fallback
      const blockBtn = document.querySelector('[data-testid="rlpc-simulate-embed-blocked-btn"]');
      blockBtn.click();
      await new Promise((r) => setTimeout(r, 60));

      const afterBlockIframeCount = document.querySelectorAll('iframe').length;
      const fallbackBoxPresent = Boolean(
        document.querySelector('[data-testid="rlpc-external-only-fallback-box"]'),
      );
      const externalHref = document
        .querySelector('[data-testid="rlpc-external-original-link"]')
        ?.getAttribute('href');

      return {
        initialIframeCount,
        iframeSrc,
        canonicalEmbedUrl,
        allowAttr,
        frameRootLoaded: frameRootText.includes('autoplay=0'),
        afterBlockIframeCount,
        fallbackBoxPresent,
        externalHref,
      };
    })()`);

    if (
      lifecycleVerification.initialIframeCount !== 0 ||
      !lifecycleVerification.iframeSrc?.includes(
        '/src/features/referenceLinkPolicyCandidate/syntheticEmbedFrame.html',
      ) ||
      !lifecycleVerification.iframeSrc?.includes('autoplay=0') ||
      !lifecycleVerification.frameRootLoaded ||
      lifecycleVerification.afterBlockIframeCount !== 0 ||
      !lifecycleVerification.fallbackBoxPresent
    ) {
      throw new Error(
        `Lifecycle verification failed: ${JSON.stringify(lifecycleVerification)}`,
      );
    }

    // 4. Verify privacy preset DOM redaction and multi-instance unique IDs
    const privacyAndDualInstance = await cdp.evaluate(`(async () => {
      const privacyBtn = document.querySelector(
        '[data-testid="fixture-preset-privacy-and-autoplay-strip"]',
      );
      privacyBtn.click();
      await new Promise((r) => setTimeout(r, 60));
      const bodyHtml = document.body.innerHTML;
      const piiLeaked =
        bodyHtml.includes('teacher@pilates.example.com') ||
        bodyHtml.includes('010-9876-5432') ||
        bodyHtml.includes('eyJhbGciOiJIUzI1NiJ9') ||
        bodyHtml.includes('abc123track') ||
        bodyHtml.includes('member@example.org');

      window.__referenceLinkPolicyFixture__.showTwoInstances([
        {
          candidateId: 'dual-1',
          title: '다중 인스턴스 테스트',
          url: 'https://www.youtube.com/watch?v=Y_9c3NFbm1A',
        },
      ]);
      await new Promise((r) => setTimeout(r, 60));
      const ids = Array.from(document.querySelectorAll('[id]')).map((el) => el.id);
      const uniqueIdCount = new Set(ids).size;
      const previewCount = document.querySelectorAll(
        '[data-testid="reference-link-policy-preview"]',
      ).length;

      window.__referenceLinkPolicyFixture__.showHarness();
      await new Promise((r) => setTimeout(r, 60));

      return {
        piiLeaked,
        totalIds: ids.length,
        uniqueIdCount,
        allIdsUnique: ids.length === uniqueIdCount,
        previewCount,
      };
    })()`);

    if (
      privacyAndDualInstance.piiLeaked ||
      !privacyAndDualInstance.allIdsUnique ||
      privacyAndDualInstance.previewCount !== 2
    ) {
      throw new Error(
        `Privacy / dual-instance check failed: ${JSON.stringify(privacyAndDualInstance)}`,
      );
    }

    if (externalNetworkRequests.length > 0) {
      throw new Error(
        `Forbidden external network requests detected: ${JSON.stringify(externalNetworkRequests)}`,
      );
    }

    const summary = {
      status: 'PASS',
      fixtureUrl,
      totalLocalNetworkRequests: networkRequests.length,
      externalNetworkRequestCount: externalNetworkRequests.length,
      viewportsVerified: VIEWPORT_WIDTHS,
      viewportReports,
      catalogAudit,
      lifecycleVerification,
      privacyAndDualInstance,
    };

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    if (cdp) await cdp.close();
    if (viteServer) await viteServer.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
