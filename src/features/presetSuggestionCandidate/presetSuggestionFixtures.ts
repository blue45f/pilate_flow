import { deepFreezeCandidateResult } from './presetSuggestionDiagnostics';
import type { PresetSuggestionRequest } from './presetSuggestionTypes';

export interface PresetSuggestionFixturePreset {
  readonly id: string;
  readonly labelKo: string;
  readonly descriptionKo: string;
  readonly request: PresetSuggestionRequest;
}

/**
 * 1. Exact Offline Class Preset Match + Multi-Tier Alternatives (Reformer 50m Full-Body Flow)
 */
export const SYNTHETIC_REFORMER_50MIN_EXACT_REQUEST: PresetSuggestionRequest =
  deepFreezeCandidateResult({
    apparatus: 'reformer',
    theme: 'full-body-flow',
    targetMinutes: 50,
    restMinutes: 0,
    level: '1.5',
  });

/**
 * 2. Custom Duration (40m) + Midpoint Rest (3m) Adaptation (Reformer Core & Spinal Control)
 */
export const SYNTHETIC_REFORMER_40MIN_WITH_REST_REQUEST: PresetSuggestionRequest =
  deepFreezeCandidateResult({
    apparatus: 'reformer',
    theme: 'core-spinal-control',
    targetMinutes: 40,
    restMinutes: 3,
    level: '1.5',
  });

/**
 * 3. Cadillac 25-Minute Custom Duration (No Static 25m Preset -> Adapted + Block Assembly + Catalog)
 */
export const SYNTHETIC_CADILLAC_25MIN_CUSTOM_REQUEST: PresetSuggestionRequest =
  deepFreezeCandidateResult({
    apparatus: 'cadillac',
    theme: 'upper-thoracic-opening',
    targetMinutes: 25,
    restMinutes: 0,
    level: '1.5',
  });

/**
 * 4. Seed Plan with Unilateral Split Imbalance & Unilateral Together Mismatch
 */
export const SYNTHETIC_UNILATERAL_IMBALANCE_SEED_REQUEST: PresetSuggestionRequest =
  deepFreezeCandidateResult({
    apparatus: 'reformer',
    theme: 'lower-glute-balance',
    targetMinutes: 30,
    level: '1.5',
    seedPlan: {
      steps: [
        {
          stepId: 'seed-uni-1-warmup',
          kind: 'exercise',
          exerciseId: 'ex-warmup-01',
          blockCategory: 'warmup',
          durationMin: 5,
          explanationSec: 20,
          transitionSec: 0,
          sideMode: 'together',
        },
        {
          stepId: 'seed-uni-2-together-mismatch',
          kind: 'exercise',
          exerciseId: 'ex-lower-01',
          blockCategory: 'lower-body',
          durationMin: 6,
          explanationSec: 20,
          transitionSec: 15,
          // ex-lower-01 is unilateral (isUnilateral: true), so 'together' is invalid
          sideMode: 'together',
        },
        {
          stepId: 'seed-uni-3-split-left-only',
          kind: 'exercise',
          exerciseId: 'ex-lower-02',
          blockCategory: 'lower-body',
          durationMin: 5,
          explanationSec: 20,
          transitionSec: 15,
          sideMode: 'left',
          repetitions: 8,
          sets: 2,
        },
      ],
    },
  });

/**
 * 5. Impossible Target Duration (Rest >= Target & Locked Steps Exceed Target)
 */
export const SYNTHETIC_IMPOSSIBLE_TARGET_AND_REST_REQUEST: PresetSuggestionRequest =
  deepFreezeCandidateResult({
    apparatus: 'mat',
    theme: 'breath-pelvic-foundation',
    targetMinutes: 15,
    restMinutes: 15,
    level: '1.0',
    seedPlan: {
      steps: [
        {
          stepId: 'seed-locked-1',
          kind: 'exercise',
          exerciseId: 'original-mat-rib-breath',
          blockCategory: 'warmup',
          durationMin: 12,
          explanationSec: 20,
          transitionSec: 0,
          sideMode: 'together',
          locked: true,
        },
      ],
    },
  });

/**
 * 6. Unknown Exercise ID & Malformed Rest Step Diagnostic Request
 */
export const SYNTHETIC_UNKNOWN_ID_AND_MALFORMED_REST_REQUEST: PresetSuggestionRequest =
  deepFreezeCandidateResult({
    apparatus: 'reformer',
    theme: 'full-body-flow',
    targetMinutes: 30,
    level: '1.5',
    seedPlan: {
      steps: [
        {
          stepId: 'seed-unknown-ex-1',
          kind: 'exercise',
          exerciseId: 'non-existent-invented-exercise-999',
          blockCategory: 'core',
          durationMin: 5,
        },
        {
          stepId: 'seed-bad-rest-2',
          kind: 'rest',
          exerciseId: 'ex-warmup-01',
          durationMin: -2,
          repetitions: 5,
        },
      ],
    },
  });

