#!/usr/bin/env node
/**
 * Round 5 독립 감사: 필라테스 신규 강사 6단계 첫 사용 동선 실브라우저(Headless Chromium CDP) 검증
 * - 시나리오: 첫 진입 → 기구 선택 → 동작 2개 추가 → 순서 변경 → 저장 → 재방문 이어하기
 * - 측정 항목:
 *   1. 클릭 수 (Click count per stage & end-to-end optimal vs unassisted trap)
 *   2. 첫 행동 Y (First primary action Y coordinate & screensFromTop across 320/390/768/1440 @ 100% & 200%)
 *   3. 중복 안내 (Duplicate notices & redundant controls visible simultaneously)
 *   4. 막힌 동선 (Blocked / no-op flows: unfiltered equipment rejection, .ief-selection-bar no-op, condition modal auto-generate vs manual pick)
 * - 소유 범위: docs/home-first-use-round5-20261107/** 만 소유, src/** 수정 0건
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
const METRICS_FILE = path.join(EVIDENCE_DIR, 'first-use-round5-metrics.json');

const VIEWPORTS = [
  { label: '320', name: 'mobile-320', width: 320, height: 568, mobile: true },
  { label: '390', name: 'mobile-390', width: 390, height: 844, mobile: true },
  { label: '768', name: 'tablet-768', width: 768, height: 1024, mobile: true },
  { label: '1440', name: 'desktop-1440', width: 1440, height: 900, mobile: false },
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
    activeApparatus: 'mat',
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

async function navigateAndReady(cdp, url) {
  await cdp.send('Page.navigate', { url });
  await cdp.waitForReady('#main-content', 15000);
  await sleep(300);
}

async function runRound5Audit() {
  await mkdir(SCREENSHOT_DIR, { recursive: true });
  let vite = null;
  let chrome = null;

  try {
    vite = await startViteTestServer(ROOT);
    const baseUrl = vite.url;
    chrome = await launchChromiumBrowser('round5-first-use');
    const { session: cdp } = await chrome.openPage(baseUrl);

    const matrixResults = [];

    for (const vp of VIEWPORTS) {
      for (const zoom of ZOOMS) {
        const zoomTag = `z${zoom}`;
        await cdp.setViewport({
          width: vp.width,
          height: vp.height,
          deviceScaleFactor: 1,
          mobile: vp.mobile,
        });

        await navigateAndReady(cdp, baseUrl);
        await cdp.eval(`(() => {
          localStorage.clear();
          sessionStorage.clear();
          localStorage.setItem('pilates-flow-atelier-storage-v3', ${JSON.stringify(JSON.stringify(SYNTHETIC_EMPTY_STORE))});
          return true;
        })()`);
        await navigateAndReady(cdp, baseUrl);
        await sleep(350);
        await applyZoom(cdp, zoom);

        // STAGE 1: 첫 진입 (First Entry - Empty Home)
        const stage1 = await cdp.eval(`(() => {
          const vh = window.innerHeight;
          const rectOf = (sel) => {
            const el = document.querySelector(sel);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return {
              top: Math.round(r.top),
              bottom: Math.round(r.bottom),
              width: Math.round(r.width),
              height: Math.round(r.height),
              inFirstScreen: r.top >= 0 && r.bottom <= vh,
              screensFromTop: Number((r.top / vh).toFixed(2)),
            };
          };
          const conditionBtns = Array.from(document.querySelectorAll('button')).filter((b) => {
            const label = (b.getAttribute('aria-label') || '') + ' ' + (b.innerText || '');
            return label.includes('조건') || b.closest('.v2-condition-chips') || b.classList.contains('workbench-welcome-summary');
          });
          const openDetails = Array.from(document.querySelectorAll('main details[open]')).length;
          const totalDetails = Array.from(document.querySelectorAll('main details')).length;
          return {
            overflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
            pickMovementPrimary: rectOf('.workbench-first-action'),
            welcomeConditionSummary: rectOf('.workbench-welcome-summary'),
            planToolbarRect: rectOf('.v2-plan-toolbar'),
            conditionTriggerCount: conditionBtns.length,
            conditionTriggerLabels: conditionBtns.map((b) => (b.innerText || b.getAttribute('aria-label') || '').replace(/\\s+/g, ' ').trim()),
            openDetailsCount: openDetails,
            totalDetailsCount: totalDetails,
          };
        })()`);
        await cdp.screenshot(path.join(SCREENSHOT_DIR, `r5-s1-first-entry-${vp.label}-${zoomTag}.png`));

        // STAGE 2: 기구 선택 (Click .workbench-welcome-summary -> Open 수업 조건 -> Select 리포머 only)
        await cdp.eval(`(() => {
          const summaryBtn = document.querySelector('.workbench-welcome-summary');
          if (summaryBtn) summaryBtn.click();
          return Boolean(summaryBtn);
        })()`);
        await sleep(350);
        await applyZoom(cdp, zoom);

        await cdp.eval(`(() => {
          const dialog = Array.from(document.querySelectorAll('dialog[open]')).find((d) =>
            (d.innerText || '').includes('이번 수업에 사용할 기구')
          );
          const labels = Array.from(dialog?.querySelectorAll('.inventory-options label') || []);
          const reformerInput = labels.find((l) => (l.innerText || '').includes('리포머'))?.querySelector('input[type="checkbox"]');
          const matInput = labels.find((l) => (l.innerText || '').includes('매트'))?.querySelector('input[type="checkbox"]');
          if (reformerInput && !reformerInput.checked) reformerInput.click();
          if (matInput && matInput.checked) matInput.click();
          return true;
        })()`);
        await sleep(200);

        const stage2 = await cdp.eval(`(() => {
          const vh = window.innerHeight;
          const dialog = Array.from(document.querySelectorAll('dialog[open]')).find((d) =>
            (d.innerText || '').includes('이번 수업에 사용할 기구')
          );
          const labels = Array.from(dialog?.querySelectorAll('.inventory-options label') || []);
          const reformerLabel = labels.find((l) => (l.innerText || '').includes('리포머'));
          const matLabel = labels.find((l) => (l.innerText || '').includes('매트'));
          const reformerInput = reformerLabel?.querySelector('input[type="checkbox"]');
          const matInput = matLabel?.querySelector('input[type="checkbox"]');
          const eqFieldset = reformerLabel?.closest('fieldset');
          const eqRect = eqFieldset?.getBoundingClientRect();
          const generateBtn = dialog?.querySelector('.generate-button');
          const closeBtn = dialog?.querySelector('.v2-conditions-actions button');
          const rGen = generateBtn?.getBoundingClientRect();
          const rClose = closeBtn?.getBoundingClientRect();
          const hasDirectManualPickCtaInModal = Array.from(dialog?.querySelectorAll('button') || []).some(
            (b) => (b.innerText || '').includes('동작 고르기')
          );
          return {
            dialogOpened: Boolean(dialog),
            reformerChecked: Boolean(reformerInput?.checked),
            matChecked: Boolean(matInput?.checked),
            equipmentFieldsetY: eqRect ? Math.round(eqRect.top) : null,
            equipmentFieldsetScreensFromTop: eqRect ? Number((eqRect.top / vh).toFixed(2)) : null,
            generateAutoCtaY: rGen ? Math.round(rGen.top) : null,
            closeManualBtnY: rClose ? Math.round(rClose.top) : null,
            hasDirectManualPickCtaInModal,
            overflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
          };
        })()`);
        await cdp.screenshot(path.join(SCREENSHOT_DIR, `r5-s2-equipment-select-${vp.label}-${zoomTag}.png`));

        // Close conditions modal (1 click) and open Exercise Finder (1 click)
        await cdp.eval(`(() => {
          const dialog = Array.from(document.querySelectorAll('dialog[open]')).find((d) =>
            (d.innerText || '').includes('이번 수업에 사용할 기구')
          );
          const closeBtn = dialog?.querySelector('.v2-conditions-actions button');
          if (closeBtn) closeBtn.click();
          return true;
        })()`);
        await sleep(250);

        await cdp.eval(`(() => {
          const pickBtn = document.querySelector('.workbench-first-action');
          if (pickBtn) pickBtn.click();
          return true;
        })()`);
        await sleep(400);
        await applyZoom(cdp, zoom);

        // STAGE 3: 동작 2개 추가 (Add 2 Movements in InlineExerciseFinder)
        const stage3BeforeClick = await cdp.eval(`(() => {
          const vh = window.innerHeight;
          const dialog = document.querySelector('dialog.workbench-finder-dialog[open]');
          const narrowBtn = Array.from(dialog?.querySelectorAll('.ief-class-context button') || []).find((b) =>
            (b.innerText || '').includes('수업 기구로 좁히기')
          );
          const addBtns = Array.from(dialog?.querySelectorAll('.ief-card-actions button:not([disabled])') || []);
          const rFirstAdd = addBtns[0]?.getBoundingClientRect();
          return {
            dialogOpened: Boolean(dialog),
            initialHasNarrowButton: Boolean(narrowBtn),
            initialNarrowButtonText: (narrowBtn?.innerText || '').trim(),
            firstAddY: rFirstAdd ? Math.round(rFirstAdd.top) : null,
            firstAddScreensFromTop: rFirstAdd ? Number((rFirstAdd.top / vh).toFixed(2)) : null,
          };
        })()`);

        // Unassisted beginner clicks first 2 visible "+ 추가" buttons (1st is Reformer, 2nd is Mat)
        await cdp.eval(`(() => {
          const addBtns = Array.from(
            document.querySelectorAll('.workbench-finder-dialog .ief-card-actions button:not([disabled])')
          );
          if (addBtns[0]) addBtns[0].click();
          if (addBtns[1]) addBtns[1].click();
          return true;
        })()`);
        await sleep(200);

        const stage3UnfilteredProbe = await cdp.eval(`(() => {
          const dialog = document.querySelector('dialog.workbench-finder-dialog[open]');
          const fb = dialog?.querySelector('.ief-feedback');
          const footerStrong = dialog?.querySelector('.workbench-finder-footer strong');
          return {
            isError: Boolean(fb?.classList.contains('error')),
            errorMessage: (fb?.innerText || '').trim(),
            footerCountAfterUnfilteredTwoClicks: (footerStrong?.innerText || '').trim(),
          };
        })()`);

        // Click "수업 기구로 좁히기" and then add 2nd Reformer movement
        await cdp.eval(`(() => {
          const narrowBtn = Array.from(
            document.querySelectorAll('.workbench-finder-dialog .ief-class-context button')
          ).find((b) => (b.innerText || '').includes('수업 기구로 좁히기'));
          if (narrowBtn) narrowBtn.click();
          return Boolean(narrowBtn);
        })()`);
        await sleep(200);

        await cdp.eval(`(() => {
          const addBtns = Array.from(
            document.querySelectorAll('.workbench-finder-dialog .ief-card-actions button:not([disabled])')
          );
          const nextCardBtn = addBtns.find((b) => !(b.innerText || '').includes('한 번 더')) || addBtns[1];
          if (nextCardBtn) nextCardBtn.click();
          return true;
        })()`);
        await sleep(200);

        // Probe duplicate return bars (.ief-selection-bar vs .workbench-finder-footer) & inner button no-op
        const stage3ReturnProbe = await cdp.eval(`(() => {
          const dialog = document.querySelector('dialog.workbench-finder-dialog[open]');
          const innerSelectionBar = dialog?.querySelector('.ief-selection-bar');
          const outerFooterBar = dialog?.querySelector('.workbench-finder-footer');
          const duplicateReturnBarsCount = (innerSelectionBar ? 1 : 0) + (outerFooterBar ? 1 : 0);
          const innerReturnBtn = innerSelectionBar?.querySelector('button');
          if (innerReturnBtn) innerReturnBtn.click();
          const closedByInnerSelectionBar = !document.querySelector('dialog.workbench-finder-dialog[open]');
          const footerPosition = outerFooterBar ? window.getComputedStyle(outerFooterBar).position : '';
          const outerReturnBtn = outerFooterBar?.querySelector('button.btn-primary');
          const rOuter = outerReturnBtn?.getBoundingClientRect();
          return {
            duplicateReturnBarsCount,
            closedByInnerSelectionBar,
            footerPosition,
            outerReturnY: rOuter ? Math.round(rOuter.top) : null,
            overflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
          };
        })()`);
        await cdp.screenshot(path.join(SCREENSHOT_DIR, `r5-s3-after-add2-${vp.label}-${zoomTag}.png`));

        // Close Finder via outer footer button ("수업 구성으로 돌아가기")
        await cdp.eval(`(() => {
          const outerReturnBtn = document.querySelector('.workbench-finder-dialog .workbench-finder-footer button.btn-primary');
          if (outerReturnBtn) outerReturnBtn.click();
          return Boolean(outerReturnBtn);
        })()`);
        await sleep(350);
        await applyZoom(cdp, zoom);

        const closedByOuterFooter = await cdp.eval(`(() => !document.querySelector('dialog.workbench-finder-dialog[open]'))()`);

        // STAGE 4: 순서 변경 (Reorder 2nd movement up to 1st position)
        const stage4Before = await cdp.eval(`(() => {
          window.scrollTo(0, 0);
          const vh = window.innerHeight;
          const cards = Array.from(document.querySelectorAll('.sequence-order-card'));
          const titlesBefore = cards.map((c) => (c.querySelector('.step-title strong')?.innerText || '').trim());
          const rFirstCard = cards[0]?.getBoundingClientRect();
          const moveUpBtn = cards[1]?.querySelector('button[aria-label*="위로 이동"]');
          const rMoveUp = moveUpBtn?.getBoundingClientRect();
          if (moveUpBtn) moveUpBtn.click();
          return {
            titlesBefore,
            firstCardY: rFirstCard ? Math.round(rFirstCard.top) : null,
            firstCardScreensFromTop: rFirstCard ? Number((rFirstCard.top / vh).toFixed(2)) : null,
            moveUpBtnY: rMoveUp ? Math.round(rMoveUp.top) : null,
            moveUpBtnScreensFromTop: rMoveUp ? Number((rMoveUp.top / vh).toFixed(2)) : null,
          };
        })()`);
        await sleep(250);

        const stage4After = await cdp.eval(`(() => {
          const cards = Array.from(document.querySelectorAll('.sequence-order-card'));
          const titlesAfter = cards.map((c) => (c.querySelector('.step-title strong')?.innerText || '').trim());
          const liveFeedback = (document.querySelector('[data-plan-feedback]')?.innerText || '').trim();
          return {
            stepCount: cards.length,
            titlesAfter,
            liveFeedback,
            overflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
          };
        })()`);
        const stage4 = {
          ...stage4Before,
          ...stage4After,
          reorderSucceeded:
            stage4Before.titlesBefore.length === 2 &&
            stage4After.titlesAfter.length === 2 &&
            stage4Before.titlesBefore[0] === stage4After.titlesAfter[1] &&
            stage4Before.titlesBefore[1] === stage4After.titlesAfter[0],
        };
        await cdp.screenshot(path.join(SCREENSHOT_DIR, `r5-s4-reordered-${vp.label}-${zoomTag}.png`));

        // STAGE 5: 저장 (Save Reordered Sequence)
        const stage5Before = await cdp.eval(`(() => {
          window.scrollTo(0, 0);
          const vh = window.innerHeight;
          const input = document.querySelector('input[aria-label="시퀀스 제목"]');
          if (input) {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
            setter?.call(input, '[합성-R5] 신규 강사 리포머 2동작 순서변경 수업안');
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
          const saveBtn = document.querySelector('button.save-flow');
          const rSave = saveBtn?.getBoundingClientRect();
          const saveBtnVariantClass = saveBtn?.className || '';
          if (saveBtn) saveBtn.click();
          return {
            saveBtnY: rSave ? Math.round(rSave.top) : null,
            saveBtnInFirstScreen: rSave ? rSave.top >= 0 && rSave.bottom <= vh : false,
            saveBtnScreensFromTop: rSave ? Number((rSave.top / vh).toFixed(2)) : null,
            saveBtnVariantClass,
          };
        })()`);
        await sleep(250);

        const stage5After = await cdp.eval(`(() => {
          const feedbackText = (document.querySelector('[data-plan-feedback]')?.innerText || '').trim();
          const raw = localStorage.getItem('pilates-flow-atelier-storage-v3');
          const parsed = raw ? JSON.parse(raw) : null;
          return {
            feedbackText,
            savedSequencesCount: parsed?.state?.savedSequences?.length ?? 0,
            savedFirstExerciseId: parsed?.state?.savedSequences?.[0]?.steps?.[0]?.exerciseId ?? null,
            overflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
          };
        })()`);
        const stage5 = { ...stage5Before, ...stage5After };
        await cdp.screenshot(path.join(SCREENSHOT_DIR, `r5-s5-saved-${vp.label}-${zoomTag}.png`));

        // STAGE 6: 재방문 이어하기 (Return to Empty Home -> Measure 이어서 구성 Y -> Click 이어서 구성)
        await cdp.eval(`(() => {
          const btn = document.querySelector('.workbench-new-class-btn');
          if (btn) btn.click();
          return Boolean(btn);
        })()`);
        await sleep(300);
        await cdp.eval(`(() => { window.scrollTo(0, 0); })()`);
        await sleep(200);
        await applyZoom(cdp, zoom);

        const stage6HomeMeasure = await cdp.eval(`(() => {
          const vh = window.innerHeight;
          const continueBtn = document.querySelector('.workbench-recent-continue .workbench-recent-card__action');
          const rCont = continueBtn?.getBoundingClientRect();
          if (continueBtn) continueBtn.click();
          return {
            continueY: rCont ? Math.round(rCont.top) : null,
            continueBottom: rCont ? Math.round(rCont.bottom) : null,
            continueInFirstScreen: rCont ? rCont.top >= 0 && rCont.bottom <= vh : false,
            continueScreensFromTop: rCont ? Number((rCont.top / vh).toFixed(2)) : null,
          };
        })()`);
        await sleep(300);
        await applyZoom(cdp, zoom);

        const stage6Resumed = await cdp.eval(`(() => {
          const cards = Array.from(document.querySelectorAll('.sequence-order-card'));
          const restoredTitles = cards.map((c) => (c.querySelector('.step-title strong')?.innerText || '').trim());
          return {
            restoredStepCount: cards.length,
            restoredTitles,
            overflowPx: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
          };
        })()`);
        const stage6 = {
          ...stage6HomeMeasure,
          ...stage6Resumed,
          reorderedSequencePreservedOnResume:
            stage6Resumed.restoredTitles.length === 2 &&
            stage6Resumed.restoredTitles[0] === stage4.titlesAfter[0] &&
            stage6Resumed.restoredTitles[1] === stage4.titlesAfter[1],
        };
        await cdp.screenshot(path.join(SCREENSHOT_DIR, `r5-s6-resumed-${vp.label}-${zoomTag}.png`));

        const stage3 = {
          ...stage3BeforeClick,
          ...stage3UnfilteredProbe,
          ...stage3ReturnProbe,
          closedByOuterFooter,
          firstTwoUnfilteredRejectedOne:
            stage3UnfilteredProbe.isError &&
            stage3UnfilteredProbe.footerCountAfterUnfilteredTwoClicks === '1개 동작',
        };

        matrixResults.push({
          viewport: `${vp.width}x${vp.height}`,
          zoom: `${zoom}%`,
          clicks: {
            s1FirstEntryOpenConditions: 1,
            s2SelectEquipmentAndProceedToFinder: {
              optimalWithDirectApplyAndPickButton: 2,
              currentWithCloseThenOpenFinder: 3,
            },
            s3AddTwoMovementsAndReturn: {
              optimalWithEquipmentSyncedAndSingleFooter: 3,
              currentUnassistedTrap: 6,
            },
            s4ReorderStepUp: 1,
            s5SaveSequence: 1,
            s6RevisitContinue: 1,
            totalOptimalEndToEnd: 9,
            totalCurrentUnassistedTrap: 13,
          },
          stage1,
          stage2,
          stage3,
          stage4,
          stage5,
          stage6,
        });
      }
    }

    const summary = {
      generatedAt: new Date().toISOString(),
      targetCommit: 'db3d90a1b6692602220146dad4b86472b0d85b1e',
      browser: 'Headless Chromium 156.0.8078.79 (Debian 12)',
      webkitRuntimeStatus: 'UNVERIFIED (No WebKit/Safari binary in Debian 12 sandbox)',
      zeroHorizontalOverflowAll48Screens: matrixResults.every(
        (m) =>
          m.stage1.overflowPx === 0 &&
          m.stage2.overflowPx === 0 &&
          m.stage3.overflowPx === 0 &&
          m.stage4.overflowPx === 0 &&
          m.stage5.overflowPx === 0 &&
          m.stage6.overflowPx === 0,
      ),
      allReordersSucceeded: matrixResults.every((m) => m.stage4.reorderSucceeded),
      allResumesPreservedReorderedSequence: matrixResults.every(
        (m) => m.stage6.reorderedSequencePreservedOnResume,
      ),
      allUnfilteredFirstTwoClicksRejectedOne: matrixResults.every(
        (m) => m.stage3.firstTwoUnfilteredRejectedOne,
      ),
      allInnerSelectionBarsNoOpInModal: matrixResults.every(
        (m) => m.stage3.closedByInnerSelectionBar === false && m.stage3.closedByOuterFooter === true,
      ),
      matrixResults,
    };

    const compactJson = JSON.stringify(summary, null, 2).replace(
      /\{\n(\s+)"(top|optimalWith|s1FirstEntry)[\s\S]*?\n\1\}/g,
      (block) => block.replace(/\s*\n\s*/g, ' '),
    ).replace(
      /\[\n(\s+)"[\s\S]*?\n\1\]/g,
      (block) => block.replace(/\s*\n\s*/g, ' '),
    );
    await writeFile(METRICS_FILE, compactJson + '\n', 'utf8');
    console.log(
      JSON.stringify(
        {
          ok: true,
          combinationsTested: matrixResults.length,
          screenshotsCaptured: matrixResults.length * 6,
          zeroHorizontalOverflowAll48Screens: summary.zeroHorizontalOverflowAll48Screens,
          allReordersSucceeded: summary.allReordersSucceeded,
          allResumesPreservedReorderedSequence: summary.allResumesPreservedReorderedSequence,
          allUnfilteredFirstTwoClicksRejectedOne: summary.allUnfilteredFirstTwoClicksRejectedOne,
          allInnerSelectionBarsNoOpInModal: summary.allInnerSelectionBarsNoOpInModal,
        },
        null,
        2,
      ),
    );
  } finally {
    if (chrome) await chrome.close().catch(() => {});
    if (vite) await vite.stop().catch(() => {});
  }
}

runRound5Audit().catch((err) => {
  console.error(err);
  process.exit(1);
});
