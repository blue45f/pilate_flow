import { getExerciseEquipment } from './equipmentCatalog';
import { INITIAL_EXERCISES } from './pilatesCatalog';
import type {
  BlankDraftStarterOption,
  BlockPresetTimeBreakdown,
  OfflineBlockPreset,
  OfflineClassPreset,
  PresetDurationMinutes,
  PresetSafetyAndClaimBoundary,
  PresetThemeId,
  PresetThemeMetadata,
} from '../types/classBlockPresets';
import type {
  P1MovementSnapshotContract,
  P1ReusableBlockStepContract,
} from '../types/freeAiAssistant';
import type { ReusableBlockItem } from '../types/hierarchy';
import type {
  ApparatusType,
  AutoGenerateCriteria,
  ClassBlockCategory,
  DifficultyLevel,
  LayerMode,
  PilatesExercise,
  PropType,
  SequenceStep,
  StepSideMode,
  WorkoutTempo,
} from '../types/pilates';
import type { ClassSectionRole } from '../types/sequenceMotion';
import { createMovementSnapshot, getMovementSectionRole } from '../utils/hierarchyModel';
import {
  calculateApparatusTransitionDetail,
  calculateSequenceTimeBreakdown,
} from '../utils/sequenceValidation';

const PRESET_TIMESTAMP_ISO = '2026-11-01T09:00:00.000Z';

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      deepFreeze(item);
    }
    return Object.freeze(value);
  }
  for (const key of Object.keys(value as Record<string, unknown>)) {
    const child = (value as Record<string, unknown>)[key];
    if (child !== null && typeof child === 'object' && !Object.isFrozen(child)) {
      deepFreeze(child);
    }
  }
  return Object.freeze(value);
}

const CATALOG_BY_ID = new Map<string, PilatesExercise>(
  INITIAL_EXERCISES.map((exercise) => [exercise.id, exercise]),
);

function requireCatalogExercise(exerciseId: string): PilatesExercise {
  const found = CATALOG_BY_ID.get(exerciseId);
  if (!found) {
    throw new Error(`카탈로그에서 동작 ID를 찾을 수 없습니다: ${exerciseId}`);
  }
  return found;
}

/**
 * 1. 프리셋 안전성·효능 비주장 및 비AI(Offline) 경계 상수
 */
export const DEFAULT_PRESET_SAFETY_BOUNDARY: PresetSafetyAndClaimBoundary = deepFreeze({
  aiUsed: false,
  medicalOrRehabEfficacyClaimed: false,
  expertClinicalVerified: false,
  editableByInstructor: true,
  disclaimerKo:
    '본 프리셋은 AI 호출 없이 스튜디오 수업 구성을 돕는 편집용 참고 템플릿이며, 의학적 치료·재활·통증 완화 효과를 주장하거나 보장하지 않습니다.',
});

/**
 * 2. 7대 스튜디오 수업·블록 프리셋 주제 카탈로그
 */
export const PRESET_THEME_CATALOG: readonly PresetThemeMetadata[] = deepFreeze([
  {
    id: 'breath-pelvic-foundation',
    labelKo: '호흡·골반 기초 정렬',
    labelEn: 'Breath & Pelvic Foundation',
    summaryKo:
      '흉곽 호흡 인지와 골반 중립 조절을 바탕으로 본 운동 전 코어 연결을 준비하는 기초 정렬 테마입니다.',
    defaultFocusPreset: 'mobility-rehab',
    primaryCategories: ['warmup', 'footwork', 'bridging'],
  },
  {
    id: 'core-spinal-control',
    labelKo: '복부 코어·척추 분절 컨트롤',
    labelEn: 'Core & Spinal Articulation Control',
    summaryKo:
      '심부 복횡근 수축과 척추 분절 움직임을 연결하여 몸통 중심의 흔들림 없는 조절력을 기르는 테마입니다.',
    defaultFocusPreset: 'core-sculpt',
    primaryCategories: ['core', 'bridging', 'warmup'],
  },
  {
    id: 'lower-glute-balance',
    labelKo: '하체·둔근 지지 및 좌우 밸런스',
    labelEn: 'Lower Body, Glute Support & Side Balance',
    summaryKo:
      '발목·무릎·고관절 정렬과 단측성 하지 지지력을 바탕으로 좌우 균형과 둔근 협응을 다루는 테마입니다.',
    defaultFocusPreset: 'glute-lower',
    primaryCategories: ['footwork', 'lower-body', 'bridging', 'feet-in-straps'],
  },
  {
    id: 'upper-thoracic-opening',
    labelKo: '상체·흉추 가동성 및 견갑 안정',
    labelEn: 'Upper Body, Thoracic Mobility & Scapular Stability',
    summaryKo:
      '견갑대 하강 안정과 흉추 신전·회전 가동성을 연결하여 상체 정렬과 열린 가슴 라인을 유도하는 테마입니다.',
    defaultFocusPreset: 'posture-upper',
    primaryCategories: ['upper-body', 'extension', 'warmup'],
  },
  {
    id: 'full-body-flow',
    labelKo: '전신 협응·연결 플로우',
    labelEn: 'Full-Body Coordination & Seamless Flow',
    summaryKo:
      '도입 호흡부터 하지·코어·상체·신전·마무리까지 기구 동선을 매끄럽게 이어가는 전신 협응 테마입니다.',
    defaultFocusPreset: 'full-body',
    primaryCategories: [
      'warmup',
      'footwork',
      'bridging',
      'core',
      'upper-body',
      'lower-body',
      'extension',
      'cooldown',
    ],
  },
  {
    id: 'athletic-plank-control',
    labelKo: '플랭크·전신 코어 컨트롤',
    labelEn: 'Athletic Plank & Full-Core Control',
    summaryKo:
      '견갑대 지지와 파워하우스 연결을 결합하여 플랭크·파이크·전신 제어 동작을 밀도 있게 이어가는 테마입니다.',
    defaultFocusPreset: 'core-sculpt',
    primaryCategories: ['plank', 'core', 'lower-body', 'upper-body'],
  },
  {
    id: 'cooldown-mobility-release',
    labelKo: '전신 이완·가동성 마무리',
    labelEn: 'Cooldown Mobility & Gentle Release',
    summaryKo:
      '수업 후반 고관절·측면 흉곽·척추 주변의 긴장을 부드러운 호흡과 함께 정돈하는 가동성 마무리 테마입니다.',
    defaultFocusPreset: 'mobility-rehab',
    primaryCategories: ['feet-in-straps', 'cooldown', 'warmup'],
  },
]);

const THEME_BY_ID = new Map<PresetThemeId, PresetThemeMetadata>(
  PRESET_THEME_CATALOG.map((theme) => [theme.id, theme]),
);

interface BlockItemSpec {
  readonly exerciseId: string;
  readonly blockCategory?: ClassBlockCategory;
  readonly durationMin: number;
  readonly explanationSec?: number;
  readonly transitionSec?: number;
  readonly repetitions?: number;
  readonly sets?: number;
  readonly sideMode?: StepSideMode;
  readonly selectedLayer?: LayerMode;
  readonly customSpringOverride?: string;
  readonly instructorNote: string;
}

interface OfflineBlockPresetSpec {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly sectionRole: ClassSectionRole;
  readonly apparatus: ApparatusType | 'mixed';
  readonly level: DifficultyLevel;
  readonly theme: PresetThemeId;
  readonly category: ClassBlockCategory;
  readonly targetAudienceSummaryKo: string;
  readonly flowRationaleKo: string;
  readonly unilateralBalanceNoteKo: string;
  readonly editingGuideKo: string;
  readonly items: readonly BlockItemSpec[];
}

function buildOfflineBlockPreset(spec: OfflineBlockPresetSpec): OfflineBlockPreset {
  const themeMeta = THEME_BY_ID.get(spec.theme);
  if (!themeMeta) {
    throw new Error(`알 수 없는 프리셋 테마입니다: ${spec.theme}`);
  }

  const prelimSteps: SequenceStep[] = spec.items.map((itemSpec, idx) => {
    const ex = requireCatalogExercise(itemSpec.exerciseId);
    const resolvedSideMode: StepSideMode =
      itemSpec.sideMode ?? (ex.isUnilateral ? 'left-then-right' : 'together');

    return {
      kind: 'exercise',
      stepId: `${spec.id}-item-${idx + 1}`,
      order: idx + 1,
      blockCategory: itemSpec.blockCategory ?? ex.blockCategory,
      exerciseId: ex.id,
      durationMin: itemSpec.durationMin,
      explanationSec: itemSpec.explanationSec ?? 20,
      transitionSec: itemSpec.transitionSec,
      repetitions: itemSpec.repetitions ?? (ex.isUnilateral ? 6 : 8),
      sets: itemSpec.sets ?? 2,
      sideMode: resolvedSideMode,
      selectedLayer: itemSpec.selectedLayer ?? 'standard',
      customSpringOverride: itemSpec.customSpringOverride,
      instructorNote: itemSpec.instructorNote,
      classSection: spec.sectionRole,
    };
  });

  const items: ReusableBlockItem[] = prelimSteps.map((step, idx) => {
    const ex = requireCatalogExercise(step.exerciseId);
    let transitionSec = step.transitionSec;
    if (transitionSec === undefined) {
      if (idx === 0) {
        transitionSec = 0;
      } else {
        const detail = calculateApparatusTransitionDetail(
          prelimSteps[idx - 1],
          step,
          idx - 1,
          idx,
          INITIAL_EXERCISES,
        );
        transitionSec = detail.recommendedTransitionSec;
      }
    }

    const snapshot = createMovementSnapshot(ex, PRESET_TIMESTAMP_ISO);

    return {
      itemId: `${spec.id}-item-${idx + 1}`,
      order: idx + 1,
      exerciseId: ex.id,
      blockCategory: step.blockCategory,
      durationMin: step.durationMin,
      explanationSec: step.explanationSec ?? 20,
      transitionSec,
      repetitions: step.repetitions,
      sets: step.sets,
      sideMode: step.sideMode,
      selectedLayer: step.selectedLayer,
      customSpringOverride: step.customSpringOverride,
      instructorNote: step.instructorNote,
      exerciseSnapshot: snapshot,
    };
  });

  const steps: P1ReusableBlockStepContract[] = items.map((item) => {
    const snap = item.exerciseSnapshot!;
    const contractSnapshot: P1MovementSnapshotContract = {
      id: snap.id,
      nameKo: snap.nameKo,
      nameEn: snap.nameEn,
      apparatus: snap.apparatus,
      requiredEquipment: snap.requiredEquipment ? [...snap.requiredEquipment] : undefined,
      movementFamily: snap.movementFamily,
      capturedAt: snap.capturedAt,
    };
    return {
      exerciseId: item.exerciseId,
      blockCategory: item.blockCategory,
      durationMin: item.durationMin,
      selectedLayer: item.selectedLayer,
      instructorNote: item.instructorNote,
      exerciseSnapshot: contractSnapshot,
    };
  });

  let movementSec = 0;
  let explanationSec = 0;
  let transitionSec = 0;
  let totalSec = 0;

  const equipmentSet = new Set<string>();
  const propSet = new Set<PropType>();

  for (const item of items) {
    const ex = requireCatalogExercise(item.exerciseId);
    const eq = getExerciseEquipment(ex);
    eq.requiredEquipment.forEach((reqId) => equipmentSet.add(reqId));
    ex.props.forEach((prop) => {
      if (prop !== 'none') propSet.add(prop);
    });

    const itemTotalSec = Math.round(item.durationMin * 60);
    const itemExpSec = Math.round(item.explanationSec ?? 0);
    const itemTransSec = Math.round(item.transitionSec ?? 0);
    const itemMoveSec = itemTotalSec - itemExpSec - itemTransSec;

    totalSec += itemTotalSec;
    explanationSec += itemExpSec;
    transitionSec += itemTransSec;
    movementSec += itemMoveSec;
  }

  const totalMinutes = Number((totalSec / 60).toFixed(2));
  const timeBreakdown: BlockPresetTimeBreakdown = {
    movementSec,
    explanationSec,
    transitionSec,
    totalSec,
    totalMinutes,
  };

  return deepFreeze({
    id: spec.id,
    presetKind: 'reusable-block',
    title: spec.title,
    description: spec.description,
    sectionRole: spec.sectionRole,
    apparatus: spec.apparatus,
    level: spec.level,
    theme: spec.theme,
    themeLabelKo: themeMeta.labelKo,
    category: spec.category,
    durationMin: totalMinutes,
    isReviewed: true,
    steps,
    items,
    requiredEquipment: [...equipmentSet],
    recommendedProps: propSet.size > 0 ? [...propSet] : ['none'],
    targetAudienceSummaryKo: spec.targetAudienceSummaryKo,
    flowRationaleKo: spec.flowRationaleKo,
    unilateralBalanceNoteKo: spec.unilateralBalanceNoteKo,
    editingGuideKo: spec.editingGuideKo,
    timeBreakdown,
    safetyBoundary: DEFAULT_PRESET_SAFETY_BOUNDARY,
    version: 1,
    createdAt: PRESET_TIMESTAMP_ISO,
    updatedAt: PRESET_TIMESTAMP_ISO,
  });
}

/**
 * 3. 오프라인 재사용 블록 프리셋 카탈로그 (20종)
 */
