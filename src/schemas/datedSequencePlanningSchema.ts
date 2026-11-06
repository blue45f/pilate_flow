import { z } from 'zod';
import { scheduleDateSchema, scheduleTimeSchema } from './instructorScheduleSchema';
import { cloneAndFreezePlan } from '../types/datedSequencePlanning';
import type {
  DatedSequencePlanAssignment,
  DatedSequencePlanningData,
} from '../types/datedSequencePlanning';

export const DATED_PLAN_LIMIT = 10000;
export const DATED_PLAN_PRIOR_VERSION_LIMIT = 20;
export const datedPlanIdSchema = z.string().trim().min(1).max(200);
export const datedPlanStateSchema = z.enum(['draft', 'prepared']);
export const datedPlanTimestampSchema = z
  .string()
  .max(100)
  .refine((value) => Number.isFinite(Date.parse(value)), '계획 저장 시각이 올바르지 않습니다.');

function createVersionObject(sequenceGuard: z.ZodTypeAny) {
  return z
    .object({
      id: datedPlanIdSchema,
      classId: datedPlanIdSchema,
      originalDate: scheduleDateSchema,
      state: datedPlanStateSchema,
      // SavedSequence identity is historical and must preserve its exact bounded string.
      sourceSequenceId: z.string().min(1).max(300),
      // Existing SavedSequence.updatedAt is historical text, not necessarily a strict ISO date.
      sourceSequenceUpdatedAt: z.string().max(20000),
      sequenceSnapshot: sequenceGuard,
      occurrenceSnapshot: z
        .object({
          date: scheduleDateSchema,
          startTime: scheduleTimeSchema,
          endTime: scheduleTimeSchema,
          locationId: datedPlanIdSchema,
        })
        .strict()
        .refine((value) => value.endTime > value.startTime, '계획의 종료 시각을 확인해 주세요.'),
      createdAt: datedPlanTimestampSchema,
      updatedAt: datedPlanTimestampSchema,
    })
    .strict();
}

function validateSnapshotIdentity(
  value: { sequenceSnapshot?: unknown; sourceSequenceId: string; sourceSequenceUpdatedAt: string },
  ctx: z.RefinementCtx,
) {
  const snapshot = value.sequenceSnapshot as { id?: unknown; updatedAt?: unknown } | null;
  if (
    !snapshot ||
    snapshot.id !== value.sourceSequenceId ||
    snapshot.updatedAt !== value.sourceSequenceUpdatedAt
  )
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['sequenceSnapshot'],
      message: '원본 시퀀스와 스냅샷 식별 정보가 서로 다릅니다.',
    });
}

/** No recursive histories: each version retains the complete assignment at that moment. */
export function createDatedPlanVersionSchema(sequenceGuard: z.ZodTypeAny) {
  return createVersionObject(sequenceGuard).superRefine(validateSnapshotIdentity);
}

/** A factory keeps this guard independent of cloudBackupSchema and avoids an import cycle. */
export function createDatedPlanAssignmentSchema(sequenceGuard: z.ZodTypeAny) {
  return createVersionObject(sequenceGuard)
    .extend({
      priorVersions: z
        .array(z.unknown())
        .max(DATED_PLAN_PRIOR_VERSION_LIMIT)
        .pipe(z.array(createDatedPlanVersionSchema(sequenceGuard)))
        .optional(),
    })
    .superRefine((value, ctx) => {
      validateSnapshotIdentity(value, ctx);
      let previousTime = -Infinity;
      for (const [index, previous] of (value.priorVersions ?? []).entries()) {
        const timestamp = Date.parse(previous.updatedAt);
        if (
          previous.id !== value.id ||
          previous.classId !== value.classId ||
          previous.originalDate !== value.originalDate ||
          previous.createdAt !== value.createdAt ||
          timestamp <= previousTime ||
          timestamp >= Date.parse(value.updatedAt)
        )
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['priorVersions', index],
            message: '이전 계획의 회차 식별 정보 또는 버전 순서를 확인해 주세요.',
          });
        previousTime = timestamp;
      }
    })
    .transform((value, ctx): DatedSequencePlanAssignment => {
      try {
        return cloneAndFreezePlan(value) as DatedSequencePlanAssignment;
      } catch (error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: error instanceof Error ? error.message : '계획 스냅샷을 읽을 수 없습니다.',
        });
        return z.NEVER;
      }
    });
}

export function createDatedPlanningSchema(sequenceGuard: z.ZodTypeAny) {
  return z
    .object({
      // Reject oversized collections before validating and cloning thousands of snapshots.
      assignments: z
        .array(z.unknown())
        .max(DATED_PLAN_LIMIT)
        .pipe(z.array(createDatedPlanAssignmentSchema(sequenceGuard))),
    })
    .strict()
    .superRefine((value, ctx) => {
      const ids = new Set<string>(),
        keys = new Set<string>();
      value.assignments.forEach((item, index) => {
        const key = JSON.stringify([item.classId, item.originalDate]);
        if (ids.has(item.id) || keys.has(key))
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['assignments', index],
            message: '같은 계획 ID 또는 수업 회차가 중복되었습니다.',
          });
        ids.add(item.id);
        keys.add(key);
      });
    })
    .transform((value): DatedSequencePlanningData =>
      Object.freeze({ assignments: Object.freeze(value.assignments) }),
    );
}
