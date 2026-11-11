import { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VerifiedPublicReference } from '../data/verifiedReferences';
import { usePilatesStore } from '../store/usePilatesStore';
import type { PilatesExercise } from '../types/pilates';
import { getExerciseReviewState, isExerciseAutoEligible } from '../utils/exerciseReview';
import { SourceNoteDialog } from './SourceNoteDialog';

const originalExercises = usePilatesStore.getState().exercises;
const originalAddCustomExercise = usePilatesStore.getState().addCustomExercise;

const syntheticReference: VerifiedPublicReference = {
  id: 'syn-ref-01',
  title: '합성 체어 풋워크 출처',
  originalTitle: 'Synthetic Chair Footwork Reference',
  sourceName: '합성 공식 자료실',
  region: 'global',
  language: '한국어 합성 메타데이터',
  provider: 'website',
  url: 'https://example.invalid/synthetic-chair-footwork',
  scope: 'exercise',
  durationSeconds: null,
  classDurationSeconds: null,
  videoDurationSeconds: 185,
  durationNote: '합성 원본 영상 길이 · 수업 시간 아님',
  requiredEquipment: ['chair'],
  requiredProps: ['magic-circle'],
  additionalRequirements: [],
  requirementsKnown: false,
  metadataStatus: 'publisher-declared',
  equipmentEvidence: '합성 본문 확인',
  levelLabel: '중급(출처 표기)',
  levelEvidence: '합성 출처 표기',
  bodyFocus: ['하지', '몸통 안정'],
  bodyFocusStatus: 'publisher-stated',
  bodyFocusEvidence: '합성 본문 기재',
  metadataNote: '합성 테스트 전용 메타데이터',
  verificationStatus: 'official-source-checked',
  verifiedAt: '2026-11-04',
  verificationNote: '합성 출처 확인 · 전문가 검수 대기',
  observationPoints: [
    {
      seconds: 18,
      kind: 'observation',
      note: '합성 관찰 시점 · 동작 구간 아님',
      sourceUrl: 'https://example.invalid/synthetic-chair-footwork',
    },
  ],
  timestamps: [],
  professionalReviewStatus: 'unreviewed',
  autoRecommendationEligible: false,
  generatedMotion: false,
  instructor: '합성 강사',
  credentialEvidence: '합성 소개 확인',
  credentialEvidenceUrl: 'https://example.invalid/synthetic-instructor',
  credentialLimit: '독립 심사 아님',
  safetyNote: '합성 출처 주의 메모 · 자동 복사 금지',
  rights: 'link-only',
  rightsNote: '링크 전용 합성 테스트',
  relatedLinks: [],
  rawLedgerFile: 'verified-source-catalog.json',
  rawItemId: 'syn-ref-01',
};

beforeEach(() => {
  vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function (
    this: HTMLDialogElement,
  ) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  usePilatesStore.setState({
    exercises: originalExercises,
    addCustomExercise: originalAddCustomExercise,
  });
});

