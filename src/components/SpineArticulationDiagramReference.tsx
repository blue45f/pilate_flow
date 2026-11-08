import React, { useState } from 'react';
import {
  getSpineArticulationDiagramSpec,
  resolveSpineArticulationDiagramByExerciseId,
  SPINE_ARTICULATION_DIAGRAM_SPECS,
  SPINE_TRUTHFULNESS_METADATA,
  type SpineArticulationDiagramSpec,
  type SpineArticulationId,
  type VisualPhaseId,
} from '../data/spineArticulationDiagramData';
import {
  SpineArticulationDiagramSvg,
  SpineArticulationLegend,
  SpineArticulationTriptychSvg,
} from './SpineArticulationDiagramSvg';
import '../styles/spine-articulation-diagram.css';

export interface SpineArticulationDiagramReferenceProps {
  movementId?: SpineArticulationId | string;
  initialPhase?: VisualPhaseId;
  allowArchetypeSwitch?: boolean;
  mirrored?: boolean;
  showTriptych?: boolean;
}

const ARCHETYPE_IDS: readonly SpineArticulationId[] = [
  'spine-roll-up',
  'spine-roll-down',
  'spine-stretch',
];

const PHASE_IDS: readonly VisualPhaseId[] = ['start', 'middle', 'end'];

