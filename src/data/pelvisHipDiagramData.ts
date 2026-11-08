/**
 * SPDX-License-Identifier: MIT
 * Track I2 — Pelvis & Hip 2D Diagram Data & Track I7 Registry Integration Helpers
 *
 * Covers all 7 Pelvis & Hip variants and 3 archetype keys:
 *  1) Mat Pelvic Curl (`pelvis-mat-pelvic-curl`, archetype `'pelvis-curl'`)
 *  2) Mat Bridge (`original-mat-bridge`, archetype `'pelvis-bridging'`)
 *  3) Mat Shoulder Bridge with single-leg extension (`pelvis-mat-shoulder-bridge`, archetype `'shoulder-bridge'`)
 *  4) Reformer Supported Bridge (`original-reformer-supported-bridge`)
 *  5) Reformer Bottom Lift / Articulated Bridge & Hamstring Curl (`ex-bridging-01`)
 *  6) Cadillac Tower Bar Shoulder Bridge (`ex-bridging-02`)
 *  7) Cadillac Table Bridge (`original-cadillac-table-bridge`)
 */

import type { MovementDiagramCorrection } from './movementDiagramCorrections';
import type {
  CatalogMovementVisualAsset,
  JointAlignmentGuide,
  MovementDirectionVector,
  MuscleHighlightSpec,
  PhasePoseSpec,
  RigJointMap,
} from './movementVisualRigCatalog';
import {
  getPelvisHipSourceLinksForCorrection,
  PELVIS_HIP_TRUTHFULNESS_METADATA,
} from './pelvisHipProvenance';
import {
  PELVIS_HIP_ARCHETYPE_IDS,
  PELVIS_HIP_KINEMATIC_BLUEPRINTS,
  PELVIS_HIP_VARIANT_IDS,
  pelvisPt,
  resolvePelvisHipVariantId,
  type PelvisHipApparatusGeometry,
  type PelvisHipArchetypeId,
  type PelvisHipVariantId,
} from '../models/pelvisHip2dModel';
import type { ApparatusType, ClassBlockCategory, SpinalPlane } from '../types/pilates';

interface PelvisHipVariantSpec {
  readonly variantId: PelvisHipVariantId;
  readonly nameKo: string;
  readonly nameEn: string;
  readonly apparatus: ApparatusType;
  readonly blockCategory: ClassBlockCategory;
  readonly spinalPlanes: readonly SpinalPlane[];
  readonly isUnilateral: boolean;
  readonly archetypeId: string;
  readonly archetypeTitleKo: string;
  readonly springTensionLevel: 'low' | 'medium' | 'high' | 'none';
  readonly propPositionKo?: string;
  readonly phaseTitlesKo: readonly string[];
  readonly phaseSummariesKo: readonly string[];
  readonly breathCuesKo: readonly string[];
  readonly fixedAnchorsMeta: readonly {
    readonly joint: keyof RigJointMap;
    readonly surfaceKo: string;
  }[];
  readonly movingJoints: readonly (keyof RigJointMap)[];
  readonly alignments: {
    readonly start: readonly JointAlignmentGuide[];
    readonly middle: readonly JointAlignmentGuide[];
    readonly end: readonly JointAlignmentGuide[];
  };
  readonly directionVectors: {
    readonly start: readonly MovementDirectionVector[];
    readonly middle: readonly MovementDirectionVector[];
    readonly end: readonly MovementDirectionVector[];
  };
  readonly primaryMuscles: readonly MuscleHighlightSpec[];
  readonly poseDeltaSummary: {
    readonly startToMiddleKo: string;
    readonly middleToEndKo: string;
    readonly invariantAnchorsKo: string;
    readonly keyJointChangeKo: string;
  };
  readonly mobileSummaryBulletsKo: readonly string[];
  readonly reviewedScopeKo: string;
  readonly correctionKo: string;
}

const DEFAULT_BRIDGE_MUSCLES: readonly MuscleHighlightSpec[] = Object.freeze([
  Object.freeze({
    muscleGroupId: 'glute-max',
    labelKo: '대둔근 (후면 고관절 신전)',
    labelEn: 'Gluteus Maximus',
    catalogMuscleMatches: Object.freeze(['대둔근', '둔근'] as const),
    role: 'primary',
    roleLabelKo: '주동근 (주 타겟)',
    activePhases: Object.freeze(['middle', 'end'] as const),
    anchorJoints: Object.freeze(['pelvis', 'hip', 'knee'] as const),
    reasonKo: '고관절 신전과 골반 후방 안정화를 주도하여 브리지 사선 지지력을 만듭니다.',
  }),
  Object.freeze({
    muscleGroupId: 'hamstrings',
    labelKo: '햄스트링 (슬관절 굴곡·후면 사슬)',
    labelEn: 'Hamstrings',
    catalogMuscleMatches: Object.freeze(['햄스트링'] as const),
    role: 'primary',
    roleLabelKo: '주동근 (주 타겟)',
    activePhases: Object.freeze(['middle'] as const),
    anchorJoints: Object.freeze(['pelvis', 'hip', 'knee'] as const),
    reasonKo: '뒤꿈치 접지력을 통해 좌골결절을 무릎 쪽으로 끌어당겨 후면 사슬을 수축합니다.',
  }),
  Object.freeze({
    muscleGroupId: 'core-transversus',
    labelKo: '심부 코어 (복횡근·다열근·골반저근)',
    labelEn: 'Deep Core & Transversus Abdominis',
    catalogMuscleMatches: Object.freeze(['복횡근', '척추분절근', '몸통'] as const),
    role: 'stabilizer',
    roleLabelKo: '안정화근 (코어·정렬 유지)',
    activePhases: Object.freeze(['start', 'middle', 'end'] as const),
    anchorJoints: Object.freeze(['thoracic', 'lumbar', 'pelvis'] as const),
    reasonKo: '골반 후방경사 분절과 흉곽 닫힘(Rib Knit)을 유지해 요추 과신전을 방지합니다.',
  }),
  Object.freeze({
    muscleGroupId: 'hip-flexor-iliopsoas',
    labelKo: '장요근·고관절 굴곡근 (전면 고관절)',
    labelEn: 'Iliopsoas & Hip Flexors',
    catalogMuscleMatches: Object.freeze(['장요근', '고관절'] as const),
    role: 'lengthening',
    roleLabelKo: '신장·이완 부위',
    activePhases: Object.freeze(['middle', 'end'] as const),
    anchorJoints: Object.freeze(['lumbar', 'pelvis', 'hip', 'knee'] as const),
    reasonKo: '브리지 사선 정점에서 전면 고관절과 대퇴직근이 길게 신장됩니다.',
  }),
]);

