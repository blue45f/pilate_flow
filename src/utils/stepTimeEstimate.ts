import { stepTimeEstimateSchema } from '../schemas/stepTimeEstimate';
import type { StepTimeEstimate } from '../schemas/stepTimeEstimate';

/** Movement cadence excludes separate holds/breaths; overhead is counted only once. */
export function calculateStepTimeEstimate(input: unknown) {
  const parsed = stepTimeEstimateSchema.safeParse(input);
  if (!parsed.success)
    return {
      success: false as const,
      message:
        '횟수·세트·좌우와 가정 시간을 확인해 주세요. 호흡을 더할 때는 호흡당 시간도 필요합니다.',
    };
  const value: StepTimeEstimate = parsed.data;
  const movingSec = value.sides * value.sets * value.repetitions * value.secondsPerRep;
  const holdingSec = value.sides * value.sets * value.repetitions * value.holdSecPerRep;
  const breathingSec = value.sides * value.sets * value.breathsPerSet * value.secondsPerBreath;
  const restingSec = value.sides * (value.sets - 1) * value.restBetweenSetsSec;
  const switchingSec = (value.sides - 1) * value.sideSwitchSec;
  const totalSec =
    movingSec +
    holdingSec +
    breathingSec +
    restingSec +
    switchingSec +
    value.explanationSec +
    value.transitionSec;
  if (totalSec < 30 || totalSec > 1200)
    return {
      success: false as const,
      message:
        '계산한 블록 총시간은 30초–20분이어야 합니다. 긴 구성은 여러 블록으로 나누어 주세요.',
    };
  return {
    success: true as const,
    value,
    movingSec,
    holdingSec,
    breathingSec,
    restingSec,
    switchingSec,
    totalSec,
    durationMin: totalSec / 60,
  };
}
