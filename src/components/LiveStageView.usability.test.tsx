import { createRef } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveStageView, type LiveStageNavigationHandle } from './LiveStageView';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import type { PilatesExercise, SequenceStep } from '../types/pilates';
import { exerciseRevision, isExerciseAutoEligible } from '../utils/exerciseReview';

const originalStore = usePilatesStore.getState();
const productionSnapshot = structuredClone(INITIAL_EXERCISES);

function buildApprovedSynthetic(
  base: PilatesExercise,
  overrides: Partial<PilatesExercise>,
): PilatesExercise {
  const draft: PilatesExercise = {
    ...base,
    ...overrides,
    review: undefined,
  };
  return {
    ...draft,
    review: {
      status: 'approved',
      scope: 'planning-metadata',
      credentialVerified: false,
      reviewerAlias: 'Synthetic QA reviewer · test only',
      reviewedAt: '2026-11-11T00:00:00.000Z',
      revision: exerciseRevision(draft),
    },
  };
}

const warmupEx = buildApprovedSynthetic(syntheticPlanningExercise('reformer', 'warmup', 'alpha'), {
  springs: '1R 1B',
  box: 'none',
});
const mainEx = buildApprovedSynthetic(syntheticPlanningExercise('reformer', 'core', 'alpha'), {
  springs: '2R',
  box: 'short-box',
});
const cooldownEx = buildApprovedSynthetic(
  syntheticPlanningExercise('reformer', 'cooldown', 'alpha'),
  {
    springs: '1B',
    box: 'none',
  },
);

const THREE_STAGE_STEPS: SequenceStep[] = [
  {
    stepId: 'usability-step-1',
    order: 1,
    exerciseId: warmupEx.id,
    blockCategory: 'warmup',
    durationMin: 1,
    explanationSec: 10,
    transitionSec: 10,
    selectedLayer: 'standard',
  },
  {
    stepId: 'usability-step-2',
    order: 2,
    exerciseId: mainEx.id,
    blockCategory: 'core',
    durationMin: 2,
    explanationSec: 10,
    transitionSec: 10,
    selectedLayer: 'standard',
  },
  {
    stepId: 'usability-step-3',
    order: 3,
    exerciseId: cooldownEx.id,
    blockCategory: 'cooldown',
    durationMin: 3,
    explanationSec: 10,
    transitionSec: 0,
    selectedLayer: 'standard',
  },
];

class FakeUtterance {
  voice: SpeechSynthesisVoice | null = null;
  lang = '';
  rate = 1;
  onerror: ((event: { error: string }) => void) | null = null;
  constructor(public text: string) {}
}

const localVoice = {
  voiceURI: 'local-ko-usability',
  name: 'Korean Local',
  lang: 'ko-KR',
  localService: true,
  default: true,
} as SpeechSynthesisVoice;

const synthMock = Object.assign(new EventTarget(), {
  speak: vi.fn(),
  cancel: vi.fn(),
  getVoices: vi.fn(() => [localVoice]),
});

