import React, { useId, useState } from 'react';
import {
  computeHumeralArcExcursionDeg,
  getUpperBodyArmDiagramCorrections,
  resolveUpperBodyArmDiagram,
  UPPER_BODY_ARM_DIAGRAM_IDS,
  UPPER_BODY_ARM_DIAGRAM_SPECS,
  UPPER_BODY_ARM_SOURCE_LEDGER,
  type UpperBodyArmDiagramId,
  type UpperBodyArmDiagramSpec,
} from '../data/upperBodyArmDiagramData';
import type { Point2D, VisualPhaseId } from '../data/movementVisualRigCatalog';

export { getUpperBodyArmDiagramCorrections, resolveUpperBodyArmDiagram };

const PHASE_ORDER: readonly VisualPhaseId[] = ['start', 'middle', 'end'];

const PHASE_TAB_LABELS: Readonly<Record<VisualPhaseId, string>> = {
  start: '시작 (Start)',
  middle: '중간 (Middle)',
  end: '끝 (End)',
};

export interface UpperBodyArmPhaseSvgProps {
  readonly diagramId: UpperBodyArmDiagramId;
  readonly phase: VisualPhaseId;
  readonly showVectors?: boolean;
  readonly showCallouts?: boolean;
  readonly compact?: boolean;
}

function polylinePoints(pts: readonly Point2D[]): string {
  return pts.map((p) => `${p.x},${p.y}`).join(' ');
}

