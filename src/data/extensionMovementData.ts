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
import {
  EXTENSION_DIAGRAM_AUDIT_RECORDS,
  EXTENSION_DIAGRAM_CORRECTIONS,
  type ExtensionArchetypeKey,
  type ExtensionMovementFamily,
  type ExtensionMovementId,
  type ExtensionSupportSurface,
} from './extensionDiagramSources';
import type {
  ExtensionCalloutLabelSpec,
  ExtensionContactPointSpec,
  ExtensionJointAxisSpec,
  ExtensionMovementDiagramSpec,
  ExtensionPhaseSpec,
} from '../models/extensionMovementModel';

export const EXTENSION_MOVEMENT_IDS: readonly ExtensionMovementId[] = Object.freeze([
  'original-mat-swan-prep',
  'original-mat-swimming-prep',
  'extension-mat-swimming-alternating',
  'original-reformer-box-swan-prep',
  'ex-extension-01',
  'original-cadillac-prone-back-reach',
  'original-barrel-supported-swan',
  'ex-extension-02',
]);

export const EXTENSION_ARCHETYPE_KEYS: readonly ExtensionArchetypeKey[] = Object.freeze([
  'prone-extension',
  'swimming',
]);

function pt(x: number, y: number): Point2D {
  return Object.freeze({ x, y });
}

function joints(raw: RigJointMap): RigJointMap {
  return Object.freeze({ ...raw });
}

const SWAN_MUSCLES: readonly MuscleHighlightSpec[] = Object.freeze([
  Object.freeze({
    muscleGroupId: 'thoracic-extensors',
    labelKo: '흉추 신전근 (상·중부 척추기립근·다열근)',
    labelEn: 'Thoracic Extensors & Multifidus',
    catalogMuscleMatches: Object.freeze(['척추기립근', '흉추 신전근', '상부 등']),
    role: 'primary',
    roleLabelKo: '주동근 (주 타겟)',
    activePhases: Object.freeze(['middle', 'end'] as const),
    anchorJoints: Object.freeze(['lumbar', 'thoracic', 'neck'] as const),
    reasonKo: '요추 과신전 없이 상·중부 흉추 분절 신전과 축성 신장(Axial Elongation)을 주도합니다.',
  }),
  Object.freeze({
    muscleGroupId: 'latissimus-serratus',
    labelKo: '광배근·능형근·하부 승모근 (견갑 하강·안정)',
    labelEn: 'Latissimus Dorsi & Lower Trapezius',
    catalogMuscleMatches: Object.freeze(['광배근', '능형근', '하부 승모근', '전거근']),
    role: 'primary',
    roleLabelKo: '주동근 (주 타겟)',
    activePhases: Object.freeze(['start', 'middle', 'end'] as const),
    anchorJoints: Object.freeze(['shoulder', 'thoracic', 'lumbar'] as const),
    reasonKo: '쇄골을 넓히고 견갑골을 등 아래로 끌어내려 목·어깨 과긴장을 방지합니다.',
  }),
  Object.freeze({
    muscleGroupId: 'core-transversus',
    labelKo: '심부 코어 (복횡근·골반저근 복부 리프트)',
    labelEn: 'Deep Core & Abdominal Lift',
    catalogMuscleMatches: Object.freeze(['복횡근', '심부 코어', '골반 안정화근']),
    role: 'stabilizer',
    roleLabelKo: '안정화근 (코어·정렬 유지)',
    activePhases: Object.freeze(['start', 'middle', 'end'] as const),
    anchorJoints: Object.freeze(['thoracic', 'lumbar', 'pelvis'] as const),
    reasonKo: '치골을 지지면에 고정하고 아랫배를 가볍게 들어 올려 요추 힌지 압박을 차단합니다.',
  }),
  Object.freeze({
    muscleGroupId: 'glute-max',
    labelKo: '대둔근·햄스트링 (골반 후방 앵커 지지)',
    labelEn: 'Gluteus Maximus & Hamstrings',
    catalogMuscleMatches: Object.freeze(['대둔근', '햄스트링']),
    role: 'stabilizer',
    roleLabelKo: '안정화근 (코어·정렬 유지)',
    activePhases: Object.freeze(['middle', 'end'] as const),
    anchorJoints: Object.freeze(['pelvis', 'hip', 'knee'] as const),
    reasonKo: '치골 결합부 고정과 하체 신장을 도와 요추로 쏠리는 부하를 분산합니다.',
  }),
]);

const SWIMMING_MUSCLES: readonly MuscleHighlightSpec[] = Object.freeze([
  Object.freeze({
    muscleGroupId: 'thoracic-extensors',
    labelKo: '척추기립근·다열근 (대각선 후면 사슬)',
    labelEn: 'Thoracic Extensors & Multifidus',
    catalogMuscleMatches: Object.freeze(['척추기립근', '다열근', '후면 사슬']),
    role: 'primary',
    roleLabelKo: '주동근 (주 타겟)',
    activePhases: Object.freeze(['start', 'middle', 'end'] as const),
    anchorJoints: Object.freeze(['pelvis', 'lumbar', 'thoracic', 'neck'] as const),
    reasonKo: '반대쪽 팔·다리 교차 부양 중 척추 축성 길이(Length over height)를 유지합니다.',
  }),
  Object.freeze({
    muscleGroupId: 'glute-max',
    labelKo: '대둔근·햄스트링 (반대측 고관절 신전)',
    labelEn: 'Contralateral Gluteus Maximus & Hamstrings',
    catalogMuscleMatches: Object.freeze(['대둔근', '햄스트링']),
    role: 'primary',
    roleLabelKo: '주동근 (주 타겟)',
    activePhases: Object.freeze(['middle', 'end'] as const),
    anchorJoints: Object.freeze(['pelvis', 'hip', 'knee', 'ankle'] as const),
    reasonKo: '무릎을 펴고 발끝을 멀리 뻗어 고관절에서부터 다리를 길게 들어 올립니다.',
  }),
  Object.freeze({
    muscleGroupId: 'core-transversus',
    labelKo: '심부 코어 (복횡근·내외복사근 항회전 안정)',
    labelEn: 'Transversus Abdominis & Obliques',
    catalogMuscleMatches: Object.freeze(['복횡근', '복사근', '코어']),
    role: 'stabilizer',
    roleLabelKo: '안정화근 (코어·정렬 유지)',
    activePhases: Object.freeze(['start', 'middle', 'end'] as const),
    anchorJoints: Object.freeze(['thoracic', 'lumbar', 'pelvis'] as const),
    reasonKo: '사지 교차 플러터 중 골반 좌우 흔들림과 요추 처짐을 억제합니다.',
  }),
]);

function buildStandardAxes(
  j: RigJointMap,
  family: ExtensionMovementFamily,
): readonly ExtensionJointAxisSpec[] {
  const axes: ExtensionJointAxisSpec[] = [
    Object.freeze({
      id: 'axis-thoracic-extension',
      joint: 'thoracic',
      labelKo: '상·중부 흉추 신전 축',
      role: 'primary-extension-axis',
      point: j.thoracic,
      noteKo: '요추 대신 흉골과 상부 흉추를 앞·위로 길게 뽑아 올리는 주 가동 축',
    }),
    Object.freeze({
      id: 'axis-pelvic-pubic-anchor',
      joint: 'pelvis',
      labelKo: '치골·ASIS 고정 축',
      role: 'stabilizing-pelvic-axis',
      point: j.pelvis,
      noteKo: '지지면에 밀착되어 요추 과신전 및 골반 전방 덤핑을 막는 기준점',
    }),
  ];
  if (family === 'swimming') {
    axes.push(
      Object.freeze({
        id: 'axis-contralateral-sling',
        joint: 'shoulder',
        labelKo: '대각선 견갑-고관절 교차 축',
        role: 'contralateral-hip-shoulder-axis',
        point: j.shoulder,
        noteKo: '반대쪽 팔·다리를 높이보다 수평 길이 우선으로 뻗는 교차 슬링 축',
      }),
    );
  }
  return Object.freeze(axes);
}

function buildStandardCallouts(
  j: RigJointMap,
  supportSurface: ExtensionSupportSurface,
  family: ExtensionMovementFamily,
): readonly ExtensionCalloutLabelSpec[] {
  const surfaceLabel =
    supportSurface === 'mat'
      ? '매트 치골 고정'
      : supportSurface === 'reformer-box'
        ? '롱박스 상판(y=116) 치골 고정'
        : supportSurface === 'cadillac-table'
          ? '캐딜락 베드(y=142) 치골 고정'
          : '바렐 정점(y=104) 치골 지지';

  return Object.freeze([
    Object.freeze({
      id: 'callout-pubic-anchor',
      labelKo: `${surfaceLabel} · 복부 리프트`,
      targetJoint: 'pelvis',
      anchorPoint: j.pelvis,
      offsetPoint: pt(j.pelvis.x + 6, Math.max(22, j.pelvis.y - 24)),
      tone: 'alignment',
    }),
    Object.freeze({
      id: 'callout-cervical-continuity',
      labelKo:
        family === 'swimming'
          ? '뒷목 길게 · 시선 바닥 (수평 신장 > 수직 높이)'
          : '경추-흉추 연속 아크 (턱 들기 금지)',
      targetJoint: 'neck',
      anchorPoint: j.neck,
      offsetPoint: pt(Math.max(20, j.neck.x - 10), Math.max(20, j.neck.y - 20)),
      tone: 'caution',
    }),
  ]);
}

interface PhaseBuildInput {
  readonly phaseId: VisualPhaseId;
  readonly shortTitleKo: string;
  readonly summaryKo: string;
  readonly breathCueKo: string;
  readonly supportSurface: ExtensionSupportSurface;
  readonly family: ExtensionMovementFamily;
  readonly joints: RigJointMap;
  readonly fixedAnchors: PhasePoseSpec['fixedAnchors'];
  readonly movingJoints: PhasePoseSpec['movingJoints'];
  readonly carriageOffsetPx?: number;
  readonly springTensionLevel?: 'low' | 'medium' | 'high' | 'none';
  readonly supportSurfaceKo: string;
  readonly propPositionKo?: string;
  readonly contactPoints: readonly ExtensionContactPointSpec[];
  readonly alignments: readonly JointAlignmentGuide[];
  readonly directionVectors: readonly MovementDirectionVector[];
}

function makePhase(input: PhaseBuildInput): ExtensionPhaseSpec {
  const badgeKo =
    input.phaseId === 'start'
      ? '시작 자세 (준비·정렬)'
      : input.phaseId === 'middle'
        ? '중간 자세 (최대 가동·정점)'
        : '끝 자세 (제어 복귀·마무리)';

  return Object.freeze({
    phaseId: input.phaseId,
    badgeKo,
    shortTitleKo: input.shortTitleKo,
    summaryKo: input.summaryKo,
    breathCueKo: input.breathCueKo,
    supportSurface: input.supportSurface,
    family: input.family,
    joints: input.joints,
    fixedAnchors: Object.freeze([...input.fixedAnchors]),
    movingJoints: Object.freeze([...input.movingJoints]),
    apparatusState: Object.freeze({
      carriageOffsetPx: input.carriageOffsetPx ?? 0,
      pedalAngleDeg: 0,
      springTensionLevel: input.springTensionLevel ?? 'none',
      supportSurfaceKo: input.supportSurfaceKo,
      ...(input.propPositionKo ? { propPositionKo: input.propPositionKo } : {}),
    }),
    alignments: Object.freeze([...input.alignments]),
    directionVectors: Object.freeze([...input.directionVectors]),
    jointAxes: buildStandardAxes(input.joints, input.family),
    contactPoints: Object.freeze([...input.contactPoints]),
    calloutLabels: buildStandardCallouts(input.joints, input.supportSurface, input.family),
  });
}

function createExtensionSpec(config: {
  movementId: ExtensionMovementId;
  archetypeKey: ExtensionArchetypeKey;
  isolatedArchetypeId: string;
  family: ExtensionMovementFamily;
  supportSurface: ExtensionSupportSurface;
  apparatus: CatalogMovementVisualAsset['apparatus'];
  nameKo: string;
  nameEn: string;
  archetypeTitleKo: string;
  isUnilateral: boolean;
  phases: {
    start: ExtensionPhaseSpec;
    middle: ExtensionPhaseSpec;
    end: ExtensionPhaseSpec;
  };
  poseDeltaSummary: CatalogMovementVisualAsset['poseDeltaSummary'];
  mobileSummaryBulletsKo: readonly [string, string, string];
}): ExtensionMovementDiagramSpec {
  const catalogAsset: CatalogMovementVisualAsset = Object.freeze({
    exerciseId: config.movementId,
    nameKo: config.nameKo,
    nameEn: config.nameEn,
    apparatus: config.apparatus,
    bodyPosition: 'prone',
    blockCategory: 'extension',
    spinalPlanes: Object.freeze(['extension', 'neutral'] as const),
    isUnilateral: config.isUnilateral,
    archetypeId: config.isolatedArchetypeId,
    archetypeTitleKo: config.archetypeTitleKo,
    staticGuideSvgPath: `/guides/extension/${config.movementId}.svg`,
    productionMethod: 'free-authored-kinematic-svg-v1',
    rightsStatus: 'original-app-authored-free-license',
    licenseLabelKo: 'Original App-Authored Kinematic Diagram (Free License)',
    anatomicalAccuracyAssumed: false,
    phases: Object.freeze({
      start: config.phases.start,
      middle: config.phases.middle,
      end: config.phases.end,
    }),
    primaryMuscles: config.family === 'swimming' ? SWIMMING_MUSCLES : SWAN_MUSCLES,
    poseDeltaSummary: Object.freeze(config.poseDeltaSummary),
    mobileSummaryBulletsKo: Object.freeze(config.mobileSummaryBulletsKo),
  });

  return Object.freeze({
    movementId: config.movementId,
    archetypeKey: config.archetypeKey,
    isolatedArchetypeId: config.isolatedArchetypeId,
    family: config.family,
    supportSurface: config.supportSurface,
    apparatus: config.apparatus,
    nameKo: config.nameKo,
    nameEn: config.nameEn,
    isUnilateral: config.isUnilateral,
    phases: Object.freeze({
      start: config.phases.start,
      middle: config.phases.middle,
      end: config.phases.end,
    }),
    catalogAsset,
  });
}

