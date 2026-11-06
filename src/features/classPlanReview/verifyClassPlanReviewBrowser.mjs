#!/usr/bin/env node
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import artifactDirectories from '../../../scripts/qa/artifact-directory.cjs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = new URL(process.env.CLASS_REVIEW_BASE_URL || 'http://127.0.0.1:5257');
assert.ok(
  ['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname),
  'Use a local fixture server, never production',
);
const url = new URL('/src/features/classPlanReview/browserFixture.html', base).href;
const out = artifactDirectories.artifactDirectory(process.env.CLASS_REVIEW_OUT);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || 'chrome',
  headless: true,
});
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
    try {
      await page.goto(url);
      await page.getByTestId('class-plan-review-harness').waitFor();
      assert.equal(
        await page.evaluate(() => window.__classPlanReviewFixture__.revision),
        'boundary-hardening-v1',
      );
      await page.evaluate(() =>
        localStorage.setItem('class-review-test-marker', JSON.stringify({ steps: ['unchanged'] })),
      );
      const beforeStorage = await page.evaluate(() =>
        JSON.stringify(Object.fromEntries(Object.entries(localStorage))),
      );
      const presets = await page
        .locator('[data-testid^="fixture-preset-"]')
        .evaluateAll((nodes) =>
          nodes.filter((node) => node.tagName === 'BUTTON').map((node) => node.dataset.testid),
        );
      assert.equal(presets.length, 6);
      for (const preset of presets) {
        await page.getByTestId(preset).click();
        await page.waitForFunction(
          (id) =>
            document.querySelector(`[data-testid="${id}"]`)?.getAttribute('aria-pressed') ===
            'true',
          preset,
        );
        const dimensions = await page.evaluate(() => ({
          viewport: innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          offenders: [
            ...document.querySelectorAll(
              '.cpr-section, .cpr-metric-card, .cpr-item-card, .cpr-issue-card',
            ),
          ].filter((node) => node.scrollWidth > node.clientWidth + 1).length,
        }));
        assert.ok(
          dimensions.documentWidth <= dimensions.viewport + 1,
          `${width}/${preset}: document overflow`,
        );
        assert.equal(dimensions.offenders, 0, `${width}/${preset}: content overflow`);
        const targets = await page.locator('button').evaluateAll((nodes) =>
          nodes
            .filter((node) => node.getBoundingClientRect().height > 0)
            .map((node) => ({
              h: node.getBoundingClientRect().height,
              w: node.getBoundingClientRect().width,
            })),
        );
        assert.ok(
          targets.every((target) => target.h >= 43.9 && target.w >= 43.9),
          `${width}/${preset}: touch target below 44px`,
        );
      }
      await page.getByTestId('fixture-preset-normal-30min').click();
      await page.getByTestId('review-tab-all').focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(
        await page.getByTestId('review-tab-timing').getAttribute('aria-selected'),
        'true',
      );
      await page.keyboard.press('End');
      assert.equal(
        await page.getByTestId('review-tab-input-diagnostic').getAttribute('aria-selected'),
        'true',
      );
      await page.keyboard.press('Home');
      assert.equal(await page.getByTestId('review-tab-all').getAttribute('aria-selected'), 'true');
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: resolve(out, `normal-${width}.png`) });
      const partial = await page.evaluate(() =>
        window.__classPlanReviewFixture__.showSource({
          title: '부분 합계 검증',
          targetMinutes: 1,
          steps: [{ stepId: 'known', nameKo: '입력한 동작', durationMin: 1 }, null],
        }),
      );
      assert.equal(partial.timing.isPartialTotal, true);
      assert.equal(partial.timing.exactTargetMatch, false);
      await page.getByText('부분 합계 검증', { exact: true }).waitFor();
      const timing = await page.getByTestId('review-timing-section').innerText();
      assert.ok(timing.includes('부분 합계'));
      assert.ok(!/정확히 일치|목표보다.*부족|목표.*대비.*부족/.test(timing));
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: resolve(out, `partial-${width}.png`) });
      await page.evaluate(() => {
        window.__lastReviewScrollBehavior = null;
        const original = Element.prototype.scrollIntoView;
        Element.prototype.scrollIntoView = function (options) {
          window.__lastReviewScrollBehavior = options?.behavior;
          return original.call(this, options);
        };
        window.__classPlanReviewFixture__.showTwo({
          title: '동일 ID 두 미리보기',
          steps: [{ stepId: 'same', nameKo: '입력 확인 동작', durationMin: -1 }],
        });
      });
      await page.waitForFunction(
        () => document.querySelectorAll('[data-testid="class-plan-review-preview"]').length === 2,
      );
      const roots = page.getByTestId('class-plan-review-preview');
      const second = roots.nth(1);
      await second.getByTestId('jump-to-item-same').first().click();
      assert.equal(
        await second
          .getByTestId('review-item-same')
          .evaluate((node) => node === document.activeElement),
        true,
      );
      assert.equal(await page.evaluate(() => window.__lastReviewScrollBehavior), 'auto');
      assert.equal(
        await page.evaluate(() => {
          const ids = [...document.querySelectorAll('[id]')].map((node) => node.id);
          return new Set(ids).size === ids.length;
        }),
        true,
      );
      const afterStorage = await page.evaluate(() =>
        JSON.stringify(Object.fromEntries(Object.entries(localStorage))),
      );
      assert.equal(afterStorage, beforeStorage);
      assert.deepEqual(errors, []);
      results.push({
        width,
        presets: 6,
        overflow: false,
        minimumTouchTargetPx: 44,
        keyboardTabs: true,
        partialTotalTruthful: true,
        exactItemJump: true,
        multipleInstanceIdsUnique: true,
        reducedMotionScroll: 'auto',
        localStorageUnchanged: true,
        errors,
      });
    } finally {
      await context.close();
    }
  }
  await writeFile(resolve(out, 'results.json'), JSON.stringify({ passed: true, results }, null, 2));
  console.log(JSON.stringify({ passed: true, results }, null, 2));
} catch (error) {
  await writeFile(resolve(out, 'failure.txt'), String(error.stack || error));
  throw error;
} finally {
  await browser.close();
}
