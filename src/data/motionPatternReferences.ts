import { BATCH_VARIANTS } from './motionAuthoringBatch';
import batchIntegrity from './motionAuthoringBatchIntegrity.json';
import { MOTION_DRAFT_COMPARISONS } from './motionDraftIndex';
import { MOTION_DRAFTS } from './motionDrafts';
import { SUPINE_REACH_DEFINITION } from './supineReach';
import type { MotionDraftDefinition } from './motionDrafts';
import type { BatchVariantId } from '../models/motionAuthoringBatch';
import type { MotionDraftId } from '../models/types';
import { SUPINE_REACH_MODEL_VERSION } from '../models/supineReach';

interface PatternReferenceBase {
  readonly intendedExerciseIds: readonly string[];
  readonly title: string;
  readonly variant: string;
  readonly context: string;
  readonly equipment: readonly string[];
  readonly relation: 'pattern-reference';
  readonly exactCanonicalMatch: false;
  readonly professionalReviewStatus: 'unreviewed';
  readonly professionalReviewCount: 0;
  readonly assetStatus: 'authored-unreviewed-draft';
  readonly autoRecommendationEligible: false;
  /** Unknown for older drafts; the value never implies a review or verified teaching asset. */
  readonly assetVersion: string | null;
  readonly assetSha256: string | null;
}

export type MotionPatternReference = PatternReferenceBase &
  (
    | {
        readonly family: 'existing-proposal';
        readonly variantId: MotionDraftId;
        readonly definition: MotionDraftDefinition;
      }
    | {
        readonly family: 'authoring-batch';
        readonly variantId: BatchVariantId;
        readonly definition: (typeof BATCH_VARIANTS)[number];
      }
    | {
        readonly family: 'supine-reach';
        readonly variantId: typeof SUPINE_REACH_DEFINITION.id;
        readonly definition: typeof SUPINE_REACH_DEFINITION;
      }
  );

const boundaries = {
  relation: 'pattern-reference',
  exactCanonicalMatch: false,
  professionalReviewStatus: 'unreviewed',
  professionalReviewCount: 0,
  assetStatus: 'authored-unreviewed-draft',
  autoRecommendationEligible: false,
} as const;

const EQUIPMENT: Readonly<Record<MotionDraftId, readonly string[]>> = {
  'supported-heel-raise': ['일반 고정 의자 지지'],
  'side-lying-clam': ['매트', '머리 베개'],
  'adult-supine-heel-slide': ['매트'],
  'supine-knee-fold': ['매트'],
  'side-lying-straight-leg-lift': ['매트', '머리 지지'],
  'side-lying-open-book': ['매트', '머리 베개'],
  'quadruped-arm-slide': ['매트'],
  'quadruped-leg-slide': ['매트'],
  'reformer-parallel-footwork': ['리포머', '풋바 · 표준 스프링 대조 확인'],
  'chair-seated-pedal-press': ['필라테스 체어', '표준 스프링 대조 확인'],
  'reformer-supine-strap-arm-press': ['리포머', '스트랩', '발목 사이 볼 · 표준 소도구 확인'],
  'cadillac-supine-arm-spring-press': ['캐딜락', '암 스프링 · 표준 설정 대조 확인'],
  'ladder-supported-hip-extension-slide': ['래더바렐 지지 · 저작 적응'],
  'ladder-supported-side-leg-slide': ['래더바렐 지지 · 저작 적응'],
  'floor-seated-band-row': ['매트', '긴 탄성밴드'],
  'supine-chest-lift': ['매트'],
  'articulated-pelvic-curl': ['매트'],
};

/** Discovery only. This registry never supplies a canonical exercise asset or a review grant. */
export const MOTION_PATTERN_REFERENCES: readonly MotionPatternReference[] = Object.freeze([
  ...MOTION_DRAFTS.map((definition): MotionPatternReference => {
    const comparison = MOTION_DRAFT_COMPARISONS.find((item) => item.id === definition.id);
    if (!comparison || comparison.intendedExerciseId !== definition.intendedExerciseId)
      throw new Error(`Missing explicit draft comparison: ${definition.id}`);
    return Object.freeze({
      ...boundaries,
      family: 'existing-proposal',
      variantId: definition.id,
      intendedExerciseIds: Object.freeze([comparison.intendedExerciseId]),
      title: definition.title,
      variant: definition.variant,
      context:
        definition.sources.find((source) => source.context)?.context ??
        '공개 자료의 움직임 패턴을 참고한 저작 도해입니다. 일반 성인 수업 적합성은 검토 전입니다.',
      equipment: EQUIPMENT[definition.id],
      assetVersion: null,
      assetSha256: null,
      definition,
    });
  }),
  ...BATCH_VARIANTS.map((definition): MotionPatternReference => {
    const integrity = batchIntegrity.assets.find((asset) => asset.variantId === definition.id);
    if (!integrity) throw new Error(`Missing authored batch fingerprint: ${definition.id}`);
    return Object.freeze({
      ...boundaries,
      family: 'authoring-batch',
      variantId: definition.id,
      intendedExerciseIds: Object.freeze([definition.intendedExerciseId]),
      title: definition.title,
      variant: definition.variant,
      context: definition.sources[0].context,
      equipment: definition.rig === 'ordinary-chair' ? ['일반 고정 의자'] : ['매트'],
      assetVersion: integrity.modelVersion,
      assetSha256: integrity.assetSha256,
      definition,
    });
  }),
  Object.freeze({
    ...boundaries,
    family: 'supine-reach',
    variantId: SUPINE_REACH_DEFINITION.id,
    intendedExerciseIds: Object.freeze([SUPINE_REACH_DEFINITION.intendedExerciseId]),
    title: SUPINE_REACH_DEFINITION.title,
    variant: SUPINE_REACH_DEFINITION.variant,
    context:
      SUPINE_REACH_DEFINITION.sources.find((source) => source.context)?.context ??
      '출처와 저작 범위를 확인할 미검토 관련 패턴 도해입니다.',
    equipment: Object.freeze(['매트']),
    assetVersion: SUPINE_REACH_MODEL_VERSION,
    assetSha256: null,
    definition: SUPINE_REACH_DEFINITION,
  }),
]);

/** An explicit related pattern is not an exact exercise match. Unknown IDs have no fallback. */
export function getMotionPatternReferences(exerciseId: string): readonly MotionPatternReference[] {
  return MOTION_PATTERN_REFERENCES.filter((reference) =>
    reference.intendedExerciseIds.includes(exerciseId),
  );
}
