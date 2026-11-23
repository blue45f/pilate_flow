import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Clock3,
  Headphones,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Square,
  Volume2,
} from 'lucide-react';
import { WORLD_PILATES_BY_ID } from '../data/worldPilatesRepertoire1000';
import { usePilatesStore } from '../store/usePilatesStore';
import type { PilatesExercise } from '../types/pilates';
import {
  buildDailyCommuteBriefingPlaylist,
  resolveDailyBriefingCandidates,
  type DailyBriefingMode,
} from '../utils/dailyCommuteBriefingEngine';
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
import '../styles/daily-commute-briefing.css';

export interface DailyCommuteBriefingPanelProps {
  readonly todayDate?: string;
  readonly engineOptions?: NaturalVoiceControllerEnv;
}

function formatDurationKo(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  if (m === 0) return `약 ${s}초`;
  if (s === 0) return `약 ${m}분`;
  return `약 ${m}분 ${s}초`;
}

export const DailyCommuteBriefingPanel: React.FC<DailyCommuteBriefingPanelProps> = ({
  todayDate,
  engineOptions,
}) => {
  const {
    instructorSchedule,
    savedSequences,
    activeTitle,
    activeApparatus,
    activeTargetMinutes,
    activeSteps,
    exercises,
  } = usePilatesStore();

  const [mode, setMode] = useState<DailyBriefingMode>('quick-1min');
  const [speed, setSpeed] = useState<NaturalVoiceSpeed>(1);
  const [persona, setPersona] = useState<StudioVoicePersonaId>(() =>
    getPreferredStudioVoicePersona(),
  );
  const [deselectedIds, setDeselectedIds] = useState<ReadonlySet<string>>(() => new Set());

  const exercisesById = useMemo(() => {
    const map = new Map<string, PilatesExercise>();
    for (const ex of WORLD_PILATES_BY_ID.values()) {
      map.set(ex.id, ex);
    }
    for (const ex of exercises) {
      map.set(ex.id, ex);
    }
    return map;
  }, [exercises]);

  const resolved = useMemo(
    () =>
      resolveDailyBriefingCandidates({
        instructorSchedule,
        savedSequences,
        activeDraft: {
          title: activeTitle,
          apparatus: activeApparatus,
          targetMinutes: activeTargetMinutes,
          steps: activeSteps,
        },
        exercisesById,
        todayDate,
      }),
    [
      instructorSchedule,
      savedSequences,
      activeTitle,
      activeApparatus,
      activeTargetMinutes,
      activeSteps,
      exercisesById,
      todayDate,
    ],
  );

  const selectedClasses = useMemo(
    () => resolved.candidates.filter((item) => !deselectedIds.has(item.id)),
    [resolved.candidates, deselectedIds],
  );

  const playlist = useMemo(
    () =>
      buildDailyCommuteBriefingPlaylist({
        dateLabelKo: resolved.dateLabelKo,
        sourceKind: resolved.sourceKind,
        sourceBadgeKo: resolved.sourceBadgeKo,
        selectedClasses,
        exercisesById,
        mode,
      }),
    [resolved, selectedClasses, exercisesById, mode],
  );

  const controllerKey = `${mode}:${selectedClasses.map((c) => c.id).join(',')}:${playlist.segments.length}`;

  const initialVoiceState = useMemo(
    () =>
      inspectInitialNaturalVoiceState({
        sessionId: 'daily-commute-briefing',
        titleKo: `${resolved.dateLabelKo} 출근길 수업 브리핑`,
        segments: playlist.segments,
        initialSpeed: speed,
        studioPersona: persona,
        preferCloud: true,
        breathChimesEnabled: true,
        env: engineOptions,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [controllerKey, persona, engineOptions],
  );

  const controllerRef = useRef<NaturalVoiceController | null>(null);
  const [liveState, setLiveState] = useState<{
    readonly key: string;
    readonly state: NaturalVoiceControllerState;
  } | null>(null);

  const voiceState =
    liveState && liveState.key === controllerKey ? liveState.state : initialVoiceState;

  useEffect(() => {
    const controller = createNaturalVoiceController({
      sessionId: 'daily-commute-briefing',
      titleKo: `${resolved.dateLabelKo} 출근길 수업 브리핑`,
      segments: playlist.segments,
      initialSpeed: speed,
      studioPersona: getPreferredStudioVoicePersona(),
      preferCloud: true,
      breathChimesEnabled: true,
      env: engineOptions,
      onStateChange: (nextState) => {
        setLiveState({ key: controllerKey, state: nextState });
      },
    });
    controllerRef.current = controller;

    return () => {
      controller.destroy();
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controllerKey, engineOptions]);

  useEffect(() => {
    return subscribeStudioVoicePersona((nextPersona) => {
      setPersona(nextPersona);
      controllerRef.current?.setStudioPersona(nextPersona);
    });
  }, []);

  const isPlaying = voiceState.status === 'playing' || voiceState.status === 'loading';
  const isPaused = voiceState.status === 'paused';
  const progressPercent = Math.round(
    (voiceState.status === 'completed' ? 1 : voiceState.progressRatio) * 100,
  );

  const handleTogglePlay = () => {
    const ctrl = controllerRef.current;
    if (!ctrl || playlist.segments.length === 0) return;
    if (isPlaying) {
      ctrl.pause();
    } else if (isPaused) {
      ctrl.resume();
    } else {
      ctrl.play(0);
    }
  };

  const handleToggleClass = (id: string) => {
    controllerRef.current?.stop();
    setDeselectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectPersona = (nextPersona: StudioVoicePersonaId) => {
    setPreferredStudioVoicePersona(nextPersona);
  };

  const handleSelectSpeed = (nextSpeed: NaturalVoiceSpeed) => {
    setSpeed(nextSpeed);
    controllerRef.current?.setSpeed(nextSpeed);
  };

  return (
    <section
      className="pf-briefing-panel"
      data-testid="daily-commute-briefing-panel"
      aria-label="출근길 당일 수업 연속 오디오 브리핑"
    >
      <header className="pf-briefing-header">
        <div className="pf-briefing-title-wrap">
          <span className="pf-briefing-source-badge">
            <Headphones size={15} strokeWidth={1.6} aria-hidden="true" />
            <span>
              {resolved.dateLabelKo} · {resolved.sourceBadgeKo}
            </span>
          </span>
          <p className="pf-briefing-subcopy">
            이어폰을 꽂고 오늘 수업 1~5개의 기구·스프링·핵심 동작 흐름을 연속으로 들어보세요.
          </p>
        </div>

        <div className="pf-briefing-controls-grid">
          <div className="pf-briefing-segment-group" role="group" aria-label="브리핑 길이 선택">
            <button
              type="button"
              className={`pf-briefing-seg-btn ${mode === 'quick-1min' ? 'is-active' : ''}`}
              aria-pressed={mode === 'quick-1min'}
              onClick={() => {
                controllerRef.current?.stop();
                setMode('quick-1min');
              }}
            >
              1분 핵심 브리핑
            </button>
            <button
              type="button"
              className={`pf-briefing-seg-btn ${mode === 'full-continuous' ? 'is-active' : ''}`}
              aria-pressed={mode === 'full-continuous'}
              onClick={() => {
                controllerRef.current?.stop();
                setMode('full-continuous');
              }}
            >
              전체 동작 연속 듣기
            </button>
          </div>

          <div className="pf-briefing-segment-group" role="group" aria-label="AI 강사 목소리 선택">
            {(['seoyeon', 'hyunsu'] as const).map((pid) => (
              <button
                key={pid}
                type="button"
                data-testid={`briefing-persona-${pid}`}
                className={`pf-briefing-seg-btn ${persona === pid ? 'is-active' : ''}`}
                aria-pressed={persona === pid}
                onClick={() => handleSelectPersona(pid)}
              >
                <Volume2 size={14} strokeWidth={1.6} aria-hidden="true" />
                <span>
                  {STUDIO_VOICE_PERSONAS[pid].nameKo} ({pid === 'seoyeon' ? '여성' : '남성'})
                </span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="pf-briefing-player-card">
        <div className="pf-briefing-player-top">
          <span className="pf-briefing-voice-pill">{voiceState.voiceQualityLabelKo}</span>
          <span className="pf-briefing-duration">
            <Clock3 size={14} strokeWidth={1.6} aria-hidden="true" />
            <span>
              {selectedClasses.length}개 수업 · {formatDurationKo(playlist.estimatedTotalSec)}
            </span>
          </span>
        </div>

        <p className="pf-briefing-now-playing" aria-live="polite">
          {voiceState.currentSegment
            ? voiceState.currentSegment.labelKo
            : '재생할 수업을 아래에서 선택해 주세요.'}
        </p>

        {voiceState.currentSegment && (
          <p className="pf-briefing-live-text">{voiceState.currentSegment.textKo}</p>
        )}

        <div
          className="pf-briefing-progress-track"
          role="progressbar"
          aria-label="출근길 브리핑 진행률"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPercent}
        >
          <div
            className="pf-briefing-progress-fill"
            style={{ transform: `scaleX(${Math.max(0, Math.min(1, progressPercent / 100))})` }}
          />
        </div>

        <div className="pf-briefing-transport" role="group" aria-label="브리핑 재생 제어">
          <button
            type="button"
            className="pf-briefing-icon-btn"
            aria-label="이전 구간"
            disabled={voiceState.activeSegmentIndex <= 0 || playlist.segments.length === 0}
            onClick={() => controllerRef.current?.previous()}
          >
            <SkipBack size={18} aria-hidden="true" />
          </button>

          <button
            type="button"
            className="pf-briefing-play-btn"
            data-testid="briefing-primary-play-btn"
            disabled={playlist.segments.length === 0}
            aria-pressed={isPlaying}
            onClick={handleTogglePlay}
          >
            {isPlaying ? (
              <Pause size={18} aria-hidden="true" />
            ) : (
              <Play size={18} aria-hidden="true" />
            )}
            <span>
              {voiceState.status === 'loading'
                ? 'AI 음성 준비 중…'
                : isPlaying
                  ? '일시정지'
                  : isPaused
                    ? '이어듣기'
                    : '연속 브리핑 시작'}
            </span>
          </button>

          <button
            type="button"
            className="pf-briefing-icon-btn"
            aria-label="다음 구간"
            disabled={voiceState.activeSegmentIndex >= playlist.segments.length - 1}
            onClick={() => controllerRef.current?.next()}
          >
            <SkipForward size={18} aria-hidden="true" />
          </button>

          <button
            type="button"
            className="pf-briefing-icon-btn"
            aria-label="정지"
            disabled={!isPlaying && !isPaused}
            onClick={() => controllerRef.current?.stop()}
          >
            <Square size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="pf-briefing-speed-row" role="group" aria-label="브리핑 재생 속도">
          {NATURAL_VOICE_SPEED_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              className={`pf-briefing-speed-btn ${speed === opt ? 'is-active' : ''}`}
              aria-pressed={speed === opt}
              onClick={() => handleSelectSpeed(opt)}
            >
              {opt.toFixed(1)}×
            </button>
          ))}
        </div>
      </div>

      <div className="pf-briefing-queue">
        <div className="pf-briefing-queue-head">
          <h3>브리핑 포함 수업 ({selectedClasses.length}/{resolved.candidates.length})</h3>
          <span>탭해서 포함 여부를 바꿀 수 있어요</span>
        </div>

        {resolved.candidates.length === 0 ? (
          <p className="pf-briefing-empty">
            아직 등록된 오늘 일정이나 저장 수업이 없어요. 수업 만들기에서 동작을 담거나 일정을 추가해
            주세요.
          </p>
        ) : (
          <ul className="pf-briefing-list">
            {resolved.candidates.map((cls, idx) => {
              const included = !deselectedIds.has(cls.id);
              const jumpIdx = playlist.classStartSegmentIndex.get(cls.id);
              return (
                <li
                  key={cls.id}
                  className={`pf-briefing-class-row ${included ? 'is-included' : 'is-excluded'}`}
                >
                  <button
                    type="button"
                    className="pf-briefing-check-btn"
                    aria-pressed={included}
                    aria-label={`${cls.titleKo} 브리핑 ${included ? '제외' : '포함'}`}
                    onClick={() => handleToggleClass(cls.id)}
                  >
                    {included ? <Check size={16} strokeWidth={2} aria-hidden="true" /> : idx + 1}
                  </button>

                  <div className="pf-briefing-class-body">
                    <div className="pf-briefing-class-meta">
                      <span>{cls.timeLabelKo}</span>
                      <span>{cls.apparatusLabelKo}</span>
                      <span>{cls.stepCount}동작</span>
                    </div>
                    <strong>{cls.titleKo}</strong>
                    <p>
                      시작 스프링: {cls.startingSpringKo}
                      {cls.anchorExerciseNamesKo.length > 0
                        ? ` · 핵심: ${cls.anchorExerciseNamesKo.join(' → ')}`
                        : ''}
                    </p>
                  </div>

                  {included && jumpIdx !== undefined && (
                    <button
                      type="button"
                      className="pf-briefing-jump-btn"
                      onClick={() => controllerRef.current?.jumpTo(jumpIdx)}
                    >
                      여기부터
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};
