import { z } from 'zod';
import { EQUIPMENT_OPTIONS, PROP_OPTIONS } from '../data/equipmentCatalog';
import type { EquipmentId } from '../data/equipmentCatalog';
import type { PropType } from '../types/pilates';

// Shared wire validation for private server backups.
export const apparatusSchema = z.enum(['reformer', 'cadillac', 'chair', 'barrel', 'mat']);
export const levelSchema = z.enum(['1.0', '1.5', '2.0']);
export const layerSchema = z.enum(['easy', 'standard', 'hard']);
export const categorySchema = z.enum([
  'warmup',
  'footwork',
  'bridging',
  'core',
  'upper-body',
  'lower-body',
  'plank',
  'extension',
  'feet-in-straps',
  'cooldown',
]);
export const propSchema = z.enum(PROP_OPTIONS.map((prop) => prop.id) as [PropType, ...PropType[]]);
export const equipmentSchema = z.enum(
  EQUIPMENT_OPTIONS.map((equipment) => equipment.id) as [EquipmentId, ...EquipmentId[]],
);
export const idSchema = z.string().min(1).max(300);
export const textSchema = z.string().max(20000);
export const stepSchema = z
  .object({
    stepId: idSchema,
    order: z.number().int().positive(),
    blockCategory: categorySchema,
    exerciseId: idSchema,
    durationMin: z.number().finite().positive().max(120),
    selectedLayer: layerSchema,
    customSpringOverride: textSchema.optional(),
    instructorNote: textSchema.optional(),
    locked: z.boolean().optional(),
    explanationSec: z.number().finite().nonnegative().max(7200).optional(),
    transitionSec: z.number().finite().nonnegative().max(7200).optional(),
  })
  .passthrough()
  .refine(
    (step) => (step.explanationSec ?? 0) + (step.transitionSec ?? 0) <= step.durationMin * 60,
    '설명·전환 시간이 항목 전체 시간을 초과합니다.',
  );
export const exerciseSchema = z
  .object({
    id: idSchema,
    nameKo: textSchema,
    nameEn: textSchema,
    apparatus: apparatusSchema,
    requiredEquipment: z.array(textSchema.min(1)).max(32).optional(),
    movementFamily: textSchema.min(1).optional(),
    review: z
      .object({
        status: z.literal('approved'),
        reviewerAlias: z.string().trim().min(1).max(80),
        reviewedAt: z.string().min(1),
        revision: z.string().min(1).max(300),
        scope: z.literal('planning-metadata'),
        credentialVerified: z.literal(false),
      })
      .optional(),
    props: z.array(propSchema),
    blockCategory: categorySchema,
    spinalPlanes: z.array(z.enum(['flexion', 'extension', 'lateral', 'rotation', 'neutral'])),
    bodyPosition: z.enum([
      'supine',
      'prone',
      'side-lying',
      'seated',
      'kneeling',
      'standing',
      'quadruped',
    ]),
    level: levelSchema,
    defaultDurationMin: z.number().finite().positive().max(120),
    isUnilateral: z.boolean(),
    springs: textSchema,
    box: z.enum(['none', 'long-box', 'short-box']),
    footbar: z.enum(['high', 'mid', 'low', 'down', 'none']),
    headrest: z.enum(['up', 'flat', 'down']),
    targetMuscles: z.array(textSchema),
    breathPattern: textSchema,
    cues: z.array(textSchema),
    precautions: textSchema,
    layers: z.object({ easy: textSchema, standard: textSchema, hard: textSchema }),
    youtube: z
      .object({
        videoId: textSchema,
        channelName: textSchema,
        videoTitle: textSchema,
        startSec: z.number().finite().nonnegative(),
        endSec: z.number().finite().nonnegative().optional(),
        url: textSchema,
        note: textSchema.optional(),
        region: z.enum(['kr', 'global']).optional(),
      })
      .passthrough(),
    favoriteTag: z.enum(['none', 'signature', 'member-love', 'rehab-posture', 'burn-sculpt']),
    tempo: z.enum(['slow-precise', 'moderate-flow', 'athletic-burn']).optional(),
    isCustom: z.boolean().optional(),
    createdAt: textSchema.optional(),
  })
  .passthrough();
