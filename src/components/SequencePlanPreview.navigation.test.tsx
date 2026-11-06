import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import type { SequenceStep } from '../types/pilates';
import { SequencePlanPreview } from './SequencePlanPreview';

vi.mock('./MotionReferencePlayer', () => ({ MotionReferencePlayer: () => null }));

const original = usePilatesStore.getState();
const exercise = syntheticPlanningExercise('mat', 'warmup', 'alpha', false);
const steps: SequenceStep[] = [
  {
    stepId: 'navigation-pending',
    order: 1,
    exerciseId: exercise.id,
    blockCategory: 'warmup',
    durationMin: 4,
    explanationSec: 20,
    transitionSec: 10,
    selectedLayer: 'standard',
    sideMode: 'left-then-right',
  },
  {
    stepId: 'navigation-rest',
    order: 2,
    kind: 'rest',
    exerciseId: '',
    blockCategory: 'cooldown',
    durationMin: 1,
    selectedLayer: 'standard',
  },
];
const frames: FrameRequestCallback[] = [];
function navigationFrame() {
  act(() => {
    frames.splice(0).forEach((callback) => callback(0));
  });
}
beforeEach(() => {
  frames.length = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  });
  usePilatesStore.setState({
    ...original,
    activeTitle: '합성 순서 이동 검사',
    activeTargetMinutes: 5,
    exercises: [exercise],
    activeSteps: structuredClone(steps),
  });
});
afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('explicit preview item navigation', () => {
  it('provides early navigation and hands off focus from the whole order to the chosen frozen item, without writes', () => {
    const before = usePilatesStore.getState();
    render(<SequencePlanPreview onClose={vi.fn()} />);
    const navigation = screen.getByRole('navigation', { name: '미리보기 항목 이동' });
    const clock = screen.getByRole('region', { name: '수업 시간표 리허설' });
    expect(
      navigation.compareDocumentPosition(clock) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(within(navigation).getByRole('button', { name: '이전 항목' })).toBeDisabled();
    fireEvent.click(within(navigation).getByRole('button', { name: '전체 순서에서 고르기' }));
    navigationFrame();
    expect(screen.getByRole('heading', { name: '전체 순서' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: '2번 휴식 계획 보기' }));
    navigationFrame();
    expect(screen.getByRole('heading', { name: '중간 휴식' })).toHaveFocus();
    expect(screen.getByRole('slider', { name: '수업 시간표 위치' })).toHaveValue('240');
    expect(screen.getByRole('button', { name: '다음 항목' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '2번 휴식 계획 보기' })).toHaveAttribute(
      'aria-current',
      'step',
    );
    fireEvent.click(screen.getByRole('button', { name: '이전 항목' }));
    navigationFrame();
    expect(screen.getByRole('heading', { name: exercise.nameKo, level: 3 })).toHaveFocus();
    expect(screen.getByRole('slider', { name: '수업 시간표 위치' })).toHaveValue('0');
    expect(usePilatesStore.getState()).toBe(before);
    expect(screen.queryByText(exercise.cues[0])).not.toBeInTheDocument();
  });

  it('never steals focus back into a dialog that closed before its navigation frame', () => {
    const opener = document.createElement('button');
    opener.textContent = '합성 열기';
    document.body.append(opener);
    opener.focus();
    const close = vi.fn();
    const { unmount } = render(<SequencePlanPreview onClose={close} />);
    fireEvent.click(screen.getByRole('button', { name: '전체 순서에서 고르기' }));
    fireEvent.click(screen.getByRole('button', { name: '계획 미리보기 닫기' }));
    expect(opener).toHaveFocus();
    navigationFrame();
    expect(opener).toHaveFocus();
    expect(close).toHaveBeenCalledTimes(1);
    unmount();
    opener.remove();
  });

  it('continues to navigate the opened snapshot after source changes, and hides navigation for empty plans', () => {
    const { unmount } = render(<SequencePlanPreview onClose={vi.fn()} />);
    act(() => usePilatesStore.setState({ activeSteps: [steps[1]], activeTargetMinutes: 1 }));
    const changed = usePilatesStore.getState();
    fireEvent.click(screen.getByRole('button', { name: '다음 항목' }));
    navigationFrame();
    expect(screen.getByRole('heading', { name: '중간 휴식' })).toHaveFocus();
    expect(screen.getByRole('slider', { name: '수업 시간표 위치' })).toHaveValue('240');
    expect(screen.getByRole('button', { name: '시간표 리허설 시작' })).toBeDisabled();
    expect(usePilatesStore.getState()).toBe(changed);
    unmount();
    usePilatesStore.setState({ activeSteps: [] });
    render(<SequencePlanPreview onClose={vi.fn()} />);
    expect(
      screen.queryByRole('navigation', { name: '미리보기 항목 이동' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: '빈 수업 계획' })).toBeVisible();
  });
});
