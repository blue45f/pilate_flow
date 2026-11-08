import sourceLedgerJson from './upperBodyArmSourceLedger.json';
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

export type UpperBodyArmDiagramId =
  | 'supine-and-standing-strap-press'
  | 'seated-row-and-band-retraction'
  | 'kneeling-chest-expansion-and-chair-arm-arc';

export const UPPER_BODY_ARM_DIAGRAM_IDS: readonly UpperBodyArmDiagramId[] = Object.freeze([
  'supine-and-standing-strap-press',
  'seated-row-and-band-retraction',
  'kneeling-chest-expansion-and-chair-arm-arc',
]);

export const UPPER_BODY_ARM_CATALOG_EXERCISE_IDS: readonly string[] = Object.freeze([
  // Group 1: supine-and-standing-strap-press (5)
  'original-reformer-supine-arm-press',
  'original-cadillac-arm-spring-press',
  'original-barrel-supported-arm-reach',
  'ex-upper-01',
  'ex-kr-reformer-03',
  // Group 2: seated-row-and-band-retraction (4)
  'original-reformer-seated-row',
  'original-mat-band-row',
  'ex-upper-02',
  'ex-global-reformer-03',
  // Group 3: kneeling-chest-expansion-and-chair-arm-arc (4)
  'original-chair-seated-arm-arc',
  'original-mat-seated-arm-reach',
  'original-chair-seated-back-reach',
  'ex-upper-03',
]);

export interface UpperBodyArmVectorOverlaySpec {
  readonly id: string;
  readonly labelKo: string;
  readonly kind: 'humeral-arc' | 'scapular-depression-retraction' | 'ribcage-closure-anchor' | 'posterior-extension-arc';
  readonly phaseId: VisualPhaseId;
  readonly svgPathD: string;
  readonly startPoint: Point2D;
  readonly endPoint: Point2D;
}

export interface UpperBodyArmCalloutSpec {
  readonly id: string;
  readonly phaseId: VisualPhaseId;
  readonly textKo: string;
  readonly anchor: Point2D;
  readonly badgePosition: Point2D;
  readonly tone: 'anchor' | 'humeral' | 'scapular' | 'caution';
}

export interface UpperBodyArmKinematicMetrics {
  readonly startHumeralFlexionDeg: number;
  readonly middleHumeralTargetDeg: number;
  readonly scapularDepressionDeltaPx: number;
  readonly ribcageAnchorY: number;
  readonly supportBaselineY: number;
}

export interface UpperBodyArmLedgerEntry {
  readonly id: UpperBodyArmDiagramId;
  readonly diagramId: UpperBodyArmDiagramId;
  readonly archetypeId: string;
  readonly mappedExerciseIds: readonly string[];
  readonly checkedAt: string;
  readonly anatomicalAccuracyAssumed: false;
  readonly professionalReviewCount: 0;
  readonly sourceFrameMappings: 0;
  readonly reviewedScopeKo: string;
  readonly correctionKo: string;
  readonly limitationKo: string;
  readonly sources: readonly { readonly title: string; readonly url: string }[];
  readonly factualRecord: {
    readonly alignmentInvariantsKo: readonly string[];
    readonly diagramId: UpperBodyArmDiagramId;
    readonly mappedExerciseIds: readonly string[];
    readonly phaseCuesKo: {
      readonly end: string;
      readonly middle: string;
      readonly start: string;
    };
    readonly verifiedBiomechanicsFactsKo: readonly string[];
  };
  readonly factualRecordSha256: string;
}

export interface UpperBodyArmDiagramSpec {
  readonly id: UpperBodyArmDiagramId;
  readonly diagramId: UpperBodyArmDiagramId;
  readonly mappedExerciseIds: readonly string[];
  readonly primaryCatalogExerciseId: string;
  readonly nameKo: string;
  readonly nameEn: string;
  readonly subtitleKo: string;
  readonly focusSummaryKo: string;
  readonly archetypeId: string;
  readonly archetypeTitleKo: string;
  readonly supportBaselineY: number;
  readonly kinematicMetrics: UpperBodyArmKinematicMetrics;
  readonly vectorOverlays: readonly UpperBodyArmVectorOverlaySpec[];
  readonly calloutLabels: readonly UpperBodyArmCalloutSpec[];
  readonly asset: CatalogMovementVisualAsset;
  readonly correction: MovementDiagramCorrection;
  readonly ledgerEntry: UpperBodyArmLedgerEntry;
}

export const UPPER_BODY_ARM_SOURCE_LEDGER = Object.freeze(sourceLedgerJson);

const LEDGER_ENTRY_BY_ID: Readonly<Record<UpperBodyArmDiagramId, UpperBodyArmLedgerEntry>> =
  Object.freeze(
    Object.fromEntries(
      sourceLedgerJson.entries.map((entry) => [
        entry.diagramId as UpperBodyArmDiagramId,
        Object.freeze(entry as unknown as UpperBodyArmLedgerEntry),
      ]),
    ) as Record<UpperBodyArmDiagramId, UpperBodyArmLedgerEntry>,
  );

const CATALOG_ARCHETYPE_MAP: Readonly<Record<string, string>> = Object.freeze({
  'original-reformer-supine-arm-press': 'supine-strap-arm-press',
  'original-cadillac-arm-spring-press': 'supine-strap-arm-press',
  'original-barrel-supported-arm-reach': 'standing-ankle-calf-upper-reach',
  'ex-upper-01': 'kneeling-chest-expansion-triceps',
  'ex-kr-reformer-03': 'kneeling-chest-expansion-triceps',
  'original-reformer-seated-row': 'seated-row-arm-arc',
  'original-mat-band-row': 'seated-row-arm-arc',
  'ex-upper-02': 'seated-row-arm-arc',
  'ex-global-reformer-03': 'kneeling-chest-expansion-triceps',
  'original-chair-seated-arm-arc': 'seated-row-arm-arc',
  'original-mat-seated-arm-reach': 'seated-row-arm-arc',
  'original-chair-seated-back-reach': 'chair-seated-back-reach-isolated',
  'ex-upper-03': 'cadillac-standing-punch-press-isolated',
});

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

