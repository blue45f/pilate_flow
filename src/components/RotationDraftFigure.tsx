/**
 * SPDX-License-Identifier: CC0-1.0 OR MIT
 * Track I8 Dedicated 2D Rotation Schematic SVG & Phase Triptych (`RotationDraftFigure`, `RotationPhaseTriptych`).
 * Renders `data-rotation-axis`, `data-pelvis-anchor`, `data-gaze-vector`, `data-ribcage-scapula`, and `data-transition-pose`
 * with explicit truthfulness and provenance disclosures (`anatomicalAccuracyAssumed: false`, `professionalReviewCount: 0`, `sourceFrameMappings: 0`).
 */

import React, { useId, useState } from 'react';
import type { VisualPhaseId } from '../data/movementVisualRigCatalog';
import {
  getRotationDiagramCorrection,
  getRotationVisualAsset,
} from '../data/rotationDiagramData';
import {
  getRotationDiscretePose,
  getRotationDraftPose,
  resolveRotationMovementId,
  type RotationCatalogAliasId,
  type RotationMovementId,
} from '../models/rotationDrafts';
import type { AnatomicalSide } from '../models/types';

export interface RotationDraftFigureProps {
  readonly movementId?: RotationCatalogAliasId | string;
  readonly draftId?: RotationCatalogAliasId | string;
  readonly phase?: VisualPhaseId;
  readonly progress?: number;
  readonly activeSide?: AnatomicalSide;
  readonly mirrored?: boolean;
  readonly showProvenance?: boolean;
  readonly compact?: boolean;
  readonly className?: string;
  readonly label?: string;
}

export interface RotationPhaseTriptychProps {
  readonly movementId: RotationCatalogAliasId | string;
  readonly activePhase?: VisualPhaseId;
  readonly selectedPhase?: VisualPhaseId;
  readonly onSelectPhase?: (phase: VisualPhaseId) => void;
  readonly activeSide?: AnatomicalSide;
  readonly mirrored?: boolean;
  readonly showProvenance?: boolean;
  readonly className?: string;
}

const PHASE_ORDER: readonly VisualPhaseId[] = ['start', 'middle', 'end'] as const;

const PHASE_BUTTON_LABELS: Readonly<Record<VisualPhaseId, string>> = Object.freeze({
  start: '시작 자세 (준비·정렬)',
  middle: '중간 자세 (최대 회전·정점)',
  end: '끝·전환 자세 (재적층·복귀)',
});

