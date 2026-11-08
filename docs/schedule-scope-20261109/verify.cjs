const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const dir = __dirname;
const url = process.env.SCHEDULE_QA_URL || 'http://127.0.0.1:5285';
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
      await context.route('**/*', (route) =>
        route.request().url().startsWith(new URL(url).origin) ||
        route.request().url().startsWith('data:')
          ? route.continue()
          : route.abort(),
      );
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(url);
      const dates = await page.evaluate(async () => {
        const { usePilatesStore } = await import('/src/store/usePilatesStore.ts');
        const { localScheduleDate, addScheduleDays, scheduleDateObject } =
          await import('/src/utils/instructorSchedule.ts');
        const date = localScheduleDate();
        const future = addScheduleDays(date, 7);
        const moved = addScheduleDays(date, 8);
        usePilatesStore.setState({
          activeTab: 'schedule',
          generationError: null,
          instructorSchedule: {
            locations: [
              {
                id: 'qa-place',
                alias: '연습 스튜디오',
                equipmentIds: ['mat'],
                propIds: [],
                notes: '',
              },
            ],
            classes: [
              {
                id: 'qa-a',
                title: '아침을 여는 매트 필라테스',
                participantAlias: '기초반',
                locationId: 'qa-place',
                startDate: date,
                untilDate: addScheduleDays(date, 28),
                weekdays: [scheduleDateObject(date).getDay()],
                recurrence: 'weekly',
                startTime: '09:00',
                endTime: '09:50',
                notes: '',
              },
              {
                id: 'qa-b',
                title: '저녁 수업',
                participantAlias: '저녁반',
                locationId: 'qa-place',
                startDate: date,
                weekdays: [],
                recurrence: 'once',
                startTime: '18:00',
                endTime: '18:50',
                notes: '',
              },
            ],
            exceptions: [
              {
                id: 'moved',
                kind: 'reschedule',
                classId: 'qa-a',
                originalDate: future,
                date: moved,
                startTime: '14:00',
                endTime: '14:50',
                reason: '기존 개별 변경',
              },
            ],
          },
          datedSequencePlanning: { assignments: [] },
        });
        return { date, future, moved };
      });
      await page.getByRole('heading', { name: '강사 일정', exact: true }).waitFor();
      if (spec.text) await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
      const data = () =>
        page.evaluate(async () => {
          const { usePilatesStore } = await import('/src/store/usePilatesStore.ts');
          const s = usePilatesStore.getState();
          return {
            schedule: s.instructorSchedule,
            unrelated: JSON.stringify([
              s.savedSequences,
              s.historyLogs,
              s.activeSteps,
              s.datedSequencePlanning,
            ]),
          };
        });
      const before = await data();
      const trigger = page.getByRole('button', { name: '회차 변경', exact: true });
      await trigger.click();
      const panel = page.getByRole('complementary', { name: '회차 변경' });
      await panel.waitFor();
      await page.waitForTimeout(100);
      assert.equal(await panel.getByRole('radio', { name: /이번 회차만/ }).isChecked(), true);
      assert.equal(
        await panel.getByRole('heading').evaluate((e) => document.activeElement === e),
        true,
      );
      const metrics = await page.evaluate(() => {
        const p = document.querySelector('.schedule-change-scope').getBoundingClientRect();
        const d = document.querySelector('.schedule-days').getBoundingClientRect();
        return {
          overflow: document.documentElement.scrollWidth - innerWidth,
          panel: { x: p.x, y: p.y, w: p.width, h: p.height },
          agenda: { x: d.x, y: d.y, w: d.width, h: d.height },
        };
      });
      const headingBox = await panel.getByRole('heading').boundingBox();
      assert.ok(
        headingBox.y >= 0 && headingBox.y + headingBox.height < spec.h,
        'Opening exposes scope heading',
      );
      assert.equal(metrics.overflow, 0);
      if (spec.w >= 900) assert.ok(metrics.panel.x > metrics.agenda.x + metrics.agenda.w - 1);
      const label = `${spec.w}x${spec.h}${spec.text ? '-text200' : ''}`;
      await page.screenshot({ path: path.join(dir, `panel-${label}.png`), scale: 'css' });
      await panel.screenshot({ path: path.join(dir, `panel-detail-${label}.png`), scale: 'css' });
      await panel.getByRole('radio', { name: /이번 회차만/ }).focus();
      await page.keyboard.press('ArrowDown');
      assert.equal(await panel.getByRole('radio', { name: /반복 일정 전체/ }).isChecked(), true);
      await page.keyboard.press('ArrowUp');
      assert.equal(await panel.getByRole('radio', { name: /이번 회차만/ }).isChecked(), true);
      await panel.getByRole('button', { name: '취소', exact: true }).click();
      await page.waitForTimeout(80);
      assert.equal(await trigger.evaluate((e) => document.activeElement === e), true);
      assert.deepEqual(await data(), before);
      await trigger.click();
      await panel.getByRole('button', { name: '변경 범위 닫기' }).click();
      await page.waitForTimeout(60);
      assert.equal(await trigger.evaluate((e) => document.activeElement === e), true);
      await trigger.click();
      await panel.getByRole('heading').focus();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(60);
      assert.equal(await panel.count(), 0);
      // One occurrence: form cancellation returns focus without writes.
      await trigger.click();
      await panel.getByRole('button', { name: '다음', exact: true }).click();
      const move = page.getByRole('dialog', { name: '회차 변경' });
      await move.waitFor();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(60);
      assert.equal(await trigger.evaluate((e) => document.activeElement === e), true);
      assert.deepEqual(await data(), before);
      // Series: save time change; pre-existing individual move must survive.
      await trigger.click();
      await panel.getByRole('radio', { name: /반복 일정 전체/ }).check();
      await panel.getByRole('button', { name: '다음', exact: true }).click();
      const series = page.getByRole('dialog', { name: '수업 일정' });
      await series.waitFor();
      await series.getByLabel('시작 시각', { exact: true }).fill('10:00');
      await series.getByLabel('종료 시각', { exact: true }).fill('10:50');
      await series.getByRole('button', { name: '일정 저장', exact: true }).click();
      await series.waitFor({ state: 'hidden' });
      const afterSeries = await data();
      assert.equal(afterSeries.schedule.classes.find((c) => c.id === 'qa-a').startTime, '10:00');
      assert.deepEqual(afterSeries.schedule.exceptions, before.schedule.exceptions);
      assert.equal(afterSeries.unrelated, before.unrelated);
      await page.getByRole('article', { name: '아침을 여는 매트 필라테스 오전 10:00' }).waitFor();
      await trigger.click();
      await panel.getByRole('button', { name: '다음', exact: true }).click();
      await move.waitFor();
      await move.getByLabel('시작 시각', { exact: true }).fill('11:00');
      await move.getByLabel('종료 시각', { exact: true }).fill('11:50');
      await move.getByRole('button', { name: '회차 변경 저장', exact: true }).click();
      await move.waitFor({ state: 'hidden' });
      await page.getByRole('article', { name: '아침을 여는 매트 필라테스 오전 11:00' }).waitFor();
      const afterMove = await data();
      assert.deepEqual(afterMove.schedule.classes, afterSeries.schedule.classes);
      assert.equal(afterMove.schedule.exceptions.length, 2);
      assert.equal(
        afterMove.schedule.exceptions.find((e) => e.originalDate === dates.date).startTime,
        '11:00',
      );
      // Week mode with scope open, unrelated navigation and stale selection.
      await page.getByRole('button', { name: '주간 보기', exact: true }).click();
      await trigger.click();
      await panel.waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
      await page.screenshot({ path: path.join(dir, `week-${label}.png`), scale: 'css' });
      await page.evaluate(async () => {
        const { usePilatesStore } = await import('/src/store/usePilatesStore.ts');
        const d = usePilatesStore.getState().instructorSchedule;
        usePilatesStore.setState({
          instructorSchedule: {
            ...d,
            classes: d.classes.map((c) =>
              c.id === 'qa-a' ? { ...c, title: '다른 기기에서 바뀐 수업' } : c,
            ),
          },
        });
      });
      await panel.getByRole('alert').waitFor();
      assert.equal(
        await panel.getByRole('button', { name: '다음', exact: true }).isDisabled(),
        true,
      );
      await panel.getByRole('button', { name: '취소', exact: true }).click();
      // Reload confirms browser persistence; open screen via real navigation if required.
      const saved = await data();
      await page.reload();
      await page.evaluate(async () => {
        const { usePilatesStore } = await import('/src/store/usePilatesStore.ts');
        usePilatesStore.getState().setActiveTab('schedule');
      });
      await page.getByRole('heading', { name: '강사 일정', exact: true }).waitFor();
      assert.deepEqual((await data()).schedule, saved.schedule);
      assert.deepEqual(errors, []);
      results.push({
        ...spec,
        ...metrics,
        errors,
        checks:
          'scope, radio arrows, cancel/X/Escape/focus, occurrence/series save, exception preservation, week, stale, reload',
      });
      console.log('PASS', label);
      await context.close();
    }
    fs.writeFileSync(path.join(dir, 'browser-results.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
