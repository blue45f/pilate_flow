/**
 * SPDX-License-Identifier: MIT
 * Track I6 — Shoulder Support 2D Diagram Assets, Corrections, and Registry Payload
 * Covers:
 * - 'shoulder-support-push-up'
 * - 'shoulder-support-leg-pull-front'
 * - 'plank-support'
 * - 'original-mat-plank-prep'
 * - 'ex-shoulder-01'
 * - 'ex-shoulder-02'
 * - 'original-mat-leg-pull-front'
 */
import type { MovementDiagramCorrection } from './movementDiagramCorrections';
import type {
  CatalogMovementVisualAsset,
  MuscleHighlightSpec,
  PhasePoseSpec,
} from './movementVisualRigCatalog';
import sourceLedger from './shoulderSupportSourceLedger.json';
import {
  getShoulderSupportDraftPose,
  SHOULDER_SUPPORT_MODEL_VERSION,
  SHOULDER_SUPPORT_PHASES,
  type ShoulderSupportMovementId,
} from '../models/shoulderSupportDrafts';
import type { PilatesExercise } from '../types/pilates';

export const SHOULDER_SUPPORT_TARGET_EXERCISE_IDS = [
  'shoulder-support-push-up',
  'shoulder-support-leg-pull-front',
  'plank-support',
  'original-mat-plank-prep',
  'ex-shoulder-01',
  'ex-shoulder-02',
  'original-mat-leg-pull-front',
] as const;

export type ShoulderSupportTargetExerciseId =
  (typeof SHOULDER_SUPPORT_TARGET_EXERCISE_IDS)[number];

export const SHOULDER_SUPPORT_EXERCISE_TO_MOVEMENT_MAP: Readonly<
  Record<ShoulderSupportTargetExerciseId, ShoulderSupportMovementId>
> = Object.freeze({
  'shoulder-support-push-up': 'shoulder-support-push-up',
  'plank-support': 'shoulder-support-push-up',
  'original-mat-plank-prep': 'shoulder-support-push-up',
  'ex-shoulder-01': 'shoulder-support-push-up',
  'shoulder-support-leg-pull-front': 'shoulder-support-leg-pull-front',
  'ex-shoulder-02': 'shoulder-support-leg-pull-front',
  'original-mat-leg-pull-front': 'shoulder-support-leg-pull-front',
});

const PUSH_UP_MUSCLES: readonly MuscleHighlightSpec[] = Object.freeze([
  Object.freeze({
    muscleGroupId: 'shoulder-deltoid',
    labelKo: '상완삼두근·전면삼각근·대흉근 (주관절 굴곡·신전 제어)',
    labelEn: 'Triceps Brachii, Anterior Deltoid & Pectoralis Major',
    catalogMuscleMatches: Object.freeze(['상완삼두근', '전면삼각근', '대흉근', '어깨', '팔']),
    role: 'primary',
    roleLabelKo: '주동근 (주 타겟)',
    activePhases: Object.freeze(['middle', 'end'] as const),
    anchorJoints: Object.freeze(['shoulder', 'elbow', 'wrist', 'hand'] as const),
    reasonKo:
      '팔꿈치를 몸통 옆구리(갈비뼈 방향)로 좁게 접어 내려가며 편심성 감속과 수직 푸시 복귀를 주도합니다.',
  }),
  Object.freeze({
    muscleGroupId: 'latissimus-serratus',
    labelKo: '전거근·하부승모근·광배근 (견갑 흉곽 밀착·익상 방지)',
    labelEn: 'Serratus Anterior & Lower Trapezius',
    catalogMuscleMatches: Object.freeze(['전거근', '하부승모근', '광배근']),
    role: 'stabilizer',
    roleLabelKo: '안정화근 (코어·정렬 유지)',
    activePhases: Object.freeze(['start', 'middle', 'end'] as const),
    anchorJoints: Object.freeze(['shoulder', 'thoracic', 'lumbar'] as const),
    reasonKo:
      '손바닥 지면반력을 통해 견갑골을 흉곽에 밀착시켜 날개뼈 익상(Winging)과 흉추 함몰을 방지합니다.',
  }),
  Object.freeze({
    muscleGroupId: 'core-transversus',
    labelKo: '심부 코어·대둔근 (요추 처짐 방지 플랭크 지지)',
    labelEn: 'Transversus Abdominis & Gluteus Maximus',
    catalogMuscleMatches: Object.freeze(['복횡근', '복직근', '대둔근', '몸통']),
    role: 'stabilizer',
    roleLabelKo: '안정화근 (코어·정렬 유지)',
    activePhases: Object.freeze(['start', 'middle', 'end'] as const),
    anchorJoints: Object.freeze(['thoracic', 'lumbar', 'pelvis'] as const),
    reasonKo:
      '귀-어깨-골반-발목 플랭크 직선축을 유지하며 하강 구간에서 허리 과신전(Lumbar Sag)을 차단합니다.',
  }),
]);

