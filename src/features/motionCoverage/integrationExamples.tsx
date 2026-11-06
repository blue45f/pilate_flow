import React from 'react';
import {
  MovementPhaseDiagramSvg,
  MovementTriptychDiagramSvg,
} from '../../components/MovementPhaseDiagramSvg';
import { MotionPatternPreview } from '../../components/MotionPatternPreview';
import type { VisualPhaseId } from '../../data/movementVisualRigCatalog';
import type { PilatesExercise } from '../../types/pilates';
import {
  resolveRenderableMotionDescriptor,
  toExerciseEvidenceMotionOverlay,
  toMovementPhaseDiagramProps,
  toMovementTriptychProps,
} from './adapters';
import { resolveMotionCoverage } from './resolver';
import type { ResolveMotionCoverageOptions } from './types';

export interface MotionCoverageStatusBadgeProps {
  readonly exerciseOrId: string | PilatesExercise;
  readonly options?: ResolveMotionCoverageOptions;
}

/**
 * Integration Example 1: Truthful motion coverage badge for `InlineExerciseFinder` or
 * `ExerciseAtlasView`. Distinguishes `projected-3d` (2D SVG oblique projection draft),
 * `continuous-2d` (2D continuous draft), `three-phase-2d` (discrete 3-step schematic), and
 * `missing`, while exposing `data-canonical-ready="false"`, `data-manual-ready="false"`,
 * and `data-true-3d="false"`.
 */
export const MotionCoverageStatusBadge: React.FC<MotionCoverageStatusBadgeProps> = ({
  exerciseOrId,
  options,
}) => {
  const descriptor = resolveRenderableMotionDescriptor(exerciseOrId, options);
  return (
    <span
      data-testid={`motion-coverage-badge-${descriptor.exerciseId || 'unknown'}`}
      data-motion-mode={descriptor.mode}
      data-readiness-state={descriptor.readinessState}
      data-canonical-ready={String(descriptor.canonicalMotionReady)}
      data-manual-ready={String(descriptor.manualReady)}
      data-true-3d={String(descriptor.true3dSupported)}
      data-anatomical-assumed={String(descriptor.safetyFlags.anatomicalAccuracyAssumed)}
    >
      {descriptor.badgeLabelKo}
    </span>
  );
};

export interface MotionCoverageEvidenceDlItemsProps {
  readonly exercise: PilatesExercise;
  readonly options?: ResolveMotionCoverageOptions;
}

/**
 * Integration Example 2: Pure read-only `<dt>/<dd>` rows for `<ExerciseEvidencePanel />`.
 * Renders zero interactive controls (`button,input,textarea,select,iframe,img,video` = 0),
 * zero `role="status"`, and never leaks `exercise.cues` or `exercise.springs`.
 */
export const MotionCoverageEvidenceDlItems: React.FC<MotionCoverageEvidenceDlItemsProps> = ({
  exercise,
  options,
}) => {
  const overlay = toExerciseEvidenceMotionOverlay(exercise, options);
  return (
    <>
      <div
        data-testid="eep-motion-coverage-level"
        data-motion-mode={overlay.primaryMode}
        data-readiness-state={overlay.readinessState}
        data-manual-ready="false"
        data-true-3d="false"
      >
        <dt>도해·모션 지원 수준</dt>
        <dd>{overlay.supportLevelLabelKo}</dd>
      </div>
      <div data-testid="eep-motion-coverage-temporal">
        <dt>연속 모션 vs 2D 3단계 구분</dt>
        <dd>{overlay.continuousVsDiscreteLabelKo}</dd>
      </div>
      <div data-testid="eep-motion-coverage-3d-truth">
        <dt>3D 투영 vs 실제 3D 구분</dt>
        <dd>{overlay.threeDimensionalTruthLabelKo}</dd>
      </div>
      <div data-testid="eep-motion-coverage-verification-truth">
        <dt>검수·해부학 검증 한계</dt>
        <dd>{overlay.verificationTruthLabelKo}</dd>
      </div>
    </>
  );
};

export interface MotionCoverageUnifiedViewerProps {
  readonly exerciseOrId: string | PilatesExercise;
  readonly activePhaseId?: VisualPhaseId;
  readonly onSelectPhase?: (phaseId: VisualPhaseId) => void;
  readonly preferThreePhase2d?: boolean;
  readonly options?: ResolveMotionCoverageOptions;
}

/**
 * Integration Example 3: Unified viewer adapter that connects `resolveRenderableMotionDescriptor`
 * to existing `<MotionPatternPreview />`, `<MovementTriptychDiagramSvg />`, and
 * `<MovementPhaseDiagramSvg />` without modifying any existing component or registry file.
 */
