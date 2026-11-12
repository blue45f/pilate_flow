import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import type { SequenceStep } from '../types/pilates';
import { exerciseRevision, isExerciseAutoEligible } from '../utils/exerciseReview';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import { SequencePlanPreview } from './SequencePlanPreview';

vi.mock('./MotionReferencePlayer', () => ({
  MotionReferencePlayer: ({ exerciseId, active }: { exerciseId?: string; active?: boolean }) => (
    <div data-testid="preview-motion" data-exercise-id={exerciseId} data-active={String(active)} />
  ),
}));

const original = usePilatesStore.getState();
const pending = syntheticPlanningExercise('mat', 'warmup', 'alpha', false);
const approved = syntheticPlanningExercise('chair', 'cooldown');
const steps: SequenceStep[] = [
  {
    stepId: 'preview-first',
    order: 7,
    blockCategory: 'warmup',
    exerciseId: pending.id,
    durationMin: 4,
    selectedLayer: 'standard',
    repetitions: 12,
    sideMode: 'left-then-right',
    instructorNote: '노출하면 안 되는 검토 전 단계 메모',
  },
  {
    stepId: 'preview-rest',
    order: 2,
    kind: 'rest',
    blockCategory: 'core',
    exerciseId: '',
    durationMin: 2,
    selectedLayer: 'standard',
    instructorNote: '휴식에 노출하면 안 되는 메모',
  },
  {
    stepId: 'preview-last',
    order: 1,
    blockCategory: 'cooldown',
    exerciseId: approved.id,
    durationMin: 5,
    selectedLayer: 'standard',
  },
];

beforeEach(() => {
  usePilatesStore.setState({
    ...original,
    activeTitle: '합성 계획 미리보기',
    activeSteps: steps,
    exercises: [pending, approved],
  });
});
afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
  vi.restoreAllMocks();
});

