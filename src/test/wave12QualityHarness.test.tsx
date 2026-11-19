import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { useEffect } from 'react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { useManagedRaf } from '../hooks/useManagedRaf';

function RafProbe({ onFire }: { onFire: () => void }) {
  const { scheduleRaf } = useManagedRaf();
  useEffect(() => {
    scheduleRaf(onFire);
  }, [scheduleRaf, onFire]);
  return <div data-testid="raf-probe" />;
}

describe('Wave 12 Full-Stack Quality Harness (AC-301 .. AC-305)', () => {
  it('AC-301: useManagedRaf cancels pending animation frames automatically on unmount', () => {
    const callbacks = new Map<number, FrameRequestCallback>();
    let nextId = 100;
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      const id = ++nextId;
      callbacks.set(id, cb);
      return id;
    });
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      callbacks.delete(id);
    });

    try {
      const fired = vi.fn();
      const { unmount } = render(<RafProbe onFire={fired} />);
      expect(rafSpy).toHaveBeenCalledTimes(1);
      expect(callbacks.size).toBe(1);

      unmount();
      expect(cancelSpy).toHaveBeenCalledWith(101);
      expect(callbacks.size).toBe(0);
      expect(fired).not.toHaveBeenCalled();
    } finally {
      rafSpy.mockRestore();
      cancelSpy.mockRestore();
    }
  });

  it('AC-302 & AC-303: Core catalog, finder, schedule, and video modals use managed RAF and IME guards', () => {
    const root = path.resolve(import.meta.dirname, '../..');
    for (const rel of [
      'src/components/ExerciseAtlasView.tsx',
      'src/components/InlineExerciseFinder.tsx',
      'src/components/InstructorScheduleView.tsx',
      'src/components/YouTubeClipModal.tsx',
      'src/components/YouTubePreviewModal.tsx',
    ]) {
      const src = readFileSync(path.join(root, rel), 'utf8');
      expect(src).toContain('useManagedRaf');
      expect(src).not.toMatch(/\brequestAnimationFrame\(/);
    }

    for (const rel of [
      'src/components/ExerciseAtlasView.tsx',
      'src/components/FlowAtlasCatalog.tsx',
      'src/components/PilatesVideoLibrary.tsx',
    ]) {
      const src = readFileSync(path.join(root, rel), 'utf8');
      expect(src).toContain('isImeComposing(event)');
    }
  });
});
