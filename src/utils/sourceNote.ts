import { z } from 'zod';
import { getEquipmentFamily } from '../data/equipmentCatalog';
import type { VerifiedPublicReference } from '../data/verifiedReferences';
import {
  categorySchema,
  equipmentSchema,
  levelSchema,
  propSchema,
  sourceReferenceSchema,
} from '../schemas/cloudBackupSchema';
import type { PilatesExercise } from '../types/pilates';

/** Every planning value is supplied by the instructor; source metadata supplies provenance only. */
export const SourceNoteInputSchema = z
  .object({
    nameKo: z.string().trim().min(2, '계획 동작 이름을 2자 이상 입력해 주세요.').max(160),
    durationMin: z
      .number()
      .finite()
      .min(0.5, '직접 계획한 시간을 0.5–20분 사이로 입력해 주세요.')
      .max(20),
    equipment: z
      .array(equipmentSchema)
      .min(1, '직접 확인한 기구를 선택해 주세요.')
      .max(8)
      .refine(
        (values) => new Set(values).size === values.length,
        '기구를 중복 선택할 수 없습니다.',
      ),
    props: z
      .array(propSchema)
      .min(1, '소도구를 선택하거나 소도구 없음을 선택해 주세요.')
      .max(14)
      .refine(
        (values) => new Set(values).size === values.length,
        '소도구를 중복 선택할 수 없습니다.',
      )
      .refine(
        (values) => !values.includes('none') || values.length === 1,
        '소도구 없음과 다른 소도구를 함께 선택할 수 없습니다.',
      ),
    cues: z
      .array(z.string().trim().min(1, '직접 작성한 큐를 입력해 주세요.').max(500))
      .min(1, '직접 작성한 큐를 한 개 이상 입력해 주세요.')
      .max(12),
    level: levelSchema,
    blockCategory: categorySchema,
    isUnilateral: z.boolean({ required_error: '양측·편측 수행 여부를 직접 선택해 주세요.' }),
    bodyPosition: z.enum([
      'supine',
      'prone',
      'side-lying',
      'seated',
      'kneeling',
      'standing',
      'quadruped',
    ]),
    precautions: z.string().trim().max(3000).optional(),
  })
  .strict();

export type SourceNoteInput = z.infer<typeof SourceNoteInputSchema>;

function createPlanningNote(planning: SourceNoteInput, kind: 'own' | 'source'): PilatesExercise {
  return {
    id: `ex-custom-${kind}-${crypto.randomUUID()}`,
    nameKo: planning.nameKo,
    nameEn: '',
    apparatus: getEquipmentFamily(planning.equipment[0])!,
    requiredEquipment: [...planning.equipment],
    props: [...planning.props],
    blockCategory: planning.blockCategory,
    spinalPlanes: [],
    bodyPosition: planning.bodyPosition,
    level: planning.level,
    defaultDurationMin: planning.durationMin,
    isUnilateral: planning.isUnilateral,
    springs: '',
    box: 'none',
    footbar: 'none',
    headrest: 'flat',
    targetMuscles: [],
    breathPattern: '',
    cues: [...planning.cues],
    precautions: planning.precautions ?? '',
    layers: { easy: '', standard: '', hard: '' },
    youtube: { videoId: '', channelName: '', videoTitle: '', url: '', startSec: 0 },
    favoriteTag: 'none',
    isCustom: true,
    createdAt: new Date().toISOString(),
  };
}

/** Creates an unreviewed instructor-entered movement without an external reference. */
export function createOwnPlanningNote(input: unknown): PilatesExercise {
  return createPlanningNote(SourceNoteInputSchema.parse(input), 'own');
}

/** Creates an unreviewed personal note without copying source instructions or observed timing. */
export function createSourcePlanningNote(
  reference: VerifiedPublicReference,
  input: unknown,
): PilatesExercise {
  const planning = SourceNoteInputSchema.parse(input);
  const sourceReference = sourceReferenceSchema.parse({
    referenceId: reference.id,
    url: reference.url,
    title: reference.title,
    publisher: reference.sourceName,
    region: reference.region,
    verificationStatus: reference.verificationStatus,
    verifiedAt: reference.verifiedAt,
    rights: reference.rights,
    rawLedgerFile: reference.rawLedgerFile,
    rawItemId: reference.rawItemId,
  });
  return { ...createPlanningNote(planning, 'source'), sourceReference };
}
