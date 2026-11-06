import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import {
  apparatusSchema,
  categorySchema,
  exerciseSchema,
  layerSchema,
  levelSchema,
  propSchema,
  stepSchema,
  textSchema,
} from '../schemas/cloudBackupSchema';
import type { P1ReusableBlockContract } from '../types/freeAiAssistant';
import type { ConditionTemplate, PilatesExercise } from '../types/pilates';
import { exerciseRevision, getExerciseReviewState, isExerciseAutoEligible } from './exerciseReview';
import {
  UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER,
  applyUserEditsToClassDraft,
  applyUserEditsToMovementIdea,
  applyUserEditsToSequenceCompose,
  buildLocalClassDraft,
  buildLocalMovementIdea,
  composeSequenceFromReviewedItems,
  editableStepsToSequenceSteps,
  movementIdeaToUnreviewedExercise,
} from './freeAiAssistantEngine';

const bodyPositionSchema = z.enum([
  'supine',
  'prone',
  'side-lying',
  'seated',
  'kneeling',
  'standing',
  'quadruped',
]);
const spinalPlaneSchema = z.enum(['flexion', 'extension', 'lateral', 'rotation', 'neutral']);
const strengthenAreaSchema = z.enum([
  'core',
  'glute-lower',
  'posture-upper',
  'mobility-rehab',
  'full-body',
]);

const editableDraftStepSchema = z.object({
  stepId: textSchema.min(1).max(120),
  order: z.number().int().nonnegative(),
  exerciseId: textSchema.min(1).max(120),
  nameKo: textSchema.min(1).max(160),
  nameEn: textSchema.max(160),
  apparatus: apparatusSchema,
  blockCategory: categorySchema,
  durationMin: z.number().finite().min(0.5).max(60),
  selectedLayer: layerSchema,
  instructorNote: textSchema.max(500),
  isReviewed: z.literal(true),
  sourceBlockId: textSchema.max(120).optional(),
});

const editableClassDraftResultSchema = z.object({
  kind: z.literal('class-draft'),
  source: z.enum(['external-free-ai', 'local-rule-engine']),
  provider: z.enum(['gemini-free', 'openrouter-free', 'none']),
  model: z.string().nullable(),
  cached: z.boolean(),
  title: textSchema.min(1).max(150),
  subtitle: textSchema.max(240),
  targetMinutes: z.number().int().min(10).max(120),
  level: levelSchema,
  apparatus: z.union([apparatusSchema, z.literal('mixed')]),
  focusPreset: z.enum([
    'full-body',
    'core-sculpt',
    'glute-lower',
    'posture-upper',
    'mobility-rehab',
  ]),
  strengthenAreas: z.array(strengthenAreaSchema).min(1).max(5),
  coachingSummary: textSchema.max(1000),
  steps: z.array(editableDraftStepSchema).max(40),
  guaranteesSafetyOrEffect: z.literal(false),
  safetyDisclaimer: textSchema.min(10),
});

const editableMovementIdeaResultSchema = z.object({
  kind: z.literal('movement-idea'),
  source: z.enum(['external-free-ai', 'local-rule-engine']),
  provider: z.enum(['gemini-free', 'openrouter-free', 'none']),
  model: z.string().nullable(),
  cached: z.boolean(),
  nameKo: textSchema.min(2).max(160),
  nameEn: textSchema.max(160),
  apparatus: apparatusSchema,
  blockCategory: categorySchema,
  level: levelSchema,
  bodyPosition: bodyPositionSchema,
  spinalPlanes: z.array(spinalPlaneSchema).min(1).max(5),
  props: z.array(propSchema).min(1).max(10),
  defaultDurationMin: z.number().finite().min(0.5).max(20),
  springs: textSchema.max(240),
  targetMuscles: z.array(textSchema.max(120)).min(1).max(12),
  breathPattern: textSchema.max(500),
  cues: z.array(textSchema.min(1).max(300)).min(1).max(10),
  precautions: textSchema.min(2).max(500),
  layers: z.object({
    easy: textSchema.min(2).max(400),
    standard: textSchema.min(2).max(400),
    hard: textSchema.min(2).max(400),
  }),
  variationRationale: textSchema.max(600),
  reviewStatus: z.literal('unreviewed-creative'),
  guaranteesSafetyOrEffect: z.literal(false),
  safetyDisclaimer: textSchema.min(10),
});

