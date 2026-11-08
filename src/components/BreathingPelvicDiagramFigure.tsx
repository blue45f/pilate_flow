import React, { useId, useState } from 'react';
import {
  BREATHING_PELVIC_DIAGRAM_IDS,
  BREATHING_PELVIC_DIAGRAM_LEGEND_ITEMS,
  BREATHING_PELVIC_DIAGRAM_SPECS,
  BREATHING_PELVIC_SOURCE_LEDGER,
  resolveBreathingPelvicDiagram,
  type BreathingPelvicDiagramId,
  type BreathingPelvicDiagramSpec,
} from '../data/breathingPelvicDiagramData';
import type { Point2D, VisualPhaseId } from '../data/movementVisualRigCatalog';

// eslint-disable-next-line react-refresh/only-export-components
export { resolveBreathingPelvicDiagram };

const PHASE_ORDER: readonly VisualPhaseId[] = ['start', 'middle', 'end'];

const PHASE_TAB_LABELS: Readonly<Record<VisualPhaseId, string>> = {
  start: '시작 (Start)',
  middle: '중간 (Middle)',
  end: '끝 (End)',
};

export interface BreathingPelvicPhaseSvgProps {
  readonly diagramId: BreathingPelvicDiagramId;
  readonly phase: VisualPhaseId;
  readonly showTrajectoryOverlay?: boolean;
  readonly showAnchorGuide?: boolean;
  readonly showCallouts?: boolean;
  readonly compact?: boolean;
  readonly testIdPrefix?: string;
  readonly className?: string;
}

function polylinePoints(pts: readonly Point2D[]): string {
  return pts.map((p) => `${p.x},${p.y}`).join(' ');
}

