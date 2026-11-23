import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import type { PilatesExercise, SequenceStep } from '../types/pilates';
import { LessonModeSwitchPanel } from './LessonModeSwitchPanel';

afterEach(cleanup);

function pickExerciseByPredicate(
  predicate: (ex: PilatesExercise) => boolean,
  fallbackIdx: number,
): PilatesExercise {
  return INITIAL_EXERCISES.find(predicate) ?? INITIAL_EXERCISES[fallbackIdx]!;
}

const warmupEx = pickExerciseByPredicate((e) => e.id === 'ex-warmup-01', 0);
const footworkEx = pickExerciseByPredicate((e) => e.id === 'ex-footwork-01', 3);
const plankEx = pickExerciseByPredicate((e) => e.blockCategory === 'plank', 6);
const extensionEx = pickExerciseByPredicate((e) => e.blockCategory === 'extension', 8);

const TEST_STEPS: SequenceStep[] = [
  {
    stepId: 'step-1',
    order: 1,
    blockCategory: warmupEx.blockCategory,
    exerciseId: warmupEx.id,
    durationMin: 4,
    selectedLayer: 'standard',
  },
  {
    stepId: 'step-2',
    order: 2,
    blockCategory: footworkEx.blockCategory,
    exerciseId: footworkEx.id,
    durationMin: 6,
    selectedLayer: 'standard',
  },
  {
    stepId: 'step-3',
    order: 3,
    blockCategory: plankEx.blockCategory,
    exerciseId: plankEx.id,
    durationMin: 4,
    selectedLayer: 'standard',
  },
  {
    stepId: 'step-4',
    order: 4,
    blockCategory: extensionEx.blockCategory,
    exerciseId: extensionEx.id,
    durationMin: 5,
    selectedLayer: 'standard',
  },
];

describe('LessonModeSwitchPanel', () => {
  it('renders 1:1 private mode with one-tap comfort chips, recap preview, and zero QA jargon', () => {
    const onApplyPrivateLayers = vi.fn();
    const { container } = render(
      <LessonModeSwitchPanel
        steps={TEST_STEPS}
        exercises={INITIAL_EXERCISES}
        sequenceTitle="금요 오후 리포머 1:1"
        sessionDateIso="2026-11-23"
        onApplyPrivateLayers={onApplyPrivateLayers}
      />,
    );

    // 2-way toggle exists
    const privateTab = screen.getByRole('tab', { name: '1:1 개인 레슨' });
    const groupTab = screen.getByRole('tab', { name: '그룹 레슨' });
    expect(privateTab).toHaveAttribute('aria-selected', 'true');
    expect(groupTab).toHaveAttribute('aria-selected', 'false');

    // 4 one-tap comfort guard chips
    const wristChip = screen.getByRole('button', { name: '손목 편하게' });
    expect(screen.getByRole('button', { name: '목 부담 ↓' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '무릎 편하게' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '허리 지지' })).toBeInTheDocument();

    // Tap wrist comfort chip -> shows adaptation tip and allows batch easy-layer apply
    fireEvent.click(wristChip);
    expect(wristChip).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/배려 동작 완화\(초보\) 단계 일괄 적용/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /배려 동작 완화/ }));
    expect(onApplyPrivateLayers).toHaveBeenCalledTimes(1);

    // Member recap preview is rendered with focus, 4 spinal planes, highlights, and 3-min homecare
    expect(screen.getByLabelText('회원 소통 카드 미리보기')).toBeInTheDocument();
    expect(screen.getByText('오늘의 핵심 포커스')).toBeInTheDocument();
    expect(screen.getByText(/척추 4평면 밸런스/)).toBeInTheDocument();
    expect(screen.getByText('잘 따라온 동작 2개')).toBeInTheDocument();
    expect(screen.getByText('집에서 3분 매트 홈케어 참고')).toBeInTheDocument();

    // Zero developer QA terminology anywhere in the instructor UI
    expect(container.textContent).not.toMatch(/검토\s*필요|미검토|검증됨|미검증|출처\s*원장/);
  });

  it('sanitizes sensitive real-name input and copies clean KakaoTalk recap text', async () => {
    render(
      <LessonModeSwitchPanel
        steps={TEST_STEPS}
        exercises={INITIAL_EXERCISES}
        sequenceTitle="오전 리포머 개인"
        sessionDateIso="2026-11-23"
      />,
    );

    const aliasInput = screen.getByLabelText('회원 별칭 (비식별)');
    fireEvent.change(aliasInput, { target: { value: '김민지' } });

    expect(
      screen.getByText(/실명·연락처·민감 건강정보는 저장하거나 공유하지 않아요/),
    ).toBeInTheDocument();

    const copyBtn = screen.getByRole('button', { name: '카톡 텍스트 복사' });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    });
    const copied = vi.mocked(navigator.clipboard.writeText).mock.calls[0]?.[0] ?? '';
    expect(copied).toContain('회원 A · 금요 2시 개인');
    expect(copied).not.toContain('김민지');
    expect(screen.getByText('카톡 공유용 수업 리캡 텍스트를 복사했어요.')).toBeInTheDocument();
  });

  it('exports recap card image cleanly in jsdom without throwing', async () => {
    render(
      <LessonModeSwitchPanel
        steps={TEST_STEPS}
        exercises={INITIAL_EXERCISES}
        sessionDateIso="2026-11-23"
      />,
    );

    const downloadBtn = screen.getByRole('button', { name: '카드 이미지 저장' });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(screen.getByText(/회원 소통 카드\((PNG|SVG)\)를 저장했어요/)).toBeInTheDocument();
    });
  });

  it('switches to 6:1 group mode and displays 3-tier simultaneous cues & spring transition summary', async () => {
    const onModeChange = vi.fn();
    render(
      <LessonModeSwitchPanel
        steps={TEST_STEPS}
        exercises={INITIAL_EXERCISES}
        groupClassSize={6}
        onModeChange={onModeChange}
      />,
    );

    const groupTab = screen.getByRole('tab', { name: '그룹 레슨' });
    fireEvent.click(groupTab);

    expect(onModeChange).toHaveBeenCalledWith('group-class');
    expect(groupTab).toHaveAttribute('aria-selected', 'true');

    // Group KPI summary & spring-keep highlight
    expect(screen.getByLabelText('그룹 스프링 전환 요약')).toBeInTheDocument();
    expect(screen.getByText('스프링 변경')).toBeInTheDocument();
    expect(screen.getByText('예상 전환')).toBeInTheDocument();
    expect(screen.getByText(/스프링 그대로 유지/)).toBeInTheDocument();

    // 3-tier simultaneous layering cue sheet
    expect(screen.getByText('3단계 동시 큐 (초보 · 기본 · 심화)')).toBeInTheDocument();
    expect(screen.getAllByText('완화(초보)').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('기본').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('심화').length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByRole('button', { name: '큐 시트 복사' }));
    await waitFor(() => {
      expect(screen.getByText('6:1 3단계 동시 큐 시트를 복사했어요.')).toBeInTheDocument();
    });
  });
});
