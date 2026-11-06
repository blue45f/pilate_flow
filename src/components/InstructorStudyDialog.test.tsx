import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { exerciseRevision } from '../utils/exerciseReview';
import { InstructorStudyDialog } from './InstructorStudyDialog';

describe('instructor personal study, separate from review', () => {
  const pending = structuredClone(INITIAL_EXERCISES[0]);
  const props = () => ({
    exercises: [pending],
    study: {
      bookmarkedExerciseIds: [],
      rehearsalCueHidden: true,
      completedTutorialTaskIds: [],
    },
    onToggleBookmark: vi.fn(),
    onCueHiddenChange: vi.fn(),
    onTutorialTaskChange: vi.fn(),
    onOpenReview: vi.fn(),
    onClose: vi.fn(),
  });
  it('keeps unreviewed teaching cues hidden, retains exact-motion absence and offers review', () => {
    const input = props();
    render(<InstructorStudyDialog {...input} />);
    expect(screen.getByText('티칭 메모 확인')).toBeInTheDocument();
    expect(screen.getByText(/추가하거나 구성하는 데 검토는 필요하지 않습니다/)).toBeInTheDocument();
    expect(screen.queryByText(/미검토 자료는 수업 진행/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '큐 확인하기' })).not.toBeInTheDocument();
    expect(screen.getAllByText(/모션 제작 대기/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: '동작 노트에서 직접 검토' }));
    expect(input.onOpenReview).toHaveBeenCalledWith(pending);
  });
  it('bookmarks and usage checks call only their own personal-state callbacks', () => {
    const input = props();
    render(<InstructorStudyDialog {...input} />);
    fireEvent.click(screen.getByRole('button', { name: '북마크' }));
    expect(input.onToggleBookmark).toHaveBeenCalledWith(pending.id);
    fireEvent.click(screen.getByRole('button', { name: '사용법 다시 보기' }));
    fireEvent.click(screen.getByRole('checkbox', { name: '이 기능을 직접 해봤어요' }));
    expect(input.onTutorialTaskChange).toHaveBeenCalledWith('conditions', true);
    expect(input.onOpenReview).not.toHaveBeenCalled();
    expect(pending.review).toBeUndefined();
  });
  it('recalls reviewed cues only on explicit request and does not replace a plan', () => {
    const approved = structuredClone(pending);
    approved.review = {
      status: 'approved',
      reviewerAlias: '강사 별칭',
      reviewedAt: '2026-11-04T12:00:00.000Z',
      revision: exerciseRevision(approved),
      scope: 'planning-metadata',
      credentialVerified: false,
    };
    const input = props();
    const { rerender } = render(<InstructorStudyDialog {...input} exercises={[approved]} />);
    const reveal = screen.getByRole('button', { name: '큐 확인하기' });
    expect(reveal).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(approved.cues[0])).not.toBeInTheDocument();
    fireEvent.click(reveal);
    expect(input.onCueHiddenChange).toHaveBeenCalledWith(false);
    rerender(
      <InstructorStudyDialog
        {...input}
        exercises={[approved]}
        study={{ ...input.study, rehearsalCueHidden: false }}
      />,
    );
    expect(
      within(
        within(screen.getByRole('region', { name: '티칭 큐 기억 연습' })).getByRole('list'),
      ).getByText(approved.cues[0]),
    ).toBeInTheDocument();
    expect(input.onOpenReview).not.toHaveBeenCalled();
  });
  it('keeps bookmarked-only empty state usable and usage guide bounded', () => {
    const input = props();
    render(<InstructorStudyDialog {...input} />);
    fireEvent.click(screen.getByRole('button', { name: /북마크만/ }));
    expect(screen.getByText(/조건에 맞는 동작이 없습니다/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '사용법 다시 보기' }));
    expect(screen.getByRole('button', { name: '이전' })).toBeDisabled();
    for (let index = 0; index < 3; index++)
      fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled();
    expect(screen.getByText('수업 진행과 기록 보관')).toBeInTheDocument();
  });
});
