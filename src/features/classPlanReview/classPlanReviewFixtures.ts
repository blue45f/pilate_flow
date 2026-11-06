import type { HumanMovementDraft, ReusableBlock } from '../../types/hierarchy';
import type { SavedSequence, SequenceStep } from '../../types/pilates';
import type {
  ClassPlanReviewOptions,
  NameOnlyCreativeDraftInput,
  NestedReviewContainerInput,
} from './classPlanReviewTypes';

export interface ClassPlanReviewFixturePreset {
  readonly id: string;
  readonly labelKo: string;
  readonly descriptionKo: string;
  readonly input: unknown;
  readonly options?: ClassPlanReviewOptions;
}

/**
 * 1. 30-Minute Normal Class Fixture (1800s total, balanced L/R, 1 rest step, 0 review warnings)
 * Strictly synthetic planning metadata only — no member, medical, or external URL/API data.
 */
export const SYNTHETIC_30MIN_NORMAL_CLASS_FIXTURE: SavedSequence = {
  id: 'seq-synthetic-30min-normal',
  title: '30분 리포머 기본 밸런스 수업',
  subtitle: '예열·본운동·휴식·마무리 30분 정합성 검증용 합성 시퀀스',
  apparatus: 'reformer',
  level: '1.5',
  focusTags: ['전신 호흡', '좌우 균형'],
  targetMinutes: 30,
  createdAt: '2026-04-10T09:00:00.000Z',
  updatedAt: '2026-04-10T09:00:00.000Z',
  taughtCount: 0,
  steps: [
    {
      stepId: 'step-30m-1-warmup',
      order: 1,
      classSection: 'preparation',
      blockCategory: 'warmup',
      exerciseId: 'ex-warmup-01',
      durationMin: 4,
      explanationSec: 20,
      transitionSec: 0,
      repetitions: 8,
      sets: 1,
      sideMode: 'together',
      selectedLayer: 'standard',
    },
    {
      stepId: 'step-30m-2-footwork',
      order: 2,
      classSection: 'main',
      blockCategory: 'footwork',
      exerciseId: 'ex-footwork-01',
      durationMin: 6,
      explanationSec: 20,
      transitionSec: 15,
      repetitions: 10,
      sets: 2,
      sideMode: 'together',
      selectedLayer: 'standard',
    },
    {
      stepId: 'step-30m-3-core',
      order: 3,
      classSection: 'main',
      blockCategory: 'core',
      exerciseId: 'ex-core-01',
      durationMin: 5,
      explanationSec: 20,
      transitionSec: 20,
      repetitions: 10,
      sets: 1,
      sideMode: 'together',
      selectedLayer: 'standard',
    },
    {
      stepId: 'step-30m-4-scooter-left',
      order: 4,
      classSection: 'main',
      blockCategory: 'lower-body',
      exerciseId: 'ex-lower-01',
      durationMin: 4,
      explanationSec: 15,
      transitionSec: 25,
      repetitions: 10,
      sets: 2,
      sideMode: 'left',
      selectedLayer: 'standard',
    },
    {
      stepId: 'step-30m-5-scooter-right',
      order: 5,
      classSection: 'main',
      blockCategory: 'lower-body',
      exerciseId: 'ex-lower-01',
      durationMin: 4,
      explanationSec: 15,
      transitionSec: 25,
      repetitions: 10,
      sets: 2,
      sideMode: 'right',
      selectedLayer: 'standard',
    },
    {
      kind: 'rest',
      stepId: 'step-30m-6-rest',
      order: 6,
      blockCategory: 'core',
      exerciseId: '',
      durationMin: 2,
      selectedLayer: 'standard',
      instructorNote: '수분 보충 및 호흡 정리',
    },
    {
      stepId: 'step-30m-7-upper-both',
      order: 7,
      classSection: 'main',
      blockCategory: 'upper-body',
      exerciseId: 'ex-upper-01',
      durationMin: 3,
      explanationSec: 20,
      transitionSec: 20,
      repetitions: 8,
      sets: 1,
      sideMode: 'left-then-right',
      selectedLayer: 'standard',
    },
    {
      stepId: 'step-30m-8-cooldown',
      order: 8,
      classSection: 'cooldown',
      blockCategory: 'cooldown',
      exerciseId: 'ex-cooldown-01',
      durationMin: 2,
      explanationSec: 10,
      transitionSec: 20,
      repetitions: 4,
      sets: 1,
      sideMode: 'left-then-right',
      selectedLayer: 'standard',
    },
  ],
};

