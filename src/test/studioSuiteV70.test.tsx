import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { ClassBinderView } from '../components/ClassBinderView';
import { CurriculumProgressionSheet } from '../components/CurriculumProgressionSheet';
import { InstructorScheduleView } from '../components/InstructorScheduleView';
import { LiveStageView } from '../components/LiveStageView';
import { MemberBookingView } from '../components/MemberBookingView';
import { StudioCircuitPlannerCard } from '../components/StudioCircuitPlannerCard';
import { stepSchema } from '../schemas/cloudBackupSchema';
import { usePilatesStore } from '../store/usePilatesStore';
import type { ClassHistoryLog, SavedSequence } from '../types/pilates';
import { generateStudioCircuitPlan } from '../utils/circuitPlannerEngine';
import {
  buildSavedSequenceFromWeekDraft,
  generateFourWeekCurriculum,
} from '../utils/fourWeekProgressionEngine';
import {
  analyzeHistoryLogsForNextClass,
  buildAdaptiveNextClassDraft,
} from '../utils/historyAdaptiveBridge';
import {
  parseLiveRemoteKey,
  parseLiveVoiceCommand,
} from '../utils/liveHandsfreeController';
import { isRestStep } from '../utils/sequenceEngine';

const originalState = usePilatesStore.getState();

