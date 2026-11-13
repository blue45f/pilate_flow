import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExtendedMotionVerificationPanel } from './ExtendedMotionVerificationPanel';
import { MovementDifferenceCompareView, MovementVisualGuideCard } from './MovementVisualGuideCard';
import { EXPANDED_MOVEMENTS } from '../data/expandedMovements';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import * as extendedAudit from '../data/extendedMotionVerificationCatalog';
import * as visualAudit from '../data/movementVisualSourceAudit';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const expanded = EXPANDED_MOVEMENTS.find((exercise) => exercise.id === 'expanded-mat-leg-pull-front')!;
const historical = INITIAL_EXERCISES.find((exercise) => exercise.id === 'original-mat-chest-lift')!;

describe('motion audit record presence', () => {
  it('shows an absent record rather than a failed integrity check for a new source-linked movement', () => {
    render(<ExtendedMotionVerificationPanel exercise={expanded} />);
    expect(screen.getByTestId('extended-factual-sha256-badge')).toHaveTextContent('프레임 대조 기록 없음');
    const boundary = screen.getByTestId('extended-verification-boundary-notice');
    expect(boundary).toHaveAttribute('data-integrity-state', 'unrecorded');
    expect(boundary).not.toHaveTextContent('불일치');
    expect(boundary.querySelector('code')).toBeNull();
  });

  it('still reports a mismatch when a stored record is present and fails its integrity check', () => {
    const bundle = extendedAudit.resolveExtendedMotionSourceAudit(historical);
    vi.spyOn(extendedAudit, 'resolveExtendedMotionSourceAudit').mockReturnValue({
      ...bundle,
      primaryFactualRecordSha256: 'a'.repeat(64),
      sha256IntegrityVerified: false,
    });
    render(<ExtendedMotionVerificationPanel exercise={historical} />);
    const boundary = screen.getByTestId('extended-verification-boundary-notice');
    expect(boundary).toHaveAttribute('data-integrity-state', 'mismatch');
    expect(boundary).toHaveTextContent('불일치');
    expect(boundary).toHaveTextContent('a'.repeat(64));
  });

  it('does not render an empty SHA badge in the historical guide when its source has no record', () => {
    const comparison = visualAudit.getVisualSourceComparison(historical);
    vi.spyOn(visualAudit, 'getVisualSourceComparison').mockReturnValue({
      ...comparison,
      extendedAuditSummary: { ...comparison.extendedAuditSummary, factualRecordSha256: '' },
    });
    render(<MovementVisualGuideCard exercise={historical} />);
    const badge = screen.getByTestId('visual-guide-extended-audit-sha256');
    expect(badge).toHaveAttribute('data-record-state', 'unrecorded');
    expect(badge).toHaveTextContent('프레임 대조 기록 없음');
    expect(badge).not.toHaveTextContent('SHA-256:');
  });

  it('never exposes a fallback archetype, delta, or phase selector in a source-only guide or comparison', () => {
    const { container, unmount } = render(<MovementVisualGuideCard exercise={expanded} />);
    expect(screen.getByTestId('motion-source-reference')).toHaveAttribute('data-native-motion-available', 'false');
    expect(container.textContent).not.toContain('아키타입');
    expect(container.textContent).not.toContain('스완');
    expect(container.querySelector('[role="tab"]')).toBeNull();
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://onlinepilatesclasses.com/pilates-exercises/mat-exercises/mat-leg-pull-front/');
    unmount();
    const comparison = render(<MovementDifferenceCompareView leftExercise={historical} rightExercise={expanded} />);
    expect(comparison.container.querySelector('[data-joint-node]')).toBeNull();
    expect(comparison.container.textContent).not.toContain('핵심 차이');
    expect(comparison.container.querySelector('[role="tab"]')).toBeNull();
  });
});
