import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  FIRST_CLASS_TUTORIAL_STEPS,
  getTutorialStepById,
  isStepCompletedByTaskIds,
  isValidTutorialTaskId,
  resolveFirstClassTutorialContext,
} from './firstClassTutorialModel';
import { FirstClassTutorialIllustration } from './FirstClassTutorialIllustrations';
import {
  FIRST_CLASS_TUTORIAL_FIXTURE_PRESETS,
  getTutorialFixturePresetById,
} from './firstClassTutorialFixtures';
import type {
  FirstClassTutorialCandidateProps,
  FirstClassTutorialStepId,
  FirstClassTutorialVisibilityState,
} from './firstClassTutorialTypes';
import './firstClassTutorialCandidate.css';

const VALID_STEP_IDS = new Set<FirstClassTutorialStepId>([
  'new-movement',
  'block-composition',
  'save-class',
]);

function isValidStepId(value: unknown): value is FirstClassTutorialStepId {
  return typeof value === 'string' && VALID_STEP_IDS.has(value as FirstClassTutorialStepId);
}

function isValidVisibility(
  value: unknown,
): value is FirstClassTutorialVisibilityState {
  return value === 'open' || value === 'skipped' || value === 'dismissed';
}

function detectSystemReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Isolated First Class 3-Step Visual Tutorial Candidate.
 *
 * Boundaries:
 * - Purely prop-driven and read-only; never mutates or freezes `source`.
 * - Non-mandatory: always provides immediate Skip ("건너뛰기"), Dismiss ("닫기"),
 *   and Reopen ("첫 수업 3단계 다시보기" / "1단계부터 다시보기") controls.
 * - Never gates movement creation, block composition, or sequence saving on review approval.
 */
