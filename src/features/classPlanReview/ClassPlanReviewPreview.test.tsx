import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  ClassPlanReviewFixtureHarness,
  ClassPlanReviewPreview,
} from './ClassPlanReviewPreview';
import {
  CLASS_PLAN_REVIEW_FIXTURE_PRESETS,
  SYNTHETIC_30MIN_NORMAL_CLASS_FIXTURE,
  SYNTHETIC_50MIN_NORMAL_CLASS_FIXTURE,
  SYNTHETIC_CORRUPTED_INPUT_FIXTURE,
  SYNTHETIC_EMPTY_CLASS_FIXTURE,
  SYNTHETIC_MINIMAL_HUMAN_DRAFTS,
  SYNTHETIC_MIXED_REST_SIDE_UNSPECIFIED_FIXTURE,
  SYNTHETIC_NAME_ONLY_DRAFT_FIXTURE,
} from './classPlanReviewFixtures';

describe('ClassPlanReviewPreview & ClassPlanReviewFixtureHarness', () => {
  it('renders in logical reading order: Boundary Banner -> Timing -> Laterality -> Issues -> Items', () => {
    render(<ClassPlanReviewPreview source={SYNTHETIC_30MIN_NORMAL_CLASS_FIXTURE} />);

    const banner = screen.getByTestId('review-boundary-banner');
    const timing = screen.getByTestId('review-timing-section');
    const laterality = screen.getByTestId('review-laterality-section');
    const issues = screen.getByTestId('review-issues-section');
    const items = screen.getByTestId('review-items-section');

    expect(
      banner.compareDocumentPosition(timing) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      timing.compareDocumentPosition(laterality) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      laterality.compareDocumentPosition(issues) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      issues.compareDocumentPosition(items) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    expect(screen.getByTestId('review-disclaimer-text').textContent).toContain(
      '운동 처방이나 신체적 효과·안전을 보증하지 않습니다',
    );
  });

  it('clearly separates known total time from unspecified duration items without faking 0 seconds', () => {
    render(<ClassPlanReviewPreview source={SYNTHETIC_MIXED_REST_SIDE_UNSPECIFIED_FIXTURE} />);

    const knownTotalCard = screen.getByTestId('metric-known-total');
    expect(knownTotalCard.textContent).toContain('27분');
    expect(knownTotalCard.textContent).toContain('시간 미정 2개');

    const unspecCard = screen.getByTestId('metric-unspecified-count');
    expect(unspecCard.textContent).toContain('시간 미정 2개');
    expect(unspecCard.textContent).toContain('0초로 계산하지 않고');

    const unspecItemRow = screen.getByTestId('review-item-step-mix-8-unspec-1');
    expect(unspecItemRow.textContent).toContain('시간 미정 (0초로 계산하지 않음)');
  });

  it('supports keyboard navigation on category filter tabs (ArrowRight, ArrowLeft, Home, End)', () => {
    render(<ClassPlanReviewPreview source={SYNTHETIC_MIXED_REST_SIDE_UNSPECIFIED_FIXTURE} />);

    const tabAll = screen.getByTestId('review-tab-all');
    const tabTiming = screen.getByTestId('review-tab-timing');
    const tabLaterality = screen.getByTestId('review-tab-laterality');
    const tabDiagnostic = screen.getByTestId('review-tab-input-diagnostic');

    tabAll.focus();
    expect(document.activeElement).toBe(tabAll);
    expect(tabAll.getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(tabAll, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tabTiming);
    expect(tabTiming.getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(tabTiming, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tabLaterality);
    expect(tabLaterality.getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(tabLaterality, { key: 'End' });
    expect(document.activeElement).toBe(tabDiagnostic);
    expect(tabDiagnostic.getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(tabDiagnostic, { key: 'Home' });
    expect(document.activeElement).toBe(tabAll);
    expect(tabAll.getAttribute('aria-selected')).toBe('true');

    fireEvent.keyDown(tabAll, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(tabDiagnostic);
    expect(tabDiagnostic.getAttribute('aria-selected')).toBe('true');
  });

  it('moves keyboard focus to the corresponding item row when an issue itemId jump button is activated', () => {
    render(<ClassPlanReviewPreview source={SYNTHETIC_MIXED_REST_SIDE_UNSPECIFIED_FIXTURE} />);

    const jumpButtons = screen.getAllByTestId('jump-to-item-step-mix-4-unpaired-left');
    expect(jumpButtons.length).toBeGreaterThan(0);

    fireEvent.click(jumpButtons[0]);

    const targetItem = screen.getByTestId('review-item-step-mix-4-unpaired-left');
    expect(document.activeElement).toBe(targetItem);
    expect(targetItem.className).toContain('cpr-item-card--highlighted');
  });

  it('renders name-only creative movement drafts cleanly without requiring anatomy or health metadata', () => {
    render(
      <ClassPlanReviewPreview
        source={SYNTHETIC_NAME_ONLY_DRAFT_FIXTURE}
        options={{ humanDrafts: SYNTHETIC_MINIMAL_HUMAN_DRAFTS }}
      />,
    );

    const draftRow1 = screen.getByTestId('review-item-draft-step-1');
    expect(draftRow1.textContent).toContain('갈비뼈 호흡 서클 초안');
    expect(draftRow1.textContent).toContain('이름만 적은 창작 초안');
    expect(draftRow1.textContent).toContain('좌우 미지정');
    expect(draftRow1.textContent).toContain('시간 미정');

    const draftRow2 = screen.getByTestId('review-item-draft-step-2');
    expect(draftRow2.textContent).toContain('스트랩 잡고 한쪽 다리 롱 서클');
    expect(draftRow2.textContent).toContain('5분');
  });

  it('renders 50-minute normal, empty, and corrupted fixtures without crashing and switches presets in harness', () => {
    const { unmount } = render(
      <ClassPlanReviewPreview source={SYNTHETIC_50MIN_NORMAL_CLASS_FIXTURE} />,
    );
    expect(screen.getByTestId('metric-known-total').textContent).toContain('50분');
    unmount();

    const { unmount: unmountEmpty } = render(
      <ClassPlanReviewPreview source={SYNTHETIC_EMPTY_CLASS_FIXTURE} />,
    );
    expect(screen.getByTestId('review-empty-items-message')).toBeInTheDocument();
    expect(screen.getByTestId('review-issue-empty-class-plan')).toBeInTheDocument();
    unmountEmpty();

    const { unmount: unmountCorrupted } = render(
      <ClassPlanReviewPreview source={SYNTHETIC_CORRUPTED_INPUT_FIXTURE} />,
    );
    expect(screen.getByTestId('review-issue-invalid-target-duration')).toBeInTheDocument();
    expect(
      screen.getAllByTestId('review-issue-invalid-item-duration').length,
    ).toBeGreaterThanOrEqual(1);
    unmountCorrupted();

    render(<ClassPlanReviewFixtureHarness />);
    for (const preset of CLASS_PLAN_REVIEW_FIXTURE_PRESETS) {
      const btn = screen.getByTestId(`fixture-preset-${preset.id}`);
      fireEvent.click(btn);
      expect(btn.getAttribute('aria-pressed')).toBe('true');
      expect(screen.getByTestId('fixture-preset-description').textContent).toBe(
        preset.descriptionKo,
      );
    }
  });

  it('maintains narrow-viewport (320px and 390px) responsive container structure without horizontal overflow', () => {
    for (const widthPx of [320, 390]) {
      const { container, unmount } = render(
        <div style={{ width: `${widthPx}px`, maxWidth: `${widthPx}px`, overflow: 'hidden' }}>
          <ClassPlanReviewPreview source={SYNTHETIC_MIXED_REST_SIDE_UNSPECIFIED_FIXTURE} />
        </div>,
      );

      const root = within(container).getByTestId('class-plan-review-preview');
      expect(root).toHaveClass('cpr-root');
      expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);
      unmount();
    }
  });
});
