import sourceLedgerJson from './lateralAndApparatusSourceLedger.json';
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

export type LateralAndApparatusDiagramId =
  | 'lateral-mermaid-and-barrel-side-bend'
  | 'apparatus-and-side-lying-thoracic-rotation'
  | 'supine-tabletop-knee-fold-and-reverse-curl'
  | 'quadruped-and-apparatus-plank-pike';

export const LATERAL_AND_APPARATUS_DIAGRAM_IDS: readonly LateralAndApparatusDiagramId[] =
  Object.freeze([
    'lateral-mermaid-and-barrel-side-bend',
    'apparatus-and-side-lying-thoracic-rotation',
    'supine-tabletop-knee-fold-and-reverse-curl',
    'quadruped-and-apparatus-plank-pike',
  ]);

export const LATERAL_AND_APPARATUS_CATALOG_EXERCISE_IDS: readonly string[] = Object.freeze([
  // Group 1: lateral-mermaid-and-barrel-side-bend (7)
  'original-barrel-supported-side-bend',
  'original-barrel-standing-side-stretch',
  'original-cadillac-seated-side-reach',
  'original-chair-seated-mermaid',
  'original-mat-mermaid',
  'ex-cooldown-01',
  'ex-kr-barrel-01',
  // Group 2: apparatus-and-side-lying-thoracic-rotation (4)
  'original-barrel-standing-rotation',
  'original-chair-seated-spine-twist',
  'original-cadillac-seated-rotation',
  'original-mat-open-book',
  // Group 3: supine-tabletop-knee-fold-and-reverse-curl (6)
  'original-mat-heel-slide',
  'original-cadillac-table-knee-fold',
  'original-chair-seated-knee-lift',
  'original-mat-knee-fold',
  'ex-core-04',
  'ex-kr-reformer-04',
  // Group 4: quadruped-and-apparatus-plank-pike (6)
  'original-cadillac-quadruped-slide',
  'original-chair-incline-support',
  'original-mat-quadruped-reach',
  'ex-plank-01',
  'ex-plank-02',
  'ex-kr-chair-01',
]);

export interface LateralApparatusVectorOverlaySpec {
  readonly id: string;
  readonly labelKo: string;
  readonly kind:
    | 'frontal-c-curve'
    | 'axial-thoracic-rotation'
    | 'femur-dissociation-arc'
    | 'closed-chain-plank-pike'
    | 'pelvic-anchor-lock';
  readonly phaseId: VisualPhaseId;
  readonly svgPathD: string;
  readonly startPoint: Point2D;
  readonly endPoint: Point2D;
}

export interface LateralApparatusCalloutSpec {
  readonly id: string;
  readonly phaseId: VisualPhaseId;
  readonly textKo: string;
  readonly anchor: Point2D;
  readonly badgePosition: Point2D;
  readonly tone: 'anchor' | 'excursion' | 'stabilization' | 'caution';
}

export interface LateralApparatusKinematicMetrics {
  readonly primaryAngleDeg: number;
  readonly pelvicDriftTolerancePx: 0;
  readonly supportBaselineY: number;
  readonly keyExcursionDeltaPx: number;
}

