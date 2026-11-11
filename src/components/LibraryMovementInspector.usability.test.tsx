import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRef } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getStudioVerifiedGuidance } from '../data/clinicalVerificationLibrary';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import { VERIFIED_REFERENCES } from '../data/verifiedReferences';
import { usePilatesStore } from '../store/usePilatesStore';
import { syntheticPlanningExercise } from '../test/planningFixtures';
import type { AutoGenerateCriteria, PilatesExercise } from '../types/pilates';
import {
  exerciseRevision,
  getExerciseReviewState,
  isExerciseAutoEligible,
} from '../utils/exerciseReview';
import { ExerciseAtlasView } from './ExerciseAtlasView';
import { LibraryMovementInspector } from './LibraryMovementInspector';
import { StudioClinicalBriefCard } from './StudioClinicalBriefCard';

const originalState = usePilatesStore.getState();
const initialCatalogSnapshot = structuredClone(INITIAL_EXERCISES);
const originalInnerWidth = window.innerWidth;

const pendingExercise: PilatesExercise = {
  ...syntheticPlanningExercise('reformer', 'core', 'alpha', false),
  id: 'qa-synth-inspector-pending-reformer-core',
  nameKo: '합성 미검토 리포머 코어 동작',
  springs: '합성 노트 고유 스프링 메모 1R 1Y',
  breathPattern: '합성 노트 고유 날숨 수축 메모',
};

const approvedBase: PilatesExercise = {
  ...syntheticPlanningExercise('reformer', 'footwork', 'beta', false),
  id: 'qa-synth-inspector-approved-reformer-footwork',
  nameKo: '합성 검토완료 리포머 풋워크 동작',
  springs: '합성 검토완료 스프링 2R 1B',
  breathPattern: '합성 검토완료 들숨 연장 날숨 복귀',
};
const approvedExercise: PilatesExercise = {
  ...approvedBase,
  review: {
    status: 'approved',
    scope: 'planning-metadata',
    credentialVerified: false,
    reviewerAlias: '합성검토강사별칭',
    reviewedAt: '2026-11-05T09:00:00.000Z',
    revision: exerciseRevision(approvedBase),
  },
};

const staleSeed: PilatesExercise = {
  ...syntheticPlanningExercise('mat', 'bridging', 'alpha', false),
  id: 'qa-synth-inspector-stale-mat-bridging',
  nameKo: '합성 변경후 재검토 매트 브릿징',
  springs: '변경 전 매트 메모',
};
const staleExercise: PilatesExercise = {
  ...staleSeed,
  springs: '변경 후 재검토 필요한 매트 메모',
  precautions: '수정되어 이전 검토 리비전과 달라진 합성 주의 메모',
  review: {
    status: 'approved',
    scope: 'planning-metadata',
    credentialVerified: false,
    reviewerAlias: '이전검토별칭',
    reviewedAt: '2026-11-04T09:00:00.000Z',
    revision: exerciseRevision(staleSeed),
  },
};

const catalogRef = VERIFIED_REFERENCES[0]!;
const sourceLinkedExercise: PilatesExercise = {
  ...syntheticPlanningExercise('reformer', 'upper-body', 'alpha', false),
  id: 'qa-synth-inspector-source-linked',
  nameKo: '합성 원출처 연결 리포머 동작',
  sourceReference: {
    referenceId: catalogRef.id,
    url: catalogRef.url,
    title: catalogRef.title,
    publisher: catalogRef.sourceName,
    region: catalogRef.region,
    verificationStatus: catalogRef.verificationStatus,
    verifiedAt: catalogRef.verifiedAt,
    rights: catalogRef.rights,
    rawLedgerFile: catalogRef.rawLedgerFile,
    rawItemId: catalogRef.rawItemId,
  },
  youtube: {
    videoId: 'QDBzjlhKsco',
    channelName: 'Synthetic Reference Channel',
    videoTitle: 'Synthetic Reference Clip',
    startSec: 15,
    url: 'https://www.youtube.com/watch?v=QDBzjlhKsco',
  },
};

const originalNoLinkExercise: PilatesExercise = {
  ...syntheticPlanningExercise('mat', 'warmup', 'beta', false),
  id: 'original-qa-synth-no-link',
  nameKo: '합성 원문링크없는 오리지널 동작',
  isCustom: false,
  youtube: {
    videoId: '',
    channelName: '',
    videoTitle: '',
    startSec: 0,
    url: '',
  },
};

