import { ArrowRight, Check, Heart, Info, Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import type { RefObject } from 'react';
import { APPARATUS_LABELS } from '../data/pilatesCatalog';
import { EQUIPMENT_OPTIONS } from '../data/equipmentCatalog';
import { getExpandedMovementVisualBinding } from '../data/expandedMovementVisualBindings';
import { isMovementIdeaExercise, readMovementIdeaDraft } from '../utils/movementIdeaDraft';
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
            onClick={() => onOpenTools(true)}
          >
            <SlidersHorizontal size={17} aria-hidden="true" /> 필터
            {filterCount > 0 ? <span className="flow-atlas__count">{filterCount}</span> : null}
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
            {APPARATUS_ORDER.map((apparatus) => {
              const ids = EQUIPMENT_OPTIONS.filter(
                (item) => item.apparatusFamily === apparatus,
              ).map((item) => item.id);
              const selected =
                ids.length === equipment.length && ids.every((id) => equipment.includes(id));
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
        {activeFilters.length > 0 || ownedOnly ? (
          <div className="flow-atlas__active-filters" role="group" aria-label="적용된 검색·필터">
            {ownedOnly ? (
              <button type="button" onClick={() => onOpenTools(true)}>
                내 보유 장비 범위
              </button>
            ) : null}
            {activeFilters
              .filter((chip) => chip.key !== 'search')
              .map((chip) => (
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
            {activeFilters.length > 0 ? (
              <button type="button" className="flow-atlas__reset" onClick={onReset}>
                초기화
              </button>
            ) : null}
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
            const sourceOnly =
              getExpandedMovementVisualBinding(exercise)?.nativeMotionAvailable === false;
            const idea = isMovementIdeaExercise(exercise) ? readMovementIdeaDraft(exercise) : null;
            const photo =
              idea?.photoDataUrl && !brokenPhotoIds[exercise.id] ? idea.photoDataUrl : null;
            return (
              <article
                className={`flow-atlas__card ${state.inSequence ? 'is-in-sequence' : ''}`}
                key={exercise.id}
                aria-label={`${exercise.nameKo} 동작`}
                data-exercise-id={exercise.id}
              >
                <div className="flow-atlas__art-wrap">
                  <button
                    type="button"
                    className="flow-atlas__art"
                    onClick={() => onOpenDetails(exercise)}
                    aria-label={`${exercise.nameKo} 상세 보기`}
                  >
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
                  </button>
                  <button
                    type="button"
                    className="flow-atlas__favorite-button"
                    aria-pressed={favorite}
                    aria-label={`${exercise.nameKo} 즐겨찾기 ${favorite ? '해제' : '추가'}`}
                    onClick={() => onToggleFavorite(exercise)}
                  >
                    <Heart size={18} aria-hidden="true" fill={favorite ? 'currentColor' : 'none'} />
                  </button>
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
                    <button type="button" onClick={() => onOpenDetails(exercise)}>
                      {exercise.nameKo}
                    </button>
                  </h2>
                  {state.note ? <p className="flow-atlas__card-note">{state.note}</p> : null}
                  <div className="flow-atlas__card-actions">
                    <button
                      type="button"
                      className="flow-atlas__button flow-atlas__button--quiet"
                      onClick={() => onOpenDetails(exercise)}
                      aria-label={`${exercise.nameKo} ${sourceOnly ? '영상 보기' : '자세히 보기'}`}
                    >
                      보기
                    </button>
                    <button
                      type="button"
                      className={`flow-atlas__button flow-atlas__button--add ${state.inSequence ? 'is-added' : ''}`}
                      onClick={() => onAdd(exercise)}
                      aria-label={`${exercise.nameKo} 수업안에 추가`}
                    >
                      {addedId === exercise.id || state.inSequence ? (
                        <Check size={17} aria-hidden="true" />
                      ) : (
                        <Plus size={17} aria-hidden="true" />
                      )}
                      {addedId === exercise.id
                        ? '추가됨'
                        : state.inSequence
                          ? `담김 · ${state.orderNumber}번`
                          : '추가'}
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
