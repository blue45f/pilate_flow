import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { VERIFIED_REFERENCES } from '../data/verifiedReferences';
import { usePilatesStore } from '../store/usePilatesStore';
import type { PilatesExercise } from '../types/pilates';
import { isExerciseAutoEligible } from '../utils/exerciseReview';
import { YouTubePreviewModal } from './YouTubeClipModal';

interface PlayerProps {
  exerciseId?: string;
  exerciseName?: string;
  mode?: 'exercise' | 'prototype-lab';
  active?: boolean;
}

vi.mock('./MotionReferencePlayer', () => ({
  MotionReferencePlayer: ({ exerciseId, exerciseName, mode, active }: PlayerProps) => (
    <div
      data-testid="motion-reference-hook"
      data-exercise-id={exerciseId}
      data-exercise-name={exerciseName}
      data-mode={mode || 'exercise'}
      data-active={String(active ?? true)}
    />
  ),
}));

const originalExercises = usePilatesStore.getState().exercises;
const catalogSnapshot = structuredClone(INITIAL_EXERCISES);
afterEach(() => {
  cleanup();
  expect(INITIAL_EXERCISES).toEqual(catalogSnapshot);
  vi.restoreAllMocks();
  usePilatesStore.setState({ exercises: originalExercises });
});

const player = (mode: 'exercise' | 'prototype-lab') =>
  screen.getAllByTestId('motion-reference-hook').find((element) => element.dataset.mode === mode)!;

