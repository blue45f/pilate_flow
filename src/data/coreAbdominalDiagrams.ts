import sourceLedgerJson from './coreAbdominalSourceLedger.json';
import type { MovementDiagramCorrection } from './movementDiagramCorrections';
import type {
  CatalogMovementVisualAsset,
  JointAlignmentGuide,
  MovementDirectionVector,
  MuscleHighlightSpec,
  PhasePoseSpec,
  Point2D,
  RigJointMap,
  VisualPhaseId,
} from './movementVisualRigCatalog';
import type { PilatesExercise } from '../types/pilates';

export type CoreAbdominalDiagramId =
  | 'core-hundred'
  | 'core-single-leg-stretch'
  | 'core-double-leg-stretch';

export const CORE_ABDOMINAL_DIAGRAM_IDS: readonly CoreAbdominalDiagramId[] = Object.freeze([
  'core-hundred',
  'core-single-leg-stretch',
  'core-double-leg-stretch',
]);

export interface CoreJointAxisSpec {
  readonly id: string;
  readonly labelKo: string;
  readonly role: 'thoracic-curl-pivot' | 'hip-dissociation-axis' | 'shoulder-pump-axis' | 'lumbar-pelvic-lock';
  readonly point: Point2D;
  readonly referenceLineFrom: Point2D;
  readonly referenceLineTo: Point2D;
  readonly descriptionKo: string;
}

export interface CoreContactPointSpec {
  readonly id: string;
  readonly labelKo: string;
  readonly joint: keyof RigJointMap;
  readonly kind: 'mat-imprint-anchor' | 'scapular-tip-touch' | 'hand-shin-clasp';
  readonly point: Point2D;
  readonly phases: readonly VisualPhaseId[];
}

export interface CoreCalloutLabelSpec {
  readonly id: string;
  readonly phaseId: VisualPhaseId;
  readonly textKo: string;
  readonly anchor: Point2D;
  readonly badgePosition: Point2D;
  readonly tone: 'anchor' | 'excursion' | 'breath' | 'caution';
}

export interface CoreTrajectoryOverlaySpec {
  readonly id: string;
  readonly labelKo: string;
  readonly kind: 'vertical-arm-pump' | 'reciprocal-leg-scissor' | 'double-limb-opposition' | 'wide-arm-circle';
  readonly phaseId: VisualPhaseId;
  readonly svgPathD: string;
  readonly startPoint: Point2D;
  readonly endPoint: Point2D;
  readonly deltaVector?: readonly [number, number];
}

export interface CoreKinematicMetrics {
  readonly startKneeAngleDeg?: number;
  readonly legDiagonalAngleDeg: number;
  readonly scissorSplitAngleDeg?: number;
  readonly overheadArmAngleDeg?: number;
  readonly armPumpDeltaRangeY?: readonly [number, number];
  readonly scapulaTipY: number;
  readonly lumbarAnchorY: number;
  readonly pelvisAnchorY: number;
}

export interface CoreAbdominalDiagramSpec {
  readonly id: CoreAbdominalDiagramId;
  readonly mappedExerciseIds: readonly string[];
  readonly primaryCatalogExerciseId: string;
  readonly nameKo: string;
  readonly nameEn: string;
  readonly subtitleKo: string;
  readonly archetypeId: string;
  readonly archetypeTitleKo: string;
  readonly matBaselineY: 148;
  readonly kinematicMetrics: CoreKinematicMetrics;
  readonly jointAxes: readonly CoreJointAxisSpec[];
  readonly contactPoints: readonly CoreContactPointSpec[];
  readonly calloutLabels: readonly CoreCalloutLabelSpec[];
  readonly trajectoryOverlays: readonly CoreTrajectoryOverlaySpec[];
  readonly asset: CatalogMovementVisualAsset;
  readonly correction: MovementDiagramCorrection;
}

export interface CoreDiagramLegendItem {
  readonly id: string;
  readonly labelKo: string;
  readonly descriptionKo: string;
  readonly swatchColor: string;
  readonly symbol: 'anchor-dot' | 'trajectory-arrow' | 'scissor-arc' | 'imprint-bar';
}

export interface CoreI7RegistryPatch {
  readonly assets: Readonly<Record<string, CatalogMovementVisualAsset>>;
  readonly corrections: Readonly<Record<string, MovementDiagramCorrection>>;
  readonly byCatalogExerciseId: Readonly<Record<string, CatalogMovementVisualAsset>>;
  readonly byCoreId: Readonly<Record<CoreAbdominalDiagramId, CatalogMovementVisualAsset>>;
}

export const CORE_ABDOMINAL_SOURCE_LEDGER = Object.freeze(sourceLedgerJson);