export function BreathingPelvicPhaseSvg({
  diagramId,
  phase,
  showTrajectoryOverlay = true,
  showAnchorGuide = true,
  showCallouts = true,
  compact = false,
  testIdPrefix = 'breathing-pelvic-phase-svg',
  className,
}: BreathingPelvicPhaseSvgProps): React.JSX.Element {
  const uid = useId();
  const spec = BREATHING_PELVIC_DIAGRAM_SPECS[diagramId];
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
  const isUpright = diagramId === 'breathing-seated-standing-expansion';

  return (
    <svg
      viewBox="0 0 320 200"
      role="img"
      aria-label={`${spec.nameKo} · ${phaseSpec.badgeKo} 2D 도해`}
      data-testid={`${testIdPrefix}-${diagramId}-${phase}`}
      data-diagram-id={diagramId}
      data-phase={phase}
      data-sacral-y={joints.pelvis.y}
      data-lumbar-y={joints.lumbar.y}
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
          id={`bp-arrow-${uid}`}
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#0284c7" />
        </marker>
        <marker
          id={`bp-clock-arrow-${uid}`}
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

      {/* Apparatus / Mat Support Surface */}
      <g data-layer="support-surface" data-testid={`apparatus-support-${diagramId}-${phase}`}>
        {isUpright ? (
          <>
            {/* Wunda Chair Seat & Floor Baseline */}
            <rect
              x={110}
              y={108}
              width={48}
              height={68}
              rx={4}
              fill="#e7dec8"
              stroke="#8c7a5b"
              strokeWidth={1.2}
            />
            <rect
              x={106}
              y={104}
              width={56}
              height={6}
              rx={3}
              fill="#cbb994"
              stroke="#786648"
              strokeWidth={1}
            />
            <line
              x1={16}
              y1={spec.matBaselineY}
              x2={304}
              y2={spec.matBaselineY}
              stroke="#8c7a5b"
              strokeWidth={1.6}
            />
          </>
        ) : (
          <>
            <rect
              x={16}
              y={146}
              width={288}
              height={8}
              rx={4}
              fill="#dfd6c3"
              stroke="#9b8b70"
              strokeWidth={1}
            />
            <line
              x1={12}
              y1={spec.matBaselineY}
              x2={308}
              y2={spec.matBaselineY}
              stroke="#8c7a5b"
              strokeWidth={1.4}
            />
          </>
        )}
      </g>

      {/* Sacral / Sit-bone / Plumb Anchor Guide */}
      {showAnchorGuide && (
        <g
          data-layer="sacral-anchor-guide"
          data-testid={`sacral-anchor-guide-${diagramId}-${phase}`}
        >
          {isUpright ? (
            <>
              <line
                x1={joints.pelvis.x}
                y1={16}
                x2={joints.pelvis.x}
                y2={176}
                stroke="#7c3aed"
                strokeWidth={1.4}
                strokeDasharray="4 3"
              />
              <circle
                cx={joints.pelvis.x}
                cy={joints.pelvis.y}
                r={4.2}
                fill="#2b6a58"
                stroke="#ffffff"
                strokeWidth={1.2}
              />
            </>
          ) : (
            <>
              <rect
                x={joints.thoracic.x - 6}
                y={140}
                width={joints.pelvis.x - joints.thoracic.x + 16}
                height={7}
                rx={3}
                fill="rgba(43, 106, 88, 0.22)"
                stroke="#2b6a58"
                strokeWidth={1.2}
              />
              <circle
                cx={joints.pelvis.x}
                cy={joints.pelvis.y}
                r={4.2}
                fill="#2b6a58"
                stroke="#ffffff"
                strokeWidth={1.2}
              />
            </>
          )}
          {!compact && (
            <text x={24} y={188} fontSize={8.5} fill="#2b6a58" fontWeight={600}>
              {isUpright
                ? `좌골 앵커(y=${joints.pelvis.y}) · 양발 삼각대(y=${joints.heel.y}) · 수직 추선(x=${joints.pelvis.x})`
                : `천골 앵커(y=${joints.pelvis.y}) · 요추(y=${joints.lumbar.y}) · 흉곽(y=${joints.thoracic.y})`}
            </text>
          )}
        </g>
      )}

      {/* Trajectory Overlays (3D Ribcage Breath Ring / Upright Column / Pelvic Clock Dial) */}
      {showTrajectoryOverlay && (
        <g
          data-layer="trajectory-overlays"
          data-testid={`trajectory-overlay-${diagramId}-${phase}`}
        >
          {diagramId === 'breathing-supine-diaphragmatic' && (
            <g data-overlay-kind="lateral-posterior-rib-expansion">
              <ellipse
                cx={joints.thoracic.x}
                cy={joints.thoracic.y}
                rx={phase === 'middle' ? 22 : 16}
                ry={phase === 'middle' ? 12 : 8}
                fill="rgba(2, 132, 199, 0.12)"
                stroke="#0284c7"
                strokeWidth={1.6}
                strokeDasharray="3 2"
              />
              <line
                x1={joints.thoracic.x}
                y1={joints.thoracic.y + 8}
                x2={joints.thoracic.x}
                y2={joints.thoracic.y - 12}
                stroke="#0284c7"
                strokeWidth={1.8}
                markerEnd={`url(#bp-arrow-${uid})`}
              />
            </g>
          )}

          {diagramId === 'breathing-seated-standing-expansion' && (
            <g data-overlay-kind="axial-column-breath">
              <ellipse
                cx={joints.thoracic.x}
                cy={joints.thoracic.y}
                rx={phase === 'middle' ? 18 : 13}
                ry={phase === 'middle' ? 14 : 10}
                fill="rgba(2, 132, 199, 0.12)"
                stroke="#0284c7"
                strokeWidth={1.6}
                strokeDasharray="3 2"
              />
              <line
                x1={joints.head.x}
                y1={joints.head.y + 8}
                x2={joints.head.x}
                y2={joints.head.y - 10}
                stroke="#0284c7"
                strokeWidth={1.8}
                markerEnd={`url(#bp-arrow-${uid})`}
              />
            </g>
          )}

          {diagramId === 'pelvic-clock-and-imprint-rock' && (
            <g data-overlay-kind="pelvic-clock-12-to-6-rock">
              <circle
                cx={joints.pelvis.x}
                cy={joints.pelvis.y - 4}
                r={16}
                fill="rgba(200, 109, 68, 0.12)"
                stroke="#c86d44"
                strokeWidth={1.5}
                strokeDasharray="3 2"
              />
              <path
                d="M 184 134 Q 168 120 154 136"
                fill="none"
                stroke="#c86d44"
                strokeWidth={1.8}
                markerStart={`url(#bp-clock-arrow-${uid})`}
                markerEnd={`url(#bp-clock-arrow-${uid})`}
              />
              {!compact && (
                <text x={152} y={116} fontSize={8} fill="#c86d44" fontWeight={700}>
                  12시↔6시 골반 시계 (±8°–12°)
                </text>
              )}
            </g>
          )}
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
            r={4.4}
            fill="rgba(43, 106, 88, 0.28)"
            stroke="#2b6a58"
            strokeWidth={1.5}
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

export interface BreathingPelvicTriptychFigureProps {
  readonly diagramId: BreathingPelvicDiagramId;
  readonly selectedPhase?: VisualPhaseId;
  readonly onSelectPhase?: (phase: VisualPhaseId) => void;
  readonly showTrajectoryOverlay?: boolean;
  readonly showAnchorGuide?: boolean;
}

export function BreathingPelvicTriptychFigure({
  diagramId,
  selectedPhase = 'middle',
  onSelectPhase,
  showTrajectoryOverlay = true,
  showAnchorGuide = true,
}: BreathingPelvicTriptychFigureProps): React.JSX.Element {
  const spec = BREATHING_PELVIC_DIAGRAM_SPECS[diagramId];

  return (
    <div
      data-testid={`breathing-pelvic-triptych-${diagramId}`}
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
            data-testid={`breathing-pelvic-triptych-card-${diagramId}-${phaseId}`}
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
            <BreathingPelvicPhaseSvg
              diagramId={diagramId}
              phase={phaseId}
              showTrajectoryOverlay={showTrajectoryOverlay}
              showAnchorGuide={showAnchorGuide}
              testIdPrefix="breathing-pelvic-triptych-svg"
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

export interface BreathingPelvicDiagramFigureProps {
  readonly exerciseId?: string;
  readonly initialDiagramId?: BreathingPelvicDiagramId;
  readonly initialPhase?: VisualPhaseId;
  readonly showComparisonStrip?: boolean;
}

export function BreathingPelvicDiagramFigure({
  exerciseId = 'ex-warmup-01',
  initialDiagramId = 'breathing-supine-diaphragmatic',
  initialPhase = 'middle',
  showComparisonStrip = true,
}: BreathingPelvicDiagramFigureProps): React.JSX.Element {
  const resolvedInitial =
    (exerciseId ? resolveBreathingPelvicDiagram(exerciseId)?.id : null) ?? initialDiagramId;

  const [activeDiagramId, setActiveDiagramId] =
    useState<BreathingPelvicDiagramId>(resolvedInitial);
  const [activePhase, setActivePhase] = useState<VisualPhaseId>(initialPhase);
  const [showTrajectoryOverlay, setShowTrajectoryOverlay] = useState<boolean>(true);
  const [showAnchorGuide, setShowAnchorGuide] = useState<boolean>(true);

  const activeSpec: BreathingPelvicDiagramSpec = BREATHING_PELVIC_DIAGRAM_SPECS[activeDiagramId];
  const activePhaseSpec = activeSpec.asset.phases[activePhase];
  const ledgerEntry = BREATHING_PELVIC_SOURCE_LEDGER.entries[activeDiagramId];

  return (
    <section
      aria-label="호흡·센터링·골반 시계 3대 동작 2D 도해"
      data-testid="breathing-pelvic-diagram-figure"
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
              Track I9 · 호흡·센터링 & 골반 시계/록 2D 키네마틱 도해 (10개 동작 커버)
            </span>
            <h3 style={{ margin: 0, fontSize: 18 }}>{activeSpec.nameKo}</h3>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#475569' }}>
              {activeSpec.subtitleKo}
            </p>
          </div>

          <div
            role="tablist"
            aria-label="호흡 및 골반 동작 그룹 선택"
            style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}
          >
            {BREATHING_PELVIC_DIAGRAM_IDS.map((id, index) => {
              const spec = BREATHING_PELVIC_DIAGRAM_SPECS[id];
              const selected = id === activeDiagramId;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  tabIndex={selected ? 0 : -1}
                  data-testid={`breathing-pelvic-movement-tab-${id}`}
                  onClick={() => setActiveDiagramId(id)}
                  onKeyDown={(event) => {
                    let nextIndex: number | null = null;
                    if (event.key === 'ArrowRight') {
                      nextIndex = (index + 1) % BREATHING_PELVIC_DIAGRAM_IDS.length;
                    } else if (event.key === 'ArrowLeft') {
                      nextIndex =
                        (index - 1 + BREATHING_PELVIC_DIAGRAM_IDS.length) %
                        BREATHING_PELVIC_DIAGRAM_IDS.length;
                    } else if (event.key === 'Home') {
                      nextIndex = 0;
                    } else if (event.key === 'End') {
                      nextIndex = BREATHING_PELVIC_DIAGRAM_IDS.length - 1;
                    }
                    if (nextIndex !== null) {
                      event.preventDefault();
                      setActiveDiagramId(BREATHING_PELVIC_DIAGRAM_IDS[nextIndex]);
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
                  data-testid={`breathing-pelvic-phase-tab-${phaseId}`}
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
                data-testid="toggle-breathing-trajectory-overlay"
              />
              호흡·골반 시계 궤적 오버레이
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showAnchorGuide}
                onChange={(e) => setShowAnchorGuide(e.target.checked)}
                data-testid="toggle-breathing-anchor-guide"
              />
              천골·좌골 앵커 가이드
            </label>
          </div>
        </div>
      </header>

      {/* Active Interactive Single-Phase SVG + Metrics Bar */}
      <div
        data-testid="breathing-pelvic-active-stage"
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
        <BreathingPelvicPhaseSvg
          diagramId={activeDiagramId}
          phase={activePhase}
          showTrajectoryOverlay={showTrajectoryOverlay}
          showAnchorGuide={showAnchorGuide}
        />
        <div
          data-testid="breathing-pelvic-kinematic-metrics"
          style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}
        >
          <div>
            <strong>현재 단계:</strong> {activePhaseSpec.badgeKo} ({activePhaseSpec.shortTitleKo})
          </div>
          <div>
            <strong>천골·골반 앵커:</strong>{' '}
            {`pelvis y=${activePhaseSpec.joints.pelvis.y}px · lumbar y=${activePhaseSpec.joints.lumbar.y}px`}
          </div>
          <div>
            <strong>흉곽·호흡 변위:</strong>{' '}
            {`thoracic y=${activePhaseSpec.joints.thoracic.y}px (Δ${activeSpec.kinematicMetrics.ribcageExpansionDeltaPx}px)`}
          </div>
          <div>
            <strong>골반 경사 & 요추 보호:</strong>{' '}
            {`±${activeSpec.kinematicMetrics.pelvicTiltRangeDeg[0]}°–${activeSpec.kinematicMetrics.pelvicTiltRangeDeg[1]}° · 요추 과신전 ${activeSpec.kinematicMetrics.lumbarHyperextensionDeg}°`}
          </div>
          <div>
            <strong>연결 카탈로그 동작 ({activeSpec.catalogExerciseIds.length}종):</strong>{' '}
            {activeSpec.catalogExerciseIds.join(', ')}
          </div>
        </div>
      </div>

      {/* 3-Phase Triptych Overview */}
      <BreathingPelvicTriptychFigure
        diagramId={activeDiagramId}
        selectedPhase={activePhase}
        onSelectPhase={setActivePhase}
        showTrajectoryOverlay={showTrajectoryOverlay}
        showAnchorGuide={showAnchorGuide}
      />

      {/* 3-Up Cross-Group Comparison Strip */}
      {showComparisonStrip && (
        <section
          aria-label="호흡·골반 3대 그룹 동시 비교 스트립"
          data-testid="breathing-pelvic-comparison-strip"
          style={{
            padding: 12,
            borderRadius: 10,
            background: '#ffffff',
            border: '1px solid #dcd5c5',
          }}
        >
          <h4 style={{ margin: '0 0 8px', fontSize: 13.5 }}>
            Track I9 3대 그룹 단계별 비교 ({PHASE_TAB_LABELS[activePhase]})
          </h4>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 10,
            }}
          >
            {BREATHING_PELVIC_DIAGRAM_IDS.map((id) => {
              const spec = BREATHING_PELVIC_DIAGRAM_SPECS[id];
              return (
                <div
                  key={id}
                  data-testid={`breathing-comparison-item-${id}`}
                  style={{
                    padding: 8,
                    borderRadius: 8,
                    border: id === activeDiagramId ? '1.5px solid #1e293b' : '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                    {spec.nameKo}
                  </div>
                  <BreathingPelvicPhaseSvg
                    diagramId={id}
                    phase={activePhase}
                    showTrajectoryOverlay={showTrajectoryOverlay}
                    showAnchorGuide={showAnchorGuide}
                    compact
                    testIdPrefix="breathing-pelvic-compare-svg"
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
        data-testid="breathing-pelvic-diagram-legend"
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
        {BREATHING_PELVIC_DIAGRAM_LEGEND_ITEMS.map((item) => (
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
        data-testid="breathing-pelvic-source-disclosure"
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
          {String(BREATHING_PELVIC_SOURCE_LEDGER.truthfulness.anatomicalAccuracyAssumed)} ·
          professionalReviewCount:{' '}
          {BREATHING_PELVIC_SOURCE_LEDGER.truthfulness.professionalReviewCount} ·
          sourceFrameMappings: {BREATHING_PELVIC_SOURCE_LEDGER.truthfulness.sourceFrameMappings} ·
          SHA-256: <code>{ledgerEntry.factualRecordSha256.slice(0, 16)}…</code>)
        </p>
        <p style={{ margin: '0 0 6px' }}>{activeSpec.correction.reviewedScopeKo}</p>
        <p style={{ margin: '0 0 6px' }}>{activeSpec.correction.correctionKo}</p>
        <p style={{ margin: '0 0 8px', color: '#475569' }}>
          {BREATHING_PELVIC_SOURCE_LEDGER.truthfulness.nonMedicalDisclosureKo}
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

export default BreathingPelvicDiagramFigure;