function advanceWallClockSec(seconds: number): void {
  act(() => {
    vi.setSystemTime(Date.now() + seconds * 1000);
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

describe('LiveStageView instructor teaching flow & mistake recovery usability', () => {
  const initialInnerWidth = window.innerWidth;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(new Date('2026-11-11T09:00:00.000Z'));
    synthMock.speak.mockReset();
    synthMock.cancel.mockReset();
    synthMock.getVoices.mockReturnValue([localVoice]);
    vi.stubGlobal('speechSynthesis', synthMock);
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1280,
    });

    usePilatesStore.setState({
      ...originalStore,
      activeTab: 'stage',
      activeSequenceId: 'usability-seq-1',
      activeTitle: '강사 수업 진행 사용성 검증',
      activeTargetMinutes: 6,
      activeSteps: structuredClone(THREE_STAGE_STEPS),
      exercises: [...INITIAL_EXERCISES, warmupEx, mainEx, cooldownEx],
      historyLogs: [],
    });
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: initialInnerWidth,
    });
    vi.useRealTimers();
    vi.unstubAllGlobals();
    expect(INITIAL_EXERCISES).toEqual(productionSnapshot);
    expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
    usePilatesStore.setState(originalStore, true);
  });

  it('guides ready -> start -> pause/resume -> step completion 1-tap start -> final finish while tracking remaining class time and current spring setup', () => {
    const onOpenLogModal = vi.fn();
    render(<LiveStageView onOpenLogModal={onOpenLogModal} />);

    // 1. Ready state: compact entry (no premature action/undo banners), remaining class time = 06:00, inline spring setup visible
    expect(screen.getByTestId('live-stage-remaining-class-time')).toHaveTextContent(
      '남은 수업 06:00',
    );
    expect(screen.getByTestId('live-stage-current-setup-summary')).toHaveTextContent(
      '리포머 · 수파인 (누운 자세) · 1R 1B',
    );
    expect(screen.queryByTestId('live-stage-next-action-bar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('live-stage-undo-banner')).not.toBeInTheDocument();

    // Opt in to device voice to verify 1-tap next-step start preserves voice contract
    fireEvent.click(screen.getByRole('button', { name: '음성 안내 켜기' }));
    fireEvent.click(screen.getByRole('button', { name: '수업 시작' }));
    expect(synthMock.speak).toHaveBeenCalledTimes(1);

    // 2. Pause mid-step: highlights paused panel/status, freezes timer & remaining class time during pause, and resumes cleanly
    advanceWallClockSec(25);
    expect(screen.getByRole('timer')).toHaveTextContent('00:35');
    expect(screen.getByTestId('live-stage-remaining-class-time')).toHaveTextContent(
      '남은 수업 05:35',
    );

    fireEvent.click(screen.getByRole('button', { name: '일시정지' }));
    expect(synthMock.cancel).toHaveBeenCalled();
    const currentPanel = screen.getByRole('region', { name: '현재 동작' });
    expect(currentPanel).toHaveClass('is-paused');
    expect(screen.getByTestId('live-stage-next-action-bar')).toHaveTextContent(
      '잠시 멈춤 · ‘이어서 진행’(Space)을 누르면 남은 00:35부터 바로 이어갑니다.',
    );

    // Pausing for 180s does not consume timer or class time
    advanceWallClockSec(180);
    expect(screen.getByRole('timer')).toHaveTextContent('00:35');
    expect(screen.getByTestId('live-stage-remaining-class-time')).toHaveTextContent(
      '남은 수업 05:35',
    );

    // Resume and complete Step 1 (remaining 35s)
    fireEvent.click(screen.getByRole('button', { name: '이어서 진행' }));
    expect(currentPanel).not.toHaveClass('is-paused');
    advanceWallClockSec(35);

    // 3. Step 1 completed at 00:00 (autoAdvance off): exposes 1-tap '다음 순서 바로 시작' without forcing restart of Step 1
    expect(screen.getByRole('timer')).toHaveTextContent('00:00');
    expect(screen.getByTestId('live-stage-remaining-class-time')).toHaveTextContent(
      '남은 수업 05:00',
    );
    const startNextBtn = screen.getByTestId('live-stage-start-next-btn');
    expect(startNextBtn).toHaveTextContent('다음 순서 바로 시작');

    fireEvent.click(startNextBtn);
    expect(screen.getByRole('heading', { level: 2, name: mainEx.nameKo })).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('02:00');
    expect(screen.getByRole('button', { name: '일시정지' })).toBeInTheDocument();
    expect(screen.getByTestId('live-stage-current-setup-summary')).toHaveTextContent(
      '리포머 · 수파인 (누운 자세) · 2R · 숏박스',
    );
    const lastSpoken = synthMock.speak.mock.calls.at(-1)?.[0] as FakeUtterance;
    expect(lastSpoken.text).toContain(mainEx.nameKo);

    // Outline marks Step 1 as taught
    const outlineStep1Btn = within(
      screen.getByText('오늘의 흐름', { selector: 'summary' }).closest('details')!,
    ).getByRole('button', { name: new RegExp(warmupEx.nameKo) });
    expect(outlineStep1Btn).toHaveClass('is-taught');

    // 4. Jump to final step (Step 3), run 10s, and finish directly from thumb-zone CTA
    fireEvent.click(screen.getByRole('button', { name: '다음 동작' }));
    expect(screen.getByRole('heading', { level: 2, name: cooldownEx.nameKo })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다음 동작' })).toBeDisabled();

    advanceWallClockSec(10);
    const finishCta = screen.getByTestId('live-stage-finish-cta-btn');
    fireEvent.click(finishCta);

    const reviewDialog = screen.getByRole('dialog', { name: '수업 진행을 마칠까요?' });
    // Total taught active time: 60s (Step 1) + 0s (Step 2) + 10s (Step 3) = 70s (01:10)
    expect(within(reviewDialog).getByText('01:10')).toBeInTheDocument();
    fireEvent.click(within(reviewDialog).getByRole('button', { name: '검토하고 기록하기' }));

    expect(onOpenLogModal).toHaveBeenCalledWith(
      'usability-seq-1',
      expect.objectContaining({
        actualDurationSec: 70,
        taughtStepIds: ['usability-step-1', 'usability-step-3'],
      }),
    );
  });

  it('recovers accidental single and rapid double-tap step jumps with exact remaining time, running state, and honest elapsed time', () => {
    const onOpenLogModal = vi.fn();
    render(<LiveStageView onOpenLogModal={onOpenLogModal} />);

    fireEvent.click(screen.getByRole('button', { name: '수업 시작' }));
    advanceWallClockSec(22);
    expect(screen.getByRole('timer')).toHaveTextContent('00:38');

    // Simulate accidental rapid double-tap on '다음 동작' (Step 1 -> Step 2 -> Step 3 within < 1.5s)
    const nextBtn = screen.getByRole('button', { name: '다음 동작' });
    fireEvent.click(nextBtn);
    fireEvent.click(nextBtn);

    expect(screen.getByRole('heading', { level: 2, name: cooldownEx.nameKo })).toBeInTheDocument();
    const undoBanner = screen.getByTestId('live-stage-undo-banner');
    expect(undoBanner).toHaveTextContent('01번');
    expect(undoBanner).toHaveTextContent('남은 00:38');

    // 3 seconds pass on Step 3 before instructor taps '방금 이동 되돌리기'
    advanceWallClockSec(3);
    fireEvent.click(screen.getByTestId('live-stage-undo-btn'));

    // Restores Step 1 with exact 00:38 remaining and running=true, while preserving honest 25s total elapsed time
    expect(screen.queryByTestId('live-stage-undo-banner')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: warmupEx.nameKo })).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('00:38');
    expect(screen.getByRole('button', { name: '일시정지' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '종료 / 기록' }));
    fireEvent.click(screen.getByRole('button', { name: '검토하고 기록하기' }));
    expect(onOpenLogModal).toHaveBeenCalledWith(
      'usability-seq-1',
      expect.objectContaining({
        actualDurationSec: 25,
      }),
    );
  });

  it('handles rapid repeated +1분 추가 clicks without stale closures, steps back via undo, and preserves exit confirmation contract', () => {
    const onNavigate = vi.fn();
    const navRef = createRef<LiveStageNavigationHandle>();
    render(
      <LiveStageView
        onOpenLogModal={vi.fn()}
        navigationRef={navRef}
        onNavigate={onNavigate}
      />,
    );

    const requestStageExit = (destination: 'workbench' | 'history' = 'history') => {
      let intercepted = false;
      act(() => {
        intercepted = navRef.current?.requestExit(destination) ?? false;
      });
      return intercepted;
    };

    // Clean idle state does not block navigation or open dialog
    expect(requestStageExit('history')).toBe(false);
    expect(screen.queryByRole('dialog', { name: '수업 화면을 나갈까요?' })).not.toBeInTheDocument();
    expect(onNavigate).not.toHaveBeenCalled();

    // Rapidly click '+1분 추가' 3 times in a single synchronous burst (1m -> 4m)
    const addMinBtn = screen.getByRole('button', { name: '현재 동작 1분 추가' });
    fireEvent.click(addMinBtn);
    fireEvent.click(addMinBtn);
    fireEvent.click(addMinBtn);

    expect(screen.getByRole('timer')).toHaveTextContent('04:00');
    expect(screen.getByTestId('live-stage-remaining-class-time')).toHaveTextContent(
      '남은 수업 09:00',
    );
    expect(screen.getByTestId('live-stage-undo-banner')).toHaveTextContent('+3분');

    // Dirty session-only duration triggers exit confirmation modal; '수업 화면 유지' keeps stage & +3m state
    expect(requestStageExit('history')).toBe(true);
    const dirtyExitDialog = screen.getByRole('dialog', { name: '수업 화면을 나갈까요?' });
    expect(dirtyExitDialog).toBeVisible();
    expect(within(dirtyExitDialog).getByText('이동할 화면: 수업 기록')).toBeInTheDocument();
    fireEvent.click(within(dirtyExitDialog).getByRole('button', { name: '수업 화면 유지' }));
    expect(screen.queryByRole('dialog', { name: '수업 화면을 나갈까요?' })).not.toBeInTheDocument();
    expect(onNavigate).not.toHaveBeenCalled();
    expect(screen.getByRole('timer')).toHaveTextContent('04:00');

    // Undo 3 times steps cleanly back 4m -> 3m -> 2m -> 1m and clears dirty state
    fireEvent.click(screen.getByTestId('live-stage-undo-btn'));
    expect(screen.getByRole('timer')).toHaveTextContent('03:00');
    fireEvent.click(screen.getByTestId('live-stage-undo-btn'));
    expect(screen.getByRole('timer')).toHaveTextContent('02:00');
    fireEvent.click(screen.getByTestId('live-stage-undo-btn'));
    expect(screen.getByRole('timer')).toHaveTextContent('01:00');
    expect(screen.queryByTestId('live-stage-undo-banner')).not.toBeInTheDocument();

    // Original store plan was never mutated and idle exit no longer prompts unnecessarily
    expect(usePilatesStore.getState().activeSteps[0].durationMin).toBe(1);
    expect(requestStageExit('history')).toBe(false);
    expect(screen.queryByRole('dialog', { name: '수업 화면을 나갈까요?' })).not.toBeInTheDocument();

    // Rapid play/pause toggles stay deterministic, then verify stay & actual exit on running session
    const playPause = () =>
      screen.getByRole('button', { name: /^(수업 시작|일시정지|이어서 진행)$/ });
    fireEvent.click(playPause());
    fireEvent.click(playPause());
    fireEvent.click(playPause());
    expect(screen.getByRole('button', { name: '일시정지' })).toBeInTheDocument();

    advanceWallClockSec(6);
    expect(screen.getByRole('timer')).toHaveTextContent('00:54');

    // Intercept exit during running session -> pauses timer & shows dialog; verify stay first, then actual exit
    expect(requestStageExit('history')).toBe(true);
    const stayDialog = screen.getByRole('dialog', { name: '수업 화면을 나갈까요?' });
    expect(stayDialog).toBeVisible();
    advanceWallClockSec(30);
    expect(screen.getByRole('timer')).toHaveTextContent('00:54');
    fireEvent.click(within(stayDialog).getByRole('button', { name: '수업 화면 유지' }));
    expect(screen.queryByRole('dialog', { name: '수업 화면을 나갈까요?' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '이어서 진행' })).toBeInTheDocument();
    expect(onNavigate).not.toHaveBeenCalled();

    expect(requestStageExit('history')).toBe(true);
    const leaveDialog = screen.getByRole('dialog', { name: '수업 화면을 나갈까요?' });
    expect(within(leaveDialog).getByText('이동할 화면: 수업 기록')).toBeInTheDocument();
    fireEvent.click(within(leaveDialog).getByRole('button', { name: '기록 없이 나가기' }));
    expect(screen.queryByRole('dialog', { name: '수업 화면을 나갈까요?' })).not.toBeInTheDocument();
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith('history');
    expect(usePilatesStore.getState().historyLogs).toHaveLength(0);
  });

  it('supports keyboard Space, ArrowLeft/ArrowRight, and Backspace mistake recovery while ignoring interactive focus and open dialogs', () => {
    render(<LiveStageView onOpenLogModal={vi.fn()} />);

    // Space starts timer
    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    expect(screen.getByRole('button', { name: '일시정지' })).toBeInTheDocument();
    advanceWallClockSec(15);
    expect(screen.getByRole('timer')).toHaveTextContent('00:45');

    // ArrowRight jumps to Step 2; keyboard hint displays Backspace undo shortcut
    fireEvent.keyDown(window, { key: 'ArrowRight', code: 'ArrowRight' });
    expect(screen.getByRole('heading', { level: 2, name: mainEx.nameKo })).toBeInTheDocument();
    expect(screen.getByLabelText('키보드 단축키 안내')).toHaveTextContent('방금 조작 복구');

    // When focus is inside an interactive button, Backspace / Space are ignored by global handler
    const dismissBtn = screen.getByTestId('live-stage-undo-dismiss');
    dismissBtn.focus();
    fireEvent.keyDown(dismissBtn, { key: 'Backspace', code: 'Backspace' });
    expect(screen.getByRole('heading', { level: 2, name: mainEx.nameKo })).toBeInTheDocument();

    // Blur back to body: Backspace restores Step 1 at 00:45
    dismissBtn.blur();
    fireEvent.keyDown(window, { key: 'Backspace', code: 'Backspace' });
    expect(screen.getByRole('heading', { level: 2, name: warmupEx.nameKo })).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('00:45');

    // While exit dialog is open, global keyboard shortcuts are ignored
    fireEvent.click(screen.getByRole('button', { name: '계획으로' }));
    expect(screen.getByRole('dialog', { name: '수업 화면을 나갈까요?' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'ArrowRight', code: 'ArrowRight' });
    expect(screen.getByRole('heading', { level: 2, name: warmupEx.nameKo })).toBeInTheDocument();
  });

  it('adapts to 390px mobile viewport with collapsed outline by default and >= 44px touch targets in CSS', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 390,
    });

    render(<LiveStageView onOpenLogModal={vi.fn()} />);

    const outlineDetails = screen
      .getByText('오늘의 흐름', { selector: 'summary' })
      .closest('details');
    expect(outlineDetails).not.toHaveAttribute('open');

    // Trigger mobile undo banner and dismiss cleanly
    fireEvent.click(screen.getByRole('button', { name: '다음 동작' }));
    expect(screen.getByTestId('live-stage-undo-banner')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('live-stage-undo-dismiss'));
    expect(screen.queryByTestId('live-stage-undo-banner')).not.toBeInTheDocument();

    const css = readFileSync(resolve(__dirname, './LiveStageView.css'), 'utf8');
    expect(css).toContain('.teaching-next-action-bar button');
    expect(css).toContain('.teaching-undo-banner button');
    expect(css).toContain('min-height: 44px');
    expect(css).toContain('flex-direction: column');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('passes an explicit empty taughtStepIds array and exact +1m step snapshot without mutating activeSteps when finishing a paused zero-timer session', () => {
    const pausedPlan: SequenceStep[] = [
      {
        stepId: 'paused-step-0',
        order: 1,
        exerciseId: warmupEx.id,
        blockCategory: 'warmup',
        durationMin: 233 / 60,
        explanationSec: 20,
        transitionSec: 0,
        selectedLayer: 'standard',
      },
      {
        stepId: 'paused-step-1',
        order: 2,
        exerciseId: mainEx.id,
        blockCategory: 'core',
        durationMin: 317 / 60,
        explanationSec: 20,
        transitionSec: 15,
        selectedLayer: 'standard',
      },
    ];
    usePilatesStore.setState({
      activeSequenceId: 'paused-session-seq',
      activeTitle: '오전 매트 흐름',
      activeSteps: structuredClone(pausedPlan),
    });

    const onOpenLogModal = vi.fn();
    render(<LiveStageView onOpenLogModal={onOpenLogModal} />);

    fireEvent.click(screen.getByRole('button', { name: '현재 동작 1분 추가' }));
    expect(usePilatesStore.getState().activeSteps).toEqual(pausedPlan);

    fireEvent.click(screen.getByRole('button', { name: '다음 동작' }));
    fireEvent.click(screen.getByRole('button', { name: '종료 / 기록' }));
    fireEvent.click(screen.getByRole('button', { name: '검토하고 기록하기' }));

    expect(onOpenLogModal).toHaveBeenCalledTimes(1);
    expect(onOpenLogModal).toHaveBeenCalledWith(
      'paused-session-seq',
      expect.objectContaining({
        actualDurationSec: 0,
        actualRestDurationSec: 0,
        sequenceTitle: '오전 매트 흐름',
        taughtStepIds: [],
        stepsSnapshot: [
          expect.objectContaining({
            stepId: 'paused-step-0',
            durationMin: pausedPlan[0]!.durationMin + 1,
            explanationSec: 20,
            transitionSec: 0,
          }),
          expect.objectContaining({
            stepId: 'paused-step-1',
            durationMin: pausedPlan[1]!.durationMin,
            explanationSec: 20,
            transitionSec: 15,
          }),
        ],
      }),
    );
    expect(usePilatesStore.getState().activeSteps).toEqual(pausedPlan);
  });
});