const UPPER_BODY_ARM_MUSCLES: readonly MuscleHighlightSpec[] = Object.freeze([
  Object.freeze({
    muscleGroupId: 'latissimus-serratus',
    labelKo: '광배근·전거근·하부승모근 (견갑 하강·후인 안정)',
    labelEn: 'Latissimus Dorsi, Serratus Anterior & Lower Trapezius',
    catalogMuscleMatches: Object.freeze(['광배근', '전거근', '능형근', '하부승모근', '대흉근']),
    role: 'primary',
    roleLabelKo: '주동근 (주 타겟)',
    activePhases: Object.freeze(['start', 'middle', 'end'] as const),
    anchorJoints: Object.freeze(['shoulder', 'thoracic', 'lumbar'] as const),
    reasonKo: '스트랩·스프링·밴드 저항을 당기거나 누를 때 견갑골을 하강·밀착시켜 승모근 거상을 방지합니다.',
  }),
  Object.freeze({
    muscleGroupId: 'shoulder-deltoid',
    labelKo: '상완삼두근·후면/전면삼각근 (상완골 원호 및 신전 제어)',
    labelEn: 'Triceps Brachii & Deltoids',
    catalogMuscleMatches: Object.freeze(['상완삼두근', '후면삼각근', '전면삼각근', '삼각근', '팔', '어깨']),
    role: 'primary',
    roleLabelKo: '주동근 (주 타겟)',
    activePhases: Object.freeze(['middle', 'end'] as const),
    anchorJoints: Object.freeze(['shoulder', 'elbow', 'wrist', 'hand'] as const),
    reasonKo: '90° 굴곡에서 골반선(Hip line) 또는 관상면 후방까지 상완골 아크와 주관절 신전을 정교하게 수행합니다.',
  }),
  Object.freeze({
    muscleGroupId: 'core-transversus',
    labelKo: '심부 코어·복횡근 (전면 흉곽 닫힘 Rib Knit & 요추 중립)',
    labelEn: 'Transversus Abdominis & Anterior Rib Closure',
    catalogMuscleMatches: Object.freeze(['복횡근', '복직근', '내복사근', '외복사근', '몸통']),
    role: 'stabilizer',
    roleLabelKo: '안정화근 (코어·정렬 유지)',
    activePhases: Object.freeze(['start', 'middle', 'end'] as const),
    anchorJoints: Object.freeze(['thoracic', 'lumbar', 'pelvis'] as const),
    reasonKo: '상지 지렛대가 이동할 때 전면 갈비뼈가 들뜨거나(Rib flare) 허리가 과신전되는 보상을 차단합니다.',
  }),
]);

