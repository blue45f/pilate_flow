/**
 * SPDX-License-Identifier: CC0-1.0 OR MIT
 * Public entry point for Track I8 Pilates Rotation 2D Diagrams (`Saw`, `Spine Twist`, `Criss-Cross`).
 */

export {
  RotationDraftFigure,
  RotationPhaseTriptych,
  type RotationDraftFigureProps,
  type RotationPhaseTriptychProps,
} from '../../components/RotationDraftFigure';

export {
  ROTATION_CANONICAL_VISUAL_ASSETS,
  ROTATION_CATALOG_EXERCISE_BINDINGS,
  ROTATION_DIAGRAM_CORRECTIONS,
  ROTATION_PATTERN_REFERENCES,
  ROTATION_VISUAL_ASSETS,
  getRotationDiagramCorrection,
  getRotationI7IntegrationBundle,
  getRotationVisualAsset,
  getRotationVisualAssetByCatalogExerciseId,
  isRotationDiagramExercise,
  resolveRotationDiagramCandidate,
  resolveRotationMovementId,
  toRotationMovementPhaseDiagramProps,
  toRotationMovementTriptychProps,
  type ResolvedRotationDiagramCandidate,
  type RotationAdapterDiagramOptions,
  type RotationI7IntegrationBundle,
  type RotationMovementId,
  type RotationPatternReference,
} from './rotationDiagramAdapters';
