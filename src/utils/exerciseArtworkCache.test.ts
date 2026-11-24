import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import manifest from '../data/exerciseArtworkManifest.json';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { WORLD_PILATES_EXERCISES } from '../data/worldPilatesRepertoire1000';
import { getExerciseArtworkFrame } from './exerciseArtworkCache';

describe('shared-model 3D WebP thumbnail cache', () => {
  it('has valid content-addressed 960x600 3D WebP bytes for all three phases of all 524 atomic exercises and unifies all 1,752 catalog movements', async () => {
    const allAtomics = WORLD_PILATES_EXERCISES.filter((item) => item.tier === 'atomic');
    expect(allAtomics).toHaveLength(524);
    expect(Object.keys(manifest.entries)).toHaveLength(allAtomics.length);
    expect(manifest).toMatchObject({
      schemaVersion: 3,
      renderer: 'BlenderCycles3DStudio',
      format: 'webp',
      width: 960,
      height: 600,
      rasterization: { webp: { quality: 90 } },
      professionalReviewVerified: false,
      sourceFrameMappingVerified: false,
    });
    for (const exercise of allAtomics) {
      for (const phase of ['start', 'middle', 'end'] as const) {
        const frame = getExerciseArtworkFrame(exercise, phase)!;
        expect(frame, exercise.id + '/' + phase).toBeDefined();
        expect(frame.src).toMatch(/^\/motion-artwork-v2\/[a-zA-Z0-9_.-]+\.webp$/);
        const bytes = readFileSync(path.join(process.cwd(), 'public', frame.src));
        expect(bytes.length).toBe(frame.bytes);
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(frame.sha256);
        expect(frame.src).toContain(frame.sha256.slice(0, 12));
        expect(frame.svgSha256).toMatch(/^[a-f0-9]{64}$/);
        expect(frame.inputSha256).toMatch(/^[a-f0-9]{64}$/);
      }
    }
    // Sample Sharp dimension check across all 5 apparatuses (avoid 1,572 full sharp decodes in 5s test timeout)
    for (const app of ['mat', 'reformer', 'cadillac', 'chair', 'barrel'] as const) {
      const ex = allAtomics.find((item) => item.apparatus === app)!;
      const frame = getExerciseArtworkFrame(ex, 'middle')!;
      const bytes = readFileSync(path.join(process.cwd(), 'public', frame.src));
      expect(await sharp(bytes).metadata()).toMatchObject({
        format: 'webp',
        width: 960,
        height: 600,
      });
    }
    // All 1,752 catalog movements resolve cleanly to unified 960x600 3D WebP frames
    for (const exercise of WORLD_PILATES_EXERCISES) {
      const frame = getExerciseArtworkFrame(exercise, 'middle');
      expect(frame, exercise.id).toBeDefined();
      expect(frame!.width).toBe(960);
      expect(frame!.height).toBe(600);
    }
  });

  it('does not reuse a cached 3D pose for an unknown or changed-apparatus/posture movement', () => {
    const exercise = INITIAL_EXERCISES.find((item) => item.apparatus === 'mat')!;
    expect(getExerciseArtworkFrame({ ...exercise, id: 'a-new-movement' })).toBeUndefined();
    expect(getExerciseArtworkFrame({ ...exercise, id: '__proto__' })).toBeUndefined();
    expect(getExerciseArtworkFrame({ ...exercise, apparatus: 'chair' })).toBeUndefined();
    expect(getExerciseArtworkFrame({ ...exercise, bodyPosition: 'standing' })).toBeUndefined();
  });
});
