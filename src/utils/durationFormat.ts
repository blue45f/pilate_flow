/**
 * Unified rounding and formatting policy for recorded/timer durations (PF-04).
 *
 * Policy:
 * 1. Normalize raw seconds once via `normalizeWholeSeconds` (`Math.max(0, Math.round(raw))`),
 *    preventing `59.6` from ever rendering `0분 60초` or diverging across summary/detail/export.
 * 2. Never exaggerate `0초` (or sub-minute `1..59초`) as `1분`:
 *    - `0` seconds -> summary `'0초 진행'`, detail `'0분 0초'`, clock `'00:00'`
 *    - `1..59` seconds -> summary `'N초 진행'`, detail `'0분 N초'`, clock `'00:NN'`
 *    - `>= 60` seconds -> summary `'M분 진행'` (rounded to nearest minute, >= 1),
 *      detail `'M분 S초'` (exact whole seconds), clock `'MM:SS'`.
 */
export function normalizeWholeSeconds(rawSeconds: number | undefined | null): number | null {
  if (rawSeconds === undefined || rawSeconds === null || !Number.isFinite(rawSeconds)) {
    return null;
  }
  return Math.max(0, Math.round(rawSeconds));
}

export function formatActualDurationSummaryPill(rawSeconds: number): string {
  const sec = normalizeWholeSeconds(rawSeconds) ?? 0;
  if (sec === 0) return '0초 진행';
  if (sec < 60) return `${sec}초 진행`;
  return `${Math.max(1, Math.round(sec / 60))}분 진행`;
}

export function formatActualDurationDetailText(rawSeconds: number): string {
  const sec = normalizeWholeSeconds(rawSeconds) ?? 0;
  const mins = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${mins}분 ${rem}초`;
}

export function formatWholeSecondsToMMSS(rawSeconds: number): string {
  const sec = normalizeWholeSeconds(rawSeconds) ?? 0;
  const mins = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}
