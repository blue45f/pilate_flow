import { z } from 'zod';
import { EQUIPMENT_IDS, PROP_IDS } from '../data/equipmentCatalog';
import type { InstructorScheduleData } from '../types/instructorSchedule';

export function isScheduleDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1900 || year > 2199) return false;
  const date = new Date(year, month - 1, day, 12);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export const scheduleDateSchema = z.string().refine(isScheduleDate, '올바른 날짜를 선택해 주세요.');
export const scheduleTimeSchema = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, '올바른 시각을 선택해 주세요.');
const id = z.string().trim().min(1).max(200);
const alias = z.string().trim().min(1, '이름 또는 별칭을 입력해 주세요.').max(100);
const note = z.string().max(2000);
const equipmentId = z
  .string()
  .refine((v) => EQUIPMENT_IDS.some((e) => e === v), '알 수 없는 기구입니다.');
const propId = z
  .string()
  .refine((v) => v !== 'none' && PROP_IDS.some((p) => p === v), '알 수 없는 소도구입니다.');
const unique = (values: readonly unknown[]) => new Set(values).size === values.length;

export const instructorLocationSchema = z
  .object({
    id,
    alias,
    equipmentIds: z
      .array(equipmentId)
      .max(EQUIPMENT_IDS.length)
      .refine(unique, '기구가 중복되었습니다.'),
    propIds: z.array(propId).max(PROP_IDS.length).refine(unique, '소도구가 중복되었습니다.'),
    notes: note,
  })
  .strict();

export const instructorScheduledClassSchema = z
  .object({
    id,
    title: alias,
    participantAlias: z.string().trim().max(100),
    locationId: id,
    startDate: scheduleDateSchema,
    startTime: scheduleTimeSchema,
    endTime: scheduleTimeSchema,
    recurrence: z.enum(['once', 'weekly']),
    weekdays: z
      .array(z.number().int().min(0).max(6))
      .max(7)
      .refine(unique, '요일이 중복되었습니다.'),
    untilDate: scheduleDateSchema.optional(),
    linkSavedSequenceId: id.optional(),
    notes: note,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.endTime <= value.startTime)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: '종료 시각은 시작보다 늦어야 합니다. 자정을 넘는 수업은 나누어 입력해 주세요.',
      });
    if (
      value.recurrence === 'weekly' &&
      (!value.untilDate || value.untilDate < value.startDate || !value.weekdays.length)
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['untilDate'],
        message: '매주 반복은 요일과 시작 날짜 이후의 종료 날짜가 필요합니다.',
      });
    if (value.untilDate && value.untilDate < value.startDate)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['untilDate'],
        message: '종료 날짜는 시작 날짜보다 빠를 수 없습니다.',
      });
  });

const closed = z
  .object({
    id,
    kind: z.literal('closed'),
    date: scheduleDateSchema,
    locationId: id.optional(),
    reason: note,
  })
  .strict();
const cancel = z
  .object({
    id,
    kind: z.literal('cancel'),
    classId: id,
    originalDate: scheduleDateSchema,
    reason: note,
  })
  .strict();
const reschedule = z
  .object({
    id,
    kind: z.literal('reschedule'),
    classId: id,
    originalDate: scheduleDateSchema,
    date: scheduleDateSchema,
    startTime: scheduleTimeSchema,
    endTime: scheduleTimeSchema,
    locationId: id.optional(),
    reason: note,
  })
  .strict();
export const instructorScheduleExceptionSchema = z
  .discriminatedUnion('kind', [closed, cancel, reschedule])
  .superRefine((value, ctx) => {
    if (value.kind === 'reschedule' && value.endTime <= value.startTime)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: '변경한 종료 시각은 시작보다 늦어야 합니다.',
      });
  });

export const instructorScheduleSchema = z
  .object({
    locations: z.array(instructorLocationSchema).max(200),
    classes: z.array(instructorScheduledClassSchema).max(2000),
    exceptions: z.array(instructorScheduleExceptionSchema).max(10000),
  })
  .strict()
  .superRefine((data, ctx) => {
    for (const key of ['locations', 'classes', 'exceptions'] as const)
      if (!unique(data[key].map((item) => item.id)))
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: '자료 ID가 중복되었습니다.',
        });
    const locations = new Set(data.locations.map((item) => item.id));
    const classes = new Map(data.classes.map((item) => [item.id, item]));
    const exceptions = new Set<string>();
    data.classes.forEach((item, i) => {
      if (!locations.has(item.locationId))
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['classes', i, 'locationId'],
          message: '수업 장소를 먼저 등록해 주세요.',
        });
    });
    data.exceptions.forEach((item, i) => {
      if ('locationId' in item && item.locationId && !locations.has(item.locationId))
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['exceptions', i],
          message: '변경 또는 휴무 장소를 찾을 수 없습니다.',
        });
      const key =
        item.kind === 'closed'
          ? `closed:${item.date}:${item.locationId ?? '*'}`
          : `${item.classId}:${item.originalDate}`;
      if (exceptions.has(key))
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['exceptions', i],
          message: '같은 회차 또는 휴무가 중복되었습니다.',
        });
      exceptions.add(key);
      if (item.kind !== 'closed') {
        const base = classes.get(item.classId);
        if (!base)
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['exceptions', i],
            message: '예외의 원래 수업을 찾을 수 없습니다.',
          });
        else {
          const [y, m, d] = item.originalDate.split('-').map(Number);
          const occurs =
            base.recurrence === 'once'
              ? base.startDate === item.originalDate
              : item.originalDate >= base.startDate &&
                item.originalDate <= (base.untilDate ?? '') &&
                base.weekdays.includes(new Date(y, m - 1, d, 12).getDay());
          if (!occurs)
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['exceptions', i],
              message: '원래 반복 범위에 없는 회차입니다.',
            });
        }
      }
    });
  })
  .transform((data) => data as InstructorScheduleData);
