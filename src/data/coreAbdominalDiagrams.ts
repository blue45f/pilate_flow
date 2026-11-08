import sourceLedgerJson from './coreAbdominalSourceLedger.json';
import type {
  CatalogMovementVisualAsset,
  MuscleHighlightSpec,
  PhasePoseSpec,
  Point2D,
  RigJointMap,
  VisualPhaseId,
} from './movementVisualRigCatalog';

export type CoreMovementId =
  | 'core-hundred'
  | 'core-single-leg-stretch'
  | 'core-double-leg-stretch';

export const CORE_MOVEMENT_IDS: readonly CoreMovementId[] = [
  'core-hundred',
  'core-single-leg-stretch',
  'core-double-leg-stretch',
] as const;

export type CoreJointAxisKind =
  | 'thoracic-curl-axis'
  | 'hip-lever-axis'
  | 'lumbar-anti-extension-lock'
  | 'shoulder-pump-axis'
  | 'reciprocal-hip-switch-axis'
  | 'overhead-circle-axis';

export interface CoreJointAxisSpec {
  readonly id: string;
  readonly jointKey: keyof RigJointMap;
  readonly kind: CoreJointAxisKind;
  readonly labelKo: string;
  readonly planeKo: '시상면 (Sagittal)' | '횡단·회전 억제 (Anti-Rotation)' | '다중면 (견관절 원형)';
  readonly pivot: Point2D;
  readonly radiusPx: number;
  readonly startAngleDeg: number;
  readonly endAngleDeg: number;
  readonly nominalAngleText: string;
  readonly biomechanicalRuleKo: string;
}

export type CoreContactPointState =
  | 'anchored-mat'
  | 'scapular-tip-hinge'
  | 'hand-shin-clasp'
  | 'lifted-hover';

export interface CoreContactPointSpec {
  readonly id: string;
  readonly jointKey: keyof RigJointMap;
  readonly state: CoreContactPointState;
  readonly labelKo: string;
  readonly surfaceKo: string;
  readonly point: Point2D;
  readonly verificationRuleKo: string;
}

export interface CoreCalloutLabelSpec {
  readonly id: string;
  readonly textKo: string;
  readonly subtextKo?: string;
  readonly anchorPoint: Point2D;
  readonly labelBoxPoint: Point2D;
  readonly align: 'start' | 'middle' | 'end';
  readonly tone: 'anchor' | 'axis' | 'vector' | 'caution';
}

export interface CoreLegendItemSpec {
  readonly id: string;
  readonly category: 'axis' | 'contact' | 'direction' | 'muscle' | 'ghost';
  readonly symbolKo: string;
  readonly labelKo: string;
  readonly descriptionKo: string;
  readonly colorHex: string;
}

export interface CoreSourceCitationSpec {
  readonly sourceId: string;
  readonly organization: string;
  readonly title: string;
  readonly url: string;
  readonly secondaryUrl?: string;
  readonly licenseOrAccess: string;
  readonly verifiedClaimsKo: readonly string[];
}

export interface CorePhaseDetailSpec {
  readonly phaseId: VisualPhaseId;
  readonly poseSpec: PhasePoseSpec;
  readonly jointAxes: readonly CoreJointAxisSpec[];
  readonly contactPoints: readonly CoreContactPointSpec[];
  readonly calloutLabels: readonly CoreCalloutLabelSpec[];
  readonly specialOverlayKind:
    | 'hundred-tabletop-prep'
    | 'hundred-pump-oscillation'
    | 'hundred-tabletop-return'
    | 'sls-shin-clasp-prep'
    | 'sls-reciprocal-scissors'
    | 'sls-switch-return'
    | 'dls-compact-shin-hug'
    | 'dls-opposing-overhead-reach'
    | 'dls-wide-arm-circle-return';
}

export interface CoreAbdominalDiagramSpec {
  readonly coreId: CoreMovementId;
  readonly primaryExerciseId: string;
  readonly linkedCatalogExerciseIds: readonly string[];
  readonly orderIndex: 1 | 2 | 3;
  readonly nameKo: string;
  readonly nameEn: string;
  readonly seriesBadgeKo: string;
  readonly summaryKo: string;
  readonly biomechanicalFocusKo: string;
  readonly resolvedAuditDefectKo: string;
  readonly phaseDetails: {
    readonly start: CorePhaseDetailSpec;
    readonly middle: CorePhaseDetailSpec;
    readonly end: CorePhaseDetailSpec;
  };
  readonly legendItems: readonly CoreLegendItemSpec[];
  readonly evidenceSources: readonly CoreSourceCitationSpec[];
  readonly governance: {
    readonly anatomicalAccuracyAssumed: false;
    readonly professionalReviewCount: 0;
    readonly exactAssetReady: false;
    readonly containsMedicalDiagnosis: false;
    readonly containsTreatmentEfficacyClaim: false;
    readonly nonMedicalDisclaimerKo: string;
  };
  readonly catalogVisualAsset: CatalogMovementVisualAsset;
}

function pt(x: number, y: number): Point2D {
  const clampedX = Math.round(Math.min(304, Math.max(16, x)));
  const clampedY = Math.round(Math.min(184, Math.max(16, y)));
  return Object.freeze({ x: clampedX, y: clampedY });
}

export const CORE_DIAGRAM_LEGEND_ITEMS: readonly CoreLegendItemSpec[] = Object.freeze([
  {
    id: 'legend-contact-mat',
    category: 'contact',
    symbolKo: '● 이중 링 (초록)',
    labelKo: '매트 고정 접촉점 (요추·천골 임프린트)',
    descriptionKo: '동작 전 구간에서 매트에서 들리거나 꺾이지 않고 바닥 지지력을 유지하는 분절',
    colorHex: '#1f6f54',
  },
  {
    id: 'legend-contact-clasp',
    category: 'contact',
    symbolKo: '◎ 클래스프 링 (앰버)',
    labelKo: '손-정강이/무릎 접촉점 (상·하지 연결 지지)',
    descriptionKo: '싱글·더블 레그 스트레치에서 양손이 당긴 쪽 무릎·정강이·발목 라인을 직접 잡는 접촉점',
    colorHex: '#c86d2d',
  },
  {
    id: 'legend-contact-hinge',
    category: 'contact',
    symbolKo: '◆ 힌지 마커 (청록)',
    labelKo: '견갑골 하각 컬업 경계점',
    descriptionKo: '상부 흉추 굴곡 시 매트에 닿아 있는 마지막 지지 경계(견갑골 하각 팁)',
    colorHex: '#0f766e',
  },
  {
    id: 'legend-axis-arc',
    category: 'axis',
    symbolKo: '⌒ 각도 아크 (네이비)',
    labelKo: '관절축 · 목표 각도 가이드',
    descriptionKo: '고관절 레버 각도(90° 테이블탑 vs 45° 사선 신전), 흉추 컬업 축, 견관절 펌핑/서클 축',
    colorHex: '#1d4ed8',
  },
  {
    id: 'legend-direction-vector',
    category: 'direction',
    symbolKo: '➔ 실선·점선 화살표',
    labelKo: '사지 신전 · 펌핑 · 원형 복귀 방향 벡터',
    descriptionKo: '주동 분절의 이동 궤적(45° 사선 리치, 5박 상하 펌핑, 양방향 반대 신전, 서클 복귀)',
    colorHex: '#b45309',
  },
  {
    id: 'legend-muscle-band',
    category: 'muscle',
    symbolKo: '▬ 반투명 하이라이트 밴드',
    labelKo: '주동근(복직근·복사근) 및 안정화근(복횡근·장요근)',
    descriptionKo: '늑골-골반 연결을 잠그는 심부 코어 안정화 영역과 하지 레버 지지 근육',
    colorHex: '#c86d44',
  },
  {
    id: 'legend-ghost-pose',
    category: 'ghost',
    symbolKo: '┄ 점선 실루엣',
    labelKo: '시작 자세 고스트 (변위 비교 기준)',
    descriptionKo: '중간·끝 자세에서 요추/골반 고정 대비 사지의 각도·길이 변화를 대조하는 기준 실루엣',
    colorHex: '#64748b',
  },
]);

const PUBLIC_SOURCE_MAP: Readonly<Record<string, CoreSourceCitationSpec>> = Object.freeze(
  Object.fromEntries(
    sourceLedgerJson.publicSources.map((src) => [
      src.sourceId,
      Object.freeze({
        sourceId: src.sourceId,
        organization: src.organization,
        title: src.title,
        url: src.url,
        secondaryUrl: 'secondaryUrl' in src ? src.secondaryUrl : undefined,
        licenseOrAccess: src.licenseOrAccess,
        verifiedClaimsKo: Object.freeze([...src.verifiedClaimsKo]),
      }),
    ]),
  ),
);

function resolveSources(ids: readonly string[]): readonly CoreSourceCitationSpec[] {
  return Object.freeze(
    ids
      .map((id) => PUBLIC_SOURCE_MAP[id])
      .filter((item): item is CoreSourceCitationSpec => Boolean(item)),
  );
}

const COMMON_CORE_MUSCLES: readonly MuscleHighlightSpec[] = Object.freeze([
  {
    muscleGroupId: 'core-transversus',
    labelKo: '심부 코어 · 복횡근 · 골반저근',
    labelEn: 'Transversus Abdominis & Pelvic Floor',
    catalogMuscleMatches: ['코어', '복횡근', '심부 코어'],
    role: 'stabilizer',
    roleLabelKo: '안정화근 (코어·정렬 유지)',
    activePhases: ['start', 'middle', 'end'],
    anchorJoints: ['thoracic', 'lumbar', 'pelvis'],
    reasonKo: '사지 레버가 길어질 때 요추 과신전(들림)을 막고 천골·요추 매트 임프린트를 고정합니다.',
  },
  {
    muscleGroupId: 'rectus-obliques',
    labelKo: '복직근 · 내/외복사근 (상부 흉추 굴곡 유지)',
    labelEn: 'Rectus Abdominis & Obliques',
    catalogMuscleMatches: ['복직근', '복사근', '상복부', '하복부'],
    role: 'primary',
    roleLabelKo: '주동근 (주 타겟)',
    activePhases: ['start', 'middle', 'end'],
    anchorJoints: ['shoulder', 'thoracic', 'lumbar', 'pelvis'],
    reasonKo: '견갑골 하각까지 상체를 컬업한 높이를 유지하고 늑골과 골반 사이 간격을 일정하게 잠급니다.',
  },
  {
    muscleGroupId: 'hip-flexor-iliopsoas',
    labelKo: '장요근 · 대퇴사두근 (하지 레버 지지)',
    labelEn: 'Iliopsoas & Quadriceps',
    catalogMuscleMatches: ['장요근', '고관절 굴곡근', '대퇴사두근'],
    role: 'stabilizer',
    roleLabelKo: '안정화근 (코어·정렬 유지)',
    activePhases: ['start', 'middle', 'end'],
    anchorJoints: ['pelvis', 'hip', 'knee', 'ankle'],
    reasonKo: '테이블탑(90/90) 및 45° 사선 신전 구간에서 다리 무게를 지탱하고 무릎 정렬을 뻗어 줍니다.',
  },
]);

// ============================================================================
// 1. THE HUNDRED (헌드레드 / core-hundred)
// ============================================================================
const hundredStartJoints: RigJointMap = Object.freeze({
  head: pt(62, 98),
  neck: pt(72, 110),
  shoulder: pt(84, 122),
  elbow: pt(118, 128),
  wrist: pt(154, 128),
  hand: pt(170, 128),
  thoracic: pt(102, 136),
  lumbar: pt(126, 145),
  pelvis: pt(152, 144),
  hip: pt(158, 142),
  knee: pt(162, 96),
  ankle: pt(214, 96),
  heel: pt(218, 102),
  toe: pt(228, 92),
  farShoulder: pt(88, 118),
  farElbow: pt(122, 124),
  farWrist: pt(158, 124),
  farHip: pt(154, 138),
  farKnee: pt(158, 90),
  farAnkle: pt(210, 90),
  farToe: pt(224, 86),
});

const hundredMiddleJoints: RigJointMap = Object.freeze({
  head: pt(60, 96),
  neck: pt(70, 108),
  shoulder: pt(82, 120),
  elbow: pt(118, 132),
  wrist: pt(156, 134),
  hand: pt(172, 134),
  thoracic: pt(102, 136),
  lumbar: pt(126, 145),
  pelvis: pt(152, 144),
  hip: pt(158, 142),
  knee: pt(204, 104),
  ankle: pt(248, 68),
  heel: pt(252, 74),
  toe: pt(264, 60),
  farShoulder: pt(86, 116),
  farElbow: pt(122, 126),
  farWrist: pt(160, 128),
  farHip: pt(154, 138),
  farKnee: pt(198, 98),
  farAnkle: pt(242, 62),
  farToe: pt(258, 54),
});

