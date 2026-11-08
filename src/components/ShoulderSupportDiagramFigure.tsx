/**
 * SPDX-License-Identifier: MIT
 * Standalone 2D SVG diagram components for Track I6 (Shoulder Support: Push Up & Leg Pull Front).
 * Renders the 2-Link IK upper-limb support chain, 3 biomechanical alignment lines
 * ('wrist-vertical-support', 'scapula-thoracic-support', 'shoulder-pelvis-ankle-plank-line'),
 * contact points, direction vectors, and truthful non-medical notices.
 */
import React, { useId, useState } from 'react';
import {
  SHOULDER_SUPPORT_DIAGRAM_CORRECTIONS,
  SHOULDER_SUPPORT_EXERCISE_TO_MOVEMENT_MAP,
  SHOULDER_SUPPORT_VISUAL_ASSETS,
  type ShoulderSupportTargetExerciseId,
} from '../data/shoulderSupportDiagrams';
import {
  getShoulderSupportDraftPose,
  type ShoulderSupportContinuousPhaseId,
  type ShoulderSupportDiscretePhaseId,
  type ShoulderSupportMovementId,
} from '../models/shoulderSupportDrafts';
import type { AnatomicalSide } from '../models/types';

export interface ShoulderSupportDiagramFigureProps {
  readonly movementId?: ShoulderSupportMovementId | ShoulderSupportTargetExerciseId;
  readonly phase?:
    | ShoulderSupportDiscretePhaseId
    | ShoulderSupportContinuousPhaseId
    | number;
  readonly activeSide?: AnatomicalSide;
  readonly mirrored?: boolean;
  readonly showSupportLines?: boolean;
  readonly showDirectionVectors?: boolean;
  readonly showContactPoints?: boolean;
  readonly showGhostStartPose?: boolean;
  readonly className?: string;
  readonly label?: string;
}

const fmt = (value: number): number => Number(value.toFixed(2));

function resolveMovementId(
  id: ShoulderSupportMovementId | ShoulderSupportTargetExerciseId,
): ShoulderSupportMovementId {
  if (id === 'shoulder-support-push-up' || id === 'shoulder-support-leg-pull-front') {
    return id;
  }
  return SHOULDER_SUPPORT_EXERCISE_TO_MOVEMENT_MAP[id] ?? 'shoulder-support-push-up';
}

