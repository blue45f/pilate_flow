import React, { useId, useState } from 'react';
import {
  FOOTWORK_LOWER_DIAGRAM_IDS,
  FOOTWORK_LOWER_DIAGRAM_LEGEND_ITEMS,
  FOOTWORK_LOWER_DIAGRAM_SPECS,
  FOOTWORK_LOWER_SOURCE_LEDGER,
  resolveFootworkLowerDiagram,
  type FootworkLowerDiagramId,
  type FootworkLowerDiagramSpec,
} from '../data/footworkLowerDiagramData';
import type { Point2D, VisualPhaseId } from '../data/movementVisualRigCatalog';

// eslint-disable-next-line react-refresh/only-export-components
export { resolveFootworkLowerDiagram };

const PHASE_ORDER: readonly VisualPhaseId[] = ['start', 'middle', 'end'];

const PHASE_TAB_LABELS: Readonly<Record<VisualPhaseId, string>> = {
  start: '시작 (Start)',
  middle: '중간 (Middle)',
  end: '끝 (End)',
};

export interface FootworkLowerPhaseSvgProps {
  readonly diagramId: FootworkLowerDiagramId;
  readonly phase: VisualPhaseId;
  readonly showTrajectoryOverlay?: boolean;
  readonly showTrackingGuide?: boolean;
  readonly showCallouts?: boolean;
  readonly compact?: boolean;
  readonly testIdPrefix?: string;
  readonly className?: string;
}

function polylinePoints(pts: readonly Point2D[]): string {
  return pts.map((p) => `${p.x},${p.y}`).join(' ');
}

