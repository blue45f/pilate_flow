import React, { useEffect, useId, useMemo, useState } from 'react';
import { APPARATUS_LABELS, POSITION_LABELS } from '../data/pilatesCatalog';
import { PfButton } from '../design-system';
import type { ApparatusType, BodyPosition } from '../types/pilates';
import {
  PHASE_CARRIAGE_RATIOS,
  type RigCameraPreset,
  type RigMotionPhase,
  buildApparatus3dRigScene,
} from '../utils/apparatus3dRigProjection';
import { generateBlenderApparatusSceneScript } from '../utils/blenderSceneScriptExporter';
import { getApparatusStudio3dImage } from '../utils/memberBookingBridge';

export interface Apparatus3dRigPreviewCardProps {
  readonly apparatus: ApparatusType;
  readonly bodyPosition: BodyPosition;
  readonly springsLabel?: string;
  readonly exerciseTitleKo?: string;
}

const CAMERA_PRESETS: ReadonlyArray<{ id: RigCameraPreset; labelKo: string }> = [
  { id: 'isometric', labelKo: '3D 등각(Iso)' },
  { id: 'sagittal', labelKo: '시상면(Side)' },
  { id: 'coronal', labelKo: '관상면(Front)' },
  { id: 'transverse', labelKo: '수평면(Top)' },
];

const MOTION_PHASES: ReadonlyArray<{ id: RigMotionPhase; labelKo: string }> = [
  { id: 'setup', labelKo: '1 시작(Setup)' },
  { id: 'peak', labelKo: '2 정점(Peak)' },
  { id: 'return', labelKo: '3 복귀(Return)' },
];

