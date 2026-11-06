import type { ApparatusType, ClassBlockCategory, PilatesExercise } from '../types/pilates';
import { exerciseRevision } from '../utils/exerciseReview';

/** Synthetic QA records only. This never reviews or changes a production catalog item. */
export function syntheticPlanningExercise(
  apparatus: ApparatusType,
  blockCategory: ClassBlockCategory,
  variant: 'alpha' | 'beta' = 'alpha',
  approve = true,
): PilatesExercise {
  const id = `qa-synthetic-${apparatus}-${blockCategory}-${variant}`;
  const exercise: PilatesExercise = {
    id,
    nameKo: `합성 QA ${apparatus} ${blockCategory} ${variant}`,
    nameEn: `Synthetic QA ${apparatus} ${blockCategory} ${variant}`,
    movementFamily: id,
    apparatus,
    requiredEquipment: [apparatus],
    props: ['none'],
    blockCategory,
    spinalPlanes: ['neutral'],
    bodyPosition: 'supine',
    level: '1.0',
    defaultDurationMin: 4,
    isUnilateral: blockCategory === 'lower-body',
    springs: '합성 QA 기구 메모 · 실제 수업용 아님',
    box: 'none',
    footbar: 'none',
    headrest: 'flat',
    targetMuscles: ['합성 QA 분류'],
    breathPattern: '합성 QA 호흡 메모 · 실제 수업용 아님',
    cues: ['합성 QA 첫 번째 큐 · 실제 수업용 아님', '합성 QA 두 번째 큐'],
    precautions: '합성 QA 테스트 자료이며 실제 동작이나 안전성을 설명하지 않습니다.',
    layers: { easy: '합성 QA 쉬운 메모', standard: '합성 QA 기본 메모', hard: '합성 QA 확장 메모' },
    youtube: {
      videoId: '',
      channelName: 'Synthetic QA fixture',
      videoTitle: '',
      startSec: 0,
      url: '',
    },
    favoriteTag: 'none',
    isCustom: true,
    createdAt: '2026-11-04T10:00:00.000Z',
  };
  if (!approve) return exercise;
  return {
    ...exercise,
    review: {
      status: 'approved',
      scope: 'planning-metadata',
      credentialVerified: false,
      reviewerAlias: 'Synthetic QA reviewer · test only',
      reviewedAt: '2026-11-04T10:00:00.000Z',
      revision: exerciseRevision(exercise),
    },
  };
}

const blocks: ClassBlockCategory[] = [
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
];
export const SYNTHETIC_APPROVED_EXERCISES = (['mat', 'reformer', 'chair'] as const).flatMap(
  (apparatus) =>
    blocks.flatMap((block) =>
      (['alpha', 'beta'] as const).map((variant) =>
        syntheticPlanningExercise(apparatus, block, variant),
      ),
    ),
);
