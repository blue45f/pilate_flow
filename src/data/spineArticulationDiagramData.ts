import type {
  ApparatusType,
  BodyPosition,
  ClassBlockCategory,
  SpinalPlane,
} from '../types/pilates';
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

export type SpineArticulationId = 'spine-roll-up' | 'spine-roll-down' | 'spine-stretch';

export type SpineVertebraId = 'c7' | 't4' | 't8' | 't12' | 'l3' | 's1';

export interface SpineVertebraChain {
  readonly c7: Point2D;
  readonly t4: Point2D;
  readonly t8: Point2D;
  readonly t12: Point2D;
  readonly l3: Point2D;
  readonly s1: Point2D;
}

export interface SpineVertebraPoint {
  readonly id: SpineVertebraId;
  readonly labelKo: string;
  readonly segmentLabel: string;
  readonly point: Point2D;
  readonly matContact: boolean;
  readonly wallContact: boolean;
}

export interface SpinePublicSourceRef {
  readonly id: string;
  readonly title: string;
  readonly organization: string;
  readonly url: string;
  readonly licenseOrDomainNote: string;
  readonly verifiedAspectKo: string;
}

export interface SpineTruthfulnessMetadata {
  readonly anatomicalAccuracyAssumed: false;
  readonly clinicallyValidated: false;
  readonly peerReviewedBiomechanicalCapture: false;
  readonly anatomicalVerificationCompleted: false;
  readonly expertVerificationCompleted: false;
  readonly containsMedicalDiagnosisOrGuarantee: false;
  readonly professionalReviewCount: 0;
  readonly sourceFrameMappings: 0;
  readonly checkedAt: '2026-11-06';
  readonly productionMethod: 'free-authored-kinematic-svg-v1';
  readonly rightsStatus: 'original-app-authored-free-license';
  readonly licenseLabelKo: string;
  readonly nonMedicalNoticeKo: string;
  readonly scopeLimitationKo: string;
}

export interface SpineArticulationPhaseSpec extends PhasePoseSpec {
  readonly spineChain: SpineVertebraChain;
  readonly spinePoints: readonly SpineVertebraPoint[];
  readonly articulationFocusKo: string;
  readonly oppositionCueKo: string;
}

export interface SpineArticulationDiagramSpec {
  readonly archetypeId: SpineArticulationId;
  readonly exerciseId: string;
  readonly mappedExerciseIds: readonly string[];
  readonly nameKo: string;
  readonly nameEn: string;
  readonly subtitleKo: string;
  readonly apparatus: ApparatusType;
  readonly bodyPosition: BodyPosition;
  readonly blockCategory: ClassBlockCategory;
  readonly spinalPlanes: readonly SpinalPlane[];
  readonly matBaselineY: number;
  readonly wallPlumbLineX: number | null;
  readonly priorDefectSummaryKo: string;
  readonly correctionSummaryKo: string;
  readonly reviewedScopeKo: string;
  readonly limitationKo: string;
  readonly phases: {
    readonly start: SpineArticulationPhaseSpec;
    readonly middle: SpineArticulationPhaseSpec;
    readonly end: SpineArticulationPhaseSpec;
  };
  readonly primaryMuscles: readonly MuscleHighlightSpec[];
  readonly poseDeltaSummary: {
    readonly startToMiddleKo: string;
    readonly middleToEndKo: string;
    readonly invariantAnchorsKo: string;
    readonly keyJointChangeKo: string;
  };
  readonly mobileSummaryBulletsKo: readonly [string, string, string];
  readonly sources: readonly SpinePublicSourceRef[];
  readonly truthfulness: SpineTruthfulnessMetadata;
}

export const SPINE_TRUTHFULNESS_METADATA: SpineTruthfulnessMetadata = Object.freeze({
  anatomicalAccuracyAssumed: false,
  clinicallyValidated: false,
  peerReviewedBiomechanicalCapture: false,
  anatomicalVerificationCompleted: false,
  expertVerificationCompleted: false,
  containsMedicalDiagnosisOrGuarantee: false,
  professionalReviewCount: 0,
  sourceFrameMappings: 0,
  checkedAt: '2026-11-06',
  productionMethod: 'free-authored-kinematic-svg-v1',
  rightsStatus: 'original-app-authored-free-license',
  licenseLabelKo: '앱 자체 제작 2D 키네마틱 도해 (자유 라이선스 · 외부 프레임 무차용)',
  nonMedicalNoticeKo:
    '본 2D 척추 분절 도해는 필라테스 수업 구성을 돕기 위한 교육·참고용 기하 모식도이며, 의학적 진단·처방·재활 치료 효과나 개인별 해부학적 안전 범위를 보증하지 않습니다.',
  scopeLimitationKo:
    '6개 척추 기준점(C7·T4·T8·T12·L3·S1)과 관절 좌표는 모션 캡처나 임상 방사선 계측이 아닌 앱 자체 작성 도해이며 전문가 감수 전(0건) 상태입니다.',
});

export const SPINE_VERTEBRA_LABELS: Readonly<
  Record<SpineVertebraId, { readonly labelKo: string; readonly segmentLabel: string }>
> = Object.freeze({
  c7: { labelKo: '하부경추 (C7)', segmentLabel: 'C7' },
  t4: { labelKo: '상부흉추 (T4)', segmentLabel: 'T4' },
  t8: { labelKo: '중부흉추 (T8)', segmentLabel: 'T8' },
  t12: { labelKo: '흉요추연결 (T12)', segmentLabel: 'T12' },
  l3: { labelKo: '요추중심 (L3)', segmentLabel: 'L3' },
  s1: { labelKo: '천골기저 (S1)', segmentLabel: 'S1' },
});

function buildSpinePoints(
  chain: SpineVertebraChain,
  matBaselineY: number,
  wallPlumbLineX: number | null,
): readonly SpineVertebraPoint[] {
  const order: readonly SpineVertebraId[] = ['c7', 't4', 't8', 't12', 'l3', 's1'];
  return order.map((id) => {
    const point = chain[id];
    const meta = SPINE_VERTEBRA_LABELS[id];
    const matContact = Math.abs(point.y - matBaselineY) <= 6;
    const wallContact =
      wallPlumbLineX !== null ? Math.abs(point.x - wallPlumbLineX) <= 4 : false;
    return {
      id,
      labelKo: meta.labelKo,
      segmentLabel: meta.segmentLabel,
      point,
      matContact,
      wallContact,
    };
  });
}

const ROLL_UP_LOWER_ANCHORS = {
  hip: { x: 164, y: 140 },
  knee: { x: 214, y: 140 },
  ankle: { x: 262, y: 140 },
  heel: { x: 268, y: 144 },
  toe: { x: 274, y: 126 },
} as const;

const ROLL_DOWN_LOWER_ANCHORS = {
  hip: { x: 156, y: 140 },
  knee: { x: 204, y: 126 },
  ankle: { x: 252, y: 140 },
  heel: { x: 258, y: 144 },
  toe: { x: 266, y: 126 },
} as const;

const SPINE_STRETCH_LOWER_ANCHORS = {
  pelvis: { x: 60, y: 140 },
  hip: { x: 64, y: 140 },
  knee: { x: 136, y: 140 },
  ankle: { x: 208, y: 140 },
  heel: { x: 214, y: 144 },
  toe: { x: 218, y: 124 },
} as const;