// 1) Mat Swan Prep (`original-mat-swan-prep`)
const matSwanPrepSpec = createExtensionSpec({
  movementId: 'original-mat-swan-prep',
  archetypeKey: 'prone-extension',
  isolatedArchetypeId: EXTENSION_DIAGRAM_AUDIT_RECORDS['original-mat-swan-prep'].isolatedArchetypeId,
  family: 'swan',
  supportSurface: 'mat',
  apparatus: 'mat',
  nameKo: '매트 스완 준비 (Baby Swan · 전완 지지 흉추 신전)',
  nameEn: 'Mat Swan Prep (Baby Swan)',
  archetypeTitleKo: '매트 스완 준비 · 전완·치골 매트 고정 및 상·중부 흉추 축성 신전',
  isUnilateral: false,
  phases: {
    start: makePhase({
      phaseId: 'start',
      shortTitleKo: '복와위 중립 · 양손·전완·치골·발등 매트 밀착',
      summaryKo:
        '어깨 옆 매트에 양손(52,146)과 전완(84,146)을 지지하고 치골(144,144)과 발등(228,145)을 매트에 고정한 채 아랫배를 가볍게 들어 올립니다.',
      breathCueKo: '들숨 준비: 뒷목을 길게 유지하며 흉곽 측·후면으로 호흡을 채웁니다.',
      supportSurface: 'mat',
      family: 'swan',
      supportSurfaceKo: '필라테스 매트 (복와위 · 치골 y=144 및 전완 y=146 지지)',
      joints: joints({
        head: pt(52, 131),
        neck: pt(68, 134),
        shoulder: pt(76, 136),
        elbow: pt(84, 146),
        wrist: pt(62, 146),
        hand: pt(52, 146),
        thoracic: pt(90, 138),
        lumbar: pt(118, 142),
        pelvis: pt(144, 144),
        hip: pt(150, 144),
        knee: pt(190, 145),
        ankle: pt(228, 145),
        heel: pt(234, 142),
        toe: pt(248, 146),
      }),
      fixedAnchors: [
        { joint: 'hand', surfaceKo: '매트 전방 손바닥 지지점 (52,146)', point: pt(52, 146) },
        { joint: 'elbow', surfaceKo: '매트 전완 지지점 (84,146)', point: pt(84, 146) },
        { joint: 'pelvis', surfaceKo: '매트 치골 결합부 앵커 (144,144)', point: pt(144, 144) },
        { joint: 'ankle', surfaceKo: '매트 발등 지지점 (228,145)', point: pt(228, 145) },
      ],
      movingJoints: ['head', 'neck', 'shoulder', 'thoracic'],
      contactPoints: [
        { id: 'cp-swan-hand', joint: 'hand', surface: 'mat', status: 'anchored', labelKo: '양손 매트 지지', point: pt(52, 146) },
        { id: 'cp-swan-elbow', joint: 'elbow', surface: 'mat', status: 'anchored', labelKo: '전완 매트 지지', point: pt(84, 146) },
        { id: 'cp-swan-pelvis', joint: 'pelvis', surface: 'mat', status: 'anchored', labelKo: '치골 매트 고정', point: pt(144, 144) },
        { id: 'cp-swan-ankle', joint: 'ankle', surface: 'mat', status: 'anchored', labelKo: '발등 매트 고정', point: pt(228, 145) },
      ],
      alignments: [
        {
          id: 'align-mat-swan-start',
          labelKo: '치골(144,144)-전완(84,146) 매트 지지선',
          cueKo: '어깨가 귀로 으쓱하지 않도록 견갑골을 등 아래로 부드럽게 내립니다.',
          kind: 'anchor-lock',
          from: pt(52, 146),
          to: pt(228, 145),
          cautionKo: '허리를 바닥으로 무너뜨리지 않습니다.',
        },
      ],
      directionVectors: [
        {
          id: 'vec-mat-swan-axial-prep',
          labelKo: '정수리 전방 축성 신장 준비',
          kind: 'axial-lengthening',
          points: [pt(90, 138), pt(52, 131)],
          phaseScope: 'start',
        },
      ],
    }),
    middle: makePhase({
      phaseId: 'middle',
      shortTitleKo: '상·중부 흉추 아크 상승 · 전완·치골 매트 고정 유지',
      summaryKo:
        '전완(84,146)과 양손(52,146), 치골(144,144)을 매트에 고정한 채 흉골을 앞·위로 길게 밀어 올려 상·중부 흉추(92,122)를 부드럽게 신전합니다.',
      breathCueKo: '들숨 또는 날숨 유지: 복부 리프트를 유지하며 흉골을 전방 사선으로 확장합니다.',
      supportSurface: 'mat',
      family: 'swan',
      supportSurfaceKo: '필라테스 매트 (전완·치골 매트 지지 속 상부 흉추 신전)',
      joints: joints({
        head: pt(54, 94),
        neck: pt(70, 106),
        shoulder: pt(78, 114),
        elbow: pt(84, 146),
        wrist: pt(62, 146),
        hand: pt(52, 146),
        thoracic: pt(92, 122),
        lumbar: pt(118, 137),
        pelvis: pt(144, 144),
        hip: pt(150, 144),
        knee: pt(190, 145),
        ankle: pt(228, 145),
        heel: pt(234, 142),
        toe: pt(248, 146),
      }),
      fixedAnchors: [
        { joint: 'hand', surfaceKo: '매트 전방 손바닥 지지점 (52,146)', point: pt(52, 146) },
        { joint: 'elbow', surfaceKo: '매트 전완 지지점 (84,146)', point: pt(84, 146) },
        { joint: 'pelvis', surfaceKo: '매트 치골 결합부 앵커 (144,144)', point: pt(144, 144) },
        { joint: 'ankle', surfaceKo: '매트 발등 지지점 (228,145)', point: pt(228, 145) },
      ],
      movingJoints: ['head', 'neck', 'shoulder', 'thoracic', 'lumbar'],
      contactPoints: [
        { id: 'cp-swan-mid-hand', joint: 'hand', surface: 'mat', status: 'anchored', labelKo: '양손 매트 고정', point: pt(52, 146) },
        { id: 'cp-swan-mid-elbow', joint: 'elbow', surface: 'mat', status: 'anchored', labelKo: '전완 매트 지지', point: pt(84, 146) },
        { id: 'cp-swan-mid-pelvis', joint: 'pelvis', surface: 'mat', status: 'anchored', labelKo: '치골 매트 고정', point: pt(144, 144) },
        { id: 'cp-swan-mid-ankle', joint: 'ankle', surface: 'mat', status: 'anchored', labelKo: '발등 매트 고정', point: pt(228, 145) },
      ],
      alignments: [
        {
          id: 'align-mat-swan-mid-arc',
          labelKo: '치골(144,144)→흉추(92,122)→정수리(54,94) 연속 신전 아크',
          cueKo: '턱을 들지 않고 뒷목을 흉추 곡선의 연장선으로 길게 유지합니다.',
          kind: 'axis-line',
          from: pt(144, 144),
          to: pt(54, 94),
          cautionKo: '팔로만 바닥을 밀어 요추 한 지점을 꺾지 않습니다.',
        },
      ],
      directionVectors: [
        {
          id: 'vec-mat-swan-thoracic-lift',
          labelKo: '상·중부 흉추 축성 신장 및 상승',
          kind: 'spine-articulation',
          points: [pt(118, 137), pt(92, 122), pt(54, 94)],
          phaseScope: 'start-to-middle',
        },
      ],
    }),
    end: makePhase({
      phaseId: 'end',
      shortTitleKo: '복부 지지 유지 · 아래 갈비뼈부터 순차 편심성 복귀',
      summaryKo:
        '치골(144,144)에서 정수리(50,119)까지 멀어지는 축성 길이를 유지하며 아래 갈비뼈부터 매트 쪽으로 길게 내려옵니다.',
      breathCueKo: '날숨: 척추를 더 길게 늘이며 흉골과 이마를 순서대로 복귀합니다.',
      supportSurface: 'mat',
      family: 'swan',
      supportSurfaceKo: '필라테스 매트 (전완 지지 편심성 신전 복귀)',
      joints: joints({
        head: pt(50, 119),
        neck: pt(68, 125),
        shoulder: pt(76, 128),
        elbow: pt(84, 146),
        wrist: pt(62, 146),
        hand: pt(52, 146),
        thoracic: pt(90, 132),
        lumbar: pt(118, 140),
        pelvis: pt(144, 144),
        hip: pt(150, 144),
        knee: pt(190, 145),
        ankle: pt(228, 145),
        heel: pt(234, 142),
        toe: pt(248, 146),
      }),
      fixedAnchors: [
        { joint: 'hand', surfaceKo: '매트 전방 손바닥 지지점 (52,146)', point: pt(52, 146) },
        { joint: 'elbow', surfaceKo: '매트 전완 지지점 (84,146)', point: pt(84, 146) },
        { joint: 'pelvis', surfaceKo: '매트 치골 결합부 앵커 (144,144)', point: pt(144, 144) },
        { joint: 'ankle', surfaceKo: '매트 발등 지지점 (228,145)', point: pt(228, 145) },
      ],
      movingJoints: ['head', 'neck', 'shoulder', 'thoracic', 'lumbar'],
      contactPoints: [
        { id: 'cp-swan-end-hand', joint: 'hand', surface: 'mat', status: 'anchored', labelKo: '양손 매트 고정', point: pt(52, 146) },
        { id: 'cp-swan-end-elbow', joint: 'elbow', surface: 'mat', status: 'anchored', labelKo: '전완 매트 지지', point: pt(84, 146) },
        { id: 'cp-swan-end-pelvis', joint: 'pelvis', surface: 'mat', status: 'anchored', labelKo: '치골 매트 고정', point: pt(144, 144) },
        { id: 'cp-swan-end-ankle', joint: 'ankle', surface: 'mat', status: 'anchored', labelKo: '발등 매트 고정', point: pt(228, 145) },
      ],
      alignments: [
        {
          id: 'align-mat-swan-end-lengthen',
          labelKo: '편심성 하강 중 축성 신장 유지선',
          cueKo: '내려올 때 정수리를 앞벽 쪽으로 더 길게 뽑아냅니다.',
          kind: 'neutral-zone',
          from: pt(144, 144),
          to: pt(50, 119),
          cautionKo: '어깨나 복부 긴장을 한 번에 풀며 툭 떨어지지 않습니다.',
        },
      ],
      directionVectors: [
        {
          id: 'vec-mat-swan-eccentric-return',
          labelKo: '아래 흉곽부터 전방 신장하며 제어 하강',
          kind: 'return-control',
          points: [pt(54, 94), pt(50, 119)],
          phaseScope: 'middle-to-end',
        },
      ],
    }),
  },
  poseDeltaSummary: {
    startToMiddleKo:
      '양손(52,146)·전완(84,146)·치골(144,144)을 매트에 고정한 채 상부 흉추(90,138→92,122)와 머리(52,131→54,94)가 축성 신전으로 상승합니다.',
    middleToEndKo:
      '복부 리프트와 치골 고정을 유지하며 아래 갈비뼈부터 순차적으로 편심성 하강(머리 54,94→50,119)합니다.',
    invariantAnchorsKo: '양손(52,146), 전완(84,146), 치골(144,144), 발등(228,145) 4점 매트 지지 고정',
    keyJointChangeKo: '요추 과신전 없이 상·중부 흉추 아크 상승(Δ16px) 및 경추-흉추 연속 기울기 유지',
  },
  mobileSummaryBulletsKo: [
    '지지·고정: 매트 위 양손·전완·치골(y=144)·발등 밀착',
    '핵심 움직임: 복부 리프트 속 상·중부 흉추 축성 신전 후 편심성 복귀',
    '주의 정렬: 턱 들기(경추 과신전) 및 요추 단독 꺾임 금지',
  ],
});

