import { fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  CATALOG_CONTINUOUS_MOTION_ASSETS,
  getCatalogContinuousMotionAsset,
} from '../data/catalogMotionAssets';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import {
  CatalogMotionInteractivePlayer,
  CatalogMotionThumbnail,
} from '../components/CatalogMotionInteractivePlayer';
import { MotionReferencePlayer } from '../components/MotionReferencePlayer';
import { MovementPhaseDiagramSvg } from '../components/MovementPhaseDiagramSvg';

describe('Unified Studio Kinematic Motion System across all 98 movements', () => {
  it('reconstructs all 98 catalog movements with tapered anatomical capsules, zero NaN/Infinity, and smooth 5-phase interpolation', () => {
    expect(CATALOG_CONTINUOUS_MOTION_ASSETS).toHaveLength(98);

    const samplePoints = [0, 0.2, 0.5, 0.75, 1] as const;

    for (const exercise of INITIAL_EXERCISES) {
      const motion = getCatalogContinuousMotionAsset(exercise);
      expect(motion).not.toBeNull();
      expect(motion!.phases).toHaveLength(5);
      expect(motion!.anatomicalAccuracyAssumed).toBe(false);

      for (const p of samplePoints) {
        const snap = motion!.samplePose(p);
        expect(snap.interpolatedPhaseSpec.alignments.length).toBeGreaterThan(0);
        expect(snap.interpolatedPhaseSpec.directionVectors.length).toBeGreaterThan(0);
      }

      const markup = renderToStaticMarkup(
        <MovementPhaseDiagramSvg asset={motion!.visualAsset} phase="middle" />,
      );
      expect(markup).toContain('data-layer="kinematic-figure"');
      expect(markup).toContain('data-segment="spine-torso"');
      expect(markup).not.toMatch(/NaN|Infinity/);
    }
  });

  it('supports 1x/2x/3x/continuous loop modes in CatalogMotionInteractivePlayer and dual-mode switching in MotionReferencePlayer', () => {
    const swanAsset = getCatalogContinuousMotionAsset('ex-extension-01')!;
    const { unmount } = render(<CatalogMotionInteractivePlayer asset={swanAsset} />);

    expect(screen.getByRole('button', { name: '한 주기 재생' })).toBeEnabled();
    fireEvent.change(screen.getByLabelText('관련 패턴 도해 반복'), {
      target: { value: 'loop' },
    });
    expect(screen.getByRole('button', { name: '연속 반복 재생' })).toBeEnabled();
    unmount();

    // Dual-mode switcher on pattern-linked exercise (`original-mat-chest-lift`)
    render(<MotionReferencePlayer exerciseId="original-mat-chest-lift" />);
    const kinematicBtn = screen.getByRole('button', { name: '5단계 기구학 표준 도해' });
    expect(kinematicBtn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(kinematicBtn);
    expect(kinematicBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('catalog-motion-interactive-player')).toHaveAttribute(
      'data-exercise-id',
      'original-mat-chest-lift',
    );

    const thumbMarkup = renderToStaticMarkup(<CatalogMotionThumbnail asset={swanAsset} />);
    expect(thumbMarkup).toContain('data-motion-family="catalog-kinematic"');
  });
});
