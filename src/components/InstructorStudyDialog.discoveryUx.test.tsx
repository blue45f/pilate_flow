import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { exerciseRevision } from '../utils/exerciseReview';
import { InstructorStudyDialog } from './InstructorStudyDialog';

const exercises = Array.from({ length: 14 }, (_, index) => ({
  ...structuredClone(INITIAL_EXERCISES[0]),
  id: `study-${index}`,
  nameKo: index === 0 ? '골반 시계' : `연습 동작 ${index + 1}`,
  nameEn: index === 0 ? 'Pelvic Clock' : `Study Movement ${index + 1}`,
  layers: { easy: `쉽게 ${index}`, standard: `기본 ${index}`, hard: `심화 ${index}` },
}));
const props = () => ({
  exercises,
  study: {
    bookmarkedExerciseIds: [] as string[],
    rehearsalCueHidden: true,
    completedTutorialTaskIds: [],
  },
  onToggleBookmark: vi.fn(),
  onCueHiddenChange: vi.fn(),
  onTutorialTaskChange: vi.fn(),
  onOpenReview: vi.fn(),
  onClose: vi.fn(),
});
const flushFocus = () => act(() => new Promise((resolve) => setTimeout(resolve, 30)));
const search = () => screen.getByRole('searchbox', { name: '연습할 동작 검색' });
const list = () => document.querySelector('.study-exercise-list') as HTMLElement;
const detail = () => screen.getByRole('region', { name: '선택한 동작 숙지' });
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('study discovery and responsive handoff', () => {
  it('preserves the main visual tutorial entry and return callback alongside discovery changes', async () => {
    const input = props();
    const onOpenWorkbench = vi.fn();
    render(<InstructorStudyDialog {...input} onOpenWorkbench={onOpenWorkbench} />);
    fireEvent.click(screen.getByRole('button', { name: '사용법 다시 보기' }));
    const disclosure = screen.getByText('첫 수업 3단계 시각 도해 가이드 보기').closest('details')!;
    disclosure.open = true;
    fireEvent(disclosure, new Event('toggle'));
    const returnButton = await screen.findByTestId('tutorial-return-workbench-btn');
    fireEvent.click(returnButton);
    expect(onOpenWorkbench).toHaveBeenCalledOnce();
    expect(input.onTutorialTaskChange).not.toHaveBeenCalled();
    expect(input.onOpenReview).not.toHaveBeenCalled();
  });

  it('matches spacing and Unicode in names without writing study or review data', () => {
    const input = props();
    const before = JSON.stringify(input.exercises);
    render(<InstructorStudyDialog {...input} />);
    search().focus();
    fireEvent.change(search(), { target: { value: '골반시계'.normalize('NFD') } });
    expect(within(list()).getAllByRole('button')).toHaveLength(1);
    expect(search()).toHaveFocus();
    fireEvent.change(search(), { target: { value: 'ＰＥＬＶＩＣＣＬＯＣＫ' } });
    expect(within(list()).getByRole('button', { name: '골반 시계' })).toBeVisible();
    expect(input.onToggleBookmark).not.toHaveBeenCalled();
    expect(input.onOpenReview).not.toHaveBeenCalled();
    expect(input.onTutorialTaskChange).not.toHaveBeenCalled();
    expect(JSON.stringify(input.exercises)).toBe(before);
  });

  it('clears combined search and bookmark filters from the empty state and restores search focus', async () => {
    const input = props();
    render(
      <InstructorStudyDialog
        {...input}
        study={{ ...input.study, bookmarkedExerciseIds: ['study-0'] }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /북마크만/ }));
    fireEvent.change(search(), { target: { value: '없는 동작' } });
    fireEvent.click(screen.getByRole('button', { name: '전체 동작 보기' }));
    await flushFocus();
    expect(search()).toHaveValue('');
    expect(search()).toHaveFocus();
    expect(screen.getByRole('button', { name: /북마크만/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(within(list()).getAllByRole('button')).toHaveLength(6);
    expect(input.onToggleBookmark).not.toHaveBeenCalled();
  });

  it('focuses the chosen note and returns to the same list item, including repeated selection', async () => {
    render(<InstructorStudyDialog {...props()} />);
    const choice = within(list()).getByRole('button', { name: '연습 동작 2' });
    for (let repeat = 0; repeat < 2; repeat++) {
      fireEvent.click(choice);
      await flushFocus();
      expect(within(detail()).getByRole('heading', { name: '연습 동작 2' })).toHaveFocus();
      fireEvent.click(screen.getByRole('button', { name: '동작 목록으로' }));
      await flushFocus();
      expect(choice).toHaveFocus();
    }
  });

  it('places keyboard focus on the first newly revealed row without changing the selected note', async () => {
    render(<InstructorStudyDialog {...props()} />);
    fireEvent.click(screen.getByRole('button', { name: '6개 더 보기' }));
    await flushFocus();
    expect(within(list()).getAllByRole('button')).toHaveLength(12);
    expect(within(list()).getByRole('button', { name: '연습 동작 7' })).toHaveFocus();
    expect(within(detail()).getByRole('heading', { name: '골반 시계' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '2개 더 보기' }));
    await flushFocus();
    expect(within(list()).getByRole('button', { name: '연습 동작 13' })).toHaveFocus();
  });

  it('reveals an initially selected note outside the first page when returning to the list', async () => {
    render(<InstructorStudyDialog {...props()} initialExerciseId="study-13" />);
    expect(within(list()).queryByRole('button', { name: '연습 동작 14' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '동작 목록으로' }));
    await flushFocus();
    expect(within(list()).getByRole('button', { name: '연습 동작 14' })).toHaveFocus();
  });

  it('does not carry a harder variation to another note selected by filtering', () => {
    const input = props();
    const approved = exercises.map((exercise) => ({
      ...exercise,
      review: {
        status: 'approved' as const,
        reviewerAlias: '합성 검토자',
        reviewedAt: '2026-11-07T00:00:00.000Z',
        revision: exerciseRevision(exercise),
        scope: 'planning-metadata' as const,
        credentialVerified: false as const,
      },
    }));
    render(
      <InstructorStudyDialog
        {...input}
        exercises={approved}
        study={{ ...input.study, rehearsalCueHidden: false }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '심화' }));
    expect(screen.getByText('심화 0', { exact: true })).toBeVisible();
    fireEvent.change(search(), { target: { value: '연습 동작 2' } });
    expect(screen.getByRole('button', { name: '기본' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('기본 1', { exact: true })).toBeVisible();
    expect(input.onOpenReview).not.toHaveBeenCalled();
  });

  it('keeps an empty catalog navigable without suggesting that filters can recover missing data', () => {
    const input = props();
    render(<InstructorStudyDialog {...input} exercises={[]} />);
    expect(screen.getByText('조건에 맞는 동작이 없습니다.')).toBeVisible();
    expect(screen.queryByRole('button', { name: '전체 동작 보기' })).toBeNull();
    expect(screen.queryByRole('region', { name: '선택한 동작 숙지' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '사용법 다시 보기' }));
    expect(screen.getByRole('button', { name: '다음' })).toBeVisible();
    expect(input.onToggleBookmark).not.toHaveBeenCalled();
    expect(input.onOpenReview).not.toHaveBeenCalled();
  });

  it('cancels deferred focus when the dialog unmounts', async () => {
    const { unmount } = render(<InstructorStudyDialog {...props()} />);
    const choice = within(list()).getByRole('button', { name: '연습 동작 2' });
    const heading = within(detail()).getByRole('heading', { name: '골반 시계' });
    const focus = vi.spyOn(heading, 'focus');
    fireEvent.click(choice);
    unmount();
    await flushFocus();
    expect(focus).not.toHaveBeenCalled();
  });
});
