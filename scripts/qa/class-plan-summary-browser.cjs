const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.BASE_URL || 'http://127.0.0.1:5263';
const out = process.env.OUT_DIR || '/tmp/pilates-summary-browser';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  fs.mkdirSync(out, { recursive: true });
  const results = [];
  try {
    for (const width of [320, 390, 768, 1440]) {
      const context = await browser.newContext({
        viewport: { width, height: 850 },
        reducedMotion: 'reduce',
      });
      const p = await context.newPage();
      await p.goto(base);
      await p.getByRole('button', { name: '동작 고르기', exact: true }).click();
      await p.getByRole('searchbox').fill('서서 발목 움직임');
      await p.getByRole('button', { name: '서서 발목 움직임 수업안에 추가', exact: true }).click();
      await p.getByRole('button', { name: '수업 구성으로 돌아가기', exact: true }).click();
      const before = await p.evaluate(() => JSON.stringify(localStorage));
      await p.locator('.v3-preview-button').click();
      const summary = p.locator('.class-plan-summary > summary');
      await summary.waitFor();
      assert.equal(await p.getByRole('region', { name: '수업안 편성 요약' }).count(), 0);
      await summary.focus();
      await p.keyboard.press('Enter');
      await p.getByRole('region', { name: '수업안 편성 요약' }).waitFor();
      assert.ok((await summary.boundingBox()).height >= 44);
      const nested = p.locator('.class-plan-summary-content details > summary');
      if (await nested.count()) await nested.click();
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      assert.ok(
        await p.locator('.class-plan-summary').evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
      );
      await summary.scrollIntoViewIfNeeded();
      await p.screenshot({ path: out + '/summary-' + width + '.png' });
      await summary.click();
      await p.getByRole('region', { name: '수업안 편성 요약' }).waitFor({ state: 'detached' });
      await p.getByRole('button', { name: '계획 미리보기 닫기', exact: true }).click();
      assert.equal(await p.evaluate(() => JSON.stringify(localStorage)), before);
      await p.locator('.v3-preview-button').click();
      assert.equal(await p.getByRole('region', { name: '수업안 편성 요약' }).count(), 0);
      await p.getByRole('button', { name: '계획 미리보기 닫기', exact: true }).click();
      results.push({
        width,
        collapsedByDefault: true,
        keyboard: true,
        noOverflow: true,
        readOnly: true,
        reopenCollapsed: true,
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