// 2) Mat Swimming Prep (`original-mat-swimming-prep`)
const matSwimmingPrepSpec = createExtensionSpec({
  movementId: 'original-mat-swimming-prep',
  archetypeKey: 'swimming',
  isolatedArchetypeId: EXTENSION_DIAGRAM_AUDIT_RECORDS['original-mat-swimming-prep'].isolatedArchetypeId,
  family: 'swimming',
  supportSurface: 'mat',
  apparatus: 'mat',
  nameKo: '매트 스위밍 준비 (반대쪽 팔·다리 교차 신장 리프트)',
  nameEn: 'Mat Swimming Prep (Contralateral Arm & Leg Reach)',
  archetypeTitleKo: '매트 스위밍 준비 · 지지측 매트 고정 및 대각선 사지 수평 우위 신장',
  isUnilateral: true,
  phases: {
    start: makePhase({
      phaseId: 'start',
      shortTitleKo: '복와위 오버헤드 양팔·양다리 매트 신장 세팅',
      summaryKo:
        '양팔을 머리 앞 매트(22,146)로 길게 뻗고 양다리(246,146)와 치골(144,144)을 매트에 밀착한 상태에서 복횡근을 수축합니다.',
      breathCueKo: '들숨 준비: 정수리와 손끝·발끝을 서로 반대 방향 벽으로 길게 늘입니다.',
      supportSurface: 'mat',
      family: 'swimming',
      supportSurfaceKo: '필라테스 매트 (복와위 사지 신장 준비 · 치골 y=144)',
      joints: joints({
        head: pt(54, 134),
        neck: pt(70, 136),
        shoulder: pt(86, 138),
        elbow: pt(54, 144),
        wrist: pt(34, 145),
        hand: pt(22, 146),
        thoracic: pt(92, 139),
        lumbar: pt(118, 142),
        pelvis: pt(144, 144),
        hip: pt(150, 144),
        knee: pt(192, 145),
        ankle: pt(230, 145),
        heel: pt(236, 143),
        toe: pt(246, 146),
        farShoulder: pt(88, 140),
        farElbow: pt(58, 146),
        farWrist: pt(36, 146),
        farHip: pt(150, 144),
        farKnee: pt(190, 146),
        farAnkle: pt(228, 146),
        farToe: pt(244, 146),
      }),
      fixedAnchors: [
        { joint: 'pelvis', surfaceKo: '매트 치골·ASIS 삼각 지지점 (144,144)', point: pt(144, 144) },
        { joint: 'farWrist', surfaceKo: '지지측 왼손 매트 고정점 (36,146)', point: pt(36, 146) },
        { joint: 'farAnkle', surfaceKo: '지지측 오른발 매트 고정점 (228,146)', point: pt(228, 146) },
      ],
      movingJoints: ['hand', 'wrist', 'elbow', 'toe', 'ankle', 'knee', 'thoracic'],
      contactPoints: [
        { id: 'cp-swim-prep-pelvis', joint: 'pelvis', surface: 'mat', status: 'anchored', labelKo: '치골 매트 고정', point: pt(144, 144) },
        { id: 'cp-swim-prep-far-wrist', joint: 'farWrist', surface: 'mat', status: 'anchored', labelKo: '지지측 손 매트 접촉', point: pt(36, 146) },
        { id: 'cp-swim-prep-far-ankle', joint: 'farAnkle', surface: 'mat', status: 'anchored', labelKo: '지지측 다리 매트 접촉', point: pt(228, 146) },
      ],
      alignments: [
        {
          id: 'align-swim-prep-start',
          labelKo: '손끝(22,146)-치골(144,144)-발끝(246,146) 수평 축 정렬',
          cueKo: '골반 좌우 높이를 같게 두고 허리가 꺼지지 않게 아랫배를 지지합니다.',
          kind: 'neutral-zone',
          from: pt(22, 146),
          to: pt(246, 146),
          cautionKo: '거상 전 어깨가 귀 쪽으로 올라가지 않게 합니다.',
        },
      ],
      directionVectors: [
        {
          id: 'vec-swim-prep-axial',
          labelKo: '양방향 수평 축성 신장',
          kind: 'axial-lengthening',
          points: [pt(86, 138), pt(22, 146)],
          phaseScope: 'start',
        },
      ],
    }),
    middle: makePhase({
      phaseId: 'middle',
      shortTitleKo: '반대쪽 팔·다리 수평 우위 부양 (Length > Height)',
      summaryKo:
        '지지측 왼손(36,146)과 오른발(244,146)·치골(144,144)을 매트에 고정한 채 가동측 오른팔(20,106)과 왼다리(245,127)를 높이보다 길이 우선으로 뻗어 올립니다.',
      breathCueKo: '날숨: 골반 흔들림 없이 대각선 손끝과 발끝을 앞·뒤 벽으로 멀리 뻗습니다.',
      supportSurface: 'mat',
      family: 'swimming',
      supportSurfaceKo: '필라테스 매트 (지지측 사지·치골 매트 고정 + 대각선 사지 부양)',
      joints: joints({
        head: pt(54, 122),
        neck: pt(70, 127),
        shoulder: pt(86, 133),
        elbow: pt(54, 118),
        wrist: pt(32, 110),
        hand: pt(20, 106),
        thoracic: pt(92, 133),
        lumbar: pt(118, 140),
        pelvis: pt(144, 144),
        hip: pt(150, 144),
        knee: pt(192, 136),
        ankle: pt(228, 130),
        heel: pt(235, 128),
        toe: pt(245, 127),
        farShoulder: pt(88, 135),
        farElbow: pt(58, 146),
        farWrist: pt(36, 146),
        farHip: pt(150, 144),
        farKnee: pt(190, 146),
        farAnkle: pt(228, 146),
        farToe: pt(244, 146),
      }),
      fixedAnchors: [
        { joint: 'pelvis', surfaceKo: '매트 치골·ASIS 삼각 지지점 (144,144)', point: pt(144, 144) },
        { joint: 'farWrist', surfaceKo: '지지측 왼손 매트 고정점 (36,146)', point: pt(36, 146) },
        { joint: 'farAnkle', surfaceKo: '지지측 오른발 매트 고정점 (228,146)', point: pt(228, 146) },
      ],
      movingJoints: ['hand', 'wrist', 'elbow', 'toe', 'ankle', 'knee', 'thoracic', 'head'],
      contactPoints: [
        { id: 'cp-swim-mid-pelvis', joint: 'pelvis', surface: 'mat', status: 'anchored', labelKo: '치골 매트 고정', point: pt(144, 144) },
        { id: 'cp-swim-mid-far-wrist', joint: 'farWrist', surface: 'mat', status: 'anchored', labelKo: '지지측 손 매트 고정', point: pt(36, 146) },
        { id: 'cp-swim-mid-far-ankle', joint: 'farAnkle', surface: 'mat', status: 'anchored', labelKo: '지지측 발 매트 고정', point: pt(228, 146) },
        { id: 'cp-swim-mid-hand', joint: 'hand', surface: 'mat', status: 'hover-airborne', labelKo: '가동측 손 전방 리치(|dx|=66>dy=27)', point: pt(20, 106) },
        { id: 'cp-swim-mid-toe', joint: 'toe', surface: 'mat', status: 'hover-airborne', labelKo: '가동측 발 후방 리치(|dx|=95>dy=17)', point: pt(245, 127) },
      ],
      alignments: [
        {
          id: 'align-swim-prep-mid-reach',
          labelKo: '대각선 사지 수평 신장선 (|dx| > 1.5 × dy)',
          cueKo: '팔·다리를 높게 차올리지 않고 고관절과 견갑대에서 길게 뽑아냅니다.',
          kind: 'axis-line',
          from: pt(20, 106),
          to: pt(245, 127),
          cautionKo: '무릎만 구부려 발을 들거나 허리를 꺾지 않습니다.',
        },
      ],
      directionVectors: [
        {
          id: 'vec-swim-prep-contralateral-reach',
          labelKo: '가동측 오른팔·왼다리 반대 벽 방향 신장 부양',
          kind: 'limb-excursion',
          points: [pt(54, 144), pt(20, 106)],
          phaseScope: 'start-to-middle',
        },
      ],
    }),
    end: makePhase({
      phaseId: 'end',
      shortTitleKo: '골반 중립 유지 · 대각선 사지 제어 하강 및 교대 준비',
      summaryKo:
        '치골(144,144)과 요추 중립 코리도를 지킨 채 가동측 팔(20,126)과 다리(245,138)를 길게 늘이며 매트 위 낮은 호버 위치로 제어 하강합니다.',
      breathCueKo: '들숨: 몸통 흔들림 없이 사지를 길게 내려놓고 반대측 교대를 준비합니다.',
      supportSurface: 'mat',
      family: 'swimming',
      supportSurfaceKo: '필라테스 매트 (대각선 사지 편심성 제어 하강)',
      joints: joints({
        head: pt(54, 128),
        neck: pt(70, 131),
        shoulder: pt(86, 136),
        elbow: pt(54, 132),
        wrist: pt(33, 128),
        hand: pt(20, 126),
        thoracic: pt(92, 136),
        lumbar: pt(118, 141),
        pelvis: pt(144, 144),
        hip: pt(150, 144),
        knee: pt(192, 141),
        ankle: pt(229, 139),
        heel: pt(235, 137),
        toe: pt(245, 138),
        farShoulder: pt(88, 138),
        farElbow: pt(58, 146),
        farWrist: pt(36, 146),
        farHip: pt(150, 144),
        farKnee: pt(190, 146),
        farAnkle: pt(228, 146),
        farToe: pt(244, 146),
      }),
      fixedAnchors: [
        { joint: 'pelvis', surfaceKo: '매트 치골·ASIS 삼각 지지점 (144,144)', point: pt(144, 144) },
        { joint: 'farWrist', surfaceKo: '지지측 왼손 매트 고정점 (36,146)', point: pt(36, 146) },
        { joint: 'farAnkle', surfaceKo: '지지측 오른발 매트 고정점 (228,146)', point: pt(228, 146) },
      ],
      movingJoints: ['hand', 'wrist', 'elbow', 'toe', 'ankle', 'knee', 'head'],
      contactPoints: [
        { id: 'cp-swim-end-pelvis', joint: 'pelvis', surface: 'mat', status: 'anchored', labelKo: '치골 매트 고정', point: pt(144, 144) },
        { id: 'cp-swim-end-hand', joint: 'hand', surface: 'mat', status: 'hover-airborne', labelKo: '가동측 손 제어 하강', point: pt(20, 126) },
        { id: 'cp-swim-end-toe', joint: 'toe', surface: 'mat', status: 'hover-airborne', labelKo: '가동측 발 제어 하강', point: pt(245, 138) },
      ],
      alignments: [
        {
          id: 'align-swim-prep-end',
          labelKo: '골반 회전 없는 수평 복귀 정렬선',
          cueKo: '팔·다리가 내려올 때도 아랫배 지지력을 끝까지 유지합니다.',
          kind: 'neutral-zone',
          from: pt(20, 126),
          to: pt(245, 138),
          cautionKo: '팔·다리를 바닥에 쿵 떨어뜨리지 않습니다.',
        },
      ],
      directionVectors: [
        {
          id: 'vec-swim-prep-return',
          labelKo: '길이 유지 속 대각선 사지 제어 복귀',
          kind: 'return-control',
          points: [pt(20, 106), pt(20, 126)],
          phaseScope: 'middle-to-end',
        },
      ],
    }),
  },
  poseDeltaSummary: {
    startToMiddleKo:
      '지지측 손(36,146)·발(244,146)과 치골(144,144)을 매트에 고정한 채 가동측 오른손(22,146→20,106)과 왼발(246,146→245,127)이 수평 길이 우위로 부양합니다.',
    middleToEndKo:
      '골반 흔들림 없이 가동측 손(20,106→20,126)과 발(245,127→245,138)을 길게 뻗은 채 제어 하강합니다.',
    invariantAnchorsKo: '치골(144,144) 및 지지측 손(36,146)·발(228,146) 매트 고정',
    keyJointChangeKo: '오른팔(|dx|=66px > dy=27px)·왼다리(|dx|=95px > dy=17px) 대각선 교차 신장',
  },
  mobileSummaryBulletsKo: [
    '지지·고정: 치골(y=144) 및 지지측 반대 팔·다리 매트 밀착',
    '핵심 움직임: 반대쪽 팔·다리를 높이보다 수평 길이 우선으로 교차 부양',
    '주의 정렬: 골반 좌우 롤링·요추 처짐·시선 정면 꺾기 금지',
  ],
});

