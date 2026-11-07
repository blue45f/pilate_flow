import type { SavedSequence, SequenceStep } from '../../../src/types/pilates';

/**
 * Synthetic-only fixture data for Round 5 First-Use 6-Step Journey Audit
 * (`첫 진입 → 기구 선택 → 동작 2개 추가 → 순서 변경 → 저장 → 재방문 이어하기`).
 * Contains zero user personal data or production secrets.
 */
export const SYNTHETIC_ROUND5_CLASS_TITLE =
  '[합성-R5] 신규 강사 리포머 2동작 순서변경 첫 수업안';

export const SYNTHETIC_ROUND5_INITIAL_STEPS: SequenceStep[] = [
  {
    stepId: 'syn-r5-step-1',
    exerciseId: 'original-reformer-supine-breath',
    customDurationMin: 3,
    springSetting: '리포머 기본 스프링',
    TransitionNote: '캐리지 호흡 정렬 후 패럴렐 풋워크로 연결',
    locked: false,
    reviewStatus: 'pending',
    selectedLayer: 'standard',
  },
  {
    stepId: 'syn-r5-step-2',
    exerciseId: 'original-reformer-parallel-footwork',
    customDurationMin: 4,
    springSetting: '리포머 풋워크 스프링',
    TransitionNote: '하체 정렬 확인 후 다음 구간 진입',
    locked: false,
    reviewStatus: 'pending',
    selectedLayer: 'standard',
  },
];

export const SYNTHETIC_ROUND5_REORDERED_STEPS: SequenceStep[] = [
  SYNTHETIC_ROUND5_INITIAL_STEPS[1],
  SYNTHETIC_ROUND5_INITIAL_STEPS[0],
];

export const SYNTHETIC_ROUND5_SAVED_SEQUENCE: SavedSequence = {
  id: 'syn-r5-saved-seq-01',
  title: SYNTHETIC_ROUND5_CLASS_TITLE,
  subtitle: '첫 진입 · 기구 선택 · 동작 2개 · 순서 변경 검증용',
  apparatus: 'reformer',
  level: '1.0',
  targetMinutes: 50,
  steps: SYNTHETIC_ROUND5_REORDERED_STEPS,
  createdAt: '2026-11-07T08:50:00.000Z',
};

export const ROUND5_VIEWPORT_MATRIX = [
  { label: 'mobile-320', width: 320, height: 568, mobile: true },
  { label: 'mobile-390', width: 390, height: 844, mobile: true },
  { label: 'tablet-768', width: 768, height: 1024, mobile: false },
  { label: 'desktop-1440', width: 1440, height: 900, mobile: false },
] as const;

export const ROUND5_ZOOM_LEVELS = [1, 2] as const;