const VARIANT_SPECS: Readonly<Record<PelvisHipVariantId, PelvisHipVariantSpec>> = Object.freeze({
  'pelvis-mat-pelvic-curl': Object.freeze({
    variantId: 'pelvis-mat-pelvic-curl',
    nameKo: '매트 펠빅 컬 (골반 후방경사 임프린트 & 척추 분절)',
    nameEn: 'Mat Pelvic Curl (Articulated Imprint & Roll-Down)',
    apparatus: 'mat',
    blockCategory: 'bridging',
    spinalPlanes: Object.freeze(['flexion', 'extension', 'neutral'] as const),
    isUnilateral: false,
    archetypeId: 'pelvis-curl',
    archetypeTitleKo: '매트 펠빅 컬 · 복부 임프린트 선행 & 순차 분절 롤다운 완전 착지',
    springTensionLevel: 'none',
    phaseTitlesKo: Object.freeze([
      '수파인 골반 중립 · 좌골 너비 양발 평행 세팅',
      '골반 후방경사(22° 임프린트) 선행 · 어깨-골반-무릎 사선 정점',
      '흉골 연화 · 상부 흉추→요추→천골 매트 완전 착지 복귀',
    ] as const),
    phaseSummariesKo: Object.freeze([
      '바로 누워 무릎을 굽히고 양발 뒤꿈치를 좌골 너비(250,148)로 매트에 두며 양팔은 몸통 옆을 길게 누릅니다.',
      '날숨 초반 복부 수축으로 골반 후방경사(Imprint)를 먼저 만든 뒤 척추를 한 마디씩 말아 올려 흉곽 들뜸 없이 어깨(92,140)-고관절(192,100)-무릎(232,84) 사선(21.8°)을 완성합니다.',
      '날숨에 흉골부터 부드럽게 녹여 상부 흉추(124,142)→요추(154,142)→골반(184,144)이 공중에 뜨지 않고 매트 지지면에 완전히 안착하며 중립 골반을 회복합니다.',
    ] as const),
    breathCuesKo: Object.freeze([
      '들숨: 흉곽 측면·후면을 넓히며 경추와 꼬리뼈 축 길이 준비',
      '날숨: 아랫배 스쿱으로 치골을 말아 올리며 사선 정점까지 분절 거상',
      '날숨 유지: 윗등부터 도장 찍듯 내려와 천골 중립 착지 후 들숨 정리',
    ] as const),
    fixedAnchorsMeta: Object.freeze([
      { joint: 'head', surfaceKo: '매트 후두부 수평 지지점 (54,142 · 경추 체중 부하 금지)' },
      { joint: 'shoulder', surfaceKo: '양측 견갑골 상부 광폭 지지점 (92,140)' },
      { joint: 'heel', surfaceKo: '매트 양발 뒤꿈치 평행 지지점 (250,148)' },
    ] as const),
    movingJoints: Object.freeze(['thoracic', 'lumbar', 'pelvis', 'hip', 'knee'] as const),
    alignments: Object.freeze({
      start: Object.freeze([
        Object.freeze({
          id: 'pelvic-curl-start-neutral-base',
          labelKo: '경추-흉추-천골 수평 지지선 (y:142~144)',
          cueKo: '후두부·견갑골·천골과 양발을 매트에 고르게 두고 목의 힘을 뺍니다.',
          kind: 'anchor-lock',
          from: pelvisPt(54, 142),
          to: pelvisPt(250, 148),
          cautionKo: '시작 전부터 둔근을 과하게 조이지 않습니다.',
        }),
      ] as const),
      middle: Object.freeze([
        Object.freeze({
          id: 'pelvic-curl-diagonal-collinear',
          labelKo: '어깨-고관절-무릎 분절 사선 축 (21.8° · Rib Knit)',
          cueKo: '갈비뼈 하단을 골반 쪽으로 닫아 요추 과신전 없이 사선 일직선을 유지합니다.',
          kind: 'axis-line',
          from: pelvisPt(92, 140),
          to: pelvisPt(232, 84),
          targetAngleDeg: 22,
          cautionKo: '허리를 꺾어 높이를 만들거나 목에 체중을 싣지 않습니다.',
        }),
      ] as const),
      end: Object.freeze([
        Object.freeze({
          id: 'pelvic-curl-complete-mat-landing',
          labelKo: '흉추(142)·요추(142)·천골(144) 매트 완전 착지선',
          cueKo: '윗등부터 꼬리뼈까지 매트에 빈틈없이 순서대로 내려놓고 골반 중립(0°)으로 복귀합니다.',
          kind: 'neutral-zone',
          from: pelvisPt(124, 142),
          to: pelvisPt(184, 144),
          cautionKo: '허리나 골반이 공중에 떠 있는 채로 동작을 끝내지 않습니다.',
        }),
      ] as const),
    }),
    directionVectors: Object.freeze({
      start: Object.freeze([
        Object.freeze({
          id: 'vec-pelvic-curl-imprint-init',
          labelKo: '복부 수축 기반 골반 후방경사(Imprint) 시작',
          kind: 'spine-articulation',
          points: Object.freeze([pelvisPt(184, 144), pelvisPt(176, 132)] as const),
          phaseScope: 'start',
        }),
      ] as const),
      middle: Object.freeze([
        Object.freeze({
          id: 'vec-pelvic-curl-roll-up',
          labelKo: '천골→요추→흉추 순차 분절 거상 & 무릎 리치',
          kind: 'spine-articulation',
          points: Object.freeze([pelvisPt(184, 144), pelvisPt(184, 103), pelvisPt(232, 84)] as const),
          phaseScope: 'start-to-middle',
        }),
      ] as const),
      end: Object.freeze([
        Object.freeze({
          id: 'vec-pelvic-curl-roll-down-grounded',
          labelKo: '흉골 연화 → 흉추·요추·천골 매트(y:142~144) 완전 복귀',
          kind: 'return-control',
          points: Object.freeze([pelvisPt(124, 128), pelvisPt(154, 142), pelvisPt(184, 144)] as const),
          phaseScope: 'middle-to-end',
        }),
      ] as const),
    }),
    primaryMuscles: DEFAULT_BRIDGE_MUSCLES,
    poseDeltaSummary: Object.freeze({
      startToMiddleKo:
        '복부 후방경사 임프린트 후 골반(184,144→184,103)과 고관절(192,143→192,100)이 상승하며 어깨-고관절-무릎 사선(21.8°)을 형성합니다.',
      middleToEndKo:
        '상부 흉추(124,142)→요추(154,142)→천골(184,144) 순서로 분절 하강하여 공중 부유 없이 매트 지지면에 완전히 착지합니다.',
      invariantAnchorsKo: '후두부(54,142), 견갑대(92,140), 양발 뒤꿈치(250,148) 3점 매트 앵커가 고정됩니다.',
      keyJointChangeKo: '골반 후방경사(22°) 분절 거상(Δ41px) 및 끝 자세 매트 지지면(y:142~144) 완전 복귀',
    }),
    mobileSummaryBulletsKo: Object.freeze([
      '정렬·지지: 매트 수파인 (양발 좌골 너비 평행 · 상지 매트 밀착)',
      '핵심 변화: 복부 임프린트 선행 → 21.8° 사선 정점 → 매트(y:142~144) 완전 착지',
      '주 타겟: 대둔근, 햄스트링, 복횡근·척추분절근',
    ] as const),
    reviewedScopeKo:
      'BASI Pelvic Curl 가이드 및 NHS 골반 틸트·브리지 교육 리플릿의 준비 정렬, 복부 후방경사 선행, 사선 정점, 순차 롤다운 매트 완전 착지 원칙을 대조했어요.',
    correctionKo:
      '기존 끝 자세(end)에서 흉추·요추·골반이 허공(y:126~138)에 떠 있던 버그를 수정하여 매트 지지면(y:142~144)으로 완전히 복귀하도록 보정했어요.',
  }),

  'original-mat-bridge': Object.freeze({
    variantId: 'original-mat-bridge',
    nameKo: '매트 브리지',
    nameEn: 'Mat Bridge',
    apparatus: 'mat',
    blockCategory: 'bridging',
    spinalPlanes: Object.freeze(['extension', 'flexion', 'neutral'] as const),
    isUnilateral: false,
    archetypeId: 'pelvis-bridging',
    archetypeTitleKo: '매트 브리지 · 양발 삼각 지면반력 & 둔근·햄스트링 사선 기둥 분리',
    springTensionLevel: 'none',
    phaseTitlesKo: Object.freeze([
      '수파인 양발 삼각 지지 · 중립 골반 세팅',
      '양발 지면반력 푸시 · 어깨-고관절-무릎 사선 브리지 정점',
      '윗등부터 순차 하강 · 매트 지지면(y:142~144) 완전 안착',
    ] as const),
    phaseSummariesKo: Object.freeze([
      '바로 누워 양발 뒤꿈치와 발볼 삼각 지지점(252,148)에 체중을 고르게 두고 골반 중립을 세팅합니다.',
      '양발로 매트를 수직 아래로 밀어 대둔근·햄스트링 협응으로 고관절(192,98)을 신전하고 어깨(92,140)-고관절(192,98)-무릎(234,80) 사선 일직선(22.9°)을 유지합니다.',
      '목에 체중을 싣지 않고 흉추(124,142)→요추(154,142)→천골(184,144) 순으로 매트 표면에 완전히 내려놓습니다.',
    ] as const),
    breathCuesKo: Object.freeze([
      '들숨: 양발 삼각 지지점과 견갑골 접지 확인',
      '날숨: 발바닥으로 매트를 밀며 골반을 사선 정점까지 리프트',
      '날숨: 흉추부터 천골까지 매트 지지면으로 천천히 감속 복귀',
    ] as const),
    fixedAnchorsMeta: Object.freeze([
      { joint: 'head', surfaceKo: '매트 후두부 지지면 (54,142)' },
      { joint: 'shoulder', surfaceKo: '양측 견갑골 지지면 (92,140)' },
      { joint: 'heel', surfaceKo: '양발 삼각 지지점 매트 접지 (252,148)' },
    ] as const),
    movingJoints: Object.freeze(['thoracic', 'lumbar', 'pelvis', 'hip', 'knee'] as const),
    alignments: Object.freeze({
      start: Object.freeze([
        Object.freeze({
          id: 'mat-bridge-start-tripod',
          labelKo: '견갑-천골-양발 삼각 기저선',
          cueKo: '양발의 압력을 고르게 느끼며 목과 어깨의 긴장을 풉니다.',
          kind: 'anchor-lock',
          from: pelvisPt(92, 140),
          to: pelvisPt(252, 148),
          cautionKo: '동작 중 고개를 좌우로 돌리지 않습니다.',
        }),
      ] as const),
      middle: Object.freeze([
        Object.freeze({
          id: 'mat-bridge-diagonal-pillar',
          labelKo: '어깨-고관절-무릎 브리지 사선 축 (22.9°)',
          cueKo: '둔근·햄스트링으로 골반을 받치고 갈비뼈가 들뜨지 않게 유지합니다.',
          kind: 'axis-line',
          from: pelvisPt(92, 140),
          to: pelvisPt(234, 80),
          targetAngleDeg: 23,
          cautionKo: '허리를 과신전하여 높이를 만들지 않습니다.',
        }),
      ] as const),
      end: Object.freeze([
        Object.freeze({
          id: 'mat-bridge-end-grounded',
          labelKo: '매트 지지면(y:142~144) 척추·골반 완전 복귀선',
          cueKo: '흉추·요추·골반이 매트 바닥에 완전히 착지하여 중립을 회복합니다.',
          kind: 'neutral-zone',
          from: pelvisPt(124, 142),
          to: pelvisPt(184, 144),
          cautionKo: '엉덩이를 쿵 떨어뜨리거나 허리를 띄워두지 않습니다.',
        }),
      ] as const),
    }),
    directionVectors: Object.freeze({
      start: Object.freeze([
        Object.freeze({
          id: 'vec-mat-bridge-grf-prep',
          labelKo: '양발 수직 지면반력(GRF) 준비',
          kind: 'axial-lengthening',
          points: Object.freeze([pelvisPt(252, 148), pelvisPt(228, 96)] as const),
          phaseScope: 'start',
        }),
      ] as const),
      middle: Object.freeze([
        Object.freeze({
          id: 'vec-mat-bridge-hip-ext',
          labelKo: '고관절 신전 리프트 & 정강이 전방 리치',
          kind: 'spine-articulation',
          points: Object.freeze([pelvisPt(184, 144), pelvisPt(184, 101), pelvisPt(234, 80)] as const),
          phaseScope: 'start-to-middle',
        }),
      ] as const),
      end: Object.freeze([
        Object.freeze({
          id: 'vec-mat-bridge-return-mat',
          labelKo: '흉추→요추→천골 매트(y:142~144) 순차 착지',
          kind: 'return-control',
          points: Object.freeze([pelvisPt(124, 127), pelvisPt(154, 142), pelvisPt(184, 144)] as const),
          phaseScope: 'middle-to-end',
        }),
      ] as const),
    }),
    primaryMuscles: DEFAULT_BRIDGE_MUSCLES,
    poseDeltaSummary: Object.freeze({
      startToMiddleKo:
        '양발 지지점(252,148) 푸시로 골반(184,144→184,101)과 고관절(192,143→192,98)이 상승하여 어깨-고관절-무릎 사선(22.9°)을 이룹니다.',
      middleToEndKo:
        '흉추(124,142)·요추(154,142)·골반(184,144)이 허공에 남지 않고 매트 지지면으로 완전히 착지합니다.',
      invariantAnchorsKo: '후두부(54,142), 견갑골(92,140), 양발 뒤꿈치(252,148) 지지점이 고정됩니다.',
      keyJointChangeKo: '양발 삼각 지지 고관절 신전(Δ45px) 및 끝 자세 매트 지지면(y:142~144) 완전 복귀',
    }),
    mobileSummaryBulletsKo: Object.freeze([
      '정렬·지지: 매트 수파인 (양발 삼각 지지 · 견갑대 광폭 지지)',
      '핵심 변화: 고관절 신전 22.9° 사선 기둥 → 매트(y:142~144) 완전 착지',
      '주 타겟: 대둔근, 햄스트링, 심부 코어',
    ] as const),
    reviewedScopeKo:
      'CUH NHS 및 OUH NHS 브리지 교육 자료의 양발 지지, 고관절 신전 사선 정렬, 상부 흉추부터 천골까지 완전 착지 복귀를 대조했어요.',
    correctionKo:
      '끝 자세(end)에서 흉추·요추가 매트 위 허공(y:136~138)에 떠 있던 미완성 좌표를 매트 지지면(y:142~144) 완전 착지 상태로 수정했어요.',
  }),

  'pelvis-mat-shoulder-bridge': Object.freeze({
    variantId: 'pelvis-mat-shoulder-bridge',
    nameKo: '매트 숄더 브리지 (단측 하지 사선 신전)',
    nameEn: 'Mat Shoulder Bridge (Single-Leg Diagonal Extension)',
    apparatus: 'mat',
    blockCategory: 'bridging',
    spinalPlanes: Object.freeze(['extension', 'neutral', 'flexion'] as const),
    isUnilateral: true,
    archetypeId: 'shoulder-bridge',
    archetypeTitleKo: '매트 숄더 브리지 · 골반 수평 유지 & 단측 하지 사선 신전 분리',
    springTensionLevel: 'none',
    phaseTitlesKo: Object.freeze([
      '수파인 양발 지지 · 견갑대 및 골반 수평 준비',
      '브리지 정점 지지측 발 고정 · 가동측 다리 사선 신전(278,61)',
      '가동 발 매트 착지 후 윗등→천골 매트(y:142~144) 완전 복귀',
    ] as const),
    phaseSummariesKo: Object.freeze([
      '바로 누워 양발을 골반 너비로 매트에 두고 견갑대와 후두부, 양팔 지지 기반을 세팅합니다.',
      '브리지 정점(어깨 92,140-고관절 192,98-무릎 228,83 사선 일직선)에서 지지측 발(farAnkle: 256,146)은 매트를 단단히 누르고, 골반 좌우 수평(ASIS Level)을 지킨 채 가동측 다리(ankle: 264,68, toe: 278,61)를 사선으로 길게 뻗습니다.',
      '가동측 발을 먼저 매트(256,146)에 내려 양발 지지를 회복한 뒤, 흉추(124,142)→요추(154,142)→천골(184,144)을 매트에 완전히 착지시킵니다.',
    ] as const),
    breathCuesKo: Object.freeze([
      '들숨: 견갑대 지지와 양쪽 골반(ASIS) 수평 정렬 확인',
      '날숨: 지지측 둔근 고정 후 가동측 다리를 사선 멀리 리치',
      '들숨 착지 / 날숨 롤다운: 발 복귀 후 척추 마디마디 매트 완전 안착',
    ] as const),
    fixedAnchorsMeta: Object.freeze([
      { joint: 'shoulder', surfaceKo: '양측 견갑대 광폭 지지면 (92,140)' },
      { joint: 'farAnkle', surfaceKo: '매트 지지측 발목·뒤꿈치 고정 앵커 (256,146)' },
      { joint: 'hand', surfaceKo: '양팔 후면 및 손바닥 매트 지지점 (176,146)' },
    ] as const),
    movingJoints: Object.freeze([
      'thoracic',
      'lumbar',
      'pelvis',
      'hip',
      'knee',
      'ankle',
      'heel',
      'toe',
    ] as const),
    alignments: Object.freeze({
      start: Object.freeze([
        Object.freeze({
          id: 'shoulder-bridge-start-asis',
          labelKo: '양측 골반(ASIS) 수평 및 양발 대칭 지지선',
          cueKo: '단측 거상 전 양쪽 골반 높이와 견갑골 지지를 대칭으로 맞춥니다.',
          kind: 'anchor-lock',
          from: pelvisPt(92, 140),
          to: pelvisPt(256, 146),
          cautionKo: '목에 체중이 실리지 않도록 쇄골을 넓게 유지합니다.',
        }),
      ] as const),
      middle: Object.freeze([
        Object.freeze({
          id: 'shoulder-bridge-single-leg-collinear',
          labelKo: '어깨-고관절-가동무릎-발끝 사선 일직선 (22.7° · 단측 신전)',
          cueKo: '지지측 발(256,146)로 매트를 밀어 골반 처짐을 막고 가동 다리를 사선 축으로 길게 뻗습니다.',
          kind: 'axis-line',
          from: pelvisPt(92, 140),
          to: pelvisPt(278, 61),
          targetAngleDeg: 23,
          cautionKo: '다리를 높이 차려고 허리를 꺾거나 골반이 한쪽으로 기울지 않게 합니다.',
        }),
      ] as const),
      end: Object.freeze([
        Object.freeze({
          id: 'shoulder-bridge-end-mat-return',
          labelKo: '양발 접지 회복 및 흉추·요추·천골 매트(y:142~144) 완전 착지',
          cueKo: '발을 먼저 매트에 내려놓은 뒤 윗등부터 꼬리뼈까지 순차 하강하여 착지합니다.',
          kind: 'neutral-zone',
          from: pelvisPt(124, 142),
          to: pelvisPt(184, 144),
          cautionKo: '한 다리를 든 채로 급격히 허리를 떨어뜨리지 않습니다.',
        }),
      ] as const),
    }),
    directionVectors: Object.freeze({
      start: Object.freeze([
        Object.freeze({
          id: 'vec-shoulder-bridge-prep',
          labelKo: '지지측 둔근·햄스트링 앵커 준비',
          kind: 'axial-lengthening',
          points: Object.freeze([pelvisPt(184, 144), pelvisPt(184, 101)] as const),
          phaseScope: 'start',
        }),
      ] as const),
      middle: Object.freeze([
        Object.freeze({
          id: 'vec-shoulder-bridge-leg-reach',
          labelKo: '단측 하지 사선 신전 리치 (ankle 256,146→264,68)',
          kind: 'limb-excursion',
          points: Object.freeze([pelvisPt(256, 146), pelvisPt(264, 68), pelvisPt(278, 61)] as const),
          phaseScope: 'start-to-middle',
        }),
      ] as const),
      end: Object.freeze([
        Object.freeze({
          id: 'vec-shoulder-bridge-foot-and-spine-return',
          labelKo: '가동 발 착지 후 척추 매트(y:142~144) 순차 하강',
          kind: 'return-control',
          points: Object.freeze([pelvisPt(264, 68), pelvisPt(256, 146), pelvisPt(184, 144)] as const),
          phaseScope: 'middle-to-end',
        }),
      ] as const),
    }),
    primaryMuscles: Object.freeze([
      ...DEFAULT_BRIDGE_MUSCLES.slice(0, 2),
      Object.freeze({
        muscleGroupId: 'glute-med',
        labelKo: '중둔근·외전근군 (측면 골반 수평 지지)',
        labelEn: 'Gluteus Medius & Pelvic Stabilizers',
        catalogMuscleMatches: Object.freeze(['중둔근', '둔근', '골반 안정화근'] as const),
        role: 'stabilizer',
        roleLabelKo: '안정화근 (코어·정렬 유지)',
        activePhases: Object.freeze(['start', 'middle', 'end'] as const),
        anchorJoints: Object.freeze(['pelvis', 'hip', 'knee'] as const),
        reasonKo: '단측 다리 신전 시 지지측 골반이 회전하거나 아래로 처지지 않게 수평으로 잡아줍니다.',
      }),
      DEFAULT_BRIDGE_MUSCLES[3],
    ] as const),
    poseDeltaSummary: Object.freeze({
      startToMiddleKo:
        '지지측 발(farAnkle: 256,146)은 매트에 고정한 채 골반(184,101)을 거상하고 가동측 다리(ankle: 264,68, toe: 278,61)를 사선 일직선으로 신전합니다.',
      middleToEndKo:
        '가동측 발이 매트(256,146)로 복귀한 뒤 흉추(124,142)→요추(154,142)→골반(184,144)이 매트에 완전히 착지합니다.',
      invariantAnchorsKo: '견갑대(92,140), 후두부(54,142), 지지측 발(farAnkle: 256,146)이 고정됩니다.',
      keyJointChangeKo: '단측 하지 사선 신전(ankle dy -78px) 분리 및 끝 자세 매트(y:142~144) 완전 복귀',
    }),
    mobileSummaryBulletsKo: Object.freeze([
      '정렬·지지: 매트 숄더 브리지 (지지측 발 매트 고정 · 골반 ASIS 수평)',
      '핵심 변화: 정점 단측 다리 사선 신전(278,61) → 착지 후 매트 완전 복귀',
      '주 타겟: 대둔근, 중둔근(골반 수평), 햄스트링, 복횡근',
    ] as const),
    reviewedScopeKo:
      'Pilates Anytime 및 South Tees NHS 숄더 브리지 가이드의 단측 다리 신전, 지지측 발 매트 고정, 골반 수평 유지, 발 착지 후 롤다운 순서를 대조했어요.',
    correctionKo:
      '양발 브리지와 단측 신전 숄더 브리지를 분리하고, 끝 자세(end)에서 척추·골반이 매트(y:142~144)로 완전히 내려오도록 수정했어요.',
  }),

  'original-reformer-supported-bridge': Object.freeze({
    variantId: 'original-reformer-supported-bridge',
    nameKo: '리포머 브리지 준비 (서포티드 브리지)',
    nameEn: 'Reformer Bridge Preparation (Supported Bridge)',
    apparatus: 'reformer',
    blockCategory: 'bridging',
    spinalPlanes: Object.freeze(['extension', 'neutral'] as const),
    isUnilateral: false,
    archetypeId: 'reformer-supported-bridge-isolated',
    archetypeTitleKo: '리포머 서포티드 브리지 · 고정 풋바 발 지지 & 캐리지 홈 스토퍼 고정 분리',
    springTensionLevel: 'high',
    phaseTitlesKo: Object.freeze([
      '헤드레스트 Flat · 풋바(266,126) 발 지지 & 스토퍼 밀착',
      '캐리지 스토퍼 고정 유지 · 어깨-고관절-무릎 사선 브리지 정점',
      '스토퍼 고정 유지 · 캐리지 베드(y:142~143) 완전 착지 복귀',
    ] as const),
    phaseSummariesKo: Object.freeze([
      '헤드레스트를 평평하게(Flat, y:143) 내리고 어깨를 숄더 블록(x:74)에 맞춘 뒤, 양발 뒤꿈치를 고정 풋바 상단(266,126)에 올리고 캐리지를 홈 스토퍼에 밀착합니다.',
      '캐리지가 밀리지 않게 뒤꿈치로 풋바(266,126)를 수직·몸 쪽으로 끌어당기며 골반(178,99)을 들어 어깨(88,139)-고관절(186,95)-무릎(228,76) 사선(24.2°)을 만듭니다.',
      '캐리지 스토퍼 고정을 유지한 채 상부 흉추(118,142)→요추(148,142)→골반(178,143)을 캐리지 베드 표면에 완전히 착지시킵니다.',
    ] as const),
    breathCuesKo: Object.freeze([
      '들숨: 헤드레스트 Flat 및 캐리지 홈 스토퍼 밀착 확인',
      '날숨: 캐리지 이동 없이(offset 2px 이내) 골반을 사선 정점으로 리프트',
      '날숨: 캐리지 흔들림 없이 윗등부터 캐리지 베드로 완전 착지',
    ] as const),
    fixedAnchorsMeta: Object.freeze([
      { joint: 'head', surfaceKo: '평평한(Flat) 리포머 헤드레스트 (52,141)' },
      { joint: 'shoulder', surfaceKo: '리포머 숄더 블록(x:74) 앞 견갑 지지면 (88,139)' },
      { joint: 'heel', surfaceKo: '리포머 고정 풋바 상단 뒤꿈치 접점 (266,126)' },
    ] as const),
    movingJoints: Object.freeze(['thoracic', 'lumbar', 'pelvis', 'hip', 'knee'] as const),
    alignments: Object.freeze({
      start: Object.freeze([
        Object.freeze({
          id: 'reformer-supported-bridge-stopper-check',
          labelKo: '헤드레스트 Flat(y:143) · 풋바(266,126) · 홈 스토퍼 고정선',
          cueKo: '브리지 전 헤드레스트를 Flat으로 낮추고 캐리지가 스토퍼에 닿아 있는지 확인합니다.',
          kind: 'anchor-lock',
          from: pelvisPt(52, 141),
          to: pelvisPt(266, 126),
          cautionKo: '헤드레스트가 올라간 상태에서 골반을 높이 들지 않습니다.',
        }),
      ] as const),
      middle: Object.freeze([
        Object.freeze({
          id: 'reformer-supported-bridge-diagonal',
          labelKo: '어깨-고관절-무릎 리포머 브리지 사선 축 (24.2°)',
          cueKo: '풋바 위 발 지지를 유지하고 캐리지가 밀려나가지 않게 햄스트링으로 제어합니다.',
          kind: 'axis-line',
          from: pelvisPt(88, 139),
          to: pelvisPt(228, 76),
          targetAngleDeg: 24,
          cautionKo: '허리를 과신전하거나 목을 돌리지 않습니다.',
        }),
      ] as const),
      end: Object.freeze([
        Object.freeze({
          id: 'reformer-supported-bridge-end-bed',
          labelKo: '캐리지 베드(y:142~143) 척추·골반 완전 착지선',
          cueKo: '흉추·요추·천골을 캐리지 매트 위에 완전히 내려놓고 중립 골반으로 돌아옵니다.',
          kind: 'neutral-zone',
          from: pelvisPt(118, 142),
          to: pelvisPt(178, 143),
          cautionKo: '하강 중 캐리지가 뒤로 밀리지 않게 끝까지 스토퍼를 지킵니다.',
        }),
      ] as const),
    }),
    directionVectors: Object.freeze({
      start: Object.freeze([
        Object.freeze({
          id: 'vec-ref-supp-stopper-pull',
          labelKo: '풋바 뒤꿈치 견인 & 홈 스토퍼 고정',
          kind: 'spring-resistance',
          points: Object.freeze([pelvisPt(266, 126), pelvisPt(226, 92)] as const),
          phaseScope: 'start',
        }),
      ] as const),
      middle: Object.freeze([
        Object.freeze({
          id: 'vec-ref-supp-pelvis-lift',
          labelKo: '캐리지 고정 골반 사선 리프트 (pelvis y:143→99)',
          kind: 'spine-articulation',
          points: Object.freeze([pelvisPt(178, 143), pelvisPt(178, 99), pelvisPt(228, 76)] as const),
          phaseScope: 'start-to-middle',
        }),
      ] as const),
      end: Object.freeze([
        Object.freeze({
          id: 'vec-ref-supp-roll-down',
          labelKo: '윗등→천골 캐리지 베드(y:142~143) 완전 복귀',
          kind: 'return-control',
          points: Object.freeze([pelvisPt(118, 126), pelvisPt(148, 142), pelvisPt(178, 143)] as const),
          phaseScope: 'middle-to-end',
        }),
      ] as const),
    }),
    primaryMuscles: DEFAULT_BRIDGE_MUSCLES,
    poseDeltaSummary: Object.freeze({
      startToMiddleKo:
        '고정 풋바(266,126)에 뒤꿈치를 걸고 캐리지 스토퍼(offset 0→2px)를 지킨 채 골반(178,143→178,99)이 24.2° 사선 정점으로 올라갑니다.',
      middleToEndKo:
        '캐리지 홈 스토퍼(offset 0px) 위에서 흉추(118,142)·요추(148,142)·골반(178,143)이 캐리지 베드로 완전히 착지합니다.',
      invariantAnchorsKo: '헤드레스트 Flat 후두부(52,141), 숄더블록 견갑(88,139), 고정 풋바 뒤꿈치(266,126)가 고정됩니다.',
      keyJointChangeKo: '풋바 발 접점(266,126) 정합 + 스토퍼 고정 브리지(offset ≤2px) + 캐리지 베드 완전 착지',
    }),
    mobileSummaryBulletsKo: Object.freeze([
      '정렬·지지: 리포머 수파인 · 헤드레스트 Flat · 고정 풋바(266,126)',
      '핵심 변화: 캐리지 스토퍼 고정 유지 + 24.2° 사선 리프트 및 베드 착지',
      '주 타겟: 대둔근, 햄스트링, 심부 코어',
    ] as const),
    reviewedScopeKo:
      'Merrithew STOTT PILATES 리포머 브리지 준비 가이드의 헤드레스트 Flat 세팅, 풋바 발 지지, 캐리지 스토퍼 고정 제어 및 완전 착지 복귀를 대조했어요.',
    correctionKo:
      '바닥(y:152)에 떠 있던 발을 고정 풋바 상단(266,126)으로 정합하고, 끝 자세에서 척추가 캐리지 베드(y:142~143)에 완전히 착지하도록 수정했어요.',
  }),

  'ex-bridging-01': Object.freeze({
    variantId: 'ex-bridging-01',
    nameKo: '리포머 아티큘레이팅 펠빅 리프트 & 햄스트링 컬',
    nameEn: 'Reformer Pelvic Lift Articulation & Hamstring Curl',
    apparatus: 'reformer',
    blockCategory: 'bridging',
    spinalPlanes: Object.freeze(['flexion', 'extension', 'neutral'] as const),
    isUnilateral: false,
    archetypeId: 'reformer-bottom-lift-hamstring-curl',
    archetypeTitleKo: '리포머 바텀 리프트 & 햄스트링 컬 · 스토퍼 체크 및 정점 캐리지 컬 활주',
    springTensionLevel: 'high',
    propPositionKo: '무릎 사이 미니볼(Mini-Ball) 내전근 30% 조임 결합',
    phaseTitlesKo: Object.freeze([
      '헤드레스트 Flat · 미니볼 조임 & 캐리지 홈 스토퍼 체크',
      '브리지 정점 사선 유지 · 햄스트링 컬 캐리지 제어 활주(18px)',
      '캐리지 홈 스토퍼 복귀 후 윗등→천골 캐리지(y:142~143) 착지',
    ] as const),
    phaseSummariesKo: Object.freeze([
      '헤드레스트를 반드시 Flat(y:143)으로 내리고 무릎 사이에 미니볼을 끼운 뒤, 양발 뒤꿈치를 풋바(266,126)에 두고 캐리지 홈 스토퍼 밀착(offset 0px)을 확인합니다.',
      '꼬리뼈부터 분절 거상하여 어깨(94,139)-고관절(192,97)-무릎(236,78) 사선(23.2°)을 유지한 채, 정점에서 캐리지를 15cm(18px) 소폭 밀었다가 햄스트링 힘으로 당겨옵니다.',
      '캐리지를 홈 스토퍼(offset 0px)에 완전히 복귀시킨 뒤 상부 흉추(118,142)→요추(148,142)→골반(178,143)을 캐리지 베드에 순차 착지합니다.',
    ] as const),
    breathCuesKo: Object.freeze([
      '들숨: 미니볼 내전근 텐션 및 헤드레스트 Flat 확인',
      '날숨 브리지 업 / 들숨 밀고 날숨 컬: 사선 골반 높이 유지하며 캐리지 인/아웃 제어',
      '날숨 하강: 캐리지 홈 스토퍼 고정 상태에서 윗등부터 캐리지 베드 완전 착지',
    ] as const),
    fixedAnchorsMeta: Object.freeze([
      { joint: 'heel', surfaceKo: '리포머 고정 풋바 상단 뒤꿈치 앵커 (266,126)' },
      { joint: 'head', surfaceKo: '평평한(Flat) 헤드레스트 후두부 지지 (52,141)' },
      { joint: 'shoulder', surfaceKo: '캐리지 견갑대 및 숄더 블록 지지 (88,139)' },
    ] as const),
    movingJoints: Object.freeze([
      'thoracic',
      'lumbar',
      'pelvis',
      'hip',
      'knee',
      'shoulder',
      'head',
    ] as const),
    alignments: Object.freeze({
      start: Object.freeze([
        Object.freeze({
          id: 'reformer-bottom-lift-home-stop',
          labelKo: '거상 전 캐리지 홈 스토퍼(0px) & 헤드레스트 Flat 체크',
          cueKo: '골반을 들어 올릴 때 캐리지가 밀리지 않도록 뒤꿈치로 풋바를 몸 쪽으로 당깁니다.',
          kind: 'anchor-lock',
          from: pelvisPt(88, 139),
          to: pelvisPt(266, 126),
          cautionKo: '브리지 전 반드시 헤드레스트를 완전히 Flat으로 내립니다.',
        }),
      ] as const),
      middle: Object.freeze([
        Object.freeze({
          id: 'reformer-bottom-lift-curl-diagonal',
          labelKo: '어깨-고관절-무릎 사선 유지 & 햄스트링 컬 활주 축 (23.2°)',
          cueKo: '무릎 사이 미니볼을 조이며 캐리지 활주(18px) 중에도 골반 사선 높이를 일정하게 지킵니다.',
          kind: 'axis-line',
          from: pelvisPt(94, 139),
          to: pelvisPt(236, 78),
          targetAngleDeg: 23,
          cautionKo: '캐리지를 밀 때 엉덩이가 떨어지거나 허리가 꺾이지 않게 주의합니다.',
        }),
      ] as const),
      end: Object.freeze([
        Object.freeze({
          id: 'reformer-bottom-lift-end-return',
          labelKo: '홈 스토퍼(0px) 복귀 및 캐리지 베드(y:142~143) 완전 착지',
          cueKo: '캐리지를 먼저 스토퍼로 당겨온 뒤 윗등부터 천골까지 캐리지에 내려놓습니다.',
          kind: 'neutral-zone',
          from: pelvisPt(118, 142),
          to: pelvisPt(178, 143),
          cautionKo: '캐리지가 움직이는 도중에 급격히 척추를 내려놓지 않습니다.',
        }),
      ] as const),
    }),
    directionVectors: Object.freeze({
      start: Object.freeze([
        Object.freeze({
          id: 'vec-bridging01-tilt',
          labelKo: '미니볼 스퀴즈 & 꼬리뼈 분절 컬업',
          kind: 'spine-articulation',
          points: Object.freeze([pelvisPt(178, 143), pelvisPt(178, 118)] as const),
          phaseScope: 'start',
        }),
      ] as const),
      middle: Object.freeze([
        Object.freeze({
          id: 'vec-bridging01-hamstring-curl',
          labelKo: '정점 사선 유지 · 캐리지 햄스트링 컬 인/아웃 (offset 18px)',
          kind: 'carriage-travel',
          points: Object.freeze([pelvisPt(226, 78), pelvisPt(236, 78), pelvisPt(184, 100)] as const),
          phaseScope: 'start-to-middle',
        }),
      ] as const),
      end: Object.freeze([
        Object.freeze({
          id: 'vec-bridging01-stopper-and-roll-down',
          labelKo: '홈 스토퍼 복귀 후 흉추→천골 캐리지 베드(y:142~143) 착지',
          kind: 'return-control',
          points: Object.freeze([pelvisPt(124, 126), pelvisPt(148, 142), pelvisPt(178, 143)] as const),
          phaseScope: 'middle-to-end',
        }),
      ] as const),
    }),
    primaryMuscles: Object.freeze([
      DEFAULT_BRIDGE_MUSCLES[0],
      DEFAULT_BRIDGE_MUSCLES[1],
      Object.freeze({
        muscleGroupId: 'adductors',
        labelKo: '내전근군 (미니볼 중심선 밀착·골반저 협응)',
        labelEn: 'Hip Adductors',
        catalogMuscleMatches: Object.freeze(['내전근'] as const),
        role: 'stabilizer',
        roleLabelKo: '안정화근 (코어·정렬 유지)',
        activePhases: Object.freeze(['start', 'middle', 'end'] as const),
        anchorJoints: Object.freeze(['pelvis', 'hip', 'knee'] as const),
        reasonKo: '무릎 사이 미니볼 압박을 통해 양다리 평행 정렬과 심부 코어 연결을 강화합니다.',
      }),
      DEFAULT_BRIDGE_MUSCLES[3],
    ] as const),
    poseDeltaSummary: Object.freeze({
      startToMiddleKo:
        '풋바(266,126) 뒤꿈치 지지와 미니볼 조임으로 브리지 정점(23.2° 사선)에 오른 뒤 캐리지가 18px 활주하며 햄스트링 컬을 수행합니다.',
      middleToEndKo:
        '캐리지를 홈 스토퍼(0px)로 되돌린 후 흉추(118,142)→요추(148,142)→골반(178,143)이 캐리지 베드에 완전히 착지합니다.',
      invariantAnchorsKo: '고정 풋바 위 뒤꿈치(266,126)와 평평한 헤드레스트(y:143) 기준선이 유지됩니다.',
      keyJointChangeKo: '골반 분절 거상(Δ43px) + 정점 햄스트링 컬 캐리지 활주(18px) + 캐리지 베드 완전 착지',
    }),
    mobileSummaryBulletsKo: Object.freeze([
      '정렬·지지: 리포머 수파인 · 풋바(HIGH) · 헤드레스트(FLAT) · 미니볼',
      '핵심 변화: 스토퍼 체크 분절 업 → 정점 18px 컬 활주 → 베드(y:142~143) 착지',
      '주 타겟: 대둔근, 햄스트링, 척추분절근, 내전근',
    ] as const),
    reviewedScopeKo:
      'Merrithew STOTT PILATES 리포머 바텀 리프트·숄더 브리지 가이드의 헤드레스트 Flat, 풋바 뒤꿈치 접점, 정점 햄스트링 컬 활주 및 홈 스토퍼 복귀 롤다운을 대조했어요.',
    correctionKo:
      '풋바 위 발 위치(266,126)와 미니볼 소도구, 정점 캐리지 활주(18px), 끝 자세 캐리지 베드(y:142~143) 완전 착지를 정확히 반영했어요.',
  }),

  'ex-bridging-02': Object.freeze({
    variantId: 'ex-bridging-02',
    nameKo: '캐딜락 타워 바 파라키트 & 숄더 브릿지',
    nameEn: 'Cadillac Tower Bar Shoulder Bridge & Parakeet Prep',
    apparatus: 'cadillac',
    blockCategory: 'bridging',
    spinalPlanes: Object.freeze(['flexion', 'extension', 'neutral'] as const),
    isUnilateral: false,
    archetypeId: 'cadillac-tower-bar-shoulder-bridge',
    archetypeTitleKo: '캐딜락 타워 바 숄더 브리지 · 하단 스프링 경사 타워바 발 지지 & 고사선 브리지 분리',
    springTensionLevel: 'high',
    phaseTitlesKo: Object.freeze([
      '하단 스프링·안전 스트랩 확인 & 경사 타워바(242,88) 발아치 훅',
      '타워바 수직 지지 · 고사선(30.0°) 어깨-고관절-무릎 숄더 브리지 정점',
      '윗등부터 도장 찍듯 순차 하강 · 캐딜락 테이블(y:142~143) 완전 착지',
    ] as const),
    phaseSummariesKo: Object.freeze([
      '하단 스프링(Bottom-Sprung)과 안전 스트랩이 체결된 풋 엔드 경사 타워바(242,88)에 양발 아치를 걸고 캐딜락 테이블 매트에 눕습니다.',
      '타워바가 흔들리지 않게 둔근·햄스트링으로 바(ankle: 244,82)를 수직 지지하며 꼬리뼈부터 분절 거상하여 어깨(90,140)-고관절(182,87)-무릎(218,66)의 높은 사선(30.0°)을 만듭니다.',
      '타워바 발아치 고정을 유지한 채 상부 흉추(122,142)→요추(152,142)→천골(182,143)을 캐딜락 테이블 매트에 한 마디씩 완전히 내려놓습니다.',
    ] as const),
    breathCuesKo: Object.freeze([
      '들숨: 하단 스프링 안전 스트랩 체결 및 발아치 타워바 고정 확인',
      '날숨: 타워바를 발아치로 밀어 올리며 30° 고사선 브리지 정점 유지',
      '날숨: 견갑골 하각부터 천골까지 테이블 매트(y:142~143)로 순차 분절 착지',
    ] as const),
    fixedAnchorsMeta: Object.freeze([
      { joint: 'head', surfaceKo: '캐딜락 테이블 매트 후두부 지지면 (54,141)' },
      { joint: 'shoulder', surfaceKo: '캐딜락 테이블 견갑대 상부 지지면 (90,140)' },
      { joint: 'ankle', surfaceKo: '풋 엔드 하단 스프링 경사 타워바 발아치 훅 (244,82)' },
    ] as const),
    movingJoints: Object.freeze([
      'thoracic',
      'lumbar',
      'pelvis',
      'hip',
      'knee',
      'ankle',
      'heel',
      'toe',
    ] as const),
    alignments: Object.freeze({
      start: Object.freeze([
        Object.freeze({
          id: 'cadillac-tower-bar-safety-setup',
          labelKo: '풋 엔드 경사 타워바(242,88) 발아치 지지 & 안전 스트랩 체크',
          cueKo: '하단 스프링과 안전 스트랩 체결을 확인하고 논슬립 상태로 발아치를 타워바에 겁니다.',
          kind: 'anchor-lock',
          from: pelvisPt(90, 140),
          to: pelvisPt(242, 88),
          cautionKo: '안전 스트랩 없이 하단 스프링 타워바에 발을 올리지 않습니다.',
        }),
      ] as const),
      middle: Object.freeze([
        Object.freeze({
          id: 'cadillac-tower-bar-high-diagonal',
          labelKo: '어깨-고관절-무릎 고사선 타워바 브리지 축 (30.0°)',
          cueKo: '높은 타워바 지지점 위에서 흉곽 들뜸 없이 어깨-고관절-무릎 일직선을 유지합니다.',
          kind: 'axis-line',
          from: pelvisPt(90, 140),
          to: pelvisPt(218, 66),
          targetAngleDeg: 30,
          cautionKo: '경추에 과도한 체중이 실리지 않도록 견갑골 상부로 지지합니다.',
        }),
      ] as const),
      end: Object.freeze([
        Object.freeze({
          id: 'cadillac-tower-bar-table-landing',
          labelKo: '캐딜락 테이블 매트(y:142~143) 척추·골반 완전 착지선',
          cueKo: '윗등부터 천골까지 테이블 매트에 차례대로 도장 찍듯 내려놓아 완전히 착지합니다.',
          kind: 'neutral-zone',
          from: pelvisPt(122, 142),
          to: pelvisPt(182, 143),
          cautionKo: '하강 중 타워바가 급격히 튀어 오르지 않게 발아치 압력을 유지합니다.',
        }),
      ] as const),
    }),
    directionVectors: Object.freeze({
      start: Object.freeze([
        Object.freeze({
          id: 'vec-cad-tower-arch-hook',
          labelKo: '경사 타워바 발아치 수직 고정 준비',
          kind: 'spring-resistance',
          points: Object.freeze([pelvisPt(242, 88), pelvisPt(218, 96)] as const),
          phaseScope: 'start',
        }),
      ] as const),
      middle: Object.freeze([
        Object.freeze({
          id: 'vec-cad-tower-high-bridge',
          labelKo: '타워바 지지 고사선 골반 리프트 (pelvis y:143→92)',
          kind: 'spine-articulation',
          points: Object.freeze([pelvisPt(182, 143), pelvisPt(174, 92), pelvisPt(218, 66)] as const),
          phaseScope: 'start-to-middle',
        }),
      ] as const),
      end: Object.freeze([
        Object.freeze({
          id: 'vec-cad-tower-roll-down',
          labelKo: '윗등→천골 캐딜락 테이블 매트(y:142~143) 완전 복귀',
          kind: 'return-control',
          points: Object.freeze([pelvisPt(118, 124), pelvisPt(152, 142), pelvisPt(182, 143)] as const),
          phaseScope: 'middle-to-end',
        }),
      ] as const),
    }),
    primaryMuscles: DEFAULT_BRIDGE_MUSCLES,
    poseDeltaSummary: Object.freeze({
      startToMiddleKo:
        '풋 엔드 경사 타워바에 건 양발(ankle: 242,88→244,82)을 지지점으로 삼아 골반(182,143→174,92)과 무릎(218,96→218,66)이 30.0° 고사선 정점으로 상승합니다.',
      middleToEndKo:
        '상부 흉추(122,142)→요추(152,142)→골반(182,143) 순서로 분절 하강하여 캐딜락 테이블 매트에 완전히 착지합니다.',
      invariantAnchorsKo: '테이블 위 후두부(54,141)·견갑대(90,140) 및 경사 타워바 발아치(244,82)가 지지됩니다.',
      keyJointChangeKo: '경사 타워바 높은 발 지지(y:82~88) + 30.0° 고사선 브리지 + 테이블 매트 완전 착지',
    }),
    mobileSummaryBulletsKo: Object.freeze([
      '정렬·지지: 캐딜락 수파인 · 하단 스프링 + 안전 스트랩 경사 타워바(244,82)',
      '핵심 변화: 고사선(30.0°) 타워바 브리지 거상 → 테이블(y:142~143) 완전 착지',
      '주 타겟: 둔근, 햄스트링, 척추기립근·분절근, 복횡근',
    ] as const),
    reviewedScopeKo:
      'Optimize Wellness 및 Pilates Anytime 캐딜락 숄더 브리지 가이드의 하단 스프링·안전 스트랩 체결, 경사 타워바 발아치 지지, 고사선 브리지 및 순차 하강을 대조했어요.',
    correctionKo:
      '바닥에 놓여 있던 발과 머리 쪽 바를 풋 엔드 경사 타워바 높은 발 지지(ankle y:82~88) 및 하단 스프링·안전 스트랩 구조로 수정하고 끝 자세 완전 착지를 반영했어요.',
  }),

  'original-cadillac-table-bridge': Object.freeze({
    variantId: 'original-cadillac-table-bridge',
    nameKo: '캐딜락 테이블 브리지',
    nameEn: 'Cadillac Table Bridge',
    apparatus: 'cadillac',
    blockCategory: 'bridging',
    spinalPlanes: Object.freeze(['extension', 'neutral'] as const),
    isUnilateral: false,
    archetypeId: 'cadillac-table-bridge-isolated',
    archetypeTitleKo: '캐딜락 테이블 브리지 · 수평 테이블 발 지지 & 수직 기둥 손 파지 분리',
    springTensionLevel: 'none',
    phaseTitlesKo: Object.freeze([
      '수평 캐딜락 테이블 발 접지(250,144) & 수직 기둥 손 지지(34,118)',
      '테이블 양발 푸시 & 수직 기둥 손 지지 · 사선 브리지 정점(21.8°)',
      '가동 바 미사용 · 캐딜락 수평 테이블(y:142~143) 완전 착지 복귀',
    ] as const),
    phaseSummariesKo: Object.freeze([
      '움직이는 바나 스프링을 사용하지 않고 캐딜락 수평 테이블 상면에 양발(heel: 250,144)을 평행하게 두고 양손(34,118)으로 머리 쪽 수직 기둥(Upright Poles)을 가볍게 지지합니다.',
      '양발로 수평 테이블을 밀고 수직 기둥 손 지지로 견갑대를 안정화하며 골반(184,103)을 들어 어깨(92,140)-고관절(192,100)-무릎(232,84) 사선(21.8°)을 만듭니다.',
      '목에 체중을 싣지 않고 상부 흉추(122,142)→요추(152,142)→골반(182,143)을 수평 캐딜락 테이블 상면에 완전히 내려놓습니다.',
    ] as const),
    breathCuesKo: Object.freeze([
      '들숨: 수평 테이블 발바닥 접지 및 수직 기둥 손 지지 확인',
      '날숨: 테이블 상면을 발로 밀며 편안한 사선 높이까지 골반 리프트',
      '날숨: 윗등부터 천골까지 수평 테이블 매트(y:142~143)로 천천히 착지',
    ] as const),
    fixedAnchorsMeta: Object.freeze([
      { joint: 'hand', surfaceKo: '캐딜락 좌측 수직 기둥(Upright Pole, x:26) 양손 파지점 (34,118)' },
      { joint: 'shoulder', surfaceKo: '수평 캐딜락 테이블 견갑골 지지점 (92,140)' },
      { joint: 'heel', surfaceKo: '수평 캐딜락 테이블 상면 양발 뒤꿈치 접지점 (250,144)' },
    ] as const),
    movingJoints: Object.freeze(['thoracic', 'lumbar', 'pelvis', 'hip', 'knee'] as const),
    alignments: Object.freeze({
      start: Object.freeze([
        Object.freeze({
          id: 'cadillac-table-bridge-posts-and-bed',
          labelKo: '수직 기둥 손 파지(34,118) & 수평 테이블 양발(250,144) 고정선',
          cueKo: '움직이는 타워바를 발 지지로 쓰지 않고 수평 테이블 상면과 수직 기둥을 지지합니다.',
          kind: 'anchor-lock',
          from: pelvisPt(34, 118),
          to: pelvisPt(250, 144),
          cautionKo: '목에 체중을 싣지 않고 편안한 지지 범위를 선택합니다.',
        }),
      ] as const),
      middle: Object.freeze([
        Object.freeze({
          id: 'cadillac-table-bridge-diagonal',
          labelKo: '어깨-고관절-무릎 테이블 브리지 사선 축 (21.8°)',
          cueKo: '수직 기둥 손 지지로 흉곽과 견갑대를 안정화하고 사선 일직선을 유지합니다.',
          kind: 'axis-line',
          from: pelvisPt(92, 140),
          to: pelvisPt(232, 84),
          targetAngleDeg: 22,
          cautionKo: '허리를 꺾어 과도하게 골반을 밀어 올리지 않습니다.',
        }),
      ] as const),
      end: Object.freeze([
        Object.freeze({
          id: 'cadillac-table-bridge-end-grounded',
          labelKo: '수평 캐딜락 테이블(y:142~143) 척추·골반 완전 착지선',
          cueKo: '흉추·요추·천골을 테이블 매트 위에 순서대로 완전히 내려놓습니다.',
          kind: 'neutral-zone',
          from: pelvisPt(122, 142),
          to: pelvisPt(182, 143),
          cautionKo: '골반이 공중에 남지 않도록 끝까지 천천히 하강합니다.',
        }),
      ] as const),
    }),
    directionVectors: Object.freeze({
      start: Object.freeze([
        Object.freeze({
          id: 'vec-cad-table-pole-brace',
          labelKo: '수직 기둥 손 지지 & 견갑 안정화',
          kind: 'axial-lengthening',
          points: Object.freeze([pelvisPt(34, 118), pelvisPt(92, 140)] as const),
          phaseScope: 'start',
        }),
      ] as const),
      middle: Object.freeze([
        Object.freeze({
          id: 'vec-cad-table-pelvis-lift',
          labelKo: '수평 테이블 발 지지 기반 골반 사선 리프트 (pelvis y:143→103)',
          kind: 'spine-articulation',
          points: Object.freeze([pelvisPt(182, 143), pelvisPt(184, 103), pelvisPt(232, 84)] as const),
          phaseScope: 'start-to-middle',
        }),
      ] as const),
      end: Object.freeze([
        Object.freeze({
          id: 'vec-cad-table-roll-down',
          labelKo: '흉추→요추→천골 수평 테이블(y:142~143) 완전 복귀',
          kind: 'return-control',
          points: Object.freeze([pelvisPt(124, 127), pelvisPt(152, 142), pelvisPt(182, 143)] as const),
          phaseScope: 'middle-to-end',
        }),
      ] as const),
    }),
    primaryMuscles: Object.freeze([
      DEFAULT_BRIDGE_MUSCLES[0],
      DEFAULT_BRIDGE_MUSCLES[1],
      Object.freeze({
        muscleGroupId: 'latissimus-serratus',
        labelKo: '광배근·전거근·하부승모근 (수직 기둥 상지 지지)',
        labelEn: 'Latissimus Dorsi & Scapular Stabilizers',
        catalogMuscleMatches: Object.freeze(['몸통', '둔근', '하체'] as const),
        role: 'stabilizer',
        roleLabelKo: '안정화근 (코어·정렬 유지)',
        activePhases: Object.freeze(['start', 'middle', 'end'] as const),
        anchorJoints: Object.freeze(['shoulder', 'thoracic', 'lumbar'] as const),
        reasonKo: '수직 기둥(Upright Poles)을 가볍게 밀어 견갑대와 상부 흉추 지지 기반을 안정화합니다.',
      }),
      DEFAULT_BRIDGE_MUSCLES[3],
    ] as const),
    poseDeltaSummary: Object.freeze({
      startToMiddleKo:
        '수평 테이블 위 양발(250,144)과 수직 기둥 양손(34,118)을 고정한 채 골반(182,143→184,103)을 들어 21.8° 사선 정점을 만듭니다.',
      middleToEndKo:
        '스프링 저항 없이 흉추(122,142)→요추(152,142)→골반(182,143)이 수평 캐딜락 테이블 상면으로 완전히 착지합니다.',
      invariantAnchorsKo: '수직 기둥 파지 손(34,118), 테이블 위 후두부(54,141)·견갑대(92,140), 테이블 위 뒤꿈치(250,144)가 고정됩니다.',
      keyJointChangeKo: '타워바 브리지(발 y:82)와 분리된 수평 테이블 발 지지(y:144) + 수직 기둥 손 파지(34,118) + 완전 착지',
    }),
    mobileSummaryBulletsKo: Object.freeze([
      '정렬·지지: 캐딜락 수평 테이블 발 지지(250,144) · 수직 기둥 손 지지(34,118) · 무스프링',
      '핵심 변화: 21.8° 테이블 브리지 거상 → 수평 테이블(y:142~143) 완전 착지',
      '주 타겟: 대둔근, 햄스트링, 견갑·심부 코어 안정근',
    ] as const),
    reviewedScopeKo:
      '캐딜락 브리지 변형 가이드 및 카탈로그 본문("발을 테이블에 지지하고 움직이는 바를 발 지지로 사용하지 않음")과 대조하여 타워바 브리지와 분리했어요.',
    correctionKo:
      '타워바 브리지(ex-bridging-02)와 혼용되던 기구 요소를 분리하여 수평 테이블 발 접지(y:144), 수직 기둥 손 파지(34,118), 무스프링, 끝 자세 완전 착지를 반영했어요.',
  }),
});

