import { useCallback, useEffect, useRef } from 'react';

/**
 * Schedules `window.setTimeout` callbacks and automatically clears any pending
 * timers when the owning component unmounts.
 */
export function useManagedTimeouts() {
  const pendingTimerIdsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const scheduleTimeout = useCallback(
    (callback: () => void, delayMs: number): ReturnType<typeof setTimeout> => {
      const timerId = setTimeout(() => {
        pendingTimerIdsRef.current.delete(timerId);
        callback();
      }, delayMs);
      pendingTimerIdsRef.current.add(timerId);
      return timerId;
    },
    [],
  );

  const clearAllTimeouts = useCallback(() => {
    pendingTimerIdsRef.current.forEach((id) => clearTimeout(id));
    pendingTimerIdsRef.current.clear();
  }, []);

  useEffect(() => {
    const timerSet = pendingTimerIdsRef.current;
    return () => {
      timerSet.forEach((id) => clearTimeout(id));
      timerSet.clear();
    };
  }, []);

  return { scheduleTimeout, clearAllTimeouts };
}