const SPINE_ROLL_UP_SPEC: SpineArticulationDiagramSpec = {
  archetypeId: 'spine-roll-up',
  exerciseId: 'ex-spine-01',
  mappedExerciseIds: [
    'spine-roll-up',
    'ex-spine-01',
    'original-mat-roll-up-prep',
    'original-mat-chest-lift',
    'ex-global-reformer-02',
    'ex-kr-cadillac-01',
    'kr-03',
  ],
  nameKo: '롤업 (Spine Roll Up)',
  nameEn: 'Roll Up',
  subtitleKo: '하체 매트 앵커 고정 · 경추→흉추→요추 순차 박리(Peel) 및 할로우 C-커브 전방 리치',
  apparatus: 'mat',
  bodyPosition: 'supine',
  blockCategory: 'core',
  spinalPlanes: ['flexion'],
  matBaselineY: 144,
  wallPlumbLineX: null,
  priorDefectSummaryKo:
    '기존 supine-chest-lift-curl 공용 도해는 상부 흉추만 소폭 들고 요추·천골 분절이 누락되었으며 발목·무릎이 공중으로 들리는 오류가 있었습니다.',
  correctionSummaryKo:
    '매트 기준선(y=144)에 뒤꿈치·발목·무릎·고관절을 전 구간 고정하고, 경추(C7)→흉추(T4·T8·T12)→요추(L3) 순차 박리와 복부 스쿱 기반의 수평 팔 리치 C-커브를 구현했습니다.',
  reviewedScopeKo:
    'Joseph Pilates 원전(1945 Public Domain) 및 NHS·Merrithew 공개 매트 가이드를 대조해 앙와위 준비, 순차 척추 분절 거상, 허벅지에 무너지지 않는 할로우 C-커브 정점을 반영했어요.',
  limitationKo:
    '2D 척추 분절 좌표와 가동범위는 교육용 모식도이며 전문 임상·생체역학 검증 전(0건)입니다. 급성 추간판 질환이나 골다공증 환경의 안전 범위를 뜻하지 않아요.',
  phases: {
    start: {
      phaseId: 'start',
      badgeKo: '시작 자세 (준비·정렬)',
      shortTitleKo: '앙와위 매트 정렬 · 흉곽 접지',
      summaryKo:
        '매트(y=144) 위에 후두골부터 천골(S1)·뒤꿈치까지 길게 눕고, 하부 흉곽이 들뜨지 않게 고정한 상태에서 경추 끄덕임(Head Nod)을 준비합니다.',
      breathCueKo: '코로 마시며 정수리와 발끝을 양방향으로 길게 늘이고 턱 끝을 가볍게 당깁니다.',
      articulationFocusKo: 'C7~S1 전 분절 수평 매트 접지 유지 및 상부 경추 굴곡 축 준비',
      oppositionCueKo: '뒤꿈치 전방 밀어내기와 정수리 후방 신장의 수평 대조',
      spineChain: {
        c7: { x: 58, y: 138 },
        t4: { x: 74, y: 140 },
        t8: { x: 92, y: 140 },
        t12: { x: 112, y: 139 },
        l3: { x: 132, y: 139 },
        s1: { x: 152, y: 141 },
      },
      spinePoints: buildSpinePoints(
        {
          c7: { x: 58, y: 138 },
          t4: { x: 74, y: 140 },
          t8: { x: 92, y: 140 },
          t12: { x: 112, y: 139 },
          l3: { x: 132, y: 139 },
          s1: { x: 152, y: 141 },
        },
        144,
        null,
      ),
      joints: {
        head: { x: 42, y: 134 },
        neck: { x: 58, y: 138 },
        shoulder: { x: 72, y: 138 },
        elbow: { x: 54, y: 102 },
        wrist: { x: 40, y: 74 },
        hand: { x: 32, y: 60 },
        thoracic: { x: 96, y: 140 },
        lumbar: { x: 132, y: 139 },
        pelvis: { x: 156, y: 141 },
        ...ROLL_UP_LOWER_ANCHORS,
      },
      fixedAnchors: [
        { joint: 'heel', surfaceKo: '매트 뒤꿈치 고정 앵커 (y=144)', point: ROLL_UP_LOWER_ANCHORS.heel },
        { joint: 'hip', surfaceKo: '매트 골반·고관절 앵커', point: ROLL_UP_LOWER_ANCHORS.hip },
      ],
      movingJoints: ['head', 'neck', 'shoulder', 'elbow', 'wrist', 'hand', 'thoracic', 'lumbar'],
      apparatusState: {
        carriageOffsetPx: 0,
        pedalAngleDeg: 0,
        springTensionLevel: 'none',
        supportSurfaceKo: '필라테스 매트 수평 기준면 (y=144)',
      },
      alignments: [
        {
          id: 'rollup-start-mat-anchor',
          labelKo: '매트 수평 접지선',
          cueKo: '하부 흉곽(T12)과 천골(S1), 뒤꿈치를 매트에 밀착합니다.',
          kind: 'anchor-lock',
          from: { x: 36, y: 144 },
          to: { x: 280, y: 144 },
          cautionKo: '팔을 들어 올릴 때 허리가 매트에서 뜨지 않도록 주의합니다.',
        },
      ],
      directionVectors: [
        {
          id: 'rollup-start-head-nod',
          labelKo: '경추 끄덕임 및 상부흉추 컬 시작',
          kind: 'spine-articulation',
          points: [
            { x: 42, y: 134 },
            { x: 66, y: 98 },
            { x: 112, y: 70 },
          ],
          phaseScope: 'start-to-middle',
        },
      ],
    },
    middle: {
      phaseId: 'middle',
      badgeKo: '중간 자세 (최대 가동·정점)',
      shortTitleKo: '경추→흉추 순차 박리 · 요추 임프린트',
      summaryKo:
        '뒤꿈치와 다리를 매트에 고정한 채 경추(C7)와 상·중부 흉추(T4·T8·T12)를 매트에서 차례대로 떼어 올리고 요추(L3)는 매트 쪽으로 깊게 스쿱합니다.',
      breathCueKo: '입으로 길게 내쉬며 갈비뼈를 골반 쪽으로 닫고 마디마디 매트에서 떨어집니다.',
      articulationFocusKo: 'C7·T4·T8·T12 순차 거상 및 L3·S1 후방 임프린트 지지',
      oppositionCueKo: '양손은 발끝 쪽으로 뻗고 배꼽·요추(L3)는 매트 뒤쪽으로 당기는 대조',
      spineChain: {
        c7: { x: 118, y: 68 },
        t4: { x: 110, y: 84 },
        t8: { x: 112, y: 104 },
        t12: { x: 122, y: 124 },
        l3: { x: 138, y: 138 },
        s1: { x: 154, y: 142 },
      },
      spinePoints: buildSpinePoints(
        {
          c7: { x: 118, y: 68 },
          t4: { x: 110, y: 84 },
          t8: { x: 112, y: 104 },
          t12: { x: 122, y: 124 },
          l3: { x: 138, y: 138 },
          s1: { x: 154, y: 142 },
        },
        144,
        null,
      ),
      joints: {
        head: { x: 130, y: 58 },
        neck: { x: 118, y: 68 },
        shoulder: { x: 114, y: 80 },
        elbow: { x: 152, y: 88 },
        wrist: { x: 190, y: 92 },
        hand: { x: 208, y: 92 },
        thoracic: { x: 114, y: 104 },
        lumbar: { x: 138, y: 138 },
        pelvis: { x: 156, y: 142 },
        ...ROLL_UP_LOWER_ANCHORS,
      },
      fixedAnchors: [
        { joint: 'heel', surfaceKo: '매트 뒤꿈치 고정 앵커 (y=144)', point: ROLL_UP_LOWER_ANCHORS.heel },
        { joint: 'hip', surfaceKo: '매트 골반·고관절 앵커', point: ROLL_UP_LOWER_ANCHORS.hip },
      ],
      movingJoints: ['head', 'neck', 'shoulder', 'elbow', 'wrist', 'hand', 'thoracic', 'lumbar'],
      apparatusState: {
        carriageOffsetPx: 0,
        pedalAngleDeg: 0,
        springTensionLevel: 'none',
        supportSurfaceKo: '필라테스 매트 수평 기준면 (y=144)',
      },
      alignments: [
        {
          id: 'rollup-middle-lumbar-imprint',
          labelKo: '요추(L3) 스쿱 · 하체 매트 고정',
          cueKo: '다리(무릎·발목)가 들리지 않게 누르고 요추(L3)를 매트에 먼저 굴려 지납니다.',
          kind: 'axis-line',
          from: { x: 138, y: 138 },
          to: { x: 268, y: 144 },
          cautionKo: '반동으로 상체를 튕기거나 뒤꿈치가 매트에서 떨어지지 않게 조절합니다.',
        },
      ],
      directionVectors: [
        {
          id: 'rollup-middle-peel-curve',
          labelKo: '흉추→요추 순차 박리 궤적',
          kind: 'spine-articulation',
          points: [
            { x: 118, y: 68 },
            { x: 162, y: 66 },
            { x: 200, y: 70 },
          ],
          phaseScope: 'middle-to-end',
        },
      ],
    },
    end: {
      phaseId: 'end',
      badgeKo: '끝 자세 (제어 복귀·마무리)',
      shortTitleKo: '할로우 C-커브 전방 리치 · 수평 팔 정렬',
      summaryKo:
        '골반(S1)을 매트 위에 세우고 하부 요추(L3)를 뒤로 끌어당긴 깊은 C-커브를 유지하며, 양팔은 바닥과 평행(y=76)하게 앞으로 뻗어 상체가 허벅지에 무너지지 않게 합니다.',
      breathCueKo: '정점에서 코로 마시며 등 뒤를 넓히고, 내쉬며 천골부터 역순으로 롤다운을 준비합니다.',
      articulationFocusKo: 'S1 수직 지지 위 L3 후방 스쿱 + T12~C7 전방 아치 C-커브 완성',
      oppositionCueKo: '손끝·정수리 전방 리치(x=276)와 배꼽·요추(L3 x=148) 후방 스쿱의 양방향 대조',
      spineChain: {
        c7: { x: 200, y: 70 },
        t4: { x: 180, y: 72 },
        t8: { x: 162, y: 82 },
        t12: { x: 150, y: 100 },
        l3: { x: 148, y: 122 },
        s1: { x: 156, y: 142 },
      },
      spinePoints: buildSpinePoints(
        {
          c7: { x: 200, y: 70 },
          t4: { x: 180, y: 72 },
          t8: { x: 162, y: 82 },
          t12: { x: 150, y: 100 },
          l3: { x: 148, y: 122 },
          s1: { x: 156, y: 142 },
        },
        144,
        null,
      ),
      joints: {
        head: { x: 218, y: 74 },
        neck: { x: 200, y: 70 },
        shoulder: { x: 184, y: 76 },
        elbow: { x: 222, y: 76 },
        wrist: { x: 258, y: 76 },
        hand: { x: 276, y: 76 },
        thoracic: { x: 162, y: 82 },
        lumbar: { x: 148, y: 122 },
        pelvis: { x: 158, y: 140 },
        ...ROLL_UP_LOWER_ANCHORS,
      },
      fixedAnchors: [
        { joint: 'heel', surfaceKo: '매트 뒤꿈치 고정 앵커 (y=144)', point: ROLL_UP_LOWER_ANCHORS.heel },
        { joint: 'hip', surfaceKo: '매트 골반·고관절 앵커', point: ROLL_UP_LOWER_ANCHORS.hip },
      ],
      movingJoints: ['head', 'neck', 'shoulder', 'elbow', 'wrist', 'hand', 'thoracic', 'lumbar'],
      apparatusState: {
        carriageOffsetPx: 0,
        pedalAngleDeg: 0,
        springTensionLevel: 'none',
        supportSurfaceKo: '필라테스 매트 수평 기준면 (y=144)',
      },
      alignments: [
        {
          id: 'rollup-end-parallel-arms',
          labelKo: '양팔 매트 수평선 (y=76)',
          cueKo: '어깨~손끝을 바닥과 평행하게 유지하고 가슴이 허벅지로 무너지지 않게 합니다.',
          kind: 'axis-line',
          from: { x: 184, y: 76 },
          to: { x: 276, y: 76 },
          targetAngleDeg: 0,
          cautionKo: '발끝을 잡으려 어깨를 으쓱하거나 복부 긴장을 풀고 상체를 접지 않습니다.',
        },
      ],
      directionVectors: [
        {
          id: 'rollup-end-opposition',
          labelKo: '요추 후방 스쿱 ↔ 손끝 전방 리치 대조',
          kind: 'axial-lengthening',
          points: [
            { x: 148, y: 122 },
            { x: 218, y: 76 },
            { x: 276, y: 76 },
          ],
          phaseScope: 'end',
        },
      ],
    },
  },
  primaryMuscles: [
    {
      muscleGroupId: 'rectus-obliques',
      labelKo: '복직근 · 외/내복사근',
      labelEn: 'Rectus Abdominis & Obliques',
      catalogMuscleMatches: ['복직근', '복사근', '코어'],
      role: 'primary',
      roleLabelKo: '주동근 (주 타겟)',
      activePhases: ['start', 'middle', 'end'],
      anchorJoints: ['thoracic', 'lumbar', 'pelvis'],
      reasonKo: '경추부터 요추까지 분절 굴곡을 주도하고 C-커브 모양을 유지합니다.',
    },
    {
      muscleGroupId: 'core-transversus',
      labelKo: '복횡근 · 심부 골반저근',
      labelEn: 'Transversus Abdominis',
      catalogMuscleMatches: ['복횡근', '심부 코어'],
      role: 'stabilizer',
      roleLabelKo: '안정화근 (코어·정렬 유지)',
      activePhases: ['start', 'middle', 'end'],
      anchorJoints: ['lumbar', 'pelvis', 'hip'],
      reasonKo: '전방 굴곡 중 요추(L3)를 후방으로 당겨 허벅지 위 무너짐을 방지합니다.',
    },
    {
      muscleGroupId: 'hamstrings',
      labelKo: '슬괵근 · 척추기립근 신장',
      labelEn: 'Hamstrings & Spinal Extensors',
      catalogMuscleMatches: ['햄스트링', '척추기립근'],
      role: 'lengthening',
      roleLabelKo: '신장·이완 부위',
      activePhases: ['middle', 'end'],
      anchorJoints: ['pelvis', 'knee', 'ankle'],
      reasonKo: '골반 매트 고정과 C-커브 전방 리치에서 후면 사슬이 길게 신장됩니다.',
    },
  ],
  poseDeltaSummary: {
    startToMiddleKo: '앙와위(C7~S1 매트 접지)에서 경추·상부흉추(C7·T4·T8)가 순차 거상되며 요추(L3)가 매트에 임프린트됩니다.',
    middleToEndKo: '요추(L3)가 매트에서 떨어지며 후방 스쿱을 유지한 채 양팔이 바닥과 평행(y=76)한 C-커브 정점에 도달합니다.',
    invariantAnchorsKo: '고관절(164,140)·무릎(214,140)·발목(262,140)·뒤꿈치(268,144)는 3단계 내내 매트에 고정됩니다.',
    keyJointChangeKo: 'C7 (58,138) → (118,68) → (200,70), L3 (132,139) → (138,138) → (148,122)',
  },
  mobileSummaryBulletsKo: [
    '하체 고정: 뒤꿈치(y=144)·발목·무릎·고관절 매트 앵커 유지',
    '순차 분절: C7 → T4 → T8 → T12 → L3 순서로 박리(Peel)',
    '정점 대조: 양팔 수평 리치(y=76) ↔ 요추(L3) 후방 할로우 스쿱',
  ],
  sources: [
    {
      id: 'pilates-1945-roll-up',
      title: 'Joseph H. Pilates & William J. Miller — Return to Life Through Contrology: The Roll-Up (1945)',
      organization: 'Classical Pilates Archive (Public Domain)',
      url: 'https://archive.org/details/returntolifethro00pila',
      licenseOrDomainNote: 'Public Domain (1945 original publication)',
      verifiedAspectKo: '앙와위 하체 고정, 척추 마디별 순차 롤업, 팔을 바닥과 평행하게 뻗는 C-커브 정점 규준 대조',
    },
    {
      id: 'nhs-pilates-matwork-rollup',
      title: 'NHS Foundation Trust — Clinical Pilates Matwork & Spinal Articulation Guide',
      organization: 'NHS UK Public Patient Education',
      url: 'https://www.cuh.nhs.uk/patient-information/general-stability-exercises1/',
      licenseOrDomainNote: 'Open Government Licence / Public Patient Leaflet',
      verifiedAspectKo: '경추 끄덕임(Head Nod) 준비, 골반 임프린트, 반동 없는 분절 제어 원칙 확인',
    },
    {
      id: 'merrithew-stott-rollup',
      title: 'Merrithew (STOTT PILATES®) — Roll Up & Half Roll Back Progressions',
      organization: 'Merrithew Public Exercise Guide',
      url: 'https://www.merrithew.com/blog/post/2025-03-27/march-matness-magic-pilates-routines-from-sunrise-to-sunset',
      licenseOrDomainNote: 'Public Web Reference (Link-only)',
      verifiedAspectKo: '흉곽-골반 연결 유지 및 허벅지 위로 상체가 무너지지 않는 복부 대조(Opposition) 큐 대조',
    },
  ],
  truthfulness: SPINE_TRUTHFULNESS_METADATA,
};

