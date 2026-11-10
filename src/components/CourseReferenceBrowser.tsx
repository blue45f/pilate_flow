import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, BookOpen, Check, Layers, Search, SlidersHorizontal, X } from 'lucide-react';
import { usePilatesStore } from '../store/usePilatesStore';
import { COURSE_REFERENCES as defaultCourses } from '../data/courseReferences';
import {
  courseBodyLabel,
  courseDifficultyLabel,
  courseEquipmentLabel,
  coursePropLabel,
  declaredCourseMinutes,
  filterCourseReferences,
  INITIAL_COURSE_FILTERS,
  hasCompleteCourseMetadata,
  type CourseFilters,
  type CourseReference,
} from '../utils/courseReferences';
import '../styles/course-references.css';
import '../styles/course-explorer.css';

const MAX_COURSE_COMPARE = 3;

const DURATION_QUICK_OPTIONS: readonly [CourseFilters['duration'], string][] = [
  ['all', '전체 길이'],
  ['under-30', '30분 미만'],
  ['30-49', '30–49분'],
  ['50-plus', '50분 이상'],
  ['unknown', '길이 미확인'],
];

const toggle = (items: string[], value: string) =>
  items.includes(value) ? items.filter((item) => item !== value) : [...items, value];

const safeCompareLabel = (title: string) =>
  title.replace(/수업에 추가|추천/g, '').replace(/\s+/g, ' ').trim() || '참고 자료';

function formatDeclaredDurationFact(entry: CourseReference): string {
  if (entry.duration.publisherTitleDeclaredMinutes !== null) {
    return `${entry.duration.publisherTitleDeclaredMinutes}분 (제목 표기) · 실제 영상 길이 미확인`;
  }
  if (entry.duration.publisherDescriptionDeclaredMinutes !== null) {
    return `${entry.duration.publisherDescriptionDeclaredMinutes}분 (설명 표기) · 실제 영상 길이 미확인`;
  }
  const minutes = declaredCourseMinutes(entry);
  return minutes === null
    ? '미확인 · 실제 영상 길이 미확인'
    : `${minutes}분 · 실제 영상 길이 미확인`;
}

function formatPublisherBasis(entry: CourseReference): string {
  if (entry.publisherAmendment) {
    return `공식 게시자 근거 보완 (${entry.publisherAmendment.checkedAt.slice(0, 10)})`;
  }
  if (entry.publisher !== null) {
    return `공개 검색 메타데이터 (${entry.checkedAt.slice(0, 10)} 기록)`;
  }
  return `게시자 미확인 (${entry.checkedAt.slice(0, 10)} 기록)`;
}

function handleChipGroupKeyDown(event: React.KeyboardEvent<HTMLElement>) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  const buttons = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
  );
  if (buttons.length === 0) return;
  const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);
  if (currentIndex < 0) return;
  event.preventDefault();
  const nextIndex =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? buttons.length - 1
        : (currentIndex + (event.key === 'ArrowRight' ? 1 : buttons.length - 1)) % buttons.length;
  buttons[nextIndex]?.focus();
}

export interface CourseReferenceBrowserProps {
  entries?: readonly CourseReference[];
}

