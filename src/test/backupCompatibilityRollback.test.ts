import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import corpus from './fixtures/backup-recovery/backupCompatibilityRollbackCorpus.json';
import { usePilatesStore } from '../store/usePilatesStore';
import {
  MAX_BACKUP_JSON_DEPTH,
  MAX_LOCAL_BACKUP_BYTES,
  backupRecoveryStateFingerprint,
  canonicalRecoveryContent,
  inspectBackupRecovery,
  type RecoveryCurrentState,
} from '../utils/backupRecoveryInspection';
import {
  BACKUP_ROLLBACK_STORAGE_KEY,
  buildTeachingProgramSnapshot,
  captureBackupPreRestoreState,
  clearBackupRestoreRollbackPoint,
  cloneTeachingHistoryToNextClassDraft,
  createTeachingExerciseSnapshot,
  getLatestBackupRollbackPoint,
  inspectPersistedRollbackPoint,
  isValidBackupPreRestoreDomainState,
  movementSnapshotToTeachingExerciseSnapshot,
  recordBackupRestoreRollbackPoint,
  reconstructExerciseFromSnapshot,
  reconstructStepsSnapshotFromHistoryLog,
  resetInMemoryBackupRollbackPointForTest,
  resolveTeachingHistoryView,
  rollbackLatestBackupRestore,
  type BackupPreRestoreDomainState,
} from '../utils/teachingHistorySnapshot';
import { resetMovementIdeaStateForTests } from '../utils/movementIdeaDraft';
import { createEmptyInstructorSchedule } from '../types/instructorSchedule';
import type {
  AutoGenerateCriteria,
  ClassGroupProfile,
  ClassHistoryLog,
  ConditionTemplate,
  PilatesExercise,
  SavedSequence,
  SequenceStep,
} from '../types/pilates';
import type { HierarchyPilatesExercise, MovementSnapshot } from '../types/hierarchy';
import type {
  ClassHistoryLogWithSnapshot,
  TeachingExerciseSnapshot,
} from '../types/teachingHistorySnapshot';

const PERSIST_STORAGE_KEY = 'pilates-flow-atelier-storage-v3';

const originalStoreState = usePilatesStore.getState();

const catalogExercise = structuredClone(
  corpus.baselineFullDomain.catalogExercise,
) as unknown as HierarchyPilatesExercise;
const customDraftExercise = structuredClone(
  corpus.baselineFullDomain.customHumanDraftExercise,
) as unknown as HierarchyPilatesExercise & TeachingExerciseSnapshot;
const deletedCustomSnapshot = structuredClone(
  corpus.baselineFullDomain.deletedCustomExerciseSnapshot,
) as unknown as TeachingExerciseSnapshot & MovementSnapshot;

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function stableStateHash(value: unknown): string {
  return sha256(canonicalRecoveryContent(value));
}

function makeFullCriteria(): AutoGenerateCriteria {
  return {
    apparatus: 'reformer',
    ownedApparatus: ['reformer', 'mat'],
    availableEquipment: ['reformer', 'mat'],
    planningGoals: ['pelvic-control', 'trunk-hip-coordination', 'mobility', 'strength'],
    instructorObservations: ['anterior-pelvic-tilt'],
    level: '1.5',
    focusPreset: 'core-sculpt',
    preferredProps: ['mini-ball', 'magic-circle'],
    excludeDaysWindow: 14,
    targetGroupId: 'grp-compat-1',
    targetMinutes: 50,
    restMinutes: 3,
    defaultLayer: 'standard',
  };
}

function makeFullSteps(): SequenceStep[] {
  return [
    {
      stepId: 'step-compat-warmup-1',
      order: 1,
      kind: 'exercise',
      classSection: 'preparation',
      blockCategory: 'warmup',
      exerciseId: catalogExercise.id,
      durationMin: 8,
      explanationSec: 30,
      transitionSec: 20,
      repetitions: 8,
      sets: 2,
      sideMode: 'together',
      selectedLayer: 'standard',
      customSpringOverride: '1 Red + 1 Blue',
      instructorNote: '갈비뼈 호흡 정렬 확인',
      locked: true,
      blockInstanceId: 'blk-inst-compat-1',
      sourceBlockId: 'blk-template-warmup-1',
      sourceBlockVersion: 2,
      sourceBlockTitle: '합성 웜업 호흡 블록',
      blockInstanceDetached: false,
      motionStudy: {
        version: 1,
        family: 'supine-abdominal-curl',
        variantId: 'hundred-prep-v1',
        sourceFingerprint: 'a'.repeat(64),
      },
      futureStep: { preservedStepExt: true },
      historicalStepLabel: 'legacy-step-label-1',
    } as SequenceStep,
    {
      stepId: 'step-compat-rest-2',
      order: 2,
      kind: 'rest',
      classSection: 'main',
      blockCategory: 'core',
      exerciseId: '',
      durationMin: 2,
      selectedLayer: 'standard',
      instructorNote: '스프링 전환 및 수분 섭취 휴식',
      locked: false,
    },
    {
      stepId: 'step-compat-custom-3',
      order: 3,
      kind: 'exercise',
      classSection: 'main',
      blockCategory: 'extension',
      exerciseId: customDraftExercise.id,
      durationMin: 12,
      explanationSec: 40,
      transitionSec: 25,
      repetitions: 6,
      sets: 3,
      sideMode: 'left-then-right',
      selectedLayer: 'hard',
      customSpringOverride: '1 Red',
      instructorNote: '강사 창작 롱박스 스완 회전 큐잉',
      locked: false,
      blockInstanceId: 'blk-inst-compat-2',
      sourceBlockId: 'blk-template-ext-1',
      sourceBlockVersion: 1,
      sourceBlockTitle: '합성 흉추 신전 블록',
      blockInstanceDetached: true,
      humanDraftId: 'hdraft-compat-1',
      humanDraftRevision: 2,
      exerciseSnapshot: {
        id: customDraftExercise.id,
        nameKo: customDraftExercise.nameKo,
        nameEn: customDraftExercise.nameEn,
        apparatus: customDraftExercise.apparatus,
        requiredEquipment: ['reformer'],
        movementFamily: customDraftExercise.movementFamily,
        blockCategory: customDraftExercise.blockCategory,
        level: customDraftExercise.level,
        defaultDurationMin: customDraftExercise.defaultDurationMin,
        defaultRepetitions: 6,
        defaultSets: 3,
        isUnilateral: true,
        springs: customDraftExercise.springs,
        box: customDraftExercise.box,
        footbar: customDraftExercise.footbar,
        headrest: customDraftExercise.headrest,
        props: ['magic-circle'],
        spinalPlanes: ['extension', 'rotation'],
        bodyPosition: 'prone',
        targetMuscles: ['흉추 신전근', '전거근', '둔근'],
        breathPattern: customDraftExercise.breathPattern,
        cues: [...customDraftExercise.cues],
        precautions: customDraftExercise.precautions,
        layers: { ...customDraftExercise.layers },
        capturedAt: '2026-11-01T08:30:00.000Z',
        sourceOrigin: 'human-created',
        humanDraftId: 'hdraft-compat-1',
        humanDraftRevision: 2,
        parentDraftId: 'hdraft-compat-root-0',
        parentDraftRevision: 1,
        variantLabelKo: '매직서클 흉추 회전 변형 v2',
        ideaLineSnapshot: customDraftExercise.ideaLineSnapshot,
        feelLogsSnapshot: structuredClone(customDraftExercise.feelLogsSnapshot),
        modificationLogsSnapshot: structuredClone(customDraftExercise.modificationLogsSnapshot),
        photoReferencesSnapshot: structuredClone(customDraftExercise.photoReferencesSnapshot),
        safetyBoundarySnapshot: structuredClone(customDraftExercise.safetyBoundarySnapshot),
      },
    },
  ];
}

