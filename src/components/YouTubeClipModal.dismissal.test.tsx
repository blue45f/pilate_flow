import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import { getExerciseReviewState, isExerciseAutoEligible } from '../utils/exerciseReview';
import { YouTubePreviewModal } from './YouTubeClipModal';

vi.mock('./MotionReferencePlayer', () => ({ MotionReferencePlayer: () => null }));
const initial = usePilatesStore.getState();
const canonical = structuredClone(INITIAL_EXERCISES);
const synthetic = syntheticPlanningExercise('mat', 'core');
const cueLabel = '티칭 큐 · 줄마다 하나 · 직접 작성';
const alias = '합성 닫기 흐름 별칭 · 전문 자격 아님';
const changedCue = '저장하지 않은 합성 수정 큐 · 실제 운동 지시 아님';
const review = () => within(screen.getByRole('region', { name: '내 강사 검토' }));
const decision = () => screen.getByRole('group', { name: '수정 내용을 어떻게 할까요?' });
const current = () => usePilatesStore.getState().exercises.find((e) => e.id === synthetic.id)!;
const openEditor = () => {
  const element = review().getByText('검토 전 메모 수정 · 근거 미확인 입력값').closest('details')!;
  element.open = true;
  fireEvent(element, new Event('toggle'));
};
const editCue = (value = changedCue) => {
  const input = review().getByLabelText(cueLabel);
  input.focus();
  fireEvent.change(input, { target: { value } });
  return input;
};
beforeEach(() => {
  usePilatesStore.setState(
    {
      ...initial,
      exercises: [...INITIAL_EXERCISES, structuredClone(synthetic)],
      activeSteps: [],
      savedSequences: [],
      historyLogs: [],
    },
    true,
  );
  vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function (
    this: HTMLDialogElement,
  ) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  });
});
afterEach(() => {
  cleanup();
  expect(INITIAL_EXERCISES).toEqual(canonical);
  expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
  expect(
    usePilatesStore.getState().exercises.filter((e) => canonical.some((c) => c.id === e.id)),
  ).toEqual(canonical);
  usePilatesStore.setState(initial, true);
  vi.restoreAllMocks();
});

describe('materially unsaved movement detail dismissal', () => {
  it('returns to a visible save control when the last edited field belongs to a collapsed metadata editor', async () => {
    render(<YouTubePreviewModal exercise={current()} onClose={vi.fn()} />);
    openEditor();
    const input = editCue();
    const editor = input.closest('details')!;
    editor.open = false;
    fireEvent(editor, new Event('toggle'));
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    fireEvent.click(within(decision()).getByRole('button', { name: '계속 편집' }));
    await waitFor(() =>
      expect(review().getByRole('button', { name: '수정 메모만 저장' })).toHaveFocus(),
    );
    expect(input).toHaveValue(changedCue);
    expect(current()).toEqual(synthetic);
  });

  it('keeps the same open dialog and input on X, then returns focus to editing', async () => {
    const close = vi.fn();
    render(<YouTubePreviewModal exercise={current()} onClose={close} onAddToSequence={vi.fn()} />);
    openEditor();
    fireEvent.change(review().getByLabelText('검토한 강사 별칭'), { target: { value: alias } });
    const input = editCue();
    const dialog = screen.getByRole('dialog');
    const showCount = vi.mocked(HTMLDialogElement.prototype.showModal).mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(dialog).toHaveAttribute('open');
    await waitFor(() => expect(decision()).toHaveFocus());
    expect(input).toHaveValue(changedCue);
    expect(review().getByLabelText('검토한 강사 별칭')).toHaveValue(alias);
    expect(current()).toEqual(synthetic);
    expect(HTMLDialogElement.prototype.close).not.toHaveBeenCalled();
    expect(vi.mocked(HTMLDialogElement.prototype.showModal).mock.calls.length).toBe(showCount);
    fireEvent.click(within(decision()).getByRole('button', { name: '계속 편집' }));
    await waitFor(() => expect(input).toHaveFocus());
    expect(
      screen.queryByRole('group', { name: '수정 내용을 어떻게 할까요?' }),
    ).not.toBeInTheDocument();
    expect(close).not.toHaveBeenCalled();
  });

  it('blocks cancel, moves to the existing save control and never saves or approves automatically', async () => {
    const close = vi.fn();
    render(<YouTubePreviewModal exercise={current()} onClose={close} />);
    openEditor();
    fireEvent.change(review().getByLabelText('검토한 강사 별칭'), { target: { value: alias } });
    editCue();
    const dialog = screen.getByRole('dialog');
    const event = new Event('cancel', { cancelable: true });
    fireEvent(dialog, event);
    expect(event.defaultPrevented).toBe(true);
    expect(dialog).toHaveAttribute('open');
    fireEvent.click(within(decision()).getByRole('button', { name: '저장·검토로 이동' }));
    const save = review().getByRole('button', { name: '수정 메모만 저장' });
    await waitFor(() => expect(save).toHaveFocus());
    expect(current()).toEqual(synthetic);
    expect(close).not.toHaveBeenCalled();
    fireEvent.click(save);
    expect(current().cues).toEqual([changedCue]);
    expect(getExerciseReviewState(current())).toBe('stale');
    expect(current().review).toEqual(synthetic.review);
    expect(review().getByRole('checkbox', { name: /이 동작의 위 모든 조건/ })).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(dialog).not.toHaveAttribute('open');
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('blocks fallback outside click, and discards only after the explicit discard-and-close action', () => {
    const close = vi.fn();
    render(<YouTubePreviewModal exercise={current()} onClose={close} />);
    openEditor();
    editCue();
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog, { clientX: 100, clientY: 100 });
    expect(dialog).toHaveAttribute('open');
    expect(close).not.toHaveBeenCalled();
    expect(current()).toEqual(synthetic);
    fireEvent.click(within(decision()).getByRole('button', { name: '수정 내용 버리고 닫기' }));
    expect(dialog).not.toHaveAttribute('open');
    expect(close).toHaveBeenCalledTimes(1);
    expect(current()).toEqual(synthetic);
    expect(usePilatesStore.getState().activeSteps).toEqual([]);
  });

  it.each(['clean', 'alias-only', 'exact-revert'] as const)(
    'closes %s without another decision',
    (mode) => {
      const close = vi.fn();
      render(<YouTubePreviewModal exercise={current()} onClose={close} />);
      if (mode === 'alias-only')
        fireEvent.change(review().getByLabelText('검토한 강사 별칭'), { target: { value: alias } });
      if (mode === 'exact-revert') {
        openEditor();
        editCue();
        editCue(synthetic.cues.join('\n'));
      }
      const dialog = screen.getByRole('dialog');
      fireEvent.click(screen.getByRole('button', { name: '닫기' }));
      expect(dialog).not.toHaveAttribute('open');
      expect(close).toHaveBeenCalledTimes(1);
      expect(
        screen.queryByRole('group', { name: '수정 내용을 어떻게 할까요?' }),
      ).not.toBeInTheDocument();
      expect(current()).toEqual(synthetic);
    },
  );
});
