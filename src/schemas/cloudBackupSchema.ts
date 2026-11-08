import { createDatedPlanningSchema } from './datedSequencePlanningSchema';
import { z } from 'zod';
import { stepTimeEstimateSchema } from './stepTimeEstimate';
import { createGroupPlanningPreferencesSchema } from './instructorPlanningSchema';
import { instructorStudyStateSchema } from './instructorStudySchema';
import { instructorScheduleSchema } from './instructorScheduleSchema';
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

/** Link-only provenance. This validates the URL format, not source availability or safety. */
export const sourceReferenceSchema = z
  .object({
    referenceId: idSchema,
    url: z
      .string()
      .max(2048)
      .refine((value) => {
        if (
          value !== value.trim() ||
          !/^https?:\/\//i.test(value) ||
          Array.from(value).some((character) => {
            const code = character.codePointAt(0)!;
            return code <= 0x1f || (code >= 0x7f && code <= 0x9f);
          })
        )
          return false;
        try {
          const url = new URL(value);
          return (
            ['http:', 'https:'].includes(url.protocol) &&
            !!url.hostname &&
            !url.username &&
            !url.password
          );
        } catch {
          return false;
        }
      }, '자격 정보나 제어 문자가 없는 HTTP(S) 원본 링크를 확인해 주세요.'),
    title: z.string().trim().min(1).max(500),
    publisher: z.string().trim().min(1).max(300),
    region: z.enum(['kr', 'global']),
    verificationStatus: z.enum([
      'official-source-checked',
      'partial-playback-checked',
      'korean-candidate',
    ]),
    verifiedAt: z.string().date(),
    rights: z.literal('link-only'),
    rawLedgerFile: z.enum(['verified-source-catalog.json', 'korean-candidate-catalog.json']),
    rawItemId: idSchema,
  })
  .strict();

export const stepRepetitionsSchema = z.number().int().min(1).max(1000);
export const stepSetsSchema = z.number().int().min(1).max(100);
export const stepSideModeSchema = z.enum([
  'together',
  'left',
  'right',
  'left-then-right',
  'right-then-left',
]);
export const stepPracticeOptionsSchema = z
  .object({
    repetitions: stepRepetitionsSchema.optional(),
    sets: stepSetsSchema.optional(),
    sideMode: stepSideModeSchema.optional(),
  })
  .strict();

export const classSectionRoleSchema = z.enum(['preparation', 'main', 'cooldown']);
/** Structural wire validation keeps stale and future selections intact for manual review. */
export const sequenceMotionStudyBindingSchema = z
  .object({
    version: z.number().int().positive().safe(),
    family: z.string().min(1).max(120),
    variantId: idSchema,
    sourceFingerprint: z.string().regex(/^[a-fA-F0-9]{64}$/),
  })
  .passthrough();

/** Limits apply to newly edited values; the wire schema below retains valid legacy timings. */
const stepTimingOptionsBaseSchema = z
  .object({
    durationMin: z.number().finite().min(0.5).max(20).optional(),
    explanationSec: z.number().finite().nonnegative().max(1200).optional(),
    transitionSec: z.number().finite().nonnegative().max(1200).optional(),
    customSpringOverride: z.string().trim().max(500).optional(),
  })
  .strict();
function requireEditedDuration(value: { durationMin?: number }, context: z.RefinementCtx) {
  if (Object.prototype.hasOwnProperty.call(value, 'durationMin') && value.durationMin === undefined)
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['durationMin'],
      message: '전체 시간은 지울 수 없습니다. 0.5–20분 사이로 입력해 주세요.',
    });
}
export const stepTimingOptionsSchema =
  stepTimingOptionsBaseSchema.superRefine(requireEditedDuration);
