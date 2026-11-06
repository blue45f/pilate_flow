import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VERIFIED_REFERENCES } from '../data/verifiedReferences';
import { usePilatesStore } from '../store/usePilatesStore';
import { SourceNoteDialog } from './SourceNoteDialog';

const originalExercises = usePilatesStore.getState().exercises;
const originalAddCustomExercise = usePilatesStore.getState().addCustomExercise;
const nameLabel = '내가 계획할 동작 이름 *';
const durationLabel = '직접 정한 계획 시간 · 분 *';
const cueLabel = '직접 작성한 티칭 큐 · 줄마다 하나 *';
const saveLabel = '검토 전 노트 저장하고 검토하기';
const syntheticName = '입력 복구 확인용 합성 노트';
const syntheticCue = '복구 확인용 합성 메모 · 실제 운동 지시 아님';
const reference = VERIFIED_REFERENCES.find((item) => item.id === 'mv-01')!;

const change = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

function fillValidNote() {
  change(nameLabel, syntheticName);
  change(durationLabel, '3');
  change('직접 확인한 좌우 진행 방식 *', 'together');
  fireEvent.click(screen.getByRole('button', { name: '매트' }));
  fireEvent.click(screen.getByRole('button', { name: '소도구 없음' }));
  change('직접 확인한 난이도 *', '1.0');
  change('내 계획의 구간 분류 *', 'core');
  change('직접 확인한 시작 자세 *', 'seated');
  change(cueLabel, syntheticCue);
}

beforeEach(() => {
  usePilatesStore.setState({
    exercises: [...originalExercises],
    addCustomExercise: originalAddCustomExercise,
  });
  vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function (
    this: HTMLDialogElement,
  ) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  usePilatesStore.setState({
    exercises: originalExercises,
    addCustomExercise: originalAddCustomExercise,
  });
});

