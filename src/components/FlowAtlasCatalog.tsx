import {
  ArrowRight,
  Check,
  ChevronDown,
  Heart,
  Info,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useRef, useState, type RefObject } from 'react';
import { APPARATUS_LABELS } from '../data/pilatesCatalog';
import { EQUIPMENT_OPTIONS } from '../data/equipmentCatalog';
import { isMovementIdeaExercise, readMovementIdeaDraft } from '../utils/movementIdeaDraft';
import { getExerciseArtworkFrame } from '../utils/exerciseArtworkCache';
import type { ApparatusType, PilatesExercise } from '../types/pilates';
import { ExerciseMotionArtwork } from './ExerciseMotionArtwork';
import '../styles/flow-atlas.css';

const APPARATUS_ORDER: readonly ApparatusType[] = [
  'mat',
  'reformer',
  'cadillac',
  'chair',
  'barrel',
];
const LEVEL_LABELS = { '1.0': '기초', '1.5': '중급', '2.0': '심화' };
const APPARATUS_FILTERS = APPARATUS_ORDER.map((apparatus) => ({
  apparatus,
  ids: EQUIPMENT_OPTIONS.filter((item) => item.apparatusFamily === apparatus).map(
    (item) => item.id,
  ),
}));

export interface FlowAtlasCardState {
  inSequence: boolean;
  orderNumber?: number;
  note?: string;
}

export interface FlowAtlasCatalogProps {
  exercises: readonly PilatesExercise[];
  resultCount: number;
  totalCount: number;
  search: string;
  equipment: readonly string[];
  level: string;
  duration: string;
  favoritesOnly: boolean;
  filterCount: number;
  activeFilters: readonly { key: string; label: string; onClear: () => void }[];
  ownedOnly: boolean;
  selectedCount: number;
  plannedMinutes: number;
  addedId: string | null;
  feedback: { success: boolean; message: string } | null;
  brokenPhotoIds: Readonly<Record<string, boolean>>;
  searchRef: RefObject<HTMLInputElement | null>;
  gridRef: RefObject<HTMLDivElement | null>;
  onSearch: (value: string) => void;
  onSelectEquipment: (ids: string[]) => void;
  onSelectLevel: (level: string) => void;
  onSelectDuration: (duration: string) => void;
  onToggleOwned: () => void;
  onToggleFavorites: () => void;
  onClearSearch: () => void;
  onReset: () => void;
  onShowAll: () => void;
  onOpenTools: (filters?: boolean) => void;
  onReturnToClass: () => void;
  onOpenDetails: (exercise: PilatesExercise) => void;
  onAdd: (exercise: PilatesExercise) => void;
  onToggleFavorite: (exercise: PilatesExercise) => void;
  onPhotoError: (id: string) => void;
  onLoadMore: () => void;
  getCardState: (exercise: PilatesExercise) => FlowAtlasCardState;
}

