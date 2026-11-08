const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.BASE_URL || 'http://127.0.0.1:5194';
const out = process.env.OUT_DIR || '/tmp/pilates-log-modal-visible-flow';
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_EXECUTABLE || undefined,
  });
  const results = [];
  try {
    for (const [width, height] of [
      [320, 568],
      [390, 844],
      [768, 1024],
      [1440, 1000],
    ]) {
      const context = await browser.newContext({
        viewport: { width, height },
        timezoneId: 'Asia/Seoul',
        reducedMotion: 'reduce',
        serviceWorkers: 'block',
      });
      const p = await context.newPage();
      await p.route('**/*', (r) => (r.request().url().startsWith(base) ? r.continue() : r.abort()));
      await p.goto(base);
      await p.evaluate(async () => {
        const { usePilatesStore: s } = await import('/src/store/usePilatesStore.ts');
        const { syntheticPlanningExercise: f } = await import('/src/test/planningFixtures.ts');
        const e = f('mat', 'warmup');
        s.setState({
          activeSequenceId: 'visible-modal-qa',
          activeTitle: '저장한 수업 실제 진입 · 합성 QA',
          activeSubtitle: '',
          activeApparatus: 'mat',
          activeLevel: '1.5',
          activeTargetMinutes: 2,
          activeSteps: [
            {
              stepId: 'visible-qa-step',
              exerciseId: e.id,
              order: 1,
              durationMin: 2,
              explanationSec: 0,
              transitionSec: 0,
              selectedLayer: 'standard',
              blockCategory: 'warmup',
            },
          ],
          exercises: [e],
          classGroups: [
            {
              id: 'visible-qa-group',
              name: '합성 QA 그룹',
              type: 'group',
              defaultLevel: '1.5',
              scheduleLabel: '',
              notes: '',
            },
          ],
          activeTargetGroupId: 'visible-qa-group',
          historyLogs: [],
          savedSequences: [],
          persistenceError: null,
        });
        s.getState().saveCurrentSequenceToBinder();
        s.setState({ activeTab: 'binder' });
      });
      const trigger = p.getByRole('button', { name: '이미 진행한 수업 기록하기', exact: true });
      await trigger.waitFor({ state: 'visible' });
      assert(await trigger.isVisible());
      await trigger.click();
      const d = p.getByRole('dialog', { name: '수업 기록 남기기' });
      await d.waitFor();
      await p.keyboard.press('Escape');
      await d.waitFor({ state: 'hidden' });
      assert(await trigger.evaluate((e) => e === document.activeElement));
      await trigger.click();
      await d.waitFor();
      await d.locator('input[type=date]').fill('2026-11-06');
      await d
        .getByRole('textbox', { name: '다음 수업을 위한 메모 (선택)', exact: true })
        .fill('실제 보이는 버튼으로 진입한 합성 기록\n두 번째 줄 보존');
      await d.getByRole('combobox', { name: '강사의 수업 평가', exact: true }).selectOption('4');
      const geometries = await d.evaluate((e) => {
        const c = e.querySelector('.class-log-content').getBoundingClientRect(),
          f = e.querySelector('.class-log-footer').getBoundingClientRect(),
          b = [...e.querySelectorAll('button')].find((x) =>
            x.textContent.includes('수업 기록 저장'),
          ),
          r = b.getBoundingClientRect();
        return {
          width: innerWidth,
          dialogWidth: e.getBoundingClientRect().width,
          contentBottom: c.bottom,
          footerTop: f.top,
          save: {
            top: r.top,
            bottom: r.bottom,
            height: r.height,
            hit: b.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)),
          },
          overflow: e.scrollWidth - e.clientWidth,
        };
      });
      assert(geometries.dialogWidth <= width + 1);
      assert(geometries.overflow <= 1);
      assert(geometries.contentBottom <= geometries.footerTop + 1);
      assert(
        geometries.save.top >= 0 &&
          geometries.save.bottom <= height &&
          geometries.save.height >= 44 &&
          geometries.save.hit,
      );
      await p.screenshot({ path: `${out}/before-save-${width}.png` });
      await d.getByRole('button', { name: '수업 기록 저장', exact: true }).click();
      await d.waitFor({ state: 'hidden' });
      const stored = await p.evaluate(async () => {
        const s = (await import('/src/store/usePilatesStore.ts')).usePilatesStore.getState();
        return { logs: s.historyLogs, plans: s.savedSequences };
      });
      assert.equal(stored.logs.length, 1);
      assert.equal(stored.logs[0].actualDurationSec, undefined);
      assert.equal(stored.logs[0].programSnapshot.taughtDate, '2026-11-06');
      assert.equal(stored.logs[0].programSnapshot.dateOnly, true);
      assert.equal(stored.logs[0].rating, 4);
      assert.equal(stored.plans.length, 1);
      assert.equal(
        stored.logs[0].instructorReflection,
        '실제 보이는 버튼으로 진입한 합성 기록\n두 번째 줄 보존',
      );
      await p.reload();
      await p
        .getByRole('button', { name: /^(기록|수업 기록)$/ })
        .first()
        .click();
      await p
        .getByRole('heading', { name: /수업 기록/ })
        .first()
        .waitFor();
      const reread = await p.evaluate(async () => {
        const s = (await import('/src/store/usePilatesStore.ts')).usePilatesStore.getState();
        return { logs: s.historyLogs, plans: s.savedSequences };
      });
      assert.deepEqual(JSON.parse(JSON.stringify(reread)), JSON.parse(JSON.stringify(stored)));
      await p.getByRole('button', { name: '이력 다시 열기', exact: true }).click();
      const history = p
        .getByRole('dialog')
        .filter({ has: p.getByText('실제 보이는 버튼으로 진입한 합성 기록', { exact: false }) });
      assert.equal(await history.count(), 1);
      await p.screenshot({ path: `${out}/history-reopened-${width}.png` });
      await p.keyboard.press('Escape');
      await p
        .getByRole('button', { name: /^(저장|저장한 플로우)$/ })
        .first()
        .click();
      await p.getByRole('button', { name: '수업 시작', exact: true }).click();
      await p.getByRole('button', { name: '수업 시작', exact: true }).click();
      await p.waitForTimeout(1300);
      await p.getByRole('button', { name: '종료 / 기록', exact: true }).click();
      const review = p.getByRole('dialog', { name: '수업 진행을 마칠까요?' });
      await review.getByRole('button', { name: '검토하고 기록하기', exact: true }).click();
      await d.waitFor();
      const measured =
        Number(await d.getByRole('spinbutton', { name: '분', exact: true }).inputValue()) * 60 +
        Number(await d.getByRole('spinbutton', { name: '초', exact: true }).inputValue());
      assert(measured >= 1 && measured < 10);
      assert(await d.getByRole('checkbox').isChecked());
      await d
        .getByRole('textbox', { name: '다음 수업을 위한 메모 (선택)', exact: true })
        .fill('타이머 경유 합성 기록');
      await p.screenshot({ path: `${out}/stage-to-record-${width}.png` });
      await d.getByRole('button', { name: '수업 기록 저장', exact: true }).click();
      await d.waitFor({ state: 'hidden' });
      const timed = await p.evaluate(
        async () =>
          (await import('/src/store/usePilatesStore.ts')).usePilatesStore.getState().historyLogs,
      );
      assert.equal(timed.length, 2);
      const actual = timed.find((x) => x.instructorReflection === '타이머 경유 합성 기록');
      assert.equal(actual.actualDurationSec, measured);
      assert.equal(actual.actualRestDurationSec, 0);
      assert.equal(actual.stepsSnapshot.length, 1);
      await p.reload();
      const timedReload = await p.evaluate(
        async () =>
          (await import('/src/store/usePilatesStore.ts')).usePilatesStore.getState().historyLogs,
      );
      assert.deepEqual(JSON.parse(JSON.stringify(timedReload)), JSON.parse(JSON.stringify(timed)));
      results.push({
        width,
        height,
        visibleEntry: true,
        escapeFocusRestored: true,
        savedExactReload: true,
        historyReopened: true,
        stageTimerToRecord: true,
        measuredSecondsPreserved: measured,
        ...geometries,
      });
      await context.close();
    }
    fs.writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results));
    console.log(
      'PASS visible saved-class entry, Escape focus return, footer hit target, date-only + no invented duration, exact save/reload, history reopen, four viewports',
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
