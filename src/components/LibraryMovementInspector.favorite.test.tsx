import { createRef } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import type { AutoGenerateCriteria, FavoriteTag, PilatesExercise, SequenceStep } from '../types/pilates';
import { getExerciseReviewState } from '../utils/exerciseReview';
import { LibraryMovementInspector } from './LibraryMovementInspector';

vi.mock('./PostureAnatomyGuide', () => ({ PostureAnatomyGuide: () => null }));
vi.mock('./StudioClinicalBriefCard', () => ({ StudioClinicalBriefCard: () => null }));
vi.mock('./Studio3DMotionHeroCard', () => ({ Studio3DMotionHeroCard: () => null }));

const originalState = usePilatesStore.getState();
const firstExercise = syntheticPlanningExercise('mat', 'warmup');
const secondExercise = syntheticPlanningExercise('mat', 'core', 'beta', false);
const criteria: AutoGenerateCriteria = {
  apparatus: 'mat',
  availableEquipment: ['mat'],
  ownedApparatus: ['mat'],
  preferredProps: ['none'],
  level: '1.0',
  focusPreset: 'full-body',
  excludeDaysWindow: 0,
  targetMinutes: 50,
  defaultLayer: 'standard',
};
const classStep: SequenceStep = {
  stepId: 'favorite-test-class-step',
  exerciseId: firstExercise.id,
  order: 1,
  blockCategory: 'warmup',
  durationMin: 4,
  selectedLayer: 'standard',
  instructorNote: '현재 수업에만 남기는 메모',
  locked: true,
};

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  usePilatesStore.setState({
    ...originalState,
    exercises: structuredClone([firstExercise, secondExercise]),
    activeSteps: structuredClone([classStep]),
    activeTitle: '즐겨찾기 분류 중인 수업',
    activeSequenceId: 'favorite-test-sequence',
    draftCriteria: structuredClone(criteria),
    lastCriteria: structuredClone(criteria),
    savedSequences: [{
      id: 'favorite-test-sequence',
      title: '저장한 원래 수업',
      subtitle: '',
      apparatus: 'mat',
      level: '1.0',
      targetMinutes: 50,
      focusTags: [],
      steps: structuredClone([classStep]),
      createdAt: '2026-11-13T09:00:00.000Z',
      updatedAt: '2026-11-13T09:00:00.000Z',
      taughtCount: 1,
    }],
    historyLogs: [{
      id: 'favorite-test-history',
      sequenceId: 'favorite-test-sequence',
      sequenceTitle: '당시 진행한 수업',
      groupId: 'favorite-test-group',
      groupName: '테스트 수업 그룹',
      taughtAt: '2026-11-13T09:00:00.000Z',
      apparatus: 'mat',
      level: '1.0',
      exerciseIds: [firstExercise.id],
      rating: 4,
      intensity: 'moderate',
      instructorReflection: '당시 수업 기록을 그대로 보존',
      stepsSnapshot: structuredClone([classStep]),
    }],
    undoStack: [],
    generationError: null,
  }, true);
});