const LEG_PULL_FRONT_MUSCLES: readonly MuscleHighlightSpec[] = Object.freeze([
  Object.freeze({
    muscleGroupId: 'glute-max',
    labelKo: '대둔근·햄스트링 (단측 고관절 신전 리치)',
    labelEn: 'Gluteus Maximus & Hamstrings',
    catalogMuscleMatches: Object.freeze(['대둔근', '둔근', '햄스트링']),
    role: 'primary',
    roleLabelKo: '주동근 (주 타겟)',
    activePhases: Object.freeze(['middle', 'end'] as const),
    anchorJoints: Object.freeze(['pelvis', 'hip', 'knee'] as const),
    reasonKo:
      '골반 수평과 요추 중립을 고정한 상태에서 한쪽 다리를 플랭크 기준선 위 18.5°(15°~22°)로 신전합니다.',
  }),
  Object.freeze({
    muscleGroupId: 'latissimus-serratus',
    labelKo: '전거근·견갑 안정근 (손목-견관절 수직 지지)',
    labelEn: 'Serratus Anterior & Scapular Stabilizers',
    catalogMuscleMatches: Object.freeze(['전거근', '광배근', '어깨']),
    role: 'stabilizer',
    roleLabelKo: '안정화근 (코어·정렬 유지)',
    activePhases: Object.freeze(['start', 'middle', 'end'] as const),
    anchorJoints: Object.freeze(['shoulder', 'thoracic', 'lumbar'] as const),
    reasonKo:
      '단측 하지 거상 중에도 손목-견갑 수직 지지선과 흉곽 전인 지지를 흔들림 없이 유지합니다.',
  }),
  Object.freeze({
    muscleGroupId: 'core-transversus',
    labelKo: '복횡근·내외복사근 (골반 회전 및 요추 처짐 제어)',
    labelEn: 'Deep Core & Oblique Anti-Rotation Sling',
    catalogMuscleMatches: Object.freeze(['복횡근', '내복사근', '외복사근', '몸통']),
    role: 'stabilizer',
    roleLabelKo: '안정화근 (코어·정렬 유지)',
    activePhases: Object.freeze(['start', 'middle', 'end'] as const),
    anchorJoints: Object.freeze(['thoracic', 'lumbar', 'pelvis'] as const),
    reasonKo:
      '지지발이 한쪽으로 줄어드는 순간 발생하는 골반 회전 토크와 허리 처짐을 능동적으로 제어합니다.',
  }),
]);

