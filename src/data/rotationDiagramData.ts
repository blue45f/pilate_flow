/**
 * SPDX-License-Identifier: CC0-1.0 OR MIT
 * Track I8 Rotation 2D Diagram Data (`rotation-mat-saw`, `rotation-mat-spine-twist`, `rotation-mat-criss-cross`)
 * compatible with `<MovementPhaseDiagramSvg />`, `<MovementTriptychDiagramSvg />`, and `MovementDiagramCorrection`.
 */

import rotationSourceFacts from './rotationSourceFacts.json';
import type { MovementDiagramCorrection } from './movementDiagramCorrections';
import type {
  CatalogMovementVisualAsset,
  JointAlignmentGuide,
  MovementDirectionVector,
  MuscleHighlightSpec,
  PhasePoseSpec,
} from './movementVisualRigCatalog';
import {
  getRotationDiscretePose,
  resolveRotationMovementId,
  ROTATION_MODEL_VERSION,
  ROTATION_MOVEMENT_IDS,
  ROTATION_PHASES,
  type RotationCatalogAliasId,
  type RotationMovementId,
} from '../models/rotationDrafts';
import type { ApparatusType, BodyPosition, ClassBlockCategory, SpinalPlane } from '../types/pilates';

export interface RotationPatternReference {
  readonly id: RotationMovementId;
  readonly variantId: RotationMovementId;
  readonly family: 'rotation-axial-projection';
  readonly intendedExerciseIds: readonly string[];
  readonly title: string;
  readonly variant: string;
  readonly context: string;
  readonly equipment: readonly string[];
  readonly relation: 'pattern-reference';
  readonly exactCanonicalMatch: false;
  readonly anatomicalAccuracyAssumed: false;
  readonly professionalReviewStatus: 'unreviewed';
  readonly professionalReviewCount: 0;
  readonly sourceFrameMappings: 0;
  readonly assetStatus: 'authored-unreviewed-draft';
  readonly autoRecommendationEligible: false;
  readonly assetVersion: typeof ROTATION_MODEL_VERSION;
  readonly assetSha256: string;
  readonly phases: (typeof ROTATION_PHASES)[RotationMovementId];
  readonly sources: typeof rotationSourceFacts.sources;
}

export const ROTATION_CATALOG_EXERCISE_BINDINGS: Readonly<Record<string, RotationMovementId>> =
  Object.freeze({
    // Canonical Track I8 IDs
    'rotation-mat-saw': 'rotation-mat-saw',
    'rotation-mat-spine-twist': 'rotation-mat-spine-twist',
    'rotation-mat-criss-cross': 'rotation-mat-criss-cross',

    // Direct mat & rotation catalog/archetype IDs
    'seated-rotation': 'rotation-mat-spine-twist',
    'seated-roll-back-spine-twist': 'rotation-mat-spine-twist',
    'original-mat-spine-twist': 'rotation-mat-spine-twist',
    'ex-rotation-01': 'rotation-mat-spine-twist',
    'original-mat-saw': 'rotation-mat-saw',
    'ex-rotation-02': 'rotation-mat-saw',
    'original-mat-criss-cross': 'rotation-mat-criss-cross',
    'ex-rotation-03': 'rotation-mat-criss-cross',

    // Existing catalog exercises mapped in Track I8
    'ex-core-02': 'rotation-mat-spine-twist',
    'original-chair-seated-spine-twist': 'rotation-mat-spine-twist',
    'original-cadillac-seated-rotation': 'rotation-mat-spine-twist',
    'ex-cooldown-01': 'rotation-mat-saw',
    'ex-warmup-02': 'rotation-mat-saw',
    'ex-core-03': 'rotation-mat-criss-cross',
    'ex-kr-reformer-04': 'rotation-mat-criss-cross',
  });

interface RotationBlueprintMeta {
  readonly movementId: RotationMovementId;
  readonly archetypeId: string;
  readonly archetypeTitleKo: string;
  readonly nameKo: string;
  readonly nameEn: string;
  readonly apparatus: ApparatusType;
  readonly bodyPosition: BodyPosition;
  readonly blockCategory: ClassBlockCategory;
  readonly spinalPlanes: readonly SpinalPlane[];
  readonly phaseTitlesKo: readonly [string, string, string];
  readonly phaseSummariesKo: readonly [string, string, string];
  readonly breathCuesKo: readonly [string, string, string];
  readonly primaryMuscles: readonly MuscleHighlightSpec[];
  readonly poseDeltaSummary: CatalogMovementVisualAsset['poseDeltaSummary'];
  readonly mobileSummaryBulletsKo: readonly [string, string, string];
  readonly correction: Omit<MovementDiagramCorrection, 'archetypeId' | 'checkedAt' | 'professionalReviewCount' | 'sourceFrameMappings'>;
}