afterEach(() => {
  cleanup();
  usePilatesStore.setState(originalState, true);
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

function inspectorProps(exercise: PilatesExercise | null) {
  return {
    exercise,
    headingRef: createRef<HTMLHeadingElement>(),
    isInResults: true,
    onClose: vi.fn(),
    onOpenDetails: vi.fn(),
    onAdd: vi.fn(),
    addedId: null,
  };
}

describe('LibraryMovementInspector favorite classification', () => {
  it('assigns each existing category and clears it without changing class drafts, history, or personal review', () => {
    const before = usePilatesStore.getState();
    const props = inspectorProps(firstExercise);
    render(<LibraryMovementInspector {...props} />);
    const selector = screen.getByRole('combobox', { name: '이 동작의 즐겨찾기 분류' });
    expect(selector).toHaveValue('none');
    expect(selector).toHaveAccessibleDescription('분류한 동작은 즐겨찾기 필터로 다시 찾을 수 있어요.');

    const tags: FavoriteTag[] = ['signature', 'member-love', 'rehab-posture', 'burn-sculpt', 'none'];
    for (const tag of tags) {
      fireEvent.change(selector, { target: { value: tag } });
      const after = usePilatesStore.getState();
      const changed = after.exercises.find((exercise) => exercise.id === firstExercise.id)!;
      expect(selector).toHaveValue(tag);
      expect(changed.favoriteTag).toBe(tag);
      expect({ ...changed, favoriteTag: firstExercise.favoriteTag }).toEqual(firstExercise);
      expect(getExerciseReviewState(changed)).toBe('approved');
      expect(after.exercises[1]).toBe(before.exercises[1]);
      expect(after.activeSteps).toBe(before.activeSteps);
      expect(after.activeTitle).toBe(before.activeTitle);
      expect(after.activeSequenceId).toBe(before.activeSequenceId);
      expect(after.draftCriteria).toBe(before.draftCriteria);
      expect(after.lastCriteria).toBe(before.lastCriteria);
      expect(after.savedSequences).toBe(before.savedSequences);
      expect(after.historyLogs).toBe(before.historyLogs);
      expect(after.undoStack).toBe(before.undoStack);
    }
    expect(before.exercises[0]?.favoriteTag).toBe('none');
    expect(props.onAdd).not.toHaveBeenCalled();
    expect(props.onOpenDetails).not.toHaveBeenCalled();
  });

  it('follows the selected exercise and reflects external favorite changes used by card hearts', () => {
    const props = inspectorProps(firstExercise);
    const { rerender } = render(<LibraryMovementInspector {...props} />);
    const getSelector = () => screen.getByRole('combobox', { name: '이 동작의 즐겨찾기 분류' });
    fireEvent.change(getSelector(), { target: { value: 'member-love' } });

    rerender(<LibraryMovementInspector {...props} exercise={secondExercise} />);
    expect(getSelector()).toHaveValue('none');
    act(() => usePilatesStore.getState().setExerciseFavoriteTag(firstExercise.id, 'burn-sculpt'));
    expect(getSelector()).toHaveValue('none');
    act(() => usePilatesStore.getState().setExerciseFavoriteTag(secondExercise.id, 'signature'));
    expect(getSelector()).toHaveValue('signature');
    act(() => usePilatesStore.getState().setExerciseFavoriteTag(secondExercise.id, 'none'));
    expect(getSelector()).toHaveValue('none');
    expect(getExerciseReviewState(usePilatesStore.getState().exercises[1]!)).toBe('pending');

    rerender(<LibraryMovementInspector {...props} exercise={firstExercise} />);
    expect(getSelector()).toHaveValue('burn-sculpt');
  });

  it('keeps the inspector open when Escape dismisses the native category selector', () => {
    const props = inspectorProps(firstExercise);
    render(<LibraryMovementInspector {...props} />);
    const selector = screen.getByRole('combobox', { name: '이 동작의 즐겨찾기 분류' });
    selector.focus();
    expect(selector).toHaveFocus();
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    fireEvent(selector, escape);
    expect(escape.defaultPrevented).toBe(false);
    expect(props.onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole('heading', { name: '선택한 동작 정보' }), { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it('has no editable classification for an empty selection or an unavailable catalog record', () => {
    const before = usePilatesStore.getState();
    const props = inspectorProps(null);
    const { rerender } = render(<LibraryMovementInspector {...props} />);
    expect(screen.queryByRole('combobox', { name: '이 동작의 즐겨찾기 분류' })).not.toBeInTheDocument();

    const unavailable: PilatesExercise = {
      ...secondExercise,
      id: 'favorite-test-unavailable-record',
      favoriteTag: 'member-love',
    };
    rerender(<LibraryMovementInspector {...props} exercise={unavailable} />);
    const selector = screen.getByRole('combobox', { name: '이 동작의 즐겨찾기 분류' });
    expect(selector).toHaveValue('member-love');
    expect(selector).toBeDisabled();
    expect(selector).toHaveAccessibleDescription('라이브러리에 저장된 동작의 즐겨찾기 분류를 바꿀 수 있어요.');
    fireEvent.change(selector, { target: { value: 'signature' } });
    expect(usePilatesStore.getState()).toBe(before);
  });
});