describe('read-only whole class plan preview', () => {
  it('uses actual array order and time, keeps repetitions separate, and navigates manually without exposing pending cues or rest assets', () => {
    const before = usePilatesStore.getState();
    render(<SequencePlanPreview onClose={vi.fn()} />);
    const dialog = within(screen.getByRole('dialog', { name: '전체 수업 계획 미리보기' }));
    expect(dialog.getByText('계획 미리보기 · 모션 시범 미완료')).toBeInTheDocument();
    expect(dialog.getByLabelText('미리보기 시간 구성')).toHaveTextContent(
      '전체11:00동작·설명·전환09:00휴식02:00',
    );
    const order = within(dialog.getByRole('region', { name: '전체 수업 순서' }));
    const rows = order.getAllByRole('button');
    expect(rows.map((row) => row.getAttribute('aria-label'))).toEqual([
      `1번 ${pending.nameKo} 계획 보기`,
      '2번 휴식 계획 보기',
      `3번 ${approved.nameKo} 계획 보기`,
    ]);
    expect(rows[0]).toHaveTextContent('매트');
    expect(rows[0]).toHaveTextContent('왼쪽 → 오른쪽 · 강사가 정한 횟수 12회');
    expect(rows[0]).toHaveTextContent('04:00');
    expect(dialog.getByRole('button', { name: '이전 항목' })).toBeDisabled();
    expect(dialog.getByTestId('preview-motion')).toHaveAttribute('data-exercise-id', pending.id);
    expect(dialog.getByTestId('preview-motion')).toHaveAttribute('data-active', 'true');
    expect(dialog.queryByText(pending.cues[0])).not.toBeInTheDocument();
    expect(dialog.queryByText(steps[0].instructorNote!)).not.toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: '다음 항목' }));
    const rest = within(dialog.getByRole('region', { name: '선택한 계획 항목' }));
    expect(rest.getByRole('heading', { name: '중간 휴식' })).toBeInTheDocument();
    expect(rest.queryByTestId('preview-motion')).not.toBeInTheDocument();
    expect(rest.queryByText(/매트|체어|티칭|횟수/)).not.toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: '다음 항목' }));
    expect(dialog.getByTestId('preview-motion')).toHaveAttribute('data-exercise-id', approved.id);
    expect(dialog.getByText(approved.cues[0])).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: '다음 항목' })).toBeDisabled();
    fireEvent.click(rows[0]);
    expect(dialog.getByRole('status')).toHaveTextContent('현재 항목 1 / 3 · 수동 확인');
    const after = usePilatesStore.getState();
    expect(after.activeSteps).toBe(before.activeSteps);
    expect(after.exercises).toBe(before.exercises);
    expect(after.draftCriteria).toBe(before.draftCriteria);
    expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
  });

  it('keeps pending teaching notes out of an explicitly opened visual cue sheet while showing current reviewed notes', () => {
    const pendingNote = {
      ...pending,
      cues: ['검토 전 고유 큐 · 표시 금지'],
      breathPattern: '검토 전 고유 호흡 · 표시 금지',
    };
    const reviewedNote = { ...approved, cues: ['개인 검토 완료 고유 큐'] };
    reviewedNote.review = {
      ...approved.review!,
      revision: exerciseRevision(reviewedNote),
    };
    usePilatesStore.setState({ exercises: [pendingNote, reviewedNote] });
    const before = usePilatesStore.getState();
    render(<SequencePlanPreview onClose={vi.fn()} />);
    expect(screen.queryByTestId('one-page-visual-3d-cuesheet')).not.toBeInTheDocument();
    const drawer = screen.getByTestId(
      'plan-preview-visual-3d-cuesheet-drawer',
    ) as HTMLDetailsElement;
    drawer.open = true;
    fireEvent(drawer, new Event('toggle'));
    const sheet = within(screen.getByTestId('one-page-visual-3d-cuesheet'));
    expect(sheet.queryByText(pendingNote.cues[0])).not.toBeInTheDocument();
    expect(sheet.queryByText(pendingNote.breathPattern)).not.toBeInTheDocument();
    expect(sheet.queryByText(steps[0].instructorNote!)).not.toBeInTheDocument();
    expect(sheet.queryByText(steps[1].instructorNote!)).not.toBeInTheDocument();
    expect(sheet.getByText(reviewedNote.cues[0])).toBeVisible();
    expect(sheet.getByRole('button', { name: /1페이지 큐시트 인쇄/ })).toBeEnabled();
    expect(usePilatesStore.getState()).toBe(before);
  });

  it('enables independent motion inspection only while the timeline and segment rehearsal are paused', () => {
    const approvedStep: SequenceStep = {
      ...steps[2],
      durationMin: 10,
      explanationSec: 0,
      transitionSec: 0,
    };
    usePilatesStore.setState({
      activeSteps: [approvedStep],
      exercises: [approved],
      activeTargetMinutes: 10,
    });
    const before = usePilatesStore.getState();
    render(<SequencePlanPreview onClose={vi.fn()} />);
    const player = () => screen.getByTestId('preview-motion');
    expect(player()).toHaveAttribute('data-active', 'true');
    expect(
      screen.getByText('도식은 시간표와 별도로 재생하며 실제 수행 시간·횟수를 뜻하지 않습니다.'),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '시간표 리허설 시작' }));
    expect(player()).toHaveAttribute('data-active', 'false');
    fireEvent.click(screen.getByRole('button', { name: '시간표 리허설 일시정지' }));
    expect(player()).toHaveAttribute('data-active', 'true');
    fireEvent.click(screen.getByRole('button', { name: '선택한 항목 반복 연습' }));
    expect(player()).toHaveAttribute('data-active', 'false');
    fireEvent.click(screen.getByRole('button', { name: '전체 시간표로 돌아가기' }));
    expect(player()).toHaveAttribute('data-active', 'true');
    expect(usePilatesStore.getState()).toBe(before);
  });

  it('keeps an independent opened snapshot if the underlying plan changes', () => {
    const { rerender } = render(<SequencePlanPreview onClose={vi.fn()} />);
    act(() => {
      usePilatesStore.setState({
        activeSteps: [{ ...steps[0], durationMin: 19, repetitions: 77 }],
        exercises: [{ ...pending, nameKo: '변경된 합성 이름' }],
      });
    });
    rerender(<SequencePlanPreview onClose={vi.fn()} />);
    expect(screen.getByLabelText('미리보기 시간 구성')).toHaveTextContent('전체11:00');
    expect(screen.getByRole('status')).toHaveTextContent('현재 항목 1 / 3');
    expect(screen.queryByText('변경된 합성 이름')).not.toBeInTheDocument();
    expect(screen.queryByText(/77회/)).not.toBeInTheDocument();
    expect(screen.getAllByText(/강사가 정한 횟수 12회/)).toHaveLength(2);
    expect(usePilatesStore.getState().activeSteps[0].durationMin).toBe(19);
  });

  it('does not assume a default side when an exercise record is missing', () => {
    usePilatesStore.setState({
      activeSteps: [{ ...steps[0], exerciseId: 'qa-missing-exercise', sideMode: undefined }],
      exercises: [],
    });
    render(<SequencePlanPreview onClose={vi.fn()} />);
    const selected = within(screen.getByRole('region', { name: '선택한 계획 항목' }));
    expect(selected.getByRole('heading', { name: '동작 정보 없음' })).toBeInTheDocument();
    expect(selected.getByText('좌우 정보 없음 · 강사가 정한 횟수 12회')).toBeInTheDocument();
    expect(selected.getByTestId('preview-motion')).toHaveAttribute(
      'data-exercise-id',
      'qa-missing-exercise',
    );
    expect(selected.queryByText(/^함께/)).not.toBeInTheDocument();
    expect(
      selected.queryByRole('region', { name: '내 강사 검토 티칭 메모' }),
    ).not.toBeInTheDocument();
  });

  it('closes the native dialog first and calls back once under StrictMode and the no-event polyfill, restoring opener focus', () => {
    const opener = document.createElement('button');
    opener.textContent = '합성 미리보기 열기';
    document.body.append(opener);
    opener.focus();
    const onClose = vi.fn(() => {
      expect(document.querySelector('dialog')).not.toHaveAttribute('open');
    });
    const { unmount } = render(
      <StrictMode>
        <SequencePlanPreview onClose={onClose} />
      </StrictMode>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('open');
    fireEvent(dialog, new Event('close'));
    expect(onClose).not.toHaveBeenCalled();
    expect(dialog).toHaveAttribute('open');
    fireEvent.click(screen.getByRole('button', { name: '계획 미리보기 닫기' }));
    expect(dialog).not.toHaveAttribute('open');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(opener).toHaveFocus();
    fireEvent(dialog, new Event('close'));
    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();
    opener.remove();
  });

  it('shows an honest empty state and handles Escape through the native cancel event', () => {
    usePilatesStore.setState({ activeSteps: [] });
    const onClose = vi.fn();
    render(<SequencePlanPreview onClose={onClose} />);
    const dialog = screen.getByRole('dialog');
    expect(screen.getByText('미리볼 수업 항목이 없어요')).toBeInTheDocument();
    expect(screen.queryByTestId('preview-motion')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '다음 항목' })).not.toBeInTheDocument();
    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(dialog).not.toHaveAttribute('open');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(usePilatesStore.getState().activeSteps).toHaveLength(0);
  });
});

it('keeps optional class summary on the frozen preview snapshot when the live draft changes', async () => {
  usePilatesStore.setState({ activeTargetMinutes: 11 });
  const before = usePilatesStore.getState();
  const { container } = render(<SequencePlanPreview onClose={vi.fn()} />);
  expect(screen.queryByRole('region', { name: '수업안 편성 요약' })).not.toBeInTheDocument();
  const disclosure = container.querySelector<HTMLDetailsElement>('.class-plan-summary')!;
  disclosure.open = true;
  fireEvent(disclosure, new Event('toggle'));
  const summary = await screen.findByRole('region', { name: '수업안 편성 요약' });
  expect(within(summary).getByText(/목표 수업 시간\(11분\)/)).toBeInTheDocument();
  expect(usePilatesStore.getState()).toBe(before);
  act(() => usePilatesStore.setState({ activeTargetMinutes: 50 }));
  expect(within(summary).getByText(/목표 수업 시간\(11분\)/)).toBeInTheDocument();
  expect(within(summary).queryByText(/목표\(50분\)/)).not.toBeInTheDocument();
});