const SPINE_ROLL_DOWN_SPEC: SpineArticulationDiagramSpec = {
  archetypeId: 'spine-roll-down',
  exerciseId: 'ex-spine-02',
  mappedExerciseIds: [
    'spine-roll-down',
    'ex-spine-02',
    'ex-cooldown-02',
    'original-cadillac-seated-roll-back',
  ],
  nameKo: '롤다운 (Spine Roll Down)',
  nameEn: 'Roll Down / Roll Back Control',
  subtitleKo: '발 뒤꿈치 고정 앵커 · 좌골 수직 준비 → 골반 후방경사(천골 컬) → 요추·흉추 순차 매트 착지',
  apparatus: 'mat',
  bodyPosition: 'seated',
  blockCategory: 'core',
  spinalPlanes: ['flexion'],
  matBaselineY: 144,
  wallPlumbLineX: null,
  priorDefectSummaryKo:
    '기존 도해는 끝 자세에서 양손을 머리 위로 치켜올려 천골·요추의 순차 하강 제어 대신 만세 자세처럼 표현되는 문제가 있었습니다.',
  correctionSummaryKo:
    '뒤꿈치(258,144) 고정 앵커를 유지한 채 장좌위 수직 적층(start) → 천골 컬 및 하부 요추(L3) 후하방 임프린트(middle) → S1·L3·T12·T8 순차 매트 착지 제어(end)로 교정했습니다.',
  reviewedScopeKo:
    'Joseph Pilates 원전(1945)의 롤다운 구간 및 Merrithew·NHS 척추 분절 가이드를 대조하여 골반 후방경사 시작점과 요추부터 매트에 닿는 원심성 제어를 반영했어요.',
  limitationKo:
    '2D 척추 분절 좌표와 각도는 교육용 모식도이며 전문 임상·생체역학 검증 전(0건)입니다. 요추 통증이나 추간판 질환 시 안전한 가동범위를 보증하지 않아요.',
  phases: {
    start: {
      phaseId: 'start',
      badgeKo: '시작 자세 (준비·정렬)',
      shortTitleKo: '좌골 위 수직 척추 적층 · 롤백 준비',
      summaryKo:
        '무릎을 가볍게 세우고 뒤꿈치(258,144)를 매트에 고정한 채 좌골(S1) 위에 요추(L3)·흉추(T12~T4)·경추(C7)를 수직으로 곧게 세우고 양팔을 앞으로 나란히 뻗습니다.',
      breathCueKo: '코로 마시며 좌골로 매트를 밀어 정수리를 천장 쪽으로 길게 세웁니다.',
      articulationFocusKo: 'S1~C7 좌골 수직 기둥 정렬 및 견갑골 하강 안정화',
      oppositionCueKo: '좌골 매트 지지와 정수리 상방 신장의 수직 대조',
      spineChain: {
        c7: { x: 152, y: 44 },
        t4: { x: 150, y: 60 },
        t8: { x: 150, y: 78 },
        t12: { x: 150, y: 98 },
        l3: { x: 150, y: 118 },
        s1: { x: 152, y: 138 },
      },
      spinePoints: buildSpinePoints(
        {
          c7: { x: 152, y: 44 },
          t4: { x: 150, y: 60 },
          t8: { x: 150, y: 78 },
          t12: { x: 150, y: 98 },
          l3: { x: 150, y: 118 },
          s1: { x: 152, y: 138 },
        },
        144,
        null,
      ),
      joints: {
        head: { x: 154, y: 30 },
        neck: { x: 152, y: 44 },
        shoulder: { x: 152, y: 56 },
        elbow: { x: 186, y: 66 },
        wrist: { x: 220, y: 68 },
        hand: { x: 236, y: 68 },
        thoracic: { x: 150, y: 78 },
        lumbar: { x: 150, y: 118 },
        pelvis: { x: 154, y: 138 },
        ...ROLL_DOWN_LOWER_ANCHORS,
      },
      fixedAnchors: [
        { joint: 'heel', surfaceKo: '매트 뒤꿈치 고정 앵커 (y=144)', point: ROLL_DOWN_LOWER_ANCHORS.heel },
        { joint: 'hip', surfaceKo: '매트 좌골·고관절 피벗 앵커', point: ROLL_DOWN_LOWER_ANCHORS.hip },
      ],
      movingJoints: ['head', 'neck', 'shoulder', 'elbow', 'wrist', 'hand', 'thoracic', 'lumbar', 'pelvis'],
      apparatusState: {
        carriageOffsetPx: 0,
        pedalAngleDeg: 0,
        springTensionLevel: 'none',
        supportSurfaceKo: '필라테스 매트 수평 기준면 (y=144)',
      },
      alignments: [
        {
          id: 'rolldown-start-vertical-stack',
          labelKo: '좌골-정수리 수직 정렬선',
          cueKo: '골반(S1) 위에 흉곽과 머리를 수직으로 쌓아 준비합니다.',
          kind: 'plumb-line',
          from: { x: 151, y: 26 },
          to: { x: 151, y: 144 },
          cautionKo: '롤다운 시작 전부터 등이 굽거나 어깨가 올라가지 않게 합니다.',
        },
      ],
      directionVectors: [
        {
          id: 'rolldown-start-sacral-curl',
          labelKo: '골반 후방경사(천골 컬) 시작 방향',
          kind: 'spine-articulation',
          points: [
            { x: 150, y: 118 },
            { x: 136, y: 126 },
            { x: 126, y: 132 },
          ],
          phaseScope: 'start-to-middle',
        },
      ],
    },
    middle: {
      phaseId: 'middle',
      badgeKo: '중간 자세 (최대 가동·정점)',
      shortTitleKo: '골반 후방경사(천골 컬) · 하부요추 매트 진입',
      summaryKo:
        '뒤꿈치 앵커를 유지한 채 꼬리뼈를 말아 넣어 골반 후방경사(Sacral Curl)를 만들고, 하부 요추(L3)가 매트 방향(y=132)으로 부드럽게 내려가며 C-커브를 형성합니다.',
      breathCueKo: '입으로 내쉬며 아랫배를 등 쪽으로 깊게 당겨 천골(S1)부터 매트에 굴려 내려놓습니다.',
      articulationFocusKo: 'S1 후방 틸트 및 L3 후하방 스쿱(x: 150→126, y: 118→132)',
      oppositionCueKo: '손끝과 무릎은 전방을 유지하고 요추(L3)는 매트 후하방으로 길어지는 대조',
      spineChain: {
        c7: { x: 130, y: 62 },
        t4: { x: 120, y: 76 },
        t8: { x: 114, y: 94 },
        t12: { x: 116, y: 114 },
        l3: { x: 126, y: 132 },
        s1: { x: 144, y: 141 },
      },
      spinePoints: buildSpinePoints(
        {
          c7: { x: 130, y: 62 },
          t4: { x: 120, y: 76 },
          t8: { x: 114, y: 94 },
          t12: { x: 116, y: 114 },
          l3: { x: 126, y: 132 },
          s1: { x: 144, y: 141 },
        },
        144,
        null,
      ),
      joints: {
        head: { x: 142, y: 52 },
        neck: { x: 130, y: 62 },
        shoulder: { x: 124, y: 74 },
        elbow: { x: 162, y: 82 },
        wrist: { x: 198, y: 84 },
        hand: { x: 214, y: 84 },
        thoracic: { x: 114, y: 94 },
        lumbar: { x: 126, y: 132 },
        pelvis: { x: 148, y: 140 },
        ...ROLL_DOWN_LOWER_ANCHORS,
      },
      fixedAnchors: [
        { joint: 'heel', surfaceKo: '매트 뒤꿈치 고정 앵커 (y=144)', point: ROLL_DOWN_LOWER_ANCHORS.heel },
        { joint: 'hip', surfaceKo: '매트 좌골·고관절 피벗 앵커', point: ROLL_DOWN_LOWER_ANCHORS.hip },
      ],
      movingJoints: ['head', 'neck', 'shoulder', 'elbow', 'wrist', 'hand', 'thoracic', 'lumbar', 'pelvis'],
      apparatusState: {
        carriageOffsetPx: 0,
        pedalAngleDeg: 0,
        springTensionLevel: 'none',
        supportSurfaceKo: '필라테스 매트 수평 기준면 (y=144)',
      },
      alignments: [
        {
          id: 'rolldown-middle-pelvic-tilt',
          labelKo: '천골 컬 · 요추 임프린트 진입선',
          cueKo: '통나무처럼 일자로 눕지 않고 꼬리뼈와 요추(L3)부터 매트 쪽으로 굴립니다.',
          kind: 'axis-line',
          from: { x: 144, y: 141 },
          to: { x: 114, y: 94 },
          cautionKo: '고관절 굴곡근에만 매달려 허리가 평평하게 굳지 않도록 복부를 스쿱합니다.',
        },
      ],
      directionVectors: [
        {
          id: 'rolldown-middle-sequential-descent',
          labelKo: '요추(L3)→흉추(T12·T8) 순차 매트 하강',
          kind: 'return-control',
          points: [
            { x: 126, y: 132 },
            { x: 108, y: 138 },
            { x: 82, y: 132 },
          ],
          phaseScope: 'middle-to-end',
        },
      ],
    },
    end: {
      phaseId: 'end',
      badgeKo: '끝 자세 (제어 복귀·마무리)',
      shortTitleKo: '천골→요추→하부흉추 순차 매트 착지 제어',
      summaryKo:
        '천골(S1)·요추(L3)·하부흉추(T12)가 차례대로 매트(y=140..143)에 안착하고, 상부 흉추와 경추(T4·C7)까지 원심성 수축으로 감속하며 분절 착지를 마무리합니다.',
      breathCueKo: '끝까지 내쉬며 척추 마디를 매트에 도장 찍듯 내려놓고 복부 중심을 유지합니다.',
      articulationFocusKo: 'S1(y=143)·L3(y=142)·T12(y=140) 매트 접지 완료 및 T8·T4·C7 감속 제어',
      oppositionCueKo: '뒤꿈치(258,144) 전방 고정과 척추 분절 후방 신장 착지의 대조',
      spineChain: {
        c7: { x: 60, y: 102 },
        t4: { x: 68, y: 118 },
        t8: { x: 82, y: 132 },
        t12: { x: 100, y: 140 },
        l3: { x: 120, y: 142 },
        s1: { x: 140, y: 143 },
      },
      spinePoints: buildSpinePoints(
        {
          c7: { x: 60, y: 102 },
          t4: { x: 68, y: 118 },
          t8: { x: 82, y: 132 },
          t12: { x: 100, y: 140 },
          l3: { x: 120, y: 142 },
          s1: { x: 140, y: 143 },
        },
        144,
        null,
      ),
      joints: {
        head: { x: 56, y: 88 },
        neck: { x: 60, y: 102 },
        shoulder: { x: 68, y: 116 },
        elbow: { x: 104, y: 106 },
        wrist: { x: 142, y: 98 },
        hand: { x: 158, y: 96 },
        thoracic: { x: 82, y: 132 },
        lumbar: { x: 120, y: 142 },
        pelvis: { x: 146, y: 142 },
        ...ROLL_DOWN_LOWER_ANCHORS,
      },
      fixedAnchors: [
        { joint: 'heel', surfaceKo: '매트 뒤꿈치 고정 앵커 (y=144)', point: ROLL_DOWN_LOWER_ANCHORS.heel },
        { joint: 'hip', surfaceKo: '매트 좌골·고관절 피벗 앵커', point: ROLL_DOWN_LOWER_ANCHORS.hip },
      ],
      movingJoints: ['head', 'neck', 'shoulder', 'elbow', 'wrist', 'hand', 'thoracic', 'lumbar', 'pelvis'],
      apparatusState: {
        carriageOffsetPx: 0,
        pedalAngleDeg: 0,
        springTensionLevel: 'none',
        supportSurfaceKo: '필라테스 매트 수평 기준면 (y=144)',
      },
      alignments: [
        {
          id: 'rolldown-end-sequential-imprint',
          labelKo: '천골·요추·하부흉추 매트 접지 구간',
          cueKo: 'S1→L3→T12가 매트(y=144)에 순서대로 내려앉도록 복부 원심성 제어를 유지합니다.',
          kind: 'anchor-lock',
          from: { x: 96, y: 144 },
          to: { x: 156, y: 144 },
          cautionKo: '마지막 구간에서 등 전체가 쿵 떨어지지 않도록 천천히 감속합니다.',
        },
      ],
      directionVectors: [
        {
          id: 'rolldown-end-eccentric-control',
          labelKo: '상부 흉추·경추 감속 하강 벡터',
          kind: 'return-control',
          points: [
            { x: 82, y: 132 },
            { x: 68, y: 118 },
            { x: 60, y: 102 },
          ],
          phaseScope: 'end',
        },
      ],
    },
  },
  primaryMuscles: [
    {
      muscleGroupId: 'rectus-obliques',
      labelKo: '복직근 · 복사근 (원심성 감속)',
      labelEn: 'Rectus Abdominis & Obliques (Eccentric)',
      catalogMuscleMatches: ['복직근', '복사근', '코어'],
      role: 'primary',
      roleLabelKo: '주동근 (주 타겟)',
      activePhases: ['middle', 'end'],
      anchorJoints: ['thoracic', 'lumbar', 'pelvis'],
      reasonKo: '골반 후방경사 이후 중력에 저항하며 척추 분절을 하나씩 매트에 내려놓습니다.',
    },
    {
      muscleGroupId: 'core-transversus',
      labelKo: '복횡근 · 심부 요추-골반 안정화근',
      labelEn: 'Transversus Abdominis',
      catalogMuscleMatches: ['복횡근', '심부 코어'],
      role: 'stabilizer',
      roleLabelKo: '안정화근 (코어·정렬 유지)',
      activePhases: ['start', 'middle', 'end'],
      anchorJoints: ['lumbar', 'pelvis', 'hip'],
      reasonKo: '천골 컬(Sacral Curl)과 요추 임프린트 전환 시 허리 과신전을 막아줍니다.',
    },
    {
      muscleGroupId: 'thoracic-extensors',
      labelKo: '척추기립근 · 요방형근 신장',
      labelEn: 'Spinal Extensors',
      catalogMuscleMatches: ['척추기립근'],
      role: 'lengthening',
      roleLabelKo: '신장·이완 부위',
      activePhases: ['middle', 'end'],
      anchorJoints: ['thoracic', 'lumbar', 'pelvis'],
      reasonKo: '후방 C-커브 분절 하강을 통해 경직된 요추·흉추 후면 조직이 길게 늘어납니다.',
    },
  ],
  poseDeltaSummary: {
    startToMiddleKo: '좌골 위 수직 적층(L3 x=150, y=118)에서 골반 후방경사로 L3가 후하방(x=126, y=132)으로 이동하며 C-커브를 만듭니다.',
    middleToEndKo: '천골(S1 y=143)·요추(L3 y=142)·하부흉추(T12 y=140)가 차례로 매트에 닿으며 원심성 롤다운 제어를 완성합니다.',
    invariantAnchorsKo: '뒤꿈치(258,144)·발목(252,140)·무릎(204,126)·고관절(156,140) 앵커는 전 구간 고정됩니다.',
    keyJointChangeKo: 'L3 (150,118) → (126,132) → (120,142), T12 (150,98) → (116,114) → (100,140)',
  },
  mobileSummaryBulletsKo: [
    '발 앵커 고정: 뒤꿈치(258,144)와 발목이 들리지 않게 지지',
    '천골 컬 시작: 꼬리뼈를 말아 요추(L3)부터 후하방 스쿱',
    '원심성 착지: S1 → L3 → T12 → T8 순서로 매트에 감속 안착',
  ],
  sources: [
    {
      id: 'pilates-1945-roll-down',
      title: 'Joseph H. Pilates & William J. Miller — Return to Life Through Contrology: Roll-Down Phase (1945)',
      organization: 'Classical Pilates Archive (Public Domain)',
      url: 'https://archive.org/details/returntolifethro00pila',
      licenseOrDomainNote: 'Public Domain (1945 original publication)',
      verifiedAspectKo: '발을 고정한 상태에서 천골·요추부터 마디마디 매트에 내려놓는 원심성 롤다운 원칙 대조',
    },
    {
      id: 'merrithew-spinal-articulation-rolldown',
      title: 'Merrithew (STOTT PILATES®) — 28 Days of Mindfulness · Day 18: Spinal Articulation & Roll Down',
      organization: 'Merrithew Public Exercise Guide',
      url: 'https://www.merrithew.com/28-days-of-mindfulness/day-18',
      licenseOrDomainNote: 'Public Web Reference (Link-only)',
      verifiedAspectKo: '골반 후방경사(Pelvic Tilt)를 통한 요추 분절 개시 및 어깨 긴장 배제 큐 대조',
    },
    {
      id: 'nhs-lumbar-pelvic-tilt-control',
      title: 'NHS Foundation Trust — Pelvic Tilt & Segmental Spinal Control Guide',
      organization: 'NHS UK Public Patient Education',
      url: 'https://www.cuh.nhs.uk/patient-information/general-stability-exercises1/',
      licenseOrDomainNote: 'Open Government Licence / Public Patient Leaflet',
      verifiedAspectKo: '심부 복횡근 수축을 통한 골반 후방경사 및 요추 임프린트 안정성 기준 대조',
    },
  ],
  truthfulness: SPINE_TRUTHFULNESS_METADATA,
};

