const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { artifactDirectory } = require('./artifact-directory.cjs');

const base = process.env.BASE_URL || 'http://127.0.0.1:5278';
const out = artifactDirectory(process.env.OUT_DIR);
const newMotionAssets = [
  'barrel-spinecorrector',
  'chair-swan',
  'reformer-feetstraps',
  'reformer-jumpboard',
].flatMap((family) => ['start', 'peak'].map((pose) => `/motion-studio3d/${family}-${pose}.png`));

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [];
  try {
    for (const width of [320, 390, 768, 1440]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const mainNavigation = page.locator(width < 900 ? '.bottom-nav' : '.desktop-nav');
      const navigate = async (label) => {
        const desktopLabels = {
          수업: '오늘의 수업',
          동작: '동작 라이브러리',
          일정: '강사 일정',
          저장: '저장한 플로우',
        };
        const name = width < 900 ? label : desktopLabels[label];
        await mainNavigation.getByRole('button', { name: new RegExp(`^${name}`) }).click();
        await page.locator('#workspace-main-heading').waitFor();
      };
      const capture = async (name) => {
        assert.ok(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          `${name}: horizontal overflow at ${width}px`,
        );
        await page.screenshot({ path: path.join(out, `${name}-${width}.png`) });
      };

      try {
        await page.goto(base, { waitUntil: 'networkidle' });
        await mainNavigation.waitFor();
        await capture('home');
        await navigate('동작');
        await page.getByRole('searchbox', { name: '동작 검색', exact: true }).fill('골반시계');
        await page.getByRole('button', { name: '골반 시계', exact: true }).click();
        const inspector = page.getByRole('complementary', { name: '선택한 동작 정보' });
        await inspector.getByTestId('detail-movement-intent-banner').waitFor();
        assert.ok(await inspector.getByTestId('inspector-fact-distinction').isVisible());
        await capture('movement');
        await inspector.getByRole('button', { name: '전체 정보·개인 검토 열기' }).click();
        const dialog = page.getByRole('dialog').last();
        await dialog.getByTestId('detail-movement-intent-banner').waitFor();
        await dialog.getByTestId('studio-3d-motion-hero-card').waitFor();
        await capture('detail');
        await page.keyboard.press('Escape');
        await dialog.waitFor({ state: 'hidden' });
        await inspector
          .getByRole('button', { name: '선택한 동작 수업안에 추가', exact: true })
          .click();
        await navigate('수업');
        await page.getByRole('button', { name: /순서·시간 확인/ }).click();
        await page.getByTestId('visual-sequence-filmstrip').waitFor();
        await capture('sequence');
        await navigate('일정');
        await capture('schedule');
        await navigate('저장');
        await capture('saved');
        const historySwitch = page.getByRole('navigation', { name: '저장한 수업과 진행 기록' });
        await historySwitch.getByRole('button', { name: '수업 기록', exact: true }).click();
        await page.getByTestId('teaching-balance-insight-card').waitFor();
        assert.ok(
          (await historySwitch
            .getByRole('button', { name: '수업 기록', exact: true })
            .getAttribute('aria-pressed')) === 'true',
        );
        await capture('history');
        for (const asset of newMotionAssets) {
          const response = await context.request.get(new URL(asset, base).href);
          assert.equal(response.status(), 200, asset);
          assert.match(response.headers()['content-type'], /image\/png/, asset);
          assert.equal(
            (await response.body()).subarray(0, 8).toString('hex'),
            '89504e470d0a1a0a',
            asset,
          );
          assert.ok(
            (await response.body()).equals(
              fs.readFileSync(path.resolve(__dirname, '../../public', asset.slice(1))),
            ),
            `Deployed PNG differs from the verified source: ${asset}`,
          );
        }
        assert.deepEqual(errors, [], `Browser errors at ${width}px`);
        results.push({
          width,
          passed: true,
          screens: 7,
          newMotionAssets: newMotionAssets.length,
          errors,
        });
      } catch (error) {
        await page.screenshot({ path: path.join(out, `failure-${width}.png`), fullPage: true });
        fs.writeFileSync(path.join(out, `failure-${width}.html`), await page.content());
        throw error;
      } finally {
        await context.close();
      }
    }
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ base, results }, null, 2));
    console.log(JSON.stringify({ base, out, results }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
