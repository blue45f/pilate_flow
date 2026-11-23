import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ScanLine, ShieldCheck } from 'lucide-react';
import {
  NON_MEDICAL_ALIGNMENT_DISCLAIMER_KO,
  ON_DEVICE_PRIVACY_NOTICE_KO,
  POSE_ANALYSIS_HEIGHT,
  POSE_ANALYSIS_WIDTH,
  POSE_SIMULATION_PRESETS,
  analyzeSilhouetteRgbaFrame,
  analyzeVideoFrameToPose,
  createSyntheticPoseFrame,
  drawPoseLandmarksOnCanvas,
  formatMidlineDirectionKo,
  formatSignedDeg,
  formatSignedPct,
  formatTiltDirectionKo,
  type PoseAnalysisResult,
  type PoseSimulationPresetId,
} from '../utils/onDevicePoseAnalyzer';
import '../styles/pose-asymmetry-cv.css';

export interface PoseAsymmetryAnalyzerWidgetProps {
  readonly videoRef?: React.RefObject<HTMLVideoElement | null>;
  readonly cameraActive?: boolean;
  readonly exerciseNameKo?: string;
  readonly overlayCanvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

const PREVIEW_CANVAS_WIDTH = 240;
const PREVIEW_CANVAS_HEIGHT = 180;
const ANALYSIS_INTERVAL_MS = 200;

function getSafe2DContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const fn = canvas.getContext as unknown as { mock?: unknown };
  const isMocked =
    Object.prototype.hasOwnProperty.call(canvas, 'getContext') || typeof fn?.mock === 'object';
  if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent) && !isMocked) {
    return null;
  }
  try {
    return canvas.getContext('2d');
  } catch {
    return null;
  }
}

