import { describe, expect, it } from 'vitest';
import { syntheticPlanningExercise } from './planningFixtures';
import type { HierarchyPilatesExercise, HumanMovementDraft } from '../types/hierarchy';
import type { SequenceStep } from '../types/pilates';
import {
  addItemToReusableBlock,
  addReusableBlockToLibrary,
  adjustReusableBlockItemDuration,
  adjustSequenceBlockInstanceDuration,
  assertKnownCatalogMovement,
  cloneClassSnapshotToDraft,
  createClassSequenceSnapshot,
  createMovementSnapshot,
  createReusableBlock,
  createReusableBlockFromSteps,
  deleteReusableBlockFromLibrary,
  duplicateReusableBlockInLibrary,
  duplicateSequenceBlockInstance,
  editSequenceStepWithIsolation,
  getMovementSectionRole,
  getMovementUnitSummary,
  insertReusableBlockIntoSequence,
  linkHumanDraftToReusableBlock,
  linkHumanDraftToSequence,
  moveItemInReusableBlock,
  moveSequenceBlockInstance,
  removeItemFromReusableBlock,
  removeSequenceBlockInstance,
  resolveCatalogOrHumanMovement,
  resolveStepMovement,
  scaleReusableBlockDuration,
  updateReusableBlockTemplate,
} from '../utils/hierarchyModel';

function buildFixtureCatalog(): HierarchyPilatesExercise[] {
  const warmupReformer = syntheticPlanningExercise('reformer', 'warmup', 'alpha', true);
  const footworkReformer: HierarchyPilatesExercise = {
    ...syntheticPlanningExercise('reformer', 'footwork', 'alpha', true),
    level: '1.5',
    defaultDurationMin: 5,
    defaultRepetitions: 10,
    defaultSets: 3,
  };
  const unilateralLowerReformer: HierarchyPilatesExercise = {
    ...syntheticPlanningExercise('reformer', 'lower-body', 'alpha', true),
    isUnilateral: true,
    level: '2.0',
    defaultDurationMin: 6,
  };
  const coreCadillac: HierarchyPilatesExercise = {
    ...syntheticPlanningExercise('cadillac', 'core', 'alpha', false),
    level: '1.5',
    defaultDurationMin: 4,
  };
  const cooldownMat = syntheticPlanningExercise('mat', 'cooldown', 'alpha', true);

  return [
    warmupReformer,
    footworkReformer,
    unilateralLowerReformer,
    coreCadillac,
    cooldownMat,
  ];
}

function buildMinimalIdeaOnlyDraft(id = 'human-draft-idea-1'): HumanMovementDraft {
  const ideaLine = '풋바를 잡고 골반을 천천히 좌우로 흔들며 흉추 회전 연결하기';
  return {
    id,
    sourceOrigin: 'human-created',
    completenessStage: 'idea-only',
    ideaLine,
    feelLogs: [],
    modificationLogs: [],
    photoReferences: [],
    revision: 1,
    revisionHistory: [
      {
        revision: 1,
        savedAt: '2026-11-06T06:00:00.000Z',
        changeType: 'initial-idea',
        summaryKo: '초기 한 줄 아이디어 저장',
        contentSnapshot: {
          ideaLine,
          feelLogs: [],
          modificationLogs: [],
          photoReferences: [],
        },
      },
    ],
    safetyBoundary: {
      originType: 'instructor-created-draft',
      evaluationBasis: 'subjective-instructor-feel',
      aiSafetyGuaranteed: false,
      objectiveEfficacyClaimed: false,
      expertVerified: false,
      disclaimerKo:
        '강사 개인이 직접 시도하며 작성한 주관적 체감 초안이며 객관적 효능·안전성 보증이 아닙니다.',
    },
    createdAt: '2026-11-06T06:00:00.000Z',
    updatedAt: '2026-11-06T06:00:00.000Z',
  };
}

