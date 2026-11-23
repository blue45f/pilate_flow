import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  History,
  Mic,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Square,
  Volume2,
} from 'lucide-react';
import {
  analyzeTeachingTranscript,
  compareWithPreviousCoachEntry,
  isBrowserSpeechRecognitionSupported,
  loadTeachingCoachHistory,
  SAMPLE_TEACHING_SCRIPTS,
  saveTeachingCoachEntry,
} from '../utils/teachingVoiceCoachEngine';
import type {
  TeachingCoachHistoryEntry,
  TeachingCoachSourceMode,
  TeachingSampleScript,
} from '../utils/teachingVoiceCoachEngine';
import '../styles/teaching-voice-coach.css';

export interface TeachingVoiceCoachPanelProps {
  sequenceTitle?: string;
  currentExerciseNameKo?: string;
}

interface SpeechRecognitionAlternativeLike {
  readonly transcript: string;
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternativeLike | undefined;
}

interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: {
    readonly length: number;
    [index: number]: SpeechRecognitionResultLike | undefined;
  };
}

interface SpeechRecognitionErrorEventLike {
  readonly error?: string;
}

interface BrowserSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type SpeechCapableWindow = Window & {
  SpeechRecognition?: BrowserSpeechRecognitionConstructor;
  webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  webkitAudioContext?: typeof AudioContext;
};

const METER_BAR_COUNT = 12;
const IDLE_METER_LEVELS: readonly number[] = Array.from({ length: METER_BAR_COUNT }, () => 14);
const STANDARD_DURATION_OPTIONS: readonly number[] = [30, 45, 60, 90, 120, 180, 300];

function getSpeechRecognitionConstructor(): BrowserSpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const speechWindow = window as SpeechCapableWindow;
  if (typeof speechWindow.SpeechRecognition === 'function') {
    return speechWindow.SpeechRecognition;
  }
  if (typeof speechWindow.webkitSpeechRecognition === 'function') {
    return speechWindow.webkitSpeechRecognition;
  }
  return null;
}

