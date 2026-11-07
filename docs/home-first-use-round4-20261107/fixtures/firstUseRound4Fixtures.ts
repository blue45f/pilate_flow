import type { SavedSequence, SequenceStep } from '../../../src/types/pilates';

/**
 * 합성(Synthetic) 초보 강사 첫 사용 동선 감사 픽스처 (Round 4 - 2026-11-07)
 * - 실제 사용자 데이터/로컬스토리지 원본을 일절 사용하지 않음
 * - 시나리오: 빈상태 → 새수업 → 동작 2개 추가 → 저장 → 다음방문 이어하기
 */

export const SYNTHETIC_TARGET_MOVEMENT_IDS = [
  'mat-breath-observation',
  'mat-pelvic-clock',
] as const;

export const SYNTHETIC_CLASS_TITLE = '[합성-R4] 초보 강사 첫 리포머·매트 50분 수업';

export const SYNTHETIC_TWO_MOVEMENT_STEPS: SequenceStep[] = [
  {
    stepId: 'r4-synth-step-1',
    exerciseId: 'mat-breath-observation',
    customDurationMin: 3,
    springSetting: '맨몸 / 매트',
    TransitionNote: '호흡 정렬 후 골반 시계로 연결',
    locked: false,
    reviewStatus: 'pending',
    selectedLayer: 'standard',
  },
  {
    stepId: 'r4-synth-step-2',
    exerciseId: 'mat-pelvic-clock',
    customDurationMin: 4,
    springSetting: '맨몸 / 매트',
    TransitionNote: '골반 중립 확인 후 본운동 진입',
    locked: false,
    reviewStatus: 'pending',
    selectedLayer: 'standard',
  },
];

export const SYNTHETIC_SAVED_SEQUENCE_FOR_NEXT_VISIT: SavedSequence = {
  id: 'r4-synth-seq-001',
  title: SYNTHETIC_CLASS_TITLE,
  subtitle: '설명문 없이 동작 2개 추가 후 저장한 첫 수업안',
  targetMinutes: 50,
  level: '1.0',
  apparatus: 'mat',
  steps: SYNTHETIC_TWO_MOVEMENT_STEPS,
  createdAt: '2026-11-07T09:00:00.000Z',
};

export function createSyntheticEmptyFirstUseStorePayload() {
  return {
    state: {
      activeTab: 'workbench' as const,
      activeSequenceId: null,
      activeTitle: '첫 수업 시퀀스 초안',
      activeSubtitle: '',
      activeTargetMinutes: 50,
      activeLevel: '1.0' as const,
      activeApparatus: 'reformer' as const,
      activeSteps: [] as SequenceStep[],
      savedSequences: [] as SavedSequence[],
      historyLogs: [],
      ownedEquipment: ['mat', 'reformer', 'cadillac', 'chair', 'barrel'],
      ownedProps: ['none', 'ring', 'foam-roller', 'mini-ball', 'thera-band'],
    },
    version: 3,
  };
}

export function createSyntheticNextVisitEmptyCanvasStorePayload() {
  return {
    state: {
      activeTab: 'workbench' as const,
      activeSequenceId: null,
      activeTitle: '다음 방문 새 초안',
      activeSubtitle: '',
      activeTargetMinutes: 50,
      activeLevel: '1.0' as const,
      activeApparatus: 'reformer' as const,
      activeSteps: [] as SequenceStep[],
      savedSequences: [SYNTHETIC_SAVED_SEQUENCE_FOR_NEXT_VISIT],
      historyLogs: [],
      ownedEquipment: ['mat', 'reformer', 'cadillac', 'chair', 'barrel'],
      ownedProps: ['none', 'ring', 'foam-roller', 'mini-ball', 'thera-band'],
    },
    version: 3,
  };
}
