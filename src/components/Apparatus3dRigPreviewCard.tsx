import React, { useMemo, useState } from 'react';
import { APPARATUS_LABELS, POSITION_LABELS } from '../data/pilatesCatalog';
import type { ApparatusType, BodyPosition } from '../types/pilates';
import {
  type RigCameraPreset,
  buildApparatus3dRigScene,
} from '../utils/apparatus3dRigProjection';

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

export const Apparatus3dRigPreviewCard: React.FC<Apparatus3dRigPreviewCardProps> = ({
  apparatus,
  bodyPosition,
  springsLabel,
  exerciseTitleKo,
}) => {
  const [cameraPreset, setCameraPreset] = useState<RigCameraPreset>('isometric');
  const [carriageOffset, setCarriageOffset] = useState<number>(0.3);

  const scene = useMemo(
    () =>
      buildApparatus3dRigScene({
        apparatus,
        bodyPosition,
        cameraPreset,
        carriageOffsetRatio: carriageOffset,
        springsLabel,
      }),
    [apparatus, bodyPosition, cameraPreset, carriageOffset, springsLabel],
  );

  const framePolygon = scene.frameVertices2D.map((pt) => `${pt.u},${pt.v}`).join(' ');
  const carriagePolygon = scene.carriageRect2D.map((pt) => `${pt.u},${pt.v}`).join(' ');

  return (
    <section
      className="pf-card"
      aria-label="3D 기구·스프링·무게중심(CoM) 뷰포트 시뮬레이터"
      data-testid="apparatus-3d-rig-preview"
      style={{ padding: '14px 16px', display: 'grid', gap: '10px' }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div>
          <strong style={{ fontSize: '14px', color: '#173d34' }}>
            3D 기구·스프링·무게중심(CoM) 투영 뷰포트
            {exerciseTitleKo ? ` · ${exerciseTitleKo}` : ''}
          </strong>
          <p className="muted" style={{ fontSize: '12px', margin: '2px 0 0' }}>
            {APPARATUS_LABELS[apparatus].ko} · {POSITION_LABELS[bodyPosition].ko} ·{' '}
            {scene.springVector2D.tensionLabel}
          </p>
        </div>
        <div role="group" aria-label="3D 카메라 시점 전환" style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {CAMERA_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="btn-secondary"
              aria-pressed={cameraPreset === preset.id}
              onClick={() => setCameraPreset(preset.id)}
              style={{
                minHeight: '30px',
                padding: '3px 9px',
                fontSize: '12px',
                fontWeight: cameraPreset === preset.id ? 700 : 500,
              }}
            >
              {preset.labelKo}
            </button>
          ))}
        </div>
      </div>

      <svg
        viewBox="0 0 320 180"
        role="img"
        aria-label={`${APPARATUS_LABELS[apparatus].ko} ${cameraPreset} 투영 도해`}
        style={{
          width: '100%',
          maxHeight: '180px',
          background: '#f7f9f7',
          borderRadius: '12px',
          border: '1px solid #d7e2dc',
        }}
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
        {/* Apparatus Outer Frame */}
        <polygon
          points={framePolygon}
          fill="rgba(23, 61, 52, 0.06)"
          stroke="#173d34"
          strokeWidth="2"
        />
        {/* Moving Carriage / Platform */}
        <polygon
          points={carriagePolygon}
          fill="rgba(20, 102, 94, 0.18)"
          stroke="#14665e"
          strokeWidth="2"
        />
        {/* Spring Resistance Vector */}
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
        {/* Practitioner Center of Mass (CoM) */}
        <circle
          cx={scene.centerOfMass2D.u}
          cy={scene.centerOfMass2D.v}
          r="7"
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

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '12px',
          color: '#35594e',
        }}
      >
        <span>캐리지·가동 범위 위치 ({Math.round(carriageOffset * 100)}%)</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={carriageOffset}
          onChange={(e) => setCarriageOffset(Number(e.target.value))}
          aria-label="캐리지 가동 범위 위치 조절"
          style={{ flex: 1 }}
        />
      </label>
    </section>
  );
};