const BLOCK_PRESET_SPECS: readonly OfflineBlockPresetSpec[] = [
  // 01. Mat Preparation Lv 1.0 - breath-pelvic-foundation
  {
    id: 'block-mat-prep-breath-clock-10',
    title: '매트 호흡 인지 & 골반 시계 오프닝 블록',
    description: '수파인 자세에서 흉곽 호흡 리듬과 골반 시계 방향 기울임을 차분하게 연결하는 매트 도입 블록입니다.',
    sectionRole: 'preparation',
    apparatus: 'mat',
    level: '1.0',
    theme: 'breath-pelvic-foundation',
    category: 'warmup',
    targetAudienceSummaryKo: '수업 시작 시 호흡 리듬과 골반 중립 감각을 먼저 깨우고자 하는 매트 입문·기초 수업',
    flowRationaleKo: '누운 자세 변경 없이 호흡 관찰에서 골반 시계 움직임으로 자연스럽게 이어져 초반 집중도를 높입니다.',
    unilateralBalanceNoteKo: '양측 대칭 호흡과 골반 중심 조절로 구성되어 좌우 편차 없이 중심을 세팅합니다.',
    editingGuideKo: '수업 시간에 맞춰 각 항목을 2~4분 범위에서 가감하거나 폼롤러 릴리즈 동작과 교체할 수 있습니다.',
    items: [
      {
        exerciseId: 'original-mat-rib-breath',
        durationMin: 3,
        explanationSec: 20,
        instructorNote: '갈비뼈 양옆 확장 호흡을 먼저 인지하며 어깨 긴장을 내려놓습니다.',
      },
      {
        exerciseId: 'original-mat-pelvic-clock',
        durationMin: 3,
        explanationSec: 20,
        instructorNote: '골반 앞뒤 기울임부터 시작해 편안한 범위에서 시계 방향 원을 탐색합니다.',
      },
    ],
  },

  // 02. Reformer Preparation Lv 1.0 - breath-pelvic-foundation
  {
    id: 'block-reformer-prep-breath-imprint-10',
    title: '리포머 캐리지 호흡 & 펠빅 클락 예열 블록',
    description: '캐리지 위 암 아크 호흡과 미니볼 펠빅 클락을 결합해 리포머 본 운동 전 골반·흉곽 정렬을 세팅합니다.',
    sectionRole: 'preparation',
    apparatus: 'reformer',
    level: '1.0',
    theme: 'breath-pelvic-foundation',
    category: 'warmup',
    targetAudienceSummaryKo: '리포머 첫 구간에서 내전근 연결과 흉식 호흡을 안정적으로 안내하고 싶은 그룹·개인 수업',
    flowRationaleKo: '동일한 수파인 체위에서 스트랩 없는 암 아크 후 미니볼 골반 임프린트로 연결되어 동선이 간결합니다.',
    unilateralBalanceNoteKo: '두 발과 양쪽 좌골의 균등한 지지력을 확인하며 양측 대칭으로 진행합니다.',
    editingGuideKo: '미니볼이 없는 환경에서는 맨몸 골반 틸팅으로 진행하고 시간을 5~8분으로 조절할 수 있습니다.',
    items: [
      {
        exerciseId: 'original-reformer-supine-breath',
        durationMin: 3,
        explanationSec: 20,
        instructorNote: '캐리지 위에서 등 뒤 접촉면을 느끼며 작은 원호로 팔을 움직입니다.',
      },
      {
        exerciseId: 'ex-warmup-01',
        durationMin: 4,
        explanationSec: 20,
        instructorNote: '무릎 사이 미니볼 텐션을 유지하며 흉식 호흡과 골반 중립을 연결합니다.',
      },
    ],
  },

  // 03. Cadillac Preparation Lv 1.0 - upper-thoracic-opening
  {
    id: 'block-cadillac-prep-rollbar-breath-10',
    title: '캐딜락 테이블 호흡 & 롤다운 바 흉추 오프닝 블록',
    description: '테이블 수파인 호흡과 골반 록 이후 롤다운 바 흉추 가동성 움직임으로 이어지는 캐딜락 오프닝 블록입니다.',
    sectionRole: 'preparation',
    apparatus: 'cadillac',
    level: '1.0',
    theme: 'upper-thoracic-opening',
    category: 'warmup',
    targetAudienceSummaryKo: '상체 긴장을 부드럽게 풀고 견갑대 하강 인지를 돕는 캐딜락 입문·초중급 오프닝',
    flowRationaleKo: '수파인 호흡·골반 록으로 중심을 깨운 뒤 닐링 롤다운 바 분절로 상체 가동 범위를 점진적으로 넓힙니다.',
    unilateralBalanceNoteKo: '양손으로 롤다운 바를 대칭 파지하여 좌우 견갑골 하강 힘을 고르게 맞춥니다.',
    editingGuideKo: '무릎 지지가 불편한 경우 롤다운 바 구간을 시티드 자세 레이어로 변경해 진행하세요.',
    items: [
      {
        exerciseId: 'original-cadillac-table-breath',
        durationMin: 2,
        explanationSec: 15,
        instructorNote: '테이블 위에서 몸통 뒷면의 지지와 편안한 호흡 리듬을 관찰합니다.',
      },
      {
        exerciseId: 'original-cadillac-pelvic-rock',
        durationMin: 2,
        explanationSec: 15,
        instructorNote: '두 발을 테이블에 두고 골반을 작은 범위로 앞뒤 기울이며 중심을 찾습니다.',
      },
      {
        exerciseId: 'ex-warmup-02',
        durationMin: 4,
        explanationSec: 20,
        instructorNote: '겨드랑이 아래 전거근 연결을 유지하며 롤다운 바로 척추 분절을 유도합니다.',
      },
    ],
  },

  // 04. Chair Preparation Lv 1.0 - breath-pelvic-foundation
  {
    id: 'block-chair-prep-seated-foundation-10',
    title: '운다 체어 시티드 호흡 & 골반 수직 정렬 블록',
    description: '체어 좌면 위에서 좌골 수직 지지와 호흡, 골반 록을 연결해 흔들림 없는 앉은 중심을 세우는 블록입니다.',
    sectionRole: 'preparation',
    apparatus: 'chair',
    level: '1.0',
    theme: 'breath-pelvic-foundation',
    category: 'warmup',
    targetAudienceSummaryKo: '체어 페달 프레스 전에 좌골 지지와 몸통 수직 정렬을 명확히 인지해야 하는 수업',
    flowRationaleKo: '동일한 시티드 자세에서 호흡 관찰과 골반 록을 연속 배치하여 체어 본 운동 진입을 자연스럽게 돕습니다.',
    unilateralBalanceNoteKo: '좌우 좌골에 실리는 무게를 50:50으로 맞추어 골반 기울어짐을 예방합니다.',
    editingGuideKo: '다리 길이에 따라 발 아래 요가 블록이나 패드를 배치해 고관절 각도를 편안하게 조정하세요.',
    items: [
      {
        exerciseId: 'original-chair-seated-breath',
        durationMin: 3,
        explanationSec: 20,
        instructorNote: '좌면에 양쪽 좌골을 고르게 내려놓고 흉곽 호흡을 차분히 이어갑니다.',
      },
      {
        exerciseId: 'original-chair-seated-pelvic-rock',
        durationMin: 3,
        explanationSec: 20,
        instructorNote: '발바닥 지지를 유지하며 골반을 앞뒤로 작게 굴려 수직 중립으로 돌아옵니다.',
      },
    ],
  },

  // 05. Barrel Preparation Lv 1.0 - upper-thoracic-opening
  {
    id: 'block-barrel-prep-standing-breath-ankle-10',
    title: '바렐 스탠딩 호흡 & 래더 발목 정렬 도입 블록',
    description: '바렐 앞 스탠딩 호흡과 래더 지지 발목 움직임으로 하체 접지력과 상체 길이를 함께 깨우는 블록입니다.',
    sectionRole: 'preparation',
    apparatus: 'barrel',
    level: '1.0',
    theme: 'upper-thoracic-opening',
    category: 'warmup',
    targetAudienceSummaryKo: '바렐 본 운동 전 발목 지지와 스탠딩 균형 감각을 안전하게 예열하는 수업',
    flowRationaleKo: '바렐과 래더를 가볍게 지지한 선 자세에서 호흡과 발목 움직임을 바로 연결해 전환 지체가 없습니다.',
    unilateralBalanceNoteKo: '양발의 3점 지지와 발목 정렬을 대칭으로 맞춘 상태에서 진행합니다.',
    editingGuideKo: '스탠딩 균형이 낯선 대상자에게는 래더 양손 지지를 유지하고 가동 범위를 작게 안내하세요.',
    items: [
      {
        exerciseId: 'original-barrel-standing-breath',
        durationMin: 3,
        explanationSec: 20,
        instructorNote: '고정된 바렐에 손을 가볍게 얹고 정수리부터 발바닥까지 수직 정렬로 호흡합니다.',
      },
      {
        exerciseId: 'original-barrel-supported-ankle',
        durationMin: 3,
        explanationSec: 20,
        instructorNote: '래더를 지지한 채 뒤꿈치를 천천히 들어 올리고 내리며 발목 안정성을 깨웁니다.',
      },
    ],
  },

  // 06. Reformer Main Footwork Lv 1.5 - lower-glute-balance
  {
    id: 'block-reformer-main-footwork-alignment-15',
    title: '리포머 클래식 풋워크 & 써클링 외전 하지 정렬 블록',
    description: '미니볼 클래식 풋워크와 매직써클 와이드 세컨드 풋워크를 이어가며 내전근·중둔근 협응을 높이는 블록입니다.',
    sectionRole: 'main',
    apparatus: 'reformer',
    level: '1.5',
    theme: 'lower-glute-balance',
    category: 'footwork',
    targetAudienceSummaryKo: '발목·무릎·고관절 정렬과 둔근 바깥쪽 지지력을 함께 다루고 싶은 리포머 초중급 수업',
    flowRationaleKo: '2R 1B 동일 스프링과 수파인 헤드레스트 업 세팅을 그대로 유지해 소도구만 교체하며 밀도 있게 진행합니다.',
    unilateralBalanceNoteKo: '캐리지를 밀고 돌아올 때 양발의 미는 힘과 복귀 속도를 동일하게 유지합니다.',
    editingGuideKo: '소도구 전환 시간을 줄이고 싶다면 미니볼 또는 써클링 한 가지로 통일해 진행할 수 있습니다.',
    items: [
      {
        exerciseId: 'ex-footwork-01',
        durationMin: 5,
        explanationSec: 20,
        instructorNote: '힐·아치·필라테스 V·러닝 순서로 발목과 무릎 정렬을 세밀하게 맞춥니다.',
      },
      {
        exerciseId: 'ex-footwork-02',
        durationMin: 5,
        explanationSec: 20,
        instructorNote: '써클링 외전 텐션을 유지하며 와이드 세컨드 프레스와 짧은 펄스를 연결합니다.',
      },
    ],
  },

  // 07. Reformer Main Bridging Lv 1.5 - core-spinal-control
  {
    id: 'block-reformer-main-bridging-articulation-15',
    title: '리포머 브릿지 분절 & 햄스트링 컬 후면 사슬 블록',
    description: '기초 브릿지 준비 동작에서 아티큘레이팅 펠빅 리프트와 햄스트링 컬로 점진 빌드업하는 블록입니다.',
    sectionRole: 'main',
    apparatus: 'reformer',
    level: '1.5',
    theme: 'core-spinal-control',
    category: 'bridging',
    targetAudienceSummaryKo: '척추 분절 인지와 둔근·햄스트링 후면 지지력을 단계적으로 연결하는 리포머 수업',
    flowRationaleKo: '헤드레스트 Flat 수파인 포지션을 유지한 채 작은 골반 리프트에서 햄스트링 컬로 자연스럽게 심화됩니다.',
    unilateralBalanceNoteKo: '양발 뒤꿈치의 누르는 힘을 대칭으로 유지해 골반 회전 없이 수평을 지킵니다.',
    editingGuideKo: '햄스트링 긴장도가 높은 날에는 캐리지 이동 거리를 줄이고 분절 업·다운 횟수를 늘려 구성하세요.',
    items: [
      {
        exerciseId: 'original-reformer-supported-bridge',
        durationMin: 4,
        explanationSec: 20,
        instructorNote: '헤드레스트를 평평하게 내리고 캐리지를 안정시킨 상태에서 골반 리프트를 준비합니다.',
      },
      {
        exerciseId: 'ex-bridging-01',
        durationMin: 5,
        explanationSec: 20,
        instructorNote: '꼬리뼈부터 분절해 브릿지 업 한 뒤 캐리지 미세 인·아웃 컨트롤을 이어갑니다.',
      },
    ],
  },

  // 08. Mat Main Core Lv 1.5 - core-spinal-control
  {
    id: 'block-mat-main-core-series-15',
    title: '매트 딥코어 체스트 리프트 & 앱 파이브 연결 블록',
    description: '코르셋 딥코어 호흡에서 체스트 리프트, 클래식 앱 시리즈 오브 파이브로 이어지는 매트 코어 집중 블록입니다.',
    sectionRole: 'main',
    apparatus: 'mat',
    level: '1.5',
    theme: 'core-spinal-control',
    category: 'core',
    targetAudienceSummaryKo: '매트 위에서 심부 복횡근 인지와 상·하복부 협응을 체계적으로 다루는 코어 특화 수업',
    flowRationaleKo: '수파인 체위를 유지한 채 기초 코어 수축(Lv.1.0)에서 컬업 유지(Lv.1.5)로 매끄럽게 연결됩니다.',
    unilateralBalanceNoteKo: '교대 레그 스트레치와 크리스크로스 구간에서 좌우 흉곽 회전 각도와 횟수를 대칭으로 맞춥니다.',
    editingGuideKo: '목 피로도가 올라올 경우 머리를 매트에 내려놓고 다리 가동 범위만 조절하도록 레이어를 낮출 수 있습니다.',
    items: [
      {
        exerciseId: 'ex-global-reformer-02',
        durationMin: 4,
        explanationSec: 20,
        instructorNote: '복횡근 코르셋 수축을 먼저 인지하며 정밀한 척추 분절과 호흡을 연결합니다.',
      },
      {
        exerciseId: 'original-mat-chest-lift',
        durationMin: 3,
        explanationSec: 15,
        instructorNote: '손으로 머리를 가볍게 지지하고 흉곽 하단을 닫으며 상체를 부드럽게 들어 올립니다.',
      },
      {
        exerciseId: 'ex-core-03',
        durationMin: 5,
        explanationSec: 20,
        instructorNote: '컬업 높이를 일정하게 유지하며 앱 파이브 5종을 호흡 리듬에 맞춰 이어갑니다.',
      },
    ],
  },

  // 09. Reformer Main Core Lv 1.5 - full-body-flow
  {
    id: 'block-reformer-main-core-coordination-15',
    title: '리포머 수파인 스트랩 코디네이션 & 리버스 앱스 블록',
    description: '수파인 스트랩 암 프레스에서 상·하체 통합 코디네이션, 닐링 리버스 앱스로 이어지는 리포머 코어 블록입니다.',
    sectionRole: 'main',
    apparatus: 'reformer',
    level: '1.5',
    theme: 'full-body-flow',
    category: 'core',
    targetAudienceSummaryKo: '수파인 스트랩 코어와 닐링 하복부 컨트롤을 입체적으로 묶어 진행하고 싶은 중급 리포머 수업',
    flowRationaleKo: '수파인 암 프레스로 광배근-코어를 먼저 연결한 뒤 코디네이션과 리버스 앱스로 복부 전체를 조율합니다.',
    unilateralBalanceNoteKo: '리버스 앱스 오블리크 변형 시 좌우 무릎 당기기 횟수를 동일하게 배분합니다.',
    editingGuideKo: '수파인 구간만 유지하고 싶다면 마지막 리버스 앱스를 제외하고 2개 항목 9분 블록으로 축소할 수 있습니다.',
    items: [
      {
        exerciseId: 'original-reformer-supine-arm-press',
        durationMin: 3,
        explanationSec: 15,
        instructorNote: '양손 스트랩을 길게 누르며 견갑대 하강과 복부 중심 고정을 먼저 세팅합니다.',
      },
      {
        exerciseId: 'ex-kr-reformer-04',
        durationMin: 5,
        explanationSec: 20,
        instructorNote: '스트랩 암 워크와 다리 뻗기를 결합해 상·하체 코어 협응을 부드럽게 이어갑니다.',
      },
      {
        exerciseId: 'ex-core-04',
        durationMin: 4,
        explanationSec: 20,
        instructorNote: '네발기기 자세에서 아랫배 스쿱 힘으로 캐리지를 당기며 하복부를 집중 조절합니다.',
      },
    ],
  },

  // 10. Cadillac Main Core & Bridging Lv 2.0 - core-spinal-control
  {
    id: 'block-cadillac-main-pushthrough-parakeet-20',
    title: '캐딜락 푸쉬스루바 티저 & 타워바 숄더 브릿지 블록',
    description: '시티드 롤백 준비에서 푸쉬스루바 티저 플로우, 타워바 파라키트 숄더 브릿지로 이어지는 캐딜락 심화 블록입니다.',
    sectionRole: 'main',
    apparatus: 'cadillac',
    level: '2.0',
    theme: 'core-spinal-control',
    category: 'core',
    targetAudienceSummaryKo: '척추 굴곡·신전 분절과 고난도 코어·둔근 컨트롤을 다루는 캐딜락 숙련자 수업',
    flowRationaleKo: '롤백(Lv.1.5)에서 푸쉬스루 티저(Lv.1.5), 타워 브릿지(Lv.2.0)로 난이도가 계단식으로 상승합니다.',
    unilateralBalanceNoteKo: '바를 밀고 당길 때 양손과 양발의 압력을 대칭으로 유지해 바의 수평을 지킵니다.',
    editingGuideKo: '티저가 부담스러운 수업에서는 표준 레이어의 수파인 롤업 분절까지만 진행하도록 조절하세요.',
    items: [
      {
        exerciseId: 'original-cadillac-seated-roll-back',
        durationMin: 3,
        explanationSec: 15,
        instructorNote: '좌골 지지에서 시작해 골반을 뒤로 천천히 굴리며 복부 조절력을 확인합니다.',
      },
      {
        exerciseId: 'ex-kr-cadillac-01',
        durationMin: 5,
        explanationSec: 20,
        instructorNote: '상단 푸쉬스루바를 컨트롤하며 척추 분절 롤업과 티저 홀드를 연결합니다.',
      },
      {
        exerciseId: 'ex-bridging-02',
        durationMin: 5,
        explanationSec: 20,
        instructorNote: '타워 바에 발아치를 걸고 둔근 수직 지지와 윗등부터의 분절 하강을 진행합니다.',
      },
    ],
  },

  // 11. Reformer Main Upper Body Lv 1.5 - upper-thoracic-opening
  {
    id: 'block-reformer-main-upper-rowing-15',
    title: '리포머 닐링 체스트 익스팬션 & 시티드 로잉 상체 블록',
    description: '닐링 체스트 익스팬션·회전과 백/프론트 로잉, 트라이셉스 프레스를 엮은 리포머 상체 정렬 블록입니다.',
    sectionRole: 'main',
    apparatus: 'reformer',
    level: '1.5',
    theme: 'upper-thoracic-opening',
    category: 'upper-body',
    targetAudienceSummaryKo: '견갑골 안정화와 광배근·삼두근·흉추 회전을 고르게 다루고 싶은 리포머 상체 집중 수업',
    flowRationaleKo: '닐링 스트랩 당기기에서 시티드 로잉, 트라이셉스 슬리밍으로 이어져 상체 전·후면을 균형 있게 사용합니다.',
    unilateralBalanceNoteKo: '스파인 트위스트 구간은 좌우 순차(left-then-right) 모드로 동일한 횟수와 시간을 배정합니다.',
    editingGuideKo: '무릎이 예민한 대상자가 있다면 닐링 동작을 시티드 크로스레그 자세로 바꿔 진행할 수 있습니다.',
    items: [
      {
        exerciseId: 'ex-upper-01',
        durationMin: 4,
        explanationSec: 20,
        sideMode: 'left-then-right',
        instructorNote: '쇄골을 넓게 열고 스트랩을 당긴 뒤 좌우 흉추 회전을 대칭으로 이어갑니다.',
      },
      {
        exerciseId: 'ex-upper-02',
        durationMin: 4,
        explanationSec: 20,
        instructorNote: '좌골을 수직으로 세워 써브 어 트레이와 더 쉐이브 암 경로를 정교하게 컨트롤합니다.',
      },
      {
        exerciseId: 'ex-kr-reformer-03',
        durationMin: 4,
        explanationSec: 20,
        instructorNote: '팔꿈치를 몸통 옆에 고정하고 전완근을 뻗어내며 삼두근과 능형근을 연결합니다.',
      },
    ],
  },

  // 12. Cadillac Main Upper Body Lv 1.5 - upper-thoracic-opening
  {
    id: 'block-cadillac-main-armsprings-rotation-15',
    title: '캐딜락 암 스프링 프레스 & 스탠딩 펀치 로테이션 블록',
    description: '시티드 흉곽 회전에서 수파인 암 스프링 프레스, 스탠딩 펀치·살루트로 이어지는 캐딜락 상체 블록입니다.',
    sectionRole: 'main',
    apparatus: 'cadillac',
    level: '1.5',
    theme: 'upper-thoracic-opening',
    category: 'upper-body',
    targetAudienceSummaryKo: '캐딜락 암 스프링을 활용해 견갑 안정과 몸통 회전 협응을 기르는 상체·코어 수업',
    flowRationaleKo: '앉은 자세 흉곽 회전 예열 후 누운 암 프레스와 선 자세 다이나믹 암 워크로 에너지를 끌어올립니다.',
    unilateralBalanceNoteKo: '회전과 스탠딩 펀치 구간 모두 좌우 동일 횟수(left-then-right)로 균형을 맞춥니다.',
    editingGuideKo: '스프링 높이와 스탠딩 보폭을 조절해 저항 강도를 세밀하게 가감할 수 있습니다.',
    items: [
      {
        exerciseId: 'original-cadillac-seated-rotation',
        durationMin: 3,
        explanationSec: 15,
        sideMode: 'left-then-right',
        instructorNote: '양쪽 좌골 지지를 유지한 채 흉곽을 좌우로 부드럽게 회전합니다.',
      },
      {
        exerciseId: 'original-cadillac-arm-spring-press',
        durationMin: 4,
        explanationSec: 20,
        instructorNote: '어깨가 들리지 않는 범위에서 암 스프링을 몸 옆으로 길게 누르고 복귀합니다.',
      },
      {
        exerciseId: 'ex-upper-03',
        durationMin: 5,
        explanationSec: 20,
        sideMode: 'left-then-right',
        instructorNote: '필라테스 스탠스에서 코어 중심을 지키며 복싱 트위스트와 체스트 익스팬션을 진행합니다.',
      },
    ],
  },

  // 13. Reformer Main Lower Body (Split Left/Right Demonstration) Lv 1.5 - lower-glute-balance
  {
    id: 'block-reformer-main-scooter-splits-15',
    title: '리포머 스탠딩 스쿠터 좌·우 분할 & 사이드 스플릿 하체 블록',
    description: '스탠딩 스쿠터·런지를 좌측과 우측 독립 스텝으로 균등 분할하고 사이드 스플릿으로 마무리하는 하체 블록입니다.',
    sectionRole: 'main',
    apparatus: 'reformer',
    level: '1.5',
    theme: 'lower-glute-balance',
    category: 'lower-body',
    targetAudienceSummaryKo: '좌우 둔근·하지 지지 시간을 초 단위까지 대칭으로 관리하고 싶은 리포머 하체 집중 수업',
    flowRationaleKo: '동일 1R 스프링과 스탠딩 포지션에서 스쿠터 좌측·우측 분할 수행 후 사이드 스플릿으로 연결됩니다.',
    unilateralBalanceNoteKo: '스쿠터 좌측(left) 4분과 우측(right) 4분을 동일한 설명·전환·횟수·세트로 1:1 대칭 배치했습니다.',
    editingGuideKo: '사이드 스플릿을 생략해 8분 단일 스쿠터 블록으로 쓰거나 미니볼 내전근 펄스를 추가할 수 있습니다.',
    items: [
      {
        exerciseId: 'ex-lower-01',
        durationMin: 4,
        explanationSec: 15,
        transitionSec: 10,
        repetitions: 10,
        sets: 2,
        sideMode: 'left',
        instructorNote: '왼쪽 지지 다리 무릎 정렬을 고정하고 둔근 힘으로 캐리지를 밀고 복귀합니다.',
      },
      {
        exerciseId: 'ex-lower-01',
        durationMin: 4,
        explanationSec: 15,
        transitionSec: 10,
        repetitions: 10,
        sets: 2,
        sideMode: 'right',
        instructorNote: '오른쪽 지지 다리로 대칭 전환하여 동일한 횟수와 템포로 스쿠터·런지를 수행합니다.',
      },
      {
        exerciseId: 'ex-lower-02',
        durationMin: 5,
        explanationSec: 20,
        transitionSec: 15,
        repetitions: 10,
        sets: 2,
        sideMode: 'left-then-right',
        instructorNote: '플랫폼 발부터 안전하게 올라서서 중둔근과 내전근 힘으로 사이드 스플릿을 이어갑니다.',
      },
    ],
  },

  // 14. Chair Main Lower Body Lv 2.0 - lower-glute-balance
  {
    id: 'block-chair-main-stepup-climber-20',
    title: '운다 체어 교대 페달 풋워크 & 스탠딩 포워드 런지 블록',
    description: '시티드 더블/교대 페달 프레스로 하지를 예열한 뒤 스탠딩 포워드 런지·마운틴 클라이머로 이어지는 블록입니다.',
    sectionRole: 'main',
    apparatus: 'chair',
    level: '2.0',
    theme: 'lower-glute-balance',
    category: 'lower-body',
    targetAudienceSummaryKo: '체어 특유의 수직 저항을 활용해 둔근·대퇴사두근 지지력과 코어 밸런스를 높이는 심화 수업',
    flowRationaleKo: '시티드 페달 컨트롤(Lv.1.5)에서 스탠딩 포워드 런지(Lv.2.0)로 점진 상승해 무리 없는 빌드업을 만듭니다.',
    unilateralBalanceNoteKo: '교대 페달과 포워드 런지 모두 좌우 순차(left-then-right) 모드로 양측 볼륨을 균등하게 유지합니다.',
    editingGuideKo: '균형 보조가 필요할 경우 핸들을 장착하거나 시티드 카프 레이즈로 대체해 난이도를 낮출 수 있습니다.',
    items: [
      {
        exerciseId: 'ex-footwork-03',
        durationMin: 4,
        explanationSec: 20,
        instructorNote: '좌골을 체어 시트에 수직으로 세우고 복부 코르셋을 유지한 채 페달을 프레스합니다.',
      },
      {
        exerciseId: 'original-chair-alternating-pedal',
        durationMin: 4,
        explanationSec: 20,
        sideMode: 'left-then-right',
        instructorNote: '골반이 좌우로 흔들리지 않게 지키며 한쪽 페달씩 일정한 속도로 교대 컨트롤합니다.',
      },
      {
        exerciseId: 'ex-lower-03',
        durationMin: 6,
        explanationSec: 25,
        sideMode: 'left-then-right',
        instructorNote: '시트 위 뒤꿈치에 체중을 실어 스텝업하고 상단에서 마운틴 클라이머 펌핑을 연결합니다.',
      },
    ],
  },

  // 15. Reformer Main Plank Lv 1.5 - athletic-plank-control
  {
    id: 'block-reformer-main-plank-stretch-15',
    title: '리포머 롱 스트레치 & 엘리펀트 전신 플랭크 블록',
    description: '닐링 리버스 앱스로 전거근·하복부를 깨운 뒤 롱 스트레치와 엘리펀트로 이어지는 리포머 플랭크 블록입니다.',
    sectionRole: 'main',
    apparatus: 'reformer',
    level: '1.5',
    theme: 'athletic-plank-control',
    category: 'plank',
    targetAudienceSummaryKo: '견갑대 지지력과 파워하우스 전신 연결을 집중 훈련하는 리포머 중급 수업',
    flowRationaleKo: '무릎 지지 코어 컨트롤에서 전신 플랭크 및 엘리펀트로 연결되어 손목과 어깨 부담을 줄입니다.',
    unilateralBalanceNoteKo: '양손 푸시 힘과 양발 뒤꿈치 지지력을 대칭으로 유지하여 몸통 회전을 방지합니다.',
    editingGuideKo: '롱 스트레치가 부담스러운 경우 무릎을 내린 니 스트레치 레이어로 즉시 전환해 진행하세요.',
    items: [
      {
        exerciseId: 'ex-core-04',
        durationMin: 4,
        explanationSec: 20,
        instructorNote: '풋바나 숄더레스트를 잡고 아랫배 스쿱으로 무릎을 당기며 견갑대를 안정시킵니다.',
      },
      {
        exerciseId: 'ex-plank-01',
        durationMin: 4,
        explanationSec: 20,
        instructorNote: '풋바를 밀어 전거근을 채운 뒤 플랭크 롱 스트레치와 엘리펀트를 연속 수행합니다.',
      },
    ],
  },

  // 16. Chair Main Plank & Pike Lv 2.0 - athletic-plank-control
  {
    id: 'block-chair-main-pike-plank-20',
    title: '운다 체어 인클라인 서포트 & 파이크 풀업 코어 블록',
    description: '고정 좌면 인클라인 플랭크 준비에서 페달 플랭크, 더블 레그 파이크 풀업으로 이어지는 체어 피크 블록입니다.',
    sectionRole: 'main',
    apparatus: 'chair',
    level: '2.0',
    theme: 'athletic-plank-control',
    category: 'plank',
    targetAudienceSummaryKo: '운다 체어에서 하복부 스쿱과 견갑대 전거근 컨트롤의 정점을 경험하는 숙련자 수업',
    flowRationaleKo: '인클라인 지지(Lv.1.5)로 손목·어깨 정렬을 세팅한 뒤 페달 플랭크와 파이크 풀업(Lv.2.0)으로 연결합니다.',
    unilateralBalanceNoteKo: '양손 시트 지지와 두 발 페달 프레스를 대칭으로 유지해 골반이 한쪽으로 빠지지 않게 합니다.',
    editingGuideKo: '손목 부담이 있을 때는 시트 위에 전완근을 대는 포암 플랭크 홀드로 변경해 진행하세요.',
    items: [
      {
        exerciseId: 'original-chair-incline-support',
        durationMin: 3,
        explanationSec: 15,
        instructorNote: '고정 좌면에 양손을 짚고 정수리부터 뒤꿈치까지 긴 사선 지지를 먼저 확인합니다.',
      },
      {
        exerciseId: 'ex-kr-chair-01',
        durationMin: 4,
        explanationSec: 20,
        instructorNote: '날개뼈 사이를 채운 플랭크 자세에서 복부 수축으로 페달을 부드럽게 끌어올립니다.',
      },
      {
        exerciseId: 'ex-plank-02',
        durationMin: 4,
        explanationSec: 20,
        instructorNote: '명치와 아랫배를 천장 쪽으로 끌어올리는 힘으로 파이크 업 앤 다운을 컨트롤합니다.',
      },
    ],
  },

  // 17. Barrel Main Extension & Core Lv 2.0 - upper-thoracic-opening
  {
    id: 'block-barrel-main-swan-sidebend-20',
    title: '래더 바렐 스완 다이브 & 사이드 벤드 척추 입체 블록',
    description: '바렐 시티드 스파인 리치와 스완 신전, 사이드 벤드를 결합해 굴곡·신전·측굴을 아우르는 바렐 메인 블록입니다.',
    sectionRole: 'main',
    apparatus: 'barrel',
    level: '2.0',
    theme: 'upper-thoracic-opening',
    category: 'extension',
    targetAudienceSummaryKo: '바렐의 곡면을 활용해 척추 신전과 옆구리 복사근 지지력을 깊이 있게 다루는 수업',
    flowRationaleKo: '시티드 리치(Lv.1.5)에서 프론 스완(Lv.1.5), 사이드 벤드(Lv.2.0) 순서로 척추 3면 움직임을 완성합니다.',
    unilateralBalanceNoteKo: '사이드 벤드는 좌우 순차(left-then-right) 모드로 양쪽 옆구리 수행 시간을 똑같이 맞춥니다.',
    editingGuideKo: 'Lv.1.5 수업에 적용할 때는 마지막 사이드 벤드를 바렐 지지 암 리치로 교체해 사용할 수 있습니다.',
    items: [
      {
        exerciseId: 'original-barrel-seated-spine-reach',
        durationMin: 4,
        explanationSec: 20,
        instructorNote: '앉은 지지와 발 고정을 확인한 뒤 몸통을 짧게 기울였다 복부 힘으로 돌아옵니다.',
      },
      {
        exerciseId: 'ex-extension-02',
        durationMin: 4,
        explanationSec: 20,
        instructorNote: '둔근과 햄스트링 지지를 바탕으로 바렐 곡선을 따라 긴 아치형 스완 신전을 만듭니다.',
      },
      {
        exerciseId: 'original-barrel-supported-side-bend',
        durationMin: 4,
        explanationSec: 20,
        sideMode: 'left-then-right',
        instructorNote: '측면 지지와 발 고정을 유지하며 위쪽 옆구리와 갈비뼈를 연결해 짧게 올라옵니다.',
      },
    ],
  },

  // 18. Mixed Main Reformer + Chair Lv 1.5 - full-body-flow
  {
    id: 'block-mixed-main-reformer-chair-flow-15',
    title: '리포머 롱박스 스완 & 운다 체어 풋워크 콤비 메인 블록',
    description: '리포머 롱박스 풀링 스트랩 스완에서 운다 체어 시티드 풋워크와 스파인 트위스트로 이어지는 콤비 블록입니다.',
    sectionRole: 'main',
    apparatus: 'mixed',
    level: '1.5',
    theme: 'full-body-flow',
    category: 'extension',
    targetAudienceSummaryKo: '리포머 후면 신전과 체어 수직 하지·회전 컨트롤을 한 블록으로 묶어 쓰는 콤비 기구 수업',
    flowRationaleKo: '리포머 프론 스완 후 기구 전환 시간(45초)을 확보해 체어 시티드 풋워크·트위스트로 매끄럽게 이동합니다.',
    unilateralBalanceNoteKo: '체어 스파인 트위스트는 좌우 대칭(left-then-right)으로 회전 범위를 균등하게 맞춥니다.',
    editingGuideKo: '기구 이동 동선에 따라 전환 시간을 45~60초로 여유 있게 조정해 사용할 수 있습니다.',
    items: [
      {
        exerciseId: 'ex-extension-01',
        durationMin: 4,
        explanationSec: 20,
        transitionSec: 0,
        instructorNote: '롱박스 위에서 스트랩을 골반 옆으로 당기며 상부 흉추를 길게 신전합니다.',
      },
      {
        exerciseId: 'ex-footwork-03',
        durationMin: 5,
        explanationSec: 20,
        transitionSec: 45,
        instructorNote: '체어로 이동해 좌골 수직 정렬을 세팅하고 더블 레그 페달 펌프를 진행합니다.',
      },
      {
        exerciseId: 'original-chair-seated-spine-twist',
        durationMin: 4,
        explanationSec: 15,
        transitionSec: 15,
        sideMode: 'left-then-right',
        instructorNote: '체어 좌면 지지를 유지한 채 가슴을 좌우로 회전하며 상체 가동성을 정리합니다.',
      },
    ],
  },

  // 19. Reformer Cooldown Straps & Mermaid Lv 1.0 - cooldown-mobility-release
  {
    id: 'block-reformer-cooldown-straps-mermaid-10',
    title: '리포머 핏인스트랩 프로그 & 머메이드 이완 쿨다운 블록',
    description: '핏인스트랩 프로그·레그써클로 고관절 주변을 부드럽게 풀고 머메이드 측굴 호흡으로 마무리하는 블록입니다.',
    sectionRole: 'cooldown',
    apparatus: 'reformer',
    level: '1.0',
    theme: 'cooldown-mobility-release',
    category: 'feet-in-straps',
    targetAudienceSummaryKo: '리포머 수업 후반 내전근·햄스트링 신장과 측면 흉곽 이완을 우아하게 연결하는 마무리 구간',
    flowRationaleKo: '핏인스트랩으로 하지를 이완한 뒤 스트랩을 정리하고 시티드 머메이드로 앉아 자연스럽게 수업을 마칩니다.',
    unilateralBalanceNoteKo: '머메이드 측굴과 회전 스트레칭은 좌우 동일 시간(left-then-right)으로 대칭 진행합니다.',
    editingGuideKo: '남은 수업 시간에 맞춰 핏인스트랩을 3~5분, 머메이드를 2~4분으로 유연하게 조절하세요.',
    items: [
      {
        exerciseId: 'ex-straps-01',
        durationMin: 4,
        explanationSec: 20,
        instructorNote: '꼬리뼈를 캐리지에 무겁게 두고 프로그와 레그써클로 고관절을 부드럽게 움직입니다.',
      },
      {
        exerciseId: 'ex-cooldown-01',
        durationMin: 3,
        explanationSec: 15,
        sideMode: 'left-then-right',
        instructorNote: 'Z-Sit 자세에서 풋바를 밀며 좌우 옆구리 측굴과 깊은 호흡을 이어갑니다.',
      },
    ],
  },

  // 20. Mat Cooldown Mermaid & Open Book Lv 1.0 - cooldown-mobility-release
  {
    id: 'block-mat-cooldown-mermaid-openbook-10',
    title: '매트 머메이드 측굴 & 사이드 오픈 북 흉곽 이완 블록',
    description: '앉은 자세 머메이드 측굴과 옆으로 누운 오픈 북 흉곽 회전을 연결해 전신 긴장을 정돈하는 매트 쿨다운 블록입니다.',
    sectionRole: 'cooldown',
    apparatus: 'mat',
    level: '1.0',
    theme: 'cooldown-mobility-release',
    category: 'cooldown',
    targetAudienceSummaryKo: '모든 매트·소도구 수업 마지막 6분 동안 옆구리와 흉곽 회전을 편안하게 이완하는 클로징',
    flowRationaleKo: '시티드 측굴에서 사이드 라잉 오픈 북으로 이어져 호흡을 차분히 가라앉히며 마무리하기 좋습니다.',
    unilateralBalanceNoteKo: '머메이드와 오픈 북 모두 좌우 순차(left-then-right)로 양쪽 흉곽을 고르게 열어줍니다.',
    editingGuideKo: '시간이 부족한 15~20분 단기 수업에서는 두 동작 중 하나만 선택해 3분 클로징으로 활용하세요.',
    items: [
      {
        exerciseId: 'original-mat-mermaid',
        durationMin: 3,
        explanationSec: 15,
        sideMode: 'left-then-right',
        instructorNote: '편안하게 앉아 한 팔을 길게 뻗으며 좌우 옆구리의 호흡 공간을 넓혀줍니다.',
      },
      {
        exerciseId: 'original-mat-open-book',
        durationMin: 3,
        explanationSec: 15,
        sideMode: 'left-then-right',
        instructorNote: '옆으로 누워 위쪽 팔을 부드럽게 열며 흉곽과 어깨 앞쪽을 이완합니다.',
      },
    ],
  },
];

