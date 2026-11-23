import { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Pause, Play, Square, Volume2 } from 'lucide-react';
import type { PilatesExercise, SequenceStep } from '../types/pilates';
import { buildNaturalExerciseScript } from '../utils/naturalVoiceScriptBuilder';
import {
  createNaturalVoiceController,
  inspectInitialNaturalVoiceState,
  type NaturalVoiceController,
  type NaturalVoiceControllerEnv,
  type NaturalVoiceControllerState,
} from '../utils/naturalVoiceEngine';
import '../styles/sequence-audio-rehearsal.css';

export interface NaturalVoiceSpeakButtonProps {
  readonly exercise: PilatesExercise;
  readonly step?: SequenceStep;
  readonly variant?: 'compact' | 'pill' | 'card';
  readonly labelKo?: string;
  readonly showProgressBar?: boolean;
  readonly showQualityBadge?: boolean;
  readonly preferCloud?: boolean;
  readonly breathChimesEnabled?: boolean;
  readonly className?: string;
  readonly engineOptions?: NaturalVoiceControllerEnv;
}

export function NaturalVoiceSpeakButton({
  exercise,
  step,
  variant = 'compact',
  labelKo = '음성으로 듣기',
  showProgressBar = true,
  showQualityBadge = true,
  preferCloud = true,
  breathChimesEnabled = true,
  className = '',
  engineOptions,
}: NaturalVoiceSpeakButtonProps) {
  const script = useMemo(
    () => buildNaturalExerciseScript(exercise, { step, includeTip: true }),
    [exercise, step],
  );

  const sessionKey = `${exercise.id}:${preferCloud ? 'cloud' : 'local'}:${breathChimesEnabled ? 'chime' : 'mute'}:${script.segments.length}`;

  const initialVoiceState = useMemo(
    () =>
      inspectInitialNaturalVoiceState({
        sessionId: `exercise-natural-${exercise.id}`,
        titleKo: script.titleKo,
        segments: script.segments,
        preferCloud,
        breathChimesEnabled,
        env: engineOptions,
      }),
    [exercise.id, script, preferCloud, breathChimesEnabled, engineOptions],
  );

  const controllerRef = useRef<NaturalVoiceController | null>(null);
  const [showFallbackScript, setShowFallbackScript] = useState(false);
  const [scopedLiveState, setScopedLiveState] = useState<{
    readonly key: string;
    readonly state: NaturalVoiceControllerState;
  } | null>(null);

  const voiceState =
    scopedLiveState && scopedLiveState.key === sessionKey
      ? scopedLiveState.state
      : initialVoiceState;

  useEffect(() => {
    const controller = createNaturalVoiceController({
      sessionId: `exercise-natural-${exercise.id}`,
      titleKo: script.titleKo,
      segments: script.segments,
      preferCloud,
      breathChimesEnabled,
      env: engineOptions,
      onStateChange: (nextState) => {
        setScopedLiveState({ key: sessionKey, state: nextState });
      },
    });
    controllerRef.current = controller;

    return () => {
      controller.destroy();
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    };
  }, [exercise.id, script, preferCloud, breathChimesEnabled, engineOptions, sessionKey]);

  const isPlaying = voiceState.status === 'playing' || voiceState.status === 'loading';
  const isPaused = voiceState.status === 'paused';
  const isActive = isPlaying || isPaused;
  const isUnsupported = voiceState.status === 'unsupported';

  const primaryLabel =
    voiceState.status === 'loading'
      ? '음성 준비 중…'
      : isPlaying
        ? '일시정지'
        : isPaused
          ? '이어듣기'
          : voiceState.status === 'completed'
            ? '다시 듣기'
            : labelKo;

  const progressPercent = Math.round(
    (voiceState.status === 'completed' ? 1 : voiceState.progressRatio) * 100,
  );

  const handlePrimaryClick = () => {
    const ctrl = controllerRef.current;
    if (!ctrl) return;
    if (isPlaying) {
      ctrl.pause();
      return;
    }
    if (isPaused) {
      ctrl.resume();
      return;
    }
    ctrl.play(0);
  };

  const handleStop = () => {
    controllerRef.current?.stop();
  };

  return (
    <div
      className={[
        'pf-voice-btn-wrap',
        variant === 'card' ? 'pf-voice-btn-wrap--card' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="pf-voice-btn-row">
        <button
          type="button"
          className={[
            'pf-voice-btn',
            variant === 'card' || isActive ? 'pf-voice-btn--primary' : 'pf-voice-btn--compact',
          ].join(' ')}
          onClick={handlePrimaryClick}
          aria-pressed={isPlaying}
          aria-label={`${exercise.nameKo} ${primaryLabel}`}
        >
          {isPlaying ? (
            <Pause size={16} aria-hidden="true" />
          ) : isPaused ? (
            <Play size={16} aria-hidden="true" />
          ) : (
            <Volume2 size={16} aria-hidden="true" />
          )}
          <span>{primaryLabel}</span>
        </button>

        {isActive && (
          <button
            type="button"
            className="pf-voice-btn pf-voice-btn--stop"
            onClick={handleStop}
            aria-label="음성 정지"
          >
            <Square size={14} aria-hidden="true" />
            <span>정지</span>
          </button>
        )}

        {showQualityBadge && (variant === 'card' || isActive) && (
          <span
            className={[
              'pf-voice-quality-badge',
              voiceState.activeTier === 'cloud-neural' ? 'pf-voice-quality-badge--studio' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {voiceState.voiceQualityLabelKo}
          </span>
        )}

        {isUnsupported && (
          <button
            type="button"
            className="pf-voice-btn pf-voice-btn--compact"
            onClick={() => setShowFallbackScript((prev) => !prev)}
            aria-expanded={showFallbackScript}
          >
            <FileText size={15} aria-hidden="true" />
            <span>{showFallbackScript ? '대본 닫기' : '대본 보기'}</span>
          </button>
        )}
      </div>

      {showProgressBar && (variant === 'card' || isActive) && (
        <div
          className="pf-voice-progress-track"
          role="progressbar"
          aria-label="강사 음성 설명 진행률"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPercent}
        >
          <div
            className="pf-voice-progress-fill"
            style={{ transform: `scaleX(${Math.max(0, Math.min(1, progressPercent / 100))})` }}
          />
        </div>
      )}

      {isActive && voiceState.currentSegment && (
        <p className="pf-voice-live-line" aria-live="polite">
          {voiceState.currentSegment.textKo}
        </p>
      )}

      {isUnsupported && showFallbackScript && (
        <div className="pf-voice-script-fallback" role="region" aria-label="강사 음성 대본">
          {script.fullTextKo}
        </div>
      )}
    </div>
  );
}
