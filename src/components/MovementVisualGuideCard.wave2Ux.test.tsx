import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ExtendedMotionVerificationPanel } from './ExtendedMotionVerificationPanel';
import { MovementVisualGuideCard } from './MovementVisualGuideCard';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';

afterEach(() => {
  cleanup();
});

describe('MovementVisualGuideCard Wave 2 UX & Accessibility Recovery', () => {
  const reformerExercise = INITIAL_EXERCISES.find(
    (ex) => ex.id === 'ex-footwork-01',
  )!;
  const matExercise = INITIAL_EXERCISES.find(
    (ex) => ex.id === 'original-mat-swan-prep',
  )!;
  const krCandidateExercise = INITIAL_EXERCISES.find(
    (ex) => ex.id === 'ex-kr-reformer-01',
  )!;

  it('wires view-mode role="tablist" tabs to the .visual-diagram-viewport role="tabpanel" via id, aria-controls, and aria-labelledby', () => {
    render(<MovementVisualGuideCard exercise={reformerExercise} />);

    const stripTab = screen.getByTestId('view-mode-tab-three-phase-strip');
    const focusTab = screen.getByTestId('view-mode-tab-single-phase-focus');
    const compareTab = screen.getByTestId('view-mode-tab-difference-compare');
    const viewport = screen.getByTestId('visual-diagram-viewport');

    expect(viewport).toHaveClass('visual-diagram-viewport');
    expect(viewport).toHaveAttribute('role', 'tabpanel');

    const viewportId = viewport.getAttribute('id');
    expect(viewportId).toBeTruthy();

    for (const tab of [stripTab, focusTab, compareTab]) {
      expect(tab).toHaveAttribute('role', 'tab');
      expect(tab.getAttribute('id')).toBeTruthy();
      expect(tab).toHaveAttribute('aria-controls', viewportId);
    }

    // Initial active tab is three-phase-strip
    expect(stripTab).toHaveAttribute('aria-selected', 'true');
    expect(viewport).toHaveAttribute(
      'aria-labelledby',
      stripTab.getAttribute('id'),
    );

    // Navigate right to single-phase-focus
    stripTab.focus();
    fireEvent.keyDown(stripTab, { key: 'ArrowRight' });
    expect(focusTab).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(focusTab);
    expect(viewport).toHaveAttribute(
      'aria-labelledby',
      focusTab.getAttribute('id'),
    );

    // Navigate right to difference-compare
    fireEvent.keyDown(focusTab, { key: 'ArrowRight' });
    expect(compareTab).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(compareTab);
    expect(viewport).toHaveAttribute(
      'aria-labelledby',
      compareTab.getAttribute('id'),
    );
  });

  it('supports ArrowRight, ArrowLeft, Home, and End keyboard roving navigation and >=44px touch targets on compare-phase buttons', () => {
    render(
      <MovementVisualGuideCard
        exercise={reformerExercise}
        initialViewMode="difference-compare"
        initialPhase="middle"
      />,
    );

    const compareView = screen.getByTestId('movement-difference-compare-view');
    const startBtn = screen.getByTestId('compare-phase-btn-start');
    const middleBtn = screen.getByTestId('compare-phase-btn-middle');
    const endBtn = screen.getByTestId('compare-phase-btn-end');

    for (const btn of [startBtn, middleBtn, endBtn]) {
      expect(btn.style.minHeight).toBe('44px');
    }

    // Initial phase is middle
    expect(compareView).toHaveAttribute('data-selected-phase', 'middle');
    expect(middleBtn).toHaveAttribute('aria-pressed', 'true');
    expect(middleBtn).toHaveAttribute('tabIndex', '0');
    expect(startBtn).toHaveAttribute('tabIndex', '-1');
    expect(endBtn).toHaveAttribute('tabIndex', '-1');

    // ArrowRight: middle -> end
    middleBtn.focus();
    fireEvent.keyDown(middleBtn, { key: 'ArrowRight' });
    expect(compareView).toHaveAttribute('data-selected-phase', 'end');
    expect(endBtn).toHaveAttribute('aria-pressed', 'true');
    expect(endBtn).toHaveAttribute('tabIndex', '0');
    expect(document.activeElement).toBe(endBtn);

    // ArrowRight wrap: end -> start
    fireEvent.keyDown(endBtn, { key: 'ArrowRight' });
    expect(compareView).toHaveAttribute('data-selected-phase', 'start');
    expect(startBtn).toHaveAttribute('aria-pressed', 'true');
    expect(document.activeElement).toBe(startBtn);

    // ArrowLeft wrap: start -> end
    fireEvent.keyDown(startBtn, { key: 'ArrowLeft' });
    expect(compareView).toHaveAttribute('data-selected-phase', 'end');
    expect(endBtn).toHaveAttribute('aria-pressed', 'true');
    expect(document.activeElement).toBe(endBtn);

    // Home: end -> start
    fireEvent.keyDown(endBtn, { key: 'Home' });
    expect(compareView).toHaveAttribute('data-selected-phase', 'start');
    expect(document.activeElement).toBe(startBtn);

    // End: start -> end
    fireEvent.keyDown(startBtn, { key: 'End' });
    expect(compareView).toHaveAttribute('data-selected-phase', 'end');
    expect(document.activeElement).toBe(endBtn);
  });

  it('uses repeat(auto-fit, minmax(min(100%, 240px), 1fr)) on all responsive grids to prevent 320px horizontal overflow', () => {
    render(
      <MovementVisualGuideCard
        exercise={reformerExercise}
        initialViewMode="difference-compare"
      />,
    );

    const expectedGridTemplate =
      'repeat(auto-fit, minmax(min(100%, 240px), 1fr))';

    const poseDeltaGrid = screen.getByTestId('pose-delta-summary-grid');
    const detailPanelsGrid = screen.getByTestId('visual-detail-panels-grid');
    const compareDiagramsGrid = screen.getByTestId(
      'difference-compare-diagrams-grid',
    );
    const compareDimensionsGrid = screen.getByTestId(
      'comparison-dimensions-list',
    );

    expect(poseDeltaGrid.style.gridTemplateColumns).toBe(expectedGridTemplate);
    expect(detailPanelsGrid.style.gridTemplateColumns).toBe(
      expectedGridTemplate,
    );
    expect(compareDiagramsGrid.style.gridTemplateColumns).toBe(
      expectedGridTemplate,
    );
    expect(compareDimensionsGrid.style.gridTemplateColumns).toBe(
      expectedGridTemplate,
    );
  });

  it('uses high-contrast CSS variable fallbacks and preserves honest source comparison disclaimers without false verification labels', () => {
    const { rerender } = render(
      <>
        <MovementVisualGuideCard exercise={matExercise} />
        <ExtendedMotionVerificationPanel exercise={matExercise} />
      </>,
    );

    const strip = screen.getByTestId('visual-guide-extended-audit-strip');
    expect(strip).toHaveTextContent('대조 기록 (전문가 검증 전)');
    expect(strip.textContent).not.toContain('검증 완료');

    const panel = screen.getByTestId('extended-motion-verification-panel');
    const summaryCard = screen.getByTestId('extended-source-audit-summary');
    const boundaryNotice = screen.getByTestId(
      'extended-verification-boundary-notice',
    );

    expect(panel.getAttribute('style')).toContain(
      'var(--pf-color-bg-surface-subtle, #f8fafc)',
    );
    expect(panel.getAttribute('style')).toContain(
      'var(--pf-color-text-primary, #0f172a)',
    );
    expect(summaryCard.getAttribute('style')).toContain(
      'var(--pf-color-bg-surface, #ffffff)',
    );
    expect(boundaryNotice).toHaveTextContent(
      '일치 (내용 정확성·전문가 검증 아님)',
    );
    expect(boundaryNotice.textContent).not.toContain('검증 완료');
    expect(boundaryNotice.textContent).not.toContain('대조 완료');

    rerender(
      <>
        <MovementVisualGuideCard exercise={krCandidateExercise} />
        <ExtendedMotionVerificationPanel exercise={krCandidateExercise} />
      </>,
    );

    const krStrip = screen.getByTestId('visual-guide-extended-audit-strip');
    expect(krStrip).toHaveTextContent('대조 기록 (전문가 검증 전)');
    expect(krStrip.textContent).not.toContain('검증 완료');
  });
});
