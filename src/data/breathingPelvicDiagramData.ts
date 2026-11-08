import sourceLedgerJson from './breathingPelvicSourceLedger.json';
import type { MovementDiagramCorrection } from './movementDiagramCorrections';
import {
  getMovementVisualAsset,
  type CatalogMovementVisualAsset,
  type JointAlignmentGuide,
  type MovementDirectionVector,
  type MuscleHighlightSpec,
  type PhasePoseSpec,
  type Point2D,
  type RigJointMap,
  type VisualPhaseId,
} from './movementVisualRigCatalog';
import type { ApparatusType, BodyPosition, ClassBlockCategory, PilatesExercise, SpinalPlane } from '../types/pilates';

export type BreathingPelvicDiagramId =
  | 'breathing-supine-diaphragmatic'
  | 'breathing-seated-standing-expansion'
  | 'pelvic-clock-and-imprint-rock';

export const BREATHING_PELVIC_DIAGRAM_IDS: readonly BreathingPelvicDiagramId[] = Object.freeze([
  'breathing-supine-diaphragmatic',
  'breathing-seated-standing-expansion',
  'pelvic-clock-and-imprint-rock',
]);

export const BREATHING_PELVIC_CATALOG_EXERCISE_IDS: readonly string[] = Object.freeze([
  'original-reformer-supine-breath',
  'original-mat-rib-breath',
  'original-cadillac-table-breath',
  'ex-warmup-01',
  'original-chair-seated-breath',
  'original-barrel-standing-breath',
  'original-mat-pelvic-clock',
  'original-cadillac-pelvic-rock',
  'original-chair-seated-pelvic-rock',
  'ex-warmup-03',
]);

export interface BreathingPelvicVerificationSpec {
  readonly anatomicalAccuracyAssumed: false;
  readonly status: 'source-compared-draft';
  readonly reviewerVerificationRequired: true;
  readonly clinicalSafetyGuaranteed: false;
}

export type VerifiedBreathingPelvicVisualAsset = CatalogMovementVisualAsset & {
  readonly verification: BreathingPelvicVerificationSpec;
};

export interface BreathingPelvicJointAxisSpec {
  readonly id: string;
  readonly labelKo: string;
  readonly role:
    | 'sacral-neutral-anchor'
    | 'diaphragmatic-rib-expansion-axis'
    | 'axial-elongation-plumb'
    | 'pelvic-clock-tilt-pivot';
  readonly point: Point2D;
  readonly referenceLineFrom: Point2D;
  readonly referenceLineTo: Point2D;
  readonly descriptionKo: string;
}

export interface BreathingPelvicContactPointSpec {
  readonly id: string;
  readonly labelKo: string;
  readonly joint: keyof RigJointMap;
  readonly kind:
    | 'sacral-mat-anchor'
    | 'sit-bone-chair-anchor'
    | 'foot-tripod-grounding'
    | 'ribcage-posterior-touch';
  readonly point: Point2D;
  readonly phases: readonly VisualPhaseId[];
}

export interface BreathingPelvicCalloutLabelSpec {
  readonly id: string;
  readonly phaseId: VisualPhaseId;
  readonly textKo: string;
  readonly anchor: Point2D;
  readonly badgePosition: Point2D;
  readonly tone: 'anchor' | 'excursion' | 'breath' | 'caution';
}

export interface BreathingPelvicTrajectoryOverlaySpec {
  readonly id: string;
  readonly labelKo: string;
  readonly kind:
    | 'lateral-posterior-rib-expansion'
    | 'axial-column-breath'
    | 'pelvic-clock-12-to-6-rock';
  readonly phaseId: VisualPhaseId;
  readonly svgPathD: string;
  readonly startPoint: Point2D;
  readonly endPoint: Point2D;
  readonly deltaVector?: readonly [number, number];
}

export interface BreathingPelvicKinematicMetrics {
  readonly sacralAnchorY: number;
  readonly ribcageExpansionDeltaPx: number;
  readonly pelvicTiltRangeDeg: readonly [number, number];
  readonly lumbarHyperextensionDeg: 0;
  readonly collarboneWideHold: boolean;
  readonly axialPlumbX?: number;
}

export interface BreathingPelvicDiagramSpec {
  readonly id: BreathingPelvicDiagramId;
  readonly mappedExerciseIds: readonly string[];
  readonly catalogExerciseIds: readonly string[];
  readonly primaryCatalogExerciseId: string;
  readonly nameKo: string;
  readonly nameEn: string;
  readonly subtitleKo: string;
  readonly archetypeId: string;
  readonly archetypeTitleKo: string;
  readonly matBaselineY: number;
  readonly kinematicMetrics: BreathingPelvicKinematicMetrics;
  readonly jointAxes: readonly BreathingPelvicJointAxisSpec[];
  readonly contactPoints: readonly BreathingPelvicContactPointSpec[];
  readonly calloutLabels: readonly BreathingPelvicCalloutLabelSpec[];
  readonly trajectoryOverlays: readonly BreathingPelvicTrajectoryOverlaySpec[];
  readonly asset: VerifiedBreathingPelvicVisualAsset;
  readonly correction: MovementDiagramCorrection;
}

export interface BreathingPelvicLegendItem {
  readonly id: string;
  readonly labelKo: string;
  readonly descriptionKo: string;
  readonly swatchColor: string;
  readonly symbol: 'sacral-anchor' | 'rib-expansion-ring' | 'pelvic-clock-dial' | 'axial-plumb';
}

export interface BreathingPelvicI7RegistryPatch {
  readonly assets: Readonly<Record<string, VerifiedBreathingPelvicVisualAsset>>;
  readonly corrections: Readonly<Record<string, MovementDiagramCorrection>>;
  readonly byCatalogExerciseId: Readonly<Record<string, VerifiedBreathingPelvicVisualAsset>>;
  readonly byDiagramId: Readonly<Record<BreathingPelvicDiagramId, VerifiedBreathingPelvicVisualAsset>>;
}

export const BREATHING_PELVIC_SOURCE_LEDGER = Object.freeze(sourceLedgerJson);

export const BREATHING_PELVIC_VERIFICATION: BreathingPelvicVerificationSpec = Object.freeze({
  anatomicalAccuracyAssumed: false,
  status: 'source-compared-draft',
  reviewerVerificationRequired: true,
  clinicalSafetyGuaranteed: false,
});

export const BREATHING_PELVIC_DIAGRAM_LEGEND_ITEMS: readonly BreathingPelvicLegendItem[] =
  Object.freeze([
    {
      id: 'sacral-sitbone-anchor',
      labelKo: '천골(y = 144) · 좌골 · 양발 삼각 접지 앵커',
      descriptionKo:
        '호흡 확장이나 골반 시계 분절 중에도 지지면(매트·캐리지·체어 시트·바닥)이 흔들리지 않도록 고정합니다.',
      swatchColor: '#2b6a58',
      symbol: 'sacral-anchor',
    },
    {
      id: 'ribcage-3d-expansion',
      labelKo: '3D 흉곽 외측·후측 호흡 확장 & 횡격막 왕복',
      descriptionKo:
        '어깨 거상 없이 쇄골을 넓게 유지한 채 하부 갈비뼈가 양옆·등 뒤로 넓어지고 날숨에 복횡근으로 닫힙니다.',
      swatchColor: '#0284c7',
      symbol: 'rib-expansion-ring',
    },
    {
      id: 'pelvic-clock-micro-tilt',
      labelKo: '12시-6시 / 3시-9시 골반 시계 미세 경사 (±8°–12°)',
      descriptionKo:
        '요추 과신전(0°) 없이 흉곽과 골반을 분리하여 임프린트(12시)와 중립(6시) 사이를 부드럽게 굴립니다.',
      swatchColor: '#c86d44',
      symbol: 'pelvic-clock-dial',
    },
    {
      id: 'upright-axial-elongation',
      labelKo: '정수리-흉곽-좌골/발목 수직 축성 신장(Axial Elongation)',
      descriptionKo:
        '운다 체어 착석 및 래더 바렐 기립 호흡에서 척추 수직 추선을 길게 세웁니다.',
      swatchColor: '#7c3aed',
      symbol: 'axial-plumb',
    },
  ]);

function pt(x: number, y: number): Point2D {
  return Object.freeze({ x, y });
}

function freezeJoints(raw: RigJointMap): RigJointMap {
  return Object.freeze({
    head: pt(raw.head.x, raw.head.y),
    neck: pt(raw.neck.x, raw.neck.y),
    shoulder: pt(raw.shoulder.x, raw.shoulder.y),
    elbow: pt(raw.elbow.x, raw.elbow.y),
    wrist: pt(raw.wrist.x, raw.wrist.y),
    hand: pt(raw.hand.x, raw.hand.y),
    thoracic: pt(raw.thoracic.x, raw.thoracic.y),
    lumbar: pt(raw.lumbar.x, raw.lumbar.y),
    pelvis: pt(raw.pelvis.x, raw.pelvis.y),
    hip: pt(raw.hip.x, raw.hip.y),
    knee: pt(raw.knee.x, raw.knee.y),
    ankle: pt(raw.ankle.x, raw.ankle.y),
    heel: pt(raw.heel.x, raw.heel.y),
    toe: pt(raw.toe.x, raw.toe.y),
    ...(raw.farShoulder ? { farShoulder: pt(raw.farShoulder.x, raw.farShoulder.y) } : {}),
    ...(raw.farElbow ? { farElbow: pt(raw.farElbow.x, raw.farElbow.y) } : {}),
    ...(raw.farWrist ? { farWrist: pt(raw.farWrist.x, raw.farWrist.y) } : {}),
    ...(raw.farHip ? { farHip: pt(raw.farHip.x, raw.farHip.y) } : {}),
    ...(raw.farKnee ? { farKnee: pt(raw.farKnee.x, raw.farKnee.y) } : {}),
    ...(raw.farAnkle ? { farAnkle: pt(raw.farAnkle.x, raw.farAnkle.y) } : {}),
    ...(raw.farToe ? { farToe: pt(raw.farToe.x, raw.farToe.y) } : {}),
  });
}

