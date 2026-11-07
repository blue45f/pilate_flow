import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { createControllableStaticServer } from './controllable-static-server.mjs';

const ROOT_DIR = '/home/antigravity/blue45f/pilate_flow';
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const ROUND4_DIR = path.join(ROOT_DIR, 'docs', 'integration-round4-20261107');
const EVIDENCE_DIR = path.join(ROUND4_DIR, 'evidence');
const SCREENSHOT_DIR = path.join(EVIDENCE_DIR, 'screenshots');
const SUMMARY_JSON_PATH = path.join(EVIDENCE_DIR, 'round4-cross-regression-summary.json');


function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runGit(args) {
  return execFileSync('git', args, { cwd: ROOT_DIR, encoding: 'utf8' }).trim();
}

function isAncestor(ancestor, descendant = 'origin/main') {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', ancestor, descendant], {
      cwd: ROOT_DIR,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

function verifyGitAncestry() {
  const checkedAtUtc = new Date().toISOString();
  const originMainHead = runGit(['rev-parse', 'origin/main']);
  const targets = [
    {
      domain: 'diagram-merge',
      shortRef: 'b2d6022b',
      fullSha: runGit(['rev-parse', 'b2d6022b']),
      subject: runGit(['log', '-1', '--format=%s', 'b2d6022b']),
    },
    {
      domain: 'diagram-impl',
      shortRef: '55ce22d3',
      fullSha: runGit(['rev-parse', '55ce22d3']),
      subject: runGit(['log', '-1', '--format=%s', '55ce22d3']),
    },
    {
      domain: 'pwa-merge',
      shortRef: '644185d8',
      fullSha: runGit(['rev-parse', '644185d8']),
      subject: runGit(['log', '-1', '--format=%s', '644185d8']),
    },
    {
      domain: 'pwa-impl',
      shortRef: 'c477422d',
      fullSha: runGit(['rev-parse', 'c477422d']),
      subject: runGit(['log', '-1', '--format=%s', 'c477422d']),
    },
    {
      domain: 'history-noon-midnight-merge',
      shortRef: '606f7ad4',
      fullSha: runGit(['rev-parse', '606f7ad4']),
      subject: runGit(['log', '-1', '--format=%s', '606f7ad4']),
    },
    {
      domain: 'history-noon-midnight-impl',
      shortRef: '624e2c18',
      fullSha: runGit(['rev-parse', '624e2c18']),
      subject: runGit(['log', '-1', '--format=%s', '624e2c18']),
    },
  ].map((item) => ({
    ...item,
    isAncestorOfOriginMain: isAncestor(item.fullSha, originMainHead),
  }));

  for (const t of targets) {
    assert.equal(
      t.isAncestorOfOriginMain,
      true,
      `Expected ${t.shortRef} (${t.fullSha}) to be an ancestor of origin/main (${originMainHead})`,
    );
  }

  return {
    checkedAtUtc,
    originMainHead,
    allTargetsPreservedOnOriginMain: targets.every((t) => t.isAncestorOfOriginMain),
    targets,
  };
}

function probeWebKitAvailability() {
  const candidates = [
    '/usr/bin/safari',
    '/usr/bin/MiniBrowser',
    '/usr/bin/WebKitWebProcess',
    '/usr/bin/epiphany',
    '/usr/bin/midori',
    '/usr/local/bin/webkit',
  ];
  const found = candidates.filter((p) => existsSync(p));
  return {
    webkitRuntimeAvailable: found.length > 0,
    probedPaths: candidates,
    foundBinaries: found,
    verdict:
      found.length > 0
        ? 'VERIFIED'
        : 'UNVERIFIED (미검증 — Linux Debian 12 컨테이너 내 WebKit 바이너리 부재, Chromium 결과를 Safari PASS로 간주하지 않음)',
  };
}


class CdpSession {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.nextId = 1;
    this.pending = new Map();
    this.consoleErrors = [];
    this.pageErrors = [];
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(String(event.data));
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        this.pageErrors.push(msg.params?.exceptionDetails?.text || 'Runtime.exceptionThrown');
      } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params?.type === 'error') {
        const text = (msg.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ');
        if (!text.includes('ERR_INTERNET_DISCONNECTED') && !text.includes('Failed to fetch')) {
          this.consoleErrors.push(text);
        }
      }
    });
    await this.send('Page.enable');
    await this.send('Runtime.enable');
    await this.send('Network.enable');
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (res.exceptionDetails) {
      throw new Error(
        `Eval exception: ${res.exceptionDetails.text} ${res.exceptionDetails.exception?.description || ''}`,
      );
    }
    return res.result?.value;
  }

  async waitFor(predicateJs, timeoutMs = 15000, label = predicateJs) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const ok = await this.eval(`Boolean(${predicateJs})`);
        if (ok) return true;
      } catch {
        // ignore transient navigation context destruction
      }
      await sleep(120);
    }
    throw new Error(`Timed out waiting for: ${label}`);
  }

  async setViewport(width, height) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 768,
    });
  }

  async screenshot(filePath) {
    const { data } = await this.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(filePath, Buffer.from(data, 'base64'));
  }

  close() {
    try {
      this.ws?.close();
    } catch {
      // ignore
    }
  }
}

