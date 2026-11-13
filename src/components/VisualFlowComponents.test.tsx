import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import type { SequenceStep } from '../types/pilates';
import { VisualSequenceFilmstrip } from './VisualFlowComponents';

const exercise = syntheticPlanningExercise('mat', 'core');
const movement: SequenceStep = {
  stepId: 'visual-movement',
  order: 2,
  blockCategory: 'core',
  exerciseId: exercise.id,
  durationMin: 4,
  selectedLayer: 'standard',
};
const rest: SequenceStep = {
  ...movement,
  stepId: 'visual-rest',
  order: 1,
  kind: 'rest',
  exerciseId: '',
};
const exerciseMap = new Map([[exercise.id, exercise]]);

afterEach(cleanup);

describe('VisualSequenceFilmstrip selection', () => {
  it('retains the original sequence index after skipping rest and missing exercises', () => {
    const onSelect = vi.fn();
    render(
      <VisualSequenceFilmstrip
        steps={[rest, movement, { ...movement, stepId: 'missing', exerciseId: 'missing' }]}
        exercisesById={exerciseMap}
        activeStepId={movement.stepId}
        onSelectStep={onSelect}
      />,
    );
    const button = screen.getByRole('button', { name: `필름스트립 2번 ${exercise.nameKo} 이동` });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledWith(movement, 1, button);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByText(/계획용 동작 도해/)).toBeInTheDocument();
  });

  it('exposes static movement names and the number beyond the preview limit', () => {
    render(
      <VisualSequenceFilmstrip
        steps={[movement, { ...movement, stepId: 'second' }]}
        exercisesById={exerciseMap}
        maxFrames={1}
      />,
    );
    expect(
      screen.getByRole('img', { name: `1. ${exercise.nameKo} 동작 도해` }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('미리보기 외 동작 1개')).toBeInTheDocument();
  });
});
