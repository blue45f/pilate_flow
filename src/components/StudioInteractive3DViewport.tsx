import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Eye, Orbit, Pause, Play, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import type { PilatesExercise } from '../types/pilates';
import { getExpandedMovementVisualBinding } from '../data/expandedMovementVisualBindings';
import { hasCatalogMotionIdentityMismatch } from '../data/movementVisualRigCatalog';
import { MotionSourceOnlyNotice } from './MotionSourceOnlyNotice';
import { UnmodeledMotionNotice } from './UnmodeledMotionNotice';
import { useMotionPlaybackEnvironment } from '../hooks/useMotionPlaybackEnvironment';
import { sampleStudioMotionCycle, STUDIO_MOTION_CYCLE_MS } from '../utils/studioMotionPlayback';
import {
  renderRealtimeStudio3DFrame,
  STUDIO_3D_CAMERA_PRESETS,
  type Studio3DShaderPreset,
} from '../utils/realtimeStudio3dEngine';

export interface StudioInteractive3DViewportProps {
  readonly exercise: PilatesExercise;
  readonly compact?: boolean;
}

const SHADER_MODES: readonly {
  readonly id: Studio3DShaderPreset;
  readonly labelKo: string;
}[] = [
  { id: 'studio-pbr', labelKo: '스튜디오 PBR' },
  { id: 'biomech-xray', labelKo: '해부학 X-Ray' },
  { id: 'game-arena', labelKo: '게임엔진 그리드' },
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
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef(0);
  const [viewportVersion, invalidateViewport] = useReducer((version: number) => version + 1, 0);
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    baseYaw: number;
    basePitch: number;
  }>({ active: false, startX: 0, startY: 0, baseYaw: -34, basePitch: 21 });

  const [yawDeg, setYawDeg] = useState<number>(-34);
  const [pitchDeg, setPitchDeg] = useState<number>(21);
  const [zoom, setZoom] = useState<number>(1.04);
  const [activePresetId, setActivePresetId] = useState<string>('quarter');
  const [turntable, setTurntable] = useState<boolean>(false);
  const [shader, setShader] = useState<Studio3DShaderPreset>('studio-pbr');
  const [playing, setPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [speed, setSpeed] = useState<0.5 | 1>(1);
  const suspend = useCallback(() => {
    setPlaying(false);
    setTurntable(false);
  }, []);
  const { canAnimate, reducedMotion } = useMotionPlaybackEnvironment(viewportRef, suspend);
  const phase = sampleStudioMotionCycle(progress);

  useEffect(() => {
    if (!canAnimate || (!playing && !turntable)) return;
    let rafId = 0;
    let lastTs: number | null = null;

    const step = (now: number) => {
      if (document.hidden) return;
      const dt = lastTs === null ? 0 : Math.min(0.06, Math.max(0, now - lastTs) / 1000);
      lastTs = now;
      if (playing) {
        progressRef.current = (progressRef.current + (dt * 1000 * speed) / STUDIO_MOTION_CYCLE_MS) % 1;
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

    const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;
    const cssW = canvas.clientWidth || 640;
    const cssH = canvas.clientHeight || 416;
    if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
    }
    ctx.save();
    ctx.scale(dpr, dpr);
    renderRealtimeStudio3DFrame({
      ctx,
      width: cssW,
      height: cssH,
      exercise,
      phaseT: phase.pose,
      yawDeg,
      pitchDeg,
      zoom,
      shader,
    });
    ctx.restore();
  }, [exercise, phase.pose, yawDeg, pitchDeg, zoom, shader, viewportVersion]);

  const applyCameraPreset = (presetId: string) => {
    const found = STUDIO_3D_CAMERA_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setActivePresetId(found.id);
    setYawDeg(found.yawDeg);
    setPitchDeg(found.pitchDeg);
    setZoom(found.zoom);
    setTurntable(Boolean(found.autoTurntable) && canAnimate);
  };

  return (
    <div
      ref={viewportRef}
      className={`pf-orbit3d-viewport ${compact ? 'is-compact' : ''}`.trim()}
      data-testid="studio-interactive-3d-viewport"
      data-shader-mode={shader}
      data-motion-playing={playing && canAnimate}
      data-motion-phase={phase.id}
      aria-label={`${exercise.nameKo} 실시간 360도 3D 각도 조절 뷰포트`}
    >
      <div className="pf-orbit3d-canvas-wrap">
        <canvas
          ref={canvasRef}
          className="pf-orbit3d-canvas"
          onPointerDown={(event) => {
            dragRef.current = {
              active: true,
              startX: event.clientX,
              startY: event.clientY,
              baseYaw: yawDeg,
              basePitch: pitchDeg,
            };
            setTurntable(false);
            setActivePresetId('custom');
            event.currentTarget.setPointerCapture?.(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!dragRef.current.active) return;
            const dx = event.clientX - dragRef.current.startX;
            const dy = event.clientY - dragRef.current.startY;
            let nextYaw = dragRef.current.baseYaw + dx * 0.55;
            if (nextYaw > 180) nextYaw -= 360;
            if (nextYaw < -180) nextYaw += 360;
            const nextPitch = Math.max(-4, Math.min(80, dragRef.current.basePitch + dy * 0.42));
            setYawDeg(Math.round(nextYaw));
            setPitchDeg(Math.round(nextPitch));
          }}
          onPointerUp={() => {
            dragRef.current.active = false;
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
        <div className="pf-orbit3d-hud-top">
          <span className="pf-orbit3d-badge is-emerald">
            <Orbit size={12} aria-hidden="true" /> 드래그 회전 · 수평 {Math.round(yawDeg)}° / 부각{' '}
            {Math.round(pitchDeg)}°
          </span>
          <div className="pf-orbit3d-shader-pills" role="group" aria-label="3D 엔진 셰이더 선택">
            {SHADER_MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`pf-orbit3d-shader-btn ${shader === item.id ? 'is-active' : ''}`}
                aria-pressed={shader === item.id}
                onClick={() => setShader(item.id)}
              >
                <Eye size={11} aria-hidden="true" /> {item.labelKo}
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
            <ZoomIn size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="pf-orbit3d-icon-btn"
            aria-label="3D 화면 축소"
            onClick={() => setZoom((z) => Math.max(0.72, Number((z - 0.14).toFixed(2))))}
          >
            <ZoomOut size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="pf-orbit3d-icon-btn"
            aria-label="기본 스튜디오 35도 각도로 초기화"
            onClick={() => applyCameraPreset('quarter')}
          >
            <RotateCcw size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="pf-orbit3d-toolbar">
        <div
          className="pf-orbit3d-presets"
          role="group"
          aria-label="3D 카메라 앵글 프리셋"
          data-testid="studio-3d-angle-presets"
        >
          {STUDIO_3D_CAMERA_PRESETS.map((preset) => (
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

        <div className="pf-orbit3d-scrubber-row">
          <button
            type="button"
            className="pf-orbit3d-play-btn"
            aria-label={playing ? '3D 모션 일시정지' : '3D 모션 재생'}
            disabled={!canAnimate}
            onClick={() => canAnimate && setPlaying((p) => !p)}
          >
            {playing ? <Pause size={13} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />}
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
          <span className="pf-orbit3d-pct">{Math.round(progress * 100)}% · {phase.label}</span>
          <button
            type="button"
            className="pf-orbit3d-speed-btn"
            aria-label="모션 재생 배속 전환"
            onClick={() => setSpeed((s) => (s === 1 ? 0.5 : 1))}
          >
            {speed === 1 ? '1.0x' : '0.5x 슬로우'}
          </button>
        </div>
      </div>
      {reducedMotion && <p role="status">동작 줄이기 설정 · 위치와 각도를 직접 선택해 살펴보세요.</p>}
    </div>
  );
};
