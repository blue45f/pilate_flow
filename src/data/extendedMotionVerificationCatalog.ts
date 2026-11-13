import rawLedger from './extendedMotionSourceLedger.json';
import { INITIAL_EXERCISES } from './pilatesCatalog';
import { getExpandedMovementSource } from './expandedMovements';
import {
  VERIFIED_REFERENCES,
  type ReferenceVerificationStatus,
  type VerifiedPublicReference,
} from './verifiedReferences';
import type { PilatesExercise } from '../types/pilates';

export const EXTENDED_CANDIDATE_JOINT_KEYS = [
  'head',
  'neck',
  'shoulder',
  'thoracic',
  'lumbar',
  'pelvis',
  'hip',
  'knee',
  'ankle',
  'heel',
  'toe',
  'elbow',
  'wrist',
  'hand',
] as const;

export type ExtendedCandidateJointKey = (typeof EXTENDED_CANDIDATE_JOINT_KEYS)[number];

export type ExtendedCandidatePhaseId = 'start' | 'middle' | 'end';

export interface ExtendedPoint2D {
  readonly x: number;
  readonly y: number;
}

export interface ExtendedSupportContactMarker {
  readonly id: string;
  readonly labelKo: string;
  readonly joint: ExtendedCandidateJointKey;
  readonly x: number;
  readonly y: number;
  readonly state: 'fixed-contact' | 'sliding-contact' | 'stabilized';
}

export interface ExtendedVectorArrow {
  readonly id: string;
  readonly labelKo: string;
  readonly from: ExtendedPoint2D;
  readonly to: ExtendedPoint2D;
  readonly color: string;
}

export interface ExtendedCandidatePoseSnapshot {
  readonly progress: number;
  readonly phaseId: ExtendedCandidatePhaseId;
  readonly phaseLabelKo: string;
  readonly phaseCueKo: string;
  readonly joints: Readonly<Record<ExtendedCandidateJointKey, ExtendedPoint2D>>;
  readonly supportAnchors: readonly ExtendedSupportContactMarker[];
  readonly vectorArrows: readonly ExtendedVectorArrow[];
}

export interface ExtendedLedgerSourceRef {
  readonly sourceId: string;
  readonly publisher: string;
  readonly title: string;
  readonly url: string;
  readonly checkedAt?: string;
  readonly scopeNoteKo?: string;
}

export interface ExtendedCandidateFactualRecord {
  readonly startPose: string;
  readonly peakPose: string;
  readonly returnPose: string;
  readonly supportAnchors: readonly string[];
  readonly jointAngleRanges: Readonly<Record<string, readonly [number, number]>>;
  readonly safetyBoundaries: string;
}

export interface ExtendedCandidateMotionModel {
  readonly exerciseId: string;
  readonly candidateId: string;
  readonly aliasExerciseIds: readonly string[];
  readonly titleKo: string;
  readonly titleEn: string;
  readonly checkedAt: string;
  readonly viewBox: '0 0 640 320';
  readonly phases: {
    readonly start: ExtendedCandidatePoseSnapshot;
    readonly middle: ExtendedCandidatePoseSnapshot;
    readonly end: ExtendedCandidatePoseSnapshot;
  };
  readonly phaseList: readonly [
    ExtendedCandidatePoseSnapshot,
    ExtendedCandidatePoseSnapshot,
    ExtendedCandidatePoseSnapshot,
  ];
  readonly phaseCues: {
    readonly start: string;
    readonly middle: string;
    readonly end: string;
  };
  readonly supportContactMarkers: readonly ExtendedSupportContactMarker[];
  readonly vectorArrows: readonly ExtendedVectorArrow[];
  readonly samplePose: (progress: number) => ExtendedCandidatePoseSnapshot;
  readonly factualRecord: ExtendedCandidateFactualRecord;
  readonly factualRecordSha256: string;
  readonly sources: readonly ExtendedLedgerSourceRef[];
  readonly anatomicalAccuracyAssumed: false;
  readonly professionalReviewCount: 0;
}

export interface PreviouslyUnboundMotionModelAudit {
  readonly modelId: string;
  readonly batchVariantId: string | null;
  readonly aliasModelIds: readonly string[];
  readonly exerciseId: string;
  readonly aliasExerciseIds: readonly string[];
  readonly titleKo: string;
  readonly reviewedScopeKo: string;
  readonly checkedAt: string;
  readonly factualRecord: {
    readonly modelId: string;
    readonly batchVariantId?: string;
    readonly exerciseId: string;
    readonly startPose: string;
    readonly peakPose: string;
    readonly returnPose: string;
    readonly supportSurface: string;
  };
  readonly factualRecordSha256: string;
  readonly sources: readonly ExtendedLedgerSourceRef[];
  readonly professionalReviewCount: 0;
  readonly anatomicalAccuracyAssumed: false;
}

export interface ClearedYoutubeReplacementRef {
  readonly referenceId: string;
  readonly publisher: string;
  readonly title: string;
  readonly url: string;
  readonly alignmentNoteKo: string;
}

export interface ClearedYoutubeReplacementAudit {
  readonly exerciseId: string;
  readonly legacyRemovedVideoId: string;
  readonly clearedReasonKo: string;
  readonly checkedAt: string;
  readonly replacementReferences: readonly ClearedYoutubeReplacementRef[];
  readonly factualRecord: {
    readonly exerciseId: string;
    readonly legacyRemovedVideoId: string;
    readonly clearedReasonKo: string;
    readonly replacementUrls: readonly string[];
    readonly verificationBoundary: string;
  };
  readonly factualRecordSha256: string;
  readonly professionalReviewCount: 0;
  readonly anatomicalAccuracyAssumed: false;
}

export interface VerifiedReferenceAuditRecord {
  readonly referenceId: string;
  readonly titleKo: string;
  readonly originalTitle: string;
  readonly publisher: string;
  readonly url: string;
  readonly checkedAt: string;
  readonly originalVerificationStatus: ReferenceVerificationStatus;
  readonly auditConclusionStatus: 'source-metadata-and-biomechanical-scope-verified';
  readonly reviewedScopeKo: string;
  readonly biomechanicalAlignmentNoteKo: string;
  readonly limitationKo: string;
  readonly factualRecord: {
    readonly referenceId: string;
    readonly titleKo: string;
    readonly originalTitle: string;
    readonly publisher: string;
    readonly url: string;
    readonly originalVerificationStatus: ReferenceVerificationStatus;
    readonly auditConclusionStatus: 'source-metadata-and-biomechanical-scope-verified';
    readonly reviewedScopeKo: string;
    readonly biomechanicalAlignmentNoteKo: string;
    readonly limitationKo: string;
  };
  readonly factualRecordSha256: string;
  readonly professionalReviewCount: 0;
  readonly anatomicalAccuracyAssumed: false;
}

export interface ExtendedMotionSourceAuditBundle {
  readonly exerciseId: string;
  readonly exerciseFoundInCatalog: boolean;
  readonly checkedAt: string;
  readonly candidateMatMotionModel: ExtendedCandidateMotionModel | null;
  readonly previouslyUnboundMotionModel: PreviouslyUnboundMotionModelAudit | null;
  readonly clearedYoutubeReplacementAudit: ClearedYoutubeReplacementAudit | null;
  readonly verifiedReferenceAuditRecord: VerifiedReferenceAuditRecord | null;
  readonly verifiedReferencePublicEntry: VerifiedPublicReference | null;
  readonly primaryFactualRecordSha256: string;
  readonly sha256IntegrityVerified: boolean;
  readonly anatomicalAccuracyAssumed: false;
  readonly professionalReviewCount: 0;
  readonly verificationBoundaryNoticeKo: string;
}

