import { useEffect, useRef, useState } from 'react';

interface WakeLockSentinelLike {
  readonly released?: boolean;
  release: () => Promise<void>;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

interface WakeLockApiLike {
  readonly request?: (type: 'screen') => Promise<WakeLockSentinelLike>;
}

function getWakeLockApi(): WakeLockApiLike | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return (navigator as unknown as { wakeLock?: WakeLockApiLike }).wakeLock;
}

/**
 * Keeps the smartphone/tablet screen awake automatically while teaching a 50-minute class.
 * Gracefully degrades to no-op in browsers/environments without Screen Wake Lock support.
 */
export function useScreenWakeLock(active: boolean): {
  readonly supported: boolean;
  readonly locked: boolean;
} {
  const supported = typeof getWakeLockApi()?.request === 'function';
  const [hasSentinel, setHasSentinel] = useState(false);
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);

  useEffect(() => {
    if (!supported || !active) {
      const current = sentinelRef.current;
      sentinelRef.current = null;
      if (current) {
        void current.release().catch(() => undefined);
      }
      return;
    }

    let cancelled = false;

    const acquire = async () => {
      try {
        const wakeLock = getWakeLockApi();
        if (!wakeLock?.request || cancelled) return;
        const sentinel = await wakeLock.request('screen');
        if (cancelled) {
          void sentinel.release().catch(() => undefined);
          return;
        }
        sentinelRef.current = sentinel;
        setHasSentinel(true);
        const onRelease = () => {
          if (!cancelled) setHasSentinel(false);
        };
        sentinel.addEventListener?.('release', onRelease);
      } catch {
        if (!cancelled) setHasSentinel(false);
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !cancelled) {
        void acquire();
      }
    };

    void acquire();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      const current = sentinelRef.current;
      sentinelRef.current = null;
      if (current) {
        void current.release().catch(() => undefined);
      }
    };
  }, [active, supported]);

  return { supported, locked: supported && active && hasSentinel };
}

/**
 * Subtle silent vibration pulse for hands-free transitions in quiet studio environments.
 */
export function triggerSubtleHapticPulse(pattern: number | number[] = 32): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    // Ignore unsupported/blocked vibration environments.
  }
}
