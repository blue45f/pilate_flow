import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { usePilatesStore } from '../store/usePilatesStore';
import { App } from '../App';

const controlled = vi.hoisted(() => ({ failure: new Error('PRIVATE_STUDY_IMPORT_FAILURE') }));
vi.mock('../components/InstructorStudyDialog', () => {
  throw controlled.failure;
});
vi.mock('../components/SequenceWorkbench', () => ({
  SequenceWorkbench: () => <p>기존 수업 작업실 유지</p>,
}));
const original = usePilatesStore.getState();
beforeEach(() => {
  usePilatesStore.setState({ ...original, activeTab: 'workbench' }, true);
  vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function (
    this: HTMLDialogElement,
  ) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  });
});
afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
  vi.restoreAllMocks();
});

it('keeps the real App and local class data intact when the optional study import rejects', async () => {
  const unexpected: unknown[][] = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    if (
      !args.some(
        (value) =>
          value === controlled.failure ||
          (value instanceof Error && value.cause === controlled.failure),
      )
    )
      unexpected.push(args);
  });
  const state = usePilatesStore.getState();
  const exercise = state.exercises.find((item) => item.nameKo === '골반 시계')!;
  state.appendExerciseToSequence(exercise.id);
  state.updateStepNote(0, '합성 오류 경계 보존 메모');
  state.saveCurrentSequenceToBinder();
  const before = usePilatesStore.getState();
  const storageBefore = localStorage.getItem('pilates-flow-atelier-storage-v3');
  render(<App />);
  await screen.findByText('기존 수업 작업실 유지');
  fireEvent.click(screen.getByRole('button', { name: '강사 연습실과 사용법' }));
  expect(await screen.findByRole('dialog', { name: '강사 연습실을 열지 못했어요' })).toBeVisible();
  expect(screen.getByText('기존 수업 작업실 유지')).toBeInTheDocument();
  for (const key of [
    'activeSteps',
    'savedSequences',
    'exercises',
    'historyLogs',
    'instructorSchedule',
  ] as const) {
    expect(usePilatesStore.getState()[key]).toEqual(before[key]);
  }
  expect(localStorage.getItem('pilates-flow-atelier-storage-v3')).toBe(storageBefore);
  expect(screen.queryByText(/PRIVATE_STUDY_IMPORT_FAILURE/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '닫고 계속하기' }));
  expect(screen.queryByRole('dialog', { name: '강사 연습실을 열지 못했어요' })).toBeNull();
  expect(screen.getByText('기존 수업 작업실 유지')).toBeVisible();
  expect(localStorage.getItem('pilates-flow-atelier-storage-v3')).toBe(storageBefore);
  fireEvent.click(screen.getByRole('button', { name: '강사 연습실과 사용법' }));
  expect(await screen.findByRole('dialog', { name: '강사 연습실을 열지 못했어요' })).toBeVisible();
  expect(screen.getByText('기존 수업 작업실 유지')).toBeVisible();
  expect(localStorage.getItem('pilates-flow-atelier-storage-v3')).toBe(storageBefore);
  fireEvent.click(screen.getByRole('button', { name: '닫고 계속하기' }));
  expect(screen.queryByRole('dialog', { name: '강사 연습실을 열지 못했어요' })).toBeNull();
  expect(unexpected).toEqual([]);
});
