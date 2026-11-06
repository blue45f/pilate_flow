const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.BASE_URL || 'http://127.0.0.1:5263';
const out = process.env.OUT_DIR || '/tmp/pilates-diagram-browser';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  fs.mkdirSync(out, { recursive: true });
  const results = [];
  try {
    for (const width of [320, 390, 768, 1440]) {
      const context = await browser.newContext({
        viewport: { width, height: 850 },
        reducedMotion: width === 320 ? 'reduce' : 'no-preference',
      });
      const p = await context.newPage();
      await p.goto(base);
      await p.getByRole('button', { name: '동작 고르기', exact: true }).click();
      await p.getByRole('searchbox').fill('골반 시계');
      await p.getByRole('button', { name: '골반 시계 상세 보기', exact: true }).click();
      const dialog = p.getByRole('dialog', { name: '골반 시계', exact: true });
      const before = await p.evaluate(() => JSON.stringify(localStorage));
      const summary = dialog.locator('.movement-diagram-reference > summary');
      await summary.waitFor();
      assert.equal(await dialog.getByRole('region', { name: '참고 자세 정지 그림' }).count(), 0);
      await summary.focus();
      await p.keyboard.press('Enter');
      const region = dialog.getByRole('region', { name: '참고 자세 정지 그림' });
      await region.waitFor();
      const svg = region.locator('svg');
      assert.equal(await svg.getAttribute('data-active-side'), 'right');
      assert.equal(await svg.getAttribute('data-view-mirrored'), 'false');
      assert.equal(await svg.count(), 1);
      assert.equal(await region.getByRole('button').count(), 0);
      assert.ok((await summary.boundingBox()).height >= 44);
      const drawing = await svg.innerHTML();
      await p.waitForTimeout(400);
      assert.equal(await svg.innerHTML(), drawing);
      assert.equal(await region.getByRole('button', { name: /재생/ }).count(), 0);
      assert.ok(await region.evaluate((e) => e.scrollWidth <= e.clientWidth + 1));
      await summary.scrollIntoViewIfNeeded();
      await p.screenshot({ path: out + '/diagram-' + width + '.png' });
      await summary.click();
      await region.waitFor({ state: 'detached' });
      await summary.click();
      await region.waitFor();
      assert.equal(await svg.getAttribute('data-phase'), 'start');
      await dialog.getByRole('button', { name: '닫기', exact: true }).click();
      assert.equal(await p.evaluate(() => JSON.stringify(localStorage)), before);
      results.push({
        width,
        singleStaticReference: true,
        referenceSideExplicit: true,
        noAutoplay: true,
        readOnly: true,
        keyboard: true,
      });
      await context.close();
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(out + '/results.json', JSON.stringify(results, null, 2));
  console.log(results);
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