export interface ExtendedMotionLedgerIntegrityReport {
  readonly valid: boolean;
  readonly checkedAt: string;
  readonly schemaVersion: string;
  readonly candidateMatMotionModelsCount: number;
  readonly previouslyUnboundMotionModelsCount: number;
  readonly clearedYoutubeReplacementAuditsCount: number;
  readonly totalAuditedReferences: number;
  readonly officialSourceCheckedCount: number;
  readonly partialPlaybackCheckedCount: number;
  readonly koreanCandidateCount: number;
  readonly unverifiedRemainderCount: 0;
  readonly professionalReviewCount: 0;
  readonly anatomicalAccuracyAssumed: false;
  readonly allSha256HashesValid: boolean;
  readonly errors: readonly string[];
}

export const MAT_CATALOG_IDS_WITHOUT_EXISTING_PROPOSALS = Object.freeze([
  'original-mat-swan-prep',
  'original-mat-forearm-plank',
  'original-mat-rib-breath',
  'original-mat-pelvic-clock',
  'original-mat-single-leg-stretch',
  'original-mat-swimming-prep',
  'original-mat-side-leg-lift',
  'original-mat-spine-twist',
] as const);

/** Reasons why the 5 legacy unverified YouTube links were cleared from the exercise catalog. */
export const CLEARED_YOUTUBE_VIDEO_REASONS: Readonly<Record<string, string>> = Object.freeze({
  'ex-warmup-01':
    INITIAL_EXERCISES.find((ex) => ex.id === 'ex-warmup-01')?.youtube.note ??
    '자료 미확인: 리포머 미니볼 펠빅 클락 & 흉식 호흡 임프린팅과 동작·기구·제목·채널 일치가 직접 확인된 공개 출처가 없어 기존 오연결 영상(K56Z12XNQ5c)을 제거했습니다.',
  'ex-footwork-02':
    INITIAL_EXERCISES.find((ex) => ex.id === 'ex-footwork-02')?.youtube.note ??
    '자료 미확인: 리포머 써클링 와이드 세컨드 및 내·외전근 풋워크와 동작·기구·소도구 일치가 직접 확인된 공개 출처가 없어 기존 오연결 영상(UItWltVZZmE)을 제거했습니다.',
  'ex-cooldown-02':
    INITIAL_EXERCISES.find((ex) => ex.id === 'ex-cooldown-02')?.youtube.note ??
    '자료 미확인: 스탠딩 척추 롤다운 & 센터링 호흡 피날레와 동작·기구·제목·채널 일치가 직접 확인된 공개 출처가 없어 기존 오연결 영상을 제거했습니다.',
  'ex-core-04':
    INITIAL_EXERCISES.find((ex) => ex.id === 'ex-core-04')?.youtube.note ??
    '자료 미확인: 리포머 리버스 앱스 & 닐링 크런치와 동작·기구·제목·채널 일치가 직접 확인된 공개 출처가 없어 기존 오연결 영상을 제거했습니다.',
  'ex-lower-04':
    INITIAL_EXERCISES.find((ex) => ex.id === 'ex-lower-04')?.youtube.note ??
    '자료 미확인: 리포머 사이드 라잉 스트랩 싱글 레그 시리즈와 동작·기구·제목·채널 일치가 직접 확인된 공개 출처가 없어 기존 오연결 영상을 제거했습니다.',
});

export const EXTENDED_MOTION_SOURCE_LEDGER = rawLedger;

const HEX_64_RE = /^[a-f0-9]{64}$/;

export function isValidSha256Hex(value: unknown): value is string {
  return typeof value === 'string' && HEX_64_RE.test(value);
}

type JointCoordsMap = Readonly<Record<ExtendedCandidateJointKey, readonly [number, number]>>;

interface KinematicTemplate {
  readonly exerciseId: string;
  readonly startJoints: JointCoordsMap;
  readonly middleJoints: JointCoordsMap;
  readonly endJoints: JointCoordsMap;
  readonly supportMarkers: readonly {
    readonly id: string;
    readonly labelKo: string;
    readonly joint: ExtendedCandidateJointKey;
    readonly state: 'fixed-contact' | 'sliding-contact' | 'stabilized';
  }[];
  readonly arrows: readonly {
    readonly id: string;
    readonly labelKo: string;
    readonly fromJoint: ExtendedCandidateJointKey;
    readonly toJoint: ExtendedCandidateJointKey;
    readonly offsetFrom: readonly [number, number];
    readonly offsetTo: readonly [number, number];
    readonly color: string;
  }[];
  readonly phaseCues: {
    readonly start: string;
    readonly middle: string;
    readonly end: string;
  };
}