const BREATHING_PELVIC_MUSCLE_HIGHLIGHTS: readonly MuscleHighlightSpec[] = Object.freeze([
  {
    muscleGroupId: 'core-transversus',
    labelKo: '횡격막·복횡근·골반저근·다열근 (심부 센터링 실린더)',
    labelEn: 'Diaphragm, Transversus Abdominis & Pelvic Floor',
    catalogMuscleMatches: ['횡격막', '복횡근', '골반저근', '다열근', '호흡', '몸통', '골반', '심부경추굴곡근'],
    role: 'primary',
    roleLabelKo: '주동근 (주 타겟)',
    activePhases: ['start', 'middle', 'end'],
    anchorJoints: ['thoracic', 'lumbar', 'pelvis'],
    reasonKo:
      '들숨 횡격막 하강·흉곽 3D 확장과 날숨 복횡근·골반저근 수축을 협응하여 천골 앵커(y=144)와 중립 척추를 안정화합니다.',
  },
  {
    muscleGroupId: 'rectus-obliques',
    labelKo: '내·외복사근 & 늑간근 (하부 흉곽 닫기 & 골반 틸트)',
    labelEn: 'Internal/External Obliques & Intercostals',
    catalogMuscleMatches: ['복직근', '내복사근', '외복사근', '내/외복사근', '늑간근'],
    role: 'primary',
    roleLabelKo: '주동근 (주 타겟)',
    activePhases: ['middle', 'end'],
    anchorJoints: ['thoracic', 'lumbar', 'pelvis'],
    reasonKo:
      '날숨 시 하부 갈비뼈를 부드럽게 닫아 늑골 들림(Rib flare)을 막고 12시 방향 골반 후방 경사를 정교하게 유도합니다.',
  },
  {
    muscleGroupId: 'glute-med',
    labelKo: '중둔근·내전근 슬링 (골반 수평 지지 & 하지 정렬 고정)',
    labelEn: 'Gluteus Medius & Adductor Pelvic Sling',
    catalogMuscleMatches: ['중둔근', '내전근', '둔근', '균형'],
    role: 'stabilizer',
    roleLabelKo: '안정화근 (코어·정렬 유지)',
    activePhases: ['start', 'middle', 'end'],
    anchorJoints: ['pelvis', 'hip', 'knee'],
    reasonKo:
      '무릎 세운 수파인·체어 착석·바렐 스탠딩 자세에서 양측 골반 수평과 하체 삼각 지지점을 흔들림 없이 유지합니다.',
  },
  {
    muscleGroupId: 'thoracic-extensors',
    labelKo: '흉추 신전근·후방 흉벽 근막 (후외측 호흡 이완·신장)',
    labelEn: 'Posterior Ribcage & Thoracic Fascia',
    catalogMuscleMatches: ['척추기립근', '능형근', '소흉근', '등'],
    role: 'lengthening',
    roleLabelKo: '신장·이완 부위',
    activePhases: ['middle', 'end'],
    anchorJoints: ['neck', 'thoracic', 'lumbar'],
    reasonKo:
      '들숨에 등 뒤쪽과 옆구리 흉벽으로 숨이 채워지며 과긴장된 척추 주변근과 흉곽 근막이 부드럽게 이완됩니다.',
  },
]);

function buildCorrectionFromLedger(
  id: BreathingPelvicDiagramId,
  archetypeOverride?: string,
): MovementDiagramCorrection {
  const entry = sourceLedgerJson.entries[id];
  return Object.freeze({
    archetypeId: archetypeOverride ?? entry.archetypeId,
    checkedAt: '2026-11-08',
    reviewedScopeKo: entry.reviewedScopeKo,
    correctionKo: entry.correctionKo,
    limitationKo: entry.limitationKo,
    professionalReviewCount: 0,
    sourceFrameMappings: 0,
    sources: Object.freeze(
      entry.sources.map((s) => Object.freeze({ title: s.title, url: s.url })),
    ),
  });
}

// ============================================================================
// 1. SUPINE DIAPHRAGMATIC & 3D RIBCAGE BREATH (breathing-supine-diaphragmatic)
// ============================================================================

const SUPINE_BREATH_START_JOINTS: RigJointMap = freezeJoints({
  head: { x: 56, y: 132 },
  neck: { x: 74, y: 136 },
  shoulder: { x: 92, y: 138 },
  elbow: { x: 118, y: 140 },
  wrist: { x: 142, y: 140 },
  hand: { x: 154, y: 140 },
  thoracic: { x: 124, y: 140 },
  lumbar: { x: 152, y: 140 },
  pelvis: { x: 182, y: 144 },
  hip: { x: 186, y: 142 },
  knee: { x: 214, y: 98 },
  ankle: { x: 242, y: 142 },
  heel: { x: 248, y: 146 },
  toe: { x: 262, y: 146 },
  farShoulder: { x: 90, y: 136 },
  farElbow: { x: 116, y: 138 },
  farWrist: { x: 140, y: 138 },
  farHip: { x: 184, y: 140 },
  farKnee: { x: 210, y: 96 },
  farAnkle: { x: 238, y: 140 },
  farToe: { x: 258, y: 144 },
});

const SUPINE_BREATH_MIDDLE_JOINTS: RigJointMap = freezeJoints({
  head: { x: 56, y: 132 },
  neck: { x: 74, y: 136 },
  shoulder: { x: 92, y: 138 },
  elbow: { x: 118, y: 136 },
  wrist: { x: 142, y: 134 },
  hand: { x: 154, y: 134 },
  thoracic: { x: 124, y: 132 },
  lumbar: { x: 152, y: 138 },
  pelvis: { x: 182, y: 144 },
  hip: { x: 186, y: 142 },
  knee: { x: 214, y: 98 },
  ankle: { x: 242, y: 142 },
  heel: { x: 248, y: 146 },
  toe: { x: 262, y: 146 },
  farShoulder: { x: 90, y: 136 },
  farElbow: { x: 116, y: 134 },
  farWrist: { x: 140, y: 132 },
  farHip: { x: 184, y: 140 },
  farKnee: { x: 210, y: 96 },
  farAnkle: { x: 238, y: 140 },
  farToe: { x: 258, y: 144 },
});

const SUPINE_BREATH_END_JOINTS: RigJointMap = freezeJoints({
  head: { x: 56, y: 132 },
  neck: { x: 74, y: 136 },
  shoulder: { x: 92, y: 138 },
  elbow: { x: 118, y: 140 },
  wrist: { x: 142, y: 140 },
  hand: { x: 154, y: 140 },
  thoracic: { x: 124, y: 138 },
  lumbar: { x: 152, y: 141 },
  pelvis: { x: 182, y: 144 },
  hip: { x: 186, y: 142 },
  knee: { x: 214, y: 98 },
  ankle: { x: 242, y: 142 },
  heel: { x: 248, y: 146 },
  toe: { x: 262, y: 146 },
  farShoulder: { x: 90, y: 136 },
  farElbow: { x: 116, y: 138 },
  farWrist: { x: 140, y: 138 },
  farHip: { x: 184, y: 140 },
  farKnee: { x: 210, y: 96 },
  farAnkle: { x: 238, y: 140 },
  farToe: { x: 258, y: 144 },
});

const SUPINE_BREATH_ALIGNMENTS: Record<VisualPhaseId, readonly JointAlignmentGuide[]> = {
  start: [
    {
      id: 'supine-breath-start-sacral-anchor',
      labelKo: '앙와위 중립 천골 앵커(y=144) & 쇄골 수평 개방',
      cueKo:
        '뒤통수·견갑골·천골(y=144)을 지지면에 무겁게 내려놓고 쇄골을 양옆으로 넓게 펼쳐 목·어깨 긴장을 풉니다.',
      kind: 'anchor-lock',
      from: pt(92, 138),
      to: pt(182, 144),
      cautionKo: '턱이 천장으로 들리거나 어깨가 귀 쪽으로 솟지 않게 주의합니다.',
    },
  ],
  middle: [
    {
      id: 'supine-breath-middle-3d-rib',
      labelKo: '들숨 3D 하부 흉곽 외측·후측 확장 & 횡격막 하강',
      cueKo:
        '천골 앵커(y=144)를 고정한 채 코로 깊게 들이쉬며 갈비뼈 양옆과 등 뒤쪽이 아코디언처럼 넓어지게 합니다.',
      kind: 'neutral-zone',
      from: pt(112, 132),
      to: pt(182, 144),
      cautionKo: '가슴만 위로 볼록 솟아 허리가 바닥에서 과하게 들뜨지 않게 합니다.',
    },
  ],
  end: [
    {
      id: 'supine-breath-end-rib-closure',
      labelKo: '날숨 하부 갈비뼈 닫기(Rib Knit) & 심부 복횡근 코르셋 연결',
      cueKo:
        '입으로 가늘게 내쉬며 양쪽 갈비뼈를 골반 앞쪽(ASIS)으로 부드럽게 모아 닫고 아랫배를 납작하게 안정화합니다.',
      kind: 'axis-line',
      from: pt(124, 138),
      to: pt(182, 144),
      cautionKo: '날숨 끝에 엉덩이를 과하게 조이거나 꼬리뼈를 말아 올리지 않습니다.',
    },
  ],
};

