import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const PROOF_DIR = '/home/antigravity/blue45f/pilate_flow-worktrees/r5-browser-proof-20261107/docs/builder-r5-browser-proof-20261107';
const SCREENSHOT_DIR = path.join(PROOF_DIR, 'screenshots');
const VIDEO_DIR = path.join(PROOF_DIR, 'videos');
const EVIDENCE_FILE = path.join(PROOF_DIR, 'evidence', 'r5-browser-proof-metrics.json');

const BEFORE_REPO = '/home/antigravity/blue45f/pilate_flow';
const AFTER_REPO = '/home/antigravity/blue45f/pilate_flow-worktrees/r5-candidate-20261107';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class CdpSession {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
  }
  async connect() {
    if (this.ws.readyState === WebSocket.OPEN) return;
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(String(event.data));
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    });
  }
  send(method, params = {}) {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result?.value;
  }
  async screenshot(filePath) {
    const { data } = await this.send('Page.captureScreenshot', { format: 'png' });
    await fs.writeFile(filePath, Buffer.from(data, 'base64'));
  }
  close() {
    this.ws.close();
  }
}

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

async function startVite(cwd, port) {
  const proc = spawn(
    path.join(BEFORE_REPO, 'node_modules/.bin/vite'),
    ['--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    { cwd, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  await waitForHttp(`http://127.0.0.1:${port}`);
  return proc;
}

async function startChromium(debugPort) {
  const userDataDir = `/tmp/chromium-r5-proof-${debugPort}-${Date.now()}`;
  const proc = spawn(
    '/usr/bin/chromium',
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${userDataDir}`,
      'about:blank',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  await waitForHttp(`http://127.0.0.1:${debugPort}/json/version`);
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
  const pageTarget = targets.find((t) => t.type === 'page');
  const cdp = new CdpSession(pageTarget.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('DOM.enable');
  return { proc, cdp };
}

async function seedSynthetic80Steps(cdp, url, width, height, mobile = width < 900) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
  });
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }],
  });
  const currentUrl = await cdp.eval(`window.location.href`);
  if (!currentUrl || !currentUrl.startsWith(url)) {
    await cdp.send('Page.navigate', { url });
    await sleep(1200);
  }
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const count = await cdp.eval(`(async () => {
      try {
        window.scrollTo(0, 0);
        document.documentElement.style.zoom = '';
        const mod = await import('/src/store/usePilatesStore.ts');
        const usePilatesStore = mod.usePilatesStore;
        window.__pilatesStore = usePilatesStore;
        const state = usePilatesStore.getState();
        const baseExercises = state.exercises;
        if (!Array.isArray(baseExercises) || baseExercises.length === 0) return 0;
        const restIndices = new Set([12, 32, 52, 68]);
        const steps = [];
        for (let i = 0; i < 80; i += 1) {
          if (restIndices.has(i)) {
            steps.push({
              stepId: 'syn-rest-' + (i + 1),
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
              stepId: 'syn-move-' + (i + 1),
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
          activeSequenceId: 'syn-long-80-r5-proof',
          activeTitle: '합성 80단계 R5 브라우저 검증 수업안',
          activeTargetMinutes: 80,
          activeSteps: steps,
          undoStack: [],
          generationError: null,
          persistenceError: null,
        });
        await new Promise((r) => setTimeout(r, 250));
        return document.querySelectorAll('[data-order-step]').length;
      } catch {
        return 0;
      }
    })()`);
    if (count === 80) break;
    await sleep(300);
  }
}

async function firePointer(cdp, stepId, type, clientX, clientY, pointerId = 1, pointerType = 'touch') {
  return cdp.eval(`(() => {
    const card = document.querySelector('[data-order-step="${stepId}"]');
    const handle = card?.querySelector('.sequence-drag-handle');
    if (!handle) return false;
    const ev = new PointerEvent('${type}', {
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerId: ${pointerId},
      pointerType: '${pointerType}',
      isPrimary: true,
      button: 0,
      buttons: '${type}' === 'pointerup' || '${type}' === 'pointercancel' ? 0 : 1,
      clientX: ${clientX},
      clientY: ${clientY}
    });
    handle.dispatchEvent(ev);
    return true;
  })()`);
}