const malformedLinkExercise: PilatesExercise = {
  ...syntheticPlanningExercise('chair', 'core', 'beta', false),
  id: 'qa-synth-inspector-malformed-link',
  nameKo: '합성 주소형식오류 체어 동작',
  youtube: {
    videoId: '',
    channelName: 'Unverified',
    videoTitle: 'Broken URL',
    startSec: 0,
    url: 'javascript:alert(1)',
  },
};

const reformerClassCriteria: AutoGenerateCriteria = {
  apparatus: 'reformer',
  availableEquipment: ['reformer', 'mat'],
  ownedApparatus: ['reformer', 'mat'],
  preferredProps: ['none'],
  level: '1.0',
  focusPreset: 'full-body',
  excludeDaysWindow: 0,
  targetMinutes: 50,
  defaultLayer: 'standard',
};

function setViewportWidth(width: number) {
  act(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: width,
    });
    fireEvent(window, new Event('resize'));
  });
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  setViewportWidth(390);
  usePilatesStore.setState(
    {
      ...originalState,
      activeTab: 'atlas',
      exercises: [
        pendingExercise,
        approvedExercise,
        staleExercise,
        sourceLinkedExercise,
        originalNoLinkExercise,
        malformedLinkExercise,
        ...INITIAL_EXERCISES,
      ],
      activeSteps: [],
      activeApparatus: 'reformer',
      activeLevel: '1.0',
      activeTargetMinutes: 50,
      draftCriteria: reformerClassCriteria,
      lastCriteria: null,
      ownedEquipment: ['mat', 'reformer', 'chair'],
      ownedApparatus: ['mat', 'reformer', 'chair'],
      ownedProps: [],
      exerciseBrowseScope: 'all',
      generationError: null,
    },
    true,
  );
});

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  window.localStorage.clear();
  setViewportWidth(originalInnerWidth);
  usePilatesStore.setState(originalState, true);
  vi.restoreAllMocks();
  expect(INITIAL_EXERCISES).toEqual(initialCatalogSnapshot);
});