describe('Flow Atelier v7.0 Studio Suite & Regression Contracts', () => {
  beforeEach(() => {
    localStorage.clear();
    usePilatesStore.setState(originalState, true);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    usePilatesStore.setState(originalState, true);
    localStorage.clear();
  });

  it('parses Korean/English hands-free voice phrases and Bluetooth remote/pedal keys accurately', () => {
    expect(parseLiveVoiceCommand('다음 동작으로 넘어가 줘')?.kind).toBe('next-step');
    expect(parseLiveVoiceCommand('이전 동작')?.kind).toBe('prev-step');
    expect(parseLiveVoiceCommand('잠깐 멈춰')?.kind).toBe('pause');
    expect(parseLiveVoiceCommand('다시 시작')?.kind).toBe('resume');
    expect(parseLiveVoiceCommand('15초 추가')?.kind).toBe('extend-15s');
    expect(parseLiveVoiceCommand('30초 연장')?.kind).toBe('extend-30s');
    expect(parseLiveVoiceCommand('큐시트 열어')?.kind).toBe('toggle-cuesheet');

    expect(parseLiveRemoteKey({ key: 'PageDown' })?.kind).toBe('next-step');
    expect(parseLiveRemoteKey({ key: 'MediaTrackNext' })?.kind).toBe('next-step');
    expect(parseLiveRemoteKey({ key: 'PageUp' })?.kind).toBe('prev-step');
    expect(parseLiveRemoteKey({ key: ']' })?.kind).toBe('extend-15s');
    expect(parseLiveRemoteKey({ key: '+' })?.kind).toBe('extend-30s');
  });

  it('executes Bluetooth clicker keys and +15s/+30s extensions directly in LiveStageView', () => {
    const state = usePilatesStore.getState();
    const firstTwo = state.exercises.slice(0, 2);
    usePilatesStore.setState({
      activeSteps: firstTwo.map((ex, i) => ({
        kind: 'exercise',
        stepId: `live-v70-${i}`,
        order: i + 1,
        exerciseId: ex.id,
        blockCategory: ex.blockCategory,
        durationMin: 2,
        selectedLayer: 'standard',
      })),
    });

    render(<LiveStageView onOpenLogModal={vi.fn()} />);
    expect(screen.getByTestId('live-remote-ready-strip')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: firstTwo[0].nameKo })).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('live-stage-extend-15s-btn'));
    expect(screen.getByRole('timer')).toHaveTextContent('02:15');

    fireEvent.keyDown(window, { key: 'PageDown', code: 'PageDown' });
    expect(screen.getByRole('heading', { level: 2, name: firstTwo[1].nameKo })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'PageUp', code: 'PageUp' });
    expect(screen.getByRole('heading', { level: 2, name: firstTwo[0].nameKo })).toBeInTheDocument();
  });

  it('builds schema-valid adaptive follow-up sequences from instructor history reflections and preserves existing logs', () => {
    const state = usePilatesStore.getState();
    const wristEx =
      state.exercises.find((e) => e.blockCategory === 'plank' || e.bodyPosition === 'quadruped') ??
      state.exercises[0];
    const coreEx = state.exercises.find((e) => e.blockCategory === 'core') ?? state.exercises[1];
    const warmEx = state.exercises.find((e) => e.blockCategory === 'warmup') ?? state.exercises[2];
    const coolEx = state.exercises.find((e) => e.blockCategory === 'cooldown') ?? state.exercises[3];

    const feedbackLog: ClassHistoryLog = {
      id: 'log-v70-feedback-1',
      sequenceId: 'seq-prev-1',
      sequenceTitle: '저녁 그룹 플로우',
      groupId: state.classGroups[0]?.id ?? 'grp-1',
      groupName: state.classGroups[0]?.name ?? '저녁반',
      taughtAt: '2026-11-10T10:00:00.000Z',
      apparatus: 'reformer',
      level: '2.0',
      exerciseIds: [warmEx.id, wristEx.id, coreEx.id, coolEx.id],
      rating: 2,
      intensity: 'intense',
      instructorReflection: '플랭크에서 손목 부담 관찰, 스프링 무거움 피드백 확인.',
    };

    const signal = analyzeHistoryLogsForNextClass([feedbackLog]);
    expect(signal).not.toBeNull();
    expect(signal!.cautionTags).toContain('wrist');
    expect(signal!.springLoadSignal).toBe('step-down');
    expect(signal!.recommendedLayer).toBe('easy');

    const prescription = buildAdaptiveNextClassDraft({
      logs: [feedbackLog],
      exercises: state.exercises,
      ownedEquipment: state.ownedEquipment,
    });
    expect(prescription).not.toBeNull();
    for (const step of prescription!.steps) {
      expect(stepSchema.safeParse(step).success).toBe(true);
    }

    usePilatesStore.setState({ historyLogs: [feedbackLog] });
    render(<ClassBinderView view="history" onOpenLogModal={vi.fn()} />);
    expect(screen.getByTestId('binder-adaptive-bridge-card')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('binder-apply-adaptive-next-btn'));
    expect(usePilatesStore.getState().activeTitle).toContain('피드백 보정');
    expect(usePilatesStore.getState().historyLogs).toHaveLength(1);
    expect(usePilatesStore.getState().historyLogs[0].id).toBe('log-v70-feedback-1');
  });

  it('generates multi-apparatus circuit sequences and 4-week progressive curricula that pass cloudBackupSchema', () => {
    const state = usePilatesStore.getState();
    const circuit = generateStudioCircuitPlan({
      exercises: state.exercises,
      ownedEquipment: state.ownedEquipment,
      stationCount: 3,
      roundCount: 2,
      transitionSec: 45,
      targetMinutes: 50,
    });
    expect(circuit).not.toBeNull();
    for (const step of circuit!.steps) {
      expect(stepSchema.safeParse(step).success).toBe(true);
    }

    render(<StudioCircuitPlannerCard />);
    fireEvent.click(screen.getByTestId('circuit-replace-apply-btn'));
    expect(usePilatesStore.getState().activeApparatus).toBe('mixed');
    cleanup();

    const curriculum = generateFourWeekCurriculum({
      exercises: state.exercises,
      themeId: 'posture-core',
      apparatus: 'reformer',
      baseLevel: '1.0',
      targetMinutes: 50,
      groupLabelKo: '월수금 체형반',
    });
    expect(curriculum).not.toBeNull();
    expect(curriculum!.weeks).toHaveLength(4);
    for (const wk of curriculum!.weeks) {
      const seq = buildSavedSequenceFromWeekDraft(wk);
      expect(seq.focusTags.length).toBeGreaterThan(0);
      expect(seq.taughtCount).toBe(0);
    }

    const beforeSavedCount = usePilatesStore.getState().savedSequences.length;
    render(<CurriculumProgressionSheet />);
    fireEvent.click(screen.getByTestId('curriculum-save-all-4weeks-btn'));
    expect(usePilatesStore.getState().savedSequences.length).toBe(beforeSavedCount + 4);
  });

  it('opens global Cmd+K StudioCommandPalette from App topbar and loads a saved sequence without error', () => {
    render(<App />);
    const openBtn = screen.getByTestId('topbar-command-palette-btn');
    fireEvent.click(openBtn);
    const dialog = screen.getByTestId('studio-command-palette');
    expect(dialog).toBeInTheDocument();

    const saved = usePilatesStore.getState().savedSequences[0];
    if (saved) {
      const seqButtons = within(dialog).getAllByRole('button', { name: /불러오기/ });
      expect(seqButtons.length).toBeGreaterThan(0);
      fireEvent.click(seqButtons[0]);
    }
  });

  it('renders MemberBookingView 360 preview drawer on booking confirmation and InstructorScheduleView cleanly', () => {
    render(<MemberBookingView onSwitchToInstructor={vi.fn()} />);
    const reserveBtns = screen.getAllByRole('button', { name: /예약하기/ });
    const firstEnabled = reserveBtns.find((b) => !b.hasAttribute('disabled')) ?? reserveBtns[0];
    fireEvent.click(firstEnabled);
    expect(screen.getByTestId('member-spot-360-preview-drawer')).toBeInTheDocument();
    cleanup();

    render(<InstructorScheduleView />);
    expect(document.body.textContent).toBeTruthy();
  });

  it('completes full core instructor journey (수업 작성 → 저장 → 진행 → 기록) while preserving pre-existing user data and 3D visual elements', async () => {
    vi.useFakeTimers({
      toFake: ['Date', 'performance', 'setInterval', 'clearInterval'],
    });
    vi.setSystemTime(new Date('2026-11-12T10:00:00.000Z'));

    const baseState = usePilatesStore.getState();
    const eligibleReformer = baseState.exercises.filter(
      (ex) => ex.apparatus === 'reformer' && ex.id.startsWith('original-'),
    );
    const exWarm = eligibleReformer.find((e) => e.blockCategory === 'warmup') ?? eligibleReformer[0];
    const exMain = eligibleReformer.find((e) => e.blockCategory === 'core') ?? eligibleReformer[1];
    const exCool = eligibleReformer.find((e) => e.blockCategory === 'cooldown') ?? eligibleReformer[2];

    const existingUserSeq: SavedSequence = {
      id: 'user-existing-seq-preserve-01',
      title: '보존 검증용 기존 개인레슨 시퀀스',
      subtitle: '사용자 기존 보관 데이터',
      apparatus: 'cadillac',
      level: '1.0',
      focusTags: ['척추 분절'],
      targetMinutes: 50,
      createdAt: '2026-11-01T09:00:00.000Z',
      updatedAt: '2026-11-01T09:00:00.000Z',
      taughtCount: 2,
      steps: [
        {
          kind: 'exercise',
          stepId: 'existing-step-1',
          order: 1,
          exerciseId: exWarm.id,
          blockCategory: exWarm.blockCategory,
          durationMin: 10,
          selectedLayer: 'standard',
        },
      ],
    };

    const existingUserLog: ClassHistoryLog = {
      id: 'user-existing-log-preserve-01',
      sequenceId: existingUserSeq.id,
      sequenceTitle: existingUserSeq.title,
      groupId: baseState.classGroups[0].id,
      groupName: baseState.classGroups[0].name,
      taughtAt: '2026-11-05T09:00:00.000Z',
      apparatus: 'cadillac',
      level: '1.0',
      exerciseIds: [exWarm.id],
      rating: 5,
      intensity: 'moderate',
      instructorReflection: '기존 사용자 수업 기록 보존 확인용 메모',
      actualDurationSec: 3000,
    };

    usePilatesStore.setState({
      activeTab: 'workbench',
      activeSequenceId: 'e2e-new-class-draft',
      activeTitle: '목요일 오전 리포머 코어 밸런스',
      activeSubtitle: '정렬·호흡 집중 30분',
      activeApparatus: 'reformer',
      activeLevel: '1.5',
      activeTargetMinutes: 30,
      activeTargetGroupId: baseState.classGroups[0].id,
      activeSteps: [
        {
          kind: 'exercise',
          stepId: 'e2e-step-1',
          order: 1,
          exerciseId: exWarm.id,
          blockCategory: exWarm.blockCategory,
          durationMin: 10,
          explanationSec: 20,
          transitionSec: 15,
          repetitions: 8,
          selectedLayer: 'standard',
        },
        {
          kind: 'exercise',
          stepId: 'e2e-step-2',
          order: 2,
          exerciseId: exMain.id,
          blockCategory: exMain.blockCategory,
          durationMin: 10,
          explanationSec: 20,
          transitionSec: 15,
          repetitions: 10,
          selectedLayer: 'standard',
        },
      ],
      savedSequences: [existingUserSeq],
      historyLogs: [existingUserLog],
    });

    render(<App />);

    // 1. 수업 작성 (Workbench): progressive drawers stay collapsed by default; append 3rd movement; inspect 3D preview
    expect((screen.getByTestId('workbench-circuit-planner-drawer') as HTMLDetailsElement).open).toBe(false);
    expect((screen.getByTestId('workbench-adaptive-history-drawer') as HTMLDetailsElement).open).toBe(false);

    act(() => {
      usePilatesStore.getState().appendExerciseToSequence(exCool.id, exCool.blockCategory);
    });
    expect(usePilatesStore.getState().activeSteps.filter((s) => !isRestStep(s))).toHaveLength(3);

    fireEvent.click(screen.getByRole('button', { name: '시퀀스 미리보기' }));
    const previewDialog = screen.getByRole('dialog', { name: '전체 수업 계획 미리보기' });
    expect(within(previewDialog).getByTestId('plan-preview-3d-hero')).toBeInTheDocument();
    fireEvent.click(within(previewDialog).getByRole('button', { name: '계획 미리보기 닫기' }));

    // 2. 수업 저장 (Binder Save): save new sequence & verify both new and pre-existing sequences render with 3D thumbnails
    let newlySavedId = '';
    await act(async () => {
      newlySavedId = usePilatesStore.getState().saveCurrentSequenceToBinder(true);
      usePilatesStore.getState().setActiveTab('binder');
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(newlySavedId).toBeTruthy();
    expect(screen.getByRole('heading', { name: '목요일 오전 리포머 코어 밸런스' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '보존 검증용 기존 개인레슨 시퀀스' })).toBeInTheDocument();
    const savedThumbs = document.querySelectorAll('[data-testid="binder-saved-card-3d-preview"] img');
    expect(savedThumbs.length).toBeGreaterThanOrEqual(2);

    // 3. 수업 진행 (Live Stage): start via preview -> run timer -> +15s -> PageDown step navigation -> finish CTA
    await act(async () => {
      usePilatesStore.getState().setActiveTab('workbench');
    });
    fireEvent.click(screen.getByRole('button', { name: '시퀀스 미리보기' }));
    const previewDialog2 = screen.getByRole('dialog', { name: '전체 수업 계획 미리보기' });
    await act(async () => {
      fireEvent.click(within(previewDialog2).getByRole('button', { name: '수업 시작' }));
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(usePilatesStore.getState().activeTab).toBe('stage');
    expect(screen.getByTestId('live-remote-ready-strip')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '수업 시작' }));
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    fireEvent.click(screen.getByTestId('live-stage-extend-15s-btn'));
    expect(screen.getByRole('timer')).toHaveTextContent('10:05');

    fireEvent.keyDown(window, { key: 'PageDown', code: 'PageDown' });
    expect(screen.getByRole('heading', { level: 2, name: exMain.nameKo })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'PageDown', code: 'PageDown' });
    expect(screen.getByRole('heading', { level: 2, name: exCool.nameKo })).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('live-stage-finish-cta-btn'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /검토하고 기록하기/ }));
    });
    await act(async () => {
      await Promise.resolve();
    });

    // 4. 수업 기록 (LogSessionModal -> History): submit reflection & verify snapshot + adaptive bridge + data preservation
    const logDialog = screen.getByRole('dialog', { name: '수업 기록 남기기' });
    const memoBox = within(logDialog).getByRole('textbox', { name: '다음 수업을 위한 메모 (선택)' });
    fireEvent.change(memoBox, {
      target: { value: '플랭크 구간에서 손목 지지 부담 관찰, 스프링 무거움 피드백 확인' },
    });
    await act(async () => {
      fireEvent.click(within(logDialog).getByRole('button', { name: /수업 기록 저장/ }));
    });
    await act(async () => {
      await Promise.resolve();
    });

    const afterState = usePilatesStore.getState();
    expect(afterState.historyLogs).toHaveLength(2);
    expect(afterState.historyLogs.some((l) => l.id === 'user-existing-log-preserve-01')).toBe(true);
    expect(afterState.savedSequences.some((s) => s.id === 'user-existing-seq-preserve-01')).toBe(true);
    expect(afterState.savedSequences.some((s) => s.id === newlySavedId)).toBe(true);

    await act(async () => {
      usePilatesStore.getState().setActiveTab('history');
    });
    await act(async () => {
      await Promise.resolve();
    });
    const adaptiveBanner = screen.getByTestId('binder-adaptive-bridge-card');
    expect(adaptiveBanner).toHaveTextContent('손목 지지 부담 완화');
    expect(screen.getByText('기존 사용자 수업 기록 보존 확인용 메모')).toBeInTheDocument();
  });
});
