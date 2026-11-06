// @vitest-environment node
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer, type ViteDevServer } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

if (typeof globalThis.window === 'undefined') {
  (globalThis as Record<string, unknown>).window = globalThis;
}

const CHROMIUM_BINARY = '/usr/bin/chromium';
const PDFINFO_BINARY = '/usr/bin/pdfinfo';
const PDFTOTEXT_BINARY = '/usr/bin/pdftotext';
const PDFTOPPM_BINARY = '/usr/bin/pdftoppm';

function assertLocalPopplerAndChromiumBinaries(): void {
  for (const bin of [CHROMIUM_BINARY, PDFINFO_BINARY, PDFTOTEXT_BINARY, PDFTOPPM_BINARY]) {
    if (!existsSync(bin)) {
      throw new Error(`Required local binary missing at ${bin}`);
    }
  }
}

interface PgmPageAnalysis {
  pageNumber: number;
  width: number;
  height: number;
  darkPixelCount: number;
  nonWhitePixelCount: number;
  edgeMarginCleanRatio: number;
}

function analyzePgmRaster(buf: Buffer, pageNumber: number): PgmPageAnalysis {
  let offset = 0;
  const readToken = (): string => {
    while (offset < buf.length) {
      const b = buf[offset];
      if (b === 0x23) {
        while (offset < buf.length && buf[offset] !== 0x0a) {
          offset++;
        }
      } else if (b === 0x20 || b === 0x09 || b === 0x0a || b === 0x0d) {
        offset++;
      } else {
        break;
      }
    }
    const start = offset;
    while (offset < buf.length) {
      const b = buf[offset];
      if (b === 0x20 || b === 0x09 || b === 0x0a || b === 0x0d || b === 0x23) {
        break;
      }
      offset++;
    }
    return buf.subarray(start, offset).toString('ascii');
  };

  const magic = readToken();
  if (magic !== 'P5') {
    throw new Error(`Unexpected PGM magic "${magic}" on page ${pageNumber}`);
  }
  const width = Number(readToken());
  const height = Number(readToken());
  const maxval = Number(readToken());
  if (!Number.isFinite(width) || !Number.isFinite(height) || maxval !== 255) {
    throw new Error(
      `Invalid PGM header on page ${pageNumber}: ${width}x${height} maxval=${maxval}`,
    );
  }
  offset++;

  const pixelCount = width * height;
  const pixels = buf.subarray(offset, offset + pixelCount);
  let darkPixelCount = 0;
  let nonWhitePixelCount = 0;
  for (let i = 0; i < pixels.length; i++) {
    const val = pixels[i]!;
    if (val < 250) {
      nonWhitePixelCount++;
    }
    if (val < 180) {
      darkPixelCount++;
    }
  }

  const borderPx = 6;
  let borderTotal = 0;
  let borderWhite = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (
        x < borderPx ||
        x >= width - borderPx ||
        y < borderPx ||
        y >= height - borderPx
      ) {
        borderTotal++;
        if (pixels[y * width + x]! >= 250) {
          borderWhite++;
        }
      }
    }
  }

  return {
    pageNumber,
    width,
    height,
    darkPixelCount,
    nonWhitePixelCount,
    edgeMarginCleanRatio: borderTotal > 0 ? borderWhite / borderTotal : 1,
  };
}

interface PdfInspectionResult {
  pageCount: number;
  fullText: string;
  pageTexts: string[];
  pgmPages: PgmPageAnalysis[];
}