function encodeSideBySideVideo(beforeFrames, afterFrames, mp4Out, webmOut) {
  // Combine before & after PNG frames side-by-side using convert, then encode mp4 + webm with ffmpeg
  const tmpDir = `/tmp/r5-video-${Date.now()}`;
  execFileSync('mkdir', ['-p', tmpDir]);
  const count = Math.max(beforeFrames.length, afterFrames.length);
  for (let i = 0; i < count; i += 1) {
    const b = beforeFrames[Math.min(i, beforeFrames.length - 1)];
    const a = afterFrames[Math.min(i, afterFrames.length - 1)];
    const framePath = path.join(tmpDir, `frame-${String(i).padStart(3, '0')}.png`);
    execFileSync('/usr/bin/convert', [
      b,
      a,
      '+append',
      '-resize',
      '1280x720!',
      framePath,
    ]);
  }
  execFileSync('/usr/bin/ffmpeg', [
    '-y',
    '-framerate',
    '2',
    '-i',
    path.join(tmpDir, 'frame-%03d.png'),
    '-vf',
    'tpad=stop_mode=clone:stop_duration=1,format=yuv420p',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    mp4Out,
  ]);
  execFileSync('/usr/bin/ffmpeg', [
    '-y',
    '-framerate',
    '2',
    '-i',
    path.join(tmpDir, 'frame-%03d.png'),
    '-vf',
    'tpad=stop_mode=clone:stop_duration=1,format=yuv420p',
    '-c:v',
    'libvpx-vp9',
    '-b:v',
    '400k',
    webmOut,
  ]);
}

