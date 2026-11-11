import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getMotionPatternReferences } from '../data/motionPatternReferences';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import type { SequenceStep } from '../types/pilates';
import type { SequenceMotionStudyBinding } from '../types/sequenceMotion';
import { isExerciseAutoEligible } from '../utils/exerciseReview';
import { getStepTiming } from '../utils/sequenceEngine';
import { createSequenceMotionStudyBinding } from '../utils/sequenceMotionBinding';
import { LightDismissDialog } from './LightDismissDialog';
import { StepBlockInspector } from './StepBlockInspector';
import { StepMotionStudyPicker } from './StepMotionStudyPicker';

const originalStore = usePilatesStore.getState();
const catalogSnapshot = structuredClone(INITIAL_EXERCISES);
const originalInnerWidth = window.innerWidth;

const MULTI_EXERCISE_ID = 'original-mat-quadruped-reach';
const OTHER_EXERCISE_ID = 'original-reformer-parallel-footwork';

const multiRefs = getMotionPatternReferences(MULTI_EXERCISE_ID);
const firstCandidate = multiRefs[0]!;
const secondCandidate = multiRefs[1]!;
const otherCandidate = getMotionPatternReferences(OTHER_EXERCISE_ID)[0]!;

const firstBinding = createSequenceMotionStudyBinding(
  MULTI_EXERCISE_ID,
  firstCandidate.family,
  firstCandidate.variantId,
)!;
const secondBinding = createSequenceMotionStudyBinding(
  MULTI_EXERCISE_ID,
  secondCandidate.family,
  secondCandidate.variantId,
)!;
const otherBinding = createSequenceMotionStudyBinding(
  OTHER_EXERCISE_ID,
  otherCandidate.family,
  otherCandidate.variantId,
)!;

const staleBinding: SequenceMotionStudyBinding = {
  ...firstBinding,
  sourceFingerprint: '0'.repeat(64),
  opaque: { preserved: ['stale-binding-record'] },
};

const unsupportedBinding: SequenceMotionStudyBinding = {
  version: 9,
  family: 'future-family',
  variantId: 'future-variant',
  sourceFingerprint: 'f'.repeat(64),
  opaque: { preserved: ['unsupported-binding-record'] },
};

const syntheticMultiExercise = {
  ...syntheticPlanningExercise('mat', 'core', 'alpha', false),
  id: MULTI_EXERCISE_ID,
};
const syntheticApprovedPeer = syntheticPlanningExercise('reformer', 'footwork', 'beta', true);

function setViewportWidth(width: number) {
  act(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: width,
    });
    fireEvent(window, new Event('resize'));
  });
}

function openPickerIfCollapsed(region: HTMLElement) {
  const details = region.querySelector('details');
  if (details && !details.open) {
    details.open = true;
    fireEvent(details, new Event('toggle'));
  }
}