const hundredEndJoints: RigJointMap = Object.freeze({
  head: pt(64, 100),
  neck: pt(74, 112),
  shoulder: pt(86, 124),
  elbow: pt(118, 128),
  wrist: pt(152, 128),
  hand: pt(168, 128),
  thoracic: pt(102, 136),
  lumbar: pt(126, 145),
  pelvis: pt(152, 144),
  hip: pt(158, 142),
  knee: pt(160, 98),
  ankle: pt(210, 98),
  heel: pt(214, 104),
  toe: pt(224, 94),
  farShoulder: pt(90, 120),
  farElbow: pt(122, 124),
  farWrist: pt(156, 124),
  farHip: pt(154, 138),
  farKnee: pt(156, 92),
  farAnkle: pt(206, 92),
  farToe: pt(220, 88),
});

const hundredStartPose: PhasePoseSpec = Object.freeze({
  phaseId: 'start',
  badgeKo: '시작 자세 (준비·정렬)',
  shortTitleKo: '상체 견갑골 하각 컬업 · 90/90 테이블탑 · 수평 암 리치',
  summaryKo:
    '요추와 천골을 매트에 단단히 임프린트한 뒤 두 다리를 90/90 테이블탑으로 들고, 턱 끝을 가볍게 당겨 견갑골 하각까지 컬업하며 양팔을 골반 옆 매트와 평행하게 뻗습니다.',
  breathCueKo: '들숨: 흉곽 측면 확장하며 경추·흉추 분절 컬업 준비',
  joints: hundredStartJoints,
  fixedAnchors: [
    { joint: 'lumbar', surfaceKo: '요추 임프린트 매트 밀착', point: hundredStartJoints.lumbar },
    { joint: 'pelvis', surfaceKo: '천골 매트 중앙 지지', point: hundredStartJoints.pelvis },
    { joint: 'thoracic', surfaceKo: '견갑골 하각 컬업 경계', point: hundredStartJoints.thoracic },
  ],
  movingJoints: ['head', 'neck', 'shoulder', 'wrist', 'hand', 'knee', 'ankle'],
  apparatusState: {
    carriageOffsetPx: 0,
    pedalAngleDeg: 0,
    springTensionLevel: 'none',
    supportSurfaceKo: '필라테스 매트 (앙와위 코어 안정)',
    propPositionKo: '양팔 골반 옆 5~8cm 부유 · 양다리 90/90 테이블탑',
  },
  alignments: [
    {
      id: 'hundred-start-lumbar-anchor',
      labelKo: '요추·천골 매트 고정선',
      cueKo: '갈비뼈 아래부터 골반까지 매트에 밀착해 허리 들림을 차단합니다.',
      kind: 'anchor-lock',
      from: pt(98, 146),
      to: pt(164, 146),
      cautionKo: '목에 힘을 주어 턱을 들거나 허리가 매트에서 뜨지 않도록 주의하세요.',
    },
    {
      id: 'hundred-start-tabletop-angle',
      labelKo: '고관절·슬관절 90° 테이블탑',
      cueKo: '고관절 수직 위 무릎, 정강이는 바닥과 평행(90°)을 유지합니다.',
      kind: 'angle-arc',
      from: hundredStartJoints.hip,
      to: hundredStartJoints.ankle,
      targetAngleDeg: 90,
      cautionKo: '무릎이 가슴 쪽으로 과도하게 넘어오면 하복부 긴장이 풀립니다.',
    },
  ],
  directionVectors: [
    {
      id: 'hundred-start-curl-vec',
      labelKo: '흉추 컬업 · 손끝 전방 리치',
      kind: 'spine-articulation',
      points: [pt(66, 114), pt(84, 118), pt(168, 128)],
      phaseScope: 'start',
    },
  ],
});

const hundredMiddlePose: PhasePoseSpec = Object.freeze({
  phaseId: 'middle',
  badgeKo: '중간 자세 (최대 가동·정점)',
  shortTitleKo: '양다리 45° 사선 신전 유지 · 상지 5박 들숨/5박 날숨 상하 펌핑',
  summaryKo:
    '상체 컬업 높이와 요추 임프린트를 그대로 잠근 채 두 다리를 45° 사선으로 길게 뻗고, 어깨 관절을 축으로 양팔을 골반 옆에서 작고 강하게 상하 펌핑(5박 들숨·5박 날숨 × 10세트)합니다.',
  breathCueKo: '5박 스타카토 들숨(In-2-3-4-5) · 5박 날숨(Out-2-3-4-5) 펌핑',
  joints: hundredMiddleJoints,
  fixedAnchors: [
    { joint: 'lumbar', surfaceKo: '요추 매트 밀착 고정 (아치 방지)', point: hundredMiddleJoints.lumbar },
    { joint: 'pelvis', surfaceKo: '천골 매트 수평 고정', point: hundredMiddleJoints.pelvis },
    { joint: 'thoracic', surfaceKo: '견갑골 하각 컬업 높이 유지', point: hundredMiddleJoints.thoracic },
  ],
  movingJoints: ['shoulder', 'elbow', 'wrist', 'hand', 'hip', 'knee', 'ankle', 'toe'],
  apparatusState: {
    carriageOffsetPx: 0,
    pedalAngleDeg: 45,
    springTensionLevel: 'none',
    supportSurfaceKo: '필라테스 매트 (요추·천골 고정 + 45° 하지 레버)',
    propPositionKo: '양팔 골반 옆 10~15cm 진폭 상하 펌핑 · 내전근 밀착',
  },
  alignments: [
    {
      id: 'hundred-middle-leg-diagonal',
      labelKo: '양다리 45° 사선 신전 레버 축',
      cueKo: '허리가 뜨지 않는 범위(표준 45° 사선)에서 허벅지 안쪽을 붙여 발끝까지 뻗습니다.',
      kind: 'axis-line',
      from: hundredMiddleJoints.hip,
      to: hundredMiddleJoints.toe,
      targetAngleDeg: 45,
      cautionKo: '다리 각도를 너무 낮춰 요추가 매트에서 떨어지면 즉시 각도를 높이세요.',
    },
    {
      id: 'hundred-middle-lumbar-lock',
      labelKo: '흉곽-골반 항신전(Anti-Extension) 고정',
      cueKo: '팔 펌핑 진동에도 몸통과 골반이 흔들리지 않게 복횡근을 조입니다.',
      kind: 'anchor-lock',
      from: pt(98, 146),
      to: pt(164, 146),
      cautionKo: '손목만 까딱이지 말고 어깨(견관절)에서부터 팔 전체를 단단히 펌핑하세요.',
    },
  ],
  directionVectors: [
    {
      id: 'hundred-middle-leg-reach',
      labelKo: '양다리 45° 사선 원심 리치',
      kind: 'limb-excursion',
      points: [hundredStartJoints.ankle, pt(232, 82), hundredMiddleJoints.toe],
      phaseScope: 'start-to-middle',
    },
    {
      id: 'hundred-middle-arm-pump',
      labelKo: '견관절 축 상하 펌핑 (5박 들숨 / 5박 날숨)',
      kind: 'axial-lengthening',
      points: [pt(172, 120), pt(172, 140), pt(172, 124)],
      phaseScope: 'middle',
    },
  ],
});

const hundredEndPose: PhasePoseSpec = Object.freeze({
  phaseId: 'end',
  badgeKo: '끝 자세 (제어 복귀·마무리)',
  shortTitleKo: '상체 컬업 유지한 채 90/90 테이블탑 회수 후 순차 하강',
  summaryKo:
    '100회 펌핑 완료 후 양팔 펌핑을 멈추어 골반 옆에서 길게 정지하고, 복부 납작함을 유지한 채 무릎을 먼저 90/90 테이블탑으로 접어 회수한 뒤 상체와 발을 순서대로 내려놓습니다.',
  breathCueKo: '날숨: 복부 스쿱 유지하며 무릎을 테이블탑으로 제어 복귀',
  joints: hundredEndJoints,
  fixedAnchors: [
    { joint: 'lumbar', surfaceKo: '요추 매트 밀착 유지', point: hundredEndJoints.lumbar },
    { joint: 'pelvis', surfaceKo: '천골 매트 고정', point: hundredEndJoints.pelvis },
    { joint: 'thoracic', surfaceKo: '견갑골 하각 지지', point: hundredEndJoints.thoracic },
  ],
  movingJoints: ['knee', 'ankle', 'toe', 'wrist', 'hand'],
  apparatusState: {
    carriageOffsetPx: 0,
    pedalAngleDeg: 0,
    springTensionLevel: 'none',
    supportSurfaceKo: '필라테스 매트 (코어 제어 복귀)',
    propPositionKo: '무릎 90/90 테이블탑 선회수 후 상체 롤다운',
  },
  alignments: [
    {
      id: 'hundred-end-tabletop-return',
      labelKo: '고관절·슬관절 90° 제어 회수 정렬',
      cueKo: '다리를 접어 돌아올 때도 골반이 흔들리지 않도록 하복부 긴장을 유지합니다.',
      kind: 'angle-arc',
      from: hundredEndJoints.hip,
      to: hundredEndJoints.ankle,
      targetAngleDeg: 90,
      cautionKo: '다리를 툭 떨어뜨리거나 복부 긴장을 먼저 풀지 마세요.',
    },
  ],
  directionVectors: [
    {
      id: 'hundred-end-knee-fold',
      labelKo: '45° 사선 -> 테이블탑 제어 회수',
      kind: 'return-control',
      points: [hundredMiddleJoints.ankle, pt(230, 84), hundredEndJoints.ankle],
      phaseScope: 'middle-to-end',
    },
  ],
});

