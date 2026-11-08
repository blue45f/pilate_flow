const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { artifactDirectory } = require('./artifact-directory.cjs');
(async () => {
  const out = artifactDirectory(process.env.OUT_DIR);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [];
  try {
    for (const width of [320, 390, 768, 1440]) {
      const touch = width === 390;
      const context = await browser.newContext({
        viewport: { width, height: 844 },
        hasTouch: touch,
        isMobile: touch,
        reducedMotion: 'reduce',
      });
      let failStudy = true;
      let documentRequests = 0;
      let rejectedModules = 0;
      await context.route('**/*', (route) => {
        const url = new URL(route.request().url());
        if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
        if (route.request().isNavigationRequest()) documentRequests++;
        if (failStudy && url.pathname.endsWith('/InstructorStudyDialog.tsx')) {
          rejectedModules++;
          return route.fulfill({
            status: 503,
            contentType: 'text/plain',
            body: 'Synthetic QA loading failure',
          });
        }
        return route.continue();
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const activate = (locator) => (touch ? locator.tap() : locator.click());
      const openStudy = async () => {
        if (width < 1024)
          await activate(page.getByRole('button', { name: '메뉴 열기', exact: true }));
        await activate(page.getByRole('button', { name: '강사 연습실과 사용법', exact: true }));
      };
      try {
        await page.goto(process.env.BASE_URL || 'http://127.0.0.1:5286');
        await page.locator('#workspace-main-heading').waitFor();
        // Create only synthetic local data inside a fresh browser context.
        await page.evaluate(async () => {
          const { usePilatesStore } = await import('/src/store/usePilatesStore.ts');
          const state = usePilatesStore.getState();
          const exercise = state.exercises.find((item) => item.nameKo === '골반 시계');
          state.appendExerciseToSequence(exercise.id);
          state.updateStepNote(0, '합성 오류 복구 메모');
          state.saveCurrentSequenceToBinder();
        });
        const before = await page.evaluate(() =>
          localStorage.getItem('pilates-flow-atelier-storage-v3'),
        );
        await openStudy();
        const errorDialog = page.getByRole('dialog', {
          name: '강사 연습실을 열지 못했어요',
          exact: true,
        });
        await errorDialog.waitFor();
        assert.equal(rejectedModules, 1);
        assert.equal(documentRequests, 1, 'recovery must not reload automatically');
        assert.ok(await page.locator('#workspace-main-heading').count());
        assert.ok(await errorDialog.getByRole('alert').isVisible());
        assert.ok(await errorDialog.getByText(/적용 전 입력 내용이 사라질 수/).isVisible());
        assert.ok(!(await errorDialog.innerText()).includes('InstructorStudyDialog.tsx'));
        assert.equal(
          await page.evaluate(() => localStorage.getItem('pilates-flow-atelier-storage-v3')),
          before,
        );
        for (const action of ['닫고 계속하기', '페이지 새로고침']) {
          const box = await errorDialog
            .getByRole('button', { name: action, exact: true })
            .boundingBox();
          assert.ok(
            box.width >= 44 && box.height >= 44 && box.x >= 0 && box.x + box.width <= width + 1,
          );
        }
        assert.ok(
          await errorDialog.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
        );
        await page.screenshot({ path: `${out}/recovery-${width}.png` });
        await activate(errorDialog.getByRole('button', { name: '닫고 계속하기', exact: true }));
        await errorDialog.waitFor({ state: 'hidden' });
        assert.ok(await page.locator('#workspace-main-heading').isVisible());
        assert.ok(
          await page.evaluate(() => {
            const active = document.activeElement;
            return (
              active !== document.body &&
              active?.getClientRects().length > 0 &&
              !active.closest('[inert]')
            );
          }),
        );
        assert.equal(
          await page.evaluate(() => localStorage.getItem('pilates-flow-atelier-storage-v3')),
          before,
        );
        // A rejected React.lazy import is cached until reload, so do not offer a misleading retry.
        await openStudy();
        await errorDialog.waitFor();
        assert.equal(documentRequests, 1);
        failStudy = false;
        await Promise.all([
          page.waitForNavigation(),
          activate(errorDialog.getByRole('button', { name: '페이지 새로고침', exact: true })),
        ]);
        await page.locator('#workspace-main-heading').waitFor();
        assert.equal(documentRequests, 2);
        const restored = await page.evaluate(
          () => JSON.parse(localStorage.getItem('pilates-flow-atelier-storage-v3')).state,
        );
        const previous = JSON.parse(before).state;
        for (const key of [
          'activeSteps',
          'savedSequences',
          'historyLogs',
          'classGroups',
          'exercises',
          'instructorSchedule',
        ])
          assert.deepEqual(restored[key], previous[key], key);
        await openStudy();
        await page.getByRole('dialog', { name: '강사 연습실', exact: true }).waitFor();
        await activate(page.getByRole('button', { name: '동작 숙지', exact: true }));
        assert.ok(await page.getByRole('searchbox', { name: '연습할 동작 검색' }).isVisible());
        assert.equal(errors.length, 0, JSON.stringify(errors));
        results.push({
          width,
          touch,
          containedLoadFailure: true,
          closeKeepsPlan: true,
          noAutomaticReload: true,
          explicitReloadRecovers: true,
          protectedDataUnchanged: true,
          pageErrors: errors,
        });
      } catch (error) {
        await page.screenshot({ path: `${out}/failure-${width}.png` });
        console.error('Recovery scenario failed', width, 'artifacts', out);
        throw error;
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2));
  console.log(out, results);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
