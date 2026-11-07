import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs/history-first-card-round4-20261107/evidence');
const SCREENSHOT_DIR = path.join(OUT_DIR, 'screenshots');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const PORT = 4194;
const CDP_PORT = 9244;
const BASE_URL = `http://127.0.0.1:${PORT}/?audit=round4`;

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
        supported: false,
        version: null,
        reason:
          'WebKit browser binary / Playwright WebKit cache is not installed in the sandboxed Debian 12 Linux VM (/usr/bin/chromium only; read-only root filesystem).',
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
          { id: 'ex-warmup-01', nameKo: '펠빅 클락 & 흉식 호흡 임프린팅', nameEn: 'Pelvic Clock & Ribcage Breathing', apparatus: 'reformer', category: 'warmup', level: '1.0', defaultDurationMin: 4 },
          { id: 'ex-warmup-02', nameKo: '캐딜락 롤다운 바 흉추 모빌리티 & 캣 스트레치', nameEn: 'Cadillac Roll-Down Bar Cat & Thoracic Opener', apparatus: 'cadillac', category: 'warmup', level: '1.0', defaultDurationMin: 4 },
          { id: 'ex-warmup-03', nameKo: '매트 폼롤러 흉추 릴리즈 & 립케이지 암써클', nameEn: 'Foam Roller Thoracic Release & Arm Circles', apparatus: 'mat', category: 'warmup', level: '1.0', defaultDurationMin: 4 }
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
        instructorReflection: '자정 전후 경계 테스트: UTC 23:55 (KST 익일 08:55)',
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
        instructorReflection: '자정 전후 경계 테스트: UTC 00:05',
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

