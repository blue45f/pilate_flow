/** Reference preview timing only; never a teaching cadence or the live class timer. */
export const STUDIO_MOTION_CYCLE_MS = 8000;

// Join a hold with zero velocity and acceleration. Match linear progress,
// velocity and acceleration again after the first tenth of the travel.
function easeIntoTravel(progress: number): number {
  const ramp = 0.1;
  const edge = Math.min(progress, 1 - progress);
  if (edge >= ramp) return progress;
  const u = Math.max(0, edge) / ramp;
  const eased = ramp * u ** 3 * (6 - 8 * u + 3 * u ** 2);
  return progress < 0.5 ? eased : 1 - eased;
}

/** Same phase boundaries as the catalog's five-phase reference cycle. */
export function sampleStudioMotionCycle(progress: number) {
  const p = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  if (p < 0.12) return { id: 'setup' as const, label: '시작 정렬', pose: 0 };
  if (p < 0.42)
    return { id: 'move' as const, label: '추진', pose: easeIntoTravel((p - 0.12) / 0.3) };
  if (p < 0.58) return { id: 'turn' as const, label: '정점', pose: 1 };
  if (p < 0.88)
    return { id: 'return' as const, label: '복귀', pose: 1 - easeIntoTravel((p - 0.58) / 0.3) };
  return { id: 'finish' as const, label: '시작 자세로 마무리', pose: 0 };
}
