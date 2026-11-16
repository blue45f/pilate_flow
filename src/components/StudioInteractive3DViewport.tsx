import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  Camera,
  Check,
  Columns2,
  Compass,
  Download,
  Eye,
  FileCode2,
  FlipHorizontal2,
  Orbit,
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { FootbarState, HeadrestState, PilatesExercise } from '../types/pilates';
import { getExpandedMovementVisualBinding } from '../data/expandedMovementVisualBindings';
import { hasCatalogMotionIdentityMismatch } from '../data/movementVisualRigCatalog';
import { getStudioApparatusGlbAsset } from '../data/blenderStudioGlbManifest';
import { MotionSourceOnlyNotice } from './MotionSourceOnlyNotice';
import { UnmodeledMotionNotice } from './UnmodeledMotionNotice';
import { useMotionPlaybackEnvironment } from '../hooks/useMotionPlaybackEnvironment';
import { sampleStudioMotionCycle, STUDIO_MOTION_CYCLE_MS } from '../utils/studioMotionPlayback';
import { downloadBlenderSceneScript } from '../utils/blenderSceneScriptExporter';
import {
  renderRealtimeStudio3DFrame,
  STUDIO_3D_CAMERA_PRESETS,
  type Biomech3DTelemetry,
  type Studio3DHotspot,
  type Studio3DHotspotId,
  type Studio3DPropOverride,
  type Studio3DShaderPreset,
} from '../utils/realtimeStudio3dEngine';

export interface StudioInteractive3DViewportProps {
  readonly exercise: PilatesExercise;
  readonly compact?: boolean;
  readonly active?: boolean;
  readonly initialSpringOverride?: string;
  readonly onApplySpringToStep?: (springValue: string) => void;
}

const SHADER_MODES: readonly {
  readonly id: Studio3DShaderPreset;
  readonly labelKo: string;
}[] = [
  { id: 'studio-pbr', labelKo: '스튜디오 PBR' },
  { id: 'biomech-xray', labelKo: '해부학 X-Ray' },
  { id: 'clay-wire', labelKo: '클레이 와이어' },
  { id: 'game-arena', labelKo: '게임엔진 그리드' },
];

const SPRING_EXPERIMENT_OPTIONS: readonly { readonly value: string; readonly labelKo: string }[] = [
  { value: 'default', labelKo: '기본 권장 스프링' },
  { value: '2R 1B', labelKo: '빨강 2 + 파랑 1 (풋워크 강)' },
  { value: '1R 1B', labelKo: '빨강 1 + 파랑 1 (중간 지지)' },
  { value: '1R', labelKo: '빨강 1 (표준 컨트롤)' },
  { value: '1B 1Y', labelKo: '파랑 1 + 노랑 1 (코어 경량)' },
  { value: 'Bodyweight', labelKo: '무스프링 (맨몸 제어)' },
];

const FOOTBAR_EXPERIMENT_OPTIONS: readonly {
  readonly value: 'default' | FootbarState;
  readonly labelKo: string;
}[] = [
  { value: 'default', labelKo: '기본 풋바 높이' },
  { value: 'high', labelKo: '높게 (High)' },
  { value: 'mid', labelKo: '중간 (Mid)' },
  { value: 'low', labelKo: '낮게 (Low)' },
  { value: 'down', labelKo: '내림 (Down)' },
];

const HEADREST_EXPERIMENT_OPTIONS: readonly {
  readonly value: 'default' | HeadrestState;
  readonly labelKo: string;
}[] = [
  { value: 'default', labelKo: '기본 헤드레스트' },
  { value: 'flat', labelKo: '평평하게 (Flat · 브릿지 안전)' },
  { value: 'up', labelKo: '올림 (Up · 경추 지지)' },
];

const PROP_EXPERIMENT_OPTIONS: readonly {
  readonly value: Studio3DPropOverride;
  readonly labelKo: string;
}[] = [
  { value: 'default', labelKo: '기본 박스·소도구' },
  { value: 'none', labelKo: '소도구 없음' },
  { value: 'short-box', labelKo: '숏박스 장착' },
  { value: 'long-box', labelKo: '롱박스 장착' },
  { value: 'jumpboard', labelKo: '점프보드 장착' },
  { value: 'ring', labelKo: '써클링 (매직써클)' },
  { value: 'foam-roller', labelKo: '폼롤러' },
  { value: 'mini-ball', labelKo: '미니볼' },
];

