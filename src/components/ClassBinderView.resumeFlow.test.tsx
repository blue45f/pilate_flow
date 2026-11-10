import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClassBinderView } from './ClassBinderView';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import type { ClassHistoryLog, PilatesExercise, SavedSequence, SequenceStep } from '../types/pilates';
import { isExerciseAutoEligible } from '../utils/exerciseReview';
import {
  attachProgramSnapshotToHistoryLog,
  buildTeachingProgramSnapshot,
} from '../utils/teachingHistorySnapshot';
import { syntheticPlanningExercise } from '../test/planningFixtures';

const originalState = usePilatesStore.getState();

const makeStep = (
  stepId: string,
  exerciseId: string,
  order: number,
  durationMin = 10,
  blockCategory: SequenceStep['blockCategory'] = 'core',
): SequenceStep => ({
  stepId,
  order,
  kind: 'exercise',
  exerciseId,
  blockCategory,
  durationMin,
  explanationSec: 20,
  transitionSec: 15,
  selectedLayer: 'standard',
});

const makeRest = (stepId: string, order: number, durationMin = 2): SequenceStep => ({
  stepId,
  order,
  kind: 'rest',
  exerciseId: '',
  blockCategory: 'cooldown',
  durationMin,
  selectedLayer: 'standard',
});

