import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const OUT_DIR = path.resolve('docs/core-diagram-i4-20261108/screenshots');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function main() {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });

  try {
    const React = (await vite.ssrLoadModule('react')).default;
    const ReactDOMServer = await vite.ssrLoadModule('react-dom/server');
    const {
      CoreAbdominalTriptychFigure,
      CoreAbdominalI7IntegrationPreview,
    } = await vite.ssrLoadModule('/src/components/CoreAbdominalDiagramFigure.tsx');

    const tailwindCssPath = path.resolve('node_modules/tailwindcss/index.css');
    const htmlSections = [
      'core-hundred',
      'core-single-leg-stretch',
      'core-double-leg-stretch',
    ].map((id) => {
      const markup = ReactDOMServer.renderToStaticMarkup(
        React.createElement(CoreAbdominalTriptychFigure, {
          initialMovementId: id,
          allowMovementSwitch: true,
        }),
      );
      return `<div id="section-${id}" class="movement-section">${markup}</div>`;
    });

    const i7Markup = ReactDOMServer.renderToStaticMarkup(
      React.createElement(CoreAbdominalI7IntegrationPreview),
    );

    const fullHtml = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>I4 Pilates Core Abdominal Stability 2D Diagrams Verification</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      margin: 0;
      padding: 24px;
      background: #f5f2eb;
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard", "Noto Sans KR", sans-serif;
      color: #1c1917;
    }
    .movement-section {
      margin-bottom: 32px;
      background: #ffffff;
      border: 1px solid #d6d3d1;
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    .grid { display: grid; gap: 16px; }
    @media (min-width: 1024px) {
      .lg\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .lg\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    }
    @media (min-width: 768px) {
      .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    svg { width: 100%; height: auto; display: block; background: #faf7f2; border-radius: 12px; border: 1px solid #e7e5e4; }
  </style>
</head>
<body>
  <main style="max-width: 1360px; margin: 0 auto;">
    <h1 style="font-size: 22px; font-weight: 800; margin-bottom: 16px;">[I4/구현] Pilates 복부 안정 2D 도해 시각 검증 (헌드레드 · 싱글 레그 스트레치 · 더블 레그 스트레치)</h1>
    ${htmlSections.join('\n')}
    <section id="section-i7-preview" class="movement-section">
      <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 12px;">I7 공용 렌더러 어댑터 호환 검증</h2>
      ${i7Markup}
    </section>
  </main>
</body>
</html>`;

    const htmlPath = path.resolve('docs/core-diagram-i4-20261108/verification-preview.html');
    fs.writeFileSync(htmlPath, fullHtml, 'utf8');

    const browser = await chromium.launch({ headless: true });
    const desktopPage = await browser.newPage({
      viewport: { width: 1440, height: 960 },
      deviceScaleFactor: 1,
    });
    await desktopPage.setContent(fullHtml, { waitUntil: 'load' });

    for (const id of [
      'core-hundred',
      'core-single-leg-stretch',
      'core-double-leg-stretch',
    ]) {
      const locator = desktopPage.locator(`#section-${id}`);
      await locator.screenshot({
        path: path.join(OUT_DIR, `${id}-desktop-1440w.png`),
      });
    }
    await desktopPage.screenshot({
      path: path.join(OUT_DIR, 'core-all-movements-desktop-full.png'),
      fullPage: true,
    });

    const mobilePage = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    await mobilePage.setContent(fullHtml, { waitUntil: 'load' });
    for (const id of [
      'core-hundred',
      'core-single-leg-stretch',
      'core-double-leg-stretch',
    ]) {
      const locator = mobilePage.locator(`#section-${id}`);
      await locator.screenshot({
        path: path.join(OUT_DIR, `${id}-mobile-390w.png`),
      });
    }

    await browser.close();
    console.log('Screenshots saved to:', OUT_DIR);
  } finally {
    await vite.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
