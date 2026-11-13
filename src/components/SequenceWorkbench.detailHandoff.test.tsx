import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { getMotionPatternReferences } from '../data/motionPatternReferences';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import { createEmptyInstructorSchedule } from '../types/instructorSchedule';
import type { AutoGenerateCriteria, SequenceStep } from '../types/pilates';
import { isExerciseAutoEligible } from '../utils/exerciseReview';
import { createSequenceMotionStudyBinding } from '../utils/sequenceMotionBinding';

// Keep the actual App, native-dialog components, inspector, picker, detail and store.
// Embedded media playback is independent of this read-only source lookup.
vi.mock('./MotionReferencePlayer', () => ({ MotionReferencePlayer: () => null }));

const original = usePilatesStore.getState();
const originalWidth = window.innerWidth;
const catalogSnapshot = structuredClone(INITIAL_EXERCISES);
// Bound each multi-dialog journey, including the first lazy source-module load.
const HANDOFF_JOURNEY_TIMEOUT_MS = 20_000;
const exercise = INITIAL_EXERCISES.find((item) => item.id === 'original-mat-single-leg-stretch')!;
const reference = getMotionPatternReferences(exercise.id)[0];
const binding = createSequenceMotionStudyBinding(
  exercise.id,
  reference.family,
  reference.variantId,
)!;
const note = '합성 QA · 원본을 확인하고 돌아와 적용할 이번 수업 메모';
const externalNote = '합성 QA · 원본을 보는 동안 별도로 적용한 메모';
const base: SequenceStep = {
  stepId: 'qa-detail-handoff-step',
  order: 1,
  exerciseId: exercise.id,
  blockCategory: 'core',
  classSection: 'preparation',
  durationMin: 4,
  explanationSec: 20,
  transitionSec: 10,
  selectedLayer: 'standard',
  sideMode: 'right',
  instructorNote: '합성 QA · 원래 수업 메모',
};
const criteria: AutoGenerateCriteria = {
  apparatus: 'mat',
  availableEquipment: ['mat'],
  ownedApparatus: ['mat'],
  preferredProps: ['none'],
  level: '1.0',
  focusPreset: 'full-body',
  targetMinutes: 10,
  excludeDaysWindow: 0,
  defaultLayer: 'standard',
};

function setWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
}

async function openDirtyInspector() {
  render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: '1번 동작 블록 편집' }));
  const editor = screen.getByRole('region', { name: '1번 동작 블록 편집' });
  const fields = within(editor);
  fireEvent.change(fields.getByLabelText('블록 총시간 · 분'), {
    target: { value: '7.25' },
  });
  fireEvent.change(fields.getByLabelText('수업에서의 역할'), {
    target: { value: 'main' },
  });
  fireEvent.click(fields.getByText('이번 수업의 기구 세팅·티칭 메모', { selector: 'summary' }));
  fireEvent.change(fields.getByLabelText('이번 수업 티칭 메모'), {
    target: { value: note },
  });
  const picker = fields.getByRole('region', { name: '수업에 저장할 모션 초안' });
  const pickerDetails = picker.querySelector('details')!;
  pickerDetails.open = true;
  fireEvent(pickerDetails, new Event('toggle'));
  fireEvent.click(
    within(picker).getByRole('radio', { name: `${reference.title} 수업 모션으로 선택` }),
  );
  return editor;
}

function expectDraft(editor: HTMLElement) {
  const fields = within(editor);
  expect(fields.getByLabelText('블록 총시간 · 분')).toHaveValue(7.25);
  expect(fields.getByLabelText('수업에서의 역할')).toHaveValue('main');
  expect(fields.getByLabelText('이번 수업 티칭 메모')).toHaveValue(note);
  expect(
    fields.getByRole('radio', { name: `${reference.title} 수업 모션으로 선택` }),
  ).toBeChecked();
}

async function openSource(editor: HTMLElement, timeout = 5000) {
  fireEvent.click(within(editor).getByRole('button', { name: '동작 원본·검토 정보' }));
  const detail = await screen.findByRole('dialog', { name: exercise.nameKo }, { timeout });
  expect(within(detail).getByRole('region', { name: '내 강사 검토' })).toBeInTheDocument();
  return detail;
}

async function closeSource(detail: HTMLElement) {
  fireEvent.click(within(detail).getByRole('button', { name: '닫기' }));
  await waitFor(() => expect(detail).not.toBeInTheDocument());
}

