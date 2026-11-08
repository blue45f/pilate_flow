import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const screenshotDir = path.join(__dirname, 'screenshots');

const MOVEMENTS = ['spine-roll-up', 'spine-roll-down', 'spine-stretch'];
const PHASES = ['start', 'middle', 'end'];
const VIEWPORTS = [
  { name: '320', width: 320, height: 920, zoom: 1 },
  { name: '390', width: 390, height: 920, zoom: 1 },
  { name: '768', width: 768, height: 1024, zoom: 1 },
  { name: '1440', width: 1440, height: 1080, zoom: 1 },
  { name: '1440-zoom200', width: 1440, height: 1080, zoom: 2 },
];

class CdpSession {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(String(event.data));
      if (typeof msg.id === 'number') {
        const entry = this.pending.get(msg.id);
        if (entry) {
          this.pending.delete(msg.id);
          if (msg.error) {
            entry.reject(new Error(msg.error.message || 'CDP error'));
          } else {
            entry.resolve(msg.result || {});
          }
        }
      }
    });
  }

  static async connect(wsUrl) {
    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', () => resolve(), { once: true });
      ws.addEventListener('error', (err) => reject(err), { once: true });
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
      throw new Error(
        res.exceptionDetails.exception?.description ||
          res.exceptionDetails.text ||
          'Runtime.evaluate failed',
      );
    }
    return res.result?.value;
  }

  close() {
    try {
      this.ws.close();
    } catch {
      // ignore
    }
  }
}

const STANDALONE_FIXTURE_HTML = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>I1 Spine Articulation 2D Diagram Verification</title>
    <style>
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        padding: 0;
        background: #f3f6f4;
        color: #1a2e28;
        font-family: -apple-system, BlinkMacSystemFont, 'Noto Sans KR', sans-serif;
      }
      #spine-i1-mount {
        padding: 16px;
        max-width: 1320px;
        margin: 0 auto;
      }
    </style>
  </head>
  <body>
    <div id="spine-i1-mount"></div>
    <script type="module">
      import React from 'react';
      import { flushSync } from 'react-dom';
      import { createRoot } from 'react-dom/client';
      import {
        SpineArticulationDiagramReference,
        SpineI7IntegrationExample,
      } from '/src/components/SpineArticulationDiagramReference.tsx';

      const mount = document.getElementById('spine-i1-mount');
      const root = createRoot(mount);
      window.__renderSpineFixture = async ({ movementId, phase, zoom = 1 }) => {
        document.body.style.zoom = zoom > 1 ? String(zoom) : '1';
        flushSync(() => {
          root.render(
            React.createElement(
              'div',
              { style: { display: 'grid', gap: '16px' } },
              React.createElement(SpineArticulationDiagramReference, {
                key: movementId + '-' + phase,
                movementId,
                initialPhase: phase,
                allowArchetypeSwitch: true,
                showTriptych: true,
              }),
              React.createElement(SpineI7IntegrationExample, {
                exerciseId: movementId,
              }),
            ),
          );
        });
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      };
      window.__renderSpineFixture({ movementId: 'spine-roll-up', phase: 'middle', zoom: 1 });
    </script>
  </body>
