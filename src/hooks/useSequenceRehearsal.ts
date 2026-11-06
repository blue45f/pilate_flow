import { useLayoutEffect, useState, useSyncExternalStore } from 'react';

export interface SequenceRehearsalOptions {
  totalSec: number;
  enabled: boolean;
  /** Live host guard; omitted for a standalone clock. Rechecked before actions/ticks. */
  canRun?: () => boolean;
}

type RehearsalSpeed = 0.5 | 1 | 2 | 4;

interface RehearsalSnapshot {
  elapsedSec: number;
  playing: boolean;
  speed: RehearsalSpeed;
  reducedMotion: boolean;
  canPlay: boolean;
}

const ALLOWED_SPEEDS: readonly number[] = [0.5, 1, 2, 4];
const TICK_MS = 250;

function safeTotal(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function clampCursor(value: number, totalSec: number): number {
  return Number.isFinite(value) ? Math.min(totalSec, Math.max(0, value)) : 0;
}

function documentIsVisible(): boolean {
  return (
    typeof document !== 'undefined' && document.visibilityState === 'visible' && !document.hidden
  );
}

/** A private timeline clock: it has no exercise, teaching, or persistence state. */
function createRehearsalClock(options: SequenceRehearsalOptions) {
  let totalSec = safeTotal(options.totalSec);
  let enabled = options.enabled;
  let canRun = options.canRun;
  let visible = documentIsVisible();
  let pageActive = true;
  const mediaQuery =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
  const listeners = new Set<() => void>();
  let interval: ReturnType<typeof setInterval> | null = null;
  let run: { startedAt: number; cursorSec: number } | null = null;
  let snapshot: RehearsalSnapshot = {
    elapsedSec: 0,
    playing: false,
    speed: 1,
    reducedMotion: mediaQuery?.matches ?? false,
    canPlay: enabled && totalSec > 0 && visible && !(mediaQuery?.matches ?? false),
  };

  function publish(change: Partial<RehearsalSnapshot> = {}) {
    const next = { ...snapshot, ...change };
    next.canPlay = enabled && totalSec > 0 && visible && pageActive && !next.reducedMotion;
    if (
      next.elapsedSec === snapshot.elapsedSec &&
      next.playing === snapshot.playing &&
      next.speed === snapshot.speed &&
      next.reducedMotion === snapshot.reducedMotion &&
      next.canPlay === snapshot.canPlay
    ) {
      return;
    }
    snapshot = next;
    listeners.forEach((listener) => listener());
  }

  function stopInterval() {
    if (interval !== null) clearInterval(interval);
    interval = null;
  }

  function hostCanRun() {
    try {
      return canRun === undefined || canRun() === true;
    } catch {
      return false;
    }
  }

  function currentCursor() {
    // A native host can close before its close event reaches React. Preserve the
    // last displayed position instead of counting an unobserved closed interval.
    if (!hostCanRun()) return snapshot.elapsedSec;
    if (run === null) return snapshot.elapsedSec;
    const elapsedMs = Math.max(0, performance.now() - run.startedAt);
    return Math.min(totalSec, run.cursorSec + (elapsedMs * snapshot.speed) / 1000);
  }

  function pause() {
    const elapsedSec = currentCursor();
    run = null;
    stopInterval();
    publish({ elapsedSec, playing: false });
  }

  function syncBrowserGuards() {
    visible = documentIsVisible();
    const reducedMotion = mediaQuery?.matches ?? false;
    if (!visible || !pageActive || reducedMotion) pause();
    publish({ reducedMotion });
  }

  function onPageHide() {
    pageActive = false;
    pause();
    publish();
  }

  function onPageShow() {
    pageActive = true;
    syncBrowserGuards();
  }

  function tick() {
    if (!hostCanRun()) {
      pause();
      return;
    }
    syncBrowserGuards();
    if (run === null) return;
    const elapsedSec = currentCursor();
    if (elapsedSec >= totalSec) {
      run = null;
      stopInterval();
      publish({ elapsedSec: totalSec, playing: false });
      return;
    }
    publish({ elapsedSec });
  }

  function start() {
    // Recheck the browser itself, including changes before an event is delivered.
    syncBrowserGuards();
    if (!hostCanRun()) {
      pause();
      return;
    }
    if (!listeners.size || !snapshot.canPlay || run !== null) return;
    const elapsedSec = snapshot.elapsedSec >= totalSec ? 0 : snapshot.elapsedSec;
    run = { startedAt: performance.now(), cursorSec: elapsedSec };
    interval = setInterval(tick, TICK_MS);
    publish({ elapsedSec, playing: true });
  }

  function seek(value: number) {
    run = null;
    stopInterval();
    publish({ elapsedSec: clampCursor(value, totalSec), playing: false });
  }

  function setSpeed(value: number) {
    pause();
    if (ALLOWED_SPEEDS.includes(value)) publish({ speed: value as RehearsalSpeed });
  }

  function configure(next: SequenceRehearsalOptions) {
    const nextTotal = safeTotal(next.totalSec);
    canRun = next.canRun;
    const mustPause = nextTotal !== totalSec || !next.enabled || !hostCanRun();
    const elapsedSec = mustPause ? currentCursor() : snapshot.elapsedSec;
    if (mustPause) {
      run = null;
      stopInterval();
    }
    totalSec = nextTotal;
    enabled = next.enabled;
    publish({
      elapsedSec: clampCursor(elapsedSec, totalSec),
      playing: mustPause ? false : snapshot.playing,
    });
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    if (listeners.size === 1) {
      document.addEventListener('visibilitychange', syncBrowserGuards);
      window.addEventListener('pagehide', onPageHide);
      window.addEventListener('pageshow', onPageShow);
      if (mediaQuery?.addEventListener) {
        mediaQuery.addEventListener('change', syncBrowserGuards);
      } else {
        mediaQuery?.addListener(syncBrowserGuards);
      }
      syncBrowserGuards();
    }
    return () => {
      listeners.delete(listener);
      if (listeners.size) return;
      document.removeEventListener('visibilitychange', syncBrowserGuards);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
      if (mediaQuery?.removeEventListener) {
        mediaQuery.removeEventListener('change', syncBrowserGuards);
      } else {
        mediaQuery?.removeListener(syncBrowserGuards);
      }
      pause();
    };
  }

  return {
    getSnapshot: () => snapshot,
    subscribe,
    configure,
    start,
    pause,
    seek,
    setSpeed,
    reset: () => seek(0),
  };
}

/** User-controlled elapsed seconds for an already gated, full-plan rehearsal. */
export function useSequenceRehearsal({ totalSec, enabled, canRun }: SequenceRehearsalOptions) {
  const [clock] = useState(() => createRehearsalClock({ totalSec, enabled, canRun }));
  const snapshot = useSyncExternalStore(clock.subscribe, clock.getSnapshot, clock.getSnapshot);

  useLayoutEffect(() => {
    clock.configure({ totalSec, enabled, canRun });
  }, [clock, totalSec, enabled, canRun]);

  return {
    ...snapshot,
    start: clock.start,
    pause: clock.pause,
    seek: clock.seek,
    setSpeed: clock.setSpeed,
    reset: clock.reset,
  };
}