const HUNDRED_SPEC: CoreAbdominalDiagramSpec = Object.freeze({
  coreId: 'core-hundred',
  primaryExerciseId: 'ex-core-01',
  linkedCatalogExerciseIds: ['ex-core-01', 'core-hundred', 'mat-hundred'],
  orderIndex: 1,
  nameKo: '헌드레드',
  nameEn: 'The Hundred',
  seriesBadgeKo: 'Core Stability #1 · 백회 호흡 펌핑 & 하지 레버 안정화',
  summaryKo:
    '견갑골 하각까지 상체를 컬업하고 요추·천골을 매트에 밀착한 상태에서, 양다리를 45° 사선으로 뻗어 유지하며 양팔을 골반 옆에서 5박 들숨·5박 날숨 리듬으로 100회 펌핑하는 대표적인 필라테스 코어 안정 동작입니다.',
  biomechanicalFocusKo:
    '긴 하지 레버(45° 사선)가 만드는 고관절 신전 모멘트와 상지 펌핑의 동적 진동에 맞서 복횡근·복직근이 흉곽-골반 간격과 요추 임프린트를 등척성으로 지켜냅니다.',
  resolvedAuditDefectKo:
    '공용 아키타입에서 싱글/더블 레그 스트레치와 섞여 있던 도해를 분리하여, 양다리 동시 45° 사선 신전 레버와 골반 옆 수평 팔의 상하 펌핑 진동 궤적(5박 들숨/5박 날숨)을 명확히 표현했습니다.',
  phaseDetails: {
    start: {
      phaseId: 'start',
      poseSpec: hundredStartPose,
      specialOverlayKind: 'hundred-tabletop-prep',
      jointAxes: [
        {
          id: 'hundred-start-axis-thoracic',
          jointKey: 'thoracic',
          kind: 'thoracic-curl-axis',
          labelKo: '흉추 컬업 축 (견갑 하각 35°)',
          planeKo: '시상면 (Sagittal)',
          pivot: hundredStartJoints.thoracic,
          radiusPx: 22,
          startAngleDeg: 180,
          endAngleDeg: 218,
          nominalAngleText: '컬업 35°',
          biomechanicalRuleKo: '경추 과굴곡 없이 흉골을 부드럽게 말아 견갑골 하각 팁을 매트 지지점으로 삼습니다.',
        },
        {
          id: 'hundred-start-axis-hip',
          jointKey: 'hip',
          kind: 'hip-lever-axis',
          labelKo: '고관절·무릎 90/90 테이블탑 축',
          planeKo: '시상면 (Sagittal)',
          pivot: hundredStartJoints.hip,
          radiusPx: 24,
          startAngleDeg: -90,
          endAngleDeg: 0,
          nominalAngleText: '90° 테이블탑',
          biomechanicalRuleKo: '고관절 바로 위에 무릎을 정렬하고 정강이를 매트와 평행하게 세팅합니다.',
        },
      ],
      contactPoints: [
        {
          id: 'hundred-start-cp-lumbar',
          jointKey: 'lumbar',
          state: 'anchored-mat',
          labelKo: '요추 매트 임프린트',
          surfaceKo: '매트 중앙 (L1–L5 밀착)',
          point: hundredStartJoints.lumbar,
          verificationRuleKo: '테이블탑 거상 시 요추가 매트에서 들리지 않도록 복횡근으로 눌러 지지',
        },
        {
          id: 'hundred-start-cp-pelvis',
          jointKey: 'pelvis',
          state: 'anchored-mat',
          labelKo: '천골 수평 지지점',
          surfaceKo: '매트 지지면 (천골 중앙)',
          point: hundredStartJoints.pelvis,
          verificationRuleKo: '골반 전방경사 없이 천골 바닥면이 매트에 수평 안착',
        },
        {
          id: 'hundred-start-cp-scapula',
          jointKey: 'thoracic',
          state: 'scapular-tip-hinge',
          labelKo: '견갑골 하각 힌지',
          surfaceKo: '매트 상단 접촉 경계',
          point: hundredStartJoints.thoracic,
          verificationRuleKo: '어깨와 머리는 부유하고 견갑골 하각 끝점이 매트 접촉 경계를 형성',
        },
        {
          id: 'hundred-start-cp-hand',
          jointKey: 'hand',
          state: 'lifted-hover',
          labelKo: '양팔 수평 부유 리치',
          surfaceKo: '골반 옆 6cm 공중',
          point: hundredStartJoints.hand,
          verificationRuleKo: '양손은 바닥을 짚지 않고 골반 옆 공중에서 손끝까지 길게 뻗어 준비',
        },
      ],
      calloutLabels: [
        {
          id: 'hundred-start-lbl-curl',
          textKo: '흉추 컬업 (견갑 하각 지지)',
          subtextKo: '턱 끝 가벼운 끄덕임',
          anchorPoint: hundredStartJoints.shoulder,
          labelBoxPoint: pt(24, 52),
          align: 'start',
          tone: 'axis',
        },
        {
          id: 'hundred-start-lbl-tabletop',
          textKo: '90/90 테이블탑 정렬',
          subtextKo: '고관절·무릎 직각',
          anchorPoint: hundredStartJoints.knee,
          labelBoxPoint: pt(168, 44),
          align: 'start',
          tone: 'vector',
        },
        {
          id: 'hundred-start-lbl-imprint',
          textKo: '요추·천골 매트 밀착 고정',
          anchorPoint: hundredStartJoints.lumbar,
          labelBoxPoint: pt(88, 174),
          align: 'start',
          tone: 'anchor',
        },
      ],
    },
    middle: {
      phaseId: 'middle',
      poseSpec: hundredMiddlePose,
      specialOverlayKind: 'hundred-pump-oscillation',
      jointAxes: [
        {
          id: 'hundred-mid-axis-hip',
          jointKey: 'hip',
          kind: 'hip-lever-axis',
          labelKo: '고관절 45° 사선 신전 레버 축',
          planeKo: '시상면 (Sagittal)',
          pivot: hundredMiddleJoints.hip,
          radiusPx: 28,
          startAngleDeg: -45,
          endAngleDeg: 0,
          nominalAngleText: '45° 사선 레버',
          biomechanicalRuleKo: '요추 임프린트가 유지되는 45° 사선 각도로 양다리를 함께 뻗어 내전근으로 밀착합니다.',
        },
        {
          id: 'hundred-mid-axis-shoulder',
          jointKey: 'shoulder',
          kind: 'shoulder-pump-axis',
          labelKo: '견관절 상하 펌핑 축 (±8° 진폭)',
          planeKo: '시상면 (Sagittal)',
          pivot: hundredMiddleJoints.shoulder,
          radiusPx: 20,
          startAngleDeg: -8,
          endAngleDeg: 14,
          nominalAngleText: '펌핑 진폭 12cm',
          biomechanicalRuleKo: '팔꿈치와 손목을 편 채 광배근·전거근 연결로 어깨 관절에서 상하 펌핑을 수행합니다.',
        },
        {
          id: 'hundred-mid-axis-lumbar',
          jointKey: 'lumbar',
          kind: 'lumbar-anti-extension-lock',
          labelKo: '요추 항신전 잠금 축 (0° 들림)',
          planeKo: '시상면 (Sagittal)',
          pivot: hundredMiddleJoints.lumbar,
          radiusPx: 16,
          startAngleDeg: 175,
          endAngleDeg: 185,
          nominalAngleText: '임프린트 고정',
          biomechanicalRuleKo: '다리 신전과 팔 펌핑 중에도 늑골-골반 간격과 요추 매트 압력을 일정하게 유지합니다.',
        },
      ],
      contactPoints: [
        {
          id: 'hundred-mid-cp-lumbar',
          jointKey: 'lumbar',
          state: 'anchored-mat',
          labelKo: '요추 항신전 매트 앵커',
          surfaceKo: '매트 중앙 (허리 들림 0mm)',
          point: hundredMiddleJoints.lumbar,
          verificationRuleKo: '45° 하지 레버 부하에서도 요추가 매트에 완전히 밀착 유지',
        },
        {
          id: 'hundred-mid-cp-pelvis',
          jointKey: 'pelvis',
          state: 'anchored-mat',
          labelKo: '천골 고정 앵커',
          surfaceKo: '매트 중앙 지지',
          point: hundredMiddleJoints.pelvis,
          verificationRuleKo: '상지 펌핑 진동에 흔들리지 않는 골반 중심 지지',
        },
        {
          id: 'hundred-mid-cp-scapula',
          jointKey: 'thoracic',
          state: 'scapular-tip-hinge',
          labelKo: '견갑골 하각 컬업 경계',
          surfaceKo: '매트 상단 힌지',
          point: hundredMiddleJoints.thoracic,
          verificationRuleKo: '컬업 높이가 내려가지 않고 견갑골 하각 팁에서 일정하게 유지',
        },
        {
          id: 'hundred-mid-cp-hand',
          jointKey: 'hand',
          state: 'lifted-hover',
          labelKo: '골반 옆 상하 펌핑 손끝',
          surfaceKo: '골반 옆 공중 펌핑 구간',
          point: hundredMiddleJoints.hand,
          verificationRuleKo: '무릎을 잡지 않고 골반 옆 수평선 위아래로 5박 들숨/5박 날숨 왕복 펌핑',
        },
      ],
      calloutLabels: [
        {
          id: 'hundred-mid-lbl-legs',
          textKo: '양다리 45° 사선 신전 레버',
          subtextKo: '내전근 밀착 · 무릎 완전 신전',
          anchorPoint: hundredMiddleJoints.ankle,
          labelBoxPoint: pt(168, 34),
          align: 'start',
          tone: 'vector',
        },
        {
          id: 'hundred-mid-lbl-pump',
          textKo: '상지 상하 펌핑 (5박 들숨/5박 날숨)',
          subtextKo: '견관절 축 왕복 진동',
          anchorPoint: hundredMiddleJoints.hand,
          labelBoxPoint: pt(178, 168),
          align: 'start',
          tone: 'axis',
        },
        {
          id: 'hundred-mid-lbl-anchor',
          textKo: '요추·천골 고정 (아치 금지)',
          anchorPoint: hundredMiddleJoints.lumbar,
          labelBoxPoint: pt(24, 174),
          align: 'start',
          tone: 'anchor',
        },
      ],
    },
    end: {
      phaseId: 'end',
      poseSpec: hundredEndPose,
      specialOverlayKind: 'hundred-tabletop-return',
      jointAxes: [
        {
          id: 'hundred-end-axis-hip',
          jointKey: 'hip',
          kind: 'hip-lever-axis',
          labelKo: '고관절·무릎 90° 제어 복귀 축',
          planeKo: '시상면 (Sagittal)',
          pivot: hundredEndJoints.hip,
          radiusPx: 24,
          startAngleDeg: -90,
          endAngleDeg: -45,
          nominalAngleText: '45°→90° 회수',
          biomechanicalRuleKo: '복부 납작함을 유지하며 무릎을 먼저 90/90 테이블탑으로 접어 요추 부하를 줄입니다.',
        },
      ],
      contactPoints: [
        {
          id: 'hundred-end-cp-lumbar',
          jointKey: 'lumbar',
          state: 'anchored-mat',
          labelKo: '요추 매트 밀착 유지',
          surfaceKo: '매트 중앙',
          point: hundredEndJoints.lumbar,
          verificationRuleKo: '무릎 회수 순간에도 허리가 뜨거나 골반이 흔들리지 않음',
        },
        {
          id: 'hundred-end-cp-pelvis',
          jointKey: 'pelvis',
          state: 'anchored-mat',
          labelKo: '천골 매트 고정',
          surfaceKo: '매트 중앙',
          point: hundredEndJoints.pelvis,
          verificationRuleKo: '천골 중립 안착 유지',
        },
        {
          id: 'hundred-end-cp-scapula',
          jointKey: 'thoracic',
          state: 'scapular-tip-hinge',
          labelKo: '견갑골 하각 지지 후 롤다운 준비',
          surfaceKo: '매트 상단 경계',
          point: hundredEndJoints.thoracic,
          verificationRuleKo: '다리 회수 완료 후 상체를 분절 하강하도록 순서 제어',
        },
      ],
      calloutLabels: [
        {
          id: 'hundred-end-lbl-return',
          textKo: '테이블탑 제어 회수 (45°→90°)',
          subtextKo: '코어 스쿱 유지하며 무릎 굴곡',
          anchorPoint: hundredEndJoints.knee,
          labelBoxPoint: pt(154, 42),
          align: 'start',
          tone: 'vector',
        },
        {
          id: 'hundred-end-lbl-arm-stop',
          textKo: '펌핑 정지 · 수평 정렬 유지',
          anchorPoint: hundredEndJoints.hand,
          labelBoxPoint: pt(176, 168),
          align: 'start',
          tone: 'axis',
        },
        {
          id: 'hundred-end-lbl-lumbar',
          textKo: '요추·천골 지지 고정',
          anchorPoint: hundredEndJoints.lumbar,
          labelBoxPoint: pt(26, 174),
          align: 'start',
          tone: 'anchor',
        },
      ],
    },
  },
  legendItems: CORE_DIAGRAM_LEGEND_ITEMS,
  evidenceSources: resolveSources(
    sourceLedgerJson.movements['core-hundred'].primarySourceIds,
  ),
  governance: {
    anatomicalAccuracyAssumed: false,
    professionalReviewCount: 0,
    exactAssetReady: false,
    containsMedicalDiagnosis: false,
    containsTreatmentEfficacyClaim: false,
    nonMedicalDisclaimerKo: sourceLedgerJson.governance.nonMedicalDisclaimerKo,
  },
  catalogVisualAsset: {
    exerciseId: 'ex-core-01',
    nameKo: '헌드레드 (The Hundred)',
    nameEn: 'The Hundred (Abdominal Stability)',
    apparatus: 'mat',
    bodyPosition: 'supine',
    blockCategory: 'core_abdominal',
    spinalPlanes: ['flexion'],
    isUnilateral: false,
    archetypeId: 'core-hundred-2d-v1',
    archetypeTitleKo: '헌드레드 전용 2D 도해 (45° 양다리 신전 & 상지 펌핑)',
    staticGuideSvgPath: '/movement-guides/archetypes/supine-leg-stretch-hundred.svg',
    productionMethod: 'free-authored-kinematic-svg-v1',
    rightsStatus: 'original-app-authored-free-license',
    licenseLabelKo: '자체 제작 무료 2D 키네마틱 SVG (I4 코어 전용)',
    anatomicalAccuracyAssumed: false,
    phases: {
      start: hundredStartPose,
      middle: hundredMiddlePose,
      end: hundredEndPose,
    },
    primaryMuscles: COMMON_CORE_MUSCLES,
    poseDeltaSummary: {
      startToMiddleKo:
        '요추·천골 매트 밀착과 상체 컬업 높이를 고정한 채, 양다리를 90/90 테이블탑에서 45° 사선으로 뻗고 양팔을 골반 옆에서 5박 들숨/5박 날숨 상하 펌핑합니다.',
      middleToEndKo:
        '100회 호흡 펌핑 후 양팔을 수평 정지하고, 복부 긴장을 풀지 않은 채 양 무릎을 90/90 테이블탑으로 먼저 접어 회수합니다.',
      invariantAnchorsKo: '요추(lumbar)·천골(pelvis) 매트 임프린트 및 견갑골 하각(thoracic) 컬업 경계 고정',
      keyJointChangeKo: '양측 무릎·발목이 테이블탑(90°) ↔ 45° 사선(248,68)으로 신전·회수되며 팔은 골반 옆 수평선에서 왕복 펌핑',
    },
    mobileSummaryBulletsKo: [
      '요추·천골 매트 임프린트 & 견갑골 하각 컬업 고정',
      '양다리 45° 사선 신전 유지 + 골반 옆 팔 5박 들숨/5박 날숨 펌핑',
      '100회 완료 후 무릎을 먼저 90/90 테이블탑으로 제어 회수',
    ],
  },
});