beforeEach(() => {
  usePilatesStore.setState(
    {
      ...original,
      activeTab: 'workbench',
      activeSequenceId: 'qa-detail-handoff-plan',
      activeTitle: '합성 QA · 원본 확인 중 보존할 수업안',
      activeSubtitle: '',
      activeSteps: structuredClone([base]),
      activeTargetMinutes: 10,
      activeApparatus: 'mat',
      activeLevel: '1.0',
      exercises: INITIAL_EXERCISES,
      draftCriteria: criteria,
      lastCriteria: null,
      ownedEquipment: ['mat'],
      ownedApparatus: ['mat'],
      ownedProps: [],
      instructorSchedule: createEmptyInstructorSchedule(),
      savedSequences: [],
      historyLogs: [],
      undoStack: [],
      generationError: null,
      persistenceError: null,
      saveFeedback: null,
    },
    true,
  );
  // jsdom's shared close polyfill omits the native close event used by App dialogs.
  vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function (
    this: HTMLDialogElement,
  ) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  });
});

afterEach(() => {
  cleanup();
  expect(INITIAL_EXERCISES).toEqual(catalogSnapshot);
  expect(INITIAL_EXERCISES).toHaveLength(98);
  expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
  expect(usePilatesStore.getState().exercises).toBe(INITIAL_EXERCISES);
  usePilatesStore.setState(original, true);
  setWidth(originalWidth);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe.each([
  { width: 390, layout: 'mobile sheet' },
  { width: 1440, layout: 'desktop panel' },
])('source-detail handoff from the $layout', ({ width }) => {
  it('returns to the same dirty block and applies note, duration, role and motion once against the original base', async () => {
    setWidth(width);
    const apply = vi.fn(original.setStepBlockOptions);
    usePilatesStore.setState({ setStepBlockOptions: apply });
    const before = usePilatesStore.getState();
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem');
    const editor = await openDirtyInspector();
    expectDraft(editor);
    // This first mobile case triggers App's cold lazy import of the source modal.
    const detail = await openSource(editor, width === 390 ? 10000 : 5000);
    expect(usePilatesStore.getState()).toBe(before);
    expect(apply).not.toHaveBeenCalled();
    expect(storageWrite).not.toHaveBeenCalled();

    await closeSource(detail);
    expect(editor).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '1번 동작 블록 편집' })).toBe(editor);
    expectDraft(editor);
    expect(usePilatesStore.getState()).toBe(before);
    expect(storageWrite).not.toHaveBeenCalled();
    if (width < 1200)
      expect(screen.getByRole('dialog', { name: '동작 블록 편집' })).toHaveAttribute('open');

    fireEvent.click(within(editor).getByRole('button', { name: '변경 적용' }));
    expect(apply).toHaveBeenCalledExactlyOnceWith(
      0,
      {
        durationMin: 7.25,
        instructorNote: note,
        classSection: 'main',
        motionStudy: binding,
      },
      base,
    );
    const after = usePilatesStore.getState();
    expect(after.activeSteps).toEqual([
      {
        ...base,
        durationMin: 7.25,
        instructorNote: note,
        classSection: 'main',
        motionStudy: binding,
      },
    ]);
    expect(after.undoStack).toHaveLength(1);
    expect(after.exercises).toBe(before.exercises);
    expect(after.savedSequences).toBe(before.savedSequences);
    expect(after.historyLogs).toBe(before.historyLogs);
    expect(screen.queryByRole('region', { name: '1번 동작 블록 편집' })).not.toBeInTheDocument();
    act(() => after.undoSequence());
    expect(usePilatesStore.getState().activeSteps).toEqual(before.activeSteps);
  }, HANDOFF_JOURNEY_TIMEOUT_MS);

  it('keeps the original draft base and rejects Apply when the class block changes during source lookup', async () => {
    setWidth(width);
    const apply = vi.fn(original.setStepBlockOptions);
    usePilatesStore.setState({ setStepBlockOptions: apply });
    const editor = await openDirtyInspector();
    const detail = await openSource(editor);
    act(() => {
      expect(original.setStepBlockOptions(0, { instructorNote: externalNote }, base).success).toBe(
        true,
      );
    });
    const changed = usePilatesStore.getState();
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem');
    await closeSource(detail);
    expect(editor).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '1번 동작 블록 편집' })).toBe(editor);
    expectDraft(editor);
    fireEvent.click(within(editor).getByRole('button', { name: '변경 적용' }));
    expect(within(editor).getByRole('alert')).toHaveTextContent(
      '다른 편집으로 이 블록이 바뀌었습니다',
    );
    expect(apply).not.toHaveBeenCalled();
    expect(usePilatesStore.getState()).toBe(changed);
    expect(storageWrite).not.toHaveBeenCalled();
    expect(changed.activeSteps[0]).toEqual({ ...base, instructorNote: externalNote });
    expect(changed.undoStack).toHaveLength(1);
    expectDraft(editor);
  }, HANDOFF_JOURNEY_TIMEOUT_MS);
});

