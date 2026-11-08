import sourceLedgerJson from './footworkLowerSourceLedger.json';
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
import type {
  ApparatusType,
  BodyPosition,
  ClassBlockCategory,
  PilatesExercise,
  SpinalPlane,
} from '../types/pilates';

export type FootworkLowerDiagramId =
  | 'reformer-footwork-and-strap-frog'
  | 'ankle-plantar-dorsiflexion-articulation'
  | 'chair-pedal-press-and-calf-raise'
  | 'standing-lunge-splits-and-hip-abduction';

export const FOOTWORK_LOWER_DIAGRAM_IDS: readonly FootworkLowerDiagramId[] = Object.freeze([
  'reformer-footwork-and-strap-frog',
  'ankle-plantar-dorsiflexion-articulation',
  'chair-pedal-press-and-calf-raise',
  'standing-lunge-splits-and-hip-abduction',
]);

export const FOOTWORK_LOWER_CATALOG_EXERCISE_IDS: readonly string[] = Object.freeze([
  // Group 1 (6)
  'original-reformer-parallel-footwork',
  'original-reformer-strap-frog',
  'ex-footwork-01',
  'ex-footwork-02',
  'ex-kr-reformer-01',
  'ex-global-reformer-01',
  // Group 2 (4)
  'original-barrel-supported-ankle',
  'original-mat-ankle-reach',
  'original-cadillac-table-ankle',
  'ex-footwork-03',
  // Group 3 (4)
  'original-chair-seated-pedal-press',
  'original-chair-alternating-pedal',
  'original-chair-supported-calf-raise',
  'original-chair-sit-to-stand',
  // Group 4 (7)
  'original-barrel-standing-hip-extension',
  'original-barrel-standing-side-reach',
  'original-mat-clam',
  'ex-lower-01',
  'ex-lower-02',
  'ex-lower-03',
  'ex-kr-reformer-02',
]);

export interface FootworkLowerVerificationSpec {
  readonly anatomicalAccuracyAssumed: false;
  readonly status: 'source-compared-draft';
  readonly reviewerVerificationRequired: true;
  readonly clinicalSafetyGuaranteed: false;
}

export type VerifiedFootworkLowerVisualAsset = CatalogMovementVisualAsset & {
  readonly verification: FootworkLowerVerificationSpec;
};

export interface FootworkLowerJointAxisSpec {
  readonly id: string;
  readonly labelKo: string;
  readonly role:
    | 'hip-knee-second-toe-tracking'
    | 'talocrural-flex-point-axis'
    | 'chair-pedal-spring-hinge'
    | 'standing-support-knee-plumb';
  readonly point: Point2D;
  readonly referenceLineFrom: Point2D;
  readonly referenceLineTo: Point2D;
  readonly descriptionKo: string;
}

export interface FootworkLowerContactPointSpec {
  readonly id: string;
  readonly labelKo: string;
  readonly joint: keyof RigJointMap;
  readonly kind:
    | 'footbar-or-strap-contact'
    | 'carriage-sacral-anchor'
    | 'chair-pedal-or-seat-contact'
    | 'standing-foot-tripod';
  readonly point: Point2D;
  readonly phases: readonly VisualPhaseId[];
}

export interface FootworkLowerCalloutLabelSpec {
  readonly id: string;
  readonly phaseId: VisualPhaseId;
  readonly textKo: string;
  readonly anchor: Point2D;
  readonly badgePosition: Point2D;
  readonly tone: 'anchor' | 'excursion' | 'breath' | 'caution';
}

export interface FootworkLowerTrajectoryOverlaySpec {
  readonly id: string;
  readonly labelKo: string;
  readonly kind:
    | 'reformer-carriage-glide'
    | 'talocrural-flex-point-arc'
    | 'chair-pedal-depression'
    | 'standing-scooter-split-abduction';
  readonly phaseId: VisualPhaseId;
  readonly svgPathD: string;
  readonly startPoint: Point2D;
  readonly endPoint: Point2D;
  readonly deltaVector?: readonly [number, number];
}

export interface FootworkLowerKinematicMetrics {
  readonly carriageTravelPx?: number;
  readonly ankleFlexPointRangeDeg?: readonly [number, number];
  readonly pedalAngleRangeDeg?: readonly [number, number];
  readonly standingSupportKneeAngleDeg?: number;
  readonly pelvicLevelnessHold: boolean;
  readonly secondToeTrackingAligned: boolean;
}

export interface FootworkLowerDiagramSpec {
  readonly id: FootworkLowerDiagramId;
  readonly mappedExerciseIds: readonly string[];
  readonly catalogExerciseIds: readonly string[];
  readonly primaryCatalogExerciseId: string;
  readonly nameKo: string;
  readonly nameEn: string;
  readonly subtitleKo: string;
  readonly archetypeId: string;
  readonly archetypeTitleKo: string;
  readonly matBaselineY: number;
  readonly kinematicMetrics: FootworkLowerKinematicMetrics;
  readonly jointAxes: readonly FootworkLowerJointAxisSpec[];
  readonly contactPoints: readonly FootworkLowerContactPointSpec[];
  readonly calloutLabels: readonly FootworkLowerCalloutLabelSpec[];
  readonly trajectoryOverlays: readonly FootworkLowerTrajectoryOverlaySpec[];
  readonly asset: VerifiedFootworkLowerVisualAsset;
  readonly correction: MovementDiagramCorrection;
}

export interface FootworkLowerLegendItem {
  readonly id: string;
  readonly labelKo: string;
  readonly descriptionKo: string;
  readonly swatchColor: string;
  readonly symbol: 'tracking-line' | 'ankle-hinge' | 'pedal-spring' | 'pelvis-level';
}

export interface FootworkLowerI7RegistryPatch {
  readonly assets: Readonly<Record<string, VerifiedFootworkLowerVisualAsset>>;
  readonly corrections: Readonly<Record<string, MovementDiagramCorrection>>;
  readonly byCatalogExerciseId: Readonly<Record<string, VerifiedFootworkLowerVisualAsset>>;
  readonly byDiagramId: Readonly<Record<FootworkLowerDiagramId, VerifiedFootworkLowerVisualAsset>>;
}

export const FOOTWORK_LOWER_SOURCE_LEDGER = Object.freeze(sourceLedgerJson);

export const FOOTWORK_LOWER_VERIFICATION: FootworkLowerVerificationSpec = Object.freeze({
  anatomicalAccuracyAssumed: false,
  status: 'source-compared-draft',
  reviewerVerificationRequired: true,
  clinicalSafetyGuaranteed: false,
});

