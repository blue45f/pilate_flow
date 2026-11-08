import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClassBinderView } from './ClassBinderView';
import { usePilatesStore } from '../store/usePilatesStore';
import { INITIAL_SAVED_SEQUENCES } from '../data/pilatesCatalog';
import { revisionExercise, revisionSource } from '../test/datedRevisionFixtures';

const original = usePilatesStore.getState();
const first = () => revisionSource('first');
const second = () => ({ ...revisionSource('second'), updatedAt: '2026-11-04T10:00:00Z' });
const card = (title = 'first 계획') =>
  within(screen.getByRole('heading', { name: title }).closest('article')!);
const expand = (title = 'first 계획') => {
  const scope = card(title);
  fireEvent.click(scope.getByRole('button', { name: `${title} 더보기` }));
  return scope;
};
beforeEach(() =>
  usePilatesStore.setState({
    ...original,
    savedSequences: [first(), second()],
    exercises: [revisionExercise],
    generationError: null,
  }),
);
afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
  vi.restoreAllMocks();
});

describe('compact saved sequence disclosure', () => {
  it('starts with open and more, exposes every existing tool without changing saved data, and collapses with Escape', () => {
    render(<ClassBinderView onOpenLogModal={vi.fn()} />);
    const before = structuredClone(usePilatesStore.getState().savedSequences);
    const scope = card();
    expect(scope.getByRole('button', { name: '불러오기' })).toBeVisible();
    expect(scope.getByRole('button', { name: 'first 계획 더보기' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(scope.queryByRole('button', { name: '수업 시작' })).not.toBeInTheDocument();
    expect(scope.getByLabelText('저장 수업 시간 구성')).not.toBeVisible();
    expand();
    const panel = scope.getByRole('region', { name: 'first 계획 추가 정보와 도구' });
    expect(panel).toBeVisible();
    for (const name of [
      '수업 시작',
      '복제',
      '인쇄',
      '텍스트',
      'first 계획 삭제',
      '이미 진행한 수업 기록하기',
    ]) {
      expect(within(panel).getByRole('button', { name })).toBeVisible();
    }
    expect(scope.getByLabelText('저장 수업 시간 구성')).toBeVisible();
    expect(scope.getByRole('button', { name: 'first 계획 접기' })).toHaveAttribute(
      'aria-controls',
      panel.id,
    );
    fireEvent.keyDown(within(panel).getByRole('button', { name: '수업 시작' }), { key: 'Escape' });
    expect(scope.getByRole('button', { name: 'first 계획 더보기' })).toHaveFocus();
    expect(scope.queryByRole('region')).not.toBeInTheDocument();
    expect(usePilatesStore.getState().savedSequences).toEqual(before);
  });

  it('keeps DOM IDs unique and focus correct for arbitrary recovered IDs', () => {
    const ids = ['a', 'a-toggle', '\ud800'];
    usePilatesStore.setState({
      savedSequences: ids.map((id, index) => ({ ...first(), id, title: `경계 ${index}` })),
    });
    const { container } = render(<ClassBinderView onOpenLogModal={vi.fn()} />);
    const domIds = [...container.querySelectorAll('[id]')].map((element) => element.id);
    expect(new Set(domIds).size).toBe(domIds.length);
    ids.forEach((_, index) => {
      const scope = expand(`경계 ${index}`);
      const toggle = scope.getByRole('button', { name: `경계 ${index} 접기` });
      const panel = scope.getByRole('region', { name: `경계 ${index} 추가 정보와 도구` });
      expect(toggle).toHaveAttribute('aria-controls', panel.id);
      fireEvent.keyDown(panel, { key: 'Escape' });
      expect(scope.getByRole('button', { name: `경계 ${index} 더보기` })).toHaveFocus();
    });
  });

  it('keeps sample and recovery notices visible while details are closed', () => {
    const recovered = first();
    recovered.recoveredDraftOrigin = {
      format: 'persisted-workspace-v3',
      sourceSequenceId: 'legacy',
      activeTargetGroupId: '',
      draftCriteria: null,
      lastCriteria: null,
      criteriaPresence: { draft: false, last: false },
      timestamps: 'unrecorded',
    };
    usePilatesStore.setState({ savedSequences: [recovered, INITIAL_SAVED_SEQUENCES[0]] });
    render(<ClassBinderView onOpenLogModal={vi.fn()} />);
    expect(
      screen.getByText('이전 편집 초안에서 복구한 자료 · 수업 전 조건을 확인해 주세요.'),
    ).toBeVisible();
    expect(screen.getByText('예시 계획', { exact: true })).toBeVisible();
    expect(screen.queryByRole('button', { name: '수업 시작' })).not.toBeInTheDocument();
  });

  it('keeps print tools expanded and restores focus after closing the print dialog', () => {
    render(<ClassBinderView onOpenLogModal={vi.fn()} />);
    const scope = expand();
    const print = scope.getByRole('button', { name: '인쇄' });
    print.focus();
    fireEvent.click(print);
    fireEvent.click(
      within(screen.getByRole('dialog', { name: '수업 계획 인쇄' }))
        .getAllByRole('button', { name: '닫기' })
        .at(-1)!,
    );
    expect(print).toHaveFocus();
    expect(scope.getByRole('button', { name: 'first 계획 접기' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('clears delete confirmation on collapse or another card selection and keeps deletion explicit', () => {
    render(<ClassBinderView onOpenLogModal={vi.fn()} />);
    const scope = expand();
    fireEvent.click(scope.getByRole('button', { name: 'first 계획 삭제' }));
    expect(scope.getByRole('region', { name: '시퀀스 삭제 확인' })).toBeVisible();
    fireEvent.click(scope.getByRole('button', { name: 'first 계획 접기' }));
    expand();
    expect(scope.queryByRole('region', { name: '시퀀스 삭제 확인' })).not.toBeInTheDocument();
    fireEvent.click(scope.getByRole('button', { name: 'first 계획 삭제' }));
    expand('second 계획');
    expect(scope.queryByRole('region', { name: '시퀀스 삭제 확인' })).not.toBeInTheDocument();
    expect(usePilatesStore.getState().savedSequences).toHaveLength(2);
  });

  it('returns deletion cancel to the delete control and confirmation to a remaining card without deleting history', async () => {
    render(<ClassBinderView onOpenLogModal={vi.fn()} />);
    const history = structuredClone(usePilatesStore.getState().historyLogs);
    const scope = expand();
    const remove = scope.getByRole('button', { name: 'first 계획 삭제' });
    fireEvent.click(remove);
    fireEvent.click(scope.getByRole('button', { name: '취소' }));
    expect(remove).toHaveFocus();
    fireEvent.click(remove);
    fireEvent.click(scope.getByRole('button', { name: '삭제 확인' }));
    await waitFor(() =>
      expect(card('second 계획').getByRole('button', { name: '불러오기' })).toHaveFocus(),
    );
    expect(usePilatesStore.getState().savedSequences.map((s) => s.id)).toEqual(['second']);
    expect(usePilatesStore.getState().historyLogs).toEqual(history);
    const last = expand('second 계획');
    fireEvent.click(last.getByRole('button', { name: 'second 계획 삭제' }));
    fireEvent.click(last.getByRole('button', { name: '삭제 확인' }));
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: '저장한 시퀀스 검색' })).toHaveFocus(),
    );
  });

  it('keeps the expanded original identified by ID after duplication changes the sorted order', () => {
    render(<ClassBinderView onOpenLogModal={vi.fn()} />);
    const scope = expand();
    fireEvent.click(scope.getByRole('button', { name: '복제' }));
    expect(usePilatesStore.getState().savedSequences).toHaveLength(3);
    expect(card().getByRole('button', { name: 'first 계획 접기' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getAllByRole('button', { name: /접기$/ })).toHaveLength(1);
    fireEvent.change(screen.getByRole('textbox', { name: '저장한 시퀀스 검색' }), {
      target: { value: 'second' },
    });
    expect(card('second 계획').getByRole('button', { name: 'second 계획 더보기' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('retains logging and stage entry through the revealed original controls', () => {
    const onLog = vi.fn();
    render(<ClassBinderView onOpenLogModal={onLog} />);
    const scope = expand();
    fireEvent.click(scope.getByRole('button', { name: '이미 진행한 수업 기록하기' }));
    expect(onLog).toHaveBeenCalledWith('first', {
      stepsSnapshot: first().steps,
      sequenceTitle: 'first 계획',
    });
    fireEvent.click(scope.getByRole('button', { name: '수업 시작' }));
    expect(usePilatesStore.getState().activeTab).toBe('stage');
    expect(usePilatesStore.getState().activeSequenceId).toBe('first');
    expect(usePilatesStore.getState().savedSequences).toHaveLength(2);
  });
});
