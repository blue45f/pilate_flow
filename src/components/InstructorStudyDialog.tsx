import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  ArrowLeft,
  Bookmark,
  Check,
  Eye,
  EyeOff,
  Clock3,
  ListOrdered,
  NotebookPen,
  X,
} from 'lucide-react';
import { CANONICAL_BLOCKS } from '../data/pilatesCatalog';
import { PfBadge, PfButton, PfCard, PfEmptyState, PfSearchField, PfTabs } from '../design-system';
import type { PilatesExercise, LayerMode } from '../types/pilates';
import type { InstructorStudyState } from '../types/instructorStudy';
import { matchesDiscoverySearch } from '../utils/discoverySearch';
import { getExerciseReviewState } from '../utils/exerciseReview';
import { ExerciseEvidencePanel } from './ExerciseEvidencePanel';
import { FirstClassTutorialCandidate } from '../features/firstClassTutorialCandidate';
import { LightDismissDialog } from './LightDismissDialog';
import { MotionReferencePlayer } from './MotionReferencePlayer';
import { MovementVisualGuideCard } from './MovementVisualGuideCard';
import { ExerciseThumbnailBadge } from './ExerciseThumbnailBadge';
import { ApparatusIconBadge } from './ApparatusStudioArtwork';
import { StudioClinicalBriefCard } from './StudioClinicalBriefCard';
import '../styles/design-tokens.css';
import '../styles/instructor-study.css';

const REHEARSAL_LAYER_ITEMS = [
  ['easy', '쉽게'],
  ['standard', '기본'],
  ['hard', '심화'],
] as const;

const LAYER_LABELS: Record<LayerMode, string> = {
  easy: '쉽게',
  standard: '기본',
  hard: '심화',
};

type StudyListScope = 'all' | 'bookmarks' | 'practiced';

const INSTRUCTOR_TUTORIAL_TASKS = [
  {
    id: 'conditions',
    icon: Clock3,
    title: '수업 조건 정하기',
    body: '먼저 목표 시간과 사용할 기구만 정해 보세요.',
    steps: [
      '수업 구성에서 시간·기구 표시를 누르세요.',
      '목표 시간과 가지고 있는 기구를 골라요.',
      '나머지 세부 조건은 필요할 때 바꿔도 돼요.',
    ],
  },
  {
    id: 'compose',
    icon: ListOrdered,
    title: '동작 담고 순서 바꾸기',
    body: '기존 동작도, 직접 만든 새 아이디어도 담을 수 있어요. 검토 기록은 선택이에요.',
    steps: [
      '동작 고르기 → 원하는 동작의 추가를 누르세요.',
      '직접 만든 동작은 한 줄 아이디어 메모에서 시작해요.',
      '담은 동작은 끌어서 옮기거나 위·아래 버튼으로 순서를 바꿔요.',
    ],
  },
  {
    id: 'rehearse',
    icon: Eye,
    title: '저장하고 미리보기',
    body: '미리보기는 시간표를 살펴보는 기능이에요. 실제 운동 시범이나 수업 기록은 아니에요.',
    steps: [
      '수업 제목을 적고 저장을 누르세요.',
      '시퀀스 미리보기에서 순서와 전체 시간을 확인해요.',
      '시간표 리허설은 리허설 시작을 눌러야 시작해요.',
    ],
  },
  {
    id: 'teach-record',
    icon: NotebookPen,
    title: '수업 진행과 기록 보관',
    body: '수업이 끝나면 실제 진행 시간과 느낀 점을 남겨 두세요.',
    steps: [
      '미리보기의 수업 시작에서 준비 상태를 확인해요.',
      '수업 중에는 일시정지하거나 다음 항목으로 이동할 수 있어요.',
      '종료 후 수업 기록을 저장하고 중요한 기록은 백업해 두세요.',
    ],
  },
] as const;

const STUDY_MODE_ITEMS = [
  { id: 'study', label: '동작 숙지' },
  { id: 'guide', label: '사용법 다시 보기' },
] as const;

interface InstructorStudyDialogProps {
  exercises: readonly PilatesExercise[];
  study: InstructorStudyState;
  onToggleBookmark: (exerciseId: string) => void;
  onCueHiddenChange: (hidden: boolean) => void;
  onTutorialTaskChange: (taskId: string, complete: boolean) => void;
  onOpenReview: (exercise: PilatesExercise) => void;
  onClose: () => void;
  onOpenWorkbench?: () => void;
  initialExerciseId?: string;
  initialMode?: 'study' | 'guide';
}

