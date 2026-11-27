/** These durations describe the preview at 1×. The live class timer is independent. */
export const STUDIO_MOTION_CYCLE_MS = 8000;

const standard = { settleMs: 960, travelMs: 2400, peakMs: 1280, peakPose: 1, pulses: 0 };
const pulse = { ...standard, peakMs: 3000, pulses: 3 };
const hold = { ...standard, peakMs: 5000 };
const prep = { ...standard, travelMs: 3000, peakPose: 0.65 };
const lightSpring = { ...standard, travelMs: 3000 };

export function getStudioMotionTiming(exerciseId: string) {
  // IDs survive saving a world variation as a regular exercise in the class store.
  if (exerciseId.endsWith('--var-pulse')) return pulse;
  if (exerciseId.endsWith('--var-hold')) return hold;
  if (exerciseId.endsWith('--var-prep')) return prep;
  if (exerciseId.endsWith('--var-light-spring')) return lightSpring;
  return standard;
}

export function getStudioMotionDuration(timing: typeof standard) {
  return (timing.settleMs + timing.travelMs) * 2 + timing.peakMs;
}

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

/** A seek, a live frame and a paused preview always resolve the same posture. */
export function sampleStudioMotionCycle(progress: number, timing = standard) {
  const p = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const time = p * getStudioMotionDuration(timing);
  const { settleMs, travelMs, peakMs, peakPose, pulses } = timing;
  const peakStart = settleMs + travelMs;
  const returnStart = peakStart + peakMs;
  if (time < settleMs) return { id: 'setup' as const, label: '시작 정렬', pose: 0 };
  if (time < peakStart) {
    const fraction = (time - settleMs) / travelMs;
    return { id: 'move' as const, label: '추진', pose: peakPose * easeIntoTravel(fraction) };
  }
  if (time < returnStart) {
    const fraction = (time - peakStart) / peakMs;
    const dip = pulses ? 0.18 * Math.sin(Math.PI * pulses * fraction) ** 2 : 0;
    const label = pulses ? '작게 세 번 움직이기' : timing === hold ? '5초 머무르기' : '정점';
    return { id: 'turn' as const, label, pose: peakPose - dip };
  }
  if (time < returnStart + travelMs) {
    const fraction = (time - returnStart) / travelMs;
    return {
      id: 'return' as const,
      label: '복귀',
      pose: peakPose * (1 - easeIntoTravel(fraction)),
    };
  }
  return { id: 'finish' as const, label: '시작 자세로 마무리', pose: 0 };
}
