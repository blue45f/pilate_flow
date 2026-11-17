import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import manifest from '../data/exerciseArtworkManifest.json';
import { GLOBAL_CRAWLED_REPERTOIRE_EXERCISES } from '../data/globalCrawledRepertoirePack';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { getExerciseArtworkFrame } from './exerciseArtworkCache';

describe('shared-model 3D WebP thumbnail cache', () => {
  it('has valid content-addressed 640x400 3D WebP bytes for all three phases of all 218 dedicated exercises', async () => {
    const allDedicated = [...INITIAL_EXERCISES, ...GLOBAL_CRAWLED_REPERTOIRE_EXERCISES];
    expect(allDedicated).toHaveLength(218);
    expect(Object.keys(manifest.entries)).toHaveLength(allDedicated.length);
    expect(manifest).toMatchObject({
      schemaVersion: 3,
      renderer: 'BlenderCycles3DStudio',
      format: 'webp',
      width: 640,
      height: 400,
      rasterization: { webp: { quality: 88 } },
      professionalReviewVerified: false,
      sourceFrameMappingVerified: false,
    });
    for (const exercise of allDedicated) {
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
        expect(await sharp(bytes).metadata()).toMatchObject({
          format: 'webp',
          width: 640,
          height: 400,
        });
      }
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