function getAudioContextConstructor(): typeof AudioContext | null {
  if (typeof window === 'undefined') return null;
  const audioWindow = window as SpeechCapableWindow;
  if (typeof window.AudioContext === 'function') {
    return window.AudioContext;
  }
  if (typeof audioWindow.webkitAudioContext === 'function') {
    return audioWindow.webkitAudioContext;
  }
  return null;
}

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatSavedDateKo(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  const month = parsed.getMonth() + 1;
  const day = parsed.getDate();
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

function formatSignedNumber(value: number, unit: string): string {
  if (value > 0) return `+${value}${unit}`;
  if (value < 0) return `${value}${unit}`;
  return `0${unit}`;
}

function resolveSpeechErrorNoticeKo(errorCode: string | undefined): string {
  switch (errorCode) {
    case 'not-allowed':
    case 'service-not-allowed':
      return '마이크 권한이 거부되었습니다. 브라우저 주소창에서 마이크 접근을 허용하거나 아래 텍스트 리허설·샘플 체험으로 바로 점검해 보세요.';
    case 'audio-capture':
      return '연결된 마이크를 찾지 못했습니다. 기기 마이크 설정을 확인하거나 아래 텍스트 리허설을 이용해 보세요.';
    case 'no-speech':
      return '아직 음성이 감지되지 않았습니다. 평소 수업 톤으로 한 문장씩 천천히 말씀해 보세요.';
    case 'network':
      return '브라우저 음성 인식 엔진 연결이 잠시 흔들렸습니다. 다시 시작하거나 텍스트 리허설로 이어서 분석할 수 있어요.';
    default:
      return '실시간 음성 인식이 중단되었습니다. 다시 시작하거나 아래 텍스트 입력으로 계속 리허설을 점검해 보세요.';
  }
}

export const TeachingVoiceCoachPanel: React.FC<TeachingVoiceCoachPanelProps> = ({
  sequenceTitle,
  currentExerciseNameKo,
}) => {
  const textareaId = useId();
  const durationSelectId = useId();

  const speechSupported = useMemo(() => isBrowserSpeechRecognitionSupported(), []);

  // 마운트 시 로컬스토리지 읽기만 수행하며 localStorage.setItem은 절대 자동 호출하지 않는다.
  const [savedHistory, setSavedHistory] = useState<TeachingCoachHistoryEntry[]>(() =>
    loadTeachingCoachHistory(),
  );

  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [durationSec, setDurationSec] = useState<number>(60);
  const [pauseCount, setPauseCount] = useState<number>(0);
  const [sourceMode, setSourceMode] = useState<TeachingCoachSourceMode>('text-rehearsal');
  const [activeSampleId, setActiveSampleId] = useState<TeachingSampleScript['id'] | null>(null);

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [meterLevels, setMeterLevels] = useState<readonly number[]>(IDLE_METER_LEVELS);
  const [meterActive, setMeterActive] = useState<boolean>(false);
  const [micNotice, setMicNotice] = useState<{
    tone: 'info' | 'warning' | 'success';
    messageKo: string;
  } | null>(null);
  const [saveNotice, setSaveNotice] = useState<{
    tone: 'success' | 'warning';
    messageKo: string;
  } | null>(null);

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const lastResultAtRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const meterRafRef = useRef<number | null>(null);
  const interimRef = useRef<string>('');
  const isManualStopRef = useRef<boolean>(false);

  const cleanupAudioMeter = useCallback(() => {
    if (meterRafRef.current !== null) {
      window.cancelAnimationFrame(meterRafRef.current);
      meterRafRef.current = null;
    }
    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) {
        track.stop();
      }
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      const ctx = audioContextRef.current;
      audioContextRef.current = null;
      void ctx.close().catch(() => undefined);
    }
    setMeterActive(false);
    setMeterLevels(IDLE_METER_LEVELS);
  }, []);

  const cleanupTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopLiveSession = useCallback(
    (abortRecognition = false) => {
      isManualStopRef.current = true;
      const elapsedNow =
        startedAtRef.current !== null
          ? Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
          : elapsedSec;

      const pendingInterim = interimRef.current.trim();
      if (pendingInterim) {
        setTranscript((prev) =>
          prev.trim() ? `${prev.trim()} ${pendingInterim}` : pendingInterim,
        );
        interimRef.current = '';
        setInterimTranscript('');
      }

      if (recognitionRef.current) {
        const rec = recognitionRef.current;
        recognitionRef.current = null;
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        try {
          if (abortRecognition && typeof rec.abort === 'function') {
            rec.abort();
          } else {
            rec.stop();
          }
        } catch {
          // 이미 종료된 인식 인스턴스는 조용히 정리한다.
        }
      }

      cleanupTimer();
      cleanupAudioMeter();
      startedAtRef.current = null;
      lastResultAtRef.current = null;
      setIsRecording(false);

      if (elapsedNow > 0) {
        setDurationSec(elapsedNow);
        setElapsedSec(elapsedNow);
      }
    },
    [cleanupAudioMeter, cleanupTimer, elapsedSec],
  );

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        const rec = recognitionRef.current;
        recognitionRef.current = null;
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        try {
          if (typeof rec.abort === 'function') rec.abort();
          else rec.stop();
        } catch {
          // 언마운트 정리 중 오류 무시
        }
      }
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (meterRafRef.current !== null) {
        window.cancelAnimationFrame(meterRafRef.current);
        meterRafRef.current = null;
      }
      if (mediaStreamRef.current) {
        for (const track of mediaStreamRef.current.getTracks()) {
          track.stop();
        }
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current) {
        void audioContextRef.current.close().catch(() => undefined);
        audioContextRef.current = null;
      }
    };
  }, []);

  const startAudioMeter = useCallback(async () => {
    const AudioContextCtor = getAudioContextConstructor();
    if (
      !AudioContextCtor ||
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // 비동기 권한 응답 전에 사용자가 이미 중지했다면 즉시 트랙을 해제한다.
      if (!recognitionRef.current) {
        for (const track of stream.getTracks()) {
          track.stop();
        }
        return;
      }

      const audioContext = new AudioContextCtor();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      source.connect(analyser);

      mediaStreamRef.current = stream;
      audioContextRef.current = audioContext;
      setMeterActive(true);

      const freqData = new Uint8Array(analyser.frequencyBinCount);
      const bucketSize = Math.max(1, Math.floor(freqData.length / METER_BAR_COUNT));

      const sampleFrame = () => {
        if (!audioContextRef.current) return;
        analyser.getByteFrequencyData(freqData);
        const nextBars: number[] = [];
        for (let i = 0; i < METER_BAR_COUNT; i += 1) {
          let sum = 0;
          const start = i * bucketSize;
          for (let j = 0; j < bucketSize && start + j < freqData.length; j += 1) {
            sum += freqData[start + j];
          }
          const avg = sum / bucketSize;
          const normalized = Math.min(100, Math.max(14, Math.round((avg / 190) * 100)));
          nextBars.push(normalized);
        }
        setMeterLevels(nextBars);
        meterRafRef.current = window.requestAnimationFrame(sampleFrame);
      };

      meterRafRef.current = window.requestAnimationFrame(sampleFrame);
    } catch {
      // AudioContext/음량계 권한이 거절되어도 음성 인식 텍스트 분석은 계속 동작한다.
      setMeterActive(false);
    }
  }, []);

  const handleStartLiveMic = useCallback(() => {
    setSaveNotice(null);

    const SpeechCtor = getSpeechRecognitionConstructor();
    if (!SpeechCtor) {
      setMicNotice({
        tone: 'warning',
        messageKo:
          '현재 브라우저에서는 실시간 음성 인식을 지원하지 않습니다. Chrome·Edge·Safari 최신 버전에서 마이크를 사용하거나, 아래 텍스트 리허설과 3종 샘플 체험을 바로 이용해 보세요.',
      });
      return;
    }

    try {
      const recognition = new SpeechCtor();
      recognition.lang = 'ko-KR';
      recognition.continuous = true;
      recognition.interimResults = true;

      isManualStopRef.current = false;
      recognitionRef.current = recognition;
      startedAtRef.current = Date.now();
      lastResultAtRef.current = Date.now();
      interimRef.current = '';

      setActiveSampleId(null);
      setSourceMode('live-mic');
      setTranscript('');
      setInterimTranscript('');
      setPauseCount(0);
      setElapsedSec(0);
      setIsRecording(true);
      setMicNotice({
        tone: 'info',
        messageKo:
          '기기 안에서 실시간으로 한국어 티칭 큐를 듣고 있어요. 평소 수업 톤으로 말씀하신 뒤 중지를 눌러 리포트를 확인하세요.',
      });

      recognition.onresult = (event) => {
        const now = Date.now();
        if (lastResultAtRef.current !== null && now - lastResultAtRef.current >= 1800) {
          setPauseCount((prev) => prev + 1);
        }
        lastResultAtRef.current = now;

        const finalizedChunks: string[] = [];
        const interimChunks: string[] = [];

        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          if (!result) continue;
          const text = result[0]?.transcript?.trim();
          if (!text) continue;
          if (result.isFinal) {
            finalizedChunks.push(text);
          } else {
            interimChunks.push(text);
          }
        }

        if (finalizedChunks.length > 0) {
          const appended = finalizedChunks.join(' ');
          setTranscript((prev) => (prev.trim() ? `${prev.trim()} ${appended}` : appended));
        }

        const nextInterim = interimChunks.join(' ');
        interimRef.current = nextInterim;
        setInterimTranscript(nextInterim);
      };

      recognition.onerror = (event) => {
        const code = event?.error;
        if (code === 'no-speech') {
          setMicNotice({
            tone: 'info',
            messageKo: resolveSpeechErrorNoticeKo(code),
          });
          return;
        }
        setMicNotice({
          tone: 'warning',
          messageKo: resolveSpeechErrorNoticeKo(code),
        });
        stopLiveSession(true);
      };

      recognition.onend = () => {
        if (!isManualStopRef.current) {
          stopLiveSession(false);
          setMicNotice({
            tone: 'success',
            messageKo:
              '실시간 마이크 분석을 마쳤습니다. 아래 리포트를 확인하고 원하시면 이 기기에 저장해 두세요.',
          });
        }
      };

      recognition.start();

      timerRef.current = window.setInterval(() => {
        if (startedAtRef.current !== null) {
          setElapsedSec(Math.max(1, Math.floor((Date.now() - startedAtRef.current) / 1000)));
        }
      }, 500);

      void startAudioMeter();
    } catch {
      stopLiveSession(true);
      setMicNotice({
        tone: 'warning',
        messageKo:
          '마이크 세션을 시작하지 못했습니다. 브라우저 마이크 권한을 확인하거나 아래 텍스트 리허설을 이용해 보세요.',
      });
    }
  }, [startAudioMeter, stopLiveSession]);

  const handleStopLiveMic = useCallback(() => {
    stopLiveSession(false);
    setMicNotice({
      tone: 'success',
      messageKo:
        '마이크 분석을 중지했습니다. 아래 분석 결과를 확인하고 원할 때만 이 기기에 리포트를 저장하세요.',
    });
  }, [stopLiveSession]);

  const handleSelectSample = useCallback(
    (sample: TeachingSampleScript) => {
      if (isRecording) {
        stopLiveSession(true);
      }
      setActiveSampleId(sample.id);
      setSourceMode('sample');
      setTranscript(sample.transcript);
      setInterimTranscript('');
      interimRef.current = '';
      setDurationSec(sample.durationSec);
      setPauseCount(sample.pauseCount);
      setMicNotice(null);
      setSaveNotice(null);
    },
    [isRecording, stopLiveSession],
  );

  const handleTranscriptChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setTranscript(event.target.value);
      setActiveSampleId(null);
      if (!isRecording) {
        setSourceMode('text-rehearsal');
      }
      setSaveNotice(null);
    },
    [isRecording],
  );

  const handleClearInput = useCallback(() => {
    if (isRecording) {
      stopLiveSession(true);
    }
    setTranscript('');
    setInterimTranscript('');
    interimRef.current = '';
    setActiveSampleId(null);
    setPauseCount(0);
    setElapsedSec(0);
    setMicNotice(null);
    setSaveNotice(null);
  }, [isRecording, stopLiveSession]);

  const effectiveTranscript = useMemo(() => {
    const base = transcript.trim();
    const live = interimTranscript.trim();
    if (base && live) return `${base} ${live}`;
    return base || live;
  }, [interimTranscript, transcript]);

  const effectiveDurationSec = isRecording ? Math.max(elapsedSec, 1) : durationSec;

  const activeSampleMeta = useMemo(
    () => SAMPLE_TEACHING_SCRIPTS.find((item) => item.id === activeSampleId) ?? null,
    [activeSampleId],
  );

  const effectiveSequenceTitle =
    sequenceTitle?.trim() || activeSampleMeta?.sequenceTitle || '티칭 리허설 세션';

  const analysis = useMemo(
    () =>
      analyzeTeachingTranscript({
        transcript: effectiveTranscript,
        durationSec: effectiveDurationSec,
        pauseCount,
        sequenceTitle: effectiveSequenceTitle,
      }),
    [effectiveDurationSec, effectiveSequenceTitle, effectiveTranscript, pauseCount],
  );

  const hasAnalyzedSpeech = effectiveTranscript.length > 0 && analysis.wordsPerMinute > 0;

  const durationOptions = useMemo(() => {
    const merged = new Set<number>(STANDARD_DURATION_OPTIONS);
    if (durationSec > 0) merged.add(durationSec);
    return Array.from(merged).sort((a, b) => a - b);
  }, [durationSec]);

  const previousComparison = useMemo(
    () => compareWithPreviousCoachEntry(analysis, savedHistory[0]),
    [analysis, savedHistory],
  );

  const handleSaveReport = useCallback(() => {
    if (!hasAnalyzedSpeech) return;
    const result = saveTeachingCoachEntry({
      sample: {
        transcript: effectiveTranscript,
        durationSec: effectiveDurationSec,
        pauseCount,
        sequenceTitle: effectiveSequenceTitle,
      },
      analysis,
      exerciseContextKo: currentExerciseNameKo,
      sourceMode,
    });

    if (result.ok) {
      setSavedHistory(result.entries);
      setSaveNotice({
        tone: 'success',
        messageKo: result.redactedPersonalInfo
          ? `이 기기에 리포트를 저장했습니다. (최근 ${result.entries.length}건 보관 · 개인 식별 정보 자동 제외)`
          : `이 기기에 리포트를 저장했습니다. (최근 ${result.entries.length}건 보관 중)`,
      });
    } else {
      setSaveNotice({
        tone: 'warning',
        messageKo:
          result.errorKo ?? '이 기기에 리포트를 저장하지 못했습니다. 저장 공간을 확인해 주세요.',
      });
    }
  }, [
    analysis,
    currentExerciseNameKo,
    effectiveDurationSec,
    effectiveSequenceTitle,
    effectiveTranscript,
    hasAnalyzedSpeech,
    pauseCount,
    sourceMode,
  ]);

  const breathPct = Math.round(analysis.cueBalance.breathRatio * 100);
  const alignmentPct = Math.round(analysis.cueBalance.alignmentRatio * 100);
  const encouragementPct = Math.round(analysis.cueBalance.encouragementRatio * 100);

  return (
    <section
      className="tvc-panel"
      aria-label="온디바이스 강사 티칭 습관 AI 코치"
      data-testid="teaching-voice-coach-panel"
    >
      <header className="tvc-header">
        <div className="tvc-header-row">
          <div className="tvc-header-copy">
            <p className="tvc-eyebrow">
              <Sparkles size={15} aria-hidden="true" />
              온디바이스 티칭 코치
            </p>
            <h2 className="tvc-title">강사 티칭 습관 · 음성 리허설 분석</h2>
            <p className="tvc-subtitle">
              말 속도, 단골 습관어, 호흡·정렬·격려 큐 균형을 기기 안에서 바로 점검해 다음 수업
              전달력을 다듬어요.
            </p>
          </div>
        </div>

        {(sequenceTitle || currentExerciseNameKo) && (
          <div className="tvc-context-strip">
            {sequenceTitle && (
              <span className="tvc-context-tag">
                시퀀스 <strong>{sequenceTitle}</strong>
              </span>
            )}
            {currentExerciseNameKo && (
              <span className="tvc-context-tag">
                현재 동작 <strong>{currentExerciseNameKo}</strong>
              </span>
            )}
          </div>
        )}

        <div className="tvc-privacy-bar" role="note">
          <ShieldCheck size={16} aria-hidden="true" />
          <span>모든 음성은 기기 안에서만 분석되며 서버로 전송·녹음 저장되지 않습니다.</span>
        </div>
      </header>

      {/* 1. 실시간 마이크 분석 */}
      <div className="tvc-section">
        <div className="tvc-section-heading">
          <h3 className="tvc-section-title">1. 실시간 마이크 음성 분석</h3>
          <span className="tvc-section-meta">
            {speechSupported
              ? '한국어(ko-KR) 연속 인식 지원'
              : '텍스트 리허설 · 샘플 모드 사용 가능'}
          </span>
        </div>

        <div className="tvc-mic-band">
          <div className="tvc-mic-controls">
            <div className="tvc-mic-btn-group">
              {!isRecording ? (
                <button type="button" className="tvc-btn-primary" onClick={handleStartLiveMic}>
                  <Mic size={17} aria-hidden="true" />
                  실시간 마이크 분석 시작
                </button>
              ) : (
                <button
                  type="button"
                  className="tvc-btn-primary tvc-btn-recording"
                  onClick={handleStopLiveMic}
                >
                  <Square size={15} aria-hidden="true" />
                  마이크 분석 중지
                </button>
              )}

              {effectiveTranscript.length > 0 && (
                <button type="button" className="tvc-btn-secondary" onClick={handleClearInput}>
                  <RotateCcw size={16} aria-hidden="true" />
                  내용 지우기
                </button>
              )}
            </div>

            <div className="tvc-live-status-group">
              <span className="tvc-timer-pill tvc-num" data-recording={isRecording}>
                {isRecording && <span className="tvc-live-dot" aria-hidden="true" />}
                {isRecording
                  ? `진행 중 ${formatClock(elapsedSec)}`
                  : `기준 ${formatClock(durationSec)}`}
              </span>
            </div>
          </div>

          <div className="tvc-meter-wrap" aria-label="실시간 마이크 음량 수준">
            <div className="tvc-meter-label">
              <span>
                <Volume2
                  size={14}
                  aria-hidden="true"
                  style={{ verticalAlign: 'text-bottom', marginRight: 4 }}
                />
                {meterActive
                  ? '세이지 음량계 활성 · 기기 내부 분석 중'
                  : isRecording
                    ? '음성 텍스트 인식 중 (음량계 미연결)'
                    : '마이크 시작 시 부드러운 음량 막대가 표시됩니다'}
              </span>
              <span className="tvc-num">멈춤 {pauseCount}회</span>
            </div>
            <div className="tvc-meter-bars" role="img" aria-label="온디바이스 음량 막대">
              {meterLevels.map((level, index) => (
                <span
                  key={index}
                  className="tvc-meter-bar"
                  data-active={meterActive && level > 22}
                  style={{ height: `${level}%` }}
                />
              ))}
            </div>
          </div>

          {micNotice && (
            <p className="tvc-notice" role="status" data-tone={micNotice.tone}>
              {micNotice.messageKo}
            </p>
          )}
        </div>
      </div>

      {/* 2. 텍스트 리허설 & 3종 원탭 샘플 체험 */}
      <div className="tvc-section">
        <div className="tvc-section-heading">
          <h3 className="tvc-section-title">2. 텍스트 리허설 · 3종 원탭 샘플 체험</h3>
          <span className="tvc-section-meta">마이크 없이도 즉시 점검</span>
        </div>

        <div className="tvc-sample-grid" role="group" aria-label="원탭 티칭 리허설 샘플 선택">
          {SAMPLE_TEACHING_SCRIPTS.map((sample) => (
            <button
              key={sample.id}
              type="button"
              className="tvc-btn-sample"
              aria-pressed={activeSampleId === sample.id}
              onClick={() => handleSelectSample(sample)}
            >
              <span className="tvc-sample-tag">{sample.shortTagKo}</span>
              <span className="tvc-sample-label">{sample.labelKo}</span>
            </button>
          ))}
        </div>

        <div className="tvc-rehearsal-controls">
          <label className="tvc-field-label" htmlFor={textareaId}>
            티칭 리허설 스크립트
          </label>
          <div className="tvc-duration-control">
            <label className="tvc-section-meta" htmlFor={durationSelectId}>
              발화 시간
            </label>
            <select
              id={durationSelectId}
              className="tvc-select tvc-num"
              value={durationSec}
              disabled={isRecording}
              onChange={(event) => {
                setDurationSec(Number(event.target.value));
                setSaveNotice(null);
              }}
            >
              {durationOptions.map((seconds) => (
                <option key={seconds} value={seconds}>
                  {seconds}초
                </option>
              ))}
            </select>
          </div>
        </div>

        <textarea
          id={textareaId}
          className="tvc-textarea"
          value={transcript}
          onChange={handleTranscriptChange}
          placeholder="수업에서 말할 티칭 큐를 직접 입력하거나, 위 3종 샘플 버튼 중 하나를 눌러 바로 분석해 보세요."
        />

        {interimTranscript && (
          <p className="tvc-interim-line" aria-live="polite">
            인식 중: {interimTranscript}
          </p>
        )}
      </div>

      {/* 3. 세션 피드백 리포트 */}
      <div className="tvc-section">
        <div className="tvc-section-heading">
          <h3 className="tvc-section-title">3. 티칭 습관 피드백 리포트</h3>
          <span className="tvc-section-meta">연습 참고용 자가 점검 지표</span>
        </div>

        {!hasAnalyzedSpeech ? (
          <div className="tvc-empty-state">
            아직 분석할 발화가 없습니다. 상단의 <strong>실시간 마이크 분석 시작</strong>을 누르거나
            <strong> 3종 샘플 버튼</strong> 중 하나를 선택하면 말 속도, 습관어, 호흡·정렬·격려 큐
            균형이 바로 계산됩니다.
          </div>
        ) : (
          <>
            <div className="tvc-kpi-grid">
              <div className="tvc-kpi-tile">
                <span className="tvc-kpi-label">발화 템포</span>
                <span className="tvc-kpi-value tvc-num">{analysis.syllablesPerMinute} 음절/분</span>
                <span className="tvc-kpi-sub tvc-num">{analysis.wordsPerMinute} 어절/분</span>
                <span className="tvc-pace-badge" data-pace={analysis.paceRating}>
                  {analysis.paceLabelKo}
                </span>
              </div>

              <div className="tvc-kpi-tile">
                <span className="tvc-kpi-label">습관어 빈도</span>
                <span className="tvc-kpi-value tvc-num">{analysis.totalFillers}회</span>
                <span className="tvc-kpi-sub tvc-num">분당 {analysis.fillerRatePerMin}회</span>
                <span className="tvc-kpi-sub">
                  {analysis.fillerCounts[0]
                    ? `최다 '${analysis.fillerCounts[0].word}' (${analysis.fillerCounts[0].count}회)`
                    : '주요 습관어 없음'}
                </span>
              </div>

              <div className="tvc-kpi-tile">
                <span className="tvc-kpi-label">티칭 참고 점수</span>
                <span className="tvc-kpi-value tvc-num">{analysis.overallScore}점</span>
                <span className="tvc-kpi-sub tvc-num">100점 만점 기준</span>
                <span className="tvc-kpi-sub">자가 연습용 참고 수치</span>
              </div>
            </div>

            <div className="tvc-subblock">
              <h4 className="tvc-subblock-title">습관어 TOP 카운트</h4>
              {analysis.fillerCounts.length === 0 ? (
                <p className="tvc-clean-note">
                  주요 습관어(&apos;자·어·음·약간·조금·이제·한번·그냥·일단&apos;)가 감지되지 않아
                  전달이 또렷합니다.
                </p>
              ) : (
                <ul className="tvc-filler-list" aria-label="감지된 습관어 목록">
                  {analysis.fillerCounts.slice(0, 6).map((item) => (
                    <li key={item.word} className="tvc-filler-chip">
                      <span>&apos;{item.word}&apos;</span>
                      <span className="tvc-filler-count tvc-num">{item.count}회</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="tvc-subblock">
              <h4 className="tvc-subblock-title">호흡 · 정렬 · 격려 큐 균형</h4>
              <div
                className="tvc-balance-bar"
                role="img"
                aria-label={`호흡 ${breathPct}%, 정렬 ${alignmentPct}%, 격려 ${encouragementPct}%`}
              >
                {breathPct > 0 && (
                  <div
                    className="tvc-balance-seg tvc-balance-seg--breath"
                    style={{ width: `${breathPct}%` }}
                  />
                )}
                {alignmentPct > 0 && (
                  <div
                    className="tvc-balance-seg tvc-balance-seg--alignment"
                    style={{ width: `${alignmentPct}%` }}
                  />
                )}
                {encouragementPct > 0 && (
                  <div
                    className="tvc-balance-seg tvc-balance-seg--encouragement"
                    style={{ width: `${encouragementPct}%` }}
                  />
                )}
              </div>

              <div className="tvc-balance-legend">
                <div className="tvc-legend-item">
                  <span
                    className="tvc-legend-swatch tvc-legend-swatch--breath"
                    aria-hidden="true"
                  />
                  <span>호흡 큐</span>
                  <span className="tvc-legend-value tvc-num">
                    {analysis.cueBalance.breathCount}회 ({breathPct}%)
                  </span>
                </div>
                <div className="tvc-legend-item">
                  <span
                    className="tvc-legend-swatch tvc-legend-swatch--alignment"
                    aria-hidden="true"
                  />
                  <span>정렬 큐</span>
                  <span className="tvc-legend-value tvc-num">
                    {analysis.cueBalance.alignmentCount}회 ({alignmentPct}%)
                  </span>
                </div>
                <div className="tvc-legend-item">
                  <span
                    className="tvc-legend-swatch tvc-legend-swatch--encouragement"
                    aria-hidden="true"
                  />
                  <span>격려 큐</span>
                  <span className="tvc-legend-value tvc-num">
                    {analysis.cueBalance.encouragementCount}회 ({encouragementPct}%)
                  </span>
                </div>
              </div>
            </div>

            <div className="tvc-subblock">
              <div className="tvc-feedback-grid">
                <div className="tvc-feedback-col tvc-feedback-col--strengths">
                  <h4 className="tvc-subblock-title">이번 리허설의 강점</h4>
                  <ul className="tvc-feedback-list">
                    {analysis.strengthsKo.map((strength, idx) => (
                      <li key={idx}>{strength}</li>
                    ))}
                  </ul>
                </div>

                <div className="tvc-feedback-col">
                  <h4 className="tvc-subblock-title">다음 수업 개선 팁</h4>
                  <ul className="tvc-feedback-list">
                    {analysis.coachingTipsKo.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 4. 이 기기에 저장 및 최근 히스토리 비교 */}
      <div className="tvc-section">
        <div className="tvc-save-row">
          <p className="tvc-save-hint">
            자동 저장하지 않습니다. 원할 때만 버튼으로 요약 지표(최근 10건)를 이 기기에 남길 수
            있으며 회원 실명·연락처는 저장되지 않습니다.
          </p>
          <button
            type="button"
            className="tvc-btn-primary"
            disabled={!hasAnalyzedSpeech}
            onClick={handleSaveReport}
          >
            <Save size={16} aria-hidden="true" />이 기기에 리포트 저장
          </button>
        </div>

        {saveNotice && (
          <p
            className="tvc-notice"
            role="status"
            data-tone={saveNotice.tone}
            style={{ marginTop: 10 }}
          >
            {saveNotice.messageKo}
          </p>
        )}

        <details className="tvc-history-details">
          <summary className="tvc-history-summary">
            <span>
              <History
                size={16}
                aria-hidden="true"
                style={{ verticalAlign: 'text-bottom', marginRight: 6 }}
              />
              최근 저장 히스토리 비교 (<span className="tvc-num">{savedHistory.length}</span>건)
            </span>
            <ChevronDown size={16} aria-hidden="true" />
          </summary>

          <div className="tvc-history-body">
            {previousComparison && (
              <div className="tvc-delta-banner">
                직전 저장 리포트 대비: 점수{' '}
                <strong>{formatSignedNumber(previousComparison.scoreDelta, '점')}</strong> · 분당
                습관어{' '}
                <strong>{formatSignedNumber(previousComparison.fillerRateDelta, '회')}</strong> ·
                발화 속도{' '}
                <strong>{formatSignedNumber(previousComparison.syllablesDelta, ' 음절/분')}</strong>
                <div>{previousComparison.summaryKo}</div>
              </div>
            )}

            {savedHistory.length === 0 ? (
              <p className="tvc-history-empty">
                아직 저장된 티칭 리포트가 없습니다. 리허설 분석 후 &apos;이 기기에 리포트
                저장&apos;을 누르면 최근 10건까지 기기 안에서 변화 추이를 비교할 수 있어요.
              </p>
            ) : (
              <ul className="tvc-history-list">
                {savedHistory.map((item) => (
                  <li key={item.id} className="tvc-history-item">
                    <div className="tvc-history-item-top">
                      <span className="tvc-history-title">{item.sequenceTitle}</span>
                      <span className="tvc-history-score tvc-num">{item.overallScore}점</span>
                    </div>
                    <div className="tvc-history-metrics tvc-num">
                      <span>{formatSavedDateKo(item.savedAt)}</span>
                      <span>
                        {item.syllablesPerMinute} 음절/분 ({item.paceLabelKo})
                      </span>
                      <span>
                        습관어 {item.totalFillers}회 (분당 {item.fillerRatePerMin}회)
                      </span>
                      <span>
                        호흡 {Math.round(item.cueBalance.breathRatio * 100)}% · 정렬{' '}
                        {Math.round(item.cueBalance.alignmentRatio * 100)}% · 격려{' '}
                        {Math.round(item.cueBalance.encouragementRatio * 100)}%
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </details>
      </div>
    </section>
  );
};

export default TeachingVoiceCoachPanel;
