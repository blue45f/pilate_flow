#!/usr/bin/env node
/**
 * Round 5 Real Browser Verification Script (`docs/history-zoom-clarity-round5-20261107`)
 * Uses /usr/bin/chromium via CDP WebSocket (zero external npm dependency).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const evidenceDir = path.join(__dirname, 'evidence');
const screenshotsDir = path.join(evidenceDir, 'screenshots');
fs.mkdirSync(screenshotsDir, { recursive: true });

const PORT = 4195;
const CDP_PORT = 9235;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const STORAGE_KEY = 'pilates-flow-atelier-storage-v3';

const VIEWPORTS = [
  { name: 'mobile-320', width: 320, height: 694 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1440', width: 1440, height: 900 },
];

const ROUND4_BASELINE = {
  'mobile-320@100%': { groupFilterHeightPx: 46, dateNavHeightPx: 46, firstCardTopPx: 304, cardVisibleHeightUnobstructedPx: 328, scrollNeededForPrimaryReusePx: 0 },
  'mobile-390@100%': { groupFilterHeightPx: 46, dateNavHeightPx: 46, firstCardTopPx: 304, cardVisibleHeightUnobstructedPx: 478, scrollNeededForPrimaryReusePx: 0 },
  'tablet-768@100%': { groupFilterHeightPx: 45, dateNavHeightPx: 147, firstCardTopPx: 356, cardVisibleHeightUnobstructedPx: 606, scrollNeededForPrimaryReusePx: 0 },
  'desktop-1440@100%': { groupFilterHeightPx: 45, dateNavHeightPx: 96, firstCardTopPx: 305, cardVisibleHeightUnobstructedPx: 530, scrollNeededForPrimaryReusePx: 0 },
  'mobile-320@200%': { groupFilterHeightPx: 92, dateNavHeightPx: 92, firstCardTopPx: 608, cardVisibleHeightUnobstructedPx: 24, scrollNeededForPrimaryReusePx: 562 },
  'mobile-390@200%': { groupFilterHeightPx: 92, dateNavHeightPx: 92, firstCardTopPx: 608, cardVisibleHeightUnobstructedPx: 174, scrollNeededForPrimaryReusePx: 412 },
  'tablet-768@200%': { groupFilterHeightPx: 92, dateNavHeightPx: 92, firstCardTopPx: 608, cardVisibleHeightUnobstructedPx: 354, scrollNeededForPrimaryReusePx: 232 },
  'desktop-1440@200%': { groupFilterHeightPx: 305, dateNavHeightPx: 812, firstCardTopPx: 1945, cardVisibleHeightUnobstructedPx: 0, scrollNeededForPrimaryReusePx: 2968 },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForHttp(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // retry
    }
    await sleep(250);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

class CdpSession {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 0;
    this.pending = new Map();
  }
  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }
  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text);
    }
    return res.result?.value;
  }
  async screenshot(outFile) {
    const { data } = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(outFile, Buffer.from(data, 'base64'));
  }
  close() {
    this.ws?.close();
  }
}

function buildSeedExpression(recordCount, distinctDays) {
  return `(() => {
    const raw = localStorage.getItem('${STORAGE_KEY}');
    const parsed = raw ? JSON.parse(raw) : { state: {}, version: 3 };
    const state = parsed.state || parsed;
    const baseExercises = Array.isArray(state.exercises) && state.exercises.length >= 2
      ? state.exercises
      : [
          { id: 'ex-footwork', nameKo: '풋워크', nameEn: 'Footwork', apparatus: 'reformer', category: 'warmup', level: '1.0', defaultDurationMin: 6 },
          { id: 'ex-hundred', nameKo: '헌드레드', nameEn: 'The Hundred', apparatus: 'reformer', category: 'core', level: '1.5', defaultDurationMin: 6 },
        ];
    const ex0 = baseExercises[0];
    const ex1 = baseExercises[1] || ex0;

    const groups = [
      { id: 'grp-mon-wed-7pm', name: '월·수 저녁 A반 (코어집중)', type: 'group', defaultLevel: '1.5', scheduleLabel: '월·수 19:00', notes: '' },
      { id: 'grp-tue-thu-10am', name: '화·목 오전 B반 (척추가동)', type: 'group', defaultLevel: '1.0', scheduleLabel: '화·목 10:00', notes: '' },
      { id: 'grp-fri-private', name: '금요 개인레슨 (재활케어)', type: 'private', defaultLevel: '1.0', scheduleLabel: '금 14:00', notes: '' },
      { id: 'grp-sat-intensive', name: '토요 인텐시브 파워반', type: 'group', defaultLevel: '2.0', scheduleLabel: '토 11:00', notes: '' },
      { id: 'grp-dawn-empty', name: '새벽 바른정렬 C반', type: 'group', defaultLevel: '1.5', scheduleLabel: '월·금 07:00', notes: '' },
    ];

    const baseMs = Date.UTC(2026, 10, 6, 12, 0, 0);
    const logs = [];
    for (let i = 0; i < ${recordCount}; i++) {
      const dayIdx = i % ${distinctDays};
      const grp = groups[i % 4];
      const recordDate = new Date(baseMs - dayIdx * 86400000);
      const yyyy = recordDate.getUTCFullYear();
      const mm = String(recordDate.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(recordDate.getUTCDate()).padStart(2, '0');

      let taughtAt = yyyy + '-' + mm + '-' + dd + 'T10:30:00.000Z';
      let title = '리포머 코어 & 흉추 가동성 플로우 #' + (i + 1);
      const extra = {};

      if (i === 0) {
        taughtAt = '2026-11-06T12:00:00.000Z';
        title = '실제 정오(12:00 UTC) 리포머 코어 & 고관절 정렬 플로우 #1';
      } else if (i === 1) {
        taughtAt = '2026-11-06T00:00:00.000Z';
        title = '실제 자정(00:00 UTC) 흉추 가동성 시퀀스 #2';
      } else if (i === 2) {
        taughtAt = '2026-11-05';
        title = '날짜 전용(YYYY-MM-DD) 개인 레슨 프로그램 #3';
      } else if (i === 3) {
        taughtAt = '2026-11-05T12:00:00.000Z';
        title = '메타데이터(unrecorded) 날짜 전용 기록 #4';
        extra.timestamps = 'unrecorded';
      }

      logs.push({
        id: 'r5-log-' + (i + 1),
        sequenceId: 'r5-seq-' + (i + 1),
        sequenceTitle: title,
        groupId: grp.id,
        groupName: grp.name,
        apparatus: 'reformer',
        level: grp.defaultLevel,
        taughtAt,
        actualDurationSec: 3000,
        actualRestDurationSec: 120,
        instructorReflection: '호흡과 갈비뼈 닫기 큐잉 집중 메모 #' + (i + 1),
        intensity: 'moderate',
        rating: 5,
        exerciseIds: [ex0.id, ex1.id],
        stepsSnapshot: [
          {
            stepId: 's-' + (i + 1) + '-1',
            order: 1,
            kind: 'exercise',
            exerciseId: ex0.id,
            blockCategory: 'warmup',
            durationMin: 6,
            movementSec: 300,
            explanationSec: 30,
            transitionSec: 30,
            selectedLayer: 'standard',
            customNote: '',
          },
        ],
        ...extra,
      });
    }

    const nextState = { ...state, activeTab: 'history', classGroups: groups, historyLogs: logs };
    localStorage.setItem('${STORAGE_KEY}', JSON.stringify({ state: nextState, version: parsed.version ?? 3 }));
    return logs.length;
  })()`;
}

async function seedAndReload(cdp, recordCount, distinctDays) {
  await cdp.eval(buildSeedExpression(recordCount, distinctDays));
  await cdp.send('Page.reload', { ignoreCache: true });
  await sleep(300);
  for (let i = 0; i < 60; i++) {
    const ready = await cdp.eval(
      `document.querySelector('.teaching-page-header .teaching-count')?.textContent?.trim() === '${recordCount}' && Boolean(document.querySelector('.teaching-group-filters'))`,
    );
    if (ready) break;
    await sleep(100);
  }
  await sleep(150);
}

async function measureViewportState(cdp, vp, zoom) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: vp.width,
    height: vp.height,
    deviceScaleFactor: 1,
    mobile: vp.width <= 640,
  });
  await cdp.eval(`(() => {
    document.documentElement.style.zoom = ${zoom === 1 ? "''" : `'${zoom}'`};
    window.scrollTo(0, 0);
  })()`);
  await sleep(150);

  return cdp.eval(`(() => {
    const vpWidth = ${vp.width};
    const vpHeight = ${vp.height};
    const zoom = ${zoom};
    const headerEl = document.querySelector('.teaching-collection--history .teaching-page-header');
    const summaryEl = document.querySelector('.teaching-collection--history .teaching-separation-banner');
    const groupBarEl = document.querySelector('.teaching-collection--history .teaching-group-filters');
    const dateNavEl = document.querySelector('.teaching-collection--history .teaching-date-nav');
    const firstCardEl = document.querySelector('.teaching-collection--history article.teaching-history-card');
    const dateEl = firstCardEl?.querySelector('time');
    const titleEl = firstCardEl?.querySelector('h2');
    const reopenBtnEl = firstCardEl?.querySelector('.teaching-history-actions button:first-child');
    const primaryReuseBtnEl = firstCardEl?.querySelector('.teaching-history-actions button.pf-btn--primary');
    const bottomDockEl = document.querySelector('.mobile-bottom-dock, .app-mobile-nav, nav[aria-label*="하단"]');

    const rectOf = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        left: Math.round(r.left),
        right: Math.round(r.right),
        width: Math.round(r.width),
        height: Math.round(r.height),
      };
    };

    const headerRect = rectOf(headerEl);
    const summaryRect = rectOf(summaryEl);
    const groupRect = rectOf(groupBarEl);
    const dateRect = rectOf(dateNavEl);
    const cardRect = rectOf(firstCardEl);
    const dateTextRect = rectOf(dateEl);
    const titleRect = rectOf(titleEl);
    const reopenRect = rectOf(reopenBtnEl);
    const reuseRect = rectOf(primaryReuseBtnEl);
    const dockRect = rectOf(bottomDockEl);

    const unobstructedBottomPx =
      dockRect && dockRect.height > 0 && dockRect.top < vpHeight ? dockRect.top : vpHeight;

    const cardVisibleHeightUnobstructedPx = cardRect
      ? Math.max(0, Math.min(cardRect.bottom, unobstructedBottomPx) - Math.max(cardRect.top, 0))
      : 0;

    const scrollNeededForPrimaryReusePx = reuseRect
      ? Math.max(0, reuseRect.bottom - unobstructedBottomPx)
      : -1;

    const buttonsAndInputs = Array.from(
      document.querySelectorAll(
        '.teaching-collection--history .teaching-group-filters button, .teaching-collection--history .teaching-date-nav button, .teaching-collection--history .teaching-search input, .teaching-collection--history article.teaching-history-card .teaching-history-actions button',
      ),
    );
    let minCssFontSizePx = Infinity;
    let minPhysicalTouchHeightPx = Infinity;
    for (const el of buttonsAndInputs) {
      const cs = window.getComputedStyle(el);
      const fs = parseFloat(cs.fontSize);
      if (!Number.isNaN(fs) && fs < minCssFontSizePx) minCssFontSizePx = fs;
      const r = el.getBoundingClientRect();
      const h = Math.round(r.height);
      if (h > 0 && h < minPhysicalTouchHeightPx) minPhysicalTouchHeightPx = h;
    }

    const visibleGroupPills = document.querySelectorAll(
      '.teaching-collection--history .teaching-group-filters button.teaching-group-pill',
    ).length;
    const visibleDateChips = document.querySelectorAll(
      '.teaching-collection--history .teaching-date-nav button.teaching-date-chip',
    ).length;

    const historyRoot = document.querySelector('.teaching-collection--history');
    return {
      viewport: vpWidth + 'x' + vpHeight,
      zoom: (zoom * 100) + '%',
      unobstructedBottomPx,
      headerHeightPx: headerRect?.height ?? 0,
      summaryHeightPx: summaryRect?.height ?? 0,
      groupFilterHeightPx: groupRect?.height ?? 0,
      dateNavHeightPx: dateRect?.height ?? 0,
      visibleGroupPills,
      visibleDateChips,
      firstCardTopPx: cardRect?.top ?? -1,
      firstCardHeightPx: cardRect?.height ?? 0,
      cardVisibleHeightUnobstructedPx,
      firstCardDateTopPx: dateTextRect?.top ?? -1,
      firstCardTitleTopPx: titleRect?.top ?? -1,
      primaryReuseBtnTopPx: reuseRect?.top ?? -1,
      primaryReuseBtnBottomPx: reuseRect?.bottom ?? -1,
      dateVisibleWithoutScroll: Boolean(dateTextRect && dateTextRect.bottom <= unobstructedBottomPx),
      titleVisibleWithoutScroll: Boolean(titleRect && titleRect.bottom <= unobstructedBottomPx),
      reopenBtnVisibleWithoutScroll: Boolean(reopenRect && reopenRect.bottom <= unobstructedBottomPx),
      primaryReuseVisibleWithoutScroll: Boolean(reuseRect && reuseRect.bottom <= unobstructedBottomPx),
      scrollNeededForPrimaryReusePx,
      minCssFontSizePx: Number(minCssFontSizePx.toFixed(2)),
      minPhysicalTouchHeightPx,
      horizontalOverflowPx: historyRoot
        ? Math.max(0, Math.round(historyRoot.scrollWidth - historyRoot.clientWidth))
        : 0,
    };
  })()`);
}

async function run() {
  const viteProc = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
    cwd: repoRoot,
    stdio: 'ignore',
  });
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'history-round5-cdp-'));
  const chromeProc = spawn(
    '/usr/bin/chromium',
    [
      '--headless',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${userDataDir}`,
      'about:blank',
    ],
    { cwd: repoRoot, stdio: 'ignore' },
  );

  let cdp;
  try {
    await waitForHttp(BASE_URL);
    await waitForHttp(`http://127.0.0.1:${CDP_PORT}/json/list`);
    const targets = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
    const pageTarget = targets.find((t) => t.type === 'page');
    cdp = new CdpSession(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    await cdp.send('Page.navigate', { url: BASE_URL });
    await sleep(600);
    await seedAndReload(cdp, 100, 50);

    const viewportResults = {};
    for (const vp of VIEWPORTS) {
      for (const zoomFactor of [1, 2]) {
        const key = `${vp.name}@${zoomFactor * 100}%`;
        const metrics = await measureViewportState(cdp, vp, zoomFactor);
        const baseline = ROUND4_BASELINE[key];
        viewportResults[key] = {
          ...metrics,
          round4Baseline: baseline,
          deltaFromRound4: baseline
            ? {
                groupFilterHeightDeltaPx: metrics.groupFilterHeightPx - baseline.groupFilterHeightPx,
                dateNavHeightDeltaPx: metrics.dateNavHeightPx - baseline.dateNavHeightPx,
                firstCardTopDeltaPx: metrics.firstCardTopPx - baseline.firstCardTopPx,
                cardVisibleHeightDeltaPx:
                  metrics.cardVisibleHeightUnobstructedPx - baseline.cardVisibleHeightUnobstructedPx,
                scrollNeededForPrimaryReuseDeltaPx:
                  metrics.scrollNeededForPrimaryReusePx - baseline.scrollNeededForPrimaryReusePx,
              }
            : null,
        };
        const screenshotPath = path.join(screenshotsDir, `round5-${vp.name}-${zoomFactor * 100}pct.png`);
        await cdp.screenshot(screenshotPath);
      }
    }

    // Measure 1,000-record scale + keyboard Escape/focus + contracts at 1440x900 @ 100%
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await cdp.eval(`document.documentElement.style.zoom = ''`);
    const t0 = Date.now();
    await seedAndReload(cdp, 1000, 365);
    const initialLoadAndRender1000Ms = Date.now() - t0;

    const scaleAndKeyboardMetrics = await cdp.eval(`(async () => {
      const groupBar = document.querySelector('.teaching-group-filters');
      const dateNav = document.querySelector('.teaching-date-nav');

      const groupMoreBtn = groupBar.querySelector('button.teaching-group-more-toggle');
      const tGroupExpand0 = performance.now();
      groupMoreBtn.click();
      await new Promise((r) => requestAnimationFrame(r));
      const groupExpandMs = Number((performance.now() - tGroupExpand0).toFixed(2));
      const expandedGroupCount = groupBar.querySelectorAll('button.teaching-group-pill').length;

      const fifthGroupPill = groupBar.querySelectorAll('button.teaching-group-pill')[4];
      fifthGroupPill.focus();
      groupBar.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await new Promise((r) => requestAnimationFrame(r));
      const groupCollapsedOnEscape = groupBar.classList.contains('is-collapsed');
      const groupFocusRestoredOnEscape =
        document.activeElement === groupBar.querySelector('button.teaching-group-more-toggle');

      const dateMoreBtn = dateNav.querySelector('button.teaching-date-more-toggle');
      const tDateExpand0 = performance.now();
      dateMoreBtn.click();
      await new Promise((r) => requestAnimationFrame(r));
      const dateExpandMs = Number((performance.now() - tDateExpand0).toFixed(2));
      const expandedDateCount = dateNav.querySelectorAll('button.teaching-date-chip').length;

      const tenthDateChip = dateNav.querySelectorAll('button.teaching-date-chip')[10];
      tenthDateChip.focus();
      dateNav.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await new Promise((r) => requestAnimationFrame(r));
      const dateCollapsedOnEscape = dateNav.classList.contains('is-collapsed');
      const dateFocusRestoredOnEscape =
        document.activeElement === dateNav.querySelector('button.teaching-date-more-toggle');

      const cards = Array.from(document.querySelectorAll('article.teaching-history-card'));
      const firstFourTimeBadges = cards.slice(0, 4).map((card) => ({
        title: card.querySelector('h2')?.textContent?.trim() ?? '',
        timeBadge: card.querySelector('.teaching-history-time-of-day')?.textContent?.trim() ?? null,
      }));

      const reopenBtn = cards[0].querySelector('.teaching-history-actions button:first-child');
      reopenBtn.focus();
      const tModalOpen0 = performance.now();
      reopenBtn.click();
      await new Promise((r) => requestAnimationFrame(r));
      const modalOpenMs = Number((performance.now() - tModalOpen0).toFixed(2));
      const dialogEl = document.querySelector('dialog[open]');
      const closeButtons = dialogEl ? Array.from(dialogEl.querySelectorAll('button')) : [];
      const closeBtn = closeButtons.filter((b) => b.textContent?.trim() === '닫기').at(-1);
      const tModalClose0 = performance.now();
      closeBtn?.click();
      await new Promise((r) => setTimeout(r, 30));
      const modalCloseMs = Number((performance.now() - tModalClose0).toFixed(2));
      const modalFocusRestored = document.activeElement === reopenBtn;

      return {
        initialDomArticleCount: cards.length,
        expandedGroupCount,
        groupExpandMs,
        groupCollapsedOnEscape,
        groupFocusRestoredOnEscape,
        expandedDateCount,
        dateExpandMs,
        dateCollapsedOnEscape,
        dateFocusRestoredOnEscape,
        modalOpenMs,
        modalCloseMs,
        modalFocusRestored,
        firstFourTimeBadges,
        clickCounts: {
          clicksToFirstReuse: 1,
          clicksToSelectInitialGroup: 1,
          clicksToSelectOlderGroup: 2,
          clicksToSelectRecentDate: 1,
          clicksToSelectOlderDate: 2,
        },
      };
    })()`);

    const output = {
      generatedAt: new Date().toISOString(),
      round: 'Round 5 (docs/history-zoom-clarity-round5-20261107)',
      viewports: viewportResults,
      scale1000AndKeyboard: {
        initialLoadAndRender1000Ms,
        ...scaleAndKeyboardMetrics,
      },
    };

    const jsonPath = path.join(evidenceDir, 'round5-zoom-clarity-metrics.json');
    fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2), 'utf8');
    console.log(JSON.stringify(output, null, 2));
  } finally {
    cdp?.close();
    chromeProc.kill('SIGKILL');
    viteProc.kill('SIGKILL');
    await sleep(300);
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup race
    }
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