async function runSuiteOnTarget(cdp, baseUrl, tag) {
  const frames = { r5_01: [], r5_02: [], r5_03: [], r5_04: [] };

  // --- R5-01: resize / blur / visibilitychange mid-drag interruption & immediate re-drag ---
  await seedSynthetic80Steps(cdp, baseUrl, 390, 844, true);
  const prepR501 = await cdp.eval(`(() => {
    const c11 = document.querySelector('[data-order-step="syn-move-11"]');
    c11.scrollIntoView({ block: 'start', behavior: 'instant' });
    window.scrollBy(0, -70);
    const c13 = document.querySelector('[data-order-step="syn-rest-13"]');
    const h13 = c13.querySelector('.sequence-drag-handle').getBoundingClientRect();
    const r11 = c11.getBoundingClientRect();
    return {
      hx: Math.round(h13.left + h13.width / 2),
      hy: Math.round(h13.top + h13.height / 2),
      ty: Math.round(r11.top + 18)
    };
  })()`);

  const f01_1 = path.join(SCREENSHOT_DIR, `r5-01-${tag}-frame1-before-drag.png`);
  await cdp.screenshot(f01_1);
  frames.r5_01.push(f01_1);

  await firePointer(cdp, 'syn-rest-13', 'pointerdown', prepR501.hx, prepR501.hy, 10, 'touch');
  await firePointer(cdp, 'syn-rest-13', 'pointermove', prepR501.hx, prepR501.hy - 16, 10, 'touch');
  await firePointer(cdp, 'syn-rest-13', 'pointermove', prepR501.hx, prepR501.ty, 10, 'touch');
  await sleep(80);

  const f01_2 = path.join(SCREENSHOT_DIR, `r5-01-${tag}-frame2-active-cross-section-drag.png`);
  await cdp.screenshot(f01_2);
  frames.r5_01.push(f01_2);

  // Trigger screen rotation (resize 390x844 -> 844x390) during active drag
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 844,
    height: 390,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await sleep(80);
  await firePointer(cdp, 'syn-rest-13', 'pointermove', prepR501.hx, prepR501.ty - 4, 10, 'touch');
  await sleep(60);

  const r501ResizeState = await cdp.eval(`(() => {
    const c13 = document.querySelector('[data-order-step="syn-rest-13"]');
    const restBlock = c13.closest('.pf-sequence-block');
    const restHeader = restBlock.querySelector('.pf-sequence-block__header');
    const hr = restHeader.getBoundingClientRect();
    const cr = c13.getBoundingClientRect();
    const raw = { state: window.__pilatesStore.getState() };
    return {
      overlayCountAfterResize: document.querySelectorAll('.sequence-drag-overlay').length,
      indicatorCountAfterResize: document.querySelectorAll('.sequence-drop-indicator').length,
      headerStyleTranslate: restHeader.style.translate || '',
      headerRect: { left: Math.round(hr.left), top: Math.round(hr.top), width: Math.round(hr.width), height: Math.round(hr.height), bottom: Math.round(hr.bottom) },
      card13Rect: { left: Math.round(cr.left), top: Math.round(cr.top), width: Math.round(cr.width), height: Math.round(cr.height), bottom: Math.round(cr.bottom) },
      headerOverlapsCard13: hr.bottom > cr.top + 8,
      orderSlice10To15: raw.state.activeSteps.slice(10, 15).map((s) => s.stepId)
    };
  })()`);

  const f01_3 = path.join(SCREENSHOT_DIR, `r5-01-${tag}-resize-interruption.png`);
  await cdp.screenshot(f01_3);
  frames.r5_01.push(f01_3);

  // Attempt immediate re-drag on syn-rest-13 without firing pointercancel first
  await firePointer(cdp, 'syn-rest-13', 'pointerdown', prepR501.hx, 180, 11, 'touch');
  await firePointer(cdp, 'syn-rest-13', 'pointermove', prepR501.hx, 140, 11, 'touch');
  await sleep(50);
  const reDragAfterResize = await cdp.eval(`(() => {
    const ov = document.querySelector('.sequence-drag-overlay');
    const r = ov?.getBoundingClientRect();
    return {
      reDragOverlayCount: document.querySelectorAll('.sequence-drag-overlay').length,
      reDragOverlayRect: r ? { left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) } : null
    };
  })()`);
  await firePointer(cdp, 'syn-rest-13', 'pointercancel', prepR501.hx, 140, 11, 'touch');

  // Sub-case B: blur interruption
  await seedSynthetic80Steps(cdp, baseUrl, 390, 844, true);
  await cdp.eval(`(() => {
    document.querySelector('[data-order-step="syn-move-11"]').scrollIntoView({ block: 'start', behavior: 'instant' });
    window.scrollBy(0, -70);
  })()`);
  await firePointer(cdp, 'syn-rest-13', 'pointerdown', prepR501.hx, prepR501.hy, 12, 'touch');
  await firePointer(cdp, 'syn-rest-13', 'pointermove', prepR501.hx, prepR501.ty, 12, 'touch');
  await sleep(50);
  await cdp.eval(`window.dispatchEvent(new Event('blur'))`);
  await firePointer(cdp, 'syn-rest-13', 'pointermove', prepR501.hx, prepR501.ty - 3, 12, 'touch');
  await sleep(40);
  const r501BlurState = await cdp.eval(`(() => {
    const c13 = document.querySelector('[data-order-step="syn-rest-13"]');
    const restHeader = c13.closest('.pf-sequence-block').querySelector('.pf-sequence-block__header');
    return {
      overlayCountAfterBlur: document.querySelectorAll('.sequence-drag-overlay').length,
      headerStyleTranslateAfterBlur: restHeader.style.translate || ''
    };
  })()`);
  await firePointer(cdp, 'syn-rest-13', 'pointercancel', prepR501.hx, prepR501.ty, 12, 'touch');

  // Sub-case C: visibilitychange interruption
  await firePointer(cdp, 'syn-rest-13', 'pointerdown', prepR501.hx, prepR501.hy, 13, 'touch');
  await firePointer(cdp, 'syn-rest-13', 'pointermove', prepR501.hx, prepR501.ty, 13, 'touch');
  await sleep(50);
  await cdp.eval(`(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  })()`);
  await firePointer(cdp, 'syn-rest-13', 'pointermove', prepR501.hx, prepR501.ty - 3, 13, 'touch');
  await sleep(40);
  const r501VisibilityState = await cdp.eval(`(() => {
    const c13 = document.querySelector('[data-order-step="syn-rest-13"]');
    const restHeader = c13.closest('.pf-sequence-block').querySelector('.pf-sequence-block__header');
    return {
      overlayCountAfterVisibilityChange: document.querySelectorAll('.sequence-drag-overlay').length,
      headerStyleTranslateAfterVisibilityChange: restHeader.style.translate || ''
    };
  })()`);

  // --- R5-02: <160ms rapid consecutive re-drag at 200% zoom ---
  await seedSynthetic80Steps(cdp, baseUrl, 390, 844, true);
  const f02_1 = path.join(SCREENSHOT_DIR, `r5-02-${tag}-frame1-before-rapid-drag.png`);
  await cdp.screenshot(f02_1);
  frames.r5_02.push(f02_1);

  const r502OverlapMetrics = await cdp.eval(`(async () => {
    const fire = (el, type, x, y, pid) => {
      const ev = new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        button: 0,
        buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : 1,
        clientX: x,
        clientY: y,
        pointerId: pid,
        pointerType: 'touch',
        isPrimary: true,
      });
      el.dispatchEvent(ev);
    };
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 80));
    const cards1 = Array.from(document.querySelectorAll('[data-order-step]'));
    const c0 = cards1[0], c1 = cards1[1];
    const h0 = c0.querySelector('.sequence-drag-handle');
    const h0r = h0.getBoundingClientRect();
    const c1r = c1.getBoundingClientRect();
    fire(h0, 'pointerdown', h0r.left + 20, h0r.top + 20, 71);
    fire(h0, 'pointermove', h0r.left + 20, h0r.top + 36, 71);
    fire(h0, 'pointermove', h0r.left + 20, c1r.top + c1r.height * 0.65, 71);
    fire(h0, 'pointerup', h0r.left + 20, c1r.top + c1r.height * 0.65, 71);

    // Wait 25ms (< 160ms drop return animation) so retiring overlay #1 is still in flight
    await new Promise((r) => setTimeout(r, 25));
    const overlaysBeforeSecondDrag = document.querySelectorAll('.sequence-drag-overlay').length;

    document.documentElement.style.zoom = '2';
    const cards2 = Array.from(document.querySelectorAll('[data-order-step]'));
    const h2 = cards2[2].querySelector('.sequence-drag-handle');
    const h2r = h2.getBoundingClientRect();
    const topCardR = cards2[0].getBoundingClientRect();
    fire(h2, 'pointerdown', h2r.left + 20, h2r.top + 20, 72);
    fire(h2, 'pointermove', h2r.left + 20, h2r.top - 20, 72);
    fire(h2, 'pointermove', h2r.left + 20, topCardR.top + 20, 72);

    const overlays = Array.from(document.querySelectorAll('.sequence-drag-overlay'));
    const activeOverlay = overlays[overlays.length - 1];
    const retiringOverlay = overlays[0];
    const sourceCard = cards2[2];
    const ar = activeOverlay?.getBoundingClientRect();
    const rr = retiringOverlay?.getBoundingClientRect();
    const sr = sourceCard?.getBoundingClientRect();
    return {
      overlaysBeforeSecondDrag,
      concurrentOverlayCount: overlays.length,
      activeOverlayStyleWidth: activeOverlay?.style.width || '',
      activeOverlayRect: ar ? { left: Math.round(ar.left), top: Math.round(ar.top), width: Math.round(ar.width), height: Math.round(ar.height) } : null,
      retiringOverlayRect: rr ? { left: Math.round(rr.left), top: Math.round(rr.top), width: Math.round(rr.width), height: Math.round(rr.height) } : null,
      sourceCardRect: sr ? { left: Math.round(sr.left), top: Math.round(sr.top), width: Math.round(sr.width), height: Math.round(sr.height) } : null,
      activeOverlayWidthMatchesSourceCard: ar && sr ? Math.abs(ar.width - sr.width) <= 2 : false,
      dropTargetX: Math.round(h2r.left + 20),
      dropTargetY: Math.round(topCardR.top + 20)
    };
  })()`);

  const f02_2 = path.join(SCREENSHOT_DIR, `r5-02-${tag}-rapid-drag-zoom200.png`);
  await cdp.screenshot(f02_2);
  frames.r5_02.push(f02_2);

  const r502AfterSettle = await cdp.eval(`(async () => {
    const h2 = document.querySelector('[data-order-step="syn-move-3"] .sequence-drag-handle');
    const ev = new PointerEvent('pointerup', {
      bubbles: true, cancelable: true, button: 0, buttons: 0,
      clientX: ${r502OverlapMetrics.dropTargetX}, clientY: ${r502OverlapMetrics.dropTargetY},
      pointerId: 72, pointerType: 'touch', isPrimary: true
    });
    h2?.dispatchEvent(ev);
    document.documentElement.style.zoom = '';
    await new Promise((r) => setTimeout(r, 280));
    const raw = { state: window.__pilatesStore.getState() };
    return {
      overlayCountAfterSettle: document.querySelectorAll('.sequence-drag-overlay').length,
      topThreeStepsAfterSettle: raw.state.activeSteps.slice(0, 3).map((s) => s.stepId)
    };
  })()`);

  // --- R5-03: Unfocused touch Escape cancel & WebKit static contract ---
  await seedSynthetic80Steps(cdp, baseUrl, 390, 844, true);
  await cdp.eval(`(async () => {
    const fire = (el, type, x, y, pid) => {
      const ev = new PointerEvent(type, {
        bubbles: true, cancelable: true, button: 0,
        buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : 1,
        clientX: x, clientY: y, pointerId: pid, pointerType: 'touch', isPrimary: true,
      });
      el.dispatchEvent(ev);
    };
    const allCards = Array.from(document.querySelectorAll('[data-order-step]'));
    allCards[0]?.scrollIntoView({ block: 'start', behavior: 'instant' });
    window.scrollBy(0, -40);
    await new Promise((r) => setTimeout(r, 80));
    const h0 = allCards[0].querySelector('.sequence-drag-handle');
    const h0R = h0.getBoundingClientRect();
    fire(h0, 'pointerdown', h0R.left + 20, h0R.top + 20, 75);
    fire(h0, 'pointermove', h0R.left + 20, h0R.top + 36, 75);
    fire(h0, 'pointermove', h0R.left + 20, h0R.top + 190, 75);
  })()`);
  await sleep(60);

  const f03_1 = path.join(SCREENSHOT_DIR, `r5-03-${tag}-frame1-active-touch-drag.png`);
  await cdp.screenshot(f03_1);
  frames.r5_03.push(f03_1);

  const r503Metrics = await cdp.eval(`(() => {
    // Dispatch Escape on document.body (simulating non-handle target when touch doesn't focus <button> on WebKit/iPadOS)
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }));
    const c0 = document.querySelector('[data-order-step="syn-move-1"]');
    const c1 = document.querySelector('[data-order-step="syn-move-2"]');
    const handle = c0.querySelector('.sequence-drag-handle');
    const cs = window.getComputedStyle(handle);
    const cr0 = c0.getBoundingClientRect();
    const cr1 = c1.getBoundingClientRect();
    const raw = { state: window.__pilatesStore.getState() };
    return {
      overlayCountAfterUnfocusedEscape: document.querySelectorAll('.sequence-drag-overlay').length,
      indicatorCountAfterUnfocusedEscape: document.querySelectorAll('.sequence-drop-indicator').length,
      neighborCard2TransformAfterUnfocusedEscape: c1.style.transform || '',
      card1Rect: { left: Math.round(cr0.left), top: Math.round(cr0.top), width: Math.round(cr0.width), height: Math.round(cr0.height) },
      card2Rect: { left: Math.round(cr1.left), top: Math.round(cr1.top), width: Math.round(cr1.width), height: Math.round(cr1.height) },
      step1Index: raw.state.activeSteps.findIndex((s) => s.stepId === 'syn-move-1'),
      webkitUserSelect: cs.webkitUserSelect || cs.userSelect || '',
      touchAction: cs.touchAction || ''
    };
  })()`);

  const f03_2 = path.join(SCREENSHOT_DIR, `r5-03-${tag}-unfocused-touch-escape.png`);
  await cdp.screenshot(f03_2);
  frames.r5_03.push(f03_2);
  await cdp.eval(`document.querySelector('[data-order-step="syn-move-1"] .sequence-drag-handle')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);

  // --- R5-04: Keyboard 5x rapid consecutive reorder ---
  await seedSynthetic80Steps(cdp, baseUrl, 390, 844, true);
  const f04_1 = path.join(SCREENSHOT_DIR, `r5-04-${tag}-frame1-before-keyboard-5x.png`);
  await cdp.screenshot(f04_1);
  frames.r5_04.push(f04_1);

  const r504Metrics = await cdp.eval(`(async () => {
    const beforeCard = document.querySelector('[data-order-step="syn-move-1"]').getBoundingClientRect();
    const h = document.getElementById('order-handle-syn-move-1');
    h.focus();
    for (let i = 0; i < 5; i += 1) {
      h.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    }
    await new Promise((r) => setTimeout(r, 80));
    const afterDownCard = document.querySelector('[data-order-step="syn-move-1"]').getBoundingClientRect();
    const rawDown = { state: window.__pilatesStore.getState() };
    const indexAfter5ArrowDown = rawDown.state.activeSteps.findIndex((s) => s.stepId === 'syn-move-1');
    const topSixAfter5ArrowDown = rawDown.state.activeSteps.slice(0, 6).map((s) => s.stepId);

    const hMoved = document.getElementById('order-handle-syn-move-1');
    hMoved.focus();
    for (let i = 0; i < 5; i += 1) {
      hMoved.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
    }
    await new Promise((r) => setTimeout(r, 80));
    const rawUp = { state: window.__pilatesStore.getState() };
    const indexAfter5ArrowUp = rawUp.state.activeSteps.findIndex((s) => s.stepId === 'syn-move-1');

    return {
      beforeCardRect: { left: Math.round(beforeCard.left), top: Math.round(beforeCard.top), width: Math.round(beforeCard.width), height: Math.round(beforeCard.height) },
      after5ArrowDownCardRect: { left: Math.round(afterDownCard.left), top: Math.round(afterDownCard.top), width: Math.round(afterDownCard.width), height: Math.round(afterDownCard.height) },
      indexAfter5ArrowDown,
      topSixAfter5ArrowDown,
      indexAfter5ArrowUp,
      overlayCountDuringKeyboard: document.querySelectorAll('.sequence-drag-overlay').length
    };
  })()`);

  // Re-dispatch 5 ArrowDown so screenshot shows the post-5x-ArrowDown visual state
  await cdp.eval(`(async () => {
    const h = document.getElementById('order-handle-syn-move-1');
    h.focus();
    for (let i = 0; i < 5; i += 1) {
      h.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    }
    await new Promise((r) => setTimeout(r, 80));
  })()`);
  const f04_2 = path.join(SCREENSHOT_DIR, `r5-04-${tag}-keyboard-5x-arrowdown.png`);
  await cdp.screenshot(f04_2);
  frames.r5_04.push(f04_2);

  return {
    r5_01: { ...r501ResizeState, ...reDragAfterResize, ...r501BlurState, ...r501VisibilityState },
    r5_02: { ...r502OverlapMetrics, ...r502AfterSettle },
    r5_03: r503Metrics,
    r5_04: r504Metrics,
    frames,
  };
}

async function runCandidateViewportMatrix(cdp, baseUrl) {
  const specs = [
    { name: '320x640-100', width: 320, height: 640, zoom: 1, pointerType: 'touch' },
    { name: '390x844-100', width: 390, height: 844, zoom: 1, pointerType: 'touch' },
    { name: '768x1024-100', width: 768, height: 1024, zoom: 1, pointerType: 'touch' },
    { name: '1440x900-100', width: 1440, height: 900, zoom: 1, pointerType: 'mouse' },
    { name: '320x640-200', width: 320, height: 640, zoom: 2, pointerType: 'touch' },
    { name: '390x844-200', width: 390, height: 844, zoom: 2, pointerType: 'touch' },
    { name: '768x1024-200', width: 768, height: 1024, zoom: 2, pointerType: 'touch' },
    { name: '1440x900-200', width: 1440, height: 900, zoom: 2, pointerType: 'mouse' },
  ];
  const out = {};
  for (const s of specs) {
    await seedSynthetic80Steps(cdp, baseUrl, s.width, s.height, s.width < 900);
    if (s.zoom !== 1) {
      await cdp.eval(`document.documentElement.style.zoom = '${s.zoom}'`);
      await sleep(200);
    }
    await cdp.eval(`(() => {
      const c0 = document.querySelector('[data-order-step="syn-move-1"]');
      c0.scrollIntoView({ block: 'start', behavior: 'instant' });
      window.scrollBy(0, -70);
    })()`);
    await sleep(120);
    const pts = await cdp.eval(`(() => {
      const c0 = document.querySelector('[data-order-step="syn-move-1"]');
      const c1 = document.querySelector('[data-order-step="syn-move-2"]');
      const h0 = c0.querySelector('.sequence-drag-handle').getBoundingClientRect();
      const r1 = c1.getBoundingClientRect();
      return {
        hx: Math.round(h0.left + h0.width / 2),
        hy: Math.round(h0.top + h0.height / 2),
        ty: Math.round(r1.top + r1.height * 0.72)
      };
    })()`);
    await firePointer(cdp, 'syn-move-1', 'pointerdown', pts.hx, pts.hy, 50, s.pointerType);
    await firePointer(cdp, 'syn-move-1', 'pointermove', pts.hx, pts.hy + 20, 50, s.pointerType);
    await firePointer(cdp, 'syn-move-1', 'pointermove', pts.hx, pts.ty, 50, s.pointerType);
    await sleep(60);
    const during = await cdp.eval(`(() => {
      const ov = document.querySelector('.sequence-drag-overlay');
      const ind = document.querySelector('.sequence-drop-indicator');
      const c0 = document.querySelector('[data-order-step="syn-move-1"]');
      const c1 = document.querySelector('[data-order-step="syn-move-2"]');
      const or = ov?.getBoundingClientRect();
      const ir = ind?.getBoundingClientRect();
      const sr = c0?.getBoundingClientRect();
      const nr = c1?.getBoundingClientRect();
      return {
        horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
        overlayCountDuringDrag: document.querySelectorAll('.sequence-drag-overlay').length,
        sourceCardRect: sr ? { left: Math.round(sr.left), top: Math.round(sr.top), width: Math.round(sr.width), height: Math.round(sr.height) } : null,
        overlayRect: or ? { left: Math.round(or.left), top: Math.round(or.top), width: Math.round(or.width), height: Math.round(or.height) } : null,
        indicatorRect: ir ? { left: Math.round(ir.left), top: Math.round(ir.top), width: Math.round(ir.width), height: Math.round(ir.height) } : null,
        neighborCardRect: nr ? { left: Math.round(nr.left), top: Math.round(nr.top), width: Math.round(nr.width), height: Math.round(nr.height) } : null
      };
    })()`);
    await firePointer(cdp, 'syn-move-1', 'pointerup', pts.hx, pts.ty, 50, s.pointerType);
    await sleep(280);
    const after = await cdp.eval(`(() => {
      const raw = { state: window.__pilatesStore.getState() };
      return {
        overlayCountAfterDrop: document.querySelectorAll('.sequence-drag-overlay').length,
        topThreeOrder: raw.state.activeSteps.slice(0, 3).map((x) => x.stepId)
      };
    })()`);
    out[s.name] = { ...s, ...during, ...after };
  }
  return out;
}

async function main() {
  const afterNodeModules = path.join(AFTER_REPO, 'node_modules');
  try {
    await fs.symlink(path.join(BEFORE_REPO, 'node_modules'), afterNodeModules);
  } catch {
    // ignore if exists
  }

  let viteBefore;
  let viteAfter;
  let chrome;
  try {
    viteBefore = await startVite(BEFORE_REPO, 4181);
    viteAfter = await startVite(AFTER_REPO, 4182);
    chrome = await startChromium(9345);

    const beforeRes = await runSuiteOnTarget(chrome.cdp, 'http://127.0.0.1:4181', 'before');
    const afterRes = await runSuiteOnTarget(chrome.cdp, 'http://127.0.0.1:4182', 'after');
    const candidateViewportMatrix = await runCandidateViewportMatrix(chrome.cdp, 'http://127.0.0.1:4182');

    for (const key of ['r5_01', 'r5_02', 'r5_03', 'r5_04']) {
      const slug = key.replace('_', '-');
      encodeSideBySideVideo(
        beforeRes.frames[key],
        afterRes.frames[key],
        path.join(VIDEO_DIR, `${slug}-before-vs-after.mp4`),
        path.join(VIDEO_DIR, `${slug}-before-vs-after.webm`),
      );
    }

    const report = {
      capturedAt: new Date().toISOString(),
      environment: {
        chromiumRuntime: 'Chromium 156.0.8078.79 built on Debian GNU/Linux 12 (bookworm) (Blink)',
        webkitSafariRuntime: {
          available: false,
          status: 'UNVERIFIED (미검증)',
          note: 'No real Safari or WebKit runtime exists in the Debian 12 sandbox VM. All browser measurements are recorded on Chromium 156 (Blink) and never claimed as Safari.',
        },
        beforeTargetCommit: '1f0356a3e959eb460bb72b3aa28f5d4800b2e381 (origin/main)',
        afterTargetCommit: 'e365b8284e3fc81bf455da76e4acbfb9e7d0b701 (candidate/builder-r5-01-04-20261107)',
      },
      before: {
        r5_01: beforeRes.r5_01,
        r5_02: beforeRes.r5_02,
        r5_03: beforeRes.r5_03,
        r5_04: beforeRes.r5_04,
      },
      after: {
        r5_01: afterRes.r5_01,
        r5_02: afterRes.r5_02,
        r5_03: afterRes.r5_03,
        r5_04: afterRes.r5_04,
      },
      candidateViewportMatrix,
    };

    await fs.writeFile(EVIDENCE_FILE, JSON.stringify(report, null, 2));
    console.log('Saved browser proof metrics to', EVIDENCE_FILE);
  } finally {
    chrome?.cdp?.close();
    chrome?.proc?.kill('SIGTERM');
    viteBefore?.kill('SIGTERM');
    viteAfter?.kill('SIGTERM');
    await fs.rm(afterNodeModules, { force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
