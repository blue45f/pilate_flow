import React from 'react';
import type { VisualPhaseId } from '../data/movementVisualRigCatalog';
import {
  EXTENSION_DIAGRAM_AUDIT_RECORDS,
  EXTENSION_DIAGRAM_CORRECTIONS,
  EXTENSION_MEDICAL_AND_REVIEW_POLICY,
  EXTENSION_PUBLIC_SOURCES,
  type ExtensionMovementId,
} from '../data/extensionDiagramSources';
import { EXTENSION_MOVEMENT_SPECS } from '../data/extensionMovementData';
import {
  buildHyperextendedLumbarCounterExample,
  evaluateExtensionPhasePose,
  verifyExtensionPhaseAlignment,
  type ExtensionPhaseSpec,
} from '../models/extensionMovementModel';
import { MovementPhaseDiagramSvg } from './MovementPhaseDiagramSvg';

export interface ExtensionMovementDiagramProps {
  readonly movementId: ExtensionMovementId;
  readonly phase?: VisualPhaseId;
  readonly progress?: number;
  readonly activeSide?: 'left' | 'right';
  readonly mirrored?: boolean;
  readonly showCounterExample?: boolean;
  readonly showAlignment?: boolean;
  readonly showDirection?: boolean;
  readonly showMuscles?: boolean;
  readonly showGhostStartPose?: boolean;
  readonly showDisclosures?: boolean;
  readonly compact?: boolean;
  readonly className?: string;
}

export interface ExtensionMovementTriptychProps {
  readonly movementId: ExtensionMovementId;
  readonly selectedPhase?: VisualPhaseId;
  readonly onSelectPhase?: (phase: VisualPhaseId) => void;
  readonly activeSide?: 'left' | 'right';
  readonly mirrored?: boolean;
  readonly showCounterExample?: boolean;
  readonly className?: string;
}

const PHASES: readonly VisualPhaseId[] = ['start', 'middle', 'end'];

function renderSupportSurfaceOverlay(
  phasePose: ExtensionPhaseSpec,
): React.JSX.Element {
  const { supportSurface, apparatusState } = phasePose;
  const shift = apparatusState.carriageOffsetPx;

  if (supportSurface === 'reformer-box') {
    const boxX = 76 + shift;
    return (
      <g
        data-extension-support-surface="reformer-box"
        data-carriage-offset={shift}
        aria-label="리포머 롱박스 지지면 (y=116)"
      >
        <rect
          x={boxX}
          y={116}
          width={142}
          height={26}
          rx={4}
          fill="#5a766b"
          fillOpacity={0.32}
          stroke="#26473d"
          strokeWidth={1.6}
          data-reformer-long-box="true"
        />
        <line
          x1={boxX}
          y1={116}
          x2={boxX + 142}
          y2={116}
          stroke="#1c3f36"
          strokeWidth={2.2}
        />
      </g>
    );
  }

  if (supportSurface === 'ladder-barrel') {
    return (
      <g
        data-extension-support-surface="ladder-barrel"
        aria-label="래더 바렐 돔 정점(132,104) 및 래더 가로대(228,132)"
      >
        <circle
          cx={132}
          cy={104}
          r={4}
          fill="#2b6a58"
          stroke="#f7f5ef"
          strokeWidth={1.4}
          data-barrel-apex-anchor="true"
        />
        <circle
          cx={228}
          cy={132}
          r={4}
          fill="#8a7254"
          stroke="#f7f5ef"
          strokeWidth={1.4}
          data-ladder-rung-anchor="true"
        />
      </g>
    );
  }

  if (supportSurface === 'cadillac-table') {
    return (
      <g
        data-extension-support-surface="cadillac-table"
        data-carriage-offset={0}
        aria-label="캐딜락 고정 테이블 베드 (y=142)"
      >
        <line
          x1={26}
          y1={142}
          x2={294}
          y2={142}
          stroke="#2f564b"
          strokeWidth={2}
          strokeDasharray="5 3"
          data-cadillac-bed-line="true"
        />
      </g>
    );
  }

  return (
    <g
      data-extension-support-surface="mat"
      aria-label="필라테스 매트 지지면 (y=144)"
    >
      <line
        x1={24}
        y1={144}
        x2={296}
        y2={144}
        stroke="#2f564b"
        strokeWidth={1.8}
        strokeDasharray="4 3"
        data-mat-surface-line="true"
      />
    </g>
  );
}

