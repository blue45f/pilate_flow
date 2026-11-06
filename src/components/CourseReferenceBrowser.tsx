import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { COURSE_REFERENCES as courses } from '../data/courseReferences';
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
} from '../utils/courseReferences';
import '../styles/course-references.css';

const completeCount = courses.filter((entry) =>
  hasCompleteCourseMetadata(entry),
).length;
const incompleteCount = courses.length - completeCount;
const equipmentOptions = [
  ...new Set(
    courses.flatMap((entry) =>
      (entry.facts.apparatus ?? []).map(courseEquipmentLabel),
    ),
  ),
];
const propOptions = [
  ...new Set(
    courses.flatMap((entry) => (entry.facts.props ?? []).map(coursePropLabel)),
  ),
];
const bodyOptions = [
  ...new Set(
    courses.flatMap((entry) =>
      (entry.facts.bodyTags ?? []).map(courseBodyLabel),
    ),
  ),
];
const difficultyOptions = [
  ...new Set(
    courses.flatMap((entry) =>
      entry.facts.difficulty ? [entry.facts.difficulty] : [],
    ),
  ),
];
const toggle = (items: string[], value: string) =>
  items.includes(value)
    ? items.filter((item) => item !== value)
    : [...items, value];

export function CourseReferenceBrowser() {
  const [filters, setFilters] = useState<CourseFilters>({
    ...INITIAL_COURSE_FILTERS,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [visible, setVisible] = useState({ signature: '', count: 6 });
  const signature = JSON.stringify(filters);
  const count = visible.signature === signature ? visible.count : 6;
  const filtered = useMemo(
    () => filterCourseReferences(courses, filters),
    [filters],
  );
  const update = <K extends keyof CourseFilters>(
    key: K,
    value: CourseFilters[K],
  ) => setFilters((previous) => ({ ...previous, [key]: value }));

  return (
    <section className="course-browser" aria-labelledby="course-browser-title">
      <header>
        <div>
          <span className="eyebrow">CLASS REFERENCES</span>
          <h2 id="course-browser-title">수업 흐름을 살펴보는 영상 자료</h2>
        </div>
        <BookOpen size={24} aria-hidden="true" />
      </header>
      <p className="course-browser-intro">
        추가 수업·워크아웃 링크 {courses.length}건. 한국어·영어 제목 자료이며,
        게시 국가와 음성 언어는 확인하지 않았습니다. 동작 노트나 제작된 모션과
        별도로 보관합니다.
      </p>
      <div className="course-browser-search-row">
        <label className="course-browser-search">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">수업 영상 검색</span>
          <input
            type="search"
            placeholder="제목, 게시자, 기구로 찾기"
            value={filters.search}
            onChange={(event) => update('search', event.target.value)}
          />
        </label>
        <button
          type="button"
          className="btn-secondary"
          aria-expanded={showFilters}
          aria-controls="course-filters"
          onClick={() => setShowFilters((value) => !value)}
        >
          <SlidersHorizontal size={16} /> 필터
        </button>
      </div>
      {showFilters && (
        <div id="course-filters" className="course-filters">
          <fieldset>
            <legend>게시자가 표기한 기구 · 여러 개 선택</legend>
            <div className="course-chips">
              {equipmentOptions.map((value) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={filters.equipment.includes(value)}
                  onClick={() =>
                    update('equipment', toggle(filters.equipment, value))
                  }
                >
                  {value}
                </button>
              ))}
            </div>
          </fieldset>
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
            같은 종류의 선택은 하나라도 일치하면 표시하며, 기구·소도구 조건은
            함께 적용합니다. 실제 영상이나 전체 준비물을 확인한 분류는 아닙니다.
          </p>
          <div className="course-filter-grid">
            <label className="form-field">
              <span>제목·설명 언어</span>
              <select
                value={filters.titleLanguage}
                onChange={(event) =>
                  update('titleLanguage', event.target.value)
                }
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
                  update(
                    'duration',
                    event.target.value as CourseFilters['duration'],
                  )
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
            이 링크 목록은 필수 장비 전체가 미확인이라 ‘내 보유 장비로만’
            결과에서 제외합니다. 소도구 표기가 없다고 소도구가 필요 없다는 뜻은
            아닙니다.
          </p>
        </div>
      )}
      <div className="course-result-row">
        <p role="status">
          {filtered.length} / {courses.length}건 · 기본은 게시자·제목을 기록한{' '}
          {completeCount}건
        </p>
        <button
          type="button"
          className="text-button"
          onClick={() => setFilters({ ...INITIAL_COURSE_FILTERS })}
        >
          초기화
        </button>
      </div>
      <div className="course-reference-grid">
        {filtered.slice(0, count).map((entry) => {
          const minutes = declaredCourseMinutes(entry);
          return (
            <article key={entry.id} className="course-reference-card">
              <div className="course-card-kicker">
                <span>
                  {entry.titleLanguage.includes('ko')
                    ? '한국어 제목·설명'
                    : '영어 제목'}
                </span>
                <span>
                  {!hasCompleteCourseMetadata(entry)
                    ? '추가 확인 후보'
                    : '출처 목록 기록'}
                </span>
              </div>
              <h3>
                <a
                  href={entry.canonicalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {entry.title}
                  <ArrowUpRight size={16} aria-hidden="true" />
                  <span className="sr-only"> · YouTube 원본, 새 창</span>
                </a>
              </h3>
              <p className="course-card-publisher">
                {entry.publisher ?? '게시자 미확인'}
                {entry.titleCompleteness !== 'complete-as-observed' &&
                  ' · 일부 제목만 확인'}
              </p>
              <div className="course-card-tags">
                {(entry.facts.apparatus ?? []).map((item) => (
                  <span key={item}>{courseEquipmentLabel(item)}</span>
                ))}
                {(entry.facts.props ?? []).map((item) => (
                  <span key={item}>{coursePropLabel(item)}</span>
                ))}
              </div>
              <dl>
                <div>
                  <dt>선언된 수업 길이</dt>
                  <dd>
                    {minutes === null
                      ? '미확인'
                      : `${minutes}분 · 실제 영상 길이 미확인`}
                  </dd>
                </div>
                <div>
                  <dt>난이도·부위 표기</dt>
                  <dd>
                    {entry.facts.difficulty
                      ? courseDifficultyLabel(entry.facts.difficulty)
                      : '난이도 미확인'}{' '}
                    ·{' '}
                    {(entry.facts.bodyTags ?? [])
                      .map(courseBodyLabel)
                      .join(', ') || '부위 미확인'}
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
                  {entry.checkedAt.slice(0, 10)}에 기록했습니다. 현재 원본의
                  재생 가능 여부와 강의 전체 내용은 확인하지 않았습니다. 누락
                  정보의 보완은 별도 근거로 표시합니다.
                </p>
                {entry.publisherAmendment && (
                  <div className="course-publisher-evidence">
                    <p>
                      게시자 정보 보완 ·{' '}
                      {entry.publisherAmendment.checkedAt.slice(0, 10)}
                    </p>
                    <p>{entry.publisherAmendment.basis}</p>
                    <a
                      href={entry.publisherAmendment.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      공식 게시자 연결 근거 ·{' '}
                      {entry.publisherAmendment.sourceTitle}{' '}
                      <ArrowUpRight size={13} />
                    </a>
                    <p>
                      사실 기록 SHA-256:{' '}
                      <code>
                        {entry.publisherAmendment.factualRecordSha256}
                      </code>
                    </p>
                  </div>
                )}
                <p>
                  기구·소도구·부위·난이도는 게시자 표기입니다. 영상의 모든
                  준비물, 개별 동작 구간, 실제 수업 소요시간이나 운동 효과를
                  확정하지 않습니다.
                </p>
                <p>
                  원본 링크 전용 · 복제 라이선스 미확인. 영상·음성·자막·썸네일을
                  복사하지 않았습니다.{' '}
                  {entry.publisherRegion
                    ? `게시자가 표기한 지역: ${entry.publisherRegion}.`
                    : '게시 국가 미확인.'}
                </p>
              </details>
              <a
                className="btn-secondary course-open-original"
                href={entry.canonicalUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                YouTube 원본 보기 <ArrowUpRight size={16} aria-hidden="true" />
                <span className="sr-only"> · 새 창</span>
              </a>
            </article>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <div className="course-empty">
          <h3>이 조건의 수업 자료가 없습니다</h3>
          <p>
            {filters.ownedOnly
              ? '전체 필수 장비가 확인된 링크가 없어 보유 장비 조건으로 표시할 수 없습니다.'
              : '필터를 줄이거나 다른 제목·기구로 검색해 보세요.'}
          </p>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setFilters({ ...INITIAL_COURSE_FILTERS })}
          >
            필터 초기화
          </button>
        </div>
      )}
      {filtered.length > count && (
        <button
          type="button"
          className="btn-secondary course-more"
          onClick={() => setVisible({ signature, count: count + 6 })}
        >
          {Math.min(6, filtered.length - count)}건 더 보기 ·{' '}
          {Math.min(count, filtered.length)} / {filtered.length}
        </button>
      )}
    </section>
  );
}