describe('new planning note input recovery', () => {
  it('keeps typed name, cue, and invalid duration through Cancel and X until an explicit same-dialog decision', async () => {
    const onClose = vi.fn();
    const onSaved = vi.fn();
    render(<SourceNoteDialog onClose={onClose} onSaved={onSaved} />);
    const dialog = screen.getByRole('dialog', { name: '내 동작 직접 등록' });
    const cue = screen.getByLabelText(cueLabel);
    change(nameLabel, syntheticName);
    change(cueLabel, syntheticCue);
    change(durationLabel, '24');
    cue.focus();

    for (const dismissal of ['취소', '닫기']) {
      fireEvent.click(screen.getByRole('button', { name: dismissal }));
      expect(dialog).toHaveAttribute('open');
      expect(onClose).not.toHaveBeenCalled();
      const decision = screen.getByRole('group', { name: '입력 내용을 어떻게 할까요?' });
      expect(screen.getAllByRole('dialog')).toHaveLength(1);
      await waitFor(() => expect(decision).toHaveFocus());
      expect(decision).toHaveAccessibleDescription(/저장하지 않은/);
      expect(screen.getByLabelText(nameLabel)).toHaveValue(syntheticName);
      expect(screen.getByLabelText(durationLabel)).toHaveValue(24);
      expect(cue).toHaveValue(syntheticCue);
      fireEvent.click(within(decision).getByRole('button', { name: '계속 편집' }));
      await waitFor(() => expect(cue).toHaveFocus());
      expect(screen.queryByRole('group', { name: '입력 내용을 어떻게 할까요?' })).toBeNull();
    }

    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    fireEvent.click(screen.getByRole('button', { name: '입력 내용 버리고 닫기' }));
    expect(dialog).not.toHaveAttribute('open');
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent(dialog, new Event('close'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSaved).not.toHaveBeenCalled();
    expect(usePilatesStore.getState().exercises).toEqual(originalExercises);
  });

  it.each(['own', 'source'] as const)(
    'closes the pristine %s draft directly after edits are reverted to its displayed baseline',
    (mode) => {
      const onClose = vi.fn();
      const onSaved = vi.fn();
      render(
        <SourceNoteDialog
          reference={mode === 'source' ? reference : undefined}
          onClose={onClose}
          onSaved={onSaved}
        />,
      );
      const initialName = mode === 'source' ? reference.title : '';
      change(nameLabel, syntheticName);
      change(nameLabel, initialName);
      change(cueLabel, syntheticCue);
      change(cueLabel, '');
      change(durationLabel, '24');
      change(durationLabel, '');
      fireEvent.click(screen.getByRole('button', { name: '매트' }));
      fireEvent.click(screen.getByRole('button', { name: '매트' }));
      fireEvent.click(screen.getByRole('button', { name: '소도구 없음' }));
      fireEvent.click(screen.getByRole('button', { name: '소도구 없음' }));
      const dialog = screen.getByRole('dialog');
      fireEvent.click(screen.getByRole('button', { name: '취소' }));
      expect(dialog).not.toHaveAttribute('open');
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('group', { name: '입력 내용을 어떻게 할까요?' })).toBeNull();
      expect(onSaved).not.toHaveBeenCalled();
      expect(usePilatesStore.getState().exercises).toEqual(originalExercises);
    },
  );

  it.each(['native-cancel', 'backdrop'] as const)(
    'keeps the same dirty dialog and draft through %s until discard is chosen',
    async (reason) => {
      const onClose = vi.fn();
      const onSaved = vi.fn();
      render(<SourceNoteDialog onClose={onClose} onSaved={onSaved} />);
      change(nameLabel, syntheticName);
      change(cueLabel, syntheticCue);
      const cue = screen.getByLabelText(cueLabel);
      cue.focus();
      const dialog = screen.getByRole('dialog');
      const showCount = vi.mocked(HTMLDialogElement.prototype.showModal).mock.calls.length;
      if (reason === 'native-cancel') {
        const cancel = new Event('cancel', { cancelable: true });
        fireEvent(dialog, cancel);
        expect(cancel.defaultPrevented).toBe(true);
      } else fireEvent.click(dialog, { clientX: 100, clientY: 100 });

      const decision = screen.getByRole('group', { name: '입력 내용을 어떻게 할까요?' });
      await waitFor(() => expect(decision).toHaveFocus());
      expect(screen.getAllByRole('dialog')).toHaveLength(1);
      expect(dialog).toHaveAttribute('open');
      expect(vi.mocked(HTMLDialogElement.prototype.showModal).mock.calls.length).toBe(showCount);
      expect(screen.getByLabelText(nameLabel)).toHaveValue(syntheticName);
      expect(cue).toHaveValue(syntheticCue);
      expect(onClose).not.toHaveBeenCalled();
      fireEvent.click(within(decision).getByRole('button', { name: '입력 내용 버리고 닫기' }));
      expect(dialog).not.toHaveAttribute('open');
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onSaved).not.toHaveBeenCalled();
      expect(usePilatesStore.getState().exercises).toEqual(originalExercises);
    },
  );

  it('focuses the first invalid field and connects its local error while preserving the remaining draft', async () => {
    const onSaved = vi.fn();
    render(<SourceNoteDialog onClose={vi.fn()} onSaved={onSaved} />);
    fillValidNote();
    change(nameLabel, 'x');
    change(durationLabel, '24');
    fireEvent.click(screen.getByRole('button', { name: saveLabel }));
    const name = screen.getByLabelText(nameLabel);
    await waitFor(() => expect(name).toHaveFocus());
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAccessibleDescription(/2자 이상/);
    expect(document.getElementById(name.getAttribute('aria-describedby')!)).toHaveTextContent(
      /2자 이상/,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/2자 이상/);
    expect(screen.getByLabelText(cueLabel)).toHaveValue(syntheticCue);

    change(nameLabel, syntheticName);
    fireEvent.click(screen.getByRole('button', { name: saveLabel }));
    const duration = screen.getByLabelText(durationLabel);
    await waitFor(() => expect(duration).toHaveFocus());
    expect(duration).toHaveAttribute('aria-invalid', 'true');
    expect(duration).toHaveAccessibleDescription(/0.5–20분/);
    expect(name).not.toHaveAttribute('aria-invalid', 'true');
    expect(duration).toHaveValue(24);
    expect(screen.getByLabelText(cueLabel)).toHaveValue(syntheticCue);
    expect(onSaved).not.toHaveBeenCalled();
    expect(usePilatesStore.getState().exercises).toEqual(originalExercises);
  });

  it('clears only the edited field error and its matching alert before validating the next field on Save', async () => {
    const onSaved = vi.fn();
    render(<SourceNoteDialog onClose={vi.fn()} onSaved={onSaved} />);
    fillValidNote();
    change(nameLabel, 'x');
    change(durationLabel, '24');
    fireEvent.click(screen.getByRole('button', { name: saveLabel }));
    const name = screen.getByLabelText(nameLabel);
    const duration = screen.getByLabelText(durationLabel);
    await waitFor(() => expect(name).toHaveFocus());
    const nameErrorId = name.getAttribute('aria-describedby')!;
    const durationErrorId = duration.getAttribute('aria-describedby')!;
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(duration).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent(/2자 이상/);

    change(nameLabel, syntheticName);
    expect(name).not.toHaveAttribute('aria-invalid');
    expect(name).not.toHaveAttribute('aria-describedby');
    expect(document.getElementById(nameErrorId)).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(duration).toHaveAttribute('aria-invalid', 'true');
    expect(duration).toHaveAttribute('aria-describedby', durationErrorId);
    expect(document.getElementById(durationErrorId)).toHaveTextContent(/0.5–20분/);
    expect(duration).toHaveValue(24);
    expect(screen.getByLabelText(cueLabel)).toHaveValue(syntheticCue);

    fireEvent.click(screen.getByRole('button', { name: saveLabel }));
    await waitFor(() => expect(duration).toHaveFocus());
    expect(screen.getByRole('alert')).toHaveTextContent(/0.5–20분/);
    expect(onSaved).not.toHaveBeenCalled();
    expect(usePilatesStore.getState().exercises).toEqual(originalExercises);
  });

  it('retains every entered value and does not hand off a note when the store action throws', () => {
    const addCustomExercise = vi.fn(() => {
      throw new Error('synthetic local store write rejection');
    });
    usePilatesStore.setState({ addCustomExercise });
    const onClose = vi.fn();
    const onSaved = vi.fn();
    render(<SourceNoteDialog onClose={onClose} onSaved={onSaved} />);
    fillValidNote();
    change('직접 작성한 주의·제외·개인별 적용 메모 · 선택', '합성 적용 메모');
    fireEvent.click(screen.getByRole('button', { name: saveLabel }));

    expect(addCustomExercise).toHaveBeenCalledTimes(1);
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toHaveAttribute('open');
    expect(screen.getByRole('alert')).toBeVisible();
    expect(screen.getByLabelText(nameLabel)).toHaveValue(syntheticName);
    expect(screen.getByLabelText(durationLabel)).toHaveValue(3);
    expect(screen.getByLabelText(cueLabel)).toHaveValue(syntheticCue);
    expect(screen.getByLabelText('직접 확인한 좌우 진행 방식 *')).toHaveValue('together');
    expect(screen.getByLabelText('직접 확인한 난이도 *')).toHaveValue('1.0');
    expect(screen.getByLabelText('내 계획의 구간 분류 *')).toHaveValue('core');
    expect(screen.getByLabelText('직접 확인한 시작 자세 *')).toHaveValue('seated');
    expect(screen.getByLabelText(/직접 작성한 주의·제외·개인별 적용 메모/)).toHaveValue(
      '합성 적용 메모',
    );
    expect(screen.getByRole('button', { name: '매트', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '소도구 없음', pressed: true })).toBeInTheDocument();
    expect(usePilatesStore.getState().exercises).toEqual(originalExercises);
  });
});
