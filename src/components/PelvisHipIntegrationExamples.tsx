/**
 * SPDX-License-Identifier: MIT
 * Track I2 — Pelvis & Hip Registry Integration Adapters & Reference Examples
 *
 * Demonstrates clean integration of Track I2's 7 Pelvis & Hip variants and
 * 3 archetype keys with the shared Track I7 catalog/correction interfaces
 * without modifying shared registry files directly.
 */

import React, { useState } from 'react';
import type { VisualPhaseId } from '../data/movementVisualRigCatalog';
import {
  getPelvisHipApparatusGeometry,
  getPelvisHipCatalogVisualAssets,
  getPelvisHipDiagramCorrections,
  PELVIS_HIP_VARIANT_IDS,
  type PelvisHipVariantId,
} from '../data/pelvisHipDiagramData';
import {
  getPelvisHipSourcesForVariant,
  PELVIS_HIP_TRUTHFULNESS_METADATA,
} from '../data/pelvisHipProvenance';
import { PelvisHipDiagramSvg, PelvisHipTriptychSvg } from './PelvisHipDiagramSvg';

export interface PelvisHipIntegrationExamplesProps {
  readonly initialVariantId?: PelvisHipVariantId;
  readonly initialPhase?: VisualPhaseId;
  readonly className?: string;
}

export function PelvisHipIntegrationExamples({
  initialVariantId = 'pelvis-mat-pelvic-curl',
  initialPhase = 'middle',
  className,
}: PelvisHipIntegrationExamplesProps): React.JSX.Element {
  const [selectedVariantId, setSelectedVariantId] =
    useState<PelvisHipVariantId>(initialVariantId);
  const [selectedPhase, setSelectedPhase] = useState<VisualPhaseId>(initialPhase);

  const catalogAssets = getPelvisHipCatalogVisualAssets();
  const corrections = getPelvisHipDiagramCorrections();

  const activeAsset = catalogAssets[selectedVariantId];
  const activeCorrection = corrections[selectedVariantId];
  const activeGeometry = getPelvisHipApparatusGeometry(selectedVariantId);
  const activeSources = getPelvisHipSourcesForVariant(selectedVariantId);

  return (
    <section
      className={className}
      aria-label="골반·고관절(펠빅 컬 & 브리지 패밀리) 2D 도해 통합 예시"
      data-component="pelvis-hip-integration-examples"
    >
      <header>
        <h2>골반·고관절 2D 도해 (Track I2 · 7종 변형 & 3종 아키타입)</h2>
        <p data-testid="pelvis-hip-disclaimer">{PELVIS_HIP_TRUTHFULNESS_METADATA.disclaimerKo}</p>
      </header>

      <div
        role="group"
        aria-label="골반·브리지 동작 변형 선택"
        style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}
      >
        {PELVIS_HIP_VARIANT_IDS.map((variantId) => {
          const item = catalogAssets[variantId];
          const isCurrent = variantId === selectedVariantId;
          return (
            <button
              key={variantId}
              type="button"
              data-variant-button={variantId}
              aria-pressed={isCurrent}
              onClick={() => setSelectedVariantId(variantId)}
            >
              {item.nameKo}
            </button>
          );
        })}
      </div>

      <PelvisHipTriptychSvg
        asset={activeAsset}
        variantId={selectedVariantId}
        selectedPhase={selectedPhase}
        onSelectPhase={setSelectedPhase}
      />

      <div
        data-testid="pelvis-hip-selected-detail"
        style={{ marginTop: '12px', display: 'grid', gap: '8px' }}
      >
        <PelvisHipDiagramSvg
          asset={activeAsset}
          variantId={selectedVariantId}
          phase={selectedPhase}
        />
        <p>
          <strong>기구 지지면:</strong> {activeGeometry.supportSurfaceKo} ·{' '}
          <strong>발 지지:</strong> {activeGeometry.footSupportKo}
        </p>
        {activeCorrection && (
          <div data-testid="pelvis-hip-correction-summary">
            <p>{activeCorrection.reviewedScopeKo}</p>
            <p>{activeCorrection.correctionKo}</p>
            <p>{activeCorrection.limitationKo}</p>
          </div>
        )}
        <ul data-testid="pelvis-hip-source-list">
          {activeSources.map((src) => (
            <li key={src.id}>
              <a href={src.url} target="_blank" rel="noopener noreferrer">
                {src.title} ({src.publisher})
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
