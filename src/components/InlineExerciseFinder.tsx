import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { EQUIPMENT_OPTIONS, getExerciseEquipment } from '../data/equipmentCatalog';
import type { EquipmentId } from '../data/equipmentCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import type { PilatesExercise } from '../types/pilates';
import { getExerciseReviewState, isExerciseAutoEligible } from '../utils/exerciseReview';
import { isRestStep } from '../utils/sequenceEngine';
import { getMotionPatternReferences } from '../data/motionPatternReferences';
import type { MotionPatternReference } from '../data/motionPatternReferences';
import { MotionPatternPreview, MotionPatternThumbnail } from './MotionPatternPreview';
import '../styles/inline-exercise-finder.css';

interface InlineExerciseFinderProps {
  onOpenExercise: (exercise: PilatesExercise) => void;
}

type FilterTab = 'equipment' | 'body' | 'duration';
type DurationFilter = 'all' | 'short' | 'medium' | 'long';
interface FinderFilters {
  query: string;
  equipment: EquipmentId[];
  bodyTag: string;
  duration: DurationFilter;
  motionOnly: boolean;
}
const emptyFilters = (): FinderFilters => ({
  query: '',
  equipment: [],
  bodyTag: '',
  duration: 'all',
  motionOnly: false,
});
const durationOptions: readonly { id: DurationFilter; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'short', label: '3분 이하' },
  { id: 'medium', label: '3분 초과–5분' },
  { id: 'long', label: '5분 초과' },
];
const tabs: readonly { id: FilterTab; label: string }[] = [
  { id: 'equipment', label: '기구' },
  { id: 'body', label: '부위' },
  { id: 'duration', label: '시간' },
];

