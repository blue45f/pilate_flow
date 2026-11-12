import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_HISTORY_LOGS } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import { ClassBinderView } from './ClassBinderView';

const originalStore = usePilatesStore.getState();

beforeEach(() => {
  localStorage.clear();
  usePilatesStore.setState(
    {
      ...originalStore,
      activeTab: 'history',
      activeSteps: [],
      savedSequences: [],
      historyLogs: [],
      classGroups: [],
    },
    true,
  );
});

afterEach(() => {
  cleanup();
  usePilatesStore.setState(originalStore, true);
  localStorage.clear();
});

describe('record-page teaching composition', () => {
  it('keeps example-only records out of the report and opens the workbench from its empty state', () => {
    usePilatesStore.setState({ historyLogs: INITIAL_HISTORY_LOGS });
    render(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);
    const card = screen.getByTestId('teaching-balance-insight-card');
    expect(within(card).getByTestId('balance-insight-empty')).toBeInTheDocument();
    expect(within(card).queryByTestId('balance-insight-kpis')).not.toBeInTheDocument();
    fireEvent.click(within(card).getByRole('button', { name: /오늘 수업 계획하러 가기/ }));
    expect(usePilatesStore.getState().activeTab).toBe('workbench');
  });

  it('switches between recent 5 and 15 actual records without writing their history or inventing missing times', () => {
    const records = Array.from({ length: 16 }, (_, index) => ({
      ...INITIAL_HISTORY_LOGS[0],
      id: `balance-integration-${index}`,
      taughtAt: `2026-11-${String(index + 1).padStart(2, '0')}T10:00:00+09:00`,
      stepsSnapshot: undefined,
      actualDurationSec: undefined,
    }));
    usePilatesStore.setState({ historyLogs: records });
    render(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);
    const card = screen.getByTestId('teaching-balance-insight-card');
    expect(within(card).getByTestId('balance-insight-kpis')).toHaveTextContent('분석 기록 5회');
    expect(within(card).getByTestId('balance-insight-kpis')).toHaveTextContent('정보 없음');
    expect(within(card).getByTestId('balance-coaching-callout')).toHaveTextContent(
      '기록 정보 확인 필요',
    );
    fireEvent.click(within(card).getByRole('button', { name: '최근 15회' }));
    expect(within(card).getByRole('button', { name: '최근 15회' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(card).getByTestId('balance-insight-kpis')).toHaveTextContent('분석 기록 15회');
    expect(usePilatesStore.getState().historyLogs).toBe(records);
  });
});
