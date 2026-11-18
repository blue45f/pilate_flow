import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
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
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type {
  BoxState,
  FootbarState,
  HeadrestState,
  PilatesExercise,
  PropType,
} from '../types/pilates';
import { ExerciseMotionArtwork } from './ExerciseMotionArtwork';
import { getExpandedMovementVisualBinding } from '../data/expandedMovementVisualBindings';
import {
  hasDedicated3DExerciseRig,
  sampleUniversal3DExerciseRig,
} from '../data/universal3dExerciseRigs';
import {
  getStudioApparatusGlbAsset,
  STUDIO_PRACTITIONER_GLB_META,
} from '../data/blenderStudioGlbManifest';
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
import {
  createStudio3dResourceGuard,
  readAmbientDevice3dSignals,
  resolveAdaptive3dFrameBudget,
} from '../utils/studio3dResourceGuard';

export interface Studio3DSetupDraftPatch {
  readonly springOverride?: string;
  readonly footbarOverride?: FootbarState | null;
  readonly headrestOverride?: HeadrestState | null;
  readonly boxOverride?: BoxState | null;
  readonly propOverride?: PropType | null;
}

export interface StudioInteractive3DViewportProps {
  readonly exercise: PilatesExercise;
  readonly compact?: boolean;
  readonly active?: boolean;
  readonly initialSpringOverride?: string;
  readonly initialFootbarOverride?: FootbarState;
  readonly initialHeadrestOverride?: HeadrestState;
  readonly initialBoxOverride?: BoxState;
  readonly initialPropOverride?: PropType;
  readonly onApplySpringToStep?: (springValue: string) => void;
  readonly onApplySetupToStep?: (patch: Studio3DSetupDraftPatch) => void;
  /** Test/diagnostic hook to verify static fallback when 3D rendering fails. */
  readonly simulateRenderFailure?: boolean;
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
  { value: 'default', labelKo: '기존 스프링 표기' },
  { value: '2R 1B', labelKo: '빨강 2 + 파랑 1' },
  { value: '1R 1B', labelKo: '빨강 1 + 파랑 1' },
  { value: '1R', labelKo: '빨강 1' },
  { value: '1B 1Y', labelKo: '파랑 1 + 노랑 1' },
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

class Studio3DViewportErrorBoundary extends React.Component<
  { readonly exercise: PilatesExercise; readonly children: React.ReactNode },
  { readonly failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { readonly failed: boolean } {
    return { failed: true };
  }

  override render() {
    if (this.state.failed) {
      return (
        <div
          className="pf-orbit3d-static-fallback"
          role="region"
          aria-label="3D 뷰포트 정적 도해 폴백"
          data-testid="studio-3d-static-fallback"
        >
          <ExerciseMotionArtwork
            exercise={this.props.exercise}
            phase="middle"
            decorative={false}
          />
          <p className="flow-hint" role="status">
            3D 설명 패널을 불러오지 못해 정적 참조 도해를 표시합니다. 수업 작성과 진행은 그대로 계속할
            수 있습니다.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export const StudioInteractive3DViewport: React.FC<StudioInteractive3DViewportProps> = (props) => {
  const identityKey = `${props.exercise.id}:${props.exercise.apparatus}:${props.exercise.bodyPosition}`;
  return (
    <Studio3DViewportErrorBoundary key={identityKey} exercise={props.exercise}>
      <StudioInteractive3DViewportContent {...props} />
    </Studio3DViewportErrorBoundary>
  );
};

const StudioInteractive3DViewportContent: React.FC<StudioInteractive3DViewportProps> = ({
  exercise,
  compact = false,
  initialSpringOverride,
  initialFootbarOverride,
  initialHeadrestOverride,
  initialBoxOverride,
  initialPropOverride,
  onApplySpringToStep,
  onApplySetupToStep,
  simulateRenderFailure = false,
}) => {
  if (simulateRenderFailure) {
    throw new Error('Simulated 3D viewport render failure');
  }
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
  const [footbarOverride, setFootbarOverride] = useState<'default' | FootbarState>(() =>
    initialFootbarOverride && initialFootbarOverride !== 'none' ? initialFootbarOverride : 'default',
  );
  const [headrestOverride, setHeadrestOverride] = useState<'default' | HeadrestState>(() =>
    initialHeadrestOverride && initialHeadrestOverride !== 'down'
      ? initialHeadrestOverride
      : 'default',
  );
  const [propOverride, setPropOverride] = useState<Studio3DPropOverride>(() => {
    if (initialBoxOverride === 'short-box' || initialBoxOverride === 'long-box') {
      return initialBoxOverride;
    }
    if (initialPropOverride === 'magic-circle') return 'ring';
    if (initialPropOverride === 'foam-roller' || initialPropOverride === 'mini-ball') {
      return initialPropOverride;
    }
    if (initialPropOverride === 'none') return 'none';
    return 'default';
  });
  const [exportNotice, setExportNotice] = useState<string>('');

  const suspend = useCallback(() => {
    setPlaying(false);
    setTurntable(false);
  }, []);
  const { canAnimate, reducedMotion } = useMotionPlaybackEnvironment(viewportRef, suspend);
  const [visualProgress, setVisualProgress] = useState<number>(0);
  const visualProgressRef = useRef<number>(0);
  const phase = sampleStudioMotionCycle(progress);
  const visualPhase = sampleStudioMotionCycle(playing ? progress : visualProgress);
  const frameBudget = useMemo(
    () => resolveAdaptive3dFrameBudget(readAmbientDevice3dSignals()),
    [],
  );
  const resourceGuardRef = useRef<ReturnType<typeof createStudio3dResourceGuard> | null>(null);
  if (resourceGuardRef.current === null) {
    resourceGuardRef.current = createStudio3dResourceGuard();
  }
  const glbAsset = getStudioApparatusGlbAsset(exercise.apparatus);
  const binding = getExpandedMovementVisualBinding(exercise);
  const dedicated3d = hasDedicated3DExerciseRig(exercise);
  const rigMeta = sampleUniversal3DExerciseRig(exercise, phase.pose);

  useEffect(() => {
    const canvas = canvasRef.current;
    const guard = resourceGuardRef.current;
    if (!canvas || !guard) return;
    guard.track('viewport-canvas-backing', 'canvas-backing', {
      dispose: () => {
        canvas.width = 0;
        canvas.height = 0;
      },
    });
    const onContextLost = (event: Event) => {
      event.preventDefault();
      guard.notifyContextLost();
    };
    const onContextRestored = () => {
      guard.notifyContextRestored();
      invalidateViewport();
    };
    canvas.addEventListener('contextlost', onContextLost);
    canvas.addEventListener('contextrestored', onContextRestored);
    return () => {
      canvas.removeEventListener('contextlost', onContextLost);
      canvas.removeEventListener('contextrestored', onContextRestored);
      guard.disposeAll();
    };
  }, []);

  useEffect(() => {
    if (!canAnimate || (!playing && !turntable)) return;
    let rafId = 0;
    let lastTs: number | null = null;
    let lastCommitTs: number | null = null;

    const step = (now: number) => {
      if (document.hidden) return;
      if (
        frameBudget.tier === 'low-memory' &&
        lastCommitTs !== null &&
        now - lastCommitTs < frameBudget.frameIntervalMs - 1
      ) {
        rafId = window.requestAnimationFrame(step);
        return;
      }
      const dt = lastTs === null ? 0 : Math.min(0.06, Math.max(0, now - lastTs) / 1000);
      lastTs = now;
      lastCommitTs = now;
      if (playing) {
        progressRef.current =
          (progressRef.current + (dt * 1000 * speed) / STUDIO_MOTION_CYCLE_MS) % 1;
        visualProgressRef.current = progressRef.current;
        setProgress(progressRef.current);
        setVisualProgress(progressRef.current);
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
  }, [playing, turntable, speed, canAnimate, frameBudget.tier, frameBudget.frameIntervalMs]);

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
    if (!canvas) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      setZoom((prev) =>
        Number(Math.max(0.72, Math.min(1.65, prev - event.deltaY * 0.001)).toFixed(2)),
      );
    };
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof canvas.getContext !== 'function') return;
    if (
      typeof navigator !== 'undefined' &&
      /jsdom/i.test(navigator.userAgent) &&
      !('mock' in canvas.getContext)
    ) {
      return;
    }
    let ctx: CanvasRenderingContext2D | null;
    try {
      ctx = canvas.getContext('2d');
    } catch {
      return;
    }
    if (!ctx) return;

    const dpr =
      typeof window !== 'undefined'
        ? resolveAdaptive3dFrameBudget(readAmbientDevice3dSignals()).effectiveDpr
        : 1;
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
      phaseT: visualPhase.pose,
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
    visualPhase.pose,
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

  const tweenRafRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (tweenRafRef.current) window.cancelAnimationFrame(tweenRafRef.current);
    };
  }, []);

  const isJsdom = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);

  const jumpToProgress = (nextProgress: number) => {
    const clamped = Math.max(0, Math.min(1, Number(nextProgress.toFixed(2))));
    setPlaying(false);
    progressRef.current = clamped;
    setProgress(clamped);
    if (!canAnimate || reducedMotion || isJsdom || typeof window === 'undefined') {
      visualProgressRef.current = clamped;
      setVisualProgress(clamped);
      return;
    }
    if (tweenRafRef.current) window.cancelAnimationFrame(tweenRafRef.current);
    const startVal = visualProgressRef.current;
    if (Math.abs(clamped - startVal) < 0.01) {
      visualProgressRef.current = clamped;
      setVisualProgress(clamped);
      return;
    }
    let startTs: number | null = null;
    const durationMs = 280;
    const step = (now: number) => {
      if (startTs === null) startTs = now;
      const t = Math.min(1, Math.max(0, (now - startTs) / durationMs));
      const eased = 1 - Math.pow(1 - t, 4);
      const val = Number((startVal + (clamped - startVal) * eased).toFixed(3));
      visualProgressRef.current = val;
      setVisualProgress(val);
      if (t < 1) {
        tweenRafRef.current = window.requestAnimationFrame(step);
      } else {
        tweenRafRef.current = 0;
        visualProgressRef.current = clamped;
        setVisualProgress(clamped);
      }
    };
    tweenRafRef.current = window.requestAnimationFrame(step);
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
    const enableTurn = Boolean(found.autoTurntable) && canAnimate;
    setTurntable(enableTurn);
    if (!canAnimate || reducedMotion || enableTurn || isJsdom || typeof window === 'undefined') {
      setYawDeg(found.yawDeg);
      setPitchDeg(found.pitchDeg);
      setZoom(found.zoom);
      return;
    }
    if (tweenRafRef.current) window.cancelAnimationFrame(tweenRafRef.current);
    const startYaw = yawDeg;
    const startPitch = pitchDeg;
    const startZoom = zoom;
    let deltaYaw = found.yawDeg - startYaw;
    if (deltaYaw > 180) deltaYaw -= 360;
    if (deltaYaw < -180) deltaYaw += 360;
    const deltaPitch = found.pitchDeg - startPitch;
    const deltaZoom = found.zoom - startZoom;
    if (Math.hypot(deltaYaw, deltaPitch, deltaZoom * 50) < 0.5) {
      setYawDeg(found.yawDeg);
      setPitchDeg(found.pitchDeg);
      setZoom(found.zoom);
      return;
    }
    let startTs: number | null = null;
    const durationMs = 320;
    const step = (now: number) => {
      if (startTs === null) startTs = now;
      const t = Math.min(1, Math.max(0, (now - startTs) / durationMs));
      const eased = 1 - Math.pow(1 - t, 4);
      setYawDeg(Number((startYaw + deltaYaw * eased).toFixed(2)));
      setPitchDeg(Number((startPitch + deltaPitch * eased).toFixed(2)));
      setZoom(Number((startZoom + deltaZoom * eased).toFixed(3)));
      if (t < 1) {
        tweenRafRef.current = window.requestAnimationFrame(step);
      } else {
        tweenRafRef.current = 0;
        setYawDeg(found.yawDeg);
        setPitchDeg(found.pitchDeg);
        setZoom(found.zoom);
      }
    };
    tweenRafRef.current = window.requestAnimationFrame(step);
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
      data-exercise-id={exercise.id}
      data-shader-mode={shader}
      data-dual-view={String(dualView)}
      data-mirrored={String(mirrored)}
      data-motion-playing={playing && canAnimate}
      data-motion-phase={phase.id}
      data-frame-budget-tier={frameBudget.tier}
      data-target-fps={String(frameBudget.targetFps)}
      data-3d-rig-scope={dedicated3d ? 'dedicated-3d-rig' : 'procedural-3d-synthesis'}
      data-3d-pose-feature={rigMeta.poseFeatureKo}
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
        />
        {selectedHotspot && (
          <div
            className="pf-orbit3d-hotspot-card"
            data-testid="studio-3d-hotspot-card"
            role="status"
            aria-live="polite"
          >
            <div className="pf-orbit3d-hotspot-card__head">
              <strong>{selectedHotspot.labelKo}</strong>
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
              if (tweenRafRef.current) {
                window.cancelAnimationFrame(tweenRafRef.current);
                tweenRafRef.current = 0;
              }
              setPlaying(false);
              progressRef.current = Number(event.target.value) / 100;
              visualProgressRef.current = progressRef.current;
              setProgress(progressRef.current);
              setVisualProgress(progressRef.current);
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
          aria-label="3D 구간 빠른 이동 및 설명 도구"
          data-testid="studio-3d-modeler-tools"
        >
          {([
            { id: 'start', labelKo: '시작', target: 0 },
            { id: 'mid', labelKo: '중간', target: 0.5 },
            { id: 'end', labelKo: '끝', target: 0.85 },
          ] as const).map((phaseBtn) => (
            <button
              key={phaseBtn.id}
              type="button"
              className={`pf-orbit3d-tool-chip ${
                Math.abs(progress - phaseBtn.target) < 0.08 ? 'is-active' : ''
              }`}
              onClick={() => jumpToProgress(phaseBtn.target)}
            >
              {phaseBtn.labelKo}
            </button>
          ))}
          <button
            type="button"
            className="pf-orbit3d-tool-chip"
            onClick={() => applyCameraPreset('quarter')}
          >
            <RotateCcw size={13} aria-hidden="true" /> 시점 리셋
          </button>
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
            <Compass size={13} aria-hidden="true" /> 참고 각도 도해
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
              <a
                className="pf-orbit3d-export-btn"
                href={STUDIO_PRACTITIONER_GLB_META.url}
                download={STUDIO_PRACTITIONER_GLB_META.fileName}
                onClick={() =>
                  setExportNotice(`${STUDIO_PRACTITIONER_GLB_META.labelKo} 파일을 내려받았습니다.`)
                }
              >
                <Download size={13} aria-hidden="true" /> {STUDIO_PRACTITIONER_GLB_META.labelKo} (
                {Math.round(STUDIO_PRACTITIONER_GLB_META.fileBytes / 1024)}KB)
              </a>
              {(onApplySpringToStep || onApplySetupToStep) && (
                <button
                  type="button"
                  className="pf-orbit3d-export-btn is-apply-step"
                  data-testid="apply-3d-spring-to-step"
                  onClick={() => {
                    const nextVal = springOverride === 'default' ? '' : springOverride;
                    onApplySpringToStep?.(nextVal);
                    if (onApplySetupToStep) {
                      const mappedBox: BoxState | null =
                        propOverride === 'short-box'
                          ? 'short-box'
                          : propOverride === 'long-box'
                            ? 'long-box'
                            : propOverride === 'none'
                              ? 'none'
                              : null;
                      const mappedProp: PropType | null =
                        propOverride === 'ring'
                          ? 'magic-circle'
                          : propOverride === 'foam-roller'
                            ? 'foam-roller'
                            : propOverride === 'mini-ball'
                              ? 'mini-ball'
                              : propOverride === 'none'
                                ? 'none'
                                : null;
                      onApplySetupToStep({
                        springOverride: nextVal,
                        footbarOverride: footbarOverride === 'default' ? null : footbarOverride,
                        headrestOverride: headrestOverride === 'default' ? null : headrestOverride,
                        boxOverride: mappedBox,
                        propOverride: mappedProp,
                      });
                    }
                    setExportNotice(
                      nextVal || hasCustomSetup
                        ? '실험 세팅을 현재 편집 초안에 전달했습니다. 하단 ‘변경 적용’을 눌러야 수업에 저장됩니다.'
                        : '편집 초안의 세팅을 기본 권장값으로 되돌렸습니다. ‘변경 적용’을 눌러 확정하세요.',
                    );
                  }}
                >
                  <Check size={13} aria-hidden="true" /> 편집 초안에 세팅 전달
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
      {hasCustomSetup && (
        <p
          className="pf-orbit3d-preview-only-banner"
          role="status"
          data-testid="studio-3d-unapplied-badge"
        >
          미리보기 실험 중 (수업 원본 미적용) · 초안에 전달한 뒤 ‘변경 적용’을 눌러야 반영됩니다.
        </p>
      )}
      <p className="pf-orbit3d-provenance-note" data-testid="studio-3d-provenance-note">
        출처 수준: {dedicated3d ? '카탈로그 절차적 3D 참조 도해' : '자세 유형 기반 대표 3D 도해'} (정적
        이미지와 별개 · 외부 전문가 모션 검수 미완료) · 개인별 생체역학 측정, 의료적 교정, 통증 치료 효과를
        주장하지 않습니다.
      </p>
      {binding?.sourceUrl && (
        <div className="pf-orbit3d-source-row">
          <span className="pf-orbit3d-pose-summary">{rigMeta.poseFeatureKo}</span>
          <a
            href={binding.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="pf-orbit3d-source-link"
          >
            제작자 동작 영상 보기
          </a>
        </div>
      )}
      {reducedMotion && (
        <p role="status">동작 줄이기 설정 · 위치와 각도를 직접 선택해 살펴보세요.</p>
      )}
    </div>
  );
};
