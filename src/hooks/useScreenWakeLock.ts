import { useEffect, useState } from 'react';

type WakeStatus = 'requesting' | 'locked' | 'released' | 'denied';

const statusText: Record<WakeStatus, string> = {
  requesting: '화면 유지 요청 중',
  locked: '화면 유지 중',
  released: '화면 유지 해제됨',
  denied: '화면 유지 요청을 사용할 수 없어요',
};

export function useScreenWakeLock(active: boolean) {
  const api = typeof navigator === 'undefined' ? undefined : navigator.wakeLock;
  const supported = typeof api?.request === 'function';
  const [status, setStatus] = useState<WakeStatus>('requesting');

  useEffect(() => {
    if (!active || !supported) return;
    let generation = 0;
    let pending = false;
    let held: WakeLockSentinel | null = null;

    const onSystemRelease = (event: Event) => {
      if (event.target !== held) return;
      held = null;
      setStatus('released');
    };
    const release = () => {
      generation++;
      pending = false;
      if (!held) return;
      held.removeEventListener?.('release', onSystemRelease);
      if (!held.released) void held.release().catch(() => undefined);
      held = null;
    };
    const syncVisibility = async () => {
      if (document.visibilityState !== 'visible') {
        release();
        setStatus('released');
        return;
      }
      if (pending || (held && !held.released)) return;
      const current = generation;
      pending = true;
      setStatus('requesting');
      try {
        const lock = await api.request('screen');
        if (current !== generation) {
          await lock.release();
          return;
        }
        held = lock;
        lock.addEventListener('release', onSystemRelease, { once: true });
        setStatus(lock.released ? 'released' : 'locked');
      } catch {
        if (current === generation) setStatus('denied');
      } finally {
        if (current === generation) pending = false;
      }
    };

    void syncVisibility();
    document.addEventListener('visibilitychange', syncVisibility);
    return () => {
      document.removeEventListener('visibilitychange', syncVisibility);
      release();
    };
  }, [active, api, supported]);

  return {
    supported,
    locked: active && supported && status === 'locked',
    message: !supported
      ? '화면 유지 미지원 · 기기 설정을 확인해 주세요'
      : active
        ? statusText[status]
        : '시작 시 화면 유지 요청',
  };
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