function inspectGeneratedPdf(
  workDir: string,
  caseSlug: string,
  pdfBytes: Buffer,
): PdfInspectionResult {
  expect(pdfBytes.subarray(0, 4).toString('ascii')).toBe('%PDF');
  expect(pdfBytes.byteLength).toBeGreaterThan(5000);

  const pdfPath = join(workDir, `${caseSlug}.pdf`);
  writeFileSync(pdfPath, pdfBytes);

  const infoOut = execFileSync(PDFINFO_BINARY, [pdfPath], { encoding: 'utf8' });
  const pagesMatch = infoOut.match(/^Pages:\s+(\d+)/m);
  if (!pagesMatch?.[1]) {
    throw new Error(`Failed to parse Pages from pdfinfo output:\n${infoOut}`);
  }
  const pageCount = Number(pagesMatch[1]);

  const fullText = execFileSync(PDFTOTEXT_BINARY, [pdfPath, '-'], {
    encoding: 'utf8',
  });

  const pageTexts: string[] = [];
  for (let p = 1; p <= pageCount; p++) {
    const pageText = execFileSync(
      PDFTOTEXT_BINARY,
      ['-f', String(p), '-l', String(p), pdfPath, '-'],
      { encoding: 'utf8' },
    );
    pageTexts.push(pageText);
  }

  const ppmPrefix = join(workDir, `${caseSlug}-page`);
  execFileSync(PDFTOPPM_BINARY, ['-gray', '-r', '72', pdfPath, ppmPrefix]);

  const pgmFiles = readdirSync(workDir)
    .filter((f) => f.startsWith(`${caseSlug}-page-`) && f.endsWith('.pgm'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  expect(pgmFiles.length).toBe(pageCount);

  const pgmPages = pgmFiles.map((fileName, idx) => {
    const buf = readFileSync(join(workDir, fileName));
    return analyzePgmRaster(buf, idx + 1);
  });

  return {
    pageCount,
    fullText,
    pageTexts,
    pgmPages,
  };
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) {
    return 0;
  }
  let count = 0;
  let pos = 0;
  while (true) {
    const idx = haystack.indexOf(needle, pos);
    if (idx === -1) {
      break;
    }
    count++;
    pos = idx + needle.length;
  }
  return count;
}

class CdpSession {
  private ws: WebSocket;
  private nextId = 1;
  private pending = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (reason: Error) => void }
  >();

  private constructor(ws: WebSocket) {
    this.ws = ws;
    this.ws.addEventListener('message', (event) => {
      const data = JSON.parse(String(event.data)) as {
        id?: number;
        result?: unknown;
        error?: { message?: string };
      };
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
      }
    });
  }

  static async connect(wsUrl: string): Promise<CdpSession> {
    const ws = new WebSocket(wsUrl);
    await new Promise<void>((resolve, reject) => {
      ws.addEventListener('open', () => resolve(), { once: true });
      ws.addEventListener(
        'error',
        (err) => reject(new Error(`WebSocket error: ${String(err)}`)),
        { once: true },
      );
    });
    return new CdpSession(ws);
  }

  async send<T = Record<string, unknown>>(
    method: string,
    params: Record<string, unknown> = {},
  ): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate<T>(expression: string): Promise<T> {
    const res = await this.send<{
      result: { value?: T; description?: string };
      exceptionDetails?: { text?: string; exception?: { description?: string } };
    }>('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(
        res.exceptionDetails.exception?.description ??
          res.exceptionDetails.text ??
          'Runtime.evaluate exception',
      );
    }
    return res.result.value as T;
  }

  close(): void {
    try {
      this.ws.close();
    } catch {
      // ignore close errors
    }
  }
}

const STANDALONE_FIXTURE_HTML = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Class Cue Sheet Standalone Fixture</title>
    <style>
      html, body, #cue-sheet-mount {
        margin: 0;
        padding: 0;
        width: 100%;
        max-width: 100%;
      }
    </style>
  </head>
  <body>
    <div id="cue-sheet-mount"></div>
    <script type="module">
      import React from 'react';
      import { flushSync } from 'react-dom';
      import { createRoot } from 'react-dom/client';
      import { ClassCueSheetPreview } from '/src/features/classCueSheet/ClassCueSheetPreview.tsx';

      const mount = document.getElementById('cue-sheet-mount');
      const root = createRoot(mount);
      window.__renderCueSheetProps = async (props) => {
        flushSync(() => {
          root.render(React.createElement(ClassCueSheetPreview, props));
        });
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      };
      root.render(React.createElement(ClassCueSheetPreview, { showFixtureSwitcher: true }));
    </script>
  </body>