function buildPhasePoseSpec(
  movementId: ShoulderSupportMovementId,
  phaseId: 'start' | 'middle' | 'end',
): PhasePoseSpec {
  const draftPose = getShoulderSupportDraftPose(movementId, phaseId);
  const isPushUp = movementId === 'shoulder-support-push-up';

  const badges: Record<'start' | 'middle' | 'end', PhasePoseSpec['badgeKo']> = {
    start: '시작 자세 (준비·정렬)',
    middle: '중간 자세 (최대 가동·정점)',
    end: '끝 자세 (제어 복귀·마무리)',
  };

  const titles: Record<'start' | 'middle' | 'end', string> = isPushUp
    ? {
        start: '손목-견갑 수직 스택 & 전신 플랭크 지지',
        middle: '견갑 밀착 유지 & 주관절 옆구리 굴곡 하강',
        end: '손바닥 수직 푸시 & 플랭크 직선 복귀',
      }
    : {
        start: '프런트 서포트 수직 지지 & 양발 플랭크 정렬',
        middle: '골반 수평 고정 & 한쪽 다리 18.5° 고관절 신전',
        end: '요추 중립 유지하며 양발 플랭크 지지 복귀',
      };

  const summaries: Record<'start' | 'middle' | 'end', string> = isPushUp
    ? {
        start:
          '손목 바로 위에 어깨를 수직 정렬(wrist-vertical-support)하고 전거근으로 날개뼈 사이를 채워 귀-어깨-골반-무릎-발목 일직선 플랭크를 세팅합니다.',
        middle:
          '머리부터 발목까지 강철 같은 플랭크 직선(요추 처짐 0)을 유지한 채, 팔꿈치를 갈비뼈 뒤쪽으로 좁게 접어 상완삼두근과 전거근 제어로 하강합니다.',
        end: '날개뼈가 솟거나 허리가 먼저 꺾이지 않도록 복횡근과 둔근을 조인 채 손바닥으로 매트를 밀어 시작 플랭크 수직 지지선으로 복귀합니다.',
      }
    : {
        start:
          '손목-어깨 수직 지지축과 전거근 흉곽 밀착을 확립하고, 양발 발볼로 매트를 지지해 귀-어깨-골반-발목 플랭크 직선을 만듭니다.',
        middle:
          '지지측 발볼과 양손의 3점 지지를 유지하고 골반 처짐 없이 한쪽 다리를 둔근·햄스트링 힘으로 플랭크 선 위 18.5°(15°~22°)로 길게 뻗어 올립니다.',
        end: '골반 높이와 견갑 전인 지지를 끝까지 유지하며 들었던 발을 매트에 사뿐히 내려 양발 프런트 서포트 정렬로 돌아옵니다.',
      };

  const breathCues: Record<'start' | 'middle' | 'end', string> = isPushUp
    ? {
        start: '들숨 준비: 흉곽 측면 확장 & 전거근으로 매트 밀어내기',
        middle: '들숨 하강: 복부 납작하게 유지하며 팔꿈치를 옆구리 뒤로 접기',
        end: '날숨 푸시: 아랫배 끌어올리며 정수리부터 뒤꿈치까지 일체형 상승',
      }
    : {
        start: '들숨 준비: 손목-어깨 수직 지지 & 정수리-발뒤꿈치 축 신장',
        middle: '날숨 리프트: 복부 브레이싱 유지하며 한 다리 길게 고관절 신전',
        end: '들숨 복귀: 골반 수평 지킨 채 발볼 매트 터치 복귀',
      };

  return Object.freeze({
    phaseId,
    badgeKo: badges[phaseId],
    shortTitleKo: titles[phaseId],
    summaryKo: summaries[phaseId],
    breathCueKo: breathCues[phaseId],
    joints: draftPose.joints,
    fixedAnchors: Object.freeze(
      draftPose.contactPoints
        .filter((cp) => cp.state !== 'lifted')
        .map((cp) =>
          Object.freeze({
            joint: cp.joint,
            surfaceKo: cp.surfaceKo,
            point: cp.screenPoint,
          }),
        ),
    ),
    movingJoints: Object.freeze(
      isPushUp
        ? (['shoulder', 'elbow', 'thoracic', 'lumbar', 'pelvis', 'hip', 'knee'] as const)
        : (['hip', 'knee', 'ankle', 'heel', 'toe'] as const),
    ),
    apparatusState: Object.freeze({
      carriageOffsetPx: 0,
      pedalAngleDeg: 0,
      springTensionLevel: 'none',
      supportSurfaceKo: '매트 수평 지지면 (손바닥·손목 수직 지지 + 발볼 힌지)',
    }),
    alignments: draftPose.alignments,
    directionVectors: draftPose.directionVectors,
  });
}

