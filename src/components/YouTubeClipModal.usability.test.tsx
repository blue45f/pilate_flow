import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import type { PilatesExercise } from '../types/pilates';
import { exerciseRevision, isExerciseAutoEligible } from '../utils/exerciseReview';
import { YouTubePreviewModal } from './YouTubeClipModal';

vi.mock('./MotionReferencePlayer', () => ({ MotionReferencePlayer: () => null }));

const initialState = usePilatesStore.getState();
const canonicalBefore = JSON.stringify(INITIAL_EXERCISES);
const aliasLabel = '검토한 강사 별칭';
const precautionsLabel = '주의·제외·개인별 적용 메모 · 직접 작성';
const cuesLabel = '티칭 큐 · 줄마다 하나 · 직접 작성';
const approveLabel = '수정 내용을 저장하고 내 강사 검토로 승인';
const editorLabel = '검토 전 메모 수정 · 근거 미확인 입력값';

const syntheticNote = (id = 'synthetic-usability-own-note'): PilatesExercise => ({
  ...INITIAL_EXERCISES[0],
  id,
  isCustom: true,
  nameKo: `합성 검토 흐름 테스트 ${id} · 운동 지침 아님`,
  nameEn: 'Synthetic test only',
  apparatus: 'mat',
  requiredEquipment: ['mat'],
  props: ['none'],
  defaultDurationMin: 5,
  cues: ['합성 테스트 큐 · 실제 운동 지침 아님'],
  precautions: '',
  youtube: { ...INITIAL_EXERCISES[0].youtube, videoId: '', url: '', startSec: 0 },
  review: undefined,
});

const current = (id: string) =>
  usePilatesStore.getState().exercises.find((item) => item.id === id)!;
const review = () => within(screen.getByRole('region', { name: '내 강사 검토' }));
const consent = () => review().getByRole('checkbox', { name: /이 동작의 위 모든 조건/ });
const editor = () => review().getByText(editorLabel).closest('details')!;
const setValue = (label: string, value: string) =>
  fireEvent.change(review().getByLabelText(label), { target: { value } });
const openEditor = () => {
  editor().open = true;
  fireEvent(editor(), new Event('toggle'));
};

beforeEach(() => {
  usePilatesStore.setState({ exercises: [...INITIAL_EXERCISES] });
});

afterEach(() => {
  cleanup();
  expect(JSON.stringify(INITIAL_EXERCISES)).toBe(canonicalBefore);
  expect(INITIAL_EXERCISES).toHaveLength(98);
  expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
  usePilatesStore.setState(initialState);
  vi.restoreAllMocks();
});