export function UpperBodyArmPhaseSvg({
  diagramId,
  phase,
  showVectors = true,
  showCallouts = true,
  compact = false,
}: UpperBodyArmPhaseSvgProps): React.JSX.Element {
  const uid = useId().replace(/:/g, '');
  const spec = UPPER_BODY_ARM_DIAGRAM_SPECS[diagramId];
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

  const activeOverlays = spec.vectorOverlays.filter((v) => v.phaseId === phase);
  const activeCallouts = spec.calloutLabels.filter((c) => c.phaseId === phase);

  return (
    <svg
      viewBox="0 0 320 200"
      role="img"
      aria-label={`${spec.nameKo} · ${phaseSpec.badgeKo} 2D 도해`}
      data-testid={`upper-body-arm-phase-svg-${diagramId}-${phase}`}
      data-diagram-id={diagramId}
      data-phase={phase}
      data-anatomical-accuracy-assumed="false"
      data-professional-review-count="0"
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
          id={`humeral-arrow-${uid}`}
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
          id={`scapular-arrow-${uid}`}
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#2b6a58" />
        </marker>
      </defs>

      {/* Support surface baseline */}
      <g data-layer="support-surface">
        <rect
          x={16}
          y={spec.supportBaselineY - 2}
          width={288}
          height={7}
          rx={3.5}
          fill="#dfd6c3"
          stroke="#9b8b70"
          strokeWidth={1}
        />
        <line
          x1={12}
          y1={spec.supportBaselineY}
          x2={308}
          y2={spec.supportBaselineY}
          stroke="#8c7a5b"
          strokeWidth={1.3}
        />
      </g>

      {/* Humeral & Scapular Vector Arrows */}
      {showVectors && (
        <g data-layer="humeral-scapular-vectors" data-testid={`upper-body-vectors-${diagramId}-${phase}`}>
          {activeOverlays.map((ov) => {
            const isScapular =
              ov.kind === 'scapular-depression-retraction' || ov.kind === 'ribcage-closure-anchor';
            return (
              <g key={ov.id} data-vector-kind={ov.kind}>
                <path
                  d={ov.svgPathD}
                  fill="none"
                  stroke={isScapular ? '#2b6a58' : '#c86d44'}
                  strokeWidth={2}
                  strokeDasharray={ov.kind === 'ribcage-closure-anchor' ? '3 2' : '4 2'}
                  markerEnd={`url(#${isScapular ? 'scapular' : 'humeral'}-arrow-${uid})`}
                />
              </g>
            );
          })}
          {phaseSpec.directionVectors.map((vec) => (
            <polyline
              key={vec.id}
              data-direction-vector={vec.id}
              points={polylinePoints(vec.points)}
              fill="none"
              stroke="#c86d44"
              strokeWidth={1.8}
              strokeDasharray="4 2"
              markerEnd={`url(#humeral-arrow-${uid})`}
            />
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
          strokeWidth={2.8}
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

      {/* Spine & Torso */}
      <path
        data-layer="spine-curve"
        d={spinePathD}
        fill="none"
        stroke="#1e293b"
        strokeWidth={4}
        strokeLinecap="round"
      />

      {/* Near Leg */}
      <polyline
        data-layer="near-leg"
        points={polylinePoints(nearLegPts)}
        fill="none"
        stroke="#0f172a"
        strokeWidth={3.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Near Arm */}
      <polyline
        data-layer="near-arm"
        points={polylinePoints(nearArmPts)}
        fill="none"
        stroke="#c86d44"
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Head */}
      <circle
        cx={joints.head.x}
        cy={joints.head.y}
        r={8.5}
        fill="#f8fafc"
        stroke="#1e293b"
        strokeWidth={2.2}
      />

      {/* Joint Nodes */}
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

      {/* Callout Labels */}
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

export interface UpperBodyArmDiagramFigureProps {
  readonly exerciseId?: string;
  readonly initialDiagramId?: UpperBodyArmDiagramId;
  readonly initialPhase?: VisualPhaseId;
}

export function UpperBodyArmDiagramFigure({
  exerciseId = 'original-reformer-supine-arm-press',
  initialDiagramId = 'supine-and-standing-strap-press',
  initialPhase = 'middle',
}: UpperBodyArmDiagramFigureProps): React.JSX.Element {
  const resolvedSpec = resolveUpperBodyArmDiagram(exerciseId);
  const startingDiagramId = resolvedSpec?.id ?? initialDiagramId;

  const [activeDiagramId, setActiveDiagramId] = useState<UpperBodyArmDiagramId>(startingDiagramId);
  const [activePhase, setActivePhase] = useState<VisualPhaseId>(initialPhase);
  const [showVectors, setShowVectors] = useState<boolean>(true);

  const activeSpec: UpperBodyArmDiagramSpec = UPPER_BODY_ARM_DIAGRAM_SPECS[activeDiagramId];
  const activePhaseSpec = activeSpec.asset.phases[activePhase];
  const excursionDeg = computeHumeralArcExcursionDeg(activeSpec);

  return (
    <section
      aria-label="상지 스트랩·로잉·암 아크 3단계 2D 도해"
      data-testid="upper-body-arm-diagram-figure"
      data-exercise-id={exerciseId}
      data-diagram-id={activeDiagramId}
      data-phase={activePhase}
      data-anatomical-accuracy-assumed="false"
      data-professional-review-count="0"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: 16,
        borderRadius: 14,
        background: '#f7f4ec',
        border: '1px solid #dfd7c6',
        color: '#1e293b',
      }}
    >
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
                background: '#fef3c7',
                color: '#92400e',
                marginBottom: 4,
              }}
            >
              Track I11 · 상지 스트랩 프레스 · 시티드 로우 · 체스트 익스팬션 2D 도해
            </span>
            <h3 style={{ margin: 0, fontSize: 17 }}>{activeSpec.nameKo}</h3>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#475569' }}>
              {activeSpec.subtitleKo}
            </p>
          </div>

          {/* Group Selector WAI-ARIA Tablist */}
          <div
            role="tablist"
            aria-label="상지 동작 그룹 선택"
            style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}
          >
            {UPPER_BODY_ARM_DIAGRAM_IDS.map((id, index) => {
              const spec = UPPER_BODY_ARM_DIAGRAM_SPECS[id];
              const selected = id === activeDiagramId;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  tabIndex={selected ? 0 : -1}
                  data-testid={`upper-body-group-tab-${id}`}
                  onClick={() => setActiveDiagramId(id)}
                  onKeyDown={(event) => {
                    let nextIndex: number | null = null;
                    if (event.key === 'ArrowRight') {
                      nextIndex = (index + 1) % UPPER_BODY_ARM_DIAGRAM_IDS.length;
                    } else if (event.key === 'ArrowLeft') {
                      nextIndex =
                        (index - 1 + UPPER_BODY_ARM_DIAGRAM_IDS.length) %
                        UPPER_BODY_ARM_DIAGRAM_IDS.length;
                    } else if (event.key === 'Home') {
                      nextIndex = 0;
                    } else if (event.key === 'End') {
                      nextIndex = UPPER_BODY_ARM_DIAGRAM_IDS.length - 1;
                    }
                    if (nextIndex !== null) {
                      event.preventDefault();
                      setActiveDiagramId(UPPER_BODY_ARM_DIAGRAM_IDS[nextIndex]);
                      const tabButtons =
                        event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                          '[role="tab"]',
                        );
                      tabButtons?.[nextIndex]?.focus();
                    }
                  }}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 8,
                    border: selected ? '2px solid #1e293b' : '1px solid #cbd5e1',
                    background: selected ? '#1e293b' : '#ffffff',
                    color: selected ? '#ffffff' : '#1e293b',
                    fontSize: 12,
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

        {/* Phase WAI-ARIA Tablist & Vector Toggle */}
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
                  data-testid={`upper-body-phase-tab-${phaseId}`}
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

          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showVectors}
              onChange={(e) => setShowVectors(e.target.checked)}
              data-testid="toggle-upper-body-vectors"
            />
            상완·견갑 벡터 화살표 표시
          </label>
        </div>
      </header>

      {/* Kinematic Metrics Summary Bar */}
      <div
        data-testid="upper-body-kinematic-metrics-bar"
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
          <strong>상완골 가동 아크:</strong>{' '}
          {`${activeSpec.kinematicMetrics.startHumeralFlexionDeg}° → ${activeSpec.kinematicMetrics.middleHumeralTargetDeg}° (Δ${excursionDeg}°)`}
        </div>
        <div>
          <strong>견갑 하강·안정 지표:</strong>{' '}
          {`하강 Δ${activeSpec.kinematicMetrics.scapularDepressionDeltaPx}px · 흉곽 y=${activeSpec.kinematicMetrics.ribcageAnchorY}px`}
        </div>
        <div>
          <strong>매핑된 카탈로그 동작:</strong> {activeSpec.mappedExerciseIds.length}종
        </div>
      </div>

      {/* 3-Phase Triptych Cards */}
      <div
        data-testid={`upper-body-triptych-${activeDiagramId}`}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
        }}
      >
        {PHASE_ORDER.map((phaseId) => {
          const phaseSpec = activeSpec.asset.phases[phaseId];
          const isSelected = activePhase === phaseId;
          return (
            <div
              key={phaseId}
              data-testid={`upper-body-triptych-card-${activeDiagramId}-${phaseId}`}
              onClick={() => setActivePhase(phaseId)}
              style={{
                padding: 10,
                borderRadius: 10,
                border: isSelected ? '2px solid #2b6a58' : '1px solid #dcd5c5',
                background: isSelected ? '#f3f8f5' : '#ffffff',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <strong style={{ fontSize: 12, color: '#1e293b' }}>{PHASE_TAB_LABELS[phaseId]}</strong>
                <span style={{ fontSize: 11, color: '#475569' }}>{phaseSpec.shortTitleKo}</span>
              </div>
              <UpperBodyArmPhaseSvg
                diagramId={activeDiagramId}
                phase={phaseId}
                showVectors={showVectors}
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

      {/* Source Verification & Truthfulness Disclosure */}
      <footer
        data-testid="upper-body-source-verification-summary"
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
          출처 검증 요약 및 비의료·비검증 고지 (anatomicalAccuracyAssumed:{' '}
          {String(UPPER_BODY_ARM_SOURCE_LEDGER.anatomicalAccuracyAssumed)} · professionalReviewCount:{' '}
          {UPPER_BODY_ARM_SOURCE_LEDGER.professionalReviewCount} · sourceFrameMappings:{' '}
          {UPPER_BODY_ARM_SOURCE_LEDGER.sourceFrameMappings} · SHA-256:{' '}
          <code>{activeSpec.ledgerEntry.factualRecordSha256.slice(0, 16)}…</code>)
        </p>
        <p style={{ margin: '0 0 6px' }}>{activeSpec.correction.reviewedScopeKo}</p>
        <p style={{ margin: '0 0 6px' }}>{activeSpec.correction.correctionKo}</p>
        <p style={{ margin: '0 0 8px', color: '#475569' }}>
          {UPPER_BODY_ARM_SOURCE_LEDGER.truthfulness.nonMedicalDisclosureKo}
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

export default UpperBodyArmDiagramFigure;
