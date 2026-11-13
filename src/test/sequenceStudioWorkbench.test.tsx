import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SequenceStudioWorkbench } from '../components/SequenceStudioWorkbench';
import { usePilatesStore } from '../store/usePilatesStore';
import type { AutoGenerateCriteria, PilatesExercise, SavedSequence, SequenceStep } from '../types/pilates';
import { getSequenceDurations, getStepTiming } from '../utils/sequenceEngine';
import { syntheticPlanningExercise } from './planningFixtures';
import { closeWorkbenchConditions, openAdvancedWorkbench, openWorkbenchConditions } from './workbenchControls';

// These journeys exercise the real store and editor; artwork pixels are
// covered by the motion tests and separate browser visual review.
vi.mock('../components/ExerciseMotionArtwork', () => ({
  ExerciseMotionArtwork: ({ exercise }: { exercise: PilatesExercise }) =>
    <span data-testid={`test-artwork-${exercise.id}`} />,
}));

const original = usePilatesStore.getState();
const mat = { ...syntheticPlanningExercise('mat', 'warmup'), nameKo: '매트 준비 호흡' };
const first = { ...syntheticPlanningExercise('reformer', 'warmup'), nameKo: '첫 번째 호흡' };
const second = { ...syntheticPlanningExercise('reformer', 'lower-body'), nameKo: '두 번째 레그 리치' };
const third = { ...syntheticPlanningExercise('reformer', 'upper-body'), nameKo: '세 번째 암 리치' };
const cadillac = { ...syntheticPlanningExercise('cadillac', 'warmup'), nameKo: '캐딜락 준비 호흡' };
const propExercise = {
  ...syntheticPlanningExercise('reformer', 'core'),
  nameKo: '미니볼 코어 연습', props: ['mini-ball'] as PilatesExercise['props'],
};
const baseCriteria: AutoGenerateCriteria = {
  apparatus: 'mat', ownedApparatus: ['mat'], availableEquipment: ['mat'], preferredProps: ['none'],
  level: '1.0', targetMinutes: 50, focusPreset: 'full-body', defaultLayer: 'standard',
  targetGroupId: 'qa-group', excludeDaysWindow: 0,
};
const savedStep: SequenceStep = {
  stepId: 'saved-mat-row', order: 1, exerciseId: mat.id, blockCategory: mat.blockCategory,
  selectedLayer: 'easy', durationMin: 5, instructorNote: '원본 수업의 메모',
};
const savedSource: SavedSequence = {
  id: 'original-saved-class', title: '원본 매트 수업', subtitle: '보존할 원본 수업',
  apparatus: 'mat', level: '1.0', targetMinutes: 50, focusTags: ['보존'],
  steps: [savedStep], criteriaSnapshot: baseCriteria, taughtCount: 3,
  createdAt: '2026-11-13T00:00:00.000Z', updatedAt: '2026-11-13T00:00:00.000Z',
};

// Keep the real advanced editor and navigation while preparing its lazy module
// before timing assertions about the actual round trip.
beforeAll(async () => { await import('../components/SequenceWorkbench'); }, 30000);

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  usePilatesStore.setState({
    ...original, activeTab: 'workbench', exercises: [mat, first, second, third, propExercise],
    ownedApparatus: ['mat', 'reformer'], ownedEquipment: ['mat', 'reformer'], ownedProps: ['mini-ball'],
    activeSequenceId: 'empty-studio-draft', activeTitle: '작성 전 수업', activeSubtitle: '',
    activeApparatus: 'mat', activeLevel: '1.0', activeTargetMinutes: 50, activeTargetGroupId: 'qa-group',
    activeSteps: [], lastCriteria: structuredClone(baseCriteria), draftCriteria: structuredClone(baseCriteria),
    savedSequences: [structuredClone(savedSource)], historyLogs: [], undoStack: [],
    generationError: null, persistenceError: null, saveFeedback: null,
  }, true);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  usePilatesStore.setState(original, true);
  localStorage.clear();
  sessionStorage.clear();
});