export function ExtensionMovementDiagram({
  movementId,
  phase = 'middle',
  progress,
  activeSide = 'right',
  mirrored = false,
  showCounterExample = false,
  showAlignment = true,
  showDirection = true,
  showMuscles = true,
  showGhostStartPose = true,
  showDisclosures = false,
  compact = false,
  className,
}: ExtensionMovementDiagramProps): React.JSX.Element {
  const spec = EXTENSION_MOVEMENT_SPECS[movementId];
  const evaluatedPose = evaluateExtensionPhasePose(spec, {
    phase,
    progress,
    activeSide,
    mirrored,
  });

  const activePose = showCounterExample
    ? buildHyperextendedLumbarCounterExample(evaluatedPose)
    : evaluatedPose;

  const alignmentReport = verifyExtensionPhaseAlignment(activePose, {
    supportSurface: spec.supportSurface,
    family: spec.family,
  });

  const renderedAsset = {
    ...spec.catalogAsset,
    phases: {
      ...spec.catalogAsset.phases,
      [phase]: activePose,
    },
  };

  const auditRecord = EXTENSION_DIAGRAM_AUDIT_RECORDS[movementId];
  const correction = EXTENSION_DIAGRAM_CORRECTIONS[movementId];
  const applicableSources = EXTENSION_PUBLIC_SOURCES.filter((src) =>
    src.applicableMovements.includes(movementId),
  );

  return (
    <figure
      className={className}
      data-component="extension-movement-diagram"
      data-movement-id={movementId}
      data-phase={phase}
      data-support-surface={spec.supportSurface}
      data-family={spec.family}
      data-counter-example={String(showCounterExample)}
      data-alignment-passed={String(alignmentReport.passed)}
      data-anatomical-accuracy-assumed={String(
        EXTENSION_MEDICAL_AND_REVIEW_POLICY.anatomicalAccuracyAssumed,
      )}
      data-professional-review-count={String(
        EXTENSION_MEDICAL_AND_REVIEW_POLICY.professionalReviewCount,
      )}
      style={{ margin: 0 }}
    >
      <div style={{ position: 'relative' }}>
        <MovementPhaseDiagramSvg
          asset={renderedAsset}
          phase={phase}
          activeSide={activeSide}
          mirrored={mirrored}
          showAlignment={showAlignment}
          showDirection={showDirection}
          showMuscles={showMuscles}
          showGhostStartPose={showGhostStartPose}
          compact={compact}
          label={`${spec.nameKo} - ${activePose.shortTitleKo}`}
        />

        {/* Biomechanical Telemetry & Support Surface Overlay SVG */}
        <svg
          viewBox="0 0 320 200"
          aria-hidden="true"
          data-testid="extension-telemetry-overlay"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
          {renderSupportSurfaceOverlay(activePose)}

          <g data-layer="extension-joint-axes">
            {activePose.jointAxes.map((axis) => (
              <circle
                key={axis.id}
                cx={axis.point.x}
                cy={axis.point.y}
                r={5.5}
                fill="none"
                stroke="#1c5d4b"
                strokeWidth={1.3}
                strokeDasharray="2 2"
                data-extension-axis={axis.role}
              />
            ))}
          </g>

          <g data-layer="extension-contact-points">
            {activePose.contactPoints.map((cp) => (
              <circle
                key={cp.id}
                cx={cp.point.x}
                cy={cp.point.y}
                r={3.2}
                fill={cp.status === 'anchored' ? '#2b6a58' : '#c86d44'}
                data-extension-contact={cp.status}
                data-contact-joint={cp.joint}
              />
            ))}
          </g>

          <g data-layer="extension-callouts">
            {activePose.calloutLabels.map((callout) => (
              <g key={callout.id} data-extension-callout={callout.tone}>
                <line
                  x1={callout.anchorPoint.x}
                  y1={callout.anchorPoint.y}
                  x2={callout.offsetPoint.x}
                  y2={callout.offsetPoint.y}
                  stroke="#35584e"
                  strokeWidth={0.9}
                  strokeDasharray="2 2"
                />
                <text
                  x={callout.offsetPoint.x}
                  y={callout.offsetPoint.y}
                  fontSize={7.5}
                  fill="#1c3f36"
                >
                  {callout.labelKo}
                </text>
              </g>
            ))}
          </g>
        </svg>
      </div>

      <figcaption style={{ marginTop: '6px', fontSize: '0.85rem' }}>
        <div
          data-testid="extension-alignment-badge"
          data-alignment-valid={String(alignmentReport.passed)}
          style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}
        >
          <strong>{activePose.shortTitleKo}</strong>
          <span>
            {alignmentReport.passed
              ? '정렬 검증 통과 (치골 앵커·요추 보호·경추 연속·축성 신장)'
              : `반례 경고 (${alignmentReport.violations.join(', ')})`}
          </span>
          <span data-testid="extension-pelvis-telemetry">
            치골 Y={activePose.joints.pelvis.y}px (기준 {alignmentReport.pelvicAnchorTargetY}px) · 요추 힌지{' '}
            {alignmentReport.lumbarLocalHingeDeg}°
          </span>
        </div>
        <p style={{ margin: '4px 0' }}>{activePose.summaryKo}</p>

        {showDisclosures && (
          <div data-testid="extension-disclosures" style={{ marginTop: '6px' }}>
            <p data-testid="extension-medical-notice">
              {EXTENSION_MEDICAL_AND_REVIEW_POLICY.noticeKo}{' '}
              {EXTENSION_MEDICAL_AND_REVIEW_POLICY.limitationKo}
            </p>
            <p data-testid="extension-audit-fix">{auditRecord.biomechanicalFixKo}</p>
            {correction && (
              <p data-testid="extension-correction-scope">{correction.reviewedScopeKo}</p>
            )}
            <ul data-testid="extension-source-links">
              {applicableSources.map((src) => (
                <li key={src.id}>
                  <a href={src.url} target="_blank" rel="noopener noreferrer">
                    {src.title} ({src.organization})
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </figcaption>
    </figure>
  );
}

export function ExtensionMovementTriptych({
  movementId,
  selectedPhase = 'middle',
  onSelectPhase,
  activeSide = 'right',
  mirrored = false,
  showCounterExample = false,
  className,
}: ExtensionMovementTriptychProps): React.JSX.Element {
  const spec = EXTENSION_MOVEMENT_SPECS[movementId];

  return (
    <div
      className={className}
      data-component="extension-movement-triptych"
      data-movement-id={movementId}
    >
      <div
        role="group"
        aria-label={`${spec.nameKo} 단계 선택`}
        style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}
      >
        {PHASES.map((phaseId) => {
          const isSelected = phaseId === selectedPhase;
          const phaseSpec = spec.phases[phaseId];
          return (
            <button
              key={phaseId}
              type="button"
              data-phase-button={phaseId}
              aria-pressed={isSelected}
              onClick={() => onSelectPhase?.(phaseId)}
            >
              {phaseSpec.badgeKo}
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '10px',
        }}
      >
        {PHASES.map((phaseId) => (
          <ExtensionMovementDiagram
            key={phaseId}
            movementId={movementId}
            phase={phaseId}
            activeSide={activeSide}
            mirrored={mirrored}
            showCounterExample={showCounterExample && phaseId === selectedPhase}
            compact
          />
        ))}
      </div>
    </div>
  );
}
