import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RECOVERY_STORAGE_KEY } from '../lib/recoveryStorageGuard';
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

const makeStepSnapshot = (stepId: string, exerciseId: string, order = 1) => ({
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

const makeHistoryLog = (
  id: string,
  sequenceTitle: string,
  taughtAt: string,
  exerciseId: string,
  extra: Record<string, unknown> = {},
) => ({
  id,
  sequenceId: `seq-${id}`,
  sequenceTitle,
  groupId: 'group-evening-a',
  groupName: '화목 저녁 A반',
  apparatus: 'reformer' as const,
  level: '1.5' as const,
  taughtAt,
  instructorReflection: `메모 ${id}`,
  intensity: 'moderate' as const,
  rating: 5 as const,
  exerciseIds: [exerciseId],
  stepsSnapshot: [makeStepSnapshot(`step-${id}`, exerciseId, 1)],
  ...extra,
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

    allDatesChip.focus();
    fireEvent.keyDown(dateNav, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(dateChips[1]);

    fireEvent.click(dateChips[1]);
    expect(dateChips[1]).toHaveAttribute('aria-pressed', 'true');

    const feed = screen.getByRole('region', { name: '수업 기록 목록' });
    expect(within(feed).getAllByRole('article').length).toBeGreaterThanOrEqual(1);

    const showAllDatesBtn = within(dateNav).getByRole('button', { name: '전체 날짜 보기' });
    fireEvent.click(showAllDatesBtn);
    expect(within(feed).getAllByRole('article')).toHaveLength(3);
  });

  it('distinguishes empty group filter state from initial empty history via progressive group disclosure and resets filters in one click', () => {
    render(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);

    const groupTabs = screen.getByRole('group', { name: '수업 그룹 필터' });
    expect(groupTabs).toHaveClass('is-collapsed');

    // Expand group filters to select the 5th group ("기록 없는 새벽반")
    const expandGroupsBtn = within(groupTabs).getByRole('button', { name: /그룹 더보기/ });
    fireEvent.click(expandGroupsBtn);
    expect(groupTabs).toHaveClass('is-expanded');

    fireEvent.click(within(groupTabs).getByRole('button', { name: '기록 없는 새벽반' }));

    // Collapse group filters and verify selected group stays pinned while collapsed
    fireEvent.click(within(groupTabs).getByRole('button', { name: '그룹 접기' }));
    expect(groupTabs).toHaveClass('is-collapsed');
    expect(
      within(groupTabs).getByRole('button', { name: '기록 없는 새벽반' }),
    ).toHaveAttribute('aria-pressed', 'true');

    const heading = screen.getByRole('heading', { level: 1, name: /수업 기록/ });
    expect(within(heading).getByText('3')).toBeInTheDocument();

    expect(screen.getByText('선택한 그룹에 남긴 수업 기록이 없어요')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /필터 초기화/ }));

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

    fireEvent.change(searchInput, { target: { value: '저녁코어고관절정렬' } });
    expect(within(feed).getAllByRole('article')).toHaveLength(1);
    expect(within(feed).getByText('저녁 코어 & 고관절 정렬 플로우')).toBeInTheDocument();
  });

  it('places the class name before metadata and snapshot badges and prioritizes read-only viewing before explicit copying into workbench', () => {
    render(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);

    const feed = screen.getByRole('region', { name: '수업 기록 목록' });
    const firstCard = within(feed).getAllByRole('article')[0];

    expect(within(firstCard).getByText('50분 진행')).toBeInTheDocument();

    const titleEl = within(firstCard).getByRole('heading', {
      level: 2,
      name: '저녁 코어 & 고관절 정렬 플로우',
    });
    const badgesEl = firstCard.querySelector('.teaching-history-badges') as HTMLElement;
    expect(Boolean(titleEl.compareDocumentPosition(badgesEl) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(
      true,
    );

    const reuseBtn = within(firstCard).getByRole('button', { name: /복사해 새 수업 만들기/ });
    const viewBtn = within(firstCard).getByRole('button', { name: '당시 시퀀스 보기' });
    expect(viewBtn).toHaveClass('pf-btn--primary');
    expect(reuseBtn).toHaveClass('pf-btn--secondary');
    expect(Boolean(viewBtn.compareDocumentPosition(reuseBtn) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    const beforeView = usePilatesStore.getState();
    const storedBefore = localStorage.getItem(RECOVERY_STORAGE_KEY);
    expect(storedBefore).not.toBeNull();
    fireEvent.click(viewBtn);
    const detail = screen.getByRole('dialog', { name: '진행 완료 수업 이력 상세' });
    expect(usePilatesStore.getState()).toBe(beforeView);
    fireEvent.click(within(detail).getAllByRole('button', { name: '닫기' }).at(-1)!);
    expect(document.activeElement).toBe(viewBtn);
    expect(usePilatesStore.getState()).toBe(beforeView);
    expect(localStorage.getItem(RECOVERY_STORAGE_KEY)).toBe(storedBefore);

    fireEvent.click(reuseBtn);
    expect(usePilatesStore.getState().activeTab).toBe('workbench');
    expect(usePilatesStore.getState().activeSteps).toHaveLength(2);
    expect(usePilatesStore.getState().historyLogs).toBe(beforeView.historyLogs);
    expect(usePilatesStore.getState().savedSequences).toBe(beforeView.savedSequences);
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
      { hour: '2-digit', minute: '2-digit', hour12: false },
    );

    const rawLogs = [
      makeHistoryLog('midnight-1', '자정 경계 검증 A (UTC 14:50 / KST 23:50)', '2026-11-06T14:50:00.000Z', ex1.id),
      makeHistoryLog('midnight-2', '자정 경계 검증 B (UTC 15:10 / KST 00:10)', '2026-11-06T15:10:00.000Z', ex1.id),
      makeHistoryLog('midnight-3', '자정 경계 검증 C (UTC 23:55 / KST 08:55)', '2026-11-06T23:55:00.000Z', ex1.id),
      makeHistoryLog('midnight-4', '자정 경계 검증 D (UTC 00:05 / KST 09:05)', '2026-11-07T00:05:00.000Z', ex1.id),
      makeHistoryLog('actual-utc-noon', '실제 정오 UTC ISO 수업 기록', '2026-11-05T12:00:00.000Z', ex1.id),
      makeHistoryLog('actual-local-noon', '실제 로컬 12:00 런치타임 수업 기록', localNoonIso, ex1.id),
      makeHistoryLog('actual-utc-midnight', '실제 자정 UTC ISO 수업 기록', '2026-11-05T00:00:00.000Z', ex1.id),
      makeHistoryLog('actual-local-midnight', '실제 로컬 00:00 심야 수업 기록', localMidnightIso, ex1.id),
      makeHistoryLog('date-only-plain-string', '날짜 전용 문자열(YYYY-MM-DD) 수업 기록', '2026-11-05', ex1.id),
      makeHistoryLog('date-only-unrecorded-metadata', '원본 메타데이터(timestamps: unrecorded) 날짜 전용 기록', localNoonIso, ex1.id, {
        timestamps: 'unrecorded' as const,
      }),
    ];
    usePilatesStore.setState({ historyLogs: rawLogs });

    render(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);

    const dateNav = screen.getByRole('group', { name: '날짜별 기록 탐색' });
    const dateChips = Array.from(
      dateNav.querySelectorAll<HTMLButtonElement>('button.teaching-date-chip'),
    ).slice(1);
    const labels = dateChips.map((chip) => chip.childNodes[0]?.textContent?.trim() ?? '');
    expect(new Set(labels).size).toBe(labels.length);

    const feed = screen.getByRole('region', { name: '수업 기록 목록' });
    const getCardTimeText = (headingName: string) =>
      (
        within(feed).getByRole('heading', { level: 2, name: headingName }).closest('article') as HTMLElement
      ).querySelector('.teaching-history-time-of-day')?.textContent ?? null;

    expect(getCardTimeText('실제 정오 UTC ISO 수업 기록')).toBe(expectedUtcNoonLabel);
    expect(getCardTimeText('실제 로컬 12:00 런치타임 수업 기록')).toBe('12:00');
    expect(getCardTimeText('실제 자정 UTC ISO 수업 기록')).toBe(expectedUtcMidnightLabel);
    expect(getCardTimeText('실제 로컬 00:00 심야 수업 기록')).toBe('00:00');
    expect(getCardTimeText('날짜 전용 문자열(YYYY-MM-DD) 수업 기록')).toBeNull();
    expect(getCardTimeText('원본 메타데이터(timestamps: unrecorded) 날짜 전용 기록')).toBeNull();

    const storedLogs = usePilatesStore.getState().historyLogs;
    expect(storedLogs.find((l) => l.id === 'actual-utc-noon')?.taughtAt).toBe('2026-11-05T12:00:00.000Z');
    expect(storedLogs.find((l) => l.id === 'actual-local-noon')?.taughtAt).toBe(localNoonIso);
    expect(storedLogs.find((l) => l.id === 'actual-utc-midnight')?.taughtAt).toBe('2026-11-05T00:00:00.000Z');
    expect(storedLogs.find((l) => l.id === 'actual-local-midnight')?.taughtAt).toBe(localMidnightIso);
    expect(storedLogs.find((l) => l.id === 'date-only-plain-string')?.taughtAt).toBe('2026-11-05');
  });

  it('caps initial date chips to 3 recent dates with expand/collapse across viewports, recovers selectedDate when search filters it out, and paginates cards in batches of 30 while preserving full aggregation', () => {
    const [ex1] = usePilatesStore.getState().exercises;
    const logs45 = Array.from({ length: 45 }, (_, idx) => {
      const day = String(28 - (idx % 20)).padStart(2, '0');
      return makeHistoryLog(`scale-batch-${idx}`, `배치 검증 수업 #${idx + 1}`, `2026-10-${day}T18:30:00.000Z`, ex1.id);
    });
    usePilatesStore.setState({ historyLogs: logs45 });

    render(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);

    const heading = screen.getByRole('heading', { level: 1, name: /수업 기록/ });
    expect(within(heading).getByText('45')).toBeInTheDocument();

    const dateNav = screen.getByRole('group', { name: '날짜별 기록 탐색' });
    const initialChips = dateNav.querySelectorAll('button.teaching-date-chip');
    // 1 "전체 날짜" + 3 recent dates = 4 chips initially
    expect(initialChips).toHaveLength(4);

    const moreDatesBtn = within(dateNav).getByRole('button', {
      name: /이전 날짜 더보기 \(\+17일\)/,
    });
    fireEvent.click(moreDatesBtn);
    expect(dateNav.querySelectorAll('button.teaching-date-chip')).toHaveLength(21);

    fireEvent.click(within(dateNav).getByRole('button', { name: '날짜 접기' }));
    expect(dateNav.querySelectorAll('button.teaching-date-chip')).toHaveLength(4);

    const feed = screen.getByRole('region', { name: '수업 기록 목록' });
    expect(within(feed).getAllByRole('article')).toHaveLength(30);

    const loadMoreBtn = within(feed).getByRole('button', {
      name: /이전 수업 기록 더 보기 \(30 \/ 45건 표시 중 · 남은 15건\)/,
    });
    fireEvent.click(loadMoreBtn);
    expect(within(feed).getAllByRole('article')).toHaveLength(45);

    const firstDateChip = dateNav.querySelectorAll<HTMLButtonElement>('button.teaching-date-chip')[1];
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

    usePilatesStore.setState({
      historyLogs: [
        makeHistoryLog(
          'log-memo-regression',
          '메모이제이션 의존성 회귀 검증 수업',
          '2026-11-06T18:00:00.000Z',
          baseEx.id,
          {
            sequenceId: 'seq-memo-test',
            exerciseIds: [baseEx.id, customIdeaEx.id],
            stepsSnapshot: stepsForSnapshot,
            programSnapshot,
          },
        ),
      ],
    });

    const resolveSpy = vi.spyOn(teachingHistorySnapshotModule, 'resolveTeachingHistoryView');
    const { rerender } = render(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);
    expect(resolveSpy).toHaveBeenCalledTimes(1);

    const feed = screen.getByRole('region', { name: '수업 기록 목록' });
    fireEvent.click(within(feed).getByRole('button', { name: /당시 시퀀스 보기/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(resolveSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(within(screen.getByRole('dialog')).getAllByRole('button', { name: '닫기' }).at(-1)!);
    expect(resolveSpy).toHaveBeenCalledTimes(1);

    act(() => {
      usePilatesStore.setState((prev) => ({
        exercises: prev.exercises.map((item) =>
          item.id === baseEx.id ? { ...item, nameKo: `${baseEx.nameKo} (카탈로그 개정판)` } : item,
        ),
      }));
    });
    expect(resolveSpy).toHaveBeenCalledTimes(2);
    expect(within(feed).getByText('원본 수정 후에도 당시 스냅샷 유지됨')).toBeInTheDocument();

    saveIdeaToReusableBlock({
      exerciseId: customIdeaEx.id,
      blockId: initialBlock.id,
      durationMin: 4,
    });
    rerender(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);
    expect(resolveSpy).toHaveBeenCalledTimes(3);

    fireEvent.click(within(feed).getByRole('button', { name: /당시 시퀀스 보기/ }));
    const dialogAfterBlockEdit = screen.getByRole('dialog');
    expect(within(dialogAfterBlockEdit).getByText('원본 블록 수정됨 · 당시 블록 유지')).toBeInTheDocument();
    fireEvent.click(within(dialogAfterBlockEdit).getAllByRole('button', { name: '닫기' }).at(-1)!);

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

  it('shows only current selection and 3 recent dates by default, preserves selected older date when collapsed without changing filter, and restores focus on toggle/reset/modal close', () => {
    const [ex1] = usePilatesStore.getState().exercises;
    const logs20 = Array.from({ length: 20 }, (_, idx) => {
      const day = String(28 - idx).padStart(2, '0');
      return makeHistoryLog(`mobile-date-log-${idx}`, `모바일 날짜 탐색 수업 #${idx + 1}`, `2026-10-${day}T10:30:00.000Z`, ex1.id);
    });
    usePilatesStore.setState({ historyLogs: logs20 });

    render(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);

    const dateNav = screen.getByRole('group', { name: '날짜별 기록 탐색' });
    expect(dateNav).toHaveClass('is-collapsed');

    const initialChips = dateNav.querySelectorAll<HTMLButtonElement>('button.teaching-date-chip');
    expect(initialChips).toHaveLength(4);
    expect(initialChips[0]).toHaveAttribute('aria-pressed', 'true');

    initialChips[0].focus();
    fireEvent.keyDown(dateNav, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(initialChips[1]);
    fireEvent.keyDown(dateNav, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(initialChips[0]);

    const toggleBtn = within(dateNav).getByRole('button', { name: /이전 날짜 더보기 \(\+17일\)/ });
    fireEvent.click(toggleBtn);
    expect(dateNav).toHaveClass('is-expanded');
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    expect(document.activeElement).toBe(toggleBtn);

    const expandedChips = dateNav.querySelectorAll<HTMLButtonElement>('button.teaching-date-chip');
    expect(expandedChips).toHaveLength(21);

    const olderDateChip = expandedChips[15];
    const olderDateLabel = olderDateChip.childNodes[0]?.textContent?.trim() ?? '';
    fireEvent.click(olderDateChip);
    expect(olderDateChip).toHaveAttribute('aria-pressed', 'true');

    const feed = screen.getByRole('region', { name: '수업 기록 목록' });
    expect(within(feed).getAllByRole('article')).toHaveLength(1);
    expect(within(feed).getByText('모바일 날짜 탐색 수업 #15')).toBeInTheDocument();

    const collapseBtn = within(dateNav).getByRole('button', { name: '날짜 접기' });
    fireEvent.click(collapseBtn);
    expect(dateNav).toHaveClass('is-collapsed');
    expect(document.activeElement).toBe(collapseBtn);

    const collapsedWithSelectionChips = Array.from(
      dateNav.querySelectorAll<HTMLButtonElement>('button.teaching-date-chip'),
    );
    expect(collapsedWithSelectionChips).toHaveLength(5);
    const pinnedChip = collapsedWithSelectionChips.find((chip) => chip.textContent?.includes(olderDateLabel));
    expect(pinnedChip).toHaveAttribute('aria-pressed', 'true');
    expect(within(feed).getAllByRole('article')).toHaveLength(1);
    expect(within(dateNav).getByRole('button', { name: /이전 날짜 더보기 \(\+16일\)/ })).toBeInTheDocument();

    const resetDateBtn = within(dateNav).getByRole('button', { name: '전체 날짜 보기' });
    fireEvent.click(resetDateBtn);
    expect(within(feed).getAllByRole('article')).toHaveLength(20);
    expect(document.activeElement).toBe(
      dateNav.querySelectorAll<HTMLButtonElement>('button.teaching-date-chip')[0],
    );

    const reopenBtn = within(feed).getAllByRole('button', { name: /당시 시퀀스 보기/ })[0];
    reopenBtn.focus();
    fireEvent.click(reopenBtn);
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getAllByRole('button', { name: '닫기' }).at(-1)!);
    expect(document.activeElement).toBe(reopenBtn);
  });

  it('scopes compact header/filter spacing to history view and preserves first-card title, date, explicit copy action, and active selections across 320px/390px viewports', () => {
    const [ex1] = usePilatesStore.getState().exercises;
    const logs6 = Array.from({ length: 6 }, (_, i) => {
      const day = String(28 - i).padStart(2, '0');
      return makeHistoryLog(`round4-log-${i + 1}`, `Round4 모바일 첫카드 수업 #${i + 1}`, `2026-10-${day}T09:00:00.000Z`, ex1.id, {
        groupId: 'grp-mon-wed-7pm',
        groupName: '월·수 저녁반',
      });
    });
    usePilatesStore.setState({ historyLogs: logs6 });

    const onOpenLogModal = vi.fn();
    const { container, rerender } = render(
      <ClassBinderView view="history" onOpenLogModal={onOpenLogModal} />,
    );

    const section = container.querySelector('.teaching-collection');
    expect(section).toHaveClass('teaching-collection--history');
    expect(section).not.toHaveClass('teaching-collection--saved');

    expect(screen.getByRole('heading', { level: 1, name: /수업 기록/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /수업 그룹 추가/ })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '수업 기록 검색' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /월·수 저녁반/ })).toBeInTheDocument();

    const feed = screen.getByRole('region', { name: '수업 기록 목록' });
    const firstCard = within(feed).getAllByRole('article')[0];
    const timeEl = firstCard.querySelector('time');
    const titleEl = firstCard.querySelector('h2');
    const copyBtn = within(firstCard).getByRole('button', { name: /복사해 새 수업 만들기/ });

    expect(timeEl).toBeTruthy();
    expect(titleEl).toHaveTextContent('Round4 모바일 첫카드 수업 #1');
    expect(Boolean(titleEl!.compareDocumentPosition(timeEl!) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(Boolean(titleEl!.compareDocumentPosition(copyBtn) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: /월·수 저녁반/ }));
    const dateNav = screen.getByRole('group', { name: '날짜별 기록 탐색' });
    fireEvent.click(within(dateNav).getByRole('button', { name: /이전 날짜 더보기/ }));
    const expandedDateChips = dateNav.querySelectorAll<HTMLButtonElement>('button.teaching-date-chip');
    fireEvent.click(expandedDateChips[expandedDateChips.length - 1]);
    fireEvent.click(within(dateNav).getByRole('button', { name: '날짜 접기' }));

    expect(within(feed).getAllByRole('article')).toHaveLength(1);
    expect(within(feed).getByText('Round4 모바일 첫카드 수업 #6')).toBeInTheDocument();

    fireEvent.click(within(feed).getByRole('button', { name: /복사해 새 수업 만들기/ }));
    expect(usePilatesStore.getState().activeTab).toBe('workbench');

    rerender(<ClassBinderView view="saved" onOpenLogModal={onOpenLogModal} />);
    expect(container.querySelector('.teaching-collection')).toHaveClass('teaching-collection--saved');
  });

  it('supports Round 5 progressive group/date disclosure, keyboard Escape collapse + focus restoration, and 1,000-record scale performance without extra snapshot re-parses', () => {
    const [ex1] = usePilatesStore.getState().exercises;
    const logs1000 = Array.from({ length: 1000 }, (_, idx) => {
      const day = String(28 - (idx % 25)).padStart(2, '0');
      const month = idx % 50 < 25 ? '10' : '09';
      return makeHistoryLog(
        `scale-1000-${idx}`,
        `Round5 1000건 대량 검증 수업 #${idx + 1}`,
        `2026-${month}-${day}T10:00:00.000Z`,
        ex1.id,
        { groupId: 'grp-mon-wed-7pm', groupName: '월·수 저녁반' },
      );
    });
    usePilatesStore.setState({ historyLogs: logs1000 });

    const resolveSpy = vi.spyOn(teachingHistorySnapshotModule, 'resolveTeachingHistoryView');
    render(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);

    // 1,000 logs resolved once on mount; initial DOM is capped at 30 cards
    expect(resolveSpy).toHaveBeenCalledTimes(1000);
    const feed = screen.getByRole('region', { name: '수업 기록 목록' });
    expect(within(feed).getAllByRole('article')).toHaveLength(30);

    // Group filter progressive disclosure: initially 1 "전체 기록" + 2 groups = 3 pills + "+3개" toggle
    const groupBar = screen.getByRole('group', { name: '수업 그룹 필터' });
    expect(groupBar).toHaveClass('is-collapsed');
    expect(groupBar.querySelectorAll('button.teaching-group-pill')).toHaveLength(3);

    const groupMoreBtn = within(groupBar).getByRole('button', { name: /그룹 더보기 \(\+3개\)/ });
    fireEvent.click(groupMoreBtn);
    expect(groupBar).toHaveClass('is-expanded');
    expect(groupBar.querySelectorAll('button.teaching-group-pill')).toHaveLength(6);

    // Keyboard Escape inside expanded group bar collapses it and restores focus to the toggle button
    const lastGroupPill = groupBar.querySelectorAll<HTMLButtonElement>('button.teaching-group-pill')[5];
    lastGroupPill.focus();
    fireEvent.keyDown(groupBar, { key: 'Escape' });
    expect(groupBar).toHaveClass('is-collapsed');
    expect(document.activeElement).toBe(
      within(groupBar).getByRole('button', { name: /그룹 더보기 \(\+3개\)/ }),
    );

    // Date filter progressive disclosure: Escape collapses expanded date bar and restores focus to date toggle
    const dateNav = screen.getByRole('group', { name: '날짜별 기록 탐색' });
    const dateMoreBtn = within(dateNav).getByRole('button', { name: /이전 날짜 더보기/ });
    fireEvent.click(dateMoreBtn);
    expect(dateNav).toHaveClass('is-expanded');
    const expandedDateChip = dateNav.querySelectorAll<HTMLButtonElement>('button.teaching-date-chip')[5];
    expandedDateChip.focus();
    fireEvent.keyDown(dateNav, { key: 'Escape' });
    expect(dateNav).toHaveClass('is-collapsed');
    expect(document.activeElement).toBe(
      within(dateNav).getByRole('button', { name: /이전 날짜 더보기/ }),
    );

    // Zero additional snapshot parses during group/date expand/collapse interactions
    expect(resolveSpy).toHaveBeenCalledTimes(1000);
    resolveSpy.mockRestore();
  });
  it('keeps memo and reuse visible while disclosing filters and full class composition on demand', () => {
    const { container } = render(<ClassBinderView view="history" onOpenLogModal={() => {}} />);
    const filters = container.querySelector<HTMLDetailsElement>('.teaching-history-filters');
    expect(filters?.open).toBe(false);
    expect(filters?.querySelector('summary')).toHaveTextContent('날짜·그룹 필터');
    const card = container.querySelector('.teaching-history-card')!;
    const details = card.querySelector<HTMLDetailsElement>('.teaching-history-details');
    expect(details?.open).toBe(false);
    expect(details?.querySelector('.teaching-card-stats')).not.toBeNull();
    expect(details?.querySelector('.teaching-history-exercises')).not.toBeNull();
    expect(details?.contains(card.querySelector('.teaching-reflection'))).toBe(false);
    expect(details?.contains(within(card as HTMLElement).getByRole('button', { name: '복사해 새 수업 만들기' }))).toBe(false);
    expect(card.querySelector('h2')?.compareDocumentPosition(card.querySelector('.teaching-reflection')!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('rejects duplicate group names with normalized matching and focuses the group name input', () => {
    render(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);

    const groupCountBefore = usePilatesStore.getState().classGroups.length;
    fireEvent.click(screen.getByRole('button', { name: /수업 그룹 추가/ }));

    const input = screen.getByLabelText(/그룹 별칭/);
    fireEvent.change(input, { target: { value: '  기록   없는 새벽반 ' } });
    fireEvent.click(screen.getByRole('button', { name: '그룹 추가' }));

    expect(screen.getByText('이미 같은 이름의 수업 그룹이 있습니다.')).toBeInTheDocument();
    expect(document.activeElement).toBe(input);
    expect(usePilatesStore.getState().classGroups).toHaveLength(groupCountBefore);
  });

  it('guards rapid double-clicks on sequence duplication and restores focus to the print trigger button when the print modal closes', () => {
    render(<ClassBinderView view="saved" onOpenLogModal={vi.fn()} />);

    const countBefore = usePilatesStore.getState().savedSequences.length;
    fireEvent.click(screen.getAllByRole('button', { name: /더보기$/ })[0]);
    const duplicateButtons = screen.getAllByRole('button', { name: /복제/ });
    fireEvent.click(duplicateButtons[0]);
    fireEvent.click(duplicateButtons[0]);
    expect(usePilatesStore.getState().savedSequences).toHaveLength(countBefore + 1);

    const printButtons = screen.getAllByRole('button', { name: /인쇄/ });
    const firstPrintBtn = printButtons[0];
    firstPrintBtn.focus();
    fireEvent.click(firstPrintBtn);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('수업 계획 인쇄')).toBeInTheDocument();

    const closeBtn = within(dialog).getAllByRole('button', { name: '닫기' }).at(-1)!;
    fireEvent.click(closeBtn);
    expect(document.activeElement).toBe(firstPrintBtn);
  });

});

