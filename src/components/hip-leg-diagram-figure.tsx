import React, { useId, useMemo, useState } from 'react';
import {
  getHipLegMovementDiagramSpec,
  HIP_LEG_DIAGRAM_DATA,
  HIP_LEG_MOVEMENT_IDS,
  HIP_LEG_TRUTHFULNESS_METADATA,
} from '../data/hip-leg-diagram-data';
import type { Point2D, VisualPhaseId } from '../data/movementVisualRigCatalog';
import {
  getHipLegDiagramPose,
  HIP_LEG_SEGMENT_LENGTHS,
  normalizeHipLegPhaseId,
  phaseToDefaultProgress,
  progressToPhaseId,
  resolveHipLegMovementId,
  sampleHipLegTrajectory,
  type HipLegDiagramPose,
  type HipLegMovementId,
  type HipLegPhaseId,
} from '../models/hip-leg-diagram-model';
import type { AnatomicalSide } from '../models/types';
import '../styles/hip-leg-diagram.css';

const PHASE_ORDER: readonly VisualPhaseId[] = ['start', 'middle', 'end'];

const PHASE_BUTTON_META: Readonly<
  Record<VisualPhaseId, { readonly badge: string; readonly labelKo: string }>
> = Object.freeze({
  start: { badge: '1. START', labelKo: '시작 자세 (준비·정렬)' },
  middle: { badge: '2. MIDDLE', labelKo: '중간 자세 (원 궤적·전방 스윕)' },
  end: { badge: '3. END', labelKo: '끝 자세 (정점 복귀·후방 리치)' },
});

function pointsToPolyline(points: readonly Point2D[]): string {
  return points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
}

export interface HipLegDiagramSvgProps {
  readonly movementId: HipLegMovementId | string;
  readonly phaseOrProgress?: HipLegPhaseId | number;
  readonly activeSide?: AnatomicalSide;
  readonly mirrored?: boolean;
  readonly showTrajectoryArc?: boolean;
  readonly showPelvisAnchor?: boolean;
  readonly compact?: boolean;
  readonly testId?: string;
}

