import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AiSequenceCoPilotPanel } from './AiSequenceCoPilotPanel';
import { usePilatesStore } from '../store/usePilatesStore';
import { SYNTHETIC_APPROVED_EXERCISES } from '../test/planningFixtures';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import type { AutoGenerateCriteria, ClassHistoryLog, SavedSequence } from '../types/pilates';

const original = usePilatesStore.getState();
const criteria: AutoGenerateCriteria = {
  apparatus: 'mat',
  ownedApparatus: ['mat'],
  availableEquipment: ['mat'],
  level: '1.5',
  focusPreset: 'full-body',
  preferredProps: ['none'],
  excludeDaysWindow: 0,
  targetMinutes: 50,
  defaultLayer: 'standard',
};
beforeEach(() => {
  localStorage.clear();
  usePilatesStore.setState(
    {
      ...original,
      exercises: SYNTHETIC_APPROVED_EXERCISES,
      activeSequenceId: 'existing-plan',
      activeTitle: '이전 수업 초안',
      activeSteps: [
        {
          stepId: 'existing-step',
          order: 1,
          exerciseId: SYNTHETIC_APPROVED_EXERCISES[0].id,
          blockCategory: 'warmup',
          durationMin: 5,
          selectedLayer: 'standard',
        },
      ],
      historyLogs: [],
      savedSequences: [],
      undoStack: [],
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

describe('local-only recommendation safety boundary', () => {
  it('has no key entry or external requests, previews without mutation, and explicitly applies with undo', async () => {
    const before = usePilatesStore.getState();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<AiSequenceCoPilotPanel criteria={criteria} selectedEquipment={['mat']} />);
    expect(screen.getByRole('heading', { level: 3, name: '주제별 수업 추천' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: /AI 시퀀스 생성/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Google Gemini API Key')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /외부 AI 생성/ })).not.toBeInTheDocument();
    expect(
      screen.queryByText(/LOCAL PRESETS|무료 전용 서버|API 키를 입력/),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '50분 수업 추천받기' }));
    await screen.findByRole('region', { name: '추천 수업 미리보기' });
    expect(usePilatesStore.getState()).toBe(before);
    expect(fetchSpy).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '새 수업 초안으로 적용' }));
    expect(usePilatesStore.getState().activeSequenceId).toBe('');
    expect(usePilatesStore.getState().activeSteps).not.toEqual(before.activeSteps);
    expect(usePilatesStore.getState().savedSequences).toBe(before.savedSequences);
    expect(usePilatesStore.getState().historyLogs).toBe(before.historyLogs);
    act(() => usePilatesStore.getState().undoSequence());
    expect(usePilatesStore.getState().activeSteps).toEqual(before.activeSteps);
    expect(usePilatesStore.getState().activeTitle).toBe(before.activeTitle);
    expect(usePilatesStore.getState().activeSequenceId).toBe(before.activeSequenceId);
  });

  it.each(['new history', 'history revision', 'saved-sequence revision'] as const)(
    'rejects applying a preview after %s changes, without mutating the current draft',
    async (change) => {
      const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      const recentDate = new Date().toISOString();
      const history: ClassHistoryLog = {
        id: 'existing-history',
        sequenceId: 'past-plan',
        sequenceTitle: '이전 수업',
        groupId: 'group-one',
        groupName: '그룹',
        taughtAt: oldDate,
        apparatus: 'mat',
        level: '1.5',
        exerciseIds: [SYNTHETIC_APPROVED_EXERCISES[0].id],
        rating: 3,
        intensity: 'moderate',
        instructorReflection: '',
      };
      const saved: SavedSequence = {
        id: 'existing-saved',
        title: '이전 저장 수업',
        subtitle: '',
        apparatus: 'mat',
        level: '1.5',
        focusTags: [],
        targetMinutes: 50,
        steps: structuredClone(usePilatesStore.getState().activeSteps),
        createdAt: oldDate,
        updatedAt: oldDate,
        taughtCount: 0,
      };
      usePilatesStore.setState({ historyLogs: [history], savedSequences: [saved] });
      const before = usePilatesStore.getState();
      const onAppliedSequence = vi.fn();
      render(
        <AiSequenceCoPilotPanel
          criteria={{ ...criteria, excludeDaysWindow: 14 }}
          selectedEquipment={['mat']}
          onAppliedSequence={onAppliedSequence}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: '50분 수업 추천받기' }));
      await screen.findByRole('region', { name: '추천 수업 미리보기' });
      const applyButton = screen.getByRole('button', {
        name: '새 수업 초안으로 적용',
      });
      expect(applyButton).toBeEnabled();

      // Apply in the same batch as the store update: the handler must read fresh
      // history, not rely only on a future render disabling its button.
      act(() => {
        if (change === 'saved-sequence revision') {
          usePilatesStore.setState({ savedSequences: [{ ...saved, updatedAt: recentDate }] });
        } else if (change === 'history revision') {
          usePilatesStore.setState({ historyLogs: [{ ...history, taughtAt: recentDate }] });
        } else {
          usePilatesStore.setState({
            historyLogs: [history, { ...history, id: 'new-history', taughtAt: recentDate }],
          });
        }
        fireEvent.click(applyButton);
      });

      expect(applyButton).toBeDisabled();
      expect(screen.getByRole('alert')).toHaveTextContent('이전 수업 이력이 바뀌었습니다');
      const after = usePilatesStore.getState();
      expect(after.activeSequenceId).toBe(before.activeSequenceId);
      expect(after.activeTitle).toBe(before.activeTitle);
      expect(after.activeSteps).toBe(before.activeSteps);
      expect(after.undoStack).toBe(before.undoStack);
      expect(onAppliedSequence).not.toHaveBeenCalled();
    },
  );

  it('blocks stale conditions and reports an insufficient reviewed catalog without replacing a draft', async () => {
    const view = render(<AiSequenceCoPilotPanel criteria={criteria} selectedEquipment={['mat']} />);
    fireEvent.click(screen.getByRole('button', { name: '50분 수업 추천받기' }));
    await screen.findByRole('region', { name: '추천 수업 미리보기' });
    view.rerender(
      <AiSequenceCoPilotPanel
        criteria={{ ...criteria, targetMinutes: 30 }}
        selectedEquipment={['mat']}
      />,
    );
    expect(screen.getByRole('button', { name: '새 수업 초안으로 적용' })).toBeDisabled();
    act(() => usePilatesStore.setState({ exercises: INITIAL_EXERCISES }));
    const before = usePilatesStore.getState();
    fireEvent.click(screen.getByRole('button', { name: '30분 수업 추천받기' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('검토 완료 동작이 4개 이상');
    expect(usePilatesStore.getState()).toBe(before);
    expect(screen.queryByRole('region', { name: '추천 수업 미리보기' })).not.toBeInTheDocument();
  });
});