export const OFFLINE_BLOCK_PRESETS: readonly OfflineBlockPreset[] = deepFreeze(
  BLOCK_PRESET_SPECS.map(buildOfflineBlockPreset),
);

const BLOCK_PRESET_BY_ID = new Map<string, OfflineBlockPreset>(
  OFFLINE_BLOCK_PRESETS.map((block) => [block.id, block]),
);

interface ClassStepSpec {
  readonly exerciseId: string;
  readonly blockCategory?: ClassBlockCategory;
  readonly classSection?: ClassSectionRole;
  readonly durationMin: number;
  readonly explanationSec?: number;
  readonly transitionSec?: number;
  readonly repetitions?: number;
  readonly sets?: number;
  readonly sideMode?: StepSideMode;
  readonly selectedLayer?: LayerMode;
  readonly customSpringOverride?: string;
  readonly instructorNote: string;
  readonly sourceBlockId?: string;
}

interface OfflineClassPresetSpec {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly durationMinutes: PresetDurationMinutes;
  readonly theme: PresetThemeId;
  readonly apparatus: ApparatusType | 'mixed';
  readonly level: DifficultyLevel;
  readonly tempo: WorkoutTempo;
  readonly focusPreset: AutoGenerateCriteria['focusPreset'];
  readonly focusTags: readonly string[];
  readonly userSummaryKo: string;
  readonly flowRationaleKo: string;
  readonly unilateralBalanceNoteKo: string;
  readonly editingGuideKo: string;
  readonly composedBlockPresetIds: readonly string[];
  readonly steps: readonly ClassStepSpec[];
}