const ROTATION_BLUEPRINTS: Readonly<Record<RotationMovementId, RotationBlueprintMeta>> =
  Object.freeze({
    'rotation-mat-saw': {
      movementId: 'rotation-mat-saw',
      archetypeId: 'rotation-mat-saw-isolated',
      archetypeTitleKo: '매트 쏘 (The Saw) · V-싯 좌골 앵커 고정 & 흉추 축회전 후 대각 쏘 리치',
      nameKo: '매트 쏘 (The Saw)',
      nameEn: 'The Saw (Wide V-Sit Thoracic Rotation & Diagonal Reach)',
      apparatus: 'mat',
      bodyPosition: 'seated',
      blockCategory: 'cooldown',
      spinalPlanes: ['rotation', 'flexion'],
      phaseTitlesKo: [
        'V-싯 장좌 · 양측 좌골 수직 고정 및 T-암 세팅',
        '흉추 축회전 선행 · 반대쪽 좌골 고정 & 새끼발가락 바깥 대각 쏘 리치',
        '회전 유지 척추 수직 재적층(Restack) 후 정면 복귀',
      ],
      phaseSummariesKo: [
        '두 다리를 매트 너비 이상 V자로 벌려 앉고 발목을 당긴 채 양쪽 좌골에 체중을 50:50으로 고정하며 양팔을 어깨 높이 T자로 펼칩니다.',
        '정수리를 먼저 위로 길게 세워 흉곽을 축회전한 뒤, 반대쪽 좌골이 매트에서 1mm도 들리지 않게(pelvisShiftMm=0) 누르며 앞손 새끼손가락으로 반대 새끼발가락 바깥을 슬라이스하고 뒷팔은 내회전하여 뒤로 길게 뻗습니다.',
        '회전된 방향을 유지한 채 꼬리뼈 위에 요추·흉추를 수직으로 먼저 재적층(Restack)한 뒤 정면 T-암 자세로 돌아옵니다.',
      ],
      breathCuesKo: [
        '들숨: 정수리를 천장으로 길게 끌어올리며 양측 좌골 지지 확인 후 흉추 회전',
        '날숨: 반대쪽 좌골을 매트에 무겁게 꽂으며 새끼발가락 바깥으로 깊게 내쉬며 리치',
        '들숨/날숨: 회전 상태에서 척추를 수직으로 세운 뒤 정면으로 복귀',
      ],
      primaryMuscles: Object.freeze([
        Object.freeze({
          muscleGroupId: 'rectus-obliques',
          labelKo: '복직근·내외복사근 (전측면 코어)',
          labelEn: 'Rectus Abdominis & Obliques',
          catalogMuscleMatches: Object.freeze(['외/내복사근', '내복사근', '외복사근']),
          role: 'primary',
          roleLabelKo: '주동근 (주 타겟)',
          activePhases: Object.freeze(['middle', 'end'] as const),
          anchorJoints: Object.freeze(['thoracic', 'lumbar', 'pelvis'] as const),
          reasonKo: '쏘 동작에서 외복사근·내복사근 사선 슬링으로 흉곽 축회전과 복부 스쿱 굴곡을 주도합니다.',
        }),
        Object.freeze({
          muscleGroupId: 'core-transversus',
          labelKo: '심부 코어 (복횡근·다열근·골반저근)',
          labelEn: 'Deep Core & Transversus Abdominis',
          catalogMuscleMatches: Object.freeze(['복횡근', '다열근']),
          role: 'stabilizer',
          roleLabelKo: '안정화근 (코어·정렬 유지)',
          activePhases: Object.freeze(['start', 'middle', 'end'] as const),
          anchorJoints: Object.freeze(['thoracic', 'lumbar', 'pelvis'] as const),
          reasonKo: '대각 전방 리치 중 반대쪽 좌골이 들리지 않도록 골반 수평 앵커를 고정합니다.',
        }),
        Object.freeze({
          muscleGroupId: 'hamstrings',
          labelKo: '햄스트링 (슬관절 굴곡·후면 사슬)',
          labelEn: 'Hamstrings',
          catalogMuscleMatches: Object.freeze(['햄스트링', '척추기립근 이완']),
          role: 'lengthening',
          roleLabelKo: '신장·이완 부위',
          activePhases: Object.freeze(['middle', 'end'] as const),
          anchorJoints: Object.freeze(['pelvis', 'hip', 'knee'] as const),
          reasonKo: 'V-싯 배측굴곡 및 사선 굴곡 리치 구간에서 후면 사슬과 요방형근이 길게 신장됩니다.',
        }),
      ]),
      poseDeltaSummary: Object.freeze({
        startToMiddleKo:
          '양쪽 좌골(pelvisShiftMm=0)을 매트에 고정한 채 흉곽이 42° 축회전(2D 어깨 폭 52px→40.1px 단축)하며 앞손이 반대 새끼발가락 바깥으로 뻗고 뒷팔은 내회전 후방 신전합니다.',
        middleToEndKo:
          '회전 축을 유지한 채 척추를 먼저 수직으로 세운(Restack) 후 정면 T-암 정렬로 복귀합니다.',
        invariantAnchorsKo:
          'V-싯 양측 좌골(pelvis: 122,146)과 양 뒤꿈치 지지점은 전 구간 0mm 변위로 고정됩니다.',
        keyJointChangeKo:
          '반대 좌골 100% 고정 하에 흉곽 축회전(yaw 42°) + 대각 굴곡(pitch 34°) 및 양방향 상지 오포지션 리치',
      }),
      mobileSummaryBulletsKo: Object.freeze([
        '고정 앵커: V-싯 반대쪽 좌골 100% 매트 밀착 (pelvisShiftMm = 0mm)',
        '핵심 궤적: 정수리 축회전 선행 → 앞손 새끼발가락 바깥 슬라이스 & 뒷팔 내회전 신전',
        '복귀 원칙: 회전 유지 상태에서 척추 수직 재적층(Restack) 후 정면 복귀',
      ] as const),
      correction: {
        reviewedScopeKo:
          'Joseph Pilates(1945) #11 The Saw 및 STOTT PILATES 회전 원칙에 따라 V-싯 좌골 고정, 축회전 선행 후 대각 굴곡, 뒷팔 내회전 신전, 회전 유지 재적층 복귀를 대조했어요.',
        correctionKo:
          '단순 측굴(Mermaid)이나 골반이 함께 들리는 전방 숙임과 분리하여 반대쪽 좌골 고정(0mm) 및 흉곽 2D 단축 투영을 반영했어요.',
        limitationKo:
          '2D 투영 좌표와 회전 각도(42°/34°)는 교육용 수식 모델이며 임상·해부학적 실측이나 개인별 안전 가동범위를 보증하지 않아요.',
        sources: [
          {
            title: 'Joseph H. Pilates (1945) · Return to Life Through Contrology · #11 The Saw',
            url: 'https://archive.org/details/returntolifethro00pila',
          },
          {
            title: 'CUH NHS · Pilates exercises and principles (Seated rotation & centring)',
            url: 'https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/',
          },
        ],
      },
    },
    'rotation-mat-spine-twist': {
      movementId: 'rotation-mat-spine-twist',
      archetypeId: 'rotation-mat-spine-twist-isolated',
      archetypeTitleKo: '매트 스파인 트위스트 (Spine Twist) · 장좌 수직 축 순수 흉추 회전 & 관상면 T-암 고정',
      nameKo: '매트 스파인 트위스트 (The Spine Twist)',
      nameEn: 'The Spine Twist (Long-Sitting Pure Vertical-Axis Thoracic Rotation)',
      apparatus: 'mat',
      bodyPosition: 'seated',
      blockCategory: 'upper-body',
      spinalPlanes: ['rotation', 'neutral'],
      phaseTitlesKo: [
        '두 다리 밀착 장좌 · 발목 배측굴곡 및 좌골 수직 기둥 세팅',
        '정수리-천골 수직 축 순수 흉추 회전 · 관상면 T-암 고정 및 흉골 연동 시선',
        '정수리 축성 신장(Axial Elongation) 유지하며 하부 늑골부터 정면 복귀',
      ],
      phaseSummariesKo: [
        '두 다리를 펴고 빈틈없이 모은 장좌(Long Sitting)에서 발목을 당겨 양 뒤꿈치 길이를 일치시키고, 양쪽 좌골 위에 척추를 수직으로 세워 T-암을 펼칩니다.',
        '골반과 양 뒤꿈치가 1mm도 밀리지 않게(heelAlignmentDeltaMm=0, pelvisShiftMm=0) 고정하고, 팔만 어깨에서 따로 스윙하지 않은 채 흉곽과 머리가 정수리-천골 수직 축을 중심으로 함께 회전합니다.',
        '키가 더 커지는 정수리 축성 신장을 유지하며 아래 갈비뼈부터 차례대로 정면 중심선으로 되돌아옵니다.',
      ],
      breathCuesKo: [
        '들숨: 정수리를 천장으로 길게 뻗어 척추 마디 공간을 확보',
        '날숨: 모든 공기를 짜내듯 배꼽을 당기며 흉곽을 수직 축 둘레로 회전',
        '들숨/날숨: 정수리 높이를 잃지 않고 부드럽게 중앙 정면으로 복귀',
      ],
      primaryMuscles: Object.freeze([
        Object.freeze({
          muscleGroupId: 'rectus-obliques',
          labelKo: '복직근·내외복사근 (전측면 코어)',
          labelEn: 'Rectus Abdominis & Obliques',
          catalogMuscleMatches: Object.freeze(['내복사근', '외복사근', '내/외복사근']),
          role: 'primary',
          roleLabelKo: '주동근 (주 타겟)',
          activePhases: Object.freeze(['middle', 'end'] as const),
          anchorJoints: Object.freeze(['thoracic', 'lumbar', 'pelvis'] as const),
          reasonKo: '동측 내복사근과 반대측 외복사근의 짝힘으로 순수 수직 축 흉곽 회전을 생성합니다.',
        }),
        Object.freeze({
          muscleGroupId: 'thoracic-extensors',
          labelKo: '척추기립근·흉추 신전근 (후면 척추)',
          labelEn: 'Thoracic & Spinal Extensors',
          catalogMuscleMatches: Object.freeze(['척추기립근', '다열근', '등']),
          role: 'stabilizer',
          roleLabelKo: '안정화근 (코어·정렬 유지)',
          activePhases: Object.freeze(['start', 'middle', 'end'] as const),
          anchorJoints: Object.freeze(['head', 'neck', 'thoracic', 'lumbar'] as const),
          reasonKo: '회전 중 척추가 뒤로 눕거나(C-커브 롤백) 무너지지 않도록 수직 추선을 지탱합니다.',
        }),
        Object.freeze({
          muscleGroupId: 'adductors',
          labelKo: '내전근군 (하지 중심선 연결)',
          labelEn: 'Hip Adductors',
          catalogMuscleMatches: Object.freeze(['내전근', '햄스트링']),
          role: 'stabilizer',
          roleLabelKo: '안정화근 (코어·정렬 유지)',
          activePhases: Object.freeze(['start', 'middle', 'end'] as const),
          anchorJoints: Object.freeze(['pelvis', 'hip', 'knee'] as const),
          reasonKo: '양다리와 두 발뒤꿈치를 중심선에 밀착시켜 골반 회전을 차단합니다.',
        }),
      ]),
      poseDeltaSummary: Object.freeze({
        startToMiddleKo:
          '정수리(x:128)부터 좌골(x:128)까지 수직 축을 유지한 채 흉곽이 45° 순수 회전하여 양 어깨 2D 폭이 52px에서 38.2px로 투영 단축(Foreshortening)됩니다.',
        middleToEndKo:
          '정수리 수직 신장(+3mm)을 유지하며 양 뒤꿈치 어긋남 없이(0mm) 하부 늑골부터 정면으로 복귀합니다.',
        invariantAnchorsKo:
          '양측 좌골(pelvis: 128,146)과 모아 둔 양 발뒤꿈치(heel x:238)가 전 구간 0mm 변위로 고정됩니다.',
        keyJointChangeKo:
          '후방 C-커브 롤백 및 팔 단독 스윙을 배제한 수직 축 순수 흉추 회전(yaw 45°, 어깨 폭 단축비 0.73)',
      }),
      mobileSummaryBulletsKo: Object.freeze([
        '고정 앵커: 양측 좌골 50:50 + 양 발뒤꿈치 일치 (heelAlignmentDeltaMm = 0mm)',
        '핵심 궤적: 정수리-천골 수직 축 순수 흉곽 회전 (관상면 180° T-암 & 흉골 연동 시선)',
        '복귀 원칙: 정수리 수직 신장 유지하며 하부 흉곽부터 중앙 복귀',
      ] as const),
      correction: {
        reviewedScopeKo:
          'Joseph Pilates(1945) #14 The Spine Twist 및 Merrithew STOTT PILATES 스파인 트위스트 원칙에 따라 장좌 수직 축, 양 뒤꿈치 일치, 관상면 T-암 고정, 흉골 연동 시선을 대조했어요.',
        correctionKo:
          '기존에 섞여 있던 후방 C-커브 롤백(head 56px 후방 이동)과 어깨 관절 단독 팔 스윙을 제거하고 수직 축 순수 흉곽 회전 투영으로 분리했어요.',
        limitationKo:
          '2D 투영 좌표와 회전 각도(45°)는 교육용 수식 모델이며 임상·해부학적 실측이나 개인별 안전 가동범위를 보증하지 않아요.',
        sources: [
          {
            title: 'Joseph H. Pilates (1945) · Return to Life Through Contrology · #14 The Spine Twist',
            url: 'https://archive.org/details/returntolifethro00pila',
          },
          {
            title: 'Merrithew / STOTT PILATES · Exercise of the Month: Spine Twist',
            url: 'https://www.merrithew.com/blog/post/2018-05-15/exercise-of-the-month-spine-twist',
          },
        ],
      },
    },
    'rotation-mat-criss-cross': {
      movementId: 'rotation-mat-criss-cross',
      archetypeId: 'rotation-mat-criss-cross-isolated',
      archetypeTitleKo: '매트 크리스크로스 (Criss-Cross) · 수파인 상부 흉추 굴곡 + 사선 복사근 회전 & 팔꿈치 광폭 유지',
      nameKo: '매트 크리스크로스 (The Criss-Cross)',
      nameEn: 'The Criss-Cross (Supine Thoracic Curl Oblique Rib-to-Knee Rotation)',
      apparatus: 'mat',
      bodyPosition: 'supine',
      blockCategory: 'core',
      spinalPlanes: ['rotation', 'flexion'],
      phaseTitlesKo: [
        '수파인 상부 흉추 컬업 · 후두부 손 지지 및 양 팔꿈치 광폭(172°) 오픈',
        '천골 수평 고정 · 겨드랑이(전면 늑골)→반대 90° 무릎 사선 회전 & 반대 다리 45° 신전',
        '견갑골 하각 컬업 높이 유지하며 중앙 교차 전환',
      ],
      phaseSummariesKo: [
        '누운 자세에서 두 손을 뒤통수(후두부)에 포개고 양 팔꿈치를 시야 끝까지 넓게(172°) 편 채 상부 흉추를 컬업하고 천골을 매트에 수평으로 고정합니다.',
        '팔꿈치만 좁혀 당기지 않고 양 팔꿈치 광폭(168°)을 유지한 채, 한쪽 겨드랑이(전면 늑골)를 반대쪽 90° 테이블탑 무릎을 향해 회전하며 다른 다리는 45° 사선으로 길게 뻗습니다.',
        '좌우 교대 시 머리와 어깨가 바닥으로 떨어지지 않게 상부 흉추 컬업 높이를 유지한 채 중앙을 통과합니다.',
      ],
      breathCuesKo: [
        '들숨: 상부 흉추 컬업 높이와 천골 수평 임프린트를 유지하며 준비',
        '날숨: 복벽을 매트로 납작하게 당기며 겨드랑이를 반대 무릎 쪽으로 깊게 회전',
        '들숨: 날개뼈 하각이 매트에서 떨어진 높이를 유지하며 중앙 교차 전환',
      ],
      primaryMuscles: Object.freeze([
        Object.freeze({
          muscleGroupId: 'rectus-obliques',
          labelKo: '복직근·내외복사근 (전측면 코어)',
          labelEn: 'Rectus Abdominis & Obliques',
          catalogMuscleMatches: Object.freeze(['내/외복사근', '상복부', '하복부', '내복사근', '외복사근']),
          role: 'primary',
          roleLabelKo: '주동근 (주 타겟)',
          activePhases: Object.freeze(['middle', 'end'] as const),
          anchorJoints: Object.freeze(['thoracic', 'lumbar', 'pelvis'] as const),
          reasonKo: '전면 복사근 사선 슬링(외복사근-반대측 내복사근)으로 상부 흉추 굴곡과 회전을 동시에 수행합니다.',
        }),
        Object.freeze({
          muscleGroupId: 'core-transversus',
          labelKo: '심부 코어 (복횡근·다열근·골반저근)',
          labelEn: 'Deep Core & Transversus Abdominis',
          catalogMuscleMatches: Object.freeze(['복횡근', '골반저근']),
          role: 'stabilizer',
          roleLabelKo: '안정화근 (코어·정렬 유지)',
          activePhases: Object.freeze(['start', 'middle', 'end'] as const),
          anchorJoints: Object.freeze(['thoracic', 'lumbar', 'pelvis'] as const),
          reasonKo: '45° 다리 교차 신전 중 골반이 좌우로 흔들리거나 요추가 뜨지 않게 천골을 고정합니다.',
        }),
        Object.freeze({
          muscleGroupId: 'hip-flexor-iliopsoas',
          labelKo: '장요근·고관절 굴곡근 (전면 고관절)',
          labelEn: 'Iliopsoas & Hip Flexors',
          catalogMuscleMatches: Object.freeze(['고관절 굴곡근', '장요근']),
          role: 'lengthening',
          roleLabelKo: '신장·이완 부위',
          activePhases: Object.freeze(['middle', 'end'] as const),
          anchorJoints: Object.freeze(['lumbar', 'pelvis', 'hip', 'knee'] as const),
          reasonKo: '45° 사선으로 뻗어내는 다리의 전면 고관절이 길게 신장되고 반대쪽 무릎은 90° 테이블탑을 유지합니다.',
        }),
      ]),
      poseDeltaSummary: Object.freeze({
        startToMiddleKo:
          '천골(pelvis: 176,148, pelvisShiftMm=0)을 수평 고정하고 양 팔꿈치 광폭(168°)을 유지한 채 흉곽이 40° 사선 회전(어깨 폭 48px→37.1px 단축)하며 반대 다리를 45°로 뻗습니다.',
        middleToEndKo:
          '상부 흉추 컬업 높이(curlHeight 70mm)를 떨어뜨리지 않고 중앙을 통과하여 교차 전환을 준비합니다.',
        invariantAnchorsKo:
          '매트에 수평 임프린트된 천골(pelvis: 176,148)과 요추 하부는 전 구간 0mm 변위로 고정됩니다.',
        keyJointChangeKo:
          '시상면 싱글 레그 스트레치와 분리된 상부 흉추 사선 회전(yaw 40°) + 팔꿈치 광폭(168°) 유지 + 90°/45° 하지 교차',
      }),
      mobileSummaryBulletsKo: Object.freeze([
        '고정 앵커: 천골·양측 골반 수평 매트 임프린트 고정 (pelvisShiftMm = 0mm)',
        '핵심 궤적: 양 팔꿈치 광폭(168°) 유지 · 겨드랑이(전면 늑골)→반대 90° 무릎 사선 회전',
        '복귀 원칙: 날개뼈 하각이 떨어진 컬업 높이를 유지한 채 중앙 교차 전환',
      ] as const),
      correction: {
        reviewedScopeKo:
          'Joseph Pilates(1945) #16 The Criss-Cross 본문과 대조하여 후두부 손 지지, 양 팔꿈치 광폭 유지, 겨드랑이→반대 무릎 사선 회전, 45° 다리 신전, 골반 수평 고정을 반영했어요.',
        correctionKo:
          '시상면 헌드레드/레그스트레치 도해와 분리하여 상부 흉추 사선 회전축, 양 어깨 2D 투영 단축, 팔꿈치 당김 방지(168° 광폭)를 구현했어요.',
        limitationKo:
          '2D 투영 좌표와 회전·다리 각도(40°/45°)는 교육용 수식 모델이며 임상·해부학적 실측이나 개인별 안전 가동범위를 보증하지 않아요.',
        sources: [
          {
            title: 'Joseph H. Pilates (1945) · Return to Life Through Contrology · #16 The Criss-Cross',
            url: 'https://archive.org/details/returntolifethro00pila',
          },
          {
            title: 'CUH NHS · Pilates exercises and principles (Core centring & pelvic stability)',
            url: 'https://www.cuh.nhs.uk/patient-information/pilates-exercises-and-principles/',
          },
        ],
      },
    },
  });

