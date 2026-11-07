#!/usr/bin/env node
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, normalize, resolve } from 'node:path';

const ROOT_DIR = resolve(import.meta.dirname, '../..');
const DIST_DIR = join(ROOT_DIR, 'dist');
const EVIDENCE_DIR = join(ROOT_DIR, 'docs/integrated-journey-round2-20261107/evidence');
const SCREENSHOT_DIR = join(EVIDENCE_DIR, 'screenshots');
const CHROMIUM_BINARY = '/usr/bin/chromium';

const REQUIRED_COMMITS = [
  { short: 'c6acd66', area: '설정 (Settings)', branch: 'feat/parallel-page-settings-20261107' },
  { short: 'f3c093e', area: '통합 (Integration)', branch: 'main (candidate & voice/settings integration)' },
  { short: 'f95b188', area: '라이브러리 (Library/Atlas)', branch: 'feat/parallel-page-library-20261107' },
  { short: '4256230', area: '홈 (Home)', branch: 'feat/parallel-page-home-20261107' },
  { short: '45839ff', area: '히스토리 (History)', branch: 'feat/parallel-page-history-20261107' },
  { short: '338f912', area: '빌더 (Builder)', branch: 'feat/parallel-page-builder-20261107' },
];

const VIEWPORTS = [
  { width: 320, height: 640, label: '320px (Compact Mobile)', mobile: true },
  { width: 390, height: 844, label: '390px (Standard Mobile)', mobile: true },
  { width: 768, height: 1024, label: '768px (Tablet)', mobile: false },
  { width: 1440, height: 900, label: '1440px (Desktop)', mobile: false },
];

function verifyGitAncestry() {
  const headSha = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  }).trim();
  const originMainSha = execFileSync('git', ['rev-parse', 'origin/main'], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  }).trim();

  const records = REQUIRED_COMMITS.map((item) => {
    const fullSha = execFileSync('git', ['rev-parse', item.short], {
      cwd: ROOT_DIR,
      encoding: 'utf8',
    }).trim();
    const subject = execFileSync('git', ['show', '-s', '--format=%s', fullSha], {
      cwd: ROOT_DIR,
      encoding: 'utf8',
    }).trim();
    const commitDate = execFileSync('git', ['show', '-s', '--format=%ci', fullSha], {
      cwd: ROOT_DIR,
      encoding: 'utf8',
    }).trim();

    let isAncestorOfOriginMain = false;
    try {
      execFileSync('git', ['merge-base', '--is-ancestor', fullSha, 'origin/main'], {
        cwd: ROOT_DIR,
      });
      isAncestorOfOriginMain = true;
    } catch {
      isAncestorOfOriginMain = false;
    }

    let isAncestorOfHead = false;
    try {
      execFileSync('git', ['merge-base', '--is-ancestor', fullSha, 'HEAD'], {
        cwd: ROOT_DIR,
      });
      isAncestorOfHead = true;
    } catch {
      isAncestorOfHead = false;
    }

    if (!isAncestorOfOriginMain || !isAncestorOfHead) {
      throw new Error(
        `Commit ${item.short} (${fullSha}) is NOT an ancestor of origin/main or HEAD`,
      );
    }

    return {
      ...item,
      fullSha,
      subject,
      commitDate,
      isAncestorOfOriginMain,
      isAncestorOfHead,
    };
  });

  return {
    headSha,
    originMainSha,
    allIncluded: records.every((r) => r.isAncestorOfOriginMain && r.isAncestorOfHead),
    commits: records,
  };
}

class CdpSession {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.consoleErrors = [];
    this.pageErrors = [];

    this.ws.addEventListener('message', (event) => {
      const data = JSON.parse(String(event.data));
      if (typeof data.id === 'number') {
        const entry = this.pending.get(data.id);
        if (entry) {
          this.pending.delete(data.id);
          if (data.error) {
            entry.reject(new Error(data.error.message ?? 'CDP error'));
          } else {
            entry.resolve(data.result);
          }
        }
      } else if (data.method === 'Runtime.exceptionThrown') {
        this.pageErrors.push(
          data.params?.exceptionDetails?.text ||
            data.params?.exceptionDetails?.exception?.description ||
            'Unknown page exception',
        );
      } else if (data.method === 'Runtime.consoleAPICalled') {
        if (data.params?.type === 'error') {
          const text = (data.params.args ?? [])
            .map((a) => a.value ?? a.description ?? '')
            .join(' ');
          this.consoleErrors.push(text);
        }
      }
    });
  }

  static async connect(wsUrl) {
    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', () => resolve(), { once: true });
      ws.addEventListener(
        'error',
        (err) => reject(new Error(`WebSocket error: ${String(err)}`)),
        { once: true },
      );
    });
    return new CdpSession(ws);
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      const desc =
        res.exceptionDetails.exception?.description ??
        res.exceptionDetails.text ??
        'Evaluation failed';
      throw new Error(`Runtime.evaluate exception: ${desc}`);
    }
    return res.result?.value;
  }

  async screenshot(filePath) {
    const { data } = await this.send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
    });
    writeFileSync(filePath, Buffer.from(data, 'base64'));
  }

  close() {
    this.ws.close();
  }
}

