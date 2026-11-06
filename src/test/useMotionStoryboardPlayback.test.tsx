import { StrictMode } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMotionStoryboardPlayback } from "../hooks/useMotionStoryboardPlayback";

let serial: number;
let callbacks: Map<number, FrameRequestCallback>;
let hidden: boolean;
let media: { matches: boolean };
let mediaListeners: Set<(event: MediaQueryListEvent) => void>;
let intersection: IntersectionObserverCallback;
const originalHidden = Object.getOwnPropertyDescriptor(document, "hidden");
const sceneRef = { current: null };

beforeEach(() => {
  serial = 0;
  callbacks = new Map();
  hidden = false;
  media = { matches: false };
  mediaListeners = new Set();
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => hidden,
  });
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((callback: FrameRequestCallback) => {
      callbacks.set(++serial, callback);
      return serial;
    }),
  );
  vi.stubGlobal(
    "cancelAnimationFrame",
    vi.fn((id: number) => callbacks.delete(id)),
  );
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      get matches() {
        return media.matches;
      },
      addEventListener: (_: string, fn: (event: MediaQueryListEvent) => void) =>
        mediaListeners.add(fn),
      removeEventListener: (
        _: string,
        fn: (event: MediaQueryListEvent) => void,
      ) => mediaListeners.delete(fn),
    })),
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        intersection = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  if (originalHidden) Object.defineProperty(document, "hidden", originalHidden);
  else Reflect.deleteProperty(document, "hidden");
});
function frame(timestamp: number) {
  act(() => {
    const pending = [...callbacks.values()];
    callbacks.clear();
    pending.forEach((callback) => callback(timestamp));
  });
}

