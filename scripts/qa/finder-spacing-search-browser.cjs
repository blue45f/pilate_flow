const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.BASE_URL || 'http://127.0.0.1:5263';
const out = process.env.OUT_DIR || '/tmp/pilates-spacing-search';
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  fs.mkdirSync(out, { recursive: true });
  const results = [];
  try {
    for (const width of [320, 390, 768, 1440]) {
      const c = await b.newContext({ viewport: { width, height: 850 } });
      const p = await c.newPage();
      await p.goto(base);
      await p.getByRole('button', { name: '동작 고르기', exact: true }).click();
      const search = p.getByRole('searchbox');
      const before = await p.evaluate(() => JSON.stringify(localStorage));
      for (const query of ['골반시계', '골반시계'.normalize('NFD'), 'ＰｅｌｖｉｃＣｌｏｃｋ']) {
        await search.fill(query);
        assert.equal(
          await p.getByRole('button', { name: '골반 시계 수업안에 추가', exact: true }).count(),
          1,
        );
      }
      await search.fill('골반시계 존재하지않는단어');
      await p.getByRole('heading', { name: '조건에 맞는 동작이 없어요' }).waitFor();
      assert.equal(await p.evaluate(() => JSON.stringify(localStorage)), before);
      await search.fill('골반시계');
      await p.screenshot({ path: out + '/search-' + width + '.png' });
      await p.getByRole('button', { name: '골반 시계 수업안에 추가', exact: true }).click();
      await p.getByRole('button', { name: '수업 구성으로 돌아가기', exact: true }).click();
      await p.locator('.save-flow').click();
      await p.reload();
      const state = await p.evaluate(
        () => JSON.parse(localStorage.getItem('pilates-flow-atelier-storage-v3')).state,
      );
      assert.equal(state.activeSteps.length, 1);
      assert.equal(state.savedSequences[0].steps[0].exerciseId, state.activeSteps[0].exerciseId);
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      results.push({
        width,
        compactKorean: true,
        unicode: true,
        andSemantics: true,
        searchReadOnly: true,
        addSaveReload: true,
      });
      await c.close();
    }
  } finally {
    await b.close();
  }
  fs.writeFileSync(out + '/results.json', JSON.stringify(results, null, 2));
  console.log(results);
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