const SPINE_STRETCH_SPEC: SpineArticulationDiagramSpec = {
  archetypeId: 'spine-stretch',
  exerciseId: 'ex-spine-03',
  mappedExerciseIds: [
    'spine-stretch',
    'ex-spine-03',
    'original-mat-spine-stretch-forward',
    'original-barrel-seated-spine-reach',
    'ex-warmup-02',
    'ex-core-02',
  ],
  nameKo: '스파인 스트레치 (Spine Stretch Forward)',
  nameEn: 'Spine Stretch Forward',
  subtitleKo: '가상 수직벽(x=58) 천골·골반 고정 · 경추→상부흉추 순차 벽 박리 및 전방 C-커브 신장',
  apparatus: 'mat',
  bodyPosition: 'seated',
  blockCategory: 'warmup',
  spinalPlanes: ['flexion'],
  matBaselineY: 144,
  wallPlumbLineX: 58,
  priorDefectSummaryKo:
    '기존 seated-roll-back-spine-twist 공용 연결은 상체가 앞으로 뻗는 대신 좌골 뒤로 눕는 역방향 오류와 가상 수직벽 기준선 누락이 있었습니다.',
  correctionSummaryKo:
    '가상 수직벽(x=58) 플럼라인을 도입하여 천골(S1 x=58)과 골반·무릎·뒤꿈치를 전 구간 고정하고, 경추(C7)·상부흉추(T4·T8)부터 벽에서 차례로 떼어 앞으로 깊게 뻗는 전방 C-커브를 구현했습니다.',
  reviewedScopeKo:
    'Joseph Pilates 원전(1945 Spine Stretch)과 Merrithew·NHS 가이드를 대조해 장좌위 수직벽 정렬, 위에서 아래로의 벽 박리, 복부 후방 대조(Opposition) C-커브를 반영했어요.',
  limitationKo:
    '2D 척추 분절 좌표와 가상벽 정렬선은 교육용 모식도이며 전문 임상·생체역학 검증 전(0건)입니다. 햄스트링 단축이나 요추 질환 시 무리한 전굴을 권장하지 않아요.',
  phases: {
    start: {
      phaseId: 'start',
      badgeKo: '시작 자세 (준비·정렬)',
      shortTitleKo: '가상 수직벽(x=58) 장좌위 척추 수직 적층',
      summaryKo:
        '매트(y=144) 위에 다리를 뻗어 발목을 당기고(배측굴곡), 천골(S1)부터 경추(C7)까지 6개 척추 분절을 가상 수직벽(x=58)에 일직선으로 세운 뒤 양팔을 어깨높이(y=56)로 뻗습니다.',
      breathCueKo: '코로 깊게 마시며 좌골로 매트를 누르고 정수리를 가상 벽을 따라 천장으로 끌어올립니다.',
      articulationFocusKo: 'C7·T4·T8·T12·L3·S1 전 분절 가상 수직벽(x=58) 완전 적층',
      oppositionCueKo: '좌골 하방 접지(y=140)와 정수리 상방 리프트(y=28)의 수직 축 신장',
      spineChain: {
        c7: { x: 58, y: 42 },
        t4: { x: 58, y: 58 },
        t8: { x: 58, y: 78 },
        t12: { x: 58, y: 98 },
        l3: { x: 58, y: 118 },
        s1: { x: 58, y: 138 },
      },
      spinePoints: buildSpinePoints(
        {
          c7: { x: 58, y: 42 },
          t4: { x: 58, y: 58 },
          t8: { x: 58, y: 78 },
          t12: { x: 58, y: 98 },
          l3: { x: 58, y: 118 },
          s1: { x: 58, y: 138 },
        },
        144,
        58,
      ),
      joints: {
        head: { x: 60, y: 28 },
        neck: { x: 58, y: 42 },
        shoulder: { x: 60, y: 56 },
        elbow: { x: 102, y: 56 },
        wrist: { x: 144, y: 56 },
        hand: { x: 162, y: 56 },
        thoracic: { x: 58, y: 78 },
        lumbar: { x: 58, y: 118 },
        ...SPINE_STRETCH_LOWER_ANCHORS,
      },
      fixedAnchors: [
        { joint: 'pelvis', surfaceKo: '가상 수직벽(x=58) 및 매트 좌골 앵커', point: SPINE_STRETCH_LOWER_ANCHORS.pelvis },
        { joint: 'heel', surfaceKo: '매트 뒤꿈치 고정 앵커 (y=144)', point: SPINE_STRETCH_LOWER_ANCHORS.heel },
      ],
      movingJoints: ['head', 'neck', 'shoulder', 'elbow', 'wrist', 'hand', 'thoracic'],
      apparatusState: {
        carriageOffsetPx: 0,
        pedalAngleDeg: 0,
        springTensionLevel: 'none',
        supportSurfaceKo: '필라테스 매트(y=144) + 가상 수직벽 플럼라인(x=58)',
      },
      alignments: [
        {
          id: 'spinestretch-start-wall-line',
          labelKo: '가상 수직벽 플럼라인 (x=58)',
          cueKo: '천골(S1)부터 경추(C7)까지 상상 속 수직벽(x=58)에 등을 기대듯 수직으로 세웁니다.',
          kind: 'plumb-line',
          from: { x: 58, y: 20 },
          to: { x: 58, y: 144 },
          cautionKo: '시작부터 골반이 뒤로 무너지거나 갈비뼈가 앞으로 내밀어지지 않게 합니다.',
        },
      ],
      directionVectors: [
        {
          id: 'spinestretch-start-upper-peel',
          labelKo: '경추(C7)·상부흉추(T4) 전방 박리 시작',
          kind: 'spine-articulation',
          points: [
            { x: 58, y: 42 },
            { x: 88, y: 50 },
            { x: 114, y: 64 },
          ],
          phaseScope: 'start-to-middle',
        },
      ],
    },
    middle: {
      phaseId: 'middle',
      badgeKo: '중간 자세 (최대 가동·정점)',
      shortTitleKo: '경추·상부흉추 벽 박리 · 천골·요추 수직벽 고정',
      summaryKo:
        '천골(S1 x=58)과 하부 요추(L3 x=60)는 가상 수직벽에 그대로 세워 둔 채, 턱을 당기며 경추(C7)와 상·중부 흉추(T4·T8)만 벽에서 하나씩 떼어 앞으로 분절 굴곡합니다.',
      breathCueKo: '입으로 내쉬며 윗등부터 가상 벽에서 차례로 떨어지고 배꼽은 벽 쪽으로 당깁니다.',
      articulationFocusKo: 'S1(x=58)·L3(x=60) 벽 지지 유지 + T8·T4·C7 전방 박리',
      oppositionCueKo: '하부 요추(L3)의 수직벽 밀착과 상부 흉추·양손의 전방 리치 대조',
      spineChain: {
        c7: { x: 114, y: 64 },
        t4: { x: 96, y: 68 },
        t8: { x: 78, y: 80 },
        t12: { x: 66, y: 98 },
        l3: { x: 60, y: 118 },
        s1: { x: 58, y: 138 },
      },
      spinePoints: buildSpinePoints(
        {
          c7: { x: 114, y: 64 },
          t4: { x: 96, y: 68 },
          t8: { x: 78, y: 80 },
          t12: { x: 66, y: 98 },
          l3: { x: 60, y: 118 },
          s1: { x: 58, y: 138 },
        },
        144,
        58,
      ),
      joints: {
        head: { x: 128, y: 68 },
        neck: { x: 114, y: 64 },
        shoulder: { x: 98, y: 68 },
        elbow: { x: 138, y: 68 },
        wrist: { x: 178, y: 68 },
        hand: { x: 196, y: 68 },
        thoracic: { x: 78, y: 80 },
        lumbar: { x: 60, y: 118 },
        ...SPINE_STRETCH_LOWER_ANCHORS,
      },
      fixedAnchors: [
        { joint: 'pelvis', surfaceKo: '가상 수직벽(x=58) 및 매트 좌골 앵커', point: SPINE_STRETCH_LOWER_ANCHORS.pelvis },
        { joint: 'heel', surfaceKo: '매트 뒤꿈치 고정 앵커 (y=144)', point: SPINE_STRETCH_LOWER_ANCHORS.heel },
      ],
      movingJoints: ['head', 'neck', 'shoulder', 'elbow', 'wrist', 'hand', 'thoracic'],
      apparatusState: {
        carriageOffsetPx: 0,
        pedalAngleDeg: 0,
        springTensionLevel: 'none',
        supportSurfaceKo: '필라테스 매트(y=144) + 가상 수직벽 플럼라인(x=58)',
      },
      alignments: [
        {
          id: 'spinestretch-middle-wall-sacrum',
          labelKo: '천골·요추 가상벽 고정선 (x=58)',
          cueKo: '상체가 앞으로 숙여질 때도 골반(S1)과 하부 요추(L3)는 가상 수직벽(x=58)에 남아 있어야 합니다.',
          kind: 'plumb-line',
          from: { x: 58, y: 20 },
          to: { x: 58, y: 144 },
          cautionKo: '고관절에서 상체를 통째로 접는 힌지(Hinge) 동작이 되지 않도록 주의합니다.',
        },
      ],
      directionVectors: [
        {
          id: 'spinestretch-middle-crown-reach',
          labelKo: '정수리·양팔 전방 C-커브 확장',
          kind: 'spine-articulation',
          points: [
            { x: 114, y: 64 },
            { x: 132, y: 70 },
            { x: 146, y: 78 },
          ],
          phaseScope: 'middle-to-end',
        },
      ],
    },
    end: {
      phaseId: 'end',
      badgeKo: '끝 자세 (제어 복귀·마무리)',
      shortTitleKo: '전방 C-커브 최대 신장 · 천골 벽 고정 대조',
      summaryKo:
        '천골(S1 x=58)을 가상 수직벽에 고정하고 하부 요추(L3 x=62)를 벽 쪽으로 끌어올린 상태에서, 정수리와 양팔(hand x=228)을 큰 공 너머로 뻗듯 깊은 전방 C-커브를 완성합니다.',
      breathCueKo: '마지막까지 내쉬며 후면 흉곽과 척추를 길게 늘이고, 마시며 L3→T12→T8→T4→C7 순으로 벽에 재적층합니다.',
      articulationFocusKo: 'S1(x=58) 벽 앵커 고정 + T12~C7 깊은 전방 C-커브 아치 신장',
      oppositionCueKo: '정수리·손끝 전방 리치(x=228) ↔ 배꼽·요추(L3 x=62) 가상 수직벽 후방 지지 대조',
      spineChain: {
        c7: { x: 146, y: 78 },
        t4: { x: 122, y: 76 },
        t8: { x: 96, y: 82 },
        t12: { x: 74, y: 96 },
        l3: { x: 62, y: 116 },
        s1: { x: 58, y: 138 },
      },
      spinePoints: buildSpinePoints(
        {
          c7: { x: 146, y: 78 },
          t4: { x: 122, y: 76 },
          t8: { x: 96, y: 82 },
          t12: { x: 74, y: 96 },
          l3: { x: 62, y: 116 },
          s1: { x: 58, y: 138 },
        },
        144,
        58,
      ),
      joints: {
        head: { x: 164, y: 84 },
        neck: { x: 146, y: 78 },
        shoulder: { x: 124, y: 78 },
        elbow: { x: 166, y: 78 },
        wrist: { x: 208, y: 78 },
        hand: { x: 228, y: 78 },
        thoracic: { x: 96, y: 82 },
        lumbar: { x: 62, y: 116 },
        ...SPINE_STRETCH_LOWER_ANCHORS,
      },
      fixedAnchors: [
        { joint: 'pelvis', surfaceKo: '가상 수직벽(x=58) 및 매트 좌골 앵커', point: SPINE_STRETCH_LOWER_ANCHORS.pelvis },
        { joint: 'heel', surfaceKo: '매트 뒤꿈치 고정 앵커 (y=144)', point: SPINE_STRETCH_LOWER_ANCHORS.heel },
      ],
      movingJoints: ['head', 'neck', 'shoulder', 'elbow', 'wrist', 'hand', 'thoracic'],
      apparatusState: {
        carriageOffsetPx: 0,
        pedalAngleDeg: 0,
        springTensionLevel: 'none',
        supportSurfaceKo: '필라테스 매트(y=144) + 가상 수직벽 플럼라인(x=58)',
      },
      alignments: [
        {
          id: 'spinestretch-end-wall-opposition',
          labelKo: '가상 수직벽(x=58) 천골 고정 · 전방 C-커브 대조',
          cueKo: '천골(S1 x=58)은 수직벽에 고정한 채 정수리와 손끝을 수평 전방으로 길게 뻗습니다.',
          kind: 'plumb-line',
          from: { x: 58, y: 20 },
          to: { x: 58, y: 144 },
          cautionKo: '양손으로 바닥이나 발을 누르며 허벅지 위로 가슴을 무너뜨리지 않습니다.',
        },
      ],
      directionVectors: [
        {
          id: 'spinestretch-end-opposition-reach',
          labelKo: '수직벽 요추 후방 리프트 ↔ 손끝 전방 신장',
          kind: 'axial-lengthening',
          points: [
            { x: 62, y: 116 },
            { x: 146, y: 78 },
            { x: 228, y: 78 },
          ],
          phaseScope: 'end',
        },
      ],
    },
  },
  primaryMuscles: [
    {
      muscleGroupId: 'core-transversus',
      labelKo: '복횡근 · 내복사근 (후방 벽 지지)',
      labelEn: 'Transversus Abdominis & Internal Obliques',
      catalogMuscleMatches: ['복횡근', '복사근', '코어'],
      role: 'primary',
      roleLabelKo: '주동근 (주 타겟)',
      activePhases: ['middle', 'end'],
      anchorJoints: ['thoracic', 'lumbar', 'pelvis'],
      reasonKo: '복부를 가상 수직벽(x=58) 쪽으로 들어 올려 요추가 앞으로 쏟아지지 않게 지지합니다.',
    },
    {
      muscleGroupId: 'latissimus-serratus',
      labelKo: '전거근 · 하부승모근 (견갑 안정화)',
      labelEn: 'Serratus Anterior & Lower Trapezius',
      catalogMuscleMatches: ['전거근', '하부승모근'],
      role: 'stabilizer',
      roleLabelKo: '안정화근 (코어·정렬 유지)',
      activePhases: ['start', 'middle', 'end'],
      anchorJoints: ['shoulder', 'elbow', 'wrist'],
      reasonKo: '양팔을 수평으로 길게 뻗는 동안 어깨 거상을 막고 흉곽 전방 리치를 돕습니다.',
    },
    {
      muscleGroupId: 'thoracic-extensors',
      labelKo: '척추기립근 · 슬괵근 후면 사슬 신장',
      labelEn: 'Spinal Extensors & Hamstrings',
      catalogMuscleMatches: ['척추기립근', '햄스트링'],
      role: 'lengthening',
      roleLabelKo: '신장·이완 부위',
      activePhases: ['middle', 'end'],
      anchorJoints: ['thoracic', 'lumbar', 'knee', 'heel'],
      reasonKo: '천골 벽 고정과 상부 척추 전방 C-커브 대조를 통해 등 뒤와 하지 후면이 신장됩니다.',
    },
  ],
  poseDeltaSummary: {
    startToMiddleKo: '가상 수직벽(x=58)에 일직선으로 서 있던 척추에서 S1(x=58)·L3(x=60)는 벽에 남고 C7(x:58→114)·T4(x:58→96)가 전방 박리됩니다.',
    middleToEndKo: '천골(S1 x=58) 벽 앵커를 유지한 채 C7(x=146, y=78)과 양손(x=228, y=78)이 깊은 전방 C-커브로 뻗어 나갑니다.',
    invariantAnchorsKo: '천골(S1 x=58, y=138)·골반(60,140)·무릎(136,140)·뒤꿈치(214,144)는 3단계 모두 동일한 위치에 고정됩니다.',
    keyJointChangeKo: 'C7 (58,42) → (114,64) → (146,78), S1 (58,138) → (58,138) → (58,138)',
  },
  mobileSummaryBulletsKo: [
    '가상 수직벽(x=58): 천골(S1)과 골반을 벽 기준선에 전 구간 고정',
    '위에서부터 박리: C7 → T4 → T8 순서로 가상 벽에서 전방 분절',
    '복부 대조 C-커브: 손끝 전방 리치(x=228) ↔ 요추(L3) 벽 방향 리프트',
  ],
  sources: [
    {
      id: 'pilates-1945-spine-stretch',
      title: 'Joseph H. Pilates & William J. Miller — Return to Life Through Contrology: Spine Stretch (1945)',
      organization: 'Classical Pilates Archive (Public Domain)',
      url: 'https://archive.org/details/returntolifethro00pila',
      licenseOrDomainNote: 'Public Domain (1945 original publication)',
      verifiedAspectKo: '장좌위 발목 당김, 복부를 뒤로 당기며 머리부터 전방 C-커브로 숙이는 고전 스파인 스트레치 규준 대조',
    },
    {
      id: 'merrithew-spine-stretch-forward',
      title: 'Merrithew (STOTT PILATES®) — Spine Stretch Forward & Thoracic Articulation Progressions',
      organization: 'Merrithew Public Exercise Guide',
      url: 'https://www.merrithew.com/blog/post/2018-11-09/therapeutic-pilates-based-exercise-progressions-for-hyperkyphosis',
      licenseOrDomainNote: 'Public Web Reference (Link-only)',
      verifiedAspectKo: '가상 수직벽에 골반과 하부 요추를 세운 채 상부 척추부터 차례로 떼어내는 분절 큐 대조',
    },
    {
      id: 'nhs-seated-spinal-mobility',
      title: 'NHS Foundation Trust — Seated Spinal Mobility & Posterior Chain Stretch Guide',
      organization: 'NHS UK Public Patient Education',
      url: 'https://www.cuh.nhs.uk/patient-information/general-stability-exercises1/',
      licenseOrDomainNote: 'Open Government Licence / Public Patient Leaflet',
      verifiedAspectKo: '골반 중립-수직 지지 위 안전한 상체 분절 굴곡 및 과도한 요추 압박 방지 원칙 대조',
    },
  ],
  truthfulness: SPINE_TRUTHFULNESS_METADATA,
};

