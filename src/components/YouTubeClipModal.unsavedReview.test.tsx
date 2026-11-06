import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import {
  exerciseRevision,
  getExerciseReviewState,
  isExerciseAutoEligible,
} from '../utils/exerciseReview';
import { YouTubePreviewModal } from './YouTubeClipModal';

vi.mock('./MotionReferencePlayer', () => ({
  MotionReferencePlayer: () => null,
}));

const initial = usePilatesStore.getState();
const canonical = structuredClone(INITIAL_EXERCISES);
const synthetic = syntheticPlanningExercise('mat', 'core');
const alias = '이번 창의 합성 입력자 · 전문 자격 아님';
const cueLabel = '티칭 큐 · 줄마다 하나 · 직접 작성';
const durationLabel = '기본 계획 시간 · 분 · 양쪽 포함';
const approveLabel = '수정 내용을 저장하고 내 강사 검토로 승인';
const dirtyLabel = '수정 내용 저장 후 추가 가능';
const region = () => within(screen.getByRole('region', { name: '내 강사 검토' }));
const consent = () => region().getByRole('checkbox', { name: /이 동작의 위 모든 조건/ });
const current = () => usePilatesStore.getState().exercises.find((e) => e.id === synthetic.id)!;
const openEditor = () => {
  const editor = region().getByText('검토 전 메모 수정 · 근거 미확인 입력값').closest('details')!;
  editor.open = true;
  fireEvent(editor, new Event('toggle'));
};
const change = (label: string, value: string) =>
  fireEvent.change(region().getByLabelText(label), { target: { value } });

beforeEach(() => {
  usePilatesStore.setState(
    {
      ...initial,
      exercises: [...INITIAL_EXERCISES, structuredClone(synthetic)],
      activeSteps: [],
      historyLogs: [],
      savedSequences: [],
      generationError: null,
    },
    true,
  );
});
afterEach(() => {
  cleanup();
  expect(INITIAL_EXERCISES).toEqual(canonical);
  expect(INITIAL_EXERCISES).toHaveLength(98);
  expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
  expect(
    usePilatesStore.getState().exercises.filter((e) => canonical.some((c) => c.id === e.id)),
  ).toEqual(canonical);
  usePilatesStore.setState(initial, true);
  vi.restoreAllMocks();
});