</html>`;

describe('ClassCueSheetPreview real Chromium 320px / 390px and multi-page @media print PDF verification', () => {
  let viteServer: ViteDevServer | null = null;
  let baseUrl = '';
  let chromeProcess: ChildProcess | null = null;
  let userDataDir = '';
  let cdp: CdpSession | null = null;

  beforeAll(async () => {
    assertLocalPopplerAndChromiumBinaries();

    viteServer = await createServer({
      root: process.cwd(),
      logLevel: 'silent',
      server: {
        host: '127.0.0.1',
        port: 0,
      },
      plugins: [
        {
          name: 'class-cue-sheet-standalone-fixture',
          configureServer(server) {
            server.middlewares.use('/__cue-sheet-fixture', async (req, res, next) => {
              if (!req.url || (req.url !== '/' && !req.url.startsWith('/?'))) {
                next();
                return;
              }
              try {
                const transformed = await server.transformIndexHtml(
                  '/index.html',
                  STANDALONE_FIXTURE_HTML,
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
    if (!address || typeof address === 'string') {
      throw new Error('Failed to bind local Vite dev server for Chromium fixture test.');
    }
    baseUrl = `http://127.0.0.1:${address.port}/__cue-sheet-fixture`;

    userDataDir = mkdtempSync(join(tmpdir(), 'cue-sheet-chromium-'));

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

    const browserWsUrl = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timed out waiting for Chromium DevTools WebSocket URL.'));
      }, 10000);

      let stderrLog = '';
      chromeProcess?.stderr?.on('data', (chunk: Buffer) => {
        stderrLog += chunk.toString('utf8');
        const match = stderrLog.match(/DevTools listening on (ws:\/\/127\.0\.0\.1:\d+\/[^\s]+)/);
        if (match?.[1]) {
          clearTimeout(timeout);
          resolve(match[1]);
        }
      });

      chromeProcess?.once('exit', (code) => {
        clearTimeout(timeout);
        reject(new Error(`Chromium exited prematurely with code ${code}: ${stderrLog}`));
      });
    });

    const devtoolsHost = new URL(browserWsUrl).origin.replace('ws://', 'http://');
    const targetsRes = await fetch(`${devtoolsHost}/json/list`);
    const targets = (await targetsRes.json()) as Array<{
      type: string;
      webSocketDebuggerUrl?: string;
    }>;
    const pageTarget = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
    if (!pageTarget?.webSocketDebuggerUrl) {
      throw new Error('No inspectable page target found in headless Chromium.');
    }

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
        if (root && typeof window.__renderCueSheetProps === 'function') {
          resolve(true);
          return;
        }
        if (Date.now() > deadline) {
          reject(new Error('Timed out waiting for [data-testid="class-cue-sheet-root"] to mount.'));
          return;
        }
        setTimeout(check, 50);
      };
      check();
    })`);
  }, 25000);

  afterAll(async () => {
    cdp?.close();
    if (chromeProcess && !chromeProcess.killed) {
      chromeProcess.kill('SIGKILL');
    }
    if (viteServer) {
      await viteServer.close();
    }
    if (userDataDir) {
      rmSync(userDataDir, { recursive: true, force: true });
    }
  });

  it(
    'renders all 7 synthetic fixtures at 320px and 390px with zero horizontal overflow and retains focus + selection across live class edits and boundary navigation in real Chromium',
    async () => {
      expect(cdp).not.toBeNull();
      const session = cdp!;

      const fixtureIds = [
        'standard-mixed',
        'empty-class',
        'name-only-drafts',
        'long-korean-cues-empty-cues-duplicates',
        'nested-repeats-unilateral-unspecified-time',
        'hundred-items-bounded',
        'corrupted-circular-sensitive-html',
      ] as const;

      for (const width of [320, 390] as const) {
        await session.send('Emulation.setEmulatedMedia', { media: 'screen' });
        await session.send('Emulation.setDeviceMetricsOverride', {
          width,
          height: 844,
          deviceScaleFactor: 1,
          mobile: true,
        });

        await session.evaluate(
          `window.__renderCueSheetProps({ key: 'fixture-switcher-${width}', showFixtureSwitcher: true, initialViewMode: 'compact' })`,
        );

        for (const fixtureId of fixtureIds) {
          const metrics = await session.evaluate<{
            fixtureId: string;
            innerWidth: number;
            docScrollWidth: number;
            rootScrollWidth: number;
            maxChildRight: number;
            scrollX: number;
            localStorageLen: number;
            sessionStorageLen: number;
            injectedScriptCount: number;
          }>(`(async () => {
            const btn = document.querySelector('button[data-fixture-id="${fixtureId}"]');
            if (!btn) throw new Error('Missing fixture button: ${fixtureId}');
            btn.click();
            await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

            const compactBtn = Array.from(document.querySelectorAll('.cue-sheet-view-buttons button'))
              .find((b) => b.textContent && b.textContent.includes('기본 진행표'));
            if (compactBtn) compactBtn.click();
            await new Promise((r) => requestAnimationFrame(r));

            const root = document.querySelector('[data-testid="class-cue-sheet-root"]');
            const children = Array.from(root.querySelectorAll('.cue-sheet-summary-card, .cue-sheet-focus-deck, .cue-sheet-focus-card, .cue-sheet-item, .cue-sheet-truncation-banner'));
            const maxChildRight = children.reduce((max, el) => Math.max(max, Math.round(el.getBoundingClientRect().right)), 0);

            return {
              fixtureId: '${fixtureId}',
              innerWidth: window.innerWidth,
              docScrollWidth: document.documentElement.scrollWidth,
              rootScrollWidth: root.scrollWidth,
              maxChildRight,
              scrollX: window.scrollX,
              localStorageLen: window.localStorage.length,
              sessionStorageLen: window.sessionStorage.length,
              injectedScriptCount: root.querySelectorAll('script').length,
            };
          })()`);

          expect(metrics.innerWidth).toBe(width);
          expect(metrics.docScrollWidth).toBeLessThanOrEqual(width);
          expect(metrics.rootScrollWidth).toBeLessThanOrEqual(width);
          expect(metrics.maxChildRight).toBeLessThanOrEqual(width);
          expect(metrics.scrollX).toBe(0);
          expect(metrics.localStorageLen).toBe(0);
          expect(metrics.sessionStorageLen).toBe(0);
          expect(metrics.injectedScriptCount).toBe(0);
        }

        // Verify expanded view at 320px and 390px on the 100-item bounded fixture
        const expandedMetrics = await session.evaluate<{
          docScrollWidth: number;
          rootScrollWidth: number;
          scrollX: number;
          expandedRowCount: number;
          hasTruncationBanner: boolean;
          hasOmittedFooter: boolean;
        }>(`(async () => {
          const btn = document.querySelector('button[data-fixture-id="hundred-items-bounded"]');
          btn.click();
          await new Promise((r) => requestAnimationFrame(r));
          const expandedBtn = Array.from(document.querySelectorAll('.cue-sheet-view-buttons button'))
            .find((b) => b.textContent && b.textContent.includes('반복·좌우 펼침 진행표'));
          expandedBtn.click();
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          const root = document.querySelector('[data-testid="class-cue-sheet-root"]');
          return {
            docScrollWidth: document.documentElement.scrollWidth,
            rootScrollWidth: root.scrollWidth,
            scrollX: window.scrollX,
            expandedRowCount: document.querySelectorAll('.cue-sheet-expanded-row').length,
            hasTruncationBanner: Boolean(document.querySelector('[data-testid="cue-sheet-truncation-banner"]')),
            hasOmittedFooter: Boolean(document.querySelector('[data-testid="expanded-omitted-footer"]')),
          };
        })()`);

        expect(expandedMetrics.docScrollWidth).toBeLessThanOrEqual(width);
        expect(expandedMetrics.rootScrollWidth).toBeLessThanOrEqual(width);
        expect(expandedMetrics.scrollX).toBe(0);
        expect(expandedMetrics.expandedRowCount).toBe(240);
        expect(expandedMetrics.hasTruncationBanner).toBe(true);
        expect(expandedMetrics.hasOmittedFooter).toBe(true);

        // Verify live-edit re-renders on mounted ClassCueSheetPreview + keyboard/button navigation to boundaries (0 and last)
        const liveEditChecks = await session.evaluate<
          Array<{
            phase: string;
            currentIndex: number;
            currentTitle: string;
            resolution: string;
            hasA11yStatus: boolean;
            hasFallbackNotice: boolean;
            activeTag: string;
            activeInsideRoot: boolean;
            activeNotBody: boolean;
            activeLeft: number;
            activeRight: number;
            docScrollWidth: number;
            rootScrollWidth: number;
            scrollX: number;
          }>
        >(`(async () => {
          const results = [];
          const liveKey = 'live-edit-mounted-${width}';
          const snap = (phase) => {
            const root = document.querySelector('[data-testid="class-cue-sheet-root"]');
            const active = document.activeElement;
            const rect = active ? active.getBoundingClientRect() : { left: 0, right: 0 };
            const currentHeading = root.querySelector('.cue-sheet-focus-card.is-current .cue-sheet-title');
            results.push({
              phase,
              currentIndex: Number(root.getAttribute('data-current-step-index') ?? '-1'),
              currentTitle: currentHeading ? currentHeading.textContent.trim() : '',
              resolution: root.getAttribute('data-selection-resolution') ?? '',
              hasA11yStatus: Boolean(root.querySelector('[data-testid="cue-sheet-a11y-status"]')),
              hasFallbackNotice: Boolean(root.querySelector('[data-testid="cue-sheet-selection-fallback-notice"]')),
              activeTag: active ? active.tagName : 'NONE',
              activeInsideRoot: Boolean(active && root.contains(active)),
              activeNotBody: Boolean(active && active !== document.body),
              activeLeft: Math.floor(rect.left),
              activeRight: Math.ceil(rect.right),
              docScrollWidth: document.documentElement.scrollWidth,
              rootScrollWidth: root.scrollWidth,
              scrollX: window.scrollX,
            });
          };

          const stepA = { stepId: 'live-step-a', nameKo: '첫 번째 웜업 브리딩', durationMin: 4 };
          const stepB = { stepId: 'live-step-b', nameKo: '두 번째 풋워크 패럴렐', durationMin: 6 };
          const stepC = { stepId: 'live-step-c', nameKo: '세 번째 헌드레드 코어', durationMin: 5 };
          const stepD = { stepId: 'live-step-d', nameKo: '네 번째 머메이드 스트레치', durationMin: 4 };

          await window.__renderCueSheetProps({
            key: liveKey,
            showFixtureSwitcher: false,
            initialViewMode: 'compact',
            sourceInput: {
              id: 'live-class-1',
              title: '실시간 편집 검증 수업',
              steps: [stepA, stepB, stepC, stepD],
            },
          });

          // Select stepC (index 2) via item select button
          const itemButtons = document.querySelectorAll('.cue-sheet-item-select-btn');
          itemButtons[2].focus();
          itemButtons[2].click();
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          snap('select-stepC');

          // 1) Insert before current
          const stepInserted = { stepId: 'live-step-pre', nameKo: '사전 추가 흉곽 호흡', durationMin: 3 };
          await window.__renderCueSheetProps({
            key: liveKey,
            showFixtureSwitcher: false,
            initialViewMode: 'compact',
            sourceInput: {
              id: 'live-class-1',
              title: '실시간 편집 검증 수업',
              steps: [stepInserted, stepA, stepB, stepC, stepD],
            },
          });
          snap('insert-before-current');

          // 2) Delete before current
          await window.__renderCueSheetProps({
            key: liveKey,
            showFixtureSwitcher: false,
            initialViewMode: 'compact',
            sourceInput: {
              id: 'live-class-1',
              title: '실시간 편집 검증 수업',
              steps: [stepB, stepC, stepD],
            },
          });
          snap('delete-before-current');

          // 3) Reorder (move stepC to last position)
          await window.__renderCueSheetProps({
            key: liveKey,
            showFixtureSwitcher: false,
            initialViewMode: 'compact',
            sourceInput: {
              id: 'live-class-1',
              title: '실시간 편집 검증 수업',
              steps: [stepB, stepD, stepC],
            },
          });
          snap('reorder-stepC-to-end');

          // 4) Same-name different-id inserted before stepC
          const stepCSameNameOtherId = {
            stepId: 'live-step-c-other',
            nameKo: '세 번째 헌드레드 코어',
            durationMin: 3,
          };
          await window.__renderCueSheetProps({
            key: liveKey,
            showFixtureSwitcher: false,
            initialViewMode: 'compact',
            sourceInput: {
              id: 'live-class-1',
              title: '실시간 편집 검증 수업',
              steps: [stepCSameNameOtherId, stepB, stepC, stepD],
            },
          });
          snap('same-name-different-id');

          // 5) Delete current item (remove stepC while selected -> adjacent fallback notice)
          await window.__renderCueSheetProps({
            key: liveKey,
            showFixtureSwitcher: false,
            initialViewMode: 'compact',
            sourceInput: {
              id: 'live-class-1',
              title: '실시간 편집 검증 수업',
              steps: [stepCSameNameOtherId, stepB, stepD],
            },
          });
          snap('delete-current-item');

          // 6) Empty <-> long class transition
          await window.__renderCueSheetProps({
            key: liveKey,
            showFixtureSwitcher: false,
            initialViewMode: 'compact',
            sourceInput: {
              id: 'live-class-1',
              title: '빈 상태 전환 테스트',
              steps: [],
            },
          });
          snap('to-empty-class');

          const longSteps = Array.from({ length: 12 }, (_, idx) => ({
            stepId: 'long-step-' + (idx + 1),
            nameKo: '장문 복귀 동작 #' + String(idx + 1).padStart(2, '0'),
            durationMin: 2,
          }));
          await window.__renderCueSheetProps({
            key: liveKey,
            showFixtureSwitcher: false,
            initialViewMode: 'compact',
            sourceInput: {
              id: 'live-class-1',
              title: '장문 복귀 테스트',
              steps: longSteps,
            },
          });
          snap('empty-to-long-class');

          // 7) Replace with different class
          await window.__renderCueSheetProps({
            key: liveKey,
            showFixtureSwitcher: false,
            initialViewMode: 'compact',
            sourceInput: {
              id: 'live-class-2-completely-different',
              title: '완전히 다른 신규 수업',
              steps: [
                { stepId: 'new-1', nameKo: '신규 수업 동작 1', durationMin: 5 },
                { stepId: 'new-2', nameKo: '신규 수업 동작 2', durationMin: 5 },
                { stepId: 'new-3', nameKo: '신규 수업 동작 3', durationMin: 5 },
              ],
            },
          });
          snap('replace-different-class');

          // 8) Button navigation to last and first boundaries (disabling buttons must not lose focus to body)
          const nextBtn = document.querySelector('[data-testid="cue-sheet-nav-next"]');
          nextBtn.focus();
          nextBtn.click();
          await new Promise((r) => requestAnimationFrame(r));
          nextBtn.click();
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          snap('button-nav-to-last-boundary');

          const firstBtn = document.querySelector('[data-testid="cue-sheet-nav-first"]');
          firstBtn.focus();
          firstBtn.click();
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          snap('button-nav-to-first-boundary');

          // 9) Keyboard navigation on focus deck to End and Home boundaries
          const deck = document.querySelector('[data-testid="cue-sheet-focus-deck"]');
          deck.focus();
          deck.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
          await new Promise((r) => requestAnimationFrame(r));
          snap('keyboard-nav-end');

          deck.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
          await new Promise((r) => requestAnimationFrame(r));
          snap('keyboard-nav-home');

          return results;
        })()`);

        const byPhase = Object.fromEntries(liveEditChecks.map((c) => [c.phase, c]));
        expect(byPhase['select-stepC']?.currentIndex).toBe(2);
        expect(byPhase['insert-before-current']?.currentIndex).toBe(3);
        expect(byPhase['insert-before-current']?.currentTitle).toBe('세 번째 헌드레드 코어');
        expect(byPhase['delete-before-current']?.currentIndex).toBe(1);
        expect(byPhase['delete-before-current']?.currentTitle).toBe('세 번째 헌드레드 코어');
        expect(byPhase['reorder-stepC-to-end']?.currentIndex).toBe(2);
        expect(byPhase['reorder-stepC-to-end']?.currentTitle).toBe('세 번째 헌드레드 코어');
        expect(byPhase['same-name-different-id']?.currentIndex).toBe(2);
        expect(byPhase['same-name-different-id']?.currentTitle).toBe('세 번째 헌드레드 코어');
        expect(byPhase['delete-current-item']?.hasFallbackNotice).toBe(true);
        expect(byPhase['to-empty-class']?.currentIndex).toBe(-1);
        expect(byPhase['empty-to-long-class']?.currentIndex).toBe(0);
        expect(byPhase['replace-different-class']?.currentIndex).toBe(0);
        expect(byPhase['replace-different-class']?.currentTitle).toBe('신규 수업 동작 1');
        expect(byPhase['button-nav-to-last-boundary']?.currentIndex).toBe(2);
        expect(byPhase['button-nav-to-first-boundary']?.currentIndex).toBe(0);
        expect(byPhase['keyboard-nav-end']?.currentIndex).toBe(2);
        expect(byPhase['keyboard-nav-home']?.currentIndex).toBe(0);

        for (const entry of liveEditChecks) {
          expect(entry.hasA11yStatus, `phase=${entry.phase}`).toBe(true);
          expect(entry.activeInsideRoot, `phase=${entry.phase} activeTag=${entry.activeTag}`).toBe(true);
          expect(entry.activeNotBody, `phase=${entry.phase} activeTag=${entry.activeTag}`).toBe(true);
          expect(entry.activeLeft, `phase=${entry.phase}`).toBeGreaterThanOrEqual(0);
          expect(entry.activeRight, `phase=${entry.phase}`).toBeLessThanOrEqual(width);
          expect(entry.docScrollWidth, `phase=${entry.phase}`).toBeLessThanOrEqual(width);
          expect(entry.rootScrollWidth, `phase=${entry.phase}`).toBeLessThanOrEqual(width);
          expect(entry.scrollX, `phase=${entry.phase}`).toBe(0);
        }
      }
    },
    30000,
  );

  it(
    'verifies @media print multi-page pagination, real PDF content preservation, and per-page PGM raster ink across A4 and US Letter in real Chromium',
    async () => {
      expect(cdp).not.toBeNull();
      const session = cdp!;

      await session.send('Emulation.setDeviceMetricsOverride', {
        width: 794,
        height: 1123,
        deviceScaleFactor: 1,
        mobile: false,
      });

      await session.evaluate(
        `window.__renderCueSheetProps({
          key: 'print-computed-check',
          showFixtureSwitcher: true,
          initialFixtureId: 'long-korean-cues-empty-cues-duplicates',
          initialViewMode: 'compact',
        })`,
      );

      // Activate @media print emulation in Chromium
      await session.send('Emulation.setEmulatedMedia', { media: 'print' });

      const printComputed = await session.evaluate<{
        noPrintDisplays: string[];
        rootColor: string;
        rootBg: string;
        rootDisplay: string;
        progressionDisplay: string;
        itemListDisplay: string;
        itemDisplay: string;
        itemBreakInside: string;
        headerBreakInside: string;
        headerBreakAfter: string;
        summaryBreakInside: string;
        longCueOverflow: string;
        longCueMaxHeight: string;
        longCueWhiteSpace: string;
        longCueBreakInside: string;
        itemCountVisible: number;
      }>(`(() => {
        const root = document.querySelector('[data-testid="class-cue-sheet-root"]');
        const rootStyle = window.getComputedStyle(root);
        const noPrintEls = Array.from(root.querySelectorAll('.cue-sheet-no-print'));
        const progression = root.querySelector('.cue-sheet-progression-section');
        const itemList = root.querySelector('.cue-sheet-item-list');
        const firstItem = root.querySelector('.cue-sheet-item');
        const firstHeader = root.querySelector('.cue-sheet-item-header');
        const summaryCard = root.querySelector('.cue-sheet-summary-card');
        const longNote = root.querySelector('.cue-sheet-long-note');
        const items = Array.from(root.querySelectorAll('.cue-sheet-item'));

        return {
          noPrintDisplays: noPrintEls.map((el) => window.getComputedStyle(el).display),
          rootColor: rootStyle.color,
          rootBg: rootStyle.backgroundColor,
          rootDisplay: rootStyle.display,
          progressionDisplay: window.getComputedStyle(progression).display,
          itemListDisplay: window.getComputedStyle(itemList).display,
          itemDisplay: window.getComputedStyle(firstItem).display,
          itemBreakInside: window.getComputedStyle(firstItem).breakInside,
          headerBreakInside: window.getComputedStyle(firstHeader).breakInside,
          headerBreakAfter: window.getComputedStyle(firstHeader).breakAfter,
          summaryBreakInside: window.getComputedStyle(summaryCard).breakInside,
          longCueOverflow: window.getComputedStyle(longNote).overflow,
          longCueMaxHeight: window.getComputedStyle(longNote).maxHeight,
          longCueWhiteSpace: window.getComputedStyle(longNote).whiteSpace,
          longCueBreakInside: window.getComputedStyle(longNote).breakInside,
          itemCountVisible: items.filter((el) => window.getComputedStyle(el).display !== 'none').length,
        };
      })()`);

      expect(printComputed.noPrintDisplays.length).toBeGreaterThan(0);
      expect(printComputed.noPrintDisplays.every((d) => d === 'none')).toBe(true);
      expect(printComputed.rootColor).toBe('rgb(0, 0, 0)');
      expect(printComputed.rootBg).toBe('rgb(255, 255, 255)');
      expect(printComputed.rootDisplay).toBe('block');
      expect(printComputed.progressionDisplay).toBe('block');
      expect(printComputed.itemListDisplay).toBe('block');
      expect(printComputed.itemDisplay).toBe('block');
      expect(printComputed.itemBreakInside).toBe('auto');
      expect(printComputed.headerBreakInside).toBe('avoid');
      expect(printComputed.headerBreakAfter).toBe('avoid');
      expect(printComputed.summaryBreakInside).toBe('avoid');
      expect(printComputed.longCueOverflow).toBe('visible');
      expect(printComputed.longCueMaxHeight).toBe('none');
      expect(printComputed.longCueWhiteSpace).toBe('pre-wrap');
      expect(printComputed.longCueBreakInside).toBe('auto');
      expect(printComputed.itemCountVisible).toBe(6);

      const paperSizes = [
        { name: 'a4', paperWidth: 8.27, paperHeight: 11.69 },
        { name: 'letter', paperWidth: 8.5, paperHeight: 11 },
      ] as const;

      const printPdfForCurrentDom = async (
        slug: string,
        paperWidth: number,
        paperHeight: number,
      ): Promise<PdfInspectionResult> => {
        const pdfResult = await session.send<{ data: string }>('Page.printToPDF', {
          printBackground: true,
          preferCSSPageSize: false,
          paperWidth,
          paperHeight,
          marginTop: 0.4,
          marginBottom: 0.4,
          marginLeft: 0.4,
          marginRight: 0.4,
        });
        const pdfBytes = Buffer.from(pdfResult.data, 'base64');
        const inspection = inspectGeneratedPdf(userDataDir, slug, pdfBytes);

        // Every page 1..N must be non-blank (both extracted text and dark PGM ink pixels) with clean white margins
        expect(inspection.pageCount, `slug=${slug}`).toBeGreaterThan(1);
        for (let p = 0; p < inspection.pageCount; p++) {
          expect(
            inspection.pageTexts[p]!.trim().length,
            `slug=${slug} page=${p + 1}/${inspection.pageCount} dark=${inspection.pgmPages[p]!.darkPixelCount} allLengths=${JSON.stringify(inspection.pageTexts.map((t) => t.trim().length))}`,
          ).toBeGreaterThan(10);
          expect(inspection.pgmPages[p]!.darkPixelCount, `slug=${slug} page=${p + 1}`).toBeGreaterThan(150);
          expect(inspection.pgmPages[p]!.edgeMarginCleanRatio, `slug=${slug} page=${p + 1}`).toBeGreaterThan(0.99);
        }
        return inspection;
      };

      // Case A1: long-korean-cues-empty-cues-duplicates (compact view)
      await session.evaluate(
        `window.__renderCueSheetProps({
          key: 'pdf-case-a1',
          showFixtureSwitcher: false,
          initialFixtureId: 'long-korean-cues-empty-cues-duplicates',
          initialViewMode: 'compact',
        })`,
      );
      for (const paper of paperSizes) {
        const res = await printPdfForCurrentDom(
          `long-korean-cues-${paper.name}`,
          paper.paperWidth,
          paper.paperHeight,
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
          '무큐잉 자유 스트레칭 동작',
          '사이드 킥 시리즈',
        ]) {
          expect(res.fullText).toContain(marker);
        }
        // Items #03, #05, #06 appear only in the progression list -> exactly 1 occurrence each
        for (const nonDeckMarker of [
          '[장문큐-시작-03]',
          '[장문큐-끝-03]',
          '[장문큐-시작-05]',
          '[장문큐-끝-05]',
          '[장문큐-시작-06]',
          '[장문큐-끝-06]',
        ]) {
          expect(countOccurrences(res.fullText, nonDeckMarker)).toBe(1);
        }
      }

      // Case A2: Multi-page single-item long-paragraph stress input (35 long Korean cue lines [장문단락-01]..[장문단락-35] spanning across page 1 and page 2)
      await session.evaluate(`(async () => {
        const longCueLines = Array.from({ length: 35 }, (_, idx) => {
          const tag = '[장문단락-' + String(idx + 1).padStart(2, '0') + ']';
          return tag + ' 리포머 캐리지 위에서 양쪽 좌골의 균등한 지지와 흉곽 하부 호흡을 연결하며 척추 분절 정렬을 끝까지 유지합니다.';
        });
        await window.__renderCueSheetProps({
          key: 'pdf-case-a2',
          showFixtureSwitcher: false,
          initialStepIndex: 0,
          initialViewMode: 'compact',
          sourceInput: {
            id: 'single-item-35-lines-stress',
            title: '단일 동작 35개 장문 단락 페이지 분할 스트레스 검증',
            apparatus: 'reformer',
            level: '1.5',
            targetMinutes: 30,
            steps: [
              {
                stepId: 'stress-warmup-1',
                order: 1,
                nameKo: '오프닝 호흡 정렬 준비',
                durationMin: 3,
                cues: ['코로 들이마시고 입으로 내쉬며 흉곽을 닫습니다.'],
              },
              {
                stepId: 'stress-long-35-step',
                order: 2,
                nameKo: '초장문 35단락 연속 큐잉 동작',
                durationMin: 15,
                cues: [
                  '초장문 단일 동작 연속 큐잉 시작 안내 문구입니다.',
                  ...longCueLines,
                ],
              },
            ],
          },
        });
      })()`);

      for (const paper of paperSizes) {
        const res = await printPdfForCurrentDom(
          `single-item-35-lines-${paper.name}`,
          paper.paperWidth,
          paper.paperHeight,
        );
        for (let i = 1; i <= 35; i++) {
          const marker = `[장문단락-${String(i).padStart(2, '0')}]`;
          expect(countOccurrences(res.fullText, marker)).toBe(1);
        }
        // Prove the single 35-line item starts on page 1 and continues onto page 2+
        expect(res.pageTexts[0]).toContain('[장문단락-01]');
        expect(res.pageTexts[res.pageCount - 1]).toContain('[장문단락-35]');
      }

      // Case B: nested-repeats-unilateral-unspecified-time (expanded view)
      const nestedExpandedCount = await session.evaluate<number>(`(async () => {
        await window.__renderCueSheetProps({
          key: 'pdf-case-b',
          showFixtureSwitcher: false,
          initialFixtureId: 'nested-repeats-unilateral-unspecified-time',
          initialViewMode: 'expanded',
        });
        return document.querySelectorAll('.cue-sheet-expanded-row').length;
      })()`);
      expect(nestedExpandedCount).toBeGreaterThan(20);
      for (const paper of paperSizes) {
        const res = await printPdfForCurrentDom(
          `nested-repeats-expanded-${paper.name}`,
          paper.paperWidth,
          paper.paperHeight,
        );
        expect(res.fullText).toContain('진행표 상한 적용 및 생략 안내');
        for (let rowIdx = 1; rowIdx <= nestedExpandedCount; rowIdx++) {
          const rowMarker = `펼침 #${String(rowIdx).padStart(2, '0')} (`;
          expect(
            countOccurrences(res.fullText, rowMarker),
            `nested rowIdx=${rowIdx}/${nestedExpandedCount} paper=${paper.name}`,
          ).toBe(1);
        }
        expect(res.pageTexts[0]).toContain('중첩 블록 반복 · 좌우 편측 · 시간 미정 보존 시퀀스');
        expect(res.pageTexts.slice(0, 2).join('\n')).toContain('펼침 #01 (');
        expect(res.pageTexts[res.pageCount - 1]).toContain(
          `펼침 #${String(nestedExpandedCount).padStart(2, '0')} (`,
        );
      }

      // Case C1: hundred-items-bounded in compact view (150 items #01..#150)
      await session.evaluate(
        `window.__renderCueSheetProps({
          key: 'pdf-case-c1',
          showFixtureSwitcher: false,
          initialFixtureId: 'hundred-items-bounded',
          initialViewMode: 'compact',
        })`,
      );
      for (const paper of paperSizes) {
        const res = await printPdfForCurrentDom(
          `hundred-items-compact-${paper.name}`,
          paper.paperWidth,
          paper.paperHeight,
        );
        expect(res.pageCount).toBeGreaterThanOrEqual(8);
        expect(res.fullText).toContain('진행표 상한 적용 및 생략 안내');
        expect(res.fullText).toContain('생략된 입력 항목: 10개');
        for (let num = 1; num <= 150; num++) {
          const itemTitle = `대규모 내구성 검증 동작 #${String(num).padStart(3, '0')}`;
          const itemCue = `${num}번 동작 호흡과 척추 중립 정렬을 유지하며 일정한 템포로 수행합니다.`;
          expect(res.fullText).toContain(itemTitle);
          expect(res.fullText).toContain(itemCue);
          // Items 3..150 are not in the 2-card focus deck, so their zero-padded title appears exactly once
          if (num >= 3) {
            expect(countOccurrences(res.fullText, itemTitle)).toBe(1);
          }
        }
        expect(res.fullText).not.toContain('대규모 내구성 검증 동작 #151');
        expect(res.pageTexts[0]).toContain('대규모 내구성 검증 동작 #001');
        expect(res.pageTexts[res.pageCount - 1]).toContain('대규모 내구성 검증 동작 #150');
      }

      // Case C2: hundred-items-bounded in expanded view (240 rows 펼침 #01..펼침 #240 + truncation banner + omitted footer)
      await session.evaluate(
        `window.__renderCueSheetProps({
          key: 'pdf-case-c2',
          showFixtureSwitcher: false,
          initialFixtureId: 'hundred-items-bounded',
          initialViewMode: 'expanded',
        })`,
      );
      for (const paper of paperSizes) {
        const res = await printPdfForCurrentDom(
          `hundred-items-expanded-${paper.name}`,
          paper.paperWidth,
          paper.paperHeight,
        );
        expect(res.pageCount).toBeGreaterThanOrEqual(10);
        expect(res.fullText).toContain('진행표 상한 적용 및 생략 안내');
        expect(res.fullText).toContain(
          '펼침 행 상한(240행) 초과로 210개 펼침 행이 생략되었습니다. (임의 숨김 없음)',
        );
        for (let rowNum = 1; rowNum <= 240; rowNum++) {
          const rowLabel = `펼침 #${String(rowNum).padStart(2, '0')} (`;
          expect(countOccurrences(res.fullText, rowLabel)).toBe(1);
        }
        expect(res.fullText).not.toContain('펼침 #241');
        expect(res.pageTexts[0]).toContain('대규모 내구성 검증 동작 #001');
        expect(res.pageTexts.slice(0, 2).join('\n')).toContain('펼침 #01 (');
        expect(res.pageTexts[res.pageCount - 1]).toContain('펼침 #240 (');
        expect(res.pageTexts[res.pageCount - 1]).toContain('펼침 행 상한(240행) 초과로');
      }
    },
    60000,
  );
});