// 3) Mat Swimming Alternating (`extension-mat-swimming-alternating`)
const matSwimmingAlternatingSpec = createExtensionSpec({
  movementId: 'extension-mat-swimming-alternating',
  archetypeKey: 'swimming',
  isolatedArchetypeId:
    EXTENSION_DIAGRAM_AUDIT_RECORDS['extension-mat-swimming-alternating'].isolatedArchetypeId,
  family: 'swimming',
  supportSurface: 'mat',
  apparatus: 'mat',
  nameKo: '매트 스위밍 (대각선 사지 교차 플러터 Level 2)',
  nameEn: 'Mat Swimming (Reciprocal Contralateral Flutter)',
  archetypeTitleKo: '매트 스위밍 · 치골 매트 고정 및 대각선 A ↔ B 교차 왕복 플러터',
  isUnilateral: true,
  phases: {
    start: makePhase({
      phaseId: 'start',
      shortTitleKo: '치골 매트 고정 · 4사지 낮은 호버 신장 준비',
      summaryKo:
        '치골(144,144)과 복부를 매트 중심에 단단히 고정하고 양팔(22,118)과 양다리(245,134)를 바닥에서 살짝 띄워 앞·뒤로 길게 뻗습니다.',
      breathCueKo: '들숨 5카운트 준비: 흉곽 호흡을 유지하며 정수리부터 발끝까지 긴 축을 세팅합니다.',
      supportSurface: 'mat',
      family: 'swimming',
      supportSurfaceKo: '필라테스 매트 (치골 y=144 고정 · 사지 호버 준비)',
      joints: joints({
        head: pt(54, 120),
        neck: pt(70, 125),
        shoulder: pt(86, 132),
        elbow: pt(54, 124),
        wrist: pt(34, 120),
        hand: pt(22, 118),
        thoracic: pt(92, 132),
        lumbar: pt(118, 140),
        pelvis: pt(144, 144),
        hip: pt(150, 144),
        knee: pt(192, 138),
        ankle: pt(228, 135),
        heel: pt(235, 133),
        toe: pt(245, 134),
        farShoulder: pt(88, 134),
        farElbow: pt(56, 126),
        farWrist: pt(36, 122),
        farHip: pt(150, 144),
        farKnee: pt(190, 139),
        farAnkle: pt(226, 136),
        farToe: pt(243, 135),
      }),
      fixedAnchors: [
        { joint: 'pelvis', surfaceKo: '매트 치골·ASIS 고정 중심축 (144,144)', point: pt(144, 144) },
      ],
      movingJoints: ['hand', 'wrist', 'elbow', 'toe', 'ankle', 'knee', 'farWrist', 'farToe'],
      contactPoints: [
        { id: 'cp-swim-alt-start-pelvis', joint: 'pelvis', surface: 'mat', status: 'anchored', labelKo: '치골 중심 고정', point: pt(144, 144) },
        { id: 'cp-swim-alt-start-hand', joint: 'hand', surface: 'mat', status: 'hover-airborne', labelKo: '양팔 호버 신장', point: pt(22, 118) },
        { id: 'cp-swim-alt-start-toe', joint: 'toe', surface: 'mat', status: 'hover-airborne', labelKo: '양다리 호버 신장', point: pt(245, 134) },
      ],
      alignments: [
        {
          id: 'align-swim-alt-start-corridor',
          labelKo: '요추 중립 코리도 & 치골(144,144) 앵커',
          cueKo: '사지를 모두 띄워도 허리가 꺾이지 않도록 아랫배 지지력을 유지합니다.',
          kind: 'anchor-lock',
          from: pt(54, 120),
          to: pt(144, 144),
          cautionKo: '턱을 들어 정면을 보지 않고 매트 앞바닥을 바라봅니다.',
        },
      ],
      directionVectors: [
        {
          id: 'vec-swim-alt-start-reach',
          labelKo: '전·후방 수평 축성 신장 세팅',
          kind: 'axial-lengthening',
          points: [pt(86, 132), pt(22, 118)],
          phaseScope: 'start',
        },
      ],
    }),
    middle: makePhase({
      phaseId: 'middle',
      shortTitleKo: '대각선 A 플러터 정점 (오른팔·왼다리 상방 / 왼팔·오른다리 하방)',
      summaryKo:
        '치골(144,144)과 몸통 높이를 고정한 채 대각선 A(오른손 20,104 · 왼발 245,124)를 상방 호버로, 대각선 B(왼손 36,128 · 오른발 243,138)를 하방 호버로 교차합니다.',
      breathCueKo: '들숨 카운트: 어깨와 고관절에서 짧고 날렵하게 대각선 사지를 교차합니다.',
      supportSurface: 'mat',
      family: 'swimming',
      supportSurfaceKo: '필라테스 매트 (대각선 A 상방 · 몸통 중심 고정)',
      joints: joints({
        head: pt(54, 119),
        neck: pt(70, 124),
        shoulder: pt(86, 132),
        elbow: pt(54, 115),
        wrist: pt(32, 108),
        hand: pt(20, 104),
        thoracic: pt(92, 132),
        lumbar: pt(118, 140),
        pelvis: pt(144, 144),
        hip: pt(150, 144),
        knee: pt(192, 134),
        ankle: pt(228, 128),
        heel: pt(235, 126),
        toe: pt(245, 124),
        farShoulder: pt(88, 134),
        farElbow: pt(56, 130),
        farWrist: pt(36, 128),
        farHip: pt(150, 144),
        farKnee: pt(190, 141),
        farAnkle: pt(226, 139),
        farToe: pt(243, 138),
      }),
      fixedAnchors: [
        { joint: 'pelvis', surfaceKo: '매트 치골·ASIS 고정 중심축 (144,144)', point: pt(144, 144) },
      ],
      movingJoints: ['hand', 'wrist', 'elbow', 'toe', 'ankle', 'knee', 'farWrist', 'farToe'],
      contactPoints: [
        { id: 'cp-swim-alt-mid-pelvis', joint: 'pelvis', surface: 'mat', status: 'anchored', labelKo: '치골 중심 고정', point: pt(144, 144) },
        { id: 'cp-swim-alt-mid-hand', joint: 'hand', surface: 'mat', status: 'hover-airborne', labelKo: '대각선 A 오른팔 상방', point: pt(20, 104) },
        { id: 'cp-swim-alt-mid-toe', joint: 'toe', surface: 'mat', status: 'hover-airborne', labelKo: '대각선 A 왼다리 상방', point: pt(245, 124) },
      ],
      alignments: [
        {
          id: 'align-swim-alt-mid-diagonal-a',
          labelKo: '대각선 A (오른손 20,104 ↔ 왼발 245,124) 교차 리치선',
          cueKo: '무릎과 팔꿈치를 펴고 고관절·견갑관절에서 대각선으로 길게 교차합니다.',
          kind: 'axis-line',
          from: pt(20, 104),
          to: pt(245, 124),
          cautionKo: '사지 교차 시 골반이 좌우로 뒤뚱거리지 않게 합니다.',
        },
      ],
      directionVectors: [
        {
          id: 'vec-swim-alt-diagonal-a',
          labelKo: '대각선 A 상방 교차 플러터',
          kind: 'limb-excursion',
          points: [pt(22, 118), pt(20, 104)],
          phaseScope: 'start-to-middle',
        },
      ],
    }),
    end: makePhase({
      phaseId: 'end',
      shortTitleKo: '대각선 B 역교차 플러터 (왼팔·오른다리 상방 / 오른팔·왼다리 하방)',
      summaryKo:
        '몸통과 치골(144,144)은 흔들림 없이 그대로 유지한 채 대각선 B(왼손 34,106 · 오른발 243,124)가 올라가고 대각선 A(오른손 22,126 · 왼발 245,139)가 내려갑니다.',
      breathCueKo: '날숨 5카운트: 균일한 리듬으로 대각선 A↔B를 교차한 뒤 제어하며 내려옵니다.',
      supportSurface: 'mat',
      family: 'swimming',
      supportSurfaceKo: '필라테스 매트 (대각선 B 역교차 · 골반 고정 유지)',
      joints: joints({
        head: pt(54, 120),
        neck: pt(70, 125),
        shoulder: pt(86, 132),
        elbow: pt(54, 129),
        wrist: pt(34, 127),
        hand: pt(22, 126),
        thoracic: pt(92, 132),
        lumbar: pt(118, 140),
        pelvis: pt(144, 144),
        hip: pt(150, 144),
        knee: pt(192, 141),
        ankle: pt(228, 139),
        heel: pt(235, 138),
        toe: pt(245, 139),
        farShoulder: pt(88, 134),
        farElbow: pt(56, 116),
        farWrist: pt(34, 106),
        farHip: pt(150, 144),
        farKnee: pt(190, 134),
        farAnkle: pt(226, 128),
        farToe: pt(243, 124),
      }),
      fixedAnchors: [
        { joint: 'pelvis', surfaceKo: '매트 치골·ASIS 고정 중심축 (144,144)', point: pt(144, 144) },
      ],
      movingJoints: ['hand', 'wrist', 'elbow', 'toe', 'ankle', 'knee', 'farWrist', 'farToe'],
      contactPoints: [
        { id: 'cp-swim-alt-end-pelvis', joint: 'pelvis', surface: 'mat', status: 'anchored', labelKo: '치골 중심 고정', point: pt(144, 144) },
        { id: 'cp-swim-alt-end-far-wrist', joint: 'farWrist', surface: 'mat', status: 'hover-airborne', labelKo: '대각선 B 왼팔 상방', point: pt(34, 106) },
        { id: 'cp-swim-alt-end-far-toe', joint: 'farToe', surface: 'mat', status: 'hover-airborne', labelKo: '대각선 B 오른다리 상방', point: pt(243, 124) },
      ],
      alignments: [
        {
          id: 'align-swim-alt-end-diagonal-b',
          labelKo: '대각선 B (왼손 34,106 ↔ 오른발 243,124) 역교차 리치선',
          cueKo: '사지 위상이 반대로 바뀔 때도 척추 높이와 치골 지지점은 일정하게 유지됩니다.',
          kind: 'axis-line',
          from: pt(34, 106),
          to: pt(243, 124),
          cautionKo: '호흡을 참거나 종아리만 까딱거리지 않습니다.',
        },
      ],
      directionVectors: [
        {
          id: 'vec-swim-alt-diagonal-b',
          labelKo: '대각선 A↔B 역교차 왕복 플러터',
          kind: 'return-control',
          points: [pt(20, 104), pt(22, 126)],
          phaseScope: 'middle-to-end',
        },
      ],
    }),
  },
  poseDeltaSummary: {
    startToMiddleKo:
      '치골(144,144)과 흉추(92,132)를 고정한 상태에서 대각선 A(오른손 20,104·왼발 245,124)가 상방으로, 대각선 B(왼손 36,128·오른발 243,138)가 하방으로 분기합니다.',
    middleToEndKo:
      '몸통 흔들림 없이 대각선 B(왼손 34,106·오른발 243,124)가 상방으로, 대각선 A(오른손 22,126·왼발 245,139)가 하방으로 역교차합니다.',
    invariantAnchorsKo: '치골(144,144), 요추(118,140), 흉추(92,132) 몸통 코리도 고정',
    keyJointChangeKo: '대각선 A ↔ 대각선 B 사지 위상 반전(오른손 y:104↔126, 왼손 y:128↔106)',
  },
  mobileSummaryBulletsKo: [
    '지지·고정: 치골(144,144) 매트 앵커 및 요추 중립 코리도 유지',
    '핵심 움직임: 대각선 A(오른팔·왼다리) ↔ 대각선 B(왼팔·오른다리) 교차 플러터',
    '주의 정렬: 수평 신장(Length > Height) 유지 및 몸통 롤링 억제',
  ],
});

