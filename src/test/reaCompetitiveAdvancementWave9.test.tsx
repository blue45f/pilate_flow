import { createRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ClassBinderView } from '../components/ClassBinderView';
import { InstructorScheduleView } from '../components/InstructorScheduleView';
import { LibraryMovementInspector } from '../components/LibraryMovementInspector';
import { LiveStageView } from '../components/LiveStageView';
import { MemberBookingView } from '../components/MemberBookingView';
import { OfflinePresetPicker } from '../components/OfflinePresetPicker';
import { SequenceStudioWorkbench } from '../components/SequenceStudioWorkbench';
import { StudioCommandPalette } from '../components/StudioCommandPalette';
import { TeachingBalanceInsightCard } from '../components/TeachingBalanceInsightCard';
import { OFFLINE_CLASS_PRESETS } from '../data/classBlockPresets';
import { parseAtlasFilters } from '../hooks/useAtlasFilterEngine';
import { usePilatesStore } from '../store/usePilatesStore';
import { computeBilateralStageProgress } from '../utils/liveStageBilateralTracker';
import {
  buildMemberPostClassRecap,
  computePassDdaySummary,
  MEMBER_COMPANION_STORAGE_KEY,
} from '../utils/memberHomeCareRecap';
import {
  analyzeExerciseKinesiology,
  summarizeSequenceSpinalAndFlowBalance,
} from '../utils/pilatesKinesiologyIntelligence';
import { buildStudioCareBriefing } from '../utils/studioCarePlaybookEngine';
import {
  addTagToRoutine,
  deleteStudioRoutineTag,
  exportStudioRoutineTagsSnapshot,
  getRoutineTagsForId,
  getStudioRoutineTagsState,
  importStudioRoutineTagsSnapshot,
  normalizeRoutineTag,
  presetRoutineTagTargetId,
  renameStudioRoutineTag,
  resetStudioRoutineTagsForTest,
} from '../utils/studioRoutineTags';