function paintRgbaSilhouettePreview(
  canvas: HTMLCanvasElement,
  rgba: Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
): void {
  try {
    const ctx = getSafe2DContext(canvas);
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (typeof document === 'undefined' || typeof ImageData === 'undefined') {
      return;
    }

    const temp = document.createElement('canvas');
    temp.width = srcWidth;
    temp.height = srcHeight;
    const tempCtx = getSafe2DContext(temp);
    if (!tempCtx) return;

    const imageData = new ImageData(new Uint8ClampedArray(rgba), srcWidth, srcHeight);
    tempCtx.putImageData(imageData, 0, 0);

    ctx.save();
    ctx.globalAlpha = 0.24;
    ctx.drawImage(temp, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  } catch {
    // Gracefully skip raster preview when Canvas2D is unavailable in headless DOM
  }
}

export function PoseAsymmetryAnalyzerWidget({
  videoRef,
  cameraActive = false,
  exerciseNameKo,
  overlayCanvasRef,
}: PoseAsymmetryAnalyzerWidgetProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activePresetId, setActivePresetId] = useState<PoseSimulationPresetId>('balanced');
  const [cameraAnalysis, setCameraAnalysis] = useState<PoseAnalysisResult | null>(null);

  const scratchCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const silhouetteCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewOverlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const simulationData = useMemo(() => {
    const preset =
      POSE_SIMULATION_PRESETS.find((item) => item.id === activePresetId) ??
      POSE_SIMULATION_PRESETS[0]!;
    const rgba = createSyntheticPoseFrame(
      POSE_ANALYSIS_WIDTH,
      POSE_ANALYSIS_HEIGHT,
      preset.options,
    );
    const result = analyzeSilhouetteRgbaFrame(rgba, POSE_ANALYSIS_WIDTH, POSE_ANALYSIS_HEIGHT);
    return { preset, rgba, result };
  }, [activePresetId]);

  const usingLiveCamera = isAnalyzing && cameraActive;
  const activeResult = usingLiveCamera && cameraAnalysis ? cameraAnalysis : simulationData.result;

  // Real-time 200ms-throttled RAF analysis loop when camera is active and analysis is enabled
  useEffect(() => {
    if (!isAnalyzing || !cameraActive) {
      return;
    }

    let cancelled = false;
    let rafId = 0;
    let lastAnalyzedAt = -ANALYSIS_INTERVAL_MS;

    const tick = (timestamp: number) => {
      if (cancelled) return;
      if (timestamp - lastAnalyzedAt >= ANALYSIS_INTERVAL_MS) {
        lastAnalyzedAt = timestamp;
        const video = videoRef?.current;
        if (video) {
          if (!scratchCanvasRef.current && typeof document !== 'undefined') {
            scratchCanvasRef.current = document.createElement('canvas');
          }
          const analyzed = analyzeVideoFrameToPose(video, scratchCanvasRef.current ?? undefined);
          if (analyzed && !cancelled) {
            setCameraAnalysis(analyzed);
          }
        }
      }
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
    };
  }, [isAnalyzing, cameraActive, videoRef]);

  // Draw landmarks onto inline preview canvas and optional parent camera overlay canvas
  useEffect(() => {
    const silhouetteCanvas = silhouetteCanvasRef.current;
    if (silhouetteCanvas) {
      if (!usingLiveCamera) {
        paintRgbaSilhouettePreview(
          silhouetteCanvas,
          simulationData.rgba,
          POSE_ANALYSIS_WIDTH,
          POSE_ANALYSIS_HEIGHT,
        );
      } else {
        const sCtx = getSafe2DContext(silhouetteCanvas);
        sCtx?.clearRect(0, 0, silhouetteCanvas.width, silhouetteCanvas.height);
      }
    }

    const previewCanvas = previewOverlayCanvasRef.current;
    if (previewCanvas) {
      const pCtx = getSafe2DContext(previewCanvas);
      if (pCtx && typeof pCtx.beginPath === 'function') {
        drawPoseLandmarksOnCanvas(
          pCtx,
          previewCanvas.width,
          previewCanvas.height,
          activeResult.landmarks,
          activeResult.metrics,
        );
      }
    }

    const externalOverlay = overlayCanvasRef?.current ?? null;
    if (externalOverlay) {
      const extCtx = getSafe2DContext(externalOverlay);
      if (extCtx) {
        const width = externalOverlay.width > 0 ? externalOverlay.width : 320;
        const height = externalOverlay.height > 0 ? externalOverlay.height : 240;
        if (usingLiveCamera && typeof extCtx.beginPath === 'function') {
          drawPoseLandmarksOnCanvas(
            extCtx,
            width,
            height,
            activeResult.landmarks,
            activeResult.metrics,
          );
        } else if (typeof extCtx.clearRect === 'function') {
          extCtx.clearRect(0, 0, width, height);
        }
      }
    }

    return () => {
      if (externalOverlay && usingLiveCamera) {
        const extCtx = getSafe2DContext(externalOverlay);
        extCtx?.clearRect(0, 0, externalOverlay.width || 320, externalOverlay.height || 240);
      }
    };
  }, [activeResult, overlayCanvasRef, simulationData.rgba, usingLiveCamera]);

  const handleToggleAnalysis = () => {
    setIsAnalyzing((prev) => {
      if (prev) {
        setCameraAnalysis(null);
      }
      return !prev;
    });
  };

  const handleSelectSimulation = (presetId: PoseSimulationPresetId) => {
    setActivePresetId(presetId);
    setIsAnalyzing(false);
    setCameraAnalysis(null);
  };

  const modeBadgeLabel = usingLiveCamera
    ? '실시간 카메라 분석 중'
    : isAnalyzing
      ? '카메라 연결 대기'
      : `시뮬레이션 · ${simulationData.preset.labelKo}`;

  const { metrics } = activeResult;
  const visibleCues = metrics.coachingCuesKo.slice(0, 2);

  return (
    <section
      className="pacv-panel"
      aria-label="온디바이스 골격·좌우 균형 정렬 분석기"
      data-analysis-mode={usingLiveCamera ? 'camera' : 'simulation'}
    >
      <header className="pacv-header">
        <div className="pacv-header-text">
          <h3 className="pacv-title">
            실시간 골격·균형 정렬 참고{exerciseNameKo ? ` · ${exerciseNameKo}` : ''}
          </h3>
          <p className="pacv-subtitle">
            어깨·골반 수평과 중심선을 기기 안에서 바로 추정해 수업 큐를 도와요.
          </p>
        </div>
        <span className="pacv-mode-badge" data-active={usingLiveCamera ? 'true' : 'false'}>
          <Activity size={14} aria-hidden="true" />
          <span>{modeBadgeLabel}</span>
        </span>
      </header>

      <div className="pacv-controls">
        <button
          type="button"
          className="pacv-toggle-btn"
          aria-pressed={isAnalyzing}
          onClick={handleToggleAnalysis}
        >
          <ScanLine size={16} aria-hidden="true" />
          <span>{isAnalyzing ? '실시간 골격·균형 분석 끄기' : '실시간 골격·균형 분석 켜기'}</span>
        </button>

        {isAnalyzing && !cameraActive && (
          <p className="pacv-notice" role="status" aria-live="polite">
            카메라가 꺼져 있어 시뮬레이션 기준으로 표시 중이에요. 카메라를 켜면 실시간 영상을 기기
            안에서 바로 분석해요.
          </p>
        )}

        <div className="pacv-sim-block">
          <p className="pacv-sim-label">정렬 시뮬레이션 (카메라 없이 바로 체험)</p>
          <div className="pacv-sim-group" role="group" aria-label="정렬 시뮬레이션">
            {POSE_SIMULATION_PRESETS.map((preset) => {
              const isSelected = !usingLiveCamera && activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  className="pacv-sim-btn"
                  aria-pressed={isSelected}
                  onClick={() => handleSelectSimulation(preset.id)}
                >
                  {preset.labelKo}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="pacv-visual-row">
        <div className="pacv-preview-stage" aria-label="골격 랜드마크 정렬 미리보기">
          <canvas
            ref={silhouetteCanvasRef}
            width={PREVIEW_CANVAS_WIDTH}
            height={PREVIEW_CANVAS_HEIGHT}
            className="pacv-preview-canvas"
            aria-hidden="true"
          />
          <canvas
            ref={previewOverlayCanvasRef}
            width={PREVIEW_CANVAS_WIDTH}
            height={PREVIEW_CANVAS_HEIGHT}
            className="pacv-preview-canvas"
            role="img"
            aria-label={`골격 정렬 가이드 · ${metrics.statusLabelKo}`}
          />
        </div>

        <div className="pacv-summary-block">
          <div className="pacv-score-row">
            <span className="pacv-score-label">정렬 참고 점수</span>
            <span className="pacv-score-value pacv-num" data-testid="pacv-balance-score">
              {metrics.balanceScore}점
            </span>
          </div>
          <span
            className="pacv-status-pill"
            data-level={metrics.statusLevel}
            role="status"
            aria-live="polite"
          >
            {metrics.statusLabelKo}
          </span>
        </div>
      </div>

      {/* 3 Real-Time Metric Cards (tabular-nums) */}
      <dl className="pacv-metrics-grid" aria-label="실시간 정렬 수치">
        <div className="pacv-metric-cell" data-testid="pacv-metric-shoulder">
          <dt className="pacv-metric-label">어깨 수평</dt>
          <dd className="pacv-metric-value pacv-num">{formatSignedDeg(metrics.shoulderTiltDeg)}</dd>
          <dd className="pacv-metric-direction">
            {formatTiltDirectionKo(metrics.shoulderTiltDeg)}
          </dd>
        </div>

        <div className="pacv-metric-cell" data-testid="pacv-metric-pelvis">
          <dt className="pacv-metric-label">골반 수평</dt>
          <dd className="pacv-metric-value pacv-num">{formatSignedDeg(metrics.pelvisTiltDeg)}</dd>
          <dd className="pacv-metric-direction">{formatTiltDirectionKo(metrics.pelvisTiltDeg)}</dd>
        </div>

        <div className="pacv-metric-cell" data-testid="pacv-metric-midline">
          <dt className="pacv-metric-label">중심선 균형</dt>
          <dd className="pacv-metric-value pacv-num">{formatSignedPct(metrics.midlineOffsetPct)}</dd>
          <dd className="pacv-metric-direction">
            {formatMidlineDirectionKo(metrics.midlineOffsetPct)}
          </dd>
        </div>
      </dl>

      {/* Non-Medical Coaching Cues (Max 2 Lines) */}
      <div className="pacv-cues-section" aria-label="수업용 정렬 코칭 큐">
        <h4 className="pacv-cues-heading">수업 티칭 큐</h4>
        <ul className="pacv-cues-list" data-testid="pacv-coaching-cues">
          {visibleCues.map((cue) => (
            <li key={cue} className="pacv-cue-item">
              {cue}
            </li>
          ))}
        </ul>
      </div>

      <footer className="pacv-footer">
        <p className="pacv-privacy-line">
          <ShieldCheck size={15} aria-hidden="true" />
          <span>{ON_DEVICE_PRIVACY_NOTICE_KO}</span>
        </p>
        <p className="pacv-disclaimer-line">{NON_MEDICAL_ALIGNMENT_DISCLAIMER_KO}</p>
      </footer>
    </section>
  );
}