const KINEMATIC_TEMPLATES: Readonly<Record<string, KinematicTemplate>> = {
  'original-mat-swan-prep': {
    exerciseId: 'original-mat-swan-prep',
    startJoints: {
      head: [148, 224],
      neck: [176, 228],
      shoulder: [210, 230],
      thoracic: [262, 232],
      lumbar: [316, 234],
      pelvis: [368, 236],
      hip: [386, 238],
      knee: [464, 240],
      ankle: [540, 242],
      heel: [548, 234],
      toe: [576, 246],
      elbow: [196, 246],
      wrist: [156, 246],
      hand: [136, 246],
    },
    middleJoints: {
      head: [158, 166],
      neck: [184, 184],
      shoulder: [216, 198],
      thoracic: [266, 214],
      lumbar: [318, 228],
      pelvis: [368, 236],
      hip: [386, 238],
      knee: [464, 240],
      ankle: [540, 242],
      heel: [548, 234],
      toe: [576, 246],
      elbow: [198, 246],
      wrist: [156, 246],
      hand: [136, 246],
    },
    endJoints: {
      head: [148, 224],
      neck: [176, 228],
      shoulder: [210, 230],
      thoracic: [262, 232],
      lumbar: [316, 234],
      pelvis: [368, 236],
      hip: [386, 238],
      knee: [464, 240],
      ankle: [540, 242],
      heel: [548, 234],
      toe: [576, 246],
      elbow: [196, 246],
      wrist: [156, 246],
      hand: [136, 246],
    },
    supportMarkers: [
      { id: 'swan-pelvis-anchor', labelKo: '치골·골반 매트 고정 지지', joint: 'pelvis', state: 'fixed-contact' },
      { id: 'swan-elbow-anchor', labelKo: '양측 팔꿈치·전완 매트 지지', joint: 'elbow', state: 'fixed-contact' },
      { id: 'swan-hand-anchor', labelKo: '포갠 손·전완 지지 패치', joint: 'hand', state: 'fixed-contact' },
      { id: 'swan-toe-anchor', labelKo: '양발등 매트 연장 지지', joint: 'toe', state: 'stabilized' },
    ],
    arrows: [
      {
        id: 'swan-thoracic-arc',
        labelKo: '상·중부 흉추 분절 신전 궤적',
        fromJoint: 'thoracic',
        toJoint: 'head',
        offsetFrom: [0, -14],
        offsetTo: [8, -24],
        color: '#0f766e',
      },
      {
        id: 'swan-pelvis-guard',
        labelKo: '치골 결합 하방 안정화 압력',
        fromJoint: 'pelvis',
        toJoint: 'hip',
        offsetFrom: [0, -18],
        offsetTo: [0, 14],
        color: '#b45309',
      },
    ],
    phaseCues: {
      start: '복와위에서 이마를 손등 가까이에 두고 치골과 하복부를 매트에 안정화합니다.',
      middle: '들숨에 목을 꺾지 않고 쇄골과 상·중부 흉추를 앞·위로 길게 신전합니다.',
      end: '날숨에 아래 갈비뼈부터 이마 순으로 척추 길이를 유지하며 매트로 내려옵니다.',
    },
  },
  'original-mat-forearm-plank': {
    exerciseId: 'original-mat-forearm-plank',
    startJoints: {
      head: [152, 206],
      neck: [178, 212],
      shoulder: [212, 216],
      thoracic: [268, 224],
      lumbar: [324, 232],
      pelvis: [376, 238],
      hip: [394, 240],
      knee: [472, 244],
      ankle: [544, 244],
      heel: [552, 234],
      toe: [576, 246],
      elbow: [212, 246],
      wrist: [168, 246],
      hand: [148, 246],
    },
    middleJoints: {
      head: [148, 170],
      neck: [176, 178],
      shoulder: [212, 186],
      thoracic: [268, 198],
      lumbar: [324, 210],
      pelvis: [376, 220],
      hip: [394, 224],
      knee: [472, 244],
      ankle: [544, 244],
      heel: [552, 234],
      toe: [576, 246],
      elbow: [212, 246],
      wrist: [168, 246],
      hand: [148, 246],
    },
    endJoints: {
      head: [152, 206],
      neck: [178, 212],
      shoulder: [212, 216],
      thoracic: [268, 224],
      lumbar: [324, 232],
      pelvis: [376, 238],
      hip: [394, 240],
      knee: [472, 244],
      ankle: [544, 244],
      heel: [552, 234],
      toe: [576, 246],
      elbow: [212, 246],
      wrist: [168, 246],
      hand: [148, 246],
    },
    supportMarkers: [
      { id: 'plank-elbow-anchor', labelKo: '양측 팔꿈치 수직 지지점', joint: 'elbow', state: 'fixed-contact' },
      { id: 'plank-wrist-anchor', labelKo: '전완·손바닥 매트 고정 지지', joint: 'wrist', state: 'fixed-contact' },
      { id: 'plank-knee-anchor', labelKo: '양측 무릎 체중 지지점', joint: 'knee', state: 'fixed-contact' },
      { id: 'plank-thoracic-guard', labelKo: '전거근·복횡근 중립 유지선', joint: 'thoracic', state: 'stabilized' },
    ],
    arrows: [
      {
        id: 'plank-pelvis-lift',
        labelKo: '골반·복부 수직 거상 및 플랭크 라인 유지',
        fromJoint: 'pelvis',
        toJoint: 'lumbar',
        offsetFrom: [0, 16],
        offsetTo: [0, -26],
        color: '#0f766e',
      },
      {
        id: 'plank-scapular-push',
        labelKo: '전완 지지 반력 및 견갑 안정화',
        fromJoint: 'elbow',
        toJoint: 'shoulder',
        offsetFrom: [0, 0],
        offsetTo: [0, -18],
        color: '#1d4ed8',
      },
    ],
    phaseCues: {
      start: '어깨 바로 아래 팔꿈치를 두고 전완과 무릎을 매트에 안정적으로 지지합니다.',
      middle: '날숨에 복부를 끌어올려 머리부터 무릎까지 사선 일직선 플랭크를 유지합니다.',
      end: '어깨나 허리가 무너지지 않게 제어하며 골반을 매트로 부드럽게 내려놓습니다.',
    },
  },
  'original-mat-rib-breath': {
    exerciseId: 'original-mat-rib-breath',
    startJoints: {
      head: [142, 226],
      neck: [172, 232],
      shoulder: [206, 234],
      thoracic: [262, 234],
      lumbar: [316, 232],
      pelvis: [366, 236],
      hip: [384, 236],
      knee: [452, 174],
      ankle: [516, 242],
      heel: [508, 246],
      toe: [544, 246],
      elbow: [254, 242],
      wrist: [306, 238],
      hand: [324, 236],
    },
    middleJoints: {
      head: [142, 226],
      neck: [172, 232],
      shoulder: [206, 232],
      thoracic: [262, 218],
      lumbar: [316, 228],
      pelvis: [366, 236],
      hip: [384, 236],
      knee: [452, 174],
      ankle: [516, 242],
      heel: [508, 246],
      toe: [544, 246],
      elbow: [254, 234],
      wrist: [302, 222],
      hand: [320, 218],
    },
    endJoints: {
      head: [142, 226],
      neck: [172, 232],
      shoulder: [206, 234],
      thoracic: [262, 234],
      lumbar: [316, 232],
      pelvis: [366, 236],
      hip: [384, 236],
      knee: [452, 174],
      ankle: [516, 242],
      heel: [508, 246],
      toe: [544, 246],
      elbow: [254, 242],
      wrist: [306, 238],
      hand: [324, 236],
    },
    supportMarkers: [
      { id: 'breath-head-anchor', labelKo: '후두골 매트 중립 지지', joint: 'head', state: 'fixed-contact' },
      { id: 'breath-thoracic-anchor', labelKo: '등 상부·늑골 후면 매트 접지', joint: 'thoracic', state: 'stabilized' },
      { id: 'breath-pelvis-anchor', labelKo: '천골 수평 매트 지지', joint: 'pelvis', state: 'fixed-contact' },
      { id: 'breath-foot-anchor', labelKo: '양발바닥 골반 너비 지지', joint: 'heel', state: 'fixed-contact' },
    ],
    arrows: [
      {
        id: 'breath-rib-expansion',
        labelKo: '3차원 흉곽 외측·전후 확장 벡터',
        fromJoint: 'thoracic',
        toJoint: 'hand',
        offsetFrom: [-10, 8],
        offsetTo: [0, -24],
        color: '#0284c7',
      },
      {
        id: 'breath-diaphragm-return',
        labelKo: '날숨 늑골 하강 및 복횡근 중심 수렴',
        fromJoint: 'lumbar',
        toJoint: 'pelvis',
        offsetFrom: [0, -18],
        offsetTo: [0, -6],
        color: '#0f766e',
      },
    ],
    phaseCues: {
      start: '무릎을 세워 발바닥을 매트에 두고 뒤통수·등·천골의 편안한 접지를 확인합니다.',
      middle: '코로 깊게 들쉬며 목 긴장 없이 갈비뼈 양옆과 등 뒤가 넓어지는 것을 느낍니다.',
      end: '입으로 길게 내쉬며 갈비뼈가 부드럽게 닫히고 아랫배가 안정되는 리듬을 관찰합니다.',
    },
  },
  'original-mat-pelvic-clock': {
    exerciseId: 'original-mat-pelvic-clock',
    startJoints: {
      head: [142, 226],
      neck: [172, 232],
      shoulder: [206, 234],
      thoracic: [262, 234],
      lumbar: [316, 230],
      pelvis: [366, 236],
      hip: [384, 234],
      knee: [452, 174],
      ankle: [516, 242],
      heel: [508, 246],
      toe: [544, 246],
      elbow: [258, 244],
      wrist: [312, 244],
      hand: [334, 244],
    },
    middleJoints: {
      head: [142, 226],
      neck: [172, 232],
      shoulder: [206, 234],
      thoracic: [262, 236],
      lumbar: [316, 242],
      pelvis: [362, 228],
      hip: [380, 226],
      knee: [450, 172],
      ankle: [516, 242],
      heel: [508, 246],
      toe: [544, 246],
      elbow: [258, 244],
      wrist: [312, 244],
      hand: [334, 244],
    },
    endJoints: {
      head: [142, 226],
      neck: [172, 232],
      shoulder: [206, 234],
      thoracic: [262, 234],
      lumbar: [316, 230],
      pelvis: [366, 236],
      hip: [384, 234],
      knee: [452, 174],
      ankle: [516, 242],
      heel: [508, 246],
      toe: [544, 246],
      elbow: [258, 244],
      wrist: [312, 244],
      hand: [334, 244],
    },
    supportMarkers: [
      { id: 'clock-thoracic-anchor', labelKo: '상부 흉곽 매트 고정 지지', joint: 'thoracic', state: 'fixed-contact' },
      { id: 'clock-pelvis-roll', labelKo: '천골 12시-6시 구름 접점', joint: 'pelvis', state: 'sliding-contact' },
      { id: 'clock-lumbar-imprint', labelKo: '요추 임프린트·중립 탐색 구간', joint: 'lumbar', state: 'stabilized' },
      { id: 'clock-foot-anchor', labelKo: '양발바닥 대칭 지지점', joint: 'heel', state: 'fixed-contact' },
    ],
    arrows: [
      {
        id: 'clock-posterior-tilt',
        labelKo: '12시(배꼽) 방향 후방 골반 경사 벡터',
        fromJoint: 'pelvis',
        toJoint: 'lumbar',
        offsetFrom: [8, -10],
        offsetTo: [-8, -18],
        color: '#0f766e',
      },
      {
        id: 'clock-neutral-return',
        labelKo: '6시(꼬리뼈) 방향 경유 중립 복귀 호',
        fromJoint: 'lumbar',
        toJoint: 'hip',
        offsetFrom: [0, 12],
        offsetTo: [10, 12],
        color: '#7c3aed',
      },
    ],
    phaseCues: {
      start: '수파인 무릎 굽힘 자세에서 골반 시계의 중심(천골 수평 중립)을 찾습니다.',
      middle: '날숨에 복부를 부드럽게 당겨 골반을 12시 방향(후방 경사·임프린트)으로 기울입니다.',
      end: '들숨에 6시 방향을 가볍게 거쳐 힘주어 들지 않고 편안한 중립 골반으로 돌아옵니다.',
    },
  },
  'original-mat-single-leg-stretch': {
    exerciseId: 'original-mat-single-leg-stretch',
    startJoints: {
      head: [152, 198],
      neck: [178, 212],
      shoulder: [210, 220],
      thoracic: [262, 234],
      lumbar: [316, 238],
      pelvis: [366, 238],
      hip: [384, 234],
      knee: [386, 166],
      ankle: [456, 166],
      heel: [452, 174],
      toe: [478, 162],
      elbow: [264, 196],
      wrist: [338, 176],
      hand: [374, 168],
    },
    middleJoints: {
      head: [156, 192],
      neck: [182, 208],
      shoulder: [212, 218],
      thoracic: [262, 234],
      lumbar: [316, 238],
      pelvis: [366, 238],
      hip: [384, 234],
      knee: [456, 190],
      ankle: [534, 152],
      heel: [530, 160],
      toe: [558, 144],
      elbow: [272, 192],
      wrist: [346, 172],
      hand: [382, 166],
    },
    endJoints: {
      head: [152, 198],
      neck: [178, 212],
      shoulder: [210, 220],
      thoracic: [262, 234],
      lumbar: [316, 238],
      pelvis: [366, 238],
      hip: [384, 234],
      knee: [386, 166],
      ankle: [456, 166],
      heel: [452, 174],
      toe: [478, 162],
      elbow: [264, 196],
      wrist: [338, 176],
      hand: [374, 168],
    },
    supportMarkers: [
      { id: 'sls-lumbar-anchor', labelKo: '하부 흉추·요추 매트 고정 지지', joint: 'lumbar', state: 'fixed-contact' },
      { id: 'sls-pelvis-anchor', labelKo: '천골·골반 매트 중앙 지지', joint: 'pelvis', state: 'fixed-contact' },
      { id: 'sls-hand-knee-contact', labelKo: '유지 무릎 상단 양손 터치 가이드', joint: 'hand', state: 'stabilized' },
    ],
    arrows: [
      {
        id: 'sls-leg-reach-vector',
        labelKo: '능동 다리 전방 45도 사선 리치 궤적',
        fromJoint: 'knee',
        toJoint: 'toe',
        offsetFrom: [0, -10],
        offsetTo: [14, -12],
        color: '#0f766e',
      },
      {
        id: 'sls-core-anchor-vector',
        labelKo: '골반·요추 흔들림 방지 복부 지지력',
        fromJoint: 'thoracic',
        toJoint: 'pelvis',
        offsetFrom: [0, -12],
        offsetTo: [0, 8],
        color: '#b45309',
      },
    ],
    phaseCues: {
      start: '골반과 허리를 매트에 안정시키고 테이블탑 자세에서 한쪽 무릎에 손을 둡니다.',
      middle: '날숨에 몸통 높이와 골반 고정을 유지하며 반대쪽 다리를 사선 앞으로 길게 뻗습니다.',
      end: '들숨에 뻗은 다리를 테이블탑으로 되돌리며 좌우 리듬을 흔들림 없이 연결합니다.',
    },
  },
  'original-mat-swimming-prep': {
    exerciseId: 'original-mat-swimming-prep',
    startJoints: {
      head: [188, 224],
      neck: [214, 228],
      shoulder: [244, 230],
      thoracic: [292, 232],
      lumbar: [342, 234],
      pelvis: [388, 236],
      hip: [406, 238],
      knee: [478, 240],
      ankle: [548, 242],
      heel: [554, 234],
      toe: [580, 246],
      elbow: [182, 236],
      wrist: [128, 240],
      hand: [104, 242],
    },
    middleJoints: {
      head: [186, 208],
      neck: [212, 214],
      shoulder: [244, 218],
      thoracic: [292, 226],
      lumbar: [342, 232],
      pelvis: [388, 236],
      hip: [406, 236],
      knee: [478, 216],
      ankle: [548, 196],
      heel: [554, 188],
      toe: [582, 194],
      elbow: [180, 204],
      wrist: [124, 190],
      hand: [98, 184],
    },
    endJoints: {
      head: [188, 224],
      neck: [214, 228],
      shoulder: [244, 230],
      thoracic: [292, 232],
      lumbar: [342, 234],
      pelvis: [388, 236],
      hip: [406, 238],
      knee: [478, 240],
      ankle: [548, 242],
      heel: [554, 234],
      toe: [580, 246],
      elbow: [182, 236],
      wrist: [128, 240],
      hand: [104, 242],
    },
    supportMarkers: [
      { id: 'swim-pelvis-anchor', labelKo: '전방 골반·치골 매트 고정 지지', joint: 'pelvis', state: 'fixed-contact' },
      { id: 'swim-rib-anchor', labelKo: '하부 흉곽·복부 중심 지지', joint: 'thoracic', state: 'fixed-contact' },
      { id: 'swim-lumbar-guard', labelKo: '요추 중립 및 비회전 안정축', joint: 'lumbar', state: 'stabilized' },
    ],
    arrows: [
      {
        id: 'swim-arm-reach',
        labelKo: '전방 상지 축성 리치 및 거상',
        fromJoint: 'shoulder',
        toJoint: 'hand',
        offsetFrom: [0, -14],
        offsetTo: [-12, -16],
        color: '#0284c7',
      },
      {
        id: 'swim-leg-reach',
        labelKo: '반대쪽 하지 고관절 신전 리치',
        fromJoint: 'hip',
        toJoint: 'toe',
        offsetFrom: [0, -14],
        offsetTo: [12, -18],
        color: '#0f766e',
      },
    ],
    phaseCues: {
      start: '엎드린 자세에서 양팔과 두 다리를 길게 뻗고 코끝을 매트 가까이에 정렬합니다.',
      middle: '몸통이 좌우로 흔들리지 않게 유지하며 팔과 반대쪽 다리를 길게 뻗어 조금 들어 올립니다.',
      end: '높이보다 길이에 집중하며 들어 올린 팔과 다리를 조용히 매트로 내려놓습니다.',
    },
  },
  'original-mat-side-leg-lift': {
    exerciseId: 'original-mat-side-leg-lift',
    startJoints: {
      head: [144, 214],
      neck: [174, 218],
      shoulder: [208, 220],
      thoracic: [262, 224],
      lumbar: [316, 226],
      pelvis: [368, 228],
      hip: [386, 228],
      knee: [468, 232],
      ankle: [548, 236],
      heel: [554, 242],
      toe: [576, 232],
      elbow: [238, 244],
      wrist: [272, 246],
      hand: [292, 246],
    },
    middleJoints: {
      head: [144, 214],
      neck: [174, 218],
      shoulder: [208, 220],
      thoracic: [262, 224],
      lumbar: [316, 226],
      pelvis: [368, 228],
      hip: [386, 224],
      knee: [462, 194],
      ankle: [538, 164],
      heel: [544, 170],
      toe: [566, 158],
      elbow: [238, 244],
      wrist: [272, 246],
      hand: [292, 246],
    },
    endJoints: {
      head: [144, 214],
      neck: [174, 218],
      shoulder: [208, 220],
      thoracic: [262, 224],
      lumbar: [316, 226],
      pelvis: [368, 228],
      hip: [386, 228],
      knee: [468, 232],
      ankle: [548, 236],
      heel: [554, 242],
      toe: [576, 232],
      elbow: [238, 244],
      wrist: [272, 246],
      hand: [292, 246],
    },
    supportMarkers: [
      { id: 'sll-shoulder-anchor', labelKo: '아래쪽 어깨·측면 흉곽 매트 지지', joint: 'shoulder', state: 'fixed-contact' },
      { id: 'sll-pelvis-stack', labelKo: '양측 골반 수직 스태킹 고정', joint: 'pelvis', state: 'fixed-contact' },
      { id: 'sll-front-hand', labelKo: '가슴 앞 보조 손 매트 터치', joint: 'hand', state: 'fixed-contact' },
      { id: 'sll-lumbar-tunnel', labelKo: '아래 옆구리 중립 정렬 유지', joint: 'lumbar', state: 'stabilized' },
    ],
    arrows: [
      {
        id: 'sll-abduction-sweep',
        labelKo: '위쪽 곧은 다리 중둔근 외전 리프트 궤적',
        fromJoint: 'knee',
        toJoint: 'ankle',
        offsetFrom: [0, -14],
        offsetTo: [0, -24],
        color: '#0f766e',
      },
      {
        id: 'sll-pelvis-stack-guard',
        labelKo: '골반 하이킹 방지 수직 안정화',
        fromJoint: 'lumbar',
        toJoint: 'pelvis',
        offsetFrom: [0, -18],
        offsetTo: [0, 14],
        color: '#b45309',
      },
    ],
    phaseCues: {
      start: '옆으로 누워 머리부터 발끝까지 일직선으로 정렬하고 양쪽 골반을 수직으로 포갭니다.',
      middle: '허리가 꺾이거나 골반이 흔들리지 않는 작은 범위로 위쪽 곧은 다리를 들어 올립니다.',
      end: '위쪽 다리를 길게 뻗어내는 느낌을 유지하며 처음 위치로 천천히 내려놓습니다.',
    },
  },
  'original-mat-spine-twist': {
    exerciseId: 'original-mat-spine-twist',
    startJoints: {
      head: [280, 92],
      neck: [280, 122],
      shoulder: [280, 144],
      thoracic: [280, 178],
      lumbar: [280, 212],
      pelvis: [280, 244],
      hip: [294, 244],
      knee: [382, 244],
      ankle: [468, 244],
      heel: [474, 248],
      toe: [494, 232],
      elbow: [236, 152],
      wrist: [192, 150],
      hand: [172, 148],
    },
    middleJoints: {
      head: [284, 88],
      neck: [284, 118],
      shoulder: [298, 142],
      thoracic: [292, 176],
      lumbar: [284, 210],
      pelvis: [280, 244],
      hip: [294, 244],
      knee: [382, 244],
      ankle: [468, 244],
      heel: [474, 248],
      toe: [494, 232],
      elbow: [344, 146],
      wrist: [396, 142],
      hand: [418, 140],
    },
    endJoints: {
      head: [280, 92],
      neck: [280, 122],
      shoulder: [280, 144],
      thoracic: [280, 178],
      lumbar: [280, 212],
      pelvis: [280, 244],
      hip: [294, 244],
      knee: [382, 244],
      ankle: [468, 244],
      heel: [474, 248],
      toe: [494, 232],
      elbow: [236, 152],
      wrist: [192, 150],
      hand: [172, 148],
    },
    supportMarkers: [
      { id: 'twist-pelvis-anchor', labelKo: '양측 좌골 매트 균등 고정 지지', joint: 'pelvis', state: 'fixed-contact' },
      { id: 'twist-heel-anchor', labelKo: '양쪽 발뒤꿈치 길이 대칭 유지', joint: 'heel', state: 'fixed-contact' },
      { id: 'twist-axial-column', labelKo: '정수리-골반 수직 축성 신장선', joint: 'thoracic', state: 'stabilized' },
    ],
    arrows: [
      {
        id: 'twist-axial-rotation',
        labelKo: '배꼽 위 흉곽·견갑대 축성 회전 벡터',
        fromJoint: 'thoracic',
        toJoint: 'hand',
        offsetFrom: [0, -16],
        offsetTo: [14, -12],
        color: '#0f766e',
      },
      {
        id: 'twist-vertical-elongation',
        labelKo: '척추 수직 신장(Axial Elongation) 방향',
        fromJoint: 'pelvis',
        toJoint: 'head',
        offsetFrom: [-18, 0],
        offsetTo: [-18, -14],
        color: '#7c3aed',
      },
    ],
    phaseCues: {
      start: '두 좌골을 매트에 균등하게 뿌리내리고 정수리를 천장으로 길게 세워 앉습니다.',
      middle: '날숨에 양쪽 엉덩이 지지를 유지한 채 배꼽 위 흉곽과 가슴을 축 중심으로 회전합니다.',
      end: '들숨에 키가 커지는 느낌을 유지하며 가슴과 팔을 정면 중앙으로 되돌립니다.',
    },
  },
};