it('keeps source details above the resized editor and ignores a queued suspension close after returning', async () => {
  setWidth(390);
  const suspendedCloses: HTMLDialogElement[] = [];
  const showModal = HTMLDialogElement.prototype.showModal;
  let closeBeforeReopen = false;
  vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(function (
    this: HTMLDialogElement,
  ) {
    if (this.classList.contains('step-inspector-sheet') && suspendedCloses.includes(this)) {
      // Unit queue simulation: deliver the old notification in the return gap,
      // before the native open flag is restored. This is not browser timing proof.
      closeBeforeReopen = true;
      this.dispatchEvent(new Event('close'));
    }
    showModal.call(this);
  });
  vi.mocked(HTMLDialogElement.prototype.close).mockImplementation(function (
    this: HTMLDialogElement,
  ) {
    this.removeAttribute('open');
    if (this.classList.contains('step-inspector-sheet')) suspendedCloses.push(this);
    else this.dispatchEvent(new Event('close'));
  });
  const before = usePilatesStore.getState();
  const storageWrite = vi.spyOn(Storage.prototype, 'setItem');
  const editor = await openDirtyInspector();
  const detail = await openSource(editor);
  expect(suspendedCloses).toHaveLength(1);
  for (const width of [1440, 390]) {
    setWidth(width);
    fireEvent(window, new Event('resize'));
    expect(detail).toHaveAttribute('open');
    expect(document.querySelector('.step-inspector-sheet')).not.toHaveAttribute('open');
    expect(document.querySelectorAll('dialog[open]')).toHaveLength(1);
    expect(document.querySelector('dialog[open]')).toBe(detail);
    expect(usePilatesStore.getState()).toBe(before);
  }

  await closeSource(detail);
  expect(closeBeforeReopen).toBe(true);
  const returned = screen.getByRole('region', { name: '1번 동작 블록 편집' });
  expect(screen.getByRole('dialog', { name: '동작 블록 편집' })).toHaveAttribute('open');
  expectDraft(returned);
  // Native close is queued. A notification from the suspension must not clear
  // the selected block if the same sheet has already reopened in the meantime.
  act(() => suspendedCloses[0].dispatchEvent(new Event('close')));
  expect(screen.getByRole('region', { name: '1번 동작 블록 편집' })).toBe(returned);
  expectDraft(returned);
  expect(usePilatesStore.getState()).toBe(before);
  expect(storageWrite).not.toHaveBeenCalled();
}, HANDOFF_JOURNEY_TIMEOUT_MS);

it('pauses a manually played desktop reference during source lookup and stays paused on return without losing class inputs', async () => {
  setWidth(1440);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  let nextFrame = 0;
  const frames = new Map<number, FrameRequestCallback>();
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    const id = ++nextFrame;
    frames.set(id, callback);
    return id;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => frames.delete(id));
  const frame = (timestamp: number) => {
    act(() => {
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((callback) => callback(timestamp));
    });
  };
  const before = usePilatesStore.getState();
  const storageWrite = vi.spyOn(Storage.prototype, 'setItem');
  const editor = await openDirtyInspector();
  const fields = within(editor);
  const range = fields.getByLabelText('도해 위치') as HTMLInputElement;
  const play = fields.getByRole('button', { name: '한 주기 재생' });
  await waitFor(() => expect(play).toBeEnabled());
  fireEvent.click(play);
  expect(fields.getByRole('button', { name: '일시정지' })).toBeEnabled();
  frame(0);
  frame(500);
  const progress = range.value;
  expect(Number(progress)).toBeGreaterThan(0);

  const detail = await openSource(editor);
  expect(fields.getByRole('button', { name: '한 주기 재생' })).toBeDisabled();
  expect(fields.queryByRole('button', { name: '일시정지' })).not.toBeInTheDocument();
  frame(1000);
  expect(range).toHaveValue(progress);
  expect(usePilatesStore.getState()).toBe(before);
  await closeSource(detail);
  expect(screen.getByRole('region', { name: '1번 동작 블록 편집' })).toBe(editor);
  expect(fields.getByRole('button', { name: '한 주기 재생' })).toBeEnabled();
  expect(fields.queryByRole('button', { name: '일시정지' })).not.toBeInTheDocument();
  frame(2000);
  frame(3000);
  expect(range).toHaveValue(progress);
  expectDraft(editor);
  expect(usePilatesStore.getState()).toBe(before);
  expect(storageWrite).not.toHaveBeenCalled();
}, HANDOFF_JOURNEY_TIMEOUT_MS);
