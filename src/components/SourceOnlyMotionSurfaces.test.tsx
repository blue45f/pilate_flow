import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LiveStageKinematicDiagram } from './LiveStageKinematicDiagram';
import { MovementDiagramReference } from './MovementDiagramReference';
import { EXPANDED_MOVEMENTS } from '../data/expandedMovements';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';

vi.mock('../hooks/useMotionPlaybackEnvironment', () => ({
  useMotionPlaybackEnvironment: () => ({ canAnimate: true, reducedMotion: false }),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('live 3D stage and legacy 2D reference surfaces', () => {
  it('runs dedicated 3D live motion for all 60 expanded movements and cancels animation cleanly on switch/stop', () => {
    const requestFrame = vi.fn(() => 17);
    const cancelFrame = vi.fn();
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    vi.stubGlobal('cancelAnimationFrame', cancelFrame);
    const { rerender } = render(
      <LiveStageKinematicDiagram exercise={EXPANDED_MOVEMENTS[0]!} running />,
    );
    for (const exercise of EXPANDED_MOVEMENTS) {
      rerender(<LiveStageKinematicDiagram exercise={exercise} running />);
      expect(screen.getByTestId('live-stage-kinematic-diagram')).toHaveAttribute(
        'data-exercise-id',
        exercise.id,
      );
      expect(screen.getByTestId('live-stage-kinematic-diagram')).toHaveAttribute(
        'data-3d-rig-scope',
        'dedicated-3d-rig',
      );
      expect(screen.getByTestId('live-stage-diagram-phase-label')).toBeInTheDocument();
      expect(screen.getByTestId('live-stage-diagram-anchors')).toBeInTheDocument();
      expect(screen.getByTestId('live-stage-diagram-static-toggle')).toBeInTheDocument();
    }
    const historical = INITIAL_EXERCISES.find(
      (exercise) => exercise.id === 'original-reformer-parallel-footwork',
    )!;
    rerender(<LiveStageKinematicDiagram exercise={historical} running={false} />);
    expect(cancelFrame).toHaveBeenCalledWith(17);
  });

  it('opens source video information in legacy 2D clinical disclosure instead of 2D fallback pose labels', () => {
    const exercise = EXPANDED_MOVEMENTS.find((item) => item.id === 'expanded-mat-leg-pull-front')!;
    const { container } = render(<MovementDiagramReference exercise={exercise} />);
    const disclosure = container.querySelector('details')!;
    expect(disclosure).not.toHaveAttribute('open');
    disclosure.open = true;
    fireEvent(disclosure, new Event('toggle'));
    expect(screen.getByTestId('motion-source-reference')).toHaveAttribute(
      'data-native-motion-available',
      'false',
    );
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      'https://onlinepilatesclasses.com/pilates-exercises/mat-exercises/mat-leg-pull-front/',
    );
    expect(container.querySelector('[role="tab"], [role="slider"], [data-joint-node]')).toBeNull();
    expect(container.querySelectorAll('button')).toHaveLength(0);
    expect(container.textContent).not.toContain('스완');
    expect(container.textContent).not.toContain('기구 지지점');
    expect(container.textContent).not.toContain('핵심 변화');
  });
});