describe('LibraryMovementInspector & StudioClinicalBriefCard honest review, source, and template distinction', () => {
  it('distinguishes pending, stale, and approved personal review states along with direct-add vs auto-recommend eligibility without false cross-verified claims', () => {
    expect(getExerciseReviewState(pendingExercise)).toBe('pending');
    expect(isExerciseAutoEligible(pendingExercise)).toBe(false);
    expect(getExerciseReviewState(staleExercise)).toBe('stale');
    expect(isExerciseAutoEligible(staleExercise)).toBe(false);
    expect(getExerciseReviewState(approvedExercise)).toBe('approved');
    expect(isExerciseAutoEligible(approvedExercise)).toBe(true);

    const headingRef = createRef<HTMLHeadingElement>();
    const { rerender } = render(
      <LibraryMovementInspector
        exercise={pendingExercise}
        headingRef={headingRef}
        isInResults
        onClose={vi.fn()}
        onOpenDetails={vi.fn()}
        onAdd={vi.fn()}
        addedId={null}
      />,
    );

    // 1. Pending state
    expect(screen.getByTestId('inspector-personal-review-badge')).toHaveTextContent('개인 검토 전');
    expect(screen.getByTestId('inspector-eligibility-badge')).toHaveTextContent(
      '직접 추가 가능 · 자동 추천 제외',
    );
    expect(screen.getByTestId('inspector-review-status-text')).toHaveTextContent(
      '개인 검토 전 · 직접 추가 가능 (자동 추천·AI 초안 제외)',
    );
    expect(screen.queryByText(/교차 검증 완료/)).not.toBeInTheDocument();

    // 2. Stale state (edited after prior personal review)
    rerender(
      <LibraryMovementInspector
        exercise={staleExercise}
        headingRef={headingRef}
        isInResults
        onClose={vi.fn()}
        onOpenDetails={vi.fn()}
        onAdd={vi.fn()}
        addedId={null}
      />,
    );
    expect(screen.getByTestId('inspector-personal-review-badge')).toHaveTextContent(
      '정보 변경 · 재검토 필요',
    );
    expect(screen.getByTestId('inspector-eligibility-badge')).toHaveTextContent(
      '직접 추가 가능 · 자동 추천 제외',
    );
    expect(screen.getByTestId('inspector-review-status-text')).toHaveTextContent(
      '동작 정보 변경됨 · 재검토 필요 (직접 추가 가능 · 자동 추천 제외)',
    );
    expect(screen.queryByText(/교차 검증 완료/)).not.toBeInTheDocument();

    // 3. Approved state (personal planning review recorded; still explicitly not external certification)
    rerender(
      <LibraryMovementInspector
        exercise={approvedExercise}
        headingRef={headingRef}
        isInResults
        onClose={vi.fn()}
        onOpenDetails={vi.fn()}
        onAdd={vi.fn()}
        addedId={null}
      />,
    );
    expect(screen.getByTestId('inspector-personal-review-badge')).toHaveTextContent(
      '내 검토 완료 (합성검토강사별칭)',
    );
    expect(screen.getByTestId('inspector-eligibility-badge')).toHaveTextContent(
      '직접 추가 가능 · 자동 추천 포함',
    );
    expect(screen.getByTestId('inspector-review-status-text')).toHaveTextContent(
      '내 개인 검토 완료 · 직접 추가 및 자동 추천 가능 (외부 인증 아님)',
    );
    expect(screen.queryByText(/교차 검증 완료/)).not.toBeInTheDocument();
  });

  it('separates recorded exercise note springs/breathing from apparatus/block templates in LibraryMovementInspector while keeping unreviewed notes hidden in compact class/study mode', () => {
    const guidance = getStudioVerifiedGuidance(pendingExercise);
    expect(guidance.verificationBadgeKo).toBe('기구·구간 공통 참고 · 원문 확인 필요');
    expect(guidance.exerciseNote.springsKo).toBe(pendingExercise.springs);
    expect(guidance.exerciseNote.breathPatternKo).toBe(pendingExercise.breathPattern);
    expect(guidance.springAndSetupStandardKo).not.toContain(pendingExercise.springs);
    expect(guidance.breathingCadenceKo).not.toContain(pendingExercise.breathPattern);

    const headingRef = createRef<HTMLHeadingElement>();
    const { unmount } = render(
      <LibraryMovementInspector
        exercise={pendingExercise}
        headingRef={headingRef}
        isInResults
        onClose={vi.fn()}
        onOpenDetails={vi.fn()}
        onAdd={vi.fn()}
        addedId={null}
      />,
    );

    const noteBox = screen.getByTestId('brief-exercise-note-box');
    const templateBox = screen.getByTestId('brief-apparatus-template-box');

    expect(noteBox).toHaveTextContent('개인 검토 전 · 원문 확인 필요');
    expect(noteBox).toHaveTextContent(pendingExercise.springs);
    expect(noteBox).toHaveTextContent(pendingExercise.breathPattern);

    expect(templateBox).toHaveTextContent('동작별 전용 값 아님');
    expect(templateBox).toHaveTextContent(guidance.springAndSetupStandardKo);
    expect(templateBox).not.toHaveTextContent(pendingExercise.springs);
    expect(templateBox).not.toHaveTextContent(pendingExercise.breathPattern);
    unmount();

    // Compact class/study callers (<StudioClinicalBriefCard compact /> without showNoteComparison) keep unreviewed note fields hidden
    render(<StudioClinicalBriefCard exercise={pendingExercise} compact />);
    expect(screen.getByTestId('brief-note-hidden-until-review')).toBeInTheDocument();
    expect(screen.queryByText(pendingExercise.springs)).not.toBeInTheDocument();
    expect(screen.queryByText(pendingExercise.breathPattern)).not.toBeInTheDocument();
  });

  it('surfaces direct safe external source links when present, states absence or malformed URLs honestly without fabricating links, and never auto-approves on add or detail handoff across 320px/390px', async () => {
    const headingRef = createRef<HTMLHeadingElement>();
    const { rerender, unmount } = render(
      <LibraryMovementInspector
        exercise={sourceLinkedExercise}
        headingRef={headingRef}
        isInResults
        onClose={vi.fn()}
        onOpenDetails={vi.fn()}
        onAdd={vi.fn()}
        addedId={null}
      />,
    );

    const refStep = screen.getByTestId('inspector-reference-step');
    const sourceLinks = within(refStep).getAllByRole('link');
    expect(sourceLinks.length).toBeGreaterThanOrEqual(2);
    expect(sourceLinks[0]).toHaveAttribute('href', catalogRef.url);
    expect(sourceLinks[0]).toHaveAttribute('target', '_blank');
    expect(sourceLinks[0]).toHaveAttribute('rel', 'noopener noreferrer');

    // Original note with no external URL shows honest absence notice with 0 links
    rerender(
      <LibraryMovementInspector
        exercise={originalNoLinkExercise}
        headingRef={headingRef}
        isInResults
        onClose={vi.fn()}
        onOpenDetails={vi.fn()}
        onAdd={vi.fn()}
        addedId={null}
      />,
    );
    expect(within(screen.getByTestId('inspector-reference-step')).queryAllByRole('link')).toHaveLength(
      0,
    );
    expect(screen.getByTestId('inspector-no-external-source')).toHaveTextContent(
      '연결된 외부 원문 링크 없음',
    );

    // Malformed javascript: URL is blocked and reported honestly
    rerender(
      <LibraryMovementInspector
        exercise={malformedLinkExercise}
        headingRef={headingRef}
        isInResults
        onClose={vi.fn()}
        onOpenDetails={vi.fn()}
        onAdd={vi.fn()}
        addedId={null}
      />,
    );
    expect(within(screen.getByTestId('inspector-reference-step')).queryAllByRole('link')).toHaveLength(
      0,
    );
    expect(screen.getByTestId('inspector-no-external-source')).toHaveTextContent(
      '주소 형식을 확인할 수 없어 외부 링크를 열지 않습니다',
    );
    unmount();

    // Full Atlas integration on 320px and 390px: select -> open review -> explicit add (no auto-approve) -> out-of-filter retention -> close focus recovery
    setViewportWidth(320);
    const onOpenDetails = vi.fn();
    render(
      <ExerciseAtlasView onOpenYouTubePreview={onOpenDetails} onOpenClipper={vi.fn()} />,
    );

    const pendingCardTrigger = screen.getByRole('button', { name: pendingExercise.nameKo });
    fireEvent.click(pendingCardTrigger);

    const inspector = screen.getByRole('complementary', { name: '선택한 동작 정보' });
    await waitFor(() =>
      expect(within(inspector).getByRole('heading', { name: '선택한 동작 정보' })).toHaveFocus(),
    );

    // Open full details / personal review without mutating review or activeSteps
    fireEvent.click(within(inspector).getByRole('button', { name: '전체 정보·개인 검토 열기' }));
    expect(onOpenDetails).toHaveBeenCalledWith(pendingExercise);
    expect(usePilatesStore.getState().activeSteps).toHaveLength(0);

    // Explicitly add unreviewed movement -> allowed in activeSteps, while personal review stays pending (never auto-approved)
    setViewportWidth(390);
    const addBtn = within(inspector).getByRole('button', { name: /선택한 동작 수업안에 추가/ });
    fireEvent.click(addBtn);
    expect(addBtn).toHaveAttribute('data-added', 'true');
    expect(usePilatesStore.getState().activeSteps).toHaveLength(1);
    expect(usePilatesStore.getState().activeSteps[0]?.exerciseId).toBe(pendingExercise.id);
    const storedPending = usePilatesStore
      .getState()
      .exercises.find((item) => item.id === pendingExercise.id)!;
    expect(getExerciseReviewState(storedPending)).toBe('pending');
    expect(isExerciseAutoEligible(storedPending)).toBe(false);

    // Filter out the selected card -> inspector keeps selected movement and restores focus to search on close
    const searchBox = screen.getByRole('searchbox', { name: '동작 검색' });
    fireEvent.change(searchBox, { target: { value: '일치하지않는필터검색어000' } });
    expect(inspector).toHaveTextContent('현재 검색 결과에 없는 동작입니다. 선택한 정보는 유지했어요.');
    fireEvent.click(within(inspector).getByRole('button', { name: '선택한 동작 정보 닫기' }));
    await waitFor(() => expect(searchBox).toHaveFocus());
  });

  it('enforces >=44px touch targets, :focus-visible outlines, 320px/390px narrow mobile rules, and prefers-reduced-motion in library-inspector-usability.css', () => {
    const cssPath = resolve(process.cwd(), 'src/styles/library-inspector-usability.css');
    const css = readFileSync(cssPath, 'utf8');

    expect(css).toContain('min-height: 44px');
    expect(css).toContain('min-width: 44px');
    expect(css).toContain(':focus-visible');
    expect(css).toContain('@media (max-width: 390px)');
    expect(css).toContain('@media (max-width: 320px)');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