export const SPINE_ARTICULATION_DIAGRAM_SPECS: Readonly<
  Record<SpineArticulationId, SpineArticulationDiagramSpec>
> = Object.freeze({
  'spine-roll-up': SPINE_ROLL_UP_SPEC,
  'spine-roll-down': SPINE_ROLL_DOWN_SPEC,
  'spine-stretch': SPINE_STRETCH_SPEC,
});

export const SPINE_EXERCISE_ID_TO_ARCHETYPE_MAP: Readonly<
  Record<string, SpineArticulationId>
> = Object.freeze({
  'spine-roll-up': 'spine-roll-up',
  'ex-spine-01': 'spine-roll-up',
  'original-mat-roll-up-prep': 'spine-roll-up',
  'original-mat-chest-lift': 'spine-roll-up',
  'ex-global-reformer-02': 'spine-roll-up',
  'ex-kr-cadillac-01': 'spine-roll-up',
  'kr-03': 'spine-roll-up',
  'spine-roll-down': 'spine-roll-down',
  'ex-spine-02': 'spine-roll-down',
  'ex-cooldown-02': 'spine-roll-down',
  'original-cadillac-seated-roll-back': 'spine-roll-down',
  'spine-stretch': 'spine-stretch',
  'ex-spine-03': 'spine-stretch',
  'original-mat-spine-stretch-forward': 'spine-stretch',
  'original-barrel-seated-spine-reach': 'spine-stretch',
  'ex-warmup-02': 'spine-stretch',
  'ex-core-02': 'spine-stretch',
});