const PHASE_JUMP_PRESETS: readonly {
  readonly id: string;
  readonly labelKo: string;
  readonly progress: number;
}[] = [
  { id: 'setup', labelKo: '시작 준비', progress: 0 },
  { id: 'peak', labelKo: '최대 정점', progress: 0.5 },
  { id: 'return', labelKo: '제어 복귀', progress: 0.85 },
];

const HOTSPOT_QUICK_TABS: readonly {
  readonly id: Studio3DHotspotId;
  readonly shortKo: string;
}[] = [
  { id: 'spine', shortKo: '척추·코어' },
  { id: 'hip', shortKo: '골반·고관절' },
  { id: 'knee', shortKo: '무릎·하체' },
  { id: 'shoulder', shortKo: '어깨·견갑' },
  { id: 'apparatus', shortKo: '기구·스프링' },
];

export const StudioInteractive3DViewport: React.FC<StudioInteractive3DViewportProps> = (props) => {
  const binding = getExpandedMovementVisualBinding(props.exercise);
  if (binding?.nativeMotionAvailable === false) {
    return (
      <MotionSourceOnlyNotice
        exerciseId={props.exercise.id}
        nameKo={props.exercise.nameKo}
        apparatus={props.exercise.apparatus}
        reasonKo={binding.reasonKo}
        sourceUrl={binding.sourceUrl}
      />
    );
  }
  if (hasCatalogMotionIdentityMismatch(props.exercise)) {
    return <UnmodeledMotionNotice exercise={props.exercise} />;
  }
  return <StudioInteractive3DViewportContent key={props.exercise.id} {...props} />;
};