// 4) Reformer Long Box Swan Prep (`original-reformer-box-swan-prep`)
const reformerBoxSwanPrepSpec = createExtensionSpec({
  movementId: 'original-reformer-box-swan-prep',
  archetypeKey: 'prone-extension',
  isolatedArchetypeId:
    EXTENSION_DIAGRAM_AUDIT_RECORDS['original-reformer-box-swan-prep'].isolatedArchetypeId,
  family: 'swan',
  supportSurface: 'reformer-box',
  apparatus: 'reformer',
  nameKo: '리포머 롱박스 스완 준비 (박스 상판 지지 흉추 리치)',
  nameEn: 'Reformer Long Box Swan Prep',
  archetypeTitleKo: '리포머 롱박스 스완 준비 · 박스 상판(y=116) 치골 지지 및 순수 흉추 신전',
  isUnilateral: false,
  phases: {
    start: makePhase({
      phaseId: 'start',
      shortTitleKo: '롱박스 상판(y=116) 복와위 수평 정렬 · 가슴 앞모서리 세팅',
      summaryKo:
        '리포머 캐리지 위 롱박스 상판(y=116)에 치골(148,116)과 하체를 수평으로 안착시키고 박스 앞모서리 너머로 흉곽과 정수리(56,103)를 길게 정렬합니다.',
      breathCueKo: '들숨 준비: 치골을 박스 패드에 붙이고 정수리와 발끝을 양방향으로 늘입니다.',
      supportSurface: 'reformer-box',
      family: 'swan',
      carriageOffsetPx: 0,
      springTensionLevel: 'low',
      supportSurfaceKo: '리포머 롱박스 상판 (y=116 · 캐리지 정지 지지)',
      propPositionKo: '롱박스 (Long Box · 상판 높이 y=116)',
      joints: joints({
        head: pt(56, 103),
        neck: pt(72, 106),
        shoulder: pt(82, 109),
        elbow: pt(70, 120),
        wrist: pt(56, 118),
        hand: pt(46, 116),
        thoracic: pt(94, 110),
        lumbar: pt(122, 114),
        pelvis: pt(148, 116),
        hip: pt(154, 116),
        knee: pt(194, 117),
        ankle: pt(232, 118),
        heel: pt(238, 116),
        toe: pt(252, 120),
      }),
      fixedAnchors: [
        { joint: 'pelvis', surfaceKo: '리포머 롱박스 상판 치골 지지점 (148,116)', point: pt(148, 116) },
        { joint: 'hip', surfaceKo: '롱박스 상판 고관절 지지점 (154,116)', point: pt(154, 116) },
      ],
      movingJoints: ['head', 'neck', 'shoulder', 'thoracic', 'lumbar'],
      contactPoints: [
        { id: 'cp-rbox-start-pelvis', joint: 'pelvis', surface: 'reformer-box', status: 'anchored', labelKo: '롱박스 치골 고정(y=116)', point: pt(148, 116) },
        { id: 'cp-rbox-start-hand', joint: 'hand', surface: 'reformer-box', status: 'anchored', labelKo: '박스 전방 손 지지', point: pt(46, 116) },
      ],
      alignments: [
        {
          id: 'align-rbox-swan-start',
          labelKo: '롱박스 상판(y=116) 수평 골반-하체 지지선',
          cueKo: '가슴 아랫부분을 박스 앞모서리에 맞추고 두 다리를 길게 뻗어 균형을 잡습니다.',
          kind: 'anchor-lock',
          from: pt(94, 110),
          to: pt(232, 118),
          cautionKo: '어깨가 앞으로 말리거나 허리가 박스 위에서 꺾이지 않게 합니다.',
        },
      ],
      directionVectors: [
        {
          id: 'vec-rbox-swan-prep',
          labelKo: '박스 앞모서리 너머 축성 신장',
          kind: 'axial-lengthening',
          points: [pt(94, 110), pt(56, 103)],
          phaseScope: 'start',
        },
      ],
    }),
    middle: makePhase({
      phaseId: 'middle',
      shortTitleKo: '롱박스 치골 고정(y=116) · 상·중부 흉추 리치 신전',
      summaryKo:
        '치골(148,116)과 하체를 롱박스 상판에 단단히 고정한 채 복부 리프트와 함께 상부 흉추(96,96)와 정수리(58,71)를 앞·위로 길게 들어 올립니다.',
      breathCueKo: '들숨 또는 날숨: 쇄골을 넓히며 흉골을 전방 상단으로 확장합니다.',
      supportSurface: 'reformer-box',
      family: 'swan',
      carriageOffsetPx: 0,
      springTensionLevel: 'low',
      supportSurfaceKo: '리포머 롱박스 상판 (y=116 · 상부 흉추 신전 정점)',
      propPositionKo: '롱박스 (Long Box · 상판 높이 y=116)',
      joints: joints({
        head: pt(58, 71),
        neck: pt(74, 82),
        shoulder: pt(84, 89),
        elbow: pt(72, 108),
        wrist: pt(58, 114),
        hand: pt(48, 115),
        thoracic: pt(96, 96),
        lumbar: pt(122, 110),
        pelvis: pt(148, 116),
        hip: pt(154, 116),
        knee: pt(194, 117),
        ankle: pt(232, 118),
        heel: pt(238, 116),
        toe: pt(252, 120),
      }),
      fixedAnchors: [
        { joint: 'pelvis', surfaceKo: '리포머 롱박스 상판 치골 지지점 (148,116)', point: pt(148, 116) },
        { joint: 'hip', surfaceKo: '롱박스 상판 고관절 지지점 (154,116)', point: pt(154, 116) },
      ],
      movingJoints: ['head', 'neck', 'shoulder', 'thoracic', 'lumbar'],
      contactPoints: [
        { id: 'cp-rbox-mid-pelvis', joint: 'pelvis', surface: 'reformer-box', status: 'anchored', labelKo: '롱박스 치골 고정(y=116)', point: pt(148, 116) },
        { id: 'cp-rbox-mid-hand', joint: 'hand', surface: 'reformer-box', status: 'anchored', labelKo: '전방 가벼운 손 지지', point: pt(48, 115) },
      ],
      alignments: [
        {
          id: 'align-rbox-swan-mid',
          labelKo: '롱박스 치골(148,116)→흉추(96,96)→머리(58,71) 신전 아크',
          cueKo: '박스 모서리를 지렛대 삼아 윗등을 펴고 허리 과신전을 방지합니다.',
          kind: 'axis-line',
          from: pt(148, 116),
          to: pt(58, 71),
          cautionKo: '턱을 치켜들거나 다리가 들썩이지 않도록 합니다.',
        },
      ],
      directionVectors: [
        {
          id: 'vec-rbox-swan-lift',
          labelKo: '롱박스 위 상부 흉추 신전 상승',
          kind: 'spine-articulation',
          points: [pt(122, 110), pt(96, 96), pt(58, 71)],
          phaseScope: 'start-to-middle',
        },
      ],
    }),
    end: makePhase({
      phaseId: 'end',
      shortTitleKo: '롱박스 상판 지지 유지 · 축성 길이로 편심성 복귀',
      summaryKo:
        '치골(148,116) 지지를 유지하며 흉곽을 박스 앞모서리 쪽으로 길게 늘여 제어된 신전 호버(머리 56,89)로 복귀합니다.',
      breathCueKo: '날숨: 복부 지지력을 유지하며 윗등을 길게 펴서 돌아옵니다.',
      supportSurface: 'reformer-box',
      family: 'swan',
      carriageOffsetPx: 0,
      springTensionLevel: 'low',
      supportSurfaceKo: '리포머 롱박스 상판 (y=116 · 제어 복귀)',
      propPositionKo: '롱박스 (Long Box · 상판 높이 y=116)',
      joints: joints({
        head: pt(56, 89),
        neck: pt(73, 95),
        shoulder: pt(83, 100),
        elbow: pt(71, 115),
        wrist: pt(57, 116),
        hand: pt(47, 116),
        thoracic: pt(95, 103),
        lumbar: pt(122, 112),
        pelvis: pt(148, 116),
        hip: pt(154, 116),
        knee: pt(194, 117),
        ankle: pt(232, 118),
        heel: pt(238, 116),
        toe: pt(252, 120),
      }),
      fixedAnchors: [
        { joint: 'pelvis', surfaceKo: '리포머 롱박스 상판 치골 지지점 (148,116)', point: pt(148, 116) },
        { joint: 'hip', surfaceKo: '롱박스 상판 고관절 지지점 (154,116)', point: pt(154, 116) },
      ],
      movingJoints: ['head', 'neck', 'shoulder', 'thoracic', 'lumbar'],
      contactPoints: [
        { id: 'cp-rbox-end-pelvis', joint: 'pelvis', surface: 'reformer-box', status: 'anchored', labelKo: '롱박스 치골 고정(y=116)', point: pt(148, 116) },
      ],
      alignments: [
        {
          id: 'align-rbox-swan-end',
          labelKo: '롱박스 상판 편심성 복귀 정렬선',
          cueKo: '가슴이 박스 아래로 꺼지지 않도록 견갑대 지지를 유지합니다.',
          kind: 'neutral-zone',
          from: pt(148, 116),
          to: pt(56, 89),
          cautionKo: '복귀 시 어깨가 귀 쪽으로 말리지 않게 합니다.',
        },
      ],
      directionVectors: [
        {
          id: 'vec-rbox-swan-return',
          labelKo: '롱박스 위 편심성 제어 하강',
          kind: 'return-control',
          points: [pt(58, 71), pt(56, 89)],
          phaseScope: 'middle-to-end',
        },
      ],
    }),
  },
  poseDeltaSummary: {
    startToMiddleKo:
      '롱박스 상판(y=116)에 치골(148,116)과 하체를 고정한 채 흉추(94,110→96,96)와 머리(56,103→58,71)가 상승합니다.',
    middleToEndKo:
      '치골 고정과 복부 리프트를 유지하며 흉추(96,96→95,103)와 머리(58,71→56,89)가 편심성 제어로 복귀합니다.',
    invariantAnchorsKo: '롱박스 상판 위 치골(148,116)·고관절(154,116)·하체 수평 지지 고정',
    keyJointChangeKo: '매트 바닥(y=144)과 구별되는 롱박스 상판 높이(y=116) 기반 흉추 신전(Δ32px)',
  },
  mobileSummaryBulletsKo: [
    '지지·고정: 리포머 롱박스 상판(y=116) 치골·하체 수평 안착',
    '핵심 움직임: 스트랩 당김 없이 박스 앞모서리 너머 순수 흉추 리치 신전',
    '주의 정렬: 복부 리프트로 요추 보호 및 경추-흉추 연속 라인 유지',
  ],
});

// 5) Reformer Pulling Straps Swan (`ex-extension-01`)
const reformerPullingStrapsSpec = createExtensionSpec({
  movementId: 'ex-extension-01',
  archetypeKey: 'prone-extension',
  isolatedArchetypeId: EXTENSION_DIAGRAM_AUDIT_RECORDS['ex-extension-01'].isolatedArchetypeId,
  family: 'swan',
  supportSurface: 'reformer-box',
  apparatus: 'reformer',
  nameKo: '리포머 풀링 스트랩 (롱박스 스완 & 캐리지 활주)',
  nameEn: 'Reformer Pulling Straps I (Long Box Swan)',
  archetypeTitleKo: '리포머 풀링 스트랩 · 롱박스(y=116) 캐리지 +16px 동기 활주 및 후방 스트랩 견인 스완',
  isUnilateral: false,
  phases: {
    start: makePhase({
      phaseId: 'start',
      shortTitleKo: '롱박스 상판(y=116) 복와위 · 라이저 방향 스트랩 파지 준비',
      summaryKo:
        '롱박스 상판(148,116)에 치골을 고정하고 양손(38,130)으로 풋바/라이저 아래 스트랩을 잡은 채 척추를 수평 사선으로 길게 준비합니다.',
      breathCueKo: '들숨 준비: 견갑골을 넓게 펴고 아랫배를 가볍게 들어 올려 요추를 보호합니다.',
      supportSurface: 'reformer-box',
      family: 'swan',
      carriageOffsetPx: 0,
      springTensionLevel: 'medium',
      supportSurfaceKo: '리포머 롱박스 상판 (y=116 · 캐리지 홈 포지션 0px)',
      propPositionKo: '롱박스 + 풀링 스트랩 (Long Box & Riser Straps)',
      joints: joints({
        head: pt(56, 109),
        neck: pt(72, 111),
        shoulder: pt(82, 113),
        elbow: pt(64, 124),
        wrist: pt(48, 128),
        hand: pt(38, 130),
        thoracic: pt(94, 113),
        lumbar: pt(122, 115),
        pelvis: pt(148, 116),
        hip: pt(154, 116),
        knee: pt(194, 117),
        ankle: pt(232, 118),
        heel: pt(238, 116),
        toe: pt(252, 120),
      }),
      fixedAnchors: [
        { joint: 'pelvis', surfaceKo: '롱박스 상판 치골 고정점 (148,116)', point: pt(148, 116) },
      ],
      movingJoints: ['head', 'neck', 'shoulder', 'elbow', 'wrist', 'hand', 'thoracic', 'lumbar', 'pelvis'],
      contactPoints: [
        { id: 'cp-pull-start-pelvis', joint: 'pelvis', surface: 'reformer-box', status: 'gliding-support', labelKo: '롱박스 치골 밀착(148,116)', point: pt(148, 116) },
        { id: 'cp-pull-start-hand', joint: 'hand', surface: 'reformer-box', status: 'hover-airborne', labelKo: '전방 스트랩 파지(38,130)', point: pt(38, 130) },
      ],
      alignments: [
        {
          id: 'align-pull-start',
          labelKo: '롱박스 상판(y=116) 수평 준비선',
          cueKo: '손목이 꺾이지 않게 스트랩과 전완을 일직선으로 연결합니다.',
          kind: 'anchor-lock',
          from: pt(56, 109),
          to: pt(232, 118),
          cautionKo: '당기기 전 어깨가 앞으로 쏟리지 않게 견갑대를 안정화합니다.',
        },
      ],
      directionVectors: [
        {
          id: 'vec-pull-start-strap',
          labelKo: '스트랩 후방 견인 준비 궤적',
          kind: 'spring-resistance',
          points: [pt(38, 130), pt(82, 113)],
          phaseScope: 'start',
        },
      ],
    }),
    middle: makePhase({
      phaseId: 'middle',
      shortTitleKo: '스트랩 골반 옆 견인 · 캐리지 +16px 활주(pelvis 164,116) & 흉추 신전',
      summaryKo:
        '양팔이 스트랩을 골반 옆(162,114)으로 길게 당기며 캐리지와 롱박스가 +16px 활주(치골 164,116)하고 상·중부 흉추(112,95)가 신전됩니다.',
      breathCueKo: '날숨 또는 들숨: 광배근과 상부 등 근육으로 스트랩을 당기며 가슴을 앞·위로 엽니다.',
      supportSurface: 'reformer-box',
      family: 'swan',
      carriageOffsetPx: 16,
      springTensionLevel: 'high',
      supportSurfaceKo: '리포머 롱박스 상판 (y=116 · 캐리지 +16px 활주 동기화)',
      propPositionKo: '롱박스 + 풀링 스트랩 후방 견인',
      joints: joints({
        head: pt(74, 70),
        neck: pt(90, 81),
        shoulder: pt(100, 88),
        elbow: pt(126, 102),
        wrist: pt(148, 110),
        hand: pt(162, 114),
        thoracic: pt(112, 95),
        lumbar: pt(138, 109),
        pelvis: pt(164, 116),
        hip: pt(170, 116),
        knee: pt(210, 117),
        ankle: pt(248, 118),
        heel: pt(254, 116),
        toe: pt(268, 120),
      }),
      fixedAnchors: [
        { joint: 'pelvis', surfaceKo: '롱박스 상판 치골 동기 활주점 (164,116)', point: pt(164, 116) },
      ],
      movingJoints: ['head', 'neck', 'shoulder', 'elbow', 'wrist', 'hand', 'thoracic', 'lumbar', 'pelvis'],
      contactPoints: [
        { id: 'cp-pull-mid-pelvis', joint: 'pelvis', surface: 'reformer-box', status: 'gliding-support', labelKo: '캐리지 +16px 동기 치골(164,116)', point: pt(164, 116) },
        { id: 'cp-pull-mid-hand', joint: 'hand', surface: 'reformer-box', status: 'hover-airborne', labelKo: '골반 옆 스트랩 견인(162,114)', point: pt(162, 114) },
      ],
      alignments: [
        {
          id: 'align-pull-mid-arc',
          labelKo: '활주된 치골(164,116)→흉추(112,95)→정수리(74,70) 스완 아크',
          cueKo: '손끝을 뒤쪽 발끝 방향으로 길게 뻗으며 쇄골을 넓힙니다.',
          kind: 'axis-line',
          from: pt(164, 116),
          to: pt(74, 70),
          cautionKo: '요추를 꺾거나 턱을 들어 높이를 보상하지 않습니다.',
        },
      ],
      directionVectors: [
        {
          id: 'vec-pull-mid-carriage',
          labelKo: '캐리지·롱박스 +16px 동기 활주 (148→164)',
          kind: 'carriage-travel',
          points: [pt(148, 116), pt(164, 116)],
          phaseScope: 'start-to-middle',
        },
        {
          id: 'vec-pull-mid-arms',
          labelKo: '스트랩 후방 아크 스윕 (38,130→162,114)',
          kind: 'limb-excursion',
          points: [pt(38, 130), pt(100, 120), pt(162, 114)],
          phaseScope: 'start-to-middle',
        },
      ],
    }),
    end: makePhase({
      phaseId: 'end',
      shortTitleKo: '스프링 저항 제어 · 캐리지 복귀(+4px) 및 흉추 편심성 하강',
      summaryKo:
        '스프링에 끌려가지 않도록 광배근과 복부 제어력을 유지하며 캐리지(치골 152,116)와 양손(60,124), 흉추(98,106)를 천천히 복귀합니다.',
      breathCueKo: '날숨: 정수리를 앞벽으로 길게 유지하며 스트랩과 캐리지를 컨트롤하여 되돌립니다.',
      supportSurface: 'reformer-box',
      family: 'swan',
      carriageOffsetPx: 4,
      springTensionLevel: 'medium',
      supportSurfaceKo: '리포머 롱박스 상판 (y=116 · 캐리지 편심성 복귀 +4px)',
      propPositionKo: '롱박스 + 풀링 스트랩 제어 복귀',
      joints: joints({
        head: pt(60, 95),
        neck: pt(76, 100),
        shoulder: pt(86, 104),
        elbow: pt(84, 116),
        wrist: pt(72, 122),
        hand: pt(60, 124),
        thoracic: pt(98, 106),
        lumbar: pt(126, 113),
        pelvis: pt(152, 116),
        hip: pt(158, 116),
        knee: pt(198, 117),
        ankle: pt(236, 118),
        heel: pt(242, 116),
        toe: pt(256, 120),
      }),
      fixedAnchors: [
        { joint: 'pelvis', surfaceKo: '롱박스 상판 치골 동기 복귀점 (152,116)', point: pt(152, 116) },
      ],
      movingJoints: ['head', 'neck', 'shoulder', 'elbow', 'wrist', 'hand', 'thoracic', 'lumbar', 'pelvis'],
      contactPoints: [
        { id: 'cp-pull-end-pelvis', joint: 'pelvis', surface: 'reformer-box', status: 'gliding-support', labelKo: '롱박스 치골 지지(152,116)', point: pt(152, 116) },
        { id: 'cp-pull-end-hand', joint: 'hand', surface: 'reformer-box', status: 'hover-airborne', labelKo: '스트랩 제어 복귀(60,124)', point: pt(60, 124) },
      ],
      alignments: [
        {
          id: 'align-pull-end-control',
          labelKo: '스프링 저항 속 경추-흉추 신장 복귀선',
          cueKo: '팔이 앞으로 돌아올 때 가슴이 갑자기 떨어지지 않도록 윗등으로 버팁니다.',
          kind: 'neutral-zone',
          from: pt(152, 116),
          to: pt(60, 95),
          cautionKo: '스프링 장력에 어깨가 끌려가지 않도록 주의합니다.',
        },
      ],
      directionVectors: [
        {
          id: 'vec-pull-end-return',
          labelKo: '스트랩 및 캐리지 편심성 제어 복귀',
          kind: 'return-control',
          points: [pt(162, 114), pt(60, 124)],
          phaseScope: 'middle-to-end',
        },
      ],
    }),
  },
  poseDeltaSummary: {
    startToMiddleKo:
      '양손이 스트랩을 골반 옆(38,130→162,114)으로 당기며 캐리지·롱박스와 함께 치골이 수평 이동(148,116→164,116)하고 상부 흉추(94,113→112,95)가 신전됩니다.',
    middleToEndKo:
      '스프링 저항을 제어하며 캐리지(치골 164,116→152,116)와 스트랩(162,114→60,124), 상체(머리 74,70→60,95)가 편심성 복귀합니다.',
    invariantAnchorsKo: '롱박스 상판 높이(pelvis.y = 116) 고정 및 캐리지 오프셋-골반 X좌표 1:1 동기화',
    keyJointChangeKo: '스트랩 후방 견인(Δx=+124px), 캐리지 동기 활주(+16px), 상부 흉추 아크 상승',
  },
  mobileSummaryBulletsKo: [
    '지지·고정: 리포머 롱박스 상판(y=116) 치골 밀착 + 캐리지 동기 활주(+16px)',
    '핵심 움직임: 스트랩 후방 견인(광배근)과 상·중부 흉추 신전의 동시 협응',
    '주의 정렬: 복귀 시 스프링에 어깨가 끌려가거나 요추가 무너지지 않게 제어',
  ],
});