const SUPINE_BREATH_VECTORS: Record<VisualPhaseId, readonly MovementDirectionVector[]> = {
  start: [
    {
      id: 'vec-supine-breath-collarbone-wide',
      labelKo: '쇄골 수평 확장 & 경추 축성 신장 세팅',
      kind: 'axial-lengthening',
      points: [pt(92, 138), pt(56, 132)],
      phaseScope: 'start',
    },
  ],
  middle: [
    {
      id: 'vec-supine-breath-3d-excursion',
      labelKo: '3D 흉곽 외측·후측 확장 및 횡격막 하강 (thoracic dy -8px)',
      kind: 'axial-lengthening',
      points: [pt(124, 140), pt(124, 132), pt(152, 138)],
      phaseScope: 'start-to-middle',
    },
  ],
  end: [
    {
      id: 'vec-supine-breath-corset-knit',
      labelKo: '날숨 늑골 하강 닫기 & 복횡근 센터링 수렴',
      kind: 'return-control',
      points: [pt(124, 132), pt(124, 138), pt(152, 141)],
      phaseScope: 'middle-to-end',
    },
  ],
};

// ============================================================================
// 2. SEATED & STANDING EXPANSION BREATH (breathing-seated-standing-expansion)
// ============================================================================

const SEATED_STANDING_BREATH_START_JOINTS: RigJointMap = freezeJoints({
  head: { x: 136, y: 28 },
  neck: { x: 136, y: 42 },
  shoulder: { x: 136, y: 58 },
  elbow: { x: 124, y: 80 },
  wrist: { x: 136, y: 94 },
  hand: { x: 146, y: 96 },
  thoracic: { x: 136, y: 78 },
  lumbar: { x: 136, y: 94 },
  pelvis: { x: 136, y: 108 },
  hip: { x: 142, y: 108 },
  knee: { x: 184, y: 126 },
  ankle: { x: 200, y: 170 },
  heel: { x: 196, y: 176 },
  toe: { x: 214, y: 176 },
  farShoulder: { x: 134, y: 58 },
  farElbow: { x: 122, y: 78 },
  farWrist: { x: 134, y: 92 },
  farHip: { x: 140, y: 108 },
  farKnee: { x: 180, y: 128 },
  farAnkle: { x: 196, y: 172 },
  farToe: { x: 210, y: 176 },
});

const SEATED_STANDING_BREATH_MIDDLE_JOINTS: RigJointMap = freezeJoints({
  head: { x: 136, y: 24 },
  neck: { x: 136, y: 39 },
  shoulder: { x: 136, y: 56 },
  elbow: { x: 124, y: 79 },
  wrist: { x: 136, y: 94 },
  hand: { x: 146, y: 96 },
  thoracic: { x: 142, y: 74 },
  lumbar: { x: 138, y: 92 },
  pelvis: { x: 136, y: 108 },
  hip: { x: 142, y: 108 },
  knee: { x: 184, y: 126 },
  ankle: { x: 200, y: 170 },
  heel: { x: 196, y: 176 },
  toe: { x: 214, y: 176 },
  farShoulder: { x: 134, y: 56 },
  farElbow: { x: 122, y: 77 },
  farWrist: { x: 134, y: 92 },
  farHip: { x: 140, y: 108 },
  farKnee: { x: 180, y: 128 },
  farAnkle: { x: 196, y: 172 },
  farToe: { x: 210, y: 176 },
});

const SEATED_STANDING_BREATH_END_JOINTS: RigJointMap = freezeJoints({
  head: { x: 136, y: 26 },
  neck: { x: 136, y: 41 },
  shoulder: { x: 136, y: 57 },
  elbow: { x: 124, y: 80 },
  wrist: { x: 136, y: 94 },
  hand: { x: 146, y: 96 },
  thoracic: { x: 138, y: 76 },
  lumbar: { x: 137, y: 93 },
  pelvis: { x: 136, y: 108 },
  hip: { x: 142, y: 108 },
  knee: { x: 184, y: 126 },
  ankle: { x: 200, y: 170 },
  heel: { x: 196, y: 176 },
  toe: { x: 214, y: 176 },
  farShoulder: { x: 134, y: 57 },
  farElbow: { x: 122, y: 78 },
  farWrist: { x: 134, y: 92 },
  farHip: { x: 140, y: 108 },
  farKnee: { x: 180, y: 128 },
  farAnkle: { x: 196, y: 172 },
  farToe: { x: 210, y: 176 },
});

const SEATED_STANDING_BREATH_ALIGNMENTS: Record<VisualPhaseId, readonly JointAlignmentGuide[]> = {
  start: [
    {
      id: 'seated-standing-start-plumb',
      labelKo: '좌골(y=108) & 양발 삼각 접지(y=176) 위 수직 추선 세팅',
      cueKo:
        '운다 체어 시트 위 양쪽 좌골과 바닥 양발 뒤꿈치·발볼 삼각대(Foot Tripod)를 단단히 뿌리내리고 정수리를 천장으로 세웁니다.',
      kind: 'plumb-line',
      from: pt(136, 28),
      to: pt(136, 108),
      targetAngleDeg: 90,
      cautionKo: '허리를 과하게 꺾어 가슴을 내밀거나 등 뒤로 기대어 앉지 않습니다.',
    },
  ],
  middle: [
    {
      id: 'seated-standing-middle-lateral-rib',
      labelKo: '축성 신장(Axial Elongation) 유지 · 측면 갈비뼈 호흡 확장',
      cueKo:
        '팔이나 다리를 흔들지 않고(hand/heel Δ0px) 마시는 숨에 갈비뼈가 양옆으로 넓어지며 정수리가 4px 더 길어지는 감각을 느낍니다.',
      kind: 'axis-line',
      from: pt(136, 24),
      to: pt(136, 108),
      cautionKo: '어깨가 귀 쪽으로 솟거나 뒤꿈치가 바닥에서 들리지 않게 유지합니다.',
    },
  ],
  end: [
    {
      id: 'seated-standing-end-knit',
      labelKo: '날숨 수직 키 유지 & 흉곽-골반 원통 정렬 수렴',
      cueKo:
        '내쉬는 숨에 키가 줄어들지 않도록 정수리 높이를 지킨 채 하부 갈비뼈를 골반 수직선 안으로 부드럽게 정돈합니다.',
      kind: 'anchor-lock',
      from: pt(136, 108),
      to: pt(196, 176),
      cautionKo: '날숨 끝에 상체가 앞으로 무너지지 않게 좌골 지지력을 유지합니다.',
    },
  ],
};

const SEATED_STANDING_BREATH_VECTORS: Record<VisualPhaseId, readonly MovementDirectionVector[]> = {
  start: [
    {
      id: 'vec-seated-standing-axial-setup',
      labelKo: '좌골·발바닥 접지 반력 & 정수리 상방 신장',
      kind: 'axial-lengthening',
      points: [pt(136, 108), pt(136, 28)],
      phaseScope: 'start',
    },
  ],
  middle: [
    {
      id: 'vec-seated-standing-rib-expand',
      labelKo: '수직 축 위 측면·후면 흉곽 확장 (thoracic 136,78→142,74)',
      kind: 'axial-lengthening',
      points: [pt(136, 78), pt(142, 74)],
      phaseScope: 'start-to-middle',
    },
  ],
  end: [
    {
      id: 'vec-seated-standing-rib-settle',
      labelKo: '날숨 흉곽 수렴 & 수직 센터링 유지',
      kind: 'return-control',
      points: [pt(142, 74), pt(138, 76)],
      phaseScope: 'middle-to-end',
    },
  ],
};

// ============================================================================
// 3. PELVIC CLOCK & IMPRINT ROCK (pelvic-clock-and-imprint-rock)
// ============================================================================

const PELVIC_CLOCK_START_JOINTS: RigJointMap = freezeJoints({
  head: { x: 56, y: 128 },
  neck: { x: 74, y: 132 },
  shoulder: { x: 92, y: 134 },
  elbow: { x: 122, y: 138 },
  wrist: { x: 148, y: 140 },
  hand: { x: 160, y: 140 },
  thoracic: { x: 118, y: 134 },
  lumbar: { x: 146, y: 132 },
  pelvis: { x: 174, y: 144 },
  hip: { x: 180, y: 138 },
  knee: { x: 214, y: 96 },
  ankle: { x: 248, y: 140 },
  heel: { x: 242, y: 144 },
  toe: { x: 260, y: 144 },
  farShoulder: { x: 90, y: 132 },
  farElbow: { x: 120, y: 136 },
  farWrist: { x: 146, y: 138 },
  farHip: { x: 178, y: 136 },
  farKnee: { x: 210, y: 94 },
  farAnkle: { x: 244, y: 138 },
  farToe: { x: 256, y: 142 },
});