// ============================================================================
// 2. SINGLE LEG STRETCH (싱글 레그 스트레치 / core-single-leg-stretch)
// ============================================================================
const slsStartJoints: RigJointMap = Object.freeze({
  head: pt(62, 98),
  neck: pt(72, 110),
  shoulder: pt(84, 122),
  elbow: pt(114, 108),
  wrist: pt(148, 96),
  hand: pt(164, 98),
  thoracic: pt(102, 136),
  lumbar: pt(126, 145),
  pelvis: pt(152, 144),
  hip: pt(158, 142),
  knee: pt(142, 90),
  ankle: pt(184, 100),
  heel: pt(186, 106),
  toe: pt(198, 98),
  farShoulder: pt(88, 118),
  farElbow: pt(116, 102),
  farWrist: pt(142, 90),
  farHip: pt(154, 138),
  farKnee: pt(176, 96),
  farAnkle: pt(222, 88),
  farToe: pt(236, 82),
});

const slsMiddleJoints: RigJointMap = Object.freeze({
  head: pt(60, 96),
  neck: pt(70, 108),
  shoulder: pt(82, 120),
  elbow: pt(110, 104),
  wrist: pt(138, 90),
  hand: pt(164, 98),
  thoracic: pt(102, 136),
  lumbar: pt(126, 145),
  pelvis: pt(152, 144),
  hip: pt(158, 142),
  knee: pt(134, 86),
  ankle: pt(174, 100),
  heel: pt(176, 106),
  toe: pt(188, 98),
  farShoulder: pt(86, 116),
  farElbow: pt(112, 98),
  farWrist: pt(134, 86),
  farHip: pt(154, 138),
  farKnee: pt(204, 102),
  farAnkle: pt(252, 68),
  farToe: pt(268, 60),
});

const slsEndJoints: RigJointMap = Object.freeze({
  head: pt(62, 98),
  neck: pt(72, 110),
  shoulder: pt(84, 122),
  elbow: pt(112, 104),
  wrist: pt(144, 92),
  hand: pt(164, 96),
  thoracic: pt(102, 136),
  lumbar: pt(126, 145),
  pelvis: pt(152, 144),
  hip: pt(158, 142),
  knee: pt(170, 96),
  ankle: pt(216, 88),
  heel: pt(220, 94),
  toe: pt(232, 82),
  farShoulder: pt(88, 118),
  farElbow: pt(114, 98),
  farWrist: pt(140, 88),
  farHip: pt(154, 138),
  farKnee: pt(138, 86),
  farAnkle: pt(178, 98),
  farToe: pt(192, 96),
});

const slsStartPose: PhasePoseSpec = Object.freeze({
  phaseId: 'start',
  badgeKo: '시작 자세 (준비·정렬)',
  shortTitleKo: '상체 컬업 · 한쪽 무릎 가슴 당김 및 양손 정강이/무릎 가이드 세팅',
  summaryKo:
    '요추와 천골을 매트에 밀착하고 견갑골 하각까지 상체를 컬업한 상태에서, 한쪽 무릎을 가슴 쪽으로 당겨 양손으로 정강이(바깥 손은 발목 쪽, 안쪽 손은 무릎 쪽)를 잡아 정렬을 가이드합니다.',
  breathCueKo: '들숨: 코어 고정 및 당긴 쪽 정강이 양손 접촉 세팅',
  joints: slsStartJoints,
  fixedAnchors: [
    { joint: 'lumbar', surfaceKo: '요추 매트 임프린트 고정', point: slsStartJoints.lumbar },
    { joint: 'pelvis', surfaceKo: '골반 좌우 수평 고정 (회전 억제)', point: slsStartJoints.pelvis },
    { joint: 'hand', surfaceKo: '당긴 다리 정강이/발목 지지 접촉', point: slsStartJoints.hand },
  ],
  movingJoints: ['elbow', 'wrist', 'hand', 'knee', 'ankle', 'farKnee', 'farAnkle'],
  apparatusState: {
    carriageOffsetPx: 0,
    pedalAngleDeg: 0,
    springTensionLevel: 'none',
    supportSurfaceKo: '필라테스 매트 (단측 하지 교차 안정화)',
    propPositionKo: '양손이 당긴 쪽 무릎·정강이 라인을 직접 지지 (바닥 펌핑 아님)',
  },
  alignments: [
    {
      id: 'sls-start-hand-shin-contact',
      labelKo: '양손-정강이 가이드 접촉 축',
      cueKo: '안쪽 손은 무릎, 바깥쪽 손은 발목 근처 정강이를 잡아 다리가 중심선에서 벗어나지 않게 안내합니다.',
      kind: 'axis-line',
      from: slsStartJoints.knee,
      to: slsStartJoints.ankle,
      cautionKo: '팔로 무릎을 과도하게 짓눌러 골반이 말려 올라오지 않도록 주의하세요.',
    },
    {
      id: 'sls-start-pelvis-lock',
      labelKo: '골반·요추 항회전 매트 고정',
      cueKo: '한쪽 다리를 당길 때도 좌우 골반 무게를 동일하게 매트에 유지합니다.',
      kind: 'anchor-lock',
      from: pt(98, 146),
      to: pt(164, 146),
      cautionKo: '당기는 쪽 골반이 따라 올라가며 허리가 비틀리지 않게 복횡근으로 고정하세요.',
    },
  ],
  directionVectors: [
    {
      id: 'sls-start-pull-vec',
      labelKo: '당긴 무릎 가슴 방향 설정 & 양손 정강이 클램프',
      kind: 'limb-excursion',
      points: [pt(162, 98), slsStartJoints.knee],
      phaseScope: 'start',
    },
  ],
});

const slsMiddlePose: PhasePoseSpec = Object.freeze({
  phaseId: 'middle',
  badgeKo: '중간 자세 (최대 가동·정점)',
  shortTitleKo: '당긴 정강이 양손 지지 + 반대쪽 다리 45° 사선 완전 신전',
  summaryKo:
    '양손으로 당긴 쪽 무릎과 정강이를 안정적으로 지지해 가슴 쪽으로 깊게 당기는 동시에, 반대쪽 다리(farLeg)를 45° 사선 전방으로 길게 뻗어 양방향 가위 교차(Reciprocal Stretch) 정점을 만듭니다.',
  breathCueKo: '날숨: 반대쪽 다리 45° 사선 리치하며 복부 납작하게 조이기',
  joints: slsMiddleJoints,
  fixedAnchors: [
    { joint: 'lumbar', surfaceKo: '요추 매트 밀착 (비대칭 부하 방어)', point: slsMiddleJoints.lumbar },
    { joint: 'pelvis', surfaceKo: '천골 좌우 수평 고정 (골반 흔들림 0°)', point: slsMiddleJoints.pelvis },
    { joint: 'hand', surfaceKo: '당긴 쪽 정강이·발목 양손 접촉 지지', point: slsMiddleJoints.hand },
  ],
  movingJoints: ['knee', 'ankle', 'farKnee', 'farAnkle', 'farToe', 'wrist', 'hand'],
  apparatusState: {
    carriageOffsetPx: 0,
    pedalAngleDeg: 45,
    springTensionLevel: 'none',
    supportSurfaceKo: '필라테스 매트 (비대칭 가위 교차 코어 안정)',
    propPositionKo: '당긴 다리 정강이 양손 접촉 + 반대 다리 45° 사선 신전',
  },
  alignments: [
    {
      id: 'sls-middle-extended-diagonal',
      labelKo: '신전측 다리 45° 사선 리치 축',
      cueKo: '뻗는 다리는 고관절부터 발끝까지 일직선 45° 사선으로 길게 뻗어 냅니다.',
      kind: 'axis-line',
      from: slsMiddleJoints.farHip ?? slsMiddleJoints.hip,
      to: slsMiddleJoints.farToe ?? slsMiddleJoints.toe,
      targetAngleDeg: 45,
      cautionKo: '뻗은 다리가 바닥으로 떨어지며 허리가 뜨지 않도록 사선 높이를 지키세요.',
    },
    {
      id: 'sls-middle-shin-clasp-guide',
      labelKo: '굴곡측 무릎·정강이 양손 접촉 지지선',
      cueKo: '양손이 당긴 정강이 위에 밀착하여 고관절 굴곡 궤적을 곧게 유지합니다.',
      kind: 'anchor-lock',
      from: slsMiddleJoints.knee,
      to: slsMiddleJoints.hand,
      cautionKo: '어깨가 귀 쪽으로 으쓱 올라가지 않게 팔꿈치를 넓게 유지하세요.',
    },
  ],
  directionVectors: [
    {
      id: 'sls-middle-far-leg-reach',
      labelKo: '반대쪽 다리 45° 사선 신전 벡터',
      kind: 'limb-excursion',
      points: [
        slsStartJoints.farAnkle ?? pt(222, 88),
        pt(238, 78),
        slsMiddleJoints.farToe ?? pt(268, 60),
      ],
      phaseScope: 'start-to-middle',
    },
    {
      id: 'sls-middle-near-knee-pull',
      labelKo: '당긴 무릎 가슴 방향 견인 & 정강이 그립',
      kind: 'axial-lengthening',
      points: [pt(154, 94), slsMiddleJoints.knee],
      phaseScope: 'middle',
    },
  ],
});

const slsEndPose: PhasePoseSpec = Object.freeze({
  phaseId: 'end',
  badgeKo: '끝 자세 (제어 복귀·마무리)',
  shortTitleKo: '상체·골반 고정 유지한 채 좌우 다리 교대 스위치 및 그립 전환',
  summaryKo:
    '상체 컬업 높이와 골반 수평을 조금도 흔들지 않고 두 다리가 공중 중심선에서 스치듯 교차하며, 새로 당겨오는 쪽 정강이로 양손 그립을 부드럽게 옮겨 잡고 제어 복귀합니다.',
  breathCueKo: '들숨 교차 스위치 · 날숨 반대쪽 신전 (또는 테이블탑 정렬 복귀)',
  joints: slsEndJoints,
  fixedAnchors: [
    { joint: 'lumbar', surfaceKo: '요추 임프린트 고정', point: slsEndJoints.lumbar },
    { joint: 'pelvis', surfaceKo: '천골 수평 고정 (좌우 롤링 방지)', point: slsEndJoints.pelvis },
    { joint: 'hand', surfaceKo: '교대된 당긴 정강이 양손 지지', point: slsEndJoints.hand },
  ],
  movingJoints: ['knee', 'ankle', 'farKnee', 'farAnkle', 'wrist', 'hand'],
  apparatusState: {
    carriageOffsetPx: 0,
    pedalAngleDeg: 0,
    springTensionLevel: 'none',
    supportSurfaceKo: '필라테스 매트 (좌우 교대 제어)',
    propPositionKo: '양손이 교대된 굴곡 다리 정강이로 이동 지지',
  },
  alignments: [
    {
      id: 'sls-end-reciprocal-switch',
      labelKo: '좌우 다리 공중 교차 스위치 정렬',
      cueKo: '두 무릎과 발목이 몸통 중심선(시상면)을 따라 일직선으로 교차합니다.',
      kind: 'axis-line',
      from: slsEndJoints.farKnee ?? slsEndJoints.knee,
      to: slsEndJoints.toe,
      cautionKo: '다리를 교차할 때 상체가 좌우로 기우뚱거리지 않게 복사근으로 잡으세요.',
    },
  ],
  directionVectors: [
    {
      id: 'sls-end-switch-vec',
      labelKo: '좌우 다리 교대 회수 & 정강이 그립 전환',
      kind: 'return-control',
      points: [slsMiddleJoints.farAnkle ?? pt(252, 68), pt(210, 82), slsEndJoints.farAnkle ?? pt(178, 98)],
      phaseScope: 'middle-to-end',
    },
  ],
});