export const MotionCoverageUnifiedViewer: React.FC<MotionCoverageUnifiedViewerProps> = ({
  exerciseOrId,
  activePhaseId = 'middle',
  onSelectPhase,
  preferThreePhase2d = false,
  options,
}) => {
  const mergedOptions: ResolveMotionCoverageOptions = preferThreePhase2d
    ? { ...options, preferMode: 'three-phase-2d' }
    : options ?? {};

  const descriptor = resolveRenderableMotionDescriptor(exerciseOrId, mergedOptions);
  const triptychProps = toMovementTriptychProps(
    exerciseOrId,
    { activePhaseId, onSelectPhase },
    mergedOptions,
  );
  const activePhaseProps = toMovementPhaseDiagramProps(
    exerciseOrId,
    activePhaseId,
    { compact: false },
    mergedOptions,
  );

  if (descriptor.mode === 'missing') {
    return (
      <div
        data-testid="motion-coverage-missing-fallback"
        data-motion-mode="missing"
        data-readiness-state={descriptor.readinessState}
        data-canonical-ready="false"
        data-manual-ready="false"
        data-true-3d="false"
      >
        <p>{descriptor.badgeLabelKo}</p>
        <small>{descriptor.disclaimerKo}</small>
      </div>
    );
  }

  return (
    <section
      data-testid="motion-coverage-unified-viewer"
      data-motion-mode={descriptor.mode}
      data-readiness-state={descriptor.readinessState}
      data-canonical-ready={String(descriptor.canonicalMotionReady)}
      data-manual-ready={String(descriptor.manualReady)}
      data-true-3d={String(descriptor.true3dSupported)}
      data-exercise-id={descriptor.exerciseId}
    >
      <header>
        <strong>{descriptor.badgeLabelKo}</strong>
        <p>{descriptor.disclaimerKo}</p>
      </header>

      {(descriptor.mode === 'projected-3d' || descriptor.mode === 'continuous-2d') &&
        descriptor.patternReferences.length > 0 && (
          <div data-testid="motion-coverage-pattern-previews">
            {descriptor.patternReferences.map((ref) => (
              <MotionPatternPreview key={ref.variantId} reference={ref} />
            ))}
          </div>
        )}

      {triptychProps && (
        <div data-testid="motion-coverage-triptych-preview">
          <MovementTriptychDiagramSvg {...triptychProps} />
        </div>
      )}

      {activePhaseProps && (
        <div data-testid="motion-coverage-single-phase-preview">
          <MovementPhaseDiagramSvg {...activePhaseProps} />
        </div>
      )}
    </section>
  );
};

/**
 * Programmatic integration snippet demonstrating how `InlineExerciseFinder`,
 * `MotionReferencePlayer`, `ExerciseAtlasView`, or `ExerciseEvidencePanel` can query coverage
 * and obtain renderer-ready props while reusing existing 2D catalog assets without duplication.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function buildIntegrationCallSnapshot(
  exerciseOrId: string | PilatesExercise,
  options: ResolveMotionCoverageOptions = {},
) {
  const coverage = resolveMotionCoverage(exerciseOrId, options);
  const descriptor = resolveRenderableMotionDescriptor(exerciseOrId, options);
  const evidenceOverlay = toExerciseEvidenceMotionOverlay(exerciseOrId, options);
  const middlePhaseProps = toMovementPhaseDiagramProps(exerciseOrId, 'middle', {}, options);
  const triptychProps = toMovementTriptychProps(exerciseOrId, {}, options);

  return Object.freeze({
    exerciseId: coverage.exerciseId,
    primaryMode: coverage.primaryMode,
    readinessState: coverage.readinessState,
    canonicalMotionReady: coverage.canonicalMotionReady,
    manualReady: descriptor.manualReady,
    supportedModes: coverage.supportedModes,
    modeMatrix: coverage.modeMatrix,
    threePhaseSourceKind: coverage.threePhase2d.sourceKind,
    reusesExistingCatalogAsset: coverage.threePhase2d.reusesExistingCatalogAsset,
    effectiveArchetypeId: coverage.threePhase2d.effectiveArchetypeId,
    badgeLabelKo: descriptor.badgeLabelKo,
    evidenceOverlay,
    hasMiddlePhaseProps: middlePhaseProps !== null,
    hasTriptychProps: triptychProps !== null,
    safetyFlags: coverage.safetyFlags,
  });
}
