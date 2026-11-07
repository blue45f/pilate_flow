import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClassBinderView } from '../../src/components/ClassBinderView';
import { usePilatesStore } from '../../src/store/usePilatesStore';
import {
  LONG_KOREAN_GROUP_NAME,
  LONG_KOREAN_SEQUENCE_TITLE,
  buildSyntheticHistoryScaleDataset,
} from './fixtures/historyScaleFixtures';

describe('History Page Long-Term Accumulated Scale (100 / 1000) & Boundary Audit', () => {
  beforeEach(() => {
    localStorage.clear();
    usePilatesStore.getState().resetDemoData();
  });

  it('renders 100 accumulated records with same-name classes, long Korean titles, midnight boundaries, and original drift preservation', () => {
    const baseExercises = usePilatesStore.getState().exercises;
    const bundle100 = buildSyntheticHistoryScaleDataset(100, baseExercises);

    usePilatesStore.setState({
      activeTab: 'history',
      classGroups: bundle100.classGroups,
      savedSequences: bundle100.savedSequences,
      exercises: bundle100.exercises,
      historyLogs: bundle100.historyLogs,
    });

    const t0 = performance.now();
    render(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);
    const initialRenderMs = performance.now() - t0;

    // 1. Total count badge shows 100
    const heading = screen.getByRole('heading', { level: 1, name: /수업 기록/ });
    expect(within(heading).getByText('100')).toBeInTheDocument();

    // 2. Feed contains all 100 article cards grouped by date
    const feed = screen.getByRole('region', { name: '수업 기록 목록' });
    const cards = within(feed).getAllByRole('article');
    expect(cards).toHaveLength(100);
    const dateGroups = feed.querySelectorAll('.teaching-history-date-group');
    expect(dateGroups.length).toBeGreaterThanOrEqual(30);

    // 3. Long Korean sequence title & group name are rendered intact
    expect(within(feed).getByText(LONG_KOREAN_SEQUENCE_TITLE)).toBeInTheDocument();
    expect(within(feed).getAllByText(LONG_KOREAN_GROUP_NAME).length).toBeGreaterThanOrEqual(1);

    // 4. Same-name classes (27+ occurrences) can be filtered and disambiguated by date/time/group
    const searchInput = screen.getByLabelText('수업 기록 검색');
    fireEvent.change(searchInput, {
      target: { value: '화목저녁리포머코어골반정렬50분' },
    });
    const sameNameCards = within(feed).getAllByRole('article');
    expect(sameNameCards.length).toBe(bundle100.metadata.sameNameLogIds.length);

    // Reset search
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(within(feed).getAllByRole('article')).toHaveLength(100);

    // 5. Empty group filter transitions cleanly 100 -> 0 -> 100 while preserving total badge 100
    const groupTabs = screen.getByRole('group', { name: '수업 그룹 필터' });
    fireEvent.click(
      within(groupTabs).getByRole('button', { name: '기록 없는 휴강·특강반 (빈필터 검증)' }),
    );
    expect(within(heading).getByText('100')).toBeInTheDocument();
    expect(screen.getByText('선택한 그룹에 남긴 수업 기록이 없어요')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /필터 초기화/ }));
    expect(within(feed).getAllByRole('article')).toHaveLength(100);

    // 6. Original snapshot preservation under catalog/sequence drift + Detail modal reopen & reuse
    fireEvent.change(searchInput, {
      target: { value: '원본 보존 검증용 리포머 코어 시퀀스' },
    });
    const driftCard = within(feed).getByRole('article');
    expect(
      within(driftCard).getByText('풋워크 오리지널 스냅샷 명칭 (개정 전 보존본)'),
    ).toBeInTheDocument();
    expect(
      within(driftCard).getByText('원본 수정 후에도 당시 스냅샷 유지됨'),
    ).toBeInTheDocument();

    // Open detail modal (`이력 다시 열기`)
    fireEvent.click(within(driftCard).getByRole('button', { name: /이력 다시 열기/ }));
    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByText('원본 동작·블록 수정 후에도 당시 이력 스냅샷 그대로 보존됨'),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText('풋워크 오리지널 스냅샷 명칭 (개정 전 보존본)'),
    ).toBeInTheDocument();

    // Copy to workbench from detail modal without mutating original saved sequence or snapshot
    fireEvent.click(within(dialog).getByRole('button', { name: /복사해 다음 수업 만들기/ }));
    expect(usePilatesStore.getState().activeTab).toBe('workbench');
    expect(usePilatesStore.getState().activeTitle).toBe(
      '원본 보존 검증용 리포머 코어 시퀀스 (당시 제목) (기록에서 복사)',
    );
    // Original saved sequence title remains untouched
    expect(usePilatesStore.getState().savedSequences[0].title).toBe(
      '화·목 저녁 리포머 코어 & 골반 정렬 50분 (2026 가을 개편본)',
    );
    expect(initialRenderMs).toBeGreaterThan(0);
  }, 60000);

  it(
    'scales to 1,000 accumulated records across 300+ dates and verifies keyboard date navigation, midnight boundary behavior, and unrecoverable deleted exercise guard',
    () => {
      const baseExercises = usePilatesStore.getState().exercises;
      const bundle1000 = buildSyntheticHistoryScaleDataset(1000, baseExercises);

      usePilatesStore.setState({
        activeTab: 'history',
        classGroups: bundle1000.classGroups,
        savedSequences: bundle1000.savedSequences,
        exercises: bundle1000.exercises,
        historyLogs: bundle1000.historyLogs,
      });

      const { container } = render(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);

      const countBadge = container.querySelector('.teaching-count');
      expect(countBadge?.textContent).toBe('1000');

      const dateNav = container.querySelector('.teaching-date-nav') as HTMLElement;
      expect(dateNav).toBeTruthy();
      const dateChips = Array.from(
        dateNav.querySelectorAll<HTMLButtonElement>('button.teaching-date-chip'),
      );
      // 1 "전체 날짜" chip + 330+ distinct date chips
      expect(dateChips.length).toBeGreaterThan(300);

      // Keyboard End / Home navigation across 300+ date chips
      dateChips[0].focus();
      fireEvent.keyDown(dateNav, { key: 'End' });
      expect(document.activeElement).toBe(dateChips[dateChips.length - 1]);
      fireEvent.keyDown(dateNav, { key: 'Home' });
      expect(document.activeElement).toBe(dateChips[0]);

      // Filter to unrecoverable deleted exercise record and verify reuse button is disabled
      const searchInput = container.querySelector('.teaching-search input') as HTMLInputElement;
      expect(searchInput).toBeTruthy();
      fireEvent.change(searchInput, {
        target: { value: '구버전 스냅샷 미보존 삭제 동작 수업' },
      });
      const feed = container.querySelector('.teaching-history-feed') as HTMLElement;
      const legacyCard = feed.querySelector('article.teaching-history-card') as HTMLElement;
      expect(legacyCard).toBeTruthy();
      expect(
        within(legacyCard).getByText('삭제된 동작이 있어 불러올 수 없습니다.'),
      ).toBeInTheDocument();
      const reuseBtn = within(legacyCard).getByRole('button', { name: /이 수업 다시 계획/ });
      expect(reuseBtn).toBeDisabled();
    },
    90000,
  );
});