export function SpineArticulationDiagramReference({
  movementId = 'spine-roll-up',
  initialPhase = 'start',
  allowArchetypeSwitch = true,
  mirrored = false,
  showTriptych = true,
}: SpineArticulationDiagramReferenceProps): React.JSX.Element {
  const initialSpec =
    resolveSpineArticulationDiagramByExerciseId(movementId) ??
    getSpineArticulationDiagramSpec('spine-roll-up');

  const [selectedArchetype, setSelectedArchetype] = useState<SpineArticulationId>(
    initialSpec.archetypeId,
  );
  const [activePhase, setActivePhase] = useState<VisualPhaseId>(initialPhase);

  const spec: SpineArticulationDiagramSpec = allowArchetypeSwitch
    ? SPINE_ARTICULATION_DIAGRAM_SPECS[selectedArchetype]
    : initialSpec;
  const phaseSpec = spec.phases[activePhase];

  return (
    <section
      className="spine-diagram-reference"
      aria-label={`${spec.nameKo} 2D 척추 분절 도해 레퍼런스`}
      data-testid="spine-articulation-diagram-reference"
      data-archetype-id={spec.archetypeId}
      data-active-phase={activePhase}
    >
      <header className="spine-diagram-header">
        <div className="spine-diagram-title-block">
          <span className="spine-diagram-eyebrow">
            Track I1 · 2D 척추 분절 도해 (6분절 C7~S1 체인)
          </span>
          <h3 className="spine-diagram-title">
            {spec.nameKo} <span className="spine-diagram-title-en">({spec.nameEn})</span>
          </h3>
          <p className="spine-diagram-subtitle">{spec.subtitleKo}</p>
        </div>

        {allowArchetypeSwitch && (
          <div
            className="spine-archetype-switcher"
            role="tablist"
            aria-label="척추 분절 대표 동작 선택"
          >
            {ARCHETYPE_IDS.map((id) => {
              const item = SPINE_ARTICULATION_DIAGRAM_SPECS[id];
              const isCurrent = spec.archetypeId === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={isCurrent}
                  className={`spine-archetype-tab ${isCurrent ? 'is-active' : ''}`}
                  onClick={() => setSelectedArchetype(id)}
                  data-testid={`spine-archetype-tab-${id}`}
                >
                  {item.nameKo}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Interactive 3-Phase Tabs */}
      <div
        className="spine-phase-tabs"
        role="tablist"
        aria-label={`${spec.nameKo} 3단계 자세 선택`}
      >
        {PHASE_IDS.map((phaseId) => {
          const itemPhase = spec.phases[phaseId];
          const isCurrent = activePhase === phaseId;
          return (
            <button
              key={phaseId}
              type="button"
              role="tab"
              aria-selected={isCurrent}
              className={`spine-phase-tab ${isCurrent ? 'is-active' : ''}`}
              onClick={() => setActivePhase(phaseId)}
              data-testid={`spine-phase-tab-${phaseId}`}
            >
              <span className="spine-phase-tab-badge">{itemPhase.badgeKo}</span>
              <span className="spine-phase-tab-title">{itemPhase.shortTitleKo}</span>
            </button>
          );
        })}
      </div>

      {/* Primary Single-Phase SVG + Cue Summary */}
      <div className="spine-primary-stage">
        <div className="spine-primary-canvas">
          <SpineArticulationDiagramSvg
            spec={spec}
            phase={activePhase}
            mirrored={mirrored}
            showAlignment
            showDirection
            showVertebraLabels
            showGhostStartPose
          />
        </div>

        <div className="spine-phase-details" data-testid="spine-phase-details">
          <div className="spine-phase-meta-badges">
            <span className="spine-meta-pill">매트 기준선 y={spec.matBaselineY}</span>
            {spec.wallPlumbLineX !== null && (
              <span
                className="spine-meta-pill is-wall"
                data-testid="spine-wall-plumb-pill"
              >
                가상 수직벽 플럼라인 x={spec.wallPlumbLineX}
              </span>
            )}
          </div>

          <h4 className="spine-phase-heading">{phaseSpec.shortTitleKo}</h4>
          <p className="spine-phase-summary">{phaseSpec.summaryKo}</p>

          <dl className="spine-cue-grid">
            <div>
              <dt>분절 초점 (C7~S1)</dt>
              <dd>{phaseSpec.articulationFocusKo}</dd>
            </div>
            <div>
              <dt>양방향 대조 (Opposition)</dt>
              <dd>{phaseSpec.oppositionCueKo}</dd>
            </div>
            <div>
              <dt>호흡 가이드</dt>
              <dd>{phaseSpec.breathCueKo}</dd>
            </div>
            <div>
              <dt>고정 앵커 (불변 지지점)</dt>
              <dd>{spec.poseDeltaSummary.invariantAnchorsKo}</dd>
            </div>
          </dl>

          {/* 6-Point Vertebral Coordinate Readout */}
          <div className="spine-vertebra-readout" data-testid="spine-vertebra-readout">
            <strong className="spine-readout-title">
              6분절 척추 체인 좌표 ({activePhase.toUpperCase()})
            </strong>
            <ul className="spine-vertebra-list">
              {phaseSpec.spinePoints.map((pt) => (
                <li
                  key={pt.id}
                  className="spine-vertebra-chip"
                  data-testid={`spine-chip-${pt.id}`}
                >
                  <span className="spine-chip-code">{pt.segmentLabel}</span>
                  <span className="spine-chip-coord">
                    ({pt.point.x}, {pt.point.y})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <SpineArticulationLegend />

      {/* 3-Up Phase Triptych Strip */}
      {showTriptych && (
        <div className="spine-triptych-section">
          <h4 className="spine-section-subtitle">
            3단계(Start · Middle · End) 연속 분절 비교
          </h4>
          <SpineArticulationTriptychSvg
            spec={spec}
            selectedPhase={activePhase}
            onSelectPhase={setActivePhase}
            mirrored={mirrored}
          />
        </div>
      )}

      {/* Source Disclosure & Prior Defect Correction */}
      <details className="spine-source-disclosure" open data-testid="spine-source-disclosure">
        <summary>공개 교본 출처 및 도해 교정 내역</summary>
        <div className="spine-source-body">
          <p className="spine-correction-note">
            <strong>교정 요약:</strong> {spec.correctionSummaryKo}
          </p>
          <p className="spine-reviewed-scope">{spec.reviewedScopeKo}</p>
          <ul className="spine-source-list" data-testid="spine-source-list">
            {spec.sources.map((src) => (
              <li key={src.id} className="spine-source-item">
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`spine-source-link-${src.id}`}
                >
                  {src.title}
                </a>
                <span className="spine-source-org">
                  {' '}
                  · {src.organization} ({src.licenseOrDomainNote})
                </span>
                <p className="spine-source-aspect">{src.verifiedAspectKo}</p>
              </li>
            ))}
          </ul>
        </div>
      </details>

      {/* Non-Medical & Truthfulness Notice */}
      <footer
        className="spine-truthfulness-footer"
        data-testid="spine-non-medical-notice"
      >
        <p className="spine-non-medical-text">
          {SPINE_TRUTHFULNESS_METADATA.nonMedicalNoticeKo}
        </p>
        <p className="spine-limitation-text">
          {SPINE_TRUTHFULNESS_METADATA.scopeLimitationKo} · {spec.limitationKo}
        </p>
      </footer>
    </section>
  );
}

export function SpineI7IntegrationExample({
  exerciseId = 'ex-spine-01',
}: {
  exerciseId?: string;
}): React.JSX.Element {
  return (
    <div data-testid="spine-i7-integration-example">
      <SpineArticulationDiagramReference
        movementId={exerciseId}
        allowArchetypeSwitch={false}
      />
    </div>
  );
}