const editableSequenceComposeResultSchema = z.object({
  kind: z.literal('sequence-compose'),
  source: z.enum(['external-free-ai', 'local-rule-engine']),
  provider: z.enum(['gemini-free', 'openrouter-free', 'none']),
  model: z.string().nullable(),
  cached: z.boolean(),
  title: textSchema.min(1).max(150),
  subtitle: textSchema.max(240),
  targetMinutes: z.number().int().min(10).max(120),
  level: levelSchema,
  apparatus: z.union([apparatusSchema, z.literal('mixed')]),
  steps: z.array(editableDraftStepSchema).max(40),
  excludedUnreviewedIds: z.array(textSchema.max(120)).max(100),
  transitionSummary: textSchema.max(1000),
  guaranteesSafetyOrEffect: z.literal(false),
  safetyDisclaimer: textSchema.min(10),
});

function makeApprovedExercise(base: PilatesExercise): PilatesExercise {
  const withoutReview: PilatesExercise = {
    ...base,
    requiredEquipment: base.requiredEquipment ?? [base.apparatus],
    review: undefined,
  };
  const revision = exerciseRevision(withoutReview);
  return {
    ...withoutReview,
    review: {
      status: 'approved',
      reviewerAlias: '수석강사_테스트',
      reviewedAt: '2026-11-01T09:00:00.000Z',
      revision,
      scope: 'planning-metadata',
      credentialVerified: false,
    },
  };
}

function makeUnreviewedExercise(base: PilatesExercise, idSuffix = 'unreviewed'): PilatesExercise {
  return {
    ...base,
    id: `${base.id}-${idSuffix}`,
    nameKo: `[미검토] ${base.nameKo}`,
    review: undefined,
    isCustom: true,
  };
}

function makeStaleExercise(base: PilatesExercise, idSuffix = 'stale'): PilatesExercise {
  const approved = makeApprovedExercise({
    ...base,
    id: `${base.id}-${idSuffix}`,
  });
  return {
    ...approved,
    cues: [...approved.cues, '수정된 큐잉으로 인해 이전 승인이 만료됨'],
  };
}

const reformerBaseCatalog = INITIAL_EXERCISES.filter((ex) => ex.apparatus === 'reformer');
const approvedReformerCatalog = reformerBaseCatalog.map(makeApprovedExercise);
const unreviewedReformerItem = makeUnreviewedExercise(reformerBaseCatalog[0], 'custom-unrev');
const staleReformerItem = makeStaleExercise(reformerBaseCatalog[1], 'custom-stale');
const mixedCatalog: PilatesExercise[] = [
  ...approvedReformerCatalog,
  unreviewedReformerItem,
  staleReformerItem,
];

