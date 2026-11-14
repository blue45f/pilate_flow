import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { PilatesExercise } from '../types/pilates';
import {
  KOREAN_VOICE_SPEED_OPTIONS,
  type EmbedPlaybackState,
  type KoreanVoiceController,
  type KoreanVoiceControllerState,
  type KoreanVoiceNarrationSection,
  type KoreanVoicePlaybackSpeed,
  type MovementMediaMatch,
} from '../types/movementMediaGuidance';
import {
  resolveEmbedFailureFallback,
  resolveMovementMediaBundle,
} from '../utils/movementMediaMatcher';
import {
  KOREAN_VOICE_SECTION_LABELS,
  buildKoreanVoiceScript,
  createKoreanVoiceController,
  inspectMobileAndBrowserTtsSupport,
  movementMediaSessionCoordinator,
} from '../utils/koreanVoiceNarration';
import { ReferenceLinkPolicyPreview } from '../features/referenceLinkPolicyCandidate';
import '../features/referenceLinkPolicyCandidate/referenceLinkPolicy.css';
import '../styles/movement-media-guidance.css';

export interface MovementMediaGuidancePanelProps {
  exercise: PilatesExercise;
  active?: boolean;
  /** Use when the surrounding view already owns the video player. */
  voiceOnly?: boolean;
  className?: string;
}

const VOICE_SECTION_ORDER: readonly (KoreanVoiceNarrationSection | 'all')[] = [
  'all',
  'overview',
  'setup',
  'breath',
  'cues',
  'layers',
  'precautions',
];

type EmbedFailureFallbackResult = ReturnType<typeof resolveEmbedFailureFallback>;

interface ScopedSelectionState {
  exerciseId: string;
  matchId: string;
  section: KoreanVoiceNarrationSection | 'all';
}

interface ScopedEmbedState {
  exerciseId: string;
  matchId: string;
  state: EmbedPlaybackState;
  failureInfo: EmbedFailureFallbackResult | null;
}

function buildInitialVoiceControllerState(exerciseId: string): KoreanVoiceControllerState {
  const capability = inspectMobileAndBrowserTtsSupport();
  return {
    exerciseId,
    status: capability.canAttemptSpeech ? 'idle' : 'unsupported',
    speed: 1,
    activeSegmentIndex: 0,
    activeSection: 'all',
    errorMessageKo: capability.canAttemptSpeech
      ? null
      : '현재 브라우저·기기에서 음성 합성을 지원하지 않아 아래 한국어 대본 텍스트를 제공합니다.',
    announcementKo: capability.canAttemptSpeech
      ? '한국어 음성 안내 대기 중 (버튼을 눌러 재생)'
      : '음성 합성 미지원 환경 — 화면의 전체 한국어 대본을 확인하세요.',
    capability,
  };
}

export function MovementMediaGuidancePanel({
  exercise,
  active = true,
  voiceOnly = false,
  className = '',
}: MovementMediaGuidancePanelProps) {
  return (
    <MovementMediaGuidanceInner
      key={`${exercise.id}:${active ? 'active' : 'inactive'}:${voiceOnly ? 'voice' : 'media'}`}
      exercise={exercise}
      active={active}
      voiceOnly={voiceOnly}
      className={className}
    />
  );
}

