#!/usr/bin/env node
import { execFileSync, spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '../../..');
const FIXTURE_HTML_PATH = join(__dirname, 'browserFixture.html');

const DEFAULT_OUT_DIR =
  '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/e222144e-f7d6-4229-a83f-13584d7ca18d/cue-sheet-qa';

const CHROMIUM_BINARY = '/usr/bin/chromium';
const PDFINFO_BINARY = '/usr/bin/pdfinfo';
const PDFTOTEXT_BINARY = '/usr/bin/pdftotext';

function parseOutDir(argv) {
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--out-dir' && argv[i + 1]) {
      return resolve(argv[i + 1]);
    }
    if (argv[i].startsWith('--out-dir=')) {
      return resolve(argv[i].slice('--out-dir='.length));
    }
  }
  return DEFAULT_OUT_DIR;
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

class CdpSession {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.ws.addEventListener('message', (event) => {
      const data = JSON.parse(String(event.data));
      if (typeof data.id === 'number') {
        const entry = this.pending.get(data.id);
        if (entry) {
          this.pending.delete(data.id);
          if (data.error) {
            entry.reject(new Error(data.error.message || 'CDP error'));
          } else {
            entry.resolve(data.result);
          }
        }
      }
    });
  }

  static async connect(wsUrl) {
    const ws = new WebSocket(wsUrl);
    await new Promise((resolvePromise, rejectPromise) => {
      ws.addEventListener('open', () => resolvePromise(), { once: true });
      ws.addEventListener(
        'error',
        (err) => rejectPromise(new Error(`WebSocket error: ${String(err)}`)),
        { once: true },
      );
    });
    return new CdpSession(ws);
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolvePromise, rejectPromise) => {
      this.pending.set(id, { resolve: resolvePromise, reject: rejectPromise });
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
      throw new Error(
        res.exceptionDetails.exception?.description ||
          res.exceptionDetails.text ||
          'Runtime.evaluate exception',
      );
    }
    return res.result?.value;
  }

  close() {
    try {
      this.ws.close();
    } catch {
      // ignore close errors
    }
  }
}

const FIXTURE_IDS = [
  'standard-mixed',
  'empty-class',
  'name-only-drafts',
  'long-korean-cues-empty-cues-duplicates',
  'nested-repeats-unilateral-unspecified-time',
  'hundred-items-bounded',
  'corrupted-circular-sensitive-html',
];

const VIEWPORT_WIDTHS = [320, 390, 768, 1440];