function buildPhasePoseSpec(
  phaseId: 'start' | 'middle' | 'end',
  spec: PelvisHipVariantSpec,
): PhasePoseSpec {
  const blueprint = PELVIS_HIP_KINEMATIC_BLUEPRINTS[spec.variantId];
  const phaseIndex = phaseId === 'start' ? 0 : phaseId === 'middle' ? 1 : 2;
  const joints =
    phaseId === 'start'
      ? blueprint.startJoints
      : phaseId === 'middle'
        ? blueprint.middleJoints
        : blueprint.endJoints;
  const badgeKo =
    phaseId === 'start'
      ? '시작 자세 (준비·정렬)'
      : phaseId === 'middle'
        ? '중간 자세 (최대 가동·정점)'
        : '끝 자세 (제어 복귀·마무리)';

  const fixedAnchors = Object.freeze(
    spec.fixedAnchorsMeta.map((anchor) =>
      Object.freeze({
        joint: anchor.joint,
        surfaceKo: anchor.surfaceKo,
        point: joints[anchor.joint] ?? joints.pelvis,
      }),
    ),
  );

  return Object.freeze({
    phaseId,
    badgeKo,
    shortTitleKo: spec.phaseTitlesKo[phaseIndex],
    summaryKo: spec.phaseSummariesKo[phaseIndex],
    breathCueKo: spec.breathCuesKo[phaseIndex],
    joints,
    fixedAnchors,
    movingJoints: spec.movingJoints,
    apparatusState: Object.freeze({
      carriageOffsetPx: blueprint.apparatusGeometry.carriageOffsetsPx[phaseIndex],
      pedalAngleDeg: 0,
      springTensionLevel: spec.springTensionLevel,
      supportSurfaceKo: blueprint.apparatusGeometry.supportSurfaceKo,
      ...(spec.propPositionKo ? { propPositionKo: spec.propPositionKo } : {}),
    }),
    alignments: spec.alignments[phaseId],
    directionVectors: spec.directionVectors[phaseId],
  });
}