const SINGLE_LEG_STRETCH_SPEC: CoreAbdominalDiagramSpec = Object.freeze({
  coreId: 'core-single-leg-stretch',
  primaryExerciseId: 'original-mat-single-leg-stretch',
  linkedCatalogExerciseIds: ['original-mat-single-leg-stretch', 'core-single-leg-stretch'],
  orderIndex: 2,
  nameKo: '싱글 레그 스트레치',
  nameEn: 'Single Leg Stretch',
  seriesBadgeKo: 'Core Stability #2 · 단측 하지 교차 신전 & 정강이 양손 지지',
  summaryKo:
    '상체 컬업과 요추·천골 매트 밀착을 유지한 상태에서, 한쪽 무릎을 가슴으로 당겨 양손으로 정강이·발목을 지지하고 반대쪽 다리를 45° 사선으로 길게 뻗으며 좌우 교대하는 복부 항회전·안정화 동작입니다.',
  biomechanicalFocusKo:
    '좌우 다리가 서로 반대 방향(한쪽 굴곡 견인 vs 반대쪽 45° 사선 신전)으로 움직일 때 발생하는 시상면·횡단면 비대칭 토크를 내·외복사근과 복횡근이 제어하여 골반 흔들림을 0으로 억제합니다.',
  resolvedAuditDefectKo:
    '기존 공용 아키타입에서 양손이 바닥 근처(158,136 -> 168,128)에서 헌드레드처럼 펌핑하던 오류를 수정하여, 양손(`wrist`/`hand`)이 당긴 쪽 무릎·정강이(`knee`/`ankle`)를 직접 감싸 지지하고 반대쪽 다리(`far*`)가 45° 사선으로 뻗는 실제 싱글 레그 스트레치 도해로 완성했습니다.',
  phaseDetails: {
    start: {
      phaseId: 'start',
      poseSpec: slsStartPose,
      specialOverlayKind: 'sls-shin-clasp-prep',
      jointAxes: [
        {
          id: 'sls-start-axis-hip-flex',
          jointKey: 'hip',
          kind: 'reciprocal-hip-switch-axis',
          labelKo: '굴곡측 고관절 당김 축 (가슴 방향 115°)',
          planeKo: '시상면 (Sagittal)',
          pivot: slsStartJoints.hip,
          radiusPx: 24,
          startAngleDeg: -115,
          endAngleDeg: -60,
          nominalAngleText: '굴곡 115°',
          biomechanicalRuleKo: '천골이 매트에서 말려 올라오지 않는 범위에서 한쪽 무릎을 가슴 쪽으로 당깁니다.',
        },
        {
          id: 'sls-start-axis-thoracic',
          jointKey: 'thoracic',
          kind: 'thoracic-curl-axis',
          labelKo: '흉추 컬업 고정 축 (견갑 하각 지지)',
          planeKo: '시상면 (Sagittal)',
          pivot: slsStartJoints.thoracic,
          radiusPx: 20,
          startAngleDeg: 180,
          endAngleDeg: 218,
          nominalAngleText: '컬업 고정',
          biomechanicalRuleKo: '양팔이 정강이를 잡을 때도 어깨를 끌어내리고 흉추 컬업 높이를 유지합니다.',
        },
      ],
      contactPoints: [
        {
          id: 'sls-start-cp-hand-shin',
          jointKey: 'hand',
          state: 'hand-shin-clasp',
          labelKo: '양손 정강이·발목 접촉 앵커',
          surfaceKo: '당긴 다리 무릎·정강이 전면',
          point: slsStartJoints.hand,
          verificationRuleKo: '양손이 바닥이 아닌 당긴 쪽 무릎(142,90)과 발목(184,100) 사이 정강이를 직접 지지',
        },
        {
          id: 'sls-start-cp-lumbar',
          jointKey: 'lumbar',
          state: 'anchored-mat',
          labelKo: '요추 매트 임프린트',
          surfaceKo: '매트 중앙',
          point: slsStartJoints.lumbar,
          verificationRuleKo: '한쪽 무릎 당김 시 요추 굴곡 과다·들림 없이 일정 압력 유지',
        },
        {
          id: 'sls-start-cp-pelvis',
          jointKey: 'pelvis',
          state: 'anchored-mat',
          labelKo: '천골 항회전 매트 고정',
          surfaceKo: '매트 중앙 (좌우 대칭 압력)',
          point: slsStartJoints.pelvis,
          verificationRuleKo: '단측 다리 준비 시 골반이 좌우로 기울지 않고 수평 유지',
        },
      ],
      calloutLabels: [
        {
          id: 'sls-start-lbl-clasp',
          textKo: '양손 정강이·무릎 직접 지지',
          subtextKo: '안쪽 손 무릎 · 바깥 손 발목',
          anchorPoint: slsStartJoints.hand,
          labelBoxPoint: pt(22, 46),
          align: 'start',
          tone: 'anchor',
        },
        {
          id: 'sls-start-lbl-contra',
          textKo: '반대 다리 교차 신전 준비',
          anchorPoint: slsStartJoints.farAnkle ?? pt(222, 88),
          labelBoxPoint: pt(178, 44),
          align: 'start',
          tone: 'vector',
        },
        {
          id: 'sls-start-lbl-pelvis',
          textKo: '골반·요추 항회전 매트 밀착',
          anchorPoint: slsStartJoints.pelvis,
          labelBoxPoint: pt(76, 174),
          align: 'start',
          tone: 'anchor',
        },
      ],
    },
    middle: {
      phaseId: 'middle',
      poseSpec: slsMiddlePose,
      specialOverlayKind: 'sls-reciprocal-scissors',
      jointAxes: [
        {
          id: 'sls-mid-axis-hip-split',
          jointKey: 'hip',
          kind: 'reciprocal-hip-switch-axis',
          labelKo: '양측 고관절 상반 교차 축 (굴곡 120° vs 신전 45°)',
          planeKo: '시상면 (Sagittal)',
          pivot: slsMiddleJoints.hip,
          radiusPx: 28,
          startAngleDeg: -120,
          endAngleDeg: -42,
          nominalAngleText: '교차 각 78°',
          biomechanicalRuleKo: '당긴 무릎(134,86)과 45° 사선 신전 다리(252,68)가 고관절 축에서 명확한 가위 분리각을 이룹니다.',
        },
        {
          id: 'sls-mid-axis-pelvis-lock',
          jointKey: 'pelvis',
          kind: 'lumbar-anti-extension-lock',
          labelKo: '골반 항회전·항신전 잠금 축 (0° 흔들림)',
          planeKo: '횡단·회전 억제 (Anti-Rotation)',
          pivot: slsMiddleJoints.pelvis,
          radiusPx: 18,
          startAngleDeg: 175,
          endAngleDeg: 185,
          nominalAngleText: '골반 수평 고정',
          biomechanicalRuleKo: '비대칭 다리 뻗기 중에도 양쪽 ASIS 높이와 천골 매트 접지력이 변하지 않습니다.',
        },
      ],
      contactPoints: [
        {
          id: 'sls-mid-cp-hand-shin',
          jointKey: 'hand',
          state: 'hand-shin-clasp',
          labelKo: '당긴 정강이 양손 접촉 고정',
          surfaceKo: '굴곡측 무릎(134,86)·정강이(164,98)',
          point: slsMiddleJoints.hand,
          verificationRuleKo: '중간 정점에서도 양손이 정강이를 안정적으로 감싸 당기며 바닥으로 내려가지 않음',
        },
        {
          id: 'sls-mid-cp-wrist-knee',
          jointKey: 'wrist',
          state: 'hand-shin-clasp',
          labelKo: '무릎 상단 가이드 손목 접촉',
          surfaceKo: '굴곡측 무릎 전면',
          point: slsMiddleJoints.wrist,
          verificationRuleKo: '무릎이 중심선 안팎으로 흔들리지 않도록 정밀 가이드',
        },
        {
          id: 'sls-mid-cp-lumbar',
          jointKey: 'lumbar',
          state: 'anchored-mat',
          labelKo: '요추 매트 고정 앵커',
          surfaceKo: '매트 중앙',
          point: slsMiddleJoints.lumbar,
          verificationRuleKo: '반대 다리 45° 사선 신전 시 요추 아치 발생 차단',
        },
        {
          id: 'sls-mid-cp-pelvis',
          jointKey: 'pelvis',
          state: 'anchored-mat',
          labelKo: '천골 좌우 대칭 앵커',
          surfaceKo: '매트 중앙',
          point: slsMiddleJoints.pelvis,
          verificationRuleKo: '단측 신전 토크에 맞서 천골 좌우 압력 균등 유지',
        },
      ],
      calloutLabels: [
        {
          id: 'sls-mid-lbl-shin-grip',
          textKo: '당긴 무릎·정강이 양손 클램프',
          subtextKo: '정강이 전면 직접 접촉 지지',
          anchorPoint: slsMiddleJoints.wrist,
          labelBoxPoint: pt(18, 42),
          align: 'start',
          tone: 'anchor',
        },
        {
          id: 'sls-mid-lbl-far-reach',
          textKo: '반대 다리 45° 사선 완전 신전',
          subtextKo: '고관절→발끝 일직선 리치',
          anchorPoint: slsMiddleJoints.farAnkle ?? pt(252, 68),
          labelBoxPoint: pt(172, 34),
          align: 'start',
          tone: 'vector',
        },
        {
          id: 'sls-mid-lbl-pelvis-lock',
          textKo: '천골·요추 항회전 고정 (흔들림 0°)',
          anchorPoint: slsMiddleJoints.pelvis,
          labelBoxPoint: pt(64, 174),
          align: 'start',
          tone: 'anchor',
        },
      ],
    },
    end: {
      phaseId: 'end',
      poseSpec: slsEndPose,
      specialOverlayKind: 'sls-switch-return',
      jointAxes: [
        {
          id: 'sls-end-axis-switch',
          jointKey: 'hip',
          kind: 'reciprocal-hip-switch-axis',
          labelKo: '고관절 교대 스위치 축 (좌↔우 정강이 그립 전환)',
          planeKo: '시상면 (Sagittal)',
          pivot: slsEndJoints.hip,
          radiusPx: 24,
          startAngleDeg: -112,
          endAngleDeg: -50,
          nominalAngleText: '좌우 스위치',
          biomechanicalRuleKo: '상체 컬업과 골반을 고정한 채 공중에서 두 다리를 교차하여 반대쪽 정강이를 잡습니다.',
        },
      ],
      contactPoints: [
        {
          id: 'sls-end-cp-hand-shin',
          jointKey: 'hand',
          state: 'hand-shin-clasp',
          labelKo: '교대된 정강이 양손 접촉',
          surfaceKo: '반대측 당긴 정강이 라인',
          point: slsEndJoints.hand,
          verificationRuleKo: '스위치 직후 새로 당긴 다리의 정강이·무릎으로 양손 접촉점 이전 완료',
        },
        {
          id: 'sls-end-cp-lumbar',
          jointKey: 'lumbar',
          state: 'anchored-mat',
          labelKo: '요추 임프린트 유지',
          surfaceKo: '매트 중앙',
          point: slsEndJoints.lumbar,
          verificationRuleKo: '다리 교차 순간에도 허리 들림 없이 매트 밀착 유지',
        },
        {
          id: 'sls-end-cp-pelvis',
          jointKey: 'pelvis',
          state: 'anchored-mat',
          labelKo: '천골 수평 고정',
          surfaceKo: '매트 중앙',
          point: slsEndJoints.pelvis,
          verificationRuleKo: '교대 스위치 시 골반 롤링 차단',
        },
      ],
      calloutLabels: [
        {
          id: 'sls-end-lbl-switch',
          textKo: '반대쪽 정강이로 양손 그립 전환',
          subtextKo: '상체 컬업 높이 불변',
          anchorPoint: slsEndJoints.wrist,
          labelBoxPoint: pt(20, 44),
          align: 'start',
          tone: 'anchor',
        },
        {
          id: 'sls-end-lbl-scissors',
          textKo: '중심선 가위 교차 제어 복귀',
          anchorPoint: slsEndJoints.ankle,
          labelBoxPoint: pt(172, 42),
          align: 'start',
          tone: 'vector',
        },
        {
          id: 'sls-end-lbl-lumbar',
          textKo: '요추·천골 매트 지지 유지',
          anchorPoint: slsEndJoints.lumbar,
          labelBoxPoint: pt(72, 174),
          align: 'start',
          tone: 'anchor',
        },
      ],
    },
  },
  legendItems: CORE_DIAGRAM_LEGEND_ITEMS,
  evidenceSources: resolveSources(
    sourceLedgerJson.movements['core-single-leg-stretch'].primarySourceIds,
  ),
  governance: {
    anatomicalAccuracyAssumed: false,
    professionalReviewCount: 0,
    exactAssetReady: false,
    containsMedicalDiagnosis: false,
    containsTreatmentEfficacyClaim: false,
    nonMedicalDisclaimerKo: sourceLedgerJson.governance.nonMedicalDisclaimerKo,
  },
  catalogVisualAsset: {
    exerciseId: 'original-mat-single-leg-stretch',
    nameKo: '싱글 레그 스트레치 (Single Leg Stretch)',
    nameEn: 'Single Leg Stretch (Abdominal Stability)',
    apparatus: 'mat',
    bodyPosition: 'supine',
    blockCategory: 'core_abdominal',
    spinalPlanes: ['flexion'],
    isUnilateral: true,
    archetypeId: 'core-single-leg-stretch-2d-v1',
    archetypeTitleKo: '싱글 레그 스트레치 전용 2D 도해 (양손 정강이 지지 & 45° 교차 신전)',
    staticGuideSvgPath: '/movement-guides/archetypes/supine-leg-stretch-hundred.svg',
    productionMethod: 'free-authored-kinematic-svg-v1',
    rightsStatus: 'original-app-authored-free-license',
    licenseLabelKo: '자체 제작 무료 2D 키네마틱 SVG (I4 코어 전용)',
    anatomicalAccuracyAssumed: false,
    phases: {
      start: slsStartPose,
      middle: slsMiddlePose,
      end: slsEndPose,
    },
    primaryMuscles: COMMON_CORE_MUSCLES,
    poseDeltaSummary: {
      startToMiddleKo:
        '상체 컬업과 요추·천골 매트 밀착을 고정한 채, 양손으로 당긴 쪽 무릎·정강이(134,86~164,98)를 감싸 지지하고 반대쪽 다리(farLeg)를 45° 사선(252,68)으로 길게 뻗습니다.',
      middleToEndKo:
        '몸통과 골반이 흔들리지 않게 공중 중심선에서 좌우 다리를 교차 스위치하며 새로 당겨온 정강이로 양손 그립을 전환합니다.',
      invariantAnchorsKo: '요추(lumbar)·천골(pelvis) 항회전 매트 밀착, 견갑골 하각 컬업 경계, 당긴 정강이 양손 접촉점',
      keyJointChangeKo: '양손(wrist/hand)이 바닥이 아닌 당긴 쪽 무릎·정강이를 지지하며 양다리가 115° 굴곡 ↔ 45° 사선 신전으로 교차',
    },
    mobileSummaryBulletsKo: [
      '양손으로 당긴 쪽 무릎·정강이를 직접 감싸 중심선 정렬 가이드',
      '반대쪽 다리를 45° 사선으로 뻗으며 골반 회전·허리 들림 0° 유지',
      '상체 컬업 높이를 유지한 채 공중에서 좌우 다리 교대 스위치',
    ],
  },
});