async function launchChromium(userDataDir) {
  if (!existsSync(CHROMIUM_BINARY)) {
    throw new Error(`Chromium binary not found at ${CHROMIUM_BINARY}`);
  }
  const proc = spawn(
    CHROMIUM_BINARY,
    [
      '--headless',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--remote-debugging-port=0',
      `--user-data-dir=${userDataDir}`,
      'about:blank',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );

  const wsUrl = await new Promise((resolve, reject) => {
    let stderr = '';
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for DevTools listening URL:\n${stderr}`));
    }, 15000);
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match?.[1]) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
    proc.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Chromium exited early with code ${code}:\n${stderr}`));
    });
  });

  const match = wsUrl.match(/^ws:\/\/127\.0\.0\.1:(\d+)\//);
  const debugPort = Number(match[1]);
  const targetsRes = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
  const targets = await targetsRes.json();
  const pageTarget = targets.find((t) => t.type === 'page');
  if (!pageTarget?.webSocketDebuggerUrl) {
    throw new Error('No page target found in Chromium');
  }
  const cdp = await CdpSession.connect(pageTarget.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('DOM.enable');
  return { proc, cdp };
}

async function waitForCondition(cdp, predicateExpr, timeoutMs = 10000, description = 'condition') {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ok = await cdp.evaluate(predicateExpr);
    if (ok) return ok;
    await new Promise((r) => setTimeout(r, 80));
  }
  const debugSnapshot = await cdp.evaluate(`({
    activeTab: document.querySelector('[aria-current="page"]')?.textContent?.trim() ?? null,
    h1: document.querySelector('h1')?.textContent?.trim() ?? null,
    dialogs: Array.from(document.querySelectorAll('dialog[open]')).map(d => d.getAttribute('aria-label') || d.querySelector('h2,h1')?.textContent?.trim() || 'dialog'),
    bodyPreview: document.body.innerText.slice(0, 400)
  })`);
  throw new Error(
    `Timed out waiting for ${description} after ${timeoutMs}ms. State: ${JSON.stringify(debugSnapshot)}`,
  );
}

async function measureStageLayout(cdp, stageId) {
  return await cdp.evaluate(`(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const docScrollWidth = document.documentElement.scrollWidth;
    const bodyScrollWidth = document.body.scrollWidth;
    const overflowPx = Math.max(0, docScrollWidth - vw);
    const activeHeading = document.querySelector('h1, h2')?.textContent?.trim() ?? '';
    return {
      stageId: ${JSON.stringify(stageId)},
      viewportWidth: vw,
      viewportHeight: vh,
      docScrollWidth,
      bodyScrollWidth,
      overflowPx,
      zeroHorizontalOverflow: overflowPx === 0,
      activeHeading,
    };
  })()`);
}

