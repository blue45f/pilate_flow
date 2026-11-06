import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseRecoverableNativeBackup } from '../../backend/backupValidation';
import { INITIAL_CLASS_GROUPS, INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { syncAccountWorkspace } from '../lib/accountStorage';
import { useCloudSession } from '../lib/cloudSync';
import { cloudBackupDataSchema } from '../schemas/cloudBackupSchema';
import { getRecoveryStorageStatus, usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import type {
  AutoGenerateCriteria,
  PilatesExercise,
  SavedSequence,
  SequenceStep,
} from '../types/pilates';
import type { ClassHistoryLogWithSnapshot } from '../types/teachingHistorySnapshot';
import { inspectBackupRecovery } from './backupRecoveryInspection';
import {
  createReusableBlock,
  insertReusableBlockIntoSequence,
  linkHumanDraftToSequence,
  updateReusableBlockTemplate,
} from './hierarchyModel';
import { createHumanDraftRepository } from './humanMovementCreation';
import {
  attachProgramSnapshotToHistoryLog,
  buildCompletionFingerprint,
  buildTeachingProgramSnapshot,
  cloneTeachingHistoryToNextClassDraft,
  collectMissingSnapshotExercises,
  createTeachingExerciseSnapshot,
  findDuplicateCompletedHistoryLog,
  formatTeachingHistorySnapshotText,
  hasExerciseDriftedFromSnapshot,
  reconstructExerciseFromSnapshot,
  resolveTeachingHistoryView,
} from './teachingHistorySnapshot';

const originalStore = usePilatesStore.getState();
const originalCloud = useCloudSession.getState();

describe('teachingHistorySnapshot utility & P1/P3 contracts', () => {
  let warmEx: PilatesExercise;
  let coreEx: PilatesExercise;
  let steps: SequenceStep[];
  let criteria: AutoGenerateCriteria;

  beforeEach(() => {
    localStorage.clear();
    warmEx = {
      ...syntheticPlanningExercise('reformer', 'warmup', 'alpha', false),
      nameKo: '원본 풋워크 웜업',
      nameEn: 'Original Footwork Warmup',
      springs: '2 Red + 1 Blue',
      cues: ['뒤꿈치를 모으고 골반 중립을 유지하세요.'],
      layers: {
        easy: '가벼운 가동 범위로 진행',
        standard: '표준 스프링에서 정교한 정렬 유지',
        hard: '템포 변형과 코어 제어 강화',
      },
    };
    coreEx = {
      ...syntheticPlanningExercise('reformer', 'core', 'beta', false),
      nameKo: '원본 헌드레드 코어',
      nameEn: 'Original Hundred Core',
      springs: '1 Red + 1 Blue',
      cues: ['견갑 하각을 바닥에서 띄우고 호흡을 유지하세요.'],
      layers: {
        easy: '테이블탑 자세 유지',
        standard: '사선 다리 뻗기',
        hard: '낮은 각도에서 펌핑 유지',
      },
    };
    steps = [
      {
        stepId: 'snap-step-1',
        order: 1,
        exerciseId: warmEx.id,
        blockCategory: 'warmup',
        durationMin: 8,
        explanationSec: 25,
        transitionSec: 15,
        selectedLayer: 'standard',
        customSpringOverride: '2 Red',
        repetitions: 10,
        sets: 2,
        instructorNote: '첫 블록 골반 정렬 체크',
      },
      {
        stepId: 'snap-step-rest',
        order: 2,
        kind: 'rest',
        exerciseId: '',
        blockCategory: 'core',
        durationMin: 2,
        selectedLayer: 'standard',
        instructorNote: '스트랩 세팅 전환 및 수분 섭취',
        locked: true,
      },
      {
        stepId: 'snap-step-2',
        order: 3,
        exerciseId: coreEx.id,
        blockCategory: 'core',
        durationMin: 12,
        explanationSec: 30,
        transitionSec: 20,
        selectedLayer: 'hard',
        repetitions: 8,
        sets: 3,
        sideMode: 'left-then-right',
        instructorNote: '편측 밸런스 집중',
      },
    ];
    criteria = {
      apparatus: 'reformer',
      ownedApparatus: ['reformer'],
      availableEquipment: ['reformer'],
      level: '1.5',
      focusPreset: 'full-body',
      preferredProps: ['none'],
      excludeDaysWindow: 14,
      targetMinutes: 22,
      restMinutes: 2,
      targetGroupId: INITIAL_CLASS_GROUPS[0].id,
      defaultLayer: 'standard',
    };

    usePilatesStore.setState(
      {
        ...originalStore,
        exercises: [...INITIAL_EXERCISES, structuredClone(warmEx), structuredClone(coreEx)],
        savedSequences: [],
        historyLogs: [],
        classGroups: INITIAL_CLASS_GROUPS,
        activeSequenceId: 'seq-snap-test',
        activeTitle: '리포머 코어 집중 프로그램',
        activeSubtitle: '화요 오전 정규반',
        activeSteps: structuredClone(steps),
        activeApparatus: 'reformer',
        activeLevel: '1.5',
        activeTargetMinutes: 22,
        activeTargetGroupId: INITIAL_CLASS_GROUPS[0].id,
        draftCriteria: structuredClone(criteria),
        lastCriteria: structuredClone(criteria),
      },
      true,
    );
  });

  afterEach(() => {
    usePilatesStore.setState(originalStore, true);
    useCloudSession.setState(originalCloud, true);
    localStorage.clear();
  });

  it('captures an immutable snapshot of date, movements, blocks, order, and timings independent of later catalog or block edits', () => {
    const snapshot = buildTeachingProgramSnapshot({
      sequenceId: 'seq-snap-test',
      sequenceTitle: '리포머 코어 집중 프로그램',
      sequenceSubtitle: '화요 오전 정규반',
      sourceKind: 'saved-sequence',
      taughtAt: '2026-11-05T10:30:00.000Z',
      groupId: INITIAL_CLASS_GROUPS[0].id,
      steps,
      exercises: [warmEx, coreEx],
      actualDurationSec: 1280,
      actualRestDurationSec: 110,
      criteriaSnapshot: criteria,
    });

    expect(snapshot.recordKind).toBe('completed-history');
    expect(snapshot.sourceKind).toBe('saved-sequence');
    expect(snapshot.taughtAt).toBe('2026-11-05T10:30:00.000Z');
    expect(snapshot.timing).toEqual({
      plannedTotalSec: 1320,
      plannedExerciseSec: 1200,
      plannedRestSec: 120,
      actualDurationSec: 1280,
      actualRestDurationSec: 110,
      actualExerciseDurationSec: 1170,
    });
    expect(snapshot.items.map((item) => item.order)).toEqual([1, 2, 3]);
    expect(snapshot.items[0]).toMatchObject({
      order: 1,
      kind: 'exercise',
      exerciseId: warmEx.id,
      blockCategory: 'warmup',
      blockNameKo: '호흡 & 골반/흉곽 예열',
      classSection: 'opening',
      durationMin: 8,
      explanationSec: 25,
      transitionSec: 15,
      movementSec: 440,
      selectedLayer: 'standard',
      effectiveSprings: '2 Red',
      repetitions: 10,
      sets: 2,
    });

    // Mutate the original exercises and source sequence after the class was recorded
    const mutatedWarm: PilatesExercise = {
      ...warmEx,
      nameKo: '나중에 수정된 풋워크 이름',
      nameEn: 'Mutated Footwork Name',
      blockCategory: 'lower-body',
      defaultDurationMin: 15,
      springs: '3 Red',
      cues: ['완전히 바뀐 큐잉'],
      layers: {
        easy: '변경된 이지',
        standard: '변경된 스탠다드',
        hard: '변경된 하드',
      },
    };
    const mutatedSavedSequence: SavedSequence = {
      id: 'seq-snap-test',
      title: '나중에 변경된 시퀀스 제목',
      subtitle: '변경된 부제목',
      apparatus: 'reformer',
      level: '2.0',
      targetMinutes: 50,
      focusTags: ['하체'],
      steps: [{ ...steps[0], durationMin: 20, blockCategory: 'lower-body' }],
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-06T00:00:00.000Z',
      taughtCount: 1,
    };

    const log: ClassHistoryLogWithSnapshot = {
      id: 'log-immutable-1',
      sequenceId: 'seq-snap-test',
      sequenceTitle: '리포머 코어 집중 프로그램',
      groupId: INITIAL_CLASS_GROUPS[0].id,
      groupName: INITIAL_CLASS_GROUPS[0].name,
      taughtAt: '2026-11-05T10:30:00.000Z',
      apparatus: 'reformer',
      level: '1.5',
      exerciseIds: [warmEx.id, coreEx.id],
      rating: 5,
      intensity: 'moderate',
      instructorReflection: '당시 진행 완료 기록',
      actualDurationSec: 1280,
      actualRestDurationSec: 110,
      stepsSnapshot: structuredClone(steps),
      criteriaSnapshot: structuredClone(criteria),
      programSnapshot: snapshot,
    };

    // Even when mutatedWarm is in the catalog and coreEx is completely deleted from the catalog:
    const currentCatalogMap = new Map<string, PilatesExercise>([[mutatedWarm.id, mutatedWarm]]);
    const view = resolveTeachingHistoryView(log, currentCatalogMap, [mutatedSavedSequence]);

    // Historical view preserves the exact snapshot from teaching time:
    expect(view.sequenceTitle).toBe('리포머 코어 집중 프로그램');
    expect(view.steps[0].nameKo).toBe('원본 풋워크 웜업');
    expect(view.steps[0].blockCategory).toBe('warmup');
    expect(view.steps[0].blockNameKo).toBe('호흡 & 골반/흉곽 예열');
    expect(view.steps[0].durationMin).toBe(8);
    expect(view.steps[0].effectiveSprings).toBe('2 Red');
    expect(view.steps[0].selectedLayerDescription).toBe('표준 스프링에서 정교한 정렬 유지');
    expect(view.steps[0].cues).toEqual(['뒤꿈치를 모으고 골반 중립을 유지하세요.']);
    expect(view.steps[0].isCatalogModified).toBe(true);

    expect(view.steps[1].kind).toBe('rest');
    expect(view.steps[1].durationMin).toBe(2);

    expect(view.steps[2].nameKo).toBe('원본 헌드레드 코어');
    expect(view.steps[2].blockCategory).toBe('core');
    expect(view.steps[2].durationMin).toBe(12);
    expect(view.steps[2].selectedLayerDescription).toBe('낮은 각도에서 펌핑 유지');
    expect(view.steps[2].isCatalogDeleted).toBe(true);
    expect(view.steps[2].isMissingUnrecoverable).toBe(false);

    expect(view.hasPreservedSnapshot).toBe(true);
    expect(view.hasCatalogDrift).toBe(true);
    expect(view.modifiedExerciseIds).toEqual([warmEx.id]);
    expect(view.deletedExerciseIds).toEqual([coreEx.id]);
    expect(view.missingUnrecoverableExerciseIds).toEqual([]);
    expect(view.sourceSequenceStatus).toBe('modified');
    expect(view.canCopyToNextClass).toBe(true);

    // Reconstruct deleted exercise from snapshot for next-class copy
    const restoredCore = reconstructExerciseFromSnapshot(snapshot.exercisesById[coreEx.id]);
    expect(restoredCore.nameKo).toBe('원본 헌드레드 코어');
    expect(
      hasExerciseDriftedFromSnapshot(createTeachingExerciseSnapshot(coreEx), restoredCore),
    ).toBe(false);

    const formatted = formatTeachingHistorySnapshotText(view);
    expect(formatted).toContain('[진행 완료 수업 이력 스냅샷] 리포머 코어 집중 프로그램');
    expect(formatted).toContain('원본 풋워크 웜업');
    expect(formatted).toContain('원본 헌드레드 코어');
    expect(formatted).not.toContain('나중에 수정된 풋워크 이름');
  });

  it('preserves P1 4-tier hierarchy snapshots (ReusableBlock + HumanMovementDraft + ClassSequenceSnapshot) when original blocks or drafts are later modified', () => {
    // 1. Create a P1 ReusableBlock and insert into sequence
    const reusableBlockV1 = createReusableBlock(
      {
        id: 'block-reformer-opening',
        title: '당시 리포머 도입 블록',
        sectionRole: 'preparation',
        items: [{ exerciseId: warmEx.id }, { exerciseId: coreEx.id }],
      },
      [warmEx, coreEx],
    );
    const { steps: blockInsertedSteps } = insertReusableBlockIntoSequence([], reusableBlockV1, {
      instanceId: 'block-inst-1',
    });

    // 2. Create a P1 HumanMovementDraft and link to sequence
    const draftRepo = createHumanDraftRepository();
    const saveRes = draftRepo.saveIdeaDraft({
      ideaLine: '당시 한 줄 아이디어: 리포머 롱스트레치 변형 홀드',
      workingNameKo: '당시 창작 롱스트레치 홀드',
      apparatus: 'reformer',
      defaultDurationMin: 6,
    });
    expect(saveRes.ok).toBe(true);
    const humanDraftV1 = saveRes.draft!;
    const linked = linkHumanDraftToSequence(blockInsertedSteps, humanDraftV1);

    // 3. Build completed teaching program snapshot
    const snapshot = buildTeachingProgramSnapshot({
      sequenceId: 'seq-hierarchy-1',
      sequenceTitle: '4단계 계층 통합 수업',
      sequenceSubtitle: '블록 + 창작 초안 포함',
      sourceKind: 'saved-sequence',
      sourceSequenceVersion: 2,
      taughtAt: '2026-11-05T14:00:00.000Z',
      groupId: INITIAL_CLASS_GROUPS[0].id,
      steps: linked.steps,
      exercises: [warmEx, coreEx],
      humanDrafts: [humanDraftV1],
      reusableBlocks: [reusableBlockV1],
      actualDurationSec: 1560,
    });

    expect(snapshot.blockSnapshots).toHaveLength(1);
    expect(snapshot.blockSnapshots?.[0]).toMatchObject({
      blockInstanceId: 'block-inst-1',
      sourceBlockId: 'block-reformer-opening',
      sourceBlockVersion: 1,
      sourceBlockTitle: '당시 리포머 도입 블록',
      detached: false,
    });
    expect(snapshot.sequenceSnapshot).toBeDefined();
    expect(snapshot.items[2]).toMatchObject({
      exerciseId: humanDraftV1.id,
      humanDraftId: humanDraftV1.id,
      humanDraftRevision: 1,
    });

    // 4. Later mutate the ReusableBlock template (v1 -> v2) and HumanMovementDraft (rev 1 -> rev 2)
    const mutatedBlocksV2 = updateReusableBlockTemplate(
      [reusableBlockV1],
      reusableBlockV1.id,
      {
        title: '나중에 바뀐 블록 제목 v2',
        items: [{ ...reusableBlockV1.items[0], durationMin: 15 }],
      },
      [warmEx, coreEx],
    );
    const updatedDraftRes = draftRepo.refineMetadata(humanDraftV1.id, {
      ideaLine: '나중에 완전히 수정된 창작 동작 아이디어',
      workingNameKo: '나중에 바뀐 창작 동작 이름',
    });
    expect(updatedDraftRes.ok).toBe(true);
    const humanDraftV2 = updatedDraftRes.draft!;

    const log: ClassHistoryLogWithSnapshot = {
      id: 'log-hier-1',
      sequenceId: 'seq-hierarchy-1',
      sequenceTitle: '4단계 계층 통합 수업',
      groupId: INITIAL_CLASS_GROUPS[0].id,
      groupName: INITIAL_CLASS_GROUPS[0].name,
      taughtAt: '2026-11-05T14:00:00.000Z',
      apparatus: 'reformer',
      level: '1.5',
      exerciseIds: [warmEx.id, coreEx.id, humanDraftV1.id],
      rating: 5,
      intensity: 'intense',
      instructorReflection: '계층 스냅샷 보존 확인',
      stepsSnapshot: linked.steps,
      programSnapshot: snapshot,
      sequenceSnapshot: snapshot.sequenceSnapshot,
    };

    const view = resolveTeachingHistoryView(
      log,
      new Map([
        [warmEx.id, warmEx],
        [coreEx.id, coreEx],
      ]),
      [],
      {
        reusableBlocks: mutatedBlocksV2,
        humanDrafts: [humanDraftV2],
      },
    );

    // Past history still shows the exact v1 block title & rev.1 human draft name/idea!
    expect(view.blockSnapshots[0].sourceBlockTitle).toBe('당시 리포머 도입 블록');
    expect(view.blockSnapshots[0].sourceBlockVersion).toBe(1);
    expect(view.steps[0].sourceBlockTitle).toBe('당시 리포머 도입 블록');
    expect(view.steps[0].isBlockTemplateModified).toBe(true);
    expect(view.modifiedBlockIds).toEqual(['block-reformer-opening']);

    expect(view.steps[2].nameKo).toBe('당시 창작 롱스트레치 홀드');
    expect(view.steps[2].ideaLineSnapshot).toBe(
      '당시 한 줄 아이디어: 리포머 롱스트레치 변형 홀드',
    );
    expect(view.steps[2].humanDraftRevision).toBe(1);
    expect(view.steps[2].isHumanDraftModified).toBe(true);
    expect(view.modifiedHumanDraftIds).toEqual([humanDraftV1.id]);
    expect(view.hasCatalogDrift).toBe(true);
    expect(view.canCopyToNextClass).toBe(true);

    // Clone to next class draft via P1 ClassSequenceSnapshot bridge
    const clonedDraft = cloneTeachingHistoryToNextClassDraft(log, [warmEx, coreEx]);
    expect(clonedDraft).not.toBeNull();
    expect(clonedDraft?.sourceProvenance.kind).toBe('history-snapshot');
    expect(clonedDraft?.restoredExercises.some((ex) => ex.id === humanDraftV1.id)).toBe(true);
    expect(collectMissingSnapshotExercises(log, [warmEx, coreEx]).map((ex) => ex.id)).toEqual([
      humanDraftV1.id,
    ]);
  });

  it('passes P1 storage/backup/recovery contracts (cloudBackupDataSchema, parseRecoverableNativeBackup, inspectBackupRecovery) with 0 stripped fields and P3 account workspace isolation', () => {
    syncAccountWorkspace('instructor-a');

    const snapshot = buildTeachingProgramSnapshot({
      sequenceId: 'seq-snap-test',
      sequenceTitle: '리포머 코어 집중 프로그램',
      sequenceSubtitle: '화요 오전 정규반',
      sourceKind: 'active-draft',
      taughtAt: '2026-11-05T11:00:00.000Z',
      groupId: INITIAL_CLASS_GROUPS[0].id,
      steps,
      exercises: [warmEx, coreEx],
      actualDurationSec: 1320,
      actualRestDurationSec: 120,
      criteriaSnapshot: criteria,
    });

    usePilatesStore.getState().logClassSession({
      sequenceId: 'seq-snap-test',
      groupId: INITIAL_CLASS_GROUPS[0].id,
      taughtAt: '2026-11-05T11:00:00.000Z',
      rating: 5,
      intensity: 'moderate',
      instructorReflection: 'P1 계약 검증 기록',
      actualDurationSec: 1320,
      actualRestDurationSec: 120,
      stepsSnapshot: structuredClone(steps),
      criteriaSnapshot: structuredClone(criteria),
    });
    const createdId = usePilatesStore.getState().historyLogs[0].id;
    attachProgramSnapshotToHistoryLog(createdId, snapshot, usePilatesStore.setState);

    const exportedRaw = usePilatesStore.getState().exportBackup();
    const parsedEnvelope = JSON.parse(exportedRaw);

    // 1. P1 cloudBackupDataSchema check
    const schemaCheck = cloudBackupDataSchema.safeParse(parsedEnvelope.data);
    expect(schemaCheck.success).toBe(true);

    // 2. P1 backend parseRecoverableNativeBackup check (discardsFields === false)
    const backendParsed = parseRecoverableNativeBackup(exportedRaw);
    expect(backendParsed.historyLogs).toHaveLength(1);
    expect((backendParsed.historyLogs[0] as ClassHistoryLogWithSnapshot).programSnapshot).toEqual(
      snapshot,
    );

    // 3. P1 inspectBackupRecovery + restoreBackup roundtrip
    usePilatesStore.setState({ historyLogs: [] });
    const inspection = inspectBackupRecovery(exportedRaw, usePilatesStore.getState());
    expect(inspection.success).toBe(true);
    const restoreResult = usePilatesStore.getState().restoreBackup(exportedRaw);
    expect(restoreResult.success).toBe(true);
    expect(
      (usePilatesStore.getState().historyLogs[0] as ClassHistoryLogWithSnapshot).programSnapshot,
    ).toEqual(snapshot);

    // 4. P1 localStorage guard check
    expect(getRecoveryStorageStatus().ok).toBe(true);

    // 5. P3 multi-account workspace isolation (Account A -> Account B -> Account A)
    syncAccountWorkspace('instructor-b');
    expect(usePilatesStore.getState().historyLogs).toHaveLength(0);

    syncAccountWorkspace('instructor-a');
    const restoredLogsA = usePilatesStore.getState().historyLogs as ClassHistoryLogWithSnapshot[];
    expect(restoredLogsA).toHaveLength(1);
    expect(restoredLogsA[0].programSnapshot?.sourceSequenceTitle).toBe('리포머 코어 집중 프로그램');

    // 6. P3 cloud session read-only interface mock verification
    useCloudSession.setState({
      phase: 'signed-in',
      user: {
        userId: 'instructor-a',
        email: 'instructor@example.com',
        name: '김강사',
        picture: undefined,
        scope: 'authenticated',
      },
      backup: {
        exists: true,
        revision: 'rev-snap-1',
        updatedAt: '2026-11-05T11:05:00.000Z',
        bytes: exportedRaw.length,
      },
      error: null,
      conflict: false,
      pendingSave: false,
      pendingDelete: false,
    });
    expect(useCloudSession.getState().phase).toBe('signed-in');
    expect(useCloudSession.getState().backup?.revision).toBe('rev-snap-1');
  });

  it('detects duplicate completed sessions while allowing distinct sessions', () => {
    const baseCandidate = {
      sequenceId: 'seq-snap-test',
      groupId: INITIAL_CLASS_GROUPS[0].id,
      taughtAt: '2026-11-05T11:00:00.000Z',
      stepsSnapshot: structuredClone(steps),
      actualDurationSec: 1320,
      actualRestDurationSec: 120,
    };
    const fp1 = buildCompletionFingerprint({
      ...baseCandidate,
      steps: baseCandidate.stepsSnapshot,
    });
    const fp2 = buildCompletionFingerprint({
      ...baseCandidate,
      steps: structuredClone(steps),
    });
    expect(fp1).toBe(fp2);

    const existingLog: ClassHistoryLogWithSnapshot = {
      id: 'log-existing-1',
      sequenceId: 'seq-snap-test',
      sequenceTitle: '리포머 코어 집중 프로그램',
      groupId: INITIAL_CLASS_GROUPS[0].id,
      groupName: INITIAL_CLASS_GROUPS[0].name,
      taughtAt: '2026-11-05T11:00:00.000Z',
      apparatus: 'reformer',
      level: '1.5',
      exerciseIds: [warmEx.id, coreEx.id],
      rating: 4,
      intensity: 'moderate',
      instructorReflection: '첫 완료 기록',
      actualDurationSec: 1320,
      actualRestDurationSec: 120,
      stepsSnapshot: structuredClone(steps),
    };

    // Exact duplicate is caught
    expect(findDuplicateCompletedHistoryLog([existingLog], baseCandidate)?.id).toBe(
      'log-existing-1',
    );
    // Within 60s window for same session completion is caught when timeWindowMs is set
    expect(
      findDuplicateCompletedHistoryLog(
        [existingLog],
        { ...baseCandidate, taughtAt: '2026-11-05T11:00:15.000Z' },
        { timeWindowMs: 60_000 },
      )?.id,
    ).toBe('log-existing-1');
    // Different date is NOT a duplicate
    expect(
      findDuplicateCompletedHistoryLog([existingLog], {
        ...baseCandidate,
        taughtAt: '2026-11-06T11:00:00.000Z',
      }),
    ).toBeNull();
    // Different taught steps is NOT a duplicate
    expect(
      findDuplicateCompletedHistoryLog([existingLog], {
        ...baseCandidate,
        stepsSnapshot: [steps[0]],
      }),
    ).toBeNull();
  });
});
