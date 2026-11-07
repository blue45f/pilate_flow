import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClassBinderView } from './ClassBinderView';
import { usePilatesStore } from '../store/usePilatesStore';

const makeStepSnapshot = (
  stepId: string,
  exerciseId: string,
  order = 1,
) => ({
  stepId,
  order,
  kind: 'exercise' as const,
  exerciseId,
  blockCategory: 'core' as const,
  durationMin: 6,
  movementSec: 300,
  explanationSec: 30,
  transitionSec: 30,
  selectedLayer: 'standard' as const,
  customNote: '',
});

describe('ClassBinderView history date exploration, hierarchy & reuse workflow', () => {
  beforeEach(() => {
    localStorage.clear();
    usePilatesStore.getState().resetDemoData();
    const [ex1, ex2] = usePilatesStore.getState().exercises;
    usePilatesStore.setState({
      activeTab: 'history',
      classGroups: [
        ...usePilatesStore.getState().classGroups,
        {
          id: 'group-empty-dawn',
          name: '기록 없는 새벽반',
          type: 'group',
          defaultLevel: '1.5',
          scheduleLabel: '월·수 07:00',
          notes: '',
        },
      ],
      historyLogs: [
        {
          id: 'history-flow-nov06-pm',
          sequenceId: 'seq-nov06-pm',
          sequenceTitle: '저녁 코어 & 고관절 정렬 플로우',
          groupId: 'group-evening-a',
          groupName: '화목 저녁 A반',
          apparatus: 'reformer',
          level: '1.5',
          taughtAt: '2026-11-06T19:30:00.000Z',
          actualDurationSec: 3000,
          actualRestDurationSec: 120,
          instructorReflection: '브릿징 구간에서 햄스트링 개입을 줄이도록 큐잉함.',
          intensity: 'moderate',
          rating: 5,
          exerciseIds: [ex1.id, ex2.id],
          stepsSnapshot: [
            makeStepSnapshot('s-1', ex1.id, 1),
            makeStepSnapshot('s-2', ex2.id, 2),
          ],
        },
        {
          id: 'history-flow-nov06-am',
          sequenceId: 'seq-nov06-am',
          sequenceTitle: '오전 흉추 가동성 시퀀스',
          groupId: 'group-morning-b',
          groupName: '수금 오전 B반',
          apparatus: 'reformer',
          level: '1.0',
          taughtAt: '2026-11-06T10:00:00.000Z',
          actualDurationSec: 2700,
          instructorReflection: '호흡 템포가 안정적이었음.',
          intensity: 'relaxed',
          rating: 4,
          exerciseIds: [ex1.id],
          stepsSnapshot: [makeStepSnapshot('s-3', ex1.id, 1)],
        },
        {
          id: 'history-flow-nov03',
          sequenceId: 'seq-nov03',
          sequenceTitle: '개인 레슨 골반 안정화 프로그램',
          groupId: 'group-evening-a',
          groupName: '화목 저녁 A반',
          apparatus: 'reformer',
          level: '1.5',
          taughtAt: '2026-11-03T14:00:00.000Z',
          instructorReflection: '다음 수업에서 사이드 킥 시리즈 연결 예정.',
          intensity: 'intense',
          rating: 5,
          exerciseIds: [ex2.id],
          stepsSnapshot: [makeStepSnapshot('s-4', ex2.id, 1)],
        },
      ],
    });
  });

  it('groups records by date, supports date chip filtering & keyboard arrow navigation, and keeps total count badge stable', () => {
    render(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);

    const heading = screen.getByRole('heading', { level: 1, name: /수업 기록/ });
    expect(within(heading).getByText('3')).toBeInTheDocument();

    const dateNav = screen.getByRole('group', { name: '날짜별 기록 탐색' });
    const allDatesChip = within(dateNav).getByRole('button', { name: /전체 날짜/ });
    expect(allDatesChip).toHaveAttribute('aria-pressed', 'true');

    const dateChips = within(dateNav).getAllByRole('button');
    expect(dateChips).toHaveLength(3); // 전체 날짜 + 2026-11-06 + 2026-11-03

    // Keyboard arrow navigation between date chips
    allDatesChip.focus();
    fireEvent.keyDown(dateNav, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(dateChips[1]);

    // Click the Nov 6 chip (which has 2 records)
    fireEvent.click(dateChips[1]);
    expect(dateChips[1]).toHaveAttribute('aria-pressed', 'true');

    const feed = screen.getByRole('region', { name: '수업 기록 목록' });
    const articles = within(feed).getAllByRole('article');
    expect(articles).toHaveLength(2);

    // Quick reset button appears when a specific date is selected
    const showAllDatesBtn = within(dateNav).getByRole('button', { name: '전체 날짜 보기' });
    fireEvent.click(showAllDatesBtn);
    expect(within(feed).getAllByRole('article')).toHaveLength(3);
  });

  it('distinguishes empty group filter state from initial empty history and resets filters in one click', () => {
    render(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);

    const groupTabs = screen.getByRole('group', { name: '수업 그룹 필터' });
    fireEvent.click(within(groupTabs).getByRole('button', { name: '기록 없는 새벽반' }));

    // Total actual logs badge in header stays 3 even when filtered group is empty
    const heading = screen.getByRole('heading', { level: 1, name: /수업 기록/ });
    expect(within(heading).getByText('3')).toBeInTheDocument();

    expect(screen.getByText('선택한 그룹에 남긴 수업 기록이 없어요')).toBeInTheDocument();
    const resetBtn = screen.getByRole('button', { name: /필터 초기화/ });
    fireEvent.click(resetBtn);

    const feed = screen.getByRole('region', { name: '수업 기록 목록' });
    expect(within(feed).getAllByRole('article')).toHaveLength(3);
  });

  it('supports compact date and whitespace-insensitive Korean search queries', () => {
    render(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);

    const searchInput = screen.getByLabelText('수업 기록 검색');
    fireEvent.change(searchInput, { target: { value: '20261103' } });

    const feed = screen.getByRole('region', { name: '수업 기록 목록' });
    expect(within(feed).getAllByRole('article')).toHaveLength(1);
    expect(within(feed).getByText('개인 레슨 골반 안정화 프로그램')).toBeInTheDocument();

    // Compact title search without spaces
    fireEvent.change(searchInput, { target: { value: '저녁코어고관절정렬' } });
    expect(within(feed).getAllByRole('article')).toHaveLength(1);
    expect(within(feed).getByText('저녁 코어 & 고관절 정렬 플로우')).toBeInTheDocument();
  });

  it('places date/time & class name above snapshot badges and provides primary reuse action into workbench', () => {
    render(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);

    const feed = screen.getByRole('region', { name: '수업 기록 목록' });
    const firstCard = within(feed).getAllByRole('article')[0];

    // Date and duration pill in header
    expect(within(firstCard).getByText('50분 진행')).toBeInTheDocument();

    // Class name heading appears before snapshot badges in DOM order
    const titleEl = within(firstCard).getByRole('heading', {
      level: 2,
      name: '저녁 코어 & 고관절 정렬 플로우',
    });
    const badgesEl = firstCard.querySelector('.teaching-history-badges') as HTMLElement;
    expect(Boolean(titleEl.compareDocumentPosition(badgesEl) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(
      true,
    );

    // Reuse button has primary CTA styling and copies into workbench
    const reuseBtn = within(firstCard).getByRole('button', { name: /이 수업 다시 계획/ });
    expect(reuseBtn.className).toContain('pf-btn--primary');

    fireEvent.click(reuseBtn);
    expect(usePilatesStore.getState().activeTab).toBe('workbench');
    expect(usePilatesStore.getState().activeSteps).toHaveLength(2);
  });
});