function buildCatalogAssetFromSpec(
  spec: PelvisHipVariantSpec,
  overrideExerciseId?: string,
  overrideArchetypeId?: string,
): CatalogMovementVisualAsset {
  const exerciseId = overrideExerciseId ?? spec.variantId;
  const archetypeId = overrideArchetypeId ?? spec.archetypeId;

  return Object.freeze({
    exerciseId,
    nameKo: spec.nameKo,
    nameEn: spec.nameEn,
    apparatus: spec.apparatus,
    bodyPosition: 'supine',
    blockCategory: spec.blockCategory,
    spinalPlanes: spec.spinalPlanes,
    isUnilateral: spec.isUnilateral,
    archetypeId,
    archetypeTitleKo: spec.archetypeTitleKo,
    staticGuideSvgPath: `/images/movement-guides/${spec.apparatus}-phase-alignment-guide.svg`,
    productionMethod: 'free-authored-kinematic-svg-v1',
    rightsStatus: 'original-app-authored-free-license',
    licenseLabelKo:
      '앱 자체 제작 다관절 키네마틱 도해 (Original Free-License Kinematic SVG v1 · 외부 저작권 무관 · 해부학 미검증)',
    anatomicalAccuracyAssumed: false,
    phases: Object.freeze({
      start: buildPhasePoseSpec('start', spec),
      middle: buildPhasePoseSpec('middle', spec),
      end: buildPhasePoseSpec('end', spec),
    }),
    primaryMuscles: spec.primaryMuscles,
    poseDeltaSummary: spec.poseDeltaSummary,
    mobileSummaryBulletsKo: Object.freeze([
      spec.mobileSummaryBulletsKo[0] ?? '',
      spec.mobileSummaryBulletsKo[1] ?? '',
      spec.mobileSummaryBulletsKo[2] ?? '',
    ] as const),
  });
}