/**
 * Helper to build a seed plan containing a deliberate circular reference (cycle).
 */
export function createCircularSeedFixture(): {
  steps: unknown[];
} {
  const container: { steps: unknown[] } = {
    steps: [
      {
        stepId: 'cycle-step-1',
        kind: 'exercise',
        exerciseId: 'ex-warmup-01',
        blockCategory: 'warmup',
        durationMin: 5,
      },
    ],
  };
  container.steps.push(container);
  return container;
}

/**
 * Helper to build a seed plan exceeding `MAX_NESTING_DEPTH`.
 */
export function createDeeplyNestedSeedFixture(depth = 20): { items: unknown[] } {
  let current: { items: unknown[] } = {
    items: [
      {
        stepId: 'deep-leaf-step',
        kind: 'exercise',
        exerciseId: 'ex-warmup-01',
        blockCategory: 'warmup',
        durationMin: 5,
      },
    ],
  };
  for (let i = 0; i < depth; i++) {
    current = { items: [current] };
  }
  return current;
}

/**
 * Helper to build a seed plan exceeding `MAX_ITEMS`.
 */
export function createOversizedSeedFixture(count = 1005): { steps: unknown[] } {
  return {
    steps: Array.from({ length: count }, (_, idx) => ({
      stepId: `oversized-step-${idx + 1}`,
      kind: 'exercise',
      exerciseId: 'ex-warmup-01',
      blockCategory: 'warmup',
      durationMin: 2,
    })),
  };
}

/**
 * Helper to build a seed plan exceeding `MAX_RAW_SCAN_NODES` even when the tail is empty containers.
 */
export function createScanOverflowSeedFixture(emptyContainerCount = 10010): {
  steps: unknown[];
} {
  return {
    steps: [
      {
        stepId: 'valid-head-step',
        kind: 'exercise',
        exerciseId: 'ex-warmup-01',
        blockCategory: 'warmup',
        durationMin: 5,
      },
      ...Array.from({ length: emptyContainerCount }, () => ({ items: [] })),
    ],
  };
}

export const PRESET_SUGGESTION_FIXTURE_PRESETS: readonly PresetSuggestionFixturePreset[] =
  deepFreezeCandidateResult([
    {
      id: 'reformer-50m-exact',
      labelKo: '리포머 50분 전신 플로우 (정확 일치 + 대안)',
      descriptionKo:
        '기구(reformer)·주제(full-body-flow)·목표 50분 조건에서 오프라인 프리셋 정확 일치 초안, 블록 조합 초안, 카탈로그 규칙 조합 초안을 결정론적으로 비교합니다.',
      request: SYNTHETIC_REFORMER_50MIN_EXACT_REQUEST,
    },
    {
      id: 'reformer-40m-rest',
      labelKo: '리포머 40분 코어 + 휴식 3분 (시간·휴식 맞춤)',
      descriptionKo:
        '고정 프리셋에 없는 40분 수업 + 3분 휴식(수업 시간 내 포함) 조건에서 기존 프리셋과 카탈로그 동작 ID를 오차 0초로 맞춤 배분합니다.',
      request: SYNTHETIC_REFORMER_40MIN_WITH_REST_REQUEST,
    },
    {
      id: 'cadillac-25m-custom',
      labelKo: '캐딜락 25분 흉추 가동성 (비정형 시간)',
      descriptionKo:
        '캐딜락 25분 조건에서 편측 순차(left-then-right) 한쪽당 시간과 전환 시간을 검증하며 초안을 생성합니다.',
      request: SYNTHETIC_CADILLAC_25MIN_CUSTOM_REQUEST,
    },
    {
      id: 'unilateral-imbalance-seed',
      labelKo: '편측 시간·분할 불균형 차단 진단',
      descriptionKo:
        '편측(isUnilateral) 동작의 together 오설정과 좌·우 짝 불일치 스텝을 명시적으로 감지하고 차단합니다.',
      request: SYNTHETIC_UNILATERAL_IMBALANCE_SEED_REQUEST,
    },
    {
      id: 'impossible-target-rest',
      labelKo: '목표시간·쉬는시간 불가능 조건 진단',
      descriptionKo:
        '쉬는 시간이 목표 수업 시간 이상이거나 잠긴 동작 합계가 목표 시간을 초과하는 불가능 조건을 명시합니다.',
      request: SYNTHETIC_IMPOSSIBLE_TARGET_AND_REST_REQUEST,
    },
    {
      id: 'unknown-id-and-rest-error',
      labelKo: '없는 동작 ID·잘못된 휴식 차단 진단',
      descriptionKo:
        '카탈로그에 없는 동작 ID를 새로 만들어내지 않고 즉시 차단하며, 잘못된 휴식 속성을 함께 진단합니다.',
      request: SYNTHETIC_UNKNOWN_ID_AND_MALFORMED_REST_REQUEST,
    },
  ]);
