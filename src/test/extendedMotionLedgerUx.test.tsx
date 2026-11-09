import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ExtendedMotionVerificationPanel } from '../components/ExtendedMotionVerificationPanel';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
afterEach(cleanup);
const exercise = INITIAL_EXERCISES.find((item) => item.id === 'original-mat-swan-prep')!;
describe('source ledger progressive disclosure', () => {
  it('keeps review limitations outside the collapsed evidence', () => {
    render(<ExtendedMotionVerificationPanel exercise={exercise} />);
    const details = screen.getByText('출처·근거 상세 보기').closest('details');
    expect(details).not.toHaveAttribute('open');
    expect(details).toContainElement(screen.getByTestId('extended-source-audit-summary'));
    expect(details).not.toContainElement(
      screen.getByTestId('extended-verification-boundary-notice'),
    );
    expect(screen.getByTestId('extended-verification-boundary-notice')).toHaveTextContent(
      '전문의·외부 임상 승인 0건',
    );
  });
  it('preserves keyboard phase navigation and continuous progress', () => {
    render(<ExtendedMotionVerificationPanel exercise={exercise} />);
    const tabs = screen.getAllByRole('tab');
    fireEvent.keyDown(tabs[1], { key: 'ArrowRight' });
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[2]).toHaveFocus();
    fireEvent.keyDown(tabs[2], { key: 'ArrowRight' });
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(tabs[0], { key: 'End' });
    expect(tabs[2]).toHaveFocus();
    fireEvent.keyDown(tabs[2], { key: 'Home' });
    expect(tabs[0]).toHaveFocus();
    fireEvent.change(screen.getByRole('slider'), { target: { value: '50' } });
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
  });
});
