import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MobileSubPageBar } from './MobileSubPageBar';

afterEach(cleanup);

function StoragePages() {
  const [active, setActive] = useState<'saved' | 'history'>('saved');
  return (
    <MobileSubPageBar
      ariaLabel="저장한 수업과 진행 기록"
      activeId={active}
      options={[
        { id: 'saved', label: '저장한 수업', badge: 2 },
        { id: 'history', label: '수업 기록', badge: 0 },
      ]}
      onSelect={setActive}
    />
  );
}

describe('MobileSubPageBar keyboard navigation', () => {
  it('moves selection and focus together, wraps, and supports Home and End', () => {
    render(<StoragePages />);
    const saved = screen.getByRole('button', { name: '저장한 수업' });
    const history = screen.getByRole('button', { name: '수업 기록' });
    saved.focus();
    fireEvent.keyDown(saved, { key: 'ArrowRight' });
    expect(history).toHaveFocus();
    expect(history).toHaveAttribute('aria-pressed', 'true');
    expect(saved).toHaveAttribute('aria-pressed', 'false');
    fireEvent.keyDown(history, { key: 'ArrowRight' });
    expect(saved).toHaveFocus();
    expect(saved).toHaveAttribute('aria-pressed', 'true');
    fireEvent.keyDown(saved, { key: 'End' });
    expect(history).toHaveFocus();
    fireEvent.keyDown(history, { key: 'Home' });
    expect(saved).toHaveFocus();
    fireEvent.click(history);
    expect(history).toHaveAttribute('aria-pressed', 'true');
  });
});