const PELVIC_CLOCK_MIDDLE_JOINTS: RigJointMap = freezeJoints({
  head: { x: 56, y: 128 },
  neck: { x: 74, y: 132 },
  shoulder: { x: 92, y: 134 },
  elbow: { x: 122, y: 138 },
  wrist: { x: 148, y: 140 },
  hand: { x: 160, y: 140 },
  thoracic: { x: 118, y: 134 },
  lumbar: { x: 146, y: 142 },
  pelvis: { x: 170, y: 136 },
  hip: { x: 176, y: 132 },
  knee: { x: 214, y: 96 },
  ankle: { x: 248, y: 140 },
  heel: { x: 242, y: 144 },
  toe: { x: 260, y: 144 },
  farShoulder: { x: 90, y: 132 },
  farElbow: { x: 120, y: 136 },
  farWrist: { x: 146, y: 138 },
  farHip: { x: 174, y: 130 },
  farKnee: { x: 210, y: 94 },
  farAnkle: { x: 244, y: 138 },
  farToe: { x: 256, y: 142 },
});

const PELVIC_CLOCK_END_JOINTS: RigJointMap = freezeJoints({
  head: { x: 56, y: 128 },
  neck: { x: 74, y: 132 },
  shoulder: { x: 92, y: 134 },
  elbow: { x: 122, y: 138 },
  wrist: { x: 148, y: 140 },
  hand: { x: 160, y: 140 },
  thoracic: { x: 118, y: 134 },
  lumbar: { x: 146, y: 134 },
  pelvis: { x: 174, y: 144 },
  hip: { x: 180, y: 138 },
  knee: { x: 214, y: 96 },
  ankle: { x: 248, y: 140 },
  heel: { x: 242, y: 144 },
  toe: { x: 260, y: 144 },
  farShoulder: { x: 90, y: 132 },
  farElbow: { x: 120, y: 136 },
  farWrist: { x: 146, y: 138 },
  farHip: { x: 178, y: 136 },
  farKnee: { x: 210, y: 94 },
  farAnkle: { x: 244, y: 138 },
  farToe: { x: 256, y: 142 },
});

const PELVIC_CLOCK_ALIGNMENTS: Record<VisualPhaseId, readonly JointAlignmentGuide[]> = {
  start: [
    {
      id: 'pelvic-clock-start-neutral-dial',
      labelKo: '펠빅 클락 6시-12시 수평 중립 세팅 (천골 y=144)',
      cueKo:
        '무릎을 세우고 발뒤꿈치(y=144)와 천골(y=144)을 지지면에 둔 채 치골과 배꼽(12시-6시), 양측 ASIS(3시-9시)가 수평인 중립 골반을 찾습니다.',
      kind: 'neutral-zone',
      from: pt(118, 134),
      to: pt(174, 144),
      targetAngleDeg: 0,
      cautionKo: '시작 자세부터 허리를 바닥에 과하게 짓누르지 않습니다.',
    },
  ],
  middle: [
    {
      id: 'pelvic-clock-middle-imprint-12',
      labelKo: '12시 후방 경사(Imprint ±10°) & 흉곽-골반 분리 제어',
      cueKo:
        '흉곽(y=134)과 어깨는 고정한 채 날숨에 복횡근·복사근 수축만으로 골반을 12시 방향(±8°~12°)으로 굴려 요추(y=132→142)를 부드럽게 임프린트합니다.',
      kind: 'angle-arc',
      from: pt(146, 142),
      to: pt(170, 136),
      targetAngleDeg: 10,
      cautionKo: '대둔근이나 햄스트링으로 바닥을 밀어 엉덩이를 브릿지처럼 들지 않습니다.',
    },
  ],
  end: [
    {
      id: 'pelvic-clock-end-neutral-6',
      labelKo: '6시/3시-9시 균형 탐색 후 중립 천골 안착 복귀 (과신전 0°)',
      cueKo:
        '들숨에 꼬리뼈(6시)와 좌우(3시-9시) 균형을 탐색한 뒤, 허리 과신전(0°) 없이 천골 중심(y=144) 중립 골반으로 정교하게 돌아옵니다.',
      kind: 'anchor-lock',
      from: pt(118, 134),
      to: pt(174, 144),
      cautionKo: '6시 방향으로 굴릴 때 갈비뼈가 들뜨거나 허리가 꺾이지 않게 합니다.',
    },
  ],
};

const PELVIC_CLOCK_VECTORS: Record<VisualPhaseId, readonly MovementDirectionVector[]> = {
  start: [
    {
      id: 'vec-pelvic-clock-setup',
      labelKo: '흉곽(y=134)·천골(y=144) 수평 중립 다이얼 세팅',
      kind: 'axial-lengthening',
      points: [pt(174, 144), pt(118, 134)],
      phaseScope: 'start',
    },
  ],
  middle: [
    {
      id: 'vec-pelvic-clock-12-imprint',
      labelKo: '12시 골반 후방 틸트(±10°) & 요추 임프린트 하강 (lumbar y:132→142)',
      kind: 'spine-articulation',
      points: [pt(174, 144), pt(170, 136), pt(146, 142)],
      phaseScope: 'start-to-middle',
    },
  ],
  end: [
    {
      id: 'vec-pelvic-clock-6-neutral-return',
      labelKo: '6시/3-9시 시계 탐색 후 중립 천골(y=144) 복귀',
      kind: 'return-control',
      points: [pt(146, 142), pt(146, 134), pt(174, 144)],
      phaseScope: 'middle-to-end',
    },
  ],
};

interface BuildBreathingPelvicAssetParams {
  readonly exerciseId: string;
  readonly nameKo: string;
  readonly nameEn: string;
  readonly apparatus: ApparatusType;
  readonly bodyPosition: BodyPosition;
  readonly blockCategory: ClassBlockCategory;
  readonly spinalPlanes: readonly SpinalPlane[];
  readonly isUnilateral: boolean;
  readonly archetypeId: string;
  readonly archetypeTitleKo: string;
  readonly startJoints: RigJointMap;
  readonly middleJoints: RigJointMap;
  readonly endJoints: RigJointMap;
  readonly phaseTitlesKo: readonly [string, string, string];
  readonly phaseSummariesKo: readonly [string, string, string];
  readonly breathCuesKo: readonly [string, string, string];
  readonly alignments: Record<VisualPhaseId, readonly JointAlignmentGuide[]>;
  readonly directionVectors: Record<VisualPhaseId, readonly MovementDirectionVector[]>;
  readonly poseDeltaSummary: CatalogMovementVisualAsset['poseDeltaSummary'];
  readonly mobileSummaryBulletsKo: readonly [string, string, string];
}

function buildBreathingPelvicVisualAsset(
  params: BuildBreathingPelvicAssetParams,
): VerifiedBreathingPelvicVisualAsset {
  const makeFixedAnchors = (joints: RigJointMap) =>
    Object.freeze([
      Object.freeze({
        joint: 'pelvis' as const,
        surfaceKo:
          params.bodyPosition === 'supine'
            ? '천골·골반 중립 지지 앵커 (y=144)'
            : '좌골·골반 수직 중심 앵커',
        point: joints.pelvis,
      }),
      Object.freeze({
        joint: 'heel' as const,
        surfaceKo: '양발 뒤꿈치·삼각 지지 앵커',
        point: joints.heel,
      }),
      Object.freeze({
        joint: 'shoulder' as const,
        surfaceKo: '쇄골 수평 개방 & 견갑 안정 앵커',
        point: joints.shoulder,
      }),
    ]);

  const movingJoints: readonly (keyof RigJointMap)[] = Object.freeze([
    'thoracic',
    'lumbar',
    'pelvis',
    'hip',
    'head',
    'hand',
  ]);

  const supportSurfaceKo =
    params.apparatus === 'reformer'
      ? '리포머 캐리지 앙와위 지지면 (천골 앵커 y=144 · 미니볼/스트랩 보조)'
      : params.apparatus === 'cadillac'
        ? '캐딜락 테이블 앙와위 지지면 (천골 앵커 y=144 · 스프링 미사용)'
        : params.apparatus === 'chair'
          ? '운다 체어 시트 좌골 수직 지지면 (y=108) & 바닥 양발 삼각 접지(y=176)'
          : params.apparatus === 'barrel'
            ? '래더 바렐 앞 바닥 양발 삼각 접지(y=176) & 상단 가로대 가벼운 손 지지'
            : '매트/폼롤러 앙와위 지지면 (천골 앵커 y=144 · 쇄골 와이드 정렬)';

  const startPhase: PhasePoseSpec = Object.freeze({
    phaseId: 'start',
    badgeKo: '시작 자세 (준비·정렬)',
    shortTitleKo: params.phaseTitlesKo[0],
    summaryKo: params.phaseSummariesKo[0],
    breathCueKo: params.breathCuesKo[0],
    joints: params.startJoints,
    fixedAnchors: makeFixedAnchors(params.startJoints),
    movingJoints,
    apparatusState: Object.freeze({
      carriageOffsetPx: 0,
      pedalAngleDeg: 0,
      springTensionLevel: params.apparatus === 'reformer' ? 'medium' : 'none',
      supportSurfaceKo,
    }),
    alignments: Object.freeze([...params.alignments.start]),
    directionVectors: Object.freeze([...params.directionVectors.start]),
  });

  const middlePhase: PhasePoseSpec = Object.freeze({
    phaseId: 'middle',
    badgeKo: '중간 자세 (최대 가동·정점)',
    shortTitleKo: params.phaseTitlesKo[1],
    summaryKo: params.phaseSummariesKo[1],
    breathCueKo: params.breathCuesKo[1],
    joints: params.middleJoints,
    fixedAnchors: makeFixedAnchors(params.middleJoints),
    movingJoints,
    apparatusState: Object.freeze({
      carriageOffsetPx: 0,
      pedalAngleDeg: 0,
      springTensionLevel: params.apparatus === 'reformer' ? 'medium' : 'none',
      supportSurfaceKo,
    }),
    alignments: Object.freeze([...params.alignments.middle]),
    directionVectors: Object.freeze([...params.directionVectors.middle]),
  });

  const endPhase: PhasePoseSpec = Object.freeze({
    phaseId: 'end',
    badgeKo: '끝 자세 (제어 복귀·마무리)',
    shortTitleKo: params.phaseTitlesKo[2],
    summaryKo: params.phaseSummariesKo[2],
    breathCueKo: params.breathCuesKo[2],
    joints: params.endJoints,
    fixedAnchors: makeFixedAnchors(params.endJoints),
    movingJoints,
    apparatusState: Object.freeze({
      carriageOffsetPx: 0,
      pedalAngleDeg: 0,
      springTensionLevel: params.apparatus === 'reformer' ? 'medium' : 'none',
      supportSurfaceKo,
    }),
    alignments: Object.freeze([...params.alignments.end]),
    directionVectors: Object.freeze([...params.directionVectors.end]),
  });

  return Object.freeze({
    exerciseId: params.exerciseId,
    nameKo: params.nameKo,
    nameEn: params.nameEn,
    apparatus: params.apparatus,
    bodyPosition: params.bodyPosition,
    blockCategory: params.blockCategory,
    spinalPlanes: Object.freeze([...params.spinalPlanes]),
    isUnilateral: params.isUnilateral,
    archetypeId: params.archetypeId,
    archetypeTitleKo: params.archetypeTitleKo,
    staticGuideSvgPath: `/images/movement-guides/${params.apparatus}-phase-alignment-guide.svg`,
    productionMethod: 'free-authored-kinematic-svg-v1',
    rightsStatus: 'original-app-authored-free-license',
    licenseLabelKo:
      '앱 자체 제작 다관절 키네마틱 도해 (Original Free-License Kinematic SVG v1 · 외부 저작권 무관)',
    anatomicalAccuracyAssumed: false,
    verification: BREATHING_PELVIC_VERIFICATION,
    phases: Object.freeze({
      start: startPhase,
      middle: middlePhase,
      end: endPhase,
    }),
    primaryMuscles: BREATHING_PELVIC_MUSCLE_HIGHLIGHTS,
    poseDeltaSummary: Object.freeze(params.poseDeltaSummary),
    mobileSummaryBulletsKo: Object.freeze(params.mobileSummaryBulletsKo),
  });
}