describe('Tier 1 — Movement (동작) unit management', () => {
  it('maps block categories to class section roles accurately', () => {
    expect(getMovementSectionRole('warmup')).toBe('preparation');
    expect(getMovementSectionRole('cooldown')).toBe('cooldown');
    expect(getMovementSectionRole('footwork')).toBe('main');
    expect(getMovementSectionRole('bridging')).toBe('main');
    expect(getMovementSectionRole('core')).toBe('main');
    expect(getMovementSectionRole('upper-body')).toBe('main');
    expect(getMovementSectionRole('lower-body')).toBe('main');
    expect(getMovementSectionRole('plank')).toBe('main');
    expect(getMovementSectionRole('extension')).toBe('main');
    expect(getMovementSectionRole('feet-in-straps')).toBe('main');
  });

  it('normalizes movement unit summary including unilateral/bilateral defaults and approval state', () => {
    const [warmup, footwork, unilateralLower, unapprovedCadillac] = buildFixtureCatalog();

    const warmupSummary = getMovementUnitSummary(warmup);
    expect(warmupSummary.id).toBe(warmup.id);
    expect(warmupSummary.sectionRole).toBe('preparation');
    expect(warmupSummary.defaultRepetitions).toBe(8);
    expect(warmupSummary.defaultSets).toBe(2);
    expect(warmupSummary.isApproved).toBe(true);
    expect(warmupSummary.requiredEquipment).toEqual(['reformer']);

    const footworkSummary = getMovementUnitSummary(footwork);
    expect(footworkSummary.defaultRepetitions).toBe(10);
    expect(footworkSummary.defaultSets).toBe(3);
    expect(footworkSummary.sectionRole).toBe('main');

    const unilateralSummary = getMovementUnitSummary(unilateralLower);
    expect(unilateralSummary.isUnilateral).toBe(true);
    expect(unilateralSummary.defaultRepetitions).toBe(6);
    expect(unilateralSummary.defaultSets).toBe(2);

    const unapprovedSummary = getMovementUnitSummary(unapprovedCadillac);
    expect(unapprovedSummary.isApproved).toBe(false);
  });

  it('asserts known catalog movements and throws descriptive Korean error on unknown IDs', () => {
    const catalog = buildFixtureCatalog();
    expect(assertKnownCatalogMovement(catalog[0].id, catalog)).toBe(catalog[0]);
    expect(() => assertKnownCatalogMovement('non-existent-id', catalog)).toThrow(
      '등록되지 않은 동작 ID입니다: non-existent-id',
    );
  });

  it('creates deep-frozen MovementSnapshot isolated from subsequent exercise mutations', () => {
    const exercise = structuredClone(buildFixtureCatalog()[0]);
    const snapshot = createMovementSnapshot(exercise, '2026-11-06T06:00:00.000Z');

    expect(snapshot.capturedAt).toBe('2026-11-06T06:00:00.000Z');
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.props)).toBe(true);
    expect(Object.isFrozen(snapshot.cues)).toBe(true);
    expect(Object.isFrozen(snapshot.layers)).toBe(true);

    // Mutate source exercise after snapshot creation
    exercise.nameKo = '변조된 이름';
    exercise.cues.push('추가된 큐잉');
    exercise.layers.standard = '변조된 레이어';

    expect(snapshot.nameKo).not.toBe('변조된 이름');
    expect(snapshot.cues).toHaveLength(2);
    expect(snapshot.layers.standard).not.toBe('변조된 레이어');

    expect(() => {
      (snapshot as { nameKo: string }).nameKo = '수정 시도';
    }).toThrow();
  });

  it('resolves step movement preferring embedded exerciseSnapshot over live catalog', () => {
    const catalog = buildFixtureCatalog();
    const originalEx = catalog[0];
    const snapshot = createMovementSnapshot(originalEx, '2026-11-06T06:00:00.000Z');

    const modifiedCatalog = catalog.map((ex, idx) =>
      idx === 0 ? { ...ex, nameKo: '라이브 카탈로그 수정본' } : ex,
    );

    const stepWithSnapshot: SequenceStep = {
      stepId: 'step-1',
      order: 1,
      blockCategory: originalEx.blockCategory,
      exerciseId: originalEx.id,
      durationMin: 4,
      selectedLayer: 'standard',
      exerciseSnapshot: snapshot,
    };
    const stepWithoutSnapshot: SequenceStep = {
      stepId: 'step-2',
      order: 2,
      blockCategory: originalEx.blockCategory,
      exerciseId: originalEx.id,
      durationMin: 4,
      selectedLayer: 'standard',
    };
    const restStep: SequenceStep = {
      kind: 'rest',
      stepId: 'step-rest',
      order: 3,
      blockCategory: 'core',
      exerciseId: '',
      durationMin: 2,
      selectedLayer: 'standard',
    };

    expect(resolveStepMovement(stepWithSnapshot, modifiedCatalog)?.nameKo).toBe(originalEx.nameKo);
    expect(resolveStepMovement(stepWithoutSnapshot, modifiedCatalog)?.nameKo).toBe(
      '라이브 카탈로그 수정본',
    );
    expect(resolveStepMovement(restStep, modifiedCatalog)).toBeUndefined();
  });
});

