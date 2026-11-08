const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { tmpdir } = require('node:os');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');

const REPO_ROOT = path.resolve(__dirname, '../..');
const BASE_REVISION = 'ca0fef4309e5d2b416d14254579cd6ede669d1cb';

function normalizePreviewUrl(value) {
  const url = new URL(value);
  const local = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  if (!local || !['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Use a local isolated HTTP(S) preview only.');
  }
  return url;
}

function buildScenarios() {
  return ['Asia/Seoul', 'UTC'].flatMap(timezoneId =>
    [320, 390, 768, 1440].map(width => ({ timezoneId, width })));
}

// The eight isolated browser contexts intentionally run one at a time.
// Recursion keeps dependent UI operations out of an await-in-loop construct.
async function runSequentially(items, verify, index = 0, results = []) {
  if (index === items.length) return results;
  results.push(await verify(items[index]));
  return runSequentially(items, verify, index + 1, results);
}

function readRevision() {
  // Fixed executable and environment: caller PATH/GIT_* cannot redirect Git.
  return execFileSync('/usr/bin/git', ['-C', REPO_ROOT, 'rev-parse', '--verify', 'HEAD'], {
    encoding: 'utf8',
    shell: false,
    env: { PATH: '/usr/bin:/bin', LANG: 'C', GIT_OPTIONAL_LOCKS: '0' },
  }).trim();
}

async function mountDateOnlyHarness(page) {
  await page.evaluate(async () => {
    // These are same-origin Vite module URLs, not absolute filesystem imports.
    const fromPreview = relativePath => import(new URL(relativePath, location.origin).href);
    const reactModule = await fromPreview('node_modules/.vite/deps/react.js');
    const React = reactModule.createElement ? reactModule : reactModule.default;
    const domClient = await fromPreview('node_modules/.vite/deps/react-dom_client.js');
    const createRoot = domClient.createRoot || domClient.default.createRoot;
    const { usePilatesStore } = await fromPreview('src/store/usePilatesStore.ts');
    const { LogSessionModal } = await fromPreview('src/components/LogSessionModal.tsx');
    const { ClassBinderView } = await fromPreview('src/components/ClassBinderView.tsx');
    const state = usePilatesStore.getState();
    const exercise = state.exercises.find(item => item.apparatus === 'mat' && item.blockCategory === 'warmup') || state.exercises[0];
    const steps = [{
      stepId: 'periodic-date-step', order: 1, exerciseId: exercise.id,
      blockCategory: exercise.blockCategory, durationMin: 1, explanationSec: 0,
      transitionSec: 0, selectedLayer: 'standard',
    }];
    usePilatesStore.setState({
      activeSequenceId: 'periodic-date-only', activeTitle: '합성 날짜전용 검증',
      activeSteps: steps, historyLogs: [], savedSequences: [], activeTab: 'sequence',
    });
    document.getElementById('root').style.display = 'none';
    const mount = document.createElement('div');
    mount.id = 'date-only-component-harness';
    document.body.append(mount);
    const root = createRoot(mount);
    globalThis.__dateHarness = { root, React, usePilatesStore, ClassBinderView, closed: false };
    root.render(React.createElement(LogSessionModal, {
      sequenceId: 'periodic-date-only',
      context: { stepsSnapshot: steps, sequenceTitle: '합성 날짜전용 검증' },
      onClose: () => {
        globalThis.__dateHarness.closed = true;
        root.render(null);
      },
    }));
  });
}

async function saveDateOnlyRecord(page) {
  const dialog = page.getByRole('dialog', { name: '수업 기록 남기기' });
  await dialog.waitFor();
  const timeInputs = await dialog.locator('input[type="time"],input[type="datetime-local"]').count();
  assert.equal(timeInputs, 0);
  await dialog.locator('input[type="date"]').fill('2026-11-05');
  await dialog.getByRole('button', { name: '수업 기록 저장', exact: true }).click();
  await page.waitForFunction(() => globalThis.__dateHarness.closed);
  const record = await page.evaluate(() => {
    const harness = globalThis.__dateHarness;
    const log = harness.usePilatesStore.getState().historyLogs[0];
    harness.root.render(harness.React.createElement(harness.ClassBinderView, {
      onOpenLogModal: () => {}, view: 'history',
    }));
    return {
      taughtAt: log.taughtAt, dateOnly: log.dateOnly ?? null,
      timestamps: log.timestamps ?? null, snapshotDateOnly: log.programSnapshot?.dateOnly ?? null,
    };
  });
  assert.equal(record.snapshotDateOnly, true);
  await page.waitForFunction(() =>
    document.getElementById('date-only-component-harness')?.innerText.includes('합성 날짜전용 검증'));
  return { record, timeInputs };
}

async function verifyLegacyTime(page, time) {
  await page.evaluate(value => {
    const store = globalThis.__dateHarness.usePilatesStore;
    const old = structuredClone(store.getState().historyLogs[0]);
    delete old.programSnapshot.dateOnly;
    old.taughtAt = new Date('2026-11-04T' + value).toISOString();
    old.programSnapshot.taughtAt = old.taughtAt;
    store.setState({ historyLogs: [old] });
  }, time);
  const expected = time.slice(0, 5);
  await page.waitForFunction(value =>
    document.querySelector('#date-only-component-harness .teaching-history-time-of-day')?.textContent === value, expected);
  return expected;
}

async function verifyScenario(browser, previewUrl, outputDir, { timezoneId, width }) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, timezoneId });
  try {
    await context.route('**/*', route =>
      new URL(route.request().url()).origin === previewUrl.origin ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(previewUrl.href);
    await mountDateOnlyHarness(page);
    const { record, timeInputs } = await saveDateOnlyRecord(page);
    const badges = await page.locator('#date-only-component-harness .teaching-history-time-of-day').allTextContents();
    assert.deepEqual(badges, []);
    await page.screenshot({ path: path.join(outputDir, 'date-only-' + timezoneId.replace('/', '-') + '-' + width + '.png') });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    assert.equal(overflow, false);
    const noon = await verifyLegacyTime(page, '12:00:00');
    const midnight = await verifyLegacyTime(page, '00:00:00');
    assert.deepEqual(errors, []);
    return { timezoneId, width, timeInputs, record, badges, legacy: [noon, midnight], overflow, errors };
  } finally {
    await context.close();
  }
}

async function main() {
  const previewUrl = normalizePreviewUrl(process.env.BASE_URL || 'http://127.0.0.1:5264/');
  const outputDir = process.env.QA_OUTPUT_DIR || fs.mkdtempSync(path.join(tmpdir(), 'pilates-date-only-browser-'));
  const revision = readRevision();
  fs.mkdirSync(outputDir, { recursive: true });
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const results = await runSequentially(buildScenarios(),
      scenario => verifyScenario(browser, previewUrl, outputDir, scenario));
    assert.equal(readRevision(), revision, 'Repository HEAD changed during browser verification');
    fs.writeFileSync(path.join(outputDir, 'results.json'), JSON.stringify({
      base: BASE_REVISION, head: revision,
      runnerSha256: createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'),
      scope: 'isolated real Chrome component integration; synthetic local data only', results,
    }, null, 2));
    console.log(JSON.stringify(results, null, 2));
  } finally {
    await browser.close();
  }
}

module.exports = { normalizePreviewUrl, buildScenarios, runSequentially, readRevision, mountDateOnlyHarness, saveDateOnlyRecord };

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