describe('StepMotionStudyPicker browse-vs-select separation and recovery usability', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    setViewportWidth(390);
    usePilatesStore.setState(
      {
        ...originalStore,
        exercises: [
          ...INITIAL_EXERCISES.filter((item) => item.id !== MULTI_EXERCISE_ID),
          syntheticMultiExercise,
          syntheticApprovedPeer,
        ],
        undoStack: [],
        generationError: null,
        saveFeedback: null,
      },
      true,
    );
  });

  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
    window.localStorage.clear();
    setViewportWidth(originalInnerWidth);
    usePilatesStore.setState(originalStore, true);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    expect(INITIAL_EXERCISES).toEqual(catalogSnapshot);
    expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
  });

  it('previews multiple candidates without calling onChange, distinguishes connected vs browsing states, returns to connected choice, and restores trigger focus on close', () => {
    expect(multiRefs.length).toBeGreaterThanOrEqual(2);
    expect(syntheticMultiExercise.id).not.toBe(syntheticApprovedPeer.id);
    expect(isExerciseAutoEligible(syntheticApprovedPeer)).toBe(true);

    const onChangeSpy = vi.fn<(next: SequenceMotionStudyBinding | null) => void>();

    function ControlledPicker() {
      const [current, setCurrent] = useState<SequenceMotionStudyBinding | null>(null);
      return (
        <StepMotionStudyPicker
          exerciseId={MULTI_EXERCISE_ID}
          value={current}
          onChange={(next) => {
            onChangeSpy(next);
            setCurrent(next);
          }}
        />
      );
    }

    render(<ControlledPicker />);
    const region = screen.getByRole('region', { name: '수업에 저장할 모션 초안' });
    openPickerIfCollapsed(region);

    const firstInspectBtn = within(region).getByRole('button', {
      name: `${firstCandidate.title} 도식 살펴보기`,
    });
    const secondInspectBtn = within(region).getByRole('button', {
      name: `${secondCandidate.title} 도식 살펴보기`,
    });
    const firstRadio = within(region).getByRole('radio', {
      name: `${firstCandidate.title} 수업 모션으로 선택`,
    });
    const secondRadio = within(region).getByRole('radio', {
      name: `${secondCandidate.title} 수업 모션으로 선택`,
    });

    // 1. Inspect Candidate 1 & Candidate 2 without selecting -> zero onChange calls
    fireEvent.click(firstInspectBtn);
    expect(onChangeSpy).not.toHaveBeenCalled();
    expect(firstRadio).not.toBeChecked();
    expect(secondRadio).not.toBeChecked();
    expect(firstInspectBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('sms-preview-panel')).toHaveAttribute(
      'data-preview-mode',
      'browsing',
    );
    expect(screen.getByTestId('sms-preview-panel')).toHaveAttribute(
      'data-preview-variant',
      firstCandidate.variantId,
    );
    expect(screen.getByTestId('sms-preview-state')).toHaveTextContent(
      '선택 전 살펴보기 중 · 미연결',
    );

    fireEvent.click(secondInspectBtn);
    expect(onChangeSpy).not.toHaveBeenCalled();
    expect(firstInspectBtn).toHaveAttribute('aria-pressed', 'false');
    expect(secondInspectBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('sms-preview-panel')).toHaveAttribute(
      'data-preview-variant',
      secondCandidate.variantId,
    );

    // 2. Select Candidate 1 via radio -> calls onChange once and marks Candidate 1 connected
    fireEvent.click(firstRadio);
    expect(onChangeSpy).toHaveBeenCalledExactlyOnceWith(firstBinding);
    expect(firstRadio).toBeChecked();
    expect(secondRadio).not.toBeChecked();
    expect(screen.getByTestId('sms-preview-panel')).toHaveAttribute(
      'data-preview-mode',
      'connected',
    );
    expect(screen.getByTestId('sms-preview-panel')).toHaveAttribute(
      'data-preview-variant',
      firstCandidate.variantId,
    );
    expect(screen.getByTestId('sms-preview-state')).toHaveTextContent('현재 수업에 연결된 도식');

    // 3. Compare Candidate 2 while Candidate 1 stays connected -> no extra onChange call
    onChangeSpy.mockClear();
    fireEvent.click(secondInspectBtn);
    expect(onChangeSpy).not.toHaveBeenCalled();
    expect(firstRadio).toBeChecked();
    expect(secondRadio).not.toBeChecked();
    expect(within(region).getByText('현재 연결됨')).toBeInTheDocument();
    expect(within(region).getByText('살펴보는 중 · 미연결')).toBeInTheDocument();
    expect(
      within(region).getByText(`현재 연결 유지: ${firstCandidate.title}`),
    ).toBeInTheDocument();

    // 4. Return to connected choice via '연결된 초안으로 돌아가기' without calling onChange
    fireEvent.click(within(region).getByRole('button', { name: '연결된 초안으로 돌아가기' }));
    expect(onChangeSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId('sms-preview-panel')).toHaveAttribute(
      'data-preview-mode',
      'connected',
    );
    expect(screen.getByTestId('sms-preview-panel')).toHaveAttribute(
      'data-preview-variant',
      firstCandidate.variantId,
    );
    expect(within(region).getByRole('button', { name: '미리보기 닫기' })).toHaveFocus();

    // 5. Inspect Candidate 2 again, then click '미리보기 닫기' -> closes preview only & restores trigger focus
    fireEvent.click(secondInspectBtn);
    fireEvent.click(within(region).getByRole('button', { name: '미리보기 닫기' }));
    expect(onChangeSpy).not.toHaveBeenCalled();
    expect(screen.queryByTestId('sms-preview-panel')).not.toBeInTheDocument();
    expect(firstRadio).toBeChecked();
    expect(secondInspectBtn).toHaveFocus();

    // 6. Explicit unbind calls onChange(null)
    fireEvent.click(within(region).getByRole('button', { name: '이번 수업의 연결 해제' }));
    expect(onChangeSpy).toHaveBeenCalledExactlyOnceWith(null);
    expect(firstRadio).not.toBeChecked();
  });

  it('allows reference viewing when disabled and preserves stale, unsupported, and unrelated bindings until explicitly reselected', () => {
    const onChangeSpy = vi.fn<(next: SequenceMotionStudyBinding | null) => void>();

    // 1. Disabled unbound & bound states: radios/clear disabled, inspect buttons remain interactive
    const { rerender } = render(
      <StepMotionStudyPicker
        exerciseId={MULTI_EXERCISE_ID}
        value={firstBinding}
        disabled
        onChange={onChangeSpy}
      />,
    );

    const region = screen.getByRole('region', { name: '수업에 저장할 모션 초안' });
    for (const radio of within(region).getAllByRole('radio')) {
      expect(radio).toBeDisabled();
    }
    expect(within(region).getByRole('button', { name: '이번 수업의 연결 해제' })).toBeDisabled();

    const secondInspectBtn = within(region).getByRole('button', {
      name: `${secondCandidate.title} 도식 살펴보기`,
    });
    expect(secondInspectBtn).toBeEnabled();
    fireEvent.click(secondInspectBtn);
    expect(onChangeSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId('sms-preview-panel')).toHaveAttribute(
      'data-preview-variant',
      secondCandidate.variantId,
    );

    // 2. Stale, unsupported, and unrelated bindings never auto-preview a fallback or overwrite on browse
    for (const preservedBinding of [staleBinding, unsupportedBinding, otherBinding]) {
      rerender(
        <StepMotionStudyPicker
          exerciseId={MULTI_EXERCISE_ID}
          value={preservedBinding}
          onChange={onChangeSpy}
        />,
      );
      expect(screen.queryByTestId('sms-preview-panel')).not.toBeInTheDocument();
      for (const radio of within(region).getAllByRole('radio')) {
        expect(radio).not.toBeChecked();
      }

      const firstInspectBtn = within(region).getByRole('button', {
        name: `${firstCandidate.title} 도식 살펴보기`,
      });
      fireEvent.click(firstInspectBtn);
      expect(onChangeSpy).not.toHaveBeenCalled();
      expect(screen.getByTestId('sms-preview-panel')).toHaveAttribute(
        'data-preview-variant',
        firstCandidate.variantId,
      );
      expect(
        within(region).getByText('기존 저장 연결 정보는 변경되지 않았습니다'),
      ).toBeInTheDocument();

      fireEvent.click(within(region).getByRole('button', { name: '미리보기 닫기' }));
      expect(onChangeSpy).not.toHaveBeenCalled();
    }

    // Only explicit radio selection invokes onChange with the new binding
    fireEvent.click(
      within(region).getByRole('radio', {
        name: `${secondCandidate.title} 수업 모션으로 선택`,
      }),
    );
    expect(onChangeSpy).toHaveBeenCalledExactlyOnceWith(secondBinding);
  });

  it('starts paused, plays only on explicit click, and stops without auto-resuming on playbackActive=false, details collapse, preview close, and exercise switch', async () => {
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
    }));

    let frameSeq = 0;
    const queuedFrames = new Map<number, FrameRequestCallback>();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      const id = ++frameSeq;
      queuedFrames.set(id, callback);
      return id;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      queuedFrames.delete(id);
    });

    const stepFrames = (timestamp: number) => {
      act(() => {
        const callbacks = [...queuedFrames.values()];
        queuedFrames.clear();
        for (const cb of callbacks) cb(timestamp);
      });
    };

    const { rerender } = render(
      <StepMotionStudyPicker
        exerciseId={MULTI_EXERCISE_ID}
        value={null}
        playbackActive
        onChange={vi.fn()}
      />,
    );

    const region = screen.getByRole('region', { name: '수업에 저장할 모션 초안' });
    openPickerIfCollapsed(region);

    // Open preview without selecting -> starts paused at 0
    fireEvent.click(
      within(region).getByRole('button', { name: `${firstCandidate.title} 도식 살펴보기` }),
    );
    const seekSlider = () => within(region).getByRole<HTMLInputElement>('slider', { name: '도해 위치' });
    expect(seekSlider().value).toBe('0');
    stepFrames(0);
    stepFrames(600);
    expect(seekSlider().value).toBe('0');

    // 1. Explicit play -> advances progress; playbackActive=false pauses and true does NOT auto-resume
    const playBtn = within(region).getByRole('button', { name: '한 주기 재생' });
    await waitFor(() => expect(playBtn).toBeEnabled());
    fireEvent.click(playBtn);
    expect(within(region).getByRole('button', { name: '일시정지' })).toBeEnabled();
    stepFrames(1000);
    stepFrames(1500);
    const pausedAtPlaybackInactive = seekSlider().value;
    expect(Number(pausedAtPlaybackInactive)).toBeGreaterThan(0);

    rerender(
      <StepMotionStudyPicker
        exerciseId={MULTI_EXERCISE_ID}
        value={null}
        playbackActive={false}
        onChange={vi.fn()}
      />,
    );
    expect(within(region).getByRole('button', { name: '한 주기 재생' })).toBeDisabled();
    expect(within(region).queryByRole('button', { name: '일시정지' })).not.toBeInTheDocument();
    stepFrames(2200);
    expect(seekSlider().value).toBe(pausedAtPlaybackInactive);

    rerender(
      <StepMotionStudyPicker
        exerciseId={MULTI_EXERCISE_ID}
        value={null}
        playbackActive
        onChange={vi.fn()}
      />,
    );
    expect(within(region).getByRole('button', { name: '한 주기 재생' })).toBeEnabled();
    expect(within(region).queryByRole('button', { name: '일시정지' })).not.toBeInTheDocument();
    stepFrames(3000);
    expect(seekSlider().value).toBe(pausedAtPlaybackInactive);

    // 2. Explicit play -> collapsing <details> pauses and re-opening <details> does NOT auto-resume
    fireEvent.click(within(region).getByRole('button', { name: '한 주기 재생' }));
    stepFrames(3500);
    stepFrames(3900);
    const pausedAtCollapse = seekSlider().value;
    expect(Number(pausedAtCollapse)).toBeGreaterThan(Number(pausedAtPlaybackInactive));

    const details = region.querySelector('details')!;
    details.open = false;
    fireEvent(details, new Event('toggle'));
    await waitFor(() =>
      expect(within(region).queryByRole('button', { name: '일시정지' })).not.toBeInTheDocument(),
    );
    details.open = true;
    fireEvent(details, new Event('toggle'));
    await waitFor(() =>
      expect(within(region).getByRole('button', { name: '한 주기 재생' })).toBeEnabled(),
    );
    stepFrames(4600);
    expect(seekSlider().value).toBe(pausedAtCollapse);

    // 3. Explicit play -> preview close stops playback; reopening starts fresh & paused at 0
    fireEvent.click(within(region).getByRole('button', { name: '한 주기 재생' }));
    expect(within(region).getByRole('button', { name: '일시정지' })).toBeEnabled();
    fireEvent.click(within(region).getByRole('button', { name: '미리보기 닫기' }));
    expect(screen.queryByTestId('sms-preview-panel')).not.toBeInTheDocument();

    fireEvent.click(
      within(region).getByRole('button', { name: `${firstCandidate.title} 도식 살펴보기` }),
    );
    expect(seekSlider().value).toBe('0');
    expect(within(region).queryByRole('button', { name: '일시정지' })).not.toBeInTheDocument();

    // 4. Explicit play -> switching exerciseId clears old preview & stops playback without auto-playing
    fireEvent.click(within(region).getByRole('button', { name: '한 주기 재생' }));
    expect(within(region).getByRole('button', { name: '일시정지' })).toBeEnabled();
    rerender(
      <StepMotionStudyPicker
        exerciseId={OTHER_EXERCISE_ID}
        value={otherBinding}
        playbackActive
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId('sms-preview-panel')).toHaveAttribute(
      'data-preview-variant',
      otherCandidate.variantId,
    );
    expect(within(region).queryByRole('button', { name: '일시정지' })).not.toBeInTheDocument();
    expect(seekSlider().value).toBe('0');
  });

  it('closes only internal preview on Escape inside StepBlockInspector sheet on 320px/390px without closing parent dialog or mutating counts, side, timing, or review', () => {
    const initialStep: SequenceStep = {
      stepId: 'qa-sms-inspector-step',
      exerciseId: MULTI_EXERCISE_ID,
      order: 1,
      blockCategory: 'core',
      durationMin: 4,
      explanationSec: 20,
      transitionSec: 10,
      selectedLayer: 'standard',
      repetitions: 8,
      sets: 2,
      sideMode: 'right',
    };
    usePilatesStore.setState({ activeSteps: [structuredClone(initialStep)] });

    const parentSheetClose = vi.fn();
    const inspectorClose = vi.fn();
    setViewportWidth(320);

    render(
      <LightDismissDialog
        open
        title="동작 블록 편집"
        className="step-inspector-sheet"
        onClose={parentSheetClose}
      >
        <StepBlockInspector
          index={0}
          step={usePilatesStore.getState().activeSteps[0]!}
          onClose={inspectorClose}
          onReplace={vi.fn()}
          onOpenExercise={vi.fn()}
        />
      </LightDismissDialog>,
    );

    const dialog = screen.getByRole('dialog', { name: '동작 블록 편집' });
    const region = within(dialog).getByRole('region', { name: '수업에 저장할 모션 초안' });
    openPickerIfCollapsed(region);

    const secondInspectBtn = within(region).getByRole('button', {
      name: `${secondCandidate.title} 도식 살펴보기`,
    });

    // Browsing candidate does NOT mark StepBlockInspector dirty or touch sessionStorage
    fireEvent.click(secondInspectBtn);
    expect(within(dialog).queryByTestId('step-inspector-dirty-badge')).not.toBeInTheDocument();
    expect(window.sessionStorage.length).toBe(0);

    // Focus inside preview and press Escape -> closes ONLY preview, keeps parent dialog open, restores trigger focus
    const closePreviewBtn = within(region).getByRole('button', { name: '미리보기 닫기' });
    closePreviewBtn.focus();
    fireEvent.keyDown(closePreviewBtn, { key: 'Escape' });

    expect(within(region).queryByTestId('sms-preview-panel')).not.toBeInTheDocument();
    expect(dialog).toHaveAttribute('open');
    expect(parentSheetClose).not.toHaveBeenCalled();
    expect(inspectorClose).not.toHaveBeenCalled();
    expect(secondInspectBtn).toHaveFocus();

    // Native cancel event on parent <dialog> while focused inside open preview also closes ONLY internal preview
    setViewportWidth(390);
    fireEvent.click(secondInspectBtn);
    within(region).getByRole('button', { name: '미리보기 닫기' }).focus();
    const cancelEvent = new Event('cancel', { cancelable: true });
    fireEvent(dialog, cancelEvent);
    expect(cancelEvent.defaultPrevented).toBe(true);
    expect(within(region).queryByTestId('sms-preview-panel')).not.toBeInTheDocument();
    expect(dialog).toHaveAttribute('open');
    expect(parentSheetClose).not.toHaveBeenCalled();
    expect(secondInspectBtn).toHaveFocus();

    // Explicit selection + 변경 적용 commits ONLY motionStudy without changing repetitions, sets, sideMode, timing, or review
    fireEvent.click(
      within(region).getByRole('radio', {
        name: `${firstCandidate.title} 수업 모션으로 선택`,
      }),
    );
    fireEvent.click(within(dialog).getByRole('button', { name: '변경 적용' }));

    const savedStep = usePilatesStore.getState().activeSteps[0]!;
    expect(savedStep).toEqual({
      ...initialStep,
      motionStudy: firstBinding,
    });
    expect(getStepTiming(savedStep)).toEqual(getStepTiming(initialStep));
    expect(
      usePilatesStore.getState().exercises.find((item) => item.id === MULTI_EXERCISE_ID)?.review,
    ).toBeUndefined();
  });

  it('enforces >=44px touch targets, :focus-visible outlines, 320px/390px responsive rules, and prefers-reduced-motion in step-motion-study.css', () => {
    const cssPath = resolve(process.cwd(), 'src/styles/step-motion-study.css');
    const css = readFileSync(cssPath, 'utf8');

    expect(css).toContain('min-height: 44px');
    expect(css).toContain('min-width: 44px');
    expect(css).toContain(':focus-visible');
    expect(css).toContain('@media (max-width: 480px)');
    expect(css).toContain('@media (max-width: 359px)');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
