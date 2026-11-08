const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const phase = process.argv[2] || 'before';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [];
  try {
    for (const width of [320, 390, 768, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: width === 768 ? 1024 : 900 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(process.env.SCHEDULE_QA_URL || 'http://127.0.0.1:5298');
      await page.evaluate(async () => {
        const { usePilatesStore } = await import('/src/store/usePilatesStore.ts');
        const { localScheduleDate, scheduleDateObject } = await import('/src/utils/instructorSchedule.ts');
        const date = localScheduleDate();
        usePilatesStore.setState({ activeTab: 'schedule', generationError: null, instructorSchedule: {
          locations: [{ id: 'qa-place', alias: '연습 스튜디오', equipmentIds: ['mat'], propIds: [], notes: '' }],
          classes: [
            { id: 'qa-a', title: '아침을 여는 매트 필라테스', participantAlias: '기초반', locationId: 'qa-place', startDate: date, untilDate: date, weekdays: [scheduleDateObject(date).getDay()], recurrence: 'weekly', startTime: '09:00', endTime: '09:50', notes: '' },
            { id: 'qa-b', title: '움직임과 호흡을 차분하게 연결하는 저녁 수업', participantAlias: '저녁반', locationId: 'qa-place', startDate: date, weekdays: [], recurrence: 'once', startTime: '18:00', endTime: '18:50', notes: '' }
          ], exceptions: []
        }, datedSequencePlanning: { assignments: [] } });
      });
      await page.getByRole('heading', { name: '강사 일정', exact: true }).waitFor();
      const before = await page.evaluate(async () => { const { usePilatesStore } = await import('/src/store/usePilatesStore.ts'); const s=usePilatesStore.getState(); return JSON.stringify([s.instructorSchedule,s.savedSequences,s.historyLogs,s.activeSteps,s.datedSequencePlanning]); });
      await page.screenshot({ path: path.join(__dirname, `${phase}-${width}.png`), fullPage: true });
      const metrics = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth, cards: document.querySelectorAll('.schedule-class').length }));
      assert.equal(metrics.overflow, 0);
      if (phase !== 'before') {
        assert.equal(await page.locator('.schedule-week-strip button').count(), 7);
        const selected = page.locator('.schedule-week-strip [aria-pressed="true"]');
        await selected.focus();
        await page.keyboard.press('ArrowLeft');
        assert.equal(await page.locator('.schedule-week-strip [aria-pressed="true"]').evaluate(e => e === document.activeElement), true);
        await page.getByRole('button', { name: '오늘로', exact: true }).click();
        await page.getByRole('button', { name: '주간 보기', exact: true }).click();
        await page.screenshot({ path: path.join(__dirname, `week-${width}.png`), fullPage: true });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
        await page.getByRole('button', { name: '일간 보기', exact: true }).click();
        for (let n = 0; n < 2; n++) {
          const opener = page.getByRole('button', { name: '수업 추가', exact: true });
          await opener.click();
          await page.getByRole('dialog').waitFor();
          await page.keyboard.press('Escape');
          assert.equal(await page.getByRole('dialog').count(), 0);
          assert.equal(await opener.evaluate(e => e === document.activeElement), true);
        }
        await page.getByRole('button', { name: '월간 준비 보기', exact: true }).click();
        await page.getByRole('dialog', { name: '주·월 시퀀스 계획', exact: true }).waitFor();
        await page.keyboard.press('Escape');
        assert.equal(await page.getByRole('dialog').count(), 0);
        const after = await page.evaluate(async () => { const { usePilatesStore } = await import('/src/store/usePilatesStore.ts'); const s=usePilatesStore.getState(); return JSON.stringify([s.instructorSchedule,s.savedSequences,s.historyLogs,s.activeSteps,s.datedSequencePlanning]); });
        assert.equal(after, before);
        await page.evaluate(async () => {
          const { usePilatesStore } = await import('/src/store/usePilatesStore.ts');
          usePilatesStore.setState({ instructorSchedule: { locations: [], classes: [], exceptions: [] } });
        });
        await page.getByRole('heading', { name: '수업할 장소를 먼저 등록해 주세요', exact: true }).waitFor();
        await page.screenshot({ path: path.join(__dirname, `empty-${width}.png`), fullPage: true });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
        const firstLocation = page.getByRole('button', { name: '첫 장소 등록', exact: true });
        await firstLocation.click();
        await page.getByRole('dialog').waitFor();
        await page.keyboard.press('Escape');
        assert.equal(await page.getByRole('dialog').count(), 0);
        assert.equal(await firstLocation.evaluate(e => e === document.activeElement), true);
      }
      assert.deepEqual(errors, []);
      results.push({ width, ...metrics, errors, interactionChecks: phase !== 'before' });
      await context.close();
    }
    fs.writeFileSync(path.join(__dirname, `${phase}.json`), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