function buildCorrectionFromLedgerEntry(
  entry: UpperBodyArmLedgerEntry,
  archetypeIdOverride?: string,
): MovementDiagramCorrection {
  return Object.freeze({
    archetypeId: archetypeIdOverride ?? entry.archetypeId,
    checkedAt: entry.checkedAt,
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

interface BuildUpperBodyVisualAssetParams {
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
  readonly supportSurfaceKo: string;
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

function buildUpperBodyVisualAsset(
  params: BuildUpperBodyVisualAssetParams,
): CatalogMovementVisualAsset {
  const makeFixedAnchors = (joints: RigJointMap) =>
    Object.freeze([
      Object.freeze({
        joint: 'thoracic' as const,
        surfaceKo: '흉곽 전면 닫힘(Rib Knit) & 견갑 하강 기준점',
        point: joints.thoracic,
      }),
      Object.freeze({
        joint: 'pelvis' as const,
        surfaceKo: '천골/좌골/골반 중립 수직 지지 앵커',
        point: joints.pelvis,
      }),
    ]);

  const movingJoints: readonly (keyof RigJointMap)[] = Object.freeze([
    'shoulder',
    'elbow',
    'wrist',
    'hand',
    'farElbow',
    'farWrist',
  ]);

  const makePhase = (
    phaseId: VisualPhaseId,
    idx: 0 | 1 | 2,
    joints: RigJointMap,
    carriageOffsetPx: number,
  ): PhasePoseSpec =>
    Object.freeze({
      phaseId,
      badgeKo:
        phaseId === 'start'
          ? '시작 자세 (준비·정렬)'
          : phaseId === 'middle'
            ? '중간 자세 (최대 가동·정점)'
            : '끝 자세 (제어 복귀·마무리)',
      shortTitleKo: params.phaseTitlesKo[idx],
      summaryKo: params.phaseSummariesKo[idx],
      breathCueKo: params.breathCuesKo[idx],
      joints,
      fixedAnchors: makeFixedAnchors(joints),
      movingJoints,
      apparatusState: Object.freeze({
        carriageOffsetPx,
        pedalAngleDeg: 0,
        springTensionLevel: params.apparatus === 'mat' ? 'none' : 'medium',
        supportSurfaceKo: params.supportSurfaceKo,
      }),
      alignments: Object.freeze([...params.alignments[phaseId]]),
      directionVectors: Object.freeze([...params.directionVectors[phaseId]]),
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
      '앱 자체 제작 상지 키네마틱 도해 (Original Free-License Kinematic SVG v1 · 외부 저작권 무관)',
    anatomicalAccuracyAssumed: false,
    phases: Object.freeze({
      start: makePhase('start', 0, params.startJoints, params.apparatus === 'reformer' ? 4 : 0),
      middle: makePhase('middle', 1, params.middleJoints, params.apparatus === 'reformer' ? 26 : 0),
      end: makePhase('end', 2, params.endJoints, params.apparatus === 'reformer' ? 6 : 0),
    }),
    primaryMuscles: UPPER_BODY_ARM_MUSCLES,
    poseDeltaSummary: Object.freeze(params.poseDeltaSummary),
    mobileSummaryBulletsKo: Object.freeze(params.mobileSummaryBulletsKo),
  });
}

// ============================================================================
// GROUP 1: SUPINE & STANDING STRAP PRESS (supine-and-standing-strap-press)
// ============================================================================

const STRAP_PRESS_START_JOINTS: RigJointMap = freezeJoints({
  head: { x: 56, y: 136 },
  neck: { x: 74, y: 138 },
  shoulder: { x: 94, y: 136 },
  elbow: { x: 94, y: 98 },
  wrist: { x: 96, y: 66 },
  hand: { x: 96, y: 54 },
  thoracic: { x: 124, y: 140 },
  lumbar: { x: 152, y: 140 },
  pelvis: { x: 180, y: 142 },
  hip: { x: 188, y: 140 },
  knee: { x: 188, y: 94 },
  ankle: { x: 238, y: 94 },
  heel: { x: 234, y: 100 },
  toe: { x: 250, y: 90 },
  farShoulder: { x: 92, y: 134 },
  farElbow: { x: 92, y: 96 },
  farWrist: { x: 94, y: 64 },
  farHip: { x: 184, y: 138 },
  farKnee: { x: 184, y: 92 },
  farAnkle: { x: 234, y: 92 },
  farToe: { x: 246, y: 88 },
});

const STRAP_PRESS_MIDDLE_JOINTS: RigJointMap = freezeJoints({
  head: { x: 56, y: 136 },
  neck: { x: 74, y: 138 },
  shoulder: { x: 98, y: 138 },
  elbow: { x: 136, y: 138 },
  wrist: { x: 168, y: 140 },
  hand: { x: 180, y: 140 },
  thoracic: { x: 124, y: 140 },
  lumbar: { x: 152, y: 140 },
  pelvis: { x: 180, y: 142 },
  hip: { x: 188, y: 140 },
  knee: { x: 188, y: 94 },
  ankle: { x: 238, y: 94 },
  heel: { x: 234, y: 100 },
  toe: { x: 250, y: 90 },
  farShoulder: { x: 96, y: 136 },
  farElbow: { x: 134, y: 136 },
  farWrist: { x: 166, y: 138 },
  farHip: { x: 184, y: 138 },
  farKnee: { x: 184, y: 92 },
  farAnkle: { x: 234, y: 92 },
  farToe: { x: 246, y: 88 },
});

const STRAP_PRESS_END_JOINTS: RigJointMap = freezeJoints({
  head: { x: 56, y: 136 },
  neck: { x: 74, y: 138 },
  shoulder: { x: 95, y: 136 },
  elbow: { x: 98, y: 100 },
  wrist: { x: 100, y: 68 },
  hand: { x: 100, y: 56 },
  thoracic: { x: 124, y: 140 },
  lumbar: { x: 152, y: 140 },
  pelvis: { x: 180, y: 142 },
  hip: { x: 188, y: 140 },
  knee: { x: 188, y: 94 },
  ankle: { x: 238, y: 94 },
  heel: { x: 234, y: 100 },
  toe: { x: 250, y: 90 },
  farShoulder: { x: 93, y: 134 },
  farElbow: { x: 96, y: 98 },
  farWrist: { x: 98, y: 66 },
  farHip: { x: 184, y: 138 },
  farKnee: { x: 184, y: 92 },
  farAnkle: { x: 234, y: 92 },
  farToe: { x: 246, y: 88 },
});

const STRAP_PRESS_SPEC: UpperBodyArmDiagramSpec = Object.freeze({
  id: 'supine-and-standing-strap-press',
  diagramId: 'supine-and-standing-strap-press',
  mappedExerciseIds: Object.freeze([
    'original-reformer-supine-arm-press',
    'original-cadillac-arm-spring-press',
    'original-barrel-supported-arm-reach',
    'ex-upper-01',
    'ex-kr-reformer-03',
  ]),
  primaryCatalogExerciseId: 'original-reformer-supine-arm-press',
  nameKo: '수파인·스탠딩 스트랩 & 암 스프링 프레스 (Strap & Arm Spring Press)',
  nameEn: 'Supine & Standing Strap / Arm Spring Press',
  subtitleKo: '상완골 90° 굴곡 준비 → 전면 흉곽 닫힘(Rib Knit) & 골반선(Hip line) 하방 암 프레스 → 편심성 제어 복귀',
  focusSummaryKo:
    '리포머 수파인 암 서클/트라이셉스 프레스, 캐딜락 암 스프링 프레스, 바렐 지지 암 리치에서 전면 갈비뼈 들림 없이 견갑 하강과 상완골 90°→0° 원호 제어를 수행합니다.',
  archetypeId: 'supine-strap-arm-press',
  archetypeTitleKo: '수파인 스트랩 · 암 스프링 프레스 (광배·전거근 연결)',
  supportBaselineY: 146,
  kinematicMetrics: Object.freeze({
    startHumeralFlexionDeg: 90,
    middleHumeralTargetDeg: 0,
    scapularDepressionDeltaPx: 4,
    ribcageAnchorY: 140,
    supportBaselineY: 146,
  }),
  vectorOverlays: Object.freeze([
    {
      id: 'strap-press-humeral-arc',
      labelKo: '상완골 90°→골반선(0°) 하방 프레스 아크',
      kind: 'humeral-arc',
      phaseId: 'middle',
      svgPathD: 'M 96 54 Q 156 68 180 140',
      startPoint: pt(96, 54),
      endPoint: pt(180, 140),
    },
    {
      id: 'strap-press-scapular-depression',
      labelKo: '견갑골 하강·전인 안정 벡터 (광배·전거근 연결)',
      kind: 'scapular-depression-retraction',
      phaseId: 'middle',
      svgPathD: 'M 90 136 L 114 139',
      startPoint: pt(90, 136),
      endPoint: pt(114, 139),
    },
    {
      id: 'strap-press-return-arc',
      labelKo: '스프링 저항 편심성 제어 복귀 (0°→90°)',
      kind: 'humeral-arc',
      phaseId: 'end',
      svgPathD: 'M 180 140 Q 154 72 100 56',
      startPoint: pt(180, 140),
      endPoint: pt(100, 56),
    },
  ] as const),
  calloutLabels: Object.freeze([
    {
      id: 'strap-callout-start',
      phaseId: 'start',
      textKo: '상완 90° 수직 세팅 · 쇄골 확장 & 늑골 접지',
      anchor: pt(96, 54),
      badgePosition: pt(48, 34),
      tone: 'scapular',
    },
    {
      id: 'strap-callout-middle',
      phaseId: 'middle',
      textKo: '골반선(Hip line) 하방 프레스 · 전면 흉곽 닫힘 유지',
      anchor: pt(180, 140),
      badgePosition: pt(96, 36),
      tone: 'humeral',
    },
    {
      id: 'strap-callout-end',
      phaseId: 'end',
      textKo: '어깨 거상 없이 90° 준비 위치로 편심성 복귀',
      anchor: pt(100, 56),
      badgePosition: pt(52, 34),
      tone: 'anchor',
    },
  ] as const),
  asset: buildUpperBodyVisualAsset({
    exerciseId: 'original-reformer-supine-arm-press',
    nameKo: '누워서 스트랩 암 프레스',
    nameEn: 'Supine Strap Arm Press',
    apparatus: 'reformer',
    bodyPosition: 'supine',
    blockCategory: 'core',
    spinalPlanes: ['neutral'],
    isUnilateral: false,
    archetypeId: 'supine-strap-arm-press',
    archetypeTitleKo: '수파인 스트랩 · 암 스프링 프레스 (광배·전거근 연결)',
    supportSurfaceKo: '리포머 캐리지 / 캐딜락 / 바렐 상부 흉곽·천골 지지면 (y=140..142)',
    startJoints: STRAP_PRESS_START_JOINTS,
    middleJoints: STRAP_PRESS_MIDDLE_JOINTS,
    endJoints: STRAP_PRESS_END_JOINTS,
    phaseTitlesKo: [
      '상완 90° 수직 굴곡 & 견갑 하강 준비',
      '골반선(Hip line) 하방 스트랩 프레스 정점',
      '흉곽 닫힘 유지 & 90° 편심성 제어 복귀',
    ],
    phaseSummariesKo: [
      '후두부·흉추(y=140)·천골(y=142)을 지지면에 두고 양손 스트랩을 어깨 수직 위(90°)에 세팅하여 쇄골을 넓힙니다.',
      '날숨에 전면 갈비뼈를 닫은 채 겨드랑이 아래 광배근·삼두근 힘으로 손끝을 골반 옆(180,140)까지 길게 눌러 내립니다.',
      '들숨에 어깨가 귀 쪽으로 끌려 올라가지 않게 저항을 버티며 상완골 90° 위치로 천천히 돌아옵니다.',
    ],
    breathCuesKo: [
      '들숨 준비: 흉곽 측면 확장 & 날개뼈 아랫각을 골반 쪽으로 고정',
      '날숨 프레스: 아랫배와 갈비뼈를 닫으며 손끝을 골반선까지 길게 푸시',
      '들숨 복귀: 광배근 편심성 제어로 스트랩 장력을 느끼며 90° 복귀',
    ],
    alignments: {
      start: [
        {
          id: 'strap-start-vertical-90',
          labelKo: '견관절 90° 수직 스트랩 정렬',
          cueKo: '손목이 꺾이지 않게 중립을 유지하고 어깨와 수직선상에 루프를 위치시킵니다.',
          kind: 'angle-arc',
          from: pt(94, 136),
          to: pt(96, 54),
          targetAngleDeg: 90,
          cautionKo: '스프링 장력에 어깨가 숄더블록 쪽으로 들리지 않게 주의합니다.',
        },
      ],
      middle: [
        {
          id: 'strap-middle-rib-closure',
          labelKo: '전면 흉곽 닫힘(Rib Knit) & 골반선 수평 프레스',
          cueKo: '팔을 골반 옆으로 내릴 때 명치와 허리가 들뜨지 않게 복횡근으로 잠급니다.',
          kind: 'anchor-lock',
          from: pt(124, 140),
          to: pt(180, 142),
          targetAngleDeg: 0,
          cautionKo: '손바닥만 세게 누르며 상완골두가 앞으로 말리지 않게 합니다.',
        },
      ],
      end: [
        {
          id: 'strap-end-eccentric-return',
          labelKo: '견갑 하강 유지 편심성 복귀선',
          cueKo: '팔이 올라가는 마지막 순간까지 목 옆 공간을 길게 유지합니다.',
          kind: 'axis-line',
          from: pt(95, 136),
          to: pt(100, 56),
          targetAngleDeg: 90,
          cautionKo: '스트랩이 당기는 힘에 갈비뼈가 함께 들리지 않게 합니다.',
        },
      ],
    },
    directionVectors: {
      start: [
        {
          id: 'vec-strap-scap-set',
          labelKo: '견갑골 하강 안정화 세팅',
          kind: 'axial-lengthening',
          points: [pt(94, 136), pt(124, 140)],
          phaseScope: 'start',
        },
      ],
      middle: [
        {
          id: 'vec-strap-downward-arc',
          labelKo: '90°→골반선 상완 하방 프레스 아크',
          kind: 'spring-resistance',
          points: [pt(96, 54), pt(156, 86), pt(180, 140)],
          phaseScope: 'start-to-middle',
        },
      ],
      end: [
        {
          id: 'vec-strap-return-arc',
          labelKo: '90° 수직 준비선 편심성 복귀',
          kind: 'return-control',
          points: [pt(180, 140), pt(148, 84), pt(100, 56)],
          phaseScope: 'middle-to-end',
        },
      ],
    },
    poseDeltaSummary: {
      startToMiddleKo:
        '흉추(y:140)·천골(y:142) 지지점을 고정한 채 손끝이 수직 위(96,54)에서 골반 옆(180,140)으로 90° 원호 하강합니다.',
      middleToEndKo:
        '견갑 하강을 유지하며 골반 옆(180,140)에서 어깨 수직 위(100,56)로 편심성 복귀합니다.',
      invariantAnchorsKo: '흉추(thoracic y:140), 요추(lumbar y:140), 골반(pelvis y:142) 및 90° 테이블탑 하지 정렬이 고정됩니다.',
      keyJointChangeKo: '상완골 90° 굴곡→0° 골반선 신전 아크(hand Δ120px) + 견갑 하강(+4px)',
    },
    mobileSummaryBulletsKo: [
      '시작 정렬: 상완골 90° 수직 세팅 · 전면 흉곽 닫힘(y=140) · 견갑 평평한 접지',
      '중간 정점: 광배근·삼두근 연결로 골반선(Hip line)까지 스트랩/스프링 하방 프레스',
      '제어 복귀: 승모근 거상 및 갈비뼈 들림 없이 90° 시작 위치로 편심성 회수',
    ],
  }),
  correction: buildCorrectionFromLedgerEntry(LEDGER_ENTRY_BY_ID['supine-and-standing-strap-press']),
  ledgerEntry: LEDGER_ENTRY_BY_ID['supine-and-standing-strap-press'],
});

// ============================================================================
// GROUP 2: SEATED ROW & BAND RETRACTION (seated-row-and-band-retraction)
// ============================================================================

const SEATED_ROW_START_JOINTS: RigJointMap = freezeJoints({
  head: { x: 112, y: 46 },
  neck: { x: 112, y: 64 },
  shoulder: { x: 112, y: 80 },
  elbow: { x: 148, y: 92 },
  wrist: { x: 184, y: 88 },
  hand: { x: 196, y: 88 },
  thoracic: { x: 112, y: 104 },
  lumbar: { x: 112, y: 124 },
  pelvis: { x: 112, y: 142 },
  hip: { x: 118, y: 142 },
  knee: { x: 174, y: 142 },
  ankle: { x: 230, y: 142 },
  heel: { x: 234, y: 146 },
  toe: { x: 242, y: 128 },
  farShoulder: { x: 108, y: 78 },
  farElbow: { x: 144, y: 90 },
  farWrist: { x: 180, y: 86 },
  farHip: { x: 114, y: 140 },
  farKnee: { x: 170, y: 140 },
  farAnkle: { x: 226, y: 140 },
  farToe: { x: 238, y: 126 },
});

const SEATED_ROW_MIDDLE_JOINTS: RigJointMap = freezeJoints({
  head: { x: 112, y: 44 },
  neck: { x: 112, y: 62 },
  shoulder: { x: 106, y: 82 },
  elbow: { x: 88, y: 102 },
  wrist: { x: 122, y: 100 },
  hand: { x: 132, y: 100 },
  thoracic: { x: 112, y: 104 },
  lumbar: { x: 112, y: 124 },
  pelvis: { x: 112, y: 142 },
  hip: { x: 118, y: 142 },
  knee: { x: 174, y: 142 },
  ankle: { x: 230, y: 142 },
  heel: { x: 234, y: 146 },
  toe: { x: 242, y: 128 },
  farShoulder: { x: 102, y: 80 },
  farElbow: { x: 84, y: 98 },
  farWrist: { x: 118, y: 96 },
  farHip: { x: 114, y: 140 },
  farKnee: { x: 170, y: 140 },
  farAnkle: { x: 226, y: 140 },
  farToe: { x: 238, y: 126 },
});

const SEATED_ROW_END_JOINTS: RigJointMap = freezeJoints({
  head: { x: 112, y: 46 },
  neck: { x: 112, y: 64 },
  shoulder: { x: 110, y: 80 },
  elbow: { x: 144, y: 92 },
  wrist: { x: 180, y: 88 },
  hand: { x: 192, y: 88 },
  thoracic: { x: 112, y: 104 },
  lumbar: { x: 112, y: 124 },
  pelvis: { x: 112, y: 142 },
  hip: { x: 118, y: 142 },
  knee: { x: 174, y: 142 },
  ankle: { x: 230, y: 142 },
  heel: { x: 234, y: 146 },
  toe: { x: 242, y: 128 },
  farShoulder: { x: 106, y: 78 },
  farElbow: { x: 140, y: 90 },
  farWrist: { x: 176, y: 86 },
  farHip: { x: 114, y: 140 },
  farKnee: { x: 170, y: 140 },
  farAnkle: { x: 226, y: 140 },
  farToe: { x: 238, y: 126 },
});

const SEATED_ROW_SPEC: UpperBodyArmDiagramSpec = Object.freeze({
  id: 'seated-row-and-band-retraction',
  diagramId: 'seated-row-and-band-retraction',
  mappedExerciseIds: Object.freeze([
    'original-reformer-seated-row',
    'original-mat-band-row',
    'ex-upper-02',
    'ex-global-reformer-03',
  ]),
  primaryCatalogExerciseId: 'original-reformer-seated-row',
  nameKo: '시티드 로우 & 밴드 견갑 리트랙션 (Seated Row & Scapular Retraction)',
  nameEn: 'Seated Box / Band Row & Scapular Retraction',
  subtitleKo: '좌골 수직 스택(x=112) 세팅 → 견갑 후인·하강 및 주관절 수평 로잉 → 전방 감속 복귀',
  focusSummaryKo:
    '리포머 시티드 로잉(Serve a Tray / Shave / Hug a Tree) 및 매트 밴드 로우에서 좌골 수직 기둥을 유지하고 상부 승모근 거상이나 전면 늑골 돌출 없이 견갑골 후인·하강을 제어합니다.',
  archetypeId: 'seated-row-arm-arc',
  archetypeTitleKo: '시티드 로잉 · 암 리치 & 쉐이브/써브 어 트레이',
  supportBaselineY: 146,
  kinematicMetrics: Object.freeze({
    startHumeralFlexionDeg: 75,
    middleHumeralTargetDeg: -15,
    scapularDepressionDeltaPx: 6,
    ribcageAnchorY: 104,
    supportBaselineY: 146,
  }),
  vectorOverlays: Object.freeze([
    {
      id: 'row-scapular-retraction',
      labelKo: '견갑골 후인(Retraction) + 하강(Depression) 벡터',
      kind: 'scapular-depression-retraction',
      phaseId: 'middle',
      svgPathD: 'M 196 88 L 132 100 L 88 102',
      startPoint: pt(196, 88),
      endPoint: pt(88, 102),
    },
    {
      id: 'row-sitbone-plumb',
      labelKo: '좌골-흉곽-정수리 수직 스택 (x=112 · Rib flare 0)',
      kind: 'ribcage-closure-anchor',
      phaseId: 'middle',
      svgPathD: 'M 112 142 L 112 44',
      startPoint: pt(112, 142),
      endPoint: pt(112, 44),
    },
    {
      id: 'row-controlled-release',
      labelKo: '견갑 안정 유지 전방 감속 리치',
      kind: 'humeral-arc',
      phaseId: 'end',
      svgPathD: 'M 132 100 L 192 88',
      startPoint: pt(132, 100),
      endPoint: pt(192, 88),
    },
  ] as const),
  calloutLabels: Object.freeze([
    {
      id: 'row-callout-start',
      phaseId: 'start',
      textKo: '좌골 수직 스택(x=112) & 전방 밴드/스트랩 준비',
      anchor: pt(196, 88),
      badgePosition: pt(136, 36),
      tone: 'anchor',
    },
    {
      id: 'row-callout-middle',
      phaseId: 'middle',
      textKo: '견갑 후인·하강 로잉 (승모근 거상·늑골 들림 억제)',
      anchor: pt(88, 102),
      badgePosition: pt(34, 34),
      tone: 'scapular',
    },
    {
      id: 'row-callout-end',
      phaseId: 'end',
      textKo: '날개뼈 간격 유지하며 전방 감속 복귀',
      anchor: pt(192, 88),
      badgePosition: pt(132, 36),
      tone: 'humeral',
    },
  ] as const),
  asset: buildUpperBodyVisualAsset({
    exerciseId: 'original-reformer-seated-row',
    nameKo: '박스 시티드 로우',
    nameEn: 'Box Seated Row',
    apparatus: 'reformer',
    bodyPosition: 'seated',
    blockCategory: 'upper-body',
    spinalPlanes: ['neutral'],
    isUnilateral: false,
    archetypeId: 'seated-row-arm-arc',
    archetypeTitleKo: '시티드 로잉 · 암 리치 & 쉐이브/써브 어 트레이',
    supportSurfaceKo: '리포머 박스 / 매트 좌골 수직 지지면 (pelvis x=112, y=142)',
    startJoints: SEATED_ROW_START_JOINTS,
    middleJoints: SEATED_ROW_MIDDLE_JOINTS,
    endJoints: SEATED_ROW_END_JOINTS,
    phaseTitlesKo: [
      '좌골 수직 기둥 세팅 & 전방 암 리치 준비',
      '견갑 후인·하강 로잉 & 팔꿈치 후방 견인 정점',
      '쇄골 폭 유지 & 전방 편심성 감속 복귀',
    ],
    phaseSummariesKo: [
      '두 좌골결절(112,142) 위에 요추·흉추·머리를 수직으로 세우고 양손에 스트랩/밴드를 잡아 전방(196,88)으로 준비합니다.',
      '날숨에 정수리는 천장으로 길게 뻗고, 갈비뼈 돌출 없이 날개뼈를 등 중앙 아래로 모아 팔꿈치를 몸통 뒤(88,102)로 당깁니다.',
      '들숨에 어깨가 앞으로 말리지 않도록 견갑대 안정성을 유지하며 양팔을 시작 위치(192,88)로 천천히 뻗어 복귀합니다.',
    ],
    breathCuesKo: [
      '들숨 준비: 좌골로 바닥을 밀어내며 정수리 축성 신장',
      '날숨 로잉: 전면 갈비뼈를 닫으며 날개뼈 사이를 넓고 깊게 수축',
      '들숨 복귀: 등 근육의 편심성 브레이크로 스트랩/밴드 장력 제어 복귀',
    ],
    alignments: {
      start: [
        {
          id: 'row-start-sitbone-stack',
          labelKo: '좌골-흉곽-정수리 수직 플럼라인 (x=112)',
          cueKo: '골반이 뒤로 말리지 않게 좌골 정점에 체중을 세웁니다.',
          kind: 'plumb-line',
          from: pt(112, 142),
          to: pt(112, 46),
          targetAngleDeg: 90,
          cautionKo: '햄스트링이 당기면 무릎을 살짝 굽혀서라도 척추 수직을 우선합니다.',
        },
      ],
      middle: [
        {
          id: 'row-middle-scap-retraction',
          labelKo: '견갑골 후인·하강 & 전면 늑골 고정선',
          cueKo: '팔꿈치를 뒤로 당길 때 가슴을 과하게 내밀어 요추를 꺾지 않습니다.',
          kind: 'anchor-lock',
          from: pt(88, 102),
          to: pt(112, 124),
          cautionKo: '상부 승모근이 귀 쪽으로 솟지 않게 겨드랑이 아래를 끌어내립니다.',
        },
      ],
      end: [
        {
          id: 'row-end-protraction-control',
          labelKo: '견갑 익상 없는 전방 복귀 정렬',
          cueKo: '밴드/스트랩이 당기는 힘에 몸통이 앞으로 끌려가지 않게 코어를 지킵니다.',
          kind: 'axis-line',
          from: pt(110, 80),
          to: pt(192, 88),
          cautionKo: '손목이 꺾이지 않게 전완과 손등 라인을 일직선으로 유지합니다.',
        },
      ],
    },
    directionVectors: {
      start: [
        {
          id: 'vec-row-axial-tall',
          labelKo: '정수리 수직 축성 신장',
          kind: 'axial-lengthening',
          points: [pt(112, 142), pt(112, 46)],
          phaseScope: 'start',
        },
      ],
      middle: [
        {
          id: 'vec-row-pull-back',
          labelKo: '팔꿈치 수평 후방 견인 & 견갑 내전',
          kind: 'spring-resistance',
          points: [pt(196, 88), pt(132, 100), pt(88, 102)],
          phaseScope: 'start-to-middle',
        },
      ],
      end: [
        {
          id: 'vec-row-forward-return',
          labelKo: '전방 스트랩/밴드 감속 복귀',
          kind: 'return-control',
          points: [pt(88, 102), pt(144, 92), pt(192, 88)],
          phaseScope: 'middle-to-end',
        },
      ],
    },
    poseDeltaSummary: {
      startToMiddleKo:
        '좌골-척추 수직선(x:112)은 고정된 채 손(196,88→132,100)과 팔꿈치(148,92→88,102)가 몸통 뒤로 64px 수평 견인됩니다.',
      middleToEndKo:
        '견갑 하강을 유지하며 팔꿈치와 손이 전방 시작 정렬(192,88)로 편심성 감속 복귀합니다.',
      invariantAnchorsKo: '좌골(pelvis 112,142), 요추(112,124), 흉추(112,104), 머리(112,44..46) 수직 기둥이 고정됩니다.',
      keyJointChangeKo: '주관절 후방 로잉(elbow Δ60px) + 견갑 후인·하강(shoulder Δ6px)',
    },
    mobileSummaryBulletsKo: [
      '시작 정렬: 양쪽 좌골 수직 스택(x=112) · 정수리 축성 신장 · 전방 스트랩/밴드 파지',
      '중간 정점: 상부 승모근 거상 및 갈비뼈 들림 없이 견갑골 후인·하강 로잉',
      '제어 복귀: 몸통 수직 기둥을 지킨 채 밴드/스트랩 장력을 버티며 전방 복귀',
    ],
  }),
  correction: buildCorrectionFromLedgerEntry(LEDGER_ENTRY_BY_ID['seated-row-and-band-retraction']),
  ledgerEntry: LEDGER_ENTRY_BY_ID['seated-row-and-band-retraction'],
});

// ============================================================================
// GROUP 3: KNEELING CHEST EXPANSION & CHAIR ARM ARC
// (kneeling-chest-expansion-and-chair-arm-arc)
// ============================================================================

const CHEST_EXPANSION_START_JOINTS: RigJointMap = freezeJoints({
  head: { x: 140, y: 40 },
  neck: { x: 140, y: 58 },
  shoulder: { x: 140, y: 74 },
  elbow: { x: 162, y: 100 },
  wrist: { x: 176, y: 120 },
  hand: { x: 182, y: 126 },
  thoracic: { x: 140, y: 98 },
  lumbar: { x: 140, y: 116 },
  pelvis: { x: 140, y: 130 },
  hip: { x: 140, y: 132 },
  knee: { x: 140, y: 164 },
  ankle: { x: 184, y: 166 },
  heel: { x: 182, y: 160 },
  toe: { x: 192, y: 168 },
  farShoulder: { x: 136, y: 72 },
  farElbow: { x: 158, y: 98 },
  farWrist: { x: 172, y: 118 },
  farHip: { x: 136, y: 130 },
  farKnee: { x: 136, y: 162 },
  farAnkle: { x: 180, y: 164 },
  farToe: { x: 188, y: 166 },
});

const CHEST_EXPANSION_MIDDLE_JOINTS: RigJointMap = freezeJoints({
  head: { x: 140, y: 38 },
  neck: { x: 140, y: 56 },
  shoulder: { x: 136, y: 76 },
  elbow: { x: 114, y: 106 },
  wrist: { x: 96, y: 128 },
  hand: { x: 88, y: 136 },
  thoracic: { x: 140, y: 96 },
  lumbar: { x: 140, y: 116 },
  pelvis: { x: 140, y: 130 },
  hip: { x: 140, y: 132 },
  knee: { x: 140, y: 164 },
  ankle: { x: 184, y: 166 },
  heel: { x: 182, y: 160 },
  toe: { x: 192, y: 168 },
  farShoulder: { x: 132, y: 74 },
  farElbow: { x: 110, y: 104 },
  farWrist: { x: 92, y: 126 },
  farHip: { x: 136, y: 130 },
  farKnee: { x: 136, y: 162 },
  farAnkle: { x: 180, y: 164 },
  farToe: { x: 188, y: 166 },
});

const CHEST_EXPANSION_END_JOINTS: RigJointMap = freezeJoints({
  head: { x: 140, y: 40 },
  neck: { x: 140, y: 58 },
  shoulder: { x: 139, y: 74 },
  elbow: { x: 158, y: 100 },
  wrist: { x: 172, y: 120 },
  hand: { x: 178, y: 126 },
  thoracic: { x: 140, y: 98 },
  lumbar: { x: 140, y: 116 },
  pelvis: { x: 140, y: 130 },
  hip: { x: 140, y: 132 },
  knee: { x: 140, y: 164 },
  ankle: { x: 184, y: 166 },
  heel: { x: 182, y: 160 },
  toe: { x: 192, y: 168 },
  farShoulder: { x: 135, y: 72 },
  farElbow: { x: 154, y: 98 },
  farWrist: { x: 168, y: 118 },
  farHip: { x: 136, y: 130 },
  farKnee: { x: 136, y: 162 },
  farAnkle: { x: 180, y: 164 },
  farToe: { x: 188, y: 166 },
});

const CHEST_EXPANSION_SPEC: UpperBodyArmDiagramSpec = Object.freeze({
  id: 'kneeling-chest-expansion-and-chair-arm-arc',
  diagramId: 'kneeling-chest-expansion-and-chair-arm-arc',
  mappedExerciseIds: Object.freeze([
    'original-chair-seated-arm-arc',
    'original-mat-seated-arm-reach',
    'original-chair-seated-back-reach',
    'ex-upper-03',
  ]),
  primaryCatalogExerciseId: 'original-chair-seated-arm-arc',
  nameKo: '닐링 체스트 익스팬션 & 체어·매트 암 아크 (Chest Expansion & Arm Arc)',
  nameEn: 'Kneeling Chest Expansion & Seated Chair/Mat Arm Arc',
  subtitleKo: '무릎-고관절-어깨 수직 스택(x=140) → 관상면 후방 견관절 신전 & 흉곽 확장 → 수직축 유지 복귀',
  focusSummaryKo:
    '닐링 체스트 익스팬션 및 체어·매트 암 아크/가슴 리치/스탠딩 암 스프링에서 경추·흉추 중립과 고관절-무릎 수직 스택을 지키며 관상면 뒤쪽으로 상완골 신전 및 아크를 수행합니다.',
  archetypeId: 'kneeling-chest-expansion-triceps',
  archetypeTitleKo: '닐링 체스트 익스팬션 · 롤다운 바 & 트라이셉스/스트레치',
  supportBaselineY: 168,
  kinematicMetrics: Object.freeze({
    startHumeralFlexionDeg: 35,
    middleHumeralTargetDeg: -38,
    scapularDepressionDeltaPx: 5,
    ribcageAnchorY: 96,
    supportBaselineY: 168,
  }),
  vectorOverlays: Object.freeze([
    {
      id: 'chest-exp-posterior-arc',
      labelKo: '관상면 후방 견관절 신전 아크 (35° → -38°)',
      kind: 'posterior-extension-arc',
      phaseId: 'middle',
      svgPathD: 'M 182 126 Q 140 144 88 136',
      startPoint: pt(182, 126),
      endPoint: pt(88, 136),
    },
    {
      id: 'chest-exp-vertical-stack',
      labelKo: '무릎-고관절-흉곽-정수리 수직 스택 (x=140)',
      kind: 'ribcage-closure-anchor',
      phaseId: 'middle',
      svgPathD: 'M 140 164 L 140 38',
      startPoint: pt(140, 164),
      endPoint: pt(140, 38),
    },
    {
      id: 'chest-exp-return-arc',
      labelKo: '몸통 흔들림 없는 전방 감속 회수',
      kind: 'humeral-arc',
      phaseId: 'end',
      svgPathD: 'M 88 136 Q 136 142 178 126',
      startPoint: pt(88, 136),
      endPoint: pt(178, 126),
    },
  ] as const),
  calloutLabels: Object.freeze([
    {
      id: 'chest-exp-callout-start',
      phaseId: 'start',
      textKo: '고관절-무릎 수직 스택(x=140) & 쇄골 오픈 준비',
      anchor: pt(140, 74),
      badgePosition: pt(164, 42),
      tone: 'anchor',
    },
    {
      id: 'chest-exp-callout-middle',
      phaseId: 'middle',
      textKo: '관상면 후방 상완 신전(-38°) & 경추·흉추 수직 유지',
      anchor: pt(88, 136),
      badgePosition: pt(24, 34),
      tone: 'humeral',
    },
    {
      id: 'chest-exp-callout-end',
      phaseId: 'end',
      textKo: '골반 전방 흔들림 없이 시작 정렬 복귀',
      anchor: pt(178, 126),
      badgePosition: pt(160, 42),
      tone: 'scapular',
    },
  ] as const),
  asset: buildUpperBodyVisualAsset({
    exerciseId: 'original-chair-seated-arm-arc',
    nameKo: '체어 시티드 암 아크',
    nameEn: 'Chair Seated Arm Arc',
    apparatus: 'chair',
    bodyPosition: 'seated',
    blockCategory: 'upper-body',
    spinalPlanes: ['neutral', 'extension'],
    isUnilateral: false,
    archetypeId: 'kneeling-chest-expansion-triceps',
    archetypeTitleKo: '닐링 체스트 익스팬션 · 롤다운 바 & 트라이셉스/스트레치',
    supportSurfaceKo: '리포머 캐리지 닐링 / 체어 시트 / 캐딜락 스탠딩 수직 지지면 (x=140)',
    startJoints: CHEST_EXPANSION_START_JOINTS,
    middleJoints: CHEST_EXPANSION_MIDDLE_JOINTS,
    endJoints: CHEST_EXPANSION_END_JOINTS,
    phaseTitlesKo: [
      '무릎/좌골-고관절-어깨 수직 스택 세팅',
      '관상면 후방 견관절 신전 & 흉곽 확장 정점',
      '상체 수직 고정 & 스프링 저항 제어 복귀',
    ],
    phaseSummariesKo: [
      '무릎(또는 좌골)부터 고관절·어깨·귀까지 수직 일직선(x=140)으로 세우고 둔근과 복횡근으로 골반을 고정합니다.',
      '들숨(또는 날숨)에 쇄골을 옆으로 넓히며 양팔을 골반 뒤쪽(88,136)으로 길게 뻗어 가슴 전면과 상부 흉추를 확장합니다.',
      '몸통이 앞으로 쏠리거나 턱이 들리지 않게 수직 축을 지키며 양팔을 전방 준비 위치(178,126)로 제어 복귀합니다.',
    ],
    breathCuesKo: [
      '준비 호흡: 아랫배를 당겨 고관절 전면과 요추 중립 수직 잠금',
      '확장 호흡: 쇄골과 흉골을 넓히며 손끝을 몸통 뒤·아래로 길게 신전',
      '복귀 호흡: 정수리 높이를 유지하며 스프링 장력을 따라 감속 복귀',
    ],
    alignments: {
      start: [
        {
          id: 'chest-exp-start-plumb',
          labelKo: '무릎-고관절-어깨-귀 수직 플럼라인 (x=140)',
          cueKo: '엉덩이가 뒤로 빠지거나 허벅지가 앞으로 기울지 않게 수직 기둥을 세웁니다.',
          kind: 'plumb-line',
          from: pt(140, 164),
          to: pt(140, 40),
          targetAngleDeg: 90,
          cautionKo: '무릎 관절에만 체중을 싣지 말고 내전근과 둔근으로 중심을 끌어올립니다.',
        },
      ],
      middle: [
        {
          id: 'chest-exp-middle-posterior-reach',
          labelKo: '관상면 후방 상완골 신전(-38°) & 경추 중립',
          cueKo: '팔이 몸통 뒤로 갈 때 어깨가 앞으로 말리지 않게 하부 승모근을 끌어내립니다.',
          kind: 'angle-arc',
          from: pt(136, 76),
          to: pt(88, 136),
          targetAngleDeg: 38,
          cautionKo: '팔을 멀리 보내려고 턱을 앞으로 내밀거나 갈비뼈를 내밀지 않습니다.',
        },
      ],
      end: [
        {
          id: 'chest-exp-end-core-brake',
          labelKo: '고관절 수직 고정 편심성 복귀',
          cueKo: '팔이 돌아올 때 상체가 스프링 쪽으로 끌려가지 않게 복부를 먼저 조입니다.',
          kind: 'anchor-lock',
          from: pt(140, 132),
          to: pt(140, 98),
          cautionKo: '복귀 구간에서 어깨 긴장을 끝까지 늦추지 않습니다.',
        },
      ],
    },
    directionVectors: {
      start: [
        {
          id: 'vec-ce-crown-lift',
          labelKo: '정수리-무릎 양방향 축성 신장',
          kind: 'axial-lengthening',
          points: [pt(140, 164), pt(140, 40)],
          phaseScope: 'start',
        },
      ],
      middle: [
        {
          id: 'vec-ce-posterior-press',
          labelKo: '관상면 후방 상완 신전 & 견갑 하강',
          kind: 'spring-resistance',
          points: [pt(182, 126), pt(140, 134), pt(88, 136)],
          phaseScope: 'start-to-middle',
        },
      ],
      end: [
        {
          id: 'vec-ce-controlled-return',
          labelKo: '수직축 고정 전방 감속 복귀',
          kind: 'return-control',
          points: [pt(88, 136), pt(136, 132), pt(178, 126)],
          phaseScope: 'middle-to-end',
        },
      ],
    },
    poseDeltaSummary: {
      startToMiddleKo:
        '무릎-골반-흉추-머리 수직선(x:140)은 고정된 채 양손이 전방(182,126)에서 골반 뒤쪽(88,136)으로 관상면 후방 신전됩니다.',
      middleToEndKo:
        '몸통 흔들림 없이 양손이 후방(88,136)에서 전방 시작선(178,126)으로 편심성 제어 복귀합니다.',
      invariantAnchorsKo: '무릎(140,164), 골반(140,130), 흉추(140,96..98), 머리(140,38..40) 수직 플럼라인이 고정됩니다.',
      keyJointChangeKo: '견관절 관상면 후방 신전 아크(hand Δ94px) + 쇄골 확장·견갑 하강',
    },
    mobileSummaryBulletsKo: [
      '시작 정렬: 무릎/좌골-고관절-어깨-귀 수직 일직선(x=140) 세팅',
      '중간 정점: 턱 내밈·허리 꺾임 없이 관상면 뒤로 상완골 신전 & 가슴 오픈',
      '제어 복귀: 몸통이 앞으로 끌려가지 않게 코어 브레이크로 암 아크 회수',
    ],
  }),
  correction: buildCorrectionFromLedgerEntry(
    LEDGER_ENTRY_BY_ID['kneeling-chest-expansion-and-chair-arm-arc'],
  ),
  ledgerEntry: LEDGER_ENTRY_BY_ID['kneeling-chest-expansion-and-chair-arm-arc'],
});

export const UPPER_BODY_ARM_DIAGRAM_SPECS: Readonly<
  Record<UpperBodyArmDiagramId, UpperBodyArmDiagramSpec>
> = Object.freeze({
  'supine-and-standing-strap-press': STRAP_PRESS_SPEC,
  'seated-row-and-band-retraction': SEATED_ROW_SPEC,
  'kneeling-chest-expansion-and-chair-arm-arc': CHEST_EXPANSION_SPEC,
});

const EXERCISE_OR_DIAGRAM_ID_TO_GROUP: Readonly<Record<string, UpperBodyArmDiagramId>> =
  Object.freeze({
    // Diagram IDs
    'supine-and-standing-strap-press': 'supine-and-standing-strap-press',
    'seated-row-and-band-retraction': 'seated-row-and-band-retraction',
    'kneeling-chest-expansion-and-chair-arm-arc': 'kneeling-chest-expansion-and-chair-arm-arc',
    // Group 1 (5)
    'original-reformer-supine-arm-press': 'supine-and-standing-strap-press',
    'original-cadillac-arm-spring-press': 'supine-and-standing-strap-press',
    'original-barrel-supported-arm-reach': 'supine-and-standing-strap-press',
    'ex-upper-01': 'supine-and-standing-strap-press',
    'ex-kr-reformer-03': 'supine-and-standing-strap-press',
    // Group 2 (4)
    'original-reformer-seated-row': 'seated-row-and-band-retraction',
    'original-mat-band-row': 'seated-row-and-band-retraction',
    'ex-upper-02': 'seated-row-and-band-retraction',
    'ex-global-reformer-03': 'seated-row-and-band-retraction',
    // Group 3 (4)
    'original-chair-seated-arm-arc': 'kneeling-chest-expansion-and-chair-arm-arc',
    'original-mat-seated-arm-reach': 'kneeling-chest-expansion-and-chair-arm-arc',
    'original-chair-seated-back-reach': 'kneeling-chest-expansion-and-chair-arm-arc',
    'ex-upper-03': 'kneeling-chest-expansion-and-chair-arm-arc',
  });

export function resolveUpperBodyArmDiagramId(
  exerciseOrDiagramId: string | Pick<PilatesExercise, 'id'>,
): UpperBodyArmDiagramId | null {
  const rawId =
    typeof exerciseOrDiagramId === 'string' ? exerciseOrDiagramId : exerciseOrDiagramId.id;
  return EXERCISE_OR_DIAGRAM_ID_TO_GROUP[rawId] ?? null;
}

export function resolveUpperBodyArmDiagram(
  exerciseOrDiagramId: string | Pick<PilatesExercise, 'id'>,
): UpperBodyArmDiagramSpec | null {
  const diagramId = resolveUpperBodyArmDiagramId(exerciseOrDiagramId);
  return diagramId ? UPPER_BODY_ARM_DIAGRAM_SPECS[diagramId] : null;
}

let cachedCorrections: Readonly<Record<string, MovementDiagramCorrection>> | null = null;

export function getUpperBodyArmDiagramCorrections(): Readonly<
  Record<string, MovementDiagramCorrection>
> {
  if (cachedCorrections) {
    return cachedCorrections;
  }

  const record: Record<string, MovementDiagramCorrection> = {};

  for (const diagramId of UPPER_BODY_ARM_DIAGRAM_IDS) {
    const spec = UPPER_BODY_ARM_DIAGRAM_SPECS[diagramId];
    const diagramArchetypeId =
      getMovementVisualAsset(diagramId)?.archetypeId ?? spec.archetypeId;
    record[diagramId] = buildCorrectionFromLedgerEntry(spec.ledgerEntry, diagramArchetypeId);

    for (const exerciseId of spec.mappedExerciseIds) {
      const matchedArchetypeId =
        getMovementVisualAsset(exerciseId)?.archetypeId ??
        CATALOG_ARCHETYPE_MAP[exerciseId] ??
        spec.archetypeId;
      record[exerciseId] = buildCorrectionFromLedgerEntry(spec.ledgerEntry, matchedArchetypeId);
    }
  }

  cachedCorrections = Object.freeze(record);
  return cachedCorrections;
}

export function getUpperBodyArmCatalogVisualAssets(): Readonly<
  Record<string, CatalogMovementVisualAsset>
> {
  const assets: Record<string, CatalogMovementVisualAsset> = {};
  for (const diagramId of UPPER_BODY_ARM_DIAGRAM_IDS) {
    const spec = UPPER_BODY_ARM_DIAGRAM_SPECS[diagramId];
    assets[diagramId] = spec.asset;
    for (const exerciseId of spec.mappedExerciseIds) {
      const matchedArchetypeId =
        CATALOG_ARCHETYPE_MAP[exerciseId] ?? spec.archetypeId;
      assets[exerciseId] = Object.freeze({
        ...spec.asset,
        exerciseId,
        archetypeId: matchedArchetypeId,
      });
    }
  }
  return Object.freeze(assets);
}

/**
 * Computes the humeral vector angle in degrees relative to the torso vertical axis.
 */
export function computeHumeralArcExcursionDeg(spec: UpperBodyArmDiagramSpec): number {
  return Math.abs(
    spec.kinematicMetrics.startHumeralFlexionDeg - spec.kinematicMetrics.middleHumeralTargetDeg,
  );
}
