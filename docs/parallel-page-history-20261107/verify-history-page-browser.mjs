#!/usr/bin/env node
/**
 * Real Chromium Browser Verification & Before/After Evidence Harness
 * Target: Pilates Class History Page (`src/components/ClassBinderView.tsx` & `src/styles/teaching.css`)
 * Viewports: 320px, 390px, 768px, 1440px, and 200% Zoom (1440px @ 200% zoom & 390px @ 200% zoom)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  launchChromiumBrowser,
  sleep,
  startViteTestServer,
} from '../../scripts/class-flow-audit-20261107/shared/cdp-harness.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const EVIDENCE_DIR = path.join(__dirname, 'evidence');

const VIEWPORTS = [
  { id: 'mobile-320', label: 'Mobile 320px', width: 320, height: 694, mobile: true, zoom: 1 },
  { id: 'mobile-390', label: 'Mobile 390px', width: 390, height: 844, mobile: true, zoom: 1 },
  { id: 'tablet-768', label: 'Tablet 768px', width: 768, height: 1024, mobile: false, zoom: 1 },
  { id: 'desktop-1440', label: 'Desktop 1440px', width: 1440, height: 900, mobile: false, zoom: 1 },
  { id: 'desktop-1440-zoom200', label: 'Desktop 1440px @ 200% Zoom', width: 1440, height: 900, mobile: false, zoom: 2 },
  { id: 'mobile-390-zoom200', label: 'Mobile 390px @ 200% Zoom', width: 390, height: 844, mobile: true, zoom: 2 },
];

function buildSyntheticHistoryStoragePayload() {
  return {
    state: {
      activeTab: 'history',
      activeSequenceId: 'seq-active-draft',
      activeTitle: '현재 작업대 초안',
      activeSubtitle: '비교용 초안',
      activeApparatus: 'reformer',
      activeLevel: '1.5',
      activeTargetMinutes: 50,
      activeTargetGroupId: 'grp-mon-wed-7pm',
      activeSteps: [
        {
          stepId: 'draft-step-1',
          order: 1,
          kind: 'exercise',
          exerciseId: 'ex-warmup-01',
          blockCategory: 'warmup',
          durationMin: 10,
          selectedLayer: 'standard',
        },
      ],
      classGroups: [
        {
          id: 'grp-mon-wed-7pm',
          name: '월·수 저녁반 (합성 검증)',
          type: 'group',
          defaultLevel: '1.5',
          scheduleLabel: '월·수 19:00',
          notes: '',
        },
        {
          id: 'grp-tue-thu-10am',
          name: '화·목 오전 소그룹 집중반',
          type: 'group',
          defaultLevel: '1.0',
          scheduleLabel: '화·목 10:00',
          notes: '',
        },
        {
          id: 'grp-empty-dawn',
          name: '기록 없는 새벽반 (빈상태 검증용)',
          type: 'group',
          defaultLevel: '1.0',
          scheduleLabel: '금 07:00',
          notes: '',
        },
      ],
      historyLogs: [
        {
          id: 'syn-hist-20261106-1',
          sequenceId: 'seq-reformer-signature-50',
          sequenceTitle:
            '리포머 & 캐딜락 Lv 1.5 전신 코어·골반 중립·흉곽 호흡 제어 및 하체 정렬 집중 시그니처 시퀀스 — SuperLongUnbrokenToken_20261107_ReformerCadillacFlowVerification_TestTitle',
          groupId: 'grp-mon-wed-7pm',
          groupName: '월·수 저녁반 (합성 검증)',
          taughtAt: '2026-11-06T19:30:00.000Z',
          apparatus: 'reformer',
          level: '1.5',
          exerciseIds: ['ex-warmup-01', 'ex-footwork-01', 'ex-core-01'],
          rating: 5,
          intensity: 'intense',
          actualDurationSec: 2940,
          actualRestDurationSec: 180,
          instructorReflection:
            '합성 검증 메모: 풋워크에서 골반 중립 유지가 안정적이었으며, 다음 수업에서도 도입+코어 세트를 재사용할 예정입니다.',
          stepsSnapshot: [
            {
              stepId: 'syn-step-1',
              order: 1,
              kind: 'exercise',
              exerciseId: 'ex-warmup-01',
              blockCategory: 'warmup',
              durationMin: 12,
              explanationSec: 20,
              transitionSec: 15,
              selectedLayer: 'standard',
              instructorNote: '흉곽 호흡 큐 집중',
            },
            {
              stepId: 'syn-step-2',
              order: 2,
              kind: 'rest',
              exerciseId: '',
              blockCategory: 'core',
              durationMin: 3,
              selectedLayer: 'standard',
              instructorNote: '스프링 전환 및 수분 섭취',
            },
            {
              stepId: 'syn-step-3',
              order: 3,
              kind: 'exercise',
              exerciseId: 'ex-core-01',
              blockCategory: 'core',
              durationMin: 35,
              explanationSec: 25,
              transitionSec: 15,
              selectedLayer: 'hard',
            },
          ],
        },
        {
          id: 'syn-hist-20261106-2',
          sequenceId: 'seq-reformer-posture-50',
          sequenceTitle: '저녁 2교시 리포머 코어 & 둔근 안정화 50분',
          groupId: 'grp-mon-wed-7pm',
          groupName: '월·수 저녁반 (합성 검증)',
          taughtAt: '2026-11-06T20:30:00.000Z',
          apparatus: 'reformer',
          level: '1.5',
          exerciseIds: ['ex-warmup-01', 'ex-bridging-01'],
          rating: 4,
          intensity: 'moderate',
          actualDurationSec: 2880,
          instructorReflection: '합성 검증 메모: 브릿징 구간에서 햄스트링 개입 조절 안내.',
          stepsSnapshot: [
            {
              stepId: 'syn-2-step-1',
              order: 1,
              kind: 'exercise',
              exerciseId: 'ex-warmup-01',
              blockCategory: 'warmup',
              durationMin: 20,
              selectedLayer: 'standard',
            },
            {
              stepId: 'syn-2-step-2',
              order: 2,
              kind: 'exercise',
              exerciseId: 'ex-bridging-01',
              blockCategory: 'bridging',
              durationMin: 30,
              selectedLayer: 'standard',
            },
          ],
        },
        {
          id: 'syn-hist-20261103-1',
          sequenceId: 'seq-reformer-posture-50',
          sequenceTitle: '화·목 오전 소그룹 체형 정렬 & 견갑 안정화 시퀀스',
          groupId: 'grp-tue-thu-10am',
          groupName: '화·목 오전 소그룹 집중반',
          taughtAt: '2026-11-03T10:00:00.000Z',
          apparatus: 'reformer',
          level: '1.0',
          exerciseIds: ['ex-warmup-03', 'ex-footwork-02'],
          rating: 5,
          intensity: 'relaxed',
          actualDurationSec: 3000,
          instructorReflection: '합성 검증 메모: 오전반 견갑 하강 인지가 좋아짐.',
          stepsSnapshot: [
            {
              stepId: 'syn-3-step-1',
              order: 1,
              kind: 'exercise',
              exerciseId: 'ex-warmup-03',
              blockCategory: 'warmup',
              durationMin: 25,
              selectedLayer: 'easy',
            },
            {
              stepId: 'syn-3-step-2',
              order: 2,
              kind: 'exercise',
              exerciseId: 'ex-footwork-02',
              blockCategory: 'footwork',
              durationMin: 25,
              selectedLayer: 'standard',
            },
          ],
        },
      ],
    },
    version: 3,
  };
}

async function seedHistoryState(session, baseUrl) {
  await session.send('Page.navigate', { url: baseUrl });
  await session.waitForReady('#main-content', 15000);
  await sleep(300);
  // First click the History tab so lazy ClassBinderView loads and initializes storage
  await session.eval(`(() => {
    const buttons = Array.from(document.querySelectorAll('nav button'));
    const historyBtn = buttons.find((b) => b.textContent.includes('기록'));
    if (historyBtn) historyBtn.click();
    return true;
  })()`);
  await sleep(400);

  const payload = buildSyntheticHistoryStoragePayload();
  await session.eval(`(() => {
    const raw = localStorage.getItem('pilates-flow-atelier-storage-v3');
    const parsed = raw ? JSON.parse(raw) : { state: {}, version: 3 };
    const seeded = ${JSON.stringify(payload.state)};
    parsed.state = {
      ...parsed.state,
      ...seeded,
      classGroups: seeded.classGroups,
      historyLogs: seeded.historyLogs,
      activeTab: 'history',
    };
    localStorage.setItem('pilates-flow-atelier-storage-v3', JSON.stringify(parsed));
    return true;
  })()`);
  await session.send('Page.reload', { ignoreCache: true });
  await session.waitForReady('#main-content', 15000);
  await sleep(400);
  await session.eval(`(() => {
    const h1 = document.getElementById('workspace-main-heading');
    if (!h1 || !h1.textContent.includes('수업 기록')) {
      const buttons = Array.from(document.querySelectorAll('nav button'));
      const historyBtn = buttons.find((b) => b.textContent.includes('기록'));
      if (historyBtn) historyBtn.click();
    }
    return true;
  })()`);
  await session.waitForReady('.teaching-history-feed', 10000);
  await sleep(300);
}

async function measureViewport(session, vp, mode) {
  await session.setViewport({
    width: vp.width,
    height: vp.height,
    deviceScaleFactor: 1,
    mobile: vp.mobile,
    pageScaleFactor: 1,
  });
  await session.eval(`(() => {
    document.documentElement.style.zoom = '${vp.zoom}';
  })()`);
  await sleep(250);

  const metrics = await session.eval(`(() => {
    const docOverflowPx = Math.max(0, Math.round(document.documentElement.scrollWidth - window.innerWidth));
    const cards = Array.from(document.querySelectorAll('.teaching-history-card'));
    const cardOverflows = cards.map((c) => Math.max(0, Math.round(c.scrollWidth - c.clientWidth)));
    const maxCardOverflowPx = cardOverflows.length ? Math.max(...cardOverflows) : 0;

    const firstCard = cards[0];
    let titleBeforeBadges = false;
    let titleOverflowWrap = '';
    let actionsWidthRatio = 0;
    let reuseBtnHeight = 0;
    let detailBtnHeight = 0;
    let buttonsOverlap = false;
    let reuseBtnIsPrimary = false;
    let hasDateTimeHeader = false;

    if (firstCard) {
      const h2 = firstCard.querySelector('h2');
      const badges = firstCard.querySelector('.teaching-history-badges');
      if (h2 && badges) {
        titleBeforeBadges = h2.getBoundingClientRect().top <= badges.getBoundingClientRect().top;
      }
      if (h2) {
        titleOverflowWrap = getComputedStyle(h2).overflowWrap;
      }
      const bottom = firstCard.querySelector('.teaching-history-bottom');
      const actions = firstCard.querySelector('.teaching-history-actions');
      if (bottom && actions) {
        const bw = bottom.getBoundingClientRect().width;
        const aw = actions.getBoundingClientRect().width;
        actionsWidthRatio = bw > 0 ? Number((aw / bw).toFixed(3)) : 0;
      }
      const buttons = Array.from(firstCard.querySelectorAll('.teaching-history-actions button'));
      const detailBtn = buttons.find((b) => b.textContent.includes('이력 다시 열기'));
      const reuseBtn = buttons.find((b) => b.textContent.includes('이 수업 다시 계획'));
      if (detailBtn && reuseBtn) {
        const dr = detailBtn.getBoundingClientRect();
        const rr = reuseBtn.getBoundingClientRect();
        detailBtnHeight = Math.round(dr.height);
        reuseBtnHeight = Math.round(rr.height);
        buttonsOverlap = !(
          dr.right <= rr.left + 1 ||
          rr.right <= dr.left + 1 ||
          dr.bottom <= rr.top + 1 ||
          rr.bottom <= dr.top + 1
        );
        reuseBtnIsPrimary =
          reuseBtn.classList.contains('btn-primary') ||
          reuseBtn.classList.contains('pf-btn--primary');
      }
      hasDateTimeHeader = Boolean(firstCard.querySelector('.teaching-history-datetime'));
    }

    const dateNav = document.querySelector('[aria-label="날짜별 기록 탐색"]');
    const dateGroups = document.querySelectorAll('.teaching-history-date-group');

    return {
      docOverflowPx,
      cardCount: cards.length,
      maxCardOverflowPx,
      hasDateNav: Boolean(dateNav),
      dateChipCount: dateNav ? dateNav.querySelectorAll('button').length : 0,
      dateGroupCount: dateGroups.length,
      titleBeforeBadges,
      titleOverflowWrap,
      actionsWidthRatio,
      detailBtnHeight,
      reuseBtnHeight,
      buttonsOverlap,
      reuseBtnIsPrimary,
      hasDateTimeHeader,
    };
  })()`);

  const shotPath = path.join(EVIDENCE_DIR, mode, `history-${vp.id}.png`);
  await session.screenshot(shotPath);

  return {
    viewport: vp.id,
    label: vp.label,
    width: vp.width,
    height: vp.height,
    zoom: vp.zoom,
    screenshot: path.relative(PROJECT_ROOT, shotPath),
    ...metrics,
  };
}

async function testInteractiveFlows(session, mode) {
  await session.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
    pageScaleFactor: 1,
  });
  await session.eval(`(() => { document.documentElement.style.zoom = '1'; })()`);
  await sleep(200);

  // 1. Test date filter interaction if present
  const dateFilterResult = await session.eval(`(() => {
    const dateNav = document.querySelector('[aria-label="날짜별 기록 탐색"]');
    if (!dateNav) {
      return { supported: false, filteredCount: null, restoredCount: null };
    }
    const buttons = Array.from(dateNav.querySelectorAll('button'));
    const specificDateBtn = buttons.find((b) => !b.textContent.includes('전체 날짜'));
    if (!specificDateBtn) {
      return { supported: true, filteredCount: null, restoredCount: null };
    }
    specificDateBtn.click();
    return {
      supported: true,
      selectedDateLabel: specificDateBtn.textContent.trim(),
    };
  })()`);
  await sleep(150);

  let dateFilterCounts = { filteredCount: null, restoredCount: null };
  if (dateFilterResult.supported) {
    const filteredCount = await session.eval(
      `document.querySelectorAll('.teaching-history-card').length`,
    );
    await session.eval(`(() => {
      const dateNav = document.querySelector('[aria-label="날짜별 기록 탐색"]');
      const allDateBtn = Array.from(dateNav?.querySelectorAll('button') || []).find((b) =>
        b.textContent.includes('전체 날짜'),
      );
      if (allDateBtn) allDateBtn.click();
    })()`);
    await sleep(150);
    const restoredCount = await session.eval(
      `document.querySelectorAll('.teaching-history-card').length`,
    );
    dateFilterCounts = { filteredCount, restoredCount };
  }

  // 2. Test empty state when selecting a group with 0 records
  const emptyGroupResult = await session.eval(`(() => {
    const groupFilter = document.querySelector('[aria-label="수업 그룹 필터"]');
    if (!groupFilter) return { foundFilter: false };
    const emptyGroupBtn = Array.from(groupFilter.querySelectorAll('button')).find((b) =>
      b.textContent.includes('기록 없는 새벽반'),
    );
    if (!emptyGroupBtn) return { foundFilter: false };
    emptyGroupBtn.click();
    return { clicked: true };
  })()`);
  await sleep(200);

  const emptyStateSnapshot = await session.eval(`(() => {
    const emptyRegion = document.querySelector('.pf-empty-state');
    const title = emptyRegion?.querySelector('h2, h3, .pf-empty-state__title')?.textContent?.trim() || '';
    const actionBtn = emptyRegion?.querySelector('button')?.textContent?.trim() || '';
    const cardsVisible = document.querySelectorAll('.teaching-history-card').length;
    return { title, actionBtn, cardsVisible };
  })()`);

  const emptyShotPath = path.join(EVIDENCE_DIR, mode, 'history-empty-group-390.png');
  await session.screenshot(emptyShotPath);

  // Restore group filter to '전체 기록'
  await session.eval(`(() => {
    const groupFilter = document.querySelector('[aria-label="수업 그룹 필터"]');
    const allBtn = Array.from(groupFilter?.querySelectorAll('button') || []).find((b) =>
      b.textContent.includes('전체 기록'),
    );
    if (allBtn) allBtn.click();
  })()`);
  await sleep(200);

  // 3. Test Detail Modal ("이력 다시 열기") at 320px
  await session.setViewport({
    width: 320,
    height: 694,
    deviceScaleFactor: 1,
    mobile: true,
    pageScaleFactor: 1,
  });
  await sleep(150);
  await session.eval(`(() => {
    const firstCard = document.querySelector('.teaching-history-card');
    const reopenBtn = Array.from(firstCard?.querySelectorAll('button') || []).find((b) =>
      b.textContent.includes('이력 다시 열기'),
    );
    if (reopenBtn) reopenBtn.click();
  })()`);
  await sleep(250);

  const modalMetrics = await session.eval(`(() => {
    const dialog = document.querySelector('dialog[open]');
    if (!dialog) return { open: false };
    const rect = dialog.getBoundingClientRect();
    const overflowPx = Math.max(0, Math.round(dialog.scrollWidth - dialog.clientWidth));
    const copyBtn = Array.from(dialog.querySelectorAll('button')).find((b) =>
      b.textContent.includes('복사해 다음 수업 만들기'),
    );
    const copyBtnRect = copyBtn ? copyBtn.getBoundingClientRect() : null;
    return {
      open: true,
      dialogWidth: Math.round(rect.width),
      viewportWidth: window.innerWidth,
      fitsViewport: rect.left >= -1 && rect.right <= window.innerWidth + 1,
      overflowPx,
      copyBtnHeight: copyBtnRect ? Math.round(copyBtnRect.height) : 0,
    };
  })()`);

  const modalShotPath = path.join(EVIDENCE_DIR, mode, 'history-detail-modal-320.png');
  await session.screenshot(modalShotPath);

  // 4. Click "복사해 다음 수업 만들기" to verify reuse handoff into workbench
  await session.eval(`(() => {
    const dialog = document.querySelector('dialog[open]');
    const copyBtn = Array.from(dialog?.querySelectorAll('button') || []).find((b) =>
      b.textContent.includes('복사해 다음 수업 만들기'),
    );
    if (copyBtn) copyBtn.click();
  })()`);
  await sleep(300);

  const reuseHandoffResult = await session.eval(`(() => {
    const raw = localStorage.getItem('pilates-flow-atelier-storage-v3');
    const state = raw ? JSON.parse(raw).state : null;
    return {
      activeTab: state?.activeTab ?? null,
      activeTitle: state?.activeTitle ?? null,
      activeStepsCount: state?.activeSteps?.length ?? 0,
    };
  })()`);

  return {
    dateFilterResult: { ...dateFilterResult, ...dateFilterCounts },
    emptyGroupResult: { ...emptyGroupResult, ...emptyStateSnapshot },
    modalMetrics,
    reuseHandoffResult,
  };
}

async function main() {
  const modeArg = process.argv.find((arg) => arg.startsWith('--mode='));
  const mode = modeArg ? modeArg.split('=')[1] : 'after';
  if (!['before', 'after'].includes(mode)) {
    throw new Error(`Invalid --mode=${mode}. Expected 'before' or 'after'.`);
  }

  fs.mkdirSync(path.join(EVIDENCE_DIR, mode), { recursive: true });

  const server = await startViteTestServer(PROJECT_ROOT);
  const browser = await launchChromiumBrowser(`history-${mode}`);

  try {
    const { session, targetId } = await browser.openPage(server.url);
    try {
      await seedHistoryState(session, server.url);
      const viewportMetrics = [];
      for (const vp of VIEWPORTS) {
        const res = await measureViewport(session, vp, mode);
        viewportMetrics.push(res);
      }
      const interactiveFlows = await testInteractiveFlows(session, mode);
      const output = {
        mode,
        capturedAt: new Date().toISOString(),
        viewports: viewportMetrics,
        interactiveFlows,
      };
      const outFile = path.join(EVIDENCE_DIR, `${mode}-metrics.json`);
      fs.writeFileSync(outFile, JSON.stringify(output, null, 2));
      console.log(`Saved ${mode} evidence to ${path.relative(PROJECT_ROOT, outFile)}`);
      console.log(JSON.stringify(output, null, 2));
    } finally {
      await session.close();
      await browser.closeTarget(targetId);
    }
  } finally {
    await browser.close();
    await server.stop();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