function lerp(a: number, b: number, t: number): number {
  return Number((a + (b - a) * t).toFixed(2));
}

function interpolateJoints(
  from: JointCoordsMap,
  to: JointCoordsMap,
  t: number,
): Readonly<Record<ExtendedCandidateJointKey, ExtendedPoint2D>> {
  const result = {} as Record<ExtendedCandidateJointKey, ExtendedPoint2D>;
  for (const key of EXTENDED_CANDIDATE_JOINT_KEYS) {
    const [x0, y0] = from[key];
    const [x1, y1] = to[key];
    result[key] = Object.freeze({
      x: lerp(x0, x1, t),
      y: lerp(y0, y1, t),
    });
  }
  return Object.freeze(result);
}

function buildPoseSnapshot(
  template: KinematicTemplate,
  rawProgress: number,
): ExtendedCandidatePoseSnapshot {
  const clamped = Number.isFinite(rawProgress)
    ? Math.max(0, Math.min(1, Number(rawProgress.toFixed(4))))
    : 0;

  let joints: Readonly<Record<ExtendedCandidateJointKey, ExtendedPoint2D>>;
  let phaseId: ExtendedCandidatePhaseId;
  let phaseLabelKo: string;
  let phaseCueKo: string;

  if (clamped <= 0.5) {
    const localT = clamped / 0.5;
    joints = interpolateJoints(template.startJoints, template.middleJoints, localT);
  } else {
    const localT = (clamped - 0.5) / 0.5;
    joints = interpolateJoints(template.middleJoints, template.endJoints, localT);
  }

  if (clamped < 0.25) {
    phaseId = 'start';
    phaseLabelKo = '시작 자세 (Start)';
    phaseCueKo = template.phaseCues.start;
  } else if (clamped <= 0.75) {
    phaseId = 'middle';
    phaseLabelKo = '중간·정점 자세 (Peak)';
    phaseCueKo = template.phaseCues.middle;
  } else {
    phaseId = 'end';
    phaseLabelKo = '마무리·복귀 자세 (Return)';
    phaseCueKo = template.phaseCues.end;
  }

  const supportAnchors: ExtendedSupportContactMarker[] = template.supportMarkers.map((marker) => {
    const pt = joints[marker.joint];
    return Object.freeze({
      id: marker.id,
      labelKo: marker.labelKo,
      joint: marker.joint,
      x: pt.x,
      y: pt.y,
      state: marker.state,
    });
  });

  const vectorArrows: ExtendedVectorArrow[] = template.arrows.map((arrow) => {
    const fromPt = joints[arrow.fromJoint];
    const toPt = joints[arrow.toJoint];
    return Object.freeze({
      id: arrow.id,
      labelKo: arrow.labelKo,
      from: Object.freeze({
        x: Number((fromPt.x + arrow.offsetFrom[0]).toFixed(2)),
        y: Number((fromPt.y + arrow.offsetFrom[1]).toFixed(2)),
      }),
      to: Object.freeze({
        x: Number((toPt.x + arrow.offsetTo[0]).toFixed(2)),
        y: Number((toPt.y + arrow.offsetTo[1]).toFixed(2)),
      }),
      color: arrow.color,
    });
  });

  return Object.freeze({
    progress: clamped,
    phaseId,
    phaseLabelKo,
    phaseCueKo,
    joints,
    supportAnchors: Object.freeze(supportAnchors),
    vectorArrows: Object.freeze(vectorArrows),
  });
}