export const sequenceSchema = z
  .object({
    criteriaSnapshot: z.lazy(() => criteriaSchema).optional(),
    id: idSchema,
    title: textSchema,
    subtitle: textSchema,
    apparatus: z.union([apparatusSchema, z.literal('mixed')]),
    level: levelSchema,
    focusTags: z.array(textSchema),
    targetMinutes: z.number().finite().positive().max(7200),
    steps: z.array(stepSchema).max(1000),
    createdAt: textSchema,
    updatedAt: textSchema,
    lastTaughtAt: textSchema.optional(),
    taughtCount: z.number().int().nonnegative(),
  })
  .passthrough();
export const groupSchema = z
  .object({
    id: idSchema,
    name: textSchema,
    type: z.enum(['group', 'private']),
    defaultLevel: levelSchema,
    scheduleLabel: textSchema,
    notes: textSchema,
  })
  .passthrough();
export const historySchema = z
  .object({
    criteriaSnapshot: z.lazy(() => criteriaSchema).optional(),
    id: idSchema,
    sequenceId: idSchema,
    sequenceTitle: textSchema,
    groupId: textSchema,
    groupName: textSchema,
    taughtAt: z
      .string()
      .refine((value) => Number.isFinite(Date.parse(value)), '수업 날짜가 올바르지 않습니다.'),
    apparatus: z.union([apparatusSchema, z.literal('mixed')]),
    level: levelSchema,
    exerciseIds: z.array(idSchema),
    rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    intensity: z.enum(['relaxed', 'moderate', 'intense']),
    instructorReflection: textSchema,
    actualDurationSec: z.number().finite().nonnegative().optional(),
    stepsSnapshot: z.array(stepSchema).optional(),
  })
  .passthrough();
export const criteriaSchema = z.object({
  apparatus: z.union([apparatusSchema, z.literal('mixed')]),
  ownedApparatus: z.array(apparatusSchema).optional(),
  availableEquipment: z.array(equipmentSchema).optional(),
  planningGoals: z
    .array(z.enum(['pelvic-control', 'trunk-hip-coordination', 'mobility', 'strength']))
    .optional(),
  instructorObservations: z
    .array(z.enum(['anterior-pelvic-tilt', 'posterior-pelvic-tilt']))
    .optional(),
  level: levelSchema,
  focusPreset: z.enum([
    'full-body',
    'core-sculpt',
    'glute-lower',
    'posture-upper',
    'mobility-rehab',
  ]),
  preferredProps: z.array(propSchema),
  excludeDaysWindow: z.number().finite().nonnegative().max(3650),
  targetGroupId: textSchema.optional(),
  targetMinutes: z.number().finite().min(10).max(120),
  defaultLayer: layerSchema,
});
export const templateSchema = z.object({
  id: idSchema,
  name: textSchema.min(1),
  criteria: criteriaSchema,
  createdAt: textSchema,
});
export const cloudBackupDataSchema = z.object({
  ownedApparatus: z.array(apparatusSchema).optional(),
  ownedEquipment: z.array(equipmentSchema).optional(),
  ownedProps: z.array(propSchema).optional(),
  exercises: z.array(exerciseSchema).max(20000),
  savedSequences: z.array(sequenceSchema).max(10000),
  classGroups: z.array(groupSchema).max(10000),
  historyLogs: z.array(historySchema).max(20000),
  activeDraft: sequenceSchema.optional(),
  draftCriteria: criteriaSchema.nullable().optional(),
  conditionTemplates: z.array(templateSchema).max(1000).optional(),
  lastCriteria: criteriaSchema.nullable().optional(),
});