/**
 * 2. 50-Minute Normal Class Fixture (3000s total, balanced L/R, 1 rest step, 0 review warnings)
 */
export const SYNTHETIC_50MIN_NORMAL_CLASS_FIXTURE: SavedSequence = {
  id: 'seq-synthetic-50min-normal',
  title: '50분 리포머 정규 시퀀스 수업',
  subtitle: '예열·풋워크·브릿징·코어·상하체·플랭크·스트랩·쿨다운 50분 표준 구성',
  apparatus: 'reformer',
  level: '1.5',
  focusTags: ['전신 흐름', '코어 제어', '좌우 대칭'],
  targetMinutes: 50,
  createdAt: '2026-04-10T10:00:00.000Z',
  updatedAt: '2026-04-10T10:00:00.000Z',
  taughtCount: 0,
  steps: [
    {
      stepId: 'step-50m-1-warmup',
      order: 1,
      classSection: 'preparation',
      blockCategory: 'warmup',
      exerciseId: 'ex-warmup-01',
      durationMin: 4,
      explanationSec: 20,
      transitionSec: 0,
      repetitions: 8,
      sets: 1,
      sideMode: 'together',
      selectedLayer: 'standard',
    },
    {
      stepId: 'step-50m-2-footwork',
      order: 2,
      classSection: 'main',
      blockCategory: 'footwork',
      exerciseId: 'ex-footwork-01',
      durationMin: 6,
      explanationSec: 20,
      transitionSec: 20,
      repetitions: 10,
      sets: 2,
      sideMode: 'together',
      selectedLayer: 'standard',
    },
    {
      stepId: 'step-50m-3-bridging',
      order: 3,
      classSection: 'main',
      blockCategory: 'bridging',
      exerciseId: 'ex-bridging-01',
      durationMin: 5,
      explanationSec: 20,
      transitionSec: 20,
      repetitions: 6,
      sets: 2,
      sideMode: 'together',
      selectedLayer: 'standard',
    },
    {
      stepId: 'step-50m-4-core',
      order: 4,
      classSection: 'main',
      blockCategory: 'core',
      exerciseId: 'ex-core-01',
      durationMin: 6,
      explanationSec: 20,
      transitionSec: 20,
      repetitions: 10,
      sets: 1,
      sideMode: 'together',
      selectedLayer: 'standard',
    },
    {
      stepId: 'step-50m-5-upper',
      order: 5,
      classSection: 'main',
      blockCategory: 'upper-body',
      exerciseId: 'ex-upper-01',
      durationMin: 6,
      explanationSec: 20,
      transitionSec: 20,
      repetitions: 8,
      sets: 2,
      sideMode: 'left-then-right',
      selectedLayer: 'standard',
    },
    {
      kind: 'rest',
      stepId: 'step-50m-6-rest',
      order: 6,
      blockCategory: 'core',
      exerciseId: '',
      durationMin: 2,
      selectedLayer: 'standard',
      instructorNote: '중간 호흡 정리 및 스프링 점검',
    },
    {
      stepId: 'step-50m-7-lower-left',
      order: 7,
      classSection: 'main',
      blockCategory: 'lower-body',
      exerciseId: 'ex-lower-01',
      durationMin: 4,
      explanationSec: 15,
      transitionSec: 25,
      repetitions: 10,
      sets: 2,
      sideMode: 'left',
      selectedLayer: 'standard',
    },
    {
      stepId: 'step-50m-8-lower-right',
      order: 8,
      classSection: 'main',
      blockCategory: 'lower-body',
      exerciseId: 'ex-lower-01',
      durationMin: 4,
      explanationSec: 15,
      transitionSec: 25,
      repetitions: 10,
      sets: 2,
      sideMode: 'right',
      selectedLayer: 'standard',
    },
    {
      stepId: 'step-50m-9-plank',
      order: 9,
      classSection: 'main',
      blockCategory: 'plank',
      exerciseId: 'ex-plank-01',
      durationMin: 4,
      explanationSec: 15,
      transitionSec: 25,
      repetitions: 6,
      sets: 2,
      sideMode: 'together',
      selectedLayer: 'standard',
    },
    {
      stepId: 'step-50m-10-straps',
      order: 10,
      classSection: 'main',
      blockCategory: 'feet-in-straps',
      exerciseId: 'ex-straps-01',
      durationMin: 5,
      explanationSec: 20,
      transitionSec: 20,
      repetitions: 8,
      sets: 2,
      sideMode: 'together',
      selectedLayer: 'standard',
    },
    {
      stepId: 'step-50m-11-cooldown',
      order: 11,
      classSection: 'cooldown',
      blockCategory: 'cooldown',
      exerciseId: 'ex-cooldown-01',
      durationMin: 4,
      explanationSec: 15,
      transitionSec: 25,
      repetitions: 4,
      sets: 1,
      sideMode: 'left-then-right',
      selectedLayer: 'standard',
    },
  ],
};