export const FOOTWORK_LOWER_DIAGRAM_LEGEND_ITEMS: readonly FootworkLowerLegendItem[] =
  Object.freeze([
    {
      id: 'hip-knee-second-toe-line',
      labelKo: '고관절-슬관절-두 번째 발가락(2nd Toe) 트래킹 축',
      descriptionKo:
        '리포머 풋워크·체어 페달·스탠딩 런지에서 무릎이 안쪽(X자)으로 모이거나 과신전되지 않게 정렬합니다.',
      swatchColor: '#1d4ed8',
      symbol: 'tracking-line',
    },
    {
      id: 'talocrural-ankle-hinge',
      labelKo: '거퇴관절(발목) 저측굴곡↔배측굴곡 & 종골 수직 트래킹',
      descriptionKo:
        '텐던 스트레치·러닝·발목 리치·카프 레이즈에서 발목이 바깥으로 꺾이지(Sickling) 않게 제어합니다.',
      swatchColor: '#0284c7',
      symbol: 'ankle-hinge',
    },
    {
      id: 'carriage-pedal-spring-vector',
      labelKo: '리포머 캐리지 글라이드 & 운다 체어 스프링 페달 저항 궤적',
      descriptionKo:
        '밀어낼 때(Concentric)뿐 아니라 복귀 구간(Eccentric) 마지막 5cm를 속근육 브레이크로 감속합니다.',
      swatchColor: '#c86d44',
      symbol: 'pedal-spring',
    },
    {
      id: 'pelvic-levelness-anchor',
      labelKo: '천골(y=143)·좌골·지지측 골반 수평(Pelvic Levelness) 앵커',
      descriptionKo:
        '단측 스쿠터·런지·사이드 스플릿·클램 및 교대 페달 중 골반 회전·처짐(0°)을 차단합니다.',
      swatchColor: '#2b6a58',
      symbol: 'pelvis-level',
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

const FOOTWORK_LOWER_MUSCLE_HIGHLIGHTS: readonly MuscleHighlightSpec[] = Object.freeze([
  {
    muscleGroupId: 'quadriceps',
    labelKo: '대퇴사두근·내측광근 (슬관절 신전 & 2번째 발가락 트래킹)',
    labelEn: 'Quadriceps & Vastus Medialis Obliquus',
    catalogMuscleMatches: ['대퇴사두근', '하체', '무릎'],
    role: 'primary',
    roleLabelKo: '주동근 (주 타겟)',
    activePhases: ['start', 'middle', 'end'],
    anchorJoints: ['hip', 'knee', 'ankle'],
    reasonKo:
      '리포머 풋워크·체어 페달 프레스·런지 기립 시 슬개골이 두 번째 발가락 방향을 향하도록 무릎 굴신을 주도합니다.',
  },
  {
    muscleGroupId: 'glute-med',
    labelKo: '중둔근·대둔근·외회전근 (골반 수평 지지 & 고관절 신전/외전)',
    labelEn: 'Gluteus Medius, Gluteus Maximus & Deep External Rotators',
    catalogMuscleMatches: ['중둔근', '소둔근', '대둔근', '둔근', '대퇴근막장근', '고관절'],
    role: 'primary',
    roleLabelKo: '주동근 (주 타겟)',
    activePhases: ['middle', 'end'],
    anchorJoints: ['pelvis', 'hip', 'knee'],
    reasonKo:
      '스탠딩 스쿠터·런지·사이드 스플릿·매트 클램 및 와이드 풋워크에서 골반 처짐을 막고 하지 추진력을 생성합니다.',
  },
  {
    muscleGroupId: 'calves',
    labelKo: '비복근·가자미근·전경골근 (거퇴관절 저굴/배굴 & 아킬레스건 편심 제어)',
    labelEn: 'Gastrocnemius, Soleus & Tibialis Anterior',
    catalogMuscleMatches: ['비복근/가자미근', '종아리', '발목'],
    role: 'primary',
    roleLabelKo: '주동근 (주 타겟)',
    activePhases: ['middle', 'end'],
    anchorJoints: ['knee', 'ankle', 'heel', 'toe'],
    reasonKo:
      '텐던 스트레치·발목 리치·카프 레이즈에서 종골(뒤꿈치) 수직 트래킹을 유지하며 정교한 발목 분절을 담당합니다.',
  },
  {
    muscleGroupId: 'core-transversus',
    labelKo: '심부 코어·내전근 슬링 (천골 앵커 & 상체 수직 기둥 안정화)',
    labelEn: 'Deep Core & Adductor-Pelvic Floor Sling',
    catalogMuscleMatches: ['복횡근', '내전근', '코어 밸런스', '몸통', '장요근'],
    role: 'stabilizer',
    roleLabelKo: '안정화근 (코어·정렬 유지)',
    activePhases: ['start', 'middle', 'end'],
    anchorJoints: ['thoracic', 'lumbar', 'pelvis'],
    reasonKo:
      '하지가 스프링 저항을 밀고 돌아오는 동안 캐리지 천골(y=143)과 체어 좌골(y=108)이 흔들리지 않도록 중심을 잠급니다.',
  },
]);

function buildCorrectionFromLedger(
  id: FootworkLowerDiagramId,
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
// 1. REFORMER FOOTWORK & STRAP FROG (reformer-footwork-and-strap-frog)
// ============================================================================

const REFORMER_FOOTWORK_START_JOINTS: RigJointMap = freezeJoints({
  head: { x: 54, y: 132 },
  neck: { x: 70, y: 136 },
  shoulder: { x: 88, y: 138 },
  elbow: { x: 114, y: 140 },
  wrist: { x: 140, y: 142 },
  hand: { x: 152, y: 142 },
  thoracic: { x: 118, y: 140 },
  lumbar: { x: 146, y: 141 },
  pelvis: { x: 172, y: 143 },
  hip: { x: 178, y: 141 },
  knee: { x: 210, y: 94 },
  ankle: { x: 258, y: 120 },
  heel: { x: 256, y: 126 },
  toe: { x: 268, y: 112 },
  farShoulder: { x: 86, y: 136 },
  farElbow: { x: 112, y: 138 },
  farWrist: { x: 138, y: 140 },
  farHip: { x: 174, y: 139 },
  farKnee: { x: 206, y: 92 },
  farAnkle: { x: 254, y: 118 },
  farToe: { x: 264, y: 110 },
});

const REFORMER_FOOTWORK_MIDDLE_JOINTS: RigJointMap = freezeJoints({
  head: { x: 30, y: 132 },
  neck: { x: 46, y: 136 },
  shoulder: { x: 64, y: 138 },
  elbow: { x: 90, y: 140 },
  wrist: { x: 116, y: 142 },
  hand: { x: 128, y: 142 },
  thoracic: { x: 94, y: 140 },
  lumbar: { x: 122, y: 141 },
  pelvis: { x: 148, y: 143 },
  hip: { x: 154, y: 141 },
  knee: { x: 206, y: 128 },
  ankle: { x: 258, y: 120 },
  heel: { x: 256, y: 126 },
  toe: { x: 268, y: 112 },
  farShoulder: { x: 62, y: 136 },
  farElbow: { x: 88, y: 138 },
  farWrist: { x: 114, y: 140 },
  farHip: { x: 150, y: 139 },
  farKnee: { x: 202, y: 126 },
  farAnkle: { x: 254, y: 118 },
  farToe: { x: 264, y: 110 },
});

const REFORMER_FOOTWORK_END_JOINTS: RigJointMap = freezeJoints({
  head: { x: 52, y: 132 },
  neck: { x: 68, y: 136 },
  shoulder: { x: 86, y: 138 },
  elbow: { x: 112, y: 140 },
  wrist: { x: 138, y: 142 },
  hand: { x: 150, y: 142 },
  thoracic: { x: 116, y: 140 },
  lumbar: { x: 144, y: 141 },
  pelvis: { x: 170, y: 143 },
  hip: { x: 176, y: 141 },
  knee: { x: 208, y: 96 },
  ankle: { x: 258, y: 120 },
  heel: { x: 256, y: 126 },
  toe: { x: 268, y: 112 },
  farShoulder: { x: 84, y: 136 },
  farElbow: { x: 110, y: 138 },
  farWrist: { x: 136, y: 140 },
  farHip: { x: 172, y: 139 },
  farKnee: { x: 204, y: 94 },
  farAnkle: { x: 254, y: 118 },
  farToe: { x: 264, y: 110 },
});

const REFORMER_FOOTWORK_ALIGNMENTS: Record<VisualPhaseId, readonly JointAlignmentGuide[]> = {
  start: [
    {
      id: 'rf-footwork-start-tracking',
      labelKo: '풋바/스트랩 굴곡 홈 포지션 & 고관절-무릎-2번째 발가락 정렬',
      cueKo:
        '천골(y=143)을 캐리지에 수평 고정하고 두 번째 발가락-슬개골-고관절(ASIS)이 한 평면에서 일직선을 이루도록 세팅합니다.',
      kind: 'anchor-lock',
      from: pt(172, 143),
      to: pt(258, 120),
      targetAngleDeg: 90,
      cautionKo: '무릎이 안쪽(Valgus)으로 모이거나 꼬리뼈가 들리지 않게 주의합니다.',
    },
  ],
  middle: [
    {
      id: 'rf-footwork-middle-glide',
      labelKo: '캐리지 수평 활주(Δ24px) & 무릎 과신전 방지 신전 정점',
      cueKo:
        '날숨에 뒤꿈치·발볼(또는 스트랩)로 밀어내며 캐리지를 수평 활주하되, 무릎을 완전히 잠그지(Locking 금지) 않고 내전근·대퇴사두근으로 지지합니다.',
      kind: 'axis-line',
      from: pt(154, 141),
      to: pt(258, 120),
      targetAngleDeg: 172,
      cautionKo: '다리를 펼 때 허리가 캐리지에서 뜨지 않도록 하부 늑골을 닫습니다.',
    },
  ],
  end: [
    {
      id: 'rf-footwork-end-eccentric-return',
      labelKo: '스프링 편심성 감속 브레이크 & 홈 포지션 복귀',
      cueKo:
        '들숨에 스프링 장력을 버티며 스토퍼 직전 마지막 5cm를 속근육으로 부드럽게 감속해 굴곡 홈 포지션으로 돌아옵니다.',
      kind: 'neutral-zone',
      from: pt(170, 143),
      to: pt(258, 120),
      cautionKo: '복귀 시 캐리지가 스토퍼에 쿵 부딪히지 않게 제어합니다.',
    },
  ],
};

const REFORMER_FOOTWORK_VECTORS: Record<VisualPhaseId, readonly MovementDirectionVector[]> = {
  start: [
    {
      id: 'vec-rf-footwork-setup',
      labelKo: '풋바 지지점 고정 & 천골 캐리지 앵커링',
      kind: 'axial-lengthening',
      points: [pt(258, 120), pt(172, 143)],
      phaseScope: 'start',
    },
  ],
  middle: [
    {
      id: 'vec-rf-footwork-carriage-push',
      labelKo: '폐쇄사슬 캐리지 수평 푸시 & 무릎 신전 (pelvis x:172→148)',
      kind: 'carriage-travel',
      points: [pt(172, 143), pt(148, 143)],
      phaseScope: 'start-to-middle',
    },
  ],
  end: [
    {
      id: 'vec-rf-footwork-eccentric-home',
      labelKo: '스프링 편심성 제어 홈 복귀 (pelvis x:148→170)',
      kind: 'return-control',
      points: [pt(148, 143), pt(170, 143)],
      phaseScope: 'middle-to-end',
    },
  ],
};

// ============================================================================
// 2. ANKLE PLANTAR / DORSIFLEXION ARTICULATION (ankle-plantar-dorsiflexion-articulation)
// ============================================================================

const ANKLE_ARTICULATION_START_JOINTS: RigJointMap = freezeJoints({
  head: { x: 146, y: 26 },
  neck: { x: 146, y: 44 },
  shoulder: { x: 146, y: 62 },
  elbow: { x: 118, y: 84 },
  wrist: { x: 96, y: 80 },
  hand: { x: 88, y: 76 },
  thoracic: { x: 146, y: 84 },
  lumbar: { x: 146, y: 102 },
  pelvis: { x: 146, y: 116 },
  hip: { x: 146, y: 118 },
  knee: { x: 148, y: 146 },
  ankle: { x: 148, y: 170 },
  heel: { x: 142, y: 174 },
  toe: { x: 164, y: 176 },
  farShoulder: { x: 144, y: 62 },
  farElbow: { x: 116, y: 82 },
  farWrist: { x: 94, y: 78 },
  farHip: { x: 144, y: 118 },
  farKnee: { x: 146, y: 146 },
  farAnkle: { x: 146, y: 170 },
  farToe: { x: 160, y: 176 },
});

const ANKLE_ARTICULATION_MIDDLE_JOINTS: RigJointMap = freezeJoints({
  head: { x: 148, y: 16 },
  neck: { x: 148, y: 34 },
  shoulder: { x: 148, y: 52 },
  elbow: { x: 118, y: 84 },
  wrist: { x: 96, y: 80 },
  hand: { x: 88, y: 76 },
  thoracic: { x: 148, y: 74 },
  lumbar: { x: 148, y: 92 },
  pelvis: { x: 148, y: 106 },
  hip: { x: 148, y: 108 },
  knee: { x: 150, y: 136 },
  ankle: { x: 152, y: 158 },
  heel: { x: 146, y: 160 },
  toe: { x: 164, y: 176 },
  farShoulder: { x: 146, y: 52 },
  farElbow: { x: 116, y: 82 },
  farWrist: { x: 94, y: 78 },
  farHip: { x: 146, y: 108 },
  farKnee: { x: 148, y: 136 },
  farAnkle: { x: 150, y: 158 },
  farToe: { x: 160, y: 176 },
});

const ANKLE_ARTICULATION_END_JOINTS: RigJointMap = freezeJoints({
  head: { x: 146, y: 24 },
  neck: { x: 146, y: 42 },
  shoulder: { x: 146, y: 60 },
  elbow: { x: 118, y: 84 },
  wrist: { x: 96, y: 80 },
  hand: { x: 88, y: 76 },
  thoracic: { x: 146, y: 82 },
  lumbar: { x: 146, y: 100 },
  pelvis: { x: 146, y: 114 },
  hip: { x: 146, y: 116 },
  knee: { x: 148, y: 144 },
  ankle: { x: 148, y: 168 },
  heel: { x: 140, y: 175 },
  toe: { x: 164, y: 176 },
  farShoulder: { x: 144, y: 60 },
  farElbow: { x: 116, y: 82 },
  farWrist: { x: 94, y: 78 },
  farHip: { x: 144, y: 116 },
  farKnee: { x: 146, y: 144 },
  farAnkle: { x: 146, y: 168 },
  farToe: { x: 160, y: 176 },
});

const ANKLE_ARTICULATION_ALIGNMENTS: Record<VisualPhaseId, readonly JointAlignmentGuide[]> = {
  start: [
    {
      id: 'ankle-art-start-tripod',
      labelKo: '기구/지지면 고정 & 발볼(164,176)-뒤꿈치(142,174) 수평 세팅',
      cueKo:
        '래더 가로대·체어·캐딜락 테이블에서 근위 슬관절·고관절 축을 안정시키고 엄지발볼과 둘째 발볼에 체중을 고르게 배분합니다.',
      kind: 'plumb-line',
      from: pt(146, 26),
      to: pt(148, 170),
      targetAngleDeg: 90,
      cautionKo: '새끼발가락 쪽으로 체중이 쏠려 발목이 외측으로 꺾이지(Sickling) 않게 합니다.',
    },
  ],
  middle: [
    {
      id: 'ankle-art-middle-plantar',
      labelKo: '거퇴관절 저측굴곡(Plantarflexion +30°) & 종골 수직 상승',
      cueKo:
        '손 지지(88,76)와 발볼(164,176)을 고정한 채 종골(뒤꿈치 y:174→160)을 수직 중심선 위로 들어 올려 비복근·가자미근을 수축합니다.',
      kind: 'angle-arc',
      from: pt(164, 176),
      to: pt(146, 160),
      targetAngleDeg: 30,
      cautionKo: '뒤꿈치를 올릴 때 상체가 앞으로 쏟아지거나 무릎이 꺾이지 않게 유지합니다.',
    },
  ],
  end: [
    {
      id: 'ankle-art-end-dorsi-eccentric',
      labelKo: '배측굴곡(Dorsiflexion) & 아킬레스건·종아리 편심성 신장 하강',
      cueKo:
        '정수리는 천장으로 계속 뻗어 올리는 반대 저항(Opposition) 속에서 뒤꿈치(y:160→175)를 천천히 길게 내려놓습니다.',
      kind: 'anchor-lock',
      from: pt(88, 76),
      to: pt(164, 176),
      cautionKo: '바닥에 닿기 직전 털썩 떨어지지 않도록 끝까지 편심성 감속을 유지합니다.',
    },
  ],
};

const ANKLE_ARTICULATION_VECTORS: Record<VisualPhaseId, readonly MovementDirectionVector[]> = {
  start: [
    {
      id: 'vec-ankle-art-setup',
      labelKo: '근위 무릎·골반 수직축 고정 & 발볼 앵커링',
      kind: 'axial-lengthening',
      points: [pt(164, 176), pt(146, 26)],
      phaseScope: 'start',
    },
  ],
  middle: [
    {
      id: 'vec-ankle-art-plantar-rise',
      labelKo: '종골 수직 상승 & 족저굴곡 리치 (heel y:174→160)',
      kind: 'limb-excursion',
      points: [pt(142, 174), pt(146, 160)],
      phaseScope: 'start-to-middle',
    },
  ],
  end: [
    {
      id: 'vec-ankle-art-dorsi-lower',
      labelKo: '비복근·가자미근 편심성 배굴 하강 (heel y:160→175)',
      kind: 'return-control',
      points: [pt(146, 160), pt(140, 175)],
      phaseScope: 'middle-to-end',
    },
  ],
};

// ============================================================================
// 3. CHAIR PEDAL PRESS & CALF RAISE (chair-pedal-press-and-calf-raise)
// ============================================================================

const CHAIR_PEDAL_START_JOINTS: RigJointMap = freezeJoints({
  head: { x: 132, y: 26 },
  neck: { x: 132, y: 40 },
  shoulder: { x: 132, y: 56 },
  elbow: { x: 124, y: 80 },
  wrist: { x: 130, y: 100 },
  hand: { x: 136, y: 106 },
  thoracic: { x: 132, y: 74 },
  lumbar: { x: 132, y: 92 },
  pelvis: { x: 132, y: 108 },
  hip: { x: 140, y: 108 },
  knee: { x: 186, y: 94 },
  ankle: { x: 214, y: 134 },
  heel: { x: 210, y: 140 },
  toe: { x: 226, y: 132 },
  farShoulder: { x: 130, y: 56 },
  farElbow: { x: 122, y: 78 },
  farWrist: { x: 128, y: 98 },
  farHip: { x: 138, y: 108 },
  farKnee: { x: 182, y: 96 },
  farAnkle: { x: 210, y: 136 },
  farToe: { x: 222, y: 134 },
});

const CHAIR_PEDAL_MIDDLE_JOINTS: RigJointMap = freezeJoints({
  head: { x: 132, y: 24 },
  neck: { x: 132, y: 38 },
  shoulder: { x: 132, y: 54 },
  elbow: { x: 124, y: 80 },
  wrist: { x: 130, y: 100 },
  hand: { x: 136, y: 106 },
  thoracic: { x: 132, y: 72 },
  lumbar: { x: 132, y: 90 },
  pelvis: { x: 132, y: 108 },
  hip: { x: 140, y: 108 },
  knee: { x: 188, y: 126 },
  ankle: { x: 216, y: 166 },
  heel: { x: 212, y: 172 },
  toe: { x: 228, y: 164 },
  farShoulder: { x: 130, y: 54 },
  farElbow: { x: 122, y: 78 },
  farWrist: { x: 128, y: 98 },
  farHip: { x: 138, y: 108 },
  farKnee: { x: 184, y: 124 },
  farAnkle: { x: 212, y: 164 },
  farToe: { x: 224, y: 162 },
});

const CHAIR_PEDAL_END_JOINTS: RigJointMap = freezeJoints({
  head: { x: 132, y: 26 },
  neck: { x: 132, y: 40 },
  shoulder: { x: 132, y: 56 },
  elbow: { x: 124, y: 80 },
  wrist: { x: 130, y: 100 },
  hand: { x: 136, y: 106 },
  thoracic: { x: 132, y: 74 },
  lumbar: { x: 132, y: 92 },
  pelvis: { x: 132, y: 108 },
  hip: { x: 140, y: 108 },
  knee: { x: 186, y: 98 },
  ankle: { x: 214, y: 138 },
  heel: { x: 210, y: 144 },
  toe: { x: 226, y: 136 },
  farShoulder: { x: 130, y: 56 },
  farElbow: { x: 122, y: 78 },
  farWrist: { x: 128, y: 98 },
  farHip: { x: 138, y: 108 },
  farKnee: { x: 182, y: 100 },
  farAnkle: { x: 210, y: 140 },
  farToe: { x: 222, y: 138 },
});

const CHAIR_PEDAL_ALIGNMENTS: Record<VisualPhaseId, readonly JointAlignmentGuide[]> = {
  start: [
    {
      id: 'chair-pedal-start-stack',
      labelKo: '운다 체어 시트 좌골(132,108) 수직 착석 & 상단 페달 발 세팅',
      cueKo:
        '양쪽 좌골을 시트 중앙에 수직으로 꽂아 척추 기둥(x=132)을 세우고 발볼/뒤꿈치를 페달(214,134)에 안정적으로 얹습니다.',
      kind: 'plumb-line',
      from: pt(132, 26),
      to: pt(132, 108),
      targetAngleDeg: 90,
      cautionKo: '다리를 올릴 때 골반이 뒤로 말려 요추가 무너지지 않게 합니다.',
    },
  ],
  middle: [
    {
      id: 'chair-pedal-middle-press',
      labelKo: '스프링 페달 하방 프레스(y:134→166) & 정수리 반대 신장',
      cueKo:
        '날숨에 페달을 바닥 쪽(y=166)으로 밟아 내리는 동시에 정수리는 천장(y=24)으로 더 길게 뻗어 상체 흔들림을 0으로 유지합니다.',
      kind: 'axis-line',
      from: pt(132, 24),
      to: pt(216, 166),
      targetAngleDeg: 28,
      cautionKo: '교대 페달 및 프레스 중 골반이 좌우로 회전하지 않도록 복횡근을 조입니다.',
    },
  ],
  end: [
    {
      id: 'chair-pedal-end-eccentric',
      labelKo: '햄스트링·둔근 편심성 제어로 페달 상방 복귀 (튕김 방지)',
      cueKo:
        '들숨에 스프링이 페달을 급격히 밀어 올리지 못하도록 허벅지 뒤쪽과 아랫배 브레이크로 천천히 시작 높이(y=138)까지 되돌립니다.',
      kind: 'anchor-lock',
      from: pt(132, 108),
      to: pt(214, 138),
      cautionKo: '페달이 올라올 때 상체가 뒤로 젖혀지지 않게 좌골 중심을 지킵니다.',
    },
  ],
};

const CHAIR_PEDAL_VECTORS: Record<VisualPhaseId, readonly MovementDirectionVector[]> = {
  start: [
    {
      id: 'vec-chair-pedal-axial',
      labelKo: '좌골 수직 지지 & 정수리 상방 신장',
      kind: 'axial-lengthening',
      points: [pt(132, 108), pt(132, 26)],
      phaseScope: 'start',
    },
  ],
  middle: [
    {
      id: 'vec-chair-pedal-down-press',
      labelKo: '운다 체어 스프링 페달 하방 프레스 (ankle y:134→166)',
      kind: 'spring-resistance',
      points: [pt(214, 134), pt(216, 166)],
      phaseScope: 'start-to-middle',
    },
  ],
  end: [
    {
      id: 'vec-chair-pedal-eccentric-up',
      labelKo: '페달 상방 편심성 감속 복귀 (ankle y:166→138)',
      kind: 'return-control',
      points: [pt(216, 166), pt(214, 138)],
      phaseScope: 'middle-to-end',
    },
  ],
};

// ============================================================================
// 4. STANDING LUNGE, SPLITS & HIP ABDUCTION (standing-lunge-splits-and-hip-abduction)
// ============================================================================

const STANDING_LOWER_START_JOINTS: RigJointMap = freezeJoints({
  head: { x: 138, y: 38 },
  neck: { x: 136, y: 54 },
  shoulder: { x: 134, y: 70 },
  elbow: { x: 112, y: 84 },
  wrist: { x: 96, y: 80 },
  hand: { x: 88, y: 76 },
  thoracic: { x: 138, y: 90 },
  lumbar: { x: 140, y: 110 },
  pelvis: { x: 142, y: 124 },
  hip: { x: 144, y: 126 },
  knee: { x: 162, y: 146 },
  ankle: { x: 174, y: 168 },
  heel: { x: 168, y: 174 },
  toe: { x: 184, y: 174 },
  farShoulder: { x: 132, y: 70 },
  farElbow: { x: 110, y: 82 },
  farWrist: { x: 94, y: 78 },
  farHip: { x: 138, y: 126 },
  farKnee: { x: 138, y: 150 },
  farAnkle: { x: 138, y: 172 },
  farToe: { x: 148, y: 174 },
});

const STANDING_LOWER_MIDDLE_JOINTS: RigJointMap = freezeJoints({
  head: { x: 134, y: 40 },
  neck: { x: 132, y: 56 },
  shoulder: { x: 130, y: 72 },
  elbow: { x: 110, y: 84 },
  wrist: { x: 96, y: 80 },
  hand: { x: 88, y: 76 },
  thoracic: { x: 136, y: 92 },
  lumbar: { x: 140, y: 110 },
  pelvis: { x: 142, y: 124 },
  hip: { x: 146, y: 126 },
  knee: { x: 190, y: 136 },
  ankle: { x: 232, y: 144 },
  heel: { x: 226, y: 148 },
  toe: { x: 242, y: 146 },
  farShoulder: { x: 128, y: 72 },
  farElbow: { x: 108, y: 82 },
  farWrist: { x: 94, y: 78 },
  farHip: { x: 138, y: 126 },
  farKnee: { x: 138, y: 150 },
  farAnkle: { x: 138, y: 172 },
  farToe: { x: 148, y: 174 },
});

const STANDING_LOWER_END_JOINTS: RigJointMap = freezeJoints({
  head: { x: 138, y: 38 },
  neck: { x: 136, y: 54 },
  shoulder: { x: 134, y: 70 },
  elbow: { x: 112, y: 84 },
  wrist: { x: 96, y: 80 },
  hand: { x: 88, y: 76 },
  thoracic: { x: 138, y: 90 },
  lumbar: { x: 140, y: 110 },
  pelvis: { x: 142, y: 124 },
  hip: { x: 144, y: 126 },
  knee: { x: 164, y: 146 },
  ankle: { x: 176, y: 168 },
  heel: { x: 170, y: 174 },
  toe: { x: 186, y: 174 },
  farShoulder: { x: 132, y: 70 },
  farElbow: { x: 110, y: 82 },
  farWrist: { x: 94, y: 78 },
  farHip: { x: 138, y: 126 },
  farKnee: { x: 138, y: 150 },
  farAnkle: { x: 138, y: 172 },
  farToe: { x: 148, y: 174 },
});

const STANDING_LOWER_ALIGNMENTS: Record<VisualPhaseId, readonly JointAlignmentGuide[]> = {
  start: [
    {
      id: 'standing-lower-start-knee-over-foot',
      labelKo: '지지측 무릎(138,150)-발목(138,172) 수직 기둥 & 골반 수평 세팅',
      cueKo:
        '지지하는 앞다리(또는 바닥 다리)의 무릎을 두 번째 발가락 수직선 위에 고정하고 양쪽 골반(ASIS y=124) 높이를 수평으로 맞춥니다.',
      kind: 'plumb-line',
      from: pt(138, 126),
      to: pt(138, 174),
      targetAngleDeg: 90,
      cautionKo: '지지 다리 골반이 옆으로 빠지는 트렌델렌버그(Pelvic drop) 보상을 막습니다.',
    },
  ],
  middle: [
    {
      id: 'standing-lower-middle-dissociation',
      labelKo: '지지 무릎 고정(Δ0px) · 가동 다리 스쿠터/런지/스플릿/클램 확장',
      cueKo:
        '지지측 무릎(farKnee 138,150)과 요추 중립을 고정한 채 중둔근·대둔근 수축으로 가동 다리(ankle 174,168→232,144)를 길게 밀어냅니다.',
      kind: 'axis-line',
      from: pt(142, 124),
      to: pt(232, 144),
      targetAngleDeg: 18,
      cautionKo: '다리를 멀리 보내기 위해 허리를 꺾거나 몸통을 함께 돌리지 않습니다.',
    },
  ],
  end: [
    {
      id: 'standing-lower-end-return',
      labelKo: '골반 수평 유지 & 중둔근·내전근 편심 제어 복귀',
      cueKo:
        '상체 바운스 없이 지지 다리 둔근과 내전근 힘으로 캐리지/가동 다리를 홈 위치(ankle 176,168)로 부드럽게 회수합니다.',
      kind: 'anchor-lock',
      from: pt(88, 76),
      to: pt(138, 172),
      cautionKo: '마지막 복귀 순간까지 지지측 발바닥 삼각대 압력을 지킵니다.',
    },
  ],
};

const STANDING_LOWER_VECTORS: Record<VisualPhaseId, readonly MovementDirectionVector[]> = {
  start: [
    {
      id: 'vec-standing-lower-support',
      labelKo: '지지측 발목-무릎-골반 수직 기둥 고정',
      kind: 'axial-lengthening',
      points: [pt(138, 172), pt(142, 124), pt(138, 38)],
      phaseScope: 'start',
    },
  ],
  middle: [
    {
      id: 'vec-standing-lower-excursion',
      labelKo: '가동 하지 고관절 신전·외전 활주 (ankle 174,168→232,144)',
      kind: 'limb-excursion',
      points: [pt(174, 168), pt(232, 144)],
      phaseScope: 'start-to-middle',
    },
  ],
  end: [
    {
      id: 'vec-standing-lower-return',
      labelKo: '지지 축 흔들림 없는 가동 다리 제어 회수 (232,144→176,168)',
      kind: 'return-control',
      points: [pt(232, 144), pt(176, 168)],
      phaseScope: 'middle-to-end',
    },
  ],
};

interface BuildFootworkLowerAssetParams {
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
  readonly carriageOffsets: readonly [number, number, number];
  readonly pedalAngles: readonly [number, number, number];
  readonly phaseTitlesKo: readonly [string, string, string];
  readonly phaseSummariesKo: readonly [string, string, string];
  readonly breathCuesKo: readonly [string, string, string];
  readonly alignments: Record<VisualPhaseId, readonly JointAlignmentGuide[]>;
  readonly directionVectors: Record<VisualPhaseId, readonly MovementDirectionVector[]>;
  readonly poseDeltaSummary: CatalogMovementVisualAsset['poseDeltaSummary'];
  readonly mobileSummaryBulletsKo: readonly [string, string, string];
}

function buildFootworkLowerVisualAsset(
  params: BuildFootworkLowerAssetParams,
): VerifiedFootworkLowerVisualAsset {
  const makeFixedAnchors = (joints: RigJointMap) =>
    Object.freeze([
      Object.freeze({
        joint: 'pelvis' as const,
        surfaceKo: '골반 중립·수평 고정 앵커 (Pelvic Levelness)',
        point: joints.pelvis,
      }),
      Object.freeze({
        joint: (params.bodyPosition === 'standing' ? 'farAnkle' : 'ankle') as keyof RigJointMap,
        surfaceKo:
          params.apparatus === 'reformer' && params.bodyPosition === 'supine'
            ? '리포머 풋바/스트랩 폐쇄사슬 지지점'
            : params.apparatus === 'chair'
              ? '운다 체어 페달/바닥 지지점'
              : '지지측 발목·발볼 삼각 접지 앵커',
        point: (params.bodyPosition === 'standing' ? joints.farAnkle : joints.ankle) ?? joints.ankle,
      }),
    ]);

  const movingJoints: readonly (keyof RigJointMap)[] = Object.freeze([
    'hip',
    'knee',
    'ankle',
    'heel',
    'toe',
    'pelvis',
    'thoracic',
  ]);

  const supportSurfaceKo =
    params.apparatus === 'reformer' && params.bodyPosition === 'supine'
      ? '리포머 수파인 캐리지(천골 y=143) & 우측 풋바/스트랩 지지면'
      : params.apparatus === 'chair'
        ? '운다 체어 시트(y=108) & 스프링 페달(y=134..166) 지지면'
        : params.bodyPosition === 'standing'
          ? '스탠딩 바닥/플랫폼 지지 다리(x=138) & 기구 가동 지지면'
          : '거퇴관절(발목) 분절 및 하지 정렬 지지면';

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
      carriageOffsetPx: params.carriageOffsets[0],
      pedalAngleDeg: params.pedalAngles[0],
      springTensionLevel:
        params.apparatus === 'mat' || params.apparatus === 'barrel' ? 'none' : 'high',
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
      carriageOffsetPx: params.carriageOffsets[1],
      pedalAngleDeg: params.pedalAngles[1],
      springTensionLevel:
        params.apparatus === 'mat' || params.apparatus === 'barrel' ? 'none' : 'high',
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
      carriageOffsetPx: params.carriageOffsets[2],
      pedalAngleDeg: params.pedalAngles[2],
      springTensionLevel:
        params.apparatus === 'mat' || params.apparatus === 'barrel' ? 'none' : 'high',
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
    verification: FOOTWORK_LOWER_VERIFICATION,
    phases: Object.freeze({
      start: startPhase,
      middle: middlePhase,
      end: endPhase,
    }),
    primaryMuscles: FOOTWORK_LOWER_MUSCLE_HIGHLIGHTS,
    poseDeltaSummary: Object.freeze(params.poseDeltaSummary),
    mobileSummaryBulletsKo: Object.freeze(params.mobileSummaryBulletsKo),
  });
}

const REFORMER_FOOTWORK_SPEC: FootworkLowerDiagramSpec = Object.freeze({
  id: 'reformer-footwork-and-strap-frog',
  catalogExerciseIds: Object.freeze([
    'original-reformer-parallel-footwork',
    'original-reformer-strap-frog',
    'ex-footwork-01',
    'ex-footwork-02',
    'ex-kr-reformer-01',
    'ex-global-reformer-01',
  ]),
  mappedExerciseIds: Object.freeze([
    'reformer-footwork-and-strap-frog',
    'original-reformer-parallel-footwork',
    'original-reformer-strap-frog',
    'ex-footwork-01',
    'ex-footwork-02',
    'ex-kr-reformer-01',
    'ex-global-reformer-01',
  ]),
  primaryCatalogExerciseId: 'ex-footwork-01',
  nameKo: '리포머 수파인 풋워크 & 스트랩 프로그 (Reformer Footwork & Strap Frog)',
  nameEn: 'Reformer Supine Closed-Chain Footwork & Feet-in-Straps Frog',
  subtitleKo:
    '풋바/스트랩 굴곡 홈(천골 y=143) → 고관절-무릎-2번째 발가락 일직선 캐리지 활주(Δ24px) → 편심성 브레이크 복귀',
  archetypeId: 'reformer-footwork-and-strap-frog-isolated',
  archetypeTitleKo: '리포머 수파인 풋워크·스트랩 프로그 · 2번째 발가락 트래킹 & 캐리지 활주',
  matBaselineY: 148,
  kinematicMetrics: Object.freeze({
    carriageTravelPx: 24,
    pelvicLevelnessHold: true,
    secondToeTrackingAligned: true,
  }),
  jointAxes: Object.freeze([
    {
      id: 'rf-hip-knee-toe-axis',
      labelKo: '고관절-무릎-두 번째 발가락(2nd Toe) 폐쇄사슬 트래킹 축',
      role: 'hip-knee-second-toe-tracking',
      point: pt(206, 128),
      referenceLineFrom: pt(154, 141),
      referenceLineTo: pt(268, 112),
      descriptionKo:
        '캐리지를 밀고 돌아오는 전 구간에서 무릎이 안쪽으로 모이거나 과신전되지 않게 일직선 축을 유지합니다.',
    },
  ] as const),
  contactPoints: Object.freeze([
    {
      id: 'rf-contact-footbar',
      labelKo: '우측 풋바 / 롱스트랩 발 접점 (258,120)',
      joint: 'ankle',
      kind: 'footbar-or-strap-contact',
      point: pt(258, 120),
      phases: ['start', 'middle', 'end'],
    },
    {
      id: 'rf-contact-sacrum',
      labelKo: '슬라이딩 캐리지 위 천골 수평 앵커 (y=143)',
      joint: 'pelvis',
      kind: 'carriage-sacral-anchor',
      point: pt(172, 143),
      phases: ['start', 'middle', 'end'],
    },
  ] as const),
  calloutLabels: Object.freeze([
    {
      id: 'rf-callout-start',
      phaseId: 'start',
      textKo: '천골(y=143) 고정 & 무릎-2번째 발가락 정렬',
      anchor: pt(210, 94),
      badgePosition: pt(102, 36),
      tone: 'anchor',
    },
    {
      id: 'rf-callout-middle',
      phaseId: 'middle',
      textKo: '캐리지 수평 활주(Δ24px) & 무릎 과신전 방지',
      anchor: pt(206, 128),
      badgePosition: pt(88, 36),
      tone: 'excursion',
    },
    {
      id: 'rf-callout-end',
      phaseId: 'end',
      textKo: '마지막 5cm 편심성 브레이크 홈 복귀',
      anchor: pt(170, 143),
      badgePosition: pt(96, 38),
      tone: 'breath',
    },
  ] as const),
  trajectoryOverlays: Object.freeze([
    {
      id: 'rf-overlay-carriage-glide',
      labelKo: '리포머 캐리지 수평 왕복 활주 궤적 (Δ24px)',
      kind: 'reformer-carriage-glide',
      phaseId: 'middle',
      svgPathD: 'M 172 143 L 148 143',
      startPoint: pt(172, 143),
      endPoint: pt(148, 143),
      deltaVector: Object.freeze([-24, 0] as const),
    },
  ] as const),
  asset: buildFootworkLowerVisualAsset({
    exerciseId: 'ex-footwork-01',
    nameKo: '리포머 클래식 풋워크 4종 & 스트랩 프로그 시리즈',
    nameEn: 'Reformer Footwork Series (Heels, Arches, Pilates V, Frog)',
    apparatus: 'reformer',
    bodyPosition: 'supine',
    blockCategory: 'footwork',
    spinalPlanes: ['neutral'],
    isUnilateral: false,
    archetypeId: 'reformer-footwork-and-strap-frog-isolated',
    archetypeTitleKo: '리포머 수파인 풋워크·스트랩 프로그 · 2번째 발가락 트래킹 & 캐리지 활주',
    startJoints: REFORMER_FOOTWORK_START_JOINTS,
    middleJoints: REFORMER_FOOTWORK_MIDDLE_JOINTS,
    endJoints: REFORMER_FOOTWORK_END_JOINTS,
    carriageOffsets: [4, 28, 6],
    pedalAngles: [0, 0, 0],
    phaseTitlesKo: [
      '풋바/스트랩 굴곡 홈 포지션 & 천골(y=143) 수평 세팅',
      '고관절-무릎-2번째 발가락 일직선 캐리지 활주 신전',
      '스프링 편심성 감속 제어로 굴곡 홈 포지션 복귀',
    ],
    phaseSummariesKo: [
      '리포머 캐리지에 누워 천골(y=143)을 무겁게 붙이고 양발을 풋바(또는 스트랩 프로그)에 두어 고관절-무릎-두 번째 발가락 정렬을 맞춥니다.',
      '날숨에 천골 수평을 유지한 채 뒤꿈치·내전근·대퇴사두근 힘으로 캐리지를 수평으로 밀어냅니다(pelvis x:172→148, 무릎 잠금 금지).',
      '들숨에 스프링에 끌려가지 않도록 마지막 5cm를 속근육 브레이크로 감속하며 굴곡 홈 포지션으로 조용히 복귀합니다.',
    ],
    breathCuesKo: [
      '들숨 준비: 천골(y=143) 수평 안착 및 두 번째 발가락-슬개골 정렬 확인',
      '날숨 푸시: 허벅지 안쪽 지퍼를 채우듯 길게 밀어 캐리지 확장',
      '들숨 복귀: 스토퍼 충격 없이 속근육 브레이크로 홈 포지션 회수',
    ],
    alignments: REFORMER_FOOTWORK_ALIGNMENTS,
    directionVectors: REFORMER_FOOTWORK_VECTORS,
    poseDeltaSummary: {
      startToMiddleKo:
        '우측 풋바 발 지지점(ankle 258,120)을 민 반력으로 슬라이딩 캐리지와 천골(pelvis x:172→148, y=143 유지)이 수평 활주하며 무릎(knee y:94→128)이 신전됩니다.',
      middleToEndKo:
        '천골 높이(y=143) 흔들림 없이 무릎을 접어 캐리지(pelvis x:148→170)를 시작 홈 포지션으로 감속 복귀합니다.',
      invariantAnchorsKo:
        '풋바 발 접점(ankle 258,120)과 캐리지 위 천골 수평 높이(pelvis y:143)가 전 구간 유지됩니다.',
      keyJointChangeKo:
        '2번째 발가락 트래킹 유지 아래 폐쇄사슬 슬관절 굴신(knee dy +34px) + 캐리지 수평 활주(Δ24px)',
    },
    mobileSummaryBulletsKo: [
      '시작 정렬: 천골(y=143) 캐리지 밀착 & 고관절-무릎-2번째 발가락 일직선',
      '중간 푸시: 무릎 과신전(Locking) 없이 캐리지 수평 활주(Δ24px) 및 내전근 연결',
      '제어 복귀: 스토퍼 직전 5cm 편심성 감속으로 굴곡 홈 포지션 안착',
    ],
  }),
  correction: buildCorrectionFromLedger('reformer-footwork-and-strap-frog'),
});

const ANKLE_ARTICULATION_SPEC: FootworkLowerDiagramSpec = Object.freeze({
  id: 'ankle-plantar-dorsiflexion-articulation',
  catalogExerciseIds: Object.freeze([
    'original-barrel-supported-ankle',
    'original-mat-ankle-reach',
    'original-cadillac-table-ankle',
    'ex-footwork-03',
  ]),
  mappedExerciseIds: Object.freeze([
    'ankle-plantar-dorsiflexion-articulation',
    'original-barrel-supported-ankle',
    'original-mat-ankle-reach',
    'original-cadillac-table-ankle',
    'ex-footwork-03',
  ]),
  primaryCatalogExerciseId: 'original-barrel-supported-ankle',
  nameKo: '거퇴관절(발목) 저굴·배굴 분절 & 텐던 스트레치 (Ankle Flex-Point Articulation)',
  nameEn: 'Talocrural Plantar/Dorsiflexion, Tendon Stretch & Ankle Reach',
  subtitleKo:
    '근위 무릎·골반 축 고정 & 발볼(164,176) 지지 → 종골 수직 상승(저측굴곡 +30°) → 아킬레스건·비복근 편심성 배굴 하강',
  archetypeId: 'ankle-plantar-dorsiflexion-articulation-isolated',
  archetypeTitleKo: '거퇴관절 저굴·배굴 분절 · 종골 수직 트래킹 & 비복근 편심 신장',
  matBaselineY: 178,
  kinematicMetrics: Object.freeze({
    ankleFlexPointRangeDeg: Object.freeze([-15, 30] as const),
    pelvicLevelnessHold: true,
    secondToeTrackingAligned: true,
  }),
  jointAxes: Object.freeze([
    {
      id: 'ankle-talocrural-hinge-axis',
      labelKo: '거퇴관절(Talocrural) 저굴↔배굴 힌지 & 종골 수직 축',
      role: 'talocrural-flex-point-axis',
      point: pt(148, 170),
      referenceLineFrom: pt(142, 174),
      referenceLineTo: pt(164, 176),
      descriptionKo:
        '발목이 안팎으로 꺾이지 않도록 엄지·둘째 발볼 중심 위에서 뒤꿈치(종골)를 수직으로 올리고 내립니다.',
    },
  ] as const),
  contactPoints: Object.freeze([
    {
      id: 'ankle-contact-forefoot',
      labelKo: '발볼(1st–2nd Metatarsal) 지지 앵커 (164,176)',
      joint: 'toe',
      kind: 'standing-foot-tripod',
      point: pt(164, 176),
      phases: ['start', 'middle', 'end'],
    },
    {
      id: 'ankle-contact-hand-support',
      labelKo: '래더 가로대 / 기구 손 지지 고정점 (88,76)',
      joint: 'hand',
      kind: 'chair-pedal-or-seat-contact',
      point: pt(88, 76),
      phases: ['start', 'middle', 'end'],
    },
  ] as const),
  calloutLabels: Object.freeze([
    {
      id: 'ankle-callout-start',
      phaseId: 'start',
      textKo: '기구 손 지지(88,76) & 발볼·뒤꿈치 수평 정렬',
      anchor: pt(148, 170),
      badgePosition: pt(76, 22),
      tone: 'anchor',
    },
    {
      id: 'ankle-callout-middle',
      phaseId: 'middle',
      textKo: '저측굴곡(+30°) 뒤꿈치 수직 상승 (꺾임 0°)',
      anchor: pt(146, 160),
      badgePosition: pt(74, 20),
      tone: 'excursion',
    },
    {
      id: 'ankle-callout-end',
      phaseId: 'end',
      textKo: '종아리·아킬레스건 편심성 배굴 감속 착지',
      anchor: pt(140, 175),
      badgePosition: pt(76, 22),
      tone: 'breath',
    },
  ] as const),
  trajectoryOverlays: Object.freeze([
    {
      id: 'ankle-overlay-flex-point',
      labelKo: '거퇴관절 저굴·배굴 종골 수직 궤적 (heel Δ14px)',
      kind: 'talocrural-flex-point-arc',
      phaseId: 'middle',
      svgPathD: 'M 142 174 L 146 160',
      startPoint: pt(142, 174),
      endPoint: pt(146, 160),
      deltaVector: Object.freeze([4, -14] as const),
    },
  ] as const),
  asset: buildFootworkLowerVisualAsset({
    exerciseId: 'original-barrel-supported-ankle',
    nameKo: '래더·매트·캐딜락·체어 발목 분절 & 텐던 스트레치',
    nameEn: 'Supported Talocrural Plantar/Dorsiflexion & Ankle Articulation',
    apparatus: 'barrel',
    bodyPosition: 'standing',
    blockCategory: 'footwork',
    spinalPlanes: ['neutral'],
    isUnilateral: false,
    archetypeId: 'ankle-plantar-dorsiflexion-articulation-isolated',
    archetypeTitleKo: '거퇴관절 저굴·배굴 분절 · 종골 수직 트래킹 & 비복근 편심 신장',
    startJoints: ANKLE_ARTICULATION_START_JOINTS,
    middleJoints: ANKLE_ARTICULATION_MIDDLE_JOINTS,
    endJoints: ANKLE_ARTICULATION_END_JOINTS,
    carriageOffsets: [0, 0, 0],
    pedalAngles: [0, 18, 0],
    phaseTitlesKo: [
      '기구 손 지지(88,76) & 양발 11자 평행 접지 세팅',
      '발볼 지지 고정 · 뒤꿈치 수직 상승(Plantarflexion +30°)',
      '비복근·가자미근 편심성 조절로 배측굴곡 감속 착지',
    ],
    phaseSummariesKo: [
      '래더 가로대·체어·매트·캐딜락 테이블에서 근위 무릎·골반 축과 손 지지점(88,76)을 고정하고 발볼(164,176)과 뒤꿈치(142,174)를 정렬합니다.',
      '불필요한 팔 스윕 없이 엄지·둘째 발볼을 누르며 뒤꿈치(heel y:174→160)와 정수리(y:26→16)를 수직으로 들어 올립니다.',
      '정수리 상방 신장을 유지하며 비복근·가자미근 편심성 제어로 뒤꿈치(y:160→175)를 길게 늘려 내려놓습니다.',
    ],
    breathCuesKo: [
      '들숨 준비: 두 번째 발가락-발목 중앙 정렬 및 정수리 수직 신장',
      '날숨 상승: 발볼로 바닥/페달을 밀어 뒤꿈치 수직 리프트(+30°)',
      '들숨 하강: 종아리 뒷면을 길게 늘리며 천천히 뒤꿈치 착지',
    ],
    alignments: ANKLE_ARTICULATION_ALIGNMENTS,
    directionVectors: ANKLE_ARTICULATION_VECTORS,
    poseDeltaSummary: {
      startToMiddleKo:
        '기구 지지 손(hand 88,76)과 발볼(toe 164,176)을 고정한 채 종골(heel y:174→160)과 신체 수직 기둥이 함께 상승합니다.',
      middleToEndKo:
        '발목 꺾임(Sickling) 없이 종아리 편심성 감속으로 뒤꿈치(heel y:160→175)를 바닥으로 내립니다.',
      invariantAnchorsKo:
        '기구 지지 손(hand 88,76)과 바닥 발볼(toe 164,176) 지지점이 전 구간 고정됩니다.',
      keyJointChangeKo:
        '오버헤드 팔 스윕 혼입을 제거한 순수 거퇴관절 저굴·배굴 분절(heel Δ14.6px)',
    },
    mobileSummaryBulletsKo: [
      '시작 정렬: 기구 손 지지 고정 & 엄지·둘째 발볼 중심 11자 정렬',
      '중간 저굴: 발목 외번/내번 없이 뒤꿈치 수직 상승(Plantarflexion +30°)',
      '편심 복귀: 정수리 키를 유지하며 아킬레스건·종아리 편심성 착지',
    ],
  }),
  correction: buildCorrectionFromLedger('ankle-plantar-dorsiflexion-articulation'),
});

const CHAIR_PEDAL_SPEC: FootworkLowerDiagramSpec = Object.freeze({
  id: 'chair-pedal-press-and-calf-raise',
  catalogExerciseIds: Object.freeze([
    'original-chair-seated-pedal-press',
    'original-chair-alternating-pedal',
    'original-chair-supported-calf-raise',
    'original-chair-sit-to-stand',
  ]),
  mappedExerciseIds: Object.freeze([
    'chair-pedal-press-and-calf-raise',
    'original-chair-seated-pedal-press',
    'original-chair-alternating-pedal',
    'original-chair-supported-calf-raise',
    'original-chair-sit-to-stand',
  ]),
  primaryCatalogExerciseId: 'original-chair-seated-pedal-press',
  nameKo: '운다 체어 페달 프레스·교대 펌프 & 시트-투-스탠드 (Wunda Chair Pedal & Transfer)',
  nameEn: 'Wunda Chair Seated/Alternating Pedal Press, Calf Raise & Sit-to-Stand',
  subtitleKo:
    '시트 좌골(132,108) 수직 착석 → 스프링 페달 하방 프레스(y:134→166) & 골반 항회전 → 편심성 제어 복귀',
  archetypeId: 'chair-pedal-press-and-calf-raise-isolated',
  archetypeTitleKo: '운다 체어 페달 프레스·교대 풋워크·시트 투 스탠드 · 좌골 고정 & 스프링 제어',
  matBaselineY: 178,
  kinematicMetrics: Object.freeze({
    pedalAngleRangeDeg: Object.freeze([8, 28] as const),
    pelvicLevelnessHold: true,
    secondToeTrackingAligned: true,
  }),
  jointAxes: Object.freeze([
    {
      id: 'chair-pedal-spring-axis',
      labelKo: '운다 체어 스프링 페달 힌지 & 좌골 수직 축 (x=132)',
      role: 'chair-pedal-spring-hinge',
      point: pt(132, 108),
      referenceLineFrom: pt(132, 24),
      referenceLineTo: pt(216, 166),
      descriptionKo:
        '좌골 위 척추 수직 기둥을 흔들림 없이 유지한 채 고관절·슬관절 굴신으로 페달을 밟고 제어 복귀합니다.',
    },
  ] as const),
  contactPoints: Object.freeze([
    {
      id: 'chair-contact-seat',
      labelKo: '운다 체어 시트 양측 좌골 수직 고정점 (132,108)',
      joint: 'pelvis',
      kind: 'chair-pedal-or-seat-contact',
      point: pt(132, 108),
      phases: ['start', 'middle', 'end'],
    },
    {
      id: 'chair-contact-pedal',
      labelKo: '운다 체어 스프링 페달 발 접점 (214,134→216,166)',
      joint: 'ankle',
      kind: 'chair-pedal-or-seat-contact',
      point: pt(216, 166),
      phases: ['start', 'middle', 'end'],
    },
  ] as const),
  calloutLabels: Object.freeze([
    {
      id: 'chair-callout-start',
      phaseId: 'start',
      textKo: '체어 시트 좌골(132,108) 수직 착석 & 페달 세팅',
      anchor: pt(132, 108),
      badgePosition: pt(72, 22),
      tone: 'anchor',
    },
    {
      id: 'chair-callout-middle',
      phaseId: 'middle',
      textKo: '페달 하방 프레스(y=166) & 골반 항회전 유지',
      anchor: pt(216, 166),
      badgePosition: pt(76, 20),
      tone: 'excursion',
    },
    {
      id: 'chair-callout-end',
      phaseId: 'end',
      textKo: '스프링 튕김 없는 햄스트링 편심성 복귀',
      anchor: pt(214, 138),
      badgePosition: pt(74, 22),
      tone: 'breath',
    },
  ] as const),
  trajectoryOverlays: Object.freeze([
    {
      id: 'chair-overlay-pedal-arc',
      labelKo: '운다 체어 스프링 페달 하방 프레스 & 편심 복귀 궤적 (Δ32px)',
      kind: 'chair-pedal-depression',
      phaseId: 'middle',
      svgPathD: 'M 214 134 Q 222 150 216 166',
      startPoint: pt(214, 134),
      endPoint: pt(216, 166),
      deltaVector: Object.freeze([2, 32] as const),
    },
  ] as const),
  asset: buildFootworkLowerVisualAsset({
    exerciseId: 'original-chair-seated-pedal-press',
    nameKo: '운다 체어 양발/교대 페달 프레스 & 카프 레이즈·시트 투 스탠드',
    nameEn: 'Wunda Chair Double/Alternating Pedal Press, Calf Raise & Sit-to-Stand',
    apparatus: 'chair',
    bodyPosition: 'seated',
    blockCategory: 'footwork',
    spinalPlanes: ['neutral'],
    isUnilateral: false,
    archetypeId: 'chair-pedal-press-and-calf-raise-isolated',
    archetypeTitleKo: '운다 체어 페달 프레스·교대 풋워크·시트 투 스탠드 · 좌골 고정 & 스프링 제어',
    startJoints: CHAIR_PEDAL_START_JOINTS,
    middleJoints: CHAIR_PEDAL_MIDDLE_JOINTS,
    endJoints: CHAIR_PEDAL_END_JOINTS,
    carriageOffsets: [0, 0, 0],
    pedalAngles: [28, 8, 26],
    phaseTitlesKo: [
      '체어 시트 좌골(132,108) 수직 착석 & 페달 상단 세팅',
      '상체 수직 유지 · 스프링 페달 하방 프레스(y:134→166)',
      '둔근·햄스트링 편심성 브레이크로 페달 상방 복귀',
    ],
    phaseSummariesKo: [
      '운다 체어 시트 위에 양쪽 좌골(132,108)을 수직으로 세워 앉고 양손(136,106)으로 시트를 지지한 채 페달(214,134) 위에 발을 얹습니다.',
      '날숨에 정수리는 천장(y=24)으로 길게 뻗고 복부 코르셋으로 골반 흔들림을 잠근 채 페달을 바닥 방향(ankle 216,166)으로 프레스합니다.',
      '들숨에 페달이 튕겨 올라오지 않도록 허벅지 뒤쪽과 둔근의 편심성 조절로 시작 높이(ankle 214,138)까지 천천히 제어 복귀합니다.',
    ],
    breathCuesKo: [
      '들숨 준비: 좌골 수직 착석 및 정수리 축성 신장 세팅',
      '날숨 프레스: 상체는 위로, 페달은 아래로 반대 저항(Opposition) 푸시',
      '들숨 복귀: 스프링 반동을 이기며 3카운트 편심성 페달 회수',
    ],
    alignments: CHAIR_PEDAL_ALIGNMENTS,
    directionVectors: CHAIR_PEDAL_VECTORS,
    poseDeltaSummary: {
      startToMiddleKo:
        '체어 시트 좌골(pelvis 132,108)과 상체 수직 기둥(head x:132)을 고정한 채 무릎 신전과 함께 페달 위 발목(ankle y:134→166)이 하방 프레스됩니다.',
      middleToEndKo:
        '골반 회전이나 상체 흔들림 없이 페달 위 발목(ankle y:166→138)과 무릎(knee y:126→98)을 편심성으로 제어 복귀합니다.',
      invariantAnchorsKo:
        '체어 시트 위 좌골(pelvis 132,108), 수직 척추 축(thoracic/lumbar x:132), 시트 지지 손(hand 136,106)이 고정됩니다.',
      keyJointChangeKo:
        '좌골 수직 고정 아래 운다 체어 스프링 페달 하방 프레스 및 편심 복귀(ankle Δ32px)',
    },
    mobileSummaryBulletsKo: [
      '시작 착석: 체어 시트 양측 좌골(132,108) 수직 고정 & 골반 수평 유지',
      '중간 프레스: 정수리 상방 신장 유지하며 페달 하방 프레스(ankle dy +32px)',
      '편심 복귀: 교대 펌프·시트 투 스탠드 전환 시 골반 항회전 및 감속 제어',
    ],
  }),
  correction: buildCorrectionFromLedger('chair-pedal-press-and-calf-raise'),
});

const STANDING_LOWER_SPEC: FootworkLowerDiagramSpec = Object.freeze({
  id: 'standing-lunge-splits-and-hip-abduction',
  catalogExerciseIds: Object.freeze([
    'original-barrel-standing-hip-extension',
    'original-barrel-standing-side-reach',
    'original-mat-clam',
    'ex-lower-01',
    'ex-lower-02',
    'ex-lower-03',
    'ex-kr-reformer-02',
  ]),
  mappedExerciseIds: Object.freeze([
    'standing-lunge-splits-and-hip-abduction',
    'original-barrel-standing-hip-extension',
    'original-barrel-standing-side-reach',
    'original-mat-clam',
    'ex-lower-01',
    'ex-lower-02',
    'ex-lower-03',
    'ex-kr-reformer-02',
  ]),
  primaryCatalogExerciseId: 'ex-lower-01',
  nameKo: '스탠딩 스쿠터·런지·사이드 스플릿 & 클램 (Standing Lunge, Splits & Clam)',
  nameEn: 'Standing Scooter, Lunge, Side Splits & Side-Lying Clam Dissociation',
  subtitleKo:
    '지지측 무릎-발목(x=138) 수직 고정 & 골반 수평 → 가동 다리 스쿠터/런지/스플릿/클램 확장(Δ63px) → 중둔근·내전근 제어 복귀',
  archetypeId: 'standing-lunge-splits-and-hip-abduction-isolated',
  archetypeTitleKo: '스탠딩 스쿠터·런지·사이드 스플릿·클램 · 지지 무릎 고정 & 중둔근 분리',
  matBaselineY: 176,
  kinematicMetrics: Object.freeze({
    carriageTravelPx: 58,
    standingSupportKneeAngleDeg: 150,
    pelvicLevelnessHold: true,
    secondToeTrackingAligned: true,
  }),
  jointAxes: Object.freeze([
    {
      id: 'standing-support-knee-plumb-axis',
      labelKo: '지지측 고관절-무릎-발목(x=138) 수직 고정 기둥',
      role: 'standing-support-knee-plumb',
      point: pt(138, 150),
      referenceLineFrom: pt(138, 126),
      referenceLineTo: pt(138, 174),
      descriptionKo:
        '가동 다리가 뒤나 옆으로 뻗어 나갈 때 지지측 무릎(138,150)은 1mm도 흔들리지 않고 두 번째 발가락 위를 지킵니다.',
    },
  ] as const),
  contactPoints: Object.freeze([
    {
      id: 'standing-contact-support-foot',
      labelKo: '바닥/플랫폼 지지 다리 발목 고정점 (138,172)',
      joint: 'farAnkle',
      kind: 'standing-foot-tripod',
      point: pt(138, 172),
      phases: ['start', 'middle', 'end'],
    },
    {
      id: 'standing-contact-hand-bar',
      labelKo: '풋바/래더 가로대 손 지지 고정점 (88,76)',
      joint: 'hand',
      kind: 'footbar-or-strap-contact',
      point: pt(88, 76),
      phases: ['start', 'middle', 'end'],
    },
  ] as const),
  calloutLabels: Object.freeze([
    {
      id: 'standing-callout-start',
      phaseId: 'start',
      textKo: '지지 다리 무릎(138,150) 고정 & 골반 수평(y=124)',
      anchor: pt(138, 150),
      badgePosition: pt(72, 22),
      tone: 'anchor',
    },
    {
      id: 'standing-callout-middle',
      phaseId: 'middle',
      textKo: '가동 다리 신전·외전 활주(232,144 · 허리 과신전 0°)',
      anchor: pt(232, 144),
      badgePosition: pt(76, 20),
      tone: 'excursion',
    },
    {
      id: 'standing-callout-end',
      phaseId: 'end',
      textKo: '중둔근·내전근 제어로 상체 바운스 없이 복귀',
      anchor: pt(176, 168),
      badgePosition: pt(74, 22),
      tone: 'breath',
    },
  ] as const),
  trajectoryOverlays: Object.freeze([
    {
      id: 'standing-overlay-excursion',
      labelKo: '스탠딩 스쿠터·런지·스플릿 가동 하지 확장 궤적 (Δ63px)',
      kind: 'standing-scooter-split-abduction',
      phaseId: 'middle',
      svgPathD: 'M 174 168 Q 204 156 232 144',
      startPoint: pt(174, 168),
      endPoint: pt(232, 144),
      deltaVector: Object.freeze([58, -24] as const),
    },
  ] as const),
  asset: buildFootworkLowerVisualAsset({
    exerciseId: 'ex-lower-01',
    nameKo: '리포머·체어·바렐 스탠딩 스쿠터·런지·사이드 스플릿 & 매트 클램',
    nameEn: 'Reformer/Chair/Barrel Standing Scooter, Lunge, Side Splits & Mat Clam',
    apparatus: 'reformer',
    bodyPosition: 'standing',
    blockCategory: 'lower-body',
    spinalPlanes: ['neutral', 'extension'],
    isUnilateral: true,
    archetypeId: 'standing-lunge-splits-and-hip-abduction-isolated',
    archetypeTitleKo: '스탠딩 스쿠터·런지·사이드 스플릿·클램 · 지지 무릎 고정 & 중둔근 분리',
    startJoints: STANDING_LOWER_START_JOINTS,
    middleJoints: STANDING_LOWER_MIDDLE_JOINTS,
    endJoints: STANDING_LOWER_END_JOINTS,
    carriageOffsets: [4, 42, 8],
    pedalAngles: [0, 22, 0],
    phaseTitlesKo: [
      '지지 다리 무릎(138,150)-2번째 발가락 정렬 & 골반 수평 세팅',
      '지지 축 고정 · 가동 다리 고관절 신전·외전 활주 정점',
      '중둔근·내전근 편심성 제어로 상체 바운스 없이 복귀',
    ],
    phaseSummariesKo: [
      '바닥/플랫폼 지지 다리(farAnkle 138,172, farKnee 138,150)에 체중의 80%를 싣고 골반(pelvis 142,124) 수평과 풋바/래더 손 지지(88,76)를 세팅합니다.',
      '지지측 무릎을 흔들림 없이 고정한 채 둔근·중둔근 힘으로 가동 다리(ankle 174,168→232,144)를 뒤·옆으로 길게 밀어냅니다(요추 과신전 0°).',
      '상체 높이가 위아래로 바운스되지 않게 유지하며 둔근·내전근 제어로 가동 다리(ankle 232,144→176,168)를 홈 위치로 회수합니다.',
    ],
    breathCuesKo: [
      '들숨 준비: 지지측 무릎-둘째 발가락 정렬 및 중둔근 체중 지지 세팅',
      '날숨 푸시/오픈: 지지 무릎 고정한 채 가동 다리 둔근 힘으로 길게 확장',
      '들숨 복귀: 골반 수평 유지하며 천천히 홈 위치로 감속 회수',
    ],
    alignments: STANDING_LOWER_ALIGNMENTS,
    directionVectors: STANDING_LOWER_VECTORS,
    poseDeltaSummary: {
      startToMiddleKo:
        '지지 다리(farKnee 138,150, farAnkle 138,172)와 골반(pelvis 142,124)을 고정한 채 가동 다리 발목(ankle 174,168→232,144)이 후방·외측으로 확장됩니다.',
      middleToEndKo:
        '골반 기울어짐이나 상체 회전 없이 가동 다리(ankle 232,144→176,168)를 지지 다리 옆 홈 위치로 제어 복귀합니다.',
      invariantAnchorsKo:
        '지지측 발목(farAnkle 138,172), 지지측 무릎(farKnee 138,150), 골반 수평 높이(pelvis y:124)가 고정됩니다.',
      keyJointChangeKo:
        '지지 무릎 고정(Δ0px) 아래 가동 하지 고관절 신전·외전 분리 활주(ankle Δ62.8px)',
    },
    mobileSummaryBulletsKo: [
      '시작 지지: 지지측 무릎-두 번째 발가락 수직 고정 & 양측 골반 수평 유지',
      '중간 확장: 지지 무릎 흔들림(0px) 없이 스쿠터·런지·스플릿·클램 고관절 확장',
      '제어 복귀: 허리 과신전·골반 롤링 없이 중둔근·내전근 힘으로 감속 회수',
    ],
  }),
  correction: buildCorrectionFromLedger('standing-lunge-splits-and-hip-abduction'),
});

export const FOOTWORK_LOWER_DIAGRAM_SPECS: Readonly<
  Record<FootworkLowerDiagramId, FootworkLowerDiagramSpec>
> = Object.freeze({
  'reformer-footwork-and-strap-frog': REFORMER_FOOTWORK_SPEC,
  'ankle-plantar-dorsiflexion-articulation': ANKLE_ARTICULATION_SPEC,
  'chair-pedal-press-and-calf-raise': CHAIR_PEDAL_SPEC,
  'standing-lunge-splits-and-hip-abduction': STANDING_LOWER_SPEC,
});

const EXERCISE_ID_TO_FOOTWORK_LOWER_DIAGRAM_ID: Readonly<
  Record<string, FootworkLowerDiagramId>
> = Object.freeze({
  // Diagram IDs
  'reformer-footwork-and-strap-frog': 'reformer-footwork-and-strap-frog',
  'ankle-plantar-dorsiflexion-articulation': 'ankle-plantar-dorsiflexion-articulation',
  'chair-pedal-press-and-calf-raise': 'chair-pedal-press-and-calf-raise',
  'standing-lunge-splits-and-hip-abduction': 'standing-lunge-splits-and-hip-abduction',

  // Group 1 (6 exercises)
  'original-reformer-parallel-footwork': 'reformer-footwork-and-strap-frog',
  'original-reformer-strap-frog': 'reformer-footwork-and-strap-frog',
  'ex-footwork-01': 'reformer-footwork-and-strap-frog',
  'ex-footwork-02': 'reformer-footwork-and-strap-frog',
  'ex-kr-reformer-01': 'reformer-footwork-and-strap-frog',
  'ex-global-reformer-01': 'reformer-footwork-and-strap-frog',

  // Group 2 (4 exercises)
  'original-barrel-supported-ankle': 'ankle-plantar-dorsiflexion-articulation',
  'original-mat-ankle-reach': 'ankle-plantar-dorsiflexion-articulation',
  'original-cadillac-table-ankle': 'ankle-plantar-dorsiflexion-articulation',
  'ex-footwork-03': 'ankle-plantar-dorsiflexion-articulation',

  // Group 3 (4 exercises)
  'original-chair-seated-pedal-press': 'chair-pedal-press-and-calf-raise',
  'original-chair-alternating-pedal': 'chair-pedal-press-and-calf-raise',
  'original-chair-supported-calf-raise': 'chair-pedal-press-and-calf-raise',
  'original-chair-sit-to-stand': 'chair-pedal-press-and-calf-raise',

  // Group 4 (7 exercises)
  'original-barrel-standing-hip-extension': 'standing-lunge-splits-and-hip-abduction',
  'original-barrel-standing-side-reach': 'standing-lunge-splits-and-hip-abduction',
  'original-mat-clam': 'standing-lunge-splits-and-hip-abduction',
  'ex-lower-01': 'standing-lunge-splits-and-hip-abduction',
  'ex-lower-02': 'standing-lunge-splits-and-hip-abduction',
  'ex-lower-03': 'standing-lunge-splits-and-hip-abduction',
  'ex-kr-reformer-02': 'standing-lunge-splits-and-hip-abduction',
});

const CATALOG_EXERCISE_ARCHETYPE_FALLBACK: Readonly<Record<string, string>> = Object.freeze({
  // Group 1
  'original-reformer-parallel-footwork': 'reformer-supine-footwork',
  'original-reformer-strap-frog': 'reformer-strap-frog-isolated',
  'ex-footwork-01': 'reformer-supine-footwork',
  'ex-footwork-02': 'reformer-supine-footwork',
  'ex-kr-reformer-01': 'reformer-supine-footwork',
  'ex-global-reformer-01': 'supine-articulated-bridge',
  // Group 2
  'original-barrel-supported-ankle': 'barrel-supported-ankle-isolated',
  'original-mat-ankle-reach': 'standing-ankle-calf-upper-reach',
  'original-cadillac-table-ankle': 'supine-heel-slide-ankle',
  'ex-footwork-03': 'chair-seated-pedal-footwork',
  // Group 3
  'original-chair-seated-pedal-press': 'chair-seated-pedal-footwork',
  'original-chair-alternating-pedal': 'chair-seated-pedal-footwork',
  'original-chair-supported-calf-raise': 'chair-supported-calf-raise-isolated',
  'original-chair-sit-to-stand': 'chair-sit-to-stand-isolated',
  // Group 4
  'original-barrel-standing-hip-extension': 'barrel-standing-hip-extension-isolated',
  'original-barrel-standing-side-reach': 'barrel-standing-side-reach-isolated',
  'original-mat-clam': 'mat-clam-isolated',
  'ex-lower-01': 'standing-scooter-lunge-splits',
  'ex-lower-02': 'reformer-standing-side-splits-isolated',
  'ex-lower-03': 'standing-scooter-lunge-splits',
  'ex-kr-reformer-02': 'standing-scooter-lunge-splits',
});

const CATALOG_EXERCISE_APPARATUS_MAP: Readonly<
  Record<string, { apparatus: ApparatusType; bodyPosition: BodyPosition }>
> = Object.freeze({
  'original-reformer-parallel-footwork': { apparatus: 'reformer', bodyPosition: 'supine' },
  'original-reformer-strap-frog': { apparatus: 'reformer', bodyPosition: 'supine' },
  'ex-footwork-01': { apparatus: 'reformer', bodyPosition: 'supine' },
  'ex-footwork-02': { apparatus: 'reformer', bodyPosition: 'supine' },
  'ex-kr-reformer-01': { apparatus: 'reformer', bodyPosition: 'supine' },
  'ex-global-reformer-01': { apparatus: 'reformer', bodyPosition: 'supine' },
  'original-barrel-supported-ankle': { apparatus: 'barrel', bodyPosition: 'standing' },
  'original-mat-ankle-reach': { apparatus: 'mat', bodyPosition: 'standing' },
  'original-cadillac-table-ankle': { apparatus: 'cadillac', bodyPosition: 'supine' },
  'ex-footwork-03': { apparatus: 'chair', bodyPosition: 'seated' },
  'original-chair-seated-pedal-press': { apparatus: 'chair', bodyPosition: 'seated' },
  'original-chair-alternating-pedal': { apparatus: 'chair', bodyPosition: 'seated' },
  'original-chair-supported-calf-raise': { apparatus: 'chair', bodyPosition: 'standing' },
  'original-chair-sit-to-stand': { apparatus: 'chair', bodyPosition: 'standing' },
  'original-barrel-standing-hip-extension': { apparatus: 'barrel', bodyPosition: 'standing' },
  'original-barrel-standing-side-reach': { apparatus: 'barrel', bodyPosition: 'standing' },
  'original-mat-clam': { apparatus: 'mat', bodyPosition: 'side-lying' },
  'ex-lower-01': { apparatus: 'reformer', bodyPosition: 'standing' },
  'ex-lower-02': { apparatus: 'reformer', bodyPosition: 'standing' },
  'ex-lower-03': { apparatus: 'chair', bodyPosition: 'standing' },
  'ex-kr-reformer-02': { apparatus: 'reformer', bodyPosition: 'standing' },
});

function cloneFootworkAssetForExercise(
  asset: VerifiedFootworkLowerVisualAsset,
  exerciseId: string,
): VerifiedFootworkLowerVisualAsset {
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
    verification: FOOTWORK_LOWER_VERIFICATION,
  });
}