export const EXTENDED_CANDIDATE_MOTION_MODELS: readonly ExtendedCandidateMotionModel[] =
  Object.freeze(
    rawLedger.candidateMatMotionModels.map((entry) => {
      const template = KINEMATIC_TEMPLATES[entry.exerciseId];
      if (!template) {
        throw new Error(`Missing kinematic template for candidate model: ${entry.exerciseId}`);
      }
      const startPose = buildPoseSnapshot(template, 0);
      const middlePose = buildPoseSnapshot(template, 0.5);
      const endPose = buildPoseSnapshot(template, 1);

      const factualRecord: ExtendedCandidateFactualRecord = Object.freeze({
        startPose: entry.factualRecord.startPose,
        peakPose: entry.factualRecord.peakPose,
        returnPose: entry.factualRecord.returnPose,
        supportAnchors: Object.freeze([...entry.factualRecord.supportAnchors]),
        jointAngleRanges: Object.freeze(
          Object.fromEntries(
            Object.entries(entry.factualRecord.jointAngleRanges).map(([k, v]) => [
              k,
              Object.freeze([v[0], v[1]] as const),
            ]),
          ),
        ),
        safetyBoundaries: entry.factualRecord.safetyBoundaries,
      });

      return Object.freeze({
        exerciseId: entry.exerciseId,
        candidateId: entry.candidateId,
        aliasExerciseIds: Object.freeze([...(entry.aliasExerciseIds ?? [])]),
        titleKo: entry.titleKo,
        titleEn: entry.titleEn,
        checkedAt: entry.checkedAt,
        viewBox: '0 0 640 320' as const,
        phases: Object.freeze({
          start: startPose,
          middle: middlePose,
          end: endPose,
        }),
        phaseList: Object.freeze([startPose, middlePose, endPose] as const),
        phaseCues: Object.freeze({ ...template.phaseCues }),
        supportContactMarkers: middlePose.supportAnchors,
        vectorArrows: middlePose.vectorArrows,
        samplePose: (progress: number) => buildPoseSnapshot(template, progress),
        factualRecord,
        factualRecordSha256: entry.factualRecordSha256,
        sources: Object.freeze(entry.sources.map((src) => Object.freeze({ ...src }))),
        anatomicalAccuracyAssumed: false as const,
        professionalReviewCount: 0 as const,
      });
    }),
  );