async function runViewportJourney(cdp, baseUrl, viewport) {
  const { width, height, mobile } = viewport;
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
  });

  cdp.consoleErrors = [];
  cdp.pageErrors = [];

  await cdp.send('Page.navigate', { url: baseUrl });
  await waitForCondition(
    cdp,
    `Boolean(document.querySelector('#main-content'))`,
    10000,
    'initial #main-content render',
  );

  // Reset localStorage/sessionStorage to clean default demo state and reload
  await cdp.evaluate(`(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  })()`);
  await cdp.send('Page.reload', { ignoreCache: true });
  await waitForCondition(
    cdp,
    `Boolean(document.querySelector('[aria-label="첫 수업안 준비"]') || document.querySelector('.sequence-column'))`,
    10000,
    'clean Home screen',
  );

  // Ensure empty Home state is active so we test the full Home -> Search -> Block/Drag -> Save -> Live/Voice -> History Reuse flow
  await cdp.evaluate(`(() => {
    const newClassBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('새 수업 만들기') && b.closest('[aria-label="새 수업 및 최근 수업 전환"]')
    );
    if (newClassBtn) newClassBtn.click();
  })()`);

  await waitForCondition(
    cdp,
    `Boolean(document.querySelector('[aria-label="첫 수업안 준비"]'))`,
    10000,
    'empty Home welcome region',
  );

  const stageMetrics = [];

  // =========================================================================
  // Stage 1: 홈 (Home — 4256230 + FirstClassTutorialCandidate) & 설정 (Settings — c6acd66 + f3c093e)
  // =========================================================================
  const homeState = await cdp.evaluate(`(() => {
    const welcome = document.querySelector('[aria-label="첫 수업안 준비"]');
    const recent = document.querySelector('[aria-label="최근 수업 이어가기"]');
    const pickMovementBtn = Array.from(welcome?.querySelectorAll('button') ?? []).find(
      (b) => b.textContent?.trim() === '동작 고르기'
    );
    const presetEntryBtn = Array.from(welcome?.querySelectorAll('button') ?? []).find(
      (b) => b.textContent?.includes('프리셋·동작 묶음에서 고르기')
    );
    return {
      hasWelcomeRegion: Boolean(welcome),
      hasRecentRegion: Boolean(recent),
      hasPickMovementBtn: Boolean(pickMovementBtn),
      hasPresetEntryBtn: Boolean(presetEntryBtn),
    };
  })()`);
  if (!homeState.hasWelcomeRegion || !homeState.hasRecentRegion || !homeState.hasPickMovementBtn) {
    throw new Error(`Home stage verification failed at ${width}px: ${JSON.stringify(homeState)}`);
  }
  stageMetrics.push(await measureStageLayout(cdp, '01-home'));
  await cdp.screenshot(join(SCREENSHOT_DIR, `vp-${width}-01-home.png`));

  // Open Settings dialog ('데이터 백업과 사용 안내') and verify 4-group PilatesSettingsPage
  await cdp.evaluate(`(() => {
    const btn = document.querySelector('button[aria-label="데이터 백업과 사용 안내"]');
    if (!btn) throw new Error('Settings button not found');
    btn.click();
  })()`);
  await waitForCondition(
    cdp,
    `Array.from(document.querySelectorAll('summary')).some((s) => s.textContent?.includes('4그룹 통합 설정 요약'))`,
    10000,
    'Settings 4-group summary',
  );
  await cdp.evaluate(`(() => {
    const summary = Array.from(document.querySelectorAll('summary')).find((s) =>
      s.textContent?.includes('4그룹 통합 설정 요약')
    );
    const details = summary?.closest('details');
    if (details) details.open = true;
    summary?.click();
    if (details && !details.open) details.open = true;
  })()`);
  await waitForCondition(
    cdp,
    `Boolean(document.querySelector('[data-testid="pilates-settings-page"]'))`,
    10000,
    'PilatesSettingsPage lazy mount',
  );
  stageMetrics.push(await measureStageLayout(cdp, '02-settings'));
  await cdp.screenshot(join(SCREENSHOT_DIR, `vp-${width}-02-settings.png`));

  // Close Settings dialog
  await cdp.evaluate(`(() => {
    const openDialog = Array.from(document.querySelectorAll('dialog[open]')).at(-1);
    const closeBtn = openDialog?.querySelector('button[aria-label="닫기"]');
    closeBtn?.click();
  })()`);
  await waitForCondition(
    cdp,
    `document.querySelectorAll('dialog[open]').length === 0`,
    10000,
    'Settings dialog close',
  );

  // =========================================================================
  // Stage 2: 동작검색 (Movement Search in ExerciseAtlasView — f95b188)
  // =========================================================================
  await cdp.evaluate(`(() => {
    const navButtons = Array.from(document.querySelectorAll('nav button'));
    const atlasBtn = navButtons.find(
      (b) => b.getClientRects().length > 0 && b.textContent?.includes('동작')
    ) || navButtons.find((b) => b.textContent?.includes('동작'));
    if (!atlasBtn) throw new Error('Atlas nav button not found');
    atlasBtn.click();
  })()`);
  await waitForCondition(
    cdp,
    `Array.from(document.querySelectorAll('button[aria-label$="수업안에 추가"]')).length > 0`,
    10000,
    'ExerciseAtlasView load',
  );

  // Filter Atlas to '매트' so exercises match the default empty Home '50분 · 매트' condition
  await cdp.evaluate(`(() => {
    const group = document.querySelector('[aria-label="기구 선택"]');
    const matBtn = Array.from(group?.querySelectorAll('button') ?? []).find(
      (b) => b.textContent?.includes('매트')
    );
    if (!matBtn) throw new Error('매트 filter button not found in ExerciseAtlasView');
    matBtn.click();
  })()`);
  await waitForCondition(
    cdp,
    `Boolean(Array.from(document.querySelectorAll('[aria-label="기구 선택"] button')).find((b) => b.textContent?.includes('매트') && b.getAttribute('aria-pressed') === 'true'))`,
    10000,
    'ExerciseAtlasView filtered to 매트',
  );

  // Add first 2 compatible exercises from Atlas across separate React renders and verify honest status feedback
  const firstAddedName = await cdp.evaluate(`(() => {
    const btn = document.querySelectorAll('button[aria-label$="수업안에 추가"]')[0];
    if (!btn) throw new Error('First add button not found');
    const name = (btn.getAttribute('aria-label') || '').replace(/\\s*수업안에 추가$/, '');
    btn.click();
    return name;
  })()`);
  await waitForCondition(
    cdp,
    `document.querySelectorAll('.movement-card.is-in-sequence').length >= 1 && Array.from(document.querySelectorAll('[role="status"]')).some((el) => el.textContent?.includes('현재 수업안에 추가했어요.'))`,
    10000,
    'First exercise added status feedback',
  );

  const secondAddedName = await cdp.evaluate(`(() => {
    const btn = document.querySelectorAll('button[aria-label$="수업안에 추가"]')[1];
    if (!btn) throw new Error('Second add button not found');
    const name = (btn.getAttribute('aria-label') || '').replace(/\\s*수업안에 추가$/, '');
    btn.click();
    return name;
  })()`);
  await waitForCondition(
    cdp,
    `document.querySelectorAll('.movement-card.is-in-sequence').length >= 2 && Array.from(document.querySelectorAll('[role="status"]')).some((el) => el.textContent?.includes(${JSON.stringify(secondAddedName)}))`,
    10000,
    'Second exercise added status feedback',
  );
  const atlasAddResult = await cdp.evaluate(`(() => {
    const statusText = Array.from(document.querySelectorAll('[role="status"]'))
      .map((el) => el.textContent?.trim() ?? '')
      .filter(Boolean)
      .join(' | ');
    return {
      addedCount: document.querySelectorAll('.movement-card.is-in-sequence').length,
      addedNames: [${JSON.stringify(firstAddedName)}, ${JSON.stringify(secondAddedName)}],
      statusText,
    };
  })()`);
  stageMetrics.push(await measureStageLayout(cdp, '03-atlas-search'));
  await cdp.screenshot(join(SCREENSHOT_DIR, `vp-${width}-03-atlas-search.png`));

  // Navigate back to Workbench ('수업' / '오늘의 수업')
  await cdp.evaluate(`(() => {
    const navButtons = Array.from(document.querySelectorAll('nav button'));
    const wbBtn = navButtons.find(
      (b) => b.getClientRects().length > 0 && b.textContent?.includes('수업') && !b.textContent?.includes('기록')
    ) || navButtons.find((b) => b.textContent?.includes('오늘의 수업'));
    if (!wbBtn) throw new Error('Workbench nav button not found');
    wbBtn.click();
  })()`);
  await waitForCondition(
    cdp,
    `document.querySelectorAll('.sequence-order-card').length >= 2`,
    10000,
    'Workbench sequence cards',
  );

  // =========================================================================
  // Stage 3: 블록삽입/드래그 (Block Combination, OfflinePresetPicker, RestInsertControl & Reorder — 338f912 + f3c093e)
  // =========================================================================
  // 3a. Save current steps as a reusable block via '블록 조합'
  await cdp.evaluate(`(() => {
    const details = document.querySelector('.workbench-block-combo-details');
    if (!details) throw new Error('.workbench-block-combo-details not found');
    details.open = true;
    const input = details.querySelector('input[aria-label="새 재사용 블록 이름"]');
    if (input) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      setter?.call(input, '크로미움 통합검증 블록 ${width}px');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  })()`);
  await new Promise((r) => setTimeout(r, 80));
  await cdp.evaluate(`(() => {
    const details = document.querySelector('.workbench-block-combo-details');
    const saveBlockBtn = Array.from(details?.querySelectorAll('button') ?? []).find(
      (b) => b.textContent?.includes('현재 동작 묶어 블록 저장')
    );
    if (!saveBlockBtn) throw new Error('현재 동작 묶어 블록 저장 button not found');
    saveBlockBtn.click();
  })()`);
  await waitForCondition(
    cdp,
    `Boolean(document.querySelector('[aria-label="내 저장된 재사용 블록"]')?.textContent?.includes('크로미움 통합검증 블록 ${width}px'))`,
    10000,
    'Reusable block saved in workbench-block-combo-list',
  );

  // 3b. Open OfflinePresetPicker ('프리셋·동작 묶음 열기') and verify both '시간·휴식 맞춤 후보' and '연계 동작 묶음' insertion
  await cdp.evaluate(`(() => {
    const openPresetBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('프리셋·동작 묶음 열기') || b.textContent?.includes('프리셋·동작 묶음에서 고르기')
    );
    if (!openPresetBtn) throw new Error('Open preset picker button not found');
    openPresetBtn.click();
  })()`);
  await waitForCondition(
    cdp,
    `Boolean(document.querySelector('[aria-label="오프라인 수업·연계 블록 프리셋"]'))`,
    10000,
    'OfflinePresetPicker open',
  );

  // Switch to '시간·휴식 맞춤 후보' tab first
  await cdp.evaluate(`(() => {
    const presetSec = document.querySelector('[aria-label="오프라인 수업·연계 블록 프리셋"]');
    const suggestedBtn = Array.from(presetSec?.querySelectorAll('button') ?? []).find(
      (b) => b.textContent?.includes('시간·휴식 맞춤 후보')
    );
    suggestedBtn?.click();
  })()`);
  await waitForCondition(
    cdp,
    `Boolean(document.querySelector('[data-testid="preset-suggestion-candidate-preview"]'))`,
    10000,
    'PresetSuggestionCandidatePreview mount',
  );

  // Switch to '연계 동작 묶음' tab and select a block preset to verify confirmation banner
  await cdp.evaluate(`(() => {
    const presetSec = document.querySelector('[aria-label="오프라인 수업·연계 블록 프리셋"]');
    const blockTabBtn = Array.from(presetSec?.querySelectorAll('.offline-presets-tabs button') ?? []).find(
      (b) => b.textContent?.includes('연계 동작 묶음')
    );
    blockTabBtn?.click();
  })()`);
  await waitForCondition(
    cdp,
    `document.querySelectorAll('button.offline-preset-card').length > 0`,
    10000,
    'Offline block preset cards',
  );
  await cdp.evaluate(`(() => {
    const firstCardBtn = document.querySelector('button.offline-preset-card');
    firstCardBtn?.click();
  })()`);
  await waitForCondition(
    cdp,
    `Boolean(document.querySelector('[aria-label="선택한 프리셋 확인"]'))`,
    10000,
    'Selected preset confirmation region',
  );
  // Close preset dialog so our sequence keeps the clean 2 exercises + 1 rest step we insert next
  await cdp.evaluate(`(() => {
    const openDialog = Array.from(document.querySelectorAll('dialog[open]')).at(-1);
    const closeBtn = openDialog?.querySelector('button[aria-label="닫기"]');
    closeBtn?.click();
  })()`);
  await waitForCondition(
    cdp,
    `document.querySelectorAll('dialog[open]').length === 0`,
    10000,
    'Preset dialog close',
  );

  // 3c. Insert a Rest step via RestInsertControl ('휴식 추가' -> '이 위치에 휴식 넣기')
  const stepsBeforeRest = await cdp.evaluate(`document.querySelectorAll('.sequence-order-card').length`);
  await cdp.evaluate(`(() => {
    const restDetails = document.querySelector('details.rest-insert-control');
    if (!restDetails) throw new Error('details.rest-insert-control not found');
    restDetails.open = true;
    const insertRestBtn = Array.from(restDetails.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('이 위치에 휴식 넣기')
    );
    if (!insertRestBtn) throw new Error('이 위치에 휴식 넣기 button not found');
    insertRestBtn.click();
  })()`);
  await waitForCondition(
    cdp,
    `document.querySelectorAll('.sequence-order-card').length === ${stepsBeforeRest + 1}`,
    10000,
    'Rest step inserted',
  );

  // 3d. Reorder steps via SequenceOrderCard controls ('아래로 이동' and keyboard ArrowUp on drag handle)
  const cardsBefore = await cdp.evaluate(`
    Array.from(document.querySelectorAll('.sequence-order-card')).map((el) => el.getAttribute('data-order-step'))
  `);
  await cdp.evaluate(`(() => {
    const firstCard = document.querySelector('.sequence-order-card');
    const downBtn = firstCard?.querySelector('button[aria-label$="아래로 이동"]');
    if (!downBtn) throw new Error('아래로 이동 button not found');
    downBtn.click();
  })()`);
  await waitForCondition(
    cdp,
    `document.querySelectorAll('.sequence-order-card')[1]?.getAttribute('data-order-step') === ${JSON.stringify(cardsBefore[0])}`,
    10000,
    'Step moved down to second position',
  );
  const cardsAfterDown = await cdp.evaluate(`
    Array.from(document.querySelectorAll('.sequence-order-card')).map((el) => el.getAttribute('data-order-step'))
  `);
  await cdp.evaluate(`(() => {
    const movedHandle = document.getElementById('order-handle-' + ${JSON.stringify(cardsBefore[0])});
    movedHandle?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
  })()`);
  await waitForCondition(
    cdp,
    `document.querySelectorAll('.sequence-order-card')[0]?.getAttribute('data-order-step') === ${JSON.stringify(cardsBefore[0])}`,
    10000,
    'Step restored to first position via ArrowUp',
  );
  const cardsAfterUp = await cdp.evaluate(`
    Array.from(document.querySelectorAll('.sequence-order-card')).map((el) => el.getAttribute('data-order-step'))
  `);
  const reorderCheck = {
    cardsBefore,
    cardsAfterDown,
    cardsAfterUp,
    downMovedFirstToSecond: cardsAfterDown[1] === cardsBefore[0],
    upRestoredFirst: cardsAfterUp[0] === cardsBefore[0],
  };

  stageMetrics.push(await measureStageLayout(cdp, '04-builder-block-drag'));
  await cdp.screenshot(join(SCREENSHOT_DIR, `vp-${width}-04-builder-block-drag.png`));

  // =========================================================================
  // Stage 4: 저장 & 미리보기/큐시트 (Save & SequencePlanPreview / ClassCueSheetPreview — 338f912 + f3c093e)
  // =========================================================================
  const sequenceTitle = `크로미움 통합검증 ${width}px 수업안`;
  await cdp.evaluate(`(() => {
    const titleInput = document.querySelector('input[aria-label="시퀀스 제목"]');
    if (!titleInput) throw new Error('시퀀스 제목 input not found');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    setter?.call(titleInput, ${JSON.stringify(sequenceTitle)});
    titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    titleInput.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await new Promise((r) => setTimeout(r, 80));
  await cdp.evaluate(`(() => {
    const saveBtn = document.querySelector('button.save-flow');
    if (!saveBtn) throw new Error('button.save-flow not found');
    saveBtn.click();
  })()`);
  await new Promise((r) => setTimeout(r, 80));

  // Open SequencePlanPreview ('시퀀스 미리보기')
  await cdp.evaluate(`(() => {
    const previewBtn = document.querySelector('button.v3-preview-button');
    if (!previewBtn) throw new Error('button.v3-preview-button not found');
    previewBtn.click();
  })()`);
  await waitForCondition(
    cdp,
    `Boolean(document.querySelector('dialog.sequence-plan-preview[open]'))`,
    10000,
    'SequencePlanPreview dialog open',
  );

  // Open ClassCueSheetPreview inside SequencePlanPreview
  await cdp.evaluate(`(() => {
    const details = document.querySelector('dialog.sequence-plan-preview details.class-cue-sheet-summary');
    if (!details) throw new Error('details.class-cue-sheet-summary not found');
    details.open = true;
    details.dispatchEvent(new Event('toggle'));
  })()`);
  await waitForCondition(
    cdp,
    `Boolean(document.querySelector('dialog.sequence-plan-preview [data-testid="class-cue-sheet-root"]'))`,
    10000,
    'ClassCueSheetPreview inside SequencePlanPreview',
  );

  stageMetrics.push(await measureStageLayout(cdp, '05-save-preview-cuesheet'));
  await cdp.screenshot(join(SCREENSHOT_DIR, `vp-${width}-05-save-preview-cuesheet.png`));

  // =========================================================================
  // Stage 5: 수업진행/음성 (LiveStageView & Voice Guidance — f3c093e)
  // =========================================================================
  await cdp.evaluate(`(() => {
    const dialog = document.querySelector('dialog.sequence-plan-preview[open]');
    const startBtn = Array.from(dialog?.querySelectorAll('button') ?? []).find(
      (b) => b.textContent?.includes('수업 시작')
    );
    if (!startBtn || startBtn.disabled) {
      throw new Error('수업 시작 button missing or disabled in SequencePlanPreview');
    }
    startBtn.click();
  })()`);
  await waitForCondition(
    cdp,
    `Boolean(document.querySelector('[aria-label="수업 음성 안내 설정"]'))`,
    10000,
    'LiveStageView mount',
  );

  // Toggle Cue Sheet in LiveStageView
  await cdp.evaluate(`(() => {
    const cueBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === '큐시트 보기'
    );
    cueBtn?.click();
  })()`);
  await waitForCondition(
    cdp,
    `Boolean(document.querySelector('[aria-label="수업 진행 큐시트"]'))`,
    10000,
    'LiveStageView cue sheet panel open',
  );

  // Toggle Voice Guidance if available, start timer, let it tick, and advance to step 2
  const liveStageResult = await cdp.evaluate(`(() => {
    const voiceRegion = document.querySelector('[aria-label="수업 음성 안내 설정"]');
    const voiceToggleBtn = Array.from(voiceRegion?.querySelectorAll('button') ?? []).find(
      (b) => b.textContent?.includes('음성 안내 켜기') || b.textContent?.includes('음성 안내 끄기')
    );
    if (voiceToggleBtn && !voiceToggleBtn.disabled) {
      voiceToggleBtn.click();
    }
    const playBtn = document.querySelector('button.teaching-play');
    playBtn?.click();
    return {
      cuePanelOpen: Boolean(document.querySelector('[aria-label="수업 진행 큐시트"]')),
      hasVoiceRegion: Boolean(voiceRegion),
      voiceToggledOrGracefullyUnavailable: Boolean(voiceToggleBtn),
    };
  })()`);
  await new Promise((r) => setTimeout(r, 300));
  await cdp.evaluate(`(() => {
    const voiceRegion = document.querySelector('[aria-label="수업 음성 안내 설정"]');
    const stopBtn = Array.from(voiceRegion?.querySelectorAll('button') ?? []).find(
      (b) => b.textContent?.includes('음성 즉시 중지')
    );
    stopBtn?.click();
    const nextBtn = document.querySelector('button[aria-label="다음 동작"], button[aria-label="휴식 건너뛰기"]');
    nextBtn?.click();
  })()`);
  await new Promise((r) => setTimeout(r, 150));

  stageMetrics.push(await measureStageLayout(cdp, '06-live-stage-voice'));
  await cdp.screenshot(join(SCREENSHOT_DIR, `vp-${width}-06-live-stage-voice.png`));

  // Finish class -> open review dialog -> open LogSessionModal
  await cdp.evaluate(`(() => {
    const finishBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('종료 / 기록')
    );
    if (!finishBtn) throw new Error('종료 / 기록 button not found');
    finishBtn.click();
  })()`);
  await waitForCondition(
    cdp,
    `Array.from(document.querySelectorAll('button')).some((b) => b.textContent?.includes('검토하고 기록하기'))`,
    10000,
    'Finish review dialog open',
  );
  await cdp.evaluate(`(() => {
    const confirmBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('검토하고 기록하기')
    );
    confirmBtn?.click();
  })()`);

  // =========================================================================
  // Stage 6: 기록재사용 (LogSessionModal -> History Date/Search/Hierarchy -> Reuse — 45839ff)
  // =========================================================================
  await waitForCondition(
    cdp,
    `Boolean(document.querySelector('textarea[aria-label="다음 수업을 위한 메모 (선택)"]'))`,
    10000,
    'LogSessionModal open',
  );
  stageMetrics.push(await measureStageLayout(cdp, '07-log-modal'));

  await cdp.evaluate(`(() => {
    const selectAllBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === '전체 선택'
    );
    selectAllBtn?.click();
    const textarea = document.querySelector('textarea[aria-label="다음 수업을 위한 메모 (선택)"]');
    if (textarea) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
      setter?.call(textarea, '${width}px 크로미움 통합 검증 완료 메모');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
    }
  })()`);
  await new Promise((r) => setTimeout(r, 80));
  await cdp.evaluate(`(() => {
    const submitBtn = Array.from(document.querySelectorAll('button[type="submit"]')).find(
      (b) => b.textContent?.includes('수업 기록 저장')
    );
    if (!submitBtn) throw new Error('수업 기록 저장 submit button not found');
    submitBtn.click();
  })()`);

  await waitForCondition(
    cdp,
    `Boolean(document.querySelector('[aria-label="수업 기록 목록"]'))`,
    10000,
    'History view (ClassBinderView view="history") open after saving log',
  );

  await cdp.evaluate(`(() => {
    const searchInput = document.querySelector('input[aria-label="수업 기록 검색"]');
    if (searchInput) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      setter?.call(searchInput, '크로미움통합검증${width}px');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  })()`);
  await new Promise((r) => setTimeout(r, 120));

  const historyVerification = await cdp.evaluate(`(() => {
    const feed = document.querySelector('[aria-label="수업 기록 목록"]');
    const dateNav = document.querySelector('[aria-label="날짜별 기록 탐색"]');
    const articles = Array.from(feed?.querySelectorAll('article') ?? []);
    const firstCard = articles[0];
    const titleEl = firstCard?.querySelector('h2');
    const badgesEl = firstCard?.querySelector('.teaching-history-badges');
    const titleAboveBadges = Boolean(
      titleEl &&
      badgesEl &&
      (titleEl.compareDocumentPosition(badgesEl) & Node.DOCUMENT_POSITION_FOLLOWING)
    );
    const reuseBtn = Array.from(firstCard?.querySelectorAll('button') ?? []).find(
      (b) => b.textContent?.includes('이 수업 다시 계획')
    );
    return {
      hasDateNav: Boolean(dateNav),
      matchingArticleCount: articles.length,
      cardTitle: titleEl?.textContent?.trim() ?? '',
      titleAboveBadges,
      hasPrimaryReuseCta: Boolean(reuseBtn && reuseBtn.className.includes('pf-btn--primary')),
    };
  })()`);

  if (
    !historyVerification.hasDateNav ||
    historyVerification.matchingArticleCount < 1 ||
    !historyVerification.titleAboveBadges ||
    !historyVerification.hasPrimaryReuseCta
  ) {
    throw new Error(
      `History verification failed at ${width}px: ${JSON.stringify(historyVerification)}`,
    );
  }

  stageMetrics.push(await measureStageLayout(cdp, '08-history-reuse'));
  await cdp.screenshot(join(SCREENSHOT_DIR, `vp-${width}-08-history-reuse.png`));

  // Click '이 수업 다시 계획' and verify navigation back to Workbench with restored steps
  await cdp.evaluate(`(() => {
    const feed = document.querySelector('[aria-label="수업 기록 목록"]');
    const firstCard = feed?.querySelector('article');
    const reuseBtn = Array.from(firstCard?.querySelectorAll('button') ?? []).find(
      (b) => b.textContent?.includes('이 수업 다시 계획')
    );
    if (!reuseBtn) throw new Error('이 수업 다시 계획 button not found');
    reuseBtn.click();
  })()`);

  await waitForCondition(
    cdp,
    `Boolean(document.querySelector('input[aria-label="시퀀스 제목"]')) && document.querySelectorAll('.sequence-order-card').length >= 1`,
    10000,
    'Workbench restored from History reuse',
  );

  const restoredWorkbench = await cdp.evaluate(`(() => {
    const titleInput = document.querySelector('input[aria-label="시퀀스 제목"]');
    return {
      restoredTitle: titleInput?.value ?? '',
      restoredStepCount: document.querySelectorAll('.sequence-order-card').length,
    };
  })()`);

  return {
    viewport,
    homeState,
    atlasAddResult,
    reorderCheck,
    liveStageResult,
    historyVerification,
    restoredWorkbench,
    stageMetrics,
    allStagesZeroOverflow: stageMetrics.every((m) => m.zeroHorizontalOverflow),
    consoleErrorCount: cdp.consoleErrors.length,
    pageErrorCount: cdp.pageErrors.length,
    consoleErrors: cdp.consoleErrors,
    pageErrors: cdp.pageErrors,
  };
}

async function runZoom200Checks(cdp, baseUrl) {
  const zoomResults = [];
  for (const width of [320, 1440]) {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width,
      height: 900,
      deviceScaleFactor: 2,
      mobile: width < 768,
    });
    await cdp.send('Page.navigate', { url: baseUrl });
    await waitForCondition(
      cdp,
      `Boolean(document.querySelector('#main-content'))`,
      10000,
      `zoom 200% #main-content at ${width}px`,
    );
    const metrics = await cdp.evaluate(`(() => {
      document.documentElement.style.fontSize = '200%';
      const vw = window.innerWidth;
      const docScrollWidth = document.documentElement.scrollWidth;
      const overflowPx = Math.max(0, docScrollWidth - vw);
      document.documentElement.style.fontSize = '';
      return {
        viewportWidth: vw,
        textScalePercent: 200,
        docScrollWidth,
        overflowPx,
        zeroHorizontalOverflow: overflowPx === 0,
      };
    })()`);
    zoomResults.push(metrics);
  }
  return zoomResults;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function startStaticDistServer() {
  if (!existsSync(join(DIST_DIR, 'index.html'))) {
    execFileSync('pnpm', ['run', 'build'], { cwd: ROOT_DIR, stdio: 'inherit' });
  }
  const server = createServer((req, res) => {
    const reqPath = (req.url ?? '/').split('?')[0];
    const safePath = normalize(decodeURIComponent(reqPath)).replace(/^(\.\.(\/|\\|$))+/, '');
    let filePath = join(DIST_DIR, safePath === '/' ? 'index.html' : safePath);
    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
      filePath = join(DIST_DIR, 'index.html');
    }
    try {
      const data = readFileSync(filePath);
      const mime = MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store' });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 4173;
      resolve({ server, baseUrl: `http://127.0.0.1:${port}/` });
    });
  });
}

