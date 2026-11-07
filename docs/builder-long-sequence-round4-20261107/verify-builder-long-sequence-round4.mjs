import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const phaseArg = process.argv.find((arg) => arg.startsWith('--phase='));
const PHASE = phaseArg ? phaseArg.split('=')[1] : 'after';

const ROOT = process.cwd();
const BASE_DIR = path.join(ROOT, 'docs/builder-long-sequence-round4-20261107');
const EVIDENCE_DIR = path.join(BASE_DIR, 'evidence');
const SCREENSHOT_DIR = path.join(BASE_DIR, 'screenshots');
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const PORT = 4186;
const DEBUG_PORT = 9246;
const BASE_URL = `http://127.0.0.1:${PORT}/`;

const VIEWPORTS = [
  { id: 'mobile-320', label: 'Mobile 320px', width: 320, height: 640, zoom: 1, mobile: true },
  { id: 'mobile-390', label: 'Mobile 390px', width: 390, height: 844, zoom: 1, mobile: true },
  { id: 'tablet-768', label: 'Tablet 768px', width: 768, height: 1024, zoom: 1, mobile: true },
  { id: 'desktop-1440', label: 'Desktop 1440px', width: 1440, height: 900, zoom: 1, mobile: false },
  { id: 'mobile-320-zoom200', label: 'Mobile 320px @ 200%', width: 320, height: 640, zoom: 2, mobile: true },
  { id: 'mobile-390-zoom200', label: 'Mobile 390px @ 200%', width: 390, height: 844, zoom: 2, mobile: true },
  { id: 'tablet-768-zoom200', label: 'Tablet 768px @ 200%', width: 768, height: 1024, zoom: 2, mobile: true },
  { id: 'desktop-1440-zoom200', label: 'Desktop 1440px @ 200%', width: 1440, height: 900, zoom: 2, mobile: false },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForHttp(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // retry
    }
    await sleep(200);
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

function buildSeed80Expression() {
  return `(async () => {
    const origSetCapture = Element.prototype.setPointerCapture;
    const origReleaseCapture = Element.prototype.releasePointerCapture;
    Element.prototype.setPointerCapture = function(id) {
      try { return origSetCapture?.call(this, id); } catch { return undefined; }
    };
    Element.prototype.releasePointerCapture = function(id) {
      try { return origReleaseCapture?.call(this, id); } catch { return undefined; }
    };
    const { usePilatesStore } = await import('/src/store/usePilatesStore.ts');
    window.__pilatesStore = usePilatesStore;
    const state = usePilatesStore.getState();
    const baseExercises = state.exercises;
    const restIndices = new Set([12, 32, 52, 68]);
    const steps = [];
    for (let i = 0; i < 80; i += 1) {
      if (restIndices.has(i)) {
        steps.push({
          stepId: \`syn-rest-\${i + 1}\`,
          exerciseId: '__rest__',
          kind: 'rest',
          order: i + 1,
          blockCategory: 'rest',
          durationMin: 1,
          selectedLayer: 'standard',
        });
      } else {
        const ex = baseExercises[i % baseExercises.length];
        const phase = i < 15 ? 'warmup' : i < 70 ? 'main' : 'cooldown';
        steps.push({
          stepId: \`syn-move-\${i + 1}\`,
          exerciseId: ex.id,
          kind: 'movement',
          order: i + 1,
          blockCategory: phase,
          durationMin: 1,
          selectedLayer: 'standard',
          repetitions: 8 + (i % 4),
          sets: i >= 20 && i < 23 ? 2 : 1,
          cueNote: i >= 20 && i < 23 ? '합성 블록 조합 구간' : undefined,
        });
      }
    }
    const reusableBlocks = [
      {
        id: 'syn-block-round4-1',
        title: '합성 코어·척추 분절 3동작 블록',
        createdAt: '2026-11-07T00:00:00.000Z',
        updatedAt: '2026-11-07T00:00:00.000Z',
        items: baseExercises.slice(0, 3).map((ex, idx) => ({
          id: \`syn-block-item-\${idx + 1}\`,
          exerciseId: ex.id,
          durationMin: 1,
          repetitions: 8,
          sets: 1,
        })),
      },
    ];
    localStorage.setItem('pilates-flow:idea-reusable-blocks:v1', JSON.stringify(reusableBlocks));
    usePilatesStore.setState({
      hasCompletedOnboarding: true,
      activeTab: 'workbench',
      activeSequenceId: 'syn-long-80-round4',
      activeTitle: '80동작·휴식·블록 혼합 합성 수업안',
      activeTargetMinutes: 80,
      activeSteps: steps,
      undoStack: [],
      generationError: null,
      persistenceError: null,
    });
    await new Promise((r) => setTimeout(r, 250));
    return { seededCount: usePilatesStore.getState().activeSteps.length };
  })()`;
}

async function main() {
  let chromiumVersion = 'unknown';
  try {
    chromiumVersion = execSync('chromium --version 2>/dev/null || google-chrome --version 2>/dev/null')
      .toString()
      .trim();
  } catch {
    // ignore
  }

  const viteProc = spawn(
    'pnpm',
    ['vite', '--port', String(PORT), '--host', '127.0.0.1'],
    { cwd: ROOT, stdio: 'ignore' },
  );

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), `builder-round4-${PHASE}-`));
  const chromeProc = spawn(
    '/usr/bin/chromium',
    [
      '--headless',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${userDataDir}`,
      'about:blank',
    ],
    { cwd: ROOT, stdio: 'ignore' },
  );

  try {
    await waitForHttp(BASE_URL);
    await waitForHttp(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
    const targets = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
    const pageTarget = targets.find((t) => t.type === 'page');
    const cdp = new CdpSession(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true });
    await cdp.send('Page.navigate', { url: BASE_URL });
    await sleep(1400);
    await cdp.eval(buildSeed80Expression());
    await sleep(500);

    // 1. Viewport & Zoom matrix checks (320, 390, 768, 1440 @ 100% and 200%)
    const viewportResults = {};
    for (const vp of VIEWPORTS) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.mobile,
      });
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: vp.mobile });
      await sleep(250);
      const metrics = await cdp.eval(`(async () => {
        document.documentElement.style.zoom = '${vp.zoom === 1 ? '' : String(vp.zoom)}';
        window.scrollTo(0, 0);
        await new Promise((r) => setTimeout(r, 120));
        const cards = Array.from(document.querySelectorAll('[data-order-step]'));
        const restCards = Array.from(document.querySelectorAll('.rest-step-card'));
        const headers = Array.from(document.querySelectorAll('.pf-sequence-block__header'));
        const scrollWidth = document.documentElement.scrollWidth;
        const innerWidth = window.innerWidth;
        const horizontalOverflowPx = Math.max(0, scrollWidth - innerWidth);

        // Probe active drag geometry at this viewport & zoom
        cards[0]?.scrollIntoView({ block: 'start' });
        await new Promise((r) => setTimeout(r, 80));
        const c0 = cards[0];
        const c1 = cards[1];
        const h0 = c0.querySelector('.sequence-drag-handle');
        const c0r = c0.getBoundingClientRect();
        const c1r = c1.getBoundingClientRect();
        const h0r = h0.getBoundingClientRect();
        const sx = h0r.left + h0r.width / 2;
        const sy = h0r.top + h0r.height / 2;
        const ty = c1r.top + c1r.height * 0.58;
        const fire = (el, type, x, y) => {
          const ev = new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            button: 0,
            buttons: type === 'pointerup' ? 0 : 1,
            clientX: x,
            clientY: y,
            pointerId: 31,
            pointerType: 'touch',
            isPrimary: true,
          });
          el.dispatchEvent(ev);
        };
        fire(h0, 'pointerdown', sx, sy);
        fire(h0, 'pointermove', sx, sy + 16);
        fire(h0, 'pointermove', sx, ty);
        await new Promise((r) => setTimeout(r, 200));
        const ov = document.querySelector('.sequence-drag-overlay')?.getBoundingClientRect();
        const ind = document.querySelector('.sequence-drop-indicator')?.getBoundingClientRect();
        const c1During = c1.getBoundingClientRect();
        const overlayWidthDiffPx = ov ? Math.abs(Math.round(ov.width - c0r.width)) : null;
        const overlayLeftDiffPx = ov ? Math.abs(Math.round(ov.left - c0r.left)) : null;
        const indicatorWidthDiffPx = ind ? Math.abs(Math.round(ind.width - c0r.width)) : null;
        const indicatorOverlapsShiftedC1 = ind
          ? ind.top < c1During.bottom - 1 && ind.bottom > c1During.top + 1
          : null;
        h0.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        document.documentElement.style.zoom = '';
        return {
          viewport: '${vp.id}',
          width: ${vp.width},
          height: ${vp.height},
          zoom: ${vp.zoom},
          totalSteps: cards.length,
          restCount: restCards.length,
          sectionBlocks: headers.length,
          horizontalOverflowPx,
          handleTouchAction: getComputedStyle(h0).touchAction,
          cardWidth: Math.round(c0r.width),
          overlayWidth: ov ? Math.round(ov.width) : null,
          indicatorWidth: ind ? Math.round(ind.width) : null,
          overlayWidthDiffPx,
          overlayLeftDiffPx,
          indicatorWidthDiffPx,
          indicatorOverlapsShiftedC1,
        };
      })()`);
      viewportResults[vp.id] = metrics;

      if (vp.id === 'mobile-320' || vp.id === 'mobile-390' || vp.id === 'tablet-768' || vp.id === 'desktop-1440' || vp.id === 'mobile-390-zoom200') {
        if (vp.zoom !== 1) {
          await cdp.eval(`document.documentElement.style.zoom = '${vp.zoom}';`);
          await sleep(100);
        }
        await cdp.screenshot(path.join(SCREENSHOT_DIR, `${PHASE}-${vp.id}.png`));
        if (vp.zoom !== 1) {
          await cdp.eval(`document.documentElement.style.zoom = '';`);
        }
      }
    }

    // Reset to 390x844 mobile touch for detailed 80-step behavioral checks
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true });
    await sleep(200);

    // 2. Cross-Section Drag Around Rest Card (Index 11 <-> Index 12 Rest <-> Index 13)
    const crossSectionRestDrag = await cdp.eval(`(async () => {
      const cards = Array.from(document.querySelectorAll('[data-order-step]'));
      cards[11]?.scrollIntoView({ block: 'start' });
      await new Promise((r) => setTimeout(r, 120));
      const c11 = cards[11];
      const c12 = cards[12];
      const c13 = cards[13];
      const c12BeforeTop = Math.round(c12.getBoundingClientRect().top);
      const c13BeforeTop = Math.round(c13.getBoundingClientRect().top);

      const fire = (el, type, x, y, pid = 41) => {
        const ev = new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          button: 0,
          buttons: type === 'pointerup' ? 0 : 1,
          clientX: x,
          clientY: y,
          pointerId: pid,
          pointerType: 'touch',
          isPrimary: true,
        });
        el.dispatchEvent(ev);
      };

      // A: Downward drag of last card in section (c11) across Rest card (c12) to c13
      const h11 = c11.querySelector('.sequence-drag-handle');
      const h11r = h11.getBoundingClientRect();
      const c12r0 = c12.getBoundingClientRect();
      const sx11 = h11r.left + h11r.width / 2;
      const sy11 = h11r.top + h11r.height / 2;
      // Move just past 8px threshold (still at from === to === 11) to check if :last-child margin jumps
      fire(h11, 'pointerdown', sx11, sy11, 41);
      fire(h11, 'pointermove', sx11, sy11 + 10, 41);
      await new Promise((r) => setTimeout(r, 40));
      const c12AtSameSlotTop = Math.round(c12.getBoundingClientRect().top);
      const lastChildMarginJumpPx = Math.abs(c12AtSameSlotTop - c12BeforeTop);

      // Move down to middle of c12 (Rest card) / c13
      const targetDownY = Math.min(700, c12r0.top + c12r0.height - 20);
      fire(h11, 'pointermove', sx11, targetDownY, 41);
      await new Promise((r) => setTimeout(r, 220));
      const c12DuringDown = c12.getBoundingClientRect();
      const indDown = document.querySelector('.sequence-drop-indicator')?.getBoundingClientRect();
      const downRestOverlapsIndicator = indDown
        ? c12DuringDown.top < indDown.bottom - 1 && c12DuringDown.bottom > indDown.top + 1
        : false;
      h11.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await new Promise((r) => setTimeout(r, 80));

      // B: Upward drag of first card in section (c13, under WARM-UP 2 header) across Rest card (c12) to c11
      const h13 = c13.querySelector('.sequence-drag-handle');
      const h13r = h13.getBoundingClientRect();
      const c11r = c11.getBoundingClientRect();
      const sx13 = h13r.left + h13r.width / 2;
      const sy13 = h13r.top + h13r.height / 2;
      const ty13 = Math.max(80, c11r.top + 20);
      fire(h13, 'pointerdown', sx13, sy13, 42);
      fire(h13, 'pointermove', sx13, sy13 - 14, 42);
      fire(h13, 'pointermove', sx13, ty13, 42);
      await new Promise((r) => setTimeout(r, 220));
      const c12DuringUp = c12.getBoundingClientRect();
      const warmHeader2 = c13.closest('.pf-sequence-block')?.querySelector('.pf-sequence-block__header');
      const restHeader1 = c12.closest('.pf-sequence-block')?.querySelector('.pf-sequence-block__header');
      const whRect = warmHeader2?.getBoundingClientRect();
      const rhRect = restHeader1?.getBoundingClientRect();
      const headerOverlapsShiftedRestCard = whRect
        ? whRect.top < c12DuringUp.bottom - 1 && whRect.bottom > c12DuringUp.top + 1
        : false;
      return {
        c12BeforeTop,
        c13BeforeTop,
        lastChildMarginJumpPx,
        downRestOverlapsIndicator,
        upwardDrag: {
          c12DuringUp: { top: Math.round(c12DuringUp.top), bottom: Math.round(c12DuringUp.bottom) },
          restHeader1: rhRect ? { top: Math.round(rhRect.top), bottom: Math.round(rhRect.bottom), transform: restHeader1.style.transform || restHeader1.style.translate } : null,
          warmHeader2: whRect ? { top: Math.round(whRect.top), bottom: Math.round(whRect.bottom), transform: warmHeader2.style.transform || warmHeader2.style.translate } : null,
          headerOverlapsShiftedRestCard,
        },
      };
    })()`);
    await cdp.screenshot(path.join(SCREENSHOT_DIR, `${PHASE}-390-upward-cross-section.png`));
    await cdp.eval(`(() => {
      const h13 = document.querySelectorAll('[data-order-step]')[13]?.querySelector('.sequence-drag-handle');
      h13?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    })()`);

    // 3. Screenshot of 200% zoom active drag on 390x844
    await cdp.eval(`(async () => {
      window.scrollTo(0, 0);
      document.documentElement.style.zoom = '2';
      await new Promise((r) => setTimeout(r, 100));
      const cards = Array.from(document.querySelectorAll('[data-order-step]'));
      cards[0]?.scrollIntoView({ block: 'start' });
      await new Promise((r) => setTimeout(r, 80));
      const c0 = cards[0], c1 = cards[1];
      const h0 = c0.querySelector('.sequence-drag-handle');
      const c1r = c1.getBoundingClientRect();
      const h0r = h0.getBoundingClientRect();
      const sx = h0r.left + h0r.width / 2;
      const sy = h0r.top + h0r.height / 2;
      const ty = c1r.top + c1r.height * 0.75;
      const fire = (el, type, x, y) => {
        const ev = new PointerEvent(type, {
          bubbles: true, cancelable: true, button: 0, buttons: 1,
          clientX: x, clientY: y, pointerId: 43, pointerType: 'touch', isPrimary: true,
        });
        el.dispatchEvent(ev);
      };
      fire(h0, 'pointerdown', sx, sy);
      fire(h0, 'pointermove', sx, sy + 16);
      fire(h0, 'pointermove', sx, ty);
      await new Promise((r) => setTimeout(r, 200));
    })()`);
    await cdp.screenshot(path.join(SCREENSHOT_DIR, `${PHASE}-390-zoom200-drag.png`));
    await cdp.eval(`(() => {
      const h0 = document.querySelectorAll('[data-order-step]')[0]?.querySelector('.sequence-drag-handle');
      h0?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      document.documentElement.style.zoom = '';
    })()`);

    // 4. Off-Screen Auto-Scroll (Downward & Upward), Cancel, Undo & Screen Reader Announcements
    const longAutoScrollAndUndo = await cdp.eval(`(async () => {
      window.scrollTo(0, 0);
      const cards = Array.from(document.querySelectorAll('[data-order-step]'));
      cards[0]?.scrollIntoView({ block: 'start' });
      await new Promise((r) => setTimeout(r, 100));
      const h0 = cards[0].querySelector('.sequence-drag-handle');
      const hr = h0.getBoundingClientRect();
      const sx = hr.left + hr.width / 2;
      const sy = hr.top + hr.height / 2;
      const fire = (el, type, x, y, pid = 44) => {
        const ev = new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          button: 0,
          buttons: type === 'pointerup' ? 0 : 1,
          clientX: x,
          clientY: y,
          pointerId: pid,
          pointerType: 'touch',
          isPrimary: true,
        });
        el.dispatchEvent(ev);
      };

      // Test Escape Cancel first
      fire(h0, 'pointerdown', sx, sy, 44);
      fire(h0, 'pointermove', sx, sy + 180, 44);
      await new Promise((r) => setTimeout(r, 80));
      h0.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await new Promise((r) => setTimeout(r, 60));
      const cancelAnnouncement = document.querySelector('[data-plan-feedback]')?.textContent?.trim() ?? null;
      const orderUnchangedAfterCancel = window.__pilatesStore.getState().activeSteps[0]?.stepId === 'syn-move-1';

      // Test Long Downward Off-Screen Auto-Scroll + Drop Commit
      const scrollBeforeDown = window.scrollY;
      fire(h0, 'pointerdown', sx, sy, 45);
      fire(h0, 'pointermove', sx, sy + 16, 45);
      await new Promise((r) => setTimeout(r, 30));
      const dragStartAnnouncement = document.querySelector('[data-plan-feedback]')?.textContent?.trim() ?? null;
      fire(h0, 'pointermove', sx, 755, 45);
      await new Promise((r) => setTimeout(r, 1100));
      const scrollAfterDown = window.scrollY;
      const downScrollDelta = Math.round(scrollAfterDown - scrollBeforeDown);
      const targetSlotAnnouncement = document.querySelector('[data-plan-feedback]')?.textContent?.trim() ?? null;
      const indicatorTextDuringScroll = document.querySelector('.sequence-drop-indicator')?.textContent?.trim() ?? null;
      fire(h0, 'pointerup', sx, 755, 45);
      await new Promise((r) => setTimeout(r, 240));

      const committedIndex = window.__pilatesStore.getState().activeSteps.findIndex((s) => s.stepId === 'syn-move-1');
      const commitAnnouncement = document.querySelector('[data-plan-feedback]')?.textContent?.trim() ?? null;
      const commitIncludesNewPosition = commitAnnouncement
        ? commitAnnouncement.includes(\`\${committedIndex + 1}번째\`)
        : false;
      const liveRegionRole = document.querySelector('[data-plan-feedback]')?.getAttribute('role') ?? null;
      const liveRegionAriaLive = document.querySelector('[data-plan-feedback]')?.getAttribute('aria-live') ?? null;

      // Test Undo button and Undo Screen Reader Announcement
      const undoBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('되돌리기'));
      undoBtn?.click();
      await new Promise((r) => setTimeout(r, 100));
      const indexAfterUndo = window.__pilatesStore.getState().activeSteps.findIndex((s) => s.stepId === 'syn-move-1');
      const undoAnnouncement = document.querySelector('[data-plan-feedback]')?.textContent?.trim() ?? null;

      // Test Upward Off-Screen Auto-Scroll from card 20
      const cardsAfterUndo = Array.from(document.querySelectorAll('[data-order-step]'));
      cardsAfterUndo[20]?.scrollIntoView({ block: 'center' });
      await new Promise((r) => setTimeout(r, 100));
      const h20 = cardsAfterUndo[20].querySelector('.sequence-drag-handle');
      const h20r = h20.getBoundingClientRect();
      const sx20 = h20r.left + h20r.width / 2;
      const sy20 = h20r.top + h20r.height / 2;
      const scrollBeforeUp = window.scrollY;
      fire(h20, 'pointerdown', sx20, sy20, 46);
      fire(h20, 'pointermove', sx20, sy20 - 16, 46);
      fire(h20, 'pointermove', sx20, 28, 46);
      await new Promise((r) => setTimeout(r, 700));
      const scrollAfterUp = window.scrollY;
      const upScrollDelta = Math.round(scrollAfterUp - scrollBeforeUp);
      h20.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      return {
        cancelAnnouncement,
        orderUnchangedAfterCancel,
        dragStartAnnouncement,
        downScrollDelta,
        upScrollDelta,
        targetSlotAnnouncement,
        indicatorTextDuringScroll,
        committedIndex,
        commitAnnouncement,
        commitIncludesNewPosition,
        liveRegionRole,
        liveRegionAriaLive,
        indexAfterUndo,
        undoAnnouncement,
      };
    })()`);

    // 5. Reduced Motion (prefers-reduced-motion: reduce) immediate shift verification
    await cdp.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    await sleep(100);
    const reducedMotionCheck = await cdp.eval(`(async () => {
      window.scrollTo(0, 0);
      const cards = Array.from(document.querySelectorAll('[data-order-step]'));
      cards[0]?.scrollIntoView({ block: 'start' });
      await new Promise((r) => setTimeout(r, 80));
      const c0 = cards[0], c1 = cards[1];
      const h0 = c0.querySelector('.sequence-drag-handle');
      const c1Before = c1.getBoundingClientRect();
      const h0r = h0.getBoundingClientRect();
      const sx = h0r.left + h0r.width / 2;
      const sy = h0r.top + h0r.height / 2;
      const ty = c1Before.top + c1Before.height * 0.75;
      const fire = (el, type, x, y) => {
        const ev = new PointerEvent(type, {
          bubbles: true, cancelable: true, button: 0, buttons: type === 'pointerup' ? 0 : 1,
          clientX: x, clientY: y, pointerId: 47, pointerType: 'touch', isPrimary: true,
        });
        el.dispatchEvent(ev);
      };
      fire(h0, 'pointerdown', sx, sy);
      fire(h0, 'pointermove', sx, sy + 16);
      fire(h0, 'pointermove', sx, ty);
      // Measure IMMEDIATELY (0ms wait!) to verify instant movement without transition lag
      const c1Immediate = c1.getBoundingClientRect();
      const immediateShiftPx = Math.round(c1Before.top - c1Immediate.top);
      const c1TransitionStyle = c1.style.transition;
      const computedTransitionDuration = getComputedStyle(c1).transitionDuration;
      fire(h0, 'pointerup', sx, sy);
      await new Promise((r) => setTimeout(r, 30));
      const overlayRemovedImmediately = document.querySelector('.sequence-drag-overlay') === null;
      return {
        prefersReducedMotionMatches: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        c1TransitionStyle,
        computedTransitionDuration,
        immediateShiftPx,
        movedImmediatelyAtZeroMs: immediateShiftPx > 100,
        overlayRemovedImmediately,
      };
    })()`);
    await cdp.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }],
    });

    const report = {
      phase: PHASE,
      capturedAt: new Date().toISOString(),
      chromiumVersion,
      viewportResults,
      crossSectionRestDrag,
      longAutoScrollAndUndo,
      reducedMotionCheck,
    };

    const outPath = path.join(EVIDENCE_DIR, `${PHASE}-metrics.json`);
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log(`Saved ${PHASE} metrics to ${outPath}`);
    console.log(JSON.stringify({
      phase: PHASE,
      upwardCrossSectionOverlap: crossSectionRestDrag.upwardDrag.headerOverlapsShiftedRestCard,
      lastChildMarginJumpPx: crossSectionRestDrag.lastChildMarginJumpPx,
      zoom200OverlayWidthDiffPx: viewportResults['mobile-390-zoom200']?.overlayWidthDiffPx,
      downScrollDelta: longAutoScrollAndUndo.downScrollDelta,
      upScrollDelta: longAutoScrollAndUndo.upScrollDelta,
      commitIncludesNewPosition: longAutoScrollAndUndo.commitIncludesNewPosition,
      undoAnnouncement: longAutoScrollAndUndo.undoAnnouncement,
      movedImmediatelyAtZeroMs: reducedMotionCheck.movedImmediatelyAtZeroMs,
    }, null, 2));

    cdp.close();
  } finally {
    chromeProc.kill('SIGKILL');
    viteProc.kill('SIGKILL');
    await sleep(250);
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