/**
 * 3. Mixed Rest, Repetitions/Sets, Bilateral/Split Side Imbalance & Unspecified Time Fixture
 * Tests:
 * - No double-counting of repetitions, sets, explanationSec, transitionSec, or left-then-right
 * - Rest step included once in known total
 * - Unpaired split left step (`step-mix-4-unpaired-left`)
 * - Split left/right pair with unequal duration (4m vs 2m) and unequal reps (8 vs 12)
 * - Unilateral catalog exercise set to `sideMode: 'together'` (`step-mix-7-unilateral-together`)
 * - 2 items with `durationMin: undefined` (`step-mix-8-unspec-1`, `step-mix-9-unspec-2`) never faked as 0s
 */
export const SYNTHETIC_MIXED_REST_SIDE_UNSPECIFIED_FIXTURE = {
  id: 'seq-synthetic-mixed-review',
  title: '휴식·반복·좌우 편차·시간 미정 혼합 수업안',
  subtitle: '중복 합산 방지, 좌우 비대칭 감지, 미입력 시간 분리 표기 검증용',
  apparatus: 'reformer' as const,
  level: '1.5' as const,
  targetMinutes: 50,
  steps: [
    {
      stepId: 'step-mix-1-warmup',
      order: 1,
      classSection: 'preparation',
      blockCategory: 'warmup',
      exerciseId: 'ex-warmup-01',
      durationMin: 4,
      explanationSec: 30,
      transitionSec: 15,
      repetitions: 8,
      sets: 2,
      sideMode: 'together',
      selectedLayer: 'standard',
    },
    {
      stepId: 'step-mix-2-seq-both',
      order: 2,
      classSection: 'main',
      blockCategory: 'upper-body',
      exerciseId: 'ex-upper-01',
      durationMin: 6,
      explanationSec: 20,
      transitionSec: 20,
      repetitions: 10,
      sets: 3,
      sideMode: 'left-then-right',
      selectedLayer: 'standard',
    },
    {
      kind: 'rest' as const,
      stepId: 'step-mix-3-rest',
      order: 3,
      blockCategory: 'core',
      exerciseId: '',
      durationMin: 3,
      selectedLayer: 'standard',
      instructorNote: '중간 휴식 3분',
    },
    {
      stepId: 'step-mix-4-unpaired-left',
      order: 4,
      classSection: 'main',
      blockCategory: 'lower-body',
      exerciseId: 'ex-lower-01',
      durationMin: 5,
      explanationSec: 15,
      transitionSec: 20,
      repetitions: 10,
      sets: 2,
      sideMode: 'left',
      selectedLayer: 'standard',
    },
    {
      stepId: 'step-mix-5-imbal-left',
      order: 5,
      classSection: 'main',
      blockCategory: 'lower-body',
      exerciseId: 'ex-lower-02',
      durationMin: 4,
      explanationSec: 15,
      transitionSec: 20,
      repetitions: 8,
      sets: 2,
      sideMode: 'left',
      selectedLayer: 'standard',
    },
    {
      stepId: 'step-mix-6-imbal-right',
      order: 6,
      classSection: 'main',
      blockCategory: 'lower-body',
      exerciseId: 'ex-lower-02',
      durationMin: 2,
      explanationSec: 15,
      transitionSec: 20,
      repetitions: 12,
      sets: 2,
      sideMode: 'right',
      selectedLayer: 'standard',
    },
    {
      stepId: 'step-mix-7-unilateral-together',
      order: 7,
      classSection: 'cooldown',
      blockCategory: 'cooldown',
      exerciseId: 'ex-cooldown-01',
      durationMin: 3,
      explanationSec: 10,
      transitionSec: 20,
      repetitions: 4,
      sets: 1,
      sideMode: 'together',
      selectedLayer: 'standard',
    },
    {
      stepId: 'step-mix-8-unspec-1',
      order: 8,
      classSection: 'main',
      blockCategory: 'core',
      exerciseId: 'ex-core-01',
      durationMin: undefined,
      repetitions: 8,
      sets: 2,
      sideMode: 'together',
      selectedLayer: 'standard',
    },
    {
      stepId: 'step-mix-9-unspec-2',
      order: 9,
      nameKo: '강사 창작 흉추 서클 초안 (시간 미정)',
      durationMin: undefined,
      repetitions: 6,
      sets: 1,
    },
  ],
};