const SUPINE_DIAPHRAGMATIC_SPEC: BreathingPelvicDiagramSpec = Object.freeze({
  id: 'breathing-supine-diaphragmatic',
  catalogExerciseIds: Object.freeze([
    'original-reformer-supine-breath',
    'original-mat-rib-breath',
    'original-cadillac-table-breath',
    'ex-warmup-01',
  ]),
  mappedExerciseIds: Object.freeze([
    'breathing-supine-diaphragmatic',
    'original-reformer-supine-breath',
    'original-mat-rib-breath',
    'original-cadillac-table-breath',
    'ex-warmup-01',
  ]),
  primaryCatalogExerciseId: 'ex-warmup-01',
  nameKo: '앙와위 3D 횡격막·흉곽 호흡 & 센터링 (Supine 3D Diaphragmatic Breath)',
  nameEn: 'Supine 3D Lateral-Posterior Ribcage Breath & Sacral Anchor',
  subtitleKo:
    '천골 앵커(y=144)·쇄골 와이드 세팅 → 들숨 3D 외측·후측 흉곽 확장 & 횡격막 왕복 → 날숨 복횡근 코르셋 닫기',
  archetypeId: 'breathing-supine-diaphragmatic-isolated',
  archetypeTitleKo: '앙와위 3D 횡격막·늑골 외측/후측 호흡 & 천골 앵커(y=144) 안정화',
  matBaselineY: 148,
  kinematicMetrics: Object.freeze({
    sacralAnchorY: 144,
    ribcageExpansionDeltaPx: 8,
    pelvicTiltRangeDeg: Object.freeze([0, 4] as const),
    lumbarHyperextensionDeg: 0,
    collarboneWideHold: true,
  }),
  jointAxes: Object.freeze([
    {
      id: 'supine-breath-sacral-anchor-axis',
      labelKo: '중립 천골 지지 앵커 (y=144)',
      role: 'sacral-neutral-anchor',
      point: pt(182, 144),
      referenceLineFrom: pt(152, 140),
      referenceLineTo: pt(248, 146),
      descriptionKo:
        '호흡 중 골반이 흔들리거나 허리가 아치로 들뜨지 않게 천골(y=144)을 지지면에 무겁게 고정합니다.',
    },
    {
      id: 'supine-breath-rib-expansion-axis',
      labelKo: '하부 흉곽 3D 외측·후측 확장 축',
      role: 'diaphragmatic-rib-expansion-axis',
      point: pt(124, 132),
      referenceLineFrom: pt(92, 138),
      referenceLineTo: pt(152, 138),
      descriptionKo:
        '어깨 거상 없이 하부 갈비뼈가 양옆과 등 뒤(지지면 방향)로 입체 확장됩니다.',
    },
  ] as const),
  contactPoints: Object.freeze([
    {
      id: 'supine-breath-contact-sacrum',
      labelKo: '천골 수평 지지 앵커 (y=144)',
      joint: 'pelvis',
      kind: 'sacral-mat-anchor',
      point: pt(182, 144),
      phases: ['start', 'middle', 'end'],
    },
    {
      id: 'supine-breath-contact-posterior-rib',
      labelKo: '후부 흉곽 매트/캐리지 접촉점',
      joint: 'thoracic',
      kind: 'ribcage-posterior-touch',
      point: pt(124, 140),
      phases: ['start', 'middle', 'end'],
    },
    {
      id: 'supine-breath-contact-heels',
      labelKo: '양발 뒤꿈치/풋바 안정 지지점',
      joint: 'heel',
      kind: 'foot-tripod-grounding',
      point: pt(248, 146),
      phases: ['start', 'middle', 'end'],
    },
  ] as const),
  calloutLabels: Object.freeze([
    {
      id: 'supine-breath-callout-start',
      phaseId: 'start',
      textKo: '천골 앵커(y=144) & 쇄골 와이드 정렬',
      anchor: pt(182, 144),
      badgePosition: pt(108, 42),
      tone: 'anchor',
    },
    {
      id: 'supine-breath-callout-middle',
      phaseId: 'middle',
      textKo: '들숨 3D 외측·후측 흉곽 확장 (어깨 고정)',
      anchor: pt(124, 132),
      badgePosition: pt(88, 38),
      tone: 'breath',
    },
    {
      id: 'supine-breath-callout-end',
      phaseId: 'end',
      textKo: '날숨 갈비뼈 닫기(Rib Knit) & 복횡근 연결',
      anchor: pt(152, 141),
      badgePosition: pt(102, 42),
      tone: 'excursion',
    },
  ] as const),
  trajectoryOverlays: Object.freeze([
    {
      id: 'supine-breath-overlay-rib-3d',
      labelKo: '3D 하부 흉곽 외측·후측 확장 궤적 (dy -8px)',
      kind: 'lateral-posterior-rib-expansion',
      phaseId: 'middle',
      svgPathD: 'M 108 140 Q 124 122 142 138',
      startPoint: pt(124, 140),
      endPoint: pt(124, 132),
      deltaVector: Object.freeze([0, -8] as const),
    },
  ] as const),
  asset: buildBreathingPelvicVisualAsset({
    exerciseId: 'ex-warmup-01',
    nameKo: '펠빅 클락 & 흉식 호흡 임프린팅',
    nameEn: 'Pelvic Clock & Ribcage Breathing',
    apparatus: 'reformer',
    bodyPosition: 'supine',
    blockCategory: 'warmup',
    spinalPlanes: ['neutral', 'flexion'],
    isUnilateral: false,
    archetypeId: 'breathing-supine-diaphragmatic-isolated',
    archetypeTitleKo: '앙와위 3D 횡격막·늑골 외측/후측 호흡 & 천골 앵커(y=144) 안정화',
    startJoints: SUPINE_BREATH_START_JOINTS,
    middleJoints: SUPINE_BREATH_MIDDLE_JOINTS,
    endJoints: SUPINE_BREATH_END_JOINTS,
    phaseTitlesKo: [
      '중립 천골 앵커(y=144) & 쇄골 와이드 준비',
      '들숨 3D 하부 흉곽 외측·후측 확장 & 횡격막 하강',
      '날숨 갈비뼈 닫기(Rib Knit) & 복횡근-골반저근 수렴',
    ],
    phaseSummariesKo: [
      '매트·리포머 캐리지·캐딜락 테이블 위에 무릎을 세우고 누워 천골(y=144)과 뒤꿈치(y=146)를 지지하고 쇄골을 옆으로 넓게 펼칩니다.',
      '어깨 거상이나 허리 과신전 없이 코로 깊게 들이쉬며 횡격막 하강과 함께 하부 흉곽(thoracic y:140→132)이 양옆·등 뒤로 입체 확장됩니다.',
      '입으로 가늘게 내쉬며 벌어진 갈비뼈를 골반 쪽으로 부드럽게 닫고(thoracic y:132→138) 아랫배 복횡근과 골반저근을 연결합니다.',
    ],
    breathCuesKo: [
      '준비 호흡: 뒷목 길게 늘리고 천골(y=144) 무게중심과 쇄골 수평 개방 확인',
      '코로 들숨(Inhale): 하부 갈비뼈 양옆·등 뒤 360° 확장 (어깨·목 긴장 0)',
      '입으로 날숨(Exhale): 갈비뼈 부드럽게 닫으며 복횡근 코르셋 조이기',
    ],
    alignments: SUPINE_BREATH_ALIGNMENTS,
    directionVectors: SUPINE_BREATH_VECTORS,
    poseDeltaSummary: {
      startToMiddleKo:
        '천골(pelvis y:144), 어깨(shoulder 92,138), 뒤꿈치(heel 248,146)가 고정된 채 들숨에 흉곽(thoracic y:140→132)이 3D 외측·후측으로 확장됩니다.',
      middleToEndKo:
        '날숨에 복횡근·늑간근 수렴으로 흉곽(thoracic y:132→138)과 요추(lumbar y:138→141)가 차분히 정돈됩니다.',
      invariantAnchorsKo:
        '천골 앵커(pelvis y:144), 후두부(head 56,132), 양발 뒤꿈치(heel 248,146) 지지선이 전 구간 유지됩니다.',
      keyJointChangeKo:
        '천골(y=144) 고정 아래 순수 3D 흉곽 외측·후측 호흡 변위(thoracic Δ8px) 및 복벽 수렴',
    },
    mobileSummaryBulletsKo: [
      '시작 정렬: 천골 앵커(y=144) · 무릎 굴곡 삼각 지지 · 쇄골 와이드 개방',
      '중간 들숨: 어깨 들림 없이 하부 갈비뼈 양옆·등 뒤 3D 횡격막 확장(Δ8px)',
      '마무리 날숨: 하부 늑골 닫기(Rib Knit) 및 복횡근·골반저근 코어 연결',
    ],
  }),
  correction: buildCorrectionFromLedger('breathing-supine-diaphragmatic'),
});