export const stepBlockOptionsSchema = stepTimingOptionsBaseSchema
  .extend(stepPracticeOptionsSchema.shape)
  .extend({
    timeEstimate: stepTimeEstimateSchema.nullable().optional(),
    instructorNote: textSchema.optional(),
    selectedLayer: layerSchema.optional(),
    classSection: classSectionRoleSchema.nullable().optional(),
    motionStudy: sequenceMotionStudyBindingSchema.nullable().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    requireEditedDuration(value, context);
    if (
      Object.prototype.hasOwnProperty.call(value, 'selectedLayer') &&
      value.selectedLayer === undefined
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['selectedLayer'],
        message: '변형 선택은 지울 수 없습니다. 쉬운·기본·어려운 변형 중에서 선택해 주세요.',
      });
    if (
      Object.prototype.hasOwnProperty.call(value, 'motionStudy') &&
      value.motionStudy === undefined
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['motionStudy'],
        message: '연결을 해제하려면 연결 없음으로 지정해 주세요.',
      });
  });

const movementSafetyAndEfficacyBoundarySchema = z.object({
  originType: z.enum(['instructor-created-draft', 'catalog-reference']),
  evaluationBasis: z.enum(['subjective-instructor-feel', 'catalog-metadata']),
  aiSafetyGuaranteed: z.literal(false),
  objectiveEfficacyClaimed: z.literal(false),
  expertVerified: z.literal(false),
  disclaimerKo: z.string().trim().min(1).max(1000),
}).passthrough();

const subjectiveFeelLogSchema = z.object({
  id: idSchema,
  recordedAt: textSchema,
  feelNoteKo: z.string().trim().min(1).max(2000),
  perceivedIntensity: z.enum(['gentle', 'moderate', 'challenging']).optional(),
  cautionFeelKo: z.string().trim().max(2000).optional(),
  evaluationBasis: z.literal('subjective-instructor-feel'),
  objectiveEfficacyClaimed: z.literal(false),
  safetyGuaranteed: z.literal(false),
  expertVerified: z.literal(false),
}).passthrough();

const draftModificationLogSchema = z.object({
  id: idSchema,
  recordedAt: textSchema,
  modificationPointKo: z.string().trim().min(1).max(2000),
  setupOrSpringChangeKo: z.string().trim().max(1000).optional(),
  cueChangeKo: z.string().trim().max(1000).optional(),
  appliedToRevision: z.number().int().positive().optional(),
}).passthrough();

const draftPhotoReferenceSchema = z.object({
  id: idSchema,
  localRefUri: z
    .string()
    .trim()
    .min(1)
    .max(200000)
    .refine((uri) => {
      const normalizedForExternalCheck = uri.startsWith('data:image/svg+xml')
        ? uri.replace(/https?:\/\/www\.w3\.org\/2000\/svg/gi, '')
        : uri;
      return (
        (uri.startsWith('local-photo://') ||
          uri.startsWith('blob:') ||
          uri.startsWith('asset://') ||
          uri.startsWith('file://') ||
          uri.startsWith('data:image/')) &&
        !/https?:\/\//i.test(normalizedForExternalCheck)
      );
    }),
  captionKo: z.string().trim().max(500).optional(),
  angleTag: z.enum(['setup', 'start-pose', 'end-pose', 'modification']).optional(),
  capturedAt: textSchema,
  externalAiUploadAllowed: z.literal(false),
}).passthrough();