function buildPhasePoseSpec(
  meta: RotationBlueprintMeta,
  phaseId: 'start' | 'middle' | 'end',
): PhasePoseSpec {
  const phaseIndex = phaseId === 'start' ? 0 : phaseId === 'middle' ? 1 : 2;
  const pose = getRotationDiscretePose(meta.movementId, phaseId);
  const { joints2D, indicators } = pose;

  const badgeKo: PhasePoseSpec['badgeKo'] =
    phaseId === 'start'
      ? '시작 자세 (준비·정렬)'
      : phaseId === 'middle'
        ? '중간 자세 (최대 가동·정점)'
        : '끝 자세 (제어 복귀·마무리)';

  const alignments: readonly JointAlignmentGuide[] = Object.freeze([
    Object.freeze({
      id: `${meta.movementId}-${phaseId}-axis`,
      labelKo: indicators.rotationAxis.labelKo,
      cueKo: indicators.gazeVector.labelKo,
      kind: 'axis-line',
      from: indicators.rotationAxis.from,
      to: indicators.rotationAxis.to,
      targetAngleDeg: indicators.rotationAxis.yawDeg,
      cautionKo: indicators.pelvisAnchor.labelKo,
    }),
    Object.freeze({
      id: `${meta.movementId}-${phaseId}-pelvis-anchor`,
      labelKo: indicators.pelvisAnchor.labelKo,
      cueKo: '회전 중에도 양측 좌골·천골 지지점이 밀리거나 들리지 않도록 고정합니다.',
      kind: 'anchor-lock',
      from: indicators.pelvisAnchor.leftAnchor,
      to: indicators.pelvisAnchor.rightAnchor,
      cautionKo: '골반이 따라 돌아가면 요추 전단 스트레스가 증가하므로 범위를 줄입니다.',
    }),
  ]);

  const directionVectors: readonly MovementDirectionVector[] = Object.freeze([
    Object.freeze({
      id: `${meta.movementId}-${phaseId}-rotation-vec`,
      labelKo:
        phaseId === 'start'
          ? '정수리 축성 신장 및 중심선 고정'
          : phaseId === 'middle'
            ? indicators.ribcageScapula.labelKo
            : indicators.transitionPose.noteKo,
      kind:
        phaseId === 'start'
          ? 'axial-lengthening'
          : phaseId === 'middle'
            ? 'spine-articulation'
            : 'return-control',
      points: indicators.transitionPose.trajectoryPoints,
      phaseScope:
        phaseId === 'start'
          ? 'start'
          : phaseId === 'middle'
            ? 'start-to-middle'
            : 'middle-to-end',
    }),
  ]);

  return Object.freeze({
    phaseId,
    badgeKo,
    shortTitleKo: meta.phaseTitlesKo[phaseIndex],
    summaryKo: meta.phaseSummariesKo[phaseIndex],
    breathCueKo: meta.breathCuesKo[phaseIndex],
    joints: joints2D,
    fixedAnchors: Object.freeze([
      Object.freeze({
        joint: 'pelvis' as const,
        surfaceKo: indicators.pelvisAnchor.labelKo,
        point: joints2D.pelvis,
      }),
      Object.freeze({
        joint: 'heel' as const,
        surfaceKo:
          meta.movementId === 'rotation-mat-spine-twist'
            ? '장좌 양 발뒤꿈치 일치 앵커 (heelAlignmentDeltaMm = 0mm)'
            : meta.movementId === 'rotation-mat-saw'
              ? 'V-싯 양 발뒤꿈치 매트 지지점'
              : '수파인 하지 테이블탑/45° 교차 기준점',
        point: joints2D.heel,
      }),
    ]),
    movingJoints: Object.freeze([
      'thoracic',
      'shoulder',
      'farShoulder',
      'elbow',
      'farElbow',
      'wrist',
      'farWrist',
      'hand',
      'head',
    ] as const),
    apparatusState: Object.freeze({
      carriageOffsetPx: 0,
      pedalAngleDeg: 0,
      springTensionLevel: 'none' as const,
      supportSurfaceKo:
        meta.bodyPosition === 'seated'
          ? '매트 시티드 (양측 좌골 수직 앵커 고정)'
          : '매트 수파인 (천골·양측 골반 수평 임프린트 고정)',
    }),
    alignments,
    directionVectors,
  });
}