describe('freeAiAssistantEngine', () => {
  describe('buildLocalClassDraft', () => {
    it('builds a valid class draft strictly from reviewed exercises and never includes unreviewed or stale exercises', () => {
      expect(isExerciseAutoEligible(unreviewedReformerItem)).toBe(false);
      expect(isExerciseAutoEligible(staleReformerItem)).toBe(false);

      const draft = buildLocalClassDraft(
        {
          durationMinutes: 50,
          theme: '코어 안정화 & 둔근 연결 플로우',
          strengthenAreas: ['core', 'glute-lower'],
          level: '1.5',
          apparatus: 'reformer',
          tempo: 'moderate-flow',
        },
        mixedCatalog,
      );

      expect(draft.kind).toBe('class-draft');
      expect(draft.source).toBe('local-rule-engine');
      expect(draft.provider).toBe('none');
      expect(draft.model).toBeNull();
      expect(draft.cached).toBe(false);
      expect(draft.guaranteesSafetyOrEffect).toBe(false);
      expect(draft.safetyDisclaimer).toBe(UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER);

      const parsed = editableClassDraftResultSchema.safeParse(draft);
      expect(parsed.success).toBe(true);

      expect(draft.steps.length).toBeGreaterThan(0);
      const stepIds = draft.steps.map((s) => s.exerciseId);
      expect(stepIds).not.toContain(unreviewedReformerItem.id);
      expect(stepIds).not.toContain(staleReformerItem.id);

      for (const step of draft.steps) {
        expect(step.isReviewed).toBe(true);
        const sourceEx = mixedCatalog.find((ex) => ex.id === step.exerciseId);
        expect(sourceEx).toBeDefined();
        expect(isExerciseAutoEligible(sourceEx!)).toBe(true);
      }

      // Check warmup -> main -> cooldown ordering and exact duration sum
      expect(draft.steps[0].blockCategory).toBe('warmup');
      expect(draft.steps[draft.steps.length - 1].blockCategory).toBe('cooldown');
      const sumMinutes = draft.steps.reduce((acc, s) => acc + s.durationMin, 0);
      expect(sumMinutes).toBe(50);
    });

    it('merges ConditionTemplate defaults when templateId matches while respecting explicit user overrides', () => {
      const templates: ConditionTemplate[] = [
        {
          id: 'tpl-core-30',
          name: '점심 30분 코어 집중 템플릿',
          createdAt: '2026-11-01T00:00:00.000Z',
          criteria: {
            apparatus: 'reformer',
            availableEquipment: ['reformer'],
            level: '1.0',
            focusPreset: 'core-sculpt',
            preferredProps: ['mini-ball'],
            excludeDaysWindow: 7,
            targetMinutes: 30,
            defaultLayer: 'easy',
          },
        },
      ];

      const draft = buildLocalClassDraft(
        {
          durationMinutes: 40, // Explicit user override over template's 30
          theme: '', // Should fall back to template name
          strengthenAreas: ['glute-lower'],
          level: '1.5',
          apparatus: 'reformer',
          templateId: 'tpl-core-30',
        },
        approvedReformerCatalog,
        templates,
      );

      expect(draft.targetMinutes).toBe(40);
      expect(draft.title).toContain('점심 30분 코어 집중 템플릿');
      expect(draft.coachingSummary).toContain('점심 30분 코어 집중 템플릿');
      expect(draft.steps.every((s) => s.selectedLayer === 'easy')).toBe(true);
      expect(draft.steps.reduce((acc, s) => acc + s.durationMin, 0)).toBe(40);
    });

    it('returns an empty steps array when only unreviewed exercises exist for the requested apparatus', () => {
      const draft = buildLocalClassDraft(
        {
          durationMinutes: 30,
          theme: '미검토 카탈로그 테스트',
          strengthenAreas: ['core'],
          level: '1.0',
          apparatus: 'reformer',
        },
        [unreviewedReformerItem, staleReformerItem],
      );

      expect(draft.steps).toHaveLength(0);
      expect(draft.guaranteesSafetyOrEffect).toBe(false);
    });
  });

  describe('buildLocalMovementIdea', () => {
    it('organizes raw idea text into a structured EditableMovementIdeaResult with 3 cues and 3 layers', () => {
      const idea = buildLocalMovementIdea({
        rawIdeaText: '리포머 수파인에서 1R 1B 스프링으로 골반 중립을 유지하며 호흡과 함께 레그 프레스 변형',
        baseExerciseName: '풋워크 패럴렐',
        apparatus: 'reformer',
        blockCategory: 'footwork',
        strengthenArea: 'glute-lower',
        level: '1.5',
        bodyPosition: 'supine',
        spinalPlane: 'neutral',
        preferredProps: ['mini-ball'],
      });

      expect(idea.kind).toBe('movement-idea');
      expect(idea.source).toBe('local-rule-engine');
      expect(idea.provider).toBe('none');
      expect(idea.model).toBeNull();
      expect(idea.cached).toBe(false);
      expect(idea.springs).toBe('1R 1B');
      expect(idea.cues).toHaveLength(3);
      expect(idea.layers.easy.length).toBeGreaterThan(5);
      expect(idea.layers.standard.length).toBeGreaterThan(5);
      expect(idea.layers.hard.length).toBeGreaterThan(5);
      expect(idea.reviewStatus).toBe('unreviewed-creative');
      expect(idea.guaranteesSafetyOrEffect).toBe(false);
      expect(idea.safetyDisclaimer).toBe(UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER);

      const parsed = editableMovementIdeaResultSchema.safeParse(idea);
      expect(parsed.success).toBe(true);
    });

    it('sanitizes sensitive health and personal information (PHI/PII) via inspectSensitiveHealthText', () => {
      const idea = buildLocalMovementIdea({
        rawIdeaText: '허리 디스크 수술 환자 010-1234-5678 브릿지 분절 변형 아이디어',
        apparatus: 'mat',
        blockCategory: 'bridging',
        strengthenArea: 'mobility-rehab',
        level: '1.0',
      });

      expect(idea.nameKo).not.toContain('디스크');
      expect(idea.nameKo).not.toContain('010-1234-5678');
      expect(idea.cues.join(' ')).not.toContain('010-1234-5678');
      expect(idea.precautions).toContain('민감 건강·개인정보');
      expect(idea.springs).toBe('Bodyweight');
      expect(idea.reviewStatus).toBe('unreviewed-creative');
      expect(idea.guaranteesSafetyOrEffect).toBe(false);
    });
  });

  describe('composeSequenceFromReviewedItems', () => {
    it('includes only reviewed exercises and reviewed P1 blocks, excluding unreviewed/missing IDs into excludedUnreviewedIds', () => {
      const warmupEx = approvedReformerCatalog.find((ex) => ex.blockCategory === 'warmup')!;
      const coreEx = approvedReformerCatalog.find((ex) => ex.blockCategory === 'core')!;
      const cooldownEx = approvedReformerCatalog.find((ex) => ex.blockCategory === 'cooldown')!;

      const reviewedBlock: P1ReusableBlockContract = {
        id: 'block-reviewed-1',
        title: '검토 완료 코어 블록',
        apparatus: 'reformer',
        level: '1.5',
        category: 'core',
        durationMin: 10,
        isReviewed: true,
        steps: [
          {
            exerciseId: coreEx.id,
            blockCategory: 'core',
            durationMin: 6,
            selectedLayer: 'standard',
            instructorNote: '블록 내 코어 노트',
          },
          {
            // Unreviewed step inside a reviewed block must also be excluded
            exerciseId: unreviewedReformerItem.id,
            blockCategory: 'core',
            durationMin: 4,
            selectedLayer: 'easy',
          },
        ],
      };

      const unreviewedBlock: P1ReusableBlockContract = {
        id: 'block-unreviewed-2',
        title: '미검토 창작 블록',
        apparatus: 'reformer',
        level: '1.5',
        category: 'lower-body',
        durationMin: 8,
        isReviewed: false,
        steps: [
          {
            exerciseId: warmupEx.id,
            blockCategory: 'warmup',
            durationMin: 8,
            selectedLayer: 'standard',
          },
        ],
      };

      const result = composeSequenceFromReviewedItems(
        {
          targetMinutes: 30,
          level: '1.5',
          apparatus: 'reformer',
          theme: '검토된 블록 조합 시퀀스',
          strengthenAreas: ['core'],
          selectedExerciseIds: [
            cooldownEx.id,
            warmupEx.id,
            unreviewedReformerItem.id,
            staleReformerItem.id,
            'missing-exercise-id',
          ],
          selectedBlockIds: [reviewedBlock.id, unreviewedBlock.id, 'missing-block-id'],
        },
        mixedCatalog,
        [reviewedBlock, unreviewedBlock],
      );

      const parsed = editableSequenceComposeResultSchema.safeParse(result);
      expect(parsed.success).toBe(true);

      expect(result.excludedUnreviewedIds).toEqual(
        expect.arrayContaining([
          unreviewedBlock.id,
          'missing-block-id',
          unreviewedReformerItem.id,
          staleReformerItem.id,
          'missing-exercise-id',
        ]),
      );

      expect(result.steps).toHaveLength(3);
      expect(result.steps[0].exerciseId).toBe(warmupEx.id);
      expect(result.steps[1].exerciseId).toBe(coreEx.id);
      expect(result.steps[1].sourceBlockId).toBe(reviewedBlock.id);
      expect(result.steps[2].exerciseId).toBe(cooldownEx.id);

      const sumMin = result.steps.reduce((acc, s) => acc + s.durationMin, 0);
      expect(sumMin).toBe(30);
      expect(result.guaranteesSafetyOrEffect).toBe(false);
      expect(result.safetyDisclaimer).toBe(UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER);
    });
  });

  describe('User Editability & Conversion Helpers', () => {
    it('applyUserEditsToClassDraft allows editing metadata and steps while preserving safety disclaimers', () => {
      const draft = buildLocalClassDraft(
        {
          durationMinutes: 40,
          theme: '기본 플로우',
          strengthenAreas: ['core'],
          level: '1.0',
          apparatus: 'reformer',
        },
        approvedReformerCatalog,
      );

      const firstStep = draft.steps[0];
      const secondStep = draft.steps[1];

      const edited = applyUserEditsToClassDraft(draft, {
        title: '강사가 수정한 커스텀 수업 제목',
        subtitle: '수정된 부제',
        targetMinutes: 45,
        coachingSummary: '강사 코칭 요약 메모',
        removeStepIds: [firstStep.stepId],
        stepUpdates: [
          {
            stepId: secondStep.stepId,
            durationMin: 12,
            selectedLayer: 'hard',
            instructorNote: '스프링 1R로 변경하여 진행',
            blockCategory: 'core',
          },
        ],
      });

      expect(edited.title).toBe('강사가 수정한 커스텀 수업 제목');
      expect(edited.subtitle).toBe('수정된 부제');
      expect(edited.targetMinutes).toBe(45);
      expect(edited.coachingSummary).toBe('강사 코칭 요약 메모');
      expect(edited.steps.some((s) => s.stepId === firstStep.stepId)).toBe(false);

      const updatedSecond = edited.steps.find((s) => s.stepId === secondStep.stepId)!;
      expect(updatedSecond.durationMin).toBe(12);
      expect(updatedSecond.selectedLayer).toBe('hard');
      expect(updatedSecond.instructorNote).toBe('스프링 1R로 변경하여 진행');
      expect(updatedSecond.blockCategory).toBe('core');
      expect(updatedSecond.order).toBe(1);
      expect(edited.guaranteesSafetyOrEffect).toBe(false);
      expect(edited.safetyDisclaimer).toBe(UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER);
    });

    it('applyUserEditsToMovementIdea allows editing all fields while preserving unreviewed-creative status', () => {
      const idea = buildLocalMovementIdea({
        rawIdeaText: '체어 스탠딩 런지 밸런스 변형',
        apparatus: 'chair',
        blockCategory: 'lower-body',
        strengthenArea: 'glute-lower',
        level: '1.5',
      });

      const edited = applyUserEditsToMovementIdea(idea, {
        nameKo: '운다 체어 스탠딩 싱글 레그 프레스 변형',
        nameEn: 'Wunda Chair Standing Single Leg Press Variation',
        defaultDurationMin: 7,
        springs: '1R 1B',
        breathPattern: '내쉬는 숨에 페달을 끝까지 컨트롤하며 밀어냅니다.',
        cues: ['골반 수평 유지', '무릎 정렬 유지', '정수리 길게 신장'],
        precautions: '무릎 과신전 주의',
        layers: {
          easy: '양손 핸들 지지 후 가동 범위 50%',
          hard: '한 손 골반 터치 후 페달 바운스 3회',
        },
        variationRationale: '지지면 축소에 따른 중둔근 부하 단계화',
      });

      expect(edited.nameKo).toBe('운다 체어 스탠딩 싱글 레그 프레스 변형');
      expect(edited.defaultDurationMin).toBe(7);
      expect(edited.springs).toBe('1R 1B');
      expect(edited.layers.easy).toBe('양손 핸들 지지 후 가동 범위 50%');
      expect(edited.layers.standard).toBe(idea.layers.standard);
      expect(edited.layers.hard).toBe('한 손 골반 터치 후 페달 바운스 3회');
      expect(edited.reviewStatus).toBe('unreviewed-creative');
      expect(edited.guaranteesSafetyOrEffect).toBe(false);
      expect(edited.safetyDisclaimer).toBe(UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER);
    });

    it('applyUserEditsToSequenceCompose and editableStepsToSequenceSteps produce valid store SequenceSteps', () => {
      const warmupEx = approvedReformerCatalog.find((ex) => ex.blockCategory === 'warmup')!;
      const cooldownEx = approvedReformerCatalog.find((ex) => ex.blockCategory === 'cooldown')!;

      const composed = composeSequenceFromReviewedItems(
        {
          targetMinutes: 20,
          level: '1.0',
          apparatus: 'reformer',
          strengthenAreas: ['core'],
          selectedExerciseIds: [warmupEx.id, cooldownEx.id],
        },
        approvedReformerCatalog,
      );

      const reordered = applyUserEditsToSequenceCompose(composed, {
        title: '순서 조정 시퀀스',
        reorderStepIds: [composed.steps[1].stepId, composed.steps[0].stepId],
      });

      expect(reordered.title).toBe('순서 조정 시퀀스');
      expect(reordered.steps[0].exerciseId).toBe(cooldownEx.id);
      expect(reordered.steps[0].order).toBe(1);
      expect(reordered.steps[1].exerciseId).toBe(warmupEx.id);
      expect(reordered.steps[1].order).toBe(2);

      const sequenceSteps = editableStepsToSequenceSteps(reordered.steps);
      expect(sequenceSteps).toHaveLength(2);
      for (const step of sequenceSteps) {
        expect(stepSchema.safeParse(step).success).toBe(true);
      }
    });

    it('movementIdeaToUnreviewedExercise creates a custom unreviewed PilatesExercise that is NEVER auto-eligible', () => {
      const idea = buildLocalMovementIdea({
        rawIdeaText: '캐딜락 롤다운 바를 활용한 흉추 분절 및 코어 컨트롤',
        apparatus: 'cadillac',
        blockCategory: 'core',
        strengthenArea: 'core',
        level: '1.5',
      });

      const { exercise, ideaContract } = movementIdeaToUnreviewedExercise(
        idea,
        '캐딜락 롤다운 바를 활용한 흉추 분절 및 코어 컨트롤',
        'custom-idea-test-01',
        '2026-11-06T00:00:00.000Z',
      );

      expect(exercise.id).toBe('custom-idea-test-01');
      expect(exercise.isCustom).toBe(true);
      expect(exercise.review).toBeUndefined();
      expect(getExerciseReviewState(exercise)).toBe('pending');
      expect(isExerciseAutoEligible(exercise)).toBe(false);
      expect(exercise.precautions).toContain('미검토 창작 동작');
      expect(exercise.precautions).toContain(UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER);
      expect(exerciseSchema.safeParse(exercise).success).toBe(true);

      expect(ideaContract.id).toBe('custom-idea-test-01');
      expect(ideaContract.reviewStatus).toBe('unreviewed-creative');
      expect(ideaContract.guaranteesSafetyOrEffect).toBe(false);
      expect(ideaContract.safetyDisclaimer).toBe(UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER);
    });
  });
});
