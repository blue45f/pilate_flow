import { getVisibleWorkbenchButton } from '../test/workbenchControls';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import type { AutoGenerateCriteria } from '../types/pilates';
import { InlineExerciseFinder } from './InlineExerciseFinder';
import { SequenceWorkbench } from './SequenceWorkbench';

vi.mock('./MotionReferencePlayer', () => ({
  MotionReferencePlayer: () => <div data-testid="flow-motion-reference" />,
}));

const original = usePilatesStore.getState();
const originalWidth = window.innerWidth;
const pendingMat = syntheticPlanningExercise('mat', 'warmup', 'alpha', false);
const pendingReformer = syntheticPlanningExercise('reformer', 'core', 'beta', false);
const reviewed = syntheticPlanningExercise('mat', 'warmup');
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

beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
  usePilatesStore.setState(
    {
      ...original,
      activeTab: 'workbench',
      exercises: [pendingMat, pendingReformer],
      activeSteps: [],
      activeSequenceId: 'flow-clarity-test',
      activeTitle: '흐름 검증용 수업',
      activeApparatus: 'mat',
      activeLevel: '1.0',
      activeTargetMinutes: 10,
      draftCriteria: criteria,
      lastCriteria: null,
      ownedEquipment: ['mat'],
      ownedApparatus: ['mat'],
      ownedProps: [],
      savedSequences: [],
      historyLogs: [],
      undoStack: [],
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
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
});
const renderWorkbench = () =>
  render(
    <SequenceWorkbench
      onOpenYouTubePreview={vi.fn()}
      onOpenClipper={vi.fn()}
      onOpenLogModal={vi.fn()}
    />,
  );

describe('workbench flow clarity without changing review eligibility', () => {
  it('makes class equipment explicit, while all equipment remains the initial and reversible view', () => {
    const before = usePilatesStore.getState();
    render(<InlineExerciseFinder onOpenExercise={vi.fn()} classEquipment={['mat']} />);
    expect(screen.getByRole('region', { name: '이번 수업 기구' })).toHaveTextContent('매트');
    expect(screen.getByRole('status')).toHaveTextContent('2개 결과');
    expect(screen.getByRole('button', { name: '전체 기구 보기' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: '수업 기구로 좁히기' }));
    expect(screen.getByRole('status')).toHaveTextContent('1개 결과');
    expect(screen.getByRole('button', { name: '수업 기구로 좁히기' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: pendingMat.nameKo + ' 상세 보기' })).toBeVisible();
    expect(screen.getByRole('button', { name: /수업안에 추가/ })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '전체 기구 보기' }));
    expect(screen.getByRole('status')).toHaveTextContent('2개 결과');
    const after = usePilatesStore.getState();
    expect(after.draftCriteria).toBe(before.draftCriteria);
    expect(after.activeSteps).toBe(before.activeSteps);
    expect(after.ownedEquipment).toBe(before.ownedEquipment);
  });

  it('preserves the search and local filter when current class equipment changes', () => {
    const { rerender } = render(
      <InlineExerciseFinder onOpenExercise={vi.fn()} classEquipment={['mat']} />,
    );
    fireEvent.click(screen.getByRole('button', { name: '수업 기구로 좁히기' }));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: pendingMat.nameKo } });
    rerender(<InlineExerciseFinder onOpenExercise={vi.fn()} classEquipment={['reformer']} />);
    expect(screen.getByRole('region', { name: '이번 수업 기구' })).toHaveTextContent('리포머');
    expect(screen.getByRole('searchbox')).toHaveValue(pendingMat.nameKo);
    expect(screen.getByRole('status')).toHaveTextContent('1개 결과');
    expect(screen.getByRole('button', { name: '수업 기구로 좁히기' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('allows pending local records to compose while preserving review evidence', () => {
    renderWorkbench();
    const before = usePilatesStore.getState();
    fireEvent.click(screen.getByText('자동 구성·휴식 먼저 넣기'));
    expect(getVisibleWorkbenchButton('시퀀스 만들기')).toBeEnabled();
    expect(screen.queryByRole('button', { name: '검토할 동작 찾기' })).not.toBeInTheDocument();
    expect(usePilatesStore.getState().exercises).toBe(before.exercises);
    expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
  });

  it('leaves automatic composition available when an eligible reviewed exercise exists', () => {
    usePilatesStore.setState({ exercises: [reviewed, pendingMat] });
    renderWorkbench();
    fireEvent.click(screen.getByText('자동 구성·휴식 먼저 넣기'));
    expect(getVisibleWorkbenchButton('시퀀스 만들기')).toBeEnabled();
    expect(screen.queryByRole('button', { name: '검토할 동작 찾기' })).not.toBeInTheDocument();
  });
});