function buildVisualAssetForKey(
  exerciseId: string,
  movementId: RotationMovementId,
): CatalogMovementVisualAsset {
  const meta = ROTATION_BLUEPRINTS[movementId];
  return Object.freeze({
    exerciseId,
    nameKo: meta.nameKo,
    nameEn: meta.nameEn,
    apparatus: meta.apparatus,
    bodyPosition: meta.bodyPosition,
    blockCategory: meta.blockCategory,
    spinalPlanes: Object.freeze([...meta.spinalPlanes]),
    isUnilateral: true,
    archetypeId: meta.archetypeId,
    archetypeTitleKo: meta.archetypeTitleKo,
    staticGuideSvgPath: '/images/movement-guides/mat-phase-alignment-guide.svg',
    productionMethod: 'free-authored-kinematic-svg-v1',
    rightsStatus: 'original-app-authored-free-license',
    licenseLabelKo:
      '앱 자체 제작 3D→2D 축회전 투영 도해 (Original Free-License Kinematic SVG v1 · CC0-1.0 OR MIT)',
    anatomicalAccuracyAssumed: false,
    phases: Object.freeze({
      start: buildPhasePoseSpec(meta, 'start'),
      middle: buildPhasePoseSpec(meta, 'middle'),
      end: buildPhasePoseSpec(meta, 'end'),
    }),
    primaryMuscles: meta.primaryMuscles,
    poseDeltaSummary: meta.poseDeltaSummary,
    mobileSummaryBulletsKo: meta.mobileSummaryBulletsKo,
  });
}

