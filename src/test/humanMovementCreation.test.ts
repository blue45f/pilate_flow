import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SUBJECTIVE_SAFETY_BOUNDARY,
  addModificationLogToDraft,
  addPhotoReferenceToDraft,
  addSubjectiveFeelToDraft,
  convertHumanDraftToPilatesExercise,
  createHumanDraftRepository,
  createHumanMovementIdeaDraft,
  createMovementSnapshotFromHumanDraft,
  evaluateDraftStageReadiness,
  refineHumanDraftMetadata,
  restoreHumanDraftRevision,
} from '../utils/humanMovementCreation';

describe('humanMovementCreation — Progressive Human-Created Movement Drafts & Safety Boundaries', () => {
  it('1. saves a minimal 1-line idea draft with zero classification, anatomy, equipment, duration, or L/R fields and roundtrips via backup', () => {
    const draft = createHumanMovementIdeaDraft({
      id: 'draft-idea-minimal-1',
      ideaLine: '풋바에 한 발만 올리고 골반 수평 유지하며 가볍게 밀어보는 감각 탐색',
      now: '2026-03-30T09:00:00.000Z',
    });

    expect(draft.id).toBe('draft-idea-minimal-1');
    expect(draft.sourceOrigin).toBe('human-created');
    expect(draft.completenessStage).toBe('idea-only');
    expect(draft.revision).toBe(1);
    expect(draft.ideaLine).toBe(
      '풋바에 한 발만 올리고 골반 수평 유지하며 가볍게 밀어보는 감각 탐색',
    );

    // Omitted fields must remain undefined (not forced upfront)
    expect(draft.workingNameKo).toBeUndefined();
    expect(draft.apparatus).toBeUndefined();
    expect(draft.blockCategory).toBeUndefined();
    expect(draft.sectionRole).toBeUndefined();
    expect(draft.level).toBeUndefined();
    expect(draft.defaultDurationMin).toBeUndefined();
    expect(draft.isUnilateral).toBeUndefined();
    expect(draft.sideMode).toBeUndefined();
    expect(draft.spinalPlanes).toBeUndefined();
    expect(draft.targetMuscles).toBeUndefined();
    expect(draft.bodyPosition).toBeUndefined();

    expect(draft.feelLogs).toEqual([]);
    expect(draft.modificationLogs).toEqual([]);
    expect(draft.photoReferences).toEqual([]);
    expect(draft.safetyBoundary).toEqual(DEFAULT_SUBJECTIVE_SAFETY_BOUNDARY);
    expect(draft.revisionHistory).toHaveLength(1);
    expect(draft.revisionHistory[0].revision).toBe(1);
    expect(draft.revisionHistory[0].changeType).toBe('initial-idea');
    expect(Object.isFrozen(draft.revisionHistory)).toBe(true);
    expect(Object.isFrozen(draft.revisionHistory[0].contentSnapshot)).toBe(true);

    // Export and restore cleanly via repository
    const repo = createHumanDraftRepository({ initialDrafts: [draft] });
    const exportedJson = repo.exportBackup('2026-03-30T09:05:00.000Z');
    const targetRepo = createHumanDraftRepository();
    const restoreRes = targetRepo.restoreBackup(exportedJson);

    expect(restoreRes.ok).toBe(true);
    expect(targetRepo.drafts).toHaveLength(1);
    expect(targetRepo.drafts[0]).toEqual(draft);
  });

  it('2. progressively appends subjective feel notes, modification points, local photo references, and optional metadata', () => {
    const v1 = createHumanMovementIdeaDraft({
      id: 'draft-progressive-1',
      ideaLine: '스트랩을 팔꿈치에 걸고 흉추 회전을 유도하는 시티드 변형',
      now: '2026-03-30T10:00:00.000Z',
    });
    expect(v1.completenessStage).toBe('idea-only');

    const v2 = addSubjectiveFeelToDraft(v1, {
      id: 'feel-1',
      feelNoteKo: '직접 해보니 손목 부담이 줄어들고 능형근·외복사근 연결감이 또렷하게 느껴짐',
      perceivedIntensity: 'moderate',
      cautionFeelKo: '어깨가 거상되기 쉬워 날개뼈 하강 큐잉 먼저 필요',
      now: '2026-03-30T10:10:00.000Z',
    });
    expect(v2.revision).toBe(2);
    expect(v2.completenessStage).toBe('practiced-recorded');
    expect(v2.feelLogs).toHaveLength(1);
    expect(v2.feelLogs[0].feelNoteKo).toContain('손목 부담이 줄어들고');
    expect(v2.feelLogs[0].evaluationBasis).toBe('subjective-instructor-feel');
    expect(v2.feelLogs[0].objectiveEfficacyClaimed).toBe(false);
    expect(v2.feelLogs[0].safetyGuaranteed).toBe(false);
    expect(v2.feelLogs[0].expertVerified).toBe(false);

    const v3 = addModificationLogToDraft(v2, {
      id: 'mod-1',
      modificationPointKo: '초보자에게는 파랑 스프링 1개 대신 노랑 1개로 시작하는 것이 안정적',
      setupOrSpringChangeKo: '1B -> 1Y 하향 조정',
      cueChangeKo: '갈비뼈 닫기보다 정수리 길어지기 큐잉 우선',
      now: '2026-03-30T10:20:00.000Z',
    });
    expect(v3.revision).toBe(3);
    expect(v3.modificationLogs).toHaveLength(1);
    expect(v3.modificationLogs[0].appliedToRevision).toBe(3);

    const v4 = addPhotoReferenceToDraft(v3, {
      id: 'photo-1',
      localRefUri: 'local-photo://drafts/seated-elbow-strap-setup.jpg',
      captionKo: '팔꿈치 스트랩 걸기 세팅 각도',
      angleTag: 'setup',
      now: '2026-03-30T10:25:00.000Z',
    });
    expect(v4.revision).toBe(4);
    expect(v4.photoReferences).toHaveLength(1);
    expect(v4.photoReferences[0].externalAiUploadAllowed).toBe(false);

    const v5 = refineHumanDraftMetadata(v4, {
      workingNameKo: '팔꿈치 스트랩 시티드 흉추 회전',
      apparatus: 'reformer',
      sectionRole: 'main',
      blockCategory: 'upper-body',
      level: '1.5',
      defaultDurationMin: 5,
      defaultRepetitions: 8,
      defaultSets: 2,
      isUnilateral: true,
      sideMode: 'left-then-right',
      springs: '1Y',
      now: '2026-03-30T10:30:00.000Z',
    });
    expect(v5.revision).toBe(5);
    expect(v5.completenessStage).toBe('class-ready');
    expect(v5.workingNameKo).toBe('팔꿈치 스트랩 시티드 흉추 회전');
    expect(v5.apparatus).toBe('reformer');
    expect(v5.defaultDurationMin).toBe(5);
    expect(v5.sideMode).toBe('left-then-right');
  });

  it('3. enforces epistemic & safety boundaries: rejects objective efficacy/safety claims and blocks external https:// photo URLs', () => {
    const draft = createHumanMovementIdeaDraft({
      id: 'draft-safety-1',
      ideaLine: '캐딜락 롤다운 바를 잡고 한 다리 브릿징 변형',
    });

    expect(draft.safetyBoundary.aiSafetyGuaranteed).toBe(false);
    expect(draft.safetyBoundary.objectiveEfficacyClaimed).toBe(false);
    expect(draft.safetyBoundary.expertVerified).toBe(false);
    expect(draft.safetyBoundary.evaluationBasis).toBe('subjective-instructor-feel');

    // Attempt to mark subjective feel as objective efficacy, safety guarantee, or expert verification must throw
    expect(() =>
      addSubjectiveFeelToDraft(draft, {
        feelNoteKo: '둔근 자극이 강하게 느껴짐',
        objectiveEfficacyClaimed: true,
      }),
    ).toThrow(/EPISTEMIC_BOUNDARY_VIOLATION/);

    expect(() =>
      addSubjectiveFeelToDraft(draft, {
        feelNoteKo: '허리가 편안함',
        safetyGuaranteed: true,
      }),
    ).toThrow(/EPISTEMIC_BOUNDARY_VIOLATION/);

    expect(() =>
      addSubjectiveFeelToDraft(draft, {
        feelNoteKo: '골반 교정됨',
        expertVerified: true,
      }),
    ).toThrow(/EPISTEMIC_BOUNDARY_VIOLATION/);

    // External http/https photo URLs or externalAiUploadAllowed: true must be rejected
    expect(() =>
      addPhotoReferenceToDraft(draft, {
        localRefUri: 'https://cdn.example.com/member-pose.jpg',
        captionKo: '외부 업로드 시도',
      }),
    ).toThrow(/로컬 참조/);

    expect(() =>
      addPhotoReferenceToDraft(draft, {
        localRefUri: 'local-photo://pose-1.png',
        externalAiUploadAllowed: true,
      }),
    ).toThrow(/EXTERNAL_PHOTO_UPLOAD_FORBIDDEN/);
  });

  it('4. preserves user input and existing drafts on validation failure and storage write failure', () => {
    let shouldFailStorage = false;
    const memoryMap = new Map<string, string>();
    const storageAdapter = {
      getItem: (key: string) => memoryMap.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (shouldFailStorage) {
          throw new Error('QuotaExceededError: 로컬 스토리지 용량이 부족합니다.');
        }
        memoryMap.set(key, value);
      },
    };

    const repo = createHumanDraftRepository({ storage: storageAdapter });

    // Valid initial save
    const saved = repo.saveIdeaDraft({
      id: 'draft-preserve-1',
      ideaLine: '폼롤러 위에서 발목 플랜타플렉션 컨트롤',
      now: '2026-03-30T11:00:00.000Z',
    });
    expect(saved.ok).toBe(true);
    expect(repo.drafts).toHaveLength(1);
    expect(repo.preservedInput).toBeNull();
    expect(repo.lastErrorKo).toBeNull();

    // 4a. Blank idea validation failure -> preserves attempted workingNameKo & ideaLine without losing existing draft
    const blankRes = repo.saveIdeaDraft({
      id: 'draft-preserve-2',
      ideaLine: '   ',
      workingNameKo: '작성 중이던 임시 제목',
      now: '2026-03-30T11:02:00.000Z',
    });
    expect(blankRes.ok).toBe(false);
    expect(repo.drafts).toHaveLength(1);
    expect(repo.drafts[0].id).toBe('draft-preserve-1');
    expect(repo.lastErrorKo).toContain('아이디어');
    expect(repo.preservedInput).toEqual({
      draftId: 'draft-preserve-2',
      ideaLine: '   ',
      workingNameKo: '작성 중이던 임시 제목',
      failedAt: '2026-03-30T11:02:00.000Z',
      reasonKo: expect.stringContaining('아이디어'),
    });

    // 4b. Invalid external photo URL -> preserves pendingPhotoUri and keeps draft revision intact
    const badPhotoRes = repo.appendPhotoReference('draft-preserve-1', {
      localRefUri: 'https://external-server.com/leak.jpg',
      now: '2026-03-30T11:04:00.000Z',
    });
    expect(badPhotoRes.ok).toBe(false);
    expect(repo.getDraftById('draft-preserve-1')?.revision).toBe(1);
    expect(repo.preservedInput?.pendingPhotoUri).toBe('https://external-server.com/leak.jpg');
    expect(repo.lastErrorKo).toContain('로컬 참조');

    // 4c. Invalid duration (< 0.5) on refineMetadata -> preserves pendingOverrides and keeps draft intact
    const badDurationRes = repo.refineMetadata('draft-preserve-1', {
      workingNameKo: '발목 롤러 컨트롤',
      defaultDurationMin: -5,
      now: '2026-03-30T11:05:00.000Z',
    });
    expect(badDurationRes.ok).toBe(false);
    expect(repo.getDraftById('draft-preserve-1')?.revision).toBe(1);
    expect(repo.preservedInput?.workingNameKo).toBe('발목 롤러 컨트롤');
    expect(repo.preservedInput?.pendingOverrides?.durationMin).toBe(-5);

    // 4d. Storage write failure -> keeps in-memory draft & revisionHistory AND preserves input + error message
    shouldFailStorage = true;
    const storageFailRes = repo.appendFeelLog('draft-preserve-1', {
      feelNoteKo: '발목 바깥쪽 흔들림이 줄어드는 주관적 느낌',
      now: '2026-03-30T11:06:00.000Z',
    });
    expect(storageFailRes.ok).toBe(false);
    expect(repo.lastErrorKo).toContain('QuotaExceededError');
    expect(repo.preservedInput?.pendingFeelNoteKo).toBe(
      '발목 바깥쪽 흔들림이 줄어드는 주관적 느낌',
    );
    // In-memory state retains the newly recorded feel log so nothing the instructor typed is lost
    expect(repo.getDraftById('draft-preserve-1')?.revision).toBe(2);
    expect(repo.getDraftById('draft-preserve-1')?.feelLogs).toHaveLength(1);
  });

  it('5. tracks full revision history (v1 -> v2 -> v3 -> v4) and supports non-destructive rollback to v1 as v5', () => {
    const v1 = createHumanMovementIdeaDraft({
      id: 'draft-history-1',
      ideaLine: '초기 아이디어 v1: 바렐 위에서 사이드 밴드 변형',
      now: '2026-03-30T12:00:00.000Z',
    });
    const v2 = addSubjectiveFeelToDraft(v1, {
      feelNoteKo: 'v2 느낌: 복사근 수축감이 선명함',
      now: '2026-03-30T12:05:00.000Z',
    });
    const v3 = addModificationLogToDraft(v2, {
      modificationPointKo: 'v3 수정점: 아래쪽 다리 지지 위치를 한 칸 낮추기',
      now: '2026-03-30T12:10:00.000Z',
    });
    const v4 = refineHumanDraftMetadata(v3, {
      ideaLine: '수정된 아이디어 v4: 래더 바렐 로우 렁 사이드 밴드',
      apparatus: 'barrel',
      defaultDurationMin: 4,
      now: '2026-03-30T12:15:00.000Z',
    });

    expect(v4.revision).toBe(4);
    expect(v4.revisionHistory.map((h) => h.revision)).toEqual([1, 2, 3, 4]);
    expect(v4.completenessStage).toBe('class-ready');

    // Non-destructive rollback to v1 creates v5 while keeping v1..v4 intact
    const v5 = restoreHumanDraftRevision(v4, 1, '2026-03-30T12:20:00.000Z');
    expect(v5.revision).toBe(5);
    expect(v5.ideaLine).toBe('초기 아이디어 v1: 바렐 위에서 사이드 밴드 변형');
    expect(v5.apparatus).toBeUndefined();
    expect(v5.defaultDurationMin).toBeUndefined();
    expect(v5.feelLogs).toHaveLength(0);
    expect(v5.modificationLogs).toHaveLength(0);
    expect(v5.completenessStage).toBe('idea-only');

    expect(v5.revisionHistory).toHaveLength(5);
    expect(v5.revisionHistory.map((h) => h.revision)).toEqual([1, 2, 3, 4, 5]);
    expect(v5.revisionHistory[4].parentRevision).toBe(1);
    expect(v5.revisionHistory[4].changeType).toBe('restored-revision');
    // v4 is still preserved in history entry #4!
    expect(v5.revisionHistory[3].contentSnapshot.ideaLine).toBe(
      '수정된 아이디어 v4: 래더 바렐 로우 렁 사이드 밴드',
    );
    expect(v5.revisionHistory[3].contentSnapshot.feelLogs).toHaveLength(1);
  });

  it('6. evaluates deferred stage readiness (idea-save vs block-link/sequence-link/class-confirm) and builds immutable snapshots', () => {
    const rawDraft = createHumanMovementIdeaDraft({
      id: 'draft-stage-1',
      ideaLine: '미니볼을 등 뒤에 대고 분절 컬업 시도',
      now: '2026-03-30T13:00:00.000Z',
    });

    const ideaStage = evaluateDraftStageReadiness(rawDraft, 'idea-save');
    expect(ideaStage.canSaveIdeaDraft).toBe(true);
    expect(ideaStage.canLinkWithFallbacks).toBe(true);
    expect(ideaStage.missingRecommendedFields).toEqual([
      'apparatus',
      'durationMin',
      'sectionRole',
      'sideMode',
    ]);

    const seqStageWithFallbacks = evaluateDraftStageReadiness(rawDraft, 'sequence-link');
    expect(seqStageWithFallbacks.canLinkDirectly).toBe(false);
    expect(seqStageWithFallbacks.canLinkWithFallbacks).toBe(true);
    expect(seqStageWithFallbacks.resolvedExercise.apparatus).toBe('mat');
    expect(seqStageWithFallbacks.resolvedExercise.durationMin).toBe(4);
    expect(seqStageWithFallbacks.resolvedExercise.sectionRole).toBe('main');
    expect(seqStageWithFallbacks.resolvedExercise.sideMode).toBe('together');
    expect(seqStageWithFallbacks.guidanceNoticesKo.length).toBeGreaterThanOrEqual(5);

    const classConfirmWithOverrides = evaluateDraftStageReadiness(rawDraft, 'class-confirm', {
      apparatus: 'mat',
      durationMin: 5,
      sectionRole: 'preparation',
      sideMode: 'together',
    });
    expect(classConfirmWithOverrides.canLinkDirectly).toBe(true);
    expect(classConfirmWithOverrides.missingRecommendedFields).toEqual([]);

    const snapshot = createMovementSnapshotFromHumanDraft(
      rawDraft,
      { apparatus: 'mat', durationMin: 5 },
      '2026-03-30T13:10:00.000Z',
    );
    expect(snapshot.sourceOrigin).toBe('human-created');
    expect(snapshot.humanDraftId).toBe('draft-stage-1');
    expect(snapshot.humanDraftRevision).toBe(1);
    expect(snapshot.ideaLineSnapshot).toBe('미니볼을 등 뒤에 대고 분절 컬업 시도');
    expect(snapshot.safetyBoundarySnapshot?.objectiveEfficacyClaimed).toBe(false);
    expect(Object.isFrozen(snapshot)).toBe(true);

    const exercise = convertHumanDraftToPilatesExercise(rawDraft, {
      apparatus: 'mat',
      durationMin: 5,
    });
    expect(exercise.isCustom).toBe(true);
    expect(exercise.humanDraftId).toBe('draft-stage-1');
    expect(exercise.humanDraftRevision).toBe(1);
    expect(exercise.defaultDurationMin).toBe(5);
  });
});