function buildCorrectionFromSpec(
  spec: PelvisHipVariantSpec,
  overrideKey?: string,
  overrideArchetypeId?: string,
): MovementDiagramCorrection {
  const sourceKey = overrideKey ?? spec.variantId;
  return Object.freeze({
    archetypeId: overrideArchetypeId ?? spec.archetypeId,
    checkedAt: '2026-11-06',
    reviewedScopeKo: spec.reviewedScopeKo,
    correctionKo: spec.correctionKo,
    limitationKo: PELVIS_HIP_TRUTHFULNESS_METADATA.limitationKo,
    professionalReviewCount: 0,
    sourceFrameMappings: 0,
    sources: getPelvisHipSourceLinksForCorrection(sourceKey),
  });
}

export const PELVIS_HIP_VARIANT_ASSETS: Readonly<
  Record<PelvisHipVariantId, CatalogMovementVisualAsset>
> = Object.freeze({
  'pelvis-mat-pelvic-curl': buildCatalogAssetFromSpec(VARIANT_SPECS['pelvis-mat-pelvic-curl']),
  'original-mat-bridge': buildCatalogAssetFromSpec(VARIANT_SPECS['original-mat-bridge']),
  'pelvis-mat-shoulder-bridge': buildCatalogAssetFromSpec(
    VARIANT_SPECS['pelvis-mat-shoulder-bridge'],
  ),
  'original-reformer-supported-bridge': buildCatalogAssetFromSpec(
    VARIANT_SPECS['original-reformer-supported-bridge'],
  ),
  'ex-bridging-01': buildCatalogAssetFromSpec(VARIANT_SPECS['ex-bridging-01']),
  'ex-bridging-02': buildCatalogAssetFromSpec(VARIANT_SPECS['ex-bridging-02']),
  'original-cadillac-table-bridge': buildCatalogAssetFromSpec(
    VARIANT_SPECS['original-cadillac-table-bridge'],
  ),
});

