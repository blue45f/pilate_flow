import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Bookmark,
  CalendarDays,
  CalendarRange,
  Check,
  Clock3,
  Compass,
  Library,
  Play,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Ticket,
  X,
} from 'lucide-react';
import { LightDismissDialog } from './LightDismissDialog';
import { APPARATUS_LABELS } from '../data/pilatesCatalog';
import {
  BRAND_SPRING_OPTIONS,
  formatBrandSpringEquivalent,
} from '../utils/brandSpringConverter';
import { matchesDiscoverySearch } from '../utils/discoverySearch';
import { resolveStudio3DMotionForExercise } from '../utils/studio3dMotionCatalog';
import { isRestStep } from '../utils/sequenceEngine';
import type { ActiveWorkspaceTab } from '../store/usePilatesStore';
import { usePilatesStore } from '../store/usePilatesStore';
import type { PilatesExercise } from '../types/pilates';

export interface StudioCommandPaletteProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onNavigateTab: (tab: ActiveWorkspaceTab) => void;
  readonly onLoadSequence: (sequenceId: string) => void;
  readonly onSwitchPortalRole: (role: 'instructor' | 'member') => void;
  readonly onInspectExercise3D: (exercise: PilatesExercise) => void;
  readonly onOpenNewIdea: () => void;
  readonly canStartLiveStage: boolean;
}