export interface LateralAndApparatusLedgerEntry {
  readonly id: LateralAndApparatusDiagramId;
  readonly diagramId: LateralAndApparatusDiagramId;
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
    readonly diagramId: LateralAndApparatusDiagramId;
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

export interface LateralAndApparatusDiagramSpec {
  readonly id: LateralAndApparatusDiagramId;
  readonly diagramId: LateralAndApparatusDiagramId;
  readonly mappedExerciseIds: readonly string[];
  readonly primaryCatalogExerciseId: string;
  readonly nameKo: string;
  readonly nameEn: string;
  readonly subtitleKo: string;
  readonly focusSummaryKo: string;
  readonly archetypeId: string;
  readonly archetypeTitleKo: string;
  readonly supportBaselineY: number;
  readonly kinematicMetrics: LateralApparatusKinematicMetrics;
  readonly vectorOverlays: readonly LateralApparatusVectorOverlaySpec[];
  readonly calloutLabels: readonly LateralApparatusCalloutSpec[];
  readonly asset: CatalogMovementVisualAsset;
  readonly correction: MovementDiagramCorrection;
  readonly ledgerEntry: LateralAndApparatusLedgerEntry;
}

export const LATERAL_AND_APPARATUS_SOURCE_LEDGER = Object.freeze(sourceLedgerJson);

const LEDGER_ENTRY_BY_ID: Readonly<
  Record<LateralAndApparatusDiagramId, LateralAndApparatusLedgerEntry>
> = Object.freeze(
  Object.fromEntries(
    sourceLedgerJson.entries.map((entry) => [
      entry.diagramId as LateralAndApparatusDiagramId,
      Object.freeze(entry as unknown as LateralAndApparatusLedgerEntry),
    ]),
  ) as Record<LateralAndApparatusDiagramId, LateralAndApparatusLedgerEntry>,
);

const CATALOG_ARCHETYPE_MAP: Readonly<Record<string, string>> = Object.freeze({
  // Group 1 (7)
  'original-barrel-supported-side-bend': 'barrel-side-lying-side-bend-isolated',
  'original-barrel-standing-side-stretch': 'barrel-standing-side-stretch-isolated',
  'original-cadillac-seated-side-reach': 'lateral-mermaid-side-bend',
  'original-chair-seated-mermaid': 'lateral-mermaid-side-bend',
  'original-mat-mermaid': 'lateral-mermaid-side-bend',
  'ex-cooldown-01': 'lateral-mermaid-side-bend',
  'ex-kr-barrel-01': 'barrel-side-lying-side-bend-isolated',
  // Group 2 (4)
  'original-barrel-standing-rotation': 'barrel-standing-rotation-isolated',
  'original-chair-seated-spine-twist': 'chair-seated-spine-twist-isolated',
  'original-cadillac-seated-rotation': 'cadillac-seated-rotation-isolated',
  'original-mat-open-book': 'mat-open-book-isolated',
  // Group 3 (6)
  'original-mat-heel-slide': 'supine-heel-slide-ankle',
  'original-cadillac-table-knee-fold': 'supine-knee-fold',
  'original-chair-seated-knee-lift': 'chair-seated-knee-lift-isolated',
  'original-mat-knee-fold': 'supine-knee-fold',
  'ex-core-04': 'kneeling-reverse-abs-crunch',
  'ex-kr-reformer-04': 'supine-leg-stretch-hundred',
  // Group 4 (6)
  'original-cadillac-quadruped-slide': 'quadruped-reach-slide',
  'original-chair-incline-support': 'chair-plank-pike-isolated',
  'original-mat-quadruped-reach': 'quadruped-reach-slide',
  'ex-plank-01': 'reformer-plank-long-stretch-isolated',
  'ex-plank-02': 'chair-plank-pike-isolated',
  'ex-kr-chair-01': 'chair-plank-pike-isolated',
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

const LATERAL_APPARATUS_MUSCLES: readonly MuscleHighlightSpec[] = Object.freeze([
  Object.freeze({
    muscleGroupId: 'rectus-obliques',
    labelKo: '내외복사근·요방형근 (측굴 C-커브 & 흉추 회전 토크)',
    labelEn: 'Internal/External Obliques & Quadratus Lumborum',
    catalogMuscleMatches: Object.freeze(['내복사근', '외복사근', '내/외복사근', '요방형근', '옆구리', '늑간근']),
    role: 'primary',
    roleLabelKo: '주동근 (주 타겟)',
    activePhases: Object.freeze(['middle', 'end'] as const),
    anchorJoints: Object.freeze(['thoracic', 'lumbar', 'pelvis'] as const),
    reasonKo: '골반 앵커 위에서 흉곽 측굴·회전 및 파이크 복부 스쿱 토크를 정교하게 생성합니다.',
  }),
  Object.freeze({
    muscleGroupId: 'core-transversus',
    labelKo: '심부 코어 (복횡근·다열근·골반저근 중립 잠금)',
    labelEn: 'Transversus Abdominis & Deep Core',
    catalogMuscleMatches: Object.freeze(['복횡근', '다열근', '골반저근', '몸통', '골반 안정화근']),
    role: 'stabilizer',
    roleLabelKo: '안정화근 (코어·정렬 유지)',
    activePhases: Object.freeze(['start', 'middle', 'end'] as const),
    anchorJoints: Object.freeze(['thoracic', 'lumbar', 'pelvis'] as const),
    reasonKo: '니 폴드·힐 슬라이드·네발기기 리치 중 요추-골반 중립과 항회전 안정성을 지킵니다.',
  }),
  Object.freeze({
    muscleGroupId: 'latissimus-serratus',
    labelKo: '전거근·광배근 (견갑 전인 지지 & 흉곽 측면 확장)',
    labelEn: 'Serratus Anterior & Latissimus Dorsi',
    catalogMuscleMatches: Object.freeze(['전거근', '광배근', '하부승모근']),
    role: 'stabilizer',
    roleLabelKo: '안정화근 (코어·정렬 유지)',
    activePhases: Object.freeze(['start', 'middle', 'end'] as const),
    anchorJoints: Object.freeze(['shoulder', 'thoracic', 'lumbar'] as const),
    reasonKo: '체어·리포머·네발기기 상지 지지 시 날개뼈 익상을 막고 머메이드 오버헤드 리치를 연결합니다.',
  }),
]);

function buildCorrectionFromLedgerEntry(
  entry: LateralAndApparatusLedgerEntry,
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

interface BuildLateralApparatusAssetParams {
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

function buildLateralApparatusVisualAsset(
  params: BuildLateralApparatusAssetParams,
): CatalogMovementVisualAsset {
  const makeFixedAnchors = (joints: RigJointMap) =>
    Object.freeze([
      Object.freeze({
        joint: 'pelvis' as const,
        surfaceKo: '골반·좌골·천골 수평/수직 고정 앵커',
        point: joints.pelvis,
      }),
      Object.freeze({
        joint: 'lumbar' as const,
        surfaceKo: '요추 중립/측굴 기준축',
        point: joints.lumbar,
      }),
    ]);

  const movingJoints: readonly (keyof RigJointMap)[] = Object.freeze([
    'head',
    'shoulder',
    'elbow',
    'wrist',
    'hand',
    'thoracic',
    'knee',
    'ankle',
    'toe',
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
        pedalAngleDeg: params.apparatus === 'chair' && phaseId === 'middle' ? 18 : 0,
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
      '앱 자체 제작 측굴·회전·테이블탑·플랭크 키네마틱 도해 (Original Free-License Kinematic SVG v1)',
    anatomicalAccuracyAssumed: false,
    phases: Object.freeze({
      start: makePhase('start', 0, params.startJoints, 0),
      middle: makePhase('middle', 1, params.middleJoints, params.apparatus === 'reformer' ? 22 : 0),
      end: makePhase('end', 2, params.endJoints, 0),
    }),
    primaryMuscles: LATERAL_APPARATUS_MUSCLES,
    poseDeltaSummary: Object.freeze(params.poseDeltaSummary),
    mobileSummaryBulletsKo: Object.freeze(params.mobileSummaryBulletsKo),
  });
}

// ============================================================================
// GROUP 1: LATERAL MERMAID & BARREL SIDE BEND
// (lateral-mermaid-and-barrel-side-bend)
// ============================================================================

const MERMAID_START_JOINTS: RigJointMap = freezeJoints({
  head: { x: 148, y: 44 },
  neck: { x: 148, y: 62 },
  shoulder: { x: 148, y: 78 },
  elbow: { x: 184, y: 78 },
  wrist: { x: 216, y: 78 },
  hand: { x: 228, y: 78 },
  thoracic: { x: 148, y: 102 },
  lumbar: { x: 148, y: 122 },
  pelvis: { x: 148, y: 142 },
  hip: { x: 152, y: 142 },
  knee: { x: 196, y: 144 },
  ankle: { x: 236, y: 146 },
  heel: { x: 232, y: 150 },
  toe: { x: 248, y: 146 },
  farShoulder: { x: 142, y: 78 },
  farElbow: { x: 108, y: 78 },
  farWrist: { x: 78, y: 78 },
  farHip: { x: 142, y: 142 },
  farKnee: { x: 104, y: 144 },
  farAnkle: { x: 72, y: 146 },
  farToe: { x: 62, y: 146 },
});

const MERMAID_MIDDLE_JOINTS: RigJointMap = freezeJoints({
  head: { x: 108, y: 54 },
  neck: { x: 118, y: 68 },
  shoulder: { x: 126, y: 82 },
  elbow: { x: 102, y: 46 },
  wrist: { x: 76, y: 36 },
  hand: { x: 64, y: 34 },
  thoracic: { x: 136, y: 102 },
  lumbar: { x: 144, y: 122 },
  pelvis: { x: 148, y: 142 },
  hip: { x: 152, y: 142 },
  knee: { x: 196, y: 144 },
  ankle: { x: 236, y: 146 },
  heel: { x: 232, y: 150 },
  toe: { x: 248, y: 146 },
  farShoulder: { x: 118, y: 92 },
  farElbow: { x: 96, y: 118 },
  farWrist: { x: 80, y: 140 },
  farHip: { x: 142, y: 142 },
  farKnee: { x: 104, y: 144 },
  farAnkle: { x: 72, y: 146 },
  farToe: { x: 62, y: 146 },
});

const MERMAID_END_JOINTS: RigJointMap = freezeJoints({
  head: { x: 148, y: 44 },
  neck: { x: 148, y: 62 },
  shoulder: { x: 148, y: 78 },
  elbow: { x: 182, y: 80 },
  wrist: { x: 214, y: 80 },
  hand: { x: 226, y: 80 },
  thoracic: { x: 148, y: 102 },
  lumbar: { x: 148, y: 122 },
  pelvis: { x: 148, y: 142 },
  hip: { x: 152, y: 142 },
  knee: { x: 196, y: 144 },
  ankle: { x: 236, y: 146 },
  heel: { x: 232, y: 150 },
  toe: { x: 248, y: 146 },
  farShoulder: { x: 142, y: 78 },
  farElbow: { x: 110, y: 80 },
  farWrist: { x: 80, y: 80 },
  farHip: { x: 142, y: 142 },
  farKnee: { x: 104, y: 144 },
  farAnkle: { x: 72, y: 146 },
  farToe: { x: 62, y: 146 },
});

const LATERAL_MERMAID_SPEC: LateralAndApparatusDiagramSpec = Object.freeze({
  id: 'lateral-mermaid-and-barrel-side-bend',
  diagramId: 'lateral-mermaid-and-barrel-side-bend',
  mappedExerciseIds: Object.freeze([
    'original-barrel-supported-side-bend',
    'original-barrel-standing-side-stretch',
    'original-cadillac-seated-side-reach',
    'original-chair-seated-mermaid',
    'original-mat-mermaid',
    'ex-cooldown-01',
    'ex-kr-barrel-01',
  ]),
  primaryCatalogExerciseId: 'original-mat-mermaid',
  nameKo: '머메이드 측굴 & 바렐 사이드 벤드 (Mermaid & Barrel Side Bend)',
  nameEn: 'Mermaid Lateral Flexion & Ladder Barrel Side Bend',
  subtitleKo: '반대측 좌골·발 앵커 잠금(148,142) → 관상면 C-커브 측굴 & 양측 늑골 신장 → 척추 수직 분절 복귀',
  focusSummaryKo:
    '매트·리포머·체어·캐딜락 머메이드 및 래더 바렐 사이드 벤드에서 반대쪽 좌골/발 앵커를 고정하고 아래쪽 옆구리 찌부러짐 없이 관상면 C-커브 측굴을 수행합니다.',
  archetypeId: 'lateral-mermaid-side-bend',
  archetypeTitleKo: '머메이드 측굴 스트레치 & 바렐/체어 사이드 벤드',
  supportBaselineY: 148,
  kinematicMetrics: Object.freeze({
    primaryAngleDeg: 34,
    pelvicDriftTolerancePx: 0,
    supportBaselineY: 148,
    keyExcursionDeltaPx: 164,
  }),
  vectorOverlays: Object.freeze([
    {
      id: 'mermaid-c-curve-arc',
      labelKo: '관상면 C-커브 오버헤드 측굴 아크 (34°)',
      kind: 'frontal-c-curve',
      phaseId: 'middle',
      svgPathD: 'M 228 78 Q 148 18 64 34',
      startPoint: pt(228, 78),
      endPoint: pt(64, 34),
    },
    {
      id: 'mermaid-pelvic-anchor',
      labelKo: '반대측 좌골·골반 앵커 잠금 (pelvis 148,142)',
      kind: 'pelvic-anchor-lock',
      phaseId: 'middle',
      svgPathD: 'M 148 142 L 196 144',
      startPoint: pt(148, 142),
      endPoint: pt(196, 144),
    },
  ] as const),
  calloutLabels: Object.freeze([
    {
      id: 'mermaid-callout-start',
      phaseId: 'start',
      textKo: '양측 좌골·발 앵커 균등 접지 & T-암 준비',
      anchor: pt(148, 78),
      badgePosition: pt(92, 28),
      tone: 'anchor',
    },
    {
      id: 'mermaid-callout-middle',
      phaseId: 'middle',
      textKo: '반대 좌골 고정(y=142) · 양측 늑골 C-커브 측굴',
      anchor: pt(64, 34),
      badgePosition: pt(118, 28),
      tone: 'excursion',
    },
    {
      id: 'mermaid-callout-end',
      phaseId: 'end',
      textKo: '복사근 제어로 아래 척추부터 수직 스택 복귀',
      anchor: pt(148, 44),
      badgePosition: pt(96, 28),
      tone: 'stabilization',
    },
  ] as const),
  asset: buildLateralApparatusVisualAsset({
    exerciseId: 'original-mat-mermaid',
    nameKo: '매트 머메이드',
    nameEn: 'Mat Mermaid',
    apparatus: 'mat',
    bodyPosition: 'seated',
    blockCategory: 'cooldown',
    spinalPlanes: ['lateral'],
    isUnilateral: true,
    archetypeId: 'lateral-mermaid-side-bend',
    archetypeTitleKo: '머메이드 측굴 스트레치 & 바렐/체어 사이드 벤드',
    supportSurfaceKo: '매트 / 리포머 / 체어 / 캐딜락 / 바렐 골반·좌골 앵커 지지면 (y=142..148)',
    startJoints: MERMAID_START_JOINTS,
    middleJoints: MERMAID_MIDDLE_JOINTS,
    endJoints: MERMAID_END_JOINTS,
    phaseTitlesKo: [
      '좌골·골반 수평 접지 & 수직 척추 세팅',
      '관상면 C-커브 측굴 & 오버헤드 리치 정점',
      '하부 척추부터 수직 스택 분절 복귀',
    ],
    phaseSummariesKo: [
      '양쪽 좌골(또는 바렐 골반 패드와 래더 지지발)을 단단히 고정하고 정수리를 천장으로 세워 양팔을 옆으로 펼칩니다.',
      '반대쪽 좌골(148,142)이 들리지 않게 누르며 위쪽 팔을 귀 옆 대각선(64,34)으로 길게 뻗어 양쪽 옆구리를 동시에 늘립니다.',
      '날숨에 외·내복사근 힘으로 골반 바로 위 요추부터 한 마디씩 수직 기둥(x=148)으로 쌓아 돌아옵니다.',
    ],
    breathCuesKo: [
      '들숨 준비: 척추 마디 사이를 넓히며 양팔 수평 확장',
      '들숨/날숨 측굴: 열리는 쪽 갈비뼈 사이사이로 호흡을 불어넣으며 C-커브 유지',
      '날숨 복귀: 반대쪽 좌골을 무겁게 누르며 복사근 수축으로 수직 복귀',
    ],
    alignments: {
      start: [
        {
          id: 'mermaid-start-plumb',
          labelKo: '좌골-흉곽-정수리 수직 기둥 (x=148)',
          cueKo: 'Z-싯이나 기구 착석 시 양쪽 골반 높이를 수평으로 맞춥니다.',
          kind: 'plumb-line',
          from: pt(148, 142),
          to: pt(148, 44),
          targetAngleDeg: 90,
          cautionKo: '시작부터 한쪽 허리가 찌부러지지 않게 주의합니다.',
        },
      ],
      middle: [
        {
          id: 'mermaid-middle-c-curve',
          labelKo: '관상면 C-커브 & 반대측 좌골 앵커 잠금',
          cueKo: '아래쪽 옆구리도 위로 들어 올리듯 길게 쓰며 큰 무지개 곡선을 그립니다.',
          kind: 'angle-arc',
          from: pt(148, 142),
          to: pt(64, 34),
          targetAngleDeg: 34,
          cautionKo: '바닥/페달을 짚은 어깨가 귀 쪽으로 솟지 않게 전거근으로 지지합니다.',
        },
      ],
      end: [
        {
          id: 'mermaid-end-vertical-return',
          labelKo: '골반 수직 중심 복귀선',
          cueKo: '어깨만 먼저 세우지 말고 골반 위에서부터 척추를 수직으로 세웁니다.',
          kind: 'anchor-lock',
          from: pt(148, 142),
          to: pt(148, 78),
          cautionKo: '복귀 후 양쪽 어깨 높이가 대칭인지 확인합니다.',
        },
      ],
    },
    directionVectors: {
      start: [
        {
          id: 'vec-mermaid-axial',
          labelKo: '정수리 수직 축성 신장',
          kind: 'axial-lengthening',
          points: [pt(148, 142), pt(148, 44)],
          phaseScope: 'start',
        },
      ],
      middle: [
        {
          id: 'vec-mermaid-side-arc',
          labelKo: '오버헤드 측굴 아크 & 좌골 반대 고정',
          kind: 'spine-articulation',
          points: [pt(228, 78), pt(136, 42), pt(64, 34)],
          phaseScope: 'start-to-middle',
        },
      ],
      end: [
        {
          id: 'vec-mermaid-stack-up',
          labelKo: '복사근 수직 분절 복귀',
          kind: 'return-control',
          points: [pt(64, 34), pt(148, 44), pt(226, 80)],
          phaseScope: 'middle-to-end',
        },
      ],
    },
    poseDeltaSummary: {
      startToMiddleKo:
        '골반(148,142)이 고정된 채 흉추(148,102→136,102)와 위쪽 손(228,78→64,34)이 관상면 C-커브로 측굴합니다.',
      middleToEndKo:
        '반대측 좌골 지지를 유지하며 척추가 수직선(x:148)으로 복귀합니다.',
      invariantAnchorsKo: '골반·좌골(pelvis 148,142) 및 하체 지지점(y:144..146)이 전 구간 고정됩니다.',
      keyJointChangeKo: '관상면 척추 34° 측굴 + 상지 오버헤드 아크(hand Δ164px)',
    },
    mobileSummaryBulletsKo: [
      '시작 정렬: 양측 좌골·발 앵커 수평 고정 · 척추 수직 신장',
      '중간 정점: 반대쪽 좌골 들림 없이 양측 옆구리 C-커브 측굴 리치',
      '제어 복귀: 복사근 수축으로 하부 요추부터 수직 기둥 복귀',
    ],
  }),
  correction: buildCorrectionFromLedgerEntry(
    LEDGER_ENTRY_BY_ID['lateral-mermaid-and-barrel-side-bend'],
  ),
  ledgerEntry: LEDGER_ENTRY_BY_ID['lateral-mermaid-and-barrel-side-bend'],
});

// ============================================================================
// GROUP 2: APPARATUS & SIDE-LYING THORACIC ROTATION
// (apparatus-and-side-lying-thoracic-rotation)
// ============================================================================

const ROTATION_START_JOINTS: RigJointMap = freezeJoints({
  head: { x: 64, y: 132 },
  neck: { x: 82, y: 134 },
  shoulder: { x: 102, y: 128 },
  elbow: { x: 136, y: 126 },
  wrist: { x: 168, y: 128 },
  hand: { x: 180, y: 128 },
  thoracic: { x: 132, y: 134 },
  lumbar: { x: 160, y: 136 },
  pelvis: { x: 186, y: 138 },
  hip: { x: 194, y: 138 },
  knee: { x: 226, y: 108 },
  ankle: { x: 256, y: 138 },
  heel: { x: 252, y: 142 },
  toe: { x: 268, y: 138 },
  farShoulder: { x: 102, y: 136 },
  farElbow: { x: 136, y: 136 },
  farWrist: { x: 168, y: 136 },
  farHip: { x: 194, y: 140 },
  farKnee: { x: 226, y: 110 },
  farAnkle: { x: 256, y: 140 },
  farToe: { x: 268, y: 140 },
});

const ROTATION_MIDDLE_JOINTS: RigJointMap = freezeJoints({
  head: { x: 64, y: 130 },
  neck: { x: 82, y: 132 },
  shoulder: { x: 92, y: 118 },
  elbow: { x: 64, y: 94 },
  wrist: { x: 40, y: 84 },
  hand: { x: 28, y: 80 },
  thoracic: { x: 128, y: 128 },
  lumbar: { x: 160, y: 136 },
  pelvis: { x: 186, y: 138 },
  hip: { x: 194, y: 138 },
  knee: { x: 226, y: 108 },
  ankle: { x: 256, y: 138 },
  heel: { x: 252, y: 142 },
  toe: { x: 268, y: 138 },
  farShoulder: { x: 104, y: 136 },
  farElbow: { x: 138, y: 136 },
  farWrist: { x: 170, y: 136 },
  farHip: { x: 194, y: 140 },
  farKnee: { x: 226, y: 110 },
  farAnkle: { x: 256, y: 140 },
  farToe: { x: 268, y: 140 },
});

const ROTATION_END_JOINTS: RigJointMap = freezeJoints({
  head: { x: 64, y: 132 },
  neck: { x: 82, y: 134 },
  shoulder: { x: 102, y: 128 },
  elbow: { x: 134, y: 126 },
  wrist: { x: 166, y: 128 },
  hand: { x: 178, y: 128 },
  thoracic: { x: 132, y: 134 },
  lumbar: { x: 160, y: 136 },
  pelvis: { x: 186, y: 138 },
  hip: { x: 194, y: 138 },
  knee: { x: 226, y: 108 },
  ankle: { x: 256, y: 138 },
  heel: { x: 252, y: 142 },
  toe: { x: 268, y: 138 },
  farShoulder: { x: 102, y: 136 },
  farElbow: { x: 136, y: 136 },
  farWrist: { x: 168, y: 136 },
  farHip: { x: 194, y: 140 },
  farKnee: { x: 226, y: 110 },
  farAnkle: { x: 256, y: 140 },
  farToe: { x: 268, y: 140 },
});

const APPARATUS_ROTATION_SPEC: LateralAndApparatusDiagramSpec = Object.freeze({
  id: 'apparatus-and-side-lying-thoracic-rotation',
  diagramId: 'apparatus-and-side-lying-thoracic-rotation',
  mappedExerciseIds: Object.freeze([
    'original-barrel-standing-rotation',
    'original-chair-seated-spine-twist',
    'original-cadillac-seated-rotation',
    'original-mat-open-book',
  ]),
  primaryCatalogExerciseId: 'original-mat-open-book',
  nameKo: '기구 스파인 트위스트 & 사이드 오픈 북 흉추 회전 (Thoracic Rotation & Open Book)',
  nameEn: 'Apparatus Spine Twist & Side-Lying Open Book Thoracic Rotation',
  subtitleKo: '골반·무릎 앵커 고정(pelvis 186,138 / knee 226,108) → 순수 흉추 회전 & 상지 오픈 → 복사근 제어 복귀',
  focusSummaryKo:
    '바렐 스탠딩 회전, 체어·캐딜락 시티드 회전, 매트 사이드라잉 오픈 북에서 골반과 무릎/양발을 완벽히 고정한 채 상부 흉곽만 축성 회전합니다.',
  archetypeId: 'mat-open-book-isolated',
  archetypeTitleKo: '매트 오픈 북 · 상지·흉곽 열기 분리',
  supportBaselineY: 144,
  kinematicMetrics: Object.freeze({
    primaryAngleDeg: 45,
    pelvicDriftTolerancePx: 0,
    supportBaselineY: 144,
    keyExcursionDeltaPx: 152,
  }),
  vectorOverlays: Object.freeze([
    {
      id: 'open-book-thoracic-arc',
      labelKo: '흉곽·상지 오픈 북 회전 아크 (180,128 → 28,80)',
      kind: 'axial-thoracic-rotation',
      phaseId: 'middle',
      svgPathD: 'M 180 128 Q 104 42 28 80',
      startPoint: pt(180, 128),
      endPoint: pt(28, 80),
    },
    {
      id: 'open-book-knee-pelvis-lock',
      labelKo: '포갠 무릎·골반 고정 잠금 (클램 분리 · 회전 0°)',
      kind: 'pelvic-anchor-lock',
      phaseId: 'middle',
      svgPathD: 'M 186 138 L 226 108',
      startPoint: pt(186, 138),
      endPoint: pt(226, 108),
    },
  ] as const),
  calloutLabels: Object.freeze([
    {
      id: 'rot-callout-start',
      phaseId: 'start',
      textKo: '골반·무릎 포개어 고정 & 양손 전방 준비',
      anchor: pt(226, 108),
      badgePosition: pt(156, 36),
      tone: 'anchor',
    },
    {
      id: 'rot-callout-middle',
      phaseId: 'middle',
      textKo: '무릎 고정 유지 · 흉곽과 위쪽 팔만 반대편 오픈',
      anchor: pt(28, 80),
      badgePosition: pt(28, 34),
      tone: 'excursion',
    },
    {
      id: 'rot-callout-end',
      phaseId: 'end',
      textKo: '늑골부터 닫으며 전방 포개기 정렬 복귀',
      anchor: pt(178, 128),
      badgePosition: pt(142, 36),
      tone: 'stabilization',
    },
  ] as const),
  asset: buildLateralApparatusVisualAsset({
    exerciseId: 'original-mat-open-book',
    nameKo: '사이드 오픈 북',
    nameEn: 'Side-Lying Open Book',
    apparatus: 'mat',
    bodyPosition: 'side-lying',
    blockCategory: 'cooldown',
    spinalPlanes: ['rotation'],
    isUnilateral: true,
    archetypeId: 'mat-open-book-isolated',
    archetypeTitleKo: '매트 오픈 북 · 상지·흉곽 열기 분리',
    supportSurfaceKo: '사이드라잉 매트 / 체어 시트 / 캐딜락 / 바렐 골반·하지 고정 지지면',
    startJoints: ROTATION_START_JOINTS,
    middleJoints: ROTATION_MIDDLE_JOINTS,
    endJoints: ROTATION_END_JOINTS,
    phaseTitlesKo: [
      '골반·무릎 수직 스택 고정 & 양팔 정렬 준비',
      '골반 흔들림 없는 흉곽 축회전 & 오픈 정점',
      '복사근 제어로 시작 정렬 복귀',
    ],
    phaseSummariesKo: [
      '옆으로 누워 두 무릎을 포개거나(오픈 북) 기구 위에 좌골/양발을 고정하고 양팔을 어깨 앞에 나란히 둡니다.',
      '골반(186,138)과 두 무릎(226,108)이 떨어지지 않게 고정한 채 위쪽 팔과 흉곽을 반대편(28,80)으로 열어 회전합니다.',
      '날숨에 팔만 먼저 당기지 않고 갈비뼈와 복사근 힘으로 가슴을 닫아 시작 위치(178,128)로 돌아옵니다.',
    ],
    breathCuesKo: [
      '들숨 준비: 뒷목과 척추 축을 길게 늘이며 위쪽 팔 천장 리치',
      '날숨 오픈: 무릎 고정 유지하며 숨을 내쉬고 흉골을 반대편으로 회전',
      '들숨/날숨 복귀: 복부 중심으로 흉곽을 감아 시작 자세 복귀',
    ],
    alignments: {
      start: [
        {
          id: 'rot-start-stacked-hips',
          labelKo: '양측 골반·무릎 포개기 잠금선',
          cueKo: '위쪽 골반이 뒤로 굴러가지 않게 아래쪽 골반 수직 위에 포갭니다.',
          kind: 'anchor-lock',
          from: pt(186, 138),
          to: pt(226, 108),
          cautionKo: '클램 동작처럼 무릎이 벌어지지 않도록 내전근을 연결합니다.',
        },
      ],
      middle: [
        {
          id: 'rot-middle-thoracic-spiral',
          labelKo: '순수 흉추 회전 아크 (골반 회전 0°)',
          cueKo: '손등을 바닥에 억지로 닿게 하기보다 무릎 고정 상태에서 가슴이 열리는 만큼만 회전합니다.',
          kind: 'angle-arc',
          from: pt(128, 128),
          to: pt(28, 80),
          targetAngleDeg: 45,
          cautionKo: '어깨 앞쪽 관절에만 과부하가 걸리지 않게 시선과 흉골이 함께 이동합니다.',
        },
      ],
      end: [
        {
          id: 'rot-end-rib-return',
          labelKo: '늑골 리드 정면 복귀',
          cueKo: '늑골 하단부터 순차적으로 닫으며 두 손바닥을 다시 포갭니다.',
          kind: 'axis-line',
          from: pt(102, 128),
          to: pt(178, 128),
          cautionKo: '복귀 시 목과 어깨가 긴장하지 않게 합니다.',
        },
      ],
    },
    directionVectors: {
      start: [
        {
          id: 'vec-rot-prep-reach',
          labelKo: '상지 전방 리치 & 견갑 세팅',
          kind: 'axial-lengthening',
          points: [pt(102, 128), pt(180, 128)],
          phaseScope: 'start',
        },
      ],
      middle: [
        {
          id: 'vec-rot-open-arc',
          labelKo: '흉곽·상지 반대편 오픈 회전',
          kind: 'spine-articulation',
          points: [pt(180, 128), pt(96, 68), pt(28, 80)],
          phaseScope: 'start-to-middle',
        },
      ],
      end: [
        {
          id: 'vec-rot-close-arc',
          labelKo: '흉곽 회전 닫기 복귀',
          kind: 'return-control',
          points: [pt(28, 80), pt(96, 68), pt(178, 128)],
          phaseScope: 'middle-to-end',
        },
      ],
    },
    poseDeltaSummary: {
      startToMiddleKo:
        '골반(186,138)과 두 무릎(226,108)은 고정된 채 위쪽 손(180,128→28,80)과 흉곽이 반대편으로 크게 회전 오픈됩니다.',
      middleToEndKo:
        '무릎 들림 없이 흉곽과 팔이 원호를 그리며 전방 포개기 위치(178,128)로 복귀합니다.',
      invariantAnchorsKo: '골반(pelvis 186,138), 요추(160,136), 양무릎(knee/farKnee 226,108..110)이 고정됩니다.',
      keyJointChangeKo: '흉추 축성 회전(45°) + 상지 오픈 아크(hand Δ152px, 무릎 벌림 0px)',
    },
    mobileSummaryBulletsKo: [
      '시작 정렬: 골반·무릎 수직 포개기(또는 좌골/양발 고정) & 양팔 전방 세팅',
      '중간 정점: 무릎·골반이 따라가지 않는 범위까지 상부 흉곽과 팔 오픈 회전',
      '제어 복귀: 팔이 아닌 갈비뼈·복사근 수축으로 시작 자세 복귀',
    ],
  }),
  correction: buildCorrectionFromLedgerEntry(
    LEDGER_ENTRY_BY_ID['apparatus-and-side-lying-thoracic-rotation'],
  ),
  ledgerEntry: LEDGER_ENTRY_BY_ID['apparatus-and-side-lying-thoracic-rotation'],
});

// ============================================================================
// GROUP 3: SUPINE TABLETOP KNEE FOLD & REVERSE CURL
// (supine-tabletop-knee-fold-and-reverse-curl)
// ============================================================================

const KNEE_FOLD_START_JOINTS: RigJointMap = freezeJoints({
  head: { x: 56, y: 138 },
  neck: { x: 74, y: 140 },
  shoulder: { x: 94, y: 140 },
  elbow: { x: 128, y: 142 },
  wrist: { x: 160, y: 144 },
  hand: { x: 172, y: 144 },
  thoracic: { x: 124, y: 142 },
  lumbar: { x: 152, y: 142 },
  pelvis: { x: 180, y: 142 },
  hip: { x: 188, y: 142 },
  knee: { x: 222, y: 102 },
  ankle: { x: 254, y: 144 },
  heel: { x: 250, y: 148 },
  toe: { x: 266, y: 144 },
  farShoulder: { x: 92, y: 138 },
  farElbow: { x: 126, y: 140 },
  farWrist: { x: 158, y: 142 },
  farHip: { x: 184, y: 140 },
  farKnee: { x: 218, y: 100 },
  farAnkle: { x: 250, y: 142 },
  farToe: { x: 262, y: 142 },
});

const KNEE_FOLD_MIDDLE_JOINTS: RigJointMap = freezeJoints({
  head: { x: 56, y: 138 },
  neck: { x: 74, y: 140 },
  shoulder: { x: 94, y: 140 },
  elbow: { x: 128, y: 142 },
  wrist: { x: 160, y: 144 },
  hand: { x: 172, y: 144 },
  thoracic: { x: 124, y: 142 },
  lumbar: { x: 152, y: 142 },
  pelvis: { x: 180, y: 142 },
  hip: { x: 188, y: 142 },
  knee: { x: 188, y: 94 },
  ankle: { x: 236, y: 94 },
  heel: { x: 232, y: 100 },
  toe: { x: 248, y: 90 },
  farShoulder: { x: 92, y: 138 },
  farElbow: { x: 126, y: 140 },
  farWrist: { x: 158, y: 142 },
  farHip: { x: 184, y: 140 },
  farKnee: { x: 218, y: 100 },
  farAnkle: { x: 250, y: 142 },
  farToe: { x: 262, y: 142 },
});

const KNEE_FOLD_END_JOINTS: RigJointMap = freezeJoints({
  head: { x: 56, y: 138 },
  neck: { x: 74, y: 140 },
  shoulder: { x: 94, y: 140 },
  elbow: { x: 128, y: 142 },
  wrist: { x: 160, y: 144 },
  hand: { x: 172, y: 144 },
  thoracic: { x: 124, y: 142 },
  lumbar: { x: 152, y: 142 },
  pelvis: { x: 180, y: 142 },
  hip: { x: 188, y: 142 },
  knee: { x: 222, y: 102 },
  ankle: { x: 254, y: 144 },
  heel: { x: 250, y: 148 },
  toe: { x: 266, y: 144 },
  farShoulder: { x: 92, y: 138 },
  farElbow: { x: 126, y: 140 },
  farWrist: { x: 158, y: 142 },
  farHip: { x: 184, y: 140 },
  farKnee: { x: 218, y: 100 },
  farAnkle: { x: 250, y: 142 },
  farToe: { x: 262, y: 142 },
});

const TABLETOP_KNEE_FOLD_SPEC: LateralAndApparatusDiagramSpec = Object.freeze({
  id: 'supine-tabletop-knee-fold-and-reverse-curl',
  diagramId: 'supine-tabletop-knee-fold-and-reverse-curl',
  mappedExerciseIds: Object.freeze([
    'original-mat-heel-slide',
    'original-cadillac-table-knee-fold',
    'original-chair-seated-knee-lift',
    'original-mat-knee-fold',
    'ex-core-04',
    'ex-kr-reformer-04',
  ]),
  primaryCatalogExerciseId: 'original-mat-knee-fold',
  nameKo: '테이블탑 니 폴드 · 힐 슬라이드 & 리버스 컬 (Knee Fold, Heel Slide & Reverse Curl)',
  nameEn: 'Supine Tabletop Knee Fold, Heel Slide & Reformer Reverse Curl',
  subtitleKo: '요추·골반 중립 잠금(y=142) → 고관절 분리 90° 니 폴드 / 힐 슬라이드 / 리버스 컬 → 지지면 제어 착지',
  focusSummaryKo:
    '매트·캐딜락 니 폴드와 힐 슬라이드, 체어 시티드 니 리프트, 리포머 닐링 리버스 앱스 및 상하체 협응에서 허리 들림이나 골반 흔들림 없이 대퇴골을 분리 제어합니다.',
  archetypeId: 'supine-knee-fold',
  archetypeTitleKo: '수파인 니 폴드 (테이블탑 고관절 분리 제어)',
  supportBaselineY: 148,
  kinematicMetrics: Object.freeze({
    primaryAngleDeg: 90,
    pelvicDriftTolerancePx: 0,
    supportBaselineY: 148,
    keyExcursionDeltaPx: 50,
  }),
  vectorOverlays: Object.freeze([
    {
      id: 'knee-fold-femur-arc',
      labelKo: '고관절 분리 90° 테이블탑 니 폴드 궤적',
      kind: 'femur-dissociation-arc',
      phaseId: 'middle',
      svgPathD: 'M 254 144 Q 248 102 236 94',
      startPoint: pt(254, 144),
      endPoint: pt(236, 94),
    },
    {
      id: 'knee-fold-lumbar-lock',
      labelKo: '요추·골반 수평 중립 잠금선 (y=142 · 흔들림 0px)',
      kind: 'pelvic-anchor-lock',
      phaseId: 'middle',
      svgPathD: 'M 124 142 L 188 142',
      startPoint: pt(124, 142),
      endPoint: pt(188, 142),
    },
  ] as const),
  calloutLabels: Object.freeze([
    {
      id: 'kf-callout-start',
      phaseId: 'start',
      textKo: '요추·골반 중립(y=142) & 양발 좌골 너비 지지',
      anchor: pt(180, 142),
      badgePosition: pt(96, 36),
      tone: 'anchor',
    },
    {
      id: 'kf-callout-middle',
      phaseId: 'middle',
      textKo: '90/90 단측 테이블탑 리프트 (골반 회전·허리 들림 0)',
      anchor: pt(188, 94),
      badgePosition: pt(104, 34),
      tone: 'excursion',
    },
    {
      id: 'kf-callout-end',
      phaseId: 'end',
      textKo: '복횡근 편심성 제어로 발바닥 사뿐히 착지',
      anchor: pt(254, 144),
      badgePosition: pt(120, 36),
      tone: 'stabilization',
    },
  ] as const),
  asset: buildLateralApparatusVisualAsset({
    exerciseId: 'original-mat-knee-fold',
    nameKo: '니 폴드',
    nameEn: 'Alternating Knee Fold',
    apparatus: 'mat',
    bodyPosition: 'supine',
    blockCategory: 'core',
    spinalPlanes: ['neutral'],
    isUnilateral: true,
    archetypeId: 'supine-knee-fold',
    archetypeTitleKo: '수파인 니 폴드 (테이블탑 고관절 분리 제어)',
    supportSurfaceKo: '매트 / 캐딜락 테이블 / 리포머 캐리지 / 체어 시트 골반 중립 지지면 (y=142)',
    startJoints: KNEE_FOLD_START_JOINTS,
    middleJoints: KNEE_FOLD_MIDDLE_JOINTS,
    endJoints: KNEE_FOLD_END_JOINTS,
    phaseTitlesKo: [
      '요추·골반 중립 앵커 & 복횡근 선행 세팅',
      '고관절 분리 90° 테이블탑 니 폴드 / 슬라이드 정점',
      '골반 수평 유지 & 지지면 감속 착지 복귀',
    ],
    phaseSummariesKo: [
      '후두부·흉추·천골(y=142)을 지지면에 고르게 두고 양발을 골반 너비로 세워 ASIS 수평 중립을 맞춥니다.',
      '날숨에 복횡근을 먼저 수축해 골반을 고정한 뒤, 반대쪽 다리 지지력은 유지하고 한쪽 무릎을 90° 테이블탑(188,94)으로 들어 올립니다.',
      '다리가 내려가는 동안 허리가 뜨지 않게 복부 브레이크를 유지하며 발을 시작 위치(254,144)에 사뿐히 내려놓습니다.',
    ],
    breathCuesKo: [
      '들숨 준비: 갈비뼈 측면 호흡 & 아랫배 수평 코르셋 연결',
      '날숨 리프트: 골반 무게중심을 중앙에 두고 대퇴골만 고관절 소켓에서 굴곡',
      '들숨/날숨 착지: 허리 커브 변화 없이 발바닥 매트 터치 복귀',
    ],
    alignments: {
      start: [
        {
          id: 'kf-start-neutral-pelvis',
          labelKo: '흉추-요추-천골 수평 지지선 (y=142)',
          cueKo: '허리를 바닥에 과하게 누르거나 아치로 띄우지 않고 자연스러운 중립을 지킵니다.',
          kind: 'neutral-zone',
          from: pt(124, 142),
          to: pt(180, 142),
          cautionKo: '목을 뒤로 젖히지 않게 시선은 천장 수직 위를 봅니다.',
        },
      ],
      middle: [
        {
          id: 'kf-middle-90-tabletop',
          labelKo: '고관절 90° · 무릎 90° 테이블탑 직각 정렬',
          cueKo: '무릎을 가슴 쪽으로 과하게 당겨 꼬리뼈가 말리지 않게 고관절 수직 위(x=188)에서 멈춥니다.',
          kind: 'angle-arc',
          from: pt(188, 142),
          to: pt(236, 94),
          targetAngleDeg: 90,
          cautionKo: '지지하는 반대쪽 무릎이 옆으로 벌어지지 않게 유지합니다.',
        },
      ],
      end: [
        {
          id: 'kf-end-eccentric-lowering',
          labelKo: '요추 중립 고정 감속 착지선',
          cueKo: '발이 바닥에 닿기 직전 구간에서 아랫배를 한 번 더 납작하게 잡아줍니다.',
          kind: 'anchor-lock',
          from: pt(152, 142),
          to: pt(188, 142),
          cautionKo: '발을 쿵 내려놓으며 골반이 흔들리지 않게 주의합니다.',
        },
      ],
    },
    directionVectors: {
      start: [
        {
          id: 'vec-kf-core-brace',
          labelKo: '복횡근 코르셋 선행 브레이싱',
          kind: 'axial-lengthening',
          points: [pt(180, 142), pt(152, 142)],
          phaseScope: 'start',
        },
      ],
      middle: [
        {
          id: 'vec-kf-femur-fold',
          labelKo: '대퇴골 90° 테이블탑 리프트',
          kind: 'limb-excursion',
          points: [pt(254, 144), pt(244, 112), pt(236, 94)],
          phaseScope: 'start-to-middle',
        },
      ],
      end: [
        {
          id: 'vec-kf-controlled-touch',
          labelKo: '매트 지지면 감속 착지 복귀',
          kind: 'return-control',
          points: [pt(236, 94), pt(246, 118), pt(254, 144)],
          phaseScope: 'middle-to-end',
        },
      ],
    },
    poseDeltaSummary: {
      startToMiddleKo:
        '요추(152,142)·골반(180,142)과 반대 발(250,142)은 고정된 채 한쪽 무릎(222,102→188,94)과 발목(254,144→236,94)이 90° 테이블탑으로 올라옵니다.',
      middleToEndKo:
        '골반 수평을 유지하며 발목(236,94→254,144)이 매트 지지면으로 감속 복귀합니다.',
      invariantAnchorsKo: '흉추(124,142), 요추(152,142), 골반(180,142) 및 반대측 지지발이 고정됩니다.',
      keyJointChangeKo: '단측 고관절 90° 굴곡 분리(ankle Δ53px, 골반 수직 흔들림 0px)',
    },
    mobileSummaryBulletsKo: [
      '시작 정렬: 흉추·요추·골반 중립(y=142) 3점 지지 & 복횡근 선행 수축',
      '중간 정점: 골반 흔들림 없이 한쪽 다리 90/90 테이블탑 리프트 (또는 힐 슬라이드/리버스 컬)',
      '제어 복귀: 허리가 들뜨지 않게 복부 편심성 제어로 시작 위치 착지',
    ],
  }),
  correction: buildCorrectionFromLedgerEntry(
    LEDGER_ENTRY_BY_ID['supine-tabletop-knee-fold-and-reverse-curl'],
  ),
  ledgerEntry: LEDGER_ENTRY_BY_ID['supine-tabletop-knee-fold-and-reverse-curl'],
});

// ============================================================================
// GROUP 4: QUADRUPED & APPARATUS PLANK / PIKE
// (quadruped-and-apparatus-plank-pike)
// ============================================================================

const QUADRUPED_PLANK_START_JOINTS: RigJointMap = freezeJoints({
  head: { x: 74, y: 88 },
  neck: { x: 92, y: 92 },
  shoulder: { x: 108, y: 94 },
  elbow: { x: 108, y: 122 },
  wrist: { x: 108, y: 146 },
  hand: { x: 102, y: 148 },
  thoracic: { x: 138, y: 94 },
  lumbar: { x: 166, y: 94 },
  pelvis: { x: 192, y: 94 },
  hip: { x: 194, y: 96 },
  knee: { x: 194, y: 146 },
  ankle: { x: 234, y: 148 },
  heel: { x: 232, y: 142 },
  toe: { x: 244, y: 150 },
  farShoulder: { x: 104, y: 92 },
  farElbow: { x: 104, y: 120 },
  farWrist: { x: 104, y: 144 },
  farHip: { x: 190, y: 94 },
  farKnee: { x: 190, y: 144 },
  farAnkle: { x: 230, y: 146 },
  farToe: { x: 240, y: 148 },
});

const QUADRUPED_PLANK_MIDDLE_JOINTS: RigJointMap = freezeJoints({
  head: { x: 72, y: 88 },
  neck: { x: 90, y: 92 },
  shoulder: { x: 108, y: 94 },
  elbow: { x: 74, y: 92 },
  wrist: { x: 44, y: 90 },
  hand: { x: 32, y: 90 },
  thoracic: { x: 138, y: 94 },
  lumbar: { x: 166, y: 94 },
  pelvis: { x: 192, y: 94 },
  hip: { x: 194, y: 96 },
  knee: { x: 238, y: 96 },
  ankle: { x: 278, y: 96 },
  heel: { x: 276, y: 90 },
  toe: { x: 292, y: 96 },
  farShoulder: { x: 108, y: 94 },
  farElbow: { x: 108, y: 122 },
  farWrist: { x: 108, y: 146 },
  farHip: { x: 190, y: 94 },
  farKnee: { x: 190, y: 146 },
  farAnkle: { x: 230, y: 148 },
  farToe: { x: 240, y: 150 },
});

const QUADRUPED_PLANK_END_JOINTS: RigJointMap = freezeJoints({
  head: { x: 74, y: 88 },
  neck: { x: 92, y: 92 },
  shoulder: { x: 108, y: 94 },
  elbow: { x: 108, y: 122 },
  wrist: { x: 108, y: 146 },
  hand: { x: 102, y: 148 },
  thoracic: { x: 138, y: 94 },
  lumbar: { x: 166, y: 94 },
  pelvis: { x: 192, y: 94 },
  hip: { x: 194, y: 96 },
  knee: { x: 194, y: 146 },
  ankle: { x: 234, y: 148 },
  heel: { x: 232, y: 142 },
  toe: { x: 244, y: 150 },
  farShoulder: { x: 104, y: 92 },
  farElbow: { x: 104, y: 120 },
  farWrist: { x: 104, y: 144 },
  farHip: { x: 190, y: 94 },
  farKnee: { x: 190, y: 144 },
  farAnkle: { x: 230, y: 146 },
  farToe: { x: 240, y: 148 },
});

const QUADRUPED_PLANK_SPEC: LateralAndApparatusDiagramSpec = Object.freeze({
  id: 'quadruped-and-apparatus-plank-pike',
  diagramId: 'quadruped-and-apparatus-plank-pike',
  mappedExerciseIds: Object.freeze([
    'original-cadillac-quadruped-slide',
    'original-chair-incline-support',
    'original-mat-quadruped-reach',
    'ex-plank-01',
    'ex-plank-02',
    'ex-kr-chair-01',
  ]),
  primaryCatalogExerciseId: 'original-mat-quadruped-reach',
  nameKo: '네발기기 교차 리치 & 리포머·체어 플랭크/파이크 (Quadruped Reach & Apparatus Plank/Pike)',
  nameEn: 'Quadruped Arm-Leg Reach, Reformer Long Stretch & Chair Pull-Up Pike',
  subtitleKo: '손목-어깨 수직 지지(x=108) & 전거근 전인 → 수평 교차 리치 / 기구 플랭크·파이크 → 중립 테이블탑 복귀',
  focusSummaryKo:
    '매트·캐딜락 네발기기 슬라이드/리치(버드독), 리포머 롱 스트레치, 운다 체어 인클라인 서포트 및 페달 파이크에서 전거근 견갑 지지와 항신전 코어 수평축(y=94)을 유지합니다.',
  archetypeId: 'quadruped-reach-slide',
  archetypeTitleKo: '네발기기(Quadruped) 팔·다리 리치 & 슬라이드 (버드독)',
  supportBaselineY: 150,
  kinematicMetrics: Object.freeze({
    primaryAngleDeg: 180,
    pelvicDriftTolerancePx: 0,
    supportBaselineY: 150,
    keyExcursionDeltaPx: 140,
  }),
  vectorOverlays: Object.freeze([
    {
      id: 'quad-opposition-reach',
      labelKo: '손끝(32,90) ↔ 발끝(292,96) 180° 양방향 수평 리치',
      kind: 'closed-chain-plank-pike',
      phaseId: 'middle',
      svgPathD: 'M 108 94 L 32 90 M 194 96 L 292 96',
      startPoint: pt(32, 90),
      endPoint: pt(292, 96),
    },
    {
      id: 'quad-spine-tabletop-lock',
      labelKo: '어깨-흉추-요추-골반 수평 테이블탑 축 (y=94 · 허리 처짐 0px)',
      kind: 'pelvic-anchor-lock',
      phaseId: 'middle',
      svgPathD: 'M 108 94 L 192 94',
      startPoint: pt(108, 94),
      endPoint: pt(192, 94),
    },
  ] as const),
  calloutLabels: Object.freeze([
    {
      id: 'quad-callout-start',
      phaseId: 'start',
      textKo: '손목-어깨(x=108)·무릎-골반(x=194) 수직 스택 & 전거근 푸시',
      anchor: pt(108, 94),
      badgePosition: pt(52, 34),
      tone: 'anchor',
    },
    {
      id: 'quad-callout-middle',
      phaseId: 'middle',
      textKo: '반대 팔·다리 180° 수평 신장 (요추 과신전·골반 회전 0)',
      anchor: pt(138, 94),
      badgePosition: pt(64, 34),
      tone: 'excursion',
    },
    {
      id: 'quad-callout-end',
      phaseId: 'end',
      textKo: '몸통 높이(y=94) 유지하며 4점 지지 정밀 복귀',
      anchor: pt(194, 146),
      badgePosition: pt(88, 36),
      tone: 'stabilization',
    },
  ] as const),
  asset: buildLateralApparatusVisualAsset({
    exerciseId: 'original-mat-quadruped-reach',
    nameKo: '네발기기 팔·다리 리치',
    nameEn: 'Quadruped Reach',
    apparatus: 'mat',
    bodyPosition: 'quadruped',
    blockCategory: 'plank',
    spinalPlanes: ['neutral'],
    isUnilateral: true,
    archetypeId: 'quadruped-reach-slide',
    archetypeTitleKo: '네발기기(Quadruped) 팔·다리 리치 & 슬라이드 (버드독)',
    supportSurfaceKo: '매트 / 캐딜락 테이블 4점 지지 및 리포머 풋바·운다 체어 시트 닫힌 사슬 지지면',
    startJoints: QUADRUPED_PLANK_START_JOINTS,
    middleJoints: QUADRUPED_PLANK_MIDDLE_JOINTS,
    endJoints: QUADRUPED_PLANK_END_JOINTS,
    phaseTitlesKo: [
      '어깨-손목·골반-무릎 수직 스택 & 전거근 전인 세팅',
      '180° 대각 사지 수평 리치 / 기구 플랭크·파이크 정점',
      '항회전·항신전 유지 & 시작 지지 자세 복귀',
    ],
    phaseSummariesKo: [
      '손목을 어깨 수직 아래(x=108), 무릎을 골반 수직 아래(x=194)에 두고 바닥/시트를 밀어내어 등 상부를 평평하게(y=94) 채웁니다.',
      '몸통 수평선(y=94)과 지지측 손·무릎 앵커를 흔들림 없이 유지한 채 반대쪽 팔(32,90)과 다리(292,96)를 바닥과 수평으로 길게 뻗습니다.',
      '허리가 처지거나 날개뼈가 솟지 않게 전거근·복횡근 지지를 끝까지 유지하며 손과 무릎을 수직 지지점으로 되돌립니다.',
    ],
    breathCuesKo: [
      '들숨 준비: 손바닥으로 지지면을 밀어 전거근 활성 및 뒷목 신장',
      '날숨 리치: 아랫배를 등 쪽으로 당기며 손끝과 발끝을 높이보다 길이 우선으로 신장',
      '들숨 복귀: 골반 위 커피잔이 쏟아지지 않게 제어하며 4점 지지 복귀',
    ],
    alignments: {
      start: [
        {
          id: 'quad-start-vertical-columns',
          labelKo: '손목-어깨(x=108) & 무릎-골반(x=194) 수직 지지 기둥',
          cueKo: '손가락을 넓게 펴 체중을 분산하고 팔꿈치가 과신전되지 않게 미세하게 부드럽게 둡니다.',
          kind: 'plumb-line',
          from: pt(108, 146),
          to: pt(108, 94),
          targetAngleDeg: 90,
          cautionKo: '날개뼈 사이가 바닥으로 푹 꺼지지 않게 밀어냅니다.',
        },
      ],
      middle: [
        {
          id: 'quad-middle-horizontal-line',
          labelKo: '손끝-어깨-골반-발끝 180° 수평 항신전 라인 (y=90..96)',
          cueKo: '다리를 몸통보다 높이 들어 허리를 꺾지 않고 둔근·햄스트링으로 수평 길이만 늘립니다.',
          kind: 'axis-line',
          from: pt(32, 90),
          to: pt(292, 96),
          targetAngleDeg: 180,
          cautionKo: '드는 다리 쪽 골반이 천장으로 열리지 않게 양쪽 ASIS가 바닥을 향하게 합니다.',
        },
      ],
      end: [
        {
          id: 'quad-end-tabletop-lock',
          labelKo: '척추 수평(y=94) 유지 4점 복귀선',
          cueKo: '손과 무릎이 바닥에 닿을 때 체중이 한쪽으로 쏠리지 않게 정교하게 착지합니다.',
          kind: 'anchor-lock',
          from: pt(108, 94),
          to: pt(192, 94),
          cautionKo: '마지막 복귀 순간에 복부 힘을 풀지 않습니다.',
        },
      ],
    },
    directionVectors: {
      start: [
        {
          id: 'vec-quad-serratus-push',
          labelKo: '지면반력 기반 전거근 상방 푸시',
          kind: 'axial-lengthening',
          points: [pt(108, 146), pt(108, 94)],
          phaseScope: 'start',
        },
      ],
      middle: [
        {
          id: 'vec-quad-arm-forward',
          labelKo: '전방 상지 수평 리치',
          kind: 'limb-excursion',
          points: [pt(102, 148), pt(74, 92), pt(32, 90)],
          phaseScope: 'start-to-middle',
        },
        {
          id: 'vec-quad-leg-backward',
          labelKo: '후방 하지 수평 신전',
          kind: 'limb-excursion',
          points: [pt(194, 146), pt(238, 96), pt(292, 96)],
          phaseScope: 'start-to-middle',
        },
      ],
      end: [
        {
          id: 'vec-quad-return-base',
          labelKo: '수직 지지선 감속 회수',
          kind: 'return-control',
          points: [pt(292, 96), pt(238, 96), pt(194, 146)],
          phaseScope: 'middle-to-end',
        },
      ],
    },
    poseDeltaSummary: {
      startToMiddleKo:
        '어깨-흉추-요추-골반 수평축(y:94)과 지지측 팔·다리는 고정된 채 활성 손(102,148→32,90)과 발끝(244,150→292,96)이 180° 양방향 수평 리치합니다.',
      middleToEndKo:
        '척추 흔들림이나 허리 처짐 없이 손과 무릎이 다시 어깨·골반 수직 아래(x:108, x:194)로 복귀합니다.',
      invariantAnchorsKo: '어깨(108,94), 흉추(138,94), 요추(166,94), 골반(192,94) 수평 테이블탑 라인이 고정됩니다.',
      keyJointChangeKo: '대각 상·하지 180° 수평 반대 신장(총 스팬 260px, 요추 처짐 0px)',
    },
    mobileSummaryBulletsKo: [
      '시작 정렬: 손목-어깨(x=108)·무릎-골반(x=194) 수직 정렬 & 전거근 푸시',
      '중간 정점: 허리 꺾임 없이 반대 팔·다리 180° 수평 신장 (또는 리포머 플랭크/체어 파이크)',
      '제어 복귀: 골반 수평(y=94)을 지키며 사지를 시작 지지 위치로 회수',
    ],
  }),
  correction: buildCorrectionFromLedgerEntry(
    LEDGER_ENTRY_BY_ID['quadruped-and-apparatus-plank-pike'],
  ),
  ledgerEntry: LEDGER_ENTRY_BY_ID['quadruped-and-apparatus-plank-pike'],
});

export const LATERAL_AND_APPARATUS_DIAGRAM_SPECS: Readonly<
  Record<LateralAndApparatusDiagramId, LateralAndApparatusDiagramSpec>
> = Object.freeze({
  'lateral-mermaid-and-barrel-side-bend': LATERAL_MERMAID_SPEC,
  'apparatus-and-side-lying-thoracic-rotation': APPARATUS_ROTATION_SPEC,
  'supine-tabletop-knee-fold-and-reverse-curl': TABLETOP_KNEE_FOLD_SPEC,
  'quadruped-and-apparatus-plank-pike': QUADRUPED_PLANK_SPEC,
});

const EXERCISE_OR_DIAGRAM_ID_TO_GROUP: Readonly<Record<string, LateralAndApparatusDiagramId>> =
  Object.freeze({
    // Diagram IDs
    'lateral-mermaid-and-barrel-side-bend': 'lateral-mermaid-and-barrel-side-bend',
    'apparatus-and-side-lying-thoracic-rotation': 'apparatus-and-side-lying-thoracic-rotation',
    'supine-tabletop-knee-fold-and-reverse-curl': 'supine-tabletop-knee-fold-and-reverse-curl',
    'quadruped-and-apparatus-plank-pike': 'quadruped-and-apparatus-plank-pike',
    // Group 1 (7)
    'original-barrel-supported-side-bend': 'lateral-mermaid-and-barrel-side-bend',
    'original-barrel-standing-side-stretch': 'lateral-mermaid-and-barrel-side-bend',
    'original-cadillac-seated-side-reach': 'lateral-mermaid-and-barrel-side-bend',
    'original-chair-seated-mermaid': 'lateral-mermaid-and-barrel-side-bend',
    'original-mat-mermaid': 'lateral-mermaid-and-barrel-side-bend',
    'ex-cooldown-01': 'lateral-mermaid-and-barrel-side-bend',
    'ex-kr-barrel-01': 'lateral-mermaid-and-barrel-side-bend',
    // Group 2 (4)
    'original-barrel-standing-rotation': 'apparatus-and-side-lying-thoracic-rotation',
    'original-chair-seated-spine-twist': 'apparatus-and-side-lying-thoracic-rotation',
    'original-cadillac-seated-rotation': 'apparatus-and-side-lying-thoracic-rotation',
    'original-mat-open-book': 'apparatus-and-side-lying-thoracic-rotation',
    // Group 3 (6)
    'original-mat-heel-slide': 'supine-tabletop-knee-fold-and-reverse-curl',
    'original-cadillac-table-knee-fold': 'supine-tabletop-knee-fold-and-reverse-curl',
    'original-chair-seated-knee-lift': 'supine-tabletop-knee-fold-and-reverse-curl',
    'original-mat-knee-fold': 'supine-tabletop-knee-fold-and-reverse-curl',
    'ex-core-04': 'supine-tabletop-knee-fold-and-reverse-curl',
    'ex-kr-reformer-04': 'supine-tabletop-knee-fold-and-reverse-curl',
    // Group 4 (6)
    'original-cadillac-quadruped-slide': 'quadruped-and-apparatus-plank-pike',
    'original-chair-incline-support': 'quadruped-and-apparatus-plank-pike',
    'original-mat-quadruped-reach': 'quadruped-and-apparatus-plank-pike',
    'ex-plank-01': 'quadruped-and-apparatus-plank-pike',
    'ex-plank-02': 'quadruped-and-apparatus-plank-pike',
    'ex-kr-chair-01': 'quadruped-and-apparatus-plank-pike',
  });

export function resolveLateralAndApparatusDiagramId(
  exerciseOrDiagramId: string | Pick<PilatesExercise, 'id'>,
): LateralAndApparatusDiagramId | null {
  const rawId =
    typeof exerciseOrDiagramId === 'string' ? exerciseOrDiagramId : exerciseOrDiagramId.id;
  return EXERCISE_OR_DIAGRAM_ID_TO_GROUP[rawId] ?? null;
}

export function resolveLateralAndApparatusDiagram(
  exerciseOrDiagramId: string | Pick<PilatesExercise, 'id'>,
): LateralAndApparatusDiagramSpec | null {
  const diagramId = resolveLateralAndApparatusDiagramId(exerciseOrDiagramId);
  return diagramId ? LATERAL_AND_APPARATUS_DIAGRAM_SPECS[diagramId] : null;
}

let cachedCorrections: Readonly<Record<string, MovementDiagramCorrection>> | null = null;

export function getLateralAndApparatusDiagramCorrections(): Readonly<
  Record<string, MovementDiagramCorrection>
> {
  if (cachedCorrections) {
    return cachedCorrections;
  }

  const record: Record<string, MovementDiagramCorrection> = {};

  for (const diagramId of LATERAL_AND_APPARATUS_DIAGRAM_IDS) {
    const spec = LATERAL_AND_APPARATUS_DIAGRAM_SPECS[diagramId];
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

export function getLateralAndApparatusCatalogVisualAssets(): Readonly<
  Record<string, CatalogMovementVisualAsset>
> {
  const assets: Record<string, CatalogMovementVisualAsset> = {};
  for (const diagramId of LATERAL_AND_APPARATUS_DIAGRAM_IDS) {
    const spec = LATERAL_AND_APPARATUS_DIAGRAM_SPECS[diagramId];
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