describe('local review guidance without weakening explicit review', () => {
  it('shows the missing memo before submission, opens its existing field, and still requires explicit confirmation', async () => {
    const note = syntheticNote();
    usePilatesStore.setState({ exercises: [...INITIAL_EXERCISES, note] });
    const add = vi.fn();
    render(<YouTubePreviewModal exercise={note} onClose={vi.fn()} onAddToSequence={add} />);
    fireEvent.click(screen.getByText('내 검토 기록 (선택)'));
    expect(review().getByRole('status')).toHaveTextContent('주의·적용 메모를 먼저 작성');
    expect(editor()).not.toHaveAttribute('open');
    expect(review().getByLabelText(aliasLabel)).toHaveValue('');
    expect(screen.getByRole('button', { name: '수업안에 추가' })).toBeEnabled();
    setValue(aliasLabel, 'Synthetic own reviewer · test only');
    fireEvent.click(consent());
    fireEvent.click(review().getByRole('button', { name: '주의·적용 메모 작성' }));
    await waitFor(() => expect(review().getByLabelText(precautionsLabel)).toHaveFocus());
    expect(editor()).toHaveAttribute('open');
    expect(review().getByLabelText(aliasLabel)).toHaveValue('Synthetic own reviewer · test only');
    setValue(precautionsLabel, '합성 검증용 적용 메모 · 운동 처방 아님');
    expect(consent()).not.toBeChecked();
    expect(review().getByRole('button', { name: approveLabel })).toBeDisabled();
    expect(current(note.id).review).toBeUndefined();
    expect(add).not.toHaveBeenCalled();
    fireEvent.click(consent());
    fireEvent.click(review().getByRole('button', { name: approveLabel }));
    expect(current(note.id).review).toMatchObject({
      reviewerAlias: 'Synthetic own reviewer · test only',
      scope: 'planning-metadata',
      credentialVerified: false,
    });
    expect(isExerciseAutoEligible(current(note.id))).toBe(true);
    expect(consent()).not.toBeChecked();
    expect(review().getByRole('status')).toHaveTextContent('다음은 아래 ‘수업안에 추가’');
    expect(screen.getByRole('button', { name: '수업안에 추가' })).toBeEnabled();
    expect(add).not.toHaveBeenCalled();
  });

  it('preserves the manually entered alias and editor context across memo save while resetting consent and keeping pending status', () => {
    const note = { ...syntheticNote(), precautions: '합성 기존 적용 메모' };
    usePilatesStore.setState({ exercises: [...INITIAL_EXERCISES, note] });
    render(<YouTubePreviewModal exercise={note} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('내 검토 기록 (선택)'));
    openEditor();
    setValue(aliasLabel, '내가 직접 입력한 합성 별칭');
    fireEvent.click(consent());
    setValue(cuesLabel, '수정된 합성 큐 · 실제 운동 지침 아님');
    expect(consent()).not.toBeChecked();
    fireEvent.click(consent());
    const priorRevision = exerciseRevision(current(note.id));
    fireEvent.click(review().getByRole('button', { name: '수정 메모만 저장' }));
    expect(exerciseRevision(current(note.id))).not.toBe(priorRevision);
    expect(current(note.id).cues).toEqual(['수정된 합성 큐 · 실제 운동 지침 아님']);
    expect(review().getByLabelText(aliasLabel)).toHaveValue('내가 직접 입력한 합성 별칭');
    expect(editor()).toHaveAttribute('open');
    expect(consent()).not.toBeChecked();
    expect(current(note.id).review).toBeUndefined();
    expect(isExerciseAutoEligible(current(note.id))).toBe(false);
    expect(review().getByRole('button', { name: approveLabel })).toBeDisabled();
    expect(review().getByRole('status')).toHaveTextContent('전체 확인란');
  });

  it('never imports another reviewer alias and clears this session input on exercise change and close', () => {
    const imported: PilatesExercise = {
      ...syntheticNote('synthetic-imported-review'),
      precautions: '합성 적용 메모',
    };
    imported.review = {
      status: 'approved',
      reviewerAlias: '다른 사람이 기록한 별칭',
      reviewedAt: '2026-11-01T00:00:00.000Z',
      revision: exerciseRevision(imported),
      scope: 'planning-metadata',
      credentialVerified: false,
    };
    const second = syntheticNote('synthetic-other-note');
    usePilatesStore.setState({ exercises: [...INITIAL_EXERCISES, imported, second] });
    const { rerender, unmount } = render(
      <YouTubePreviewModal exercise={imported} onClose={vi.fn()} />,
    );
    expect(review().getByLabelText(aliasLabel)).toHaveValue('');
    expect(review().getByText('다른 사람이 기록한 별칭')).toBeInTheDocument();
    expect(review().getByRole('status')).toHaveTextContent('창을 닫아도 됩니다');
    expect(review().getByRole('status')).not.toHaveTextContent('수업안에 추가');
    openEditor();
    setValue(aliasLabel, '이번 창에서 직접 입력');
    fireEvent.click(consent());
    rerender(<YouTubePreviewModal exercise={second} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('내 검토 기록 (선택)'));
    expect(review().getByLabelText(aliasLabel)).toHaveValue('');
    expect(editor()).not.toHaveAttribute('open');
    expect(consent()).not.toBeChecked();
    setValue(aliasLabel, '닫기 전 합성 별칭');
    unmount();
    render(<YouTubePreviewModal exercise={second} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('내 검토 기록 (선택)'));
    expect(review().getByLabelText(aliasLabel)).toHaveValue('');
    expect(editor()).not.toHaveAttribute('open');
    expect(current(imported.id).review?.reviewerAlias).toBe('다른 사람이 기록한 별칭');
  });

  it('keeps unfinished fields when collapsed and rejects invalid source input without clearing the typed alias or bypassing review', () => {
    const note = { ...syntheticNote(), precautions: '합성 적용 메모' };
    usePilatesStore.setState({ exercises: [...INITIAL_EXERCISES, note] });
    render(<YouTubePreviewModal exercise={note} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('내 검토 기록 (선택)'));
    openEditor();
    setValue(aliasLabel, '합성 직접 입력자');
    setValue(cuesLabel, '아직 저장하지 않은 합성 큐');
    setValue('원본 영상 URL · 없으면 비워 두기', 'https://example.com/not-youtube');
    editor().open = false;
    fireEvent(editor(), new Event('toggle'));
    openEditor();
    expect(review().getByLabelText(cuesLabel)).toHaveValue('아직 저장하지 않은 합성 큐');
    expect(current(note.id).cues).toEqual(note.cues);
    fireEvent.click(consent());
    fireEvent.click(review().getByRole('button', { name: approveLabel }));
    expect(review().getByRole('alert')).toHaveTextContent('유효한 YouTube 영상 주소');
    expect(review().getByLabelText(aliasLabel)).toHaveValue('합성 직접 입력자');
    expect(editor()).toHaveAttribute('open');
    expect(current(note.id).review).toBeUndefined();
    expect(current(note.id).youtube.url).toBe('');
    expect(isExerciseAutoEligible(current(note.id))).toBe(false);
  });
});
