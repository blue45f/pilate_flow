const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { artifactDirectory } = require('./artifact-directory.cjs');
(async () => {
  const out = artifactDirectory(process.env.OUT_DIR);
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [];
  try {
    for (const width of [320, 390, 768, 1440]) {
      const c = await b.newContext({ viewport: { width, height: 850 }, reducedMotion: 'reduce' });
      const p = await c.newPage();
      await p.goto(process.env.BASE_URL || 'http://127.0.0.1:5263');
      if (width < 1024) await p.getByRole('button', { name: '메뉴 열기', exact: true }).click();
      await p.getByRole('button', { name: /동작 라이브러리/ }).click();
      const button = p.locator('.ml-card-patterns button').first();
      await button.scrollIntoViewIfNeeded();
      const before = await p.evaluate(() => JSON.stringify(localStorage));
      const dimensions = await button.evaluate((el) => {
        const s = getComputedStyle(el);
        return {
          height: el.getBoundingClientRect().height,
          line: parseFloat(s.lineHeight),
          font: parseFloat(s.fontSize),
        };
      });
      assert.ok(dimensions.height >= 44);
      assert.ok(Math.abs(dimensions.line / dimensions.font - 1.7) < 0.02);
      await button.focus();
      await p.screenshot({ path: out + '/atlas-' + width + '.png' });
      await p.keyboard.press('Enter');
      await p.getByRole('region', { name: '선택한 패턴 도해 미리보기' }).waitFor();
      assert.equal(await p.evaluate(() => JSON.stringify(localStorage)), before);
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      results.push({ width, ...dimensions, opens: true, dataPreserved: true });
      await c.close();
    }
  } finally {
    await b.close();
  }
  fs.writeFileSync(out + '/results.json', JSON.stringify(results, null, 2));
  console.log(out, results);
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