function MovementMediaGuidanceInner({
  exercise,
  active = true,
  voiceOnly = false,
  className = '',
}: MovementMediaGuidancePanelProps) {
  const bundle = useMemo(() => resolveMovementMediaBundle(exercise), [exercise]);
  const voiceScript = useMemo(() => buildKoreanVoiceScript(exercise), [exercise]);

  const [scopedSelection, setScopedSelection] = useState<ScopedSelectionState>(() => ({
    exerciseId: exercise.id,
    matchId: bundle.primaryMatch.matchId,
    section: 'all',
  }));

  const [scopedEmbed, setScopedEmbed] = useState<ScopedEmbedState>(() => ({
    exerciseId: exercise.id,
    matchId: bundle.primaryMatch.matchId,
    state: 'idle',
    failureInfo: null,
  }));

  const [showScriptText, setShowScriptText] = useState(
    () => !inspectMobileAndBrowserTtsSupport().canAttemptSpeech,
  );
  const [showLinkPolicy, setShowLinkPolicy] = useState(false);
  const [voiceState, setVoiceState] = useState<KoreanVoiceControllerState>(() =>
    buildInitialVoiceControllerState(exercise.id),
  );

  const controllerRef = useRef<KoreanVoiceController | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const scriptPanelId = useId();

  const selectedMatchId =
    scopedSelection.exerciseId === exercise.id
      ? scopedSelection.matchId
      : bundle.primaryMatch.matchId;

  const selectedSection: KoreanVoiceNarrationSection | 'all' =
    scopedSelection.exerciseId === exercise.id ? scopedSelection.section : 'all';

  const activeMatch: MovementMediaMatch = useMemo(() => {
    return bundle.matches.find((item) => item.matchId === selectedMatchId) ?? bundle.primaryMatch;
  }, [bundle, selectedMatchId]);

  const embedState: EmbedPlaybackState =
    active && scopedEmbed.exerciseId === exercise.id && scopedEmbed.matchId === activeMatch.matchId
      ? scopedEmbed.state
      : 'idle';

  const failureInfo: EmbedFailureFallbackResult | null =
    active && scopedEmbed.exerciseId === exercise.id && scopedEmbed.matchId === activeMatch.matchId
      ? scopedEmbed.failureInfo
      : null;

  // Manage KoreanVoiceController and cross-movement session coordination.
  // Never auto-plays on mount, movement switch, or revisit.
  useEffect(() => {
    const controller = createKoreanVoiceController({
      script: voiceScript,
      onStateChange: (nextState) => {
        setVoiceState(nextState);
      },
    });
    controllerRef.current = controller;

    if (!active) {
      controller.stop('동작 화면이 비활성화되어 음성을 멈췄습니다.');
    }

    const unregister = movementMediaSessionCoordinator.registerActiveSession(exercise.id, {
      stopVideo: () => {
        setScopedEmbed((prev) => ({
          ...prev,
          state: 'idle',
          failureInfo: null,
        }));
      },
      stopVoice: () => {
        controller.stop('다른 동작으로 이동하여 음성을 멈췄습니다.');
      },
    });

    if (active) {
      movementMediaSessionCoordinator.notifyMovementActivated(exercise.id);
    }

    return () => {
      unregister();
      controller.stop('동작 전환 또는 화면 닫기로 음성을 멈췄습니다.');
      controller.destroy();
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    };
  }, [exercise.id, voiceScript, active]);

  // Stop video & voice when tab is backgrounded or page hides
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.hidden) {
        setScopedEmbed((prev) => ({
          ...prev,
          state: 'idle',
          failureInfo: null,
        }));
        controllerRef.current?.stop('화면이 백그라운드로 전환되어 음성을 멈췄습니다.');
      }
    };

    const handlePageHide = () => {
      setScopedEmbed((prev) => ({
        ...prev,
        state: 'idle',
        failureInfo: null,
      }));
      controllerRef.current?.stop('페이지 전환으로 음성을 멈췄습니다.');
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', handlePageHide);
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('pagehide', handlePageHide);
      }
    };
  }, []);

  const handleSelectMatch = (match: MovementMediaMatch) => {
    setScopedSelection({
      exerciseId: exercise.id,
      matchId: match.matchId,
      section: selectedSection,
    });
    setScopedEmbed({
      exerciseId: exercise.id,
      matchId: match.matchId,
      state: 'idle',
      failureInfo: null,
    });
    controllerRef.current?.stop('참고 출처를 변경하여 이전 음성을 멈췄습니다.');
  };

  const handleManualLoadVideo = () => {
    movementMediaSessionCoordinator.notifyMovementActivated(exercise.id);
    setScopedEmbed({
      exerciseId: exercise.id,
      matchId: activeMatch.matchId,
      state: 'loaded',
      failureInfo: null,
    });
  };

  const handleStopVideo = () => {
    setScopedEmbed({
      exerciseId: exercise.id,
      matchId: activeMatch.matchId,
      state: 'idle',
      failureInfo: null,
    });
  };

  const handleReportEmbedBlocked = () => {
    const fallback = resolveEmbedFailureFallback(activeMatch, 'embed-blocked');
    setScopedEmbed({
      exerciseId: exercise.id,
      matchId: activeMatch.matchId,
      state: 'embed-blocked',
      failureInfo: fallback,
    });
  };

  const handleIframeError = () => {
    const fallback = resolveEmbedFailureFallback(activeMatch, 'playback-failed');
    setScopedEmbed({
      exerciseId: exercise.id,
      matchId: activeMatch.matchId,
      state: 'playback-failed',
      failureInfo: fallback,
    });
  };

  useEffect(() => {
    const node = iframeRef.current;
    if (!node || embedState !== 'loaded') return undefined;
    const onNativeIframeError = () => {
      const fallback = resolveEmbedFailureFallback(activeMatch, 'playback-failed');
      setScopedEmbed({
        exerciseId: exercise.id,
        matchId: activeMatch.matchId,
        state: 'playback-failed',
        failureInfo: fallback,
      });
    };
    node.addEventListener('error', onNativeIframeError);
    return () => {
      node.removeEventListener('error', onNativeIframeError);
    };
  }, [embedState, activeMatch, exercise.id]);

  const handleResetEmbedState = () => {
    setScopedEmbed({
      exerciseId: exercise.id,
      matchId: activeMatch.matchId,
      state: 'idle',
      failureInfo: null,
    });
  };

  const handleSelectSection = (section: KoreanVoiceNarrationSection | 'all') => {
    setScopedSelection({
      exerciseId: exercise.id,
      matchId: activeMatch.matchId,
      section,
    });
  };

  const handleSpeedChange = (nextSpeedRaw: string) => {
    const parsed = Number(nextSpeedRaw) as KoreanVoicePlaybackSpeed;
    if ((KOREAN_VOICE_SPEED_OPTIONS as readonly number[]).includes(parsed)) {
      controllerRef.current?.setSpeed(parsed);
    }
  };

  const visibleSegments = useMemo(() => {
    if (selectedSection === 'all') {
      return voiceScript.segments;
    }
    return voiceScript.segments.filter((segment) => segment.section === selectedSection);
  }, [voiceScript.segments, selectedSection]);

  const canLoadEmbed =
    !voiceOnly &&
    activeMatch.embedResolution.allowed &&
    Boolean(activeMatch.embedResolution.embedUrl);

  const fallbackNoticeText = failureInfo?.noticeKo ?? activeMatch.embedResolution.reasonKo;

  const rootClassName = `movement-media-guidance-panel ${className}`.trim();

  return (
    <section
      className={rootClassName}
      aria-label={`${exercise.nameKo} ${voiceOnly ? '한국어 음성 안내' : '참고 영상·자료 및 한국어 음성 안내'}`}
      data-testid="movement-media-guidance-panel"
      data-exercise-id={exercise.id}
    >
      {/* Part 1: 동작별 참고 영상·신뢰 출처 자료 */}
      {!voiceOnly && (
        <div className="mmg-section">
          <div className="mmg-section-header">
            <div className="mmg-section-title-group">
              <h3 className="mmg-section-title">참고 영상·자료</h3>
            </div>
          </div>

          <div className="mmg-match-tabs" role="group" aria-label="매칭된 공개 참고 출처 선택">
            {bundle.matches.map((match, index) => {
              const isSelected = match.matchId === activeMatch.matchId;
              return (
                <button
                  key={match.matchId}
                  type="button"
                  className="mmg-match-tab"
                  data-testid={`media-match-tab-${index}`}
                  aria-pressed={isSelected}
                  onClick={() => handleSelectMatch(match)}
                >
                  <div className="mmg-match-tab__top">
                    <span
                      className={`mmg-badge ${
                        match.embedResolution.allowed ? 'mmg-badge--allowed' : 'mmg-badge--external'
                      }`}
                    >
                      {match.embedResolution.allowed ? '여기서 보기' : '원본에서 보기'}
                    </span>
                  </div>
                  <span className="mmg-match-tab__title">{match.source.titleKo}</span>
                  <span className="mmg-match-tab__publisher">
                    {match.source.publisher} · {match.source.languageLabelKo}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mmg-match-card" data-testid="selected-media-match-card">
            <div className="mmg-match-card__header">
              <div>
                <h4 className="mmg-match-card__title">{activeMatch.source.titleKo}</h4>
                <p className="mmg-match-card__subtitle">
                  {activeMatch.source.publisher} ({activeMatch.source.languageLabelKo})
                </p>
              </div>
              <div className="mmg-badge-row">
                <span className="mmg-badge">
                  {activeMatch.isExactDemonstration ? '원출처 시연 자료' : '참고 시연·도해 자료'}
                </span>
              </div>
            </div>

            <p className="mmg-voice-disclaimer">{activeMatch.source.safetyDisclaimerKo}</p>
            <details className="mmg-full-script-details">
              <summary>자료 정보</summary>
              <ul className="mmg-match-meta-list">
                <li className="mmg-match-meta-item">
                  <strong>연결 이유</strong>
                  <span>{activeMatch.matchReasonKo}</span>
                </li>
                <li className="mmg-match-meta-item">
                  <strong>확인 기록</strong>
                  <span>{activeMatch.source.verificationStatusLabelKo}</span>
                </li>
                <li className="mmg-match-meta-item">
                  <strong>이용 안내</strong>
                  <span>{activeMatch.source.rightsNoteKo}</span>
                </li>
              </ul>
            </details>

            {activeMatch.source.observationPoints.length > 0 && (
              <ul className="mmg-observation-list" aria-label="출처 관찰 포인트">
                {activeMatch.source.observationPoints.map((pt, idx) => (
                  <li key={`${activeMatch.matchId}-obs-${idx}`} className="mmg-observation-chip">
                    {pt.seconds}초 · {pt.note}
                  </li>
                ))}
              </ul>
            )}

            <div
              className="mmg-embed-box"
              data-testid="media-embed-box"
              data-embed-state={embedState}
              data-embed-allowed={String(activeMatch.embedResolution.allowed)}
            >
              {canLoadEmbed && embedState === 'idle' && (
                <div className="mmg-embed-idle">
                  <p className="mmg-embed-idle__text">버튼을 누르면 YouTube 영상을 불러옵니다.</p>
                  <button
                    type="button"
                    className="mmg-btn mmg-btn-primary"
                    data-testid="manual-load-video-btn"
                    onClick={handleManualLoadVideo}
                  >
                    영상 보기
                  </button>
                </div>
              )}

              {canLoadEmbed && embedState === 'loaded' && (
                <>
                  <div className="mmg-embed-player-frame">
                    <iframe
                      ref={iframeRef}
                      className="mmg-embed-iframe"
                      data-testid="permitted-youtube-iframe"
                      src={activeMatch.embedResolution.embedUrl!}
                      title={`${exercise.nameKo} · ${activeMatch.source.titleKo} 수동 임베드 플레이어`}
                      allow="encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                      onError={handleIframeError}
                    />
                  </div>
                  <div className="mmg-embed-controls">
                    <button
                      type="button"
                      className="mmg-btn mmg-btn-secondary"
                      data-testid="stop-video-btn"
                      onClick={handleStopVideo}
                    >
                      영상 멈추기
                    </button>
                    <button
                      type="button"
                      className="mmg-btn mmg-btn-ghost"
                      data-testid="report-embed-failure-btn"
                      onClick={handleReportEmbedBlocked}
                    >
                      영상이 안 나오나요?
                    </button>
                  </div>
                </>
              )}

              {(!canLoadEmbed ||
                embedState === 'embed-blocked' ||
                embedState === 'playback-failed') && (
                <div
                  className="mmg-embed-fallback"
                  data-testid="embed-fallback-notice"
                  role="status"
                  aria-live="polite"
                >
                  <p>{fallbackNoticeText}</p>
                  {canLoadEmbed &&
                    (embedState === 'embed-blocked' || embedState === 'playback-failed') && (
                      <button
                        type="button"
                        className="mmg-btn mmg-btn-secondary mmg-btn-sm"
                        data-testid="reset-embed-state-btn"
                        onClick={handleResetEmbedState}
                      >
                        다시 시도
                      </button>
                    )}
                </div>
              )}
            </div>

            <div className="mmg-external-link-bar">
              <a
                href={activeMatch.embedResolution.externalOriginalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mmg-external-link"
                data-testid="external-original-source-link"
              >
                원본 보기 ({activeMatch.source.publisher})
              </a>
            </div>

            <details
              className="mmg-link-policy-disclosure"
              onToggle={(event) => setShowLinkPolicy(event.currentTarget.open)}
            >
              <summary className="mmg-link-policy-summary">
                외부 참고 링크 보안·자동재생 차단 정책 점검
              </summary>
              {showLinkPolicy && (
                <ReferenceLinkPolicyPreview exercise={exercise} iframeMode="production-nocookie" />
              )}
            </details>
          </div>
        </div>
      )}

      {/* Part 2: 한국어 음성 설명 & 텍스트 대본 */}
      <div className="mmg-section">
        <div className="mmg-section-header">
          <div className="mmg-section-title-group">
            <h3 className="mmg-section-title">음성 안내</h3>
            <p className="mmg-section-subtitle">약 {voiceScript.estimatedDurationSec}초</p>
          </div>
        </div>

        {!voiceState.capability.canAttemptSpeech && (
          <p className="mmg-tts-capability-box" data-testid="mobile-tts-capability-badge">
            이 기기에서 한국어 음성을 사용할 수 없어요. 아래 대본을 확인해 주세요.
          </p>
        )}

        <div className="mmg-voice-toolbar" role="group" aria-label="한국어 음성 설명 제어">
          <div className="mmg-voice-toolbar__buttons">
            <button
              type="button"
              className="mmg-btn mmg-btn-primary"
              data-testid="voice-play-btn"
              onClick={() => {
                if (voiceState.status === 'paused') {
                  controllerRef.current?.resume();
                } else {
                  controllerRef.current?.play(selectedSection);
                }
              }}
            >
              {voiceState.status === 'paused' ? '음성 이어 듣기' : '음성 듣기'}
            </button>

            <button
              type="button"
              className="mmg-btn mmg-btn-secondary"
              data-testid="voice-pause-btn"
              disabled={voiceState.status !== 'playing'}
              onClick={() => controllerRef.current?.pause()}
            >
              음성 일시정지
            </button>

            <button
              type="button"
              className="mmg-btn mmg-btn-secondary"
              data-testid="voice-stop-btn"
              disabled={voiceState.status === 'idle' || voiceState.status === 'unsupported'}
              onClick={() => controllerRef.current?.stop('사용자가 음성 설명을 멈췄습니다.')}
            >
              음성 정지
            </button>

            <button
              type="button"
              className="mmg-btn mmg-btn-ghost"
              data-testid="toggle-voice-script-btn"
              aria-expanded={showScriptText}
              aria-controls={showScriptText ? scriptPanelId : undefined}
              onClick={() => setShowScriptText((prev) => !prev)}
            >
              {showScriptText ? '대본 접기' : '대본 보기'}
            </button>
          </div>

          <label className="mmg-voice-speed-group">
            <span>낭독 속도</span>
            <select
              className="mmg-speed-select"
              data-testid="voice-speed-select"
              aria-label="낭독 속도 · 한국어 음성 설명"
              value={voiceState.speed}
              onChange={(event) => handleSpeedChange(event.target.value)}
            >
              {KOREAN_VOICE_SPEED_OPTIONS.map((speedOption) => (
                <option key={speedOption} value={speedOption}>
                  {speedOption}×
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mmg-section-chips" role="group" aria-label="음성 설명 구간 선택">
          {VOICE_SECTION_ORDER.map((sectionKey) => {
            const isSelected = selectedSection === sectionKey;
            return (
              <button
                key={sectionKey}
                type="button"
                className="mmg-chip"
                data-testid={`voice-section-chip-${sectionKey}`}
                aria-pressed={isSelected}
                onClick={() => handleSelectSection(sectionKey)}
              >
                {KOREAN_VOICE_SECTION_LABELS[sectionKey]}
              </button>
            );
          })}
        </div>

        <p
          role="status"
          aria-live="polite"
          className="mmg-voice-status"
          data-testid="voice-status-announcement"
        >
          {voiceState.status === 'idle' || voiceState.status === 'unsupported'
            ? ''
            : voiceState.announcementKo}
        </p>

        {showScriptText && (
          <div id={scriptPanelId} className="mmg-script-panel" data-testid="voice-script-text">
            <ol className="mmg-segment-list">
              {visibleSegments.map((segment) => {
                const isActiveSegment =
                  voiceState.status === 'playing' &&
                  voiceState.activeSegmentIndex === segment.index;
                return (
                  <li
                    key={segment.id}
                    className="mmg-segment-item"
                    data-testid={`voice-segment-item-${segment.index}`}
                    data-active-segment={String(isActiveSegment)}
                  >
                    <div className="mmg-segment-item__header">
                      <span className="mmg-badge">
                        {segment.index + 1}. {segment.labelKo}
                      </span>
                      <button
                        type="button"
                        className="mmg-btn mmg-btn-secondary mmg-btn-sm"
                        data-testid={`speak-segment-btn-${segment.index}`}
                        aria-label={`${segment.index + 1}. ${segment.labelKo} 구간 듣기`}
                        onClick={() => controllerRef.current?.speakSegment(segment.index)}
                      >
                        이 구간 듣기
                      </button>
                    </div>
                    <p className="mmg-segment-item__text">{segment.textKo}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
        <p className="mmg-voice-disclaimer">{voiceScript.disclaimerKo}</p>
      </div>
    </section>
  );
}