/** The everyday find → view/add surface; research tools stay one deliberate step away. */
export function FlowAtlasCatalog({
  exercises,
  resultCount,
  totalCount,
  search,
  equipment,
  level,
  duration,
  favoritesOnly,
  filterCount,
  activeFilters,
  ownedOnly,
  selectedCount,
  plannedMinutes,
  addedId,
  feedback,
  brokenPhotoIds,
  searchRef,
  gridRef,
  onSearch,
  onSelectEquipment,
  onSelectLevel,
  onSelectDuration,
  onToggleOwned,
  onToggleFavorites,
  onClearSearch,
  onReset,
  onShowAll,
  onOpenTools,
  onReturnToClass,
  onOpenDetails,
  onAdd,
  onToggleFavorite,
  onPhotoError,
  onLoadMore,
  getCardState,
}: FlowAtlasCatalogProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const selectedApparatus = APPARATUS_FILTERS.find(
    ({ ids }) => ids.length === equipment.length && ids.every((id) => equipment.includes(id)),
  );
  const extraFilters = activeFilters.filter(
    (chip) =>
      chip.key !== 'search' &&
      !(selectedApparatus && chip.key.startsWith('eq-')) &&
      !(filtersOpen && (chip.key === 'level' || chip.key === 'duration')),
  );
  const closeFilters = () => {
    setFiltersOpen(false);
    filterButtonRef.current?.focus();
  };

  return (
    <section className="flow-atlas" aria-labelledby="workspace-main-heading">
      <header className="flow-atlas__heading">
        <div className="flow-atlas__intro">
          <p className="flow-atlas__eyebrow">PILATES FLOW · LIBRARY</p>
          <h1 id="workspace-main-heading" tabIndex={-1}>
            동작 라이브러리
          </h1>
          <p>동작을 찾고, 오늘의 수업에 담으세요.</p>
        </div>
        <button
          className="flow-atlas__button flow-atlas__button--quiet"
          type="button"
          onClick={() => onOpenTools()}
        >
          <SlidersHorizontal size={17} aria-hidden="true" /> 자료와 고급 도구
        </button>
      </header>

      <section className="flow-atlas__search-panel" aria-label="동작 검색과 필터">
        <div className="flow-atlas__search-row">
          <div className="flow-atlas__search" role="search" aria-label="동작 검색창">
            <Search size={21} aria-hidden="true" />
            <label className="sr-only" htmlFor="flow-atlas-search">
              동작 검색
            </label>
            <input
              id="flow-atlas-search"
              ref={searchRef}
              type="search"
              autoComplete="off"
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="동작 이름이나 부위를 검색하세요"
            />
            {search ? (
              <button
                type="button"
                className="flow-atlas__icon-button"
                onClick={onClearSearch}
                aria-label="검색어 지우기"
              >
                <X size={18} aria-hidden="true" />
              </button>
            ) : null}
          </div>
          <button
            className="flow-atlas__button flow-atlas__button--quiet"
            type="button"
            ref={filterButtonRef}
            aria-expanded={filtersOpen}
            aria-controls="flow-atlas-filters"
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <SlidersHorizontal size={17} aria-hidden="true" /> 필터
            {filterCount > 0 || ownedOnly ? (
              <span className="flow-atlas__count">{filterCount + Number(ownedOnly)}</span>
            ) : null}
            <ChevronDown size={15} aria-hidden="true" />
          </button>
        </div>
        <div className="flow-atlas__browse-row">
          <div className="flow-atlas__chips" role="group" aria-label="기구 선택">
            <button
              type="button"
              aria-pressed={equipment.length === 0}
              onClick={() => onSelectEquipment([])}
            >
              전체
            </button>
            {APPARATUS_FILTERS.map(({ apparatus, ids }) => {
              const selected = selectedApparatus?.apparatus === apparatus;
              return (
                <button
                  key={apparatus}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelectEquipment(selected ? [] : ids)}
                >
                  {APPARATUS_LABELS[apparatus].ko}
                </button>
              );
            })}
          </div>
          <button
            className="flow-atlas__favorites"
            type="button"
            aria-pressed={favoritesOnly}
            onClick={onToggleFavorites}
          >
            <Heart size={16} aria-hidden="true" fill={favoritesOnly ? 'currentColor' : 'none'} />{' '}
            즐겨찾기
          </button>
        </div>
        <div
          id="flow-atlas-filters"
          className="flow-atlas__inline-filters"
          role="group"
          aria-label="추가 검색 조건"
          hidden={!filtersOpen}
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            closeFilters();
          }}
        >
          <div className="flow-atlas__filter-fields">
            <label>
              난이도
              <select value={level} onChange={(event) => onSelectLevel(event.target.value)}>
                <option value="all">전체 난이도</option>
                {Object.entries(LEVEL_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              동작 시간
              <select value={duration} onChange={(event) => onSelectDuration(event.target.value)}>
                <option value="all">전체 시간</option>
                <option value="short">3분 이하</option>
                <option value="medium">3분 초과~5분</option>
                <option value="long">5분 초과</option>
              </select>
            </label>
            <label className="flow-atlas__owned-filter">
              <input type="checkbox" checked={ownedOnly} onChange={onToggleOwned} />내 보유 장비로
              가능한 동작만
            </label>
          </div>
          <div className="flow-atlas__filter-footer">
            <button
              type="button"
              className="flow-atlas__text-button"
              onClick={() => onOpenTools(true)}
            >
              자세·소도구 등 더 자세한 조건
              <ArrowRight size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="flow-atlas__button flow-atlas__button--quiet"
              onClick={closeFilters}
            >
              결과 보기
            </button>
          </div>
        </div>
        {activeFilters.length > 0 || ownedOnly ? (
          <div className="flow-atlas__active-filters" role="group" aria-label="적용된 검색·필터">
            {ownedOnly && !filtersOpen ? (
              <button
                type="button"
                onClick={() => {
                  onToggleOwned();
                  searchRef.current?.focus();
                }}
                aria-label="내 보유 장비 범위 필터 해제"
              >
                내 보유 장비 범위
                <X size={12} aria-hidden="true" />
              </button>
            ) : null}
            {extraFilters.map((chip) => (
              <button
                type="button"
                key={chip.key}
                onClick={chip.onClear}
                aria-label={`${chip.label} 필터 해제`}
              >
                {chip.label}
                <X size={12} aria-hidden="true" />
              </button>
            ))}
            <button
              type="button"
              className="flow-atlas__reset"
              onClick={ownedOnly ? onShowAll : onReset}
            >
              조건 초기화
            </button>
          </div>
        ) : null}
      </section>

      <div className="flow-atlas__results-bar">
        <p aria-live="polite">
          <strong>{resultCount}</strong>개 동작 <span>전체 {totalCount}개</span>
        </p>
        <button type="button" className="flow-atlas__class-link" onClick={onReturnToClass}>
          {selectedCount > 0 ? `수업안 ${selectedCount}개 · ${plannedMinutes}분` : '수업 만들기'}
          <ArrowRight size={17} aria-hidden="true" />
        </button>
      </div>

      <div
        className={`flow-atlas__feedback ${feedback?.success === false ? 'is-error' : ''}`}
        role={feedback?.success === false ? 'alert' : 'status'}
        aria-live={feedback?.success === false ? 'assertive' : 'polite'}
      >
        {feedback ? (
          <>
            {feedback.success ? (
              <Check size={17} aria-hidden="true" />
            ) : (
              <Info size={17} aria-hidden="true" />
            )}
            <span>{feedback.message}</span>
          </>
        ) : null}
      </div>

      {exercises.length > 0 ? (
        <div className="flow-atlas__grid" ref={gridRef}>
          {exercises.map((exercise) => {
            const state = getCardState(exercise);
            const favorite = exercise.favoriteTag !== 'none';
            const idea = isMovementIdeaExercise(exercise) ? readMovementIdeaDraft(exercise) : null;
            const photo =
              idea?.photoDataUrl && !brokenPhotoIds[exercise.id] ? idea.photoDataUrl : null;
            const previewLabel = idea
              ? photo
                ? '내 사진과 메모'
                : '내 동작 메모'
              : getExerciseArtworkFrame(exercise)
                ? '계획용 동작 도해'
                : '3D 동작 설명';
            const previewHintId = `flow-atlas-preview-${exercise.id}`;
            return (
              <article
                className={`flow-atlas__card ${state.inSequence ? 'is-in-sequence' : ''}`}
                key={exercise.id}
                aria-label={`${exercise.nameKo} 동작`}
                data-exercise-id={exercise.id}
              >
                <div className="flow-atlas__preview">
                  <div className="flow-atlas__art-wrap">
                    <div className="flow-atlas__art">
                      {photo ? (
                        <img
                          src={photo}
                          alt=""
                          loading="lazy"
                          onError={() => onPhotoError(exercise.id)}
                        />
                      ) : (
                        <ExerciseMotionArtwork exercise={exercise} />
                      )}
                    </div>
                    {state.inSequence ? (
                      <span className="flow-atlas__added-marker">
                        <Check size={13} aria-hidden="true" /> 수업에 담김
                      </span>
                    ) : null}
                  </div>
                  <div className="flow-atlas__card-content">
                    <p className="flow-atlas__card-meta">
                      <span>{APPARATUS_LABELS[exercise.apparatus].ko}</span>
                      <span>{LEVEL_LABELS[exercise.level]}</span>
                      <span>{exercise.defaultDurationMin}분</span>
                    </p>
                    <h2>
                      <button
                        type="button"
                        className="flow-atlas__preview-button"
                        onClick={() => onOpenDetails(exercise)}
                        aria-label={`${exercise.nameKo} 미리보기`}
                        aria-describedby={previewHintId}
                      >
                        {exercise.nameKo}
                      </button>
                    </h2>
                    <p className="flow-atlas__preview-hint">
                      <span id={previewHintId}>{previewLabel}</span>
                      <span aria-hidden="true">
                        미리보기 <ArrowRight size={14} />
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    className="flow-atlas__favorite-button"
                    aria-pressed={favorite}
                    aria-label={`${exercise.nameKo} 즐겨찾기 ${favorite ? '해제' : '추가'}`}
                    onClick={() => {
                      onToggleFavorite(exercise);
                      if (favoritesOnly && favorite) searchRef.current?.focus();
                    }}
                  >
                    <Heart size={18} aria-hidden="true" fill={favorite ? 'currentColor' : 'none'} />
                  </button>
                </div>
                <div className="flow-atlas__card-footer">
                  {state.note ? <p className="flow-atlas__card-note">{state.note}</p> : null}
                  <div className="flow-atlas__card-actions">
                    <button
                      type="button"
                      className={`flow-atlas__button flow-atlas__button--add ${state.inSequence ? 'is-added' : ''}`}
                      onClick={() => (state.inSequence ? onReturnToClass() : onAdd(exercise))}
                      aria-label={
                        state.inSequence
                          ? `${exercise.nameKo} 담긴 수업안 보기`
                          : `${exercise.nameKo} 수업안에 추가`
                      }
                    >
                      {addedId === exercise.id || state.inSequence ? (
                        <Check size={17} aria-hidden="true" />
                      ) : (
                        <Plus size={17} aria-hidden="true" />
                      )}
                      {state.inSequence
                        ? '수업안 보기'
                        : addedId === exercise.id
                          ? '추가됨'
                          : '수업에 담기'}
                      {state.inSequence ? <ArrowRight size={16} aria-hidden="true" /> : null}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="flow-atlas__empty" role="status">
          <Search size={30} aria-hidden="true" />
          <h2>조건에 맞는 동작이 없어요.</h2>
          <p>
            {search.trim() ? `‘${search.trim()}’ 검색어` : '선택한 기구·필터'}
            {ownedOnly ? '와 내 보유 장비 범위' : ''}를 확인해 보세요.
          </p>
          <div>
            {search ? (
              <button
                className="flow-atlas__button flow-atlas__button--quiet"
                type="button"
                onClick={onClearSearch}
              >
                검색어 지우기
              </button>
            ) : null}
            <button
              className="flow-atlas__button flow-atlas__button--add"
              type="button"
              onClick={onShowAll}
            >
              전체 동작 보기
            </button>
          </div>
        </div>
      )}

      {resultCount > exercises.length ? (
        <div className="flow-atlas__more">
          <p>
            {exercises.length} / {resultCount}개
          </p>
          <button
            type="button"
            className="flow-atlas__button flow-atlas__button--quiet"
            onClick={onLoadMore}
          >
            동작 더 보기 <Plus size={16} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </section>
  );
}