function buildOfflineClassPreset(spec: OfflineClassPresetSpec): OfflineClassPreset {
  const themeMeta = THEME_BY_ID.get(spec.theme);
  if (!themeMeta) {
    throw new Error(`알 수 없는 프리셋 테마입니다: ${spec.theme}`);
  }

  const prelimSteps: SequenceStep[] = spec.steps.map((stepSpec, idx) => {
    const ex = requireCatalogExercise(stepSpec.exerciseId);
    const blockCategory = stepSpec.blockCategory ?? ex.blockCategory;
    const classSection: ClassSectionRole =
      stepSpec.classSection ?? getMovementSectionRole(blockCategory);
    const sideMode: StepSideMode =
      stepSpec.sideMode ?? (ex.isUnilateral ? 'left-then-right' : 'together');

    return {
      kind: 'exercise',
      stepId: `${spec.id}-step-${idx + 1}`,
      order: idx + 1,
      blockCategory,
      classSection,
      exerciseId: ex.id,
      durationMin: stepSpec.durationMin,
      explanationSec: stepSpec.explanationSec ?? 20,
      transitionSec: stepSpec.transitionSec,
      repetitions: stepSpec.repetitions ?? (ex.isUnilateral ? 6 : 8),
      sets: stepSpec.sets ?? 2,
      sideMode,
      selectedLayer: stepSpec.selectedLayer ?? 'standard',
      customSpringOverride: stepSpec.customSpringOverride,
      instructorNote: stepSpec.instructorNote,
      sourceBlockId: stepSpec.sourceBlockId,
      locked: false,
    };
  });

  const resolvedSteps: SequenceStep[] = prelimSteps.map((step, idx) => {
    const ex = requireCatalogExercise(step.exerciseId);
    let transitionSec = step.transitionSec;
    if (transitionSec === undefined) {
      if (idx === 0) {
        transitionSec = 0;
      } else {
        const detail = calculateApparatusTransitionDetail(
          prelimSteps[idx - 1],
          step,
          idx - 1,
          idx,
          INITIAL_EXERCISES,
        );
        transitionSec = detail.recommendedTransitionSec;
      }
    }

    return {
      ...step,
      transitionSec,
      exerciseSnapshot: createMovementSnapshot(ex, PRESET_TIMESTAMP_ISO),
    };
  });

  const equipmentSet = new Set<string>();
  const propSet = new Set<PropType>();

  for (const step of resolvedSteps) {
    const ex = requireCatalogExercise(step.exerciseId);
    const eq = getExerciseEquipment(ex);
    eq.requiredEquipment.forEach((reqId) => equipmentSet.add(reqId));
    ex.props.forEach((prop) => {
      if (prop !== 'none') propSet.add(prop);
    });
  }

  const timeBreakdown = calculateSequenceTimeBreakdown(
    resolvedSteps,
    INITIAL_EXERCISES,
    spec.durationMinutes,
  );

  return deepFreeze({
    id: spec.id,
    presetKind: 'class-sequence',
    title: spec.title,
    subtitle: spec.subtitle,
    durationMinutes: spec.durationMinutes,
    theme: spec.theme,
    themeLabelKo: themeMeta.labelKo,
    apparatus: spec.apparatus,
    requiredEquipment: [...equipmentSet],
    recommendedProps: propSet.size > 0 ? [...propSet] : ['none'],
    level: spec.level,
    tempo: spec.tempo,
    focusPreset: spec.focusPreset,
    focusTags: [...spec.focusTags],
    userSummaryKo: spec.userSummaryKo,
    flowRationaleKo: spec.flowRationaleKo,
    unilateralBalanceNoteKo: spec.unilateralBalanceNoteKo,
    editingGuideKo: spec.editingGuideKo,
    composedBlockPresetIds: [...spec.composedBlockPresetIds],
    steps: resolvedSteps,
    timeBreakdown,
    safetyBoundary: DEFAULT_PRESET_SAFETY_BOUNDARY,
    createdAt: PRESET_TIMESTAMP_ISO,
    updatedAt: PRESET_TIMESTAMP_ISO,
  });
}

/**
 * 4. 오프라인 완성형 수업 시퀀스 프리셋 카탈로그 (18종)
 * - 시간: 15 / 20 / 30 / 45 / 50 / 60분 전 구간 커버
 * - 기구: mat / reformer / cadillac / chair / barrel / mixed 전 기구 커버
 * - 난이도: 1.0 / 1.5 / 2.0 전 레벨 커버
 * - 주제: 7대 PresetThemeId 전 테마 커버
 */