const SEATED_STANDING_EXPANSION_SPEC: BreathingPelvicDiagramSpec = Object.freeze({
  id: 'breathing-seated-standing-expansion',
  catalogExerciseIds: Object.freeze([
    'original-chair-seated-breath',
    'original-barrel-standing-breath',
  ]),
  mappedExerciseIds: Object.freeze([
    'breathing-seated-standing-expansion',
    'original-chair-seated-breath',
    'original-barrel-standing-breath',
  ]),
  primaryCatalogExerciseId: 'original-chair-seated-breath',
  nameKo: '체어 시티드 & 바렐 스탠딩 축성 신장 호흡 (Upright Axial Expansion Breath)',
  nameEn: 'Seated Wunda Chair & Standing Ladder Barrel Lateral Ribcage Breath',
  subtitleKo:
    '좌골(y=108)·양발 삼각대(y=176) 접지 → 들숨 축성 신장(Axial Elongation) & 측면 늑골 확장 → 날숨 수직 중심 유지',
  archetypeId: 'breathing-seated-standing-expansion-isolated',
  archetypeTitleKo: '체어 착석·바렐 기립 측면 흉곽 호흡 & 좌골/발바닥 삼각 접지 분리',
  matBaselineY: 178,
  kinematicMetrics: Object.freeze({
    sacralAnchorY: 108,
    ribcageExpansionDeltaPx: 7,
    pelvicTiltRangeDeg: Object.freeze([0, 2] as const),
    lumbarHyperextensionDeg: 0,
    collarboneWideHold: true,
    axialPlumbX: 136,
  }),
  jointAxes: Object.freeze([
    {
      id: 'upright-breath-plumb-axis',
      labelKo: '정수리-흉곽-좌골 수직 축성 신장 추선 (x=136)',
      role: 'axial-elongation-plumb',
      point: pt(136, 78),
      referenceLineFrom: pt(136, 24),
      referenceLineTo: pt(136, 108),
      descriptionKo:
        '앉거나 선 자세에서 등 뒤로 기대거나 허리를 꺾지 않고 정수리부터 좌골까지 수직 기둥을 세웁니다.',
    },
    {
      id: 'upright-breath-rib-axis',
      labelKo: '수직 기둥 위 측면 갈비뼈 확장 축',
      role: 'diaphragmatic-rib-expansion-axis',
      point: pt(142, 74),
      referenceLineFrom: pt(124, 78),
      referenceLineTo: pt(152, 74),
      descriptionKo:
        '사지(손·뒤꿈치) 고정 상태에서 흉곽만 양옆으로 넓어지며 척추 마디 사이 공간을 확보합니다.',
    },
  ] as const),
  contactPoints: Object.freeze([
    {
      id: 'upright-breath-contact-sitbones',
      labelKo: '운다 체어 시트 양측 좌골 수직 접지점 (136,108)',
      joint: 'pelvis',
      kind: 'sit-bone-chair-anchor',
      point: pt(136, 108),
      phases: ['start', 'middle', 'end'],
    },
    {
      id: 'upright-breath-contact-tripod',
      labelKo: '바닥 양발 삼각대(Foot Tripod) 완전 접지점 (196,176)',
      joint: 'heel',
      kind: 'foot-tripod-grounding',
      point: pt(196, 176),
      phases: ['start', 'middle', 'end'],
    },
  ] as const),
  calloutLabels: Object.freeze([
    {
      id: 'upright-breath-callout-start',
      phaseId: 'start',
      textKo: '좌골(y=108) & 양발 삼각 접지(y=176) 수직 정렬',
      anchor: pt(136, 108),
      badgePosition: pt(82, 22),
      tone: 'anchor',
    },
    {
      id: 'upright-breath-callout-middle',
      phaseId: 'middle',
      textKo: '들숨 축성 신장(head -4px) & 측면 늑골 확장',
      anchor: pt(142, 74),
      badgePosition: pt(80, 20),
      tone: 'breath',
    },
    {
      id: 'upright-breath-callout-end',
      phaseId: 'end',
      textKo: '날숨 수직 키 유지 & 하부 갈비뼈 정돈',
      anchor: pt(138, 76),
      badgePosition: pt(84, 22),
      tone: 'excursion',
    },
  ] as const),
  trajectoryOverlays: Object.freeze([
    {
      id: 'upright-breath-overlay-column',
      labelKo: '수직 축성 신장 및 측면 흉곽 확장 궤적',
      kind: 'axial-column-breath',
      phaseId: 'middle',
      svgPathD: 'M 136 108 L 136 24 M 126 76 Q 142 68 154 76',
      startPoint: pt(136, 78),
      endPoint: pt(142, 74),
      deltaVector: Object.freeze([6, -4] as const),
    },
  ] as const),
  asset: buildBreathingPelvicVisualAsset({
    exerciseId: 'original-chair-seated-breath',
    nameKo: '체어 시티드 호흡',
    nameEn: 'Chair Seated Breath',
    apparatus: 'chair',
    bodyPosition: 'seated',
    blockCategory: 'warmup',
    spinalPlanes: ['neutral'],
    isUnilateral: false,
    archetypeId: 'breathing-seated-standing-expansion-isolated',
    archetypeTitleKo: '체어 착석·바렐 기립 측면 흉곽 호흡 & 좌골/발바닥 삼각 접지 분리',
    startJoints: SEATED_STANDING_BREATH_START_JOINTS,
    middleJoints: SEATED_STANDING_BREATH_MIDDLE_JOINTS,
    endJoints: SEATED_STANDING_BREATH_END_JOINTS,
    phaseTitlesKo: [
      '좌골(y=108)·발바닥 삼각대(y=176) 접지 & 수직 척추 세팅',
      '들숨 축성 신장(Axial Elongation) & 측면 갈비뼈 확장',
      '날숨 정수리 키 유지 & 갈비뼈-골반 원통 수렴',
    ],
    phaseSummariesKo: [
      '운다 체어 시트 위 양쪽 좌골(136,108) 또는 바렐 앞 양발 바닥 삼각대(196,176)에 체중을 고르게 싣고 양손(146,96)을 지지한 채 수직 척추를 세웁니다.',
      '팔 로잉이나 까치발 상승(hand/heel Δ0px) 없이 마시는 숨에 흉곽(136,78→142,74)이 옆으로 넓어지고 정수리(y:28→24)가 천장으로 길어집니다.',
      '내쉬는 숨에 수직 키가 무너지지 않게 유지하며 하부 갈비뼈(142,74→138,76)를 골반 수직선 위로 차분히 정돈합니다.',
    ],
    breathCuesKo: [
      '준비: 좌골과 발바닥 삼각대로 바닥을 밀어 정수리까지 수직 기둥 세우기',
      '들숨: 어깨는 내리고 갈비뼈 양옆으로 깊은 숨을 채우며 척추 마디 늘리기',
      '날숨: 정수리 키는 지킨 채 아랫배와 갈비뼈를 중심 기둥으로 모으기',
    ],
    alignments: SEATED_STANDING_BREATH_ALIGNMENTS,
    directionVectors: SEATED_STANDING_BREATH_VECTORS,
    poseDeltaSummary: {
      startToMiddleKo:
        '좌골(136,108)·양발 뒤꿈치(196,176)·손(146,96)을 고정한 채 들숨에 흉곽(136,78→142,74) 확장과 정수리 축성 신장(y:28→24)이 일어납니다.',
      middleToEndKo:
        '사지 이동(Δ0px) 없이 날숨에 흉곽(142,74→138,76)이 수직 추선(x=136) 위로 부드럽게 수렴합니다.',
      invariantAnchorsKo:
        '좌골(pelvis 136,108), 양발 뒤꿈치(heel 196,176), 지지 손(hand 146,96)이 전 구간 고정됩니다.',
      keyJointChangeKo:
        '로잉·카프 레이즈 혼입을 제거한 수직 축성 신장 + 측면 흉곽 호흡 확장(thoracic Δ7.2px)',
    },
    mobileSummaryBulletsKo: [
      '시작 지지: 체어 시트 좌골(y=108) 및 바렐 앞 양발 삼각대(y=176) 완전 접지',
      '중간 들숨: 사지 고정(Δ0px) 아래 측면 갈비뼈 확장 & 정수리 축성 신장',
      '마무리 날숨: 척추 수직 추선(x=136) 유지하며 하부 늑골 닫기',
    ],
  }),
  correction: buildCorrectionFromLedger('breathing-seated-standing-expansion'),
});