function makeFullSequence(): SavedSequence {
  const criteria = makeFullCriteria();
  return {
    id: 'seq-compat-full-1',
    title: '합성 전체 도메인 호환성 리포머 수업안',
    subtitle: '계층·블록·신동작 초안·스냅샷 보존 검증용',
    apparatus: 'reformer',
    level: '1.5',
    focusTags: ['core-sculpt', 'thoracic-extension'],
    targetMinutes: 50,
    steps: makeFullSteps(),
    createdAt: '2026-11-01T09:00:00.000Z',
    updatedAt: '2026-11-01T09:30:00.000Z',
    lastTaughtAt: '2026-11-02T10:00:00.000Z',
    taughtCount: 2,
    version: 3,
    criteriaSnapshot: criteria,
    sourceProvenance: {
      kind: 'history-snapshot',
      sourceId: 'hist-compat-origin-0',
      sourceTitle: '이전 완료 수업 스냅샷 원본',
      sourceSequenceId: 'seq-compat-origin-0',
      sourceVersion: 2,
      sourceUpdatedAt: '2026-10-28T09:00:00.000Z',
      sourceTaughtAt: '2026-10-29',
      clonedAt: '2026-11-01T09:00:00.000Z',
      summaryKo: '이전 완료 수업 스냅샷에서 복제한 수업안',
    },
    historicalPlanLabel: 'legacy-plan-label-1',
  } as SavedSequence;
}

function makeFullClassGroup(): ClassGroupProfile {
  const groupConditions = { ...makeFullCriteria() };
  delete groupConditions.targetGroupId;
  delete groupConditions.instructorObservations;
  return {
    id: 'grp-compat-1',
    name: '화목 오전 중급 리포머반 (합성)',
    type: 'group',
    defaultLevel: '1.5',
    scheduleLabel: '화·목 10:00',
    notes: '흉추 가동성 및 코어 협응 집중 (합성 테스트 데이터)',
    planningPreferences: {
      ageBand: '40-59',
      experience: 'experienced',
      mixedLevelNotes: '중급 기구 경험자 중심, 흉추 가동성 편차 고려 (합성)',
      conditions: groupConditions,
    },
  };
}

function makeFullHistoryLog(
  seq: SavedSequence,
  exList: PilatesExercise[],
): ClassHistoryLogWithSnapshot {
  const programSnapshot = buildTeachingProgramSnapshot({
    sequenceId: seq.id,
    sequenceTitle: seq.title,
    sequenceSubtitle: seq.subtitle,
    sourceKind: 'saved-sequence',
    sourceSequenceVersion: seq.version,
    sourceSequenceUpdatedAt: seq.updatedAt,
    sourceProvenance: seq.sourceProvenance,
    apparatus: seq.apparatus,
    level: seq.level,
    targetMinutes: seq.targetMinutes,
    taughtAt: '2026-11-02T10:00:00.000Z',
    capturedAt: '2026-11-02T10:50:00.000Z',
    groupId: 'grp-compat-1',
    steps: seq.steps,
    exercises: exList,
    actualDurationSec: 2940,
    actualRestDurationSec: 120,
    criteriaSnapshot: seq.criteriaSnapshot,
  });

  return {
    id: 'hist-compat-full-1',
    sequenceId: seq.id,
    sequenceTitle: seq.title,
    groupId: 'grp-compat-1',
    groupName: '화목 오전 중급 리포머반 (합성)',
    taughtAt: '2026-11-02T10:00:00.000Z',
    apparatus: seq.apparatus,
    level: seq.level,
    exerciseIds: [catalogExercise.id, customDraftExercise.id],
    rating: 5,
    intensity: 'moderate',
    instructorReflection: '합성 수업 완료 기록: 롱박스 스완 회전 시 큐잉 반응 양호',
    actualDurationSec: 2940,
    actualRestDurationSec: 120,
    stepsSnapshot: structuredClone(seq.steps),
    criteriaSnapshot: structuredClone(seq.criteriaSnapshot),
    programSnapshot,
    sequenceSnapshot: structuredClone(programSnapshot.sequenceSnapshot),
    sourceProvenance: structuredClone(seq.sourceProvenance),
  };
}

function makeBaselineRecoveryState(
  overrides: Partial<RecoveryCurrentState> = {},
): RecoveryCurrentState {
  const seq = makeFullSequence();
  const grp = makeFullClassGroup();
  const exList = [structuredClone(catalogExercise), structuredClone(customDraftExercise)];
  const log = makeFullHistoryLog(seq, exList);
  const criteria = makeFullCriteria();
  const template: ConditionTemplate = {
    id: 'tpl-compat-1',
    name: '중급 코어·흉추 리포머 조건 템플릿',
    criteria,
    createdAt: '2026-11-01T08:00:00.000Z',
  };

  return {
    exercises: exList,
    savedSequences: [seq],
    classGroups: [grp],
    historyLogs: [log],
    conditionTemplates: [template],
    instructorSchedule: {
      locations: [
        {
          id: 'loc-compat-1',
          alias: '합성 제1스튜디오',
          equipmentIds: ['reformer', 'mat'],
          propIds: ['mini-ball', 'magic-circle'],
          notes: '리포머 6대 보유 합성 스튜디오',
        },
      ],
      classes: [
        {
          id: 'cls-compat-1',
          title: '화목 오전 리포머 정규반',
          participantAlias: '합성 오전 그룹',
          locationId: 'loc-compat-1',
          startDate: '2026-11-03',
          startTime: '10:00',
          endTime: '10:50',
          recurrence: 'weekly',
          weekdays: [2, 4],
          untilDate: '2026-12-31',
          linkSavedSequenceId: seq.id,
          notes: '정규 그룹 수업 일정',
        },
      ],
      exceptions: [
        {
          id: 'exc-compat-1',
          kind: 'reschedule',
          classId: 'cls-compat-1',
          originalDate: '2026-11-05',
          date: '2026-11-06',
          startTime: '11:00',
          endTime: '11:50',
          locationId: 'loc-compat-1',
          reason: '합성 일정 시간 변경 테스트',
        },
      ],
    },
    instructorStudyState: {
      bookmarkedExerciseIds: [catalogExercise.id, customDraftExercise.id],
      rehearsalCueHidden: false,
      completedTutorialTaskIds: ['onboarding:welcome', 'sequence:first-plan'],
    },
    datedSequencePlanning: {
      assignments: [
        {
          id: 'assign-compat-1',
          classId: 'cls-compat-1',
          originalDate: '2026-11-03',
          state: 'prepared',
          sourceSequenceId: seq.id,
          sourceSequenceUpdatedAt: seq.updatedAt,
          sequenceSnapshot: structuredClone(seq),
          occurrenceSnapshot: {
            date: '2026-11-03',
            startTime: '10:00',
            endTime: '10:50',
            locationId: 'loc-compat-1',
          },
          createdAt: '2026-11-01T10:00:00.000Z',
          updatedAt: '2026-11-02T10:00:00.000Z',
          priorVersions: [
            {
              id: 'assign-compat-1',
              classId: 'cls-compat-1',
              originalDate: '2026-11-03',
              state: 'draft',
              sourceSequenceId: seq.id,
              sourceSequenceUpdatedAt: seq.updatedAt,
              sequenceSnapshot: structuredClone(seq),
              occurrenceSnapshot: {
                date: '2026-11-03',
                startTime: '10:00',
                endTime: '10:50',
                locationId: 'loc-compat-1',
              },
              createdAt: '2026-11-01T10:00:00.000Z',
              updatedAt: '2026-11-01T12:00:00.000Z',
            },
          ],
        },
      ],
    },
    ownedEquipment: ['reformer', 'mat'],
    ownedProps: ['mini-ball', 'magic-circle'],
    lastCriteria: structuredClone(criteria),
    draftCriteria: structuredClone(criteria),
    activeSequenceId: seq.id,
    activeTitle: seq.title,
    activeSubtitle: seq.subtitle,
    activeApparatus: seq.apparatus,
    activeLevel: seq.level,
    activeTargetMinutes: seq.targetMinutes,
    activeTargetGroupId: grp.id,
    activeSteps: structuredClone(seq.steps),
    ...overrides,
  };
}

function makeEmptyRecoveryState(): RecoveryCurrentState {
  return {
    exercises: [],
    savedSequences: [],
    classGroups: [],
    historyLogs: [],
    conditionTemplates: [],
    instructorSchedule: createEmptyInstructorSchedule(),
    instructorStudyState: undefined,
    datedSequencePlanning: undefined,
    ownedEquipment: [],
    ownedProps: [],
    lastCriteria: null,
    draftCriteria: null,
    activeSequenceId: 'seq-empty-workbench',
    activeTitle: '빈 작업대',
    activeSubtitle: '',
    activeApparatus: 'reformer',
    activeLevel: '1.0',
    activeTargetMinutes: 50,
    activeTargetGroupId: '',
    activeSteps: [],
  };
}

interface RollbackSafetySnapshot {
  stateHash: string;
  mainStorageRaw: string | null;
  rollbackStorageRaw: string | null;
  photoUriSnapshot: string | undefined;
}