const MAPPED_FOOTWORK_ASSETS_RECORD: Record<string, VerifiedFootworkLowerVisualAsset> = {};

for (const spec of Object.values(FOOTWORK_LOWER_DIAGRAM_SPECS)) {
  MAPPED_FOOTWORK_ASSETS_RECORD[spec.id] = cloneFootworkAssetForExercise(spec.asset, spec.id);
  for (const exId of spec.catalogExerciseIds) {
    MAPPED_FOOTWORK_ASSETS_RECORD[exId] = cloneFootworkAssetForExercise(spec.asset, exId);
  }
}

export const FOOTWORK_LOWER_VISUAL_ASSETS: Readonly<
  Record<string, VerifiedFootworkLowerVisualAsset>
> = Object.freeze(MAPPED_FOOTWORK_ASSETS_RECORD);

export function resolveFootworkLowerDiagramId(
  exerciseOrDiagramId: string | Pick<PilatesExercise, 'id'>,
): FootworkLowerDiagramId | null {
  const rawId =
    typeof exerciseOrDiagramId === 'string' ? exerciseOrDiagramId : exerciseOrDiagramId.id;
  return EXERCISE_ID_TO_FOOTWORK_LOWER_DIAGRAM_ID[rawId] ?? null;
}

export function resolveFootworkLowerDiagram(
  exerciseOrDiagramId: string | Pick<PilatesExercise, 'id'>,
): FootworkLowerDiagramSpec | null {
  const diagramId = resolveFootworkLowerDiagramId(exerciseOrDiagramId);
  return diagramId ? FOOTWORK_LOWER_DIAGRAM_SPECS[diagramId] : null;
}