const PELVIC_CLOCK_ROCK_SPEC: BreathingPelvicDiagramSpec = Object.freeze({
  id: 'pelvic-clock-and-imprint-rock',
  catalogExerciseIds: Object.freeze([
    'original-mat-pelvic-clock',
    'original-cadillac-pelvic-rock',
    'original-chair-seated-pelvic-rock',
    'ex-warmup-03',
  ]),
  mappedExerciseIds: Object.freeze([
    'pelvic-clock-and-imprint-rock',
    'original-mat-pelvic-clock',
    'original-cadillac-pelvic-rock',
    'original-chair-seated-pelvic-rock',
    'ex-warmup-03',
  ]),
  primaryCatalogExerciseId: 'original-mat-pelvic-clock',
  nameKo: '펠빅 클락(12시-6시/3시-9시) & 임프린트 록킹 (Pelvic Clock & Imprint Rock)',
  nameEn: 'Pelvic Clock (12-to-6 / 3-to-9) & Imprint-Release Micro-Articulation',
  subtitleKo:
    '천골 시계 중심(y=144) 세팅 → 날숨 12시 후방 경사(±8°–12° 임프린트) & 흉곽 분리 → 들숨 6시/3-9시 탐색 후 중립 복귀(과신전 0°)',
  archetypeId: 'pelvic-clock-and-imprint-rock-isolated',
  archetypeTitleKo: '골반 시계(12-6/3-9) & 임프린트 록킹 · ±8°–12° 미세 골반 경사 & 흉곽 분리',
  matBaselineY: 148,
  kinematicMetrics: Object.freeze({
    sacralAnchorY: 144,
    ribcageExpansionDeltaPx: 4,
    pelvicTiltRangeDeg: Object.freeze([8, 12] as const),
    lumbarHyperextensionDeg: 0,
    collarboneWideHold: true,
  }),
  jointAxes: Object.freeze([
    {
      id: 'pelvic-clock-tilt-pivot-axis',
      labelKo: '천골·고관절 골반 시계 미세 경사 피벗 (±8°–12°)',
      role: 'pelvic-clock-tilt-pivot',
      point: pt(174, 144),
      referenceLineFrom: pt(146, 132),
      referenceLineTo: pt(180, 138),
      descriptionKo:
        '천골 위에서 12시(배꼽 방향 후방 경사)와 6시(꼬리뼈 방향 중립)로 ±8°–12° 범위만 부드럽게 굴립니다.',
    },
    {
      id: 'pelvic-clock-rib-lock-axis',
      labelKo: '흉곽-골반 분리 고정점 (thoracic y=134)',
      role: 'sacral-neutral-anchor',
      point: pt(118, 134),
      referenceLineFrom: pt(92, 134),
      referenceLineTo: pt(146, 134),
      descriptionKo:
        '골반이 구르는 동안 상부 흉곽(y=134)이 들뜨거나 요추가 과신전(0°)되지 않도록 분리 고정합니다.',
    },
  ] as const),
  contactPoints: Object.freeze([
    {
      id: 'pelvic-clock-contact-sacrum',
      labelKo: '천골 시계 다이얼 중심점 (y=144)',
      joint: 'pelvis',
      kind: 'sacral-mat-anchor',
      point: pt(174, 144),
      phases: ['start', 'middle', 'end'],
    },
    {
      id: 'pelvic-clock-contact-thoracic',
      labelKo: '매트/폼롤러 흉추 지지 고정점 (y=134)',
      joint: 'thoracic',
      kind: 'ribcage-posterior-touch',
      point: pt(118, 134),
      phases: ['start', 'middle', 'end'],
    },
    {
      id: 'pelvic-clock-contact-heel',
      labelKo: '양발 뒤꿈치 바닥 고정점 (242,144)',
      joint: 'heel',
      kind: 'foot-tripod-grounding',
      point: pt(242, 144),
      phases: ['start', 'middle', 'end'],
    },
  ] as const),
  calloutLabels: Object.freeze([
    {
      id: 'pelvic-clock-callout-start',
      phaseId: 'start',
      textKo: '골반 시계 중립(6시-12시 수평 · 천골 y=144)',
      anchor: pt(174, 144),
      badgePosition: pt(94, 42),
      tone: 'anchor',
    },
    {
      id: 'pelvic-clock-callout-middle',
      phaseId: 'middle',
      textKo: '12시 임프린트 후방 틸트(±10° · 요추 y=142 밀착)',
      anchor: pt(146, 142),
      badgePosition: pt(82, 36),
      tone: 'excursion',
    },
    {
      id: 'pelvic-clock-callout-end',
      phaseId: 'end',
      textKo: '6시/3-9시 탐색 후 중립 복귀 (요추 과신전 0°)',
      anchor: pt(146, 134),
      badgePosition: pt(88, 42),
      tone: 'caution',
    },
  ] as const),
  trajectoryOverlays: Object.freeze([
    {
      id: 'pelvic-clock-overlay-rock',
      labelKo: '12시-6시 골반 시계 미세 경사 아크 (±8°–12°)',
      kind: 'pelvic-clock-12-to-6-rock',
      phaseId: 'middle',
      svgPathD: 'M 182 142 Q 160 124 146 142',
      startPoint: pt(174, 144),
      endPoint: pt(146, 142),
      deltaVector: Object.freeze([-4, 10] as const),
    },
  ] as const),
  asset: buildBreathingPelvicVisualAsset({
    exerciseId: 'original-mat-pelvic-clock',
    nameKo: '골반 시계 (Pelvic Clock & Imprint Rock)',
    nameEn: 'Pelvic Clock & Imprint-Release Micro-Articulation',
    apparatus: 'mat',
    bodyPosition: 'supine',
    blockCategory: 'warmup',
    spinalPlanes: ['flexion', 'extension', 'neutral'],
    isUnilateral: false,
    archetypeId: 'pelvic-clock-and-imprint-rock-isolated',
    archetypeTitleKo: '골반 시계(12-6/3-9) & 임프린트 록킹 · ±8°–12° 미세 골반 경사 & 흉곽 분리',
    startJoints: PELVIC_CLOCK_START_JOINTS,
    middleJoints: PELVIC_CLOCK_MIDDLE_JOINTS,
    endJoints: PELVIC_CLOCK_END_JOINTS,
    phaseTitlesKo: [
      '천골 중심(y=144) 중립 골반 시계 세팅 & 흉곽 안정',
      '날숨 12시 방향 후방 경사(±10° 임프린트) & 요추 밀착',
      '들숨 6시/3-9시 미세 탐색 후 중립 천골 안착 복귀 (과신전 0°)',
    ],
    phaseSummariesKo: [
      '매트·캐딜락 테이블·폼롤러 위(또는 체어 시트)에서 흉곽(y=134)과 양손(160,140)을 안정시키고 천골(y=144) 위에 골반 시계 다이얼을 수평으로 세팅합니다.',
      '흉곽 들림이나 둔근 과수축 없이 날숨에 복횡근·내복사근 힘으로 골반을 12시 방향(±8°–12°)으로 살짝 말아 요추(lumbar y:132→142)를 부드럽게 임프린트합니다.',
      '들숨에 6시와 3시-9시 대칭을 탐색한 뒤 허리 과신전(0°) 없이 다시 중립 천골 앵커(pelvis y:144, lumbar y:134)로 돌아옵니다.',
    ],
    breathCuesKo: [
      '들숨 준비: 천골(y=144) 위 12시(배꼽)-6시(꼬리뼈)-3시/9시(ASIS) 수평 다이얼 인지',
      '날숨 12시 컬: 아랫배를 부드럽게 당겨 골반 후방 경사(±10°) 및 요추 임프린트',
      '들숨 6시 복귀: 갈비뼈 닫힘을 유지한 채 과신전 없이 중립 천골 안착',
    ],
    alignments: PELVIC_CLOCK_ALIGNMENTS,
    directionVectors: PELVIC_CLOCK_VECTORS,
    poseDeltaSummary: {
      startToMiddleKo:
        '흉곽(thoracic 118,134)과 양발(heel 242,144)은 고정된 채 골반이 12시 방향으로 ±10° 후방 경사되며 요추(lumbar y:132→142)가 지지면에 가까워집니다.',
      middleToEndKo:
        '요추 과신전(0°) 없이 천골 무게중심을 굴려 중립 골반(pelvis 174,144, lumbar 146,134)으로 복귀합니다.',
      invariantAnchorsKo:
        '흉곽 피벗(thoracic 118,134), 지지 손(hand 160,140), 양발 뒤꿈치(heel 242,144)가 전 구간 고정됩니다.',
      keyJointChangeKo:
        '흉곽-골반 분리 제어 아래 ±8°–12° 미세 골반 시계 경사 및 요추 임프린트(lumbar Δ10px)',
    },
    mobileSummaryBulletsKo: [
      '시작 정렬: 천골(y=144) 위 12-6시/3-9시 수평 다이얼 세팅 & 흉곽(y=134) 고정',
      '중간 12시: 날숨 복횡근 수축으로 ±8°–12° 골반 후방 경사 & 요추 임프린트(y=142)',
      '복귀 6시: 요추 과신전(0°) 없이 3-9시 대칭 확인 후 중립 천골 안착',
    ],
  }),
  correction: buildCorrectionFromLedger('pelvic-clock-and-imprint-rock'),
});