function createShoulderSupportVisualAsset(config: {
  readonly exerciseId: ShoulderSupportTargetExerciseId;
  readonly movementId: ShoulderSupportMovementId;
  readonly nameKo: string;
  readonly nameEn: string;
  readonly archetypeId: string;
  readonly archetypeTitleKo: string;
}): CatalogMovementVisualAsset {
  const isPushUp = config.movementId === 'shoulder-support-push-up';
  const staticGuideSvgPath = isPushUp
    ? '/images/movement-guides/shoulder-support-push-up-guide.svg'
    : '/images/movement-guides/shoulder-support-leg-pull-front-guide.svg';

  return Object.freeze({
    exerciseId: config.exerciseId,
    nameKo: config.nameKo,
    nameEn: config.nameEn,
    apparatus: 'mat',
    bodyPosition: 'quadruped',
    blockCategory: 'plank',
    spinalPlanes: Object.freeze(['neutral'] as const),
    isUnilateral: !isPushUp,
    archetypeId: config.archetypeId,
    archetypeTitleKo: config.archetypeTitleKo,
    staticGuideSvgPath,
    productionMethod: 'free-authored-kinematic-svg-v1',
    rightsStatus: 'original-app-authored-free-license',
    licenseLabelKo:
      '앱 자체 제작 2-Link IK 견갑 지지 키네마틱 도해 (MIT · anatomicalAccuracyAssumed: false · 전문 검수 0)',
    anatomicalAccuracyAssumed: false,
    phases: Object.freeze({
      start: buildPhasePoseSpec(config.movementId, 'start'),
      middle: buildPhasePoseSpec(config.movementId, 'middle'),
      end: buildPhasePoseSpec(config.movementId, 'end'),
    }),
    primaryMuscles: isPushUp ? PUSH_UP_MUSCLES : LEG_PULL_FRONT_MUSCLES,
    poseDeltaSummary: Object.freeze(
      isPushUp
        ? {
            startToMiddleKo:
              '손바닥·발볼 지지를 고정한 채 귀-어깨-골반-발목 직선 플랭크가 발목 축을 중심으로 낮아지며 주관절이 옆구리 방향으로 굴곡(2-Link IK)됩니다.',
            middleToEndKo:
              '전거근 익상 방지 지지를 유지하며 상완삼두근·대흉근 수축으로 팔꿈치를 펴 시작 플랭크 수직 지지선으로 복귀합니다.',
            invariantAnchorsKo:
              '손목-손바닥 매트 지지점 고정, 견갑-흉곽 밀착(익상 0), 귀-견갑-골반-발목 일직선(요추 처짐 0)',
            keyJointChangeKo:
              '주관절 굴곡·신전(2-Link IK) + 견관절 수직 지지선 유지 + 전신 플랭크 일체형 하강·상승',
          }
        : {
            startToMiddleKo:
              '손목-어깨 수직 지지와 지지측 발볼·골반 직선 플랭크를 고정한 채 가동측 다리를 고관절에서 18.5°(15°~22°) 신전 리치합니다.',
            middleToEndKo:
              '허리 과신전이나 골반 회전 없이 신전했던 다리를 통제하며 내려 양발 플랭크 지지 정렬로 복귀합니다.',
            invariantAnchorsKo:
              '손목-어깨 수직 지지축 고정, 전거근 견갑 밀착 유지, 지지측 어깨-골반-발목 직선(요추 처짐 0)',
            keyJointChangeKo:
              '단측 고관절 신전(18.5° 리프트) 및 발목 리치 · 상지 및 골반 수평 등척성 고정',
          },
    ),
    mobileSummaryBulletsKo: Object.freeze([
      '손목-견갑 수직 지지선(wrist-vertical-support) 및 전거근 익상 방지(scapula-thoracic-support)',
      '귀-어깨-골반-무릎-발목 플랭크 직선축(shoulder-pelvis-ankle-plank-line · 요추 처짐 0)',
      isPushUp
        ? '중간 자세: 플랭크 일직선 유지 하 주관절 옆구리 굴곡(2-Link IK 제어)'
        : '중간 자세: 골반 수평 고정 하 단측 고관절 18.5°(15°~22°) 신전 리프트',
    ] as const),
  });
}

