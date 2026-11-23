import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Bell,
  BellOff,
  Brain,
  Check,
  Eye,
  EyeOff,
  FileText,
  Headphones,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Square,
  Wind,
  Zap,
} from 'lucide-react';
import type { DifficultyLevel, PilatesExercise, SequenceStep } from '../types/pilates';
import {
  BLIND_STAGE_META_KO,
  REHEARSAL_MODE_META_KO,
  buildSequenceRehearsalScript,
  type MemorizationBlindStage,
  type SequenceAudioRehearsalMode,
} from '../utils/naturalVoiceScriptBuilder';
import {
  NATURAL_VOICE_SPEED_OPTIONS,
  createNaturalVoiceController,
  inspectInitialNaturalVoiceState,
  type NaturalVoiceController,
  type NaturalVoiceControllerEnv,
  type NaturalVoiceControllerState,
  type NaturalVoiceSpeed,
} from '../utils/naturalVoiceEngine';
import {
  STUDIO_VOICE_PERSONAS,
  getPreferredStudioVoicePersona,
  setPreferredStudioVoicePersona,
  subscribeStudioVoicePersona,
  type StudioVoicePersonaId,
} from '../utils/studioNeuralVoiceResolver';
import { LightDismissDialog } from './LightDismissDialog';
import '../styles/sequence-audio-rehearsal.css';

export interface SequenceAudioRehearsalModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly sequenceTitle: string;
  readonly steps: readonly SequenceStep[];
  readonly exercisesById: ReadonlyMap<string, PilatesExercise>;
  readonly level?: DifficultyLevel;
  readonly initialMode?: SequenceAudioRehearsalMode;
  readonly initialBlindStage?: MemorizationBlindStage;
  readonly preferCloud?: boolean;
  readonly engineOptions?: NaturalVoiceControllerEnv;
}

const MODE_ORDER: readonly SequenceAudioRehearsalMode[] = [
  'podcast',
  'fast-3min',
  'quiz',
  'breath-tempo',
];

const BLIND_STAGE_ORDER: readonly MemorizationBlindStage[] = [
  'full',
  'hide-details',
  'hide-names',
];

function formatDurationBadge(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const min = Math.floor(safe / 60);
  const sec = safe % 60;
  if (min === 0) return `약 ${sec}초`;
  if (sec === 0) return `약 ${min}분`;
  return `약 ${min}분 ${sec}초`;
}