export function HipLegDiagramSvg({
  movementId,
  phaseOrProgress = 'start',
  activeSide = 'left',
  mirrored = false,
  showTrajectoryArc = true,
  showPelvisAnchor = true,
  compact = false,
  testId,
}: HipLegDiagramSvgProps): React.JSX.Element {
  const uid = useId();
  const resolvedId = resolveHipLegMovementId(movementId) ?? 'hip-leg-single-leg-circle';
  const spec = HIP_LEG_DIAGRAM_DATA[resolvedId];
  const pose: HipLegDiagramPose = useMemo(
    () =>
      getHipLegDiagramPose(resolvedId, phaseOrProgress, {
        activeSide,
        mirrored,
      }),
    [resolvedId, phaseOrProgress, activeSide, mirrored],
  );

  const trajectoryPoints = useMemo(() => {
    const samples = sampleHipLegTrajectory(resolvedId, 37, { activeSide, mirrored });
    return samples.map((s) => s.workingLeg.ankle);
  }, [resolvedId, activeSide, mirrored]);

  const { joints, workingLeg, supportLeg, nearArm, farArm, invariants } = pose;
  const workingDash = workingLeg.strokeStyle === 'dashed' ? '5 3.5' : undefined;
  const supportDash = supportLeg.strokeStyle === 'dashed' ? '5 3.5' : undefined;
  const nearArmDash = nearArm.strokeStyle === 'dashed' ? '4 3' : undefined;
  const farArmDash = farArm.strokeStyle === 'dashed' ? '4 3' : undefined;

  return (
    <svg
      viewBox={`0 0 ${HIP_LEG_SEGMENT_LENGTHS.viewBoxWidth} ${HIP_LEG_SEGMENT_LENGTHS.viewBoxHeight}`}
      role="img"
      aria-label={`${spec.nameKo} · ${pose.phaseId} 단계 2D 역학 도해`}
      data-testid={testId ?? `hip-leg-svg-${resolvedId}-${pose.phaseId}`}
      data-movement-id={resolvedId}
      data-phase={pose.phaseId}
      data-stage-key={pose.stageKey}
      data-progress={pose.progress.toFixed(3)}
      data-active-side={pose.activeSide}
      data-mirrored={String(pose.mirrored)}
      data-left-limb-stroke={pose.leftLimbStroke}
      data-right-limb-stroke={pose.rightLimbStroke}
      data-pelvis-drift-mm={String(invariants.pelvisDriftMm)}
      data-support-heel-y={invariants.supportHeelY.toFixed(2)}
      data-anatomical-accuracy-assumed="false"
      className="hip-leg-svg"
    >
      <defs>
        <marker
          id={`hip-leg-arc-arrow-${uid}`}
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#9a502d" />
        </marker>
      </defs>

      {/* Mat Surface Baseline (y = 144) */}
      <g data-element="mat-surface">
        <rect
          x={14}
          y={HIP_LEG_SEGMENT_LENGTHS.matSurfaceY}
          width={292}
          height={7}
          rx={3.5}
          fill="#d9d0be"
          stroke="#8a7a60"
          strokeWidth={0.9}
        />
        <line
          x1={12}
          y1={HIP_LEG_SEGMENT_LENGTHS.matSurfaceY}
          x2={308}
          y2={HIP_LEG_SEGMENT_LENGTHS.matSurfaceY}
          stroke="#244d44"
          strokeWidth={1.2}
        />
      </g>

      {/* Ear-Shoulder-Pelvis-Hip Collinear Axis Line */}
      <line
        data-element="collinear-trunk-axis"
        x1={joints.head.x}
        y1={joints.head.y}
        x2={joints.hip.x}
        y2={joints.hip.y}
        stroke="#2b6a58"
        strokeWidth={1.1}
        strokeDasharray="4 3"
      />

      {/* Pelvis Anchor Indicator */}
      {showPelvisAnchor && (
        <g data-element="pelvis-anchor" data-testid={`pelvis-anchor-${resolvedId}-${pose.phaseId}`}>
          <ellipse
            cx={joints.pelvis.x}
            cy={joints.pelvis.y}
            rx={compact ? 11 : 14}
            ry={compact ? 7 : 9}
            fill="rgba(193, 124, 82, 0.24)"
            stroke="#9a502d"
            strokeWidth={1.2}
          />
          <rect
            x={joints.pelvis.x - 4.5}
            y={joints.pelvis.y - 4.5}
            width={9}
            height={9}
            rx={2}
            fill="#fbfaf5"
            stroke="#9a502d"
            strokeWidth={1.6}
          />
        </g>
      )}

      {/* Continuous Working Leg Trajectory Arc */}
      {showTrajectoryArc && trajectoryPoints.length > 1 && (
        <polyline
          data-element="leg-trajectory-arc"
          points={pointsToPolyline(trajectoryPoints)}
          fill="none"
          stroke="#9a502d"
          strokeWidth={1.6}
          strokeDasharray="4 3"
          markerEnd={`url(#hip-leg-arc-arrow-${uid})`}
        />
      )}

      {/* Far Arm */}
      <polyline
        data-element="far-arm"
        data-anatomical-side={farArm.anatomicalSide}
        data-stroke-style={farArm.strokeStyle}
        points={pointsToPolyline([farArm.shoulder, farArm.elbow, farArm.wrist, farArm.hand])}
        fill="none"
        stroke="#7a6452"
        strokeWidth={2.2}
        strokeDasharray={farArmDash}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Support Leg (Anchored on Mat y = 144) */}
      <g
        data-element="support-leg"
        data-anatomical-side={supportLeg.anatomicalSide}
        data-stroke-style={supportLeg.strokeStyle}
      >
        <polyline
          points={pointsToPolyline([
            supportLeg.hip,
            supportLeg.knee,
            supportLeg.ankle,
            supportLeg.toe,
          ])}
          fill="none"
          stroke="#875641"
          strokeWidth={3.1}
          strokeDasharray={supportDash}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points={pointsToPolyline([supportLeg.ankle, supportLeg.heel, supportLeg.toe])}
          fill="none"
          stroke="#875641"
          strokeWidth={2.4}
          strokeDasharray={supportDash}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          data-element="support-heel-anchor"
          cx={supportLeg.heel.x}
          cy={supportLeg.heel.y}
          r={3.2}
          fill="#9a502d"
        />
      </g>

      {/* Stationary Torso & Spine */}
      <polyline
        data-element="torso-chain"
        points={pointsToPolyline([
          joints.head,
          joints.neck,
          joints.shoulder,
          joints.thoracic,
          joints.lumbar,
          joints.pelvis,
          joints.hip,
        ])}
        fill="none"
        stroke="#244d44"
        strokeWidth={3.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Near Arm */}
      <polyline
        data-element="near-arm"
        data-anatomical-side={nearArm.anatomicalSide}
        data-stroke-style={nearArm.strokeStyle}
        points={pointsToPolyline([nearArm.shoulder, nearArm.elbow, nearArm.wrist, nearArm.hand])}
        fill="none"
        stroke="#244d44"
        strokeWidth={2.6}
        strokeDasharray={nearArmDash}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Working Leg (Rigid 3-Segment Polar FK Chain) */}
      <g
        data-element="working-leg"
        data-anatomical-side={workingLeg.anatomicalSide}
        data-stroke-style={workingLeg.strokeStyle}
      >
        <polyline
          points={pointsToPolyline([
            workingLeg.hip,
            workingLeg.knee,
            workingLeg.ankle,
            workingLeg.toe,
          ])}
          fill="none"
          stroke="#244d44"
          strokeWidth={3.8}
          strokeDasharray={workingDash}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points={pointsToPolyline([workingLeg.ankle, workingLeg.heel, workingLeg.toe])}
          fill="none"
          stroke="#244d44"
          strokeWidth={2.8}
          strokeDasharray={workingDash}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Head & Key Joint Landmarks */}
      <circle
        cx={joints.head.x}
        cy={joints.head.y - 2}
        r={7.5}
        fill="#e6dec8"
        stroke="#244d44"
        strokeWidth={2}
      />
      <circle
        cx={joints.shoulder.x}
        cy={joints.shoulder.y}
        r={3}
        fill="#fbfaf5"
        stroke="#244d44"
        strokeWidth={1.6}
      />
      <circle
        cx={workingLeg.hip.x}
        cy={workingLeg.hip.y}
        r={3.8}
        fill="#fbfaf5"
        stroke="#9a502d"
        strokeWidth={1.8}
      />
      <circle
        cx={workingLeg.knee.x}
        cy={workingLeg.knee.y}
        r={3.2}
        fill="#fbfaf5"
        stroke="#244d44"
        strokeWidth={1.6}
      />
      <circle
        cx={workingLeg.ankle.x}
        cy={workingLeg.ankle.y}
        r={3}
        fill="#fbfaf5"
        stroke="#9a502d"
        strokeWidth={1.6}
      />
    </svg>
  );
}