describe('movement detail motion reference boundary', () => {
  it('passes actual catalog and custom IDs without substituting a generic motion after opening the reference drawer', async () => {
    const originalExercises = usePilatesStore.getState().exercises;
    const custom: PilatesExercise = {
      ...INITIAL_EXERCISES[0],
      id: 'ex-custom-own-synthetic-motion-hook',
      nameKo: '합성 모션 연결 테스트 · 운동 지침 아님',
      review: undefined,
    };
    const examples = [INITIAL_EXERCISES[0], INITIAL_EXERCISES.at(-1)!, custom];
    const { rerender } = render(<YouTubePreviewModal exercise={examples[0]} onClose={vi.fn()} />);
    for (const exercise of examples) {
      rerender(<YouTubePreviewModal exercise={exercise} onClose={vi.fn()} />);
      const voiceDrawer = screen.getByTestId('detail-voice-media-drawer');
      expect(voiceDrawer).not.toHaveAttribute('open');
      expect(player('exercise')).toBeUndefined();
      fireEvent.click(voiceDrawer.querySelector('summary')!);
      await waitFor(() =>
        expect(player('exercise')).toHaveAttribute('data-exercise-id', exercise.id),
      );
      expect(player('exercise')).toHaveAttribute('data-exercise-name', exercise.nameKo);
      expect(player('prototype-lab')).not.toHaveAttribute('data-exercise-id');
      expect(player('prototype-lab')).not.toHaveAttribute('data-exercise-name');
      expect(player('prototype-lab')).toHaveAttribute('data-active', 'false');
    }
    expect(INITIAL_EXERCISES).toHaveLength(158);
    expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
    expect(usePilatesStore.getState().exercises).toBe(originalExercises);
  });

  it('keeps the explicit unreviewed lab collapsed, pauses on collapse, and resets on exercise change', async () => {
    const { rerender, unmount } = render(
      <YouTubePreviewModal exercise={INITIAL_EXERCISES[0]} onClose={vi.fn()} />,
    );
    const hero = screen.getByTestId('studio-3d-motion-hero-card');
    expect(hero).toHaveAttribute('data-match-scope', 'catalog-authored-pattern');
    expect(hero).toHaveAttribute('data-anatomical-accuracy-assumed', 'false');
    expect(await within(hero).findByTestId('studio-motion-study-player')).toHaveAttribute(
      'data-exercise-id',
      INITIAL_EXERCISES[0].id,
    );
    const voiceDrawer = screen.getByTestId('detail-voice-media-drawer');
    expect(voiceDrawer).not.toHaveAttribute('open');
    expect(player('exercise')).toBeUndefined();
    fireEvent.click(voiceDrawer.querySelector('summary')!);
    await waitFor(() =>
      expect(player('exercise')).toHaveAttribute('data-exercise-id', INITIAL_EXERCISES[0].id),
    );
    const summary = screen.getByText('교차 검증 모션 설계 예시 · 패턴 참고용');
    const details = summary.closest('details')!;
    expect(details).not.toHaveAttribute('open');
    expect(player('exercise')).toHaveAttribute('data-exercise-id', INITIAL_EXERCISES[0].id);
    expect(player('prototype-lab')).toHaveAttribute('data-active', 'false');
    expect(player('prototype-lab')).not.toHaveAttribute('data-exercise-id');
    expect(player('prototype-lab')).not.toHaveAttribute('data-exercise-name');
    expect(screen.getAllByRole('dialog')).toHaveLength(1);

    details.open = true;
    fireEvent(details, new Event('toggle'));
    expect(player('prototype-lab')).toHaveAttribute('data-active', 'true');
    expect(player('prototype-lab')).not.toHaveAttribute('data-exercise-id');
    details.open = false;
    fireEvent(details, new Event('toggle'));
    expect(player('prototype-lab')).toHaveAttribute('data-active', 'false');

    details.open = true;
    fireEvent(details, new Event('toggle'));
    rerender(<YouTubePreviewModal exercise={INITIAL_EXERCISES[1]} onClose={vi.fn()} />);
    expect(
      screen.getByText('교차 검증 모션 설계 예시 · 패턴 참고용').closest('details'),
    ).not.toHaveAttribute('open');
    expect(player('prototype-lab')).toHaveAttribute('data-active', 'false');
    expect(player('prototype-lab')).not.toHaveAttribute('data-exercise-id');
    const nextVoiceDrawer = screen.getByTestId('detail-voice-media-drawer');
    expect(nextVoiceDrawer).not.toHaveAttribute('open');
    expect(player('exercise')).toBeUndefined();
    fireEvent.click(nextVoiceDrawer.querySelector('summary')!);
    await waitFor(() =>
      expect(player('exercise')).toHaveAttribute('data-exercise-id', INITIAL_EXERCISES[1].id),
    );
    expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);

    rerender(<YouTubePreviewModal exercise={null} onClose={vi.fn()} />);
    expect(screen.queryByTestId('motion-reference-hook')).not.toBeInTheDocument();

    unmount();
    expect(screen.queryByTestId('motion-reference-hook')).not.toBeInTheDocument();
  });

  it.each([
    ['original-mat-swan-prep', 'BASI 기초 교육 본문 · 정확한 연령·개인 적합성 미확인'],
    ['original-mat-forearm-plank', 'NHS 암 치료 전 준비 운동 환자 안내 · 일반 수업 적합성 미확인'],
  ])(
    'opens separate research in the actual pending %s detail without granting a review',
    (id, population) => {
      const exercise = INITIAL_EXERCISES.find((item) => item.id === id)!;
      const before = usePilatesStore.getState();
      const fetch = vi
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new Error('Unexpected remote request'));
      const storage = [
        vi.spyOn(Storage.prototype, 'setItem'),
        vi.spyOn(Storage.prototype, 'removeItem'),
        vi.spyOn(Storage.prototype, 'clear'),
      ];
      const onAdd = vi.fn();
      render(<YouTubePreviewModal exercise={exercise} onClose={vi.fn()} onAddToSequence={onAdd} />);
      fireEvent.click(screen.getByText('내 검토 기록 (선택)'));
      fireEvent.click(screen.getByText('출처·검토 상태 자세히 보기'));
      const modal = within(screen.getByRole('dialog', { name: exercise.nameKo }));
      const evidence = modal.getByRole('region', { name: `${exercise.nameKo} 근거와 검토 상태` });
      const summary = evidence.querySelector('summary')!;
      expect(summary.closest('details')).not.toHaveAttribute('open');
      expect(
        modal.getByRole('button', { name: '수정 내용을 저장하고 내 강사 검토로 승인' }),
      ).toBeDisabled();
      expect(modal.getByRole('button', { name: '수업안에 추가' })).toBeEnabled();
      fireEvent.click(summary);
      const research = within(
        within(evidence).getByRole('region', { name: '별도 모션 후보 연구' }),
      );
      expect(research.getByText(population)).toBeVisible();
      expect(
        research.getByText('본문 사실 조사만 완료 · 제작 모션 없음 · 전문가 모션 검토 0건'),
      ).toBeVisible();
      expect(within(evidence).getByText('0종 · ID 대조용 · 정확 연결 아님')).toBeVisible();
      expect(research.getByText(/현재 노트의 변형 일치·개인 적합성은 미확인/)).toBeVisible();
      fireEvent.click(research.getByText('조사한 변형·미확인 보기'));
      expect(research.getByRole('link', { name: '별도 연구의 원문 출처 열기' })).toHaveAttribute(
        'rel',
        'noopener noreferrer',
      );
      expect(modal.getByRole('heading', { name: '자료의 출처와 검토 상태' })).toBeVisible();
      expect(
        modal.getByRole('button', { name: '수정 내용을 저장하고 내 강사 검토로 승인' }),
      ).toBeDisabled();
      expect(modal.getByRole('button', { name: '수업안에 추가' })).toBeEnabled();
      expect(usePilatesStore.getState()).toBe(before);
      expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
      expect(fetch).not.toHaveBeenCalled();
      storage.forEach((spy) => expect(spy).not.toHaveBeenCalled());
      expect(onAdd).not.toHaveBeenCalled();
    },
  );

  it('qualifies separate research for an edited canonical-ID note and retains a mismatched stored source snapshot', () => {
    const base = INITIAL_EXERCISES.find((item) => item.id === 'original-mat-forearm-plank')!;
    const reference = VERIFIED_REFERENCES.find(
      (item) => item.verificationStatus === 'official-source-checked',
    )!;
    const exercise: PilatesExercise = {
      ...base,
      nameKo: '같은 기록 ID의 편집된 별도 변형',
      cues: ['원문과 대조하지 않은 편집 큐'],
      review: undefined,
      youtube: { ...base.youtube, url: '', videoId: '' },
      sourceReference: {
        referenceId: reference.id,
        url: 'https://example.org/stored-different-source',
        title: reference.title,
        publisher: reference.sourceName,
        region: reference.region,
        verificationStatus: reference.verificationStatus,
        verifiedAt: reference.verifiedAt,
        rights: reference.rights,
        rawLedgerFile: reference.rawLedgerFile,
        rawItemId: reference.rawItemId,
      },
    };
    // Install only a test fixture before observing the read-only user flow.
    usePilatesStore.setState({
      exercises: originalExercises.map((item) => (item.id === exercise.id ? exercise : item)),
    });
    const before = usePilatesStore.getState();
    const ledgerBefore = JSON.stringify(VERIFIED_REFERENCES);
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Unexpected remote request'));
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    const write = vi.spyOn(usePilatesStore, 'setState');
    render(<YouTubePreviewModal exercise={exercise} onClose={vi.fn()} onAddToSequence={vi.fn()} />);
    fireEvent.click(screen.getByText('내 검토 기록 (선택)'));
    fireEvent.click(screen.getByText('출처·검토 상태 자세히 보기'));
    const modal = within(screen.getByRole('dialog', { name: exercise.nameKo }));
    const evidence = modal.getByRole('region', { name: `${exercise.nameKo} 근거와 검토 상태` });
    const summary = evidence.querySelector('summary')!;
    expect(within(summary).getByText('보관 기록 · 출처 일치 미확인')).toBeInTheDocument();
    fireEvent.click(summary);
    const noteSource = within(
      within(evidence).getByRole('region', { name: '계획 노트에 연결된 출처' }),
    );
    expect(noteSource.getByText('보관 기록 · 출처 일치 미확인')).toBeVisible();
    const research = within(within(evidence).getByRole('region', { name: '별도 모션 후보 연구' }));
    expect(
      research.getByText(
        '해당 기록 ID와 대조하는 별도 연구입니다. 현재 노트의 변형 일치·개인 적합성은 미확인이며, 노트 출처 확인으로 가져오지 않습니다.',
      ),
    ).toBeVisible();
    const legacy = within(
      screen.getByRole('heading', { name: '자료의 출처와 검토 상태' }).closest('section')!,
    );
    expect(legacy.getByText('보관된 출처 확인 상태')).toBeVisible();
    expect(
      legacy.getByText('노트에 보관한 기록이며 현재 출처 대조는 위 근거 패널에서 확인하세요.'),
    ).toBeVisible();
    expect(legacy.getByRole('link', { name: '보존된 원출처 열기' })).toHaveAttribute(
      'href',
      exercise.sourceReference!.url,
    );
    expect(modal.getByRole('button', { name: '수정 메모만 저장' })).toBeVisible();
    expect(
      modal.getByRole('button', { name: '수정 내용을 저장하고 내 강사 검토로 승인' }),
    ).toBeDisabled();
    expect(modal.getByRole('button', { name: '수업안에 추가' })).toBeEnabled();
    expect(usePilatesStore.getState()).toBe(before);
    expect(JSON.stringify(VERIFIED_REFERENCES)).toBe(ledgerBefore);
    expect(write).not.toHaveBeenCalled();
    expect(storage).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
