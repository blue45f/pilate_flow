import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClassBinderView } from './ClassBinderView';
import { INITIAL_HISTORY_LOGS, INITIAL_CLASS_GROUPS } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';

const original = usePilatesStore.getState();
beforeEach(() => {
  localStorage.clear();
  usePilatesStore.setState({ ...original, historyLogs: structuredClone(INITIAL_HISTORY_LOGS), classGroups: structuredClone(INITIAL_CLASS_GROUPS) });
});
afterEach(() => { cleanup(); usePilatesStore.setState(original); });
describe('history search and sample separation', () => {
  it('counts sample records separately without creating actual records', () => {
    const before = usePilatesStore.getState().historyLogs;
    render(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);
    expect(screen.getByRole('status', { name: '수업 기록 검색 결과' })).toHaveTextContent('내 수업 0개');
    expect(screen.getByText(/예시 .*개 \(분석 제외\)/)).toBeVisible();
    expect(usePilatesStore.getState().historyLogs).toBe(before);
  });
  it('resets query and group together from a filtered empty state', () => {
    render(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);
    fireEvent.click(screen.getByText('날짜·그룹 필터'));
    fireEvent.click(screen.getByRole('button', { name: INITIAL_CLASS_GROUPS[0].name }));
    fireEvent.change(screen.getByRole('textbox', { name: '수업 기록 검색' }), { target: { value: '존재하지 않는 합성 검색' } });
    expect(screen.getByText('선택한 그룹에 남긴 수업 기록이 없어요')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '필터 초기화' }));
    expect(screen.getByRole('textbox', { name: '수업 기록 검색' })).toHaveValue('');
    expect(screen.getByRole('button', { name: '전체 기록' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: '필터 초기화' })).not.toBeInTheDocument();
  });
});
