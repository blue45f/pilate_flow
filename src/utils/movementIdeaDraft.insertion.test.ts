import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSequenceSnapshot, usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import type { AutoGenerateCriteria, SequenceStep } from '../types/pilates';
import {
  addMovementIdeaToCurrentClass,
  getHumanDraftForIdeaExercise,
  resetMovementIdeaStateForTests,
  saveMovementIdeaToStore,
} from './movementIdeaDraft';
import type { SequenceInsertionPlacement } from './sequenceInsertion';

const originalState = usePilatesStore.getState();
const firstExercise = syntheticPlanningExercise('mat', 'warmup');
const lastExercise = syntheticPlanningExercise('mat', 'cooldown');
const criteria: AutoGenerateCriteria = {
  apparatus: 'mat',
  availableEquipment: ['mat'],
  ownedApparatus: ['mat'],
  preferredProps: ['none'],
  level: '1.0',
  focusPreset: 'full-body',
  excludeDaysWindow: 0,
  targetMinutes: 40,
  defaultLayer: 'easy',
};
const originalSteps: SequenceStep[] = [
  {
    stepId: 'idea-insert-locked-start',
    exerciseId: firstExercise.id,
    order: 1,
    blockCategory: 'warmup',
    classSection: 'preparation',
    durationMin: 4,
    explanationSec: 15,
    transitionSec: 0,
    selectedLayer: 'standard',
    instructorNote: '원래 잠긴 시작 동작의 메모',
    locked: true,
  },
  {
    stepId: 'idea-insert-end',
    exerciseId: lastExercise.id,
    order: 2,
    blockCategory: 'cooldown',
    classSection: 'cooldown',
    durationMin: 3,
    explanationSec: 10,
    transitionSec: 15,
    selectedLayer: 'easy',
    instructorNote: '기존 마무리 동작의 메모',
  },
];

beforeEach(() => {
  localStorage.clear();
  resetMovementIdeaStateForTests();
  usePilatesStore.setState({
    ...originalState,
    exercises: structuredClone([firstExercise, lastExercise]),
    activeSteps: structuredClone(originalSteps),
    activeTitle: '기존 수업 제목',
    activeSubtitle: '기존 수업 설명',
    activeSequenceId: 'idea-insert-existing-class',
    activeApparatus: 'mat',
    activeLevel: '1.0',
    activeTargetMinutes: 40,
    ownedApparatus: ['mat'],
    ownedEquipment: ['mat'],
    ownedProps: [],
    draftCriteria: structuredClone(criteria),
    lastCriteria: structuredClone(criteria),
    undoStack: [],
    generationError: '이전 알림',
    saveFeedback: '이전 저장 상태',
  }, true);
});

afterEach(() => {
  vi.restoreAllMocks();
  resetMovementIdeaStateForTests();
  usePilatesStore.setState(originalState, true);
  localStorage.clear();
});

function saveIdea(ideaLine = '체어에서 옆으로 기대며 팔의 움직임을 연결하는 내 창작 메모') {
  const result = saveMovementIdeaToStore({
    ideaLine,
    workingTitle: ideaLine,
    apparatus: 'chair',
    level: '2.0',
    durationMin: 4.5,
    subjectiveFeeling: '강사가 직접 느낀 감각 메모',
    adjustmentNote: '다음 시도에서 속도 조절',
    variantLabelKo: '내 좌우 연결 변형',
    repetitions: 8,
    sets: 2,
    sideMode: 'right-then-left',
    explanationSec: 25,
    transitionSec: 20,
    sectionRole: 'main',
  });
  expect(result.ok).toBe(true);
  expect(result.exercise).toBeDefined();
  return result.exercise!;
}

