import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import {
  INITIAL_CLASS_GROUPS,
  INITIAL_EXERCISES,
  INITIAL_HISTORY_LOGS,
  INITIAL_SAVED_SEQUENCES,
} from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import { SequenceAutoPilotDrawer } from './SequenceAutoPilotDrawer';

const REF_DATE = new Date('2026-11-05T12:00:00.000Z');

const FORBIDDEN_REVIEW_TERMS = [
  '미검토',
  '검토 필요',
  '전문가 검토',
  'SHA-256',
  '출처 원장',
  'Verify AI',
];

describe('SequenceAutoPilotDrawer', () => {
  it('renders nothing when closed and closes on close button or Escape key when open', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <SequenceAutoPilotDrawer
        open={false}
        onClose={onClose}
        steps={INITIAL_SAVED_SEQUENCES[0].steps}
        exercises={INITIAL_EXERCISES}
        historyLogs={INITIAL_HISTORY_LOGS}
        classGroups={INITIAL_CLASS_GROUPS}
        referenceDate={REF_DATE}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rerender(
      <SequenceAutoPilotDrawer
        open
        onClose={onClose}
        steps={INITIAL_SAVED_SEQUENCES[0].steps}
        exercises={INITIAL_EXERCISES}
        historyLogs={INITIAL_HISTORY_LOGS}
        classGroups={INITIAL_CLASS_GROUPS}
        referenceDate={REF_DATE}
      />,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: '시퀀스 자동 도우미 닫기' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('Tab 1: shows freshness score, swaps overlapping steps in 1 tap, displays diff, and supports 1-tap undo', () => {
    const onApplySteps = vi.fn();
    const baseSteps = INITIAL_SAVED_SEQUENCES[0].steps;

    render(
      <SequenceAutoPilotDrawer
        open
        onClose={vi.fn()}
        steps={baseSteps}
        exercises={INITIAL_EXERCISES}
        historyLogs={INITIAL_HISTORY_LOGS}
        classGroups={INITIAL_CLASS_GROUPS}
        activeTargetGroupId="grp-mon-wed-7pm"
        referenceDate={REF_DATE}
        onApplySteps={onApplySteps}
      />,
    );

    const scoreCard = screen.getByTestId('freshness-score-card');
    expect(scoreCard.textContent).toMatch(/\d+%/);

    // 1-tap button to replace overlapping steps
    const swapBtn = screen.getByRole('button', { name: /겹친 \d+개 동작 새 동작으로 바꾸기/ });
    fireEvent.click(swapBtn);

    expect(onApplySteps).toHaveBeenCalledTimes(1);
    const appliedPayload = onApplySteps.mock.calls[0][0];
    expect(appliedPayload.steps.length).toBe(baseSteps.length);
    // Warmup & cooldown stay intact, main steps replaced
    expect(appliedPayload.steps[0].exerciseId).toBe(baseSteps[0].exerciseId);
    expect(appliedPayload.steps[appliedPayload.steps.length - 1].exerciseId).toBe(
      baseSteps[baseSteps.length - 1].exerciseId,
    );

    // Diff section rendered
    expect(screen.getByLabelText('방금 교체된 동작 내역')).toBeInTheDocument();

    // 1-tap undo restores original steps
    fireEvent.click(screen.getByRole('button', { name: /되돌리기/ }));
    expect(onApplySteps).toHaveBeenCalledTimes(2);
    expect(onApplySteps.mock.calls[1][0].steps.map((s: { exerciseId: string }) => s.exerciseId)).toEqual(
      baseSteps.map((s) => s.exerciseId),
    );
  });

  it('Tab 2: searches and picks 1 anchor exercise, auto-builds a 50-min class, and applies it', () => {
    const onApplySteps = vi.fn();

    render(
      <SequenceAutoPilotDrawer
        open
        onClose={vi.fn()}
        initialTab="anchor"
        steps={INITIAL_SAVED_SEQUENCES[0].steps}
        exercises={INITIAL_EXERCISES}
        historyLogs={INITIAL_HISTORY_LOGS}
        classGroups={INITIAL_CLASS_GROUPS}
        activeTargetGroupId="grp-mon-wed-7pm"
        referenceDate={REF_DATE}
        onApplySteps={onApplySteps}
      />,
    );

    const searchInput = screen.getByLabelText('메인 동작 검색');
    fireEvent.change(searchInput, { target: { value: '스쿠터' } });

    const listbox = screen.getByRole('listbox', { name: '동작 목록' });
    const options = within(listbox).getAllByRole('option');
    expect(options.length).toBeGreaterThan(0);

    fireEvent.click(options[0]);
    const buildBtn = screen.getByRole('button', { name: /앞뒤 50분 자동 채우기/ });
    expect(buildBtn).not.toBeDisabled();
    fireEvent.click(buildBtn);

    const preview = screen.getByTestId('anchor-sequence-preview');
    expect(preview).toBeInTheDocument();
    expect(preview.textContent).toContain('핵심');

    fireEvent.click(screen.getByRole('button', { name: /이 수업 바로 적용하기/ }));
    expect(onApplySteps).toHaveBeenCalledTimes(1);
    const applied = onApplySteps.mock.calls[0][0];
    expect(applied.targetMinutes).toBe(50);
    expect(applied.steps.length).toBeGreaterThanOrEqual(6);
  });

  it('Tab 3: forks 1 sequence into 3 levels and builds a conflict-free weekly plan with batch save', () => {
    const onApplySteps = vi.fn();
    const onSaveSequencesBatch = vi.fn();

    render(
      <SequenceAutoPilotDrawer
        open
        onClose={vi.fn()}
        initialTab="scale"
        steps={INITIAL_SAVED_SEQUENCES[0].steps}
        exercises={INITIAL_EXERCISES}
        historyLogs={INITIAL_HISTORY_LOGS}
        classGroups={INITIAL_CLASS_GROUPS}
        activeTitle="리포머 시그니처"
        activeTargetMinutes={50}
        referenceDate={REF_DATE}
        onApplySteps={onApplySteps}
        onSaveSequencesBatch={onSaveSequencesBatch}
      />,
    );

    // 3-level fork
    fireEvent.click(screen.getByRole('button', { name: /3개 반 맞춤 시퀀스 한 번에 만들기/ }));
    const forkList = screen.getByTestId('level-fork-list');
    expect(within(forkList).getAllByRole('listitem')).toHaveLength(3);
    expect(forkList.textContent).toContain('입문');
    expect(forkList.textContent).toContain('중급');
    expect(forkList.textContent).toContain('심화');

    fireEvent.click(screen.getByRole('button', { name: /3개 반 시퀀스 모두 보관함에 저장/ }));
    expect(onSaveSequencesBatch).toHaveBeenCalledTimes(1);
    expect(onSaveSequencesBatch.mock.calls[0][0]).toHaveLength(3);

    // Weekly conflict-free plan
    fireEvent.click(screen.getByRole('button', { name: /이번 주 반별 수업 안 겹치게 자동 배치/ }));
    const weeklyList = screen.getByTestId('weekly-plan-list');
    expect(within(weeklyList).getAllByRole('listitem')).toHaveLength(INITIAL_CLASS_GROUPS.length);

    fireEvent.click(screen.getByRole('button', { name: /주간 초안 \d+개 모두 보관함에 저장/ }));
    expect(onSaveSequencesBatch).toHaveBeenCalledTimes(2);
    expect(onSaveSequencesBatch.mock.calls[1][0]).toHaveLength(INITIAL_CLASS_GROUPS.length);
  });

  it('never exposes forbidden review or verification ledger UI copy in any tab', () => {
    const { container } = render(
      <SequenceAutoPilotDrawer
        open
        onClose={vi.fn()}
        steps={INITIAL_SAVED_SEQUENCES[0].steps}
        exercises={INITIAL_EXERCISES}
        historyLogs={INITIAL_HISTORY_LOGS}
        classGroups={INITIAL_CLASS_GROUPS}
        referenceDate={REF_DATE}
      />,
    );

    const tabs = [
      screen.getByRole('tab', { name: /겹침 없애기/ }),
      screen.getByRole('tab', { name: /1개로 완성/ }),
      screen.getByRole('tab', { name: /3반·주간 배치/ }),
    ];

    for (const tab of tabs) {
      fireEvent.click(tab);
      const text = container.textContent ?? '';
      for (const forbidden of FORBIDDEN_REVIEW_TERMS) {
        expect(text).not.toContain(forbidden);
      }
    }
  });

  it('supports single-step replacement chip directly against usePilatesStore with undo stack recording', () => {
    const seedSteps = INITIAL_SAVED_SEQUENCES[0].steps.map((s) => ({ ...s }));
    usePilatesStore.setState({
      activeSteps: seedSteps,
      exercises: INITIAL_EXERCISES,
      historyLogs: INITIAL_HISTORY_LOGS,
      classGroups: INITIAL_CLASS_GROUPS,
      activeTargetGroupId: 'grp-mon-wed-7pm',
      undoStack: [],
    });

    render(
      <SequenceAutoPilotDrawer
        open
        onClose={vi.fn()}
        activeTargetGroupId="grp-mon-wed-7pm"
        referenceDate={REF_DATE}
      />,
    );

    // Click the first per-step replacement chip
    const swapChips = screen.getAllByRole('button', { name: /으로 교체/ });
    expect(swapChips.length).toBeGreaterThan(0);
    fireEvent.click(swapChips[0]);

    const afterStore = usePilatesStore.getState();
    expect(afterStore.undoStack.length).toBe(1);
    expect(afterStore.activeSteps.map((s) => s.exerciseId)).not.toEqual(
      seedSteps.map((s) => s.exerciseId),
    );
  });
});