export const ROTATION_CANONICAL_VISUAL_ASSETS: Readonly<
  Record<RotationMovementId, CatalogMovementVisualAsset>
> = Object.freeze({
  'rotation-mat-saw': buildVisualAssetForKey('rotation-mat-saw', 'rotation-mat-saw'),
  'rotation-mat-spine-twist': buildVisualAssetForKey(
    'rotation-mat-spine-twist',
    'rotation-mat-spine-twist',
  ),
  'rotation-mat-criss-cross': buildVisualAssetForKey(
    'rotation-mat-criss-cross',
    'rotation-mat-criss-cross',
  ),
});

export const ROTATION_VISUAL_ASSETS: Readonly<Record<string, CatalogMovementVisualAsset>> =
  Object.freeze(
    Object.fromEntries(
      Object.entries(ROTATION_CATALOG_EXERCISE_BINDINGS).map(([key, movementId]) => [
        key,
        key === movementId
          ? ROTATION_CANONICAL_VISUAL_ASSETS[movementId]
          : buildVisualAssetForKey(key, movementId),
      ]),
    ),
  );

export const ROTATION_DIAGRAM_CORRECTIONS: Readonly<Record<string, MovementDiagramCorrection>> =
  Object.freeze(
    Object.fromEntries(
      Object.entries(ROTATION_CATALOG_EXERCISE_BINDINGS).map(([key, movementId]) => {
        const meta = ROTATION_BLUEPRINTS[movementId];
        const entry: MovementDiagramCorrection = Object.freeze({
          archetypeId: meta.archetypeId,
          checkedAt: '2026-11-06',
          reviewedScopeKo: meta.correction.reviewedScopeKo,
          correctionKo: meta.correction.correctionKo,
          limitationKo: meta.correction.limitationKo,
          professionalReviewCount: 0,
          sourceFrameMappings: 0,
          sources: Object.freeze(
            meta.correction.sources.map((s) => Object.freeze({ title: s.title, url: s.url })),
          ),
        });
        return [key, entry];
      }),
    ),
  );