describe('SourceNoteDialog authoring, error recovery, unreviewed boundary, and return flow', () => {
  it('shows read-only source reference facts without pre-filling setup/time/precautions and saves an unreviewed note via mock without mutating real store data', () => {
    const addCustomExerciseMock = vi.fn<(exercise: PilatesExercise) => void>();
    usePilatesStore.setState({
      exercises: [...originalExercises],
      addCustomExercise: addCustomExerciseMock,
    });
    const onClose = vi.fn();
    const onSaved = vi.fn<(exercise: PilatesExercise) => void>();

    render(
      <SourceNoteDialog
        reference={syntheticReference}
        onClose={onClose}
        onSaved={onSaved}
      />,
    );

    const dialog = within(screen.getByRole('dialog', { name: '공개 자료로 내 계획 노트 작성' }));
    const originRegion = dialog.getByRole('region', { name: '보존할 원출처' });
    const facts = within(originRegion).getByTestId('source-note-origin-facts');
    expect(facts).toHaveTextContent('체어');
    expect(facts).toHaveTextContent('써클링 · 매직 서클');
    expect(facts).toHaveTextContent('중급(출처 표기)');
    expect(facts).toHaveTextContent('3분 5초 · 계획 시간 아님');
    expect(originRegion).toHaveTextContent('합성 출처 주의 메모');
    expect(within(originRegion).getByRole('link', { name: '원본 자료 확인' })).toHaveAttribute(
      'href',
      syntheticReference.url,
    );

    // Source facts never pre-select chips or pre-fill duration, level, sides, cues, or precautions
    expect(dialog.queryAllByRole('button', { pressed: true })).toHaveLength(0);
    expect(dialog.getByLabelText('직접 정한 계획 시간 · 분 *')).toHaveValue(null);
    expect(dialog.getByLabelText('직접 확인한 좌우 진행 방식 *')).toHaveValue('');
    expect(dialog.getByLabelText('직접 확인한 난이도 *')).toHaveValue('');
    expect(dialog.getByLabelText('직접 작성한 티칭 큐 · 줄마다 하나 *')).toHaveValue('');
    expect(
      dialog.getByLabelText('직접 작성한 주의·제외·개인별 적용 메모 · 선택'),
    ).toHaveValue('');
    expect(dialog.getByTestId('source-note-required-progress')).toHaveTextContent(
      '* 필수 입력 1/9 완료',
    );

    fireEvent.click(dialog.getByRole('button', { name: '체어' }));
    fireEvent.click(dialog.getByRole('button', { name: '써클링 · 매직 서클' }));
    fireEvent.change(dialog.getByLabelText('직접 정한 계획 시간 · 분 *'), {
      target: { value: '3.5' },
    });
    fireEvent.change(dialog.getByLabelText('직접 확인한 좌우 진행 방식 *'), {
      target: { value: 'together' },
    });
    fireEvent.change(dialog.getByLabelText('직접 확인한 난이도 *'), {
      target: { value: '1.5' },
    });
    fireEvent.change(dialog.getByLabelText('내 계획의 구간 분류 *'), {
      target: { value: 'footwork' },
    });
    fireEvent.change(dialog.getByLabelText('직접 확인한 시작 자세 *'), {
      target: { value: 'seated' },
    });
    fireEvent.change(dialog.getByLabelText('직접 작성한 티칭 큐 · 줄마다 하나 *'), {
      target: { value: '합성 큐 첫 줄\n합성 큐 둘째 줄' },
    });

    expect(dialog.getByTestId('source-note-required-progress')).toHaveTextContent(
      '* 필수 입력 9/9 완료',
    );
    expect(dialog.getByTestId('source-note-cue-count')).toHaveTextContent('2/12줄');

    fireEvent.click(dialog.getByRole('button', { name: '검토 전 노트 저장하고 검토하기' }));

    expect(addCustomExerciseMock).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(usePilatesStore.getState().exercises).toEqual(originalExercises);

    const savedNote = onSaved.mock.calls[0][0];
    expect(savedNote.id).toMatch(/^ex-custom-source-/);
    expect(savedNote.requiredEquipment).toEqual(['chair']);
    expect(savedNote.props).toEqual(['magic-circle']);
    expect(savedNote.defaultDurationMin).toBe(3.5);
    expect(savedNote.isUnilateral).toBe(false);
    expect(savedNote.precautions).toBe('');
    expect(savedNote.youtube.startSec).toBe(0);
    expect(savedNote.youtube.url).toBe('');
    expect(savedNote.review).toBeUndefined();
    expect(getExerciseReviewState(savedNote)).toBe('pending');
    expect(isExerciseAutoEligible(savedNote)).toBe(false);
  });

  it('guides multi-field error recovery via next-item jump while preserving 0/missing/unspecified semantics and Korean cue limits', async () => {
    const addCustomExerciseMock = vi.fn<(exercise: PilatesExercise) => void>();
    usePilatesStore.setState({
      exercises: [...originalExercises],
      addCustomExercise: addCustomExerciseMock,
    });
    const onSaved = vi.fn<(exercise: PilatesExercise) => void>();

    render(<SourceNoteDialog onClose={vi.fn()} onSaved={onSaved} />);

    expect(screen.getByTestId('source-note-required-progress')).toHaveTextContent(
      '* 필수 입력 0/9 완료',
    );

    const durationInput = screen.getByLabelText('직접 정한 계획 시간 · 분 *');
    const cuesInput = screen.getByLabelText('직접 작성한 티칭 큐 · 줄마다 하나 *');
    const thirteenLines = Array.from({ length: 13 }, (_, idx) => `합성 큐 ${idx + 1}`).join('\n');

    fireEvent.change(durationInput, { target: { value: '0' } });
    fireEvent.change(cuesInput, { target: { value: thirteenLines } });
    expect(screen.getByTestId('source-note-cue-count')).toHaveTextContent('13/12줄');

    fireEvent.click(screen.getByRole('button', { name: '검토 전 노트 저장하고 검토하기' }));
    expect(onSaved).not.toHaveBeenCalled();

    const nameInput = screen.getByLabelText('내가 계획할 동작 이름 *');
    await waitFor(() => expect(nameInput).toHaveFocus());

    // Section nav badges mark error counts across all 3 sections without hiding any required field
    expect(screen.getByRole('button', { name: '동작·장비로 이동' })).toHaveAttribute(
      'data-section-error',
      'true',
    );
    expect(screen.getByRole('button', { name: '수업 설정으로 이동' })).toHaveAttribute(
      'data-section-error',
      'true',
    );
    expect(screen.getByRole('button', { name: '설명·메모로 이동' })).toHaveAttribute(
      'data-section-error',
      'true',
    );

    // 0 duration and >12 cue lines surface clear Korean field errors
    expect(durationInput).toHaveAccessibleDescription(/0분 이하로는 저장할 수 없어요.*0\.5–20분/);
    expect(cuesInput).toHaveAccessibleDescription(/최대 12줄까지 입력/);

    // Fix field 1 (nameKo): role="alert" clears per contract, while remaining-errors bar guides to next missing field
    fireEvent.change(nameInput, { target: { value: '합성 직접 작성 노트' } });
    expect(screen.queryByRole('alert')).toBeNull();

    const recoveryBar = screen.getByTestId('source-note-remaining-errors');
    expect(recoveryBar).toHaveTextContent('확인 필요한 항목 8개 · 다음: 필수 기구');
    fireEvent.click(within(recoveryBar).getByRole('button', { name: /다음 확인 항목으로 이동/ }));
    await waitFor(() => expect(screen.getByRole('button', { name: '매트' })).toHaveFocus());

    // Select equipment -> next remaining item advances to '필수 소도구' (unspecified vs '소도구 없음')
    fireEvent.click(screen.getByRole('button', { name: '매트' }));
    expect(recoveryBar).toHaveTextContent('확인 필요한 항목 7개 · 다음: 필수 소도구');
    fireEvent.click(within(recoveryBar).getByRole('button', { name: /다음 확인 항목으로 이동/ }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '소도구 없음' })).toHaveFocus(),
    );

    // Explicitly choose '소도구 없음' -> next remaining item advances to '계획 시간' (0 is still invalid)
    fireEvent.click(screen.getByRole('button', { name: '소도구 없음' }));
    expect(recoveryBar).toHaveTextContent('확인 필요한 항목 6개 · 다음: 계획 시간');
    fireEvent.click(within(recoveryBar).getByRole('button', { name: /다음 확인 항목으로 이동/ }));
    await waitFor(() => expect(durationInput).toHaveFocus());

    // Resolve remaining fields -> recovery bar disappears and direct note saves without sourceReference
    fireEvent.change(durationInput, { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('직접 확인한 좌우 진행 방식 *'), {
      target: { value: 'separate' },
    });
    fireEvent.change(screen.getByLabelText('직접 확인한 난이도 *'), {
      target: { value: '1.0' },
    });
    fireEvent.change(screen.getByLabelText('내 계획의 구간 분류 *'), {
      target: { value: 'core' },
    });
    fireEvent.change(screen.getByLabelText('직접 확인한 시작 자세 *'), {
      target: { value: 'supine' },
    });
    fireEvent.change(cuesInput, { target: { value: '합성 직접 큐 1\n합성 직접 큐 2' } });

    expect(screen.queryByTestId('source-note-remaining-errors')).toBeNull();
    expect(screen.getByTestId('source-note-required-progress')).toHaveTextContent(
      '* 필수 입력 9/9 완료',
    );

    fireEvent.click(screen.getByRole('button', { name: '검토 전 노트 저장하고 검토하기' }));
    expect(addCustomExerciseMock).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledTimes(1);
    const ownNote = onSaved.mock.calls[0][0];
    expect(ownNote.id).toMatch(/^ex-custom-own-/);
    expect(ownNote.sourceReference).toBeUndefined();
    expect(ownNote.props).toEqual(['none']);
    expect(ownNote.isUnilateral).toBe(true);
    expect(ownNote.defaultDurationMin).toBe(4);
  });

  it('dismisses the close-confirmation banner on Escape to resume editing on the last chip/input and restores caller focus on discard', async () => {
    const onCloseSpy = vi.fn();
    const onSavedSpy = vi.fn();

    function CallerHarness() {
      const [open, setOpen] = useState(false);
      return (
        <div>
          <button type="button" onClick={() => setOpen(true)}>
            내 동작 직접 등록 열기
          </button>
          {open && (
            <SourceNoteDialog
              onClose={() => {
                onCloseSpy();
                setOpen(false);
              }}
              onSaved={onSavedSpy}
            />
          )}
        </div>
      );
    }

    render(<CallerHarness />);
    const launcherBtn = screen.getByRole('button', { name: '내 동작 직접 등록 열기' });
    launcherBtn.focus();
    fireEvent.click(launcherBtn);

    const dialog = screen.getByRole('dialog', { name: '내 동작 직접 등록' });
    const reformerChip = within(dialog).getByRole('button', { name: '리포머' });
    fireEvent.click(reformerChip);
    expect(reformerChip).toHaveAttribute('aria-pressed', 'true');

    // 1. Click '취소' -> confirmation banner opens; pressing Escape on banner resumes editing on '리포머' chip
    fireEvent.click(within(dialog).getByRole('button', { name: '취소' }));
    const decision = screen.getByRole('group', { name: '입력 내용을 어떻게 할까요?' });
    await waitFor(() => expect(decision).toHaveFocus());

    fireEvent.keyDown(decision, { key: 'Escape' });
    expect(screen.queryByRole('group', { name: '입력 내용을 어떻게 할까요?' })).toBeNull();
    expect(dialog).toHaveAttribute('open');
    await waitFor(() => expect(reformerChip).toHaveFocus());
    expect(reformerChip).toHaveAttribute('aria-pressed', 'true');

    // 2. Native 'cancel' (1st Escape) opens confirmation; 2nd native 'cancel' dismisses confirmation & resumes on '리포머' chip
    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    const secondDecision = screen.getByRole('group', { name: '입력 내용을 어떻게 할까요?' });
    await waitFor(() => expect(secondDecision).toHaveFocus());

    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(screen.queryByRole('group', { name: '입력 내용을 어떻게 할까요?' })).toBeNull();
    await waitFor(() => expect(reformerChip).toHaveFocus());
    expect(onCloseSpy).not.toHaveBeenCalled();

    // 3. Explicit discard closes once and restores focus to the original caller button
    fireEvent.click(within(dialog).getByRole('button', { name: '닫기' }));
    const finalDecision = screen.getByRole('group', { name: '입력 내용을 어떻게 할까요?' });
    const discardBtn = within(finalDecision).getByRole('button', {
      name: '입력 내용 버리고 닫기',
    });
    fireEvent.click(discardBtn);
    fireEvent.click(discardBtn);

    expect(onCloseSpy).toHaveBeenCalledTimes(1);
    expect(onSavedSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(launcherBtn).toHaveFocus();
  });

  it('keeps failed store saves retryable while preventing duplicate saves and post-save onClose calls on rapid double-clicks', () => {
    let attempts = 0;
    const addCustomExerciseMock = vi.fn<(exercise: PilatesExercise) => void>(() => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error('일시적 합성 저장 오류');
      }
    });
    usePilatesStore.setState({
      exercises: [...originalExercises],
      addCustomExercise: addCustomExerciseMock,
    });
    const onClose = vi.fn();
    const onSaved = vi.fn<(exercise: PilatesExercise) => void>();

    render(<SourceNoteDialog onClose={onClose} onSaved={onSaved} />);

    fireEvent.change(screen.getByLabelText('내가 계획할 동작 이름 *'), {
      target: { value: '중복 저장 방어 합성 노트' },
    });
    fireEvent.click(screen.getByRole('button', { name: '매트' }));
    fireEvent.click(screen.getByRole('button', { name: '소도구 없음' }));
    fireEvent.change(screen.getByLabelText('직접 정한 계획 시간 · 분 *'), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByLabelText('직접 확인한 좌우 진행 방식 *'), {
      target: { value: 'together' },
    });
    fireEvent.change(screen.getByLabelText('직접 확인한 난이도 *'), {
      target: { value: '1.0' },
    });
    fireEvent.change(screen.getByLabelText('내 계획의 구간 분류 *'), {
      target: { value: 'warmup' },
    });
    fireEvent.change(screen.getByLabelText('직접 확인한 시작 자세 *'), {
      target: { value: 'seated' },
    });
    fireEvent.change(screen.getByLabelText('직접 작성한 티칭 큐 · 줄마다 하나 *'), {
      target: { value: '합성 더블클릭 방어 큐' },
    });

    const saveBtn = screen.getByRole('button', { name: '검토 전 노트 저장하고 검토하기' });

    // First attempt fails -> surfaces alert and stays retryable
    fireEvent.click(saveBtn);
    expect(addCustomExerciseMock).toHaveBeenCalledTimes(1);
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeVisible();

    // Rapid double-click on retry + trailing close event -> saves once and never calls onClose
    fireEvent.click(saveBtn);
    fireEvent.click(saveBtn);
    fireEvent(screen.getByRole('dialog'), new Event('close'));

    expect(addCustomExerciseMock).toHaveBeenCalledTimes(2);
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });
});
