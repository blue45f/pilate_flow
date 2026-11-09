import { expect, it } from 'vitest';
import { MOVEMENT_VISUAL_ASSETS, getMovementVisualAsset } from '../data/movementVisualRigCatalog';
import { loadExerciseVisualRigById } from './lazyVisualRigLoader';
it('loads an existing catalog asset through the new lazy helper', async () => {
  const id = MOVEMENT_VISUAL_ASSETS[0].exerciseId;
  expect(getMovementVisualAsset(id)).not.toBeNull();
  expect(await loadExerciseVisualRigById(id)).not.toBeNull();
});

it('returns null for unknown and whitespace-only catalog identifiers', async () => {
  expect(await loadExerciseVisualRigById('  ')).toBeNull();
  expect(await loadExerciseVisualRigById('synthetic-nonexistent-id')).toBeNull();
});
it('normalizes whitespace around a valid catalog identifier', async () => {
  const id = MOVEMENT_VISUAL_ASSETS[0].exerciseId;
  expect(await loadExerciseVisualRigById(` ${id} `)).toBe(getMovementVisualAsset(id));
});
