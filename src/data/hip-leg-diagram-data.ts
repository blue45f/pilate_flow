/**
 * SPDX-License-Identifier: MIT
 * Track I3 — Hip & Leg 2D Kinematic Diagram Data (`hip-leg-single-leg-circle`, `hip-leg-side-kick`)
 * and Track I7 Registry Bundle (`CatalogMovementVisualAsset` + `MovementDiagramCorrection`).
 */

import hipLegDiagramSources from './hip-leg-diagram-sources.json';
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
  getHipLegDiagramPose,
  HIP_LEG_SEGMENT_LENGTHS,
  HIP_LEG_STUDIO_SCALE_LENGTHS,
  resolveHipLegMovementId,
  sampleHipLegTrajectory,
  verifyHipLegKinematicInvariants,
  type HipLegDiagramPose,
  type HipLegMovementId,
} from '../models/hip-leg-diagram-model';
import type {
  ApparatusType,
  BodyPosition,
  ClassBlockCategory,
  SpinalPlane,
} from '../types/pilates';

export interface HipLegSourceCitation {
  readonly id: string;
  readonly title: string;
  readonly organization: string;
  readonly url: string;
  readonly locator: string;
  readonly verifiedFactsKo: string;
}

export interface HipLegPhaseNarrative {
  readonly phaseId: VisualPhaseId;
  readonly stageKey: 'start' | 'rotation' | 'end';
  readonly badgeKo: PhasePoseSpec['badgeKo'];
  readonly shortTitleKo: string;
  readonly summaryKo: string;
  readonly breathCueKo: string;
  readonly pelvisAnchorCalloutKo: string;
  readonly pose: HipLegDiagramPose;
}

export interface HipLegMovementDiagramSpec {
  readonly movementId: HipLegMovementId;
  readonly canonicalExerciseId: string;
  readonly legacyExerciseId: string;
  readonly archetypeId: string;
  readonly archetypeTitleKo: string;
  readonly relatedCatalogIds: readonly string[];
  readonly nameKo: string;
  readonly nameEn: string;
  readonly apparatus: ApparatusType;
  readonly bodyPosition: BodyPosition;
  readonly blockCategory: ClassBlockCategory;
  readonly spinalPlanes: readonly SpinalPlane[];
  readonly staticGuideSvgPath: string;
  readonly anatomicalAccuracyAssumed: false;
  readonly professionalReviewCount: 0;
  readonly sourceFrameMappings: 0;
  readonly productionMethod: 'free-authored-kinematic-svg-v1';
  readonly rightsStatus: 'original-app-authored-free-license';
  readonly nonMedicalDisclosureKo: string;
  readonly reviewedScopeKo: string;
  readonly correctionKo: string;
  readonly limitationKo: string;
  readonly pelvisAnchorSummaryKo: string;
  readonly trajectoryArcPoints: readonly Point2D[];
  readonly phases: {
    readonly start: HipLegPhaseNarrative;
    readonly middle: HipLegPhaseNarrative;
    readonly end: HipLegPhaseNarrative;
  };
  readonly primaryMuscles: readonly MuscleHighlightSpec[];
  readonly poseDeltaSummary: CatalogMovementVisualAsset['poseDeltaSummary'];
  readonly mobileSummaryBulletsKo: readonly [string, string, string];
  readonly sources: readonly HipLegSourceCitation[];
  readonly canonicalAsset: CatalogMovementVisualAsset;
  readonly correction: MovementDiagramCorrection;
}

export const HIP_LEG_MOVEMENT_IDS: readonly HipLegMovementId[] = Object.freeze([
  'hip-leg-single-leg-circle',
  'hip-leg-side-kick',
]);

export const HIP_LEG_SINGLE_LEG_CIRCLE_CATALOG_IDS: readonly string[] = Object.freeze([
  'hip-leg-single-leg-circle',
  'original-mat-single-leg-circle',
  'ex-hip-01',
  'leg-circle',
  'ex-straps-01',
  'ex-straps-02',
  'ex-kr-cadillac-02',
]);

export const HIP_LEG_SIDE_KICK_CATALOG_IDS: readonly string[] = Object.freeze([
  'hip-leg-side-kick',
  'original-mat-side-kick',
  'ex-hip-02',
  'side-lying-leg-lift',
  'original-mat-side-leg-lift',
  'ex-lower-04',
  'original-reformer-side-lying-press',
  'original-cadillac-side-leg-reach',
]);

export const HIP_LEG_CATALOG_ID_TO_MOVEMENT: Readonly<Record<string, HipLegMovementId>> =
  Object.freeze({
    'hip-leg-single-leg-circle': 'hip-leg-single-leg-circle',
    'original-mat-single-leg-circle': 'hip-leg-single-leg-circle',
    'ex-hip-01': 'hip-leg-single-leg-circle',
    'leg-circle': 'hip-leg-single-leg-circle',
    'ex-straps-01': 'hip-leg-single-leg-circle',
    'ex-straps-02': 'hip-leg-single-leg-circle',
    'ex-kr-cadillac-02': 'hip-leg-single-leg-circle',
    'hip-leg-side-kick': 'hip-leg-side-kick',
    'original-mat-side-kick': 'hip-leg-side-kick',
    'ex-hip-02': 'hip-leg-side-kick',
    'side-lying-leg-lift': 'hip-leg-side-kick',
    'original-mat-side-leg-lift': 'hip-leg-side-kick',
    'ex-lower-04': 'hip-leg-side-kick',
    'original-reformer-side-lying-press': 'hip-leg-side-kick',
    'original-cadillac-side-leg-reach': 'hip-leg-side-kick',
  });

export const HIP_LEG_TRUTHFULNESS_METADATA = Object.freeze({
  anatomicalAccuracyAssumed: false as const,
  professionalReviewCount: 0 as const,
  sourceFrameMappings: 0 as const,
  motionCaptureUsed: false as const,
  clinicalDiagnosisOrTreatmentGuaranteed: false as const,
  productionMethod: 'free-authored-kinematic-svg-v1' as const,
  rightsStatus: 'original-app-authored-free-license' as const,
  nonMedicalDisclosureKo: hipLegDiagramSources.truthfulnessMetadata.nonMedicalDisclosureKo,
  segmentLengths: HIP_LEG_SEGMENT_LENGTHS,
  studioScaleLengths: HIP_LEG_STUDIO_SCALE_LENGTHS,
});