export function ShoulderSupportDiagramFigure({
  movementId = 'shoulder-support-push-up',
  phase = 'middle',
  activeSide = 'right',
  mirrored = false,
  showSupportLines = true,
  showDirectionVectors = true,
  showContactPoints = true,
  showGhostStartPose = true,
  className = '',
  label,
}: ShoulderSupportDiagramFigureProps): React.JSX.Element {
  const uid = useId().replace(/:/g, '');
  const titleId = `ssdf-title-${uid}`;
  const descId = `ssdf-desc-${uid}`;
  const arrowId = `ssdf-arrow-${uid}`;

  const canonicalMovementId = resolveMovementId(movementId);
  const pose = getShoulderSupportDraftPose(canonicalMovementId, phase, {
    activeSide,
    mirrored,
  });
  const startPose = getShoulderSupportDraftPose(canonicalMovementId, 'start', {
    activeSide,
    mirrored,
  });
  const asset = SHOULDER_SUPPORT_VISUAL_ASSETS[canonicalMovementId];
  const phaseSpec = asset.phases[pose.discretePhase];

  const accessibleTitle =
    label ?? `${asset.nameKo} · ${phaseSpec.badgeKo} · ${phaseSpec.shortTitleKo}`;
  const accessibleDesc = `${phaseSpec.summaryKo} 호흡 큐: ${phaseSpec.breathCueKo}. 비의료 교육용 도해 (anatomicalAccuracyAssumed: false, professionalReviewCount: 0, sourceFrameMappings: 0).`;

  const j = pose.joints;
  const sj = startPose.joints;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 320 200"
      role="img"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className={`shoulder-support-diagram-figure ${className}`.trim()}
      data-testid="shoulder-support-diagram-figure"
      data-movement-id={pose.movementId}
      data-exercise-id={movementId}
      data-discrete-phase={pose.discretePhase}
      data-continuous-phase={pose.continuousPhase.id}
      data-progress={fmt(pose.progress)}
      data-model-version={pose.modelVersion}
      data-active-side={activeSide}
      data-view-mirrored={String(mirrored)}
      data-anatomical-accuracy-assumed="false"
      data-professional-review-count="0"
      data-source-frame-mappings="0"
      style={{
        width: '100%',
        height: 'auto',
        display: 'block',
        borderRadius: '12px',
      }}
    >
      <title id={titleId}>{accessibleTitle}</title>
      <desc id={descId}>{accessibleDesc}</desc>

      <defs>
        <marker
          id={arrowId}
          viewBox="0 0 10 10"
          refX={7}
          refY={5}
          markerWidth={5.5}
          markerHeight={5.5}
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#9a4220" />
        </marker>
      </defs>

      {/* Studio Background */}
      <rect
        x={0.5}
        y={0.5}
        width={319}
        height={199}
        rx={12}
        fill="#f7f5ef"
        stroke="#dfd8ca"
        strokeWidth={1}
      />

      {/* Mat Support Surface */}
      <g data-layer="mat-surface">
        <rect
          x={20}
          y={166}
          width={280}
          height={7}
          rx={3.5}
          fill="#c8d3c5"
          stroke="#567365"
          strokeWidth={1}
        />
        <line x1={12} y1={174} x2={308} y2={174} stroke="#d6cfc0" strokeWidth={1.2} />
      </g>

      {/* Start-Pose Ghost Silhouette when in middle/end */}
      {showGhostStartPose && pose.amount > 0.01 && (
        <g
          data-layer="start-pose-ghost"
          opacity={0.25}
          stroke="#365f50"
          strokeWidth={2.4}
          strokeDasharray="3 3"
          fill="none"
        >
          <polyline
            points={`${fmt(sj.head.x)},${fmt(sj.head.y)} ${fmt(sj.shoulder.x)},${fmt(sj.shoulder.y)} ${fmt(sj.pelvis.x)},${fmt(sj.pelvis.y)} ${fmt(sj.ankle.x)},${fmt(sj.ankle.y)}`}
          />
          <polyline
            points={`${fmt(sj.shoulder.x)},${fmt(sj.shoulder.y)} ${fmt(sj.elbow.x)},${fmt(sj.elbow.y)} ${fmt(sj.wrist.x)},${fmt(sj.wrist.y)}`}
          />
        </g>
      )}

      {/* 3 Biomechanical Support Alignment Lines */}
      {showSupportLines && (
        <g data-layer="support-alignment-lines">
          {pose.supportLines.map((line) => {
            const strokeColor =
              line.id === 'wrist-vertical-support'
                ? '#1f5c4d'
                : line.id === 'scapula-thoracic-support'
                  ? '#9a4220'
                  : '#5b7065';
            const dash =
              line.id === 'scapula-thoracic-support' ? undefined : '4 3';
            return (
              <g
                key={line.id}
                data-support-line={line.id}
                data-within-tolerance={String(line.withinTolerance)}
                data-deviation-m={fmt(line.deviationM)}
              >
                <line
                  x1={fmt(line.fromScreen.x)}
                  y1={fmt(line.fromScreen.y)}
                  x2={fmt(line.toScreen.x)}
                  y2={fmt(line.toScreen.y)}
                  stroke={strokeColor}
                  strokeWidth={line.id === 'scapula-thoracic-support' ? 2.4 : 1.5}
                  strokeDasharray={dash}
                />
              </g>
            );
          })}
        </g>
      )}

      {/* Far-Side Supporting Companion Limb (Dashed) */}
      {j.farKnee && j.farAnkle && j.farToe && (
        <g
          data-layer="far-support-limb"
          stroke="#875641"
          strokeWidth={3}
          strokeDasharray="5 3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          <polyline
            points={`${fmt(j.pelvis.x)},${fmt(j.pelvis.y)} ${fmt(j.farKnee.x)},${fmt(j.farKnee.y)} ${fmt(j.farAnkle.x)},${fmt(j.farAnkle.y)} ${fmt(j.farToe.x)},${fmt(j.farToe.y)}`}
          />
          {j.farShoulder && j.farElbow && j.farWrist && (
            <polyline
              points={`${fmt(j.farShoulder.x)},${fmt(j.farShoulder.y)} ${fmt(j.farElbow.x)},${fmt(j.farElbow.y)} ${fmt(j.farWrist.x)},${fmt(j.farWrist.y)}`}
            />
          )}
        </g>
      )}

      {/* Near-Side Primary Kinematic Chain */}
      <g
        data-layer="kinematic-body-chain"
        stroke="#244d44"
        strokeWidth={3.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        {/* Spine & Pelvis Plank Chain */}
        <polyline
          data-chain="plank-spine"
          points={`${fmt(j.head.x)},${fmt(j.head.y)} ${fmt(j.neck.x)},${fmt(j.neck.y)} ${fmt(j.shoulder.x)},${fmt(j.shoulder.y)} ${fmt(j.thoracic.x)},${fmt(j.thoracic.y)} ${fmt(j.lumbar.x)},${fmt(j.lumbar.y)} ${fmt(j.pelvis.x)},${fmt(j.pelvis.y)}`}
        />
        {/* Active Leg Chain */}
        <polyline
          data-chain="active-leg"
          points={`${fmt(j.hip.x)},${fmt(j.hip.y)} ${fmt(j.knee.x)},${fmt(j.knee.y)} ${fmt(j.ankle.x)},${fmt(j.ankle.y)} ${fmt(j.toe.x)},${fmt(j.toe.y)}`}
        />
        {/* Supporting Arm 2-Link IK Chain */}
        <polyline
          data-chain="support-arm-ik"
          points={`${fmt(j.shoulder.x)},${fmt(j.shoulder.y)} ${fmt(j.elbow.x)},${fmt(j.elbow.y)} ${fmt(j.wrist.x)},${fmt(j.wrist.y)} ${fmt(j.hand.x)},${fmt(j.hand.y)}`}
        />
      </g>

      {/* Head & Key Joint Nodes */}
      <g data-layer="joint-nodes">
        <circle
          data-joint="head"
          cx={fmt(j.head.x)}
          cy={fmt(j.head.y)}
          r={8}
          fill="#e6dec8"
          stroke="#244d44"
          strokeWidth={2}
        />
        {(['shoulder', 'elbow', 'wrist', 'thoracic', 'pelvis', 'knee', 'ankle'] as const).map(
          (jointKey) => {
            const pt = j[jointKey];
            return (
              <circle
                key={jointKey}
                data-joint={jointKey}
                cx={fmt(pt.x)}
                cy={fmt(pt.y)}
                r={jointKey === 'shoulder' || jointKey === 'pelvis' ? 3.8 : 3.2}
                fill="#fbfaf5"
                stroke={jointKey === 'elbow' ? '#9a4220' : '#244d44'}
                strokeWidth={1.8}
              />
            );
          },
        )}
      </g>

      {/* Contact Points */}
      {showContactPoints && (
        <g data-layer="contact-points">
          {pose.contactPoints.map((cp) => (
            <circle
              key={cp.id}
              data-contact-id={cp.id}
              data-contact-state={cp.state}
              cx={fmt(cp.screenPoint.x)}
              cy={fmt(cp.screenPoint.y)}
              r={4.2}
              fill={cp.state === 'lifted' ? '#fbfaf5' : '#c86d44'}
              stroke="#7c3619"
              strokeWidth={1.5}
            />
          ))}
        </g>
      )}

      {/* Movement Direction Vectors */}
      {showDirectionVectors && (
        <g data-layer="direction-vectors">
          {pose.directionVectors.map((vec) => {
            if (vec.points.length < 2) return null;
            const start = vec.points[0];
            const end = vec.points[vec.points.length - 1];
            return (
              <line
                key={vec.id}
                data-direction-vector={vec.id}
                x1={fmt(start.x)}
                y1={fmt(start.y)}
                x2={fmt(end.x)}
                y2={fmt(end.y)}
                stroke="#9a4220"
                strokeWidth={1.8}
                markerEnd={`url(#${arrowId})`}
              />
            );
          })}
        </g>
      )}

      {/* Compact Telemetry Caption */}
      <g fontFamily="Pretendard, system-ui, sans-serif" fontSize={8.5} fill="#254b3f">
        <text x={14} y={18} fontWeight={700}>
          {phaseSpec.shortTitleKo}
        </text>
        <text x={306} y={18} textAnchor="end" fill="#7c472f">
          주관절 {pose.jointAxes.elbowInteriorAngleDeg}° · 신전 {pose.jointAxes.hipExtensionLiftDeg}°
        </text>
      </g>
    </svg>
  );
}