export function SequenceAudioRehearsalModal({
  open,
  onClose,
  sequenceTitle,
  steps,
  exercisesById,
  level = '1.5',
  initialMode = 'podcast',
  initialBlindStage = 'full',
  preferCloud = true,
  engineOptions,
}: SequenceAudioRehearsalModalProps) {
  const [mode, setMode] = useState<SequenceAudioRehearsalMode>(initialMode);
  const [blindStage, setBlindStage] = useState<MemorizationBlindStage>(initialBlindStage);
  const [speed, setSpeed] = useState<NaturalVoiceSpeed>(1);
  const [studioPersona, setStudioPersona] = useState<StudioVoicePersonaId>(() =>
    getPreferredStudioVoicePersona(),
  );
  const [breathChimesEnabled, setBreathChimesEnabled] = useState(true);
  const [showFullScript, setShowFullScript] = useState(false);
  const [onlyConfusedFilter, setOnlyConfusedFilter] = useState(false);
  const [memorizedStepIds, setMemorizedStepIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [confusedStepIds, setConfusedStepIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [peekedStepIds, setPeekedStepIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [revealedQuizSteps, setRevealedQuizSteps] = useState<ReadonlySet<number>>(
    () => new Set(),
  );

  const confusedList = useMemo(
    () => steps.filter((step) => confusedStepIds.has(step.stepId)).map((step) => step.stepId),
    [steps, confusedStepIds],
  );
  const activeConfusedOnly = onlyConfusedFilter && confusedList.length > 0;

  const script = useMemo(
    () =>
      buildSequenceRehearsalScript({
        sequenceTitle,
        steps,
        exercisesById,
        mode,
        level,
        quizCountdownSec: 3,
        focusStepIds: activeConfusedOnly ? confusedList : undefined,
      }),
    [sequenceTitle, steps, exercisesById, mode, level, activeConfusedOnly, confusedList],
  );

  const controllerKey = `${open ? 'open' : 'closed'}:${mode}:${activeConfusedOnly ? confusedList.join(',') : 'all'}:${script.segments.length}:${preferCloud ? 'cloud' : 'local'}`;

  const initialVoiceState = useMemo(
    () =>
      inspectInitialNaturalVoiceState({
        sessionId: `sequence-rehearsal-${mode}`,
        titleKo: `${script.sequenceTitle} · ${REHEARSAL_MODE_META_KO[mode].shortLabelKo}`,
        segments: script.segments,
        initialSpeed: speed,
        preferCloud,
        breathChimesEnabled,
        env: engineOptions,
      }),
    // Only recompute default state when the controller key or engine env changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [controllerKey, engineOptions],
  );

  const controllerRef = useRef<NaturalVoiceController | null>(null);
  const [scopedLiveState, setScopedLiveState] = useState<{
    readonly key: string;
    readonly state: NaturalVoiceControllerState;
  } | null>(null);

  const voiceState =
    scopedLiveState && scopedLiveState.key === controllerKey
      ? scopedLiveState.state
      : initialVoiceState;

  useEffect(() => {
    if (!open) {
      controllerRef.current?.stop();
      return;
    }

    const controller = createNaturalVoiceController({
      sessionId: `sequence-rehearsal-${mode}`,
      titleKo: `${script.sequenceTitle} · ${REHEARSAL_MODE_META_KO[mode].shortLabelKo}`,
      segments: script.segments,
      initialSpeed: speed,
      studioPersona: getPreferredStudioVoicePersona(),
      preferCloud,
      breathChimesEnabled,
      env: engineOptions,
      onStateChange: (nextState) => {
        setScopedLiveState({ key: controllerKey, state: nextState });
        if (
          nextState.currentSegment?.tone === 'quiz-answer' &&
          nextState.currentSegment.stepIndex !== undefined
        ) {
          const answeredStepIdx = nextState.currentSegment.stepIndex;
          setRevealedQuizSteps((prev) => {
            if (prev.has(answeredStepIdx)) return prev;
            const next = new Set(prev);
            next.add(answeredStepIdx);
            return next;
          });
        }
      },
    });
    controllerRef.current = controller;

    return () => {
      controller.destroy();
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    };
    // speed and breathChimesEnabled are updated live on the active controller without rebuilding it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, controllerKey, script, preferCloud, engineOptions]);

  useEffect(() => {
    return subscribeStudioVoicePersona((nextPersona) => {
      setStudioPersona(nextPersona);
      controllerRef.current?.setStudioPersona(nextPersona);
    });
  }, []);

  const handleClose = () => {
    controllerRef.current?.stop('리허설 창을 닫아 음성을 멈췄어요.');
    onClose();
  };

  const handleModeChange = (nextMode: SequenceAudioRehearsalMode) => {
    if (nextMode === mode) return;
    controllerRef.current?.stop();
    setRevealedQuizSteps(new Set());
    setMode(nextMode);
  };

  const handleBlindStageChange = (nextStage: MemorizationBlindStage) => {
    setBlindStage(nextStage);
    setPeekedStepIds(new Set());
  };

  const isPlaying = voiceState.status === 'playing' || voiceState.status === 'loading';
  const isPaused = voiceState.status === 'paused';
  const currentSegment = voiceState.currentSegment;
  const activeStepIndex = currentSegment?.stepIndex;
  const activeStepSummary =
    activeStepIndex !== undefined
      ? script.steps.find((item) => item.stepIndex === activeStepIndex)
      : undefined;

  const progressPercent = Math.round(
    (voiceState.status === 'completed' ? 1 : voiceState.progressRatio) * 100,
  );

  const exerciseStepsCount = script.steps.filter((s) => !s.isRest).length;

  const handlePrimaryPlayToggle = () => {
    const ctrl = controllerRef.current;
    if (!ctrl || script.segments.length === 0) return;
    if (isPlaying) {
      ctrl.pause();
    } else if (isPaused) {
      ctrl.resume();
    } else if (voiceState.status === 'completed') {
      ctrl.play(0);
    } else {
      ctrl.play(voiceState.activeSegmentIndex);
    }
  };

  const handleSpeedSelect = (nextSpeed: NaturalVoiceSpeed) => {
    setSpeed(nextSpeed);
    controllerRef.current?.setSpeed(nextSpeed);
  };

  const handleToggleBreathChimes = () => {
    const next = !breathChimesEnabled;
    setBreathChimesEnabled(next);
    controllerRef.current?.setBreathChimesEnabled(next);
  };

  const handleRevealQuizNow = () => {
    if (!activeStepSummary) return;
    setRevealedQuizSteps((prev) => {
      const next = new Set(prev);
      next.add(activeStepSummary.stepIndex);
      return next;
    });
    if (activeStepSummary.quizAnswerSegmentIndex !== undefined) {
      controllerRef.current?.jumpTo(activeStepSummary.quizAnswerSegmentIndex);
    }
  };

  const handleToggleMemorized = (stepId: string) => {
    setMemorizedStepIds((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
    setConfusedStepIds((prev) => {
      if (!prev.has(stepId)) return prev;
      const next = new Set(prev);
      next.delete(stepId);
      return next;
    });
  };

  const handleToggleConfused = (stepId: string) => {
    setConfusedStepIds((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  };

  const handleTogglePeekStep = (stepId: string) => {
    setPeekedStepIds((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  };

  const isQuizPromptHidden =
    mode === 'quiz' &&
    currentSegment?.tone === 'quiz-prompt' &&
    activeStepIndex !== undefined &&
    !revealedQuizSteps.has(activeStepIndex);

  const isStageBlindDetails =
    mode !== 'quiz' &&
    blindStage !== 'full' &&
    Boolean(activeStepSummary && !peekedStepIds.has(activeStepSummary.stepId));
  const isStageBlindName = isStageBlindDetails && blindStage === 'hide-names';

  const breathPhaseLabel =
    voiceState.breathPhase === 'inhale'
      ? '코로 천천히 들숨'
      : voiceState.breathPhase === 'exhale'
        ? '입으로 부드럽게 날숨'
        : '호흡 리듬 대기 중';

  return (
    <LightDismissDialog
      open={open}
      onClose={handleClose}
      title="출근길 이어폰 암기 · 음성 리허설"
      subtitle={`${script.sequenceTitle} · ${exerciseStepsCount}개 동작 (${formatDurationBadge(script.estimatedAudioSec)})`}
      maxWidth="640px"
      variant="sheet"
    >
      <div className="pf-rehearsal-modal-root">
        {/* 4 One-Tap Mode Tabs */}
        <div
          className="pf-rehearsal-mode-track"
          role="tablist"
          aria-label="음성 리허설 모드 선택"
        >
          {MODE_ORDER.map((modeKey) => {
            const meta = REHEARSAL_MODE_META_KO[modeKey];
            const selected = mode === modeKey;
            return (
              <button
                key={modeKey}
                type="button"
                role="tab"
                aria-selected={selected}
                className={[
                  'pf-rehearsal-mode-tab',
                  selected ? 'pf-rehearsal-mode-tab--active' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => handleModeChange(modeKey)}
              >
                {modeKey === 'podcast' && <Headphones size={17} aria-hidden="true" />}
                {modeKey === 'fast-3min' && <Zap size={17} aria-hidden="true" />}
                {modeKey === 'quiz' && <Brain size={17} aria-hidden="true" />}
                {modeKey === 'breath-tempo' && <Wind size={17} aria-hidden="true" />}
                <span>{meta.shortLabelKo}</span>
              </button>
            );
          })}
        </div>

        <p className="pf-rehearsal-mode-desc">
          {REHEARSAL_MODE_META_KO[mode].descriptionKo}
        </p>

        {steps.length === 0 ? (
          <div className="pf-rehearsal-empty">
            먼저 시퀀스에 동작을 하나 이상 담아 주세요. 동작을 담으면 이어폰으로 들으며 바로 암기할 수 있어요.
          </div>
        ) : (
          <>
            {/* ① 체위·스프링 기준 3~4막 덩어리 청킹 지도 */}
            {script.chunks.length > 0 && (
              <section
                className="pf-rehearsal-chunk-section"
                aria-label="체위·스프링 덩어리 청킹 지도"
              >
                <div className="pf-rehearsal-section-head">
                  <h3 className="pf-rehearsal-section-title">
                    한눈에 외우는 {script.chunks.length}막 덩어리 지도 (체위·스프링 묶음)
                  </h3>
                  <span className="pf-rehearsal-counter">
                    총 {script.totalDurationMin}분
                  </span>
                </div>
                <div className="pf-rehearsal-chunk-grid">
                  {script.chunks.map((act) => {
                    const isActActive =
                      activeStepSummary !== undefined &&
                      act.stepIds.includes(activeStepSummary.stepId);
                    const startOrder = act.stepOrders[0];
                    const endOrder = act.stepOrders[act.stepOrders.length - 1];
                    const orderRange =
                      startOrder === endOrder ? `${startOrder}번` : `${startOrder}~${endOrder}번`;
                    return (
                      <button
                        key={act.actNumber}
                        type="button"
                        className={[
                          'pf-rehearsal-chunk-card',
                          isActActive ? 'pf-rehearsal-chunk-card--active' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => controllerRef.current?.jumpTo(act.firstSegmentIndex)}
                      >
                        <span className="pf-rehearsal-chunk-title">{act.titleKo}</span>
                        <span className="pf-rehearsal-chunk-meta">
                          {orderRange} · {act.totalDurationMin}분
                        </span>
                        <span className="pf-rehearsal-spring-keycap">
                          {blindStage === 'hide-details' || blindStage === 'hide-names'
                            ? `${act.positionLabelKo} 묶음`
                            : act.springSummaryKo}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Single Focal Stage Card */}
            <section
              className="pf-rehearsal-stage"
              aria-label="현재 리허설 구간"
            >
              <div className="pf-rehearsal-stage-meta">
                <div className="pf-rehearsal-meta-left">
                  <span
                    className={[
                      'pf-voice-quality-badge',
                      voiceState.activeTier === 'cloud-neural'
                        ? 'pf-voice-quality-badge--studio'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {voiceState.voiceQualityLabelKo}
                  </span>
                  {voiceState.cacheHitCount > 0 && (
                    <span className="pf-voice-quality-badge">오프라인 저장됨</span>
                  )}
                  {!isQuizPromptHidden && !isStageBlindDetails && currentSegment?.springCode && (
                    <span className="pf-rehearsal-spring-keycap">
                      {currentSegment.springCode}
                    </span>
                  )}
                </div>
                <span className="pf-rehearsal-counter">
                  {activeStepSummary
                    ? `${String(activeStepSummary.stepOrder).padStart(2, '0')} / ${String(steps.length).padStart(2, '0')}`
                    : `${voiceState.activeSegmentIndex + 1} / ${Math.max(1, voiceState.totalSegments)}`}
                </span>
              </div>

              {mode === 'quiz' && currentSegment?.quizCard ? (
                <div className="pf-rehearsal-quiz-box">
                  {isQuizPromptHidden ? (
                    <>
                      <div className="pf-rehearsal-quiz-countdown">
                        <div>
                          <h3 className="pf-rehearsal-step-title">
                            {currentSegment.quizCard.stepOrder}번 동작, 기억나시나요?
                          </h3>
                          <p className="pf-voice-live-line">
                            {currentSegment.quizCard.previousNameKo
                              ? `직전 동작: ${currentSegment.quizCard.previousNameKo}`
                              : '오늘 수업의 첫 번째 동작과 스프링을 떠올려 보세요.'}
                          </p>
                        </div>
                        <span
                          className="pf-rehearsal-countdown-num"
                          aria-live="polite"
                          aria-label="정답 카운트다운"
                        >
                          {voiceState.quizCountdownRemainingSec ?? currentSegment.countdownSec ?? 3}
                        </span>
                      </div>
                      <div className="pf-rehearsal-quiz-actions">
                        <button
                          type="button"
                          className="pf-voice-btn"
                          onClick={handleRevealQuizNow}
                        >
                          <Eye size={16} aria-hidden="true" />
                          <span>정답 바로 보기</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="pf-rehearsal-step-title">
                        {currentSegment.quizCard.stepOrder}번 정답 ·{' '}
                        {currentSegment.quizCard.answerNameKo}
                      </h3>
                      <p className="pf-voice-live-line">
                        {currentSegment.quizCard.answerApparatusKo} ·{' '}
                        {currentSegment.quizCard.answerSpringSpokenKo} ·{' '}
                        {currentSegment.quizCard.answerPositionKo}
                      </p>
                      <p className="pf-voice-live-line">
                        {currentSegment.quizCard.answerKeyCueKo}
                      </p>
                      {activeStepSummary && (
                        <div className="pf-rehearsal-quiz-actions">
                          <button
                            type="button"
                            className={[
                              'pf-rehearsal-toggle-chip',
                              memorizedStepIds.has(activeStepSummary.stepId)
                                ? 'pf-rehearsal-toggle-chip--on'
                                : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            onClick={() => handleToggleMemorized(activeStepSummary.stepId)}
                            aria-pressed={memorizedStepIds.has(activeStepSummary.stepId)}
                          >
                            <Check size={15} aria-hidden="true" />
                            <span>
                              {memorizedStepIds.has(activeStepSummary.stepId)
                                ? '익혔어요 완료'
                                : '익혔어요 체크'}
                            </span>
                          </button>
                          <button
                            type="button"
                            className={[
                              'pf-rehearsal-mini-action',
                              confusedStepIds.has(activeStepSummary.stepId)
                                ? 'pf-rehearsal-mini-action--confused'
                                : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            onClick={() => handleToggleConfused(activeStepSummary.stepId)}
                            aria-pressed={confusedStepIds.has(activeStepSummary.stepId)}
                          >
                            <AlertCircle size={14} aria-hidden="true" />
                            <span>
                              {confusedStepIds.has(activeStepSummary.stepId)
                                ? '헷갈림 표시됨'
                                : '헷갈림 체크'}
                            </span>
                          </button>
                          <span className="pf-voice-quality-badge">
                            암기 완료 {memorizedStepIds.size} / {exerciseStepsCount}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <>
                  <h3 className="pf-rehearsal-step-title">
                    {isStageBlindName && activeStepSummary
                      ? `${activeStepSummary.stepOrder}번 동작 · 머릿속으로 떠올려 보세요`
                      : currentSegment?.exerciseNameKo
                        ? `${currentSegment.stepOrder ? `${currentSegment.stepOrder}번 · ` : ''}${currentSegment.exerciseNameKo}`
                        : currentSegment?.labelKo ?? script.sequenceTitle}
                  </h3>

                  {mode === 'breath-tempo' && (
                    <div className="pf-rehearsal-breath-pacer" aria-live="polite">
                      <span className="pf-rehearsal-breath-phase">
                        <span
                          className={[
                            'pf-rehearsal-breath-dot',
                            voiceState.breathPhase === 'inhale'
                              ? 'pf-rehearsal-breath-dot--inhale'
                              : voiceState.breathPhase === 'exhale'
                                ? 'pf-rehearsal-breath-dot--exhale'
                                : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          aria-hidden="true"
                        />
                        {breathPhaseLabel}
                      </span>
                      <span className="pf-rehearsal-tempo-ratio">
                        템포 {currentSegment?.breathTempoRatio ?? '3:0:5'}
                      </span>
                    </div>
                  )}

                  {currentSegment && (
                    isStageBlindDetails && activeStepSummary ? (
                      <div className="pf-rehearsal-quiz-actions">
                        <button
                          type="button"
                          className="pf-voice-btn pf-voice-btn--compact"
                          onClick={() => handleTogglePeekStep(activeStepSummary.stepId)}
                        >
                          <Eye size={15} aria-hidden="true" />
                          <span>가려진 스프링·큐 살짝 확인</span>
                        </button>
                      </div>
                    ) : (
                      <p className="pf-rehearsal-spoken-cue" aria-live="polite">
                        {currentSegment.textKo}
                      </p>
                    )
                  )}
                </>
              )}

              {/* Progress Bar */}
              <div
                className="pf-voice-progress-track"
                role="progressbar"
                aria-label="시퀀스 리허설 진행률"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPercent}
              >
                <div
                  className="pf-voice-progress-fill"
                  style={{
                    transform: `scaleX(${Math.max(0, Math.min(1, progressPercent / 100))})`,
                  }}
                />
              </div>

              <div className="pf-rehearsal-progress-row">
                <span>{currentSegment?.labelKo ?? '대기 중'}</span>
                <span>{progressPercent}%</span>
              </div>

              {/* One-Handed Transport Bar */}
              <div className="pf-rehearsal-transport" role="group" aria-label="음성 재생 조작">
                <button
                  type="button"
                  className="pf-rehearsal-transport-btn"
                  onClick={() => controllerRef.current?.previous()}
                  disabled={voiceState.activeSegmentIndex <= 0}
                  aria-label="이전 구간"
                >
                  <SkipBack size={18} aria-hidden="true" />
                </button>

                <button
                  type="button"
                  className="pf-rehearsal-play-main"
                  onClick={handlePrimaryPlayToggle}
                  aria-pressed={isPlaying}
                >
                  {isPlaying ? (
                    <Pause size={20} aria-hidden="true" />
                  ) : (
                    <Play size={20} aria-hidden="true" />
                  )}
                  <span>
                    {voiceState.status === 'loading'
                      ? '준비 중…'
                      : isPlaying
                        ? '일시정지'
                        : isPaused
                          ? '이어듣기'
                          : voiceState.status === 'completed'
                            ? '처음부터 다시'
                            : '음성으로 듣기'}
                  </span>
                </button>

                <button
                  type="button"
                  className="pf-rehearsal-transport-btn"
                  onClick={() => controllerRef.current?.next()}
                  disabled={voiceState.activeSegmentIndex >= script.segments.length - 1}
                  aria-label="다음 구간"
                >
                  <SkipForward size={18} aria-hidden="true" />
                </button>

                <button
                  type="button"
                  className="pf-rehearsal-transport-btn"
                  onClick={() => controllerRef.current?.stop()}
                  disabled={!isPlaying && !isPaused}
                  aria-label="정지"
                >
                  <Square size={16} aria-hidden="true" />
                </button>
              </div>
            </section>

            {voiceState.errorMessageKo && (
              <p className="pf-rehearsal-notice" role="status">
                {voiceState.errorMessageKo}
              </p>
            )}

            {/* Speed, AI Voice Persona & Breath Chime Controls */}
            <div className="pf-rehearsal-options-bar">
              {preferCloud && (
                <div className="pf-rehearsal-speed-group" role="group" aria-label="AI 강사 목소리 선택">
                  {(['seoyeon', 'hyunsu'] as const).map((pid) => (
                    <button
                      key={pid}
                      type="button"
                      className={[
                        'pf-rehearsal-speed-btn',
                        studioPersona === pid ? 'pf-rehearsal-speed-btn--active' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => setPreferredStudioVoicePersona(pid)}
                      aria-pressed={studioPersona === pid}
                    >
                      {STUDIO_VOICE_PERSONAS[pid].nameKo} AI
                    </button>
                  ))}
                </div>
              )}

              <div className="pf-rehearsal-speed-group" role="group" aria-label="재생 속도">
                {NATURAL_VOICE_SPEED_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={[
                      'pf-rehearsal-speed-btn',
                      speed === opt ? 'pf-rehearsal-speed-btn--active' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => handleSpeedSelect(opt)}
                    aria-pressed={speed === opt}
                  >
                    {opt.toFixed(1)}×
                  </button>
                ))}
              </div>

              <button
                type="button"
                className={[
                  'pf-rehearsal-toggle-chip',
                  breathChimesEnabled ? 'pf-rehearsal-toggle-chip--on' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={handleToggleBreathChimes}
                aria-pressed={breathChimesEnabled}
              >
                {breathChimesEnabled ? (
                  <Bell size={15} aria-hidden="true" />
                ) : (
                  <BellOff size={15} aria-hidden="true" />
                )}
                <span>호흡 알림음 {breathChimesEnabled ? '켜짐' : '꺼짐'}</span>
              </button>
            </div>

            {/* ② 3단계 블라인드 가리기 + 헷갈림 체크 집중 필터 */}
            <section
              className="pf-rehearsal-blind-panel"
              aria-label="3단계 블라인드 암기 가리기"
            >
              <div className="pf-rehearsal-section-head">
                <h3 className="pf-rehearsal-section-title">
                  3단계 블라인드 가리기 · 암기 테스트
                </h3>
                <span className="pf-voice-live-line">
                  {BLIND_STAGE_META_KO[blindStage].hintKo}
                </span>
              </div>

              <div
                className="pf-rehearsal-blind-track"
                role="group"
                aria-label="블라인드 가리기 단계 선택"
              >
                {BLIND_STAGE_ORDER.map((stageKey) => {
                  const meta = BLIND_STAGE_META_KO[stageKey];
                  const active = blindStage === stageKey;
                  return (
                    <button
                      key={stageKey}
                      type="button"
                      className={[
                        'pf-rehearsal-blind-btn',
                        active ? 'pf-rehearsal-blind-btn--active' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => handleBlindStageChange(stageKey)}
                      aria-pressed={active}
                    >
                      {meta.stepLabelKo}
                    </button>
                  );
                })}
              </div>

              {confusedList.length > 0 && (
                <div className="pf-rehearsal-confused-bar" role="status">
                  <span>헷갈림 체크 {confusedList.length}개 동작</span>
                  <button
                    type="button"
                    className={[
                      'pf-rehearsal-toggle-chip',
                      activeConfusedOnly ? 'pf-rehearsal-toggle-chip--on' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => {
                      controllerRef.current?.stop();
                      setOnlyConfusedFilter((prev) => !prev);
                    }}
                    aria-pressed={activeConfusedOnly}
                  >
                    <span>
                      {activeConfusedOnly
                        ? '전체 동작으로 돌아가기'
                        : `헷갈린 ${confusedList.length}개만 집중 듣기`}
                    </span>
                  </button>
                </div>
              )}
            </section>

            {/* Step Jump List with 3-Stage Blind Masking & Confused Check */}
            <ul className="pf-rehearsal-step-list" aria-label="시퀀스 동작 목록">
              {script.steps.map((item) => {
                const isCurrent = activeStepIndex === item.stepIndex;
                const isPeeked = peekedStepIds.has(item.stepId);
                const isQuizMasked =
                  mode === 'quiz' && !item.isRest && !revealedQuizSteps.has(item.stepIndex);
                const hideName =
                  !item.isRest && !isPeeked && (isQuizMasked || blindStage === 'hide-names');
                const hideDetails =
                  !item.isRest &&
                  !isPeeked &&
                  (isQuizMasked || blindStage === 'hide-details' || blindStage === 'hide-names');
                const isMemorized = memorizedStepIds.has(item.stepId);
                const isConfused = confusedStepIds.has(item.stepId);

                return (
                  <li key={item.stepId} className="pf-rehearsal-step-row">
                    <button
                      type="button"
                      className={[
                        'pf-rehearsal-step-item',
                        'pf-rehearsal-step-main',
                        isCurrent ? 'pf-rehearsal-step-item--active' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => controllerRef.current?.jumpTo(item.firstSegmentIndex)}
                    >
                      <span className="pf-rehearsal-step-num">
                        {String(item.stepOrder).padStart(2, '0')}
                      </span>
                      <span className="pf-rehearsal-step-name">
                        {hideName
                          ? `${item.stepOrder}번 동작 (암기 전 · 탭해서 듣기)`
                          : item.nameKo}
                        {!item.isRest && (
                          <span className="pf-rehearsal-step-sub">
                            {hideDetails
                              ? `${item.positionLabelKo} · 스프링·큐 숨김`
                              : `${item.springSpokenKo} · ${item.keyCueKo}`}
                          </span>
                        )}
                      </span>
                      {hideDetails ? (
                        <span className="pf-rehearsal-mask-pill">숨김</span>
                      ) : (
                        <span className="pf-rehearsal-spring-keycap">
                          {isMemorized ? '암기 완료' : item.springCode}
                        </span>
                      )}
                    </button>

                    {!item.isRest && (
                      <div className="pf-rehearsal-step-actions">
                        {(blindStage !== 'full' || isQuizMasked) && (
                          <button
                            type="button"
                            className="pf-rehearsal-mini-action"
                            onClick={() => handleTogglePeekStep(item.stepId)}
                            aria-label={`${item.stepOrder}번 ${isPeeked ? '다시 가리기' : '살짝 보기'}`}
                            aria-pressed={isPeeked}
                          >
                            {isPeeked ? (
                              <EyeOff size={14} aria-hidden="true" />
                            ) : (
                              <Eye size={14} aria-hidden="true" />
                            )}
                          </button>
                        )}
                        <button
                          type="button"
                          className={[
                            'pf-rehearsal-mini-action',
                            isConfused ? 'pf-rehearsal-mini-action--confused' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          onClick={() => handleToggleConfused(item.stepId)}
                          aria-label={`${item.stepOrder}번 헷갈림 체크`}
                          aria-pressed={isConfused}
                        >
                          <AlertCircle size={14} aria-hidden="true" />
                          <span>{isConfused ? '헷갈림' : '체크'}</span>
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* Full Script Fallback / Inspection Disclosure */}
            <div className="pf-rehearsal-script-disclosure">
              <button
                type="button"
                className="pf-voice-btn pf-voice-btn--compact"
                onClick={() => setShowFullScript((prev) => !prev)}
                aria-expanded={showFullScript}
              >
                <FileText size={15} aria-hidden="true" />
                <span>{showFullScript ? '전체 대본 닫기' : '전체 대본 보기'}</span>
              </button>
              {showFullScript && (
                <div className="pf-rehearsal-script-body" role="region" aria-label="전체 음성 대본">
                  {script.fullTextKo}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </LightDismissDialog>
  );
}