function showStudio() {
  const handlers = {
    onOpenYouTubePreview: vi.fn(), onOpenIdeaSheet: vi.fn(), onOpenClipper: vi.fn(),
    onOpenLogModal: vi.fn(), onOpenInventory: vi.fn(), onStartClass: vi.fn(),
  };
  return { ...render(<SequenceStudioWorkbench {...handlers} />), handlers };
}

function seedReformer(exercises: PilatesExercise[] = [first, second]) {
  const current = usePilatesStore.getState();
  expect(current.updateSequencePlanningConditions({ apparatus: 'reformer' }).success).toBe(true);
  for (const exercise of exercises) {
    expect(usePilatesStore.getState().insertExerciseIntoSequence(exercise.id, { kind: 'end' }).success).toBe(true);
  }
}

function searchAndAdd(exercise: PilatesExercise) {
  fireEvent.change(screen.getByRole('textbox', { name: '수업 동작 검색' }), { target: { value: exercise.nameKo } });
  fireEvent.click(screen.getByRole('button', { name: `${exercise.nameKo} 추가` }));
}

function openEditor(exercise: PilatesExercise) {
  fireEvent.click(screen.getByRole('button', { name: `${exercise.nameKo} 시간과 메모 편집` }));
  return within(screen.getByRole('dialog', { name: exercise.nameKo }));
}

