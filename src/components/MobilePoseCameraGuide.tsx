import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  CameraOff,
  FlipHorizontal2,
  Grid3x3,
  Layers,
  RefreshCw,
  ShieldCheck,
  Timer,
  Trash2,
  X,
} from 'lucide-react';
import type { VisualPhaseId } from '../data/movementVisualRigCatalog';
import type { BodyPosition, PilatesExercise } from '../types/pilates';
import { getExerciseArtworkFrame } from '../utils/exerciseArtworkCache';
import { BodyPositionFigure } from './BodyPositionFigure';
import { PoseAsymmetryAnalyzerWidget } from './PoseAsymmetryAnalyzerWidget';
import '../styles/lesson-mode-studio.css';

export type CameraGuideStatus =
  | 'idle'
  | 'requesting'
  | 'active'
  | 'denied'
  | 'unsupported'
  | 'simulation';

interface PracticeSnapshotItem {
  readonly id: string;
  readonly labelKo: string;
  readonly dataUrl: string;
  readonly source: 'camera' | 'simulation';
}

export interface MobilePoseCameraGuideProps {
  readonly exercise?: Pick<
    PilatesExercise,
    'id' | 'nameKo' | 'nameEn' | 'apparatus' | 'bodyPosition' | 'cues' | 'breathPattern'
  > | null;
  readonly initialMirrored?: boolean;
  readonly onClose?: () => void;
  readonly className?: string;
}

const PHASE_OPTIONS: ReadonlyArray<{ readonly id: VisualPhaseId; readonly labelKo: string }> = [
  { id: 'start', labelKo: '시작' },
  { id: 'middle', labelKo: '정점' },
  { id: 'end', labelKo: '마무리' },
];

const POSITION_SIM_LABEL_KO: Readonly<Record<BodyPosition, string>> = {
  supine: '누운 정렬 참고',
  prone: '엎드린 정렬 참고',
  'side-lying': '옆으로 누운 정렬 참고',
  seated: '앉은 정렬 참고',
  kneeling: '무릎 선 정렬 참고',
  standing: '선 자세 정렬 참고',
  quadruped: '네발기기 정렬 참고',
};