// ============================================================================
// 3. DOUBLE LEG STRETCH (더블 레그 스트레치 / core-double-leg-stretch)
// ============================================================================
const dlsStartJoints: RigJointMap = Object.freeze({
  head: pt(62, 98),
  neck: pt(72, 110),
  shoulder: pt(84, 122),
  elbow: pt(114, 110),
  wrist: pt(152, 98),
  hand: pt(172, 102),
  thoracic: pt(102, 136),
  lumbar: pt(126, 145),
  pelvis: pt(152, 144),
  hip: pt(158, 142),
  knee: pt(138, 90),
  ankle: pt(180, 104),
  heel: pt(182, 110),
  toe: pt(194, 102),
  farShoulder: pt(88, 118),
  farElbow: pt(116, 104),
  farWrist: pt(148, 92),
  farHip: pt(154, 138),
  farKnee: pt(134, 84),
  farAnkle: pt(176, 98),
  farToe: pt(190, 96),
});

const dlsMiddleJoints: RigJointMap = Object.freeze({
  head: pt(60, 96),
  neck: pt(70, 108),
  shoulder: pt(82, 120),
  elbow: pt(56, 90),
  wrist: pt(36, 70),
  hand: pt(24, 58),
  thoracic: pt(102, 136),
  lumbar: pt(126, 145),
  pelvis: pt(152, 144),
  hip: pt(158, 142),
  knee: pt(204, 104),
  ankle: pt(248, 68),
  heel: pt(252, 74),
  toe: pt(264, 60),
  farShoulder: pt(86, 116),
  farElbow: pt(60, 84),
  farWrist: pt(40, 64),
  farHip: pt(154, 138),
  farKnee: pt(198, 98),
  farAnkle: pt(242, 62),
  farToe: pt(258, 54),
});

const dlsEndJoints: RigJointMap = Object.freeze({
  head: pt(62, 98),
  neck: pt(72, 110),
  shoulder: pt(84, 122),
  elbow: pt(116, 112),
  wrist: pt(154, 100),
  hand: pt(174, 102),
  thoracic: pt(102, 136),
  lumbar: pt(126, 145),
  pelvis: pt(152, 144),
  hip: pt(158, 142),
  knee: pt(140, 92),
  ankle: pt(182, 104),
  heel: pt(184, 110),
  toe: pt(196, 102),
  farShoulder: pt(88, 118),
  farElbow: pt(118, 106),
  farWrist: pt(150, 94),
  farHip: pt(154, 138),
  farKnee: pt(136, 86),
  farAnkle: pt(178, 98),
  farToe: pt(192, 96),
});

const dlsStartPose: PhasePoseSpec = Object.freeze({
  phaseId: 'start',
  badgeKo: '시작 자세 (준비·정렬)',
  shortTitleKo: '상체 컬업 · 양 무릎 가슴 쪽 밀착 및 양손 정강이/발목 감싸기',
  summaryKo:
    '요추와 천골을 매트에 단단히 임프린트하고 견갑골 하각까지 상체를 컬업한 상태에서, 두 무릎을 모아 가슴 쪽으로 당기고 양손으로 양쪽 정강이·발목 앞쪽을 감싸 쥐어 컴팩트한 시작 자세를 만듭니다.',
  breathCueKo: '날숨 끝 정리 후 들숨 준비: 복부 중심 스쿱 & 정강이 양손 그립',
  joints: dlsStartJoints,
  fixedAnchors: [
    { joint: 'lumbar', surfaceKo: '요추 매트 임프린트 고정', point: dlsStartJoints.lumbar },
    { joint: 'pelvis', surfaceKo: '천골 매트 중앙 안착', point: dlsStartJoints.pelvis },
    { joint: 'hand', surfaceKo: '양손 정강이·발목 감싸기 접촉', point: dlsStartJoints.hand },
  ],
  movingJoints: ['elbow', 'wrist', 'hand', 'knee', 'ankle', 'toe'],
  apparatusState: {
    carriageOffsetPx: 0,
    pedalAngleDeg: 0,
    springTensionLevel: 'none',
    supportSurfaceKo: '필라테스 매트 (양측 상·하지 동시 레버 코어 안정)',
    propPositionKo: '양손이 모아진 양쪽 정강이·발목 라인을 감싸 지지',
  },
  alignments: [
    {
      id: 'dls-start-compact-hug',
      labelKo: '양손 정강이 클램프 & 흉추 컬업 응집',
      cueKo: '견갑골 하각까지 상체를 말아 올리고 양손으로 정강이를 감싸 복부 중심을 응집합니다.',
      kind: 'anchor-lock',
      from: dlsStartJoints.shoulder,
      to: dlsStartJoints.hand,
      cautionKo: '꼬리뼈가 매트에서 과도하게 들리지 않도록 천골 바닥 접지를 유지하세요.',
    },
  ],
  directionVectors: [
    {
      id: 'dls-start-hug-vec',
      labelKo: '양 무릎 당김 & 양손 정강이 감싸기',
      kind: 'spine-articulation',
      points: [pt(166, 102), dlsStartJoints.knee],
      phaseScope: 'start',
    },
  ],
});

const dlsMiddlePose: PhasePoseSpec = Object.freeze({
  phaseId: 'middle',
  badgeKo: '중간 자세 (최대 가동·정점)',
  shortTitleKo: '상체 컬업 고정 유지 · 양팔 귀 옆 오버헤드 & 양다리 45° 양방향 동시 신전',
  summaryKo:
    '들숨에 상체 컬업 높이와 요추·천골 매트 밀착을 조금도 잃지 않은 채, 양팔은 귀 옆(오버헤드 사선)으로 길게 뻗고 양다리는 동시에 45° 사선 전방으로 뻗어 최대 양방향 레버 부하를 복부 중심으로 버텨냅니다.',
  breathCueKo: '들숨: 상체 높이는 고정하고 양팔(귀 옆) ↔ 양다리(45°) 양방향 동시 리치',
  joints: dlsMiddleJoints,
  fixedAnchors: [
    { joint: 'lumbar', surfaceKo: '요추 항신전 매트 앵커 (늑골 들림 0°)', point: dlsMiddleJoints.lumbar },
    { joint: 'pelvis', surfaceKo: '천골 매트 고정', point: dlsMiddleJoints.pelvis },
    { joint: 'thoracic', surfaceKo: '견갑골 하각 컬업 높이 불변 고정', point: dlsMiddleJoints.thoracic },
  ],
  movingJoints: ['elbow', 'wrist', 'hand', 'farElbow', 'farWrist', 'knee', 'ankle', 'toe', 'farKnee', 'farAnkle', 'farToe'],
  apparatusState: {
    carriageOffsetPx: 0,
    pedalAngleDeg: 45,
    springTensionLevel: 'none',
    supportSurfaceKo: '필라테스 매트 (양방향 반대 신전 최대 코어 부하)',
    propPositionKo: '양팔 귀 옆 135° 오버헤드 리치 + 양다리 45° 사선 신전',
  },
  alignments: [
    {
      id: 'dls-middle-two-way-opposition',
      labelKo: '양팔 오버헤드(24,58) ↔ 양다리 45° 사선(264,60) 양방향 반대 신전 축',
      cueKo: '몸통 중심(요추·복횡근)을 단단히 잠그고 손끝과 발끝을 서로 반대 방향으로 길게 뻗습니다.',
      kind: 'axis-line',
      from: dlsMiddleJoints.hand,
      to: dlsMiddleJoints.toe,
      targetAngleDeg: 180,
      cautionKo: '팔을 머리 뒤로 뻗을 때 머리와 어깨가 바닥으로 떨어지거나 갈비뼈가 들리면 안 됩니다.',
    },
    {
      id: 'dls-middle-curl-height-lock',
      labelKo: '상체 컬업 높이 & 요추 임프린트 불변 잠금선',
      cueKo: '팔이 귀 옆으로 가더라도 흉추 컬업 높이는 시작 자세와 정확히 같아야 합니다.',
      kind: 'anchor-lock',
      from: pt(98, 146),
      to: pt(164, 146),
      cautionKo: '허리가 뜨면 팔과 다리의 사선 각도를 천장 쪽으로 높여 요추 밀착을 우선 확보하세요.',
    },
  ],
  directionVectors: [
    {
      id: 'dls-middle-arm-overhead-vec',
      labelKo: '양팔 귀 옆 오버헤드 리치 (상체 높이 유지)',
      kind: 'limb-excursion',
      points: [dlsStartJoints.hand, pt(92, 74), dlsMiddleJoints.hand],
      phaseScope: 'start-to-middle',
    },
    {
      id: 'dls-middle-leg-diagonal-vec',
      labelKo: '양다리 45° 사선 동시 신전 리치',
      kind: 'limb-excursion',
      points: [dlsStartJoints.ankle, pt(222, 82), dlsMiddleJoints.toe],
      phaseScope: 'start-to-middle',
    },
  ],
});