export function getSpineArticulationDiagramSpec(
  movementId: SpineArticulationId,
): SpineArticulationDiagramSpec {
  return SPINE_ARTICULATION_DIAGRAM_SPECS[movementId];
}

export function resolveSpineArticulationDiagramByExerciseId(
  exerciseIdOrSlug: string,
): SpineArticulationDiagramSpec | null {
  const normalized = exerciseIdOrSlug.trim().toLowerCase();
  if (!normalized) return null;

  const directMatch = SPINE_EXERCISE_ID_TO_ARCHETYPE_MAP[normalized];
  if (directMatch) {
    return SPINE_ARTICULATION_DIAGRAM_SPECS[directMatch];
  }

  if (
    normalized.includes('spine-stretch') ||
    normalized.includes('spine stretch') ||
    normalized.includes('스파인 스트레치') ||
    normalized.includes('스파인스트레치')
  ) {
    return SPINE_ARTICULATION_DIAGRAM_SPECS['spine-stretch'];
  }

  if (
    normalized.includes('roll-down') ||
    normalized.includes('roll down') ||
    normalized.includes('roll-back') ||
    normalized.includes('롤다운') ||
    normalized.includes('롤 다운') ||
    normalized.includes('롤백')
  ) {
    return SPINE_ARTICULATION_DIAGRAM_SPECS['spine-roll-down'];
  }

  if (
    normalized.includes('roll-up') ||
    normalized.includes('roll up') ||
    normalized.includes('롤업') ||
    normalized.includes('롤 업')
  ) {
    return SPINE_ARTICULATION_DIAGRAM_SPECS['spine-roll-up'];
  }

  return null;
}