export const ROTATION_PATTERN_REFERENCES: readonly RotationPatternReference[] = Object.freeze(
  ROTATION_MOVEMENT_IDS.map((movementId) => {
    const meta = ROTATION_BLUEPRINTS[movementId];
    const intendedIds = Object.entries(ROTATION_CATALOG_EXERCISE_BINDINGS)
      .filter(([, targetId]) => targetId === movementId)
      .map(([id]) => id);
    return Object.freeze({
      id: movementId,
      variantId: movementId,
      family: 'rotation-axial-projection' as const,
      intendedExerciseIds: Object.freeze(intendedIds),
      title: meta.nameKo,
      variant: meta.archetypeTitleKo,
      context: meta.correction.reviewedScopeKo,
      equipment: Object.freeze(['매트']),
      relation: 'pattern-reference' as const,
      exactCanonicalMatch: false as const,
      anatomicalAccuracyAssumed: false as const,
      professionalReviewStatus: 'unreviewed' as const,
      professionalReviewCount: 0 as const,
      sourceFrameMappings: 0 as const,
      assetStatus: 'authored-unreviewed-draft' as const,
      autoRecommendationEligible: false as const,
      assetVersion: ROTATION_MODEL_VERSION,
      assetSha256: rotationSourceFacts.sources[0].factualRecordSha256,
      phases: ROTATION_PHASES[movementId],
      sources: rotationSourceFacts.sources,
    });
  }),
);

