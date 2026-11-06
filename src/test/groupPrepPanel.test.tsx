import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GroupPrepPanel } from '../components/GroupPrepPanel';
import { usePilatesStore } from '../store/usePilatesStore';

const original = usePilatesStore.getState();
const group = {
  id: 'qa-prep-group',
  name: '저녁 A반',
  type: 'group' as const,
  defaultLevel: '1.0' as const,
  scheduleLabel: '화·목',
  notes: '호흡 큐 간결하게',
};
beforeEach(() => {
  usePilatesStore.setState({
    ...original,
    classGroups: [group],
    historyLogs: [],
    activeTargetGroupId: group.id,
    draftCriteria: {
      apparatus: 'mat',
      availableEquipment: ['mat'],
      ownedApparatus: ['mat'],
      level: '1.5',
      focusPreset: 'full-body',
      targetMinutes: 50,
      defaultLayer: 'standard',
      preferredProps: ['none'],
      excludeDaysWindow: 14,
      targetGroupId: group.id,
    },
  });
});
afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
});

describe('instructor target preparation panel', () => {
  it('shows the actual empty history and requires an explicit default-level action', () => {
    render(<GroupPrepPanel groupId={group.id} />);
    expect(screen.getByRole('button', { name: /최근 수업 조건 가져오기/ })).toBeDisabled();
    expect(usePilatesStore.getState().draftCriteria?.level).toBe('1.5');
    const draft = usePilatesStore.getState().activeSteps;
    fireEvent.click(screen.getByRole('button', { name: '기본 난이도 적용' }));
    expect(usePilatesStore.getState().draftCriteria?.level).toBe('1.0');
    expect(usePilatesStore.getState().activeSteps).toBe(draft);
    expect(screen.getByText(/수업을 마친 뒤 회고를 남기면/)).toBeInTheDocument();
  });
  it('edits a target alias and schedule through the actual form without auto-generating a class', () => {
    render(<GroupPrepPanel groupId={group.id} />);
    fireEvent.click(screen.getByRole('button', { name: '대상 정보 편집' }));
    const dialog = within(screen.getByRole('dialog', { name: '대상 정보 편집' }));
    fireEvent.change(dialog.getByLabelText('대상 별칭'), { target: { value: '  저녁 B반  ' } });
    fireEvent.change(dialog.getByLabelText('반 일정'), { target: { value: '수·금 저녁' } });
    fireEvent.click(dialog.getByRole('button', { name: '대상 정보 저장' }));
    expect(usePilatesStore.getState().classGroups[0]).toMatchObject({
      id: group.id,
      name: '저녁 B반',
      scheduleLabel: '수·금 저녁',
    });
    expect(screen.getByRole('heading', { name: '저녁 B반' })).toBeInTheDocument();
    expect(usePilatesStore.getState().activeSteps).toEqual(original.activeSteps);
    expect(usePilatesStore.getState().historyLogs).toHaveLength(0);
  });
});
