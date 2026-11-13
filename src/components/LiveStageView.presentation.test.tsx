import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import type { SequenceStep } from '../types/pilates';
import { exerciseRevision } from '../utils/exerciseReview';
import { LiveStageView } from './LiveStageView';

const original = usePilatesStore.getState();
const exercises = [
  {
    ...syntheticPlanningExercise('reformer', 'warmup'),
    nameKo: '집중 준비 동작',
    springs: '1R 1B',
  },
  { ...syntheticPlanningExercise('reformer', 'core'), nameKo: '집중 본운동', springs: '2R' },
].map((exercise) => ({
  ...exercise,
  review: { ...exercise.review!, revision: exerciseRevision(exercise) },
}));
const steps: SequenceStep[] = exercises.map((exercise, index) => ({
  stepId: `presentation-step-${index}`,
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
const localVoice = {
  voiceURI: 'presentation-local-ko',
  name: 'Korean local fixture',
  lang: 'ko-KR',
  localService: true,
  default: true,
} as SpeechSynthesisVoice;
const synth = Object.assign(new EventTarget(), {
  speak: vi.fn(),
  cancel: vi.fn(),
  getVoices: vi.fn(() => [localVoice]),
});
const advance = (seconds: number) =>
  act(() => {
    vi.setSystemTime(Date.now() + seconds * 1000);
    document.dispatchEvent(new Event('visibilitychange'));
  });
const mode = (name: '집중 진행' | '자료 함께 보기') =>
  within(screen.getByRole('group', { name: '진행 화면 보기' })).getByRole('button', { name });
const disclosure = (label: string) =>
  screen.getByText(label, { selector: 'summary' }).closest('details')!;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(new Date('2026-11-13T10:00:00Z'));
  synth.speak.mockReset();
  synth.cancel.mockReset();
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  usePilatesStore.setState(
    {
      ...original,
      activeTab: 'stage',
      activeSequenceId: 'presentation-class',
      activeTitle: '집중 진행 검증',
      activeTargetMinutes: 2,
      activeSteps: structuredClone(steps),
      exercises,
      reformerBrand: 'balanced-body',
      historyLogs: [],
    },
    true,
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  usePilatesStore.setState(original, true);
});

describe('LiveStage presentation without session changes', () => {
  it('keeps teaching essentials visible and reapplies either preset after manual disclosure changes', () => {
    render(<LiveStageView onOpenLogModal={vi.fn()} />);
    const before = usePilatesStore.getState();
    const timer = screen.getByRole('timer');
    const reference = disclosure('동작 참고 자료 · 3D·호흡');
    const timing = disclosure('이 동작 시간 구성');
    const brand = disclosure('브랜드별 스프링 기준 설정');
    expect(mode('집중 진행')).toHaveAttribute('aria-pressed', 'true');
    [reference, timing, brand].forEach((details) => expect(details).not.toHaveAttribute('open'));
    expect(screen.getByTestId('live-stage-3d-companion')).not.toBeVisible();
    expect(screen.getByTestId('live-stage-brand-spring-equiv')).toBeVisible();
    expect(screen.getByTestId('live-stage-brand-spring-equiv')).toHaveTextContent('Balanced Body');
    expect(screen.getByTestId('live-stage-current-setup-summary')).toHaveTextContent('1R 1B');
    expect(screen.getByRole('region', { name: '현재 동작 핵심 티칭 큐' })).toBeVisible();
    expect(screen.getByRole('region', { name: '다음 순서 준비 요약' })).toHaveTextContent(
      '집중 본운동',
    );
    for (const name of ['이전 동작', '수업 시작', '다음 동작', '종료 / 기록', '계획으로']) {
      expect(screen.getByRole('button', { name })).toBeVisible();
    }

    fireEvent.click(
      within(reference).getByText('동작 참고 자료 · 3D·호흡', { selector: 'summary' }),
    );
    expect(reference).toHaveAttribute('open');
    fireEvent.click(mode('집중 진행'));
    expect(reference).not.toHaveAttribute('open');

    fireEvent.click(mode('자료 함께 보기'));
    [reference, timing, brand].forEach((details) => expect(details).toHaveAttribute('open'));
    expect(screen.getByTestId('live-stage-3d-companion')).toBeVisible();
    expect(screen.getByRole('button', { name: '라이브 스프링 기준 Balanced Body' })).toBeVisible();
    fireEvent.click(within(timing).getByText('이 동작 시간 구성', { selector: 'summary' }));
    expect(timing).not.toHaveAttribute('open');
    fireEvent.click(mode('자료 함께 보기'));
    expect(timing).toHaveAttribute('open');
    fireEvent.click(mode('집중 진행'));
    [reference, timing, brand].forEach((details) => expect(details).not.toHaveAttribute('open'));
    expect(screen.getByRole('timer')).toBe(timer);
    expect(timer).toHaveTextContent('01:00');
    expect(usePilatesStore.getState()).toBe(before);
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it('keeps a running timer, current side, voice opt-in, and undo intact across presentation changes', () => {
    render(<LiveStageView onOpenLogModal={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '음성 안내 켜기' }));
    fireEvent.click(screen.getByRole('button', { name: '수업 시작' }));
    advance(12);
    const timer = screen.getByRole('timer');
    const data = usePilatesStore.getState();
    const spokenBefore = synth.speak.mock.calls.length;
    const cancelledBefore = synth.cancel.mock.calls.length;
    expect(timer).toHaveTextContent('00:48');
    expect(spokenBefore).toBeGreaterThan(0);

    fireEvent.click(mode('자료 함께 보기'));
    expect(screen.getByRole('timer')).toBe(timer);
    expect(timer).toHaveTextContent('00:48');
    expect(screen.getByRole('button', { name: '일시정지' })).toBeVisible();
    expect(synth.speak).toHaveBeenCalledTimes(spokenBefore);
    expect(synth.cancel).toHaveBeenCalledTimes(cancelledBefore);
    advance(23);
    expect(timer).toHaveTextContent('00:25');
    expect(screen.getByTestId('live-stage-bilateral-switch-alert')).toHaveTextContent('오른쪽');
    const spokenAfterSideChange = synth.speak.mock.calls.length;
    fireEvent.click(mode('집중 진행'));
    expect(timer).toHaveTextContent('00:25');
    expect(screen.getByTestId('live-stage-bilateral-switch-alert')).toHaveTextContent('오른쪽');
    expect(screen.getByRole('button', { name: '음성 안내 끄기' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(synth.speak).toHaveBeenCalledTimes(spokenAfterSideChange);

    fireEvent.click(screen.getByRole('button', { name: '다음 동작' }));
    const undo = screen.getByTestId('live-stage-undo-btn');
    fireEvent.click(mode('자료 함께 보기'));
    fireEvent.click(mode('집중 진행'));
    expect(screen.getByTestId('live-stage-undo-btn')).toBe(undo);
    fireEvent.click(undo);
    expect(timer).toHaveTextContent('00:25');
    expect(screen.getByRole('heading', { level: 2, name: '집중 준비 동작' })).toBeVisible();
    expect(screen.getByRole('button', { name: '일시정지' })).toBeVisible();
    expect(usePilatesStore.getState()).toBe(data);
  });

  it('preserves a paused clock and carries the view through a rest without counting paused time', () => {
    const rest: SequenceStep = {
      kind: 'rest',
      stepId: 'presentation-rest',
      order: 2,
      exerciseId: '',
      blockCategory: 'core',
      durationMin: 0.5,
      selectedLayer: 'standard',
    };
    usePilatesStore.setState({
      activeSteps: [steps[0], rest, { ...steps[1], order: 3 }],
      activeTargetMinutes: 2.5,
    });
    const onOpenLogModal = vi.fn();
    render(<LiveStageView onOpenLogModal={onOpenLogModal} />);
    fireEvent.click(screen.getByRole('button', { name: '수업 시작' }));
    advance(11);
    fireEvent.click(screen.getByRole('button', { name: '일시정지' }));
    const timer = screen.getByRole('timer');
    const remainingClass = screen.getByTestId('live-stage-remaining-class-time').textContent;
    fireEvent.click(mode('자료 함께 보기'));
    advance(120);
    fireEvent.click(mode('집중 진행'));
    expect(screen.getByRole('timer')).toBe(timer);
    expect(timer).toHaveTextContent('00:49');
    expect(screen.getByTestId('live-stage-remaining-class-time')).toHaveTextContent(
      remainingClass!,
    );
    expect(screen.getByRole('button', { name: '이어서 진행' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: '다음 동작' }));
    fireEvent.click(mode('자료 함께 보기'));
    expect(screen.getByRole('timer', { name: '현재 휴식 남은 시간' })).toHaveTextContent('00:30');
    expect(screen.getByRole('button', { name: '휴식 건너뛰기' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '휴식 건너뛰기' }));
    expect(screen.getByTestId('live-stage-3d-companion')).toBeVisible();
    fireEvent.click(mode('집중 진행'));
    fireEvent.click(screen.getByRole('button', { name: '이어서 진행' }));
    advance(5);
    expect(screen.getByRole('timer')).toHaveTextContent('00:55');
    fireEvent.click(screen.getByRole('button', { name: '종료 / 기록' }));
    fireEvent.click(screen.getByRole('button', { name: '검토하고 기록하기' }));
    expect(onOpenLogModal).toHaveBeenCalledWith(
      'presentation-class',
      expect.objectContaining({
        actualDurationSec: 16,
        taughtStepIds: [steps[0].stepId, steps[1].stepId],
      }),
    );
  });
});
