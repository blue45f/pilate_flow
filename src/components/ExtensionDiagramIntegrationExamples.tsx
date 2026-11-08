import React, { useState } from 'react';
import type { VisualPhaseId } from '../data/movementVisualRigCatalog';
import {
  EXTENSION_MEDICAL_AND_REVIEW_POLICY,
  type ExtensionMovementId,
} from '../data/extensionDiagramSources';
import {
  EXTENSION_ARCHETYPE_KEYS,
  EXTENSION_MOVEMENT_IDS,
  EXTENSION_MOVEMENT_SPECS,
  getExtensionCatalogVisualAssets,
  getExtensionDiagramCorrections,
} from '../data/extensionMovementData';
import { verifyExtensionMovementSpec } from '../models/extensionMovementModel';
import {
  ExtensionMovementDiagram,
  ExtensionMovementTriptych,
} from './ExtensionMovementDiagram';

export interface ExtensionDiagramIntegrationExamplesProps {
  readonly initialMovementId?: ExtensionMovementId;
  readonly initialPhase?: VisualPhaseId;
  readonly className?: string;
}

export function ExtensionDiagramIntegrationExamples({
  initialMovementId = 'original-mat-swan-prep',
  initialPhase = 'middle',
  className,
}: ExtensionDiagramIntegrationExamplesProps): React.JSX.Element {
  const [selectedMovementId, setSelectedMovementId] =
    useState<ExtensionMovementId>(initialMovementId);
  const [selectedPhase, setSelectedPhase] = useState<VisualPhaseId>(initialPhase);
  const [showCounterExample, setShowCounterExample] = useState(false);
  const [activeSide, setActiveSide] = useState<'right' | 'left'>('right');
  const [mirrored, setMirrored] = useState(false);

  const spec = EXTENSION_MOVEMENT_SPECS[selectedMovementId];
  const specVerification = verifyExtensionMovementSpec(spec);
  const catalogAssets = getExtensionCatalogVisualAssets();
  const corrections = getExtensionDiagramCorrections();
  const activeCorrection = corrections[selectedMovementId];

  return (
    <section
      className={className}
      aria-label="신전(스완 · 스위밍 패밀리) 2D 도해 통합 예시"
      data-component="extension-diagram-integration-examples"
    >
      <header style={{ marginBottom: '12px' }}>
        <h2>신전 패밀리 2D 도해 (Track I5 · 8종 동작 & 2종 아키타입)</h2>
        <p data-testid="extension-policy-notice">
          {EXTENSION_MEDICAL_AND_REVIEW_POLICY.noticeKo}
        </p>
        <p data-testid="extension-policy-limitation">
          {EXTENSION_MEDICAL_AND_REVIEW_POLICY.limitationKo}
        </p>
      </header>

      <div
        role="group"
        aria-label="신전 동작 선택"
        style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}
      >
        {EXTENSION_MOVEMENT_IDS.map((movementId) => {
          const item = EXTENSION_MOVEMENT_SPECS[movementId];
          const isCurrent = movementId === selectedMovementId;
          return (
            <button
              key={movementId}
              type="button"
              data-movement-button={movementId}
              aria-pressed={isCurrent}
              onClick={() => setSelectedMovementId(movementId)}
            >
              {item.nameKo}
            </button>
          );
        })}
      </div>

      <div
        role="group"
        aria-label="도해 보기 옵션"
        style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}
      >
        <button
          type="button"
          data-testid="toggle-counter-example"
          aria-pressed={showCounterExample}
          onClick={() => setShowCounterExample((prev) => !prev)}
        >
          {showCounterExample ? '정상 정렬 보기' : '요추 과신전 반례 보기'}
        </button>

        {spec.isUnilateral && (
          <button
            type="button"
            data-testid="toggle-active-side"
            onClick={() =>
              setActiveSide((prev) => (prev === 'right' ? 'left' : 'right'))
            }
          >
            가동 대각선 전환 ({activeSide === 'right' ? '우측 기준' : '좌측 기준'})
          </button>
        )}

        <button
          type="button"
          data-testid="toggle-mirror"
          aria-pressed={mirrored}
          onClick={() => setMirrored((prev) => !prev)}
        >
          좌우 반전 ({mirrored ? 'ON' : 'OFF'})
        </button>
      </div>

      <ExtensionMovementTriptych
        movementId={selectedMovementId}
        selectedPhase={selectedPhase}
        onSelectPhase={setSelectedPhase}
        activeSide={activeSide}
        mirrored={mirrored}
        showCounterExample={showCounterExample}
      />

      <div
        data-testid="extension-selected-detail"
        style={{ marginTop: '14px', display: 'grid', gap: '10px' }}
      >
        <ExtensionMovementDiagram
          movementId={selectedMovementId}
          phase={selectedPhase}
          activeSide={activeSide}
          mirrored={mirrored}
          showCounterExample={showCounterExample}
          showDisclosures
        />

        <div data-testid="extension-spec-verification-summary">
          <strong>3단계 스펙 검증:</strong>{' '}
          {specVerification.passed ? '통과 (0 위반)' : '위반 감지'} · 수직 치골 드리프트{' '}
          {specVerification.pelvicAnchorVerticalDriftPx}px · 캐리지 동기 오차{' '}
          {specVerification.pelvicCarriageSyncDriftPx}px
        </div>

        <div data-testid="extension-archetype-registry-status">
          <strong>아키타입 레지스트리 호환:</strong>{' '}
          {EXTENSION_ARCHETYPE_KEYS.map((key) => `${key}(${catalogAssets[key].archetypeId})`).join(', ')}
          {activeCorrection ? ` · 교정 출처 ${activeCorrection.sources.length}건` : ''}
        </div>
      </div>
    </section>
  );
}