export function toSpineCatalogMovementVisualAsset(
  specOrId: SpineArticulationDiagramSpec | SpineArticulationId | string,
  exerciseIdOverride?: string,
): CatalogMovementVisualAsset | null {
  const spec =
    typeof specOrId === 'string'
      ? resolveSpineArticulationDiagramByExerciseId(specOrId)
      : specOrId;
  if (!spec) return null;

  const resolvedExerciseId = exerciseIdOverride ?? spec.exerciseId;

  return {
    exerciseId: resolvedExerciseId,
    nameKo: spec.nameKo,
    nameEn: spec.nameEn,
    apparatus: spec.apparatus,
    bodyPosition: spec.bodyPosition,
    blockCategory: spec.blockCategory,
    spinalPlanes: spec.spinalPlanes,
    isUnilateral: false,
    archetypeId: spec.archetypeId,
    archetypeTitleKo: `${spec.nameKo} · ${spec.subtitleKo}`,
    staticGuideSvgPath: `/guides/spine/${spec.archetypeId}.svg`,
    productionMethod: spec.truthfulness.productionMethod,
    rightsStatus: spec.truthfulness.rightsStatus,
    licenseLabelKo: spec.truthfulness.licenseLabelKo,
    anatomicalAccuracyAssumed: false,
    phases: {
      start: spec.phases.start,
      middle: spec.phases.middle,
      end: spec.phases.end,
    },
    primaryMuscles: spec.primaryMuscles,
    poseDeltaSummary: spec.poseDeltaSummary,
    mobileSummaryBulletsKo: spec.mobileSummaryBulletsKo,
  };
}