export const movementSnapshotSchema = z.object({
  id: idSchema,
  nameKo: textSchema,
  nameEn: textSchema,
  apparatus: apparatusSchema,
  requiredEquipment: z.array(textSchema.min(1)).max(32).optional(),
  movementFamily: textSchema.min(1).optional(),
  blockCategory: categorySchema,
  level: levelSchema,
  defaultDurationMin: z.number().finite().positive().max(120),
  defaultRepetitions: stepRepetitionsSchema.optional(),
  defaultSets: stepSetsSchema.optional(),
  isUnilateral: z.boolean(),
  springs: textSchema,
  box: z.enum(['none', 'long-box', 'short-box']),
  footbar: z.enum(['high', 'mid', 'low', 'down', 'none']),
  headrest: z.enum(['up', 'flat', 'down']),
  props: z.array(propSchema),
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
  targetMuscles: z.array(textSchema),
  breathPattern: textSchema,
  cues: z.array(textSchema),
  precautions: textSchema,
  layers: z.object({
    easy: textSchema,
    standard: textSchema,
    hard: textSchema,
  }),
  capturedAt: textSchema,
  sourceOrigin: z.enum(['catalog', 'human-created']).optional(),
  humanDraftId: idSchema.optional(),
  humanDraftRevision: z.number().int().positive().optional(),
  parentDraftId: idSchema.optional(),
  parentDraftRevision: z.number().int().positive().optional(),
  variantLabelKo: z.string().trim().max(200).optional(),
  ideaLineSnapshot: textSchema.optional(),
  feelLogsSnapshot: z.array(subjectiveFeelLogSchema).max(500).optional(),
  modificationLogsSnapshot: z.array(draftModificationLogSchema).max(500).optional(),
  photoReferencesSnapshot: z.array(draftPhotoReferenceSchema).max(100).optional(),
  safetyBoundarySnapshot: movementSafetyAndEfficacyBoundarySchema.optional(),
}).passthrough();

export const sequenceSourceProvenanceSchema = z.object({
  kind: z.enum([
    'history-snapshot',
    'dated-plan-snapshot',
    'saved-sequence-clone',
    'ai-draft',
    'manual',
  ]),
  sourceId: idSchema,
  sourceTitle: textSchema,
  sourceSequenceId: textSchema.optional(),
  sourceVersion: z.number().int().positive().optional(),
  sourceUpdatedAt: textSchema.optional(),
  sourceTaughtAt: textSchema.optional(),
  clonedAt: textSchema,
  summaryKo: textSchema,
}).passthrough();

export const classBlockSnapshotSchema = z.object({
  blockInstanceId: idSchema,
  sourceBlockId: idSchema,
  sourceBlockVersion: z.number().int().positive(),
  sourceBlockTitle: textSchema,
  detached: z.boolean(),
  stepIds: z.array(idSchema).max(1000),
}).passthrough();

export const stepSchema = z
  .object({
    kind: z.enum(['exercise', 'rest']).optional(),
    stepId: idSchema,
    order: z.number().int().positive(),
    blockCategory: categorySchema,
    exerciseId: z.string().max(300),
    durationMin: z.number().finite().positive().max(120),
    selectedLayer: layerSchema,
    customSpringOverride: textSchema.optional(),
    instructorNote: textSchema.optional(),
    locked: z.boolean().optional(),
    explanationSec: z.number().finite().nonnegative().max(7200).optional(),
    transitionSec: z.number().finite().nonnegative().max(7200).optional(),
    repetitions: stepRepetitionsSchema.optional(),
    sets: stepSetsSchema.optional(),
    sideMode: stepSideModeSchema.optional(),
    classSection: classSectionRoleSchema.optional(),
    motionStudy: sequenceMotionStudyBindingSchema.optional(),
    timeEstimate: stepTimeEstimateSchema.optional(),
    blockInstanceId: idSchema.optional(),
    sourceBlockId: idSchema.optional(),
    sourceBlockVersion: z.number().int().positive().optional(),
    sourceBlockTitle: textSchema.optional(),
    blockInstanceDetached: z.boolean().optional(),
    exerciseSnapshot: movementSnapshotSchema.optional(),
    humanDraftId: idSchema.optional(),
    humanDraftRevision: z.number().int().positive().optional(),
    futureStep: z.record(z.unknown()).optional(),
    historicalStepLabel: textSchema.optional(),
  })
  .passthrough()
  .refine(
    (step) =>
      (step.explanationSec ?? 0) + (step.transitionSec ?? 0) <= Math.round(step.durationMin * 60),
    '설명·전환 시간이 항목 전체 시간을 초과합니다.',
  )
  .refine(
    (step) =>
      step.kind === 'rest'
        ? step.exerciseId === '' &&
          !step.explanationSec &&
          !step.transitionSec &&
          step.repetitions === undefined &&
          step.sets === undefined &&
          step.sideMode === undefined &&
          step.timeEstimate === undefined
        : step.exerciseId.length > 0,
    '휴식은 동작 참조·횟수·세트·좌우 지정·설명·전환 없이 저장하고, 동작에는 동작 참조가 필요합니다.',
  );