export interface HipLegDiagramTriptychSvgProps {
  readonly movementId: HipLegMovementId | string;
  readonly selectedPhase?: VisualPhaseId;
  readonly activeSide?: AnatomicalSide;
  readonly mirrored?: boolean;
  readonly onSelectPhase?: (phase: VisualPhaseId) => void;
}

export function HipLegDiagramTriptychSvg({
  movementId,
  selectedPhase = 'start',
  activeSide = 'left',
  mirrored = false,
  onSelectPhase,
}: HipLegDiagramTriptychSvgProps): React.JSX.Element {
  const resolvedId = resolveHipLegMovementId(movementId) ?? 'hip-leg-single-leg-circle';
  return (
    <div className="hip-leg-triptych-grid" data-testid="hip-leg-triptych-strip">
      {PHASE_ORDER.map((phase) => {
        const isSelected = phase === selectedPhase;
        return (
          <div
            key={phase}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            data-testid={`hip-leg-triptych-card-${phase}`}
            className={`hip-leg-triptych-card${isSelected ? ' is-selected' : ''}`}
            onClick={() => onSelectPhase?.(phase)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectPhase?.(phase);
              }
            }}
          >
            <HipLegDiagramSvg
              movementId={resolvedId}
              phaseOrProgress={phase}
              activeSide={activeSide}
              mirrored={mirrored}
              compact
              testId={`hip-leg-triptych-svg-${resolvedId}-${phase}`}
            />
            <div className="hip-leg-triptych-caption">
              {PHASE_BUTTON_META[phase].badge} · {PHASE_BUTTON_META[phase].labelKo}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export interface HipLegDiagramFigureProps {
  readonly movementId?: HipLegMovementId | string;
  readonly initialPhase?: HipLegPhaseId;
  readonly initialProgress?: number;
  readonly initialActiveSide?: AnatomicalSide;
  readonly initialMirrored?: boolean;
  readonly showMovementSwitcher?: boolean;
  readonly showTriptychStrip?: boolean;
}

export function HipLegDiagramFigure({
  movementId = 'hip-leg-single-leg-circle',
  initialPhase = 'start',
  initialProgress,
  initialActiveSide = 'left',
  initialMirrored = false,
  showMovementSwitcher = true,
  showTriptychStrip = true,
}: HipLegDiagramFigureProps): React.JSX.Element {
  const [selectedMovementId, setSelectedMovementId] = useState<HipLegMovementId>(
    () => resolveHipLegMovementId(movementId) ?? 'hip-leg-single-leg-circle',
  );
  const [progress, setProgress] = useState<number>(() =>
    typeof initialProgress === 'number'
      ? Math.max(0, Math.min(1, initialProgress))
      : phaseToDefaultProgress(initialPhase),
  );
  const [activeSide, setActiveSide] = useState<AnatomicalSide>(initialActiveSide);
  const [mirrored, setMirrored] = useState<boolean>(initialMirrored);

  const spec = getHipLegMovementDiagramSpec(selectedMovementId);
  const activePhase: VisualPhaseId = progressToPhaseId(progress);
  const phaseNarrative = spec.phases[activePhase];
  const currentPose = useMemo(
    () =>
      getHipLegDiagramPose(selectedMovementId, progress, {
        activeSide,
        mirrored,
      }),
    [selectedMovementId, progress, activeSide, mirrored],
  );

  const handleSelectPhase = (phase: HipLegPhaseId) => {
    const normalized = normalizeHipLegPhaseId(phase);
    setProgress(phaseToDefaultProgress(normalized));
  };

  return (
    <section
      className="hip-leg-diagram-figure"
      aria-label={`${spec.nameKo} 2D 고관절·하지 역학 도해`}
      data-testid="hip-leg-diagram-figure"
      data-movement-id={selectedMovementId}
      data-phase={activePhase}
      data-anatomical-accuracy-assumed="false"
    >
      <header className="hip-leg-diagram-header">
        <div className="hip-leg-diagram-title-group">
          <span className="hip-leg-diagram-eyebrow">
            Track I3 · 고관절·하지 2D 강체 역학 도해 ({spec.archetypeId})
          </span>
          <h3 className="hip-leg-diagram-title">
            {spec.nameKo} · <span>{spec.nameEn}</span>
          </h3>
          <p className="hip-leg-diagram-subtitle">{spec.archetypeTitleKo}</p>
        </div>

        <div className="hip-leg-diagram-toolbar">
          {showMovementSwitcher &&
            HIP_LEG_MOVEMENT_IDS.map((id) => {
              const itemSpec = HIP_LEG_DIAGRAM_DATA[id];
              const isCurrent = id === selectedMovementId;
              return (
                <button
                  key={id}
                  type="button"
                  data-testid={`hip-leg-movement-tab-${id}`}
                  aria-pressed={isCurrent}
                  className={`hip-leg-movement-btn${isCurrent ? ' is-active' : ''}`}
                  onClick={() => setSelectedMovementId(id)}
                >
                  {itemSpec.nameKo}
                </button>
              );
            })}

          <button
            type="button"
            data-testid="hip-leg-side-toggle"
            className="hip-leg-toggle-btn"
            onClick={() => setActiveSide((prev) => (prev === 'left' ? 'right' : 'left'))}
          >
            작동 다리: {activeSide === 'left' ? '좌측(실선)' : '우측(점선)'}
          </button>

          <button
            type="button"
            data-testid="hip-leg-mirror-toggle"
            aria-pressed={mirrored}
            className={`hip-leg-toggle-btn${mirrored ? ' is-active' : ''}`}
            onClick={() => setMirrored((prev) => !prev)}
          >
            좌우 반전: {mirrored ? 'ON' : 'OFF'}
          </button>
        </div>
      </header>

      {/* 3-Phase Selector */}
      <div className="hip-leg-phase-selector" role="group" aria-label="동작 3단계 선택">
        {PHASE_ORDER.map((phase) => {
          const isCurrent = activePhase === phase;
          const narrative = spec.phases[phase];
          return (
            <button
              key={phase}
              type="button"
              data-testid={`hip-leg-phase-tab-${phase}`}
              aria-pressed={isCurrent}
              className={`hip-leg-phase-btn${isCurrent ? ' is-active' : ''}`}
              onClick={() => handleSelectPhase(phase)}
            >
              <span className="hip-leg-phase-badge">{PHASE_BUTTON_META[phase].badge}</span>
              <span className="hip-leg-phase-label">{narrative.shortTitleKo}</span>
            </button>
          );
        })}
      </div>

      {/* Continuous Progress Scrub Bar */}
      <div className="hip-leg-scrub-bar">
        <label htmlFor="hip-leg-progress-range" className="hip-leg-scrub-label">
          연속 궤적 스크럽 (241 샘플 강체 FK)
        </label>
        <input
          id="hip-leg-progress-range"
          type="range"
          min={0}
          max={1}
          step={0.005}
          value={progress}
          aria-label="연속 궤적 진행률"
          data-testid="hip-leg-progress-slider"
          className="hip-leg-scrub-input"
          onChange={(e) => setProgress(Number(e.target.value))}
        />
        <span className="hip-leg-scrub-readout" data-testid="hip-leg-progress-readout">
          t = {progress.toFixed(2)} ({activePhase.toUpperCase()}) · 대퇴각{' '}
          {currentPose.workingLeg.thighAngleDeg.toFixed(1)}°
        </span>
      </div>

      {/* Primary Stage: Interactive SVG + Pelvis Anchor Callout & Narrative */}
      <div className="hip-leg-stage-grid">
        <div className="hip-leg-canvas-card">
          <HipLegDiagramSvg
            movementId={selectedMovementId}
            phaseOrProgress={progress}
            activeSide={activeSide}
            mirrored={mirrored}
            testId="hip-leg-primary-svg"
          />
        </div>

        <div className="hip-leg-info-column">
          <div className="hip-leg-pelvis-callout" data-testid="hip-leg-pelvis-anchor-callout">
            <span className="hip-leg-pelvis-callout-title">
              골반 앵커 및 지지 다리 불변 조건 (Pelvis &amp; Support Anchor Callout)
            </span>
            <div className="hip-leg-pelvis-callout-body">
              {phaseNarrative.pelvisAnchorCalloutKo}
            </div>
            <div className="hip-leg-invariants-strip">
              <span className="hip-leg-invariant-chip">
                pelvisDriftMm = {currentPose.invariants.pelvisDriftMm}mm
              </span>
              <span className="hip-leg-invariant-chip">
                지지 뒤꿈치 y = {currentPose.invariants.supportHeelY.toFixed(0)}px
              </span>
              <span className="hip-leg-invariant-chip">
                대퇴 {currentPose.segmentLengths.femurLength.toFixed(1)}px · 경골{' '}
                {currentPose.segmentLengths.tibiaLength.toFixed(1)}px
              </span>
              <span className="hip-leg-invariant-chip">
                발목 상태: {currentPose.workingLeg.ankleFlexionState}
              </span>
            </div>
          </div>

          <div className="hip-leg-narrative-box" data-testid="hip-leg-phase-narrative">
            <p className="hip-leg-narrative-summary">{phaseNarrative.summaryKo}</p>
            <p className="hip-leg-narrative-breath">{phaseNarrative.breathCueKo}</p>
          </div>

          <div className="hip-leg-muscle-list" data-testid="hip-leg-muscle-list">
            {spec.primaryMuscles.map((muscle) => (
              <div key={muscle.muscleGroupId} className="hip-leg-muscle-card">
                <span className="hip-leg-muscle-role">{muscle.roleLabelKo}</span>
                <span className="hip-leg-muscle-name">{muscle.labelKo}</span>
                <span className="hip-leg-muscle-reason">{muscle.reasonKo}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3-Phase Triptych Strip */}
      {showTriptychStrip && (
        <HipLegDiagramTriptychSvg
          movementId={selectedMovementId}
          selectedPhase={activePhase}
          activeSide={activeSide}
          mirrored={mirrored}
          onSelectPhase={handleSelectPhase}
        />
      )}

      {/* Truthfulness & Source Disclosures */}
      <footer className="hip-leg-disclosure-box" data-testid="hip-leg-truthfulness-disclosure">
        <div>
          <strong>비의료·자체 저작 고지:</strong> {HIP_LEG_TRUTHFULNESS_METADATA.nonMedicalDisclosureKo}
        </div>
        <div>
          <strong>도해 교정 범위:</strong> {spec.correctionKo} ({spec.limitationKo}) · 정적 가이드:{' '}
          <code>{spec.staticGuideSvgPath}</code>
        </div>
        <ul className="hip-leg-sources-list" data-testid="hip-leg-sources-list">
          {spec.sources.map((src) => (
            <li key={src.id}>
              <a href={src.url} target="_blank" rel="noopener noreferrer">
                {src.title}
              </a>{' '}
              — {src.verifiedFactsKo}
            </li>
          ))}
        </ul>
      </footer>
    </section>
  );
}

export default HipLegDiagramFigure;