export function InlineExerciseFinder({ onOpenExercise }: InlineExerciseFinderProps) {
  const exercises = usePilatesStore((state) => state.exercises);
  const activeSteps = usePilatesStore((state) => state.activeSteps);
  const appendExerciseToSequence = usePilatesStore((state) => state.appendExerciseToSequence);
  const setActiveTab = usePilatesStore((state) => state.setActiveTab);
  const [filters, setFilters] = useState(emptyFilters);
  const [tab, setTab] = useState<FilterTab>('equipment');
  const [visibleCount, setVisibleCount] = useState(6);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [preview, setPreview] = useState<MotionPatternReference | null>(null);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const id = useId();
  const previewRef = useRef<HTMLElement>(null);
  const previewTriggerRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (preview) previewRef.current?.focus();
  }, [preview]);
  const update = <K extends keyof FinderFilters>(key: K, value: FinderFilters[K]) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
    setVisibleCount(6);
  };
  const reset = () => {
    setFilters(emptyFilters());
    setVisibleCount(6);
    setFeedback(null);
  };
  const bodyTags = useMemo(
    () =>
      [...new Set(exercises.flatMap((exercise) => exercise.targetMuscles).filter(Boolean))].sort(
        (left, right) => left.localeCompare(right, 'ko'),
      ),
    [exercises],
  );
  const results = useMemo(() => {
    const terms = filters.query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    return exercises.filter((exercise) => {
      const equipment = getExerciseEquipment(exercise);
      const motionReferences = getMotionPatternReferences(exercise.id);
      if (filters.motionOnly && !motionReferences.length) return false;
      if (
        filters.equipment.length &&
        !filters.equipment.some((selected) => equipment.requiredEquipment.includes(selected))
      )
        return false;
      if (filters.bodyTag && !exercise.targetMuscles.includes(filters.bodyTag)) return false;
      if (filters.duration === 'short' && exercise.defaultDurationMin > 3) return false;
      if (
        filters.duration === 'medium' &&
        (exercise.defaultDurationMin <= 3 || exercise.defaultDurationMin > 5)
      )
        return false;
      if (filters.duration === 'long' && exercise.defaultDurationMin <= 5) return false;
      const text = [
        exercise.nameKo,
        exercise.nameEn,
        ...exercise.targetMuscles,
        ...motionReferences.flatMap((reference) => [
          reference.title,
          reference.variant,
          ...reference.equipment,
        ]),
      ]
        .join(' ')
        .toLocaleLowerCase();
      return terms.every((term) => text.includes(term));
    });
  }, [exercises, filters]);
  const activeFilterCount =
    filters.equipment.length +
    Number(Boolean(filters.bodyTag)) +
    Number(filters.duration !== 'all');
  const selectedCount = activeSteps.filter((step) => !isRestStep(step)).length;
  const hasFilters = Boolean(filters.query.trim() || activeFilterCount || filters.motionOnly);
  const addExercise = (exercise: PilatesExercise) => {
    if (!isExerciseAutoEligible(exercise)) return;
    const before = usePilatesStore.getState().activeSteps.length;
    appendExerciseToSequence(exercise.id);
    const after = usePilatesStore.getState();
    const success =
      after.activeSteps.length === before + 1 &&
      after.activeSteps.at(-1)?.exerciseId === exercise.id;
    setFeedback({
      success,
      message: success
        ? `${exercise.nameKo} 동작을 수업안에 추가했어요.`
        : after.generationError || '현재 수업 조건을 확인한 뒤 다시 추가해 주세요.',
    });
  };

  return (
    <aside className="inline-exercise-finder" aria-label="작업대 동작 찾기">
      <div className="ief-heading">
        <div>
          <p>필요한 동작을 곁에서</p>
          <h2>동작 찾기</h2>
        </div>
        <span>{exercises.length}개 노트</span>
      </div>
      <label className="ief-search">
        <Search size={18} aria-hidden="true" />
        <input
          type="search"
          aria-label="동작 이름 또는 등록된 부위 태그 검색"
          placeholder="동작 이름 또는 부위 검색"
          value={filters.query}
          onChange={(event) => update('query', event.target.value)}
        />
      </label>
      <div className="ief-quick-filters">
        <button
          type="button"
          aria-pressed={filters.motionOnly}
          onClick={() => update('motionOnly', !filters.motionOnly)}
        >
          초안 있는 동작
        </button>
        <button
          type="button"
          aria-expanded={filtersOpen}
          aria-controls={`${id}-filters`}
          onClick={() => setFiltersOpen((open) => !open)}
        >
          <SlidersHorizontal size={15} aria-hidden="true" /> 필터
          {activeFilterCount ? ` ${activeFilterCount}` : ''}
        </button>
      </div>
      <div id={`${id}-filters`} className="ief-filter-drawer" hidden={!filtersOpen}>
        <div className="ief-filter-tabs" role="tablist" aria-label="동작 찾기 필터">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`${id}-${item.id}-tab`}
              aria-controls={`${id}-${item.id}-panel`}
              aria-selected={tab === item.id}
              tabIndex={tab === item.id ? 0 : -1}
              onClick={() => setTab(item.id)}
              onKeyDown={(event) => {
                const current = tabs.findIndex((option) => option.id === tab);
                const next =
                  event.key === 'ArrowRight'
                    ? (current + 1) % tabs.length
                    : event.key === 'ArrowLeft'
                      ? (current + tabs.length - 1) % tabs.length
                      : event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                          ? tabs.length - 1
                          : undefined;
                if (next === undefined) return;
                event.preventDefault();
                setTab(tabs[next].id);
                document.getElementById(`${id}-${tabs[next].id}-tab`)?.focus();
              }}
            >
              {item.label}
              {item.id === 'equipment' && filters.equipment.length > 0 && (
                <span>{filters.equipment.length}</span>
              )}
            </button>
          ))}
        </div>
        <div
          className="ief-filter-panel"
          id={`${id}-equipment-panel`}
          role="tabpanel"
          aria-labelledby={`${id}-equipment-tab`}
          hidden={tab !== 'equipment'}
        >
          <div className="ief-equipment-options" aria-label="찾을 기구 · 다중 선택">
            {EQUIPMENT_OPTIONS.map((equipment) => (
              <button
                key={equipment.id}
                type="button"
                aria-pressed={filters.equipment.includes(equipment.id)}
                onClick={() =>
                  update(
                    'equipment',
                    filters.equipment.includes(equipment.id)
                      ? filters.equipment.filter((item) => item !== equipment.id)
                      : [...filters.equipment, equipment.id],
                  )
                }
              >
                {equipment.labelKo}
              </button>
            ))}
          </div>
          <p>여러 기구를 고르면 하나라도 일치하는 동작을 찾습니다.</p>
        </div>
        <div
          className="ief-filter-panel"
          id={`${id}-body-panel`}
          role="tabpanel"
          aria-labelledby={`${id}-body-tab`}
          hidden={tab !== 'body'}
        >
          <label className="ief-select-field">
            <span>등록된 부위 태그</span>
            <select
              value={filters.bodyTag}
              onChange={(event) => update('bodyTag', event.target.value)}
            >
              <option value="">전체 태그</option>
              {bodyTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </label>
          <p>직접 입력된 태그 기준입니다. 미검토 분류도 포함합니다.</p>
        </div>
        <div
          className="ief-filter-panel"
          id={`${id}-duration-panel`}
          role="tabpanel"
          aria-labelledby={`${id}-duration-tab`}
          hidden={tab !== 'duration'}
        >
          <div className="ief-duration-options" aria-label="찾을 동작의 계획 시간">
            {durationOptions.map((option) => (
              <button
                type="button"
                key={option.id}
                aria-pressed={filters.duration === option.id}
                onClick={() => update('duration', option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p>등록한 기본 계획 시간 · 편측 동작은 양쪽 포함</p>
        </div>
      </div>
      <div className="ief-results-heading">
        <p role="status" aria-live="polite" aria-atomic="true">
          <strong>{results.length}개</strong> 결과
          {activeFilterCount > 0 && <span> · 필터 {activeFilterCount}</span>}
        </p>
        {hasFilters && (
          <button type="button" onClick={reset} aria-label="동작 찾기 검색·필터 초기화">
            <X size={14} /> 초기화
          </button>
        )}
      </div>
      <p className="ief-review-hint">
        초안은 바로 볼 수 있어요. 수업안 추가는 노트 검토 후 가능합니다.
      </p>
      {preview && (
        <section
          ref={previewRef}
          tabIndex={-1}
          className="ief-preview"
          aria-label="선택한 모션 초안"
        >
          <div className="ief-preview-heading">
            <p>관련 패턴 참고 · 전문가 미검수</p>
            <button
              type="button"
              aria-label="모션 초안 닫기"
              onClick={() => {
                setPreview(null);
                previewTriggerRef.current?.focus();
              }}
            >
              <X size={18} />
            </button>
          </div>
          <MotionPatternPreview key={preview.variantId} reference={preview} active />
        </section>
      )}
      {feedback && (
        <p
          className={`ief-feedback ${feedback.success ? 'success' : 'error'}`}
          role={feedback.success ? 'status' : 'alert'}
        >
          {feedback.message}
        </p>
      )}
      {results.length ? (
        <div className="ief-results">
          {results.slice(0, visibleCount).map((exercise) => {
            const equipment = getExerciseEquipment(exercise);
            const approved = isExerciseAutoEligible(exercise);
            const stale = getExerciseReviewState(exercise) === 'stale';
            const references = getMotionPatternReferences(exercise.id);
            const firstReference = references[0];
            const alreadyAdded = activeSteps.some(
              (step) => !isRestStep(step) && step.exerciseId === exercise.id,
            );
            const equipmentLabel = equipment.requirementsKnown
              ? equipment.requiredEquipment
                  .map((key) => EQUIPMENT_OPTIONS.find((item) => item.id === key)?.labelKo)
                  .filter(Boolean)
                  .join(' · ')
              : '기구 요구 조건 미확인';
            return (
              <article
                key={exercise.id}
                className="ief-card"
                aria-label={`${exercise.nameKo} 동작 노트`}
              >
                <button
                  className={`ief-card-image ief-art-${exercise.apparatus}`}
                  type="button"
                  aria-label={`${exercise.nameKo} 상세 보기`}
                  onClick={() => onOpenExercise(exercise)}
                >
                  {firstReference ? (
                    <MotionPatternThumbnail reference={firstReference} />
                  ) : (
                    <span className="ief-motion-empty">
                      <span aria-hidden="true">—</span>모션 도해 준비 중
                    </span>
                  )}
                  {firstReference && <span className="ief-motion-caption">패턴 참고 · 미검수</span>}
                </button>
                <div className="ief-card-body">
                  <h3>
                    <button type="button" onClick={() => onOpenExercise(exercise)}>
                      {exercise.nameKo}
                    </button>
                  </h3>
                  <p>
                    {equipmentLabel} · {exercise.defaultDurationMin}분
                  </p>
                  {references.length > 0 && (
                    <div
                      className="ief-draft-actions"
                      aria-label={`${exercise.nameKo} 관련 모션 초안`}
                    >
                      {references.map((reference) => (
                        <button
                          type="button"
                          key={reference.variantId}
                          aria-label={`${reference.title} 초안 보기`}
                          onClick={(event) => {
                            previewTriggerRef.current = event.currentTarget;
                            setPreview(reference);
                          }}
                        >
                          <span>{reference.title}</span>
                          <ArrowUpRight size={14} aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="ief-card-actions">
                    <span className={approved ? 'is-reviewed' : 'is-pending'}>
                      {approved ? '내 검토 기록' : stale ? '다시 검토' : '검토 전'}
                    </span>
                    <button
                      type="button"
                      disabled={!approved || alreadyAdded}
                      aria-label={
                        !approved
                          ? `${exercise.nameKo} 강사 검토 후 추가 가능`
                          : alreadyAdded
                            ? `${exercise.nameKo} 이미 수업안에 있음`
                            : `${exercise.nameKo} 수업안에 추가`
                      }
                      onClick={() => addExercise(exercise)}
                      title={
                        approved
                          ? '내 강사 검토 · 자격 인증 미확인'
                          : '전체 검토 전 추가할 수 없습니다.'
                      }
                    >
                      {alreadyAdded ? <Check size={18} /> : <Plus size={18} />}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="ief-empty">
          <Search size={24} aria-hidden="true" />
          <h3>조건에 맞는 동작이 없어요</h3>
          <p>검색어와 기구·태그·시간을 조정해 보세요.</p>
          <button type="button" onClick={reset}>
            검색·필터 초기화
          </button>
        </div>
      )}
      {results.length > visibleCount && (
        <button
          className="ief-more"
          type="button"
          onClick={() => setVisibleCount((count) => count + 6)}
        >
          동작 더 보기{' '}
          <span>
            {Math.min(visibleCount, results.length)} / {results.length}
          </span>
          <ChevronDown size={15} />
        </button>
      )}
      <p className="ief-image-note">
        초안은 원본 제작 도해이며, 해당 동작의 검증된 시범이 아닙니다.
      </p>
      <button className="ief-open-atlas" type="button" onClick={() => setActiveTab('atlas')}>
        동작 라이브러리 전체 보기 <ArrowUpRight size={17} />
      </button>
      <div className="ief-selection-bar">
        <span>
          수업안에 <strong>{selectedCount}개</strong> 선택
        </span>
        <button type="button" onClick={() => setActiveTab('workbench')}>
          <ArrowLeft size={15} aria-hidden="true" /> 수업안으로
        </button>
      </div>
    </aside>
  );
}
