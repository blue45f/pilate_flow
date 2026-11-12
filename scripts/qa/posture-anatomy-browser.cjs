const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.BASE_URL || 'http://127.0.0.1:5278';
const { artifactDirectory } = require('./artifact-directory.cjs');
const out = artifactDirectory(process.env.OUT_DIR);
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [];
  try {
    for (const width of [320, 390, 768, 1440]) {
      const context = await browser.newContext({
        viewport: { width, height: 920 },
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(base);
      await page.getByRole('button', { name: '동작 고르기', exact: true }).click();
      await page.evaluate(async () => {
        const { usePilatesStore } = await import('/src/store/usePilatesStore.ts');
        const { ORIGINAL_MOVEMENTS } = await import('/src/data/originalMovements.ts');
        const original = ORIGINAL_MOVEMENTS.find((item) => item.id === 'original-mat-bridge');
        const item = {
          ...original,
          id: 'visual-guide-qa-bridge',
          nameKo: '시각 확인 브리지',
          targetMuscles: ['대둔근', '햄스트링', '척추분절근'],
          spinalPlanes: ['flexion', 'extension'],
        };
        usePilatesStore.setState({
          exercises: [item, ...ORIGINAL_MOVEMENTS],
          activeSteps: [],
          historyLogs: [],
          activeTab: 'atlas',
        });
      });
      await page
        .getByRole('searchbox', { name: '동작 검색', exact: true })
        .fill('시각 확인 브리지');
      await page.getByRole('button', { name: '시각 확인 브리지', exact: true }).click();
      const inspector = page.getByRole('complementary', { name: '선택한 동작 정보' });
      const panel = inspector.getByRole('region', { name: '자세·부위 한눈에' });
      await panel.waitFor();
      await panel.scrollIntoViewIfNeeded();
      assert.equal(await panel.getByRole('img').count(), 2);
      assert.ok((await panel.innerText()).includes('대둔근'));
      assert.ok((await panel.innerText()).includes('햄스트링'));
      assert.ok(await panel.evaluate((e) => e.scrollWidth <= e.clientWidth + 1));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await panel.screenshot({ path: path.join(out, `inspector-${width}.png`) });
      const orientations = [
        'supine',
        'prone',
        'side-lying',
        'seated',
        'kneeling',
        'standing',
        'quadruped',
      ];
      for (const position of orientations) {
        await page.evaluate(async (bodyPosition) => {
          const { usePilatesStore } = await import('/src/store/usePilatesStore.ts');
          const store = usePilatesStore.getState();
          usePilatesStore.setState({
            exercises: store.exercises.map((item) =>
              item.id === 'visual-guide-qa-bridge' ? { ...item, bodyPosition } : item,
            ),
          });
        }, position);
        assert.equal(await panel.getByRole('img', { name: /자세 방향 예시/ }).count(), 1);
        assert.ok(await panel.evaluate((e) => e.scrollWidth <= e.clientWidth + 1));
        if (width === 390 && position === 'seated')
          await panel.screenshot({ path: path.join(out, 'seated-390.png') });
      }
      await page.evaluate(async () => {
        const { usePilatesStore } = await import('/src/store/usePilatesStore.ts');
        const store = usePilatesStore.getState();
        usePilatesStore.setState({
          exercises: store.exercises.map((item) =>
            item.id === 'visual-guide-qa-bridge' ? { ...item, bodyPosition: 'supine' } : item,
          ),
        });
      });

      const before = await page.evaluate(async () => {
        const { usePilatesStore } = await import('/src/store/usePilatesStore.ts');
        const { exercises, activeSteps, historyLogs } = usePilatesStore.getState();
        return JSON.stringify({ exercises, activeSteps, historyLogs });
      });
      const summary = panel.locator('summary');
      await summary.focus();
      await page.keyboard.press('Enter');
      assert.ok(await panel.locator('details').evaluate((e) => e.open));
      assert.ok((await panel.innerText()).includes('특정 해부학 근육명으로 확정하지 않음'));
      await page.keyboard.press('Enter');
      assert.equal(await panel.locator('details').evaluate((e) => e.open), false);
      await inspector.getByRole('button', { name: '전체 정보·개인 검토 열기' }).click();
      const dialog = page.getByRole('dialog').last();
      await dialog.getByTestId('detail-posture-anatomy-drawer').locator(':scope > summary').click();
      const detail = dialog.getByRole('region', { name: '자세·부위 한눈에' });
      await detail.scrollIntoViewIfNeeded();
      assert.ok(await detail.evaluate((e) => e.scrollWidth <= e.clientWidth + 1));
      await detail.screenshot({ path: path.join(out, `detail-${width}.png`) });
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(
        await page.evaluate(async () => {
          const { usePilatesStore } = await import('/src/store/usePilatesStore.ts');
          const { exercises, activeSteps, historyLogs } = usePilatesStore.getState();
          return JSON.stringify({ exercises, activeSteps, historyLogs });
        }),
        before,
      );
      await inspector.getByRole('button', { name: '선택한 동작 정보 닫기' }).click();
      assert.ok(
        await page
          .getByRole('button', { name: '시각 확인 브리지', exact: true })
          .evaluate((e) => e === document.activeElement),
      );
      assert.deepEqual(errors, []);
      results.push({
        width,
        panelNoOverflow: true,
        allSevenPostures: true,
        documentNoOverflow: true,
        keyboardDisclosure: true,
        fullDetail: true,
        escapeClose: true,
        focusRestored: true,
        planAndHistoryUnchanged: true,
        pageErrors: errors,
      });
      await context.close();
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
