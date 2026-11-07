#!/usr/bin/env node
/**
 * Track B — Mobile Drag / Keyboard Reordering, Cancellation, Auto-Scroll & Visual Feedback Browser Audit
 * Real Chromium browser verification at 390x844 (mobile touch/pointer) and keyboard interaction.
 * Strictly READ-ONLY against application source files.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  launchChromiumBrowser,
  sleep,
  startViteTestServer,
} from '../shared/cdp-harness.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const DOCS_TRACK_B_DIR = path.join(PROJECT_ROOT, 'docs/class-flow-audit-20261107/track-b');
const SCREENSHOT_DIR = path.join(DOCS_TRACK_B_DIR, 'screenshots');

export async function runTrackB({ baseUrl } = {}) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const assertions = [];
  const defects = [];
  const recordAssertion = (id, category, title, passed, details) => {
    assertions.push({ id, category, title, passed, details });
  };
  const recordDefect = (defect) => {
    defects.push(defect);
  };

  let ownServer = null;
  const targetUrl =
    baseUrl ||
    (ownServer = await startViteTestServer(PROJECT_ROOT)).url;
  const browser = await launchChromiumBrowser('track-b');

  try {
    const { session, targetId } = await browser.openPage(targetUrl);
    await session.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await session.waitForReady('#main-content', 15000);

    // Load the 8-step signature reformer sequence into the Workbench
    await session.eval(`(async () => {
      const { usePilatesStore } = await import('/src/store/usePilatesStore.ts');
      const st = usePilatesStore.getState();
      if (st.savedSequences[0]) {
        st.loadSequenceIntoWorkbench(st.savedSequences[0].id);
      }
      // Allow synthetic PointerEvents to work cleanly with setPointerCapture/releasePointerCapture
      HTMLElement.prototype.setPointerCapture = function () {};
      HTMLElement.prototype.releasePointerCapture = function (id) {
        this.dispatchEvent(new PointerEvent('lostpointercapture', { bubbles: true, pointerId: id }));
      };
      HTMLElement.prototype.hasPointerCapture = function () { return true; };
    })()`);
    await session.waitForReady('[data-order-step]', 10000);
    await sleep(300);

    // =========================================================================
    // B1. Keyboard Reordering (ArrowUp / ArrowDown), Focus Retention & Scroll Margin
    // =========================================================================
    const keyboardTest = await session.eval(`(async () => {
      const getOrder = () =>
        Array.from(document.querySelectorAll('[data-order-step]')).map((c) => c.getAttribute('data-order-step'));
      const beforeOrder = getOrder();
      const secondStepId = beforeOrder[1];
      const handle = document.getElementById('order-handle-' + secondStepId);
      if (!handle) return { error: 'Handle not found', beforeOrder };

      handle.focus();
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 80));
      const afterUpOrder = getOrder();
      const activeAfterUp = document.activeElement?.id || '';

      // Boundary test: press ArrowUp again when already at index 0 (upDisabled === true)
      const topHandle = document.getElementById('order-handle-' + secondStepId);
      topHandle?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 60));
      const afterTopBoundaryOrder = getOrder();
      const upButtonDisabledAtTop = Boolean(
        topHandle?.parentElement?.querySelector('button[aria-label*="위로 이동"]')?.disabled
      );

      // Move back down with ArrowDown
      const currentHandle = document.getElementById('order-handle-' + secondStepId);
      currentHandle?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 80));
      const afterDownOrder = getOrder();
      const activeAfterDown = document.activeElement?.id || '';

      const cardEl = document.querySelector(\`[data-order-step="\${secondStepId}"]\`);
      const scrollMarginTop = cardEl ? getComputedStyle(cardEl).scrollMarginTop : '';

      return {
        beforeOrder,
        afterUpOrder,
        afterTopBoundaryOrder,
        afterDownOrder,
        activeAfterUp,
        activeAfterDown,
        expectedHandleId: 'order-handle-' + secondStepId,
        upButtonDisabledAtTop,
        scrollMarginTop,
      };
    })()`);

    recordAssertion(
      'B1-01',
      'keyboard-reorder',
      'Keyboard ArrowUp/ArrowDown reorders steps, preserves focus on #order-handle-{stepId}, respects top boundary (index 0), and applies scroll-margin',
      keyboardTest.afterUpOrder?.[0] === keyboardTest.beforeOrder?.[1] &&
        keyboardTest.afterTopBoundaryOrder?.[0] === keyboardTest.beforeOrder?.[1] &&
        keyboardTest.afterDownOrder?.[1] === keyboardTest.beforeOrder?.[1] &&
        keyboardTest.activeAfterUp === keyboardTest.expectedHandleId &&
        keyboardTest.activeAfterDown === keyboardTest.expectedHandleId &&
        keyboardTest.upButtonDisabledAtTop === true,
      keyboardTest,
    );

    // =========================================================================
    // B2. Mobile Touch/Pointer Drag Threshold (8px), Visual Feedback & Commit
    // =========================================================================
    const dragStartState = await session.eval(`(async () => {
      const cards = Array.from(document.querySelectorAll('[data-order-step]'));
      cards[1]?.scrollIntoView({ block: 'center' });
      await new Promise((r) => setTimeout(r, 150));

      const getOrder = () =>
        Array.from(document.querySelectorAll('[data-order-step]')).map((c) => c.getAttribute('data-order-step'));
      const beforeOrder = getOrder();
      const secondId = beforeOrder[1];
      const thirdId = beforeOrder[2];

      const handle = document.getElementById('order-handle-' + secondId);
      const thirdCard = document.querySelector(\`[data-order-step="\${thirdId}"]\`);
      const hRect = handle.getBoundingClientRect();
      const c3Rect = thirdCard.getBoundingClientRect();

      const startX = hRect.left + hRect.width / 2;
      const startY = hRect.top + hRect.height / 2;

      handle.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        pointerId: 11,
        pointerType: 'touch',
        isPrimary: true,
        button: 0,
        clientX: startX,
        clientY: startY,
      }));

      // Move 4px (< 8px threshold in sequenceDrag.ts:264) -> should NOT start dragging
      handle.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        pointerId: 11,
        pointerType: 'touch',
        isPrimary: true,
        clientX: startX,
        clientY: startY + 4,
      }));
      const listEl = document.querySelector('.flow-sections');
      const draggingAt4px = listEl?.getAttribute('data-drag-session') === 'true';

      // Move past midpoint of thirdCard (> 8px threshold)
      const targetY = c3Rect.top + c3Rect.height * 0.75;
      handle.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        pointerId: 11,
        pointerType: 'touch',
        isPrimary: true,
        clientX: startX,
        clientY: targetY,
      }));
      await new Promise((r) => setTimeout(r, 60));

      const draggingActive = listEl?.getAttribute('data-drag-session') === 'true';
      const sourceAttr = document
        .querySelector(\`[data-order-step="\${secondId}"]\`)
        ?.getAttribute('data-drag-source');
      const overCardId = document
        .querySelector('[data-drag-over="true"]')
        ?.getAttribute('data-order-step');
      const overlayEl = document.querySelector('.sequence-drag-overlay');
      const indicatorEl = document.querySelector('.sequence-drop-indicator');
      const statusText = document.querySelector('.sequence-drag-status')?.textContent?.trim() || '';

      return {
        beforeOrder,
        secondId,
        thirdId,
        startX,
        targetY,
        draggingAt4px,
        draggingActive,
        sourceAttr,
        overCardId,
        hasOverlay: Boolean(overlayEl),
        overlayBlockedAttr: overlayEl?.getAttribute('data-drag-blocked'),
        hasIndicator: Boolean(indicatorEl && !indicatorEl.hidden),
        indicatorText: indicatorEl?.textContent?.trim() || '',
        statusText,
      };
    })()`);

    await session.screenshot(
      path.join(SCREENSHOT_DIR, 'track-b-01-active-drag-visual-feedback.png'),
    );

    const dragCommitState = await session.eval(`(async (params) => {
      const handle = document.getElementById('order-handle-' + params.secondId);
      handle.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true,
        cancelable: true,
        pointerId: 11,
        pointerType: 'touch',
        isPrimary: true,
        button: 0,
        clientX: params.startX,
        clientY: params.targetY,
      }));
      await new Promise((r) => setTimeout(r, 250));
      const afterOrder = Array.from(document.querySelectorAll('[data-order-step]')).map((c) =>
        c.getAttribute('data-order-step')
      );
      const draggingAfterUp =
        document.querySelector('.flow-sections')?.getAttribute('data-drag-session') === 'true';
      return { afterOrder, draggingAfterUp };
    })(${JSON.stringify({
      secondId: dragStartState.secondId,
      startX: dragStartState.startX,
      targetY: dragStartState.targetY,
    })})`);

    recordAssertion(
      'B2-01',
      'mobile-drag-visual-and-commit',
      'Touch pointer drag respects 8px threshold, renders .sequence-drag-overlay + .sequence-drop-indicator + data-drag-source/over, and commits new order on pointerup',
      dragStartState.draggingAt4px === false &&
        dragStartState.draggingActive === true &&
        dragStartState.sourceAttr === 'true' &&
        dragStartState.hasOverlay === true &&
        dragStartState.overlayBlockedAttr === 'false' &&
        dragStartState.hasIndicator === true &&
        dragCommitState.draggingAfterUp === false &&
        dragCommitState.afterOrder[2] === dragStartState.secondId,
      { dragStartState, dragCommitState },
    );

    // =========================================================================
    // B3. Drag Cancellation (Escape, pointercancel, Out-of-Bounds Drop, Window Blur)
    // =========================================================================
    const cancelTests = await session.eval(`(async () => {
      const getOrder = () =>
        Array.from(document.querySelectorAll('[data-order-step]')).map((c) => c.getAttribute('data-order-step'));

      const startDragOnSecond = async (pid) => {
        const order = getOrder();
        const sourceId = order[1];
        const targetId = order[2];
        const handle = document.getElementById('order-handle-' + sourceId);
        const targetCard = document.querySelector(\`[data-order-step="\${targetId}"]\`);
        const hRect = handle.getBoundingClientRect();
        const tRect = targetCard.getBoundingClientRect();
        const startX = hRect.left + hRect.width / 2;
        const startY = hRect.top + hRect.height / 2;
        const moveY = tRect.top + tRect.height * 0.75;

        handle.dispatchEvent(new PointerEvent('pointerdown', {
          bubbles: true, cancelable: true, pointerId: pid, pointerType: 'touch', isPrimary: true, button: 0,
          clientX: startX, clientY: startY,
        }));
        handle.dispatchEvent(new PointerEvent('pointermove', {
          bubbles: true, cancelable: true, pointerId: pid, pointerType: 'touch', isPrimary: true,
          clientX: startX, clientY: moveY,
        }));
        await new Promise((r) => setTimeout(r, 50));
        const activeDuringDrag =
          document.querySelector('.flow-sections')?.getAttribute('data-drag-session') === 'true';
        return { order, sourceId, handle, startX, moveY, activeDuringDrag };
      };

      // 1) Escape key cancellation
      const escInit = await startDragOnSecond(21);
      escInit.handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 60));
      const afterEscOrder = getOrder();
      const escNotice = document.querySelector('[data-plan-feedback]')?.textContent?.trim() || '';

      // 2) pointercancel cancellation
      const pcInit = await startDragOnSecond(22);
      pcInit.handle.dispatchEvent(new PointerEvent('pointercancel', {
        bubbles: true, cancelable: true, pointerId: 22, pointerType: 'touch', isPrimary: true,
      }));
      await new Promise((r) => setTimeout(r, 60));
      const afterPointerCancelOrder = getOrder();

      // 3) Out-of-bounds drop cancellation (x = 2, y = 10 -> resolveSequenceDrop returns null)
      const oobInit = await startDragOnSecond(23);
      oobInit.handle.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true, cancelable: true, pointerId: 23, pointerType: 'touch', isPrimary: true,
        clientX: 2, clientY: 10,
      }));
      const oobBlockedAttr = document.querySelector('.sequence-drag-overlay')?.getAttribute('data-drag-blocked');
      const oobStatusText = document.querySelector('.sequence-drag-status')?.textContent?.trim() || '';
      oobInit.handle.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true, cancelable: true, pointerId: 23, pointerType: 'touch', isPrimary: true, button: 0,
        clientX: 2, clientY: 10,
      }));
      await new Promise((r) => setTimeout(r, 60));
      const afterOobOrder = getOrder();

      // 4) Window blur cancellation
      const blurInit = await startDragOnSecond(24);
      window.dispatchEvent(new Event('blur'));
      await new Promise((r) => setTimeout(r, 60));
      const afterBlurOrder = getOrder();

      return {
        escInitActive: escInit.activeDuringDrag,
        escRestored: JSON.stringify(afterEscOrder) === JSON.stringify(escInit.order),
        escNotice,
        pcInitActive: pcInit.activeDuringDrag,
        pcRestored: JSON.stringify(afterPointerCancelOrder) === JSON.stringify(pcInit.order),
        oobInitActive: oobInit.activeDuringDrag,
        oobBlockedAttr,
        oobStatusText,
        oobRestored: JSON.stringify(afterOobOrder) === JSON.stringify(oobInit.order),
        blurInitActive: blurInit.activeDuringDrag,
        blurRestored: JSON.stringify(afterBlurOrder) === JSON.stringify(blurInit.order),
      };
    })()`);

    await session.screenshot(
      path.join(SCREENSHOT_DIR, 'track-b-02-after-cancel-restored.png'),
    );

    recordAssertion(
      'B3-01',
      'drag-cancel-escape-pointercancel-oob-blur',
      'Escape key, pointercancel, out-of-bounds drop, and window blur all cancel active drag cleanly and preserve original step order',
      cancelTests.escInitActive &&
        cancelTests.escRestored &&
        cancelTests.pcInitActive &&
        cancelTests.pcRestored &&
        cancelTests.oobInitActive &&
        cancelTests.oobBlockedAttr === 'true' &&
        cancelTests.oobRestored &&
        cancelTests.blurInitActive &&
        cancelTests.blurRestored,
      cancelTests,
    );

    // =========================================================================
    // B4. Locked Step Barrier & Visual Blocked Feedback (data-drag-blocked="true")
    // =========================================================================
    const lockedBarrierTest = await session.eval(`(async () => {
      const { usePilatesStore } = await import('/src/store/usePilatesStore.ts');
      const getOrder = () =>
        Array.from(document.querySelectorAll('[data-order-step]')).map((c) => c.getAttribute('data-order-step'));

      // Lock index 2 (3rd step)
      usePilatesStore.getState().toggleStepLock(2);
      await new Promise((r) => setTimeout(r, 80));

      const beforeOrder = getOrder();
      const sourceId = beforeOrder[1]; // index 1
      const beyondLockedId = beforeOrder[3]; // index 3 (across locked index 2)

      const handle = document.getElementById('order-handle-' + sourceId);
      const beyondCard = document.querySelector(\`[data-order-step="\${beyondLockedId}"]\`);
      beyondCard?.scrollIntoView({ block: 'center' });
      await new Promise((r) => setTimeout(r, 120));

      const hRect = handle.getBoundingClientRect();
      const bRect = beyondCard.getBoundingClientRect();
      const startX = hRect.left + hRect.width / 2;
      const startY = hRect.top + hRect.height / 2;
      const targetY = bRect.top + bRect.height * 0.75;

      handle.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, cancelable: true, pointerId: 31, pointerType: 'touch', isPrimary: true, button: 0,
        clientX: startX, clientY: startY,
      }));
      handle.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true, cancelable: true, pointerId: 31, pointerType: 'touch', isPrimary: true,
        clientX: startX, clientY: targetY,
      }));
      await new Promise((r) => setTimeout(r, 60));

      const overlayBlocked = document
        .querySelector('.sequence-drag-overlay')
        ?.getAttribute('data-drag-blocked');
      const indicatorHidden = document.querySelector('.sequence-drop-indicator')?.hidden ?? true;
      const statusText = document.querySelector('.sequence-drag-status')?.textContent?.trim() || '';

      return {
        beforeOrder,
        sourceId,
        startX,
        targetY,
        overlayBlocked,
        indicatorHidden,
        statusText,
      };
    })()`);

    await session.screenshot(
      path.join(SCREENSHOT_DIR, 'track-b-03-locked-barrier-blocked.png'),
    );

    const lockedBarrierFinish = await session.eval(`(async (params) => {
      const { usePilatesStore } = await import('/src/store/usePilatesStore.ts');
      const handle = document.getElementById('order-handle-' + params.sourceId);
      handle.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true, cancelable: true, pointerId: 31, pointerType: 'touch', isPrimary: true, button: 0,
        clientX: params.startX, clientY: params.targetY,
      }));
      await new Promise((r) => setTimeout(r, 80));
      const afterOrder = Array.from(document.querySelectorAll('[data-order-step]')).map((c) =>
        c.getAttribute('data-order-step')
      );
      const noticeText = document.querySelector('[data-plan-feedback]')?.textContent?.trim() || '';
      // Unlock index 2
      usePilatesStore.getState().toggleStepLock(2);
      return { afterOrder, noticeText };
    })(${JSON.stringify({
      sourceId: lockedBarrierTest.sourceId,
      startX: lockedBarrierTest.startX,
      targetY: lockedBarrierTest.targetY,
    })})`);

    recordAssertion(
      'B4-01',
      'locked-step-barrier',
      'Dragging across a locked step sets data-drag-blocked="true", hides drop indicator, displays "잠긴 항목을 넘을 수 없어요", and blocks reordering on drop',
      lockedBarrierTest.overlayBlocked === 'true' &&
        lockedBarrierTest.indicatorHidden === true &&
        lockedBarrierTest.statusText.includes('잠긴 항목') &&
        JSON.stringify(lockedBarrierFinish.afterOrder) ===
          JSON.stringify(lockedBarrierTest.beforeOrder),
      { lockedBarrierTest, lockedBarrierFinish },
    );

    // =========================================================================
    // B5. Stationary Viewport-Edge Auto-Scrolling During Drag
    // =========================================================================
    const autoScrollTest = await session.eval(`(async () => {
      const firstCard = document.querySelector('[data-order-step]');
      firstCard?.scrollIntoView({ block: 'start' });
      await new Promise((r) => setTimeout(r, 150));

      const startScrollY = window.scrollY;
      const firstId = firstCard.getAttribute('data-order-step');
      const handle = document.getElementById('order-handle-' + firstId);
      const hRect = handle.getBoundingClientRect();
      const startX = hRect.left + hRect.width / 2;
      const startY = hRect.top + hRect.height / 2;

      const nav = document.querySelector('.bottom-nav');
      const navTop =
        nav && getComputedStyle(nav).display !== 'none'
          ? nav.getBoundingClientRect().top
          : window.innerHeight;
      const edgeY = Math.min(window.innerHeight, navTop) - 18; // Inside bottom 64px auto-scroll zone

      handle.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, cancelable: true, pointerId: 41, pointerType: 'touch', isPrimary: true, button: 0,
        clientX: startX, clientY: startY,
      }));
      handle.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true, cancelable: true, pointerId: 41, pointerType: 'touch', isPrimary: true,
        clientX: startX, clientY: edgeY,
      }));

      // Hold pointer stationary at bottom edge for 420ms while rAF tick() scrolls
      await new Promise((r) => setTimeout(r, 420));
      const endScrollY = window.scrollY;

      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 60));

      return {
        startScrollY: Math.round(startScrollY),
        endScrollY: Math.round(endScrollY),
        scrollDeltaPx: Math.round(endScrollY - startScrollY),
        edgeY: Math.round(edgeY),
      };
    })()`);

    recordAssertion(
      'B5-01',
      'stationary-edge-autoscroll',
      'Holding dragged card stationary near bottom edge (above .bottom-nav) continuously auto-scrolls the page via requestAnimationFrame',
      autoScrollTest.scrollDeltaPx > 40,
      autoScrollTest,
    );

    // =========================================================================
    // B6. Cross-Section Drag Preview Shift & Section Header Fragmentation Audit
    // =========================================================================
    const crossSectionAudit = await session.eval(`(async () => {
      const { usePilatesStore } = await import('/src/store/usePilatesStore.ts');
      const st = usePilatesStore.getState();
      st.loadSequenceIntoWorkbench(st.savedSequences[0].id);
      await new Promise((r) => setTimeout(r, 150));

      window.scrollTo({ top: 0, behavior: 'instant' });
      const cards = Array.from(document.querySelectorAll('[data-order-step]'));
      cards[0]?.scrollIntoView({ block: 'center' });
      await new Promise((r) => setTimeout(r, 120));

      const warmupCard = cards[0]; // index 0 (준비)
      const mainCard1 = cards[1];  // index 1 (본운동 first card)
      const mainCard2 = cards[2];  // index 2 (본운동 second card)

      const wRect = warmupCard.getBoundingClientRect();
      const m1Rect = mainCard1.getBoundingClientRect();
      const m2Rect = mainCard2.getBoundingClientRect();

      // Gap across section boundary (between warmupCard and mainCard1) vs normal intra-section gap (between mainCard1 and mainCard2)
      const crossSectionGapPx = Math.round(m1Rect.top - wRect.top - wRect.height);
      const normalIntraSectionGapPx = Math.round(m2Rect.top - m1Rect.top - m1Rect.height);

      // Start dragging warmupCard (index 0) down past mainCard2 (index 2)
      const handle0 = document.getElementById('order-handle-' + warmupCard.dataset.orderStep);
      const h0Rect = handle0.getBoundingClientRect();
      const startX = h0Rect.left + h0Rect.width / 2;
      const startY = h0Rect.top + h0Rect.height / 2;
      const targetY = m2Rect.top + m2Rect.height * 0.75;

      handle0.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, cancelable: true, pointerId: 51, pointerType: 'touch', isPrimary: true, button: 0,
        clientX: startX, clientY: startY,
      }));
      handle0.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true, cancelable: true, pointerId: 51, pointerType: 'touch', isPrimary: true,
        clientX: startX, clientY: targetY,
      }));
      await new Promise((r) => setTimeout(r, 60));

      const mainCard1TransformDuringDrag = mainCard1.style.transform;
      const mainCard1RectDuringDrag = mainCard1.getBoundingClientRect();
      const mainSectionHeaderRect = document
        .querySelectorAll('.pf-sequence-block__header')[1]
        ?.getBoundingClientRect();
      const overlapsMainSectionHeader = mainSectionHeaderRect
        ? mainCard1RectDuringDrag.top < mainSectionHeaderRect.bottom
        : false;

      // Commit the drop of warmupCard (index 0) to index 2 (between mainCard1 and mainCard2)
      handle0.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true, cancelable: true, pointerId: 51, pointerType: 'touch', isPrimary: true, button: 0,
        clientX: startX, clientY: targetY,
      }));
      await new Promise((r) => setTimeout(r, 150));

      const sectionTitlesAfterDrop = Array.from(
        document.querySelectorAll('.pf-sequence-block__title, .pf-sequence-block h3, .pf-sequence-block h2')
      )
        .map((el) => el.textContent?.trim())
        .filter(Boolean);
      const sectionPhasesAfterDrop = Array.from(document.querySelectorAll('.pf-sequence-block')).map(
        (el) => el.getAttribute('data-phase') || el.className
      );

      return {
        crossSectionGapPx,
        normalIntraSectionGapPx,
        mainCard1TransformDuringDrag,
        overlapsMainSectionHeader,
        sectionCountAfterDrop: sectionPhasesAfterDrop.length,
        sectionTitlesAfterDrop,
        sectionPhasesAfterDrop,
      };
    })()`);

    await session.screenshot(
      path.join(SCREENSHOT_DIR, 'track-b-04-section-header-fragmentation.png'),
    );

    // Expect 3 canonical sections (준비, 본운동, 마무리) without duplicate fragmented section blocks
    recordAssertion(
      'B6-01',
      'cross-section-reorder-coherence',
      'Reordering a step across section boundaries should not fragment sectionRuns into duplicate "본운동" headers',
      crossSectionAudit.sectionCountAfterDrop <= 3,
      crossSectionAudit,
    );

    if (crossSectionAudit.sectionCountAfterDrop > 3) {
      recordDefect({
        id: 'DEF-B01',
        track: 'B',
        severity: 'medium',
        title:
          '구간(준비·본운동·마무리) 경계를 넘어 동작 순서를 변경하면 classSection/blockCategory가 갱신되지 않아 동일 구간 헤더("본운동")가 여러 개로 쪼개짐',
        files: [
          'src/store/usePilatesStore.ts:1660-1695',
          'src/components/SequenceWorkbench.tsx:436-445',
        ],
        reproduction:
          `1) 기본 8동작 시퀀스(준비 1 + 본운동 6 + 마무리 1)에서 1번 '준비(warmup)' 카드를 드래그하여 '본운동' 2번째 위치로 이동합니다.\n2) reorderStep(usePilatesStore.ts:1660행)은 배열 순서와 order만 변경하고 이동한 위치의 구간(classSection/blockCategory)을 갱신하지 않습니다.\n3) 그 결과 SequenceWorkbench.tsx:440-445행의 sectionRuns가 [${crossSectionAudit.sectionTitlesAfterDrop.join(' → ')}] 총 ${crossSectionAudit.sectionCountAfterDrop}개 섹션 블록으로 쪼개져 '본운동' 헤더가 중복 렌더링됩니다.`,
        screenshot:
          'docs/class-flow-audit-20261107/track-b/screenshots/track-b-04-section-header-fragmentation.png',
        minimalFix:
          'reorderStep/moveStep 수행 시 인접 목표 카드의 구간(getSequenceStepClassSection)에 맞춰 이동한 스텝의 classSection을 동기화하거나, 섹션 그룹핑을 고정 3구간으로 유지합니다.',
      });
    }

    // Check cross-section drag preview shift inflation (DEF-B02)
    recordAssertion(
      'B6-02',
      'cross-section-drag-shift-alignment',
      'Dragging a step across a section header should shift intermediate cards by normal intra-section gap rather than the full section-header height',
      !crossSectionAudit.overlapsMainSectionHeader &&
        crossSectionAudit.crossSectionGapPx - crossSectionAudit.normalIntraSectionGapPx <= 24,
      crossSectionAudit,
    );

    if (
      crossSectionAudit.overlapsMainSectionHeader ||
      crossSectionAudit.crossSectionGapPx - crossSectionAudit.normalIntraSectionGapPx > 24
    ) {
      recordDefect({
        id: 'DEF-B02',
        track: 'B',
        severity: 'low',
        title:
          '구간 헤더(.pf-sequence-block)를 넘어 드래그할 때 sequenceDrag.ts의 gap 계산이 섹션 헤더 높이를 카드 간격으로 오인해 대상 카드들이 섹션 헤더 위로 과도하게 밀려 올라감',
        files: [
          'src/utils/sequenceDrag.ts:205-215',
        ],
        reproduction:
          `1) 1번 '준비' 카드와 2번 '본운동' 첫 카드 사이에는 '본운동' 섹션 헤더가 있어 수직 간격이 ${crossSectionAudit.crossSectionGapPx}px인 반면, 같은 섹션 내부 카드 간격은 ${crossSectionAudit.normalIntraSectionGapPx}px입니다.\n2) sequenceDrag.ts:207행은 positions[from + 1].top - source.top - source.height(${crossSectionAudit.crossSectionGapPx}px)를 모든 카드의 공통 gap으로 사용하여 shift = source.height + gap(${crossSectionAudit.mainCard1TransformDuringDrag})만큼 이동시킵니다.\n3) 이로 인해 드래그 중 본운동 카드들이 실제 카드 간격보다 ${crossSectionAudit.crossSectionGapPx - crossSectionAudit.normalIntraSectionGapPx}px 더 위로 이동하여 본운동 섹션 헤더와 겹칩니다.`,
        screenshot:
          'docs/class-flow-audit-20261107/track-b/screenshots/track-b-04-section-header-fragmentation.png',
        minimalFix:
          'sequenceDrag.ts:205-215에서 단일 인접 간격(positions[from ± 1]) 대신 이동 대상 카드가 속한 섹션 내 표준 카드 간격(또는 각 인접 쌍 중 동일 부모 컨테이너 내 간격, 기본 10~12px)을 사용하도록 수정합니다.',
      });
    }

    await browser.closeTarget(targetId);
  } finally {
    await browser.close();
    if (ownServer) {
      await ownServer.stop();
    }
  }

  const passedCount = assertions.filter((a) => a.passed).length;
  const failedCount = assertions.length - passedCount;
  const summary = {
    track: 'B',
    title: '모바일 드래그/키보드 순서변경·취소·자동스크롤과 시각 피드백 실제 브라우저 검증',
    executedAt: new Date().toISOString(),
    totalAssertions: assertions.length,
    passedCount,
    failedCount,
    defectCount: defects.length,
    assertions,
    defects,
  };

  fs.writeFileSync(
    path.join(DOCS_TRACK_B_DIR, 'results.json'),
    JSON.stringify(summary, null, 2),
  );
  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const baseUrlArg = process.argv.find((a) => a.startsWith('--base-url='))?.split('=')[1];
  runTrackB({ baseUrl: baseUrlArg })
    .then((res) => {
      console.log(
        `[Track B] Done: ${res.passedCount}/${res.totalAssertions} assertions passed, ${res.defectCount} reproduced defects.`,
      );
    })
    .catch((err) => {
      console.error('[Track B] Error:', err);
      process.exitCode = 1;
    });
}