describe('ClassBinderView find, inspect, and safe resume workflow (synthetic)', () => {
  let reformerWarm: PilatesExercise;
  let reformerCore: PilatesExercise;
  let chairLower: PilatesExercise;
  let matCooldown: PilatesExercise;
  let seqReformer: SavedSequence;
  let seqChair: SavedSequence;
  let seqMat: SavedSequence;

  beforeEach(() => {
    localStorage.clear();

    reformerWarm = {
      ...syntheticPlanningExercise('reformer', 'warmup', 'alpha', false),
      nameKo: '합성 리포머 풋워크 정렬',
      nameEn: 'Synthetic Reformer Footwork',
    };
    reformerCore = {
      ...syntheticPlanningExercise('reformer', 'core', 'beta', false),
      nameKo: '합성 헌드레드 코어 호흡',
      nameEn: 'Synthetic Hundred Breath',
    };
    chairLower = {
      ...syntheticPlanningExercise('chair', 'lower-body', 'alpha', false),
      nameKo: '합성 체어 페달 스텝업',
      nameEn: 'Synthetic Chair Step Up',
    };
    matCooldown = {
      ...syntheticPlanningExercise('mat', 'cooldown', 'alpha', false),
      nameKo: '합성 매트 스파인 트위스트',
      nameEn: 'Synthetic Mat Spine Twist',
    };

    seqReformer = {
      id: 'synth-seq-reformer',
      title: '화목 저녁 리포머 집중 플로우',
      subtitle: '골반 중립과 흉곽 호흡 연결',
      apparatus: 'reformer',
      level: '1.5',
      targetMinutes: 50,
      focusTags: ['코어', '골반정렬'],
      steps: [
        makeStep('rf-1', reformerWarm.id, 1, 20, 'warmup'),
        makeStep('rf-2', reformerCore.id, 2, 28, 'core'),
        makeRest('rf-rest', 3, 2),
      ],
      createdAt: '2026-11-01T09:00:00.000Z',
      updatedAt: '2026-11-08T09:00:00.000Z',
      taughtCount: 1,
      // Intentionally omit lastTaughtAt to verify fallback resolution from actual historyLogs
      lastTaughtAt: undefined,
    };

    seqChair = {
      id: 'synth-seq-chair',
      title: '수요 체어 하체 밸런스',
      subtitle: '편측 지지 안정화',
      apparatus: 'chair',
      level: '2.0',
      targetMinutes: 40,
      focusTags: ['하체', '밸런스'],
      steps: [makeStep('ch-1', chairLower.id, 1, 40, 'lower-body')],
      createdAt: '2026-11-02T09:00:00.000Z',
      updatedAt: '2026-11-07T09:00:00.000Z',
      taughtCount: 0,
    };

    seqMat = {
      id: 'synth-seq-mat',
      title: '금요 오전 매트 릴리즈',
      subtitle: '흉추 회전 가동성 회복',
      apparatus: 'mat',
      level: '1.0',
      targetMinutes: 30,
      focusTags: ['가동성'],
      steps: [makeStep('mt-1', matCooldown.id, 1, 30, 'cooldown')],
      createdAt: '2026-11-03T09:00:00.000Z',
      updatedAt: '2026-11-06T09:00:00.000Z',
      taughtCount: 0,
    };

    const historyEntry: ClassHistoryLog = {
      id: 'synth-log-reformer-1',
      sequenceId: seqReformer.id,
      sequenceTitle: seqReformer.title,
      groupId: 'synth-group-evening',
      groupName: '합성 화목 저녁 A반',
      apparatus: 'reformer',
      level: '1.5',
      taughtAt: '2026-11-09T10:30:00.000Z',
      actualDurationSec: 2940,
      instructorReflection: '합성 회고 메모 · 견갑 안정화 큐잉 반응 좋음',
      intensity: 'moderate',
      rating: 5,
      exerciseIds: [reformerWarm.id, reformerCore.id],
      stepsSnapshot: structuredClone(seqReformer.steps),
    };

    usePilatesStore.setState(
      {
        ...originalState,
        activeTab: 'binder',
        exercises: [...INITIAL_EXERCISES, reformerWarm, reformerCore, chairLower, matCooldown],
        savedSequences: [structuredClone(seqReformer), structuredClone(seqChair), structuredClone(seqMat)],
        classGroups: [
          {
            id: 'synth-group-evening',
            name: '합성 화목 저녁 A반',
            type: 'group',
            defaultLevel: '1.5',
            scheduleLabel: '화·목 19:30',
            notes: '',
          },
          {
            id: 'synth-group-morning',
            name: '합성 수금 오전 B반',
            type: 'group',
            defaultLevel: '1.0',
            scheduleLabel: '수·금 10:00',
            notes: '',
          },
        ],
        historyLogs: [historyEntry],
        activeSequenceId: 'draft-empty-init',
        activeTitle: '초기 빈 계획',
        activeSubtitle: '',
        activeSteps: [],
        activeApparatus: 'reformer',
        activeLevel: '1.5',
        activeTargetMinutes: 50,
        undoStack: [],
        generationError: null,
        saveFeedback: null,
        persistenceError: null,
      },
      true,
    );
  });

  afterEach(() => {
    cleanup();
    expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
    usePilatesStore.setState(originalState, true);
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('surfaces compact glance & recent usage on collapsed saved cards, handles whitespace/movement/group search, and supports keyboard quick-filters + focus return', () => {
    // Load seqMat cleanly into workbench so we can also verify the active-plan badge
    usePilatesStore.getState().loadSequenceIntoWorkbench(seqMat.id);
    usePilatesStore.setState({ activeTab: 'binder' });

    render(<ClassBinderView view="saved" onOpenLogModal={vi.fn()} />);

    const reformerCard = within(
      screen.getByRole('heading', { name: seqReformer.title }).closest('article')!,
    );
    // Collapsed glance shows apparatus, level, total minutes, movement/rest count, and recent taught group + count without expanding '더보기'
    expect(
      reformerCard.getByText(/리포머 · Lv 1\.5 · 총 50분 \(동작 2 · 휴식 1\) · 최근 수업 .* · 합성 화목 저녁 A반 \(1회\)/),
    ).toBeVisible();

    const matCard = within(
      screen.getByRole('heading', { name: seqMat.title }).closest('article')!,
    );
    expect(matCard.getByText('현재 계획 열림')).toBeVisible();

    // Whitespace-only query does NOT falsely show empty state, while exposing inline clear & Escape clear
    const searchInput = screen.getByRole('textbox', { name: '저장한 시퀀스 검색' });
    searchInput.focus();
    fireEvent.change(searchInput, { target: { value: '    ' } });
    expect(screen.queryByText('검색한 시퀀스가 없어요')).not.toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(screen.getByRole('button', { name: '저장 시퀀스 검색어 지우기' })).toBeVisible();

    fireEvent.keyDown(searchInput, { key: 'Escape' });
    expect(searchInput).toHaveValue('');
    expect(searchInput).toHaveFocus();

    // Search by included movement name with extra leading/trailing spaces & compact spacing
    fireEvent.change(searchInput, { target: { value: '  페달스텝업  ' } });
    expect(screen.getByRole('status', { name: '저장 시퀀스 검색 결과' })).toHaveTextContent(
      '조건에 맞는 시퀀스 1개',
    );
    expect(screen.getByRole('heading', { name: seqChair.title })).toBeVisible();

    // Search by recently taught class group alias
    fireEvent.change(searchInput, { target: { value: '화목 저녁 A반' } });
    expect(screen.getByRole('heading', { name: seqReformer.title })).toBeVisible();
    expect(screen.queryByRole('heading', { name: seqChair.title })).not.toBeInTheDocument();

    // Zero-result search -> '검색 지우기' restores all items and returns focus to the search input
    fireEvent.change(searchInput, { target: { value: '존재하지않는합성검색어_ZZZ' } });
    expect(screen.getByText('검색한 시퀀스가 없어요')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '검색 지우기' }));
    expect(searchInput).toHaveValue('');
    expect(searchInput).toHaveFocus();
    expect(screen.getAllByRole('article')).toHaveLength(3);

    // Quick-filter chips with roving ArrowRight / End / Home keyboard navigation
    const quickFilterGroup = screen.getByRole('group', { name: '저장 시퀀스 빠른 필터' });
    const allPill = within(quickFilterGroup).getByRole('button', { name: /^전체/ });
    const reformerPill = within(quickFilterGroup).getByRole('button', { name: /^리포머/ });
    const taughtPill = within(quickFilterGroup).getByRole('button', { name: /^최근 수업 있음/ });

    allPill.focus();
    fireEvent.keyDown(quickFilterGroup, { key: 'ArrowRight' });
    expect(reformerPill).toHaveFocus();
    expect(reformerPill).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('article')).toHaveLength(1);

    fireEvent.keyDown(quickFilterGroup, { key: 'End' });
    expect(taughtPill).toHaveFocus();
    expect(taughtPill).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: seqReformer.title })).toBeVisible();

    // One-tap '조건 해제' resets filter & focuses search input
    fireEvent.click(screen.getByRole('button', { name: '조건 해제' }));
    expect(allPill).toHaveAttribute('aria-pressed', 'true');
    expect(searchInput).toHaveFocus();
    expect(screen.getAllByRole('article')).toHaveLength(3);
  });

  it('guards unsaved workbench drafts with inline overwrite confirmation across open, stage start, and print preview while preserving undo and history boundaries', async () => {
    const unsavedSteps = [makeStep('unsaved-step-1', matCooldown.id, 1, 15, 'cooldown')];
    usePilatesStore.setState({
      activeSequenceId: 'draft-unsaved-local',
      activeTitle: '저장 전 작성 중인 매트 초안',
      activeSubtitle: '수업 직전 메모',
      activeApparatus: 'mat',
      activeLevel: '1.0',
      activeTargetMinutes: 15,
      activeSteps: structuredClone(unsavedSteps),
    });

    const historyBefore = structuredClone(usePilatesStore.getState().historyLogs);
    render(<ClassBinderView view="saved" onOpenLogModal={vi.fn()} />);

    const chairCard = within(
      screen.getByRole('heading', { name: seqChair.title }).closest('article')!,
    );
    const openChairBtn = chairCard.getByRole('button', { name: '불러오기' });

    // 1. Clicking '불러오기' with an unsaved draft does NOT immediately overwrite activeSteps
    openChairBtn.focus();
    fireEvent.click(openChairBtn);
    expect(usePilatesStore.getState().activeSteps).toEqual(unsavedSteps);
    expect(usePilatesStore.getState().activeTitle).toBe('저장 전 작성 중인 매트 초안');

    const overwriteRegion = chairCard.getByRole('region', { name: '현재 초안 덮어쓰기 확인' });
    expect(overwriteRegion).toHaveTextContent('저장 전 작성 중인 매트 초안');
    expect(overwriteRegion).toHaveTextContent('동작 1개');

    // 2. Escape cancels confirmation and restores focus to the exact trigger button
    fireEvent.keyDown(overwriteRegion, { key: 'Escape' });
    expect(chairCard.queryByRole('region', { name: '현재 초안 덮어쓰기 확인' })).not.toBeInTheDocument();
    expect(openChairBtn).toHaveFocus();
    expect(usePilatesStore.getState().activeSteps).toEqual(unsavedSteps);

    // 3. '현재 초안 먼저 보기' navigates to workbench without mutating the unsaved draft
    fireEvent.click(openChairBtn);
    fireEvent.click(
      within(chairCard.getByRole('region', { name: '현재 초안 덮어쓰기 확인' })).getByRole(
        'button',
        { name: '현재 초안 먼저 보기' },
      ),
    );
    expect(usePilatesStore.getState().activeTab).toBe('workbench');
    expect(usePilatesStore.getState().activeSteps).toEqual(unsavedSteps);

    // 4. Print preview modal '이 계획 불러오기' also respects the unsaved-draft guard
    usePilatesStore.setState({ activeTab: 'binder' });
    fireEvent.click(chairCard.getByRole('button', { name: `${seqChair.title} 더보기` }));
    fireEvent.click(chairCard.getByRole('button', { name: '인쇄' }));
    const printDialog = screen.getByRole('dialog', { name: '수업 계획 인쇄' });
    fireEvent.click(within(printDialog).getByRole('button', { name: '이 계획 불러오기' }));
    expect(screen.queryByRole('dialog', { name: '수업 계획 인쇄' })).not.toBeInTheDocument();
    expect(usePilatesStore.getState().activeSteps).toEqual(unsavedSteps);
    const confirmFromPrint = chairCard.getByRole('region', { name: '현재 초안 덮어쓰기 확인' });
    fireEvent.click(within(confirmFromPrint).getByRole('button', { name: '취소' }));
    expect(openChairBtn).toHaveFocus();

    // 5. '수업 시작' inside expanded details triggers stage-mode overwrite confirmation, and confirming pushes the prior draft to undoStack
    const stageBtn = chairCard.getByRole('button', { name: '수업 시작' });
    fireEvent.click(stageBtn);
    const stageConfirm = chairCard.getByRole('region', { name: '현재 초안 덮어쓰기 확인' });
    const confirmStageBtn = within(stageConfirm).getByRole('button', {
      name: '초안 덮어쓰고 수업 시작',
    });
    await waitFor(() => expect(confirmStageBtn).toHaveFocus());
    fireEvent.click(confirmStageBtn);

    expect(usePilatesStore.getState().activeTab).toBe('stage');
    expect(usePilatesStore.getState().activeSequenceId).toBe(seqChair.id);
    expect(usePilatesStore.getState().historyLogs).toEqual(historyBefore);

    // Undo restores the previous unsaved draft intact
    usePilatesStore.getState().undoSequence();
    expect(usePilatesStore.getState().activeTitle).toBe('저장 전 작성 중인 매트 초안');
    expect(usePilatesStore.getState().activeSteps).toEqual(unsavedSteps);
  });

  it('releases individual history filters without reopening collapsed details, preserves snapshot immutability, and surfaces active-draft undo protection', () => {
    const chairSteps = [
      makeStep('hist-ch-1', chairLower.id, 1, 20, 'lower-body'),
      makeStep('hist-ch-2', matCooldown.id, 2, 15, 'cooldown'),
    ];
    const chairSnapshot = buildTeachingProgramSnapshot({
      sourceKind: 'saved-sequence',
      sequenceId: seqChair.id,
      sequenceTitle: seqChair.title,
      apparatus: 'chair',
      level: '2.0',
      taughtAt: '2026-11-08T08:00:00.000Z',
      groupId: 'synth-group-morning',
      steps: chairSteps,
      exercises: usePilatesStore.getState().exercises,
    });
    const chairLog: ClassHistoryLog = {
      id: 'synth-log-chair-1',
      sequenceId: seqChair.id,
      sequenceTitle: seqChair.title,
      groupId: 'synth-group-morning',
      groupName: '합성 수금 오전 B반',
      apparatus: 'chair',
      level: '2.0',
      taughtAt: '2026-11-08T08:00:00.000Z',
      actualDurationSec: 2100,
      instructorReflection: '합성 체어 기록 메모',
      intensity: 'intense',
      rating: 5,
      exerciseIds: [chairLower.id, matCooldown.id],
      stepsSnapshot: structuredClone(chairSteps),
    };

    usePilatesStore.setState((state) => ({
      historyLogs: [state.historyLogs[0]!, chairLog],
      activeSequenceId: 'draft-unsaved-in-history',
      activeTitle: '보존될 현재 작업 초안',
      activeSteps: [makeStep('draft-keep-1', reformerWarm.id, 1, 12, 'warmup')],
    }));
    attachProgramSnapshotToHistoryLog(chairLog.id, chairSnapshot, usePilatesStore.setState);

    // Mutate catalog exercise name and live saved sequence later to verify immutable snapshot preservation
    act(() => {
      usePilatesStore.setState((state) => ({
        exercises: state.exercises.map((ex) =>
          ex.id === chairLower.id ? { ...ex, nameKo: '나중에 변경된 체어 동작명' } : ex,
        ),
        savedSequences: state.savedSequences.map((seq) =>
          seq.id === seqChair.id
            ? {
                ...seq,
                title: '나중에 바뀐 저장 시퀀스 제목',
                apparatus: 'mat',
                level: '1.0',
              }
            : seq,
        ),
      }));
    });

    const frozenLogsBefore = structuredClone(usePilatesStore.getState().historyLogs);
    const { container } = render(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);

    // Active draft protection notice is visible and honest
    const draftNotice = screen.getByRole('region', { name: '현재 작성 중인 초안 안내' });
    expect(draftNotice).toHaveTextContent('보존될 현재 작업 초안');
    expect(within(draftNotice).getByRole('button', { name: '현재 초안 보기' })).toBeVisible();

    // Collapsed history card shows canonical snapshot apparatus·level pill ('운다 체어 · Lv 2.0') and movement preview despite later saved-sequence/catalog edits
    const chairHistoryCard = within(
      screen.getByRole('heading', { name: seqChair.title }).closest('article')!,
    );
    const metaPill = chairHistoryCard.getByText('운다 체어 · Lv 2.0');
    expect(metaPill).toBeVisible();
    expect(metaPill).toHaveClass('teaching-history-meta-pill');
    expect(chairHistoryCard.getByText('원본 수정 후에도 당시 스냅샷 유지됨')).toBeVisible();
    const detailsSummary = chairHistoryCard
      .getByText(/수업 구성 · 2개 동작 보기/)
      .closest('summary')!;
    expect(detailsSummary).toHaveTextContent(
      '수업 구성 · 2개 동작 보기 · 합성 체어 페달 스텝업, 합성 매트 스파인 트위스트',
    );

    // Reopened history detail modal also preserves the exact snapshot apparatus·level ('운다 체어 · Lv. 2.0')
    fireEvent.click(chairHistoryCard.getByRole('button', { name: '당시 시퀀스 보기' }));
    const historyDetailDialog = screen.getByRole('dialog', { name: '진행 완료 수업 이력 상세' });
    expect(
      within(historyDetailDialog).getByText('합성 수금 오전 B반 · 운다 체어 · Lv. 2.0'),
    ).toBeVisible();
    fireEvent.click(within(historyDetailDialog).getAllByRole('button', { name: '닫기' }).at(-1)!);

    // Whitespace-only query in history keeps both cards visible
    const historySearch = screen.getByRole('textbox', { name: '수업 기록 검색' });
    historySearch.focus();
    fireEvent.change(historySearch, { target: { value: '   ' } });
    expect(
      within(screen.getByRole('region', { name: '수업 기록 목록' })).getAllByRole('article'),
    ).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: '수업 기록 검색어 지우기' }));
    expect(historySearch).toHaveValue('');
    expect(historySearch).toHaveFocus();

    // Combine group filter + search query, collapse <details>, then release ONLY the search query chip while keeping group filter
    const filterDetails = container.querySelector<HTMLDetailsElement>('.teaching-history-filters')!;
    filterDetails.open = true;
    fireEvent(filterDetails, new Event('toggle'));
    fireEvent.click(screen.getByRole('button', { name: '합성 수금 오전 B반' }));
    filterDetails.open = false;
    fireEvent(filterDetails, new Event('toggle'));

    fireEvent.change(historySearch, { target: { value: '  체어  ' } });
    expect(
      screen.getByRole('button', { name: '검색어 필터 해제: 체어' }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: '그룹 필터 해제: 합성 수금 오전 B반' }),
    ).toBeVisible();

    // Release only the search chip -> group filter remains active ('합성 수금 오전 B반', 1 card) and focus returns to search box
    fireEvent.click(screen.getByRole('button', { name: '검색어 필터 해제: 체어' }));
    expect(historySearch).toHaveValue('');
    expect(historySearch).toHaveFocus();
    expect(
      screen.queryByRole('button', { name: '검색어 필터 해제: 체어' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '그룹 필터 해제: 합성 수금 오전 B반' }),
    ).toBeVisible();
    expect(
      within(screen.getByRole('region', { name: '수업 기록 목록' })).getAllByRole('article'),
    ).toHaveLength(1);

    // Copy history into workbench -> historyLogs snapshot stays strictly immutable and prior draft is recoverable via undoSequence()
    fireEvent.click(chairHistoryCard.getByRole('button', { name: '복사해 새 수업 만들기' }));
    expect(usePilatesStore.getState().activeTab).toBe('workbench');
    expect(usePilatesStore.getState().activeTitle).toBe(`${seqChair.title} (기록에서 복사)`);
    expect(usePilatesStore.getState().historyLogs).toEqual(frozenLogsBefore);

    usePilatesStore.getState().undoSequence();
    expect(usePilatesStore.getState().activeTitle).toBe('보존될 현재 작업 초안');
  });
});
