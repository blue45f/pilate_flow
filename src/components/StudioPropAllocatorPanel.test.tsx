import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  INITIAL_EXERCISES,
  INITIAL_HISTORY_LOGS,
  INITIAL_SAVED_SEQUENCES,
} from '../data/pilatesCatalog';
import type { SequenceStep } from '../types/pilates';
import {
  DEFAULT_CONCURRENT_SESSIONS,
  DEFAULT_STUDIO_INVENTORY,
  STUDIO_ROLE_STORAGE_KEY,
} from '../utils/studioPropAllocator';
import { StudioPropAllocatorPanel } from './StudioPropAllocatorPanel';

function buildRingConflictSteps(): SequenceStep[] {
  return [
    {
      stepId: 's-warmup',
      order: 1,
      blockCategory: 'warmup',
      exerciseId: 'ex-warmup-01',
      durationMin: 4,
      selectedLayer: 'standard',
    },
    {
      stepId: 's-ring-footwork',
      order: 2,
      blockCategory: 'footwork',
      exerciseId: 'ex-footwork-02', // requires magic-circle
      durationMin: 6,
      selectedLayer: 'standard',
    },
    {
      stepId: 's-core',
      order: 3,
      blockCategory: 'core',
      exerciseId: 'ex-core-01',
      durationMin: 6,
      selectedLayer: 'standard',
    },
    {
      stepId: 's-cooldown',
      order: 4,
      blockCategory: 'cooldown',
      exerciseId: 'ex-cooldown-01',
      durationMin: 4,
      selectedLayer: 'standard',
    },
  ];
}

