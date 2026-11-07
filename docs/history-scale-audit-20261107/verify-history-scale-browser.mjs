import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs/history-scale-audit-20261107/evidence');
const SCREENSHOT_DIR = path.join(OUT_DIR, 'screenshots');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const PORT = 4179;
const BASE_URL = `http://127.0.0.1:${PORT}/?audit=1`;

const VIEWPORTS = [
  { id: 'mobile-320', label: 'Mobile 320px', width: 320, height: 694, zoom: 1 },
  { id: 'mobile-390', label: 'Mobile 390px', width: 390, height: 844, zoom: 1 },
  { id: 'tablet-768', label: 'Tablet 768px', width: 768, height: 1024, zoom: 1 },
  { id: 'desktop-1440', label: 'Desktop 1440px', width: 1440, height: 900, zoom: 1 },
  { id: 'desktop-1440-zoom200', label: 'Desktop 1440px @ 200%', width: 1440, height: 900, zoom: 2 },
  { id: 'mobile-390-zoom200', label: 'Mobile 390px @ 200%', width: 390, height: 844, zoom: 2 },
];

function probeEngines() {
  let chromiumVersion = null;
  try {
    chromiumVersion = execSync('chromium --version 2>/dev/null || google-chrome --version 2>/dev/null')
      .toString()
      .trim()
      .split('\n')
      .pop();
  } catch {
    chromiumVersion = null;
  }
  let webkitBinary = null;
  try {
    webkitBinary = execSync('which webkit EphemeralWebKit PlaywrightWebKit 2>/dev/null').toString().trim() || null;
  } catch {
    webkitBinary = null;
  }
  return {
    os: `${os.type()} ${os.release()} (${os.arch()})`,
    nodeVersion: process.version,
    cpuModel: os.cpus()[0]?.model ?? 'unknown',
    cpuCores: os.cpus().length,
    totalMemGiB: Number((os.totalmem() / 1024 ** 3).toFixed(2)),
    timezoneOffsetMin: new Date().getTimezoneOffset(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    engines: {
      chromium: {
        supported: Boolean(chromiumVersion),
        version: chromiumVersion,
        binary: '/usr/bin/chromium',
      },
      webkit: {
        supported: Boolean(webkitBinary),
        version: null,
        reason:
          'WebKit browser binary / Playwright WebKit cache is not installed in the sandboxed Debian 12 Linux VM (/usr/bin/chromium only; read-only root filesystem without apt/Playwright download).',
      },
    },
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForHttp(url, timeoutMs = 20000) {
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

function buildSeedExpression(scaleCount) {
  return `(() => {
    const STORAGE_KEY = 'pilates-flow-atelier-storage-v3';
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : { state: {}, version: 3 };
    const state = parsed.state || parsed;
    const baseExercises = Array.isArray(state.exercises) && state.exercises.length >= 2
      ? state.exercises
      : [
          { id: 'ex-footwork', nameKo: '풋워크', nameEn: 'Footwork', apparatus: 'reformer', category: 'warmup', level: '1.0', defaultDurationMin: 6 },
          { id: 'ex-hundred', nameKo: '헌드레드', nameEn: 'The Hundred', apparatus: 'reformer', category: 'core', level: '1.5', defaultDurationMin: 6 },
          { id: 'ex-bridging', nameKo: '브릿징', nameEn: 'Pelvic Lift', apparatus: 'reformer', category: 'bridging', level: '1.5', defaultDurationMin: 6 }
        ];
    const ex0 = baseExercises[0];
    const ex1 = baseExercises[1] || ex0;
    const ex2 = baseExercises[2] || ex0;

    const LONG_KO_TITLE = '코어 안정화 및 흉추 신전·견갑골 하강 조절과 고관절 외회전-내전근 협응을 위한 리포머·캐딜락 복합 시퀀스 심화 프로그램 (초보자 허리 과신전 방지 및 호흡-골반저근 연결 큐잉 집중 55분 코스)';
    const LONG_KO_GROUP = '화·목 저녁 2교시 직장인 체형교정 및 코어·둔근 강화 소그룹 집중 케어 A반 (정원 6명)';
    const LONG_KO_NOTE = '1교시 워밍업 풋워크 구간에서 우측 골반이 먼저 들리는 보상 패턴이 관찰되어 스프링을 2R1B에서 2R로 낮추고 천골 접지 큐잉을 먼저 제공함.\\n헌드레드 진입 전 흉식 호흡에서 늑골 하각이 벌어지지 않도록 날숨 끝에서 복횡근 수축 유지를 3초간 확인한 뒤 컬업 높이를 조절함.\\n브릿징 및 햄스트링 컬 연결 시 무릎 안쪽 흔들림을 줄이기 위해 미니볼 내전근 등척성 수축을 병행함.';
    const SAME_NAME_TITLE = '화·목 저녁 리포머 코어 & 골반 정렬 50분';

    const classGroups = [
      { id: 'scale-group-evening-a', name: '화·목 저녁 A반', type: 'group', defaultLevel: '1.5', scheduleLabel: '화·목 19:30', notes: '' },
      { id: 'scale-group-morning-b', name: '월·수·금 오전 B반', type: 'group', defaultLevel: '1.0', scheduleLabel: '월·수·금 10:00', notes: '' },
      { id: 'scale-group-private-c', name: '개인 레슨 집중반', type: 'private', defaultLevel: '2.0', scheduleLabel: '상시 예약', notes: '' },
      { id: 'scale-group-long-ko', name: LONG_KO_GROUP, type: 'group', defaultLevel: '1.5', scheduleLabel: '화·목 20:30', notes: '' },
      { id: 'scale-group-empty-archive', name: '기록 없는 휴강·특강반 (빈필터 검증)', type: 'group', defaultLevel: '1.0', scheduleLabel: '토 09:00', notes: '' }
    ];

    const makeStep = (stepId, order, exId, dur) => ({
      stepId,
      order,
      kind: 'exercise',
      exerciseId: exId,
      blockCategory: order === 1 ? 'warmup' : order === 2 ? 'core' : 'bridging',
      durationMin: dur,
      movementSec: Math.max(60, dur * 60 - 60),
      explanationSec: 30,
      transitionSec: 30,
      selectedLayer: 'standard',
      customNote: ''
    });

    const historyLogs = [
      // Pre/Post-Midnight boundary records
      {
        id: 'scale-log-midnight-utc-before',
        sequenceId: 'scale-seq-recurring-core',
        sequenceTitle: '심야 개인 레슨 흉추 가동성 플로우 (UTC 23:55)',
        groupId: 'scale-group-private-c',
        groupName: '개인 레슨 집중반',
        apparatus: 'reformer',
        level: '1.5',
        taughtAt: '2026-11-06T23:55:00.000Z',
        actualDurationSec: 3000,
        actualRestDurationSec: 120,
        instructorReflection: '자정 전후 경계 테스트: UTC 23:55 (KST 익일 08:55 / PST 당일 15:55)',
        intensity: 'moderate',
        rating: 5,
        exerciseIds: [ex0.id, ex1.id],
        stepsSnapshot: [makeStep('m1-s1', 1, ex0.id, 25), makeStep('m1-s2', 2, ex1.id, 25)]
      },
      {
        id: 'scale-log-midnight-utc-after',
        sequenceId: 'scale-seq-recurring-core',
        sequenceTitle: '심야 개인 레슨 흉추 가동성 플로우 (UTC 00:05)',
        groupId: 'scale-group-private-c',
        groupName: '개인 레슨 집중반',
        apparatus: 'reformer',
        level: '1.5',
        taughtAt: '2026-11-07T00:05:00.000Z',
        actualDurationSec: 3000,
        actualRestDurationSec: 120,
        instructorReflection: '자정 전후 경계 테스트: UTC 00:05 (로컬 PST 기준 11월 6일 16:05이나 UTC 날짜 키는 2026-11-07로 분리됨)',
        intensity: 'moderate',
        rating: 5,
        exerciseIds: [ex0.id, ex1.id],
        stepsSnapshot: [makeStep('m2-s1', 1, ex0.id, 25), makeStep('m2-s2', 2, ex1.id, 25)]
      },
      {
        id: 'scale-log-midnight-kst-before',
        sequenceId: 'scale-seq-recurring-core',
        sequenceTitle: SAME_NAME_TITLE,
        groupId: 'scale-group-evening-a',
        groupName: '화·목 저녁 A반',
        apparatus: 'reformer',
        level: '1.5',
        taughtAt: '2026-11-06T14:50:00.000Z',
        actualDurationSec: 3000,
        actualRestDurationSec: 120,
        instructorReflection: 'KST 23:50 (UTC 14:50) 자정 직전 기록',
        intensity: 'moderate',
        rating: 5,
        exerciseIds: [ex0.id, ex1.id],
        stepsSnapshot: [makeStep('m3-s1', 1, ex0.id, 25), makeStep('m3-s2', 2, ex1.id, 25)]
      },
      {
        id: 'scale-log-midnight-kst-after',
        sequenceId: 'scale-seq-recurring-core',
        sequenceTitle: SAME_NAME_TITLE,
        groupId: 'scale-group-evening-a',
        groupName: '화·목 저녁 A반',
        apparatus: 'reformer',
        level: '1.5',
        taughtAt: '2026-11-06T15:10:00.000Z',
        actualDurationSec: 3000,
        actualRestDurationSec: 120,
        instructorReflection: 'KST 익일 00:10 (UTC 15:10) 자정 직후 기록',
        intensity: 'moderate',
        rating: 5,
        exerciseIds: [ex0.id, ex1.id],
        stepsSnapshot: [makeStep('m4-s1', 1, ex0.id, 25), makeStep('m4-s2', 2, ex1.id, 25)]
      },
      // Long Korean Title + Long Group + Long Reflection + 12 Steps
      {
        id: 'scale-log-long-korean',
        sequenceId: 'scale-seq-long-ko',
        sequenceTitle: LONG_KO_TITLE,
        groupId: 'scale-group-long-ko',
        groupName: LONG_KO_GROUP,
        apparatus: 'mixed',
        level: '2.0',
        taughtAt: '2026-11-06T11:30:00.000Z',
        actualDurationSec: 3300,
        actualRestDurationSec: 180,
        instructorReflection: LONG_KO_NOTE,
        intensity: 'intense',
        rating: 5,
        exerciseIds: Array.from({ length: 12 }, (_, idx) => [ex0, ex1, ex2][idx % 3].id),
        stepsSnapshot: Array.from({ length: 12 }, (_, idx) =>
          makeStep('long-s-' + (idx + 1), idx + 1, [ex0, ex1, ex2][idx % 3].id, 4)
        )
      }
    ];

    const baseUtcMs = Date.UTC(2026, 10, 5, 19, 30, 0);
    const activeGroups = classGroups.slice(0, 4);
    const remaining = ${scaleCount} - historyLogs.length;
    for (let i = 0; i < remaining; i += 1) {
      const dayOffset = Math.floor(i / 3);
      const slot = i % 3;
      const taughtAtIso = new Date(baseUtcMs - dayOffset * 86400000 - slot * 14400000).toISOString();
      const group = activeGroups[i % activeGroups.length];
      const isSameName = i < 24;
      const logId = 'scale-log-gen-' + String(i + 1).padStart(4, '0');
      historyLogs.push({
        id: logId,
        sequenceId: isSameName ? 'scale-seq-recurring-core' : 'scale-seq-' + ((i % 12) + 1),
        sequenceTitle: isSameName
          ? SAME_NAME_TITLE
          : '리포머 & 캐딜락 코어·둔근 협응 시퀀스 #' + (i + 1),
        groupId: group.id,
        groupName: group.name,
        apparatus: i % 4 === 0 ? 'mixed' : 'reformer',
        level: group.defaultLevel,
        taughtAt: taughtAtIso,
        actualDurationSec: 2700 + (i % 3) * 300,
        actualRestDurationSec: 120,
        instructorReflection: '누적 기록 #' + (i + 1) + ' (' + taughtAtIso.slice(0, 10) + ') 강사 메모: 호흡과 골반 중립 유지 양호.',
        intensity: i % 3 === 0 ? 'relaxed' : i % 3 === 1 ? 'moderate' : 'intense',
        rating: ((i % 3) + 3),
        exerciseIds: [ex0.id, ex1.id, ex2.id],
        stepsSnapshot: [
          makeStep(logId + '-s1', 1, ex0.id, 15),
          makeStep(logId + '-s2', 2, ex1.id, 20),
          makeStep(logId + '-s3', 3, ex2.id, 15)
        ]
      });
    }

    state.activeTab = 'history';
    state.classGroups = classGroups;
    state.historyLogs = historyLogs;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, version: parsed.version || 3 }));
    return historyLogs.length;
  })()`;
}

async function getCdpPerfMap(cdp) {
  const { metrics } = await cdp.send('Performance.getMetrics');
  const map = {};
  for (const m of metrics) map[m.name] = m.value;
  return map;
}

async function measureScaleInBrowser(cdp, scaleCount, screenshotPrefix = 'post-patch-scale') {
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Performance.enable');

  // Navigate once to initialize origin storage, then seed scaleCount logs
  await cdp.send('Page.navigate', { url: BASE_URL });
  await sleep(1200);
  await cdp.eval(buildSeedExpression(scaleCount));

  // Measure cold reload + hydration of History page at desktop 1440px first
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  const expectedInitialCards = Math.min(scaleCount, 30);
  const navStart = performance.now();
  await cdp.send('Page.reload', { ignoreCache: true });
  while (performance.now() - navStart < 30000) {
    try {
      const count = await cdp.eval(`document.querySelectorAll('.teaching-history-card').length`);
      if (count >= expectedInitialCards) break;
    } catch {
      // page execution context is still navigating
    }
    await sleep(40);
  }
  const hydrationMs = Number((performance.now() - navStart).toFixed(2));
  await sleep(300);

  const perfAfterHydration = await getCdpPerfMap(cdp);

  const viewportResults = [];
  for (const vp of VIEWPORTS) {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.width < 768,
    });
    await cdp.eval(`document.documentElement.style.zoom = '${vp.zoom}'; window.scrollTo(0, 0);`);
    await sleep(250);

    const metrics = await cdp.eval(`(() => {
      const docEl = document.documentElement;
      const docOverflowPx = Math.max(0, docEl.scrollWidth - window.innerWidth);
      const cards = Array.from(document.querySelectorAll('.teaching-history-card'));
      let maxCardOverflowPx = 0;
      for (const c of cards.slice(0, 25)) {
        maxCardOverflowPx = Math.max(maxCardOverflowPx, c.scrollWidth - c.clientWidth);
      }
      const dateNav = document.querySelector('.teaching-date-nav');
      const dateNavRect = dateNav ? dateNav.getBoundingClientRect() : null;
      const dateChips = Array.from(document.querySelectorAll('.teaching-date-chip'));
      const dateChipToggle = document.querySelector('.teaching-date-more-toggle');
      const dateGroups = Array.from(document.querySelectorAll('.teaching-history-date-group'));
      const firstCard = cards[0];
      const firstCardRect = firstCard ? firstCard.getBoundingClientRect() : null;

      // Detect duplicate rendered labels among date chips or date group headers (pre/post-midnight timezone bug)
      const chipLabels = dateChips.slice(1).map((btn) => btn.childNodes[0]?.textContent?.trim() || btn.textContent.trim());
      const duplicateChipLabels = chipLabels.filter((item, idx) => chipLabels.indexOf(item) !== idx);

      return {
        docOverflowPx: Math.round(docOverflowPx),
        cardCount: cards.length,
        totalDomNodes: document.getElementsByTagName('*').length,
        exercisePillCount: document.querySelectorAll('.teaching-history-exercises span').length,
        maxCardOverflowPx: Math.round(maxCardOverflowPx),
        dateChipCount: dateChips.length,
        hasDateChipToggle: Boolean(dateChipToggle),
        dateChipToggleText: dateChipToggle?.textContent?.trim() || null,
        dateGroupCount: dateGroups.length,
        dateNavHeightPx: dateNavRect ? Math.round(dateNavRect.height) : 0,
        dateNavViewportRatio: dateNavRect ? Number((dateNavRect.height / window.innerHeight).toFixed(2)) : 0,
        firstCardTopPx: firstCardRect ? Math.round(firstCardRect.top) : 0,
        duplicateDateChipLabels: Array.from(new Set(duplicateChipLabels)),
      };
    })()`);

    // Capture screenshots for N=100 and N=1000 across key viewports
    const screenshotRel = `docs/history-scale-audit-20261107/evidence/screenshots/${screenshotPrefix}-${scaleCount}-${vp.id}.png`;
    await cdp.screenshot(path.join(ROOT, screenshotRel));

    viewportResults.push({
      ...vp,
      screenshot: screenshotRel,
      ...metrics,
    });
  }

  // Reset to 1440px @ 100% for interactive latency benchmarks
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await cdp.eval(`document.documentElement.style.zoom = '1'; window.scrollTo(0, 0);`);
  await sleep(150);

  const interactionMetrics = await cdp.eval(`(async () => {
    const raf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const setInputValue = (input, val) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, val);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const fullCountText = document.querySelector('.teaching-header p.muted')?.textContent?.trim() || '';
    const allDatesChipCount = document.querySelector('.teaching-date-chip .teaching-date-chip-count')?.textContent?.trim() || '';

    // Check synthetic 12:00 suppression on date-only card
    const dateOnlyCard = Array.from(document.querySelectorAll('.teaching-history-card')).find((card) =>
      card.textContent?.includes('날짜만 선택된 과거 수업')
    );
    const synthetic1200BadgeShownOnDateOnlyCard = Boolean(
      dateOnlyCard?.querySelector('.teaching-history-time')
    );

    const searchInput = document.querySelector('input[type="search"], .teaching-search input');

    // 1. Search filter latency (same-name class query)
    const tSearch0 = performance.now();
    setInputValue(searchInput, '화·목 저녁 리포머 코어');
    await raf();
    const searchFilterMs = Number((performance.now() - tSearch0).toFixed(2));
    const sameNameMatchedCount = document.querySelectorAll('.teaching-history-card').length;

    // Reset search
    const tReset0 = performance.now();
    setInputValue(searchInput, '');
    await raf();
    const searchResetMs = Number((performance.now() - tReset0).toFixed(2));

    // 2. Date chip filter latency + expand/collapse toggle latency
    const dateChipToggle = document.querySelector('.teaching-date-more-toggle');
    const dateChipExpandButtonText = dateChipToggle?.textContent?.trim() || null;
    let dateChipExpandMs = 0;
    let dateChipsAfterExpand = document.querySelectorAll('.teaching-date-chip').length;
    if (dateChipToggle) {
      const tExpand0 = performance.now();
      dateChipToggle.click();
      await raf();
      dateChipExpandMs = Number((performance.now() - tExpand0).toFixed(2));
      dateChipsAfterExpand = document.querySelectorAll('.teaching-date-chip').length;
      const collapseToggle = document.querySelector('.teaching-date-more-toggle');
      if (collapseToggle) {
        collapseToggle.click();
        await raf();
      }
    }

    const dateChips = Array.from(document.querySelectorAll('.teaching-date-chip'));
    const secondChip = dateChips[1];
    const tDate0 = performance.now();
    secondChip.click();
    await raf();
    const dateFilterMs = Number((performance.now() - tDate0).toFixed(2));
    const dateFilteredCards = document.querySelectorAll('.teaching-history-card').length;

    // 3. Stale selectedDate + search query recovery check
    setInputValue(searchInput, '존재하지않는특수검색어XYZ');
    await raf();
    const emptyWithStaleDateTitle = document.querySelector('.pf-empty-state h2')?.textContent?.trim() || '';
    const resetSearchAfterStaleDateBtn = document.querySelector('.pf-empty-state button');
    if (resetSearchAfterStaleDateBtn) resetSearchAfterStaleDateBtn.click();
    await raf();
    const allDatesChipReset = Array.from(document.querySelectorAll('.teaching-date-chip'))[0];
    if (allDatesChipReset) allDatesChipReset.click();
    await raf();

    // 4. Empty group filter latency
    const groupButtons = Array.from(document.querySelectorAll('.teaching-group-filters button'));
    const emptyGroupBtn = groupButtons.find((b) => b.textContent.includes('기록 없는 휴강'));
    const tGroup0 = performance.now();
    emptyGroupBtn.click();
    await raf();
    const emptyGroupFilterMs = Number((performance.now() - tGroup0).toFixed(2));
    const emptyGroupTitle = document.querySelector('.pf-empty-state h2')?.textContent?.trim() || '';
    const resetBtn = document.querySelector('.pf-empty-state button');
    resetBtn.click();
    await raf();

    // 5. Detail modal open/close latency on the 12-step Long Korean record
    const reopenBtns = Array.from(document.querySelectorAll('.teaching-history-actions button')).filter((b) =>
      b.textContent.includes('이력 다시 열기')
    );
    const tModal0 = performance.now();
    reopenBtns[0].click();
    await raf();
    const modalOpenMs = Number((performance.now() - tModal0).toFixed(2));
    const modalOpen = Boolean(document.querySelector('.teaching-history-detail-modal'));
    const closeBtns = Array.from(document.querySelectorAll('.teaching-history-detail-modal button')).filter((b) =>
      b.textContent.trim() === '닫기'
    );
    const closeBtn = closeBtns.at(-1);
    if (closeBtn) closeBtn.click();
    await raf();

    // 6. Load more cards benchmark (+30 cards)
    const loadMoreBtn = document.querySelector('.teaching-history-load-more button');
    const loadMoreButtonText = loadMoreBtn?.textContent?.trim() || null;
    let loadMoreMs = 0;
    let cardsAfterLoadMore = document.querySelectorAll('.teaching-history-card').length;
    if (loadMoreBtn) {
      const tMore0 = performance.now();
      loadMoreBtn.click();
      await raf();
      loadMoreMs = Number((performance.now() - tMore0).toFixed(2));
      cardsAfterLoadMore = document.querySelectorAll('.teaching-history-card').length;
    }

    // 7. Scroll responsiveness across 10 steps on mobile 390px
    const frameTimes = [];
    for (let i = 0; i < 10; i += 1) {
      const ts = performance.now();
      window.scrollBy(0, 600);
      await new Promise((r) => requestAnimationFrame(r));
      frameTimes.push(Number((performance.now() - ts).toFixed(2)));
    }
    window.scrollTo(0, 0);
    await raf();

    return {
      fullCountText,
      allDatesChipCount,
      synthetic1200BadgeShownOnDateOnlyCard,
      searchFilterMs,
      sameNameMatchedCount,
      searchResetMs,
      dateChipExpandButtonText,
      dateChipExpandMs,
      dateChipsAfterExpand,
      dateFilterMs,
      dateFilteredCards,
      emptyWithStaleDateTitle,
      emptyGroupFilterMs,
      emptyGroupTitle,
      modalOpenMs,
      modalOpen,
      loadMoreButtonText,
      loadMoreMs,
      cardsAfterLoadMore,
      scrollFrameTimesMs: frameTimes,
      maxScrollFrameMs: Math.max(...frameTimes),
      avgScrollFrameMs: Number((frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length).toFixed(2)),
    };
  })()`);

  const perfAfterInteractions = await getCdpPerfMap(cdp);

  return {
    scaleCount,
    hydrationMs,
    memoryAndEngineMetrics: {
      afterHydration: {
        jsHeapUsedMB: Number((perfAfterHydration.JSHeapUsedSize / 1024 ** 2).toFixed(2)),
        jsHeapTotalMB: Number((perfAfterHydration.JSHeapTotalSize / 1024 ** 2).toFixed(2)),
        domNodes: perfAfterHydration.Nodes,
        layoutCount: perfAfterHydration.LayoutCount,
        recalcStyleCount: perfAfterHydration.RecalcStyleCount,
        scriptDurationSec: Number(perfAfterHydration.ScriptDuration.toFixed(3)),
        layoutDurationSec: Number(perfAfterHydration.LayoutDuration.toFixed(3)),
      },
      afterInteractions: {
        jsHeapUsedMB: Number((perfAfterInteractions.JSHeapUsedSize / 1024 ** 2).toFixed(2)),
        jsHeapTotalMB: Number((perfAfterInteractions.JSHeapTotalSize / 1024 ** 2).toFixed(2)),
        domNodes: perfAfterInteractions.Nodes,
        layoutCount: perfAfterInteractions.LayoutCount,
        recalcStyleCount: perfAfterInteractions.RecalcStyleCount,
        scriptDurationSec: Number(perfAfterInteractions.ScriptDuration.toFixed(3)),
        layoutDurationSec: Number(perfAfterInteractions.LayoutDuration.toFixed(3)),
      },
    },
    viewports: viewportResults,
    interactions: interactionMetrics,
  };
}

async function main() {
  const scaleArg = process.argv.find((a) => a.startsWith('--scale='))?.split('=')[1];
  const outArg = process.argv.find((a) => a.startsWith('--out='))?.split('=')[1] || 'post-patch-scale-metrics.json';
  const screenshotPrefixArg =
    process.argv.find((a) => a.startsWith('--screenshot-prefix='))?.split('=')[1] || 'post-patch-scale';
  const scalesToRun = scaleArg ? [Number(scaleArg)] : [100, 1000];
  const environment = probeEngines();
  const viteProc = spawn(
    'npx',
    ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'],
    { cwd: ROOT, stdio: 'ignore' },
  );

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'history-scale-cdp-'));
  const chromeProc = spawn(
    '/usr/bin/chromium',
    [
      '--headless',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--remote-debugging-port=9233',
      `--user-data-dir=${userDataDir}`,
      'about:blank',
    ],
    { cwd: ROOT, stdio: 'ignore' },
  );

  try {
    await waitForHttp(BASE_URL);
    await waitForHttp('http://127.0.0.1:9233/json/list');
    const targets = await (await fetch('http://127.0.0.1:9233/json/list')).json();
    const pageTarget = targets.find((t) => t.type === 'page');
    const cdp = new CdpSession(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();

    const outPath = path.join(OUT_DIR, outArg);
    let existing = { results: {} };
    if (fs.existsSync(outPath)) {
      try {
        existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
      } catch {
        existing = { results: {} };
      }
    }

    const results = { ...(existing.results || {}) };
    for (const s of scalesToRun) {
      results[`scale${s}`] = await measureScaleInBrowser(cdp, s, screenshotPrefixArg);
      const report = {
        capturedAt: new Date().toISOString(),
        environment,
        results,
      };
      fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
    }

    cdp.close();
    console.log(`Saved scale audit evidence to ${outPath}`);
    console.log(fs.readFileSync(outPath, 'utf8'));
  } finally {
    chromeProc.kill('SIGKILL');
    viteProc.kill('SIGKILL');
    await sleep(300);
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // ignore asynchronous chromium file handle cleanup race
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
