import { APPARATUS_LABELS, CANONICAL_BLOCKS, POSITION_LABELS } from '../data/pilatesCatalog';
import type { ClassBlockCategory, PilatesExercise } from '../types/pilates';

const BLOCK_ROLE_INTENT_KO: Record<ClassBlockCategory, { roleLabel: string; whySentence: string }> =
  {
    warmup: {
      roleLabel: '준비 구간 (Warm-up)',
      whySentence: '본운동 전에 호흡과 척추·골반 정렬을 살펴보는 준비 구간으로 분류된 동작이에요.',
    },
    footwork: {
      roleLabel: '도입 정렬 (Footwork)',
      whySentence:
        '발의 지지와 무릎·고관절·골반 정렬을 살펴보는 풋워크 구간으로 분류된 동작이에요.',
    },
    core: {
      roleLabel: '중심 안정화 (Core)',
      whySentence: '복부 지지와 몸통 조절에 초점을 두는 코어 구간으로 분류된 동작이에요.',
    },
    bridging: {
      roleLabel: '분절·후면 사슬 (Bridging)',
      whySentence: '골반을 들어 올리고 내리는 흐름을 살펴보는 브리징 구간으로 분류된 동작이에요.',
    },
    'lower-body': {
      roleLabel: '본운동 하지 (Lower Body)',
      whySentence: '다리와 골반의 움직임·지지에 초점을 두는 하지 구간으로 분류된 동작이에요.',
    },
    'upper-body': {
      roleLabel: '본운동 상지·견갑 (Upper Body)',
      whySentence: '팔과 어깨 주변의 움직임·지지에 초점을 두는 상지 구간으로 분류된 동작이에요.',
    },
    extension: {
      roleLabel: '후면 신전 (Back Extension)',
      whySentence: '척추를 펴는 방향의 움직임을 살펴보는 신전 구간으로 분류된 동작이에요.',
    },
    plank: {
      roleLabel: '전신 지지 (Plank)',
      whySentence: '몸통과 팔다리의 지지를 연결하는 플랭크 구간으로 분류된 동작이에요.',
    },
    'feet-in-straps': {
      roleLabel: '스트랩 하지 조절 (Feet in Straps)',
      whySentence: '발에 연결한 스트랩과 함께 다리의 움직임을 조절하는 구간으로 분류된 동작이에요.',
    },
    cooldown: {
      roleLabel: '마무리 이완 (Cool-down)',
      whySentence: '수업 끝에 호흡과 몸의 상태를 살펴보는 마무리 구간으로 분류된 동작이에요.',
    },
  };

export interface DerivedExerciseIntent {
  readonly roleLabelKo: string;
  readonly headlineKo: string;
  readonly focusSummaryKo: string;
  readonly pacingSummaryKo: string;
}

export function deriveExerciseUserIntent(exercise: PilatesExercise): DerivedExerciseIntent {
  const blockMeta = BLOCK_ROLE_INTENT_KO[exercise.blockCategory];
  const canonicalBlock = CANONICAL_BLOCKS.find((b) => b.category === exercise.blockCategory);
  const roleLabelKo = blockMeta?.roleLabel ?? canonicalBlock?.nameKo ?? '수업 본운동';
  const headlineKo =
    blockMeta?.whySentence ??
    `${APPARATUS_LABELS[exercise.apparatus].ko}에서 몸통 정렬과 호흡 협응을 안정적으로 연결하는 동작이에요.`;
  const focusSummaryKo =
    exercise.targetMuscles.slice(0, 3).join(' · ') ||
    `${APPARATUS_LABELS[exercise.apparatus].ko} ${POSITION_LABELS[exercise.bodyPosition].ko} 정렬`;
  const pacingSummaryKo = `${exercise.defaultDurationMin}분 기본값${
    exercise.isUnilateral ? ' (양쪽 교대 포함)' : ''
  }${exercise.springs?.trim() ? ` · ${exercise.springs.trim()}` : ''}`;

  return {
    roleLabelKo,
    headlineKo,
    focusSummaryKo,
    pacingSummaryKo,
  };
}
