import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SequenceWorkbench } from '../components/SequenceWorkbench';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import type { AutoGenerateCriteria, SequenceStep } from '../types/pilates';
import { syntheticPlanningExercise } from './planningFixtures';
import {
  closeWorkbenchConditions,
  openWorkbenchAutomation,
  openWorkbenchConditions,
  openWorkbenchPlanPreview,
} from './workbenchControls';

const original = usePilatesStore.getState();
const criteria: AutoGenerateCriteria = {
  apparatus: 'mat',
  ownedApparatus: ['mat'],
  availableEquipment: ['mat'],
  level: '1.0',
  focusPreset: 'full-body',
  preferredProps: ['none'],
  excludeDaysWindow: 0,
  targetMinutes: 60,
  defaultLayer: 'standard',
  restMinutes: 0,
};
const exercise = INITIAL_EXERCISES.find((item) => item.apparatus === 'mat')!;
const renderWorkbench = () =>
  render(
    <SequenceWorkbench
      onOpenYouTubePreview={vi.fn()}
      onOpenClipper={vi.fn()}
      onOpenLogModal={vi.fn()}
    />,
  );

beforeEach(() =>
  usePilatesStore.setState(
    {
      ...original,
      activeSteps: [],
      activeTargetMinutes: 60,
      activeApparatus: 'mat',
      draftCriteria: criteria,
      lastCriteria: null,
      generationError: null,
      saveFeedback: null,
    },
    true,
  ),
);
afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
});

describe('rest intervals in the class workbench', () => {
  it('keeps the overall sixty-minute budget and passes five rest minutes to generation', () => {
    const generate = vi.fn();
    usePilatesStore.setState({
      autoGenerateSequence: generate,
      exercises: [syntheticPlanningExercise('mat', 'warmup')],
    });
    renderWorkbench();
    openWorkbenchConditions();
    fireEvent.click(screen.getByRole('button', { name: '자동 휴식 5분' }));
    expect(screen.getByText('총 60분 = 동작 55분 + 휴식 5분')).toBeInTheDocument();
    closeWorkbenchConditions();
    fireEvent.click(openWorkbenchAutomation().getByRole('button', { name: '시퀀스 만들기' }));
    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({ targetMinutes: 60, restMinutes: 5 }),
    );
    expect(usePilatesStore.getState().draftCriteria?.restMinutes).toBe(5);
  });

  it('shows rest separately and edits, inserts, removes, moves and locks it without movement cues', () => {
    const steps: SequenceStep[] = [
      {
        stepId: 'rest-ui-pending-exercise',
        order: 1,
        exerciseId: exercise.id,
        blockCategory: 'warmup',
        selectedLayer: 'standard',
        durationMin: 55,
      },
      {
        stepId: 'rest-ui-break',
        kind: 'rest',
        order: 2,
        exerciseId: '',
        blockCategory: 'core',
        selectedLayer: 'standard',
        durationMin: 5,
      },
    ];
    usePilatesStore.setState({ activeSteps: steps });
    renderWorkbench();
    fireEvent.click(screen.getByText('시간 구성 상세', { selector: 'summary' }));
    const breakdown = screen.getByLabelText('수업 시간 구성');
    expect(breakdown).toHaveTextContent('55:00');
    expect(breakdown).toHaveTextContent('05:00');
    const card = within(screen.getByRole('article', { name: '2번 휴식' }));
    expect(card.getByText('05:00')).toBeInTheDocument();
    expect(card.queryByText(/큐|검토 필요|스프링/)).not.toBeInTheDocument();
    fireEvent.change(card.getByRole('spinbutton', { name: '2번 휴식 시간 · 분' }), {
      target: { value: '7' },
    });
    expect(usePilatesStore.getState().activeSteps[1].durationMin).toBe(7);
    fireEvent.click(screen.getByText('휴식 추가', { selector: 'summary span' }));
    fireEvent.change(screen.getByLabelText('추가할 휴식 시간 · 분'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('휴식 넣을 위치'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: '이 위치에 휴식 넣기' }));
    expect(usePilatesStore.getState().activeSteps.map((step) => step.durationMin)).toEqual([
      55, 2, 7,
    ]);
    fireEvent.click(screen.getByRole('button', { name: '2번 휴식 삭제' }));
    fireEvent.click(screen.getByRole('button', { name: '2번 휴식 위로' }));
    expect(usePilatesStore.getState().activeSteps[0].stepId).toBe('rest-ui-break');
    const firstCard = within(screen.getByRole('article', { name: '1번 휴식' }));
    fireEvent.click(firstCard.getByRole('button', { name: '1번 휴식 잠금' }));
    expect(firstCard.getByRole('spinbutton', { name: '1번 휴식 시간 · 분' })).toBeDisabled();
    expect(firstCard.getByRole('button', { name: '1번 휴식 삭제' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: '수업 시작' })).not.toBeInTheDocument();
    const preview = openWorkbenchPlanPreview();
    expect(preview.getByRole('button', { name: '수업 시작' })).toBeEnabled();
    expect(preview.queryByText('1개 동작의 검토·승인이 필요합니다.')).not.toBeInTheDocument();
    expect(
      usePilatesStore.getState().activeSteps.reduce((sum, step) => sum + step.durationMin, 0),
    ).toBe(62);
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
  });
});