const dlsEndPose: PhasePoseSpec = Object.freeze({
  phaseId: 'end',
  badgeKo: '끝 자세 (제어 복귀·마무리)',
  shortTitleKo: '날숨에 양팔 넓은 원형 스윕(Arm Circle) & 양 무릎 접어 정강이 그립 복귀',
  summaryKo:
    '날숨에 복부를 더욱 깊게 스쿱하며 양팔을 옆으로 크게 원형(서클)을 그리듯 돌려 가져오는 동시에, 두 무릎을 가슴 쪽으로 접어 양손으로 다시 정강이·발목을 감싸 쥐며 시작 정렬로 복귀합니다.',
  breathCueKo: '날숨: 복부 스쿱하며 양팔 크게 서클 스윕 & 정강이 다시 감싸기',
  joints: dlsEndJoints,
  fixedAnchors: [
    { joint: 'lumbar', surfaceKo: '요추 매트 밀착 고정', point: dlsEndJoints.lumbar },
    { joint: 'pelvis', surfaceKo: '천골 매트 중앙 지지', point: dlsEndJoints.pelvis },
    { joint: 'hand', surfaceKo: '양손 정강이·발목 재접촉 클램프', point: dlsEndJoints.hand },
  ],
  movingJoints: ['elbow', 'wrist', 'hand', 'knee', 'ankle', 'toe'],
  apparatusState: {
    carriageOffsetPx: 0,
    pedalAngleDeg: 0,
    springTensionLevel: 'none',
    supportSurfaceKo: '필라테스 매트 (서클 복귀 코어 응집)',
    propPositionKo: '양팔 와이드 서클 스윕 후 정강이 재그립',
  },
  alignments: [
    {
      id: 'dls-end-circle-reclasp',
      labelKo: '양팔 원형 스윕 & 양 무릎 정강이 재결합',
      cueKo: '상체 컬업 높이를 유지한 채 팔을 넓게 돌려 무릎·정강이를 다시 감싸 쥡니다.',
      kind: 'anchor-lock',
      from: dlsEndJoints.shoulder,
      to: dlsEndJoints.hand,
      cautionKo: '팔을 돌릴 때 목과 어깨가 긴장하거나 상체가 먼저 바닥으로 눕지 않도록 제어하세요.',
    },
  ],
  directionVectors: [
    {
      id: 'dls-end-arm-circle-vec',
      labelKo: '양팔 와이드 서클 스윕 복귀 궤적',
      kind: 'return-control',
      points: [dlsMiddleJoints.hand, pt(88, 134), dlsEndJoints.hand],
      phaseScope: 'middle-to-end',
    },
    {
      id: 'dls-end-knee-fold-vec',
      labelKo: '양다리 동시 굴곡 회수 (45°→정강이 그립)',
      kind: 'return-control',
      points: [dlsMiddleJoints.ankle, pt(214, 86), dlsEndJoints.ankle],
      phaseScope: 'middle-to-end',
    },
  ],
});

const DOUBLE_LEG_STRETCH_SPEC: CoreAbdominalDiagramSpec = Object.freeze({
  coreId: 'core-double-leg-stretch',
  primaryExerciseId: 'ex-core-03',
  linkedCatalogExerciseIds: ['ex-core-03', 'core-double-leg-stretch'],
  orderIndex: 3,
  nameKo: '더블 레그 스트레치',
  nameEn: 'Double Leg Stretch',
  seriesBadgeKo: 'Core Stability #3 · 상·하지 양방향 반대 신전 & 암 서클 복귀',
  summaryKo:
    '상체 컬업과 요추·천골 매트 밀착을 고정한 상태에서, 양손으로 정강이를 감싼 시작 자세(Start)에서 들숨에 양팔 귀 옆 오버헤드 & 양다리 45° 사선으로 동시에 양방향 신전(Middle)하고, 날숨에 팔을 크게 원형으로 돌려 무릎을 접어 정강이를 다시 감싸는(End) 고난도 코어 안정 동작입니다.',
  biomechanicalFocusKo:
    '상지(오버헤드 굴곡)와 하지(45° 사선 신전)가 동시에 몸통 중심에서 멀어질 때 발생하는 강력한 흉요추 신전 토크를 복횡근과 복직근이 버텨내며, 상체 컬업 높이와 요추 임프린트를 일정하게 유지합니다.',
  resolvedAuditDefectKo:
    '기존 공용 아키타입에서 팔이 골반 옆에 머물러 더블 레그 스트레치의 핵심인 "정강이 감싸기(Start) → 귀 옆 오버헤드 & 45° 사선 양방향 반대 신전(Middle) → 양팔 와이드 서클 스윕 복귀(End)"가 빠져 있던 결함을 전용 3단계 도해로 완전히 해결했습니다.',
  phaseDetails: {
    start: {
      phaseId: 'start',
      poseSpec: dlsStartPose,
      specialOverlayKind: 'dls-compact-shin-hug',
      jointAxes: [
        {
          id: 'dls-start-axis-hip',
          jointKey: 'hip',
          kind: 'hip-lever-axis',
          labelKo: '양측 고관절·무릎 굴곡 응집 축',
          planeKo: '시상면 (Sagittal)',
          pivot: dlsStartJoints.hip,
          radiusPx: 22,
          startAngleDeg: -118,
          endAngleDeg: -55,
          nominalAngleText: '양무릎 당김',
          biomechanicalRuleKo: '양 무릎과 발목을 모아 가슴 쪽으로 당기되 천골은 매트 위에 수평으로 남겨둡니다.',
        },
        {
          id: 'dls-start-axis-thoracic',
          jointKey: 'thoracic',
          kind: 'thoracic-curl-axis',
          labelKo: '흉추 컬업 축 (견갑 하각 35°)',
          planeKo: '시상면 (Sagittal)',
          pivot: dlsStartJoints.thoracic,
          radiusPx: 20,
          startAngleDeg: 180,
          endAngleDeg: 218,
          nominalAngleText: '컬업 응집',
          biomechanicalRuleKo: '견갑골 하각까지 상체를 컬업하고 양손으로 양 정강이를 감싸 쥐어 출발 기준점을 만듭니다.',
        },
      ],
      contactPoints: [
        {
          id: 'dls-start-cp-hand-shin',
          jointKey: 'hand',
          state: 'hand-shin-clasp',
          labelKo: '양손 정강이·발목 감싸기 접촉',
          surfaceKo: '모아진 양쪽 정강이·발목 전면',
          point: dlsStartJoints.hand,
          verificationRuleKo: '양손(172,102)이 모아진 양쪽 정강이·발목(180,104)을 직접 감싸 쥐는 접촉점',
        },
        {
          id: 'dls-start-cp-lumbar',
          jointKey: 'lumbar',
          state: 'anchored-mat',
          labelKo: '요추 매트 임프린트',
          surfaceKo: '매트 중앙',
          point: dlsStartJoints.lumbar,
          verificationRuleKo: '복부 응집 상태에서 요추 전체가 매트에 밀착',
        },
        {
          id: 'dls-start-cp-pelvis',
          jointKey: 'pelvis',
          state: 'anchored-mat',
          labelKo: '천골 매트 지지',
          surfaceKo: '매트 중앙',
          point: dlsStartJoints.pelvis,
          verificationRuleKo: '천골이 매트에서 들리지 않고 안정 지지',
        },
      ],
      calloutLabels: [
        {
          id: 'dls-start-lbl-hug',
          textKo: '양 무릎 밀착 & 양손 정강이 감싸기',
          subtextKo: '컴팩트 볼(Compact Ball) 준비',
          anchorPoint: dlsStartJoints.wrist,
          labelBoxPoint: pt(24, 44),
          align: 'start',
          tone: 'anchor',
        },
        {
          id: 'dls-start-lbl-curl',
          textKo: '견갑골 하각 컬업 기준점',
          anchorPoint: dlsStartJoints.thoracic,
          labelBoxPoint: pt(178, 46),
          align: 'start',
          tone: 'axis',
        },
        {
          id: 'dls-start-lbl-lumbar',
          textKo: '요추·천골 매트 임프린트 고정',
          anchorPoint: dlsStartJoints.lumbar,
          labelBoxPoint: pt(76, 174),
          align: 'start',
          tone: 'anchor',
        },
      ],
    },
    middle: {
      phaseId: 'middle',
      poseSpec: dlsMiddlePose,
      specialOverlayKind: 'dls-opposing-overhead-reach',
      jointAxes: [
        {
          id: 'dls-mid-axis-shoulder-overhead',
          jointKey: 'shoulder',
          kind: 'overhead-circle-axis',
          labelKo: '견관절 귀 옆 오버헤드 리치 축 (135°)',
          planeKo: '시상면 (Sagittal)',
          pivot: dlsMiddleJoints.shoulder,
          radiusPx: 24,
          startAngleDeg: -145,
          endAngleDeg: -20,
          nominalAngleText: '귀 옆 135° 리치',
          biomechanicalRuleKo: '상체 컬업 높이(견갑골 하각)를 떨어뜨리지 않고 양팔을 귀 옆 사선으로 길게 뻗습니다.',
        },
        {
          id: 'dls-mid-axis-hip-lever',
          jointKey: 'hip',
          kind: 'hip-lever-axis',
          labelKo: '양측 고관절 45° 사선 신전 축',
          planeKo: '시상면 (Sagittal)',
          pivot: dlsMiddleJoints.hip,
          radiusPx: 28,
          startAngleDeg: -45,
          endAngleDeg: 0,
          nominalAngleText: '양다리 45° 신전',
          biomechanicalRuleKo: '양팔 오버헤드 리치와 동시에 두 다리를 붙여 45° 사선 전방으로 뻗어 양방향 대칭 신전을 완성합니다.',
        },
        {
          id: 'dls-mid-axis-lumbar-lock',
          jointKey: 'lumbar',
          kind: 'lumbar-anti-extension-lock',
          labelKo: '흉곽-골반 항신전 잠금 축 (늑골 플레어 0°)',
          planeKo: '시상면 (Sagittal)',
          pivot: dlsMiddleJoints.lumbar,
          radiusPx: 18,
          startAngleDeg: 175,
          endAngleDeg: 185,
          nominalAngleText: '양방향 부하 잠금',
          biomechanicalRuleKo: '상·하지 동시 오픈 시 가장 흔한 오류인 갈비뼈 들림과 허리 꺾임을 복횡근·복직근으로 잠급니다.',
        },
      ],
      contactPoints: [
        {
          id: 'dls-mid-cp-lumbar',
          jointKey: 'lumbar',
          state: 'anchored-mat',
          labelKo: '요추 항신전 매트 앵커',
          surfaceKo: '매트 중앙 (최대 부하 지지)',
          point: dlsMiddleJoints.lumbar,
          verificationRuleKo: '양팔·양다리가 동시에 멀어져도 요추 매트 밀착이 풀리지 않음',
        },
        {
          id: 'dls-mid-cp-pelvis',
          jointKey: 'pelvis',
          state: 'anchored-mat',
          labelKo: '천골 매트 고정 앵커',
          surfaceKo: '매트 중앙',
          point: dlsMiddleJoints.pelvis,
          verificationRuleKo: '골반 전방경사 없이 천골 수평 지지 유지',
        },
        {
          id: 'dls-mid-cp-scapula',
          jointKey: 'thoracic',
          state: 'scapular-tip-hinge',
          labelKo: '견갑골 하각 컬업 높이 고정',
          surfaceKo: '매트 상단 경계 (높이 유지)',
          point: dlsMiddleJoints.thoracic,
          verificationRuleKo: '팔만 귀 옆으로 뻗을 뿐 머리와 어깨는 바닥으로 눕지 않고 컬업 높이 유지',
        },
        {
          id: 'dls-mid-cp-hand-overhead',
          jointKey: 'hand',
          state: 'lifted-hover',
          labelKo: '귀 옆 오버헤드 손끝 리치',
          surfaceKo: '머리 위 사선 공중 (24,58)',
          point: dlsMiddleJoints.hand,
          verificationRuleKo: '양손이 정강이에서 떨어져 귀 옆 사선 상방으로 완전 신전',
        },
      ],
      calloutLabels: [
        {
          id: 'dls-mid-lbl-overhead',
          textKo: '양팔 귀 옆 오버헤드 리치',
          subtextKo: '상체 컬업 높이 유지 필수',
          anchorPoint: dlsMiddleJoints.wrist,
          labelBoxPoint: pt(18, 30),
          align: 'start',
          tone: 'vector',
        },
        {
          id: 'dls-mid-lbl-legs',
          textKo: '양다리 45° 사선 동시 신전',
          subtextKo: '손끝↔발끝 양방향 반대 리치',
          anchorPoint: dlsMiddleJoints.ankle,
          labelBoxPoint: pt(168, 34),
          align: 'start',
          tone: 'vector',
        },
        {
          id: 'dls-mid-lbl-anchor',
          textKo: '늑골·요추 매트 잠금 (아치 차단)',
          anchorPoint: dlsMiddleJoints.lumbar,
          labelBoxPoint: pt(62, 174),
          align: 'start',
          tone: 'anchor',
        },
      ],
    },
    end: {
      phaseId: 'end',
      poseSpec: dlsEndPose,
      specialOverlayKind: 'dls-wide-arm-circle-return',
      jointAxes: [
        {
          id: 'dls-end-axis-circle',
          jointKey: 'shoulder',
          kind: 'overhead-circle-axis',
          labelKo: '견관절 와이드 서클 스윕 축 (오버헤드→정강이)',
          planeKo: '다중면 (견관절 원형)',
          pivot: dlsEndJoints.shoulder,
          radiusPx: 26,
          startAngleDeg: -140,
          endAngleDeg: 15,
          nominalAngleText: '양팔 서클 복귀',
          biomechanicalRuleKo: '양팔을 양옆으로 넓게 원을 그리며 돌려 가져와 접혀 들어오는 두 정강이를 다시 감싸 쥡니다.',
        },
      ],
      contactPoints: [
        {
          id: 'dls-end-cp-hand-shin',
          jointKey: 'hand',
          state: 'hand-shin-clasp',
          labelKo: '양손 정강이·발목 재그립 접촉',
          surfaceKo: '회수된 양쪽 정강이 전면',
          point: dlsEndJoints.hand,
          verificationRuleKo: '서클 스윕 완료 후 양손(174,102)이 다시 양 정강이(182,104)를 감싸 지지',
        },
        {
          id: 'dls-end-cp-lumbar',
          jointKey: 'lumbar',
          state: 'anchored-mat',
          labelKo: '요추 매트 밀착 유지',
          surfaceKo: '매트 중앙',
          point: dlsEndJoints.lumbar,
          verificationRuleKo: '팔 서클과 무릎 회수 중에도 요추 임프린트 불변',
        },
        {
          id: 'dls-end-cp-pelvis',
          jointKey: 'pelvis',
          state: 'anchored-mat',
          labelKo: '천골 매트 고정',
          surfaceKo: '매트 중앙',
          point: dlsEndJoints.pelvis,
          verificationRuleKo: '천골 수평 안착 유지',
        },
      ],
      calloutLabels: [
        {
          id: 'dls-end-lbl-circle',
          textKo: '양팔 와이드 서클 스윕 복귀',
          subtextKo: '오버헤드→측면 원형→정강이',
          anchorPoint: dlsEndJoints.elbow,
          labelBoxPoint: pt(18, 42),
          align: 'start',
          tone: 'vector',
        },
        {
          id: 'dls-end-lbl-reclasp',
          textKo: '양 무릎 굴곡 회수 & 정강이 재그립',
          anchorPoint: dlsEndJoints.hand,
          labelBoxPoint: pt(162, 44),
          align: 'start',
          tone: 'anchor',
        },
        {
          id: 'dls-end-lbl-lumbar',
          textKo: '상체 컬업 & 요추 밀착 유지',
          anchorPoint: dlsEndJoints.lumbar,
          labelBoxPoint: pt(72, 174),
          align: 'start',
          tone: 'anchor',
        },
      ],
    },
  },
  legendItems: CORE_DIAGRAM_LEGEND_ITEMS,
  evidenceSources: resolveSources(
    sourceLedgerJson.movements['core-double-leg-stretch'].primarySourceIds,
  ),
  governance: {
    anatomicalAccuracyAssumed: false,
    professionalReviewCount: 0,
    exactAssetReady: false,
    containsMedicalDiagnosis: false,
    containsTreatmentEfficacyClaim: false,
    nonMedicalDisclaimerKo: sourceLedgerJson.governance.nonMedicalDisclaimerKo,
  },
  catalogVisualAsset: {
    exerciseId: 'ex-core-03',
    nameKo: '더블 레그 스트레치 (Double Leg Stretch)',
    nameEn: 'Double Leg Stretch (Abdominal Stability)',
    apparatus: 'mat',
    bodyPosition: 'supine',
    blockCategory: 'core_abdominal',
    spinalPlanes: ['flexion'],
    isUnilateral: false,
    archetypeId: 'core-double-leg-stretch-2d-v1',
    archetypeTitleKo: '더블 레그 스트레치 전용 2D 도해 (양방향 오버헤드·사선 신전 & 서클 복귀)',
    staticGuideSvgPath: '/movement-guides/archetypes/supine-leg-stretch-hundred.svg',
    productionMethod: 'free-authored-kinematic-svg-v1',
    rightsStatus: 'original-app-authored-free-license',
    licenseLabelKo: '자체 제작 무료 2D 키네마틱 SVG (I4 코어 전용)',
    anatomicalAccuracyAssumed: false,
    phases: {
      start: dlsStartPose,
      middle: dlsMiddlePose,
      end: dlsEndPose,
    },
    primaryMuscles: COMMON_CORE_MUSCLES,
    poseDeltaSummary: {
      startToMiddleKo:
        '상체 컬업 높이와 요추·천골 매트 밀착을 유지한 채, 정강이를 감싸 쥔 양손(172,102)을 귀 옆 오버헤드(24,58)로 뻗고 양다리를 45° 사선(264,60)으로 동시에 양방향 신전합니다.',
      middleToEndKo:
        '날숨에 상체 컬업을 유지하며 양팔을 양옆으로 크게 원형 스윕(Arm Circle)하여 접혀 들어오는 두 무릎·정강이(174,102)를 다시 감싸 쥡니다.',
      invariantAnchorsKo: '요추(lumbar)·천골(pelvis) 매트 임프린트 및 견갑골 하각(thoracic) 컬업 높이 고정',
      keyJointChangeKo: '양손(hand: 172,102 → 24,58 → 174,102)과 양발(toe: 194,102 → 264,60 → 196,102)이 몸통 중심에서 양방향 반대 신전 후 서클 복귀',
    },
    mobileSummaryBulletsKo: [
      '시작: 상체 컬업 & 양 무릎 모아 양손으로 정강이·발목 감싸기',
      '중간: 컬업 높이 고정 + 양팔 귀 옆 오버헤드 & 양다리 45° 동시 신전',
      '끝: 날숨에 양팔 넓은 원형 스윕으로 무릎을 접어 정강이 재그립',
    ],
  },
});

