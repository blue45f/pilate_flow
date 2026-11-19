import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { useEffect } from 'react';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { useManagedTimeouts } from '../hooks/useManagedTimeouts';

function TimeoutProbe({ onFire }: { onFire: () => void }) {
  const { scheduleTimeout } = useManagedTimeouts();
  useEffect(() => {
    scheduleTimeout(onFire, 500);
  }, [scheduleTimeout, onFire]);
  return <div data-testid="timeout-probe" />;
}

describe('Wave 14 Deep Runtime & Asset Integrity Harness (AC-401 .. AC-404)', () => {
  it('AC-402: useManagedTimeouts cancels pending timers automatically on unmount', () => {
    vi.useFakeTimers();
    try {
      const fired = vi.fn();
      const { unmount } = render(<TimeoutProbe onFire={fired} />);
      unmount();
      vi.advanceTimersByTime(1000);
      expect(fired).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('AC-401: all coverImage static paths in pilatesCatalog.ts exist under public/', () => {
    const root = path.resolve(import.meta.dirname, '../..');
    const catalog = readFileSync(path.join(root, 'src/data/pilatesCatalog.ts'), 'utf8');
    const matches = [...catalog.matchAll(/coverImage:\s*["'](\/images\/[^"']+)["']/g)];
    expect(matches.length).toBeGreaterThan(0);
    for (const match of matches) {
      const diskPath = path.join(root, 'public', match[1]!.replace(/^\//, ''));
      expect(existsSync(diskPath), `Missing asset: ${match[1]}`).toBe(true);
    }
  });

  it('AC-403 & AC-404: LiveStageView guards IME composition and 4 components use useManagedTimeouts', () => {
    const root = path.resolve(import.meta.dirname, '../..');
    const liveStage = readFileSync(path.join(root, 'src/components/LiveStageView.tsx'), 'utf8');
    expect(liveStage).toContain('event.isComposing');

    for (const rel of [
      'src/components/ClassBinderView.tsx',
      'src/components/InstructorScheduleView.tsx',
      'src/components/SequenceQrShareDialog.tsx',
      'src/components/StudioCarePlaybookPanel.tsx',
    ]) {
      const src = readFileSync(path.join(root, rel), 'utf8');
      expect(src).toContain('useManagedTimeouts');
      expect(src).not.toMatch(/\bsetTimeout\(/);
    }
  });
});