export const exerciseSchema = z.object({
  id: idSchema,
  nameKo: textSchema,
  nameEn: textSchema,
  apparatus: apparatusSchema,
  requiredEquipment: z.array(textSchema.min(1)).max(32).optional(),
  movementFamily: textSchema.min(1).optional(),
  sourceReference: sourceReferenceSchema.optional(),
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
  defaultRepetitions: stepRepetitionsSchema.optional(),
  defaultSets: stepSetsSchema.optional(),
  isUnilateral: z.boolean(),
  springs: textSchema,
  box: z.enum(['none', 'long-box', 'short-box']),
  footbar: z.enum(['high', 'mid', 'low', 'down', 'none']),
  headrest: z.enum(['up', 'flat', 'down']),
  targetMuscles: z.array(textSchema),
  breathPattern: textSchema,
  cues: z.array(textSchema),
  precautions: textSchema,
  layers: z.object({
    easy: textSchema,
    standard: textSchema,
    hard: textSchema,
  }),
  youtube: z.object({
    videoId: textSchema,
    channelName: textSchema,
    videoTitle: textSchema,
    startSec: z.number().finite().nonnegative(),
    endSec: z.number().finite().nonnegative().optional(),
    url: textSchema,
    note: textSchema.optional(),
    region: z.enum(['kr', 'global']).optional(),
    historicalVideoLabel: textSchema.optional(),
  }).passthrough(),
  favoriteTag: z.enum(['none', 'signature', 'member-love', 'rehab-posture', 'burn-sculpt']),
  tempo: z.enum(['slow-precise', 'moderate-flow', 'athletic-burn']).optional(),
  isCustom: z.boolean().optional(),
  createdAt: textSchema.optional(),
  capturedAt: textSchema.optional(),
  sourceOrigin: z.enum(['catalog', 'human-created']).optional(),
  humanDraftId: idSchema.optional(),
  humanDraftRevision: z.number().int().positive().optional(),
  parentDraftId: idSchema.optional(),
  parentDraftRevision: z.number().int().positive().optional(),
  variantLabelKo: textSchema.optional(),
  ideaLineSnapshot: textSchema.optional(),
  feelLogsSnapshot: z.array(subjectiveFeelLogSchema).max(500).optional(),
  modificationLogsSnapshot: z.array(draftModificationLogSchema).max(500).optional(),
  photoReferencesSnapshot: z.array(draftPhotoReferenceSchema).max(100).optional(),
  safetyBoundarySnapshot: movementSafetyAndEfficacyBoundarySchema.optional(),
  historicalExtension: z.record(z.unknown()).optional(),
}).passthrough();