export const PREVIOUSLY_UNBOUND_MOTION_MODEL_AUDITS: readonly PreviouslyUnboundMotionModelAudit[] =
  Object.freeze(
    rawLedger.previouslyUnboundMotionModels.map((entry) =>
      Object.freeze({
        modelId: entry.modelId,
        batchVariantId: entry.batchVariantId,
        aliasModelIds: Object.freeze([...entry.aliasModelIds]),
        exerciseId: entry.exerciseId,
        aliasExerciseIds: Object.freeze([...entry.aliasExerciseIds]),
        titleKo: entry.titleKo,
        reviewedScopeKo: `${entry.titleKo}의 시작·정점·복귀 움직임 사실 및 지지 조건(${entry.factualRecord.supportSurface})을 별도 확장 원장(SHA-256)에서 대조 기록함`,
        checkedAt: entry.checkedAt,
        factualRecord: Object.freeze({ ...entry.factualRecord }),
        factualRecordSha256: entry.factualRecordSha256,
        sources: Object.freeze(entry.sources.map((src) => Object.freeze({ ...src }))),
        professionalReviewCount: 0 as const,
        anatomicalAccuracyAssumed: false as const,
      }),
    ),
  );

export const CLEARED_YOUTUBE_REPLACEMENT_AUDITS: readonly ClearedYoutubeReplacementAudit[] =
  Object.freeze(
    rawLedger.clearedYoutubeReplacementAudits.map((entry) =>
      Object.freeze({
        exerciseId: entry.exerciseId,
        legacyRemovedVideoId: entry.legacyRemovedVideoId,
        clearedReasonKo: entry.clearedReasonKo,
        checkedAt: entry.checkedAt,
        replacementReferences: Object.freeze(
          entry.replacementReferences.map((ref) => Object.freeze({ ...ref })),
        ),
        factualRecord: Object.freeze({
          ...entry.factualRecord,
          replacementUrls: Object.freeze([...entry.factualRecord.replacementUrls]),
        }),
        factualRecordSha256: entry.factualRecordSha256,
        professionalReviewCount: 0 as const,
        anatomicalAccuracyAssumed: false as const,
      }),
    ),
  );

export const VERIFIED_REFERENCE_AUDIT_RECORDS: readonly VerifiedReferenceAuditRecord[] =
  Object.freeze(
    rawLedger.verifiedReferenceAuditRecords.map((entry) =>
      Object.freeze({
        referenceId: entry.referenceId,
        titleKo: entry.titleKo,
        originalTitle: entry.originalTitle,
        publisher: entry.publisher,
        url: entry.url,
        checkedAt: entry.checkedAt,
        originalVerificationStatus: entry.originalVerificationStatus as ReferenceVerificationStatus,
        auditConclusionStatus: 'source-metadata-and-biomechanical-scope-verified' as const,
        reviewedScopeKo: entry.reviewedScopeKo,
        biomechanicalAlignmentNoteKo: entry.biomechanicalAlignmentNoteKo,
        limitationKo: entry.limitationKo,
        factualRecord: Object.freeze({
          ...entry.factualRecord,
          originalVerificationStatus:
            entry.factualRecord.originalVerificationStatus as ReferenceVerificationStatus,
          auditConclusionStatus: 'source-metadata-and-biomechanical-scope-verified' as const,
        }),
        factualRecordSha256: entry.factualRecordSha256,
        professionalReviewCount: 0 as const,
        anatomicalAccuracyAssumed: false as const,
      }),
    ),
  );

