import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import { YT_PREVIEW_EDIT_DRAFT_STORAGE_KEY, YouTubePreviewModal } from './YouTubePreviewModal';

vi.mock('./MotionReferencePlayer', () => ({
  MotionReferencePlayer: () => null,
}));

const initialStore = usePilatesStore.getState();
const synthetic = syntheticPlanningExercise('reformer', 'core');

const getCurrentExercise = () =>
  usePilatesStore.getState().exercises.find((item) => item.id === synthetic.id)!;

beforeEach(() => {
  window.sessionStorage.clear();
  usePilatesStore.setState(
    {
      ...initialStore,
      exercises: [...INITIAL_EXERCISES, structuredClone(synthetic)],
      activeSteps: [],
      savedSequences: [],
      historyLogs: [],
    },
    true,
  );
  vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function (
    this: HTMLDialogElement,
  ) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  });
});

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  usePilatesStore.setState(initialStore, true);
  vi.restoreAllMocks();
});

describe('Wave2-3 YouTubePreviewModal step clarity, edit draft recovery & reset', () => {
  it('연습과 수업 메모를 직접 오가며 선택한 화면과 편집 항목을 확인한다', () => {
    render(<YouTubePreviewModal exercise={getCurrentExercise()} onClose={vi.fn()} />);
    const guide = within(screen.getByTestId('yt-preview-step-guide'));
    const practice = guide.getByRole('button', { name: '동작 따라 하기' });
    const edit = guide.getByRole('button', { name: '수업 메모 편집' });
    expect(practice).toHaveAttribute('aria-current', 'page');
    expect(guide.getAllByRole('button')).toHaveLength(2);
    expect(screen.getByRole('heading', { name: '이렇게 해 보세요' })).toBeVisible();

    fireEvent.click(edit);
    expect(edit).toHaveAttribute('aria-current', 'page');
    expect(practice).not.toHaveAttribute('aria-current');
    expect(screen.getByLabelText('입력된 원본 시작 시점 · 초 · 직접 확인')).toBeVisible();
    expect(screen.getByLabelText('입력된 원본 종료 시점 · 초 · 선택')).toBeVisible();
    expect(screen.getByLabelText('티칭 큐 · 줄마다 하나 · 직접 작성')).toBeVisible();

    fireEvent.click(practice);
    expect(practice).toHaveAttribute('aria-current', 'page');
    expect(edit).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('heading', { name: '이렇게 해 보세요' })).toBeVisible();
    expect(screen.getByLabelText('입력된 원본 시작 시점 · 초 · 직접 확인')).not.toBeVisible();
  });

  it('preserves unsaved timestamp, cue note, and review edits in sessionStorage (pf_yt_preview_edit_draft_v1) across close/cancel and restores with 수정 초안 복원됨 notice on reopen', () => {
    const close = vi.fn();
    const { unmount } = render(
      <YouTubePreviewModal
        exercise={getCurrentExercise()}
        onClose={close}
        onAddToSequence={vi.fn()}
      />,
    );

    // Move to step 2 to edit timestamps and cues
    fireEvent.click(
      within(screen.getByTestId('yt-preview-step-guide')).getByRole('button', {
        name: '수업 메모 편집',
      }),
    );

    const startInput = screen.getByLabelText('입력된 원본 시작 시점 · 초 · 직접 확인');
    const endInput = screen.getByLabelText('입력된 원본 종료 시점 · 초 · 선택');
    const cueInput = screen.getByLabelText('티칭 큐 · 줄마다 하나 · 직접 작성');
    const precautionInput = screen.getByLabelText('주의·제외·개인별 적용 메모 · 직접 작성');

    fireEvent.change(startInput, { target: { value: '42' } });
    fireEvent.change(endInput, { target: { value: '108' } });
    fireEvent.change(cueInput, {
      target: { value: '날숨에 흉곽을 닫고 코어를 유지하세요\n어깨 거상을 피하세요' },
    });
    fireEvent.change(precautionInput, {
      target: { value: '손목 통증 시 그립 각도를 조절하세요' },
    });

    // Verify sessionStorage contains the draft keyed by exercise ID
    const rawDraft = window.sessionStorage.getItem(YT_PREVIEW_EDIT_DRAFT_STORAGE_KEY);
    expect(rawDraft).not.toBeNull();
    const parsedDraftMap = JSON.parse(rawDraft!);
    expect(parsedDraftMap[synthetic.id]).toBeDefined();
    expect(parsedDraftMap[synthetic.id].draft.youtube.startSec).toBe(42);
    expect(parsedDraftMap[synthetic.id].draft.youtube.endSec).toBe(108);
    expect(parsedDraftMap[synthetic.id].draft.cues).toEqual([
      '날숨에 흉곽을 닫고 코어를 유지하세요',
      '어깨 거상을 피하세요',
    ]);

    // Simulate closing/canceling the modal before saving
    unmount();

    // Re-open the modal for the same exercise
    render(
      <YouTubePreviewModal
        exercise={getCurrentExercise()}
        onClose={vi.fn()}
        onAddToSequence={vi.fn()}
      />,
    );

    // Restored banner is displayed with '수정 초안 복원됨' and '초안 초기화'
    const restoredBanner = screen.getByTestId('yt-preview-draft-restored');
    expect(restoredBanner).toBeVisible();
    expect(restoredBanner).toHaveTextContent('수정 초안 복원됨');
    expect(screen.getByRole('button', { name: '초안 초기화' })).toBeVisible();

    // Restored fields hold the unsaved edits
    expect(screen.getByLabelText('입력된 원본 시작 시점 · 초 · 직접 확인')).toHaveValue(42);
    expect(screen.getByLabelText('입력된 원본 종료 시점 · 초 · 선택')).toHaveValue(108);
    expect(screen.getByLabelText('티칭 큐 · 줄마다 하나 · 직접 작성')).toHaveValue(
      '날숨에 흉곽을 닫고 코어를 유지하세요\n어깨 거상을 피하세요',
    );
    expect(screen.getByLabelText('주의·제외·개인별 적용 메모 · 직접 작성')).toHaveValue(
      '손목 통증 시 그립 각도를 조절하세요',
    );

    // Adding to sequence is blocked until saved or reset
    expect(screen.getByRole('button', { name: '수정 내용 저장 후 추가 가능' })).toBeDisabled();
  });

  it('reverts to saved values and clears pf_yt_preview_edit_draft_v1 when 초안 초기화 is clicked', () => {
    const { unmount } = render(
      <YouTubePreviewModal
        exercise={getCurrentExercise()}
        onClose={vi.fn()}
        onAddToSequence={vi.fn()}
      />,
    );

    fireEvent.click(
      within(screen.getByTestId('yt-preview-step-guide')).getByRole('button', {
        name: '수업 메모 편집',
      }),
    );

    fireEvent.change(screen.getByLabelText('입력된 원본 시작 시점 · 초 · 직접 확인'), {
      target: { value: '75' },
    });
    fireEvent.change(screen.getByLabelText('티칭 큐 · 줄마다 하나 · 직접 작성'), {
      target: { value: '임시 초안 큐 메모' },
    });

    unmount();

    // Re-open and click '초안 초기화'
    render(
      <YouTubePreviewModal
        exercise={getCurrentExercise()}
        onClose={vi.fn()}
        onAddToSequence={vi.fn()}
      />,
    );

    expect(screen.getByText('수정 초안 복원됨')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '초안 초기화' }));

    expect(screen.queryByTestId('yt-preview-draft-restored')).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem(YT_PREVIEW_EDIT_DRAFT_STORAGE_KEY)).toBeNull();
    expect(screen.getByLabelText('입력된 원본 시작 시점 · 초 · 직접 확인')).toHaveValue(
      synthetic.youtube.startSec,
    );
    expect(screen.getByLabelText('티칭 큐 · 줄마다 하나 · 직접 작성')).toHaveValue(
      synthetic.cues.join('\n'),
    );
    expect(screen.getByRole('button', { name: '수업안에 추가' })).toBeEnabled();
  });

  it('clears pf_yt_preview_edit_draft_v1 from sessionStorage when changes are saved', () => {
    const { unmount } = render(
      <YouTubePreviewModal
        exercise={getCurrentExercise()}
        onClose={vi.fn()}
        onAddToSequence={vi.fn()}
      />,
    );

    fireEvent.click(
      within(screen.getByTestId('yt-preview-step-guide')).getByRole('button', {
        name: '수업 메모 편집',
      }),
    );

    fireEvent.change(screen.getByLabelText('입력된 원본 시작 시점 · 초 · 직접 확인'), {
      target: { value: '30' },
    });
    fireEvent.change(screen.getByLabelText('입력된 원본 종료 시점 · 초 · 선택'), {
      target: { value: '95' },
    });
    fireEvent.change(screen.getByLabelText('티칭 큐 · 줄마다 하나 · 직접 작성'), {
      target: { value: '저장될 최종 티칭 큐 메모' },
    });

    expect(window.sessionStorage.getItem(YT_PREVIEW_EDIT_DRAFT_STORAGE_KEY)).not.toBeNull();

    // Save memo
    fireEvent.click(screen.getByRole('button', { name: '수정 메모만 저장' }));

    expect(window.sessionStorage.getItem(YT_PREVIEW_EDIT_DRAFT_STORAGE_KEY)).toBeNull();
    expect(screen.queryByTestId('yt-preview-draft-restored')).not.toBeInTheDocument();
    expect(getCurrentExercise().youtube.startSec).toBe(30);
    expect(getCurrentExercise().youtube.endSec).toBe(95);
    expect(getCurrentExercise().cues).toEqual(['저장될 최종 티칭 큐 메모']);

    unmount();

    // Re-opening after save does not show draft restored notice
    render(<YouTubePreviewModal exercise={getCurrentExercise()} onClose={vi.fn()} />);
    expect(screen.queryByTestId('yt-preview-draft-restored')).not.toBeInTheDocument();
  });
});
