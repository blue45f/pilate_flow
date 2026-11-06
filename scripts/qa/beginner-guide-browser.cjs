const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.BASE_URL || 'http://127.0.0.1:5263';
const out = process.env.OUT_DIR || '/tmp/pilates-guide-browser';
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  fs.mkdirSync(out, { recursive: true });
  const results = [];
  try {
    for (const width of [320, 390, 768, 1440]) {
      const c = await b.newContext({ viewport: { width, height: 850 }, reducedMotion: 'reduce' });
      const p = await c.newPage();
      await p.goto(base);
      await p.getByRole('button', { name: '동작 고르기', exact: true }).click();
      await p.getByRole('searchbox').fill('골반 시계');
      await p.getByRole('button', { name: '골반 시계 수업안에 추가', exact: true }).click();
      await p.getByRole('button', { name: '수업 구성으로 돌아가기', exact: true }).click();
      const read = () =>
        p.evaluate(() => JSON.parse(localStorage.getItem('pilates-flow-atelier-storage-v3')).state);
      const before = await read();
      if (width < 1024) await p.getByRole('button', { name: '메뉴 열기', exact: true }).click();
      await p.getByRole('button', { name: '강사 연습실과 사용법', exact: true }).click();
      const d = p.getByRole('dialog', { name: '강사 연습실', exact: true });
      await d.waitFor();
      await d.getByRole('heading', { name: '수업 조건 정하기', exact: true }).waitFor();
      for (let step = 0; step < 4; step++) {
        const guide = d.getByRole('region', { name: '수업 준비 사용법' });
        assert.equal(await guide.locator('ol li').count(), 3);
        assert.ok(await guide.evaluate((e) => e.scrollWidth <= e.clientWidth + 1));
        assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        if (step === 1) assert.ok((await guide.innerText()).includes('검토 기록은 선택'));
        if (step === 0 || step === 1)
          await p.screenshot({ path: out + '/guide-' + width + '-' + step + '.png' });
        if (step < 3) await d.getByRole('button', { name: '다음', exact: true }).click();
      }
      const exit = d.getByRole('button', { name: '내 수업 구성으로 가기', exact: true });
      await exit.focus();
      await p.keyboard.press('Enter');
      await d.waitFor({ state: 'detached' });
      assert.equal((await read()).activeTab, 'workbench');
      assert.deepEqual((await read()).activeSteps, before.activeSteps);
      assert.deepEqual((await read()).instructorStudyState, before.instructorStudyState);
      assert.deepEqual((await read()).historyLogs, before.historyLogs);
      assert.ok(
        await p.locator('#workspace-main-heading').evaluate((e) => e === document.activeElement),
      );
      results.push({
        width,
        guideFirst: true,
        fourSteps: true,
        noOverflow: true,
        keyboardReturn: true,
        draftPreserved: true,
        studyUnchanged: true,
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
