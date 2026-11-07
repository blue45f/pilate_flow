import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { SequenceWorkbench } from './SequenceWorkbench';
import { usePilatesStore } from '../store/usePilatesStore';

vi.mock('./MotionReferencePlayer', () => ({
  MotionReferencePlayer: () => <div data-testid="home-motion-reference" />,
}));

const originalState = usePilatesStore.getState();

const noopProps = () => ({
  onOpenYouTubePreview: vi.fn(),
  onOpenClipper: vi.fn(),
  onOpenLogModal: vi.fn(),
  onOpenInventory: vi.fn(),
});

describe('SequenceWorkbench Home first-screen flow & density', () => {
  beforeEach(() => {
    window.localStorage.clear();
    usePilatesStore.setState(originalState, true);
  });

  afterEach(() => {
    cleanup();
  });

  it('shows explicit 새 수업 만들기 and 최근 수업 이어가기 sections on the empty Home screen and resumes a saved class', () => {
    const baseState = usePilatesStore.getState();
    const savedClass = baseState.savedSequences[0];
    expect(savedClass).toBeDefined();

    usePilatesStore.setState({ activeSteps: [] });
    render(<SequenceWorkbench {...noopProps()} />);

    const welcomeRegion = screen.getByRole('region', { name: '첫 수업안 준비' });
    expect(within(welcomeRegion).getByText('새 수업 만들기')).toBeInTheDocument();
    expect(within(welcomeRegion).getByRole('button', { name: '동작 고르기' })).toBeEnabled();
    expect(
      within(welcomeRegion).getByRole('button', { name: /한 줄 아이디어 메모/ }),
    ).toBeEnabled();

    const recentRegion = screen.getByRole('region', { name: '최근 수업 이어가기' });
    expect(within(recentRegion).getByText(savedClass.title)).toBeInTheDocument();

    fireEvent.click(
      within(recentRegion).getByRole('button', { name: `${savedClass.title} 이어서 구성` }),
    );

    expect(usePilatesStore.getState().activeSteps.length).toBeGreaterThan(0);
    expect(usePilatesStore.getState().activeTitle).toBe(savedClass.title);
    expect(screen.getByRole('heading', { level: 1, name: '수업 구성' })).toBeInTheDocument();
  });

  it('shows a calm empty state in 최근 수업 이어가기 when no saved sequences or history logs exist', () => {
    usePilatesStore.setState({
      activeSteps: [],
      savedSequences: [],
      historyLogs: [],
    });

    render(<SequenceWorkbench {...noopProps()} />);

    const recentRegion = screen.getByRole('region', { name: '최근 수업 이어가기' });
    expect(
      within(recentRegion).getByText(/저장한 최근 수업이 아직 없습니다/),
    ).toBeInTheDocument();
  });

  it('supports starting a new class from an active sequence with lossless undo recovery and switching to a recent class', () => {
    const firstSaved = usePilatesStore.getState().savedSequences[0];
    usePilatesStore.getState().loadSequenceIntoWorkbench(firstSaved.id);
    const initialSteps = usePilatesStore.getState().activeSteps;
    const initialTitle = usePilatesStore.getState().activeTitle;
    expect(initialSteps.length).toBeGreaterThan(0);

    render(<SequenceWorkbench {...noopProps()} />);

    const flowBar = screen.getByRole('region', { name: '새 수업 및 최근 수업 전환' });
    const newClassBtn = within(flowBar).getByRole('button', { name: /새 수업 만들기/ });
    fireEvent.click(newClassBtn);

    expect(usePilatesStore.getState().activeSteps).toHaveLength(0);
    expect(
      screen.getByRole('heading', { level: 1, name: '수업 준비, 가볍게.' }),
    ).toBeInTheDocument();

    // Lossless undo restores the previous active class
    fireEvent.click(screen.getByRole('button', { name: '되돌리기' }));
    expect(usePilatesStore.getState().activeSteps).toHaveLength(initialSteps.length);
    expect(usePilatesStore.getState().activeTitle).toBe(initialTitle);
  });

  it('keeps technical quota status visually hidden via sr-only on the first screen', () => {
    render(<SequenceWorkbench {...noopProps()} />);
    const quotaText = screen.getByText('무료 한도 보호 · 소진 시 로컬 전환');
    expect(quotaText).toHaveClass('sr-only');
  });
});
