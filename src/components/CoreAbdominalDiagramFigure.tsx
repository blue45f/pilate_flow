import React, { useId, useState } from 'react';
import {
  CORE_ABDOMINAL_DIAGRAM_IDS,
  CORE_ABDOMINAL_DIAGRAM_SPECS,
  CORE_ABDOMINAL_SOURCE_LEDGER,
  CORE_DIAGRAM_LEGEND_ITEMS,
  computeFemurScissorSplitDeg,
  computeHipLegExtensionDeg,
  computeShoulderArmElevationDeg,
  getCoreI7RegistryPatch,
  resolveCoreAbdominalDiagram,
  type CoreAbdominalDiagramId,
  type CoreAbdominalDiagramSpec,
} from '../data/coreAbdominalDiagrams';
import type { Point2D, VisualPhaseId } from '../data/movementVisualRigCatalog';
import { MovementPhaseDiagramSvg } from './MovementPhaseDiagramSvg';

export { resolveCoreAbdominalDiagram };

const PHASE_ORDER: readonly VisualPhaseId[] = ['start', 'middle', 'end'];

const PHASE_TAB_LABELS: Readonly<Record<VisualPhaseId, string>> = {
  start: '시작 (Start)',
  middle: '중간 (Middle)',
  end: '끝 (End)',
};

export interface CoreAbdominalPhaseSvgProps {
  readonly diagramId: CoreAbdominalDiagramId;
  readonly phase: VisualPhaseId;
  readonly showTrajectoryOverlay?: boolean;
  readonly showLumbarAnchorGuide?: boolean;
  readonly showCallouts?: boolean;
  readonly compact?: boolean;
  readonly className?: string;
}

function polylinePoints(pts: readonly Point2D[]): string {
  return pts.map((p) => `${p.x},${p.y}`).join(' ');
}