export const StudioCommandPalette: React.FC<StudioCommandPaletteProps> = ({
  open,
  onClose,
  onNavigateTab,
  onLoadSequence,
  onSwitchPortalRole,
  onInspectExercise3D,
  onOpenNewIdea,
  canStartLiveStage,
}) => {
  const exercises = usePilatesStore((s) => s.exercises);
  const savedSequences = usePilatesStore((s) => s.savedSequences);
  const activeSteps = usePilatesStore((s) => s.activeSteps);
  const reformerBrand = usePilatesStore((s) => s.reformerBrand);
  const setReformerBrand = usePilatesStore((s) => s.setReformerBrand);
  const appendExerciseToSequence = usePilatesStore((s) => s.appendExerciseToSequence);

  const [query, setQuery] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const activeExerciseIds = useMemo(
    () => new Set(activeSteps.filter((st) => !isRestStep(st)).map((st) => st.exerciseId)),
    [activeSteps],
  );

  const matchedExercises = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return exercises.slice(0, 6);
    }
    return exercises
      .filter((ex) =>
        matchesDiscoverySearch(
          [
            ex.nameKo,
            ex.nameEn,
            APPARATUS_LABELS[ex.apparatus].ko,
            ex.springs ?? '',
            ...ex.targetMuscles,
            ...ex.cues,
          ],
          trimmed,
        ),
      )
      .slice(0, 8);
  }, [exercises, query]);

  const matchedSequences = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return savedSequences.slice(0, 4);
    return savedSequences
      .filter((seq) =>
        matchesDiscoverySearch(
          [seq.title, seq.apparatus, `Lv ${seq.level}`, `${seq.targetMinutes}분`],
          trimmed,
        ),
      )
      .slice(0, 5);
  }, [savedSequences, query]);

  const quickTabs: ReadonlyArray<{
    id: string;
    label: string;
    detail: string;
    icon: React.ReactNode;
    onSelect: () => void;
  }> = [
    {
      id: 'workbench',
      label: '오늘의 수업 설계',
      detail: '3D 동작 배치 · 시간 밸런스',
      icon: <CalendarDays size={16} aria-hidden="true" />,
      onSelect: () => {
        onNavigateTab('workbench');
        onClose();
      },
    },
    {
      id: 'atlas',
      label: '동작 라이브러리 · 3D 비교',
      detail: `${exercises.length}종 동작 · 360° 비교함`,
      icon: <Library size={16} aria-hidden="true" />,
      onSelect: () => {
        onNavigateTab('atlas');
        onClose();
      },
    },
    {
      id: 'stage',
      label: canStartLiveStage ? '수업 진행하기' : '수업 준비하기',
      detail: canStartLiveStage ? '타이머와 다음 동작 확인' : '동작을 추가하고 수업 구성',
      icon: <Play size={16} aria-hidden="true" />,
      onSelect: () => {
        onNavigateTab(canStartLiveStage ? 'stage' : 'workbench');
        onClose();
      },
    },
    {
      id: 'schedule',
      label: '강사 주간 일정 · AI 편성',
      detail: '미연결 수업 자동 구성',
      icon: <CalendarRange size={16} aria-hidden="true" />,
      onSelect: () => {
        onNavigateTab('schedule');
        onClose();
      },
    },
    {
      id: 'binder',
      label: '저장한 수업',
      detail: `수업안 ${savedSequences.length}개`,
      icon: <Bookmark size={16} aria-hidden="true" />,
      onSelect: () => {
        onNavigateTab('binder');
        onClose();
      },
    },
    {
      id: 'history',
      label: '수업 진행 기록 · 인사이트',
      detail: '최근 진행 내역 확인',
      icon: <Clock3 size={16} aria-hidden="true" />,
      onSelect: () => {
        onNavigateTab('history');
        onClose();
      },
    },
    {
      id: 'member',
      label: '회원 수업 예약 · 기구 자리 포털',
      detail: '회원 시점 360° 미리보기 확인',
      icon: <Ticket size={16} aria-hidden="true" />,
      onSelect: () => {
        onSwitchPortalRole('member');
        onClose();
      },
    },
    {
      id: 'idea',
      label: '새 동작 아이디어 메모 작성',
      detail: '나만의 변형 동작 빠른 기록',
      icon: <Sparkles size={16} aria-hidden="true" />,
      onSelect: () => {
        onClose();
        onOpenNewIdea();
      },
    },
  ];

  const trimmedQuery = query.trim();
  const filteredTabs = trimmedQuery
    ? quickTabs.filter((item) =>
        matchesDiscoverySearch([item.label, item.detail], trimmedQuery),
      )
    : quickTabs;

  const handleQuickAddExercise = (exercise: PilatesExercise) => {
    const beforeCount = usePilatesStore.getState().activeSteps.length;
    appendExerciseToSequence(exercise.id, exercise.blockCategory);
    const afterState = usePilatesStore.getState();
    const added =
      afterState.activeSteps.length === beforeCount + 1 &&
      afterState.activeSteps.at(-1)?.exerciseId === exercise.id;
    if (added) {
      setJustAddedId(exercise.id);
      setFeedback(`'${exercise.nameKo}' 동작을 현재 수업안 끝에 담았습니다.`);
    } else {
      setFeedback(
        afterState.generationError ||
          `'${exercise.nameKo}' 추가 전 현재 수업 기구·난이도 조건을 확인해 주세요.`,
      );
    }
  };

  const handleLoadSequence = (seqId: string) => {
    // App owns the exit decision; do not replace an active class before it resolves.
    onLoadSequence(seqId);
    onClose();
  };

  if (!open) return null;

  return (
    <LightDismissDialog
      open={open}
      onClose={onClose}
      title="스튜디오 빠른 실행 · 통합 검색"
      subtitle="동작 3D 확인·수업 즉시 추가·화면 이동·기구 브랜드 스프링 기준을 한곳에서 제어합니다 (단축키 ⌘K / Ctrl+K)."
      maxWidth="680px"
    >
      <div className="pf-cmdk-palette" data-testid="studio-command-palette">
        <label className="pf-cmdk-search-box">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">동작·저장한 수업·메뉴 통합 검색</span>
          <input
            ref={inputRef}
            type="search"
            data-testid="studio-command-palette-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="동작 이름(예: 헌드레드, 풋워크, 스완), 부위, 기구, 저장한 수업 검색..."
          />
          {query && (
            <button
              type="button"
              className="pf-cmdk-clear-btn"
              aria-label="검색어 지우기"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
            >
              <X size={15} aria-hidden="true" />
            </button>
          )}
        </label>

        {feedback && (
          <p className="pf-cmdk-feedback" role="status" aria-live="polite">
            <Check size={15} aria-hidden="true" />
            <span>{feedback}</span>
          </p>
        )}

        <section className="pf-cmdk-section" aria-label="스튜디오 리포머 브랜드 스프링 기준">
          <div className="pf-cmdk-section__head">
            <span>
              <SlidersHorizontal size={13} aria-hidden="true" /> 스튜디오 리포머 스프링 환산 기준
            </span>
            <small>수업 큐시트 · 라이브 · 동작 비교함에 즉시 반영</small>
          </div>
          <div className="pf-cmdk-brand-pills" role="group" aria-label="리포머 브랜드 선택">
            {BRAND_SPRING_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`pf-cmdk-brand-chip ${reformerBrand === opt.id ? 'is-active' : ''}`.trim()}
                aria-pressed={reformerBrand === opt.id}
                onClick={() => {
                  setReformerBrand(opt.id);
                  setFeedback(`기구 스프링 환산 기준을 '${opt.fullLabelKo}'로 전환했습니다.`);
                }}
              >
                {opt.shortLabelKo}
              </button>
            ))}
          </div>
        </section>

        <section className="pf-cmdk-section" aria-label="동작 검색 및 즉시 추가">
          <div className="pf-cmdk-section__head">
            <span>3D 동작 빠른 탐색 · 수업안 즉시 담기</span>
            <small>{query.trim() ? `검색 결과 ${matchedExercises.length}건` : '대표 추천 동작'}</small>
          </div>
          {matchedExercises.length > 0 ? (
            <ul className="pf-cmdk-exercise-list">
              {matchedExercises.map((ex) => {
                const motion3d = resolveStudio3DMotionForExercise(ex);
                const inSeq = activeExerciseIds.has(ex.id) || justAddedId === ex.id;
                const brandSpring = formatBrandSpringEquivalent(
                  ex.springs,
                  reformerBrand,
                  ex.apparatus,
                );
                return (
                  <li key={ex.id} className="pf-cmdk-exercise-row" data-testid={`cmdk-ex-${ex.id}`}>
                    <img
                      src={motion3d.peakImg}
                      alt=""
                      aria-hidden="true"
                      className="pf-cmdk-exercise-thumb"
                      loading="lazy"
                    />
                    <div className="pf-cmdk-exercise-meta">
                      <strong>{ex.nameKo}</strong>
                      <small>
                        {APPARATUS_LABELS[ex.apparatus].ko} · Lv {ex.level} ·{' '}
                        {brandSpring.equivalentLabelKo}
                      </small>
                    </div>
                    <div className="pf-cmdk-exercise-actions">
                      <button
                        type="button"
                        className="pf-cmdk-btn-ghost"
                        aria-label={`${ex.nameKo} 3D 및 360도 상세 열기`}
                        onClick={() => {
                          onClose();
                          onInspectExercise3D(ex);
                        }}
                      >
                        <Compass size={14} aria-hidden="true" />
                        <span>3D·360°</span>
                      </button>
                      <button
                        type="button"
                        className={`pf-cmdk-btn-add ${inSeq ? 'is-added' : ''}`.trim()}
                        aria-label={`${ex.nameKo} 현재 수업안에 추가`}
                        onClick={() => handleQuickAddExercise(ex)}
                      >
                        {inSeq ? <Check size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
                        <span>{inSeq ? '담김' : '수업 추가'}</span>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="pf-cmdk-empty">일치하는 동작이 없어요. 기구명이나 타겟 근육으로 검색해 보세요.</p>
          )}
        </section>

        {matchedSequences.length > 0 && (
          <section className="pf-cmdk-section" aria-label="저장한 수업 불러오기">
            <div className="pf-cmdk-section__head">
              <span>저장한 수업 불러오기</span>
              <small>{matchedSequences.length}개</small>
            </div>
            <div className="pf-cmdk-seq-grid">
              {matchedSequences.map((seq) => (
                <button
                  key={seq.id}
                  type="button"
                  className="pf-cmdk-seq-card"
                  aria-label={`${seq.title} 불러오기`}
                  onClick={() => handleLoadSequence(seq.id)}
                >
                  <div>
                    <strong>{seq.title}</strong>
                    <small>
                      {seq.targetMinutes}분 · Lv {seq.level} · 동작{' '}
                      {seq.steps.filter((st) => !isRestStep(st)).length}개
                    </small>
                  </div>
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
        )}

        {filteredTabs.length > 0 && (
          <section className="pf-cmdk-section" aria-label="작업실 화면 바로 이동">
            <div className="pf-cmdk-section__head">
              <span>작업실 화면 바로 이동</span>
            </div>
            <div className="pf-cmdk-nav-grid">
              {filteredTabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="pf-cmdk-nav-card"
                  onClick={item.onSelect}
                >
                  <span className="pf-cmdk-nav-icon">{item.icon}</span>
                  <span className="pf-cmdk-nav-copy">
                    <strong>{item.label}</strong>
                    <small>{item.detail}</small>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </LightDismissDialog>
  );
};
