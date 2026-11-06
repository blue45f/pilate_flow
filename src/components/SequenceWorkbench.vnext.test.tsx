import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import { createEmptyInstructorSchedule } from '../types/instructorSchedule';
import type { AutoGenerateCriteria, SequenceStep } from '../types/pilates';
import { SequenceWorkbench } from './SequenceWorkbench';

vi.mock('./MotionReferencePlayer', () => ({
  MotionReferencePlayer: () => <div data-testid="vnext-motion-reference" />,
}));

const original = usePilatesStore.getState();
const originalWidth = window.innerWidth;
const reviewed = syntheticPlanningExercise('mat', 'warmup');
const pending = syntheticPlanningExercise('mat', 'core', 'alpha', false);
const criteria: AutoGenerateCriteria = {
  apparatus: 'mat',
  availableEquipment: ['mat'],
  ownedApparatus: ['mat'],
  preferredProps: ['none'],
  level: '1.0',
  focusPreset: 'full-body',
  targetMinutes: 10,
  excludeDaysWindow: 0,
  defaultLayer: 'standard',
};
const readyStep: SequenceStep = {
  stepId: 'vnext-test-step',
  order: 1,
  exerciseId: reviewed.id,
  blockCategory: 'warmup',
  durationMin: 10,
  explanationSec: 20,
  transitionSec: 0,
  selectedLayer: 'standard',
  repetitions: 8,
  sets: 2,
  instructorNote: '합성 테스트 메모',
};

const renderWorkbench = (onOpenYouTubePreview = vi.fn()) =>
  render(
    <SequenceWorkbench
      onOpenYouTubePreview={onOpenYouTubePreview}
      onOpenClipper={vi.fn()}
      onOpenLogModal={vi.fn()}
    />,
  );

const openPreview = () => {
  fireEvent.click(screen.getByRole('button', { name: '3 미리보기' }));
  return screen.getByRole('dialog', { name: '전체 수업 계획 미리보기' });
};

beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: 390,
  });
  usePilatesStore.setState(
    {
      ...original,
      activeTab: 'workbench',
      activeSequenceId: 'vnext-test-plan',
      activeTitle: 'vNext 합성 수업',
      activeSteps: [],
      activeTargetMinutes: 10,
      activeApparatus: 'mat',
      activeLevel: '1.0',
      exercises: [reviewed, pending],
      draftCriteria: criteria,
      lastCriteria: null,
      ownedEquipment: ['mat'],
      ownedApparatus: ['mat'],
      ownedProps: [],
      savedSequences: [],
      historyLogs: [],
      undoStack: [],
      instructorSchedule: createEmptyInstructorSchedule(),
      generationError: null,
      persistenceError: null,
      saveFeedback: null,
    },
    true,
  );
});

afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: originalWidth,
  });
});

