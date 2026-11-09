import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { VERIFIED_REFERENCES } from '../data/verifiedReferences';
import type { VerifiedPublicReference } from '../data/verifiedReferences';
import { usePilatesStore } from '../store/usePilatesStore';
import type { PilatesExercise, SequenceStep } from '../types/pilates';
import { isExerciseAutoEligible } from '../utils/exerciseReview';
import { createSourcePlanningNote } from '../utils/sourceNote';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import { ExerciseEvidencePanel } from './ExerciseEvidencePanel';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function linkedNote(reference: VerifiedPublicReference) {
  return createSourcePlanningNote(reference, {
    nameKo: '합성 출처 연결 계획 노트 · 운동 지침 아님',
    durationMin: 2,
    equipment: ['mat'],
    props: ['none'],
    level: '1.0',
    blockCategory: 'core',
    bodyPosition: 'supine',
    isUnilateral: false,
    cues: ['표시하면 안 되는 합성 미검토 티칭 큐'],
  });
}
function panelFor(exercise: PilatesExercise) {
  return screen.getByRole('region', { name: `${exercise.nameKo} 근거와 검토 상태` });
}
function summaryFor(exercise: PilatesExercise) {
  return panelFor(exercise).querySelector('summary')!;
}
function expand(exercise: PilatesExercise) {
  const summary = summaryFor(exercise);
  fireEvent.click(summary);
  expect(summary.closest('details')).toHaveAttribute('open');
  return within(panelFor(exercise));
}

