import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

it('opens the existing workbench only on explicit request without completing tutorial or reviewing data', () => {
  const onOpenWorkbench = vi.fn();
  const onTutorialTaskChange = vi.fn();
  const onOpenReview = vi.fn();
  render(
    <InstructorStudyDialog
      exercises={INITIAL_EXERCISES}
      study={{ bookmarkedExerciseIds: [], rehearsalCueHidden: true, completedTutorialTaskIds: [] }}
      onToggleBookmark={vi.fn()}
      onCueHiddenChange={vi.fn()}
      onTutorialTaskChange={onTutorialTaskChange}
      onOpenReview={onOpenReview}
      onClose={vi.fn()}
      onOpenWorkbench={onOpenWorkbench}
      initialMode="guide"
    />,
  );
  expect(onOpenWorkbench).not.toHaveBeenCalled();
  expect(screen.getByRole('list')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '다음' }));
  expect(screen.getByText(/검토 기록은 선택/)).toBeInTheDocument();
  expect(screen.queryByText(/직접 등록·검토한 동작/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '내 수업 구성으로 가기' }));
  expect(onOpenWorkbench).toHaveBeenCalledTimes(1);
  expect(onTutorialTaskChange).not.toHaveBeenCalled();
  expect(onOpenReview).not.toHaveBeenCalled();
});

it('lazily mounts MovementVisualGuideCard in study mode and supports ArrowLeft/ArrowRight/Home/End on rehearsal layers', async () => {
  const approved = structuredClone(INITIAL_EXERCISES[0]);
  approved.review = {
    status: 'approved',
    reviewerAlias: '강사 별칭',
    reviewedAt: '2026-11-04T12:00:00.000Z',
    revision: exerciseRevision(approved),
    scope: 'planning-metadata',
    credentialVerified: false,
  };
  render(
    <InstructorStudyDialog
      exercises={[approved, INITIAL_EXERCISES[1]]}
      study={{
        bookmarkedExerciseIds: [],
        rehearsalCueHidden: false,
        completedTutorialTaskIds: [],
      }}
      onToggleBookmark={vi.fn()}
      onCueHiddenChange={vi.fn()}
      onTutorialTaskChange={vi.fn()}
      onOpenReview={vi.fn()}
      onClose={vi.fn()}
    />,
  );

  const disclosure = screen.getByTestId('study-visual-guide-disclosure');
  const summary = within(disclosure).getByText(
    '시작·중간·끝 자세 변화 및 유사 동작 7차원 비교 보기',
  );
  expect(summary).toBeInTheDocument();
  expect(disclosure.children).toHaveLength(1);

  fireEvent.click(summary);
  await waitFor(() => {
    expect(disclosure).toHaveAttribute('open');
    expect(disclosure.children.length).toBeGreaterThan(1);
  });

  const layerGroup = screen.getByRole('group', { name: '단계별 변형' });
  const easyBtn = within(layerGroup).getByRole('button', { name: '쉽게' });
  const standardBtn = within(layerGroup).getByRole('button', { name: '기본' });
  const hardBtn = within(layerGroup).getByRole('button', { name: '심화' });

  expect(standardBtn).toHaveAttribute('aria-pressed', 'true');
  standardBtn.focus();

  fireEvent.keyDown(standardBtn, { key: 'ArrowRight' });
  expect(hardBtn).toHaveAttribute('aria-pressed', 'true');
  expect(hardBtn).toHaveFocus();

  fireEvent.keyDown(hardBtn, { key: 'ArrowRight' });
  expect(easyBtn).toHaveAttribute('aria-pressed', 'true');
  expect(easyBtn).toHaveFocus();

  fireEvent.keyDown(easyBtn, { key: 'ArrowLeft' });
  expect(hardBtn).toHaveAttribute('aria-pressed', 'true');
  expect(hardBtn).toHaveFocus();

  fireEvent.keyDown(hardBtn, { key: 'Home' });
  expect(easyBtn).toHaveAttribute('aria-pressed', 'true');
  expect(easyBtn).toHaveFocus();

  fireEvent.keyDown(easyBtn, { key: 'End' });
  expect(hardBtn).toHaveAttribute('aria-pressed', 'true');
  expect(hardBtn).toHaveFocus();
});