export function FirstClassTutorialCandidate({
  source,
  summary,
  options,
  completedTaskIds,
  initialStepId,
  activeStepId,
  initialVisibility = 'open',
  visibility,
  preferReducedMotion,
  variant = 'inline-card',
  titleOverride,
  className,
  onStepChange,
  onSkip,
  onDismiss,
  onReopen,
  onTaskToggle,
  onStepAction,
  onReturnToWorkbench,
}: FirstClassTutorialCandidateProps) {
  const instanceId = useId();
  const headingId = `fctc-heading-${instanceId}`;
  const tabRefs = useRef<Record<FirstClassTutorialStepId, HTMLButtonElement | null>>({
    'new-movement': null,
    'block-composition': null,
    'save-class': null,
  });
  const activeStepHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const reopenBtnRef = useRef<HTMLButtonElement | null>(null);

  const resolvedSummary = useMemo(
    () => summary ?? resolveFirstClassTutorialContext(source, options),
    [summary, source, options],
  );

  const defaultStepId: FirstClassTutorialStepId = isValidStepId(initialStepId)
    ? initialStepId
    : resolvedSummary.suggestedStepId;

  const defaultVisibility: FirstClassTutorialVisibilityState = isValidVisibility(
    initialVisibility,
  )
    ? initialVisibility
    : 'open';

  const [internalStepId, setInternalStepId] =
    useState<FirstClassTutorialStepId>(defaultStepId);
  const [internalVisibility, setInternalVisibility] =
    useState<FirstClassTutorialVisibilityState>(defaultVisibility);
  const [localTaskOverrides, setLocalTaskOverrides] = useState<
    Record<string, boolean>
  >({});

  // Sync uncontrolled state when external source/summary or initial props change
  const [trackedContextKey, setTrackedContextKey] = useState<{
    source: unknown;
    summary: unknown;
    initialStepId: FirstClassTutorialStepId | undefined;
    initialVisibility: FirstClassTutorialVisibilityState;
  }>({
    source,
    summary,
    initialStepId,
    initialVisibility: defaultVisibility,
  });

  if (
    trackedContextKey.source !== source ||
    trackedContextKey.summary !== summary ||
    trackedContextKey.initialStepId !== initialStepId ||
    trackedContextKey.initialVisibility !== defaultVisibility
  ) {
    setTrackedContextKey({
      source,
      summary,
      initialStepId,
      initialVisibility: defaultVisibility,
    });
    setInternalStepId(defaultStepId);
    setInternalVisibility(defaultVisibility);
    setLocalTaskOverrides({});
  }

  const [systemReducedMotion, setSystemReducedMotion] = useState<boolean>(() =>
    detectSystemReducedMotion(),
  );

  useEffect(() => {
    if (
      typeof preferReducedMotion === 'boolean' ||
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return undefined;
    }
    let mediaQuery: MediaQueryList | null = null;
    try {
      mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    } catch {
      return undefined;
    }
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemReducedMotion(event.matches);
    };
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery?.removeEventListener('change', handleChange);
    }
    return undefined;
  }, [preferReducedMotion]);

  const isReducedMotion =
    typeof preferReducedMotion === 'boolean'
      ? preferReducedMotion
      : systemReducedMotion;

  const currentStepId: FirstClassTutorialStepId = isValidStepId(activeStepId)
    ? activeStepId
    : internalStepId;

  const currentVisibility: FirstClassTutorialVisibilityState = isValidVisibility(
    visibility,
  )
    ? visibility
    : internalVisibility;

  const activeStep = getTutorialStepById(currentStepId);
  const activeStepIndex = FIRST_CLASS_TUTORIAL_STEPS.findIndex(
    (step) => step.id === activeStep.id,
  );

  const includeLegacyTaskMappings = options?.includeLegacyTaskMappings !== false;

  const effectiveTaskIds = useMemo(() => {
    const baseIds = Array.isArray(completedTaskIds)
      ? completedTaskIds.filter(isValidTutorialTaskId)
      : [...resolvedSummary.normalizedTaskIds];
    const taskSet = new Set<string>(baseIds);

    for (const [taskId, completed] of Object.entries(localTaskOverrides)) {
      if (completed) {
        taskSet.add(taskId);
      } else {
        taskSet.delete(taskId);
        // Also clear legacy task mappings when user explicitly unchecks a step locally
        const matchingStep = FIRST_CLASS_TUTORIAL_STEPS.find(
          (s) => s.taskId === taskId,
        );
        if (matchingStep) {
          for (const legacyId of matchingStep.legacyTaskIds) {
            taskSet.delete(legacyId);
          }
        }
      }
    }
    return Array.from(taskSet);
  }, [completedTaskIds, resolvedSummary.normalizedTaskIds, localTaskOverrides]);

  const completedStepsMap = useMemo(() => {
    return {
      'new-movement': isStepCompletedByTaskIds(
        'new-movement',
        effectiveTaskIds,
        includeLegacyTaskMappings,
      ),
      'block-composition': isStepCompletedByTaskIds(
        'block-composition',
        effectiveTaskIds,
        includeLegacyTaskMappings,
      ),
      'save-class': isStepCompletedByTaskIds(
        'save-class',
        effectiveTaskIds,
        includeLegacyTaskMappings,
      ),
    };
  }, [effectiveTaskIds, includeLegacyTaskMappings]);

  const isActiveStepCompleted = completedStepsMap[activeStep.id];

  const getTabId = (stepId: FirstClassTutorialStepId) =>
    `fctc-tab-${stepId}-${instanceId}`;
  const getPanelId = (stepId: FirstClassTutorialStepId) =>
    `fctc-panel-${stepId}-${instanceId}`;

  const selectStepByIndex = (
    nextIndex: number,
    optionsConfig?: { focusTab?: boolean; focusHeading?: boolean },
  ) => {
    const boundedIndex =
      ((nextIndex % FIRST_CLASS_TUTORIAL_STEPS.length) +
        FIRST_CLASS_TUTORIAL_STEPS.length) %
      FIRST_CLASS_TUTORIAL_STEPS.length;
    const nextStep = FIRST_CLASS_TUTORIAL_STEPS[boundedIndex];
    if (!isValidStepId(activeStepId)) {
      setInternalStepId(nextStep.id);
    }
    onStepChange?.(nextStep.id, boundedIndex);

    if (optionsConfig?.focusTab) {
      requestAnimationFrame(() => {
        tabRefs.current[nextStep.id]?.focus();
      });
    } else if (optionsConfig?.focusHeading) {
      requestAnimationFrame(() => {
        activeStepHeadingRef.current?.focus();
      });
    }
  };

  const handleTabKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      selectStepByIndex(index + 1, { focusTab: true });
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      selectStepByIndex(index - 1, { focusTab: true });
    } else if (event.key === 'Home') {
      event.preventDefault();
      selectStepByIndex(0, { focusTab: true });
    } else if (event.key === 'End') {
      event.preventDefault();
      selectStepByIndex(FIRST_CLASS_TUTORIAL_STEPS.length - 1, {
        focusTab: true,
      });
    }
  };

  const handleSkip = () => {
    if (!isValidVisibility(visibility)) {
      setInternalVisibility('skipped');
    }
    onSkip?.(activeStep.id);
    requestAnimationFrame(() => {
      reopenBtnRef.current?.focus();
    });
  };

  const handleDismiss = () => {
    if (!isValidVisibility(visibility)) {
      setInternalVisibility('dismissed');
    }
    onDismiss?.(activeStep.id);
    requestAnimationFrame(() => {
      reopenBtnRef.current?.focus();
    });
  };

  const handleReopenCurrent = () => {
    if (!isValidVisibility(visibility)) {
      setInternalVisibility('open');
    }
    onReopen?.(activeStep.id);
    requestAnimationFrame(() => {
      activeStepHeadingRef.current?.focus();
    });
  };

  const handleReopenFirst = () => {
    if (!isValidStepId(activeStepId)) {
      setInternalStepId('new-movement');
    }
    if (!isValidVisibility(visibility)) {
      setInternalVisibility('open');
    }
    onStepChange?.('new-movement', 0);
    onReopen?.('new-movement');
    requestAnimationFrame(() => {
      activeStepHeadingRef.current?.focus();
    });
  };

  const handleRootKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape' && currentVisibility === 'open') {
      event.stopPropagation();
      handleDismiss();
    }
  };

  const handleToggleActiveTask = () => {
    const nextCompleted = !isActiveStepCompleted;
    setLocalTaskOverrides((prev) => ({
      ...prev,
      [activeStep.taskId]: nextCompleted,
    }));
    onTaskToggle?.(activeStep.taskId, nextCompleted, activeStep.id);
  };

  const displayTitle =
    typeof titleOverride === 'string' && titleOverride.trim().length > 0
      ? titleOverride.trim()
      : resolvedSummary.titleKo;

  const rootClassName = ['fctc-root', className].filter(Boolean).join(' ');

  return (
    <section
      className={rootClassName}
      aria-labelledby={headingId}
      data-testid="first-class-tutorial-candidate"
      data-visibility={currentVisibility}
      data-reduced-motion={isReducedMotion ? 'true' : 'false'}
      data-variant={variant}
      onKeyDown={handleRootKeyDown}
    >
      <header className="fctc-header">
        <div className="fctc-header-title-group">
          <p className="fctc-eyebrow">첫 수업 준비 · 3단계 시각 가이드</p>
          <h2 id={headingId} className="fctc-title">
            {displayTitle}
          </h2>
        </div>

        {currentVisibility === 'open' && (
          <div className="fctc-header-actions">
            <button
              type="button"
              className="fctc-btn fctc-btn-secondary"
              data-testid="tutorial-skip-btn"
              onClick={handleSkip}
            >
              건너뛰기
            </button>
            <button
              type="button"
              className="fctc-btn fctc-btn-ghost"
              data-testid="tutorial-dismiss-btn"
              onClick={handleDismiss}
            >
              닫기
            </button>
          </div>
        )}
      </header>

      <p
        className="fctc-non-gate-banner"
        data-testid="tutorial-non-gate-banner"
      >
        <span>
          자율 참고 안내 · 강제 투어나 운동·자세 검수 절차가 아니며 언제든 건너뛰거나 닫을 수 있습니다.
        </span>
      </p>

      {currentVisibility === 'open' ? (
        <>
          <div
            className="fctc-context-strip"
            data-testid="tutorial-context-summary"
          >
            <div className="fctc-context-chips">
              <span className="fctc-chip fctc-chip-highlight">
                추천 단계: {getTutorialStepById(resolvedSummary.suggestedStepId).shortTabLabelKo}
              </span>
              {resolvedSummary.targetMinutesStatus === 'known' &&
                resolvedSummary.targetMinutes !== null && (
                  <span className="fctc-chip">
                    목표 {resolvedSummary.targetMinutes}분
                  </span>
                )}
              <span className="fctc-chip">
                동작 {resolvedSummary.exerciseStepCount}개
              </span>
              {resolvedSummary.restStepCount > 0 && (
                <span className="fctc-chip">
                  휴식 {resolvedSummary.restStepCount}개
                </span>
              )}
              <span className="fctc-chip">
                한 줄 초안 {resolvedSummary.ideaDraftCount}개
              </span>
              <span className="fctc-chip">
                저장된 수업 {resolvedSummary.savedSequenceCount}개
              </span>
            </div>
            <p className="fctc-suggested-reason">
              {resolvedSummary.suggestedReasonKo}
            </p>
            {resolvedSummary.isPartialContext && (
              <p
                className="fctc-partial-note"
                data-testid="tutorial-partial-context-note"
              >
                일부 입력 항목 형식이 달라 확인 가능한 수업 정보만 요약해 표시하고 있습니다.
              </p>
            )}
          </div>

          <div
            className="fctc-tablist"
            role="tablist"
            aria-label="첫 수업 3단계 순서"
          >
            {FIRST_CLASS_TUTORIAL_STEPS.map((step, index) => {
              const isSelected = step.id === activeStep.id;
              const isCompleted = completedStepsMap[step.id];
              return (
                <button
                  key={step.id}
                  ref={(el) => {
                    tabRefs.current[step.id] = el;
                  }}
                  id={getTabId(step.id)}
                  type="button"
                  role="tab"
                  className="fctc-tab"
                  data-testid={`tutorial-tab-${step.id}`}
                  aria-selected={isSelected}
                  aria-controls={getPanelId(step.id)}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => selectStepByIndex(index)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                >
                  <span>{step.shortTabLabelKo}</span>
                  <span className="fctc-tab-check-indicator" aria-hidden="true">
                    {isCompleted ? '✓ 확인됨' : `${step.stepNumber}/3`}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            id={getPanelId(activeStep.id)}
            role="tabpanel"
            aria-labelledby={getTabId(activeStep.id)}
            className="fctc-tabpanel"
            data-testid={`tutorial-panel-${activeStep.id}`}
          >
            <div className="fctc-step-header">
              <span className="fctc-step-badge">{activeStep.badgeKo}</span>
              <span className="fctc-chip">
                {activeStep.stepNumber} / {FIRST_CLASS_TUTORIAL_STEPS.length} 단계
              </span>
            </div>

            <h3
              ref={activeStepHeadingRef}
              tabIndex={-1}
              className="fctc-step-heading"
              data-testid="tutorial-active-step-heading"
            >
              {activeStep.titleKo}
            </h3>

            <p className="fctc-step-summary">{activeStep.summaryKo}</p>

            <FirstClassTutorialIllustration
              kind={activeStep.illustrationKind}
              altKo={activeStep.illustrationAltKo}
              captionKo={activeStep.illustrationCaptionKo}
            />

            <ol
              className="fctc-step-bullets"
              data-testid="tutorial-step-bullets"
            >
              {activeStep.bulletsKo.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ol>

            <div
              className="fctc-real-ui-path"
              data-testid="tutorial-real-ui-path"
            >
              <strong>실제 화면 위치:</strong> {activeStep.realUiPathKo}
            </div>

            <p className="fctc-step-non-gate-note">
              {activeStep.nonGateNoticeKo}
            </p>

            <div className="fctc-step-actions-row">
              <button
                type="button"
                className="fctc-btn fctc-btn-check"
                data-testid={`tutorial-check-${activeStep.id}`}
                aria-pressed={isActiveStepCompleted}
                onClick={handleToggleActiveTask}
              >
                {isActiveStepCompleted
                  ? '✓ 이 단계 해봤어요 (내 메모)'
                  : '이 단계 직접 해봤어요 체크 (선택)'}
              </button>

              {onStepAction && (
                <button
                  type="button"
                  className="fctc-btn fctc-btn-secondary"
                  data-testid={`tutorial-action-${activeStep.id}`}
                  onClick={() => onStepAction(activeStep.id)}
                >
                  {activeStep.actionButtonLabelKo}
                </button>
              )}
            </div>
          </div>

          <nav
            className="fctc-footer-nav"
            aria-label="튜토리얼 단계 이동"
          >
            <div className="fctc-footer-group">
              <button
                type="button"
                className="fctc-btn fctc-btn-secondary"
                data-testid="tutorial-prev-btn"
                disabled={activeStepIndex <= 0}
                onClick={() =>
                  selectStepByIndex(activeStepIndex - 1, { focusHeading: true })
                }
              >
                이전 단계
              </button>
              <button
                type="button"
                className="fctc-btn fctc-btn-primary"
                data-testid="tutorial-next-btn"
                disabled={
                  activeStepIndex >= FIRST_CLASS_TUTORIAL_STEPS.length - 1
                }
                onClick={() =>
                  selectStepByIndex(activeStepIndex + 1, { focusHeading: true })
                }
              >
                다음 단계
              </button>
            </div>

            <div className="fctc-footer-group">
              <button
                type="button"
                className="fctc-btn fctc-btn-ghost"
                data-testid="tutorial-restart-btn"
                onClick={() => selectStepByIndex(0, { focusHeading: true })}
              >
                1단계부터 보기
              </button>

              {onReturnToWorkbench && (
                <button
                  type="button"
                  className="fctc-btn fctc-btn-secondary"
                  data-testid="tutorial-return-workbench-btn"
                  onClick={onReturnToWorkbench}
                >
                  내 수업 구성으로 가기
                </button>
              )}
            </div>
          </nav>
        </>
      ) : (
        <div
          className="fctc-collapsed-bar"
          data-testid="tutorial-collapsed-bar"
        >
          <p className="fctc-collapsed-text">
            {currentVisibility === 'skipped'
              ? '첫 수업 3단계 안내를 건너뛰었습니다. 필요할 때 언제든 다시 펼쳐 볼 수 있어요.'
              : '첫 수업 3단계 안내가 접혀 있습니다. 필요할 때 언제든 다시 펼쳐 볼 수 있어요.'}
          </p>
          <div className="fctc-collapsed-actions">
            <button
              ref={reopenBtnRef}
              type="button"
              className="fctc-btn fctc-btn-primary"
              data-testid="tutorial-reopen-btn"
              onClick={handleReopenCurrent}
            >
              첫 수업 3단계 다시보기
            </button>
            <button
              type="button"
              className="fctc-btn fctc-btn-secondary"
              data-testid="tutorial-reopen-first-btn"
              onClick={handleReopenFirst}
            >
              1단계부터 다시보기
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export interface FirstClassTutorialFixtureWindowApi {
  readonly revision: 'first-class-tutorial-candidate-v1';
  showSource: (
    source: unknown,
    options?: {
      preferReducedMotion?: boolean;
      initialVisibility?: FirstClassTutorialVisibilityState;
    },
  ) => void;
  showTwo: (firstSource?: unknown, secondSource?: unknown) => void;
}

declare global {
  interface Window {
    __firstClassTutorialFixture__?: FirstClassTutorialFixtureWindowApi;
  }
}

export interface FirstClassTutorialFixtureHarnessProps {
  readonly initialPresetId?: string;
}

/**
 * Self-contained browser verification harness for `FirstClassTutorialCandidate`.
 * Exposes `window.__firstClassTutorialFixture__` for automated Playwright verification.
 */
export function FirstClassTutorialFixtureHarness({
  initialPresetId = 'empty-first-visit',
}: FirstClassTutorialFixtureHarnessProps) {
  const initialPreset = getTutorialFixturePresetById(initialPresetId);
  const [activePresetId, setActivePresetId] = useState<string>(initialPreset.id);
  const [customSource, setCustomSource] = useState<unknown>(initialPreset.source);
  const [customVisibility, setCustomVisibility] =
    useState<FirstClassTutorialVisibilityState>(
      initialPreset.initialVisibility ?? 'open',
    );
  const [reducedMotionOverride, setReducedMotionOverride] = useState<
    boolean | undefined
  >(undefined);
  const [dualSources, setDualSources] = useState<{
    first: unknown;
    second: unknown;
  } | null>(null);
  const [lastActionNote, setLastActionNote] = useState<string>('');

  const selectPreset = (presetId: string) => {
    const preset = getTutorialFixturePresetById(presetId);
    setActivePresetId(preset.id);
    setCustomSource(preset.source);
    setCustomVisibility(preset.initialVisibility ?? 'open');
    setDualSources(null);
    setLastActionNote(`프리셋 선택됨: ${preset.labelKo}`);
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const api: FirstClassTutorialFixtureWindowApi = {
      revision: 'first-class-tutorial-candidate-v1',
      showSource: (nextSource, opts) => {
        setActivePresetId('custom');
        setCustomSource(nextSource);
        setCustomVisibility(opts?.initialVisibility ?? 'open');
        setReducedMotionOverride(opts?.preferReducedMotion);
        setDualSources(null);
        setLastActionNote('사용자 정의 source 입력 적용됨');
      },
      showTwo: (firstSource, secondSource) => {
        const first =
          firstSource ?? getTutorialFixturePresetById('empty-first-visit').source;
        const second =
          secondSource ??
          getTutorialFixturePresetById('blocks-composed-50min').source;
        setActivePresetId('dual');
        setDualSources({ first, second });
        setLastActionNote('독립 인스턴스 2개 동시 렌더링 모드');
      },
    };
    window.__firstClassTutorialFixture__ = api;
    return () => {
      if (window.__firstClassTutorialFixture__ === api) {
        delete window.__firstClassTutorialFixture__;
      }
    };
  }, []);

  return (
    <main className="fctc-harness" data-testid="first-class-tutorial-fixture-harness">
      <section
        className="fctc-harness-controls"
        aria-label="첫 수업 튜토리얼 검증 프리셋 선택"
      >
        <div className="fctc-header">
          <div className="fctc-header-title-group">
            <p className="fctc-eyebrow">Isolated Verification Harness</p>
            <h1 className="fctc-title">
              첫 수업 3단계 시각 튜토리얼 후보 검증 화면
            </h1>
          </div>
        </div>

        <div className="fctc-harness-preset-list">
          {FIRST_CLASS_TUTORIAL_FIXTURE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="fctc-btn fctc-btn-secondary"
              data-testid={`fixture-preset-${preset.id}`}
              aria-pressed={activePresetId === preset.id && dualSources === null}
              onClick={() => selectPreset(preset.id)}
            >
              {preset.labelKo}
            </button>
          ))}
        </div>

        {lastActionNote && (
          <p
            className="fctc-suggested-reason"
            data-testid="fixture-last-action-note"
          >
            {lastActionNote}
          </p>
        )}
      </section>

      {dualSources ? (
        <div
          className="fctc-harness-dual-grid"
          data-testid="fixture-dual-instances"
        >
          <div data-testid="fixture-instance-primary">
            <FirstClassTutorialCandidate
              source={dualSources.first}
              preferReducedMotion={reducedMotionOverride}
              onStepAction={(stepId) =>
                setLastActionNote(`인스턴스 1 단계 안내 클릭: ${stepId}`)
              }
            />
          </div>
          <div data-testid="fixture-instance-secondary">
            <FirstClassTutorialCandidate
              source={dualSources.second}
              preferReducedMotion={reducedMotionOverride}
              onStepAction={(stepId) =>
                setLastActionNote(`인스턴스 2 단계 안내 클릭: ${stepId}`)
              }
            />
          </div>
        </div>
      ) : (
        <FirstClassTutorialCandidate
          source={customSource}
          initialVisibility={customVisibility}
          preferReducedMotion={reducedMotionOverride}
          onStepAction={(stepId) =>
            setLastActionNote(`단계 위치 안내 호출됨: ${stepId}`)
          }
          onReturnToWorkbench={() =>
            setLastActionNote('내 수업 구성으로 돌아가기 호출됨')
          }
        />
      )}
    </main>
  );
}
