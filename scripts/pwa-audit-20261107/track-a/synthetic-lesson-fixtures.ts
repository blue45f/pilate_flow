import { createHash } from 'node:crypto';
import { INITIAL_CLASS_GROUPS, INITIAL_EXERCISES } from '../../../src/data/pilatesCatalog';
import { getEquipmentFamilies } from '../../../src/data/equipmentCatalog';
import {
  ACCOUNT_STORAGE_PREFIX,
  ACTIVE_OWNER_KEY,
  GUEST_STORAGE_KEY,
  KNOWN_ACCOUNTS_KEY,
  PRESERVED_STORAGE_PREFIX,
} from '../../../src/lib/accountStorage';
import { RECOVERY_STORAGE_KEY } from '../../../src/lib/recoveryStorageGuard';
import { cloneAndFreezePlan } from '../../../src/types/datedSequencePlanning';
import type { DatedSequencePlanningData } from '../../../src/types/datedSequencePlanning';
import type { InstructorScheduleData } from '../../../src/types/instructorSchedule';
import type { InstructorStudyState } from '../../../src/types/instructorStudy';
import type {
  ApparatusType,
  AutoGenerateCriteria,
  ClassGroupProfile,
  ConditionTemplate,
  DifficultyLevel,
  PilatesExercise,
  PropType,
  ReformerBrand,
  SavedSequence,
  SequenceStep,
} from '../../../src/types/pilates';
import type { ClassHistoryLogWithSnapshot } from '../../../src/types/teachingHistorySnapshot';
import { canonicalRecoveryContent } from '../../../src/utils/backupRecoveryInspection';
import {
  BACKUP_ROLLBACK_STORAGE_KEY,
  buildTeachingProgramSnapshot,
} from '../../../src/utils/teachingHistorySnapshot';
import type { BackupRestoreRollbackPoint } from '../../../src/utils/teachingHistorySnapshot';

export const TRACK_A_INSTRUCTOR_ACCOUNT_ID = 'instructor-track-a';
export const TRACK_A_ACCOUNT_STORAGE_KEY = `${ACCOUNT_STORAGE_PREFIX}${TRACK_A_INSTRUCTOR_ACCOUNT_ID}`;
export const TRACK_A_PRESERVED_STORAGE_KEY = `${PRESERVED_STORAGE_PREFIX}snapshot-1`;

export const TRACK_A_STORAGE_KEYS = {
  recoveryStorageKey: RECOVERY_STORAGE_KEY,
  guestStorageKey: GUEST_STORAGE_KEY,
  accountStorageKey: TRACK_A_ACCOUNT_STORAGE_KEY,
  activeOwnerKey: ACTIVE_OWNER_KEY,
  knownAccountsKey: KNOWN_ACCOUNTS_KEY,
  preservedSnapshotKey: TRACK_A_PRESERVED_STORAGE_KEY,
  backupRollbackKey: BACKUP_ROLLBACK_STORAGE_KEY,
} as const;

export interface SyntheticPersistedStudioState {
  activeTab: 'workbench' | 'atlas' | 'binder' | 'history' | 'stage' | 'schedule';
  themeMode: 'system' | 'light' | 'dark';
  reformerBrand: ReformerBrand;
  ownedApparatus: ApparatusType[];
  ownedEquipment: string[];
  ownedProps: PropType[];
  mobilePreviewMode: boolean;
  activeSequenceId: string;
  activeTitle: string;
  activeSubtitle: string;
  activeApparatus: ApparatusType | 'mixed';
  /** Domain schema DifficultyLevel '1.5' corresponds to intermediate level. */
  activeLevel: DifficultyLevel;
  activeTargetMinutes: number;
  activeTargetGroupId: string;
  activeSteps: SequenceStep[];
  lastCriteria: AutoGenerateCriteria | null;
  draftCriteria: AutoGenerateCriteria | null;
  exercises: PilatesExercise[];
  savedSequences: SavedSequence[];
  classGroups: ClassGroupProfile[];
  historyLogs: ClassHistoryLogWithSnapshot[];
  conditionTemplates: ConditionTemplate[];
  instructorSchedule: InstructorScheduleData;
  instructorStudyState: InstructorStudyState;
  datedSequencePlanning: DatedSequencePlanningData;
}

export interface SyntheticPersistedEnvelope {
  version: 3;
  state: SyntheticPersistedStudioState;
}

export interface SyntheticStorageDataset {
  persistedEnvelope: SyntheticPersistedEnvelope;
  guestEnvelope: SyntheticPersistedEnvelope;
  accountEnvelope: SyntheticPersistedEnvelope;
  activeOwner: string;
  knownAccounts: string[];
  preservedSnapshot: {
    sourceKey: string;
    preservedAt: string;
    raw: string;
  };
  rollbackPoint: BackupRestoreRollbackPoint;
  rawByKey: Record<string, string>;
}

export interface StorageIntegrityDigest {
  overallSha256: string;
  keyCount: number;
  totalBytes: number;
  perKey: Record<
    string,
    {
      bytes: number;
      rawSha256: string;
      canonicalSha256: string;
    }
  >;
  domainSummary: {
    activeSequenceId: string;
    activeTargetMinutes: number;
    activeStepsCount: number;
    activeStepsTotalMinutes: number;
    customExercisesCount: number;
    totalExercisesCount: number;
    savedSequencesCount: number;
    classGroupsCount: number;
    historyLogsCount: number;
    conditionTemplatesCount: number;
    scheduledClassesCount: number;
    datedAssignmentsCount: number;
    bookmarkedExercisesCount: number;
  };
}