describe('positioned custom movement insertion', () => {
  it('inserts full authored metadata after a live row in one update and restores the exact class with one undo', () => {
    const idea = saveIdea();
    const humanDraft = getHumanDraftForIdeaExercise(idea.id)!;
    const before = usePilatesStore.getState();
    const beforeSnapshot = createSequenceSnapshot(before);
    const listener = vi.fn();
    const unsubscribe = usePilatesStore.subscribe(listener);

    const result = addMovementIdeaToCurrentClass(idea.id, {
      kind: 'step',
      stepId: originalSteps[0]!.stepId,
    });

    expect(result).toMatchObject({ ok: true, success: true, stepId: expect.any(String) });
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
    const after = usePilatesStore.getState();
    expect(after.activeSteps.map((step) => step.stepId)).toEqual([
      originalSteps[0]!.stepId,
      result.stepId,
      originalSteps[1]!.stepId,
    ]);
    expect(after.activeSteps[0]).toBe(before.activeSteps[0]);
    expect(after.activeSteps[2]).toEqual({ ...before.activeSteps[1], order: 3 });
    const inserted = after.activeSteps[1]!;
    expect(inserted).toMatchObject({
      exerciseId: idea.id,
      order: 2,
      durationMin: 4.5,
      explanationSec: 25,
      transitionSec: 20,
      repetitions: 8,
      sets: 2,
      sideMode: 'right-then-left',
      selectedLayer: 'easy',
      classSection: 'main',
      humanDraftId: humanDraft.id,
      humanDraftRevision: humanDraft.revision,
    });
    expect(inserted.instructorNote).toContain('[느낌] 강사가 직접 느낀 감각 메모');
    expect(inserted.instructorNote).toContain('[수정] 다음 시도에서 속도 조절');
    expect(inserted.instructorNote).toContain('[변형] 내 좌우 연결 변형');
    expect(inserted.exerciseSnapshot).toMatchObject({
      id: idea.id,
      humanDraftId: humanDraft.id,
      humanDraftRevision: humanDraft.revision,
      sourceOrigin: 'human-created',
      ideaLineSnapshot: humanDraft.ideaLine,
      defaultDurationMin: 4.5,
      defaultRepetitions: 8,
      defaultSets: 2,
    });
    expect(inserted.exerciseSnapshot?.feelLogsSnapshot).toEqual(humanDraft.feelLogs);
    expect(inserted.exerciseSnapshot?.feelLogsSnapshot).not.toBe(humanDraft.feelLogs);
    expect(after.exercises.find((exercise) => exercise.id === idea.id)?.review).toEqual(idea.review);
    expect(after.ownedApparatus).toEqual(['mat', 'chair']);
    expect(after.ownedEquipment).toEqual(expect.arrayContaining(['mat', 'chair']));
    expect(after.activeApparatus).toBe(before.activeApparatus);
    expect(after.activeLevel).toBe(before.activeLevel);
    expect(after.activeTargetMinutes).toBe(before.activeTargetMinutes);
    expect(after.draftCriteria).toBe(before.draftCriteria);
    expect(after.lastCriteria).toBe(before.lastCriteria);
    expect(after.savedSequences).toBe(before.savedSequences);
    expect(after.historyLogs).toBe(before.historyLogs);
    expect(after.undoStack).toHaveLength(before.undoStack.length + 1);
    expect(after.undoStack.at(-1)).toEqual(beforeSnapshot);

    after.undoSequence();
    expect(createSequenceSnapshot(usePilatesStore.getState())).toEqual(beforeSnapshot);
    expect(usePilatesStore.getState().undoStack).toEqual(before.undoStack);
  });

  it.each([
    { placement: { kind: 'step', stepId: 'deleted-anchor' } as SequenceInsertionPlacement, message: /기준 항목/ },
    { placement: { kind: 'start' } as SequenceInsertionPlacement, message: /잠긴 항목/ },
  ])('rejects invalid placement $placement.kind before any state, ownership, or storage write', ({ placement, message }) => {
    const idea = saveIdea();
    const before = usePilatesStore.getState();
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem');
    const listener = vi.fn();
    const unsubscribe = usePilatesStore.subscribe(listener);

    const result = addMovementIdeaToCurrentClass(idea.id, placement);

    expect(result).toMatchObject({ success: false, ok: false, message: expect.stringMatching(message) });
    expect(result.stepId).toBeUndefined();
    expect(usePilatesStore.getState()).toBe(before);
    expect(before.ownedApparatus).toEqual(['mat']);
    expect(before.ownedEquipment).toEqual(['mat']);
    expect(listener).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('rejects explicit duplicate insertion without updating its existing note, metadata, or ownership', () => {
    const idea = saveIdea();
    usePilatesStore.setState((state) => ({
      activeSteps: [...state.activeSteps, {
        stepId: 'already-added-idea',
        order: 3,
        exerciseId: idea.id,
        blockCategory: idea.blockCategory,
        durationMin: 7,
        selectedLayer: 'hard',
        instructorNote: '이 수업에서만 바꾼 메모',
        repetitions: 3,
      }],
    }));
    const before = usePilatesStore.getState();
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const listener = vi.fn();
    const unsubscribe = usePilatesStore.subscribe(listener);

    const result = addMovementIdeaToCurrentClass(idea.id, { kind: 'end' });

    expect(result).toMatchObject({ success: false, ok: false, alreadyAdded: true });
    expect(result.message).toContain('이미 수업에 담긴');
    expect(result.stepId).toBeUndefined();
    expect(usePilatesStore.getState()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('inserts distinct ideas with the same generic English name in the selected order', () => {
    const first = saveIdea();
    const second = saveIdea('체어에서 앉아서 다른 방향으로 팔을 연결하는 두 번째 창작 메모');
    expect(first.id).not.toBe(second.id);
    expect(first.nameEn).toBe(second.nameEn);
    const firstResult = addMovementIdeaToCurrentClass(first.id, {
      kind: 'step',
      stepId: originalSteps[0]!.stepId,
    });
    expect(firstResult.ok).toBe(true);
    const secondResult = addMovementIdeaToCurrentClass(second.id, {
      kind: 'step',
      stepId: firstResult.stepId!,
    });
    expect(secondResult.ok).toBe(true);
    expect(usePilatesStore.getState().activeSteps.map((step) => step.exerciseId)).toEqual([
      firstExercise.id,
      first.id,
      second.id,
      lastExercise.id,
    ]);
    expect(usePilatesStore.getState().undoStack).toHaveLength(2);
  });

  it('embeds a snapshot for a restored idea when its separate draft metadata is unavailable', () => {
    const idea = saveIdea();
    resetMovementIdeaStateForTests();
    const result = addMovementIdeaToCurrentClass(idea.id, { kind: 'end' });
    expect(result.ok).toBe(true);
    const step = usePilatesStore.getState().activeSteps.at(-1)!;
    expect(step.exerciseSnapshot).toMatchObject({
      id: idea.id,
      nameKo: idea.nameKo,
      humanDraftId: idea.humanDraftId,
      humanDraftRevision: idea.humanDraftRevision,
      sourceOrigin: 'human-created',
    });
    expect(step.instructorNote).toContain('강사가 직접 느낀 감각 메모');
    expect(step.repetitions).toBe(8);
    expect(step.sets).toBe(2);
  });

  it('retains the existing idempotent update behavior when no placement is passed', () => {
    const idea = saveIdea();
    const added = addMovementIdeaToCurrentClass(idea.id);
    expect(added.ok).toBe(true);
    const before = usePilatesStore.getState();
    const stepId = before.activeSteps.find((step) => step.exerciseId === idea.id)!.stepId;
    const updated = addMovementIdeaToCurrentClass(idea.id);
    expect(updated).toMatchObject({ success: true, ok: true, alreadyAdded: true });
    const after = usePilatesStore.getState();
    expect(after.activeSteps).toHaveLength(before.activeSteps.length);
    expect(after.activeSteps.find((step) => step.exerciseId === idea.id)?.stepId).toBe(stepId);
  });
});