/**
 * Minimal HumanMovementDraft records with only ideaLine (no anatomy, no classification, no health data).
 */
export const SYNTHETIC_MINIMAL_HUMAN_DRAFTS: readonly HumanMovementDraft[] = [
  {
    id: 'hd-minimal-1',
    sourceOrigin: 'human-created',
    completenessStage: 'idea-only',
    ideaLine: '미니볼 끼고 흉곽 호흡 서클 연습',
    revision: 1,
    revisionHistory: [],
    feelLogs: [],
    modificationLogs: [],
    photoReferences: [],
    safetyBoundary: {
      originType: 'instructor-created-draft',
      evaluationBasis: 'subjective-instructor-feel',
      aiSafetyGuaranteed: false,
      objectiveEfficacyClaimed: false,
      expertVerified: false,
      disclaimerKo:
        '강사가 직접 작성한 수업 아이디어 메모이며 의학적 처방이나 안전 보증이 아닙니다.',
    },
    createdAt: '2026-04-10T08:00:00.000Z',
    updatedAt: '2026-04-10T08:00:00.000Z',
  },
];

/**
 * 4. Name-Only Creative Movement Draft Fixture
 * Reviews cleanly even when blockCategory, spinalPlanes, targetMuscles, bodyPosition, precautions,
 * apparatus, durationMin, and sideMode are omitted.
 */
export const SYNTHETIC_NAME_ONLY_DRAFT_FIXTURE: {
  readonly id: string;
  readonly title: string;
  readonly targetMinutes: number;
  readonly items: readonly NameOnlyCreativeDraftInput[];
  readonly humanDrafts: readonly HumanMovementDraft[];
} = {
  id: 'seq-synthetic-name-only-drafts',
  title: '이름만 있는 새 동작 초안 포함 수업안',
  targetMinutes: 20,
  humanDrafts: SYNTHETIC_MINIMAL_HUMAN_DRAFTS,
  items: [
    {
      stepId: 'draft-step-1',
      nameKo: '갈비뼈 호흡 서클 초안',
    },
    {
      stepId: 'draft-step-2',
      ideaLine: '스트랩 잡고 한쪽 다리 롱 서클',
      durationMin: 5,
    },
    {
      stepId: 'draft-step-3',
      workingNameKo: '사이드 밴드 리치 변형',
      durationMin: 6,
      sideMode: 'left-then-right',
      repetitions: 6,
      sets: 2,
    },
    {
      stepId: 'draft-step-4',
      humanDraftId: 'hd-minimal-1',
      durationMin: 4,
    },
    {
      stepId: 'draft-step-5-catalog',
      exerciseId: 'ex-cooldown-02',
      durationMin: 5,
      sideMode: 'together',
    },
  ],
};

/**
 * 5. Empty Class Plan Fixture
 */
export const SYNTHETIC_EMPTY_CLASS_FIXTURE: SavedSequence = {
  id: 'seq-synthetic-empty',
  title: '빈 수업 시퀀스 (동작 없음)',
  subtitle: '빈 시퀀스 안내 검증용',
  apparatus: 'reformer',
  level: '1.0',
  focusTags: [],
  targetMinutes: 50,
  createdAt: '2026-04-10T11:00:00.000Z',
  updatedAt: '2026-04-10T11:00:00.000Z',
  taughtCount: 0,
  steps: [],
};

/**
 * 6. Reusable Block Fixture
 */
