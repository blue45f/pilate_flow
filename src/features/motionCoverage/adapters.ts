import type {
  MovementPhaseDiagramSvgProps,
  MovementTriptychDiagramSvgProps,
} from '../../components/MovementPhaseDiagramSvg';
import type {
  CatalogMovementVisualAsset,
  PhasePoseSpec,
  VisualPhaseId,
} from '../../data/movementVisualRigCatalog';
import type { MotionPatternReference } from '../../data/motionPatternReferences';
import type { MotionPrototypeReference } from '../../data/motionReferences';
import type { PilatesExercise } from '../../types/pilates';
import {
  getExerciseEvidence,
  type ExerciseEvidence,
} from '../../utils/exerciseEvidence';
import { resolveMotionCoverage } from './resolver';
import type {
  MotionCoverageResolution,
  MotionReadinessState,
  MotionSafetyAndReviewFlags,
  MotionSupportMode,
  ResolveMotionCoverageOptions,
} from './types';

export interface PhaseDiagramAdapterOptions {
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

export interface TriptychDiagramAdapterOptions {
  readonly selectedPhase?: VisualPhaseId;
  readonly activePhaseId?: VisualPhaseId;
  readonly onSelectPhase?: (phaseId: VisualPhaseId) => void;
  readonly activeSide?: 'left' | 'right';
  readonly mirrored?: boolean;
  readonly showAlignment?: boolean;
  readonly showDirection?: boolean;
  readonly showMuscles?: boolean;
  readonly showGhostStartPose?: boolean;
  readonly className?: string;
}

export interface RenderableProjected3dDescriptor {
  readonly mode: 'projected-3d';
  readonly exerciseId: string;
  readonly resolution: MotionCoverageResolution;
  readonly temporalKind: 'continuous-progress';
  readonly isDraftProposal: true;
  readonly canonicalMotionReady: false;
  readonly manualReady: false;
  readonly readinessState: MotionReadinessState;
  readonly projectionMethod: 'oblique-orthographic-3d-to-2d-svg';
  readonly renderSurface: 'svg-2d';
  readonly true3dSupported: false;
  readonly webgl3dReady: false;
  readonly patternReferences: readonly MotionPatternReference[];
  readonly fallbackTriptychProps: MovementTriptychDiagramSvgProps | null;
  readonly fallbackPhasePropsByPhase: Readonly<Record<VisualPhaseId, MovementPhaseDiagramSvgProps>> | null;
  readonly badgeLabelKo: string;
  readonly disclaimerKo: string;
  readonly safetyFlags: MotionSafetyAndReviewFlags;
}

export interface RenderableContinuous2dDescriptor {
  readonly mode: 'continuous-2d';
  readonly exerciseId: string;
  readonly resolution: MotionCoverageResolution;
  readonly temporalKind: 'continuous-progress';
  readonly isDraftProposal: true;
  readonly canonicalMotionReady: false;
  readonly manualReady: false;
  readonly readinessState: MotionReadinessState;
  readonly true3dSupported: false;
  readonly patternReferences: readonly MotionPatternReference[];
  readonly labPrototype: MotionPrototypeReference | null;
  readonly fallbackTriptychProps: MovementTriptychDiagramSvgProps | null;
  readonly fallbackPhasePropsByPhase: Readonly<Record<VisualPhaseId, MovementPhaseDiagramSvgProps>> | null;
  readonly badgeLabelKo: string;
  readonly disclaimerKo: string;
  readonly safetyFlags: MotionSafetyAndReviewFlags;
}

export interface RenderableThreePhase2dDescriptor {
  readonly mode: 'three-phase-2d';
  readonly exerciseId: string;
  readonly resolution: MotionCoverageResolution;
  readonly temporalKind: 'discrete-three-phase';
  readonly isDraftProposal: false;
  readonly canonicalMotionReady: false;
  readonly manualReady: false;
  readonly readinessState: MotionReadinessState;
  readonly true3dSupported: false;
  readonly reusesExistingCatalogAsset: true;
  readonly asset: CatalogMovementVisualAsset;
  readonly triptychProps: MovementTriptychDiagramSvgProps;
  readonly phasePropsByPhase: Readonly<Record<VisualPhaseId, MovementPhaseDiagramSvgProps>>;
  readonly badgeLabelKo: string;
  readonly disclaimerKo: string;
  readonly safetyFlags: MotionSafetyAndReviewFlags;
}

export interface RenderableMissingDescriptor {
  readonly mode: 'missing';
  readonly exerciseId: string;
  readonly resolution: MotionCoverageResolution;
  readonly canonicalMotionReady: false;
  readonly manualReady: false;
  readonly readinessState: MotionReadinessState;
  readonly true3dSupported: false;
  readonly badgeLabelKo: string;
  readonly disclaimerKo: string;
  readonly safetyFlags: MotionSafetyAndReviewFlags;
}

export type RenderableMotionDescriptor =
  | RenderableProjected3dDescriptor
  | RenderableContinuous2dDescriptor
  | RenderableThreePhase2dDescriptor
  | RenderableMissingDescriptor;

/**
 * Sanitized, instruction-free motion coverage overlay designed specifically for
 * `src/utils/exerciseEvidence.ts` (`getExerciseEvidence`) and `src/components/ExerciseEvidencePanel.tsx`.
 * Never includes raw `exercise.cues`, `exercise.springs`, or prescribed counts, and explicitly
 * separates 2D 3-phase schematics, continuous pattern drafts, real 3D, and clinical/anatomical verification.
 */
export interface ExerciseEvidenceMotionCoverageOverlay {
  readonly exerciseId: string;
  readonly primaryMode: MotionSupportMode;
  readonly supportedModes: readonly MotionSupportMode[];
  readonly readinessState: MotionReadinessState;
  readonly reusesExisting98PoseByIdentity: boolean;
  readonly discreteThreePhase2dSupported: boolean;
  readonly continuousDraftSupported: boolean;
  readonly continuousDraftVariantIds: readonly string[];
  readonly canonicalContinuousReady: false;
  readonly manualReady: false;
  readonly true3dSupported: false;
  readonly webgl3dReady: false;
  readonly anatomicalVerificationCompleted: false;
  readonly expertVerificationCompleted: false;
  readonly supportLevelLabelKo: string;
  readonly continuousVsDiscreteLabelKo: string;
  readonly threeDimensionalTruthLabelKo: string;
  readonly verificationTruthLabelKo: string;
}

export type ExerciseEvidenceWithMotionCoverage = ExerciseEvidence & {
  readonly motion: ExerciseEvidence['motion'] & {
    readonly coverage: ExerciseEvidenceMotionCoverageOverlay;
  };
};

/**
 * Returns the verified 2D 3-phase `CatalogMovementVisualAsset` directly reused from
 * `MOVEMENT_VISUAL_ASSETS` in `src/data/movementVisualRigCatalog.ts` (`===` reference identity)
 * without creating duplicate assets. Returns `null` if the exercise is missing or unverified.
 */
export function resolveVisualAssetForRenderer(
  exerciseOrId: string | PilatesExercise | null | undefined,
  options: ResolveMotionCoverageOptions = {},
): CatalogMovementVisualAsset | null {
  const resolution = resolveMotionCoverage(exerciseOrId, options);
  if (!resolution.threePhase2d.supported || !resolution.threePhase2d.asset) {
    return null;
  }
  return resolution.threePhase2d.asset;
}

/**
 * Extracts a specific phase (`start` | `middle` | `end`) `PhasePoseSpec` from a verified
 * `CatalogMovementVisualAsset`.
 */
export function extractPhasePoseSpec(
  asset: CatalogMovementVisualAsset,
  phaseId: VisualPhaseId = 'middle',
): PhasePoseSpec {
  return asset.phases[phaseId] ?? asset.phases.middle;
}

/**
 * Builds props directly compatible with `<MovementPhaseDiagramSvg {...props} />`.
 * Returns `null` if the exercise ID is unknown, tampered, or lacks verified 2D 3-phase support.
 */
export function toMovementPhaseDiagramProps(
  exerciseOrId: string | PilatesExercise | null | undefined,
  phaseId: VisualPhaseId = 'middle',
  diagramOptions: PhaseDiagramAdapterOptions = {},
  resolveOptions: ResolveMotionCoverageOptions = {},
): MovementPhaseDiagramSvgProps | null {
  const asset = resolveVisualAssetForRenderer(exerciseOrId, resolveOptions);
  if (!asset) return null;

  return {
    asset,
    phase: phaseId,
    ...(diagramOptions.activeSide !== undefined ? { activeSide: diagramOptions.activeSide } : {}),
    ...(diagramOptions.mirrored !== undefined ? { mirrored: diagramOptions.mirrored } : {}),
    showAlignment: diagramOptions.showAlignment ?? true,
    showDirection: diagramOptions.showDirection ?? true,
    showMuscles: diagramOptions.showMuscles ?? true,
    showGhostStartPose: diagramOptions.showGhostStartPose ?? true,
    compact: diagramOptions.compact ?? false,
    ...(diagramOptions.className !== undefined ? { className: diagramOptions.className } : {}),
    ...(diagramOptions.label !== undefined ? { label: diagramOptions.label } : {}),
  };
}

/**
 * Builds all 3 phase diagram props (`start`, `middle`, `end`) keyed by `VisualPhaseId`.
 */
export function toAllPhaseDiagramProps(
  exerciseOrId: string | PilatesExercise | null | undefined,
  diagramOptions: PhaseDiagramAdapterOptions = {},
  resolveOptions: ResolveMotionCoverageOptions = {},
): Readonly<Record<VisualPhaseId, MovementPhaseDiagramSvgProps>> | null {
  const asset = resolveVisualAssetForRenderer(exerciseOrId, resolveOptions);
  if (!asset) return null;

  const makeProps = (phaseId: VisualPhaseId): MovementPhaseDiagramSvgProps => ({
    asset,
    phase: phaseId,
    ...(diagramOptions.activeSide !== undefined ? { activeSide: diagramOptions.activeSide } : {}),
    ...(diagramOptions.mirrored !== undefined ? { mirrored: diagramOptions.mirrored } : {}),
    showAlignment: diagramOptions.showAlignment ?? true,
    showDirection: diagramOptions.showDirection ?? true,
    showMuscles: diagramOptions.showMuscles ?? true,
    showGhostStartPose: diagramOptions.showGhostStartPose ?? true,
    compact: diagramOptions.compact ?? false,
    ...(diagramOptions.className !== undefined ? { className: diagramOptions.className } : {}),
    ...(diagramOptions.label !== undefined ? { label: diagramOptions.label } : {}),
  });

  return Object.freeze({
    start: makeProps('start'),
    middle: makeProps('middle'),
    end: makeProps('end'),
  });
}

/**
 * Builds props directly compatible with `<MovementTriptychDiagramSvg {...props} />`.
 * Returns `null` if the exercise ID is unknown, tampered, or lacks verified 2D 3-phase support.
 */
export function toMovementTriptychProps(
  exerciseOrId: string | PilatesExercise | null | undefined,
  triptychOptions: TriptychDiagramAdapterOptions = {},
  resolveOptions: ResolveMotionCoverageOptions = {},
): MovementTriptychDiagramSvgProps | null {
  const asset = resolveVisualAssetForRenderer(exerciseOrId, resolveOptions);
  if (!asset) return null;

  const selectedPhase = triptychOptions.selectedPhase ?? triptychOptions.activePhaseId;

  return {
    asset,
    ...(selectedPhase !== undefined ? { selectedPhase } : {}),
    ...(triptychOptions.onSelectPhase !== undefined
      ? { onSelectPhase: triptychOptions.onSelectPhase }
      : {}),
    ...(triptychOptions.activeSide !== undefined ? { activeSide: triptychOptions.activeSide } : {}),
    ...(triptychOptions.mirrored !== undefined ? { mirrored: triptychOptions.mirrored } : {}),
    showAlignment: triptychOptions.showAlignment ?? true,
    showDirection: triptychOptions.showDirection ?? true,
    showMuscles: triptychOptions.showMuscles ?? true,
    showGhostStartPose: triptychOptions.showGhostStartPose ?? true,
    ...(triptychOptions.className !== undefined ? { className: triptychOptions.className } : {}),
  };
}

/**
 * Returns strictly verified `MotionPatternReference` items for `<MotionPatternPreview />`,
 * ordered with 3D projected patterns first followed by 2D continuous patterns.
 */
export function resolvePatternReferencesForRenderer(
  exerciseOrId: string | PilatesExercise | null | undefined,
  options: ResolveMotionCoverageOptions = {},
): readonly MotionPatternReference[] {
  const resolution = resolveMotionCoverage(exerciseOrId, options);
  if (resolution.isMissing) return Object.freeze([]);
  return Object.freeze([
    ...resolution.projected3d.patternReferences,
    ...resolution.continuous2d.patternReferences,
  ]);
}

/**
 * High-level discriminated union adapter for UI integration points (`InlineExerciseFinder`,
 * `MotionReferencePlayer`, `ExerciseAtlasView`). Never fabricates canonical readiness, manual-ready,
 * true 3D, or anatomical verification.
 */
export function resolveRenderableMotionDescriptor(
  exerciseOrId: string | PilatesExercise | null | undefined,
  options: ResolveMotionCoverageOptions = {},
): RenderableMotionDescriptor {
  const resolution = resolveMotionCoverage(exerciseOrId, options);
  const fallbackTriptychProps = toMovementTriptychProps(exerciseOrId, {}, options);
  const fallbackPhasePropsByPhase = toAllPhaseDiagramProps(exerciseOrId, {}, options);

  if (resolution.primaryMode === 'projected-3d') {
    return Object.freeze({
      mode: 'projected-3d',
      exerciseId: resolution.exerciseId,
      resolution,
      temporalKind: 'continuous-progress',
      isDraftProposal: true,
      canonicalMotionReady: false,
      manualReady: false,
      readinessState: resolution.readinessState,
      projectionMethod: 'oblique-orthographic-3d-to-2d-svg',
      renderSurface: 'svg-2d',
      true3dSupported: false,
      webgl3dReady: false,
      patternReferences: resolution.projected3d.patternReferences,
      fallbackTriptychProps,
      fallbackPhasePropsByPhase,
      badgeLabelKo: `3D→2D 사선 투영 초안 (${resolution.projected3d.variantIds.length}종) · 2D 3단계 도해 병행`,
      disclaimerKo:
        '실제 3D 엔진(WebGL)이나 정식 동작 승인본이 아닌 3D 좌표의 2D SVG 사선 투영 초안(projected-3d, authored-unreviewed-draft)입니다.',
      safetyFlags: resolution.safetyFlags,
    });
  }

  if (resolution.primaryMode === 'continuous-2d') {
    return Object.freeze({
      mode: 'continuous-2d',
      exerciseId: resolution.exerciseId,
      resolution,
      temporalKind: 'continuous-progress',
      isDraftProposal: true,
      canonicalMotionReady: false,
      manualReady: false,
      readinessState: resolution.readinessState,
      true3dSupported: false,
      patternReferences: resolution.continuous2d.patternReferences,
      labPrototype: resolution.continuous2d.labPrototype,
      fallbackTriptychProps,
      fallbackPhasePropsByPhase,
      badgeLabelKo: resolution.continuous2d.isPrototypeOnly
        ? `2D 연속 프로토타입 (${resolution.continuous2d.variantId}) · 연구실 참고용`
        : `2D 연속 모션 초안 (${resolution.continuous2d.variantId}) · 2D 3단계 도해 병행`,
      disclaimerKo:
        '정식 동작 승인본이나 해부학 검증 완료본이 아닌 2D 평면 연속 초안(continuous-2d)입니다.',
      safetyFlags: resolution.safetyFlags,
    });
  }

  if (
    resolution.primaryMode === 'three-phase-2d' &&
    resolution.threePhase2d.asset &&
    fallbackTriptychProps &&
    fallbackPhasePropsByPhase
  ) {
    return Object.freeze({
      mode: 'three-phase-2d',
      exerciseId: resolution.exerciseId,
      resolution,
      temporalKind: 'discrete-three-phase',
      isDraftProposal: false,
      canonicalMotionReady: false,
      manualReady: false,
      readinessState: resolution.readinessState,
      true3dSupported: false,
      reusesExistingCatalogAsset: true,
      asset: resolution.threePhase2d.asset,
      triptychProps: fallbackTriptychProps,
      phasePropsByPhase: fallbackPhasePropsByPhase,
      badgeLabelKo: '2D 3단계 기구학 도해 (기존 98 카탈로그 에셋 재사용 · 출처 대조)',
      disclaimerKo:
        '정식 연속 모션은 미작성(not_authored) 상태이며, 기존 카탈로그의 2D 3단계(시작·중간·끝) 이산 도해 에셋을 중복 생성 없이 재사용합니다.',
      safetyFlags: resolution.safetyFlags,
    });
  }

  return Object.freeze({
    mode: 'missing',
    exerciseId: resolution.exerciseId,
    resolution,
    canonicalMotionReady: false,
    manualReady: false,
    readinessState: resolution.readinessState,
    true3dSupported: false,
    badgeLabelKo: '모션 도해 미지원 (근거 데이터 없음)',
    disclaimerKo:
      '카탈로그 출처 감사 또는 기구·자세·방향 일치 근거가 확인되지 않아 모션 도해를 표시하지 않습니다.',
    safetyFlags: resolution.safetyFlags,
  });
}

/**
 * Builds the instruction-free `ExerciseEvidenceMotionCoverageOverlay` for `exerciseEvidence.ts`
 * and `ExerciseEvidencePanel.tsx`. Never leaks `exercise.cues` or `exercise.springs`, and
 * explicitly separates 2D 3-phase reuse, continuous drafts, real 3D, and verification status.
 */
export function toExerciseEvidenceMotionOverlay(
  exerciseOrId: string | PilatesExercise | null | undefined,
  options: ResolveMotionCoverageOptions = {},
): ExerciseEvidenceMotionCoverageOverlay {
  const resolution = resolveMotionCoverage(exerciseOrId, options);
  const continuousVariantIds = [
    ...resolution.projected3d.variantIds,
    ...(resolution.continuous2d.variantId ? [resolution.continuous2d.variantId] : []),
  ];
  const continuousDraftSupported =
    resolution.projected3d.supported || resolution.continuous2d.supported;

  let supportLevelLabelKo: string;
  if (resolution.primaryMode === 'projected-3d') {
    supportLevelLabelKo = `관련 패턴 3D→2D 사선 투영 초안(${resolution.projected3d.variantIds.length}종) · 기존 98 2D 3단계 포즈 재사용 병행`;
  } else if (resolution.primaryMode === 'continuous-2d') {
    supportLevelLabelKo = resolution.continuous2d.isPrototypeOnly
      ? `독립 2D 연속 프로토타입(${resolution.continuous2d.variantId}) 참고 · 기존 98 2D 3단계 포즈 재사용 병행`
      : `관련 패턴 2D 평면 연속 초안(1종) · 기존 98 2D 3단계 포즈 재사용 병행`;
  } else if (resolution.primaryMode === 'three-phase-2d') {
    supportLevelLabelKo = '이산 2D 3단계 도해만 존재 (기존 98 카탈로그 포즈 재사용 · 연속 모션 초안 없음)';
  } else {
    supportLevelLabelKo = '검증된 모션·도해 근거 없음 (missing · 미등록 또는 커스텀 노트)';
  }

  const continuousVsDiscreteLabelKo = continuousDraftSupported
    ? '연속 보간 초안(authored-unreviewed-draft, 정식 연속 모션 0/98 아님) + 이산 2D 3단계(start·middle·end) 도해 재사용'
    : resolution.threePhase2d.supported
      ? '이산 2D 3단계(start·middle·end) 정적 스냅샷 도해만 존재 · 연속 재생 모션 미작성(not_authored)'
      : '연속 모션 및 2D 3단계 도해 모두 미작성(missing)';

  const threeDimensionalTruthLabelKo = resolution.projected3d.supported
    ? '진짜 3D 엔진(WebGL/Three.js·자유 카메라) 아님 · 3D 스틱/튜브 좌표의 2D SVG 사선 정사영(projected-3d)'
    : '진짜 3D 엔진(WebGL/Three.js) 및 3D 투영 초안 없음 (2D 평면 도해 전용)';

  const verificationTruthLabelKo =
    '정식 모션 완료(manual-ready) 0건 · 외부 전문가 모션 검수 0건(unreviewed) · 해부학적 정밀 검증 완료로 간주하지 않음';

  return Object.freeze({
    exerciseId: resolution.exerciseId,
    primaryMode: resolution.primaryMode,
    supportedModes: resolution.supportedModes,
    readinessState: resolution.readinessState,
    reusesExisting98PoseByIdentity: resolution.threePhase2d.reusesExistingCatalogAsset,
    discreteThreePhase2dSupported: resolution.threePhase2d.supported,
    continuousDraftSupported,
    continuousDraftVariantIds: Object.freeze(continuousVariantIds),
    canonicalContinuousReady: false,
    manualReady: false,
    true3dSupported: false,
    webgl3dReady: false,
    anatomicalVerificationCompleted: false,
    expertVerificationCompleted: false,
    supportLevelLabelKo,
    continuousVsDiscreteLabelKo,
    threeDimensionalTruthLabelKo,
    verificationTruthLabelKo,
  });
}

/**
 * Backward-compatible wrapper around `getExerciseEvidence(exercise)` that attaches
 * `evidence.motion.coverage` (`ExerciseEvidenceMotionCoverageOverlay`) without mutating
 * any existing `ExerciseEvidence` fields or leaking `exercise.cues` / `exercise.springs`.
 */
export function toExerciseEvidenceWithMotionCoverage(
  exercise: PilatesExercise,
  options: ResolveMotionCoverageOptions = {},
): ExerciseEvidenceWithMotionCoverage {
  const baseEvidence = getExerciseEvidence(exercise);
  const coverage = toExerciseEvidenceMotionOverlay(exercise, options);

  return {
    ...baseEvidence,
    motion: {
      ...baseEvidence.motion,
      coverage,
    },
  };
}