async function runBrowserProbe() {
  const outDir = parseOutDir(process.argv.slice(2));
  mkdirSync(outDir, { recursive: true });

  for (const bin of [CHROMIUM_BINARY, PDFINFO_BINARY, PDFTOTEXT_BINARY]) {
    assertCondition(existsSync(bin), `Required binary missing at ${bin}`);
  }
  assertCondition(
    existsSync(FIXTURE_HTML_PATH),
    `browserFixture.html missing at ${FIXTURE_HTML_PATH}`,
  );

  const fixtureHtmlContent = readFileSync(FIXTURE_HTML_PATH, 'utf8');

  let viteServer = null;
  let chromeProcess = null;
  let cdp = null;
  const userDataDir = mkdtempSync(join(tmpdir(), 'cue-sheet-probe-'));

  try {
    viteServer = await createServer({
      root: PROJECT_ROOT,
      logLevel: 'silent',
      server: {
        host: '127.0.0.1',
        port: 0,
      },
      plugins: [
        {
          name: 'cue-sheet-browser-fixture-plugin',
          configureServer(server) {
            server.middlewares.use('/__cue-sheet-fixture', async (req, res, next) => {
              if (!req.url || (req.url !== '/' && !req.url.startsWith('/?'))) {
                next();
                return;
              }
              try {
                const transformed = await server.transformIndexHtml(
                  '/index.html',
                  fixtureHtmlContent,
                );
                res.statusCode = 200;
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.end(transformed);
              } catch (err) {
                next(err);
              }
            });
          },
        },
      ],
    });

    await viteServer.listen();
    const address = viteServer.httpServer?.address();
    assertCondition(
      address && typeof address === 'object',
      'Failed to bind Vite server',
    );
    const baseUrl = `http://127.0.0.1:${address.port}/__cue-sheet-fixture`;

    chromeProcess = spawn(
      CHROMIUM_BINARY,
      [
        '--headless=new',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        `--user-data-dir=${userDataDir}`,
        '--remote-debugging-port=0',
        'about:blank',
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );

    const browserWsUrl = await new Promise((resolvePromise, rejectPromise) => {
      const timeout = setTimeout(() => {
        rejectPromise(new Error('Timed out waiting for Chromium DevTools WebSocket URL.'));
      }, 12000);

      let stderrLog = '';
      chromeProcess.stderr.on('data', (chunk) => {
        stderrLog += chunk.toString('utf8');
        const match = stderrLog.match(/DevTools listening on (ws:\/\/127\.0\.0\.1:\d+\/[^\s]+)/);
        if (match?.[1]) {
          clearTimeout(timeout);
          resolvePromise(match[1]);
        }
      });

      chromeProcess.once('exit', (code) => {
        clearTimeout(timeout);
        rejectPromise(
          new Error(`Chromium exited prematurely with code ${code}: ${stderrLog}`),
        );
      });
    });

    const devtoolsHost = new URL(browserWsUrl).origin.replace('ws://', 'http://');
    const targetsRes = await fetch(`${devtoolsHost}/json/list`);
    const targets = await targetsRes.json();
    const pageTarget = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
    assertCondition(
      Boolean(pageTarget?.webSocketDebuggerUrl),
      'No inspectable page target found in headless Chromium',
    );

    cdp = await CdpSession.connect(pageTarget.webSocketDebuggerUrl);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('DOM.enable');
    await cdp.send('Page.bringToFront');
    await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true });
    await cdp.send('Page.navigate', { url: baseUrl });

    await cdp.evaluate(`new Promise((resolve, reject) => {
      const deadline = Date.now() + 10000;
      const check = () => {
        const root = document.querySelector('[data-testid="class-cue-sheet-root"]');
        if (root && window.__cueSheetProbe__ && typeof window.__cueSheetProbe__.renderProps === 'function') {
          resolve(true);
          return;
        }
        if (Date.now() > deadline) {
          reject(new Error('Timed out waiting for __cueSheetProbe__ and class-cue-sheet-root.'));
          return;
        }
        setTimeout(check, 50);
      };
      check();
    })`);

    const viewportReports = {};
    const screenshotFiles = {};

    const capturePng = async (fileName) => {
      const shot = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
      });
      const filePath = join(outDir, fileName);
      writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
      screenshotFiles[fileName] = filePath;
    };

    for (const width of VIEWPORT_WIDTHS) {
      const height = width < 768 ? 844 : 960;
      await cdp.send('Emulation.setEmulatedMedia', {
        media: 'screen',
        features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
      });
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: width < 768,
      });

      // 1. Default novice mount at 100% scale (collapsed full list & collapsed diagnostics)
      await cdp.evaluate(
        `window.__cueSheetProbe__.renderProps({ key: 'default-novice-${width}', showFixtureSwitcher: true })`,
      );
      const defaultMetrics = await cdp.evaluate(
        `window.__cueSheetProbe__.getRootMetrics()`,
      );

      assertCondition(
        defaultMetrics.innerWidth === width,
        `[${width}px] Expected innerWidth=${width}, got ${defaultMetrics.innerWidth}`,
      );
      assertCondition(
        defaultMetrics.docScrollWidth <= width && defaultMetrics.rootScrollWidth <= width,
        `[${width}px] Horizontal overflow on default mount: doc=${defaultMetrics.docScrollWidth}, root=${defaultMetrics.rootScrollWidth}`,
      );
      assertCondition(
        defaultMetrics.fullListOpen === false &&
          defaultMetrics.fullListDisplay === 'none',
        `[${width}px] Expected full list collapsed on default mount, got open=${defaultMetrics.fullListOpen} display=${defaultMetrics.fullListDisplay}`,
      );
      assertCondition(
        defaultMetrics.diagnosticsOpen === false &&
          defaultMetrics.diagnosticsDisplay === 'none',
        `[${width}px] Expected diagnostics collapsed on default mount, got open=${defaultMetrics.diagnosticsOpen} display=${defaultMetrics.diagnosticsDisplay}`,
      );
      assertCondition(
        defaultMetrics.reducedMotion === 'respected',
        `[${width}px] Expected data-reduced-motion="respected"`,
      );
      assertCondition(
        defaultMetrics.mandatoryReviewGate === 'false',
        `[${width}px] Expected data-mandatory-review-gate="false"`,
      );

      const ro = defaultMetrics.readingOrder;
      assertCondition(
        ro.headerTop !== null &&
          ro.focusDeckTop !== null &&
          ro.currentCardTop !== null &&
          ro.nextCardTop !== null &&
          ro.progressionSectionTop !== null &&
          ro.diagnosticsSectionTop !== null,
        `[${width}px] Missing reading order landmarks: ${JSON.stringify(ro)}`,
      );
      assertCondition(
        ro.headerTop <= ro.focusDeckTop &&
          ro.focusDeckTop <= ro.currentCardTop &&
          ro.currentCardTop <= ro.nextCardTop &&
          ro.nextCardTop <= ro.progressionSectionTop &&
          ro.progressionSectionTop <= ro.diagnosticsSectionTop,
        `[${width}px] Reading order violation: ${JSON.stringify(ro)}`,
      );

      for (const target of defaultMetrics.touchTargets) {
        assertCondition(
          target.width >= 43.9 && target.height >= 43.9,
          `[${width}px] Touch target smaller than 44x44px: ${JSON.stringify(target)}`,
        );
      }

      if (width === 320) {
        await capturePng('cue-sheet-320px-mobile-default-collapsed.png');
      }

      // 2. Check all 7 fixtures at 100% scale AND 200% text scale (cue-sheet-scale-200)
      const fixtureChecks = [];
      for (const fixtureId of FIXTURE_IDS) {
        const fixtureResult = await cdp.evaluate(`(async () => {
          const btn = document.querySelector('button[data-fixture-id="${fixtureId}"]');
          if (!btn) throw new Error('Missing fixture button: ${fixtureId}');
          btn.click();
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

          const scale100Btn = document.querySelector('[data-testid="cue-sheet-scale-100"]');
          scale100Btn.click();
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          const m100 = window.__cueSheetProbe__.getRootMetrics();

          const scale200Btn = document.querySelector('[data-testid="cue-sheet-scale-200"]');
          scale200Btn.click();
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          const m200 = window.__cueSheetProbe__.getRootMetrics();

          return { fixtureId: '${fixtureId}', m100, m200 };
        })()`);

        assertCondition(
          fixtureResult.m100.docScrollWidth <= width &&
            fixtureResult.m100.rootScrollWidth <= width &&
            fixtureResult.m100.maxChildRight <= width &&
            fixtureResult.m100.scrollX === 0,
          `[${width}px][${fixtureId}][100%] Overflow: ${JSON.stringify(fixtureResult.m100)}`,
        );
        assertCondition(
          fixtureResult.m200.textScale === '200' &&
            fixtureResult.m200.docScrollWidth <= width &&
            fixtureResult.m200.rootScrollWidth <= width &&
            fixtureResult.m200.maxChildRight <= width &&
            fixtureResult.m200.scrollX === 0,
          `[${width}px][${fixtureId}][200%] Overflow: ${JSON.stringify(fixtureResult.m200)}`,
        );
        for (const target of fixtureResult.m200.touchTargets) {
          assertCondition(
            target.width >= 43.9 && target.height >= 43.9,
            `[${width}px][${fixtureId}][200%] Touch target < 44px: ${JSON.stringify(target)}`,
          );
        }

        if (
          width === 390 &&
          fixtureId === 'long-korean-cues-empty-cues-duplicates'
        ) {
          await capturePng('cue-sheet-390px-200pct-long-korean-cue.png');
        }

        fixtureChecks.push({
          fixtureId,
          scale100DocScrollWidth: fixtureResult.m100.docScrollWidth,
          scale200DocScrollWidth: fixtureResult.m200.docScrollWidth,
          scale200TouchTargetCount: fixtureResult.m200.touchTargets.length,
        });
      }

      // Reset to 100% scale on standard-mixed and verify expand/collapse disclosures + expanded 240-row view
      const disclosureCheck = await cdp.evaluate(`(async () => {
        const stdBtn = document.querySelector('button[data-fixture-id="standard-mixed"]');
        stdBtn.click();
        const scale100Btn = document.querySelector('[data-testid="cue-sheet-scale-100"]');
        scale100Btn.click();
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

        const fullListToggle = document.querySelector('[data-testid="cue-sheet-full-list-toggle"]');
        const diagToggle = document.querySelector('[data-testid="cue-sheet-diagnostics-toggle"]');

        fullListToggle.click();
        diagToggle.click();
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const expandedMetrics = window.__cueSheetProbe__.getRootMetrics();

        return expandedMetrics;
      })()`);

      assertCondition(
        disclosureCheck.fullListOpen === true &&
          disclosureCheck.fullListDisplay !== 'none' &&
          disclosureCheck.diagnosticsOpen === true &&
          disclosureCheck.diagnosticsDisplay !== 'none',
        `[${width}px] Disclosure toggles failed to open panels: ${JSON.stringify(disclosureCheck)}`,
      );
      assertCondition(
        disclosureCheck.docScrollWidth <= width &&
          disclosureCheck.rootScrollWidth <= width,
        `[${width}px] Overflow when panels expanded: ${JSON.stringify(disclosureCheck)}`,
      );
      for (const target of disclosureCheck.touchTargets) {
        assertCondition(
          target.width >= 43.9 && target.height >= 43.9,
          `[${width}px][expanded-panels] Touch target < 44px: ${JSON.stringify(target)}`,
        );
      }

      if (width === 768) {
        await capturePng('cue-sheet-768px-tablet-expanded-list.png');
      }
      if (width === 1440) {
        await capturePng('cue-sheet-1440px-desktop-overview.png');
      }

      // 3. Keyboard navigation & live-edit regressions (insert/delete/reorder/current-delete/class-replace)
      const liveEditResults = await cdp.evaluate(`(async () => {
        const liveKey = 'probe-live-edit-${width}';
        const stepA = { stepId: 'probe-a', nameKo: '첫 번째 호흡 정렬', durationMin: 4 };
        const stepB = { stepId: 'probe-b', nameKo: '두 번째 풋워크', durationMin: 6 };
        const stepC = { stepId: 'probe-c', nameKo: '세 번째 헌드레드', durationMin: 5 };
        const stepD = { stepId: 'probe-d', nameKo: '네 번째 머메이드', durationMin: 4 };

        await window.__cueSheetProbe__.renderProps({
          key: liveKey,
          showFixtureSwitcher: false,
          sourceInput: {
            id: 'probe-class-1',
            title: '실시간 편집 검증 수업',
            steps: [stepA, stepB, stepC, stepD],
          },
        });

        const nextBtn = document.querySelector('[data-testid="cue-sheet-nav-next"]');
        nextBtn.focus();
        nextBtn.click();
        await new Promise((r) => requestAnimationFrame(r));
        nextBtn.click();
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const afterSelectC = window.__cueSheetProbe__.getRootMetrics();

        // Delete current item (stepC) -> fallback-adjacent-after-delete
        await window.__cueSheetProbe__.renderProps({
          key: liveKey,
          showFixtureSwitcher: false,
          sourceInput: {
            id: 'probe-class-1',
            title: '실시간 편집 검증 수업',
            steps: [stepA, stepB, stepD],
          },
        });
        const afterDeleteCurrent = window.__cueSheetProbe__.getRootMetrics();
        const hasFallbackNotice = Boolean(
          document.querySelector('[data-testid="cue-sheet-selection-fallback-notice"]'),
        );

        // Replace with new class -> reset-on-class-change
        await window.__cueSheetProbe__.renderProps({
          key: liveKey,
          showFixtureSwitcher: false,
          sourceInput: {
            id: 'probe-class-2-replacement',
            title: '교체된 수업',
            steps: [
              { stepId: 'rep-1', nameKo: '교체 동작 1', durationMin: 5 },
              { stepId: 'rep-2', nameKo: '교체 동작 2', durationMin: 5 },
            ],
          },
        });
        const afterReplaceClass = window.__cueSheetProbe__.getRootMetrics();

        // Keyboard End and Home on focus deck
        const deck = document.querySelector('[data-testid="cue-sheet-focus-deck"]');
        deck.focus();
        deck.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
        await new Promise((r) => requestAnimationFrame(r));
        const afterKeyEnd = window.__cueSheetProbe__.getRootMetrics();
        const root = document.querySelector('[data-testid="class-cue-sheet-root"]');
        const focusRetainedInsideRoot = Boolean(
          document.activeElement &&
            document.activeElement !== document.body &&
            root.contains(document.activeElement),
        );

        return {
          afterSelectC,
          afterDeleteCurrent,
          hasFallbackNotice,
          afterReplaceClass,
          afterKeyEnd,
          focusRetainedInsideRoot,
        };
      })()`);

      assertCondition(
        liveEditResults.afterSelectC.currentStepIndex === 2,
        `[${width}px] Expected step index 2 before delete, got ${liveEditResults.afterSelectC.currentStepIndex}`,
      );
      assertCondition(
        liveEditResults.afterDeleteCurrent.selectionResolution ===
          'fallback-adjacent-after-delete' && liveEditResults.hasFallbackNotice,
        `[${width}px] Expected fallback-adjacent-after-delete with fallback notice`,
      );
      assertCondition(
        liveEditResults.afterReplaceClass.selectionResolution ===
          'reset-on-class-change' &&
          liveEditResults.afterReplaceClass.currentStepIndex === 0,
        `[${width}px] Expected reset-on-class-change at index 0`,
      );
      assertCondition(
        liveEditResults.afterKeyEnd.currentStepIndex === 1 &&
          liveEditResults.focusRetainedInsideRoot,
        `[${width}px] Expected keyboard End navigation and focus retained inside root`,
      );

      viewportReports[String(width)] = {
        width,
        height,
        defaultCollapsedVerified: true,
        readingOrderVerified: true,
        touchTargetsMin44Verified: true,
        touchTargetCountDefault: defaultMetrics.touchTargets.length,
        fixtureChecks,
        liveEditVerified: true,
      };
    }

    // Verify @media print A4 and US Letter PDF generation while screen full list is collapsed (initialFullListOpen: false)
    await cdp.evaluate(`window.__cueSheetProbe__.renderProps({
      key: 'print-while-collapsed-screen',
      showFixtureSwitcher: false,
      initialFixtureId: 'long-korean-cues-empty-cues-duplicates',
      initialFullListOpen: false,
      initialDiagnosticsOpen: false,
    })`);

    const screenCollapsedBeforePrint = await cdp.evaluate(
      `window.__cueSheetProbe__.getRootMetrics()`,
    );
    assertCondition(
      screenCollapsedBeforePrint.fullListOpen === false,
      'Expected fullListOpen=false on screen before printToPDF',
    );

    // Clear 'screen' media override / enable 'print' media so @media print CSS rules apply during Page.printToPDF
    await cdp.send('Emulation.setEmulatedMedia', { media: 'print' });

    const printReports = {};
    for (const paper of [
      { name: 'a4', paperWidth: 8.27, paperHeight: 11.69 },
      { name: 'letter', paperWidth: 8.5, paperHeight: 11.0 },
    ]) {
      const pdfRes = await cdp.send('Page.printToPDF', {
        printBackground: true,
        preferCSSPageSize: false,
        paperWidth: paper.paperWidth,
        paperHeight: paper.paperHeight,
        marginTop: 0.4,
        marginBottom: 0.4,
        marginLeft: 0.4,
        marginRight: 0.4,
      });
      const pdfPath = join(outDir, `cue-sheet-print-${paper.name}.pdf`);
      writeFileSync(pdfPath, Buffer.from(pdfRes.data, 'base64'));

      const infoOut = execFileSync(PDFINFO_BINARY, [pdfPath], { encoding: 'utf8' });
      const pagesMatch = infoOut.match(/^Pages:\s+(\d+)/m);
      const pageCount = Number(pagesMatch?.[1] ?? '0');
      const fullText = execFileSync(PDFTOTEXT_BINARY, [pdfPath, '-'], {
        encoding: 'utf8',
      });

      assertCondition(
        pageCount >= 2,
        `[${paper.name}] Expected multi-page PDF, got ${pageCount}`,
      );
      for (const marker of [
        '[장문큐-시작-01]',
        '[장문큐-끝-01]',
        '[장문큐-시작-03]',
        '[장문큐-끝-03]',
        '[장문큐-시작-05]',
        '[장문큐-끝-05]',
        '[장문큐-시작-06]',
        '[장문큐-끝-06]',
      ]) {
        assertCondition(
          fullText.includes(marker),
          `[${paper.name}] Missing marker ${marker} in printed PDF when full list was collapsed on screen`,
        );
      }

      printReports[paper.name] = {
        pdfPath,
        pageCount,
        allLongCueMarkersPresent: true,
      };
    }

    const summary = {
      status: 'passed',
      timestamp: new Date().toISOString(),
      outDir,
      viewportsTested: VIEWPORT_WIDTHS,
      viewportReports,
      printReports,
      screenshotFiles,
    };

    const resultsJsonPath = join(outDir, 'results.json');
    writeFileSync(resultsJsonPath, JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    if (cdp) {
      cdp.close();
    }
    if (chromeProcess && !chromeProcess.killed) {
      chromeProcess.kill('SIGKILL');
    }
    if (viteServer) {
      await viteServer.close();
    }
    if (userDataDir) {
      rmSync(userDataDir, { recursive: true, force: true });
    }
  }
}

runBrowserProbe().catch((err) => {
  console.error(err);
  process.exit(1);
});