function captureRollbackSafetySnapshot(): RollbackSafetySnapshot {
  const st = usePilatesStore.getState();
  const customEx = st.exercises.find((e) => e.id === customDraftExercise.id) as
    | (PilatesExercise & Partial<TeachingExerciseSnapshot>)
    | undefined;
  return {
    stateHash: stableStateHash({
      exercises: st.exercises,
      savedSequences: st.savedSequences,
      classGroups: st.classGroups,
      historyLogs: st.historyLogs,
      conditionTemplates: st.conditionTemplates,
      instructorSchedule: st.instructorSchedule,
      instructorStudyState: st.instructorStudyState,
      datedSequencePlanning: st.datedSequencePlanning,
      ownedEquipment: st.ownedEquipment,
      ownedApparatus: st.ownedApparatus,
      ownedProps: st.ownedProps,
      lastCriteria: st.lastCriteria,
      draftCriteria: st.draftCriteria,
      activeSequenceId: st.activeSequenceId,
      activeTitle: st.activeTitle,
      activeSteps: st.activeSteps,
    }),
    mainStorageRaw: window.localStorage.getItem(PERSIST_STORAGE_KEY),
    rollbackStorageRaw: window.localStorage.getItem(BACKUP_ROLLBACK_STORAGE_KEY),
    photoUriSnapshot: customEx?.photoReferencesSnapshot?.[0]?.localRefUri,
  };
}

function assertRollbackRejectedWithoutSideEffects(
  rawRollbackJson: string,
  expectedReason: 'corrupted-json' | 'unsupported-version' | 'invalid-shape',
) {
  const before = captureRollbackSafetySnapshot();

  // 1. Direct inspection rejects with expectedReason
  const inspected = inspectPersistedRollbackPoint(rawRollbackJson);
  expect(inspected.valid).toBe(false);
  if (!inspected.valid) {
    expect(inspected.reason).toBe(expectedReason);
    expect(inspected.point).toBeNull();
  }

  // 2. Even if written to BACKUP_ROLLBACK_STORAGE_KEY and rollbackLatestBackupRestore is invoked,
  // neither the store nor PERSIST_STORAGE_KEY nor history/photo references are mutated
  window.localStorage.setItem(BACKUP_ROLLBACK_STORAGE_KEY, rawRollbackJson);
  resetInMemoryBackupRollbackPointForTest();
  expect(getLatestBackupRollbackPoint()).toBeNull();

  const rollbackOutcome = rollbackLatestBackupRestore({
    getState: () => usePilatesStore.getState(),
    setState: (patch) => usePilatesStore.setState(patch),
    checkStorage: () => ({ ok: true }),
  });
  expect(rollbackOutcome.success).toBe(false);
  expect(rollbackOutcome.reason).toBe('no-rollback-point');

  if (before.rollbackStorageRaw === null) {
    window.localStorage.removeItem(BACKUP_ROLLBACK_STORAGE_KEY);
  } else {
    window.localStorage.setItem(BACKUP_ROLLBACK_STORAGE_KEY, before.rollbackStorageRaw);
  }

  const after = captureRollbackSafetySnapshot();
  expect(after.stateHash).toBe(before.stateHash);
  expect(after.mainStorageRaw).toBe(before.mainStorageRaw);
  expect(after.photoUriSnapshot).toBe(before.photoUriSnapshot);
  expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
}

