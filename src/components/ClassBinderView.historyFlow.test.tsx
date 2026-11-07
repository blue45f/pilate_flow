import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClassBinderView } from './ClassBinderView';
import { usePilatesStore } from '../store/usePilatesStore';
import {
  getSavedHumanMovementDrafts,
  getSavedReusableBlocks,
  saveIdeaToReusableBlock,
  saveMovementIdeaDraft,
} from '../utils/movementIdeaDraft';
import * as teachingHistorySnapshotModule from '../utils/teachingHistorySnapshot';
import { buildTeachingProgramSnapshot } from '../utils/teachingHistorySnapshot';

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
          taughtAt: '2026-11-06T12:30:00.000Z',
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
          taughtAt: '2026-11-06T01:00:00.000Z',
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

    const dateChips = Array.from(
      dateNav.querySelectorAll<HTMLButtonElement>('button.teaching-date-chip'),
    );
    expect(dateChips).toHaveLength(3);

    // Keyboard arrow navigation between date chips
    allDatesChip.focus();
    fireEvent.keyDown(dateNav, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(dateChips[1]);

    // Click the first date chip
    fireEvent.click(dateChips[1]);
    expect(dateChips[1]).toHaveAttribute('aria-pressed', 'true');

    const feed = screen.getByRole('region', { name: '수업 기록 목록' });
    const articles = within(feed).getAllByRole('article');
    expect(articles.length).toBeGreaterThanOrEqual(1);

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

  it('aligns date keys with local display across pre/post-midnight timestamps (zero duplicate date chip labels) and hides synthetic 12:00 noon time badges on date-only logs without mutating records', () => {
    const [ex1] = usePilatesStore.getState().exercises;
    const localNoonIso = new Date('2026-11-05T12:00:00').toISOString();
    const rawLogs = [
      {
        id: 'midnight-1',
        sequenceId: 'seq-m1',
        sequenceTitle: '자정 경계 검증 A (UTC 14:50 / KST 23:50)',
        groupId: 'group-evening-a',
        groupName: '화목 저녁 A반',
        apparatus: 'reformer' as const,
        level: '1.5' as const,
        taughtAt: '2026-11-06T14:50:00.000Z',
        instructorReflection: '메모 A',
        intensity: 'moderate' as const,
        rating: 5 as const,
        exerciseIds: [ex1.id],
        stepsSnapshot: [makeStepSnapshot('m-1', ex1.id, 1)],
      },
      {
        id: 'midnight-2',
        sequenceId: 'seq-m2',
        sequenceTitle: '자정 경계 검증 B (UTC 15:10 / KST 00:10)',
        groupId: 'group-evening-a',
        groupName: '화목 저녁 A반',
        apparatus: 'reformer' as const,
        level: '1.5' as const,
        taughtAt: '2026-11-06T15:10:00.000Z',
        instructorReflection: '메모 B',
        intensity: 'moderate' as const,
        rating: 5 as const,
        exerciseIds: [ex1.id],
        stepsSnapshot: [makeStepSnapshot('m-2', ex1.id, 1)],
      },
      {
        id: 'midnight-3',
        sequenceId: 'seq-m3',
        sequenceTitle: '자정 경계 검증 C (UTC 23:55 / KST 08:55)',
        groupId: 'group-evening-a',
        groupName: '화목 저녁 A반',
        apparatus: 'reformer' as const,
        level: '1.5' as const,
        taughtAt: '2026-11-06T23:55:00.000Z',
        instructorReflection: '메모 C',
        intensity: 'moderate' as const,
        rating: 5 as const,
        exerciseIds: [ex1.id],
        stepsSnapshot: [makeStepSnapshot('m-3', ex1.id, 1)],
      },
      {
        id: 'midnight-4',
        sequenceId: 'seq-m4',
        sequenceTitle: '자정 경계 검증 D (UTC 00:05 / KST 09:05)',
        groupId: 'group-evening-a',
        groupName: '화목 저녁 A반',
        apparatus: 'reformer' as const,
        level: '1.5' as const,
        taughtAt: '2026-11-07T00:05:00.000Z',
        instructorReflection: '메모 D',
        intensity: 'moderate' as const,
        rating: 5 as const,
        exerciseIds: [ex1.id],
        stepsSnapshot: [makeStepSnapshot('m-4', ex1.id, 1)],
      },
      {
        id: 'date-only-utc-noon',
        sequenceId: 'seq-noon-utc',
        sequenceTitle: '날짜만 입력한 정오 UTC 기록',
        groupId: 'group-evening-a',
        groupName: '화목 저녁 A반',
        apparatus: 'reformer' as const,
        level: '1.5' as const,
        taughtAt: '2026-11-05T12:00:00.000Z',
        instructorReflection: '메모 정오 UTC',
        intensity: 'moderate' as const,
        rating: 5 as const,
        exerciseIds: [ex1.id],
        stepsSnapshot: [makeStepSnapshot('m-5', ex1.id, 1)],
      },
      {
        id: 'date-only-local-noon',
        sequenceId: 'seq-noon-local',
        sequenceTitle: 'LogSessionModal 날짜만 입력 로컬 정오 기록',
        groupId: 'group-evening-a',
        groupName: '화목 저녁 A반',
        apparatus: 'reformer' as const,
        level: '1.5' as const,
        taughtAt: localNoonIso,
        instructorReflection: '메모 정오 로컬',
        intensity: 'moderate' as const,
        rating: 5 as const,
        exerciseIds: [ex1.id],
        stepsSnapshot: [makeStepSnapshot('m-6', ex1.id, 1)],
      },
    ];
    usePilatesStore.setState({ historyLogs: rawLogs });

    render(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);

    const dateNav = screen.getByRole('group', { name: '날짜별 기록 탐색' });
    const dateChips = Array.from(
      dateNav.querySelectorAll<HTMLButtonElement>('button.teaching-date-chip'),
    ).slice(1); // exclude "전체 날짜"
    const labels = dateChips.map((chip) => {
      const countEl = chip.querySelector('.teaching-date-chip-count');
      return chip.textContent?.replace(countEl?.textContent ?? '', '').trim() ?? '';
    });
    // Zero duplicate date chip labels in both UTC and KST
    expect(new Set(labels).size).toBe(labels.length);

    // Date-only records must NOT display a synthetic 12:00 time-of-day badge
    const feed = screen.getByRole('region', { name: '수업 기록 목록' });
    const utcNoonHeading = within(feed).getByRole('heading', {
      level: 2,
      name: '날짜만 입력한 정오 UTC 기록',
    });
    const utcNoonCard = utcNoonHeading.closest('article') as HTMLElement;
    expect(utcNoonCard.querySelector('.teaching-history-time-of-day')).toBeNull();

    const localNoonHeading = within(feed).getByRole('heading', {
      level: 2,
      name: 'LogSessionModal 날짜만 입력 로컬 정오 기록',
    });
    const localNoonCard = localNoonHeading.closest('article') as HTMLElement;
    expect(localNoonCard.querySelector('.teaching-history-time-of-day')).toBeNull();

    // Original stored taughtAt timestamps in store remain 100% immutable
    const storedLogs = usePilatesStore.getState().historyLogs;
    expect(storedLogs.find((l) => l.id === 'date-only-utc-noon')?.taughtAt).toBe(
      '2026-11-05T12:00:00.000Z',
    );
    expect(storedLogs.find((l) => l.id === 'date-only-local-noon')?.taughtAt).toBe(localNoonIso);
  });

  it('caps initial date chips to 12 with expand/collapse, recovers selectedDate when search filters it out, and paginates cards in batches of 30 while preserving full aggregation', () => {
    const [ex1] = usePilatesStore.getState().exercises;
    // Generate 45 logs across 20 distinct dates
    const logs45 = Array.from({ length: 45 }, (_, idx) => {
      const dayOffset = idx % 20;
      const day = String(28 - dayOffset).padStart(2, '0');
      return {
        id: `scale-batch-${idx}`,
        sequenceId: `seq-batch-${idx}`,
        sequenceTitle: `배치 검증 수업 #${idx + 1}`,
        groupId: 'group-evening-a',
        groupName: '화목 저녁 A반',
        apparatus: 'reformer' as const,
        level: '1.5' as const,
        taughtAt: `2026-10-${day}T18:30:00.000Z`,
        instructorReflection: `회고 메모 ${idx + 1}`,
        intensity: 'moderate' as const,
        rating: 5 as const,
        exerciseIds: [ex1.id],
        stepsSnapshot: [makeStepSnapshot(`sb-${idx}`, ex1.id, 1)],
      };
    });
    usePilatesStore.setState({ historyLogs: logs45 });

    render(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);

    // Full aggregation preserved: header badge and "전체 날짜" chip both show 45
    const heading = screen.getByRole('heading', { level: 1, name: /수업 기록/ });
    expect(within(heading).getByText('45')).toBeInTheDocument();

    const dateNav = screen.getByRole('group', { name: '날짜별 기록 탐색' });
    const initialChips = dateNav.querySelectorAll('button.teaching-date-chip');
    // 1 "전체 날짜" + 12 recent dates = 13 chips initially
    expect(initialChips).toHaveLength(13);

    const moreDatesBtn = within(dateNav).getByRole('button', {
      name: /이전 날짜 더보기 \(\+8일\)/,
    });
    fireEvent.click(moreDatesBtn);
    // Expanded: 1 "전체 날짜" + 20 dates = 21 chips
    expect(dateNav.querySelectorAll('button.teaching-date-chip')).toHaveLength(21);

    // Collapse back to 12
    fireEvent.click(within(dateNav).getByRole('button', { name: '날짜 접기' }));
    expect(dateNav.querySelectorAll('button.teaching-date-chip')).toHaveLength(13);

    // Initial rendered cards capped at 30, with load-more button showing remaining 15
    const feed = screen.getByRole('region', { name: '수업 기록 목록' });
    expect(within(feed).getAllByRole('article')).toHaveLength(30);

    const loadMoreBtn = within(feed).getByRole('button', {
      name: /이전 수업 기록 더 보기 \(30 \/ 45건 표시 중 · 남은 15건\)/,
    });
    fireEvent.click(loadMoreBtn);
    expect(within(feed).getAllByRole('article')).toHaveLength(45);

    // Select a specific date chip, then enter a search query with 0 matches -> selectedDate recovers so empty state is search-specific
    const firstDateChip = dateNav.querySelectorAll<HTMLButtonElement>(
      'button.teaching-date-chip',
    )[1];
    fireEvent.click(firstDateChip);
    const searchInput = screen.getByLabelText('수업 기록 검색');
    fireEvent.change(searchInput, { target: { value: '존재하지않는검색어_XYZ' } });
    expect(screen.getByText('검색한 수업 완료 기록이 없어요')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /검색 지우기/ }));
    expect(within(feed).getAllByRole('article')).toHaveLength(30);
  });

  it('eliminates redundant snapshot re-parsing on UI state toggles while immediately detecting edits to exercises, reusableBlocks, and humanDrafts without savedSequences/historyLogs changes', () => {
    const baseEx = usePilatesStore.getState().exercises[0];
    const createdIdea = saveMovementIdeaDraft({
      ideaLine: '리포머 코어 안정화 창작 초안 v1',
      workingTitle: '초기 창작 동작 명칭',
      apparatus: 'reformer',
      durationMin: 5,
      level: '1.5',
    });
    expect(createdIdea.ok).toBe(true);
    const customIdeaEx = createdIdea.exercise!;

    const createdBlock = saveIdeaToReusableBlock({
      exerciseId: customIdeaEx.id,
      blockTitle: '초기 코어 워밍업 블록',
      durationMin: 5,
    });
    expect(createdBlock.ok).toBe(true);
    const initialBlock = createdBlock.block!;

    const stepsForSnapshot = [
      {
        ...makeStepSnapshot('step-block-1', baseEx.id, 1),
        blockInstanceId: 'bi-1',
        sourceBlockId: initialBlock.id,
        sourceBlockVersion: initialBlock.version,
        sourceBlockTitle: initialBlock.title,
      },
      {
        ...makeStepSnapshot('step-draft-2', customIdeaEx.id, 2),
        humanDraftId: customIdeaEx.id,
        humanDraftRevision: 1,
      },
    ];
    const programSnapshot = buildTeachingProgramSnapshot({
      sequenceId: 'seq-memo-test',
      sequenceTitle: '메모이제이션 의존성 회귀 검증 수업',
      sourceKind: 'saved-sequence',
      apparatus: 'reformer',
      level: '1.5',
      targetMinutes: 50,
      taughtAt: '2026-11-06T18:00:00.000Z',
      groupId: 'group-evening-a',
      steps: stepsForSnapshot,
      exercises: usePilatesStore.getState().exercises,
      reusableBlocks: getSavedReusableBlocks(),
      humanDrafts: getSavedHumanMovementDrafts(),
    });

    const logItem = {
      id: 'log-memo-regression',
      sequenceId: 'seq-memo-test',
      sequenceTitle: '메모이제이션 의존성 회귀 검증 수업',
      groupId: 'group-evening-a',
      groupName: '화목 저녁 A반',
      apparatus: 'reformer' as const,
      level: '1.5' as const,
      taughtAt: '2026-11-06T18:00:00.000Z',
      instructorReflection: '메모이제이션 회귀 검증',
      intensity: 'moderate' as const,
      rating: 5 as const,
      exerciseIds: [baseEx.id, customIdeaEx.id],
      stepsSnapshot: stepsForSnapshot,
      programSnapshot,
    };

    usePilatesStore.setState({
      historyLogs: [logItem],
    });

    const resolveSpy = vi.spyOn(teachingHistorySnapshotModule, 'resolveTeachingHistoryView');
    const { rerender } = render(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);
    expect(resolveSpy).toHaveBeenCalledTimes(1);

    // 1. Opening and closing detail modal must NOT re-parse snapshots (0 extra calls)
    const feed = screen.getByRole('region', { name: '수업 기록 목록' });
    fireEvent.click(within(feed).getByRole('button', { name: /이력 다시 열기/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(resolveSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(
      within(screen.getByRole('dialog')).getAllByRole('button', { name: '닫기' }).at(-1)!,
    );
    expect(resolveSpy).toHaveBeenCalledTimes(1);

    // 2. Editing `exercises` in store (without changing savedSequences or historyLogs) immediately triggers drift recomputation
    act(() => {
      usePilatesStore.setState((prev) => ({
        exercises: prev.exercises.map((item) =>
          item.id === baseEx.id ? { ...item, nameKo: `${baseEx.nameKo} (카탈로그 개정판)` } : item,
        ),
      }));
    });
    expect(resolveSpy).toHaveBeenCalledTimes(2);
    expect(within(feed).getByText('원본 수정 후에도 당시 스냅샷 유지됨')).toBeInTheDocument();

    // 3. Editing `reusableBlocks` (adding another item to bump block version, without changing savedSequences or historyLogs) is detected on re-render
    saveIdeaToReusableBlock({
      exerciseId: customIdeaEx.id,
      blockId: initialBlock.id,
      durationMin: 4,
    });
    rerender(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);
    expect(resolveSpy).toHaveBeenCalledTimes(3);

    fireEvent.click(within(feed).getByRole('button', { name: /이력 다시 열기/ }));
    const dialogAfterBlockEdit = screen.getByRole('dialog');
    expect(
      within(dialogAfterBlockEdit).getByText('원본 블록 수정됨 · 당시 블록 유지'),
    ).toBeInTheDocument();
    fireEvent.click(
      within(dialogAfterBlockEdit).getAllByRole('button', { name: '닫기' }).at(-1)!,
    );

    // 4. Editing `humanDrafts` (updating the movement idea draft to revision 2) is also immediately detected
    act(() => {
      saveMovementIdeaDraft({
        existingExerciseId: customIdeaEx.id,
        ideaLine: '리포머 코어 안정화 창작 초안 v2 개정',
        workingTitle: '개정된 창작 동작 명칭 v2',
        apparatus: 'reformer',
        durationMin: 5,
        level: '1.5',
      });
    });
    expect(resolveSpy.mock.calls.length).toBeGreaterThanOrEqual(4);

    resolveSpy.mockRestore();
  });
});

