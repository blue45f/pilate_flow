import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SequenceStudioWorkbench } from '../components/SequenceStudioWorkbench';
import { SequenceWorkbench } from '../components/SequenceWorkbench';
import { usePilatesStore } from '../store/usePilatesStore';
import type { PilatesExercise } from '../types/pilates';
import { getSequenceDurations } from '../utils/sequenceEngine';
import { applySequenceGapFill, planSequenceGapFill } from '../utils/sequenceGapFill';
import { syntheticPlanningExercise } from './planningFixtures';

const original = usePilatesStore.getState();
const base = syntheticPlanningExercise('mat', 'core');
function movement(
  id: string,
  seconds: number,
  changes: Partial<PilatesExercise> = {},
): PilatesExercise {
  return {
    ...base,
    id,
    nameKo: id,
    movementFamily: id,
    defaultDurationMin: seconds / 60,
    ...changes,
  };
}

function draft(remainingSec: number, candidates: PilatesExercise[]) {
  usePilatesStore.setState(
    {
      ...original,
      activeSequenceId: 'gap-test',
      activeApparatus: 'mat',
      activeLevel: '1.0',
      activeTargetMinutes: 10,
      exercises: [base, ...candidates],
      ownedEquipment: ['mat'],
      ownedProps: [],
      lastCriteria: null,
      draftCriteria: {
        apparatus: 'mat',
        level: '1.0',
        targetMinutes: 10,
        availableEquipment: ['mat'],
        preferredProps: ['none'],
        excludeDaysWindow: 0,
        defaultLayer: 'easy',
        focusPreset: 'full-body',
      },
      activeSteps: [
        {
          stepId: 'original',
          order: 1,
          exerciseId: base.id,
          blockCategory: 'core',
          durationMin: (600 - remainingSec) / 60,
          selectedLayer: 'easy',
          locked: true,
        },
      ],
      undoStack: [],
      redoStack: [],
    },
    true,
  );
  return usePilatesStore.getState();
}

afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
});

describe('부족한 시간 채우기', () => {
  const four = movement('네 분', 240);
  const five = movement('다섯 분', 300);
  const short = movement('짧은 호흡', 89);
  it.each([
    { name: '기본 작성', Workbench: SequenceStudioWorkbench },
    { name: '정밀 작성', Workbench: SequenceWorkbench },
  ])('$name 미리보기의 초 단위 조합을 그대로 추가하고 한 번에 되돌린다', ({ Workbench }) => {
    const before = draft(329, [four, five, short]);
    render(
      <Workbench
        onOpenYouTubePreview={vi.fn()}
        onOpenClipper={vi.fn()}
        onOpenLogModal={vi.fn()}
        onOpenInventory={vi.fn()}
        onStartClass={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByTestId('smart-gap-fill-toggle'));
    const preview = screen.getByTestId('smart-gap-fill-drawer');
    expect(preview).toHaveTextContent('05:29 추가 · 목표 시간과 일치');
    expect(preview).toHaveTextContent(short.nameKo);
    expect(preview).not.toHaveTextContent(five.nameKo);
    fireEvent.click(screen.getByTestId('smart-gap-fill-apply'));
    const after = usePilatesStore.getState();
    expect(
      after.activeSteps.slice(1).map((s) => [s.exerciseId, s.durationMin, s.selectedLayer]),
    ).toEqual([
      [four.id, 4, 'easy'],
      [short.id, 89 / 60, 'easy'],
    ]);
    expect(getSequenceDurations(after.activeSteps).totalSec).toBe(600);
    expect(after.undoStack).toHaveLength(1);
    cleanup();
    after.undoSequence();
    expect(usePilatesStore.getState().activeSteps).toEqual(before.activeSteps);
  });

  it('30초보다 긴 후보, 수업의 기구·소도구·난이도와 다른 후보, 이미 사용한 동작을 제외한다', () => {
    const s = draft(30, [
      four,
      five,
      movement('이미 쓰인 변형', 30, { movementFamily: base.movementFamily }),
      movement('다른 기구', 30, { apparatus: 'chair', requiredEquipment: ['chair'] }),
      movement('기구 부족', 30, { requiredEquipment: ['mat', 'jumpboard'] }),
      movement('소도구 부족', 30, { props: ['mini-ball'] }),
      movement('상위 난이도', 30, { level: '2.0' }),
    ]);
    expect(planSequenceGapFill(s)).toEqual({ candidates: [], addedSec: 0, remainingSec: 30 });
    expect(
      planSequenceGapFill({
        ...s,
        activeApparatus: 'chair',
        exercises: [...s.exercises, movement('매트만 가능', 30)],
      }).candidates,
    ).toEqual([]);
  });

  it('같은 동작군으로 묶인 후보를 중복하지 않고 가장 가까운 조합과 남은 초를 제시한다', () => {
    const alias = movement('같은 동작군', 80, { movementFamily: four.movementFamily });
    const eligible = movement('다른 동작군', 72);
    const state = draft(324, [four, alias, eligible]);
    const plan = planSequenceGapFill(state);
    expect(plan).toEqual({ candidates: [four, eligible], addedSec: 312, remainingSec: 12 });
    usePilatesStore.setState({ activeTargetMinutes: 20 });
    applySequenceGapFill(state, plan);
    expect(usePilatesStore.getState().activeSteps).toEqual(state.activeSteps);
    expect(usePilatesStore.getState().undoStack).toHaveLength(0);
  });
  it('단일 동작으로 정확히 채울 수 있으면 같은 합계의 두 동작 대신 그 동작을 제시한다', () => {
    const exact = movement('정확한 한 동작', 329);
    const state = draft(329, [four, short, exact]);
    expect(planSequenceGapFill(state).candidates).toEqual([exact]);
    expect(planSequenceGapFill({ ...state, ownedEquipment: [] }).candidates).toEqual([]);
  });
});