describe('read-only exercise evidence panel', () => {
  it('starts collapsed with separate planning, source and exact-motion states and never renders pending instructions', () => {
    const original = INITIAL_EXERCISES.find((exercise) => exercise.id.startsWith('original-'))!;
    const pending = {
      ...original,
      cues: ['절대 표시하면 안 되는 합성 큐'],
      springs: '절대 표시하면 안 되는 합성 스프링 설정',
    };
    const before = usePilatesStore.getState();
    const ledgerBefore = JSON.stringify(VERIFIED_REFERENCES);
    const fetch = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected fetch'));
    render(<ExerciseEvidencePanel exercise={pending} />);
    const summary = summaryFor(pending);
    expect(summary.closest('details')).not.toHaveAttribute('open');
    expect(within(summary).getByText('계획 검토 전')).toBeInTheDocument();
    expect(within(summary).getByText('외부 출처 미등록')).toBeInTheDocument();
    expect(within(summary).getByText('3단계·연속 도해 대조 완료')).toBeInTheDocument();
    const panel = expand(pending);
    expect(panel.getByText('직접 작성 · 원본 영상 출처 없음')).toBeInTheDocument();
    expect(panel.getByText('0건 · 미검토')).toBeInTheDocument();
    expect(
      panel.getByText('2개 · 모두 미검토 · 이 노트의 관련 제안 수와 별개'),
    ).toBeInTheDocument();
    expect(panel.queryByText(pending.cues[0])).not.toBeInTheDocument();
    expect(panel.queryByText(pending.springs)).not.toBeInTheDocument();
    expect(
      panelFor(pending).querySelector('button,input,textarea,select,iframe,img,video'),
    ).toBeNull();
    expect(panel.queryByRole('status')).not.toBeInTheDocument();
    expect(usePilatesStore.getState()).toBe(before);
    expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
    expect(JSON.stringify(VERIFIED_REFERENCES)).toBe(ledgerBefore);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('counts only actual ID-related proposals while keeping the two global concepts separate', () => {
    const chest = INITIAL_EXERCISES.find((item) => item.id === 'original-mat-chest-lift')!;
    const quadruped = INITIAL_EXERCISES.find((item) => item.id === 'original-mat-quadruped-reach')!;
    const { rerender } = render(<ExerciseEvidencePanel exercise={chest} />);
    const chestPanel = expand(chest);
    expect(chestPanel.getByText('1종 · ID 대조용 · 정확 연결 아님')).toBeInTheDocument();
    expect(
      chestPanel.getByRole('list', { name: '이 기록 ID와 대조하는 제작 제안' }).children,
    ).toHaveLength(1);
    expect(
      chestPanel.getByText('2개 · 모두 미검토 · 이 노트의 관련 제안 수와 별개'),
    ).toBeInTheDocument();
    rerender(<ExerciseEvidencePanel exercise={quadruped} />);
    const quadPanel = within(panelFor(quadruped));
    expect(quadPanel.getByText('2종 · ID 대조용 · 정확 연결 아님')).toBeInTheDocument();
    expect(
      quadPanel.getByRole('list', { name: '이 기록 ID와 대조하는 제작 제안' }).children,
    ).toHaveLength(2);
    expect(quadPanel.getByText('0건 · 미검토')).toBeInTheDocument();
    rerender(<ExerciseEvidencePanel exercise={{ ...quadruped, id: 'unmatched-canonical-id' }} />);
    expect(screen.getByText('0종 · ID 대조용 · 정확 연결 아님')).toBeInTheDocument();
  });

  it('keeps separate canonical-ID research from an edited note source and patient suitability', () => {
    const canonical = INITIAL_EXERCISES.find((item) => item.id === 'original-mat-forearm-plank')!;
    const edited = {
      ...canonical,
      nameKo: '같은 ID의 별도 편집 노트',
      cues: ['원문과 다른 변형'],
      sourceReference: undefined,
      youtube: { ...canonical.youtube, url: '', videoId: '' },
    };
    const storeBefore = usePilatesStore.getState();
    const referencesBefore = JSON.stringify(VERIFIED_REFERENCES);
    const fetch = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected fetch'));
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem');
    const { rerender } = render(<ExerciseEvidencePanel exercise={edited} />);
    expect(within(summaryFor(edited)).getByText('외부 출처 미등록')).toBeInTheDocument();
    const panel = expand(edited);
    const noteSource = within(panel.getByRole('region', { name: '계획 노트에 연결된 출처' }));
    expect(noteSource.getByText('외부 출처 미등록')).toBeInTheDocument();
    expect(noteSource.queryByRole('link')).not.toBeInTheDocument();
    const research = within(panel.getByRole('region', { name: '별도 모션 후보 연구' }));
    expect(
      research.getByText(
        '해당 기록 ID와 대조하는 별도 연구입니다. 현재 노트의 변형 일치·개인 적합성은 미확인이며, 노트 출처 확인으로 가져오지 않습니다.',
      ),
    ).toBeInTheDocument();
    expect(
      research.getByText('본문 사실 조사만 완료 · 제작 모션 없음 · 전문가 모션 검토 0건'),
    ).toBeInTheDocument();
    expect(
      research.getByText('NHS 암 치료 전 준비 운동 환자 안내 · 일반 수업 적합성 미확인'),
    ).toBeInTheDocument();
    expect(research.getByRole('link', { name: '별도 연구의 원문 출처 열기' })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    );
    fireEvent.click(research.getByText('조사한 변형·미확인 보기'));
    expect(research.getByText(/환자 프로그램 문맥 · 수행 지시 아님/)).toBeInTheDocument();
    expect(panel.queryByText(edited.cues[0])).not.toBeInTheDocument();
    expect(
      panelFor(edited).querySelector('button,input,textarea,select,iframe,img,video'),
    ).toBeNull();
    const unknown = { ...edited, id: 'not-a-research-candidate' };
    rerender(<ExerciseEvidencePanel exercise={unknown} />);
    expect(screen.queryByRole('region', { name: '별도 모션 후보 연구' })).not.toBeInTheDocument();
    expect(usePilatesStore.getState()).toBe(storeBefore);
    expect(JSON.stringify(VERIFIED_REFERENCES)).toBe(referencesBefore);
    expect(fetch).not.toHaveBeenCalled();
    expect(storageWrite).not.toHaveBeenCalled();
  });

  it('distinguishes a personal planning review from expert approval and shows a later material change as stale', () => {
    const reviewed = syntheticPlanningExercise('mat', 'core');
    const before = usePilatesStore.getState();
    const { rerender } = render(<ExerciseEvidencePanel exercise={reviewed} />);
    expect(within(summaryFor(reviewed)).getByText('개인 계획 검토 기록')).toBeInTheDocument();
    const panel = expand(reviewed);
    expect(panel.getByText(reviewed.review!.reviewerAlias)).toBeInTheDocument();
    expect(panel.getByText('미확인 · 외부 전문가 검수와 별개')).toBeInTheDocument();
    expect(panel.getByText('0건 · 미검토')).toBeInTheDocument();
    expect(panel.queryByRole('button')).not.toBeInTheDocument();
    const stale = { ...reviewed, level: '2.0' as const };
    rerender(<ExerciseEvidencePanel exercise={stale} />);
    expect(within(summaryFor(stale)).getByText('변경 후 재검토 필요')).toBeInTheDocument();
    expect(stale.review).toBe(reviewed.review);
    expect(usePilatesStore.getState()).toBe(before);
    expect(INITIAL_EXERCISES.filter(isExerciseAutoEligible)).toHaveLength(0);
  });

  it('shows exact preserved partial observations as plain points, never clip intervals or class durations', () => {
    const reference = VERIFIED_REFERENCES.find((item) => item.id === 'mv-02')!;
    const note = linkedNote(reference);
    const { rerender } = render(<ExerciseEvidencePanel exercise={note} />);
    expect(within(summaryFor(note)).getByText('원본 영상 일부 확인')).toBeInTheDocument();
    const panel = expand(note);
    const source = within(panel.getByRole('region', { name: '계획 노트에 연결된 출처' }));
    const link = source.getByRole('link', { name: '보존된 원출처 열기' });
    expect(link).toHaveAttribute('href', reference.url);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(source.getByText('48.821초')).not.toHaveAttribute('href');
    expect(source.getByText('48.821초').closest('a')).toBeNull();
    expect(source.getByText('원본 관찰 시점 · 시작·종료 구간 아님')).toBeInTheDocument();
    expect(source.getByText('확인된 동작 구간 없음')).toBeInTheDocument();
    expect(source.getByText('미확인 · 계획 시간으로 가져오지 않음')).toBeInTheDocument();
    expect(source.getByText('126.877초 · 동작 수행 시간 아님')).toBeInTheDocument();
    expect(source.getByText(reference.verifiedAt)).toBeInTheDocument();
    expect(source.getByText(reference.rightsNote)).toBeInTheDocument();
    expect(source.getByText(/발행처 본문 기재 · 전문 검토 아님/)).toBeInTheDocument();
    expect(source.getAllByRole('link')).toHaveLength(1);
    expect(panel.queryByText(note.cues[0])).not.toBeInTheDocument();

    const alternative = {
      ...note,
      sourceReference: { ...note.sourceReference!, url: 'https://example.org/alternative-video' },
    };
    rerender(<ExerciseEvidencePanel exercise={alternative} />);
    expect(
      within(summaryFor(alternative)).getByText('보관 기록 · 출처 일치 미확인'),
    ).toBeInTheDocument();
    const changed = within(panelFor(alternative));
    expect(changed.queryByText('48.821초')).not.toBeInTheDocument();
    expect(changed.queryByText('출처 확인일')).not.toBeInTheDocument();
    expect(changed.getByText('보관 기록일')).toBeInTheDocument();
    expect(changed.getByRole('link', { name: '보존된 원출처 열기' })).toHaveAttribute(
      'href',
      alternative.sourceReference.url,
    );
  });

  it('keeps a domestic candidate separate from confirmed source-body or professional exercise review', () => {
    const reference = VERIFIED_REFERENCES.find(
      (item) => item.verificationStatus === 'korean-candidate',
    )!;
    const note = linkedNote(reference);
    render(<ExerciseEvidencePanel exercise={note} />);
    expect(within(summaryFor(note)).getByText('국내 후보 · 확인 대기')).toBeInTheDocument();
    const panel = expand(note);
    expect(panel.getByText('보존된 관찰 시점 없음')).toBeInTheDocument();
    expect(panel.getByText(/제목에 따른 미검토 분류/)).toBeInTheDocument();
    expect(panel.getByText('0건 · 미검토')).toBeInTheDocument();
    expect(panel.queryByText('공식 출처 본문 확인')).not.toBeInTheDocument();
    expect(panel.getByText('확인된 동작 구간 없음')).toBeInTheDocument();
  });

  it('rejects unsafe links, labels legacy and manual input honestly, and omits evidence for a rest', () => {
    const reference = VERIFIED_REFERENCES.find((item) => item.id === 'mv-01')!;
    const note = linkedNote(reference);
    const unsafe: PilatesExercise = {
      ...note,
      sourceReference: { ...note.sourceReference!, url: 'javascript:alert(1)' },
      youtube: { ...note.youtube, url: 'javascript:alert(2)' },
    };
    const { rerender } = render(<ExerciseEvidencePanel exercise={unsafe} />);
    expect(within(summaryFor(unsafe)).getByText('출처 기록 형식 확인 필요')).toBeInTheDocument();
    const panel = expand(unsafe);
    expect(panel.queryByRole('link')).not.toBeInTheDocument();
    expect(panelFor(unsafe).querySelector('[href]')).toBeNull();

    const manual: PilatesExercise = {
      ...syntheticPlanningExercise('mat', 'warmup', 'alpha', false),
      youtube: {
        videoId: 'abcdefghijk',
        url: 'https://www.youtube.com/watch?v=abcdefghijk',
        startSec: 7,
        videoTitle: '합성 미검토 참조',
        channelName: '합성 입력 채널',
      },
    };
    rerender(<ExerciseEvidencePanel exercise={manual} />);
    expect(within(summaryFor(manual)).getByText('입력 링크 · 내용 미확인')).toBeInTheDocument();
    expect(within(panelFor(manual)).getByText('직접 등록 · 출처 자동 미확인')).toBeInTheDocument();
    const legacy = { ...manual, id: 'qa-legacy-evidence', isCustom: false };
    rerender(<ExerciseEvidencePanel exercise={legacy} />);
    expect(within(summaryFor(legacy)).getByText('기존 링크 · 출처 대조 확인')).toBeInTheDocument();
    expect(within(panelFor(legacy)).getByText('기존 자료 · 출처 대조 확인')).toBeInTheDocument();
    for (const link of panelFor(legacy).querySelectorAll('a')) {
      expect(link.getAttribute('href')).toMatch(/^https?:\/\//);
    }

    const rest: SequenceStep = {
      kind: 'rest',
      stepId: 'qa-evidence-rest',
      exerciseId: '',
      order: 1,
      blockCategory: 'core',
      selectedLayer: 'standard',
      durationMin: 3,
    };
    rerender(<ExerciseEvidencePanel exercise={legacy} step={rest} />);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
    expect(screen.queryByText('근거와 검토 상태')).not.toBeInTheDocument();
  });

  it('renders 3-phase biomechanical review and extended SHA-256 verification for Track C and Track D catalog exercises', () => {
    const matExtended = INITIAL_EXERCISES.find((item) => item.id === 'original-mat-rib-breath')!;
    const apparatusExtended = INITIAL_EXERCISES.find(
      (item) => item.id === 'original-reformer-supine-breath',
    )!;
    const { rerender } = render(<ExerciseEvidencePanel exercise={matExtended} />);
    const matPanel = expand(matExtended);
    expect(matPanel.getByTestId('motion-evidence-review-section')).toHaveTextContent(
      'Track C 매트 확장 동작',
    );
    expect(matPanel.getByTestId('exercise-evidence-extended-sha256')).toHaveTextContent(
      /[0-9a-f]{64}/,
    );

    rerender(<ExerciseEvidencePanel exercise={apparatusExtended} />);
    const appPanel = within(panelFor(apparatusExtended));
    expect(appPanel.getByTestId('motion-evidence-review-section')).toHaveTextContent(
      'Track D 기구 확장 동작',
    );
    expect(appPanel.getByTestId('exercise-evidence-extended-sha256')).toHaveTextContent(
      /[0-9a-f]{64}/,
    );
  });
});