// 6) Cadillac Prone Back Reach (`original-cadillac-prone-back-reach`)
const cadillacProneBackReachSpec = createExtensionSpec({
  movementId: 'original-cadillac-prone-back-reach',
  archetypeKey: 'prone-extension',
  isolatedArchetypeId:
    EXTENSION_DIAGRAM_AUDIT_RECORDS['original-cadillac-prone-back-reach'].isolatedArchetypeId,
  family: 'swan',
  supportSurface: 'cadillac-table',
  apparatus: 'cadillac',
  nameKo: '캐딜락 복와위 백 리치 (고정 테이블 스완 준비)',
  nameEn: 'Cadillac Prone Back Reach (Table Swan Prep)',
  archetypeTitleKo: '캐딜락 테이블(y=142) 고정 지지 및 전방 프레임/바 리치 흉추 신전',
  isUnilateral: false,
  phases: {
    start: makePhase({
      phaseId: 'start',
      shortTitleKo: '캐딜락 고정 베드(y=142) 복와위 · 전방 바/업라이트 리치 세팅',
      summaryKo:
        '고정된 캐딜락 테이블(y=142)에 치골(146,142)과 두 다리(230,143)를 밀착하고 양손(36,102)을 전방 타워 바 방향으로 길게 뻗어 견갑대를 정리합니다.',
      breathCueKo: '들숨 준비: 견갑골을 하강시키며 정수리와 발끝을 양방향으로 길게 늘입니다.',
      supportSurface: 'cadillac-table',
      family: 'swan',
      carriageOffsetPx: 0,
      springTensionLevel: 'low',
      supportSurfaceKo: '캐딜락 고정 테이블 베드 (y=142 · carriageOffsetPx=0)',
      propPositionKo: '캐딜락 푸시쓰루 바 전방 지지',
      joints: joints({
        head: pt(54, 129),
        neck: pt(70, 132),
        shoulder: pt(80, 134),
        elbow: pt(62, 122),
        wrist: pt(46, 110),
        hand: pt(36, 102),
        thoracic: pt(92, 136),
        lumbar: pt(120, 140),
        pelvis: pt(146, 142),
        hip: pt(152, 142),
        knee: pt(192, 143),
        ankle: pt(230, 143),
        heel: pt(236, 140),
        toe: pt(250, 144),
      }),
      fixedAnchors: [
        { joint: 'pelvis', surfaceKo: '캐딜락 베드 치골 고정점 (146,142)', point: pt(146, 142) },
        { joint: 'ankle', surfaceKo: '캐딜락 베드 발목 지지점 (230,143)', point: pt(230, 143) },
      ],
      movingJoints: ['head', 'neck', 'shoulder', 'elbow', 'wrist', 'hand', 'thoracic', 'lumbar'],
      contactPoints: [
        { id: 'cp-cad-start-pelvis', joint: 'pelvis', surface: 'cadillac-table', status: 'anchored', labelKo: '캐딜락 베드 치골 고정(y=142)', point: pt(146, 142) },
        { id: 'cp-cad-start-ankle', joint: 'ankle', surface: 'cadillac-table', status: 'anchored', labelKo: '하체 베드 고정', point: pt(230, 143) },
        { id: 'cp-cad-start-hand', joint: 'hand', surface: 'cadillac-table', status: 'gliding-support', labelKo: '전방 바 리치 지지', point: pt(36, 102) },
      ],
      alignments: [
        {
          id: 'align-cad-swan-start',
          labelKo: '캐딜락 베드(y=142) 수평 골반-하체 고정선',
          cueKo: '고정된 테이블 위에서 골반과 두 다리를 길게 뻗어 하체 앵커를 만듭니다.',
          kind: 'anchor-lock',
          from: pt(92, 136),
          to: pt(230, 143),
          cautionKo: '어깨가 귀로 끌려 올라가지 않도록 광배근을 연결합니다.',
        },
      ],
      directionVectors: [
        {
          id: 'vec-cad-swan-prep',
          labelKo: '전방 프레임 방향 축성 리치',
          kind: 'axial-lengthening',
          points: [pt(80, 134), pt(36, 102)],
          phaseScope: 'start',
        },
      ],
    }),
    middle: makePhase({
      phaseId: 'middle',
      shortTitleKo: '캐딜락 베드 치골 고정(y=142) · 전방 상단 리치 & 흉추 신전',
      summaryKo:
        '치골(146,142)을 캐딜락 테이블에 고정한 채 양팔을 전방 상단 바(38,72)로 길게 밀어내며 상·중부 흉추(94,120)를 부드러운 아크로 신전합니다.',
      breathCueKo: '들숨: 복부 리프트를 유지하며 가슴을 앞·위로 넓게 열어 올립니다.',
      supportSurface: 'cadillac-table',
      family: 'swan',
      carriageOffsetPx: 0,
      springTensionLevel: 'low',
      supportSurfaceKo: '캐딜락 고정 테이블 베드 (y=142 · 상부 흉추 신전 아크)',
      propPositionKo: '캐딜락 푸시쓰루 바 상방 리치',
      joints: joints({
        head: pt(56, 92),
        neck: pt(72, 104),
        shoulder: pt(82, 112),
        elbow: pt(64, 96),
        wrist: pt(48, 82),
        hand: pt(38, 72),
        thoracic: pt(94, 120),
        lumbar: pt(120, 135),
        pelvis: pt(146, 142),
        hip: pt(152, 142),
        knee: pt(192, 143),
        ankle: pt(230, 143),
        heel: pt(236, 140),
        toe: pt(250, 144),
      }),
      fixedAnchors: [
        { joint: 'pelvis', surfaceKo: '캐딜락 베드 치골 고정점 (146,142)', point: pt(146, 142) },
        { joint: 'ankle', surfaceKo: '캐딜락 베드 발목 지지점 (230,143)', point: pt(230, 143) },
      ],
      movingJoints: ['head', 'neck', 'shoulder', 'elbow', 'wrist', 'hand', 'thoracic', 'lumbar'],
      contactPoints: [
        { id: 'cp-cad-mid-pelvis', joint: 'pelvis', surface: 'cadillac-table', status: 'anchored', labelKo: '캐딜락 베드 치골 고정(y=142)', point: pt(146, 142) },
        { id: 'cp-cad-mid-ankle', joint: 'ankle', surface: 'cadillac-table', status: 'anchored', labelKo: '하체 베드 고정', point: pt(230, 143) },
        { id: 'cp-cad-mid-hand', joint: 'hand', surface: 'cadillac-table', status: 'gliding-support', labelKo: '전방 상단 바 리치(38,72)', point: pt(38, 72) },
      ],
      alignments: [
        {
          id: 'align-cad-swan-mid',
          labelKo: '캐딜락 치골(146,142)→흉추(94,120)→머리(56,92) 연속 신전선',
          cueKo: '뒷목을 길게 유지하고 상부 흉추에서 신전 아크를 만듭니다.',
          kind: 'axis-line',
          from: pt(146, 142),
          to: pt(56, 92),
          cautionKo: '허리를 과신전하거나 턱을 들지 않습니다.',
        },
      ],
      directionVectors: [
        {
          id: 'vec-cad-swan-lift',
          labelKo: '전방 바 리치 및 상부 흉추 신전 상승',
          kind: 'spine-articulation',
          points: [pt(120, 135), pt(94, 120), pt(56, 92)],
          phaseScope: 'start-to-middle',
        },
      ],
    }),
    end: makePhase({
      phaseId: 'end',
      shortTitleKo: '캐딜락 베드 지지 · 복부 리프트 유지하며 편심성 복귀',
      summaryKo:
        '치골(146,142)과 두 다리 고정을 유지한 채 아래 갈비뼈부터 베드 쪽으로 길게 늘이며 제어 하강(머리 55,115 · 손 37,90)합니다.',
      breathCueKo: '날숨: 손끝을 앞으로 더 멀리 뻗으며 척추를 순차적으로 내려놓습니다.',
      supportSurface: 'cadillac-table',
      family: 'swan',
      carriageOffsetPx: 0,
      springTensionLevel: 'low',
      supportSurfaceKo: '캐딜락 고정 테이블 베드 (y=142 · 편심성 복귀)',
      propPositionKo: '캐딜락 푸시쓰루 바 제어 복귀',
      joints: joints({
        head: pt(55, 115),
        neck: pt(71, 121),
        shoulder: pt(81, 125),
        elbow: pt(63, 112),
        wrist: pt(47, 98),
        hand: pt(37, 90),
        thoracic: pt(93, 129),
        lumbar: pt(120, 138),
        pelvis: pt(146, 142),
        hip: pt(152, 142),
        knee: pt(192, 143),
        ankle: pt(230, 143),
        heel: pt(236, 140),
        toe: pt(250, 144),
      }),
      fixedAnchors: [
        { joint: 'pelvis', surfaceKo: '캐딜락 베드 치골 고정점 (146,142)', point: pt(146, 142) },
        { joint: 'ankle', surfaceKo: '캐딜락 베드 발목 지지점 (230,143)', point: pt(230, 143) },
      ],
      movingJoints: ['head', 'neck', 'shoulder', 'elbow', 'wrist', 'hand', 'thoracic', 'lumbar'],
      contactPoints: [
        { id: 'cp-cad-end-pelvis', joint: 'pelvis', surface: 'cadillac-table', status: 'anchored', labelKo: '캐딜락 베드 치골 고정(y=142)', point: pt(146, 142) },
      ],
      alignments: [
        {
          id: 'align-cad-swan-end',
          labelKo: '캐딜락 베드 편심성 신장 복귀선',
          cueKo: '내려오는 내내 복횡근 지지로 요추 길이를 유지합니다.',
          kind: 'neutral-zone',
          from: pt(146, 142),
          to: pt(55, 115),
          cautionKo: '견갑골 안정화를 놓치지 않습니다.',
        },
      ],
      directionVectors: [
        {
          id: 'vec-cad-swan-return',
          labelKo: '전방 리치 유지 속 편심성 하강',
          kind: 'return-control',
          points: [pt(56, 92), pt(55, 115)],
          phaseScope: 'middle-to-end',
        },
      ],
    }),
  },
  poseDeltaSummary: {
    startToMiddleKo:
      '고정된 캐딜락 테이블(y=142) 위에서 치골(146,142)과 하체를 고정한 채 전방 리치(손 36,102→38,72)와 함께 흉추(92,136→94,120)가 상승합니다.',
    middleToEndKo:
      '치골 고정을 유지하며 아래 흉곽부터 베드 방향으로 길게 편심성 복귀(머리 56,92→55,115)합니다.',
    invariantAnchorsKo: '캐딜락 테이블 베드 위 치골(146,142)·하체(230,143) 및 carriageOffsetPx=0 고정',
    keyJointChangeKo: '리포머 후방 스트랩 스윕 없이 전방 바 리치 기반 상·중부 흉추 신전(Δ37px)',
  },
  mobileSummaryBulletsKo: [
    '지지·고정: 캐딜락 고정 테이블(y=142, 캐리지 이동 0) 치골·두 다리 밀착',
    '핵심 움직임: 전방 프레임/바 방향 축성 리치와 상부 흉추 신전',
    '주의 정렬: 복부 리프트로 요추 보호 및 견갑 하강 안정 유지',
  ],
});

