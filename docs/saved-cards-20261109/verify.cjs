const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const url = process.env.SAVED_QA_URL || 'http://127.0.0.1:5285';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [];
  try {
    for (const spec of [
      { w: 320, h: 760 },
      { w: 390, h: 844 },
      { w: 768, h: 1024 },
      { w: 1024, h: 768 },
      { w: 1440, h: 900 },
      { w: 1024, h: 500 },
      { w: 320, h: 760, text: 200 },
    ]) {
      const context = await browser.newContext({
        viewport: { width: spec.w, height: spec.h },
        reducedMotion: 'reduce',
      });
      await context.route('**/*', (r) =>
        r.request().url().startsWith(new URL(url).origin) || r.request().url().startsWith('blob:')
          ? r.continue()
          : r.abort(),
      );
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(url);
      await page.evaluate(async () => {
        const { usePilatesStore } = await import('/src/store/usePilatesStore.ts');
        const { revisionSource, revisionExercise } =
          await import('/src/test/datedRevisionFixtures.ts');
        const seq = revisionSource('first');
        seq.title = '매트 기본 수업';
        seq.subtitle = '합성 검증용 계획';
        seq.criteriaSnapshot = undefined;
        usePilatesStore.setState({
          activeTab: 'binder',
          savedSequences: [
            seq,
            {
              ...structuredClone(seq),
              id: 'second',
              title: '상체 가동성',
              updatedAt: '2026-11-04T10:00:00Z',
            },
          ],
          exercises: [revisionExercise],
          activeSteps: [],
          historyLogs: [],
          classGroups: [
            {
              id: 'qa',
              name: '연습 그룹',
              type: 'group',
              defaultLevel: '1.0',
              scheduleLabel: '',
              notes: '',
            },
          ],
        });
      });
      await page.getByRole('heading', { name: /저장한 시퀀스/, level: 1 }).waitFor();
      if (spec.text) await page.addStyleTag({ content: 'html{font-size:200%!important}' });
      const card = (title) =>
        page
          .locator('article.teaching-sequence-card')
          .filter({ has: page.getByRole('heading', { name: title, exact: true }) });
      const first = card('매트 기본 수업');
      const second = card('상체 가동성');
      const state = () =>
        page.evaluate(async () => {
          const { usePilatesStore } = await import('/src/store/usePilatesStore.ts');
          const s = usePilatesStore.getState();
          return JSON.parse(
            JSON.stringify([
              s.savedSequences,
              s.historyLogs,
              s.instructorSchedule,
              s.datedSequencePlanning,
              s.activeSteps,
            ]),
          );
        });
      const before = await state();
      const label = `${spec.w}x${spec.h}${spec.text ? '-text200' : ''}`;
      await page.screenshot({ path: path.join(__dirname, `closed-${label}.png`), scale: 'css' });
      const beforeHeight = (await first.boundingBox()).height;
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
      assert.equal(
        await first.getByRole('button', { name: '수업 시작', exact: true }).isVisible(),
        false,
      );
      // Native Tab skips the hidden toolbox; keyboard opens More.
      await first.getByRole('button', { name: '불러오기', exact: true }).focus();
      await page.keyboard.press('Tab');
      assert.equal(
        await first
          .getByRole('button', { name: '매트 기본 수업 더보기', exact: true })
          .evaluate((e) => e === document.activeElement),
        true,
      );
      await page.keyboard.press('Enter');
      await first.getByRole('button', { name: '수업 시작', exact: true }).waitFor();
      const expandedHeight = (await first.boundingBox()).height;
      assert.ok(expandedHeight > beforeHeight);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
      await first.screenshot({ path: path.join(__dirname, `expanded-${label}.png`), scale: 'css' });
      await first.getByRole('button', { name: '수업 시작', exact: true }).focus();
      await page.keyboard.press('Escape');
      assert.equal(
        await first
          .getByRole('button', { name: /더보기$/ })
          .evaluate((e) => e === document.activeElement),
        true,
      );
      assert.deepEqual(await state(), before);
      await first.getByRole('button', { name: /더보기$/ }).click();
      const print = first.getByRole('button', { name: '인쇄', exact: true });
      for (const close of ['escape', 'button', 'backdrop']) {
        await print.click();
        const dialog = page.getByRole('dialog', { name: '수업 계획 인쇄', exact: true });
        await dialog.waitFor();
        if (close === 'escape') await page.keyboard.press('Escape');
        else if (close === 'button')
          await dialog.getByRole('button', { name: '닫기', exact: true }).last().click();
        else await page.mouse.click(2, 2);
        await dialog.waitFor({ state: 'hidden' });
        assert.equal(await print.evaluate((e) => e === document.activeElement), true);
      }
      const downloadPromise = page.waitForEvent('download');
      await first.getByRole('button', { name: '텍스트', exact: true }).click();
      const download = await downloadPromise;
      const text = fs.readFileSync(await download.path(), 'utf8');
      assert.match(text, /휴식/);
      assert.match(text, /50/);
      await first.getByRole('button', { name: '매트 기본 수업 삭제', exact: true }).click();
      await first.getByRole('button', { name: '취소', exact: true }).click();
      assert.equal(
        await first
          .getByRole('button', { name: '매트 기본 수업 삭제', exact: true })
          .evaluate((e) => e === document.activeElement),
        true,
      );
      await first.getByRole('button', { name: '매트 기본 수업 삭제', exact: true }).click();
      await second.getByRole('button', { name: /더보기$/ }).click();
      assert.equal(
        await first.getByRole('region', { name: '시퀀스 삭제 확인', exact: true }).count(),
        0,
      );
      await second.getByRole('button', { name: /접기$/ }).click();
      assert.deepEqual(await state(), before);
      // Existing log entry still opens; cancel without writing.
      await first.getByRole('button', { name: '이미 진행한 수업 기록하기', exact: true }).click();
      await page.getByRole('dialog').waitFor();
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
      assert.deepEqual(await state(), before);
      await first.getByRole('button', { name: '복제', exact: true }).click();
      const copy = card('매트 기본 수업 (복사)');
      await copy.waitFor();
      assert.equal(
        await first.getByRole('button', { name: /접기$/ }).getAttribute('aria-expanded'),
        'true',
      );
      await copy.getByRole('button', { name: /더보기$/ }).click();
      await copy.getByRole('button', { name: '매트 기본 수업 (복사) 삭제', exact: true }).click();
      await copy.getByRole('button', { name: '삭제 확인', exact: true }).click();
      await copy.waitFor({ state: 'hidden' });
      assert.equal(
        await first
          .getByRole('button', { name: '불러오기', exact: true })
          .evaluate((e) => e === document.activeElement),
        true,
      );
      const search = page.getByRole('textbox', { name: '저장한 시퀀스 검색', exact: true });
      await search.fill('상체');
      await second.waitFor();
      assert.equal(
        await second.getByRole('button', { name: /더보기$/ }).getAttribute('aria-expanded'),
        'false',
      );
      await search.fill('없는 이름');
      await page.getByRole('button', { name: '검색 지우기', exact: true }).click();
      await first.waitFor();
      const after = await state();
      assert.deepEqual(after, before);
      await page.reload();
      await page.evaluate(async () => {
        const { usePilatesStore } = await import('/src/store/usePilatesStore.ts');
        usePilatesStore.getState().setActiveTab('binder');
      });
      await first.waitFor();
      assert.equal(
        await first.getByRole('button', { name: /더보기$/ }).getAttribute('aria-expanded'),
        'false',
      );
      assert.deepEqual(await state(), before);
      assert.deepEqual(errors, []);
      results.push({
        ...spec,
        closedHeight: beforeHeight,
        expandedHeight,
        overflow: 0,
        errors,
        checks:
          'keyboard/toggle/Escape, print3close/focus, export, deletion/cancel/focus, logcancel, copy/sort/delete, search, reload preservation',
      });
      console.log('PASS', label);
      await context.close();
    }
    fs.writeFileSync(
      path.join(__dirname, 'browser-results.json'),
      JSON.stringify(results, null, 2),
    );
    console.log(JSON.stringify(results));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
