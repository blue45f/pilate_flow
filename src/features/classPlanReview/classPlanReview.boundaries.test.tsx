import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { reviewClassPlan, analyzeNormalizedClassPlan } from './classPlanReviewAnalyzer';
import { adaptClassPlanForReview } from './classPlanReviewAdapter';
import { ClassPlanReviewPreview } from './ClassPlanReviewPreview';

const known = { stepId: 'known', nameKo: '직접 만든 동작', durationMin: 1 };
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('independent import boundaries and truthful partial totals', () => {
  it.each(['malformed', 'items', 'depth', 'cycle'] as const)(
    'does not claim a complete target match when %s structure was omitted',
    (kind) => {
      const source: { targetMinutes: number; steps: unknown[] } = {
        targetMinutes: 1,
        steps: [{ ...known }],
      };
      if (kind === 'malformed') source.steps.push(null);
      if (kind === 'items') source.steps.push({ ...known, stepId: 'later' });
      if (kind === 'depth') source.steps.push({ items: [{ ...known, stepId: 'nested' }] });
      if (kind === 'cycle') source.steps.push(source);
      const report = reviewClassPlan(
        source,
        kind === 'items' ? { maxItems: 1 } : kind === 'depth' ? { maxNestingDepth: 0 } : undefined,
      );
      expect(report.timing.knownTotalSec).toBe(60);
      expect(report.timing.isPartialTotal).toBe(true);
      expect(report.timing.exactTargetMatch).toBe(false);
      expect(report.timing.headlineKo).not.toMatch(/정확히 일치|부족|초과/);
      expect(report.parity.checked).toBe(false);
    },
  );

  it('marks scan truncation even when the tail contains only nested empty containers', () => {
    const report = reviewClassPlan({
      targetMinutes: 1,
      steps: [{ ...known }, ...Array.from({ length: 10010 }, () => ({ items: [] }))],
    });
    expect(report.timing.knownTotalSec).toBe(60);
    expect(report.timing.isPartialTotal).toBe(true);
    expect(report.timing.exactTargetMatch).toBe(false);
    expect(report.issues.some((issue) => issue.code === 'max-input-scan-exceeded')).toBe(true);
  });

  it('does not freeze or retain caller-owned malformed scalar objects', () => {
    const bad = { nested: { editable: true } };
    const source = {
      targetMinutes: bad,
      steps: [{ ...known, durationMin: bad, repetitions: bad, sets: bad, sideMode: bad }],
    };
    const report = reviewClassPlan(source);
    expect(Object.isFrozen(bad)).toBe(false);
    expect(Object.isFrozen(bad.nested)).toBe(false);
    expect(report.plan.rawTargetMinutes).not.toBe(bad);
    expect(report.plan.items[0].rawDurationMin).not.toBe(bad);
    bad.nested.editable = false;
    expect(Object.isFrozen(report)).toBe(true);
  });

  it('does not recurse into an arbitrarily deep malformed scalar', () => {
    const root: Record<string, unknown> = {};
    let cursor = root;
    for (let i = 0; i < 12000; i++) {
      const next: Record<string, unknown> = {};
      cursor.next = next;
      cursor = next;
    }
    expect(() => reviewClassPlan({ steps: [{ ...known, durationMin: root }] })).not.toThrow();
    expect(Object.isFrozen(root)).toBe(false);
  });

  it('formats null-prototype malformed scalar values without invoking coercion hooks', () => {
    const bad = Object.create(null) as object;
    expect(() =>
      reviewClassPlan({ targetMinutes: bad, steps: [{ ...known, sets: bad, sideMode: bad }] }),
    ).not.toThrow();
  });

  it('does not freeze a caller-owned normalized plan passed directly to the analyzer', () => {
    const plan = structuredClone(adaptClassPlanForReview({ steps: [{ ...known }] }));
    const report = analyzeNormalizedClassPlan(plan);
    expect(Object.isFrozen(plan)).toBe(false);
    expect(Object.isFrozen(plan.items[0])).toBe(false);
    expect(report.plan).not.toBe(plan);
    expect(report.plan).toEqual(plan);
  });

  it('links every finding to the exact normalized item after skipped and duplicate inputs', () => {
    const report = reviewClassPlan({
      targetMinutes: 5,
      steps: [
        null,
        { ...known, stepId: 'duplicate', sideMode: 'invalid' },
        { ...known, stepId: 'duplicate', sets: 0 },
        { nameKo: '이름만 초안' },
      ],
    });
    expect(new Set(report.plan.items.map((item) => item.itemId)).size).toBe(
      report.plan.items.length,
    );
    for (const issue of report.issues) {
      expect(issue.itemIndices.length).toBe(issue.itemIds.length);
      issue.itemIndices.forEach((index, i) =>
        expect(report.plan.items[index]?.itemId).toBe(issue.itemIds[i]),
      );
    }
  });

  it('does not present an incomplete known subtotal as an overall time shortage', () => {
    const report = reviewClassPlan({
      targetMinutes: 5,
      steps: [{ ...known }, { stepId: 'unset', nameKo: '시간 미정' }],
    });
    const { container } = render(<ClassPlanReviewPreview report={report} />);
    expect(within(container).getByTestId('review-timing-section').textContent).not.toMatch(
      /목표보다.*부족|목표.*대비.*부족/,
    );
    expect(report.issues.filter((issue) => issue.code === 'target-duration-difference')).toEqual(
      [],
    );
  });

  it('does not declare complete left-right balance when malformed items were omitted', () => {
    const report = reviewClassPlan({ steps: [{ ...known, sideMode: 'both' }, null] });
    expect(report.laterality.headlineKo).toContain('전체 좌우 편성은 미확정');
    expect(report.laterality.headlineKo).not.toContain('균등하게 편성');
  });

  it('uses instance-unique item DOM IDs and keeps jump focus inside the selected preview', () => {
    const source = { steps: [{ ...known, durationMin: -1 }] };
    const first = render(<ClassPlanReviewPreview source={source} />);
    const second = render(<ClassPlanReviewPreview source={source} />);
    const ids = [...document.querySelectorAll('[id]')].map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    const target = within(second.container).getByTestId('review-item-known');
    fireEvent.click(within(second.container).getAllByTestId('jump-to-item-known')[0]);
    expect(document.activeElement).toBe(target);
    expect(first.container.contains(document.activeElement)).toBe(false);
  });

  it('honors reduced motion when jumping and clears stale item highlight after report replacement', () => {
    const scroll = vi.fn();
    const descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scroll,
    });
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    );
    try {
      const first = reviewClassPlan({ steps: [{ ...known, durationMin: -1 }] });
      const view = render(<ClassPlanReviewPreview report={first} />);
      fireEvent.click(within(view.container).getAllByTestId('jump-to-item-known')[0]);
      expect(scroll).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'auto' }));
      const second = reviewClassPlan({ steps: [{ ...known, nameKo: '다른 수업의 동작' }] });
      view.rerender(<ClassPlanReviewPreview report={second} />);
      expect(within(view.container).getByTestId('review-item-known').className).not.toContain(
        'highlighted',
      );
    } finally {
      if (descriptor) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', descriptor);
      else delete (HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    }
  });
});