// 7) Ladder Barrel Supported Swan (`original-barrel-supported-swan`)
const barrelSupportedSwanSpec = createExtensionSpec({
  movementId: 'original-barrel-supported-swan',
  archetypeKey: 'prone-extension',
  isolatedArchetypeId:
    EXTENSION_DIAGRAM_AUDIT_RECORDS['original-barrel-supported-swan'].isolatedArchetypeId,
  family: 'swan',
  supportSurface: 'ladder-barrel',
  apparatus: 'barrel',
  nameKo: '래더 바렐 서포티드 스완 준비 (바렐 정점 지지 흉추 신전)',
  nameEn: 'Ladder Barrel Supported Swan Prep',
  archetypeTitleKo: '래더 바렐 정점(132,104) 치골 지지 + 래더 가로대(228,132) 발 고정 스완 준비',
  isUnilateral: false,
  phases: {
    start: makePhase({
      phaseId: 'start',
      shortTitleKo: '바렐 정점(132,104) 골반 안착 · 래더 가로대(228,132) 양발 고정',
      summaryKo:
        '바렐 돔 정점(132,104)에 골반과 치골을 지지하고 래더 가로대(228,132)에 양발 아치를 고정한 채 바렐 앞쪽 곡면 위로 몸통을 길게 정렬합니다.',
      breathCueKo: '들숨 준비: 뒤꿈치부터 정수리까지 사선 축을 길게 연결합니다.',
      supportSurface: 'ladder-barrel',
      family: 'swan',
      carriageOffsetPx: 0,
      springTensionLevel: 'none',
      supportSurfaceKo: '래더 바렐 돔 정점 (x=132, y=104) + 래더 가로대 발 고정 (228,132)',
      joints: joints({
        head: pt(42, 91),
        neck: pt(58, 94),
        shoulder: pt(70, 97),
        elbow: pt(76, 112),
        wrist: pt(84, 116),
        hand: pt(90, 114),
        thoracic: pt(80, 98),
        lumbar: pt(106, 102),
        pelvis: pt(132, 104),
        hip: pt(140, 106),
        knee: pt(184, 118),
        ankle: pt(228, 132),
        heel: pt(236, 130),
        toe: pt(234, 138),
      }),
      fixedAnchors: [
        { joint: 'pelvis', surfaceKo: '바렐 돔 정점 치골 지지점 (132,104)', point: pt(132, 104) },
        { joint: 'ankle', surfaceKo: '래더 가로대 양발 고정점 (228,132)', point: pt(228, 132) },
      ],
      movingJoints: ['head', 'neck', 'shoulder', 'elbow', 'wrist', 'hand', 'thoracic', 'lumbar'],
      contactPoints: [
        { id: 'cp-bswan-start-pelvis', joint: 'pelvis', surface: 'ladder-barrel', status: 'anchored', labelKo: '바렐 정점 치골 지지(132,104)', point: pt(132, 104) },
        { id: 'cp-bswan-start-ankle', joint: 'ankle', surface: 'ladder-barrel', status: 'anchored', labelKo: '래더 가로대 발 고정(228,132)', point: pt(228, 132) },
        { id: 'cp-bswan-start-hand', joint: 'hand', surface: 'ladder-barrel', status: 'anchored', labelKo: '바렐 전면 손 지지', point: pt(90, 114) },
      ],
      alignments: [
        {
          id: 'align-bswan-start',
          labelKo: '래더 가로대(228,132)-바렐 정점(132,104)-정수리(42,91) 사선 지지선',
          cueKo: '둔근과 햄스트링으로 하체 지지를 유지하고 바렐에 배를 힘을 빼고 걸치지 않습니다.',
          kind: 'anchor-lock',
          from: pt(228, 132),
          to: pt(42, 91),
          cautionKo: '무릎을 과신전하거나 허리를 바렐 위에서 꺾지 않습니다.',
        },
      ],
      directionVectors: [
        {
          id: 'vec-bswan-prep',
          labelKo: '바렐 정점 위 전방 축성 신장',
          kind: 'axial-lengthening',
          points: [pt(132, 104), pt(42, 91)],
          phaseScope: 'start',
        },
      ],
    }),
    middle: makePhase({
      phaseId: 'middle',
      shortTitleKo: '바렐 정점(132,104) 치골 지지 · 상부 흉추 서포티드 신전',
      summaryKo:
        '래더 가로대 발 고정(228,132)과 바렐 정점 치골 지지(132,104)를 유지한 채 흉추(82,82)와 머리(46,54)를 긴 아크로 들어 올립니다.',
      breathCueKo: '들숨 또는 날숨: 복부를 바렐에서 가볍게 들어 올리며 흉골을 전방 상단으로 확장합니다.',
      supportSurface: 'ladder-barrel',
      family: 'swan',
      carriageOffsetPx: 0,
      springTensionLevel: 'none',
      supportSurfaceKo: '래더 바렐 돔 정점 (132,104 지지 · 서포티드 흉추 신전)',
      joints: joints({
        head: pt(46, 54),
        neck: pt(62, 66),
        shoulder: pt(72, 74),
        elbow: pt(56, 70),
        wrist: pt(42, 64),
        hand: pt(32, 60),
        thoracic: pt(82, 82),
        lumbar: pt(106, 97),
        pelvis: pt(132, 104),
        hip: pt(140, 106),
        knee: pt(184, 118),
        ankle: pt(228, 132),
        heel: pt(236, 130),
        toe: pt(234, 138),
      }),
      fixedAnchors: [
        { joint: 'pelvis', surfaceKo: '바렐 돔 정점 치골 지지점 (132,104)', point: pt(132, 104) },
        { joint: 'ankle', surfaceKo: '래더 가로대 양발 고정점 (228,132)', point: pt(228, 132) },
      ],
      movingJoints: ['head', 'neck', 'shoulder', 'elbow', 'wrist', 'hand', 'thoracic', 'lumbar'],
      contactPoints: [
        { id: 'cp-bswan-mid-pelvis', joint: 'pelvis', surface: 'ladder-barrel', status: 'anchored', labelKo: '바렐 정점 치골 지지(132,104)', point: pt(132, 104) },
        { id: 'cp-bswan-mid-ankle', joint: 'ankle', surface: 'ladder-barrel', status: 'anchored', labelKo: '래더 가로대 발 고정(228,132)', point: pt(228, 132) },
      ],
      alignments: [
        {
          id: 'align-bswan-mid',
          labelKo: '바렐 정점(132,104)→흉추(82,82)→정수리(46,54) 아크',
          cueKo: '요추로만 꺾어 올라오지 않고 정수리를 앞·위로 길게 뽑아냅니다.',
          kind: 'axis-line',
          from: pt(132, 104),
          to: pt(46, 54),
          cautionKo: '고개를 뒤로 젖혀 경추를 압박하지 않습니다.',
        },
      ],
      directionVectors: [
        {
          id: 'vec-bswan-lift',
          labelKo: '바렐 지지 기반 상·중부 흉추 신전 상승',
          kind: 'spine-articulation',
          points: [pt(106, 97), pt(82, 82), pt(46, 54)],
          phaseScope: 'start-to-middle',
        },
      ],
    }),
    end: makePhase({
      phaseId: 'end',
      shortTitleKo: '바렐 곡면을 따른 편심성 복귀 · 하체 래더 지지 유지',
      summaryKo:
        '래더 발 고정(228,132)과 치골 지지(132,104)를 유지하며 바렐 곡면을 따라 긴 사선 호버(머리 43,78)로 제어 복귀합니다.',
      breathCueKo: '날숨: 복부부터 바렐 곡면에 길게 감싸듯 내려옵니다.',
      supportSurface: 'ladder-barrel',
      family: 'swan',
      carriageOffsetPx: 0,
      springTensionLevel: 'none',
      supportSurfaceKo: '래더 바렐 돔 정점 (132,104 · 바렐 곡면 편심성 복귀)',
      joints: joints({
        head: pt(43, 78),
        neck: pt(59, 84),
        shoulder: pt(70, 88),
        elbow: pt(72, 102),
        wrist: pt(78, 108),
        hand: pt(84, 108),
        thoracic: pt(80, 92),
        lumbar: pt(106, 100),
        pelvis: pt(132, 104),
        hip: pt(140, 106),
        knee: pt(184, 118),
        ankle: pt(228, 132),
        heel: pt(236, 130),
        toe: pt(234, 138),
      }),
      fixedAnchors: [
        { joint: 'pelvis', surfaceKo: '바렐 돔 정점 치골 지지점 (132,104)', point: pt(132, 104) },
        { joint: 'ankle', surfaceKo: '래더 가로대 양발 고정점 (228,132)', point: pt(228, 132) },
      ],
      movingJoints: ['head', 'neck', 'shoulder', 'elbow', 'wrist', 'hand', 'thoracic', 'lumbar'],
      contactPoints: [
        { id: 'cp-bswan-end-pelvis', joint: 'pelvis', surface: 'ladder-barrel', status: 'anchored', labelKo: '바렐 정점 치골 지지(132,104)', point: pt(132, 104) },
        { id: 'cp-bswan-end-ankle', joint: 'ankle', surface: 'ladder-barrel', status: 'anchored', labelKo: '래더 가로대 발 고정(228,132)', point: pt(228, 132) },
      ],
      alignments: [
        {
          id: 'align-bswan-end',
          labelKo: '바렐 곡면 편심성 복귀 정렬선',
          cueKo: '마지막까지 둔근·복부 연결을 유지하며 사선 중립으로 돌아옵니다.',
          kind: 'neutral-zone',
          from: pt(132, 104),
          to: pt(43, 78),
          cautionKo: '바렐 위로 상체를 힘없이 떨어뜨리지 않습니다.',
        },
      ],
      directionVectors: [
        {
          id: 'vec-bswan-return',
          labelKo: '바렐 곡면을 따른 편심성 제어 하강',
          kind: 'return-control',
          points: [pt(46, 54), pt(43, 78)],
          phaseScope: 'middle-to-end',
        },
      ],
    }),
  },
  poseDeltaSummary: {
    startToMiddleKo:
      '바렐 정점(132,104) 치골 지지와 래더 가로대(228,132) 발 고정 위에서 흉추(80,98→82,82)와 머리(42,91→46,54)가 상승합니다.',
    middleToEndKo:
      '하체 래더 지지와 치골 앵커를 유지하며 바렐 곡면을 따라 편심성 복귀(머리 46,54→43,78)합니다.',
    invariantAnchorsKo: '바렐 돔 정점 치골(132,104) 및 래더 가로대 발목(228,132)·발끝(234,138) 고정',
    keyJointChangeKo: '바렐 곡면(y=104) 위 상·중부 흉추 아크 상승(Δ37px) 및 하체 사선 고정',
  },
  mobileSummaryBulletsKo: [
    '지지·고정: 바렐 돔 정점(132,104) 치골 안착 + 래더 가로대(228,132) 발 고정',
    '핵심 움직임: 하체-둔근 사선 지지를 바탕으로 상·중부 흉추 분절 신전',
    '주의 정렬: 바렐 정점에서 요추만 꺾지 않고 긴 아크(Long Arc) 유지',
  ],
});

