import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveStageView } from './LiveStageView';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import type { SequenceStep } from '../types/pilates';

const original = usePilatesStore.getState();
const exercises = [
  syntheticPlanningExercise('mat', 'warmup'),
  syntheticPlanningExercise('mat', 'core'),
];
const steps: SequenceStep[] = exercises.map((exercise, index) => ({
  stepId: `voice-${index}`,
  order: index + 1,
  exerciseId: exercise.id,
  blockCategory: exercise.blockCategory,
  durationMin: 1,
  selectedLayer: 'standard',
  sideMode: 'left-then-right',
  explanationSec: 5,
  transitionSec: 5,
}));
class FakeUtterance {
  voice: SpeechSynthesisVoice | null = null;
  lang = '';
  rate = 1;
  onerror: ((event: { error: string }) => void) | null = null;
  constructor(public text: string) {}
}
const local = {
  voiceURI: 'local-ko',
  name: 'Korean device',
  lang: 'ko-KR',
  localService: true,
  default: true,
} as SpeechSynthesisVoice;
const remote = { ...local, localService: false, voiceURI: 'remote-ko' };
const synth = Object.assign(new EventTarget(), {
  speak: vi.fn(),
  cancel: vi.fn(),
  getVoices: vi.fn(() => [remote, local]),
});
const begin = () => {
  fireEvent.click(screen.getByRole('button', { name: '음성 안내 켜기' }));
  fireEvent.click(screen.getByRole('button', { name: '수업 시작' }));
};
const latest = () => synth.speak.mock.calls.at(-1)?.[0] as FakeUtterance;
const tick = (seconds: number) => act(() => vi.advanceTimersByTime(seconds * 1000));

