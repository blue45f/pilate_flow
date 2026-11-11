import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Apparatus3dRigPreviewCard } from '../components/Apparatus3dRigPreviewCard';

describe('Parallel Track 4 — Visual Showcase Mockup & 3D Rig Motion Accessibility', () => {
  it('ships 06-parallel-full-suite-showcase.html and renders motion-safe Korean guide note in Apparatus3dRigPreviewCard', () => {
    expect(
      existsSync(
        resolve(
          process.cwd(),
          'docs/design-system-mockups/06-parallel-full-suite-showcase.html',
        ),
      ),
    ).toBe(true);

    render(
      <Apparatus3dRigPreviewCard
        apparatus="reformer"
        bodyPosition="supine"
        springsLabel="1R 1B"
        exerciseTitleKo="풋워크"
      />,
    );

    expect(screen.getByTestId('apparatus-3d-rig-preview')).toBeInTheDocument();
    expect(screen.getByTestId('rig-3d-motion-safe-note')).toBeInTheDocument();
  });
});
