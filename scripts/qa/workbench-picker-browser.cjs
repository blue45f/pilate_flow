const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs'),
  assert = require('node:assert/strict');
const out = process.env.OUT_DIR || '/tmp/pilates-finder-regression';
const base = process.env.BASE_URL || 'http://127.0.0.1:5239';
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  fs.mkdirSync(out, { recursive: true });
  const results = [];
  try {
    for (const width of [320, 390, 768, 1100, 1150, 1200, 1440]) {
      const c = await b.newContext({
        viewport: { width, height: 850 },
        hasTouch: width < 800,
        reducedMotion: width === 320 ? 'reduce' : 'no-preference',
      });
      const p = await c.newPage();
      await p.goto(base);
      const store = () =>
        p.evaluate(
          () => JSON.parse(localStorage.getItem('pilates-flow-atelier-storage-v3'))?.state,
        );
      const initial = await store();
      assert.equal(
        await p.getByRole('complementary', { name: '작업대 동작 찾기', exact: true }).count(),
        0,
      );
      await p.getByRole('button', { name: '동작 고르기', exact: true }).click();
      const d = p.getByRole('dialog', { name: '수업에 넣을 동작 고르기', exact: true }),
        f = d.getByRole('complementary', { name: '작업대 동작 찾기', exact: true });
      await f.waitFor();
      if (width >= 1200)
        await p.waitForFunction(() => document.activeElement?.matches('input[type="search"]'));
      const search = f.getByRole('searchbox');
      await search.fill('누워서 호흡 관찰');
      const source = f.getByRole('button', { name: '누워서 호흡 관찰 상세 보기', exact: true });
      await source.click();
      const detail = p.getByRole('dialog', { name: '누워서 호흡 관찰', exact: true });
      await detail.waitFor();
      if (width === 390 || width === 1440)
        await p.setViewportSize({ width: width === 390 ? 1440 : 390, height: 850 });
      await detail.getByRole('button', { name: '닫기', exact: true }).click();
      await d.waitFor();
      assert.equal(await search.inputValue(), '누워서 호흡 관찰');
      assert.ok(await source.evaluate((e) => e === document.activeElement));
      await p.setViewportSize({ width, height: 850 });
      assert.deepEqual(await store(), initial);
      await f.getByRole('button', { name: '수업 기구로 좁히기', exact: true }).click();
      for (const name of ['누워서 호흡 관찰', '골반 시계', '서서 발목 움직임']) {
        await search.fill(name);
        await f.getByRole('button', { name: name + ' 수업안에 추가', exact: true }).click();
      }
      await p.screenshot({ path: out + '/picker-' + width + '.png' });
      await d.getByRole('button', { name: '수업 구성으로 돌아가기', exact: true }).click();
      await p.waitForTimeout(40);
      assert.equal(
        await p.getByRole('complementary', { name: '작업대 동작 찾기', exact: true }).count(),
        0,
      );
      assert.equal(await p.evaluate(() => document.activeElement.id), 'sequence-outline-heading');
      assert.equal(await p.locator('.v2-inline-finder').count(), 0);
      const layout = await p.locator('.v2-plan-layout').boundingBox(),
        column = await p.locator('.sequence-column').boundingBox();
      assert.ok(Math.abs(layout.width - column.width) < 2, 'no empty column ' + width);
      await p.evaluate(() => scrollTo(0, 0));
      await p.screenshot({ path: out + '/sequence-' + width + '.png' });
      await p.getByRole('button', { name: '동작 더 담기', exact: true }).click();
      assert.equal(await search.inputValue(), '서서 발목 움직임');
      await p.keyboard.press('Escape');
      await p.getByRole('button', { name: '동작 더 담기', exact: true }).click();
      await d.waitFor();
      for (let i = 0; i < 30; i++) {
        await p.keyboard.press('Tab');
        assert.ok(await d.evaluate((e) => e.contains(document.activeElement)));
      }
      await p.keyboard.press('Escape');
      await p.locator('.step-title').first().click();
      const editor = p.getByRole('region', { name: '1번 동작 블록 편집', exact: true });
      await editor.waitFor();
      assert.equal(
        await p.getByRole('complementary', { name: '작업대 동작 찾기', exact: true }).count(),
        0,
      );
      if (width >= 1200) {
        assert.equal(await p.locator('.v2-inline-finder').count(), 1);
        await p.getByRole('button', { name: '동작 속성 닫기', exact: true }).click();
      } else {
        await p
          .getByRole('dialog', { name: '동작 블록 편집', exact: true })
          .getByRole('button', { name: '닫기', exact: true })
          .click();
      }
      const ids = (await store()).activeSteps.map((s) => s.stepId);
      const handle = p.locator('#order-handle-' + ids[0]);
      await handle.focus();
      await p.keyboard.press('ArrowDown');
      await p.waitForTimeout(50);
      assert.equal((await store()).activeSteps[1].stepId, ids[0]);
      await p.getByRole('button', { name: '되돌리기', exact: true }).click();
      assert.deepEqual(
        (await store()).activeSteps.map((s) => s.stepId),
        ids,
      );
      await p.locator('.save-flow').click();
      await p.reload();
      assert.deepEqual(
        (await store()).activeSteps.map((s) => s.stepId),
        ids,
      );
      assert.deepEqual(
        (await store()).savedSequences[0].steps.map((s) => s.stepId),
        ids,
      );
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      results.push({
        width,
        sourceReturn: true,
        filtersPreserved: true,
        focusTrap: true,
        noEmptyColumn: true,
        inspector: true,
        keyboardUndo: true,
        saveReload: true,
      });
      await c.close();
    }
  } finally {
    await b.close();
  }
  fs.writeFileSync(out + '/results.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