function clampBoundedCoord(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function boundPoint2D(pt: Point2D): Point2D {
  return Object.freeze({
    x: clampBoundedCoord(pt.x, 16, 304),
    y: clampBoundedCoord(pt.y, 16, 184),
  });
}

function boundRigJointMap(joints: RigJointMap): RigJointMap {
  return Object.freeze({
    head: boundPoint2D(joints.head),
    neck: boundPoint2D(joints.neck),
    shoulder: boundPoint2D(joints.shoulder),
    elbow: boundPoint2D(joints.elbow),
    wrist: boundPoint2D(joints.wrist),
    hand: boundPoint2D(joints.hand),
    thoracic: boundPoint2D(joints.thoracic),
    lumbar: boundPoint2D(joints.lumbar),
    pelvis: boundPoint2D(joints.pelvis),
    hip: boundPoint2D(joints.hip),
    knee: boundPoint2D(joints.knee),
    ankle: boundPoint2D(joints.ankle),
    heel: boundPoint2D(joints.heel),
    toe: boundPoint2D(joints.toe),
    ...(joints.farShoulder ? { farShoulder: boundPoint2D(joints.farShoulder) } : {}),
    ...(joints.farElbow ? { farElbow: boundPoint2D(joints.farElbow) } : {}),
    ...(joints.farWrist ? { farWrist: boundPoint2D(joints.farWrist) } : {}),
    ...(joints.farHip ? { farHip: boundPoint2D(joints.farHip) } : {}),
    ...(joints.farKnee ? { farKnee: boundPoint2D(joints.farKnee) } : {}),
    ...(joints.farAnkle ? { farAnkle: boundPoint2D(joints.farAnkle) } : {}),
    ...(joints.farToe ? { farToe: boundPoint2D(joints.farToe) } : {}),
  });
}

function buildTrajectoryArcPoints(movementId: HipLegMovementId): readonly Point2D[] {
  const samples = sampleHipLegTrajectory(movementId, 25);
  return Object.freeze(samples.map((sample) => boundPoint2D(sample.workingLeg.ankle)));
}

const SINGLE_LEG_CIRCLE_MUSCLES: readonly MuscleHighlightSpec[] = Object.freeze([
  Object.freeze({
    muscleGroupId: 'hip-flexor-iliopsoas',
    labelKo: '장요근·대퇴직근 (작동 다리 원 궤적 제어)',
    labelEn: 'Iliopsoas & Rectus Femoris',
    catalogMuscleMatches: Object.freeze(['장요근', '고관절 굴곡근', '대퇴직근', '고관절']),
    role: 'primary',
    roleLabelKo: '주동근 (주 타겟)',
    activePhases: Object.freeze(['start', 'middle', 'end'] as const),
    anchorJoints: Object.freeze(['lumbar', 'pelvis', 'hip', 'knee'] as const),
    reasonKo:
      '고관절 소켓 안에서 대퇴골두를 중심화한 채 작동 다리의 90° 수직 지지와 360° 원형 공전 궤적을 주도합니다.',
  }),
  Object.freeze({
    muscleGroupId: 'adductors',
    labelKo: '내전근군·중둔근 (내전 교차 및 외전 회수 제어)',
    labelEn: 'Hip Adductors & Abductors',
    catalogMuscleMatches: Object.freeze(['내전근', '중둔근', '고관절 외회전근']),
    role: 'primary',
    roleLabelKo: '주동근 (주 타겟)',
    activePhases: Object.freeze(['middle', 'end'] as const),
    anchorJoints: Object.freeze(['pelvis', 'hip', 'knee'] as const),
    reasonKo:
      '몸통 중심선을 가로지르는 내전(Adduction) 진입과 바깥쪽 원호(Abduction) 회수를 정밀하게 조절합니다.',
  }),
  Object.freeze({
    muscleGroupId: 'core-transversus',
    labelKo: '심부 코어·복횡근·복사근 (골반 수평 앵커 고정)',
    labelEn: 'Deep Core, Transversus Abdominis & Obliques',
    catalogMuscleMatches: Object.freeze(['복횡근', '내/외복사근', '골반 안정화근', '코어']),
    role: 'stabilizer',
    roleLabelKo: '안정화근 (코어·정렬 유지)',
    activePhases: Object.freeze(['start', 'middle', 'end'] as const),
    anchorJoints: Object.freeze(['thoracic', 'lumbar', 'pelvis'] as const),
    reasonKo:
      '작동 다리가 원을 그리는 동안 양측 ASIS 수평과 천골 접지(pelvisDriftMm = 0)를 유지해 골반 흔들림을 차단합니다.',
  }),
  Object.freeze({
    muscleGroupId: 'hamstrings',
    labelKo: '햄스트링·종아리 (후면 사슬 신장 및 지지 다리 고정)',
    labelEn: 'Hamstrings & Posterior Chain',
    catalogMuscleMatches: Object.freeze(['햄스트링', '둔근']),
    role: 'lengthening',
    roleLabelKo: '신장·이완 부위',
    activePhases: Object.freeze(['start', 'middle', 'end'] as const),
    anchorJoints: Object.freeze(['pelvis', 'hip', 'knee', 'ankle'] as const),
    reasonKo:
      '천장으로 뻗은 작동 다리 후면 사슬은 길게 신장되고, 매트에 뻗은 지지 다리 후면은 뒤꿈치(y=144)를 바닥에 단단히 앵커링합니다.',
  }),
]);

const SIDE_KICK_MUSCLES: readonly MuscleHighlightSpec[] = Object.freeze([
  Object.freeze({
    muscleGroupId: 'glute-med',
    labelKo: '중둔근·소둔근 (고관절 높이 수평 유지 & 외전 지지)',
    labelEn: 'Gluteus Medius & Minimus',
    catalogMuscleMatches: Object.freeze(['중둔근', '소둔근', '대퇴근막장근', '외전근']),
    role: 'primary',
    roleLabelKo: '주동근 (주 타겟)',
    activePhases: Object.freeze(['start', 'middle', 'end'] as const),
    anchorJoints: Object.freeze(['pelvis', 'hip', 'knee'] as const),
    reasonKo:
      '위쪽 작동 다리를 고관절 높이 수평면에 일정하게 들고 유지하며 전·후방 스윕 중 다리가 처지지 않게 제어합니다.',
  }),
  Object.freeze({
    muscleGroupId: 'glute-max',
    labelKo: '대둔근·고관절 굴곡/신전근 (전방 배굴 킥 & 후방 저굴 리치)',
    labelEn: 'Gluteus Maximus & Hip Flexor-Extensor Couple',
    catalogMuscleMatches: Object.freeze(['대둔근', '둔근', '장요근', '햄스트링']),
    role: 'primary',
    roleLabelKo: '주동근 (주 타겟)',
    activePhases: Object.freeze(['middle', 'end'] as const),
    anchorJoints: Object.freeze(['pelvis', 'hip', 'knee', 'ankle'] as const),
    reasonKo:
      '전방 스윕(발목 배굴 더블 펄스)과 후방 신전 리치(발목 저굴)를 교차 수행하며 고관절 분리 가동성을 만듭니다.',
  }),
  Object.freeze({
    muscleGroupId: 'core-transversus',
    labelKo: '심부 코어·복사근 (수직 적층 골반 & 귀-어깨-고관절 일직선 고정)',
    labelEn: 'Deep Core & Lateral Trunk Stabilizers',
    catalogMuscleMatches: Object.freeze(['복횡근', '내/외복사근', '요방형근', '골반 안정화근']),
    role: 'stabilizer',
    roleLabelKo: '안정화근 (코어·정렬 유지)',
    activePhases: Object.freeze(['start', 'middle', 'end'] as const),
    anchorJoints: Object.freeze(['shoulder', 'thoracic', 'lumbar', 'pelvis'] as const),
    reasonKo:
      '다리가 앞뒤로 스윕할 때 몸통이 앞뒤로 롤링하거나 허리가 과신전되지 않도록 양측 골반 수직 적층(pelvisStacked)을 지킵니다.',
  }),
  Object.freeze({
    muscleGroupId: 'hamstrings',
    labelKo: '햄스트링·장요근 (전방 킥 후면 신장 & 후방 리치 전면 신장)',
    labelEn: 'Hamstrings & Anterior Hip Flexors',
    catalogMuscleMatches: Object.freeze(['햄스트링', '장요근']),
    role: 'lengthening',
    roleLabelKo: '신장·이완 부위',
    activePhases: Object.freeze(['middle', 'end'] as const),
    anchorJoints: Object.freeze(['pelvis', 'hip', 'knee', 'ankle'] as const),
    reasonKo:
      '전방 배굴 킥에서는 햄스트링·종아리가 길어지고, 후방 저굴 리치에서는 전면 고관절(장요근)이 길게 신장됩니다.',
  }),
]);

interface CatalogExerciseOverrideMeta {
  readonly nameKo?: string;
  readonly nameEn?: string;
  readonly apparatus?: ApparatusType;
  readonly bodyPosition?: BodyPosition;
  readonly blockCategory?: ClassBlockCategory;
  readonly supportSurfaceKo?: string;
  readonly propPositionKo?: string;
  readonly springTensionLevel?: 'low' | 'medium' | 'high' | 'none';
}

const CATALOG_OVERRIDE_META: Readonly<Record<string, CatalogExerciseOverrideMeta>> = Object.freeze({
  'ex-straps-01': {
    nameKo: '리포머 핏인스트랩 (프로그 · 레그써클 · 피터팬 · 숏스파인)',
    nameEn: 'Reformer Feet in Straps: Frogs, Leg Circles, Peter Pan & Short Spine',
    apparatus: 'reformer',
    bodyPosition: 'supine',
    blockCategory: 'feet-in-straps',
    supportSurfaceKo: '리포머 캐리지 앙와위 (천골 수평 고정 & 풋스트랩 원 궤적 제어)',
    propPositionKo: '롱스트랩 발 아치 착용',
    springTensionLevel: 'medium',
  },
  'ex-straps-02': {
    nameKo: '캐딜락 레그 스프링 프로그 & 에어플레인 써클',
    nameEn: 'Cadillac Leg Springs: Supine Frogs, Circles & Walking',
    apparatus: 'cadillac',
    bodyPosition: 'supine',
    blockCategory: 'feet-in-straps',
    supportSurfaceKo: '캐딜락 베드 앙와위 (천골 매트 밀착 & 레그 스프링 원 궤적 제어)',
    propPositionKo: '레그 스프링 스트랩 발 착용',
    springTensionLevel: 'medium',
  },
  'ex-kr-cadillac-02': {
    nameKo: '[국내 시퀀스] 서아앤헤이즐 캐딜락 레그 스프링 프로그 & 시저스',
    nameEn: 'KR Cadillac Leg Springs Frog, Circles & Scissors Series',
    apparatus: 'cadillac',
    bodyPosition: 'supine',
    blockCategory: 'feet-in-straps',
    supportSurfaceKo: '캐딜락 베드 앙와위 (골반 중립 고정 & 레그 스프링 서클/시저스)',
    propPositionKo: '레그 스프링 퍼지/스트랩 착용',
    springTensionLevel: 'medium',
  },
  'original-mat-side-leg-lift': {
    nameKo: '옆으로 누워 다리 들기 (사이드 킥 시리즈)',
    nameEn: 'Side-Lying Leg Lift & Sweep (Side Kick Series)',
    apparatus: 'mat',
    bodyPosition: 'side-lying',
    blockCategory: 'lower-body',
  },
  'ex-lower-04': {
    nameKo: '리포머 사이드 라잉 스트랩 싱글 레그 시리즈',
    nameEn: 'Side-Lying Foot in Strap: Side Kick, Circles & Clam',
    apparatus: 'reformer',
    bodyPosition: 'side-lying',
    blockCategory: 'lower-body',
    supportSurfaceKo: '리포머 캐리지 측와위 (골반 수직 적층 & 스트랩 수평 스윕)',
    propPositionKo: '위쪽 발 풋스트랩 착용',
    springTensionLevel: 'medium',
  },
  'original-reformer-side-lying-press': {
    nameKo: '리포머 사이드 라잉 레그 프레스 & 스윕',
    nameEn: 'Reformer Side-Lying Leg Press & Sweep',
    apparatus: 'reformer',
    bodyPosition: 'side-lying',
    blockCategory: 'lower-body',
    supportSurfaceKo: '리포머 캐리지 측와위 (수직 골반 적층 & 고관절 분리 스윕)',
    springTensionLevel: 'medium',
  },
  'original-cadillac-side-leg-reach': {
    nameKo: '캐딜락 사이드 레그 리치 (레그 스프링 스윕)',
    nameEn: 'Cadillac Side-Lying Leg Reach',
    apparatus: 'cadillac',
    bodyPosition: 'side-lying',
    blockCategory: 'lower-body',
    supportSurfaceKo: '캐딜락 베드 측와위 (양측 골반 수직 적층 & 레그 스프링 리치)',
    propPositionKo: '레그 스프링 발목 스트랩',
    springTensionLevel: 'low',
  },
});

function buildSingleLegCirclePhaseNarratives(): {
  readonly start: HipLegPhaseNarrative;
  readonly middle: HipLegPhaseNarrative;
  readonly end: HipLegPhaseNarrative;
} {
  const startPose = getHipLegDiagramPose('hip-leg-single-leg-circle', 'start');
  const middlePose = getHipLegDiagramPose('hip-leg-single-leg-circle', 'middle');
  const endPose = getHipLegDiagramPose('hip-leg-single-leg-circle', 'end');

  return Object.freeze({
    start: Object.freeze({
      phaseId: 'start',
      stageKey: 'start',
      badgeKo: '시작 자세 (준비·정렬)',
      shortTitleKo: '앙와위 천골·지지 다리 뒤꿈치(y=144) 고정 & 작동 다리 90° 수직 세팅',
      summaryKo:
        '매트에 바로 누워 후두부·견갑골·천골(y=136)을 수평 안착하고 반대쪽 지지 다리 뒤꿈치를 매트 바닥(y=144)에 길게 뻗어 고정한 채, 작동 다리를 고관절 바로 위 수직(-90°)으로 뻗습니다.',
      breathCueKo: '들숨 준비: 양측 ASIS 수평과 지지 다리 뒤꿈치 매트 앵커를 확인하며 중심선 내전 진입 준비',
      pelvisAnchorCalloutKo:
        '천골 수평 고정 (pelvisDriftMm = 0) · 지지 다리 뒤꿈치 매트 앵커 (y = 144)',
      pose: startPose,
    }),
    middle: Object.freeze({
      phaseId: 'middle',
      stageKey: 'rotation',
      badgeKo: '중간 자세 (최대 가동·정점)',
      shortTitleKo: '고관절 분리(Hip Dissociation) 내전 교차 → 하방·외측 360° 원호 공전',
      summaryKo:
        '양측 골반 수평(pelvisDriftMm=0)과 지지 다리 뒤꿈치(y=144)를 흔들림 없이 고정한 상태에서, 작동 다리 대퇴골(L=48)·경골(L=44) 강체 길이를 유지한 채 몸통 중심선을 가로질러 아래·바깥쪽 원호를 그립니다.',
      breathCueKo: '들숨 전반부 → 날숨 후반부: 중심선 교차 하강 후 복부 중심으로 원호를 쓸어 올림',
      pelvisAnchorCalloutKo:
        '반대측 골반 들림 0mm · 고관절 소켓 내 순수 대퇴골 원운동 (Hip Dissociation)',
      pose: middlePose,
    }),
    end: Object.freeze({
      phaseId: 'end',
      stageKey: 'end',
      badgeKo: '끝 자세 (제어 복귀·마무리)',
      shortTitleKo: '날숨 코어 회수로 고관절 상방 정점 제어 정지 & 역방향 준비',
      summaryKo:
        '외측 원호를 돌아 고관절 상방 정점 영역(-78°~-90°)으로 흔들림 없이 복귀하여 잠시 정지(Pause)하고, 골반 중립과 지지 다리 앵커를 재확인한 뒤 반대 방향 서클을 이어갑니다.',
      breathCueKo: '날숨 마무리: 갈비뼈와 골반 연결을 유지하며 정점 제어 정지 후 역방향 전환',
      pelvisAnchorCalloutKo:
        '회전 완료 시점까지 천골(164,136) 및 지지 뒤꿈치(y=144) 변위 0px 유지',
      pose: endPose,
    }),
  });
}

function buildSideKickPhaseNarratives(): {
  readonly start: HipLegPhaseNarrative;
  readonly middle: HipLegPhaseNarrative;
  readonly end: HipLegPhaseNarrative;
} {
  const startPose = getHipLegDiagramPose('hip-leg-side-kick', 'start');
  const middlePose = getHipLegDiagramPose('hip-leg-side-kick', 'middle');
  const endPose = getHipLegDiagramPose('hip-leg-side-kick', 'end');

  return Object.freeze({
    start: Object.freeze({
      phaseId: 'start',
      stageKey: 'start',
      badgeKo: '시작 자세 (준비·정렬)',
      shortTitleKo: '측와위 귀-어깨-고관절 일직선(y=128) · 골반 수직 적층 & 고관절 높이 리프트',
      summaryKo:
        '매트 뒷선에 귀(56,128)-어깨(92,128)-흉곽(116,128)-골반(164,128)-고관절(168,128)을 일직선으로 맞추고 아래 다리는 앞쪽 사선(Pike, 뒤꿈치 y=144 고정)으로 지지한 채 위쪽 작동 다리를 골반 높이 수평면으로 들어 올립니다.',
      breathCueKo: '들숨 준비: 양측 골반 수직 적층(Stacked Hips)과 아래 옆구리 중립 터널 유지',
      pelvisAnchorCalloutKo:
        '귀-어깨-고관절 일직선 정렬 · 양측 골반 수직 적층 · 바닥 지지 뒤꿈치 X좌표 고정',
      pose: startPose,
    }),
    middle: Object.freeze({
      phaseId: 'middle',
      stageKey: 'rotation',
      badgeKo: '중간 자세 (최대 가동·정점)',
      shortTitleKo: '골반 후방경사 억제 · 고관절 높이 전방 킥 스윕 & 발목 배굴(Dorsiflexion)',
      summaryKo:
        '몸통과 골반이 뒤로 말리거나 흔들리지 않게(pelvisDriftMm=0) 고정한 채, 위쪽 작동 다리를 고관절 높이 수평면에서 앞으로 스윕(-40°)하며 발목 배굴(Dorsiflexion) 상태로 후면 사슬을 길게 늘입니다.',
      breathCueKo: '들숨(또는 짧은 2회 코 들숨): 허리가 둥글어지지 않는 범위까지 전방 배굴 더블 펄스',
      pelvisAnchorCalloutKo:
        '전방 킥 시 요추 굴곡·골반 후방 말림 금지 (pelvisDriftMm = 0)',
      pose: middlePose,
    }),
    end: Object.freeze({
      phaseId: 'end',
      stageKey: 'end',
      badgeKo: '끝 자세 (제어 복귀·마무리)',
      shortTitleKo: '요추 과신전 억제 · 후방 고관절 신전 리치(+14°) & 발목 저굴(Plantarflexion)',
      summaryKo:
        '갈비뼈 들뜸과 요추 과신전을 복부로 제어하며 위쪽 다리를 몸통 뒤쪽 사선(+14°)으로 길게 뻗어 발목 저굴(Plantarflexion) 리치를 완성하고 고관절 높이 중심선으로 제어 복귀합니다.',
      breathCueKo: '날숨 길게: 아랫배를 당겨 골반 전방경사를 막으며 발끝까지 길게 후방 리치',
      pelvisAnchorCalloutKo:
        '후방 신전 시 골반 전방 회전·허리 꺾임 금지 · 바닥 지지 다리 앵커 불변',
      pose: endPose,
    }),
  });
}

function buildPhasePoseSpecFromNarrative(
  movementId: HipLegMovementId,
  narrative: HipLegPhaseNarrative,
  trajectoryArcPoints: readonly Point2D[],
  override?: CatalogExerciseOverrideMeta,
): PhasePoseSpec {
  const joints = boundRigJointMap(narrative.pose.joints);
  const isSingleLegCircle = movementId === 'hip-leg-single-leg-circle';

  const alignments: readonly JointAlignmentGuide[] = isSingleLegCircle
    ? Object.freeze([
        Object.freeze({
          id: `${movementId}-${narrative.phaseId}-pelvis-level`,
          labelKo: '앙와위 후두부-견갑-천골 수평 고정선 (y=136)',
          cueKo: narrative.pelvisAnchorCalloutKo,
          kind: 'anchor-lock',
          from: joints.head,
          to: joints.pelvis,
          targetAngleDeg: 0,
          cautionKo: '작동 다리가 원을 그릴 때 반대쪽 골반이 매트에서 따라 들리지 않게 고정합니다.',
        }),
        Object.freeze({
          id: `${movementId}-${narrative.phaseId}-support-heel-anchor`,
          labelKo: '지지 다리 뒤꿈치 매트 바닥 앵커 (y=144)',
          cueKo: '반대쪽 지지 다리 뒤꿈치를 매트 바닥(y=144)에 무겁게 뻗어 골반 회전 반작용을 지지합니다.',
          kind: 'plumb-line',
          from: joints.hip,
          to: boundPoint2D(narrative.pose.supportLeg.heel),
          cautionKo: '지지 다리 무릎이 들리거나 발끝이 바깥으로 쓰러지지 않게 유지합니다.',
        }),
      ])
    : Object.freeze([
        Object.freeze({
          id: `${movementId}-${narrative.phaseId}-collinear-spine`,
          labelKo: '측와위 귀-어깨-흉곽-골반-고관절 일직선 정렬축 (y=128)',
          cueKo: narrative.pelvisAnchorCalloutKo,
          kind: 'axis-line',
          from: joints.head,
          to: joints.hip,
          targetAngleDeg: 0,
          cautionKo: '다리 스윕 시 어깨나 골반이 앞뒤로 흔들리지 않게 매트 뒷선 정렬을 지킵니다.',
        }),
        Object.freeze({
          id: `${movementId}-${narrative.phaseId}-pike-support-anchor`,
          labelKo: '바닥 지지 다리 전방 파이크 고정 (supportHeel y=144)',
          cueKo: '아래쪽 다리를 고관절 앞쪽 사선(Pike)에 고정해 기저면을 확보하고 상측 골반을 수직 적층합니다.',
          kind: 'anchor-lock',
          from: joints.hip,
          to: boundPoint2D(narrative.pose.supportLeg.heel),
          cautionKo: '전방 킥에서 허리가 말리거나 후방 리치에서 허리가 꺾이지 않게 제어합니다.',
        }),
      ]);

  const phaseScope: MovementDirectionVector['phaseScope'] =
    narrative.phaseId === 'start'
      ? 'start'
      : narrative.phaseId === 'middle'
        ? 'start-to-middle'
        : 'middle-to-end';

  const vectorPoints: readonly Point2D[] =
    narrative.phaseId === 'start'
      ? trajectoryArcPoints.slice(0, 9)
      : narrative.phaseId === 'middle'
        ? trajectoryArcPoints.slice(0, 17)
        : trajectoryArcPoints.slice(12);

  const directionVectors: readonly MovementDirectionVector[] = Object.freeze([
    Object.freeze({
      id: `${movementId}-${narrative.phaseId}-leg-trajectory`,
      labelKo: isSingleLegCircle
        ? '작동 다리 고관절 분리(Hip Dissociation) 360° 원 궤적'
        : '작동 다리 고관절 높이 전방 배굴 킥 · 후방 저굴 리치 스윕 궤적',
      kind: narrative.phaseId === 'end' ? 'return-control' : 'limb-excursion',
      points: vectorPoints,
      phaseScope,
    }),
  ]);

  return Object.freeze({
    phaseId: narrative.phaseId,
    badgeKo: narrative.badgeKo,
    shortTitleKo: narrative.shortTitleKo,
    summaryKo: narrative.summaryKo,
    breathCueKo: narrative.breathCueKo,
    joints,
    fixedAnchors: Object.freeze([
      Object.freeze({
        joint: 'pelvis' as const,
        surfaceKo: isSingleLegCircle
          ? '앙와위 천골·양측 ASIS 수평 매트 고정 (pelvisDriftMm = 0)'
          : '측와위 양측 골반 수직 적층 고정 (pelvisStacked = true, pelvisDriftMm = 0)',
        point: joints.pelvis,
      }),
      Object.freeze({
        joint: 'farAnkle' as const,
        surfaceKo: isSingleLegCircle
          ? '매트 바닥 지지 다리 뒤꿈치 앵커 (supportHeelY = 144)'
          : '전방 파이크 바닥 지지 다리 뒤꿈치 앵커 (supportHeelY = 144)',
        point: joints.farAnkle ?? joints.heel,
      }),
    ]),
    movingJoints: Object.freeze(['hip', 'knee', 'ankle', 'heel', 'toe'] as const),
    apparatusState: Object.freeze({
      carriageOffsetPx: 0,
      pedalAngleDeg: 0,
      springTensionLevel: override?.springTensionLevel ?? ('none' as const),
      supportSurfaceKo:
        override?.supportSurfaceKo ??
        (isSingleLegCircle
          ? '매트 앙와위 (후두부·견갑골·천골 수평 안착 & 지지 다리 뒤꿈치 y=144 고정)'
          : '매트 측와위 (귀-어깨-고관절 일직선 정렬 & 바닥 다리 전방 파이크 지지)'),
      ...(override?.propPositionKo ? { propPositionKo: override.propPositionKo } : {}),
    }),
    alignments,
    directionVectors,
  });
}

function buildMovementDiagramSpec(movementId: HipLegMovementId): HipLegMovementDiagramSpec {
  const rawMovement = hipLegDiagramSources.movements[movementId];
  const isSingleLegCircle = movementId === 'hip-leg-single-leg-circle';
  const narratives = isSingleLegCircle
    ? buildSingleLegCirclePhaseNarratives()
    : buildSideKickPhaseNarratives();
  const trajectoryArcPoints = buildTrajectoryArcPoints(movementId);
  const primaryMuscles = isSingleLegCircle ? SINGLE_LEG_CIRCLE_MUSCLES : SIDE_KICK_MUSCLES;
  const staticGuideSvgPath = isSingleLegCircle
    ? '/images/movement-guides/hip-leg-single-leg-circle-guide.svg'
    : '/images/movement-guides/hip-leg-side-kick-guide.svg';

  const archetypeTitleKo = isSingleLegCircle
    ? '싱글 레그 서클 · 앙와위 골반 수평·지지 다리(y=144) 고정 & 단측 고관절 360° 원 궤적'
    : '사이드 킥 · 측와위 귀-어깨-고관절 일직선·골반 수직 적층 & 전후 수평 스윕';

  const poseDeltaSummary: CatalogMovementVisualAsset['poseDeltaSummary'] = isSingleLegCircle
    ? Object.freeze({
        startToMiddleKo:
          '천골(164,136)과 바닥 지지 다리 뒤꿈치(y=144)를 고정한 채 작동 다리가 고관절 수직(-90°)에서 중심선 내전 교차를 거쳐 원위 하방 아크(-38°)로 회전합니다.',
        middleToEndKo:
          '외측 원호를 따라 골반 흔들림(pelvisDriftMm=0)과 분절 길이 왜곡(drift < 1e-6) 없이 고관절 상방 정점(-78°~-90°)으로 제어 복귀합니다.',
        invariantAnchorsKo:
          '앙와위 후두부·견갑·천골(y=136), 고관절 중심(168,136), 매트 지지 다리 뒤꿈치(y=144) 및 대퇴(48px)·경골(44px) 강체 길이가 241 샘플 전 구간 불변입니다.',
        keyJointChangeKo:
          '고관절 분리(Hip Dissociation) 단측 원 궤적 공전 (thigh -90° → -38° → -78°, 프로그 양다리 굴신과 완전 분리)',
      })
    : Object.freeze({
        startToMiddleKo:
          '측와위 귀(56,128)-어깨(92,128)-골반(164,128)-고관절(168,128) 일직선과 바닥 파이크 지지 다리(y=144)를 고정한 채 위쪽 다리가 고관절 높이에서 전방(-40°, 발목 배굴)으로 스윕합니다.',
        middleToEndKo:
          '골반 전·후방 회전 없이 위쪽 다리를 고관절 후방 신전(+14°, 발목 저굴)으로 길게 리치하여 고관절 수평 스윕을 완성합니다.',
        invariantAnchorsKo:
          '귀-어깨-고관절 일직선(y=128), 양측 골반 수직 적층(x=168), 바닥 지지 뒤꿈치(supportHeelX 불변, y=144) 및 하지 강체 분절 길이가 241 샘플 전 구간 불변입니다.',
        keyJointChangeKo:
          '고관절 높이 수평면 전방 배굴 킥(-40°) ↔ 후방 저굴 리치(+14°) 스윕 (단순 상하 리프트·클램 무릎 벌림과 완전 분리)',
      });

  const mobileSummaryBulletsKo: readonly [string, string, string] = isSingleLegCircle
    ? Object.freeze([
        '고정 앵커: 앙와위 양측 ASIS·천골 수평(y=136) + 반대쪽 지지 다리 뒤꿈치 매트(y=144) 고정',
        '핵심 궤적: 작동 다리 무릎 신전 강체 길이 보존 · 내전 교차 → 하방 → 외측 → 정점 360° 서클',
        '주의 큐잉: 원 크기는 골반이 흔들리지 않는(pelvisDriftMm = 0) 범위로 조절',
      ] as const)
    : Object.freeze([
        '고정 앵커: 측와위 귀-어깨-고관절 일직선(y=128) + 양측 골반 수직 적층 + 바닥 다리 파이크 고정',
        '핵심 궤적: 위쪽 다리 고관절 높이 수평 유지 · 전방 배굴 더블 펄스(-40°) ↔ 후방 저굴 리치(+14°)',
        '주의 큐잉: 전방 킥에서 허리 말림 금지 · 후방 리치에서 갈비뼈 들뜸 및 허리 과신전 금지',
      ] as const);

  const sources: readonly HipLegSourceCitation[] = Object.freeze(
    rawMovement.sources.map((src) =>
      Object.freeze({
        id: src.id,
        title: src.title,
        organization: src.organization,
        url: src.url,
        locator: src.locator,
        verifiedFactsKo: src.verifiedFactsKo,
      }),
    ),
  );

  const correction: MovementDiagramCorrection = Object.freeze({
    archetypeId: rawMovement.archetypeId,
    checkedAt: '2026-11-06',
    reviewedScopeKo: rawMovement.reviewedScopeKo,
    correctionKo: rawMovement.correctionKo,
    limitationKo: rawMovement.limitationKo,
    professionalReviewCount: 0,
    sourceFrameMappings: 0,
    sources: Object.freeze(
      sources.map((src) =>
        Object.freeze({
          title: src.title,
          url: src.url,
        }),
      ),
    ),
  });

  const canonicalAsset: CatalogMovementVisualAsset = Object.freeze({
    exerciseId: movementId,
    nameKo: rawMovement.nameKo,
    nameEn: rawMovement.nameEn,
    apparatus: rawMovement.apparatus as ApparatusType,
    bodyPosition: rawMovement.bodyPosition as BodyPosition,
    blockCategory: 'lower-body',
    spinalPlanes: Object.freeze(['neutral'] as const),
    isUnilateral: true,
    archetypeId: rawMovement.archetypeId,
    archetypeTitleKo,
    staticGuideSvgPath,
    productionMethod: 'free-authored-kinematic-svg-v1',
    rightsStatus: 'original-app-authored-free-license',
    licenseLabelKo:
      '앱 자체 저작 2D 고관절·하지 역학 도해 (Original App-Authored Free License · anatomicalAccuracyAssumed: false)',
    anatomicalAccuracyAssumed: false,
    phases: Object.freeze({
      start: buildPhasePoseSpecFromNarrative(
        movementId,
        narratives.start,
        trajectoryArcPoints,
      ),
      middle: buildPhasePoseSpecFromNarrative(
        movementId,
        narratives.middle,
        trajectoryArcPoints,
      ),
      end: buildPhasePoseSpecFromNarrative(
        movementId,
        narratives.end,
        trajectoryArcPoints,
      ),
    }),
    primaryMuscles,
    poseDeltaSummary,
    mobileSummaryBulletsKo,
  });

  return Object.freeze({
    movementId,
    canonicalExerciseId: rawMovement.canonicalExerciseId,
    legacyExerciseId: rawMovement.legacyExerciseId,
    archetypeId: rawMovement.archetypeId,
    archetypeTitleKo,
    relatedCatalogIds: Object.freeze([...rawMovement.relatedCatalogIds]),
    nameKo: rawMovement.nameKo,
    nameEn: rawMovement.nameEn,
    apparatus: rawMovement.apparatus as ApparatusType,
    bodyPosition: rawMovement.bodyPosition as BodyPosition,
    blockCategory: 'lower-body',
    spinalPlanes: Object.freeze(['neutral'] as const),
    staticGuideSvgPath,
    anatomicalAccuracyAssumed: false,
    professionalReviewCount: 0,
    sourceFrameMappings: 0,
    productionMethod: 'free-authored-kinematic-svg-v1',
    rightsStatus: 'original-app-authored-free-license',
    nonMedicalDisclosureKo: hipLegDiagramSources.truthfulnessMetadata.nonMedicalDisclosureKo,
    reviewedScopeKo: rawMovement.reviewedScopeKo,
    correctionKo: rawMovement.correctionKo,
    limitationKo: rawMovement.limitationKo,
    pelvisAnchorSummaryKo: rawMovement.biomechanicalFacts.pelvisStabilityInvariantKo,
    trajectoryArcPoints,
    phases: narratives,
    primaryMuscles,
    poseDeltaSummary,
    mobileSummaryBulletsKo,
    sources,
    canonicalAsset,
    correction,
  });
}

export const HIP_LEG_DIAGRAM_DATA: Readonly<Record<HipLegMovementId, HipLegMovementDiagramSpec>> =
  Object.freeze({
    'hip-leg-single-leg-circle': buildMovementDiagramSpec('hip-leg-single-leg-circle'),
    'hip-leg-side-kick': buildMovementDiagramSpec('hip-leg-side-kick'),
  });

function buildCatalogAssetForKey(
  catalogKey: string,
  movementId: HipLegMovementId,
): CatalogMovementVisualAsset {
  const spec = HIP_LEG_DIAGRAM_DATA[movementId];
  const override = CATALOG_OVERRIDE_META[catalogKey];
  if (!override && catalogKey === movementId) {
    return spec.canonicalAsset;
  }

  return Object.freeze({
    ...spec.canonicalAsset,
    exerciseId: catalogKey,
    nameKo: override?.nameKo ?? spec.nameKo,
    nameEn: override?.nameEn ?? spec.nameEn,
    apparatus: override?.apparatus ?? spec.apparatus,
    bodyPosition: override?.bodyPosition ?? spec.bodyPosition,
    blockCategory: override?.blockCategory ?? spec.blockCategory,
    phases: Object.freeze({
      start: buildPhasePoseSpecFromNarrative(
        movementId,
        spec.phases.start,
        spec.trajectoryArcPoints,
        override,
      ),
      middle: buildPhasePoseSpecFromNarrative(
        movementId,
        spec.phases.middle,
        spec.trajectoryArcPoints,
        override,
      ),
      end: buildPhasePoseSpecFromNarrative(
        movementId,
        spec.phases.end,
        spec.trajectoryArcPoints,
        override,
      ),
    }),
  });
}

export const HIP_LEG_CATALOG_VISUAL_ASSETS: Readonly<Record<string, CatalogMovementVisualAsset>> =
  Object.freeze(
    Object.fromEntries(
      Object.entries(HIP_LEG_CATALOG_ID_TO_MOVEMENT).map(([key, movementId]) => [
        key,
        buildCatalogAssetForKey(key, movementId),
      ]),
    ),
  );

export const HIP_LEG_DIAGRAM_CORRECTIONS: Readonly<Record<string, MovementDiagramCorrection>> =
  Object.freeze(
    Object.fromEntries(
      Object.entries(HIP_LEG_CATALOG_ID_TO_MOVEMENT).map(([key, movementId]) => [
        key,
        HIP_LEG_DIAGRAM_DATA[movementId].correction,
      ]),
    ),
  );

export function getHipLegCatalogVisualAssets(): Record<string, CatalogMovementVisualAsset> {
  return { ...HIP_LEG_CATALOG_VISUAL_ASSETS };
}

export function getHipLegDiagramCorrections(): Record<string, MovementDiagramCorrection> {
  return { ...HIP_LEG_DIAGRAM_CORRECTIONS };
}

export function getHipLegMovementDiagramSpec(
  movementIdOrAlias: string,
): HipLegMovementDiagramSpec {
  const resolved = resolveHipLegMovementId(movementIdOrAlias) ?? 'hip-leg-single-leg-circle';
  return HIP_LEG_DIAGRAM_DATA[resolved];
}

export function resolveHipLegCatalogVisualAsset(
  idOrQuery: string | null | undefined,
): CatalogMovementVisualAsset | null {
  if (!idOrQuery) return null;
  if (HIP_LEG_CATALOG_VISUAL_ASSETS[idOrQuery]) {
    return HIP_LEG_CATALOG_VISUAL_ASSETS[idOrQuery];
  }
  const resolved = resolveHipLegMovementId(idOrQuery);
  return resolved ? HIP_LEG_DIAGRAM_DATA[resolved].canonicalAsset : null;
}

export function resolveHipLegDiagramCorrection(
  idOrQuery: string | null | undefined,
): MovementDiagramCorrection | null {
  if (!idOrQuery) return null;
  if (HIP_LEG_DIAGRAM_CORRECTIONS[idOrQuery]) {
    return HIP_LEG_DIAGRAM_CORRECTIONS[idOrQuery];
  }
  const resolved = resolveHipLegMovementId(idOrQuery);
  return resolved ? HIP_LEG_DIAGRAM_DATA[resolved].correction : null;
}

export interface HipLegI7RegistryBundle {
  readonly trackId: 'I3';
  readonly domain: 'hip-leg-2d-kinematic-diagrams';
  readonly visualAssets: Readonly<Record<string, CatalogMovementVisualAsset>>;
  readonly assets: Readonly<Record<string, CatalogMovementVisualAsset>>;
  readonly canonicalVisualAssets: Readonly<Record<HipLegMovementId, CatalogMovementVisualAsset>>;
  readonly diagramCorrections: Readonly<Record<string, MovementDiagramCorrection>>;
  readonly corrections: Readonly<Record<string, MovementDiagramCorrection>>;
  readonly catalogBindings: Readonly<Record<string, HipLegMovementId>>;
  readonly resolveVisualAsset: (id: string | null | undefined) => CatalogMovementVisualAsset | null;
  readonly resolveDiagramCorrection: (
    id: string | null | undefined,
  ) => MovementDiagramCorrection | null;
  readonly verificationReports: Readonly<
    Record<HipLegMovementId, ReturnType<typeof verifyHipLegKinematicInvariants>>
  >;
  readonly truthfulnessMetadata: typeof HIP_LEG_TRUTHFULNESS_METADATA;
}

export const HIP_LEG_I7_REGISTRY_BUNDLE: HipLegI7RegistryBundle = Object.freeze({
  trackId: 'I3',
  domain: 'hip-leg-2d-kinematic-diagrams',
  visualAssets: HIP_LEG_CATALOG_VISUAL_ASSETS,
  assets: HIP_LEG_CATALOG_VISUAL_ASSETS,
  canonicalVisualAssets: Object.freeze({
    'hip-leg-single-leg-circle': HIP_LEG_DIAGRAM_DATA['hip-leg-single-leg-circle'].canonicalAsset,
    'hip-leg-side-kick': HIP_LEG_DIAGRAM_DATA['hip-leg-side-kick'].canonicalAsset,
  }),
  diagramCorrections: HIP_LEG_DIAGRAM_CORRECTIONS,
  corrections: HIP_LEG_DIAGRAM_CORRECTIONS,
  catalogBindings: HIP_LEG_CATALOG_ID_TO_MOVEMENT,
  resolveVisualAsset: resolveHipLegCatalogVisualAsset,
  resolveDiagramCorrection: resolveHipLegDiagramCorrection,
  verificationReports: Object.freeze({
    'hip-leg-single-leg-circle': verifyHipLegKinematicInvariants('hip-leg-single-leg-circle'),
    'hip-leg-side-kick': verifyHipLegKinematicInvariants('hip-leg-side-kick'),
  }),
  truthfulnessMetadata: HIP_LEG_TRUTHFULNESS_METADATA,
});