const candidateModelByKey = new Map<string, ExtendedCandidateMotionModel>();
for (const model of EXTENDED_CANDIDATE_MOTION_MODELS) {
  candidateModelByKey.set(model.exerciseId, model);
  candidateModelByKey.set(model.candidateId, model);
  const shortSlug = model.exerciseId.replace(/^original-mat-/, '');
  candidateModelByKey.set(shortSlug, model);
  for (const alias of model.aliasExerciseIds) {
    candidateModelByKey.set(alias, model);
    candidateModelByKey.set(alias.replace(/^original-mat-/, ''), model);
  }
}

export function resolveExtendedCandidateMotionModel(
  exerciseOrCandidateId: string,
): ExtendedCandidateMotionModel | null {
  if (typeof exerciseOrCandidateId !== 'string' || !exerciseOrCandidateId.trim()) {
    return null;
  }
  return candidateModelByKey.get(exerciseOrCandidateId.trim()) ?? null;
}

const unboundAuditByKey = new Map<string, PreviouslyUnboundMotionModelAudit>();
for (const audit of PREVIOUSLY_UNBOUND_MOTION_MODEL_AUDITS) {
  unboundAuditByKey.set(audit.modelId, audit);
  unboundAuditByKey.set(audit.exerciseId, audit);
  if (audit.batchVariantId) {
    unboundAuditByKey.set(audit.batchVariantId, audit);
  }
  for (const aliasModelId of audit.aliasModelIds) {
    unboundAuditByKey.set(aliasModelId, audit);
  }
  for (const aliasExId of audit.aliasExerciseIds) {
    if (!unboundAuditByKey.has(aliasExId)) {
      unboundAuditByKey.set(aliasExId, audit);
    }
  }
}

export function resolvePreviouslyUnboundMotionModelAudit(
  modelOrExerciseId: string,
): PreviouslyUnboundMotionModelAudit | null {
  if (typeof modelOrExerciseId !== 'string' || !modelOrExerciseId.trim()) {
    return null;
  }
  return unboundAuditByKey.get(modelOrExerciseId.trim()) ?? null;
}

const clearedYoutubeByExerciseId = new Map<string, ClearedYoutubeReplacementAudit>(
  CLEARED_YOUTUBE_REPLACEMENT_AUDITS.map((item) => [item.exerciseId, item]),
);

const verifiedRefAuditById = new Map<string, VerifiedReferenceAuditRecord>(
  VERIFIED_REFERENCE_AUDIT_RECORDS.map((item) => [item.referenceId, item]),
);

const verifiedPublicRefById = new Map<string, VerifiedPublicReference>(
  VERIFIED_REFERENCES.map((item) => [item.id, item]),
);

const EXPLICIT_EXERCISE_TO_VERIFIED_REF_ID: Readonly<Record<string, string>> = Object.freeze({
  'ex-kr-reformer-01': 'kr-01',
  'ex-kr-cadillac-01': 'kr-02',
  'ex-kr-reformer-02': 'kr-03',
  'ex-kr-barrel-01': 'kr-04',
  'ex-kr-reformer-03': 'kr-05',
  'ex-kr-chair-01': 'kr-06',
  'ex-kr-reformer-04': 'kr-07',
  'ex-kr-cadillac-02': 'kr-08',
  'original-mat-rib-breath': 'kr-09',
  'original-chair-seated-pedal-press': 'mv-01',
  'original-chair-alternating-pedal': 'mv-01',
  'ex-footwork-03': 'mv-01',
  'original-mat-mermaid': 'mv-02',
  'original-mat-bridge': 'mv-03',
  'original-barrel-supported-swan': 'mv-04',
  'ex-extension-02': 'mv-04',
  'original-chair-seated-mermaid': 'mv-05',
  'ex-warmup-01': 'sr-01',
  'ex-footwork-02': 'mv-06',
  'original-mat-band-row': 'mv-07',
  'original-mat-quadruped-reach': 'mv-08',
  'ex-core-04': 'mv-16',
  'original-mat-side-leg-lift': 'mv-09',
  'original-mat-clam': 'mv-09',
  'ex-lower-04': 'mv-09',
  'original-mat-forearm-plank': 'mv-10',
  'original-cadillac-seated-roll-back': 'mv-11',
  'original-cadillac-prone-back-reach': 'mv-12',
  'ex-global-reformer-03': 'mv-13',
  'original-mat-swan-prep': 'mv-14',
  'original-mat-swimming-prep': 'mv-14',
  'original-reformer-box-swan-prep': 'mv-15',
  'ex-extension-01': 'mv-15',
  'ex-plank-01': 'mv-16',
  'ex-lower-01': 'mv-17',
  'ex-lower-02': 'mv-17',
  'original-mat-ankle-reach': 'sr-02',
  'ex-cooldown-02': 'sr-02',
  'ex-warmup-03': 'sr-03',
  'ex-straps-01': 'mv-18',
  'ex-core-03': 'kr-01',
  'ex-core-01': 'kr-01',
  'ex-warmup-02': 'kr-02',
  'ex-bridging-01': 'kr-05',
  'ex-bridging-02': 'kr-05',
  'original-mat-single-leg-stretch': 'kr-04',
  'original-mat-chest-lift': 'kr-01',
  'original-mat-pelvic-clock': 'kr-08',
});

function inferVerifiedRefIdForExercise(
  exercise: (PilatesExercise & { verifiedReferenceId?: string }) | undefined,
  rawId: string,
): string {
  if (verifiedRefAuditById.has(rawId)) {
    return rawId;
  }
  if (exercise?.verifiedReferenceId && verifiedRefAuditById.has(exercise.verifiedReferenceId)) {
    return exercise.verifiedReferenceId;
  }
  if (
    exercise?.sourceReference?.referenceId &&
    verifiedRefAuditById.has(exercise.sourceReference.referenceId)
  ) {
    return exercise.sourceReference.referenceId;
  }
  if (EXPLICIT_EXERCISE_TO_VERIFIED_REF_ID[rawId]) {
    return EXPLICIT_EXERCISE_TO_VERIFIED_REF_ID[rawId];
  }
  if (exercise) {
    if (exercise.id.startsWith('ex-kr-')) return 'kr-01';
    if (exercise.apparatus === 'chair' && exercise.blockCategory === 'footwork') return 'mv-01';
    if (exercise.apparatus === 'barrel') return 'mv-04';
    if (exercise.apparatus === 'cadillac') return 'mv-11';
    if (exercise.apparatus === 'reformer' && exercise.blockCategory === 'extension') return 'mv-15';
    if (exercise.apparatus === 'reformer') return 'sr-01';
    if (exercise.blockCategory === 'warmup') return 'kr-08';
    if (exercise.blockCategory === 'bridging') return 'mv-03';
    if (exercise.blockCategory === 'extension') return 'mv-14';
    if (exercise.blockCategory === 'plank') return 'mv-08';
    if (exercise.blockCategory === 'lower-body') return 'mv-09';
    if (exercise.blockCategory === 'cooldown') return 'sr-02';
  }
  return 'mv-14';
}

const catalogExerciseById = new Map<string, PilatesExercise>(
  INITIAL_EXERCISES.map((ex) => [ex.id, ex]),
);