export const PELVIS_HIP_ARCHETYPE_ASSETS: Readonly<
  Record<PelvisHipArchetypeId, CatalogMovementVisualAsset>
> = Object.freeze({
  'pelvis-bridging': buildCatalogAssetFromSpec(
    VARIANT_SPECS['original-mat-bridge'],
    'pelvis-bridging',
    'pelvis-bridging',
  ),
  'pelvis-curl': buildCatalogAssetFromSpec(
    VARIANT_SPECS['pelvis-mat-pelvic-curl'],
    'pelvis-curl',
    'pelvis-curl',
  ),
  'shoulder-bridge': buildCatalogAssetFromSpec(
    VARIANT_SPECS['pelvis-mat-shoulder-bridge'],
    'shoulder-bridge',
    'shoulder-bridge',
  ),
});

/**
 * Track I7 Integration Helper:
 * Returns all 7 Pelvis & Hip variants plus the 3 archetype keys (`'pelvis-bridging'`,
 * `'pelvis-curl'`, `'shoulder-bridge'`) as `CatalogMovementVisualAsset` records.
 */
export function getPelvisHipCatalogVisualAssets(): Record<string, CatalogMovementVisualAsset> {
  return {
    ...PELVIS_HIP_VARIANT_ASSETS,
    ...PELVIS_HIP_ARCHETYPE_ASSETS,
  };
}

