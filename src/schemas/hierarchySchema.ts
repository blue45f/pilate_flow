import { z } from 'zod';
import { PROP_OPTIONS } from '../data/equipmentCatalog';
import type { PropType } from '../types/pilates';

const apparatusSchema = z.enum(['reformer', 'cadillac', 'chair', 'barrel', 'mat']);
const levelSchema = z.enum(['1.0', '1.5', '2.0']);
const layerSchema = z.enum(['easy', 'standard', 'hard']);
const categorySchema = z.enum([
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
const propSchema = z.enum(PROP_OPTIONS.map((prop) => prop.id) as [PropType, ...PropType[]]);
const idSchema = z.string().min(1).max(300);
const textSchema = z.string().max(20000);
const classSectionRoleSchema = z.enum(['preparation', 'main', 'cooldown']);
const stepSideModeSchema = z.enum([
  'together',
  'left',
  'right',
  'left-then-right',
  'right-then-left',
]);
const spinalPlaneSchema = z.enum(['flexion', 'extension', 'lateral', 'rotation', 'neutral']);
const bodyPositionSchema = z.enum([
  'supine',
  'prone',
  'side-lying',
  'seated',
  'kneeling',
  'standing',
  'quadruped',
]);
const boxSchema = z.enum(['none', 'long-box', 'short-box']);
const footbarSchema = z.enum(['high', 'mid', 'low', 'down', 'none']);
const headrestSchema = z.enum(['up', 'flat', 'down']);

/**
 * Epistemic & Safety Boundary Schema
 * Never allows AI/system to claim objective efficacy, safety guarantee, or expert verification.
 */
export const movementSafetyAndEfficacyBoundarySchema = z
  .object({
    originType: z.enum(['instructor-created-draft', 'catalog-reference']),
    evaluationBasis: z.enum(['subjective-instructor-feel', 'catalog-metadata']),
    aiSafetyGuaranteed: z.literal(false),
    objectiveEfficacyClaimed: z.literal(false),
    expertVerified: z.literal(false),
    disclaimerKo: z.string().trim().min(1).max(1000),
  })
  .passthrough();

/**
 * Subjective Feel Log Schema (주관적 느낌 기록 — 객관적 효과 판정과 엄격히 구분)
 */
export const subjectiveFeelLogSchema = z
  .object({
    id: idSchema,
    recordedAt: textSchema,
    feelNoteKo: z.string().trim().min(1, '직접 해본 느낌 메모를 입력해 주세요.').max(2000),
    perceivedIntensity: z.enum(['gentle', 'moderate', 'challenging']).optional(),
    cautionFeelKo: z.string().trim().max(2000).optional(),
    evaluationBasis: z.literal('subjective-instructor-feel'),
    objectiveEfficacyClaimed: z.literal(false),
    safetyGuaranteed: z.literal(false),
    expertVerified: z.literal(false),
  })
  .passthrough();

/**
 * Draft Modification Log Schema (직접 해본 뒤 수정할 점 기록)
 */
export const draftModificationLogSchema = z
  .object({
    id: idSchema,
    recordedAt: textSchema,
    modificationPointKo: z.string().trim().min(1, '수정할 점 메모를 입력해 주세요.').max(2000),
    setupOrSpringChangeKo: z.string().trim().max(1000).optional(),
    cueChangeKo: z.string().trim().max(1000).optional(),
    appliedToRevision: z.number().int().positive().optional(),
  })
  .passthrough();

/**
 * Draft Photo Reference Schema (로컬/앱 내부 사진 참조 — 외부 AI 전송 금지)
 */
export const draftPhotoReferenceSchema = z
  .object({
    id: idSchema,
    localRefUri: z
      .string()
      .trim()
      .min(1, '사진 참조 경로를 확인해 주세요.')
      .max(1024)
      .refine(
        (uri) =>
          (uri.startsWith('local-photo://') ||
            uri.startsWith('blob:') ||
            uri.startsWith('asset://') ||
            uri.startsWith('file://')) &&
          !/https?:\/\//i.test(uri),
        '사진 참조는 외부 전송이 차단된 로컬 참조(local-photo://, blob:, asset://, file://) 형식만 허용됩니다.',
      ),
    captionKo: z.string().trim().max(500).optional(),
    angleTag: z.enum(['setup', 'start-pose', 'end-pose', 'modification']).optional(),
    capturedAt: textSchema,
    externalAiUploadAllowed: z.literal(false),
  })
  .passthrough();

/**
 * Human Movement Draft Content Schema
 * Only `ideaLine` is required; all classification, anatomy, equipment, duration, and L/R fields are optional.
 */
export const humanMovementDraftContentSchema = z
  .object({
    ideaLine: z.string().trim().min(1, '최소 한 줄의 동작 아이디어를 입력해 주세요.').max(1000),
    workingNameKo: z.string().trim().max(200).optional(),
    apparatus: apparatusSchema.optional(),
    requiredEquipment: z.array(textSchema.min(1)).max(32).optional(),
    props: z.array(propSchema).optional(),
    blockCategory: categorySchema.optional(),
    sectionRole: classSectionRoleSchema.optional(),
    level: levelSchema.optional(),
    defaultDurationMin: z.number().finite().min(0.5).max(120).optional(),
    defaultRepetitions: z.number().int().min(1).max(1000).optional(),
    defaultSets: z.number().int().min(1).max(100).optional(),
    isUnilateral: z.boolean().optional(),
    sideMode: stepSideModeSchema.optional(),
    springs: textSchema.optional(),
    box: boxSchema.optional(),
    footbar: footbarSchema.optional(),
    headrest: headrestSchema.optional(),
    bodyPosition: bodyPositionSchema.optional(),
    spinalPlanes: z.array(spinalPlaneSchema).optional(),
    targetMuscles: z.array(textSchema).optional(),
    breathPattern: textSchema.optional(),
    cues: z.array(textSchema).optional(),
    precautions: textSchema.optional(),
    layers: z
      .object({
        easy: textSchema.optional(),
        standard: textSchema.optional(),
        hard: textSchema.optional(),
      })
      .optional(),
    feelLogs: z.array(subjectiveFeelLogSchema).max(500),
    modificationLogs: z.array(draftModificationLogSchema).max(500),
    photoReferences: z.array(draftPhotoReferenceSchema).max(100),
  })
  .passthrough();

export const draftRevisionEntrySchema = z
  .object({
    revision: z.number().int().positive(),
    parentRevision: z.number().int().positive().optional(),
    savedAt: textSchema,
    changeType: z.enum([
      'initial-idea',
      'idea-updated',
      'feel-added',
      'modification-added',
      'photo-added',
      'metadata-refined',
      'restored-revision',
    ]),
    summaryKo: z.string().trim().min(1).max(1000),
    contentSnapshot: humanMovementDraftContentSchema,
  })
  .passthrough();

export const humanMovementDraftSchema = humanMovementDraftContentSchema
  .extend({
    id: idSchema,
    sourceOrigin: z.literal('human-created'),
    completenessStage: z.enum(['idea-only', 'practiced-recorded', 'class-ready']),
    revision: z.number().int().positive(),
    revisionHistory: z.array(draftRevisionEntrySchema).min(1).max(1000),
    safetyBoundary: movementSafetyAndEfficacyBoundarySchema,
    createdAt: textSchema,
    updatedAt: textSchema,
  })
  .passthrough();

export const movementSnapshotSchema = z
  .object({
    id: idSchema,
    nameKo: textSchema,
    nameEn: textSchema,
    apparatus: apparatusSchema,
    requiredEquipment: z.array(textSchema.min(1)).max(32).optional(),
    movementFamily: textSchema.min(1).optional(),
    blockCategory: categorySchema,
    level: levelSchema,
    defaultDurationMin: z.number().finite().positive().max(120),
    defaultRepetitions: z.number().int().min(1).max(1000).optional(),
    defaultSets: z.number().int().min(1).max(100).optional(),
    isUnilateral: z.boolean(),
    springs: textSchema,
    box: boxSchema,
    footbar: footbarSchema,
    headrest: headrestSchema,
    props: z.array(propSchema),
    spinalPlanes: z.array(spinalPlaneSchema),
    bodyPosition: bodyPositionSchema,
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
    ideaLineSnapshot: textSchema.optional(),
    feelLogsSnapshot: z.array(subjectiveFeelLogSchema).optional(),
    modificationLogsSnapshot: z.array(draftModificationLogSchema).optional(),
    photoReferencesSnapshot: z.array(draftPhotoReferenceSchema).optional(),
    safetyBoundarySnapshot: movementSafetyAndEfficacyBoundarySchema.optional(),
  })
  .passthrough();

export const reusableBlockItemSchema = z
  .object({
    itemId: idSchema,
    order: z.number().int().positive(),
    exerciseId: idSchema,
    blockCategory: categorySchema,
    durationMin: z.number().finite().min(0.5).max(20),
    explanationSec: z.number().finite().nonnegative().max(1200).optional(),
    transitionSec: z.number().finite().nonnegative().max(1200).optional(),
    repetitions: z.number().int().min(1).max(1000).optional(),
    sets: z.number().int().min(1).max(100).optional(),
    sideMode: stepSideModeSchema.optional(),
    selectedLayer: layerSchema,
    customSpringOverride: textSchema.optional(),
    instructorNote: textSchema.optional(),
    exerciseSnapshot: movementSnapshotSchema.optional(),
    humanDraftId: idSchema.optional(),
    humanDraftRevision: z.number().int().positive().optional(),
  })
  .passthrough()
  .refine(
    (item) => (item.explanationSec ?? 0) + (item.transitionSec ?? 0) <= item.durationMin * 60,
    '블록 내 동작의 설명·전환 시간이 해당 동작 전체 시간을 초과합니다.',
  );

export const reusableBlockSchema = z
  .object({
    id: idSchema,
    title: z.string().trim().min(1, '재사용 블록 이름을 입력해 주세요.').max(160),
    description: textSchema.optional(),
    sectionRole: classSectionRoleSchema,
    apparatus: z.union([apparatusSchema, z.literal('mixed')]),
    level: levelSchema,
    items: z
      .array(reusableBlockItemSchema)
      .min(1, '재사용 블록에는 최소 1개 이상의 동작이 포함되어야 합니다.')
      .max(50),
    version: z.number().int().positive(),
    createdAt: textSchema,
    updatedAt: textSchema,
  })
  .passthrough();

export const sequenceSourceProvenanceSchema = z
  .object({
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
  })
  .passthrough();

export const classBlockSnapshotSchema = z
  .object({
    blockInstanceId: idSchema,
    sourceBlockId: idSchema,
    sourceBlockVersion: z.number().int().positive(),
    sourceBlockTitle: textSchema,
    detached: z.boolean(),
    stepIds: z.array(idSchema),
  })
  .passthrough();

export const humanCreationStoragePayloadSchema = z
  .object({
    format: z.literal('pilates-flow-human-creation-v1'),
    version: z.literal(1),
    exportedAt: textSchema,
    humanMovementDrafts: z.array(humanMovementDraftSchema).max(5000),
    reusableBlocks: z.array(reusableBlockSchema).max(2000).optional(),
  })
  .strict();
