import React, { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Contrast,
  Expand,
  Flag,
  Pause,
  Play,
  Plus,
  Sun,
  Volume2,
} from 'lucide-react';
import {
  APPARATUS_LABELS,
  CANONICAL_BLOCKS,
  POSITION_LABELS,
  PROP_LABELS,
} from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import type { ActiveWorkspaceTab } from '../store/usePilatesStore';
import {
  formatSecondsToMMSS,
  getMovementKey,
  getSequenceDurations,
  getStepTiming,
  getStepSideLabels,
  isRestStep,
} from '../utils/sequenceEngine';
import { isExerciseAutoEligible } from '../utils/exerciseReview';
import { isExerciseAuthoringEligible } from '../utils/exerciseAuthoring';
import { LightDismissDialog } from './LightDismissDialog';
import type { TeachingLogContext } from './LogSessionModal';
import '../styles/teaching.css';
import '../styles/class-voice.css';
import { useClassVoiceGuidance } from '../hooks/useClassVoiceGuidance';

export interface LiveStageNavigationHandle {
  /** True means Stage owns the pending exit; keep it mounted until a decision. */
  requestExit: (destination: ActiveWorkspaceTab) => boolean;
}
interface LiveStageViewProps {
  onOpenLogModal: (
    sequenceId: string,
    context?: TeachingLogContext,
    destination?: ActiveWorkspaceTab,
  ) => void;
  navigationRef?: React.Ref<LiveStageNavigationHandle>;
  onNavigate?: (destination: ActiveWorkspaceTab) => void;
}

interface TeachingClock {
  index: number;
  remainingMs: number;
  elapsedMs: number;
  running: boolean;
  sampledAt: number;
  elapsedByStep: Record<number, number>;
}

// Absolute timestamps keep the timer accurate when a browser delays a frame or tab.
function sampleClock(
  clock: TeachingClock,
  now: number,
  durations: number[],
  autoAdvance: boolean,
): TeachingClock {
  if (!clock.running) return { ...clock, sampledAt: now };
  let remaining = clock.remainingMs;
  let index = clock.index;
  let delta = Math.max(0, now - clock.sampledAt);
  let consumed = 0;
  const elapsedByStep = { ...clock.elapsedByStep };
  while (delta >= remaining) {
    consumed += remaining;
    elapsedByStep[index] = (elapsedByStep[index] ?? 0) + remaining;
    delta -= remaining;
    if (!autoAdvance || index >= durations.length - 1)
      return {
        index,
        remainingMs: 0,
        elapsedMs: clock.elapsedMs + consumed,
        running: false,
        sampledAt: now,
        elapsedByStep,
      };
    index += 1;
    remaining = durations[index];
  }
  elapsedByStep[index] = (elapsedByStep[index] ?? 0) + delta;
  return {
    index,
    remainingMs: remaining - delta,
    elapsedMs: clock.elapsedMs + consumed + delta,
    running: true,
    sampledAt: now,
    elapsedByStep,
  };
}

const formatSideSeconds = (seconds: number) =>
  `${formatSecondsToMMSS(seconds)}${seconds % 1 ? '.5' : ''}`;

const LAYER_LABELS = { easy: '가볍게', standard: '기본', hard: '도전' };
const BOX_LABELS = { none: '없음', 'long-box': '롱박스', 'short-box': '숏박스' };