/**
 * Track I7 Integration Helper:
 * Returns `MovementDiagramCorrection` records for all 7 Pelvis & Hip variants
 * and 3 archetype keys, with `professionalReviewCount: 0` and `sourceFrameMappings: 0`.
 */
export function getPelvisHipDiagramCorrections(): Record<string, MovementDiagramCorrection> {
  const result: Record<string, MovementDiagramCorrection> = {};
  for (const variantId of PELVIS_HIP_VARIANT_IDS) {
    result[variantId] = buildCorrectionFromSpec(VARIANT_SPECS[variantId]);
  }
  result['pelvis-bridging'] = buildCorrectionFromSpec(
    VARIANT_SPECS['original-mat-bridge'],
    'pelvis-bridging',
    'pelvis-bridging',
  );
  result['pelvis-curl'] = buildCorrectionFromSpec(
    VARIANT_SPECS['pelvis-mat-pelvic-curl'],
    'pelvis-curl',
    'pelvis-curl',
  );
  result['shoulder-bridge'] = buildCorrectionFromSpec(
    VARIANT_SPECS['pelvis-mat-shoulder-bridge'],
    'shoulder-bridge',
    'shoulder-bridge',
  );
  return result;
}

export const PELVIS_HIP_DIAGRAM_CORRECTIONS: Readonly<
  Record<string, MovementDiagramCorrection>