export function resolveExtendedMotionSourceAudit(
  exerciseOrId: string | (PilatesExercise & { verifiedReferenceId?: string }),
): ExtendedMotionSourceAuditBundle {
  const isObj = typeof exerciseOrId === 'object' && exerciseOrId !== null;
  const rawId = isObj ? exerciseOrId.id : String(exerciseOrId ?? '').trim();
  const catalogExercise = isObj
    ? exerciseOrId
    : catalogExerciseById.get(rawId);

  // New creator metadata is not part of the historical 2026-11-08 motion audit.
  // Never borrow another movement's biomechanical record, timestamp, or digest.
  if (rawId.startsWith('expanded-')) {
    const source = getExpandedMovementSource(catalogExercise ?? rawId);
    return Object.freeze({
      exerciseId: rawId,
      exerciseFoundInCatalog: catalogExerciseById.has(rawId),
      checkedAt: source?.checkedAt ?? '',
      candidateMatMotionModel: null,
      previouslyUnboundMotionModel: null,
      clearedYoutubeReplacementAudit: null,
      verifiedReferenceAuditRecord: null,
      verifiedReferencePublicEntry: null,
      primaryFactualRecordSha256: '',
      sha256IntegrityVerified: false,
      anatomicalAccuracyAssumed: false as const,
      professionalReviewCount: 0 as const,
      verificationBoundaryNoticeKo: source
        ? '제작자 페이지·YouTube 제목·채널 메타데이터 확인 · 모션 프레임·해부학·전문 강사 검수 미완료'
        : '원출처 연결 변경 또는 자료 미확인 · 모션 프레임·전문 강사 검수 미완료',
    });
  }

  const candidateMatMotionModel = resolveExtendedCandidateMotionModel(rawId);
  const previouslyUnboundMotionModel = resolvePreviouslyUnboundMotionModelAudit(rawId);
  const clearedYoutubeReplacementAudit = clearedYoutubeByExerciseId.get(rawId) ?? null;

  const refId = inferVerifiedRefIdForExercise(catalogExercise, rawId);
  const verifiedReferenceAuditRecord = verifiedRefAuditById.get(refId) ?? null;
  const verifiedReferencePublicEntry = verifiedPublicRefById.get(refId) ?? null;

  const primaryFactualRecordSha256 =
    candidateMatMotionModel?.factualRecordSha256 ??
    clearedYoutubeReplacementAudit?.factualRecordSha256 ??
    previouslyUnboundMotionModel?.factualRecordSha256 ??
    verifiedReferenceAuditRecord?.factualRecordSha256 ??
    '';

  const sha256IntegrityVerified = isValidSha256Hex(primaryFactualRecordSha256);

  return Object.freeze({
    exerciseId: rawId,
    exerciseFoundInCatalog: catalogExerciseById.has(rawId),
    checkedAt: rawLedger.checkedAt,
    candidateMatMotionModel,
    previouslyUnboundMotionModel,
    clearedYoutubeReplacementAudit,
    verifiedReferenceAuditRecord,
    verifiedReferencePublicEntry,
    primaryFactualRecordSha256,
    sha256IntegrityVerified,
    anatomicalAccuracyAssumed: false as const,
    professionalReviewCount: 0 as const,
    verificationBoundaryNoticeKo:
      '전문의·외부 임상 승인 0건 · 해부학적 정밀성 가정 안 함',
  });
}

export function verifyExtendedMotionSourceLedgerIntegrity(): ExtendedMotionLedgerIntegrityReport {
  const errors: string[] = [];

  if (EXTENDED_CANDIDATE_MOTION_MODELS.length !== 8) {
    errors.push(`Expected 8 candidateMatMotionModels, found ${EXTENDED_CANDIDATE_MOTION_MODELS.length}`);
  }
  for (const model of EXTENDED_CANDIDATE_MOTION_MODELS) {
    if (!isValidSha256Hex(model.factualRecordSha256)) {
      errors.push(`Invalid SHA-256 on candidate model ${model.exerciseId}`);
    }
    if (model.sources.length < 2) {
      errors.push(`Candidate model ${model.exerciseId} requires at least 2 verified sources`);
    }
  }

  if (PREVIOUSLY_UNBOUND_MOTION_MODEL_AUDITS.length !== 9) {
    errors.push(
      `Expected 9 previouslyUnboundMotionModels, found ${PREVIOUSLY_UNBOUND_MOTION_MODEL_AUDITS.length}`,
    );
  }
  for (const item of PREVIOUSLY_UNBOUND_MOTION_MODEL_AUDITS) {
    if (!isValidSha256Hex(item.factualRecordSha256)) {
      errors.push(`Invalid SHA-256 on previously unbound model ${item.modelId}`);
    }
  }

  if (CLEARED_YOUTUBE_REPLACEMENT_AUDITS.length !== 5) {
    errors.push(
      `Expected 5 clearedYoutubeReplacementAudits, found ${CLEARED_YOUTUBE_REPLACEMENT_AUDITS.length}`,
    );
  }
  for (const item of CLEARED_YOUTUBE_REPLACEMENT_AUDITS) {
    if (!isValidSha256Hex(item.factualRecordSha256)) {
      errors.push(`Invalid SHA-256 on cleared YouTube replacement audit ${item.exerciseId}`);
    }
    if (item.replacementReferences.length === 0) {
      errors.push(`Missing replacementReferences on cleared YouTube audit ${item.exerciseId}`);
    }
  }

  if (VERIFIED_REFERENCE_AUDIT_RECORDS.length !== 30) {
    errors.push(
      `Expected 30 verifiedReferenceAuditRecords, found ${VERIFIED_REFERENCE_AUDIT_RECORDS.length}`,
    );
  }
  for (const ref of VERIFIED_REFERENCES) {
    const audit = verifiedRefAuditById.get(ref.id);
    if (!audit) {
      errors.push(`Missing verifiedReferenceAuditRecord for VERIFIED_REFERENCES id=${ref.id}`);
    } else if (!isValidSha256Hex(audit.factualRecordSha256)) {
      errors.push(`Invalid SHA-256 on verifiedReferenceAuditRecord ${ref.id}`);
    }
  }

  const officialSourceCheckedCount = VERIFIED_REFERENCE_AUDIT_RECORDS.filter(
    (r) => r.originalVerificationStatus === 'official-source-checked',
  ).length;
  const partialPlaybackCheckedCount = VERIFIED_REFERENCE_AUDIT_RECORDS.filter(
    (r) => r.originalVerificationStatus === 'partial-playback-checked',
  ).length;
  const koreanCandidateCount = VERIFIED_REFERENCE_AUDIT_RECORDS.filter(
    (r) => r.originalVerificationStatus === 'korean-candidate',
  ).length;

  return Object.freeze({
    valid: errors.length === 0,
    checkedAt: rawLedger.checkedAt,
    schemaVersion: rawLedger.schemaVersion,
    candidateMatMotionModelsCount: EXTENDED_CANDIDATE_MOTION_MODELS.length,
    previouslyUnboundMotionModelsCount: PREVIOUSLY_UNBOUND_MOTION_MODEL_AUDITS.length,
    clearedYoutubeReplacementAuditsCount: CLEARED_YOUTUBE_REPLACEMENT_AUDITS.length,
    totalAuditedReferences: VERIFIED_REFERENCE_AUDIT_RECORDS.length,
    officialSourceCheckedCount,
    partialPlaybackCheckedCount,
    koreanCandidateCount,
    unverifiedRemainderCount: 0 as const,
    professionalReviewCount: 0 as const,
    anatomicalAccuracyAssumed: false as const,
    allSha256HashesValid: errors.length === 0,
    errors: Object.freeze(errors),
  });
}
