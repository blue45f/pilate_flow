import { useCallback, useEffect, useRef } from 'react';

/**
 * Schedules `requestAnimationFrame` callbacks and automatically cancels any
 * pending frames when the owning component unmounts.
 */
export function useManagedRaf() {
  const pendingRafIdsRef = useRef<Set<number>>(new Set());

  const scheduleRaf = useCallback((callback: () => void): number => {
    const frameId = requestAnimationFrame(() => {
      pendingRafIdsRef.current.delete(frameId);
      callback();
    });
    pendingRafIdsRef.current.add(frameId);
    return frameId;
  }, []);

  const cancelAllRafs = useCallback(() => {
    pendingRafIdsRef.current.forEach((id) => cancelAnimationFrame(id));
    pendingRafIdsRef.current.clear();
  }, []);

  useEffect(() => {
    const rafSet = pendingRafIdsRef.current;
    return () => {
      rafSet.forEach((id) => cancelAnimationFrame(id));
      rafSet.clear();
    };
  }, []);

  return { scheduleRaf, cancelAllRafs };
}