describe('unsaved metadata and the version added to a lesson', () => {
  it('keeps visible unsaved edits from silently adding the old reviewed version', () => {
    const add = vi.fn(() => ({ success: true }));
    const close = vi.fn();
    render(<YouTubePreviewModal exercise={current()} onClose={close} onAddToSequence={add} />);
    openEditor();
    change('검토한 강사 별칭', alias);
    fireEvent.click(consent());
    change(cueLabel, '아직 저장하지 않은 합성 큐 · 운동 지시 아님');

    const addButton = screen.getByRole('button', {
      name: /수업안에 추가|수정 내용 저장 후 추가 가능/,
    });
    expect(addButton).toBeDisabled();
    expect(addButton).toHaveAccessibleName(dirtyLabel);
    expect(screen.getByText(/저장하지 않은 수정 내용이 있어요/)).toBeVisible();
    expect(consent()).not.toBeChecked();
    expect(region().getByLabelText('검토한 강사 별칭')).toHaveValue(alias);
    expect(region().getByLabelText(cueLabel)).toHaveValue(
      '아직 저장하지 않은 합성 큐 · 운동 지시 아님',
    );
    expect(current()).toEqual(synthetic);
    expect(getExerciseReviewState(current())).toBe('approved');
    fireEvent.click(addButton);
    expect(add).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
    expect(usePilatesStore.getState().activeSteps).toEqual([]);
  });

  it('clears only material dirtiness when an edit is reverted and never blocks an alias-only change', () => {
    const add = vi.fn(() => ({ success: true }));
    const close = vi.fn();
    render(<YouTubePreviewModal exercise={current()} onClose={close} onAddToSequence={add} />);
    change('검토한 강사 별칭', alias);
    expect(screen.getByRole('button', { name: '수업안에 추가' })).toBeEnabled();
    openEditor();
    change(durationLabel, '7');
    expect(
      screen.getByRole('button', {
        name: /수업안에 추가|수정 내용 저장 후 추가 가능/,
      }),
    ).toBeDisabled();
    change(durationLabel, String(synthetic.defaultDurationMin));
    expect(screen.queryByText(/저장하지 않은 수정 내용이 있어요/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '수업안에 추가' })).toBeEnabled();
    expect(consent()).not.toBeChecked();
    expect(current()).toEqual(synthetic);
    fireEvent.click(screen.getByRole('button', { name: '수업안에 추가' }));
    expect(add).toHaveBeenCalledExactlyOnceWith(synthetic.id);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('uses explicit memo-save and full review before adding the changed version', () => {
    const add = vi.fn(() => ({ success: true }));
    const close = vi.fn();
    render(<YouTubePreviewModal exercise={current()} onClose={close} onAddToSequence={add} />);
    openEditor();
    change('검토한 강사 별칭', alias);
    change(cueLabel, '저장할 합성 수정 큐 · 실제 운동 지시 아님');
    expect(
      screen.getByRole('button', {
        name: /수업안에 추가|수정 내용 저장 후 추가 가능/,
      }),
    ).toBeDisabled();
    fireEvent.click(region().getByRole('button', { name: '수정 메모만 저장' }));

    expect(current().cues).toEqual(['저장할 합성 수정 큐 · 실제 운동 지시 아님']);
    expect(current().review).toEqual(synthetic.review);
    expect(getExerciseReviewState(current())).toBe('stale');
    expect(screen.getByRole('button', { name: '강사 검토 후 추가 가능' })).toBeDisabled();
    expect(region().getByLabelText('검토한 강사 별칭')).toHaveValue(alias);
    expect(consent()).not.toBeChecked();
    expect(add).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();

    fireEvent.click(consent());
    fireEvent.click(region().getByRole('button', { name: approveLabel }));
    expect(current().review).toMatchObject({
      status: 'approved',
      scope: 'planning-metadata',
      credentialVerified: false,
      reviewerAlias: alias,
      revision: exerciseRevision(current()),
    });
    expect(consent()).not.toBeChecked();
    expect(screen.getByRole('button', { name: '수업안에 추가' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '수업안에 추가' }));
    expect(add).toHaveBeenCalledExactlyOnceWith(synthetic.id);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('retains an invalid unsaved source after save failure without adding or reusing approval', () => {
    const add = vi.fn(() => ({ success: true }));
    const close = vi.fn();
    render(<YouTubePreviewModal exercise={current()} onClose={close} onAddToSequence={add} />);
    openEditor();
    change('검토한 강사 별칭', alias);
    change('원본 영상 URL · 없으면 비워 두기', 'https://example.com/invalid-reference');
    expect(
      screen.getByRole('button', {
        name: /수업안에 추가|수정 내용 저장 후 추가 가능/,
      }),
    ).toBeDisabled();
    fireEvent.click(region().getByRole('button', { name: '수정 메모만 저장' }));
    expect(region().getByRole('alert')).toHaveTextContent('유효한 YouTube 영상 주소');
    expect(region().getByLabelText('원본 영상 URL · 없으면 비워 두기')).toHaveValue(
      'https://example.com/invalid-reference',
    );
    expect(region().getByLabelText('검토한 강사 별칭')).toHaveValue(alias);
    expect(screen.getByRole('button', { name: dirtyLabel })).toBeDisabled();
    expect(current()).toEqual(synthetic);
    expect(add).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });

  it('prioritizes unsaved changes over the existing-movement instruction to close the detail', () => {
    usePilatesStore.setState({
      activeSteps: [
        {
          stepId: 'v12-existing-synthetic',
          order: 1,
          exerciseId: synthetic.id,
          blockCategory: 'core',
          durationMin: synthetic.defaultDurationMin,
          selectedLayer: 'standard',
        },
      ],
    });
    const add = vi.fn();
    const close = vi.fn();
    render(<YouTubePreviewModal exercise={current()} onClose={close} onAddToSequence={add} />);
    expect(screen.getByRole('button', { name: '수업안에 추가됨' })).toBeDisabled();
    openEditor();
    change(durationLabel, '6');
    expect(screen.getByRole('button', { name: dirtyLabel })).toBeDisabled();
    expect(screen.queryByText(/창을 닫고 수업 구성을 이어가세요/)).not.toBeInTheDocument();
    expect(screen.getByText(/저장하지 않은 수정 내용이 있어요/)).toBeVisible();
    expect(current()).toEqual(synthetic);
    expect(usePilatesStore.getState().activeSteps[0].durationMin).toBe(
      synthetic.defaultDurationMin,
    );
    expect(add).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });

  it('compares edits with the displayed initial draft when an imported note omits optional equipment metadata', () => {
    const imported = structuredClone(synthetic);
    delete imported.requiredEquipment;
    imported.review = { ...imported.review!, revision: exerciseRevision(imported) };
    usePilatesStore.setState({ exercises: [...INITIAL_EXERCISES, imported] });
    render(<YouTubePreviewModal exercise={imported} onClose={vi.fn()} onAddToSequence={vi.fn()} />);
    openEditor();
    expect(screen.getByRole('button', { name: '수업안에 추가' })).toBeEnabled();
    change(durationLabel, '7');
    expect(
      screen.getByRole('button', { name: /수업안에 추가|수정 내용 저장 후 추가 가능/ }),
    ).toBeDisabled();
    change(durationLabel, String(imported.defaultDurationMin));
    expect(screen.getByRole('button', { name: '수업안에 추가' })).toBeEnabled();
    expect(screen.queryByText(/저장하지 않은 수정 내용이 있어요/)).not.toBeInTheDocument();
    expect(current()).toEqual(imported);
    expect(getExerciseReviewState(current())).toBe('approved');
  });

  it('allows an explicit complete review to save changed metadata directly without a separate memo-save', () => {
    const add = vi.fn(() => ({ success: true }));
    const close = vi.fn();
    render(<YouTubePreviewModal exercise={current()} onClose={close} onAddToSequence={add} />);
    openEditor();
    change(durationLabel, '7');
    expect(
      screen.getByRole('button', { name: /수업안에 추가|수정 내용 저장 후 추가 가능/ }),
    ).toBeDisabled();
    change('검토한 강사 별칭', alias);
    fireEvent.click(consent());
    fireEvent.click(region().getByRole('button', { name: approveLabel }));
    expect(current().defaultDurationMin).toBe(7);
    expect(getExerciseReviewState(current())).toBe('approved');
    expect(current().review).toMatchObject({
      reviewerAlias: alias,
      scope: 'planning-metadata',
      credentialVerified: false,
      revision: exerciseRevision(current()),
    });
    expect(consent()).not.toBeChecked();
    expect(screen.queryByText(/저장하지 않은 수정 내용이 있어요/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '수업안에 추가' }));
    expect(add).toHaveBeenCalledExactlyOnceWith(synthetic.id);
    expect(close).toHaveBeenCalledTimes(1);
  });
});
