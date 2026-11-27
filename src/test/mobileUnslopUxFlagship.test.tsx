import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import { IntuitiveAnatomyGuideCard } from '../components/IntuitiveAnatomyGuideCard';
import { ZeroTransitionNextStrip } from '../components/ZeroTransitionNextStrip';
import { QuickRemixSheet } from '../components/QuickRemixSheet';
import { SequenceStudioWorkbench } from '../components/SequenceStudioWorkbench';
import { ExerciseAtlasView } from '../components/ExerciseAtlasView';
import { LiveStageView } from '../components/LiveStageView';
import { YouTubePreviewModal } from '../components/YouTubePreviewModal';
import { StudioInteractive3DViewport } from '../components/StudioInteractive3DViewport';
import {
  formatDifficultyMeta,
  recommendZeroTransitionNext,
} from '../utils/instructorUxHelpers';
import {
  registerStudioTrackAdapters,
  resetStudioTrackAdaptersForTests,
} from '../utils/studioTrackSlots';

const originalStore = usePilatesStore.getState();

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  resetStudioTrackAdaptersForTests();
  vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(function (
    this: HTMLDialogElement,
  ) {
    this.setAttribute('open', '');
  });
  vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function (
    this: HTMLDialogElement,
  ) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  });
});

afterEach(() => {
  cleanup();
  resetStudioTrackAdaptersForTests();
  vi.restoreAllMocks();
  usePilatesStore.setState(originalStore, true);
  localStorage.clear();
  sessionStorage.clear();
});

