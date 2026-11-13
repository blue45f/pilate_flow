import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { VERIFIED_REFERENCES } from '../data/verifiedReferences';
import { usePilatesStore } from '../store/usePilatesStore';
import type { SequenceStep } from '../types/pilates';
import { cloudBackupDataSchema } from '../schemas/cloudBackupSchema';
import { RECOVERY_STORAGE_KEY } from '../lib/recoveryStorageGuard';
import { isExerciseAutoEligible } from '../utils/exerciseReview';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import { StepBlockInspector } from './StepBlockInspector';
import type { StepInspectorDraftCache } from './StepBlockInspector';

const original = usePilatesStore.getState();
const pending = {
  ...syntheticPlanningExercise('reformer', 'core', 'alpha', false),
  springs: '확인되지 않은 원본 설정 · 표시하면 안 되는 합성 값',
  cues: ['표시하면 안 되는 미검토 합성 큐'],
};
const base: SequenceStep = {
  stepId: 'qa-inspector-step',
  exerciseId: pending.id,
  order: 1,
  blockCategory: 'core',
  durationMin: 4,
  explanationSec: 20,
  transitionSec: 10,
  selectedLayer: 'standard',
  instructorNote: '합성 기존 수업 메모',
};
const rest: SequenceStep = {
  kind: 'rest',
  stepId: 'qa-inspector-rest',
  exerciseId: '',
  order: 2,
  blockCategory: 'core',
  durationMin: 2,
  selectedLayer: 'standard',
};

