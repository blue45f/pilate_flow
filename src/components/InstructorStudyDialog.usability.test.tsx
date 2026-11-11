import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import type { InstructorStudyState } from '../types/instructorStudy';
import type { PilatesExercise } from '../types/pilates';
import { exerciseRevision } from '../utils/exerciseReview';
import { InstructorStudyDialog } from './InstructorStudyDialog';

function buildSyntheticExercises(count = 10): PilatesExercise[] {
  return Array.from({ length: count }, (_, index) => {
    const base = structuredClone(INITIAL_EXERCISES[index % INITIAL_EXERCISES.length]);
    const item: PilatesExercise = {
      ...base,
      id: `syn-study-${index}`,
      nameKo:
        index === 0
          ? '골반 시계 연습본'
          : index === 1
            ? '헌드레드 준비 연습본'
            : `합성 동작 ${index + 1}`,
      nameEn:
        index === 0
          ? 'Pelvic Clock Study'
          : index === 1
            ? 'Hundred Prep Study'
            : `Synthetic Movement ${index + 1}`,
      breathPattern: `날숨 준비 ${index + 1}`,
      cues: [`핵심 티칭 큐 ${index + 1}-A`, `핵심 티칭 큐 ${index + 1}-B`],
      layers: {
        easy: `쉽게 변형 메모 ${index}`,
        standard: `기본 변형 메모 ${index}`,
        hard: `심화 변형 메모 ${index}`,
      },
      review: undefined,
    };
    if (index < count - 1) {
      item.review = {
        status: 'approved',
        reviewerAlias: '합성 강사 별칭',
        reviewedAt: '2026-11-10T09:00:00.000Z',
        revision: exerciseRevision(item),
        scope: 'planning-metadata',
        credentialVerified: false,
      };
    }
    return item;
  });
}

const initialCatalogSnapshot = JSON.stringify(INITIAL_EXERCISES);
const flushFocus = () => act(() => new Promise((resolvePromise) => setTimeout(resolvePromise, 30)));

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
    throw new Error('Network calls are forbidden in InstructorStudyDialog usability tests');
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  expect(JSON.stringify(INITIAL_EXERCISES)).toBe(initialCatalogSnapshot);
});