const CLASS_PRESET_SPECS: readonly OfflineClassPresetSpec[] = [
  // 01. 15분 | Mat | Lv 1.0 | breath-pelvic-foundation
  {
    id: 'preset-class-mat-15-breath-foundation-10',
    title: '매트 15분 호흡·골반 기초 정렬 익스프레스',
    subtitle: '수파인 호흡 관찰부터 골반 시계·매트 브리지·머메이드까지 부담 없이 연결하는 15분 기초 루틴',
    durationMinutes: 15,
    theme: 'breath-pelvic-foundation',
    apparatus: 'mat',
    level: '1.0',
    tempo: 'slow-precise',
    focusPreset: 'mobility-rehab',
    focusTags: ['15분 익스프레스', '호흡 인지', '골반 중립 조절', '매트 기초'],
    userSummaryKo: '짧은 시간 안에 흉곽 호흡과 골반 중립 조절, 둔근 기초 지지를 차분하게 경험하는 15분 매트 수업입니다.',
    flowRationaleKo: '수파인 자세에서 호흡·골반 시계·매트 브리지까지 한 번에 진행한 뒤 시티드 머메이드로 일어나며 마무리합니다.',
    unilateralBalanceNoteKo: '머메이드 측굴은 좌우 순차(left-then-right) 모드로 양쪽 옆구리를 동일하게 열어줍니다.',
    editingGuideKo: '브리지 대신 힐 슬라이드를 넣으면 복부 중심 조절 비중을 더 높일 수 있습니다.',
    composedBlockPresetIds: ['block-mat-prep-breath-clock-10', 'block-mat-cooldown-mermaid-openbook-10'],
    steps: [
      {
        exerciseId: 'original-mat-rib-breath',
        classSection: 'preparation',
        durationMin: 3,
        explanationSec: 20,
        instructorNote: '편안히 누워 갈비뼈 옆면과 뒷면으로 숨이 들어오는 감각을 깨웁니다.',
        sourceBlockId: 'block-mat-prep-breath-clock-10',
      },
      {
        exerciseId: 'original-mat-pelvic-clock',
        classSection: 'main',
        blockCategory: 'core',
        durationMin: 4,
        explanationSec: 20,
        instructorNote: '골반의 앞뒤 기울임과 시계 방향 움직임으로 중심 조절을 연습합니다.',
      },
      {
        exerciseId: 'original-mat-bridge',
        classSection: 'main',
        durationMin: 5,
        explanationSec: 20,
        instructorNote: '두 발바닥 압력을 고르게 느끼며 골반을 들어 올려 후면 지지를 연결합니다.',
      },
      {
        exerciseId: 'original-mat-mermaid',
        classSection: 'cooldown',
        durationMin: 3,
        explanationSec: 15,
        sideMode: 'left-then-right',
        instructorNote: '앉은 자세에서 좌우 옆구리를 길게 늘리며 호흡을 정리합니다.',
        sourceBlockId: 'block-mat-cooldown-mermaid-openbook-10',
      },
    ],
  },

  // 02. 15분 | Reformer | Lv 1.0 | cooldown-mobility-release
  {
    id: 'preset-class-reformer-15-mobility-release-10',
    title: '리포머 15분 고관절 가동성 & 머메이드 릴리즈',
    subtitle: '캐리지 호흡 예열 후 패럴렐 풋워크·핏인스트랩·머메이드로 부드럽게 풀어내는 15분 리포머 플로우',
    durationMinutes: 15,
    theme: 'cooldown-mobility-release',
    apparatus: 'reformer',
    level: '1.0',
    tempo: 'slow-precise',
    focusPreset: 'mobility-rehab',
    focusTags: ['15분 리포머', '핏인스트랩', '고관절 가동성', '부드러운 이완'],
    userSummaryKo: '과도한 긴장 없이 캐리지 위에서 하지 정렬과 고관절 원운동, 측면 흉곽 이완을 연결하는 15분 루틴입니다.',
    flowRationaleKo: '수파인 호흡에서 패럴렐 풋워크와 핏인스트랩까지 누운 자세를 유지한 뒤 마지막 머메이드로 앉아 마무리합니다.',
    unilateralBalanceNoteKo: '머메이드 측굴 구간을 좌우 대칭(left-then-right)으로 배정해 양측 균형을 맞춥니다.',
    editingGuideKo: '마무리 구간을 닐링 런지 스트레치(ex-global-reformer-03)로 바꾸면 장요근 신장 비중을 높일 수 있습니다.',
    composedBlockPresetIds: [
      'block-reformer-prep-breath-imprint-10',
      'block-reformer-cooldown-straps-mermaid-10',
    ],
    steps: [
      {
        exerciseId: 'original-reformer-supine-breath',
        classSection: 'preparation',
        durationMin: 3,
        explanationSec: 20,
        instructorNote: '캐리지 위에서 호흡과 작은 암 아크로 어깨와 몸통의 긴장을 내려놓습니다.',
        sourceBlockId: 'block-reformer-prep-breath-imprint-10',
      },
      {
        exerciseId: 'original-reformer-parallel-footwork',
        classSection: 'main',
        durationMin: 4,
        explanationSec: 20,
        instructorNote: '두 발의 간격을 나란히 두고 일정한 속도로 캐리지를 밀고 복귀합니다.',
      },
      {
        exerciseId: 'ex-straps-01',
        classSection: 'main',
        durationMin: 5,
        explanationSec: 20,
        instructorNote: '긴 스트랩을 발아치에 걸고 프로그와 레그써클로 고관절 가동성을 넓힙니다.',
        sourceBlockId: 'block-reformer-cooldown-straps-mermaid-10',
      },
      {
        exerciseId: 'ex-cooldown-01',
        classSection: 'cooldown',
        durationMin: 3,
        explanationSec: 15,
        sideMode: 'left-then-right',
        instructorNote: '인어공주 자세에서 좌우 옆구리 측굴과 흉추 회전으로 호흡을 정돈합니다.',
        sourceBlockId: 'block-reformer-cooldown-straps-mermaid-10',
      },
    ],
  },

  // 03. 20분 | Reformer | Lv 1.5 | upper-thoracic-opening
  {
    id: 'preset-class-reformer-20-upper-thoracic-15',
    title: '리포머 20분 상체·흉추 가동성 & 견갑 안정 플로우',
    subtitle: '펠빅 클락 예열부터 스트랩 암 프레스·닐링 체스트 익스팬션·시티드 로잉까지 상체 라인에 집중하는 20분',
    durationMinutes: 20,
    theme: 'upper-thoracic-opening',
    apparatus: 'reformer',
    level: '1.5',
    tempo: 'moderate-flow',
    focusPreset: 'posture-upper',
    focusTags: ['20분 상체 집중', '견갑대 안정', '흉추 가동성', '스트랩 로잉'],
    userSummaryKo: '말린 어깨를 열고 견갑대 하강 안정과 후면 삼각근·광배근 협응을 집중적으로 다루는 20분 리포머 수업입니다.',
    flowRationaleKo: '수파인 예열과 암 프레스 후 닐링 체스트 익스팬션, 시티드 로잉, 닐링 스트레치로 자연스럽게 이어집니다.',
    unilateralBalanceNoteKo: '닐링 스파인 트위스트와 마무리 닐링 스트레치 모두 좌우 동일 시간으로 진행합니다.',
    editingGuideKo: '시티드 로잉 대신 닐링 트라이셉스 프레스(ex-kr-reformer-03)를 넣으면 팔 뒤쪽 자극을 강조할 수 있습니다.',
    composedBlockPresetIds: ['block-reformer-main-upper-rowing-15'],
    steps: [
      {
        exerciseId: 'ex-warmup-01',
        classSection: 'preparation',
        durationMin: 3,
        explanationSec: 20,
        instructorNote: '미니볼과 함께 흉식 호흡을 세팅하고 쇄골을 옆으로 길게 펼쳐줍니다.',
      },
      {
        exerciseId: 'original-reformer-supine-arm-press',
        classSection: 'main',
        durationMin: 4,
        explanationSec: 20,
        instructorNote: '누운 자세에서 핸드 스트랩을 골반 옆으로 누르며 광배근과 코어를 먼저 연결합니다.',
      },
      {
        exerciseId: 'ex-upper-01',
        classSection: 'main',
        durationMin: 5,
        explanationSec: 20,
        sideMode: 'left-then-right',
        instructorNote: '톨 닐링 체스트 익스팬션과 좌우 스파인 트위스트로 열린 가슴 정렬을 만듭니다.',
        sourceBlockId: 'block-reformer-main-upper-rowing-15',
      },
      {
        exerciseId: 'ex-upper-02',
        classSection: 'main',
        durationMin: 5,
        explanationSec: 20,
        instructorNote: '써브 어 트레이와 더 쉐이브 동작으로 상체 전면·후면 밸런스를 조율합니다.',
        sourceBlockId: 'block-reformer-main-upper-rowing-15',
      },
      {
        exerciseId: 'ex-global-reformer-03',
        classSection: 'cooldown',
        durationMin: 3,
        explanationSec: 15,
        sideMode: 'left-then-right',
        instructorNote: '닐링 런지 스트레치로 고관절 앞쪽과 흉추를 길게 늘리며 마무리합니다.',
      },
    ],
  },

  // 04. 20분 | Chair | Lv 1.0 | lower-glute-balance
  {
    id: 'preset-class-chair-20-lower-support-10',
    title: '운다 체어 20분 하지 지지 & 스탠딩 균형 루틴',
    subtitle: '시티드 호흡·페달 프레스에서 앉았다 일어서기·지지 카프 레이즈·머메이드로 이어지는 20분 기초 체어',
    durationMinutes: 20,
    theme: 'lower-glute-balance',
    apparatus: 'chair',
    level: '1.0',
    tempo: 'slow-precise',
    focusPreset: 'glute-lower',
    focusTags: ['20분 체어', '하지 지지', '발목 안정성', '초급 밸런스'],
    userSummaryKo: '운다 체어의 안정된 좌면과 고정 지지를 활용해 무리 없이 하체 지지력과 발목 균형을 기르는 20분 수업입니다.',
    flowRationaleKo: '시티드 호흡과 페달 프레스 후 스탠딩 시트 투 스탠드·카프 레이즈로 이어지고 다시 앉아 머메이드로 마칩니다.',
    unilateralBalanceNoteKo: '마무리 체어 시티드 머메이드는 좌우 순차(left-then-right)로 대칭 수행합니다.',
    editingGuideKo: '각 동작의 반복 속도를 천천히 가져가면 등척성 지지 훈련 비중을 높일 수 있습니다.',
    composedBlockPresetIds: ['block-chair-prep-seated-foundation-10'],
    steps: [
      {
        exerciseId: 'original-chair-seated-breath',
        classSection: 'preparation',
        durationMin: 3,
        explanationSec: 20,
        instructorNote: '체어 좌면 위에서 양쪽 좌골 지지와 편안한 흉곽 호흡을 먼저 세팅합니다.',
        sourceBlockId: 'block-chair-prep-seated-foundation-10',
      },
      {
        exerciseId: 'original-chair-seated-pedal-press',
        classSection: 'main',
        durationMin: 5,
        explanationSec: 20,
        instructorNote: '두 발로 페달을 고르게 누르고 허벅지 뒤쪽 힘으로 복귀 속도를 제어합니다.',
      },
      {
        exerciseId: 'original-chair-sit-to-stand',
        classSection: 'main',
        durationMin: 5,
        explanationSec: 20,
        instructorNote: '발바닥 전체로 바닥을 밀어 천천히 일어섰다가 고관절을 접어 안정적으로 앉습니다.',
      },
      {
        exerciseId: 'original-chair-supported-calf-raise',
        classSection: 'main',
        durationMin: 4,
        explanationSec: 20,
        instructorNote: '고정 지지를 잡고 발뒤꿈치를 들어 올렸다 천천히 내리며 발목과 종아리를 강화합니다.',
      },
      {
        exerciseId: 'original-chair-seated-mermaid',
        classSection: 'cooldown',
        durationMin: 3,
        explanationSec: 15,
        sideMode: 'left-then-right',
        instructorNote: '다시 좌면에 앉아 한 팔을 위로 길게 보내며 좌우 옆구리를 부드럽게 늘립니다.',
      },
    ],
  },

  // 05. 30분 | Mat | Lv 1.5 | core-spinal-control
  {
    id: 'preset-class-mat-30-core-spinal-15',
    title: '매트 30분 코어 컨트롤 & 척추 신전 밸런스',
    subtitle: '폼롤러 흉추 오프닝부터 체스트 리프트·앱 파이브·포암 플랭크·스위밍·오픈 북까지 꽉 찬 30분 매트',
    durationMinutes: 30,
    theme: 'core-spinal-control',
    apparatus: 'mat',
    level: '1.5',
    tempo: 'moderate-flow',
    focusPreset: 'core-sculpt',
    focusTags: ['30분 매트', '앱 파이브', '복횡근 컨트롤', '척추 분절'],
    userSummaryKo: '30분 동안 수파인 복부 시리즈와 닐링 플랭크, 프론 스위밍 신전을 입체적으로 연결하는 매트 코어 수업입니다.',
    flowRationaleKo: '수파인(폼롤러 릴리즈 → 체스트 리프트 → 앱 파이브) 후 닐링 플랭크, 프론 스위밍, 사이드 오픈 북으로 체위가 자연스럽게 흐릅니다.',
    unilateralBalanceNoteKo: '스위밍 준비와 오픈 북 모두 좌우 순차(left-then-right) 모드로 양측 대칭을 유지합니다.',
    editingGuideKo: '써클링이나 폼롤러 없이 맨몸 매트로만 진행해도 동일한 시간 배분으로 운영할 수 있습니다.',
    composedBlockPresetIds: ['block-mat-main-core-series-15', 'block-mat-cooldown-mermaid-openbook-10'],
    steps: [
      {
        exerciseId: 'ex-warmup-03',
        classSection: 'preparation',
        durationMin: 4,
        explanationSec: 20,
        instructorNote: '폼롤러 위에서 척추 정렬을 느끼며 큰 암써클로 가슴 앞쪽을 열어줍니다.',
      },
      {
        exerciseId: 'original-mat-chest-lift',
        classSection: 'main',
        durationMin: 5,
        explanationSec: 20,
        instructorNote: '갈비뼈 아랫부분을 부드럽게 닫으며 상체 컬업 높이와 호흡을 안정시킵니다.',
        sourceBlockId: 'block-mat-main-core-series-15',
      },
      {
        exerciseId: 'ex-core-03',
        classSection: 'main',
        durationMin: 7,
        explanationSec: 25,
        instructorNote: '앱 시리즈 오브 파이브 5가지 동작을 일정한 컬업 높이와 호흡으로 이어갑니다.',
        sourceBlockId: 'block-mat-main-core-series-15',
      },
      {
        exerciseId: 'original-mat-forearm-plank',
        classSection: 'main',
        durationMin: 5,
        explanationSec: 20,
        instructorNote: '팔꿈치와 무릎 지지로 몸통 길이를 유지하며 전거근과 복부 연결을 지킵니다.',
      },
      {
        exerciseId: 'original-mat-swimming-prep',
        classSection: 'main',
        durationMin: 5,
        explanationSec: 20,
        sideMode: 'left-then-right',
        instructorNote: '엎드린 자세에서 팔과 다리를 길게 뻗으며 몸통 흔들림 없이 후면 사슬을 깨웁니다.',
      },
      {
        exerciseId: 'original-mat-open-book',
        classSection: 'cooldown',
        durationMin: 4,
        explanationSec: 15,
        sideMode: 'left-then-right',
        instructorNote: '옆으로 누워 위쪽 팔을 천천히 열며 흉곽 회전과 호흡 이완으로 마무리합니다.',
        sourceBlockId: 'block-mat-cooldown-mermaid-openbook-10',
      },
    ],
  },

  // 06. 30분 | Reformer | Lv 1.5 | full-body-flow
  {
    id: 'preset-class-reformer-30-seamless-flow-15',
    title: '리포머 30분 상·하체 통합 코어 협응 익스프레스',
    subtitle: '런치타임 및 30분 집중 세션을 위해 풋워크·브릿지·코디네이션·트라이셉스·롱스트레치를 압축한 플로우',
    durationMinutes: 30,
    theme: 'full-body-flow',
    apparatus: 'reformer',
    level: '1.5',
    tempo: 'moderate-flow',
    focusPreset: 'full-body',
    focusTags: ['30분 리포머', '상하체 협응', '런치타임 플로우', '동선 최적화'],
    userSummaryKo: '30분 안에 리포머의 핵심 하지·브릿지·코어·상체·플랭크·쿨다운을 지체 없이 완주하는 압축형 전신 수업입니다.',
    flowRationaleKo: '수파인 3동작(예열·풋워크/브릿지·코디네이션)에서 닐링 암 워크, 쿼드러페드 플랭크, 시티드 머메이드로 이어집니다.',
    unilateralBalanceNoteKo: '마무리 머메이드 측굴을 좌우 동일 카운트(left-then-right)로 수행합니다.',
    editingGuideKo: '하체 비중을 더 높이고 싶다면 닐링 암 워크 자리에 스탠딩 스쿠터(ex-lower-01)를 배치해 보세요.',
    composedBlockPresetIds: ['block-reformer-main-core-coordination-15'],
    steps: [
      {
        exerciseId: 'ex-warmup-01',
        classSection: 'preparation',
        durationMin: 4,
        explanationSec: 20,
        instructorNote: '미니볼 내전근 연결과 흉식 호흡으로 30분 수업의 중심을 빠르게 세팅합니다.',
      },
      {
        exerciseId: 'ex-kr-reformer-01',
        classSection: 'main',
        durationMin: 6,
        explanationSec: 20,
        instructorNote: '패럴렐·필라테스 V 풋워크에서 헤드레스트를 내리고 분절 브릿지로 바로 연결합니다.',
      },
      {
        exerciseId: 'ex-kr-reformer-04',
        classSection: 'main',
        durationMin: 6,
        explanationSec: 20,
        instructorNote: '스트랩 암 프레스와 다리 뻗기를 결합해 상·하체 코어 협응을 끌어올립니다.',
        sourceBlockId: 'block-reformer-main-core-coordination-15',
      },
      {
        exerciseId: 'ex-kr-reformer-03',
        classSection: 'main',
        durationMin: 5,
        explanationSec: 20,
        instructorNote: '톨 닐링 자세에서 체스트 익스팬션과 트라이셉스 프레스로 상체 후면을 다듬습니다.',
      },
      {
        exerciseId: 'ex-plank-01',
        classSection: 'main',
        durationMin: 5,
        explanationSec: 20,
        instructorNote: '롱 스트레치와 엘리펀트로 전신 파워하우스 컨트롤을 완성합니다.',
      },
      {
        exerciseId: 'ex-cooldown-01',
        classSection: 'cooldown',
        durationMin: 4,
        explanationSec: 15,
        sideMode: 'left-then-right',
        instructorNote: '머메이드 측굴과 회전 스트레칭으로 호흡을 차분히 정리합니다.',
      },
    ],
  },

  // 07. 30분 | Barrel | Lv 1.5 | upper-thoracic-opening
  {
    id: 'preset-class-barrel-30-spine-extension-15',
    title: '래더 바렐 30분 척추 신전 & 흉곽 가동성 플로우',
    subtitle: '바렐 스탠딩 호흡부터 발목·둔근 지지, 시티드 스파인 리치, 스완 다이브까지 연결하는 30분 바렐 단독 루틴',
    durationMinutes: 30,
    theme: 'upper-thoracic-opening',
    apparatus: 'barrel',
    level: '1.5',
    tempo: 'moderate-flow',
    focusPreset: 'posture-upper',
    focusTags: ['30분 바렐', '스완 신전', '흉추 가동성', '둔근 지지'],
    userSummaryKo: '바렐과 래더를 활용해 선 자세 하체 지지부터 앉은 코어, 엎드린 스완 신전까지 고르게 경험하는 30분 수업입니다.',
    flowRationaleKo: '스탠딩 3구간(호흡·발목·힙 익스텐션) 후 시티드 스파인 리치, 프론 스완 다이브, 스탠딩 사이드 리치로 매끄럽게 이어집니다.',
    unilateralBalanceNoteKo: '스탠딩 힙 익스텐션과 마무리 사이드 리치는 좌우 순차(left-then-right)로 대칭 수행합니다.',
    editingGuideKo: '스완 다이브 구간에서 양손을 이마 아래에 두는 이지 레이어로 시작해 점진적으로 팔을 뻗어 올리세요.',
    composedBlockPresetIds: ['block-barrel-prep-standing-breath-ankle-10'],
    steps: [
      {
        exerciseId: 'original-barrel-standing-breath',
        classSection: 'preparation',
        durationMin: 4,
        explanationSec: 20,
        instructorNote: '바렐 앞 선 자세에서 두 발 접지와 흉곽 호흡 리듬을 차분히 관찰합니다.',
        sourceBlockId: 'block-barrel-prep-standing-breath-ankle-10',
      },
      {
        exerciseId: 'original-barrel-supported-ankle',
        classSection: 'main',
        durationMin: 5,
        explanationSec: 20,
        instructorNote: '래더를 가볍게 잡고 발뒤꿈치를 올렸다 내리며 발목과 종아리 지지력을 깨웁니다.',
        sourceBlockId: 'block-barrel-prep-standing-breath-ankle-10',
      },
      {
        exerciseId: 'original-barrel-standing-hip-extension',
        classSection: 'main',
        durationMin: 5,
        explanationSec: 20,
        sideMode: 'left-then-right',
        instructorNote: '몸통 기울기를 일정하게 지키며 한 다리씩 뒤로 길게 뻗어 둔근 지지를 유도합니다.',
      },
      {
        exerciseId: 'original-barrel-seated-spine-reach',
        classSection: 'main',
        durationMin: 6,
        explanationSec: 20,
        instructorNote: '바렐 위 앉은 지지와 발 고정을 확인하고 복부 힘으로 짧은 롤백과 복귀를 반복합니다.',
      },
      {
        exerciseId: 'ex-extension-02',
        classSection: 'main',
        durationMin: 6,
        explanationSec: 20,
        transitionSec: 45,
        instructorNote: '래더 하단에 발아치를 걸고 바렐 곡선을 따라 긴 아치형 백 익스텐션을 만듭니다.',
      },
      {
        exerciseId: 'original-barrel-standing-side-stretch',
        classSection: 'cooldown',
        durationMin: 4,
        explanationSec: 15,
        transitionSec: 45,
        sideMode: 'left-then-right',
        instructorNote: '바닥에 서서 고정 지지를 잡고 좌우 옆구리를 길게 늘리며 호흡을 정리합니다.',
      },
    ],
  },

  // 08. 45분 | Reformer (Balanced Split Left/Right Pair) | Lv 1.5 | lower-glute-balance
  {
    id: 'preset-class-reformer-45-glute-split-balance-15',
    title: '리포머 45분 하체·둔근 좌우 분할 밸런스 클래스',
    subtitle: '써클링 풋워크·브릿지 이후 스탠딩 스쿠터를 좌측·우측 독립 스텝으로 정밀 분할해 진행하는 45분 하체 특화',
    durationMinutes: 45,
    theme: 'lower-glute-balance',
    apparatus: 'reformer',
    level: '1.5',
    tempo: 'moderate-flow',
    focusPreset: 'glute-lower',
    focusTags: ['45분 리포머', '좌우 분할 밸런스', '둔근·하지 지지', '스쿠터·스플릿'],
    userSummaryKo: '하체와 둔근 지지력을 극대화하면서 스탠딩 스쿠터의 왼쪽·오른쪽 수행 시간을 독립 스텝으로 1:1 균등 배분한 45분 수업입니다.',
    flowRationaleKo: '수파인(웜업·풋워크·브릿지)에서 스탠딩(스쿠터 좌측 → 스쿠터 우측 → 사이드 스플릿), 프론 스완, 수파인 핏인스트랩, 머메이드로 이어집니다.',
    unilateralBalanceNoteKo: '스탠딩 스쿠터 왼쪽(left, 5분)과 오른쪽(right, 5분)을 동일한 설명(15초)·전환(15초)·횟수(10회)·세트(2세트)로 정확히 대칭 구성했습니다.',
    editingGuideKo: '스탠딩 구간 비중을 줄이고 싶다면 사이드 스플릿 대신 사이드 라잉 스트랩(ex-lower-04)으로 변경할 수 있습니다.',
    composedBlockPresetIds: [
      'block-reformer-main-footwork-alignment-15',
      'block-reformer-main-scooter-splits-15',
      'block-reformer-cooldown-straps-mermaid-10',
    ],
    steps: [
      {
        exerciseId: 'ex-warmup-01',
        classSection: 'preparation',
        durationMin: 4,
        explanationSec: 20,
        instructorNote: '미니볼을 무릎 사이에 끼우고 흉식 호흡과 골반 시계로 중심을 세팅합니다.',
      },
      {
        exerciseId: 'ex-footwork-02',
        classSection: 'main',
        durationMin: 6,
        explanationSec: 20,
        instructorNote: '써클링 외전 텐션을 유지하며 와이드 세컨드 풋워크로 중둔근을 먼저 깨웁니다.',
        sourceBlockId: 'block-reformer-main-footwork-alignment-15',
      },
      {
        exerciseId: 'ex-bridging-01',
        classSection: 'main',
        durationMin: 5,
        explanationSec: 20,
        instructorNote: '헤드레스트를 내리고 척추 분절 브릿지와 햄스트링 컬을 연결합니다.',
      },
      {
        exerciseId: 'ex-lower-01',
        classSection: 'main',
        durationMin: 5,
        explanationSec: 15,
        transitionSec: 15,
        repetitions: 10,
        sets: 2,
        sideMode: 'left',
        instructorNote: '왼쪽 다리를 바닥에 고정하고 둔근 지지 힘으로 스쿠터와 런지를 수행합니다.',
        sourceBlockId: 'block-reformer-main-scooter-splits-15',
      },
      {
        exerciseId: 'ex-lower-01',
        classSection: 'main',
        durationMin: 5,
        explanationSec: 15,
        transitionSec: 15,
        repetitions: 10,
        sets: 2,
        sideMode: 'right',
        instructorNote: '오른쪽 다리 지지로 전환해 왼쪽과 완전히 동일한 횟수·템포로 스쿠터를 진행합니다.',
        sourceBlockId: 'block-reformer-main-scooter-splits-15',
      },
      {
        exerciseId: 'ex-lower-02',
        classSection: 'main',
        durationMin: 6,
        explanationSec: 20,
        sideMode: 'left-then-right',
        instructorNote: '플랫폼과 캐리지에 두 발을 나누어 딛고 사이드 스플릿으로 내·외전근을 조율합니다.',
        sourceBlockId: 'block-reformer-main-scooter-splits-15',
      },
      {
        exerciseId: 'ex-extension-01',
        classSection: 'main',
        durationMin: 5,
        explanationSec: 20,
        instructorNote: '롱박스를 세팅하고 풀링 스트랩 스완으로 등 상부와 후면 사슬을 길게 펴줍니다.',
      },
      {
        exerciseId: 'ex-straps-01',
        classSection: 'main',
        durationMin: 5,
        explanationSec: 20,
        instructorNote: '박스를 내리고 핏인스트랩 프로그·써클로 하체 긴장을 부드럽게 풀어줍니다.',
        sourceBlockId: 'block-reformer-cooldown-straps-mermaid-10',
      },
      {
        exerciseId: 'ex-cooldown-01',
        classSection: 'cooldown',
        durationMin: 4,
        explanationSec: 15,
        sideMode: 'left-then-right',
        instructorNote: '머메이드 측굴과 호흡 정리로 45분 하체 집중 수업을 마무리합니다.',
        sourceBlockId: 'block-reformer-cooldown-straps-mermaid-10',
      },
    ],
  },

  // 09. 45분 | Cadillac | Lv 1.5 | core-spinal-control
  {
    id: 'preset-class-cadillac-45-articulation-flow-15',
    title: '캐딜락 45분 푸쉬스루 분절 & 레그스프링 코어 클래스',
    subtitle: '롤다운 바 예열부터 푸쉬스루바 티저·암 스프링·레그 스프링 프로그까지 캐딜락 단독으로 완성하는 45분',
    durationMinutes: 45,
    theme: 'core-spinal-control',
    apparatus: 'cadillac',
    level: '1.5',
    tempo: 'moderate-flow',
    focusPreset: 'core-sculpt',
    focusTags: ['45분 캐딜락', '푸쉬스루바 분절', '레그 스프링', '상하체 협응'],
    userSummaryKo: '캐딜락의 롤다운 바, 푸쉬스루 바, 암 스프링, 레그 스프링을 골고루 사용해 코어와 척추 분절을 다듬는 45분 수업입니다.',
    flowRationaleKo: '닐링 롤다운 바 오프닝 후 시티드 롤백, 수파인 푸쉬스루·암 스프링·레그 스프링, 스탠딩 암 워크, 시티드 사이드 리치로 이어집니다.',
    unilateralBalanceNoteKo: '스탠딩 암 스프링 펀치와 마무리 시티드 사이드 리치는 좌우 순차(left-then-right)로 대칭 진행합니다.',
    editingGuideKo: '레그 스프링을 `ex-straps-02`와 `ex-kr-cadillac-02` 중 수업 스타일에 맞는 항목으로 선택해 운영하세요.',
    composedBlockPresetIds: [
      'block-cadillac-prep-rollbar-breath-10',
      'block-cadillac-main-armsprings-rotation-15',
    ],
    steps: [
      {
        exerciseId: 'ex-warmup-02',
        classSection: 'preparation',
        durationMin: 5,
        explanationSec: 20,
        instructorNote: '롤다운 바를 잡고 전거근 연결과 C-커브 분절, 하단 흉추 신전을 연결합니다.',
        sourceBlockId: 'block-cadillac-prep-rollbar-breath-10',
      },
      {
        exerciseId: 'original-cadillac-seated-roll-back',
        classSection: 'main',
        durationMin: 6,
        explanationSec: 20,
        instructorNote: '앉은 지지에서 골반을 뒤로 천천히 굴리며 복부 중심 제어력을 깨웁니다.',
      },
      {
        exerciseId: 'ex-kr-cadillac-01',
        classSection: 'main',
        durationMin: 7,
        explanationSec: 25,
        instructorNote: '상단 푸쉬스루바와 함께 척추를 한 마디씩 말아 올려 티저 컨트롤을 이어갑니다.',
      },
      {
        exerciseId: 'original-cadillac-arm-spring-press',
        classSection: 'main',
        durationMin: 6,
        explanationSec: 20,
        instructorNote: '누운 자세에서 암 스프링을 길게 누르며 견갑대 안정과 코어 지지를 결합합니다.',
        sourceBlockId: 'block-cadillac-main-armsprings-rotation-15',
      },
      {
        exerciseId: 'ex-upper-03',
        classSection: 'main',
        durationMin: 7,
        explanationSec: 25,
        sideMode: 'left-then-right',
        instructorNote: '기둥을 등지고 서서 복싱 트위스트와 살루트, 체스트 익스팬션을 수행합니다.',
        sourceBlockId: 'block-cadillac-main-armsprings-rotation-15',
      },
      {
        exerciseId: 'ex-kr-cadillac-02',
        classSection: 'main',
        durationMin: 9,
        explanationSec: 25,
        instructorNote: '독립된 두 레그 스프링의 대칭 속도를 맞추며 프로그·써클·시저스를 진행합니다.',
      },
      {
        exerciseId: 'original-cadillac-seated-side-reach',
        classSection: 'cooldown',
        durationMin: 5,
        explanationSec: 15,
        sideMode: 'left-then-right',
        instructorNote: '테이블에 안정적으로 앉아 좌우 옆구리를 길게 늘리며 호흡을 마무리합니다.',
      },
    ],
  },

  // 10. 45분 | Chair | Lv 2.0 | athletic-plank-control
  {
    id: 'preset-class-chair-45-athletic-plank-20',
    title: '운다 체어 45분 애슬레틱 플랭크 & 파이크 챌린지',
    subtitle: '시티드·교대 풋워크부터 스탠딩 런지·마운틴 클라이머·페달 플랭크·파이크 풀업까지 이어지는 체어 고강도 45분',
    durationMinutes: 45,
    theme: 'athletic-plank-control',
    apparatus: 'chair',
    level: '2.0',
    tempo: 'athletic-burn',
    focusPreset: 'core-sculpt',
    focusTags: ['45분 체어 심화', '파이크 풀업', '포워드 런지', '전신 코어 컨트롤'],
    userSummaryKo: '운다 체어 한 대로 하지 지지력부터 강력한 코어 파이크 풀업까지 밀도 있게 연결하는 45분 숙련자 클래스입니다.',
    flowRationaleKo: '시티드 호흡(Lv.1.0, hard) → 풋워크(Lv.1.5) → 교대 페달(Lv.1.5) → 포워드 런지(Lv.2.0) → 페달 플랭크(Lv.2.0) → 파이크(Lv.2.0) → 인클라인 서포트(Lv.1.5) → 시티드 머메이드(Lv.1.0, hard)로 급격한 난이도 점프 없이 자연스러운 곡선을 그립니다.',
    unilateralBalanceNoteKo: '교대 페달과 스탠딩 런지, 마무리 머메이드 모두 좌우 순차(left-then-right) 모드로 대칭 구성했습니다.',
    editingGuideKo: '숙련도에 따라 파이크 풀업 횟수를 조절하거나 포암 플랭크 홀드로 완급을 조절할 수 있습니다.',
    composedBlockPresetIds: [
      'block-chair-main-stepup-climber-20',
      'block-chair-main-pike-plank-20',
    ],
    steps: [
      {
        exerciseId: 'original-chair-seated-breath',
        classSection: 'preparation',
        durationMin: 4,
        explanationSec: 20,
        selectedLayer: 'hard',
        instructorNote: '좌골 수직 지지와 팔 원호 호흡을 연결해 체어 심화 수업을 준비합니다.',
      },
      {
        exerciseId: 'ex-footwork-03',
        classSection: 'main',
        durationMin: 6,
        explanationSec: 20,
        instructorNote: '더블 레그와 싱글 레그 페달 펌프로 고관절·무릎 정렬과 코어 고정을 세팅합니다.',
        sourceBlockId: 'block-chair-main-stepup-climber-20',
      },
      {
        exerciseId: 'original-chair-alternating-pedal',
        classSection: 'main',
        durationMin: 5,
        explanationSec: 20,
        sideMode: 'left-then-right',
        instructorNote: '분할 페달을 좌우 일정한 템포로 교대 프레스하며 골반 수평을 지킵니다.',
        sourceBlockId: 'block-chair-main-stepup-climber-20',
      },
      {
        exerciseId: 'ex-lower-03',
        classSection: 'main',
        durationMin: 9,
        explanationSec: 25,
        sideMode: 'left-then-right',
        instructorNote: '포워드 스텝업 런지와 마운틴 클라이머 펌핑으로 둔근과 코어 밸런스를 끌어올립니다.',
        sourceBlockId: 'block-chair-main-stepup-climber-20',
      },
      {
        exerciseId: 'ex-kr-chair-01',
        classSection: 'main',
        durationMin: 6,
        explanationSec: 20,
        instructorNote: '체어 시트를 밀어 전거근을 채우고 페달 플랭크에서 파이크 업을 연결합니다.',
        sourceBlockId: 'block-chair-main-pike-plank-20',
      },
      {
        exerciseId: 'ex-plank-02',
        classSection: 'main',
        durationMin: 6,
        explanationSec: 20,
        instructorNote: '아랫배 스쿱 힘으로 페달을 끌어올리며 체어 파이크 풀업의 정점을 컨트롤합니다.',
        sourceBlockId: 'block-chair-main-pike-plank-20',
      },
      {
        exerciseId: 'original-chair-incline-support',
        classSection: 'main',
        durationMin: 5,
        explanationSec: 20,
        instructorNote: '고정 좌면 인클라인 지지로 호흡을 가다듬으며 전신 플랭크 정렬을 정돈합니다.',
        sourceBlockId: 'block-chair-main-pike-plank-20',
      },
      {
        exerciseId: 'original-chair-seated-mermaid',
        classSection: 'cooldown',
        durationMin: 4,
        explanationSec: 15,
        selectedLayer: 'hard',
        sideMode: 'left-then-right',
        instructorNote: '좌면에 앉아 깊은 호흡과 함께 좌우 옆구리를 길게 이완하며 수업을 마칩니다.',
      },
    ],
  },

  // 11. 50분 | Reformer | Lv 1.0 | breath-pelvic-foundation
  {
    id: 'preset-class-reformer-50-gentle-foundation-10',
    title: '리포머 50분 입문 호흡·골반 정렬 & 사이드 라잉 플로우',
    subtitle: '스탠딩 부담 없이 수파인·시티드·사이드 라잉 중심으로 골반 안정과 하지 정렬을 다지는 50분 입문 루틴',
    durationMinutes: 50,
    theme: 'breath-pelvic-foundation',
    apparatus: 'reformer',
    level: '1.0',
    tempo: 'slow-precise',
    focusPreset: 'mobility-rehab',
    focusTags: ['50분 리포머 입문', '골반 중립 조절', '사이드 라잉 둔근', '기초 정렬'],
    userSummaryKo: '리포머가 처음이거나 차분한 정렬 수업을 원하는 그룹·개인 레슨을 위해 Lv.1.0 동작만으로 구성한 50분 정석 프로그램입니다.',
    flowRationaleKo: '수파인 호흡·풋워크·브릿지·암 프레스에서 시티드 로우, 사이드 라잉 스트랩, 핏인스트랩, 머메이드·닐링 스트레치로 안정감 있게 흐릅니다.',
    unilateralBalanceNoteKo: '사이드 라잉 스트랩과 머메이드, 닐링 스트레치 모두 좌우 동일 시간(left-then-right)으로 배분했습니다.',
    editingGuideKo: '숙련도가 올라오면 브릿지를 `ex-bridging-01`(Lv.1.5)로, 시티드 로우를 `ex-upper-02`로 업그레이드할 수 있습니다.',
    composedBlockPresetIds: [
      'block-reformer-prep-breath-imprint-10',
      'block-reformer-cooldown-straps-mermaid-10',
    ],
    steps: [
      {
        exerciseId: 'original-reformer-supine-breath',
        classSection: 'preparation',
        durationMin: 4,
        explanationSec: 20,
        instructorNote: '캐리지 위에서 등 뒤 접촉면과 호흡 리듬을 관찰하며 작은 암 아크를 그립니다.',
        sourceBlockId: 'block-reformer-prep-breath-imprint-10',
      },
      {
        exerciseId: 'ex-warmup-01',
        classSection: 'preparation',
        durationMin: 4,
        explanationSec: 20,
        instructorNote: '미니볼을 무릎 사이에 끼워 내전근 연결과 펠빅 클락 골반 경사를 연습합니다.',
        sourceBlockId: 'block-reformer-prep-breath-imprint-10',
      },
      {
        exerciseId: 'ex-footwork-01',
        classSection: 'main',
        durationMin: 7,
        explanationSec: 25,
        instructorNote: '클래식 풋워크 4종과 카프레이즈로 발목·무릎·고관절 정렬을 탄탄히 잡습니다.',
      },
      {
        exerciseId: 'original-reformer-supported-bridge',
        classSection: 'main',
        durationMin: 6,
        explanationSec: 20,
        instructorNote: '헤드레스트를 내리고 캐리지를 고정한 상태에서 둔근과 후면 사슬을 깨웁니다.',
      },
      {
        exerciseId: 'original-reformer-supine-arm-press',
        classSection: 'main',
        durationMin: 6,
        explanationSec: 20,
        instructorNote: '핸드 스트랩을 몸 옆으로 길게 누르며 견갑골 안정과 복부 중심을 연결합니다.',
      },
      {
        exerciseId: 'original-reformer-seated-row',
        classSection: 'main',
        durationMin: 6,
        explanationSec: 20,
        instructorNote: '박스 위에 바르게 앉아 스트랩을 당기며 등 중간과 어깨 정렬을 익힙니다.',
      },
      {
        exerciseId: 'ex-lower-04',
        classSection: 'main',
        durationMin: 8,
        explanationSec: 25,
        sideMode: 'left-then-right',
        instructorNote: '옆으로 누워 옆구리 터널을 유지한 채 스트랩 레그 스윕과 써클로 중둔근을 강화합니다.',
      },
      {
        exerciseId: 'ex-straps-01',
        classSection: 'main',
        durationMin: 5,
        explanationSec: 20,
        instructorNote: '두 발에 스트랩을 걸고 프로그와 레그써클로 고관절과 내전근을 부드럽게 이완합니다.',
        sourceBlockId: 'block-reformer-cooldown-straps-mermaid-10',
      },
      {
        exerciseId: 'ex-cooldown-01',
        classSection: 'cooldown',
        durationMin: 4,
        explanationSec: 15,
        sideMode: 'left-then-right',
        instructorNote: '머메이드 측굴과 흉추 회전 호흡으로 50분 입문 수업을 편안하게 마무리합니다.',
        sourceBlockId: 'block-reformer-cooldown-straps-mermaid-10',
      },
    ],
  },

  // 12. 50분 | Reformer | Lv 1.5 | full-body-flow
  {
    id: 'preset-class-reformer-50-signature-flow-15',
    title: '리포머 50분 전신 밸런스 & 둔근·코어 시그니처 플로우',
    subtitle: '미니볼 웜업부터 써클링 풋워크·브릿지·코디네이션·스쿠터·롱스트레치·롱박스 스완·핏인스트랩까지 완성형 50분',
    durationMinutes: 50,
    theme: 'full-body-flow',
    apparatus: 'reformer',
    level: '1.5',
    tempo: 'moderate-flow',
    focusPreset: 'full-body',
    focusTags: ['50분 리포머 정석', '전신 협응', '스프링 동선 최적화', '그룹 시그니처'],
    userSummaryKo: '국내 스튜디오 50분 그룹 레슨에서 가장 활용도가 높은 전신 10스텝 구성으로, 척추 4면 움직임과 상·하체 균형을 모두 담았습니다.',
    flowRationaleKo: '수파인 4구간 → 닐링 상체 → 스탠딩 하체 → 쿼드러페드 플랭크 → 프론 롱박스 스완 → 수파인 핏인스트랩 → 시티드 머메이드로 이어집니다.',
    unilateralBalanceNoteKo: '닐링 스파인 트위스트, 스탠딩 스쿠터, 머메이드 모두 좌우 순차(left-then-right) 모드로 대칭 진행합니다.',
    editingGuideKo: '스쿠터 대신 사이드 스플릿(ex-lower-02)을 넣거나 코디네이션을 리버스 앱스(ex-core-04)로 교체해 주간 변주를 줄 수 있습니다.',
    composedBlockPresetIds: [
      'block-reformer-main-footwork-alignment-15',
      'block-reformer-main-bridging-articulation-15',
      'block-reformer-main-upper-rowing-15',
      'block-reformer-cooldown-straps-mermaid-10',
    ],
    steps: [
      {
        exerciseId: 'ex-warmup-01',
        classSection: 'preparation',
        durationMin: 4,
        explanationSec: 20,
        instructorNote: '미니볼을 무릎 사이에 끼우고 흉식 호흡과 펠빅 클락으로 심부 코어를 깨웁니다.',
      },
      {
        exerciseId: 'ex-footwork-02',
        classSection: 'main',
        durationMin: 6,
        explanationSec: 20,
        instructorNote: '써클링 와이드 세컨드 풋워크로 발목 정렬과 중둔근 외전 텐션을 연결합니다.',
        sourceBlockId: 'block-reformer-main-footwork-alignment-15',
      },
      {
        exerciseId: 'ex-bridging-01',
        classSection: 'main',
        durationMin: 5,
        explanationSec: 20,
        customSpringOverride: '2R 1B',
        instructorNote: '헤드레스트를 Flat으로 내리고 척추 분절 브릿지와 햄스트링 컬을 수행합니다.',
        sourceBlockId: 'block-reformer-main-bridging-articulation-15',
      },
      {
        exerciseId: 'ex-kr-reformer-04',
        classSection: 'main',
        durationMin: 6,
        explanationSec: 20,
        instructorNote: '1R 1B 세팅에서 수파인 스트랩 암 워크와 상·하체 코디네이션을 이어갑니다.',
      },
      {
        exerciseId: 'ex-straps-01',
        classSection: 'main',
        durationMin: 4,
        explanationSec: 20,
        instructorNote: '동일 수파인 포지션과 1R 1B 세팅에서 핏인스트랩 프로그와 레그써클로 고관절을 연결합니다.',
        sourceBlockId: 'block-reformer-cooldown-straps-mermaid-10',
      },
      {
        exerciseId: 'ex-plank-01',
        classSection: 'main',
        durationMin: 4,
        explanationSec: 20,
        instructorNote: '1R 1B 그대로 롱 스트레치와 엘리펀트로 전거근 안정성과 전신 파워하우스를 연결합니다.',
      },
      {
        exerciseId: 'ex-upper-01',
        classSection: 'main',
        durationMin: 6,
        explanationSec: 20,
        sideMode: 'left-then-right',
        instructorNote: '1R 스프링에서 닐링 체스트 익스팬션과 스파인 트위스트로 상체 정렬을 잡습니다.',
        sourceBlockId: 'block-reformer-main-upper-rowing-15',
      },
      {
        exerciseId: 'ex-lower-01',
        classSection: 'main',
        durationMin: 8,
        explanationSec: 25,
        sideMode: 'left-then-right',
        instructorNote: '1R 그대로 유지한 채 스탠딩 스쿠터와 이브스 런지를 좌우 4분씩 대칭 수행합니다.',
      },
      {
        exerciseId: 'ex-extension-01',
        classSection: 'main',
        durationMin: 4,
        explanationSec: 20,
        instructorNote: '롱박스를 올리고 풀링 스트랩 I·II 스완으로 흉추 신전과 등 상부를 깨웁니다.',
      },
      {
        exerciseId: 'ex-cooldown-01',
        classSection: 'cooldown',
        durationMin: 3,
        explanationSec: 15,
        customSpringOverride: '1R',
        sideMode: 'left-then-right',
        instructorNote: '박스를 내리고 머메이드 측굴과 회전 스트레칭으로 50분 수업을 우아하게 마무리합니다.',
        sourceBlockId: 'block-reformer-cooldown-straps-mermaid-10',
      },
    ],
  },

  // 13. 50분 | Reformer | Lv 2.0 | athletic-plank-control
  {
    id: 'preset-class-reformer-50-athletic-sculpt-20',
    title: '리포머 50분 애슬레틱 런지·아라베스크 & 코어 번',
    subtitle: '써클링 브릿지 스컬프와 스탠딩 런지·아라베스크, 리버스 앱스, 롱스트레치를 결합한 Lv.2.0 심화 리포머 50분',
    durationMinutes: 50,
    theme: 'athletic-plank-control',
    apparatus: 'reformer',
    level: '2.0',
    tempo: 'athletic-burn',
    focusPreset: 'core-sculpt',
    focusTags: ['50분 리포머 심화', '런지·아라베스크', '써클링 브릿지', '플랭크 컨트롤'],
    userSummaryKo: '숙련자 그룹 및 인텐시브 세션을 위해 고난도 하지 밸런스(아라베스크)와 써클링 브릿지, 플랭크 제어를 엮은 50분 클래스입니다.',
    flowRationaleKo: '수파인 4구간(웜업 → 풋워크·브릿지 → 써클링 브릿지 스컬프 → 스트랩 프로그) → 롱스트레치 → 시티드 로잉 → 리버스 앱스 → 스탠딩 런지·아라베스크 → 롱박스 스완 → 닐링 스트레치로 체위·스프링 전환을 최소화했습니다.',
    unilateralBalanceNoteKo: '스탠딩 런지·아라베스크와 마무리 닐링 스트레치는 좌우 순차(left-then-right) 모드로 대칭 진행합니다.',
    editingGuideKo: '아라베스크 구간에서 양손을 풋바에 짚는 표준 레이어로 진행하면 균형 안정성을 높일 수 있습니다.',
    composedBlockPresetIds: ['block-reformer-main-plank-stretch-15'],
    steps: [
      {
        exerciseId: 'ex-warmup-01',
        classSection: 'preparation',
        durationMin: 4,
        explanationSec: 20,
        selectedLayer: 'hard',
        instructorNote: '테이블탑 유지와 암 플로트 호흡을 결합해 심화 수업을 위한 복부 긴장을 깨웁니다.',
      },
      {
        exerciseId: 'ex-kr-reformer-01',
        classSection: 'main',
        durationMin: 6,
        explanationSec: 20,
        instructorNote: '미니볼 풋워크에서 분절 브릿지로 지체 없이 연결하며 하체 열감을 올립니다.',
      },
      {
        exerciseId: 'ex-global-reformer-01',
        classSection: 'main',
        durationMin: 7,
        explanationSec: 25,
        customSpringOverride: '2R 1B',
        instructorNote: '써클링 조임과 브릿지 캐리지 인·아웃 컨트롤로 둔근과 내전근을 강하게 연결합니다.',
      },
      {
        exerciseId: 'original-reformer-strap-frog',
        classSection: 'main',
        durationMin: 3,
        explanationSec: 15,
        customSpringOverride: '1R 1B',
        instructorNote: '수파인 자세를 유지한 채 발 스트랩 프로그로 고관절 가동성과 내전근 연결을 정리합니다.',
      },
      {
        exerciseId: 'ex-plank-01',
        classSection: 'main',
        durationMin: 5,
        explanationSec: 20,
        instructorNote: '1R 1B 세팅 그대로 롱 스트레치와 업 스트레치, 엘리펀트를 연속 연결합니다.',
        sourceBlockId: 'block-reformer-main-plank-stretch-15',
      },
      {
        exerciseId: 'ex-upper-02',
        classSection: 'main',
        durationMin: 5,
        explanationSec: 20,
        instructorNote: '1B 세팅에서 시티드 백·프론트 로잉으로 견갑대 컨트롤과 상체 지구력을 이어갑니다.',
      },
      {
        exerciseId: 'ex-core-04',
        classSection: 'main',
        durationMin: 6,
        explanationSec: 20,
        instructorNote: '1B 세팅을 유지한 채 닐링 리버스 앱스와 오블리크 니 인으로 하복부를 정밀 타격합니다.',
        sourceBlockId: 'block-reformer-main-plank-stretch-15',
      },
      {
        exerciseId: 'ex-kr-reformer-02',
        classSection: 'main',
        durationMin: 8,
        explanationSec: 25,
        sideMode: 'left-then-right',
        instructorNote: '1R 세팅에서 스탠딩 런지와 뒷다리를 길게 뻗어 올리는 아라베스크 프레스로 둔근 피크를 만듭니다.',
      },
      {
        exerciseId: 'original-reformer-box-swan-prep',
        classSection: 'main',
        durationMin: 3,
        explanationSec: 15,
        customSpringOverride: '1R',
        instructorNote: '롱박스 위에서 가슴을 앞쪽으로 길게 보내며 흉추 신전으로 전면 굴곡 피로를 상쇄합니다.',
      },
      {
        exerciseId: 'ex-global-reformer-03',
        classSection: 'cooldown',
        durationMin: 3,
        explanationSec: 15,
        selectedLayer: 'hard',
        sideMode: 'left-then-right',
        instructorNote: '1R 세팅 그대로 닐링 런지와 사이드 밴드 스트레치로 장요근과 옆구리를 시원하게 이완합니다.',
      },
    ],
  },

  // 14. 50분 | Cadillac | Lv 2.0 | upper-thoracic-opening
  {
    id: 'preset-class-cadillac-50-tower-master-20',
    title: '캐딜락 50분 타워 브릿지 & 상·하체 통합 마스터',
    subtitle: '테이블 골반 록부터 타워바 파라키트 브릿지·푸쉬스루 티저·스탠딩 암 스프링·레그 스프링까지 50분 풀 루틴',
    durationMinutes: 50,
    theme: 'upper-thoracic-opening',
    apparatus: 'cadillac',
    level: '2.0',
    tempo: 'moderate-flow',
    focusPreset: 'posture-upper',
    focusTags: ['50분 캐딜락 심화', '타워바 브릿지', '흉추 가동성', '레그 스프링 밸런스'],
    userSummaryKo: '캐딜락의 상·하단 바 및 독립 스프링을 전방위로 활용해 척추 분절과 상·하체 정렬을 깊이 있게 다루는 50분 수업입니다.',
    flowRationaleKo: '롤다운 바 예열(Lv.1.0, hard) → 시티드 롤백(Lv.1.5) → 타워바 브릿지(Lv.2.0) → 푸쉬스루 티저(Lv.1.5) → 수파인 암 스프링(Lv.1.5) → 스탠딩 암 스프링(Lv.1.5) → 레그 스프링(Lv.1.5) → 프론 스완(Lv.1.0, hard) → 사이드 리치(Lv.1.0, hard)로 구성됩니다.',
    unilateralBalanceNoteKo: '스탠딩 암 스프링과 마무리 시티드 사이드 리치는 좌우 순차(left-then-right) 모드로 대칭 진행합니다.',
    editingGuideKo: '타워바 브릿지 구간에서 발 미끄럼 방지를 위해 논슬립 착용과 하단 안전 스트랩을 꼭 확인하세요.',
    composedBlockPresetIds: [
      'block-cadillac-main-pushthrough-parakeet-20',
      'block-cadillac-main-armsprings-rotation-15',
    ],
    steps: [
      {
        exerciseId: 'ex-warmup-02',
        classSection: 'preparation',
        durationMin: 5,
        explanationSec: 20,
        selectedLayer: 'hard',
        instructorNote: '톨 닐링 롤다운 바 분절과 한 손 교차 흉추 로테이션으로 상체를 폭넓게 예열합니다.',
      },
      {
        exerciseId: 'original-cadillac-seated-roll-back',
        classSection: 'main',
        durationMin: 5,
        explanationSec: 20,
        customSpringOverride: '1R 1B',
        instructorNote: '시티드 롤백 준비 동작으로 골반 경사와 복부 스쿱 연결을 먼저 확인합니다.',
        sourceBlockId: 'block-cadillac-main-pushthrough-parakeet-20',
      },
      {
        exerciseId: 'ex-bridging-02',
        classSection: 'main',
        durationMin: 7,
        explanationSec: 25,
        instructorNote: '타워 바에 양발 아치를 걸고 숄더 브릿지 분절과 파라키트 무릎 굴곡·신전을 진행합니다.',
        sourceBlockId: 'block-cadillac-main-pushthrough-parakeet-20',
      },
      {
        exerciseId: 'ex-kr-cadillac-01',
        classSection: 'main',
        durationMin: 7,
        explanationSec: 25,
        instructorNote: '상단 푸쉬스루바와 함께 척추 분절 롤업 및 티저 홀드로 복부 중심을 강화합니다.',
        sourceBlockId: 'block-cadillac-main-pushthrough-parakeet-20',
      },
      {
        exerciseId: 'original-cadillac-arm-spring-press',
        classSection: 'main',
        durationMin: 6,
        explanationSec: 20,
        customSpringOverride: '2Y',
        instructorNote: '누운 자세에서 암 스프링을 몸 옆으로 길게 누르며 견갑대 하강 힘을 유지합니다.',
        sourceBlockId: 'block-cadillac-main-armsprings-rotation-15',
      },
      {
        exerciseId: 'ex-straps-02',
        classSection: 'main',
        durationMin: 6,
        explanationSec: 20,
        instructorNote: '동일 수파인 포지션에서 독립된 레그 스프링 프로그와 에어플레인 써클로 골반 대칭을 잡습니다.',
      },
      {
        exerciseId: 'ex-upper-03',
        classSection: 'main',
        durationMin: 6,
        explanationSec: 20,
        sideMode: 'left-then-right',
        instructorNote: '스탠딩 암 스프링 복싱·살루트·체스트 익스팬션으로 전신 협응을 높입니다.',
        sourceBlockId: 'block-cadillac-main-armsprings-rotation-15',
      },
      {
        exerciseId: 'original-cadillac-prone-back-reach',
        classSection: 'main',
        durationMin: 4,
        explanationSec: 15,
        selectedLayer: 'hard',
        instructorNote: '엎드린 자세에서 가슴을 앞쪽으로 길게 보내며 등 상부 신전을 연결합니다.',
      },
      {
        exerciseId: 'original-cadillac-seated-side-reach',
        classSection: 'cooldown',
        durationMin: 4,
        explanationSec: 15,
        selectedLayer: 'hard',
        sideMode: 'left-then-right',
        instructorNote: '테이블 위에 앉아 양쪽 옆구리를 길게 늘리고 깊은 호흡으로 마무리합니다.',
      },
    ],
  },

  // 15. 50분 | Mixed (Chair + Barrel) | Lv 2.0 | core-spinal-control
  {
    id: 'preset-class-mixed-50-chair-barrel-sculpt-20',
    title: '운다 체어 & 래더 바렐 50분 코어·옆구리 콤비 스컬프',
    subtitle: '체어 시티드·스탠딩 런지·파이크와 래더 바렐 스완·사이드 벤드를 결합한 50분 2기구 콤비 시퀀스',
    durationMinutes: 50,
    theme: 'core-spinal-control',
    apparatus: 'mixed',
    level: '2.0',
    tempo: 'athletic-burn',
    focusPreset: 'core-sculpt',
    focusTags: ['50분 체어+바렐', '콤비 시퀀스', '사이드 벤드', '파이크 코어'],
    userSummaryKo: '전반부는 운다 체어에서 하지 지지와 파이크 코어를 다루고, 후반부는 래더 바렐에서 스완 신전과 사이드 벤드를 완성하는 50분 콤비 수업입니다.',
    flowRationaleKo: '체어 4구간(호흡 → 풋워크 → 스탠딩 런지 → 파이크) 후 기구 전환(45초)을 거쳐 바렐 4구간(스파인 리치 → 스완 → 사이드 벤드 → 스탠딩 사이드 스트레치)으로 이동해 기구 왕복을 1회로 최소화했습니다.',
    unilateralBalanceNoteKo: '체어 스탠딩 런지, 바렐 사이드 벤드, 마무리 스탠딩 사이드 스트레치 모두 좌우 순차(left-then-right)로 대칭 수행합니다.',
    editingGuideKo: '체어와 바렐 배치 거리에 따라 기구 전환 스텝의 transitionSec(45초)을 60초로 늘려 운영할 수 있습니다.',
    composedBlockPresetIds: [
      'block-chair-main-stepup-climber-20',
      'block-barrel-main-swan-sidebend-20',
    ],
    steps: [
      {
        exerciseId: 'original-chair-seated-breath',
        classSection: 'preparation',
        durationMin: 4,
        explanationSec: 20,
        selectedLayer: 'hard',
        instructorNote: '체어 좌면에서 좌골 수직 지지와 팔 원호 호흡으로 콤비 수업을 시작합니다.',
      },
      {
        exerciseId: 'ex-footwork-03',
        classSection: 'main',
        durationMin: 6,
        explanationSec: 20,
        instructorNote: '시티드 더블 레그 및 싱글 레그 페달 펌프로 하체와 코어를 동시에 깨웁니다.',
        sourceBlockId: 'block-chair-main-stepup-climber-20',
      },
      {
        exerciseId: 'ex-lower-03',
        classSection: 'main',
        durationMin: 8,
        explanationSec: 25,
        sideMode: 'left-then-right',
        instructorNote: '스탠딩 포워드 런지와 마운틴 클라이머로 둔근 지지력을 끌어올립니다.',
        sourceBlockId: 'block-chair-main-stepup-climber-20',
      },
      {
        exerciseId: 'ex-plank-02',
        classSection: 'main',
        durationMin: 6,
        explanationSec: 20,
        instructorNote: '체어 시트를 짚고 하복부 스쿱 힘으로 파이크 풀업을 수행합니다.',
      },
      {
        exerciseId: 'original-barrel-seated-spine-reach',
        classSection: 'main',
        durationMin: 6,
        explanationSec: 20,
        transitionSec: 45,
        instructorNote: '래더 바렐로 이동해 앉은 자세에서 짧은 척추 굴곡 리치를 컨트롤합니다.',
        sourceBlockId: 'block-barrel-main-swan-sidebend-20',
      },
      {
        exerciseId: 'ex-extension-02',
        classSection: 'main',
        durationMin: 7,
        explanationSec: 20,
        transitionSec: 45,
        instructorNote: '바렐 위에서 둔근과 햄스트링 지지를 연결해 긴 호를 그리는 스완 다이브를 진행합니다.',
        sourceBlockId: 'block-barrel-main-swan-sidebend-20',
      },
      {
        exerciseId: 'original-barrel-supported-side-bend',
        classSection: 'main',
        durationMin: 8,
        explanationSec: 25,
        transitionSec: 45,
        sideMode: 'left-then-right',
        instructorNote: '옆으로 기대어 발을 고정하고 좌우 외·내복사근 힘으로 사이드 벤드를 이어갑니다.',
        sourceBlockId: 'block-barrel-main-swan-sidebend-20',
      },
      {
        exerciseId: 'original-barrel-standing-side-stretch',
        classSection: 'cooldown',
        durationMin: 5,
        explanationSec: 15,
        selectedLayer: 'hard',
        sideMode: 'left-then-right',
        instructorNote: '바닥에 서서 고정 지지를 잡고 좌우 옆구리 측굴과 깊은 호흡으로 마무리합니다.',
      },
    ],
  },

  // 16. 50분 | Mixed (Reformer + Cadillac + Mat) | Lv 1.5 | cooldown-mobility-release
  {
    id: 'preset-class-mixed-50-reformer-cadillac-mobility-15',
    title: '리포머 & 캐딜락 50분 척추 분절·가동성 릴리즈 플로우',
    subtitle: '매트 폼롤러 릴리즈부터 캐딜락 푸쉬스루·레그스프링, 리포머 브릿지·스완·머메이드까지 이어지는 50분 가동성 클래스',
    durationMinutes: 50,
    theme: 'cooldown-mobility-release',
    apparatus: 'mixed',
    level: '1.5',
    tempo: 'slow-precise',
    focusPreset: 'mobility-rehab',
    focusTags: ['50분 리포머+캐딜락', '척추 분절', '고관절 가동성', '전신 이완'],
    userSummaryKo: '프라이빗 레슨이나 콤비 스튜디오에서 매트 폼롤러, 캐딜락, 리포머를 순차적으로 거치며 척추와 고관절 가동 범위를 넓히는 50분 수업입니다.',
    flowRationaleKo: '매트 폼롤러 오프닝 → 캐딜락(푸쉬스루 분절·암 스프링·레그 스프링) → 리포머(풋워크·브릿지·롱박스 스완·머메이드)로 기구별 블록을 묶어 동선을 정돈했습니다.',
    unilateralBalanceNoteKo: '리포머 머메이드 측굴과 회전 스트레칭을 좌우 동일 카운트(left-then-right)로 수행합니다.',
    editingGuideKo: '매트 폼롤러 오프닝을 캐딜락 롤다운 바(ex-warmup-02)로 바꾸면 캐딜락+리포머 2기구 구성으로도 바로 쓸 수 있습니다.',
    composedBlockPresetIds: ['block-reformer-main-bridging-articulation-15'],
    steps: [
      {
        exerciseId: 'ex-warmup-03',
        classSection: 'preparation',
        durationMin: 5,
        explanationSec: 20,
        instructorNote: '폼롤러 위에서 뒤통수부터 꼬리뼈까지 정렬하고 큰 암써클로 흉곽을 열어줍니다.',
      },
      {
        exerciseId: 'ex-kr-cadillac-01',
        classSection: 'main',
        durationMin: 7,
        explanationSec: 25,
        transitionSec: 45,
        instructorNote: '캐딜락으로 이동해 푸쉬스루바 척추 분절 롤업과 상단 신전 오픈을 연결합니다.',
      },
      {
        exerciseId: 'original-cadillac-arm-spring-press',
        classSection: 'main',
        durationMin: 6,
        explanationSec: 20,
        customSpringOverride: '2Y',
        instructorNote: '수파인 암 스프링 프레스로 어깨 솟음 없이 광배근과 복부 연결을 다집니다.',
      },
      {
        exerciseId: 'ex-straps-02',
        classSection: 'main',
        durationMin: 7,
        explanationSec: 20,
        instructorNote: '캐딜락 레그 스프링 프로그와 에어플레인 써클로 좌우 고관절 움직임을 대칭으로 맞춥니다.',
      },
      {
        exerciseId: 'ex-footwork-01',
        classSection: 'main',
        durationMin: 7,
        explanationSec: 25,
        transitionSec: 45,
        instructorNote: '리포머로 이동해 미니볼과 함께 클래식 풋워크 4종으로 하지 정렬을 연결합니다.',
      },
      {
        exerciseId: 'ex-bridging-01',
        classSection: 'main',
        durationMin: 6,
        explanationSec: 20,
        customSpringOverride: '2R 1B',
        instructorNote: '헤드레스트를 내리고 척추 분절 브릿지와 햄스트링 컬로 후면 사슬을 조율합니다.',
        sourceBlockId: 'block-reformer-main-bridging-articulation-15',
      },
      {
        exerciseId: 'ex-extension-01',
        classSection: 'main',
        durationMin: 7,
        explanationSec: 20,
        instructorNote: '롱박스 위에서 풀링 스트랩 스완으로 흉추 신전과 후면 삼각근을 깨웁니다.',
      },
      {
        exerciseId: 'ex-cooldown-01',
        classSection: 'cooldown',
        durationMin: 5,
        explanationSec: 15,
        customSpringOverride: '1R',
        sideMode: 'left-then-right',
        instructorNote: '머메이드 측굴과 호흡 정리로 50분 가동성 수업을 차분히 마무리합니다.',
      },
    ],
  },

  // 17. 60분 | Reformer | Lv 1.5 | full-body-flow
  {
    id: 'preset-class-reformer-60-endurance-master-15',
    title: '리포머 60분 전신 지구력 & 아키텍처 마스터 클래스',
    subtitle: '호흡·풋워크·브릿지·코디네이션·핏인스트랩·플랭크·리버스 앱스·로잉·사이드 스플릿·롱박스 스완·머메이드까지 60분 완주',
    durationMinutes: 60,
    theme: 'full-body-flow',
    apparatus: 'reformer',
    level: '1.5',
    tempo: 'moderate-flow',
    focusPreset: 'full-body',
    focusTags: ['60분 리포머 마스터', '전신 아키텍처', '사이드 스플릿', '10블록 완주'],
    userSummaryKo: '60분 프라이빗 세션이나 주말 마스터 클래스를 위해 리포머의 모든 핵심 카테고리를 여유 있는 호흡과 설명으로 담아낸 60분 풀 시퀀스입니다.',
    flowRationaleKo: '수파인 5구간(호흡 → 풋워크 → 브릿지 → 코디네이션 → 핏인스트랩) → 롱스트레치 → 리버스 앱스 → 시티드 로잉 → 스탠딩 사이드 스플릿 → 롱박스 스완 → 머메이드로 스프링·체위 전환을 최소화했습니다.',
    unilateralBalanceNoteKo: '스탠딩 사이드 스플릿과 머메이드 측굴을 좌우 순차(left-then-right) 모드로 대칭 진행합니다.',
    editingGuideKo: '50분 수업으로 줄여야 할 때는 리버스 앱스 또는 시티드 로잉 한 스텝을 제외하고 시간 자동 맞춤을 실행하세요.',
    composedBlockPresetIds: [
      'block-reformer-main-core-coordination-15',
      'block-reformer-main-plank-stretch-15',
      'block-reformer-cooldown-straps-mermaid-10',
    ],
    steps: [
      {
        exerciseId: 'ex-warmup-01',
        classSection: 'preparation',
        durationMin: 5,
        explanationSec: 20,
        instructorNote: '미니볼 내전근 연결과 펠빅 클락 호흡으로 60분 수업의 중심을 차분히 세팅합니다.',
      },
      {
        exerciseId: 'ex-footwork-01',
        classSection: 'main',
        durationMin: 6,
        explanationSec: 20,
        instructorNote: '클래식 풋워크 시리즈와 프랜싱으로 발목부터 고관절까지 정렬을 확립합니다.',
      },
      {
        exerciseId: 'ex-bridging-01',
        classSection: 'main',
        durationMin: 6,
        explanationSec: 20,
        customSpringOverride: '2R 1B',
        instructorNote: '헤드레스트를 내리고 분절 펠빅 리프트와 햄스트링 컬을 깊이 있게 진행합니다.',
      },
      {
        exerciseId: 'ex-kr-reformer-04',
        classSection: 'main',
        durationMin: 6,
        explanationSec: 20,
        instructorNote: '1R 1B 세팅에서 수파인 스트랩 암 워크와 상·하체 코디네이션으로 복부 중심을 단단히 연결합니다.',
        sourceBlockId: 'block-reformer-main-core-coordination-15',
      },
      {
        exerciseId: 'ex-straps-01',
        classSection: 'main',
        durationMin: 4,
        explanationSec: 20,
        instructorNote: '동일 수파인 포지션과 1R 1B 세팅에서 핏인스트랩 프로그와 레그써클로 고관절을 연결합니다.',
        sourceBlockId: 'block-reformer-cooldown-straps-mermaid-10',
      },
      {
        exerciseId: 'ex-plank-01',
        classSection: 'main',
        durationMin: 5,
        explanationSec: 20,
        instructorNote: '1R 1B 그대로 롱 스트레치와 엘리펀트로 전거근 지지와 전신 코어 통합을 완성합니다.',
        sourceBlockId: 'block-reformer-main-plank-stretch-15',
      },
      {
        exerciseId: 'ex-core-04',
        classSection: 'main',
        durationMin: 6,
        explanationSec: 20,
        instructorNote: '1B 세팅에서 닐링 리버스 앱스와 오블리크 변형으로 하복부와 복사근 컨트롤을 더합니다.',
        sourceBlockId: 'block-reformer-main-plank-stretch-15',
      },
      {
        exerciseId: 'ex-upper-02',
        classSection: 'main',
        durationMin: 6,
        explanationSec: 20,
        instructorNote: '1B 그대로 시티드 백 로잉과 써브 어 트레이, 더 쉐이브로 상체 정렬과 어깨 안정성을 다집니다.',
      },
      {
        exerciseId: 'ex-lower-02',
        classSection: 'main',
        durationMin: 8,
        explanationSec: 25,
        sideMode: 'left-then-right',
        instructorNote: '1R 세팅에서 스탠딩 사이드 스플릿과 스케이터 프레스로 중둔근과 내전근 지구력을 끌어올립니다.',
      },
      {
        exerciseId: 'ex-extension-01',
        classSection: 'main',
        durationMin: 5,
        explanationSec: 20,
        instructorNote: '1R 그대로 롱박스 풀링 스트랩 스완으로 흉추를 길게 신전하고 후면 사슬을 깨웁니다.',
      },
      {
        exerciseId: 'ex-cooldown-01',
        classSection: 'cooldown',
        durationMin: 3,
        explanationSec: 15,
        customSpringOverride: '1R',
        sideMode: 'left-then-right',
        instructorNote: '머메이드 측굴과 호흡 정리로 60분 마스터 클래스를 마무리합니다.',
        sourceBlockId: 'block-reformer-cooldown-straps-mermaid-10',
      },
    ],
  },

  // 18. 60분 | Mixed (Cadillac + Reformer + Chair) | Lv 2.0 | full-body-flow
  {
    id: 'preset-class-mixed-60-studio-grand-20',
    title: '캐딜락·리포머·체어 60분 대기구 그랜드 마스터 클래스',
    subtitle: '캐딜락 타워 브릿지·푸쉬스루, 리포머 써클링 브릿지·런지·롱스트레치, 운다 체어 포워드 런지·파이크를 총망라한 60분',
    durationMinutes: 60,
    theme: 'full-body-flow',
    apparatus: 'mixed',
    level: '2.0',
    tempo: 'athletic-burn',
    focusPreset: 'full-body',
    focusTags: ['60분 3기구 마스터', '캐딜락·리포머·체어', 'VIP 프라이빗', '전신 통합'],
    userSummaryKo: '60분 VIP 프라이빗 레슨이나 강사 연구반을 위해 캐딜락·리포머·운다 체어 3대 대기구의 대표 동작을 기구별 블록 단위로 엮은 60분 시퀀스입니다.',
    flowRationaleKo: '캐딜락 3구간(롤다운 바 → 푸쉬스루 → 타워 브릿지) → 리포머 4구간(써클링 브릿지 → 트라이셉스 암워크 → 스탠딩 런지·아라베스크 → 롱스트레치) → 체어 3구간(포워드 런지 → 파이크 → 시티드 머메이드)으로 기구 전환을 딱 2회만 배치했습니다.',
    unilateralBalanceNoteKo: '리포머 아라베스크 런지, 체어 포워드 런지, 체어 머메이드 모두 좌우 순차(left-then-right) 모드로 대칭 진행합니다.',
    editingGuideKo: '보유 기구에 따라 체어 구간을 바렐 블록(block-barrel-main-swan-sidebend-20)으로 교체해 운영할 수 있습니다.',
    composedBlockPresetIds: [
      'block-cadillac-main-pushthrough-parakeet-20',
      'block-chair-main-pike-plank-20',
    ],
    steps: [
      {
        exerciseId: 'ex-warmup-02',
        classSection: 'preparation',
        durationMin: 5,
        explanationSec: 20,
        selectedLayer: 'hard',
        instructorNote: '캐딜락 롤다운 바 분절과 흉추 로테이션으로 60분 대기구 수업을 시작합니다.',
      },
      {
        exerciseId: 'ex-kr-cadillac-01',
        classSection: 'main',
        durationMin: 6,
        explanationSec: 20,
        instructorNote: '상단 푸쉬스루바를 컨트롤하며 척추 분절 롤업과 티저 홀드를 수행합니다.',
        sourceBlockId: 'block-cadillac-main-pushthrough-parakeet-20',
      },
      {
        exerciseId: 'ex-bridging-02',
        classSection: 'main',
        durationMin: 6,
        explanationSec: 20,
        instructorNote: '타워 바 숄더 브릿지와 파라키트 변형으로 둔근과 후면 분절을 강화합니다.',
        sourceBlockId: 'block-cadillac-main-pushthrough-parakeet-20',
      },
      {
        exerciseId: 'ex-global-reformer-01',
        classSection: 'main',
        durationMin: 7,
        explanationSec: 25,
        transitionSec: 45,
        instructorNote: '리포머로 이동해 써클링 내전근 조임과 브릿지 캐리지 인·아웃 컨트롤을 이어갑니다.',
      },
      {
        exerciseId: 'ex-kr-reformer-03',
        classSection: 'main',
        durationMin: 6,
        explanationSec: 20,
        instructorNote: '톨 닐링 스트랩 체스트 익스팬션과 트라이셉스 프레스로 상체 후면을 정돈합니다.',
      },
      {
        exerciseId: 'ex-kr-reformer-02',
        classSection: 'main',
        durationMin: 8,
        explanationSec: 25,
        sideMode: 'left-then-right',
        instructorNote: '스탠딩 런지와 싱글 레그 아라베스크 프레스로 하지 지지력을 끌어올립니다.',
      },
      {
        exerciseId: 'ex-plank-01',
        classSection: 'main',
        durationMin: 5,
        explanationSec: 20,
        instructorNote: '롱 스트레치와 엘리펀트로 리포머 구간의 전신 코어 연결을 마무리합니다.',
      },
      {
        exerciseId: 'ex-lower-03',
        classSection: 'main',
        durationMin: 7,
        explanationSec: 25,
        transitionSec: 45,
        sideMode: 'left-then-right',
        instructorNote: '운다 체어로 이동해 스탠딩 포워드 스텝업과 마운틴 클라이머를 수행합니다.',
      },
      {
        exerciseId: 'ex-plank-02',
        classSection: 'main',
        durationMin: 5,
        explanationSec: 20,
        selectedLayer: 'easy',
        instructorNote: '체어 시트를 짚고 복부 스쿱 힘으로 파이크 풀업과 플랭크 홀드를 컨트롤합니다.',
        sourceBlockId: 'block-chair-main-pike-plank-20',
      },
      {
        exerciseId: 'original-chair-seated-mermaid',
        classSection: 'cooldown',
        durationMin: 5,
        explanationSec: 15,
        selectedLayer: 'hard',
        sideMode: 'left-then-right',
        instructorNote: '체어 좌면에 앉아 좌우 머메이드 측굴과 깊은 호흡으로 60분 대장정을 마무리합니다.',
      },
    ],
  },
];

