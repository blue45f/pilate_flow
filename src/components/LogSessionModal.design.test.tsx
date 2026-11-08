import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LogSessionModal } from './LogSessionModal';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
const original = usePilatesStore.getState();
beforeEach(() => {
  window.sessionStorage.clear();
  const exercise = syntheticPlanningExercise('mat', 'warmup');
  usePilatesStore.setState({
    ...original,
    activeSequenceId: 'qa-modal',
    activeTitle: '합성 수업',
    exercises: [exercise],
    historyLogs: [],
    activeSteps: [
      {
        stepId: 'qa-step',
        exerciseId: exercise.id,
        order: 1,
        durationMin: 4,
        selectedLayer: 'standard',
        blockCategory: 'warmup',
      },
    ],
  });
});
afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  usePilatesStore.setState(original);
});
it('discloses provenance without hiding the plan/actual note or storage warning', () => {
  usePilatesStore.setState({ persistenceError: '합성 저장소 경고' });
  render(<LogSessionModal sequenceId="qa-modal" onClose={vi.fn()} />);
  expect(screen.getByText('완료 이력 보관 방식').closest('details')).not.toHaveAttribute('open');
  expect(
    screen.getByText('계획 시간과 실제 진행 시간은 별도로 보관됩니다.').closest('details'),
  ).toBeNull();
  expect(screen.getByText(/브라우저 저장소 경고/).closest('details')).toBeNull();
});
it('places submit validation beside persistent actions, outside scrollable content', () => {
  render(<LogSessionModal sequenceId="qa-modal" onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.submit(screen.getByRole('button', { name: '수업 기록 저장' }).closest('form')!);
  const alert = screen.getByRole('alert');
  expect(alert.closest('.class-log-footer')).not.toBeNull();
  expect(alert.closest('.class-log-content')).toBeNull();
  expect(usePilatesStore.getState().historyLogs).toHaveLength(0);
});
it('keeps optional duration blank and cancellation does not log a session', () => {
  const close = vi.fn();
  render(<LogSessionModal sequenceId="qa-modal" onClose={close} />);
  expect(screen.getByRole('spinbutton', { name: '분' })).toHaveValue(null);
  fireEvent.click(screen.getByRole('button', { name: '취소' }));
  expect(close).toHaveBeenCalledOnce();
  expect(usePilatesStore.getState().historyLogs).toHaveLength(0);
});
it('creates an inline group on Enter without submitting the outer log form and prevents duplicate group names', () => {
  const close = vi.fn();
  render(<LogSessionModal sequenceId="qa-modal" onClose={close} />);
  const initialCount = usePilatesStore.getState().classGroups.length;

  fireEvent.click(screen.getByRole('button', { name: '수업 그룹 추가' }));
  const groupInput = screen.getByLabelText('그룹 별칭 · 실명은 필요 없어요');
  fireEvent.change(groupInput, { target: { value: '저녁 시그니처 A반' } });
  fireEvent.keyDown(groupInput, { key: 'Enter', code: 'Enter' });

  expect(usePilatesStore.getState().historyLogs).toHaveLength(0);
  expect(close).not.toHaveBeenCalled();
  const afterCreateGroups = usePilatesStore.getState().classGroups;
  expect(afterCreateGroups).toHaveLength(initialCount + 1);
  const createdGroup = afterCreateGroups.at(-1)!;
  expect(createdGroup.name).toBe('저녁 시그니처 A반');
  expect(screen.getByLabelText('수업 그룹 *')).toHaveValue(createdGroup.id);

  // Switch group selection away, then try adding a duplicate normalized name
  fireEvent.change(screen.getByLabelText('수업 그룹 *'), {
    target: { value: afterCreateGroups[0].id },
  });
  fireEvent.click(screen.getByRole('button', { name: '수업 그룹 추가' }));
  const duplicateInput = screen.getByLabelText('그룹 별칭 · 실명은 필요 없어요');
  fireEvent.change(duplicateInput, { target: { value: '  저녁   시그니처 a반  ' } });
  fireEvent.keyDown(duplicateInput, { key: 'Enter', code: 'Enter' });

  expect(usePilatesStore.getState().classGroups).toHaveLength(initialCount + 1);
  expect(screen.getByLabelText('수업 그룹 *')).toHaveValue(createdGroup.id);
  expect(screen.queryByLabelText('그룹 별칭 · 실명은 필요 없어요')).toBeNull();
});
it('restores unsaved reflection edits from sessionStorage on reopen and clears the draft after saving', () => {
  const close = vi.fn();
  const { unmount } = render(<LogSessionModal sequenceId="qa-modal" onClose={close} />);

  // Initial open without edits does not write to sessionStorage
  expect(window.sessionStorage.getItem('pf_log_session_draft_v1:qa-modal')).toBeNull();
  expect(screen.queryByTestId('log-session-draft-restored')).toBeNull();

  const memoField = screen.getByLabelText('다음 수업을 위한 메모 (선택)');
  fireEvent.change(memoField, {
    target: { value: '취소 후 다시 열어도 유지되어야 하는 강사 회고 메모' },
  });
  expect(window.sessionStorage.getItem('pf_log_session_draft_v1:qa-modal')).not.toBeNull();

  // Simulate accidental cancel/close and reopen for the same sequenceId
  fireEvent.click(screen.getByRole('button', { name: '취소' }));
  expect(close).toHaveBeenCalledOnce();
  unmount();

  render(<LogSessionModal sequenceId="qa-modal" onClose={vi.fn()} />);
  expect(screen.getByTestId('log-session-draft-restored')).toHaveTextContent(
    '이전에 작성하던 수업 기록 초안을 복원했습니다.',
  );
  expect(screen.getByLabelText('다음 수업을 위한 메모 (선택)')).toHaveValue(
    '취소 후 다시 열어도 유지되어야 하는 강사 회고 메모',
  );

  // Saving the session log clears the sessionStorage draft
  fireEvent.click(screen.getByRole('button', { name: '수업 기록 저장' }));
  expect(usePilatesStore.getState().historyLogs).toHaveLength(1);
  expect(usePilatesStore.getState().historyLogs[0].instructorReflection).toBe(
    '취소 후 다시 열어도 유지되어야 하는 강사 회고 메모',
  );
  expect(window.sessionStorage.getItem('pf_log_session_draft_v1:qa-modal')).toBeNull();
});
