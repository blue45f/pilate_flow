import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = process.cwd();
const BASE_DIR = path.join(ROOT, 'docs/builder-cross-input-round5-20261107');
const EVIDENCE_DIR = path.join(BASE_DIR, 'evidence');
const SCREENSHOT_DIR = path.join(BASE_DIR, 'screenshots');
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const PORT = 4188;
const DEBUG_PORT = 9248;
const BASE_URL = `http://127.0.0.1:${PORT}/`;

const VIEWPORTS = [
  { id: 'mobile-320', label: 'Mobile 320px', width: 320, height: 640, zoom: 1, mobile: true, pointerType: 'touch' },
  { id: 'mobile-390', label: 'Mobile 390px', width: 390, height: 844, zoom: 1, mobile: true, pointerType: 'touch' },
  { id: 'tablet-768', label: 'Tablet 768px', width: 768, height: 1024, zoom: 1, mobile: true, pointerType: 'touch' },
  { id: 'desktop-1440', label: 'Desktop 1440px', width: 1440, height: 900, zoom: 1, mobile: false, pointerType: 'mouse' },
  { id: 'mobile-320-zoom200', label: 'Mobile 320px @ 200%', width: 320, height: 640, zoom: 2, mobile: true, pointerType: 'touch' },
  { id: 'mobile-390-zoom200', label: 'Mobile 390px @ 200%', width: 390, height: 844, zoom: 2, mobile: true, pointerType: 'touch' },
  { id: 'tablet-768-zoom200', label: 'Tablet 768px @ 200%', width: 768, height: 1024, zoom: 2, mobile: true, pointerType: 'touch' },
  { id: 'desktop-1440-zoom200', label: 'Desktop 1440px @ 200%', width: 1440, height: 900, zoom: 2, mobile: false, pointerType: 'mouse' },
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

function probeEngineEnvironment() {
  let chromiumVersion = null;
  try {
    chromiumVersion = execSync('chromium --version 2>/dev/null || google-chrome --version 2>/dev/null')
      .toString()
      .trim();
  } catch {
    chromiumVersion = null;
  }
  let webkitBinary = null;
  try {
    webkitBinary = execSync('which webkit safari playwright-webkit epiphany midori 2>/dev/null')
      .toString()
      .trim();
  } catch {
    webkitBinary = null;
  }
  return {
    os: `${os.type()} ${os.release()} (${os.arch()})`,
    nodeVersion: process.version,
    chromiumRuntime: {
      available: Boolean(chromiumVersion),
      engine: 'Chromium (Blink)',
      version: chromiumVersion,
      binary: '/usr/bin/chromium',
    },
    webkitSafariRuntime: {
      available: Boolean(webkitBinary),
      status: webkitBinary ? 'VERIFIED' : 'UNVERIFIED (미검증)',
      binary: webkitBinary || null,
      reason:
        'No WebKit or Safari browser binary is installed in the read-only Debian 12 Linux sandbox VM (/usr/bin/chromium only), and new package installation or privilege escalation is prohibited. All live browser measurements below are explicitly recorded on Chromium (Blink) and never claimed as Safari/WebKit runtime execution.',
    },
  };
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
          blockCategory: i < 15 ? 'warmup' : 'extension',
          durationMin: 1,
          selectedLayer: 'standard',
        });
      } else {
        const ex = baseExercises[i % baseExercises.length];
        const phase = i < 15 ? 'warmup' : i < 70 ? 'extension' : 'cooldown';
        steps.push({
          stepId: \`syn-move-\${i + 1}\`,
          exerciseId: ex.id,
          kind: 'exercise',
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
    usePilatesStore.setState({
      hasCompletedOnboarding: true,
      activeTab: 'workbench',
      activeSequenceId: 'syn-long-80-round5',
      activeTitle: '80동작·휴식·블록 혼합 교차입력 검증 수업안',
      activeTargetMinutes: 80,
      activeSteps: steps,
      undoStack: [],
      generationError: null,
      persistenceError: null,
    });
    await new Promise((r) => setTimeout(r, 200));
    return { seededCount: usePilatesStore.getState().activeSteps.length };
  })()`;
}

async function main() {
  const environment = probeEngineEnvironment();

  const viteProc = spawn(
    'pnpm',
    ['vite', '--port', String(PORT), '--host', '127.0.0.1'],
    { cwd: ROOT, stdio: 'ignore' },
  );

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'builder-round5-'));
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
    await sleep(400);

    // 1. Viewport & 200% Zoom Matrix across 320, 390, 768, 1440 (100% & 200%)
    const viewportMatrix = {};
    for (const vp of VIEWPORTS) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.mobile,
      });
      await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: vp.mobile });
      await sleep(200);
      await cdp.eval(buildSeed80Expression());

      const res = await cdp.eval(`(async () => {
        document.documentElement.style.zoom = '${vp.zoom === 1 ? '' : String(vp.zoom)}';
        window.scrollTo(0, 0);
        await new Promise((r) => setTimeout(r, 100));
        const cards = Array.from(document.querySelectorAll('[data-order-step]'));
        const horizontalOverflowPx = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
        cards[0]?.scrollIntoView({ block: 'start' });
        await new Promise((r) => setTimeout(r, 80));
        const c0 = cards[0];
        const c1 = cards[1];
        const h0 = c0.querySelector('.sequence-drag-handle');
        const c0r = c0.getBoundingClientRect();
        const c1rBefore = c1.getBoundingClientRect();
        const h0r = h0.getBoundingClientRect();
        const sx = h0r.left + h0r.width / 2;
        const sy = h0r.top + h0r.height / 2;
        const ty = c1rBefore.top + c1rBefore.height * 0.58;
        const deltaY = ty - sy;
        const fire = (el, type, x, y) => {
          const ev = new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            button: 0,
            buttons: type === 'pointerup' ? 0 : 1,
            clientX: x,
            clientY: y,
            pointerId: 51,
            pointerType: '${vp.pointerType}',
            isPrimary: true,
          });
          el.dispatchEvent(ev);
        };
        fire(h0, 'pointerdown', sx, sy);
        fire(h0, 'pointermove', sx, sy + 16);
        fire(h0, 'pointermove', sx, ty);
        await new Promise((r) => setTimeout(r, 200));

        const ov = document.querySelector('.sequence-drag-overlay');
        const ind = document.querySelector('.sequence-drop-indicator');
        const ovR = ov?.getBoundingClientRect();
        const indR = ind?.getBoundingClientRect();
        const c1rDuring = c1.getBoundingClientRect();

        // 1. Card Lift check
        const cardLift = {
          overlayPresent: Boolean(ov),
          sourceDimmed: c0.hasAttribute('data-drag-source'),
          overlayAriaHidden: ov?.getAttribute('aria-hidden') === 'true',
          overlayInert: ov?.hasAttribute('inert') ?? false,
          overlayWidthDiffPx: ovR ? Math.abs(Math.round(ovR.width - c0r.width)) : null,
          overlayLeftDiffPx: ovR ? Math.abs(Math.round(ovR.left - c0r.left)) : null,
          pointerTrackingDeltaDiffPx: ovR ? Math.abs(Math.round((ovR.top - c0r.top) - deltaY)) : null,
        };

        // 2. Neighbor Shift check
        const neighborShift = {
          c1ShiftedUpPx: Math.round(c1rBefore.top - c1rDuring.top),
          c1Transform: c1.style.transform,
          shiftedCleanly: Math.round(c1rBefore.top - c1rDuring.top) > 50,
        };

        // 3. Insertion Placeholder check
        const insertionPlaceholder = {
          indicatorVisible: Boolean(ind && !ind.hidden),
          indicatorLabel: ind?.textContent?.trim() ?? null,
          indicatorWidthDiffPx: indR ? Math.abs(Math.round(indR.width - c0r.width)) : null,
          indicatorLeftDiffPx: indR ? Math.abs(Math.round(indR.left - c0r.left)) : null,
          indicatorOverlapsShiftedNeighbor: indR
            ? indR.top < c1rDuring.bottom - 1 && indR.bottom > c1rDuring.top + 1
            : null,
        };

        // 4. Drop Return check
        fire(h0, 'pointerup', sx, ty);
        const overlayAnimatingImmediatelyOnDrop = document.querySelector('.sequence-drag-overlay') !== null;
        await new Promise((r) => setTimeout(r, 250));
        const overlayRemovedAfterReturn = document.querySelector('.sequence-drag-overlay') === null;
        const indicatorRemovedAfterReturn = document.querySelector('.sequence-drop-indicator') === null;
        const committedStepIndex = window.__pilatesStore.getState().activeSteps.findIndex((s) => s.stepId === 'syn-move-1');
        const dropReturn = {
          overlayAnimatingImmediatelyOnDrop,
          overlayRemovedAfterReturn,
          indicatorRemovedAfterReturn,
          committedStepIndex,
          handleFocusedAfterDrop: document.activeElement?.id === 'order-handle-syn-move-1',
        };

        document.documentElement.style.zoom = '';
        return {
          viewport: '${vp.id}',
          width: ${vp.width},
          height: ${vp.height},
          zoom: ${vp.zoom},
          pointerType: '${vp.pointerType}',
          horizontalOverflowPx,
          cardLift,
          neighborShift,
          insertionPlaceholder,
          dropReturn,
        };
      })()`);
      viewportMatrix[vp.id] = res;
      await cdp.screenshot(path.join(SCREENSHOT_DIR, `round5-${vp.id}.png`));
    }

    // 2. Cross-Input Matrix (Touch vs Mouse vs Keyboard) on 80-step Mixed Sequence
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true });
    await cdp.eval(buildSeed80Expression());

    const crossInputVerification = await cdp.eval(`(async () => {
      const firePointer = (el, type, x, y, pointerType, pid) => {
        const ev = new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          button: 0,
          buttons: type === 'pointerup' ? 0 : 1,
          clientX: x,
          clientY: y,
          pointerId: pid,
          pointerType,
          isPrimary: true,
        });
        el.dispatchEvent(ev);
      };

      // A. Mouse input: sub-threshold click (<8px), out-of-bounds release cancel, and valid reorder
      const cards = Array.from(document.querySelectorAll('[data-order-step]'));
      cards[0]?.scrollIntoView({ block: 'start' });
      await new Promise((r) => setTimeout(r, 80));
      const h0 = cards[0].querySelector('.sequence-drag-handle');
      const h0r = h0.getBoundingClientRect();
      const c1r = cards[1].getBoundingClientRect();
      const sx = h0r.left + h0r.width / 2;
      const sy = h0r.top + h0r.height / 2;

      // Sub-threshold mouse move (4px < 8px)
      firePointer(h0, 'pointerdown', sx, sy, 'mouse', 61);
      firePointer(h0, 'pointermove', sx + 3, sy + 3, 'mouse', 61);
      const subThresholdOverlay = document.querySelector('.sequence-drag-overlay');
      firePointer(h0, 'pointerup', sx + 3, sy + 3, 'mouse', 61);
      const subThresholdNoOp = subThresholdOverlay === null && window.__pilatesStore.getState().undoStack.length === 0;

      // Out-of-bounds mouse release (x = -100)
      firePointer(h0, 'pointerdown', sx, sy, 'mouse', 62);
      firePointer(h0, 'pointermove', sx, c1r.top + c1r.height * 0.6, 'mouse', 62);
      firePointer(h0, 'pointerup', -100, c1r.top + c1r.height * 0.6, 'mouse', 62);
      await new Promise((r) => setTimeout(r, 60));
      const outOfBoundsCanceledCleanly =
        window.__pilatesStore.getState().activeSteps[0]?.stepId === 'syn-move-1' &&
        window.__pilatesStore.getState().undoStack.length === 0;

      // Valid mouse drag-and-drop reorder
      firePointer(h0, 'pointerdown', sx, sy, 'mouse', 63);
      firePointer(h0, 'pointermove', sx, c1r.top + c1r.height * 0.6, 'mouse', 63);
      await new Promise((r) => setTimeout(r, 180));
      firePointer(h0, 'pointerup', sx, c1r.top + c1r.height * 0.6, 'mouse', 63);
      await new Promise((r) => setTimeout(r, 240));
      const mouseReorderedToSlot2 =
        window.__pilatesStore.getState().activeSteps[1]?.stepId === 'syn-move-1';
      window.__pilatesStore.getState().undoSequence();
      await new Promise((r) => setTimeout(r, 80));

      // B. Keyboard input: ArrowDown, ArrowUp, and explicit Up/Down buttons
      const h0AfterUndo = document.getElementById('order-handle-syn-move-1');
      h0AfterUndo.focus();
      h0AfterUndo.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await new Promise((r) => setTimeout(r, 60));
      const afterArrowDownIdx = window.__pilatesStore.getState().activeSteps.findIndex((s) => s.stepId === 'syn-move-1');
      const arrowDownFeedback = document.querySelector('[data-plan-feedback]')?.textContent?.trim() ?? null;

      const h0AtSlot2 = document.getElementById('order-handle-syn-move-1');
      h0AtSlot2.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      await new Promise((r) => setTimeout(r, 60));
      const afterArrowUpIdx = window.__pilatesStore.getState().activeSteps.findIndex((s) => s.stepId === 'syn-move-1');

      return {
        mouse: {
          subThresholdNoOp,
          outOfBoundsCanceledCleanly,
          mouseReorderedToSlot2,
        },
        keyboard: {
          afterArrowDownIdx,
          arrowDownFeedback,
          afterArrowUpIdx,
          focusRetainedOnHandle: document.activeElement?.id === 'order-handle-syn-move-1',
        },
      };
    })()`);

    // 3. Stress & Edge Scenarios:
    //    (a) Rapid Consecutive Reorders (<30ms between drops while drop-return clone is in flight)
    //    (b) Cancel During Active Off-Screen Auto-Scroll (Escape & pointercancel)
    //    (c) Screen Rotation (390x844 <-> 844x390) After Reorder & During Active Cross-Section Drag
    await cdp.eval(buildSeed80Expression());

    const rapidAndAutoScrollCancel = await cdp.eval(`(async () => {
      const fire = (el, type, x, y, pid) => {
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

      // A. Rapid Consecutive Reorders (<25ms gap while 160ms drop-return overlay is still animating)
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 80));
      const cards1 = Array.from(document.querySelectorAll('[data-order-step]'));
      const c0 = cards1[0], c1 = cards1[1], c2 = cards1[2];
      const h0 = c0.querySelector('.sequence-drag-handle');
      const h0r = h0.getBoundingClientRect();
      const c1r = c1.getBoundingClientRect();
      fire(h0, 'pointerdown', h0r.left + 20, h0r.top + 20, 71);
      fire(h0, 'pointermove', h0r.left + 20, h0r.top + 36, 71);
      fire(h0, 'pointermove', h0r.left + 20, c1r.top + c1r.height * 0.65, 71);
      fire(h0, 'pointerup', h0r.left + 20, c1r.top + c1r.height * 0.65, 71);

      // Wait only 25ms (drop #1 overlay is still in its 160ms Web Animations API return flight!)
      await new Promise((r) => setTimeout(r, 25));
      const overlaysBeforeSecondDrag = document.querySelectorAll('.sequence-drag-overlay').length;

      // Immediately start Drag #2 on c2 -> slot 0 at 200% CSS zoom to test R5-02
      document.documentElement.style.zoom = '2';
      const cards2 = Array.from(document.querySelectorAll('[data-order-step]'));
      const h2 = cards2[2].querySelector('.sequence-drag-handle');
      const h2r = h2.getBoundingClientRect();
      const topCardR = cards2[0].getBoundingClientRect();
      fire(h2, 'pointerdown', h2r.left + 20, h2r.top + 20, 72);
      fire(h2, 'pointermove', h2r.left + 20, h2r.top - 20, 72);
      fire(h2, 'pointermove', h2r.left + 20, topCardR.top + 20, 72);
      const concurrentOverlaysDuringRapidDrag = Array.from(document.querySelectorAll('.sequence-drag-overlay'));
      const secondOverlay = concurrentOverlaysDuringRapidDrag.at(-1);
      const secondOverlayWidthImmediatelyPx = secondOverlay ? Math.round(secondOverlay.getBoundingClientRect().width) : null;
      const expectedCardWidthAtZoom2Px = Math.round(cards2[2].getBoundingClientRect().width);
      fire(h2, 'pointerup', h2r.left + 20, topCardR.top + 20, 72);
      document.documentElement.style.zoom = '';
      await new Promise((r) => setTimeout(r, 260));
      const topThreeAfterRapidDrags = window.__pilatesStore
        .getState()
        .activeSteps.slice(0, 3)
        .map((s) => s.stepId);
      const overlaysRemainingAfterSettle = document.querySelectorAll('.sequence-drag-overlay').length;

      // Rapid Keyboard Burst (5x ArrowDown in single turn + 5x Undo)
      const hTarget = document.getElementById('order-handle-syn-move-3');
      for (let i = 0; i < 5; i += 1) {
        hTarget.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      }
      const indexAfter5RapidArrowDown = window.__pilatesStore
        .getState()
        .activeSteps.findIndex((s) => s.stepId === 'syn-move-3');
      for (let i = 0; i < 5; i += 1) {
        window.__pilatesStore.getState().undoSequence();
      }
      const indexAfter5RapidUndo = window.__pilatesStore
        .getState()
        .activeSteps.findIndex((s) => s.stepId === 'syn-move-3');

      // B. Cancel During Active Off-Screen Auto-Scroll (Downward Escape & Upward pointercancel)
      window.__pilatesStore.getState().undoSequence();
      window.__pilatesStore.getState().undoSequence();
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 100));
      const allCards = Array.from(document.querySelectorAll('[data-order-step]'));
      const hFirst = allCards[0].querySelector('.sequence-drag-handle');
      const hFirstR = hFirst.getBoundingClientRect();
      const scrollStartDown = window.scrollY;
      fire(hFirst, 'pointerdown', hFirstR.left + 20, hFirstR.top + 20, 73);
      fire(hFirst, 'pointermove', hFirstR.left + 20, hFirstR.top + 36, 73);
      fire(hFirst, 'pointermove', hFirstR.left + 20, 755, 73);
      await new Promise((r) => setTimeout(r, 500));
      const scrollMidDown = window.scrollY;
      // Dispatch Escape mid-scroll!
      hFirst.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      const scrollAtCancelMoment = window.scrollY;
      await new Promise((r) => setTimeout(r, 150));
      const scrollAfterCancelWait = window.scrollY;
      const autoScrollStoppedImmediatelyOnEscape = Math.abs(scrollAfterCancelWait - scrollAtCancelMoment) <= 2;
      const transformsClearedAfterMidScrollEscape = Array.from(document.querySelectorAll('[data-order-step]')).every(
        (el) => el.style.transform === '',
      );
      const orderPreservedAfterMidScrollEscape =
        window.__pilatesStore.getState().activeSteps[0]?.stepId === 'syn-move-1';

      // Upward cross-section auto-scroll canceled mid-scroll with pointercancel
      allCards[15]?.scrollIntoView({ block: 'center' });
      await new Promise((r) => setTimeout(r, 100));
      const h15 = allCards[15].querySelector('.sequence-drag-handle');
      const h15r = h15.getBoundingClientRect();
      const scrollStartUp = window.scrollY;
      fire(h15, 'pointerdown', h15r.left + 20, h15r.top + 20, 74);
      fire(h15, 'pointermove', h15r.left + 20, h15r.top - 20, 74);
      fire(h15, 'pointermove', h15r.left + 20, 24, 74);
      await new Promise((r) => setTimeout(r, 450));
      const scrollMidUp = window.scrollY;
      fire(h15, 'pointercancel', h15r.left + 20, 24, 74);
      const scrollAtPointerCancel = window.scrollY;
      await new Promise((r) => setTimeout(r, 150));
      const scrollAfterPointerCancelWait = window.scrollY;
      const headerTranslatesClearedOnPointerCancel = Array.from(
        document.querySelectorAll('.pf-sequence-block__header'),
      ).every((h) => h.style.translate === '' && h.style.transform === '');

      // Also test dispatching Escape on window when handle is blurred (R5-03 check)
      allCards[0]?.scrollIntoView({ block: 'start' });
      await new Promise((r) => setTimeout(r, 80));
      const h0Again = allCards[0].querySelector('.sequence-drag-handle');
      const h0AgainR = h0Again.getBoundingClientRect();
      fire(h0Again, 'pointerdown', h0AgainR.left + 20, h0AgainR.top + 20, 75);
      fire(h0Again, 'pointermove', h0AgainR.left + 20, h0AgainR.top + 180, 75);
      // Dispatch Escape on document.body (simulating non-handle target when touch doesn't focus button on iOS/iPadOS)
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      const windowEscapeCanceledDragWithoutHandleFocus =
        document.querySelector('.sequence-drag-overlay') === null;
      // Clean up if still active
      h0Again.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      return {
        rapidConsecutiveReorders: {
          overlaysBeforeSecondDrag,
          concurrentOverlayCountDuringRapidDrag: concurrentOverlaysDuringRapidDrag.length,
          secondOverlayWidthImmediatelyPx,
          expectedCardWidthAtZoom2Px,
          r5_02_retiringOverlayShadowedZoomScaleOnFirstFrame:
            secondOverlayWidthImmediatelyPx !== expectedCardWidthAtZoom2Px,
          topThreeAfterRapidDrags,
          overlaysRemainingAfterSettle,
          indexAfter5RapidArrowDown,
          indexAfter5RapidUndo,
        },
        cancelDuringAutoScroll: {
          downScrollDeltaBeforeCancelPx: Math.round(scrollMidDown - scrollStartDown),
          autoScrollStoppedImmediatelyOnEscape,
          transformsClearedAfterMidScrollEscape,
          orderPreservedAfterMidScrollEscape,
          upScrollDeltaBeforeCancelPx: Math.round(scrollMidUp - scrollStartUp),
          autoScrollStoppedImmediatelyOnPointerCancel:
            Math.abs(scrollAfterPointerCancelWait - scrollAtPointerCancel) <= 2,
          headerTranslatesClearedOnPointerCancel,
          r5_03_windowEscapeCanceledDragWithoutHandleFocus: windowEscapeCanceledDragWithoutHandleFocus,
        },
      };
    })()`);

    // 4. Screen Rotation (390x844 Portrait <-> 844x390 Landscape)
    //    4A: Rotation AFTER a committed reorder
    //    4B: Rotation DURING an active upward cross-section drag (reproducing R5-01!)
    await cdp.eval(buildSeed80Expression());
    await cdp.eval(`(async () => {
      const cards = Array.from(document.querySelectorAll('[data-order-step]'));
      cards[11]?.scrollIntoView({ block: 'start' });
      await new Promise((r) => setTimeout(r, 100));
      const c11 = cards[11], c13 = cards[13];
      const h13 = c13.querySelector('.sequence-drag-handle');
      const h13r = h13.getBoundingClientRect();
      const c11r = c11.getBoundingClientRect();
      const fire = (el, type, x, y) => {
        const ev = new PointerEvent(type, {
          bubbles: true, cancelable: true, button: 0, buttons: 1,
          clientX: x, clientY: y, pointerId: 81, pointerType: 'touch', isPrimary: true,
        });
        el.dispatchEvent(ev);
      };
      fire(h13, 'pointerdown', h13r.left + 20, h13r.top + 20);
      fire(h13, 'pointermove', h13r.left + 20, h13r.top - 16);
      fire(h13, 'pointermove', h13r.left + 20, Math.max(80, c11r.top + 20));
      await new Promise((r) => setTimeout(r, 100));
    })()`);

    // Rotate viewport from 390x844 (Portrait) to 844x390 (Landscape) while drag is active!
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 844,
      height: 390,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await sleep(250);
    await cdp.screenshot(path.join(SCREENSHOT_DIR, 'round5-screen-rotation-during-drag-r5-01.png'));

    const screenRotationVerification = await cdp.eval(`(async () => {
      // Check state right after portrait -> landscape rotation during active upward cross-section drag
      const cards = Array.from(document.querySelectorAll('[data-order-step]'));
      const c12 = cards[12], c13 = cards[13];
      const warmHeader2 = c13.closest('.pf-sequence-block')?.querySelector('.pf-sequence-block__header');
      const overlayRemovedOnRotation = document.querySelector('.sequence-drag-overlay') === null;
      const indicatorRemovedOnRotation = document.querySelector('.sequence-drop-indicator') === null;
      const orderPreservedOnRotationCancel =
        window.__pilatesStore.getState().activeSteps[13]?.stepId === 'syn-move-14';
      const staleHeaderTranslateAfterRotation = warmHeader2?.style.translate ?? '';
      const whRect = warmHeader2?.getBoundingClientRect();
      const nextCardRect = c13.getBoundingClientRect();
      const staleHeaderOverlapsCardAfterRotation = whRect
        ? whRect.bottom > nextCardRect.top + 1 && whRect.top < nextCardRect.bottom - 1
        : false;

      // Try starting a new drag on h13 without firing pointercancel first
      const h13 = c13.querySelector('.sequence-drag-handle');
      const h13r = h13.getBoundingClientRect();
      const evDown = new PointerEvent('pointerdown', {
        bubbles: true, cancelable: true, button: 0, buttons: 1,
        clientX: h13r.left + 20, clientY: h13r.top + 20, pointerId: 82, pointerType: 'touch', isPrimary: true,
      });
      const evMove = new PointerEvent('pointermove', {
        bubbles: true, cancelable: true, button: 0, buttons: 1,
        clientX: h13r.left + 20, clientY: h13r.top + 45, pointerId: 82, pointerType: 'touch', isPrimary: true,
      });
      h13.dispatchEvent(evDown);
      h13.dispatchEvent(evMove);
      const newDragBlockedBeforePointerCancel = document.querySelector('.sequence-drag-overlay') === null;

      // Firing pointercancel recovers the card
      h13.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 81 }));
      const headerTranslateClearedAfterPointerCancel = warmHeader2?.style.translate === '';

      // Also check landscape layout overflow
      const landscapeOverflowPx = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);

      return {
        rotatedViewport: { width: window.innerWidth, height: window.innerHeight },
        landscapeOverflowPx,
        overlayRemovedOnRotation,
        indicatorRemovedOnRotation,
        orderPreservedOnRotationCancel,
        r5_01_staleHeaderTranslateAfterRotation: staleHeaderTranslateAfterRotation,
        r5_01_staleHeaderOverlapsCardAfterRotation: staleHeaderOverlapsCardAfterRotation,
        r5_01_newDragBlockedBeforePointerCancel: newDragBlockedBeforePointerCancel,
        headerTranslateClearedAfterPointerCancel,
      };
    })()`);

    const report = {
      round: 'round5-cross-input-webkit-audit',
      capturedAt: new Date().toISOString(),
      environment,
      viewportMatrix,
      crossInputVerification,
      rapidAndAutoScrollCancel,
      screenRotationVerification,
    };

    const outPath = path.join(EVIDENCE_DIR, 'round5-cross-input-metrics.json');
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log(`Saved Round 5 metrics to ${outPath}`);
    console.log(
      JSON.stringify(
        {
          webkitStatus: environment.webkitSafariRuntime.status,
          chromiumVersion: environment.chromiumRuntime.version,
          viewportsVerified: Object.keys(viewportMatrix).length,
          r5_01_staleHeaderTranslateAfterRotation:
            screenRotationVerification.r5_01_staleHeaderTranslateAfterRotation,
          r5_01_staleHeaderOverlapsCardAfterRotation:
            screenRotationVerification.r5_01_staleHeaderOverlapsCardAfterRotation,
          r5_02_retiringOverlayShadowedZoomScaleOnFirstFrame:
            rapidAndAutoScrollCancel.rapidConsecutiveReorders
              .r5_02_retiringOverlayShadowedZoomScaleOnFirstFrame,
          r5_03_windowEscapeCanceledDragWithoutHandleFocus:
            rapidAndAutoScrollCancel.cancelDuringAutoScroll
              .r5_03_windowEscapeCanceledDragWithoutHandleFocus,
        },
        null,
        2,
      ),
    );

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
