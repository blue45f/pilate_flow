import { openAppTools } from './workbenchControls';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { Apparatus3dRigPreviewCard } from '../components/Apparatus3dRigPreviewCard';
import { FreeAiAssistantPanel } from '../components/FreeAiAssistantPanel';
import { MemberBookingView } from '../components/MemberBookingView';
import { SequenceWorkbench } from '../components/SequenceWorkbench';
import { SpringVisualPills } from '../components/SpringVisualPills';
import { StudioJourneyBar } from '../components/StudioJourneyBar';
import { AtelierQuickStartGallery } from '../components/workbench/AtelierQuickStartGallery';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { createFreeAiClient, createDefaultFreeAiStatus } from '../lib/freeAiClient';
import { usePilatesStore } from '../store/usePilatesStore';
import { ATELIER_QUICK_START_RECIPES } from '../utils/atelierQuickStart';
import { localScheduleDate } from '../utils/instructorSchedule';
import {
  MEMBER_BOOKING_STORAGE_KEY,
  type MemberBookableSlot,
  computeStudioSpotStates,
  deriveMemberSlotStatus,
  isSlotPastFreeCancelDeadline,
  readPersistedMemberBookingState,
  resolveMemberActionIntent,
} from '../utils/memberBookingBridge';
import { parseSpringVisualChips } from '../utils/springVisualParser';