> = Object.freeze(getPelvisHipDiagramCorrections());

export function getPelvisHipVisualAsset(idOrKey: string): CatalogMovementVisualAsset {
  if (idOrKey in PELVIS_HIP_ARCHETYPE_ASSETS) {
    return PELVIS_HIP_ARCHETYPE_ASSETS[idOrKey as PelvisHipArchetypeId];
  }
  const resolved = resolvePelvisHipVariantId(idOrKey);
  return PELVIS_HIP_VARIANT_ASSETS[resolved];
}

export function getPelvisHipApparatusGeometry(
  idOrKey: string,
): PelvisHipApparatusGeometry {
  const resolved = resolvePelvisHipVariantId(idOrKey);
  return PELVIS_HIP_KINEMATIC_BLUEPRINTS[resolved].apparatusGeometry;
}

export function resolvePelvisHipCatalogAsset(
  exerciseOrArchetypeId: string,
): CatalogMovementVisualAsset | null {
  const catalogAssets = getPelvisHipCatalogVisualAssets();
  return catalogAssets[exerciseOrArchetypeId] ?? null;
}

export function resolvePelvisHipDiagramCorrection(
  exerciseOrArchetypeId: string,
): MovementDiagramCorrection | null {
  const corrections = getPelvisHipDiagramCorrections();
  return corrections[exerciseOrArchetypeId] ?? null;
}

export {
  PELVIS_HIP_ARCHETYPE_IDS,
  PELVIS_HIP_VARIANT_IDS,
  type PelvisHipApparatusGeometry,
  type PelvisHipArchetypeId,
  type PelvisHipVariantId,
};