describe('Tier 2 — Reusable Block template & isolated sequence-instance operations', () => {
  it('creates ReusableBlock with catalog defaults, single/mixed apparatus derivation, and max level', () => {
    const catalog = buildFixtureCatalog();
    const [warmupReformer, footworkReformer, unilateralReformer, coreCadillac] = catalog;

    const singleApparatusBlock = createReusableBlock(
      {
        id: 'block-reformer-prep',
        title: '리포머 하체 & 예열 블록',
        sectionRole: 'preparation',
        now: '2026-11-06T06:00:00.000Z',
        items: [
          { exerciseId: warmupReformer.id },
          { exerciseId: footworkReformer.id, durationMin: 6 },
          { exerciseId: unilateralReformer.id },
        ],
      },
      catalog,
    );

    expect(singleApparatusBlock.version).toBe(1);
    expect(singleApparatusBlock.apparatus).toBe('reformer');
    expect(singleApparatusBlock.level).toBe('2.0');
    expect(singleApparatusBlock.items).toHaveLength(3);
    expect(singleApparatusBlock.items[0].sideMode).toBe('together');
    expect(singleApparatusBlock.items[2].sideMode).toBe('left-then-right');
    expect(singleApparatusBlock.items[0].exerciseSnapshot?.id).toBe(warmupReformer.id);

    const mixedBlock = createReusableBlock(
      {
        title: '복합 기구 코어 블록',
        sectionRole: 'main',
        items: [{ exerciseId: footworkReformer.id }, { exerciseId: coreCadillac.id }],
      },
      catalog,
    );
    expect(mixedBlock.apparatus).toBe('mixed');
    expect(mixedBlock.level).toBe('1.5');
  });

  it('creates ReusableBlock from non-rest SequenceSteps and supports library CRUD & duplication', () => {
    const catalog = buildFixtureCatalog();
    const [warmup, footwork] = catalog;

    const steps: SequenceStep[] = [
      {
        stepId: 's1',
        order: 1,
        blockCategory: warmup.blockCategory,
        exerciseId: warmup.id,
        durationMin: 3,
        selectedLayer: 'easy',
        classSection: 'preparation',
      },
      {
        kind: 'rest',
        stepId: 's-rest',
        order: 2,
        blockCategory: 'core',
        exerciseId: '',
        durationMin: 1,
        selectedLayer: 'standard',
      },
      {
        stepId: 's2',
        order: 3,
        blockCategory: footwork.blockCategory,
        exerciseId: footwork.id,
        durationMin: 5,
        selectedLayer: 'standard',
      },
    ];

    const fromSteps = createReusableBlockFromSteps(
      {
        id: 'block-from-steps',
        title: '시퀀스에서 추출한 블록',
        steps,
        now: '2026-11-06T06:05:00.000Z',
      },
      catalog,
    );

    expect(fromSteps.items).toHaveLength(2);
    expect(fromSteps.sectionRole).toBe('preparation');

    let library = addReusableBlockToLibrary([], fromSteps);
    expect(library).toHaveLength(1);

    const dupResult = duplicateReusableBlockInLibrary(
      library,
      fromSteps.id,
      '2026-11-06T06:06:00.000Z',
    );
    library = dupResult.blocks;
    expect(library).toHaveLength(2);
    expect(dupResult.duplicated.id).not.toBe(fromSteps.id);
    expect(dupResult.duplicated.title).toBe('시퀀스에서 추출한 블록 (복사본)');
    expect(dupResult.duplicated.version).toBe(1);
    expect(dupResult.duplicated.items[0].itemId).not.toBe(fromSteps.items[0].itemId);

    library = deleteReusableBlockFromLibrary(library, fromSteps.id);
    expect(library).toHaveLength(1);
    expect(library[0].id).toBe(dupResult.duplicated.id);
  });

  it('supports template item helpers (add, remove, move, adjust duration, scale total duration) with version increments', () => {
    const catalog = buildFixtureCatalog();
    const [warmup, footwork, unilateralLower] = catalog;

    let block = createReusableBlock(
      {
        id: 'block-template-ops',
        title: '템플릿 편집 테스트',
        sectionRole: 'main',
        items: [
          { exerciseId: warmup.id, durationMin: 3 },
          { exerciseId: footwork.id, durationMin: 5 },
        ],
        now: '2026-11-06T06:00:00.000Z',
      },
      catalog,
    );
    expect(block.version).toBe(1);

    block = addItemToReusableBlock(
      block,
      { exerciseId: unilateralLower.id, durationMin: 6, explanationSec: 20, transitionSec: 10 },
      catalog,
      '2026-11-06T06:01:00.000Z',
    );
    expect(block.version).toBe(2);
    expect(block.items).toHaveLength(3);
    expect(block.level).toBe('2.0');

    block = moveItemInReusableBlock(block, 2, 'up', '2026-11-06T06:02:00.000Z');
    expect(block.version).toBe(3);
    expect(block.items[1].exerciseId).toBe(unilateralLower.id);
    expect(block.items.map((item) => item.order)).toEqual([1, 2, 3]);

    block = adjustReusableBlockItemDuration(block, 0, 4.5, '2026-11-06T06:03:00.000Z');
    expect(block.version).toBe(4);
    expect(block.items[0].durationMin).toBe(4.5);

    block = scaleReusableBlockDuration(block, 12, '2026-11-06T06:04:00.000Z');
    expect(block.version).toBe(5);
    const totalScaled = block.items.reduce((sum, item) => sum + item.durationMin, 0);
    expect(totalScaled).toBeCloseTo(12, 5);

    block = removeItemFromReusableBlock(block, 1, '2026-11-06T06:05:00.000Z');
    expect(block.version).toBe(6);
    expect(block.items).toHaveLength(2);
    expect(block.level).toBe('1.5');

    const singleItemBlock = removeItemFromReusableBlock(block, 1);
    expect(() => removeItemFromReusableBlock(singleItemBlock, 0)).toThrow(
      '재사용 블록에는 최소 1개 이상의 동작이 포함되어야 합니다.',
    );
  });

  it('maintains strict isolation between ReusableBlock templates and inserted sequence block instances', () => {
    const catalog = buildFixtureCatalog();
    const [warmup, footwork, unilateralLower, , cooldown] = catalog;

    const template = createReusableBlock(
      {
        id: 'block-core-flow',
        title: '리포머 메인 플로우',
        sectionRole: 'main',
        items: [
          { exerciseId: footwork.id, durationMin: 4, explanationSec: 15, transitionSec: 15 },
          {
            exerciseId: unilateralLower.id,
            durationMin: 6,
            explanationSec: 20,
            transitionSec: 10,
          },
        ],
        now: '2026-11-06T06:00:00.000Z',
      },
      catalog,
    );
    let library = addReusableBlockToLibrary([], template);

    const baseSteps: SequenceStep[] = [
      {
        stepId: 'step-warmup',
        order: 1,
        blockCategory: warmup.blockCategory,
        exerciseId: warmup.id,
        durationMin: 4,
        selectedLayer: 'standard',
        classSection: 'preparation',
      },
      {
        stepId: 'step-cooldown',
        order: 2,
        blockCategory: cooldown.blockCategory,
        exerciseId: cooldown.id,
        durationMin: 4,
        selectedLayer: 'standard',
        classSection: 'cooldown',
      },
    ];

    // Insert reusable block after warmup (index 0)
    const inserted = insertReusableBlockIntoSequence(baseSteps, library[0], {
      afterStepIndex: 0,
      instanceId: 'inst-alpha',
    });
    let seqSteps = inserted.steps;

    expect(seqSteps).toHaveLength(4);
    expect(seqSteps.map((s) => s.order)).toEqual([1, 2, 3, 4]);
    expect(seqSteps[1].blockInstanceId).toBe('inst-alpha');
    expect(seqSteps[2].blockInstanceId).toBe('inst-alpha');
    expect(seqSteps[1].sourceBlockId).toBe(template.id);
    expect(seqSteps[1].sourceBlockVersion).toBe(1);
    expect(seqSteps[1].blockInstanceDetached).toBe(false);

    // 1. Edit sequence instance step -> detaches instance in sequence, NEVER mutates library template
    seqSteps = editSequenceStepWithIsolation(seqSteps, 1, {
      durationMin: 5.5,
      instructorNote: '이번 반에서만 시간 연장',
    });
    expect(seqSteps[1].durationMin).toBe(5.5);
    expect(seqSteps[1].blockInstanceDetached).toBe(true);
    expect(seqSteps[2].blockInstanceDetached).toBe(true);
    expect(library[0].items[0].durationMin).toBe(4);
    expect(library[0].items[0].instructorNote).toBeUndefined();

    // 2. Update library template -> increments template version to 2, NEVER mutates existing sequence steps
    library = updateReusableBlockTemplate(
      library,
      template.id,
      {
        title: '리포머 메인 플로우 v2',
        items: [
          {
            ...library[0].items[0],
            durationMin: 8,
          },
        ],
      },
      catalog,
      '2026-11-06T06:10:00.000Z',
    );
    expect(library[0].version).toBe(2);
    expect(library[0].items).toHaveLength(1);
    expect(seqSteps).toHaveLength(4);
    expect(seqSteps[1].durationMin).toBe(5.5);
    expect(seqSteps[1].sourceBlockVersion).toBe(1);

    // 3. Duplicate, move, adjust duration, and remove block instance inside sequence
    const duplicated = duplicateSequenceBlockInstance(seqSteps, 'inst-alpha', 'inst-beta');
    seqSteps = duplicated.steps;
    expect(seqSteps).toHaveLength(6);
    expect(seqSteps.filter((s) => s.blockInstanceId === 'inst-beta')).toHaveLength(2);

    // Move inst-beta down past cooldown
    seqSteps = moveSequenceBlockInstance(seqSteps, 'inst-beta', 'down');
    expect(seqSteps.at(-1)?.blockInstanceId).toBe('inst-beta');
    expect(seqSteps.map((s) => s.order)).toEqual([1, 2, 3, 4, 5, 6]);

    // Scale inst-beta total duration to 9 minutes
    seqSteps = adjustSequenceBlockInstanceDuration(seqSteps, 'inst-beta', 9);
    const betaSteps = seqSteps.filter((s) => s.blockInstanceId === 'inst-beta');
    const betaSum = betaSteps.reduce((sum, s) => sum + s.durationMin, 0);
    expect(betaSum).toBeCloseTo(9, 5);
    for (const step of betaSteps) {
      const minRequired = Math.max(
        0.5,
        ((step.explanationSec ?? 0) + (step.transitionSec ?? 0) + 30) / 60,
      );
      expect(step.durationMin).toBeGreaterThanOrEqual(minRequired);
      expect(step.blockInstanceDetached).toBe(true);
    }

    // Remove inst-beta
    seqSteps = removeSequenceBlockInstance(seqSteps, 'inst-beta');
    expect(seqSteps).toHaveLength(4);
    expect(seqSteps.some((s) => s.blockInstanceId === 'inst-beta')).toBe(false);
  });
});