export const LiveStageView: React.FC<LiveStageViewProps> = ({
  onOpenLogModal,
  navigationRef,
  onNavigate,
}) => {
  const { activeSequenceId, activeTitle, activeSteps, exercises, setActiveTab } = usePilatesStore();
  const [session] = useState(() => ({ id: activeSequenceId, title: activeTitle }));
  const [steps, setSteps] = useState(() => activeSteps.map((step) => ({ ...step })));
  const durations = useMemo(
    () => steps.map((step) => Math.max(1, Math.round(step.durationMin * 60000))),
    [steps],
  );
  const [clock, setClock] = useState<TeachingClock>(() => ({
    index: 0,
    remainingMs: durations[0] ?? 0,
    elapsedMs: 0,
    running: false,
    sampledAt: Date.now(),
    elapsedByStep: {},
  }));
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [screenOn, setScreenOn] = useState(true);
  const [wakeStatus, setWakeStatus] = useState('시작 시 화면 유지 요청');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [showAllCues, setShowAllCues] = useState(false);
  const wakeRef = useRef<WakeLockSentinel | null>(null);
  const mounted = useRef(true);
  const runningIntent = useRef(false);
  const screenEnabled = useRef(true);
  const boardRef = useRef<HTMLDivElement>(null);
  const exitContentRef = useRef<HTMLParagraphElement>(null);
  const reviewContentRef = useRef<HTMLDivElement>(null);
  const [exitTarget, setExitTarget] = useState<ActiveWorkspaceTab | null>(null);
  const [reviewTarget, setReviewTarget] = useState<ActiveWorkspaceTab | null>(null);
  const navigate = onNavigate ?? setActiveTab;
  const targetLabel = (target: ActiveWorkspaceTab | null) =>
    ({
      workbench: '오늘의 수업',
      history: '수업 기록',
      schedule: '강사 일정',
      binder: '저장한 플로우',
      atlas: '동작 라이브러리',
      stage: '수업 진행',
    })[target ?? 'workbench'];
  const closeNative = (content: HTMLElement | null) => {
    const dialog = content?.closest<HTMLDialogElement>('dialog');
    if (dialog?.open) dialog.close();
  };
  const closeExit = () => {
    closeNative(exitContentRef.current);
    setExitTarget(null);
    setExitOpen(false);
  };
  const closeReview = () => {
    closeNative(reviewContentRef.current);
    setReviewTarget(null);
    setReviewOpen(false);
  };
  const exerciseMap = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises],
  );
  const current = steps[clock.index];
  const currentIsRest = !!current && isRestStep(current);
  const exercise = current ? exerciseMap.get(current.exerciseId) : undefined;
  const next = steps[clock.index + 1];
  const nextExercise = next ? exerciseMap.get(next.exerciseId) : undefined;

  useEffect(() => {
    if (!clock.running) return;
    const tick = () => setClock((value) => sampleClock(value, Date.now(), durations, autoAdvance));
    const interval = window.setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [clock.running, durations, autoAdvance]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      void wakeRef.current?.release().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    if (!clock.running) {
      runningIntent.current = false;
      void wakeRef.current?.release().catch(() => undefined);
    }
  }, [clock.running]);

  const requestScreenLock = async () => {
    if (!screenEnabled.current || (wakeRef.current && !wakeRef.current.released)) return;
    if (!('wakeLock' in navigator)) {
      setWakeStatus('화면 유지 미지원 · 기기 설정을 확인해 주세요');
      return;
    }
    try {
      const lock = await navigator.wakeLock.request('screen');
      if (!mounted.current || !runningIntent.current || !screenEnabled.current) {
        await lock.release();
        return;
      }
      wakeRef.current = lock;
      setWakeStatus('화면 유지 중');
      lock.addEventListener('release', () => {
        if (mounted.current) setWakeStatus('화면 유지 해제됨');
      });
    } catch {
      if (mounted.current) setWakeStatus('화면 유지 요청을 사용할 수 없어요');
    }
  };
  const toggleRunning = () => {
    if (clock.running) {
      classVoice.pause();
      setClock((value) => ({
        ...sampleClock(value, Date.now(), durations, autoAdvance),
        running: false,
      }));
      void wakeRef.current?.release().catch(() => undefined);
    } else {
      runningIntent.current = true;
      classVoice.start(
        (clock.remainingMs || durations[clock.index]) / 1000,
        clock.remainingMs > 0
          ? phase
          : currentIsRest
            ? '휴식'
            : timing && timing.explanationSec > 0
              ? '설명 · 세팅'
              : timing?.sides === 2 || current?.sideMode
                ? `수행 · ${sideLabels[0]}`
                : '수행',
      );
      setClock((value) => ({
        ...value,
        remainingMs: value.remainingMs || durations[value.index],
        running: true,
        sampledAt: Date.now(),
      }));
      void requestScreenLock();
    }
  };
  const selectStep = (index: number) => {
    if (index < 0 || index >= steps.length) return;
    setClock((value) => ({
      ...sampleClock(value, Date.now(), durations, autoAdvance),
      index,
      remainingMs: durations[index],
    }));
    setShowAllCues(false);
  };
  const addMinute = () => {
    const sampled = sampleClock(clock, Date.now(), durations, autoAdvance);
    setClock({ ...sampled, remainingMs: sampled.remainingMs + 60000 });
    setSteps((value) =>
      value.map((step, index) =>
        index === sampled.index ? { ...step, durationMin: step.durationMin + 1 } : step,
      ),
    );
  };
  const pauseForReview = () => {
    classVoice.pause();
    setReviewTarget(null);
    setClock((value) => ({
      ...sampleClock(value, Date.now(), durations, autoAdvance),
      running: false,
    }));
    setReviewOpen(true);
  };
  const pauseForExit = () => {
    classVoice.pause();
    setExitTarget(null);
    setClock((value) => ({
      ...sampleClock(value, Date.now(), durations, autoAdvance),
      running: false,
    }));
    setExitOpen(true);
  };

  const unavailable = steps.filter((step) => {
    if (isRestStep(step)) return false;
    const item = exerciseMap.get(step.exerciseId);
    return !item || !isExerciseAuthoringEligible(item);
  });
  const movementKeys = steps
    .filter((step) => !isRestStep(step))
    .flatMap((step) => {
      const item = exerciseMap.get(step.exerciseId);
      return item ? [getMovementKey(item)] : [];
    });
  const timing = current ? getStepTiming(current, exercise) : null;
  const sideLabels = current ? getStepSideLabels(current, exercise) : [];
  const stepElapsedSec = Math.max(0, (durations[clock.index] - clock.remainingMs) / 1000);
  const phase =
    !current || !timing
      ? ''
      : currentIsRest
        ? '휴식'
        : stepElapsedSec < timing.explanationSec
          ? '설명 · 세팅'
          : stepElapsedSec < timing.explanationSec + timing.movementSec
            ? timing.sides === 2
              ? stepElapsedSec - timing.explanationSec < timing.perSideSec
                ? `수행 · ${sideLabels[0]}`
                : `수행 · ${sideLabels[1]}`
              : current.sideMode
                ? `수행 · ${sideLabels[0]}`
                : '수행'
            : '다음 동작 전환';
  const classVoice = useClassVoiceGuidance({
    stepKey: current?.stepId ?? '',
    title: currentIsRest ? '휴식' : (exercise?.nameKo ?? ''),
    breath:
      !currentIsRest && exercise && isExerciseAutoEligible(exercise) ? exercise.breathPattern : '',
    phase,
    remainingSec: Math.max(0, clock.remainingMs / 1000),
    nextTitle: next && isRestStep(next) ? '휴식' : (nextExercise?.nameKo ?? ''),
    running: clock.running,
    eligible:
      !!current &&
      (!!exercise || currentIsRest) &&
      movementKeys.length > 0 &&
      unavailable.length === 0 &&
      new Set(movementKeys).size === movementKeys.length &&
      !exitOpen &&
      !reviewOpen,
  });
  useImperativeHandle(navigationRef, () => ({
    requestExit(destination) {
      const hasSessionData =
        clock.running ||
        clock.elapsedMs > 0 ||
        JSON.stringify(steps) !== JSON.stringify(activeSteps);
      if (!hasSessionData) return false;
      classVoice.pause();
      setExitTarget(destination);
      setClock((value) => ({
        ...sampleClock(value, Date.now(), durations, autoAdvance),
        running: false,
      }));
      setExitOpen(true);
      return true;
    },
  }));
  const totalMin = steps.reduce((sum, step) => sum + step.durationMin, 0);
  const plannedTiming = getSequenceDurations(steps);
  const trackedRestSec = steps.reduce(
    (sum, step, index) => sum + (isRestStep(step) ? (clock.elapsedByStep[index] ?? 0) / 1000 : 0),
    0,
  );
  const logContext: TeachingLogContext = {
    actualDurationSec: Math.round(clock.elapsedMs / 1000),
    actualRestDurationSec: Math.round(trackedRestSec),
    stepsSnapshot: steps.map((step) => ({ ...step })),
    sequenceTitle: session.title,
    taughtStepIds: steps
      .filter((_, index) => (clock.elapsedByStep[index] ?? 0) > 0)
      .map((step) => step.stepId),
  };

  const exitDialogs = (
    <>
      <LightDismissDialog
        open={reviewOpen}
        onClose={() => {
          if (reviewContentRef.current?.closest('dialog')?.open) return;
          setReviewTarget(null);
          setReviewOpen(false);
        }}
        title="수업 진행을 마칠까요?"
        subtitle="기록하기 전에 실제 진행 내용을 확인해 주세요."
      >
        <div ref={reviewContentRef} className="teaching-finish-summary">
          <span>타이머가 진행된 시간</span>
          <strong>{formatSecondsToMMSS(clock.elapsedMs / 1000)}</strong>
          <p className="muted">
            일시정지를 제외한 타이머 시간입니다. 실제 수업 시간은 다음 기록 화면에서 수정할 수
            있어요.
          </p>
          <p>
            {clock.index + 1} / {steps.length}번째 동작에서 종료 · 계획 합계{' '}
            {Number(totalMin.toFixed(2))}분
          </p>
          {reviewTarget && <p>기록을 마친 뒤 이동할 화면: {targetLabel(reviewTarget)}</p>}
        </div>
        <div className="teaching-form-actions">
          <button type="button" className="btn-secondary" onClick={closeReview}>
            계속 확인하기
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              const destination = reviewTarget;
              closeReview();
              if (destination) onOpenLogModal(session.id, logContext, destination);
              else onOpenLogModal(session.id, logContext);
            }}
          >
            <Check size={17} /> 검토하고 기록하기
          </button>
        </div>
        <button
          type="button"
          className="teaching-log-link"
          onClick={() => {
            const destination = reviewTarget ?? 'workbench';
            closeReview();
            navigate(destination);
          }}
        >
          {reviewTarget ? '기록 없이 선택한 화면으로 이동' : '기록 없이 계획으로 돌아가기'}
        </button>
      </LightDismissDialog>
      <LightDismissDialog
        open={exitOpen}
        onClose={() => {
          if (exitContentRef.current?.closest('dialog')?.open) return;
          setExitTarget(null);
          setExitOpen(false);
        }}
        title="수업 화면을 나갈까요?"
        subtitle="진행 중인 타이머는 일시정지되었습니다."
      >
        <p ref={exitContentRef}>기록하지 않고 나가면 이번 타이머 진행 시간은 보관되지 않아요.</p>
        {exitTarget && <p>이동할 화면: {targetLabel(exitTarget)}</p>}
        <div className="teaching-form-actions">
          <button type="button" className="btn-secondary" onClick={closeExit}>
            수업 화면 유지
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setReviewTarget(exitTarget);
              closeExit();
              setReviewOpen(true);
            }}
          >
            종료 내용 검토
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              const destination = exitTarget ?? 'workbench';
              closeExit();
              navigate(destination);
            }}
          >
            기록 없이 나가기
          </button>
        </div>
      </LightDismissDialog>
    </>
  );
  if (unavailable.length > 0)
    return (
      <>
        <section className="panel teaching-empty" aria-label="수업 동작 정보 필요">
          <Flag size={32} />
          <h1 id="workspace-main-heading" tabIndex={-1}>
            동작 정보를 확인해 주세요
          </h1>
          <p>
            현재 구성에서 찾을 수 없거나 형식이 올바르지 않은 동작이 {unavailable.length}개
            있습니다. 해당 동작을 다시 추가하거나 수업안에서 빼 주세요.
          </p>
          <p className="muted">
            강사가 출처·기구·난이도·설명과 전체 수업의 적합성을 확인해야 합니다. 앱은 개인별
            안전성을 판단하지 않습니다.
          </p>
          <div className="button-row">
            <button className="btn-primary" onClick={() => setActiveTab('atlas')}>
              동작 정보로 이동
            </button>
            <button className="btn-secondary" onClick={() => setActiveTab('workbench')}>
              계획으로 돌아가기
            </button>
          </div>
        </section>
        {exitDialogs}
      </>
    );

  if (new Set(movementKeys).size !== movementKeys.length)
    return (
      <>
        <section className="panel teaching-empty" aria-label="수업 중복 검토 필요">
          <Flag size={32} />
          <h1 id="workspace-main-heading" tabIndex={-1}>
            중복 동작을 확인해 주세요
          </h1>
          <p>
            현재 구성에 같은 동작이 반복되어 있습니다. 계획에서 중복 동작을 교체하거나 삭제한 뒤
            전체 수업을 검토해 주세요.
          </p>
          <button type="button" className="btn-primary" onClick={() => setActiveTab('workbench')}>
            계획으로 돌아가기
          </button>
        </section>
        {exitDialogs}
      </>
    );

  if (!current || !timing || (!exercise && !currentIsRest) || movementKeys.length === 0)
    return (
      <>
        <div className="panel teaching-empty">
          <Flag size={32} />
          <h1 id="workspace-main-heading" tabIndex={-1}>
            진행할 동작이 없어요
          </h1>
          <p className="muted">계획에서 동작을 추가하거나 삭제된 동작을 교체해 주세요.</p>
          <button type="button" className="btn-primary" onClick={() => setActiveTab('workbench')}>
            계획으로 돌아가기
          </button>
        </div>
        {exitDialogs}
      </>
    );

  const progress = Math.min(
    100,
    Math.max(0, (1 - clock.remainingMs / durations[clock.index]) * 100),
  );
  const block = CANONICAL_BLOCKS.find((value) => value.category === current.blockCategory);

  return (
    <div
      ref={boardRef}
      className={`teaching-stage ${highContrast ? 'teaching-high-contrast' : ''}`}
    >
      <p className="teaching-safety">
        실제 수행 전 몸 상태와 기구 설정을 확인하세요. 검토 기록은 자격 인증이나 개인별 운동
        적합성 보장이 아닙니다.
      </p>
      <header className="teaching-stage-header">
        <div>
          <button type="button" className="teaching-back" onClick={pauseForExit}>
            <ArrowLeft size={16} />
            계획으로
          </button>
          <span className="eyebrow">수업 진행</span>
          <h1 id="workspace-main-heading" tabIndex={-1}>
            {session.title}
          </h1>
          <p className="muted">
            계획 {Number(totalMin.toFixed(2))}분 · 타이머 진행{' '}
            <strong>{formatSecondsToMMSS(clock.elapsedMs / 1000)}</strong>{' '}
            <span>일시정지 시간 제외</span>
          </p>
          <p className="muted">
            계획 운동 {formatSecondsToMMSS(plannedTiming.exerciseSec)} · 휴식{' '}
            {formatSecondsToMMSS(plannedTiming.restSec)} · 휴식은 전체 수업 시간에 포함됩니다.
          </p>
          <p className="muted">
            타이머 운동 {formatSecondsToMMSS(Math.max(0, clock.elapsedMs / 1000 - trackedRestSec))}{' '}
            · 휴식 {formatSecondsToMMSS(trackedRestSec)}
          </p>
        </div>
        <div className="teaching-stage-utility">
          <button
            type="button"
            className="icon-btn"
            aria-label="수업 화면 고대비"
            aria-pressed={highContrast}
            onClick={() => setHighContrast((value) => !value)}
          >
            <Contrast size={19} />
          </button>
          <button
            type="button"
            className="icon-btn teaching-fullscreen"
            aria-label="수업 화면 전체 화면"
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
              else void boardRef.current?.requestFullscreen?.().catch(() => undefined);
            }}
          >
            <Expand size={19} />
          </button>
          <button type="button" className="btn-secondary" onClick={pauseForReview}>
            <Flag size={17} />
            종료 / 기록
          </button>
        </div>
      </header>
      <div className="teaching-stage-layout">
        <section
          className={`panel teaching-current-panel ${currentIsRest ? 'is-rest' : ''}`}
          aria-label={currentIsRest ? '현재 휴식' : '현재 동작'}
        >
          <div className="teaching-current-meta">
            <span>
              {String(clock.index + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
              <span className="teaching-meta-dot">·</span>
              {currentIsRest ? '중간 휴식' : (block?.nameKo ?? '수업 동작')}
            </span>
            <span>
              {exercise && !currentIsRest
                ? `${APPARATUS_LABELS[exercise.apparatus].ko} · ${POSITION_LABELS[exercise.bodyPosition].ko}`
                : '전체 수업 시간에 포함'}
            </span>
          </div>
          <h2 className="teaching-current-name">{currentIsRest ? '휴식' : exercise?.nameKo}</h2>
          {!currentIsRest && exercise && !isExerciseAutoEligible(exercise) && (
            <p className="muted">
              미검토 계획 자료 · 실제 수행 전 기구와 몸 상태를 확인하세요. 안전성·효과를 보장하지
              않습니다.
            </p>
          )}
          <p className="teaching-current-en">
            {currentIsRest ? 'BREAK · 다음 동작 전 잠시 쉬어갑니다' : exercise?.nameEn}
          </p>
          {!currentIsRest &&
            (current.repetitions !== undefined ||
              current.sets !== undefined ||
              current.sideMode) && (
              <p className="muted teaching-practice-summary">
                강사 계획{' '}
                {current.repetitions !== undefined ? `${current.repetitions}회` : '횟수 미지정'}
                {current.sets !== undefined ? ` × ${current.sets}세트` : ''}
                {current.sideMode ? ` · ${sideLabels.join(' → ')}` : ''} · 시간은 별도 계획값입니다.
              </p>
            )}
          <div className="teaching-timer-area">
            <span
              className={`teaching-timer-status ${clock.running ? 'running' : ''}`}
              role="status"
            >
              {clock.running
                ? '진행 중'
                : clock.remainingMs === 0
                  ? '항목 시간 완료'
                  : clock.elapsedMs === 0
                    ? '준비되면 시작하세요'
                    : '일시정지'}
              <span> · {phase}</span>
            </span>
            <div
              className="teaching-timer-digits"
              role="timer"
              aria-label={`${currentIsRest ? '현재 휴식' : '현재 동작'} 남은 시간 ${Math.ceil(clock.remainingMs / 1000)}초`}
            >
              {formatSecondsToMMSS(Math.ceil(clock.remainingMs / 1000))}
            </div>
            <div className="teaching-timing-breakdown">
              <span>전체 {formatSecondsToMMSS(timing.totalSec)}</span>
              {!currentIsRest && (
                <>
                  <span>설명 {timing.explanationSec}초</span>
                  <span>수행 {formatSecondsToMMSS(timing.movementSec)}</span>
                  {timing.sides === 2 && (
                    <span>
                      한쪽 {Number.isInteger(timing.perSideSec) ? '' : '약 '}
                      {formatSideSeconds(timing.perSideSec)}
                    </span>
                  )}
                  <span>전환 {timing.transitionSec}초</span>
                </>
              )}
            </div>
            {timing.sides === 2 && (
              <p
                className={`teaching-side-note ${stepElapsedSec >= timing.explanationSec + timing.perSideSec ? 'switch-side' : ''}`}
                role="status"
              >
                {stepElapsedSec >= timing.explanationSec + timing.perSideSec
                  ? `${sideLabels[1]}을 진행할 차례입니다.`
                  : '양쪽 수행이 전체 시간에 포함되어 있어요.'}
              </p>
            )}
          </div>
          <div
            className="teaching-timer-progress"
            role="progressbar"
            aria-label="현재 동작 진행"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="teaching-play-controls">
            <button
              type="button"
              className="btn-secondary teaching-step-control"
              aria-label="이전 동작"
              disabled={clock.index === 0}
              onClick={() => selectStep(clock.index - 1)}
            >
              <ChevronLeft size={22} />
              <span>이전</span>
            </button>
            <button type="button" className="btn-primary teaching-play" onClick={toggleRunning}>
              {clock.running ? (
                <>
                  <Pause size={23} />
                  일시정지
                </>
              ) : (
                <>
                  <Play size={23} />
                  {clock.elapsedMs === 0
                    ? currentIsRest
                      ? '휴식 시작'
                      : '수업 시작'
                    : clock.remainingMs === 0
                      ? '현재 동작 다시 시작'
                      : '이어서 진행'}
                </>
              )}
            </button>
            <button
              type="button"
              className="btn-secondary teaching-step-control"
              aria-label={currentIsRest ? '휴식 건너뛰기' : '다음 동작'}
              disabled={clock.index === steps.length - 1 && !currentIsRest}
              onClick={() =>
                clock.index === steps.length - 1 ? pauseForReview() : selectStep(clock.index + 1)
              }
            >
              <span>{currentIsRest ? '휴식 건너뛰기' : '다음'}</span>
              <ChevronRight size={22} />
            </button>
          </div>
          <div className="teaching-timer-options">
            <button type="button" className="btn-ghost" onClick={addMinute}>
              <Plus size={16} />
              {currentIsRest ? '현재 휴식 1분 추가' : '현재 동작 1분 추가'}
            </button>
            <label className="teaching-switch">
              <input
                type="checkbox"
                checked={autoAdvance}
                onChange={(event) => {
                  setClock((value) => sampleClock(value, Date.now(), durations, autoAdvance));
                  setAutoAdvance(event.target.checked);
                }}
              />
              <span>시간 종료 시 다음 동작</span>
            </label>
          </div>
          <section className="teaching-cue-section" aria-label="수업 음성 안내 설정">
            <h3>
              <Volume2 size={18} /> 기기 음성 안내
            </h3>
            <p className="muted">
              이 수업에서 켠 뒤 타이머를 시작하면 검토한 동작·호흡 메모와 계획 시간을 읽습니다. 무료
              기기 한국어 음성만 사용하며, 호흡 속도나 새 운동 지침을 만들지 않습니다.
            </p>
            <div className="button-row">
              <button
                type="button"
                className="btn-secondary"
                aria-pressed={classVoice.enabled}
                disabled={!classVoice.available}
                onClick={classVoice.toggleEnabled}
              >
                {classVoice.enabled ? '음성 안내 끄기' : '음성 안내 켜기'}
              </button>
              <button
                type="button"
                className="btn-ghost"
                disabled={!classVoice.enabled}
                onClick={classVoice.stop}
              >
                음성 즉시 중지
              </button>
            </div>
            <fieldset className="teaching-voice-options" disabled={!classVoice.available}>
              <legend>읽어 줄 내용</legend>
              {(
                [
                  ['movement', '동작·구간 안내'],
                  ['breath', '검토한 호흡 메모'],
                  ['time', '남은 시간·종료 안내'],
                ] as const
              ).map(([key, label]) => (
                <label className="teaching-switch" key={key}>
                  <input
                    type="checkbox"
                    checked={classVoice.preferences[key]}
                    onChange={(event) => classVoice.changePreference(key, event.target.checked)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </fieldset>
            <p className="muted" role="status">
              {classVoice.error ||
                (!classVoice.available
                  ? '이 브라우저에서 기기 한국어 음성을 찾지 못했어요. 음성 없이도 수업을 진행할 수 있습니다.'
                  : classVoice.enabled
                    ? '음성 켜짐 · 일시정지·화면 이탈·탭 숨김 시 소리를 멈춥니다.'
                    : '음성 꺼짐 · 수업마다 직접 켜 주세요.')}
            </p>
          </section>
          {exercise && !currentIsRest ? (
            <section className="teaching-cue-section">
              <h3>
                <Volume2 size={18} />
                지금 전할 큐
              </h3>
              <p className="teaching-breath">{exercise.breathPattern}</p>
              <ul>
                {(showAllCues ? exercise.cues : exercise.cues.slice(0, 2)).map((cue, index) => (
                  <li key={index}>{cue}</li>
                ))}
              </ul>
              {exercise.cues.length > 2 && (
                <button
                  type="button"
                  className="teaching-log-link"
                  onClick={() => setShowAllCues((value) => !value)}
                  aria-expanded={showAllCues}
                >
                  {showAllCues ? '핵심 큐만 보기' : `전체 큐 ${exercise.cues.length}개 보기`}
                </button>
              )}
              <div className="teaching-layer">
                <strong>{LAYER_LABELS[current.selectedLayer]}</strong>
                <span>{exercise.layers[current.selectedLayer]}</span>
              </div>
              {current.instructorNote && (
                <p className="teaching-instructor-note">
                  <strong>내 메모</strong> {current.instructorNote}
                </p>
              )}
            </section>
          ) : (
            <section className="teaching-rest-note">
              <p>휴식 중에는 동작 큐나 기구 설정을 표시하지 않습니다.</p>
              {current.instructorNote && <p>{current.instructorNote}</p>}
            </section>
          )}
        </section>
        <aside className="teaching-stage-aside">
          <section className="panel teaching-next-panel">
            <span className="eyebrow">다음 동작</span>
            {next && isRestStep(next) ? (
              <>
                <h2>휴식</h2>
                <p className="muted">
                  전체 {formatSecondsToMMSS(next.durationMin * 60)} · 전체 수업 시간에 포함
                </p>
              </>
            ) : next && nextExercise ? (
              <>
                <h2>{nextExercise.nameKo}</h2>
                <p className="muted">
                  전체 {formatSecondsToMMSS(next.durationMin * 60)} ·{' '}
                  {POSITION_LABELS[nextExercise.bodyPosition].ko}
                </p>
                {(next.repetitions !== undefined || next.sets !== undefined || next.sideMode) && (
                  <p className="muted">
                    {next.repetitions !== undefined ? `${next.repetitions}회` : '횟수 미지정'}
                    {next.sets !== undefined ? ` × ${next.sets}세트` : ''}
                    {next.sideMode ? ` · ${getStepSideLabels(next, nextExercise).join(' → ')}` : ''}
                  </p>
                )}
                <div className="teaching-next-setup">
                  <span>스프링 원문</span>
                  <strong>
                    {next.customSpringOverride || nextExercise.springs || '별도 세팅 확인'}
                  </strong>
                  <span>박스 · 풋바 · 헤드레스트</span>
                  <strong>
                    {BOX_LABELS[nextExercise.box]} · {nextExercise.footbar} ·{' '}
                    {nextExercise.headrest}
                  </strong>
                </div>
                <p className="teaching-next-cue">{nextExercise.cues[0]}</p>
              </>
            ) : (
              <>
                <h2>마지막 동작이에요</h2>
                <p className="muted">마무리한 뒤 진행 내용을 확인하고 기록을 남겨 주세요.</p>
              </>
            )}
          </section>
          {exercise && !currentIsRest && (
            <section className="panel teaching-setup-panel">
              <h2 className="section-heading">현재 세팅</h2>
              <dl>
                <div>
                  <dt>스프링 원문</dt>
                  <dd>{current.customSpringOverride || exercise.springs || '기구 세팅 확인'}</dd>
                </div>
                <div>
                  <dt>박스</dt>
                  <dd>{BOX_LABELS[exercise.box]}</dd>
                </div>
                <div>
                  <dt>풋바 / 헤드레스트</dt>
                  <dd>
                    {exercise.footbar} / {exercise.headrest}
                  </dd>
                </div>
                <div>
                  <dt>소도구</dt>
                  <dd>
                    {exercise.props
                      .filter((prop) => prop !== 'none')
                      .map((prop) => PROP_LABELS[prop].ko)
                      .join(', ') || '없음'}
                  </dd>
                </div>
              </dl>
              <p className="teaching-safety">
                <strong>강사 확인</strong>
                {exercise.precautions}
                <span>
                  기구마다 스프링 장력이 다릅니다. 원문 표기를 참고해 실제 기구와 회원 상태를
                  확인하세요.
                </span>
              </p>
            </section>
          )}
        </aside>
      </div>
      <section className="panel teaching-stage-outline">
        <div className="teaching-outline-heading">
          <h2 className="section-heading">오늘의 흐름</h2>
          <span className="muted">선택하면 해당 동작의 타이머가 다시 시작됩니다.</span>
        </div>
        <ol>
          {steps.map((step, index) => (
            <li key={step.stepId}>
              <button
                type="button"
                className={index === clock.index ? 'current' : ''}
                aria-current={index === clock.index ? 'step' : undefined}
                onClick={() => selectStep(index)}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>
                  {isRestStep(step)
                    ? '휴식'
                    : (exerciseMap.get(step.exerciseId)?.nameKo ?? '삭제된 동작')}
                </strong>
                <small>{formatSecondsToMMSS(step.durationMin * 60)}</small>
              </button>
            </li>
          ))}
        </ol>
      </section>
      <div className="teaching-stage-footer">
        <label className="teaching-switch">
          <input
            type="checkbox"
            checked={screenOn}
            onChange={(event) => {
              screenEnabled.current = event.target.checked;
              setScreenOn(event.target.checked);
              if (!event.target.checked) void wakeRef.current?.release().catch(() => undefined);
            }}
          />
          <Sun size={15} />
          <span>시작 시 화면 유지</span>
        </label>
        <span className="muted">{wakeStatus}</span>
        <span className="muted">추가 시간은 이번 진행에만 적용됩니다.</span>
      </div>
      {exitDialogs}
    </div>
  );
};