export function getRotationVisualAsset(
  movementOrAliasId: RotationCatalogAliasId | string,
): CatalogMovementVisualAsset {
  const direct = ROTATION_VISUAL_ASSETS[movementOrAliasId];
  if (direct) return direct;
  const resolved = resolveRotationMovementId(movementOrAliasId) ?? 'rotation-mat-spine-twist';
  return ROTATION_CANONICAL_VISUAL_ASSETS[resolved];
}

export function getRotationVisualAssetByCatalogExerciseId(
  exerciseId: string | null | undefined,
): CatalogMovementVisualAsset | null {
  if (!exerciseId) return null;
  if (ROTATION_VISUAL_ASSETS[exerciseId]) {
    return ROTATION_VISUAL_ASSETS[exerciseId];
  }
  const resolved = resolveRotationMovementId(exerciseId);
  return resolved ? ROTATION_CANONICAL_VISUAL_ASSETS[resolved] : null;
}

export function getRotationDiagramCorrection(
  exerciseOrMovementId: string | null | undefined,
): MovementDiagramCorrection | null {
  if (!exerciseOrMovementId) return null;
  if (ROTATION_DIAGRAM_CORRECTIONS[exerciseOrMovementId]) {
    return ROTATION_DIAGRAM_CORRECTIONS[exerciseOrMovementId];
  }
  const resolved = resolveRotationMovementId(exerciseOrMovementId);
  return resolved ? ROTATION_DIAGRAM_CORRECTIONS[resolved] : null;
}