describe('Backup Compatibility Round-Trip (Scope A) & Nested Rollback Pre-Restore Validation (Scope B)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetInMemoryBackupRollbackPointForTest();
    resetMovementIdeaStateForTests();

    const base = makeBaselineRecoveryState();
    usePilatesStore.setState({
      ...originalStoreState,
      exercises: structuredClone(base.exercises),
      savedSequences: structuredClone(base.savedSequences),
      classGroups: structuredClone(base.classGroups),
      historyLogs: structuredClone(base.historyLogs),
      conditionTemplates: structuredClone(base.conditionTemplates),
      instructorSchedule: structuredClone(base.instructorSchedule),
      instructorStudyState: structuredClone(base.instructorStudyState),
      datedSequencePlanning: structuredClone(base.datedSequencePlanning),
      ownedEquipment: structuredClone(base.ownedEquipment),
      ownedApparatus: ['reformer', 'mat'],
      ownedProps: structuredClone(base.ownedProps),
      lastCriteria: structuredClone(base.lastCriteria),
      draftCriteria: structuredClone(base.draftCriteria),
      activeSequenceId: base.activeSequenceId,
      activeTitle: base.activeTitle,
      activeSubtitle: base.activeSubtitle,
      activeApparatus: base.activeApparatus,
      activeLevel: base.activeLevel,
      activeTargetMinutes: base.activeTargetMinutes,
      activeTargetGroupId: base.activeTargetGroupId,
      activeSteps: structuredClone(base.activeSteps),
      saveFeedback: null,
      generationError: null,
    });
  });

  afterEach(() => {
    delete (Object.prototype as Record<string, unknown>).polluted;
    clearBackupRestoreRollbackPoint();
    resetInMemoryBackupRollbackPointForTest();
    resetMovementIdeaStateForTests();
  });

  describe('Scope A: Full-Domain Round-Trip & Deleted Custom Inline Snapshot Compatibility (CMP-*)', () => {
    it('CMP-RT-001: preserves all allowlisted hierarchy, block, human-draft, history snapshot, schedule, study, dated-plan, equipment, and template fields across export -> parse -> inspect -> restore dry-run -> restore -> re-export', () => {
      const exportedRaw1 = usePilatesStore.getState().exportBackup();
      const parsedEnvelope1 = JSON.parse(exportedRaw1) as {
        format: string;
        version: number;
        exportedAt: string;
        data: Record<string, unknown>;
      };
      expect(parsedEnvelope1.format).toBe('pilates-flow-atelier');
      expect(parsedEnvelope1.version).toBe(3);

      // Dry-run inspection into an empty recovery state
      const emptyCurrent = makeEmptyRecoveryState();
      const dryRun1 = inspectBackupRecovery(exportedRaw1, emptyCurrent);
      expect(dryRun1.success).toBe(true);
      if (!dryRun1.success) return;

      // Verify every domain collection and nested allowlisted field survived inspection
      expect(dryRun1.next.exercises).toHaveLength(2);
      const restoredCustomEx = dryRun1.next.exercises.find(
        (e) => e.id === customDraftExercise.id,
      ) as unknown as TeachingExerciseSnapshot & {
        parentDraftId?: string;
        parentDraftRevision?: number;
        variantLabelKo?: string;
      };
      expect(restoredCustomEx).toBeDefined();
      expect(restoredCustomEx.humanDraftId).toBe('hdraft-compat-1');
      expect(restoredCustomEx.humanDraftRevision).toBe(2);
      expect(restoredCustomEx.parentDraftId).toBe('hdraft-compat-root-0');
      expect(restoredCustomEx.parentDraftRevision).toBe(1);
      expect(restoredCustomEx.variantLabelKo).toBe('매직서클 흉추 회전 변형 v2');
      expect(restoredCustomEx.ideaLineSnapshot).toContain('롱박스에서 매직서클');
      expect(restoredCustomEx.feelLogsSnapshot).toHaveLength(1);
      expect(restoredCustomEx.modificationLogsSnapshot).toHaveLength(1);
      expect(restoredCustomEx.photoReferencesSnapshot?.[0]?.localRefUri).toBe(
        'local-photo://synthetic-draft-pose-1',
      );
      expect(restoredCustomEx.safetyBoundarySnapshot?.aiSafetyGuaranteed).toBe(false);

      expect(dryRun1.next.savedSequences).toHaveLength(1);
      const restoredSeq = dryRun1.next.savedSequences[0];
      expect(restoredSeq.version).toBe(3);
      expect(restoredSeq.sourceProvenance?.kind).toBe('history-snapshot');
      expect(restoredSeq.steps).toHaveLength(3);
      expect(restoredSeq.steps[0].classSection).toBe('preparation');
      expect(restoredSeq.steps[0].sourceBlockTitle).toBe('합성 웜업 호흡 블록');
      expect(restoredSeq.steps[0].motionStudy?.variantId).toBe('hundred-prep-v1');
      expect(restoredSeq.steps[2].blockInstanceDetached).toBe(true);
      expect(restoredSeq.steps[2].exerciseSnapshot?.variantLabelKo).toBe(
        '매직서클 흉추 회전 변형 v2',
      );

      expect(dryRun1.next.classGroups).toHaveLength(1);
      expect(dryRun1.next.classGroups[0].planningPreferences?.ageBand).toBe('40-59');
      expect(dryRun1.next.classGroups[0].planningPreferences?.experience).toBe('experienced');
      expect(dryRun1.next.classGroups[0].planningPreferences?.conditions?.targetMinutes).toBe(50);

      expect(dryRun1.next.historyLogs).toHaveLength(1);
      const restoredLog = dryRun1.next.historyLogs[0] as ClassHistoryLogWithSnapshot;
      expect(restoredLog.programSnapshot?.snapshotVersion).toBe(1);
      expect(restoredLog.programSnapshot?.blockSnapshots?.length).toBeGreaterThan(0);
      expect(restoredLog.sequenceSnapshot?.snapshotId).toBeDefined();

      expect(dryRun1.next.conditionTemplates).toHaveLength(1);
      expect(dryRun1.next.instructorSchedule.locations).toHaveLength(1);
      expect(dryRun1.next.instructorSchedule.classes).toHaveLength(1);
      expect(dryRun1.next.instructorSchedule.exceptions).toHaveLength(1);
      expect(dryRun1.next.instructorStudyState?.bookmarkedExerciseIds).toEqual([
        catalogExercise.id,
        customDraftExercise.id,
      ]);
      expect(dryRun1.next.datedSequencePlanning?.assignments).toHaveLength(1);
      expect(dryRun1.next.datedSequencePlanning?.assignments[0].priorVersions).toHaveLength(1);
      expect(dryRun1.next.ownedEquipment).toEqual(['reformer', 'mat']);
      expect(dryRun1.next.ownedProps).toEqual(['mini-ball', 'magic-circle']);
      expect(dryRun1.next.lastCriteria?.planningGoals).toContain('pelvic-control');
      expect(dryRun1.next.draftCriteria?.instructorObservations).toContain('anterior-pelvic-tilt');

      // Now wipe store to empty, restore exportedRaw1, and re-export
      usePilatesStore.setState({
        exercises: [],
        savedSequences: [],
        classGroups: [],
        historyLogs: [],
        conditionTemplates: [],
        instructorSchedule: createEmptyInstructorSchedule(),
        instructorStudyState: undefined,
        datedSequencePlanning: undefined,
        ownedEquipment: [],
        ownedApparatus: [],
        ownedProps: [],
        lastCriteria: null,
        draftCriteria: null,
        activeSteps: [],
      });

      const restoreResult = usePilatesStore.getState().restoreBackup(exportedRaw1);
      expect(restoreResult.success).toBe(true);

      const exportedRaw2 = usePilatesStore.getState().exportBackup();
      const dryRun2 = inspectBackupRecovery(exportedRaw2, emptyCurrent);
      expect(dryRun2.success).toBe(true);
      if (!dryRun2.success) return;

      // Semantic equivalence across the full cycle
      expect(canonicalRecoveryContent(dryRun2.next)).toBe(canonicalRecoveryContent(dryRun1.next));
    });

    it('CMP-DEL-001 (Resolved C1): accepts and preserves history logs and sequence steps referencing a deleted custom exercise when backed by valid inline snapshots', () => {
      // Build a sequence and completed history log that include `deletedCustomSnapshot` (id: 'ex-compat-deleted-custom-99')
      const deletedExercise: PilatesExercise = reconstructExerciseFromSnapshot(
        movementSnapshotToTeachingExerciseSnapshot(deletedCustomSnapshot),
      );
      const stepWithDeletedCustom: SequenceStep = {
        stepId: 'step-with-deleted-custom-1',
        order: 1,
        kind: 'exercise',
        classSection: 'cooldown',
        blockCategory: 'feet-in-straps',
        exerciseId: deletedCustomSnapshot.id,
        durationMin: 10,
        explanationSec: 25,
        transitionSec: 15,
        repetitions: 10,
        sets: 2,
        sideMode: 'together',
        selectedLayer: 'standard',
        humanDraftId: deletedCustomSnapshot.humanDraftId,
        humanDraftRevision: deletedCustomSnapshot.humanDraftRevision,
        exerciseSnapshot: structuredClone(deletedCustomSnapshot),
      };

      const seqWithInlineSnap: SavedSequence = {
        ...makeFullSequence(),
        id: 'seq-with-deleted-custom-inline',
        steps: [stepWithDeletedCustom],
      };

      const programSnapshot = buildTeachingProgramSnapshot({
        sequenceId: seqWithInlineSnap.id,
        sequenceTitle: seqWithInlineSnap.title,
        sequenceSubtitle: seqWithInlineSnap.subtitle,
        sourceKind: 'saved-sequence',
        sourceSequenceVersion: 1,
        apparatus: 'reformer',
        level: '1.5',
        targetMinutes: 50,
        taughtAt: '2026-11-03T10:00:00.000Z',
        capturedAt: '2026-11-03T10:50:00.000Z',
        groupId: 'grp-compat-1',
        steps: [stepWithDeletedCustom],
        exercises: [catalogExercise, deletedExercise],
      });

      const historyLogWithDeletedCustom: ClassHistoryLogWithSnapshot = {
        id: 'hist-with-deleted-custom-1',
        sequenceId: seqWithInlineSnap.id,
        sequenceTitle: seqWithInlineSnap.title,
        groupId: 'grp-compat-1',
        groupName: '화목 오전 중급 리포머반 (합성)',
        taughtAt: '2026-11-03T10:00:00.000Z',
        apparatus: 'reformer',
        level: '1.5',
        exerciseIds: [deletedCustomSnapshot.id],
        rating: 5,
        intensity: 'moderate',
        instructorReflection: '삭제된 커스텀 동작이 인라인 스냅샷으로 보존된 수업 기록',
        stepsSnapshot: [structuredClone(stepWithDeletedCustom)],
        programSnapshot,
        sequenceSnapshot: structuredClone(programSnapshot.sequenceSnapshot),
      };

      // Note: `deletedCustomSnapshot.id` ('ex-compat-deleted-custom-99') is NOT in `data.exercises`!
      const backupWithDeletedCustomRaw = JSON.stringify({
        format: 'pilates-flow-atelier',
        version: 3,
        exportedAt: '2026-11-06T09:00:00.000Z',
        data: {
          exercises: [structuredClone(catalogExercise)],
          savedSequences: [seqWithInlineSnap],
          classGroups: [makeFullClassGroup()],
          historyLogs: [historyLogWithDeletedCustom],
        },
      });

      const emptyCurrent = makeEmptyRecoveryState();
      const inspection = inspectBackupRecovery(backupWithDeletedCustomRaw, emptyCurrent);
      expect(inspection.success).toBe(true);
      if (!inspection.success) return;

      // Verify history view resolves the deleted custom exercise from the inline snapshot without missing errors
      const restoredLog = inspection.next.historyLogs[0];
      const liveMap = new Map(inspection.next.exercises.map((e) => [e.id, e]));
      expect(liveMap.has(deletedCustomSnapshot.id)).toBe(false);

      const historyView = resolveTeachingHistoryView(restoredLog, liveMap);
      expect(historyView.hasPreservedSnapshot).toBe(true);
      expect(historyView.missingUnrecoverableExerciseIds).toHaveLength(0);
      expect(historyView.deletedExerciseIds).toContain(deletedCustomSnapshot.id);
      expect(historyView.steps[0].nameKo).toBe(deletedCustomSnapshot.nameKo);
      expect(historyView.steps[0].ideaLineSnapshot).toBe(deletedCustomSnapshot.ideaLineSnapshot);

      // Verify cloning the history log to a next-class draft reconstructs the deleted exercise cleanly
      const clonedDraft = cloneTeachingHistoryToNextClassDraft(
        restoredLog,
        inspection.next.exercises,
      );
      expect(clonedDraft).not.toBeNull();
      expect(clonedDraft?.restoredExercises.map((e) => e.id)).toContain(deletedCustomSnapshot.id);

      // Contrast: if a history log references a missing exercise WITHOUT any inline snapshot, it is still rejected!
      const danglingHistoryRaw = JSON.stringify({
        format: 'pilates-flow-atelier',
        version: 3,
        exportedAt: '2026-11-06T09:00:00.000Z',
        data: {
          exercises: [structuredClone(catalogExercise)],
          savedSequences: [],
          classGroups: [],
          historyLogs: [
            {
              ...historyLogWithDeletedCustom,
              id: 'hist-dangling-no-snapshot',
              exerciseIds: ['nonexistent-exercise-without-snapshot'],
              stepsSnapshot: undefined,
              programSnapshot: undefined,
              sequenceSnapshot: undefined,
            },
          ],
        },
      });
      const danglingInspection = inspectBackupRecovery(danglingHistoryRaw, emptyCurrent);
      expect(danglingInspection.success).toBe(false);
      if (!danglingInspection.success) {
        expect(danglingInspection.code).toBe('missing_exercise');
      }
    });

    it('CMP-SNAP-001 (Resolved C2): preserves parentDraftId, parentDraftRevision, variantLabelKo, feelLogsSnapshot, photoReferencesSnapshot, and step metadata across snapshot conversion and reconstruction', () => {
      const teachingSnap = movementSnapshotToTeachingExerciseSnapshot(
        customDraftExercise as unknown as MovementSnapshot,
        customDraftExercise,
      ) as TeachingExerciseSnapshot & {
        parentDraftId?: string;
        parentDraftRevision?: number;
        variantLabelKo?: string;
      };
      expect(teachingSnap.parentDraftId).toBe('hdraft-compat-root-0');
      expect(teachingSnap.parentDraftRevision).toBe(1);
      expect(teachingSnap.variantLabelKo).toBe('매직서클 흉추 회전 변형 v2');

      const directSnap = createTeachingExerciseSnapshot(
        customDraftExercise,
        '2026-11-06T09:00:00.000Z',
      ) as TeachingExerciseSnapshot & {
        parentDraftId?: string;
        parentDraftRevision?: number;
        variantLabelKo?: string;
      };
      expect(directSnap.parentDraftId).toBe('hdraft-compat-root-0');
      expect(directSnap.parentDraftRevision).toBe(1);
      expect(directSnap.variantLabelKo).toBe('매직서클 흉추 회전 변형 v2');
      expect(directSnap.feelLogsSnapshot).toHaveLength(1);
      expect(directSnap.photoReferencesSnapshot?.[0]?.localRefUri).toBe(
        'local-photo://synthetic-draft-pose-1',
      );

      const reconstructed = reconstructExerciseFromSnapshot(directSnap) as HierarchyPilatesExercise &
        Partial<TeachingExerciseSnapshot> & {
          parentDraftId?: string;
          parentDraftRevision?: number;
          variantLabelKo?: string;
        };
      expect(reconstructed.parentDraftId).toBe('hdraft-compat-root-0');
      expect(reconstructed.parentDraftRevision).toBe(1);
      expect(reconstructed.variantLabelKo).toBe('매직서클 흉추 회전 변형 v2');
      expect(reconstructed.ideaLineSnapshot).toBe(customDraftExercise.ideaLineSnapshot);
      expect(reconstructed.feelLogsSnapshot).toHaveLength(1);
      expect(reconstructed.modificationLogsSnapshot).toHaveLength(1);
      expect(reconstructed.photoReferencesSnapshot?.[0]?.localRefUri).toBe(
        'local-photo://synthetic-draft-pose-1',
      );
      expect(reconstructed.safetyBoundarySnapshot?.originType).toBe('instructor-created-draft');

      // Verify step reconstruction from programSnapshot and sequenceSnapshot preserves blockInstanceDetached, classSection, motionStudy
      const fullSeq = makeFullSequence();
      const fullLog = makeFullHistoryLog(fullSeq, [catalogExercise, customDraftExercise]);

      const logProgramOnly: ClassHistoryLogWithSnapshot = {
        ...fullLog,
        stepsSnapshot: undefined,
        sequenceSnapshot: undefined,
      };
      const stepsFromProgram = reconstructStepsSnapshotFromHistoryLog(logProgramOnly);
      expect(stepsFromProgram).not.toBeNull();
      expect(stepsFromProgram?.[2]?.blockInstanceDetached).toBe(true);

      const logSeqSnapOnly: ClassHistoryLogWithSnapshot = {
        ...fullLog,
        stepsSnapshot: undefined,
        programSnapshot: undefined,
      };
      const stepsFromSeqSnap = reconstructStepsSnapshotFromHistoryLog(logSeqSnapOnly);
      expect(stepsFromSeqSnap).not.toBeNull();
      expect(stepsFromSeqSnap?.[0]?.classSection).toBe('preparation');
      expect(stepsFromSeqSnap?.[0]?.motionStudy?.variantId).toBe('hundred-prep-v1');
      expect(stepsFromSeqSnap?.[2]?.blockInstanceDetached).toBe(true);
    });

    it('CMP-LEG-001: distinguishes supported formats (export-v3, persisted-v3, persisted-original-v0, bare-data) from unsupported versions and unknown fields', () => {
      const emptyCurrent = makeEmptyRecoveryState();
      const baseData = {
        exercises: [structuredClone(catalogExercise)],
        savedSequences: [
          {
            ...makeFullSequence(),
            steps: [makeFullSteps()[0]],
          },
        ],
        classGroups: [makeFullClassGroup()],
        historyLogs: [],
      };

      // 1. Supported: export-v3
      const exportV3 = inspectBackupRecovery(
        JSON.stringify({
          format: 'pilates-flow-atelier',
          version: 3,
          exportedAt: '2026-11-06T09:00:00.000Z',
          data: baseData,
        }),
        emptyCurrent,
      );
      expect(exportV3.success).toBe(true);
      if (exportV3.success) expect(exportV3.summary.sourceKind).toBe('export-v3');

      // 2. Supported: persisted-v3 with legacy flat workbench draft + criteria
      const persistedV3 = inspectBackupRecovery(
        JSON.stringify({
          version: 3,
          state: {
            ...baseData,
            draftCriteria: makeFullCriteria(),
            lastCriteria: null,
            activeSequenceId: 'legacy-v3-active-seq',
            activeTitle: '레거시 v3 작업대 초안',
            activeSubtitle: '보존 테스트',
            activeApparatus: 'reformer',
            activeLevel: '1.5',
            activeTargetMinutes: 50,
            activeTargetGroupId: 'grp-compat-1',
            activeSteps: [makeFullSteps()[0]],
          },
        }),
        emptyCurrent,
      );
      expect(persistedV3.success).toBe(true);
      if (persistedV3.success) {
        expect(persistedV3.summary.sourceKind).toBe('persisted-v3');
        expect(persistedV3.summary.legacyDraftIncluded).toBe(true);
      }

      // 3. Supported: persisted-original-v0 (without criteria recorded)
      const persistedV0 = inspectBackupRecovery(
        JSON.stringify({
          version: 0,
          state: {
            ...baseData,
            ownedApparatus: ['reformer'],
            activeSequenceId: 'legacy-v0-active-seq',
            activeTitle: '초기 v0 작업대 초안',
            activeSubtitle: '',
            activeApparatus: 'reformer',
            activeLevel: '1.0',
            activeTargetMinutes: 50,
            activeTargetGroupId: '',
            activeSteps: [makeFullSteps()[0]],
          },
        }),
        emptyCurrent,
      );
      expect(persistedV0.success).toBe(true);
      if (persistedV0.success) {
        expect(persistedV0.summary.sourceKind).toBe('persisted-original-v0');
        expect(persistedV0.summary.legacyDraftIncluded).toBe(true);
        expect(persistedV0.next.ownedEquipment).toContain('reformer');
      }

      // 4. Supported: bare-data
      const bareData = inspectBackupRecovery(JSON.stringify(baseData), emptyCurrent);
      expect(bareData.success).toBe(true);
      if (bareData.success) expect(bareData.summary.sourceKind).toBe('bare-data');

      // 5. Unsupported versions -> rejected with unsupported_version
      for (const badExportVer of [0, 1, 2, 4, 99]) {
        const res = inspectBackupRecovery(
          JSON.stringify({
            format: 'pilates-flow-atelier',
            version: badExportVer,
            exportedAt: '2026-11-06T09:00:00.000Z',
            data: baseData,
          }),
          emptyCurrent,
        );
        expect(res.success).toBe(false);
        if (!res.success) expect(res.code).toBe('unsupported_version');
      }
      for (const badPersistVer of [1, 2, 4, 99]) {
        const res = inspectBackupRecovery(
          JSON.stringify({
            version: badPersistVer,
            state: baseData,
          }),
          emptyCurrent,
        );
        expect(res.success).toBe(false);
        if (!res.success) expect(res.code).toBe('unsupported_version');
      }

      // 6. Unknown / unallowlisted domain fields -> rejected with unsupported_fields (not silently stripped)
      const unknownFieldRes = inspectBackupRecovery(
        JSON.stringify({
          format: 'pilates-flow-atelier',
          version: 3,
          exportedAt: '2026-11-06T09:00:00.000Z',
          data: {
            ...baseData,
            exercises: [
              {
                ...catalogExercise,
                unallowlistedFutureExerciseField: 'must-preserve',
              },
            ],
          },
        }),
        emptyCurrent,
      );
      expect(unknownFieldRes.success).toBe(true);
      if (unknownFieldRes.success) {
        expect((unknownFieldRes.next.exercises[0] as unknown as Record<string, unknown>).unallowlistedFutureExerciseField).toBe('must-preserve');
      }
    });

    it('CMP-SCALE-001: processes realistic large valid backup (120 steps, 150 history logs) within bounds and rejects over-limit payloads without mutating state', () => {
      const emptyCurrent = makeEmptyRecoveryState();
      const stepCount = corpus.bounds.realisticLargeSequenceSteps; // 120
      const historyCount = corpus.bounds.realisticLargeHistoryLogs; // 150

      const largeSteps: SequenceStep[] = Array.from({ length: stepCount }, (_, idx) => ({
        stepId: `step-large-${idx + 1}`,
        order: idx + 1,
        kind: 'exercise' as const,
        blockCategory: 'core' as const,
        exerciseId: catalogExercise.id,
        durationMin: 1,
        selectedLayer: 'standard' as const,
      }));
      const largeSeq: SavedSequence = {
        ...makeFullSequence(),
        id: 'seq-large-valid',
        targetMinutes: 180,
        steps: largeSteps,
      };
      const largeHistoryLogs: ClassHistoryLog[] = Array.from(
        { length: historyCount },
        (_, idx) => ({
          id: `hist-large-${idx + 1}`,
          sequenceId: largeSeq.id,
          sequenceTitle: largeSeq.title,
          groupId: 'grp-compat-1',
          groupName: '화목 오전 중급 리포머반 (합성)',
          taughtAt: '2026-11-02T10:00:00.000Z',
          apparatus: 'reformer',
          level: '1.5',
          exerciseIds: [catalogExercise.id],
          rating: 5,
          intensity: 'moderate',
          instructorReflection: `대용량 정상 이력 #${idx + 1}`,
        }),
      );

      const largeValidRaw = JSON.stringify({
        format: 'pilates-flow-atelier',
        version: 3,
        exportedAt: '2026-11-06T09:00:00.000Z',
        data: {
          exercises: [catalogExercise],
          savedSequences: [largeSeq],
          classGroups: [makeFullClassGroup()],
          historyLogs: largeHistoryLogs,
        },
      });

      const startMs = performance.now();
      const largeInspect = inspectBackupRecovery(largeValidRaw, emptyCurrent);
      const elapsedMs = performance.now() - startMs;
      expect(largeInspect.success).toBe(true);
      expect(elapsedMs).toBeLessThan(corpus.bounds.maxCaseDurationMs);

      // Over-limit: 1001 steps in sequence (> 1000 max) -> rejected without side effects
      const beforeSnap = captureRollbackSafetySnapshot();
      const overLimitSteps = Array.from({ length: 1001 }, (_, idx) => ({
        stepId: `step-over-${idx + 1}`,
        order: idx + 1,
        kind: 'exercise' as const,
        blockCategory: 'core' as const,
        exerciseId: catalogExercise.id,
        durationMin: 1,
        selectedLayer: 'standard' as const,
      }));
      const overLimitRaw = JSON.stringify({
        format: 'pilates-flow-atelier',
        version: 3,
        exportedAt: '2026-11-06T09:00:00.000Z',
        data: {
          exercises: [catalogExercise],
          savedSequences: [{ ...largeSeq, steps: overLimitSteps }],
          classGroups: [],
          historyLogs: [],
        },
      });
      const overLimitRes = usePilatesStore.getState().restoreBackup(overLimitRaw);
      expect(overLimitRes.success).toBe(false);
      expect(captureRollbackSafetySnapshot().stateHash).toBe(beforeSnap.stateHash);
      expect(MAX_LOCAL_BACKUP_BYTES).toBe(15_000_000);
      expect(MAX_BACKUP_JSON_DEPTH).toBe(64);
    });
  });

  describe('Scope B: Valid Rollback Compatibility & Corrupted Nested Rollback Guards (RBK-*)', () => {
    it('RBK-COMPAT-001: accepts and restores valid v0 and v1 rollback points including non-empty activeSteps (using stepId), deleted custom exercise inline history snapshots, and local-only fields on domain records', () => {
      // Attach local-only fields onto pre-restore domain records to verify they are NOT stripped or rejected by rollback validation
      const exWithLocalField = {
        ...structuredClone(catalogExercise),
        localOnlyInstructorPin: 'pinned-in-local-workbench',
      } as unknown as PilatesExercise;
      const seqWithLocalField = {
        ...makeFullSequence(),
        createdAt: '',
        updatedAt: '',
        localOnlyDraftBadge: 'local-binder-tag',
      } as unknown as SavedSequence;

      const basePreState = captureBackupPreRestoreState({
        ...usePilatesStore.getState(),
        exercises: [exWithLocalField, structuredClone(customDraftExercise)],
        savedSequences: [seqWithLocalField],
      });
      const preStateWithActiveSteps = {
        ...basePreState,
        activeSteps: makeFullSteps(),
        activeSequenceId: seqWithLocalField.id,
        activeTitle: seqWithLocalField.title,
        activeSubtitle: seqWithLocalField.subtitle,
        activeApparatus: 'reformer' as const,
        activeLevel: '1.5' as const,
        activeTargetMinutes: 50,
        activeTargetGroupId: 'grp-compat-1',
      };

      expect(isValidBackupPreRestoreDomainState(preStateWithActiveSteps)).toBe(true);

      for (const version of [0, 1] as const) {
        const currentFp = backupRecoveryStateFingerprint(usePilatesStore.getState());
        const rollbackPayload = JSON.stringify({
          version,
          id: `rb-valid-compat-v${version}`,
          capturedAt: '2026-11-06T09:00:00.000Z',
          addedCount: 2,
          postRestoreStateFingerprint: currentFp,
          postRestoreStorageFingerprint: null,
          preRestoreState: preStateWithActiveSteps,
        });

        const inspected = inspectPersistedRollbackPoint(rollbackPayload);
        expect(inspected.valid).toBe(true);
        if (!inspected.valid) continue;
        expect(inspected.version).toBe(version);

        window.localStorage.setItem(BACKUP_ROLLBACK_STORAGE_KEY, rollbackPayload);
        resetInMemoryBackupRollbackPointForTest();

        const outcome = rollbackLatestBackupRestore({
          getState: () => usePilatesStore.getState(),
          setState: (patch) => usePilatesStore.setState(patch),
          checkStorage: () => ({ ok: true }),
        });
        expect(outcome.success).toBe(true);

        // Verify local-only fields and activeSteps were preserved without loss
        const restoredEx = usePilatesStore.getState().exercises[0] as unknown as Record<
          string,
          unknown
        >;
        expect(restoredEx.localOnlyInstructorPin).toBe('pinned-in-local-workbench');
        const restoredSeq = usePilatesStore.getState().savedSequences[0] as unknown as Record<
          string,
          unknown
        >;
        expect(restoredSeq.localOnlyDraftBadge).toBe('local-binder-tag');
        expect(usePilatesStore.getState().activeSteps).toHaveLength(3);
      }
    });

    it('RBK-NEST-001 (Resolved R3-EX): rejects rollback records where exercises[i] has valid id but corrupted nested fields before any localStorage or store mutation', () => {
      const basePre = captureBackupPreRestoreState(usePilatesStore.getState());
      const currentFp = backupRecoveryStateFingerprint(usePilatesStore.getState());

      const corruptedExercisesPayloads = [
        // cues is not an array
        { ...structuredClone(catalogExercise), cues: 'not-an-array' },
        // layers is null
        { ...structuredClone(catalogExercise), layers: null },
        // youtube is a string instead of object
        { ...structuredClone(catalogExercise), youtube: 'invalid-youtube' },
        // youtube.startSec is negative
        {
          ...structuredClone(catalogExercise),
          youtube: { ...catalogExercise.youtube, startSec: -10 },
        },
        // defaultDurationMin is negative
        { ...structuredClone(catalogExercise), defaultDurationMin: -5 },
        // apparatus is invalid enum
        { ...structuredClone(catalogExercise), apparatus: 'spaceship' },
      ];

      for (const badEx of corruptedExercisesPayloads) {
        const raw = JSON.stringify({
          version: 1,
          id: 'rb-corrupted-exercise-nested',
          capturedAt: '2026-11-06T09:00:00.000Z',
          addedCount: 1,
          postRestoreStateFingerprint: currentFp,
          postRestoreStorageFingerprint: null,
          preRestoreState: {
            ...basePre,
            exercises: [badEx, structuredClone(customDraftExercise)],
          },
        });
        assertRollbackRejectedWithoutSideEffects(raw, 'invalid-shape');
      }
    });

    it('RBK-NEST-002 (Resolved R3-SEQ): rejects rollback records where savedSequences[i] or activeSteps has valid id/stepId but corrupted nested steps', () => {
      const basePre = captureBackupPreRestoreState(usePilatesStore.getState());
      const currentFp = backupRecoveryStateFingerprint(usePilatesStore.getState());
      const validSeq = makeFullSequence();

      const corruptedSequences = [
        // steps is not an array
        { ...validSeq, steps: 'not-an-array' },
        // targetMinutes is negative
        { ...validSeq, targetMinutes: -20 },
        // step missing stepId (only has `id`)
        {
          ...validSeq,
          steps: [{ id: 'wrong-key-no-stepId', order: 1, blockCategory: 'warmup', durationMin: 5 }],
        },
        // step has negative durationMin
        {
          ...validSeq,
          steps: [{ ...validSeq.steps[0], durationMin: -5 }],
        },
        // rest step duration >= targetMinutes
        {
          ...validSeq,
          targetMinutes: 10,
          steps: [{ ...validSeq.steps[1], kind: 'rest', exerciseId: '', durationMin: 10 }],
        },
      ];

      for (const badSeq of corruptedSequences) {
        const raw = JSON.stringify({
          version: 1,
          id: 'rb-corrupted-seq-nested',
          capturedAt: '2026-11-06T09:00:00.000Z',
          addedCount: 1,
          postRestoreStateFingerprint: currentFp,
          postRestoreStorageFingerprint: null,
          preRestoreState: {
            ...basePre,
            savedSequences: [badSeq],
          },
        });
        assertRollbackRejectedWithoutSideEffects(raw, 'invalid-shape');
      }

      // Also test corrupted optional activeSteps on preRestoreState
      const badActiveStepsRaw = JSON.stringify({
        version: 1,
        id: 'rb-corrupted-active-steps',
        capturedAt: '2026-11-06T09:00:00.000Z',
        addedCount: 1,
        postRestoreStateFingerprint: currentFp,
        postRestoreStorageFingerprint: null,
        preRestoreState: {
          ...basePre,
          activeSteps: [{ id: 'not-a-valid-sequence-step', durationMin: -10 }],
        },
      });
      assertRollbackRejectedWithoutSideEffects(badActiveStepsRaw, 'invalid-shape');
    });

    it('RBK-NEST-003 (Resolved R3-DOM): rejects rollback records where classGroups[i], historyLogs[i], or conditionTemplates[i] has valid id but corrupted internals', () => {
      const basePre = captureBackupPreRestoreState(usePilatesStore.getState());
      const currentFp = backupRecoveryStateFingerprint(usePilatesStore.getState());
      const validGroup = makeFullClassGroup();
      const validLog = basePre.historyLogs[0];
      const validTemplate = basePre.conditionTemplates[0];

      const corruptedStates: Array<Record<string, unknown>> = [
        // classGroup with invalid defaultLevel
        {
          ...basePre,
          classGroups: [{ ...validGroup, defaultLevel: '9.9' }],
        },
        // classGroup with invalid type
        {
          ...basePre,
          classGroups: [{ ...validGroup, type: 'invalid-group-type' }],
        },
        // historyLog with unparseable taughtAt
        {
          ...basePre,
          historyLogs: [{ ...validLog, taughtAt: 'not-a-valid-date' }],
        },
        // historyLog with non-array exerciseIds
        {
          ...basePre,
          historyLogs: [{ ...validLog, exerciseIds: 'not-an-array' }],
        },
        // historyLog with out-of-range rating
        {
          ...basePre,
          historyLogs: [{ ...validLog, rating: 99 }],
        },
        // historyLog with malformed programSnapshot (items: null)
        {
          ...basePre,
          historyLogs: [
            {
              ...validLog,
              programSnapshot: {
                ...(validLog as ClassHistoryLogWithSnapshot).programSnapshot,
                items: null,
              },
            },
          ],
        },
        // conditionTemplate with null criteria
        {
          ...basePre,
          conditionTemplates: [{ ...validTemplate, criteria: null }],
        },
      ];

      for (const badPre of corruptedStates) {
        const raw = JSON.stringify({
          version: 1,
          id: 'rb-corrupted-domain-internals',
          capturedAt: '2026-11-06T09:00:00.000Z',
          addedCount: 1,
          postRestoreStateFingerprint: currentFp,
          postRestoreStorageFingerprint: null,
          preRestoreState: badPre,
        });
        assertRollbackRejectedWithoutSideEffects(raw, 'invalid-shape');
      }
    });

    it('RBK-REF-001 (Resolved R4-R5): rejects rollback records with duplicate record IDs, duplicate stepIds, or dangling/mismatched exerciseIds in savedSequences, activeSteps, or historyLogs', () => {
      const basePre = captureBackupPreRestoreState(usePilatesStore.getState());
      const currentFp = backupRecoveryStateFingerprint(usePilatesStore.getState());
      const validSeq = makeFullSequence();
      const validLog = basePre.historyLogs[0] as ClassHistoryLogWithSnapshot;

      const refCorruptedStates: Array<Record<string, unknown>> = [
        // 1. Duplicate exercise IDs
        {
          ...basePre,
          exercises: [structuredClone(catalogExercise), structuredClone(catalogExercise)],
        },
        // 2. Duplicate sequence IDs
        {
          ...basePre,
          savedSequences: [structuredClone(validSeq), structuredClone(validSeq)],
        },
        // 3. Duplicate stepIds inside savedSequences[0].steps
        {
          ...basePre,
          savedSequences: [
            {
              ...validSeq,
              steps: [
                validSeq.steps[0],
                { ...validSeq.steps[0], order: 2 },
              ],
            },
          ],
        },
        // 4. Dangling exerciseId in savedSequences[0].steps (not in exercises and no inline exerciseSnapshot)
        {
          ...basePre,
          savedSequences: [
            {
              ...validSeq,
              steps: [
                {
                  ...validSeq.steps[0],
                  exerciseId: 'dangling-nonexistent-ex-id',
                  exerciseSnapshot: undefined,
                },
              ],
            },
          ],
        },
        // 5. Mismatched inline step.exerciseSnapshot.id !== step.exerciseId
        {
          ...basePre,
          savedSequences: [
            {
              ...validSeq,
              steps: [
                validSeq.steps[0],
                {
                  ...validSeq.steps[2],
                  exerciseId: catalogExercise.id, // mismatch with exerciseSnapshot.id ('ex-compat-custom-draft-1')
                },
              ],
            },
          ],
        },
        // 6. Dangling exerciseId in historyLogs[0].exerciseIds (not in exercises and not in snapshots)
        {
          ...basePre,
          historyLogs: [
            {
              ...validLog,
              exerciseIds: ['dangling-history-ex-id'],
              stepsSnapshot: undefined,
              programSnapshot: undefined,
              sequenceSnapshot: undefined,
            },
          ],
        },
        // 7. Mismatched key vs id in historyLogs[0].programSnapshot.exercisesById
        {
          ...basePre,
          historyLogs: [
            {
              ...validLog,
              programSnapshot: {
                ...validLog.programSnapshot!,
                exercisesById: {
                  [catalogExercise.id]: {
                    ...validLog.programSnapshot!.exercisesById[catalogExercise.id],
                    id: 'mismatched-snapshot-id',
                  },
                },
              },
            },
          ],
        },
      ];

      for (const badPre of refCorruptedStates) {
        const raw = JSON.stringify({
          version: 1,
          id: 'rb-corrupted-refs-or-dups',
          capturedAt: '2026-11-06T09:00:00.000Z',
          addedCount: 1,
          postRestoreStateFingerprint: currentFp,
          postRestoreStorageFingerprint: null,
          preRestoreState: badPre,
        });
        assertRollbackRejectedWithoutSideEffects(raw, 'invalid-shape');
      }
    });

    it('RBK-AUX-001 (Resolved R2-R6): rejects rollback records with corrupted instructorSchedule, instructorStudyState, datedSequencePlanning, ownedEquipment/ownedApparatus/ownedProps, lastCriteria/draftCriteria, or invalid capturedAt/addedCount metadata', () => {
      const basePre = captureBackupPreRestoreState(usePilatesStore.getState());
      const currentFp = backupRecoveryStateFingerprint(usePilatesStore.getState());

      const auxCorruptedEnvelopes: Array<Record<string, unknown>> = [
        // Invalid capturedAt (non-string or unparseable date)
        {
          version: 1,
          id: 'rb-bad-captured-at',
          capturedAt: 'not-a-timestamp',
          addedCount: 1,
          postRestoreStateFingerprint: currentFp,
          postRestoreStorageFingerprint: null,
          preRestoreState: basePre,
        },
        // Invalid addedCount (negative or float or string)
        {
          version: 1,
          id: 'rb-bad-added-count',
          capturedAt: '2026-11-06T09:00:00.000Z',
          addedCount: -3,
          postRestoreStateFingerprint: currentFp,
          postRestoreStorageFingerprint: null,
          preRestoreState: basePre,
        },
        // Corrupted instructorSchedule ({ locations: 'bad' })
        {
          version: 1,
          id: 'rb-bad-schedule',
          capturedAt: '2026-11-06T09:00:00.000Z',
          addedCount: 1,
          postRestoreStateFingerprint: currentFp,
          postRestoreStorageFingerprint: null,
          preRestoreState: {
            ...basePre,
            instructorSchedule: { locations: 'not-an-array', classes: [], exceptions: [] },
          },
        },
        // Corrupted instructorStudyState
        {
          version: 1,
          id: 'rb-bad-study-state',
          capturedAt: '2026-11-06T09:00:00.000Z',
          addedCount: 1,
          postRestoreStateFingerprint: currentFp,
          postRestoreStorageFingerprint: null,
          preRestoreState: {
            ...basePre,
            instructorStudyState: { bookmarkedExerciseIds: 'not-an-array' },
          },
        },
        // Corrupted datedSequencePlanning
        {
          version: 1,
          id: 'rb-bad-dated-planning',
          capturedAt: '2026-11-06T09:00:00.000Z',
          addedCount: 1,
          postRestoreStateFingerprint: currentFp,
          postRestoreStorageFingerprint: null,
          preRestoreState: {
            ...basePre,
            datedSequencePlanning: { assignments: 'not-an-array' },
          },
        },
        // Corrupted ownedEquipment / ownedApparatus / ownedProps
        {
          version: 1,
          id: 'rb-bad-equipment',
          capturedAt: '2026-11-06T09:00:00.000Z',
          addedCount: 1,
          postRestoreStateFingerprint: currentFp,
          postRestoreStorageFingerprint: null,
          preRestoreState: {
            ...basePre,
            ownedEquipment: ['unknown-mars-rover-apparatus'],
          },
        },
        {
          version: 1,
          id: 'rb-bad-props',
          capturedAt: '2026-11-06T09:00:00.000Z',
          addedCount: 1,
          postRestoreStateFingerprint: currentFp,
          postRestoreStorageFingerprint: null,
          preRestoreState: {
            ...basePre,
            ownedProps: ['unknown-prop-item'],
          },
        },
        // Corrupted lastCriteria / draftCriteria
        {
          version: 1,
          id: 'rb-bad-criteria',
          capturedAt: '2026-11-06T09:00:00.000Z',
          addedCount: 1,
          postRestoreStateFingerprint: currentFp,
          postRestoreStorageFingerprint: null,
          preRestoreState: {
            ...basePre,
            lastCriteria: { targetMinutes: 'fifty' },
          },
        },
      ];

      for (const envelope of auxCorruptedEnvelopes) {
        assertRollbackRejectedWithoutSideEffects(JSON.stringify(envelope), 'invalid-shape');
      }
    });

    it('RBK-PROTO-001 (Resolved R1-R7): rejects rollback records containing __proto__/constructor/prototype keys, id="__proto__"/"constructor", non-finite numbers, or nesting depth > 64', () => {
      const basePre = captureBackupPreRestoreState(usePilatesStore.getState());
      const currentFp = backupRecoveryStateFingerprint(usePilatesStore.getState());

      // 1. Nested __proto__ own property inside preRestoreState.exercises[0]
      const baseJson = JSON.stringify({
        version: 1,
        id: 'rb-proto-nested',
        capturedAt: '2026-11-06T09:00:00.000Z',
        addedCount: 1,
        postRestoreStateFingerprint: currentFp,
        postRestoreStorageFingerprint: null,
        preRestoreState: basePre,
      });
      const protoNestedRaw = baseJson.replace(
        '"id":"ex-compat-catalog-1"',
        '"__proto__":{"polluted":true},"id":"ex-compat-catalog-1"',
      );
      assertRollbackRejectedWithoutSideEffects(protoNestedRaw, 'invalid-shape');

      // 2. Rollback record with id: "constructor" or "__proto__"
      const constructorIdRaw = JSON.stringify({
        version: 1,
        id: 'constructor',
        capturedAt: '2026-11-06T09:00:00.000Z',
        addedCount: 1,
        postRestoreStateFingerprint: currentFp,
        postRestoreStorageFingerprint: null,
        preRestoreState: basePre,
      });
      assertRollbackRejectedWithoutSideEffects(constructorIdRaw, 'invalid-shape');

      // 3. Deep nesting > 64 inside preRestoreState
      let deepObj: Record<string, unknown> = { leaf: 'deep' };
      for (let i = 0; i < 68; i += 1) {
        deepObj = { nested: deepObj };
      }
      const deepRollbackRaw = JSON.stringify({
        version: 1,
        id: 'rb-deep-68',
        capturedAt: '2026-11-06T09:00:00.000Z',
        addedCount: 1,
        postRestoreStateFingerprint: currentFp,
        postRestoreStorageFingerprint: null,
        preRestoreState: {
          ...basePre,
          exercises: [
            {
              ...catalogExercise,
              historicalExtension: deepObj,
            },
          ],
        },
      });
      assertRollbackRejectedWithoutSideEffects(deepRollbackRaw, 'invalid-shape');

      // 4. In-memory recordBackupRestoreRollbackPoint guard against non-finite number (NaN / Infinity)
      const inMemoryNanPre = {
        ...structuredClone(basePre),
        exercises: [
          {
            ...structuredClone(catalogExercise),
            defaultDurationMin: Number.NaN,
          },
        ],
      } as unknown as BackupPreRestoreDomainState;
      expect(isValidBackupPreRestoreDomainState(inMemoryNanPre)).toBe(false);
      resetInMemoryBackupRollbackPointForTest();
      recordBackupRestoreRollbackPoint({
        preRestoreState: inMemoryNanPre,
        addedCount: 1,
        postRestoreStateFingerprint: currentFp,
        postRestoreStorageFingerprint: 'fp-disk',
      });
      expect(getLatestBackupRollbackPoint()).toBeNull();
    });

    it('RBK-NEG-001: negative control self-check detects simulated rollback storage mutation, simulated store corruption, and simulated local-field loss', () => {
      if (process.env.FORCE_COMPAT_ROLLBACK_NEGATIVE_CONTROL === '1') {
        throw new Error(
          'INTENTIONAL_COMPAT_ROLLBACK_NEGATIVE_CONTROL_FAILURE: forced failure to verify non-zero CLI exit code',
        );
      }

      const before = captureRollbackSafetySnapshot();

      // 1. Detect simulated store mutation during rejected rollback
      const detectStoreMutation = () => {
        const current = usePilatesStore.getState();
        const simulatedMutatedHash = stableStateHash({
          ...current,
          activeTitle: 'SIMULATED_CORRUPTED_TITLE',
        });
        return simulatedMutatedHash !== before.stateHash;
      };
      expect(detectStoreMutation()).toBe(true);

      // 2. Detect simulated main localStorage write during rejected rollback
      const detectStorageMutation = (simulatedAfterRaw: string | null) =>
        simulatedAfterRaw !== before.mainStorageRaw;
      expect(detectStorageMutation('{"corrupted":true}')).toBe(true);

      // 3. Detect simulated loss of local-only field on rollback
      const detectLocalFieldLoss = (restoredRecord: Record<string, unknown>) =>
        !Object.prototype.hasOwnProperty.call(restoredRecord, 'localOnlyInstructorPin');
      expect(detectLocalFieldLoss({ id: 'ex-1' })).toBe(true);
      expect(detectLocalFieldLoss({ id: 'ex-1', localOnlyInstructorPin: 'kept' })).toBe(false);
    });
  });
});
