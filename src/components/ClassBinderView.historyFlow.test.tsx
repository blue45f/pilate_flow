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

  it('aligns date keys with local display across pre/post-midnight timestamps, preserves valid 12:00 noon and 00:00 midnight ISO times, and only hides time badges on unambiguous date-only records without mutating stored values', () => {
    const [ex1] = usePilatesStore.getState().exercises;
    const localNoonIso = new Date('2026-11-05T12:00:00').toISOString();
    const localMidnightIso = new Date('2026-11-05T00:00:00').toISOString();
    const expectedUtcNoonLabel = new Date('2026-11-05T12:00:00.000Z').toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const expectedUtcMidnightLabel = new Date('2026-11-05T00:00:00.000Z').toLocaleTimeString(
      'ko-KR',
      {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      },
    );

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
        id: 'actual-utc-noon',
        sequenceId: 'seq-noon-utc',
        sequenceTitle: '실제 정오 UTC ISO 수업 기록',
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
        id: 'actual-local-noon',
        sequenceId: 'seq-noon-local',
        sequenceTitle: '실제 로컬 12:00 런치타임 수업 기록',
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
      {
        id: 'actual-utc-midnight',
        sequenceId: 'seq-midnight-utc',
        sequenceTitle: '실제 자정 UTC ISO 수업 기록',
        groupId: 'group-evening-a',
        groupName: '화목 저녁 A반',
        apparatus: 'reformer' as const,
        level: '1.5' as const,
        taughtAt: '2026-11-05T00:00:00.000Z',
        instructorReflection: '메모 자정 UTC',
        intensity: 'moderate' as const,
        rating: 5 as const,
        exerciseIds: [ex1.id],
        stepsSnapshot: [makeStepSnapshot('m-7', ex1.id, 1)],
      },
      {
        id: 'actual-local-midnight',
        sequenceId: 'seq-midnight-local',
        sequenceTitle: '실제 로컬 00:00 심야 수업 기록',
        groupId: 'group-evening-a',
        groupName: '화목 저녁 A반',
        apparatus: 'reformer' as const,
        level: '1.5' as const,
        taughtAt: localMidnightIso,
        instructorReflection: '메모 자정 로컬',
        intensity: 'moderate' as const,
        rating: 5 as const,
        exerciseIds: [ex1.id],
        stepsSnapshot: [makeStepSnapshot('m-8', ex1.id, 1)],
      },
      {
        id: 'date-only-plain-string',
        sequenceId: 'seq-date-only-plain',
        sequenceTitle: '날짜 전용 문자열(YYYY-MM-DD) 수업 기록',
        groupId: 'group-evening-a',
        groupName: '화목 저녁 A반',
        apparatus: 'reformer' as const,
        level: '1.5' as const,
        taughtAt: '2026-11-05',
        instructorReflection: '날짜만 저장된 기록',
        intensity: 'moderate' as const,
        rating: 5 as const,
        exerciseIds: [ex1.id],
        stepsSnapshot: [makeStepSnapshot('m-9', ex1.id, 1)],
      },
      {
        id: 'date-only-unrecorded-metadata',
        sequenceId: 'seq-date-only-meta',
        sequenceTitle: '원본 메타데이터(timestamps: unrecorded) 날짜 전용 기록',
        groupId: 'group-evening-a',
        groupName: '화목 저녁 A반',
        apparatus: 'reformer' as const,
        level: '1.5' as const,
        taughtAt: localNoonIso,
        timestamps: 'unrecorded' as const,
        instructorReflection: '원본 메타데이터로 시각 미기록 명시',
        intensity: 'moderate' as const,
        rating: 5 as const,
        exerciseIds: [ex1.id],
        stepsSnapshot: [makeStepSnapshot('m-10', ex1.id, 1)],
      },
    ];
    usePilatesStore.setState({ historyLogs: rawLogs });

    render(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);

    const dateNav = screen.getByRole('group', { name: '날짜별 기록 탐색' });
    const dateChips = Array.from(
      dateNav.querySelectorAll<HTMLButtonElement>('button.teaching-date-chip'),
    ).slice(1); // exclude "전체 날짜"
    const labels = dateChips.map((chip) => chip.childNodes[0]?.textContent?.trim() ?? '');
    // Zero duplicate date chip labels in both UTC and KST
    expect(new Set(labels).size).toBe(labels.length);

    const feed = screen.getByRole('region', { name: '수업 기록 목록' });

    // 1. Ambiguous / actual ISO 12:00 and 00:00 records MUST preserve and display their valid time badges
    const utcNoonCard = within(feed)
      .getByRole('heading', { level: 2, name: '실제 정오 UTC ISO 수업 기록' })
      .closest('article') as HTMLElement;
    expect(utcNoonCard.querySelector('.teaching-history-time-of-day')?.textContent).toBe(
      expectedUtcNoonLabel,
    );

    const localNoonCard = within(feed)
      .getByRole('heading', { level: 2, name: '실제 로컬 12:00 런치타임 수업 기록' })
      .closest('article') as HTMLElement;
    expect(localNoonCard.querySelector('.teaching-history-time-of-day')?.textContent).toBe('12:00');

    const utcMidnightCard = within(feed)
      .getByRole('heading', { level: 2, name: '실제 자정 UTC ISO 수업 기록' })
      .closest('article') as HTMLElement;
    expect(utcMidnightCard.querySelector('.teaching-history-time-of-day')?.textContent).toBe(
      expectedUtcMidnightLabel,
    );

    const localMidnightCard = within(feed)
      .getByRole('heading', { level: 2, name: '실제 로컬 00:00 심야 수업 기록' })
      .closest('article') as HTMLElement;
    expect(localMidnightCard.querySelector('.teaching-history-time-of-day')?.textContent).toBe(
      '00:00',
    );

    // 2. Unambiguous date-only records (YYYY-MM-DD or explicit timestamps: 'unrecorded' metadata) MUST hide time badge
    const plainDateOnlyCard = within(feed)
      .getByRole('heading', { level: 2, name: '날짜 전용 문자열(YYYY-MM-DD) 수업 기록' })
      .closest('article') as HTMLElement;
    expect(plainDateOnlyCard.querySelector('.teaching-history-time-of-day')).toBeNull();

    const metaDateOnlyCard = within(feed)
      .getByRole('heading', {
        level: 2,
        name: '원본 메타데이터(timestamps: unrecorded) 날짜 전용 기록',
      })
      .closest('article') as HTMLElement;
    expect(metaDateOnlyCard.querySelector('.teaching-history-time-of-day')).toBeNull();

    // 3. Original stored taughtAt timestamps in store remain 100% immutable
    const storedLogs = usePilatesStore.getState().historyLogs;
    expect(storedLogs.find((l) => l.id === 'actual-utc-noon')?.taughtAt).toBe(
      '2026-11-05T12:00:00.000Z',
    );
    expect(storedLogs.find((l) => l.id === 'actual-local-noon')?.taughtAt).toBe(localNoonIso);
    expect(storedLogs.find((l) => l.id === 'actual-utc-midnight')?.taughtAt).toBe(
      '2026-11-05T00:00:00.000Z',
    );
    expect(storedLogs.find((l) => l.id === 'actual-local-midnight')?.taughtAt).toBe(
      localMidnightIso,
    );
    expect(storedLogs.find((l) => l.id === 'date-only-plain-string')?.taughtAt).toBe('2026-11-05');
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

  it('shows only current selection and 3 recent dates by default on mobile (<=640px), preserves selected older date when collapsed without changing filter, and restores focus on toggle/reset/modal close', () => {
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 390,
    });

    try {
      const [ex1] = usePilatesStore.getState().exercises;
      const logs20 = Array.from({ length: 20 }, (_, idx) => {
        const day = String(28 - idx).padStart(2, '0');
        return {
          id: `mobile-date-log-${idx}`,
          sequenceId: `seq-mobile-${idx}`,
          sequenceTitle: `모바일 날짜 탐색 수업 #${idx + 1}`,
          groupId: 'group-evening-a',
          groupName: '화목 저녁 A반',
          apparatus: 'reformer' as const,
          level: '1.5' as const,
          taughtAt: `2026-10-${day}T10:30:00.000Z`,
          instructorReflection: `모바일 날짜 검증 메모 ${idx + 1}`,
          intensity: 'moderate' as const,
          rating: 5 as const,
          exerciseIds: [ex1.id],
          stepsSnapshot: [makeStepSnapshot(`mob-step-${idx}`, ex1.id, 1)],
        };
      });
      usePilatesStore.setState({ historyLogs: logs20 });

      render(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);

      const dateNav = screen.getByRole('group', { name: '날짜별 기록 탐색' });
      expect(dateNav).toHaveClass('is-collapsed');

      // On mobile (390px), default view shows 1 "전체 날짜" chip + 3 recent date chips = 4 chips
      const initialMobileChips = dateNav.querySelectorAll<HTMLButtonElement>(
        'button.teaching-date-chip',
      );
      expect(initialMobileChips).toHaveLength(4);
      expect(initialMobileChips[0]).toHaveAttribute('aria-pressed', 'true');

      // Keyboard ArrowDown / ArrowUp / End / Home navigation on compact mobile chips
      initialMobileChips[0].focus();
      fireEvent.keyDown(dateNav, { key: 'ArrowDown' });
      expect(document.activeElement).toBe(initialMobileChips[1]);
      fireEvent.keyDown(dateNav, { key: 'ArrowUp' });
      expect(document.activeElement).toBe(initialMobileChips[0]);

      // Explicit expand button shows remaining +17 dates and keeps focus on toggle
      const toggleBtn = within(dateNav).getByRole('button', {
        name: /이전 날짜 더보기 \(\+17일\)/,
      });
      fireEvent.click(toggleBtn);
      expect(dateNav).toHaveClass('is-expanded');
      expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
      expect(document.activeElement).toBe(toggleBtn);

      const expandedChips = dateNav.querySelectorAll<HTMLButtonElement>(
        'button.teaching-date-chip',
      );
      expect(expandedChips).toHaveLength(21);

      // Select an older date (15th date chip, index 15 -> 2026-10-14)
      const olderDateChip = expandedChips[15];
      const olderDateLabel = olderDateChip.childNodes[0]?.textContent?.trim() ?? '';
      fireEvent.click(olderDateChip);
      expect(olderDateChip).toHaveAttribute('aria-pressed', 'true');

      const feed = screen.getByRole('region', { name: '수업 기록 목록' });
      expect(within(feed).getAllByRole('article')).toHaveLength(1);
      expect(within(feed).getByText('모바일 날짜 탐색 수업 #15')).toBeInTheDocument();

      // Collapse the date list: selected older date MUST remain visible and active, and filter MUST NOT silently change
      const collapseBtn = within(dateNav).getByRole('button', { name: '날짜 접기' });
      fireEvent.click(collapseBtn);
      expect(dateNav).toHaveClass('is-collapsed');
      expect(document.activeElement).toBe(collapseBtn);

      const collapsedWithSelectionChips = Array.from(
        dateNav.querySelectorAll<HTMLButtonElement>('button.teaching-date-chip'),
      );
      // 1 "전체 날짜" + 3 recent dates + 1 pinned selected older date = 5 chips
      expect(collapsedWithSelectionChips).toHaveLength(5);
      const pinnedChip = collapsedWithSelectionChips.find((chip) =>
        chip.textContent?.includes(olderDateLabel),
      );
      expect(pinnedChip).toBeTruthy();
      expect(pinnedChip).toHaveAttribute('aria-pressed', 'true');
      expect(within(feed).getAllByRole('article')).toHaveLength(1);
      expect(within(feed).getByText('모바일 날짜 탐색 수업 #15')).toBeInTheDocument();

      // Hidden date count reflects 20 - 4 visible dates = +16일
      expect(
        within(dateNav).getByRole('button', { name: /이전 날짜 더보기 \(\+16일\)/ }),
      ).toBeInTheDocument();

      // Clicking "전체 날짜 보기" resets filter to 'all' and restores focus to "전체 날짜" chip
      const resetDateBtn = within(dateNav).getByRole('button', { name: '전체 날짜 보기' });
      fireEvent.click(resetDateBtn);
      expect(within(feed).getAllByRole('article')).toHaveLength(20);
      const allDatesChipAfterReset = dateNav.querySelectorAll<HTMLButtonElement>(
        'button.teaching-date-chip',
      )[0];
      expect(document.activeElement).toBe(allDatesChipAfterReset);

      // Opening and closing detail modal restores focus to the trigger button
      const reopenBtn = within(feed).getAllByRole('button', { name: /이력 다시 열기/ })[0];
      reopenBtn.focus();
      fireEvent.click(reopenBtn);
      const dialog = screen.getByRole('dialog');
      fireEvent.click(within(dialog).getAllByRole('button', { name: '닫기' }).at(-1)!);
      expect(document.activeElement).toBe(reopenBtn);
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        writable: true,
        value: originalInnerWidth,
      });
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
    }
  });

  it('scopes Round 4 compact header/filter spacing to history view and preserves first-card date, title, primary reuse action, and active selections across 320px/390px mobile viewports', () => {
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 320,
    });

    try {
      const [ex1] = usePilatesStore.getState().exercises;
      const logs6 = Array.from({ length: 6 }, (_, i) => {
        const day = String(28 - i).padStart(2, '0');
        return {
          id: `round4-log-${i + 1}`,
          sequenceId: `seq-round4-${i + 1}`,
          sequenceTitle: `Round4 모바일 첫카드 수업 #${i + 1}`,
          groupId: 'grp-mon-wed-7pm',
          groupName: '월·수 저녁반',
          apparatus: 'reformer' as const,
          level: '1.5' as const,
          taughtAt: `2026-10-${day}T09:00:00.000Z`,
          instructorReflection: `Round4 검증 메모 ${i + 1}`,
          intensity: 'moderate' as const,
          rating: 5 as const,
          exerciseIds: [ex1.id],
          stepsSnapshot: [makeStepSnapshot(`r4-step-${i + 1}`, ex1.id, 1)],
        };
      });

      usePilatesStore.setState({ historyLogs: logs6 });

      const onOpenLogModal = vi.fn();
      const { container, rerender } = render(
        <ClassBinderView view="history" onOpenLogModal={onOpenLogModal} />,
      );

      const section = container.querySelector('.teaching-collection');
      expect(section).toHaveClass('teaching-collection--history');
      expect(section).not.toHaveClass('teaching-collection--saved');

      // All header, summary, group filter, and date filter controls remain present (no feature deletion)
      expect(screen.getByRole('heading', { level: 1, name: /수업 기록/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /수업 그룹 추가/ })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: '수업 기록 검색' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /월·수 저녁반/ })).toBeInTheDocument();

      // First card exposes date (<time>), title (<h2>), reopen button, and primary reuse button in natural DOM order
      const feed = screen.getByRole('region', { name: '수업 기록 목록' });
      const firstCard = within(feed).getAllByRole('article')[0];
      const timeEl = firstCard.querySelector('time');
      const titleEl = firstCard.querySelector('h2');
      const reopenBtn = within(firstCard).getByRole('button', { name: /이력 다시 열기/ });
      const primaryReuseBtn = within(firstCard).getByRole('button', {
        name: /이 수업 다시 계획/,
      });

      expect(timeEl).toBeTruthy();
      expect(titleEl).toHaveTextContent('Round4 모바일 첫카드 수업 #1');
      expect(
        Boolean(timeEl!.compareDocumentPosition(titleEl!) & Node.DOCUMENT_POSITION_FOLLOWING),
      ).toBe(true);
      expect(
        Boolean(
          titleEl!.compareDocumentPosition(primaryReuseBtn) & Node.DOCUMENT_POSITION_FOLLOWING,
        ),
      ).toBe(true);
      expect(reopenBtn).toBeInTheDocument();

      // Select a group filter and an older date, then resize 320 -> 390 -> 320: selections must not reset
      fireEvent.click(screen.getByRole('button', { name: /월·수 저녁반/ }));
      const dateNav = screen.getByRole('group', { name: '날짜별 기록 탐색' });
      fireEvent.click(within(dateNav).getByRole('button', { name: /이전 날짜 더보기/ }));
      const expandedDateChips = dateNav.querySelectorAll<HTMLButtonElement>(
        'button.teaching-date-chip',
      );
      const olderChip = expandedDateChips[expandedDateChips.length - 1];
      fireEvent.click(olderChip);
      fireEvent.click(within(dateNav).getByRole('button', { name: '날짜 접기' }));

      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        writable: true,
        value: 390,
      });
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });

      expect(within(feed).getAllByRole('article')).toHaveLength(1);
      expect(within(feed).getByText('Round4 모바일 첫카드 수업 #6')).toBeInTheDocument();

      // Primary reuse action still loads the historical snapshot into the workbench and switches activeTab to workbench
      fireEvent.click(
        within(feed).getByRole('button', {
          name: /이 수업 다시 계획/,
        }),
      );
      expect(usePilatesStore.getState().activeTab).toBe('workbench');

      // Rerendering as saved view switches modifier class cleanly to teaching-collection--saved
      rerender(<ClassBinderView view="saved" onOpenLogModal={onOpenLogModal} />);
      expect(container.querySelector('.teaching-collection')).toHaveClass(
        'teaching-collection--saved',
      );
      expect(container.querySelector('.teaching-collection')).not.toHaveClass(
        'teaching-collection--history',
      );
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        writable: true,
        value: originalInnerWidth,
      });
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
    }
  });
});

