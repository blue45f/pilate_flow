import { z } from 'zod';

/** Instructor-entered planning assumptions, never recommended cadence or measured time. */
export const stepTimeEstimateSchema = z
  .object({
    version: z.literal(1),
    repetitions: z.number().int().min(1).max(1000),
    sets: z.number().int().min(1).max(100),
    sides: z.union([z.literal(1), z.literal(2)]),
    secondsPerRep: z.number().int().min(1).max(1200),
    holdSecPerRep: z.number().int().min(0).max(1200),
    breathsPerSet: z.number().int().min(0).max(100),
    secondsPerBreath: z.number().int().min(0).max(1200),
    restBetweenSetsSec: z.number().int().min(0).max(1200),
    sideSwitchSec: z.number().int().min(0).max(1200),
    explanationSec: z.number().int().min(0).max(1200),
    transitionSec: z.number().int().min(0).max(1200),
  })
  .strict()
  .refine((value) => value.breathsPerSet === 0 || value.secondsPerBreath > 0, {
    message: '별도 호흡 횟수를 입력했다면 호흡당 시간도 입력해 주세요.',
    path: ['secondsPerBreath'],
  });
export type StepTimeEstimate = z.infer<typeof stepTimeEstimateSchema>;