async function main() {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const ancestry = verifyGitAncestry();
  console.log('[1/3] Git ancestry verified on origin/main:', ancestry.originMainSha);

  const { server: httpServer, baseUrl } = await startStaticDistServer();
  console.log(`[2/3] Static production server listening at ${baseUrl}`);

  const userDataDir = mkdtempSync(join(tmpdir(), 'pilates-round2-journey-'));
  let chromiumProc = null;
  let cdp = null;

  try {
    const launched = await launchChromium(userDataDir);
    chromiumProc = launched.proc;
    cdp = launched.cdp;

    const viewportResults = [];
    for (const vp of VIEWPORTS) {
      console.log(`  -> Running full 6-stage journey at ${vp.label}...`);
      const res = await runViewportJourney(cdp, baseUrl, vp);
      viewportResults.push(res);
      console.log(
        `     PASS ${vp.width}px: zeroOverflow=${res.allStagesZeroOverflow}, consoleErrors=${res.consoleErrorCount}, pageErrors=${res.pageErrorCount}, restoredSteps=${res.restoredWorkbench.restoredStepCount}`,
      );
    }

    console.log('  -> Running 200% zoom/text-scale checks (320px & 1440px)...');
    const zoom200Results = await runZoom200Checks(cdp, baseUrl);

    const summary = {
      verifiedAt: new Date().toISOString(),
      suite: 'integrated-journey-round2-20261107',
      ancestry,
      viewports: viewportResults,
      zoom200Results,
      overallPass:
        ancestry.allIncluded &&
        viewportResults.every(
          (v) => v.allStagesZeroOverflow && v.consoleErrorCount === 0 && v.pageErrorCount === 0,
        ) &&
        zoom200Results.every((z) => z.zeroHorizontalOverflow),
    };

    const outputPath = join(EVIDENCE_DIR, 'verification-summary.json');
    writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
    console.log(`[3/3] Wrote verification summary to ${outputPath}`);

    if (!summary.overallPass) {
      console.error('Verification failed one or more gates:', JSON.stringify(summary, null, 2));
      process.exitCode = 1;
    }
  } finally {
    try {
      cdp?.close();
    } catch {
      // ignore
    }
    if (chromiumProc) {
      chromiumProc.kill('SIGKILL');
    }
    await new Promise((resolve) => httpServer.close(() => resolve()));
    rmSync(userDataDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
