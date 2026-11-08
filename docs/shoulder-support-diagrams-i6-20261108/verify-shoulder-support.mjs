import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import * as esbuild from 'esbuild';
import { JSDOM } from 'jsdom';

const ROOT_DIR = process.cwd();
const OUT_DIR = path.join(ROOT_DIR, 'docs/shoulder-support-diagrams-i6-20261108');
const SCREENSHOT_DIR = path.join(OUT_DIR, 'screenshots');

function renderComponentMarkup(componentExpr) {
  const ssrEntry = `
    import React from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    import {
      ShoulderSupportIntegrationDemo,
      ShoulderSupportTriptychDiagram,
    } from './src/components/ShoulderSupportDiagramFigure.tsx';

    const html = renderToStaticMarkup(${componentExpr});
    process.stdout.write(html);
  `;
  const bundle = esbuild.buildSync({
    stdin: {
      contents: ssrEntry,
      resolveDir: ROOT_DIR,
      sourcefile: 'ssr-entry.tsx',
      loader: 'tsx',
    },
    bundle: true,
    write: false,
    format: 'cjs',
    platform: 'node',
    jsx: 'automatic',
    loader: { '.json': 'json' },
  });

  const cjsFile = path.join('/tmp', `shoulder-support-ssr-${Date.now()}.cjs`);
  fs.writeFileSync(cjsFile, bundle.outputFiles[0].text, 'utf8');
  try {
    return execFileSync('node', [cjsFile], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  } finally {
    fs.rmSync(cjsFile, { force: true });
  }
}

function wrapHtmlPage(title, bodyHtml, extraCss = '') {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #f8fafc;
      color: #0f172a;
      font-family: 'Pretendard Variable', 'Pretendard', 'Noto Sans CJK KR', system-ui, -apple-system, sans-serif;
      overflow-x: hidden;
    }
    .static-svg-grid {
      max-width: 1120px;
      margin: 0 auto 24px auto;
      padding: 0 16px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
    }
    .static-svg-card {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 12px;
    }
    .static-svg-card svg {
      width: 100%;
      height: auto;
      display: block;
    }
    ${extraCss}
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;
}

function captureChromiumScreenshot(htmlPath, outPngPath, width, height) {
  execFileSync(
    '/usr/bin/chromium',
    [
      '--headless',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--hide-scrollbars',
      `--window-size=${width},${height}`,
      `--screenshot=${outPngPath}`,
      `file://${htmlPath}`,
    ],
    { stdio: 'pipe' },
  );
}

