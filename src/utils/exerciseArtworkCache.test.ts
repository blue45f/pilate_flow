import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import manifest from '../data/exerciseArtworkManifest.json';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { getExerciseArtworkFrame } from './exerciseArtworkCache';

describe('shared-model SVG thumbnail cache', () => {
  it('has a self-contained, content-addressed SVG for all three phases of each of the 98 authored catalog patterns', () => {
    const native = INITIAL_EXERCISES.filter((exercise) => !exercise.id.startsWith('expanded-'));
    expect(Object.keys(manifest.entries)).toHaveLength(native.length);
    expect(native).toHaveLength(98);
    for (const exercise of native) {
      for (const phase of ['start', 'middle', 'end'] as const) {
        const frame = getExerciseArtworkFrame(exercise, phase)!;
        expect(frame, `${exercise.id}/${phase}`).toBeDefined();
        expect(frame.src).toMatch(/^\/motion-artwork-v2\/[a-zA-Z0-9_.-]+\.svg$/);
        const svg = readFileSync(path.join(process.cwd(), 'public', frame.src), 'utf8');
        expect(Buffer.byteLength(svg)).toBe(frame.bytes);
        expect(createHash('sha256').update(svg).digest('hex')).toBe(frame.sha256);
        expect(frame.src).toContain(frame.sha256.slice(0, 12));
        expect(svg).toContain(`data-exercise-id="${exercise.id}"`);
        expect(svg).toContain(`data-phase="${phase}"`);
        expect(svg).toContain('viewBox="0 0 320 200"');
        expect(svg).not.toMatch(/NaN|Infinity|<script|<foreignObject|(?:href|src)="https?:/);
        expect(svg).not.toContain('data-layer="joint-alignment"');
      }
    }
    expect(manifest.professionalReviewVerified).toBe(false);
    expect(manifest.sourceFrameMappingVerified).toBe(false);
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
