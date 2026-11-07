#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import artifactDirectories from '../../../scripts/qa/artifact-directory.cjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../../..');
const require = createRequire(import.meta.url);

const KEY_DEFINITIONS = {
  ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
  ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
  Home: { key: 'Home', code: 'Home', keyCode: 36 },
  End: { key: 'End', code: 'End', keyCode: 35 },
  Escape: { key: 'Escape', code: 'Escape', keyCode: 27 },
  Enter: { key: 'Enter', code: 'Enter', keyCode: 13 },
};

function findChromeBinary() {
  const candidates = [
    process.env.CHROME_BIN,
    process.env.CHROMIUM_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error('Could not find a local google-chrome or chromium binary.');
}

/**
 * Zero-dependency Chrome DevTools Protocol (CDP) driver using Node 24's built-in WebSocket.
 */
async function launchCdpBrowser() {
  const chromeBin = findChromeBinary();
  const userDataDir = await mkdtemp(join(os.tmpdir(), 'fctc-chrome-'));
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
      rejectWs(new Error(`Chrome exited early with code ${code}. stderr: ${stderrText}`));
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
    driverKind: 'cdp-native',
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
        { width, height, deviceScaleFactor: 1, mobile: false },
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
          await new Promise((r) => setTimeout(r, 40));
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
        async setViewportSize({ width: w, height: h }) {
          await send(
            'Emulation.setDeviceMetricsOverride',
            { width: w, height: h, deviceScaleFactor: 1, mobile: false },
            sessionId,
          );
        },
        async setPageScaleFactor(scale) {
          await send('Emulation.setPageScaleFactor', { pageScaleFactor: scale }, sessionId);
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

/**
 * Optional Playwright driver when PLAYWRIGHT_MODULE is explicitly provided or installed.
 */
async function launchPlaywrightOrCdpBrowser() {
  const requestedModule = process.env.PLAYWRIGHT_MODULE;
  if (requestedModule) {
    try {
      const { chromium } = require(requestedModule);
      const browser = await chromium.launch({
        channel: process.env.BROWSER_CHANNEL || 'chrome',
        headless: true,
      });
      return {
        driverKind: 'playwright',
        async newPage({ width, height, reducedMotion = true }) {
          const context = await browser.newContext({
            viewport: { width, height },
            reducedMotion: reducedMotion ? 'reduce' : 'no-preference',
          });
          const page = await context.newPage();
          const pageErrors = [];
          page.on('pageerror', (err) => pageErrors.push(err.message));
          return {
            pageErrors,
            evaluate: (fn, ...args) => page.evaluate(fn, ...args),
            waitForFunction: (fn, arg) => page.waitForFunction(fn, arg),
            goto: (url) => page.goto(url),
            setViewportSize: (size) => page.setViewportSize(size),
            async setPageScaleFactor(scale) {
              await page.evaluate((s) => {
                document.body.style.zoom = String(s);
              }, scale);
            },
            pressKey: (key) => page.keyboard.press(key),
            screenshot: (filePath) => page.screenshot({ path: filePath }),
            close: () => context.close(),
          };
        },
        close: () => browser.close(),
      };
    } catch {
      // Fall back to built-in CDP client
    }
  }
  return launchCdpBrowser();
}

const out = artifactDirectories.artifactDirectory(process.env.FIRST_CLASS_TUTORIAL_OUT);
await mkdir(out, { recursive: true });

let viteServer = null;
let baseUrl = process.env.FIRST_CLASS_TUTORIAL_BASE_URL;

if (!baseUrl) {
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
  const address = viteServer.httpServer?.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  assert.ok(port > 0, 'Expected ephemeral local Vite port');
  baseUrl = `http://127.0.0.1:${port}`;
}

const parsedBase = new URL(baseUrl);
assert.ok(
  ['127.0.0.1', 'localhost', '[::1]'].includes(parsedBase.hostname),
  'Use a local fixture server on 127.0.0.1/localhost, never production',
);

const fixtureUrl = new URL(
  '/src/features/firstClassTutorialCandidate/browserFixture.html',
  parsedBase,
).href;

const browser = await launchPlaywrightOrCdpBrowser();
const results = [];

try {
  for (const width of [320, 390, 768, 1440]) {
    const page = await browser.newPage({ width, height: 900, reducedMotion: true });
    try {
      await page.goto(fixtureUrl);
      await page.waitForFunction(
        () =>
          Boolean(
            document.querySelector('[data-testid="first-class-tutorial-fixture-harness"]'),
          ) && Boolean(window.__firstClassTutorialFixture__),
      );

      const revision = await page.evaluate(
        () => window.__firstClassTutorialFixture__?.revision,
      );
      assert.equal(revision, 'first-class-tutorial-candidate-v1');

      await page.evaluate(() =>
        localStorage.setItem(
          'first-class-tutorial-test-marker',
          JSON.stringify({ untouched: true }),
        ),
      );
      const beforeStorage = await page.evaluate(() =>
        JSON.stringify(Object.fromEntries(Object.entries(localStorage))),
      );

      // 1. Verify all 6 synthetic presets render with zero horizontal overflow & >= 44px touch targets
      const presets = await page.evaluate(() =>
        [...document.querySelectorAll('[data-testid^="fixture-preset-"]')]
          .filter((node) => node.tagName === 'BUTTON')
          .map((node) => node.getAttribute('data-testid')),
      );
      assert.equal(presets.length, 6, 'Expected 6 synthetic fixture presets');

      for (const presetTestId of presets) {
        await page.evaluate((id) => {
          const btn = document.querySelector(`[data-testid="${id}"]`);
          btn?.click();
        }, presetTestId);

        await page.waitForFunction(
          (id) =>
            document.querySelector(`[data-testid="${id}"]`)?.getAttribute('aria-pressed') ===
            'true',
          presetTestId,
        );

        const layoutCheck = await page.evaluate(() => {
          const docWidth = document.documentElement.scrollWidth;
          const winWidth = window.innerWidth;
          const containers = [
            ...document.querySelectorAll(
              '[data-testid="first-class-tutorial-candidate"], .fctc-tabpanel, .fctc-collapsed-bar, .fctc-illustration-figure, .fctc-context-strip',
            ),
          ];
          const offenders = containers.filter(
            (el) => el.scrollWidth > el.clientWidth + 1,
          ).length;

          const buttons = [...document.querySelectorAll('button')].filter(
            (btn) => btn.getBoundingClientRect().height > 0,
          );
          const smallTargets = buttons
            .map((btn) => {
              const rect = btn.getBoundingClientRect();
              return {
                testId: btn.getAttribute('data-testid') || btn.textContent?.trim(),
                w: rect.width,
                h: rect.height,
              };
            })
            .filter((item) => item.w < 43.9 || item.h < 43.9);

          return {
            docWidth,
            winWidth,
            offenders,
            buttonCount: buttons.length,
            smallTargets,
          };
        });

        assert.ok(
          layoutCheck.docWidth <= layoutCheck.winWidth + 1,
          `${width}/${presetTestId}: document horizontal overflow (${layoutCheck.docWidth} > ${layoutCheck.winWidth})`,
        );
        assert.equal(
          layoutCheck.offenders,
          0,
          `${width}/${presetTestId}: card/panel horizontal overflow`,
        );
        assert.equal(
          layoutCheck.smallTargets.length,
          0,
          `${width}/${presetTestId}: touch target below 44px: ${JSON.stringify(layoutCheck.smallTargets)}`,
        );
      }

      // 2. Return to first open preset & verify reduced motion attribute + normal screenshot
      await page.evaluate(() => {
        document.querySelector('[data-testid="fixture-preset-empty-first-visit"]')?.click();
      });
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-testid="fixture-preset-empty-first-visit"]')
            ?.getAttribute('aria-pressed') === 'true',
      );

      const reducedMotionCheck = await page.evaluate(() => {
        const root = document.querySelector('[data-testid="first-class-tutorial-candidate"]');
        const activeTab = document.querySelector('[data-testid="tutorial-tab-new-movement"]');
        const style = activeTab ? window.getComputedStyle(activeTab) : null;
        return {
          attr: root?.getAttribute('data-reduced-motion'),
          transitionDuration: style?.transitionDuration ?? '0s',
        };
      });
      assert.equal(reducedMotionCheck.attr, 'true', `${width}: expected data-reduced-motion="true"`);
      assert.ok(
        reducedMotionCheck.transitionDuration === '0s' ||
          reducedMotionCheck.transitionDuration === '0ms',
        `${width}: expected 0s transition duration under reduced motion, got ${reducedMotionCheck.transitionDuration}`,
      );

      if (width === 320 || width === 1440) {
        await page.evaluate((w) => {
          if (w === 320) {
            document
              .querySelector('[data-testid="first-class-tutorial-candidate"]')
              ?.scrollIntoView({ block: 'start', behavior: 'auto' });
          } else {
            window.scrollTo(0, 0);
          }
        }, width);
        await page.screenshot(resolve(out, `normal-${width}.png`));
      }

      // 3. Keyboard & Non-gate flow verification (Tabs ArrowRight, End, Home + Skip/Reopen + Dismiss/Reopen-First)
      await page.evaluate(() => {
        const firstTab = document.querySelector('[data-testid="tutorial-tab-new-movement"]');
        firstTab?.focus();
      });

      await page.pressKey('ArrowRight');
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-testid="tutorial-tab-block-composition"]')
            ?.getAttribute('aria-selected') === 'true' &&
          document.activeElement?.getAttribute('data-testid') ===
            'tutorial-tab-block-composition',
      );

      await page.pressKey('End');
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-testid="tutorial-tab-save-class"]')
            ?.getAttribute('aria-selected') === 'true' &&
          document.activeElement?.getAttribute('data-testid') === 'tutorial-tab-save-class',
      );

      await page.pressKey('Home');
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-testid="tutorial-tab-new-movement"]')
            ?.getAttribute('aria-selected') === 'true' &&
          document.activeElement?.getAttribute('data-testid') === 'tutorial-tab-new-movement',
      );

      // Navigate to step 2 and click Skip (`tutorial-skip-btn`)
      await page.pressKey('ArrowRight');
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-testid="tutorial-tab-block-composition"]')
            ?.getAttribute('aria-selected') === 'true',
      );
      await page.evaluate(() => {
        document.querySelector('[data-testid="tutorial-skip-btn"]')?.click();
      });
      await page.waitForFunction(
        () =>
          document.activeElement?.getAttribute('data-testid') === 'tutorial-reopen-btn',
      );

      if (width === 320) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot(resolve(out, 'collapsed-320.png'));
      }

      // Click `첫 수업 3단계 다시보기` (`tutorial-reopen-btn`)
      await page.evaluate(() => {
        document.querySelector('[data-testid="tutorial-reopen-btn"]')?.click();
      });
      await page.waitForFunction(
        () =>
          Boolean(document.querySelector('[data-testid="tutorial-tab-block-composition"]')) &&
          document.activeElement?.getAttribute('data-testid') ===
            'tutorial-active-step-heading',
      );

      // Click `닫기` (`tutorial-dismiss-btn`) and then `1단계부터 다시보기` (`tutorial-reopen-first-btn`)
      await page.evaluate(() => {
        document.querySelector('[data-testid="tutorial-dismiss-btn"]')?.click();
      });
      await page.waitForFunction(
        () =>
          Boolean(document.querySelector('[data-testid="tutorial-reopen-first-btn"]')) &&
          document.activeElement?.getAttribute('data-testid') === 'tutorial-reopen-btn',
      );
      await page.evaluate(() => {
        document.querySelector('[data-testid="tutorial-reopen-first-btn"]')?.click();
      });
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-testid="tutorial-tab-new-movement"]')
            ?.getAttribute('aria-selected') === 'true' &&
          document.activeElement?.getAttribute('data-testid') ===
            'tutorial-active-step-heading',
      );

      // 4. 200% zoom / root font scaling check across all viewports (320px, 390px, 768px, 1440px)
      let zoom200Verified = false;
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%';
      });
      await page.setPageScaleFactor(1);

      for (const stepTestId of [
        'tutorial-tab-new-movement',
        'tutorial-tab-block-composition',
        'tutorial-tab-save-class',
      ]) {
        await page.evaluate((id) => {
          document.querySelector(`[data-testid="${id}"]`)?.click();
        }, stepTestId);

        const zoomCheck = await page.evaluate(() => {
          const docWidth = document.documentElement.scrollWidth;
          const winWidth = window.innerWidth;
          const svg = document.querySelector('.fctc-illustration-svg');
          const heading = document.querySelector(
            '[data-testid="tutorial-active-step-heading"]',
          );
          const svgRect = svg?.getBoundingClientRect();
          const headingRect = heading?.getBoundingClientRect();
          return {
            docWidth,
            winWidth,
            svgVisible: Boolean(svgRect && svgRect.width > 40 && svgRect.height > 20),
            headingVisible: Boolean(
              headingRect &&
                headingRect.width > 20 &&
                headingRect.height > 10 &&
                heading?.textContent?.trim().length > 0,
            ),
          };
        });

        assert.ok(
          zoomCheck.docWidth <= zoomCheck.winWidth + 1,
          `${width} @ 200% (${stepTestId}): horizontal overflow (${zoomCheck.docWidth} > ${zoomCheck.winWidth})`,
        );
        assert.equal(
          zoomCheck.svgVisible,
          true,
          `${width} @ 200% (${stepTestId}): illustration SVG not visible`,
        );
        assert.equal(
          zoomCheck.headingVisible,
          true,
          `${width} @ 200% (${stepTestId}): step heading not readable`,
        );
      }

      if (width === 320) {
        await page.evaluate(() => {
          document.querySelector('[data-testid="tutorial-tab-new-movement"]')?.click();
          document
            .querySelector('[data-testid="tutorial-active-step-heading"]')
            ?.scrollIntoView({ block: 'start', behavior: 'auto' });
        });
        await page.screenshot(resolve(out, 'zoom200-320.png'));
      }

      await page.evaluate(() => {
        document.documentElement.style.fontSize = '';
        document.body.style.zoom = '';
      });
      zoom200Verified = true;

      // 5. Multi-instance DOM ID uniqueness check
      await page.evaluate(() => {
        window.__firstClassTutorialFixture__.showTwo({
          title: '다중 인스턴스 ID 검증',
          targetMinutes: 50,
          steps: [{ stepId: 's1', exerciseId: 'ex-1', durationMin: 10 }],
        });
      });
      await page.waitForFunction(
        () =>
          document.querySelectorAll('[data-testid="first-class-tutorial-candidate"]').length === 2,
      );
      const uniqueIds = await page.evaluate(() => {
        const ids = [...document.querySelectorAll('[id]')].map((el) => el.id);
        return {
          totalIds: ids.length,
          uniqueCount: new Set(ids).size,
        };
      });
      assert.ok(uniqueIds.totalIds > 0, 'Expected DOM elements with [id]');
      assert.equal(
        uniqueIds.uniqueCount,
        uniqueIds.totalIds,
        `${width}: duplicate DOM [id] attributes detected across two instances`,
      );

      // 6. Verify localStorage immutability
      const afterStorage = await page.evaluate(() =>
        JSON.stringify(Object.fromEntries(Object.entries(localStorage))),
      );
      assert.equal(afterStorage, beforeStorage, `${width}: localStorage was mutated`);
      assert.deepEqual(page.pageErrors, [], `${width}: unexpected page errors`);

      results.push({
        width,
        driver: browser.driverKind,
        presetsVerified: 6,
        horizontalOverflow: false,
        zoom200Verified,
        minimumTouchTargetPx: 44,
        keyboardTabsVerified: true,
        skipDismissReopenFlowVerified: true,
        reducedMotionVerified: true,
        multipleInstanceIdsUnique: true,
        localStorageUnchanged: true,
        errors: page.pageErrors,
      });
    } finally {
      await page.close();
    }
  }

  const summary = {
    passed: true,
    driver: browser.driverKind,
    artifactDir: out,
    screenshots: [
      'normal-320.png',
      'zoom200-320.png',
      'collapsed-320.png',
      'normal-1440.png',
    ],
    results,
  };
  await writeFile(resolve(out, 'results.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  await writeFile(resolve(out, 'failure.txt'), String(error?.stack || error));
  throw error;
} finally {
  await browser.close();
  if (viteServer) {
    await viteServer.close();
  }
}
