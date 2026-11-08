import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExerciseAtlasView } from './ExerciseAtlasView';
import { usePilatesStore } from '../store/usePilatesStore';
import { ORIGINAL_MOVEMENTS } from '../data/originalMovements';

const original = usePilatesStore.getState();
beforeEach(() => {
  usePilatesStore.setState(
    {
      ...original,
      exercises: ORIGINAL_MOVEMENTS,
      activeSteps: [],
      historyLogs: [],
      activeTab: 'atlas',
    },
    true,
  );
});
afterEach(() => {
  cleanup();
  usePilatesStore.setState(original, true);
});
const renderAtlas = () =>
  render(<ExerciseAtlasView onOpenYouTubePreview={vi.fn()} onOpenClipper={vi.fn()} />);

describe('atlas focus recovery without replacing current discovery UI', () => {
  it('returns focus to the exact diagram trigger on close without changing exercise data', async () => {
    const before = usePilatesStore.getState();
    renderAtlas();
    const trigger = screen.getByRole('button', {
      name: '일반 의자 · 양팔 앞·위 리치 도해 초안 보기',
    });
    fireEvent.click(trigger);
    const preview = screen.getByRole('region', { name: '선택한 패턴 도해 미리보기' });
    await waitFor(() => expect(within(preview).getByRole('heading', { level: 2 })).toHaveFocus());
    expect(preview).toHaveTextContent('일시정지 · 자동 재생 없음');
    fireEvent.click(screen.getByRole('button', { name: '패턴 도해 미리보기 닫기' }));
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(usePilatesStore.getState().exercises).toBe(before.exercises);
    expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
  });

  it('falls back to search if filtering removes the original preview trigger', async () => {
    renderAtlas();
    fireEvent.click(
      screen.getByRole('button', { name: '일반 의자 · 양팔 앞·위 리치 도해 초안 보기' }),
    );
    await waitFor(() =>
      expect(screen.getByRole('region', { name: '선택한 패턴 도해 미리보기' })).toBeInTheDocument(),
    );
    const search = screen.getByRole('searchbox', { name: '동작 검색' });
    fireEvent.change(search, { target: { value: '호흡' } });
    fireEvent.click(screen.getByRole('button', { name: '패턴 도해 미리보기 닫기' }));
    await waitFor(() => expect(search).toHaveFocus());
    expect(search).toHaveValue('호흡');
  });

  it('restores search focus after each clear, chip removal, reset and empty-result recovery', async () => {
    renderAtlas();
    const search = screen.getByRole('searchbox', { name: '동작 검색' });
    const activate = async (button: HTMLElement) => {
      button.focus();
      fireEvent.click(button);
      await waitFor(() => expect(search).toHaveFocus());
    };
    fireEvent.change(search, { target: { value: '호흡' } });
    await activate(screen.getByRole('button', { name: '검색어 지우기' }));
    expect(search).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: '즐겨찾기' }));
    fireEvent.change(search, { target: { value: '호흡' } });
    const chips = screen.getByRole('group', { name: '적용된 검색·필터' });
    await activate(within(chips).getByRole('button', { name: '검색: 호흡 필터 해제' }));
    expect(search).toHaveValue('');
    expect(screen.getByRole('button', { name: '즐겨찾기' })).toHaveAttribute('aria-pressed', 'true');
    await activate(screen.getByRole('button', { name: '필터 초기화' }));
    expect(screen.getByRole('button', { name: '즐겨찾기' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.change(search, { target: { value: 'no-such-movement-xyz' } });
    const empty = screen.getByText('조건에 맞는 동작이 없어요.').closest('.library-empty') as HTMLElement;
    await activate(within(empty).getByRole('button', { name: '검색어 지우기' }));
    expect(search).toHaveValue('');
    fireEvent.change(search, { target: { value: 'no-such-movement-xyz' } });
    await activate(screen.getByRole('button', { name: '전체 동작 보기' }));
    expect(search).toHaveValue('');
    expect(screen.queryByRole('group', { name: '적용된 검색·필터' })).toBeNull();
  });
});