export const BREATHING_PELVIC_DIAGRAM_SPECS: Readonly<
  Record<BreathingPelvicDiagramId, BreathingPelvicDiagramSpec>
> = Object.freeze({
  'breathing-supine-diaphragmatic': SUPINE_DIAPHRAGMATIC_SPEC,
  'breathing-seated-standing-expansion': SEATED_STANDING_EXPANSION_SPEC,
  'pelvic-clock-and-imprint-rock': PELVIC_CLOCK_ROCK_SPEC,
});

const EXERCISE_ID_TO_BREATHING_PELVIC_DIAGRAM_ID: Readonly<
  Record<string, BreathingPelvicDiagramId>
> = Object.freeze({
  // Diagram IDs
  'breathing-supine-diaphragmatic': 'breathing-supine-diaphragmatic',
  'breathing-seated-standing-expansion': 'breathing-seated-standing-expansion',
  'pelvic-clock-and-imprint-rock': 'pelvic-clock-and-imprint-rock',

  // Group 1 (4 exercises)
  'original-reformer-supine-breath': 'breathing-supine-diaphragmatic',
  'original-mat-rib-breath': 'breathing-supine-diaphragmatic',
  'original-cadillac-table-breath': 'breathing-supine-diaphragmatic',
  'ex-warmup-01': 'breathing-supine-diaphragmatic',

  // Group 2 (2 exercises)
  'original-chair-seated-breath': 'breathing-seated-standing-expansion',
  'original-barrel-standing-breath': 'breathing-seated-standing-expansion',

  // Group 3 (4 exercises)
  'original-mat-pelvic-clock': 'pelvic-clock-and-imprint-rock',
  'original-cadillac-pelvic-rock': 'pelvic-clock-and-imprint-rock',
  'original-chair-seated-pelvic-rock': 'pelvic-clock-and-imprint-rock',
  'ex-warmup-03': 'pelvic-clock-and-imprint-rock',
});

const CATALOG_EXERCISE_ARCHETYPE_FALLBACK: Readonly<Record<string, string>> = Object.freeze({
  'original-reformer-supine-breath': 'supine-breath-pelvic-clock',
  'original-mat-rib-breath': 'mat-supine-rib-breath-isolated',
  'original-cadillac-table-breath': 'cadillac-table-breath-isolated',
  'ex-warmup-01': 'supine-breath-pelvic-clock',
  'original-chair-seated-breath': 'chair-seated-breath-isolated',
  'original-barrel-standing-breath': 'barrel-standing-breath-isolated',
  'original-mat-pelvic-clock': 'supine-pelvic-clock-isolated',
  'original-cadillac-pelvic-rock': 'supine-pelvic-clock-isolated',
  'original-chair-seated-pelvic-rock': 'chair-seated-pelvic-rock-isolated',
  'ex-warmup-03': 'supine-breath-pelvic-clock',
});

const CATALOG_EXERCISE_APPARATUS_MAP: Readonly<
  Record<string, { apparatus: ApparatusType; bodyPosition: BodyPosition }>
> = Object.freeze({
  'original-reformer-supine-breath': { apparatus: 'reformer', bodyPosition: 'supine' },
  'original-mat-rib-breath': { apparatus: 'mat', bodyPosition: 'supine' },
  'original-cadillac-table-breath': { apparatus: 'cadillac', bodyPosition: 'supine' },
  'ex-warmup-01': { apparatus: 'reformer', bodyPosition: 'supine' },
  'original-chair-seated-breath': { apparatus: 'chair', bodyPosition: 'seated' },
  'original-barrel-standing-breath': { apparatus: 'barrel', bodyPosition: 'standing' },
  'original-mat-pelvic-clock': { apparatus: 'mat', bodyPosition: 'supine' },
  'original-cadillac-pelvic-rock': { apparatus: 'cadillac', bodyPosition: 'supine' },
  'original-chair-seated-pelvic-rock': { apparatus: 'chair', bodyPosition: 'seated' },
  'ex-warmup-03': { apparatus: 'mat', bodyPosition: 'supine' },
});

function cloneBreathingAssetForExercise(
  asset: VerifiedBreathingPelvicVisualAsset,
  exerciseId: string,
): VerifiedBreathingPelvicVisualAsset {
  const meta = CATALOG_EXERCISE_APPARATUS_MAP[exerciseId];
  const archetypeId =
    CATALOG_EXERCISE_ARCHETYPE_FALLBACK[exerciseId] ?? asset.archetypeId;
  return Object.freeze({
    ...asset,
    exerciseId,
    archetypeId,
    ...(meta
      ? {
          apparatus: meta.apparatus,
          bodyPosition: meta.bodyPosition,
          staticGuideSvgPath: `/images/movement-guides/${meta.apparatus}-phase-alignment-guide.svg`,
        }
      : {}),
    verification: BREATHING_PELVIC_VERIFICATION,
  });
}

const MAPPED_BREATHING_ASSETS_RECORD: Record<string, VerifiedBreathingPelvicVisualAsset> = {};

for (const spec of Object.values(BREATHING_PELVIC_DIAGRAM_SPECS)) {
  MAPPED_BREATHING_ASSETS_RECORD[spec.id] = cloneBreathingAssetForExercise(spec.asset, spec.id);
  for (const exId of spec.catalogExerciseIds) {
    MAPPED_BREATHING_ASSETS_RECORD[exId] = cloneBreathingAssetForExercise(spec.asset, exId);
  }
}

export const BREATHING_PELVIC_VISUAL_ASSETS: Readonly<
  Record<string, VerifiedBreathingPelvicVisualAsset>
> = Object.freeze(MAPPED_BREATHING_ASSETS_RECORD);

export function resolveBreathingPelvicDiagramId(
  exerciseOrDiagramId: string | Pick<PilatesExercise, 'id'>,
): BreathingPelvicDiagramId | null {
  const rawId =
    typeof exerciseOrDiagramId === 'string' ? exerciseOrDiagramId : exerciseOrDiagramId.id;
  return EXERCISE_ID_TO_BREATHING_PELVIC_DIAGRAM_ID[rawId] ?? null;
}

export function resolveBreathingPelvicDiagram(
  exerciseOrDiagramId: string | Pick<PilatesExercise, 'id'>,
): BreathingPelvicDiagramSpec | null {
  const diagramId = resolveBreathingPelvicDiagramId(exerciseOrDiagramId);
  return diagramId ? BREATHING_PELVIC_DIAGRAM_SPECS[diagramId] : null;
}

export function resolveBreathingPelvicVisualAsset(
  exerciseOrDiagramId: string | Pick<PilatesExercise, 'id'>,
): VerifiedBreathingPelvicVisualAsset | null {
  const rawId =
    typeof exerciseOrDiagramId === 'string' ? exerciseOrDiagramId : exerciseOrDiagramId.id;
  if (BREATHING_PELVIC_VISUAL_ASSETS[rawId]) {
    return BREATHING_PELVIC_VISUAL_ASSETS[rawId];
  }
  const spec = resolveBreathingPelvicDiagram(rawId);
  return spec ? spec.asset : null;
}

export function getBreathingPelvicCatalogVisualAssets(): Readonly<
  Record<string, VerifiedBreathingPelvicVisualAsset>
> {
  return BREATHING_PELVIC_VISUAL_ASSETS;
}

export function getBreathingPelvicDiagramCorrections(): Readonly<
  Record<string, MovementDiagramCorrection>
> {
  const record: Record<string, MovementDiagramCorrection> = {};

  for (const spec of Object.values(BREATHING_PELVIC_DIAGRAM_SPECS)) {
    const diagramArchetype =
      getMovementVisualAsset(spec.id)?.archetypeId ?? spec.archetypeId;
    record[spec.id] = buildCorrectionFromLedger(spec.id, diagramArchetype);

    for (const exerciseId of spec.catalogExerciseIds) {
      const matchedArchetype =
        getMovementVisualAsset(exerciseId)?.archetypeId ??
        CATALOG_EXERCISE_ARCHETYPE_FALLBACK[exerciseId] ??
        spec.archetypeId;
      record[exerciseId] = buildCorrectionFromLedger(spec.id, matchedArchetype);
    }
  }

  return Object.freeze(record);
}

export function getBreathingPelvicI7RegistryPatch(): BreathingPelvicI7RegistryPatch {
  const corrections = getBreathingPelvicDiagramCorrections();
  const byDiagramId: Record<BreathingPelvicDiagramId, VerifiedBreathingPelvicVisualAsset> = {
    'breathing-supine-diaphragmatic':
      BREATHING_PELVIC_DIAGRAM_SPECS['breathing-supine-diaphragmatic'].asset,
    'breathing-seated-standing-expansion':
      BREATHING_PELVIC_DIAGRAM_SPECS['breathing-seated-standing-expansion'].asset,
    'pelvic-clock-and-imprint-rock':
      BREATHING_PELVIC_DIAGRAM_SPECS['pelvic-clock-and-imprint-rock'].asset,
  };

  return Object.freeze({
    assets: BREATHING_PELVIC_VISUAL_ASSETS,
    corrections,
    byCatalogExerciseId: BREATHING_PELVIC_VISUAL_ASSETS,
    byDiagramId: Object.freeze(byDiagramId),
  });
}
