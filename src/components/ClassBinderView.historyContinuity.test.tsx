import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_CLASS_GROUPS, INITIAL_HISTORY_LOGS } from '../data/pilatesCatalog';
import { workspaceBrowseStorageKey } from '../hooks/useWorkspaceBrowseState';
import { getActiveWorkspaceOwner } from '../lib/accountStorage';
import { usePilatesStore } from '../store/usePilatesStore';
import { revisionExercise, revisionSource } from '../test/datedRevisionFixtures';
import type { ClassHistoryLog } from '../types/pilates';
import * as adaptiveHistory from '../utils/historyAdaptiveBridge';
import { ClassBinderView } from './ClassBinderView';

const original = usePilatesStore.getState();
const groupA = { ...INITIAL_CLASS_GROUPS[0], id: 'browse-a', name: '연속 A반' };
const groupB = { ...INITIAL_CLASS_GROUPS[1], id: 'browse-b', name: '연속 B반' };

function historyLog(id: string, overrides: Partial<ClassHistoryLog> = {}): ClassHistoryLog {
  return {
    ...INITIAL_HISTORY_LOGS[0],
    id,
    sequenceTitle: '호흡 이어가기',
    groupId: groupA.id,
    groupName: groupA.name,
    taughtAt: '2026-11-09T10:00:00.000Z',
    apparatus: 'mat',
    level: '1.0',
    exerciseIds: [revisionExercise.id],
    stepsSnapshot: structuredClone(revisionSource().steps),
    instructorReflection: '강사가 직접 남긴 합성 메모',
    rating: 4,
    intensity: 'moderate',
    ...overrides,
  };
}

function historyCards() {
  return within(screen.getByRole('region', { name: '수업 기록 목록' })).getAllByRole('article');
}

function openFilters() {
  fireEvent.click(screen.getByText(/^날짜·그룹 필터/));
}

beforeEach(() => {
  localStorage.clear();
  usePilatesStore.setState({
    ...original,
    activeTab: 'history',
    activeSteps: [],
    activeSequenceId: 'empty-history-draft',
    exercises: [revisionExercise],
    ownedEquipment: ['mat'],
    savedSequences: [],
    classGroups: [groupA, groupB],
    historyLogs: [],
    undoStack: [],
    generationError: null,
  }, true);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  usePilatesStore.setState(original, true);
  localStorage.clear();
});