describe('StudioPropAllocatorPanel', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it('1. 기본 모드는 프리랜서 강사(freelance)이며 복잡한 타 룸 관리를 숨기고 출강 프리셋·수업료 집계를 제공한다', () => {
    const onApply = vi.fn();
    render(
      <StudioPropAllocatorPanel
        steps={INITIAL_SAVED_SEQUENCES[0].steps}
        exercises={INITIAL_EXERCISES}
        historyLogs={INITIAL_HISTORY_LOGS}
        activeTitle={INITIAL_SAVED_SEQUENCES[0].title}
        activeApparatus="reformer"
        onApplyAdaptedSequence={onApply}
      />,
    );

    const freelanceBtn = screen.getByRole('button', { name: /프리랜서 강사/ });
    expect(freelanceBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('출강 센터 기구·스프링 빠른 전환')).toBeInTheDocument();
    expect(screen.queryByText(/동시간대 타 룸 교보재 사용 체크/)).not.toBeInTheDocument();

    // One-tap spring sync for venue
    fireEvent.click(screen.getByRole('button', { name: /스프링 표기 자동 맞추기/ }));
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply.mock.calls[0][0].strategyId).toBe('venue-spring-sync');

    // Switch to freelance earnings counter tab and add +1 class
    fireEvent.click(screen.getByRole('tab', { name: /출강 · 수업료 집계/ }));
    expect(screen.getByText('이번 달 내 출강 간편 집계')).toBeInTheDocument();
    const plusBtn = screen.getByRole('button', {
      name: /A 센터 · 인투필라테스 6:1 출강 횟수 늘리기/,
    });
    fireEvent.click(plusBtn);
    expect(screen.getByText('7회')).toBeInTheDocument();
  });

  it('2. 상단 3분할 강사 운영 모드 전환 시 localStorage에 저장되고 재마운트 후에도 유지된다', () => {
    const { unmount } = render(
      <StudioPropAllocatorPanel
        steps={buildRingConflictSteps()}
        exercises={INITIAL_EXERCISES}
        historyLogs={INITIAL_HISTORY_LOGS}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /다강사 센터/ }));
    expect(window.localStorage.getItem(STUDIO_ROLE_STORAGE_KEY)).toBe('center-manager');
    expect(screen.getByText(/동시간대 타 룸 교보재 사용 체크/)).toBeInTheDocument();
    unmount();

    // Remount without initialRoleMode -> restores center-manager from localStorage
    render(
      <StudioPropAllocatorPanel
        steps={buildRingConflictSteps()}
        exercises={INITIAL_EXERCISES}
        historyLogs={INITIAL_HISTORY_LOGS}
      />,
    );
    expect(screen.getByRole('button', { name: /다강사 센터/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('3. 다강사 센터 모드에서 써클링 충돌 배지를 띄우고 [남는 소도구로 자동 바꾸기] 전·후 미리보기 후 적용한다', () => {
    const onApply = vi.fn();
    render(
      <StudioPropAllocatorPanel
        initialRoleMode="center-manager"
        steps={buildRingConflictSteps()}
        exercises={INITIAL_EXERCISES}
        historyLogs={INITIAL_HISTORY_LOGS}
        initialHeadcount={6}
        initialInventory={DEFAULT_STUDIO_INVENTORY}
        initialConcurrentSessions={DEFAULT_CONCURRENT_SESSIONS}
        onApplyAdaptedSequence={onApply}
      />,
    );

    expect(screen.getByText(/써클링 6개 부족 \(잔여 0개\)/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '남는 소도구로 자동 바꾸기' }));
    expect(screen.getByLabelText('자동 변경 전후 미리보기')).toBeInTheDocument();
    expect(screen.getByText(/부족 0건/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '이대로 시퀀스에 적용' }));
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply.mock.calls[0][0].strategyId).toBe('swap-available-prop');
  });

  it('4. 다강사 센터 모드에서 [전·후반 교차 배치] 및 [기구 변경 자동 전환] 원탭 미리보기·적용이 동작한다', async () => {
    const onApply = vi.fn();
    render(
      <StudioPropAllocatorPanel
        initialRoleMode="center-manager"
        steps={buildRingConflictSteps()}
        exercises={INITIAL_EXERCISES}
        historyLogs={INITIAL_HISTORY_LOGS}
        initialHeadcount={6}
        initialInventory={DEFAULT_STUDIO_INVENTORY}
        initialConcurrentSessions={DEFAULT_CONCURRENT_SESSIONS}
        onApplyAdaptedSequence={onApply}
      />,
    );

    // Test Strategy 2: Staggered timeshare
    fireEvent.click(screen.getByRole('button', { name: '전·후반 교차 배치' }));
    expect(screen.getByText(/전·후반 교차 타임셰어 미리보기/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '타 룸 교차 안내 복사' }));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('교보재 교차 사용 안내'),
      );
    });

    // Test Strategy 3: Apparatus conversion to Mat
    fireEvent.click(screen.getByRole('button', { name: '매트' }));
    fireEvent.click(screen.getByRole('button', { name: '기구 변경 자동 전환' }));
    expect(screen.getByText(/매트 기구 자동 전환 미리보기/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '이대로 시퀀스에 적용' }));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        strategyId: 'adapt-room-apparatus',
        apparatus: 'mat',
      }),
    );
  });

  it('5. 1인 스튜디오 모드 탭 2에서 수업 후 회원 안내 카톡 초안·FAQ 5종·월간 밸런스 카드를 1탭 복사한다', async () => {
    render(
      <StudioPropAllocatorPanel
        initialRoleMode="solo-owner"
        initialTab="chores"
        steps={INITIAL_SAVED_SEQUENCES[0].steps}
        exercises={INITIAL_EXERCISES}
        historyLogs={INITIAL_HISTORY_LOGS}
        activeTitle={INITIAL_SAVED_SEQUENCES[0].title}
        activeApparatus="reformer"
      />,
    );

    expect(screen.getByText('수업 직후 회원 안내 카톡 초안')).toBeInTheDocument();
    expect(screen.getByText('자주 묻는 안내 1탭 복사')).toBeInTheDocument();
    expect(screen.getByText('복장 · 논슬립 양말 안내')).toBeInTheDocument();
    expect(screen.getByText('예약 변경 · 취소 규정 안내')).toBeInTheDocument();
    expect(screen.getByText('최근 수업 밸런스 리포트')).toBeInTheDocument();

    // 1-tap copy post-class KakaoTalk draft
    fireEvent.click(screen.getByRole('button', { name: '카톡 문구 1탭 복사' }));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('집에서 3분'),
      );
    });

    // 1-tap copy first FAQ template
    const faqCopyButtons = screen.getAllByRole('button', { name: '안내 복사' });
    expect(faqCopyButtons).toHaveLength(5);
    fireEvent.click(faqCopyButtons[0]);
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('논슬립'),
      );
    });
  });

  it('6. 다강사 센터 모드 탭 3에서 대강 3분 인수인계 요약을 1탭 복사한다', async () => {
    render(
      <StudioPropAllocatorPanel
        initialRoleMode="center-manager"
        initialTab="handoff"
        steps={buildRingConflictSteps()}
        exercises={INITIAL_EXERCISES}
        historyLogs={INITIAL_HISTORY_LOGS}
        activeTitle="오전 10시 리포머 밸런스"
        activeApparatus="reformer"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '3분 인수인계 1탭 복사' }));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('대강 3분 인수인계'),
      );
    });
  });

  it('7. 비식별·비의료 원칙과 검토/검증 UI 0건 정책을 화면 전체에서 준수한다', () => {
    const { container } = render(
      <StudioPropAllocatorPanel
        initialRoleMode="solo-owner"
        initialTab="chores"
        steps={INITIAL_SAVED_SEQUENCES[0].steps}
        exercises={INITIAL_EXERCISES}
        historyLogs={INITIAL_HISTORY_LOGS}
      />,
    );

    // Entering PII / medical diagnosis triggers privacy scrubbing banner
    const aliasInput = screen.getByLabelText(/받는 분 별칭/);
    fireEvent.change(aliasInput, { target: { value: '김철수 회원 010-9999-8888 디스크' } });
    expect(
      screen.getByText(/비식별 별칭.*자동 정리했어요/),
    ).toBeInTheDocument();

    // Ensure zero developer review/QA UI strings appear anywhere
    const textContent = container.textContent ?? '';
    expect(textContent).not.toMatch(/미검토|검토 필요|전문가 검토|출처 원장|SHA-256/);
  });
});
