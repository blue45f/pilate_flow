const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { tmpdir } = require('node:os');
const { createHash } = require('node:crypto');
const {
  normalizePreviewUrl, runSequentially, readRevision, mountDateOnlyHarness, saveDateOnlyRecord,
} = require('./history-date-only-browser.cjs');

const SELECTED_DATE = '2026-11-05';
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

async function newPage(browser, preview, timezoneId, width) {
  const context = await browser.newContext({ timezoneId, viewport: { width, height: 900 } });
  try {
    await context.route('**/*', route =>
      new URL(route.request().url()).origin === preview.origin ? route.continue() : route.abort());
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.goto(preview.href);
    await mountDateOnlyHarness(page);
    return { context, page, pageErrors };
  } catch (error) {
    await context.close();
    throw error;
  }
}

async function createRecord(browser, preview, scenario) {
  const { context, page, pageErrors } = await newPage(browser, preview, scenario.createdIn, scenario.width);
  try {
    await saveDateOnlyRecord(page);
    const record = await page.evaluate(() => globalThis.__dateHarness.usePilatesStore.getState().historyLogs[0]);
    assert.equal(record.programSnapshot.dateOnly, true);
    assert.equal(record.programSnapshot.taughtDate, SELECTED_DATE);
    assert.deepEqual(pageErrors, []);
    return record;
  } finally {
    await context.close();
  }
}

async function verifyReopenedRecord(browser, preview, scenario, record, outputDir) {
  const { context, page, pageErrors } = await newPage(browser, preview, scenario.viewedIn, scenario.width);
  try {
    const text = await page.evaluate(async log => {
      const harness = globalThis.__dateHarness;
      const store = harness.usePilatesStore;
      store.setState({ historyLogs: [log], savedSequences: [] });
      harness.root.render(harness.React.createElement(harness.ClassBinderView, {
        view: 'history', onOpenLogModal: () => {},
      }));
      const snapshot = await import(new URL('src/utils/teachingHistorySnapshot.ts', location.origin).href);
      const view = snapshot.resolveTeachingHistoryView(log, new Map(store.getState().exercises.map(item => [item.id, item])), []);
      return snapshot.formatTeachingHistorySnapshotText(view);
    }, record);
    const group = page.locator('#date-only-component-harness [data-date-group]');
    await group.waitFor();
    assert.equal(await group.getAttribute('data-date-group'), SELECTED_DATE);
    assert.equal(await page.locator('#date-only-component-harness time').getAttribute('datetime'), SELECTED_DATE);
    assert.equal(await page.locator('#date-only-component-harness .teaching-history-time-of-day').count(), 0);
    assert.ok(text.includes('진행 날짜: ' + SELECTED_DATE + ' (시각 미기록)'));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    assert.equal(overflow, false);
    const label = scenario.createdIn.replaceAll('/', '-') + '-to-' + scenario.viewedIn.replaceAll('/', '-') + '-' + scenario.width;
    await page.screenshot({ path: path.join(outputDir, label + '.png') });
    await page.getByRole('button', { name: '이력 다시 열기', exact: true }).click();
    const detail = page.getByRole('dialog', { name: '진행 완료 수업 이력 상세' });
    await detail.waitFor();
    assert.ok((await detail.textContent()).includes('(' + SELECTED_DATE + ')'));
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      detail.getByRole('button', { name: '스냅샷 텍스트 내보내기' }).click(),
    ]);
    const filename = download.suggestedFilename();
    assert.ok(filename.endsWith('-' + SELECTED_DATE + '.txt'));
    const downloadedText = fs.readFileSync(await download.path(), 'utf8');
    assert.ok(downloadedText.includes('진행 날짜: ' + SELECTED_DATE + ' (시각 미기록)'));
    const after = await page.evaluate(() => globalThis.__dateHarness.usePilatesStore.getState().historyLogs[0]);
    assert.deepEqual(after, record);
    assert.deepEqual(pageErrors, []);
    return {
      ...scenario, calendarDate: SELECTED_DATE, originalISO: record.taughtAt,
      immutableRecordHash: digest(record), filename, overflow, pageErrors,
      snapshotUnchanged: true, downloadDateVerified: true,
    };
  } finally {
    await context.close();
  }
}

async function main() {
  const preview = normalizePreviewUrl(process.env.BASE_URL || 'http://127.0.0.1:5264/');
  const outputDir = process.env.QA_OUTPUT_DIR || fs.mkdtempSync(path.join(tmpdir(), 'pilates-calendar-date-browser-'));
  fs.mkdirSync(outputDir, { recursive: true });
  const revision = readRevision();
  const scenarios = [
    { createdIn: 'Asia/Seoul', viewedIn: 'America/Los_Angeles' },
    { createdIn: 'Pacific/Kiritimati', viewedIn: 'UTC' },
  ].flatMap(pair => [320, 390, 768, 1440].map(width => ({ ...pair, width })));
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const results = await runSequentially(scenarios, async scenario => {
      const record = await createRecord(browser, preview, scenario);
      return verifyReopenedRecord(browser, preview, scenario, record, outputDir);
    });
    assert.equal(readRevision(), revision);
    const report = {
      revision, runnerSha256: createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'),
      scope: 'isolated real Chrome components with synthetic local records, cross-timezone display and TXT download; no account or production writes',
      results,
    };
    fs.writeFileSync(path.join(outputDir, 'results.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