// 8) Ladder Barrel Full Swan Extension (`ex-extension-02`)
const barrelFullSwanSpec = createExtensionSpec({
  movementId: 'ex-extension-02',
  archetypeKey: 'prone-extension',
  isolatedArchetypeId: EXTENSION_DIAGRAM_AUDIT_RECORDS['ex-extension-02'].isolatedArchetypeId,
  family: 'swan',
  supportSurface: 'ladder-barrel',
  apparatus: 'barrel',
  nameKo: '래더 바렐 풀 스완 익스텐션 (오버헤드 V-리치 롱 아크)',
  nameEn: 'Ladder Barrel Full Swan Extension',
  archetypeTitleKo: '래더 바렐 정점(132,104) 지지 + 오버헤드 V-리치 풀 스완 익스텐션 아크',
  isUnilateral: false,
  phases: {
    start: makePhase({
      phaseId: 'start',
      shortTitleKo: '래더 가로대(228,132) 발 고정 · 바렐 정점(132,104) 사선 중립 리치',
      summaryKo:
        '래더 가로대(228,132)에 양발을 고정하고 바렐 돔 정점(132,104)에 골반을 지지한 채 양팔(24,80)과 정수리(42,84)를 전방 사선으로 길게 뻗습니다.',
      breathCueKo: '들숨 준비: 발바닥부터 손끝까지 긴 대각선 다트(Dart) 라인을 세팅합니다.',
      supportSurface: 'ladder-barrel',
      family: 'swan',
      carriageOffsetPx: 0,
      springTensionLevel: 'none',
      supportSurfaceKo: '래더 바렐 돔 정점 (132,104) + 래더 가로대 발 고정 (228,132)',
      joints: joints({
        head: pt(42, 84),
        neck: pt(58, 88),
        shoulder: pt(68, 91),
        elbow: pt(50, 86),
        wrist: pt(34, 82),
        hand: pt(24, 80),
        thoracic: pt(80, 94),
        lumbar: pt(106, 100),
        pelvis: pt(132, 104),
        hip: pt(140, 106),
        knee: pt(184, 118),
        ankle: pt(228, 132),
        heel: pt(236, 130),
        toe: pt(234, 138),
      }),
      fixedAnchors: [
        { joint: 'pelvis', surfaceKo: '바렐 돔 정점 치골 지지점 (132,104)', point: pt(132, 104) },
        { joint: 'ankle', surfaceKo: '래더 가로대 양발 고정점 (228,132)', point: pt(228, 132) },
      ],
      movingJoints: ['head', 'neck', 'shoulder', 'elbow', 'wrist', 'hand', 'thoracic', 'lumbar'],
      contactPoints: [
        { id: 'cp-fswan-start-pelvis', joint: 'pelvis', surface: 'ladder-barrel', status: 'anchored', labelKo: '바렐 정점 치골 지지(132,104)', point: pt(132, 104) },
        { id: 'cp-fswan-start-ankle', joint: 'ankle', surface: 'ladder-barrel', status: 'anchored', labelKo: '래더 가로대 발 고정(228,132)', point: pt(228, 132) },
      ],
      alignments: [
        {
          id: 'align-fswan-start',
          labelKo: '래더 발(228,132)-바렐 골반(132,104)-손끝(24,80) 사선 일직선',
          cueKo: '둔근과 복횡근을 연결해 골반이 바렐 위에서 흔들리지 않게 고정합니다.',
          kind: 'anchor-lock',
          from: pt(228, 132),
          to: pt(24, 80),
          cautionKo: '시작부터 허리가 과하게 꺾이지 않도록 복부를 지지합니다.',
        },
      ],
      directionVectors: [
        {
          id: 'vec-fswan-start-reach',
          labelKo: '사선 오버헤드 축성 리치 준비',
          kind: 'axial-lengthening',
          points: [pt(68, 91), pt(24, 80)],
          phaseScope: 'start',
        },
      ],
    }),
    middle: makePhase({
      phaseId: 'middle',
      shortTitleKo: '풀 스완 흉추 롱 아크 정점 · 양팔 오버헤드 V-포지션 리치(28,32)',
      summaryKo:
        '치골(132,104)과 래더 양발(228,132)을 단단히 고정한 채 상·중부 흉추(84,80)를 길게 들어 올리고 양팔을 귀 옆 오버헤드 V-포지션(28,32)으로 뻗습니다.',
      breathCueKo: '들숨 정점: 흉골을 천장 사선으로 열며 손끝과 발끝의 반대 방향 신장을 극대화합니다.',
      supportSurface: 'ladder-barrel',
      family: 'swan',
      carriageOffsetPx: 0,
      springTensionLevel: 'none',
      supportSurfaceKo: '래더 바렐 돔 정점 (132,104 지지 · 풀 스완 오버헤드 V-리치)',
      joints: joints({
        head: pt(48, 49),
        neck: pt(64, 63),
        shoulder: pt(74, 72),
        elbow: pt(56, 56),
        wrist: pt(40, 42),
        hand: pt(28, 32),
        thoracic: pt(84, 80),
        lumbar: pt(108, 96),
        pelvis: pt(132, 104),
        hip: pt(140, 106),
        knee: pt(184, 118),
        ankle: pt(228, 132),
        heel: pt(236, 130),
        toe: pt(234, 138),
      }),
      fixedAnchors: [
        { joint: 'pelvis', surfaceKo: '바렐 돔 정점 치골 지지점 (132,104)', point: pt(132, 104) },
        { joint: 'ankle', surfaceKo: '래더 가로대 양발 고정점 (228,132)', point: pt(228, 132) },
      ],
      movingJoints: ['head', 'neck', 'shoulder', 'elbow', 'wrist', 'hand', 'thoracic', 'lumbar'],
      contactPoints: [
        { id: 'cp-fswan-mid-pelvis', joint: 'pelvis', surface: 'ladder-barrel', status: 'anchored', labelKo: '바렐 정점 치골 지지(132,104)', point: pt(132, 104) },
        { id: 'cp-fswan-mid-ankle', joint: 'ankle', surface: 'ladder-barrel', status: 'anchored', labelKo: '래더 가로대 발 고정(228,132)', point: pt(228, 132) },
        { id: 'cp-fswan-mid-hand', joint: 'hand', surface: 'ladder-barrel', status: 'hover-airborne', labelKo: '오버헤드 V-리치(28,32)', point: pt(28, 32) },
      ],
      alignments: [
        {
          id: 'align-fswan-mid-arc',
          labelKo: '바렐 치골(132,104)→흉추(84,80)→머리(48,49)→손끝(28,32) 풀 스완 롱 아크',
          cueKo: '귀와 어깨 사이 공간을 넓히고 뒷목을 흉추 아크의 연장선으로 유지합니다.',
          kind: 'axis-line',
          from: pt(132, 104),
          to: pt(28, 32),
          cautionKo: '팔을 뒤로 넘기려다 요추 하단만 꺾지 않습니다.',
        },
      ],
      directionVectors: [
        {
          id: 'vec-fswan-mid-arc',
          labelKo: '풀 스완 흉추 신전 및 오버헤드 V-리치 상승',
          kind: 'spine-articulation',
          points: [pt(108, 96), pt(84, 80), pt(48, 49), pt(28, 32)],
          phaseScope: 'start-to-middle',
        },
      ],
    }),
    end: makePhase({
      phaseId: 'end',
      shortTitleKo: '롱 아크 유지 · 바렐 곡면 방향 편심성 복귀',
      summaryKo:
        '치골(132,104)과 래더 발(228,132) 고정을 유지하며 손끝(26,60)과 정수리(44,71)를 앞벽으로 길게 뻗어 사선 준비 자세 쪽으로 제어 복귀합니다.',
      breathCueKo: '날숨: 복부 리프트를 유지하며 아크를 길게 늘여 돌아옵니다.',
      supportSurface: 'ladder-barrel',
      family: 'swan',
      carriageOffsetPx: 0,
      springTensionLevel: 'none',
      supportSurfaceKo: '래더 바렐 돔 정점 (132,104 · 풀 스완 편심성 복귀)',
      joints: joints({
        head: pt(44, 71),
        neck: pt(60, 78),
        shoulder: pt(70, 83),
        elbow: pt(52, 74),
        wrist: pt(36, 66),
        hand: pt(26, 60),
        thoracic: pt(82, 88),
        lumbar: pt(107, 98),
        pelvis: pt(132, 104),
        hip: pt(140, 106),
        knee: pt(184, 118),
        ankle: pt(228, 132),
        heel: pt(236, 130),
        toe: pt(234, 138),
      }),
      fixedAnchors: [
        { joint: 'pelvis', surfaceKo: '바렐 돔 정점 치골 지지점 (132,104)', point: pt(132, 104) },
        { joint: 'ankle', surfaceKo: '래더 가로대 양발 고정점 (228,132)', point: pt(228, 132) },
      ],
      movingJoints: ['head', 'neck', 'shoulder', 'elbow', 'wrist', 'hand', 'thoracic', 'lumbar'],
      contactPoints: [
        { id: 'cp-fswan-end-pelvis', joint: 'pelvis', surface: 'ladder-barrel', status: 'anchored', labelKo: '바렐 정점 치골 지지(132,104)', point: pt(132, 104) },
        { id: 'cp-fswan-end-ankle', joint: 'ankle', surface: 'ladder-barrel', status: 'anchored', labelKo: '래더 가로대 발 고정(228,132)', point: pt(228, 132) },
      ],
      alignments: [
        {
          id: 'align-fswan-end',
          labelKo: '풀 스완 편심성 신장 복귀선',
          cueKo: '하강 중에도 손끝과 정수리의 전방 신장을 유지합니다.',
          kind: 'neutral-zone',
          from: pt(132, 104),
          to: pt(26, 60),
          cautionKo: '허리 긴장을 갑자기 풀지 않습니다.',
        },
      ],
      directionVectors: [
        {
          id: 'vec-fswan-end-return',
          labelKo: '오버헤드 V-리치에서 사선 라인으로 제어 복귀',
          kind: 'return-control',
          points: [pt(28, 32), pt(26, 60)],
          phaseScope: 'middle-to-end',
        },
      ],
    }),
  },
  poseDeltaSummary: {
    startToMiddleKo:
      '바렐 정점(132,104) 치골 지지와 래더 발(228,132) 고정 위에서 사선 준비(손 24,80·머리 42,84)가 오버헤드 V-리치 풀 스완 아크(손 28,32·머리 48,49)로 확장됩니다.',
    middleToEndKo:
      '축성 신장을 유지하며 오버헤드 정점(손 28,32·머리 48,49)에서 사선 제어 호버(손 26,60·머리 44,71)로 복귀합니다.',
    invariantAnchorsKo: '바렐 돔 정점 치골(132,104) 및 래더 가로대 발목(228,132)·발끝(234,138) 고정',
    keyJointChangeKo: '오버헤드 V-리치 상지 거상(손 Δy=-48px) 및 상·중부 흉추 풀 아크 신전',
  },
  mobileSummaryBulletsKo: [
    '지지·고정: 바렐 정점(132,104) 치골 안착 + 래더 가로대(228,132) 발 고정',
    '핵심 움직임: 사선 다트 라인 → 오버헤드 V-리치 풀 흉추 아크 → 편심성 복귀',
    '주의 정렬: 견갑 하강 유지 및 요추 단독 과신전·경추 꺾임 방지',
  ],
});

export const EXTENSION_MOVEMENT_SPECS: Readonly<
  Record<ExtensionMovementId, ExtensionMovementDiagramSpec>
> = Object.freeze({
  'original-mat-swan-prep': matSwanPrepSpec,
  'original-mat-swimming-prep': matSwimmingPrepSpec,
  'extension-mat-swimming-alternating': matSwimmingAlternatingSpec,
  'original-reformer-box-swan-prep': reformerBoxSwanPrepSpec,
  'ex-extension-01': reformerPullingStrapsSpec,
  'original-cadillac-prone-back-reach': cadillacProneBackReachSpec,
  'original-barrel-supported-swan': barrelSupportedSwanSpec,
  'ex-extension-02': barrelFullSwanSpec,
});

export const EXTENSION_VISUAL_ASSETS: Readonly<
  Record<ExtensionMovementId, CatalogMovementVisualAsset>
> = Object.freeze({
  'original-mat-swan-prep': matSwanPrepSpec.catalogAsset,
  'original-mat-swimming-prep': matSwimmingPrepSpec.catalogAsset,
  'extension-mat-swimming-alternating': matSwimmingAlternatingSpec.catalogAsset,
  'original-reformer-box-swan-prep': reformerBoxSwanPrepSpec.catalogAsset,
  'ex-extension-01': reformerPullingStrapsSpec.catalogAsset,
  'original-cadillac-prone-back-reach': cadillacProneBackReachSpec.catalogAsset,
  'original-barrel-supported-swan': barrelSupportedSwanSpec.catalogAsset,
  'ex-extension-02': barrelFullSwanSpec.catalogAsset,
});

export function getExtensionMovementSpec(
  movementId: ExtensionMovementId,
): ExtensionMovementDiagramSpec {
  return EXTENSION_MOVEMENT_SPECS[movementId];
}

export function getExtensionCatalogVisualAssets(): Readonly<
  Record<string, CatalogMovementVisualAsset>
> {
  return Object.freeze({
    ...EXTENSION_VISUAL_ASSETS,
    'prone-extension': Object.freeze({
      ...matSwanPrepSpec.catalogAsset,
      exerciseId: 'prone-extension',
    }),
    swimming: Object.freeze({
      ...matSwimmingPrepSpec.catalogAsset,
      exerciseId: 'swimming',
    }),
  });
}

export function getExtensionDiagramCorrections(): Readonly<
  Record<string, MovementDiagramCorrection>
> {
  return Object.freeze({
    ...EXTENSION_DIAGRAM_CORRECTIONS,
    'prone-extension': EXTENSION_DIAGRAM_CORRECTIONS['original-mat-swan-prep'],
    swimming: EXTENSION_DIAGRAM_CORRECTIONS['original-mat-swimming-prep'],
  });
}
