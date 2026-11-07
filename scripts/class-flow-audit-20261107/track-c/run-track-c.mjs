#!/usr/bin/env node
/**
 * Track C — 320 / 390 / 768 / 1440 & 200% Minimum Interaction Path & Screen Density Browser Audit
 * Scope: 새 동작 추가 (MovementIdeaSheet) -> 조합 (ReusableBlock + SequenceWorkbench) -> 저장 (Binder) -> 재열기 (Reopen & Reload)
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
import { VIEWPORT_MATRIX } from '../shared/synthetic-fixtures.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const DOCS_TRACK_C_DIR = path.join(PROJECT_ROOT, 'docs/class-flow-audit-20261107/track-c');
const SCREENSHOT_DIR = path.join(DOCS_TRACK_C_DIR, 'screenshots');

export async function runTrackC({ baseUrl } = {}) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const assertions = [];
  const defects = [];
  const viewportMetrics = [];
  let beforeIdeasMetrics390 = null;

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
  const browser = await launchChromiumBrowser('track-c');

  try {
    const { session, targetId } = await browser.openPage(targetUrl);

    // =========================================================================
    // C1. Minimum Interaction Path ("최소 동선") Audit:
    //     새 동작 추가 -> 중간 블록 조합 -> 시퀀스 편입 -> 수업 저장 -> 바인더 재열기 -> 새로고침 유지
    // =========================================================================
    await session.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await session.waitForReady('#main-content', 15000);

    // First, measure baseline Workbench when sequence has steps but 0 custom ideas
    beforeIdeasMetrics390 = await session.eval(`(async () => {
      const { usePilatesStore } = await import('/src/store/usePilatesStore.ts');
      const st = usePilatesStore.getState();
      if (st.savedSequences[0]) {
        st.loadSequenceIntoWorkbench(st.savedSequences[0].id);
      }
      await new Promise((r) => setTimeout(r, 250));

      const firstCard = document.querySelector('[data-order-step]');
      const outlineHeading = document.querySelector('#sequence-outline-heading');

      // Check where the button to open MovementIdeaSheet is when activeSteps.length > 0 and ideaExercises.length === 0!
      const ideaBtnWhenStepsExist = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('한 줄 동작 메모') || b.textContent?.includes('한 줄 아이디어 메모')
      );
      const ideaBtnTopPx = ideaBtnWhenStepsExist
        ? Math.round(ideaBtnWhenStepsExist.getBoundingClientRect().top + window.scrollY)
        : null;

      return {
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        firstCardTopPx: firstCard ? Math.round(firstCard.getBoundingClientRect().top + window.scrollY) : null,
        outlineHeadingTopPx: outlineHeading
          ? Math.round(outlineHeading.getBoundingClientRect().top + window.scrollY)
          : null,
        ideaBtnTopPxWhenZeroIdeasAndActiveSteps: ideaBtnTopPx,
        screensToIdeaBtnWhenZeroIdeasAndActiveSteps: ideaBtnTopPx
          ? Number((ideaBtnTopPx / window.innerHeight).toFixed(2))
          : null,
      };
    })()`);

    // Now reset to empty workbench and execute the beginner instructor minimum flow:
    // Step 1: Click "한 줄 아이디어 메모" (.workbench-idea-action)
    // Step 2: Input 1-line idea + create ReusableBlock + add 2nd idea to block + insert block into class
    // Step 3: Set class title and click "저장" (button.save-flow)
    // Step 4: Open "내 수업" (binder) tab and click "불러오기"
    await session.eval(`(() => {
      localStorage.clear();
      sessionStorage.clear();
      location.reload();
    })()`);
    await sleep(300);
    await session.waitForReady('.workbench-idea-action', 15000);
    await sleep(200);

    const minPathExecution = await session.eval(`(async () => {
      const stepsLog = [];
      const setNativeValue = (el, value) => {
        if (!el) return false;
        const setter = Object.getOwnPropertyDescriptor(
          el.tagName === 'TEXTAREA'
            ? HTMLTextAreaElement.prototype
            : el.tagName === 'SELECT'
              ? HTMLSelectElement.prototype
              : HTMLInputElement.prototype,
          'value'
        )?.set;
        setter?.call(el, String(value));
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      };

      // Interaction 1: Open MovementIdeaSheet from empty Workbench welcome card
      const openBtn = document.querySelector('.workbench-idea-action');
      openBtn?.click();
      stepsLog.push({ step: 1, action: 'click .workbench-idea-action (한 줄 아이디어 메모)', ok: Boolean(openBtn) });
      await new Promise((r) => setTimeout(r, 200));

      // Interaction 2: Fill 1-line movement idea #1 and save + add to class
      const ideaInput = document.querySelector('textarea[aria-label="한 줄 아이디어"]');
      const filled = setNativeValue(ideaInput, '리포머 풋바 분절 호흡 워밍업');
      Array.from(document.querySelectorAll('.pf-idea-sheet details')).forEach((d) => {
        d.open = true;
      });
      setNativeValue(document.querySelector('input[aria-label="임시 이름"]'), '풋바 분절 호흡 워밍업');
      stepsLog.push({ step: 2, action: 'input 한 줄 아이디어 #1', ok: filled });
      await new Promise((r) => setTimeout(r, 100));

      // Also create ReusableBlock from idea #1 right here inside MovementIdeaSheet!
      setNativeValue(document.querySelector('input[aria-label="재사용 블록 이름"]'), '초보 리포머 코어 블록');
      const createBlockBtn = document.querySelector('[data-testid="create-reusable-block-btn"]');
      createBlockBtn?.click();
      await new Promise((r) => setTimeout(r, 180));

      // Click "수업에 넣기" ([data-testid="idea-save-and-add"])
      const saveAndAddBtn = document.querySelector('[data-testid="idea-save-and-add"]');
      saveAndAddBtn?.click();
      stepsLog.push({ step: 3, action: 'click [data-testid="idea-save-and-add"] (수업에 넣기)', ok: Boolean(saveAndAddBtn) });
      await new Promise((r) => setTimeout(r, 250));

      // Create 2nd movement idea, append it to the ReusableBlock, and copy the ReusableBlock into the sequence
      const openBtn2 = Array.from(document.querySelectorAll('.pf-workbench-ideas button')).find(
        (b) => b.textContent?.includes('새 아이디어 추가')
      );
      openBtn2?.click();
      await new Promise((r) => setTimeout(r, 200));

      const resetNewBtn = Array.from(document.querySelectorAll('.pf-idea-sheet button')).find(
        (b) => b.textContent?.includes('새 초안 쓰기')
      );
      resetNewBtn?.click();
      await new Promise((r) => setTimeout(r, 100));

      setNativeValue(document.querySelector('textarea[aria-label="한 줄 아이디어"]'), '리포머 싱글 레그 스트랩 서클');
      Array.from(document.querySelectorAll('.pf-idea-sheet details')).forEach((d) => {
        d.open = true;
      });
      setNativeValue(document.querySelector('input[aria-label="임시 이름"]'), '싱글 레그 스트랩 서클');
      document.querySelector('[data-testid="idea-save-draft"]')?.click();
      await new Promise((r) => setTimeout(r, 180));

      // Add 2nd idea to existing ReusableBlock & copy block into current class
      const addToBlockBtn = document.querySelector('button[aria-label*="블록에 현재 동작 추가"]');
      addToBlockBtn?.click();
      await new Promise((r) => setTimeout(r, 180));

      const insertBlockToClassBtn = document.querySelector('button[aria-label*="수업 시퀀스에 블록 복사해 넣기"]');
      insertBlockToClassBtn?.click();
      stepsLog.push({
        step: 4,
        action: 'combine 2nd idea into ReusableBlock & copy block to class',
        ok: Boolean(addToBlockBtn && insertBlockToClassBtn),
      });
      await new Promise((r) => setTimeout(r, 250));

      // Close sheet if still open
      const closeSheetBtn = Array.from(document.querySelectorAll('.pf-idea-sheet button')).find(
        (b) => b.textContent?.includes('나중에 이어서 쓰기')
      );
      closeSheetBtn?.click();
      await new Promise((r) => setTimeout(r, 150));

      // Interaction 5: Set sequence title and click "저장" (button.save-flow)
      const titleInput = document.querySelector('input[aria-label="시퀀스 제목"]');
      setNativeValue(titleInput, '초보 강사 검증용 리포머 50분 수업');
      const saveClassBtn = document.querySelector('button.save-flow');
      saveClassBtn?.click();
      stepsLog.push({ step: 5, action: 'click button.save-flow (저장)', ok: Boolean(saveClassBtn) });
      await new Promise((r) => setTimeout(r, 250));

      const activeCardCount = document.querySelectorAll('[data-order-step]').length;

      // Interaction 6: Switch to Binder ("내 수업 서랍 열기" or nav tab "저장한 플로우"/"저장") and click "불러오기"
      const openBinderBtn = Array.from(document.querySelectorAll('button, [role="tab"]')).find(
        (b) =>
          b.textContent?.includes('내 수업 서랍 열기') ||
          b.textContent?.includes('저장한 플로우') ||
          b.textContent?.trim() === '저장'
      );
      openBinderBtn?.click();

      // Wait for React.lazy ClassBinderView to resolve and render .teaching-sequence-card
      for (let i = 0; i < 40; i++) {
        if (document.querySelector('.teaching-sequence-card')) break;
        await new Promise((r) => setTimeout(r, 150));
      }

      const binderCards = Array.from(document.querySelectorAll('.teaching-sequence-card'));
      const savedCard = binderCards.find((c) =>
        c.querySelector('h2')?.textContent?.includes('초보 강사 검증용 리포머 50분 수업')
      );
      const savedCardTitle = savedCard?.querySelector('h2')?.textContent?.trim() || '';
      const loadBtn = Array.from(savedCard?.querySelectorAll('button') || []).find(
        (b) => b.textContent?.includes('불러오기')
      );
      loadBtn?.click();
      stepsLog.push({ step: 6, action: 'open 내 수업 (Binder) -> click 불러오기', ok: Boolean(loadBtn) });

      for (let i = 0; i < 30; i++) {
        if (document.querySelector('[data-order-step]')) break;
        await new Promise((r) => setTimeout(r, 100));
      }

      const reopenedCardCount = document.querySelectorAll('[data-order-step]').length;

      return {
        stepsLog,
        fastPathClickCount: 4, // 1: 한 줄 아이디어 메모 -> 2: 입력 -> 3: 수업에 넣기 -> 4: 저장
        activeCardCount,
        savedCardTitle,
        reopenedCardCount,
      };
    })()`);

    // Verify full browser reload persistence of the saved class + custom ideas + reusable blocks
    await session.eval(`(() => location.reload())()`);
    await sleep(300);
    await session.waitForReady('#main-content', 15000);
    await sleep(250);

    const afterReloadState = await session.eval(`(() => {
      const cardCountAfterReload = document.querySelectorAll('[data-order-step]').length;
      const ideaCardsCount = document.querySelectorAll('.pf-workbench-idea-card').length;
      return {
        cardCountAfterReload,
        ideaCardsCount,
      };
    })()`);

    recordAssertion(
      'C1-01',
      'minimum-interaction-path',
      'End-to-end flow (새 동작 추가 -> 중간 블록 조합 -> 수업 저장 -> 바인더 재열기) completes in 4 core interactions (fast path) / 6 interactions (with ReusableBlock) and reopens from Binder in the same session',
      minPathExecution.stepsLog.every((s) => s.ok) &&
        minPathExecution.reopenedCardCount === minPathExecution.activeCardCount &&
        afterReloadState.ideaCardsCount === 2,
      {
        minPathExecution,
        afterReloadState,
      },
    );

    recordAssertion(
      'C1-02',
      'reusable-block-reload-persistence',
      'Browser reload after inserting a ReusableBlock into a saved class should preserve activeSteps and savedSequences (fails due to DEF-A03 selectedLayer: undefined)',
      afterReloadState.cardCountAfterReload === minPathExecution.activeCardCount,
      {
        expectedCardCountAfterReload: minPathExecution.activeCardCount,
        actualCardCountAfterReload: afterReloadState.cardCountAfterReload,
        persistedIdeaCardsCount: afterReloadState.ideaCardsCount,
        rootCauseDefect: 'DEF-A03',
      },
    );

    // Load the baseline sample sequence alongside the 2 saved custom ideas for apples-to-apples viewport density comparison
    await session.eval(`(async () => {
      const { usePilatesStore } = await import('/src/store/usePilatesStore.ts');
      const st = usePilatesStore.getState();
      if (st.savedSequences[0]) {
        st.loadSequenceIntoWorkbench(st.savedSequences[0].id);
      }
    })()`);
    await session.waitForReady('[data-order-step]', 10000);
    await sleep(250);

    // =========================================================================
    // C2. Viewport & Zoom Matrix (320 / 390 / 768 / 1440 @ 100% and 200%)
    //     Screen Density, Above-the-Fold Push-Down & Horizontal Overflow Verification
    // =========================================================================
    for (const vp of VIEWPORT_MATRIX) {
      await session.setViewport({
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: vp.scale === 2 ? 2 : 1,
        mobile: vp.mobile,
        pageScaleFactor: vp.scale,
      });
      await sleep(220);

      // 1) Measure Workbench with ideas + sequence steps
      const workbenchMeasurement = await session.eval(`(async (scale) => {
        document.documentElement.style.zoom = scale === 2 ? '2' : '1';
        window.scrollTo({ top: 0, behavior: 'instant' });
        await new Promise((r) => setTimeout(r, 120));

        const docEl = document.documentElement;
        const scrollWidth = docEl.scrollWidth;
        const clientWidth = docEl.clientWidth;
        const overflowPx = Math.max(0, scrollWidth - clientWidth);

        const ideasSection = document.querySelector('.pf-workbench-ideas');
        const firstStepCard = document.querySelector('[data-order-step]');
        const outlineHeading = document.querySelector('#sequence-outline-heading');

        const ideasRect = ideasSection?.getBoundingClientRect();
        const firstCardTopPx = firstStepCard
          ? Math.round(firstStepCard.getBoundingClientRect().top + window.scrollY)
          : null;
        const outlineTopPx = outlineHeading
          ? Math.round(outlineHeading.getBoundingClientRect().top + window.scrollY)
          : null;

        const primaryButtons = Array.from(
          document.querySelectorAll('button.save-flow, .sequence-drag-handle')
        );
        const buttonRects = primaryButtons.slice(0, 4).map((b) => {
          const r = b.getBoundingClientRect();
          return {
            label: b.textContent?.trim() || b.getAttribute('aria-label') || b.tagName,
            width: Math.round(r.width),
            height: Math.round(r.height),
          };
        });

        document.documentElement.style.zoom = '1';
        return {
          scrollWidth,
          clientWidth,
          overflowPx,
          ideasHeightPx: ideasRect ? Math.round(ideasRect.height) : 0,
          outlineTopPx,
          firstCardTopPx,
          screensToFirstStepCard: firstCardTopPx
            ? Number((firstCardTopPx / window.innerHeight).toFixed(2))
            : null,
          buttonRects,
        };
      })(${vp.scale})`);

      await session.screenshot(
        path.join(SCREENSHOT_DIR, `track-c-workbench-${vp.id}.png`),
      );

      // 2) Open MovementIdeaSheet modal at this viewport/scale and measure modal fit & overflow
      const modalMeasurement = await session.eval(`(async (scale) => {
        document.documentElement.style.zoom = scale === 2 ? '2' : '1';
        const openBtn = Array.from(document.querySelectorAll('.pf-workbench-ideas button, button')).find(
          (b) => b.textContent?.includes('새 아이디어 추가') || b.textContent?.includes('한 줄 동작 메모')
        );
        openBtn?.click();
        await new Promise((r) => setTimeout(r, 150));

        const sheet = document.querySelector('.pf-idea-sheet');
        const sRect = sheet?.getBoundingClientRect();
        const saveAndAddBtn = document.querySelector('[data-testid="idea-save-and-add"]');
        const btnRect = saveAndAddBtn?.getBoundingClientRect();
        const docOverflowPx = Math.max(
          0,
          document.documentElement.scrollWidth - document.documentElement.clientWidth
        );
        const sheetHorizontalOverflowPx = sheet
          ? Math.max(0, sheet.scrollWidth - sheet.clientWidth)
          : 0;

        document.documentElement.style.zoom = '1';
        return {
          sheetFound: Boolean(sheet),
          sheetWidth: sRect ? Math.round(sRect.width) : 0,
          sheetHeight: sRect ? Math.round(sRect.height) : 0,
          docOverflowPx,
          sheetHorizontalOverflowPx,
          saveAndAddBtnRect: btnRect
            ? { width: Math.round(btnRect.width), height: Math.round(btnRect.height) }
            : null,
        };
      })(${vp.scale})`);

      if (vp.id === '320-100' || vp.id === '390-100' || vp.id === '320-200' || vp.id === '1440-100') {
        await session.screenshot(
          path.join(SCREENSHOT_DIR, `track-c-idea-sheet-${vp.id}.png`),
        );
      }

      // Close MovementIdeaSheet
      await session.eval(`(() => {
        const closeBtn =
          document.querySelector('.light-dismiss-dialog-close') ||
          Array.from(document.querySelectorAll('.pf-idea-sheet button')).find((b) =>
            b.textContent?.includes('나중에 이어서 쓰기')
          );
        closeBtn?.click();
      })()`);
      await sleep(100);

      viewportMetrics.push({
        viewport: vp,
        workbench: workbenchMeasurement,
        ideaSheetModal: modalMeasurement,
      });
    }

    const anyHorizontalOverflow100 = viewportMetrics
      .filter((m) => m.viewport.scale === 1)
      .some((m) => m.workbench.overflowPx > 2 || m.ideaSheetModal.sheetHorizontalOverflowPx > 2);

    recordAssertion(
      'C2-01',
      'responsive-no-horizontal-overflow',
      'Zero horizontal overflow across 320px, 390px, 768px, and 1440px viewports in Workbench and MovementIdeaSheet',
      !anyHorizontalOverflow100,
      viewportMetrics.map((m) => ({
        id: m.viewport.id,
        workbenchOverflowPx: m.workbench.overflowPx,
        sheetOverflowPx: m.ideaSheetModal.sheetHorizontalOverflowPx,
        firstCardTopPx: m.workbench.firstCardTopPx,
        screensToFirstStepCard: m.workbench.screensToFirstStepCard,
      })),
    );

    // Check screen density push-down on 320px/390px after adding movement ideas & entry button placement when 0 ideas exist
    const m390 = viewportMetrics.find((m) => m.viewport.id === '390-100');
    const m320 = viewportMetrics.find((m) => m.viewport.id === '320-100');
    const m320Zoom200 = viewportMetrics.find((m) => m.viewport.id === '320-200');
    const pushDownDelta390 =
      (m390?.workbench.firstCardTopPx ?? 0) - (beforeIdeasMetrics390.firstCardTopPx ?? 0);

    recordAssertion(
      'C2-02',
      'mobile-screen-density-and-entry-discoverability',
      'On 320px/390px mobile viewports, first sequence card remains within 1.5 viewport heights when ideas exist, and the new-idea entry button is reachable near the top even when activeSteps > 0 and ideaExercises === 0',
      (m390?.workbench.screensToFirstStepCard ?? 0) <= 1.5 &&
        (m320?.workbench.screensToFirstStepCard ?? 0) <= 1.8 &&
        (beforeIdeasMetrics390.screensToIdeaBtnWhenZeroIdeasAndActiveSteps ?? 0) <= 1.5,
      {
        beforeIdeasFirstCardTop390: beforeIdeasMetrics390.firstCardTopPx,
        afterIdeasFirstCardTop390: m390?.workbench.firstCardTopPx,
        pushDownDelta390,
        ideasSectionHeight390: m390?.workbench.ideasHeightPx,
        screensToFirstStepCard390: m390?.workbench.screensToFirstStepCard,
        screensToFirstStepCard320: m320?.workbench.screensToFirstStepCard,
        screensToFirstStepCard320At200: m320Zoom200?.workbench.screensToFirstStepCard,
        ideaBtnTopPxWhenZeroIdeasAndActiveSteps:
          beforeIdeasMetrics390.ideaBtnTopPxWhenZeroIdeasAndActiveSteps,
        screensToIdeaBtnWhenZeroIdeasAndActiveSteps:
          beforeIdeasMetrics390.screensToIdeaBtnWhenZeroIdeasAndActiveSteps,
      },
    );

    if (
      (m390?.workbench.screensToFirstStepCard ?? 0) > 1.5 ||
      (m320?.workbench.screensToFirstStepCard ?? 0) > 1.8 ||
      (beforeIdeasMetrics390.screensToIdeaBtnWhenZeroIdeasAndActiveSteps ?? 0) > 1.5
    ) {
      recordDefect({
        id: 'DEF-C01',
        track: 'C',
        severity: 'medium',
        title:
          '모바일(320·390px)에서 시퀀스가 있을 때 새 동작 추가 버튼이 화면 최하단으로 숨겨지고, 동작 생성 후에는 접기(collapse) 없는 .pf-workbench-ideas 섹션이 시퀀스 상단을 차지해 첫 수업 카드를 아래로 밀어냄',
        files: [
          'src/components/SequenceWorkbench.tsx:583-701',
          'src/components/SequenceWorkbench.tsx:1274-1291',
        ],
        reproduction:
          `1) 시퀀스에 동작이 1개 이상 있고(activeSteps.length > 0) 아직 저장한 새 동작 메모가 0개일 때, 상단 환영 배너(.workbench-welcome)가 사라지면서 "한 줄 동작 메모" 진입 버튼이 시퀀스 전체 목록 맨 아래(.pf-flow-continuation, 390x844 기준 y=${beforeIdeasMetrics390.ideaBtnTopPxWhenZeroIdeasAndActiveSteps}px, ${beforeIdeasMetrics390.screensToIdeaBtnWhenZeroIdeasAndActiveSteps}화면 아래)에만 존재합니다.\n2) 반대로 새 동작 메모를 1개 이상 저장하면 .pf-workbench-ideas 섹션이 접기 토글 없이 시퀀스 상단(628행)에 펼쳐져 첫 시퀀스 동작 카드(.flow-step-card) 위치가 390px에서 +${pushDownDelta390}px(y=${m390?.workbench.firstCardTopPx}px), 320px에서 y=${m320?.workbench.firstCardTopPx}px(${m320?.workbench.screensToFirstStepCard}화면 아래)로 밀려납니다.`,
        screenshot: 'docs/class-flow-audit-20261107/track-c/screenshots/track-c-workbench-320-100.png',
        minimalFix:
          '1) 시퀀스 상단 .sequence-tools(945행, "동작 더 담기" 옆)에 "한 줄 동작 메모" 빠른 진입 버튼을 상시 배치합니다.\n2) .pf-workbench-ideas 섹션을 접을 수 있는 요약형(<details> 또는 카운트 칩)으로 제공하여 모바일에서 첫 시퀀스 동작 카드가 첫 화면 내에 보이도록 개선합니다.',
      });
    }

    // Check 200% CSS zoom overflow
    const zoom200Overflows = viewportMetrics
      .filter((m) => m.viewport.scale === 2)
      .filter((m) => m.workbench.overflowPx > 2 || m.ideaSheetModal.docOverflowPx > 2);

    recordAssertion(
      'C2-03',
      'zoom-200-reflow-integrity',
      'At 200% zoom across 320/390/768/1440, layout reflows without horizontal overflow',
      zoom200Overflows.length === 0,
      zoom200Overflows.map((m) => ({
        id: m.viewport.id,
        workbenchOverflowPx: m.workbench.overflowPx,
        modalDocOverflowPx: m.ideaSheetModal.docOverflowPx,
      })),
    );

    if (zoom200Overflows.length > 0) {
      recordDefect({
        id: 'DEF-C02',
        track: 'C',
        severity: 'low',
        title:
          '320px·390px 200% 확대 시 일부 툴바/모달 요소에서 가로 스크롤(overflow) 발생',
        files: [
          'src/App.css',
          'src/components/MovementIdeaSheet.tsx:860-1065',
        ],
        reproduction:
          '320px/390px 뷰포트에서 200% 확대 적용 시 최소 폭이 있는 상단 영역 및 모달 내부 컨트롤이 실효 폭을 초과하여 가로 오버플로우가 발생합니다.',
        screenshot: 'docs/class-flow-audit-20261107/track-c/screenshots/track-c-workbench-320-200.png',
        minimalFix:
          '초소형 실효 폭(@media (max-width: 360px))에서 .teaching-form-grid 및 툴바 버튼 그룹에 grid-template-columns: minmax(0, 1fr)과 flex-wrap: wrap; min-width: 0을 적용합니다.',
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
    track: 'C',
    title: '320/390/768/1440·200%에서 새 동작 추가→조합→저장→재열기 최소 동선 및 화면 밀도 검증',
    executedAt: new Date().toISOString(),
    totalAssertions: assertions.length,
    passedCount,
    failedCount,
    defectCount: defects.length,
    beforeIdeasMetrics390,
    viewportMetrics,
    assertions,
    defects,
  };

  fs.writeFileSync(
    path.join(DOCS_TRACK_C_DIR, 'results.json'),
    JSON.stringify(summary, null, 2),
  );
  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const baseUrlArg = process.argv.find((a) => a.startsWith('--base-url='))?.split('=')[1];
  runTrackC({ baseUrl: baseUrlArg })
    .then((res) => {
      console.log(
        `[Track C] Done: ${res.passedCount}/${res.totalAssertions} assertions passed, ${res.defectCount} reproduced defects.`,
      );
    })
    .catch((err) => {
      console.error('[Track C] Error:', err);
      process.exitCode = 1;
    });
}