</html>`;

async function main() {
  await fs.mkdir(screenshotDir, { recursive: true });
  const userDataDir = mkdtempSync(path.join(tmpdir(), 'spine-i1-chromium-'));
  let viteServer = null;
  let chromeProcess = null;
  let cdp = null;

  try {
    viteServer = await createServer({
      root: repoRoot,
      logLevel: 'silent',
      server: {
        host: '127.0.0.1',
        port: 0,
      },
      plugins: [
        {
          name: 'spine-i1-standalone-fixture',
          configureServer(server) {
            server.middlewares.use('/__spine-i1-fixture', async (req, res, next) => {
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
    const port = viteServer.httpServer.address().port;
    const fixtureUrl = `http://127.0.0.1:${port}/__spine-i1-fixture`;

    chromeProcess = spawn(
      '/usr/bin/chromium',
      [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--no-proxy-server',
        `--user-data-dir=${userDataDir}`,
        '--remote-debugging-port=0',
        'about:blank',
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );

    const browserWsUrl = await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Timed out waiting for Chromium DevTools WS URL')),
        10000,
      );
      let stderrLog = '';
      chromeProcess.stderr.on('data', (chunk) => {
        stderrLog += chunk.toString('utf8');
        const match = stderrLog.match(
          /DevTools listening on (ws:\/\/127\.0\.0\.1:\d+\/[^\s]+)/,
        );
        if (match?.[1]) {
          clearTimeout(timeout);
          resolve(match[1]);
        }
      });
    });

    const devtoolsOrigin = new URL(browserWsUrl).origin.replace('ws://', 'http://');
    const targets = await (await fetch(`${devtoolsOrigin}/json/list`)).json();
    const pageTarget = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);

    cdp = await CdpSession.connect(pageTarget.webSocketDebuggerUrl);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 1120,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await cdp.send('Page.navigate', { url: fixtureUrl });

    // Wait for __renderSpineFixture to be ready
    for (let i = 0; i < 40; i++) {
      const ready = await cdp.evaluate(
        'typeof window.__renderSpineFixture === "function" && Boolean(document.querySelector("[data-testid=\\"spine-articulation-diagram-reference\\"]"))',
      );
      if (ready) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    const results = {
      generatedAt: new Date().toISOString(),
      branch: 'gemini/diagram-i1-spine-20261108',
      movements: [],
      viewports: [],
      allPassed: true,
    };

    for (const movementId of MOVEMENTS) {
      for (const phase of PHASES) {
        const metrics = await cdp.evaluate(`(async () => {
          await window.__renderSpineFixture({ movementId: '${movementId}', phase: '${phase}', zoom: 1 });
          const svg = document.querySelector('[data-testid="spine-svg-${movementId}-${phase}"]');
          const legend = document.querySelector('[data-testid="spine-articulation-legend"]');
          const sources = document.querySelectorAll('[data-testid="spine-source-list"] a');
          const nonMedical = document.querySelector('[data-testid="spine-non-medical-notice"]');
          return {
            hasSvg: Boolean(svg),
            vertebraNodes: svg ? svg.querySelectorAll('[data-vertebra-id]').length : 0,
            jointAxes: svg ? svg.querySelectorAll('[data-axis-id]').length : 0,
            fixedAnchors: svg ? svg.querySelectorAll('[data-layer="fixed-anchors"] > g').length : 0,
            directionVectors: svg ? svg.querySelectorAll('[data-layer="direction-vector"]').length : 0,
            hasBilateralFarLimbs: Boolean(svg && svg.querySelector('[data-testid="spine-bilateral-far-limbs"]')),
            legendItems: legend ? legend.querySelectorAll('.spine-legend-item').length : 0,
            sourceLinks: sources.length,
            hasNonMedical: Boolean(nonMedical && nonMedical.textContent.includes('의학적 진단')),
          };
        })()`);

        let screenshotRel = null;
        if (phase === 'middle') {
          const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
          const outPath = path.join(screenshotDir, `${movementId}-middle-1440.png`);
          await fs.writeFile(outPath, Buffer.from(shot.data, 'base64'));
          screenshotRel = path.relative(repoRoot, outPath);
        }

        const passed =
          metrics.hasSvg &&
          metrics.vertebraNodes === 6 &&
          metrics.jointAxes === 3 &&
          metrics.fixedAnchors >= 2 &&
          metrics.directionVectors >= 1 &&
          metrics.hasBilateralFarLimbs &&
          metrics.legendItems === 6 &&
          metrics.sourceLinks >= 3 &&
          metrics.hasNonMedical;

        if (!passed) results.allPassed = false;
        results.movements.push({
          movementId,
          phase,
          screenshot: screenshotRel,
          passed,
          ...metrics,
        });
      }
    }

    for (const vp of VIEWPORTS) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width <= 390,
      });

      const vpMetrics = await cdp.evaluate(`(async () => {
        await window.__renderSpineFixture({ movementId: 'spine-stretch', phase: 'middle', zoom: ${vp.zoom} });
        return {
          innerWidth: window.innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
        };
      })()`);

      const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
      const outPath = path.join(
        screenshotDir,
        `viewport-${vp.name}-spine-stretch.png`,
      );
      const buf = Buffer.from(shot.data, 'base64');
      await fs.writeFile(outPath, buf);

      results.viewports.push({
        viewport: vp.name,
        width: vp.width,
        height: vp.height,
        zoom: vp.zoom,
        bytes: buf.length,
        screenshot: path.relative(repoRoot, outPath),
        ...vpMetrics,
      });
    }

    const jsonPath = path.join(__dirname, 'spine-diagram-i1-verification.json');
    await fs.writeFile(jsonPath, JSON.stringify(results, null, 2), 'utf8');
    console.log(
      `[I1 Spine Visual Verification] allPassed=${results.allPassed} movements=${results.movements.length} viewports=${results.viewports.length}`,
    );
    if (!results.allPassed) {
      process.exitCode = 1;
    }
  } finally {
    if (cdp) cdp.close();
    if (chromeProcess) chromeProcess.kill('SIGKILL');
    if (viteServer) await viteServer.close();
    rmSync(userDataDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
