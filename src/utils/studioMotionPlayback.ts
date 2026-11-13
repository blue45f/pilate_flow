/** Reference preview timing only; never a teaching cadence or the live class timer. */
export const STUDIO_MOTION_CYCLE_MS = 8000;

/** Same phase boundaries as the catalog's five-phase reference cycle. */
export function sampleStudioMotionCycle(progress: number) {
  const p = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  if (p < 0.12) return { id: 'setup' as const, label: '시작 정렬', pose: 0 };
  if (p < 0.42) return { id: 'move' as const, label: '추진', pose: (p - 0.12) / 0.3 };
  if (p < 0.58) return { id: 'turn' as const, label: '정점', pose: 1 };
  if (p < 0.88) return { id: 'return' as const, label: '복귀', pose: 1 - (p - 0.58) / 0.3 };
  return { id: 'finish' as const, label: '시작 자세로 마무리', pose: 0 };
}