export function InstructorStudyDialog({
  exercises,
  study,
  onToggleBookmark,
  onCueHiddenChange,
  onTutorialTaskChange,
  onOpenReview,
  onClose,
  onOpenWorkbench,
  initialExerciseId,
  initialMode = 'study',
}: InstructorStudyDialogProps) {
  const [mode, setMode] = useState<'study' | 'guide'>(initialMode);
  const [search, setSearch] = useState('');
  const [listScope, setListScope] = useState<StudyListScope>('all');
  const [selectedId, setSelectedId] = useState(initialExerciseId ?? exercises[0]?.id ?? '');
  const [practicedIds, setPracticedIds] = useState<string[]>(() =>
    initialExerciseId && exercises.some((exercise) => exercise.id === initialExerciseId)
      ? [initialExerciseId]
      : [],
  );
  const [layerByExerciseId, setLayerByExerciseId] = useState<Record<string, LayerMode>>({});
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const detailHeadingRef = useRef<HTMLHeadingElement>(null);
  const queuedFocus = useRef<number | null>(null);
  const cancelQueuedFocus = () => {
    if (queuedFocus.current !== null) cancelAnimationFrame(queuedFocus.current);
    queuedFocus.current = null;
  };
  const focusAfterRender = (
    resolve: () => HTMLElement | null,
    block: ScrollLogicalPosition = 'nearest',
  ) => {
    cancelQueuedFocus();
    queuedFocus.current = requestAnimationFrame(() => {
      queuedFocus.current = null;
      const target = resolve();
      if (!target?.isConnected) return;
      target.focus({ preventScroll: true });
      target.scrollIntoView?.({ block, inline: 'nearest', behavior: 'auto' });
    });
  };
  useEffect(
    () => () => {
      if (queuedFocus.current !== null) cancelAnimationFrame(queuedFocus.current);
    },
    [],
  );
  const [limit, setLimit] = useState({ signature: '', count: 6 });
  const [tutorialIndex, setTutorialIndex] = useState(0);
  const [showVisualTutorial, setShowVisualTutorial] = useState(false);
  const [visualGuideOpenId, setVisualGuideOpenId] = useState<string | null>(null);

  const exerciseIdSet = useMemo(
    () => new Set(exercises.map((exercise) => exercise.id)),
    [exercises],
  );
  const bookmarkCount = useMemo(
    () => study.bookmarkedExerciseIds.filter((id) => exerciseIdSet.has(id)).length,
    [study.bookmarkedExerciseIds, exerciseIdSet],
  );
  const practicedSet = useMemo(
    () => new Set(practicedIds.filter((id) => exerciseIdSet.has(id))),
    [practicedIds, exerciseIdSet],
  );

  const commitActiveExercise = (exerciseId: string) => {
    if (!exerciseId) return;
    setSelectedId(exerciseId);
    setPracticedIds((previous) =>
      previous.includes(exerciseId) ? previous : [...previous, exerciseId],
    );
  };

  const filtered = useMemo(
    () =>
      exercises.filter((exercise) => {
        if (listScope === 'bookmarks' && !study.bookmarkedExerciseIds.includes(exercise.id)) {
          return false;
        }
        if (listScope === 'practiced' && !practicedSet.has(exercise.id)) {
          return false;
        }
        return matchesDiscoverySearch([exercise.nameKo, exercise.nameEn], search);
      }),
    [exercises, search, listScope, study.bookmarkedExerciseIds, practicedSet],
  );

  const fallbackSelected =
    exercises.find((exercise) => exercise.id === selectedId) ?? exercises[0];
  const selected =
    filtered.find((exercise) => exercise.id === selectedId) ?? filtered[0] ?? fallbackSelected;
  const isSelectedOutsideFilter = Boolean(
    selected && !filtered.some((exercise) => exercise.id === selected.id),
  );
  const layer: LayerMode = selected ? (layerByExerciseId[selected.id] ?? 'standard') : 'standard';
  const isVisualGuideOpen = selected ? visualGuideOpenId === selected.id : false;
  const reviewed = Boolean(selected && getExerciseReviewState(selected) === 'approved');
  const hasActiveFilter = Boolean(search.trim() || listScope !== 'all');
  const signature = JSON.stringify([search, listScope]);
  const count = limit.signature === signature ? limit.count : 6;

  const clearFilters = () => {
    setSearch('');
    setListScope('all');
    focusAfterRender(() => searchRef.current);
  };

  const returnToList = () => {
    if (selected && !filtered.some((exercise) => exercise.id === selected.id)) {
      const resetSignature = JSON.stringify(['', 'all']);
      const allIndex = exercises.findIndex((exercise) => exercise.id === selected.id);
      setSearch('');
      setListScope('all');
      if (allIndex >= 6) {
        setLimit({ signature: resetSignature, count: Math.ceil((allIndex + 1) / 6) * 6 });
      }
      focusAfterRender(
        () =>
          [...(listRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])].find(
            (button) => button.dataset.studyExercise === selected.id,
          ) ?? searchRef.current,
      );
      return;
    }
    const selectedIndex = filtered.findIndex((exercise) => exercise.id === selected?.id);
    if (selectedIndex >= count)
      setLimit({ signature, count: Math.ceil((selectedIndex + 1) / 6) * 6 });
    focusAfterRender(
      () =>
        [...(listRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])].find(
          (button) => button.dataset.studyExercise === selected?.id,
        ) ?? searchRef.current,
    );
  };

  const handleScopeKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const order: readonly StudyListScope[] = ['all', 'bookmarks', 'practiced'];
    const buttons = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
    );
    const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (currentIndex < 0) return;
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % order.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + order.length) % order.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = order.length - 1;
    }
    if (nextIndex === null) return;
    event.preventDefault();
    setListScope(order[nextIndex]);
    buttons[nextIndex]?.focus();
  };

  const selectLayer = (exerciseId: string, nextLayer: LayerMode) => {
    commitActiveExercise(exerciseId);
    setLayerByExerciseId((previous) => ({ ...previous, [exerciseId]: nextLayer }));
  };

  const task = INSTRUCTOR_TUTORIAL_TASKS[tutorialIndex];
  const taskComplete = study.completedTutorialTaskIds.includes(task.id);

  return (
    <LightDismissDialog
      open
      onClose={onClose}
      title="강사 연습실"
      subtitle="동작 자료를 기억하고, 수업 준비 과정을 짧게 연습하세요."
      maxWidth="900px"
      className="instructor-study-dialog"
    >
      <div className="instructor-study">
        <PfTabs
          ariaLabel="연습실 보기"
          semantics="group"
          variant="segmented"
          className="study-modes"
          items={STUDY_MODE_ITEMS}
          value={mode}
          onChange={setMode}
        />
        {mode === 'guide' ? (
          <PfCard
            as="section"
            variant="subtle"
            className="study-guide"
            aria-label="수업 준비 사용법"
          >
            <div className="study-guide-top">
              <p className="study-step-counter" role="status">
                {tutorialIndex + 1} / {INSTRUCTOR_TUTORIAL_TASKS.length} · 짧은 사용법
              </p>
              {taskComplete && <PfBadge tone="success">실습 확인됨</PfBadge>}
            </div>
            <div className="study-guide-icon" aria-hidden="true">
              <task.icon size={28} />
            </div>
            <h3>{task.title}</h3>
            <p>{task.body}</p>
            <ol className="study-guide-actions">
              {task.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <label className="study-task-check">
              <input
                type="checkbox"
                checked={taskComplete}
                onChange={(event) => onTutorialTaskChange(task.id, event.target.checked)}
              />
              이 기능을 직접 해봤어요
            </label>
            <p className="muted">내 사용법 체크이며, 운동·모션 검수와는 달라요.</p>
            <nav className="study-guide-navigation" aria-label="사용법 단계">
              <PfButton
                variant="secondary"
                disabled={tutorialIndex === 0}
                onClick={() => setTutorialIndex((index) => index - 1)}
              >
                이전
              </PfButton>
              <PfButton
                variant="primary"
                disabled={tutorialIndex === INSTRUCTOR_TUTORIAL_TASKS.length - 1}
                onClick={() => setTutorialIndex((index) => index + 1)}
              >
                다음
              </PfButton>
            </nav>
            {onOpenWorkbench && (
              <PfButton
                variant="secondary"
                className="study-guide-return"
                onClick={onOpenWorkbench}
              >
                내 수업 구성으로 가기
              </PfButton>
            )}
            <details
              className="study-visual-tutorial-disclosure"
              open={showVisualTutorial}
              onToggle={(event) => setShowVisualTutorial(event.currentTarget.open)}
            >
              <summary>첫 수업 3단계 시각 도해 가이드 보기</summary>
              {showVisualTutorial && (
                <FirstClassTutorialCandidate
                  variant="study-guide-panel"
                  completedTaskIds={study.completedTutorialTaskIds}
                  onTaskToggle={(taskId, completed) => onTutorialTaskChange(taskId, completed)}
                  onStepAction={() => {
                    onOpenWorkbench?.();
                    onClose();
                  }}
                  onReturnToWorkbench={onOpenWorkbench}
                />
              )}
            </details>
          </PfCard>
        ) : (
          <div className="study-layout">
            <aside className="study-browser" aria-label="숙지할 동작 선택">
              <div className="study-browser-heading">
                <h3>동작 고르기</h3>
                <p>이름을 누르면 학습 노트로 이동해요.</p>
              </div>
              <div className="study-search-row">
                <PfSearchField
                  ref={searchRef}
                  label="연습할 동작 검색"
                  type="search"
                  wrapperClassName="study-search"
                  value={search}
                  placeholder="동작 이름 검색"
                  onFocus={cancelQueuedFocus}
                  onChange={(event) => setSearch(event.target.value)}
                />
                {search && (
                  <PfButton
                    variant="icon"
                    aria-label="검색어 지우기"
                    onClick={() => {
                      setSearch('');
                      focusAfterRender(() => searchRef.current);
                    }}
                  >
                    <X size={17} aria-hidden="true" />
                  </PfButton>
                )}
              </div>
              <div
                className="study-scope-bar"
                role="group"
                aria-label="동작 목록 범위"
                onKeyDown={handleScopeKeyDown}
              >
                <PfButton
                  variant="secondary"
                  className="study-scope-chip"
                  pressed={listScope === 'all'}
                  onClick={() => setListScope('all')}
                >
                  전체
                </PfButton>
                <PfButton
                  variant="secondary"
                  className="study-bookmark-filter study-scope-chip"
                  pressed={listScope === 'bookmarks'}
                  onClick={() =>
                    setListScope((current) => (current === 'bookmarks' ? 'all' : 'bookmarks'))
                  }
                >
                  <Bookmark size={14} aria-hidden="true" /> 북마크만 {bookmarkCount}
                </PfButton>
                <PfButton
                  variant="secondary"
                  className="study-scope-chip"
                  pressed={listScope === 'practiced'}
                  onClick={() =>
                    setListScope((current) => (current === 'practiced' ? 'all' : 'practiced'))
                  }
                >
                  이번 연습 {practicedSet.size}
                </PfButton>
              </div>
              <div className="study-results-row">
                <p className="muted" role="status" aria-live="polite" aria-atomic="true">
                  {filtered.length}개 동작 노트
                  {listScope === 'bookmarks' && ' · 북마크만'}
                  {listScope === 'practiced' && ' · 이번 연습만'}
                </p>
                {hasActiveFilter && (
                  <PfButton variant="text" onClick={clearFilters}>
                    필터 초기화
                  </PfButton>
                )}
              </div>
              <div className="study-exercise-list" ref={listRef}>
                {filtered.slice(0, count).map((exercise) => {
                  const isPracticed = practicedSet.has(exercise.id);
                  const isBookmarked = study.bookmarkedExerciseIds.includes(exercise.id);
                  return (
                    <button
                      type="button"
                      key={exercise.id}
                      aria-pressed={selected?.id === exercise.id}
                      data-study-exercise={exercise.id}
                      data-practiced={isPracticed ? 'true' : undefined}
                      onClick={() => {
                        commitActiveExercise(exercise.id);
                        focusAfterRender(() => detailHeadingRef.current, 'start');
                      }}
                    >
                      <ExerciseThumbnailBadge exercise={exercise} size="xs" decorative />
                      <span>{exercise.nameKo}</span>
                      {(isPracticed || isBookmarked) && (
                        <span className="study-item-markers">
                          {isPracticed && (
                            <span
                              className="study-practiced-dot"
                              aria-hidden="true"
                              title="이번 세션에서 연습함"
                            />
                          )}
                          {isBookmarked && <Bookmark size={14} aria-label="북마크" />}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {filtered.length === 0 && (
                <PfEmptyState
                  headingLevel="h3"
                  className="study-empty-state"
                  title="조건에 맞는 동작이 없습니다."
                  description={
                    listScope === 'practiced'
                      ? '동작을 선택하거나 큐·변형 단계를 연습하면 여기에 모입니다.'
                      : '검색어나 북마크 조건을 바꿔 주세요.'
                  }
                  action={
                    hasActiveFilter ? (
                      <PfButton variant="secondary" onClick={clearFilters}>
                        전체 동작 보기
                      </PfButton>
                    ) : undefined
                  }
                />
              )}
              {filtered.length > count && (
                <PfButton
                  variant="text"
                  onClick={() => {
                    setLimit({ signature, count: count + 6 });
                    focusAfterRender(
                      () =>
                        listRef.current?.querySelectorAll<HTMLButtonElement>('button')[count] ??
                        null,
                    );
                  }}
                >
                  {Math.min(6, filtered.length - count)}개 더 보기
                </PfButton>
              )}
              {!selected && onOpenWorkbench && (
                <PfButton
                  variant="secondary"
                  className="study-workbench-return"
                  onClick={onOpenWorkbench}
                >
                  내 수업 구성으로 가기
                </PfButton>
              )}
            </aside>
            {selected ? (
              <section className="study-detail" aria-label="선택한 동작 숙지">
                <div className="study-detail-nav">
                  <PfButton variant="text" className="study-return-browser" onClick={returnToList}>
                    <ArrowLeft size={16} aria-hidden="true" /> 동작 목록으로
                  </PfButton>
                  {onOpenWorkbench && (
                    <PfButton
                      variant="secondary"
                      className="study-workbench-return"
                      onClick={onOpenWorkbench}
                    >
                      내 수업 구성으로 가기
                    </PfButton>
                  )}
                </div>
                <header>
                  <div>
                    <div className="study-eyebrow-row">
                      <span className="eyebrow">MOVEMENT STUDY</span>
                      {isSelectedOutsideFilter && (
                        <span
                          className="study-outside-filter-badge"
                          data-testid="study-outside-filter-badge"
                        >
                          현재 목록 조건 밖 · 선택 유지됨
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ApparatusIconBadge
                        apparatus={selected.apparatus}
                        bodyPosition={selected.bodyPosition}
                        size="xs"
                        decorative
                      />
                      <h3 ref={detailHeadingRef} tabIndex={-1}>
                        {selected.nameKo}
                      </h3>
                    </div>
                    <p className="muted">{selected.nameEn}</p>
                  </div>
                  <PfButton
                    variant="secondary"
                    className="study-save-bookmark"
                    pressed={study.bookmarkedExerciseIds.includes(selected.id)}
                    onClick={() => {
                      commitActiveExercise(selected.id);
                      onToggleBookmark(selected.id);
                    }}
                  >
                    <Bookmark size={17} />
                    {study.bookmarkedExerciseIds.includes(selected.id) ? '북마크됨' : '북마크'}
                  </PfButton>
                </header>
                <ExerciseThumbnailBadge exercise={selected} showPhaseStrip decorative />
                <StudioClinicalBriefCard exercise={selected} compact />
                <p className="study-metadata">
                  계획 노트 역할 ·{' '}
                  {CANONICAL_BLOCKS.find((block) => block.category === selected.blockCategory)
                    ?.nameKo ?? selected.blockCategory}{' '}
                  · 이 분류는 수업 효과나 개인 적합성의 보장이 아닙니다.
                </p>
                <MotionReferencePlayer
                  key={selected.id}
                  exercise={selected}
                  exerciseId={selected.id}
                  exerciseName={selected.nameKo}
                />
                <details
                  key={`visual-guide-disclosure-${selected.id}`}
                  className="study-visual-guide-disclosure"
                  data-testid="study-visual-guide-disclosure"
                  open={isVisualGuideOpen}
                  onToggle={(event) => {
                    if (event.currentTarget.open) {
                      commitActiveExercise(selected.id);
                    }
                    setVisualGuideOpenId(event.currentTarget.open ? selected.id : null);
                  }}
                >
                  <summary>시작·중간·끝 자세 변화 및 유사 동작 7차원 비교 보기</summary>
                  {isVisualGuideOpen && (
                    <MovementVisualGuideCard
                      key={`visual-guide-${selected.id}`}
                      exercise={selected}
                      availablePeers={exercises}
                      initialPhase="start"
                    />
                  )}
                </details>
                <ExerciseEvidencePanel exercise={selected} />
                {reviewed ? (
                  <PfCard
                    as="section"
                    variant="subtle"
                    className="study-recall"
                    aria-label="티칭 큐 기억 연습"
                  >
                    <div className="study-recall-heading">
                      <h4>내가 검토한 티칭 메모</h4>
                      <PfButton
                        variant="secondary"
                        aria-expanded={!study.rehearsalCueHidden}
                        onClick={() => {
                          commitActiveExercise(selected.id);
                          onCueHiddenChange(!study.rehearsalCueHidden);
                        }}
                      >
                        {study.rehearsalCueHidden ? <Eye size={16} /> : <EyeOff size={16} />}
                        {study.rehearsalCueHidden ? '큐 확인하기' : '큐 숨기기'}
                      </PfButton>
                    </div>
                    <p className="study-recall-meta">
                      큐 숨김 상태는 다른 동작을 골라도 이어지며, 변형 단계는 동작별로 기억됩니다.
                    </p>
                    <div className="study-modes" role="group" aria-label="단계별 변형">
                      {REHEARSAL_LAYER_ITEMS.map(([id, label], index) => (
                        <button
                          type="button"
                          key={id}
                          aria-pressed={layer === id}
                          onClick={() => selectLayer(selected.id, id)}
                          onKeyDown={(event) => {
                            let nextIndex: number | null = null;
                            if (event.key === 'ArrowRight') {
                              nextIndex = (index + 1) % REHEARSAL_LAYER_ITEMS.length;
                            } else if (event.key === 'ArrowLeft') {
                              nextIndex =
                                (index - 1 + REHEARSAL_LAYER_ITEMS.length) %
                                REHEARSAL_LAYER_ITEMS.length;
                            } else if (event.key === 'Home') {
                              nextIndex = 0;
                            } else if (event.key === 'End') {
                              nextIndex = REHEARSAL_LAYER_ITEMS.length - 1;
                            }
                            if (nextIndex === null) return;
                            event.preventDefault();
                            const nextLayer = REHEARSAL_LAYER_ITEMS[nextIndex][0];
                            selectLayer(selected.id, nextLayer);
                            const buttons =
                              event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                                'button',
                              );
                            buttons?.[nextIndex]?.focus();
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {study.rehearsalCueHidden ? (
                      <p className="study-recall-hidden-prompt">
                        선택한 <strong>{LAYER_LABELS[layer]}</strong> 단계의 호흡·큐·대안을 먼저
                        떠올린 뒤 확인해 보세요.
                      </p>
                    ) : (
                      <div className="study-revealed-cues">
                        <p>
                          <strong>호흡 메모</strong> {selected.breathPattern || '미입력'}
                        </p>
                        <ul>
                          {selected.cues.map((cue, index) => (
                            <li key={`${index}-${cue}`}>{cue}</li>
                          ))}
                        </ul>
                        <p>{selected.layers[layer] || '등록된 단계별 메모가 없습니다.'}</p>
                        {selected.precautions && (
                          <p>
                            <strong>주의 메모</strong> {selected.precautions}
                          </p>
                        )}
                      </div>
                    )}
                  </PfCard>
                ) : (
                  <PfCard
                    as="section"
                    variant="subtle"
                    className="study-review-needed"
                    aria-label="티칭 메모 검토 안내"
                  >
                    <h4>티칭 메모 확인</h4>
                    <p>
                      이 연습 화면에는 검토 기록이 있는 티칭 메모가 표시됩니다. 동작을 수업에
                      추가하거나 구성하는 데 검토는 필요하지 않습니다.
                    </p>
                    <PfButton
                      variant="secondary"
                      onClick={() => {
                        commitActiveExercise(selected.id);
                        onOpenReview(selected);
                      }}
                    >
                      <Check size={16} /> 동작 노트에서 직접 검토
                    </PfButton>
                  </PfCard>
                )}
              </section>
            ) : null}
          </div>
        )}
      </div>
    </LightDismissDialog>
  );
}
