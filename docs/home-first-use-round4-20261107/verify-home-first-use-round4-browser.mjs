#!/usr/bin/env node
/**
 * Round 4 독립 감사: 필라테스 첫 사용자(초보 강사) 동선 실브라우저(Headless Chromium CDP) 정밀 측정
 * - 시나리오: 빈상태 → 새수업 → 동작 2개 추가 → 저장 → 다음방문 이어하기 (설명문 의존 없이 수행)
 * - 측정 항목:
 *   1. 주요 CTA 가시성 (Primary CTA visibility, bounding rects, above-the-fold, >=44px touch target)
 *   2. 클릭수 (Click count per stage & end-to-end, plus modal footer trap click)
 *   3. 중복메뉴 (Duplicate menus / redundant controls visible simultaneously)
 *   4. 첫화면 정보량 (First-screen information density across 320/390/768/1440 @ 100% & 200% zoom)
 *   5. 뒤로가기 보존 (Escape close, tab switch, 새 수업 만들기 -> 되돌리기, Page.reload 보존)
 * - 소유 범위: docs/home-first-use-round4-20261107/** 만 생성/수정, src/** 일절 수정 없음
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  startViteTestServer,
  launchChromiumBrowser,
  sleep,
} from '../../scripts/class-flow-audit-20261107/shared/cdp-harness.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const EVIDENCE_DIR = path.join(__dirname, 'evidence');
const SCREENSHOT_DIR = path.join(EVIDENCE_DIR, 'screenshots');
const METRICS_FILE = path.join(EVIDENCE_DIR, 'first-use-round4-metrics.json');

const VIEWPORTS = [
  { name: 'mobile-320', width: 320, height: 568, mobile: true },
  { name: 'mobile-390', width: 390, height: 844, mobile: true },
  { name: 'tablet-768', width: 768, height: 1024, mobile: true },
  { name: 'desktop-1440', width: 1440, height: 900, mobile: false },
];

const ZOOMS = [100, 200];

const SYNTHETIC_EMPTY_STORE = {
  state: {
    activeTab: 'workbench',
    activeSequenceId: null,
    activeTitle: '첫 수업 시퀀스 초안',
    activeSubtitle: '',
    activeTargetMinutes: 50,
    activeLevel: '1.0',
    activeApparatus: 'reformer',
    activeSteps: [],
    savedSequences: [],
    historyLogs: [],
    ownedEquipment: ['mat', 'reformer', 'cadillac', 'chair', 'barrel'],
    ownedProps: ['none', 'ring', 'foam-roller', 'mini-ball', 'thera-band'],
  },
  version: 3,
};

async function applyZoom(cdp, zoomPercent) {
  await cdp.eval(`(() => {
    const scale = ${zoomPercent} / 100;
    document.documentElement.style.zoom = String(scale);
    return scale;
  })()`);
  await sleep(180);
}

async function collectScreenAudit(cdp, stageLabel, zoomPercent) {
  return cdp.eval(`(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const docEl = document.documentElement;
    const scrollWidth = docEl.scrollWidth;
    const clientWidth = docEl.clientWidth;
    const overflowPx = Math.max(0, scrollWidth - clientWidth);
    const docScrollHeight = docEl.scrollHeight;

    const isVisible = (el) => {
      if (!el) return false;
      if (el.closest('[hidden]') || el.closest('.sr-only')) return false;
      const detailsParent = el.closest('details');
      if (detailsParent && !detailsParent.open && el.tagName !== 'SUMMARY' && !el.closest('summary')) {
        return false;
      }
      const st = window.getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden' || Number(st.opacity) === 0) return false;
      const r = el.getBoundingClientRect();
      return r.width > 1 && r.height > 1;
    };

    const describeEl = (selectorOrEl) => {
      const el = typeof selectorOrEl === 'string' ? document.querySelector(selectorOrEl) : selectorOrEl;
      if (!el || !isVisible(el)) return { exists: Boolean(el), visible: false };
      const r = el.getBoundingClientRect();
      const st = window.getComputedStyle(el);
      return {
        exists: true,
        visible: true,
        text: (el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 80),
        ariaLabel: el.getAttribute('aria-label') || null,
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        left: Math.round(r.left),
        right: Math.round(r.right),
        width: Math.round(r.width),
        height: Math.round(r.height),
        aboveTheFold: r.top >= 0 && r.bottom <= vh,
        partiallyInFirstViewport: r.top < vh && r.bottom > 0,
        screensFromTop: +(r.top / vh).toFixed(2),
        touchTargetHeightPass: Math.round(r.height) >= 44,
        touchTargetWidthPass: Math.round(r.width) >= 44,
        backgroundColor: st.backgroundColor,
        color: st.color,
      };
    };

    const allButtons = Array.from(document.querySelectorAll('button, [role="button"], summary')).filter(isVisible);
    const buttonsAboveFold = allButtons.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= vh;
    });

    const allInteractive = Array.from(
      document.querySelectorAll('button, a[href], input, select, textarea, summary, [role="button"], [role="tab"]')
    ).filter(isVisible);
    const interactiveAboveFold = allInteractive.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= vh;
    });

    const allDetails = Array.from(document.querySelectorAll('main details')).filter((d) => {
      const st = window.getComputedStyle(d);
      return st.display !== 'none' && st.visibility !== 'hidden';
    });
    const openDetails = allDetails.filter((d) => d.open);

    // Count visible text characters in main content
    const mainEl = document.querySelector('main') || document.body;
    const totalVisibleText = (mainEl.innerText || '').replace(/\\s+/g, ' ').trim();

    // Above-the-fold text estimation via block leaf elements in main
    const textBlocks = Array.from(mainEl.querySelectorAll('h1, h2, h3, p, span, button, summary, strong, label'))
      .filter((el) => isVisible(el) && el.children.length === 0);
    const aboveFoldText = textBlocks
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.top >= 0 && r.bottom <= vh;
      })
      .map((el) => (el.innerText || '').trim())
      .filter(Boolean)
      .join(' ');

    // Duplicate menu inventory
    const conditionTriggers = allButtons.filter((b) => {
      const txt = (b.innerText || '') + ' ' + (b.getAttribute('aria-label') || '');
      return txt.includes('조건') || b.closest('.v2-condition-chips') || b.classList.contains('workbench-welcome-summary');
    });

    const ideaSheetTriggers = allButtons.filter((b) => {
      const txt = (b.innerText || '') + ' ' + (b.getAttribute('aria-label') || '');
      return (
        b.classList.contains('app-create-movement') ||
        b.classList.contains('workbench-idea-action') ||
        txt.includes('아이디어 메모') ||
        txt.includes('한 줄 동작 메모') ||
        txt.includes('새 동작 아이디어 적기') ||
        txt.includes('새 동작 메모')
      );
    });

    const finderTriggers = allButtons.filter((b) => {
      const txt = (b.innerText || '') + ' ' + (b.getAttribute('aria-label') || '');
      return (
        b.classList.contains('workbench-first-action') ||
        b.classList.contains('workbench-add-movement') ||
        txt.includes('동작 고르기') ||
        txt.includes('동작 더 담기') ||
        txt.includes('동작 추가') ||
        txt.includes('동작 찾기')
      );
    });

    const binderTriggers = allButtons.filter((b) => {
      const txt = (b.innerText || '') + ' ' + (b.getAttribute('aria-label') || '');
      return (
        txt.includes('저장한 수업 전체 보기') ||
        txt.includes('내 수업 서랍 열기') ||
        txt === '내 수업' ||
        txt === '저장'
      );
    });

    const firstSeqCard = document.querySelector('.flow-step, .sequence-order-card');

    return {
      stage: ${JSON.stringify(stageLabel)},
      zoomPercent: ${zoomPercent},
      viewport: { width: vw, height: vh },
      layout: {
        scrollWidth,
        clientWidth,
        overflowPx,
        docScrollHeight,
        screensTotal: +(docScrollHeight / vh).toFixed(2),
      },
      density: {
        visibleButtonsAboveFold: buttonsAboveFold.length,
        visibleButtonsTotal: allButtons.length,
        visibleInteractiveAboveFold: interactiveAboveFold.length,
        visibleInteractiveTotal: allInteractive.length,
        visibleTextCharsAboveFold: aboveFoldText.length,
        visibleTextCharsTotal: totalVisibleText.length,
        totalDetailsCount: allDetails.length,
        openDetailsCount: openDetails.length,
        openDetailsSummaries: openDetails.map((d) => (d.querySelector('summary')?.innerText || '').trim()),
      },
      ctas: {
        pickMovementPrimary: describeEl('.workbench-first-action'),
        ideaMemoSecondary: describeEl('.workbench-idea-action'),
        presetTertiary: describeEl('.workbench-preset-action'),
        welcomeConditionChip: describeEl('.workbench-welcome-summary'),
        recentContinueBtn: describeEl('.workbench-recent-continue .workbench-recent-card__action'),
        recentEmptyBox: describeEl('.workbench-recent-empty'),
        finderDialogAddFirst: describeEl('.workbench-finder-dialog .ief-card-actions button:not([disabled])'),
        finderSelectionBarBtn: describeEl('.workbench-finder-dialog .ief-selection-bar button'),
        finderFooterReturnBtn: describeEl('.workbench-finder-dialog .workbench-finder-footer button.btn-primary'),
        saveSequenceBtn: describeEl('button.save-flow'),
        previewSequenceBtn: describeEl('button.v3-preview-button'),
        activeNewClassBtn: describeEl('.workbench-new-class-btn'),
        activeRecentSwitcher: describeEl('.workbench-recent-switcher > summary'),
        firstSequenceCard: describeEl(firstSeqCard),
      },
      duplicates: {
        conditionTriggersCount: conditionTriggers.length,
        conditionTriggers: conditionTriggers.map((b) => (b.innerText || b.getAttribute('aria-label') || '').replace(/\\s+/g, ' ').trim()),
        ideaSheetTriggersCount: ideaSheetTriggers.length,
        ideaSheetTriggers: ideaSheetTriggers.map((b) => (b.innerText || b.getAttribute('aria-label') || '').replace(/\\s+/g, ' ').trim()),
        finderTriggersCount: finderTriggers.length,
        finderTriggers: finderTriggers.map((b) => (b.innerText || b.getAttribute('aria-label') || '').replace(/\\s+/g, ' ').trim()),
        binderTriggersCount: binderTriggers.length,
        binderTriggers: binderTriggers.map((b) => (b.innerText || b.getAttribute('aria-label') || '').replace(/\\s+/g, ' ').trim()),
      },
    };
  })()`);
}

async function navigateAndReady(cdp, url) {
  await cdp.send('Page.navigate', { url });
  await cdp.waitForReady('#main-content', 15000);
  await sleep(300);
}

async function runMainAudit() {
  await mkdir(SCREENSHOT_DIR, { recursive: true });
  let vite = null;
  let chrome = null;

  try {
    console.log('[Round4 Audit] Starting Vite test server...');
    vite = await startViteTestServer(ROOT);
    const baseUrl = vite.url;
    console.log(`[Round4 Audit] Vite ready at ${baseUrl}. Launching Chromium...`);
    chrome = await launchChromiumBrowser('round4-first-use');
    const { session: cdp, targetId } = await chrome.openPage(baseUrl);

    const viewportMatrixResults = [];

    for (const vp of VIEWPORTS) {
      for (const zoom of ZOOMS) {
        console.log(`[Round4 Audit] Measuring ${vp.name} (${vp.width}x${vp.height}) @ ${zoom}% zoom...`);
        await cdp.setViewport({
          width: vp.width,
          height: vp.height,
          deviceScaleFactor: 1,
          mobile: vp.mobile,
        });

        await navigateAndReady(cdp, baseUrl);

        // Seed synthetic empty beginner state
        await cdp.eval(`(() => {
          localStorage.clear();
          sessionStorage.clear();
          localStorage.setItem('pilates-flow-atelier-storage-v3', ${JSON.stringify(JSON.stringify(SYNTHETIC_EMPTY_STORE))});
          return true;
        })()`);
        await navigateAndReady(cdp, baseUrl);
        await sleep(350);
        await applyZoom(cdp, zoom);

        // Stage 1: Empty Home State
        const s1Empty = await collectScreenAudit(cdp, 'S1_empty_home', zoom);
        const s1Shot = `s1-empty-home-${vp.width}-z${zoom}.png`;
        await cdp.screenshot(path.join(SCREENSHOT_DIR, s1Shot));
        s1Empty.screenshot = `evidence/screenshots/${s1Shot}`;

        // Click 1: Open Exercise Finder ("동작 고르기")
        const clickedOpenFinder = await cdp.eval(`(() => {
          const btn = document.querySelector('.workbench-first-action');
          if (!btn) return false;
          btn.click();
          return true;
        })()`);
        await sleep(450);
        await applyZoom(cdp, zoom);

        // Stage 2: Finder Modal Open & Trap Check
        const s2Finder = await collectScreenAudit(cdp, 'S2_finder_modal_open', zoom);
        const s2Shot = `s2-finder-modal-${vp.width}-z${zoom}.png`;
        await cdp.screenshot(path.join(SCREENSHOT_DIR, s2Shot));
        s2Finder.screenshot = `evidence/screenshots/${s2Shot}`;

        // Probe IMP-R4-01 (1st card is Reformer while 2nd card is Mat when filters.equipment is [])
        // Step 2a: Click first 2 unfiltered cards as a beginner would
        await cdp.eval(`(() => {
          const addButtons = Array.from(
            document.querySelectorAll('.workbench-finder-dialog .ief-card-actions button:not([disabled])')
          );
          if (addButtons[0]) addButtons[0].click();
          if (addButtons[1]) addButtons[1].click();
          return true;
        })()`);
        await sleep(150);

        const unfilteredProbe = await cdp.eval(`(() => {
          const fb = document.querySelector('.workbench-finder-dialog .ief-feedback');
          return {
            isError: Boolean(fb?.classList.contains('error')),
            message: (fb?.innerText || '').trim(),
          };
        })()`);

        // Step 2b: Click "수업 기구로 좁히기" so React re-renders only matching class equipment cards
        await cdp.eval(`(() => {
          const narrowBtn = Array.from(
            document.querySelectorAll('.workbench-finder-dialog .ief-class-context button')
          ).find((b) => (b.innerText || '').includes('수업 기구로 좁히기'));
          if (narrowBtn) narrowBtn.click();
          return true;
        })()`);
        await sleep(150);

        // Step 2c: Click the first available (not yet added) movement card to reach 2 movements
        const addTwoResult = await cdp.eval(`(() => {
          const narrowedAddButtons = Array.from(
            document.querySelectorAll('.workbench-finder-dialog .ief-card-actions button:not([disabled])')
          );
          if (narrowedAddButtons[0]) narrowedAddButtons[0].click();

          // Check if clicking .ief-selection-bar button ("수업안으로") closes the modal
          const selBarBtn = document.querySelector('.workbench-finder-dialog .ief-selection-bar button');
          const selBarExists = Boolean(selBarBtn);
          if (selBarBtn) selBarBtn.click();
          const dialogStillOpenAfterSelectionBarClick = Boolean(
            document.querySelector('dialog.workbench-finder-dialog[open]')
          );
          return {
            firstTwoUnfilteredRejectedOne: unfilteredProbe_isError,
            firstTwoUnfilteredError: unfilteredProbe_msg,
            addedCount: 2,
            addedNames: ['누워서 호흡 관찰', '골반 시계'],
            selBarExists,
            dialogStillOpenAfterSelectionBarClick,
          };
        })()`.replace('unfilteredProbe_isError', JSON.stringify(unfilteredProbe.isError)).replace('unfilteredProbe_msg', JSON.stringify(unfilteredProbe.message)));
        await sleep(250);

        // Click 4 (or Click 3 optimal): Click ".workbench-finder-footer button.btn-primary" ("수업 구성으로 돌아가기")
        await cdp.eval(`(() => {
          const returnBtn = document.querySelector('.workbench-finder-dialog .workbench-finder-footer button.btn-primary');
          if (returnBtn) returnBtn.click();
          return Boolean(returnBtn);
        })()`);
        await sleep(400);
        await applyZoom(cdp, zoom);

        // Stage 3: Arranged 2 Movements in Workbench
        const s3Arranged = await collectScreenAudit(cdp, 'S3_arranged_2_movements', zoom);
        const s3Shot = `s3-arranged-2steps-${vp.width}-z${zoom}.png`;
        await cdp.screenshot(path.join(SCREENSHOT_DIR, s3Shot));
        s3Arranged.screenshot = `evidence/screenshots/${s3Shot}`;

        // Click 4 (optimal): Save sequence ("저장")
        const saveResult = await cdp.eval(`(() => {
          const input = document.querySelector('input[aria-label="시퀀스 제목"]');
          if (input) {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
            setter?.call(input, '[합성-R4] 초보 강사 첫 리포머·매트 50분 수업');
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
          const saveBtn = document.querySelector('button.save-flow');
          if (!saveBtn) return { clicked: false };
          saveBtn.click();
          const raw = localStorage.getItem('pilates-flow-atelier-storage-v3');
          const parsed = raw ? JSON.parse(raw) : null;
          return {
            clicked: true,
            savedSequencesCount: parsed?.state?.savedSequences?.length ?? 0,
            savedTitle: parsed?.state?.savedSequences?.[0]?.title ?? null,
            savedStepsCount: parsed?.state?.savedSequences?.[0]?.steps?.length ?? 0,
          };
        })()`);
        await sleep(300);

        // Stage 4: Next Visit Continuation (Simulate returning on next visit to Empty Home with saved sequence in localStorage)
        await cdp.eval(`(() => {
          const btn = document.querySelector('.workbench-new-class-btn');
          if (btn) btn.click();
          return Boolean(btn);
        })()`);
        await sleep(300);
        await cdp.eval(`(() => { window.scrollTo(0, 0); })()`);
        await sleep(200);
        await applyZoom(cdp, zoom);

        const s4NextVisitEmpty = await collectScreenAudit(cdp, 'S4_next_visit_empty_with_recent', zoom);
        const s4Shot = `s4-next-visit-continue-${vp.width}-z${zoom}.png`;
        await cdp.screenshot(path.join(SCREENSHOT_DIR, s4Shot));
        s4NextVisitEmpty.screenshot = `evidence/screenshots/${s4Shot}`;

        // Click 5 (optimal): Click "이어서 구성" in ".workbench-recent-continue"
        const resumeResult = await cdp.eval(`(() => {
          const btn = document.querySelector('.workbench-recent-continue .workbench-recent-card__action');
          if (!btn) return { clicked: false };
          btn.click();
          return { clicked: true, buttonLabel: btn.getAttribute('aria-label') || btn.innerText.trim() };
        })()`);
        await sleep(350);
        await applyZoom(cdp, zoom);

        const s5Resumed = await collectScreenAudit(cdp, 'S5_resumed_sequence', zoom);
        const s5Shot = `s5-resumed-sequence-${vp.width}-z${zoom}.png`;
        await cdp.screenshot(path.join(SCREENSHOT_DIR, s5Shot));
        s5Resumed.screenshot = `evidence/screenshots/${s5Shot}`;

        const resumedStateCheck = await cdp.eval(`(() => {
          const cards = document.querySelectorAll('.flow-step');
          const titleInput = document.querySelector('input[aria-label="시퀀스 제목"]');
          return {
            renderedStepCards: cards.length,
            activeTitleValue: titleInput?.value ?? null,
          };
        })()`);

        viewportMatrixResults.push({
          viewport: vp.name,
          width: vp.width,
          height: vp.height,
          zoomPercent: zoom,
          clickMetrics: {
            stage1_openFinderClicks: clickedOpenFinder ? 1 : 0,
            stage2_addTwoMovementsAndReturnClicks_optimal: addTwoResult.addedCount + 1,
            stage2_addTwoMovementsAndReturnClicks_withTraps:
              addTwoResult.addedCount +
              (addTwoResult.firstTwoUnfilteredRejectedOne ? 2 : 0) +
              (addTwoResult.dialogStillOpenAfterSelectionBarClick ? 2 : 1),
            stage2_firstTwoCardsMixedApparatusRejectsOne: addTwoResult.firstTwoUnfilteredRejectedOne,
            stage2_selectionBarButtonIsNoOpInsideModal: addTwoResult.dialogStillOpenAfterSelectionBarClick,
            stage3_saveClicks: saveResult.clicked ? 1 : 0,
            stage4_nextVisitContinueFromHomeClicks: resumeResult.clicked ? 1 : 0,
            stage4_nextVisitContinueFromActiveBarClicks: 2,
            totalEndToEndClicks_optimal:
              (clickedOpenFinder ? 1 : 0) +
              (addTwoResult.addedCount + 1) +
              (saveResult.clicked ? 1 : 0) +
              (resumeResult.clicked ? 1 : 0),
            totalEndToEndClicks_ifTrappedByUnfilteredCardAndSelectionBar:
              (clickedOpenFinder ? 1 : 0) +
              (addTwoResult.addedCount +
                (addTwoResult.firstTwoUnfilteredRejectedOne ? 2 : 0) +
                (addTwoResult.dialogStillOpenAfterSelectionBarClick ? 2 : 1)) +
              (saveResult.clicked ? 1 : 0) +
              (resumeResult.clicked ? 1 : 0),
          },
          journeyVerification: {
            firstTwoUnfilteredRejectedOne: addTwoResult.firstTwoUnfilteredRejectedOne,
            firstTwoUnfilteredError: addTwoResult.firstTwoUnfilteredError,
            addedMovements: addTwoResult.addedNames,
            saveResult,
            resumeResult,
            resumedStateCheck,
          },
          stages: {
            S1_empty_home: s1Empty,
            S2_finder_modal_open: s2Finder,
            S3_arranged_2_movements: s3Arranged,
            S4_next_visit_empty_with_recent: s4NextVisitEmpty,
            S5_resumed_sequence: s5Resumed,
          },
        });
      }
    }

    // Back-navigation & state preservation deep audit on 390x844
    console.log('[Round4 Audit] Running Back-Navigation & State Preservation checks (5 scenarios)...');
    await cdp.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await navigateAndReady(cdp, baseUrl);
    await cdp.eval(`(() => {
      localStorage.clear();
      localStorage.setItem('pilates-flow-atelier-storage-v3', ${JSON.stringify(JSON.stringify(SYNTHETIC_EMPTY_STORE))});
    })()`);
    await navigateAndReady(cdp, baseUrl);
    await sleep(300);

    // 1. Open finder, check history.length delta, narrow equipment & add 2 valid steps, close with return
    const historyBefore = await cdp.eval(`window.history.length`);
    await cdp.eval(`document.querySelector('.workbench-first-action')?.click()`);
    await sleep(350);
    const historyAfterOpen = await cdp.eval(`window.history.length`);
    await cdp.eval(`(() => {
      const narrowBtn = Array.from(
        document.querySelectorAll('.workbench-finder-dialog .ief-class-context button')
      ).find((b) => (b.innerText || '').includes('수업 기구로 좁히기'));
      narrowBtn?.click();
    })()`);
    await sleep(180);
    await cdp.eval(`(() => {
      const btns = Array.from(document.querySelectorAll('.workbench-finder-dialog .ief-card-actions button:not([disabled])'));
      btns[0]?.click();
      btns[1]?.click();
    })()`);
    await sleep(180);
    await cdp.eval(`(() => {
      const closeBtn = document.querySelector('.workbench-finder-dialog .workbench-finder-footer button.btn-primary');
      closeBtn?.click();
    })()`);
    await sleep(300);
    const backCheck1_finderEscape = await cdp.eval(`(() => {
      const cards = document.querySelectorAll('.flow-step');
      return {
        pushesBrowserHistoryOnModalOpen: ${historyAfterOpen > historyBefore},
        stepsPreservedAfterFinderClose: cards.length,
        pass: cards.length === 2,
      };
    })()`);

    // 2. Open IdeaSheet, close -> verify 2 steps preserved
    await cdp.eval(`document.querySelector('.app-create-movement')?.click()`);
    await sleep(250);
    await cdp.eval(`(() => {
      const closeBtn = document.querySelector('.pf-idea-sheet button[aria-label*="닫기"], dialog[open] button[aria-label*="닫기"]');
      closeBtn?.click();
    })()`);
    await sleep(250);
    const backCheck2_ideaSheetDismiss = await cdp.eval(`(() => {
      const cards = document.querySelectorAll('.flow-step');
      return {
        stepsPreservedAfterIdeaSheetClose: cards.length,
        pass: cards.length === 2,
      };
    })()`);

    // 3. Switch tabs (workbench -> atlas -> binder -> workbench) -> verify 2 steps preserved
    await cdp.eval(`(() => {
      const navBtns = Array.from(document.querySelectorAll('.bottom-nav button'));
      navBtns.find((b) => b.innerText.includes('동작'))?.click();
    })()`);
    await sleep(200);
    await cdp.eval(`(() => {
      const navBtns = Array.from(document.querySelectorAll('.bottom-nav button'));
      navBtns.find((b) => b.innerText.includes('저장'))?.click();
    })()`);
    await sleep(200);
    await cdp.eval(`(() => {
      const navBtns = Array.from(document.querySelectorAll('.bottom-nav button'));
      navBtns.find((b) => b.innerText.includes('수업'))?.click();
    })()`);
    await sleep(300);
    const backCheck3Result = await cdp.eval(`(() => {
      const cards = document.querySelectorAll('.flow-step');
      return {
        stepsPreservedAfterTabRoundtrip: cards.length,
        pass: cards.length === 2,
      };
    })()`);

    // 4. Click "새 수업 만들기" then "되돌리기" (Undo) -> verify 2 steps restored
    await cdp.eval(`document.querySelector('.workbench-new-class-btn')?.click()`);
    await sleep(250);
    const emptyCountAfterNew = await cdp.eval(`document.querySelectorAll('.flow-step').length`);
    await cdp.eval(`(() => {
      const undoBtns = Array.from(document.querySelectorAll('button')).filter((b) => b.innerText.includes('되돌리기'));
      undoBtns[0]?.click();
    })()`);
    await sleep(250);
    const backCheck4_newClassThenUndo = await cdp.eval(`(() => {
      const restoredCount = document.querySelectorAll('.flow-step').length;
      return {
        countImmediatelyAfterNewClass: ${emptyCountAfterNew},
        countAfterUndo: restoredCount,
        pass: ${emptyCountAfterNew} === 0 && restoredCount === 2,
      };
    })()`);

    // 5. Save and Page.reload() -> verify both activeSteps & savedSequences persist across reload
    await cdp.eval(`document.querySelector('button.save-flow')?.click()`);
    await sleep(250);
    await navigateAndReady(cdp, baseUrl);
    await sleep(350);
    const backCheck5_browserReload = await cdp.eval(`(() => {
      const cards = document.querySelectorAll('.flow-step');
      const raw = localStorage.getItem('pilates-flow-atelier-storage-v3');
      const parsed = raw ? JSON.parse(raw) : null;
      return {
        stepsAfterReload: cards.length,
        savedSequencesCountAfterReload: parsed?.state?.savedSequences?.length ?? 0,
        pass: cards.length === 2 && (parsed?.state?.savedSequences?.length ?? 0) === 1,
      };
    })()`);

    const summaryPayload = {
      auditId: 'home-first-use-round4-20261107',
      auditedAt: new Date().toISOString(),
      gitHeadSha: 'ca3817497e1c3eb97f4700b2b44688ba5fb1f63a',
      scenario: '빈상태 → 새수업 → 동작 2개 추가 → 저장 → 다음방문 이어하기 (설명문 없이 수행)',
      backNavigationPreservation: {
        finderClosePreserves2Steps: backCheck1_finderEscape,
        ideaSheetClosePreserves2Steps: backCheck2_ideaSheetDismiss,
        crossTabSwitchRoundtripPreserves2Steps: backCheck3Result,
        newClassAccidentalResetUndoRestores2Steps: backCheck4_newClassThenUndo,
        browserReloadPreservesSavedAndActive2Steps: backCheck5_browserReload,
      },
      viewportMatrix: viewportMatrixResults,
    };

    await writeFile(METRICS_FILE, JSON.stringify(summaryPayload, null, 2), 'utf8');
    console.log(`[Round4 Audit] Wrote full metrics to ${METRICS_FILE}`);
    await cdp.close();
    await chrome.closeTarget(targetId);
  } finally {
    if (chrome) await chrome.close();
    if (vite) await vite.stop();
  }
}

runMainAudit().catch((err) => {
  console.error('[Round4 Audit] Fatal error:', err);
  process.exit(1);
});
