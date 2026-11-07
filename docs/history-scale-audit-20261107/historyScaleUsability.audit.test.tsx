import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClassBinderView } from '../../src/components/ClassBinderView';
import { usePilatesStore } from '../../src/store/usePilatesStore';
import * as teachingHistorySnapshotModule from '../../src/utils/teachingHistorySnapshot';
import {
  LONG_KOREAN_GROUP_NAME,
  LONG_KOREAN_SEQUENCE_TITLE,
  buildSyntheticHistoryScaleDataset,
} from './fixtures/historyScaleFixtures';

describe('History Page Long-Term Accumulated Scale (100 / 1000) Post-Patch Verification', () => {
  beforeEach(() => {
    localStorage.clear();
    usePilatesStore.getState().resetDemoData();
  });

  it('verifies 100 accumulated records post-patch: 30-card initial window + load-more to 100, 12-chip date nav + expand, KST/UTC midnight alignment, 12:00/00:00 valid ISO time preservation, and zero redundant modal re-parses', () => {
    const baseExercises = usePilatesStore.getState().exercises;
    const bundle100 = buildSyntheticHistoryScaleDataset(100, baseExercises);

    usePilatesStore.setState({
      activeTab: 'history',
      classGroups: bundle100.classGroups,
      savedSequences: bundle100.savedSequences,
      exercises: bundle100.exercises,
      historyLogs: bundle100.historyLogs,
    });

    const resolveSpy = vi.spyOn(teachingHistorySnapshotModule, 'resolveTeachingHistoryView');
    const t0 = performance.now();
    render(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);
    const initialRenderMs = performance.now() - t0;

    // Initial mount parses each of the 100 logs exactly once
    expect(resolveSpy).toHaveBeenCalledTimes(100);

    // 1. Full aggregation preserved: total count badge shows 100 and "전체 날짜" chip shows 100
    const heading = screen.getByRole('heading', { level: 1, name: /수업 기록/ });
    expect(within(heading).getByText('100')).toBeInTheDocument();

    const dateNav = screen.getByRole('group', { name: '날짜별 기록 탐색' });
    expect(within(dateNav).getByRole('button', { name: /전체 날짜/ })).toHaveTextContent('100');

    // 2. Date chips initially capped at 12 recent dates (1 "전체 날짜" + 12 dates = 13 chips) + expand toggle
    const initialDateChips = dateNav.querySelectorAll('button.teaching-date-chip');
    expect(initialDateChips).toHaveLength(13);

    const expandDatesBtn = within(dateNav).getByRole('button', { name: /이전 날짜 더보기/ });
    fireEvent.click(expandDatesBtn);
    const expandedDateChips = Array.from(
      dateNav.querySelectorAll<HTMLButtonElement>('button.teaching-date-chip'),
    ).slice(1);
    expect(expandedDateChips.length).toBeGreaterThanOrEqual(30);

    // Zero duplicate date chip labels in both UTC and KST
    const chipLabels = expandedDateChips.map(
      (chip) => chip.childNodes[0]?.textContent?.trim() ?? '',
    );
    expect(new Set(chipLabels).size).toBe(chipLabels.length);

    // Collapse back to 12 recent dates
    fireEvent.click(within(dateNav).getByRole('button', { name: '날짜 접기' }));
    expect(dateNav.querySelectorAll('button.teaching-date-chip')).toHaveLength(13);

    // 3. Feed initially renders 30 cards and progressively loads 60 -> 90 -> 100 via load-more
    const feed = screen.getByRole('region', { name: '수업 기록 목록' });
    expect(within(feed).getAllByRole('article')).toHaveLength(30);

    // Verify 12:00 UTC (scale-log-midnight-5) and 00:00 UTC (scale-log-midnight-6) preserve valid time badges
    const expectedNoonUtcBadge = new Intl.DateTimeFormat('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date('2026-11-05T12:00:00.000Z'));
    const expectedMidnightUtcBadge = new Intl.DateTimeFormat('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date('2026-11-05T00:00:00.000Z'));
    const noonCard = within(feed)
      .getByText(/자정 전후 경계 테스트 5/)
      .closest('article') as HTMLElement;
    const midnightCard = within(feed)
      .getByText(/자정 전후 경계 테스트 6/)
      .closest('article') as HTMLElement;
    expect(
      noonCard.querySelector('.teaching-history-time-of-day')?.textContent,
    ).toBe(expectedNoonUtcBadge);
    expect(
      midnightCard.querySelector('.teaching-history-time-of-day')?.textContent,
    ).toBe(expectedMidnightUtcBadge);

    // Long Korean sequence title & group name are rendered intact in the first 30 cards
    expect(within(feed).getByText(LONG_KOREAN_SEQUENCE_TITLE)).toBeInTheDocument();
    expect(within(feed).getAllByText(LONG_KOREAN_GROUP_NAME).length).toBeGreaterThanOrEqual(1);

    // Load more 30 -> 60 -> 90 -> 100 without triggering any snapshot re-parsing
    fireEvent.click(within(feed).getByRole('button', { name: /이전 수업 기록 더 보기 \(30 \/ 100건/ }));
    expect(within(feed).getAllByRole('article')).toHaveLength(60);
    fireEvent.click(within(feed).getByRole('button', { name: /이전 수업 기록 더 보기 \(60 \/ 100건/ }));
    expect(within(feed).getAllByRole('article')).toHaveLength(90);
    fireEvent.click(within(feed).getByRole('button', { name: /이전 수업 기록 더 보기 \(90 \/ 100건/ }));
    expect(within(feed).getAllByRole('article')).toHaveLength(100);
    expect(within(feed).queryByRole('button', { name: /이전 수업 기록 더 보기/ })).toBeNull();
    expect(resolveSpy).toHaveBeenCalledTimes(100);

    // 4. Same-name classes (27+ occurrences) can be filtered and disambiguated by date/time/group
    const searchInput = screen.getByLabelText('수업 기록 검색');
    fireEvent.change(searchInput, {
      target: { value: '화목저녁리포머코어골반정렬50분' },
    });
    const sameNameCards = within(feed).getAllByRole('article');
    expect(sameNameCards.length).toBe(bundle100.metadata.sameNameLogIds.length);

    // Reset search -> resets visible window back to 30
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(within(feed).getAllByRole('article')).toHaveLength(30);

    // 5. Empty group filter transitions cleanly 30 -> 0 -> 30 while preserving total badge 100
    const groupTabs = screen.getByRole('group', { name: '수업 그룹 필터' });
    fireEvent.click(
      within(groupTabs).getByRole('button', { name: '기록 없는 휴강·특강반 (빈필터 검증)' }),
    );
    expect(within(heading).getByText('100')).toBeInTheDocument();
    expect(screen.getByText('선택한 그룹에 남긴 수업 기록이 없어요')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /필터 초기화/ }));
    expect(within(feed).getAllByRole('article')).toHaveLength(30);

    // 6. Original snapshot preservation under catalog/sequence drift + Detail modal reopen & reuse (0 extra snapshot parses)
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

    const callsBeforeModal = resolveSpy.mock.calls.length;
    fireEvent.click(within(driftCard).getByRole('button', { name: /이력 다시 열기/ }));
    const dialog = screen.getByRole('dialog');
    expect(resolveSpy).toHaveBeenCalledTimes(callsBeforeModal);
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
    expect(usePilatesStore.getState().savedSequences[0].title).toBe(
      '화·목 저녁 리포머 코어 & 골반 정렬 50분 (2026 가을 개편본)',
    );
    expect(initialRenderMs).toBeGreaterThan(0);
    resolveSpy.mockRestore();
  }, 60000);

  it(
    'scales to 1,000 accumulated records post-patch: caps initial DOM cards to 30 and date chips to 12 while keeping 1,000 full aggregation, recovers stale selectedDate on empty search, and guards unrecoverable deleted exercises',
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

      const resolveSpy = vi.spyOn(teachingHistorySnapshotModule, 'resolveTeachingHistoryView');
      const { container } = render(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);

      // 1,000 logs resolved exactly once on initial mount
      expect(resolveSpy).toHaveBeenCalledTimes(1000);

      // Full aggregation preserved: header badge is 1000 and "전체 날짜" chip is 1000
      const countBadge = container.querySelector('.teaching-count');
      expect(countBadge?.textContent).toBe('1000');

      const dateNav = container.querySelector('.teaching-date-nav') as HTMLElement;
      expect(dateNav).toBeTruthy();
      const initialDateChips = Array.from(
        dateNav.querySelectorAll<HTMLButtonElement>('button.teaching-date-chip'),
      );
      // 1 "전체 날짜" chip + 12 recent date chips = 13 chips by default
      expect(initialDateChips).toHaveLength(13);
      expect(initialDateChips[0].textContent).toContain('1000');

      // Initial rendered cards capped at 30 instead of 1,000 (DOM explosion eliminated)
      const feed = container.querySelector('.teaching-history-feed') as HTMLElement;
      expect(feed.querySelectorAll('article.teaching-history-card')).toHaveLength(30);

      // Load-more button loads next 30 -> 60 cards with 0 snapshot re-parses
      const loadMoreBtn = container.querySelector(
        'button.teaching-history-load-more-btn',
      ) as HTMLButtonElement;
      expect(loadMoreBtn).toBeTruthy();
      expect(loadMoreBtn.textContent).toContain('30 / 1000건 표시 중 · 남은 970건');
      fireEvent.click(loadMoreBtn);
      expect(feed.querySelectorAll('article.teaching-history-card')).toHaveLength(60);
      expect(resolveSpy).toHaveBeenCalledTimes(1000);

      // Expand all 330+ date chips and verify zero duplicate date chip labels + keyboard Home/End navigation
      const expandDatesBtn = container.querySelector(
        'button.teaching-date-more-toggle',
      ) as HTMLButtonElement;
      expect(expandDatesBtn).toBeTruthy();
      fireEvent.click(expandDatesBtn);

      const allDateChips = Array.from(
        dateNav.querySelectorAll<HTMLButtonElement>('button.teaching-date-chip'),
      );
      expect(allDateChips.length).toBeGreaterThan(300);
      const chipLabels = allDateChips
        .slice(1)
        .map((chip) => chip.childNodes[0]?.textContent?.trim() ?? '');
      expect(new Set(chipLabels).size).toBe(chipLabels.length);

      allDateChips[0].focus();
      fireEvent.keyDown(dateNav, { key: 'End' });
      expect(document.activeElement).toBe(allDateChips[allDateChips.length - 1]);
      fireEvent.keyDown(dateNav, { key: 'Home' });
      expect(document.activeElement).toBe(allDateChips[0]);

      // Select a specific date chip, then search for a non-existent query -> recovers selectedDate to 'all' so search empty state is shown
      fireEvent.click(allDateChips[1]);
      const searchInput = container.querySelector('.teaching-search input') as HTMLInputElement;
      fireEvent.change(searchInput, {
        target: { value: '존재하지않는초희귀검색어_EMPTY_FILTER_999' },
      });
      expect(screen.getByText('검색한 수업 완료 기록이 없어요')).toBeInTheDocument();

      // Filter to unrecoverable deleted exercise record and verify reuse button is disabled
      fireEvent.change(searchInput, {
        target: { value: '구버전 스냅샷 미보존 삭제 동작 수업' },
      });
      const legacyCard = feed.querySelector('article.teaching-history-card') as HTMLElement;
      expect(legacyCard).toBeTruthy();
      expect(
        within(legacyCard).getByText('삭제된 동작이 있어 불러올 수 없습니다.'),
      ).toBeInTheDocument();
      const reuseBtn = within(legacyCard).getByRole('button', { name: /이 수업 다시 계획/ });
      expect(reuseBtn).toBeDisabled();

      // Still only the initial 1,000 snapshot parses occurred across all 1,000-scale interactions!
      expect(resolveSpy).toHaveBeenCalledTimes(1000);
      resolveSpy.mockRestore();
    },
    90000,
  );
});
