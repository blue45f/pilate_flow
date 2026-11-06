// @vitest-environment node
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer, type ViteDevServer } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

if (typeof globalThis.window === 'undefined') {
  (globalThis as Record<string, unknown>).window = globalThis;
}

const CHROMIUM_CANDIDATES = [
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
];

function findChromiumBinary(): string {
  for (const candidate of CHROMIUM_CANDIDATES) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  throw new Error('No Chromium binary found at /usr/bin/chromium or /usr/bin/google-chrome.');
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
      ws.addEventListener('error', (err) => reject(new Error(`WebSocket error: ${String(err)}`)), {
        once: true,
      });
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
      import { createRoot } from 'react-dom/client';
      import { ClassCueSheetPreview } from '/src/features/classCueSheet/ClassCueSheetPreview.tsx';

      const mount = document.getElementById('cue-sheet-mount');
      const root = createRoot(mount);
      root.render(React.createElement(ClassCueSheetPreview, { showFixtureSwitcher: true }));
    </script>
  </body>
</html>`;

describe('ClassCueSheetPreview real Chromium 320px / 390px and @media print verification', () => {
  let viteServer: ViteDevServer | null = null;
  let baseUrl = '';
  let chromeProcess: ChildProcess | null = null;
  let userDataDir = '';
  let cdp: CdpSession | null = null;

  beforeAll(async () => {
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
    const chromiumBin = findChromiumBinary();

    chromeProcess = spawn(
      chromiumBin,
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
    await cdp.send('Page.navigate', { url: baseUrl });

    await cdp.evaluate(`new Promise((resolve, reject) => {
      const deadline = Date.now() + 10000;
      const check = () => {
        const root = document.querySelector('[data-testid="class-cue-sheet-root"]');
        if (root) {
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

  it('renders all 7 synthetic fixtures at 320px and 390px in real Chromium with zero horizontal overflow', async () => {
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

      for (const fixtureId of fixtureIds) {
        const metrics = await session.evaluate<{
          fixtureId: string;
          innerWidth: number;
          docScrollWidth: number;
          rootScrollWidth: number;
          maxChildRight: number;
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
          const children = Array.from(root.querySelectorAll('.cue-sheet-summary-card, .cue-sheet-focus-card, .cue-sheet-item, .cue-sheet-truncation-banner'));
          const maxChildRight = children.reduce((max, el) => Math.max(max, Math.round(el.getBoundingClientRect().right)), 0);

          return {
            fixtureId: '${fixtureId}',
            innerWidth: window.innerWidth,
            docScrollWidth: document.documentElement.scrollWidth,
            rootScrollWidth: root.scrollWidth,
            maxChildRight,
            localStorageLen: window.localStorage.length,
            sessionStorageLen: window.sessionStorage.length,
            injectedScriptCount: root.querySelectorAll('script').length,
          };
        })()`);

        expect(metrics.innerWidth).toBe(width);
        expect(metrics.docScrollWidth).toBeLessThanOrEqual(width);
        expect(metrics.rootScrollWidth).toBeLessThanOrEqual(width);
        expect(metrics.maxChildRight).toBeLessThanOrEqual(width);
        expect(metrics.localStorageLen).toBe(0);
        expect(metrics.sessionStorageLen).toBe(0);
        expect(metrics.injectedScriptCount).toBe(0);
      }

      // Also verify expanded view at 320px and 390px on the 100-item bounded fixture
      const expandedMetrics = await session.evaluate<{
        docScrollWidth: number;
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
        return {
          docScrollWidth: document.documentElement.scrollWidth,
          expandedRowCount: document.querySelectorAll('.cue-sheet-expanded-row').length,
          hasTruncationBanner: Boolean(document.querySelector('[data-testid="cue-sheet-truncation-banner"]')),
          hasOmittedFooter: Boolean(document.querySelector('[data-testid="expanded-omitted-footer"]')),
        };
      })()`);

      expect(expandedMetrics.docScrollWidth).toBeLessThanOrEqual(width);
      expect(expandedMetrics.expandedRowCount).toBeGreaterThan(0);
      expect(expandedMetrics.hasTruncationBanner).toBe(true);
      expect(expandedMetrics.hasOmittedFooter).toBe(true);
    }
  });

  it('verifies @media print monochrome readability, hidden interactive chrome, long-cue page break rules, and PDF generation in real Chromium', async () => {
    expect(cdp).not.toBeNull();
    const session = cdp!;

    await session.send('Emulation.setDeviceMetricsOverride', {
      width: 794,
      height: 1123,
      deviceScaleFactor: 1,
      mobile: false,
    });

    // Switch to long-korean-cues-empty-cues-duplicates in compact mode
    await session.evaluate(`(async () => {
      const btn = document.querySelector('button[data-fixture-id="long-korean-cues-empty-cues-duplicates"]');
      btn.click();
      const compactBtn = Array.from(document.querySelectorAll('.cue-sheet-view-buttons button'))
        .find((b) => b.textContent && b.textContent.includes('기본 진행표'));
      compactBtn.click();
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    })()`);

    // Activate @media print emulation in Chromium
    await session.send('Emulation.setEmulatedMedia', { media: 'print' });

    const printComputed = await session.evaluate<{
      noPrintDisplays: string[];
      rootColor: string;
      rootBg: string;
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
      const summaryCard = root.querySelector('.cue-sheet-summary-card');
      const summaryStyle = window.getComputedStyle(summaryCard);
      const longNote = root.querySelector('.cue-sheet-long-note');
      const longNoteStyle = window.getComputedStyle(longNote);
      const items = Array.from(root.querySelectorAll('.cue-sheet-item'));

      return {
        noPrintDisplays: noPrintEls.map((el) => window.getComputedStyle(el).display),
        rootColor: rootStyle.color,
        rootBg: rootStyle.backgroundColor,
        summaryBreakInside: summaryStyle.breakInside,
        longCueOverflow: longNoteStyle.overflow,
        longCueMaxHeight: longNoteStyle.maxHeight,
        longCueWhiteSpace: longNoteStyle.whiteSpace,
        longCueBreakInside: longNoteStyle.breakInside,
        itemCountVisible: items.filter((el) => window.getComputedStyle(el).display !== 'none').length,
      };
    })()`);

    expect(printComputed.noPrintDisplays.length).toBeGreaterThan(0);
    expect(printComputed.noPrintDisplays.every((d) => d === 'none')).toBe(true);
    expect(printComputed.rootColor).toBe('rgb(0, 0, 0)');
    expect(printComputed.rootBg).toBe('rgb(255, 255, 255)');
    expect(printComputed.summaryBreakInside).toBe('avoid');
    expect(printComputed.longCueOverflow).toBe('visible');
    expect(printComputed.longCueMaxHeight).toBe('none');
    expect(printComputed.longCueWhiteSpace).toBe('pre-wrap');
    expect(printComputed.longCueBreakInside).toBe('auto');
    expect(printComputed.itemCountVisible).toBeGreaterThanOrEqual(3);

    // Also verify real Chromium Page.printToPDF succeeds and produces a valid multi-kilobyte PDF
    const pdfResult = await session.send<{ data: string }>('Page.printToPDF', {
      printBackground: true,
      preferCSSPageSize: true,
    });
    const pdfBytes = Buffer.from(pdfResult.data, 'base64');
    expect(pdfBytes.subarray(0, 4).toString('ascii')).toBe('%PDF');
    expect(pdfBytes.byteLength).toBeGreaterThan(5000);
  });
});