describe("finite storyboard RAF ownership", () => {
  it("starts paused, owns one RAF chain, uses monotonic deltas, and stops at the finite end", () => {
    const { result } = renderHook(() =>
      useMotionStoryboardPlayback({
        totalSeconds: 8,
        snapshotKey: "a",
        active: true,
        sceneRef,
      }),
    );
    expect(result.current.state).toEqual({
      elapsedSeconds: 0,
      playing: false,
      speed: 1,
    });
    expect(callbacks.size).toBe(0);
    act(() => {
      result.current.controller.play();
      result.current.controller.play();
    });
    expect(callbacks.size).toBe(1);
    frame(1000);
    frame(3000);
    frame(2000);
    frame(4000);
    expect(result.current.state.elapsedSeconds).toBe(3);
    expect(callbacks.size).toBe(1);
    frame(20_000);
    expect(result.current.state).toMatchObject({
      elapsedSeconds: 8,
      playing: false,
    });
    expect(callbacks.size).toBe(0);
    frame(30_000);
    expect(result.current.state.elapsedSeconds).toBe(8);
  });

  it("pauses manual seek/speed/reset, applies speed once, and resumes without paused-time catchup", () => {
    const { result } = renderHook(() =>
      useMotionStoryboardPlayback({
        totalSeconds: 20,
        snapshotKey: "a",
        active: true,
        sceneRef,
      }),
    );
    act(() => {
      result.current.controller.setSpeed(0.5);
      result.current.controller.play();
    });
    frame(0);
    frame(4000);
    expect(result.current.state.elapsedSeconds).toBe(2);
    act(() => result.current.controller.setSpeed(0.75));
    expect(result.current.state.playing).toBe(false);
    expect(callbacks.size).toBe(0);
    act(() => result.current.controller.play());
    frame(100_000);
    frame(104_000);
    expect(result.current.state.elapsedSeconds).toBe(5);
    act(() => result.current.controller.seek(999));
    expect(result.current.state).toMatchObject({
      elapsedSeconds: 20,
      playing: false,
    });
    act(() => result.current.controller.seek(-4));
    expect(result.current.state.elapsedSeconds).toBe(0);
    act(() => result.current.controller.seek(Number.NaN));
    expect(result.current.state.elapsedSeconds).toBe(0);
    act(() => result.current.controller.reset());
    expect(callbacks.size).toBe(0);
  });

  it("guards gaps above one second at the last drawn position and requires a fresh explicit resume", () => {
    const { result } = renderHook(() =>
      useMotionStoryboardPlayback({
        totalSeconds: 8,
        snapshotKey: "guarded",
        active: true,
        sceneRef,
        guardFrameGaps: true,
      }),
    );
    act(() => result.current.controller.play());
    frame(0);
    frame(1000);
    expect(result.current.state).toMatchObject({
      elapsedSeconds: 1,
      playing: true,
    });
    frame(2001);
    expect(result.current.state).toMatchObject({
      elapsedSeconds: 1,
      playing: false,
      pauseReason: "frame-delay",
    });
    expect(callbacks.size).toBe(0);
    frame(90_000);
    expect(result.current.state.elapsedSeconds).toBe(1);
    act(() => result.current.controller.play());
    expect(result.current.state.pauseReason).toBeUndefined();
    frame(100_000);
    expect(result.current.state.elapsedSeconds).toBe(1);
    frame(101_000);
    expect(result.current.state).toMatchObject({
      elapsedSeconds: 2,
      playing: true,
    });
    expect(callbacks.size).toBe(1);
  });

  it("stops at distinct block starts, discards overshoot and resumes beyond each boundary exactly once", () => {
    const { result } = renderHook(() =>
      useMotionStoryboardPlayback({
        totalSeconds: 12,
        snapshotKey: "stepped",
        active: true,
        sceneRef,
        blockStarts: [0, 7, 4, 4, 12],
        pauseBeforeBlocks: true,
      }),
    );
    act(() => result.current.controller.play());
    frame(0);
    frame(5500);
    expect(result.current.state).toMatchObject({
      elapsedSeconds: 4,
      playing: false,
      pauseReason: "block-boundary",
    });
    expect(callbacks.size).toBe(0);
    frame(90_000);
    expect(result.current.state.elapsedSeconds).toBe(4);
    act(() => result.current.controller.play());
    frame(100_000);
    frame(101_000);
    expect(result.current.state).toMatchObject({
      elapsedSeconds: 5,
      playing: true,
    });
    expect(result.current.state.pauseReason).toBeUndefined();
    frame(104_000);
    expect(result.current.state).toMatchObject({
      elapsedSeconds: 7,
      playing: false,
      pauseReason: "block-boundary",
    });
    act(() => result.current.controller.play());
    frame(200_000);
    frame(205_000);
    expect(result.current.state).toMatchObject({
      elapsedSeconds: 12,
      playing: false,
    });
    expect(result.current.state.pauseReason).toBeUndefined();
    expect(callbacks.size).toBe(0);
  });

  it("keeps an equal-valued new block-start array from cancelling RAF on state updates or rerender", () => {
    const { result, rerender } = renderHook(
      ({ starts }) =>
        useMotionStoryboardPlayback({
          totalSeconds: 8,
          snapshotKey: "stable-values",
          active: true,
          sceneRef,
          blockStarts: [...starts],
          pauseBeforeBlocks: true,
          guardFrameGaps: true,
        }),
      { initialProps: { starts: [0, 4] } },
    );
    act(() => result.current.controller.play());
    const pendingIds = [...callbacks.keys()];
    const cancellations = vi.mocked(cancelAnimationFrame).mock.calls.length;
    rerender({ starts: [0, 4] });
    expect(result.current.state.playing).toBe(true);
    expect([...callbacks.keys()]).toEqual(pendingIds);
    expect(cancelAnimationFrame).toHaveBeenCalledTimes(cancellations);
    frame(0);
    frame(1000);
    rerender({ starts: [0, 4] });
    expect(result.current.state).toMatchObject({
      elapsedSeconds: 1,
      playing: true,
    });
    expect(callbacks.size).toBe(1);
    frame(2000);
    expect(result.current.state.elapsedSeconds).toBe(2);
    expect(result.current.state.playing).toBe(true);
  });

  it("pauses option changes without resetting the position and applies new boundaries and frame guards on explicit resume", () => {
    const { result, rerender } = renderHook(
      ({ starts, step, guard }) =>
        useMotionStoryboardPlayback({
          totalSeconds: 8,
          snapshotKey: "presentation-edits",
          active: true,
          sceneRef,
          blockStarts: starts,
          pauseBeforeBlocks: step,
          guardFrameGaps: guard,
        }),
      { initialProps: { starts: [0, 4], step: false, guard: false } },
    );
    act(() => result.current.controller.play());
    frame(0);
    frame(1000);
    rerender({ starts: [0, 4], step: true, guard: false });
    expect(result.current.state).toMatchObject({
      elapsedSeconds: 1,
      playing: false,
    });
    expect(callbacks.size).toBe(0);
    act(() => result.current.controller.play());
    frame(10_000);
    frame(11_000);
    expect(result.current.state.elapsedSeconds).toBe(2);
    rerender({ starts: [0, 3, 4], step: true, guard: false });
    expect(result.current.state).toMatchObject({
      elapsedSeconds: 2,
      playing: false,
    });
    expect(callbacks.size).toBe(0);
    act(() => result.current.controller.play());
    frame(20_000);
    frame(21_000);
    expect(result.current.state).toMatchObject({
      elapsedSeconds: 3,
      pauseReason: "block-boundary",
    });
    rerender({ starts: [0, 3, 4], step: true, guard: true });
    expect(result.current.state).toMatchObject({
      elapsedSeconds: 3,
      playing: false,
    });
    expect(result.current.state.pauseReason).toBeUndefined();
    act(() => result.current.controller.play());
    frame(30_000);
    frame(31_001);
    expect(result.current.state).toMatchObject({
      elapsedSeconds: 3,
      playing: false,
      pauseReason: "frame-delay",
    });
    expect(callbacks.size).toBe(0);
  });

  it("resets source snapshots and duration changes, and gates inactive or empty scenes", () => {
    const { result, rerender } = renderHook(
      ({ key, active, duration }) =>
        useMotionStoryboardPlayback({
          totalSeconds: duration,
          snapshotKey: key,
          active,
          sceneRef,
        }),
      { initialProps: { key: "a", active: true, duration: 8 } },
    );
    act(() => result.current.controller.play());
    frame(0);
    frame(2000);
    rerender({ key: "edited-definition", active: true, duration: 8 });
    expect(result.current.state).toMatchObject({
      elapsedSeconds: 0,
      playing: false,
    });
    expect(callbacks.size).toBe(0);
    act(() => result.current.controller.play());
    frame(0);
    frame(2000);
    rerender({ key: "edited-definition", active: false, duration: 8 });
    act(() => result.current.controller.play());
    expect(callbacks.size).toBe(0);
    rerender({ key: "empty", active: true, duration: 0 });
    act(() => result.current.controller.play());
    expect(callbacks.size).toBe(0);
  });

  it("pauses on hidden/pagehide/offscreen/reduced-motion and never auto-resumes", () => {
    const { result } = renderHook(() =>
      useMotionStoryboardPlayback({
        totalSeconds: 8,
        snapshotKey: "a",
        active: true,
        sceneRef,
      }),
    );
    const start = () => act(() => result.current.controller.play());
    start();
    act(() => {
      hidden = true;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(callbacks.size).toBe(0);
    hidden = false;
    start();
    act(() => window.dispatchEvent(new Event("pagehide")));
    expect(callbacks.size).toBe(0);
    start();
    act(() =>
      intersection(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    );
    expect(callbacks.size).toBe(0);
    start();
    expect(callbacks.size).toBe(0);
    act(() =>
      intersection(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    );
    expect(callbacks.size).toBe(0);
    start();
    act(() => {
      media.matches = true;
      mediaListeners.forEach((fn) =>
        fn({ matches: true } as MediaQueryListEvent),
      );
    });
    expect(result.current.reducedMotion).toBe(true);
    expect(callbacks.size).toBe(0);
    act(() => result.current.controller.seek(4));
    expect(result.current.state.elapsedSeconds).toBe(4);
    start();
    expect(callbacks.size).toBe(0);
    act(() => {
      media.matches = false;
      mediaListeners.forEach((fn) =>
        fn({ matches: false } as MediaQueryListEvent),
      );
    });
    expect(callbacks.size).toBe(0);
  });

  it("guards visibility during a queued frame and cancels StrictMode cleanup/unmount work", () => {
    const { result, unmount } = renderHook(
      () =>
        useMotionStoryboardPlayback({
          totalSeconds: 8,
          snapshotKey: "a",
          active: true,
          sceneRef,
        }),
      { wrapper: StrictMode },
    );
    act(() => result.current.controller.play());
    frame(0);
    hidden = true;
    frame(2000);
    expect(result.current.state.playing).toBe(false);
    expect(callbacks.size).toBe(0);
    hidden = false;
    act(() => result.current.controller.play());
    expect(callbacks.size).toBe(1);
    unmount();
    expect(callbacks.size).toBe(0);
    expect(mediaListeners.size).toBe(0);
  });
});