describe('Tier 4 — Class (수업) immutable snapshot & clone provenance', () => {
  it('keeps past ClassSequenceSnapshot and cloned draft 100% intact after mutating or deleting original movements, blocks, and sequences', () => {
    const catalog = buildFixtureCatalog();
    const [warmup, footwork, unilateralLower, , cooldown] = catalog;

    const blockTemplate = createReusableBlock(
      {
        id: 'block-lower-intensive',
        title: '하체 집중 블록',
        sectionRole: 'main',
        items: [
          { exerciseId: footwork.id, durationMin: 5, explanationSec: 20, transitionSec: 10 },
          {
            exerciseId: unilateralLower.id,
            durationMin: 7,
            explanationSec: 30,
            transitionSec: 15,
          },
        ],
        now: '2026-11-06T07:00:00.000Z',
      },
      catalog,
    );

    const initialSteps: SequenceStep[] = [
      {
        stepId: 'step-open',
        order: 1,
        blockCategory: warmup.blockCategory,
        exerciseId: warmup.id,
        durationMin: 4,
        explanationSec: 15,
        transitionSec: 10,
        selectedLayer: 'standard',
        classSection: 'preparation',
      },
      {
        kind: 'rest',
        stepId: 'step-water-break',
        order: 2,
        blockCategory: 'core',
        exerciseId: '',
        durationMin: 2,
        selectedLayer: 'standard',
      },
      {
        stepId: 'step-close',
        order: 3,
        blockCategory: cooldown.blockCategory,
        exerciseId: cooldown.id,
        durationMin: 4,
        explanationSec: 10,
        transitionSec: 5,
        selectedLayer: 'standard',
        classSection: 'cooldown',
      },
    ];

    const withBlock = insertReusableBlockIntoSequence(initialSteps, blockTemplate, {
      afterStepIndex: 0,
      instanceId: 'inst-class-1',
    });

    const sourceSequence = {
      id: 'seq-morning-reformer',
      title: '오전 리포머 시그니처 22분',
      subtitle: '하체 정렬 & 코어 연결',
      apparatus: 'mixed' as const,
      level: '2.0' as const,
      targetMinutes: 22,
      steps: withBlock.steps,
      version: 3,
      updatedAt: '2026-11-06T07:10:00.000Z',
    };

    const classSnapshot = createClassSequenceSnapshot(
      sourceSequence,
      catalog,
      '2026-11-06T07:15:00.000Z',
    );

    expect(Object.isFrozen(classSnapshot)).toBe(true);
    expect(Object.isFrozen(classSnapshot.steps)).toBe(true);
    expect(Object.isFrozen(classSnapshot.exerciseSnapshots)).toBe(true);
    expect(Object.isFrozen(classSnapshot.blockSnapshots)).toBe(true);
    expect(Object.isFrozen(classSnapshot.timeBreakdown)).toBe(true);

    expect(classSnapshot.blockSnapshots).toHaveLength(1);
    expect(classSnapshot.blockSnapshots[0]).toMatchObject({
      blockInstanceId: 'inst-class-1',
      sourceBlockId: 'block-lower-intensive',
      sourceBlockVersion: 1,
      sourceBlockTitle: '하체 집중 블록',
      detached: false,
    });

    expect(classSnapshot.timeBreakdown).toEqual({
      movementSec: 1085,
      explanationSec: 75,
      transitionSec: 40,
      restSec: 120,
      totalSec: 1320,
    });

    const originalFootworkName = footwork.nameKo;
    const originalUnilateralName = unilateralLower.nameKo;

    // Now mutate original catalog exercises, delete unilateralLower & footwork from live catalog,
    // and mutate sourceSequence!
    footwork.nameKo = '완전히 변경된 동작 이름';
    sourceSequence.title = '수정된 이후 시퀀스 제목';
    sourceSequence.steps.splice(0, sourceSequence.steps.length);

    // Live catalog only retains warmup and cooldown (footwork & unilateralLower deleted!)
    const reducedLiveCatalog = [warmup, cooldown];

    // Past class snapshot remains 100% intact
    expect(classSnapshot.title).toBe('오전 리포머 시그니처 22분');
    expect(classSnapshot.steps).toHaveLength(5);
    expect(classSnapshot.exerciseSnapshots[footwork.id].nameKo).toBe(originalFootworkName);
    expect(classSnapshot.exerciseSnapshots[unilateralLower.id].nameKo).toBe(
      originalUnilateralName,
    );

    // Clone the historical class snapshot into a new editable draft even when 2 exercises were deleted from catalog
    const clonedDraft = cloneClassSnapshotToDraft(classSnapshot, reducedLiveCatalog, {
      sourceKind: 'history-snapshot',
      sourceId: 'history-log-2026-11-06',
      sourceTaughtAt: '2026-11-06',
      now: '2026-11-06T08:00:00.000Z',
    });

    expect(clonedDraft.steps).toHaveLength(5);
    expect(clonedDraft.steps[0].stepId).not.toBe(classSnapshot.steps[0].stepId);
    expect(clonedDraft.restoredExercises).toHaveLength(2);
    expect(clonedDraft.restoredExercises.map((e) => e.id).sort()).toEqual(
      [footwork.id, unilateralLower.id].sort(),
    );
    expect(
      clonedDraft.restoredExercises.find((e) => e.id === footwork.id)?.nameKo,
    ).toBe(originalFootworkName);

    expect(clonedDraft.sourceProvenance).toMatchObject({
      kind: 'history-snapshot',
      sourceId: 'history-log-2026-11-06',
      sourceTitle: '오전 리포머 시그니처 22분',
      sourceSequenceId: 'seq-morning-reformer',
      sourceVersion: 3,
      sourceTaughtAt: '2026-11-06',
      clonedAt: '2026-11-06T08:00:00.000Z',
    });
    expect(clonedDraft.sourceProvenance.summaryKo).toContain('오전 리포머 시그니처 22분');
    expect(clonedDraft.sourceProvenance.summaryKo).toContain('v3');

    // Editing the cloned draft never mutates the historical ClassSequenceSnapshot
    clonedDraft.steps[0].durationMin = 10;
    clonedDraft.steps[0].instructorNote = '복제본 단독 메모';
    expect(classSnapshot.steps[0].durationMin).toBe(4);
    expect(classSnapshot.steps[0].instructorNote).toBeUndefined();
  });

  it('preserves locked steps during block removal/scaling, guards against removing all non-rest steps, and supports dated-plan-snapshot provenance', () => {
    const catalog = buildFixtureCatalog();
    const [warmup, footwork, unilateralLower] = catalog;

    const blockA = createReusableBlock(
      {
        id: 'block-a',
        title: '블록 A',
        sectionRole: 'main',
        items: [
          { exerciseId: warmup.id, durationMin: 3 },
          { exerciseId: footwork.id, durationMin: 5 },
        ],
      },
      catalog,
    );
    const blockB = createReusableBlock(
      {
        id: 'block-b',
        title: '블록 B',
        sectionRole: 'main',
        items: [{ exerciseId: unilateralLower.id, durationMin: 6 }],
      },
      catalog,
    );

    const firstInsert = insertReusableBlockIntoSequence([], blockA, { instanceId: 'inst-a' });
    // Guard: removing the only block instance when no other non-rest steps exist throws
    expect(() => removeSequenceBlockInstance(firstInsert.steps, 'inst-a')).toThrow(
      '시퀀스에는 최소 1개 이상의 동작이 남아 있어야 합니다.',
    );

    // Lock the first step of inst-a, then scale inst-a duration to 10m -> locked step stays 3m, unlocked step becomes 7m
    let steps = editSequenceStepWithIsolation(firstInsert.steps, 0, { locked: true });
    steps = adjustSequenceBlockInstanceDuration(steps, 'inst-a', 10);
    expect(steps[0].durationMin).toBe(3);
    expect(steps[1].durationMin).toBe(7);

    // Remove inst-a when step 0 is locked -> step 0 is preserved, step 1 is removed
    const afterPartialRemove = removeSequenceBlockInstance(steps, 'inst-a');
    expect(afterPartialRemove).toHaveLength(1);
    expect(afterPartialRemove[0].locked).toBe(true);
    expect(afterPartialRemove[0].blockInstanceDetached).toBe(true);

    // Insert block B and move it up past the remaining step
    const withB = insertReusableBlockIntoSequence(afterPartialRemove, blockB, {
      instanceId: 'inst-b',
    });
    const movedUp = moveSequenceBlockInstance(withB.steps, 'inst-b', 'up');
    expect(movedUp[0].blockInstanceId).toBe('inst-b');
    expect(movedUp[1].blockInstanceId).toBe('inst-a');

    // Snapshot and clone with dated-plan-snapshot provenance
    const snap = createClassSequenceSnapshot(
      {
        id: 'seq-dated-plan',
        title: '목요일 오전 10시 계획',
        subtitle: '일정 연동 수업',
        apparatus: 'reformer',
        level: '2.0',
        targetMinutes: 10,
        steps: movedUp,
        version: 2,
      },
      catalog,
      '2026-11-06T09:00:00.000Z',
    );
    const clonedDated = cloneClassSnapshotToDraft(snap, catalog, {
      sourceKind: 'dated-plan-snapshot',
      sourceId: 'dated-class-2026-11-06',
      sourceTaughtAt: '2026-11-06',
      now: '2026-11-06T09:30:00.000Z',
    });
    expect(clonedDated.sourceProvenance.kind).toBe('dated-plan-snapshot');
    expect(clonedDated.sourceProvenance.summaryKo).toContain('일정 수업 스냅샷');
    expect(clonedDated.restoredExercises).toHaveLength(0);
  });

  it('links incomplete 1-line HumanMovementDrafts into ReusableBlocks and Sequences without catalog blocking, and preserves v1 ClassSequenceSnapshot across later draft revisions or deletion', () => {
    const catalog = buildFixtureCatalog();
    const [warmup, cooldown] = catalog;

    // 1. Minimal 1-line idea-only draft (no apparatus, category, duration, anatomy, or sideMode)
    const draftV1: HumanMovementDraft = {
      ...buildMinimalIdeaOnlyDraft('human-draft-spiral-1'),
      feelLogs: [
        {
          id: 'feel-1',
          recordedAt: '2026-11-06T06:10:00.000Z',
          feelNoteKo: '왼쪽 흉곽이 열릴 때 호흡이 깊어지는 주관적 느낌',
          perceivedIntensity: 'gentle',
          evaluationBasis: 'subjective-instructor-feel',
          objectiveEfficacyClaimed: false,
          safetyGuaranteed: false,
          expertVerified: false,
        },
      ],
      modificationLogs: [
        {
          id: 'mod-1',
          recordedAt: '2026-11-06T06:12:00.000Z',
          modificationPointKo: '어깨가 긴장되면 손 위치를 낮추기',
          appliedToRevision: 1,
        },
      ],
      photoReferences: [
        {
          id: 'photo-1',
          localRefUri: 'local-photo://drafts/spiral-setup-v1.jpg',
          captionKo: '시작 자세 손 위치 참조',
          angleTag: 'setup',
          capturedAt: '2026-11-06T06:13:00.000Z',
          externalAiUploadAllowed: false,
        },
      ],
    };

    // Resolve directly without throwing '등록되지 않은 동작 ID입니다'
    const resolved = resolveCatalogOrHumanMovement(draftV1.id, catalog, [draftV1]);
    expect(resolved.sourceOrigin).toBe('human-created');
    expect(resolved.humanDraftId).toBe(draftV1.id);
    expect(resolved.humanDraftRevision).toBe(1);
    expect(resolved.apparatus).toBe('mat');
    expect(resolved.defaultDurationMin).toBe(4);

    // 2. Link incomplete draft into a ReusableBlock and verify stage-appropriate guidanceNoticesKo
    const baseBlock = createReusableBlock(
      {
        id: 'block-prep-with-human',
        title: '예열 & 창작 동작 블록',
        sectionRole: 'preparation',
        items: [{ exerciseId: warmup.id, durationMin: 3 }],
        now: '2026-11-06T06:15:00.000Z',
      },
      catalog,
    );

    const blockLinkResult = linkHumanDraftToReusableBlock(
      baseBlock,
      draftV1,
      undefined,
      '2026-11-06T06:16:00.000Z',
    );
    expect(blockLinkResult.block.version).toBe(2);
    expect(blockLinkResult.block.items).toHaveLength(2);
    expect(blockLinkResult.missingRecommendedFields).toEqual([
      'apparatus',
      'durationMin',
      'sectionRole',
      'sideMode',
    ]);
    expect(blockLinkResult.guidanceNoticesKo.length).toBeGreaterThanOrEqual(4);

    const linkedBlockItem = blockLinkResult.block.items[1];
    expect(linkedBlockItem.humanDraftId).toBe(draftV1.id);
    expect(linkedBlockItem.humanDraftRevision).toBe(1);
    expect(linkedBlockItem.exerciseSnapshot?.sourceOrigin).toBe('human-created');
    expect(linkedBlockItem.exerciseSnapshot?.ideaLineSnapshot).toBe(draftV1.ideaLine);
    expect(linkedBlockItem.exerciseSnapshot?.feelLogsSnapshot).toHaveLength(1);
    expect(linkedBlockItem.exerciseSnapshot?.modificationLogsSnapshot).toHaveLength(1);
    expect(linkedBlockItem.exerciseSnapshot?.photoReferencesSnapshot).toHaveLength(1);

    // 3. Also link another incomplete draft directly into a Sequence
    const secondDraft = buildMinimalIdeaOnlyDraft('human-draft-bridge-pulse-2');
    const instFromBlock = insertReusableBlockIntoSequence([], blockLinkResult.block, {
      instanceId: 'inst-human-block',
    });

    const seqLinkResult = linkHumanDraftToSequence(instFromBlock.steps, secondDraft, {
      now: '2026-11-06T06:18:00.000Z',
    });
    expect(seqLinkResult.steps).toHaveLength(3);
    expect(seqLinkResult.missingRecommendedFields).toContain('apparatus');
    expect(seqLinkResult.guidanceNoticesKo.length).toBeGreaterThan(0);

    const finalSteps: SequenceStep[] = [
      ...seqLinkResult.steps,
      {
        stepId: 'step-cooldown-end',
        order: 4,
        blockCategory: cooldown.blockCategory,
        exerciseId: cooldown.id,
        durationMin: 4,
        selectedLayer: 'standard',
        classSection: 'cooldown',
      },
    ];

    // 4. Confirm class snapshot (createClassSequenceSnapshot) at revision 1
    const classSnapshotV1 = createClassSequenceSnapshot(
      {
        id: 'seq-creative-class',
        title: '창작 동작 포함 수업',
        subtitle: '초안 v1 수업 기록',
        apparatus: 'mixed',
        level: '1.0',
        targetMinutes: 15,
        steps: finalSteps,
        version: 1,
      },
      catalog,
      '2026-11-06T06:20:00.000Z',
      [draftV1, secondDraft],
    );

    const snapDraft1 = classSnapshotV1.exerciseSnapshots[draftV1.id];
    expect(snapDraft1.sourceOrigin).toBe('human-created');
    expect(snapDraft1.humanDraftId).toBe(draftV1.id);
    expect(snapDraft1.humanDraftRevision).toBe(1);
    expect(snapDraft1.ideaLineSnapshot).toBe(draftV1.ideaLine);
    expect(snapDraft1.feelLogsSnapshot).toHaveLength(1);
    expect(snapDraft1.modificationLogsSnapshot).toHaveLength(1);
    expect(snapDraft1.photoReferencesSnapshot).toHaveLength(1);
    expect(snapDraft1.safetyBoundarySnapshot?.aiSafetyGuaranteed).toBe(false);
    expect(snapDraft1.safetyBoundarySnapshot?.objectiveEfficacyClaimed).toBe(false);
    expect(Object.isFrozen(snapDraft1.feelLogsSnapshot)).toBe(true);
    expect(Object.isFrozen(snapDraft1.modificationLogsSnapshot)).toBe(true);
    expect(Object.isFrozen(snapDraft1.photoReferencesSnapshot)).toBe(true);

    // 5. Mutate original HumanMovementDraft to revision 2 & 3, and mutate ReusableBlock template
    const originalIdeaLine = draftV1.ideaLine;
    draftV1.ideaLine = '완전히 바뀐 v3 아이디어 문장 (캐딜락 스프링 버전)';
    draftV1.workingNameKo = '캐딜락 스파이럴 v3';
    draftV1.apparatus = 'cadillac';
    draftV1.defaultDurationMin = 9;
    draftV1.revision = 3;
    (draftV1.feelLogs as Array<(typeof draftV1.feelLogs)[number]>).push({
      id: 'feel-2',
      recordedAt: '2026-11-07T06:00:00.000Z',
      feelNoteKo: 'v3에서 추가된 새로운 느낌 기록',
      evaluationBasis: 'subjective-instructor-feel',
      objectiveEfficacyClaimed: false,
      safetyGuaranteed: false,
      expertVerified: false,
    });
    (draftV1.modificationLogs as Array<(typeof draftV1.modificationLogs)[number]>).push({
      id: 'mod-2',
      recordedAt: '2026-11-07T06:05:00.000Z',
      modificationPointKo: 'v3에서 추가된 수정할 점',
      appliedToRevision: 3,
    });

    const updatedLibrary = updateReusableBlockTemplate(
      [blockLinkResult.block],
      blockLinkResult.block.id,
      { title: '수정된 블록 v3' },
      catalog,
      '2026-11-07T06:10:00.000Z',
      [draftV1],
    );
    expect(updatedLibrary[0].version).toBe(3);
    expect(updatedLibrary[0].items[1].humanDraftRevision).toBe(3);

    // Verify past ClassSequenceSnapshot (v1) is 100% untouched!
    expect(classSnapshotV1.exerciseSnapshots[draftV1.id].humanDraftRevision).toBe(1);
    expect(classSnapshotV1.exerciseSnapshots[draftV1.id].ideaLineSnapshot).toBe(originalIdeaLine);
    expect(classSnapshotV1.exerciseSnapshots[draftV1.id].apparatus).toBe('mat');
    expect(classSnapshotV1.exerciseSnapshots[draftV1.id].defaultDurationMin).toBe(4);
    expect(classSnapshotV1.exerciseSnapshots[draftV1.id].feelLogsSnapshot).toHaveLength(1);
    expect(classSnapshotV1.exerciseSnapshots[draftV1.id].modificationLogsSnapshot).toHaveLength(1);
    expect(classSnapshotV1.steps[1].humanDraftRevision).toBe(1);

    // 6. Clone a new draft from the past ClassSequenceSnapshot even after human drafts are deleted
    const clonedFromPast = cloneClassSnapshotToDraft(classSnapshotV1, catalog, {
      sourceKind: 'history-snapshot',
      sourceId: 'history-creative-v1',
      sourceTaughtAt: '2026-11-06',
      now: '2026-11-08T10:00:00.000Z',
    });

    expect(clonedFromPast.steps).toHaveLength(4);
    expect(clonedFromPast.restoredExercises).toHaveLength(2);
    const restoredSpiral = clonedFromPast.restoredExercises.find((e) => e.id === draftV1.id);
    expect(restoredSpiral).toBeDefined();
    expect(restoredSpiral?.humanDraftId).toBe(draftV1.id);
    expect(restoredSpiral?.humanDraftRevision).toBe(1);
    expect(restoredSpiral?.nameKo).toBe(originalIdeaLine);
    expect(clonedFromPast.sourceProvenance.sourceTitle).toBe('창작 동작 포함 수업');
  });
});