export const CORE_DIAGRAM_LEGEND_ITEMS: readonly CoreDiagramLegendItem[] = Object.freeze([
  {
    id: 'lumbar-pelvic-imprint',
    labelKo: '요추·천골 매트 임프린트 앵커 (y = 143..144)',
    descriptionKo: '사지 신전·교차 중에도 허리가 들뜨거나 꼬리뼈가 말려 들리지 않게 지지면을 고정합니다.',
    swatchColor: '#2b6a58',
    symbol: 'imprint-bar',
  },
  {
    id: 'scapular-curl-pivot',
    labelKo: '견갑골 하각 컬업 피벗 (y = 135..136)',
    descriptionKo: '목 과긴장 없이 상부 흉추 굴곡 높이를 일정하게 유지하는 기준점입니다.',
    swatchColor: '#1d4ed8',
    symbol: 'anchor-dot',
  },
  {
    id: 'limb-excursion-trajectory',
    labelKo: '사지 가동 궤적 (펌핑 · 시저 스플릿 · 암 서클)',
    descriptionKo: '헌드레드 수직 암 펌핑([0,-14]~[0,14]), 싱글 레그 78° 교차, 더블 레그 135° 오버헤드 및 암 서클 경로입니다.',
    swatchColor: '#c86d44',
    symbol: 'trajectory-arrow',
  },
  {
    id: 'hand-shin-clasp-guide',
    labelKo: '정강이·발목 핸드 그립 & 반대 신전 각도',
    descriptionKo: '싱글·더블 레그 스트레치에서 정강이 터치 정렬과 45° 하지 사선 축을 나타냅니다.',
    swatchColor: '#8b5cf6',
    symbol: 'scissor-arc',
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

const CORE_MUSCLE_HIGHLIGHTS: readonly MuscleHighlightSpec[] = Object.freeze([
  {
    muscleGroupId: 'rectus-obliques',
    labelKo: '복직근·내외복사근 (상복부 컬업 & 갈비뼈 닫기)',
    labelEn: 'Rectus Abdominis & Obliques',
    catalogMuscleMatches: ['복직근', '상복부', '하복부', '내/외복사근', '내복사근', '외복사근'],
    role: 'primary',
    roleLabelKo: '주동근 (주 타겟)',
    activePhases: ['start', 'middle', 'end'],
    anchorJoints: ['thoracic', 'lumbar', 'pelvis'],
    reasonKo: '견갑골 하각 컬업 높이를 유지하고 오버헤드 리치·다리 교차 중 흉곽 들림(Rib Flare)을 억제합니다.',
  },
  {
    muscleGroupId: 'core-transversus',
    labelKo: '심부 코어 (복횡근·다열근·골반저근)',
    labelEn: 'Deep Core & Transversus Abdominis',
    catalogMuscleMatches: ['복횡근', '골반저근', '다열근', '몸통'],
    role: 'stabilizer',
    roleLabelKo: '안정화근 (코어·정렬 유지)',
    activePhases: ['start', 'middle', 'end'],
    anchorJoints: ['lumbar', 'pelvis', 'hip'],
    reasonKo: '사지 지렛대가 길어지는 중간 정점에서도 요추(y=143..144)와 천골(y=143)을 매트에 단단히 고정합니다.',
  },
  {
    muscleGroupId: 'hip-flexor-iliopsoas',
    labelKo: '장요근·대퇴사두근 (45° 사선 하지 지지 & 시저 교차)',
    labelEn: 'Iliopsoas & Quadriceps',
    catalogMuscleMatches: ['고관절 굴곡근', '장요근', '대퇴사두근'],
    role: 'primary',
    roleLabelKo: '주동근 (주 타겟)',
    activePhases: ['start', 'middle', 'end'],
    anchorJoints: ['hip', 'knee', 'ankle'],
    reasonKo: '고관절 분리 제어와 무릎 신전으로 90° 테이블탑 및 45° 사선 지렛대를 정교하게 유지합니다.',
  },
  {
    muscleGroupId: 'hamstrings',
    labelKo: '햄스트링·둔부 후면 사슬 (교차 신장)',
    labelEn: 'Hamstrings & Posterior Hip',
    catalogMuscleMatches: ['햄스트링', '둔근'],
    role: 'lengthening',
    roleLabelKo: '신장·이완 부위',
    activePhases: ['middle', 'end'],
    anchorJoints: ['pelvis', 'knee', 'ankle'],
    reasonKo: '무릎을 가슴으로 당기는 구간과 사선 뻗기 구간에서 후면 사슬이 길게 늘어납니다.',
  },
]);

function buildCorrectionFromLedger(id: CoreAbdominalDiagramId): MovementDiagramCorrection {
  const entry = sourceLedgerJson.movementReviews[id];
  return Object.freeze({
    archetypeId: entry.archetypeId,
    checkedAt: '2026-11-06',
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
// 1. THE HUNDRED (core-hundred)
// ============================================================================

const HUNDRED_START_JOINTS: RigJointMap = freezeJoints({
  head: { x: 62, y: 98 },
  neck: { x: 74, y: 110 },
  shoulder: { x: 84, y: 122 },
  elbow: { x: 126, y: 126 },
  wrist: { x: 158, y: 128 },
  hand: { x: 170, y: 128 },
  thoracic: { x: 102, y: 136 },
  lumbar: { x: 126, y: 144 },
  pelvis: { x: 152, y: 143 },
  hip: { x: 162, y: 142 },
  knee: { x: 162, y: 96 },
  ankle: { x: 214, y: 96 },
  heel: { x: 210, y: 102 },
  toe: { x: 226, y: 92 },
  farShoulder: { x: 82, y: 120 },
  farElbow: { x: 124, y: 124 },
  farWrist: { x: 156, y: 126 },
  farHip: { x: 158, y: 140 },
  farKnee: { x: 158, y: 94 },
  farAnkle: { x: 210, y: 94 },
  farToe: { x: 222, y: 90 },
});

const HUNDRED_MIDDLE_JOINTS: RigJointMap = freezeJoints({
  head: { x: 60, y: 96 },
  neck: { x: 72, y: 108 },
  shoulder: { x: 82, y: 120 },
  elbow: { x: 126, y: 130 },
  wrist: { x: 160, y: 134 },
  hand: { x: 172, y: 134 },
  thoracic: { x: 102, y: 136 },
  lumbar: { x: 126, y: 144 },
  pelvis: { x: 152, y: 143 },
  hip: { x: 162, y: 142 },
  knee: { x: 204, y: 100 },
  ankle: { x: 244, y: 60 },
  heel: { x: 240, y: 66 },
  toe: { x: 256, y: 48 },
  farShoulder: { x: 80, y: 118 },
  farElbow: { x: 124, y: 126 },
  farWrist: { x: 158, y: 128 },
  farHip: { x: 158, y: 140 },
  farKnee: { x: 200, y: 98 },
  farAnkle: { x: 240, y: 58 },
  farToe: { x: 252, y: 46 },
});

const HUNDRED_END_JOINTS: RigJointMap = freezeJoints({
  head: { x: 64, y: 100 },
  neck: { x: 76, y: 112 },
  shoulder: { x: 86, y: 124 },
  elbow: { x: 126, y: 126 },
  wrist: { x: 156, y: 128 },
  hand: { x: 168, y: 128 },
  thoracic: { x: 102, y: 136 },
  lumbar: { x: 126, y: 144 },
  pelvis: { x: 152, y: 143 },
  hip: { x: 162, y: 142 },
  knee: { x: 162, y: 98 },
  ankle: { x: 212, y: 98 },
  heel: { x: 208, y: 104 },
  toe: { x: 224, y: 94 },
  farShoulder: { x: 84, y: 122 },
  farElbow: { x: 124, y: 124 },
  farWrist: { x: 154, y: 126 },
  farHip: { x: 158, y: 140 },
  farKnee: { x: 158, y: 96 },
  farAnkle: { x: 208, y: 96 },
  farToe: { x: 220, y: 92 },
});

const HUNDRED_ALIGNMENTS: Record<VisualPhaseId, readonly JointAlignmentGuide[]> = {
  start: [
    {
      id: 'hundred-start-tabletop-90',
      labelKo: '90/90 테이블탑 & 견갑골 하각 컬업 준비',
      cueKo: '무릎 각도 90°, 견갑골 하각(y=136) 매트 접촉, 요추·골반(y=143..144) 임프린트를 유지하고 양팔을 바닥과 수평으로 띄웁니다.',
      kind: 'angle-arc',
      from: pt(162, 142),
      to: pt(214, 96),
      targetAngleDeg: 90,
      cautionKo: '목 앞쪽이 과긴장되지 않도록 턱 밑에 계란 하나 공간을 유지합니다.',
    },
  ],
  middle: [
    {
      id: 'hundred-middle-45-diagonal',
      labelKo: '45° 하지 사선 신전 & 골반 옆 수직 암 펌핑',
      cueKo: '상체 컬업(y=136)과 요추 임프린트(y=144)를 고정한 채 양다리를 45° 사선으로 뻗고 골반 높이에서 팔을 위아래([0,-14]~[0,14])로 힘차게 펌핑합니다.',
      kind: 'axis-line',
      from: pt(162, 142),
      to: pt(256, 48),
      targetAngleDeg: 45,
      cautionKo: '허리가 매트에서 들뜨면 즉시 다리 각도를 천장 쪽으로 높입니다.',
    },
  ],
  end: [
    {
      id: 'hundred-end-tabletop-return',
      labelKo: '테이블탑 제어 회수 & 수파인 안착 준비',
      cueKo: '100카운트 호흡 완료 후 암 펌핑을 멈추고 복부 스쿱으로 무릎을 먼저 90° 테이블탑으로 회수한 뒤 상체를 내립니다.',
      kind: 'anchor-lock',
      from: pt(102, 136),
      to: pt(152, 143),
      cautionKo: '다리를 내릴 때 복부 긴장을 한 번에 풀지 않습니다.',
    },
  ],
};

const HUNDRED_VECTORS: Record<VisualPhaseId, readonly MovementDirectionVector[]> = {
  start: [
    {
      id: 'vec-hundred-curl-prep',
      labelKo: '견갑골 하각 컬업 & 수평 암 호버',
      kind: 'spine-articulation',
      points: [pt(62, 98), pt(102, 136), pt(170, 128)],
      phaseScope: 'start',
    },
  ],
  middle: [
    {
      id: 'vec-hundred-vertical-pump',
      labelKo: '5박 들숨 / 5박 날숨 수직 암 펌핑 ([0,-14]~[0,14])',
      kind: 'spring-resistance',
      points: [pt(172, 120), pt(172, 134), pt(172, 148)],
      phaseScope: 'middle',
    },
    {
      id: 'vec-hundred-leg-45-reach',
      labelKo: '양다리 45° 사선 신전',
      kind: 'limb-excursion',
      points: [pt(214, 96), pt(244, 60), pt(256, 48)],
      phaseScope: 'start-to-middle',
    },
  ],
  end: [
    {
      id: 'vec-hundred-tabletop-return',
      labelKo: '테이블탑 제어 회수 및 앙와위 복귀',
      kind: 'return-control',
      points: [pt(244, 60), pt(212, 98), pt(162, 98)],
      phaseScope: 'middle-to-end',
    },
  ],
};

// ============================================================================
// 2. SINGLE LEG STRETCH (core-single-leg-stretch)
// ============================================================================

const SINGLE_LEG_START_JOINTS: RigJointMap = freezeJoints({
  head: { x: 62, y: 96 },
  neck: { x: 74, y: 108 },
  shoulder: { x: 84, y: 120 },
  elbow: { x: 112, y: 108 },
  wrist: { x: 144, y: 94 },
  hand: { x: 164, y: 98 },
  thoracic: { x: 102, y: 136 },
  lumbar: { x: 126, y: 144 },
  pelvis: { x: 152, y: 143 },
  hip: { x: 160, y: 142 },
  knee: { x: 126, y: 90 },
  ankle: { x: 172, y: 100 },
  heel: { x: 168, y: 106 },
  toe: { x: 184, y: 96 },
  farShoulder: { x: 82, y: 118 },
  farElbow: { x: 110, y: 104 },
  farWrist: { x: 136, y: 92 },
  farHip: { x: 156, y: 140 },
  farKnee: { x: 202, y: 94 },
  farAnkle: { x: 244, y: 52 },
  farToe: { x: 258, y: 44 },
});

const SINGLE_LEG_MIDDLE_JOINTS: RigJointMap = freezeJoints({
  head: { x: 62, y: 96 },
  neck: { x: 74, y: 108 },
  shoulder: { x: 84, y: 120 },
  elbow: { x: 114, y: 110 },
  wrist: { x: 142, y: 94 },
  hand: { x: 158, y: 90 },
  thoracic: { x: 102, y: 136 },
  lumbar: { x: 126, y: 144 },
  pelvis: { x: 152, y: 143 },
  hip: { x: 160, y: 142 },
  knee: { x: 166, y: 92 },
  ankle: { x: 212, y: 78 },
  heel: { x: 208, y: 84 },
  toe: { x: 224, y: 72 },
  farShoulder: { x: 82, y: 118 },
  farElbow: { x: 112, y: 106 },
  farWrist: { x: 138, y: 92 },
  farHip: { x: 156, y: 140 },
  farKnee: { x: 158, y: 90 },
  farAnkle: { x: 204, y: 80 },
  farToe: { x: 216, y: 74 },
});

const SINGLE_LEG_END_JOINTS: RigJointMap = freezeJoints({
  head: { x: 62, y: 96 },
  neck: { x: 74, y: 108 },
  shoulder: { x: 84, y: 120 },
  elbow: { x: 110, y: 106 },
  wrist: { x: 140, y: 92 },
  hand: { x: 160, y: 96 },
  thoracic: { x: 102, y: 136 },
  lumbar: { x: 126, y: 144 },
  pelvis: { x: 152, y: 143 },
  hip: { x: 160, y: 142 },
  knee: { x: 206, y: 96 },
  ankle: { x: 248, y: 54 },
  heel: { x: 244, y: 60 },
  toe: { x: 262, y: 46 },
  farShoulder: { x: 82, y: 118 },
  farElbow: { x: 108, y: 102 },
  farWrist: { x: 132, y: 90 },
  farHip: { x: 156, y: 140 },
  farKnee: { x: 122, y: 88 },
  farAnkle: { x: 168, y: 98 },
  farToe: { x: 180, y: 94 },
});

const SINGLE_LEG_ALIGNMENTS: Record<VisualPhaseId, readonly JointAlignmentGuide[]> = {
  start: [
    {
      id: 'sls-start-scissor-split-78',
      labelKo: '우측 무릎 가슴 당김(정강이 그립) & 좌측 45° 신전 (78° 시저 스플릿)',
      cueKo: '양손(wrist/hand)으로 당긴 쪽 정강이·발목을 감싸고 반대 다리는 45° 사선으로 뻗어 대퇴 간 78° 가위 교차를 만듭니다.',
      kind: 'angle-arc',
      from: pt(126, 90),
      to: pt(202, 94),
      targetAngleDeg: 78,
      cautionKo: '무릎을 당길 때 꼬리뼈가 매트에서 들리지 않도록 천골(y=143)을 무겁게 누릅니다.',
    },
  ],
  middle: [
    {
      id: 'sls-middle-pelvic-anti-rotation',
      labelKo: '공중 교차 스위치 & 골반 항회전 고정',
      cueKo: '두 다리가 중심선에서 스쳐 지나가는 순간에도 견갑골 컬업 높이(y=136)와 요추 임프린트(y=144)는 흔들리지 않습니다.',
      kind: 'anchor-lock',
      from: pt(126, 144),
      to: pt(160, 142),
      targetAngleDeg: 0,
      cautionKo: '다리 교대 시 골반이 좌우로 기우뚱(Rolling)하지 않게 복사근을 조입니다.',
    },
  ],
  end: [
    {
      id: 'sls-end-opposite-scissor-78',
      labelKo: '반대 다리 정강이 그립 전환 & 우측 다리 45° 신전 (78° 시저 스플릿)',
      cueKo: '반대쪽 무릎을 가슴으로 당겨 양손 정강이 그립을 바꾸고 우측 다리를 45° 사선 끝까지 길게 뻗어냅니다.',
      kind: 'axis-line',
      from: pt(160, 142),
      to: pt(262, 46),
      targetAngleDeg: 45,
      cautionKo: '어깨가 귀 쪽으로 솟지 않도록 광배근과 전거근을 끌어내립니다.',
    },
  ],
};

const SINGLE_LEG_VECTORS: Record<VisualPhaseId, readonly MovementDirectionVector[]> = {
  start: [
    {
      id: 'vec-sls-shin-clasp-pull',
      labelKo: '정강이·발목 핸드 그립 당김 & 반대 다리 45° 리치',
      kind: 'limb-excursion',
      points: [pt(164, 98), pt(126, 90), pt(244, 52)],
      phaseScope: 'start',
    },
  ],
  middle: [
    {
      id: 'vec-sls-reciprocal-switch',
      labelKo: '양다리 왕복 시저 패스 (Reciprocal Scissor Switch)',
      kind: 'limb-excursion',
      points: [pt(126, 90), pt(166, 92), pt(206, 96)],
      phaseScope: 'start-to-middle',
    },
  ],
  end: [
    {
      id: 'vec-sls-opposite-extension',
      labelKo: '반대 다리 가슴 회수 & 우측 45° 사선 신전 완료',
      kind: 'return-control',
      points: [pt(122, 88), pt(160, 96), pt(248, 54)],
      phaseScope: 'middle-to-end',
    },
  ],
};

// ============================================================================
// 3. DOUBLE LEG STRETCH (core-double-leg-stretch)
// ============================================================================

const DOUBLE_LEG_START_JOINTS: RigJointMap = freezeJoints({
  head: { x: 64, y: 96 },
  neck: { x: 76, y: 108 },
  shoulder: { x: 86, y: 120 },
  elbow: { x: 118, y: 108 },
  wrist: { x: 152, y: 98 },
  hand: { x: 170, y: 102 },
  thoracic: { x: 102, y: 135 },
  lumbar: { x: 126, y: 144 },
  pelvis: { x: 152, y: 143 },
  hip: { x: 160, y: 141 },
  knee: { x: 134, y: 88 },
  ankle: { x: 176, y: 104 },
  heel: { x: 172, y: 110 },
  toe: { x: 188, y: 102 },
  farShoulder: { x: 84, y: 118 },
  farElbow: { x: 116, y: 106 },
  farWrist: { x: 150, y: 96 },
  farHip: { x: 156, y: 139 },
  farKnee: { x: 130, y: 86 },
  farAnkle: { x: 172, y: 102 },
  farToe: { x: 184, y: 100 },
});

const DOUBLE_LEG_MIDDLE_JOINTS: RigJointMap = freezeJoints({
  head: { x: 60, y: 94 },
  neck: { x: 72, y: 106 },
  shoulder: { x: 82, y: 118 },
  elbow: { x: 54, y: 90 },
  wrist: { x: 34, y: 70 },
  hand: { x: 24, y: 60 },
  thoracic: { x: 102, y: 135 },
  lumbar: { x: 126, y: 143 },
  pelvis: { x: 152, y: 143 },
  hip: { x: 160, y: 141 },
  knee: { x: 202, y: 99 },
  ankle: { x: 244, y: 57 },
  heel: { x: 240, y: 63 },
  toe: { x: 256, y: 45 },
  farShoulder: { x: 80, y: 116 },
  farElbow: { x: 52, y: 88 },
  farWrist: { x: 32, y: 68 },
  farHip: { x: 156, y: 139 },
  farKnee: { x: 198, y: 97 },
  farAnkle: { x: 240, y: 55 },
  farToe: { x: 252, y: 43 },
});

const DOUBLE_LEG_END_JOINTS: RigJointMap = freezeJoints({
  head: { x: 64, y: 96 },
  neck: { x: 76, y: 108 },
  shoulder: { x: 86, y: 120 },
  elbow: { x: 110, y: 138 },
  wrist: { x: 148, y: 112 },
  hand: { x: 168, y: 104 },
  thoracic: { x: 102, y: 135 },
  lumbar: { x: 126, y: 143 },
  pelvis: { x: 152, y: 143 },
  hip: { x: 160, y: 141 },
  knee: { x: 138, y: 90 },
  ankle: { x: 180, y: 104 },
  heel: { x: 176, y: 110 },
  toe: { x: 192, y: 102 },
  farShoulder: { x: 84, y: 118 },
  farElbow: { x: 96, y: 84 },
  farWrist: { x: 144, y: 96 },
  farHip: { x: 156, y: 139 },
  farKnee: { x: 134, y: 88 },
  farAnkle: { x: 176, y: 102 },
  farToe: { x: 188, y: 100 },
});

const DOUBLE_LEG_ALIGNMENTS: Record<VisualPhaseId, readonly JointAlignmentGuide[]> = {
  start: [
    {
      id: 'dls-start-compact-tuck',
      labelKo: '컴팩트 볼 정강이 그립 & 꼬리뼈 매트 고정 (y=143)',
      cueKo: '상체 컬업 상태에서 양손으로 정강이·발목을 감싸 무릎을 당기되, 꼬리뼈(y=143)는 매트에서 들리지 않게 고정합니다.',
      kind: 'anchor-lock',
      from: pt(102, 135),
      to: pt(152, 143),
      cautionKo: '엉덩이까지 과하게 말아 올려 요추 지지점이 무너지지 않게 합니다.',
    },
  ],
  middle: [
    {
      id: 'dls-middle-opposition-reach',
      labelKo: '135° 귀 옆 오버헤드 암 & 45° 사선 양다리 반대 신전',
      cueKo: '들숨에 견갑골 하각 컬업(y=135)과 요추 임프린트(y=143)를 유지한 채 양팔은 135° 귀 옆으로, 양다리는 45° 사선으로 동시에 뻗습니다.',
      kind: 'axis-line',
      from: pt(24, 60),
      to: pt(256, 45),
      targetAngleDeg: 135,
      cautionKo: '팔을 머리 위로 뻗을 때 상체가 바닥으로 눕거나 갈비뼈가 들뜨지 않게 주의합니다.',
    },
  ],
  end: [
    {
      id: 'dls-end-wide-arm-sweep',
      labelKo: '와이드 서클 암 스윕(Arm Circle) & 정강이 그립 회수',
      cueKo: '날숨에 양팔이 넓은 원호를 그리며 옆으로 스윕(elbow/farElbow 오픈)하는 동안 무릎을 가슴으로 접어 다시 정강이를 감쌉니다.',
      kind: 'neutral-zone',
      from: pt(86, 120),
      to: pt(168, 104),
      cautionKo: '팔을 돌리는 동안 목과 어깨가 흔들리지 않게 코어 중심을 잠급니다.',
    },
  ],
};

const DOUBLE_LEG_VECTORS: Record<VisualPhaseId, readonly MovementDirectionVector[]> = {
  start: [
    {
      id: 'vec-dls-tuck-compression',
      labelKo: '양손 정강이 클asp & 복부 스쿱 압축',
      kind: 'spine-articulation',
      points: [pt(170, 102), pt(134, 88), pt(126, 144)],
      phaseScope: 'start',
    },
  ],
  middle: [
    {
      id: 'vec-dls-overhead-arm-135',
      labelKo: '양팔 135° 귀 옆 오버헤드 리치',
      kind: 'limb-excursion',
      points: [pt(170, 102), pt(54, 90), pt(24, 60)],
      phaseScope: 'start-to-middle',
    },
    {
      id: 'vec-dls-legs-45-reach',
      labelKo: '양다리 45° 사선 동시 신전',
      kind: 'limb-excursion',
      points: [pt(176, 104), pt(202, 99), pt(244, 57)],
      phaseScope: 'start-to-middle',
    },
  ],
  end: [
    {
      id: 'vec-dls-wide-arm-circle',
      labelKo: '와이드 원형 암 스윕 및 정강이 그립 복귀',
      kind: 'return-control',
      points: [pt(24, 60), pt(110, 138), pt(168, 104)],
      phaseScope: 'middle-to-end',
    },
  ],
};

interface BuildCoreAssetParams {
  readonly exerciseId: string;
  readonly nameKo: string;
  readonly nameEn: string;
  readonly apparatus: 'mat' | 'reformer';
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

function buildCoreVisualAsset(params: BuildCoreAssetParams): CatalogMovementVisualAsset {
  const makeFixedAnchors = (joints: RigJointMap) =>
    Object.freeze([
      Object.freeze({
        joint: 'lumbar' as const,
        surfaceKo: '요추 매트 임프린트 고정면 (y=143..144)',
        point: joints.lumbar,
      }),
      Object.freeze({
        joint: 'pelvis' as const,
        surfaceKo: '천골·골반 수평 고정 앵커 (y=143)',
        point: joints.pelvis,
      }),
      Object.freeze({
        joint: 'thoracic' as const,
        surfaceKo: '견갑골 하각 컬업 피벗 (y=135..136)',
        point: joints.thoracic,
      }),
    ]);

  const movingJoints: readonly (keyof RigJointMap)[] = Object.freeze([
    'head',
    'shoulder',
    'elbow',
    'wrist',
    'hand',
    'knee',
    'ankle',
    'toe',
    'farKnee',
    'farAnkle',
  ]);

  const supportSurfaceKo =
    params.apparatus === 'reformer'
      ? '리포머 캐리지 수파인 지지면 (요추·천골 밀착 y=143..144)'
      : '매트 수파인 지지면 (요추·천골 임프린트 y=143..144)';

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
      carriageOffsetPx: params.apparatus === 'reformer' ? 4 : 0,
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
      carriageOffsetPx: params.apparatus === 'reformer' ? 24 : 0,
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
      carriageOffsetPx: params.apparatus === 'reformer' ? 6 : 0,
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
    bodyPosition: 'supine',
    blockCategory: 'core',
    spinalPlanes: Object.freeze(['flexion', 'neutral'] as const),
    isUnilateral: params.isUnilateral,
    archetypeId: params.archetypeId,
    archetypeTitleKo: params.archetypeTitleKo,
    staticGuideSvgPath: `/images/movement-guides/${params.apparatus}-phase-alignment-guide.svg`,
    productionMethod: 'free-authored-kinematic-svg-v1',
    rightsStatus: 'original-app-authored-free-license',
    licenseLabelKo:
      '앱 자체 제작 다관절 키네마틱 도해 (Original Free-License Kinematic SVG v1 · 외부 저작권 무관)',
    anatomicalAccuracyAssumed: false,
    phases: Object.freeze({
      start: startPhase,
      middle: middlePhase,
      end: endPhase,
    }),
    primaryMuscles: CORE_MUSCLE_HIGHLIGHTS,
    poseDeltaSummary: Object.freeze(params.poseDeltaSummary),
    mobileSummaryBulletsKo: Object.freeze(params.mobileSummaryBulletsKo),
  });
}

const HUNDRED_SPEC: CoreAbdominalDiagramSpec = Object.freeze({
  id: 'core-hundred',
  mappedExerciseIds: Object.freeze(['ex-core-01', 'original-mat-hundred-prep', 'core-hundred']),
  primaryCatalogExerciseId: 'ex-core-01',
  nameKo: '헌드레드 (The Hundred)',
  nameEn: 'The Hundred (Tabletop Curl-up & 45° Diagonal Arm Pump)',
  subtitleKo: '90° 테이블탑 컬업 준비 → 45° 사선 신전 & 5박 호흡 수직 암 펌핑([0,-14]~[0,14]) → 테이블탑 제어 복귀',
  archetypeId: 'core-hundred-isolated',
  archetypeTitleKo: '코어 헌드레드 · 45° 하지 사선 지지 & 골반 옆 수직 암 펌핑',
  matBaselineY: 148,
  kinematicMetrics: Object.freeze({
    startKneeAngleDeg: 90,
    legDiagonalAngleDeg: 45,
    armPumpDeltaRangeY: Object.freeze([-14, 14] as const),
    scapulaTipY: 136,
    lumbarAnchorY: 144,
    pelvisAnchorY: 143,
  }),
  jointAxes: Object.freeze([
    {
      id: 'hundred-scapula-pivot',
      labelKo: '견갑골 하각 컬업 피벗 (y=136)',
      role: 'thoracic-curl-pivot',
      point: pt(102, 136),
      referenceLineFrom: pt(60, 96),
      referenceLineTo: pt(126, 144),
      descriptionKo: '견갑골 하각 끝이 매트에 닿는 높이(y=136)에서 상체 컬업을 흔들림 없이 유지합니다.',
    },
    {
      id: 'hundred-shoulder-pump-axis',
      labelKo: '견관절 수직 펌핑 회전축',
      role: 'shoulder-pump-axis',
      point: pt(82, 120),
      referenceLineFrom: pt(82, 120),
      referenceLineTo: pt(172, 134),
      descriptionKo: '손목이 아닌 어깨 관절(광배근·전거근 연결)에서 골반 높이 수직 암 펌핑([0,-14]~[0,14])을 구동합니다.',
    },
    {
      id: 'hundred-lumbar-pelvic-lock',
      labelKo: '요추·천골 매트 임프린트 앵커 (y=143..144)',
      role: 'lumbar-pelvic-lock',
      point: pt(126, 144),
      referenceLineFrom: pt(118, 144),
      referenceLineTo: pt(162, 143),
      descriptionKo: '양다리를 45° 사선으로 뻗는 동안 허리가 매트에서 뜨지 않도록 압착합니다.',
    },
  ] as const),
  contactPoints: Object.freeze([
    {
      id: 'hundred-contact-scapula',
      labelKo: '견갑골 하각 매트 접촉점 (y=136)',
      joint: 'thoracic',
      kind: 'scapular-tip-touch',
      point: pt(102, 136),
      phases: ['start', 'middle', 'end'],
    },
    {
      id: 'hundred-contact-lumbar',
      labelKo: '요추 임프린트 지지점 (y=144)',
      joint: 'lumbar',
      kind: 'mat-imprint-anchor',
      point: pt(126, 144),
      phases: ['start', 'middle', 'end'],
    },
    {
      id: 'hundred-contact-pelvis',
      labelKo: '천골 수평 지지점 (y=143)',
      joint: 'pelvis',
      kind: 'mat-imprint-anchor',
      point: pt(152, 143),
      phases: ['start', 'middle', 'end'],
    },
  ] as const),
  calloutLabels: Object.freeze([
    {
      id: 'hundred-callout-start',
      phaseId: 'start',
      textKo: '90° 테이블탑 & 수평 암 호버',
      anchor: pt(162, 96),
      badgePosition: pt(148, 42),
      tone: 'anchor',
    },
    {
      id: 'hundred-callout-middle',
      phaseId: 'middle',
      textKo: '45° 사선 레그 & 5박 수직 펌핑 (±14px)',
      anchor: pt(172, 134),
      badgePosition: pt(116, 36),
      tone: 'excursion',
    },
    {
      id: 'hundred-callout-end',
      phaseId: 'end',
      textKo: '테이블탑 제어 회수 (요추 y=144 유지)',
      anchor: pt(162, 98),
      badgePosition: pt(132, 42),
      tone: 'breath',
    },
  ] as const),
  trajectoryOverlays: Object.freeze([
    {
      id: 'hundred-overlay-pump',
      labelKo: '골반 높이 수직 암 펌핑 궤적 ([0,-14] ↔ [0,14])',
      kind: 'vertical-arm-pump',
      phaseId: 'middle',
      svgPathD: 'M 172 120 L 172 148',
      startPoint: pt(172, 120),
      endPoint: pt(172, 148),
      deltaVector: Object.freeze([0, 14] as const),
    },
  ] as const),
  asset: buildCoreVisualAsset({
    exerciseId: 'ex-core-01',
    nameKo: '리포머 수파인 암워크 & 헌드레드 시리즈',
    nameEn: 'Reformer Supine Arms, Coordination & The Hundred',
    apparatus: 'reformer',
    isUnilateral: false,
    archetypeId: 'core-hundred-isolated',
    archetypeTitleKo: '코어 헌드레드 · 45° 하지 사선 지지 & 골반 옆 수직 암 펌핑',
    startJoints: HUNDRED_START_JOINTS,
    middleJoints: HUNDRED_MIDDLE_JOINTS,
    endJoints: HUNDRED_END_JOINTS,
    phaseTitlesKo: [
      '90/90 테이블탑 컬업 & 수평 암 호버 준비',
      '45° 사선 레그 익스텐션 & 5박 수직 암 펌핑 정점',
      '테이블탑 제어 회수 및 앙와위 복귀',
    ],
    phaseSummariesKo: [
      '요추(y=144)·골반(y=143)을 매트에 임프린트하고 견갑골 하각(y=136)까지 상체를 컬업한 뒤 무릎 90° 테이블탑과 수평 암 호버를 세팅합니다.',
      '상체 컬업과 요추 임프린트를 단단히 고정한 채 두 다리를 45° 사선으로 뻗고, 골반 높이에서 5박 들숨·5박 날숨 수직 암 펌핑([0,-14]~[0,14])을 수행합니다.',
      '100카운트 호흡 후 팔을 수평 정지하고 복부 스쿱으로 무릎을 90° 테이블탑으로 먼저 회수한 뒤 안전하게 내려옵니다.',
    ],
    breathCuesKo: [
      '들숨 준비: 뒷목을 길게 늘리고 90/90 테이블탑 및 복부 임프린트 세팅',
      '5박 들숨(In 2-3-4-5) · 5박 날숨(Out 2-3-4-5): 골반 옆 수직 암 펌핑 유지',
      '날숨 마무리: 팔 정지 후 복부 브레이크로 무릎 테이블탑 회수',
    ],
    alignments: HUNDRED_ALIGNMENTS,
    directionVectors: HUNDRED_VECTORS,
    poseDeltaSummary: {
      startToMiddleKo:
        '요추(y:144)·골반(y:143)·견갑골 하각(y:136)은 고정된 채 양다리가 90° 테이블탑(knee 162,96)에서 45° 사선(ankle 244,60)으로 신전되고 양팔이 골반 옆(y:120..148)에서 수직 펌핑합니다.',
      middleToEndKo:
        '상체 컬업 높이를 유지한 채 양다리가 다시 90° 테이블탑(knee 162,98, ankle 212,98)으로 제어 회수됩니다.',
      invariantAnchorsKo:
        '견갑골 하각(thoracic y:136), 요추(lumbar y:144), 천골(pelvis y:143) 3점 매트 지지선이 전 구간 고정됩니다.',
      keyJointChangeKo:
        '슬관절 90°→45° 사선 신전(ankle Δ52px) + 견관절 축 수직 암 펌핑(±14px)',
    },
    mobileSummaryBulletsKo: [
      '시작 정렬: 무릎 90° 테이블탑 · 견갑 하각(y=136) 컬업 · 요추/골반(y=143..144) 임프린트',
      '중간 정점: 양다리 45° 사선 신전 + 골반 옆 5박 들숨/5박 날숨 수직 암 펌핑(±14px)',
      '제어 복귀: 컬업 유지 상태에서 테이블탑 무릎 먼저 회수 후 수파인 안착',
    ],
  }),
  correction: buildCorrectionFromLedger('core-hundred'),
});

const SINGLE_LEG_STRETCH_SPEC: CoreAbdominalDiagramSpec = Object.freeze({
  id: 'core-single-leg-stretch',
  mappedExerciseIds: Object.freeze([
    'original-mat-single-leg-stretch',
    'ex-core-02',
    'core-single-leg-stretch',
  ]),
  primaryCatalogExerciseId: 'original-mat-single-leg-stretch',
  nameKo: '싱글 레그 스트레치 (Single Leg Stretch)',
  nameEn: 'Single Leg Stretch (Hand-Shin Clasp & 78° Reciprocal Scissor)',
  subtitleKo: '우측 무릎 가슴 당김(정강이 그립) & 좌측 45° 신전(78° 교차) → 공중 교대 스위치 → 반대측 정강이 그립 & 45° 신전',
  archetypeId: 'core-single-leg-stretch-isolated',
  archetypeTitleKo: '코어 싱글 레그 스트레치 · 정강이 핸드 그립 & 78° 가위 교차',
  matBaselineY: 148,
  kinematicMetrics: Object.freeze({
    legDiagonalAngleDeg: 45,
    scissorSplitAngleDeg: 78,
    scapulaTipY: 136,
    lumbarAnchorY: 144,
    pelvisAnchorY: 143,
  }),
  jointAxes: Object.freeze([
    {
      id: 'sls-hip-scissor-axis',
      labelKo: '양측 고관절 78° 가위 교차 축 (Scissor Split Axis)',
      role: 'hip-dissociation-axis',
      point: pt(160, 142),
      referenceLineFrom: pt(126, 90),
      referenceLineTo: pt(202, 94),
      descriptionKo: '당긴 쪽 대퇴골과 45° 사선으로 뻗은 반대쪽 대퇴골이 78° 시저 스플릿 각도를 유지하며 교대합니다.',
    },
    {
      id: 'sls-lumbar-pelvic-lock',
      labelKo: '요추·골반 항회전 매트 고정축 (y=143..144)',
      role: 'lumbar-pelvic-lock',
      point: pt(152, 143),
      referenceLineFrom: pt(120, 144),
      referenceLineTo: pt(164, 143),
      descriptionKo: '좌우 다리가 교차할 때 골반이 좌우로 흔들리거나 허리가 뜨지 않도록 매트에 단단히 고정합니다.',
    },
  ] as const),
  contactPoints: Object.freeze([
    {
      id: 'sls-contact-shin-clasp',
      labelKo: '양손 정강이·발목 직접 그립 (Hand-Shin Clasp)',
      joint: 'hand',
      kind: 'hand-shin-clasp',
      point: pt(164, 98),
      phases: ['start', 'end'],
    },
    {
      id: 'sls-contact-lumbar',
      labelKo: '요추 매트 임프린트 앵커 (y=144)',
      joint: 'lumbar',
      kind: 'mat-imprint-anchor',
      point: pt(126, 144),
      phases: ['start', 'middle', 'end'],
    },
    {
      id: 'sls-contact-pelvis',
      labelKo: '천골 수평 고정 앵커 (y=143)',
      joint: 'pelvis',
      kind: 'mat-imprint-anchor',
      point: pt(152, 143),
      phases: ['start', 'middle', 'end'],
    },
  ] as const),
  calloutLabels: Object.freeze([
    {
      id: 'sls-callout-start',
      phaseId: 'start',
      textKo: '정강이 핸드 그립 & 반대 다리 45° (78° 스플릿)',
      anchor: pt(164, 98),
      badgePosition: pt(110, 36),
      tone: 'excursion',
    },
    {
      id: 'sls-callout-middle',
      phaseId: 'middle',
      textKo: '중심선 왕복 시저 스위치 (골반 흔들림 0°)',
      anchor: pt(166, 92),
      badgePosition: pt(116, 38),
      tone: 'anchor',
    },
    {
      id: 'sls-callout-end',
      phaseId: 'end',
      textKo: '반대쪽 무릎 당김 & 우측 45° 사선 신전 (78°)',
      anchor: pt(206, 96),
      badgePosition: pt(112, 36),
      tone: 'excursion',
    },
  ] as const),
  trajectoryOverlays: Object.freeze([
    {
      id: 'sls-overlay-scissor-arc',
      labelKo: '좌·우 하지 78° 왕복 시저 교차 궤적',
      kind: 'reciprocal-leg-scissor',
      phaseId: 'start',
      svgPathD: 'M 126 90 Q 166 64 202 94',
      startPoint: pt(126, 90),
      endPoint: pt(202, 94),
    },
    {
      id: 'sls-overlay-scissor-switch-end',
      labelKo: '반대측 78° 시저 스플릿 완료 궤적',
      kind: 'reciprocal-leg-scissor',
      phaseId: 'end',
      svgPathD: 'M 122 88 Q 164 62 206 96',
      startPoint: pt(122, 88),
      endPoint: pt(206, 96),
    },
  ] as const),
  asset: buildCoreVisualAsset({
    exerciseId: 'original-mat-single-leg-stretch',
    nameKo: '싱글 레그 스트레치 준비',
    nameEn: 'Single Leg Stretch Preparation',
    apparatus: 'mat',
    isUnilateral: true,
    archetypeId: 'core-single-leg-stretch-isolated',
    archetypeTitleKo: '코어 싱글 레그 스트레치 · 정강이 핸드 그립 & 78° 가위 교차',
    startJoints: SINGLE_LEG_START_JOINTS,
    middleJoints: SINGLE_LEG_MIDDLE_JOINTS,
    endJoints: SINGLE_LEG_END_JOINTS,
    phaseTitlesKo: [
      '우측 무릎 가슴 당김(정강이 그립) & 좌측 다리 45° 신전',
      '중심선 왕복 시저 패스 (골반·컬업 높이 고정)',
      '좌측 무릎 정강이 그립 전환 & 우측 다리 45° 신전',
    ],
    phaseSummariesKo: [
      '상체 컬업(y=136)과 요추·골반 매트 고정(y=143..144) 상태에서 우측 무릎을 가슴으로 당겨 양손(wrist/hand)으로 정강이·발목을 잡고 좌측 다리는 45° 사선(78° 시저 스플릿)으로 뻗습니다.',
      '견갑골 하각 컬업 높이와 골반 수평을 그대로 유지한 채 두 다리가 공중 중심선에서 스쳐 지나가며 교대합니다.',
      '반대쪽(좌측) 무릎을 가슴으로 당겨 양손 정강이 그립을 완성하고 우측 다리를 45° 사선(78° 시저 스플릿)으로 길게 뻗어냅니다.',
    ],
    breathCuesKo: [
      '날숨 1: 우측 무릎 가슴 당김 & 좌측 다리 45° 사선 리치',
      '들숨 전환: 몸통 흔들림 없이 공중 중심선에서 양다리 교차',
      '날숨 2: 좌측 무릎 정강이 그립 & 우측 다리 45° 사선 신전',
    ],
    alignments: SINGLE_LEG_ALIGNMENTS,
    directionVectors: SINGLE_LEG_VECTORS,
    poseDeltaSummary: {
      startToMiddleKo:
        '양손이 정강이(164,98)에서 중심 전환점(158,90)으로 이동하며 당긴 다리(knee 126,90)와 뻗은 다리(farKnee 202,94)가 공중에서 교차합니다.',
      middleToEndKo:
        '반대쪽 무릎(farKnee 122,88)이 가슴으로 당겨지고 우측 다리(knee 206,96, ankle 248,54)가 45° 사선으로 뻗어 78° 시저 스플릿을 완성합니다.',
      invariantAnchorsKo:
        '상체 컬업 피벗(thoracic y:136), 요추(lumbar y:144), 골반(pelvis y:143) 지지선이 좌우 교대 중에도 고정됩니다.',
      keyJointChangeKo:
        '양손 정강이 그립(hand y:96..98) + 좌우 대퇴 78° 역방향 가위 교차(ankle Δ94px)',
    },
    mobileSummaryBulletsKo: [
      '시작 자세: 우측 무릎 가슴 당김(양손 정강이·발목 그립) + 좌측 다리 45° 사선 신전(78° 스플릿)',
      '중간 스위치: 견갑 하각 컬업(y=136) 및 요추·골반(y=143..144) 고정 아래 공중 교차',
      '끝 자세: 반대쪽 무릎 정강이 그립 전환 + 우측 다리 45° 사선 신전(78° 스플릿)',
    ],
  }),
  correction: buildCorrectionFromLedger('core-single-leg-stretch'),
});

const DOUBLE_LEG_STRETCH_SPEC: CoreAbdominalDiagramSpec = Object.freeze({
  id: 'core-double-leg-stretch',
  mappedExerciseIds: Object.freeze([
    'ex-core-03',
    'original-mat-double-leg-stretch',
    'core-double-leg-stretch',
  ]),
  primaryCatalogExerciseId: 'ex-core-03',
  nameKo: '더블 레그 스트레치 (Double Leg Stretch)',
  nameEn: 'Double Leg Stretch (Compact Tuck, 135° Overhead / 45° Leg Opposition & Arm Circle)',
  subtitleKo: '정강이 그립 컴팩트 볼(꼬리뼈 y=143 고정) → 135° 귀 옆 오버헤드 암 & 45° 양다리 동시 신전 → 와이드 서클 암 스윕 복귀',
  archetypeId: 'core-double-leg-stretch-isolated',
  archetypeTitleKo: '코어 더블 레그 스트레치 · 양방향 반대 신전 & 와이드 암 서클',
  matBaselineY: 148,
  kinematicMetrics: Object.freeze({
    legDiagonalAngleDeg: 45,
    overheadArmAngleDeg: 135,
    scapulaTipY: 135,
    lumbarAnchorY: 143,
    pelvisAnchorY: 143,
  }),
  jointAxes: Object.freeze([
    {
      id: 'dls-thoracic-curl-pivot',
      labelKo: '견갑골 하각 컬업 유지축 (y=135)',
      role: 'thoracic-curl-pivot',
      point: pt(102, 135),
      referenceLineFrom: pt(60, 94),
      referenceLineTo: pt(126, 143),
      descriptionKo: '양팔이 135° 귀 옆으로 뻗는 순간에도 상체가 뒤로 눕지 않고 견갑골 하각(y=135) 컬업을 지킵니다.',
    },
    {
      id: 'dls-lumbar-tailbone-anchor',
      labelKo: '요추·꼬리뼈 매트 고정축 (y=143..144)',
      role: 'lumbar-pelvic-lock',
      point: pt(152, 143),
      referenceLineFrom: pt(120, 144),
      referenceLineTo: pt(164, 143),
      descriptionKo: '무릎을 당길 때 꼬리뼈가 뜨지 않고, 팔·다리를 뻗을 때 허리가 아치로 들뜨지 않게 고정합니다.',
    },
  ] as const),
  contactPoints: Object.freeze([
    {
      id: 'dls-contact-shin-clasp',
      labelKo: '양손 양쪽 정강이·발목 터치 그립',
      joint: 'hand',
      kind: 'hand-shin-clasp',
      point: pt(170, 102),
      phases: ['start', 'end'],
    },
    {
      id: 'dls-contact-scapula',
      labelKo: '견갑골 하각 매트 피벗 (y=135)',
      joint: 'thoracic',
      kind: 'scapular-tip-touch',
      point: pt(102, 135),
      phases: ['start', 'middle', 'end'],
    },
    {
      id: 'dls-contact-pelvis',
      labelKo: '꼬리뼈·천골 매트 고정점 (y=143)',
      joint: 'pelvis',
      kind: 'mat-imprint-anchor',
      point: pt(152, 143),
      phases: ['start', 'middle', 'end'],
    },
  ] as const),
  calloutLabels: Object.freeze([
    {
      id: 'dls-callout-start',
      phaseId: 'start',
      textKo: '컴팩트 볼 정강이 그립 (꼬리뼈 y=143 매트 고정)',
      anchor: pt(170, 102),
      badgePosition: pt(114, 36),
      tone: 'anchor',
    },
    {
      id: 'dls-callout-middle',
      phaseId: 'middle',
      textKo: '135° 귀 옆 암 리치 ↔ 45° 양다리 반대 신전',
      anchor: pt(24, 60),
      badgePosition: pt(88, 34),
      tone: 'excursion',
    },
    {
      id: 'dls-callout-end',
      phaseId: 'end',
      textKo: '와이드 서클 암 스윕 & 정강이 그립 회수',
      anchor: pt(110, 138),
      badgePosition: pt(112, 36),
      tone: 'breath',
    },
  ] as const),
  trajectoryOverlays: Object.freeze([
    {
      id: 'dls-overlay-opposition',
      labelKo: '135° 오버헤드 암 ↔ 45° 사선 레그 양방향 반대 신전',
      kind: 'double-limb-opposition',
      phaseId: 'middle',
      svgPathD: 'M 82 118 L 24 60 M 160 141 L 256 45',
      startPoint: pt(24, 60),
      endPoint: pt(256, 45),
    },
    {
      id: 'dls-overlay-arm-circle',
      labelKo: '와이드 서클 암 스윕 (Wide Circular Arm Sweep)',
      kind: 'wide-arm-circle',
      phaseId: 'end',
      svgPathD: 'M 24 60 Q 96 154 168 104',
      startPoint: pt(24, 60),
      endPoint: pt(168, 104),
    },
  ] as const),
  asset: buildCoreVisualAsset({
    exerciseId: 'ex-core-03',
    nameKo: '매트 필라테스 앱 파이브 (Ab Series of 5)',
    nameEn: 'Classical Mat Ab Series of 5 (Single/Double Leg Stretch, Scissors, Criss-Cross)',
    apparatus: 'mat',
    isUnilateral: false,
    archetypeId: 'core-double-leg-stretch-isolated',
    archetypeTitleKo: '코어 더블 레그 스트레치 · 양방향 반대 신전 & 와이드 암 서클',
    startJoints: DOUBLE_LEG_START_JOINTS,
    middleJoints: DOUBLE_LEG_MIDDLE_JOINTS,
    endJoints: DOUBLE_LEG_END_JOINTS,
    phaseTitlesKo: [
      '컴팩트 볼 정강이 그립 & 상체 컬업 세팅',
      '135° 귀 옆 오버헤드 암 & 45° 양다리 동시 반대 신전',
      '와이드 서클 암 스윕 & 무릎 당겨 정강이 그립 복귀',
    ],
    phaseSummariesKo: [
      '상체 컬업(견갑골 하각 y=135) 상태에서 두 무릎을 가슴으로 당겨 양손으로 정강이·발목을 감싸 쥐고, 꼬리뼈(y=143)는 매트에 무겁게 고정합니다.',
      '들숨에 상체 컬업 높이(y=135)와 요추 임프린트(y=143)를 유지한 채 양팔은 귀 옆 135° 오버헤드(24,60)로, 양다리는 45° 사선(244,57)으로 동시에 길게 뻗습니다.',
      '날숨에 양팔이 넓은 원(elbow 110,138 / farElbow 96,84)을 그리며 스윕하는 동안 두 무릎을 가슴으로 접어 다시 정강이를 감싸 쥡니다.',
    ],
    breathCuesKo: [
      '준비 날숨: 아랫배를 깊게 당기며 두 무릎과 정강이를 감싸 컴팩트 볼 정렬',
      '들숨 리치: 갈비뼈 들림 없이 양팔 135° 귀 옆 & 양다리 45° 사선 동시 확장',
      '날숨 서클: 양팔을 크게 돌려 정강이를 감싸며 복부 중심 압축 복귀',
    ],
    alignments: DOUBLE_LEG_ALIGNMENTS,
    directionVectors: DOUBLE_LEG_VECTORS,
    poseDeltaSummary: {
      startToMiddleKo:
        '양손이 정강이(170,102)에서 귀 옆 135° 오버헤드(24,60)로 뻗고, 양다리가 무릎 굴곡(134,88)에서 45° 사선(244,57)으로 동시 반대 신전됩니다.',
      middleToEndKo:
        '양팔이 넓은 원형 궤적(elbow 110,138, farElbow 96,84)으로 스윕하며 접혀 들어오는 두 정강이(hand 168,104)를 다시 감쌉니다.',
      invariantAnchorsKo:
        '견갑골 하각(thoracic y:135), 요추(lumbar y:143..144), 꼬리뼈·천골(pelvis y:143)이 전 구간 매트에 고정됩니다.',
      keyJointChangeKo:
        '상지 135° 오버헤드 리치(hand Δ152px) + 하지 45° 사선 신전(ankle Δ83px) + 와이드 암 서클 복귀',
    },
    mobileSummaryBulletsKo: [
      '시작 자세: 상체 컬업 + 양손 정강이/발목 그립 컴팩트 볼 (꼬리뼈 y=143 매트 고정)',
      '중간 정점: 양팔 135° 귀 옆 오버헤드 + 양다리 45° 사선 동시 반대 신전 (늑골 들림 억제)',
      '끝 자세: 와이드 서클 암 스윕(farElbow/elbow 오픈)과 함께 정강이 그립으로 회수',
    ],
  }),
  correction: buildCorrectionFromLedger('core-double-leg-stretch'),
});

export const CORE_ABDOMINAL_DIAGRAM_SPECS: Readonly<
  Record<CoreAbdominalDiagramId, CoreAbdominalDiagramSpec>
> = Object.freeze({
  'core-hundred': HUNDRED_SPEC,
  'core-single-leg-stretch': SINGLE_LEG_STRETCH_SPEC,
  'core-double-leg-stretch': DOUBLE_LEG_STRETCH_SPEC,
});

function cloneAssetWithExerciseId(
  asset: CatalogMovementVisualAsset,
  exerciseId: string,
  apparatusOverride?: 'mat' | 'reformer',
): CatalogMovementVisualAsset {
  if (asset.exerciseId === exerciseId && !apparatusOverride) {
    return asset;
  }
  return Object.freeze({
    ...asset,
    exerciseId,
    ...(apparatusOverride ? { apparatus: apparatusOverride } : {}),
  });
}

const MAPPED_ASSETS_RECORD: Record<string, CatalogMovementVisualAsset> = {};
const MAPPED_CORRECTIONS_RECORD: Record<string, MovementDiagramCorrection> = {};

for (const spec of Object.values(CORE_ABDOMINAL_DIAGRAM_SPECS)) {
  for (const mappedId of spec.mappedExerciseIds) {
    const apparatusOverride =
      mappedId === 'original-mat-hundred-prep'
        ? 'mat'
        : mappedId === 'ex-core-02'
          ? 'reformer'
          : undefined;
    MAPPED_ASSETS_RECORD[mappedId] = cloneAssetWithExerciseId(
      spec.asset,
      mappedId,
      apparatusOverride,
    );
    MAPPED_CORRECTIONS_RECORD[mappedId] = spec.correction;
  }
}

export const CORE_MOVEMENT_VISUAL_ASSETS: Readonly<Record<string, CatalogMovementVisualAsset>> =
  Object.freeze(MAPPED_ASSETS_RECORD);

export const CORE_MOVEMENT_DIAGRAM_CORRECTIONS: Readonly<Record<string, MovementDiagramCorrection>> =
  Object.freeze(MAPPED_CORRECTIONS_RECORD);

const EXERCISE_ID_TO_CORE_DIAGRAM_ID: Readonly<Record<string, CoreAbdominalDiagramId>> =
  Object.freeze({
    'ex-core-01': 'core-hundred',
    'original-mat-hundred-prep': 'core-hundred',
    'core-hundred': 'core-hundred',
    'original-mat-single-leg-stretch': 'core-single-leg-stretch',
    'ex-core-02': 'core-single-leg-stretch',
    'core-single-leg-stretch': 'core-single-leg-stretch',
    'ex-core-03': 'core-double-leg-stretch',
    'original-mat-double-leg-stretch': 'core-double-leg-stretch',
    'core-double-leg-stretch': 'core-double-leg-stretch',
  });

export function resolveCoreAbdominalDiagramId(
  exerciseOrId: string | Pick<PilatesExercise, 'id'>,
): CoreAbdominalDiagramId | null {
  const rawId = typeof exerciseOrId === 'string' ? exerciseOrId : exerciseOrId.id;
  return EXERCISE_ID_TO_CORE_DIAGRAM_ID[rawId] ?? null;
}

export function resolveCoreAbdominalDiagram(
  exerciseOrId: string | Pick<PilatesExercise, 'id'>,
): CoreAbdominalDiagramSpec | null {
  const diagramId = resolveCoreAbdominalDiagramId(exerciseOrId);
  return diagramId ? CORE_ABDOMINAL_DIAGRAM_SPECS[diagramId] : null;
}

export function resolveCoreMovementVisualAsset(
  exerciseOrId: string | Pick<PilatesExercise, 'id'>,
): CatalogMovementVisualAsset | null {
  const rawId = typeof exerciseOrId === 'string' ? exerciseOrId : exerciseOrId.id;
  if (CORE_MOVEMENT_VISUAL_ASSETS[rawId]) {
    return CORE_MOVEMENT_VISUAL_ASSETS[rawId];
  }
  const spec = resolveCoreAbdominalDiagram(rawId);
  return spec ? spec.asset : null;
}

/**
 * Computes the femur scissor split angle (in degrees) between near femur (hip -> knee)
 * and far femur (farHip -> farKnee).
 */
export function computeFemurScissorSplitDeg(joints: RigJointMap): number {
  const nearHip = joints.hip;
  const nearKnee = joints.knee;
  const farHip = joints.farHip ?? joints.hip;
  const farKnee = joints.farKnee ?? joints.knee;

  const v1x = nearKnee.x - nearHip.x;
  const v1y = nearKnee.y - nearHip.y;
  const v2x = farKnee.x - farHip.x;
  const v2y = farKnee.y - farHip.y;

  const len1 = Math.hypot(v1x, v1y);
  const len2 = Math.hypot(v2x, v2y);
  if (len1 === 0 || len2 === 0) return 0;

  const cosTheta = Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / (len1 * len2)));
  return Math.round((Math.acos(cosTheta) * 180) / Math.PI);
}

/**
 * Computes the arm elevation angle relative to horizontal (+x axis) in degrees (0..180),
 * where 0° is reaching toward the feet (+x) and 135° is reaching overhead past the ears (-x, -y).
 */
export function computeShoulderArmElevationDeg(joints: RigJointMap): number {
  const dx = joints.hand.x - joints.shoulder.x;
  const dy = joints.shoulder.y - joints.hand.y;
  return Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
}

/**
 * Computes the leg extension diagonal angle above horizontal (+x axis) from hip to ankle in degrees.
 */
export function computeHipLegExtensionDeg(joints: RigJointMap): number {
  const dx = joints.ankle.x - joints.hip.x;
  const dy = joints.hip.y - joints.ankle.y;
  return Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
}

/**
 * Returns the Track I4 -> Track I7 registry patch containing all Core Abdominal
 * visual assets and source-verified diagram corrections without mutating shared files.
 */
export function getCoreI7RegistryPatch(): CoreI7RegistryPatch {
  const byCoreId: Record<CoreAbdominalDiagramId, CatalogMovementVisualAsset> = {
    'core-hundred': CORE_ABDOMINAL_DIAGRAM_SPECS['core-hundred'].asset,
    'core-single-leg-stretch': CORE_ABDOMINAL_DIAGRAM_SPECS['core-single-leg-stretch'].asset,
    'core-double-leg-stretch': CORE_ABDOMINAL_DIAGRAM_SPECS['core-double-leg-stretch'].asset,
  };

  return Object.freeze({
    assets: CORE_MOVEMENT_VISUAL_ASSETS,
    corrections: CORE_MOVEMENT_DIAGRAM_CORRECTIONS,
    byCatalogExerciseId: CORE_MOVEMENT_VISUAL_ASSETS,
    byCoreId: Object.freeze(byCoreId),
  });
}