async function measureScaleInBrowser(cdp, scaleCount) {
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  await cdp.send('Page.navigate', { url: BASE_URL });
  await sleep(1000);
  await cdp.eval(buildSeedExpression(scaleCount));

  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  const expectedInitialCards = Math.min(scaleCount, 30);
  await cdp.eval(`document.body.innerHTML = ''`);
  const navStart = performance.now();
  await cdp.send('Page.reload', { ignoreCache: true });
  while (performance.now() - navStart < 30000) {
    try {
      const ready = await cdp.eval(`(() => {
        const cards = document.querySelectorAll('.teaching-history-card').length;
        const badge = document.querySelector('.teaching-page-header .teaching-count')?.textContent?.trim();
        return cards >= ${expectedInitialCards} && badge === '${scaleCount}';
      })()`);
      if (ready) break;
    } catch {
      // navigating
    }
    await sleep(50);
  }
  await sleep(300);

  const viewportResults = [];
  for (const vp of VIEWPORTS) {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.width < 768,
    });
    await cdp.eval(`
      document.documentElement.style.zoom = '${vp.zoom}';
      window.dispatchEvent(new Event('resize'));
      window.scrollTo(0, 0);
    `);
    await sleep(250);

    const metrics = await cdp.eval(`(() => {
      const docEl = document.documentElement;
      const docOverflowPx = Math.max(0, docEl.scrollWidth - window.innerWidth);
      const cards = Array.from(document.querySelectorAll('.teaching-history-card'));
      let maxCardOverflowPx = 0;
      for (const c of cards.slice(0, 25)) {
        maxCardOverflowPx = Math.max(maxCardOverflowPx, c.scrollWidth - c.clientWidth);
      }
      const headerEl = document.querySelector('.teaching-page-header');
      const sepBannerEl = document.querySelector('.teaching-separation-banner');
      const toolbarEl = document.querySelector('.teaching-collection-toolbar');
      const groupFiltersEl = document.querySelector('.teaching-group-filters');
      const dateNav = document.querySelector('.teaching-date-nav');
      const bottomNav = document.querySelector('.bottom-nav');

      const headerRect = headerEl ? headerEl.getBoundingClientRect() : null;
      const sepBannerRect = sepBannerEl ? sepBannerEl.getBoundingClientRect() : null;
      const toolbarRect = toolbarEl ? toolbarEl.getBoundingClientRect() : null;
      const groupFiltersRect = groupFiltersEl ? groupFiltersEl.getBoundingClientRect() : null;
      const dateNavRect = dateNav ? dateNav.getBoundingClientRect() : null;
      const bottomNavRect = bottomNav && getComputedStyle(bottomNav).display !== 'none'
        ? bottomNav.getBoundingClientRect()
        : null;

      const viewportHeightPx = window.innerHeight;
      const unobstructedBottomPx = bottomNavRect
        ? Math.round(bottomNavRect.top)
        : viewportHeightPx;

      const dateChips = Array.from(document.querySelectorAll('.teaching-date-chip'));
      const dateChipToggle = document.querySelector('.teaching-date-more-toggle');
      const dateNavButtons = Array.from(document.querySelectorAll('.teaching-date-nav button'));
      let minTouchHeightPx = Infinity;
      let minTouchWidthPx = Infinity;
      for (const btn of dateNavButtons) {
        const r = btn.getBoundingClientRect();
        minTouchHeightPx = Math.min(minTouchHeightPx, Math.round(r.height));
        minTouchWidthPx = Math.min(minTouchWidthPx, Math.round(r.width));
      }

      const firstCard = cards[0];
      const firstCardRect = firstCard ? firstCard.getBoundingClientRect() : null;
      const firstCardTopPx = firstCardRect ? Math.round(firstCardRect.top) : 0;
      const firstCardBottomPx = firstCardRect ? Math.round(firstCardRect.bottom) : 0;
      const firstCardHeightPx = firstCardRect ? Math.round(firstCardRect.height) : 0;

      const cardVisibleHeightViewportPx = firstCardRect
        ? Math.max(0, Math.min(viewportHeightPx, firstCardBottomPx) - Math.max(0, firstCardTopPx))
        : 0;
      const cardVisibleHeightUnobstructedPx = firstCardRect
        ? Math.max(0, Math.min(unobstructedBottomPx, firstCardBottomPx) - Math.max(0, firstCardTopPx))
        : 0;

      // Measure Date, Title, and Primary Reuse Actions inside the first card
      const dateEl = firstCard?.querySelector('.teaching-history-datetime');
      const titleEl = firstCard?.querySelector('h2');
      const actionBtns = firstCard
        ? Array.from(firstCard.querySelectorAll('.teaching-history-actions button'))
        : [];
      const reopenBtn = actionBtns.find((b) => b.textContent.includes('이력 다시 열기')) || actionBtns[0];
      const reuseBtn = actionBtns.find((b) => b.textContent.includes('이 수업 다시 계획')) || actionBtns[1];

      const dateRect = dateEl ? dateEl.getBoundingClientRect() : null;
      const titleRect = titleEl ? titleEl.getBoundingClientRect() : null;
      const reopenRect = reopenBtn ? reopenBtn.getBoundingClientRect() : null;
      const reuseRect = reuseBtn ? reuseBtn.getBoundingClientRect() : null;

      const dateBottomPx = dateRect ? Math.round(dateRect.bottom) : 0;
      const titleBottomPx = titleRect ? Math.round(titleRect.bottom) : 0;
      const reopenBottomPx = reopenRect ? Math.round(reopenRect.bottom) : 0;
      const reuseBottomPx = reuseRect ? Math.round(reuseRect.bottom) : 0;

      return {
        docOverflowPx: Math.round(docOverflowPx),
        maxCardOverflowPx: Math.round(maxCardOverflowPx),
        cardCount: cards.length,
        dateChipCount: dateChips.length,
        hasDateChipToggle: Boolean(dateChipToggle),
        dateChipToggleText: dateChipToggle?.textContent?.trim() || null,
        viewportHeightPx,
        unobstructedBottomPx,
        headerHeightPx: headerRect ? Math.round(headerRect.height) : 0,
        separationBannerHeightPx: sepBannerRect ? Math.round(sepBannerRect.height) : 0,
        toolbarHeightPx: toolbarRect ? Math.round(toolbarRect.height) : 0,
        groupFiltersHeightPx: groupFiltersRect ? Math.round(groupFiltersRect.height) : 0,
        dateNavHeightPx: dateNavRect ? Math.round(dateNavRect.height) : 0,
        dateNavViewportRatio: dateNavRect ? Number((dateNavRect.height / viewportHeightPx).toFixed(2)) : 0,
        firstCardTopPx,
        firstCardBottomPx,
        firstCardHeightPx,
        cardVisibleHeightViewportPx,
        cardVisibleHeightUnobstructedPx,
        firstCardDateText: dateEl?.textContent?.trim() || null,
        firstCardDateTopPx: dateRect ? Math.round(dateRect.top) : 0,
        firstCardDateBottomPx: dateBottomPx,
        firstCardDateVisibleInViewport: Boolean(dateRect && dateRect.top >= 0 && dateBottomPx <= viewportHeightPx),
        firstCardDateVisibleUnobstructed: Boolean(dateRect && dateRect.top >= 0 && dateBottomPx <= unobstructedBottomPx),
        firstCardTitleText: titleEl?.textContent?.trim() || null,
        firstCardTitleTopPx: titleRect ? Math.round(titleRect.top) : 0,
        firstCardTitleBottomPx: titleBottomPx,
        firstCardTitleVisibleInViewport: Boolean(titleRect && titleRect.top >= 0 && titleBottomPx <= viewportHeightPx),
        firstCardTitleVisibleUnobstructed: Boolean(titleRect && titleRect.top >= 0 && titleBottomPx <= unobstructedBottomPx),
        firstCardReopenBtnBottomPx: reopenBottomPx,
        firstCardReuseBtnTopPx: reuseRect ? Math.round(reuseRect.top) : 0,
        firstCardReuseBtnBottomPx: reuseBottomPx,
        primaryReuseActionVisibleInViewport: Boolean(reuseRect && reuseRect.top >= 0 && reuseBottomPx <= viewportHeightPx),
        primaryReuseActionVisibleUnobstructed: Boolean(reuseRect && reuseRect.top >= 0 && reuseBottomPx <= unobstructedBottomPx),
        reopenActionVisibleUnobstructed: Boolean(reopenRect && reopenRect.top >= 0 && reopenBottomPx <= unobstructedBottomPx),
        scrollNeededForPrimaryReusePx: reuseRect ? Math.max(0, reuseBottomPx - unobstructedBottomPx) : 0,
        touchTargetMinHeightPx: minTouchHeightPx === Infinity ? 0 : minTouchHeightPx,
        touchTargetMinWidthPx: minTouchWidthPx === Infinity ? 0 : minTouchWidthPx,
        allTouchTargetsAtLeast44Px: minTouchHeightPx >= 44 && minTouchWidthPx >= 44,
      };
    })()`);

    const screenshotRel = `docs/history-first-card-round4-20261107/evidence/screenshots/round4-scale-${scaleCount}-${vp.id}.png`;
    await cdp.screenshot(path.join(ROOT, screenshotRel));

    viewportResults.push({
      ...vp,
      screenshot: screenshotRel,
      ...metrics,
    });
  }

  // Interactive workflow on Mobile 390px
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await cdp.eval(`
    document.documentElement.style.zoom = '1';
    window.dispatchEvent(new Event('resize'));
    window.scrollTo(0, 0);
  `);
  await sleep(250);

  const mobileWorkflow = await cdp.eval(`(async () => {
    const raf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const dateNav = document.querySelector('.teaching-date-nav');
    const initialCollapsedHeightPx = Math.round(dateNav.getBoundingClientRect().height);
    const initialChips = Array.from(dateNav.querySelectorAll('button.teaching-date-chip'));
    const initialChipCount = initialChips.length;

    // Keyboard navigation on mobile chips
    initialChips[0].focus();
    dateNav.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    const arrowDownMovedFocus = document.activeElement === initialChips[1];
    dateNav.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    const arrowUpMovedFocus = document.activeElement === initialChips[0];

    // Step 1 (Click 1): Click expand button ("이전 날짜 더보기")
    const toggleBtn = dateNav.querySelector('button.teaching-date-more-toggle');
    toggleBtn.click();
    await raf();
    const focusRetainedOnExpand = document.activeElement === toggleBtn;
    const expandedChips = Array.from(dateNav.querySelectorAll('button.teaching-date-chip'));
    const expandedChipCount = expandedChips.length;
    const expandedDateNavHeightPx = Math.round(dateNav.getBoundingClientRect().height);

    // Step 2 (Click 2): Select an older date (15th date chip, outside initial 3 recent dates)
    const targetOlderChip = expandedChips[Math.min(15, expandedChips.length - 1)];
    const targetOlderLabel = targetOlderChip.childNodes[0]?.textContent?.trim() || '';
    targetOlderChip.click();
    await raf();
    const filteredCardsBeforeCollapse = document.querySelectorAll('.teaching-history-card').length;
    const firstFilteredTitleBeforeCollapse = document.querySelector('.teaching-history-card h2')?.textContent?.trim() || '';

    // Step 3: Collapse ("날짜 접기") and verify selected older date chip stays visible, filter is unchanged, and focus stays on toggle
    const collapseBtn = dateNav.querySelector('button.teaching-date-more-toggle');
    collapseBtn.click();
    await raf();
    const focusRetainedOnCollapse = document.activeElement === collapseBtn;
    const collapsedChipsAfterSelect = Array.from(dateNav.querySelectorAll('button.teaching-date-chip'));
    const pinnedOlderChip = collapsedChipsAfterSelect.find((c) => c.textContent.includes(targetOlderLabel));
    const pinnedOlderDateVisibleWhenCollapsed = Boolean(pinnedOlderChip);
    const pinnedOlderDatePressed = pinnedOlderChip?.getAttribute('aria-pressed') === 'true';
    const filteredCardsAfterCollapse = document.querySelectorAll('.teaching-history-card').length;
    const firstFilteredTitleAfterCollapse = document.querySelector('.teaching-history-card h2')?.textContent?.trim() || '';
    const filterUnchangedAfterCollapse =
      filteredCardsAfterCollapse === filteredCardsBeforeCollapse &&
      firstFilteredTitleAfterCollapse === firstFilteredTitleBeforeCollapse &&
      filteredCardsAfterCollapse > 0;
    const collapsedWithPinnedDateHeightPx = Math.round(dateNav.getBoundingClientRect().height);

    // Step 4: Click "전체 날짜 보기" reset button and verify focus returns to "전체 날짜" chip
    const resetDateBtn = Array.from(dateNav.querySelectorAll('button.teaching-date-reset')).find(
      (b) => b.textContent.trim() === '전체 날짜 보기'
    );
    resetDateBtn.click();
    await raf();
    const allDatesChip = dateNav.querySelectorAll('button.teaching-date-chip')[0];
    const focusReturnedToAllDatesChip = document.activeElement === allDatesChip;
    const cardsAfterReset = document.querySelectorAll('.teaching-history-card').length;

    // Step 5: Detail modal open & close focus restoration
    const reopenBtn = Array.from(document.querySelectorAll('.teaching-history-actions button')).find(
      (b) => b.textContent.includes('이력 다시 열기')
    );
    reopenBtn.focus();
    reopenBtn.click();
    await raf();
    const closeBtns = Array.from(document.querySelectorAll('.teaching-history-detail-modal button')).filter(
      (b) => b.textContent.trim() === '닫기'
    );
    closeBtns.at(-1).click();
    await raf();
    const focusReturnedToReopenTrigger = document.activeElement === reopenBtn;

    return {
      initialCollapsedHeightPx,
      initialChipCount,
      clicksToSeeFirstCard: 0,
      clicksToSelectRecentDate: 1,
      clicksToSelectAnyOlderDate: 2,
      arrowDownMovedFocus,
      arrowUpMovedFocus,
      focusRetainedOnExpand,
      expandedChipCount,
      expandedDateNavHeightPx,
      targetOlderLabel,
      focusRetainedOnCollapse,
      collapsedChipCountWithPinnedOlderDate: collapsedChipsAfterSelect.length,
      pinnedOlderDateVisibleWhenCollapsed,
      pinnedOlderDatePressed,
      filterUnchangedAfterCollapse,
      collapsedWithPinnedDateHeightPx,
      focusReturnedToAllDatesChip,
      cardsAfterReset,
      focusReturnedToReopenTrigger,
    };
  })()`);

  return {
    scaleCount,
    viewports: viewportResults,
    mobile390Workflow: mobileWorkflow,
  };
}

async function main() {
  const environment = probeEngines();
  const viteProc = spawn(
    'npx',
    ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'],
    { cwd: ROOT, stdio: 'ignore' },
  );

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'history-round4-cdp-'));
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
    { cwd: ROOT, stdio: 'ignore' },
  );

  try {
    await waitForHttp(BASE_URL);
    await waitForHttp(`http://127.0.0.1:${CDP_PORT}/json/list`);
    const targets = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
    const pageTarget = targets.find((t) => t.type === 'page');
    const cdp = new CdpSession(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();

    const results = {};
    for (const s of [100, 1000]) {
      results[`scale${s}`] = await measureScaleInBrowser(cdp, s);
    }

    const outPath = path.join(OUT_DIR, 'round4-first-card-metrics.json');
    const report = {
      capturedAt: new Date().toISOString(),
      environment,
      results,
    };
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

    cdp.close();
    console.log(`Saved Round 4 evidence to ${outPath}`);
    console.log(fs.readFileSync(outPath, 'utf8'));
  } finally {
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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