export const teachingProgramSnapshotItemSchema = z.object({
  order: z.number().int().positive(),
  stepId: idSchema,
  kind: z.enum(['exercise', 'rest']),
  exerciseId: z.string().max(300),
  blockCategory: categorySchema,
  blockNameKo: textSchema,
  blockNameEn: textSchema,
  classSection: z.enum(['opening', 'main', 'ending']),
  classSectionLabelKo: textSchema,
  stepClassSection: classSectionRoleSchema.optional(),
  timeEstimate: stepTimeEstimateSchema.optional(),
  motionStudy: sequenceMotionStudyBindingSchema.optional(),
  durationMin: z.number().finite().positive().max(120),
  explanationSec: z.number().finite().nonnegative().max(7200),
  transitionSec: z.number().finite().nonnegative().max(7200),
  movementSec: z.number().finite().nonnegative().max(7200),
  perSideSec: z.number().finite().nonnegative().max(7200).optional(),
  selectedLayer: layerSchema,
  selectedLayerLabelKo: textSchema,
  selectedLayerDescription: textSchema,
  customSpringOverride: textSchema.optional(),
  effectiveSprings: textSchema,
  repetitions: stepRepetitionsSchema.optional(),
  sets: stepSetsSchema.optional(),
  sideMode: stepSideModeSchema.optional(),
  instructorNote: textSchema.optional(),
  locked: z.boolean().optional(),
  blockInstanceId: idSchema.optional(),
  sourceBlockId: idSchema.optional(),
  sourceBlockVersion: z.number().int().positive().optional(),
  sourceBlockTitle: textSchema.optional(),
  blockInstanceDetached: z.boolean().optional(),
  humanDraftId: idSchema.optional(),
  humanDraftRevision: z.number().int().positive().optional(),
  movementSnapshot: movementSnapshotSchema.optional(),
  exerciseSnapshot: exerciseSchema.optional(),
}).passthrough();

export const teachingProgramTimingSnapshotSchema = z.object({
  plannedTotalSec: z.number().finite().nonnegative(),
  plannedExerciseSec: z.number().finite().nonnegative(),
  plannedRestSec: z.number().finite().nonnegative(),
  actualDurationSec: z.number().finite().nonnegative().optional(),
  actualRestDurationSec: z.number().finite().nonnegative().optional(),
  actualExerciseDurationSec: z.number().finite().nonnegative().optional(),
}).passthrough();

export const classSequenceSnapshotSchema = z.object({
  snapshotId: idSchema,
  capturedAt: textSchema,
  sourceSequenceId: idSchema,
  sourceSequenceVersion: z.number().int().positive(),
  sourceSequenceUpdatedAt: textSchema.optional(),
  title: textSchema,
  subtitle: textSchema,
  apparatus: z.union([apparatusSchema, z.literal('mixed')]),
  level: levelSchema,
  targetMinutes: z.number().finite().positive().max(7200),
  steps: z.array(stepSchema).max(1000),
  exerciseSnapshots: z.record(idSchema, movementSnapshotSchema),
  blockSnapshots: z.array(classBlockSnapshotSchema).max(500),
  timeBreakdown: z.object({
    movementSec: z.number().finite().nonnegative(),
    explanationSec: z.number().finite().nonnegative(),
    transitionSec: z.number().finite().nonnegative(),
    restSec: z.number().finite().nonnegative(),
    totalSec: z.number().finite().nonnegative(),
  }),
  sourceProvenance: sequenceSourceProvenanceSchema.optional(),
}).passthrough();

export const teachingProgramSnapshotSchema = z.object({
  snapshotVersion: z.literal(1),
  recordKind: z.literal('completed-history'),
  sourceKind: z.enum(['saved-sequence', 'active-draft']),
  sourceSequenceId: idSchema,
  sourceSequenceTitle: textSchema,
  sourceSubtitle: textSchema,
  sourceSequenceVersion: z.number().int().positive().optional(),
  sourceProvenance: sequenceSourceProvenanceSchema.optional(),
  taughtAt: textSchema,
  capturedAt: textSchema,
  completionFingerprint: textSchema,
  timing: teachingProgramTimingSnapshotSchema,
  exercisesById: z.record(idSchema, exerciseSchema),
  blockSnapshots: z.array(classBlockSnapshotSchema).max(500).optional(),
  sequenceSnapshot: classSequenceSnapshotSchema.optional(),
  items: z.array(teachingProgramSnapshotItemSchema).max(1000),
}).passthrough();