export const SYNTHETIC_REUSABLE_BLOCK_FIXTURE: ReusableBlock = {
  id: 'block-synthetic-warmup-core',
  title: '오프닝 예열 & 코어 재사용 블록 (15분)',
  description: '수업 도입부 호흡 세팅과 코어 활성화 블록',
  sectionRole: 'preparation',
  apparatus: 'reformer',
  level: '1.5',
  version: 1,
  createdAt: '2026-04-10T09:30:00.000Z',
  updatedAt: '2026-04-10T09:30:00.000Z',
  items: [
    {
      itemId: 'block-item-1',
      order: 1,
      exerciseId: 'ex-warmup-01',
      blockCategory: 'warmup',
      durationMin: 4,
      explanationSec: 20,
      transitionSec: 10,
      repetitions: 8,
      sets: 1,
      sideMode: 'together',
      selectedLayer: 'standard',
    },
    {
      itemId: 'block-item-2',
      order: 2,
      exerciseId: 'ex-footwork-01',
      blockCategory: 'footwork',
      durationMin: 6,
      explanationSec: 20,
      transitionSec: 15,
      repetitions: 10,
      sets: 2,
      sideMode: 'together',
      selectedLayer: 'standard',
    },
    {
      itemId: 'block-item-3',
      order: 3,
      exerciseId: 'ex-core-01',
      blockCategory: 'core',
      durationMin: 5,
      explanationSec: 20,
      transitionSec: 15,
      repetitions: 10,
      sets: 1,
      sideMode: 'together',
      selectedLayer: 'standard',
    },
  ],
};

/**
 * 7. Corrupted & Out-of-Bounds Input Fixture
 * Contains negative/NaN/Infinity/0/excessive durationMin, invalid repetitions & sets,
 * invalid targetMinutes, duplicate/missing stepIds, invalid sideMode, and malformed items.
 */
export const SYNTHETIC_CORRUPTED_INPUT_FIXTURE = {
  id: 'seq-synthetic-corrupted',
  title: '손상·이상값 입력 진단 테스트 수업안',
  targetMinutes: -30,
  steps: [
    {
      stepId: 'dup-step-id',
      order: 1,
      exerciseId: 'ex-warmup-01',
      durationMin: -3,
      repetitions: -5,
      sets: 0,
      sideMode: 'together',
    },
    {
      stepId: 'dup-step-id',
      order: 2,
      exerciseId: 'ex-footwork-01',
      durationMin: Number.NaN,
      repetitions: 2.5,
      sets: Number.POSITIVE_INFINITY,
      sideMode: 'invalid-side-value',
    },
    {
      stepId: '',
      order: 3,
      exerciseId: 'ex-core-01',
      durationMin: Number.POSITIVE_INFINITY,
      repetitions: 5000,
      sets: 500,
      explanationSec: -20,
      transitionSec: 99999,
    },
    {
      stepId: 'corrupt-zero-duration',
      order: 4,
      exerciseId: 'ex-upper-01',
      durationMin: 0,
      repetitions: 0,
      sets: -1,
    },
    {
      stepId: 'corrupt-excessive-duration',
      order: 5,
      exerciseId: 'ex-lower-01',
      durationMin: 999,
      sideMode: 'left',
    },
    {
      kind: 'rest',
      stepId: 'corrupt-rest-negative',
      order: 6,
      exerciseId: '',
      durationMin: -2,
    },
    {
      stepId: 'corrupt-unknown-catalog',
      order: 7,
      exerciseId: 'ex-nonexistent-catalog-999',
      durationMin: 4,
      sideMode: 'together',
    },
    null,
    'malformed-primitive-step',
  ],
};

/**
 * Builds a deeply nested container structure of arbitrary depth (e.g. > MAX_NESTING_DEPTH = 16).
 */
export function createDeeplyNestedReviewFixture(depth = 22): NestedReviewContainerInput {
  let current: NestedReviewContainerInput = {
    id: `nested-leaf-${depth}`,
    title: `깊이 ${depth} 블록`,
    items: [
      {
        stepId: `deep-leaf-step-${depth}`,
        nameKo: '깊은 중첩 내부 동작 초안',
        durationMin: 3,
      },
    ],
  };

  for (let level = depth - 1; level >= 1; level -= 1) {
    current = {
      id: `nested-block-${level}`,
      title: `중첩 컨테이너 레벨 ${level}`,
      items: [
        {
          stepId: `step-at-depth-${level}`,
          exerciseId: 'ex-warmup-01',
          durationMin: 2,
          sideMode: 'together',
        },
      ],
      blocks: [current],
    };
  }

  return {
    id: 'nested-root-plan',
    title: `깊은 중첩 구조 진단 (${depth}단계)`,
    blocks: [current],
  };
}

