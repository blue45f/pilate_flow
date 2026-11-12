import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServiceWorkerSource } from '../../scripts/pwa-build';
import { ClassBinderView } from '../components/ClassBinderView';
import { ExerciseAtlasView } from '../components/ExerciseAtlasView';
import { FreeAiAssistantPanel } from '../components/FreeAiAssistantPanel';
import { LiveStageView } from '../components/LiveStageView';
import { LogSessionModal } from '../components/LogSessionModal';
import { OnePageVisual3DCueSheet } from '../components/OnePageVisual3DCueSheet';
import { Studio3DMotionHeroCard } from '../components/Studio3DMotionHeroCard';
import { StudioOffline3dReadinessCard } from '../components/StudioOffline3dReadinessCard';
import {
  SequenceQuickFlowCoachStrip,
  analyzeAndOptimizeFlowSteps,
} from '../components/workbench/SequenceQuickFlowCoachStrip';
import { YouTubeClipperModal, YouTubePreviewModal } from '../components/YouTubeClipModal';
import { VERIFIED_YOUTUBE_VIDEO_POOL } from '../data/exerciseYouTubeCatalog';
import {
  CRAWLED_YOUTUBE_DISCOVERY_POOL,
  GLOBAL_CRAWLED_REPERTOIRE_EXERCISES,
  getCrawledRelatedVideosForExercise,
} from '../data/globalCrawledRepertoirePack';
import { INITIAL_EXERCISES, INITIAL_SAVED_SEQUENCES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import type { PilatesExercise, SequenceStep } from '../types/pilates';
import { ATELIER_QUICK_START_RECIPES } from '../utils/atelierQuickStart';
import { exerciseRevision, isExerciseAutoEligible } from '../utils/exerciseReview';
import {
  ALL_STUDIO_3D_ASSET_URLS,
  STUDIO_3D_SIGNATURES,
  resolveStudio3DMotionForExercise,
} from '../utils/studio3dMotionCatalog';

const initialStoreState = usePilatesStore.getState();

beforeEach(() => {
  window.sessionStorage.clear();
  usePilatesStore.setState(
    {
      ...initialStoreState,
      exercises: [...INITIAL_EXERCISES],
      activeSteps: [],
      savedSequences: [],
      historyLogs: [],
    },
    true,
  );
  vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function (
    this: HTMLDialogElement,
  ) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  });
});

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  usePilatesStore.setState(initialStoreState, true);
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Global Benchmark Mobile-First Redesign, 32-Render Studio 3D Motion System, Offline PWA, 1-Page Visual Cue Sheet & All-Pages Elevation', () => {
  it('verifies all 32 Blender 3D studio renders across 16 movement families, 4 motion exemplar boards, and 9 mobile-first boards exist while preserving 01–09 mockups and 98/141 catalog invariants', () => {
    expect(Object.keys(STUDIO_3D_SIGNATURES)).toHaveLength(16);
    expect(ALL_STUDIO_3D_ASSET_URLS).toHaveLength(32);

    const studio3dFiles = [
      'footwork-start.png',
      'footwork-peak.png',
      'bridge-start.png',
      'bridge-peak.png',
      'shortspine-start.png',
      'shortspine-peak.png',
      'longbox-teaser-start.png',
      'longbox-teaser-peak.png',
      'reformer-elephant-start.png',
      'reformer-elephant-peak.png',
      'mat-hundred-start.png',
      'mat-hundred-peak.png',
      'mat-twist-start.png',
      'mat-twist-peak.png',
      'chair-start.png',
      'chair-peak.png',
      'chair-goingup-start.png',
      'chair-goingup-peak.png',
      'chair-pike-start.png',
      'chair-pike-peak.png',
      'cadillac-cat-start.png',
      'cadillac-cat-peak.png',
      'cadillac-teaser-start.png',
      'cadillac-teaser-peak.png',
      'cadillac-hanging-start.png',
      'cadillac-hanging-peak.png',
      'barrel-sidebend-start.png',
      'barrel-sidebend-peak.png',
      'barrel-swan-start.png',
      'barrel-swan-peak.png',
      'barrel-horseback-start.png',
      'barrel-horseback-peak.png',
    ];
    for (const file of studio3dFiles) {
      expect(existsSync(resolve(process.cwd(), 'public/motion-studio3d', file))).toBe(true);
    }

    const exemplarBoards = [
      'motion-showcase-01-kinematic-onion-skin-comparison.png',
      'motion-showcase-02-5-apparatus-studio3d-cards.png',
      'motion-showcase-03-advanced-repertoire-3d-series.png',
      'motion-showcase-04-elite-hanging-pike-horseback-elephant.png',
    ];
    for (const board of exemplarBoards) {
      expect(
        existsSync(resolve(process.cwd(), 'docs/design-system-mockups/motion-exemplars', board)),
      ).toBe(true);
    }

    const mobileAllPagesBoards = [
      'board-01-mobile-sequence-wizard-p01-p04.png',
      'board-02-mobile-atlas-and-clean-detail-p05-p08.png',
      'board-03-mobile-live-stage-schedule-binder-p09-p12.png',
      'board-04-mobile-ai-clipper-member-settings-p13-p16.png',
      'board-05-simple-pc-and-mobile-parity.png',
      'board-06-mobile-live-stage-p09-sensory-dock.png',
      'board-07-schedule-and-member-3d-cards.png',
      'board-08-full-audit-p01-p04-p10-p12-p13-p14-elevation.png',
      'board-09-offline-pwa-visual-cuesheet-32-renders.png',
    ];
    for (const board of mobileAllPagesBoards) {
      expect(
        existsSync(
          resolve(
            process.cwd(),
            'docs/design-system-mockups/images-12-mobile-first-all-pages',
            board,
          ),
        ),
      ).toBe(true);
    }

    // Verify advanced & elite repertoire exercises resolve to dedicated 3D signatures
    const shortSpine = GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.find((e) =>
      e.id.includes('short-spine'),
    )!;
    const longBoxTeaser = GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.find((e) =>
      e.id.includes('longbox-teaser'),
    )!;
    const chairGoingUp = GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.find((e) =>
      e.id.includes('going-up-front'),
    )!;
    const chairPullUpPike = GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.find((e) =>
      e.id.includes('pull-up-hamstring3'),
    )!;
    const cadillacTeaser = GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.find((e) =>
      e.id.includes('teaser-pushthrough'),
    )!;
    const cadillacHanging = GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.find((e) =>
      e.id.includes('hanging-pullups'),
    )!;
    const barrelSwan = GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.find((e) =>
      e.id.includes('swan-dive-full'),
    )!;
    const barrelRoundBack = GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.find((e) =>
      e.id.includes('shortbox-roundback'),
    )!;
    const reformerTendonPike = GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.find((e) =>
      e.id.includes('tendon-stretch'),
    )!;
    const matSaw = GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.find((e) => e.id.includes('crawled-mat-saw'))!;

    expect(resolveStudio3DMotionForExercise(shortSpine).signatureId).toBe('reformer-shortspine');
    expect(resolveStudio3DMotionForExercise(longBoxTeaser).signatureId).toBe(
      'reformer-longbox-teaser',
    );
    expect(resolveStudio3DMotionForExercise(reformerTendonPike).signatureId).toBe(
      'reformer-elephant',
    );
    expect(resolveStudio3DMotionForExercise(chairGoingUp).signatureId).toBe('chair-goingup');
    expect(resolveStudio3DMotionForExercise(chairPullUpPike).signatureId).toBe('chair-pike');
    expect(resolveStudio3DMotionForExercise(cadillacTeaser).signatureId).toBe('cadillac-teaser');
    expect(resolveStudio3DMotionForExercise(cadillacHanging).signatureId).toBe('cadillac-hanging');
    expect(resolveStudio3DMotionForExercise(barrelSwan).signatureId).toBe('barrel-swan');
    expect(resolveStudio3DMotionForExercise(barrelRoundBack).signatureId).toBe('barrel-horseback');
    expect(resolveStudio3DMotionForExercise(matSaw).signatureId).toBe('mat-twist');

    // Baseline invariants preserved
    expect(INITIAL_EXERCISES).toHaveLength(98);
    expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
    expect(VERIFIED_YOUTUBE_VIDEO_POOL).toHaveLength(141);
  });

  it('renders Studio3DMotionHeroCard with Start / Onion-Skin / Peak / Loop modes, honest anatomical disclaimer, and 3-Essential Strip', () => {
    const footworkExercise =
      INITIAL_EXERCISES.find((ex) => ex.apparatus === 'reformer' && ex.blockCategory === 'footwork') ??
      INITIAL_EXERCISES[0]!;

    render(<Studio3DMotionHeroCard exercise={footworkExercise} />);

    const card = screen.getByTestId('studio-3d-motion-hero-card');
    expect(card).toHaveAttribute('data-anatomical-accuracy-assumed', 'false');
    expect(card).toHaveAttribute('data-motion-mode', 'onion');
    expect(card).toHaveTextContent('임상 각도·개인 적합성은 강사 현장 확인');

    const modeGroup = within(card).getByRole('group', { name: '3D 모션 단계 보기 방식' });
    fireEvent.click(within(modeGroup).getByRole('button', { name: /● 시작/ }));
    expect(card).toHaveAttribute('data-motion-mode', 'start');

    fireEvent.click(within(modeGroup).getByRole('button', { name: /◆ 정점 근육/ }));
    expect(card).toHaveAttribute('data-motion-mode', 'peak');

    expect(screen.getByTestId('detail-essential-3-strip')).toBeVisible();
  });

  it('simplifies YouTubePreviewModal mobile detail screen via progressive-disclosure drawers and click-to-load crawled YouTube references without autoplay', () => {
    const reformerEx =
      INITIAL_EXERCISES.find((ex) => ex.apparatus === 'reformer') ?? INITIAL_EXERCISES[0]!;
    const related = getCrawledRelatedVideosForExercise(reformerEx, 4);
    expect(related.length).toBeGreaterThan(0);

    render(<YouTubePreviewModal exercise={reformerEx} onClose={vi.fn()} onAddToSequence={vi.fn()} />);

    expect(screen.getByTestId('studio-3d-motion-hero-card')).toBeVisible();
    expect(screen.getByTestId('detail-essential-3-strip')).toBeVisible();
    expect(screen.getByRole('button', { name: '수업안에 추가' })).toBeEnabled();

    expect(screen.getByTestId('detail-clinical-diagram-drawer')).not.toHaveAttribute('open');
    expect(screen.getByTestId('detail-voice-media-drawer')).not.toHaveAttribute('open');
    expect(screen.getByTestId('detail-posture-anatomy-drawer')).not.toHaveAttribute('open');

    const crawledDrawer = screen.getByTestId('crawled-related-videos-drawer');
    expect(crawledDrawer).not.toHaveAttribute('open');
    fireEvent.click(crawledDrawer.querySelector('summary')!);

    const openVidButtons = within(crawledDrawer).getAllByRole('button', { name: /미리보기 열기/ });
    fireEvent.click(openVidButtons[0]!);

    const iframe = crawledDrawer.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute('src')).toContain('youtube-nocookie.com/embed/');
    expect(iframe?.getAttribute('src')).toContain('autoplay=0');
  });

  it('provides 60 crawled movements + unique YouTube references in ExerciseAtlasView with 1-click library import and direct sequence add', () => {
    expect(GLOBAL_CRAWLED_REPERTOIRE_EXERCISES).toHaveLength(60);
    expect(CRAWLED_YOUTUBE_DISCOVERY_POOL.length).toBeGreaterThanOrEqual(50);

    render(<ExerciseAtlasView onOpenYouTubePreview={vi.fn()} onOpenClipper={vi.fn()} />);

    const tablist = screen.getByRole('tablist', { name: '자료 모음' });
    const repertoireTab = within(tablist).getByRole('tab', { name: /확장 도감·영상/ });
    fireEvent.click(repertoireTab);

    const explorer = screen.getByTestId('global-crawled-repertoire-explorer');
    expect(explorer).toBeVisible();

    const addToSeqBtns = within(explorer).getAllByRole('button', { name: /수업에 담기/ });
    fireEvent.click(addToSeqBtns[0]!);
    expect(usePilatesStore.getState().activeSteps).toHaveLength(1);
    expect(usePilatesStore.getState().exercises).toHaveLength(99);

    const importAllBtn = screen.getByTestId('import-all-crawled-repertoire-btn');
    fireEvent.click(importAllBtn);
    expect(usePilatesStore.getState().exercises).toHaveLength(158);
    expect(INITIAL_EXERCISES).toHaveLength(98);
  });

  it('elevates LiveStageView (P09) with 3D start↔peak companion, spring delta alert, unilateral side-switch haptic/chime alert after opt-in, and one-handed ±15s thumb dock with undo', () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date('2026-11-12T13:00:00.000Z'));

    const vibrateMock = vi.fn(() => true);
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      writable: true,
      value: vibrateMock,
    });

    const ex1Base = {
      ...INITIAL_EXERCISES[0]!,
      id: 'stage-p09-reformer-1',
      apparatus: 'reformer' as const,
      requiredEquipment: ['reformer'],
      springs: '1R 1B',
      isUnilateral: true,
    };
    const ex1 = {
      ...ex1Base,
      review: {
        status: 'approved' as const,
        reviewerAlias: 'Stage QA',
        reviewedAt: '2026-11-12T00:00:00.000Z',
        revision: exerciseRevision(ex1Base),
        scope: 'planning-metadata' as const,
        credentialVerified: false as const,
      },
    };
    const ex2Base = {
      ...INITIAL_EXERCISES[1]!,
      id: 'stage-p09-reformer-2',
      apparatus: 'reformer' as const,
      requiredEquipment: ['reformer'],
      springs: '2R',
    };
    const ex2 = {
      ...ex2Base,
      review: {
        status: 'approved' as const,
        reviewerAlias: 'Stage QA',
        reviewedAt: '2026-11-12T00:00:00.000Z',
        revision: exerciseRevision(ex2Base),
        scope: 'planning-metadata' as const,
        credentialVerified: false as const,
      },
    };

    const steps: SequenceStep[] = [
      {
        stepId: 'p09-step-1',
        order: 1,
        exerciseId: ex1.id,
        blockCategory: 'footwork',
        durationMin: 1,
        explanationSec: 10,
        transitionSec: 10,
        sideMode: 'left-then-right',
        selectedLayer: 'standard',
      },
      {
        stepId: 'p09-step-2',
        order: 2,
        exerciseId: ex2.id,
        blockCategory: 'core',
        durationMin: 2,
        explanationSec: 10,
        transitionSec: 0,
        selectedLayer: 'standard',
      },
    ];

    usePilatesStore.setState({
      activeTab: 'stage',
      activeSequenceId: 'stage-p09-seq',
      activeTitle: '모바일 라이브 스테이지 P09 검증',
      activeTargetMinutes: 3,
      exercises: [...INITIAL_EXERCISES, ex1, ex2],
      activeSteps: steps,
    });

    render(<LiveStageView onOpenLogModal={vi.fn()} />);

    expect(screen.getByTestId('live-stage-3d-companion')).toBeVisible();
    expect(screen.getAllByTestId('live-stage-spring-delta-badge')[0]).toHaveTextContent(
      '스프링 변경: 1R 1B → 2R',
    );
    expect(vibrateMock).not.toHaveBeenCalled();

    const dock = screen.getByTestId('live-stage-thumb-dock');
    expect(dock).toBeVisible();
    fireEvent.click(screen.getByTestId('live-thumb-plus-15s'));
    expect(screen.getByRole('timer')).toHaveTextContent('01:15');
    expect(screen.getByTestId('live-stage-undo-banner')).toHaveTextContent('15초 늘렸어요');
    fireEvent.click(screen.getByTestId('live-stage-undo-btn'));
    expect(screen.getByRole('timer')).toHaveTextContent('01:00');

    fireEvent.click(screen.getByTestId('live-sensory-cue-toggle'));
    expect(screen.getByTestId('live-sensory-cue-toggle')).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByTestId('live-thumb-play-toggle'));
    act(() => {
      vi.setSystemTime(Date.now() + 31000);
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(screen.getByTestId('live-stage-bilateral-switch-alert')).toHaveTextContent(
      '반대쪽 전환 시점',
    );
    expect(vibrateMock).toHaveBeenCalled();
  });

  it('connects unified 5-apparatus 3D mini previews, difficulty badges, and SpringVisualPills across InstructorScheduleView and MemberBookingView without altering accessible CTA/card names', async () => {
    const { InstructorScheduleView } = await import('../components/InstructorScheduleView');
    const { MemberBookingView } = await import('../components/MemberBookingView');
    const { getApparatusStudio3dImage, resolveClassCardVisualMeta } = await import(
      '../utils/memberBookingBridge'
    );

    for (const apparatus of ['reformer', 'chair', 'cadillac', 'barrel', 'mat'] as const) {
      expect(getApparatusStudio3dImage(apparatus)).toMatch(/^\/motion-studio3d\/.+\.png$/);
      const fallbackMeta = resolveClassCardVisualMeta({
        fallbackApparatus: apparatus,
        fallbackLevel: '1.5',
      });
      expect(fallbackMeta.studio3dThumbUrl).toMatch(/^\/motion-studio3d\/.+\.png$/);
      expect(fallbackMeta.levelBadgeKo).toBe('Lv 1.5 · 초중급');
      expect(fallbackMeta.springs.length).toBeGreaterThan(0);
    }

    const honestUnlinked = resolveClassCardVisualMeta({
      fallbackApparatus: 'barrel',
      title: '저녁 래더 바렐 측굴반',
      fallbackLevel: null,
    });
    expect(honestUnlinked.levelBadgeKo).toBe('난이도 미지정');
    expect(honestUnlinked.springSourceLabelKo).toBe('기구 기본 세팅');

    const shortSpineEx = GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.find((e) =>
      e.id.includes('short-spine'),
    )!;
    const savedSeq = {
      id: 'seq-reformer-shortspine',
      title: '리포머 심화 척추 분절 플로우',
      subtitle: '숏 스파인 마사지 중심',
      apparatus: 'reformer' as const,
      level: '2.0' as const,
      focusTags: ['척추분절'],
      targetMinutes: 50,
      steps: [
        {
          stepId: 's-1',
          order: 1,
          exerciseId: shortSpineEx.id,
          blockCategory: shortSpineEx.blockCategory,
          durationMin: 6,
          selectedLayer: 'standard' as const,
          customSpringOverride: '2R',
        },
      ],
      createdAt: '2026-11-12T00:00:00.000Z',
      updatedAt: '2026-11-12T00:00:00.000Z',
      taughtCount: 1,
    };

    usePilatesStore.setState({
      exercises: [...INITIAL_EXERCISES, shortSpineEx],
      savedSequences: [savedSeq],
      instructorSchedule: {
        version: 1,
        locations: [
          {
            id: 'loc-main-a',
            alias: '본점 리포머룸',
            equipmentIds: ['reformer'],
            propIds: ['magic-circle'],
            notes: '',
          },
          {
            id: 'loc-main-b',
            alias: '본점 바렐룸',
            equipmentIds: ['ladder-barrel'],
            propIds: [],
            notes: '',
          },
        ],
        classes: [
          {
            id: 'cls-linked-reformer',
            title: '오전 리포머 심화 분절반',
            participantAlias: '오전A',
            locationId: 'loc-main-a',
            startDate: '2026-11-12',
            startTime: '10:00',
            endTime: '10:50',
            recurrence: 'once',
            weekdays: [],
            linkSavedSequenceId: savedSeq.id,
            notes: '',
          },
          {
            id: 'cls-unlinked-barrel',
            title: '저녁 래더 바렐 측굴반',
            participantAlias: '저녁B',
            locationId: 'loc-main-b',
            startDate: '2026-11-12',
            startTime: '19:00',
            endTime: '19:50',
            recurrence: 'once',
            weekdays: [],
            notes: '',
          },
        ],
        exceptions: [],
      },
    });

    const schedRender = render(<InstructorScheduleView today="2026-11-12" />);

    const linkedCard = screen.getByRole('article', { name: /오전 리포머 심화 분절반/ });
    const linkedThumb = linkedCard.querySelector<HTMLImageElement>('.pf-schedule-3d-thumb');
    expect(linkedThumb?.getAttribute('src')).toBe('/motion-studio3d/shortspine-peak.png');
    expect(within(linkedCard).getByTestId('schedule-card-level-badge')).toHaveTextContent(
      'Lv 2.0 · 중상급',
    );
    expect(within(linkedCard).getByTestId('schedule-card-spring-pills')).toHaveTextContent(
      '연결 시퀀스',
    );
    expect(within(linkedCard).getByTestId('schedule-card-spring-pills')).toHaveTextContent(
      '빨강×2',
    );

    const unlinkedBarrelCard = screen.getByRole('article', {
      name: /저녁 래더 바렐 측굴반/,
    });
    const barrelThumb =
      unlinkedBarrelCard.querySelector<HTMLImageElement>('.pf-schedule-3d-thumb');
    expect(barrelThumb?.getAttribute('src')).toBe('/motion-studio3d/barrel-swan-peak.png');
    expect(
      within(unlinkedBarrelCard).getByTestId('schedule-card-apparatus-badge'),
    ).toHaveTextContent('바렐 3D');
    expect(within(unlinkedBarrelCard).getByTestId('schedule-card-level-badge')).toHaveTextContent(
      '난이도 미지정',
    );
    schedRender.unmount();

    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-12T08:00:00.000Z'));

    render(<MemberBookingView />);

    const bookReformerBtn = screen.getByRole('button', {
      name: '오전 리포머 심화 분절반 예약하기',
    });
    const memberReformerCard = bookReformerBtn.closest('article')!;
    const memberReformerImg = memberReformerCard.querySelector<HTMLImageElement>(
      '.pf-member-slot-art',
    );
    expect(memberReformerImg?.getAttribute('src')).toBe('/motion-studio3d/shortspine-peak.png');

    fireEvent.click(bookReformerBtn);
    const spotBanner = screen.getByTestId('member-spot-dialog-3d-banner');
    expect(spotBanner).toBeVisible();
    expect(spotBanner).toHaveTextContent('리포머 스튜디오 3D 기구·스프링 안내');
  });

  it('completes full visual parity & pro elevation across P01 Quick-Start 3D, P04 Flow Coach transition optimizer, P10 30s Log 3D banner & chips, P12 Reusable Block Shelf, P13 Free AI 3D steps, P14 Clipper 3D spring presets, Offline PWA 32-Render Prewarmer, and 1-Page Visual 3D Cue Sheet', async () => {
    // 1. P01: Quick-start recipes all point to /motion-studio3d/*.png with spring & muscle metadata
    expect(ATELIER_QUICK_START_RECIPES).toHaveLength(4);
    for (const recipe of ATELIER_QUICK_START_RECIPES) {
      expect(recipe.imageSrc).toMatch(/^\/motion-studio3d\/.+\.png$/);
      expect(recipe.springs.length).toBeGreaterThan(0);
      expect(recipe.muscleFocusKo.length).toBeGreaterThan(0);
    }

    // 2. P04: SequenceQuickFlowCoachStrip minimizes setup transitions while keeping warmup/cooldown pinned
    const warmEx: PilatesExercise = {
      ...INITIAL_EXERCISES[0]!,
      id: 'flow-warm',
      apparatus: 'reformer',
      blockCategory: 'warmup',
      bodyPosition: 'supine',
      box: 'none',
      springs: '2R',
      spinalPlanes: ['neutral'],
    };
    const mainSupineA: PilatesExercise = {
      ...INITIAL_EXERCISES[1]!,
      id: 'flow-main-supine-a',
      apparatus: 'reformer',
      blockCategory: 'core',
      bodyPosition: 'supine',
      box: 'none',
      springs: '2R',
      spinalPlanes: ['flexion'],
    };
    const mainSittingBox: PilatesExercise = {
      ...INITIAL_EXERCISES[2]!,
      id: 'flow-main-sit-box',
      apparatus: 'reformer',
      blockCategory: 'upper-body',
      bodyPosition: 'sitting',
      box: 'short-box',
      springs: '1B',
      spinalPlanes: ['rotation'],
    };
    const mainSupineB: PilatesExercise = {
      ...INITIAL_EXERCISES[3]!,
      id: 'flow-main-supine-b',
      apparatus: 'reformer',
      blockCategory: 'bridging',
      bodyPosition: 'supine',
      box: 'none',
      springs: '2R',
      spinalPlanes: ['extension'],
    };
    const coolEx: PilatesExercise = {
      ...INITIAL_EXERCISES[4]!,
      id: 'flow-cool',
      apparatus: 'reformer',
      blockCategory: 'cooldown',
      bodyPosition: 'sitting',
      box: 'short-box',
      springs: '1B',
      spinalPlanes: ['lateral'],
    };
    const flowMap = new Map<string, PilatesExercise>([
      [warmEx.id, warmEx],
      [mainSupineA.id, mainSupineA],
      [mainSittingBox.id, mainSittingBox],
      [mainSupineB.id, mainSupineB],
      [coolEx.id, coolEx],
    ]);
    const zigZagSteps: SequenceStep[] = [
      {
        stepId: 'st-warm',
        order: 1,
        exerciseId: warmEx.id,
        blockCategory: 'warmup',
        classSection: 'warmup',
        durationMin: 4,
        selectedLayer: 'standard',
      },
      {
        stepId: 'st-m1',
        order: 2,
        exerciseId: mainSupineA.id,
        blockCategory: 'core',
        classSection: 'main',
        durationMin: 5,
        selectedLayer: 'standard',
      },
      {
        stepId: 'st-m2',
        order: 3,
        exerciseId: mainSittingBox.id,
        blockCategory: 'upper-body',
        classSection: 'main',
        durationMin: 5,
        selectedLayer: 'standard',
      },
      {
        stepId: 'st-m3',
        order: 4,
        exerciseId: mainSupineB.id,
        blockCategory: 'bridging',
        classSection: 'main',
        durationMin: 5,
        selectedLayer: 'standard',
      },
      {
        stepId: 'st-cool',
        order: 5,
        exerciseId: coolEx.id,
        blockCategory: 'cooldown',
        classSection: 'cooldown',
        durationMin: 4,
        selectedLayer: 'standard',
      },
    ];

    const summary = analyzeAndOptimizeFlowSteps(zigZagSteps, flowMap);
    expect(summary.savedTransitionsCount).toBeGreaterThan(0);
    expect(summary.optimizedSteps[0]!.stepId).toBe('st-warm');
    expect(summary.optimizedSteps[4]!.stepId).toBe('st-cool');

    const applyOptimizedSpy = vi.fn();
    const coachRender = render(
      <SequenceQuickFlowCoachStrip
        steps={zigZagSteps}
        exercisesById={flowMap}
        onApplyOptimizedSteps={applyOptimizedSpy}
      />,
    );
    fireEvent.click(screen.getByTestId('quick-flow-optimize-transitions-btn'));
    expect(applyOptimizedSpy).toHaveBeenCalledTimes(1);
    coachRender.unmount();

    // 3. P10: LogSessionModal 3D banner + quick intensity & rating chips
    usePilatesStore.setState({
      activeSequenceId: 'seq-log-p10',
      activeTitle: '리포머 코어 집중반',
      activeApparatus: 'reformer',
      activeLevel: '1.5',
      activeSteps: [
        {
          stepId: 'log-step-1',
          order: 1,
          exerciseId: INITIAL_EXERCISES[0]!.id,
          blockCategory: INITIAL_EXERCISES[0]!.blockCategory,
          durationMin: 4,
          selectedLayer: 'standard',
        },
      ],
    });
    const logRender = render(<LogSessionModal sequenceId="seq-log-p10" onClose={vi.fn()} />);
    expect(screen.getByTestId('log-session-3d-banner')).toBeVisible();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    fireEvent.click(
      within(screen.getByTestId('log-quick-intensity-chips')).getByRole('button', {
        name: /여유로움/,
      }),
    );
    fireEvent.click(
      within(screen.getByTestId('log-quick-rating-chips')).getByRole('button', {
        name: '수업 만족도 5점',
      }),
    );
    logRender.unmount();

    // 4. P12: ClassBinderView 3D saved card preview + 1-tap modular block insertion shelf
    usePilatesStore.setState({
      savedSequences: [...INITIAL_SAVED_SEQUENCES.slice(0, 1)],
      activeSteps: [],
    });
    const binderRender = render(<ClassBinderView onOpenLogModal={vi.fn()} view="saved" />);
    expect(screen.getAllByTestId('binder-saved-card-3d-preview')[0]).toBeVisible();
    const blockShelf = screen.getByTestId('binder-reusable-blocks-shelf');
    fireEvent.click(
      within(blockShelf).getAllByRole('button', { name: /현재 수업안에 블록 넣기/ })[0]!,
    );
    expect(usePilatesStore.getState().activeSteps.length).toBeGreaterThan(0);
    binderRender.unmount();

    // 5. P13 & P14: FreeAiAssistantPanel 3D thumbs + YouTubeClipperModal spring presets & 3D preview
    const approvedList = INITIAL_EXERCISES.slice(0, 8).map((item) => {
      const base = { ...item, apparatus: 'reformer' as const, springs: '2R 1B' };
      return {
        ...base,
        review: {
          status: 'approved' as const,
          reviewerAlias: 'QA',
          reviewedAt: '2026-11-12T00:00:00.000Z',
          revision: exerciseRevision(base),
          scope: 'planning-metadata' as const,
          credentialVerified: false as const,
        },
      };
    });
    const aiRender = render(
      <FreeAiAssistantPanel
        exercises={approvedList}
        conditionTemplates={[]}
        onApplyDraftSequence={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '조건으로 초안 만들기' }));
    const stepThumbs = await screen.findAllByTestId('free-ai-step-3d-thumb');
    expect(stepThumbs.length).toBeGreaterThan(0);
    aiRender.unmount();

    const clipRender = render(<YouTubeClipperModal open onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '입력 형식 예시 넣기' }));
    fireEvent.click(
      within(screen.getByTestId('clipper-spring-preset-chips')).getByRole('button', {
        name: '2R 1B',
      }),
    );
    expect(screen.getByTestId('clipper-3d-setup-preview')).toHaveTextContent('빨강×2');
    clipRender.unmount();

    // 6. Offline PWA Service Worker /motion-studio3d/*.png rule + StudioOffline3dReadinessCard
    const swSrc = createServiceWorkerSource('v-test', ['assets/app.js']);
    expect(swSrc).toContain("url.pathname.startsWith('/motion-studio3d/')");
    const offlineRender = render(<StudioOffline3dReadinessCard />);
    expect(screen.getByTestId('studio-offline-3d-readiness-card')).toBeVisible();
    offlineRender.unmount();

    // 7. 1-Page Visual 3D Cue Sheet (2-col print vs 1-col tablet + spring delta callout)
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    const cueRender = render(
      <OnePageVisual3DCueSheet
        title="리포머 & 체어 통합 시각 큐시트"
        apparatus="reformer"
        level="2.0"
        steps={zigZagSteps}
        exercises={[warmEx, mainSupineA, mainSittingBox, mainSupineB, coolEx]}
      />,
    );
    const cueSheet = screen.getByTestId('one-page-visual-3d-cuesheet');
    expect(cueSheet).toHaveAttribute('data-layout-density', 'two-col-print');
    expect(screen.getAllByTestId('visual-1p-cuesheet-row')).toHaveLength(5);
    expect(screen.getAllByTestId('visual-1p-spring-delta').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /태블릿 1열 크게 보기/ }));
    expect(cueSheet).toHaveAttribute('data-layout-density', 'single-col-tablet');
    fireEvent.click(screen.getByTestId('one-page-visual-cuesheet-print-btn'));
    expect(printSpy).toHaveBeenCalledTimes(1);
    cueRender.unmount();
  });
});