const StudioInteractive3DViewportContent: React.FC<StudioInteractive3DViewportProps> = ({
  exercise,
  compact = false,
  initialSpringOverride,
  onApplySpringToStep,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef(0);
  const hotspotsRef = useRef<readonly Studio3DHotspot[]>([]);
  const telemetryRef = useRef<{
    springStretchPct: number;
    biomech?: Biomech3DTelemetry;
  }>({ springStretchPct: 0 });
  const [viewportVersion, invalidateViewport] = useReducer((version: number) => version + 1, 0);
  const dragRef = useRef<{
    active: boolean;
    moved: boolean;
    startX: number;
    startY: number;
    baseYaw: number;
    basePitch: number;
  }>({ active: false, moved: false, startX: 0, startY: 0, baseYaw: -34, basePitch: 21 });

  const [yawDeg, setYawDeg] = useState<number>(-34);
  const [pitchDeg, setPitchDeg] = useState<number>(21);
  const [zoom, setZoom] = useState<number>(1.04);
  const [activePresetId, setActivePresetId] = useState<string>('quarter');
  const [turntable, setTurntable] = useState<boolean>(false);
  const [shader, setShader] = useState<Studio3DShaderPreset>('studio-pbr');
  const [playing, setPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [speed, setSpeed] = useState<0.5 | 1>(1);

  // Interactive 3D Modeler Workbench Controls (calm sculptural default; overlays & lab on 1-tap demand)
  const [dualView, setDualView] = useState<boolean>(false);
  const [showBiomechOverlay, setShowBiomechOverlay] = useState<boolean>(false);
  const [mirrored, setMirrored] = useState<boolean>(false);
  const [setupLabOpen, setSetupLabOpen] = useState<boolean>(false);
  const [selectedHotspot, setSelectedHotspot] = useState<Studio3DHotspot | null>(null);
  const [springOverride, setSpringOverride] = useState<string>(() => {
    if (
      initialSpringOverride &&
      SPRING_EXPERIMENT_OPTIONS.some((opt) => opt.value === initialSpringOverride)
    ) {
      return initialSpringOverride;
    }
    return 'default';
  });
  const [footbarOverride, setFootbarOverride] = useState<'default' | FootbarState>('default');
  const [headrestOverride, setHeadrestOverride] = useState<'default' | HeadrestState>('default');
  const [propOverride, setPropOverride] = useState<Studio3DPropOverride>('default');
  const [exportNotice, setExportNotice] = useState<string>('');

  const suspend = useCallback(() => {
    setPlaying(false);
    setTurntable(false);
  }, []);
  const { canAnimate, reducedMotion } = useMotionPlaybackEnvironment(viewportRef, suspend);
  const phase = sampleStudioMotionCycle(progress);
  const glbAsset = getStudioApparatusGlbAsset(exercise.apparatus);

  useEffect(() => {
    if (!canAnimate || (!playing && !turntable)) return;
    let rafId = 0;
    let lastTs: number | null = null;

    const step = (now: number) => {
      if (document.hidden) return;
      const dt = lastTs === null ? 0 : Math.min(0.06, Math.max(0, now - lastTs) / 1000);
      lastTs = now;
      if (playing) {
        progressRef.current =
          (progressRef.current + (dt * 1000 * speed) / STUDIO_MOTION_CYCLE_MS) % 1;
        setProgress(progressRef.current);
      }
      if (turntable && !dragRef.current.active) {
        setYawDeg((prev) => {
          const next = prev + dt * 28;
          return next > 180 ? next - 360 : next;
        });
      }
      rafId = window.requestAnimationFrame(step);
    };
    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [playing, turntable, speed, canAnimate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => invalidateViewport();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    observer?.observe(canvas);
    window.addEventListener('resize', resize);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof canvas.getContext !== 'function') return;
    let ctx: CanvasRenderingContext2D | null;
    try {
      ctx = canvas.getContext('2d');
    } catch {
      return;
    }
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? Math.min(2.25, window.devicePixelRatio || 1) : 1;
    const cssW = canvas.clientWidth || 640;
    const cssH = canvas.clientHeight || 416;
    if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
    }
    ctx.save();
    ctx.scale(dpr, dpr);
    const frameResult = renderRealtimeStudio3DFrame({
      ctx,
      width: cssW,
      height: cssH,
      exercise,
      phaseT: phase.pose,
      yawDeg,
      pitchDeg,
      zoom,
      shader,
      mirrored,
      showBiomechOverlay,
      dualView,
      springOverride,
      footbarOverride,
      headrestOverride,
      propOverride,
      selectedHotspotId: selectedHotspot?.id ?? null,
    });
    hotspotsRef.current = frameResult.hotspots;
    telemetryRef.current = {
      springStretchPct: frameResult.springStretchPct,
      biomech: frameResult.biomechTelemetry,
    };
    ctx.restore();
  }, [
    exercise,
    phase.pose,
    yawDeg,
    pitchDeg,
    zoom,
    shader,
    mirrored,
    showBiomechOverlay,
    dualView,
    springOverride,
    footbarOverride,
    headrestOverride,
    propOverride,
    selectedHotspot,
    viewportVersion,
  ]);

  const jumpToProgress = (nextProgress: number) => {
    const clamped = Math.max(0, Math.min(1, Number(nextProgress.toFixed(2))));
    setPlaying(false);
    progressRef.current = clamped;
    setProgress(clamped);
  };

  const selectHotspotById = (id: Studio3DHotspotId) => {
    if (selectedHotspot?.id === id) {
      setSelectedHotspot(null);
      return;
    }
    const found = hotspotsRef.current.find((item) => item.id === id);
    if (found) {
      setSelectedHotspot(found);
      return;
    }
    const fallbackLabel = HOTSPOT_QUICK_TABS.find((t) => t.id === id)?.shortKo ?? '정렬 포인트';
    setSelectedHotspot({
      id,
      labelKo: fallbackLabel,
      metricKo: springOverride !== 'default' ? springOverride : (exercise.springs ?? '맨몸 정렬'),
      cueKo: exercise.cues[0] ?? '호흡과 함께 중심 정렬을 부드럽게 유지하세요.',
      x: 0,
      y: 0,
      pos3d: [0, 0, 0],
    });
  };

  const applyCameraPreset = (presetId: string) => {
    const found = STUDIO_3D_CAMERA_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setActivePresetId(found.id);
    setYawDeg(found.yawDeg);
    setPitchDeg(found.pitchDeg);
    setZoom(found.zoom);
    setTurntable(Boolean(found.autoTurntable) && canAnimate);
  };

  const handleCapturePng = () => {
    const canvas = canvasRef.current;
    if (!canvas || typeof canvas.toDataURL !== 'function') return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const anchor = document.createElement('a');
      anchor.href = dataUrl;
      anchor.download = `pilates-3d-${exercise.id}-${phase.id}.png`;
      anchor.click();
      setExportNotice('현재 3D 모델러 시점 스냅샷(PNG)을 저장했습니다.');
    } catch {
      setExportNotice('브라우저 보안 정책으로 스냅샷을 저장하지 못했습니다.');
    }
  };

  const activeLabCount =
    Number(shader !== 'studio-pbr') +
    Number(springOverride !== 'default') +
    Number(footbarOverride !== 'default') +
    Number(headrestOverride !== 'default') +
    Number(propOverride !== 'default');

  const hasCustomSetup = activeLabCount > 0 || mirrored;

  const resetCustomSetup = () => {
    setShader('studio-pbr');
    setSpringOverride('default');
    setFootbarOverride('default');
    setHeadrestOverride('default');
    setPropOverride('default');
    setMirrored(false);
    setExportNotice('화면 스타일과 기구·소도구 세팅을 기본값으로 되돌렸습니다.');
  };

  const primaryPresets = STUDIO_3D_CAMERA_PRESETS.filter((p) => p.id !== 'top' && p.id !== 'rear');
  const secondaryPresets = STUDIO_3D_CAMERA_PRESETS.filter(
    (p) => p.id === 'top' || p.id === 'rear',
  );

  return (
    <div
      ref={viewportRef}
      className={`pf-orbit3d-viewport ${compact ? 'is-compact' : ''} ${dualView ? 'is-dual-view' : ''}`.trim()}
      data-testid="studio-interactive-3d-viewport"
      data-shader-mode={shader}
      data-dual-view={String(dualView)}
      data-mirrored={String(mirrored)}
      data-motion-playing={playing && canAnimate}
      data-motion-phase={phase.id}
      aria-label={`${exercise.nameKo} 실시간 360도 3D 각도 조절 뷰포트`}
    >
      <div
        className="pf-orbit3d-canvas-wrap"
        tabIndex={0}
        aria-label="3D 뷰포트 조작 영역 (스페이스바 재생, 좌우 화살표 구간 이동, 관절 클릭 코칭 확인)"
        onKeyDown={(event) => {
          if (event.key === ' ') {
            event.preventDefault();
            if (canAnimate) setPlaying((p) => !p);
          } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            jumpToProgress((progressRef.current + 0.05) % 1.0001);
          } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            jumpToProgress(Math.max(0, progressRef.current - 0.05));
          } else if (event.key === 'Escape' && selectedHotspot) {
            event.preventDefault();
            setSelectedHotspot(null);
          }
        }}
      >
        <canvas
          ref={canvasRef}
          className="pf-orbit3d-canvas"
          onPointerDown={(event) => {
            dragRef.current = {
              active: true,
              moved: false,
              startX: event.clientX,
              startY: event.clientY,
              baseYaw: yawDeg,
              basePitch: pitchDeg,
            };
            event.currentTarget.setPointerCapture?.(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!dragRef.current.active) return;
            const dx = event.clientX - dragRef.current.startX;
            const dy = event.clientY - dragRef.current.startY;
            if (Math.hypot(dx, dy) >= 5) {
              dragRef.current.moved = true;
              setTurntable(false);
              setActivePresetId('custom');
            }
            if (!dragRef.current.moved) return;
            let nextYaw = dragRef.current.baseYaw + dx * 0.55;
            if (nextYaw > 180) nextYaw -= 360;
            if (nextYaw < -180) nextYaw += 360;
            const nextPitch = Math.max(-4, Math.min(80, dragRef.current.basePitch + dy * 0.42));
            setYawDeg(Math.round(nextYaw));
            setPitchDeg(Math.round(nextPitch));
          }}
          onPointerUp={(event) => {
            const wasTap = dragRef.current.active && !dragRef.current.moved;
            dragRef.current.active = false;
            if (!wasTap) return;
            const rect = event.currentTarget.getBoundingClientRect();
            const localX = event.clientX - rect.left;
            const localY = event.clientY - rect.top;
            let best: Studio3DHotspot | null = null;
            let bestDist = 42;
            for (const h of hotspotsRef.current) {
              const d = Math.hypot(h.x - localX, h.y - localY);
              if (d < bestDist) {
                bestDist = d;
                best = h;
              }
            }
            setSelectedHotspot((prev) => (best && prev?.id === best.id ? null : best));
          }}
          onPointerCancel={() => {
            dragRef.current.active = false;
          }}
          onWheel={(event) => {
            event.preventDefault();
            setZoom((prev) =>
              Number(Math.max(0.72, Math.min(1.65, prev - event.deltaY * 0.001)).toFixed(2)),
            );
          }}
        />
        {selectedHotspot && (
          <div
            className="pf-orbit3d-hotspot-card"
            data-testid="studio-3d-hotspot-card"
            role="status"
            aria-live="polite"
          >
            <div className="pf-orbit3d-hotspot-card__head">
              <strong>
                <Sparkles size={12} aria-hidden="true" /> {selectedHotspot.labelKo}
              </strong>
              <span className="pf-orbit3d-hotspot-card__metric">{selectedHotspot.metricKo}</span>
              <button
                type="button"
                className="pf-orbit3d-hotspot-card__close"
                aria-label="3D 포인트 코칭 닫기"
                onClick={() => setSelectedHotspot(null)}
              >
                <X size={13} aria-hidden="true" />
              </button>
            </div>
            <p className="pf-orbit3d-hotspot-card__cue">{selectedHotspot.cueKo}</p>
          </div>
        )}
        <div className="pf-orbit3d-hud-top">
          <span className="pf-orbit3d-badge is-emerald">
            <Orbit size={12} aria-hidden="true" /> 드래그 회전 · {Math.round(yawDeg)}° /{' '}
            {Math.round(pitchDeg)}°{mirrored ? ' · 반전' : ''}
          </span>
          <div
            className="pf-orbit3d-shader-pills"
            role="group"
            aria-label="3D 카메라 앵글 프리셋"
            data-testid="studio-3d-angle-presets"
          >
            {primaryPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`pf-orbit3d-shader-btn ${
                  activePresetId === preset.id ? 'is-active' : ''
                }`}
                aria-pressed={activePresetId === preset.id}
                onClick={() => applyCameraPreset(preset.id)}
              >
                {preset.labelKo}
              </button>
            ))}
          </div>
        </div>
        <div className="pf-orbit3d-zoom-controls" role="group" aria-label="3D 줌 조절">
          <button
            type="button"
            className="pf-orbit3d-icon-btn"
            aria-label="3D 화면 확대"
            onClick={() => setZoom((z) => Math.min(1.65, Number((z + 0.14).toFixed(2))))}
          >
            <ZoomIn size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="pf-orbit3d-icon-btn"
            aria-label="3D 화면 축소"
            onClick={() => setZoom((z) => Math.max(0.72, Number((z - 0.14).toFixed(2))))}
          >
            <ZoomOut size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="pf-orbit3d-icon-btn"
            aria-label="기본 스튜디오 35도 각도로 초기화"
            onClick={() => applyCameraPreset('quarter')}
          >
            <RotateCcw size={15} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="pf-orbit3d-toolbar">
        <div className="pf-orbit3d-scrubber-row">
          <button
            type="button"
            className="pf-orbit3d-play-btn"
            aria-label={playing ? '3D 모션 일시정지' : '3D 모션 재생'}
            disabled={!canAnimate}
            onClick={() => canAnimate && setPlaying((p) => !p)}
          >
            {playing ? (
              <Pause size={14} aria-hidden="true" />
            ) : (
              <Play size={14} aria-hidden="true" />
            )}
            <span>{playing ? '일시정지' : '모션 재생'}</span>
          </button>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(progress * 100)}
            aria-label="3D 동작 진행 구간 스크러버"
            aria-valuetext={`${Math.round(progress * 100)}퍼센트 · ${phase.label}`}
            className="pf-orbit3d-slider"
            onChange={(event) => {
              setPlaying(false);
              progressRef.current = Number(event.target.value) / 100;
              setProgress(progressRef.current);
            }}
          />
          <span className="pf-orbit3d-pct">
            {Math.round(progress * 100)}% · {phase.label}
          </span>
          <button
            type="button"
            className="pf-orbit3d-speed-btn"
            aria-label="모션 재생 배속 전환"
            onClick={() => setSpeed((s) => (s === 1 ? 0.5 : 1))}
          >
            {speed === 1 ? '1.0x' : '0.5x 슬로우'}
          </button>
        </div>

        <div
          className="pf-orbit3d-modeler-strip"
          role="group"
          aria-label="3D 모델러 정렬·세팅 도구"
          data-testid="studio-3d-modeler-tools"
        >
          <button
            type="button"
            className={`pf-orbit3d-tool-chip ${dualView ? 'is-active' : ''}`}
            aria-pressed={dualView}
            onClick={() => setDualView((v) => !v)}
          >
            <Columns2 size={13} aria-hidden="true" /> 듀얼 정렬 비교
          </button>
          <button
            type="button"
            className={`pf-orbit3d-tool-chip ${showBiomechOverlay ? 'is-active' : ''}`}
            aria-pressed={showBiomechOverlay}
            onClick={() => setShowBiomechOverlay((v) => !v)}
          >
            <Compass size={13} aria-hidden="true" /> 관절 각도·CoM
          </button>
          <button
            type="button"
            className={`pf-orbit3d-tool-chip ${mirrored ? 'is-active' : ''}`}
            aria-pressed={mirrored}
            onClick={() => setMirrored((v) => !v)}
          >
            <FlipHorizontal2 size={13} aria-hidden="true" /> 좌·우 반전
          </button>
          <button
            type="button"
            className={`pf-orbit3d-tool-chip ${setupLabOpen || activeLabCount > 0 ? 'is-active' : ''}`}
            aria-label="기구·소도구 세팅 실험"
            aria-expanded={setupLabOpen}
            onClick={() => setSetupLabOpen((v) => !v)}
          >
            <SlidersHorizontal size={13} aria-hidden="true" />
            <span>기구·소도구 세팅 실험</span>
            {activeLabCount > 0 && (
              <span className="pf-orbit3d-active-pill" aria-hidden="true">
                {activeLabCount}
              </span>
            )}
          </button>
        </div>

        {setupLabOpen && (
          <div
            className="pf-orbit3d-setup-lab"
            data-testid="studio-3d-setup-lab"
            role="region"
            aria-label="실시간 3D 기구·스프링·소도구 시뮬레이터"
          >
            <div className="pf-orbit3d-lab-style-bar">
              <div
                className="pf-orbit3d-presets"
                role="group"
                aria-label="구간 빠른 이동 및 관절 코칭 선택"
              >
                {PHASE_JUMP_PRESETS.map((pj) => (
                  <button
                    key={pj.id}
                    type="button"
                    className={`pf-orbit3d-preset-chip ${
                      Math.abs(progress - pj.progress) < 0.06 ? 'is-active' : ''
                    }`}
                    onClick={() => jumpToProgress(pj.progress)}
                  >
                    {pj.labelKo}
                  </button>
                ))}
                {HOTSPOT_QUICK_TABS.map((ht) => (
                  <button
                    key={ht.id}
                    type="button"
                    className={`pf-orbit3d-preset-chip ${
                      selectedHotspot?.id === ht.id ? 'is-active' : ''
                    }`}
                    aria-pressed={selectedHotspot?.id === ht.id}
                    onClick={() => selectHotspotById(ht.id)}
                  >
                    {ht.shortKo} 코칭
                  </button>
                ))}
              </div>
              <div className="pf-orbit3d-presets" role="group" aria-label="3D 엔진 셰이더 선택">
                {SHADER_MODES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`pf-orbit3d-preset-chip ${shader === item.id ? 'is-active' : ''}`}
                    aria-pressed={shader === item.id}
                    onClick={() => setShader(item.id)}
                  >
                    <Eye size={12} aria-hidden="true" /> {item.labelKo}
                  </button>
                ))}
                {secondaryPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`pf-orbit3d-preset-chip ${
                      activePresetId === preset.id ? 'is-active' : ''
                    }`}
                    aria-pressed={activePresetId === preset.id}
                    onClick={() => applyCameraPreset(preset.id)}
                  >
                    {preset.labelKo}
                  </button>
                ))}
              </div>
            </div>
            <div className="pf-orbit3d-setup-grid">
              <label className="pf-orbit3d-setup-field">
                <span>스프링 조합</span>
                <select
                  aria-label="3D 스프링 조합 시뮬레이션"
                  value={springOverride}
                  onChange={(e) => setSpringOverride(e.target.value)}
                >
                  {SPRING_EXPERIMENT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.labelKo}
                    </option>
                  ))}
                </select>
              </label>
              {exercise.apparatus === 'reformer' && (
                <>
                  <label className="pf-orbit3d-setup-field">
                    <span>풋바 높이</span>
                    <select
                      aria-label="3D 풋바 높이 시뮬레이션"
                      value={footbarOverride}
                      onChange={(e) =>
                        setFootbarOverride(e.target.value as 'default' | FootbarState)
                      }
                    >
                      {FOOTBAR_EXPERIMENT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.labelKo}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="pf-orbit3d-setup-field">
                    <span>헤드레스트</span>
                    <select
                      aria-label="3D 헤드레스트 각도 시뮬레이션"
                      value={headrestOverride}
                      onChange={(e) =>
                        setHeadrestOverride(e.target.value as 'default' | HeadrestState)
                      }
                    >
                      {HEADREST_EXPERIMENT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.labelKo}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              <label className="pf-orbit3d-setup-field">
                <span>박스 · 소도구</span>
                <select
                  aria-label="3D 박스 및 소도구 장착 시뮬레이션"
                  value={propOverride}
                  onChange={(e) => setPropOverride(e.target.value as Studio3DPropOverride)}
                >
                  {PROP_EXPERIMENT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.labelKo}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="pf-orbit3d-export-row">
              <button type="button" className="pf-orbit3d-export-btn" onClick={handleCapturePng}>
                <Camera size={13} aria-hidden="true" /> PNG 스냅샷 저장
              </button>
              <button
                type="button"
                className="pf-orbit3d-export-btn"
                onClick={() => {
                  downloadBlenderSceneScript({
                    exerciseTitleKo: exercise.nameKo,
                    apparatus: exercise.apparatus,
                    bodyPosition: exercise.bodyPosition,
                    springsLabel: springOverride !== 'default' ? springOverride : exercise.springs,
                    activePhase:
                      phase.id === 'turn' ? 'peak' : phase.id === 'return' ? 'return' : 'setup',
                  });
                  setExportNotice('Blender 5.2 호환 3D 씬 스크립트(.py)를 내려받았습니다.');
                }}
              >
                <FileCode2 size={13} aria-hidden="true" /> Blender 5.2 스크립트(.py)
              </button>
              <a
                className="pf-orbit3d-export-btn"
                href={glbAsset.url}
                download={glbAsset.fileName}
                onClick={() => setExportNotice(`${glbAsset.labelKo} 파일을 내려받았습니다.`)}
              >
                <Download size={13} aria-hidden="true" /> {glbAsset.labelKo} (
                {Math.round(glbAsset.fileBytes / 1024)}KB)
              </a>
              {onApplySpringToStep && (
                <button
                  type="button"
                  className="pf-orbit3d-export-btn is-apply-step"
                  data-testid="apply-3d-spring-to-step"
                  onClick={() => {
                    const nextVal = springOverride === 'default' ? '' : springOverride;
                    onApplySpringToStep(nextVal);
                    setExportNotice(
                      nextVal
                        ? `이 동작 블록의 스프링을 '${nextVal}' 조합으로 반영했습니다.`
                        : '이 동작 블록의 스프링을 기본 권장값으로 되돌렸습니다.',
                    );
                  }}
                >
                  <Check size={13} aria-hidden="true" /> 현재 블록에 스프링 반영
                </button>
              )}
              {hasCustomSetup && (
                <button
                  type="button"
                  className="pf-orbit3d-export-btn is-reset"
                  onClick={resetCustomSetup}
                >
                  <RotateCcw size={13} aria-hidden="true" /> 기본 세팅 복원
                </button>
              )}
            </div>
            {exportNotice && (
              <p className="pf-orbit3d-export-notice" role="status" aria-live="polite">
                {exportNotice}
              </p>
            )}
          </div>
        )}
      </div>
      {reducedMotion && (
        <p role="status">동작 줄이기 설정 · 위치와 각도를 직접 선택해 살펴보세요.</p>
      )}
    </div>
  );
};