function createShoulderSupportCorrection(
  archetypeId: string,
  movementId: ShoulderSupportMovementId,
): MovementDiagramCorrection {
  const ledgerEntry = sourceLedger.movements[movementId];
  const isPushUp = movementId === 'shoulder-support-push-up';
  return Object.freeze({
    archetypeId,
    checkedAt: '2026-11-06',
    reviewedScopeKo: isPushUp
      ? '조셉 필라테스 원전(1945 #34 Push Up), Pilates Anytime, NHS 및 STOTT PILATES 견갑 안정화 자료와 손목-어깨 수직 지지·전거근 익상 방지·주관절 굴곡 중 플랭크 직선 유지를 대조했어요.'
      : '조셉 필라테스 원전(1945 #25 Leg Pull Front), Pilates Anytime, PMC9818814 논문 및 STOTT PILATES 자료와 손목-어깨 수직 지지·골반 수평 고정·단측 고관절 신전 범위를 대조했어요.',
    correctionKo: isPushUp
      ? '네발기기나 허리가 처진 팔굽혀펴기 대신 손목-견갑 수직 지지선, 전거근 흉곽 밀착선, 귀-어깨-골반-발목 직선 플랭크 및 2-Link IK 주관절 굴곡 궤적을 적용했어요.'
      : '양발 단순 플랭크와 구분하여 상지 수직 지지·골반 중립 고정 상태에서 한쪽 다리가 플랭크 선 위 18.5°(15°~22°)로 들리는 단측 고관절 신전을 분리했어요.',
    limitationKo:
      '자체 수식으로 작성한 2D 기구학 개략도예요(anatomicalAccuracyAssumed: false, professionalReviewCount: 0, sourceFrameMappings: 0). 개인별 손목·어깨 안전 범위나 임상 진단을 뜻하지 않아요.',
    professionalReviewCount: 0,
    sourceFrameMappings: 0,
    sources: Object.freeze(
      ledgerEntry.sources.map((src) =>
        Object.freeze({
          title: src.title,
          url: src.url,
        }),
      ),
    ),
  });
}

const ASSET_CONFIGS: readonly {
  readonly exerciseId: ShoulderSupportTargetExerciseId;
  readonly movementId: ShoulderSupportMovementId;
  readonly nameKo: string;
  readonly nameEn: string;
  readonly archetypeId: string;
  readonly archetypeTitleKo: string;
}[] = Object.freeze([
  {
    exerciseId: 'shoulder-support-push-up',
    movementId: 'shoulder-support-push-up',
    nameKo: '필라테스 푸시업 (견갑 전인 지지 & 주관절 굴곡)',
    nameEn: 'Pilates Push Up',
    archetypeId: 'shoulder-support-push-up-isolated',
    archetypeTitleKo: '견갑 수직 지지 & 주관절 굴곡 푸시업',
  },
  {
    exerciseId: 'shoulder-support-leg-pull-front',
    movementId: 'shoulder-support-leg-pull-front',
    nameKo: '레그 풀 프런트 (프런트 서포트 & 단측 고관절 신전)',
    nameEn: 'Leg Pull Front',
    archetypeId: 'shoulder-support-leg-pull-front-isolated',
    archetypeTitleKo: '프런트 서포트 견갑 지지 & 단측 레그 리프트',
  },
  {
    exerciseId: 'plank-support',
    movementId: 'shoulder-support-push-up',
    nameKo: '프런트 플랭크 견갑 지지 & 푸시업 프렙',
    nameEn: 'Front Plank Scapular Support',
    archetypeId: 'shoulder-support-push-up-isolated',
    archetypeTitleKo: '견갑 수직 지지 & 주관절 굴곡 푸시업',
  },
  {
    exerciseId: 'original-mat-plank-prep',
    movementId: 'shoulder-support-push-up',
    nameKo: '매트 플랭크 & 푸시업 지지 준비',
    nameEn: 'Mat Plank & Push-Up Support Preparation',
    archetypeId: 'shoulder-support-push-up-isolated',
    archetypeTitleKo: '견갑 수직 지지 & 주관절 굴곡 푸시업',
  },
  {
    exerciseId: 'ex-shoulder-01',
    movementId: 'shoulder-support-push-up',
    nameKo: '클래식 매트 필라테스 푸시업 (견갑 안정화 컨트롤)',
    nameEn: 'Classical Pilates Mat Push Up',
    archetypeId: 'shoulder-support-push-up-isolated',
    archetypeTitleKo: '견갑 수직 지지 & 주관절 굴곡 푸시업',
  },
  {
    exerciseId: 'ex-shoulder-02',
    movementId: 'shoulder-support-leg-pull-front',
    nameKo: '클래식 매트 레그 풀 프런트 (단측 고관절 신전 지지)',
    nameEn: 'Classical Mat Leg Pull Front',
    archetypeId: 'shoulder-support-leg-pull-front-isolated',
    archetypeTitleKo: '프런트 서포트 견갑 지지 & 단측 레그 리프트',
  },
  {
    exerciseId: 'original-mat-leg-pull-front',
    movementId: 'shoulder-support-leg-pull-front',
    nameKo: '매트 레그 풀 프런트 준비',
    nameEn: 'Mat Leg Pull Front Preparation',
    archetypeId: 'shoulder-support-leg-pull-front-isolated',
    archetypeTitleKo: '프런트 서포트 견갑 지지 & 단측 레그 리프트',
  },
]);

