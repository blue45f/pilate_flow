import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, within } from '@testing-library/react';
import { usePilatesStore } from '../../store/usePilatesStore';
import {
  FIRST_CLASS_TUTORIAL_FIXTURE_PRESETS,
  FIRST_CLASS_TUTORIAL_STEPS,
  FirstClassTutorialCandidate,
  FirstClassTutorialFixtureHarness,
  resolveFirstClassTutorialContext,
} from './index';

function flushAnimationFrames() {
  act(() => {
    vi.runAllTimers();
  });
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('firstClassTutorialCandidate independent boundary, accessibility, and read-only safety', () => {
  it('never mutates or freezes caller-owned input objects or arrays while freezing the returned summary', () => {
    const stepObj = {
      stepId: 'step-1',
      kind: 'exercise',
      exerciseId: 'ex-1',
      nameKo: '풋워크 호흡 준비',
      durationMin: 8,
      nestedMeta: { mutableFlag: true },
    };
    const ideaObj = {
      exerciseId: 'idea-1',
      ideaLine: '스트랩 당기며 코어 유지',
      durationMin: 5,
    };
    const blockObj = {
      id: 'block-1',
      title: '준비 8분 블록',
      items: [{ exerciseId: 'ex-1', durationMin: 8 }],
    };
    const savedObj = {
      id: 'seq-1',
      title: '월요일 리포머',
      targetMinutes: 50,
      steps: [stepObj],
    };
    const taskIds = ['first-class:new-movement', 'compose'];

    const callerSource = {
      title: '호출자 원본 수업안',
      targetMinutes: 50,
      steps: [stepObj],
      ideaDrafts: [ideaObj],
      reusableBlocks: [blockObj],
      savedSequences: [savedObj],
      completedTutorialTaskIds: taskIds,
    };

    const snapshotBefore = structuredClone(callerSource);
    const summary = resolveFirstClassTutorialContext(callerSource);
    render(<FirstClassTutorialCandidate source={callerSource} />);

    expect(callerSource).toEqual(snapshotBefore);
    expect(Object.isFrozen(callerSource)).toBe(false);
    expect(Object.isFrozen(callerSource.steps)).toBe(false);
    expect(Object.isFrozen(stepObj)).toBe(false);
    expect(Object.isFrozen(stepObj.nestedMeta)).toBe(false);
    expect(Object.isFrozen(callerSource.ideaDrafts)).toBe(false);
    expect(Object.isFrozen(ideaObj)).toBe(false);
    expect(Object.isFrozen(callerSource.reusableBlocks)).toBe(false);
    expect(Object.isFrozen(blockObj)).toBe(false);
    expect(Object.isFrozen(callerSource.savedSequences)).toBe(false);
    expect(Object.isFrozen(savedObj)).toBe(false);
    expect(Object.isFrozen(taskIds)).toBe(false);

    // Caller can still mutate its own objects freely after resolution and rendering
    stepObj.nestedMeta.mutableFlag = false;
    callerSource.steps.push({
      stepId: 'step-2',
      kind: 'exercise',
      exerciseId: 'ex-2',
      nameKo: '브릿징',
      durationMin: 6,
      nestedMeta: { mutableFlag: true },
    });
    expect(summary.exerciseStepCount).toBe(1);

    // Returned summary and all nested collections are deeply frozen
    expect(Object.isFrozen(summary)).toBe(true);
    expect(Object.isFrozen(summary.completedStepIds)).toBe(true);
    expect(Object.isFrozen(summary.normalizedTaskIds)).toBe(true);
    expect(Object.isFrozen(summary.diagnostics)).toBe(true);
    expect(Object.isFrozen(summary.boundary)).toBe(true);
    expect(summary.boundary).toEqual({
      isReadOnly: true,
      isMandatoryTour: false,
      requiresReviewApproval: false,
      mutatesStoreOrStorage: false,
      clinicalOrAnatomicalApproval: false,
    });
  });

  it('defends against circular references, prototype pollution keys, null-prototype objects, and malformed scalars', () => {
    const cyclicStep: Record<string, unknown> = {
      stepId: 'cycle-step',
      nameKo: '순환 동작',
    };
    cyclicStep.self = cyclicStep;

    const cyclicSource: Record<string, unknown> = {
      title: '순환 참조 테스트',
      targetMinutes: 50,
    };
    cyclicSource.steps = [cyclicStep, cyclicStep, cyclicSource];

    // Deeply nested malformed scalar (12,000 levels) and null-prototype object
    const deepRoot: Record<string, unknown> = {};
    let cursor = deepRoot;
    for (let i = 0; i < 12_000; i += 1) {
      const next: Record<string, unknown> = {};
      cursor.next = next;
      cursor = next;
    }
    const nullProtoScalar = Object.create(null) as Record<string, unknown>;

    const pollutedSource = JSON.parse(
      '{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},"title":"오염 방어 수업"}',
    ) as Record<string, unknown>;
    pollutedSource.targetMinutes = nullProtoScalar;
    pollutedSource.steps = [
      { stepId: 'bad-dur-obj', nameKo: '비정상 스칼라', durationMin: deepRoot },
      { stepId: 'valid-after-bad', nameKo: '정상 동작', durationMin: 10 },
    ];

    const cycleSummary = resolveFirstClassTutorialContext(cyclicSource);
    expect(cycleSummary.exerciseStepCount).toBe(1);
    expect(cycleSummary.isPartialContext).toBe(true);
    expect(Object.isFrozen(cyclicSource)).toBe(false);
    expect(Object.isFrozen(cyclicStep)).toBe(false);

    const pollutedSummary = resolveFirstClassTutorialContext(pollutedSource);
    expect(pollutedSummary.titleKo).toBe('오염 방어 수업');
    expect(pollutedSummary.targetMinutesStatus).toBe('invalid');
    expect(pollutedSummary.exerciseStepCount).toBe(1);
    expect(pollutedSummary.isPartialContext).toBe(true);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.isFrozen(deepRoot)).toBe(false);
  });

  it('rejects negative, zero, NaN, and Infinity durations and bounds 12,000-element arrays at maxScanItems=10000', () => {
    const stepsWithInvalidDurations = [
      { stepId: 'neg', nameKo: '음수 시간', durationMin: -10 },
      { stepId: 'zero', nameKo: '0분 시간', durationMin: 0 },
      { stepId: 'nan', nameKo: 'NaN 시간', durationMin: Number.NaN },
      { stepId: 'inf', nameKo: '무한 시간', durationMin: Number.POSITIVE_INFINITY },
      { stepId: 'over', nameKo: '초과 시간', durationMin: 999 },
      { stepId: 'valid', nameKo: '유효 동작', durationMin: 12 },
    ];

    for (const badTarget of [-30, 0, 5, 180, Number.NaN, Number.POSITIVE_INFINITY]) {
      const summary = resolveFirstClassTutorialContext({
        targetMinutes: badTarget,
        steps: stepsWithInvalidDurations,
      });
      expect(summary.targetMinutes).toBeNull();
      expect(summary.targetMinutesStatus).toBe('invalid');
      expect(summary.exerciseStepCount).toBe(1);
      expect(summary.isPartialContext).toBe(true);
      expect(
        summary.diagnostics.some((d) => d.code === 'INVALID_TARGET_MINUTES'),
      ).toBe(true);
      expect(
        summary.diagnostics.some((d) => d.code === 'MALFORMED_STEP_SKIPPED'),
      ).toBe(true);
    }

    // 12,000-element array bounded by default maxScanItems = 10,000
    const largeArray = Array.from({ length: 12_000 }, (_, idx) => ({
      stepId: `step-${idx}`,
      exerciseId: `ex-${idx}`,
      durationMin: 1,
    }));

    const largeSummary = resolveFirstClassTutorialContext({
      title: '대규모 배열 경계 검증',
      targetMinutes: 50,
      steps: largeArray,
    });

    expect(largeSummary.isPartialContext).toBe(true);
    expect(
      largeSummary.diagnostics.some((d) => d.code === 'SCAN_LIMIT_REACHED'),
    ).toBe(true);
    expect(largeSummary.exerciseStepCount).toBeLessThanOrEqual(1_000);
  });

  it('never gates or disables tabs, navigation, skip/dismiss/reopen, or action callbacks when exercises are unreviewed or tasks are unchecked', () => {
    const onStepChange = vi.fn();
    const onStepAction = vi.fn();
    const onReturnToWorkbench = vi.fn();
    const onTaskToggle = vi.fn();

    const unreviewedSource = {
      title: '미검토 창작 동작 포함 수업',
      targetMinutes: 50,
      steps: [
        {
          stepId: 'unreviewed-1',
          exerciseId: 'idea-unreviewed-1',
          nameKo: '이름만 적은 미검토 동작',
          review: undefined,
          durationMin: 10,
        },
      ],
      ideaDrafts: [
        {
          exerciseId: 'idea-unreviewed-1',
          ideaLine: '미검토 한 줄 초안',
          review: undefined,
        },
      ],
      completedTutorialTaskIds: [],
    };

    const { container } = render(
      <FirstClassTutorialCandidate
        source={unreviewedSource}
        initialStepId="new-movement"
        onStepChange={onStepChange}
        onStepAction={onStepAction}
        onReturnToWorkbench={onReturnToWorkbench}
        onTaskToggle={onTaskToggle}
      />,
    );

    const scope = within(container);

    // All 3 step tabs are enabled regardless of unreviewed exercises or unchecked tasks
    for (const step of FIRST_CLASS_TUTORIAL_STEPS) {
      const tab = scope.getByTestId(`tutorial-tab-${step.id}`) as HTMLButtonElement;
      expect(tab.disabled).toBe(false);
    }

    // Skip, Dismiss, Restart, Action, and Return to Workbench are enabled
    expect((scope.getByTestId('tutorial-skip-btn') as HTMLButtonElement).disabled).toBe(
      false,
    );
    expect((scope.getByTestId('tutorial-dismiss-btn') as HTMLButtonElement).disabled).toBe(
      false,
    );
    expect((scope.getByTestId('tutorial-restart-btn') as HTMLButtonElement).disabled).toBe(
      false,
    );
    expect(
      (scope.getByTestId('tutorial-action-new-movement') as HTMLButtonElement).disabled,
    ).toBe(false);
    expect(
      (scope.getByTestId('tutorial-return-workbench-btn') as HTMLButtonElement).disabled,
    ).toBe(false);
    expect((scope.getByTestId('tutorial-next-btn') as HTMLButtonElement).disabled).toBe(
      false,
    );

    // Trigger step action and workbench return without checking any task box
    fireEvent.click(scope.getByTestId('tutorial-action-new-movement'));
    expect(onStepAction).toHaveBeenCalledWith('new-movement');

    fireEvent.click(scope.getByTestId('tutorial-return-workbench-btn'));
    expect(onReturnToWorkbench).toHaveBeenCalledTimes(1);

    // Move to Step 2 and Step 3 via Next button without completing Step 1
    fireEvent.click(scope.getByTestId('tutorial-next-btn'));
    expect(onStepChange).toHaveBeenLastCalledWith('block-composition', 1);
    expect((scope.getByTestId('tutorial-prev-btn') as HTMLButtonElement).disabled).toBe(
      false,
    );
    expect((scope.getByTestId('tutorial-next-btn') as HTMLButtonElement).disabled).toBe(
      false,
    );

    fireEvent.click(scope.getByTestId('tutorial-next-btn'));
    expect(onStepChange).toHaveBeenLastCalledWith('save-class', 2);

    // Self-check toggle works optionally and can be unchecked
    const checkBtn = scope.getByTestId('tutorial-check-save-class');
    expect(checkBtn.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(checkBtn);
    expect(onTaskToggle).toHaveBeenCalledWith(
      'first-class:save-class',
      true,
      'save-class',
    );
    expect(checkBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('manages visibility transitions and focus across skip, dismiss, reopen, reopen-first, and restart controls', () => {
    vi.useFakeTimers();
    const onSkip = vi.fn();
    const onDismiss = vi.fn();
    const onReopen = vi.fn();

    const { container } = render(
      <FirstClassTutorialCandidate
        initialStepId="block-composition"
        onSkip={onSkip}
        onDismiss={onDismiss}
        onReopen={onReopen}
      />,
    );
    const scope = within(container);

    // 1. Click `건너뛰기` (`tutorial-skip-btn`) -> collapses & moves focus to `tutorial-reopen-btn`
    fireEvent.click(scope.getByTestId('tutorial-skip-btn'));
    flushAnimationFrames();

    expect(onSkip).toHaveBeenCalledWith('block-composition');
    expect(
      scope.getByTestId('first-class-tutorial-candidate').getAttribute('data-visibility'),
    ).toBe('skipped');
    const reopenBtn = scope.getByTestId('tutorial-reopen-btn');
    expect(document.activeElement).toBe(reopenBtn);

    // 2. Click `첫 수업 3단계 다시보기` (`tutorial-reopen-btn`) -> reopens at step 2 & focuses active heading
    fireEvent.click(reopenBtn);
    flushAnimationFrames();

    expect(onReopen).toHaveBeenLastCalledWith('block-composition');
    expect(
      scope.getByTestId('first-class-tutorial-candidate').getAttribute('data-visibility'),
    ).toBe('open');
    expect(
      scope.getByTestId('tutorial-tab-block-composition').getAttribute('aria-selected'),
    ).toBe('true');
    expect(document.activeElement).toBe(
      scope.getByTestId('tutorial-active-step-heading'),
    );

    // 3. Click `닫기` (`tutorial-dismiss-btn`) -> collapses & moves focus to `tutorial-reopen-btn`
    fireEvent.click(scope.getByTestId('tutorial-dismiss-btn'));
    flushAnimationFrames();

    expect(onDismiss).toHaveBeenCalledWith('block-composition');
    expect(
      scope.getByTestId('first-class-tutorial-candidate').getAttribute('data-visibility'),
    ).toBe('dismissed');
    expect(document.activeElement).toBe(scope.getByTestId('tutorial-reopen-btn'));

    // 4. Click `1단계부터 다시보기` (`tutorial-reopen-first-btn`) -> reopens at step 1 & focuses heading
    fireEvent.click(scope.getByTestId('tutorial-reopen-first-btn'));
    flushAnimationFrames();

    expect(onReopen).toHaveBeenLastCalledWith('new-movement');
    expect(
      scope.getByTestId('tutorial-tab-new-movement').getAttribute('aria-selected'),
    ).toBe('true');
    expect(document.activeElement).toBe(
      scope.getByTestId('tutorial-active-step-heading'),
    );

    // 5. Move to Step 3, then click `1단계부터 보기` (`tutorial-restart-btn`) -> returns to Step 1 & focuses heading
    fireEvent.click(scope.getByTestId('tutorial-tab-save-class'));
    expect(
      scope.getByTestId('tutorial-tab-save-class').getAttribute('aria-selected'),
    ).toBe('true');

    fireEvent.click(scope.getByTestId('tutorial-restart-btn'));
    flushAnimationFrames();

    expect(
      scope.getByTestId('tutorial-tab-new-movement').getAttribute('aria-selected'),
    ).toBe('true');
    expect(document.activeElement).toBe(
      scope.getByTestId('tutorial-active-step-heading'),
    );
  });

  it('supports WAI-ARIA tablist keyboard navigation (ArrowRight, ArrowLeft, Home, End) and Escape dismissal with focus preservation', () => {
    vi.useFakeTimers();
    const { container } = render(
      <FirstClassTutorialCandidate initialStepId="new-movement" />,
    );
    const scope = within(container);

    const tab1 = scope.getByTestId('tutorial-tab-new-movement');
    const tab2 = scope.getByTestId('tutorial-tab-block-composition');
    const tab3 = scope.getByTestId('tutorial-tab-save-class');

    tab1.focus();
    expect(document.activeElement).toBe(tab1);

    // ArrowRight: 1 -> 2
    fireEvent.keyDown(tab1, { key: 'ArrowRight' });
    flushAnimationFrames();
    expect(tab2.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tab2);

    // ArrowRight: 2 -> 3
    fireEvent.keyDown(tab2, { key: 'ArrowRight' });
    flushAnimationFrames();
    expect(tab3.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tab3);

    // ArrowRight wraps: 3 -> 1
    fireEvent.keyDown(tab3, { key: 'ArrowRight' });
    flushAnimationFrames();
    expect(tab1.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tab1);

    // ArrowLeft wraps: 1 -> 3
    fireEvent.keyDown(tab1, { key: 'ArrowLeft' });
    flushAnimationFrames();
    expect(tab3.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tab3);

    // Home: 3 -> 1
    fireEvent.keyDown(tab3, { key: 'Home' });
    flushAnimationFrames();
    expect(tab1.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tab1);

    // End: 1 -> 3
    fireEvent.keyDown(tab1, { key: 'End' });
    flushAnimationFrames();
    expect(tab3.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tab3);

    // Escape key dismisses without losing focus (moves focus to tutorial-reopen-btn)
    fireEvent.keyDown(tab3, { key: 'Escape' });
    flushAnimationFrames();
    expect(
      scope.getByTestId('first-class-tutorial-candidate').getAttribute('data-visibility'),
    ).toBe('dismissed');
    expect(document.activeElement).toBe(scope.getByTestId('tutorial-reopen-btn'));
  });

  it('honors preferReducedMotion prop and prefers-reduced-motion media query without triggering smooth scrolling', () => {
    const scrollSpy = vi.fn();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scrollSpy;

    try {
      // 1. Explicit prop override
      const firstRender = render(
        <FirstClassTutorialCandidate preferReducedMotion={true} />,
      );
      const root1 = within(firstRender.container).getByTestId(
        'first-class-tutorial-candidate',
      );
      expect(root1.getAttribute('data-reduced-motion')).toBe('true');
      fireEvent.click(
        within(firstRender.container).getByTestId('tutorial-next-btn'),
      );
      expect(scrollSpy).not.toHaveBeenCalled();
      firstRender.unmount();

      // 2. System matchMedia('(prefers-reduced-motion: reduce)')
      vi.stubGlobal(
        'matchMedia',
        vi.fn().mockImplementation((query: string) => ({
          matches: query.includes('prefers-reduced-motion: reduce'),
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      );

      const secondRender = render(<FirstClassTutorialCandidate />);
      const root2 = within(secondRender.container).getByTestId(
        'first-class-tutorial-candidate',
      );
      expect(root2.getAttribute('data-reduced-motion')).toBe('true');
      expect(scrollSpy).not.toHaveBeenCalled();
    } finally {
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    }
  });

  it('maintains 100% unique DOM [id] attributes and independent state/focus when multiple instances render simultaneously', () => {
    vi.useFakeTimers();
    const sharedSource = FIRST_CLASS_TUTORIAL_FIXTURE_PRESETS[0].source;
    const first = render(
      <FirstClassTutorialCandidate
        source={sharedSource}
        initialStepId="new-movement"
      />,
    );
    const second = render(
      <FirstClassTutorialCandidate
        source={sharedSource}
        initialStepId="new-movement"
      />,
    );

    const allElementsWithId = [...document.querySelectorAll('[id]')];
    const ids = allElementsWithId.map((el) => el.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);

    // Interacting with the second instance does not change the first instance's step or steal its focus
    const secondTab3 = within(second.container).getByTestId(
      'tutorial-tab-save-class',
    );
    secondTab3.focus();
    fireEvent.click(secondTab3);

    expect(
      within(second.container)
        .getByTestId('tutorial-tab-save-class')
        .getAttribute('aria-selected'),
    ).toBe('true');
    expect(
      within(first.container)
        .getByTestId('tutorial-tab-new-movement')
        .getAttribute('aria-selected'),
    ).toBe('true');

    fireEvent.click(within(second.container).getByTestId('tutorial-skip-btn'));
    flushAnimationFrames();

    expect(
      within(second.container)
        .getByTestId('first-class-tutorial-candidate')
        .getAttribute('data-visibility'),
    ).toBe('skipped');
    expect(
      within(first.container)
        .getByTestId('first-class-tutorial-candidate')
        .getAttribute('data-visibility'),
    ).toBe('open');
    expect(second.container.contains(document.activeElement)).toBe(true);
    expect(first.container.contains(document.activeElement)).toBe(false);
  });

  it('performs zero writes to localStorage, sessionStorage, or usePilatesStore across all harness presets and interactions', () => {
    const localSetSpy = vi.spyOn(Storage.prototype, 'setItem');
    const localRemoveSpy = vi.spyOn(Storage.prototype, 'removeItem');
    const localClearSpy = vi.spyOn(Storage.prototype, 'clear');

    const storeBefore = {
      activeTitle: usePilatesStore.getState().activeTitle,
      activeTargetMinutes: usePilatesStore.getState().activeTargetMinutes,
      activeStepsLength: usePilatesStore.getState().activeSteps.length,
      savedSequencesLength: usePilatesStore.getState().savedSequences.length,
      completedTasks: [
        ...(usePilatesStore.getState().instructorStudyState?.completedTutorialTaskIds ?? []),
      ],
    };

    const { container } = render(<FirstClassTutorialFixtureHarness />);
    const scope = within(container);

    for (const preset of FIRST_CLASS_TUTORIAL_FIXTURE_PRESETS) {
      fireEvent.click(scope.getByTestId(`fixture-preset-${preset.id}`));
    }

    // Reopen if last preset was collapsed, toggle task check, navigate steps
    fireEvent.click(scope.getByTestId('fixture-preset-empty-first-visit'));
    fireEvent.click(scope.getByTestId('tutorial-check-new-movement'));
    fireEvent.click(scope.getByTestId('tutorial-next-btn'));

    expect(localSetSpy).not.toHaveBeenCalled();
    expect(localRemoveSpy).not.toHaveBeenCalled();
    expect(localClearSpy).not.toHaveBeenCalled();

    const storeAfter = {
      activeTitle: usePilatesStore.getState().activeTitle,
      activeTargetMinutes: usePilatesStore.getState().activeTargetMinutes,
      activeStepsLength: usePilatesStore.getState().activeSteps.length,
      savedSequencesLength: usePilatesStore.getState().savedSequences.length,
      completedTasks: [
        ...(usePilatesStore.getState().instructorStudyState?.completedTutorialTaskIds ?? []),
      ],
    };
    expect(storeAfter).toEqual(storeBefore);
  });
});
