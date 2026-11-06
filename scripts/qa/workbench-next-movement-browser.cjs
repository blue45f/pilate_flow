const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { artifactDirectory } = require('./artifact-directory.cjs');
(async () => {
  const out = artifactDirectory(process.env.OUT_DIR),
    b = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [];
  try {
    for (const width of [320, 390, 600, 768, 1440]) {
      const c = await b.newContext({ viewport: { width, height: 850 }, reducedMotion: 'reduce' }),
        p = await c.newPage();
      await p.goto(process.env.BASE_URL || 'http://127.0.0.1:5263');
      await p.getByRole('button', { name: '동작 고르기', exact: true }).click();
      await p.getByRole('searchbox').fill('골반시계');
      await p.getByRole('button', { name: '골반 시계 수업안에 추가', exact: true }).click();
      await p.getByRole('button', { name: '수업 구성으로 돌아가기', exact: true }).click();
      const scope = p.getByRole('combobox', { name: '다시 만들 구간' });
      await scope.scrollIntoViewIfNeeded();
      const scopeMetrics = await scope.evaluate((el) => {
        const style = getComputedStyle(el);
        const ctx = document.createElement('canvas').getContext('2d');
        ctx.font = style.font;
        return {
          width: el.getBoundingClientRect().width,
          needed:
            ctx.measureText(el.selectedOptions[0].text).width +
            parseFloat(style.paddingLeft) +
            parseFloat(style.paddingRight) +
            24,
        };
      });
      assert.ok(
        scopeMetrics.width >= scopeMetrics.needed,
        JSON.stringify({ width, ...scopeMetrics }),
      );
      for (const value of ['warmup', 'main', 'cooldown', 'all']) {
        await scope.selectOption(value);
        assert.equal(await scope.inputValue(), value);
      }
      const add = p.locator('.workbench-add-movement');
      await add.scrollIntoViewIfNeeded();
      assert.equal((await add.innerText()).trim(), '동작 추가');
      const controls = await p.locator('.v3-primary-actions > button').evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect();
          return {
            x: r.x,
            y: r.y,
            right: r.right,
            bottom: r.bottom,
            width: r.width,
            height: r.height,
          };
        }),
      );
      for (const r of controls) {
        assert.ok(r.width >= 44 && r.height >= 44);
        assert.ok(r.x >= 0 && r.right <= width + 1);
      }
      for (let i = 0; i < controls.length; i++)
        for (let j = i + 1; j < controls.length; j++) {
          const a = controls[i],
            z = controls[j];
          assert.ok(a.right <= z.x || z.right <= a.x || a.bottom <= z.y || z.bottom <= a.y);
        }
      await p.screenshot({ path: out + '/next-' + width + '.png' });
      await add.focus();
      await p.keyboard.press('Enter');
      await p.getByRole('searchbox').fill('서서 발목 움직임');
      await p.getByRole('button', { name: '서서 발목 움직임 수업안에 추가', exact: true }).click();
      await p.getByRole('button', { name: '수업 구성으로 돌아가기', exact: true }).click();
      await p.locator('.save-flow').click();
      await p.reload();
      const state = await p.evaluate(
        () => JSON.parse(localStorage.getItem('pilates-flow-atelier-storage-v3')).state,
      );
      assert.equal(state.activeSteps.length, 2);
      assert.deepEqual(
        state.savedSequences[0].steps.map((s) => s.exerciseId),
        state.activeSteps.map((s) => s.exerciseId),
      );
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      results.push({ width, twoMovementFlow: true, noOverlap: true, saved: true });
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