interface HarnessProps {
  onClose?: () => void;
  onReplace?: () => void;
  loadDraft?: () => StepInspectorDraftCache | null;
  onDraftChange?: (value: StepInspectorDraftCache) => void;
}
function Harness({
  onClose = () => {},
  onReplace = () => {},
  loadDraft,
  onDraftChange,
}: HarnessProps) {
  const step = usePilatesStore((state) => state.activeSteps[0]);
  return (
    <StepBlockInspector
      index={0}
      step={step}
      onClose={onClose}
      onReplace={onReplace}
      onOpenExercise={() => {}}
      loadDraft={loadDraft}
      onDraftChange={onDraftChange}
    />
  );
}
function change(label: string, value: string) {
  openAdvanced();
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
function openAdvanced() {
  const summary = screen.getByText(
    '세부 시간 계산 · 횟수 · 스프링 · 모션 연결 고급 설정 펼치기',
    { selector: 'summary' },
  );
  if (!summary.closest('details')?.open) fireEvent.click(summary);
}
function openNotes() {
  openAdvanced();
  const summary = screen.getByText('이번 수업의 기구 세팅·티칭 메모', { selector: 'summary' });
  if (!summary.closest('details')?.open) fireEvent.click(summary);
}

beforeEach(() => {
  usePilatesStore.setState(
    {
      ...original,
      exercises: [...INITIAL_EXERCISES, pending],
      activeSteps: [{ ...base }, rest],
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
  vi.restoreAllMocks();
});

describe('one-apply class block inspector', () => {
  it('commits layer, time, counts, sets, sides and teacher notes together as one undoable store edit', () => {
    const onClose = vi.fn();
    const before = usePilatesStore.getState();
    const apply = vi.fn(before.setStepBlockOptions);
    const instantLayer = vi.fn(before.setStepLayer);
    usePilatesStore.setState({ setStepBlockOptions: apply, setStepLayer: instantLayer });
    render(<Harness onClose={onClose} />);
    change('이번 수업 변형', 'hard');
    change('블록 총시간 · 분', '5.25');
    change('티칭 · 초', '30');
    change('전환 · 초', '45');
    change('강사가 정한 횟수', '12');
    change('강사가 정한 세트', '3');
    change('수행할 쪽', 'right-then-left');
    openNotes();
    change('이번 수업 스프링 설정 · 직접 확인', '  합성 수업 설정 · 실제 지침 아님  ');
    change('이번 수업 티칭 메모', '합성 새 메모\n직접 작성한 두 번째 줄');
    expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
    expect(usePilatesStore.getState().undoStack).toHaveLength(0);
    expect(instantLayer).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '변경 적용' }));
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith(
      0,
      {
        selectedLayer: 'hard',
        durationMin: 5.25,
        explanationSec: 30,
        transitionSec: 45,
        repetitions: 12,
        sets: 3,
        sideMode: 'right-then-left',
        customSpringOverride: '합성 수업 설정 · 실제 지침 아님',
        instructorNote: '합성 새 메모\n직접 작성한 두 번째 줄',
      },
      base,
    );
    const after = usePilatesStore.getState();
    expect(after.activeSteps[0]).toEqual({
      ...base,
      ...apply.mock.calls[0][1],
    });
    expect(after.activeSteps[1]).toBe(rest);
    expect(after.exercises).toBe(before.exercises);
    expect(after.undoStack).toHaveLength(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(instantLayer).not.toHaveBeenCalled();

    act(() => usePilatesStore.getState().undoSequence());
    expect(usePilatesStore.getState().activeSteps).toEqual(before.activeSteps);
    expect(usePilatesStore.getState().undoStack).toHaveLength(0);
  });

  it('keeps every original field and the draft when the combined teaching and transition time is invalid', () => {
    const onClose = vi.fn();
    const before = usePilatesStore.getState();
    render(<Harness onClose={onClose} />);
    change('블록 총시간 · 분', '0.5');
    change('티칭 · 초', '20');
    change('전환 · 초', '20');
    change('강사가 정한 횟수', '9');
    change('강사가 정한 세트', '2');
    change('수행할 쪽', 'left');
    openNotes();
    change('이번 수업 스프링 설정 · 직접 확인', '합성 새 설정');
    change('이번 수업 티칭 메모', '저장하면 안 되는 부분 변경');
    fireEvent.click(screen.getByRole('button', { name: '변경 적용' }));
    expect(screen.getByRole('alert')).toHaveTextContent('설명·전환 시간의 합계');
    expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
    expect(usePilatesStore.getState().undoStack).toBe(before.undoStack);
    expect(screen.getByLabelText('강사가 정한 횟수')).toHaveValue(9);
    expect(screen.getByLabelText('수행할 쪽')).toHaveValue('left');
    expect(screen.getByLabelText('이번 수업 티칭 메모')).toHaveValue('저장하면 안 되는 부분 변경');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('disables locked editing and replacement and renders no exercise inspector for a rest', () => {
    const locked = { ...base, locked: true };
    usePilatesStore.setState({ activeSteps: [locked, rest] });
    const onClose = vi.fn();
    const onReplace = vi.fn();
    const apply = vi.fn(usePilatesStore.getState().setStepBlockOptions);
    usePilatesStore.setState({ setStepBlockOptions: apply });
    render(<Harness onClose={onClose} onReplace={onReplace} />);
    for (const label of [
      '이번 수업 변형',
      '블록 총시간 · 분',
      '티칭 · 초',
      '전환 · 초',
      '강사가 정한 횟수',
      '강사가 정한 세트',
      '수행할 쪽',
      '수업에서의 역할',
    ]) {
      expect(screen.getByLabelText(label)).toBeDisabled();
    }
    expect(screen.getByRole('button', { name: '변경 적용' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '동작 교체' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '변경 적용' }));
    fireEvent.click(screen.getByRole('button', { name: '동작 교체' }));
    expect(apply).not.toHaveBeenCalled();
    expect(onReplace).not.toHaveBeenCalled();
    expect(usePilatesStore.getState().activeSteps[0]).toBe(locked);

    act(() => usePilatesStore.setState({ activeSteps: [rest] }));
    expect(screen.queryByRole('region', { name: /동작 블록 편집/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('강사가 정한 횟수')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: '수업에 저장할 모션 초안' }),
    ).not.toBeInTheDocument();
    expect(usePilatesStore.getState().activeSteps[0]).toBe(rest);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('rejects a stale draft and explicitly reloads current values before applying another edit', () => {
    const onClose = vi.fn();
    const apply = vi.fn(usePilatesStore.getState().setStepBlockOptions);
    usePilatesStore.setState({ setStepBlockOptions: apply });
    render(<Harness onClose={onClose} />);
    change('강사가 정한 횟수', '18');
    const external: SequenceStep = {
      ...base,
      durationMin: 6,
      repetitions: 3,
      sets: 2,
      sideMode: 'right',
      instructorNote: '합성 외부 편집 메모',
    };
    act(() => usePilatesStore.setState({ activeSteps: [external, rest] }));
    fireEvent.click(screen.getByRole('button', { name: '변경 적용' }));
    expect(screen.getByRole('alert')).toHaveTextContent('다른 편집으로 이 블록이 바뀌었습니다');
    expect(apply).not.toHaveBeenCalled();
    expect(usePilatesStore.getState().activeSteps[0]).toBe(external);
    expect(usePilatesStore.getState().undoStack).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: '현재 값 다시 불러오기' }));
    expect(screen.getByLabelText('블록 총시간 · 분')).toHaveValue(6);
    expect(screen.getByLabelText('강사가 정한 횟수')).toHaveValue(3);
    expect(screen.getByLabelText('강사가 정한 세트')).toHaveValue(2);
    expect(screen.getByLabelText('수행할 쪽')).toHaveValue('right');
    expect(screen.getByLabelText('이번 수업 티칭 메모')).toHaveValue(external.instructorNote);
    change('강사가 정한 횟수', '7');
    fireEvent.click(screen.getByRole('button', { name: '변경 적용' }));
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith(0, { repetitions: 7 }, external);
    expect(usePilatesStore.getState().activeSteps[0]).toEqual({ ...external, repetitions: 7 });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('retains an unsaved passed draft cache across unmount and remount without changing the stored plan', () => {
    let draftCache: StepInspectorDraftCache | null = null;
    const loadDraft = () => draftCache;
    const onDraftChange = (value: StepInspectorDraftCache) => {
      draftCache = value;
    };
    const before = usePilatesStore.getState().activeSteps;
    const view = render(<Harness loadDraft={loadDraft} onDraftChange={onDraftChange} />);
    change('블록 총시간 · 분', '7.25');
    change('이번 수업 변형', 'easy');
    change('티칭 · 초', '35');
    change('전환 · 초', '45');
    change('강사가 정한 횟수', '16');
    change('강사가 정한 세트', '4');
    change('수행할 쪽', 'left-then-right');
    openNotes();
    change('이번 수업 스프링 설정 · 직접 확인', '합성 저장 전 설정');
    change('이번 수업 티칭 메모', '다시 열 때 유지할 합성 메모');
    view.unmount();
    expect(usePilatesStore.getState().activeSteps).toBe(before);
    render(<Harness loadDraft={loadDraft} onDraftChange={onDraftChange} />);
    expect(screen.getByLabelText('블록 총시간 · 분')).toHaveValue(7.25);
    expect(screen.getByLabelText('이번 수업 변형')).toHaveValue('easy');
    expect(screen.getByLabelText('티칭 · 초')).toHaveValue(35);
    expect(screen.getByLabelText('전환 · 초')).toHaveValue(45);
    expect(screen.getByLabelText('강사가 정한 횟수')).toHaveValue(16);
    expect(screen.getByLabelText('강사가 정한 세트')).toHaveValue(4);
    expect(screen.getByLabelText('수행할 쪽')).toHaveValue('left-then-right');
    expect(screen.getByLabelText('이번 수업 스프링 설정 · 직접 확인')).toHaveValue(
      '합성 저장 전 설정',
    );
    expect(screen.getByLabelText('이번 수업 티칭 메모')).toHaveValue('다시 열 때 유지할 합성 메모');
    expect(usePilatesStore.getState().activeSteps).toBe(before);
    expect(usePilatesStore.getState().undoStack).toHaveLength(0);
  });

  it('never reveals pending source settings or cues and never changes catalog approval when class notes are edited', () => {
    const before = usePilatesStore.getState().exercises;
    const referencesBefore = JSON.stringify(VERIFIED_REFERENCES);
    const onOpenExercise = vi.fn();
    render(
      <StepBlockInspector
        index={0}
        step={base}
        onClose={vi.fn()}
        onReplace={vi.fn()}
        onOpenExercise={onOpenExercise}
      />,
    );
    openNotes();
    expect(screen.queryByText(pending.springs)).not.toBeInTheDocument();
    expect(screen.queryByText(pending.cues[0])).not.toBeInTheDocument();
    for (const cue of Object.values(pending.layers)) {
      expect(screen.queryByText(cue)).not.toBeInTheDocument();
    }
    expect(screen.queryByText(/검토한 동작의 기본 세팅/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('이번 수업 스프링 설정 · 직접 확인')).toHaveValue('');
    expect(screen.getByRole('region', { name: '수업에 저장할 모션 초안' })).toBeInTheDocument();
    fireEvent.click(screen.getByText('수업 모션 연결'));
    expect(
      screen.getByText(
        '아직 이 동작에 연결할 수 있는 도식이 없습니다. 다른 동작의 모션으로 대신 표시하지 않습니다.',
      ),
    ).toBeVisible();
    expect(screen.getByText('교차 검증 완료 · 스튜디오 가이드')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '동작 원본·검토 정보' }));
    expect(onOpenExercise).toHaveBeenCalledWith(pending);
    change('이번 수업 티칭 메모', '강사가 직접 쓴 합성 수업 메모');
    fireEvent.click(screen.getByRole('button', { name: '변경 적용' }));
    const after = usePilatesStore.getState();
    expect(after.activeSteps[0].instructorNote).toBe('강사가 직접 쓴 합성 수업 메모');
    expect(after.exercises).toBe(before);
    expect(after.exercises.find((item) => item.id === pending.id)?.review).toBeUndefined();
    expect(after.exercises.filter(isExerciseAutoEligible)).toHaveLength(0);
    expect(INITIAL_EXERCISES).toHaveLength(158);
    expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
    expect(JSON.stringify(VERIFIED_REFERENCES)).toBe(referencesBefore);
  });

  it('changes a count without resubmitting or clamping an unchanged legacy duration over twenty minutes', () => {
    const legacy: SequenceStep = {
      ...base,
      selectedLayer: 'hard',
      durationMin: 27,
      explanationSec: 1300,
      transitionSec: 60,
    };
    usePilatesStore.setState({
      activeSteps: [legacy, rest],
      exercises: [...INITIAL_EXERCISES, { ...pending, layers: { ...pending.layers, hard: '' } }],
    });
    const apply = vi.fn(usePilatesStore.getState().setStepBlockOptions);
    usePilatesStore.setState({ setStepBlockOptions: apply });
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    change('강사가 정한 횟수', '9');
    fireEvent.click(screen.getByRole('button', { name: '변경 적용' }));
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith(0, { repetitions: 9 }, legacy);
    expect(usePilatesStore.getState().activeSteps[0]).toEqual({ ...legacy, repetitions: 9 });
    expect(usePilatesStore.getState().activeSteps[0].durationMin).toBe(27);
    expect(usePilatesStore.getState().activeSteps[0].selectedLayer).toBe('hard');
    expect(usePilatesStore.getState().undoStack).toHaveLength(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('blocks an external layer change as stale and reloads that layer before one atomic Apply', () => {
    const apply = vi.fn(usePilatesStore.getState().setStepBlockOptions);
    usePilatesStore.setState({ setStepBlockOptions: apply });
    render(<Harness />);
    change('이번 수업 변형', 'easy');
    const external = { ...base, selectedLayer: 'hard' as const };
    act(() => usePilatesStore.setState({ activeSteps: [external, rest] }));
    fireEvent.click(screen.getByRole('button', { name: '변경 적용' }));
    expect(screen.getByRole('alert')).toHaveTextContent('다른 편집으로 이 블록이 바뀌었습니다');
    expect(apply).not.toHaveBeenCalled();
    expect(usePilatesStore.getState().activeSteps[0]).toBe(external);
    fireEvent.click(screen.getByRole('button', { name: '현재 값 다시 불러오기' }));
    expect(screen.getByLabelText('이번 수업 변형')).toHaveValue('hard');
    change('이번 수업 변형', 'easy');
    fireEvent.click(screen.getByRole('button', { name: '변경 적용' }));
    expect(apply).toHaveBeenCalledWith(0, { selectedLayer: 'easy' }, external);
    expect(usePilatesStore.getState().activeSteps[0]).toEqual({
      ...external,
      selectedLayer: 'easy',
    });
    expect(usePilatesStore.getState().undoStack).toHaveLength(1);
  });

  it('shows locally reviewed authored planning cues and hides them again after source changes', () => {
    const approved = syntheticPlanningExercise('reformer', 'core', 'alpha');
    usePilatesStore.setState({ exercises: [...INITIAL_EXERCISES, approved] });
    const before = usePilatesStore.getState();
    render(<Harness />);
    openAdvanced();
    expect(screen.getByText(approved.layers.standard)).toBeVisible();
    change('이번 수업 변형', 'easy');
    expect(screen.getByText(approved.layers.easy)).toBeVisible();
    expect(screen.queryByText(approved.layers.standard)).not.toBeInTheDocument();
    expect(screen.getByText('내가 검토한 계획 큐 · 선택 중인 변형')).toBeVisible();
    expect(screen.getByText(/전문가 검수나 모션 검증과 별개/)).toBeVisible();
    expect(screen.getByText('모션 미연결')).toBeVisible();
    expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
    expect(usePilatesStore.getState().activeLevel).toBe(before.activeLevel);
    act(() =>
      usePilatesStore.setState({
        exercises: [
          ...INITIAL_EXERCISES,
          { ...approved, precautions: '합성 변경으로 검토 기록을 오래된 상태로 전환' },
        ],
      }),
    );
    expect(screen.getByText('정보 변경 · 다시 검토 필요')).toBeVisible();
    for (const cue of Object.values(approved.layers)) {
      expect(screen.queryByText(cue)).not.toBeInTheDocument();
    }
    expect(screen.getByLabelText('이번 수업 변형')).toHaveValue('easy');
    expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
  });

  it('retains all local edits when a selected authored alternative becomes blank before Apply', () => {
    render(<Harness />);
    change('이번 수업 변형', 'hard');
    change('강사가 정한 횟수', '12');
    const before = usePilatesStore.getState();
    act(() =>
      usePilatesStore.setState({
        exercises: [...INITIAL_EXERCISES, { ...pending, layers: { ...pending.layers, hard: '' } }],
      }),
    );
    expect(screen.getByRole('option', { name: '어려운 변형 · 계획 메모 없음' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '변경 적용' }));
    expect(screen.getByRole('alert')).toHaveTextContent('변형');
    expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
    expect(usePilatesStore.getState().undoStack).toBe(before.undoStack);
    expect(screen.getByLabelText('이번 수업 변형')).toHaveValue('hard');
    expect(screen.getByLabelText('강사가 정한 횟수')).toHaveValue(12);
  });

  it('defaults a legacy draft cache without layer to the current selection without clearing it', () => {
    let cache: StepInspectorDraftCache | null = null;
    const loadDraft = (): StepInspectorDraftCache | null => cache;
    const view = render(
      <Harness
        loadDraft={loadDraft}
        onDraftChange={(value) => {
          cache = value;
        }}
      />,
    );
    change('강사가 정한 횟수', '5');
    view.unmount();
    const saved = loadDraft();
    if (!saved) throw new Error('Expected an inspector draft cache');
    const legacy = { ...saved, draft: { ...saved.draft } };
    Reflect.deleteProperty(legacy.draft, 'layer');
    const apply = vi.fn(usePilatesStore.getState().setStepBlockOptions);
    usePilatesStore.setState({ setStepBlockOptions: apply });
    render(<Harness loadDraft={() => legacy} />);
    expect(screen.getByLabelText('이번 수업 변형')).toHaveValue('standard');
    expect(screen.getByLabelText('강사가 정한 횟수')).toHaveValue(5);
    change('강사가 정한 횟수', '7');
    fireEvent.click(screen.getByRole('button', { name: '변경 적용' }));
    expect(apply).toHaveBeenCalledWith(0, { repetitions: 7 }, base);
    expect(usePilatesStore.getState().activeSteps[0].selectedLayer).toBe('standard');
  });
});

describe('optional time calculation inside the block draft', () => {
  it('keeps browsing local, commits 169 seconds only after two explicit actions, and preserves assumptions across reload and undo', async () => {
    const before = usePilatesStore.getState();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const summary = screen.getByText('반복·유지·호흡으로 시간 계산');
    expect(summary.closest('details')).not.toHaveAttribute('open');
    fireEvent.click(summary);
    change('계산용 횟수 · 한 세트마다', '4');
    change('계산용 세트 · 한쪽마다', '2');
    change('계산할 쪽', '2');
    change('한 회 움직임 · 초', '3');
    change('한 회마다 추가 유지 · 초', '1');
    change('세트마다 별도 호흡 · 회', '2');
    change('별도 호흡 한 회 · 초', '5');
    change('세트 사이 쉼 · 초', '10');
    change('좌우 바꾸기 · 초', '15');
    expect(screen.getByText('가정 총시간 02:49')).toBeInTheDocument();
    expect(usePilatesStore.getState()).toBe(before);
    fireEvent.click(screen.getByRole('button', { name: '계산값을 편집란에 넣기' }));
    expect(screen.getByLabelText('블록 총시간 · 분')).toHaveValue(169 / 60);
    expect(usePilatesStore.getState()).toBe(before);
    fireEvent.click(screen.getByRole('button', { name: '변경 적용' }));
    const after = usePilatesStore.getState();
    expect(onClose).toHaveBeenCalledOnce();
    expect(after.activeSteps[0]).toMatchObject({
      durationMin: 169 / 60,
      repetitions: 4,
      sets: 2,
      sideMode: 'left-then-right',
      explanationSec: 20,
      transitionSec: 10,
      timeEstimate: { version: 1, sides: 2, secondsPerRep: 3 },
    });
    expect(after.undoStack).toHaveLength(1);
    expect(after.exercises).toBe(before.exercises);
    expect(after.historyLogs).toBe(before.historyLogs);
    const exported = cloudBackupDataSchema.parse(JSON.parse(after.exportBackup()).data);
    expect(exported.activeDraft?.steps[0].timeEstimate).toEqual(after.activeSteps[0].timeEstimate);
    const copied = structuredClone(after.activeSteps);
    const persisted = localStorage.getItem(RECOVERY_STORAGE_KEY)!;
    cleanup();
    after.undoSequence();
    expect(usePilatesStore.getState().activeSteps).toEqual(before.activeSteps);
    usePilatesStore.setState({ activeSteps: [] });
    localStorage.setItem(RECOVERY_STORAGE_KEY, persisted);
    await act(async () => {
      await usePilatesStore.persist.rehydrate();
    });
    expect(usePilatesStore.getState().activeSteps).toEqual(copied);
  });
  it('does not apply blank cadence or force extra breath timing', () => {
    const before = usePilatesStore.getState();
    render(<Harness />);
    fireEvent.click(screen.getByText('반복·유지·호흡으로 시간 계산'));
    expect(screen.getByRole('button', { name: '계산값을 편집란에 넣기' })).toBeDisabled();
    change('한 회 움직임 · 초', '10');
    change('세트마다 별도 호흡 · 회', '1');
    expect(screen.getByRole('button', { name: '계산값을 편집란에 넣기' })).toBeDisabled();
    expect(usePilatesStore.getState()).toBe(before);
    change('세트마다 별도 호흡 · 회', '0');
    expect(screen.getByRole('button', { name: '계산값을 편집란에 넣기' })).toBeEnabled();
  });
});