describe('Mobile-First Unslop Flagship Instructor UX', () => {
  it('formats difficulty labels consistently as 입문 ★☆☆, 중급 ★★☆, 심화 ★★★', () => {
    expect(formatDifficultyMeta('1.0').fullLabel).toBe('입문 ★☆☆');
    expect(formatDifficultyMeta('1.5').fullLabel).toBe('중급 ★★☆');
    expect(formatDifficultyMeta('2.0').fullLabel).toBe('심화 ★★★');
  });

  it('renders the 4-card IntuitiveAnatomyGuideCard with Nano Banana artwork fallback, voice slot, and Pilates fundamentals drawer', () => {
    const footwork = INITIAL_EXERCISES.find((ex) => ex.id === 'ex-footwork-01')!;
    const onInsertCue = vi.fn();

    registerStudioTrackAdapters({
      renderNaturalVoiceSpeakButton: ({ exercise }) => (
        <button type="button" data-testid="mock-voice-slot-btn">
          {exercise.nameKo} 음성 듣기
        </button>
      ),
    });

    render(<IntuitiveAnatomyGuideCard exercise={footwork} onInsertCue={onInsertCue} />);

    expect(screen.getByTestId('intuitive-anatomy-guide-card')).toBeVisible();
    expect(screen.getByTestId('anatomy-difficulty-badge')).toHaveTextContent('입문 ★☆☆');
    expect(screen.getByTestId('mock-voice-slot-btn')).toBeVisible();
    expect(screen.getByTestId('anatomy-tile-benefits')).toHaveTextContent('이 동작으로 좋아지는 점');
    expect(screen.getByTestId('anatomy-tile-muscles')).toHaveTextContent('힘 들어가는 근육 지도');
    expect(screen.getByTestId('anatomy-tile-mechanics')).toHaveTextContent('몸을 받쳐 주는 곳');
    expect(screen.getByTestId('anatomy-tile-faults')).toHaveTextContent('이럴 땐 이렇게 해 보세요');

    // Anatomy illustration gracefully degrades from webp -> png -> inline SVG schematic on error
    const img = screen.getByAltText(/근육 지도/);
    expect(img).toHaveAttribute('src', expect.stringContaining('/images/atelier-anatomy/anatomy-'));
    fireEvent.error(img);
    expect(img).toHaveAttribute('src', expect.stringContaining('.png'));
    fireEvent.error(img);
    expect(screen.getByRole('img', { name: '활성 근육 부위 도식' })).toBeInTheDocument();

    // One-tap fix cue insertion works
    const insertBtns = screen.getAllByRole('button', { name: /수업 메모에 넣기/ });
    fireEvent.click(insertBtns[0]!);
    expect(onInsertCue).toHaveBeenCalledTimes(1);

    // Fundamentals drawer expands with 4 core cards
    const drawer = screen.getByTestId('pilates-fundamentals-drawer');
    expect(drawer).toHaveTextContent('필라테스 기초 지식 한눈에');
    expect(drawer).toHaveTextContent('흉곽 호흡');
    expect(drawer).toHaveTextContent('중립 골반');
    expect(drawer).toHaveTextContent('스프링 원리');
    expect(drawer).toHaveTextContent('등을 움직이는 네 방향');
  });

  it('recommends 3 zero-transition next exercises and inserts golden 10-min combos', () => {
    const reformerPool = INITIAL_EXERCISES.filter((ex) => ex.apparatus === 'reformer');
    const lastEx = reformerPool.find((ex) => ex.bodyPosition === 'supine') ?? reformerPool[0]!;
    const recs = recommendZeroTransitionNext(lastEx, reformerPool, new Set([lastEx.id]), 'reformer');
    expect(recs).toHaveLength(3);
    expect(recs.every((rec) => rec.exercise.id !== lastEx.id)).toBe(true);

    const onAdd = vi.fn();
    const onInsertCombo = vi.fn();
    const onOpenRemix = vi.fn();

    render(
      <ZeroTransitionNextStrip
        lastExercise={lastEx}
        exercises={reformerPool}
        includedExerciseIds={new Set([lastEx.id])}
        targetApparatus="reformer"
        onAddExercise={onAdd}
        onInsertCombo={onInsertCombo}
        onOpenRemix={onOpenRemix}
      />,
    );

    const strip = screen.getByTestId('zero-transition-next-strip');
    expect(strip).toHaveTextContent('동선 제로 추천');
    expect(strip).toHaveTextContent('황금 10분 콤보 끼워넣기');

    fireEvent.click(screen.getByTestId(`zero-next-chip-${recs[0]!.exercise.id}`));
    expect(onAdd).toHaveBeenCalledWith(recs[0]!.exercise);

    fireEvent.click(screen.getByTestId('zero-transition-remix-last-btn'));
    expect(onOpenRemix).toHaveBeenCalledWith(lastEx);

    const comboButtons = within(screen.getByRole('list', { name: '황금 10분 콤보 목록' })).getAllByRole(
      'listitem',
    );
    expect(comboButtons.length).toBeGreaterThan(0);
    fireEvent.click(comboButtons[0]!);
    expect(onInsertCombo).toHaveBeenCalledTimes(1);
  });

  it('creates and adds a 10-second remixed variation via QuickRemixSheet', () => {
    const baseEx = INITIAL_EXERCISES.find((ex) => ex.id === 'ex-footwork-01')!;
    const onCreateAndAdd = vi.fn();
    const onClose = vi.fn();

    render(
      <QuickRemixSheet
        open
        baseExercise={baseEx}
        onClose={onClose}
        onCreateAndAdd={onCreateAndAdd}
      />,
    );

    fireEvent.click(screen.getByTestId('remix-prop-magic-circle'));
    fireEvent.click(screen.getByTestId('remix-mod-single-leg'));

    const preview = screen.getByTestId('quick-remix-preview');
    expect(preview).toHaveTextContent('써클링');
    expect(preview).toHaveTextContent('한 다리 변형');

    fireEvent.click(screen.getByTestId('quick-remix-confirm-btn'));
    expect(onCreateAndAdd).toHaveBeenCalledTimes(1);
    const created = onCreateAndAdd.mock.calls[0]![0];
    expect(created.props).toContain('magic-circle');
    expect(created.isUnilateral).toBe(true);
    expect(created.isCustom).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('supports one-tap difficulty filters, editorial apparatus hero, zero-transition strip, and mobile action bar in SequenceStudioWorkbench & ExerciseAtlasView', () => {
    usePilatesStore.setState(
      {
        ...originalStore,
        exercises: INITIAL_EXERCISES,
        ownedApparatus: ['reformer', 'mat', 'cadillac', 'chair', 'barrel'],
        ownedEquipment: ['reformer', 'mat', 'cadillac', 'chair', 'barrel'],
        ownedProps: ['none', 'mini-ball', 'magic-circle', 'foam-roller', 'theraband'],
        activeApparatus: 'reformer',
        activeLevel: '2.0',
        activeSteps: [],
      },
      true,
    );

    const { unmount } = render(
      <SequenceStudioWorkbench
        onOpenYouTubePreview={vi.fn()}
        onOpenClipper={vi.fn()}
        onOpenLogModal={vi.fn()}
        onOpenInventory={vi.fn()}
        onStartClass={vi.fn()}
      />,
    );

    expect(screen.getByTestId('editorial-apparatus-hero-reformer')).toBeVisible();
    expect(screen.getByTestId('workbench-difficulty-filter-row')).toBeVisible();
    expect(screen.getByTestId('zero-transition-next-strip')).toBeVisible();
    expect(screen.queryByTestId('mobile-simple-sequence-bar')).toBeNull();
    const picker = screen.getByRole('complementary', { name: '수업에 추가할 동작' });
    fireEvent.click(within(picker).getAllByRole('button', { name: / 추가$/ })[0]!);
    expect(screen.getByTestId('mobile-simple-sequence-bar')).toBeInTheDocument();

    // One-tap difficulty filter in workbench
    fireEvent.click(
      within(screen.getByTestId('workbench-difficulty-filter-row')).getByRole('button', {
        name: '입문 ★☆☆',
      }),
    );
    expect(
      within(screen.getByTestId('workbench-difficulty-filter-row')).getByRole('button', {
        name: '입문 ★☆☆',
      }),
    ).toHaveAttribute('aria-pressed', 'true');

    unmount();

    // ExerciseAtlasView everyday catalog has one-tap difficulty chips, editorial hero, and fundamentals drawer
    render(<ExerciseAtlasView onOpenYouTubePreview={vi.fn()} onOpenClipper={vi.fn()} />);
    expect(screen.getByTestId('atlas-difficulty-filter-row')).toBeVisible();
    expect(screen.getByTestId('pilates-fundamentals-drawer')).toBeInTheDocument();

    fireEvent.click(
      within(screen.getByTestId('atlas-difficulty-filter-row')).getByRole('button', {
        name: '중급 ★★☆',
      }),
    );
    expect(
      within(screen.getByTestId('atlas-difficulty-filter-row')).getByRole('button', {
        name: '중급 ★★☆',
      }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('provides live Plan B 1-tap alternatives and giant-legibility Stand Mode without review advisory in LiveStageView', () => {
    const reformerPool = INITIAL_EXERCISES.filter((ex) => ex.apparatus === 'reformer');
    const first = reformerPool[0]!;
    const second = reformerPool[1]!;

    usePilatesStore.setState(
      {
        ...originalStore,
        exercises: reformerPool,
        activeTab: 'stage',
        activeSequenceId: 'live-flagship-test',
        activeTitle: '모바일 현장 수업',
        activeTargetMinutes: 20,
        activeSteps: [
          {
            stepId: 'step-1',
            order: 1,
            exerciseId: first.id,
            blockCategory: first.blockCategory,
            durationMin: 4,
            selectedLayer: 'standard',
          },
          {
            stepId: 'step-2',
            order: 2,
            exerciseId: second.id,
            blockCategory: second.blockCategory,
            durationMin: 4,
            selectedLayer: 'standard',
          },
        ],
      },
      true,
    );

    const { container } = render(<LiveStageView onOpenLogModal={vi.fn()} />);

    // Review advisory banner is completely absent from LiveStageView
    expect(container.querySelector('.teaching-review-advisory')).toBeNull();
    expect(container.textContent).not.toContain('검토 기록은 자격 인증이나');

    // Plan B quick swap works without mutating original saved sequence
    expect(screen.getByTestId('live-stage-plan-b-bar')).toBeVisible();
    fireEvent.click(screen.getByTestId('live-plan-b-btn-wrist'));
    const suggestions = screen.getByTestId('live-stage-plan-b-suggestions');
    expect(suggestions).toBeVisible();

    const swapButtons = within(suggestions).getAllByRole('button', { name: '바로 바꾸기' });
    expect(swapButtons.length).toBeGreaterThan(0);
    fireEvent.click(swapButtons[0]!);
    expect(screen.getByText(/원본 시퀀스는 그대로 유지/)).toBeVisible();
    // Original store step remains untouched
    expect(usePilatesStore.getState().activeSteps[0]?.exerciseId).toBe(first.id);

    // Stand Mode toggle shows giant-legibility unobstructed card
    fireEvent.click(screen.getByTestId('live-stage-stand-mode-toggle'));
    const standCard = screen.getByTestId('live-stage-stand-card');
    expect(standCard).toBeVisible();
    expect(standCard).toHaveTextContent('핵심 큐 1줄');
    expect(standCard).toHaveTextContent('현재 스프링');
    expect(standCard).toHaveTextContent('다음 동작 · 스프링');
  });

  it('keeps 3D canvas unobstructed by placing HUD outside .pf-orbit3d-canvas-wrap and renders anatomy guide in YouTubePreviewModal', () => {
    const sample = INITIAL_EXERCISES.find((ex) => ex.id === 'ex-footwork-01')!;
    const { container, unmount } = render(<StudioInteractive3DViewport exercise={sample} />);

    const canvasWrap = container.querySelector('.pf-orbit3d-canvas-wrap')!;
    expect(canvasWrap.querySelector('.pf-orbit3d-hud-top')).toBeNull();
    expect(container.querySelector('.pf-orbit3d-stage-bar .pf-orbit3d-hud-top')).not.toBeNull();

    unmount();

    render(<YouTubePreviewModal exercise={sample} onClose={vi.fn()} />);
    expect(screen.getByTestId('intuitive-anatomy-guide-card')).not.toBeVisible();
    fireEvent.click(screen.getByText('움직이는 부위와 비슷한 동작'));
    expect(screen.getByTestId('intuitive-anatomy-guide-card')).toBeVisible();

    // Verify flagship CSS enforces Shift-Left audit hiding and mobile unobstructed stage rules
    const css = readFileSync(
      resolve(__dirname, '../styles/mobile-atelier-unslop-flagship.css'),
      'utf8',
    );
    expect(css).toContain('.pf-shift-left-audit-only');
    expect(css).toContain('.pf-mobile-simple-seq-bar');
    expect(css).toContain('overflow-x: clip');
  });
});
