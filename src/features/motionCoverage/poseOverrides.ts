import {
  calculatePhaseJointDelta,
  getMovementVisualAsset,
  MOVEMENT_VISUAL_ASSETS,
  MOVEMENT_VISUAL_ASSET_MAP,
  type CatalogMovementVisualAsset,
  type RigJointMap,
} from '../../data/movementVisualRigCatalog';
import type { PilatesExercise } from '../../types/pilates';

export interface ReusedPhaseKinematicsSummary {
  readonly exerciseId: string;
  readonly archetypeId: string;
  readonly asset: CatalogMovementVisualAsset;
  readonly reusesCanonicalAssetReference: true;
  readonly startToMiddleMaxDeltaPx: number;
  readonly middleToEndMaxDeltaPx: number;
  readonly movedJointKeys: readonly (keyof RigJointMap)[];
  readonly anchoredJointKeys: readonly (keyof RigJointMap)[];
}

/**
 * Reuses internal `CatalogMovementVisualAsset` objects from `MOVEMENT_VISUAL_ASSETS` /
 * `MOVEMENT_VISUAL_ASSET_MAP` in `src/data/movementVisualRigCatalog.ts` directly by reference
 * without creating any duplicate assets or secondary coordinate tables.
 */
export function getReusedCatalogVisualAsset(
  exerciseOrId: string | PilatesExercise | null | undefined,
): CatalogMovementVisualAsset | null {
  if (!exerciseOrId) return null;
  const rawId =
    typeof exerciseOrId === 'string' ? exerciseOrId.trim() : (exerciseOrId.id?.trim() ?? '');
  if (!rawId) return null;
  return MOVEMENT_VISUAL_ASSET_MAP.get(rawId) ?? getMovementVisualAsset(rawId) ?? null;
}

/**
 * Computes step-by-step (`start -> middle` and `middle -> end`) joint displacement metrics
 * directly from the existing prebuilt `CatalogMovementVisualAsset` without allocating duplicate
 * pose assets.
 */
export function inspectReusedPhaseKinematics(
  exerciseOrId: string | PilatesExercise | null | undefined,
): ReusedPhaseKinematicsSummary | null {
  const asset = getReusedCatalogVisualAsset(exerciseOrId);
  if (!asset) return null;

  const startToMiddle = calculatePhaseJointDelta(asset);
  const middleJoints = asset.phases.middle.joints;
  const endJoints = asset.phases.end.joints;

  let middleToEndMaxDeltaPx = 0;
  for (const key of Object.keys(middleJoints) as (keyof RigJointMap)[]) {
    const pMid = middleJoints[key];
    const pEnd = endJoints[key];
    if (!pMid || !pEnd) continue;
    const dist = Math.round(Math.hypot(pEnd.x - pMid.x, pEnd.y - pMid.y) * 10) / 10;
    if (dist > middleToEndMaxDeltaPx) {
      middleToEndMaxDeltaPx = dist;
    }
  }

  return Object.freeze({
    exerciseId: asset.exerciseId,
    archetypeId: asset.archetypeId,
    asset,
    reusesCanonicalAssetReference: true,
    startToMiddleMaxDeltaPx: startToMiddle.maxDeltaPx,
    middleToEndMaxDeltaPx,
    movedJointKeys: Object.freeze(startToMiddle.movedJoints.map((m) => m.joint)),
    anchoredJointKeys: Object.freeze([...startToMiddle.anchoredJoints]),
  });
}

/**
 * Verifies that prebuilt 2D 3-phase assets in `MOVEMENT_VISUAL_ASSETS` are reused
 * with zero duplicate allocations.
 */
export function verifyZeroDuplicateVisualAssets(): {
  readonly totalCatalogAssets: number;
  readonly reusedByIdentityCount: number;
  readonly duplicateAssetCount: number;
} {
  let reusedByIdentityCount = 0;
  for (const asset of MOVEMENT_VISUAL_ASSETS) {
    if (getReusedCatalogVisualAsset(asset.exerciseId) === asset) {
      reusedByIdentityCount += 1;
    }
  }
  return Object.freeze({
    totalCatalogAssets: MOVEMENT_VISUAL_ASSETS.length,
    reusedByIdentityCount,
    duplicateAssetCount: MOVEMENT_VISUAL_ASSETS.length - reusedByIdentityCount,
  });
}
