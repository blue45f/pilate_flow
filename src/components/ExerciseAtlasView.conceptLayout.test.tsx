import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExerciseAtlasView } from './ExerciseAtlasView';
import { usePilatesStore } from '../store/usePilatesStore';
import { ORIGINAL_MOVEMENTS } from '../data/originalMovements';

const original = usePilatesStore.getState();
const movement = ORIGINAL_MOVEMENTS.find((item) => item.apparatus === 'mat')!;

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

describe('library supplied concept layout', () => {
  it('puts search and movement results before optional motion discovery without removing it', () => {
    const { container } = render(
      <ExerciseAtlasView onOpenYouTubePreview={vi.fn()} onOpenClipper={vi.fn()} />,
    );
    const search = screen.getByRole('region', { name: '동작 검색과 필터' });
    const results = container.querySelector('.library-notes-workspace')!;
    const gallery = screen.getByRole('region', { name: '모션으로 살펴보기' });
    expect(search.compareDocumentPosition(results) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      results.compareDocumentPosition(gallery) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: '다음 도해' })).toBeEnabled();
    expect(screen.getByText('관련 패턴 참고용 · 검증된 운동 시범이 아닙니다.')).toBeVisible();
  });

  it('selects existing movement information, preserves review state and hands off to full details', async () => {
    const openDetails = vi.fn();
    const before = usePilatesStore.getState();
    render(<ExerciseAtlasView onOpenYouTubePreview={openDetails} onOpenClipper={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: movement.nameKo });
    fireEvent.click(trigger);
    const inspector = screen.getByRole('complementary', { name: '선택한 동작 정보' });
    await waitFor(() =>
      expect(within(inspector).getByRole('heading', { name: '선택한 동작 정보' })).toHaveFocus(),
    );
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(within(inspector).getByRole('heading', { name: movement.nameKo })).toBeInTheDocument();
    expect(inspector).toHaveTextContent(
      '개인 검토 전 · 직접 추가 가능 (자동 추천·AI 초안 제외)',
    );
    expect(inspector).not.toHaveTextContent('교차 검증 완료 · 수업 즉시 활용');
    expect(inspector).toHaveTextContent(movement.precautions);
    fireEvent.click(within(inspector).getByRole('button', { name: '전체 정보·개인 검토 열기' }));
    expect(openDetails).toHaveBeenCalledWith(movement);
    expect(usePilatesStore.getState().exercises).toBe(before.exercises);
    expect(usePilatesStore.getState().activeSteps).toBe(before.activeSteps);
    fireEvent.click(within(inspector).getByRole('button', { name: '선택한 동작 정보 닫기' }));
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps selected information across filtering and safely restores focus if its card disappears', async () => {
    render(<ExerciseAtlasView onOpenYouTubePreview={vi.fn()} onOpenClipper={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: movement.nameKo }));
    const search = screen.getByRole('searchbox', { name: '동작 검색' });
    fireEvent.change(search, { target: { value: 'no-matching-movement-xyz' } });
    const inspector = screen.getByRole('complementary', { name: '선택한 동작 정보' });
    expect(inspector).toHaveTextContent('현재 검색 결과에 없는 동작');
    expect(inspector).toHaveTextContent(movement.nameKo);
    fireEvent.click(within(inspector).getByRole('button', { name: '선택한 동작 정보 닫기' }));
    await waitFor(() => expect(search).toHaveFocus());
    expect(search).toHaveValue('no-matching-movement-xyz');
  });

  it('dismisses the inspector on Escape key, restores focus to the card trigger, and announces added state', async () => {
    const longPrecautions = '주의메모'.repeat(50);
    usePilatesStore.setState(
      {
        ...usePilatesStore.getState(),
        exercises: ORIGINAL_MOVEMENTS.map((item) =>
          item.id === movement.id ? { ...item, precautions: longPrecautions } : item,
        ),
      },
      true,
    );
    render(<ExerciseAtlasView onOpenYouTubePreview={vi.fn()} onOpenClipper={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: movement.nameKo });
    fireEvent.click(trigger);

    const inspector = screen.getByRole('complementary', { name: '선택한 동작 정보' });
    await waitFor(() =>
      expect(within(inspector).getByRole('heading', { name: '선택한 동작 정보' })).toHaveFocus(),
    );
    expect(within(inspector).getByText(longPrecautions)).toBeInTheDocument();

    const addBtn = within(inspector).getByRole('button', { name: /선택한 동작 수업안에 추가/ });
    expect(addBtn).toHaveAttribute('data-added', 'false');
    fireEvent.click(addBtn);
    expect(addBtn).toHaveAttribute('data-added', 'true');
    expect(within(inspector).getByText(`${movement.nameKo} 동작을 수업안에 추가했습니다.`)).toBeInTheDocument();

    fireEvent.keyDown(inspector, { key: 'Escape' });
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});