export const ShoulderSupportDraftFigure = ShoulderSupportDiagramFigure;
export const ShoulderSupportPhaseDiagramSvg = ShoulderSupportDiagramFigure;

export interface ShoulderSupportTriptychDiagramProps {
  readonly movementId?: ShoulderSupportMovementId | ShoulderSupportTargetExerciseId;
  readonly initialPhase?: ShoulderSupportDiscretePhaseId;
  readonly activeSide?: AnatomicalSide;
  readonly mirrored?: boolean;
  readonly className?: string;
}

const DISCRETE_PHASES: readonly ShoulderSupportDiscretePhaseId[] = [
  'start',
  'middle',
  'end',
];

export function ShoulderSupportTriptychDiagram({
  movementId = 'shoulder-support-push-up',
  initialPhase = 'middle',
  activeSide = 'right',
  mirrored = false,
  className = '',
}: ShoulderSupportTriptychDiagramProps): React.JSX.Element {
  const [selectedPhase, setSelectedPhase] =
    useState<ShoulderSupportDiscretePhaseId>(initialPhase);
  const canonicalMovementId = resolveMovementId(movementId);
  const asset = SHOULDER_SUPPORT_VISUAL_ASSETS[canonicalMovementId];
  const correction = SHOULDER_SUPPORT_DIAGRAM_CORRECTIONS[canonicalMovementId];

  return (
    <section
      className={`shoulder-support-triptych-diagram ${className}`.trim()}
      data-testid="shoulder-support-triptych-diagram"
      data-movement-id={canonicalMovementId}
      aria-label={`${asset.nameKo} 3단계 정렬 도해`}
      style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
    >
      <header
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          borderRadius: '10px',
          background: '#f2eee4',
          border: '1px solid #dfd8ca',
        }}
      >
        <strong>{asset.nameKo}</strong>
        <span style={{ fontSize: '0.78rem', color: '#5b5349' }}>
          {asset.licenseLabelKo}
        </span>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '10px',
        }}
      >
        {DISCRETE_PHASES.map((phaseId, idx) => {
          const spec = asset.phases[phaseId];
          const isSelected = selectedPhase === phaseId;
          return (
            <div
              key={phaseId}
              data-triptych-phase-card={phaseId}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                padding: '8px',
                borderRadius: '12px',
                background: isSelected ? '#fcfaf5' : '#f5f1e8',
                border: isSelected ? '2px solid #244d44' : '1px solid #dfd8ca',
              }}
            >
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedPhase(phaseId)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid #244d44',
                  background: isSelected ? '#244d44' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#244d44',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                {idx + 1}. {spec.badgeKo} · {spec.shortTitleKo}
              </button>

              <ShoulderSupportDiagramFigure
                movementId={canonicalMovementId}
                phase={phaseId}
                activeSide={activeSide}
                mirrored={mirrored}
              />

              <p style={{ margin: 0, fontSize: '0.76rem', color: '#3f4f49' }}>
                {spec.summaryKo}
              </p>
            </div>
          );
        })}
      </div>

      <footer
        style={{
          fontSize: '0.75rem',
          color: '#5a5248',
          padding: '8px 12px',
          borderRadius: '10px',
          background: '#f8f5ed',
          border: '1px solid #e5dec9',
        }}
      >
        <p style={{ margin: '0 0 4px 0' }}>{correction.reviewedScopeKo}</p>
        <p style={{ margin: 0 }}>{correction.limitationKo}</p>
      </footer>
    </section>
  );
}

export function ShoulderSupportIntegrationDemo(): React.JSX.Element {
  return (
    <div
      data-testid="shoulder-support-integration-demo"
      style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
    >
      <ShoulderSupportTriptychDiagram movementId="shoulder-support-push-up" />
      <ShoulderSupportTriptychDiagram movementId="shoulder-support-leg-pull-front" />
    </div>
  );
}