export const OFFLINE_CLASS_PRESETS: readonly OfflineClassPreset[] = deepFreeze(
  CLASS_PRESET_SPECS.map(buildOfflineClassPreset),
);

const CLASS_PRESET_BY_ID = new Map<string, OfflineClassPreset>(
  OFFLINE_CLASS_PRESETS.map((preset) => [preset.id, preset]),
);

/**
 * 5. 새 동작을 직접 만드는 사용자(강사·여자친구 등)를 위한 빈 초안(Blank Draft) 시작 옵션 (6종)
 */
export const BLANK_DRAFT_STARTER_OPTIONS: readonly BlankDraftStarterOption[] = deepFreeze([
  {
    id: 'starter-blank-movement-idea-note',
    starterKind: 'blank-movement-idea',
    titleKo: '1줄 아이디어로 새 동작 초안 바로 적기',
    subtitleKo: '기구·해부학·시간을 몰라도 떠오른 동작 한 줄부터 가볍게 기록합니다',
    descriptionKo:
      '스튜디오에서 연습하다 떠오른 동작 아이디어나 변형 포인트를 AI 호출 없이 한 줄 메모로 먼저 저장하고, 직접 해본 느낌과 수정할 점을 차근차근 덧붙일 수 있는 빈 동작 초안입니다.',
    recommendedForKo:
      '새로운 동작을 직접 구상·실험하며 나만의 동작 노트를 만들고 싶은 강사 및 창작 사용자',
    defaultApparatus: 'reformer',
    defaultLevel: '1.0',
    defaultDurationMinutes: 4,
    defaultSectionRole: 'main',
    defaultBlockCategory: 'core',
    includeSectionFrameSteps: false,
    placeholderIdeaPromptKo:
      '예: 리포머 수파인에서 미니볼을 발목에 끼우고 작은 암 서클과 호흡을 연결하는 동작',
    progressiveStepsGuideKo: [
      '1단계: 떠오른 동작 아이디어를 한 줄로 편하게 적고 초안을 저장합니다 (기구·시간 미입력 가능).',
      '2단계: 직접 몸으로 해본 뒤 느낀 자극 부위나 호흡 리듬을 체감 메모에 남깁니다.',
      '3단계: 스프링·자세·큐잉에서 보완할 점을 수정 메모로 기록하고 필요할 때 블록이나 수업에 연결합니다.',
    ],
    safetyBoundary: DEFAULT_PRESET_SAFETY_BOUNDARY,
  },
  {
    id: 'starter-blank-movement-prop-variation',
    starterKind: 'blank-movement-idea',
    titleKo: '매트·소도구 창작 동작 아이디어 빈 노트',
    subtitleKo: '미니볼·써클링·폼롤러를 활용한 나만의 소도구 동작 변형을 기록합니다',
    descriptionKo:
      '매트나 소도구 수업에서 회원님들의 흥미를 높일 새로운 연결 동작을 구상할 때, 분류나 세트 수 제약 없이 아이디어 한 줄부터 바로 적어둘 수 있는 빈 초안입니다.',
    recommendedForKo:
      '소도구 활용 동작이나 홈·스튜디오 매트 창작 시퀀스를 즐겨 만드는 사용자',
    defaultApparatus: 'mat',
    defaultLevel: '1.0',
    defaultDurationMinutes: 4,
    defaultSectionRole: 'main',
    defaultBlockCategory: 'upper-body',
    includeSectionFrameSteps: false,
    placeholderIdeaPromptKo:
      '예: 시티드 자세에서 써클링을 양손에 쥐고 흉곽 회전과 팔 뻗기를 번갈아 연결하기',
    progressiveStepsGuideKo: [
      '1단계: 소도구와 몸의 움직임 아이디어를 한 줄로 먼저 적습니다.',
      '2단계: 좌우 대칭 여부나 편한 반복 횟수를 연습 후 자유롭게 추가합니다.',
      '3단계: 완성도가 높아지면 재사용 블록이나 수업 시퀀스에 원클릭으로 삽입합니다.',
    ],
    safetyBoundary: DEFAULT_PRESET_SAFETY_BOUNDARY,
  },
  {
    id: 'starter-blank-reusable-block-builder',
    starterKind: 'blank-reusable-block',
    titleKo: '내 창작 동작을 담는 빈 재사용 블록 만들기',
    subtitleKo: '자주 묶어 쓰는 2~3개 동작 조합을 나만의 블록 템플릿으로 조립합니다',
    descriptionKo:
      '직접 만든 새 동작 초안과 카탈로그 동작을 자유롭게 조합해 8~15분 분량의 재사용 블록으로 저장하고, 여러 수업 시퀀스에 반복 활용할 수 있는 빈 블록 시작 옵션입니다.',
    recommendedForKo:
      '수업마다 자주 쓰는 나만의 시그니처 구간(도입·메인·마무리)을 모듈화하고 싶은 강사',
    defaultApparatus: 'reformer',
    defaultLevel: '1.5',
    defaultDurationMinutes: 5,
    defaultSectionRole: 'main',
    defaultBlockCategory: 'lower-body',
    includeSectionFrameSteps: false,
    placeholderIdeaPromptKo:
      '예: 사이드 라잉 스트랩 워밍업 후 스탠딩 스쿠터로 이어지는 나만의 둔근 연결 동작',
    progressiveStepsGuideKo: [
      '1단계: 블록에 들어갈 첫 번째 창작 동작 아이디어를 한 줄로 시작합니다.',
      '2단계: 앞뒤로 연결할 카탈로그 동작이나 추가 초안을 넣어 2~4개 항목으로 묶습니다.',
      '3단계: 블록을 저장한 뒤 원하는 수업 시퀀스에 삽입하고 수업별로 독립 편집합니다.',
    ],
    safetyBoundary: DEFAULT_PRESET_SAFETY_BOUNDARY,
  },
  {
    id: 'starter-blank-class-sequence-canvas',
    starterKind: 'blank-class-sequence',
    titleKo: '완전 빈 캔버스에서 50분 수업 직접 조립하기',
    subtitleKo: '아무 동작도 채워지지 않은 깨끗한 타임라인에서 첫 스텝부터 자유롭게 구성합니다',
    descriptionKo:
      '기존 템플릿에 얽매이지 않고 오늘 수업의 첫 호흡부터 마지막 마무리까지 강사가 원하는 동작과 직접 만든 초안만으로 백지에서 설계하는 순수 빈 시퀀스입니다.',
    recommendedForKo:
      '수업 흐름 전체를 처음부터 끝까지 직접 설계하는 것을 선호하는 강사',
    defaultApparatus: 'reformer',
    defaultLevel: '1.5',
    defaultDurationMinutes: 50,
    defaultSectionRole: 'main',
    defaultBlockCategory: 'core',
    includeSectionFrameSteps: false,
    placeholderIdeaPromptKo:
      '예: 오늘 수업 메인 구간에 넣을 새로운 스트랩 코어 변형 동작 한 줄 메모',
    progressiveStepsGuideKo: [
      '1단계: 목표 수업 시간과 주 사용 기구, 난이도를 선택해 빈 시퀀스를 엽니다.',
      '2단계: 직접 만든 새 동작 초안이나 재사용 블록, 카탈로그 동작을 원하는 순서로 추가합니다.',
      '3단계: 좌우 균형과 전환 시간, 총 수업 시간 합계를 점검하며 나만의 수업을 완성합니다.',
    ],
    safetyBoundary: DEFAULT_PRESET_SAFETY_BOUNDARY,
  },
  {
    id: 'starter-blank-class-sequence-framed',
    starterKind: 'blank-class-sequence',
    titleKo: '도입·메인·마무리 3구간 기본 틀에서 수업 시작하기',
    subtitleKo: '준비·메인·쿨다운 뼈대만 세워두고 가운데 동작을 자유롭게 교체·확장합니다',
    descriptionKo:
      '완전 백지가 막막할 때 도입(Preparation)·메인(Main)·마무리(Cooldown) 3구간 기본 프레임만 가볍게 열어두고, 메인 구간에 직접 만든 새 동작이나 블록을 끼워 넣는 방식입니다.',
    recommendedForKo:
      '수업 3구간 구조는 유지하면서 메인 동작을 빠르게 창작·교체하고 싶은 사용자',
    defaultApparatus: 'reformer',
    defaultLevel: '1.0',
    defaultDurationMinutes: 30,
    defaultSectionRole: 'main',
    defaultBlockCategory: 'core',
    includeSectionFrameSteps: true,
    placeholderIdeaPromptKo:
      '예: 메인 구간에 추가할 나만의 골반 안정화 및 코어 연결 동작 아이디어',
    progressiveStepsGuideKo: [
      '1단계: 도입·메인·마무리 3개 기본 스텝이 세팅된 편집용 시퀀스를 생성합니다.',
      '2단계: 메인 구간에 내가 만든 새 동작 초안이나 재사용 블록을 자유롭게 끼워 넣습니다.',
      '3단계: 필요 없는 기본 프레임 스텝은 교체하거나 시간을 조정해 수업을 확정합니다.',
    ],
    safetyBoundary: DEFAULT_PRESET_SAFETY_BOUNDARY,
  },
  {
    id: 'starter-blank-custom-movement-showcase',
    starterKind: 'blank-custom-movement-showcase',
    titleKo: '내가 만든 새 동작 중심 미니 수업 쇼케이스',
    subtitleKo: '새 동작 초안 + 전용 블록 + 앞뒤 예열·마무리 시퀀스를 한 번에 세팅합니다',
    descriptionKo:
      '새로운 동작을 하나 만들었을 때 그 동작을 실제 수업 흐름(예열 → 내 창작 동작 블록 → 쿨다운) 속에서 바로 테스트하고 체감 메모와 수정점을 기록할 수 있는 올인원 창작 스타터입니다.',
    recommendedForKo:
      '여자친구·동료 강사와 함께 새로 만든 동작을 짧은 수업 흐름에 넣어 직접 해보며 다듬고 싶은 사용자',
    defaultApparatus: 'reformer',
    defaultLevel: '1.5',
    defaultDurationMinutes: 20,
    defaultSectionRole: 'main',
    defaultBlockCategory: 'core',
    includeSectionFrameSteps: true,
    placeholderIdeaPromptKo:
      '예: 직접 만든 새 동작을 가운데 두고 앞뒤 호흡 예열과 스트레칭을 연결해 테스트하기',
    progressiveStepsGuideKo: [
      '1단계: 오늘 실험해 볼 새 동작 아이디어를 한 줄로 입력해 초안·블록·미니 시퀀스를 동시에 생성합니다.',
      '2단계: 예열 후 내 창작 동작을 직접 수행해 보며 느낀 점과 스프링·큐잉 수정사항을 기록합니다.',
      '3단계: 다듬어진 블록을 45분·50분 정규 수업 시퀀스에 그대로 가져가 재사용합니다.',
    ],
    safetyBoundary: DEFAULT_PRESET_SAFETY_BOUNDARY,
  },
]);

const BLANK_STARTER_BY_ID = new Map<string, BlankDraftStarterOption>(
  BLANK_DRAFT_STARTER_OPTIONS.map((starter) => [starter.id, starter]),
);

/**
 * 6. 조회 헬퍼 함수
 */
export function getPresetThemeMetadata(themeId: PresetThemeId): PresetThemeMetadata | undefined {
  return THEME_BY_ID.get(themeId);
}

export function getOfflineBlockPresetById(blockId: string): OfflineBlockPreset | undefined {
  return BLOCK_PRESET_BY_ID.get(blockId);
}

export function getOfflineClassPresetById(presetId: string): OfflineClassPreset | undefined {
  return CLASS_PRESET_BY_ID.get(presetId);
}

export function getBlankDraftStarterById(starterId: string): BlankDraftStarterOption | undefined {
  return BLANK_STARTER_BY_ID.get(starterId);
}
