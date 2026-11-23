import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import type { SequenceStep } from '../types/pilates';
import {
  generateMovementQuiz,
  MOVEMENT_MASTERY_STORAGE_KEY,
} from '../utils/movementMasteryEngine';
import { MovementMasteryStudioPanel } from './MovementMasteryStudioPanel';

const reformerEx = INITIAL_EXERCISES.find((ex) => ex.id === 'ex-footwork-01')!;
const cadillacEx = INITIAL_EXERCISES.find((ex) => ex.apparatus === 'cadillac')!;
const chairEx = INITIAL_EXERCISES.find((ex) => ex.apparatus === 'chair')!;
const barrelEx = INITIAL_EXERCISES.find((ex) => ex.apparatus === 'barrel')!;
const matEx = INITIAL_EXERCISES.find((ex) => ex.apparatus === 'mat')!;

const SAMPLE_EXERCISES = [reformerEx, cadillacEx, chairEx, barrelEx, matEx];

const SAMPLE_STEPS: SequenceStep[] = [
  {
    stepId: 'step-1',
    order: 1,
    blockCategory: reformerEx.blockCategory,
    exerciseId: reformerEx.id,
    durationMin: 6,
    selectedLayer: 'standard',
  },
  {
    stepId: 'step-rest',
    order: 2,
    kind: 'rest',
    blockCategory: 'cooldown',
    exerciseId: '',
    durationMin: 2,
    selectedLayer: 'standard',
  },
  {
    stepId: 'step-2',
    order: 3,
    blockCategory: matEx.blockCategory,
    exerciseId: matEx.id,
    durationMin: 4,
    selectedLayer: 'easy',
  },
];

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('MovementMasteryStudioPanel', () => {
  it('never calls localStorage.setItem on mount, deck switch, tab switch, or blind recall toggles — only on explicit rating click', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    render(
      <MovementMasteryStudioPanel
        exercises={SAMPLE_EXERCISES}
        sequenceSteps={SAMPLE_STEPS}
        sequenceTitle="내일 오전 리포머 입문반"
      />,
    );

    expect(screen.getByTestId('movement-mastery-studio-panel')).toBeVisible();
    expect(setItemSpy).not.toHaveBeenCalled();

    // Switching decks, toggling blind recall, and switching tabs must NOT write localStorage
    fireEvent.click(screen.getByTestId('mastery-deck-daily'));
    fireEvent.click(screen.getByTestId('blind-toggle-spring'));
    fireEvent.click(screen.getByTestId('reveal-spring-btn'));
    fireEvent.click(screen.getByTestId('mastery-tab-quiz'));
    fireEvent.click(screen.getByTestId('mastery-tab-cueing'));
    fireEvent.click(screen.getByTestId('mastery-tab-study'));
    expect(setItemSpy).not.toHaveBeenCalled();

    // Explicit mastery evaluation click persists to pf_movement_mastery_v1
    fireEvent.click(screen.getByTestId('rate-good-btn'));
    expect(setItemSpy).toHaveBeenCalledTimes(1);
    expect(setItemSpy).toHaveBeenCalledWith(
      MOVEMENT_MASTERY_STORAGE_KEY,
      expect.stringContaining('"status":"ready"'),
    );
    expect(screen.getByTestId('mastery-active-status-badge')).toHaveTextContent('수업 가능');
    expect(screen.getByTestId('mastery-feedback-banner')).toBeVisible();
  });

  it('supports Tab 1 blind active recall masks, tap-to-reveal, anatomy fallback, voice button, and all 3 rating buttons', () => {
    render(
      <MovementMasteryStudioPanel
        exercises={SAMPLE_EXERCISES}
        sequenceSteps={SAMPLE_STEPS}
        sequenceTitle="화요일 리포머 기초"
      />,
    );

    // Defaults to sequence deck (2 non-rest steps)
    expect(screen.getByTestId('mastery-deck-sequence')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('mastery-deck-position')).toHaveTextContent('1 / 2');
    expect(screen.getByTestId('mastery-active-exercise-name')).toHaveTextContent(reformerEx.nameKo);

    // NaturalVoiceSpeakButton is mounted
    expect(
      screen.getByRole('button', { name: new RegExp(`${reformerEx.nameKo}.*음성으로 듣기`) }),
    ).toBeVisible();

    // Nano Banana anatomy image degrades webp -> png -> inline SVG on error
    const anatomyImg = screen.getByAltText(/해부학 근육 지도/);
    expect(anatomyImg).toHaveAttribute('src', expect.stringContaining('/images/atelier-anatomy/anatomy-'));
    fireEvent.error(anatomyImg);
    expect(anatomyImg).toHaveAttribute('src', expect.stringContaining('.png'));
    fireEvent.error(anatomyImg);
    expect(screen.getByRole('img', { name: '활성 근육 부위 도식' })).toBeInTheDocument();

    // Blind active recall toggles hide content behind tap-to-reveal buttons
    fireEvent.click(screen.getByTestId('blind-toggle-all'));
    expect(screen.getByTestId('reveal-spring-btn')).toBeVisible();
    expect(screen.getByTestId('reveal-breath-btn')).toBeVisible();
    expect(screen.getByTestId('reveal-cues-btn')).toBeVisible();

    fireEvent.click(screen.getByTestId('reveal-spring-btn'));
    expect(screen.queryByTestId('reveal-spring-btn')).not.toBeInTheDocument();
    expect(screen.getByTestId('study-block-spring')).toHaveTextContent('스프링');

    fireEvent.click(screen.getByTestId('reveal-breath-btn'));
    expect(screen.queryByTestId('reveal-breath-btn')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('reveal-cues-btn'));
    expect(screen.queryByTestId('reveal-cues-btn')).not.toBeInTheDocument();

    // Test again -> mastered progression
    fireEvent.click(screen.getByTestId('rate-again-btn'));
    expect(screen.getByTestId('mastery-active-status-badge')).toHaveTextContent('연습 중');

    fireEvent.click(screen.getByTestId('rate-mastered-btn'));
    expect(screen.getByTestId('mastery-active-status-badge')).toHaveTextContent('완벽 마스터');
    expect(screen.getByTestId('mastery-summary-strip')).toHaveTextContent('마스터 1');
  });

  it('runs Tab 2 live studio 3-question quiz with instant explanations, score summary, and next-exercise continuation', () => {
    render(
      <MovementMasteryStudioPanel
        exercises={SAMPLE_EXERCISES}
        sequenceSteps={SAMPLE_STEPS}
      />,
    );

    fireEvent.click(screen.getByTestId('mastery-tab-quiz'));
    expect(screen.getByTestId('mastery-quiz-tabpanel')).toBeVisible();

    const expectedQuiz = generateMovementQuiz(reformerEx, SAMPLE_EXERCISES);
    expect(expectedQuiz).toHaveLength(3);

    // Answer Q0 correctly, Q1 wrongly, Q2 correctly
    fireEvent.click(screen.getByTestId(`quiz-q0-opt${expectedQuiz[0]!.correctIndex}`));
    expect(screen.getByTestId('quiz-explanation-0')).toHaveTextContent('정답이에요');

    const wrongIdx = (expectedQuiz[1]!.correctIndex + 1) % 4;
    fireEvent.click(screen.getByTestId(`quiz-q1-opt${wrongIdx}`));
    expect(screen.getByTestId('quiz-explanation-1')).toHaveTextContent('아쉬워요');

    fireEvent.click(screen.getByTestId(`quiz-q2-opt${expectedQuiz[2]!.correctIndex}`));
    expect(screen.getByTestId('quiz-explanation-2')).toHaveTextContent('정답이에요');

    expect(screen.getByTestId('quiz-score-indicator')).toHaveTextContent('풀이 3 / 3 · 정답 2개');
    expect(screen.getByTestId('quiz-complete-summary')).toHaveTextContent('3문항 중 2문항 정답');

    // Explicit save button records 'good' -> 'ready'
    fireEvent.click(screen.getByTestId('quiz-apply-mastery-btn'));
    expect(screen.getByTestId('mastery-active-status-badge')).toHaveTextContent('수업 가능');

    // Continue to next exercise in deck
    fireEvent.click(screen.getByTestId('quiz-next-exercise-btn'));
    expect(screen.getByTestId('mastery-active-exercise-name')).toHaveTextContent(matEx.nameKo);
    expect(screen.getByTestId('quiz-score-indicator')).toHaveTextContent('풀이 0 / 3 · 정답 0개');
  });

  it('runs Tab 3 4-beat breathing cadence timer, 3-level cue script filters, and interactive apparatus progress board', () => {
    vi.useFakeTimers();

    render(
      <MovementMasteryStudioPanel
        exercises={SAMPLE_EXERCISES}
        initialExerciseId={reformerEx.id}
      />,
    );

    fireEvent.click(screen.getByTestId('mastery-tab-cueing'));
    expect(screen.getByTestId('mastery-cueing-tabpanel')).toBeVisible();

    // 4-beat breathing rhythm starts at inhale beat 1, 30s remaining
    expect(screen.getByTestId('cueing-timer-display')).toHaveTextContent('마시고 1박 · 남은 30초');

    fireEvent.click(screen.getByTestId('cueing-timer-toggle'));
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByTestId('cueing-timer-display')).toHaveTextContent('내쉬고 1박 · 남은 26초');

    fireEvent.click(screen.getByTestId('cueing-timer-reset'));
    expect(screen.getByTestId('cueing-timer-display')).toHaveTextContent('마시고 1박 · 남은 30초');

    // 3-level cue scripts are visible and filterable
    const scriptsGrid = screen.getByTestId('cue-scripts-grid');
    expect(within(scriptsGrid).getByTestId('cue-script-easy')).toBeVisible();
    expect(within(scriptsGrid).getByTestId('cue-script-standard')).toBeVisible();
    expect(within(scriptsGrid).getByTestId('cue-script-challenge')).toBeVisible();

    fireEvent.click(screen.getByTestId('script-filter-challenge'));
    expect(within(scriptsGrid).queryByTestId('cue-script-easy')).not.toBeInTheDocument();
    expect(within(scriptsGrid).getByTestId('cue-script-challenge')).toBeVisible();

    // Apparatus progress board shows all 5 apparatuses and drills into selected apparatus on click
    const board = screen.getByTestId('apparatus-mastery-board');
    expect(within(board).getByTestId('apparatus-progress-reformer')).toBeVisible();
    expect(within(board).getByTestId('apparatus-progress-cadillac')).toBeVisible();
    expect(within(board).getByTestId('apparatus-progress-chair')).toBeVisible();
    expect(within(board).getByTestId('apparatus-progress-barrel')).toBeVisible();
    expect(within(board).getByTestId('apparatus-progress-mat')).toBeVisible();

    fireEvent.click(within(board).getByTestId('apparatus-progress-cadillac'));
    expect(screen.getByTestId('mastery-study-tabpanel')).toBeVisible();
    expect(screen.getByTestId('mastery-active-exercise-name')).toHaveTextContent(cadillacEx.nameKo);
  });

  it('respects initialExerciseId outside sequence and handles empty exercise list safely', () => {
    const { rerender } = render(
      <MovementMasteryStudioPanel
        exercises={SAMPLE_EXERCISES}
        sequenceSteps={SAMPLE_STEPS}
        initialExerciseId={barrelEx.id}
      />,
    );

    expect(screen.getByTestId('mastery-active-exercise-name')).toHaveTextContent(barrelEx.nameKo);

    rerender(<MovementMasteryStudioPanel exercises={[]} />);
    expect(screen.getByTestId('movement-mastery-studio-panel')).toHaveTextContent(
      '학습할 동작 카탈로그가 아직 비어 있어요',
    );
  });
});