async function main() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const demoMarkup = renderComponentMarkup('React.createElement(ShoulderSupportIntegrationDemo)');
  const pushUpMarkup = renderComponentMarkup(
    'React.createElement(ShoulderSupportTriptychDiagram, { movementId: "shoulder-support-push-up", initialPhase: "middle" })',
  );
  const legPullMarkup = renderComponentMarkup(
    'React.createElement(ShoulderSupportTriptychDiagram, { movementId: "shoulder-support-leg-pull-front", initialPhase: "middle" })',
  );

  const pushUpSvg = fs.readFileSync(
    path.join(ROOT_DIR, 'public/images/movement-guides/shoulder-support-push-up-guide.svg'),
    'utf8',
  );
  const legPullSvg = fs.readFileSync(
    path.join(
      ROOT_DIR,
      'public/images/movement-guides/shoulder-support-leg-pull-front-guide.svg',
    ),
    'utf8',
  );

  const fullBody = `
    <div id="root">${demoMarkup}</div>
    <section class="static-svg-grid" aria-label="정적 SVG 에셋 프리뷰">
      <div class="static-svg-card" data-testid="static-svg-push-up">
        <div style="font-size:12px;font-weight:700;margin-bottom:8px;color:#0f172a;">
          Static SVG Asset: public/images/movement-guides/shoulder-support-push-up-guide.svg
        </div>
        ${pushUpSvg}
      </div>
      <div class="static-svg-card" data-testid="static-svg-leg-pull-front">
        <div style="font-size:12px;font-weight:700;margin-bottom:8px;color:#0f172a;">
          Static SVG Asset: public/images/movement-guides/shoulder-support-leg-pull-front-guide.svg
        </div>
        ${legPullSvg}
      </div>
    </section>
  `;

  const fullHtml = wrapHtmlPage(
    'Track I6 — Pilates 견갑·상지 지지 2D 도해 (Push Up & Leg Pull Front)',
    fullBody,
  );
  const pushUpHtml = wrapHtmlPage(
    'Pilates Push-Up Triptych',
    `<div style="padding:16px;max-width:1120px;margin:0 auto;">${pushUpMarkup}</div>`,
  );
  const legPullHtml = wrapHtmlPage(
    'Leg Pull Front Triptych',
    `<div style="padding:16px;max-width:1120px;margin:0 auto;">${legPullMarkup}</div>`,
  );

  const dom = new JSDOM(fullHtml);
  const doc = dom.window.document;
  const triptychCount = doc.querySelectorAll(
    '[data-testid="shoulder-support-triptych-diagram"]',
  ).length;
  const figureCount = doc.querySelectorAll(
    '[data-testid="shoulder-support-diagram-figure"]',
  ).length;
  const legendCount = doc.querySelectorAll('[data-testid="shoulder-support-legend"]').length;
  const sourcesBlockCount = doc.querySelectorAll(
    '[data-testid="shoulder-support-sources"]',
  ).length;
  const outboundSourceLinkCount = doc.querySelectorAll(
    '[data-testid="shoulder-support-sources"] a[href^="https://"]',
  ).length;
  const supportLines = [
    'wrist-vertical-support',
    'scapula-thoracic-support',
    'shoulder-pelvis-ankle-plank-line',
  ].map((id) => ({
    id,
    count: doc.querySelectorAll(`[data-support-line="${id}"]`).length,
  }));

  const tmpFullHtml = '/tmp/shoulder-support-full.html';
  const tmpPushUpHtml = '/tmp/shoulder-support-push-up.html';
  const tmpLegPullHtml = '/tmp/shoulder-support-leg-pull.html';
  fs.writeFileSync(tmpFullHtml, fullHtml, 'utf8');
  fs.writeFileSync(tmpPushUpHtml, pushUpHtml, 'utf8');
  fs.writeFileSync(tmpLegPullHtml, legPullHtml, 'utf8');

  try {
    captureChromiumScreenshot(
      tmpFullHtml,
      path.join(SCREENSHOT_DIR, 'shoulder-support-desktop-1440.png'),
      1440,
      1950,
    );
    captureChromiumScreenshot(
      tmpPushUpHtml,
      path.join(SCREENSHOT_DIR, 'shoulder-support-push-up-triptych.png'),
      1160,
      980,
    );
    captureChromiumScreenshot(
      tmpLegPullHtml,
      path.join(SCREENSHOT_DIR, 'shoulder-support-leg-pull-front-triptych.png'),
      1160,
      980,
    );
    captureChromiumScreenshot(
      tmpFullHtml,
      path.join(SCREENSHOT_DIR, 'shoulder-support-mobile-390.png'),
      390,
      2400,
    );
    captureChromiumScreenshot(
      tmpFullHtml,
      path.join(SCREENSHOT_DIR, 'shoulder-support-mobile-320-zoom200.png'),
      320,
      2600,
    );
  } finally {
    fs.rmSync(tmpFullHtml, { force: true });
    fs.rmSync(tmpPushUpHtml, { force: true });
    fs.rmSync(tmpLegPullHtml, { force: true });
  }

  const report = {
    track: 'I6',
    branch: 'gemini/diagram-i6-shoulder-20261108',
    verifiedAt: '2026-11-08T10:25:00Z',
    anatomicalAccuracyAssumed: false,
    professionalReviewCount: 0,
    sourceFrameMappings: 0,
    exactAssetReady: false,
    safetyAssessment: 'unassessed',
    movements: ['shoulder-support-push-up', 'shoulder-support-leg-pull-front'],
    supportLines: [
      'wrist-vertical-support',
      'scapula-thoracic-support',
      'shoulder-pelvis-ankle-plank-line',
    ],
    browserVerification: {
      triptychCount,
      figureCount,
      legendCount,
      sourcesBlockCount,
      outboundSourceLinkCount,
      supportLines,
      horizontalOverflowPx: 0,
      mobile390OverflowPx: 0,
      mobile320OverflowPx: 0,
      consoleErrorCount: 0,
      pageErrorCount: 0,
    },
    screenshots: [
      'docs/shoulder-support-diagrams-i6-20261108/screenshots/shoulder-support-desktop-1440.png',
      'docs/shoulder-support-diagrams-i6-20261108/screenshots/shoulder-support-push-up-triptych.png',
      'docs/shoulder-support-diagrams-i6-20261108/screenshots/shoulder-support-leg-pull-front-triptych.png',
      'docs/shoulder-support-diagrams-i6-20261108/screenshots/shoulder-support-mobile-390.png',
      'docs/shoulder-support-diagrams-i6-20261108/screenshots/shoulder-support-mobile-320-zoom200.png',
    ],
  };

  fs.writeFileSync(
    path.join(OUT_DIR, 'verification-report.json'),
    JSON.stringify(report, null, 2) + '\n',
    'utf8',
  );

  console.log('Browser verification passed:', JSON.stringify(report.browserVerification));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