export function resolveSpineArticulationVisualAsset(
  exerciseIdOrSlug: string,
): CatalogMovementVisualAsset | null {
  const spec = resolveSpineArticulationDiagramByExerciseId(exerciseIdOrSlug);
  if (!spec) return null;
  return toSpineCatalogMovementVisualAsset(spec, exerciseIdOrSlug);
}

export function getSpineCatalogMovementVisualAssets(): Record<string, CatalogMovementVisualAsset> {
  const record: Record<string, CatalogMovementVisualAsset> = {};
  for (const [exerciseId, archetypeId] of Object.entries(SPINE_EXERCISE_ID_TO_ARCHETYPE_MAP)) {
    const spec = SPINE_ARTICULATION_DIAGRAM_SPECS[archetypeId];
    const asset = toSpineCatalogMovementVisualAsset(spec, exerciseId);
    if (asset) {
      record[exerciseId] = asset;
    }
  }
  return record;
}

export function toSpineMovementDiagramCorrection(
  specOrId: SpineArticulationDiagramSpec | SpineArticulationId | string,
): MovementDiagramCorrection | null {
  const spec =
    typeof specOrId === 'string'
      ? resolveSpineArticulationDiagramByExerciseId(specOrId)
      : specOrId;
  if (!spec) return null;

  return {
    archetypeId: spec.archetypeId,
    checkedAt: spec.truthfulness.checkedAt,
    reviewedScopeKo: spec.reviewedScopeKo,
    correctionKo: spec.correctionSummaryKo,
    limitationKo: spec.limitationKo,
    professionalReviewCount: 0,
    sourceFrameMappings: 0,
    sources: spec.sources.map((src) => ({
      title: src.title,
      url: src.url,
    })),
  };
}

export function getSpineMovementDiagramCorrections(): Record<string, MovementDiagramCorrection> {
  const record: Record<string, MovementDiagramCorrection> = {};
  for (const [exerciseId, archetypeId] of Object.entries(SPINE_EXERCISE_ID_TO_ARCHETYPE_MAP)) {
    const spec = SPINE_ARTICULATION_DIAGRAM_SPECS[archetypeId];
    const correction = toSpineMovementDiagramCorrection(spec);
    if (correction) {
      record[exerciseId] = correction;
    }
  }
  return record;
}

export const getSpineArticulationDiagramCorrections = getSpineMovementDiagramCorrections;

export interface SpineMovementPhaseDiagramAdapterProps {
  asset: CatalogMovementVisualAsset;
  phase: VisualPhaseId;
  activeSide?: 'left' | 'right';
  mirrored?: boolean;
  showAlignment?: boolean;
  showDirection?: boolean;
  showMuscles?: boolean;
  showGhostStartPose?: boolean;
  compact?: boolean;
  className?: string;
  label?: string;
}

export interface SpineMovementTriptychDiagramAdapterProps {
  asset: CatalogMovementVisualAsset;
  selectedPhase?: VisualPhaseId;
  onSelectPhase?: (phase: VisualPhaseId) => void;
  activeSide?: 'left' | 'right';
  mirrored?: boolean;
  showAlignment?: boolean;
  showDirection?: boolean;
  showMuscles?: boolean;
  showGhostStartPose?: boolean;
  className?: string;
}

export function toSpineMovementPhaseDiagramProps(
  exerciseIdOrSlug: string,
  phase: VisualPhaseId = 'start',
  mirrored = false,
): SpineMovementPhaseDiagramAdapterProps | null {
  const asset = resolveSpineArticulationVisualAsset(exerciseIdOrSlug);
  if (!asset) return null;
  return {
    asset,
    phase,
    activeSide: 'right',
    mirrored,
    showAlignment: true,
    showDirection: true,
    showMuscles: true,
    showGhostStartPose: phase !== 'start',
    label: `${asset.nameKo} · ${asset.phases[phase].badgeKo} · 비의료 참고 도해`,
  };
}

export function toSpineMovementTriptychDiagramProps(
  exerciseIdOrSlug: string,
  selectedPhase: VisualPhaseId = 'middle',
  mirrored = false,
): SpineMovementTriptychDiagramAdapterProps | null {
  const asset = resolveSpineArticulationVisualAsset(exerciseIdOrSlug);
  if (!asset) return null;
  return {
    asset,
    selectedPhase,
    activeSide: 'right',
    mirrored,
    showAlignment: true,
    showDirection: true,
    showMuscles: true,
    showGhostStartPose: true,
  };
}

export type {
  CatalogMovementVisualAsset,
  JointAlignmentGuide,
  MovementDirectionVector,
  MuscleHighlightSpec,
  PhasePoseSpec,
  Point2D,
  RigJointMap,
  VisualPhaseId,
};
