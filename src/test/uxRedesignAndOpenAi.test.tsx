import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { FreeAiAssistantPanel } from '../components/FreeAiAssistantPanel';
import { MemberBookingView } from '../components/MemberBookingView';
import { StudioJourneyBar } from '../components/StudioJourneyBar';
import { createFreeAiClient, createDefaultFreeAiStatus } from '../lib/freeAiClient';
import { usePilatesStore } from '../store/usePilatesStore';
import { MEMBER_BOOKING_STORAGE_KEY } from '../utils/memberBookingBridge';

describe('UX Redesign (Instructor Journey, Member Booking) & OpenAI Movement Search', () => {
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

  it('supports member pass verification, booking deduction confirmation, waitlist, and cancellation restore', async () => {
    render(<MemberBookingView />);

    expect(screen.getByTestId('member-booking-view')).toBeInTheDocument();
    expect(screen.getByTestId('member-pass-metrics')).toHaveTextContent('7 / 20회');

    // Book first available Reformer slot
    const bookBtn = screen.getByRole('button', {
      name: '리포머 호흡 & 골반 정렬 예약하기',
    });
    fireEvent.click(bookBtn);

    const confirmBookBtn = await screen.findByTestId('confirm-member-booking-btn');
    expect(confirmBookBtn).toHaveTextContent('차감 동의 후 예약 확정');
    fireEvent.click(confirmBookBtn);

    await waitFor(() => {
      expect(screen.getByTestId('member-pass-metrics')).toHaveTextContent('6 / 20회');
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
    });
  });

  it('provides Tab 4 movement search in FreeAiAssistantPanel via OpenAI server transport and local fallback without exposing password/key inputs', async () => {
    const exercises = usePilatesStore.getState().exercises.slice(0, 6);
    const onAddExercise = vi.fn();

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
        postAssist: async () => ({
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
        }),
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
    fireEvent.click(addBtn);
    expect(onAddExercise).toHaveBeenCalledWith(exercises[0]!.id, exercises[0]!.blockCategory);
  });

  it('switches cleanly between Instructor Studio and Member Booking views in App without losing state', async () => {
    render(<App />);

    expect(screen.getByTestId('portal-role-switcher')).toBeInTheDocument();
    expect(screen.getByTestId('studio-journey-bar')).toBeInTheDocument();

    const memberBtn = screen.getByRole('button', { name: '회원 예약' });
    fireEvent.click(memberBtn);

    expect(await screen.findByTestId('member-booking-view')).toBeInTheDocument();

    const backToInstructorBtn = screen.getByRole('button', { name: '강사 작업실' });
    fireEvent.click(backToInstructorBtn);

    expect(await screen.findByTestId('studio-journey-bar')).toBeInTheDocument();
  });
});