describe('Wave 9 REA Competitive Internalization & Advancement Suite', () => {
  beforeEach(() => {
    resetStudioRoutineTagsForTest();
    window.localStorage.removeItem(MEMBER_COMPANION_STORAGE_KEY);
  });

  it('R1: normalizes, deduplicates, renames, and label-only deletes studio routine tags', () => {
    expect(normalizeRoutineTag('  ##수요일   오전반  ')).toBe('수요일 오전반');

    const first = addTagToRoutine('seq-alpha', '#수요일오전');
    expect(first.ok).toBe(true);
    expect(first.tag).toBe('수요일오전');

    const dup = addTagToRoutine('seq-alpha', '수요일오전');
    expect(dup.ok).toBe(true);
    expect(getRoutineTagsForId(getStudioRoutineTagsState(), 'seq-alpha')).toEqual(['수요일오전']);

    const renamed = renameStudioRoutineTag('수요일오전', '수요일정규');
    expect(renamed.ok).toBe(true);
    expect(getRoutineTagsForId(getStudioRoutineTagsState(), 'seq-alpha')).toEqual(['수요일정규']);

    const deleted = deleteStudioRoutineTag('수요일정규');
    expect(deleted.ok).toBe(true);
    expect(deleted.detachedCount).toBe(1);
    expect(getRoutineTagsForId(getStudioRoutineTagsState(), 'seq-alpha')).toEqual([]);
  });

  it('R1 UI: filters saved sequences by 1-tap routine tag chips and opens tag sheet in ClassBinderView', () => {
    const seqs = usePilatesStore.getState().savedSequences;
    expect(seqs.length).toBeGreaterThanOrEqual(2);
    const targetSeq = seqs[0]!;
    const otherSeq = seqs[1]!;

    addTagToRoutine(targetSeq.id, '산전완화특강');

    render(<ClassBinderView onOpenLogModal={vi.fn()} view="saved" />);

    const filterBar = screen.getByTestId('binder-routine-tag-filter-bar');
    expect(filterBar).toBeVisible();

    const tagFilterBtn = screen.getByTestId('binder-filter-tag-산전완화특강');
    fireEvent.click(tagFilterBtn);

    expect(screen.getByText(targetSeq.title)).toBeVisible();
    expect(screen.queryByText(otherSeq.title)).toBeNull();

    // Toggling off restores full list
    fireEvent.click(tagFilterBtn);
    expect(screen.getByText(otherSeq.title)).toBeVisible();

    // Open per-card tag sheet
    fireEvent.click(screen.getByTestId(`routine-add-tag-btn-${targetSeq.id}`));
    expect(screen.getByTestId('routine-tag-sheet-dialog')).toBeVisible();
  });

  it('R2: computes bilateral side-switch progress and renders TV Widescreen Mode + Live Checklist in LiveStageView', () => {
    const exercises = usePilatesStore.getState().exercises;
    const unilateralEx = exercises.find((ex) => ex.isUnilateral) ?? exercises[0]!;
    const secondEx = exercises.find((ex) => ex.id !== unilateralEx.id) ?? exercises[1]!;

    const step = {
      stepId: 'uni-1',
      order: 1,
      exerciseId: unilateralEx.id,
      blockCategory: unilateralEx.blockCategory,
      durationMin: 4,
      explanationSec: 20,
      transitionSec: 20,
      sideMode: 'left-then-right' as const,
      selectedLayer: 'standard' as const,
    };

    // Total 240s: 20s explanation, 200s movement (100s per side), 20s transition.
    // At remaining 123s -> elapsed 117s -> movementElapsed 97s -> 3s left on side 1 (switch alert!)
    const nearSwitch = computeBilateralStageProgress({
      step,
      exercise: unilateralEx,
      remainingMs: 123_000,
      stepDurationMs: 240_000,
    });
    expect(nearSwitch.isBilateral).toBe(true);
    expect(nearSwitch.activeSideIndex).toBe(1);
    expect(nearSwitch.isSwitchAlertWindow).toBe(true);

    usePilatesStore.setState({
      activeTitle: '양측 밸런스 리포머 라이브',
      activeTargetMinutes: 30,
      activeSteps: [
        step,
        {
          stepId: 'uni-2',
          order: 2,
          exerciseId: secondEx.id,
          blockCategory: secondEx.blockCategory,
          durationMin: 4,
          selectedLayer: 'standard',
        },
      ],
    });

    const { container } = render(<LiveStageView onOpenLogModal={vi.fn()} />);

    expect(screen.getByTestId('live-stage-bilateral-bar')).toBeVisible();

    const tvBtn = screen.getByTestId('live-stage-tv-mode-toggle');
    fireEvent.click(tvBtn);
    expect(container.querySelector('[data-tv-widescreen="true"]')).not.toBeNull();

    const checklistToggle = screen.getByTestId('live-stage-checklist-toggle');
    fireEvent.click(checklistToggle);
    const drawer = screen.getByTestId('live-stage-checklist-drawer');
    expect(drawer).toBeVisible();
    const firstCheckbox = within(drawer).getAllByRole('checkbox')[0]!;
    fireEvent.click(firstCheckbox);
    expect(firstCheckbox).toBeChecked();
  });

  it('R3 & R6: surfaces 3-role kinesiology & compensation-fault guidance in LibraryMovementInspector and spinal balance strip in Workbench', () => {
    const exercises = usePilatesStore.getState().exercises;
    const sample = exercises[0]!;
    const profile = analyzeExerciseKinesiology(sample);
    expect(profile.agonistsKo.length).toBeGreaterThan(0);
    expect(profile.stabilizersKo.length).toBeGreaterThan(0);
    expect(profile.commonFaultKo.length).toBeGreaterThan(5);
    expect(profile.correctionCueKo.length).toBeGreaterThan(5);

    const byId = new Map(exercises.map((ex) => [ex.id, ex]));
    const steps = exercises.slice(0, 5).map((ex, i) => ({
      stepId: `bal-${i}`,
      order: i + 1,
      exerciseId: ex.id,
      blockCategory: ex.blockCategory,
      durationMin: 4,
      selectedLayer: 'standard' as const,
    }));
    const balance = summarizeSequenceSpinalAndFlowBalance(steps, byId);
    expect(balance.totalExerciseCount).toBe(5);

    render(
      <LibraryMovementInspector
        exercise={sample}
        headingRef={createRef()}
        isInResults
        onClose={vi.fn()}
        onOpenDetails={vi.fn()}
        onAdd={vi.fn()}
        addedId={null}
      />,
    );
    expect(screen.getByTestId('exercise-kinesiology-card')).not.toBeVisible();
    fireEvent.click(screen.getByText('수업 준비와 강도 조절'));
    expect(screen.getByTestId('exercise-kinesiology-card')).toBeVisible();
    expect(screen.getByTestId('kinesiology-agonists')).toBeVisible();
    expect(screen.getByTestId('kinesiology-stabilizers')).toBeVisible();
    expect(screen.getByTestId('kinesiology-compensation-fault')).toBeVisible();

    usePilatesStore.setState({ activeSteps: steps });
    render(
      <SequenceStudioWorkbench
        onOpenYouTubePreview={vi.fn()}
        onOpenClipper={vi.fn()}
        onOpenLogModal={vi.fn()}
        onOpenInventory={vi.fn()}
        onStartClass={vi.fn()}
      />,
    );
    expect(screen.getByTestId('workbench-spinal-balance-strip')).toBeVisible();
  });

  it('R4: renders pass D-Day simulation, studio architectural floor orientation, and post-class home-care prescription in MemberBookingView', () => {
    const dday = computePassDdaySummary({
      expiresAtIso: '2026-11-23',
      todayIso: '2026-11-18',
      remainingCount: 2,
      totalCount: 20,
    });
    expect(dday.ddayLabelKo).toBe('만료 D-5');
    expect(dday.urgencyTone).toBe('soon');

    const recap = buildMemberPostClassRecap({
      title: '리포머 둔근·하지 런지 플로우',
      apparatus: 'reformer',
      focusTagsKo: ['둔근·하지 밸런스'],
    });
    expect(recap.homeExercises).toHaveLength(2);

    render(<MemberBookingView />);
    expect(screen.getByTestId('member-pass-dday-summary')).toBeVisible();
  });

  it('R5: synthesizes privacy-safe local Studio Care Playbooks and renders copyable follow-up drafts in InstructorScheduleView', () => {
    const store = usePilatesStore.getState();
    const briefing = buildStudioCareBriefing({
      selectedDate: '2026-11-18',
      occurrences: [
        {
          id: 'occ-1',
          classId: 'cls-1',
          originalDate: '2026-11-18',
          date: '2026-11-18',
          startTime: '10:00',
          endTime: '10:50',
          title: '오전 리포머 시그니처',
          participantAlias: '오전반',
          locationId: store.instructorSchedule.locations[0]?.id ?? 'loc-1',
          notes: '',
          status: 'scheduled',
        },
      ],
      schedule: store.instructorSchedule,
      classGroups: [
        {
          id: 'grp-neck',
          name: '화목 오전 케어반',
          type: 'group',
          defaultLevel: '1.0',
          scheduleLabel: '화·목 10:00',
          notes: '목·어깨 과긴장 및 손목 부담 완화 필요 회원 포함',
        },
      ],
      historyLogs: store.historyLogs,
      savedSequences: store.savedSequences,
      datedAssignments: [],
    });
    expect(briefing.items.length).toBeGreaterThanOrEqual(2);
    expect(briefing.provenanceNoteKo).toContain('자동 발송 없음');

    usePilatesStore.setState({
      classGroups: [
        ...store.classGroups,
        {
          id: 'grp-care-ui',
          name: '수금 리포머 케어반',
          type: 'group',
          defaultLevel: '1.0',
          scheduleLabel: '수·금 11:00',
          notes: '어깨·손목 완화 레이어 안내 필요',
        },
      ],
    });
    render(<InstructorScheduleView today="2026-11-18" />);
    const panel = screen.getByTestId('studio-care-playbook-panel');
    expect(panel).toBeInTheDocument();
    const summaryEl = within(panel).getByText('오늘 먼저 챙길 수업·그룹 케어 플레이북');
    expect(summaryEl).toBeVisible();
    fireEvent.click(summaryEl);
    expect(screen.getByTestId('studio-care-active-card')).toBeVisible();
    expect(screen.getByTestId('studio-care-draft-text')).toBeVisible();
  });

  it('R7: exports/imports portable studio tag snapshots and filters OfflinePresetPicker by studio #tags without mutating presets', () => {
    const firstPreset = OFFLINE_CLASS_PRESETS[0]!;
    const secondPreset = OFFLINE_CLASS_PRESETS[1]!;
    const presetTargetId = presetRoutineTagTargetId('class', firstPreset.id);

    addTagToRoutine(presetTargetId, '금요원장특강');
    const snapshot = exportStudioRoutineTagsSnapshot();
    resetStudioRoutineTagsForTest();
    expect(getRoutineTagsForId(getStudioRoutineTagsState(), presetTargetId)).toEqual([]);

    const imported = importStudioRoutineTagsSnapshot(snapshot, 'replace');
    expect(imported.ok).toBe(true);
    expect(getRoutineTagsForId(getStudioRoutineTagsState(), presetTargetId)).toEqual(['금요원장특강']);

    render(<OfflinePresetPicker onApplied={vi.fn()} />);
    const searchInput = screen.getByLabelText('프리셋 제목 또는 요약 검색');
    fireEvent.change(searchInput, { target: { value: '#금요원장특강' } });

    expect(screen.getByText(firstPreset.title)).toBeVisible();
    expect(screen.queryByText(secondPreset.title)).toBeNull();
  });

  it('R8: searches saved sequences by #routine-tag and exercises by kinesiology stabilizer/fault in StudioCommandPalette (⌘K)', () => {
    const seqs = usePilatesStore.getState().savedSequences;
    const targetSeq = seqs[0]!;
    addTagToRoutine(targetSeq.id, '체형교정시그니처');

    render(
      <StudioCommandPalette
        open
        onClose={vi.fn()}
        onNavigateTab={vi.fn()}
        onLoadSequence={vi.fn()}
        onSwitchPortalRole={vi.fn()}
        onInspectExercise3D={vi.fn()}
        onOpenNewIdea={vi.fn()}
        canStartLiveStage
      />,
    );

    const input = screen.getByTestId('studio-command-palette-input');
    fireEvent.change(input, { target: { value: '#체형교정시그니처' } });
    expect(screen.getByText(targetSeq.title)).toBeVisible();

    fireEvent.change(input, { target: { value: '익상견갑' } });
    expect(screen.queryByText('일치하는 동작이 없어요. 기구명이나 타겟 근육으로 검색해 보세요.')).toBeNull();
  });

  it('R9, R10 & R11: surfaces progression layers in Inspector, unilateral filter in Atlas, TV Companion Board in LiveStage, and Pacing/Milestones in History', () => {
    const parsed = parseAtlasFilters({ sides: 'unilateral' });
    expect(parsed.sides).toBe('unilateral');
    const parsedInvalid = parseAtlasFilters({ sides: 'invalid-mode' });
    expect(parsedInvalid.sides).toBe('all');

    const exercises = usePilatesStore.getState().exercises;
    const layeredEx =
      exercises.find((ex) => ex.layers.easy && ex.layers.standard && ex.layers.hard) ?? exercises[0]!;

    render(
      <LibraryMovementInspector
        exercise={layeredEx}
        headingRef={createRef()}
        isInResults
        onClose={vi.fn()}
        onOpenDetails={vi.fn()}
        onAdd={vi.fn()}
        addedId={null}
      />,
    );
    expect(screen.getByTestId('inspector-layers-progression-card')).not.toBeVisible();
    fireEvent.click(screen.getByText('수업 준비와 강도 조절'));
    expect(screen.getByTestId('inspector-layers-progression-card')).toBeVisible();

    usePilatesStore.setState({
      activeTitle: 'TV 미러링 전광판 검증',
      activeTargetMinutes: 20,
      activeSteps: [
        {
          stepId: 'tv-step-1',
          order: 1,
          exerciseId: layeredEx.id,
          blockCategory: layeredEx.blockCategory,
          durationMin: 4,
          selectedLayer: 'easy',
        },
      ],
    });
    render(<LiveStageView onOpenLogModal={vi.fn()} />);
    fireEvent.click(screen.getByTestId('live-stage-tv-mode-toggle'));
    expect(screen.getByTestId('live-stage-tv-companion-board')).toBeVisible();
    expect(screen.getByTestId('live-stage-tv-coach-subtitle')).toHaveTextContent('실시간 코칭 자막');

    const logs = Array.from({ length: 6 }, (_, idx) => ({
      id: `log-ms-${idx}`,
      sequenceId: 'seq-1',
      sequenceTitle: '오전 코어 클래스',
      groupId: 'grp-1',
      groupName: '화목 오전 정규반',
      taughtAt: `2026-11-${String(10 + idx).padStart(2, '0')}T10:00:00.000Z`,
      apparatus: 'reformer' as const,
      level: '1.0' as const,
      exerciseIds: [layeredEx.id],
      rating: 5 as const,
      intensity: 'moderate' as const,
      instructorReflection: '정렬 안정적',
      actualDurationSec: 3120,
      criteriaSnapshot: {
        focusPreset: 'full-body' as const,
        apparatus: 'reformer' as const,
        ownedApparatus: ['reformer' as const],
        preferredProps: [],
        level: '1.0' as const,
        defaultLayer: 'standard' as const,
        targetMinutes: 50,
        excludeDaysWindow: 10,
      },
    }));

    render(
      <TeachingBalanceInsightCard
        actualLogs={logs}
        resolvedHistoryMap={new Map()}
        exercisesMap={new Map(exercises.map((e) => [e.id, e]))}
        onJumpToWorkbench={vi.fn()}
      />,
    );
    const milestoneStrip = screen.getByTestId('balance-pacing-milestone-strip');
    expect(milestoneStrip).toBeVisible();
    expect(milestoneStrip).toHaveTextContent('화목 오전 정규반');
    expect(milestoneStrip).toHaveTextContent('5회+ 루틴 형성 반');
    expect(milestoneStrip).toHaveTextContent('+2분 여유 진행');
  });
});
