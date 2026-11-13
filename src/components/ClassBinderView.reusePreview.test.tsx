import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClassBinderView } from './ClassBinderView';
import { createSequenceSnapshot, usePilatesStore } from '../store/usePilatesStore';
import { revisionExercise, revisionSource } from '../test/datedRevisionFixtures';
import type { ClassHistoryLog } from '../types/pilates';

const original = usePilatesStore.getState();
const sourceId = 'reusable-source';
const sourceTitle = '다시 쓰는 매트 수업';
const groupName = '합성 저녁 A반';

function sourceCard() {
  return within(screen.getByRole('heading', { name: sourceTitle }).closest('article')!);
}

function getPreview() {
  return screen.getByRole('dialog', { name: '저장 수업 미리보기' });
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  const source = { ...revisionSource(sourceId), title: sourceTitle };
  const history: ClassHistoryLog = {
    id: 'reuse-history',
    sequenceId: source.id,
    sequenceTitle: source.title,
    groupId: 'history-group',
    groupName,
    taughtAt: '2026-11-11T10:00:00Z',
    apparatus: source.apparatus,
    level: source.level,
    exerciseIds: [revisionExercise.id],
    rating: 4,
    intensity: 'moderate',
    instructorReflection: '합성 수업 기록',
    stepsSnapshot: structuredClone(source.steps),
  };
  usePilatesStore.setState({
    ...original,
    activeTab: 'binder',
    activeSequenceId: 'unsaved-current-class',
    activeTitle: '지금 작성 중인 수업',
    activeSubtitle: '보존할 초안 메모',
    activeApparatus: 'mat',
    activeLevel: '1.0',
    activeTargetMinutes: 20,
    activeTargetGroupId: 'current-class-group',
    activeSteps: [{
      ...structuredClone(source.steps[0]),
      stepId: 'current-draft-step',
      durationMin: 7,
      instructorNote: '현재 수업에서만 작성한 메모',
    }],
    draftCriteria: { ...structuredClone(source.criteriaSnapshot!), targetMinutes: 20 },
    lastCriteria: null,
    exercises: [revisionExercise],
    savedSequences: [source],
    historyLogs: [history],
    undoStack: [],
    generationError: null,
    persistenceError: null,
    saveFeedback: null,
  }, true);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  usePilatesStore.setState(original, true);
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('saved-class preview and deliberate copy reuse', () => {
  it('opens the complete plan from a collapsed card and closes by Escape or the close action without a write', async () => {
    render(<ClassBinderView onOpenLogModal={vi.fn()} />);
    const previewButton = sourceCard().getByRole('button', { name: `${sourceTitle} 미리보기` });
    const before = usePilatesStore.getState();
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem');

    previewButton.focus();
    fireEvent.click(previewButton);
    const preview = getPreview();
    const cueSheet = within(preview).getByTestId('class-cue-sheet-root');
    expect(cueSheet).toHaveAttribute('data-full-list-open', 'true');
    const plan = within(preview).getByRole('list', { name: '기본 진행표 항목 목록' });
    const planItems = within(plan).getAllByRole('listitem').filter((item) => item.parentElement === plan);
    expect(planItems).toHaveLength(2);
    expect(planItems[0]).toHaveTextContent(revisionExercise.nameKo);
    expect(planItems[1]).toHaveTextContent('휴식');
    expect(within(preview).getByRole('region', { name: '불러올 수업 요약' })).toHaveTextContent('동작 1개 · 휴식 1개');
    fireEvent.click(within(preview).getByRole('button', { name: '글자 크기 125% 확대' }));
    expect(cueSheet).toHaveAttribute('data-text-scale', '125');
    expect(usePilatesStore.getState()).toBe(before);

    fireEvent(preview, new Event('cancel', { cancelable: true }));
    expect(screen.queryByRole('dialog', { name: '저장 수업 미리보기' })).not.toBeInTheDocument();
    await waitFor(() => expect(previewButton).toHaveFocus());
    fireEvent.click(previewButton);
    fireEvent.click(within(getPreview()).getAllByRole('button', { name: '닫기' }).at(-1)!);
    await waitFor(() => expect(previewButton).toHaveFocus());
    expect(usePilatesStore.getState()).toBe(before);
    expect(storageWrite).not.toHaveBeenCalled();
  });

  it.each(['recent', 'group'] as const)(
    'keeps the copy decision reachable under the %s filter and creates nothing when cancelled',
    async (filter) => {
      render(<ClassBinderView onOpenLogModal={vi.fn()} />);
      if (filter === 'recent') {
        fireEvent.click(screen.getByRole('button', { name: /^최근 수업 있음/ }));
      } else {
        fireEvent.change(screen.getByRole('textbox', { name: '저장한 시퀀스 검색' }), {
          target: { value: groupName },
        });
      }
      const copyButton = sourceCard().getByRole('button', { name: `${sourceTitle} 사본으로 열기` });
      const before = usePilatesStore.getState();
      const storageWrite = vi.spyOn(Storage.prototype, 'setItem');
      copyButton.focus();
      fireEvent.click(copyButton);

      const decision = within(getPreview()).getByRole('region', { name: '사본 열기 확인' });
      expect(decision).toBeVisible();
      expect(decision).toHaveTextContent('지금 작성 중인 수업');
      expect(within(decision).getByRole('button', { name: '사본 만들고 열기' })).toBeEnabled();
      expect(usePilatesStore.getState()).toBe(before);
      fireEvent.click(within(decision).getByRole('button', { name: '취소' }));
      await waitFor(() => expect(copyButton).toHaveFocus());
      expect(screen.queryByRole('dialog', { name: '저장 수업 미리보기' })).not.toBeInTheDocument();
      expect(usePilatesStore.getState()).toBe(before);
      expect(storageWrite).not.toHaveBeenCalled();
      if (filter === 'recent') {
        expect(screen.getByRole('button', { name: /^최근 수업 있음/ })).toHaveAttribute('aria-pressed', 'true');
      } else {
        expect(screen.getByRole('textbox', { name: '저장한 시퀀스 검색' })).toHaveValue(groupName);
      }
    },
  );

  it('commits one independent copy from a filtered preview and restores the complete prior draft with undo', () => {
    render(<ClassBinderView onOpenLogModal={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /^최근 수업 있음/ }));
    const before = usePilatesStore.getState();
    const priorDraft = createSequenceSnapshot(before);
    const originalSource = structuredClone(before.savedSequences[0]);
    fireEvent.click(sourceCard().getByRole('button', { name: `${sourceTitle} 미리보기` }));
    fireEvent.click(within(getPreview()).getByRole('button', { name: '사본으로 열기' }));
    expect(usePilatesStore.getState()).toBe(before);
    const confirm = within(getPreview()).getByRole('button', { name: '사본 만들고 열기' });
    const changes = vi.fn();
    const unsubscribe = usePilatesStore.subscribe(changes);
    try {
      act(() => {
        confirm.click();
        confirm.click();
      });
      const after = usePilatesStore.getState();
      const copy = after.savedSequences.find((sequence) => sequence.id !== sourceId)!;
      expect(changes).toHaveBeenCalledTimes(1);
      expect(after.savedSequences).toHaveLength(2);
      expect(after.savedSequences.find((sequence) => sequence.id === sourceId)).toEqual(originalSource);
      expect(copy.steps).toEqual(originalSource.steps);
      expect(copy.steps).not.toBe(before.savedSequences[0].steps);
      expect(copy.criteriaSnapshot).toEqual(originalSource.criteriaSnapshot);
      expect(copy.taughtCount).toBe(0);
      expect(copy.lastTaughtAt).toBeUndefined();
      expect(after.activeSequenceId).toBe(copy.id);
      expect(after.activeSteps).toEqual(copy.steps);
      expect(after.activeSteps).not.toBe(copy.steps);
      expect(after.activeTargetGroupId).toBe(before.activeTargetGroupId);
      expect(after.activeTab).toBe('workbench');
      expect(after.historyLogs).toBe(before.historyLogs);
      expect(after.undoStack).toHaveLength(1);

      act(() => after.undoSequence());
      expect(createSequenceSnapshot(usePilatesStore.getState())).toEqual(priorDraft);
      expect(usePilatesStore.getState().savedSequences).toBe(after.savedSequences);
      expect(usePilatesStore.getState().historyLogs).toBe(before.historyLogs);
    } finally {
      unsubscribe();
    }
  });

  it('requires reviewing refreshed contents when the current class changes during preview', () => {
    render(<ClassBinderView onOpenLogModal={vi.fn()} />);
    fireEvent.click(sourceCard().getByRole('button', { name: `${sourceTitle} 미리보기` }));
    act(() => usePilatesStore.getState().setActiveSequenceMeta({ title: '다른 곳에서 갱신한 초안' }));
    const afterExternalEdit = usePilatesStore.getState();
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem');
    const preview = getPreview();

    expect(within(preview).getByRole('alert')).toHaveTextContent('최신 내용을 다시 확인');
    const openCopy = within(preview).getByRole('button', { name: '사본으로 열기' });
    expect(openCopy).toBeDisabled();
    fireEvent.click(openCopy);
    expect(usePilatesStore.getState()).toBe(afterExternalEdit);
    fireEvent.click(within(preview).getByRole('button', { name: '다시 확인' }));
    expect(within(preview).queryByRole('alert')).not.toBeInTheDocument();
    expect(within(preview).getByLabelText('현재 작성 중인 수업')).toHaveTextContent('다른 곳에서 갱신한 초안');
    fireEvent.click(within(preview).getByRole('button', { name: '사본으로 열기' }));
    expect(within(preview).getByRole('button', { name: '사본 만들고 열기' })).toBeEnabled();
    fireEvent(preview, new Event('cancel', { cancelable: true }));
    expect(usePilatesStore.getState()).toBe(afterExternalEdit);
    expect(storageWrite).not.toHaveBeenCalled();
  });

  it('creates only one copy for repeated activation when the current class is empty', () => {
    usePilatesStore.setState({ activeSteps: [] });
    render(<ClassBinderView onOpenLogModal={vi.fn()} />);
    const before = usePilatesStore.getState();
    const copyButton = sourceCard().getByRole('button', { name: `${sourceTitle} 사본으로 열기` });
    act(() => {
      copyButton.click();
      copyButton.click();
    });
    const after = usePilatesStore.getState();
    expect(after.savedSequences).toHaveLength(before.savedSequences.length + 1);
    expect(after.activeSequenceId).not.toBe(sourceId);
    expect(after.activeTab).toBe('workbench');
    expect(after.undoStack).toHaveLength(1);
    expect(after.historyLogs).toBe(before.historyLogs);
  });

  it('keeps a removed source read-only and returns focus to search when its card no longer exists', async () => {
    render(<ClassBinderView onOpenLogModal={vi.fn()} />);
    fireEvent.click(sourceCard().getByRole('button', { name: `${sourceTitle} 미리보기` }));
    act(() => usePilatesStore.getState().deleteSavedSequence(sourceId));
    const afterRemoval = usePilatesStore.getState();
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem');
    const preview = getPreview();

    expect(within(preview).getByRole('button', { name: '사본으로 열기' })).toBeDisabled();
    fireEvent.click(within(preview).getByRole('button', { name: '다시 확인' }));
    expect(within(preview).getByRole('alert')).toHaveTextContent('보관함에서 삭제되었어요');
    fireEvent(preview, new Event('cancel', { cancelable: true }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: '저장한 시퀀스 검색' })).toHaveFocus());
    expect(usePilatesStore.getState()).toBe(afterRemoval);
    expect(storageWrite).not.toHaveBeenCalled();
  });
});