describe('UX Redesign (Instructor Journey, Member Booking, V2 Atelier) & OpenAI Movement Search', () => {
  beforeEach(() => {
    window.localStorage.removeItem(MEMBER_BOOKING_STORAGE_KEY);
    window.sessionStorage.clear();
    usePilatesStore.setState({ activeTab: 'workbench' });
  });

  it('renders the 4-step StudioJourneyBar and triggers step navigation while disabling stage when empty', () => {
    const onSelectStep = vi.fn();
    render(
      <StudioJourneyBar
        activeTab="workbench"
        exerciseCount={42}
        stepCount={0}
        targetMinutes={50}
        historyCount={3}
        canStartStage={false}
        onSelectStep={onSelectStep}
      />,
    );

    const journeyNav = screen.getByTestId('studio-journey-bar');
    expect(journeyNav).toBeInTheDocument();

    const step1Btn = screen.getByRole('button', { name: /동작 탐색/ });
    const step2Btn = screen.getByRole('button', { name: /수업 구성/ });
    const step3Btn = screen.getByRole('button', { name: /수업 진행/ });
    const step4Btn = screen.getByRole('button', { name: /수업 기록/ });

    expect(step2Btn).toHaveAttribute('aria-current', 'step');
    expect(step3Btn).toBeDisabled();

    fireEvent.click(step1Btn);
    expect(onSelectStep).toHaveBeenCalledWith('atlas');

    fireEvent.click(step4Btn);
    expect(onSelectStep).toHaveBeenCalledWith('history');
  });

  it('supports member pass verification, C1~C6/R1~R6 spot selection, moved/cancelled recovery, corrupted storage guard, and cancellation restore', async () => {
    const todayIso = localScheduleDate();

    // 1. Verify 4-person class spot bounds, moved status blocking, and cancelled booking credit recovery
    const smallFullSlot: MemberBookableSlot = {
      id: 'slot-small-4',
      classId: 'c4',
      date: '2026-04-10',
      startTime: '10:00',
      endTime: '10:50',
      title: '4:1 소그룹 리포머',
      locationAlias: 'A룸',
      apparatus: 'reformer',
      equipmentLabels: ['리포머'],
      occurrenceStatus: 'scheduled',
      baseEnrolled: 4,
      maxCapacity: 4,
      baseWaitlist: 0,
      maxWaitlist: 2,
      freeCancelHoursBefore: 12,
      myState: 'NONE',
    };
    const spotStates = computeStudioSpotStates(smallFullSlot);
    expect(spotStates).toHaveLength(4);
    expect(spotStates.every((s) => s.occupiedByOther)).toBe(true);
    expect(resolveMemberActionIntent(smallFullSlot, '2026-04-15')).toBeNull();

    const movedUnbookedSlot: MemberBookableSlot = {
      ...smallFullSlot,
      id: 'slot-moved-open',
      baseEnrolled: 1,
      occurrenceStatus: 'moved',
    };
    expect(deriveMemberSlotStatus(movedUnbookedSlot)).toBe('CLOSED');
    expect(resolveMemberActionIntent(movedUnbookedSlot, '2026-04-10')).toBeNull();

    const cancelledBookedSlot: MemberBookableSlot = {
      ...smallFullSlot,
      id: 'slot-cancelled-booked',
      occurrenceStatus: 'cancelled',
      myState: 'BOOKED',
      mySpotId: 'R2',
    };
    expect(resolveMemberActionIntent(cancelledBookedSlot, '2026-04-10')).toBe('CANCEL_BOOKING');
    expect(
      isSlotPastFreeCancelDeadline(
        cancelledBookedSlot,
        '2020-01-01T00:00:00.000Z',
        Date.parse('2026-04-10T09:55:00.000Z'),
      ),
    ).toBe(false);

    // 2. Verify corrupted localStorage (NaN remainingCount / array slotDecisions) falls back safely
    window.localStorage.setItem(
      MEMBER_BOOKING_STORAGE_KEY,
      JSON.stringify({
        pass: { remainingCount: 'corrupted-nan', totalCount: null, expiresAtIso: 'bad-date' },
        slotDecisions: ['not-a-record'],
      }),
    );
    const sanitized = readPersistedMemberBookingState(todayIso);
    expect(sanitized.pass.remainingCount).toBe(7);
    expect(sanitized.pass.totalCount).toBe(20);
    expect(sanitized.slotDecisions).toEqual({});

    window.localStorage.setItem(
      MEMBER_BOOKING_STORAGE_KEY,
      JSON.stringify({
        pass: { remainingCount: 0, totalCount: 0, expiresAtIso: todayIso },
        slotDecisions: {},
      }),
    );
    const zeroPassSanitized = readPersistedMemberBookingState(todayIso);
    expect(zeroPassSanitized.pass.remainingCount).toBe(0);
    expect(zeroPassSanitized.pass.totalCount).toBe(20);

    window.localStorage.setItem(
      MEMBER_BOOKING_STORAGE_KEY,
      JSON.stringify({
        pass: { remainingCount: -3, totalCount: 15, expiresAtIso: todayIso },
        slotDecisions: {},
      }),
    );
    const negativePassSanitized = readPersistedMemberBookingState(todayIso);
    expect(negativePassSanitized.pass.remainingCount).toBe(0);
    expect(negativePassSanitized.pass.totalCount).toBe(15);
    window.localStorage.removeItem(MEMBER_BOOKING_STORAGE_KEY);

    render(<MemberBookingView />);

    expect(screen.getByTestId('member-booking-view')).toBeInTheDocument();
    expect(screen.getByTestId('member-pass-metrics')).toHaveTextContent('7 / 20회');
    expect(screen.getByTestId('member-pass-metrics')).toHaveTextContent('예약 확정: 0건');

    // Toggle available-only filter chip
    const availableChip = screen.getByTestId('filter-available-only-chip');
    fireEvent.click(availableChip);
    expect(availableChip).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(availableChip);

    // Verify Chair slot renders C1~C6 spots inside scoped booking dialog, and closing cancels cleanly without deduction
    const chairBookBtn = screen.getByRole('button', {
      name: '체어 하체·코어 집중 플로우 예약하기',
    });
    fireEvent.click(chairBookBtn);

    const chairDialog = await screen.findByRole('dialog', {
      name: '체어 자리 선택 및 예약 확인',
    });
    const chairMap = within(chairDialog).getByTestId('member-spot-map');
    const spotC2 = within(chairMap).getByTestId('spot-btn-C2');
    expect(spotC2).toBeInTheDocument();
    if (!spotC2.hasAttribute('disabled')) {
      fireEvent.click(spotC2);
      expect(spotC2).toHaveAttribute('aria-pressed', 'true');
    }

    const chairDialogHeader = chairDialog.querySelector<HTMLElement>('.atelier-modal-header');
    const chairDialogActions = chairDialog.querySelector<HTMLElement>('.pf-member-dialog-actions');
    expect(chairDialogHeader).not.toBeNull();
    expect(chairDialogActions).not.toBeNull();
    expect(within(chairDialogHeader!).getByRole('button', { name: '닫기' })).toBeInTheDocument();

    const chairCancelCloseBtn = within(chairDialogActions!).getByRole('button', {
      name: '닫기',
    });
    fireEvent.click(chairCancelCloseBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '체어 자리 선택 및 예약 확인' })).toBeNull();
      expect(screen.queryByTestId('member-spot-map')).toBeNull();
    });
    expect(screen.queryByTestId('member-my-bookings-strip')).toBeNull();
    expect(screen.getByTestId('member-pass-metrics')).toHaveTextContent('7 / 20회');
    expect(screen.getByTestId('member-pass-metrics')).toHaveTextContent('예약 확정: 0건');
    expect(
      screen.getByRole('button', { name: '체어 하체·코어 집중 플로우 예약하기' }),
    ).toBeEnabled();
    expect(readPersistedMemberBookingState(todayIso).pass.remainingCount).toBe(7);
    expect(readPersistedMemberBookingState(todayIso).slotDecisions).toEqual({});

    // Book first available Reformer slot with custom spot R5
    const bookBtn = screen.getByRole('button', {
      name: '리포머 호흡 & 골반 정렬 예약하기',
    });
    fireEvent.click(bookBtn);

    const reformerDialog = await screen.findByRole('dialog', {
      name: '리포머 자리 선택 및 예약 확인',
    });
    expect(within(reformerDialog).getByTestId('member-spot-map')).toBeInTheDocument();
    const spotR5 = within(reformerDialog).getByTestId('spot-btn-R5');
    if (!spotR5.hasAttribute('disabled')) {
      fireEvent.click(spotR5);
      expect(spotR5).toHaveAttribute('aria-pressed', 'true');
    }

    const confirmBookBtn = within(reformerDialog).getByTestId('confirm-member-booking-btn');
    expect(confirmBookBtn).toHaveTextContent('차감 동의 후 예약 확정');
    fireEvent.click(confirmBookBtn);
    fireEvent.click(confirmBookBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '리포머 자리 선택 및 예약 확인' })).toBeNull();
      expect(screen.getByTestId('member-pass-metrics')).toHaveTextContent('6 / 20회');
      expect(screen.getByTestId('member-pass-metrics')).toHaveTextContent('예약 확정: 1건');
      expect(screen.getByTestId('member-my-bookings-strip')).toBeInTheDocument();
    });

    // Cancel the same slot and verify immediate credit restoration
    const cancelBtn = screen.getByRole('button', {
      name: '리포머 호흡 & 골반 정렬 예약 취소',
    });
    fireEvent.click(cancelBtn);

    const confirmCancelBtn = await screen.findByTestId('confirm-member-booking-btn');
    fireEvent.click(confirmCancelBtn);

    await waitFor(() => {
      expect(screen.getByTestId('member-pass-metrics')).toHaveTextContent('7 / 20회');
      expect(screen.getByTestId('member-pass-metrics')).toHaveTextContent('예약 확정: 0건');
    });
  });

  it('parses tactile spring chips (decimals, choice operators, zero/bodyweight, white, attachment notes) and applies all 4 QuickStart recipes without wiping active sequences on empty catalog', () => {
    expect(parseSpringVisualChips('2R 1B').map((c) => c.labelKo)).toEqual(['빨강×2', '파랑×1']);
    expect(parseSpringVisualChips('0.5 Blue').map((c) => c.labelKo)).toEqual(['파랑×0.5']);
    expect(parseSpringVisualChips('1R 1W').map((c) => c.labelKo)).toEqual(['빨강×1', '하양×1']);
    expect(parseSpringVisualChips('0 Red').map((c) => c.labelKo)).toEqual(['맨몸']);
    expect(parseSpringVisualChips('스프링 사용 없음').map((c) => c.labelKo)).toEqual(['맨몸']);
    expect(parseSpringVisualChips('1B (상단 스프링)').map((c) => c.labelKo)).toEqual([
      '파랑×1',
      '상단 스프링',
    ]);
    const choiceChips = parseSpringVisualChips('1R or 1B');
    expect(choiceChips).toHaveLength(1);
    expect(choiceChips[0]!.key).toBe('choice');

    render(<SpringVisualPills springs="1 Red + 1 Yellow" />);
    expect(screen.getByText('빨강×1')).toBeInTheDocument();
    expect(screen.getByText('노랑×1')).toBeInTheDocument();

    const onApplyRecipe = vi.fn();
    render(
      <AtelierQuickStartGallery exercises={INITIAL_EXERCISES} onApplyQuickRecipe={onApplyRecipe} />,
    );

    for (const recipe of ATELIER_QUICK_START_RECIPES) {
      onApplyRecipe.mockClear();
      const applyBtn = screen.getByTestId(`quickstart-apply-${recipe.id}`);
      fireEvent.click(applyBtn);

      expect(onApplyRecipe).toHaveBeenCalledTimes(1);
      const payload = onApplyRecipe.mock.calls[0]![0];
      expect(payload.targetMinutes).toBe(recipe.durationMinutes);
      expect(payload.steps.length).toBeGreaterThan(0);
    }

    // Verify empty exercise catalog never wipes an existing workbench sequence
    const firstEx = INITIAL_EXERCISES[0]!;
    usePilatesStore.setState({
      exercises: [],
      activeSteps: [
        {
          stepId: 'keep-step-1',
          order: 1,
          exerciseId: firstEx.id,
          blockCategory: firstEx.blockCategory,
          durationMin: 5,
          selectedLayer: 'standard',
        },
      ],
    });
    const wb = render(
      <SequenceWorkbench
        onOpenClipper={vi.fn()}
        onOpenYouTubePreview={vi.fn()}
        onOpenLogModal={vi.fn()}
      />,
    );
    const recipeSummary = wb.container.querySelector('details summary');
    expect(recipeSummary).not.toBeNull();
    expect(usePilatesStore.getState().activeSteps).toHaveLength(1);
    wb.unmount();
    usePilatesStore.setState({ exercises: INITIAL_EXERCISES, activeSteps: [] });
  });

  it('renders Blender 3D studio apparatus preview frame in Apparatus3dRigPreviewCard and toggles cleanly', () => {
    render(
      <Apparatus3dRigPreviewCard
        apparatus="reformer"
        bodyPosition="supine"
        springsLabel="2R 1B"
        exerciseTitleKo="헌드레드"
      />,
    );

    expect(screen.getByTestId('blender-studio-3d-render')).toBeInTheDocument();
    const toggleBtn = screen.getByRole('button', { name: '3D 스튜디오 렌더 숨기기' });
    fireEvent.click(toggleBtn);
    expect(screen.queryByTestId('blender-studio-3d-render')).toBeNull();
  });

  it('provides Tab 4 movement search in FreeAiAssistantPanel, surfaces rejected sequence-add errors, and cancels in-flight requests cleanly', async () => {
    const exercises = usePilatesStore.getState().exercises.slice(0, 6);
    const onAddExercise = vi.fn().mockReturnValueOnce(undefined).mockReturnValueOnce({
      ok: false,
      message: '이미 시퀀스에 포함된 동작 계열입니다.',
    });

    let pendingResolve:
      | ((val: { status: ReturnType<typeof createDefaultFreeAiStatus>; result: never }) => void)
      | null = null;
    let callCount = 0;

    const openAiClient = createFreeAiClient({
      transport: {
        getStatus: async () =>
          createDefaultFreeAiStatus({
            provider: 'openai',
            model: 'gpt-4o-mini',
            enabled: true,
            exhausted: false,
            reason: 'ready',
          }),
        postAssist: async () => {
          callCount += 1;
          if (callCount === 2) {
            return new Promise((resolve) => {
              pendingResolve = resolve as never;
            });
          }
          return {
            status: createDefaultFreeAiStatus({
              provider: 'openai',
              model: 'gpt-4o-mini',
              enabled: true,
              exhausted: false,
              reason: 'ready',
            }),
            result: {
              kind: 'exercise-search',
              source: 'openai-api',
              provider: 'openai',
              model: 'gpt-4o-mini',
              cached: false,
              querySummaryKo: '어깨 긴장 완화와 코어 연결에 적합한 리포머 동작입니다.',
              recommendations: [
                {
                  exerciseId: exercises[0]!.id,
                  nameKo: exercises[0]!.nameKo,
                  nameEn: exercises[0]!.nameEn,
                  apparatus: exercises[0]!.apparatus,
                  blockCategory: exercises[0]!.blockCategory,
                  level: exercises[0]!.level,
                  defaultDurationMin: exercises[0]!.defaultDurationMin,
                  springs: exercises[0]!.springs || '1R 1B',
                  matchReasonKo: '흉곽 호흡과 복횡근 인지에 적합합니다.',
                  cueHighlightKo: '내쉬는 숨에 늑골을 부드럽게 모아 주세요.',
                  setupCheckKo: '헤드레스트와 스프링 장력을 수업 전 확인하세요.',
                },
              ],
              guaranteesSafetyOrEffect: false,
              safetyDisclaimer:
                '미검토 창작 동작 및 AI 제안은 안전성이나 운동·교정·치료 효과를 보장하지 않습니다.',
            },
          };
        },
      },
    });

    const { container } = render(
      <FreeAiAssistantPanel
        exercises={exercises}
        conditionTemplates={[]}
        client={openAiClient}
        initialTab="exercise-search"
        onAddExerciseToSequence={onAddExercise}
      />,
    );

    expect(container.querySelector('input[type="password"]')).toBeNull();

    await waitFor(() => {
      expect(screen.getByText('OpenAI 서버 보조')).toBeInTheDocument();
    });

    const aiSearchBtn = screen.getByRole('button', { name: 'AI로 동작 추천 받기' });
    fireEvent.click(aiSearchBtn);

    const resultsRegion = await screen.findByTestId('movement-search-results');
    expect(resultsRegion).toHaveTextContent('흉곽 호흡과 복횡근 인지에 적합합니다.');

    const addBtn = screen.getByRole('button', {
      name: `${exercises[0]!.nameKo} 수업안에 추가`,
    });
    // First click succeeds
    fireEvent.click(addBtn);
    expect(onAddExercise).toHaveBeenCalledWith(exercises[0]!.id, exercises[0]!.blockCategory);

    // Second click rejected -> surfaces error alert instead of false success
    fireEvent.click(addBtn);
    expect(screen.getByRole('alert')).toHaveTextContent('이미 시퀀스에 포함된 동작 계열입니다.');

    // Trigger a slow non-cached search and cancel via cancel button -> immediately frees concurrency slot
    fireEvent.change(screen.getByLabelText('찾고 싶은 동작·움직임 설명'), {
      target: { value: '취소 검증용 느린 리포머 브릿징 탐색 요청' },
    });
    fireEvent.click(aiSearchBtn);
    expect(await screen.findByTestId('free-ai-loading-banner')).toBeInTheDocument();
    expect(openAiClient.getQuotaStatus().activeRequests).toBe(1);

    fireEvent.click(screen.getByTestId('free-ai-cancel-request-btn'));
    await waitFor(() => {
      expect(screen.queryByTestId('free-ai-loading-banner')).toBeNull();
      expect(openAiClient.getQuotaStatus().activeRequests).toBe(0);
    });
    expect(pendingResolve).not.toBeNull();
  });

  it('switches cleanly between Instructor Studio and Member Booking views in App without losing state', async () => {
    const originalState = usePilatesStore.getState();
    const exercise = INITIAL_EXERCISES[0]!;
    usePilatesStore.setState({
      activeTitle: '화면 전환 중 보존할 수업안',
      activeSteps: [
        {
          stepId: 'portal-role-preserved-step',
          order: 1,
          exerciseId: exercise.id,
          blockCategory: exercise.blockCategory,
          durationMin: 5,
          selectedLayer: 'standard',
          locked: true,
          instructorNote: '회원 화면에서 변경되면 안 되는 강사 메모',
        },
      ],
    });
    const instructorState = usePilatesStore.getState();
    const view = render(<App />);

    try {
      openAppTools();
      const roleSwitcher = screen.getByRole('group', { name: '이용자 화면 전환' });
      const memberBtn = within(roleSwitcher).getByRole('button', { name: '회원 예약' });
      const backToInstructorBtn = within(roleSwitcher).getByRole('button', { name: '강사 작업실' });
      expect(backToInstructorBtn).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('sequence-studio')).toBeInTheDocument();
      expect(
        within(screen.getByRole('navigation', { name: '주 메뉴' })).getByRole('button', {
          name: '수업 만들기',
        }),
      ).toHaveAttribute('aria-current', 'page');

      fireEvent.click(memberBtn);

      expect(await screen.findByTestId('member-booking-view')).toBeInTheDocument();
      expect(memberBtn).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('member-desktop-nav')).toBeInTheDocument();
      expect(screen.queryByRole('navigation', { name: '주 메뉴' })).not.toBeInTheDocument();
      expect(screen.queryByTestId('sequence-studio')).not.toBeInTheDocument();
      expect(usePilatesStore.getState().activeSteps).toBe(instructorState.activeSteps);
      expect(usePilatesStore.getState().activeTitle).toBe(instructorState.activeTitle);
      const memberState = readPersistedMemberBookingState(localScheduleDate());

      fireEvent.click(backToInstructorBtn);

      expect(await screen.findByTestId('sequence-studio')).toBeInTheDocument();
      expect(backToInstructorBtn).toHaveAttribute('aria-pressed', 'true');
      expect(screen.queryByTestId('member-booking-view')).not.toBeInTheDocument();
      expect(screen.queryByTestId('member-desktop-nav')).not.toBeInTheDocument();
      expect(
        within(screen.getByRole('navigation', { name: '주 메뉴' })).getByRole('button', {
          name: '수업 만들기',
        }),
      ).toHaveAttribute('aria-current', 'page');
      expect(usePilatesStore.getState().activeTab).toBe('workbench');
      expect(usePilatesStore.getState().activeTitle).toBe(instructorState.activeTitle);
      expect(usePilatesStore.getState().activeSteps).toBe(instructorState.activeSteps);
      expect(usePilatesStore.getState().savedSequences).toBe(instructorState.savedSequences);
      expect(usePilatesStore.getState().historyLogs).toBe(instructorState.historyLogs);
      expect(usePilatesStore.getState().instructorSchedule).toBe(
        instructorState.instructorSchedule,
      );
      expect(readPersistedMemberBookingState(localScheduleDate())).toEqual(memberState);
    } finally {
      view.unmount();
      usePilatesStore.setState(originalState, true);
    }
  });
});
