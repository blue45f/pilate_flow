import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GroupPrepPanel } from '../components/GroupPrepPanel';
import { usePilatesStore } from '../store/usePilatesStore';

const original = usePilatesStore.getState();
const group = {
  id: 'personal-preferences-ui',
  name: '별칭 A반',
  type: 'group' as const,
  defaultLevel: '1.5' as const,
  scheduleLabel: '',
  notes: '',
};
beforeEach(() =>
  usePilatesStore.setState({
    ...original,
    classGroups: [group],
    historyLogs: [],
    ownedEquipment: ['mat'],
    ownedProps: [],
    activeTargetGroupId: group.id,
    draftCriteria: {
      apparatus: 'mat',
      availableEquipment: ['mat'],
      ownedApparatus: ['mat'],
      level: '1.5',
      focusPreset: 'full-body',
      targetMinutes: 60,
      restMinutes: 5,
      preferredProps: ['none'],
      defaultLayer: 'standard',
      excludeDaysWindow: 10,
      targetGroupId: group.id,
      instructorObservations: ['anterior-pelvic-tilt'],
    },
  }),
);
afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
});

describe('explicit group planning preferences', () => {
  it('saves broad age and mixed experience without selecting difficulty or generating blocks', () => {
    render(<GroupPrepPanel groupId={group.id} />);
    const initial = usePilatesStore.getState();
    fireEvent.click(screen.getByRole('button', { name: '대상 정보 편집' }));
    const dialog = within(screen.getByRole('dialog', { name: '대상 정보 편집' }));
    fireEvent.change(dialog.getByLabelText('반의 넓은 연령대 · 선택'), {
      target: { value: '60-plus' },
    });
    fireEvent.change(dialog.getByLabelText('수업 경험 · 선택'), { target: { value: 'mixed' } });
    fireEvent.change(dialog.getByLabelText('혼합 수준 준비 메모 · 선택'), {
      target: { value: '쉬운 대안을 함께 준비' },
    });
    fireEvent.click(dialog.getByRole('button', { name: '대상 정보 저장' }));
    const current = usePilatesStore.getState();
    expect(current.classGroups[0].planningPreferences).toMatchObject({
      ageBand: '60-plus',
      experience: 'mixed',
    });
    expect(current.classGroups[0].defaultLevel).toBe('1.5');
    expect(current.draftCriteria).toEqual(initial.draftCriteria);
    expect(current.activeSteps).toBe(initial.activeSteps);
    expect(current.historyLogs).toEqual([]);
  });
  it('saves and reapplies only explicit owned conditions while retaining blocks and private observations boundary', () => {
    render(<GroupPrepPanel groupId={group.id} />);
    fireEvent.click(screen.getByText('반별 저장 조건·대상 메모'));
    fireEvent.click(screen.getByRole('button', { name: '현재 조건을 이 반에 저장' }));
    const saved = usePilatesStore.getState();
    expect(saved.classGroups[0].planningPreferences?.conditions).toMatchObject({
      targetMinutes: 60,
      restMinutes: 5,
    });
    expect(saved.classGroups[0].planningPreferences?.conditions).not.toHaveProperty(
      'instructorObservations',
    );
    const beforeSteps = saved.activeSteps;
    act(() =>
      usePilatesStore.setState({
        draftCriteria: { ...saved.draftCriteria!, targetMinutes: 50, restMinutes: 0 },
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: '이 반의 저장 조건 불러오기' }));
    expect(usePilatesStore.getState().draftCriteria).toMatchObject({
      targetMinutes: 60,
      restMinutes: 5,
      targetGroupId: group.id,
    });
    expect(usePilatesStore.getState().activeSteps).toBe(beforeSteps);
  });
  it('does not overwrite newer hidden saved conditions when an open profile editor saves its visible fields', () => {
    render(<GroupPrepPanel groupId={group.id} />);
    act(() => {
      expect(usePilatesStore.getState().saveCurrentConditionsToGroup(group.id).success).toBe(true);
    });
    fireEvent.click(screen.getByRole('button', { name: '대상 정보 편집' }));
    const dialog = within(screen.getByRole('dialog', { name: '대상 정보 편집' }));
    fireEvent.change(dialog.getByLabelText('대상 별칭'), { target: { value: '새 별칭 A반' } });
    const state = usePilatesStore.getState();
    act(() =>
      usePilatesStore.setState({
        draftCriteria: { ...state.draftCriteria!, targetMinutes: 75, restMinutes: 10 },
      }),
    );
    act(() => {
      expect(usePilatesStore.getState().saveCurrentConditionsToGroup(group.id).success).toBe(true);
    });
    fireEvent.click(dialog.getByRole('button', { name: '대상 정보 저장' }));
    expect(usePilatesStore.getState().classGroups[0]).toMatchObject({
      name: '새 별칭 A반',
      planningPreferences: { conditions: { targetMinutes: 75, restMinutes: 10 } },
    });
  });
});
