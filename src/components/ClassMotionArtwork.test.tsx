import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import type { SequenceStep } from '../types/pilates';
import { resolveClassCardVisualMeta } from '../utils/memberBookingBridge';
import { resolveClassArtworkExercise } from '../utils/classArtworkExercise';
import { ClassMotionArtwork } from './ClassMotionArtwork';

const exercise = INITIAL_EXERCISES.find((item) => item.id === 'original-mat-bridge')!;
const movement: SequenceStep = { stepId: 'linked-artwork', exerciseId: exercise.id, order: 3, blockCategory: 'bridging', durationMin: 3, selectedLayer: 'standard' };

afterEach(cleanup);

describe('class artwork identity', () => {
  it('derives the first known movement from a linked sequence while skipping rest and unknown rows', () => {
    const steps: SequenceStep[] = [
      { ...movement, stepId: 'rest', kind: 'rest', exerciseId: '', order: 1 },
      { ...movement, stepId: 'unknown', exerciseId: 'missing-exercise', order: 2 },
      movement,
    ];
    const before = JSON.stringify(steps);
    const meta = resolveClassCardVisualMeta({ sequence: { steps, apparatus: 'mat' }, exercises: [exercise] });
    expect(meta.firstExerciseId).toBe(exercise.id);
    expect(JSON.stringify(steps)).toBe(before);
    const view = render(<ClassMotionArtwork firstExerciseId={meta.firstExerciseId} exercises={[exercise]} fallbackSrc={meta.studio3dThumbUrl} />);
    expect(view.container.querySelector('.exercise-motion-artwork')).toHaveAttribute('data-exercise-id', exercise.id);
    expect(view.container.querySelector('img')?.getAttribute('src')).toMatch(/^\/motion-artwork-v2\/.+\.svg$/);
  });

  it('does not infer an exercise identity from an apparatus image filename', () => {
    const meta = resolveClassCardVisualMeta({ fallbackApparatus: 'reformer', exercises: [] });
    expect(meta.firstExerciseId).toBeUndefined();
    const view = render(<ClassMotionArtwork exercises={[]} fallbackSrc="/motion-studio3d/footwork-peak.png" />);
    expect(view.container.querySelector('.exercise-motion-artwork')).toBeNull();
    expect(view.container.querySelector('img')).toHaveAttribute('src', '/motion-studio3d/footwork-peak.png');
    view.rerender(<ClassMotionArtwork firstExerciseId="unknown" exercises={[]} fallbackSrc="/motion-studio3d/footwork-peak.png" />);
    expect(view.container.querySelector('.exercise-motion-artwork')).toBeNull();
  });

  it('resolves current store data first and uses canonical data only for a known matching id', () => {
    const edited = { ...exercise, nameKo: '내 브리지 준비' };
    expect(resolveClassArtworkExercise(exercise.id, [edited])).toBe(edited);
    expect(resolveClassArtworkExercise(exercise.id, [])).toBe(exercise);
    expect(resolveClassArtworkExercise('unknown', [edited])).toBeUndefined();
    expect(resolveClassArtworkExercise(undefined, [edited])).toBeUndefined();
  });
});