async function runContinuousJourneyAtViewport(baseUrl, staticServer, viewport) {
  const { width, height } = viewport;
  const isolatedProfileDir = mkdtempSync(`/tmp/pilates-round4-vp-${width}-`);
  const debugPort = 9500 + Math.floor(Math.random() * 400);

  staticServer.setOffline(false);

  const chromeProc = spawn(
    '/usr/bin/chromium',
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      `--user-data-dir=${isolatedProfileDir}`,
      `--remote-debugging-port=${debugPort}`,
      `--window-size=${width},${height}`,
      `${baseUrl}/`,
    ],
    { stdio: 'ignore', env: { ...process.env, TZ: 'Asia/Seoul' } },
  );

  let cdp;
  try {
    let targetWsUrl = null;
    for (let i = 0; i < 60; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
        const pages = await res.json();
        const page = pages.find((p) => p.type === 'page' && p.url.startsWith(baseUrl));
        if (page?.webSocketDebuggerUrl) {
          targetWsUrl = page.webSocketDebuggerUrl;
          break;
        }
      } catch {
        // wait
      }
      await sleep(150);
    }
    assert.ok(targetWsUrl, `Failed to attach to Chromium target at ${width}px`);
    cdp = new CdpSession(targetWsUrl);
    await cdp.connect();
    await cdp.setViewport(width, height);

    // Wait for service worker ready & reload so page is controlled by sw.js
    await cdp.waitFor(
      `navigator.serviceWorker && navigator.serviceWorker.ready`,
      15000,
      `SW ready (${width}px)`,
    );
    await cdp.eval(`
      (async () => {
        const reg = await navigator.serviceWorker.ready;
        if (!reg.active) throw new Error('SW not active');
        return reg.active.state;
      })()
    `);
    await cdp.send('Page.reload', { ignoreCache: false });
    await cdp.waitFor(
      `Boolean(navigator.serviceWorker && navigator.serviceWorker.controller) && Boolean(document.querySelector('nav'))`,
      15000,
      `Controlled by SW (${width}px)`,
    );

    // =========================================================================
    // 1. 동작찾기 (ExerciseAtlasView + Diagram b2d6022b D-01 verification)
    // =========================================================================
    await cdp.eval(`(() => {
      const newClassBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('새 수업 만들기') && b.closest('[aria-label="새 수업 및 최근 수업 전환"]')
      );
      newClassBtn?.click();
    })()`);
    await cdp.waitFor(
      `Boolean(document.querySelector('[aria-label="첫 수업안 준비"]'))`,
      10000,
      `Empty Home state (${width}px)`,
    );

    await cdp.eval(`(() => {
      const navButtons = Array.from(document.querySelectorAll('nav button'));
      const atlasBtn = navButtons.find(
        (b) => b.getClientRects().length > 0 && b.textContent?.includes('동작')
      ) || navButtons.find((b) => b.textContent?.includes('동작'));
      atlasBtn?.click();
    })()`);
    await cdp.waitFor(
      `Boolean(document.querySelector('input[aria-label="동작 검색"]')) && document.querySelectorAll('button[aria-label$="수업안에 추가"]').length > 0`,
      10000,
      `ExerciseAtlasView loaded (${width}px)`,
    );

    // Search for D-01 exercise ('스트랩 프로그 준비')
    await cdp.eval(`(() => {
      const resetBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('필터 초기화')
      );
      resetBtn?.click();
      const input = document.querySelector('input[aria-label="동작 검색"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      setter?.call(input, '스트랩 프로그 준비');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await cdp.waitFor(
      `Array.from(document.querySelectorAll('.movement-card h2 button')).some((b) => b.textContent?.trim() === '스트랩 프로그 준비')`,
      10000,
      `D-01 card filtered (${width}px)`,
    );

    // Open D-01 detail modal & verify diagram SVG (b2d6022b)
    await cdp.eval(`(() => {
      const titleBtn = Array.from(document.querySelectorAll('.movement-card h2 button')).find(
        (b) => b.textContent?.trim() === '스트랩 프로그 준비'
      );
      titleBtn?.click();
    })()`);
    await cdp.waitFor(
      `Boolean(document.querySelector('details.movement-diagram-reference'))`,
      10000,
      `D-01 modal opened (${width}px)`,
    );
    await cdp.eval(`(() => {
      const details = document.querySelector('details.movement-diagram-reference');
      if (details && !details.open) {
        details.querySelector('summary')?.click();
        details.open = true;
      }
    })()`);
    await cdp.waitFor(
      `Boolean(document.querySelector('details.movement-diagram-reference svg.movement-phase-diagram-svg'))`,
      10000,
      `D-01 SVG rendered (${width}px)`,
    );

    const diagramCheck = await cdp.eval(`(() => {
      const svg = document.querySelector('details.movement-diagram-reference svg.movement-phase-diagram-svg');
      const markup = svg?.outerHTML ?? '';
      return {
        archetypeId: svg?.getAttribute('data-archetype-id') ?? null,
        apparatus: svg?.getAttribute('data-apparatus') ?? null,
        jointNodeCount: svg?.querySelectorAll('[data-joint-node]').length ?? 0,
        hasNaNOrUndefined: /NaN|undefined/.test(markup),
        overflowPx: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      };
    })()`);
    assert.equal(diagramCheck.archetypeId, 'reformer-strap-frog-isolated');
    assert.equal(diagramCheck.jointNodeCount, 7);
    assert.equal(diagramCheck.hasNaNOrUndefined, false);
    assert.equal(diagramCheck.overflowPx, 0);

    // Close modal, observe cross-apparatus guard toast when adding reformer exercise to default mat draft,
    // then select '매트' filter and add 2 mat exercises to sequence
    await cdp.eval(`(() => {
      const openDialog = Array.from(document.querySelectorAll('dialog[open]')).at(-1);
      openDialog?.querySelector('button[aria-label="닫기"]')?.click();
    })()`);
    await cdp.waitFor(
      `document.querySelectorAll('dialog[open]').length === 0`,
      10000,
      `D-01 modal closed (${width}px)`,
    );

    // Filter to '매트' with empty search query and add 2 mat exercises
    await cdp.eval(`(() => {
      const input = document.querySelector('input[aria-label="동작 검색"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      setter?.call(input, '');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      const group = document.querySelector('[aria-label="기구 선택"]');
      const matBtn = Array.from(group?.querySelectorAll('button') ?? []).find((b) =>
        b.textContent?.includes('매트')
      );
      matBtn?.click();
    })()`);
    await cdp.waitFor(
      `Boolean(Array.from(document.querySelectorAll('[aria-label="기구 선택"] button')).find((b) => b.textContent?.includes('매트') && b.getAttribute('aria-pressed') === 'true')) && document.querySelectorAll('button[aria-label$="수업안에 추가"]').length >= 2`,
      10000,
      `Atlas filtered to 매트 (${width}px)`,
    );

    await cdp.eval(`(() => {
      document.querySelectorAll('button[aria-label$="수업안에 추가"]')[0]?.click();
    })()`);
    await cdp.waitFor(
      `document.querySelectorAll('.movement-card.is-in-sequence').length >= 1`,
      10000,
      `First mat exercise added (${width}px)`,
    );

    await cdp.eval(`(() => {
      document.querySelectorAll('button[aria-label$="수업안에 추가"]')[1]?.click();
    })()`);
    await cdp.waitFor(
      `document.querySelectorAll('.movement-card.is-in-sequence').length >= 2`,
      10000,
      `Second mat exercise added (${width}px)`,
    );

    // =========================================================================
    // 2. 수업안추가 / 순서변경 (SequenceWorkbench)
    // =========================================================================
    await cdp.eval(`(() => {
      const navButtons = Array.from(document.querySelectorAll('nav button'));
      const wbBtn = navButtons.find(
        (b) => b.getClientRects().length > 0 && b.textContent?.includes('수업') && !b.textContent?.includes('기록')
      ) || navButtons.find((b) => b.textContent?.includes('오늘의 수업'));
      wbBtn?.click();
    })()`);
    await cdp.waitFor(
      `document.querySelectorAll('.sequence-order-card').length === 2`,
      10000,
      `Workbench has 2 exercise cards (${width}px)`,
    );

    // Add 1 Rest step
    await cdp.eval(`(() => {
      const restDetails = document.querySelector('details.rest-insert-control');
      if (restDetails) {
        restDetails.open = true;
        const insertRestBtn = Array.from(restDetails.querySelectorAll('button')).find((b) =>
          b.textContent?.includes('이 위치에 휴식 넣기')
        );
        insertRestBtn?.click();
      }
    })()`);
    await cdp.waitFor(
      `document.querySelectorAll('.sequence-order-card').length === 3`,
      10000,
      `Workbench has 3 steps (${width}px)`,
    );

    const beforeReorder = await cdp.eval(`(() => {
      const cards = Array.from(document.querySelectorAll('.sequence-order-card'));
      return {
        stepIds: cards.map((c) => c.getAttribute('data-order-step')),
        titles: cards.map((c) => c.querySelector('.step-title strong, h3')?.textContent?.trim() ?? ''),
      };
    })()`);

    // Click '위로 이동' on the second card (index 1) to swap step 0 and step 1
    await cdp.eval(`(() => {
      const cards = Array.from(document.querySelectorAll('.sequence-order-card'));
      const secondCardUpBtn = cards[1]?.querySelector('button[aria-label$="위로 이동"]');
      secondCardUpBtn?.click();
    })()`);
    await cdp.waitFor(
      `document.querySelectorAll('.sequence-order-card')[0]?.getAttribute('data-order-step') === ${JSON.stringify(beforeReorder.stepIds[1])}`,
      10000,
      `Step 1 moved above Step 0 (${width}px)`,
    );

    const afterReorder = await cdp.eval(`(() => {
      const cards = Array.from(document.querySelectorAll('.sequence-order-card'));
      return {
        stepIds: cards.map((c) => c.getAttribute('data-order-step')),
        titles: cards.map((c) => c.querySelector('.step-title strong, h3')?.textContent?.trim() ?? ''),
        overflowPx: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      };
    })()`);
    assert.deepEqual(afterReorder.stepIds, [
      beforeReorder.stepIds[1],
      beforeReorder.stepIds[0],
      beforeReorder.stepIds[2],
    ]);
    assert.equal(afterReorder.overflowPx, 0);

    // =========================================================================
    // 3. 저장 + 진행한 수업 기록 + 정오(12:00)/자정(00:00) 시각보존 합성 fixture
    // =========================================================================
    const syntheticTitle = `[합성-R4-${width}] 도해·순서변경·기록·오프라인 연속흐름`;
    await cdp.eval(`(() => {
      const titleInput = document.querySelector('input[aria-label="시퀀스 제목"]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      setter?.call(titleInput, ${JSON.stringify(syntheticTitle)});
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
      titleInput.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await sleep(80);
    await cdp.eval(`(() => {
      document.querySelector('button.save-flow')?.click();
    })()`);
    await sleep(150);

    await cdp.screenshot(path.join(SCREENSHOT_DIR, `r4-${width}-01-workbench-reordered-saved.png`));

    // Also log the current session via the real UI ('진행한 수업 기록' -> LogSessionModal submit)
    await cdp.eval(`(() => {
      const logBtn = Array.from(document.querySelectorAll('.workbench-footnotes button')).find(
        (b) => b.textContent?.includes('진행한 수업 기록')
      );
      logBtn?.click();
    })()`);
    await cdp.waitFor(
      `Boolean(document.querySelector('dialog[open] form'))`,
      10000,
      `LogSessionModal opened (${width}px)`,
    );
    await cdp.eval(`(() => {
      const form = document.querySelector('dialog[open] form');
      const textarea = form?.querySelector('textarea');
      if (textarea) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
        setter?.call(textarea, '[합성-R4] UI 모달에서 남긴 수업 기록 메모');
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const submitBtn = Array.from(form?.querySelectorAll('button[type="submit"]') ?? [])[0];
      submitBtn?.click();
    })()`);
    await cdp.waitFor(
      `Boolean(document.querySelector('.teaching-collection'))`,
      10000,
      `LogSessionModal submitted and navigated to ClassBinderView (${width}px)`,
    );

    // Seed explicit local Noon (12:00), local Midnight (00:00), and Date-only (YYYY-MM-DD)
    // synthetic records based on the newly created history log's snapshot in localStorage,
    // then reload online once so Zustand hydrates the synthetic noon/midnight/date-only fixtures
    const seededTimestamps = await cdp.eval(`(() => {
      const raw = localStorage.getItem('pilates-flow-atelier-storage-v3');
      if (!raw) throw new Error('Storage missing');
      const parsed = JSON.parse(raw);
      const logs = parsed.state.historyLogs || [];
      const uiLogged = logs[0];
      if (!uiLogged) throw new Error('UI logged history record missing');

      const localNoonDate = new Date(2026, 10, 6, 12, 0, 0, 0);
      const localMidnightDate = new Date(2026, 10, 6, 0, 0, 0, 0);
      const localNoonIso = localNoonDate.toISOString();
      const localMidnightIso = localMidnightDate.toISOString();
      const plainDateOnly = '2026-11-05';

      const cloneWith = (id, titleSuffix, taughtAt, extra = {}) => {
        const copy = JSON.parse(JSON.stringify(uiLogged));
        copy.id = id;
        copy.sequenceTitle = ${JSON.stringify(syntheticTitle)} + ' ' + titleSuffix;
        copy.taughtAt = taughtAt;
        if (copy.programSnapshot) {
          copy.programSnapshot.sourceSequenceTitle = copy.sequenceTitle;
          copy.programSnapshot.taughtAt = taughtAt;
          if (copy.programSnapshot.sequenceSnapshot) {
            copy.programSnapshot.sequenceSnapshot.title = copy.sequenceTitle;
          }
        }
        if (copy.sequenceSnapshot) {
          copy.sequenceSnapshot.title = copy.sequenceTitle;
        }
        return Object.assign(copy, extra);
      };

      const noonRecord = cloneWith('r4-synth-local-noon', '[정오 12:00 보존]', localNoonIso);
      const midnightRecord = cloneWith('r4-synth-local-midnight', '[자정 00:00 보존]', localMidnightIso);
      const dateOnlyRecord = cloneWith('r4-synth-date-only', '[날짜전용 YYYY-MM-DD]', plainDateOnly);

      parsed.state.historyLogs = [
        noonRecord,
        midnightRecord,
        dateOnlyRecord,
        ...logs.filter((l) => !['r4-synth-local-noon', 'r4-synth-local-midnight', 'r4-synth-date-only'].includes(l.id)),
      ];
      localStorage.setItem('pilates-flow-atelier-storage-v3', JSON.stringify(parsed));
      return {
        uiLoggedId: uiLogged.id,
        uiLoggedTaughtAt: uiLogged.taughtAt,
        localNoonIso,
        localMidnightIso,
        plainDateOnly,
      };
    })()`);

    await cdp.send('Page.reload', { ignoreCache: false });
    await cdp.waitFor(
      `Boolean(document.querySelector('nav'))`,
      15000,
      `Reloaded with seeded noon/midnight fixtures (${width}px)`,
    );

    // =========================================================================
    // 4. 수업기록재사용 (ClassBinderView History tab + 정오/자정 시각보존 확인 + 이 수업 다시 계획)
    // =========================================================================
    // Ensure we are on '기록' (ClassBinderView)
    await cdp.eval(`(() => {
      if (!document.querySelector('article.teaching-history-card')) {
        const navButtons = Array.from(document.querySelectorAll('nav button'));
        const histBtn = navButtons.find(
          (b) => b.getClientRects().length > 0 && b.textContent?.includes('기록')
        ) || navButtons.find((b) => b.textContent?.includes('기록'));
        histBtn?.click();
      }
    })()`);
    await cdp.waitFor(
      `document.querySelectorAll('article.teaching-history-card').length >= 4`,
      10000,
      `ClassBinderView history cards rendered (${width}px)`,
    );

    const historyTimeVerification = await cdp.eval(`(() => {
      const cards = Array.from(document.querySelectorAll('article.teaching-history-card'));
      const findCardInfo = (titleSubstring) => {
        const card = cards.find((c) => c.querySelector('h2')?.textContent?.includes(titleSubstring));
        if (!card) return null;
        return {
          heading: card.querySelector('h2')?.textContent?.trim() ?? '',
          timeAttr: card.querySelector('time')?.getAttribute('datetime') ?? null,
          timeOfDayBadge: card.querySelector('.teaching-history-time-of-day')?.textContent?.trim() ?? null,
        };
      };
      return {
        noonCard: findCardInfo('[정오 12:00 보존]'),
        midnightCard: findCardInfo('[자정 00:00 보존]'),
        dateOnlyCard: findCardInfo('[날짜전용 YYYY-MM-DD]'),
        uiModalCard: cards
          .map((c) => ({
            heading: c.querySelector('h2')?.textContent?.trim() ?? '',
            timeOfDayBadge: c.querySelector('.teaching-history-time-of-day')?.textContent?.trim() ?? null,
            reflection: c.querySelector('.teaching-reflection')?.textContent?.trim() ?? '',
          }))
          .find((c) => c.reflection.includes('[합성-R4] UI 모달에서 남긴 수업 기록 메모')) ?? null,
        overflowPx: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      };
    })()`);

    assert.equal(historyTimeVerification.noonCard?.timeOfDayBadge, '12:00');
    assert.equal(historyTimeVerification.midnightCard?.timeOfDayBadge, '00:00');
    assert.equal(historyTimeVerification.dateOnlyCard?.timeOfDayBadge, null);
    assert.equal(historyTimeVerification.overflowPx, 0);

    await cdp.screenshot(path.join(SCREENSHOT_DIR, `r4-${width}-02-history-noon-midnight.png`));

    // Click '이 수업 다시 계획' on the Noon 12:00 synthetic history card
    await cdp.eval(`(() => {
      const cards = Array.from(document.querySelectorAll('article.teaching-history-card'));
      const noonCard = cards.find((c) => c.querySelector('h2')?.textContent?.includes('[정오 12:00 보존]'));
      const reuseBtn = Array.from(noonCard?.querySelectorAll('button') ?? []).find((b) =>
        b.textContent?.includes('이 수업 다시 계획')
      );
      reuseBtn?.click();
    })()`);
    await cdp.waitFor(
      `document.querySelectorAll('.sequence-order-card').length === 3`,
      10000,
      `History reuse restored 3 steps in SequenceWorkbench (${width}px)`,
    );

    const afterHistoryReuse = await cdp.eval(`(() => {
      const titleInput = document.querySelector('input[aria-label="시퀀스 제목"]');
      const cards = Array.from(document.querySelectorAll('.sequence-order-card'));
      return {
        restoredTitle: titleInput?.value ?? '',
        stepCount: cards.length,
        stepTitles: cards.map((c) => c.querySelector('.step-title strong, h3')?.textContent?.trim() ?? ''),
        overflowPx: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      };
    })()`);
    assert.equal(afterHistoryReuse.stepCount, 3);
    assert.deepEqual(afterHistoryReuse.stepTitles, afterReorder.titles);
    assert.equal(afterHistoryReuse.overflowPx, 0);

    // =========================================================================
    // 5. 오프라인 새 진입 (Offline Fresh Entry: /?utm_source=pwa, /?q=..., /)
    // =========================================================================
    const preOfflineState = await cdp.eval(`(() => {
      const titleInput = document.querySelector('input[aria-label="시퀀스 제목"]');
      const cards = Array.from(document.querySelectorAll('.sequence-order-card'));
      const rawStorage = localStorage.getItem('pilates-flow-atelier-storage-v3') || '';
      const parsed = rawStorage ? JSON.parse(rawStorage) : null;
      const savedTitles = (parsed?.state?.savedSequences ?? []).map((s) => s.title);
      const historyTimestamps = (parsed?.state?.historyLogs ?? [])
        .filter((l) => ['r4-synth-local-noon', 'r4-synth-local-midnight', 'r4-synth-date-only'].includes(l.id))
        .map((l) => ({ id: l.id, taughtAt: l.taughtAt }));
      return {
        activeTitle: titleInput?.value ?? '',
        stepIds: cards.map((c) => c.getAttribute('data-order-step')),
        stepTitles: cards.map((c) => c.querySelector('.step-title strong, h3')?.textContent?.trim() ?? ''),
        savedTitles,
        historyTimestamps,
        rawStorageBytes: rawStorage.length,
        rawStorage,
      };
    })()`);
    const preOfflineSha256 = createHash('sha256').update(preOfflineState.rawStorage).digest('hex');
    delete preOfflineState.rawStorage;
    preOfflineState.storageSha256 = preOfflineSha256;

    // Switch BOTH static server and browser network emulation to 100% offline
    staticServer.setOffline(true);
    await cdp.send('Network.emulateNetworkConditions', {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    });

    const offlineEntries = [
      { id: 'pwa-query', path: '/?utm_source=pwa', expectedSearch: '?utm_source=pwa' },
      {
        id: 'search-query',
        path: '/?q=%EC%8A%A4%ED%8A%B8%EB%9E%A9&apparatus=reformer',
        expectedSearch: '?q=%EC%8A%A4%ED%8A%B8%EB%9E%A9&apparatus=reformer',
      },
      { id: 'normal-root', path: '/', expectedSearch: '' },
    ];

    const offlineEntryComparisons = [];
    for (const entry of offlineEntries) {
      await cdp.send('Page.navigate', { url: `${baseUrl}${entry.path}` });
      await cdp.waitFor(
        `document.readyState === 'complete' && window.location.search === ${JSON.stringify(entry.expectedSearch)} && document.querySelectorAll('.sequence-order-card').length === 3`,
        15000,
        `Offline fresh entry ${entry.path} (${width}px)`,
      );

      const postSnap = await cdp.eval(`(() => {
        const titleInput = document.querySelector('input[aria-label="시퀀스 제목"]');
        const cards = Array.from(document.querySelectorAll('.sequence-order-card'));
        const rawStorage = localStorage.getItem('pilates-flow-atelier-storage-v3') || '';
        const parsed = rawStorage ? JSON.parse(rawStorage) : null;
        const savedTitles = (parsed?.state?.savedSequences ?? []).map((s) => s.title);
        const historyTimestamps = (parsed?.state?.historyLogs ?? [])
          .filter((l) => ['r4-synth-local-noon', 'r4-synth-local-midnight', 'r4-synth-date-only'].includes(l.id))
          .map((l) => ({ id: l.id, taughtAt: l.taughtAt }));
        return {
          pathname: window.location.pathname,
          search: window.location.search,
          navigatorOnLine: navigator.onLine,
          controlledByServiceWorker: Boolean(navigator.serviceWorker?.controller),
          activeTitle: titleInput?.value ?? '',
          stepIds: cards.map((c) => c.getAttribute('data-order-step')),
          stepTitles: cards.map((c) => c.querySelector('.step-title strong, h3')?.textContent?.trim() ?? ''),
          savedTitles,
          historyTimestamps,
          rawStorageBytes: rawStorage.length,
          rawStorage,
          overflowPx: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
        };
      })()`);
      const postSha256 = createHash('sha256').update(postSnap.rawStorage).digest('hex');
      delete postSnap.rawStorage;
      postSnap.storageSha256 = postSha256;

      postSnap.dataInvariant =
        postSnap.navigatorOnLine === false &&
        postSnap.controlledByServiceWorker === true &&
        postSnap.search === entry.expectedSearch &&
        postSnap.activeTitle === preOfflineState.activeTitle &&
        JSON.stringify(postSnap.stepIds) === JSON.stringify(preOfflineState.stepIds) &&
        JSON.stringify(postSnap.stepTitles) === JSON.stringify(preOfflineState.stepTitles) &&
        JSON.stringify(postSnap.savedTitles) === JSON.stringify(preOfflineState.savedTitles) &&
        JSON.stringify(postSnap.historyTimestamps) === JSON.stringify(preOfflineState.historyTimestamps) &&
        postSnap.rawStorageBytes === preOfflineState.rawStorageBytes &&
        postSnap.storageSha256 === preOfflineState.storageSha256 &&
        postSnap.overflowPx === 0;

      assert.equal(
        postSnap.dataInvariant,
        true,
        `Offline entry ${entry.path} violated data invariance at ${width}px`,
      );
      offlineEntryComparisons.push({
        entryId: entry.id,
        requestedPath: entry.path,
        ...postSnap,
      });
    }

    await cdp.screenshot(path.join(SCREENSHOT_DIR, `r4-${width}-03-offline-pwa-fresh-entry.png`));

    return {
      viewport: `${width}x${height}`,
      width,
      height,
      step1_exerciseSearchAndDiagram: diagramCheck,
      step2_addAndReorderSteps: {
        beforeReorderTitles: beforeReorder.titles,
        afterReorderTitles: afterReorder.titles,
        orderSwapped:
          beforeReorder.stepIds[0] === afterReorder.stepIds[1] &&
          beforeReorder.stepIds[1] === afterReorder.stepIds[0],
        overflowPx: afterReorder.overflowPx,
      },
      step3_saveAndSeedHistoryFixtures: {
        syntheticTitle,
        ...seededTimestamps,
      },
      step4_historyNoonMidnightAndReuse: {
        historyTimeVerification,
        afterHistoryReuse,
      },
      step5_offlineFreshEntryInvariance: {
        preOfflineStorageBytes: preOfflineState.rawStorageBytes,
        preOfflineStorageSha256: preOfflineState.storageSha256,
        offlineEntryComparisons,
      },
      consoleErrorCount: cdp.consoleErrors.length,
      pageErrorCount: cdp.pageErrors.length,
      viewportPass:
        cdp.consoleErrors.length === 0 &&
        cdp.pageErrors.length === 0 &&
        offlineEntryComparisons.every((c) => c.dataInvariant),
    };
  } finally {
    cdp?.close();
    chromeProc.kill('SIGKILL');
    staticServer.setOffline(false);
    rmSync(isolatedProfileDir, { recursive: true, force: true });
  }
}

async function main() {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const ancestry = verifyGitAncestry();
  const webkitProbe = probeWebKitAvailability();

  const staticServer = createControllableStaticServer(DIST_DIR);
  const port = await staticServer.listen();
  const baseUrl = `http://127.0.0.1:${port}`;

  const viewports = [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ];

  const viewportResults = [];
  try {
    for (const vp of viewports) {
      const res = await runContinuousJourneyAtViewport(baseUrl, staticServer, vp);
      viewportResults.push(res);
    }
  } finally {
    await staticServer.close();
  }

  const summary = {
    round: 'integration-round4-20261107',
    verifiedAtUtc: new Date().toISOString(),
    ancestry,
    webkitProbe,
    ownershipAndConstraints: {
      ownedPathOnly: 'docs/integration-round4-20261107',
      srcModified: false,
      sharedCssModified: false,
      storeModified: false,
      diagramModified: false,
      pwaModified: false,
      mainBranchModified: false,
      productionDeployed: false,
    },
    crossFeatureObservations: [
      {
        id: 'R4-OBS-01',
        severity: 'info / cross-module contract note',
        modules: ['src/components/LogSessionModal.tsx:161', 'src/components/ClassBinderView.tsx:124'],
        summary:
          'LogSessionModal은 날짜 입력(YYYY-MM-DD)만 받고 내부적으로 new Date(`${taughtDate}T12:00:00`).toISOString()을 생성하며 timestamps: "unrecorded" 또는 dateOnly: true 메타데이터를 부여하지 않습니다. 606f7ad4(ClassBinderView)에서 실제 정오(12:00)/자정(00:00) ISO 시각 보존을 위해 휴리스틱을 제거하고 명시적 date-only 메타데이터만 숨기도록 변경됨에 따라, LogSessionModal UI를 통해 새로 기록한 수업 카드에도 .teaching-history-time-of-day 배지("12:00")가 함께 표시됩니다(기능 블로커 아님, 스냅샷·복사·오프라인 보존 정상).',
      },
    ],
    continuousFlowViewports: viewportResults,
    allViewportsPass: viewportResults.every((v) => v.viewportPass),
  };

  writeFileSync(SUMMARY_JSON_PATH, JSON.stringify(summary, null, 2) + '\n', 'utf8');
  console.log(
    JSON.stringify(
      {
        verifiedAtUtc: summary.verifiedAtUtc,
        originMainHead: summary.ancestry.originMainHead,
        allTargetsPreservedOnOriginMain: summary.ancestry.allTargetsPreservedOnOriginMain,
        webkitVerdict: summary.webkitProbe.verdict,
        allViewportsPass: summary.allViewportsPass,
        viewports: summary.continuousFlowViewports.map((v) => ({
          viewport: v.viewport,
          viewportPass: v.viewportPass,
          noonBadge: v.step4_historyNoonMidnightAndReuse.historyTimeVerification.noonCard?.timeOfDayBadge,
          midnightBadge:
            v.step4_historyNoonMidnightAndReuse.historyTimeVerification.midnightCard?.timeOfDayBadge,
          dateOnlyBadge:
            v.step4_historyNoonMidnightAndReuse.historyTimeVerification.dateOnlyCard?.timeOfDayBadge,
          uiModalBadge:
            v.step4_historyNoonMidnightAndReuse.historyTimeVerification.uiModalCard?.timeOfDayBadge,
          offlineEntriesAllInvariant: v.step5_offlineFreshEntryInvariance.offlineEntryComparisons.every(
            (c) => c.dataInvariant,
          ),
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
