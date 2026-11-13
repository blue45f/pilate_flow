import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LiveStageKinematicDiagram } from './LiveStageKinematicDiagram';
import { MovementDiagramReference } from './MovementDiagramReference';
import { EXPANDED_MOVEMENTS } from '../data/expandedMovements';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';

vi.mock('../hooks/useMotionPlaybackEnvironment', () => ({
  useMotionPlaybackEnvironment: () => ({ canAnimate: true, reducedMotion: false }),
}));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('source-only live and reference surfaces', () => {
  it('does not start a live animation for any expanded movement and cancels a prior native animation on switch', () => {
    const requestFrame = vi.fn(() => 17);
    const cancelFrame = vi.fn();
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    vi.stubGlobal('cancelAnimationFrame', cancelFrame);
    const { rerender, container } = render(<LiveStageKinematicDiagram exercise={EXPANDED_MOVEMENTS[0]} running />);
    for (const exercise of EXPANDED_MOVEMENTS) {
      rerender(<LiveStageKinematicDiagram exercise={exercise} running />);
      expect(screen.getByTestId('motion-source-reference')).toHaveAttribute('data-exercise-id', exercise.id);
      expect(screen.queryByTestId('live-stage-diagram-phase-label')).toBeNull();
      expect(screen.queryByTestId('live-stage-diagram-anchors')).toBeNull();
      expect(screen.queryByTestId('live-stage-diagram-static-toggle')).toBeNull();
      expect(container.querySelector('[data-joint-node]')).toBeNull();
    }
    expect(requestFrame).not.toHaveBeenCalled();
    const historical = INITIAL_EXERCISES.find((exercise) => exercise.id === 'original-reformer-parallel-footwork')!;
    rerender(<LiveStageKinematicDiagram exercise={historical} running />);
    expect(requestFrame).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('live-stage-diagram-static-toggle')).toBeInTheDocument();
    rerender(<LiveStageKinematicDiagram exercise={EXPANDED_MOVEMENTS[0]} running />);
    expect(cancelFrame).toHaveBeenCalledWith(17);
    expect(screen.queryByTestId('live-stage-kinematic-diagram')).toBeNull();
  });

  it('opens source video information instead of nested phase controls or fallback pose labels', () => {
    const exercise = EXPANDED_MOVEMENTS.find((item) => item.id === 'expanded-mat-leg-pull-front')!;
    const { container } = render(<MovementDiagramReference exercise={exercise} />);
    const disclosure = container.querySelector('details')!;
    expect(disclosure).not.toHaveAttribute('open');
    disclosure.open = true;
    fireEvent(disclosure, new Event('toggle'));
    expect(screen.getByTestId('motion-source-reference')).toHaveAttribute('data-native-motion-available', 'false');
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://onlinepilatesclasses.com/pilates-exercises/mat-exercises/mat-leg-pull-front/');
    expect(container.querySelector('[role="tab"], [role="slider"], [data-joint-node]')).toBeNull();
    expect(container.querySelectorAll('button')).toHaveLength(0);
    expect(container.textContent).not.toContain('스완');
    expect(container.textContent).not.toContain('기구 지지점');
    expect(container.textContent).not.toContain('핵심 변화');
  });
});