beforeEach(() => {
  vi.useFakeTimers();
  synth.speak.mockReset();
  synth.cancel.mockReset();
  synth.getVoices.mockReturnValue([remote, local]);
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  usePilatesStore.setState({
    ...original,
    activeSequenceId: 'voice-class',
    activeTitle: '합성 음성 테스트',
    activeSteps: steps,
    exercises,
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  usePilatesStore.setState(original);
});

describe('live-stage device voice guidance', () => {
  it('is silent on entry and class start alone, then speaks the chosen local voice after opt-in', () => {
    render(<LiveStageView onOpenLogModal={vi.fn()} />);
    expect(synth.speak).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '수업 시작' }));
    expect(synth.speak).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '음성 안내 켜기' }));
    expect(synth.speak).toHaveBeenCalledOnce();
    expect(latest().voice).toBe(local);
    expect(latest().text).toContain(exercises[0].nameKo);
    expect(latest().text).toContain(exercises[0].breathPattern);
    tick(1);
    expect(synth.speak).toHaveBeenCalledOnce();
  });
  it('handles StrictMode without duplicate speech and reads phases and time only once', () => {
    render(
      <React.StrictMode>
        <LiveStageView onOpenLogModal={vi.fn()} />
      </React.StrictMode>,
    );
    begin();
    expect(synth.speak).toHaveBeenCalledOnce();
    tick(5);
    expect(latest().text).toBe('수행 · 왼쪽.');
    tick(25);
    expect(latest().text).toBe('수행 · 오른쪽.');
    tick(20);
    expect(latest().text).toContain('10초 남았습니다.');
    const count = synth.speak.mock.calls.length;
    tick(1);
    expect(synth.speak).toHaveBeenCalledTimes(count);
  });
  it('supports independent toggles, pauses, resumes, and explicit immediate stop', () => {
    render(<LiveStageView onOpenLogModal={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('검토한 호흡 메모'));
    begin();
    expect(latest().text).not.toContain(exercises[0].breathPattern);
    fireEvent.click(screen.getByRole('button', { name: '일시정지' }));
    expect(synth.cancel).toHaveBeenCalled();
    const count = synth.speak.mock.calls.length;
    tick(2);
    fireEvent.click(screen.getByRole('button', { name: '수업 시작' }));
    expect(synth.speak).toHaveBeenCalledTimes(count);
    fireEvent.click(screen.getByRole('button', { name: '음성 즉시 중지' }));
    tick(40);
    expect(synth.speak).toHaveBeenCalledTimes(count);
    expect(screen.getByRole('button', { name: '음성 안내 켜기' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
  it('announces the next step automatically only when timer auto-transition is enabled', () => {
    render(<LiveStageView onOpenLogModal={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('시간 종료 시 다음 동작'));
    begin();
    tick(60);
    expect(latest().text).toContain(exercises[1].nameKo);
    expect(screen.getByRole('timer')).toHaveTextContent('01:00');
    const count = synth.speak.mock.calls.length;
    tick(1);
    expect(synth.speak).toHaveBeenCalledTimes(count);
  });
  it('never speaks rest exercise notes and cancels on exit and unmount', () => {
    usePilatesStore.setState({
      activeSteps: [
        steps[0],
        {
          stepId: 'rest',
          order: 2,
          kind: 'rest',
          exerciseId: '',
          durationMin: 0.5,
          blockCategory: 'core',
          selectedLayer: 'standard',
          instructorNote: '호흡 메모는 휴식에서 읽지 않기',
        },
        steps[1],
      ],
    });
    const result = render(<LiveStageView onOpenLogModal={vi.fn()} />);
    begin();
    fireEvent.click(screen.getByRole('button', { name: '다음 동작' }));
    expect(latest().text).toContain('휴식.');
    expect(latest().text).not.toContain('호흡 메모');
    fireEvent.click(screen.getByRole('button', { name: '계획으로' }));
    expect(synth.cancel).toHaveBeenCalled();
    const count = synth.speak.mock.calls.length;
    tick(5);
    expect(synth.speak).toHaveBeenCalledTimes(count);
    result.unmount();
    render(<LiveStageView onOpenLogModal={vi.fn()} />);
    expect(screen.getByRole('button', { name: '음성 안내 켜기' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
  it('cancels when hidden, skips stale alerts, and never speaks on a generic page', () => {
    const result = render(<LiveStageView onOpenLogModal={vi.fn()} />);
    begin();
    act(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    const count = synth.speak.mock.calls.length;
    tick(51);
    expect(synth.speak).toHaveBeenCalledTimes(count);
    result.unmount();
    render(<div>일반 페이지</div>);
    tick(60);
    expect(synth.speak).toHaveBeenCalledTimes(count);
  });
  it('does not allow a remote-only voice and handles asynchronously loaded local voices', () => {
    synth.getVoices.mockReturnValue([remote]);
    render(<LiveStageView onOpenLogModal={vi.fn()} />);
    expect(screen.getByRole('button', { name: '음성 안내 켜기' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '수업 시작' }));
    expect(synth.speak).not.toHaveBeenCalled();
    act(() => {
      synth.getVoices.mockReturnValue([local]);
      synth.dispatchEvent(new Event('voiceschanged'));
    });
    expect(screen.getByRole('button', { name: '음성 안내 켜기' })).toBeEnabled();
    expect(synth.speak).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '음성 안내 켜기' }));
    expect(latest().voice).toBe(local);
  });
  it('fails quietly for missing speech support and for playback errors', () => {
    synth.speak.mockImplementationOnce(() => {
      throw new Error('device blocked');
    });
    const result = render(<LiveStageView onOpenLogModal={vi.fn()} />);
    begin();
    expect(screen.getByText(/음성을 재생하지 못했어요/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '음성 안내 켜기' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    result.unmount();
    Reflect.deleteProperty(window, 'speechSynthesis');
    render(<LiveStageView onOpenLogModal={vi.fn()} />);
    expect(screen.getByRole('button', { name: '음성 안내 켜기' })).toBeDisabled();
  });
  it('starts a completed step again with its initial phase, not the stale final transition', () => {
    render(<LiveStageView onOpenLogModal={vi.fn()} />);
    begin();
    tick(60);
    expect(latest().text).toContain('계획 시간이 끝났습니다.');
    fireEvent.click(screen.getByRole('button', { name: '현재 동작 다시 시작' }));
    expect(latest().text).toContain('설명 · 세팅.');
    expect(latest().text).not.toContain('다음 동작 전환');
    expect(latest().text).toContain('남은 시간 1분.');
  });
  it('does not clear a newer utterance when the canceled older one reports an error', () => {
    render(<LiveStageView onOpenLogModal={vi.fn()} />);
    begin();
    const first = latest();
    fireEvent.click(screen.getByRole('button', { name: '다음 동작' }));
    act(() => first.onerror?.({ error: 'not-allowed' }));
    expect(screen.getByRole('button', { name: '음성 안내 끄기' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
  it('keeps the stage usable but cancels stale breath without reading changed content', () => {
    render(<LiveStageView onOpenLogModal={vi.fn()} />);
    begin();
    expect(latest().text).toContain(exercises[0].breathPattern);
    synth.cancel.mockClear();
    const count = synth.speak.mock.calls.length;
    act(() =>
      usePilatesStore.setState({
        exercises: [{ ...exercises[0], breathPattern: 'changed private breath' }, exercises[1]],
      }),
    );
    expect(screen.getByRole('timer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '일시정지' })).toBeEnabled();
    expect(synth.cancel).toHaveBeenCalled();
    expect(synth.speak).toHaveBeenCalledTimes(count);
    tick(60);
    expect(
      synth.speak.mock.calls.every(
        ([utterance]) => !utterance.text.includes('changed private breath'),
      ),
    ).toBe(true);
    expect(usePilatesStore.getState().exercises[0].review).toEqual(exercises[0].review);
  });
  it('reads pending exercise title and time only after opt-in, never its unreviewed breath', () => {
    const pending = exercises.map((exercise) => ({ ...exercise, review: undefined }));
    usePilatesStore.setState({ exercises: pending });
    render(<LiveStageView onOpenLogModal={vi.fn()} />);
    expect(synth.speak).not.toHaveBeenCalled();
    begin();
    expect(latest().text).toContain(pending[0].nameKo);
    expect(latest().text).toContain('남은 시간 1분');
    expect(latest().text).not.toContain(pending[0].breathPattern);
    expect(latest().voice).toBe(local);
    expect(usePilatesStore.getState().exercises).toEqual(pending);
  });
});
