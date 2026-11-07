import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {
  REPO_ROOT,
  AUDIT_DIR,
  loadReadOnlySemanticAuditModules,
  runSemanticAuditAnalysis,
} from './shared/semantic-audit-analyzer.mjs';

const THIRD_PARTY_URL =
  'file:///usr/local/lib/node_modules/chrome-devtools-mcp/build/src/third_party/index.js';

const SCREENSHOT_DIR = path.join(AUDIT_DIR, 'screenshots');
const BROWSER_SUMMARY_PATH = path.join(
  AUDIT_DIR,
  'evidence/browser-verification-summary.json',
);

import {
  VIEWPORTS,
  APPARATUS_SAMPLE_SPECS,
  buildAuditHtmlPage,
} from "./shared/browser-audit-template.mjs";

export async function runBrowserSemanticVerification() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const [analysis, modules] = await Promise.all([
    runSemanticAuditAnalysis(),
    loadReadOnlySemanticAuditModules(),
  ]);

  const html = buildAuditHtmlPage(
    analysis,
    modules.rigCatalogMod,
    modules.svgMod,
  );

  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const url = `http://127.0.0.1:${port}/`;

  const { puppeteer } = await import(THIRD_PARTY_URL);
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const consoleErrors = [];
  const pageErrors = [];
  const viewportResults = [];
  const apparatusScreenshots = [];

  try {
    const page = await browser.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => {
      pageErrors.push(String(err));
    });

    // 1. Capture per-apparatus sample screenshots at 1440x900 desktop resolution
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'networkidle0' });

    for (const spec of APPARATUS_SAMPLE_SPECS) {
      const handle = await page.$(`#sample-${spec.apparatus}`);
      if (!handle) {
        throw new Error(`Missing apparatus sample section #sample-${spec.apparatus}`);
      }
      const outFile = path.join(SCREENSHOT_DIR, spec.screenshotFile);
      await handle.screenshot({ path: outFile });
      const stat = fs.statSync(outFile);
      apparatusScreenshots.push({
        apparatus: spec.apparatus,
        mismatchIds: spec.mismatchIds,
        screenshotPath: path.relative(REPO_ROOT, outFile),
        bytes: stat.size,
      });
    }

    // 2. Verify all 5 viewports (320, 390, 768, 1440, 1440@200% zoom)
    for (const vp of VIEWPORTS) {
      await page.setViewport({
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: vp.zoom === 2 ? 2 : 1,
      });
      await page.goto(url, { waitUntil: 'networkidle0' });

      if (vp.zoom !== 1) {
        await page.evaluate((z) => {
          document.documentElement.style.zoom = String(z);
        }, vp.zoom);
      }

      // Exercise interactive filter buttons in the real browser
      await page.click('#btn-filter-mismatch-only');
      await page.click('#btn-filter-all');

      const metrics = await page.evaluate(() => {
        const docEl = document.documentElement;
        const horizontalOverflowPx = Math.max(
          0,
          docEl.scrollWidth - window.innerWidth,
        );
        const svgs = Array.from(
          document.querySelectorAll('.svg-box svg[data-exercise-id]'),
        );
        const validSvgs = svgs.every((s) => {
          const r = s.getBoundingClientRect();
          return r.width >= 60 && r.height >= 40;
        });
        const bannerText =
          document.getElementById('truthfulness-banner')?.textContent?.trim() ?? '';
        return {
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          scrollWidth: docEl.scrollWidth,
          horizontalOverflowPx,
          renderedSvgCount: svgs.length,
          allSvgsVisibleAndSized: validSvgs && svgs.length === 42,
          hasTruthfulnessBanner:
            bannerText.includes('anatomicalAccuracyAssumed: false') &&
            bannerText.includes('전문가 검증 완료를 절대 주장하지 않습니다'),
        };
      });

      const outFile = path.join(SCREENSHOT_DIR, vp.file);
      await page.screenshot({ path: outFile, fullPage: false });
      const stat = fs.statSync(outFile);

      viewportResults.push({
        viewportId: vp.id,
        width: vp.width,
        height: vp.height,
        zoom: vp.zoom,
        screenshotPath: path.relative(REPO_ROOT, outFile),
        bytes: stat.size,
        ...metrics,
      });
    }

    await page.close();
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  const summary = {
    verifiedAt: new Date().toISOString(),
    rendererSource: 'src/components/MovementPhaseDiagramSvg.tsx (READ-ONLY current main)',
    consoleErrorCount: consoleErrors.length,
    pageErrorCount: pageErrors.length,
    consoleErrors,
    pageErrors,
    allViewportsZeroHorizontalOverflow: viewportResults.every(
      (v) => v.horizontalOverflowPx === 0,
    ),
    allViewportsSvgsVisible: viewportResults.every(
      (v) => v.allSvgsVisibleAndSized,
    ),
    apparatusScreenshots,
    viewportResults,
  };

  fs.writeFileSync(
    BROWSER_SUMMARY_PATH,
    JSON.stringify(summary, null, 2) + '\n',
    'utf8',
  );

  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runBrowserSemanticVerification()
    .then((res) => {
      console.log(
        JSON.stringify(
          {
            consoleErrorCount: res.consoleErrorCount,
            pageErrorCount: res.pageErrorCount,
            allViewportsZeroHorizontalOverflow:
              res.allViewportsZeroHorizontalOverflow,
            allViewportsSvgsVisible: res.allViewportsSvgsVisible,
            apparatusScreenshotsCount: res.apparatusScreenshots.length,
            viewportScreenshotsCount: res.viewportResults.length,
          },
          null,
          2,
        ),
      );
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