describe('single-canvas sequence studio journeys', () => {
  it('explains a blocked start beside the action and clears the explanation when missing exercise data is restored', () => {
    seedReformer([first, second]);
    usePilatesStore.setState((state) => ({
      exercises: state.exercises.filter((exercise) => exercise.id !== second.id),
    }));
    const { handlers } = showStudio();
    const start = screen.getByRole('button', { name: '수업 시작' });
    const explanation = screen.getByRole('list', { name: '수업 시작 전 확인' });
    expect(start).toBeDisabled();
    expect(explanation).toHaveTextContent('2번 항목 · 삭제되었거나 찾을 수 없는 동작이 있습니다.');
    expect(start).toHaveAccessibleDescription('2번 항목 · 삭제되었거나 찾을 수 없는 동작이 있습니다.');
    expect(explanation).not.toHaveTextContent('목표보다');

    act(() => usePilatesStore.setState((state) => ({ exercises: [...state.exercises, second] })));
    expect(screen.queryByRole('list', { name: '수업 시작 전 확인' })).not.toBeInTheDocument();
    expect(start).not.toHaveAttribute('aria-describedby');
    expect(start).toBeEnabled();
    fireEvent.click(start);
    expect(handlers.onStartClass).toHaveBeenCalledTimes(1);
  });

  it('marks an infeasible target invalid, restores the applied value on blur, and still lets a longer target be typed', () => {
    seedReformer([first]);
    expect(usePilatesStore.getState().addRestStep(15).success).toBe(true);
    showStudio();
    const before = usePilatesStore.getState();
    const target = screen.getByLabelText('수업 목표 시간');
    target.focus();
    fireEvent.change(target, { target: { value: '10' } });
    expect(target).toHaveValue(10);
    expect(target).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('휴식');
    expect(usePilatesStore.getState()).toMatchObject({
      activeTargetMinutes: 50, lastCriteria: { targetMinutes: 50 }, draftCriteria: { targetMinutes: 50 },
    });
    expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
    expect(usePilatesStore.getState().undoStack).toBe(before.undoStack);
    fireEvent.blur(target);
    expect(target).toHaveValue(50);
    expect(target).not.toHaveAttribute('aria-invalid', 'true');

    target.focus();
    for (const value of ['1', '10']) {
      fireEvent.change(target, { target: { value } });
      expect(target).toHaveValue(Number(value));
      expect(usePilatesStore.getState().activeTargetMinutes).toBe(50);
    }
    fireEvent.change(target, { target: { value: '100' } });
    expect(target).toHaveValue(100);
    expect(target).not.toHaveAttribute('aria-invalid', 'true');
    expect(usePilatesStore.getState()).toMatchObject({
      activeTargetMinutes: 100, lastCriteria: { targetMinutes: 100 }, draftCriteria: { targetMinutes: 100 },
    });
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
    expect(usePilatesStore.getState().savedSequences).toEqual([savedSource]);
  });

  it('returns focus and uses the applied Reformer plan after leaving an unapplied Cadillac draft in advanced tools', async () => {
    seedReformer([first]);
    usePilatesStore.setState((state) => ({
      exercises: [...state.exercises, cadillac],
      ownedApparatus: [...state.ownedApparatus, 'cadillac'],
      ownedEquipment: [...state.ownedEquipment, 'cadillac'],
    }));
    showStudio();
    const before = usePilatesStore.getState();
    await openAdvancedWorkbench();
    const returnToSimple = screen.getByRole('button', { name: '간편 작성으로 돌아가기' });
    await waitFor(() => expect(returnToSimple).toHaveFocus());
    const conditions = openWorkbenchConditions();
    fireEvent.click(conditions.getByRole('checkbox', { name: '캐딜락' }));
    fireEvent.click(conditions.getByRole('checkbox', { name: '리포머' }));
    fireEvent.click(conditions.getByRole('button', { name: '미니볼' }));
    expect(usePilatesStore.getState().draftCriteria).toMatchObject({
      apparatus: 'cadillac', availableEquipment: ['cadillac'], preferredProps: ['mini-ball'],
    });
    expect(usePilatesStore.getState().lastCriteria).toBe(before.lastCriteria);
    expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
    closeWorkbenchConditions();
    fireEvent.click(returnToSimple);
    await waitFor(() => expect(screen.getByLabelText('수업 작성 도구 더보기')).toHaveFocus());
    expect(screen.getByLabelText('수업 기구')).toHaveValue('reformer');
    expect(screen.getByRole('checkbox', { name: '수업 조건에 맞는 동작만' })).toBeChecked();
    expect(screen.queryByRole('button', { name: `${cadillac.nameKo} 추가` })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: `${propExercise.nameKo} 추가` })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: `${second.nameKo} 추가` })).toBeEnabled();
    expect(usePilatesStore.getState().draftCriteria?.apparatus).toBe('cadillac');
    searchAndAdd(second);
    expect(usePilatesStore.getState().activeSteps.map((step) => step.exerciseId)).toEqual([first.id, second.id]);

    fireEvent.change(screen.getByLabelText('수업 목표 시간'), { target: { value: '45' } });
    expect(usePilatesStore.getState().lastCriteria).toMatchObject({
      apparatus: 'reformer', availableEquipment: ['reformer'], preferredProps: ['none'], targetMinutes: 45,
    });
    expect(usePilatesStore.getState().draftCriteria).toEqual(usePilatesStore.getState().lastCriteria);
    expect(usePilatesStore.getState().savedSequences).toEqual([savedSource]);
  }, 30000);

  it('persists a valid title and target before blur, and retains the last valid plan when an incomplete field is abandoned', () => {
    seedReformer([first]);
    let view = showStudio();
    const rows = usePilatesStore.getState().activeSteps;
    const title = screen.getByLabelText('수업 이름');
    title.focus();
    fireEvent.change(title, { target: { value: '바로 보관할 목요일 수업' } });
    expect(title).toHaveFocus();
    expect(usePilatesStore.getState().activeTitle).toBe('바로 보관할 목요일 수업');
    // Navigating away can unmount a focused field without a React blur event.
    view.unmount();
    view = showStudio();
    expect(screen.getByLabelText('수업 이름')).toHaveValue('바로 보관할 목요일 수업');

    const target = screen.getByLabelText('수업 목표 시간');
    target.focus();
    fireEvent.change(target, { target: { value: '60' } });
    expect(target).toHaveFocus();
    expect(usePilatesStore.getState()).toMatchObject({
      activeTargetMinutes: 60,
      draftCriteria: { targetMinutes: 60 },
      lastCriteria: { targetMinutes: 60 },
    });
    const persisted = JSON.parse(localStorage.getItem('pilates-flow-atelier-storage-v3')!).state;
    expect(persisted.activeTitle).toBe('바로 보관할 목요일 수업');
    expect(persisted.activeTargetMinutes).toBe(60);
    view.unmount();
    view = showStudio();
    expect(screen.getByLabelText('수업 목표 시간')).toHaveValue(60);

    const restoredTarget = screen.getByLabelText('수업 목표 시간');
    for (const value of ['', '0', '130', '12.5']) {
      fireEvent.change(restoredTarget, { target: { value } });
      expect(usePilatesStore.getState().activeTargetMinutes).toBe(60);
    }
    fireEvent.blur(restoredTarget);
    expect(restoredTarget).toHaveValue(60);
    expect(screen.getByRole('status')).toHaveTextContent('10–120분 사이 정수');
    fireEvent.change(screen.getByLabelText('수업 이름'), { target: { value: '' } });
    view.unmount();
    showStudio();
    expect(screen.getByLabelText('수업 이름')).toHaveValue('바로 보관할 목요일 수업');
    expect(usePilatesStore.getState().activeSteps).toBe(rows);
    expect(usePilatesStore.getState().savedSequences).toEqual([savedSource]);
  });

  it('returns focus to the visible plan heading after removing the last row and lets undo restore it', async () => {
    seedReformer([first]);
    showStudio();
    const rows = structuredClone(usePilatesStore.getState().activeSteps);
    const remove = screen.getByRole('button', { name: `1번 ${first.nameKo} 삭제` });
    remove.focus();
    fireEvent.click(remove);
    const heading = screen.getByRole('heading', { name: '내 시퀀스' });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.getByTestId('sequence-studio')).toHaveAttribute('data-mobile-pane', 'plan');
    expect(screen.getByRole('textbox', { name: '수업 동작 검색' })).not.toHaveFocus();
    expect(screen.queryAllByTestId('sequence-studio-row')).toHaveLength(0);
    expect(screen.getByRole('button', { name: '수업 시작' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '마지막 편집 되돌리기' }));
    expect(usePilatesStore.getState().activeSteps).toEqual(rows);
    expect(usePilatesStore.getState().savedSequences).toEqual([savedSource]);
  });

  it('creates, filters, adds, reorders, edits a bilateral budget, undoes, saves and starts the current plan without touching a saved source', async () => {
    const { handlers } = showStudio();
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '수업 시작' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '새 수업' }));
    expect(usePilatesStore.getState().activeTitle).toBe('새 수업');
    expect(usePilatesStore.getState().activeSequenceId).not.toBe('empty-studio-draft');
    fireEvent.change(screen.getByLabelText('수업 기구'), { target: { value: 'reformer' } });
    const goal = screen.getByLabelText('수업 목표 시간');
    fireEvent.change(goal, { target: { value: '30' } });
    fireEvent.blur(goal);
    expect(usePilatesStore.getState().lastCriteria?.availableEquipment).toEqual(['reformer']);

    for (const exercise of [first, second, third]) searchAndAdd(exercise);
    expect(screen.getAllByTestId('sequence-studio-row')).toHaveLength(3);
    const firstDown = screen.getByRole('button', { name: `1번 ${first.nameKo} 아래로` });
    firstDown.focus();
    expect(firstDown).toHaveFocus();
    fireEvent.click(firstDown); // Activate the focusable alternative to dragging.
    const thirdUp = screen.getByRole('button', { name: `3번 ${third.nameKo} 위로` });
    thirdUp.focus();
    fireEvent.click(thirdUp);
    expect(usePilatesStore.getState().activeSteps.map((step) => step.exerciseId)).toEqual([second.id, third.id, first.id]);

    const beforeEdit = structuredClone(usePilatesStore.getState().activeSteps);
    let editor = openEditor(second);
    fireEvent.change(editor.getByLabelText('동작 전체 시간'), { target: { value: '2' } });
    fireEvent.change(editor.getByLabelText('설명 · 초'), { target: { value: '120' } });
    fireEvent.change(editor.getByLabelText('다음 동작 준비 · 초'), { target: { value: '10' } });
    fireEvent.click(editor.getByRole('button', { name: '변경 적용' }));
    expect(editor.getByRole('alert')).toHaveTextContent('전체 시간을 넘을 수 없습니다');
    expect(usePilatesStore.getState().activeSteps).toEqual(beforeEdit);

    fireEvent.change(editor.getByLabelText('설명 · 초'), { target: { value: '20' } });
    fireEvent.change(editor.getByLabelText('좌우 수행'), { target: { value: 'left-then-right' } });
    fireEvent.change(editor.getByLabelText('횟수 · 선택'), { target: { value: '8' } });
    fireEvent.change(editor.getByLabelText('수업 메모'), { target: { value: '회원에게 전달할 오늘의 메모' } });
    fireEvent.click(editor.getByRole('button', { name: '변경 적용' }));
    const edited = usePilatesStore.getState().activeSteps[0];
    expect(getStepTiming(edited, second)).toMatchObject({ totalSec: 120, explanationSec: 20, transitionSec: 10, movementSec: 90, sides: 2, perSideSec: 45 });
    expect(edited.repetitions).toBe(8);
    expect(edited.instructorNote).toBe('회원에게 전달할 오늘의 메모');
    fireEvent.click(screen.getByRole('button', { name: '마지막 편집 되돌리기' }));
    expect(usePilatesStore.getState().activeSteps).toEqual(beforeEdit);

    editor = openEditor(second);
    fireEvent.change(editor.getByLabelText('동작 전체 시간'), { target: { value: '2' } });
    fireEvent.click(editor.getByRole('button', { name: '변경 적용' }));
    const beforeRest = getSequenceDurations(usePilatesStore.getState().activeSteps).totalSec;
    fireEvent.click(screen.getByRole('button', { name: '휴식 1분 추가' }));
    expect(getSequenceDurations(usePilatesStore.getState().activeSteps).totalSec).toBe(beforeRest + 60);
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('저장한 수업에 보관했습니다'));
    expect(usePilatesStore.getState().savedSequences.find((item) => item.id === savedSource.id)).toEqual(savedSource);
    expect(usePilatesStore.getState().savedSequences).toHaveLength(2);
    // A target mismatch is allowed: the action starts the actual current budget.
    expect(usePilatesStore.getState().activeTargetMinutes).toBe(30);
    expect(screen.getByRole('button', { name: '수업 시작' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '수업 시작' }));
    expect(handlers.onStartClass).toHaveBeenCalledTimes(1);
  });

  it('reports a rejected addition without marking it added, then accepts it after applying its prop condition', () => {
    seedReformer([]);
    showStudio();
    fireEvent.click(screen.getByRole('checkbox', { name: '수업 조건에 맞는 동작만' }));
    searchAndAdd(propExercise);
    expect(usePilatesStore.getState().activeSteps).toEqual([]);
    expect(screen.queryAllByTestId('sequence-studio-row')).toHaveLength(0);
    expect(screen.getByRole('status')).toHaveTextContent('조건에 맞는 동작만 추가');
    expect(screen.getByRole('button', { name: `${propExercise.nameKo} 추가` })).toBeEnabled();
    expect(screen.queryByRole('button', { name: `${propExercise.nameKo} 추가됨` })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '수업 조건' }));
    const conditions = within(screen.getByRole('dialog', { name: '수업 조건' }));
    fireEvent.click(conditions.getByRole('checkbox', { name: '미니볼' }));
    fireEvent.click(conditions.getByRole('button', { name: '완료' }));
    fireEvent.click(screen.getByRole('button', { name: `${propExercise.nameKo} 추가` }));
    expect(usePilatesStore.getState().activeSteps.map((step) => step.exerciseId)).toEqual([propExercise.id]);
    expect(screen.getByRole('button', { name: `${propExercise.nameKo} 추가됨` })).toBeDisabled();
  });

  it('keeps locked rows and exposes move, edit and delete guards while allowing undo of an unlocked deletion', () => {
    seedReformer();
    showStudio();
    fireEvent.click(screen.getByRole('button', { name: `${first.nameKo} 잠그기` }));
    const before = structuredClone(usePilatesStore.getState().activeSteps);
    for (const name of [
      `1번 ${first.nameKo} 아래로`, `1번 ${first.nameKo} 삭제`, `${first.nameKo} 시간과 메모 편집`,
      `2번 ${second.nameKo} 위로`,
    ]) {
      const control = screen.getByRole('button', { name });
      expect(control).toBeDisabled();
      fireEvent.click(control);
    }
    expect(usePilatesStore.getState().activeSteps).toEqual(before);
    fireEvent.click(screen.getByRole('button', { name: `2번 ${second.nameKo} 삭제` }));
    expect(usePilatesStore.getState().activeSteps).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: '마지막 편집 되돌리기' }));
    expect(usePilatesStore.getState().activeSteps).toEqual(before);
  });

  it('keeps new-class decisions reversible and opens a recent saved class as an editable copy', async () => {
    seedReformer([first]);
    showStudio();
    const current = structuredClone(usePilatesStore.getState().activeSteps);
    fireEvent.click(screen.getByRole('button', { name: '새 수업' }));
    let prompt = within(screen.getByRole('dialog', { name: '새 수업을 만들까요?' }));
    fireEvent.click(prompt.getByRole('button', { name: '계속 편집' }));
    expect(usePilatesStore.getState().activeSteps).toEqual(current);
    fireEvent.click(screen.getByRole('button', { name: '새 수업' }));
    prompt = within(screen.getByRole('dialog', { name: '새 수업을 만들까요?' }));
    fireEvent.click(prompt.getByRole('button', { name: '저장 없이 새로 만들기' }));
    expect(usePilatesStore.getState().activeSteps).toEqual([]);
    expect(usePilatesStore.getState().savedSequences).toEqual([savedSource]);
    fireEvent.click(screen.getByRole('button', { name: '마지막 편집 되돌리기' }));
    expect(usePilatesStore.getState().activeSteps).toEqual(current);
    fireEvent.click(screen.getByRole('button', { name: '새 수업' }));
    prompt = within(screen.getByRole('dialog', { name: '새 수업을 만들까요?' }));
    fireEvent.click(prompt.getByRole('button', { name: '저장하고 새로 만들기' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '새 수업을 만들까요?' })).not.toBeInTheDocument());
    expect(usePilatesStore.getState().activeSteps).toEqual([]);
    expect(usePilatesStore.getState().savedSequences).toHaveLength(2);
    expect(usePilatesStore.getState().savedSequences.find((item) => item.id === savedSource.id)).toEqual(savedSource);
    fireEvent.click(screen.getByRole('button', { name: /원본 매트 수업/ }));
    expect(usePilatesStore.getState().activeSequenceId).not.toBe(savedSource.id);
    expect(usePilatesStore.getState().activeTitle).toBe(`${savedSource.title} (복사)`);
    expect(usePilatesStore.getState().activeSteps).toEqual(savedSource.steps);
    expect(usePilatesStore.getState().savedSequences.find((item) => item.id === savedSource.id)).toEqual(savedSource);
  });

  it('rejects a stale inspector apply instead of overwriting a newer row edit', () => {
    seedReformer([first]);
    showStudio();
    const editor = openEditor(first);
    fireEvent.change(editor.getByLabelText('동작 전체 시간'), { target: { value: '2' } });
    act(() => usePilatesStore.getState().updateStepNote(0, '다른 편집에서 저장한 최신 메모'));
    const newest = usePilatesStore.getState().activeSteps[0];
    fireEvent.click(editor.getByRole('button', { name: '변경 적용' }));
    expect(editor.getByRole('alert')).toHaveTextContent('다른 곳에서 변경');
    expect(usePilatesStore.getState().activeSteps[0]).toBe(newest);
    expect(newest.instructorNote).toBe('다른 편집에서 저장한 최신 메모');
    expect(newest.durationMin).toBe(4);
  });

  it('keeps the current class open when saving before a new class fails in browser storage', async () => {
    seedReformer([first]);
    showStudio();
    const rows = usePilatesStore.getState().activeSteps;
    fireEvent.click(screen.getByRole('button', { name: '새 수업' }));
    const prompt = within(screen.getByRole('dialog', { name: '새 수업을 만들까요?' }));
    const denied = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage blocked by QA test'); });
    fireEvent.click(prompt.getByRole('button', { name: '저장하고 새로 만들기' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('브라우저 저장 공간에 기록하지 못했습니다'));
    expect(screen.getByRole('dialog', { name: '새 수업을 만들까요?' })).toBeInTheDocument();
    expect(usePilatesStore.getState().activeSteps).toBe(rows);
    expect(screen.getByRole('status')).not.toHaveTextContent('저장한 수업에 보관했습니다');
    denied.mockRestore();
  });
});