export const SHOULDER_SUPPORT_VISUAL_ASSETS: Readonly<
  Record<ShoulderSupportTargetExerciseId, CatalogMovementVisualAsset>
> = Object.freeze(
  Object.fromEntries(
    ASSET_CONFIGS.map((cfg) => [cfg.exerciseId, createShoulderSupportVisualAsset(cfg)]),
  ) as Record<ShoulderSupportTargetExerciseId, CatalogMovementVisualAsset>,
);

export const SHOULDER_SUPPORT_DIAGRAM_CORRECTIONS: Readonly<
  Record<ShoulderSupportTargetExerciseId, MovementDiagramCorrection>
> = Object.freeze(
  Object.fromEntries(
    ASSET_CONFIGS.map((cfg) => [
      cfg.exerciseId,
      createShoulderSupportCorrection(cfg.archetypeId, cfg.movementId),
    ]),
  ) as Record<ShoulderSupportTargetExerciseId, MovementDiagramCorrection>,
);

export interface ShoulderSupportDraftDefinition {
  readonly id: ShoulderSupportMovementId;
  readonly intendedExerciseIds: readonly ShoulderSupportTargetExerciseId[];
  readonly title: string;
  readonly variant: string;
  readonly modelVersion: typeof SHOULDER_SUPPORT_MODEL_VERSION;
  readonly phases: typeof SHOULDER_SUPPORT_PHASES;
  readonly anatomicalAccuracyAssumed: false;
  readonly professionalReviewStatus: 'unreviewed';
  readonly professionalReviewCount: 0;
  readonly sourceFrameMappings: 0;
  readonly exactAssetReady: false;
  readonly autoRecommendationEligible: false;
  readonly sources: readonly {
    readonly sourceId: string;
    readonly title: string;
    readonly url: string;
    readonly factualRecordSha256: string;
  }[];
}

export const SHOULDER_SUPPORT_DRAFT_DEFINITIONS: Readonly<
  Record<ShoulderSupportMovementId, ShoulderSupportDraftDefinition>