describe('history browsing and recorded-data honesty', () => {
  it('keeps example history available to inspect or copy but excludes it from adaptive analysis and actions', () => {
    const sample = historyLog(INITIAL_HISTORY_LOGS[0].id, { sequenceTitle: '예시 호흡 수업' });
    usePilatesStore.setState({ historyLogs: [sample] });
    const before = usePilatesStore.getState();
    const buildDraft = vi.spyOn(adaptiveHistory, 'buildAdaptiveNextClassDraft');
    render(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);

    expect(screen.getByRole('status', { name: '수업 기록 검색 결과' })).toHaveTextContent('내 수업 0개 · 예시 1개 (분석 제외)');
    expect(screen.queryByTestId('binder-adaptive-bridge-card')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '피드백 반영 보정 생성' })).not.toBeInTheDocument();
    const sampleCard = within(historyCards()[0]);
    expect(sampleCard.getByRole('button', { name: '당시 시퀀스 보기' })).toBeEnabled();
    expect(sampleCard.getByRole('button', { name: '복사해 새 수업 만들기' })).toBeEnabled();
    expect(buildDraft).not.toHaveBeenCalled();
    expect(usePilatesStore.getState()).toBe(before);
  });

  it('offers adaptive actions only for actual records when examples and actual records coexist', () => {
    const sample = historyLog(INITIAL_HISTORY_LOGS[0].id, { sequenceTitle: '예시 호흡 수업' });
    const actual = historyLog('actual-browse-log', { sequenceTitle: '직접 남긴 호흡 수업' });
    usePilatesStore.setState({ historyLogs: [sample, actual] });
    const before = usePilatesStore.getState();
    const buildDraft = vi.spyOn(adaptiveHistory, 'buildAdaptiveNextClassDraft');
    render(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);

    expect(screen.getByTestId('binder-adaptive-bridge-card')).toBeVisible();
    expect(screen.getByTestId(`history-adaptive-btn-${actual.id}`)).toBeEnabled();
    expect(screen.queryByTestId(`history-adaptive-btn-${sample.id}`)).not.toBeInTheDocument();
    expect(buildDraft).toHaveBeenCalled();
    expect(buildDraft.mock.calls.every(([input]) => input.logs.length === 1 && input.logs[0].id === actual.id)).toBe(true);
    expect(screen.getByRole('status', { name: '수업 기록 검색 결과' })).toHaveTextContent('내 수업 1개 · 예시 1개 (분석 제외)');
    expect(usePilatesStore.getState()).toBe(before);
  });

  it('restores search, group, date and expanded result count on return without editing lessons or logs', () => {
    const matching = Array.from({ length: 35 }, (_, index) => historyLog(`continuity-${index}`, {
      sequenceTitle: `호흡 이어가기 ${index + 1}`,
    }));
    usePilatesStore.setState({ historyLogs: [
      ...matching,
      historyLog('other-date', { taughtAt: '2026-11-08T10:00:00.000Z' }),
      historyLog('other-group', { groupId: groupB.id, groupName: groupB.name }),
      historyLog('other-title', { sequenceTitle: '균형 수업', instructorReflection: '정렬 메모' }),
    ] });
    const before = usePilatesStore.getState();
    const first = render(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox', { name: '수업 기록 검색' }), { target: { value: '호흡' } });
    openFilters();
    fireEvent.click(screen.getByRole('button', { name: groupA.name }));
    fireEvent.click(within(screen.getByRole('group', { name: '날짜별 기록 탐색' })).getByRole('button', { name: /11월 9일/ }));
    expect(screen.getByRole('status', { name: '수업 기록 검색 결과' })).toHaveTextContent('내 수업 35개');
    expect(historyCards()).toHaveLength(30);
    fireEvent.click(screen.getByRole('button', { name: /^이전 수업 기록 더 보기/ }));
    expect(historyCards()).toHaveLength(35);

    first.unmount();
    render(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);
    expect(screen.getByRole('textbox', { name: '수업 기록 검색' })).toHaveValue('호흡');
    expect(screen.getByRole('button', { name: `그룹 필터 해제: ${groupA.name}` })).toBeVisible();
    expect(screen.getByRole('button', { name: /날짜 필터 해제:.*11월 9일/ })).toBeVisible();
    expect(historyCards()).toHaveLength(35);
    expect(screen.queryByRole('button', { name: /^이전 수업 기록 더 보기/ })).not.toBeInTheDocument();
    expect(usePilatesStore.getState()).toBe(before);

    fireEvent.click(screen.getByRole('button', { name: '선택 해제' }));
    expect(screen.getByRole('textbox', { name: '수업 기록 검색' })).toHaveValue('');
    expect(screen.getByRole('status', { name: '수업 기록 검색 결과' })).toHaveTextContent('내 수업 38개');
    expect(historyCards()).toHaveLength(30);
    expect(usePilatesStore.getState()).toBe(before);
  });

  it('falls back to available groups and dates when a recovered filter no longer exists', () => {
    usePilatesStore.setState({ historyLogs: Array.from({ length: 35 }, (_, index) => historyLog(`fallback-${index}`)) });
    sessionStorage.setItem(workspaceBrowseStorageKey('history', getActiveWorkspaceOwner()), JSON.stringify({
      query: 42, group: 'deleted-group', date: '2025-01-01', visibleCount: -100,
    }));
    const before = usePilatesStore.getState();
    render(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);

    expect(screen.getByRole('textbox', { name: '수업 기록 검색' })).toHaveValue('');
    expect(screen.getByRole('status', { name: '수업 기록 검색 결과' })).toHaveTextContent('내 수업 35개');
    expect(historyCards()).toHaveLength(30);
    openFilters();
    expect(screen.getByRole('button', { name: '전체 기록' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^전체 날짜/ })).toHaveAttribute('aria-pressed', 'true');
    expect(usePilatesStore.getState()).toBe(before);
  });
});
