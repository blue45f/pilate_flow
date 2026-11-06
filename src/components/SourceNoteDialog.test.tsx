import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VERIFIED_REFERENCES } from '../data/verifiedReferences';
import { usePilatesStore } from '../store/usePilatesStore';
import { getExerciseReviewState, isExerciseAutoEligible } from '../utils/exerciseReview';
import { SourceNoteDialog } from './SourceNoteDialog';
import { YouTubePreviewModal } from './YouTubeClipModal';

const reference = VERIFIED_REFERENCES.find((item) => item.id === 'mv-01')!;
const previousExercises = usePilatesStore.getState().exercises;

beforeEach(() => {
  usePilatesStore.setState({ exercises: [...previousExercises] });
});
afterEach(() => {
  cleanup();
  usePilatesStore.setState({ exercises: previousExercises });
});

describe('public source to personal pending note', () => {
  it.each(['own', 'source'] as const)(
    'requires an explicit discard for the changed %s form and reports cancellation once with a no-event dialog polyfill',
    (mode) => {
      const onClose = vi.fn();
      const onSaved = vi.fn();
      render(
        <SourceNoteDialog
          reference={mode === 'source' ? reference : undefined}
          onClose={onClose}
          onSaved={onSaved}
        />,
      );
      const dialog = screen.getByRole('dialog', {
        name: mode === 'source' ? '공개 자료로 내 계획 노트 작성' : '내 동작 직접 등록',
      });
      expect(dialog).toHaveAttribute('open');
      fireEvent.change(within(dialog).getByLabelText('내가 계획할 동작 이름 *'), {
        target: { value: '저장하지 않을 합성 입력' },
      });
      fireEvent.click(within(dialog).getByRole('button', { name: '취소' }));
      expect(dialog).toHaveAttribute('open');
      expect(onClose).not.toHaveBeenCalled();
      fireEvent.click(within(dialog).getByRole('button', { name: '입력 내용 버리고 닫기' }));
      expect(dialog).not.toHaveAttribute('open');
      expect(onClose).toHaveBeenCalledTimes(1);
      fireEvent(dialog, new Event('close'));
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onSaved).not.toHaveBeenCalled();
      expect(usePilatesStore.getState().exercises).toHaveLength(previousExercises.length);
    },
  );

  it('requires manually entered planning values and never preselects the source setup or observed time', () => {
    const onSaved = vi.fn();
    render(<SourceNoteDialog reference={reference} onClose={vi.fn()} onSaved={onSaved} />);
    const dialog = within(screen.getByRole('dialog', { name: '공개 자료로 내 계획 노트 작성' }));
    expect(dialog.getByLabelText('내가 계획할 동작 이름 *')).toHaveValue(reference.title);
    expect(dialog.getByLabelText('직접 정한 계획 시간 · 분 *')).toHaveValue(null);
    expect(dialog.getByLabelText('직접 확인한 난이도 *')).toHaveValue('');
    expect(dialog.getByLabelText('직접 작성한 티칭 큐 · 줄마다 하나 *')).toHaveValue('');
    expect(dialog.queryAllByRole('button', { pressed: true })).toHaveLength(0);
    fireEvent.click(dialog.getByRole('button', { name: '검토 전 노트 저장하고 검토하기' }));
    expect(dialog.getByRole('alert')).toHaveTextContent('직접 확인한 기구');
    expect(onSaved).not.toHaveBeenCalled();
    expect(usePilatesStore.getState().exercises).toHaveLength(previousExercises.length);
  });

  it('saves a separate pending note and hands that same note to the existing review screen', () => {
    const onSaved = vi.fn();
    const ledgerBefore = JSON.stringify(VERIFIED_REFERENCES);
    render(<SourceNoteDialog reference={reference} onClose={vi.fn()} onSaved={onSaved} />);
    const dialog = within(screen.getByRole('dialog', { name: '공개 자료로 내 계획 노트 작성' }));
    fireEvent.change(dialog.getByLabelText('내가 계획할 동작 이름 *'), {
      target: { value: '합성 출처 연결 테스트 노트' },
    });
    fireEvent.change(dialog.getByLabelText('직접 정한 계획 시간 · 분 *'), {
      target: { value: '2.5' },
    });
    fireEvent.change(dialog.getByLabelText('직접 확인한 좌우 진행 방식 *'), {
      target: { value: 'together' },
    });
    fireEvent.click(dialog.getByRole('button', { name: '매트' }));
    fireEvent.click(dialog.getByRole('button', { name: '소도구 없음' }));
    fireEvent.change(dialog.getByLabelText('직접 확인한 난이도 *'), { target: { value: '1.0' } });
    fireEvent.change(dialog.getByLabelText('내 계획의 구간 분류 *'), {
      target: { value: 'warmup' },
    });
    fireEvent.change(dialog.getByLabelText('직접 확인한 시작 자세 *'), {
      target: { value: 'seated' },
    });
    fireEvent.change(dialog.getByLabelText('직접 작성한 티칭 큐 · 줄마다 하나 *'), {
      target: { value: '합성 데이터만 사용하는 테스트 메모\n' },
    });
    fireEvent.click(dialog.getByRole('button', { name: '검토 전 노트 저장하고 검토하기' }));
    expect(onSaved).toHaveBeenCalledTimes(1);
    const note = onSaved.mock.calls[0][0];
    expect(usePilatesStore.getState().exercises.find((item) => item.id === note.id)).toEqual(note);
    expect(note.requiredEquipment).toEqual(['mat']);
    expect(note.cues).toEqual(['합성 데이터만 사용하는 테스트 메모']);
    expect(note.defaultDurationMin).toBe(2.5);
    expect(note.sourceReference.url).toBe(reference.url);
    expect(note.sourceReference.referenceId).toBe('mv-01');
    expect(note.sourceReference.rights).toBe('link-only');
    expect(note.youtube.url).toBe('');
    expect(note.youtube.videoId).toBe('');
    expect(note.youtube.startSec).toBe(0);
    expect(note.youtube.endSec).toBeUndefined();
    expect(note.review).toBeUndefined();
    expect(getExerciseReviewState(note)).toBe('pending');
    expect(isExerciseAutoEligible(note)).toBe(false);
    expect(usePilatesStore.getState().exercises.filter(isExerciseAutoEligible)).toHaveLength(0);
    expect(JSON.stringify(VERIFIED_REFERENCES)).toBe(ledgerBefore);

    cleanup();
    render(<YouTubePreviewModal exercise={note} onClose={vi.fn()} onAddToSequence={vi.fn()} />);
    const reviewDialog = within(screen.getByRole('dialog', { name: note.nameKo }));
    expect(
      within(
        reviewDialog.getByRole('heading', { name: '자료의 출처와 검토 상태' }).closest('section')!,
      ).getByRole('link', { name: '보존된 원출처 열기' }),
    ).toHaveAttribute('href', reference.url);
    expect(reviewDialog.getByRole('region', { name: '내 강사 검토' })).toBeDefined();
    expect(
      reviewDialog.queryByText('유효한 영상 링크가 없어 원본을 열 수 없습니다.'),
    ).not.toBeInTheDocument();
    expect(reviewDialog.queryByText('참조 구간')).not.toBeInTheDocument();
    expect(reviewDialog.queryByTitle(/YouTube 원본 참조/)).not.toBeInTheDocument();
    expect(reviewDialog.getByRole('button', { name: /내 강사 검토로 승인/ })).toBeDisabled();
  });

  it('registers an instructor-authored movement with explicit sides and no external source or URL', () => {
    const onSaved = vi.fn();
    render(<SourceNoteDialog onClose={vi.fn()} onSaved={onSaved} />);
    const dialog = within(screen.getByRole('dialog', { name: '내 동작 직접 등록' }));
    expect(dialog.getByLabelText('내가 계획할 동작 이름 *')).toHaveValue('');
    expect(dialog.getByLabelText('직접 확인한 좌우 진행 방식 *')).toHaveValue('');
    expect(dialog.queryByRole('link', { name: '원본 자료 확인' })).not.toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: '검토 전 노트 저장하고 검토하기' }));
    expect(onSaved).not.toHaveBeenCalled();
    expect(usePilatesStore.getState().exercises).toHaveLength(previousExercises.length);
    fireEvent.change(dialog.getByLabelText('내가 계획할 동작 이름 *'), {
      target: { value: '합성 직접 등록 테스트 동작' },
    });
    fireEvent.change(dialog.getByLabelText('직접 정한 계획 시간 · 분 *'), {
      target: { value: '4' },
    });
    fireEvent.change(dialog.getByLabelText('직접 확인한 좌우 진행 방식 *'), {
      target: { value: 'separate' },
    });
    fireEvent.click(dialog.getByRole('button', { name: '매트' }));
    fireEvent.click(dialog.getByRole('button', { name: '소도구 없음' }));
    fireEvent.change(dialog.getByLabelText('직접 확인한 난이도 *'), { target: { value: '1.0' } });
    fireEvent.change(dialog.getByLabelText('내 계획의 구간 분류 *'), { target: { value: 'core' } });
    fireEvent.change(dialog.getByLabelText('직접 확인한 시작 자세 *'), {
      target: { value: 'seated' },
    });
    fireEvent.change(dialog.getByLabelText('직접 작성한 티칭 큐 · 줄마다 하나 *'), {
      target: { value: '합성 테스트 입력 · 실제 운동 지침 아님' },
    });
    fireEvent.click(dialog.getByRole('button', { name: '검토 전 노트 저장하고 검토하기' }));
    const note = onSaved.mock.calls[0][0];
    expect(note.id).toMatch(/^ex-custom-own-/);
    expect(note.isUnilateral).toBe(true);
    expect(note.defaultDurationMin).toBe(4);
    expect(note.sourceReference).toBeUndefined();
    expect(note.youtube.url).toBe('');
    expect(note.review).toBeUndefined();
    expect(getExerciseReviewState(note)).toBe('pending');
    expect(usePilatesStore.getState().exercises.filter(isExerciseAutoEligible)).toHaveLength(0);
    cleanup();
    render(<YouTubePreviewModal exercise={note} onClose={vi.fn()} onAddToSequence={vi.fn()} />);
    const detail = within(screen.getByRole('dialog', { name: note.nameKo }));
    expect(
      detail.getByText('강사 직접 작성 · 외부 출처 없음', { selector: '.library-badge' }),
    ).toBeInTheDocument();
    expect(
      detail.queryByText('유효한 영상 링크가 없어 원본을 열 수 없습니다.'),
    ).not.toBeInTheDocument();
    expect(detail.queryByText('참조 구간')).not.toBeInTheDocument();
    expect(detail.queryByRole('button', { name: 'YouTube 영상 불러오기' })).not.toBeInTheDocument();
  });
});
