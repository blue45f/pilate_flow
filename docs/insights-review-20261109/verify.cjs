const { chromium } = require(process.env.PLAYWRIGHT_PATH);
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [];
  try {
    for (const [width, height, scale] of [
      [320, 760, 1],
      [390, 844, 1],
      [768, 1024, 1],
      [1440, 900, 1],
      [390, 500, 1],
      [320, 760, 2],
    ]) {
      const context = await browser.newContext({
        viewport: { width, height },
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto('http://127.0.0.1:5298');
      if (scale === 2) await page.addStyleTag({ content: 'html {font-size:200% !important}' });
      await page.getByRole('button', { name: '동작 고르기', exact: true }).click();
      await page.getByRole('searchbox').fill('서서 발목 움직임');
      await page
        .getByRole('button', { name: '서서 발목 움직임 수업안에 추가', exact: true })
        .click();
      await page.getByRole('button', { name: '수업 구성으로 돌아가기', exact: true }).click();
      const open = page.getByRole('button', { name: '수업 구성 살펴보기', exact: true });
      await open.click();
      const dialog = page.getByRole('dialog', { name: '수업 구성 살펴보기', exact: true });
      await dialog.waitFor();
      await page.screenshot({ path: __dirname + `/after-${width}-${height}-${scale}.png` });
      const saved = await page.evaluate(() => JSON.stringify(localStorage));
      const tabs = dialog.getByRole('tab');
      assert.equal(
        await tabs.first().evaluate((e) => getComputedStyle(e).backgroundColor),
        'rgb(213, 238, 229)',
      );
      await tabs.first().focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await tabs.nth(1).getAttribute('aria-selected'), 'true');
      await page.keyboard.press('End');
      assert.equal(await tabs.nth(2).getAttribute('aria-selected'), 'true');
      await page.keyboard.press('Home');
      assert.equal(await tabs.first().getAttribute('aria-selected'), 'true');
      const summary = dialog.getByText('계획 시간 표 보기', { exact: true });
      await summary.click();
      assert.equal(await dialog.locator('details').first().getAttribute('open'), '');
      await summary.click();
      const metrics = await dialog.evaluate((d) => ({
        width: d.clientWidth,
        overflow: d.scrollWidth - d.clientWidth,
        bodyOverflow:
          d.querySelector('.atelier-modal-body').scrollWidth -
          d.querySelector('.atelier-modal-body').clientWidth,
      }));
      assert.equal(metrics.overflow, 0);
      assert.equal(metrics.bodyOverflow, 0);
      assert.deepEqual(errors, []);
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(await open.evaluate((e) => document.activeElement === e), true);
      await open.click();
      await dialog.waitFor();
      assert.equal(await tabs.first().getAttribute('aria-selected'), 'true');
      await dialog.getByRole('button', { name: '닫기', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(await open.evaluate((e) => document.activeElement === e), true);
      await open.click();
      await dialog.waitFor();
      await page.mouse.click(2, 2);
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(await open.evaluate((e) => document.activeElement === e), true);
      assert.equal(await page.evaluate(() => JSON.stringify(localStorage)), saved);
      results.push({
        width,
        height,
        scale,
        metrics,
        errors,
        keyboardTabs: true,
        mintSelection: true,
        disclosure: true,
        escapeAndCloseFocus: true,
        backdropFocus: true,
        reopenReset: true,
        readOnly: true,
      });
      await context.close();
    }
  } finally {
    await browser.close();
    fs.writeFileSync(__dirname + '/results.json', JSON.stringify(results, null, 2));
    console.log(results);
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