function prefersReducedMotionNow(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export const Apparatus3dRigPreviewCard: React.FC<Apparatus3dRigPreviewCardProps> = ({
  apparatus,
  bodyPosition,
  springsLabel,
  exerciseTitleKo,
}) => {
  const [cameraPreset, setCameraPreset] = useState<RigCameraPreset>('isometric');
  const [phase, setPhase] = useState<RigMotionPhase>('setup');
  const [carriageOffset, setCarriageOffset] = useState<number>(PHASE_CARRIAGE_RATIOS.setup);
  const [autoPlay, setAutoPlay] = useState<boolean>(false);
  const [showStudio3dRender, setShowStudio3dRender] = useState<boolean>(true);
  const [showBlenderScript, setShowBlenderScript] = useState<boolean>(false);
  const [reducedMotion, setReducedMotion] = useState<boolean>(prefersReducedMotionNow);
  const blenderScriptId = useId();
  const carriageSliderId = useId();

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => {
      const reduced = mql.matches;
      setReducedMotion(reduced);
      if (reduced) {
        setAutoPlay(false);
      }
    };
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handleChange);
      return () => mql.removeEventListener('change', handleChange);
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (!autoPlay || reducedMotion) return;
    const order: RigMotionPhase[] = ['setup', 'peak', 'return'];
    const timer = window.setInterval(() => {
      setPhase((prev) => {
        const next = order[(order.indexOf(prev) + 1) % order.length]!;
        setCarriageOffset(PHASE_CARRIAGE_RATIOS[next]);
        return next;
      });
    }, 1100);
    return () => window.clearInterval(timer);
  }, [autoPlay, reducedMotion]);

  const scene = useMemo(
    () =>
      buildApparatus3dRigScene({
        apparatus,
        bodyPosition,
        cameraPreset,
        phase,
        carriageOffsetRatio: carriageOffset,
        springsLabel,
      }),
    [apparatus, bodyPosition, cameraPreset, phase, carriageOffset, springsLabel],
  );

  const blenderScript = useMemo(
    () =>
      generateBlenderApparatusSceneScript({
        exerciseTitleKo: exerciseTitleKo ?? 'Pilates_Movement',
        apparatus,
        bodyPosition,
        springsLabel,
        activePhase: phase,
      }),
    [exerciseTitleKo, apparatus, bodyPosition, springsLabel, phase],
  );

  const framePolygon = scene.frameVertices2D.map((pt) => `${pt.u},${pt.v}`).join(' ');
  const carriagePolygon = scene.carriageRect2D.map((pt) => `${pt.u},${pt.v}`).join(' ');
  const skeletonPolyline = [
    scene.jointChain2D.head,
    scene.jointChain2D.shoulder,
    scene.jointChain2D.pelvis,
    scene.jointChain2D.knee,
    scene.jointChain2D.ankle,
  ]
    .map((pt) => `${pt.u},${pt.v}`)
    .join(' ');

  return (
    <section
      className="pf-card pf-rig-preview"
      aria-label="3D 기구·스프링·무게중심(CoM) 뷰포트 시뮬레이터"
      data-testid="apparatus-3d-rig-preview"
    >
      <div className="pf-rig-preview__header">
        <div className="pf-rig-preview__copy">
          <strong className="pf-rig-preview__title">
            3D 기구·관절 체인·무게중심(CoM) 투영 뷰포트
            {exerciseTitleKo ? ` · ${exerciseTitleKo}` : ''}
          </strong>
          <p className="pf-rig-preview__meta">
            {APPARATUS_LABELS[apparatus].ko} · {POSITION_LABELS[bodyPosition].ko} ·{' '}
            {scene.springVector2D.tensionLabel}
          </p>
        </div>
        <div
          role="group"
          aria-label="3D 카메라 시점 전환"
          className="pf-rig-preview__camera-group"
        >
          {CAMERA_PRESETS.map((preset) => (
            <PfButton
              key={preset.id}
              variant="secondary"
              className="pf-rig-preview__btn"
              pressed={cameraPreset === preset.id}
              onClick={() => setCameraPreset(preset.id)}
            >
              {preset.labelKo}
            </PfButton>
          ))}
        </div>
      </div>

      <div
        role="group"
        aria-label="3페이즈 키프레임 전환"
        className="pf-rig-preview__phase-bar"
      >
        <div className="pf-rig-preview__phase-group">
          {MOTION_PHASES.map((item) => (
            <PfButton
              key={item.id}
              variant="secondary"
              className="pf-rig-preview__btn"
              pressed={phase === item.id}
              onClick={() => {
                setAutoPlay(false);
                setPhase(item.id);
                setCarriageOffset(PHASE_CARRIAGE_RATIOS[item.id]);
              }}
            >
              {item.labelKo}
            </PfButton>
          ))}
        </div>
        <div className="pf-rig-preview__utility-group">
          <PfButton
            variant="secondary"
            className="pf-rig-preview__btn"
            pressed={showStudio3dRender}
            onClick={() => setShowStudio3dRender((v) => !v)}
          >
            {showStudio3dRender ? '3D 스튜디오 렌더 숨기기' : '3D 스튜디오 렌더 보기'}
          </PfButton>
          <PfButton
            variant="secondary"
            className="pf-rig-preview__btn"
            pressed={autoPlay && !reducedMotion}
            onClick={() => {
              if (reducedMotion) {
                const order: RigMotionPhase[] = ['setup', 'peak', 'return'];
                const next = order[(order.indexOf(phase) + 1) % order.length]!;
                setPhase(next);
                setCarriageOffset(PHASE_CARRIAGE_RATIOS[next]);
                return;
              }
              setAutoPlay((v) => !v);
            }}
          >
            {autoPlay && !reducedMotion ? '3페이즈 자동 재생 중지' : '3페이즈 연속 재생'}
          </PfButton>
          <PfButton
            variant="secondary"
            className="pf-rig-preview__btn"
            aria-expanded={showBlenderScript}
            aria-controls={blenderScriptId}
            onClick={() => setShowBlenderScript((v) => !v)}
          >
            {showBlenderScript ? 'Blender 스크립트 닫기' : 'Blender 3D 스크립트(.py)'}
          </PfButton>
        </div>
      </div>

      {showStudio3dRender && (
        <div className="pf-rig-3d-render-frame" data-testid="blender-studio-3d-render">
          <img
            src={getApparatusStudio3dImage(apparatus)}
            alt={`${APPARATUS_LABELS[apparatus].ko} Blender 3D 스튜디오 렌더링`}
            loading="lazy"
          />
        </div>
      )}

      <svg
        viewBox="0 0 320 180"
        role="img"
        aria-label={`${APPARATUS_LABELS[apparatus].ko} ${cameraPreset} 투영 도해`}
        className="pf-rig-preview__svg"
      >
        <defs>
          <marker
            id="spring-arrow-head"
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="4"
            orient="auto"
          >
            <path d="M0,0 L8,4 L0,8 Z" fill="#d97706" />
          </marker>
        </defs>
        <polygon
          points={framePolygon}
          fill="rgba(23, 61, 52, 0.06)"
          stroke="#173d34"
          strokeWidth="2"
        />
        <polygon
          points={carriagePolygon}
          fill="rgba(20, 102, 94, 0.18)"
          stroke="#14665e"
          strokeWidth="2"
        />
        <line
          x1={scene.springVector2D.origin.u}
          y1={scene.springVector2D.origin.v}
          x2={scene.springVector2D.target.u}
          y2={scene.springVector2D.target.v}
          stroke="#d97706"
          strokeWidth="2.5"
          strokeDasharray="4 2"
          markerEnd="url(#spring-arrow-head)"
        />
        <polyline
          points={skeletonPolyline}
          fill="none"
          stroke="#0f5132"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={scene.jointChain2D.head.u}
          cy={scene.jointChain2D.head.v}
          r="5"
          fill="#ffffff"
          stroke="#0f5132"
          strokeWidth="2"
        />
        <circle
          cx={scene.centerOfMass2D.u}
          cy={scene.centerOfMass2D.v}
          r="6.5"
          fill="#173d34"
          stroke="#ffffff"
          strokeWidth="2"
        />
        <text
          x={scene.centerOfMass2D.u + 10}
          y={scene.centerOfMass2D.v + 4}
          fontSize="11"
          fontWeight="600"
          fill="#173d34"
        >
          CoM ({POSITION_LABELS[bodyPosition].ko})
        </text>
      </svg>

      {showBlenderScript && (
        <pre
          id={blenderScriptId}
          role="region"
          aria-label="Blender 4.x Python 3D 씬 스크립트"
          tabIndex={0}
          data-testid="blender-scene-script-preview"
          className="pf-rig-preview__script-pre"
        >
          {blenderScript}
        </pre>
      )}

      <div className="pf-rig-preview__slider-row">
        <label htmlFor={carriageSliderId} className="pf-rig-preview__slider-label">
          캐리지·가동 범위 위치 ({Math.round(carriageOffset * 100)}%)
        </label>
        <input
          id={carriageSliderId}
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={carriageOffset}
          onChange={(e) => {
            setAutoPlay(false);
            setCarriageOffset(Number(e.target.value));
          }}
          aria-label="캐리지 가동 범위 위치 조절"
          className="pf-rig-preview__slider-input"
        />
      </div>
    </section>
  );
};
