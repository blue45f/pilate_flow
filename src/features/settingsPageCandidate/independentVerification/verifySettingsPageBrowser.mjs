#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../../../..');

const VIEWPORTS = [
  { width: 320, height: 640 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
];

const PRESET_IDS = [
  'default-local-studio',
  'signed-in-active-instructor',
  'ios-safari-no-korean-voice',
  'unsupported-host-update-ready',
  'storage-warning-stale-preview',
  'adversarial-untrusted-input',
];

const KEY_DEFINITIONS = {
  ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
  ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
  Home: { key: 'Home', code: 'Home', keyCode: 36 },
  End: { key: 'End', code: 'End', keyCode: 35 },
};

function findChromeBinary() {
  const candidates = [
    process.env.CHROME_BIN,
    process.env.CHROMIUM_PATH,
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error('Could not find a local chromium or google-chrome binary.');
}

async function launchCdpBrowser() {
  const chromeBin = findChromeBinary();
  const userDataDir = await mkdtemp(join(os.tmpdir(), 'pf-settings-cdp-'));
  const proc = spawn(
    chromeBin,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${userDataDir}`,
      '--remote-debugging-port=0',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );

  const wsEndpoint = await new Promise((resolveWs, rejectWs) => {
    let stderrText = '';
    const timeout = setTimeout(() => {
      rejectWs(new Error(`Timed out waiting for Chrome DevTools endpoint. stderr: ${stderrText}`));
    }, 10_000);

    proc.stderr.on('data', (chunk) => {
      stderrText += chunk.toString('utf8');
      const match = stderrText.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timeout);
        resolveWs(match[1]);
      }
    });

    proc.once('exit', (code) => {
      clearTimeout(timeout);
      rejectWs(new Error(`Chromium exited early with code ${code}. stderr: ${stderrText}`));
    });
  });

  const ws = new WebSocket(wsEndpoint);
  await new Promise((res, rej) => {
    ws.addEventListener('open', () => res(), { once: true });
    ws.addEventListener('error', (err) => rej(err), { once: true });
  });

  let nextId = 1;
  const pending = new Map();
  const eventListeners = new Map();

  ws.addEventListener('message', (event) => {
    const data = typeof event.data === 'string' ? event.data : event.data.toString('utf8');
    const msg = JSON.parse(data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve: res, reject: rej } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) {
        rej(new Error(msg.error.message || JSON.stringify(msg.error)));
      } else {
        res(msg.result);
      }
      return;
    }
    if (msg.method) {
      const listeners = eventListeners.get(msg.method) || [];
      for (const listener of listeners) {
        listener(msg.params, msg.sessionId);
      }
    }
  });

  const send = (method, params = {}, sessionId = undefined) =>
    new Promise((res, rej) => {
      const id = nextId++;
      pending.set(id, { resolve: res, reject: rej });
      const payload = sessionId ? { id, sessionId, method, params } : { id, method, params };
      ws.send(JSON.stringify(payload));
    });

  const onEvent = (method, handler) => {
    const list = eventListeners.get(method) || [];
    list.push(handler);
    eventListeners.set(method, list);
  };

  return {
    chromeBin,
    driverKind: 'cdp-native-chromium',
    async newPage({ width, height, reducedMotion = true }) {
      const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
      const { sessionId } = await send('Target.attachToTarget', {
        targetId,
        flatten: true,
      });

      const pageErrors = [];
      onEvent('Runtime.exceptionThrown', (params, sid) => {
        if (sid === sessionId) {
          const details = params?.exceptionDetails;
          pageErrors.push(
            details?.exception?.description || details?.text || 'Uncaught page exception',
          );
        }
      });

      await send('Page.enable', {}, sessionId);
      await send('Runtime.enable', {}, sessionId);
      await send('DOM.enable', {}, sessionId);
      await send(
        'Emulation.setDeviceMetricsOverride',
        { width, height, deviceScaleFactor: 1, mobile: width < 768 },
        sessionId,
      );
      await send(
        'Emulation.setEmulatedMedia',
        {
          features: [
            {
              name: 'prefers-reduced-motion',
              value: reducedMotion ? 'reduce' : 'no-preference',
            },
          ],
        },
        sessionId,
      );

      const evaluate = async (fnOrExpr, ...args) => {
        const expression =
          typeof fnOrExpr === 'function'
            ? `(${fnOrExpr.toString()})(...${JSON.stringify(args)})`
            : String(fnOrExpr);
        const res = await send(
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
            res.exceptionDetails.exception?.description ||
              res.exceptionDetails.text ||
              'Evaluation failed',
          );
        }
        return res.result?.value;
      };

      const waitForFunction = async (fn, arg, timeoutMs = 10_000) => {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
          const ok = await evaluate(fn, arg);
          if (ok) return ok;
          await new Promise((r) => setTimeout(r, 35));
        }
        throw new Error(`Timed out waiting for condition: ${fn.toString()}`);
      };

      return {
        pageErrors,
        evaluate,
        waitForFunction,
        async goto(url) {
          await send('Page.navigate', { url }, sessionId);
          await waitForFunction(() => document.readyState === 'complete');
        },
        async pressKey(keyName) {
          const def = KEY_DEFINITIONS[keyName] || {
            key: keyName,
            code: keyName,
            keyCode: 0,
          };
          await send(
            'Input.dispatchKeyEvent',
            {
              type: 'rawKeyDown',
              key: def.key,
              code: def.code,
              windowsVirtualKeyCode: def.keyCode,
              nativeVirtualKeyCode: def.keyCode,
            },
            sessionId,
          );
          await send(
            'Input.dispatchKeyEvent',
            {
              type: 'keyUp',
              key: def.key,
              code: def.code,
              windowsVirtualKeyCode: def.keyCode,
              nativeVirtualKeyCode: def.keyCode,
            },
            sessionId,
          );
        },
        async screenshot(filePath) {
          const { data } = await send(
            'Page.captureScreenshot',
            { format: 'png', captureBeyondViewport: false },
            sessionId,
          );
          await writeFile(filePath, Buffer.from(data, 'base64'));
        },
        async close() {
          try {
            await send('Target.closeTarget', { targetId });
          } catch {
            // ignore target close error
          }
        },
      };
    },
    async close() {
      try {
        ws.close();
      } catch {
        // ignore ws close
      }
      proc.kill('SIGTERM');
      await rm(userDataDir, { recursive: true, force: true }).catch(() => {});
    },
  };
}

const evidenceDir = resolve(projectRoot, 'docs/parallel-page-settings-20261107/evidence');
const screenshotDir = resolve(evidenceDir, 'screenshots');
await mkdir(screenshotDir, { recursive: true });

const viteServer = await createServer({
  root: projectRoot,
  logLevel: 'silent',
  server: {
    host: '127.0.0.1',
    port: 0,
    strictPort: false,
  },
});

await viteServer.listen();
const address = viteServer.httpServer?.address();
const port = typeof address === 'object' && address ? address.port : 0;
assert.ok(port > 0, 'Expected ephemeral local Vite port');
const baseUrl = `http://127.0.0.1:${port}`;
const fixtureUrl = `${baseUrl}/src/features/settingsPageCandidate/browserFixture.html`;

const browser = await launchCdpBrowser();
const viewportResults = [];

try {
  for (const { width, height } of VIEWPORTS) {
    const page = await browser.newPage({ width, height, reducedMotion: true });
    try {
      await page.goto(fixtureUrl);
      await page.waitForFunction(
        () =>
          Boolean(document.querySelector('[data-testid="settings-fixture-harness"]')) &&
          Boolean(window.__pilatesSettingsFixture__),
      );

      await page.evaluate(() => {
        window.localStorage.clear();
        window.sessionStorage.clear();
      });

      const presetChecks = [];

      for (const presetId of PRESET_IDS) {
        await page.evaluate((id) => {
          window.__pilatesSettingsFixture__.selectPreset(id);
        }, presetId);

        await page.waitForFunction(
          (id) =>
            document
              .querySelector(`[data-testid="fixture-preset-btn-${id}"]`)
              ?.getAttribute('aria-pressed') === 'true',
          presetId,
        );

        // Open details panels inside `.pf-settings-page` so all interactive elements (like NHS link and manual install summary) are visible and measured
        await page.evaluate(() => {
          document
            .querySelectorAll('.pf-settings-page details')
            .forEach((d) => d.setAttribute('open', ''));
        });

        const audit = await page.evaluate(() => {
          const docScrollWidth = document.documentElement.scrollWidth;
          const winInnerWidth = window.innerWidth;
          const rootEl = document.querySelector('.pf-settings-page');
          const rootScrollWidth = rootEl ? rootEl.scrollWidth : 0;
          const rootClientWidth = rootEl ? rootEl.clientWidth : 0;

          const interactiveSelector =
            '.pf-settings-page button, .pf-settings-page summary, .pf-settings-page label.pf-settings-check-label, .pf-settings-page a.pf-settings-page__link-btn';
          const targets = [...document.querySelectorAll(interactiveSelector)].filter(
            (el) => el.getBoundingClientRect().height > 0 && el.getBoundingClientRect().width > 0,
          );

          const undersizedTargets = targets
            .map((el) => {
              const r = el.getBoundingClientRect();
              return {
                id: el.getAttribute('data-testid') || el.textContent?.trim().slice(0, 30),
                w: Number(r.width.toFixed(2)),
                h: Number(r.height.toFixed(2)),
              };
            })
            .filter((item) => item.w < 43.9 || item.h < 43.9);

          // Check sibling interactive elements inside each action group / nav / check-grid for zero bounding-box overlap
          const groups = [
            ...document.querySelectorAll(
              '.pf-settings-page__nav, .pf-settings-actions, .pf-settings-check-grid',
            ),
          ];
          const overlaps = [];
          for (const grp of groups) {
            const children = [
              ...grp.querySelectorAll(
                ':scope > button, :scope > label.pf-settings-check-label, :scope > a.pf-settings-page__link-btn',
              ),
            ].filter((c) => c.getBoundingClientRect().height > 0);
            for (let i = 0; i < children.length; i += 1) {
              for (let j = i + 1; j < children.length; j += 1) {
                const a = children[i].getBoundingClientRect();
                const b = children[j].getBoundingClientRect();
                const horizOverlap = Math.min(a.right, b.right) - Math.max(a.left, b.left);
                const vertOverlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
                if (horizOverlap > 0.5 && vertOverlap > 0.5) {
                  overlaps.push({
                    a: children[i].getAttribute('data-testid') || children[i].textContent?.trim(),
                    b: children[j].getAttribute('data-testid') || children[j].textContent?.trim(),
                  });
                }
              }
            }
          }

          const rawText = rootEl?.textContent || '';
          const leakedSecret =
            /AIza[0-9A-Za-z_-]{20,}/.test(rawText) ||
            /Bearer\s+[A-Za-z0-9._~+/-]{10,}/i.test(rawText) ||
            /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/.test(rawText) ||
            /gh[pousr]_[A-Za-z0-9_]{20,}/.test(rawText);

          return {
            docScrollWidth,
            winInnerWidth,
            rootScrollWidth,
            rootClientWidth,
            interactiveTargetCount: targets.length,
            undersizedTargets,
            overlaps,
            leakedSecret,
          };
        });

        assert.ok(
          audit.docScrollWidth <= audit.winInnerWidth + 1,
          `${width}x${height} [${presetId}]: document horizontal overflow (${audit.docScrollWidth} > ${audit.winInnerWidth})`,
        );
        assert.ok(
          audit.rootScrollWidth <= audit.rootClientWidth + 1,
          `${width}x${height} [${presetId}]: .pf-settings-page horizontal overflow (${audit.rootScrollWidth} > ${audit.rootClientWidth})`,
        );
        assert.equal(
          audit.undersizedTargets.length,
          0,
          `${width}x${height} [${presetId}]: touch targets below 44x44: ${JSON.stringify(audit.undersizedTargets)}`,
        );
        assert.equal(
          audit.overlaps.length,
          0,
          `${width}x${height} [${presetId}]: interactive sibling overlap: ${JSON.stringify(audit.overlaps)}`,
        );
        assert.equal(
          audit.leakedSecret,
          false,
          `${width}x${height} [${presetId}]: leaked secret in DOM`,
        );

        presetChecks.push({
          presetId,
          docScrollWidth: audit.docScrollWidth,
          winInnerWidth: audit.winInnerWidth,
          rootScrollWidth: audit.rootScrollWidth,
          rootClientWidth: audit.rootClientWidth,
          interactiveTargetCount: audit.interactiveTargetCount,
          undersizedTargetCount: audit.undersizedTargets.length,
          overlapCount: audit.overlaps.length,
          leakedSecret: audit.leakedSecret,
        });
      }

      // Return to default preset for screenshot and keyboard/zoom/multi-instance tests
      await page.evaluate(() => {
        window.__pilatesSettingsFixture__.selectPreset('default-local-studio');
        document
          .querySelector('[data-testid="pilates-settings-page"]')
          ?.scrollIntoView({ block: 'start', behavior: 'instant' });
      });
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-testid="fixture-preset-btn-default-local-studio"]')
            ?.getAttribute('aria-pressed') === 'true',
      );

      await page.screenshot(resolve(screenshotDir, `settings-${width}-100.png`));

      // Verify reduced-motion emulation (matchMedia + computed transitionDuration === 0s)
      const reducedMotionInfo = await page.evaluate(() => {
        const root = document.querySelector('[data-testid="pilates-settings-page"]');
        const chip = document.querySelector('[data-testid="settings-nav-chip-account"]');
        const style = chip ? window.getComputedStyle(chip) : null;
        const mqlMatches = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        return {
          mqlMatches,
          dataReducedMotion: root?.getAttribute('data-reduced-motion'),
          transitionDuration: style?.transitionDuration ?? '0s',
        };
      });
      assert.equal(
        reducedMotionInfo.mqlMatches,
        true,
        `${width}x${height}: expected matchMedia('(prefers-reduced-motion: reduce)').matches === true`,
      );
      assert.ok(
        reducedMotionInfo.transitionDuration === '0s' ||
          reducedMotionInfo.transitionDuration === '0ms',
        `${width}x${height}: expected 0s transition duration under prefers-reduced-motion: reduce, got ${reducedMotionInfo.transitionDuration}`,
      );

      // Verify real CDP keyboard navigation on group nav chips (ArrowRight -> End -> Home)
      await page.evaluate(() => {
        document.querySelector('[data-testid="settings-nav-chip-account"]')?.focus();
      });
      await page.pressKey('ArrowRight');
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-testid="settings-nav-chip-voice"]')
            ?.getAttribute('aria-pressed') === 'true' &&
          document.activeElement?.getAttribute('data-testid') === 'settings-nav-chip-voice',
      );

      await page.pressKey('End');
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-testid="settings-nav-chip-data"]')
            ?.getAttribute('aria-pressed') === 'true' &&
          document.activeElement?.getAttribute('data-testid') === 'settings-nav-chip-data',
      );

      await page.pressKey('Home');
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-testid="settings-nav-chip-account"]')
            ?.getAttribute('aria-pressed') === 'true' &&
          document.activeElement?.getAttribute('data-testid') === 'settings-nav-chip-account',
      );

      // Verify 200% zoom (both root font-size: 200% and CSS zoom)
      const zoom200Check = await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%';
        const rootEl = document.querySelector('.pf-settings-page');
        const font200DocScrollWidth = document.documentElement.scrollWidth;
        const font200WinInnerWidth = window.innerWidth;
        const font200RootScrollWidth = rootEl ? rootEl.scrollWidth : 0;
        const font200RootClientWidth = rootEl ? rootEl.clientWidth : 0;
        return {
          font200DocScrollWidth,
          font200WinInnerWidth,
          font200RootScrollWidth,
          font200RootClientWidth,
        };
      });

      assert.ok(
        zoom200Check.font200DocScrollWidth <= zoom200Check.font200WinInnerWidth + 1,
        `${width}x${height} @ 200% font-size: document horizontal overflow (${zoom200Check.font200DocScrollWidth} > ${zoom200Check.font200WinInnerWidth})`,
      );
      assert.ok(
        zoom200Check.font200RootScrollWidth <= zoom200Check.font200RootClientWidth + 1,
        `${width}x${height} @ 200% font-size: .pf-settings-page horizontal overflow (${zoom200Check.font200RootScrollWidth} > ${zoom200Check.font200RootClientWidth})`,
      );

      if (width === 320) {
        await page.evaluate(() => {
          document
            .querySelector('[data-testid="pilates-settings-page"]')
            ?.scrollIntoView({ block: 'start', behavior: 'instant' });
        });
        await page.screenshot(resolve(screenshotDir, 'settings-320-200zoom.png'));
      }

      // Also verify CSS zoom on `.pf-settings-page` (width: 50%; zoom: 2)
      const cssZoomCheck = await page.evaluate(() => {
        document.documentElement.style.fontSize = '';
        const rootEl = document.querySelector('.pf-settings-page');
        if (rootEl) {
          rootEl.style.zoom = '2';
        }
        const docScrollWidth = document.documentElement.scrollWidth;
        const winInnerWidth = window.innerWidth;
        const rootScrollWidth = rootEl ? rootEl.scrollWidth : 0;
        const rootClientWidth = rootEl ? rootEl.clientWidth : 0;
        if (rootEl) {
          rootEl.style.zoom = '';
        }
        return {
          docScrollWidth,
          winInnerWidth,
          rootScrollWidth,
          rootClientWidth,
        };
      });

      assert.ok(
        cssZoomCheck.docScrollWidth <= cssZoomCheck.winInnerWidth + 1,
        `${width}x${height} @ CSS zoom=2: document horizontal overflow (${cssZoomCheck.docScrollWidth} > ${cssZoomCheck.winInnerWidth})`,
      );
      assert.ok(
        cssZoomCheck.rootScrollWidth <= cssZoomCheck.rootClientWidth + 1,
        `${width}x${height} @ CSS zoom=2: .pf-settings-page horizontal overflow (${cssZoomCheck.rootScrollWidth} > ${cssZoomCheck.rootClientWidth})`,
      );

      // Verify two-instance [id] uniqueness via window.__pilatesSettingsFixture__.showTwo(true)
      await page.evaluate(() => {
        window.__pilatesSettingsFixture__.showTwo(true);
      });
      await page.waitForFunction(
        () => document.querySelectorAll('[data-testid="pilates-settings-page"]').length === 2,
      );

      const multiInstanceIdCheck = await page.evaluate(() => {
        const ids = [...document.querySelectorAll('[id]')].map((el) => el.id);
        return {
          totalIds: ids.length,
          uniqueIds: new Set(ids).size,
        };
      });

      assert.ok(multiInstanceIdCheck.totalIds >= 18, 'Expected DOM [id] attributes across two instances');
      assert.equal(
        multiInstanceIdCheck.uniqueIds,
        multiInstanceIdCheck.totalIds,
        `${width}x${height}: duplicate DOM [id] attributes found across two instances`,
      );

      await page.evaluate(() => {
        window.__pilatesSettingsFixture__.showTwo(false);
      });

      const storageLengths = await page.evaluate(() => ({
        localStorageLength: window.localStorage.length,
        sessionStorageLength: window.sessionStorage.length,
      }));
      assert.equal(storageLengths.localStorageLength, 0, `${width}x${height}: localStorage not empty`);
      assert.equal(
        storageLengths.sessionStorageLength,
        0,
        `${width}x${height}: sessionStorage not empty`,
      );
      assert.deepEqual(page.pageErrors, [], `${width}x${height}: unexpected runtime exceptions`);

      viewportResults.push({
        viewport: `${width}x${height}`,
        width,
        height,
        presetsVerified: presetChecks.length,
        presetChecks,
        horizontalOverflow100Pct: false,
        horizontalOverflow200PctFont: false,
        horizontalOverflow200PctCssZoom: false,
        minTouchTarget44x44Verified: true,
        touchSiblingOverlapCount: 0,
        keyboardNavVerified: true,
        reducedMotionVerified: true,
        twoInstanceUniqueIds: multiInstanceIdCheck,
        localStorageLength: storageLengths.localStorageLength,
        sessionStorageLength: storageLengths.sessionStorageLength,
        pageErrors: page.pageErrors,
      });
    } finally {
      await page.close();
    }
  }

  const reportPayload = {
    featureId: 'parallel-page-settings-20261107',
    track: 'Track B — Independent Boundary, Security & Headless Chromium Browser Verification',
    verifiedAt: new Date().toISOString(),
    passed: true,
    driver: browser.driverKind,
    chromeBinary: browser.chromeBin,
    honestyBoundaries: {
      realChromiumCdpExecuted: true,
      realSafariExecuted: false,
      productionFirebaseMutated: false,
      sharedAppOrStoreModified: false,
    },
    screenshots: [
      'docs/parallel-page-settings-20261107/evidence/screenshots/settings-320-100.png',
      'docs/parallel-page-settings-20261107/evidence/screenshots/settings-320-200zoom.png',
      'docs/parallel-page-settings-20261107/evidence/screenshots/settings-390-100.png',
      'docs/parallel-page-settings-20261107/evidence/screenshots/settings-768-100.png',
      'docs/parallel-page-settings-20261107/evidence/screenshots/settings-1440-100.png',
    ],
    viewportResults,
  };

  await writeFile(
    resolve(evidenceDir, 'browser-verification-results.json'),
    JSON.stringify(reportPayload, null, 2),
  );
  console.log(JSON.stringify(reportPayload, null, 2));
} finally {
  await browser.close();
  await viteServer.close();
}
