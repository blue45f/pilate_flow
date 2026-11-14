import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import manifest from '../data/exerciseArtworkManifest.json';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { getExerciseArtworkFrame } from './exerciseArtworkCache';

describe('shared-model WebP thumbnail cache', () => {
  it('has valid content-addressed 640x400 WebP bytes for all three phases of 98 authored patterns', async () => {
    const native = INITIAL_EXERCISES.filter((exercise) => !exercise.id.startsWith('expanded-'));
    expect(Object.keys(manifest.entries)).toHaveLength(native.length);
    expect(native).toHaveLength(98);
    expect(manifest).toMatchObject({
      schemaVersion: 2,
      format: 'webp',
      width: 640,
      height: 400,
      rasterization: { webp: { quality: 88 }, encoder: { sharp: '0.34.5' } },
      professionalReviewVerified: false,
      sourceFrameMappingVerified: false,
    });
    for (const exercise of native) {
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
    const atlas = readFileSync('public/images/motion-atlas-v3/practitioner.webp');
    expect(manifest).toHaveProperty('sourceAssets', [
      expect.objectContaining({
        src: '/images/motion-atlas-v3/practitioner.webp',
        sha256: createHash('sha256').update(atlas).digest('hex'),
        embeddedMimeType: 'image/png',
      }),
    ]);
  });

  it('does not reuse a cached human pose for an unknown, source-only, or changed-apparatus movement', () => {
    for (const exercise of INITIAL_EXERCISES.filter((item) => item.id.startsWith('expanded-'))) {
      expect(getExerciseArtworkFrame(exercise)).toBeUndefined();
    }
    const exercise = INITIAL_EXERCISES.find((item) => item.apparatus === 'mat')!;
    expect(getExerciseArtworkFrame({ ...exercise, id: 'a-new-movement' })).toBeUndefined();
    expect(getExerciseArtworkFrame({ ...exercise, id: '__proto__' })).toBeUndefined();
    expect(getExerciseArtworkFrame({ ...exercise, apparatus: 'chair' })).toBeUndefined();
    expect(getExerciseArtworkFrame({ ...exercise, bodyPosition: 'standing' })).toBeUndefined();
  });
});