export function CourseReferenceBrowser({
  entries = defaultCourses,
}: CourseReferenceBrowserProps = {}) {
  const exerciseBrowseScope = usePilatesStore((state) => state.exerciseBrowseScope);
  const setExerciseBrowseScope = usePilatesStore((state) => state.setExerciseBrowseScope);

  const completeCount = useMemo(
    () => entries.filter((entry) => hasCompleteCourseMetadata(entry)).length,
    [entries],
  );
  const incompleteCount = entries.length - completeCount;
  const equipmentOptions = useMemo(
    () => [
      ...new Set(
        entries.flatMap((entry) => (entry.facts.apparatus ?? []).map(courseEquipmentLabel)),
      ),
    ],
    [entries],
  );
  const propOptions = useMemo(
    () => [
      ...new Set(entries.flatMap((entry) => (entry.facts.props ?? []).map(coursePropLabel))),
    ],
    [entries],
  );
  const bodyOptions = useMemo(
    () => [
      ...new Set(entries.flatMap((entry) => (entry.facts.bodyTags ?? []).map(courseBodyLabel))),
    ],
    [entries],
  );
  const difficultyOptions = useMemo(
    () => [
      ...new Set(
        entries.flatMap((entry) => (entry.facts.difficulty ? [entry.facts.difficulty] : [])),
      ),
    ],
    [entries],
  );

  const [localFilters, setFilters] = useState<CourseFilters>({ ...INITIAL_COURSE_FILTERS });
  const filters = useMemo(
    () => ({
      ...localFilters,
      ownedOnly: exerciseBrowseScope === 'owned',
    }),
    [localFilters, exerciseBrowseScope],
  );
  const [showFilters, setShowFilters] = useState(false);
  const [compareState, setCompareState] = useState<{
    ids: string[];
    expanded: boolean;
    limitNotice: string | null;
  }>({
    ids: [],
    expanded: false,
    limitNotice: null,
  });

  const searchInput = useRef<HTMLInputElement>(null);
  const nextHeading = useRef<string | null>(null);
  const compareExpandBtnRef = useRef<HTMLButtonElement | null>(null);
  const lastCompareTriggerRef = useRef<HTMLButtonElement | null>(null);

  const focusSearch = () => requestAnimationFrame(() => searchInput.current?.focus());
  const resetFilters = () => {
    setFilters({ ...INITIAL_COURSE_FILTERS });
    focusSearch();
  };
  const [visible, setVisible] = useState({ signature: '', count: 6 });
  const signature = JSON.stringify(filters);
  const count = visible.signature === signature ? visible.count : 6;
  const filtered = useMemo(() => filterCourseReferences(entries, filters), [entries, filters]);
  const filteredIdSet = useMemo(() => new Set(filtered.map((item) => item.id)), [filtered]);

  const comparedEntries = useMemo(
    () =>
      compareState.ids
        .map((id) => entries.find((item) => item.id === id))
        .filter((item): item is CourseReference => Boolean(item)),
    [compareState.ids, entries],
  );

  const toggleCompare = (entryId: string, trigger: HTMLButtonElement) => {
    lastCompareTriggerRef.current = trigger;
    setCompareState((previous) => {
      const validIds = previous.ids.filter((id) => entries.some((item) => item.id === id));
      if (validIds.includes(entryId)) {
        const nextIds = validIds.filter((id) => id !== entryId);
        return {
          ids: nextIds,
          expanded: nextIds.length > 0 ? previous.expanded : false,
          limitNotice: null,
        };
      }
      if (validIds.length >= MAX_COURSE_COMPARE) {
        return {
          ids: validIds,
          expanded: true,
          limitNotice: `출처 비교는 최대 ${MAX_COURSE_COMPARE}건까지 담을 수 있습니다. 먼저 한 건을 제외해 주세요.`,
        };
      }
      const nextIds = [...validIds, entryId];
      return {
        ids: nextIds,
        expanded: nextIds.length >= 2 ? true : previous.expanded,
        limitNotice: null,
      };
    });
  };

  const removeCompared = (entryId: string) => {
    const remainingCount = comparedEntries.filter((item) => item.id !== entryId).length;
    setCompareState((previous) => {
      const validIds = previous.ids.filter((id) => entries.some((item) => item.id === id));
      const nextIds = validIds.filter((id) => id !== entryId);
      return {
        ids: nextIds,
        expanded: nextIds.length > 0 ? previous.expanded : false,
        limitNotice: null,
      };
    });
    requestAnimationFrame(() => {
      if (remainingCount > 0 && compareExpandBtnRef.current?.isConnected) {
        compareExpandBtnRef.current.focus();
      } else if (lastCompareTriggerRef.current?.isConnected) {
        lastCompareTriggerRef.current.focus();
      } else {
        searchInput.current?.focus();
      }
    });
  };

  const clearCompared = () => {
    setCompareState({ ids: [], expanded: false, limitNotice: null });
    requestAnimationFrame(() => {
      if (lastCompareTriggerRef.current?.isConnected) {
        lastCompareTriggerRef.current.focus();
      } else {
        searchInput.current?.focus();
      }
    });
  };

  const collapseComparePanel = () => {
    setCompareState((previous) => ({ ...previous, expanded: false, limitNotice: null }));
    requestAnimationFrame(() => {
      if (compareExpandBtnRef.current?.isConnected) {
        compareExpandBtnRef.current.focus();
      } else {
        searchInput.current?.focus();
      }
    });
  };

  const update = <K extends keyof CourseFilters>(key: K, value: CourseFilters[K]) => {
    if (key === 'ownedOnly') setExerciseBrowseScope(value ? 'owned' : 'all');
    else setFilters((previous) => ({ ...previous, [key]: value }));
  };

  const activeFilters: { key: string; label: string; remove: () => void }[] = [
    ...(filters.search.trim()
      ? [
          {
            key: 'search',
            label: `검색: ${filters.search.trim()}`,
            remove: () => update('search', ''),
          },
        ]
      : []),
    ...filters.equipment.map((value) => ({
      key: `equipment-${value}`,
      label: value,
      remove: () =>
        update(
          'equipment',
          filters.equipment.filter((item) => item !== value),
        ),
    })),
    ...filters.props.map((value) => ({
      key: `prop-${value}`,
      label: value,
      remove: () =>
        update(
          'props',
          filters.props.filter((item) => item !== value),
        ),
    })),
    ...(
      [
        ['titleLanguage', filters.titleLanguage === 'ko' ? '한국어 제목·설명' : '영어 제목·설명'],
        [
          'duration',
          {
            'under-30': '선언 길이 30분 미만',
            '30-49': '선언 길이 30–49분',
            '50-plus': '선언 길이 50분 이상',
            unknown: '선언 길이 미확인',
            all: '',
          }[filters.duration],
        ],
        [
          'difficulty',
          filters.difficulty === 'unknown'
            ? '난이도 미확인'
            : courseDifficultyLabel(filters.difficulty),
        ],
        ['bodyTag', filters.bodyTag === 'unknown' ? '부위 미확인' : filters.bodyTag],
      ] as const
    ).flatMap(([key, label]) =>
      filters[key] !== 'all' ? [{ key, label, remove: () => update(key, 'all') }] : [],
    ),
    ...(filters.incomplete
      ? [
          {
            key: 'incomplete',
            label: '추가 확인 후보 포함',
            remove: () => update('incomplete', false),
          },
        ]
      : []),
    ...(filters.ownedOnly
      ? [{ key: 'ownedOnly', label: '내 보유 장비', remove: () => update('ownedOnly', false) }]
      : []),
  ];
  const filterCount = activeFilters.filter((filter) => filter.key !== 'search').length;
  useEffect(() => {
    if (!nextHeading.current) return;
    const heading = document.getElementById(nextHeading.current);
    nextHeading.current = null;
    heading?.focus();
    heading?.scrollIntoView?.({ behavior: 'instant', block: 'start' });
  }, [visible]);

  return (
    <section className="course-browser course-explorer" aria-labelledby="course-browser-title">
      <header>
        <div>
          <span className="eyebrow">CLASS REFERENCES</span>
          <h2 id="course-browser-title">수업 영상 찾기</h2>
        </div>
        <BookOpen size={24} aria-hidden="true" />
      </header>
      <p className="course-browser-intro">
        원본 링크 {entries.length}건에서 제목·게시자·기구를 찾아보세요. 재생·음성 언어·전체 준비물은
        미확인입니다.
      </p>
      <div className="course-browser-search-row">
        <label className="course-browser-search">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">수업 영상 검색</span>
          <input
            ref={searchInput}
            type="search"
            aria-label="수업 영상 검색"
            placeholder="제목, 게시자, 기구로 찾기"
            value={filters.search}
            onChange={(event) => update('search', event.target.value)}
          />
          {filters.search && (
            <button
              type="button"
              className="course-search-clear"
              aria-label="수업 영상 검색어 지우기"
              onClick={() => {
                update('search', '');
                focusSearch();
              }}
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </label>
        <button
          type="button"
          className="btn-secondary course-filter-toggle"
          aria-expanded={showFilters}
          aria-controls="course-filters"
          onClick={() => setShowFilters((value) => !value)}
        >
          <SlidersHorizontal size={16} aria-hidden="true" /> 필터
          {filterCount > 0 && <span className="course-filter-count">{filterCount}</span>}
        </button>
      </div>
      <div className="course-language-row">
        <div
          className="course-language-choices"
          role="group"
          aria-label="제목·설명 언어 빠른 선택"
          onKeyDown={handleChipGroupKeyDown}
        >
          {(
            [
              ['all', '전체 제목'],
              ['ko', '한국어 표기'],
              ['en', '영어 표기'],
            ] as const
          ).map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={filters.titleLanguage === value}
              onClick={() => update('titleLanguage', value)}
            >
              {label}
            </button>
          ))}
        </div>
        <span>제목·설명 기준 · 음성 언어 미확인</span>
      </div>

      <div className="course-quick-filter-stack" aria-label="기구 및 선언 길이 빠른 필터">
        {equipmentOptions.length > 0 && (
          <div
            className="course-quick-chips"
            role="group"
            aria-label="게시자 표기 기구 빠른 선택"
            onKeyDown={handleChipGroupKeyDown}
          >
            <button
              type="button"
              aria-pressed={filters.equipment.length === 0}
              onClick={() => update('equipment', [])}
            >
              전체 기구
            </button>
            {equipmentOptions.map((value) => (
              <button
                type="button"
                key={value}
                aria-pressed={filters.equipment.includes(value)}
                onClick={() => update('equipment', toggle(filters.equipment, value))}
              >
                {value}
              </button>
            ))}
          </div>
        )}
        <div
          className="course-quick-chips course-duration-chips"
          role="group"
          aria-label="선언 수업 길이 빠른 선택"
          onKeyDown={handleChipGroupKeyDown}
        >
          {DURATION_QUICK_OPTIONS.map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={filters.duration === value}
              onClick={() => update('duration', value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {showFilters && (
        <div id="course-filters" className="course-filters">
          <fieldset>
            <legend>게시자가 표기한 소도구 · 여러 개 선택</legend>
            <div className="course-chips">
              {propOptions.map((value) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={filters.props.includes(value)}
                  onClick={() => update('props', toggle(filters.props, value))}
                >
                  {value}
                </button>
              ))}
            </div>
          </fieldset>
          <p className="muted">
            같은 종류의 선택은 하나라도 일치하면 표시하며, 기구·소도구 조건은 함께 적용합니다. 실제
            영상이나 전체 준비물을 확인한 분류는 아닙니다.
          </p>
          <div className="course-filter-grid">
            <label className="form-field">
              <span>제목·설명 언어</span>
              <select
                value={filters.titleLanguage}
                onChange={(event) => update('titleLanguage', event.target.value)}
              >
                <option value="all">전체</option>
                <option value="ko">한국어 표기</option>
                <option value="en">영어 표기</option>
              </select>
            </label>
            <label className="form-field">
              <span>게시자가 선언한 수업 길이</span>
              <select
                value={filters.duration}
                onChange={(event) =>
                  update('duration', event.target.value as CourseFilters['duration'])
                }
              >
                <option value="all">전체</option>
                <option value="under-30">30분 미만</option>
                <option value="30-49">30–49분</option>
                <option value="50-plus">50분 이상</option>
                <option value="unknown">미확인</option>
              </select>
            </label>
            <label className="form-field">
              <span>게시자 난이도 표기</span>
              <select
                value={filters.difficulty}
                onChange={(event) => update('difficulty', event.target.value)}
              >
                <option value="all">전체</option>
                <option value="unknown">미확인</option>
                {difficultyOptions.map((value) => (
                  <option key={value} value={value}>
                    {courseDifficultyLabel(value)}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>게시자 부위 표기</span>
              <select
                value={filters.bodyTag}
                onChange={(event) => update('bodyTag', event.target.value)}
              >
                <option value="all">전체</option>
                <option value="unknown">미확인</option>
                {bodyOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="course-check">
            <input
              type="checkbox"
              checked={filters.incomplete}
              onChange={(event) => update('incomplete', event.target.checked)}
            />
            게시자·제목 확인이 덜 된 후보 {incompleteCount}건도 보기
          </label>
          <label className="course-check">
            <input
              type="checkbox"
              checked={filters.ownedOnly}
              onChange={(event) => update('ownedOnly', event.target.checked)}
            />
            내 보유 장비로만 가능한 자료
          </label>
          <p className="muted">
            이 링크 목록은 필수 장비 전체가 미확인이라 ‘내 보유 장비로만’ 결과에서 제외합니다.
            소도구 표기가 없다고 소도구가 필요 없다는 뜻은 아닙니다.
          </p>
        </div>
      )}
      {activeFilters.length > 0 && (
        <div className="course-active-filters" role="group" aria-label="수업 영상 적용 조건">
          <span>적용 중</span>
          {activeFilters.map((filter) => (
            <button
              type="button"
              key={filter.key}
              aria-label={`${filter.label} 조건 해제`}
              onClick={() => {
                filter.remove();
                focusSearch();
              }}
            >
              <span>{filter.label}</span>
              <X size={13} aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
      <div className="course-result-row">
        <p role="status" aria-label="수업 영상 검색 결과" aria-live="polite" aria-atomic="true">
          {filtered.length} / {entries.length}건 · 기본은 게시자·제목을 기록한 {completeCount}건
        </p>
        {activeFilters.length > 0 && (
          <button
            type="button"
            className="text-button"
            aria-label="수업 영상 검색·필터 초기화"
            onClick={resetFilters}
          >
            초기화
          </button>
        )}
      </div>

      {comparedEntries.length > 0 && (
        <section
          className="course-compare-panel"
          aria-label="선택한 참고 자료 비교"
          data-testid="course-compare-panel"
          onKeyDown={(event) => {
            if (event.key === 'Escape' && compareState.expanded) {
              event.preventDefault();
              event.stopPropagation();
              collapseComparePanel();
            }
          }}
        >
          <div className="course-compare-header">
            <div className="course-compare-title-row">
              <span className="course-compare-badge">
                <Layers size={14} aria-hidden="true" />
                출처 비교 {comparedEntries.length}/{MAX_COURSE_COMPARE}건
              </span>
              <span className="course-compare-note">
                검색·필터를 바꿔도 선택한 출처가 유지됩니다.
              </span>
            </div>
            <div className="course-compare-header-actions">
              <button
                type="button"
                ref={compareExpandBtnRef}
                className="course-compare-expand-btn"
                aria-expanded={compareState.expanded}
                aria-controls="course-compare-grid"
                onClick={() =>
                  setCompareState((previous) => ({
                    ...previous,
                    expanded: !previous.expanded,
                    limitNotice: null,
                  }))
                }
              >
                {compareState.expanded
                  ? '비교표 접기'
                  : `비교표 펼치기 (${comparedEntries.length})`}
              </button>
              <button
                type="button"
                className="course-compare-clear-btn"
                onClick={clearCompared}
              >
                비교 비우기 <X size={13} aria-hidden="true" />
              </button>
            </div>
          </div>

          <ul className="course-compare-chips" aria-label="비교 중인 참고 자료">
            {comparedEntries.map((item, idx) => (
              <li key={item.id} className="course-compare-chip">
                <span>
                  {idx + 1}. {item.title}
                </span>
                <button
                  type="button"
                  aria-label={`${safeCompareLabel(item.title)} 비교에서 제외`}
                  onClick={() => removeCompared(item.id)}
                >
                  <X size={13} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>

          {compareState.limitNotice && (
            <p className="course-compare-limit-note" aria-live="polite">
              {compareState.limitNotice}
            </p>
          )}

          {compareState.expanded && (
            <div id="course-compare-grid" className="course-compare-grid">
              {comparedEntries.map((item) => {
                const inFiltered = filteredIdSet.has(item.id);
                const apparatusLabels = (item.facts.apparatus ?? []).map(courseEquipmentLabel);
                const propsSummary =
                  item.facts.props === null
                    ? '소도구 표기 미확인'
                    : item.facts.props.length > 0
                      ? item.facts.props.map(coursePropLabel).join(', ')
                      : '소도구 없음(게시자 표기)';
                return (
                  <div
                    key={item.id}
                    className="course-compare-item"
                    role="group"
                    aria-label={`${safeCompareLabel(item.title)} 비교 항목`}
                    data-testid={`course-compare-item-${item.id}`}
                  >
                    <div className="course-compare-item-head">
                      <div>
                        <h4>{item.title}</h4>
                        {!inFiltered && (
                          <span className="course-compare-outside">현재 조건 밖 · 선택 유지됨</span>
                        )}
                      </div>
                      <button
                        type="button"
                        aria-label={`비교표에서 ${safeCompareLabel(item.title)} 닫기`}
                        onClick={() => removeCompared(item.id)}
                      >
                        <X size={15} aria-hidden="true" />
                      </button>
                    </div>
                    <dl className="course-compare-dl">
                      <div>
                        <dt>게시자·근거</dt>
                        <dd>
                          <strong>{item.publisher ?? '게시자 미확인'}</strong> ·{' '}
                          {formatPublisherBasis(item)}
                          {item.publisherAmendment && (
                            <a
                              className="course-compare-evidence-link"
                              href={item.publisherAmendment.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              공식 게시자 연결 근거 · {item.publisherAmendment.sourceTitle}{' '}
                              <ArrowUpRight size={13} aria-hidden="true" />
                            </a>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>기구·소도구</dt>
                        <dd>
                          {apparatusLabels.length > 0
                            ? apparatusLabels.join(', ')
                            : '기구 표기 미확인'}{' '}
                          · {propsSummary}
                        </dd>
                      </div>
                      <div>
                        <dt>선언 길이</dt>
                        <dd>{formatDeclaredDurationFact(item)}</dd>
                      </div>
                      <div>
                        <dt>난이도·부위</dt>
                        <dd>
                          {item.facts.difficulty
                            ? courseDifficultyLabel(item.facts.difficulty)
                            : '난이도 미확인'}{' '}
                          ·{' '}
                          {(item.facts.bodyTags ?? []).map(courseBodyLabel).join(', ') ||
                            '부위 미확인'}
                        </dd>
                      </div>
                      <div>
                        <dt>확인 한계</dt>
                        <dd>
                          원본 링크 전용 · 재생·음성 언어·전체 준비물 미확인 ·{' '}
                          {item.publisherRegion
                            ? `지역 표기: ${item.publisherRegion}`
                            : '게시 국가 미확인'}
                        </dd>
                      </div>
                    </dl>
                    <a
                      className="btn-secondary course-compare-open"
                      href={item.canonicalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      YouTube 원본 보기 <ArrowUpRight size={15} aria-hidden="true" />
                      <span className="sr-only"> · 새 창</span>
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      <div className="course-reference-grid">
        {filtered.slice(0, count).map((entry) => {
          const compareIndex = comparedEntries.findIndex((item) => item.id === entry.id);
          const isCompared = compareIndex >= 0;
          const apparatusList = entry.facts.apparatus ?? [];
          return (
            <article
              key={entry.id}
              className={`course-reference-card ${isCompared ? 'is-compared' : ''}`.trim()}
            >
              <div className="course-card-kicker">
                <span>{entry.titleLanguage.includes('ko') ? '한국어 제목·설명' : '영어 제목'}</span>
                <span>
                  {!hasCompleteCourseMetadata(entry) ? '추가 확인 후보' : '출처 목록 기록'}
                </span>
                {entry.publisherAmendment && (
                  <span className="course-kicker-amended">공식 게시자 근거 보완</span>
                )}
              </div>
              <h3 id={`course-result-${entry.id}`} tabIndex={-1}>
                <a href={entry.canonicalUrl} target="_blank" rel="noopener noreferrer">
                  {entry.title}
                  <ArrowUpRight size={16} aria-hidden="true" />
                  <span className="sr-only"> · YouTube 원본, 새 창</span>
                </a>
              </h3>
              <p className="course-card-publisher">
                {entry.publisher ?? '게시자 미확인'}
                {entry.titleCompleteness !== 'complete-as-observed' && ' · 일부 제목만 확인'}
              </p>
              <div className="course-card-tags">
                {apparatusList.length > 0 ? (
                  apparatusList.map((item) => (
                    <span key={item}>{courseEquipmentLabel(item)}</span>
                  ))
                ) : (
                  <span className="course-tag-muted">기구 표기 미확인</span>
                )}
                {entry.facts.props === null ? null : entry.facts.props.length > 0 ? (
                  entry.facts.props.map((item) => (
                    <span key={item}>{coursePropLabel(item)}</span>
                  ))
                ) : (
                  <span className="course-tag-muted">소도구 없음(게시자 표기)</span>
                )}
              </div>
              <dl>
                <div>
                  <dt>선언된 수업 길이</dt>
                  <dd>{formatDeclaredDurationFact(entry)}</dd>
                </div>
                <div>
                  <dt>난이도·부위 표기</dt>
                  <dd>
                    {entry.facts.difficulty
                      ? courseDifficultyLabel(entry.facts.difficulty)
                      : '난이도 미확인'}{' '}
                    ·{' '}
                    {(entry.facts.bodyTags ?? []).map(courseBodyLabel).join(', ') || '부위 미확인'}
                  </dd>
                </div>
              </dl>
              <p className="course-card-state">
                재생·음성 언어·임베드 미확인 · 전문 검수 0 · 자동 추천 제외
              </p>
              <details>
                <summary>근거·권리와 확인 범위</summary>
                <p>
                  원본 목록의 제목·게시자 표기는 공개 검색 메타데이터를{' '}
                  {entry.checkedAt.slice(0, 10)}에 기록했습니다. 현재 원본의 재생 가능 여부와 강의
                  전체 내용은 확인하지 않았습니다. 누락 정보의 보완은 별도 근거로 표시합니다.
                </p>
                {entry.publisherAmendment && (
                  <div className="course-publisher-evidence">
                    <p>게시자 정보 보완 · {entry.publisherAmendment.checkedAt.slice(0, 10)}</p>
                    <p>{entry.publisherAmendment.basis}</p>
                    <a
                      href={entry.publisherAmendment.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      공식 게시자 연결 근거 · {entry.publisherAmendment.sourceTitle}{' '}
                      <ArrowUpRight size={13} />
                    </a>
                    <p>
                      사실 기록 SHA-256: <code>{entry.publisherAmendment.factualRecordSha256}</code>
                    </p>
                  </div>
                )}
                <p>
                  기구·소도구·부위·난이도는 게시자 표기입니다. 영상의 모든 준비물, 개별 동작 구간,
                  실제 수업 소요시간이나 운동 효과를 확정하지 않습니다.
                </p>
                <p>
                  원본 링크 전용 · 복제 라이선스 미확인. 영상·음성·자막·썸네일을 복사하지
                  않았습니다.{' '}
                  {entry.publisherRegion
                    ? `게시자가 표기한 지역: ${entry.publisherRegion}.`
                    : '게시 국가 미확인.'}
                </p>
              </details>
              <div className="course-card-actions">
                <button
                  type="button"
                  className={`course-compare-toggle ${isCompared ? 'is-compared' : ''}`.trim()}
                  aria-pressed={isCompared}
                  aria-label={`${safeCompareLabel(entry.title)} 출처 비교 담기`}
                  onClick={(event) => toggleCompare(entry.id, event.currentTarget)}
                >
                  {isCompared ? (
                    <Check size={14} aria-hidden="true" />
                  ) : (
                    <Layers size={14} aria-hidden="true" />
                  )}
                  <span>{isCompared ? `비교 중 (${compareIndex + 1})` : '출처 비교'}</span>
                </button>
                <a
                  className="btn-secondary course-open-original"
                  href={entry.canonicalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  YouTube 원본 보기 <ArrowUpRight size={16} aria-hidden="true" />
                  <span className="sr-only"> · 새 창</span>
                </a>
              </div>
            </article>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <div className="course-empty">
          <h3>이 조건의 수업 자료가 없습니다</h3>
          {activeFilters.length > 0 && (
            <p className="course-empty-context" data-testid="course-empty-filter-summary">
              적용 조건: {activeFilters.map((item) => item.label).join(' · ')}
            </p>
          )}
          <p>
            {filters.ownedOnly
              ? '전체 필수 장비가 확인된 링크가 없어 보유 장비 조건으로 표시할 수 없습니다.'
              : '필터를 줄이거나 다른 제목·기구로 검색해 보세요.'}
          </p>
          <div className="course-empty-actions">
            {filters.ownedOnly && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  update('ownedOnly', false);
                  focusSearch();
                }}
              >
                보유 장비 조건만 해제
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={resetFilters}>
              필터 초기화
            </button>
          </div>
        </div>
      )}
      {filtered.length > count && (
        <button
          type="button"
          className="btn-secondary course-more"
          onClick={() => {
            const nextEntry = filtered[count];
            nextHeading.current = nextEntry ? `course-result-${nextEntry.id}` : null;
            setVisible({ signature, count: count + 6 });
          }}
        >
          {Math.min(6, filtered.length - count)}건 더 보기 · {Math.min(count, filtered.length)} /{' '}
          {filtered.length}
        </button>
      )}
    </section>
  );
}
