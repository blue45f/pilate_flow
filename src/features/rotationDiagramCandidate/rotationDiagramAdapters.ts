/**
 * SPDX-License-Identifier: CC0-1.0 OR MIT
 * Track I8 Rotation 2D Diagram Adapters for I7 Shared Registry Integration.
 */

import type {
  MovementPhaseDiagramSvgProps,
  MovementTriptychDiagramSvgProps,
} from '../../components/MovementPhaseDiagramSvg';
import type { MovementDiagramCorrection } from '../../data/movementDiagramCorrections';
import type {
  CatalogMovementVisualAsset,
  VisualPhaseId,
} from '../../data/movementVisualRigCatalog';
import {
  getRotationDiagramCorrection,
  getRotationI7IntegrationBundle,
  getRotationVisualAsset,
  getRotationVisualAssetByCatalogExerciseId,
  ROTATION_CANONICAL_VISUAL_ASSETS,
  ROTATION_CATALOG_EXERCISE_BINDINGS,
  ROTATION_DIAGRAM_CORRECTIONS,
  ROTATION_PATTERN_REFERENCES,
  ROTATION_VISUAL_ASSETS,
  type RotationI7IntegrationBundle,
  type RotationPatternReference,
} from '../../data/rotationDiagramData';
import {
  getRotationDiscretePose,
  getRotationDraftPose,
  getRotationKinematicTelemetry,
  resolveRotationMovementId,
  type RotationDraftPose,
  type RotationKinematicTelemetry,
  type RotationMovementId,
  type RotationPoseOptions,
} from '../../models/rotationDrafts';
import type { PilatesExercise } from '../../types/pilates';

export {
  ROTATION_VISUAL_ASSETS,
  ROTATION_CANONICAL_VISUAL_ASSETS,
  ROTATION_DIAGRAM_CORRECTIONS,
  ROTATION_CATALOG_EXERCISE_BINDINGS,
  ROTATION_PATTERN_REFERENCES,
  getRotationVisualAsset,
  getRotationVisualAssetByCatalogExerciseId,
  getRotationDiagramCorrection,
  getRotationI7IntegrationBundle,
  resolveRotationMovementId,
  type RotationI7IntegrationBundle,
  type RotationPatternReference,
  type RotationMovementId,
};

function extractExerciseId(
  exerciseOrId: string | PilatesExercise | null | undefined,
): string | null {
  if (!exerciseOrId) return null;
  if (typeof exerciseOrId === 'string') return exerciseOrId.trim() || null;
  return exerciseOrId.id?.trim() || null;
}

export function isRotationDiagramExercise(
  exerciseOrId: string | PilatesExercise | null | undefined,
): boolean {
  const id = extractExerciseId(exerciseOrId);
  return resolveRotationMovementId(id) !== null;
}

export interface RotationAdapterDiagramOptions {
  readonly activeSide?: 'left' | 'right';
  readonly mirrored?: boolean;
  readonly showAlignment?: boolean;
  readonly showDirection?: boolean;
  readonly showMuscles?: boolean;
  readonly showGhostStartPose?: boolean;
  readonly compact?: boolean;
  readonly className?: string;
  readonly label?: string;
}

export function toRotationMovementPhaseDiagramProps(
  exerciseOrId: string | PilatesExercise | null | undefined,
  phase: VisualPhaseId = 'middle',
  options: RotationAdapterDiagramOptions = {},
): MovementPhaseDiagramSvgProps | null {
  const id = extractExerciseId(exerciseOrId);
  const asset = getRotationVisualAssetByCatalogExerciseId(id);
  if (!asset) return null;

  return {
    asset,
    phase,
    activeSide: options.activeSide ?? 'right',
    mirrored: options.mirrored ?? false,
    showAlignment: options.showAlignment ?? true,
    showDirection: options.showDirection ?? true,
    showMuscles: options.showMuscles ?? true,
    showGhostStartPose: options.showGhostStartPose ?? phase !== 'start',
    compact: options.compact ?? false,
    className: options.className,
    label:
      options.label ??
      `${asset.nameKo} · ${asset.phases[phase].badgeKo} · 직접 작성한 2D 축회전 참고 도해 (해부학 미검증)`,
  };
}

export function toRotationMovementTriptychProps(
  exerciseOrId: string | PilatesExercise | null | undefined,
  options: RotationAdapterDiagramOptions & {
    readonly selectedPhase?: VisualPhaseId;
    readonly onSelectPhase?: (phase: VisualPhaseId) => void;
  } = {},
): MovementTriptychDiagramSvgProps | null {
  const id = extractExerciseId(exerciseOrId);
  const asset = getRotationVisualAssetByCatalogExerciseId(id);
  if (!asset) return null;

  return {
    asset,
    selectedPhase: options.selectedPhase ?? 'middle',
    onSelectPhase: options.onSelectPhase,
    activeSide: options.activeSide ?? 'right',
    mirrored: options.mirrored ?? false,
    showAlignment: options.showAlignment ?? true,
    showDirection: options.showDirection ?? true,
    showMuscles: options.showMuscles ?? true,
    showGhostStartPose: options.showGhostStartPose ?? true,
    className: options.className,
  };
}

export interface ResolvedRotationDiagramCandidate {
  readonly exerciseId: string;
  readonly movementId: RotationMovementId;
  readonly asset: CatalogMovementVisualAsset;
  readonly correction: MovementDiagramCorrection;
  readonly pose: RotationDraftPose;
  readonly telemetry: RotationKinematicTelemetry;
  readonly phaseDiagramProps: MovementPhaseDiagramSvgProps;
  readonly triptychProps: MovementTriptychDiagramSvgProps;
  readonly truthfulness: {
    readonly anatomicalAccuracyAssumed: false;
    readonly professionalReviewCount: 0;
    readonly sourceFrameMappings: 0;
  };
}

export function resolveRotationDiagramCandidate(
  exerciseOrId: string | PilatesExercise | null | undefined,
  phaseOrProgress: VisualPhaseId | number = 'middle',
  poseOptions: RotationPoseOptions = {},
): ResolvedRotationDiagramCandidate | null {
  const id = extractExerciseId(exerciseOrId);
  const movementId = resolveRotationMovementId(id);
  if (!id || !movementId) return null;

  const asset = getRotationVisualAssetByCatalogExerciseId(id) ?? getRotationVisualAsset(movementId);
  const correction =
    getRotationDiagramCorrection(id) ?? ROTATION_DIAGRAM_CORRECTIONS[movementId];
  const pose =
    typeof phaseOrProgress === 'number'
      ? getRotationDraftPose(movementId, phaseOrProgress, poseOptions)
      : getRotationDiscretePose(movementId, phaseOrProgress, poseOptions);
  const telemetry = getRotationKinematicTelemetry(pose);
  const visualPhase: VisualPhaseId =
    typeof phaseOrProgress === 'number' ? pose.visualPhaseId : phaseOrProgress;

  return Object.freeze({
    exerciseId: id,
    movementId,
    asset,
    correction,
    pose,
    telemetry,
    phaseDiagramProps: toRotationMovementPhaseDiagramProps(id, visualPhase, poseOptions)!,
    triptychProps: toRotationMovementTriptychProps(id, {
      ...poseOptions,
      selectedPhase: visualPhase,
    })!,
    truthfulness: Object.freeze({
      anatomicalAccuracyAssumed: false,
      professionalReviewCount: 0,
      sourceFrameMappings: 0,
    }),
  });
}
