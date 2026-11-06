const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [];
  const out = process.env.OUT_DIR || '/tmp/pilates-pagination';
  fs.mkdirSync(out, { recursive: true });
  try {
    for (const width of [320, 390, 768, 1440]) {
      const context = await browser.newContext({
        viewport: { width, height: 850 },
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      await page.goto(process.env.BASE_URL || 'http://127.0.0.1:5263');
      await page.getByRole('button', { name: '동작 고르기', exact: true }).click();
      const before = await page.evaluate(() => JSON.stringify(localStorage));
      let pages = 0;
      while (await page.locator('.ief-more').count()) {
        const count = await page.locator('.ief-card').count();
        await page.locator('.ief-more').focus();
        await page.keyboard.press('Enter');
        const card = page.locator('.ief-card').nth(count);
        assert.ok(
          await card
            .locator('button')
            .first()
            .evaluate((el) => el === document.activeElement),
        );
        await page.keyboard.press('Tab');
        assert.ok(await card.evaluate((el) => el.contains(document.activeElement)));
        pages++;
      }
      assert.equal(await page.evaluate(() => JSON.stringify(localStorage)), before);
      await page.screenshot({ path: out + '/last-page-' + width + '.png' });
      await page.getByRole('searchbox').fill('골반시계');
      await page.getByRole('button', { name: '골반 시계 수업안에 추가', exact: true }).click();
      await page.getByRole('button', { name: '수업 구성으로 돌아가기', exact: true }).click();
      await page.locator('.save-flow').click();
      await page.reload();
      const state = await page.evaluate(
        () => JSON.parse(localStorage.getItem('pilates-flow-atelier-storage-v3')).state,
      );
      assert.equal(state.activeSteps.length, 1);
      assert.equal(state.savedSequences[0].steps[0].exerciseId, state.activeSteps[0].exerciseId);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      results.push({ width, pages, focus: true, readOnly: true, addSaveReload: true });
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