export interface RotationI7IntegrationBundle {
  readonly trackId: 'I8-rotation';
  readonly modelVersion: typeof ROTATION_MODEL_VERSION;
  readonly visualAssets: Readonly<Record<string, CatalogMovementVisualAsset>>;
  readonly canonicalVisualAssets: Readonly<Record<RotationMovementId, CatalogMovementVisualAsset>>;
  readonly diagramCorrections: Readonly<Record<string, MovementDiagramCorrection>>;
  readonly catalogBindings: Readonly<Record<string, RotationMovementId>>;
  readonly patternReferences: readonly RotationPatternReference[];
  readonly resolveVisualAsset: (id: string) => CatalogMovementVisualAsset | null;
  readonly resolveDiagramCorrection: (id: string) => MovementDiagramCorrection | null;
  readonly truthfulness: {
    readonly anatomicalAccuracyAssumed: false;
    readonly professionalReviewCount: 0;
    readonly sourceFrameMappings: 0;
  };
}

export function getRotationI7IntegrationBundle(): RotationI7IntegrationBundle {
  return Object.freeze({
    trackId: 'I8-rotation',
    modelVersion: ROTATION_MODEL_VERSION,
    visualAssets: ROTATION_VISUAL_ASSETS,
    canonicalVisualAssets: ROTATION_CANONICAL_VISUAL_ASSETS,
    diagramCorrections: ROTATION_DIAGRAM_CORRECTIONS,
    catalogBindings: ROTATION_CATALOG_EXERCISE_BINDINGS,
    patternReferences: ROTATION_PATTERN_REFERENCES,
    resolveVisualAsset: getRotationVisualAssetByCatalogExerciseId,
    resolveDiagramCorrection: getRotationDiagramCorrection,
    truthfulness: Object.freeze({
      anatomicalAccuracyAssumed: false,
      professionalReviewCount: 0,
      sourceFrameMappings: 0,
    }),
  });
}
