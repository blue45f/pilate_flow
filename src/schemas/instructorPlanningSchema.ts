import { z } from 'zod';
import type { GroupPlanningConditions } from '../types/instructorPlanning';

export const groupAgeBandSchema = z.enum([
  'under-18',
  '18-39',
  '40-59',
  '60-plus',
  'mixed',
  'unspecified',
]);
export const groupExperienceSchema = z.enum(['new', 'some', 'experienced', 'mixed', 'unspecified']);

/** Inject the shared condition guard to avoid a cloud-schema runtime import cycle. */
export function createGroupPlanningPreferencesSchema(criteriaSchema: z.ZodTypeAny) {
  const conditionsSchema = z
    .custom<GroupPlanningConditions>((value) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
      if (
        Object.prototype.hasOwnProperty.call(value, 'targetGroupId') ||
        Object.prototype.hasOwnProperty.call(value, 'instructorObservations')
      )
        return false;
      return criteriaSchema.safeParse(value).success;
    }, '대상별 조건은 다른 대상의 ID나 개인 관찰 없이 유효한 수업 조건으로 저장해 주세요.')
    .transform((value) => criteriaSchema.parse(value) as GroupPlanningConditions);
  return z
    .object({
      ageBand: groupAgeBandSchema.optional(),
      experience: groupExperienceSchema.optional(),
      mixedLevelNotes: z.string().trim().max(1000).optional(),
      conditions: conditionsSchema.optional(),
    })
    .strict();
}