export function CoreAbdominalPhaseSvg({
  diagramId,
  phase,
  showTrajectoryOverlay = true,
  showLumbarAnchorGuide = true,
  showCallouts = true,
  compact = false,
  className,
}: CoreAbdominalPhaseSvgProps): React.JSX.Element {
  const uid = useId();
  const spec = CORE_ABDOMINAL_DIAGRAM_SPECS[diagramId];
  const phaseSpec = spec.asset.phases[phase];
  const { joints } = phaseSpec;

  const spinePathD = `M ${joints.head.x} ${joints.head.y} L ${joints.neck.x} ${joints.neck.y} L ${joints.shoulder.x} ${joints.shoulder.y} Q ${joints.thoracic.x} ${joints.thoracic.y} ${joints.lumbar.x} ${joints.lumbar.y} L ${joints.pelvis.x} ${joints.pelvis.y}`;

  const nearArmPts: readonly Point2D[] = [
    joints.shoulder,
    joints.elbow,
    joints.wrist,
    joints.hand,
  ];

  const farArmPts: readonly Point2D[] | null =
    joints.farShoulder && joints.farElbow && joints.farWrist
      ? [joints.farShoulder, joints.farElbow, joints.farWrist]
      : null;

  const nearLegPts: readonly Point2D[] = [
    joints.hip,
    joints.knee,
    joints.ankle,
    joints.heel,
    joints.toe,
  ];

  const farLegPts: readonly Point2D[] | null =
    joints.farHip && joints.farKnee && joints.farAnkle && joints.farToe
      ? [joints.farHip, joints.farKnee, joints.farAnkle, joints.farToe]
      : null;

  const activeCallouts = spec.calloutLabels.filter((c) => c.phaseId === phase);
  const activeContacts = spec.contactPoints.filter((c) => c.phases.includes(phase));

  return (
    <svg
      viewBox="0 0 320 200"
      role="img"
      aria-label={`${spec.nameKo} · ${phaseSpec.badgeKo} 2D 도해`}
      data-testid={`core-phase-svg-${diagramId}-${phase}`}
      data-diagram-id={diagramId}
      data-phase={phase}
      data-lumbar-y={joints.lumbar.y}
      data-pelvis-y={joints.pelvis.y}
      data-thoracic-y={joints.thoracic.y}
      className={className}
      style={{
        width: '100%',
        height: 'auto',
        display: 'block',
        background: '#faf8f5',
        borderRadius: compact ? 8 : 10,
        border: '1px solid #e5dec9',
      }}
    >
      <defs>
        <marker
          id={`arrow-${uid}`}
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#c86d44" />
        </marker>
      </defs>

      {/* Mat support surface baseline (y = 148) */}
      <g data-layer="mat-surface">
        <rect x={16} y={146} width={288} height={8} rx={4} fill="#dfd6c3" stroke="#9b8b70" strokeWidth={1} />
        <line x1={12} y1={spec.matBaselineY} x2={308} y2={spec.matBaselineY} stroke="#8c7a5b" strokeWidth={1.4} />
      </g>

      {/* Lumbar & Pelvis Imprint Anchor Guide */}
      {showLumbarAnchorGuide && (
        <g data-layer="lumbar-imprint-guide" data-testid={`lumbar-anchor-guide-${diagramId}-${phase}`}>
          <rect
            x={joints.thoracic.x - 4}
            y={141}
            width={joints.pelvis.x - joints.thoracic.x + 12}
            height={7}
            rx={3}
            fill="rgba(43, 106, 88, 0.22)"
            stroke="#2b6a58"
            strokeWidth={1.2}
          />
          <line
            x1={joints.lumbar.x}
            y1={joints.lumbar.y}
            x2={joints.pelvis.x}
            y2={joints.pelvis.y}
            stroke="#2b6a58"
            strokeWidth={3}
            strokeLinecap="round"
          />
          <circle
            cx={joints.thoracic.x}
            cy={joints.thoracic.y}
            r={3.8}
            fill="#1d4ed8"
            stroke="#ffffff"
            strokeWidth={1}
          />
          {!compact && (
            <text x={96} y={168} fontSize={8.5} fill="#2b6a58" fontWeight={600}>
              {`요추·천골 임프린트 앵커 (y=${joints.lumbar.y}/${joints.pelvis.y}) · 견갑 하각 y=${joints.thoracic.y}`}
            </text>
          )}
        </g>
      )}

      {/* Trajectory Overlays (Arm Pump / Reciprocal Leg Scissor / Overhead Opposition & Wide Arm Circle) */}
      {showTrajectoryOverlay && (
        <g data-layer="trajectory-overlays" data-testid={`trajectory-overlay-${diagramId}-${phase}`}>
          {diagramId === 'core-hundred' && phase === 'middle' && (
            <g data-overlay-kind="vertical-arm-pump">
              <line
                x1={joints.hand.x}
                y1={joints.hand.y - 14}
                x2={joints.hand.x}
                y2={joints.hand.y + 14}
                stroke="#c86d44"
                strokeWidth={2.2}
                strokeDasharray="3 2"
                markerStart={`url(#arrow-${uid})`}
                markerEnd={`url(#arrow-${uid})`}
              />
              <text x={joints.hand.x + 8} y={joints.hand.y + 3} fontSize={8} fill="#c86d44" fontWeight={700}>
                펌핑 [0,-14]↔[0,14]
              </text>
            </g>
          )}

          {diagramId === 'core-single-leg-stretch' && joints.farKnee && (
            <g data-overlay-kind="reciprocal-leg-scissor">
              <path
                d={`M ${joints.knee.x} ${joints.knee.y} Q ${(joints.knee.x + joints.farKnee.x) / 2} ${Math.min(joints.knee.y, joints.farKnee.y) - 22} ${joints.farKnee.x} ${joints.farKnee.y}`}
                fill="none"
                stroke="#8b5cf6"
                strokeWidth={1.8}
                strokeDasharray="4 2"
                markerEnd={`url(#arrow-${uid})`}
              />
              <text
                x={(joints.knee.x + joints.farKnee.x) / 2 - 20}
                y={Math.min(joints.knee.y, joints.farKnee.y) - 14}
                fontSize={8}
                fill="#6d28d9"
                fontWeight={700}
              >
                {phase === 'middle'
                  ? '왕복 시저 교차'
                  : `${computeFemurScissorSplitDeg(joints)}° 시저 스플릿`}
              </text>
            </g>
          )}

          {diagramId === 'core-double-leg-stretch' && phase === 'middle' && (
            <g data-overlay-kind="double-limb-opposition">
              <line
                x1={joints.shoulder.x}
                y1={joints.shoulder.y}
                x2={joints.hand.x}
                y2={joints.hand.y}
                stroke="#c86d44"
                strokeWidth={1.8}
                strokeDasharray="4 2"
                markerEnd={`url(#arrow-${uid})`}
              />
              <line
                x1={joints.hip.x}
                y1={joints.hip.y}
                x2={joints.toe.x}
                y2={joints.toe.y}
                stroke="#c86d44"
                strokeWidth={1.8}
                strokeDasharray="4 2"
                markerEnd={`url(#arrow-${uid})`}
              />
              <text x={20} y={50} fontSize={8} fill="#c86d44" fontWeight={700}>
                135° 귀 옆 오버헤드 ↔ 45° 양다리 신전
              </text>
            </g>
          )}

          {diagramId === 'core-double-leg-stretch' && phase === 'end' && (
            <g data-overlay-kind="wide-arm-circle">
              <path
                d="M 24 60 Q 96 154 168 104"
                fill="none"
                stroke="#c86d44"
                strokeWidth={1.8}
                strokeDasharray="4 2"
                markerEnd={`url(#arrow-${uid})`}
              />
              <text x={60} y={142} fontSize={8} fill="#c86d44" fontWeight={700}>
                와이드 암 서클 스윕
              </text>
            </g>
          )}
        </g>
      )}

      {/* Far-side limbs (contralateral dashed representation) */}
      {farLegPts && (
        <polyline
          data-layer="far-leg"
          points={polylinePoints(farLegPts)}
          fill="none"
          stroke="#7c8594"
          strokeWidth={3}
          strokeDasharray="4 3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {farArmPts && (
        <polyline
          data-layer="far-arm"
          points={polylinePoints(farArmPts)}
          fill="none"
          stroke="#8a94a6"
          strokeWidth={2.4}
          strokeDasharray="3 3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Spine & Torso Curve */}
      <path
        data-layer="spine-curve"
        d={spinePathD}
        fill="none"
        stroke="#1e293b"
        strokeWidth={4.2}
        strokeLinecap="round"
      />

      {/* Near Leg */}
      <polyline
        data-layer="near-leg"
        points={polylinePoints(nearLegPts)}
        fill="none"
        stroke="#0f172a"
        strokeWidth={3.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Near Arm */}
      <polyline
        data-layer="near-arm"
        points={polylinePoints(nearArmPts)}
        fill="none"
        stroke="#c86d44"
        strokeWidth={3.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Head */}
      <circle
        cx={joints.head.x}
        cy={joints.head.y}
        r={9}
        fill="#f8fafc"
        stroke="#1e293b"
        strokeWidth={2.4}
      />

      {/* Active Contact Points (Hand-Shin Clasp / Mat Imprint) */}
      <g data-layer="contact-points">
        {activeContacts.map((cp) => (
          <circle
            key={cp.id}
            cx={cp.point.x}
            cy={cp.point.y}
            r={cp.kind === 'hand-shin-clasp' ? 5.2 : 4}
            fill={cp.kind === 'hand-shin-clasp' ? 'rgba(139, 92, 246, 0.28)' : 'rgba(43, 106, 88, 0.3)'}
            stroke={cp.kind === 'hand-shin-clasp' ? '#7c3aed' : '#2b6a58'}
            strokeWidth={1.6}
          />
        ))}
      </g>

      {/* Primary Joint Dots */}
      <g data-layer="joint-nodes">
        {(['shoulder', 'elbow', 'hand', 'thoracic', 'lumbar', 'pelvis', 'hip', 'knee', 'ankle'] as const).map(
          (jointKey) => {
            const ptVal = joints[jointKey];
            return (
              <circle
                key={jointKey}
                data-joint={jointKey}
                cx={ptVal.x}
                cy={ptVal.y}
                r={2.8}
                fill="#ffffff"
                stroke="#0f172a"
                strokeWidth={1.5}
              />
            );
          },
        )}
      </g>

      {/* Callouts */}
      {showCallouts &&
        !compact &&
        activeCallouts.map((callout) => (
          <g key={callout.id} data-layer="callout-label">
            <line
              x1={callout.anchor.x}
              y1={callout.anchor.y}
              x2={callout.badgePosition.x}
              y2={callout.badgePosition.y + 4}
              stroke="#64748b"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
            <text
              x={callout.badgePosition.x}
              y={callout.badgePosition.y}
              fontSize={8.5}
              fontWeight={700}
              fill="#1e293b"
            >
              {callout.textKo}
            </text>
          </g>
        ))}
    </svg>
  );
}

export interface CoreAbdominalTriptychFigureProps {
  readonly diagramId: CoreAbdominalDiagramId;
  readonly selectedPhase?: VisualPhaseId;
  readonly onSelectPhase?: (phase: VisualPhaseId) => void;
  readonly showTrajectoryOverlay?: boolean;
  readonly showLumbarAnchorGuide?: boolean;
}

export function CoreAbdominalTriptychFigure({
  diagramId,
  selectedPhase = 'middle',
  onSelectPhase,
  showTrajectoryOverlay = true,
  showLumbarAnchorGuide = true,
}: CoreAbdominalTriptychFigureProps): React.JSX.Element {
  const spec = CORE_ABDOMINAL_DIAGRAM_SPECS[diagramId];

  return (
    <div
      data-testid={`core-triptych-${diagramId}`}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 12,
      }}
    >
      {PHASE_ORDER.map((phaseId) => {
        const phaseSpec = spec.asset.phases[phaseId];
        const isSelected = selectedPhase === phaseId;
        return (
          <div
            key={phaseId}
            data-testid={`core-triptych-card-${diagramId}-${phaseId}`}
            onClick={() => onSelectPhase?.(phaseId)}
            style={{
              padding: 10,
              borderRadius: 10,
              border: isSelected ? '2px solid #2b6a58' : '1px solid #dcd5c5',
              background: isSelected ? '#f3f8f5' : '#ffffff',
              cursor: onSelectPhase ? 'pointer' : 'default',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <strong style={{ fontSize: 12, color: '#1e293b' }}>{PHASE_TAB_LABELS[phaseId]}</strong>
              <span style={{ fontSize: 11, color: '#475569' }}>{phaseSpec.shortTitleKo}</span>
            </div>
            <CoreAbdominalPhaseSvg
              diagramId={diagramId}
              phase={phaseId}
              showTrajectoryOverlay={showTrajectoryOverlay}
              showLumbarAnchorGuide={showLumbarAnchorGuide}
            />
            <p style={{ fontSize: 11.5, color: '#334155', margin: '8px 0 4px' }}>
              {phaseSpec.summaryKo}
            </p>
            <p style={{ fontSize: 11, color: '#0f766e', margin: 0, fontWeight: 600 }}>
              {phaseSpec.breathCueKo}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export interface CoreAbdominalDiagramFigureProps {
  readonly initialDiagramId?: CoreAbdominalDiagramId;
  readonly exerciseId?: string;
  readonly initialPhase?: VisualPhaseId;
  readonly showComparisonStrip?: boolean;
}

export function CoreAbdominalDiagramFigure({
  initialDiagramId = 'core-hundred',
  exerciseId,
  initialPhase = 'middle',
  showComparisonStrip = true,
}: CoreAbdominalDiagramFigureProps): React.JSX.Element {
  const resolvedInitial =
    (exerciseId ? resolveCoreAbdominalDiagram(exerciseId)?.id : null) ?? initialDiagramId;

  const [activeDiagramId, setActiveDiagramId] = useState<CoreAbdominalDiagramId>(resolvedInitial);
  const [activePhase, setActivePhase] = useState<VisualPhaseId>(initialPhase);
  const [showTrajectoryOverlay, setShowTrajectoryOverlay] = useState<boolean>(true);
  const [showLumbarAnchorGuide, setShowLumbarAnchorGuide] = useState<boolean>(true);

  const activeSpec: CoreAbdominalDiagramSpec = CORE_ABDOMINAL_DIAGRAM_SPECS[activeDiagramId];
  const activePhaseSpec = activeSpec.asset.phases[activePhase];
  const middleJoints = activeSpec.asset.phases.middle.joints;

  return (
    <section
      aria-label="코어 복부 안정 3대 동작 2D 도해"
      data-testid="core-abdominal-diagram-figure"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: 16,
        borderRadius: 14,
        background: '#f7f4ec',
        border: '1px solid #dfd7c6',
        color: '#1e293b',
      }}
    >
      {/* Header & Movement Selector Tabs */}
      <header style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <span
              style={{
                display: 'inline-block',
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 999,
                background: '#e0f2fe',
                color: '#0369a1',
                marginBottom: 4,
              }}
            >
              Track I4 · 복부 코어 3종 독립 2D 키네마틱 도해
            </span>
            <h3 style={{ margin: 0, fontSize: 18 }}>{activeSpec.nameKo}</h3>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#475569' }}>
              {activeSpec.subtitleKo}
            </p>
          </div>

          {/* Movement selector buttons */}
          <div
            role="tablist"
            aria-label="코어 복부 동작 선택"
            style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}
          >
            {CORE_ABDOMINAL_DIAGRAM_IDS.map((id, index) => {
              const spec = CORE_ABDOMINAL_DIAGRAM_SPECS[id];
              const selected = id === activeDiagramId;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  tabIndex={selected ? 0 : -1}
                  data-testid={`core-movement-tab-${id}`}
                  onClick={() => setActiveDiagramId(id)}
                  onKeyDown={(event) => {
                    let nextIndex: number | null = null;
                    if (event.key === 'ArrowRight') {
                      nextIndex = (index + 1) % CORE_ABDOMINAL_DIAGRAM_IDS.length;
                    } else if (event.key === 'ArrowLeft') {
                      nextIndex =
                        (index - 1 + CORE_ABDOMINAL_DIAGRAM_IDS.length) %
                        CORE_ABDOMINAL_DIAGRAM_IDS.length;
                    } else if (event.key === 'Home') {
                      nextIndex = 0;
                    } else if (event.key === 'End') {
                      nextIndex = CORE_ABDOMINAL_DIAGRAM_IDS.length - 1;
                    }
                    if (nextIndex !== null) {
                      event.preventDefault();
                      setActiveDiagramId(CORE_ABDOMINAL_DIAGRAM_IDS[nextIndex]);
                      const tabButtons =
                        event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                          '[role="tab"]',
                        );
                      tabButtons?.[nextIndex]?.focus();
                    }
                  }}
                  style={{
                    padding: '7px 12px',
                    borderRadius: 8,
                    border: selected ? '2px solid #1e293b' : '1px solid #cbd5e1',
                    background: selected ? '#1e293b' : '#ffffff',
                    color: selected ? '#ffffff' : '#1e293b',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {spec.nameKo}
                </button>
              );
            })}
          </div>
        </div>

        {/* Phase Tabs & Overlay Toggles */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div role="tablist" aria-label="동작 단계 선택" style={{ display: 'flex', gap: 6 }}>
            {PHASE_ORDER.map((phaseId, index) => {
              const selected = phaseId === activePhase;
              return (
                <button
                  key={phaseId}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  tabIndex={selected ? 0 : -1}
                  data-testid={`core-phase-tab-${phaseId}`}
                  onClick={() => setActivePhase(phaseId)}
                  onKeyDown={(event) => {
                    let nextIndex: number | null = null;
                    if (event.key === 'ArrowRight') {
                      nextIndex = (index + 1) % PHASE_ORDER.length;
                    } else if (event.key === 'ArrowLeft') {
                      nextIndex = (index - 1 + PHASE_ORDER.length) % PHASE_ORDER.length;
                    } else if (event.key === 'Home') {
                      nextIndex = 0;
                    } else if (event.key === 'End') {
                      nextIndex = PHASE_ORDER.length - 1;
                    }
                    if (nextIndex !== null) {
                      event.preventDefault();
                      setActivePhase(PHASE_ORDER[nextIndex]);
                      const tabButtons =
                        event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                          '[role="tab"]',
                        );
                      tabButtons?.[nextIndex]?.focus();
                    }
                  }}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 6,
                    border: selected ? '1.5px solid #2b6a58' : '1px solid #cbd5e1',
                    background: selected ? '#2b6a58' : '#ffffff',
                    color: selected ? '#ffffff' : '#334155',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {PHASE_TAB_LABELS[phaseId]}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showTrajectoryOverlay}
                onChange={(e) => setShowTrajectoryOverlay(e.target.checked)}
                data-testid="toggle-trajectory-overlay"
              />
              사지 궤적 오버레이
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showLumbarAnchorGuide}
                onChange={(e) => setShowLumbarAnchorGuide(e.target.checked)}
                data-testid="toggle-lumbar-anchor-guide"
              />
              요추·천골 매트 임프린트 가이드
            </label>
          </div>
        </div>
      </header>

      {/* Active Phase Highlight & Kinematic Metrics Bar */}
      <div
        data-testid="core-kinematic-metrics-bar"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 8,
          padding: 10,
          borderRadius: 10,
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          fontSize: 12,
        }}
      >
        <div>
          <strong>현재 단계:</strong> {activePhaseSpec.badgeKo} ({activePhaseSpec.shortTitleKo})
        </div>
        <div>
          <strong>요추·천골 매트 앵커:</strong>{' '}
          {`lumbar y=${activePhaseSpec.joints.lumbar.y}px · pelvis y=${activePhaseSpec.joints.pelvis.y}px`}
        </div>
        <div>
          <strong>견갑골 하각 컬업 피벗:</strong> {`thoracic y=${activePhaseSpec.joints.thoracic.y}px`}
        </div>
        <div>
          <strong>핵심 각도·궤적 지표:</strong>{' '}
          {activeDiagramId === 'core-hundred' &&
            `시작 무릎 ${activeSpec.kinematicMetrics.startKneeAngleDeg}° · 중간 다리 ${computeHipLegExtensionDeg(middleJoints)}° · 암 펌핑 [0,-14]~[0,14]`}
          {activeDiagramId === 'core-single-leg-stretch' &&
            `대퇴 시저 스플릿 ${computeFemurScissorSplitDeg(activeSpec.asset.phases.start.joints)}° · 뻗은 다리 ${activeSpec.kinematicMetrics.legDiagonalAngleDeg}°`}
          {activeDiagramId === 'core-double-leg-stretch' &&
            `오버헤드 팔 ${computeShoulderArmElevationDeg(middleJoints)}° ↔ 양다리 ${computeHipLegExtensionDeg(middleJoints)}°`}
        </div>
      </div>

      {/* 3-Phase Triptych for the Selected Core Exercise */}
      <CoreAbdominalTriptychFigure
        diagramId={activeDiagramId}
        selectedPhase={activePhase}
        onSelectPhase={setActivePhase}
        showTrajectoryOverlay={showTrajectoryOverlay}
        showLumbarAnchorGuide={showLumbarAnchorGuide}
      />

      {/* 3-Up Cross-Movement Comparison Strip (Hundred vs Single Leg Stretch vs Double Leg Stretch) */}
      {showComparisonStrip && (
        <section
          aria-label="코어 3대 동작 동시 비교 스트립"
          data-testid="core-three-up-comparison-strip"
          style={{
            padding: 12,
            borderRadius: 10,
            background: '#ffffff',
            border: '1px solid #dcd5c5',
          }}
        >
          <h4 style={{ margin: '0 0 8px', fontSize: 13.5 }}>
            3대 복부 동작 단계별 자세 비교 ({PHASE_TAB_LABELS[activePhase]})
          </h4>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 10,
            }}
          >
            {CORE_ABDOMINAL_DIAGRAM_IDS.map((id) => {
              const spec = CORE_ABDOMINAL_DIAGRAM_SPECS[id];
              return (
                <div
                  key={id}
                  data-testid={`comparison-strip-item-${id}`}
                  style={{
                    padding: 8,
                    borderRadius: 8,
                    border: id === activeDiagramId ? '1.5px solid #1e293b' : '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                    {spec.nameKo}
                  </div>
                  <CoreAbdominalPhaseSvg
                    diagramId={id}
                    phase={activePhase}
                    showTrajectoryOverlay={showTrajectoryOverlay}
                    showLumbarAnchorGuide={showLumbarAnchorGuide}
                    compact
                  />
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
                    {spec.asset.poseDeltaSummary.keyJointChangeKo}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Legend */}
      <div
        data-testid="core-diagram-legend"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 8,
          padding: 10,
          borderRadius: 8,
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          fontSize: 11.5,
        }}
      >
        {CORE_DIAGRAM_LEGEND_ITEMS.map((item) => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: item.swatchColor,
                marginTop: 3,
                flexShrink: 0,
              }}
            />
            <div>
              <strong>{item.labelKo}</strong>
              <div style={{ color: '#475569', fontSize: 11 }}>{item.descriptionKo}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Source & Truthfulness Disclosure */}
      <footer
        data-testid="core-source-truthfulness-disclosure"
        style={{
          padding: 12,
          borderRadius: 10,
          background: '#f1efe7',
          border: '1px solid #d6cfc0',
          fontSize: 11.5,
          color: '#334155',
        }}
      >
        <p style={{ margin: '0 0 6px', fontWeight: 700 }}>
          출처 대조 및 비의료·비검증 고지 (anatomicalAccuracyAssumed:{' '}
          {String(CORE_ABDOMINAL_SOURCE_LEDGER.truthfulness.anatomicalAccuracyAssumed)} ·
          professionalReviewCount: {CORE_ABDOMINAL_SOURCE_LEDGER.truthfulness.professionalReviewCount}{' '}
          · sourceFrameMappings: {CORE_ABDOMINAL_SOURCE_LEDGER.truthfulness.sourceFrameMappings})
        </p>
        <p style={{ margin: '0 0 6px' }}>{activeSpec.correction.reviewedScopeKo}</p>
        <p style={{ margin: '0 0 6px' }}>{activeSpec.correction.correctionKo}</p>
        <p style={{ margin: '0 0 8px', color: '#475569' }}>
          {CORE_ABDOMINAL_SOURCE_LEDGER.truthfulness.nonMedicalDisclosureKo}
        </p>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {activeSpec.correction.sources.map((src) => (
            <li key={src.url}>
              <a href={src.url} target="_blank" rel="noopener noreferrer">
                {src.title}
              </a>
            </li>
          ))}
        </ul>
      </footer>
    </section>
  );
}

export function CoreAbdominalI7IntegrationPreview({
  exerciseId = 'original-mat-single-leg-stretch',
  phase = 'start',
}: {
  readonly exerciseId?: string;
  readonly phase?: VisualPhaseId;
}): React.JSX.Element | null {
  const patch = getCoreI7RegistryPatch();
  const asset = patch.assets[exerciseId];
  if (!asset) return null;
  return (
    <div data-testid={`core-i7-preview-${exerciseId}`}>
      <MovementPhaseDiagramSvg
        asset={asset}
        phase={phase}
        showAlignment
        showDirection
        showMuscles
      />
    </div>
  );
}

export default CoreAbdominalDiagramFigure;
