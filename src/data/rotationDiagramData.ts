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
  readonly assetSha256: null; // No geometry checksum has been generated.
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
    'original-mat-spine-twist': 'rotation-mat-spine-twist',
    'ex-rotation-01': 'rotation-mat-spine-twist',
    'original-mat-saw': 'rotation-mat-saw',
    'ex-rotation-02': 'rotation-mat-saw',
    'original-mat-criss-cross': 'rotation-mat-criss-cross',
    'ex-rotation-03': 'rotation-mat-criss-cross',

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
      archetypeTitleKo: '매트 쏘 (The Saw) · 앉은 몸통 회전과 대각 리치',
      nameKo: '매트 쏘 (The Saw)',
      nameEn: 'The Saw (Seated Rotation and Diagonal Reach)',
      apparatus: 'mat',
      bodyPosition: 'seated',
      blockCategory: 'cooldown',
      spinalPlanes: ['rotation', 'flexion'],
      phaseTitlesKo: [
        '다리를 벌려 앉아 준비',
        '몸통 회전 후 반대 발 쪽으로 리치',
        '몸통을 세우며 제어 복귀',
      ],
      phaseSummariesKo: [
        '다리를 편안한 너비로 벌려 앉고 양팔을 옆으로 펼칩니다.',
        '몸통을 돌린 뒤 반대 발 쪽으로 손을 뻗습니다. 반대쪽 엉덩이가 들리면 범위를 줄입니다.',
        '몸통을 서서히 세우고 정면으로 돌아옵니다. 통증 없는 범위에서 움직입니다.',
      ],
      breathCuesKo: [
        '편안하게 들이쉬며 준비',
        '숨을 참지 않고 내쉬며 회전과 리치',
        '자연스럽게 호흡하며 복귀',
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
        startToMiddleKo: '몸통 회전 뒤 앞손이 반대 발 쪽으로 이동합니다.',
        middleToEndKo: '몸통을 다시 세우고 정면으로 돌아옵니다.',
        invariantAnchorsKo: '도해에서는 골반과 발 지지점을 고정해 경로를 단순화했습니다.',
        keyJointChangeKo: '회전과 대각 리치를 함께 보여주는 매트 동작입니다.',
      }),
      mobileSummaryBulletsKo: Object.freeze([
        '반대쪽 엉덩이 지지를 유지할 수 있는 범위',
        '팔만 움직이지 않고 몸통에서 회전',
        '좌표와 각도는 개인의 목표값이 아닌 그림용 설정',
      ] as const),
      correction: {
        reviewedScopeKo: 'Pilatesology The Saw의 Mat·Tips 본문에서 반대쪽 엉덩이 지지, 몸통 회전, 반대 발 쪽 리치 설명을 2026-11-08에 대조했어요.',
        correctionKo: '매트 쏘의 참고 도해만 연결하고 리포머 머메이드와 캐딜락 캣의 잘못된 연결을 제거했어요.',
        limitationKo: '공개 설명의 큰 동작 특징만 대조했어요. 좌표·각도·근육 활성·시선·호흡 시점은 실측 검증이 아니며, 개인의 안전 범위를 보증하지 않아요. 통증이 있으면 중단하세요.',
        sources: [
          { title: 'Pilatesology Encyclopedia: The Saw', url: 'https://pilatesology.com/pilatesology-encyclopedia-the-saw/' },
        ],
      },
    },
    'rotation-mat-spine-twist': {
      movementId: 'rotation-mat-spine-twist',
      archetypeId: 'rotation-mat-spine-twist-isolated',
      archetypeTitleKo: '매트 스파인 트위스트 (Spine Twist) · 세워 앉은 몸통 회전',
      nameKo: '매트 스파인 트위스트 (The Spine Twist)',
      nameEn: 'The Spine Twist (Upright Seated Rotation)',
      apparatus: 'mat',
      bodyPosition: 'seated',
      blockCategory: 'upper-body',
      spinalPlanes: ['rotation', 'neutral'],
      phaseTitlesKo: [
        '다리를 모아 앉아 준비',
        '키를 세운 채 몸통 회전',
        '중앙으로 제어 복귀',
      ],
      phaseSummariesKo: [
        '두 다리를 펴고 발을 모아 당긴 채 편안하게 앉습니다. 몸통이 엉덩이 뒤로 넘어가지 않도록 합니다.',
        '몸통을 길게 세운 채 회전합니다. 팔이나 목만 따로 돌려 범위를 늘리지 않습니다.',
        '몸통 높이를 유지하며 천천히 중앙으로 돌아옵니다.',
      ],
      breathCuesKo: [
        '편안하게 들이쉬며 준비',
        '숨을 참지 않고 내쉬며 회전',
        '자연스럽게 호흡하며 복귀',
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
        startToMiddleKo: '상체를 세운 상태에서 회전하는 모습을 보여줍니다.',
        middleToEndKo: '몸통을 중앙으로 되돌립니다.',
        invariantAnchorsKo: '도해의 골반·발 지지점 고정은 그림을 위한 단순화입니다.',
        keyJointChangeKo: '팔만 흔들거나 뒤로 눕는 동작과 구별합니다.',
      }),
      mobileSummaryBulletsKo: Object.freeze([
        '발을 모으고 몸통을 세운 매트 앉은 자세',
        '뒤로 넘어가지 않으며 몸통 회전',
        '회전 각도는 개인의 목표값이 아닌 그림용 설정',
      ] as const),
      correction: {
        reviewedScopeKo: 'Pilatesology The Spine Twist의 Mat·Tips 본문에서 곧게 앉기, 발 모으기·발목 당기기, 회전 중 몸통 높이 유지 설명을 2026-11-08에 대조했어요.',
        correctionKo: '매트 장좌 회전과 의자·캐딜락·배럴의 지지 조건을 구별하고 후자의 자동 연결을 제거했어요.',
        limitationKo: '공개 설명의 큰 동작 특징만 대조했어요. 좌표·각도·근육 활성·시선·호흡 시점은 실측 검증이 아니며, 개인의 안전 범위를 보증하지 않아요. 통증이 있으면 중단하세요.',
        sources: [
          { title: 'Pilatesology Encyclopedia: The Spine Twist', url: 'https://pilatesology.com/pilatesology-encyclopedia-the-spine-twist/' },
        ],
      },
    },
    'rotation-mat-criss-cross': {
      movementId: 'rotation-mat-criss-cross',
      archetypeId: 'rotation-mat-criss-cross-isolated',
      archetypeTitleKo: '매트 크리스크로스 (Criss-Cross) · 누운 몸통 회전과 다리 교대',
      nameKo: '매트 크리스크로스 (The Criss-Cross)',
      nameEn: 'The Criss-Cross (Supine Curl with Rotation and Leg Change)',
      apparatus: 'mat',
      bodyPosition: 'supine',
      blockCategory: 'core',
      spinalPlanes: ['rotation', 'flexion'],
      phaseTitlesKo: [
        '누운 자세에서 상체를 들어 준비',
        '몸통을 회전하며 다리 교대',
        '중앙을 지나 제어 전환',
      ],
      phaseSummariesKo: [
        '누운 자세에서 머리를 손으로 받치고 목을 당기지 않은 채 상체를 들어 준비합니다.',
        '한쪽 무릎을 향해 몸통을 돌리고 반대 다리를 뻗습니다. 팔꿈치만 당기지 않고 몸통이 흔들리면 범위를 줄입니다.',
        '몸통을 제어하면서 중앙을 지나 다리를 바꿉니다. 다리 높이는 편안하게 조절합니다.',
      ],
      breathCuesKo: [
        '편안하게 호흡하며 준비',
        '숨을 참지 않고 회전',
        '자연스럽게 호흡하며 다리 교대',
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
          reasonKo: '다리 교대 중 몸통 제어를 나타내는 개략적 표시이며 개별 근육 활성은 측정하지 않았습니다.',
        }),
      ]),
      poseDeltaSummary: Object.freeze({
        startToMiddleKo: '상체를 들어 몸통을 회전하며 한쪽 다리를 뻗습니다.',
        middleToEndKo: '중앙을 지나 다음 교대를 준비합니다.',
        invariantAnchorsKo: '도해에서 고정한 골반은 흔들림 제어를 보여주는 단순화입니다.',
        keyJointChangeKo: '팔꿈치 당김보다 몸통 회전과 다리 교대를 구별해 봅니다.',
      }),
      mobileSummaryBulletsKo: Object.freeze([
        '몸통이 흔들리지 않는 범위에서 다리 교대',
        '어깨만 당기지 않고 몸통에서 회전',
        '그림의 다리·팔꿈치 각도를 맞추려고 무리하지 않기',
      ] as const),
      correction: {
        reviewedScopeKo: 'Pilatesology Criss-Cross의 Mat·Tips 본문에서 몸통 들어 회전하기, 다리 교대 중 흔들림 제어 설명을 2026-11-08에 대조했어요. 고전 34동작의 16번으로 표기한 오류도 정정했어요.',
        correctionKo: '매트 크리스크로스와 리포머 코디네이션·복부 5종 시리즈 전체를 같은 도해로 연결하지 않도록 했어요.',
        limitationKo: '공개 설명의 큰 동작 특징만 대조했어요. 좌표·각도·근육 활성·시선·호흡 시점은 실측 검증이 아니며, 개인의 안전 범위를 보증하지 않아요. 통증이 있으면 중단하세요.',
        sources: [
          { title: 'Pilatesology Encyclopedia: Criss-Cross', url: 'https://pilatesology.com/pilatesology-encyclopedia-criss-cross/' },
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
      // Authored yaw is telemetry, not a prescribed anatomical target.
      cautionKo: indicators.pelvisAnchor.labelKo,
    }),
    Object.freeze({
      id: `${meta.movementId}-${phaseId}-pelvis-anchor`,
      labelKo: indicators.pelvisAnchor.labelKo,
      cueKo: '지지점을 유지할 수 있는 편안한 범위에서 움직입니다.',
      kind: 'anchor-lock',
      from: indicators.pelvisAnchor.leftAnchor,
      to: indicators.pelvisAnchor.rightAnchor,
      cautionKo: '통증이나 불편함이 생기면 중단하고, 몸통이 흔들리면 범위를 줄입니다.',
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
      ...(meta.movementId === 'rotation-mat-criss-cross'
        ? []
        : [Object.freeze({
            joint: 'heel' as const,
            surfaceKo: meta.movementId === 'rotation-mat-spine-twist'
              ? '장좌 발 지지점 (도해용 단순화)'
              : 'V-싯 양 발뒤꿈치 매트 지지점',
            point: joints2D.heel,
          })]),
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
      ...(meta.movementId === 'rotation-mat-criss-cross' ? ['hip', 'knee', 'ankle', 'heel', 'toe'] as const : []),
    ] as const),
    apparatusState: Object.freeze({
      carriageOffsetPx: 0,
      pedalAngleDeg: 0,
      springTensionLevel: 'none' as const,
      supportSurfaceKo:
        meta.bodyPosition === 'seated'
          ? '매트 시티드 (양측 좌골 수직 앵커 고정)'
          : '매트 누운 자세 (골반 지지)',
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
          checkedAt: rotationSourceFacts.checkedAtUtc,
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
      assetSha256: null,
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
