import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';

const OUT_DIR = path.resolve('docs/core-diagram-i4-20261108/screenshots');
fs.mkdirSync(OUT_DIR, { recursive: true });

function buildPageHtml(title, bodyMarkup) {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 20px;
      background: #f5f2eb;
      font-family: -apple-system, BlinkMacSystemFont, "Noto Sans CJK KR", "Noto Sans KR", sans-serif;
      color: #1c1917;
      line-height: 1.45;
    }
    section {
      background: #ffffff;
      border: 1px solid #d6d3d1;
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
    }
    h2 { margin: 4px 0; font-size: 20px; font-weight: 800; color: #1c1917; }
    h3 { margin: 4px 0 8px; font-size: 13px; font-weight: 700; color: #1c1917; }
    h4 { margin: 0 0 8px; font-size: 12px; font-weight: 700; color: #292524; }
    p { margin: 4px 0; font-size: 12px; color: #57534e; }
    ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; }
    li { border: 1px solid #e7e5e4; border-radius: 8px; padding: 8px 10px; background: #fff; font-size: 11px; }
    button {
      border: 1px solid #d6d3d1;
      background: #fff;
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 600;
      margin-right: 4px;
      margin-bottom: 4px;
    }
    button[aria-selected="true"], button[aria-pressed="true"] {
      background: #1c1917;
      color: #fff;
      border-color: #1c1917;
    }
    [data-testid="core-triptych-grid"] {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
      margin: 14px 0;
    }
    @media (max-width: 768px) {
      [data-testid="core-triptych-grid"] {
        grid-template-columns: 1fr;
      }
    }
    article {
      border: 1px solid #d6d3d1;
      border-radius: 12px;
      padding: 12px;
      background: #fafaf9;
    }
    svg {
      width: 100%;
      height: auto;
      display: block;
      background: #faf7f2;
      border-radius: 10px;
      border: 1px solid #e7e0d6;
    }
    [data-testid="core-focused-verification-panel"] {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
      margin: 12px 0;
      padding: 12px;
      background: #fafaf9;
      border: 1px solid #e7e5e4;
      border-radius: 12px;
    }
    @media (max-width: 768px) {
      [data-testid="core-focused-verification-panel"] {
        grid-template-columns: 1fr;
      }
    }
    [data-testid="core-diagram-legend"] > div {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
      margin-top: 8px;
    }
    @media (max-width: 768px) {
      [data-testid="core-diagram-legend"] > div {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    [data-testid^="core-legend-item-"] {
      border: 1px solid #e7e5e4;
      border-radius: 8px;
      padding: 8px;
      background: #fff;
      font-size: 11px;
    }
    footer {
      margin-top: 12px;
      padding: 12px;
      background: #fafaf9;
      border: 1px solid #e7e5e4;
      border-radius: 12px;
    }
    [data-testid="core-non-medical-disclaimer"] {
      margin-top: 10px;
      padding: 8px 12px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 8px;
      color: #78350f;
      font-size: 11px;
    }
  </style>
</head>
<body>
  ${bodyMarkup}
</body>
</html>`;
}

async function main() {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });

  try {
    const { CoreAbdominalTriptychFigure } = await vite.ssrLoadModule(
      '/src/components/CoreAbdominalDiagramFigure.tsx',
    );

    const movements = [
      'core-hundred',
      'core-single-leg-stretch',
      'core-double-leg-stretch',
    ];

    for (const id of movements) {
      const markup = ReactDOMServer.renderToStaticMarkup(
        React.createElement(CoreAbdominalTriptychFigure, {
          initialMovementId: id,
          allowMovementSwitch: true,
        }),
      );
      const htmlPath = path.resolve(
        `docs/core-diagram-i4-20261108/preview-${id}.html`,
      );
      fs.writeFileSync(htmlPath, buildPageHtml(id, markup), 'utf8');

      const desktopPng = path.join(OUT_DIR, `${id}-desktop-1440w.png`);
      execFileSync('/usr/bin/chromium', [
        '--headless',
        '--no-sandbox',
        '--disable-gpu',
        '--hide-scrollbars',
        '--window-size=1440,1260',
        `--screenshot=${desktopPng}`,
        `file://${htmlPath}`,
      ]);

      const mobilePng = path.join(OUT_DIR, `${id}-mobile-390w.png`);
      execFileSync('/usr/bin/chromium', [
        '--headless',
        '--no-sandbox',
        '--disable-gpu',
        '--hide-scrollbars',
        '--window-size=390,1920',
        `--screenshot=${mobilePng}`,
        `file://${htmlPath}`,
      ]);
    }

    console.log('Generated screenshots:', fs.readdirSync(OUT_DIR));
  } finally {
    await vite.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