describe('vNext instructor preparation continuity', () => {
  it.each([
    {
      exercises: [pending],
      nextAction: '동작 고르기',
      catalogState: 'draft-only',
    },
    {
      exercises: [reviewed, pending],
      nextAction: '동작 고르기',
      catalogState: 'reviewed',
    },
  ])(
    'keeps movement selection dominant for an empty plan with a $catalogState catalog',
    ({ exercises, nextAction }) => {
      usePilatesStore.setState({ exercises });
      renderWorkbench();

      expect(screen.getByRole('button', { name: nextAction })).toBeEnabled();
      expect(screen.getByRole('button', { name: '1 동작 선택' })).toHaveAttribute(
        'aria-current',
        'step',
      );
      expect(screen.getByRole('button', { name: '2 수업 구성' })).toBeDisabled();
      expect(screen.getByRole('button', { name: '3 미리보기' })).toBeDisabled();
      expect(screen.queryByRole('button', { name: '저장' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '시퀀스 미리보기' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /수업 시작/ })).not.toBeInTheDocument();
    },
  );

  it('adds through the real contextual mobile finder and returns to editing without leaving the plan', () => {
    const before = usePilatesStore.getState();
    renderWorkbench();
    fireEvent.click(screen.getByRole('button', { name: '동작 고르기' }));
    const finderDialog = screen.getByRole('dialog', {
      name: '수업에 넣을 동작 고르기',
    });
    const finder = within(finderDialog);
    expect(screen.getByRole('button', { name: '1 동작 선택' })).toHaveAttribute(
      'aria-current',
      'step',
    );
    expect(usePilatesStore.getState().activeTab).toBe('workbench');

    fireEvent.click(finder.getByRole('button', { name: `${reviewed.nameKo} 수업안에 추가` }));
    const afterAdd = usePilatesStore.getState();
    expect(afterAdd.activeSteps).toHaveLength(1);
    expect(afterAdd.activeSteps[0].exerciseId).toBe(reviewed.id);
    expect(afterAdd.activeTab).toBe('workbench');
    expect(
      finder.getByRole('button', {
        name: `${reviewed.nameKo} 이미 수업안에 있음`,
      }),
    ).toBeDisabled();
    expect(finderDialog.querySelector('.workbench-finder-footer')).toHaveTextContent('1');

    fireEvent.click(finder.getByRole('button', { name: '수업 구성으로 돌아가기' }));
    expect(
      screen.queryByRole('dialog', { name: '수업에 넣을 동작 고르기' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2 수업 구성' })).toHaveAttribute(
      'aria-current',
      'step',
    );
    const after = usePilatesStore.getState();
    expect(after.activeTab).toBe('workbench');
    expect(after.draftCriteria).toBe(before.draftCriteria);
    expect(after.ownedEquipment).toBe(before.ownedEquipment);
    expect(after.classGroups).toBe(before.classGroups);
    expect(after.historyLogs).toBe(before.historyLogs);
  });

  it('opens a draft for review without adding or approving it', () => {
    usePilatesStore.setState({ exercises: [pending] });
    const before = usePilatesStore.getState();
    const onOpenReview = vi.fn();
    renderWorkbench(onOpenReview);
    fireEvent.click(screen.getByRole('button', { name: '동작 고르기' }));
    const finder = within(screen.getByRole('dialog', { name: '수업에 넣을 동작 고르기' }));
    const add = finder.getByRole('button', {
      name: `${pending.nameKo} 수업안에 추가`,
    });
    expect(add).toBeEnabled();
    fireEvent.click(finder.getByRole('button', { name: `${pending.nameKo} 상세 보기` }));
    expect(onOpenReview).toHaveBeenCalledWith(pending);
    const after = usePilatesStore.getState();
    expect(after.activeTab).toBe('workbench');
    expect(after.activeSteps).toBe(before.activeSteps);
    expect(after.exercises).toBe(before.exercises);
    expect(after.historyLogs).toBe(before.historyLogs);
  });

  it('lets the instructor preview, save a copy, and return to the same editable plan', () => {
    usePilatesStore.setState({ activeSteps: [readyStep] });
    const before = usePilatesStore.getState();
    renderWorkbench();
    expect(screen.getByRole('button', { name: '2 수업 구성' })).toHaveAttribute(
      'aria-current',
      'step',
    );
    const dialog = openPreview();
    expect(screen.getByRole('button', { name: '3 미리보기' })).toHaveAttribute(
      'aria-current',
      'step',
    );
    fireEvent.click(within(dialog).getByRole('button', { name: '사본 저장' }));

    const saved = usePilatesStore.getState();
    expect(saved.savedSequences).toHaveLength(1);
    expect(saved.savedSequences[0].steps).toEqual(before.activeSteps);
    expect(saved.savedSequences[0].title).toBe(before.activeTitle);
    expect(saved.historyLogs).toBe(before.historyLogs);
    expect(saved.exercises).toBe(before.exercises);

    fireEvent.click(within(dialog).getByRole('button', { name: '편집으로 돌아가기' }));
    expect(
      screen.queryByRole('dialog', { name: '전체 수업 계획 미리보기' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2 수업 구성' })).toHaveAttribute(
      'aria-current',
      'step',
    );
    expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
    expect(usePilatesStore.getState().activeTab).toBe('workbench');
  });

  it.each([
    { reason: 'time mismatch', steps: [{ ...readyStep, durationMin: 9 }] },
    {
      reason: 'missing exercise',
      steps: [{ ...readyStep, exerciseId: 'missing-exercise' }],
    },
    {
      reason: 'duplicate movement',
      steps: [
        { ...readyStep, durationMin: 5 },
        {
          ...readyStep,
          stepId: 'vnext-test-duplicate',
          order: 2,
          durationMin: 5,
        },
      ],
    },
  ])(
    'requires valid data but allows repeats and target differences: $reason',
    ({ steps, reason }) => {
      usePilatesStore.setState({ activeSteps: steps });
      renderWorkbench();
      const dialog = openPreview();
      const start = within(dialog).getByRole('button', { name: /수업 시작/ });
      if (reason === 'missing exercise') expect(start).toBeDisabled();
      else expect(start).toBeEnabled();
      fireEvent.click(start);
      expect(usePilatesStore.getState().activeTab).toBe(
        reason === 'missing exercise' ? 'workbench' : 'stage',
      );
      expect(usePilatesStore.getState().historyLogs).toHaveLength(0);
    },
  );

  it('starts a ready plan from preview without inventing a class record', () => {
    usePilatesStore.setState({ activeSteps: [readyStep] });
    renderWorkbench();
    const dialog = openPreview();
    const start = within(dialog).getByRole('button', { name: /수업 시작/ });
    expect(start).toBeEnabled();
    fireEvent.click(start);
    expect(usePilatesStore.getState().activeTab).toBe('stage');
    expect(usePilatesStore.getState().historyLogs).toHaveLength(0);
    expect(usePilatesStore.getState().exercises).toEqual([reviewed, pending]);
  });

  it('disables start when the opened preview becomes stale even if the edited plan is still ready', () => {
    usePilatesStore.setState({ activeSteps: [readyStep] });
    renderWorkbench();
    const dialog = openPreview();
    expect(within(dialog).getByRole('button', { name: /수업 시작/ })).toBeEnabled();

    act(() => {
      usePilatesStore.setState({
        activeSteps: [{ ...readyStep, instructorNote: '다른 편집에서 바뀐 합성 메모' }],
      });
    });

    expect(within(dialog).getByRole('button', { name: /수업 시작/ })).toBeDisabled();
    expect(dialog).toHaveTextContent('이 화면을 연 뒤 원본 계획 또는 검토 정보가 바뀌었습니다.');
    expect(usePilatesStore.getState().activeTab).toBe('workbench');
    expect(usePilatesStore.getState().historyLogs).toHaveLength(0);
  });
});
