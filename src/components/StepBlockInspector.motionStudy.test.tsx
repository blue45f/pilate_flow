import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ledger from '../data/motionStudyLedger.json';
import { getMotionPatternReferences } from '../data/motionPatternReferences';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import type { SequenceStep } from '../types/pilates';
import type { SequenceMotionStudyBinding } from '../types/sequenceMotion';
import { createSequenceMotionStudyBinding } from '../utils/sequenceMotionBinding';
import { getStepTiming } from '../utils/sequenceEngine';
import { isExerciseAutoEligible } from '../utils/exerciseReview';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import { StepBlockInspector } from './StepBlockInspector';
import type { StepInspectorDraftCache } from './StepBlockInspector';

// Keep the real picker, ledger relationship, draft, and store; geometry is tested separately.
vi.mock('./MotionPatternPreview', () => ({
  MotionPatternThumbnail: () => <span data-testid="study-thumbnail" />,
  MotionPatternPreview: ({
    reference,
    active,
  }: {
    reference: { family: string; variantId: string };
    active: boolean;
  }) => (
    <div
      data-testid="selected-study-preview"
      data-family={reference.family}
      data-variant={reference.variantId}
      data-active={String(active)}
    />
  ),
}));

const entry = ledger.entries.find((item) => item.intendedExerciseIds.length > 0)!;
const exercise = {
  ...syntheticPlanningExercise('mat', 'core', 'alpha', false),
  id: entry.intendedExerciseIds[0],
};
const reference = getMotionPatternReferences(exercise.id).find(
  (item) => item.family === entry.family && item.variantId === entry.variantId,
)!;
const binding = createSequenceMotionStudyBinding(exercise.id, entry.family, entry.variantId)!;
const stale: SequenceMotionStudyBinding = {
  ...binding,
  sourceFingerprint: '0'.repeat(64),
  opaque: { preserved: ['historical selection'] },
};
const future: SequenceMotionStudyBinding = {
  version: 9,
  family: 'future-import-family',
  variantId: 'future-import-selection',
  sourceFingerprint: 'a'.repeat(64),
  opaque: { preserved: ['future selection'], nested: { marker: true } },
  side: 'left',
  cadence: 999,
  review: { approved: true },
};
const base: SequenceStep = {
  stepId: 'qa-inspector-motion-step',
  exerciseId: exercise.id,
  order: 1,
  blockCategory: 'core',
  durationMin: 4,
  explanationSec: 20,
  transitionSec: 10,
  selectedLayer: 'standard',
  repetitions: 6,
  sets: 2,
  sideMode: 'right',
};
const rest: SequenceStep = {
  kind: 'rest',
  stepId: 'qa-inspector-motion-rest',
  exerciseId: '',
  order: 2,
  blockCategory: 'core',
  durationMin: 2,
  selectedLayer: 'standard',
};
const original = usePilatesStore.getState();
interface HarnessProps {
  onClose?: () => void;
  loadDraft?: () => StepInspectorDraftCache | null;
  onDraftChange?: (value: StepInspectorDraftCache) => void;
}
function Harness({ onClose = () => {}, loadDraft, onDraftChange }: HarnessProps) {
  const step = usePilatesStore((state) => state.activeSteps[0]);
  return (
    <StepBlockInspector
      index={0}
      step={step}
      onClose={onClose}
      onReplace={() => {}}
      onOpenExercise={() => {}}
      loadDraft={loadDraft}
      onDraftChange={onDraftChange}
    />
  );
}
function change(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
function picker() {
  return screen.getByRole('region', { name: '수업에 저장할 모션 초안' });
}
function openPicker() {
  const details = picker().querySelector('details')!;
  if (!details.open) fireEvent.click(details.querySelector('summary')!);
}
function selectCurrentStudy() {
  openPicker();
  fireEvent.click(
    within(picker()).getByRole('radio', { name: `${reference.title} 수업 모션으로 선택` }),
  );
}
function applyChanges() {
  fireEvent.click(screen.getByRole('button', { name: '변경 적용' }));
}
beforeEach(() => {
  localStorage.clear();
  usePilatesStore.setState(
    {
      ...original,
      exercises: [...INITIAL_EXERCISES.filter((item) => item.id !== exercise.id), exercise],
      activeSteps: structuredClone([base, rest]),
      undoStack: [],
      generationError: null,
      saveFeedback: null,
    },
    true,
  );
});
afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('inspector class role and explicit motion-study draft', () => {
  it('applies role, source and count together once and undoes them without changing timing, side or review', () => {
    const before = usePilatesStore.getState();
    const apply = vi.fn(before.setStepBlockOptions);
    const onClose = vi.fn();
    usePilatesStore.setState({ setStepBlockOptions: apply });
    render(<Harness onClose={onClose} />);
    change('수업에서의 역할', 'preparation');
    change('강사가 정한 횟수', '12');
    selectCurrentStudy();
    expect(screen.getByTestId('selected-study-preview')).toHaveAttribute(
      'data-variant',
      reference.variantId,
    );
    expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
    expect(usePilatesStore.getState().undoStack).toHaveLength(0);
    applyChanges();
    expect(apply).toHaveBeenCalledExactlyOnceWith(
      0,
      { classSection: 'preparation', repetitions: 12, motionStudy: binding },
      base,
    );
    const after = usePilatesStore.getState();
    expect(after.activeSteps[0]).toEqual({
      ...base,
      classSection: 'preparation',
      repetitions: 12,
      motionStudy: binding,
    });
    expect(after.undoStack).toHaveLength(1);
    expect(after.activeSteps[1]).toBe(before.activeSteps[1]);
    expect(after.activeSteps[0].sideMode).toBe('right');
    expect(getStepTiming(after.activeSteps[0])).toEqual(getStepTiming(base));
    expect(after.exercises).toBe(before.exercises);
    expect(after.exercises.filter(isExerciseAutoEligible)).toHaveLength(0);
    expect(after.exercises.find((item) => item.id === exercise.id)?.review).toBeUndefined();
    expect(INITIAL_EXERCISES).toHaveLength(158);
    expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
    expect(onClose).toHaveBeenCalledOnce();
    act(() => usePilatesStore.getState().undoSequence());
    expect(usePilatesStore.getState().activeSteps).toEqual(before.activeSteps);
    expect(usePilatesStore.getState().undoStack).toHaveLength(0);
  });

  it('retains role and source draft when invalid timing rejects the entire Apply', () => {
    const before = usePilatesStore.getState();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    change('수업에서의 역할', 'cooldown');
    selectCurrentStudy();
    change('블록 총시간 · 분', '0.5');
    change('티칭 · 초', '20');
    change('전환 · 초', '20');
    applyChanges();
    expect(screen.getByRole('alert')).toHaveTextContent('설명·전환 시간의 합계');
    expect(screen.getByLabelText('수업에서의 역할')).toHaveValue('cooldown');
    expect(
      within(picker()).getByRole('radio', { name: `${reference.title} 수업 모션으로 선택` }),
    ).toBeChecked();
    expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
    expect(usePilatesStore.getState().undoStack).toBe(before.undoStack);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('restores unsaved role and source from the draft cache before a single Apply', () => {
    let cache: StepInspectorDraftCache | null = null;
    const loadDraft = () => cache;
    const onDraftChange = (value: StepInspectorDraftCache) => {
      cache = value;
    };
    const before = usePilatesStore.getState().activeSteps;
    const view = render(<Harness loadDraft={loadDraft} onDraftChange={onDraftChange} />);
    change('수업에서의 역할', 'cooldown');
    change('강사가 정한 횟수', '11');
    selectCurrentStudy();
    view.unmount();
    const saved = loadDraft();
    expect(saved?.draft.motionStudy).toEqual(binding);
    expect(saved?.base).toEqual(base);
    expect(saved?.base).not.toBe(before[0]);
    expect(usePilatesStore.getState().activeSteps).toBe(before);
    render(<Harness loadDraft={loadDraft} onDraftChange={onDraftChange} />);
    expect(screen.getByLabelText('수업에서의 역할')).toHaveValue('cooldown');
    expect(screen.getByLabelText('강사가 정한 횟수')).toHaveValue(11);
    expect(
      within(picker()).getByRole('radio', { name: `${reference.title} 수업 모션으로 선택` }),
    ).toBeChecked();
    expect(usePilatesStore.getState().activeSteps).toBe(before);
    applyChanges();
    expect(usePilatesStore.getState().activeSteps[0]).toEqual({
      ...base,
      classSection: 'cooldown',
      repetitions: 11,
      motionStudy: binding,
    });
    expect(usePilatesStore.getState().undoStack).toHaveLength(1);
  });

  it.each(['role', 'binding'] as const)(
    'rejects an externally changed %s and reloads its full snapshot before a count-only Apply',
    (changed) => {
      const apply = vi.fn(usePilatesStore.getState().setStepBlockOptions);
      usePilatesStore.setState({ setStepBlockOptions: apply });
      render(<Harness />);
      change('강사가 정한 횟수', '15');
      selectCurrentStudy();
      const external: SequenceStep =
        changed === 'role'
          ? { ...base, classSection: 'cooldown' }
          : { ...base, motionStudy: future };
      act(() => usePilatesStore.setState({ activeSteps: [external, rest] }));
      applyChanges();
      expect(screen.getByRole('alert')).toHaveTextContent('다른 편집으로 이 블록이 바뀌었습니다');
      expect(apply).not.toHaveBeenCalled();
      expect(usePilatesStore.getState().activeSteps[0]).toBe(external);
      fireEvent.click(screen.getByRole('button', { name: '현재 값 다시 불러오기' }));
      expect(screen.getByLabelText('수업에서의 역할')).toHaveValue(
        changed === 'role' ? 'cooldown' : '',
      );
      expect(screen.queryByTestId('selected-study-preview')).not.toBeInTheDocument();
      change('강사가 정한 횟수', '7');
      applyChanges();
      expect(apply).toHaveBeenCalledExactlyOnceWith(0, { repetitions: 7 }, external);
      expect(usePilatesStore.getState().activeSteps[0]).toEqual({ ...external, repetitions: 7 });
    },
  );

  it('deep-copies imported binding metadata so an external nested mutation cannot disguise a stale source snapshot', () => {
    const external = { ...base, motionStudy: structuredClone(future) };
    usePilatesStore.setState({ activeSteps: [external, rest] });
    const apply = vi.fn(usePilatesStore.getState().setStepBlockOptions);
    usePilatesStore.setState({ setStepBlockOptions: apply });
    render(<Harness />);
    change('강사가 정한 횟수', '9');
    act(() => {
      (external.motionStudy.opaque as { nested: { marker: boolean } }).nested.marker = false;
      usePilatesStore.setState({ activeSteps: [external, rest] });
    });
    applyChanges();
    expect(screen.getByRole('alert')).toHaveTextContent('다른 편집으로 이 블록이 바뀌었습니다');
    expect(apply).not.toHaveBeenCalled();
    expect(usePilatesStore.getState().activeSteps[0].repetitions).toBe(base.repetitions);
    expect(usePilatesStore.getState().undoStack).toHaveLength(0);
  });

  it('disables locked role, source, clear and Apply controls while allowing a saved reference to be viewed', () => {
    const locked = { ...base, locked: true, classSection: 'main' as const, motionStudy: binding };
    usePilatesStore.setState({ activeSteps: [locked, rest] });
    const apply = vi.fn(usePilatesStore.getState().setStepBlockOptions);
    usePilatesStore.setState({ setStepBlockOptions: apply });
    render(<Harness />);
    expect(screen.getByLabelText('수업에서의 역할')).toBeDisabled();
    for (const radio of within(picker()).getAllByRole('radio')) expect(radio).toBeDisabled();
    expect(screen.getByRole('button', { name: '이번 수업의 연결 해제' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '변경 적용' })).toBeDisabled();
    expect(screen.getByTestId('selected-study-preview')).toBeInTheDocument();
    applyChanges();
    expect(apply).not.toHaveBeenCalled();
    expect(usePilatesStore.getState().activeSteps[0]).toBe(locked);
    expect(usePilatesStore.getState().undoStack).toHaveLength(0);
  });

  it('revokes the independent player when its native details are collapsed and never auto-resumes it', async () => {
    usePilatesStore.setState({ activeSteps: [{ ...base, motionStudy: binding }, rest] });
    render(<Harness />);
    const preview = screen.getByTestId('selected-study-preview');
    expect(preview).toHaveAttribute('data-active', 'true');
    const summary = picker().querySelector('summary')!;
    fireEvent.click(summary);
    await waitFor(() => expect(preview).toHaveAttribute('data-active', 'false'));
    fireEvent.click(summary);
    await waitFor(() => expect(preview).toHaveAttribute('data-active', 'true'));
    expect(usePilatesStore.getState().activeSteps[0].motionStudy).toEqual(binding);
    expect(usePilatesStore.getState().undoStack).toHaveLength(0);
  });

  it.each([
    { label: 'order-only movement', extra: { order: 3 } },
    { label: 'opaque future metadata', extra: { futureStepMetadata: { changed: true } } },
  ])('offers an explicit reload after $label changes the full opened snapshot', ({ extra }) => {
    render(<Harness />);
    change('강사가 정한 횟수', '13');
    const external = { ...base, ...extra };
    act(() => usePilatesStore.setState({ activeSteps: [external, rest] }));
    applyChanges();
    expect(screen.getByRole('alert')).toHaveTextContent('다른 편집으로 이 블록이 바뀌었습니다');
    expect(usePilatesStore.getState().activeSteps[0]).toBe(external);
    fireEvent.click(screen.getByRole('button', { name: '현재 값 다시 불러오기' }));
    change('강사가 정한 횟수', '13');
    applyChanges();
    expect(usePilatesStore.getState().activeSteps[0]).toEqual({ ...external, repetitions: 13 });
    expect(usePilatesStore.getState().undoStack).toHaveLength(1);
  });

  it.each([
    { name: 'stale', value: stale },
    { name: 'future', value: future },
  ])(
    'preserves $name imported JSON on count-only edits and never previews a fallback',
    ({ value }) => {
      const imported = {
        ...base,
        classSection: 'cooldown' as const,
        motionStudy: structuredClone(value),
      };
      usePilatesStore.setState({ activeSteps: [imported, rest] });
      const before = usePilatesStore.getState();
      const apply = vi.fn(before.setStepBlockOptions);
      usePilatesStore.setState({ setStepBlockOptions: apply });
      render(<Harness />);
      expect(screen.queryByTestId('selected-study-preview')).not.toBeInTheDocument();
      expect(
        within(picker()).getByRole('radio', { name: `${reference.title} 수업 모션으로 선택` }),
      ).not.toBeChecked();
      change('강사가 정한 횟수', '8');
      applyChanges();
      expect(apply).toHaveBeenCalledExactlyOnceWith(0, { repetitions: 8 }, imported);
      const after = usePilatesStore.getState();
      expect(after.activeSteps[0].motionStudy).toEqual(value);
      expect(after.activeSteps[0].classSection).toBe('cooldown');
      expect(after.activeSteps[0].sideMode).toBe('right');
      expect(getStepTiming(after.activeSteps[0])).toEqual(getStepTiming(imported));
      expect(after.exercises).toBe(before.exercises);
      expect(after.exercises.filter(isExerciseAutoEligible)).toHaveLength(0);
      expect(screen.queryByTestId('selected-study-preview')).not.toBeInTheDocument();
    },
  );

  it.each([
    { name: 'stale', value: stale },
    { name: 'future', value: future },
  ])(
    'requires explicit selection to rebind $name data and explicit Apply to clear role and source',
    ({ value }) => {
      const imported = {
        ...base,
        classSection: 'cooldown' as const,
        motionStudy: structuredClone(value),
      };
      usePilatesStore.setState({ activeSteps: [imported, rest] });
      const view = render(<Harness />);
      selectCurrentStudy();
      expect(usePilatesStore.getState().activeSteps[0].motionStudy).toEqual(value);
      applyChanges();
      expect(usePilatesStore.getState().activeSteps[0].motionStudy).toEqual(binding);
      view.unmount();
      const rebound = usePilatesStore.getState().activeSteps[0];
      render(<Harness />);
      fireEvent.click(screen.getByRole('button', { name: '이번 수업의 연결 해제' }));
      change('수업에서의 역할', '');
      expect(usePilatesStore.getState().activeSteps[0]).toBe(rebound);
      applyChanges();
      expect(usePilatesStore.getState().activeSteps[0]).not.toHaveProperty('motionStudy');
      expect(usePilatesStore.getState().activeSteps[0]).not.toHaveProperty('classSection');
      expect(getStepTiming(usePilatesStore.getState().activeSteps[0])).toEqual(getStepTiming(base));
      act(() => usePilatesStore.getState().undoSequence());
      expect(usePilatesStore.getState().activeSteps[0]).toEqual(rebound);
    },
  );

  it('lazily mounts MovementVisualGuideCard on disclosure toggle and resets dirty draft without mutating store', async () => {
    const before = usePilatesStore.getState();
    render(<Harness />);

    const resetBtn = screen.getByTestId('step-inspector-reset-draft');
    expect(resetBtn).toBeDisabled();
    expect(resetBtn).toHaveTextContent('입력 되돌리기');

    const disclosure = screen.getByTestId('step-inspector-visual-guide');
    expect(
      within(disclosure).getByText('시작·중간·끝 관절 정렬 도해 및 유사 동작 차이 비교'),
    ).toBeInTheDocument();
    expect(within(disclosure).queryByRole('region')).not.toBeInTheDocument();

    fireEvent.click(
      within(disclosure).getByText('시작·중간·끝 관절 정렬 도해 및 유사 동작 차이 비교'),
    );
    await waitFor(() => {
      expect(disclosure).toHaveAttribute('open');
      expect( disclosure.querySelectorAll('*').length).toBeGreaterThan(1);
    });

    change('수업에서의 역할', 'cooldown');
    change('강사가 정한 횟수', '14');
    selectCurrentStudy();
    expect(resetBtn).not.toBeDisabled();

    fireEvent.click(resetBtn);
    expect(resetBtn).toBeDisabled();
    expect(screen.getByLabelText('수업에서의 역할')).toHaveValue('');
    expect(screen.getByLabelText('강사가 정한 횟수')).toHaveValue(base.repetitions);
    expect(
      within(picker()).getByRole('radio', { name: `${reference.title} 수업 모션으로 선택` }),
    ).not.toBeChecked();
    expect(
      screen.getByText('수정한 입력값을 적용 전 상태로 되돌렸습니다.'),
    ).toHaveAttribute('role', 'status');
    expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
    expect(usePilatesStore.getState().undoStack).toHaveLength(0);
  });
});

