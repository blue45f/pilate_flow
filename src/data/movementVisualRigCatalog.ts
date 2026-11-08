import {
  APPARATUS_LABELS,
  CANONICAL_BLOCKS,
  INITIAL_EXERCISES,
  POSITION_LABELS,
  PROP_LABELS,
  SPINAL_PLANE_LABELS,
} from './pilatesCatalog';
import { getCoreI7RegistryPatch } from './coreAbdominalDiagrams';
import { getExtensionCatalogVisualAssets } from './extensionMovementData';
import { getHipLegCatalogVisualAssets } from './hip-leg-diagram-data';
import { getPelvisHipCatalogVisualAssets } from './pelvisHipDiagramData';
import { getRotationI7IntegrationBundle } from './rotationDiagramData';
import { getShoulderSupportRegistryIntegrationPayload } from './shoulderSupportDiagrams';
import { getSpineCatalogMovementVisualAssets } from './spineArticulationDiagramData';
import type {
  ApparatusType,
  BodyPosition,
  ClassBlockCategory,
  PilatesExercise,
  SpinalPlane,
} from '../types/pilates';

export type VisualPhaseId = 'start' | 'middle' | 'end';

export type MuscleGroupId =
  | 'core-transversus'
  | 'rectus-obliques'
  | 'glute-max'
  | 'glute-med'
  | 'quadriceps'
  | 'hamstrings'
  | 'adductors'
  | 'calves'
  | 'latissimus-serratus'
  | 'thoracic-extensors'
  | 'shoulder-deltoid'
  | 'hip-flexor-iliopsoas';

export type MuscleActivationRole = 'primary' | 'stabilizer' | 'lengthening';

export interface Point2D {
  readonly x: number;
  readonly y: number;
}

export interface RigJointMap {
  readonly head: Point2D;
  readonly neck: Point2D;
  readonly shoulder: Point2D;
  readonly elbow: Point2D;
  readonly wrist: Point2D;
  readonly hand: Point2D;
  readonly thoracic: Point2D;
  readonly lumbar: Point2D;
  readonly pelvis: Point2D;
  readonly hip: Point2D;
  readonly knee: Point2D;
  readonly ankle: Point2D;
  readonly heel: Point2D;
  readonly toe: Point2D;
  readonly farShoulder?: Point2D;
  readonly farElbow?: Point2D;
  readonly farWrist?: Point2D;
  readonly farHip?: Point2D;
  readonly farKnee?: Point2D;
  readonly farAnkle?: Point2D;
  readonly farToe?: Point2D;
}

export interface JointAlignmentGuide {
  readonly id: string;
  readonly labelKo: string;
  readonly cueKo: string;
  readonly kind: 'plumb-line' | 'axis-line' | 'angle-arc' | 'anchor-lock' | 'neutral-zone';
  readonly from: Point2D;
  readonly to: Point2D;
  readonly targetAngleDeg?: number;
  readonly cautionKo: string;
}

export interface MovementDirectionVector {
  readonly id: string;
  readonly labelKo: string;
  readonly kind:
    | 'limb-excursion'
    | 'spine-articulation'
    | 'carriage-travel'
    | 'spring-resistance'
    | 'axial-lengthening'
    | 'return-control';
  readonly points: readonly Point2D[];
  readonly phaseScope: VisualPhaseId | 'start-to-middle' | 'middle-to-end';
}

export interface MuscleHighlightSpec {
  readonly muscleGroupId: MuscleGroupId;
  readonly labelKo: string;
  readonly labelEn: string;
  readonly catalogMuscleMatches: readonly string[];
  readonly role: MuscleActivationRole;
  readonly roleLabelKo: '주동근 (주 타겟)' | '안정화근 (코어·정렬 유지)' | '신장·이완 부위';
  readonly activePhases: readonly VisualPhaseId[];
  readonly anchorJoints: readonly (keyof RigJointMap)[];
  readonly reasonKo: string;
}

export interface PhasePoseSpec {
  readonly phaseId: VisualPhaseId;
  readonly badgeKo:
    | '시작 자세 (준비·정렬)'
    | '중간 자세 (최대 가동·정점)'
    | '끝 자세 (제어 복귀·마무리)';
  readonly shortTitleKo: string;
  readonly summaryKo: string;
  readonly breathCueKo: string;
  readonly joints: RigJointMap;
  readonly fixedAnchors: readonly {
    readonly joint: keyof RigJointMap;
    readonly surfaceKo: string;
    readonly point: Point2D;
  }[];
  readonly movingJoints: readonly (keyof RigJointMap)[];
  readonly apparatusState: {
    readonly carriageOffsetPx: number;
    readonly pedalAngleDeg: number;
    readonly springTensionLevel: 'low' | 'medium' | 'high' | 'none';
    readonly supportSurfaceKo: string;
    readonly propPositionKo?: string;
  };
  readonly alignments: readonly JointAlignmentGuide[];
  readonly directionVectors: readonly MovementDirectionVector[];
}

export interface CatalogMovementVisualAsset {
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
  readonly staticGuideSvgPath: string;
  readonly productionMethod: 'free-authored-kinematic-svg-v1';
  readonly rightsStatus: 'original-app-authored-free-license';
  readonly licenseLabelKo: string;
  readonly anatomicalAccuracyAssumed: false;
  readonly phases: {
    readonly start: PhasePoseSpec;
    readonly middle: PhasePoseSpec;
    readonly end: PhasePoseSpec;
  };
  readonly primaryMuscles: readonly MuscleHighlightSpec[];
  readonly poseDeltaSummary: {
    readonly startToMiddleKo: string;
    readonly middleToEndKo: string;
    readonly invariantAnchorsKo: string;
    readonly keyJointChangeKo: string;
  };
  readonly mobileSummaryBulletsKo: readonly [string, string, string];
}

function clampCoord(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.round(Math.min(max, Math.max(min, value)));
}

function pt(x: number, y: number): Point2D {
  return Object.freeze({
    x: clampCoord(x, 16, 304),
    y: clampCoord(y, 16, 184),
  });
}

function makeJointMap(raw: RigJointMap): RigJointMap {
  const result: Record<string, Point2D> = {
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
  };
  if (raw.farShoulder) result.farShoulder = pt(raw.farShoulder.x, raw.farShoulder.y);
  if (raw.farElbow) result.farElbow = pt(raw.farElbow.x, raw.farElbow.y);
  if (raw.farWrist) result.farWrist = pt(raw.farWrist.x, raw.farWrist.y);
  if (raw.farHip) result.farHip = pt(raw.farHip.x, raw.farHip.y);
  if (raw.farKnee) result.farKnee = pt(raw.farKnee.x, raw.farKnee.y);
  if (raw.farAnkle) result.farAnkle = pt(raw.farAnkle.x, raw.farAnkle.y);
  if (raw.farToe) result.farToe = pt(raw.farToe.x, raw.farToe.y);
  return Object.freeze(result as unknown as RigJointMap);
}

interface MuscleMetaEntry {
  readonly id: MuscleGroupId;
  readonly labelKo: string;
  readonly labelEn: string;
  readonly keywords: readonly string[];
  readonly anchorJoints: readonly (keyof RigJointMap)[];
  readonly defaultReasonKo: Record<MuscleActivationRole, string>;
}

const MUSCLE_GROUP_CATALOG: Record<MuscleGroupId, MuscleMetaEntry> = {
  'core-transversus': {
    id: 'core-transversus',
    labelKo: '심부 코어 (복횡근·다열근·골반저근)',
    labelEn: 'Deep Core & Transversus Abdominis',
    keywords: ['복횡근', '횡격막', '골반저근', '다열근', '호흡', '몸통', '골반', '코어 밸런스', '골반 안정화근'],
    anchorJoints: ['thoracic', 'lumbar', 'pelvis'],
    defaultReasonKo: {
      primary: '흉식 호흡과 복강 내압 조절로 요추-골반 중립을 능동적으로 제어합니다.',
      stabilizer: '사지 이동과 스프링 저항 중 허리 과신전 및 골반 흔들림을 잡아줍니다.',
      lengthening: '호흡 확장에 맞춰 흉곽과 복벽의 과긴장을 부드럽게 풀어줍니다.',
    },
  },
  'rectus-obliques': {
    id: 'rectus-obliques',
    labelKo: '복직근·내외복사근 (전측면 코어)',
    labelEn: 'Rectus Abdominis & Obliques',
    keywords: ['복직근', '상복부', '하복부', '복부', '내복사근', '외복사근', '내/외복사근', '외/내복사근', '요방형근', '옆구리', '늑간근'],
    anchorJoints: ['thoracic', 'lumbar', 'pelvis'],
    defaultReasonKo: {
      primary: '갈비뼈와 골반 사이 거리를 조절하며 척추 굴곡·측굴·회전 토크를 만듭니다.',
      stabilizer: '흉곽 들뜸(Rib Flare)을 억제하고 몸통 회전 및 측방 붕괴를 방지합니다.',
      lengthening: '측굴 및 흉추 오픈 구간에서 반대측 복사근과 늑간근이 길게 신장됩니다.',
    },
  },
  'glute-max': {
    id: 'glute-max',
    labelKo: '대둔근 (후면 고관절 신전)',
    labelEn: 'Gluteus Maximus',
    keywords: ['대둔근', '둔근'],
    anchorJoints: ['pelvis', 'hip', 'knee'],
    defaultReasonKo: {
      primary: '고관절 신전과 골반 후방 안정화를 주도하여 하체 추진력을 만듭니다.',
      stabilizer: '척추 신전 및 입식 지지 구간에서 골반 전방경사를 막고 천장관절을 보호합니다.',
      lengthening: '고관절 굴곡 진입 구간에서 둔부 후면 섬유가 편심성으로 길어집니다.',
    },
  },
  'glute-med': {
    id: 'glute-med',
    labelKo: '중둔근·외전근군 (측면 골반 지지)',
    labelEn: 'Gluteus Medius & Abductors',
    keywords: ['중둔근', '소둔근', '대퇴근막장근', '균형'],
    anchorJoints: ['pelvis', 'hip', 'knee'],
    defaultReasonKo: {
      primary: '고관절 외전·외회전 및 단측 지지 시 골반 수평 정렬을 강력하게 유지합니다.',
      stabilizer: '무릎이 안쪽(Valgus)으로 무너지지 않도록 대퇴골 정렬 축을 고정합니다.',
      lengthening: '내전 및 교차 구간에서 측면 둔부 근막의 긴장을 이완합니다.',
    },
  },
  quadriceps: {
    id: 'quadriceps',
    labelKo: '대퇴사두근 (슬관절 신전·지지)',
    labelEn: 'Quadriceps Femoris',
    keywords: ['대퇴사두근', '하체', '무릎'],
    anchorJoints: ['hip', 'knee', 'ankle'],
    defaultReasonKo: {
      primary: '풋바·페달 프레스 및 런지 구간에서 무릎 신전과 편심성 감속을 담당합니다.',
      stabilizer: '슬개골 트래킹을 일정하게 유지하고 무릎 과신전(Locking)을 방지합니다.',
      lengthening: '무릎 굴곡 및 닐링 힙 오픈 시 대퇴 전면이 길게 늘어납니다.',
    },
  },
  hamstrings: {
    id: 'hamstrings',
    labelKo: '햄스트링 (슬관절 굴곡·후면 사슬)',
    labelEn: 'Hamstrings',
    keywords: ['햄스트링', '햄스트링 이완'],
    anchorJoints: ['pelvis', 'hip', 'knee'],
    defaultReasonKo: {
      primary: '브릿지 컬과 고관절 신전 시 좌골결절을 끌어당겨 후면 사슬을 수축합니다.',
      stabilizer: '캐리지 복귀 구간에서 골반 후방 지지를 보조하고 무릎 안정성을 높입니다.',
      lengthening: '스트랩 레그 리프트·엘리펀트·롤다운 시 좌골부터 오금까지 길게 신장됩니다.',
    },
  },
  adductors: {
    id: 'adductors',
    labelKo: '내전근군 (하지 중심선 연결)',
    labelEn: 'Hip Adductors',
    keywords: ['내전근'],
    anchorJoints: ['pelvis', 'hip', 'knee'],
    defaultReasonKo: {
      primary: '양다리 중심선(Midline) 밀착과 스트랩 프로그/써클 내전 수축을 이끌어냅니다.',
      stabilizer: '미니볼·써클링 압박을 통해 골반저근 및 복횡근과 반사적 협응을 만듭니다.',
      lengthening: '와이드 세컨드·사이드 스플릿·오프닝 구간에서 허벅지 안쪽이 깊게 이완됩니다.',
    },
  },
  calves: {
    id: 'calves',
    labelKo: '종아리·발목 안정근 (비복근·가자미근)',
    labelEn: 'Calves & Ankle Stabilizers',
    keywords: ['비복근/가자미근', '종아리', '발목'],
    anchorJoints: ['knee', 'ankle', 'heel', 'toe'],
    defaultReasonKo: {
      primary: '족저굴곡(Plantarflexion)과 발볼 지지력을 통해 발목-종아리 펌핑을 수행합니다.',
      stabilizer: '풋바·페달·바닥 접촉면에서 발아치와 거골하관절 정렬을 유지합니다.',
      lengthening: '텐던 스트레치·배측굴곡(Dorsiflexion) 구간에서 아킬레스건과 종아리가 신장됩니다.',
    },
  },
  'latissimus-serratus': {
    id: 'latissimus-serratus',
    labelKo: '광배근·전거근·하부승모근 (견갑 안정)',
    labelEn: 'Latissimus Dorsi & Serratus Anterior',
    keywords: ['광배근', '전거근', '능형근', '하부승모근', '소흉근', '대흉근'],
    anchorJoints: ['shoulder', 'thoracic', 'lumbar'],
    defaultReasonKo: {
      primary: '스트랩·바를 끌어내리며 견갑골 하강·전인 안정성과 겨드랑이 연결을 만듭니다.',
      stabilizer: '상지 지지 및 플랭크 구간에서 날개뼈 익상(Winging)과 승모근 과긴장을 방지합니다.',
      lengthening: '암써클·오버헤드 리치·머메이드 시 흉곽 측면과 견갑 주변이 넓게 열립니다.',
    },
  },
  'thoracic-extensors': {
    id: 'thoracic-extensors',
    labelKo: '척추기립근·흉추 신전근 (후면 척추)',
    labelEn: 'Thoracic & Spinal Extensors',
    keywords: ['척추기립근', '척추분절근', '척추기립근 이완', '등', '흉곽', '흉추 가동성', '심부경추굴곡근', '후두하근'],
    anchorJoints: ['head', 'neck', 'thoracic', 'lumbar'],
    defaultReasonKo: {
      primary: '경추-흉추 순차 신전과 축성 신장(Axial Elongation)으로 굽은 등을 펴줍니다.',
      stabilizer: '앉거나 선 자세에서 중력에 저항해 척추 수직 중립 기둥을 지탱합니다.',
      lengthening: '롤다운·C-커브·브릿지 하강 분절 시 척추 마디마디 사이 공간이 길게 열립니다.',
    },
  },
  'shoulder-deltoid': {
    id: 'shoulder-deltoid',
    labelKo: '삼각근·상완이두/삼두근 (상지 주동)',
    labelEn: 'Deltoids, Biceps & Triceps',
    keywords: ['전면/측면 삼각근', '후면삼각근', '전면삼각근', '삼각근', '상완이두근', '상완삼두근', '삼두근', '팔', '어깨', '상체'],
    anchorJoints: ['shoulder', 'elbow', 'wrist', 'hand'],
    defaultReasonKo: {
      primary: '어깨 굴곡·신전·외전 및 팔꿈치 신전을 통해 상지 스트랩/스프링 궤적을 제어합니다.',
      stabilizer: '손목-팔꿈치-어깨 관절 축을 정렬하여 회전근개 부담을 줄입니다.',
      lengthening: '체스트 오프닝 및 흉추 회전 시 전면 삼각근과 상완 근막이 신장됩니다.',
    },
  },
  'hip-flexor-iliopsoas': {
    id: 'hip-flexor-iliopsoas',
    labelKo: '장요근·고관절 굴곡근 (전면 고관절)',
    labelEn: 'Iliopsoas & Hip Flexors',
    keywords: ['장요근', '장요근 스트레칭', '장요근 이완', '고관절 굴곡근', '고관절'],
    anchorJoints: ['lumbar', 'pelvis', 'hip', 'knee'],
    defaultReasonKo: {
      primary: '테이블탑 니 폴드·레그 스트레치·시저스 시 대퇴골을 고관절 소켓 안에서 정교하게 굴곡합니다.',
      stabilizer: '시티드 롤백 및 체어 풋워크에서 요추와 골반의 연결 각도를 세밀하게 잡아줍니다.',
      lengthening: '브릿지·런지·스완·프로그 신전 구간에서 단축되기 쉬운 전면 고관절이 길게 이완됩니다.',
    },
  },
};

const ROLE_LABELS_KO: Record<
  MuscleActivationRole,
  '주동근 (주 타겟)' | '안정화근 (코어·정렬 유지)' | '신장·이완 부위'
> = {
  primary: '주동근 (주 타겟)',
  stabilizer: '안정화근 (코어·정렬 유지)',
  lengthening: '신장·이완 부위',
};

function buildMuscleHighlights(
  exercise: PilatesExercise,
  defaults: {
    readonly primary: MuscleGroupId;
    readonly stabilizer: MuscleGroupId;
    readonly lengthening: MuscleGroupId;
    readonly extraPrimary?: MuscleGroupId;
  },
): readonly MuscleHighlightSpec[] {
  const matchedByGroup = new Map<MuscleGroupId, string[]>();
  for (const target of exercise.targetMuscles) {
    const normalized = target.trim();
    for (const meta of Object.values(MUSCLE_GROUP_CATALOG)) {
      if (
        meta.keywords.some((kw) => normalized.includes(kw) || kw.includes(normalized))
      ) {
        const list = matchedByGroup.get(meta.id) ?? [];
        if (!list.includes(normalized)) list.push(normalized);
        matchedByGroup.set(meta.id, list);
      }
    }
  }

  const primaryGroupId: MuscleGroupId =
    matchedByGroup.has(defaults.primary) || matchedByGroup.size === 0
      ? defaults.primary
      : (Array.from(matchedByGroup.keys())[0] ?? defaults.primary);

  const orderedRoles: { groupId: MuscleGroupId; role: MuscleActivationRole; phases: readonly VisualPhaseId[] }[] = [
    { groupId: primaryGroupId, role: 'primary', phases: ['middle', 'end'] },
  ];

  if (
    defaults.extraPrimary &&
    defaults.extraPrimary !== primaryGroupId &&
    defaults.extraPrimary !== defaults.stabilizer &&
    defaults.extraPrimary !== defaults.lengthening
  ) {
    orderedRoles.push({
      groupId: defaults.extraPrimary,
      role: 'primary',
      phases: ['middle'],
    });
  }

  orderedRoles.push(
    {
      groupId:
        defaults.stabilizer === primaryGroupId
          ? 'core-transversus'
          : defaults.stabilizer,
      role: 'stabilizer',
      phases: ['start', 'middle', 'end'],
    },
    {
      groupId:
        defaults.lengthening === primaryGroupId ||
        defaults.lengthening === defaults.stabilizer
          ? 'thoracic-extensors'
          : defaults.lengthening,
      role: 'lengthening',
      phases: ['middle', 'end'],
    },
  );

  const unassignedCatalogMuscles = exercise.targetMuscles.filter(
    (m) => !orderedRoles.some((r) => (matchedByGroup.get(r.groupId) ?? []).includes(m)),
  );

  return Object.freeze(
    orderedRoles.map((item, idx) => {
      const meta = MUSCLE_GROUP_CATALOG[item.groupId];
      const directMatches = matchedByGroup.get(item.groupId) ?? [];
      const catalogMatches =
        idx === 0 && directMatches.length === 0 && exercise.targetMuscles.length > 0
          ? [exercise.targetMuscles[0]]
          : idx === 0 && unassignedCatalogMuscles.length > 0
            ? Array.from(new Set([...directMatches, ...unassignedCatalogMuscles]))
            : directMatches.length > 0
              ? directMatches
              : [meta.labelKo.split(' ')[0]];

      return Object.freeze({
        muscleGroupId: meta.id,
        labelKo: meta.labelKo,
        labelEn: meta.labelEn,
        catalogMuscleMatches: Object.freeze(catalogMatches),
        role: item.role,
        roleLabelKo: ROLE_LABELS_KO[item.role],
        activePhases: Object.freeze([...item.phases]),
        anchorJoints: Object.freeze([...meta.anchorJoints]),
        reasonKo: `${exercise.nameKo} 동작에서 ${meta.defaultReasonKo[item.role]}`,
      });
    }),
  );
}

interface ArchetypeRigBlueprint {
  readonly archetypeId: string;
  readonly archetypeTitleKo: string;
  readonly muscles: {
    readonly primary: MuscleGroupId;
    readonly extraPrimary?: MuscleGroupId;
    readonly stabilizer: MuscleGroupId;
    readonly lengthening: MuscleGroupId;
  };
  readonly fixedAnchorJoints: readonly {
    readonly joint: keyof RigJointMap;
    readonly surfaceByApparatus?: Partial<Record<ApparatusType, string>>;
    readonly defaultSurfaceKo: string;
  }[];
  readonly movingJoints: readonly (keyof RigJointMap)[];
  readonly startJoints: RigJointMap;
  readonly middleJoints: RigJointMap;
  readonly endJoints: RigJointMap;
  readonly carriageOffsets: readonly [number, number, number];
  readonly pedalAngles: readonly [number, number, number];
  readonly phaseTitlesKo: readonly [string, string, string];
  readonly phaseSummariesKo: readonly [string, string, string];
  readonly breathCuesKo: readonly [string, string, string];
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
  readonly poseDeltaSummary: {
    readonly startToMiddleKo: string;
    readonly middleToEndKo: string;
    readonly invariantAnchorsKo: string;
    readonly keyJointChangeKo: string;
  };
}

const ARCHETYPE_BLUEPRINTS_PART_A: readonly ArchetypeRigBlueprint[] = [
  {
    archetypeId: 'supine-breath-pelvic-clock',
    archetypeTitleKo: '수파인 호흡 · 골반 시계 & 흉곽 암 아크',
    muscles: {
      primary: 'core-transversus',
      extraPrimary: 'latissimus-serratus',
      stabilizer: 'rectus-obliques',
      lengthening: 'thoracic-extensors',
    },
    fixedAnchorJoints: [
      { joint: 'head', defaultSurfaceKo: '매트/헤드레스트 후두부 지지면' },
      { joint: 'thoracic', defaultSurfaceKo: '견갑골·등 상부 지지면' },
      { joint: 'heel', defaultSurfaceKo: '바닥/풋바 뒤꿈치 지지점' },
    ],
    movingJoints: ['pelvis', 'lumbar', 'elbow', 'wrist', 'hand'],
    startJoints: makeJointMap({
      head: { x: 56, y: 136 },
      neck: { x: 74, y: 138 },
      shoulder: { x: 94, y: 138 },
      elbow: { x: 112, y: 112 },
      wrist: { x: 118, y: 84 },
      hand: { x: 120, y: 74 },
      thoracic: { x: 124, y: 140 },
      lumbar: { x: 154, y: 138 },
      pelvis: { x: 182, y: 142 },
      hip: { x: 192, y: 142 },
      knee: { x: 228, y: 102 },
      ankle: { x: 258, y: 146 },
      heel: { x: 252, y: 152 },
      toe: { x: 272, y: 150 },
      farKnee: { x: 222, y: 98 },
      farAnkle: { x: 252, y: 144 },
    }),
    middleJoints: makeJointMap({
      head: { x: 56, y: 136 },
      neck: { x: 74, y: 138 },
      shoulder: { x: 94, y: 138 },
      elbow: { x: 82, y: 102 },
      wrist: { x: 64, y: 78 },
      hand: { x: 56, y: 70 },
      thoracic: { x: 124, y: 140 },
      lumbar: { x: 154, y: 146 },
      pelvis: { x: 180, y: 136 },
      hip: { x: 190, y: 136 },
      knee: { x: 228, y: 100 },
      ankle: { x: 258, y: 146 },
      heel: { x: 252, y: 152 },
      toe: { x: 272, y: 150 },
      farKnee: { x: 222, y: 96 },
      farAnkle: { x: 252, y: 144 },
    }),
    endJoints: makeJointMap({
      head: { x: 56, y: 136 },
      neck: { x: 74, y: 138 },
      shoulder: { x: 94, y: 138 },
      elbow: { x: 124, y: 132 },
      wrist: { x: 154, y: 136 },
      hand: { x: 166, y: 138 },
      thoracic: { x: 124, y: 140 },
      lumbar: { x: 154, y: 140 },
      pelvis: { x: 182, y: 142 },
      hip: { x: 192, y: 142 },
      knee: { x: 228, y: 102 },
      ankle: { x: 258, y: 146 },
      heel: { x: 252, y: 152 },
      toe: { x: 272, y: 150 },
      farKnee: { x: 222, y: 98 },
      farAnkle: { x: 252, y: 144 },
    }),
    carriageOffsets: [0, 4, 0],
    pedalAngles: [0, 0, 0],
    phaseTitlesKo: ['중립 골반 · 흉식 호흡 준비', '임프린트 틸트 · 오버헤드 암 아크', '중립 복귀 · 복횡근 코르셋 안정'],
    phaseSummariesKo: [
      '뒤통수·흉추·천골 삼각 지지점을 바닥에 두고 무릎을 세워 골반 중립을 세팅합니다.',
      '날숨에 요추를 부드럽게 임프린트(12시 방향)하며 양팔을 갈비뼈가 들뜨지 않는 범위까지 원호로 보냅니다.',
      '들숨과 함께 팔을 골반 옆으로 회수하고 요추-골반 중립 곡선을 회복합니다.',
    ],
    breathCuesKo: [
      '들숨: 코로 깊게 들이마시며 갈비뼈 양옆·뒷면을 3차원 확장',
      '날숨: 입으로 가늘게 내쉬며 아랫배를 납작하게 닫고 흉곽 하단 고정',
      '마무리 호흡: 어깨 긴장을 풀고 중립 골반 위에서 잔잔한 호흡 유지',
    ],
    alignments: {
      start: [
        {
          id: 'supine-neutral-axis',
          labelKo: '경추-흉추-천골 수평 지지선',
          cueKo: '뒤통수부터 꼬리뼈까지 매트/캐리지 위 수평 축을 맞춥니다.',
          kind: 'axis-line',
          from: pt(56, 138),
          to: pt(182, 142),
          cautionKo: '턱이 천장으로 들리거나 갈비뼈가 바닥에서 뜨지 않게 주의합니다.',
        },
      ],
      middle: [
        {
          id: 'rib-pelvis-connection',
          labelKo: '흉곽-골반 임프린트 연결선',
          cueKo: '팔이 머리 위로 이동할 때도 명치와 치골 사이 거리를 일정하게 유지합니다.',
          kind: 'neutral-zone',
          from: pt(124, 140),
          to: pt(180, 136),
          targetAngleDeg: 175,
          cautionKo: '팔 각도를 넓히려고 허리를 과신전하지 않습니다.',
        },
      ],
      end: [
        {
          id: 'pelvic-return-lock',
          labelKo: '중립 골반 복귀 앵커',
          cueKo: '천골 무게중심을 중앙으로 되돌려 좌우 대칭을 확인합니다.',
          kind: 'anchor-lock',
          from: pt(154, 140),
          to: pt(182, 142),
          cautionKo: '골반 복귀 시 둔근을 과도하게 조이지 않습니다.',
        },
      ],
    },
    directionVectors: {
      start: [
        {
          id: 'vec-breath-prep',
          labelKo: '흉곽 측면 확장 준비',
          kind: 'axial-lengthening',
          points: [pt(124, 140), pt(124, 122)],
          phaseScope: 'start',
        },
      ],
      middle: [
        {
          id: 'vec-arm-arc-overhead',
          labelKo: '오버헤드 암 아크 궤적',
          kind: 'limb-excursion',
          points: [pt(120, 74), pt(86, 68), pt(56, 70)],
          phaseScope: 'start-to-middle',
        },
        {
          id: 'vec-pelvic-imprint',
          labelKo: '골반 후방경사 분절',
          kind: 'spine-articulation',
          points: [pt(182, 142), pt(154, 146)],
          phaseScope: 'middle',
        },
      ],
      end: [
        {
          id: 'vec-arm-sweep-down',
          labelKo: '골반 옆 암 스위프 복귀',
          kind: 'return-control',
          points: [pt(56, 70), pt(116, 98), pt(166, 138)],
          phaseScope: 'middle-to-end',
        },
      ],
    },
    poseDeltaSummary: {
      startToMiddleKo: '손끝이 천장(x:120,y:74)에서 머리 위 사선(x:56,y:70)으로 이동하며 요추가 매트로 밀착됩니다.',
      middleToEndKo: '양팔이 큰 원호를 그리며 골반 옆(x:166,y:138)으로 내려오고 골반이 중립(y:142)으로 복귀합니다.',
      invariantAnchorsKo: '후두부(head), 흉추(thoracic), 양발 뒤꿈치(heel) 지지점은 흔들림 없이 고정됩니다.',
      keyJointChangeKo: '요추(lumbar)·골반(pelvis) 미세 경사 + 견관절 원호 가동(hand Δ96px)',
    },
  },
  {
    archetypeId: 'supine-articulated-bridge',
    archetypeTitleKo: '수파인 아티큘레이팅 브릿지 & 숄더 브릿지',
    muscles: {
      primary: 'glute-max',
      extraPrimary: 'hamstrings',
      stabilizer: 'core-transversus',
      lengthening: 'hip-flexor-iliopsoas',
    },
    fixedAnchorJoints: [
      { joint: 'head', defaultSurfaceKo: '평평한 매트/헤드레스트(Flat)' },
      { joint: 'shoulder', defaultSurfaceKo: '견갑골 상부 광폭 지지면' },
      { joint: 'heel', defaultSurfaceKo: '바닥/풋바/타워바 발뒤꿈치 고정점' },
    ],
    movingJoints: ['thoracic', 'lumbar', 'pelvis', 'hip', 'knee'],
    startJoints: makeJointMap({
      head: { x: 54, y: 142 },
      neck: { x: 72, y: 142 },
      shoulder: { x: 92, y: 140 },
      elbow: { x: 128, y: 146 },
      wrist: { x: 162, y: 148 },
      hand: { x: 174, y: 148 },
      thoracic: { x: 124, y: 142 },
      lumbar: { x: 154, y: 142 },
      pelvis: { x: 184, y: 144 },
      hip: { x: 194, y: 144 },
      knee: { x: 228, y: 98 },
      ankle: { x: 258, y: 146 },
      heel: { x: 254, y: 152 },
      toe: { x: 274, y: 150 },
    }),
    middleJoints: makeJointMap({
      head: { x: 54, y: 142 },
      neck: { x: 72, y: 140 },
      shoulder: { x: 92, y: 140 },
      elbow: { x: 128, y: 146 },
      wrist: { x: 162, y: 148 },
      hand: { x: 174, y: 148 },
      thoracic: { x: 124, y: 122 },
      lumbar: { x: 154, y: 108 },
      pelvis: { x: 184, y: 96 },
      hip: { x: 194, y: 94 },
      knee: { x: 234, y: 82 },
      ankle: { x: 258, y: 146 },
      heel: { x: 254, y: 152 },
      toe: { x: 274, y: 150 },
    }),
    endJoints: makeJointMap({
      head: { x: 54, y: 142 },
      neck: { x: 72, y: 142 },
      shoulder: { x: 92, y: 140 },
      elbow: { x: 128, y: 146 },
      wrist: { x: 162, y: 148 },
      hand: { x: 174, y: 148 },
      thoracic: { x: 124, y: 136 },
      lumbar: { x: 154, y: 138 },
      pelvis: { x: 184, y: 144 },
      hip: { x: 194, y: 144 },
      knee: { x: 228, y: 98 },
      ankle: { x: 258, y: 146 },
      heel: { x: 254, y: 152 },
      toe: { x: 274, y: 150 },
    }),
    carriageOffsets: [0, 14, 0],
    pedalAngles: [0, 12, 0],
    phaseTitlesKo: ['수파인 브릿지 세팅 (헤드레스트 Flat)', '골반 리프트 · 어깨-골반-무릎 사선 정점', '윗등부터 척추 분절 하강 복귀'],
    phaseSummariesKo: [
      '경추 보호를 위해 머리를 평평하게 두고 두 발뒤꿈치를 좌골 가까이에 정렬합니다.',
      '꼬리뼈부터 말아 올려 어깨-흉곽-골반-무릎이 일직선 사선을 이루는 브릿지 정점을 만듭니다.',
      '흉추 상부부터 요추·천골 순서로 한 마디씩 매트에 도장 찍듯 분절하며 내려옵니다.',
    ],
    breathCuesKo: [
      '들숨: 척추 마디 간격을 넓히며 뒷목 길게 유지',
      '날숨: 뒤꿈치로 지지면을 누르며 골반을 사선 위로 분절 리프트',
      '날숨 유지: 흉골부터 부드럽게 녹여내며 천골 중립까지 순차 하강',
    ],
    alignments: {
      start: [
        {
          id: 'bridge-start-base',
          labelKo: '견갑-골반-발뒤꿈치 기저 정렬',
          cueKo: '양발과 견갑골에 체중을 고르게 배분하고 목에는 힘을 뺍니다.',
          kind: 'anchor-lock',
          from: pt(92, 140),
          to: pt(254, 152),
          cautionKo: '브릿지 전 헤드레스트가 올라가 있으면 반드시 Flat으로 내립니다.',
        },
      ],
      middle: [
        {
          id: 'bridge-diagonal-line',
          labelKo: '어깨-골반-무릎 브릿지 사선 축',
          cueKo: '갈비뼈가 과하게 튀어나오지 않게 닫고 둔근·햄스트링으로 골반을 받칩니다.',
          kind: 'axis-line',
          from: pt(92, 138),
          to: pt(234, 82),
          targetAngleDeg: 22,
          cautionKo: '허리를 꺾어 높이를 만들거나 목에 체중을 싣지 않습니다.',
        },
      ],
      end: [
        {
          id: 'bridge-roll-down-zone',
          labelKo: '흉추→요추 순차 분절 착지 구간',
          cueKo: '엉덩이가 먼저 떨어지지 않게 아랫배 스쿱을 끝까지 유지합니다.',
          kind: 'neutral-zone',
          from: pt(124, 136),
          to: pt(184, 144),
          cautionKo: '요추 구간을 통째로 쿵 내려놓지 않도록 속도를 늦춥니다.',
        },
      ],
    },
    directionVectors: {
      start: [
        {
          id: 'vec-bridge-tilt',
          labelKo: '꼬리뼈 컬업 시작',
          kind: 'spine-articulation',
          points: [pt(184, 144), pt(180, 128)],
          phaseScope: 'start',
        },
      ],
      middle: [
        {
          id: 'vec-bridge-lift',
          labelKo: '골반 수직 리프트 & 무릎 사선 리치',
          kind: 'spine-articulation',
          points: [pt(184, 144), pt(184, 96), pt(234, 82)],
          phaseScope: 'start-to-middle',
        },
      ],
      end: [
        {
          id: 'vec-bridge-articulate-down',
          labelKo: '윗등→천골 순차 분절 하강',
          kind: 'return-control',
          points: [pt(124, 122), pt(154, 138), pt(184, 144)],
          phaseScope: 'middle-to-end',
        },
      ],
    },
    poseDeltaSummary: {
      startToMiddleKo: '골반(pelvis)과 고관절(hip)이 바닥(y:144)에서 사선 정점(y:94~96)으로 50px 수직 상승합니다.',
      middleToEndKo: '흉추→요추→골반 순서로 분절 하강하며 시작 지지선(y:144)으로 안정 복귀합니다.',
      invariantAnchorsKo: '머리(head), 어깨(shoulder), 발뒤꿈치(heel) 3점 앵커가 지지면을 단단히 지킵니다.',
      keyJointChangeKo: '골반·고관절 수직 리프트(Δ50px) 및 요추-흉추 분절 곡선 변화',
    },
  },
  {
    archetypeId: 'supine-heel-slide-ankle',
    archetypeTitleKo: '수파인 힐 슬라이드 & 발목 플렉스·포인트',
    muscles: {
      primary: 'core-transversus',
      extraPrimary: 'calves',
      stabilizer: 'rectus-obliques',
      lengthening: 'hamstrings',
    },
    fixedAnchorJoints: [
      { joint: 'head', defaultSurfaceKo: '매트/테이블 머리 지지면' },
      { joint: 'pelvis', defaultSurfaceKo: '천골 수평 고정 앵커' },
      { joint: 'thoracic', defaultSurfaceKo: '등 상부 고정 지지면' },
    ],
    movingJoints: ['knee', 'ankle', 'heel', 'toe'],
    startJoints: makeJointMap({
      head: { x: 54, y: 140 },
      neck: { x: 72, y: 140 },
      shoulder: { x: 92, y: 140 },
      elbow: { x: 126, y: 144 },
      wrist: { x: 158, y: 146 },
      hand: { x: 170, y: 146 },
      thoracic: { x: 124, y: 140 },
      lumbar: { x: 154, y: 138 },
      pelvis: { x: 182, y: 142 },
      hip: { x: 192, y: 142 },
      knee: { x: 224, y: 102 },
      ankle: { x: 248, y: 146 },
      heel: { x: 244, y: 150 },
      toe: { x: 262, y: 146 },
      farKnee: { x: 220, y: 104 },
      farAnkle: { x: 244, y: 146 },
    }),
    middleJoints: makeJointMap({
      head: { x: 54, y: 140 },
      neck: { x: 72, y: 140 },
      shoulder: { x: 92, y: 140 },
      elbow: { x: 126, y: 144 },
      wrist: { x: 158, y: 146 },
      hand: { x: 170, y: 146 },
      thoracic: { x: 124, y: 140 },
      lumbar: { x: 154, y: 138 },
      pelvis: { x: 182, y: 142 },
      hip: { x: 192, y: 142 },
      knee: { x: 242, y: 136 },
      ankle: { x: 284, y: 144 },
      heel: { x: 280, y: 150 },
      toe: { x: 298, y: 138 },
      farKnee: { x: 220, y: 104 },
      farAnkle: { x: 244, y: 146 },
    }),
    endJoints: makeJointMap({
      head: { x: 54, y: 140 },
      neck: { x: 72, y: 140 },
      shoulder: { x: 92, y: 140 },
      elbow: { x: 126, y: 144 },
      wrist: { x: 158, y: 146 },
      hand: { x: 170, y: 146 },
      thoracic: { x: 124, y: 140 },
      lumbar: { x: 154, y: 138 },
      pelvis: { x: 182, y: 142 },
      hip: { x: 192, y: 142 },
      knee: { x: 226, y: 106 },
      ankle: { x: 252, y: 146 },
      heel: { x: 248, y: 150 },
      toe: { x: 268, y: 142 },
      farKnee: { x: 220, y: 104 },
      farAnkle: { x: 244, y: 146 },
    }),
    carriageOffsets: [0, 0, 0],
    pedalAngles: [0, 0, 0],
    phaseTitlesKo: ['골반 중립 세팅 · 무릎 굴곡 준비', '뒤꿈치 수평 슬라이드 · 발목 배측굴곡', '코어 제어로 뒤꿈치 회수 복귀'],
    phaseSummariesKo: [
      '요추 아래 자연스러운 중립 터널을 유지한 채 양발을 지지면에 안정적으로 둡니다.',
      '몸통과 골반이 전혀 기울지 않도록 복횡근을 조이며 뒤꿈치를 바닥/테이블 끝으로 길게 밀어냅니다.',
      '하복부 끌어당김으로 무릎을 부드럽게 접어 시작 위치로 회수합니다.',
    ],
    breathCuesKo: [
      '들숨: 골반 좌우 수평과 갈비뼈 안정 확인',
      '날숨: 아랫배를 단단히 유지하며 뒤꿈치 멀리 슬라이드 & 발끝 당기기',
      '들숨: 허리 공간 변화 없이 천천히 발뒤꿈치 회수',
    ],
    alignments: {
      start: [
        {
          id: 'heel-slide-pelvis-lock',
          labelKo: '요추-골반 중립 고정 구간',
          cueKo: '다리 움직임 전 골반 삼각형이 바닥과 수평인지 확인합니다.',
          kind: 'neutral-zone',
          from: pt(154, 138),
          to: pt(182, 142),
          cautionKo: '시작 전부터 허리를 바닥에 과하게 누르지 않습니다.',
        },
      ],
      middle: [
        {
          id: 'heel-slide-leg-axis',
          labelKo: '고관절-무릎-발목 수평 신전선',
          cueKo: '다리를 뻗을 때 요추가 따라 들리지 않는 범위까지만 슬라이드합니다.',
          kind: 'axis-line',
          from: pt(192, 142),
          to: pt(284, 144),
          cautionKo: '다리를 끝까지 펴면서 골반이 전방경사로 딸려가지 않게 주의합니다.',
        },
      ],
      end: [
        {
          id: 'heel-slide-return-lock',
          labelKo: '천골 고정 복귀 앵커',
          cueKo: '다리를 당겨올 때 반대쪽 지지 다리가 흔들리지 않게 유지합니다.',
          kind: 'anchor-lock',
          from: pt(182, 142),
          to: pt(252, 146),
          cautionKo: '고관절 전면만 집히지 않도록 복부 지지를 먼저 씁니다.',
        },
      ],
    },
    directionVectors: {
      start: [
        {
          id: 'vec-heel-prep',
          labelKo: '복횡근 사전 수축',
          kind: 'axial-lengthening',
          points: [pt(154, 138), pt(124, 140)],
          phaseScope: 'start',
        },
      ],
      middle: [
        {
          id: 'vec-heel-slide-out',
          labelKo: '발뒤꿈치 수평 슬라이드 & 발목 리치',
          kind: 'limb-excursion',
          points: [pt(244, 150), pt(280, 150), pt(298, 138)],
          phaseScope: 'start-to-middle',
        },
      ],
      end: [
        {
          id: 'vec-heel-slide-in',
          labelKo: '무릎 굴곡 제어 복귀',
          kind: 'return-control',
          points: [pt(280, 150), pt(248, 150)],
          phaseScope: 'middle-to-end',
        },
      ],
    },
    poseDeltaSummary: {
      startToMiddleKo: '몸통(lumbar·pelvis)은 고정된 채 무릎이 펴지며 뒤꿈치(heel)가 x:244→280으로 수평 슬라이드합니다.',
      middleToEndKo: '발목 정렬을 유지하며 무릎(knee)이 다시 굴곡되어 시작 지지 위치로 돌아옵니다.',
      invariantAnchorsKo: '머리(head), 흉추(thoracic), 골반(pelvis) 앵커가 1px도 흔들리지 않고 유지됩니다.',
      keyJointChangeKo: '슬관절 신전 및 발뒤꿈치 수평 이동(heel Δ36px, knee Δ38px)',
    },
  },
  {
    archetypeId: 'supine-knee-fold',
    archetypeTitleKo: '수파인 니 폴드 (테이블탑 고관절 분리 제어)',
    muscles: {
      primary: 'hip-flexor-iliopsoas',
      extraPrimary: 'core-transversus',
      stabilizer: 'rectus-obliques',
      lengthening: 'glute-max',
    },
    fixedAnchorJoints: [
      { joint: 'head', defaultSurfaceKo: '매트/테이블 후두부 지지면' },
      { joint: 'thoracic', defaultSurfaceKo: '흉곽 후면 지지면' },
      { joint: 'pelvis', defaultSurfaceKo: '천골 수평 고정점' },
    ],
    movingJoints: ['knee', 'ankle', 'heel', 'toe'],
    startJoints: makeJointMap({
      head: { x: 54, y: 140 },
      neck: { x: 72, y: 140 },
      shoulder: { x: 92, y: 140 },
      elbow: { x: 126, y: 144 },
      wrist: { x: 158, y: 146 },
      hand: { x: 170, y: 146 },
      thoracic: { x: 124, y: 140 },
      lumbar: { x: 154, y: 138 },
      pelvis: { x: 184, y: 142 },
      hip: { x: 194, y: 142 },
      knee: { x: 226, y: 102 },
      ankle: { x: 256, y: 146 },
      heel: { x: 252, y: 150 },
      toe: { x: 270, y: 148 },
      farKnee: { x: 224, y: 102 },
      farAnkle: { x: 254, y: 146 },
    }),
    middleJoints: makeJointMap({
      head: { x: 54, y: 140 },
      neck: { x: 72, y: 140 },
      shoulder: { x: 92, y: 140 },
      elbow: { x: 126, y: 144 },
      wrist: { x: 158, y: 146 },
      hand: { x: 170, y: 146 },
      thoracic: { x: 124, y: 140 },
      lumbar: { x: 154, y: 138 },
      pelvis: { x: 184, y: 142 },
      hip: { x: 194, y: 142 },
      knee: { x: 194, y: 92 },
      ankle: { x: 238, y: 92 },
      heel: { x: 234, y: 96 },
      toe: { x: 250, y: 88 },
      farKnee: { x: 224, y: 102 },
      farAnkle: { x: 254, y: 146 },
    }),
    endJoints: makeJointMap({
      head: { x: 54, y: 140 },
      neck: { x: 72, y: 140 },
      shoulder: { x: 92, y: 140 },
      elbow: { x: 126, y: 144 },
      wrist: { x: 158, y: 146 },
      hand: { x: 170, y: 146 },
      thoracic: { x: 124, y: 140 },
      lumbar: { x: 154, y: 138 },
      pelvis: { x: 184, y: 142 },
      hip: { x: 194, y: 142 },
      knee: { x: 222, y: 100 },
      ankle: { x: 252, y: 142 },
      heel: { x: 248, y: 148 },
      toe: { x: 266, y: 146 },
      farKnee: { x: 224, y: 102 },
      farAnkle: { x: 254, y: 146 },
    }),
    carriageOffsets: [0, 0, 0],
    pedalAngles: [0, 0, 0],
    phaseTitlesKo: ['수파인 골반 중립 · 양발 지지', '90-90 테이블탑 니 폴드 리프트', '골반 흔들림 없는 소프트 터치 복귀'],
    phaseSummariesKo: [
      '양쪽 골반(ASIS) 위에 물컵을 올려둔 듯 수평을 맞추고 복부 심부 긴장을 준비합니다.',
      '고관절 소켓 안에서 대퇴골만 부드럽게 접어 올려 무릎-고관절 90도 테이블탑을 만듭니다.',
      '다리를 내려놓을 때 허리가 들뜨지 않게 복횡근으로 브레이크를 걸며 발을 사뿐히 착지합니다.',
    ],
    breathCuesKo: [
      '들숨: 갈비뼈 뒷면을 매트에 넓게 펼치며 코어 준비',
      '날숨: 발의 무게를 덜어내며 고관절 수직 위까지 니 폴드',
      '들숨/날숨: 골반이 좌우로 기우뚱하지 않게 제어하며 착지',
    ],
    alignments: {
      start: [
        {
          id: 'knee-fold-pelvis-base',
          labelKo: '천골-요추 수평 안정 축',
          cueKo: '한 발을 들기 전 반대쪽 발바닥과 천골 지지력을 먼저 확인합니다.',
          kind: 'anchor-lock',
          from: pt(154, 138),
          to: pt(184, 142),
          cautionKo: '다리를 들기 직전 골반이 지지 다리 쪽으로 밀리지 않게 합니다.',
        },
      ],
      middle: [
        {
          id: 'knee-fold-90-angle',
          labelKo: '고관절-무릎-발목 90° 테이블탑',
          cueKo: '무릎이 고관절 수직선(x:194) 바로 위에 오고 정강이는 바닥과 평행합니다.',
          kind: 'angle-arc',
          from: pt(194, 142),
          to: pt(238, 92),
          targetAngleDeg: 90,
          cautionKo: '무릎을 가슴 쪽으로 과하게 당겨 요추가 말리지 않게 합니다.',
        },
      ],
      end: [
        {
          id: 'knee-fold-return-control',
          labelKo: '요추 중립 유지 하강선',
          cueKo: '발끝이 바닥에 닿을 때까지 아랫배 납작한 연결을 유지합니다.',
          kind: 'neutral-zone',
          from: pt(154, 138),
          to: pt(252, 142),
          cautionKo: '다리를 내리는 순간 허리가 아치형으로 들뜨지 않게 주의합니다.',
        },
      ],
    },
    directionVectors: {
      start: [
        {
          id: 'vec-kneefold-core-brace',
          labelKo: '심부 복횡근 선행 수축',
          kind: 'axial-lengthening',
          points: [pt(184, 142), pt(154, 138)],
          phaseScope: 'start',
        },
      ],
      middle: [
        {
          id: 'vec-kneefold-up',
          labelKo: '고관절 90° 테이블탑 리프트',
          kind: 'limb-excursion',
          points: [pt(256, 146), pt(238, 92), pt(194, 92)],
          phaseScope: 'start-to-middle',
        },
      ],
      end: [
        {
          id: 'vec-kneefold-down',
          labelKo: '편심성 고관절 하강 착지',
          kind: 'return-control',
          points: [pt(238, 92), pt(252, 142)],
          phaseScope: 'middle-to-end',
        },
      ],
    },
    poseDeltaSummary: {
      startToMiddleKo: '골반(pelvis) 고정 상태에서 무릎(x:226→194, y:102→92)과 발목(y:146→92)이 90도 테이블탑으로 들어 올려집니다.',
      middleToEndKo: '요추 중립을 유지한 채 발목과 뒤꿈치가 바닥(y:142~148)으로 사뿐히 내려옵니다.',
      invariantAnchorsKo: '머리(head), 흉추(thoracic), 골반(pelvis) 및 반대측 지지 다리가 고정됩니다.',
      keyJointChangeKo: '고관절 90° 굴곡(knee Δ34px, ankle Δ57px) 및 정강이 수평 정렬',
    },
  },
  {
    archetypeId: 'supine-chest-lift-curl',
    archetypeTitleKo: '수파인 체스트 리프트 · 롤업 & 푸쉬스루 티저 분절',
    muscles: {
      primary: 'rectus-obliques',
      extraPrimary: 'core-transversus',
      stabilizer: 'latissimus-serratus',
      lengthening: 'thoracic-extensors',
    },
    fixedAnchorJoints: [
      { joint: 'pelvis', defaultSurfaceKo: '천골/좌골 중앙 고정 지지면' },
      { joint: 'lumbar', defaultSurfaceKo: '요추 임프린트·코르셋 지지대' },
    ],
    movingJoints: ['head', 'neck', 'shoulder', 'thoracic', 'elbow', 'wrist', 'hand', 'knee'],
    startJoints: makeJointMap({
      head: { x: 52, y: 138 },
      neck: { x: 70, y: 140 },
      shoulder: { x: 92, y: 140 },
      elbow: { x: 96, y: 108 },
      wrist: { x: 104, y: 80 },
      hand: { x: 108, y: 70 },
      thoracic: { x: 122, y: 140 },
      lumbar: { x: 154, y: 140 },
      pelvis: { x: 184, y: 142 },
      hip: { x: 194, y: 142 },
      knee: { x: 226, y: 98 },
      ankle: { x: 258, y: 144 },
      heel: { x: 254, y: 150 },
      toe: { x: 272, y: 148 },
    }),
    middleJoints: makeJointMap({
      head: { x: 84, y: 92 },
      neck: { x: 98, y: 104 },
      shoulder: { x: 112, y: 116 },
      elbow: { x: 148, y: 104 },
      wrist: { x: 184, y: 96 },
      hand: { x: 196, y: 94 },
      thoracic: { x: 132, y: 130 },
      lumbar: { x: 154, y: 140 },
      pelvis: { x: 184, y: 142 },
      hip: { x: 194, y: 140 },
      knee: { x: 214, y: 88 },
      ankle: { x: 254, y: 116 },
      heel: { x: 250, y: 122 },
      toe: { x: 268, y: 112 },
    }),
    endJoints: makeJointMap({
      head: { x: 58, y: 132 },
      neck: { x: 74, y: 136 },
      shoulder: { x: 94, y: 138 },
      elbow: { x: 112, y: 118 },
      wrist: { x: 132, y: 106 },
      hand: { x: 142, y: 102 },
      thoracic: { x: 124, y: 140 },
      lumbar: { x: 154, y: 140 },
      pelvis: { x: 184, y: 142 },
      hip: { x: 194, y: 142 },
      knee: { x: 226, y: 98 },
      ankle: { x: 258, y: 144 },
      heel: { x: 254, y: 150 },
      toe: { x: 272, y: 148 },
    }),
    carriageOffsets: [0, 8, 0],
    pedalAngles: [0, 0, 0],
    phaseTitlesKo: ['수파인 경추 노드를 포함한 코어 준비', '흉추 굴곡 체스트 리프트 · 컬업 정점', '갈비뼈부터 마디마디 분절 하강'],
    phaseSummariesKo: [
      '턱 끝을 가볍게 당겨 뒷목을 길게 만들고 갈비뼈와 골반 연결을 세팅합니다.',
      '날숨에 흉골을 골반 쪽으로 미끄러뜨리며 견갑골 하각이 떨어질 때까지 상체를 들어 올립니다.',
      '복부 코르셋 텐션을 놓지 않고 등 상부부터 뒤통수까지 순차적으로 매트에 내려놓습니다.',
    ],
    breathCuesKo: [
      '들숨: 뒷목 길이를 늘리며 턱 밑 계란 하나 공간 확보',
      '날숨: 명치를 깊게 닫으며 복부 스쿱으로 상체 컬업',
      '들숨/날숨: 어깨 긴장 없이 등 마디마디 컨트롤 하강',
    ],
    alignments: {
      start: [
        {
          id: 'chestlift-neck-prep',
          labelKo: '경추 크래니오-버테브랄 굴곡 축',
          cueKo: '머리를 들기 전 시선을 무릎 쪽으로 낮춰 심부 경추 굴곡근을 먼저 깨웁니다.',
          kind: 'axis-line',
          from: pt(52, 138),
          to: pt(122, 140),
          cautionKo: '턱을 앞으로 내밀며 목 앞쪽 근육으로만 당기지 않습니다.',
        },
      ],
      middle: [
        {
          id: 'chestlift-thoracic-arc',
          labelKo: '견갑골 하각 컬업 & 요추 지지 곡선',
          cueKo: '윗배는 접히고 아랫배는 납작하게 매트를 누르는 C-커브를 유지합니다.',
          kind: 'angle-arc',
          from: pt(84, 92),
          to: pt(184, 142),
          targetAngleDeg: 35,
          cautionKo: '골반이 과하게 말려 꼬리뼈가 들리지 않도록 천골을 무겁게 둡니다.',
        },
      ],
      end: [
        {
          id: 'chestlift-eccentric-return',
          labelKo: '흉추 분절 복귀선',
          cueKo: '머리가 툭 떨어지지 않게 복직근 편심성 제어로 내려옵니다.',
          kind: 'neutral-zone',
          from: pt(74, 136),
          to: pt(154, 140),
          cautionKo: '하강 마지막 순간 갈비뼈가 들뜨지 않게 닫아줍니다.',
        },
      ],
    },
    directionVectors: {
      start: [
        {
          id: 'vec-chin-nod',
          labelKo: '가벼운 턱 당김(Chin Nod)',
          kind: 'spine-articulation',
          points: [pt(52, 138), pt(64, 124)],
          phaseScope: 'start',
        },
      ],
      middle: [
        {
          id: 'vec-chest-curl-up',
          labelKo: '상체 컬업 & 팔 전방 리치',
          kind: 'spine-articulation',
          points: [pt(52, 138), pt(84, 92), pt(196, 94)],
          phaseScope: 'start-to-middle',
        },
      ],
      end: [
        {
          id: 'vec-chest-roll-down',
          labelKo: '흉추→후두부 제어 하강',
          kind: 'return-control',
          points: [pt(84, 92), pt(58, 132)],
          phaseScope: 'middle-to-end',
        },
      ],
    },
    poseDeltaSummary: {
      startToMiddleKo: '머리(x:52→84, y:138→92)와 어깨(y:140→116)가 상방 굴곡하며 손끝이 전방(x:196,y:94)으로 길게 뻗습니다.',
      middleToEndKo: '천골(pelvis) 앵커를 유지한 채 상체가 순차적으로 하강(head y:92→132)합니다.',
      invariantAnchorsKo: '골반(pelvis)과 요추(lumbar) 하단 중심 지지점은 바닥에 단단히 고정됩니다.',
      keyJointChangeKo: '상부 흉추 굴곡(head Δ56px, shoulder Δ31px) 및 상지 전방 리치(hand Δ91px)',
    },
  },
  {
    archetypeId: 'supine-leg-stretch-hundred',
    archetypeTitleKo: '수파인 헌드레드 · 앱 파이브 & 상하체 협응 스트레치',
    muscles: {
      primary: 'rectus-obliques',
      extraPrimary: 'hip-flexor-iliopsoas',
      stabilizer: 'core-transversus',
      lengthening: 'hamstrings',
    },
    fixedAnchorJoints: [
      { joint: 'lumbar', defaultSurfaceKo: '요추-천골 임프린트 코어 지지면' },
      { joint: 'pelvis', defaultSurfaceKo: '골반 후방 안정 앵커' },
    ],
    movingJoints: ['head', 'shoulder', 'elbow', 'wrist', 'hand', 'knee', 'ankle', 'toe'],
    startJoints: makeJointMap({
      head: { x: 76, y: 104 },
      neck: { x: 90, y: 114 },
      shoulder: { x: 106, y: 124 },
      elbow: { x: 136, y: 118 },
      wrist: { x: 168, y: 112 },
      hand: { x: 180, y: 110 },
      thoracic: { x: 128, y: 136 },
      lumbar: { x: 156, y: 142 },
      pelvis: { x: 184, y: 142 },
      hip: { x: 194, y: 140 },
      knee: { x: 194, y: 92 },
      ankle: { x: 236, y: 92 },
      heel: { x: 232, y: 96 },
      toe: { x: 248, y: 88 },
      farKnee: { x: 186, y: 96 },
      farAnkle: { x: 228, y: 96 },
    }),
    middleJoints: makeJointMap({
      head: { x: 82, y: 96 },
      neck: { x: 96, y: 108 },
      shoulder: { x: 112, y: 120 },
      elbow: { x: 150, y: 132 },
      wrist: { x: 188, y: 134 },
      hand: { x: 202, y: 134 },
      thoracic: { x: 132, y: 134 },
      lumbar: { x: 156, y: 142 },
      pelvis: { x: 184, y: 142 },
      hip: { x: 194, y: 140 },
      knee: { x: 238, y: 104 },
      ankle: { x: 278, y: 74 },
      heel: { x: 274, y: 80 },
      toe: { x: 292, y: 66 },
      farKnee: { x: 184, y: 90 },
      farAnkle: { x: 218, y: 94 },
    }),
    endJoints: makeJointMap({
      head: { x: 76, y: 104 },
      neck: { x: 90, y: 114 },
      shoulder: { x: 106, y: 124 },
      elbow: { x: 138, y: 116 },
      wrist: { x: 170, y: 108 },
      hand: { x: 182, y: 106 },
      thoracic: { x: 128, y: 136 },
      lumbar: { x: 156, y: 142 },
      pelvis: { x: 184, y: 142 },
      hip: { x: 194, y: 140 },
      knee: { x: 196, y: 92 },
      ankle: { x: 238, y: 92 },
      heel: { x: 234, y: 96 },
      toe: { x: 250, y: 88 },
      farKnee: { x: 190, y: 94 },
      farAnkle: { x: 232, y: 94 },
    }),
    carriageOffsets: [4, 28, 6],
    pedalAngles: [0, 0, 0],
    phaseTitlesKo: ['컬업 & 테이블탑 코어 준비', '45° 레그 익스텐션 & 스트랩/암 펌핑 정점', '컬업 높이 유지 · 테이블탑 회수'],
    phaseSummariesKo: [
      '견갑골 하각까지 상체를 들어 올리고 두 다리를 테이블탑에 두어 파워하우스를 압축합니다.',
      '허리가 매트에서 뜨지 않도록 배꼽을 강하게 당기며 다리를 45도 사선으로 뻗고 팔을 골반 옆으로 길게 뻗어냅니다.',
      '상체 컬업 높이가 무너지지 않게 유지하면서 무릎을 다시 테이블탑으로 정교하게 접어옵니다.',
    ],
    breathCuesKo: [
      '들숨: 코어 긴장 유지하며 흉곽 후면으로 호흡',
      '날숨(또는 5카운트 펌핑): 아랫배를 매트로 누르며 다리 사선 리치',
      '들숨: 상체 높이를 지킨 채 무릎을 가슴/테이블탑으로 회수',
    ],
    alignments: {
      start: [
        {
          id: 'hundred-curl-height',
          labelKo: '견갑골 하각 컬업 유지선',
          cueKo: '시선은 허벅지 안쪽을 향하고 목이 아닌 상복부 힘으로 버팁니다.',
          kind: 'neutral-zone',
          from: pt(76, 104),
          to: pt(156, 142),
          cautionKo: '목에 피로가 오면 머리를 내리고 다리 각도를 높여 진행합니다.',
        },
      ],
      middle: [
        {
          id: 'hundred-45-leg-vector',
          labelKo: '골반-무릎-발끝 45° 사선 지렛대',
          cueKo: '다리를 뻗을수록 요추가 매트에 더 단단히 밀착되어야 합니다.',
          kind: 'axis-line',
          from: pt(194, 140),
          to: pt(292, 66),
          targetAngleDeg: 45,
          cautionKo: '허리가 뜨면 즉시 다리 각도를 천장 쪽(60~75도)으로 높입니다.',
        },
      ],
      end: [
        {
          id: 'hundred-tabletop-recovery',
          labelKo: '테이블탑 회수 & 코어 브레이크',
          cueKo: '무릎을 접어올 때 상체가 바닥으로 떨어지지 않게 유지합니다.',
          kind: 'anchor-lock',
          from: pt(112, 120),
          to: pt(196, 92),
          cautionKo: '스프링 반동으로 팔과 다리가 급격히 돌아오지 않게 제어합니다.',
        },
      ],
    },
    directionVectors: {
      start: [
        {
          id: 'vec-hundred-set',
          labelKo: '복부 스쿱 압착',
          kind: 'spine-articulation',
          points: [pt(132, 134), pt(156, 142)],
          phaseScope: 'start',
        },
      ],
      middle: [
        {
          id: 'vec-leg-reach-45',
          labelKo: '다리 45° 사선 뻗기',
          kind: 'limb-excursion',
          points: [pt(236, 92), pt(278, 74), pt(292, 66)],
          phaseScope: 'start-to-middle',
        },
        {
          id: 'vec-arm-press-pump',
          labelKo: '골반 옆 스트랩 프레스 & 펌핑',
          kind: 'spring-resistance',
          points: [pt(180, 110), pt(202, 134)],
          phaseScope: 'middle',
        },
      ],
      end: [
        {
          id: 'vec-leg-fold-back',
          labelKo: '테이블탑 무릎 회수',
          kind: 'return-control',
          points: [pt(278, 74), pt(238, 92)],
          phaseScope: 'middle-to-end',
        },
      ],
    },
    poseDeltaSummary: {
      startToMiddleKo: '요추(lumbar)와 골반(pelvis)은 고정된 채 발끝(toe)이 x:248,y:88에서 45도 사선(x:292,y:66)으로 뻗고 손이 골반 옆(x:202,y:134)으로 프레스됩니다.',
      middleToEndKo: '상체 컬업을 유지한 상태에서 다리가 테이블탑(ankle x:238,y:92)으로 제어 복귀합니다.',
      invariantAnchorsKo: '요추(lumbar)와 천골(pelvis) 중심 지지점이 매트/캐리지에 밀착 고정됩니다.',
      keyJointChangeKo: '하지 45° 사선 신전(ankle Δ46px, toe Δ49px) + 상지 스트랩 하방 프레스(hand Δ32px)',
    },
  },
  {
    archetypeId: 'supine-strap-arm-press',
    archetypeTitleKo: '수파인 스트랩 · 암 스프링 프레스 (광배·전거근 연결)',
    muscles: {
      primary: 'latissimus-serratus',
      extraPrimary: 'shoulder-deltoid',
      stabilizer: 'core-transversus',
      lengthening: 'thoracic-extensors',
    },
    fixedAnchorJoints: [
      { joint: 'head', defaultSurfaceKo: '헤드레스트/매트 후두부 지지면' },
      { joint: 'thoracic', defaultSurfaceKo: '견갑골 평면 지지대' },
      { joint: 'pelvis', defaultSurfaceKo: '천골 중립 고정점' },
    ],
    movingJoints: ['elbow', 'wrist', 'hand'],
    startJoints: makeJointMap({
      head: { x: 54, y: 138 },
      neck: { x: 72, y: 140 },
      shoulder: { x: 94, y: 138 },
      elbow: { x: 100, y: 98 },
      wrist: { x: 104, y: 60 },
      hand: { x: 106, y: 48 },
      thoracic: { x: 124, y: 140 },
      lumbar: { x: 154, y: 138 },
      pelvis: { x: 184, y: 142 },
      hip: { x: 194, y: 140 },
      knee: { x: 196, y: 94 },
      ankle: { x: 238, y: 94 },
      heel: { x: 234, y: 98 },
      toe: { x: 250, y: 90 },
    }),
    middleJoints: makeJointMap({
      head: { x: 54, y: 138 },
      neck: { x: 72, y: 140 },
      shoulder: { x: 94, y: 138 },
      elbow: { x: 134, y: 134 },
      wrist: { x: 172, y: 136 },
      hand: { x: 186, y: 136 },
      thoracic: { x: 124, y: 140 },
      lumbar: { x: 154, y: 138 },
      pelvis: { x: 184, y: 142 },
      hip: { x: 194, y: 140 },
      knee: { x: 196, y: 94 },
      ankle: { x: 238, y: 94 },
      heel: { x: 234, y: 98 },
      toe: { x: 250, y: 90 },
    }),
    endJoints: makeJointMap({
      head: { x: 54, y: 138 },
      neck: { x: 72, y: 140 },
      shoulder: { x: 94, y: 138 },
      elbow: { x: 106, y: 104 },
      wrist: { x: 114, y: 68 },
      hand: { x: 116, y: 56 },
      thoracic: { x: 124, y: 140 },
      lumbar: { x: 154, y: 138 },
      pelvis: { x: 184, y: 142 },
      hip: { x: 194, y: 140 },
      knee: { x: 196, y: 94 },
      ankle: { x: 238, y: 94 },
      heel: { x: 234, y: 98 },
      toe: { x: 250, y: 90 },
    }),
    carriageOffsets: [2, 24, 4],
    pedalAngles: [0, 0, 0],
    phaseTitlesKo: ['수직 어깨 위 스트랩/스프링 준비', '광배근 하강 · 골반 옆 수평 암 프레스', '견갑 안정 유지 · 90° 천장 복귀'],
    phaseSummariesKo: [
      '손목이 꺾이지 않게 스트랩/핸들을 쥐고 어깨 수직선 위에서 견갑골을 넓게 펴줍니다.',
      '겨드랑이 아래 광배근과 전거근 힘으로 손끝을 골반 옆 매트 쪽으로 길게 끌어내립니다.',
      '스프링 장력에 어깨가 귀 쪽으로 끌려가지 않도록 저항하며 천천히 시작 각도로 돌아옵니다.',
    ],
    breathCuesKo: [
      '들숨: 쇄골을 옆으로 넓히고 날개뼈 뒷면을 매트에 밀착',
      '날숨: 갈비뼈를 닫으며 손끝을 골반 옆으로 길게 프레스 다운',
      '들숨: 겨드랑이 텐션을 유지하며 어깨 수직선까지만 천천히 복귀',
    ],
    alignments: {
      start: [
        {
          id: 'armpress-shoulder-vertical',
          labelKo: '어깨-팔꿈치-손목 수직 정렬선',
          cueKo: '손이 어깨보다 머리 뒤로 넘어가지 않게 90도 수직선에서 시작합니다.',
          kind: 'plumb-line',
          from: pt(94, 138),
          to: pt(106, 48),
          targetAngleDeg: 90,
          cautionKo: '스트랩 장력에 어깨가 숄더레스트 쪽으로 말려 올라가지 않게 합니다.',
        },
      ],
      middle: [
        {
          id: 'armpress-lat-lock',
          labelKo: '견갑 하강-골반 수평 프레스 축',
          cueKo: '손을 끝까지 내렸을 때도 어깨 앞쪽이 바닥에서 들뜨지 않아야 합니다.',
          kind: 'axis-line',
          from: pt(94, 138),
          to: pt(186, 136),
          cautionKo: '팔꿈치만 과신전하거나 손목을 꺾어 누르지 않습니다.',
        },
      ],
      end: [
        {
          id: 'armpress-return-zone',
          labelKo: '편심성 상지 복귀 제어 구간',
          cueKo: '돌아오는 내내 흉곽 하단이 들리지 않게 복부로 고정합니다.',
          kind: 'neutral-zone',
          from: pt(94, 138),
          to: pt(116, 56),
          cautionKo: '스프링이 툭 풀리지 않도록 일정한 카운트로 되돌립니다.',
        },
      ],
    },
    directionVectors: {
      start: [
        {
          id: 'vec-scapula-set',
          labelKo: '견갑골 하강 세팅',
          kind: 'axial-lengthening',
          points: [pt(94, 138), pt(124, 140)],
          phaseScope: 'start',
        },
      ],
      middle: [
        {
          id: 'vec-strap-press-down',
          labelKo: '스트랩/스프링 하방 아크 프레스',
          kind: 'spring-resistance',
          points: [pt(106, 48), pt(164, 88), pt(186, 136)],
          phaseScope: 'start-to-middle',
        },
      ],
      end: [
        {
          id: 'vec-strap-return-up',
          labelKo: '어깨 수직선 편심성 복귀',
          kind: 'return-control',
          points: [pt(186, 136), pt(156, 88), pt(116, 56)],
          phaseScope: 'middle-to-end',
        },
      ],
    },
    poseDeltaSummary: {
      startToMiddleKo: '몸통과 테이블탑 다리는 고정된 채 손(hand)이 천장(x:106,y:48)에서 골반 옆(x:186,y:136)으로 90도 원호 하강합니다.',
      middleToEndKo: '스프링 장력을 제어하며 손목과 팔꿈치가 다시 어깨 위(x:116,y:56)로 복귀합니다.',
      invariantAnchorsKo: '머리(head), 견갑·흉추(thoracic), 골반(pelvis) 3대 몸통 앵커가 완전 고정됩니다.',
      keyJointChangeKo: '견관절 신전 아크(hand Δ119px, wrist Δ102px) 및 캐리지/스프링 연동',
    },
  },
  {
    archetypeId: 'supine-feet-in-straps',
    archetypeTitleKo: '핏인스트랩 · 레그 스프링 프로그 & 레그 써클',
    muscles: {
      primary: 'adductors',
      extraPrimary: 'glute-max',
      stabilizer: 'core-transversus',
      lengthening: 'hamstrings',
    },
    fixedAnchorJoints: [
      { joint: 'head', defaultSurfaceKo: '헤드레스트/매트 중앙 지지면' },
      { joint: 'thoracic', defaultSurfaceKo: '양측 견갑골 대칭 고정면' },
      { joint: 'pelvis', defaultSurfaceKo: '천골(Sacrum) 무거운 앵커' },
    ],
    movingJoints: ['knee', 'ankle', 'heel', 'toe'],
    startJoints: makeJointMap({
      head: { x: 54, y: 138 },
      neck: { x: 72, y: 140 },
      shoulder: { x: 94, y: 140 },
      elbow: { x: 128, y: 144 },
      wrist: { x: 160, y: 146 },
      hand: { x: 172, y: 146 },
      thoracic: { x: 124, y: 140 },
      lumbar: { x: 154, y: 140 },
      pelvis: { x: 184, y: 142 },
      hip: { x: 194, y: 140 },
      knee: { x: 182, y: 92 },
      ankle: { x: 214, y: 74 },
      heel: { x: 210, y: 80 },
      toe: { x: 226, y: 66 },
      farKnee: { x: 188, y: 86 },
      farAnkle: { x: 214, y: 74 },
    }),
    middleJoints: makeJointMap({
      head: { x: 54, y: 138 },
      neck: { x: 72, y: 140 },
      shoulder: { x: 94, y: 140 },
      elbow: { x: 128, y: 144 },
      wrist: { x: 160, y: 146 },
      hand: { x: 172, y: 146 },
      thoracic: { x: 124, y: 140 },
      lumbar: { x: 154, y: 140 },
      pelvis: { x: 184, y: 142 },
      hip: { x: 194, y: 140 },
      knee: { x: 242, y: 108 },
      ankle: { x: 284, y: 80 },
      heel: { x: 280, y: 86 },
      toe: { x: 296, y: 72 },
      farKnee: { x: 242, y: 106 },
      farAnkle: { x: 284, y: 80 },
    }),
    endJoints: makeJointMap({
      head: { x: 54, y: 138 },
      neck: { x: 72, y: 140 },
      shoulder: { x: 94, y: 140 },
      elbow: { x: 128, y: 144 },
      wrist: { x: 160, y: 146 },
      hand: { x: 172, y: 146 },
      thoracic: { x: 124, y: 140 },
      lumbar: { x: 154, y: 140 },
      pelvis: { x: 184, y: 142 },
      hip: { x: 194, y: 140 },
      knee: { x: 204, y: 76 },
      ankle: { x: 222, y: 40 },
      heel: { x: 218, y: 46 },
      toe: { x: 234, y: 32 },
      farKnee: { x: 208, y: 74 },
      farAnkle: { x: 222, y: 40 },
    }),
    carriageOffsets: [6, 36, 12],
    pedalAngles: [0, 0, 0],
    phaseTitlesKo: ['프로그 준비 · 뒤꿈치 V 밀착 & 천골 고정', '45° 사선 내전 프레스 · 중심선 지퍼 연결', '천골 뜨지 않는 범위까지 햄스트링 리프트'],
    phaseSummariesKo: [
      '발아치에 스트랩을 걸고 뒤꿈치를 붙인 필라테스 V 프로그 자세에서 꼬리뼈를 매트에 무겁게 내립니다.',
      '허벅지 안쪽 내전근과 둔근 힘으로 두 다리를 45도 사선 앞으로 길게 뻗어 중심선을 밀착합니다.',
      '꼬리뼈가 바닥에서 말려 올라오지 않는 한계점까지 다리를 천장 쪽으로 들어 올려 후면 사슬을 신장합니다.',
    ],
    breathCuesKo: [
      '들숨: 천골을 바닥에 뿌리내리고 고관절 소켓 이완',
      '날숨: 뒤꿈치끼리 조이며 45도 사선으로 길게 프레스 아웃',
      '들숨: 골반 중립을 지킨 채 스트랩 장력을 따라 부드럽게 리프트/써클',
    ],
    alignments: {
      start: [
        {
          id: 'straps-sacrum-anchor',
          labelKo: '천골(Sacrum) 바닥 밀착 앵커',
          cueKo: '무릎을 접었을 때 엉덩이가 바닥에서 들리지 않는 각도에서 시작합니다.',
          kind: 'anchor-lock',
          from: pt(154, 140),
          to: pt(184, 142),
          cautionKo: '꼬리뼈가 말려 올라가면 요추 디스크에 압박이 가해집니다.',
        },
      ],
      middle: [
        {
          id: 'straps-inner-thigh-zip',
          labelKo: '내전근 중심선(Midline) 45° 축',
          cueKo: '뒤꿈치부터 허벅지 안쪽 상단까지 지퍼를 채우듯 모아 뻗어냅니다.',
          kind: 'axis-line',
          from: pt(194, 140),
          to: pt(284, 80),
          targetAngleDeg: 45,
          cautionKo: '다리를 너무 낮게 내려 허리가 아치형으로 뜨지 않게 주의합니다.',
        },
      ],
      end: [
        {
          id: 'straps-lift-limit',
          labelKo: '골반 중립 유지 햄스트링 리프트 한계선',
          cueKo: '대퇴골두만 소켓 안에서 굴러가도록 하고 골반은 수평을 유지합니다.',
          kind: 'angle-arc',
          from: pt(194, 140),
          to: pt(222, 40),
          targetAngleDeg: 75,
          cautionKo: '숏스파인 연결 시에는 반드시 헤드레스트를 Flat으로 내립니다.',
        },
      ],
    },
    directionVectors: {
      start: [
        {
          id: 'vec-frog-heels-together',
          labelKo: '뒤꿈치 V 밀착 준비',
          kind: 'axial-lengthening',
          points: [pt(182, 92), pt(210, 80)],
          phaseScope: 'start',
        },
      ],
      middle: [
        {
          id: 'vec-straps-press-out',
          labelKo: '45° 사선 프로그 프레스 & 캐리지 이동',
          kind: 'spring-resistance',
          points: [pt(214, 74), pt(252, 78), pt(284, 80)],
          phaseScope: 'start-to-middle',
        },
      ],
      end: [
        {
          id: 'vec-straps-circle-up',
          labelKo: '상방 리프트 & 레그 써클 원호',
          kind: 'return-control',
          points: [pt(284, 80), pt(256, 48), pt(222, 40)],
          phaseScope: 'middle-to-end',
        },
      ],
    },
    poseDeltaSummary: {
      startToMiddleKo: '천골(pelvis)을 고정한 채 무릎(x:182→242)과 발목(x:214→284)이 45도 사선으로 길게 뻗어집니다.',
      middleToEndKo: '사선 정점(x:284,y:80)에서 고관절 굴곡 아크를 따라 천장 방향(x:222,y:40)으로 리프트 및 복귀합니다.',
      invariantAnchorsKo: '머리(head), 흉추(thoracic), 천골(pelvis)이 캐리지/매트 위에 무겁게 고정됩니다.',
      keyJointChangeKo: '프로그 신전(ankle Δ70px) → 상방 아크 리프트(ankle y:80→40) 및 내전/신장 교차',
    },
  },
  {
    archetypeId: 'reformer-supine-footwork',
    archetypeTitleKo: '리포머 수파인 풋워크 (패럴렐 · V · 와이드 · 카프)',
    muscles: {
      primary: 'quadriceps',
      extraPrimary: 'glute-max',
      stabilizer: 'core-transversus',
      lengthening: 'calves',
    },
    fixedAnchorJoints: [
      { joint: 'heel', defaultSurfaceKo: '풋바(Footbar) 고정 접촉점' },
      { joint: 'toe', defaultSurfaceKo: '풋바 발볼·발가락 지지점' },
    ],
    movingJoints: ['head', 'shoulder', 'thoracic', 'lumbar', 'pelvis', 'hip', 'knee'],
    startJoints: makeJointMap({
      head: { x: 86, y: 136 },
      neck: { x: 102, y: 140 },
      shoulder: { x: 120, y: 140 },
      elbow: { x: 150, y: 144 },
      wrist: { x: 180, y: 146 },
      hand: { x: 190, y: 146 },
      thoracic: { x: 148, y: 140 },
      lumbar: { x: 176, y: 140 },
      pelvis: { x: 204, y: 142 },
      hip: { x: 212, y: 140 },
      knee: { x: 242, y: 94 },
      ankle: { x: 278, y: 132 },
      heel: { x: 276, y: 138 },
      toe: { x: 292, y: 124 },
      farKnee: { x: 238, y: 90 },
      farAnkle: { x: 274, y: 130 },
    }),
    middleJoints: makeJointMap({
      head: { x: 42, y: 136 },
      neck: { x: 58, y: 140 },
      shoulder: { x: 76, y: 140 },
      elbow: { x: 106, y: 144 },
      wrist: { x: 136, y: 146 },
      hand: { x: 146, y: 146 },
      thoracic: { x: 104, y: 140 },
      lumbar: { x: 132, y: 140 },
      pelvis: { x: 160, y: 142 },
      hip: { x: 168, y: 140 },
      knee: { x: 224, y: 134 },
      ankle: { x: 278, y: 132 },
      heel: { x: 276, y: 138 },
      toe: { x: 292, y: 124 },
      farKnee: { x: 220, y: 130 },
      farAnkle: { x: 274, y: 130 },
    }),
    endJoints: makeJointMap({
      head: { x: 78, y: 136 },
      neck: { x: 94, y: 140 },
      shoulder: { x: 112, y: 140 },
      elbow: { x: 142, y: 144 },
      wrist: { x: 172, y: 146 },
      hand: { x: 182, y: 146 },
      thoracic: { x: 140, y: 140 },
      lumbar: { x: 168, y: 140 },
      pelvis: { x: 196, y: 142 },
      hip: { x: 204, y: 140 },
      knee: { x: 238, y: 98 },
      ankle: { x: 278, y: 132 },
      heel: { x: 276, y: 138 },
      toe: { x: 292, y: 124 },
      farKnee: { x: 234, y: 94 },
      farAnkle: { x: 274, y: 130 },
    }),
    carriageOffsets: [0, 44, 8],
    pedalAngles: [0, 0, 0],
    phaseTitlesKo: ['홈 포지션 · 고관절-무릎-발목 정렬 세팅', '캐리지 프레스 아웃 · 하지 신전 정점', '마지막 5cm 편심성 브레이크 복귀'],
    phaseSummariesKo: [
      '풋바에 발뒤꿈치/발볼을 대칭으로 올리고 두 번째 발가락-슬개골-ASIS 라인을 일치시킵니다.',
      '양발의 균등한 압력으로 캐리지를 밀어내어 무릎을 잠그지 않고 허벅지 안쪽과 둔근을 길게 연결합니다.',
      '스프링 장력에 끌려가지 않도록 허벅지 뒤쪽과 코어로 감속하며 조용히 홈 직전까지 돌아옵니다.',
    ],
    breathCuesKo: [
      '들숨: 중립 골반과 쇄골 수평 정렬 확인',
      '날숨: 정수리가 반대쪽 벽으로 길어지듯 캐리지 프레스 아웃',
      '들숨: 스토퍼가 쿵 부딪히지 않게 속근육 브레이크로 복귀',
    ],
    alignments: {
      start: [
        {
          id: 'footwork-knee-track',
          labelKo: '고관절-슬개골-제2족지 정렬 축',
          cueKo: '무릎이 안쪽(X자)이나 바깥쪽으로 흔들리지 않게 트래킹을 고정합니다.',
          kind: 'axis-line',
          from: pt(212, 140),
          to: pt(278, 132),
          cautionKo: '좌우 다리 미는 힘이 달라 골반이 회전하지 않도록 주의합니다.',
        },
      ],
      middle: [
        {
          id: 'footwork-full-extension',
          labelKo: '하지 수평 신전 & 캐리지 활주 축',
          cueKo: '무릎 관절을 과신전(Locking)하지 말고 대퇴사두근·내전근으로 지탱합니다.',
          kind: 'neutral-zone',
          from: pt(76, 140),
          to: pt(278, 132),
          targetAngleDeg: 178,
          cautionKo: '캐리지를 밀 때 어깨가 숄더블록에 과하게 눌리지 않게 합니다.',
        },
      ],
      end: [
        {
          id: 'footwork-stopper-control',
          labelKo: '스토퍼 직전 편심성 감속 구간',
          cueKo: '고관절이 부드럽게 접히며 요추 중립 터널이 그대로 유지됩니다.',
          kind: 'anchor-lock',
          from: pt(196, 142),
          to: pt(276, 138),
          cautionKo: '복귀 마지막에 골반이 말리거나 캐리지가 쿵 소리를 내지 않게 합니다.',
        },
      ],
    },
    directionVectors: {
      start: [
        {
          id: 'vec-footbar-anchor',
          labelKo: '풋바 반발력 세팅',
          kind: 'spring-resistance',
          points: [pt(278, 132), pt(242, 94)],
          phaseScope: 'start',
        },
      ],
      middle: [
        {
          id: 'vec-carriage-glide-out',
          labelKo: '캐리지 수평 활주(44px) & 무릎 신전',
          kind: 'carriage-travel',
          points: [pt(204, 142), pt(160, 142)],
          phaseScope: 'start-to-middle',
        },
      ],
      end: [
        {
          id: 'vec-carriage-glide-in',
          labelKo: '스프링 저항 감속 복귀',
          kind: 'return-control',
          points: [pt(160, 142), pt(196, 142)],
          phaseScope: 'middle-to-end',
        },
      ],
    },
    poseDeltaSummary: {
      startToMiddleKo: '발(ankle·heel)은 풋바(x:276~278)에 고정된 채 무릎이 펴지며 몸통과 골반(x:204→160)이 캐리지와 함께 44px 활주합니다.',
      middleToEndKo: '무릎(knee y:134→98)이 다시 굴곡되며 캐리지가 감속 복귀(pelvis x:160→196)합니다.',
      invariantAnchorsKo: '풋바 위의 발목(ankle), 뒤꿈치(heel), 발끝(toe) 접촉점이 기준 앵커로 유지됩니다.',
      keyJointChangeKo: '슬관절 굴곡→신전(knee Δ44px) + 캐리지 전신 수평 활주(pelvis/head Δ44px)',
    },
  },
  {
    archetypeId: 'chair-seated-pedal-footwork',
    archetypeTitleKo: '운다 체어 시티드 페달 프레스 & 교대 풋워크',
    muscles: {
      primary: 'quadriceps',
      extraPrimary: 'hip-flexor-iliopsoas',
      stabilizer: 'core-transversus',
      lengthening: 'hamstrings',
    },
    fixedAnchorJoints: [
      { joint: 'head', defaultSurfaceKo: '정수리 천장 수직 축' },
      { joint: 'thoracic', defaultSurfaceKo: '흉곽 수직 기둥 정렬' },
      { joint: 'pelvis', defaultSurfaceKo: '체어 시트 양측 좌골(Sit-bones) 앵커' },
    ],
    movingJoints: ['knee', 'ankle', 'heel', 'toe'],
    startJoints: makeJointMap({
      head: { x: 122, y: 34 },
      neck: { x: 122, y: 52 },
      shoulder: { x: 122, y: 68 },
      elbow: { x: 146, y: 92 },
      wrist: { x: 168, y: 92 },
      hand: { x: 178, y: 90 },
      thoracic: { x: 120, y: 92 },
      lumbar: { x: 120, y: 112 },
      pelvis: { x: 122, y: 128 },
      hip: { x: 132, y: 128 },
      knee: { x: 186, y: 98 },
      ankle: { x: 204, y: 136 },
      heel: { x: 198, y: 140 },
      toe: { x: 218, y: 134 },
      farKnee: { x: 182, y: 102 },
      farAnkle: { x: 200, y: 138 },
    }),
    middleJoints: makeJointMap({
      head: { x: 122, y: 34 },
      neck: { x: 122, y: 52 },
      shoulder: { x: 122, y: 68 },
      elbow: { x: 146, y: 92 },
      wrist: { x: 168, y: 92 },
      hand: { x: 178, y: 90 },
      thoracic: { x: 120, y: 92 },
      lumbar: { x: 120, y: 112 },
      pelvis: { x: 122, y: 128 },
      hip: { x: 132, y: 128 },
      knee: { x: 196, y: 132 },
      ankle: { x: 218, y: 168 },
      heel: { x: 212, y: 172 },
      toe: { x: 232, y: 166 },
      farKnee: { x: 184, y: 104 },
      farAnkle: { x: 202, y: 140 },
    }),
    endJoints: makeJointMap({
      head: { x: 122, y: 34 },
      neck: { x: 122, y: 52 },
      shoulder: { x: 122, y: 68 },
      elbow: { x: 146, y: 92 },
      wrist: { x: 168, y: 92 },
      hand: { x: 178, y: 90 },
      thoracic: { x: 120, y: 92 },
      lumbar: { x: 120, y: 112 },
      pelvis: { x: 122, y: 128 },
      hip: { x: 132, y: 128 },
      knee: { x: 188, y: 104 },
      ankle: { x: 206, y: 142 },
      heel: { x: 200, y: 146 },
      toe: { x: 220, y: 140 },
      farKnee: { x: 182, y: 102 },
      farAnkle: { x: 200, y: 138 },
    }),
    carriageOffsets: [0, 0, 0],
    pedalAngles: [8, 36, 12],
    phaseTitlesKo: ['체어 시트 좌골 수직 정렬 · 페달 상단 세팅', '척추 타워 고정 · 페달 하방 프레스 정점', '스프링 반동 제어 · 페달 상단 복귀'],
    phaseSummariesKo: [
      '두 좌골을 체어 시트에 수직으로 꽂아 앉고 정수리를 천장으로 길게 세워 코어를 깨웁니다.',
      '상체가 뒤로 기대거나 앞으로 무너지지 않게 유지하며 허벅지와 둔근 힘으로 페달을 바닥 쪽으로 밀어 내립니다.',
      '페달이 올라올 때 다리가 튕겨 올라오지 않도록 고관절 굴곡을 세밀하게 제어하며 복귀합니다.',
    ],
    breathCuesKo: [
      '들숨: 좌골 위로 척추를 한 마디씩 높게 세우기',
      '날숨: 정수리는 위로, 페달은 아래로 양방향 대조(Opposition) 프레스',
      '들숨: 허벅지 뒤쪽과 아랫배 브레이크로 페달 상승 제어',
    ],
    alignments: {
      start: [
        {
          id: 'chair-seated-plumb',
          labelKo: '귀-어깨-흉곽-좌골 수직 추선(Plumb Line)',
          cueKo: '페달이 가장 높은 위치에서도 요추가 둥글게 말리지 않게 세웁니다.',
          kind: 'plumb-line',
          from: pt(122, 34),
          to: pt(122, 128),
          targetAngleDeg: 90,
          cautionKo: '고관절 굴곡근만 과긴장되지 않도록 아랫배를 위로 끌어올립니다.',
        },
      ],
      middle: [
        {
          id: 'chair-pedal-press-arc',
          labelKo: '고관절-무릎-발목 페달 하강 정렬',
          cueKo: '페달을 밟아 내리는 동안 골반 무게중심이 시트 중앙에 그대로 머뭅니다.',
          kind: 'angle-arc',
          from: pt(132, 128),
          to: pt(218, 168),
          targetAngleDeg: 130,
          cautionKo: '페달을 누를 때 상체가 함께 앞으로 숙여지지 않게 주의합니다.',
        },
      ],
      end: [
        {
          id: 'chair-pedal-return-lock',
          labelKo: '좌골 고정 & 페달 감속 복귀',
          cueKo: '상단 복귀 시 무릎 높이를 일정한 리듬으로 컨트롤합니다.',
          kind: 'anchor-lock',
          from: pt(122, 128),
          to: pt(188, 104),
          cautionKo: '페달 아래에 손이나 발이 들어가지 않도록 안전을 확인합니다.',
        },
      ],
    },
    directionVectors: {
      start: [
        {
          id: 'vec-chair-axial-tall',
          labelKo: '정수리 상방 축성 신장',
          kind: 'axial-lengthening',
          points: [pt(122, 128), pt(122, 34)],
          phaseScope: 'start',
        },
      ],
      middle: [
        {
          id: 'vec-chair-pedal-down',
          labelKo: '페달 하방 아크 프레스(36°)',
          kind: 'spring-resistance',
          points: [pt(204, 136), pt(218, 168)],
          phaseScope: 'start-to-middle',
        },
      ],
      end: [
        {
          id: 'vec-chair-pedal-up',
          labelKo: '페달 상방 감속 복귀',
          kind: 'return-control',
          points: [pt(218, 168), pt(206, 142)],
          phaseScope: 'middle-to-end',
        },
      ],
    },
    poseDeltaSummary: {
      startToMiddleKo: '머리부터 좌골(x:120~122)까지 상체 수직 기둥은 고정된 채 무릎(y:98→132)과 발목(y:136→168)이 페달을 밟아 하강합니다.',
      middleToEndKo: '스프링 반발력을 제어하며 무릎(y:132→104)과 발목(y:168→142)이 상단으로 복귀합니다.',
      invariantAnchorsKo: '머리(head), 흉추(thoracic), 좌골(pelvis) 수직 축이 시트 위에 고정됩니다.',
      keyJointChangeKo: '페달 하방 프레스에 따른 슬관절·족관절 하강(knee Δ35px, ankle Δ35px)',
    },
  },
  {
    archetypeId: 'seated-row-arm-arc',
    archetypeTitleKo: '시티드 로잉 · 암 리치 & 쉐이브/써브 어 트레이',
    muscles: {
      primary: 'latissimus-serratus',
      extraPrimary: 'shoulder-deltoid',
      stabilizer: 'core-transversus',
      lengthening: 'thoracic-extensors',
    },
    fixedAnchorJoints: [
      { joint: 'pelvis', defaultSurfaceKo: '매트/박스/체어 좌골 수직 지지면' },
      { joint: 'heel', defaultSurfaceKo: '바닥/캐리지 발 고정점' },
    ],
    movingJoints: ['shoulder', 'elbow', 'wrist', 'hand', 'thoracic'],
    startJoints: makeJointMap({
      head: { x: 132, y: 36 },
      neck: { x: 132, y: 54 },
      shoulder: { x: 132, y: 72 },
      elbow: { x: 162, y: 92 },
      wrist: { x: 194, y: 88 },
      hand: { x: 206, y: 86 },
      thoracic: { x: 130, y: 96 },
      lumbar: { x: 130, y: 118 },
      pelvis: { x: 132, y: 138 },
      hip: { x: 142, y: 138 },
      knee: { x: 192, y: 136 },
      ankle: { x: 242, y: 142 },
      heel: { x: 242, y: 148 },
      toe: { x: 256, y: 134 },
    }),
    middleJoints: makeJointMap({
      head: { x: 130, y: 34 },
      neck: { x: 130, y: 52 },
      shoulder: { x: 126, y: 70 },
      elbow: { x: 102, y: 96 },
      wrist: { x: 118, y: 106 },
      hand: { x: 128, y: 106 },
      thoracic: { x: 128, y: 92 },
      lumbar: { x: 130, y: 116 },
      pelvis: { x: 132, y: 138 },
      hip: { x: 142, y: 138 },
      knee: { x: 192, y: 136 },
      ankle: { x: 242, y: 142 },
      heel: { x: 242, y: 148 },
      toe: { x: 256, y: 134 },
    }),
    endJoints: makeJointMap({
      head: { x: 132, y: 36 },
      neck: { x: 132, y: 54 },
      shoulder: { x: 132, y: 70 },
      elbow: { x: 168, y: 66 },
      wrist: { x: 204, y: 56 },
      hand: { x: 216, y: 52 },
      thoracic: { x: 130, y: 94 },
      lumbar: { x: 130, y: 118 },
      pelvis: { x: 132, y: 138 },
      hip: { x: 142, y: 138 },
      knee: { x: 192, y: 136 },
      ankle: { x: 242, y: 142 },
      heel: { x: 242, y: 148 },
      toe: { x: 256, y: 134 },
    }),
    carriageOffsets: [4, 26, 14],
    pedalAngles: [0, 0, 0],
    phaseTitlesKo: ['좌골 수직 탑 세팅 · 전방 암 리치 준비', '견갑 리트랙션 · 시티드 로우 당김 정점', '상방 암 아크 / 써브 어 트레이 확장 마무리'],
    phaseSummariesKo: [
      '좌골 두 개를 바닥/박스에 균등하게 내려놓고 척추를 정수리까지 수직으로 길게 세웁니다.',
      '승모근이 솟지 않게 쇄골을 옆으로 열면서 팔꿈치를 몸통 뒤로 보내 날개뼈 아래쪽을 조여줍니다.',
      '복부 지지로 몸통이 뒤로 밀리지 않게 버티며 팔을 사선 위/앞으로 우아하게 뻗어 마무리합니다.',
    ],
    breathCuesKo: [
      '들숨: 좌골 지지 확인 및 정수리 천장 리치',
      '날숨: 날개뼈를 뒷주머니 쪽으로 끌어내리며 로잉/스트랩 당김',
      '들숨/날숨: 갈비뼈를 닫은 채 팔을 앞으로/사선 위로 길게 확장',
    ],
    alignments: {
      start: [
        {
          id: 'seated-row-vertical-spine',
          labelKo: '정수리-흉곽-좌골 수직 정렬 축',
          cueKo: '햄스트링이 타이트하면 무릎을 살짝 구부리거나 양반다리로 먼저 척추를 세웁니다.',
          kind: 'plumb-line',
          from: pt(132, 36),
          to: pt(132, 138),
          targetAngleDeg: 90,
          cautionKo: '팔을 뻗을 때 등 상부가 둥글게 말리지 않게 합니다.',
        },
      ],
      middle: [
        {
          id: 'seated-row-scapula-draw',
          labelKo: '견갑골 내전·하강 로잉 라인',
          cueKo: '팔꿈치를 뒤로 보낼 때 가슴은 열리고 허리는 꺾이지 않아야 합니다.',
          kind: 'axis-line',
          from: pt(126, 70),
          to: pt(102, 96),
          cautionKo: '어깨가 귀 쪽으로 으쓱 올라가지 않게 하부승모근을 씁니다.',
        },
      ],
      end: [
        {
          id: 'seated-row-serve-tray',
          labelKo: '써브 어 트레이 / 더 쉐이브 상지 사선 리치',
          cueKo: '팔이 몸에서 멀어질수록 복횡근을 더 깊게 조여 척추 기둥을 지킵니다.',
          kind: 'angle-arc',
          from: pt(132, 70),
          to: pt(216, 52),
          targetAngleDeg: 110,
          cautionKo: '팔 무게와 스프링 장력에 몸통이 뒤로 젖혀지지 않게 합니다.',
        },
      ],
    },
    directionVectors: {
      start: [
        {
          id: 'vec-seated-tall',
          labelKo: '척추 수직 세우기',
          kind: 'axial-lengthening',
          points: [pt(132, 138), pt(132, 36)],
          phaseScope: 'start',
        },
      ],
      middle: [
        {
          id: 'vec-row-pull-back',
          labelKo: '팔꿈치 후방 로우 & 견갑 수축',
          kind: 'spring-resistance',
          points: [pt(206, 86), pt(162, 92), pt(102, 96)],
          phaseScope: 'start-to-middle',
        },
      ],
      end: [
        {
          id: 'vec-arm-arc-reach',
          labelKo: '전상방 트레이/쉐이브 리치 확장',
          kind: 'limb-excursion',
          points: [pt(128, 106), pt(168, 66), pt(216, 52)],
          phaseScope: 'middle-to-end',
        },
      ],
    },
    poseDeltaSummary: {
      startToMiddleKo: '좌골(pelvis)과 다리(heel)는 고정된 채 팔꿈치(x:162→102)와 손(x:206→128)이 몸통 뒤로 당겨지며 견갑이 수축합니다.',
      middleToEndKo: '몸통 수직 축을 유지하며 손끝이 전상방 사선(x:216,y:52)으로 길게 확장됩니다.',
      invariantAnchorsKo: '좌골(pelvis)과 발뒤꿈치(heel) 하체 기저면이 흔들림 없이 고정됩니다.',
      keyJointChangeKo: '견관절·주관절 로잉 굴곡(hand Δ80px, elbow Δ60px) 및 상방 리치',
    },
  },
];

const ARCHETYPE_BLUEPRINTS_PART_B: readonly ArchetypeRigBlueprint[] = [
  {
    archetypeId: 'seated-roll-back-spine-twist',
    archetypeTitleKo: '시티드 롤백 · 숏박스 앱 & 흉곽 회전(트위스트)',
    muscles: {
      primary: 'rectus-obliques',
      extraPrimary: 'hip-flexor-iliopsoas',
      stabilizer: 'core-transversus',
      lengthening: 'thoracic-extensors',
    },
    fixedAnchorJoints: [
      { joint: 'pelvis', defaultSurfaceKo: '숏박스/테이블/바렐 좌골 후방 지지면' },
      { joint: 'ankle', defaultSurfaceKo: '풋 스트랩/래더/바닥 발목 고정점' },
      { joint: 'heel', defaultSurfaceKo: '지지면 뒤꿈치 고정 앵커' },
    ],
    movingJoints: ['head', 'neck', 'shoulder', 'thoracic', 'lumbar', 'elbow', 'wrist', 'hand'],
    startJoints: makeJointMap({
      head: { x: 142, y: 38 },
      neck: { x: 142, y: 56 },
      shoulder: { x: 142, y: 74 },
      elbow: { x: 170, y: 88 },
      wrist: { x: 196, y: 82 },
      hand: { x: 206, y: 80 },
      thoracic: { x: 140, y: 96 },
      lumbar: { x: 142, y: 118 },
      pelvis: { x: 146, y: 138 },
      hip: { x: 156, y: 138 },
      knee: { x: 208, y: 122 },
      ankle: { x: 258, y: 142 },
      heel: { x: 256, y: 148 },
      toe: { x: 272, y: 136 },
    }),
    middleJoints: makeJointMap({
      head: { x: 92, y: 64 },
      neck: { x: 104, y: 78 },
      shoulder: { x: 114, y: 92 },
      elbow: { x: 148, y: 96 },
      wrist: { x: 180, y: 92 },
      hand: { x: 192, y: 90 },
      thoracic: { x: 120, y: 112 },
      lumbar: { x: 132, y: 128 },
      pelvis: { x: 146, y: 138 },
      hip: { x: 156, y: 138 },
      knee: { x: 208, y: 122 },
      ankle: { x: 258, y: 142 },
      heel: { x: 256, y: 148 },
      toe: { x: 272, y: 136 },
      farShoulder: { x: 104, y: 86 },
      farWrist: { x: 168, y: 78 },
    }),
    endJoints: makeJointMap({
      head: { x: 138, y: 36 },
      neck: { x: 138, y: 54 },
      shoulder: { x: 138, y: 72 },
      elbow: { x: 168, y: 78 },
      wrist: { x: 198, y: 72 },
      hand: { x: 210, y: 70 },
      thoracic: { x: 138, y: 94 },
      lumbar: { x: 140, y: 116 },
      pelvis: { x: 146, y: 138 },
      hip: { x: 156, y: 138 },
      knee: { x: 208, y: 122 },
      ankle: { x: 258, y: 142 },
      heel: { x: 256, y: 148 },
      toe: { x: 272, y: 136 },
    }),
    carriageOffsets: [0, 4, 0],
    pedalAngles: [0, 0, 0],
    phaseTitlesKo: ['시티드 탑 세팅 · 발 스트랩/지지 고정', '하프 롤백 C-커브 & 흉곽 오블리크 회전', '복부 스쿱으로 좌골 위 수직 복귀'],
    phaseSummariesKo: [
      '두 발을 스트랩/바닥에 단단히 고정하고 좌골 위에 척추를 수직으로 세워 시작합니다.',
      '꼬리뼈를 말아 아랫배를 등 쪽으로 깊게 파내며 하프 롤백하거나 양쪽 좌골 무게를 지킨 채 흉곽만 회전합니다.',
      '어깨가 먼저 따라오지 않도록 복부 스쿱(Scoop) 힘을 유지하며 좌골 위로 척추를 다시 세웁니다.',
    ],
    breathCuesKo: [
      '들숨: 정수리를 천장으로 세우며 골반-갈비뼈 간격 확보',
      '날숨: 배꼽을 등 뒤로 당기며 롤백 또는 갈비뼈 회전 리치',
      '들숨/날숨: 아랫배를 파내며 좌골 수직선 위로 복귀',
    ],
    alignments: {
      start: [
        {
          id: 'rollback-sitbone-stack',
          labelKo: '좌골-흉곽-정수리 수직 탑 정렬',
          cueKo: '양쪽 엉덩이 무게중심을 50:50으로 맞추고 어깨 긴장을 내립니다.',
          kind: 'plumb-line',
          from: pt(142, 38),
          to: pt(146, 138),
          targetAngleDeg: 90,
          cautionKo: '시작 자세부터 등 상부가 굽어 있지 않게 세팅합니다.',
        },
      ],
      middle: [
        {
          id: 'rollback-c-curve-arc',
          labelKo: '요추 C-커브 롤백 & 복사근 회전 축',
          cueKo: '다리와 골반이 밀리지 않게 고정하고 요추 분절 또는 흉추 회전을 만듭니다.',
          kind: 'angle-arc',
          from: pt(92, 64),
          to: pt(146, 138),
          targetAngleDeg: 125,
          cautionKo: '요추 디스크 이슈 시 둥근 C-커브 대신 중립 플랫백 힌지로 대체합니다.',
        },
      ],
      end: [
        {
          id: 'rollback-scoop-return',
          labelKo: '하복부 스쿱 수직 복귀선',
          cueKo: '정수리가 천장으로 길어지며 좌골 바로 위로 올라옵니다.',
          kind: 'axis-line',
          from: pt(138, 36),
          to: pt(146, 138),
          cautionKo: '고관절 굴곡근만으로 상체를 튕겨 올라오지 않게 합니다.',
        },
      ],
    },
    directionVectors: {
      start: [
        {
          id: 'vec-rollback-anchor-feet',
          labelKo: '발 스트랩/지지면 앵커 잠금',
          kind: 'axial-lengthening',
          points: [pt(146, 138), pt(258, 142)],
          phaseScope: 'start',
        },
      ],
      middle: [
        {
          id: 'vec-rollback-curve',
          labelKo: '꼬리뼈 컬 & 상체 후방 롤백/트위스트',
          kind: 'spine-articulation',
          points: [pt(142, 38), pt(114, 52), pt(92, 64)],
          phaseScope: 'start-to-middle',
        },
      ],
      end: [
        {
          id: 'vec-rollback-return',
          labelKo: '복부 스쿱 상방 복귀',
          kind: 'return-control',
          points: [pt(92, 64), pt(118, 48), pt(138, 36)],
          phaseScope: 'middle-to-end',
        },
      ],
    },
    poseDeltaSummary: {
      startToMiddleKo: '골반(pelvis)과 발목(ankle)은 고정된 채 머리(x:142→92, y:38→64)와 흉추(x:140→120)가 후방 C-커브/회전으로 이동합니다.',
      middleToEndKo: '복직근·복사근 수축으로 상체가 다시 좌골 수직선(head x:138,y:36)으로 복귀합니다.',
      invariantAnchorsKo: '좌골(pelvis), 발목(ankle), 뒤꿈치(heel) 하체 고정점이 흔들리지 않습니다.',
      keyJointChangeKo: '요추·흉추 후방 굴곡 및 회전(head Δ56px, shoulder Δ33px)',
    },
  },
  {
    archetypeId: 'kneeling-chest-expansion-triceps',
    archetypeTitleKo: '닐링 체스트 익스팬션 · 롤다운 바 & 트라이셉스/스트레치',
    muscles: {
      primary: 'latissimus-serratus',
      extraPrimary: 'shoulder-deltoid',
      stabilizer: 'glute-max',
      lengthening: 'hip-flexor-iliopsoas',
    },
    fixedAnchorJoints: [
      { joint: 'knee', defaultSurfaceKo: '캐리지/매트 양무릎 수직 지지점' },
      { joint: 'ankle', defaultSurfaceKo: '정강이·발등 바닥 지지선' },
    ],
    movingJoints: ['shoulder', 'elbow', 'wrist', 'hand', 'thoracic', 'head'],
    startJoints: makeJointMap({
      head: { x: 146, y: 30 },
      neck: { x: 146, y: 48 },
      shoulder: { x: 146, y: 66 },
      elbow: { x: 174, y: 88 },
      wrist: { x: 202, y: 92 },
      hand: { x: 214, y: 92 },
      thoracic: { x: 146, y: 88 },
      lumbar: { x: 146, y: 108 },
      pelvis: { x: 146, y: 124 },
      hip: { x: 148, y: 126 },
      knee: { x: 150, y: 162 },
      ankle: { x: 112, y: 166 },
      heel: { x: 106, y: 160 },
      toe: { x: 98, y: 168 },
    }),
    middleJoints: makeJointMap({
      head: { x: 148, y: 28 },
      neck: { x: 148, y: 46 },
      shoulder: { x: 144, y: 66 },
      elbow: { x: 124, y: 94 },
      wrist: { x: 108, y: 120 },
      hand: { x: 102, y: 130 },
      thoracic: { x: 148, y: 86 },
      lumbar: { x: 148, y: 108 },
      pelvis: { x: 148, y: 124 },
      hip: { x: 150, y: 126 },
      knee: { x: 150, y: 162 },
      ankle: { x: 112, y: 166 },
      heel: { x: 106, y: 160 },
      toe: { x: 98, y: 168 },
      farWrist: { x: 116, y: 118 },
    }),
    endJoints: makeJointMap({
      head: { x: 146, y: 30 },
      neck: { x: 146, y: 48 },
      shoulder: { x: 146, y: 66 },
      elbow: { x: 164, y: 92 },
      wrist: { x: 188, y: 96 },
      hand: { x: 198, y: 96 },
      thoracic: { x: 146, y: 88 },
      lumbar: { x: 146, y: 108 },
      pelvis: { x: 146, y: 124 },
      hip: { x: 148, y: 126 },
      knee: { x: 150, y: 162 },
      ankle: { x: 112, y: 166 },
      heel: { x: 106, y: 160 },
      toe: { x: 98, y: 168 },
    }),
    carriageOffsets: [2, 26, 6],
    pedalAngles: [0, 0, 0],
    phaseTitlesKo: ['톨 닐링(Tall Kneeling) 골반-척추 수직 정렬', '체스트 익스팬션 · 골반 뒤 스트랩/바 당김 정점', '몸통 흔들림 없는 편심성 복귀'],
    phaseSummariesKo: [
      '무릎 위 골반-흉곽-머리를 일직선으로 세우고 둔근과 복부를 조여 전면 고관절을 펴줍니다.',
      '쇄골을 옆으로 활짝 열며 스트랩/바를 골반 뒤쪽으로 당겨 광배근·삼두근·능형근을 강하게 수축합니다.',
      '스프링 장력에 상체가 앞으로 끌려가지 않도록 둔근과 코어로 버티며 시작 각도로 돌아옵니다.',
    ],
    breathCuesKo: [
      '들숨: 무릎으로 바닥을 누르며 정수리 길게 세우기',
      '들숨 홀드 또는 날숨: 가슴을 활짝 열고 스트랩을 골반 뒤로 프레스',
      '날숨: 갈비뼈를 닫으며 천천히 스트랩 원위치 복귀',
    ],
    alignments: {
      start: [
        {
          id: 'kneeling-vertical-pillar',
          labelKo: '무릎-고관절-어깨-귀 톨 닐링 수직 축',
          cueKo: '엉덩이가 뒤로 빠지지 않도록 치골을 살짝 앞으로 밀어 둔근을 켭니다.',
          kind: 'plumb-line',
          from: pt(146, 30),
          to: pt(150, 162),
          targetAngleDeg: 90,
          cautionKo: '무릎이 예민하면 패드를 덧대거나 로우 닐링으로 낮춥니다.',
        },
      ],
      middle: [
        {
          id: 'kneeling-expansion-line',
          labelKo: '견갑 하강 & 상완 신전(Expansion) 라인',
          cueKo: '팔을 뒤로 보낼 때 어깨가 앞으로 말리지 않고 날개뼈가 평평하게 모입니다.',
          kind: 'axis-line',
          from: pt(144, 66),
          to: pt(102, 130),
          cautionKo: '팔을 뒤로 당기면서 허리를 과신전해 배를 내밀지 않습니다.',
        },
      ],
      end: [
        {
          id: 'kneeling-return-brace',
          labelKo: '전방 장력 저항 코어 고정선',
          cueKo: '팔이 앞으로 돌아올 때 몸통이 흔들리지 않게 정강이 지지를 유지합니다.',
          kind: 'anchor-lock',
          from: pt(146, 124),
          to: pt(150, 162),
          cautionKo: '스프링이 놓이듯 빠르게 복귀하지 않도록 주의합니다.',
        },
      ],
    },
    directionVectors: {
      start: [
        {
          id: 'vec-kneel-hip-open',
          labelKo: '둔근 수축 & 고관절 전면 오픈',
          kind: 'axial-lengthening',
          points: [pt(150, 162), pt(146, 30)],
          phaseScope: 'start',
        },
      ],
      middle: [
        {
          id: 'vec-chest-expand-pull',
          labelKo: '스트랩 후하방 프레스 & 삼두 신전',
          kind: 'spring-resistance',
          points: [pt(214, 92), pt(158, 114), pt(102, 130)],
          phaseScope: 'start-to-middle',
        },
      ],
      end: [
        {
          id: 'vec-chest-expand-return',
          labelKo: '전방 스트랩 감속 복귀',
          kind: 'return-control',
          points: [pt(102, 130), pt(154, 110), pt(198, 96)],
          phaseScope: 'middle-to-end',
        },
      ],
    },
    poseDeltaSummary: {
      startToMiddleKo: '무릎(knee)과 발목(ankle) 기저면 위에서 손(x:214→102, y:92→130)과 팔꿈치(x:174→124)가 몸통 뒤로 크게 당겨집니다.',
      middleToEndKo: '몸통 수직 기둥을 지킨 채 손과 팔꿈치가 전방 준비 위치(hand x:198,y:96)로 제어 복귀합니다.',
      invariantAnchorsKo: '양무릎(knee)과 정강이·발목(ankle) 하체 지지점이 고정됩니다.',
      keyJointChangeKo: '견관절·주관절 후방 신전(hand Δ118px, wrist Δ98px) 및 견갑 내전',
    },
  },
  {
    archetypeId: 'kneeling-reverse-abs-crunch',
    archetypeTitleKo: '리포머 닐링 리버스 앱스 & 하복부 크런치',
    muscles: {
      primary: 'rectus-obliques',
      extraPrimary: 'core-transversus',
      stabilizer: 'latissimus-serratus',
      lengthening: 'thoracic-extensors',
    },
    fixedAnchorJoints: [
      { joint: 'wrist', defaultSurfaceKo: '프레임/숄더레스트 양손 고정 지지점' },
      { joint: 'shoulder', defaultSurfaceKo: '손목 수직 위 견갑 안정 축' },
    ],
    movingJoints: ['thoracic', 'lumbar', 'pelvis', 'hip', 'knee', 'ankle', 'toe'],
    startJoints: makeJointMap({
      head: { x: 82, y: 74 },
      neck: { x: 96, y: 78 },
      shoulder: { x: 112, y: 82 },
      elbow: { x: 108, y: 114 },
      wrist: { x: 104, y: 144 },
      hand: { x: 100, y: 148 },
      thoracic: { x: 146, y: 80 },
      lumbar: { x: 180, y: 82 },
      pelvis: { x: 212, y: 86 },
      hip: { x: 218, y: 90 },
      knee: { x: 224, y: 144 },
      ankle: { x: 266, y: 148 },
      heel: { x: 262, y: 142 },
      toe: { x: 278, y: 152 },
    }),
    middleJoints: makeJointMap({
      head: { x: 88, y: 84 },
      neck: { x: 100, y: 82 },
      shoulder: { x: 112, y: 82 },
      elbow: { x: 108, y: 114 },
      wrist: { x: 104, y: 144 },
      hand: { x: 100, y: 148 },
      thoracic: { x: 138, y: 66 },
      lumbar: { x: 164, y: 68 },
      pelvis: { x: 184, y: 82 },
      hip: { x: 188, y: 88 },
      knee: { x: 182, y: 144 },
      ankle: { x: 224, y: 148 },
      heel: { x: 220, y: 142 },
      toe: { x: 236, y: 152 },
    }),
    endJoints: makeJointMap({
      head: { x: 82, y: 74 },
      neck: { x: 96, y: 78 },
      shoulder: { x: 112, y: 82 },
      elbow: { x: 108, y: 114 },
      wrist: { x: 104, y: 144 },
      hand: { x: 100, y: 148 },
      thoracic: { x: 144, y: 78 },
      lumbar: { x: 176, y: 80 },
      pelvis: { x: 206, y: 86 },
      hip: { x: 212, y: 90 },
      knee: { x: 218, y: 144 },
      ankle: { x: 260, y: 148 },
      heel: { x: 256, y: 142 },
      toe: { x: 272, y: 152 },
    }),
    carriageOffsets: [28, 4, 22],
    pedalAngles: [0, 0, 0],
    phaseTitlesKo: ['네발기기 중립 세팅 · 손목-어깨 고정', '하복부 스쿱 · 무릎 가슴 쪽 캐리지 당김', '요추 꺾임 없는 중립 복귀'],
    phaseSummariesKo: [
      '프레임이나 숄더레스트를 잡고 어깨가 손목 바로 위에 오도록 견갑대를 안정화합니다.',
      '팔로 당기지 않고 치골을 배꼽 쪽으로 둥글게 말아 올리는 하복부 힘으로 무릎과 캐리지를 끌어당깁니다.',
      '돌아갈 때 허리가 바닥으로 꺼지지 않도록 복횡근 텐션을 유지하며 중립 네발기기로 복귀합니다.',
    ],
    breathCuesKo: [
      '들숨: 손바닥으로 지지면을 밀어 전거근 채우기',
      '날숨: 아랫배를 천장 쪽으로 동그랗게 말며 무릎 당기기',
      '들숨: 어깨 고정 유지하며 고관절이 무릎 위까지만 복귀',
    ],
    alignments: {
      start: [
        {
          id: 'revabs-shoulder-stack',
          labelKo: '손목-팔꿈치-어깨 수직 지지 기둥',
          cueKo: '동작 내내 어깨가 손목 앞뒤로 흔들리지 않게 고정합니다.',
          kind: 'plumb-line',
          from: pt(112, 82),
          to: pt(104, 144),
          targetAngleDeg: 90,
          cautionKo: '팔 힘으로 캐리지를 잡아당기면 승모근과 손목에 무리가 갑니다.',
        },
      ],
      middle: [
        {
          id: 'revabs-lumbar-round',
          labelKo: '요추-골반 후방경사 C-커브 돔',
          cueKo: '꼬리뼈를 무릎 사이로 말아 넣어 하복부 깊은 수축을 만듭니다.',
          kind: 'angle-arc',
          from: pt(138, 66),
          to: pt(184, 82),
          targetAngleDeg: 135,
          cautionKo: '고개만 과하게 숙이지 않고 배꼽을 척추 쪽으로 당깁니다.',
        },
      ],
      end: [
        {
          id: 'revabs-neutral-stop',
          labelKo: '중립 척추 복귀 스토퍼 라인',
          cueKo: '무릎이 고관절 뒤로 너무 멀리 밀려 허리가 꺾이지 않게 멈춥니다.',
          kind: 'neutral-zone',
          from: pt(112, 82),
          to: pt(206, 86),
          cautionKo: '경량 스프링일수록 돌아가는 구간에서 코어 브레이크가 필수입니다.',
        },
      ],
    },
    directionVectors: {
      start: [
        {
          id: 'vec-revabs-serratus-push',
          labelKo: '전거근 상방 푸시 지지',
          kind: 'axial-lengthening',
          points: [pt(104, 144), pt(112, 82)],
          phaseScope: 'start',
        },
      ],
      middle: [
        {
          id: 'vec-revabs-knee-pull',
          labelKo: '무릎·캐리지 전방 당김(42px) & 요추 굴곡',
          kind: 'carriage-travel',
          points: [pt(224, 144), pt(182, 144), pt(164, 68)],
          phaseScope: 'start-to-middle',
        },
      ],
      end: [
        {
          id: 'vec-revabs-carriage-return',
          labelKo: '중립 네발기기 제어 복귀',
          kind: 'return-control',
          points: [pt(182, 144), pt(218, 144)],
          phaseScope: 'middle-to-end',
        },
      ],
    },
    poseDeltaSummary: {
      startToMiddleKo: '손목(wrist)과 어깨(shoulder)는 고정된 채 무릎(x:224→182)과 골반(x:212→184)이 전방으로 당겨지고 요추(y:82→68)가 둥글게 말립니다.',
      middleToEndKo: '하복부 편심성 제어로 무릎(x:182→218)과 요추(y:68→80)가 중립 네발기기로 복귀합니다.',
      invariantAnchorsKo: '손목(wrist), 손(hand), 어깨(shoulder) 전면 지지 기둥이 고정됩니다.',
      keyJointChangeKo: '캐리지 전방 크런치 이동(knee Δ42px, ankle Δ42px) + 요추 상방 돔 굴곡',
    },
  },
  {
    archetypeId: 'lateral-mermaid-side-bend',
    archetypeTitleKo: '머메이드 측굴 스트레치 & 바렐/체어 사이드 벤드',
    muscles: {
      primary: 'rectus-obliques',
      extraPrimary: 'latissimus-serratus',
      stabilizer: 'core-transversus',
      lengthening: 'thoracic-extensors',
    },
    fixedAnchorJoints: [
      { joint: 'pelvis', defaultSurfaceKo: '매트/캐리지/바렐 양측 골반·좌골 앵커' },
      { joint: 'hip', defaultSurfaceKo: '하체 측면 고정 지지점' },
    ],
    movingJoints: ['head', 'neck', 'shoulder', 'thoracic', 'lumbar', 'elbow', 'wrist', 'hand'],
    startJoints: makeJointMap({
      head: { x: 148, y: 36 },
      neck: { x: 148, y: 54 },
      shoulder: { x: 148, y: 72 },
      elbow: { x: 122, y: 66 },
      wrist: { x: 98, y: 56 },
      hand: { x: 88, y: 50 },
      thoracic: { x: 148, y: 96 },
      lumbar: { x: 148, y: 118 },
      pelvis: { x: 148, y: 138 },
      hip: { x: 158, y: 140 },
      knee: { x: 196, y: 148 },
      ankle: { x: 228, y: 152 },
      heel: { x: 224, y: 156 },
      toe: { x: 240, y: 154 },
      farShoulder: { x: 166, y: 76 },
      farElbow: { x: 186, y: 102 },
      farWrist: { x: 204, y: 128 },
    }),
    middleJoints: makeJointMap({
      head: { x: 198, y: 54 },
      neck: { x: 186, y: 68 },
      shoulder: { x: 174, y: 82 },
      elbow: { x: 196, y: 48 },
      wrist: { x: 224, y: 38 },
      hand: { x: 236, y: 36 },
      thoracic: { x: 166, y: 102 },
      lumbar: { x: 156, y: 120 },
      pelvis: { x: 148, y: 138 },
      hip: { x: 158, y: 140 },
      knee: { x: 196, y: 148 },
      ankle: { x: 228, y: 152 },
      heel: { x: 224, y: 156 },
      toe: { x: 240, y: 154 },
      farShoulder: { x: 184, y: 92 },
      farElbow: { x: 212, y: 112 },
      farWrist: { x: 238, y: 126 },
    }),
    endJoints: makeJointMap({
      head: { x: 148, y: 34 },
      neck: { x: 148, y: 52 },
      shoulder: { x: 148, y: 70 },
      elbow: { x: 118, y: 84 },
      wrist: { x: 92, y: 94 },
      hand: { x: 82, y: 98 },
      thoracic: { x: 148, y: 94 },
      lumbar: { x: 148, y: 116 },
      pelvis: { x: 148, y: 138 },
      hip: { x: 158, y: 140 },
      knee: { x: 196, y: 148 },
      ankle: { x: 228, y: 152 },
      heel: { x: 224, y: 156 },
      toe: { x: 240, y: 154 },
    }),
    carriageOffsets: [0, 32, 0],
    pedalAngles: [0, 24, 0],
    phaseTitlesKo: ['Z-Sit / 측면 지지 수직 정렬 세팅', '오버헤드 아크 측굴(Lateral Flexion) 정점', '반대측 복사근 수축으로 수직 탑 복귀'],
    phaseSummariesKo: [
      '양쪽 좌골 또는 측면 골반을 지지면에 단단히 내리고 한 팔을 들어 옆구리 길이를 준비합니다.',
      '반대쪽 골반이 따라 들리지 않도록 바닥으로 무겁게 누르며 갈비뼈 사이사이를 부채처럼 펼쳐 측굴합니다.',
      '늘어난 옆구리(외복사근·요방형근) 힘으로 아래쪽 갈비뼈부터 차곡차곡 쌓아 수직 정렬로 돌아옵니다.',
    ],
    breathCuesKo: [
      '들숨: 양쪽 좌골을 바닥에 내리고 정수리 위로 키 커지기',
      '들숨/날숨: 열린 쪽 늑간근(갈비뼈 사이)으로 깊은 호흡 불어넣기',
      '날숨: 반대쪽 옆구리 힘으로 골반 위에 흉곽을 다시 수직 적층',
    ],
    alignments: {
      start: [
        {
          id: 'mermaid-pelvis-ground',
          labelKo: '양측 골반 수평 접지 & 수직 척추 축',
          cueKo: '인어공주(Z-Sit) 자세가 불편하면 양반다리나 걸터앉은 자세로 골반 수평을 먼저 맞춥니다.',
          kind: 'plumb-line',
          from: pt(148, 36),
          to: pt(148, 138),
          targetAngleDeg: 90,
          cautionKo: '시작 전부터 한쪽 엉덩이가 완전히 들려 있지 않게 조정합니다.',
        },
      ],
      middle: [
        {
          id: 'mermaid-lateral-fan',
          labelKo: '골반 저항-오버헤드 측굴 C-아크',
          cueKo: '아래쪽 옆구리도 찌그러지지 않게 들어 올리며 큰 무지개 아크를 그립니다.',
          kind: 'angle-arc',
          from: pt(148, 138),
          to: pt(236, 36),
          targetAngleDeg: 55,
          cautionKo: '어깨가 귀에 붙거나 상체가 앞으로 쏟아지지 않게 가슴을 정면으로 엽니다.',
        },
      ],
      end: [
        {
          id: 'mermaid-stack-return',
          labelKo: '요추-흉추-경추 수직 리스택(Re-stack)',
          cueKo: '팔 힘으로 밀어 올라오지 않고 옆구리 코어 힘으로 척추를 세웁니다.',
          kind: 'axis-line',
          from: pt(148, 34),
          to: pt(148, 138),
          cautionKo: '복귀 후 어깨 긴장을 완전히 내려놓습니다.',
        },
      ],
    },
    directionVectors: {
      start: [
        {
          id: 'vec-mermaid-sitbone-anchor',
          labelKo: '반대쪽 좌골 하방 접지',
          kind: 'axial-lengthening',
          points: [pt(148, 118), pt(148, 138)],
          phaseScope: 'start',
        },
      ],
      middle: [
        {
          id: 'vec-mermaid-side-arc',
          labelKo: '오버헤드 측굴 아크 & 늑간 확장',
          kind: 'spine-articulation',
          points: [pt(88, 50), pt(164, 28), pt(236, 36)],
          phaseScope: 'start-to-middle',
        },
      ],
      end: [
        {
          id: 'vec-mermaid-oblique-return',
          labelKo: '외복사근 수축 수직 복귀',
          kind: 'return-control',
          points: [pt(198, 54), pt(148, 34)],
          phaseScope: 'middle-to-end',
        },
      ],
    },
    poseDeltaSummary: {
      startToMiddleKo: '골반(pelvis x:148,y:138)은 고정된 채 머리(x:148→198)와 손(x:88→236, y:50→36)이 측면 아크를 그리며 깊게 측굴합니다.',
      middleToEndKo: '측면 복사근 수축으로 몸통이 수직 중심축(head x:148,y:34)으로 복귀하고 팔이 카운터 스트레치(x:82,y:98)로 내려옵니다.',
      invariantAnchorsKo: '골반(pelvis)과 고관절(hip) 하체 지지 앵커가 바닥/기구 위에 고정됩니다.',
      keyJointChangeKo: '척추 측굴 아크(head Δ53px, hand Δ149px) 및 흉곽 측면 확장',
    },
  },
  {
    archetypeId: 'side-lying-leg-press-sweep',
    archetypeTitleKo: '사이드 라잉 레그 리프트 · 프레스 & 스트랩 스윕',
    muscles: {
      primary: 'glute-med',
      extraPrimary: 'glute-max',
      stabilizer: 'rectus-obliques',
      lengthening: 'adductors',
    },
    fixedAnchorJoints: [
      { joint: 'head', defaultSurfaceKo: '헤드레스트/팔베개 경추 일직선 지지' },
      { joint: 'thoracic', defaultSurfaceKo: '옆으로 누운 흉곽 정렬 축' },
      { joint: 'pelvis', defaultSurfaceKo: '수직으로 포갠 양측 골반(Stacked Pelvis) 앵커' },
    ],
    movingJoints: ['knee', 'ankle', 'heel', 'toe'],
    startJoints: makeJointMap({
      head: { x: 52, y: 126 },
      neck: { x: 70, y: 128 },
      shoulder: { x: 92, y: 128 },
      elbow: { x: 74, y: 148 },
      wrist: { x: 98, y: 152 },
      hand: { x: 110, y: 152 },
      thoracic: { x: 124, y: 130 },
      lumbar: { x: 154, y: 130 },
      pelvis: { x: 182, y: 132 },
      hip: { x: 192, y: 128 },
      knee: { x: 230, y: 118 },
      ankle: { x: 268, y: 126 },
      heel: { x: 264, y: 132 },
      toe: { x: 282, y: 122 },
      farKnee: { x: 218, y: 148 },
      farAnkle: { x: 248, y: 154 },
    }),
    middleJoints: makeJointMap({
      head: { x: 52, y: 126 },
      neck: { x: 70, y: 128 },
      shoulder: { x: 92, y: 128 },
      elbow: { x: 74, y: 148 },
      wrist: { x: 98, y: 152 },
      hand: { x: 110, y: 152 },
      thoracic: { x: 124, y: 130 },
      lumbar: { x: 154, y: 130 },
      pelvis: { x: 182, y: 132 },
      hip: { x: 192, y: 126 },
      knee: { x: 238, y: 86 },
      ankle: { x: 284, y: 68 },
      heel: { x: 280, y: 74 },
      toe: { x: 298, y: 62 },
      farKnee: { x: 218, y: 148 },
      farAnkle: { x: 248, y: 154 },
    }),
    endJoints: makeJointMap({
      head: { x: 52, y: 126 },
      neck: { x: 70, y: 128 },
      shoulder: { x: 92, y: 128 },
      elbow: { x: 74, y: 148 },
      wrist: { x: 98, y: 152 },
      hand: { x: 110, y: 152 },
      thoracic: { x: 124, y: 130 },
      lumbar: { x: 154, y: 130 },
      pelvis: { x: 182, y: 132 },
      hip: { x: 192, y: 128 },
      knee: { x: 236, y: 114 },
      ankle: { x: 278, y: 118 },
      heel: { x: 274, y: 124 },
      toe: { x: 292, y: 114 },
      farKnee: { x: 218, y: 148 },
      farAnkle: { x: 248, y: 154 },
    }),
    carriageOffsets: [4, 30, 8],
    pedalAngles: [0, 0, 0],
    phaseTitlesKo: ['사이드 라잉 골반 수직 스태킹 & 마우스하우스 세팅', '위쪽 다리 외전 리프트 / 스트랩 프레스 정점', '위쪽 골반 고정 유지 · 수평 정렬 복귀'],
    phaseSummariesKo: [
      '아래쪽 옆구리에 작은 터널(Mouse House)을 만들어 양쪽 골반을 수직으로 포개고 아래 다리는 안정적으로 접어 지지합니다.',
      '위쪽 골반이 겨드랑이 쪽으로 딸려 올라가지 않도록 멀리 뻗어내며 중둔근 힘으로 다리를 들어 올리거나 밀어냅니다.',
      '내전근과 중둔근의 편심성 저항을 느끼며 골반 높이 수평선으로 천천히 돌아옵니다.',
    ],
    breathCuesKo: [
      '들숨: 정수리부터 꼬리뼈까지 일직선 축 확인',
      '날숨: 위쪽 뒤꿈치를 벽 쪽으로 길게 뻗으며 리프트/프레스',
      '들숨: 아래쪽 옆구리 터널을 유지한 채 천천히 하강',
    ],
    alignments: {
      start: [
        {
          id: 'sidelying-mouse-house',
          labelKo: '하측 요추 마우스하우스 & 수직 골반 축',
          cueKo: '위쪽 골반을 발끝 방향으로 밀어 양쪽 옆구리 길이를 똑같이 맞춥니다.',
          kind: 'neutral-zone',
          from: pt(124, 130),
          to: pt(182, 132),
          cautionKo: '아래쪽 옆구리가 매트에 완전히 무너지지 않게 합니다.',
        },
      ],
      middle: [
        {
          id: 'sidelying-abduction-vector',
          labelKo: '중둔근 외전 & 대퇴 축성 리치 라인',
          cueKo: '다리를 높이 드는 것보다 골반이 흔들리지 않는 범위에서 길게 뻗는 것이 핵심입니다.',
          kind: 'axis-line',
          from: pt(192, 126),
          to: pt(284, 68),
          targetAngleDeg: 32,
          cautionKo: '발끝이 천장으로 돌아가 대퇴근막장근만 과사용되지 않게 평행을 유지합니다.',
        },
      ],
      end: [
        {
          id: 'sidelying-hip-level-return',
          labelKo: '골반 높이 수평 복귀 제어선',
          cueKo: '다리가 내려올 때도 위쪽 좌골을 계속 벽 쪽으로 밀어냅니다.',
          kind: 'anchor-lock',
          from: pt(182, 132),
          to: pt(278, 118),
          cautionKo: '스트랩 장력에 골반이 뒤로 굴러가지 않도록 주의합니다.',
        },
      ],
    },
    directionVectors: {
      start: [
        {
          id: 'vec-sidelying-waist-tunnel',
          labelKo: '위쪽 골반 발끝 방향 축성 신장',
          kind: 'axial-lengthening',
          points: [pt(154, 130), pt(182, 132)],
          phaseScope: 'start',
        },
      ],
      middle: [
        {
          id: 'vec-sidelying-leg-lift',
          labelKo: '상측 하지 외전 리프트 & 프레스 아웃',
          kind: 'limb-excursion',
          points: [pt(268, 126), pt(284, 68), pt(298, 62)],
          phaseScope: 'start-to-middle',
        },
      ],
      end: [
        {
          id: 'vec-sidelying-leg-lower',
          labelKo: '편심성 외전 감속 하강',
          kind: 'return-control',
          points: [pt(284, 68), pt(278, 118)],
          phaseScope: 'middle-to-end',
        },
      ],
    },
    poseDeltaSummary: {
      startToMiddleKo: '머리·흉추·골반(y:126~132)이 수평 축에 고정된 채 위쪽 무릎(y:118→86)과 발목(x:268→284, y:126→68)이 상외방으로 리프트됩니다.',
      middleToEndKo: '중둔근 편심성 조절로 다리가 골반 높이 수평선(ankle x:278,y:118)으로 복귀합니다.',
      invariantAnchorsKo: '머리(head), 흉곽(thoracic), 수직 포갠 골반(pelvis) 및 하측 지지 다리가 고정됩니다.',
      keyJointChangeKo: '고관절 외전·신전 가동(ankle Δ60px, knee Δ33px)',
    },
  },
  {
    archetypeId: 'side-lying-clam-open-book',
    archetypeTitleKo: '사이드 클램(Clam) & 오픈 북 흉추 로테이션',
    muscles: {
      primary: 'glute-med',
      extraPrimary: 'thoracic-extensors',
      stabilizer: 'core-transversus',
      lengthening: 'latissimus-serratus',
    },
    fixedAnchorJoints: [
      { joint: 'pelvis', defaultSurfaceKo: '후방 벽에 맞춘 골반 수직 앵커' },
      { joint: 'ankle', defaultSurfaceKo: '양발 안쪽 복사뼈 밀착 고정점' },
    ],
    movingJoints: ['knee', 'shoulder', 'elbow', 'wrist', 'hand', 'thoracic'],
    startJoints: makeJointMap({
      head: { x: 64, y: 124 },
      neck: { x: 82, y: 126 },
      shoulder: { x: 102, y: 126 },
      elbow: { x: 134, y: 134 },
      wrist: { x: 164, y: 136 },
      hand: { x: 176, y: 136 },
      thoracic: { x: 132, y: 128 },
      lumbar: { x: 160, y: 130 },
      pelvis: { x: 186, y: 132 },
      hip: { x: 196, y: 130 },
      knee: { x: 224, y: 152 },
      ankle: { x: 248, y: 134 },
      heel: { x: 244, y: 138 },
      toe: { x: 260, y: 136 },
      farKnee: { x: 224, y: 154 },
      farAnkle: { x: 248, y: 136 },
    }),
    middleJoints: makeJointMap({
      head: { x: 64, y: 122 },
      neck: { x: 82, y: 124 },
      shoulder: { x: 96, y: 112 },
      elbow: { x: 72, y: 82 },
      wrist: { x: 48, y: 66 },
      hand: { x: 38, y: 62 },
      thoracic: { x: 128, y: 122 },
      lumbar: { x: 160, y: 130 },
      pelvis: { x: 186, y: 132 },
      hip: { x: 196, y: 128 },
      knee: { x: 222, y: 104 },
      ankle: { x: 248, y: 134 },
      heel: { x: 244, y: 138 },
      toe: { x: 260, y: 136 },
      farKnee: { x: 224, y: 154 },
      farAnkle: { x: 248, y: 136 },
    }),
    endJoints: makeJointMap({
      head: { x: 64, y: 124 },
      neck: { x: 82, y: 126 },
      shoulder: { x: 102, y: 126 },
      elbow: { x: 132, y: 132 },
      wrist: { x: 162, y: 134 },
      hand: { x: 174, y: 134 },
      thoracic: { x: 132, y: 128 },
      lumbar: { x: 160, y: 130 },
      pelvis: { x: 186, y: 132 },
      hip: { x: 196, y: 130 },
      knee: { x: 224, y: 148 },
      ankle: { x: 248, y: 134 },
      heel: { x: 244, y: 138 },
      toe: { x: 260, y: 136 },
      farKnee: { x: 224, y: 154 },
      farAnkle: { x: 248, y: 136 },
    }),
    carriageOffsets: [0, 0, 0],
    pedalAngles: [0, 0, 0],
    phaseTitlesKo: ['사이드 라잉 뒤꿈치-엉덩이-등 일직선 세팅', '고관절 외회전 클램 / 오픈 북 흉추 오픈', '골반 고정 유지 · 조개 닫기 & 팔 복귀'],
    phaseSummariesKo: [
      '뒤통수-견갑골-엉덩이-발뒤꿈치를 매트 뒷선에 나란히 맞추고 무릎을 앞으로 접어 포갭니다.',
      '양발 안쪽을 붙인 채 위쪽 무릎만 열어 중둔근 외회전을 만들거나, 무릎을 고정한 채 위쪽 팔과 흉곽을 반대쪽으로 활짝 엽니다.',
      '골반이 뒤로 넘어가지 않게 복부를 지탱하며 무릎과 팔을 처음 포갠 자리로 천천히 되돌립니다.',
    ],
    breathCuesKo: [
      '들숨: 양쪽 골반과 무릎을 수직으로 정확히 포개기',
      '날숨: 골반 고정한 채 무릎 오픈(클램) 또는 흉곽 회전(오픈 북)',
      '들숨/날숨: 갈비뼈와 골반 연결을 느끼며 원위치 복귀',
    ],
    alignments: {
      start: [
        {
          id: 'clam-back-wall-line',
          labelKo: '후두부-흉추-천골-뒤꿈치 후방 기준선',
          cueKo: '등 뒤에 벽이 있다고 상상하고 뒤꿈치와 엉덩이를 한 선에 맞춥니다.',
          kind: 'axis-line',
          from: pt(64, 124),
          to: pt(244, 138),
          cautionKo: '무릎을 너무 가슴 쪽으로 당기면 요추가 말릴 수 있습니다.',
        },
      ],
      middle: [
        {
          id: 'clam-openbook-arc',
          labelKo: '골반 고정 외회전(Clam) & 흉추 회전 아크',
          cueKo: '골반은 정면을 지키고 대퇴골두 외회전 또는 흉곽 회전만 분리해 만듭니다.',
          kind: 'angle-arc',
          from: pt(186, 132),
          to: pt(222, 104),
          targetAngleDeg: 45,
          cautionKo: '무릎이나 팔을 많이 열려고 골반 전체가 뒤로 굴러가지 않게 합니다.',
        },
      ],
      end: [
        {
          id: 'clam-close-control',
          labelKo: '내외회전 감속 복귀 앵커',
          cueKo: '닫을 때도 툭 떨어뜨리지 않고 끝까지 저항을 느끼며 모읍니다.',
          kind: 'anchor-lock',
          from: pt(186, 132),
          to: pt(248, 134),
          cautionKo: '발목 안쪽 접촉점이 떨어지지 않게 유지합니다.',
        },
      ],
    },
    directionVectors: {
      start: [
        {
          id: 'vec-clam-pelvis-stack',
          labelKo: '골반 수직 고정 잠금',
          kind: 'axial-lengthening',
          points: [pt(160, 130), pt(186, 132)],
          phaseScope: 'start',
        },
      ],
      middle: [
        {
          id: 'vec-clam-knee-open',
          labelKo: '상측 무릎 외회전 오픈 & 오픈 북 회전',
          kind: 'limb-excursion',
          points: [pt(224, 152), pt(222, 104), pt(38, 62)],
          phaseScope: 'start-to-middle',
        },
      ],
      end: [
        {
          id: 'vec-clam-close',
          labelKo: '무릎·상지 원위치 복귀',
          kind: 'return-control',
          points: [pt(222, 104), pt(224, 148)],
          phaseScope: 'middle-to-end',
        },
      ],
    },
    poseDeltaSummary: {
      startToMiddleKo: '골반(pelvis)과 양발목(ankle)은 고정된 채 위쪽 무릎이 y:152→104로 열리고 상지(hand x:176→38, y:136→62)가 회전 오픈됩니다.',
      middleToEndKo: '골반 흔들림 없이 무릎(y:104→148)과 팔(hand x:38→174)이 시작 포개짐 상태로 복귀합니다.',
      invariantAnchorsKo: '골반(pelvis)과 양발 복사뼈(ankle·heel)가 고정 축으로 작동합니다.',
      keyJointChangeKo: '고관절 외회전(knee Δ48px) 및 흉추·상지 오픈 북 아크(hand Δ156px)',
    },
  },
];

const ARCHETYPE_BLUEPRINTS_PART_C: readonly ArchetypeRigBlueprint[] = [
  {
    archetypeId: 'quadruped-reach-slide',
    archetypeTitleKo: '네발기기(Quadruped) 팔·다리 리치 & 슬라이드 (버드독)',
    muscles: {
      primary: 'core-transversus',
      extraPrimary: 'glute-max',
      stabilizer: 'latissimus-serratus',
      lengthening: 'thoracic-extensors',
    },
    fixedAnchorJoints: [
      { joint: 'thoracic', defaultSurfaceKo: '견갑-흉추 수평 테이블 지지' },
      { joint: 'lumbar', defaultSurfaceKo: '요추 중립 테이블 고정 축' },
      { joint: 'pelvis', defaultSurfaceKo: '좌우 수평 골반 박스 앵커' },
    ],
    movingJoints: ['elbow', 'wrist', 'hand', 'knee', 'ankle', 'heel', 'toe'],
    startJoints: makeJointMap({
      head: { x: 82, y: 72 },
      neck: { x: 98, y: 76 },
      shoulder: { x: 114, y: 80 },
      elbow: { x: 112, y: 114 },
      wrist: { x: 110, y: 146 },
      hand: { x: 102, y: 150 },
      thoracic: { x: 148, y: 80 },
      lumbar: { x: 180, y: 80 },
      pelvis: { x: 208, y: 82 },
      hip: { x: 214, y: 86 },
      knee: { x: 216, y: 146 },
      ankle: { x: 256, y: 150 },
      heel: { x: 252, y: 144 },
      toe: { x: 268, y: 152 },
      farWrist: { x: 114, y: 146 },
      farKnee: { x: 212, y: 146 },
    }),
    middleJoints: makeJointMap({
      head: { x: 80, y: 72 },
      neck: { x: 96, y: 76 },
      shoulder: { x: 114, y: 78 },
      elbow: { x: 76, y: 76 },
      wrist: { x: 40, y: 74 },
      hand: { x: 26, y: 72 },
      thoracic: { x: 148, y: 80 },
      lumbar: { x: 180, y: 80 },
      pelvis: { x: 208, y: 82 },
      hip: { x: 214, y: 84 },
      knee: { x: 254, y: 84 },
      ankle: { x: 288, y: 82 },
      heel: { x: 284, y: 78 },
      toe: { x: 300, y: 82 },
      farWrist: { x: 114, y: 146 },
      farKnee: { x: 212, y: 146 },
    }),
    endJoints: makeJointMap({
      head: { x: 82, y: 72 },
      neck: { x: 98, y: 76 },
      shoulder: { x: 114, y: 80 },
      elbow: { x: 108, y: 112 },
      wrist: { x: 106, y: 144 },
      hand: { x: 98, y: 148 },
      thoracic: { x: 148, y: 80 },
      lumbar: { x: 180, y: 80 },
      pelvis: { x: 208, y: 82 },
      hip: { x: 214, y: 86 },
      knee: { x: 220, y: 144 },
      ankle: { x: 260, y: 148 },
      heel: { x: 256, y: 142 },
      toe: { x: 272, y: 150 },
      farWrist: { x: 114, y: 146 },
      farKnee: { x: 212, y: 146 },
    }),
    carriageOffsets: [0, 0, 0],
    pedalAngles: [0, 0, 0],
    phaseTitlesKo: ['네발기기 4점 지지 · 어깨-고관절 직각 세팅', '대각선 팔·다리 수평 리치 (몸통 고정)', '체중 흔들림 없는 4점 지지 복귀'],
    phaseSummariesKo: [
      '어깨 아래 손목, 고관절 아래 무릎을 수직으로 세우고 등 위에 쟁반을 올려둔 듯 수평을 만듭니다.',
      '지지하는 손과 무릎으로 바닥을 밀어내며 팔과 다리를 앞뒤 벽으로 길게 뻗어 대각선 사슬을 연결합니다.',
      '허리가 출렁이거나 골반이 기울지 않게 속도를 제어하며 손과 무릎을 제자리로 되돌립니다.',
    ],
    breathCuesKo: [
      '들숨: 뒷목부터 꼬리뼈까지 수평 테이블 정렬',
      '날숨: 배꼽을 등 쪽으로 당기며 손끝-발끝 양방향 길게 리치',
      '들숨: 지지 측 어깨·골반이 무너지지 않게 사뿐히 복귀',
    ],
    alignments: {
      start: [
        {
          id: 'quad-box-alignment',
          labelKo: '손목-어깨 / 무릎-고관절 90° 박스 정렬',
          cueKo: '날개뼈 사이가 꺼지지 않게 손바닥으로 매트/테이블을 밀어냅니다.',
          kind: 'neutral-zone',
          from: pt(114, 80),
          to: pt(208, 82),
          targetAngleDeg: 180,
          cautionKo: '고개가 바닥으로 떨어지지 않게 시선은 손 앞쪽 매트를 봅니다.',
        },
      ],
      middle: [
        {
          id: 'quad-long-axis-reach',
          labelKo: '손끝-흉추-골반-발끝 180° 수평 축성 신장',
          cueKo: '팔다리를 높이 드는 대신 앞뒤로 가장 길게 뽑아낸다는 느낌으로 뻗습니다.',
          kind: 'axis-line',
          from: pt(26, 72),
          to: pt(300, 82),
          targetAngleDeg: 180,
          cautionKo: '다리를 들 때 허리가 꺾이거나 골반이 옆으로 열리지 않게 합니다.',
        },
      ],
      end: [
        {
          id: 'quad-return-stability',
          labelKo: '지지 사지(farWrist·farKnee) 고정 복귀',
          cueKo: '손과 무릎이 바닥에 닿는 순간까지 체중 이동을 최소화합니다.',
          kind: 'anchor-lock',
          from: pt(148, 80),
          to: pt(208, 82),
          cautionKo: '손목 불편 시 주먹 지지나 폼롤러/쿠션 지지로 수정합니다.',
        },
      ],
    },
    directionVectors: {
      start: [
        {
          id: 'vec-quad-serratus-set',
          labelKo: '견갑 전인 안정화',
          kind: 'axial-lengthening',
          points: [pt(110, 146), pt(114, 80)],
          phaseScope: 'start',
        },
      ],
      middle: [
        {
          id: 'vec-quad-arm-reach',
          labelKo: '상지 전방 수평 리치',
          kind: 'limb-excursion',
          points: [pt(102, 150), pt(76, 76), pt(26, 72)],
          phaseScope: 'start-to-middle',
        },
        {
          id: 'vec-quad-leg-reach',
          labelKo: '하지 후방 수평 리치',
          kind: 'limb-excursion',
          points: [pt(216, 146), pt(254, 84), pt(300, 82)],
          phaseScope: 'middle',
        },
      ],
      end: [
        {
          id: 'vec-quad-return',
          labelKo: '팔·다리 동시 제어 복귀',
          kind: 'return-control',
          points: [pt(288, 82), pt(260, 148)],
          phaseScope: 'middle-to-end',
        },
      ],
    },
    poseDeltaSummary: {
      startToMiddleKo: '흉추·요추·골반(y:80~82)이 수평 고정된 채 손(x:102→26, y:150→72)은 앞으로, 발목(x:256→288, y:150→82)은 뒤로 수평 리치합니다.',
      middleToEndKo: '몸통 회전 없이 손과 무릎이 다시 어깨·고관절 아래 지지 위치로 돌아옵니다.',
      invariantAnchorsKo: '흉추(thoracic), 요추(lumbar), 골반(pelvis) 및 지지측 손목/무릎이 고정됩니다.',
      keyJointChangeKo: '상지 전방 리치(hand Δ109px) + 하지 후방 신전(ankle Δ75px, knee Δ73px)',
    },
  },
  {
    archetypeId: 'plank-long-stretch-chair-pike',
    archetypeTitleKo: '롱 스트레치 · 엘리펀트 & 운다 체어 파이크/플랭크',
    muscles: {
      primary: 'core-transversus',
      extraPrimary: 'latissimus-serratus',
      stabilizer: 'rectus-obliques',
      lengthening: 'hamstrings',
    },
    fixedAnchorJoints: [
      { joint: 'wrist', defaultSurfaceKo: '풋바/체어 시트/매트 상지 고정 지지점' },
      { joint: 'hand', defaultSurfaceKo: '손바닥/전완 전면 앵커' },
    ],
    movingJoints: ['head', 'shoulder', 'thoracic', 'lumbar', 'pelvis', 'hip', 'knee', 'ankle'],
    startJoints: makeJointMap({
      head: { x: 64, y: 66 },
      neck: { x: 80, y: 72 },
      shoulder: { x: 96, y: 78 },
      elbow: { x: 96, y: 112 },
      wrist: { x: 96, y: 144 },
      hand: { x: 88, y: 148 },
      thoracic: { x: 132, y: 88 },
      lumbar: { x: 168, y: 98 },
      pelvis: { x: 202, y: 108 },
      hip: { x: 212, y: 112 },
      knee: { x: 246, y: 128 },
      ankle: { x: 280, y: 144 },
      heel: { x: 284, y: 138 },
      toe: { x: 282, y: 152 },
    }),
    middleJoints: makeJointMap({
      head: { x: 86, y: 82 },
      neck: { x: 94, y: 74 },
      shoulder: { x: 102, y: 66 },
      elbow: { x: 98, y: 106 },
      wrist: { x: 96, y: 144 },
      hand: { x: 88, y: 148 },
      thoracic: { x: 132, y: 54 },
      lumbar: { x: 158, y: 50 },
      pelvis: { x: 182, y: 58 },
      hip: { x: 188, y: 64 },
      knee: { x: 214, y: 106 },
      ankle: { x: 242, y: 146 },
      heel: { x: 246, y: 140 },
      toe: { x: 244, y: 154 },
    }),
    endJoints: makeJointMap({
      head: { x: 70, y: 68 },
      neck: { x: 86, y: 74 },
      shoulder: { x: 102, y: 80 },
      elbow: { x: 98, y: 112 },
      wrist: { x: 96, y: 144 },
      hand: { x: 88, y: 148 },
      thoracic: { x: 138, y: 90 },
      lumbar: { x: 174, y: 100 },
      pelvis: { x: 208, y: 110 },
      hip: { x: 218, y: 114 },
      knee: { x: 252, y: 130 },
      ankle: { x: 286, y: 144 },
      heel: { x: 290, y: 138 },
      toe: { x: 288, y: 152 },
    }),
    carriageOffsets: [18, 2, 26],
    pedalAngles: [28, 6, 30],
    phaseTitlesKo: ['전신 플랭크 라인 · 전거근 상지 지지', '하복부 스쿱 파이크 업 / 엘리펀트 당김 정점', '어깨-골반-발목 일직선 플랭크 제어 복귀'],
    phaseSummariesKo: [
      '손바닥(또는 전완)으로 지지면을 강하게 밀어 날개뼈 사이를 채우고 정수리부터 뒤꿈치까지 사선 널빤지 라인을 만듭니다.',
      '다리가 아닌 명치와 하복부를 천장 쪽으로 끌어올리는 힘으로 골반을 높게 세우며 캐리지/페달을 끌어당깁니다.',
      '허리가 바닥으로 꺾여 떨어지지 않도록 둔근과 복횡근을 조이며 긴 플랭크 라인으로 컨트롤 복귀합니다.',
    ],
    breathCuesKo: [
      '들숨: 전거근 푸시로 어깨-골반-발목 플랭크 세팅',
      '날숨: 아랫배를 천장으로 낚아채듯 파이크 업 / 캐리지 인',
      '들숨: 코어 브레이크를 유지하며 플랭크 사선으로 길게 복귀',
    ],
    alignments: {
      start: [
        {
          id: 'plank-diagonal-line',
          labelKo: '정수리-견갑-골반-뒤꿈치 플랭크 사선',
          cueKo: '치골을 배꼽 쪽으로 살짝 말아 요추 과신전(Swayback)을 방지합니다.',
          kind: 'axis-line',
          from: pt(64, 66),
          to: pt(280, 144),
          targetAngleDeg: 20,
          cautionKo: '날개뼈 사이가 꺼지거나 어깨가 귀로 솟지 않게 전거근을 씁니다.',
        },
      ],
      middle: [
        {
          id: 'plank-pike-apex',
          labelKo: '어깨-하복부-골반 파이크(Pike) 역V 정점',
          cueKo: '어깨는 손목 수직선 위에 남기고 복부 스쿱으로 골반만 천장으로 들어 올립니다.',
          kind: 'angle-arc',
          from: pt(96, 144),
          to: pt(182, 58),
          targetAngleDeg: 68,
          cautionKo: '무릎만 굽히거나 어깨가 손목 앞으로 과하게 쏟아지지 않게 합니다.',
        },
      ],
      end: [
        {
          id: 'plank-eccentric-glide',
          labelKo: '롱 스트레치 편심성 복귀 지지선',
          cueKo: '끝까지 복부 긴장을 놓지 않고 긴 플랭크로 착지합니다.',
          kind: 'neutral-zone',
          from: pt(102, 80),
          to: pt(286, 144),
          cautionKo: '손목 통증 시 즉시 포암(전완) 지지 또는 무릎 지지 플랭크로 낮춥니다.',
        },
      ],
    },
    directionVectors: {
      start: [
        {
          id: 'vec-plank-scapula-protract',
          labelKo: '전거근 상방 푸시 지지',
          kind: 'axial-lengthening',
          points: [pt(96, 144), pt(96, 78)],
          phaseScope: 'start',
        },
      ],
      middle: [
        {
          id: 'vec-plank-pike-up',
          labelKo: '하복부 파이크 리프트 & 캐리지/페달 당김',
          kind: 'carriage-travel',
          points: [pt(202, 108), pt(182, 58), pt(158, 50)],
          phaseScope: 'start-to-middle',
        },
      ],
      end: [
        {
          id: 'vec-plank-elongate-back',
          labelKo: '플랭크 사선 편심성 복귀',
          kind: 'return-control',
          points: [pt(182, 58), pt(208, 110)],
          phaseScope: 'middle-to-end',
        },
      ],
    },
    poseDeltaSummary: {
      startToMiddleKo: '손목(wrist)과 손(hand)은 지지면에 고정된 채 골반(x:202→182, y:108→58)과 요추(y:98→50)가 천장으로 50px 솟아오르고 발목(x:280→242)이 당겨집니다.',
      middleToEndKo: '코어 감속으로 골반(y:58→110)과 발목(x:242→286)이 다시 긴 플랭크 라인으로 펼쳐집니다.',
      invariantAnchorsKo: '손목(wrist)과 손바닥(hand) 상지 지지점이 고정 기준점으로 작동합니다.',
      keyJointChangeKo: '골반·요추 파이크 상승(pelvis Δ54px, lumbar Δ49px) + 하지 당김(ankle Δ38px)',
    },
  },
  {
    archetypeId: 'prone-swan-pulling-straps-swimming',
    archetypeTitleKo: '프론 스완 · 롱박스 풀링 스트랩 & 바렐 백 익스텐션/스위밍',
    muscles: {
      primary: 'thoracic-extensors',
      extraPrimary: 'glute-max',
      stabilizer: 'core-transversus',
      lengthening: 'rectus-obliques',
    },
    fixedAnchorJoints: [
      { joint: 'pelvis', defaultSurfaceKo: '매트/롱박스/바렐 치골(Pubic Bone) 지지면' },
      { joint: 'hip', defaultSurfaceKo: '고관절 전면 지지 앵커' },
    ],
    movingJoints: ['head', 'neck', 'shoulder', 'thoracic', 'elbow', 'wrist', 'hand', 'ankle'],
    startJoints: makeJointMap({
      head: { x: 54, y: 136 },
      neck: { x: 74, y: 136 },
      shoulder: { x: 96, y: 136 },
      elbow: { x: 84, y: 152 },
      wrist: { x: 58, y: 154 },
      hand: { x: 46, y: 154 },
      thoracic: { x: 128, y: 138 },
      lumbar: { x: 158, y: 140 },
      pelvis: { x: 186, y: 142 },
      hip: { x: 196, y: 142 },
      knee: { x: 240, y: 144 },
      ankle: { x: 282, y: 144 },
      heel: { x: 280, y: 138 },
      toe: { x: 296, y: 148 },
    }),
    middleJoints: makeJointMap({
      head: { x: 64, y: 78 },
      neck: { x: 80, y: 92 },
      shoulder: { x: 98, y: 106 },
      elbow: { x: 136, y: 118 },
      wrist: { x: 172, y: 124 },
      hand: { x: 184, y: 126 },
      thoracic: { x: 128, y: 122 },
      lumbar: { x: 158, y: 136 },
      pelvis: { x: 186, y: 142 },
      hip: { x: 196, y: 142 },
      knee: { x: 242, y: 136 },
      ankle: { x: 286, y: 128 },
      heel: { x: 284, y: 122 },
      toe: { x: 300, y: 130 },
    }),
    endJoints: makeJointMap({
      head: { x: 52, y: 130 },
      neck: { x: 72, y: 132 },
      shoulder: { x: 94, y: 134 },
      elbow: { x: 78, y: 146 },
      wrist: { x: 54, y: 148 },
      hand: { x: 42, y: 148 },
      thoracic: { x: 126, y: 136 },
      lumbar: { x: 158, y: 140 },
      pelvis: { x: 186, y: 142 },
      hip: { x: 196, y: 142 },
      knee: { x: 240, y: 144 },
      ankle: { x: 282, y: 144 },
      heel: { x: 280, y: 138 },
      toe: { x: 296, y: 148 },
    }),
    carriageOffsets: [2, 34, 4],
    pedalAngles: [0, 0, 0],
    phaseTitlesKo: ['프론 치골 밀착 & 축성 신장 준비', '경추-흉추 아크 신전(Swan) & 풀링 스트랩 정점', '정수리 길게 유지하며 순차 하강'],
    phaseSummariesKo: [
      '치골을 매트/박스/바렐에 단단히 누르고 아랫배를 배꼽 쪽으로 살짝 들어 올려 요추 공간을 보호합니다.',
      '고개를 먼저 꺾지 않고 가슴을 앞·위로 길게 뽑아 올리며 날개뼈를 뒷주머니 쪽으로 모아 흉추 신전을 만듭니다.',
      '명치부터 코끝까지 앞쪽으로 더 길어진다는 느낌으로 저항을 유지하며 수평 자세로 내려옵니다.',
    ],
    breathCuesKo: [
      '들숨 준비: 아랫배를 매트에서 가볍게 띄우며 어깨 하강',
      '들숨(또는 날숨): 가슴을 앞·위로 열며 긴 활 모양 스완 신전',
      '날숨: 척추 길이를 늘리며 아랫갈비뼈부터 천천히 복귀',
    ],
    alignments: {
      start: [
        {
          id: 'swan-pubic-anchor',
          labelKo: '치골 압착 & 요추 보호 코어 존',
          cueKo: '둔근과 허벅지 안쪽을 가볍게 조여 다리가 뒤로 길게 뻗어지게 합니다.',
          kind: 'anchor-lock',
          from: pt(158, 140),
          to: pt(186, 142),
          cautionKo: '배에 힘을 풀고 허리만으로 상체를 들어 올리지 않습니다.',
        },
      ],
      middle: [
        {
          id: 'swan-thoracic-arc',
          labelKo: '정수리-흉추-골반-발끝 스완 익스텐션 아크',
          cueKo: '뒷목은 흉추의 연장선으로 길게 유지하고 가슴 앞쪽을 넓게 엽니다.',
          kind: 'angle-arc',
          from: pt(64, 78),
          to: pt(186, 142),
          targetAngleDeg: 34,
          cautionKo: '턱을 들어 경추를 과신전하거나 요추 한 지점이 꺾이지 않게 합니다.',
        },
      ],
      end: [
        {
          id: 'swan-lengthen-down',
          labelKo: '전방 축성 신장 하강 라인',
          cueKo: '내려올 때도 어깨가 귀 쪽으로 말리지 않게 광배근 연결을 지킵니다.',
          kind: 'axis-line',
          from: pt(52, 130),
          to: pt(186, 142),
          cautionKo: '스프링이나 체중을 툭 놓아버리지 않도록 끝까지 제어합니다.',
        },
      ],
    },
    directionVectors: {
      start: [
        {
          id: 'vec-swan-abdominal-lift',
          labelKo: '아랫배 리프트 & 치골 고정',
          kind: 'axial-lengthening',
          points: [pt(158, 140), pt(186, 142)],
          phaseScope: 'start',
        },
      ],
      middle: [
        {
          id: 'vec-swan-chest-extension',
          labelKo: '흉추 신전 리프트 & 스트랩 후방 당김',
          kind: 'spine-articulation',
          points: [pt(54, 136), pt(64, 78), pt(184, 126)],
          phaseScope: 'start-to-middle',
        },
      ],
      end: [
        {
          id: 'vec-swan-elongate-return',
          labelKo: '척추 신장 하강 복귀',
          kind: 'return-control',
          points: [pt(64, 78), pt(52, 130)],
          phaseScope: 'middle-to-end',
        },
      ],
    },
    poseDeltaSummary: {
      startToMiddleKo: '치골(pelvis)과 고관절(hip)은 고정된 채 머리(y:136→78)와 어깨(y:136→106)가 상방 신전하고 손(x:46→184)이 골반 옆으로 당겨집니다.',
      middleToEndKo: '척추 길이를 유지하며 상체(head y:78→130)와 팔(hand x:184→42)이 시작 높이로 감속 복귀합니다.',
      invariantAnchorsKo: '골반(pelvis)과 고관절(hip) 전면 지지점이 박스/매트/바렐 위에 고정됩니다.',
      keyJointChangeKo: '흉추 신전 상승(head Δ59px, shoulder Δ30px) + 풀링 스트랩 후방 견인(hand Δ141px)',
    },
  },
  {
    archetypeId: 'standing-ankle-calf-upper-reach',
    archetypeTitleKo: '스탠딩 카프 레이즈 · 발목 리치 & 상체 암 스프링/회전',
    muscles: {
      primary: 'calves',
      extraPrimary: 'shoulder-deltoid',
      stabilizer: 'core-transversus',
      lengthening: 'thoracic-extensors',
    },
    fixedAnchorJoints: [
      { joint: 'toe', defaultSurfaceKo: '바닥 엄지·새끼발볼 삼각 지지점' },
    ],
    movingJoints: ['head', 'shoulder', 'thoracic', 'pelvis', 'knee', 'ankle', 'heel', 'elbow', 'wrist', 'hand'],
    startJoints: makeJointMap({
      head: { x: 146, y: 26 },
      neck: { x: 146, y: 42 },
      shoulder: { x: 146, y: 58 },
      elbow: { x: 162, y: 84 },
      wrist: { x: 184, y: 82 },
      hand: { x: 194, y: 80 },
      thoracic: { x: 146, y: 80 },
      lumbar: { x: 146, y: 100 },
      pelvis: { x: 146, y: 116 },
      hip: { x: 148, y: 118 },
      knee: { x: 150, y: 146 },
      ankle: { x: 148, y: 170 },
      heel: { x: 142, y: 176 },
      toe: { x: 164, y: 176 },
    }),
    middleJoints: makeJointMap({
      head: { x: 148, y: 18 },
      neck: { x: 148, y: 34 },
      shoulder: { x: 148, y: 50 },
      elbow: { x: 184, y: 56 },
      wrist: { x: 222, y: 54 },
      hand: { x: 236, y: 52 },
      thoracic: { x: 148, y: 72 },
      lumbar: { x: 148, y: 92 },
      pelvis: { x: 148, y: 108 },
      hip: { x: 150, y: 110 },
      knee: { x: 152, y: 138 },
      ankle: { x: 154, y: 160 },
      heel: { x: 146, y: 162 },
      toe: { x: 164, y: 176 },
      farWrist: { x: 118, y: 76 },
    }),
    endJoints: makeJointMap({
      head: { x: 146, y: 26 },
      neck: { x: 146, y: 42 },
      shoulder: { x: 146, y: 58 },
      elbow: { x: 166, y: 80 },
      wrist: { x: 190, y: 78 },
      hand: { x: 200, y: 76 },
      thoracic: { x: 146, y: 80 },
      lumbar: { x: 146, y: 100 },
      pelvis: { x: 146, y: 116 },
      hip: { x: 148, y: 118 },
      knee: { x: 150, y: 146 },
      ankle: { x: 148, y: 170 },
      heel: { x: 142, y: 176 },
      toe: { x: 164, y: 176 },
    }),
    carriageOffsets: [0, 18, 2],
    pedalAngles: [0, 0, 0],
    phaseTitlesKo: ['스탠딩 수직 추선(Plumb Line) & 발바닥 삼각 지지', '카프 레이즈(Relevé) & 전방 암 리치/펀치 정점', '뒤꿈치 소프트 착지 & 중심축 복귀'],
    phaseSummariesKo: [
      '두 발을 골반 너비로 두고 발바닥 삼각대에 체중을 고르게 실어 발목부터 정수리까지 수직으로 세웁니다.',
      '발목이 바깥쪽으로 꺾이지 않게 엄지·두 번째 발볼을 누르며 뒤꿈치를 들어 올리고 팔을 앞으로 길게 뻗습니다.',
      '정수리는 계속 천장으로 끌어올린다는 느낌으로 저항하며 뒤꿈치를 천천히 바닥에 내려놓습니다.',
    ],
    breathCuesKo: [
      '들숨: 발바닥 접지와 척추 수직 기둥 확인',
      '날숨: 복부 코르셋을 조이며 뒤꿈치 업 & 팔 리치/회전',
      '들숨: 키가 작아지지 않게 버티며 뒤꿈치 천천히 착지',
    ],
    alignments: {
      start: [
        {
          id: 'standing-plumb-vertical',
          labelKo: '귀-어깨-고관절-무릎-복사뼈 수직 추선',
          cueKo: '골반이 앞으로 밀리지 않도록 갈비뼈를 골반 바로 위에 맞춥니다.',
          kind: 'plumb-line',
          from: pt(146, 26),
          to: pt(148, 170),
          targetAngleDeg: 90,
          cautionKo: '균형이 불안정하면 고정된 바렐/체어/폴대를 가볍게 잡습니다.',
        },
      ],
      middle: [
        {
          id: 'standing-releve-reach',
          labelKo: '족저굴곡(Relevé) & 상지 전방 리치 축',
          cueKo: '발목 복사뼈 두 개가 서로 멀어지지 않게 중심선을 모으고 팔을 뻗습니다.',
          kind: 'axis-line',
          from: pt(148, 50),
          to: pt(236, 52),
          cautionKo: '팔을 뻗거나 회전할 때 몸통 전체가 앞뒤로 흔들리지 않게 합니다.',
        },
      ],
      end: [
        {
          id: 'standing-heel-landing',
          labelKo: '종아리 편심성 착지 제어선',
          cueKo: '뒤꿈치가 바닥에 닿을 때 무릎이 잠기지 않게 부드럽게 완충합니다.',
          kind: 'anchor-lock',
          from: pt(148, 170),
          to: pt(164, 176),
          cautionKo: '쿵 떨어지지 않도록 3카운트로 내려옵니다.',
        },
      ],
    },
    directionVectors: {
      start: [
        {
          id: 'vec-stand-ground-tripod',
          labelKo: '발바닥 삼각대 접지',
          kind: 'axial-lengthening',
          points: [pt(146, 116), pt(146, 26)],
          phaseScope: 'start',
        },
      ],
      middle: [
        {
          id: 'vec-calf-raise-up',
          labelKo: '뒤꿈치 수직 상승(14px) & 상지 리치',
          kind: 'limb-excursion',
          points: [pt(142, 176), pt(146, 162), pt(236, 52)],
          phaseScope: 'start-to-middle',
        },
      ],
      end: [
        {
          id: 'vec-calf-lower-down',
          labelKo: '뒤꿈치 편심성 착지 복귀',
          kind: 'return-control',
          points: [pt(146, 162), pt(142, 176)],
          phaseScope: 'middle-to-end',
        },
      ],
    },
    poseDeltaSummary: {
      startToMiddleKo: '발볼(toe x:164,y:176) 지지점 위에서 뒤꿈치(y:176→162)와 정수리(y:26→18)가 수직 상승하고 손(x:194→236, y:80→52)이 앞으로 뻗습니다.',
      middleToEndKo: '종아리 편심성 조절로 뒤꿈치(y:162→176)와 상지가 시작 자세로 차분히 복귀합니다.',
      invariantAnchorsKo: '발볼·발가락(toe) 바닥 지지점이 부동 앵커로 유지됩니다.',
      keyJointChangeKo: '족관절 저측굴곡(heel Δ15px) + 상지 전방 스트랩/리치 확장(hand Δ50px)',
    },
  },
  {
    archetypeId: 'standing-scooter-lunge-splits',
    archetypeTitleKo: '스탠딩 스쿠터 · 런지 · 사이드 스플릿 & 체어 스텝업',
    muscles: {
      primary: 'glute-max',
      extraPrimary: 'glute-med',
      stabilizer: 'quadriceps',
      lengthening: 'hip-flexor-iliopsoas',
    },
    fixedAnchorJoints: [
      { joint: 'farAnkle', defaultSurfaceKo: '바닥/플랫폼/시트 지지측 발목 고정점' },
      { joint: 'farToe', defaultSurfaceKo: '지지측 발바닥 전체 앵커' },
    ],
    movingJoints: ['hip', 'knee', 'ankle', 'heel', 'toe', 'thoracic', 'elbow', 'wrist', 'hand'],
    startJoints: makeJointMap({
      head: { x: 116, y: 34 },
      neck: { x: 122, y: 50 },
      shoulder: { x: 128, y: 66 },
      elbow: { x: 112, y: 88 },
      wrist: { x: 96, y: 82 },
      hand: { x: 90, y: 78 },
      thoracic: { x: 136, y: 86 },
      lumbar: { x: 144, y: 104 },
      pelvis: { x: 152, y: 118 },
      hip: { x: 156, y: 120 },
      knee: { x: 184, y: 144 },
      ankle: { x: 214, y: 162 },
      heel: { x: 218, y: 156 },
      toe: { x: 212, y: 172 },
      farHip: { x: 146, y: 120 },
      farKnee: { x: 124, y: 146 },
      farAnkle: { x: 124, y: 174 },
      farToe: { x: 108, y: 176 },
    }),
    middleJoints: makeJointMap({
      head: { x: 112, y: 38 },
      neck: { x: 118, y: 54 },
      shoulder: { x: 124, y: 70 },
      elbow: { x: 104, y: 84 },
      wrist: { x: 84, y: 76 },
      hand: { x: 76, y: 72 },
      thoracic: { x: 134, y: 88 },
      lumbar: { x: 144, y: 106 },
      pelvis: { x: 154, y: 120 },
      hip: { x: 160, y: 122 },
      knee: { x: 228, y: 134 },
      ankle: { x: 278, y: 148 },
      heel: { x: 282, y: 142 },
      toe: { x: 276, y: 158 },
      farHip: { x: 146, y: 120 },
      farKnee: { x: 124, y: 146 },
      farAnkle: { x: 124, y: 174 },
      farToe: { x: 108, y: 176 },
    }),
    endJoints: makeJointMap({
      head: { x: 116, y: 34 },
      neck: { x: 122, y: 50 },
      shoulder: { x: 128, y: 66 },
      elbow: { x: 112, y: 88 },
      wrist: { x: 96, y: 82 },
      hand: { x: 90, y: 78 },
      thoracic: { x: 136, y: 86 },
      lumbar: { x: 144, y: 104 },
      pelvis: { x: 152, y: 118 },
      hip: { x: 156, y: 120 },
      knee: { x: 190, y: 142 },
      ankle: { x: 222, y: 160 },
      heel: { x: 226, y: 154 },
      toe: { x: 220, y: 170 },
      farHip: { x: 146, y: 120 },
      farKnee: { x: 124, y: 146 },
      farAnkle: { x: 124, y: 174 },
      farToe: { x: 108, y: 176 },
    }),
    carriageOffsets: [4, 48, 8],
    pedalAngles: [12, 38, 16],
    phaseTitlesKo: ['단측 지지 힙 힌지(Hip Hinge) & 무릎 고정 세팅', '가동 다리 후방/측방 프레스 아웃 정점', '지지측 둔근 고정 유지 · 컨트롤 복귀'],
    phaseSummariesKo: [
      '지지하는 다리의 무릎과 발목을 고정하고 고관절을 살짝 접어 둔근(중둔근·대둔근)에 체중 80%를 실어줍니다.',
      '지지 다리 무릎이 흔들리지 않게 버티면서 반대쪽 다리로 캐리지/페달/바닥을 길게 밀어내어 고관절을 신전·외전합니다.',
      '상체 높이가 위아래로 들썩이지 않게 유지하며 허벅지 안쪽과 둔근 제어로 돌아옵니다.',
    ],
    breathCuesKo: [
      '들숨: 지지 다리 뒤꿈치와 중둔근에 체중 고정',
      '날숨: 지지 무릎 1mm도 흔들림 없이 가동 다리 길게 프레스',
      '들숨: 골반 수평을 지키며 천천히 홈 방향으로 복귀',
    ],
    alignments: {
      start: [
        {
          id: 'lunge-standing-knee-lock',
          labelKo: '지지 다리(farKnee-farAnkle) 수직 정강이 축',
          cueKo: '앞쪽 지지 무릎이 발끝 앞으로 밀리거나 안쪽으로 무너지지 않게 고정합니다.',
          kind: 'plumb-line',
          from: pt(124, 146),
          to: pt(124, 174),
          targetAngleDeg: 90,
          cautionKo: '무릎 관절에만 체중이 실리면 엉덩이를 뒤로 조금 더 빼줍니다.',
        },
      ],
      middle: [
        {
          id: 'lunge-back-leg-extension',
          labelKo: '정수리-몸통-후방 다리 일직선 런지 사선',
          cueKo: '뒷다리를 뻗을 때 허리가 꺾이지 않도록 복부를 당겨 사선 축을 유지합니다.',
          kind: 'axis-line',
          from: pt(112, 38),
          to: pt(278, 148),
          targetAngleDeg: 35,
          cautionKo: '기구 승하차 시 반드시 고정된 바닥/플랫폼 발부터 먼저 딛습니다.',
        },
      ],
      end: [
        {
          id: 'lunge-level-pelvis-return',
          labelKo: '골반 높이 고정 캐리지/페달 회수',
          cueKo: '돌아올 때도 지지 다리 무릎 각도를 그대로 유지해 둔근 텐션을 이어갑니다.',
          kind: 'anchor-lock',
          from: pt(152, 118),
          to: pt(124, 174),
          cautionKo: '일어서며 무릎을 다 펴버리면 둔근 자극이 풀립니다.',
        },
      ],
    },
    directionVectors: {
      start: [
        {
          id: 'vec-lunge-glute-load',
          labelKo: '지지측 둔근 체중 부하',
          kind: 'axial-lengthening',
          points: [pt(152, 118), pt(124, 174)],
          phaseScope: 'start',
        },
      ],
      middle: [
        {
          id: 'vec-scooter-press-back',
          labelKo: '가동 다리 후방/측방 프레스 & 캐리지 활주(48px)',
          kind: 'carriage-travel',
          points: [pt(214, 162), pt(248, 154), pt(278, 148)],
          phaseScope: 'start-to-middle',
        },
      ],
      end: [
        {
          id: 'vec-scooter-return-in',
          labelKo: '지지 무릎 고정 감속 복귀',
          kind: 'return-control',
          points: [pt(278, 148), pt(222, 160)],
          phaseScope: 'middle-to-end',
        },
      ],
    },
    poseDeltaSummary: {
      startToMiddleKo: '지지측 무릎·발목(farKnee x:124, farAnkle x:124)은 부동 고정된 채 가동 다리 무릎(x:184→228)과 발목(x:214→278)이 후방으로 64px 뻗어집니다.',
      middleToEndKo: '지지 둔근 버팀 속에서 가동 다리(ankle x:278→222)가 제어 복귀합니다.',
      invariantAnchorsKo: '지지측 발목(farAnkle), 발끝(farToe), 지지 무릎(farKnee)이 흔들리지 않고 고정됩니다.',
      keyJointChangeKo: '가동 하지 고관절·슬관절 신전 활주(ankle Δ66px, knee Δ45px)',
    },
  },
  {
    archetypeId: 'standing-roll-down-centering',
    archetypeTitleKo: '스탠딩 척추 분절 롤다운 & 센터링 호흡 피날레',
    muscles: {
      primary: 'core-transversus',
      extraPrimary: 'rectus-obliques',
      stabilizer: 'glute-max',
      lengthening: 'thoracic-extensors',
    },
    fixedAnchorJoints: [
      { joint: 'ankle', defaultSurfaceKo: '발목 수직 기둥 앵커' },
      { joint: 'heel', defaultSurfaceKo: '바닥 뒤꿈치 지지점' },
      { joint: 'toe', defaultSurfaceKo: '바닥 발볼 삼각 지지점' },
    ],
    movingJoints: ['head', 'neck', 'shoulder', 'thoracic', 'lumbar', 'elbow', 'wrist', 'hand'],
    startJoints: makeJointMap({
      head: { x: 152, y: 26 },
      neck: { x: 152, y: 44 },
      shoulder: { x: 152, y: 62 },
      elbow: { x: 152, y: 92 },
      wrist: { x: 154, y: 120 },
      hand: { x: 156, y: 130 },
      thoracic: { x: 150, y: 84 },
      lumbar: { x: 150, y: 104 },
      pelvis: { x: 152, y: 120 },
      hip: { x: 154, y: 122 },
      knee: { x: 156, y: 148 },
      ankle: { x: 154, y: 172 },
      heel: { x: 148, y: 176 },
      toe: { x: 170, y: 176 },
    }),
    middleJoints: makeJointMap({
      head: { x: 204, y: 124 },
      neck: { x: 198, y: 108 },
      shoulder: { x: 190, y: 94 },
      elbow: { x: 194, y: 126 },
      wrist: { x: 196, y: 154 },
      hand: { x: 198, y: 164 },
      thoracic: { x: 176, y: 78 },
      lumbar: { x: 160, y: 94 },
      pelvis: { x: 152, y: 118 },
      hip: { x: 154, y: 120 },
      knee: { x: 158, y: 148 },
      ankle: { x: 154, y: 172 },
      heel: { x: 148, y: 176 },
      toe: { x: 170, y: 176 },
    }),
    endJoints: makeJointMap({
      head: { x: 152, y: 24 },
      neck: { x: 152, y: 42 },
      shoulder: { x: 152, y: 60 },
      elbow: { x: 138, y: 40 },
      wrist: { x: 146, y: 22 },
      hand: { x: 152, y: 18 },
      thoracic: { x: 150, y: 82 },
      lumbar: { x: 150, y: 102 },
      pelvis: { x: 152, y: 120 },
      hip: { x: 154, y: 122 },
      knee: { x: 156, y: 148 },
      ankle: { x: 154, y: 172 },
      heel: { x: 148, y: 176 },
      toe: { x: 170, y: 176 },
    }),
    carriageOffsets: [0, 0, 0],
    pedalAngles: [0, 0, 0],
    phaseTitlesKo: ['스탠딩 수직 벽 정렬 준비', '정수리부터 분절 롤다운 · 목·어깨 긴장 릴리즈', '하복부 스쿱 롤업 & 센터링 만세 호흡 마무리'],
    phaseSummariesKo: [
      '투명한 벽 앞에 선 것처럼 발바닥 삼각대에 체중을 고르게 싣고 정수리를 천장으로 길게 세웁니다.',
      '골반이 뒤로 빠지지 않게 지키며 정수리-경추-흉추-요추 순서로 벽에서 한 마디씩 떼어내듯 다이빙 롤다운합니다.',
      '발바닥으로 바닥을 밀고 아랫배 힘으로 꼬리뼈부터 척추를 다시 쌓아 올린 뒤 깊은 센터링 호흡으로 마무리합니다.',
    ],
    breathCuesKo: [
      '들숨: 정수리까지 척추 기둥 길게 세우기',
      '날숨: 배꼽을 등 쪽으로 당기며 정수리부터 부드럽게 롤다운',
      '하단 들숨 후 날숨: 꼬리뼈부터 한 마디씩 적층 롤업 & 마무리 호흡',
    ],
    alignments: {
      start: [
        {
          id: 'rolldown-wall-plumb',
          labelKo: '정수리-어깨-골반-복사뼈 수직 벽 정렬선',
          cueKo: '무릎을 과신전하지 않고 부드럽게 풀어 발바닥 중앙에 중심을 둡니다.',
          kind: 'plumb-line',
          from: pt(152, 26),
          to: pt(154, 172),
          targetAngleDeg: 90,
          cautionKo: '어지럼증이 있는 경우 고개를 너무 깊게 숙이지 않습니다.',
        },
      ],
      middle: [
        {
          id: 'rolldown-pelvis-over-ankles',
          labelKo: '발목 위 골반 수직 유지 & 상체 폭포수 분절',
          cueKo: '상체가 내려갈 때도 엉덩이가 뒷벽으로 밀리지 않고 발목 위에 머뭅니다.',
          kind: 'angle-arc',
          from: pt(152, 118),
          to: pt(204, 124),
          targetAngleDeg: 140,
          cautionKo: '햄스트링이 당기면 무릎을 살짝 굽혀 요추 이완을 우선합니다.',
        },
      ],
      end: [
        {
          id: 'rolldown-restack-tall',
          labelKo: '척추 수직 재적층 & 오버헤드 센터링',
          cueKo: '수업 시작 때보다 한층 가벼워진 어깨와 길어진 척추를 느낍니다.',
          kind: 'axis-line',
          from: pt(152, 18),
          to: pt(154, 172),
          cautionKo: '만세 호흡 시 갈비뼈와 어깨가 과하게 들리지 않게 합니다.',
        },
      ],
    },
    directionVectors: {
      start: [
        {
          id: 'vec-rolldown-crown-up',
          labelKo: '정수리 상방 신장 후 턱 당김',
          kind: 'axial-lengthening',
          points: [pt(152, 44), pt(152, 26)],
          phaseScope: 'start',
        },
      ],
      middle: [
        {
          id: 'vec-rolldown-dive',
          labelKo: '정수리→흉추→요추 순차 롤다운 곡선',
          kind: 'spine-articulation',
          points: [pt(152, 26), pt(192, 64), pt(204, 124)],
          phaseScope: 'start-to-middle',
        },
      ],
      end: [
        {
          id: 'vec-rolldown-rollup-circle',
          labelKo: '분절 롤업 & 센터링 서클 호흡',
          kind: 'return-control',
          points: [pt(204, 124), pt(152, 60), pt(152, 18)],
          phaseScope: 'middle-to-end',
        },
      ],
    },
    poseDeltaSummary: {
      startToMiddleKo: '발목·뒤꿈치·발끝(y:172~176)과 골반(x:152)은 수직선 위에 고정된 채 머리(x:152→204, y:26→124)와 손(y:130→164)이 분절 하강합니다.',
      middleToEndKo: '꼬리뼈부터 척추를 다시 쌓아 올리며 머리(x:152,y:24)와 양팔(hand y:18)이 천장으로 길게 뻗어 마무리합니다.',
      invariantAnchorsKo: '양발 발목(ankle), 뒤꿈치(heel), 발볼(toe)이 바닥 삼각 지지점을 지킵니다.',
      keyJointChangeKo: '척추 전방 분절 굴곡(head Δ111px, shoulder Δ50px) 및 수직 재적층',
    },
  },
];

const ALL_ARCHETYPE_BLUEPRINTS: readonly ArchetypeRigBlueprint[] = Object.freeze([
  ...ARCHETYPE_BLUEPRINTS_PART_A,
  ...ARCHETYPE_BLUEPRINTS_PART_B,
  ...ARCHETYPE_BLUEPRINTS_PART_C,
]);

const ARCHETYPE_BY_ID: ReadonlyMap<string, ArchetypeRigBlueprint> = new Map(
  ALL_ARCHETYPE_BLUEPRINTS.map((bp) => [bp.archetypeId, bp]),
);

const EXPLICIT_EXERCISE_ARCHETYPE_IDS: Readonly<Record<string, string>> = Object.freeze({
  // Mat Original (18)
  'original-mat-rib-breath': 'supine-breath-pelvic-clock',
  'original-mat-pelvic-clock': 'supine-breath-pelvic-clock',
  'original-mat-ankle-reach': 'standing-ankle-calf-upper-reach',
  'original-mat-bridge': 'supine-articulated-bridge',
  'original-mat-heel-slide': 'supine-heel-slide-ankle',
  'original-mat-knee-fold': 'supine-knee-fold',
  'original-mat-chest-lift': 'supine-chest-lift-curl',
  'original-mat-single-leg-stretch': 'supine-leg-stretch-hundred',
  'original-mat-seated-arm-reach': 'seated-row-arm-arc',
  'original-mat-band-row': 'seated-row-arm-arc',
  'original-mat-side-leg-lift': 'side-lying-leg-press-sweep',
  'original-mat-clam': 'side-lying-clam-open-book',
  'original-mat-quadruped-reach': 'quadruped-reach-slide',
  'original-mat-forearm-plank': 'plank-long-stretch-chair-pike',
  'original-mat-swan-prep': 'prone-swan-pulling-straps-swimming',
  'original-mat-swimming-prep': 'prone-swan-pulling-straps-swimming',
  'original-mat-mermaid': 'lateral-mermaid-side-bend',
  'original-mat-open-book': 'side-lying-clam-open-book',

  // Reformer Original (8)
  'original-reformer-supine-breath': 'supine-breath-pelvic-clock',
  'original-reformer-parallel-footwork': 'reformer-supine-footwork',
  'original-reformer-supported-bridge': 'supine-articulated-bridge',
  'original-reformer-supine-arm-press': 'supine-strap-arm-press',
  'original-reformer-seated-row': 'seated-row-arm-arc',
  'original-reformer-side-lying-press': 'side-lying-leg-press-sweep',
  'original-reformer-box-swan-prep': 'prone-swan-pulling-straps-swimming',
  'original-reformer-strap-frog': 'supine-feet-in-straps',

  // Cadillac Original (12)
  'original-cadillac-table-breath': 'supine-breath-pelvic-clock',
  'original-cadillac-pelvic-rock': 'supine-breath-pelvic-clock',
  'original-cadillac-table-ankle': 'supine-heel-slide-ankle',
  'original-cadillac-table-bridge': 'supine-articulated-bridge',
  'original-cadillac-table-knee-fold': 'supine-knee-fold',
  'original-cadillac-seated-roll-back': 'seated-roll-back-spine-twist',
  'original-cadillac-arm-spring-press': 'supine-strap-arm-press',
  'original-cadillac-seated-rotation': 'seated-roll-back-spine-twist',
  'original-cadillac-side-leg-reach': 'side-lying-leg-press-sweep',
  'original-cadillac-quadruped-slide': 'quadruped-reach-slide',
  'original-cadillac-prone-back-reach': 'prone-swan-pulling-straps-swimming',
  'original-cadillac-seated-side-reach': 'lateral-mermaid-side-bend',

  // Chair Original (12)
  'original-chair-seated-breath': 'seated-row-arm-arc',
  'original-chair-seated-pelvic-rock': 'seated-row-arm-arc',
  'original-chair-seated-pedal-press': 'chair-seated-pedal-footwork',
  'original-chair-alternating-pedal': 'chair-seated-pedal-footwork',
  'original-chair-seated-knee-lift': 'chair-seated-pedal-footwork',
  'original-chair-seated-arm-arc': 'seated-row-arm-arc',
  'original-chair-seated-spine-twist': 'seated-roll-back-spine-twist',
  'original-chair-sit-to-stand': 'standing-scooter-lunge-splits',
  'original-chair-supported-calf-raise': 'standing-ankle-calf-upper-reach',
  'original-chair-incline-support': 'plank-long-stretch-chair-pike',
  'original-chair-seated-back-reach': 'seated-row-arm-arc',
  'original-chair-seated-mermaid': 'lateral-mermaid-side-bend',

  // Barrel Original (10)
  'original-barrel-standing-breath': 'standing-ankle-calf-upper-reach',
  'original-barrel-supported-ankle': 'standing-ankle-calf-upper-reach',
  'original-barrel-seated-spine-reach': 'seated-roll-back-spine-twist',
  'original-barrel-supported-arm-reach': 'standing-ankle-calf-upper-reach',
  'original-barrel-standing-rotation': 'standing-ankle-calf-upper-reach',
  'original-barrel-standing-hip-extension': 'standing-scooter-lunge-splits',
  'original-barrel-standing-side-reach': 'standing-scooter-lunge-splits',
  'original-barrel-supported-swan': 'prone-swan-pulling-straps-swimming',
  'original-barrel-supported-side-bend': 'lateral-mermaid-side-bend',
  'original-barrel-standing-side-stretch': 'lateral-mermaid-side-bend',

  // Canonical Studio Exercises (38)
  'ex-warmup-01': 'supine-breath-pelvic-clock',
  'ex-warmup-02': 'kneeling-chest-expansion-triceps',
  'ex-warmup-03': 'supine-breath-pelvic-clock',
  'ex-footwork-01': 'reformer-supine-footwork',
  'ex-footwork-02': 'reformer-supine-footwork',
  'ex-footwork-03': 'chair-seated-pedal-footwork',
  'ex-bridging-01': 'supine-articulated-bridge',
  'ex-bridging-02': 'supine-articulated-bridge',
  'ex-core-01': 'supine-leg-stretch-hundred',
  'ex-core-02': 'seated-roll-back-spine-twist',
  'ex-core-03': 'supine-leg-stretch-hundred',
  'ex-core-04': 'kneeling-reverse-abs-crunch',
  'ex-upper-01': 'kneeling-chest-expansion-triceps',
  'ex-upper-02': 'seated-row-arm-arc',
  'ex-upper-03': 'standing-ankle-calf-upper-reach',
  'ex-lower-01': 'standing-scooter-lunge-splits',
  'ex-lower-02': 'standing-scooter-lunge-splits',
  'ex-lower-03': 'standing-scooter-lunge-splits',
  'ex-lower-04': 'side-lying-leg-press-sweep',
  'ex-plank-01': 'plank-long-stretch-chair-pike',
  'ex-plank-02': 'plank-long-stretch-chair-pike',
  'ex-extension-01': 'prone-swan-pulling-straps-swimming',
  'ex-extension-02': 'prone-swan-pulling-straps-swimming',
  'ex-straps-01': 'supine-feet-in-straps',
  'ex-straps-02': 'supine-feet-in-straps',
  'ex-cooldown-01': 'lateral-mermaid-side-bend',
  'ex-cooldown-02': 'standing-roll-down-centering',
  'ex-kr-reformer-01': 'reformer-supine-footwork',
  'ex-kr-cadillac-01': 'supine-chest-lift-curl',
  'ex-kr-reformer-02': 'standing-scooter-lunge-splits',
  'ex-kr-barrel-01': 'lateral-mermaid-side-bend',
  'ex-kr-reformer-03': 'kneeling-chest-expansion-triceps',
  'ex-kr-chair-01': 'plank-long-stretch-chair-pike',
  'ex-kr-reformer-04': 'supine-leg-stretch-hundred',
  'ex-kr-cadillac-02': 'supine-feet-in-straps',
  'ex-global-reformer-01': 'supine-articulated-bridge',
  'ex-global-reformer-02': 'supine-chest-lift-curl',
  'ex-global-reformer-03': 'kneeling-chest-expansion-triceps',
});

/**
 * Source-text-constrained separation of two previously conflated mat patterns.
 * See docs/clam-open-book-source-comparison.md. This corrects cross-movement
 * motion leakage only; coordinates/ROM/anatomy are not clinically verified.
 */
function resolveSeparatedSideLyingBlueprint(exercise: PilatesExercise): ArchetypeRigBlueprint | null {
  const isClam = exercise.id === 'original-mat-clam';
  const isOpenBook = exercise.id === 'original-mat-open-book';
  if ((!isClam && !isOpenBook) || exercise.apparatus !== 'mat' || exercise.bodyPosition !== 'side-lying') return null;
  const base = ARCHETYPE_BY_ID.get('side-lying-clam-open-book')!;
  const start = makeJointMap({
    ...base.startJoints,
    farShoulder: base.startJoints.shoulder,
    farElbow: base.startJoints.elbow,
    farWrist: base.startJoints.wrist,
  });
  // Retain the author's existing 2D projection, but never combine knee opening
  // with arm/trunk opening. No source image or video coordinates were copied.
  const middle = isClam
    ? makeJointMap({ ...start, knee: base.middleJoints.knee })
    : makeJointMap({ ...base.middleJoints, hip: start.hip, knee: start.knee, farShoulder: start.farShoulder, farElbow: start.farElbow, farWrist: start.farWrist });
  const name = isClam ? '클램' : '오픈 북';
  const movingJoints: readonly (keyof RigJointMap)[] = isClam
    ? ['knee']
    : ['head', 'neck', 'shoulder', 'elbow', 'wrist', 'hand', 'thoracic'];
  const anchors: readonly (keyof RigJointMap)[] = isClam
    ? ['pelvis', 'ankle']
    : ['pelvis', 'knee', 'ankle'];
  const anchorGuides = (joints: RigJointMap): readonly JointAlignmentGuide[] => [{
    id: isClam ? 'clam-pelvis-ankle-still' : 'open-book-lower-body-still',
    labelKo: isClam ? '골반·발 위치 유지' : '굽힌 무릎·골반 위치 유지',
    cueKo: isClam ? '위 무릎을 여는 동안 몸통이 함께 뒤로 구르지 않도록 합니다.' : '팔을 열기 위해 무릎을 클램처럼 벌리지 않습니다.',
    kind: 'anchor-lock', from: joints.pelvis, to: isClam ? joints.ankle : joints.knee,
    cautionKo: '정확한 각도와 개인별 허용 범위를 이 2D 그림에서 판단하지 않습니다.',
  }];
  const movingStart = isClam ? start.knee : start.hand;
  const movingMiddle = isClam ? middle.knee : middle.hand;
  return {
    ...base,
    archetypeId: isClam ? 'mat-clam-isolated' : 'mat-open-book-isolated',
    archetypeTitleKo: isClam ? '매트 클램 · 무릎 열기 분리' : '매트 오픈 북 · 상지·흉곽 열기 분리',
    startJoints: start, middleJoints: middle, endJoints: start,
    fixedAnchorJoints: anchors.map((joint) => ({ joint, defaultSurfaceKo: '출처 본문과 대조한 유지 부위 · 2D 개략 위치' })),
    movingJoints,
    phaseTitlesKo: isClam
      ? ['옆으로 누워 무릎 포개기', '위쪽 무릎만 열기', '위쪽 무릎을 처음 위치로 복귀']
      : ['옆으로 누워 팔을 앞으로 모으기', '위쪽 팔·흉곽 열기', '팔을 처음 위치로 복귀'],
    phaseSummariesKo: isClam
      ? ['발을 붙이고 무릎을 굽힌 옆으로 누운 자세입니다.', '골반과 몸통을 함께 돌리지 않고 위쪽 무릎을 엽니다. 오픈 북의 팔 회전은 포함하지 않습니다.', '무릎을 천천히 내려 처음 자세로 돌아옵니다.']
      : ['무릎을 굽힌 옆으로 누운 자세에서 팔을 앞으로 모읍니다.', '굽힌 무릎 위치를 유지하며 위팔과 흉곽을 편한 범위에서 엽니다. 클램의 무릎 벌림은 포함하지 않습니다.', '사용자가 작성한 동작 계획에 따라 팔을 처음 위치로 되돌립니다.'],
    breathCuesKo: ['편안한 호흡 유지 · 출처별 호흡 타이밍 미확정', '억지로 범위를 늘리지 않기', '호흡을 유지하며 제어해 복귀'],
    alignments: { start: anchorGuides(start), middle: anchorGuides(middle), end: anchorGuides(start) },
    directionVectors: {
      start: [{ id: `${name}-setup`, labelKo: '준비 위치', kind: 'axial-lengthening', points: [start.pelvis, start.ankle], phaseScope: 'start' }],
      middle: [{ id: `${name}-open`, labelKo: isClam ? '위 무릎 열기' : '위팔 열기', kind: 'limb-excursion', points: [movingStart, movingMiddle], phaseScope: 'start-to-middle' }],
      end: [{ id: `${name}-return`, labelKo: '처음 위치로 복귀', kind: 'return-control', points: [movingMiddle, movingStart], phaseScope: 'middle-to-end' }],
    },
    poseDeltaSummary: {
      startToMiddleKo: isClam ? '위 무릎만 이동하고 팔·몸통은 준비 위치를 유지합니다.' : '팔·흉곽을 열고 무릎·골반은 준비 위치를 유지합니다.',
      middleToEndKo: '준비 자세의 좌표로 복귀합니다. 실제 시간·속도는 검증되지 않았습니다.',
      invariantAnchorsKo: isClam ? '발과 골반 유지 · 몸통 회전 제외' : '무릎과 골반 유지 · 무릎 벌림 제외',
      keyJointChangeKo: `${name}의 움직이는 부위를 분리한 2D 개략도 · 해부학적 실측 아님`,
    },
  };
}

function resolveSeparatedApparatusContactBlueprint(
  exercise: PilatesExercise,
): ArchetypeRigBlueprint | null {
  // D-01: Frog end phase returns to flexed-knee Frog home position instead of ceiling leg lift
  if (exercise.id === 'original-reformer-strap-frog') {
    const base = ARCHETYPE_BY_ID.get('supine-feet-in-straps')!;
    const endJoints = makeJointMap({
      head: { x: 46, y: 120 },
      neck: { x: 64, y: 124 },
      shoulder: { x: 84, y: 126 },
      elbow: { x: 108, y: 132 },
      wrist: { x: 136, y: 134 },
      hand: { x: 146, y: 134 },
      thoracic: { x: 112, y: 128 },
      lumbar: { x: 136, y: 128 },
      pelvis: { x: 158, y: 128 },
      hip: { x: 162, y: 126 },
      knee: { x: 185, y: 90 },
      ankle: { x: 217, y: 74 },
      heel: { x: 213, y: 80 },
      toe: { x: 229, y: 66 },
    });
    return {
      ...base,
      archetypeId: 'reformer-strap-frog-isolated',
      archetypeTitleKo: '리포머 스트랩 프로그 · 굴곡 홈 포지션 제어 복귀 분리',
      endJoints,
      carriageOffsets: [6, 36, 6],
      phaseTitlesKo: [
        '다이아몬드 프로그 굴곡 및 천골 임프린트 준비',
        '45° 사선 하방 스트랩 프레스 & 내전근 밀착 정점',
        '스프링 장력을 버티며 프로그 굴곡 홈 포지션 제어 복귀',
      ],
      phaseSummariesKo: [
        base.phaseSummariesKo[0],
        base.phaseSummariesKo[1],
        '스프링이 다리를 급격히 당기지 않도록 고관절·무릎을 천천히 접으며 시작 프로그(Frog) 굴곡 홈 포지션으로 제어 복귀합니다.',
      ],
      directionVectors: {
        ...base.directionVectors,
        end: [
          {
            id: 'vec-straps-frog-return',
            labelKo: '프로그 굴곡 홈 포지션 제어 복귀',
            kind: 'return-control',
            points: [pt(268, 114), pt(217, 74)],
            phaseScope: 'middle-to-end',
          },
        ],
      },
      poseDeltaSummary: {
        ...base.poseDeltaSummary,
        middleToEndKo:
          '고관절과 무릎을 제어하며 접어 발목(268,114→217,74)과 무릎(218,98→185,90)이 시작 프로그 굴곡 홈 포지션으로 복귀합니다. (해부학적 실측 아님)',
      },
    };
  }

  // D-02A: Reformer plank hands on right footbar top (266,126), feet on left sliding carriage (y:138)
  if (exercise.id === 'ex-plank-01') {
    const base = ARCHETYPE_BY_ID.get('plank-long-stretch-chair-pike')!;
    const startJoints = makeJointMap({
      head: { x: 264, y: 58 },
      neck: { x: 252, y: 68 },
      shoulder: { x: 242, y: 76 },
      elbow: { x: 252, y: 102 },
      wrist: { x: 262, y: 126 },
      hand: { x: 268, y: 126 },
      thoracic: { x: 206, y: 88 },
      lumbar: { x: 172, y: 100 },
      pelvis: { x: 146, y: 110 },
      hip: { x: 142, y: 112 },
      knee: { x: 110, y: 126 },
      ankle: { x: 80, y: 138 },
      heel: { x: 72, y: 136 },
      toe: { x: 82, y: 142 },
    });
    const middleJoints = makeJointMap({
      head: { x: 242, y: 64 },
      neck: { x: 232, y: 74 },
      shoulder: { x: 220, y: 82 },
      elbow: { x: 242, y: 104 },
      wrist: { x: 262, y: 126 },
      hand: { x: 268, y: 126 },
      thoracic: { x: 192, y: 94 },
      lumbar: { x: 166, y: 106 },
      pelvis: { x: 148, y: 114 },
      hip: { x: 144, y: 116 },
      knee: { x: 128, y: 128 },
      ankle: { x: 114, y: 138 },
      heel: { x: 106, y: 136 },
      toe: { x: 116, y: 142 },
    });
    const endJoints = makeJointMap({
      head: { x: 264, y: 58 },
      neck: { x: 252, y: 68 },
      shoulder: { x: 242, y: 76 },
      elbow: { x: 252, y: 102 },
      wrist: { x: 262, y: 126 },
      hand: { x: 268, y: 126 },
      thoracic: { x: 206, y: 88 },
      lumbar: { x: 172, y: 100 },
      pelvis: { x: 146, y: 110 },
      hip: { x: 142, y: 112 },
      knee: { x: 113, y: 126 },
      ankle: { x: 84, y: 138 },
      heel: { x: 76, y: 136 },
      toe: { x: 86, y: 142 },
    });
    return {
      ...base,
      archetypeId: 'reformer-plank-long-stretch-isolated',
      archetypeTitleKo: '리포머 롱 스트레치 플랭크 · 풋바 손 지지 & 캐리지 발 지지 분리',
      fixedAnchorJoints: [
        {
          joint: 'wrist',
          defaultSurfaceKo: '리포머 우측 풋바 상단 손목 수직 지지점 (262,126)',
        },
        {
          joint: 'ankle',
          defaultSurfaceKo: '리포머 좌측 슬라이딩 캐리지 발볼·발목 지지점',
        },
      ],
      startJoints,
      middleJoints,
      endJoints,
      carriageOffsets: [6, 36, 10],
      pedalAngles: [0, 0, 0],
      alignments: {
        start: [
          {
            id: 'align-reformer-plank-wrist-stack',
            labelKo: '풋바 손목 수직 지지선',
            cueKo: '손목(262,126)을 우측 풋바 상단에 두고 전거근으로 밀어냅니다.',
            kind: 'plumb-line',
            from: pt(262, 54),
            to: pt(262, 134),
            cautionKo: '날개뼈 사이가 꺼지지 않게 유지합니다.',
          },
          {
            id: 'align-reformer-plank-line',
            labelKo: '정수리-견갑-골반-발목 사선 플랭크 축',
            cueKo: '좌측 슬라이딩 캐리지 위 발볼(80,138)부터 정수리까지 일직선을 유지합니다.',
            kind: 'axis-line',
            from: pt(264, 58),
            to: pt(80, 138),
            targetAngleDeg: 24,
            cautionKo: '골반이 바닥으로 처지지 않게 복횡근과 둔근을 연결합니다.',
          },
        ],
        middle: [
          {
            id: 'align-reformer-plank-glide',
            labelKo: '롱 스트레치 어깨 후방 글라이드 플랭크 축',
            cueKo: '풋바 손 지지를 유지한 채 캐리지와 함께 몸통 사선이 수평 이동합니다.',
            kind: 'axis-line',
            from: pt(242, 64),
            to: pt(114, 138),
            targetAngleDeg: 30,
            cautionKo: '허리가 꺾이지 않도록 갈비뼈와 골반 거리를 유지합니다.',
          },
        ],
        end: [
          {
            id: 'align-reformer-plank-return',
            labelKo: '풋바 수직 스택 복귀 정렬선',
            cueKo: '어깨를 다시 풋바 수직선 근처로 제어 복귀합니다.',
            kind: 'neutral-zone',
            from: pt(264, 58),
            to: pt(84, 138),
            cautionKo: '복귀 마지막까지 전거근 지지를 놓지 않습니다.',
          },
        ],
      },
      directionVectors: {
        start: [
          {
            id: 'vec-reformer-plank-serratus-push',
            labelKo: '풋바 상방 전거근 푸시',
            kind: 'axial-lengthening',
            points: [pt(262, 126), pt(242, 76)],
            phaseScope: 'start',
          },
        ],
        middle: [
          {
            id: 'vec-reformer-plank-carriage-glide',
            labelKo: '캐리지 글라이드 & 견관절 신전 제어',
            kind: 'carriage-travel',
            points: [pt(80, 138), pt(114, 138)],
            phaseScope: 'start-to-middle',
          },
        ],
        end: [
          {
            id: 'vec-reformer-plank-home-return',
            labelKo: '풋바 수직 지지선 상단 복귀',
            kind: 'return-control',
            points: [pt(114, 138), pt(84, 138)],
            phaseScope: 'middle-to-end',
          },
        ],
      },
      poseDeltaSummary: {
        startToMiddleKo:
          '우측 풋바 상단(262,126)에 손목을 고정한 채 좌측 캐리지 위 발목(80,138→114,138)과 어깨(242,76→220,82)가 수평 글라이드합니다.',
        middleToEndKo:
          '광배근과 전거근 지지로 캐리지 발목(114,138→84,138)과 어깨가 풋바 수직 스택(242,76)으로 복귀합니다. (해부학적 실측 아님)',
        invariantAnchorsKo: '우측 풋바 손목(wrist: 262,126)과 손(hand: 268,126) 지지점이 고정됩니다.',
        keyJointChangeKo: '풋바 손 고정 + 캐리지 발 수평 이동 분리 (2D 개략도 · 해부학적 실측 아님)',
      },
    };
  }

  // D-02B: Chair plank/pike hands on Chair seat top (x:108..196, y:106), feet on Chair pedal tip
  if (
    exercise.id === 'ex-plank-02' ||
    exercise.id === 'original-chair-incline-support' ||
    exercise.id === 'ex-kr-chair-01'
  ) {
    const base = ARCHETYPE_BY_ID.get('plank-long-stretch-chair-pike')!;
    const startJoints = makeJointMap({
      head: { x: 106, y: 48 },
      neck: { x: 116, y: 58 },
      shoulder: { x: 126, y: 66 },
      elbow: { x: 129, y: 86 },
      wrist: { x: 132, y: 106 },
      hand: { x: 124, y: 106 },
      thoracic: { x: 146, y: 78 },
      lumbar: { x: 164, y: 92 },
      pelvis: { x: 178, y: 104 },
      hip: { x: 182, y: 108 },
      knee: { x: 198, y: 132 },
      ankle: { x: 216, y: 156 },
      heel: { x: 222, y: 152 },
      toe: { x: 212, y: 160 },
    });
    const middleJoints = makeJointMap({
      head: { x: 118, y: 66 },
      neck: { x: 124, y: 58 },
      shoulder: { x: 130, y: 56 },
      elbow: { x: 131, y: 82 },
      wrist: { x: 132, y: 106 },
      hand: { x: 124, y: 106 },
      thoracic: { x: 146, y: 46 },
      lumbar: { x: 162, y: 42 },
      pelvis: { x: 176, y: 48 },
      hip: { x: 180, y: 54 },
      knee: { x: 194, y: 96 },
      ankle: { x: 208, y: 134 },
      heel: { x: 214, y: 130 },
      toe: { x: 204, y: 138 },
    });
    const endJoints = makeJointMap({
      head: { x: 106, y: 48 },
      neck: { x: 116, y: 58 },
      shoulder: { x: 126, y: 66 },
      elbow: { x: 129, y: 86 },
      wrist: { x: 132, y: 106 },
      hand: { x: 124, y: 106 },
      thoracic: { x: 146, y: 78 },
      lumbar: { x: 164, y: 92 },
      pelvis: { x: 178, y: 104 },
      hip: { x: 182, y: 108 },
      knee: { x: 200, y: 134 },
      ankle: { x: 216, y: 159 },
      heel: { x: 222, y: 155 },
      toe: { x: 212, y: 163 },
    });
    return {
      ...base,
      archetypeId: 'chair-plank-pike-isolated',
      archetypeTitleKo: '체어 시트 손 지지 · 페달 발 지지 플랭크 & 파이크 분리',
      fixedAnchorJoints: [
        {
          joint: 'wrist',
          defaultSurfaceKo: '체어 패디드 시트 상단 손목 수직 지지점 (132,106)',
        },
        {
          joint: 'ankle',
          defaultSurfaceKo: '체어 우측 하단 페달 팁 발볼·발목 지지점',
        },
      ],
      startJoints,
      middleJoints,
      endJoints,
      carriageOffsets: [0, 0, 0],
      pedalAngles: [28, 8, 28],
      alignments: {
        start: [
          {
            id: 'align-chair-seat-wrist-plumb',
            labelKo: '체어 시트 손목-어깨 수직 지지선',
            cueKo: '체어 패디드 시트 상단(y:106)에 손바닥을 고정하고 어깨를 수직으로 세웁니다.',
            kind: 'plumb-line',
            from: pt(132, 42),
            to: pt(132, 112),
            cautionKo: '어깨가 시트 앞쪽으로 과하게 쏠리지 않게 주의합니다.',
          },
          {
            id: 'align-chair-incline-line',
            labelKo: '시트-골반-페달 사선 지지 축',
            cueKo: '페달 위 발볼(216,156)부터 어깨(126,66)까지 사선 정렬을 유지합니다.',
            kind: 'axis-line',
            from: pt(126, 66),
            to: pt(216, 156),
            targetAngleDeg: 45,
            cautionKo: '요추가 꺾이지 않도록 복부를 당겨 지지합니다.',
          },
        ],
        middle: [
          {
            id: 'align-chair-pike-apex',
            labelKo: '파이크 골반 천장 리프트 및 시트 수직 지지축',
            cueKo: '시트 위 손목 지지를 유지하며 복부 스쿱으로 페달과 골반을 끌어올립니다.',
            kind: 'angle-arc',
            from: pt(132, 106),
            to: pt(176, 48),
            targetAngleDeg: 62,
            cautionKo: '다리 반동이 아닌 복부 굴곡 힘으로 페달을 부양합니다.',
          },
        ],
        end: [
          {
            id: 'align-chair-return-line',
            labelKo: '체어 사선 플랭크 제어 복귀 정렬선',
            cueKo: '페달이 급격히 바닥으로 떨어지지 않게 제동하며 시작 사선으로 돌아옵니다.',
            kind: 'neutral-zone',
            from: pt(126, 66),
            to: pt(216, 159),
            cautionKo: '손목 압박이 과해지지 않도록 전거근 푸시를 유지합니다.',
          },
        ],
      },
      directionVectors: {
        start: [
          {
            id: 'vec-chair-seat-push',
            labelKo: '체어 시트 상방 전거근 푸시',
            kind: 'axial-lengthening',
            points: [pt(132, 106), pt(126, 66)],
            phaseScope: 'start',
          },
        ],
        middle: [
          {
            id: 'vec-chair-pike-up',
            labelKo: '복부 스쿱 & 페달 상방 부양 (216,156→208,134)',
            kind: 'carriage-travel',
            points: [pt(216, 156), pt(208, 134)],
            phaseScope: 'start-to-middle',
          },
        ],
        end: [
          {
            id: 'vec-chair-pedal-eccentric-down',
            labelKo: '페달 하방 제어 하강 복귀 (208,134→216,159)',
            kind: 'return-control',
            points: [pt(208, 134), pt(216, 159)],
            phaseScope: 'middle-to-end',
          },
        ],
      },
      poseDeltaSummary: {
        startToMiddleKo:
          '체어 시트 상단(132,106)에 손목을 지지한 채 복부 스쿱으로 골반(178,104→176,48)과 페달 위 발목(216,156→208,134)을 끌어올립니다.',
        middleToEndKo:
          '시트 손목 지지를 유지하며 페달 위 발목(208,134→216,159)과 골반을 시작 사선 정렬로 감속 복귀합니다. (해부학적 실측 아님)',
        invariantAnchorsKo: '체어 시트 상단 손목(wrist: 132,106)과 손(hand: 124,106) 지지점이 고정됩니다.',
        keyJointChangeKo: '체어 시트 손 지지 + 페달 발 지지 접점 정합 (2D 개략도 · 해부학적 실측 아님)',
      },
    };
  }

  // D-05: Standing Barrel exercises stand clear of barrel dome (x:18..70) and hold ladder rung (x:76..96)
  if (
    exercise.id === 'original-barrel-standing-hip-extension' ||
    exercise.id === 'original-barrel-standing-side-reach'
  ) {
    const base = ARCHETYPE_BY_ID.get('standing-scooter-lunge-splits')!;
    const startJoints = makeJointMap({
      head: { x: 138, y: 40 },
      neck: { x: 136, y: 56 },
      shoulder: { x: 134, y: 72 },
      elbow: { x: 112, y: 84 },
      wrist: { x: 96, y: 80 },
      hand: { x: 88, y: 76 },
      thoracic: { x: 138, y: 92 },
      lumbar: { x: 140, y: 112 },
      pelvis: { x: 142, y: 126 },
      hip: { x: 142, y: 128 },
      knee: { x: 158, y: 148 },
      ankle: { x: 170, y: 168 },
      heel: { x: 164, y: 174 },
      toe: { x: 180, y: 174 },
      farHip: { x: 138, y: 128 },
      farKnee: { x: 138, y: 152 },
      farAnkle: { x: 138, y: 172 },
      farToe: { x: 148, y: 174 },
    });
    const middleJoints = makeJointMap({
      head: { x: 134, y: 42 },
      neck: { x: 132, y: 58 },
      shoulder: { x: 130, y: 74 },
      elbow: { x: 110, y: 84 },
      wrist: { x: 96, y: 80 },
      hand: { x: 88, y: 76 },
      thoracic: { x: 136, y: 94 },
      lumbar: { x: 140, y: 112 },
      pelvis: { x: 142, y: 126 },
      hip: { x: 144, y: 128 },
      knee: { x: 184, y: 138 },
      ankle: { x: 222, y: 148 },
      heel: { x: 216, y: 152 },
      toe: { x: 232, y: 150 },
      farHip: { x: 138, y: 128 },
      farKnee: { x: 138, y: 152 },
      farAnkle: { x: 138, y: 172 },
      farToe: { x: 148, y: 174 },
    });
    const endJoints = makeJointMap({
      head: { x: 138, y: 40 },
      neck: { x: 136, y: 56 },
      shoulder: { x: 134, y: 72 },
      elbow: { x: 112, y: 84 },
      wrist: { x: 96, y: 80 },
      hand: { x: 88, y: 76 },
      thoracic: { x: 138, y: 92 },
      lumbar: { x: 140, y: 112 },
      pelvis: { x: 142, y: 126 },
      hip: { x: 142, y: 128 },
      knee: { x: 162, y: 148 },
      ankle: { x: 174, y: 168 },
      heel: { x: 168, y: 174 },
      toe: { x: 184, y: 174 },
      farHip: { x: 138, y: 128 },
      farKnee: { x: 138, y: 152 },
      farAnkle: { x: 138, y: 172 },
      farToe: { x: 148, y: 174 },
    });
    return {
      ...base,
      archetypeId: 'barrel-standing-hip-extension-isolated',
      archetypeTitleKo: '래더 배럴 스탠딩 · 사다리 가로대 손 지지 & 비관통 하지 분리',
      fixedAnchorJoints: [
        {
          joint: 'hand',
          defaultSurfaceKo: '래더 배럴 사다리 상단 가로대(rung) 손 파지 지지점 (88,76)',
        },
        {
          joint: 'farAnkle',
          defaultSurfaceKo: '래더 배럴 외측 바닥 지지 다리 발목 고정점 (138,172)',
        },
      ],
      startJoints,
      middleJoints,
      endJoints,
      carriageOffsets: [0, 0, 0],
      pedalAngles: [0, 0, 0],
      poseDeltaSummary: {
        startToMiddleKo:
          '배럴 돔(x:18..70)과 겹치지 않는 바닥(x:138)에 지지 다리를 두고 손(88,76)으로 사다리 가로대(x:76..96)를 잡은 채 작동 다리를 뒤로 뻗습니다.',
        middleToEndKo:
          '사다리 가로대 손 지지와 골반 수평을 유지하며 작동 다리를 시작 위치로 복귀합니다. (해부학적 실측 아님)',
        invariantAnchorsKo: '사다리 가로대 손(hand: 88,76) 파지점과 바닥 지지 다리(farAnkle: 138,172)가 고정됩니다.',
        keyJointChangeKo: '배럴 돔 관통 제거 + 사다리 가로대 손 접점 정합 (2D 개략도 · 해부학적 실측 아님)',
      },
    };
  }

  return null;
}


interface SemanticOverrideSpec {
  readonly archetypeId: string;
  readonly archetypeTitleKo: string;
  readonly baseArchetypeId: string;
  readonly fixedAnchorJoints: readonly { joint: keyof RigJointMap; defaultSurfaceKo: string }[];
  readonly movingJoints: readonly (keyof RigJointMap)[];
  readonly startJoints: RigJointMap;
  readonly middleJoints: RigJointMap;
  readonly endJoints: RigJointMap;
  readonly carriageOffsets: readonly [number, number, number];
  readonly pedalAngles: readonly [number, number, number];
  readonly phaseTitlesKo: readonly [string, string, string];
  readonly phaseSummariesKo?: readonly [string, string, string];
  readonly muscles?: ArchetypeRigBlueprint['muscles'];
  readonly startToMiddleKo: string;
  readonly middleToEndKo: string;
  readonly invariantAnchorsKo: string;
  readonly keyJointChangeKo: string;
  readonly middleVectorLabelKo: string;
  readonly middleVectorKind: MovementDirectionVector['kind'];
  readonly middleVectorPoints: readonly Point2D[];
  readonly endVectorLabelKo: string;
  readonly endVectorPoints: readonly Point2D[];
}

function buildSemanticOverrideBlueprint(spec: SemanticOverrideSpec): ArchetypeRigBlueprint {
  const base = ARCHETYPE_BY_ID.get(spec.baseArchetypeId)!;
  return {
    ...base,
    archetypeId: spec.archetypeId,
    archetypeTitleKo: spec.archetypeTitleKo,
    fixedAnchorJoints: spec.fixedAnchorJoints,
    movingJoints: spec.movingJoints,
    startJoints: spec.startJoints,
    middleJoints: spec.middleJoints,
    endJoints: spec.endJoints,
    carriageOffsets: spec.carriageOffsets,
    pedalAngles: spec.pedalAngles,
    phaseTitlesKo: spec.phaseTitlesKo,
    phaseSummariesKo:
      spec.phaseSummariesKo ?? [
        spec.invariantAnchorsKo,
        spec.startToMiddleKo,
        spec.middleToEndKo,
      ],
    muscles: spec.muscles ?? base.muscles,
    directionVectors: {
      start: base.directionVectors.start,
      middle: [
        {
          id: `vec-${spec.archetypeId}-mid`,
          labelKo: spec.middleVectorLabelKo,
          kind: spec.middleVectorKind,
          points: spec.middleVectorPoints,
          phaseScope: "start-to-middle",
        },
      ],
      end: [
        {
          id: `vec-${spec.archetypeId}-end`,
          labelKo: spec.endVectorLabelKo,
          kind: "return-control",
          points: spec.endVectorPoints,
          phaseScope: "middle-to-end",
        },
      ],
    },
    poseDeltaSummary: {
      startToMiddleKo: spec.startToMiddleKo,
      middleToEndKo: spec.middleToEndKo,
      invariantAnchorsKo: spec.invariantAnchorsKo,
      keyJointChangeKo: spec.keyJointChangeKo,
    },
  };
}

/**
 * Round 4 & Round 5 Semantic Audit minimal blueprint differentiation for clear-evidence mismatches
 * (SM-01..SM-09, including Round 5 pure breath-observation 4 exercises).
 * Clinical/anatomical accuracy is NOT assumed (anatomicalAccuracyAssumed: false).
 */
function resolveSeparatedSemanticMismatchBlueprint(
  exercise: PilatesExercise,
): ArchetypeRigBlueprint | null {
  // Round 5-A: Mat Supine Breath Observation (stationary arms/legs on mat y:148 + pure ribcage breath modulation)
  if (exercise.id === "original-mat-rib-breath") {
    const startJoints = makeJointMap({
      head: { x: 56, y: 132 }, neck: { x: 74, y: 136 }, shoulder: { x: 92, y: 138 },
      elbow: { x: 116, y: 140 }, wrist: { x: 136, y: 136 }, hand: { x: 144, y: 134 },
      thoracic: { x: 124, y: 140 }, lumbar: { x: 152, y: 140 }, pelvis: { x: 182, y: 142 },
      hip: { x: 186, y: 140 }, knee: { x: 214, y: 98 }, ankle: { x: 242, y: 142 },
      heel: { x: 248, y: 148 }, toe: { x: 262, y: 148 },
    });
    const middleJoints = makeJointMap({
      ...startJoints,
      thoracic: { x: 124, y: 134 }, lumbar: { x: 152, y: 138 },
    });
    const endJoints = makeJointMap({
      ...startJoints,
      thoracic: { x: 124, y: 137 }, lumbar: { x: 152, y: 139 },
    });
    return buildSemanticOverrideBlueprint({
      archetypeId: "mat-supine-rib-breath-isolated",
      archetypeTitleKo: "매트 수파인 호흡 관찰 · 사지 매트 고정 & 360도 흉곽 호흡 분리",
      baseArchetypeId: "supine-breath-pelvic-clock",
      fixedAnchorJoints: [
        { joint: "pelvis", defaultSurfaceKo: "매트 위 천골·골반 수평 지지점 (182,142)" },
        { joint: "heel", defaultSurfaceKo: "무릎 세운 양발 뒤꿈치 매트 지지점 (248,148)" },
      ],
      movingJoints: ["thoracic", "lumbar"],
      startJoints, middleJoints, endJoints,
      carriageOffsets: [0, 0, 0], pedalAngles: [0, 0, 0],
      phaseTitlesKo: [
        "지지 자세: 무릎 세우고 누워 골반·발·양손 매트 고정",
        "호흡 관찰(들숨): 사지 고정(Δ0px) · 옆·등 흉곽 확장",
        "호흡 관찰(날숨): 지지 유지 · 하부 갈비뼈 정돈 이완",
      ],
      phaseSummariesKo: [
        "지지 자세: 무릎을 세우고 매트(y:148)에 누워 천골(182,142)·양발 뒤꿈치(248,148)·양손(144,134)을 팔다리 이동 없이 안정적으로 지지합니다.",
        "호흡 관찰(들숨): 팔(hand Δ0px)·다리(heel Δ0px) 움직임 없이 마시는 숨에 흉곽(124,140→124,134)이 옆과 등 쪽으로 넓어지는 감각만 관찰합니다.",
        "호흡 관찰(날숨): 매트 지지 자세를 유지한 채 내쉬는 숨에 흉곽(124,134→124,137)이 부드럽게 가라앉는 호흡 흐름을 관찰합니다. (해부학적 실측 아님)",
      ],
      muscles: {
        primary: "core-transversus",
        extraPrimary: "glute-med",
        stabilizer: "rectus-obliques",
        lengthening: "thoracic-extensors",
      },
      startToMiddleKo: "양손(144,134)·골반(182,142)·양발 뒤꿈치(248,148)를 매트에 고정한 채 들숨에 흉곽(124,140→124,134)의 확장만 관찰합니다.",
      middleToEndKo: "사지 이동(Δ0px) 없이 날숨에 흉곽(124,134→124,137)이 차분히 정돈되는 흐름을 관찰합니다. (해부학적 실측 아님)",
      invariantAnchorsKo: "매트 위 골반(pelvis: 182,142), 뒤꿈치(heel: 248,148), 몸통 옆 손(hand: 144,134)이 고정됩니다.",
      keyJointChangeKo: "큐에 없는 오버헤드 팔 스윕(64.1px)을 제거하고 지지 자세와 순수 흉곽 호흡 관찰을 분리(thoracic dy -6px · 2D 개략도)",
      middleVectorLabelKo: "들숨 360도 흉곽 확장 관찰 (사지 고정)",
      middleVectorKind: "axial-lengthening",
      middleVectorPoints: [pt(124, 140), pt(124, 134)],
      endVectorLabelKo: "날숨 하부 늑골 정돈 관찰",
      endVectorPoints: [pt(124, 134), pt(124, 137)],
    });
  }

  // Round 5-B: Cadillac Table Breath Observation (no springs used, supine on table y:145, stationary limbs + breath observation)
  if (exercise.id === "original-cadillac-table-breath") {
    const startJoints = makeJointMap({
      head: { x: 58, y: 130 }, neck: { x: 76, y: 134 }, shoulder: { x: 94, y: 136 },
      elbow: { x: 118, y: 138 }, wrist: { x: 138, y: 134 }, hand: { x: 146, y: 132 },
      thoracic: { x: 126, y: 138 }, lumbar: { x: 154, y: 138 }, pelvis: { x: 182, y: 140 },
      hip: { x: 186, y: 138 }, knee: { x: 214, y: 96 }, ankle: { x: 242, y: 140 },
      heel: { x: 248, y: 145 }, toe: { x: 262, y: 145 },
    });
    const middleJoints = makeJointMap({
      ...startJoints,
      thoracic: { x: 126, y: 132 }, lumbar: { x: 154, y: 136 },
    });
    const endJoints = makeJointMap({
      ...startJoints,
      thoracic: { x: 126, y: 135 }, lumbar: { x: 154, y: 137 },
    });
    return buildSemanticOverrideBlueprint({
      archetypeId: "cadillac-table-breath-isolated",
      archetypeTitleKo: "캐딜락 테이블 호흡 · 스프링 미사용 테이블 지지 & 순수 흉곽 호흡 분리",
      baseArchetypeId: "supine-breath-pelvic-clock",
      fixedAnchorJoints: [
        { joint: "pelvis", defaultSurfaceKo: "캐딜락 테이블 상면 골반 지지점 (182,140)" },
        { joint: "heel", defaultSurfaceKo: "캐딜락 테이블 상면 양발 뒤꿈치 접지점 (248,145 · 스프링 미사용)" },
      ],
      movingJoints: ["thoracic", "lumbar"],
      startJoints, middleJoints, endJoints,
      carriageOffsets: [0, 0, 0], pedalAngles: [0, 0, 0],
      phaseTitlesKo: [
        "지지 자세: 스프링 미사용 · 캐딜락 테이블 누운 정렬",
        "호흡 관찰(들숨): 사지 고정(Δ0px) · 등·옆구리 호흡 확장",
        "호흡 관찰(날숨): 테이블 지지 유지 · 흉곽 이완 관찰",
      ],
      phaseSummariesKo: [
        "지지 자세(스프링 미사용): 캐딜락 테이블(y:145) 위에 누워 스프링 연결 없이 골반(182,140)·뒤꿈치(248,145)·양손(146,132)을 편안히 지지합니다.",
        "호흡 관찰(들숨): 팔(hand Δ0px)·다리(heel Δ0px) 이동 없이 마시는 숨에 테이블에 닿은 등 뒤쪽과 옆구리 흉곽(126,138→126,132)이 넓어지는 감각을 관찰합니다.",
        "호흡 관찰(날숨): 테이블 지지 자세를 유지하며 내쉬는 숨에 어깨 긴장을 풀고 흉곽(126,132→126,135)이 안정되는 흐름을 관찰합니다. (해부학적 실측 아님)",
      ],
      muscles: {
        primary: "core-transversus",
        extraPrimary: "glute-med",
        stabilizer: "rectus-obliques",
        lengthening: "thoracic-extensors",
      },
      startToMiddleKo: "스프링 미사용 상태에서 양손(146,132)과 뒤꿈치(248,145)를 테이블에 고정한 채 들숨 흉곽(126,138→126,132) 확장을 관찰합니다.",
      middleToEndKo: "팔·다리 움직임 없이 날숨에 흉곽(126,132→126,135)과 어깨가 테이블 위에서 편안히 가라앉는 흐름을 관찰합니다. (해부학적 실측 아님)",
      invariantAnchorsKo: "캐딜락 테이블 위 골반(pelvis: 182,140), 뒤꿈치(heel: 248,145), 손(hand: 146,132 · 스프링 미연결)이 고정됩니다.",
      keyJointChangeKo: "스프링 미사용(none) 반영 및 손 스프링 코일/팔 스윕 제거 후 순수 호흡 관찰 분리(thoracic dy -6px · 2D 개략도)",
      middleVectorLabelKo: "테이블 지지 들숨 흉곽 확장 관찰",
      middleVectorKind: "axial-lengthening",
      middleVectorPoints: [pt(126, 138), pt(126, 132)],
      endVectorLabelKo: "날숨 흉곽 정돈 및 이완 관찰",
      endVectorPoints: [pt(126, 132), pt(126, 135)],
    });
  }

  // Round 5-C: Chair Seated Breath Observation (pelvis on seat y:108, heels on floor y:176, hands resting on thighs Δ0px)
  if (exercise.id === "original-chair-seated-breath") {
    const startJoints = makeJointMap({
      head: { x: 132, y: 26 }, neck: { x: 132, y: 40 }, shoulder: { x: 132, y: 56 },
      elbow: { x: 126, y: 80 }, wrist: { x: 140, y: 94 }, hand: { x: 148, y: 96 },
      thoracic: { x: 132, y: 78 }, lumbar: { x: 132, y: 94 }, pelvis: { x: 132, y: 108 },
      hip: { x: 140, y: 108 }, knee: { x: 184, y: 126 }, ankle: { x: 202, y: 170 },
      heel: { x: 198, y: 176 }, toe: { x: 216, y: 176 },
      farHip: { x: 140, y: 108 }, farKnee: { x: 182, y: 128 }, farAnkle: { x: 200, y: 172 }, farToe: { x: 212, y: 176 },
    });
    const middleJoints = makeJointMap({
      ...startJoints,
      thoracic: { x: 136, y: 73 }, lumbar: { x: 134, y: 92 },
    });
    const endJoints = makeJointMap({
      ...startJoints,
      thoracic: { x: 134, y: 75 }, lumbar: { x: 133, y: 93 },
    });
    return buildSemanticOverrideBlueprint({
      archetypeId: "chair-seated-breath-isolated",
      archetypeTitleKo: "체어 시티드 호흡 · 시트 상단 좌골 착석 & 바닥 양발 접지 순수 호흡 분리",
      baseArchetypeId: "seated-row-arm-arc",
      fixedAnchorJoints: [
        { joint: "pelvis", defaultSurfaceKo: "운다 체어 시트 상단 좌골 지지점 (132,108 · 시트 관통 없음)" },
        { joint: "heel", defaultSurfaceKo: "체어 앞 바닥 양발 뒤꿈치 접지점 (198,176 · 허공 부유 없음)" },
      ],
      movingJoints: ["thoracic", "lumbar"],
      startJoints, middleJoints, endJoints,
      carriageOffsets: [0, 0, 0], pedalAngles: [0, 0, 0],
      phaseTitlesKo: [
        "지지 자세: 체어 시트(y:108) 착석 & 양발 바닥(y:176) 접지",
        "호흡 관찰(들숨): 사지 고정(Δ0px) · 수직 축 위 흉곽 확장",
        "호흡 관찰(날숨): 좌골 지지 유지 · 갈비뼈 정돈 관찰",
      ],
      phaseSummariesKo: [
        "지지 자세: 체어 시트 상단(y:106~115) 위 좌골(132,108)에 앉아 양발 뒤꿈치(198,176)를 바닥(y:178)에 디디고 양손(148,96)은 허벅지 위에 고정합니다.",
        "호흡 관찰(들숨): 팔 로잉(hand Δ0px)이나 다리 이동(heel Δ0px) 없이 마시는 숨에 골반 위 흉곽(132,78→136,73)이 수직 정렬 위에서 넓어지는 감각을 관찰합니다.",
        "호흡 관찰(날숨): 시트 착석과 바닥 접지를 유지한 채 내쉬는 숨에 갈비뼈(136,73→134,75)가 부드럽게 정돈되는 호흡을 관찰합니다. (해부학적 실측 아님)",
      ],
      muscles: {
        primary: "core-transversus",
        extraPrimary: "glute-med",
        stabilizer: "rectus-obliques",
        lengthening: "thoracic-extensors",
      },
      startToMiddleKo: "체어 시트 좌골(132,108)·바닥 뒤꿈치(198,176)·허벅지 위 손(148,96)을 고정한 채 들숨 흉곽(132,78→136,73) 확장을 관찰합니다.",
      middleToEndKo: "팔·다리 움직임 없이 날숨에 흉곽(136,73→134,75)이 좌골 수직 중심 위에서 정돈되는 흐름을 관찰합니다. (해부학적 실측 아님)",
      invariantAnchorsKo: "체어 시트 위 좌골(pelvis: 132,108), 바닥 뒤꿈치(heel: 198,176), 허벅지 위 양손(hand: 148,96)이 고정됩니다.",
      keyJointChangeKo: "시트 관통(y:138)·발 부유(y:148)·로잉 팔 스윕(80.5px)을 제거하고 착석 지지와 호흡 관찰을 분리(thoracic Δ6.4px · 2D 개략도)",
      middleVectorLabelKo: "시트 착석 들숨 흉곽 확장 관찰 (사지 고정)",
      middleVectorKind: "axial-lengthening",
      middleVectorPoints: [pt(132, 78), pt(136, 73)],
      endVectorLabelKo: "날숨 수직 정렬 내 흉곽 정돈 관찰",
      endVectorPoints: [pt(136, 73), pt(134, 75)],
    });
  }

  // Round 5-D: Barrel Standing Breath Observation (hands on ladder rung 88,76 Δ0px, heels grounded on floor 140,176 Δ0px, no calves fallback)
  if (exercise.id === "original-barrel-standing-breath") {
    const startJoints = makeJointMap({
      head: { x: 140, y: 34 }, neck: { x: 140, y: 50 }, shoulder: { x: 140, y: 66 },
      elbow: { x: 116, y: 82 }, wrist: { x: 96, y: 78 }, hand: { x: 88, y: 76 },
      thoracic: { x: 138, y: 84 }, lumbar: { x: 140, y: 104 }, pelvis: { x: 140, y: 120 },
      hip: { x: 142, y: 122 }, knee: { x: 144, y: 146 }, ankle: { x: 146, y: 170 },
      heel: { x: 140, y: 176 }, toe: { x: 158, y: 176 },
      farHip: { x: 138, y: 122 }, farKnee: { x: 138, y: 148 }, farAnkle: { x: 138, y: 172 }, farToe: { x: 150, y: 176 },
    });
    const middleJoints = makeJointMap({
      ...startJoints,
      thoracic: { x: 142, y: 79 }, lumbar: { x: 142, y: 102 },
    });
    const endJoints = makeJointMap({
      ...startJoints,
      thoracic: { x: 140, y: 81 }, lumbar: { x: 141, y: 103 },
    });
    return buildSemanticOverrideBlueprint({
      archetypeId: "barrel-standing-breath-isolated",
      archetypeTitleKo: "바렐 앞 스탠딩 호흡 · 래더 가로대 손 지지 & 평발 바닥 접지 순수 호흡 분리",
      baseArchetypeId: "standing-ankle-calf-upper-reach",
      fixedAnchorJoints: [
        { joint: "hand", defaultSurfaceKo: "래더 바렐 사다리 상단 가로대 가벼운 손 지지점 (88,76)" },
        { joint: "heel", defaultSurfaceKo: "바닥 양발 뒤꿈치 완전 접지점 (140,176 · 카프 레이즈 없음)" },
      ],
      movingJoints: ["thoracic", "lumbar"],
      startJoints, middleJoints, endJoints,
      carriageOffsets: [0, 0, 0], pedalAngles: [0, 0, 0],
      phaseTitlesKo: [
        "지지 자세: 래더 가로대 손 지지(88,76) & 양발 바닥 접지",
        "호흡 관찰(들숨): 손·뒤꿈치 고정(Δ0px) · 입체 흉곽 확장",
        "호흡 관찰(날숨): 발바닥 무게중심 유지 · 흉곽 정돈 관찰",
      ],
      phaseSummariesKo: [
        "지지 자세: 바렐 사다리 앞 바닥(y:178)에 양발 뒤꿈치(140,176)를 편평하게 딛고 서서 양손(88,76)을 상단 래더 가로대에 가볍게 얹어 지지합니다.",
        "호흡 관찰(들숨): 까치발 상승(heel Δ0px)이나 팔 스윕(hand Δ0px) 없이 마시는 숨에 갈비뼈(138,84→142,79)가 앞·옆·뒤로 확장되는 감각을 관찰합니다.",
        "호흡 관찰(날숨): 래더 손 지지와 발바닥 접지를 그대로 유지한 채 내쉬는 숨에 흉곽(142,79→140,81)이 차분히 가라앉는 흐름을 관찰합니다. (해부학적 실측 아님)",
      ],
      muscles: {
        primary: "core-transversus",
        extraPrimary: "rectus-obliques",
        stabilizer: "glute-med",
        lengthening: "thoracic-extensors",
      },
      startToMiddleKo: "래더 가로대 위 손(88,76)과 바닥 뒤꿈치(140,176)를 고정한 채 들숨에 흉곽(138,84→142,79)의 입체적 확장을 관찰합니다.",
      middleToEndKo: "카프 레이즈나 팔 이동(Δ0px) 없이 날숨에 발바닥 접지를 느끼며 흉곽(142,79→140,81)을 정돈합니다. (해부학적 실측 아님)",
      invariantAnchorsKo: "래더 상단 가로대 손(hand: 88,76), 바닥 양발 뒤꿈치(heel: 140,176), 기립 골반(pelvis: 140,120)이 고정됩니다.",
      keyJointChangeKo: "허공 손(dist 98px)·카프 레이즈(heel Δ14.6px)·calves 근육 fallback을 제거하고 기립 지지와 호흡 관찰을 분리(thoracic Δ6.4px · 2D 개략도)",
      middleVectorLabelKo: "래더 손 지지 들숨 흉곽 확장 관찰 (평발 고정)",
      middleVectorKind: "axial-lengthening",
      middleVectorPoints: [pt(138, 84), pt(142, 79)],
      endVectorLabelKo: "날숨 기립 정렬 내 흉곽 정돈 관찰",
      endVectorPoints: [pt(142, 79), pt(140, 81)],
    });
  }

  // SM-08A: Chair Seated Knee Lift (upward knee lift with stationary pedal vs downward pedal press)
  if (exercise.id === "original-chair-seated-knee-lift") {
    const startJoints = makeJointMap({
      head: { x: 132, y: 26 }, neck: { x: 132, y: 40 }, shoulder: { x: 132, y: 54 },
      elbow: { x: 124, y: 80 }, wrist: { x: 128, y: 102 }, hand: { x: 132, y: 106 },
      thoracic: { x: 132, y: 72 }, lumbar: { x: 132, y: 90 }, pelvis: { x: 132, y: 108 },
      hip: { x: 140, y: 108 }, knee: { x: 184, y: 126 }, ankle: { x: 188, y: 170 },
      heel: { x: 182, y: 176 }, toe: { x: 200, y: 176 },
      farHip: { x: 140, y: 108 }, farKnee: { x: 182, y: 128 }, farAnkle: { x: 184, y: 172 }, farToe: { x: 196, y: 176 },
    });
    const middleJoints = makeJointMap({
      ...startJoints,
      knee: { x: 174, y: 88 }, ankle: { x: 184, y: 132 }, heel: { x: 178, y: 138 }, toe: { x: 196, y: 136 },
    });
    const endJoints = makeJointMap({
      ...startJoints,
      knee: { x: 182, y: 120 }, ankle: { x: 187, y: 164 }, heel: { x: 181, y: 170 }, toe: { x: 199, y: 170 },
    });
    return buildSemanticOverrideBlueprint({
      archetypeId: "chair-seated-knee-lift-isolated",
      archetypeTitleKo: "체어 시티드 니 리프트 · 시트 좌골 고정 & 단측 무릎 상방 리프트 분리",
      baseArchetypeId: "chair-seated-pedal-footwork",
      fixedAnchorJoints: [
        { joint: "pelvis", defaultSurfaceKo: "체어 시트 상단 좌골 수직 지지점 (132,108)" },
        { joint: "farAnkle", defaultSurfaceKo: "바닥 지지측 발목 고정점 (184,172 · 페달 미사용)" },
      ],
      movingJoints: ["hip", "knee", "ankle", "heel", "toe"],
      startJoints, middleJoints, endJoints,
      carriageOffsets: [0, 0, 0], pedalAngles: [0, 0, 0],
      phaseTitlesKo: ["체어 시트 수직 착석 & 양발 바닥 지지 준비", "골반 수평 유지 · 단측 무릎 상방 리프트 정점", "지지측 흔들림 없이 발바닥 바닥 감속 착지"],
      startToMiddleKo: "체어 시트(132,108)와 바닥 지지 발(farAnkle: 184,172)을 고정한 채 가동 무릎(184,126→174,88)과 발목(188,170→184,132)을 위로 들어 올립니다.",
      middleToEndKo: "움직이는 페달을 밟지 않고 코어 제어로 무릎(174,88→182,120)과 발목을 바닥 쪽으로 감속 하강합니다. (해부학적 실측 아님)",
      invariantAnchorsKo: "체어 시트 좌골(pelvis: 132,108)과 바닥 지지 다리(farAnkle: 184,172)가 고정됩니다.",
      keyJointChangeKo: "페달 하방 프레스와 분리된 단측 고관절 굴곡·무릎 상방 리프트(knee dy -38px · 2D 개략도)",
      middleVectorLabelKo: "단측 무릎 상방 리프트 (y:126→88)",
      middleVectorKind: "limb-excursion",
      middleVectorPoints: [pt(184, 126), pt(174, 88)],
      endVectorLabelKo: "바닥 지지점 방향 감속 착지",
      endVectorPoints: [pt(174, 88), pt(182, 120)],
    });
  }

  // SM-08B: Barrel Standing Side Leg Reach (straight-leg lateral abduction vs flexed-knee hip extension)
  if (exercise.id === "original-barrel-standing-side-reach") {
    const startJoints = makeJointMap({
      head: { x: 140, y: 38 }, neck: { x: 140, y: 54 }, shoulder: { x: 140, y: 70 },
      elbow: { x: 116, y: 84 }, wrist: { x: 96, y: 80 }, hand: { x: 88, y: 76 },
      thoracic: { x: 140, y: 90 }, lumbar: { x: 140, y: 110 }, pelvis: { x: 140, y: 126 },
      hip: { x: 144, y: 128 }, knee: { x: 148, y: 150 }, ankle: { x: 152, y: 170 },
      heel: { x: 148, y: 174 }, toe: { x: 162, y: 174 },
      farHip: { x: 138, y: 128 }, farKnee: { x: 138, y: 152 }, farAnkle: { x: 138, y: 172 }, farToe: { x: 148, y: 174 },
    });
    const middleJoints = makeJointMap({
      ...startJoints,
      knee: { x: 184, y: 126 }, ankle: { x: 228, y: 118 }, heel: { x: 222, y: 122 }, toe: { x: 238, y: 116 },
    });
    const endJoints = makeJointMap({
      ...startJoints,
      knee: { x: 154, y: 146 }, ankle: { x: 160, y: 166 }, heel: { x: 156, y: 170 }, toe: { x: 170, y: 170 },
    });
    return buildSemanticOverrideBlueprint({
      archetypeId: "barrel-standing-side-reach-isolated",
      archetypeTitleKo: "래더 바렐 스탠딩 사이드 레그 리치 · 사다리 손 지지 & 직선 다리 외전 분리",
      baseArchetypeId: "standing-scooter-lunge-splits",
      fixedAnchorJoints: [
        { joint: "hand", defaultSurfaceKo: "래더 바렐 사다리 상단 가로대 손 파지점 (88,76)" },
        { joint: "farAnkle", defaultSurfaceKo: "바렐 외측 바닥 지지 다리 발목 고정점 (138,172)" },
      ],
      movingJoints: ["hip", "knee", "ankle", "heel", "toe"],
      startJoints, middleJoints, endJoints,
      carriageOffsets: [0, 0, 0], pedalAngles: [0, 0, 0],
      phaseTitlesKo: ["래더 가로대 손 지지 & 수직 기립 준비", "몸통 수직 유지 · 바깥 다리 직선 외전(Side Reach) 정점", "중둔근 편심성 제어로 지지 다리 옆 모으기"],
      startToMiddleKo: "사다리 가로대 손 지지(88,76)와 몸통 수직 축(x:140)을 유지한 채 무릎을 편 바깥 다리를 옆·위로 길게 들어 올립니다(ankle: 152,170→228,118).",
      middleToEndKo: "골반 기울어짐 없이 외전된 다리를 천천히 내전하여 시작 자세 근처(ankle: 160,166)로 모읍니다. (해부학적 실측 아님)",
      invariantAnchorsKo: "사다리 가로대 손(hand: 88,76), 수직 몸통(head/thoracic/pelvis x:140), 바닥 지지 발(farAnkle: 138,172)이 고정됩니다.",
      keyJointChangeKo: "후방 힙 익스텐션과 분리된 무릎 신전 관상면 외전 리치(ankle: 228,118 · 2D 개략도)",
      middleVectorLabelKo: "바깥 다리 직선 외전 리치 (152,170→228,118)",
      middleVectorKind: "limb-excursion",
      middleVectorPoints: [pt(152, 170), pt(228, 118)],
      endVectorLabelKo: "외전 다리 감속 내전 복귀",
      endVectorPoints: [pt(228, 118), pt(160, 166)],
    });
  }

  // SM-07A: Barrel Side-Lying Side Bend / Side Sit-Up (draped over barrel dome + feet on ladder rungs vs floor Z-Sit)
  if (
    exercise.id === "original-barrel-supported-side-bend" ||
    exercise.id === "ex-kr-barrel-01"
  ) {
    const startJoints = makeJointMap({
      head: { x: 52, y: 88 }, neck: { x: 64, y: 94 }, shoulder: { x: 76, y: 100 },
      elbow: { x: 62, y: 74 }, wrist: { x: 48, y: 66 }, hand: { x: 40, y: 62 },
      thoracic: { x: 90, y: 106 }, lumbar: { x: 108, y: 112 }, pelvis: { x: 126, y: 116 },
      hip: { x: 136, y: 118 }, knee: { x: 182, y: 126 }, ankle: { x: 228, y: 132 },
      heel: { x: 224, y: 136 }, toe: { x: 238, y: 130 },
      farShoulder: { x: 80, y: 104 }, farElbow: { x: 68, y: 82 }, farWrist: { x: 54, y: 72 },
      farKnee: { x: 184, y: 132 }, farAnkle: { x: 242, y: 142 }, farToe: { x: 252, y: 140 },
    });
    const middleJoints = makeJointMap({
      ...startJoints,
      head: { x: 84, y: 32 }, neck: { x: 90, y: 46 }, shoulder: { x: 96, y: 60 },
      elbow: { x: 82, y: 38 }, wrist: { x: 74, y: 24 }, hand: { x: 70, y: 18 },
      thoracic: { x: 104, y: 78 }, lumbar: { x: 114, y: 98 },
      farShoulder: { x: 100, y: 66 }, farElbow: { x: 90, y: 46 }, farWrist: { x: 82, y: 32 },
    });
    const endJoints = makeJointMap({
      ...startJoints,
      head: { x: 56, y: 74 }, neck: { x: 68, y: 82 }, shoulder: { x: 80, y: 90 },
      elbow: { x: 66, y: 62 }, wrist: { x: 52, y: 52 }, hand: { x: 44, y: 48 },
      thoracic: { x: 94, y: 98 }, lumbar: { x: 110, y: 108 },
    });
    return buildSemanticOverrideBlueprint({
      archetypeId: "barrel-side-lying-side-bend-isolated",
      archetypeTitleKo: "래더 바렐 사이드라잉 사이드 벤드 · 바렐 아치 골반 지지 & 래더 발 고정 분리",
      baseArchetypeId: "lateral-mermaid-side-bend",
      fixedAnchorJoints: [
        { joint: "pelvis", defaultSurfaceKo: "바렐 아치 상단 측면 골반 지지점 (126,116)" },
        { joint: "ankle", defaultSurfaceKo: "래더 가로대 위·아래 발 걸기 고정점 (228,132 / 242,142)" },
      ],
      movingJoints: ["head", "neck", "shoulder", "thoracic", "lumbar", "elbow", "wrist", "hand"],
      startJoints, middleJoints, endJoints,
      carriageOffsets: [0, 0, 0], pedalAngles: [0, 0, 0],
      phaseTitlesKo: ["바렐 아치 측면 골반 지지 & 사다리 발 걸기 사선 준비", "위쪽 복사근 수축 · 사이드 시트업 측굴 리프트 정점", "바렐 곡선을 따라 긴 사선 지지선으로 제어 복귀"],
      startToMiddleKo: "바렐 아치 상단(pelvis: 126,116)과 우측 사다리 가로대 발 지지(ankle: 228,132)를 고정한 채 상체(head: 52,88→84,32)를 옆구리 힘으로 들어 올립니다.",
      middleToEndKo: "측면 복사근 편심성 제어로 상체를 바렐 곡선 사선 정렬(head: 56,74)로 내려놓습니다. (해부학적 실측 아님)",
      invariantAnchorsKo: "바렐 아치 위 골반(pelvis: 126,116)과 사다리 가로대에 건 양발(ankle: 228,132, farAnkle: 242,142)이 고정됩니다.",
      keyJointChangeKo: "바닥 Z-Sit 착석과 분리된 바렐 아치 측면 지지 + 사다리 발 고정 측굴 리프트(2D 개략도)",
      middleVectorLabelKo: "사이드라잉 상체 측굴 리프트 (head 52,88→84,32)",
      middleVectorKind: "spine-articulation",
      middleVectorPoints: [pt(52, 88), pt(84, 32)],
      endVectorLabelKo: "바렐 아치 사선 정렬 감속 복귀",
      endVectorPoints: [pt(84, 32), pt(56, 74)],
    });
  }

  // SM-07B: Barrel Standing Side Stretch (standing upright beside barrel vs floor Z-Sit)
  if (exercise.id === "original-barrel-standing-side-stretch") {
    const startJoints = makeJointMap({
      head: { x: 148, y: 34 }, neck: { x: 148, y: 50 }, shoulder: { x: 148, y: 66 },
      elbow: { x: 168, y: 50 }, wrist: { x: 176, y: 32 }, hand: { x: 180, y: 22 },
      thoracic: { x: 148, y: 84 }, lumbar: { x: 148, y: 104 }, pelvis: { x: 148, y: 122 },
      hip: { x: 148, y: 124 }, knee: { x: 148, y: 148 }, ankle: { x: 148, y: 170 },
      heel: { x: 144, y: 174 }, toe: { x: 158, y: 174 },
      farShoulder: { x: 138, y: 68 }, farElbow: { x: 114, y: 78 }, farWrist: { x: 96, y: 78 },
      farKnee: { x: 140, y: 148 }, farAnkle: { x: 140, y: 170 }, farToe: { x: 150, y: 174 },
    });
    const middleJoints = makeJointMap({
      ...startJoints,
      head: { x: 110, y: 40 }, neck: { x: 118, y: 54 }, shoulder: { x: 126, y: 68 },
      elbow: { x: 118, y: 34 }, wrist: { x: 98, y: 26 }, hand: { x: 88, y: 24 },
      thoracic: { x: 136, y: 84 }, lumbar: { x: 144, y: 104 },
    });
    const endJoints = makeJointMap({
      ...startJoints,
      elbow: { x: 164, y: 76 }, wrist: { x: 172, y: 94 }, hand: { x: 176, y: 104 },
    });
    return buildSemanticOverrideBlueprint({
      archetypeId: "barrel-standing-side-stretch-isolated",
      archetypeTitleKo: "바렐 스탠딩 사이드 리치 · 양발 바닥 기립 & 오버헤드 측굴 스트레치 분리",
      baseArchetypeId: "lateral-mermaid-side-bend",
      fixedAnchorJoints: [
        { joint: "ankle", defaultSurfaceKo: "바렐 옆 바닥 양발 수직 기립 지지점 (148,170)" },
        { joint: "pelvis", defaultSurfaceKo: "양다리 위 수평 골반 고정축 (148,122)" },
      ],
      movingJoints: ["head", "neck", "shoulder", "thoracic", "elbow", "wrist", "hand"],
      startJoints, middleJoints, endJoints,
      carriageOffsets: [0, 0, 0], pedalAngles: [0, 0, 0],
      phaseTitlesKo: ["바렐 옆 양발 기립 & 반대 팔 상방 리치 준비", "하체 수직 고정 · 기구 방향 오버헤드 측굴 정점", "측면 늑간 이완 후 수직 기립 자세 복귀"],
      startToMiddleKo: "양발(ankle: 148,170)로 바닥에 서서 골반(148,122)을 고정한 채 반대 팔(hand: 180,22→88,24)과 흉곽을 바렐 쪽으로 길게 측굴합니다.",
      middleToEndKo: "골반과 하체 기둥을 흔들림 없이 유지하며 상체를 수직으로 세우고 팔(hand: 176,104)을 내립니다. (해부학적 실측 아님)",
      invariantAnchorsKo: "바닥에 디딘 양발(ankle: 148,170)과 기립 골반(pelvis: 148,122)이 고정됩니다.",
      keyJointChangeKo: "바닥 Z-Sit 착석과 분리된 양발 스탠딩 오버헤드 측굴(hand Δ92px · 2D 개략도)",
      middleVectorLabelKo: "스탠딩 오버헤드 측굴 아크 (180,22→88,24)",
      middleVectorKind: "spine-articulation",
      middleVectorPoints: [pt(180, 22), pt(134, 18), pt(88, 24)],
      endVectorLabelKo: "수직 기립 재적층 복귀",
      endVectorPoints: [pt(88, 24), pt(176, 104)],
    });
  }

  // SM-01A: Chair Seated Pelvic Rock (pelvis/lumbar tilt on chair seat with hands on thighs vs 80.5px arm row)
  if (exercise.id === "original-chair-seated-pelvic-rock") {
    const startJoints = makeJointMap({
      head: { x: 132, y: 26 }, neck: { x: 132, y: 40 }, shoulder: { x: 132, y: 56 },
      elbow: { x: 142, y: 82 }, wrist: { x: 152, y: 98 }, hand: { x: 158, y: 102 },
      thoracic: { x: 132, y: 74 }, lumbar: { x: 132, y: 92 }, pelvis: { x: 132, y: 108 },
      hip: { x: 140, y: 108 }, knee: { x: 182, y: 126 }, ankle: { x: 186, y: 170 },
      heel: { x: 180, y: 176 }, toe: { x: 198, y: 176 },
    });
    const middleJoints = makeJointMap({
      ...startJoints,
      head: { x: 126, y: 30 }, neck: { x: 124, y: 44 }, shoulder: { x: 124, y: 60 },
      thoracic: { x: 120, y: 78 }, lumbar: { x: 116, y: 96 }, pelvis: { x: 124, y: 110 },
    });
    const endJoints = makeJointMap({
      ...startJoints,
      thoracic: { x: 136, y: 72 }, lumbar: { x: 137, y: 90 }, pelvis: { x: 136, y: 107 },
    });
    return buildSemanticOverrideBlueprint({
      archetypeId: "chair-seated-pelvic-rock-isolated",
      archetypeTitleKo: "체어 시티드 골반 록 · 시트 착석 & 손 허벅지 고정 골반 틸트 분리",
      baseArchetypeId: "seated-row-arm-arc",
      fixedAnchorJoints: [
        { joint: "hand", defaultSurfaceKo: "허벅지 위 손 가볍게 고정 (158,102)" },
        { joint: "ankle", defaultSurfaceKo: "체어 앞 바닥 양발 평행 지지점 (186,170)" },
      ],
      movingJoints: ["pelvis", "lumbar", "thoracic", "head"],
      startJoints, middleJoints, endJoints,
      carriageOffsets: [0, 0, 0], pedalAngles: [0, 0, 0],
      phaseTitlesKo: ["체어 시트 좌골 수직 착석 & 양손 허벅지 지지", "날숨 골반 후방 록킹(Posterior Tilt) & 하부 요추 라운딩", "좌골 중심 복귀 및 중립 골반 세우기"],
      startToMiddleKo: "양손(158,102)과 발(186,170)을 고정한 채 체어 시트 위에서 골반(132,108→124,110)과 요추(132,92→116,96)를 뒤로 부드럽게 굴립니다.",
      middleToEndKo: "복부 지지로 골반과 요추(116,96→137,90)를 다시 좌골 수직 중심 위로 세워 복귀합니다. (해부학적 실측 아님)",
      invariantAnchorsKo: "허벅지 위 양손(hand: 158,102)과 바닥에 둔 발목(ankle: 186,170)이 고정됩니다.",
      keyJointChangeKo: "시티드 로잉 팔 당김을 제거한 순수 골반·요추 전후방 록킹(lumbar Δ16.5px · 2D 개략도)",
      middleVectorLabelKo: "골반 후방 록킹 & 요추 굴곡 (132,92→116,96)",
      middleVectorKind: "spine-articulation",
      middleVectorPoints: [pt(132, 92), pt(116, 96)],
      endVectorLabelKo: "좌골 중심 수직 복귀",
      endVectorPoints: [pt(116, 96), pt(137, 90)],
    });
  }

  // SM-01B: Chair Seated Back/Chest Reach (upper-thoracic extension on chair seat vs posterior arm row)
  if (exercise.id === "original-chair-seated-back-reach") {
    const startJoints = makeJointMap({
      head: { x: 132, y: 26 }, neck: { x: 132, y: 40 }, shoulder: { x: 132, y: 56 },
      elbow: { x: 144, y: 80 }, wrist: { x: 156, y: 94 }, hand: { x: 162, y: 98 },
      thoracic: { x: 132, y: 74 }, lumbar: { x: 132, y: 92 }, pelvis: { x: 132, y: 108 },
      hip: { x: 140, y: 108 }, knee: { x: 182, y: 126 }, ankle: { x: 186, y: 170 },
      heel: { x: 180, y: 176 }, toe: { x: 198, y: 176 },
    });
    const middleJoints = makeJointMap({
      ...startJoints,
      head: { x: 142, y: 20 }, neck: { x: 140, y: 36 }, shoulder: { x: 140, y: 52 },
      elbow: { x: 154, y: 74 }, wrist: { x: 168, y: 84 }, hand: { x: 176, y: 86 },
      thoracic: { x: 142, y: 68 },
    });
    const endJoints = makeJointMap({
      ...startJoints,
      head: { x: 136, y: 24 }, thoracic: { x: 136, y: 71 }, hand: { x: 166, y: 94 },
    });
    return buildSemanticOverrideBlueprint({
      archetypeId: "chair-seated-back-reach-isolated",
      archetypeTitleKo: "체어 시티드 가슴 리치 · 좌골 지지 & 상부 흉추 전상방 신전 분리",
      baseArchetypeId: "seated-row-arm-arc",
      fixedAnchorJoints: [
        { joint: "pelvis", defaultSurfaceKo: "체어 시트 상단 좌골 수직 지지점 (132,108)" },
        { joint: "ankle", defaultSurfaceKo: "바닥 양발 평행 지지점 (186,170)" },
      ],
      movingJoints: ["thoracic", "shoulder", "neck", "head", "hand"],
      startJoints, middleJoints, endJoints,
      carriageOffsets: [0, 0, 0], pedalAngles: [0, 0, 0],
      phaseTitlesKo: ["체어 시트 좌골 지지 & 중립 척추 세팅", "들숨 흉골 전상방 리프트 · 상부 흉추 신전 정점", "허리 과신전 없이 수직 중립 정렬 복귀"],
      startToMiddleKo: "좌골(132,108)과 요추(132,92)를 안정적으로 지지한 채 흉추(132,74→142,68)와 머리(132,26→142,20)를 앞·위로 길게 뻗어 가슴을 엽니다.",
      middleToEndKo: "갈비뼈를 부드럽게 정돈하며 상부 흉추(142,68→136,71)가 중립 수직선으로 돌아옵니다. (해부학적 실측 아님)",
      invariantAnchorsKo: "체어 시트 좌골(pelvis: 132,108), 요추(lumbar: 132,92), 바닥 양발(ankle: 186,170)이 고정됩니다.",
      keyJointChangeKo: "후방 로잉 당김과 분리된 상부 흉추·흉골 전상방 신전 리치(thoracic Δ11.7px · 2D 개략도)",
      middleVectorLabelKo: "흉골·상부 흉추 전상방 신전 리치",
      middleVectorKind: "spine-articulation",
      middleVectorPoints: [pt(132, 74), pt(142, 68), pt(142, 20)],
      endVectorLabelKo: "상부 흉추 중립 정렬 복귀",
      endVectorPoints: [pt(142, 68), pt(136, 71)],
    });
  }

  // SM-02A: Supported Calf Raise with hands anchored on Barrel ladder or Chair frame (no 50.5px overhead arm swing)
  if (
    exercise.id === "original-barrel-supported-ankle" ||
    exercise.id === "original-chair-supported-calf-raise"
  ) {
    const isBarrel = exercise.apparatus === "barrel";
    const standX = isBarrel ? 146 : 84;
    const handPt = isBarrel ? { x: 88, y: 76 } : { x: 116, y: 106 };
    const wristPt = isBarrel ? { x: 96, y: 80 } : { x: 110, y: 104 };
    const elbowPt = isBarrel ? { x: 118, y: 84 } : { x: 96, y: 92 };
    const toeX = isBarrel ? 164 : 102;
    const startJoints = makeJointMap({
      head: { x: standX, y: 26 }, neck: { x: standX, y: 44 }, shoulder: { x: standX, y: 62 },
      elbow: elbowPt, wrist: wristPt, hand: handPt,
      thoracic: { x: standX, y: 84 }, lumbar: { x: standX, y: 102 }, pelvis: { x: standX, y: 116 },
      hip: { x: standX, y: 118 }, knee: { x: standX + 2, y: 146 }, ankle: { x: standX + 2, y: 170 },
      heel: { x: standX - 4, y: 174 }, toe: { x: toeX, y: 176 },
    });
    const middleJoints = makeJointMap({
      ...startJoints,
      head: { x: standX + 2, y: 16 }, neck: { x: standX + 2, y: 34 }, shoulder: { x: standX + 2, y: 52 },
      thoracic: { x: standX + 2, y: 74 }, lumbar: { x: standX + 2, y: 92 }, pelvis: { x: standX + 2, y: 106 },
      hip: { x: standX + 2, y: 108 }, knee: { x: standX + 4, y: 136 }, ankle: { x: standX + 6, y: 158 },
      heel: { x: standX, y: 160 }, toe: { x: toeX, y: 176 },
    });
    const endJoints = makeJointMap({
      ...startJoints,
      head: { x: standX + 1, y: 22 }, pelvis: { x: standX + 1, y: 112 },
      ankle: { x: standX + 4, y: 165 }, heel: { x: standX - 2, y: 169 },
    });
    return buildSemanticOverrideBlueprint({
      archetypeId: isBarrel ? "barrel-supported-ankle-isolated" : "chair-supported-calf-raise-isolated",
      archetypeTitleKo: isBarrel
        ? "래더 지지 발목 움직임 · 사다리 손 고정 & 카프 레이즈 분리"
        : "체어 지지 카프 레이즈 · 체어 손 고정 & 카프 레이즈 분리",
      baseArchetypeId: "standing-ankle-calf-upper-reach",
      fixedAnchorJoints: [
        { joint: "hand", defaultSurfaceKo: isBarrel ? "래더 가로대 손 지지 고정점 (88,76)" : "체어 시트 상단 손 지지 고정점 (116,106)" },
        { joint: "toe", defaultSurfaceKo: `바닥 발볼 지지 앵커 (${toeX},176)` },
      ],
      movingJoints: ["heel", "ankle", "knee", "pelvis", "head"],
      startJoints, middleJoints, endJoints,
      carriageOffsets: [0, 0, 0], pedalAngles: [0, 0, 0],
      phaseTitlesKo: ["기구 손 지지 & 양발 평행 접지 세팅", "손 지지 유지 · 뒤꿈치 수직 상승(Calf Raise) 정점", "발목 흔들림 없이 뒤꿈치 바닥 감속 착지"],
      startToMiddleKo: `손(${handPt.x},${handPt.y})으로 기구를 안정적으로 잡은 채 발볼(${toeX},176) 위에서 뒤꿈치(y:174→160)와 정수리(y:26→16)가 수직 상승합니다.`,
      middleToEndKo: "기구 손 지지를 유지하며 종아리 편심성 조절로 뒤꿈치(y:160→169)를 바닥으로 천천히 내립니다. (해부학적 실측 아님)",
      invariantAnchorsKo: `기구 지지 손(hand: ${handPt.x},${handPt.y})과 바닥 발볼(toe: ${toeX},176)이 고정됩니다.`,
      keyJointChangeKo: "허공 팔 뻗기(50.5px)를 제거하고 기구 손 고정 하에 순수 족관절 저측굴곡만 표현(heel Δ14.6px · 2D 개략도)",
      middleVectorLabelKo: "손 지지 고정 & 뒤꿈치 수직 상승 (y:174→160)",
      middleVectorKind: "limb-excursion",
      middleVectorPoints: [pt(standX - 4, 174), pt(standX, 160)],
      endVectorLabelKo: "뒤꿈치 편심성 착지 복귀",
      endVectorPoints: [pt(standX, 160), pt(standX - 2, 169)],
    });
  }

  // SM-02B: Barrel Standing Torso Rotation (flat-footed thoracic rotation vs tiptoe calf raise)
  if (exercise.id === "original-barrel-standing-rotation") {
    const startJoints = makeJointMap({
      head: { x: 146, y: 28 }, neck: { x: 146, y: 44 }, shoulder: { x: 146, y: 62 },
      elbow: { x: 122, y: 78 }, wrist: { x: 102, y: 78 }, hand: { x: 88, y: 76 },
      thoracic: { x: 146, y: 84 }, lumbar: { x: 146, y: 102 }, pelvis: { x: 146, y: 118 },
      hip: { x: 146, y: 120 }, knee: { x: 148, y: 146 }, ankle: { x: 148, y: 170 },
      heel: { x: 142, y: 174 }, toe: { x: 164, y: 176 },
    });
    const middleJoints = makeJointMap({
      ...startJoints,
      shoulder: { x: 156, y: 62 }, elbow: { x: 186, y: 68 }, wrist: { x: 212, y: 66 }, hand: { x: 224, y: 64 },
      thoracic: { x: 154, y: 84 },
    });
    const endJoints = makeJointMap({
      ...startJoints,
      elbow: { x: 132, y: 78 }, wrist: { x: 112, y: 78 }, hand: { x: 100, y: 76 },
    });
    return buildSemanticOverrideBlueprint({
      archetypeId: "barrel-standing-rotation-isolated",
      archetypeTitleKo: "래더 지지 스탠딩 몸통 회전 · 양발 접지 고정 & 수평 흉곽 회전 분리",
      baseArchetypeId: "standing-ankle-calf-upper-reach",
      fixedAnchorJoints: [
        { joint: "heel", defaultSurfaceKo: "바닥 양발 뒤꿈치 접지 고정점 (142,174)" },
        { joint: "pelvis", defaultSurfaceKo: "정면 수평 골반 고정축 (146,118)" },
      ],
      movingJoints: ["thoracic", "shoulder", "elbow", "wrist", "hand"],
      startJoints, middleJoints, endJoints,
      carriageOffsets: [0, 0, 0], pedalAngles: [0, 0, 0],
      phaseTitlesKo: ["양발 바닥 접지 & 래더 손 지지 세팅", "골반·뒤꿈치 고정 · 흉곽 수평 회전 오픈 정점", "가슴 정면 정렬로 부드럽게 복귀"],
      startToMiddleKo: "양발 뒤꿈치(142,174)와 골반(146,118)을 바닥에 고정한 채 흉곽(146,84→154,84)과 팔(hand: 88,76→224,64)을 수평 회전합니다.",
      middleToEndKo: "까치발 상승 없이 발바닥 접지를 유지하며 가슴과 팔(hand: 100,76)이 정면으로 돌아옵니다. (해부학적 실측 아님)",
      invariantAnchorsKo: "바닥에 디딘 뒤꿈치(heel: 142,174)와 골반(pelvis: 146,118)이 고정됩니다.",
      keyJointChangeKo: "까치발 상승(heel Δ14.6px)을 제거한 평발 접지 스탠딩 흉추 회전(2D 개략도)",
      middleVectorLabelKo: "평발 접지 흉곽·상지 수평 회전 오픈",
      middleVectorKind: "limb-excursion",
      middleVectorPoints: [pt(88, 76), pt(224, 64)],
      endVectorLabelKo: "정면 정렬 수평 복귀",
      endVectorPoints: [pt(224, 64), pt(100, 76)],
    });
  }

  // SM-02C: Cadillac Standing Arm Spring Punch & Triceps Press (grounded heels vs tiptoe calf raise)
  if (exercise.id === "ex-upper-03") {
    const startJoints = makeJointMap({
      head: { x: 148, y: 26 }, neck: { x: 146, y: 42 }, shoulder: { x: 146, y: 58 },
      elbow: { x: 132, y: 78 }, wrist: { x: 158, y: 76 }, hand: { x: 168, y: 74 },
      thoracic: { x: 146, y: 80 }, lumbar: { x: 144, y: 98 }, pelvis: { x: 142, y: 114 },
      hip: { x: 142, y: 116 }, knee: { x: 146, y: 144 }, ankle: { x: 146, y: 170 },
      heel: { x: 140, y: 174 }, toe: { x: 162, y: 176 },
    });
    const middleJoints = makeJointMap({
      ...startJoints,
      shoulder: { x: 154, y: 58 }, elbow: { x: 194, y: 66 }, wrist: { x: 226, y: 64 }, hand: { x: 238, y: 62 },
      thoracic: { x: 152, y: 80 },
    });
    const endJoints = makeJointMap({
      ...startJoints,
      elbow: { x: 140, y: 78 }, wrist: { x: 168, y: 75 }, hand: { x: 178, y: 73 },
    });
    return buildSemanticOverrideBlueprint({
      archetypeId: "cadillac-standing-punch-press-isolated",
      archetypeTitleKo: "캐딜락 스탠딩 암 스프링 펀치 · 뒤꿈치 접지 고정 & 상지 펀치/회전 분리",
      baseArchetypeId: "standing-ankle-calf-upper-reach",
      fixedAnchorJoints: [
        { joint: "heel", defaultSurfaceKo: "바닥 양발 뒤꿈치 완전 접지 (140,174 · 카프 레이즈 제외)" },
        { joint: "pelvis", defaultSurfaceKo: "필라테스 스탠스 골반 고정축 (142,114)" },
      ],
      movingJoints: ["thoracic", "shoulder", "elbow", "wrist", "hand"],
      startJoints, middleJoints, endJoints,
      carriageOffsets: [0, 0, 0], pedalAngles: [0, 0, 0],
      phaseTitlesKo: ["필라테스 스탠스 뒤꿈치 접지 & 그립 준비", "뒤꿈치 고정 · 정면 스탠딩 펀치 & 흉추 회전 정점", "스프링 장력 저항하며 시작 자세 감속 복귀"],
      startToMiddleKo: "뒤꿈치(140,174)를 바닥에 단단히 뿌리내린 채 암 스프링을 정면 어깨 높이(hand: 168,74→238,62)로 펀치하며 흉추를 회전합니다.",
      middleToEndKo: "몸통이 뒤로 끌려가지 않게 발바닥 접지를 유지하며 손(238,62→178,73)을 감속 복귀합니다. (해부학적 실측 아님)",
      invariantAnchorsKo: "바닥에 뿌리내린 뒤꿈치(heel: 140,174), 발목(ankle: 146,170), 골반(pelvis: 142,114)이 고정됩니다.",
      keyJointChangeKo: "불필요한 까치발(heel Δ14.6px)을 제거한 평발 접지 스탠딩 펀치 프레스(hand Δ71px · 2D 개략도)",
      middleVectorLabelKo: "스탠딩 암 스프링 전방 펀치 (168,74→238,62)",
      middleVectorKind: "spring-resistance",
      middleVectorPoints: [pt(168, 74), pt(238, 62)],
      endVectorLabelKo: "전완·견갑 장력 제어 복귀",
      endVectorPoints: [pt(238, 62), pt(178, 73)],
    });
  }

  // SM-03: Supine Pelvic Clock / Pelvic Rock (arms resting on mat/table + pelvic tilt vs 129.3px overhead arm circle)
  if (
    exercise.id === "original-mat-pelvic-clock" ||
    exercise.id === "original-cadillac-pelvic-rock"
  ) {
    const startJoints = makeJointMap({
      head: { x: 56, y: 128 }, neck: { x: 74, y: 132 }, shoulder: { x: 92, y: 134 },
      elbow: { x: 122, y: 138 }, wrist: { x: 148, y: 140 }, hand: { x: 160, y: 140 },
      thoracic: { x: 118, y: 134 }, lumbar: { x: 146, y: 132 }, pelvis: { x: 174, y: 136 },
      hip: { x: 180, y: 134 }, knee: { x: 214, y: 96 }, ankle: { x: 248, y: 140 },
      heel: { x: 242, y: 144 }, toe: { x: 260, y: 144 },
    });
    const middleJoints = makeJointMap({
      ...startJoints,
      lumbar: { x: 146, y: 140 }, pelvis: { x: 170, y: 128 }, hip: { x: 176, y: 126 },
    });
    const endJoints = makeJointMap({
      ...startJoints,
      lumbar: { x: 146, y: 127 }, pelvis: { x: 176, y: 134 }, hip: { x: 182, y: 132 },
    });
    return buildSemanticOverrideBlueprint({
      archetypeId: "supine-pelvic-clock-isolated",
      archetypeTitleKo: "수파인 골반 시계 · 상지 지지면 고정 & 골반 전후방 틸트 분리",
      baseArchetypeId: "supine-breath-pelvic-clock",
      fixedAnchorJoints: [
        { joint: "hand", defaultSurfaceKo: "몸통 옆 매트/테이블 상지 이완 고정점 (160,140)" },
        { joint: "ankle", defaultSurfaceKo: "무릎 세운 양발 지지면 고정점 (248,140)" },
      ],
      movingJoints: ["pelvis", "lumbar", "hip"],
      startJoints, middleJoints, endJoints,
      carriageOffsets: [0, 0, 0], pedalAngles: [0, 0, 0],
      phaseTitlesKo: ["무릎 세우고 누워 상지 매트 이완 & 중립 골반", "날숨 골반 후방 경사(12시 임프린트) 굴림", "들숨 6시 방향 탐색 후 중립 천골 안착 복귀"],
      startToMiddleKo: "양팔(hand: 160,140)과 어깨(92,134)를 바닥에 편안히 내려놓은 채 골반(174,136→170,128)과 요추(146,132→146,140)만 부드럽게 굴립니다.",
      middleToEndKo: "팔의 오버헤드 이동 없이 천골 무게중심을 굴려 중립 골반(146,127 / 176,134)으로 돌아옵니다. (해부학적 실측 아님)",
      invariantAnchorsKo: "매트/테이블에 내려놓은 손(hand: 160,140), 흉곽(thoracic: 118,134), 양발(ankle: 248,140)이 고정됩니다.",
      keyJointChangeKo: "오버헤드 암 서클(129.3px)을 제거한 순수 골반 시계·요추 전후방 틸트(lumbar/pelvis Δ8.9px · 2D 개략도)",
      middleVectorLabelKo: "골반 후방 틸트 & 요추 임프린트",
      middleVectorKind: "spine-articulation",
      middleVectorPoints: [pt(174, 136), pt(170, 128), pt(146, 140)],
      endVectorLabelKo: "중립 천골 골반 시계 복귀",
      endVectorPoints: [pt(146, 140), pt(146, 127)],
    });
  }

  // SM-04A: Chair Sit to Stand (bilateral grounded feet + vertical pelvis rise vs single-leg scooter kick)
  if (exercise.id === "original-chair-sit-to-stand") {
    const startJoints = makeJointMap({
      head: { x: 142, y: 28 }, neck: { x: 140, y: 42 }, shoulder: { x: 138, y: 58 },
      elbow: { x: 152, y: 78 }, wrist: { x: 170, y: 80 }, hand: { x: 180, y: 80 },
      thoracic: { x: 136, y: 76 }, lumbar: { x: 136, y: 92 }, pelvis: { x: 136, y: 108 },
      hip: { x: 142, y: 108 }, knee: { x: 182, y: 128 }, ankle: { x: 186, y: 170 },
      heel: { x: 180, y: 176 }, toe: { x: 198, y: 176 },
      farHip: { x: 140, y: 108 }, farKnee: { x: 180, y: 130 }, farAnkle: { x: 184, y: 172 }, farToe: { x: 196, y: 176 },
    });
    const middleJoints = makeJointMap({
      ...startJoints,
      head: { x: 178, y: 16 }, neck: { x: 178, y: 32 }, shoulder: { x: 178, y: 48 },
      elbow: { x: 190, y: 68 }, wrist: { x: 204, y: 72 }, hand: { x: 212, y: 72 },
      thoracic: { x: 178, y: 68 }, lumbar: { x: 178, y: 86 }, pelvis: { x: 178, y: 102 },
      hip: { x: 180, y: 104 }, knee: { x: 184, y: 138 },
      farHip: { x: 178, y: 104 }, farKnee: { x: 182, y: 140 },
    });
    const endJoints = makeJointMap({
      ...startJoints,
      head: { x: 148, y: 26 }, shoulder: { x: 144, y: 56 }, thoracic: { x: 142, y: 74 },
      lumbar: { x: 142, y: 90 }, pelvis: { x: 142, y: 106 }, hip: { x: 148, y: 106 },
    });
    return buildSemanticOverrideBlueprint({
      archetypeId: "chair-sit-to-stand-isolated",
      archetypeTitleKo: "체어 앉았다 일어서기 · 양발 바닥 고정 & 좌골 수직 기립 분리",
      baseArchetypeId: "standing-scooter-lunge-splits",
      fixedAnchorJoints: [
        { joint: "ankle", defaultSurfaceKo: "체어 앞 바닥 양발 평행 고정점 (186,170)" },
        { joint: "heel", defaultSurfaceKo: "바닥 양발 뒤꿈치 지지점 (180,176)" },
      ],
      movingJoints: ["pelvis", "hip", "knee", "lumbar", "thoracic", "shoulder", "head"],
      startJoints, middleJoints, endJoints,
      carriageOffsets: [0, 0, 0], pedalAngles: [0, 0, 0],
      phaseTitlesKo: ["체어 시트 앞쪽 착석 & 양발 바닥 11자 지지", "양발 바닥 푸시 · 수직 기립(Sit to Stand) 정점", "고관절·무릎 굴곡 제어하며 시트 착석 복귀"],
      startToMiddleKo: "양발(ankle: 186,170)을 바닥에 고정한 채 체어 시트(pelvis: 136,108)에서 발바닥으로 바닥을 밀며 상체와 골반(178,102, head: 178,16)을 수직으로 일으켜 세웁니다.",
      middleToEndKo: "엉덩이를 뒤·아래로 천천히 보내며 체어 시트 좌면(pelvis: 142,106)으로 안전하게 앉아 복귀합니다. (해부학적 실측 아님)",
      invariantAnchorsKo: "바닥에 평행하게 디딘 양발 발목(ankle: 186,170)과 뒤꿈치(heel: 180,176)가 고정됩니다.",
      keyJointChangeKo: "단측 후방 스쿠터 킥(65.5px)을 제거한 양발 접지 시트 투 스탠드 기립(pelvis Δ42.4px · 2D 개략도)",
      middleVectorLabelKo: "시트 착석 → 양발 지지 수직 기립",
      middleVectorKind: "axial-lengthening",
      middleVectorPoints: [pt(136, 108), pt(178, 102), pt(178, 16)],
      endVectorLabelKo: "시트 좌면 방향 편심성 착석 복귀",
      endVectorPoints: [pt(178, 102), pt(142, 106)],
    });
  }

  // SM-04B: Reformer Standing Side Splits & Skater (upright frontal bilateral abduction on carriage vs sagittal scooter kick)
  if (exercise.id === "ex-lower-02") {
    const startJoints = makeJointMap({
      head: { x: 176, y: 28 }, neck: { x: 176, y: 42 }, shoulder: { x: 176, y: 58 },
      elbow: { x: 162, y: 76 }, wrist: { x: 168, y: 84 }, hand: { x: 174, y: 84 },
      thoracic: { x: 176, y: 76 }, lumbar: { x: 176, y: 92 }, pelvis: { x: 176, y: 106 },
      hip: { x: 170, y: 108 }, knee: { x: 158, y: 124 }, ankle: { x: 148, y: 138 },
      heel: { x: 152, y: 142 }, toe: { x: 140, y: 142 },
      farHip: { x: 182, y: 108 }, farKnee: { x: 198, y: 124 }, farAnkle: { x: 214, y: 138 }, farToe: { x: 222, y: 142 },
    });
    const middleJoints = makeJointMap({
      ...startJoints,
      head: { x: 158, y: 30 }, neck: { x: 158, y: 44 }, shoulder: { x: 158, y: 60 },
      elbow: { x: 132, y: 62 }, wrist: { x: 112, y: 62 }, hand: { x: 102, y: 62 },
      thoracic: { x: 158, y: 78 }, lumbar: { x: 158, y: 94 }, pelvis: { x: 158, y: 108 },
      hip: { x: 150, y: 110 }, knee: { x: 124, y: 124 }, ankle: { x: 96, y: 138 },
      heel: { x: 100, y: 142 }, toe: { x: 88, y: 142 },
    });
    const endJoints = makeJointMap({
      ...startJoints,
      head: { x: 170, y: 28 }, pelvis: { x: 170, y: 106 },
      knee: { x: 152, y: 124 }, ankle: { x: 140, y: 138 }, heel: { x: 144, y: 142 }, toe: { x: 132, y: 142 },
    });
    return buildSemanticOverrideBlueprint({
      archetypeId: "reformer-standing-side-splits-isolated",
      archetypeTitleKo: "리포머 스탠딩 사이드 스플릿 · 플랫폼/캐리지 수평 양다리 외전·내전 분리",
      baseArchetypeId: "standing-scooter-lunge-splits",
      fixedAnchorJoints: [
        { joint: "farAnkle", defaultSurfaceKo: "우측 고정 플랫폼 발바닥 11자 지지점 (214,138)" },
        { joint: "ankle", defaultSurfaceKo: "좌측 슬라이딩 캐리지 발바닥 수평 지지점 (y:138)" },
      ],
      movingJoints: ["ankle", "knee", "hip", "pelvis", "thoracic", "head", "hand"],
      startJoints, middleJoints, endJoints,
      carriageOffsets: [4, 42, 10], pedalAngles: [0, 0, 0],
      phaseTitlesKo: ["플랫폼·캐리지 11자 평행 스쿼트 세팅", "양다리 대칭 외전 · 캐리지 수평 사이드 스플릿 정점", "내전근 제어로 상체 바운스 없이 캐리지 홈 복귀"],
      startToMiddleKo: "우측 플랫폼 발(farAnkle: 214,138)을 고정하고 상체 수직 축을 유지한 채 좌측 캐리지 발(ankle: 148,138→96,138)을 옆으로 밀어냅니다.",
      middleToEndKo: "상체 높이를 일정하게 유지하며 내전근과 중둔근 제어로 캐리지 발(96,138→140,138)을 모읍니다. (해부학적 실측 아님)",
      invariantAnchorsKo: "우측 플랫폼 지지 발(farAnkle: 214,138)과 양발 수평 지지 높이(y:138)가 유지됩니다.",
      keyJointChangeKo: "전방 힌지 단측 후방 킥과 분리된 직립 관상면 사이드 스플릿 활주(ankle dx -52px · 2D 개략도)",
      middleVectorLabelKo: "캐리지 수평 사이드 스플릿 외전 활주 (148,138→96,138)",
      middleVectorKind: "carriage-travel",
      middleVectorPoints: [pt(148, 138), pt(96, 138)],
      endVectorLabelKo: "내전근 제어 수평 복귀",
      endVectorPoints: [pt(96, 138), pt(140, 138)],
    });
  }

  // SM-05: Cadillac Roll-Down Bar Kneeling Cat Stretch (anterior spinal flexion/extension vs rigid-spine chest expansion)
  if (exercise.id === "ex-warmup-02") {
    const startJoints = makeJointMap({
      head: { x: 142, y: 30 }, neck: { x: 142, y: 46 }, shoulder: { x: 142, y: 64 },
      elbow: { x: 168, y: 74 }, wrist: { x: 188, y: 78 }, hand: { x: 198, y: 78 },
      thoracic: { x: 142, y: 86 }, lumbar: { x: 142, y: 106 }, pelvis: { x: 142, y: 124 },
      hip: { x: 144, y: 126 }, knee: { x: 146, y: 142 }, ankle: { x: 108, y: 144 },
      heel: { x: 102, y: 140 }, toe: { x: 94, y: 146 },
    });
    const middleJoints = makeJointMap({
      ...startJoints,
      head: { x: 188, y: 76 }, neck: { x: 178, y: 66 }, shoulder: { x: 168, y: 70 },
      elbow: { x: 196, y: 94 }, wrist: { x: 220, y: 110 }, hand: { x: 230, y: 114 },
      thoracic: { x: 152, y: 68 }, lumbar: { x: 138, y: 92 }, pelvis: { x: 138, y: 122 },
    });
    const endJoints = makeJointMap({
      ...startJoints,
      head: { x: 148, y: 34 }, shoulder: { x: 146, y: 66 }, thoracic: { x: 146, y: 84 },
      wrist: { x: 196, y: 82 }, hand: { x: 206, y: 84 },
    });
    return buildSemanticOverrideBlueprint({
      archetypeId: "cadillac-kneeling-cat-stretch-isolated",
      archetypeTitleKo: "캐딜락 롤다운 바 닐링 캣 스트레치 · 전방 척추 분절 굴곡·신전 분리",
      baseArchetypeId: "kneeling-chest-expansion-triceps",
      fixedAnchorJoints: [
        { joint: "knee", defaultSurfaceKo: "캐딜락 테이블 양무릎 지지점 (146,142)" },
        { joint: "ankle", defaultSurfaceKo: "정강이·발등 테이블 고정점 (108,144)" },
      ],
      movingJoints: ["head", "neck", "thoracic", "lumbar", "shoulder", "elbow", "wrist", "hand"],
      startJoints, middleJoints, endJoints,
      carriageOffsets: [0, 0, 0], pedalAngles: [0, 0, 0],
      phaseTitlesKo: ["톨 닐링 롤다운 바 전방 파지 준비", "배꼽 스쿱 C-커브 분절 · 전하방 캣 스트레치 정점", "꼬리뼈부터 척추 재적층 수직 복귀"],
      startToMiddleKo: "양무릎(146,142) 지지 위에서 복부를 등 쪽으로 당기며 정수리(142,30→188,76)와 흉추(142,86→152,68)를 둥글게 말아 롤다운 바(hand: 198,78→230,114)를 아래로 밀어냅니다.",
      middleToEndKo: "하단 흉추 신전 후 골반 위에 요추·흉추·머리를 차례로 쌓아 올려(head: 148,34) 복귀합니다. (해부학적 실측 아님)",
      invariantAnchorsKo: "캐딜락 테이블 위 양무릎(knee: 146,142)과 정강이(ankle: 108,144)가 고정됩니다.",
      keyJointChangeKo: "수직 척추 체스트 익스팬션과 분리된 전방 척추 C-커브 분절 굴곡(head Δ65px · 2D 개략도)",
      middleVectorLabelKo: "경추·흉추 C-커브 분절 굴곡 & 바 하방 프레스",
      middleVectorKind: "spine-articulation",
      middleVectorPoints: [pt(142, 30), pt(168, 48), pt(188, 76)],
      endVectorLabelKo: "척추 수직 재적층 복귀",
      endVectorPoints: [pt(188, 76), pt(148, 34)],
    });
  }

  // SM-06: Chair & Cadillac Seated Upright Spine Twist (vertical axial rotation vs 56.4px backward C-curve roll-back)
  if (
    exercise.id === "original-chair-seated-spine-twist" ||
    exercise.id === "original-cadillac-seated-rotation"
  ) {
    const isChair = exercise.apparatus === "chair";
    const seatY = isChair ? 108 : 138;
    const footY = isChair ? 170 : 142;
    const startJoints = makeJointMap({
      head: { x: 136, y: seatY - 82 }, neck: { x: 136, y: seatY - 66 }, shoulder: { x: 136, y: seatY - 50 },
      elbow: { x: 164, y: seatY - 34 }, wrist: { x: 186, y: seatY - 36 }, hand: { x: 196, y: seatY - 36 },
      thoracic: { x: 136, y: seatY - 32 }, lumbar: { x: 136, y: seatY - 16 }, pelvis: { x: 136, y: seatY },
      hip: { x: 144, y: seatY }, knee: { x: 188, y: isChair ? 126 : 136 }, ankle: { x: isChair ? 192 : 242, y: footY },
      heel: { x: isChair ? 186 : 240, y: footY + 6 }, toe: { x: isChair ? 204 : 254, y: footY + 4 },
    });
    const middleJoints = makeJointMap({
      ...startJoints,
      shoulder: { x: 130, y: seatY - 50 }, elbow: { x: 108, y: seatY - 36 }, wrist: { x: 92, y: seatY - 38 }, hand: { x: 82, y: seatY - 38 },
      thoracic: { x: 134, y: seatY - 32 },
    });
    const endJoints = makeJointMap({
      ...startJoints,
      elbow: { x: 156, y: seatY - 34 }, wrist: { x: 178, y: seatY - 36 }, hand: { x: 188, y: seatY - 36 },
    });
    return buildSemanticOverrideBlueprint({
      archetypeId: isChair ? "chair-seated-spine-twist-isolated" : "cadillac-seated-rotation-isolated",
      archetypeTitleKo: isChair
        ? "체어 시티드 스파인 트위스트 · 좌골 수직 축 유지 & 흉곽 수평 회전 분리"
        : "캐딜락 앉아서 흉곽 회전 · 좌골 수직 축 유지 & 흉곽 수평 회전 분리",
      baseArchetypeId: "seated-roll-back-spine-twist",
      fixedAnchorJoints: [
        { joint: "pelvis", defaultSurfaceKo: `양쪽 좌골 수직 지지점 (136,${seatY} · 후방 롤백 금지)` },
        { joint: "head", defaultSurfaceKo: `정수리-좌골 수직 추선 유지 (136,${seatY - 82})` },
      ],
      movingJoints: ["thoracic", "shoulder", "elbow", "wrist", "hand"],
      startJoints, middleJoints, endJoints,
      carriageOffsets: [0, 0, 0], pedalAngles: [0, 0, 0],
      phaseTitlesKo: ["좌골 위 수직 척추 세우기 & 정면 세팅", "척추 수직 고정 · 흉곽 및 상지 수평 회전 정점", "키 커지는 정렬 유지하며 정면 복귀"],
      startToMiddleKo: `머리(136,${seatY - 82})부터 좌골(136,${seatY})까지 수직 축이 뒤로 무너지지 않게 유지한 채 흉곽과 양팔(hand: 196,${seatY - 36}→82,${seatY - 38})만 수평 회전합니다.`,
      middleToEndKo: `좌골 무게를 균등하게 지키며 가슴과 팔(hand: 188,${seatY - 36})을 정면으로 되돌립니다. (해부학적 실측 아님)`,
      invariantAnchorsKo: `좌골(pelvis: 136,${seatY}), 요추(lumbar: 136,${seatY - 16}), 정수리(head: 136,${seatY - 82}) 수직 기둥이 고정됩니다.`,
      keyJointChangeKo: "후방 C-커브 롤백(head Δ56.4px)을 제거한 수직 축 순수 흉곽 회전(hand Δ114px · 2D 개략도)",
      middleVectorLabelKo: "수직 축 유지 · 흉곽 수평 회전",
      middleVectorKind: "spine-articulation",
      middleVectorPoints: [pt(196, seatY - 36), pt(136, seatY - 38), pt(82, seatY - 38)],
      endVectorLabelKo: "정면 수평 회전 복귀",
      endVectorPoints: [pt(82, seatY - 38), pt(188, seatY - 36)],
    });
  }

  return null;
}

function resolveArchetypeBlueprint(exercise: PilatesExercise): ArchetypeRigBlueprint {
  const separated = resolveSeparatedSideLyingBlueprint(exercise);
  if (separated) return separated;
  const semanticSeparated = resolveSeparatedSemanticMismatchBlueprint(exercise);
  if (semanticSeparated) return semanticSeparated;
  const apparatusContactSeparated = resolveSeparatedApparatusContactBlueprint(exercise);
  if (apparatusContactSeparated) return apparatusContactSeparated;
  const explicitId = EXPLICIT_EXERCISE_ARCHETYPE_IDS[exercise.id];
  if (explicitId) {
    const found = ARCHETYPE_BY_ID.get(explicitId);
    if (found) return found;
  }

  const text = `${exercise.id} ${exercise.nameKo} ${exercise.nameEn}`.toLowerCase();

  if (exercise.blockCategory === 'feet-in-straps' || text.includes('프로그') || text.includes('frog') || text.includes('레그 스프링')) {
    return ARCHETYPE_BY_ID.get('supine-feet-in-straps')!;
  }
  if (exercise.blockCategory === 'bridging' || text.includes('브릿지') || text.includes('브리지') || text.includes('bridge')) {
    return ARCHETYPE_BY_ID.get('supine-articulated-bridge')!;
  }
  if (exercise.bodyPosition === 'prone' || exercise.blockCategory === 'extension' || text.includes('스완') || text.includes('swan')) {
    return ARCHETYPE_BY_ID.get('prone-swan-pulling-straps-swimming')!;
  }
  if (exercise.bodyPosition === 'side-lying') {
    if (exercise.spinalPlanes.includes('lateral') || text.includes('사이드 벤드') || text.includes('side bend')) {
      return ARCHETYPE_BY_ID.get('lateral-mermaid-side-bend')!;
    }
    if (text.includes('클램') || text.includes('clam') || text.includes('오픈 북') || text.includes('open book')) {
      return ARCHETYPE_BY_ID.get('side-lying-clam-open-book')!;
    }
    return ARCHETYPE_BY_ID.get('side-lying-leg-press-sweep')!;
  }
  if (exercise.bodyPosition === 'quadruped') {
    if (exercise.blockCategory === 'plank' && (exercise.apparatus === 'reformer' || exercise.apparatus === 'chair')) {
      return ARCHETYPE_BY_ID.get('plank-long-stretch-chair-pike')!;
    }
    return ARCHETYPE_BY_ID.get('quadruped-reach-slide')!;
  }
  if (exercise.bodyPosition === 'kneeling') {
    if (exercise.blockCategory === 'plank') {
      return ARCHETYPE_BY_ID.get('plank-long-stretch-chair-pike')!;
    }
    if (exercise.blockCategory === 'core' || text.includes('리버스') || text.includes('reverse') || text.includes('크런치')) {
      return ARCHETYPE_BY_ID.get('kneeling-reverse-abs-crunch')!;
    }
    return ARCHETYPE_BY_ID.get('kneeling-chest-expansion-triceps')!;
  }
  if (exercise.bodyPosition === 'standing') {
    if (exercise.blockCategory === 'plank' || text.includes('파이크') || text.includes('pike')) {
      return ARCHETYPE_BY_ID.get('plank-long-stretch-chair-pike')!;
    }
    if (text.includes('롤다운') || text.includes('roll-down') || text.includes('roll down')) {
      return ARCHETYPE_BY_ID.get('standing-roll-down-centering')!;
    }
    if (exercise.spinalPlanes.includes('lateral') || text.includes('사이드 리치') || text.includes('side reach')) {
      return ARCHETYPE_BY_ID.get('lateral-mermaid-side-bend')!;
    }
    if (exercise.blockCategory === 'lower-body') {
      return ARCHETYPE_BY_ID.get('standing-scooter-lunge-splits')!;
    }
    return ARCHETYPE_BY_ID.get('standing-ankle-calf-upper-reach')!;
  }
  if (exercise.bodyPosition === 'seated') {
    if (exercise.spinalPlanes.includes('lateral') || text.includes('머메이드') || text.includes('mermaid')) {
      return ARCHETYPE_BY_ID.get('lateral-mermaid-side-bend')!;
    }
    if (exercise.apparatus === 'chair' && (exercise.blockCategory === 'footwork' || text.includes('페달') || text.includes('니 리프트'))) {
      return ARCHETYPE_BY_ID.get('chair-seated-pedal-footwork')!;
    }
    if (exercise.blockCategory === 'core' || exercise.spinalPlanes.includes('rotation') || text.includes('롤백') || text.includes('트위스트')) {
      return ARCHETYPE_BY_ID.get('seated-roll-back-spine-twist')!;
    }
    return ARCHETYPE_BY_ID.get('seated-row-arm-arc')!;
  }

  // Default Supine branches
  if (exercise.blockCategory === 'footwork') {
    return exercise.apparatus === 'reformer'
      ? ARCHETYPE_BY_ID.get('reformer-supine-footwork')!
      : ARCHETYPE_BY_ID.get('supine-heel-slide-ankle')!;
  }
  if (exercise.blockCategory === 'warmup') {
    return ARCHETYPE_BY_ID.get('supine-breath-pelvic-clock')!;
  }
  if (text.includes('암 프레스') || text.includes('arm press') || text.includes('arm spring')) {
    return ARCHETYPE_BY_ID.get('supine-strap-arm-press')!;
  }
  if (text.includes('니 폴드') || text.includes('knee fold')) {
    return ARCHETYPE_BY_ID.get('supine-knee-fold')!;
  }
  if (text.includes('힐 슬라이드') || text.includes('heel slide')) {
    return ARCHETYPE_BY_ID.get('supine-heel-slide-ankle')!;
  }
  if (text.includes('헌드레드') || text.includes('hundred') || text.includes('스트레치') || text.includes('앱 파이브')) {
    return ARCHETYPE_BY_ID.get('supine-leg-stretch-hundred')!;
  }
  return ARCHETYPE_BY_ID.get('supine-chest-lift-curl')!;
}

function resolveSpringTensionLevel(
  exercise: PilatesExercise,
): 'low' | 'medium' | 'high' | 'none' {
  const s = exercise.springs.toLowerCase();
  const cuesText = exercise.cues.join(' ');
  if (
    exercise.apparatus === 'mat' ||
    exercise.apparatus === 'barrel' ||
    exercise.id === 'original-cadillac-table-breath' ||
    exercise.id === 'original-chair-seated-breath' ||
    cuesText.includes('스프링을 사용하지 않고') ||
    s.includes('bodyweight') ||
    s.includes('스프링 사용 없음') ||
    s.includes('no spring') ||
    s.includes('0 spring')
  ) {
    return 'none';
  }
  if (s.includes('2r 1b') || s.includes('2r') || s.includes('heavy')) {
    return 'high';
  }
  if (s.includes('1b') || s.includes('1y') || s.includes('2y') || s.includes('yellow')) {
    return s.includes('1r') ? 'medium' : 'low';
  }
  return 'medium';
}

function resolveSupportSurfaceKo(exercise: PilatesExercise): string {
  const appLabel = APPARATUS_LABELS[exercise.apparatus]?.ko ?? exercise.apparatus;
  const posLabel = POSITION_LABELS[exercise.bodyPosition]?.ko ?? exercise.bodyPosition;
  const boxNote =
    exercise.box === 'long-box'
      ? ' · 롱박스(Long Box) 장착'
      : exercise.box === 'short-box'
        ? ' · 숏박스(Short Box) 장착'
        : '';
  const footbarNote =
    exercise.apparatus === 'reformer' && exercise.footbar !== 'none'
      ? ` · 풋바(${exercise.footbar.toUpperCase()})`
      : '';
  const headrestNote =
    exercise.apparatus === 'reformer'
      ? ` · 헤드레스트(${exercise.headrest.toUpperCase()})`
      : '';
  return `${appLabel} ${posLabel}${boxNote}${footbarNote}${headrestNote}`;
}

function resolvePropPositionKo(exercise: PilatesExercise): string | undefined {
  const activeProps = exercise.props.filter((p) => p !== 'none');
  if (activeProps.length === 0) return undefined;
  const propNames = activeProps
    .map((p) => PROP_LABELS[p]?.ko ?? p)
    .join(', ');
  return `${propNames} 정렬 보조 및 저항 결합`;
}

function splitBreathPatternToPhases(
  breathPattern: string,
  fallbackCues: readonly [string, string, string],
): readonly [string, string, string] {
  const parts = breathPattern
    .split(/→|->/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 3) {
    return [parts[0], parts[1], parts.slice(2).join(' · ')];
  }
  if (parts.length === 2) {
    return [fallbackCues[0], parts[0], parts[1]];
  }
  return [
    `${fallbackCues[0]} (${breathPattern})`,
    fallbackCues[1],
    fallbackCues[2],
  ];
}

export function buildMovementVisualAssetForExercise(
  exercise: PilatesExercise,
): CatalogMovementVisualAsset {
  const blueprint = resolveArchetypeBlueprint(exercise);
  const springTension = resolveSpringTensionLevel(exercise);
  const supportSurfaceKo = resolveSupportSurfaceKo(exercise);
  const propPositionKo = resolvePropPositionKo(exercise);
  const breathCues = splitBreathPatternToPhases(
    exercise.breathPattern,
    blueprint.breathCuesKo,
  );
  const blockMeta = CANONICAL_BLOCKS.find((b) => b.category === exercise.blockCategory);
  const planeLabels = exercise.spinalPlanes
    .map((p) => SPINAL_PLANE_LABELS[p]?.ko ?? p)
    .join(' · ');

  const makeFixedAnchors = (joints: RigJointMap) =>
    Object.freeze(
      blueprint.fixedAnchorJoints.map((anchor) => {
        const ptVal = joints[anchor.joint] ?? joints.pelvis;
        const surfaceKo =
          anchor.surfaceByApparatus?.[exercise.apparatus] ?? anchor.defaultSurfaceKo;
        return Object.freeze({
          joint: anchor.joint,
          surfaceKo,
          point: ptVal,
        });
      }),
    );

  const isCarriageApparatus = exercise.apparatus === 'reformer';
  const isPedalApparatus = exercise.apparatus === 'chair';

  const startPhase: PhasePoseSpec = Object.freeze({
    phaseId: 'start',
    badgeKo: '시작 자세 (준비·정렬)',
    shortTitleKo: blueprint.phaseTitlesKo[0],
    summaryKo: `${blueprint.phaseSummariesKo[0]} (${exercise.cues[0] ?? '기본 정렬을 먼저 확인합니다.'})`,
    breathCueKo: breathCues[0],
    joints: blueprint.startJoints,
    fixedAnchors: makeFixedAnchors(blueprint.startJoints),
    movingJoints: Object.freeze([...blueprint.movingJoints]),
    apparatusState: Object.freeze({
      carriageOffsetPx: isCarriageApparatus ? blueprint.carriageOffsets[0] : 0,
      pedalAngleDeg: isPedalApparatus ? blueprint.pedalAngles[0] : 0,
      springTensionLevel: springTension,
      supportSurfaceKo,
      ...(propPositionKo ? { propPositionKo } : {}),
    }),
    alignments: Object.freeze([...blueprint.alignments.start]),
    directionVectors: Object.freeze([...blueprint.directionVectors.start]),
  });

  const middlePhase: PhasePoseSpec = Object.freeze({
    phaseId: 'middle',
    badgeKo: '중간 자세 (최대 가동·정점)',
    shortTitleKo: blueprint.phaseTitlesKo[1],
    summaryKo: `${blueprint.phaseSummariesKo[1]} (${exercise.layers.standard || exercise.cues[1] || exercise.cues[0] || ''})`,
    breathCueKo: breathCues[1],
    joints: blueprint.middleJoints,
    fixedAnchors: makeFixedAnchors(blueprint.middleJoints),
    movingJoints: Object.freeze([...blueprint.movingJoints]),
    apparatusState: Object.freeze({
      carriageOffsetPx: isCarriageApparatus ? blueprint.carriageOffsets[1] : 0,
      pedalAngleDeg: isPedalApparatus ? blueprint.pedalAngles[1] : 0,
      springTensionLevel: springTension,
      supportSurfaceKo,
      ...(propPositionKo ? { propPositionKo } : {}),
    }),
    alignments: Object.freeze([...blueprint.alignments.middle]),
    directionVectors: Object.freeze([...blueprint.directionVectors.middle]),
  });

  const endPhase: PhasePoseSpec = Object.freeze({
    phaseId: 'end',
    badgeKo: '끝 자세 (제어 복귀·마무리)',
    shortTitleKo: blueprint.phaseTitlesKo[2],
    summaryKo: `${blueprint.phaseSummariesKo[2]} (주의: ${exercise.precautions})`,
    breathCueKo: breathCues[2],
    joints: blueprint.endJoints,
    fixedAnchors: makeFixedAnchors(blueprint.endJoints),
    movingJoints: Object.freeze([...blueprint.movingJoints]),
    apparatusState: Object.freeze({
      carriageOffsetPx: isCarriageApparatus ? blueprint.carriageOffsets[2] : 0,
      pedalAngleDeg: isPedalApparatus ? blueprint.pedalAngles[2] : 0,
      springTensionLevel: springTension,
      supportSurfaceKo,
      ...(propPositionKo ? { propPositionKo } : {}),
    }),
    alignments: Object.freeze([...blueprint.alignments.end]),
    directionVectors: Object.freeze([...blueprint.directionVectors.end]),
  });

  const primaryMuscles = buildMuscleHighlights(exercise, blueprint.muscles);

  const mobileBullets: readonly [string, string, string] = Object.freeze([
    `정렬·지지: ${supportSurfaceKo} (${planeLabels || '중립 정렬'})`,
    `핵심 변화: ${blueprint.poseDeltaSummary.keyJointChangeKo}`,
    `주 타겟(${blockMeta?.nameKo ?? exercise.blockCategory}): ${exercise.targetMuscles.slice(0, 3).join(', ')}`,
  ]);

  const baseAsset: CatalogMovementVisualAsset = Object.freeze({
    exerciseId: exercise.id,
    nameKo: exercise.nameKo,
    nameEn: exercise.nameEn,
    apparatus: exercise.apparatus,
    bodyPosition: exercise.bodyPosition,
    blockCategory: exercise.blockCategory,
    spinalPlanes: Object.freeze([...exercise.spinalPlanes]),
    isUnilateral: exercise.isUnilateral,
    archetypeId: blueprint.archetypeId,
    archetypeTitleKo: blueprint.archetypeTitleKo,
    staticGuideSvgPath: `/images/movement-guides/${exercise.apparatus}-phase-alignment-guide.svg`,
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
    primaryMuscles,
    poseDeltaSummary: Object.freeze({
      startToMiddleKo: blueprint.poseDeltaSummary.startToMiddleKo,
      middleToEndKo: blueprint.poseDeltaSummary.middleToEndKo,
      invariantAnchorsKo: blueprint.poseDeltaSummary.invariantAnchorsKo,
      keyJointChangeKo: blueprint.poseDeltaSummary.keyJointChangeKo,
    }),
    mobileSummaryBulletsKo: mobileBullets,
  });

  if (PROTECTED_REGRESSION_EXERCISE_IDS.has(exercise.id)) {
    return baseAsset;
  }

  const trackOverride = TRACK_I7_VISUAL_ASSET_OVERRIDES[exercise.id];
  if (!trackOverride) {
    return baseAsset;
  }

  return adaptTrackAssetForCatalogExercise(exercise, baseAsset, trackOverride);
}

const PROTECTED_REGRESSION_EXERCISE_IDS = new Set<string>([
  'original-reformer-strap-frog',
  'ex-straps-01',
  'ex-plank-01',
  'ex-plank-02',
  'original-chair-incline-support',
  'ex-kr-chair-01',
  'ex-footwork-03',
  'original-barrel-standing-hip-extension',
  'original-barrel-standing-side-reach',
  'original-chair-seated-knee-lift',
  'original-chair-seated-pedal-press',
  'original-barrel-supported-side-bend',
  'ex-kr-barrel-01',
  'original-barrel-standing-side-stretch',
  'original-chair-seated-pelvic-rock',
  'original-chair-seated-back-reach',
  'original-barrel-supported-ankle',
  'original-chair-supported-calf-raise',
  'original-barrel-standing-rotation',
  'ex-upper-03',
  'original-mat-pelvic-clock',
  'original-cadillac-pelvic-rock',
  'original-chair-sit-to-stand',
  'ex-lower-02',
  'ex-warmup-02',
  'original-chair-seated-spine-twist',
  'original-cadillac-seated-rotation',
  'original-mat-rib-breath',
  'original-cadillac-table-breath',
  'original-chair-seated-breath',
  'original-barrel-standing-breath',
  'original-mat-clam',
  'original-mat-open-book',
  'original-mat-side-leg-lift',
  'ex-lateral-01',
]);

const TRACK_I7_VISUAL_ASSET_OVERRIDES: Readonly<Record<string, CatalogMovementVisualAsset>> =
  Object.freeze({
    ...getSpineCatalogMovementVisualAssets(),
    ...getPelvisHipCatalogVisualAssets(),
    ...getHipLegCatalogVisualAssets(),
    ...getExtensionCatalogVisualAssets(),
    ...getShoulderSupportRegistryIntegrationPayload().assets,
    ...getRotationI7IntegrationBundle().visualAssets,
    ...getCoreI7RegistryPatch().assets,
  });

function adaptTrackPhaseForCatalog(
  exercise: PilatesExercise,
  basePhase: PhasePoseSpec,
  trackPhase: PhasePoseSpec,
): PhasePoseSpec {
  const clampedJoints = makeJointMap(trackPhase.joints);
  return Object.freeze({
    phaseId: basePhase.phaseId,
    badgeKo: basePhase.badgeKo,
    shortTitleKo: trackPhase.shortTitleKo || basePhase.shortTitleKo,
    summaryKo: trackPhase.summaryKo || basePhase.summaryKo,
    breathCueKo: trackPhase.breathCueKo || basePhase.breathCueKo,
    joints: clampedJoints,
    fixedAnchors:
      trackPhase.fixedAnchors.length > 0 ? trackPhase.fixedAnchors : basePhase.fixedAnchors,
    movingJoints:
      trackPhase.movingJoints.length > 0 ? trackPhase.movingJoints : basePhase.movingJoints,
    apparatusState: Object.freeze({
      carriageOffsetPx:
        exercise.apparatus === 'cadillac' ? 0 : trackPhase.apparatusState.carriageOffsetPx,
      pedalAngleDeg: trackPhase.apparatusState.pedalAngleDeg,
      springTensionLevel: trackPhase.apparatusState.springTensionLevel,
      supportSurfaceKo:
        trackPhase.apparatusState.supportSurfaceKo || basePhase.apparatusState.supportSurfaceKo,
      ...(trackPhase.apparatusState.propPositionKo
        ? { propPositionKo: trackPhase.apparatusState.propPositionKo }
        : {}),
    }),
    alignments: trackPhase.alignments.length > 0 ? trackPhase.alignments : basePhase.alignments,
    directionVectors:
      trackPhase.directionVectors.length > 0
        ? trackPhase.directionVectors
        : basePhase.directionVectors,
  });
}

function adaptTrackAssetForCatalogExercise(
  exercise: PilatesExercise,
  baseAsset: CatalogMovementVisualAsset,
  trackAsset: CatalogMovementVisualAsset,
): CatalogMovementVisualAsset {
  const roles = new Set(trackAsset.primaryMuscles.map((m) => m.role));
  const validMuscles =
    trackAsset.primaryMuscles.length >= 3 && roles.has('primary') && roles.has('stabilizer')
      ? trackAsset.primaryMuscles
      : baseAsset.primaryMuscles;

  return Object.freeze({
    exerciseId: exercise.id,
    nameKo: exercise.nameKo,
    nameEn: exercise.nameEn,
    apparatus: exercise.apparatus,
    bodyPosition: exercise.bodyPosition,
    blockCategory: exercise.blockCategory,
    spinalPlanes: Object.freeze([...exercise.spinalPlanes]),
    isUnilateral: exercise.isUnilateral,
    archetypeId: baseAsset.archetypeId,
    archetypeTitleKo: trackAsset.archetypeTitleKo || baseAsset.archetypeTitleKo,
    staticGuideSvgPath: `/images/movement-guides/${exercise.apparatus}-phase-alignment-guide.svg`,
    productionMethod: 'free-authored-kinematic-svg-v1',
    rightsStatus: 'original-app-authored-free-license',
    licenseLabelKo: trackAsset.licenseLabelKo || baseAsset.licenseLabelKo,
    anatomicalAccuracyAssumed: false,
    phases: Object.freeze({
      start: adaptTrackPhaseForCatalog(exercise, baseAsset.phases.start, trackAsset.phases.start),
      middle: adaptTrackPhaseForCatalog(
        exercise,
        baseAsset.phases.middle,
        trackAsset.phases.middle,
      ),
      end: adaptTrackPhaseForCatalog(exercise, baseAsset.phases.end, trackAsset.phases.end),
    }),
    primaryMuscles: validMuscles,
    poseDeltaSummary: trackAsset.poseDeltaSummary,
    mobileSummaryBulletsKo:
      trackAsset.mobileSummaryBulletsKo.length === 3
        ? trackAsset.mobileSummaryBulletsKo
        : baseAsset.mobileSummaryBulletsKo,
  });
}

export const MOVEMENT_VISUAL_ASSETS: readonly CatalogMovementVisualAsset[] = Object.freeze(
  INITIAL_EXERCISES.map((exercise) => buildMovementVisualAssetForExercise(exercise)),
);

export const MOVEMENT_VISUAL_ASSET_MAP: ReadonlyMap<string, CatalogMovementVisualAsset> = new Map(
  MOVEMENT_VISUAL_ASSETS.map(
    (asset): [string, CatalogMovementVisualAsset] => [asset.exerciseId, asset],
  ),
);

export function getMovementVisualAsset(
  exerciseOrId: string | PilatesExercise,
): CatalogMovementVisualAsset | null {
  if (typeof exerciseOrId === 'string') {
    return (
      MOVEMENT_VISUAL_ASSET_MAP.get(exerciseOrId) ??
      TRACK_I7_VISUAL_ASSET_OVERRIDES[exerciseOrId] ??
      null
    );
  }
  const existing =
    MOVEMENT_VISUAL_ASSET_MAP.get(exerciseOrId.id) ??
    TRACK_I7_VISUAL_ASSET_OVERRIDES[exerciseOrId.id];
  if (existing) return existing;
  return buildMovementVisualAssetForExercise(exerciseOrId);
}

export function calculatePhaseJointDelta(asset: CatalogMovementVisualAsset): {
  movedJoints: {
    joint: keyof RigJointMap;
    deltaPx: number;
    from: Point2D;
    to: Point2D;
  }[];
  maxDeltaPx: number;
  anchoredJoints: (keyof RigJointMap)[];
} {
  const startJoints = asset.phases.start.joints;
  const middleJoints = asset.phases.middle.joints;
  const anchoredSet = new Set<keyof RigJointMap>(
    asset.phases.start.fixedAnchors.map((a) => a.joint),
  );

  const allKeys = Object.keys(startJoints) as (keyof RigJointMap)[];
  const movedJoints: {
    joint: keyof RigJointMap;
    deltaPx: number;
    from: Point2D;
    to: Point2D;
  }[] = [];

  let maxDeltaPx = 0;

  for (const key of allKeys) {
    const fromPt = startJoints[key];
    const toPt = middleJoints[key];
    if (!fromPt || !toPt) continue;
    const dx = toPt.x - fromPt.x;
    const dy = toPt.y - fromPt.y;
    const dist = Math.round(Math.hypot(dx, dy) * 10) / 10;
    if (dist > 0) {
      movedJoints.push({
        joint: key,
        deltaPx: dist,
        from: fromPt,
        to: toPt,
      });
      if (dist > maxDeltaPx) {
        maxDeltaPx = dist;
      }
    } else if (!anchoredSet.has(key)) {
      anchoredSet.add(key);
    }
  }

  movedJoints.sort((a, b) => b.deltaPx - a.deltaPx);

  return {
    movedJoints,
    maxDeltaPx,
    anchoredJoints: Array.from(anchoredSet),
  };
}