/**
 * Builds an input object containing a circular container reference (`root -> childBlock -> blocks: [root]`).
 */
export function createCircularReviewFixture(): Record<string, unknown> {
  const root: Record<string, unknown> = {
    id: 'circular-plan-root',
    title: '순환 참조 구조 진단 픽스처',
    targetMinutes: 30,
    steps: [
      {
        stepId: 'circular-valid-step-1',
        exerciseId: 'ex-warmup-01',
        durationMin: 4,
        sideMode: 'together',
      },
    ],
    blocks: [],
  };

  const childBlock: Record<string, unknown> = {
    id: 'circular-child-block',
    title: '순환 참조 하위 블록',
    items: [
      {
        stepId: 'circular-valid-step-2',
        nameKo: '순환 블록 내부 창작 동작',
        durationMin: 5,
      },
    ],
    blocks: [root],
  };

  (root.blocks as unknown[]).push(childBlock);
  return root;
}

/**
 * Builds an oversized sequence input with `count` items (e.g. 1200 > MAX_ITEMS = 1000).
 */
export function createOversizedReviewFixture(count = 1200): {
  readonly id: string;
  readonly title: string;
  readonly targetMinutes: number;
  readonly steps: SequenceStep[];
} {
  const safeCount = Math.max(1, Math.floor(count));
  const steps: SequenceStep[] = Array.from({ length: safeCount }, (_, idx) => ({
    stepId: `oversized-step-${idx + 1}`,
    order: idx + 1,
    blockCategory: 'core',
    exerciseId: idx % 2 === 0 ? 'ex-warmup-01' : 'ex-core-01',
    durationMin: 1,
    selectedLayer: 'standard',
    sideMode: 'together',
  }));

  return {
    id: `seq-oversized-${safeCount}`,
    title: `과대 입력 진단 수업안 (${safeCount}개 항목)`,
    targetMinutes: 50,
    steps,
  };
}

/**
 * Presets for the standalone ClassPlanReviewFixtureHarness preview component.
 */
export const CLASS_PLAN_REVIEW_FIXTURE_PRESETS: readonly ClassPlanReviewFixturePreset[] = [
  {
    id: 'normal-30min',
    labelKo: '30분 정상 수업',
    descriptionKo: '예열·본운동·휴식·마무리가 30분 목표 시간에 정확히 맞고 좌우가 균형 잡힌 수업',
    input: SYNTHETIC_30MIN_NORMAL_CLASS_FIXTURE,
  },
  {
    id: 'normal-50min',
    labelKo: '50분 정상 수업',
    descriptionKo: '리포머 50분 정규 시퀀스 (휴식 포함 50분 정확 일치, 좌우 균형)',
    input: SYNTHETIC_50MIN_NORMAL_CLASS_FIXTURE,
  },
  {
    id: 'mixed-rest-side-unspec',
    labelKo: '휴식·반복·좌우·미정 시간 혼합',
    descriptionKo:
      '반복/세트/양쪽 순차 중복 합산 방지, 좌우 짝 누락·시간 편차, 시간 미정(2개) 분리 표기 확인',
    input: SYNTHETIC_MIXED_REST_SIDE_UNSPECIFIED_FIXTURE,
  },
  {
    id: 'name-only-draft',
    labelKo: '이름만 있는 새 동작 초안',
    descriptionKo:
      '분류·해부학·기구·건강 정보 없이 동작 이름/한 줄 아이디어만 적은 초안의 정상 검토 확인',
    input: SYNTHETIC_NAME_ONLY_DRAFT_FIXTURE,
    options: {
      humanDrafts: SYNTHETIC_MINIMAL_HUMAN_DRAFTS,
    },
  },
  {
    id: 'empty-class',
    labelKo: '빈 수업',
    descriptionKo: '동작이 아직 하나도 없는 빈 시퀀스 상태 안내 확인',
    input: SYNTHETIC_EMPTY_CLASS_FIXTURE,
  },
  {
    id: 'corrupted-input',
    labelKo: '과대·손상 입력 진단',
    descriptionKo: '음수·NaN·무한대 시간, 잘못된 반복/세트, 중복 ID 등 입력 오류 진단 확인',
    input: SYNTHETIC_CORRUPTED_INPUT_FIXTURE,
  },
];
