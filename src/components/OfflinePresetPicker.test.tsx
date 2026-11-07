import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OfflinePresetPicker } from './OfflinePresetPicker';
import { usePilatesStore } from '../store/usePilatesStore';
import { OFFLINE_CLASS_PRESETS } from '../data/classBlockPresets';
const original = usePilatesStore.getState();
beforeEach(() => usePilatesStore.setState({ ...original, activeSteps: [], undoStack: [] }, true));
afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
});
describe('offline preset picker', () => {
  it('browses without mutation, filters, and explicitly applies an editable class', () => {
    const onApplied = vi.fn();
    render(<OfflinePresetPicker onApplied={onApplied} />);
    const before = usePilatesStore.getState();
    fireEvent.change(screen.getByLabelText('프리셋 기구'), { target: { value: 'mat' } });
    fireEvent.change(screen.getByLabelText('프리셋 계획 시간'), { target: { value: '15' } });
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(OFFLINE_CLASS_PRESETS[0].title) }),
    );
    expect(usePilatesStore.getState()).toBe(before);
    expect(screen.getByRole('region', { name: '선택한 프리셋 확인' })).toHaveTextContent(
      '계획 15:00',
    );
    fireEvent.click(screen.getByRole('button', { name: '복사해서 편집' }));
    expect(onApplied).toHaveBeenCalledOnce();
    expect(usePilatesStore.getState().activeSteps.length).toBeGreaterThan(0);
    expect(usePilatesStore.getState().exercises).toBe(before.exercises);
  });
  it('shows a stale selection and requires reselecting after a newer draft edit', () => {
    const { rerender } = render(<OfflinePresetPicker onApplied={vi.fn()} />);
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(OFFLINE_CLASS_PRESETS[0].title) }),
    );
    act(() => usePilatesStore.setState({ activeTitle: 'New title' }));
    rerender(<OfflinePresetPicker onApplied={vi.fn()} />);
    expect(screen.getByRole('button', { name: '복사해서 편집' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('다시 선택');
  });
  it('defaults to append for an existing draft and requires a deliberate replace checkbox', () => {
    usePilatesStore.setState({ activeSteps: [...structuredClone(OFFLINE_CLASS_PRESETS[0].steps)] });
    render(<OfflinePresetPicker onApplied={vi.fn()} />);
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(OFFLINE_CLASS_PRESETS[1].title) }),
    );
    expect(screen.getByLabelText('현재 수업에 적용하는 방법')).toHaveValue('append');
    fireEvent.change(screen.getByLabelText('현재 수업에 적용하는 방법'), {
      target: { value: 'replace' },
    });
    const region = screen.getByRole('region', { name: '선택한 프리셋 확인' });
    expect(within(region).getByRole('button', { name: '복사해서 편집' })).toBeDisabled();
    fireEvent.click(within(region).getByRole('checkbox'));
    expect(within(region).getByRole('button', { name: '복사해서 편집' })).toBeEnabled();
  });
  it('previews and applies a saved ReusableBlock from the reusable blocks tab with normalized selectedLayer', async () => {
    const { resetMovementIdeaStateForTests, saveIdeaToReusableBlock } = await import(
      '../utils/movementIdeaDraft'
    );
    resetMovementIdeaStateForTests();
    const firstEx = usePilatesStore.getState().exercises[0]!;
    const created = saveIdeaToReusableBlock({
      exerciseId: firstEx.id,
      blockTitle: '테스트 전용 코어 재사용 블록',
      durationMin: 4,
    });
    expect(created.ok).toBe(true);
    const onApplied = vi.fn();
    render(<OfflinePresetPicker onApplied={onApplied} />);
    fireEvent.click(screen.getByRole('button', { name: /내 재사용 블록/ }));
    fireEvent.click(screen.getByRole('button', { name: /테스트 전용 코어 재사용 블록/ }));
    expect(screen.getByRole('region', { name: '선택한 프리셋 확인' })).toHaveTextContent(
      '테스트 전용 코어 재사용 블록',
    );
    fireEvent.click(screen.getByRole('button', { name: '현재 수업 뒤에 추가' }));
    expect(onApplied).toHaveBeenCalledOnce();
    const activeSteps = usePilatesStore.getState().activeSteps;
    expect(activeSteps).toHaveLength(1);
    expect(activeSteps[0]?.selectedLayer).toBe('standard');
    resetMovementIdeaStateForTests();
  });
});

