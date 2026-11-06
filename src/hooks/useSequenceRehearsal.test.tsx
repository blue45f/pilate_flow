import { StrictMode, type PropsWithChildren } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSequenceRehearsal } from './useSequenceRehearsal';

let nowMs: number;
let hidden: boolean;
let reduced: boolean;
let preferenceListeners: Set<() => void>;

function advanceClock(elapsedMs: number, timerMs = elapsedMs) {
  nowMs += elapsedMs;
  act(() => vi.advanceTimersByTime(timerMs));
}

function changeVisibility(nextHidden: boolean) {
  hidden = nextHidden;
  act(() => document.dispatchEvent(new Event('visibilitychange')));
}

function changeReducedMotion(nextReduced: boolean) {
  reduced = nextReduced;
  act(() => preferenceListeners.forEach((listener) => listener()));
}

beforeEach(() => {
  vi.useFakeTimers();
  nowMs = 10_000;
  hidden = false;
  reduced = false;
  preferenceListeners = new Set();
  vi.spyOn(performance, 'now').mockImplementation(() => nowMs);
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() =>
    hidden ? 'hidden' : 'visible',
  );
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      get matches() {
        return reduced;
      },
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: (_type: string, listener: () => void) => {
        preferenceListeners.add(listener);
      },
      removeEventListener: (_type: string, listener: () => void) => {
        preferenceListeners.delete(listener);
      },
    })),
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('full-plan rehearsal clock', () => {
  it('starts paused at zero and advances only after an explicit start', () => {
    const { result } = renderHook(() => useSequenceRehearsal({ totalSec: 3_000, enabled: true }));
    expect(result.current).toMatchObject({
      elapsedSec: 0,
      playing: false,
      speed: 1,
      reducedMotion: false,
      canPlay: true,
    });
    expect(vi.getTimerCount()).toBe(0);
    advanceClock(60_000);
    expect(result.current.elapsedSec).toBe(0);
    act(() => result.current.start());
    expect(result.current.playing).toBe(true);
    expect(vi.getTimerCount()).toBe(1);
    act(() => result.current.start());
    expect(vi.getTimerCount()).toBe(1);
    advanceClock(1_250);
    expect(result.current.elapsedSec).toBe(1.25);
  });

  it('catches up a delayed running tick using monotonic time, then stops exactly at the end', () => {
    const renders: Array<{ elapsedSec: number; playing: boolean }> = [];
    const { result } = renderHook(() => {
      const rehearsal = useSequenceRehearsal({ totalSec: 50, enabled: true });
      renders.push({ elapsedSec: rehearsal.elapsedSec, playing: rehearsal.playing });
      return rehearsal;
    });
    act(() => result.current.start());
    // Only one timer fires, although the running clock has advanced 37.5 seconds.
    advanceClock(37_500, 250);
    expect(result.current.elapsedSec).toBe(37.5);
    expect(result.current.playing).toBe(true);
    advanceClock(90_000, 250);
    expect(result.current.elapsedSec).toBe(50);
    expect(result.current.playing).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    const finishedRenders = renders.length;
    advanceClock(90_000);
    expect(renders).toHaveLength(finishedRenders);
    expect(renders.filter((render) => render.elapsedSec === 50 && !render.playing)).toHaveLength(1);
    act(() => result.current.start());
    expect(result.current.elapsedSec).toBe(0);
    expect(result.current.playing).toBe(true);
    advanceClock(250);
    expect(result.current.elapsedSec).toBe(0.25);
  });

  it('samples the pause instant and excludes every pause gap from later progress', () => {
    const { result } = renderHook(() => useSequenceRehearsal({ totalSec: 120, enabled: true }));
    act(() => result.current.start());
    advanceClock(1_000);
    nowMs += 125;
    act(() => result.current.pause());
    expect(result.current.elapsedSec).toBe(1.125);
    expect(result.current.playing).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    advanceClock(60_000);
    expect(result.current.elapsedSec).toBe(1.125);
    act(() => result.current.start());
    advanceClock(500);
    expect(result.current.elapsedSec).toBe(1.625);
    act(() => result.current.pause());
    advanceClock(60_000);
    act(() => result.current.start());
    advanceClock(250);
    expect(result.current.elapsedSec).toBe(1.875);
  });

  it('pauses immediately when the caller revokes the gate and never auto-resumes', () => {
    const { result, rerender } = renderHook(
      ({ enabled }) => useSequenceRehearsal({ totalSec: 120, enabled }),
      { initialProps: { enabled: true } },
    );
    act(() => result.current.start());
    nowMs += 1_125;
    rerender({ enabled: false });
    expect(result.current).toMatchObject({ elapsedSec: 1.125, playing: false, canPlay: false });
    expect(vi.getTimerCount()).toBe(0);
    act(() => result.current.start());
    advanceClock(60_000);
    expect(result.current.elapsedSec).toBe(1.125);
    rerender({ enabled: true });
    expect(result.current.canPlay).toBe(true);
    expect(result.current.playing).toBe(false);
    act(() => result.current.start());
    advanceClock(250);
    expect(result.current.elapsedSec).toBe(1.375);
  });

  it('pauses on hidden visibility and pagehide, retaining the cursor on return', () => {
    const { result } = renderHook(() => useSequenceRehearsal({ totalSec: 120, enabled: true }));
    act(() => result.current.start());
    nowMs += 1_125;
    changeVisibility(true);
    expect(result.current).toMatchObject({ elapsedSec: 1.125, playing: false, canPlay: false });
    expect(vi.getTimerCount()).toBe(0);
    advanceClock(60_000);
    changeVisibility(false);
    expect(result.current).toMatchObject({ elapsedSec: 1.125, playing: false, canPlay: true });
    act(() => result.current.start());
    nowMs += 125;
    act(() => window.dispatchEvent(new Event('pagehide')));
    expect(result.current).toMatchObject({ elapsedSec: 1.25, playing: false });
    expect(vi.getTimerCount()).toBe(0);
    advanceClock(60_000);
    act(() => window.dispatchEvent(new Event('pageshow')));
    expect(result.current).toMatchObject({ elapsedSec: 1.25, playing: false, canPlay: true });
  });

  it('checks current hidden and reduced-motion values even before browser events arrive', () => {
    const { result } = renderHook(() => useSequenceRehearsal({ totalSec: 120, enabled: true }));
    hidden = true;
    act(() => result.current.start());
    expect(result.current).toMatchObject({ playing: false, canPlay: false });
    expect(vi.getTimerCount()).toBe(0);
    hidden = false;
    reduced = true;
    act(() => result.current.start());
    expect(result.current).toMatchObject({ playing: false, canPlay: false, reducedMotion: true });
    expect(vi.getTimerCount()).toBe(0);
    reduced = false;
    act(() => result.current.start());
    expect(result.current.playing).toBe(true);
  });

  it('keeps reduced-motion rehearsal manual and pauses immediately when the preference changes', () => {
    reduced = true;
    const { result } = renderHook(() => useSequenceRehearsal({ totalSec: 120, enabled: true }));
    expect(result.current).toMatchObject({ reducedMotion: true, canPlay: false });
    act(() => result.current.start());
    expect(vi.getTimerCount()).toBe(0);
    act(() => result.current.seek(40));
    expect(result.current.elapsedSec).toBe(40);
    changeReducedMotion(false);
    expect(result.current).toMatchObject({ playing: false, canPlay: true });
    act(() => result.current.start());
    nowMs += 375;
    changeReducedMotion(true);
    expect(result.current).toMatchObject({
      elapsedSec: 40.375,
      playing: false,
      canPlay: false,
      reducedMotion: true,
    });
    expect(vi.getTimerCount()).toBe(0);
    advanceClock(60_000);
    changeReducedMotion(false);
    expect(result.current).toMatchObject({ elapsedSec: 40.375, playing: false });
  });

  it('pauses and clamps every seek, including non-finite input, and resets without playback', () => {
    const { result } = renderHook(() => useSequenceRehearsal({ totalSec: 120, enabled: true }));
    act(() => result.current.start());
    act(() => result.current.seek(45.5));
    expect(result.current).toMatchObject({ elapsedSec: 45.5, playing: false });
    expect(vi.getTimerCount()).toBe(0);
    act(() => result.current.seek(-1));
    expect(result.current.elapsedSec).toBe(0);
    act(() => result.current.seek(121));
    expect(result.current.elapsedSec).toBe(120);
    for (const value of [NaN, Infinity, -Infinity]) {
      act(() => result.current.seek(value));
      expect(result.current.elapsedSec).toBe(0);
    }
    act(() => result.current.setSpeed(2));
    act(() => result.current.start());
    advanceClock(250);
    act(() => result.current.reset());
    expect(result.current).toMatchObject({ elapsedSec: 0, playing: false, speed: 2 });
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([0.5, 1, 2, 4])(
    'allows speed %s only after pausing at the actual change instant',
    (speed) => {
      const { result } = renderHook(() => useSequenceRehearsal({ totalSec: 120, enabled: true }));
      act(() => result.current.start());
      nowMs += 125;
      act(() => result.current.setSpeed(speed));
      expect(result.current).toMatchObject({ elapsedSec: 0.125, playing: false, speed });
      expect(vi.getTimerCount()).toBe(0);
      advanceClock(10_000);
      act(() => result.current.start());
      advanceClock(1_000);
      expect(result.current.elapsedSec).toBe(0.125 + speed);
    },
  );

  it('rejects unsupported and non-finite speeds without allowing playback to continue', () => {
    const { result } = renderHook(() => useSequenceRehearsal({ totalSec: 120, enabled: true }));
    for (const speed of [0, -1, 3, NaN, Infinity]) {
      act(() => result.current.start());
      act(() => result.current.setSpeed(speed));
      expect(result.current).toMatchObject({ speed: 1, playing: false });
      expect(vi.getTimerCount()).toBe(0);
    }
  });

  it('pauses and clamps when total duration changes and resets safely for invalid totals', () => {
    const { result, rerender } = renderHook(
      ({ totalSec }) => useSequenceRehearsal({ totalSec, enabled: true }),
      { initialProps: { totalSec: 120 } },
    );
    act(() => result.current.seek(80));
    act(() => result.current.start());
    nowMs += 125;
    rerender({ totalSec: 60 });
    expect(result.current).toMatchObject({ elapsedSec: 60, playing: false, canPlay: true });
    expect(vi.getTimerCount()).toBe(0);
    rerender({ totalSec: 180 });
    expect(result.current).toMatchObject({ elapsedSec: 60, playing: false });
    act(() => result.current.start());
    advanceClock(250);
    expect(result.current.elapsedSec).toBe(60.25);
    for (const totalSec of [NaN, Infinity, -Infinity, 0, -120]) {
      rerender({ totalSec });
      expect(result.current).toMatchObject({ elapsedSec: 0, playing: false, canPlay: false });
      act(() => result.current.start());
      act(() => result.current.seek(50));
      expect(result.current.elapsedSec).toBe(0);
      expect(vi.getTimerCount()).toBe(0);
    }
    rerender({ totalSec: 120 });
    expect(result.current).toMatchObject({ elapsedSec: 0, playing: false, canPlay: true });
  });

  it('blocks an initially disabled or invalid plan without scheduling a timer', () => {
    const { result } = renderHook(() => useSequenceRehearsal({ totalSec: NaN, enabled: false }));
    act(() => result.current.start());
    expect(result.current).toMatchObject({ elapsedSec: 0, playing: false, canPlay: false });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rechecks a live host before start and delayed ticks, then requires an explicit restart without catch-up', () => {
    let hostOpen = false;
    const canRun = vi.fn(() => hostOpen);
    const { result, rerender } = renderHook(
      ({ enabled }) => useSequenceRehearsal({ totalSec: 120, enabled, canRun }),
      { initialProps: { enabled: true } },
    );
    act(() => result.current.start());
    expect(result.current).toMatchObject({ elapsedSec: 0, playing: false });
    expect(vi.getTimerCount()).toBe(0);
    hostOpen = true;
    act(() => result.current.start());
    advanceClock(1_000);
    expect(result.current.elapsedSec).toBe(1);
    hostOpen = false;
    advanceClock(60_000, 250);
    expect(result.current).toMatchObject({ elapsedSec: 1, playing: false });
    expect(vi.getTimerCount()).toBe(0);
    act(() => result.current.start());
    expect(vi.getTimerCount()).toBe(0);
    hostOpen = true;
    advanceClock(60_000);
    expect(result.current).toMatchObject({ elapsedSec: 1, playing: false });
    act(() => result.current.start());
    advanceClock(250);
    expect(result.current).toMatchObject({ elapsedSec: 1.25, playing: true });
    // Repeated equal renders with the same guard must retain the one live clock.
    rerender({ enabled: true });
    expect(vi.getTimerCount()).toBe(1);
    expect(result.current.playing).toBe(true);
    advanceClock(250);
    expect(result.current.elapsedSec).toBe(1.5);
  });

  it('preserves the published cursor when a closed host is paused or reconfigured before its next tick', () => {
    let hostOpen = true;
    const canRun = () => hostOpen;
    const { result, rerender } = renderHook(
      ({ enabled }) => useSequenceRehearsal({ totalSec: 120, enabled, canRun }),
      { initialProps: { enabled: true } },
    );
    act(() => result.current.start());
    advanceClock(1_000);
    nowMs += 1_250;
    hostOpen = false;
    act(() => result.current.pause());
    expect(result.current).toMatchObject({ elapsedSec: 1, playing: false });
    hostOpen = true;
    act(() => result.current.start());
    advanceClock(250);
    expect(result.current.elapsedSec).toBe(1.25);
    nowMs += 1_500;
    hostOpen = false;
    rerender({ enabled: false });
    expect(result.current).toMatchObject({ elapsedSec: 1.25, playing: false, canPlay: false });
    expect(vi.getTimerCount()).toBe(0);
    hostOpen = true;
    rerender({ enabled: true });
    advanceClock(60_000);
    expect(result.current).toMatchObject({ elapsedSec: 1.25, playing: false });
  });

  it('fails closed when a host guard throws, without scheduling or consuming unseen time', () => {
    let fails = true;
    const canRun = () => {
      if (fails) throw new Error('Host unavailable');
      return true;
    };
    const { result } = renderHook(() =>
      useSequenceRehearsal({ totalSec: 120, enabled: true, canRun }),
    );
    act(() => result.current.start());
    expect(vi.getTimerCount()).toBe(0);
    fails = false;
    act(() => result.current.start());
    advanceClock(250);
    fails = true;
    advanceClock(10_000, 250);
    expect(result.current).toMatchObject({ elapsedSec: 0.25, playing: false });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cleans subscriptions and intervals on unmount and remains safe in StrictMode', () => {
    const removeDocumentListener = vi.spyOn(document, 'removeEventListener');
    const removeWindowListener = vi.spyOn(window, 'removeEventListener');
    const wrapper = ({ children }: PropsWithChildren) => <StrictMode>{children}</StrictMode>;
    const { result, unmount } = renderHook(
      () => useSequenceRehearsal({ totalSec: 120, enabled: true }),
      { wrapper },
    );
    expect(preferenceListeners.size).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
    act(() => result.current.start());
    expect(vi.getTimerCount()).toBe(1);
    advanceClock(250);
    expect(result.current.elapsedSec).toBe(0.25);
    const lastResult = result.current;
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    expect(preferenceListeners.size).toBe(0);
    expect(removeDocumentListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    expect(removeWindowListener).toHaveBeenCalledWith('pagehide', expect.any(Function));
    expect(removeWindowListener).toHaveBeenCalledWith('pageshow', expect.any(Function));
    advanceClock(60_000);
    changeVisibility(true);
    changeReducedMotion(true);
    act(() => lastResult.start());
    expect(vi.getTimerCount()).toBe(0);
    expect(result.current).toBe(lastResult);
  });
});