export const CORE_ABDOMINAL_DIAGRAM_SPECS: Readonly<
  Record<CoreMovementId, CoreAbdominalDiagramSpec>
> = Object.freeze({
  'core-hundred': HUNDRED_SPEC,
  'core-single-leg-stretch': SINGLE_LEG_STRETCH_SPEC,
  'core-double-leg-stretch': DOUBLE_LEG_STRETCH_SPEC,
});

export const CORE_ABDOMINAL_DIAGRAM_LIST: readonly CoreAbdominalDiagramSpec[] = Object.freeze([
  HUNDRED_SPEC,
  SINGLE_LEG_STRETCH_SPEC,
  DOUBLE_LEG_STRETCH_SPEC,
]);

export const CORE_MOVEMENT_VISUAL_ASSETS: readonly CatalogMovementVisualAsset[] = Object.freeze(
  CORE_ABDOMINAL_DIAGRAM_LIST.map((spec) => spec.catalogVisualAsset),
);

export const CORE_CATALOG_EXERCISE_ID_MAP: Readonly<Record<string, CoreAbdominalDiagramSpec>> =
  Object.freeze(
    Object.fromEntries(
      CORE_ABDOMINAL_DIAGRAM_LIST.flatMap((spec) =>
        spec.linkedCatalogExerciseIds.map((exerciseId) => [exerciseId, spec] as const),
      ),
    ),
  );

export function resolveCoreAbdominalDiagram(
  idOrExerciseId: string,
): CoreAbdominalDiagramSpec | null {
  const normalized = idOrExerciseId.trim();
  return CORE_CATALOG_EXERCISE_ID_MAP[normalized] ?? null;
}

export function resolveCoreMovementVisualAsset(
  idOrExerciseId: string,
): CatalogMovementVisualAsset | null {
  const spec = resolveCoreAbdominalDiagram(idOrExerciseId);
  return spec ? spec.catalogVisualAsset : null;
}

function lerpNum(a: number, b: number, t: number): number {
  return Math.round((a + (b - a) * t) * 10) / 10;
}

function lerpPoint(p1: Point2D, p2: Point2D, t: number): Point2D {
  return {
    x: lerpNum(p1.x, p2.x, t),
    y: lerpNum(p1.y, p2.y, t),
  };
}

export function interpolateCorePhaseJoints(
  spec: CoreAbdominalDiagramSpec,
  progress01: number,
): RigJointMap {
  const clamped = Number.isFinite(progress01)
    ? Math.min(1, Math.max(0, progress01))
    : 0;
  const fromJoints =
    clamped <= 0.5
      ? spec.phaseDetails.start.poseSpec.joints
      : spec.phaseDetails.middle.poseSpec.joints;
  const toJoints =
    clamped <= 0.5
      ? spec.phaseDetails.middle.poseSpec.joints
      : spec.phaseDetails.end.poseSpec.joints;
  const localT = clamped <= 0.5 ? clamped * 2 : (clamped - 0.5) * 2;

  const requiredKeys: (keyof RigJointMap)[] = [
    'head',
    'neck',
    'shoulder',
    'elbow',
    'wrist',
    'hand',
    'thoracic',
    'lumbar',
    'pelvis',
    'hip',
    'knee',
    'ankle',
    'heel',
    'toe',
  ];
  const optionalKeys: (keyof RigJointMap)[] = [
    'farShoulder',
    'farElbow',
    'farWrist',
    'farHip',
    'farKnee',
    'farAnkle',
    'farToe',
  ];

  const interpolated: Record<string, Point2D> = {};
  for (const key of requiredKeys) {
    const a = fromJoints[key] as Point2D;
    const b = toJoints[key] as Point2D;
    interpolated[key] = lerpPoint(a, b, localT);
  }
  for (const key of optionalKeys) {
    const a = fromJoints[key];
    const b = toJoints[key];
    if (a && b) {
      interpolated[key] = lerpPoint(a, b, localT);
    }
  }

  return Object.freeze(interpolated) as unknown as RigJointMap;
}

export function calculateCorePhaseJointDelta(
  spec: CoreAbdominalDiagramSpec,
  fromPhase: VisualPhaseId,
  toPhase: VisualPhaseId,
): {
  readonly totalDisplacementPx: number;
  readonly handDeltaPx: number;
  readonly ankleDeltaPx: number;
  readonly lumbarAnchorDriftPx: number;
  readonly pelvisAnchorDriftPx: number;
} {
  const a = spec.phaseDetails[fromPhase].poseSpec.joints;
  const b = spec.phaseDetails[toPhase].poseSpec.joints;
  const dist = (p1: Point2D, p2: Point2D) => Math.hypot(p2.x - p1.x, p2.y - p1.y);

  const tracked: (keyof RigJointMap)[] = [
    'head',
    'shoulder',
    'elbow',
    'wrist',
    'hand',
    'knee',
    'ankle',
    'toe',
  ];
  const totalDisplacementPx = Math.round(
    tracked.reduce((sum, key) => sum + dist(a[key] as Point2D, b[key] as Point2D), 0),
  );

  return Object.freeze({
    totalDisplacementPx,
    handDeltaPx: Math.round(dist(a.hand, b.hand)),
    ankleDeltaPx: Math.round(dist(a.ankle, b.ankle)),
    lumbarAnchorDriftPx: Math.round(dist(a.lumbar, b.lumbar)),
    pelvisAnchorDriftPx: Math.round(dist(a.pelvis, b.pelvis)),
  });
}

export interface CoreI7RegistryPatch {
  readonly ownerTrack: 'I4';
  readonly targetBranch: 'gemini/diagram-i4-core-20261108';
  readonly byCoreId: Readonly<Record<CoreMovementId, CatalogMovementVisualAsset>>;
  readonly byCatalogExerciseId: Readonly<Record<string, CatalogMovementVisualAsset>>;
  readonly replacementNotesKo: readonly string[];
}

export function getCoreI7RegistryPatch(): CoreI7RegistryPatch {
  return Object.freeze({
    ownerTrack: 'I4',
    targetBranch: 'gemini/diagram-i4-core-20261108',
    byCoreId: Object.freeze({
      'core-hundred': HUNDRED_SPEC.catalogVisualAsset,
      'core-single-leg-stretch': SINGLE_LEG_STRETCH_SPEC.catalogVisualAsset,
      'core-double-leg-stretch': DOUBLE_LEG_STRETCH_SPEC.catalogVisualAsset,
    }),
    byCatalogExerciseId: Object.freeze({
      'ex-core-01': HUNDRED_SPEC.catalogVisualAsset,
      'original-mat-single-leg-stretch': SINGLE_LEG_STRETCH_SPEC.catalogVisualAsset,
      'ex-core-03': DOUBLE_LEG_STRETCH_SPEC.catalogVisualAsset,
    }),
    replacementNotesKo: Object.freeze([
      'ex-core-01 (헌드레드): core-hundred-2d-v1 자산으로 매핑 — 양다리 45° 사선 레버 + 골반 옆 수평 팔 5박 상하 펌핑',
      'original-mat-single-leg-stretch (싱글 레그 스트레치): core-single-leg-stretch-2d-v1 자산으로 매핑 — 당긴 무릎/정강이 양손 접촉 + 반대 다리 45° 사선 교차 신전',
      'ex-core-03 (더블 레그 스트레치): core-double-leg-stretch-2d-v1 자산으로 매핑 — 정강이 양손 그립(Start) → 양팔 귀 옆 오버헤드 & 양다리 45° 동시 신전(Middle) → 양팔 와이드 서클 스윕 복귀(End)',
    ]),
  });
}
