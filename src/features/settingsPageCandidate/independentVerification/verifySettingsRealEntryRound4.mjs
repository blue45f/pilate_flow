#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
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

async function collectCandidateSourceMetrics(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectCandidateSourceMetrics(fullPath);
      files.push(...nested);
    } else if (entry.isFile()) {
      const content = await readFile(fullPath, 'utf8');
      const fileStat = await stat(fullPath);
      files.push({
        path: relative(projectRoot, fullPath),
        lines: content.split('\n').length,
        bytes: fileStat.size,
      });
    }
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

async function launchCdpBrowser() {
  const chromeBin = findChromeBinary();
  const userDataDir = await mkdtemp(join(os.tmpdir(), 'pf-settings-r4-cdp-'));
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
    async newPage({ width, height, reducedMotion = false }) {
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
        async setReducedMotionMedia(reduced) {
          await send(
            'Emulation.setEmulatedMedia',
            {
              features: [
                {
                  name: 'prefers-reduced-motion',
                  value: reduced ? 'reduce' : 'no-preference',
                },
              ],
            },
            sessionId,
          );
        },
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

const evidenceDir = resolve(projectRoot, 'docs/settings-real-entry-round4-20261107/evidence');
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
const realEntryUrl = `${baseUrl}/`;
const fixtureUrl = `${baseUrl}/src/features/settingsPageCandidate/browserFixture.html`;

const browser = await launchCdpBrowser();
const realEntryViewportResults = [];
const fixtureViewportResults = [];
let interactiveRevisitReport = null;

try {
  // Part 1: Real User Settings Entry Path (`/`) across 320, 390, 768, 1440 and 200% zoom
  for (const { width, height } of VIEWPORTS) {
    const page = await browser.newPage({ width, height, reducedMotion: false });
    try {
      await page.goto(realEntryUrl);
      await page.waitForFunction(() =>
        Boolean(document.querySelector('[aria-label="데이터 백업과 사용 안내"]')),
      );

      // Click topbar settings button (`[aria-label="데이터 백업과 사용 안내"]`)
      await page.evaluate(() => {
        const btn = document.querySelector('[aria-label="데이터 백업과 사용 안내"]');
        if (!(btn instanceof HTMLElement)) {
          throw new Error('Missing topbar settings button [aria-label="데이터 백업과 사용 안내"]');
        }
        btn.click();
      });

      // Wait for "나의 스튜디오" dialog and legacy panels to load
      await page.waitForFunction(() => {
        const dialogs = [...document.querySelectorAll('dialog')];
        const studioDialog = dialogs.find(
          (d) => d.open && d.textContent?.includes('나의 스튜디오'),
        );
        if (!studioDialog) return false;
        const hasCloudSync = Boolean(studioDialog.querySelector('.firebase-account-panel'));
        const hasRecovery = Boolean(studioDialog.querySelector('.recovery-preview'));
        return hasCloudSync && hasRecovery;
      });

      // Inspect initial state of "나의 스튜디오" dialog before expanding 4-group summary
      const entryInspection = await page.evaluate(() => {
        const studioDialog = [...document.querySelectorAll('dialog')].find(
          (d) => d.open && d.textContent?.includes('나의 스튜디오'),
        );
        if (!studioDialog) {
          throw new Error('Studio dialog not open');
        }
        const summaries = [...studioDialog.querySelectorAll('details.settings-section > summary')];
        const candidateSummary = summaries.find((s) =>
          s.textContent?.includes('4그룹 통합 설정 요약 (계정 · 음성 · 설치 · 데이터)'),
        );
        const candidateDetails = candidateSummary?.closest('details') ?? null;
        return {
          dialogTitle:
            studioDialog.querySelector('.atelier-modal-title')?.textContent?.trim() ?? '',
          hasLegacyCloudSyncPanel: Boolean(studioDialog.querySelector('.firebase-account-panel')),
          hasLegacyInventoryPanel: Boolean(studioDialog.querySelector('.inventory-panel')),
          hasLegacyRecoveryPreview: Boolean(studioDialog.querySelector('.recovery-preview')),
          hasCandidateSummaryDisclosure: Boolean(candidateSummary),
          candidateDetailsInitiallyOpen: candidateDetails ? candidateDetails.open : null,
        };
      });

      assert.equal(entryInspection.dialogTitle, '나의 스튜디오');
      assert.equal(entryInspection.hasLegacyCloudSyncPanel, true);
      assert.equal(entryInspection.hasLegacyInventoryPanel, true);
      assert.equal(entryInspection.hasLegacyRecoveryPreview, true);
      assert.equal(entryInspection.hasCandidateSummaryDisclosure, true);
      assert.equal(
        entryInspection.candidateDetailsInitiallyOpen,
        false,
        `${width}x${height}: expected 4-group summary <details> to be initially collapsed (open === false)`,
      );

      // Expand `<summary>4그룹 통합 설정 요약 (계정 · 음성 · 설치 · 데이터)</summary>`
      await page.evaluate(() => {
        const summaries = [...document.querySelectorAll('details.settings-section > summary')];
        const candidateSummary = summaries.find((s) =>
          s.textContent?.includes('4그룹 통합 설정 요약 (계정 · 음성 · 설치 · 데이터)'),
        );
        if (!(candidateSummary instanceof HTMLElement)) {
          throw new Error('Missing 4-group summary element');
        }
        candidateSummary.click();
      });

      // Wait for `[data-testid="pilates-settings-page"]` to lazy-mount and render visibly
      await page.waitForFunction(() => {
        const el = document.querySelector('[data-testid="pilates-settings-page"]');
        return Boolean(el && el.getBoundingClientRect().height > 0);
      });

      // Open inner `<details>` inside `.pf-settings-page` so all interactive controls are visible for measurement
      await page.evaluate(() => {
        document
          .querySelectorAll('.pf-settings-page details')
          .forEach((d) => d.setAttribute('open', ''));
      });

      const realEntryAudit = await page.evaluate(() => {
        const docScrollWidth = document.documentElement.scrollWidth;
        const winInnerWidth = window.innerWidth;
        const rootEl = document.querySelector('[data-testid="pilates-settings-page"]');
        const rootScrollWidth = rootEl ? rootEl.scrollWidth : 0;
        const rootClientWidth = rootEl ? rootEl.clientWidth : 0;

        const groupIds = ['account', 'voice', 'install', 'data'];
        const groupsPresent = groupIds.every((id) =>
          Boolean(rootEl?.querySelector(`[data-testid="settings-group-${id}"]`)),
        );

        const requiredTestIds = [
          'settings-voice-autoplay-prerequisite',
          'settings-video-autoplay-policy',
          'settings-reduced-motion-status',
          'settings-reduced-motion-toggle',
          'settings-install-offline-summary',
          'settings-install-offline-scope',
        ];
        const visibleRequiredTestIds = {};
        for (const tid of requiredTestIds) {
          const node = rootEl?.querySelector(`[data-testid="${tid}"]`);
          const rect = node?.getBoundingClientRect();
          visibleRequiredTestIds[tid] = Boolean(
            node && rect && rect.width > 0 && rect.height > 0 && node.textContent?.trim(),
          );
        }

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

        return {
          docScrollWidth,
          winInnerWidth,
          rootScrollWidth,
          rootClientWidth,
          groupsPresent,
          visibleRequiredTestIds,
          interactiveTargetCount: targets.length,
          undersizedTargets,
          overlaps,
        };
      });

      assert.equal(realEntryAudit.groupsPresent, true, `${width}x${height}: missing 4 groups`);
      for (const [tid, isVis] of Object.entries(realEntryAudit.visibleRequiredTestIds)) {
        assert.equal(
          isVis,
          true,
          `${width}x${height}: expected [data-testid="${tid}"] to be visible on real entry path`,
        );
      }
      assert.ok(
        realEntryAudit.docScrollWidth <= realEntryAudit.winInnerWidth + 1,
        `${width}x${height} real entry: document horizontal overflow (${realEntryAudit.docScrollWidth} > ${realEntryAudit.winInnerWidth})`,
      );
      assert.ok(
        realEntryAudit.rootScrollWidth <= realEntryAudit.rootClientWidth + 1,
        `${width}x${height} real entry: .pf-settings-page horizontal overflow (${realEntryAudit.rootScrollWidth} > ${realEntryAudit.rootClientWidth})`,
      );
      assert.equal(
        realEntryAudit.undersizedTargets.length,
        0,
        `${width}x${height} real entry: undersized touch targets: ${JSON.stringify(realEntryAudit.undersizedTargets)}`,
      );
      assert.equal(
        realEntryAudit.overlaps.length,
        0,
        `${width}x${height} real entry: sibling touch overlap: ${JSON.stringify(realEntryAudit.overlaps)}`,
      );

      // Scroll candidate root into view inside the modal and capture 100% screenshot
      await page.evaluate(() => {
        document
          .querySelector('[data-testid="pilates-settings-page"]')
          ?.scrollIntoView({ block: 'start', behavior: 'instant' });
      });
      await page.screenshot(resolve(screenshotDir, `real-entry-settings-${width}-100.png`));

      // Verify 200% zoom on real entry path
      const zoom200RealEntry = await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%';
        const rootEl = document.querySelector('[data-testid="pilates-settings-page"]');
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
        zoom200RealEntry.font200DocScrollWidth <= zoom200RealEntry.font200WinInnerWidth + 1,
        `${width}x${height} real entry @ 200% font-size: document overflow (${zoom200RealEntry.font200DocScrollWidth} > ${zoom200RealEntry.font200WinInnerWidth})`,
      );
      assert.ok(
        zoom200RealEntry.font200RootScrollWidth <= zoom200RealEntry.font200RootClientWidth + 1,
        `${width}x${height} real entry @ 200% font-size: .pf-settings-page overflow (${zoom200RealEntry.font200RootScrollWidth} > ${zoom200RealEntry.font200RootClientWidth})`,
      );

      if (width === 320) {
        await page.evaluate(() => {
          document
            .querySelector('[data-testid="pilates-settings-page"]')
            ?.scrollIntoView({ block: 'start', behavior: 'instant' });
        });
        await page.screenshot(resolve(screenshotDir, 'real-entry-settings-320-200zoom.png'));
      }

      await page.evaluate(() => {
        document.documentElement.style.fontSize = '';
      });

      // Run Interactive Revisit Persistence Test on the REAL Entry Path (`/`) at 390x844
      if (width === 390) {
        // 1. Click `[data-testid="settings-voice-enable-toggle"]`
        await page.evaluate(() => {
          const btn = document.querySelector('[data-testid="settings-voice-enable-toggle"]');
          if (!(btn instanceof HTMLElement)) throw new Error('Missing voice toggle');
          btn.click();
        });
        await page.waitForFunction(
          () =>
            document
              .querySelector('[data-testid="settings-voice-enable-toggle"]')
              ?.getAttribute('aria-pressed') === 'true',
        );
        const voiceNoticeAfterEnable = await page.evaluate(
          () =>
            document
              .querySelector('[data-testid="settings-voice-announcement"]')
              ?.textContent?.trim() ?? '',
        );
        assert.ok(
          voiceNoticeAfterEnable.includes('수업 화면의 사용자 명시적 토글') &&
            voiceNoticeAfterEnable.includes('참고 영상은 자동 재생하지 않습니다'),
          `Expected honest unlinked prerequisite notice, got: ${voiceNoticeAfterEnable}`,
        );

        // 2. Click `[data-testid="settings-voice-speed-0.85"]`
        await page.evaluate(() => {
          const btn = document.querySelector('[data-testid="settings-voice-speed-0.85"]');
          if (!(btn instanceof HTMLElement)) throw new Error('Missing speed 0.85 button');
          btn.click();
        });
        await page.waitForFunction(() => {
          const speedPressed =
            document
              .querySelector('[data-testid="settings-voice-speed-0.85"]')
              ?.getAttribute('aria-pressed') === 'true';
          const badgeText =
            document.querySelector('[data-testid="settings-current-value-voice"]')?.textContent ??
            '';
          return speedPressed && badgeText.includes('0.85x');
        });

        // 3. Click `[data-testid="settings-voice-pref-breath"]` (unchecks breath -> 2/3 켜짐)
        await page.evaluate(() => {
          const input = document.querySelector('[data-testid="settings-voice-pref-breath"]');
          if (!(input instanceof HTMLElement)) throw new Error('Missing breath checkbox');
          input.click();
        });
        await page.waitForFunction(() => {
          const input = document.querySelector('[data-testid="settings-voice-pref-breath"]');
          const announcement =
            document.querySelector('[data-testid="settings-voice-announcement"]')?.textContent ??
            '';
          return (
            input instanceof HTMLInputElement &&
            input.checked === false &&
            announcement.includes('2/3 켜짐')
          );
        });

        // 4. Click `[data-testid="settings-reduced-motion-toggle"]`
        await page.evaluate(() => {
          const btn = document.querySelector('[data-testid="settings-reduced-motion-toggle"]');
          if (!(btn instanceof HTMLElement)) throw new Error('Missing reduced motion toggle');
          btn.click();
        });
        await page.waitForFunction(() => {
          const root = document.querySelector('[data-testid="pilates-settings-page"]');
          const statusText =
            document.querySelector('[data-testid="settings-reduced-motion-status"]')?.textContent ??
            '';
          return (
            root?.getAttribute('data-reduced-motion') === 'true' &&
            statusText.includes('모션 감소 켜짐')
          );
        });

        // 5. Click equipment checkbox `[data-testid="settings-equipment-check-chair"]`
        // This calls `state.toggleOwnedEquipment('chair')` in `usePilatesStore` and causes `App.tsx`
        // to re-render with a brand-new inline `snapshot={{ data: ... }}` object!
        const chairBefore = await page.evaluate(() => {
          const el = document.querySelector('[data-testid="settings-equipment-check-chair"]');
          return el instanceof HTMLInputElement ? el.checked : null;
        });
        await page.evaluate(() => {
          const el = document.querySelector('[data-testid="settings-equipment-check-chair"]');
          if (!(el instanceof HTMLElement)) throw new Error('Missing chair checkbox');
          el.click();
        });
        await page.waitForFunction((prevChecked) => {
          const el = document.querySelector('[data-testid="settings-equipment-check-chair"]');
          return el instanceof HTMLInputElement && el.checked === !prevChecked;
        }, chairBefore);

        const afterStoreRerender = await page.evaluate(() => {
          const root = document.querySelector('[data-testid="pilates-settings-page"]');
          const voiceBtn = document.querySelector('[data-testid="settings-voice-enable-toggle"]');
          const speedBtn = document.querySelector('[data-testid="settings-voice-speed-0.85"]');
          const breathInput = document.querySelector('[data-testid="settings-voice-pref-breath"]');
          const chairInput = document.querySelector('[data-testid="settings-equipment-check-chair"]');
          return {
            voiceEnabled: voiceBtn?.getAttribute('aria-pressed') === 'true',
            speed085: speedBtn?.getAttribute('aria-pressed') === 'true',
            breathChecked:
              breathInput instanceof HTMLInputElement ? breathInput.checked : null,
            reducedMotionAttr: root?.getAttribute('data-reduced-motion'),
            chairChecked: chairInput instanceof HTMLInputElement ? chairInput.checked : null,
          };
        });

        assert.equal(afterStoreRerender.voiceEnabled, true, 'Voice reset after App.tsx re-render');
        assert.equal(afterStoreRerender.speed085, true, 'Speed reset after App.tsx re-render');
        assert.equal(
          afterStoreRerender.breathChecked,
          false,
          'Breath preference reset after App.tsx re-render',
        );
        assert.equal(
          afterStoreRerender.reducedMotionAttr,
          'true',
          'Reduced motion reset after App.tsx re-render',
        );

        // 6. Close the "나의 스튜디오" dialog by clicking its `닫기` button
        await page.evaluate(() => {
          const studioDialog = [...document.querySelectorAll('dialog')].find(
            (d) => d.open && d.textContent?.includes('나의 스튜디오'),
          );
          const closeBtn = studioDialog?.querySelector('button[aria-label="닫기"]');
          if (!(closeBtn instanceof HTMLElement)) {
            throw new Error('Missing close button on 나의 스튜디오 dialog');
          }
          closeBtn.click();
        });

        await page.waitForFunction(() => {
          const studioDialog = [...document.querySelectorAll('dialog')].find((d) =>
            d.textContent?.includes('나의 스튜디오'),
          );
          const root = document.querySelector('[data-testid="pilates-settings-page"]');
          const rootHidden = !root || root.getBoundingClientRect().height === 0;
          return Boolean(studioDialog && !studioDialog.open && rootHidden);
        });

        // 7. Revisit Settings: Click `[aria-label="데이터 백업과 사용 안내"]` again
        await page.evaluate(() => {
          const btn = document.querySelector('[aria-label="데이터 백업과 사용 안내"]');
          if (!(btn instanceof HTMLElement)) {
            throw new Error('Missing topbar settings button on revisit');
          }
          btn.click();
        });

        await page.waitForFunction(() => {
          const studioDialog = [...document.querySelectorAll('dialog')].find(
            (d) => d.open && d.textContent?.includes('나의 스튜디오'),
          );
          return Boolean(studioDialog);
        });

        // Also test closing & reopening the `<summary>4그룹 통합 설정 요약...</summary>` disclosure
        await page.evaluate(() => {
          const summaries = [...document.querySelectorAll('details.settings-section > summary')];
          const candidateSummary = summaries.find((s) =>
            s.textContent?.includes('4그룹 통합 설정 요약 (계정 · 음성 · 설치 · 데이터)'),
          );
          const details = candidateSummary?.closest('details');
          if (details && !details.open && candidateSummary instanceof HTMLElement) {
            candidateSummary.click();
          }
        });

        await page.waitForFunction(() => {
          const el = document.querySelector('[data-testid="pilates-settings-page"]');
          return Boolean(el && el.getBoundingClientRect().height > 0);
        });

        const afterRevisit = await page.evaluate(() => {
          const root = document.querySelector('[data-testid="pilates-settings-page"]');
          const voiceBtn = document.querySelector('[data-testid="settings-voice-enable-toggle"]');
          const speedBtn = document.querySelector('[data-testid="settings-voice-speed-0.85"]');
          const breathInput = document.querySelector('[data-testid="settings-voice-pref-breath"]');
          const motionStatus = document.querySelector(
            '[data-testid="settings-reduced-motion-status"]',
          );
          const voiceBadge = document.querySelector('[data-testid="settings-current-value-voice"]');
          const chairInput = document.querySelector('[data-testid="settings-equipment-check-chair"]');
          return {
            voiceEnabled: voiceBtn?.getAttribute('aria-pressed') === 'true',
            speed085: speedBtn?.getAttribute('aria-pressed') === 'true',
            voiceBadgeText: voiceBadge?.textContent?.trim() ?? '',
            breathChecked:
              breathInput instanceof HTMLInputElement ? breathInput.checked : null,
            reducedMotionAttr: root?.getAttribute('data-reduced-motion'),
            reducedMotionStatusText: motionStatus?.textContent?.trim() ?? '',
            chairChecked: chairInput instanceof HTMLInputElement ? chairInput.checked : null,
          };
        });

        assert.equal(afterRevisit.voiceEnabled, true, 'Revisit: Voice should still be ON');
        assert.equal(afterRevisit.speed085, true, 'Revisit: Speed should still be 0.85x');
        assert.ok(
          afterRevisit.voiceBadgeText.includes('0.85x'),
          `Revisit: Expected voice badge to include 0.85x, got ${afterRevisit.voiceBadgeText}`,
        );
        assert.equal(
          afterRevisit.breathChecked,
          false,
          'Revisit: Breath should still be unchecked',
        );
        assert.equal(
          afterRevisit.reducedMotionAttr,
          'true',
          'Revisit: data-reduced-motion should still be "true"',
        );
        assert.ok(
          afterRevisit.reducedMotionStatusText.includes('모션 감소 켜짐'),
          'Revisit: reduced-motion status should still show 모션 감소 켜짐',
        );
        assert.equal(
          afterRevisit.chairChecked,
          !chairBefore,
          'Revisit: Equipment chair selection should remain persisted in store',
        );

        await page.evaluate(() => {
          document
            .querySelector('[data-testid="settings-group-voice"]')
            ?.scrollIntoView({ block: 'start', behavior: 'instant' });
        });
        await page.screenshot(resolve(screenshotDir, 'real-entry-settings-revisit-390.png'));

        interactiveRevisitReport = {
          viewport: '390x844',
          voiceNoticeAfterEnable,
          afterStoreRerender,
          afterRevisit,
          revisitConsistencyVerified: true,
        };
      }

      assert.deepEqual(
        page.pageErrors,
        [],
        `${width}x${height} real entry: unexpected runtime exceptions`,
      );

      realEntryViewportResults.push({
        viewport: `${width}x${height}`,
        width,
        height,
        entryInspection,
        groupsPresent: realEntryAudit.groupsPresent,
        visibleRequiredTestIds: realEntryAudit.visibleRequiredTestIds,
        horizontalOverflow100Pct: false,
        horizontalOverflow200PctFont: false,
        minTouchTarget44x44Verified: true,
        interactiveTargetCount: realEntryAudit.interactiveTargetCount,
        touchSiblingOverlapCount: 0,
        pageErrors: page.pageErrors,
      });
    } finally {
      await page.close();
    }
  }

  // Part 2: Candidate Fixture (`/src/features/settingsPageCandidate/browserFixture.html`) across 320, 390, 768, 1440
  for (const { width, height } of VIEWPORTS) {
    const page = await browser.newPage({ width, height, reducedMotion: true });
    try {
      await page.goto(fixtureUrl);
      await page.waitForFunction(
        () =>
          Boolean(document.querySelector('[data-testid="settings-fixture-harness"]')) &&
          Boolean(window.__pilatesSettingsFixture__),
      );

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
        await page.evaluate(() => {
          document
            .querySelectorAll('.pf-settings-page details')
            .forEach((d) => d.setAttribute('open', ''));
        });

        const fixtureAudit = await page.evaluate(() => {
          const docScrollWidth = document.documentElement.scrollWidth;
          const winInnerWidth = window.innerWidth;
          const rootEl = document.querySelector('.pf-settings-page');
          const rootScrollWidth = rootEl ? rootEl.scrollWidth : 0;
          const rootClientWidth = rootEl ? rootEl.clientWidth : 0;
          return {
            docScrollWidth,
            winInnerWidth,
            rootScrollWidth,
            rootClientWidth,
          };
        });

        assert.ok(
          fixtureAudit.docScrollWidth <= fixtureAudit.winInnerWidth + 1,
          `Fixture ${width}x${height} [${presetId}]: doc overflow`,
        );
        assert.ok(
          fixtureAudit.rootScrollWidth <= fixtureAudit.rootClientWidth + 1,
          `Fixture ${width}x${height} [${presetId}]: root overflow`,
        );
      }

      fixtureViewportResults.push({
        viewport: `${width}x${height}`,
        presetsVerified: PRESET_IDS.length,
        horizontalOverflow100Pct: false,
        pageErrors: page.pageErrors,
      });
    } finally {
      await page.close();
    }
  }

  const candidateSourceFiles = await collectCandidateSourceMetrics(
    resolve(projectRoot, 'src/features/settingsPageCandidate'),
  );
  const totalCandidateLines = candidateSourceFiles.reduce((acc, item) => acc + item.lines, 0);
  const totalCandidateBytes = candidateSourceFiles.reduce((acc, item) => acc + item.bytes, 0);

  const reportPayload = {
    featureId: 'settings-real-entry-round4-20261107',
    track: 'Track B — Round 4 Real-Entry & Headless Chromium Browser Verification',
    verifiedAt: new Date().toISOString(),
    passed: true,
    driver: browser.driverKind,
    chromeBinary: browser.chromeBin,
    realEntryPathFactCheck: {
      entryTriggerSelector: '[aria-label="데이터 백업과 사용 안내"]',
      modalTitle: '나의 스튜디오',
      topLevelLegacyPanels: ['CloudSyncPanel', 'InventoryPanel', 'RecoveryPreview'],
      candidateMountLocation:
        'Bottom <details class="settings-section"> -> <summary>4그룹 통합 설정 요약 (계정 · 음성 · 설치 · 데이터)</summary>',
      candidateInitiallyCollapsed: true,
      wiredSnapshotProps: [
        'data.savedSequenceCount',
        'data.exerciseCount',
        'data.historyLogCount',
        'data.ownedEquipmentIds',
        'data.ownedPropIds',
        'data.persistenceError',
        'data.backupMessage',
      ],
      wiredPortCallbacks: [
        'onExportBackupJson',
        'onToggleOwnedEquipment',
        'onToggleOwnedProp',
      ],
      unwiredGroupsInAppTsx: [
        'account (snapshot.account undefined; sign-in/switch/sign-out/recheck port callbacks omitted)',
        'voice (snapshot.voice undefined; voice toggle/speed/preferences/sample/recheck not connected to useClassVoiceGuidance)',
        'reducedMotion (preferReducedMotion prop & onToggleReducedMotion omitted; candidate-local + OS matchMedia only)',
        'install (snapshot.install undefined; onRequestPwaInstall not connected to usePwa/requestPwaInstall)',
        'data.recovery (recoveryStage/recoveryPreview/rollbackPoint & select/apply/cancel/rollback callbacks omitted in candidate port)',
      ],
    },
    interactiveRevisitReport,
    realEntryViewportResults,
    fixtureViewportResults,
    screenshots: [
      'docs/settings-real-entry-round4-20261107/evidence/screenshots/real-entry-settings-320-100.png',
      'docs/settings-real-entry-round4-20261107/evidence/screenshots/real-entry-settings-320-200zoom.png',
      'docs/settings-real-entry-round4-20261107/evidence/screenshots/real-entry-settings-390-100.png',
      'docs/settings-real-entry-round4-20261107/evidence/screenshots/real-entry-settings-768-100.png',
      'docs/settings-real-entry-round4-20261107/evidence/screenshots/real-entry-settings-1440-100.png',
      'docs/settings-real-entry-round4-20261107/evidence/screenshots/real-entry-settings-revisit-390.png',
    ],
    candidateSourceMetrics: {
      totalFiles: candidateSourceFiles.length,
      totalLines: totalCandidateLines,
      totalBytes: totalCandidateBytes,
      files: candidateSourceFiles,
    },
  };

  await writeFile(
    resolve(evidenceDir, 'real-entry-round4-verification.json'),
    JSON.stringify(reportPayload, null, 2),
  );
  console.log(JSON.stringify(reportPayload, null, 2));
} finally {
  await browser.close();
  await viteServer.close();
}