export function computeCanonicalSha256(value: unknown): string {
  const canonical = canonicalRecoveryContent(value);
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

export function computeRawSha256(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

export function buildSyntheticCustomExercises(): PilatesExercise[] {
  const customReformerLunge: PilatesExercise = {
    id: 'custom-track-a-reformer-lunge-pulse',
    nameKo: 'Track A 커스텀 리포머 이브즈 런지 & 고관절 신전 펄스',
    nameEn: 'Track A Custom Reformer Eve Lunge & Hip Extension Pulse',
    apparatus: 'reformer',
    requiredEquipment: ['reformer'],
    movementFamily: 'standing-lunge',
    props: ['mini-ball', 'yoga-block'],
    blockCategory: 'lower-body',
    spinalPlanes: ['neutral', 'extension'],
    bodyPosition: 'standing',
    level: '1.5',
    defaultDurationMin: 6,
    isUnilateral: true,
    springs: '1R',
    box: 'none',
    footbar: 'high',
    headrest: 'flat',
    targetMuscles: ['중둔근', '대둔근', '장요근', '대퇴사두근'],
    breathPattern: '들쉬며 뒷다리 고관절 길게 신전 → 내쉬며 앞다리 뒤꿈치로 바닥 밀어 복귀',
    cues: [
      '풋바 위 양손은 가볍게 거치하고 요가 블록으로 골반 수평 정렬을 먼저 확인합니다.',
      '캐리지가 뒤로 밀릴 때 허리가 과신전되지 않도록 아랫배를 등 쪽으로 당겨 유지하세요.',
      '하단 지점에서 3회 짧은 펄스로 앞쪽 중둔근과 뒤쪽 장요근 신장을 동시에 유도합니다.',
    ],
    precautions: '무릎 통증이 있는 경우 런지 깊이를 50%로 줄이고 풋바 지지 비중을 높입니다.',
    layers: {
      easy: '1R 1B 세팅에서 반가동범위 런지 6회 진행',
      standard: '1R 세팅에서 풀 런지 8회 + 하단 3카운트 펄스',
      hard: '1B 세팅에서 양손 가슴 앞 교차 후 무지지 밸런스 런지',
    },
    youtube: {
      videoId: 'trackALunge01',
      channelName: 'Flow Atelier Track A Audit Lab',
      videoTitle: 'Reformer Eve Lunge & Pelvic Control Progression',
      startSec: 30,
      endSec: 210,
      url: 'https://www.youtube.com/watch?v=trackALunge01&t=30s',
      note: 'Track A 합성 커스텀 리포머 하체 단측성 동작',
      region: 'kr',
    },
    favoriteTag: 'signature',
    tempo: 'moderate-flow',
    isCustom: true,
    createdAt: '2026-11-01T08:30:00.000Z',
  };

  const humanCreatedThoracicSpiral: PilatesExercise & Record<string, unknown> = {
    id: 'human-draft-track-a-thoracic-spiral',
    nameKo: 'Track A 강사 창작 흉추 스파이럴 스트랩 오프너',
    nameEn: 'Track A Instructor Created Thoracic Spiral Strap Opener',
    apparatus: 'reformer',
    requiredEquipment: ['reformer'],
    movementFamily: 'seated-rowing-rotation',
    props: ['magic-circle'],
    blockCategory: 'upper-body',
    spinalPlanes: ['rotation', 'extension'],
    bodyPosition: 'seated',
    level: '1.5',
    defaultDurationMin: 5,
    isUnilateral: true,
    springs: '1B',
    box: 'short-box',
    footbar: 'down',
    headrest: 'flat',
    targetMuscles: ['외복사근', '내복사근', '능형근', '하부승모근'],
    breathPattern: '들쉬며 척추 축 신장 → 내쉬며 흉추 4번부터 나선형 회전',
    cues: [
      '숏박스 위 좌골 두 점을 균등하게 뿌리내리고 써클링으로 견갑골 간격을 유지합니다.',
      '스트랩을 당길 때 팔의 힘이 아닌 갈비뼈 회전으로 나선형 움직임을 만드세요.',
    ],
    precautions: '요추 과회전을 방지하기 위해 골반은 정면 12시 방향에 고정합니다.',
    layers: {
      easy: '양반다리 착석 후 가벼운 1Y 스프링으로 45도 회전',
      standard: '숏박스 착석 후 1B 스프링 스파이럴 로테이션 8회',
      hard: '회전 정점에서 팔 뻗기(Hug-a-Tree 변형) 3초 유지',
    },
    youtube: {
      videoId: 'trackASpiral2',
      channelName: 'Flow Atelier Human Draft Archive',
      videoTitle: 'Thoracic Spiral Strap Opener Studio Note',
      startSec: 15,
      endSec: 165,
      url: 'https://www.youtube.com/watch?v=trackASpiral2&t=15s',
      note: '강사 직접 창작 동작 초안 스냅샷 연동',
      region: 'kr',
    },
    favoriteTag: 'rehab-posture',
    tempo: 'slow-precise',
    isCustom: true,
    createdAt: '2026-11-02T10:15:00.000Z',
    capturedAt: '2026-11-05T14:20:00.000Z',
    sourceOrigin: 'human-created',
    humanDraftId: 'hdraft-track-a-01',
    humanDraftRevision: 2,
    ideaLineSnapshot: '숏박스 착석 상태에서 한 손 스트랩 + 반대손 써클링 지지로 흉추 회전 가동성 극대화',
    feelLogsSnapshot: [
      {
        id: 'feel-track-a-01',
        recordedAt: '2026-11-03T11:00:00.000Z',
        feelNoteKo: '전방경사 체형 회원에게 골반 고정 큐잉과 함께 적용 시 흉추 회전 감각이 매우 명확함',
        perceivedIntensity: 'moderate',
        cautionFeelKo: '승모근이 올라가지 않도록 날개뼈 하각 고정 큐 필수',
        evaluationBasis: 'subjective-instructor-feel',
        objectiveEfficacyClaimed: false,
        safetyGuaranteed: false,
        expertVerified: false,
      },
    ],
    modificationLogsSnapshot: [
      {
        id: 'mod-track-a-01',
        recordedAt: '2026-11-04T09:45:00.000Z',
        modificationPointKo: '1R 스프링에서 어깨 긴장이 관찰되어 1B 스프링으로 하향 조정',
        setupOrSpringChangeKo: '1R -> 1B (파랑 1개)',
        cueChangeKo: '손잡이를 당기지 말고 겨드랑이 아래로 스트랩을 미끄러뜨리듯 안내',
        appliedToRevision: 2,
      },
    ],
    photoReferencesSnapshot: [
      {
        id: 'photo-track-a-01',
        localRefUri:
          'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="%23234c3f"/></svg>',
        captionKo: '숏박스 착석 및 스트랩 대각선 정렬 참고 스케치',
        angleTag: 'setup',
        capturedAt: '2026-11-04T09:50:00.000Z',
        externalAiUploadAllowed: false,
      },
    ],
    safetyBoundarySnapshot: {
      originType: 'instructor-created-draft',
      evaluationBasis: 'subjective-instructor-feel',
      aiSafetyGuaranteed: false,
      objectiveEfficacyClaimed: false,
      expertVerified: false,
      disclaimerKo:
        '강사 개인의 수업 연구 메모이며 의학적 안전성이나 객관적 교정 효과를 보증하지 않습니다.',
    },
  };

  return [customReformerLunge, humanCreatedThoracicSpiral];
}

export function buildSyntheticActiveSteps(): SequenceStep[] {
  // 10 steps summing to exactly 50 minutes (48m exercises + 2m rest)
  return [
    {
      stepId: 'step-track-a-01',
      order: 1,
      kind: 'exercise',
      blockCategory: 'warmup',
      classSection: 'preparation',
      exerciseId: 'ex-warmup-01',
      durationMin: 4,
      selectedLayer: 'standard',
      customSpringOverride: '2R 1B',
      explanationSec: 30,
      transitionSec: 15,
      repetitions: 8,
      sets: 2,
      sideMode: 'together',
      locked: true,
      instructorNote: '오프닝 흉곽 호흡과 골반 중립 세팅 · 미니볼 내전근 30% 텐션 유지',
      timeEstimate: {
        version: 1,
        repetitions: 8,
        sets: 2,
        sides: 1,
        secondsPerRep: 8,
        holdSecPerRep: 2,
        breathsPerSet: 2,
        secondsPerBreath: 5,
        restBetweenSetsSec: 15,
        sideSwitchSec: 0,
        explanationSec: 30,
        transitionSec: 15,
      },
      blockInstanceId: 'blk-inst-track-a-warmup',
      sourceBlockId: 'blk-src-track-a-opening',
      sourceBlockVersion: 2,
      sourceBlockTitle: '리포머 오프닝 호흡 & 풋워크 블록',
      blockInstanceDetached: false,
    },
    {
      stepId: 'step-track-a-02',
      order: 2,
      kind: 'exercise',
      blockCategory: 'footwork',
      classSection: 'preparation',
      exerciseId: 'ex-footwork-01',
      durationMin: 6,
      selectedLayer: 'standard',
      customSpringOverride: '2R 1B',
      explanationSec: 25,
      transitionSec: 20,
      repetitions: 10,
      sets: 3,
      sideMode: 'together',
      locked: true,
      instructorNote: '힐-아치-필라테스V-런닝 연속 흐름 · 무릎 정렬 집중',
      blockInstanceId: 'blk-inst-track-a-warmup',
      sourceBlockId: 'blk-src-track-a-opening',
      sourceBlockVersion: 2,
      sourceBlockTitle: '리포머 오프닝 호흡 & 풋워크 블록',
      blockInstanceDetached: false,
    },
    {
      stepId: 'step-track-a-03',
      order: 3,
      kind: 'exercise',
      blockCategory: 'bridging',
      classSection: 'main',
      exerciseId: 'ex-bridging-01',
      durationMin: 5,
      selectedLayer: 'standard',
      customSpringOverride: '2R',
      explanationSec: 20,
      transitionSec: 20,
      repetitions: 8,
      sets: 2,
      sideMode: 'together',
      instructorNote: '요추부터 흉추까지 한 마디씩 분절하며 캐리지 흔들림 0cm 유지',
    },
    {
      stepId: 'step-track-a-04',
      order: 4,
      kind: 'exercise',
      blockCategory: 'core',
      classSection: 'main',
      exerciseId: 'ex-core-01',
      durationMin: 6,
      selectedLayer: 'hard',
      customSpringOverride: '1R 1B',
      explanationSec: 25,
      transitionSec: 20,
      repetitions: 10,
      sets: 2,
      sideMode: 'together',
      instructorNote: '헌드레드 호흡 펌핑 시 경추 과긴장 체크 (필요 시 헤드레스트 업)',
    },
    {
      stepId: 'step-track-a-05',
      order: 5,
      kind: 'rest',
      blockCategory: 'core',
      classSection: 'main',
      exerciseId: '',
      durationMin: 2,
      selectedLayer: 'standard',
      instructorNote: '수분 보충 및 숏박스 세팅 전환 휴식 (2분)',
    },
    {
      stepId: 'step-track-a-06',
      order: 6,
      kind: 'exercise',
      blockCategory: 'upper-body',
      classSection: 'main',
      exerciseId: 'human-draft-track-a-thoracic-spiral',
      durationMin: 5,
      selectedLayer: 'standard',
      customSpringOverride: '1B',
      explanationSec: 30,
      transitionSec: 25,
      repetitions: 8,
      sets: 2,
      sideMode: 'left-then-right',
      humanDraftId: 'hdraft-track-a-01',
      humanDraftRevision: 2,
      instructorNote: '강사 창작 흉추 스파이럴 · 좌측 타이트한 회원님 가동범위 먼저 체크',
    },
    {
      stepId: 'step-track-a-07',
      order: 7,
      kind: 'exercise',
      blockCategory: 'lower-body',
      classSection: 'main',
      exerciseId: 'custom-track-a-reformer-lunge-pulse',
      durationMin: 6,
      selectedLayer: 'standard',
      customSpringOverride: '1R',
      explanationSec: 30,
      transitionSec: 25,
      repetitions: 8,
      sets: 2,
      sideMode: 'left-then-right',
      instructorNote: '커스텀 이브즈 런지 · 하단 3카운트 펄스 시 골반 정면 유지',
    },
    {
      stepId: 'step-track-a-08',
      order: 8,
      kind: 'exercise',
      blockCategory: 'plank',
      classSection: 'main',
      exerciseId: 'ex-plank-01',
      durationMin: 5,
      selectedLayer: 'standard',
      customSpringOverride: '1R 1B',
      explanationSec: 20,
      transitionSec: 20,
      repetitions: 6,
      sets: 2,
      sideMode: 'together',
      instructorNote: '롱 스트레치 전거근 푸시 유지 · 날개뼈 익상 방지',
    },
    {
      stepId: 'step-track-a-09',
      order: 9,
      kind: 'exercise',
      blockCategory: 'feet-in-straps',
      classSection: 'cooldown',
      exerciseId: 'ex-straps-01',
      durationMin: 6,
      selectedLayer: 'standard',
      customSpringOverride: '1R 1B',
      explanationSec: 20,
      transitionSec: 25,
      repetitions: 8,
      sets: 2,
      sideMode: 'together',
      instructorNote: '프로그 & 레그 써클 · 천골이 매트에서 뜨지 않는 범위까지만 하강',
    },
    {
      stepId: 'step-track-a-10',
      order: 10,
      kind: 'exercise',
      blockCategory: 'cooldown',
      classSection: 'cooldown',
      exerciseId: 'ex-cooldown-01',
      durationMin: 5,
      selectedLayer: 'easy',
      customSpringOverride: '1B',
      explanationSec: 15,
      transitionSec: 15,
      repetitions: 6,
      sets: 1,
      sideMode: 'left-then-right',
      instructorNote: '머메이드 측굴 호흡 정리 및 스탠딩 롤다운 마무리',
    },
  ];
}

export function buildSyntheticStudioState(): SyntheticPersistedStudioState {
  const customExercises = buildSyntheticCustomExercises();
  const usedIds = new Set(customExercises.map((item) => item.id));
  const exercises: PilatesExercise[] = [
    ...customExercises,
    ...INITIAL_EXERCISES.filter((item) => !usedIds.has(item.id)),
  ];

  const ownedEquipment = [
    'reformer',
    'cadillac',
    'chair',
    'ladder-barrel',
    'spine-corrector',
    'mat',
  ];
  const ownedApparatus = getEquipmentFamilies(ownedEquipment);
  const ownedProps: PropType[] = [
    'mini-ball',
    'magic-circle',
    'foam-roller',
    'theraband',
    'loop-band',
    'yoga-block',
  ];

  const primaryCriteria: AutoGenerateCriteria = {
    apparatus: 'reformer',
    ownedApparatus,
    availableEquipment: ownedEquipment as AutoGenerateCriteria['availableEquipment'],
    planningGoals: ['pelvic-control', 'trunk-hip-coordination', 'mobility'],
    instructorObservations: ['anterior-pelvic-tilt'],
    level: '1.5',
    focusPreset: 'core-sculpt',
    preferredProps: ['mini-ball', 'magic-circle', 'yoga-block'],
    excludeDaysWindow: 7,
    targetGroupId: 'group-track-a-reformer-int',
    targetMinutes: 50,
    restMinutes: 2,
    defaultLayer: 'standard',
  };

  const activeSteps = buildSyntheticActiveSteps();

  const savedSequenceMain: SavedSequence = {
    id: 'seq-track-a-saved-reformer-50',
    title: '리포머 중급(Lv 1.5) 50분 코어 & 고관절 정렬 마스터',
    subtitle: 'Track A 정기 그룹반 표준 50분 시퀀스',
    apparatus: 'reformer',
    level: '1.5',
    focusTags: ['코어 제어', '고관절 정렬', '흉추 가동성'],
    targetMinutes: 50,
    steps: structuredClone(activeSteps),
    createdAt: '2026-11-01T09:00:00.000Z',
    updatedAt: '2026-11-05T18:00:00.000Z',
    lastTaughtAt: '2026-11-05T19:00:00.000Z',
    taughtCount: 3,
    criteriaSnapshot: structuredClone(primaryCriteria),
  };

  const savedSequenceRecovered: SavedSequence = {
    id: 'seq-track-a-saved-recovered-draft',
    title: '오전 프라이빗 재활 케어 50분 (이전 작업공간 초안 보존)',
    subtitle: '척추 분절 및 견갑 안정화 중심',
    apparatus: 'mixed',
    level: '1.0',
    focusTags: ['정렬·가동성', '초안 복원'],
    targetMinutes: 50,
    steps: [
      {
        stepId: 'step-rec-01',
        order: 1,
        kind: 'exercise',
        blockCategory: 'warmup',
        exerciseId: 'ex-warmup-02',
        durationMin: 10,
        selectedLayer: 'easy',
        repetitions: 6,
        sets: 2,
        sideMode: 'together',
      },
      {
        stepId: 'step-rec-02',
        order: 2,
        kind: 'exercise',
        blockCategory: 'footwork',
        exerciseId: 'ex-footwork-01',
        durationMin: 15,
        selectedLayer: 'standard',
        repetitions: 10,
        sets: 3,
        sideMode: 'together',
      },
      {
        stepId: 'step-rec-03',
        order: 3,
        kind: 'exercise',
        blockCategory: 'bridging',
        exerciseId: 'ex-bridging-01',
        durationMin: 15,
        selectedLayer: 'easy',
        repetitions: 8,
        sets: 2,
        sideMode: 'together',
      },
      {
        stepId: 'step-rec-04',
        order: 4,
        kind: 'exercise',
        blockCategory: 'cooldown',
        exerciseId: 'ex-cooldown-01',
        durationMin: 10,
        selectedLayer: 'easy',
        repetitions: 6,
        sets: 1,
        sideMode: 'left-then-right',
      },
    ],
    createdAt: '2026-10-28T07:00:00.000Z',
    updatedAt: '2026-11-03T12:00:00.000Z',
    taughtCount: 1,
    recoveredDraftOrigin: {
      format: 'persisted-workspace-v3',
      sourceSequenceId: 'draft-legacy-oct28',
      activeTargetGroupId: 'group-track-a-private-rehab',
      draftCriteria: structuredClone(primaryCriteria),
      lastCriteria: null,
      criteriaPresence: { draft: true, last: false },
      timestamps: 'unrecorded',
    },
  };

  const classGroups: ClassGroupProfile[] = [
    {
      id: 'group-track-a-reformer-int',
      name: '화·목 저녁 7시 리포머 중급반 (Track A)',
      type: 'group',
      defaultLevel: '1.5',
      scheduleLabel: '매주 화·목 19:00–19:50',
      notes: '직장인 6:1 그룹 · 라운드숄더 및 골반 전방경사 케어 선호, 미니볼·써클링 활용도 높음',
      planningPreferences: {
        ageBand: '18-39',
        experience: 'experienced',
        mixedLevelNotes: '플랭크 구간에서 손목 부담 회원 1명에게 전완 지지 옵션 안내',
        conditions: {
          apparatus: 'reformer',
          ownedApparatus,
          availableEquipment: ownedEquipment as AutoGenerateCriteria['availableEquipment'],
          planningGoals: ['pelvic-control', 'trunk-hip-coordination', 'mobility'],
          level: '1.5',
          focusPreset: 'core-sculpt',
          preferredProps: ['mini-ball', 'magic-circle', 'yoga-block'],
          excludeDaysWindow: 7,
          targetMinutes: 50,
          restMinutes: 2,
          defaultLayer: 'standard',
        },
      },
    },
    {
      id: 'group-track-a-private-rehab',
      name: '수·금 오전 10시 1:1 체형교정 프라이빗',
      type: 'private',
      defaultLevel: '1.0',
      scheduleLabel: '매주 수·금 10:00–10:50',
      notes: '산후 복귀 6개월차 회원님 · 복직근이개 안전 범위 내 코어 인지 및 고관절 감압 집중',
      planningPreferences: {
        ageBand: '18-39',
        experience: 'some',
        mixedLevelNotes: '경추 굴곡 동작 시 헤드레스트 높이 및 미니볼 지지 필수',
      },
    },
    ...INITIAL_CLASS_GROUPS,
  ];

  const taughtAt1 = '2026-11-05T19:00:00.000Z';
  const programSnapshot1 = buildTeachingProgramSnapshot({
    sequenceId: savedSequenceMain.id,
    sequenceTitle: savedSequenceMain.title,
    sequenceSubtitle: savedSequenceMain.subtitle,
    sourceKind: 'saved-sequence',
    sourceSequenceVersion: 1,
    sourceSequenceUpdatedAt: savedSequenceMain.updatedAt,
    apparatus: savedSequenceMain.apparatus,
    level: savedSequenceMain.level,
    targetMinutes: savedSequenceMain.targetMinutes,
    taughtAt: taughtAt1,
    capturedAt: '2026-11-05T19:52:00.000Z',
    groupId: 'group-track-a-reformer-int',
    steps: activeSteps,
    exercises,
    actualDurationSec: 3000,
    actualRestDurationSec: 120,
    criteriaSnapshot: primaryCriteria,
  });

  const historyLog1: ClassHistoryLogWithSnapshot = {
    id: 'log-track-a-completed-01',
    sequenceId: savedSequenceMain.id,
    sequenceTitle: savedSequenceMain.title,
    groupId: 'group-track-a-reformer-int',
    groupName: '화·목 저녁 7시 리포머 중급반 (Track A)',
    taughtAt: taughtAt1,
    apparatus: 'reformer',
    level: '1.5',
    exerciseIds: activeSteps
      .filter((step) => step.kind !== 'rest')
      .map((step) => step.exerciseId),
    rating: 5,
    intensity: 'moderate',
    instructorReflection:
      '풋워크에서 미니볼 내전근 큐잉 반응이 좋았고, 흉추 스파이럴 동작에서 좌우 가동범위 대칭이 크게 개선됨. 다음 수업에는 이브즈 런지 펄스 횟수를 4회로 증량 예정.',
    actualDurationSec: 3000,
    actualRestDurationSec: 120,
    stepsSnapshot: structuredClone(activeSteps),
    criteriaSnapshot: structuredClone(primaryCriteria),
    programSnapshot: programSnapshot1,
  };

  const conditionTemplates: ConditionTemplate[] = [
    {
      id: 'tpl-track-a-core-50',
      name: 'Track A 리포머 중급 코어 & 골반 제어 50분 템플릿',
      criteria: structuredClone(primaryCriteria),
      createdAt: '2026-11-01T09:10:00.000Z',
    },
    {
      id: 'tpl-track-a-mobility-50',
      name: 'Track A 직장인 저녁 흉추·고관절 릴리즈 50분 템플릿',
      criteria: {
        ...structuredClone(primaryCriteria),
        level: '1.0',
        focusPreset: 'mobility-rehab',
        preferredProps: ['foam-roller', 'mini-ball'],
      },
      createdAt: '2026-11-02T11:30:00.000Z',
    },
  ];

  const instructorSchedule: InstructorScheduleData = {
    locations: [
      {
        id: 'loc-track-a-main-studio',
        alias: '플로우 아틀리에 한남 본점 A룸',
        equipmentIds: ['reformer', 'cadillac', 'chair', 'ladder-barrel', 'spine-corrector', 'mat'],
        propIds: ['mini-ball', 'magic-circle', 'foam-roller', 'theraband', 'loop-band', 'yoga-block'],
        notes: '밸런스드 바디 리포머 6대 완비 · 채광 좋은 메인 그룹 룸',
      },
    ],
    classes: [
      {
        id: 'cls-track-a-tue-thu-1900',
        title: '화·목 저녁 리포머 중급 그룹',
        participantAlias: '화목 저녁 7시반 (6명)',
        locationId: 'loc-track-a-main-studio',
        startDate: '2026-11-03',
        startTime: '19:00',
        endTime: '19:50',
        recurrence: 'weekly',
        weekdays: [2, 4],
        untilDate: '2026-12-31',
        linkSavedSequenceId: savedSequenceMain.id,
        notes: '정기 50분 리포머 중급 시퀀스 배정',
      },
      {
        id: 'cls-track-a-sat-1100',
        title: '토요 오전 프라이빗 재활 집중',
        participantAlias: '김OO 회원님 (1:1)',
        locationId: 'loc-track-a-main-studio',
        startDate: '2026-11-14',
        startTime: '11:00',
        endTime: '11:50',
        recurrence: 'once',
        weekdays: [6],
        linkSavedSequenceId: savedSequenceRecovered.id,
        notes: '산후 골반 안정화 및 흉곽 호흡 리셋',
      },
    ],
    exceptions: [
      {
        id: 'exc-track-a-resched-01',
        kind: 'reschedule',
        classId: 'cls-track-a-tue-thu-1900',
        originalDate: '2026-11-19',
        date: '2026-11-20',
        startTime: '19:30',
        endTime: '20:20',
        locationId: 'loc-track-a-main-studio',
        reason: '강사 세미나 참석으로 금요일 저녁 보강 이동',
      },
    ],
  };

  const instructorStudyState: InstructorStudyState = {
    bookmarkedExerciseIds: [
      'ex-warmup-01',
      'ex-footwork-01',
      'custom-track-a-reformer-lunge-pulse',
      'human-draft-track-a-thoracic-spiral',
    ],
    rehearsalCueHidden: false,
    completedTutorialTaskIds: [
      'onboarding:create-sequence',
      'onboarding:customize-step-timing',
      'onboarding:log-teaching-history',
    ],
  };

  const priorVersionSequence: SavedSequence = {
    ...structuredClone(savedSequenceMain),
    updatedAt: '2026-11-04T15:00:00.000Z',
    subtitle: 'Track A 정기 그룹반 초기 초안 (v1)',
  };

  const datedSequencePlanning: DatedSequencePlanningData = cloneAndFreezePlan({
    assignments: [
      {
        id: 'dplan-track-a-20261110',
        classId: 'cls-track-a-tue-thu-1900',
        originalDate: '2026-11-10',
        state: 'prepared',
        sourceSequenceId: savedSequenceMain.id,
        sourceSequenceUpdatedAt: savedSequenceMain.updatedAt,
        sequenceSnapshot: structuredClone(savedSequenceMain),
        occurrenceSnapshot: {
          date: '2026-11-10',
          startTime: '19:00',
          endTime: '19:50',
          locationId: 'loc-track-a-main-studio',
        },
        createdAt: '2026-11-04T15:05:00.000Z',
        updatedAt: '2026-11-06T09:00:00.000Z',
        priorVersions: [
          {
            id: 'dplan-track-a-20261110',
            classId: 'cls-track-a-tue-thu-1900',
            originalDate: '2026-11-10',
            state: 'draft',
            sourceSequenceId: priorVersionSequence.id,
            sourceSequenceUpdatedAt: priorVersionSequence.updatedAt,
            sequenceSnapshot: priorVersionSequence,
            occurrenceSnapshot: {
              date: '2026-11-10',
              startTime: '19:00',
              endTime: '19:50',
              locationId: 'loc-track-a-main-studio',
            },
            createdAt: '2026-11-04T15:05:00.000Z',
            updatedAt: '2026-11-04T15:05:00.000Z',
          },
        ],
      },
      {
        id: 'dplan-track-a-20261112',
        classId: 'cls-track-a-tue-thu-1900',
        originalDate: '2026-11-12',
        state: 'draft',
        sourceSequenceId: savedSequenceMain.id,
        sourceSequenceUpdatedAt: savedSequenceMain.updatedAt,
        sequenceSnapshot: structuredClone(savedSequenceMain),
        occurrenceSnapshot: {
          date: '2026-11-12',
          startTime: '19:00',
          endTime: '19:50',
          locationId: 'loc-track-a-main-studio',
        },
        createdAt: '2026-11-06T09:15:00.000Z',
        updatedAt: '2026-11-06T09:15:00.000Z',
      },
    ],
  });

  return {
    activeTab: 'workbench',
    themeMode: 'light',
    reformerBrand: 'balanced-body',
    ownedApparatus,
    ownedEquipment,
    ownedProps,
    mobilePreviewMode: false,
    activeSequenceId: 'seq-track-a-active-50m',
    activeTitle: '리포머 중급(Lv 1.5) 50분 코어 & 고관절 정렬 마스터',
    activeSubtitle: 'Track A 합성 수업 초안 · 흉곽 호흡-풋워크-스트랩-풀바디 통합',
    activeApparatus: 'reformer',
    activeLevel: '1.5',
    activeTargetMinutes: 50,
    activeTargetGroupId: 'group-track-a-reformer-int',
    activeSteps,
    lastCriteria: structuredClone(primaryCriteria),
    draftCriteria: structuredClone(primaryCriteria),
    exercises,
    savedSequences: [savedSequenceMain, savedSequenceRecovered],
    classGroups,
    historyLogs: [historyLog1],
    conditionTemplates,
    instructorSchedule,
    instructorStudyState,
    datedSequencePlanning,
  };
}

export function buildSyntheticStorageDataset(): SyntheticStorageDataset {
  const studioState = buildSyntheticStudioState();
  const persistedEnvelope: SyntheticPersistedEnvelope = {
    version: 3,
    state: studioState,
  };

  const guestState: SyntheticPersistedStudioState = {
    ...structuredClone(studioState),
    activeTitle: '게스트 체험용 리포머 50분 초안 (보존 슬롯)',
    activeSequenceId: 'seq-track-a-guest-50m',
  };
  const guestEnvelope: SyntheticPersistedEnvelope = {
    version: 3,
    state: guestState,
  };

  const accountEnvelope: SyntheticPersistedEnvelope = structuredClone(persistedEnvelope);

  const preservedSnapshot = {
    sourceKey: GUEST_STORAGE_KEY,
    preservedAt: '2026-11-06T08:00:00.000Z',
    raw: JSON.stringify(guestEnvelope),
  };

  const preRestoreState: BackupRestoreRollbackPoint['preRestoreState'] = {
    exercises: structuredClone(studioState.exercises),
    savedSequences: structuredClone(studioState.savedSequences),
    classGroups: structuredClone(studioState.classGroups),
    historyLogs: structuredClone(studioState.historyLogs),
    conditionTemplates: structuredClone(studioState.conditionTemplates),
    instructorSchedule: structuredClone(studioState.instructorSchedule),
    instructorStudyState: structuredClone(studioState.instructorStudyState),
    datedSequencePlanning: structuredClone(studioState.datedSequencePlanning),
    ownedApparatus: [...studioState.ownedApparatus],
    ownedEquipment: [...studioState.ownedEquipment],
    ownedProps: [...studioState.ownedProps],
    lastCriteria: structuredClone(studioState.lastCriteria),
    draftCriteria: structuredClone(studioState.draftCriteria),
  };

  const persistedRaw = JSON.stringify(persistedEnvelope);
  const rollbackPoint: BackupRestoreRollbackPoint = {
    version: 1,
    ownerScope: TRACK_A_INSTRUCTOR_ACCOUNT_ID,
    id: 'rollback-track-a-01',
    capturedAt: '2026-11-06T10:00:00.000Z',
    addedCount: 2,
    postRestoreStateFingerprint: computeCanonicalSha256(preRestoreState),
    postRestoreStorageFingerprint: computeCanonicalSha256(persistedEnvelope),
    preRestoreState,
  };

  const activeOwner = TRACK_A_INSTRUCTOR_ACCOUNT_ID;
  const knownAccounts = [TRACK_A_INSTRUCTOR_ACCOUNT_ID];

  const rawByKey: Record<string, string> = {
    [RECOVERY_STORAGE_KEY]: persistedRaw,
    [GUEST_STORAGE_KEY]: JSON.stringify(guestEnvelope),
    [TRACK_A_ACCOUNT_STORAGE_KEY]: JSON.stringify(accountEnvelope),
    [ACTIVE_OWNER_KEY]: activeOwner,
    [KNOWN_ACCOUNTS_KEY]: JSON.stringify(knownAccounts),
    [TRACK_A_PRESERVED_STORAGE_KEY]: JSON.stringify(preservedSnapshot),
    [BACKUP_ROLLBACK_STORAGE_KEY]: JSON.stringify(rollbackPoint),
  };

  return {
    persistedEnvelope,
    guestEnvelope,
    accountEnvelope,
    activeOwner,
    knownAccounts,
    preservedSnapshot,
    rollbackPoint,
    rawByKey,
  };
}

export function populateSyntheticStorage(
  storage: Pick<Storage, 'setItem' | 'clear'>,
  dataset: SyntheticStorageDataset = buildSyntheticStorageDataset(),
): SyntheticStorageDataset {
  storage.clear();
  for (const [key, value] of Object.entries(dataset.rawByKey)) {
    storage.setItem(key, value);
  }
  return dataset;
}

export function captureStorageSnapshotDigest(
  storage: Pick<Storage, 'getItem'>,
  keys: readonly string[] = Object.values(TRACK_A_STORAGE_KEYS),
): StorageIntegrityDigest {
  const perKey: StorageIntegrityDigest['perKey'] = {};
  let totalBytes = 0;

  for (const key of [...keys].sort()) {
    const raw = storage.getItem(key);
    if (raw === null) {
      throw new Error(`Expected synthetic storage key missing: ${key}`);
    }
    const bytes = new TextEncoder().encode(raw).byteLength;
    totalBytes += bytes;
    let parsed: unknown = raw;
    if (key !== ACTIVE_OWNER_KEY) {
      parsed = JSON.parse(raw);
    }
    perKey[key] = {
      bytes,
      rawSha256: computeRawSha256(raw),
      canonicalSha256: computeCanonicalSha256(parsed),
    };
  }

  const mainRaw = storage.getItem(RECOVERY_STORAGE_KEY);
  if (!mainRaw) {
    throw new Error(`Missing main recovery storage key: ${RECOVERY_STORAGE_KEY}`);
  }
  const mainParsed = JSON.parse(mainRaw) as SyntheticPersistedEnvelope;
  const st = mainParsed.state;
  const activeStepsTotalMinutes = st.activeSteps.reduce((sum, step) => sum + step.durationMin, 0);
  const customExercisesCount = st.exercises.filter((ex) => ex.isCustom).length;

  const domainSummary: StorageIntegrityDigest['domainSummary'] = {
    activeSequenceId: st.activeSequenceId,
    activeTargetMinutes: st.activeTargetMinutes,
    activeStepsCount: st.activeSteps.length,
    activeStepsTotalMinutes,
    customExercisesCount,
    totalExercisesCount: st.exercises.length,
    savedSequencesCount: st.savedSequences.length,
    classGroupsCount: st.classGroups.length,
    historyLogsCount: st.historyLogs.length,
    conditionTemplatesCount: st.conditionTemplates.length,
    scheduledClassesCount: st.instructorSchedule.classes.length,
    datedAssignmentsCount: st.datedSequencePlanning.assignments.length,
    bookmarkedExercisesCount: st.instructorStudyState.bookmarkedExerciseIds.length,
  };

  const overallSha256 = computeCanonicalSha256({
    perKey: Object.fromEntries(
      Object.entries(perKey).map(([k, v]) => [k, v.canonicalSha256]),
    ),
    domainSummary,
  });

  return {
    overallSha256,
    keyCount: Object.keys(perKey).length,
    totalBytes,
    perKey,
    domainSummary,
  };
}

export function verifyStorageSnapshotIntegrity(
  before: StorageIntegrityDigest,
  after: StorageIntegrityDigest,
): {
  intact: boolean;
  zeroByteLoss: boolean;
  overallSha256Match: boolean;
  mismatchedKeys: string[];
} {
  const mismatchedKeys: string[] = [];
  const allKeys = new Set([...Object.keys(before.perKey), ...Object.keys(after.perKey)]);
  for (const key of allKeys) {
    const prev = before.perKey[key];
    const next = after.perKey[key];
    if (!prev || !next || prev.canonicalSha256 !== next.canonicalSha256) {
      mismatchedKeys.push(key);
    }
  }
  const overallSha256Match = before.overallSha256 === after.overallSha256;
  const zeroByteLoss = after.totalBytes >= before.totalBytes && mismatchedKeys.length === 0;
  return {
    intact: overallSha256Match && mismatchedKeys.length === 0,
    zeroByteLoss,
    overallSha256Match,
    mismatchedKeys,
  };
}