describe('InstructorStudyDialog find -> select -> practice -> return-to-edit flow', () => {
  it('remembers per-exercise difficulty variations across search switches while keeping cue-hide continuity explicit', () => {
    const synthetic = buildSyntheticExercises(4);
    const onCueHiddenChange = vi.fn();
    const onToggleBookmark = vi.fn();
    const onTutorialTaskChange = vi.fn();
    const onOpenReview = vi.fn();

    function ControlledHarness() {
      const [study, setStudy] = useState<InstructorStudyState>({
        bookmarkedExerciseIds: [],
        rehearsalCueHidden: true,
        completedTutorialTaskIds: [],
      });
      return (
        <InstructorStudyDialog
          exercises={synthetic}
          study={study}
          onToggleBookmark={(id) => {
            onToggleBookmark(id);
            setStudy((prev) => ({
              ...prev,
              bookmarkedExerciseIds: prev.bookmarkedExerciseIds.includes(id)
                ? prev.bookmarkedExerciseIds.filter((entry) => entry !== id)
                : [...prev.bookmarkedExerciseIds, id],
            }));
          }}
          onCueHiddenChange={(hidden) => {
            onCueHiddenChange(hidden);
            setStudy((prev) => ({ ...prev, rehearsalCueHidden: hidden }));
          }}
          onTutorialTaskChange={onTutorialTaskChange}
          onOpenReview={onOpenReview}
          onClose={vi.fn()}
        />
      );
    }

    render(<ControlledHarness />);

    const recallRegion = screen.getByRole('region', { name: '티칭 큐 기억 연습' });
    const layerGroup = within(recallRegion).getByRole('group', { name: '단계별 변형' });

    // Choose '심화' while cues are still hidden: prompt reflects '심화' without leaking cues or layer text
    fireEvent.click(within(layerGroup).getByRole('button', { name: '심화' }));
    expect(within(layerGroup).getByRole('button', { name: '심화' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(recallRegion).toHaveTextContent('선택한 심화 단계의 호흡·큐·대안을 먼저 떠올린 뒤');
    expect(screen.queryByText('핵심 티칭 큐 1-A')).toBeNull();
    expect(screen.queryByText('심화 변형 메모 0')).toBeNull();

    // Reveal cues -> shows Exercise 1 cues and its chosen '심화' note
    fireEvent.click(within(recallRegion).getByRole('button', { name: '큐 확인하기' }));
    expect(onCueHiddenChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByText('핵심 티칭 큐 1-A')).toBeVisible();
    expect(screen.getByText('심화 변형 메모 0')).toBeVisible();

    // Search for Exercise 2 -> cue visibility stays open, while difficulty starts cleanly at '기본'
    const searchBox = screen.getByRole('searchbox', { name: '연습할 동작 검색' });
    fireEvent.change(searchBox, { target: { value: '헌드레드 준비' } });
    expect(
      within(screen.getByRole('region', { name: '선택한 동작 숙지' })).getByRole('heading', {
        name: '헌드레드 준비 연습본',
      }),
    ).toBeVisible();

    const secondLayerGroup = screen.getByRole('group', { name: '단계별 변형' });
    expect(within(secondLayerGroup).getByRole('button', { name: '기본' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText('기본 변형 메모 1')).toBeVisible();

    // Practice '쉽게' on Exercise 2 and hide cues again
    fireEvent.click(within(secondLayerGroup).getByRole('button', { name: '쉽게' }));
    expect(screen.getByText('쉽게 변형 메모 1')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '큐 숨기기' }));
    expect(onCueHiddenChange).toHaveBeenLastCalledWith(true);

    // Clearing search keeps actively practiced Exercise 2 selected instead of snapping back to Exercise 1
    fireEvent.click(screen.getByRole('button', { name: '검색어 지우기' }));
    const detailRegion = screen.getByRole('region', { name: '선택한 동작 숙지' });
    expect(
      within(detailRegion).getByRole('heading', { name: '헌드레드 준비 연습본' }),
    ).toBeVisible();
    expect(
      within(screen.getByRole('group', { name: '단계별 변형' })).getByRole('button', {
        name: '쉽게',
      }),
    ).toHaveAttribute('aria-pressed', 'true');

    // Re-selecting Exercise 1 restores its remembered '심화' layer while preserving cue-hidden mode
    const listContainer = document.querySelector('.study-exercise-list') as HTMLElement;
    fireEvent.click(within(listContainer).getByRole('button', { name: '골반 시계 연습본' }));
    expect(within(detailRegion).getByRole('heading', { name: '골반 시계 연습본' })).toBeVisible();
    expect(
      within(screen.getByRole('group', { name: '단계별 변형' })).getByRole('button', {
        name: '심화',
      }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('심화 변형 메모 0')).toBeNull();
    expect(onTutorialTaskChange).not.toHaveBeenCalled();
    expect(onOpenReview).not.toHaveBeenCalled();
  });

  it('retains the active study note across 0-result filters, re-finds practiced items via scope chips + keyboard, and recovers list focus', async () => {
    const synthetic = buildSyntheticExercises(10);
    const onToggleBookmark = vi.fn();

    function ScopeHarness() {
      const [study, setStudy] = useState<InstructorStudyState>({
        bookmarkedExerciseIds: [],
        rehearsalCueHidden: true,
        completedTutorialTaskIds: [],
      });
      return (
        <InstructorStudyDialog
          exercises={synthetic}
          study={study}
          initialExerciseId="syn-study-8"
          onToggleBookmark={(id) => {
            onToggleBookmark(id);
            setStudy((prev) => ({
              ...prev,
              bookmarkedExerciseIds: prev.bookmarkedExerciseIds.includes(id)
                ? prev.bookmarkedExerciseIds.filter((entry) => entry !== id)
                : [...prev.bookmarkedExerciseIds, id],
            }));
          }}
          onCueHiddenChange={vi.fn()}
          onTutorialTaskChange={vi.fn()}
          onOpenReview={vi.fn()}
          onClose={vi.fn()}
        />
      );
    }

    render(<ScopeHarness />);

    const scopeGroup = screen.getByRole('group', { name: '동작 목록 범위' });
    const detailRegion = screen.getByRole('region', { name: '선택한 동작 숙지' });

    // Initial deep-linked exercise is already tracked in '이번 연습 1'
    expect(within(scopeGroup).getByRole('button', { name: '이번 연습 1' })).toBeInTheDocument();
    expect(within(detailRegion).getByRole('heading', { name: '합성 동작 9' })).toBeVisible();

    // Toggling '북마크만 0' shows empty list state WITHOUT collapsing the active study note
    fireEvent.click(within(scopeGroup).getByRole('button', { name: '북마크만 0' }));
    expect(screen.getByText('조건에 맞는 동작이 없습니다.')).toBeVisible();
    expect(within(detailRegion).getByRole('heading', { name: '합성 동작 9' })).toBeVisible();
    expect(screen.getByTestId('study-outside-filter-badge')).toHaveTextContent(
      '현재 목록 조건 밖 · 선택 유지됨',
    );

    // Bookmarking the retained note immediately populates the '북마크만 1' list
    fireEvent.click(within(detailRegion).getByRole('button', { name: '북마크' }));
    expect(onToggleBookmark).toHaveBeenCalledWith('syn-study-8');
    expect(screen.queryByTestId('study-outside-filter-badge')).toBeNull();
    const listContainer = document.querySelector('.study-exercise-list') as HTMLElement;
    expect(within(listContainer).getByRole('button', { name: /합성 동작 9/ })).toBeVisible();

    // Non-matching search keeps active note mounted; '동작 목록으로' resets filters, expands page, and focuses the row
    const searchBox = screen.getByRole('searchbox', { name: '연습할 동작 검색' });
    fireEvent.change(searchBox, { target: { value: '일치없는검색어777' } });
    expect(screen.getByTestId('study-outside-filter-badge')).toBeVisible();

    fireEvent.click(within(detailRegion).getByRole('button', { name: '동작 목록으로' }));
    await flushFocus();
    expect(searchBox).toHaveValue('');
    expect(within(scopeGroup).getByRole('button', { name: '전체' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(listContainer).getByRole('button', { name: /합성 동작 9/ })).toHaveFocus();

    // Select a 2nd movement, then use keyboard ArrowRight / End / Home / ArrowLeft on scope chips to re-find both practiced items
    fireEvent.click(within(listContainer).getByRole('button', { name: '헌드레드 준비 연습본' }));
    await flushFocus();

    const allScopeBtn = within(scopeGroup).getByRole('button', { name: '전체' });
    const bookmarkScopeBtn = within(scopeGroup).getByRole('button', { name: '북마크만 1' });
    const practicedScopeBtn = within(scopeGroup).getByRole('button', { name: '이번 연습 2' });

    allScopeBtn.focus();
    fireEvent.keyDown(scopeGroup, { key: 'ArrowRight' });
    expect(bookmarkScopeBtn).toHaveFocus();
    expect(bookmarkScopeBtn).toHaveAttribute('aria-pressed', 'true');

    fireEvent.keyDown(scopeGroup, { key: 'End' });
    expect(practicedScopeBtn).toHaveFocus();
    expect(practicedScopeBtn).toHaveAttribute('aria-pressed', 'true');
    expect(within(listContainer).getAllByRole('button')).toHaveLength(2);
    expect(
      within(listContainer).getByRole('button', { name: '헌드레드 준비 연습본' }),
    ).toBeVisible();
    expect(within(listContainer).getByRole('button', { name: /합성 동작 9/ })).toBeVisible();

    fireEvent.keyDown(scopeGroup, { key: 'Home' });
    expect(allScopeBtn).toHaveFocus();
    expect(allScopeBtn).toHaveAttribute('aria-pressed', 'true');

    fireEvent.keyDown(scopeGroup, { key: 'ArrowLeft' });
    expect(practicedScopeBtn).toHaveFocus();
    expect(practicedScopeBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('returns directly to class editing from study mode while preserving review/motion/tutorial/stage separation and CSS rules', () => {
    const synthetic = buildSyntheticExercises(3);
    const unreviewedExercise = synthetic[2];
    const onOpenWorkbench = vi.fn();
    const onOpenReview = vi.fn();
    const onTutorialTaskChange = vi.fn();
    const onToggleBookmark = vi.fn();

    const { container } = render(
      <InstructorStudyDialog
        exercises={synthetic}
        study={{
          bookmarkedExerciseIds: [],
          rehearsalCueHidden: true,
          completedTutorialTaskIds: ['conditions'],
        }}
        initialExerciseId={unreviewedExercise.id}
        onToggleBookmark={onToggleBookmark}
        onCueHiddenChange={vi.fn()}
        onTutorialTaskChange={onTutorialTaskChange}
        onOpenReview={onOpenReview}
        onOpenWorkbench={onOpenWorkbench}
        onClose={vi.fn()}
      />,
    );

    // Unreviewed note preserves review entry, motion-is-subject-to-review notice, no auto-play, and no live-stage trigger
    expect(screen.getByText('티칭 메모 확인')).toBeVisible();
    expect(screen.getAllByText(/3단계·연속 도해 대조 완료/).length).toBeGreaterThan(0);
    expect(screen.getByText(/근거와 검토 상태/)).toBeInTheDocument();
    expect(container.querySelector('[data-playing="true"]')).toBeNull();
    expect(screen.queryByRole('button', { name: /수업 시작|실제 수업 시작/ })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '동작 노트에서 직접 검토' }));
    expect(onOpenReview).toHaveBeenCalledTimes(1);
    expect(onOpenReview).toHaveBeenCalledWith(unreviewedExercise);
    expect(onOpenWorkbench).not.toHaveBeenCalled();

    // Direct return to sequence editing ('내 수업 구성으로 가기') from study mode without mutating personal/review state
    const returnEditBtn = screen.getByRole('button', { name: '내 수업 구성으로 가기' });
    fireEvent.click(returnEditBtn);
    expect(onOpenWorkbench).toHaveBeenCalledTimes(1);
    expect(onTutorialTaskChange).not.toHaveBeenCalled();
    expect(onToggleBookmark).not.toHaveBeenCalled();
    expect(unreviewedExercise.review).toBeUndefined();

    // Verify 44px touch targets, 680px/390px responsive rules, and prefers-reduced-motion in instructor-study.css
    const studyCss = readFileSync(resolve(process.cwd(), 'src/styles/instructor-study.css'), 'utf8');
    expect(studyCss).toContain('min-height: var(--pf-touch-min, 44px)');
    expect(studyCss).toContain('@media (max-width: 680px)');
    expect(studyCss).toContain('@media (max-width: 390px)');
    expect(studyCss).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