export function RotationDraftFigure({
  movementId,
  draftId,
  phase = 'middle',
  progress,
  activeSide = 'right',
  mirrored = false,
  showProvenance = false,
  compact = false,
  className,
  label,
}: RotationDraftFigureProps): React.JSX.Element {
  const uid = useId();
  const titleId = `${uid}-rotation-title`;
  const descId = `${uid}-rotation-desc`;
  const arrowMarkerId = `${uid}-gaze-arrow`;

  const rawId = movementId ?? draftId ?? 'rotation-mat-spine-twist';
  const resolvedId: RotationMovementId =
    resolveRotationMovementId(rawId) ?? 'rotation-mat-spine-twist';

  const pose =
    typeof progress === 'number'
      ? getRotationDraftPose(resolvedId, progress, { activeSide, mirrored })
      : getRotationDiscretePose(resolvedId, phase, { activeSide, mirrored });

  const asset = getRotationVisualAsset(rawId);
  const correction = getRotationDiagramCorrection(rawId);
  const { joints2D: j, indicators, telemetry } = pose;

  const farShoulder = j.farShoulder ?? j.shoulder;
  const farElbow = j.farElbow ?? j.elbow;
  const farWrist = j.farWrist ?? j.wrist;
  const farHip = j.farHip ?? j.hip;
  const farKnee = j.farKnee ?? j.knee;
  const farAnkle = j.farAnkle ?? j.ankle;
  const farToe = j.farToe ?? j.toe;

  const svgTitle =
    label ??
    `${asset.nameKo} · ${pose.phase.labelKo} · 2D 축회전 투영 도해 (해부학 미검증 · 전문가 검토 0)`;

  return (
    <figure
      className={className ? `rotation-draft-figure ${className}` : 'rotation-draft-figure'}
      data-rotation-movement-id={resolvedId}
      data-visual-phase={pose.visualPhaseId}
      data-anatomical-accuracy-assumed="false"
      data-professional-review-count="0"
      data-source-frame-mappings="0"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 320 200"
        role="img"
        aria-labelledby={titleId}
        aria-describedby={descId}
        data-motion-draft-id={resolvedId}
        data-phase-id={pose.visualPhaseId}
        data-progress={pose.progress}
        data-active-side={activeSide}
        data-view-mirrored={mirrored}
        data-model-version={pose.modelVersion}
        data-yaw-deg={telemetry.yawDeg}
        data-pelvis-shift-mm={telemetry.pelvisShiftMm}
        data-shoulder-span-2d={telemetry.shoulderSpan2D}
        data-rest-shoulder-span={telemetry.restShoulderSpan}
      >
        <title id={titleId}>{svgTitle}</title>
        <desc id={descId}>
          {asset.phases[pose.visualPhaseId].summaryKo} · 골반 변위 {telemetry.pelvisShiftMm}mm ·
          흉곽 회전 {telemetry.yawDeg}° · 2D 어깨 폭 {telemetry.shoulderSpan2D}px (정면 기준{' '}
          {telemetry.restShoulderSpan}px) · 해부학적 실측 아님(anatomicalAccuracyAssumed: false,
          professionalReviewCount: 0, sourceFrameMappings: 0).
        </desc>

        <defs>
          <marker
            id={arrowMarkerId}
            viewBox="0 0 10 10"
            refX="7"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 9 5 L 0 9 z" fill="#b85d2b" />
          </marker>
        </defs>

        {/* Background & Mat Support Baseline */}
        <rect x={0} y={0} width={320} height={200} rx={12} fill="#f7f5ef" />
        <line
          x1={18}
          y1={154}
          x2={302}
          y2={154}
          stroke="#b8c4b6"
          strokeWidth={3}
          strokeLinecap="round"
        />

        {/* 1) data-pelvis-anchor: Stationary sit-bone / sacrum / heel lock indicator */}
        <g
          data-pelvis-anchor={indicators.pelvisAnchor.kind}
          data-pelvis-shift-mm={telemetry.pelvisShiftMm}
          data-heel-alignment-delta-mm={telemetry.heelAlignmentDeltaMm}
        >
          <line
            x1={indicators.pelvisAnchor.leftAnchor.x}
            y1={indicators.pelvisAnchor.leftAnchor.y}
            x2={indicators.pelvisAnchor.rightAnchor.x}
            y2={indicators.pelvisAnchor.rightAnchor.y}
            stroke="#2b6a58"
            strokeWidth={3}
          />
          <circle
            cx={indicators.pelvisAnchor.leftAnchor.x}
            cy={indicators.pelvisAnchor.leftAnchor.y}
            r={3.6}
            fill="#f1d993"
            stroke="#2b6a58"
            strokeWidth={1.5}
          />
          <circle
            cx={indicators.pelvisAnchor.rightAnchor.x}
            cy={indicators.pelvisAnchor.rightAnchor.y}
            r={3.6}
            fill="#f1d993"
            stroke="#2b6a58"
            strokeWidth={1.5}
          />
          <circle
            cx={indicators.pelvisAnchor.heelAnchor.x}
            cy={indicators.pelvisAnchor.heelAnchor.y}
            r={3.2}
            fill="#f1d993"
            stroke="#2b6a58"
            strokeWidth={1.4}
          />
        </g>

        {/* 2) data-rotation-axis: Plumb / hinge / oblique curl rotation axis */}
        <g
          data-rotation-axis={indicators.rotationAxis.kind}
          data-yaw-deg={telemetry.yawDeg}
          data-flexion-pitch-deg={telemetry.flexionPitchDeg}
        >
          <line
            x1={indicators.rotationAxis.from.x}
            y1={indicators.rotationAxis.from.y}
            x2={indicators.rotationAxis.to.x}
            y2={indicators.rotationAxis.to.y}
            stroke="#254d45"
            strokeWidth={1.8}
            strokeDasharray="4 3"
          />
          <ellipse
            cx={j.thoracic.x}
            cy={j.thoracic.y}
            rx={Math.max(8, Math.round(telemetry.shoulderSpan2D * 0.35))}
            ry={6}
            fill="rgba(43, 106, 88, 0.12)"
            stroke="#2b6a58"
            strokeWidth={1.2}
          />
        </g>

        {/* Far-side lower & upper limbs */}
        <g data-anatomical-side="left" opacity={0.82}>
          <polyline
            points={`${farHip.x},${farHip.y} ${farKnee.x},${farKnee.y} ${farAnkle.x},${farAnkle.y} ${farToe.x},${farToe.y}`}
            fill="none"
            stroke="#6f8f80"
            strokeWidth={4.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={`${farShoulder.x},${farShoulder.y} ${farElbow.x},${farElbow.y} ${farWrist.x},${farWrist.y}`}
            fill="none"
            stroke="#7d9689"
            strokeWidth={3.6}
            strokeDasharray="3 2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Spine chain & 3) data-ribcage-scapula bilateral shoulder span foreshortening */}
        <g
          data-ribcage-scapula="coronal-foreshortening"
          data-shoulder-span-2d={telemetry.shoulderSpan2D}
          data-rest-shoulder-span={telemetry.restShoulderSpan}
          data-foreshortening-ratio={telemetry.foreshorteningRatio}
          data-elbow-span-deg={telemetry.elbowSpanDeg}
        >
          <polyline
            points={`${j.pelvis.x},${j.pelvis.y} ${j.lumbar.x},${j.lumbar.y} ${j.thoracic.x},${j.thoracic.y} ${j.neck.x},${j.neck.y} ${j.head.x},${j.head.y}`}
            fill="none"
            stroke="#254d45"
            strokeWidth={4.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line
            x1={farShoulder.x}
            y1={farShoulder.y}
            x2={j.shoulder.x}
            y2={j.shoulder.y}
            stroke="#c86d44"
            strokeWidth={3.2}
            strokeLinecap="round"
          />
          <circle cx={farShoulder.x} cy={farShoulder.y} r={3.2} fill="#e8b89a" stroke="#8a4b2d" />
          <circle cx={j.shoulder.x} cy={j.shoulder.y} r={3.5} fill="#c86d44" stroke="#6e361c" />
        </g>

        {/* Near-side lower & upper limbs */}
        <g data-anatomical-side="right">
          <polyline
            points={`${j.hip.x},${j.hip.y} ${j.knee.x},${j.knee.y} ${j.ankle.x},${j.ankle.y} ${j.heel.x},${j.heel.y} ${j.toe.x},${j.toe.y}`}
            fill="none"
            stroke="#2f5c4f"
            strokeWidth={4.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={`${j.shoulder.x},${j.shoulder.y} ${j.elbow.x},${j.elbow.y} ${j.wrist.x},${j.wrist.y} ${j.hand.x},${j.hand.y}`}
            fill="none"
            stroke="#c86d44"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Head & 4) data-gaze-vector sternum-coupled gaze vector */}
        <circle
          cx={j.head.x}
          cy={j.head.y}
          r={8}
          fill="#e6c4aa"
          stroke="#6e4730"
          strokeWidth={1.6}
        />
        <g
          data-gaze-vector="sternum-coupled"
          data-gaze-sternum-coupling-deg={telemetry.gazeSternumCouplingDeg}
        >
          <line
            x1={indicators.gazeVector.from.x}
            y1={indicators.gazeVector.from.y}
            x2={indicators.gazeVector.to.x}
            y2={indicators.gazeVector.to.y}
            stroke="#b85d2b"
            strokeWidth={1.8}
            markerEnd={`url(#${arrowMarkerId})`}
          />
        </g>

        {/* 5) data-transition-pose: restack / unwind / center switch path */}
        <g data-transition-pose={pose.phase.id}>
          <polyline
            points={indicators.transitionPose.trajectoryPoints
              .map((pt) => `${pt.x},${pt.y}`)
              .join(' ')}
            fill="none"
            stroke="#8c6d32"
            strokeWidth={1.4}
            strokeDasharray="2 2"
          />
        </g>

        {/* Compact telemetry overlay */}
        {!compact && (
          <g fontFamily="system-ui, sans-serif" fontSize={8.2} fill="#254d45">
            <text x={12} y={16} fontWeight={700}>
              {asset.nameKo} · {PHASE_BUTTON_LABELS[pose.visualPhaseId]}
            </text>
            <text x={12} y={28} fill="#5c6b62">
              회전각 {telemetry.yawDeg}° · 2D 어깨폭 {telemetry.shoulderSpan2D}px /{' '}
              {telemetry.restShoulderSpan}px · 좌골변위 {telemetry.pelvisShiftMm}mm
            </text>
            <text x={12} y={191} fontSize={7.3} fill="#6b6a65">
              해부학 미검증(anatomicalAccuracyAssumed: false) · 전문가 검토 0 · 프레임 매핑 0
            </text>
          </g>
        )}
      </svg>

      {showProvenance && (
        <figcaption className="rotation-draft-provenance" data-rotation-provenance="true">
          <p>{ indicators.rotationAxis.labelKo } · { indicators.pelvisAnchor.labelKo }</p>
          <p>
            비의료·비임상 참고 도해: <code>anatomicalAccuracyAssumed: false</code>,{' '}
            <code>professionalReviewCount: 0</code>, <code>sourceFrameMappings: 0</code>.
          </p>
          {correction && (
            <ul>
              {correction.sources.map((src) => (
                <li key={src.url}>
                  <a href={src.url} target="_blank" rel="noopener noreferrer">
                    {src.title}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </figcaption>
      )}
    </figure>
  );
}

export function RotationPhaseTriptych({
  movementId,
  activePhase,
  selectedPhase,
  onSelectPhase,
  activeSide = 'right',
  mirrored = false,
  showProvenance = true,
  className,
}: RotationPhaseTriptychProps): React.JSX.Element {
  const initialPhase = selectedPhase ?? activePhase ?? 'middle';
  const [internalPhase, setInternalPhase] = useState<VisualPhaseId>(initialPhase);
  const isControlled =
    typeof onSelectPhase === 'function' &&
    (selectedPhase !== undefined || activePhase !== undefined);
  const currentPhase = isControlled ? (selectedPhase ?? activePhase ?? internalPhase) : internalPhase;

  const asset = getRotationVisualAsset(movementId);
  const correction = getRotationDiagramCorrection(movementId);

  const handlePhaseSelect = (nextPhase: VisualPhaseId) => {
    setInternalPhase(nextPhase);
    onSelectPhase?.(nextPhase);
  };

  return (
    <section
      className={className ? `rotation-phase-triptych ${className}` : 'rotation-phase-triptych'}
      aria-label={`${asset.nameKo} 3단계 회전 도해`}
      data-rotation-triptych-id={asset.exerciseId}
    >
      <div
        className="rotation-phase-selector"
        role="group"
        aria-label="회전 동작 단계 선택"
      >
        {PHASE_ORDER.map((phaseId) => {
          const isSelected = currentPhase === phaseId;
          return (
            <button
              key={phaseId}
              type="button"
              data-phase-select={phaseId}
              aria-pressed={isSelected}
              onClick={() => handlePhaseSelect(phaseId)}
            >
              {PHASE_BUTTON_LABELS[phaseId]}
            </button>
          );
        })}
      </div>

      <div className="rotation-phase-triptych-grid">
        {PHASE_ORDER.map((phaseId) => (
          <div
            key={phaseId}
            className="rotation-phase-triptych-cell"
            data-triptych-phase={phaseId}
            data-triptych-active={currentPhase === phaseId}
          >
            <RotationDraftFigure
              movementId={movementId}
              phase={phaseId}
              activeSide={activeSide}
              mirrored={mirrored}
              showProvenance={false}
            />
            <p className="rotation-phase-summary">{asset.phases[phaseId].summaryKo}</p>
          </div>
        ))}
      </div>

      {showProvenance && (
        <aside className="rotation-triptych-truthfulness" aria-label="출처 및 비임상 고지">
          <p>
            본 2D 축회전 도해는 클린룸 수식 모델(<code>CC0-1.0 OR MIT</code>)이며 해부학적 실측이나
            임상·전문가 검증을 거치지 않았습니다 (<code>anatomicalAccuracyAssumed: false</code>,{' '}
            <code>professionalReviewCount: 0</code>, <code>sourceFrameMappings: 0</code>).
          </p>
          {correction && (
            <p>
              출처 대조: {correction.reviewedScopeKo} ({correction.correctionKo})
            </p>
          )}
        </aside>
      )}
    </section>
  );
}