export function resolveFootworkLowerVisualAsset(
  exerciseOrDiagramId: string | Pick<PilatesExercise, 'id'>,
): VerifiedFootworkLowerVisualAsset | null {
  const rawId =
    typeof exerciseOrDiagramId === 'string' ? exerciseOrDiagramId : exerciseOrDiagramId.id;
  if (FOOTWORK_LOWER_VISUAL_ASSETS[rawId]) {
    return FOOTWORK_LOWER_VISUAL_ASSETS[rawId];
  }
  const spec = resolveFootworkLowerDiagram(rawId);
  return spec ? spec.asset : null;
}

export function getFootworkLowerCatalogVisualAssets(): Readonly<
  Record<string, VerifiedFootworkLowerVisualAsset>
> {
  return FOOTWORK_LOWER_VISUAL_ASSETS;
}

export function getFootworkLowerDiagramCorrections(): Readonly<
  Record<string, MovementDiagramCorrection>
> {
  const record: Record<string, MovementDiagramCorrection> = {};

  for (const spec of Object.values(FOOTWORK_LOWER_DIAGRAM_SPECS)) {
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

export function getFootworkLowerI7RegistryPatch(): FootworkLowerI7RegistryPatch {
  const corrections = getFootworkLowerDiagramCorrections();
  const byDiagramId: Record<FootworkLowerDiagramId, VerifiedFootworkLowerVisualAsset> = {
    'reformer-footwork-and-strap-frog':
      FOOTWORK_LOWER_DIAGRAM_SPECS['reformer-footwork-and-strap-frog'].asset,
    'ankle-plantar-dorsiflexion-articulation':
      FOOTWORK_LOWER_DIAGRAM_SPECS['ankle-plantar-dorsiflexion-articulation'].asset,
    'chair-pedal-press-and-calf-raise':
      FOOTWORK_LOWER_DIAGRAM_SPECS['chair-pedal-press-and-calf-raise'].asset,
    'standing-lunge-splits-and-hip-abduction':
      FOOTWORK_LOWER_DIAGRAM_SPECS['standing-lunge-splits-and-hip-abduction'].asset,
  };

  return Object.freeze({
    assets: FOOTWORK_LOWER_VISUAL_ASSETS,
    corrections,
    byCatalogExerciseId: FOOTWORK_LOWER_VISUAL_ASSETS,
    byDiagramId: Object.freeze(byDiagramId),
  });
}