export function FootworkLowerPhaseSvg({
  diagramId,
  phase,
  showTrajectoryOverlay = true,
  showTrackingGuide = true,
  showCallouts = true,
  compact = false,
  testIdPrefix = 'footwork-lower-phase-svg',
  className,
}: FootworkLowerPhaseSvgProps): React.JSX.Element {
  const uid = useId();
  const spec = FOOTWORK_LOWER_DIAGRAM_SPECS[diagramId];
  const phaseSpec = spec.asset.phases[phase];
  const { joints, apparatusState } = phaseSpec;

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
      data-testid={`${testIdPrefix}-${diagramId}-${phase}`}
      data-diagram-id={diagramId}
      data-phase={phase}
      data-pelvis-y={joints.pelvis.y}
      data-knee-y={joints.knee.y}
      data-ankle-y={joints.ankle.y}
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
          id={`fw-arrow-${uid}`}
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#c86d44" />
        </marker>
        <marker
          id={`fw-track-arrow-${uid}`}
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#1d4ed8" />
        </marker>
      </defs>

      {/* Apparatus Geometry Layer (Reformer Carriage/Footbar, Wunda Chair Pedal/Seat, Ladder Barrel Rung) */}
      <g data-layer="apparatus-geometry" data-testid={`apparatus-geometry-${diagramId}-${phase}`}>
        {diagramId === 'reformer-footwork-and-strap-frog' && (
          <>
            {/* Reformer Frame & Sliding Carriage */}
            <rect
              x={16}
              y={148}
              width={288}
              height={12}
              rx={4}
              fill="#dcd3c0"
              stroke="#8c7a5b"
              strokeWidth={1.2}
            />
            <rect
              x={Math.max(20, joints.head.x - 10)}
              y={142}
              width={joints.pelvis.x - joints.head.x + 28}
              height={7}
              rx={3}
              fill="#b89f78"
              stroke="#6c5839"
              strokeWidth={1.1}
            />
            {/* Right Footbar */}
            <line
              x1={276}
              y1={148}
              x2={262}
              y2={114}
              stroke="#475569"
              strokeWidth={3.2}
              strokeLinecap="round"
            />
            <circle cx={260} cy={116} r={4.5} fill="#334155" />
          </>
        )}

        {diagramId === 'ankle-plantar-dorsiflexion-articulation' && (
          <>
            {/* Ladder Barrel Rung & Floor */}
            <line x1={76} y1={52} x2={76} y2={178} stroke="#786648" strokeWidth={3} />
            <line x1={94} y1={52} x2={94} y2={178} stroke="#786648" strokeWidth={3} />
            <line x1={74} y1={76} x2={96} y2={76} stroke="#475569" strokeWidth={3} />
            <line x1={74} y1={108} x2={96} y2={108} stroke="#475569" strokeWidth={2.5} />
            <line x1={16} y1={spec.matBaselineY} x2={304} y2={spec.matBaselineY} stroke="#8c7a5b" strokeWidth={1.6} />
          </>
        )}

        {diagramId === 'chair-pedal-press-and-calf-raise' && (
          <>
            {/* Wunda Chair Body, Seat & Hinged Spring Pedal */}
            <rect
              x={108}
              y={108}
              width={56}
              height={68}
              rx={4}
              fill="#e4dbc6"
              stroke="#8c7a5b"
              strokeWidth={1.3}
            />
            <rect
              x={104}
              y={104}
              width={64}
              height={6}
              rx={3}
              fill="#bfa780"
              stroke="#6c5839"
              strokeWidth={1.1}
            />
            {/* Hinged Pedal + Spring */}
            <line
              x1={164}
              y1={172}
              x2={joints.ankle.x + 8}
              y2={joints.ankle.y + 4}
              stroke="#334155"
              strokeWidth={3.4}
              strokeLinecap="round"
            />
            <line
              x1={148}
              y1={120}
              x2={(164 + joints.ankle.x) / 2}
              y2={(172 + joints.ankle.y) / 2}
              stroke="#c86d44"
              strokeWidth={1.6}
              strokeDasharray="2 2"
            />
            <line x1={16} y1={spec.matBaselineY} x2={304} y2={spec.matBaselineY} stroke="#8c7a5b" strokeWidth={1.6} />
          </>
        )}

        {diagramId === 'standing-lunge-splits-and-hip-abduction' && (
          <>
            {/* Standing Support Frame / Rung & Platform / Sliding Surface */}
            <line x1={82} y1={68} x2={82} y2={176} stroke="#786648" strokeWidth={3} />
            <circle cx={88} cy={76} r={4} fill="#475569" />
            <rect
              x={116}
              y={172}
              width={48}
              height={6}
              rx={2}
              fill="#cbb994"
              stroke="#786648"
              strokeWidth={1}
            />
            <line x1={16} y1={spec.matBaselineY} x2={304} y2={spec.matBaselineY} stroke="#8c7a5b" strokeWidth={1.6} />
          </>
        )}
      </g>

      {/* Joint Tracking & Pelvic Levelness Alignment Lines */}
      {showTrackingGuide && (
        <g
          data-layer="joint-tracking-guide"
          data-testid={`joint-tracking-guide-${diagramId}-${phase}`}
        >
          {diagramId === 'reformer-footwork-and-strap-frog' && (
            <line
              x1={joints.hip.x}
              y1={joints.hip.y}
              x2={joints.toe.x}
              y2={joints.toe.y}
              stroke="#1d4ed8"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              markerEnd={`url(#fw-track-arrow-${uid})`}
            />
          )}
          {diagramId === 'ankle-plantar-dorsiflexion-articulation' && (
            <line
              x1={joints.pelvis.x}
              y1={joints.pelvis.y}
              x2={joints.ankle.x}
              y2={joints.ankle.y}
              stroke="#1d4ed8"
              strokeWidth={1.5}
              strokeDasharray="4 2"
            />
          )}
          {diagramId === 'chair-pedal-press-and-calf-raise' && (
            <line
              x1={joints.pelvis.x}
              y1={18}
              x2={joints.pelvis.x}
              y2={174}
              stroke="#1d4ed8"
              strokeWidth={1.4}
              strokeDasharray="4 3"
            />
          )}
          {diagramId === 'standing-lunge-splits-and-hip-abduction' && joints.farAnkle && (
            <line
              x1={joints.farAnkle.x}
              y1={joints.pelvis.y - 8}
              x2={joints.farAnkle.x}
              y2={joints.farAnkle.y + 4}
              stroke="#1d4ed8"
              strokeWidth={1.6}
              strokeDasharray="3 2"
            />
          )}
          {!compact && (
            <text x={22} y={190} fontSize={8.5} fill="#1d4ed8" fontWeight={600}>
              {`2nd Toe·슬개골·고관절 정렬 유지 · 골반 수평(y=${joints.pelvis.y}) · 캐리지/페달(${apparatusState.carriageOffsetPx}px/${apparatusState.pedalAngleDeg}°)`}
            </text>
          )}
        </g>
      )}

      {/* Trajectory Overlays */}
      {showTrajectoryOverlay && (
        <g
          data-layer="trajectory-overlays"
          data-testid={`trajectory-overlay-${diagramId}-${phase}`}
        >
          {spec.trajectoryOverlays.map((ov) => (
            <g key={ov.id} data-overlay-kind={ov.kind}>
              <path
                d={ov.svgPathD}
                fill="none"
                stroke="#c86d44"
                strokeWidth={2}
                strokeDasharray="4 2"
                markerEnd={`url(#fw-arrow-${uid})`}
              />
            </g>
          ))}
        </g>
      )}

      {/* Far-side limbs */}
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

      {/* Active Contact Points */}
      <g data-layer="contact-points">
        {activeContacts.map((cp) => (
          <circle
            key={cp.id}
            cx={cp.point.x}
            cy={cp.point.y}
            r={4.5}
            fill="rgba(43, 106, 88, 0.28)"
            stroke="#2b6a58"
            strokeWidth={1.6}
          />
        ))}
      </g>

      {/* Primary Joint Dots */}
      <g data-layer="joint-nodes">
        {(
          ['shoulder', 'elbow', 'hand', 'thoracic', 'lumbar', 'pelvis', 'hip', 'knee', 'ankle'] as const
        ).map((jointKey) => {
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
        })}
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

export interface FootworkLowerTriptychFigureProps {
  readonly diagramId: FootworkLowerDiagramId;
  readonly selectedPhase?: VisualPhaseId;
  readonly onSelectPhase?: (phase: VisualPhaseId) => void;
  readonly showTrajectoryOverlay?: boolean;
  readonly showTrackingGuide?: boolean;
}

export function FootworkLowerTriptychFigure({
  diagramId,
  selectedPhase = 'middle',
  onSelectPhase,
  showTrajectoryOverlay = true,
  showTrackingGuide = true,
}: FootworkLowerTriptychFigureProps): React.JSX.Element {
  const spec = FOOTWORK_LOWER_DIAGRAM_SPECS[diagramId];

  return (
    <div
      data-testid={`footwork-lower-triptych-${diagramId}`}
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
            data-testid={`footwork-lower-triptych-card-${diagramId}-${phaseId}`}
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
            <FootworkLowerPhaseSvg
              diagramId={diagramId}
              phase={phaseId}
              showTrajectoryOverlay={showTrajectoryOverlay}
              showTrackingGuide={showTrackingGuide}
              testIdPrefix="footwork-lower-triptych-svg"
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

export interface FootworkLowerDiagramFigureProps {
  readonly exerciseId?: string;
  readonly initialDiagramId?: FootworkLowerDiagramId;
  readonly initialPhase?: VisualPhaseId;
  readonly showComparisonStrip?: boolean;
}

export function FootworkLowerDiagramFigure({
  exerciseId = 'ex-footwork-01',
  initialDiagramId = 'reformer-footwork-and-strap-frog',
  initialPhase = 'middle',
  showComparisonStrip = true,
}: FootworkLowerDiagramFigureProps): React.JSX.Element {
  const resolvedInitial =
    (exerciseId ? resolveFootworkLowerDiagram(exerciseId)?.id : null) ?? initialDiagramId;

  const [activeDiagramId, setActiveDiagramId] =
    useState<FootworkLowerDiagramId>(resolvedInitial);
  const [activePhase, setActivePhase] = useState<VisualPhaseId>(initialPhase);
  const [showTrajectoryOverlay, setShowTrajectoryOverlay] = useState<boolean>(true);
  const [showTrackingGuide, setShowTrackingGuide] = useState<boolean>(true);

  const activeSpec: FootworkLowerDiagramSpec = FOOTWORK_LOWER_DIAGRAM_SPECS[activeDiagramId];
  const activePhaseSpec = activeSpec.asset.phases[activePhase];
  const ledgerEntry = FOOTWORK_LOWER_SOURCE_LEDGER.entries[activeDiagramId];

  return (
    <section
      aria-label="풋워크·발목·체어 페달·스탠딩 하지 4대 그룹 2D 도해"
      data-testid="footwork-lower-diagram-figure"
      data-active-diagram-id={activeDiagramId}
      data-active-phase={activePhase}
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
              Track I10 · 풋워크·발목·체어 페달·스탠딩 하지 2D 키네마틱 도해 (21개 동작 커버)
            </span>
            <h3 style={{ margin: 0, fontSize: 18 }}>{activeSpec.nameKo}</h3>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#475569' }}>
              {activeSpec.subtitleKo}
            </p>
          </div>

          <div
            role="tablist"
            aria-label="풋워크 및 하지 동작 그룹 선택"
            style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}
          >
            {FOOTWORK_LOWER_DIAGRAM_IDS.map((id, index) => {
              const spec = FOOTWORK_LOWER_DIAGRAM_SPECS[id];
              const selected = id === activeDiagramId;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  tabIndex={selected ? 0 : -1}
                  data-testid={`footwork-lower-movement-tab-${id}`}
                  onClick={() => setActiveDiagramId(id)}
                  onKeyDown={(event) => {
                    let nextIndex: number | null = null;
                    if (event.key === 'ArrowRight') {
                      nextIndex = (index + 1) % FOOTWORK_LOWER_DIAGRAM_IDS.length;
                    } else if (event.key === 'ArrowLeft') {
                      nextIndex =
                        (index - 1 + FOOTWORK_LOWER_DIAGRAM_IDS.length) %
                        FOOTWORK_LOWER_DIAGRAM_IDS.length;
                    } else if (event.key === 'Home') {
                      nextIndex = 0;
                    } else if (event.key === 'End') {
                      nextIndex = FOOTWORK_LOWER_DIAGRAM_IDS.length - 1;
                    }
                    if (nextIndex !== null) {
                      event.preventDefault();
                      setActiveDiagramId(FOOTWORK_LOWER_DIAGRAM_IDS[nextIndex]);
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
                  data-testid={`footwork-lower-phase-tab-${phaseId}`}
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
                data-testid="toggle-footwork-trajectory-overlay"
              />
              캐리지·페달·하지 궤적 오버레이
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showTrackingGuide}
                onChange={(e) => setShowTrackingGuide(e.target.checked)}
                data-testid="toggle-footwork-tracking-guide"
              />
              고관절-무릎-2번째 발가락 트래킹 선
            </label>
          </div>
        </div>
      </header>

      {/* Active Interactive Single-Phase SVG + Metrics Bar */}
      <div
        data-testid="footwork-lower-active-stage"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(260px, 1.3fr) minmax(220px, 1fr)',
          gap: 12,
          padding: 12,
          borderRadius: 10,
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          alignItems: 'center',
        }}
      >
        <FootworkLowerPhaseSvg
          diagramId={activeDiagramId}
          phase={activePhase}
          showTrajectoryOverlay={showTrajectoryOverlay}
          showTrackingGuide={showTrackingGuide}
        />
        <div
          data-testid="footwork-lower-kinematic-metrics"
          style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}
        >
          <div>
            <strong>현재 단계:</strong> {activePhaseSpec.badgeKo} ({activePhaseSpec.shortTitleKo})
          </div>
          <div>
            <strong>골반·무릎·발목 좌표:</strong>{' '}
            {`pelvis (${activePhaseSpec.joints.pelvis.x},${activePhaseSpec.joints.pelvis.y}) · knee (${activePhaseSpec.joints.knee.x},${activePhaseSpec.joints.knee.y}) · ankle (${activePhaseSpec.joints.ankle.x},${activePhaseSpec.joints.ankle.y})`}
          </div>
          <div>
            <strong>기구 상태:</strong>{' '}
            {`캐리지 이동 ${activePhaseSpec.apparatusState.carriageOffsetPx}px · 페달 각도 ${activePhaseSpec.apparatusState.pedalAngleDeg}°`}
          </div>
          <div>
            <strong>정렬 불변량:</strong>{' '}
            {`2번째 발가락 트래킹 ${String(activeSpec.kinematicMetrics.secondToeTrackingAligned)} · 골반 수평 ${String(activeSpec.kinematicMetrics.pelvicLevelnessHold)}`}
          </div>
          <div>
            <strong>연결 카탈로그 동작 ({activeSpec.catalogExerciseIds.length}종):</strong>{' '}
            {activeSpec.catalogExerciseIds.join(', ')}
          </div>
        </div>
      </div>

      {/* 3-Phase Triptych Overview */}
      <FootworkLowerTriptychFigure
        diagramId={activeDiagramId}
        selectedPhase={activePhase}
        onSelectPhase={setActivePhase}
        showTrajectoryOverlay={showTrajectoryOverlay}
        showTrackingGuide={showTrackingGuide}
      />

      {/* 4-Up Cross-Group Comparison Strip */}
      {showComparisonStrip && (
        <section
          aria-label="풋워크·하지 4대 그룹 동시 비교 스트립"
          data-testid="footwork-lower-comparison-strip"
          style={{
            padding: 12,
            borderRadius: 10,
            background: '#ffffff',
            border: '1px solid #dcd5c5',
          }}
        >
          <h4 style={{ margin: '0 0 8px', fontSize: 13.5 }}>
            Track I10 4대 그룹 단계별 비교 ({PHASE_TAB_LABELS[activePhase]})
          </h4>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 10,
            }}
          >
            {FOOTWORK_LOWER_DIAGRAM_IDS.map((id) => {
              const spec = FOOTWORK_LOWER_DIAGRAM_SPECS[id];
              return (
                <div
                  key={id}
                  data-testid={`footwork-comparison-item-${id}`}
                  style={{
                    padding: 8,
                    borderRadius: 8,
                    border: id === activeDiagramId ? '1.5px solid #1e293b' : '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                    {spec.nameKo}
                  </div>
                  <FootworkLowerPhaseSvg
                    diagramId={id}
                    phase={activePhase}
                    showTrajectoryOverlay={showTrajectoryOverlay}
                    showTrackingGuide={showTrackingGuide}
                    compact
                    testIdPrefix="footwork-lower-compare-svg"
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
        data-testid="footwork-lower-diagram-legend"
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
        {FOOTWORK_LOWER_DIAGRAM_LEGEND_ITEMS.map((item) => (
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
        data-testid="footwork-lower-source-disclosure"
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
          {String(FOOTWORK_LOWER_SOURCE_LEDGER.truthfulness.anatomicalAccuracyAssumed)} ·
          professionalReviewCount:{' '}
          {FOOTWORK_LOWER_SOURCE_LEDGER.truthfulness.professionalReviewCount} ·
          sourceFrameMappings: {FOOTWORK_LOWER_SOURCE_LEDGER.truthfulness.sourceFrameMappings} ·
          SHA-256: <code>{ledgerEntry.factualRecordSha256.slice(0, 16)}…</code>)
        </p>
        <p style={{ margin: '0 0 6px' }}>{activeSpec.correction.reviewedScopeKo}</p>
        <p style={{ margin: '0 0 6px' }}>{activeSpec.correction.correctionKo}</p>
        <p style={{ margin: '0 0 8px', color: '#475569' }}>
          {FOOTWORK_LOWER_SOURCE_LEDGER.truthfulness.nonMedicalDisclosureKo}
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

export default FootworkLowerDiagramFigure;