function buildSimulationSnapshotDataUrl(labelKo: string, exerciseNameKo: string): string {
  const safeLabel = labelKo.replace(/[<>&"]/g, '');
  const safeName = exerciseNameKo.slice(0, 20).replace(/[<>&"]/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240">
    <rect width="320" height="240" fill="#F2EEE5"/>
    <line x1="160" y1="16" x2="160" y2="224" stroke="#355441" stroke-opacity="0.45" stroke-dasharray="5 5"/>
    <line x1="36" y1="84" x2="284" y2="84" stroke="#355441" stroke-opacity="0.45" stroke-dasharray="5 5"/>
    <line x1="36" y1="156" x2="284" y2="156" stroke="#355441" stroke-opacity="0.45" stroke-dasharray="5 5"/>
    <circle cx="160" cy="54" r="14" fill="none" stroke="#355441" stroke-width="3"/>
    <path d="M160 68 L160 156 M124 92 L196 92 M140 156 L132 210 M180 156 L188 210" stroke="#355441" stroke-width="3" stroke-linecap="round" fill="none"/>
    <rect x="10" y="10" width="96" height="24" rx="6" fill="#FFFFFF" fill-opacity="0.92"/>
    <text x="58" y="26" text-anchor="middle" font-size="11" font-family="sans-serif" fill="#1E3129">${safeLabel}</text>
    <text x="160" y="232" text-anchor="middle" font-size="10" font-family="sans-serif" fill="#5E554A">${safeName}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function captureVideoFrameDataUrl(
  video: HTMLVideoElement | null,
  mirrored: boolean,
): string | null {
  if (!video || video.videoWidth === 0 || video.videoHeight === 0 || typeof document === 'undefined') {
    return null;
  }
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.save();
    if (mirrored) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();
    return canvas.toDataURL('image/jpeg', 0.82);
  } catch {
    return null;
  }
}

export function MobilePoseCameraGuide({
  exercise = null,
  initialMirrored = true,
  onClose,
  className = '',
}: MobilePoseCameraGuideProps) {
  const [cameraStatus, setCameraStatus] = useState<CameraGuideStatus>('idle');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [showGrid, setShowGrid] = useState(true);
  const [showGhost, setShowGhost] = useState(true);
  const [mirrored, setMirrored] = useState(initialMirrored);
  const [ghostOpacity, setGhostOpacity] = useState(40);
  const [selectedPhase, setSelectedPhase] = useState<VisualPhaseId>('middle');
  const [failedArtworkSrc, setFailedArtworkSrc] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // 5-second local practice capture & comparison state
  const [isCapturing, setIsCapturing] = useState(false);
  const [remainingSec, setRemainingSec] = useState(0);
  const [snapshots, setSnapshots] = useState<PracticeSnapshotItem[]>([]);
  const [recordedClipUrl, setRecordedClipUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cvOverlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timersRef = useRef<number[]>([]);
  const clipUrlRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  const exerciseNameKo = exercise?.nameKo ?? '기본 정렬 자세';
  const bodyPosition: BodyPosition = exercise?.bodyPosition ?? 'standing';

  const cachedFrame = useMemo(() => {
    if (!exercise) return undefined;
    return getExerciseArtworkFrame(exercise, selectedPhase);
  }, [exercise, selectedPhase]);

  const use3dGhostImage = Boolean(cachedFrame && cachedFrame.src !== failedArtworkSrc);

  const clearPracticeTimers = useCallback(() => {
    for (const id of timersRef.current) {
      window.clearTimeout(id);
    }
    timersRef.current = [];
  }, []);

  const stopRecorderIfActive = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') {
      try {
        rec.stop();
      } catch {
        // Ignore recorder stop errors
      }
    }
    recorderRef.current = null;
  }, []);

  const stopCameraStream = useCallback(() => {
    stopRecorderIfActive();
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        try {
          track.stop();
        } catch {
          // Ignore track cleanup error
        }
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stopRecorderIfActive]);

  const revokeRecordedClip = useCallback(() => {
    if (clipUrlRef.current && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(clipUrlRef.current);
    }
    clipUrlRef.current = null;
    setRecordedClipUrl(null);
  }, []);

  useEffect(() => {
    if (cameraStatus !== 'active') return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }
    if (typeof video.play === 'function') {
      void Promise.resolve(video.play()).catch(() => {
        // Autoplay may be deferred on some browsers until user tap
      });
    }
  }, [cameraStatus]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearPracticeTimers();
      stopCameraStream();
      if (clipUrlRef.current && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(clipUrlRef.current);
      }
    };
  }, [clearPracticeTimers, stopCameraStream]);

  const startLocalCamera = async (targetFacing: 'user' | 'environment' = facingMode) => {
    setStatusNotice(null);
    stopCameraStream();

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      setCameraStatus('unsupported');
      setStatusNotice(
        '이 환경에서는 실시간 카메라를 지원하지 않아요. 정적 시뮬레이션 화면으로 정렬 그리드와 3D 실루엣을 확인할 수 있어요.',
      );
      return;
    }

    setCameraStatus('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: targetFacing },
          width: { ideal: 960 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (!isMountedRef.current) {
        for (const track of stream.getTracks()) {
          try {
            track.stop();
          } catch {
            // Ignore cleanup errors on late unmount
          }
        }
        return;
      }

      streamRef.current = stream;
      setCameraStatus('active');
    } catch {
      if (!isMountedRef.current) return;
      setCameraStatus('denied');
      setStatusNotice(
        '카메라 권한이 허용되지 않았거나 연결된 카메라를 찾지 못했어요. 시뮬레이션 보기로 정렬 가이드를 계속 사용할 수 있어요.',
      );
    }
  };

  const handleStopCamera = () => {
    clearPracticeTimers();
    setIsCapturing(false);
    setRemainingSec(0);
    stopCameraStream();
    setCameraStatus('idle');
    setStatusNotice('카메라를 껐어요. 필요할 때 언제든 다시 켤 수 있어요.');
  };

  const handleFlipCameraFacing = async () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    setMirrored(nextFacing === 'user');
    if (cameraStatus === 'active') {
      await startLocalCamera(nextFacing);
    }
  };

  const handleEnterSimulation = () => {
    stopCameraStream();
    setCameraStatus('simulation');
    setStatusNotice('정적 시뮬레이션 보기 중이에요. 그리드·실루엣 투명도와 5초 연습 비교를 체험해 보세요.');
  };

  const captureMoment = useCallback(
    (id: string, labelKo: string) => {
      const frame =
        cameraStatus === 'active'
          ? captureVideoFrameDataUrl(videoRef.current, mirrored)
          : null;
      const item: PracticeSnapshotItem = frame
        ? { id, labelKo, dataUrl: frame, source: 'camera' }
        : {
            id,
            labelKo,
            dataUrl: buildSimulationSnapshotDataUrl(labelKo, exerciseNameKo),
            source: 'simulation',
          };
      setSnapshots((prev) => [...prev.filter((p) => p.id !== id), item]);
    },
    [cameraStatus, mirrored, exerciseNameKo],
  );

  const handleStartFiveSecondPractice = () => {
    if (isCapturing) {
      clearPracticeTimers();
      stopRecorderIfActive();
      setIsCapturing(false);
      setRemainingSec(0);
      setStatusNotice('5초 연습 캡처를 멈췄어요.');
      return;
    }

    clearPracticeTimers();
    revokeRecordedClip();
    setSnapshots([]);
    setIsCapturing(true);
    setRemainingSec(5);
    setStatusNotice('5초 동안 천천히 호흡하며 움직여 보세요. 기기 안에서만 비교 화면을 만들어요.');

    // Optional local-only 5s MediaRecorder clip when live camera stream is active
    if (
      cameraStatus === 'active' &&
      streamRef.current &&
      typeof MediaRecorder !== 'undefined'
    ) {
      try {
        recordedChunksRef.current = [];
        const recorder = new MediaRecorder(streamRef.current);
        recorder.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) {
            recordedChunksRef.current.push(ev.data);
          }
        };
        recorder.onstop = () => {
          if (
            recordedChunksRef.current.length > 0 &&
            typeof URL !== 'undefined' &&
            typeof URL.createObjectURL === 'function'
          ) {
            const blob = new Blob(recordedChunksRef.current, {
              type: recorder.mimeType || 'video/webm',
            });
            const url = URL.createObjectURL(blob);
            clipUrlRef.current = url;
            setRecordedClipUrl(url);
          }
        };
        recorder.start();
        recorderRef.current = recorder;
      } catch {
        // Snapshots still work even if MediaRecorder codec is unavailable
      }
    }

    // Immediate start snapshot (0s)
    captureMoment('snap-start', '시작 0초');

    const schedule = (delayMs: number, fn: () => void) => {
      const id = window.setTimeout(fn, delayMs);
      timersRef.current.push(id);
    };

    schedule(1000, () => setRemainingSec(4));
    schedule(2000, () => setRemainingSec(3));
    schedule(2500, () => captureMoment('snap-mid', '정점 2.5초'));
    schedule(3000, () => setRemainingSec(2));
    schedule(4000, () => setRemainingSec(1));
    schedule(5000, () => {
      captureMoment('snap-end', '마무리 5초');
      stopRecorderIfActive();
      setRemainingSec(0);
      setIsCapturing(false);
      setStatusNotice('5초 연습 비교 3컷이 준비되었어요. 참조 자세와 나란히 확인해 보세요.');
    });
  };

  const handleClearPractice = () => {
    clearPracticeTimers();
    stopRecorderIfActive();
    revokeRecordedClip();
    setSnapshots([]);
    setIsCapturing(false);
    setRemainingSec(0);
  };

  return (
    <section
      className={`mpg-panel ${className}`.trim()}
      aria-label="온디바이스 카메라 정렬 보조"
    >
      <header className="mpg-header">
        <div>
          <h2 className="mpg-title">카메라 정렬 거울 · {exerciseNameKo}</h2>
          <p className="mpg-subtitle">
            {POSITION_SIM_LABEL_KO[bodyPosition]} · 어깨·골반 수평과 3D 실루엣을 겹쳐 참고해요.
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            className="mpg-btn"
            onClick={() => {
              handleStopCamera();
              onClose();
            }}
            aria-label="카메라 정렬 보조 닫기"
          >
            <X size={16} aria-hidden="true" />
            <span>닫기</span>
          </button>
        )}
      </header>

      {/* Clean Unobstructed Status Strip Above Camera Frame */}
      <div className="mpg-stage-meta-bar">
        <span className="mpg-stage-badge">
          {cameraStatus === 'active'
            ? mirrored
              ? '실시간 거울'
              : '실시간 후면'
            : cameraStatus === 'simulation'
              ? '시뮬레이션 미리보기'
              : cameraStatus === 'requesting'
                ? '카메라 연결 중…'
                : '정렬 연습 대기'}
        </span>
        {isCapturing && remainingSec > 0 && (
          <span className="mpg-countdown-badge" role="status" aria-live="polite">
            5초 연습 · {remainingSec}초
          </span>
        )}
      </div>

      {/* Camera / Simulation Stage (Unobstructed Visual Frame) */}
      <div className="mpg-stage" data-camera-status={cameraStatus}>
        {cameraStatus === 'active' ? (
          <video
            ref={videoRef}
            className={`mpg-video ${mirrored ? 'mpg-mirrored' : ''}`.trim()}
            autoPlay
            playsInline
            muted
            aria-label="실시간 로컬 카메라 화면"
          />
        ) : (
          <div className="mpg-simulation-backdrop" aria-label="정적 정렬 시뮬레이션 화면">
            <BodyPositionFigure
              position={bodyPosition}
              decorative
              className={`mpg-simulation-figure ${mirrored ? 'mpg-mirrored' : ''}`.trim()}
            />
            <p className="mpg-simulation-caption">
              {cameraStatus === 'denied' || cameraStatus === 'unsupported'
                ? '카메라 없이도 아래 정렬 그리드·3D 실루엣 투명도·5초 연습 비교를 그대로 확인할 수 있어요.'
                : '카메라 켜기를 누르면 기기 안에서만 거울 화면이 열려요.'}
            </p>
          </div>
        )}

        {/* Real-Time On-Device CV Landmark Canvas Overlay */}
        <canvas
          ref={cvOverlayCanvasRef}
          width={400}
          height={300}
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 4,
          }}
        />

        {/* ① Shoulder & Pelvis Horizontal / Vertical Alignment Grid */}
        {showGrid && (
          <svg
            className="mpg-grid-overlay"
            viewBox="0 0 400 300"
            preserveAspectRatio="none"
            role="img"
            aria-label="어깨·골반 수평 및 수직 중심 정렬 그리드"
          >
            {/* Vertical center plumb line */}
            <line
              x1="200"
              y1="12"
              x2="200"
              y2="288"
              stroke="rgba(255,254,249,0.75)"
              strokeWidth="2.5"
              strokeDasharray="6 6"
            />
            <line
              x1="200"
              y1="12"
              x2="200"
              y2="288"
              stroke="#355441"
              strokeWidth="1.2"
              strokeDasharray="6 6"
            />

            {/* Shoulder horizontal guide line */}
            <line
              x1="24"
              y1="102"
              x2="376"
              y2="102"
              stroke="rgba(255,254,249,0.75)"
              strokeWidth="2.5"
              strokeDasharray="8 5"
            />
            <line
              x1="24"
              y1="102"
              x2="376"
              y2="102"
              stroke="#355441"
              strokeWidth="1.2"
              strokeDasharray="8 5"
            />
            <rect x="24" y="80" width="52" height="18" rx="4" fill="rgba(255,254,249,0.88)" />
            <text
              x="50"
              y="93"
              textAnchor="middle"
              fontSize="10"
              fontWeight="600"
              fill="#355441"
            >
              어깨선
            </text>

            {/* Pelvis horizontal guide line */}
            <line
              x1="24"
              y1="196"
              x2="376"
              y2="196"
              stroke="rgba(255,254,249,0.75)"
              strokeWidth="2.5"
              strokeDasharray="8 5"
            />
            <line
              x1="24"
              y1="196"
              x2="376"
              y2="196"
              stroke="#355441"
              strokeWidth="1.2"
              strokeDasharray="8 5"
            />
            <rect x="24" y="174" width="52" height="18" rx="4" fill="rgba(255,254,249,0.88)" />
            <text
              x="50"
              y="187"
              textAnchor="middle"
              fontSize="10"
              fontWeight="600"
              fill="#355441"
            >
              골반선
            </text>
          </svg>
        )}

        {/* ② 3D Reference Silhouette Ghost Overlay */}
        {showGhost && (
          <div
            className="mpg-ghost-layer"
            style={{ opacity: ghostOpacity / 100 }}
            data-testid="mpg-ghost-overlay"
          >
            {use3dGhostImage && cachedFrame ? (
              <img
                src={cachedFrame.src}
                alt={`${exerciseNameKo} 3D 참조 실루엣`}
                className={`mpg-ghost-img ${mirrored ? 'mpg-mirrored' : ''}`.trim()}
                onError={() => setFailedArtworkSrc(cachedFrame.src)}
              />
            ) : (
              <BodyPositionFigure
                position={bodyPosition}
                decorative
                className={`mpg-ghost-svg ${mirrored ? 'mpg-mirrored' : ''}`.trim()}
              />
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mpg-controls">
        {statusNotice && (
          <p className="mpg-status-banner" role="status" aria-live="polite">
            {statusNotice}
          </p>
        )}

        {/* Main Camera & 5s Capture Actions */}
        <div className="mpg-action-row">
          {cameraStatus === 'active' ? (
            <button type="button" className="mpg-btn" onClick={handleStopCamera}>
              <CameraOff size={16} aria-hidden="true" />
              <span>카메라 끄기</span>
            </button>
          ) : (
            <button
              type="button"
              className="mpg-btn mpg-btn-primary"
              onClick={() => void startLocalCamera(facingMode)}
            >
              <Camera size={16} aria-hidden="true" />
              <span>카메라 켜기</span>
            </button>
          )}

          <button
            type="button"
            className={`mpg-btn ${isCapturing ? 'mpg-btn-primary' : ''}`.trim()}
            onClick={handleStartFiveSecondPractice}
          >
            <Timer size={16} aria-hidden="true" />
            <span>{isCapturing ? `중지 (${remainingSec}초)` : '5초 연습 비교'}</span>
          </button>
        </div>

        {(cameraStatus === 'denied' || cameraStatus === 'unsupported') && (
          <button type="button" className="mpg-btn" onClick={handleEnterSimulation}>
            <span>시뮬레이션 보기로 전환</span>
          </button>
        )}

        {cameraStatus === 'active' && (
          <button
            type="button"
            className="mpg-btn"
            onClick={() => void handleFlipCameraFacing()}
          >
            <RefreshCw size={15} aria-hidden="true" />
            <span>{facingMode === 'user' ? '후면 카메라로 전환' : '전면 거울로 전환'}</span>
          </button>
        )}

        {/* Overlay Toggle Chips */}
        <div className="mpg-chip-row" role="group" aria-label="오버레이 표시 설정">
          <button
            type="button"
            className="mpg-chip"
            aria-pressed={showGrid}
            onClick={() => setShowGrid((prev) => !prev)}
          >
            <Grid3x3 size={15} aria-hidden="true" />
            <span>정렬 그리드</span>
          </button>
          <button
            type="button"
            className="mpg-chip"
            aria-pressed={showGhost}
            onClick={() => setShowGhost((prev) => !prev)}
          >
            <Layers size={15} aria-hidden="true" />
            <span>3D 실루엣</span>
          </button>
          <button
            type="button"
            className="mpg-chip"
            aria-pressed={mirrored}
            onClick={() => setMirrored((prev) => !prev)}
          >
            <FlipHorizontal2 size={15} aria-hidden="true" />
            <span>좌우 거울</span>
          </button>
        </div>

        {/* Silhouette Opacity Slider & Phase Selector */}
        {showGhost && (
          <div className="mpg-slider-bar">
            <div className="mpg-slider-head">
              <label htmlFor="mpg-ghost-opacity">3D 참조 실루엣 투명도</label>
              <span className="mpg-num">{ghostOpacity}%</span>
            </div>
            <input
              id="mpg-ghost-opacity"
              type="range"
              min={0}
              max={85}
              step={5}
              value={ghostOpacity}
              onChange={(e) => setGhostOpacity(Number(e.target.value))}
              className="mpg-slider"
              aria-label="3D 참조 실루엣 투명도"
            />
            <div className="mpg-phase-row" role="group" aria-label="참조 자세 구간 선택">
              {PHASE_OPTIONS.map((phase) => (
                <button
                  key={phase.id}
                  type="button"
                  className="mpg-phase-btn"
                  aria-pressed={selectedPhase === phase.id}
                  onClick={() => setSelectedPhase(phase.id)}
                >
                  {phase.labelKo} 자세
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ③ 5-Second Local Practice Comparison */}
      {(snapshots.length > 0 || recordedClipUrl) && (
        <div className="mpg-compare-section" aria-label="5초 연습 로컬 비교">
          <div className="lms-section-head">
            <h3 className="lms-section-title">5초 연습 비교 (기기 내 임시 보관)</h3>
            <button
              type="button"
              className="mpg-btn"
              onClick={handleClearPractice}
              aria-label="5초 연습 스냅샷 비우기"
            >
              <Trash2 size={15} aria-hidden="true" />
              <span>비우기</span>
            </button>
          </div>

          {snapshots.length > 0 && (
            <div className="mpg-compare-grid">
              {snapshots.map((snap) => (
                <figure key={snap.id} className="mpg-snap-card" style={{ margin: 0 }}>
                  <img
                    src={snap.dataUrl}
                    alt={`${exerciseNameKo} ${snap.labelKo} 연습 스냅샷`}
                    className="mpg-snap-preview"
                  />
                  <figcaption className="mpg-snap-label">{snap.labelKo}</figcaption>
                </figure>
              ))}
            </div>
          )}

          {recordedClipUrl && (
            <video
              src={recordedClipUrl}
              className="mpg-clip-video"
              controls
              playsInline
              muted
              aria-label="5초 로컬 연습 클립 재생"
            />
          )}

          <p className="lms-summary-line">
            어깨선과 골반선이 편안한 수평을 이루는지, 호흡하면서 목과 어깨에 힘이 빠졌는지 참고해 보세요.
          </p>
        </div>
      )}

      {/* Real-Time On-Device CV Pose Symmetry Analyzer */}
      <PoseAsymmetryAnalyzerWidget
        videoRef={videoRef}
        cameraActive={cameraStatus === 'active'}
        exerciseNameKo={exerciseNameKo}
        overlayCanvasRef={cvOverlayCanvasRef}
      />

      {/* Honest On-Device Privacy Notice */}
      <p className="mpg-privacy-footer">
        <ShieldCheck size={15} aria-hidden="true" />
        <span>기기 안에서만 표시되며 서버로 전송되지 않아요. 정렬 확인 보조용입니다.</span>
      </p>
    </section>
  );
}