> = Object.freeze({
  'shoulder-support-push-up': Object.freeze({
    id: 'shoulder-support-push-up',
    intendedExerciseIds: Object.freeze([
      'shoulder-support-push-up',
      'plank-support',
      'original-mat-plank-prep',
      'ex-shoulder-01',
    ] as const),
    title: sourceLedger.movements['shoulder-support-push-up'].titleKo,
    variant: '손목-견갑 수직 지지 및 전신 일직선 플랭크 유지 하 주관절 2-Link IK 굴곡·복귀',
    modelVersion: SHOULDER_SUPPORT_MODEL_VERSION,
    phases: SHOULDER_SUPPORT_PHASES,
    anatomicalAccuracyAssumed: false,
    professionalReviewStatus: 'unreviewed',
    professionalReviewCount: 0,
    sourceFrameMappings: 0,
    exactAssetReady: false,
    autoRecommendationEligible: false,
    sources: Object.freeze(sourceLedger.movements['shoulder-support-push-up'].sources),
  }),
  'shoulder-support-leg-pull-front': Object.freeze({
    id: 'shoulder-support-leg-pull-front',
    intendedExerciseIds: Object.freeze([
      'shoulder-support-leg-pull-front',
      'ex-shoulder-02',
      'original-mat-leg-pull-front',
    ] as const),
    title: sourceLedger.movements['shoulder-support-leg-pull-front'].titleKo,
    variant: '손목-견갑 수직 지지 및 골반 수평 고정 하 단측 다리 18.5°(15°~22°) 고관절 신전',
    modelVersion: SHOULDER_SUPPORT_MODEL_VERSION,
    phases: SHOULDER_SUPPORT_PHASES,
    anatomicalAccuracyAssumed: false,
    professionalReviewStatus: 'unreviewed',
    professionalReviewCount: 0,
    sourceFrameMappings: 0,
    exactAssetReady: false,
    autoRecommendationEligible: false,
    sources: Object.freeze(sourceLedger.movements['shoulder-support-leg-pull-front'].sources),
  }),
});

export const SHOULDER_SUPPORT_PATTERN_REFERENCES = Object.freeze(
  Object.values(SHOULDER_SUPPORT_DRAFT_DEFINITIONS).map((def) =>
    Object.freeze({
      family: 'shoulder-support' as const,
      variantId: def.id,
      intendedExerciseIds: def.intendedExerciseIds,
      title: def.title,
      variant: def.variant,
      context: sourceLedger.nonMedicalNoticeKo,
      equipment: Object.freeze(['매트'] as const),
      relation: 'pattern-reference' as const,
      exactCanonicalMatch: false as const,
      professionalReviewStatus: 'unreviewed' as const,
      professionalReviewCount: 0 as const,
      sourceFrameMappings: 0 as const,
      assetStatus: 'authored-unreviewed-draft' as const,
      autoRecommendationEligible: false as const,
      assetVersion: def.modelVersion,
      definition: def,
    }),
  ),
);

export function resolveShoulderSupportDiagramForExercise(
  exerciseOrId: string | Pick<PilatesExercise, 'id'>,
): {
  readonly movementId: ShoulderSupportMovementId;
  readonly asset: CatalogMovementVisualAsset;
  readonly correction: MovementDiagramCorrection;
} | null {
  const id = typeof exerciseOrId === 'string' ? exerciseOrId : exerciseOrId.id;
  if (id in SHOULDER_SUPPORT_VISUAL_ASSETS) {
    const targetId = id as ShoulderSupportTargetExerciseId;
    return {
      movementId: SHOULDER_SUPPORT_EXERCISE_TO_MOVEMENT_MAP[targetId],
      asset: SHOULDER_SUPPORT_VISUAL_ASSETS[targetId],
      correction: SHOULDER_SUPPORT_DIAGRAM_CORRECTIONS[targetId],
    };
  }
  return null;
}

export function getShoulderSupportRegistryIntegrationPayload(): {
  readonly assets: Record<string, CatalogMovementVisualAsset>;
  readonly corrections: Record<string, MovementDiagramCorrection>;
} {
  return {
    assets: {
      ...SHOULDER_SUPPORT_VISUAL_ASSETS,
      'original-mat-forearm-plank': Object.freeze({
        ...SHOULDER_SUPPORT_VISUAL_ASSETS['original-mat-plank-prep'],
        exerciseId: 'original-mat-forearm-plank',
      }),
    },
    corrections: {
      ...SHOULDER_SUPPORT_DIAGRAM_CORRECTIONS,
      'original-mat-forearm-plank': SHOULDER_SUPPORT_DIAGRAM_CORRECTIONS['original-mat-plank-prep'],
    },
  };
}