export const sequenceSchema = z
  .object({
    recoveredDraftOrigin: z.lazy(() => recoveredDraftOriginSchema).optional(),
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
    version: z.number().int().positive().optional(),
    sourceProvenance: sequenceSourceProvenanceSchema.optional(),
    historicalPlanLabel: textSchema.optional(),
  })
  .passthrough()
  .refine(
    (sequence) =>
      sequence.steps
        .filter((step) => step.kind === 'rest')
        .reduce((sum, step) => sum + step.durationMin, 0) < sequence.targetMinutes,
    '휴식 합계는 전체 수업 시간보다 작아야 합니다.',
  );
export const groupSchema = z.object({
  planningPreferences: z.lazy(() => groupPlanningPreferencesSchema).optional(),
  id: idSchema,
  name: textSchema,
  type: z.enum(['group', 'private']),
  defaultLevel: levelSchema,
  scheduleLabel: textSchema,
  notes: textSchema,
}).passthrough();
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
    exerciseIds: z.array(idSchema).max(1000),
    rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    intensity: z.enum(['relaxed', 'moderate', 'intense']),
    instructorReflection: textSchema,
    actualDurationSec: z.number().finite().nonnegative().optional(),
    actualRestDurationSec: z.number().finite().nonnegative().optional(),
    stepsSnapshot: z.array(stepSchema).max(1000).optional(),
    programSnapshot: teachingProgramSnapshotSchema.optional(),
    sequenceSnapshot: classSequenceSnapshotSchema.optional(),
    sourceProvenance: sequenceSourceProvenanceSchema.optional(),
  })
  .passthrough()
  .refine(
    (log) =>
      log.actualRestDurationSec === undefined ||
      log.actualDurationSec === undefined ||
      log.actualRestDurationSec <= log.actualDurationSec,
    '기록된 실제 휴식은 전체 실제 수업 시간을 초과할 수 없습니다.',
  );
export const criteriaSchema = z
  .object({
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
    restMinutes: z.number().finite().nonnegative().optional(),
    defaultLayer: layerSchema,
  })
  .refine(
    (criteria) => (criteria.restMinutes ?? 0) < criteria.targetMinutes,
    '휴식 시간은 전체 수업 시간보다 작아야 합니다.',
  );
/** Unknown historical timestamps and absent original-v0 criteria remain explicit. */
export const recoveredDraftOriginSchema = z
  .object({
    format: z.enum(['persisted-workspace-v0', 'persisted-workspace-v3']),
    sourceSequenceId: textSchema.min(1),
    activeTargetGroupId: textSchema,
    draftCriteria: criteriaSchema.nullable(),
    lastCriteria: criteriaSchema.nullable(),
    criteriaPresence: z.object({ draft: z.boolean(), last: z.boolean() }).strict(),
    timestamps: z.literal('unrecorded'),
  })
  .strict()
  .refine(
    (origin) =>
      (origin.criteriaPresence.draft || origin.draftCriteria === null) &&
      (origin.criteriaPresence.last || origin.lastCriteria === null) &&
      (origin.format === 'persisted-workspace-v0' ||
        origin.criteriaPresence.draft ||
        origin.criteriaPresence.last),
    '이전 초안의 조건 기록 여부와 원본 형식이 서로 다릅니다.',
  );
export const groupPlanningPreferencesSchema = createGroupPlanningPreferencesSchema(criteriaSchema);
export const datedSequencePlanningSchema = createDatedPlanningSchema(sequenceSchema);
export const templateSchema = z.object({
  id: idSchema,
  name: textSchema.min(1),
  criteria: criteriaSchema,
  createdAt: textSchema,
});
export const cloudBackupDataSchema = z.object({
  datedSequencePlanning: datedSequencePlanningSchema.optional(),
  instructorStudyState: instructorStudyStateSchema.optional(),
  instructorSchedule: instructorScheduleSchema.optional(),
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
