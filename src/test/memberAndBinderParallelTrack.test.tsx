import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemberBookingView } from '../components/MemberBookingView';
import { ClassBinderView } from '../components/ClassBinderView';

describe('Parallel Track 3 — MemberBookingView & ClassBinderView UX', () => {
  it('renders member quick status strip and preserves ClassBinderView saved sequence surface', () => {
    const { unmount } = render(<MemberBookingView activeSection="schedule" />);
    expect(screen.getByTestId('member-quick-status-strip')).toHaveTextContent(/남은 수강권/);
    unmount();

    render(<ClassBinderView view="saved" onOpenLogModal={() => undefined} />);
    expect(screen.getByRole('heading', { name: /저장한 시퀀스/ })).toBeInTheDocument();
  });
});
