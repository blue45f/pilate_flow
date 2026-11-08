import { EquipmentChoice } from './EquipmentChoice';
import type { MotionDraftId } from '../models/types';
import {
  MOTION_PATTERN_REFERENCES,
  getMotionPatternReferences,
} from '../data/motionPatternReferences';
import type { MotionPatternReference } from '../data/motionPatternReferences';
import { matchesDiscoverySearch } from '../utils/discoverySearch';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock3,
  ExternalLink,
  FileText,
  Heart,
  Info,
  Plus,
  Play,
  Search,
  SlidersHorizontal,
  X,
  Youtube,
} from 'lucide-react';
import {
  APPARATUS_LABELS,
  CANONICAL_BLOCKS,
  FAVORITE_TAG_META,
  POSITION_LABELS,
} from '../data/pilatesCatalog';
import { getMovementProvenance } from '../data/movementProvenance';
import { PUBLIC_REFERENCES } from '../data/publicReferences';
import {
  VERIFIED_REFERENCES,
  SOURCE_CATALOG_SUMMARY,
  type VerifiedPublicReference,
} from '../data/verifiedReferences';
import reviewQueueCsvUrl from '../data/sourceCatalog/review-queue.csv?url';
import { EQUIPMENT_OPTIONS, PROP_OPTIONS, getExerciseEquipment } from '../data/equipmentCatalog';
import { matchesLibraryEquipment } from '../data/libraryEquipmentFilters';
import { getExerciseReviewState, isExerciseAutoEligible } from '../utils/exerciseReview';
import {
  addMovementIdeaToCurrentClass,
  isMovementIdeaExercise,
  readMovementIdeaDraft,
} from '../utils/movementIdeaDraft';
import { PfAiStatusBadge, PfBadge, PfButton, PfMovementCard } from '../design-system';
import { usePilatesStore } from '../store/usePilatesStore';
import type {
  BodyPosition,
  ClassBlockCategory,
  DifficultyLevel,
  FavoriteTag,
  PilatesExercise,
  PropType,
} from '../types/pilates';
import {
  formatSecondsToMMSS,
  getExerciseLastTaughtInfo,
  getRecentlyTaughtExerciseIds,
  isRestStep,
} from '../utils/sequenceEngine';
import { MotionPatternPreview, MotionPatternThumbnail } from './MotionPatternPreview';
import { CourseReferenceBrowser } from './CourseReferenceBrowser';
import { SourceNoteDialog } from './SourceNoteDialog';
import '../styles/design-tokens.css';
import '../styles/library.css';
import '../styles/library-learning.css';
import '../styles/motion-library.css';
import '../styles/library-asset-status.css';
import '../styles/library-concept-layout.css';
import { LibraryMovementInspector } from './LibraryMovementInspector';
import { COURSE_REFERENCES } from '../data/courseReferences';

interface ExerciseAtlasViewProps {
  onOpenYouTubePreview: (exercise: PilatesExercise) => void;
  onOpenIdeaSheet?: (exercise?: PilatesExercise | null) => void;
  onOpenClipper: () => void;
  onOpenStudy?: (exerciseId?: string) => void;
  onOpenMotionDrafts?: (draftId?: MotionDraftId) => void;
}

const INITIAL_FILTERS = {
  search: '',
  equipment: [] as string[],
  block: 'all',
  position: 'all',
  level: 'all',
  duration: 'all',
  favorite: 'all',
  review: 'all',
  motionDraft: 'all',
  props: [] as PropType[],
  owned: false,
  hideRecent: false,
};
const LEVEL_NAMES = { '1.0': '기초', '1.5': '중급', '2.0': '심화' };
const PATTERN_STUDIES = [
  ...MOTION_PATTERN_REFERENCES.filter((reference) => reference.family === 'authoring-batch'),
  ...MOTION_PATTERN_REFERENCES.filter((reference) => reference.family !== 'authoring-batch'),
];
const PATTERNS_PER_PAGE = 4;

const SOURCE_CHECK_LABELS = {
  'official-source-checked': '공식 출처 확인',
  'partial-playback-checked': '영상 부분 확인',
  'korean-candidate': '국내 후보',
};

const equipmentLabel = (id: string) =>
  EQUIPMENT_OPTIONS.find((item) => item.id === id)?.labelKo || id;
const propLabel = (id: PropType) => PROP_OPTIONS.find((item) => item.id === id)?.labelKo || id;
const toggleSelection = <T extends string>(items: T[], value: T): T[] =>
  items.includes(value) ? items.filter((item) => item !== value) : [...items, value];

interface RequirementFilterProps {
  equipment: string[];
  props: PropType[];
  onEquipmentChange: (items: string[]) => void;
  onPropsChange: (items: PropType[]) => void;
}
const RequirementFilters: React.FC<RequirementFilterProps> = ({
  equipment,
  props,
  onEquipmentChange,
  onPropsChange,
}) => (
  <div className="library-requirement-filters">
    <fieldset>
      <legend>기구 · 여러 개 선택</legend>
      <div className="library-multi-chips">
        {EQUIPMENT_OPTIONS.map((item) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={equipment.includes(item.id)}
            className={equipment.includes(item.id) ? 'selected' : ''}
            onClick={() => onEquipmentChange(toggleSelection(equipment, item.id))}
          >
            {item.labelKo}
          </button>
        ))}
      </div>
    </fieldset>
    <fieldset>
      <legend>소도구 · 여러 개 선택</legend>
      <div className="library-multi-chips">
        {PROP_OPTIONS.map((item) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={props.includes(item.id)}
            className={props.includes(item.id) ? 'selected' : ''}
            onClick={() => onPropsChange(toggleSelection(props, item.id))}
          >
            {item.labelKo}
          </button>
        ))}
      </div>
    </fieldset>
    <p>
      선택한 기구 중 하나, 선택한 소도구 중 하나와 일치하는 자료를 찾습니다. 두 조건을 함께 고르면
      둘 다 적용합니다.
    </p>
  </div>
);

const OwnedEquipmentEditor: React.FC = () => {
  const { ownedEquipment, ownedProps, toggleOwnedEquipment, toggleOwnedProp } = usePilatesStore();
  return (
    <details className="library-owned-editor">
      <summary>
        <span>
          <SlidersHorizontal size={15} /> 내 보유 장비 설정
        </span>
        <span>
          기구 {ownedEquipment.length} · 소도구{' '}
          {ownedProps.filter((item) => item !== 'none').length}
          <ChevronDown size={14} />
        </span>
      </summary>
      <div>
        <p>‘내 보유 장비만’은 아래 기구와 소도구로 요구 조건을 모두 충족하는 자료를 보여줍니다.</p>
        <fieldset>
          <legend>내 기구</legend>
          <div className="equipment-choice-grid">
            {EQUIPMENT_OPTIONS.map((item) => (
              <EquipmentChoice
                key={item.id}
                equipmentId={item.id}
                label={item.labelKo}
                checked={ownedEquipment.includes(item.id)}
                onChange={() => toggleOwnedEquipment(item.id)}
                control="button"
              />
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>내 소도구</legend>
          <div className="equipment-choice-grid">
            {PROP_OPTIONS.filter((item) => item.id !== 'none').map((item) => (
              <EquipmentChoice
                key={item.id}
                equipmentId={item.id as Exclude<typeof item.id, 'none'>}
                label={item.labelKo}
                checked={ownedProps.includes(item.id)}
                onChange={() => toggleOwnedProp(item.id)}
                control="button"
              />
            ))}
          </div>
        </fieldset>
        <p>
          기구와 소도구의 전체 요구 조건이 미확인인 자료는 보유 장비 필터에서 제외합니다. 설정은 이
          브라우저에 저장합니다.
        </p>
      </div>
    </details>
  );
};

const formatObservationPoint = (seconds: number) => {
  const fraction = (seconds % 1).toFixed(3).slice(1).replace(/0+$/, '').replace(/\.$/, '');
  return `${formatSecondsToMMSS(seconds)}${fraction}`;
};

const VerifiedReferenceCard: React.FC<{
  reference: VerifiedPublicReference;
  onCreateNote: (reference: VerifiedPublicReference) => void;
}> = ({ reference, onCreateNote }) => (
  <article className={`verified-reference-card reference-${reference.verificationStatus}`}>
    <div className="verified-reference-card-top">
      <span className="verified-reference-publisher">
        {reference.provider === 'youtube' ? <Youtube size={16} /> : <ExternalLink size={14} />}
        {reference.sourceName}
      </span>
      <span className="verified-reference-region">
        {reference.region === 'kr' ? '국내 후보' : '해외 공식 출처'}
      </span>
    </div>
    <div className="verified-reference-status">
      <span>{SOURCE_CHECK_LABELS[reference.verificationStatus]}</span>
      <span>전문가 미검수</span>
    </div>
    <h3>
      <a href={reference.url} target="_blank" rel="noopener noreferrer">
        {reference.title}
        <ArrowUpRight size={15} />
      </a>
    </h3>
    <p className="verified-reference-original-title">{reference.originalTitle}</p>
    <div className="verified-reference-tags">
      <span>
        {reference.scope === 'series'
          ? '시리즈 참조 · 개별 동작 아님'
          : reference.scope === 'full-class'
            ? '전체 수업'
            : reference.scope === 'exercise'
              ? '동작 참조'
              : '일반 교육'}
      </span>
      <span>
        {reference.requiredEquipment.length
          ? reference.requiredEquipment.map(equipmentLabel).join(' · ')
          : '기구 미확인'}
      </span>
      <span>{reference.levelLabel || '난이도 미확인'}</span>
      <span>
        <Clock3 size={11} />
        수업 시간 미확인
      </span>
    </div>
    <dl className="verified-reference-focus">
      <dt>부위 태그</dt>
      <dd>
        {reference.bodyFocus.length ? reference.bodyFocus.join(' · ') : '미확인'}
        <small
          className={
            reference.bodyFocusStatus === 'unreviewed-name-classification' ? 'candidate-tags' : ''
          }
        >
          {reference.bodyFocusStatus === 'publisher-stated'
            ? '공식 본문 기재'
            : reference.bodyFocusStatus === 'unreviewed-name-classification'
              ? '이름 기반 임시 분류 · 미검토'
              : '분류 근거 미확인'}
        </small>
      </dd>
      <dt>소도구</dt>
      <dd>
        {reference.requiredProps.length
          ? reference.requiredProps.map(propLabel).join(' · ')
          : '추가 요구 조건 미확인'}
        {reference.additionalRequirements.length > 0 && (
          <small>별도 액세서리: {reference.additionalRequirements.join(' · ')}</small>
        )}
      </dd>
      <dt>언어</dt>
      <dd>{reference.language}</dd>
      {reference.videoDurationSeconds !== null && (
        <>
          <dt>원본 길이</dt>
          <dd>
            {formatSecondsToMMSS(reference.videoDurationSeconds)}
            <small>원본 웹사이트 영상 길이 · 동작·수업 시간 아님</small>
          </dd>
        </>
      )}
    </dl>
    <p className="verified-reference-requirements unknown">
      전체 기구·소도구 요구 조건 미검수 · 보유 장비 필터 제외
    </p>
    {reference.observationPoints.length > 0 ? (
      <div className="verified-reference-observations">
        <strong>영상 부분 확인 · 관찰 시점</strong>
        {reference.observationPoints.map((point) => (
          <div key={point.seconds}>
            <time>{formatObservationPoint(point.seconds)}</time>
            <span>{point.note}</span>
          </div>
        ))}
        <p>
          실제로 관찰한 시점이며 동작 시작·종료 구간이 아닙니다. 원본 웹사이트 영상에만 해당합니다.
        </p>
      </div>
    ) : (
      <p className="verified-reference-no-timestamps">
        {reference.scope === 'series'
          ? '시리즈 전체 참조 · 개별 동작명·시작·종료 구간 미검수'
          : '영상 시작·종료 구간 미확인 · 원본 링크로 참조'}
      </p>
    )}
    <details className="verified-reference-evidence">
      <summary>
        <span>
          <Info size={12} /> 확인 근거와 권리
        </span>
        <ChevronDown size={12} />
      </summary>
      <p>{reference.verificationNote}</p>
      <dl>
        <dt>기구 분류 근거</dt>
        <dd>{reference.equipmentEvidence.replace('source.video_review', '영상 부분 확인 기록')}</dd>
        <dt>부위 분류 근거</dt>
        <dd>{reference.bodyFocusEvidence}</dd>
        <dt>난이도 근거</dt>
        <dd>{reference.levelEvidence}</dd>
      </dl>
      {reference.instructor && <p>출처가 소개한 강사: {reference.instructor}</p>}
      {reference.credentialEvidence && <p>{reference.credentialEvidence}</p>}
      {reference.credentialEvidenceUrl && (
        <a href={reference.credentialEvidenceUrl} target="_blank" rel="noopener noreferrer">
          교육·자격기관의 소개 확인 <ExternalLink size={11} />
        </a>
      )}
      {reference.credentialLimit && <p>{reference.credentialLimit}</p>}
      {reference.safetyNote && (
        <p>출처 확인 시 기록한 주의사항 · 강사 미검토: {reference.safetyNote}</p>
      )}
      <p>{reference.rightsNote}</p>
      {reference.relatedLinks.map((link) => (
        <p key={link.url}>
          <a href={link.url} target="_blank" rel="noopener noreferrer">
            {link.label} <ExternalLink size={11} />
          </a>
          <small>{link.note}</small>
        </p>
      ))}
      <small>
        확인일 {reference.verifiedAt} · 원본 링크 전용 · 영상 전체 검수 전 · 자동 추천 제외
      </small>
    </details>
    <a
      className="verified-reference-open"
      href={reference.url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {reference.scope === 'series' ? '시리즈 원본 보기' : '원본 자료 보기'}
      <ExternalLink size={13} />
    </a>
    <button
      type="button"
      className="btn-secondary verified-reference-create-note"
      onClick={() => onCreateNote(reference)}
      aria-label={`${reference.title} 자료로 내 계획 노트 작성`}
    >
      <FileText size={15} /> 이 자료로 내 계획 노트 작성
    </button>
  </article>
);

const VerifiedReferencesSection: React.FC<{
  onCreateNote: (reference: VerifiedPublicReference) => void;
}> = ({ onCreateNote }) => {
  const { ownedEquipment, ownedProps } = usePilatesStore();
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState<'all' | 'kr' | 'global'>('all');
  const [equipment, setEquipment] = useState<string[]>([]);
  const [props, setProps] = useState<PropType[]>([]);
  const [duration, setDuration] = useState('all');
  const [level, setLevel] = useState('all');
  const [bodyFocus, setBodyFocus] = useState('all');
  const [language, setLanguage] = useState('all');
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [verification, setVerification] = useState('all');
  const [sourceVisible, setSourceVisible] = useState({
    signature: '',
    limit: 6,
  });
  const reset = () => {
    setSearch('');
    setRegion('all');
    setEquipment([]);
    setProps([]);
    setDuration('all');
    setLevel('all');
    setBodyFocus('all');
    setLanguage('all');
    setOwnedOnly(false);
    setVerification('all');
    setSourceVisible({ signature: '', limit: 6 });
  };
  const sourceLevels = [
    ...new Set(
      VERIFIED_REFERENCES.flatMap((reference) =>
        reference.levelLabel ? [reference.levelLabel] : [],
      ),
    ),
  ].sort();
  const sourceBodies = [
    ...new Set(VERIFIED_REFERENCES.flatMap((reference) => reference.bodyFocus)),
  ].sort();
  const sourceLanguages = [
    ...new Set(
      VERIFIED_REFERENCES.flatMap((reference) => (reference.language ? [reference.language] : [])),
    ),
  ].sort();
  const filterCount =
    equipment.length +
    props.length +
    [duration, level, bodyFocus, language, verification].filter((item) => item !== 'all').length +
    Number(ownedOnly) +
    Number(region !== 'all') +
    Number(Boolean(search.trim()));
  const references = VERIFIED_REFERENCES.filter((reference) => {
    if (region !== 'all' && reference.region !== region) return false;
    if (verification === 'official' && reference.region !== 'global') return false;
    if (verification === 'partial' && reference.verificationStatus !== 'partial-playback-checked')
      return false;
    if (verification === 'candidate' && reference.verificationStatus !== 'korean-candidate')
      return false;
    if (
      !matchesLibraryEquipment(reference, {
        equipment,
        props,
        ownedOnly,
        ownedEquipment,
        ownedProps,
      })
    )
      return false;
    if (duration === 'unknown' && reference.videoDurationSeconds !== null) return false;
    if (!['all', 'unknown'].includes(duration)) {
      if (reference.videoDurationSeconds === null) return false;
      if (duration === 'short' && reference.videoDurationSeconds > 1200) return false;
      if (
        duration === 'medium' &&
        (reference.videoDurationSeconds <= 1200 || reference.videoDurationSeconds > 2700)
      )
        return false;
      if (duration === 'long' && reference.videoDurationSeconds <= 2700) return false;
    }
    if (level === 'unknown' && reference.levelLabel !== null) return false;
    if (!['all', 'unknown'].includes(level) && reference.levelLabel !== level) return false;
    if (bodyFocus === 'unknown' && reference.bodyFocus.length > 0) return false;
    if (!['all', 'unknown'].includes(bodyFocus) && !reference.bodyFocus.includes(bodyFocus))
      return false;
    if (language !== 'all' && reference.language !== language) return false;
    const fields = [
      reference.id,
      reference.title,
      reference.originalTitle || '',
      reference.sourceName,
      reference.language,
      reference.levelLabel || '',
      ...reference.bodyFocus,
      ...reference.requiredEquipment,
      ...reference.requiredEquipment.map(equipmentLabel),
      ...reference.requiredProps,
      ...reference.requiredProps.map(propLabel),
    ];
    return matchesDiscoverySearch(fields, search);
  }).sort((a, b) => Number(a.region !== 'kr') - Number(b.region !== 'kr'));
  const sourceSignature = JSON.stringify({
    search,
    region,
    equipment,
    props,
    duration,
    level,
    bodyFocus,
    language,
    ownedOnly,
    verification,
    ownedEquipment,
    ownedProps,
  });
  const sourceVisibleCount = sourceVisible.signature === sourceSignature ? sourceVisible.limit : 6;
  if (VERIFIED_REFERENCES.length === 0) return null;
  return (
    <section className="verified-reference-section" aria-labelledby="verified-reference-heading">
      <header className="verified-reference-header">
        <div>
          <span className="eyebrow">PUBLIC SOURCE COLLECTION</span>
          <h2 id="verified-reference-heading">
            공개 참고 자료와 국내 후보 <span>{VERIFIED_REFERENCES.length}</span>
          </h2>
          <p>
            해외 동작 참조 {SOURCE_CATALOG_SUMMARY.overseasMovementReferences}건 · 시리즈{' '}
            {SOURCE_CATALOG_SUMMARY.overseasSeriesReferences}건 · 국내 후보{' '}
            {SOURCE_CATALOG_SUMMARY.koreanCandidates}건
          </p>
        </div>
        <span className="verified-reference-use">
          <ExternalLink size={13} /> 원문 링크로 참조
        </span>
      </header>
      <p className="verified-reference-disclaimer">
        <Info size={14} />
        공식 출처 확인과 운동 검수는 다릅니다. 전체 영상 검수 0건, 전문 강사 승인 0건이며 모든 참고
        자료는 자동 추천에서 제외합니다.
      </p>
      <div className="verified-reference-summary">
        <span>공식 출처 확인 21</span>
        <span>부분 관찰 동작 3 · 영상 2</span>
        <span>국내 후보 9</span>
        <span>전문가 승인 0</span>
      </div>
      <details className="source-review-queue">
        <summary>
          <span>전문가 검수 대기 30건</span>
          <ChevronDown size={14} />
        </summary>
        <p>
          원본 재생, 기구·소도구, 난이도와 주의 사항을 강사가 검토한 후 직접 기록하세요. 국내 후보의
          부위는 이름에 따른 미검토 태그입니다. 시리즈는 개별 동작으로 자동 편성하지 않습니다.
        </p>
        <a href={reviewQueueCsvUrl} download="pilates-source-review-queue.csv">
          <FileText size={14} /> 검수 대기표 받기 (CSV)
        </a>
      </details>
      <div className="verified-reference-controls">
        <label className="verified-reference-search">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">공개 참고 자료 검색</span>
          <input
            type="search"
            aria-label="공개 참고 자료 검색"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="채널·영상·기구·부위 검색"
          />
          {search && (
            <PfButton
              variant="icon"
              onClick={() => setSearch('')}
              aria-label="공개 자료 검색어 지우기"
            >
              <X size={14} />
            </PfButton>
          )}
        </label>
        <div className="verified-reference-regions" role="group" aria-label="공개 참고 자료 지역">
          {(
            [
              { key: 'all', label: '전체' },
              { key: 'kr', label: '국내' },
              { key: 'global', label: '해외' },
            ] as const
          ).map((option) => (
            <button
              type="button"
              key={option.key}
              aria-pressed={region === option.key}
              className={region === option.key ? 'selected' : ''}
              onClick={() => setRegion(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <details className="verified-reference-filter-details">
        <summary>
          <span>
            <SlidersHorizontal size={14} /> 기구·소도구·시간·난이도·부위·언어 필터
            {filterCount > 0 && <b>{filterCount}</b>}
          </span>
          <ChevronDown size={14} />
        </summary>
        <RequirementFilters
          equipment={equipment}
          props={props}
          onEquipmentChange={setEquipment}
          onPropsChange={setProps}
        />
        <div className="verified-reference-selects">
          <label className="form-field">
            <span>원본 영상 길이 · 수업 시간과 별개</span>
            <select value={duration} onChange={(event) => setDuration(event.target.value)}>
              <option value="all">전체 원본 길이</option>
              <option value="short">20분 이하</option>
              <option value="medium">20분 초과–45분</option>
              <option value="long">45분 초과</option>
              <option value="unknown">길이 미확인</option>
            </select>
          </label>
          <label className="form-field">
            <span>출처가 표기한 난이도</span>
            <select value={level} onChange={(event) => setLevel(event.target.value)}>
              <option value="all">전체 난이도</option>
              {sourceLevels.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
              <option value="unknown">난이도 미표기</option>
            </select>
          </label>
          <label className="form-field">
            <span>부위 · 국내 후보는 임시 태그</span>
            <select value={bodyFocus} onChange={(event) => setBodyFocus(event.target.value)}>
              <option value="all">전체 집중 부위</option>
              {sourceBodies.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
              <option value="unknown">부위 미확인</option>
            </select>
          </label>
          <label className="form-field">
            <span>언어</span>
            <select value={language} onChange={(event) => setLanguage(event.target.value)}>
              <option value="all">전체 언어</option>
              {sourceLanguages.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>확인 범위</span>
            <select value={verification} onChange={(event) => setVerification(event.target.value)}>
              <option value="all">전체 확인 상태</option>
              <option value="official">공식 출처 확인 · 21건</option>
              <option value="partial">영상 부분 확인 · 3건</option>
              <option value="candidate">국내 후보 · 9건</option>
            </select>
          </label>
        </div>
      </details>
      <div className="verified-reference-result-row">
        <label>
          <input
            type="checkbox"
            checked={ownedOnly}
            onChange={(event) => setOwnedOnly(event.target.checked)}
          />{' '}
          내 보유 기구·소도구로 모두 가능한 자료만
        </label>
        <p>
          <strong>{references.length}</strong> / {VERIFIED_REFERENCES.length}개 출처
        </p>
        {filterCount > 0 && (
          <button type="button" className="btn-ghost" onClick={reset}>
            조건 초기화 <X size={12} />
          </button>
        )}
      </div>
      {ownedOnly && (
        <p className="verified-reference-owned-note">
          요구 조건이 미확인인 자료는 제외합니다. ‘내 보유 장비 설정’에서 기구와 소도구를 추가할 수
          있어요.
        </p>
      )}
      <div className="verified-reference-grid">
        {references.slice(0, sourceVisibleCount).map((reference) => (
          <VerifiedReferenceCard
            reference={reference}
            key={reference.id}
            onCreateNote={onCreateNote}
          />
        ))}
      </div>
      {references.length > sourceVisibleCount && (
        <div className="library-load-more">
          <p>
            {Math.min(sourceVisibleCount, references.length)} / {references.length}개 참고 자료
          </p>
          <button
            type="button"
            className="btn-secondary"
            onClick={() =>
              setSourceVisible({
                signature: sourceSignature,
                limit: sourceVisibleCount + 6,
              })
            }
          >
            공개 자료 더 보기 <Plus size={14} />
          </button>
        </div>
      )}
      {references.length === 0 && (
        <div className="verified-reference-empty" role="status" aria-live="polite">
          <Search size={22} aria-hidden="true" />
          <p>조건에 맞는 공개 참고 자료가 없어요.</p>
          <div className="verified-reference-empty-actions">
            {search.trim() && (
              <button type="button" className="btn-secondary" onClick={() => setSearch('')}>
                검색어 지우기
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={reset}>
              전체 참고 자료 보기
            </button>
          </div>
        </div>
      )}
      <p className="verified-reference-footer">
        해외 공식 원문 16개에서 참조 21건을 기록했습니다. 국내 후보 9건의 영상·언어·동작 품질은
        미확인입니다. 관찰 시점은 정확한 동작 구간이 아니며 다른 영상에 옮기지 않습니다.
      </p>
    </section>
  );
};

export const ExerciseAtlasView: React.FC<ExerciseAtlasViewProps> = ({
  onOpenYouTubePreview,
  onOpenIdeaSheet,
  onOpenClipper,
  onOpenStudy,
  onOpenMotionDrafts,
}) => {
  const {
    exercises,
    ownedEquipment,
    ownedProps,
    classGroups,
    historyLogs,
    activeTargetGroupId,
    setActiveTargetGroupId,
    appendExerciseToSequence,
    setExerciseFavoriteTag,
    activeSteps,
    setActiveTab,
  } = usePilatesStore();
  const [collection, setCollection] = useState<'notes' | 'references' | 'courses'>('notes');
  const [sourceToPlan, setSourceToPlan] = useState<VerifiedPublicReference | null>(null);
  const [ownNoteOpen, setOwnNoteOpen] = useState(false);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [notesVisible, setNotesVisible] = useState({
    signature: '',
    limit: 12,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast] = useState<{ success: boolean; message: string } | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [brokenPhotoIds, setBrokenPhotoIds] = useState<Record<string, boolean>>({});
  const [previewReference, setPreviewReference] = useState<MotionPatternReference | null>(null);
  const [patternPage, setPatternPage] = useState(0);
  const [inspectedExerciseId, setInspectedExerciseId] = useState<string | null>(null);
  const inspectedExercise =
    exercises.find((exercise) => exercise.id === inspectedExerciseId) ?? null;
  const inspectorHeading = useRef<HTMLHeadingElement>(null);
  const inspectorTrigger = useRef<HTMLButtonElement | null>(null);
  const inspectExercise = (exercise: PilatesExercise, trigger: HTMLButtonElement) => {
    inspectorTrigger.current = trigger;
    setInspectedExerciseId(exercise.id);
    requestAnimationFrame(() => {
      inspectorHeading.current?.focus({ preventScroll: true });
      inspectorHeading.current?.scrollIntoView?.({ behavior: 'instant', block: 'nearest' });
    });
  };
  const closeInspector = () => {
    setInspectedExerciseId(null);
    requestAnimationFrame(() => {
      const trigger = inspectorTrigger.current;
      if (trigger?.isConnected) trigger.focus();
      else searchInput.current?.focus();
    });
  };
  const previewHeading = useRef<HTMLHeadingElement>(null);
  const cardGridRef = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const previewTrigger = useRef<HTMLButtonElement | null>(null);
  const focusSearch = () => requestAnimationFrame(() => searchInput.current?.focus());
  const resetFilters = () => {
    setFilters({ ...INITIAL_FILTERS });
    focusSearch();
  };
  const clearSearch = () => {
    update('search', '');
    focusSearch();
  };
  const closePatternPreview = () => {
    setPreviewReference(null);
    requestAnimationFrame(() => {
      const trigger = previewTrigger.current;
      if (trigger?.isConnected && !trigger.closest('details:not([open])')) {
        trigger.focus({ preventScroll: true });
        trigger.scrollIntoView?.({ behavior: 'instant', block: 'nearest' });
      } else {
        searchInput.current?.focus();
      }
    });
  };
  const selectedCount = activeSteps.filter((step) => !isRestStep(step)).length;
  const openPatternPreview = (reference: MotionPatternReference, trigger: HTMLButtonElement) => {
    previewTrigger.current = trigger;
    setPreviewReference(reference);
    requestAnimationFrame(() => {
      previewHeading.current?.focus();
      previewHeading.current?.scrollIntoView?.({ behavior: 'instant', block: 'nearest' });
    });
  };
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const recent = useMemo(
    () => getRecentlyTaughtExerciseIds(historyLogs, 10, activeTargetGroupId),
    [historyLogs, activeTargetGroupId],
  );
  const update = <K extends keyof typeof INITIAL_FILTERS>(
    key: K,
    value: (typeof INITIAL_FILTERS)[K],
  ) => setFilters((previous) => ({ ...previous, [key]: value }));
  const filtered = useMemo(() => {
    return exercises.filter((exercise) => {
      const equipmentMeta = getExerciseEquipment(exercise);
      if (
        !matchesLibraryEquipment(equipmentMeta, {
          equipment: filters.equipment,
          props: filters.props,
          ownedOnly: filters.owned,
          ownedEquipment,
          ownedProps,
        })
      )
        return false;
      const patterns = getMotionPatternReferences(exercise.id);
      const hasProposal = patterns.length > 0;
      if (filters.motionDraft === 'proposal' && !hasProposal) return false;
      if (filters.motionDraft === 'none' && hasProposal) return false;
      if (filters.block !== 'all' && exercise.blockCategory !== filters.block) return false;
      if (filters.position !== 'all' && exercise.bodyPosition !== filters.position) return false;
      if (filters.level !== 'all' && exercise.level !== filters.level) return false;
      if (filters.review !== 'all' && getExerciseReviewState(exercise) !== filters.review)
        return false;
      if (filters.favorite === 'saved' && exercise.favoriteTag === 'none') return false;
      if (!['all', 'saved'].includes(filters.favorite) && exercise.favoriteTag !== filters.favorite)
        return false;
      if (filters.hideRecent && recent.has(exercise.id)) return false;
      if (filters.duration === 'short' && exercise.defaultDurationMin > 3) return false;
      if (
        filters.duration === 'medium' &&
        (exercise.defaultDurationMin <= 3 || exercise.defaultDurationMin > 5)
      )
        return false;
      if (filters.duration === 'long' && exercise.defaultDurationMin <= 5) return false;
      const blockMeta = CANONICAL_BLOCKS.find((item) => item.category === exercise.blockCategory);
      const ideaDraft = isMovementIdeaExercise(exercise) ? readMovementIdeaDraft(exercise) : null;
      const fields = [
        exercise.id,
        exercise.nameKo,
        exercise.nameEn,
        APPARATUS_LABELS[exercise.apparatus].ko,
        APPARATUS_LABELS[exercise.apparatus].short,
        POSITION_LABELS[exercise.bodyPosition].ko,
        LEVEL_NAMES[exercise.level],
        `Lv ${exercise.level}`,
        blockMeta?.nameKo ?? '',
        blockMeta?.nameEn ?? '',
        exercise.favoriteTag !== 'none' ? FAVORITE_TAG_META[exercise.favoriteTag].label : '',
        ...equipmentMeta.requiredEquipment.map(equipmentLabel),
        ...equipmentMeta.requiredProps.map(propLabel),
        ...exercise.targetMuscles,
        ...exercise.cues,
        exercise.precautions ?? '',
        ideaDraft?.ideaLine ?? '',
        ideaDraft?.subjectiveFeeling ?? '',
        ideaDraft?.adjustmentNote ?? '',
        exercise.youtube.channelName,
        exercise.sourceReference?.title ?? '',
        exercise.sourceReference?.publisher ?? '',
        ...patterns.flatMap((pattern) => [pattern.title, pattern.variant, pattern.context]),
      ];
      return matchesDiscoverySearch(fields, filters.search);
    });
  }, [exercises, filters, ownedEquipment, ownedProps, recent]);
  const notesSignature = JSON.stringify({
    filters,
    ownedEquipment,
    ownedProps,
  });
  const notesVisibleCount = notesVisible.signature === notesSignature ? notesVisible.limit : 12;
  const activeFilterCount = Object.entries(filters).reduce(
    (total, [key, value]) =>
      total +
      (key === 'search'
        ? 0
        : Array.isArray(value)
          ? value.length
          : value !== 'all' && value !== false
            ? 1
            : 0),
    0,
  );
  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string; onClear: () => void }[] = [];
    if (filters.search.trim()) {
      chips.push({
        key: 'search',
        label: `검색: ${filters.search.trim()}`,
        onClear: () => update('search', ''),
      });
    }
    filters.equipment.forEach((eqId) => {
      chips.push({
        key: `eq-${eqId}`,
        label: `기구: ${equipmentLabel(eqId)}`,
        onClear: () => update('equipment', toggleSelection(filters.equipment, eqId)),
      });
    });
    filters.props.forEach((propId) => {
      chips.push({
        key: `prop-${propId}`,
        label: `소도구: ${propLabel(propId)}`,
        onClear: () => update('props', toggleSelection(filters.props, propId)),
      });
    });
    if (filters.block !== 'all') {
      const blockName =
        CANONICAL_BLOCKS.find((item) => item.category === filters.block)?.nameKo ?? filters.block;
      chips.push({
        key: 'block',
        label: `구간: ${blockName}`,
        onClear: () => update('block', 'all'),
      });
    }
    if (filters.position !== 'all') {
      chips.push({
        key: 'position',
        label: `자세: ${POSITION_LABELS[filters.position as BodyPosition].ko}`,
        onClear: () => update('position', 'all'),
      });
    }
    if (filters.level !== 'all') {
      chips.push({
        key: 'level',
        label: `난이도: ${LEVEL_NAMES[filters.level as DifficultyLevel]}`,
        onClear: () => update('level', 'all'),
      });
    }
    if (filters.duration !== 'all') {
      const durationLabel =
        filters.duration === 'short'
          ? '3분 이하'
          : filters.duration === 'medium'
            ? '3~5분'
            : '5분 초과';
      chips.push({
        key: 'duration',
        label: `시간: ${durationLabel}`,
        onClear: () => update('duration', 'all'),
      });
    }
    if (filters.review !== 'all') {
      const reviewLabel =
        filters.review === 'approved'
          ? '검토 완료'
          : filters.review === 'pending'
            ? '검토 전'
            : '재검토 필요';
      chips.push({
        key: 'review',
        label: `검토: ${reviewLabel}`,
        onClear: () => update('review', 'all'),
      });
    }
    if (filters.motionDraft !== 'all') {
      chips.push({
        key: 'motionDraft',
        label: filters.motionDraft === 'proposal' ? '도해 초안 있음' : '도해 초안 없음',
        onClear: () => update('motionDraft', 'all'),
      });
    }
    if (filters.favorite !== 'all') {
      const favLabel =
        filters.favorite === 'saved'
          ? '저장됨'
          : (FAVORITE_TAG_META[filters.favorite as FavoriteTag]?.label ?? filters.favorite);
      chips.push({
        key: 'favorite',
        label: `즐겨찾기: ${favLabel}`,
        onClear: () => update('favorite', 'all'),
      });
    }
    if (filters.owned) {
      chips.push({
        key: 'owned',
        label: '내 보유 장비만',
        onClear: () => update('owned', false),
      });
    }
    if (filters.hideRecent) {
      chips.push({
        key: 'hideRecent',
        label: '최근 10일 제외',
        onClear: () => update('hideRecent', false),
      });
    }
    return chips;
  }, [filters]);
  const addExercise = (exercise: PilatesExercise) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setAddedId(null);
    setToast(null);
    if (isMovementIdeaExercise(exercise)) {
      const result = addMovementIdeaToCurrentClass(exercise.id);
      setToast({ success: result.ok, message: result.message });
      if (!result.ok) return;
      setAddedId(exercise.id);
      timer.current = setTimeout(() => {
        timer.current = null;
        setToast(null);
        setAddedId(null);
      }, 2600);
      return;
    }
    const before = usePilatesStore.getState().activeSteps.length;
    appendExerciseToSequence(exercise.id, exercise.blockCategory);
    const after = usePilatesStore.getState();
    const success =
      after.activeSteps.length === before + 1 &&
      after.activeSteps.at(-1)?.exerciseId === exercise.id;
    setToast({
      success,
      message: success
        ? `${exercise.nameKo} · 현재 수업안에 추가했어요.`
        : after.generationError || '현재 수업 조건을 확인한 뒤 다시 추가해 주세요.',
    });
    if (!success) return;
    setAddedId(exercise.id);
    timer.current = setTimeout(() => {
      timer.current = null;
      setToast(null);
      setAddedId(null);
    }, 2600);
  };

  return (
    <div className="movement-library motion-library" data-filters-expanded={showFilters}>
      <header className="library-heading">
        <div>
          <span className="eyebrow">MOVEMENT LIBRARY</span>
          <h1 id="workspace-main-heading" tabIndex={-1}>
            동작 라이브러리
          </h1>
          <p className="muted">수업에 활용할 동작을 탐색하고, 수업안에 추가하세요.</p>
        </div>
        <div className="library-heading-actions">
          {onOpenIdeaSheet && (
            <PfButton variant="secondary" onClick={() => onOpenIdeaSheet(null)}>
              <Plus size={16} /> 한 줄 동작 메모
            </PfButton>
          )}
          <PfButton variant="primary" onClick={() => setOwnNoteOpen(true)}>
            <Plus size={17} /> 내 동작 직접 등록
          </PfButton>
          <PfButton variant="secondary" onClick={onOpenClipper}>
            <Youtube size={16} /> 유튜브 참조 추가
          </PfButton>
        </div>
      </header>

      <details className="library-asset-status">
        <summary>
          <span>도해 초안 {MOTION_PATTERN_REFERENCES.length}개</span>
          <span className="library-asset-status-warning">전문가 미검토</span>
          <ChevronDown size={16} aria-hidden="true" />
        </summary>
        <div className="ml-inventory" aria-label="모션 자산 현황">
          <p>
            <strong>{MOTION_PATTERN_REFERENCES.length}</strong>
            <span>직접 제작한 도해 초안</span>
          </p>
          <p>
            <strong>0</strong>
            <span>정확히 일치하는 모션</span>
          </p>
          <p>
            <strong>0</strong>
            <span>전문가 검토 완료</span>
          </p>
        </div>
      </details>
      <p className="library-asset-status-note">관련 패턴 참고용 · 검증된 운동 시범이 아닙니다.</p>
      <div
        className="library-collection-tabs"
        role="tablist"
        aria-label="자료 모음"
        onKeyDown={(event) => {
          if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            const collections = ['notes', 'references', 'courses'] as const;
            const index = collections.indexOf(collection);
            const next =
              event.key === 'Home'
                ? collections[0]
                : event.key === 'End'
                  ? collections[2]
                  : collections[
                      (index + (event.key === 'ArrowRight' ? 1 : 2)) % collections.length
                    ];
            setCollection(next);
            document.getElementById(`library-${next}-tab`)?.focus();
          }
        }}
      >
        <button
          type="button"
          role="tab"
          id="library-notes-tab"
          aria-controls="library-notes-panel"
          aria-selected={collection === 'notes'}
          tabIndex={collection === 'notes' ? 0 : -1}
          className={collection === 'notes' ? 'selected' : ''}
          onClick={() => setCollection('notes')}
        >
          동작 노트 <span>{exercises.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          id="library-references-tab"
          aria-controls="library-references-panel"
          aria-selected={collection === 'references'}
          tabIndex={collection === 'references' ? 0 : -1}
          className={collection === 'references' ? 'selected' : ''}
          onClick={() => setCollection('references')}
        >
          공개 자료 <span>{VERIFIED_REFERENCES.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          id="library-courses-tab"
          aria-controls="library-courses-panel"
          aria-selected={collection === 'courses'}
          tabIndex={collection === 'courses' ? 0 : -1}
          className={collection === 'courses' ? 'selected' : ''}
          onClick={() => setCollection('courses')}
        >
          수업 영상 <span>{COURSE_REFERENCES.length}</span>
        </button>
      </div>
      {collection !== 'notes' && (
        <p className="library-collection-trust">
          공식 출처 확인 21건 · 국내 후보 9건 · 전문 강사 승인 0건 · 공개 자료는 자동 추천 제외
        </p>
      )}
      {collection === 'courses' ? (
        <div id="library-courses-panel" role="tabpanel" aria-labelledby="library-courses-tab">
          <CourseReferenceBrowser />
        </div>
      ) : collection === 'references' ? (
        <div id="library-references-panel" role="tabpanel" aria-labelledby="library-references-tab">
          <VerifiedReferencesSection onCreateNote={setSourceToPlan} />
        </div>
      ) : (
        <div id="library-notes-panel" role="tabpanel" aria-labelledby="library-notes-tab">
          <section className="library-tools panel" aria-label="동작 검색과 필터">
            <div className="library-search-row">
              <label className="library-search">
                <Search size={19} aria-hidden="true" />
                <span className="sr-only">동작 검색</span>
                <input
                  ref={searchInput}
                  type="search"
                  aria-label="동작 검색"
                  value={filters.search}
                  onChange={(event) => update('search', event.target.value)}
                  placeholder="한글·영문 이름, 부위·기구·소도구로 검색"
                />
                {filters.search && (
                  <PfButton variant="icon" onClick={clearSearch} aria-label="검색어 지우기">
                    <X size={15} />
                  </PfButton>
                )}
              </label>
              <PfButton
                variant="secondary"
                className={`library-filter-button ${showFilters ? 'is-active' : ''}`}
                onClick={() => setShowFilters(!showFilters)}
                aria-expanded={showFilters}
                aria-controls="library-filters"
              >
                <SlidersHorizontal size={16} /> 필터{' '}
                {activeFilterCount > 0 && (
                  <span className="library-count">{activeFilterCount}</span>
                )}
                <ChevronDown size={14} />
              </PfButton>
            </div>
            <div className="library-apparatus-tabs" role="group" aria-label="기구 선택">
              <button
                type="button"
                className={filters.equipment.length === 0 ? 'selected' : ''}
                aria-pressed={filters.equipment.length === 0}
                onClick={() => update('equipment', [])}
              >
                전체 기구 <span>{exercises.length}</span>
              </button>
              {EQUIPMENT_OPTIONS.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={filters.equipment.includes(item.id) ? 'selected' : ''}
                  aria-pressed={filters.equipment.includes(item.id)}
                  onClick={() => update('equipment', toggleSelection(filters.equipment, item.id))}
                >
                  {item.labelKo}
                </button>
              ))}
              <button
                type="button"
                className={`library-favorite-tab ${filters.favorite === 'saved' ? 'selected' : ''}`}
                aria-pressed={filters.favorite === 'saved'}
                onClick={() => update('favorite', filters.favorite === 'saved' ? 'all' : 'saved')}
              >
                <Heart size={14} fill={filters.favorite === 'saved' ? 'currentColor' : 'none'} />{' '}
                즐겨찾기
              </button>
            </div>
            {activeFilterChips.length > 0 && (
              <div className="library-active-filters" role="group" aria-label="적용된 검색·필터">
                {activeFilterChips.map((chip) => (
                  <button
                    type="button"
                    key={chip.key}
                    className="library-active-filter-chip"
                    onClick={() => {
                      chip.onClear();
                      focusSearch();
                    }}
                    aria-label={`${chip.label} 필터 해제`}
                  >
                    <span>{chip.label}</span>
                    <X size={12} aria-hidden="true" />
                  </button>
                ))}
              </div>
            )}
            {showFilters && (
              <p className="library-filter-explanation">
                기구는 여러 개 선택할 수 있어요. 선택 기구 중 하나와 일치하는 동작을 찾으며, ‘내
                보유 장비만’은 모든 요구 조건을 확인합니다.
              </p>
            )}
            {showFilters && (
              <div id="library-filters" className="library-expanded-filters">
                <label className="form-field">
                  <span>동작 부위·구간</span>
                  <select
                    value={filters.block}
                    onChange={(event) => update('block', event.target.value as ClassBlockCategory)}
                  >
                    <option value="all">전체 부위·구간</option>
                    {CANONICAL_BLOCKS.map((block) => (
                      <option key={block.category} value={block.category}>
                        {block.nameKo}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>몸의 자세</span>
                  <select
                    value={filters.position}
                    onChange={(event) => update('position', event.target.value as BodyPosition)}
                  >
                    <option value="all">전체 자세</option>
                    {Object.entries(POSITION_LABELS).map(([key, meta]) => (
                      <option key={key} value={key}>
                        {meta.ko}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>난이도</span>
                  <select
                    value={filters.level}
                    onChange={(event) => update('level', event.target.value as DifficultyLevel)}
                  >
                    <option value="all">전체 난이도</option>
                    <option value="1.0">기초 · Lv 1.0</option>
                    <option value="1.5">중급 · Lv 1.5</option>
                    <option value="2.0">심화 · Lv 2.0</option>
                  </select>
                </label>
                <label className="form-field">
                  <span>계획 시간</span>
                  <select
                    value={filters.duration}
                    onChange={(event) => update('duration', event.target.value)}
                  >
                    <option value="all">전체 시간</option>
                    <option value="short">3분 이하</option>
                    <option value="medium">3분 초과~5분</option>
                    <option value="long">5분 초과</option>
                  </select>
                </label>
                <label className="form-field">
                  <span>내 강사 검토 상태</span>
                  <select
                    value={filters.review}
                    onChange={(event) => update('review', event.target.value)}
                  >
                    <option value="all">전체 검토 상태</option>
                    <option value="approved">내 검토 기록 있음 · 자격 인증 미확인</option>
                    <option value="pending">검토 전 · 사용 금지</option>
                    <option value="stale">정보 변경 · 재검토 필요</option>
                  </select>
                </label>
                <label className="form-field">
                  <span>모션 제작 초안</span>
                  <select
                    value={filters.motionDraft}
                    onChange={(event) => update('motionDraft', event.target.value)}
                  >
                    <option value="all">전체 제작 상태</option>
                    <option value="proposal">관련 제작 초안 있음 · 정식 미연결</option>
                    <option value="none">관련 제작 초안 없음</option>
                  </select>
                </label>
                <fieldset className="library-note-props">
                  <legend>소도구 · 여러 개 선택</legend>
                  <div className="library-multi-chips">
                    {PROP_OPTIONS.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        aria-pressed={filters.props.includes(item.id)}
                        className={filters.props.includes(item.id) ? 'selected' : ''}
                        onClick={() => update('props', toggleSelection(filters.props, item.id))}
                      >
                        {item.labelKo}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label className="form-field">
                  <span>즐겨찾기 분류</span>
                  <select
                    value={filters.favorite}
                    onChange={(event) => update('favorite', event.target.value)}
                  >
                    <option value="all">전체</option>
                    <option value="saved">즐겨찾기 전체</option>
                    {(
                      Object.entries(FAVORITE_TAG_META) as [
                        FavoriteTag,
                        (typeof FAVORITE_TAG_META)[FavoriteTag],
                      ][]
                    )
                      .filter(([key]) => key !== 'none')
                      .map(([key, meta]) => (
                        <option key={key} value={key}>
                          {meta.label}
                        </option>
                      ))}
                  </select>
                </label>
                <div className="library-check-filters">
                  <label>
                    <input
                      type="checkbox"
                      checked={filters.owned}
                      onChange={(event) => update('owned', event.target.checked)}
                    />
                    내 보유 기구·소도구로 모두 가능한 동작만
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={filters.hideRecent}
                      onChange={(event) => update('hideRecent', event.target.checked)}
                    />
                    최근 10일 수업 동작 숨기기
                  </label>
                </div>
                <label className="form-field library-group-filter">
                  <span>최근 수업 기준</span>
                  <select
                    value={activeTargetGroupId}
                    onChange={(event) => setActiveTargetGroupId(event.target.value)}
                  >
                    <option value="all">전체 반</option>
                    {classGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </section>

          <div className="library-notes-workspace" data-has-inspector={Boolean(inspectedExercise)}>
            <LibraryMovementInspector
              exercise={inspectedExercise}
              headingRef={inspectorHeading}
              isInResults={Boolean(
                inspectedExercise && filtered.some((item) => item.id === inspectedExercise.id),
              )}
              onClose={closeInspector}
              onOpenDetails={(exercise) =>
                isMovementIdeaExercise(exercise) && onOpenIdeaSheet
                  ? onOpenIdeaSheet(exercise)
                  : onOpenYouTubePreview(exercise)
              }
              onAdd={addExercise}
              addedId={addedId}
            />
            <div className="library-notes-results">
              <div className="library-results-bar">
                <p role="status" aria-live="polite">
                  <strong>{filtered.length}</strong>개의 동작{' '}
                  <span className="muted">· 작은 선택이 좋은 수업을 만듭니다</span>
                </p>
                {(activeFilterCount > 0 || filters.search) && (
                  <PfButton variant="ghost" onClick={resetFilters}>
                    필터 초기화 <X size={13} />
                  </PfButton>
                )}
              </div>
              <p className="ml-review-note">
                동작을 바로 추가하고 순서를 바꾸세요. 검토 기록은 선택 사항입니다.
              </p>
              {filtered.length > 0 ? (
                <div className="movement-card-grid" ref={cardGridRef}>
                  {filtered.slice(0, notesVisibleCount).map((exercise) => {
                    const provenance = getMovementProvenance(exercise);
                    const reviewState = getExerciseReviewState(exercise);
                    const approved = isExerciseAutoEligible(exercise);
                    const isIdea = isMovementIdeaExercise(exercise);
                    const ideaMeta = isIdea ? readMovementIdeaDraft(exercise) : null;
                    const patterns = getMotionPatternReferences(exercise.id);
                    const isFavorite = exercise.favoriteTag !== 'none';
                    const inSequence = activeSteps.some(
                      (step) => !isRestStep(step) && step.exerciseId === exercise.id,
                    );
                    const equipmentMeta = getExerciseEquipment(exercise);
                    const hasValidIdeaPhoto = Boolean(
                      ideaMeta?.photoDataUrl && !brokenPhotoIds[exercise.id],
                    );
                    const lastTaught = getExerciseLastTaughtInfo(
                      exercise.id,
                      historyLogs,
                      activeTargetGroupId,
                    );
                    return (
                      <PfMovementCard
                        variant={isIdea ? 'idea' : 'catalog'}
                        selected={inSequence}
                        className={`movement-card movement-${exercise.apparatus} ${
                          inSequence ? 'is-in-sequence' : ''
                        } ${inspectedExerciseId === exercise.id ? 'is-inspected' : ''}`.trim()}
                        key={exercise.id}
                      >
                        <div className="movement-card-art">
                          <button
                            type="button"
                            className="movement-art-trigger"
                            aria-label={
                              patterns[0]
                                ? `${exercise.nameKo} 관련 패턴 도해 보기`
                                : `${exercise.nameKo} 상세 보기`
                            }
                            onClick={(event) =>
                              patterns[0]
                                ? openPatternPreview(patterns[0], event.currentTarget)
                                : onOpenYouTubePreview(exercise)
                            }
                            aria-describedby={`motion-caption-${exercise.id}`}
                          >
                            {patterns[0] ? (
                              <MotionPatternThumbnail reference={patterns[0]} />
                            ) : hasValidIdeaPhoto && ideaMeta?.photoDataUrl ? (
                              <img
                                src={ideaMeta.photoDataUrl}
                                alt=""
                                aria-hidden="true"
                                className="movement-idea-photo"
                                loading="lazy"
                                onError={() =>
                                  setBrokenPhotoIds((previous) => ({
                                    ...previous,
                                    [exercise.id]: true,
                                  }))
                                }
                              />
                            ) : (
                              <div
                                className={`ml-unmapped-art ml-unmapped-art--${exercise.apparatus}`}
                                aria-hidden="true"
                              >
                                <span className="ml-unmapped-meta">
                                  {APPARATUS_LABELS[exercise.apparatus].ko} ·{' '}
                                  {POSITION_LABELS[exercise.bodyPosition].ko}
                                </span>
                                <span>움직임을 기록할 자리</span>
                                <i />
                                <span className="ml-unmapped-focus">
                                  {exercise.targetMuscles.slice(0, 2).join(' · ') || '호흡 · 정렬'}
                                </span>
                                <span>MOTION STUDY PENDING</span>
                              </div>
                            )}
                            <span className="art-caption" id={`motion-caption-${exercise.id}`}>
                              {patterns[0]
                                ? `${patterns[0].title} · 관련 패턴 초안`
                                : '정확한 모션 애셋 제작 대기'}
                            </span>
                          </button>
                          <span className="movement-equipment-label">
                            {patterns[0]
                              ? patterns[0].equipment[0]
                              : APPARATUS_LABELS[exercise.apparatus].short}
                          </span>
                          <button
                            type="button"
                            className={`movement-heart ${isFavorite ? 'is-saved' : ''}`}
                            onClick={() =>
                              setExerciseFavoriteTag(exercise.id, isFavorite ? 'none' : 'signature')
                            }
                            aria-label={`${exercise.nameKo} 즐겨찾기 ${isFavorite ? '해제' : '추가'}`}
                            aria-pressed={isFavorite}
                            title={`즐겨찾기: ${FAVORITE_TAG_META[exercise.favoriteTag].label}`}
                          >
                            <Heart size={17} fill={isFavorite ? 'currentColor' : 'none'} />
                          </button>
                        </div>
                        <div className="movement-card-content">
                          <div className="movement-card-tags">
                            {inSequence && (
                              <PfBadge tone="sage" className="movement-selected-badge">
                                <Check size={11} aria-hidden="true" /> 수업안 포함
                              </PfBadge>
                            )}
                            <PfBadge tone="neutral">
                              {LEVEL_NAMES[exercise.level]} · Lv {exercise.level}
                            </PfBadge>
                            <PfBadge tone="neutral" className="movement-position-badge">
                              {POSITION_LABELS[exercise.bodyPosition].ko}
                            </PfBadge>
                            <PfBadge tone="neutral">
                              <Clock3 size={12} />
                              {exercise.defaultDurationMin}분
                              {exercise.isUnilateral ? ' · 양쪽 포함' : ''}
                            </PfBadge>
                            {equipmentMeta.requiredProps.slice(0, 2).map((propId) => (
                              <PfBadge key={propId} tone="neutral" className="movement-prop-badge">
                                {propLabel(propId)}
                              </PfBadge>
                            ))}
                          </div>
                          <h2>
                            <button
                              type="button"
                              onClick={(event) => inspectExercise(exercise, event.currentTarget)}
                              aria-controls="library-movement-inspector"
                              aria-expanded={inspectedExerciseId === exercise.id}
                            >
                              {exercise.nameKo}
                            </button>
                          </h2>
                          <p className="movement-english">{exercise.nameEn}</p>
                          <PfAiStatusBadge
                            kind={
                              isIdea
                                ? ideaMeta?.triedByInstructor
                                  ? 'tried-memo'
                                  : 'creative-memo'
                                : approved
                                  ? 'instructor-reviewed'
                                  : 'review-pending'
                            }
                            className={`movement-review-status review-${reviewState}`}
                          >
                            {isIdea
                              ? ideaMeta?.triedByInstructor
                                ? '직접 해봄 · 주관적 메모'
                                : '내 창작 메모 · 전문가 검증 아님'
                              : approved
                                ? '내 강사 검토 · 자격 인증 미확인'
                                : reviewState === 'stale'
                                  ? '동작 정보 변경 · 다시 검토 필요'
                                  : '미검토 자료 · 검토 기록은 선택'}
                          </PfAiStatusBadge>
                          <p className="movement-target">
                            {isIdea
                              ? ideaMeta?.subjectiveFeeling
                                ? `느낌 메모: ${ideaMeta.subjectiveFeeling}`
                                : ideaMeta?.ideaLine || exercise.cues[0]
                              : exercise.targetMuscles.slice(0, 3).join(' · ') ||
                                exercise.cues[0] ||
                                '체간 안정 · 호흡 연결'}
                          </p>
                          {exercise.targetMuscles.length > 0 && (
                            <div className="movement-card-focus-tags" aria-label="타겟 부위 태그">
                              {exercise.targetMuscles.slice(0, 3).map((muscle) => {
                                const isTagSelected =
                                  filters.search.trim().toLocaleLowerCase() ===
                                  muscle.trim().toLocaleLowerCase();
                                return (
                                  <button
                                    type="button"
                                    key={muscle}
                                    className={`movement-focus-tag ${
                                      isTagSelected ? 'is-selected' : ''
                                    }`.trim()}
                                    aria-pressed={isTagSelected}
                                    aria-label={`${muscle} 태그로 검색`}
                                    onClick={() => update('search', isTagSelected ? '' : muscle)}
                                  >
                                    #{muscle}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          <div className="movement-provenance">
                            <span className={`source-dot source-${provenance.kind}`} />
                            {exercise.sourceReference
                              ? `원출처 보존 · ${exercise.sourceReference.publisher}`
                              : provenance.shortLabel}
                            {!equipmentMeta.requirementsKnown && (
                              <span className="movement-requirements-unknown">
                                요구 조건 미확인
                              </span>
                            )}
                            {recent.has(exercise.id) && (
                              <span className="movement-recent">최근 {lastTaught.count}회</span>
                            )}
                          </div>
                          {patterns.length > 0 ? (
                            <div className="ml-card-patterns">
                              <p>
                                관련 패턴 도해 {patterns.length}종 <span>· 전문가 미검토</span>
                              </p>
                              {patterns.map((pattern) => {
                                const isPatternSelected =
                                  previewReference?.family === pattern.family &&
                                  previewReference?.variantId === pattern.variantId;
                                return (
                                  <button
                                    type="button"
                                    key={`${pattern.family}-${pattern.variantId}`}
                                    className={isPatternSelected ? 'is-selected' : undefined}
                                    aria-pressed={isPatternSelected}
                                    onClick={(event) =>
                                      openPatternPreview(pattern, event.currentTarget)
                                    }
                                  >
                                    <Play size={13} /> {pattern.title} 보기
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="ml-card-pending">
                              관련 도해는 아직 없어요. 동작 노트에서 내용을 확인하세요.
                            </p>
                          )}
                          <div className="movement-card-footer">
                            <PfButton
                              variant="ghost"
                              onClick={() =>
                                isIdea && onOpenIdeaSheet
                                  ? onOpenIdeaSheet(exercise)
                                  : onOpenYouTubePreview(exercise)
                              }
                            >
                              {isIdea ? '다시 열기 · 느낌/수정' : '자세히 보기'}{' '}
                              <ArrowUpRight size={14} />
                            </PfButton>
                            <button
                              type="button"
                              className={`movement-add ${addedId === exercise.id ? 'just-added' : ''}`}
                              onClick={() => addExercise(exercise)}
                              aria-label={`${exercise.nameKo} 수업안에 추가`}
                            >
                              {addedId === exercise.id ? <Check size={16} /> : <Plus size={16} />}
                              <span>{addedId === exercise.id ? '추가됨' : '수업에 추가'}</span>
                            </button>
                          </div>
                        </div>
                      </PfMovementCard>
                    );
                  })}
                </div>
              ) : (
                <div className="library-empty panel" role="status" aria-live="polite">
                  <Search size={29} aria-hidden="true" />
                  <h2>조건에 맞는 동작이 없어요.</h2>
                  {(filters.search.trim() || activeFilterCount > 0) && (
                    <p className="library-empty-context">
                      {filters.search.trim() ? `‘${filters.search.trim()}’ 검색어` : ''}
                      {filters.search.trim() && activeFilterCount > 0 ? ' · ' : ''}
                      {activeFilterCount > 0 ? `필터 ${activeFilterCount}개 적용 중` : ''}
                    </p>
                  )}
                  <p className="muted">
                    검색어를 줄이거나 필터를 조정해 보세요.
                    <br />
                    직접 찾은 유튜브 레퍼런스도 추가할 수 있어요.
                  </p>
                  <div className="library-empty-actions">
                    {filters.search.trim() && (
                      <PfButton variant="secondary" onClick={clearSearch}>
                        검색어 지우기
                      </PfButton>
                    )}
                    <PfButton variant="primary" onClick={resetFilters}>
                      전체 동작 보기
                    </PfButton>
                    <PfButton variant="secondary" onClick={onOpenClipper}>
                      <Youtube size={16} /> 참조 추가
                    </PfButton>
                  </div>
                </div>
              )}
              {filtered.length > notesVisibleCount && (
                <div className="library-load-more">
                  <p>
                    {Math.min(notesVisibleCount, filtered.length)} / {filtered.length}개 동작 노트
                  </p>
                  <PfButton
                    variant="secondary"
                    onClick={() => {
                      const firstNewIndex = notesVisibleCount;
                      setNotesVisible({
                        signature: notesSignature,
                        limit: notesVisibleCount + 12,
                      });
                      requestAnimationFrame(() => {
                        const cards =
                          cardGridRef.current?.querySelectorAll<HTMLElement>('.movement-card');
                        const nextCardButton =
                          cards?.[firstNewIndex]?.querySelector<HTMLElement>('h2 button');
                        nextCardButton?.focus();
                      });
                    }}
                  >
                    동작 노트 더 보기 <Plus size={14} />
                  </PfButton>
                </div>
              )}
            </div>
          </div>
          {!filters.search && activeFilterCount === 0 && (
            <section className="ml-pattern-discovery" aria-label="모션으로 살펴보기">
              <div className="ml-section-heading">
                <div>
                  <span>ORIGINAL MOTION STUDIES</span>
                  <h2>모션으로 살펴보기</h2>
                </div>
                <button type="button" onClick={() => update('motionDraft', 'proposal')}>
                  관련 도해 있는 노트 <ArrowUpRight size={15} />
                </button>
              </div>
              <p>직접 만든 도해 초안입니다. 실제 동작과의 차이는 미리보기에서 확인할 수 있어요.</p>
              <div className="ml-pattern-rail">
                {PATTERN_STUDIES.slice(
                  patternPage * PATTERNS_PER_PAGE,
                  (patternPage + 1) * PATTERNS_PER_PAGE,
                ).map((reference) => {
                  const isPatternSelected =
                    previewReference?.family === reference.family &&
                    previewReference?.variantId === reference.variantId;
                  return (
                    <button
                      type="button"
                      className={`ml-pattern-tile ${isPatternSelected ? 'is-selected' : ''}`.trim()}
                      key={`${reference.family}-${reference.variantId}`}
                      onClick={(event) => openPatternPreview(reference, event.currentTarget)}
                      aria-label={`${reference.title} 도해 초안 보기`}
                      aria-pressed={isPatternSelected}
                    >
                      <div className="ml-pattern-tile-art">
                        <MotionPatternThumbnail reference={reference} />
                        <span>도해 초안</span>
                      </div>
                      <strong>{reference.title}</strong>
                      <span className="ml-pattern-tile-link">
                        패턴 참고 <Play size={12} />
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="ml-pattern-pages">
                <span>
                  {patternPage * PATTERNS_PER_PAGE + 1}–
                  {Math.min((patternPage + 1) * PATTERNS_PER_PAGE, PATTERN_STUDIES.length)} /{' '}
                  {PATTERN_STUDIES.length}개 초안
                </span>
                <button
                  type="button"
                  disabled={patternPage === 0}
                  onClick={() => setPatternPage((page) => page - 1)}
                >
                  이전 도해
                </button>
                <button
                  type="button"
                  disabled={(patternPage + 1) * PATTERNS_PER_PAGE >= PATTERN_STUDIES.length}
                  onClick={() => setPatternPage((page) => page + 1)}
                >
                  다음 도해
                </button>
              </div>
            </section>
          )}

          {previewReference && (
            <section className="ml-direct-preview" aria-label="선택한 패턴 도해 미리보기">
              <div className="ml-preview-heading">
                <h2 tabIndex={-1} ref={previewHeading}>
                  패턴 도해 미리보기
                </h2>
                <button
                  type="button"
                  onClick={closePatternPreview}
                  aria-label="패턴 도해 미리보기 닫기"
                >
                  <X size={18} />
                </button>
              </div>
              <MotionPatternPreview
                key={`${previewReference.family}-${previewReference.variantId}`}
                reference={previewReference}
              />
              {(() => {
                const previewExercise = exercises.find((item) =>
                  previewReference.intendedExerciseIds.includes(item.id),
                );
                if (!previewExercise) return null;
                const previewApproved = isExerciseAutoEligible(previewExercise);
                return (
                  <section
                    className="ml-preview-exercise-summary"
                    aria-label="연결 동작 설명·주의점 및 시퀀스 삽입"
                  >
                    <div className="ml-preview-exercise-header">
                      <strong>연결 동작 노트 · {previewExercise.nameKo}</strong>
                      <span>
                        {previewApproved
                          ? '내 검토 기록 있음 · 전문가 검증 아님'
                          : '미검토 자료 · 수업안에 추가 가능'}
                      </span>
                    </div>
                    {previewExercise.cues.length > 0 && (
                      <div className="ml-preview-exercise-cues">
                        <h4>동작 설명·티칭 큐</h4>
                        <ul>
                          {previewExercise.cues.slice(0, 3).map((cue) => (
                            <li key={cue}>{cue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {previewExercise.precautions?.trim() && (
                      <div className="ml-preview-exercise-precautions">
                        <h4>주의점·금기 사항</h4>
                        <p>{previewExercise.precautions}</p>
                      </div>
                    )}
                    <div className="ml-preview-exercise-actions">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => onOpenYouTubePreview(previewExercise)}
                      >
                        노트 상세·검토 열기
                      </button>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => addExercise(previewExercise)}
                      >
                        <Plus size={15} aria-hidden="true" /> 시퀀스에 바로 삽입
                      </button>
                    </div>
                  </section>
                );
              })()}
            </section>
          )}

          <details className="library-public-references">
            <summary>
              <span>
                <ExternalLink size={14} /> 공개 참고 자료와 이용 범위
              </span>
              <ChevronDown size={15} />
            </summary>
            <p>
              한국어 용어와 일반 운동 분류를 확인할 수 있는 원문입니다. 이 페이지의
              영상·이미지·설명을 동작 카드로 가져오지 않았습니다.
            </p>
            <div>
              {PUBLIC_REFERENCES.map((reference) => (
                <a
                  key={reference.url}
                  href={reference.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="reference-publisher">{reference.publisher} · 원문 링크</span>
                  <strong>
                    {reference.title}
                    <ArrowUpRight size={13} />
                  </strong>
                  <span>{reference.scope}</span>
                  <small>{reference.rights}</small>
                </a>
              ))}
            </div>
            <p className="reference-checked">
              출처 페이지와 이용 표기 확인: 2026.11.04 · 자료의 공개나 이용 표기가 동작의 적합성을
              보증하지 않습니다.
            </p>
          </details>
          <details className="ml-review-details">
            <summary>검토와 수업 사용 기준</summary>
            <p>
              동작·설정·시간·큐를 실제로 확인한 강사의 검토 기록이 있는 항목만 자동 편성·수업 진행에
              사용할 수 있습니다. 현재 내 강사 검토{' '}
              {exercises.filter(isExerciseAutoEligible).length}개 / {exercises.length}개 · 자격 인증
              미확인.
            </p>
            <p>
              {MOTION_PATTERN_REFERENCES.length}개 저작 도해 초안은 관련 패턴을 비교하기 위한
              자료이며, 어느 동작의 정확한 시범이나 전문가 승인을 뜻하지 않습니다.
            </p>
            <div className="library-notes-heading">
              <h2>동작 노트</h2>
              <p>
                직접 작성한 계획 자료{' '}
                {
                  exercises.filter(
                    (exercise) => getMovementProvenance(exercise).kind === 'original',
                  ).length
                }
                개 · 기존 출처 미검증 자료{' '}
                {
                  exercises.filter((exercise) => getMovementProvenance(exercise).kind === 'legacy')
                    .length
                }
                개
                {exercises.some((exercise) => getMovementProvenance(exercise).kind === 'manual')
                  ? ' · 직접 등록한 참조 포함'
                  : ''}
              </p>
            </div>
            {(onOpenStudy || onOpenMotionDrafts) && (
              <div className="library-learning-actions">
                {onOpenStudy && (
                  <PfButton variant="text" onClick={() => onOpenStudy()}>
                    숙지·북마크 연습실 <ArrowUpRight size={15} />
                  </PfButton>
                )}
                {onOpenMotionDrafts && (
                  <PfButton variant="text" onClick={() => onOpenMotionDrafts()}>
                    기존 17종 제작 실험실 <ArrowUpRight size={15} />
                  </PfButton>
                )}
              </div>
            )}
            <OwnedEquipmentEditor />
          </details>
          <p className="library-endnote">
            움직임의 이름은 시작점입니다. 순서와 강도는 오늘의 수업에 맞게 조정하세요.
          </p>
        </div>
      )}
      <div className="ml-selection-return" data-has-selection={selectedCount > 0}>
        <p>
          <strong>{selectedCount}개</strong>
          <span>현재 수업안에 담긴 동작</span>
        </p>
        <button type="button" onClick={() => setActiveTab('workbench')}>
          수업 구성으로 돌아가기 <ArrowUpRight size={17} />
        </button>
      </div>
      {(sourceToPlan || ownNoteOpen) && (
        <SourceNoteDialog
          key={sourceToPlan?.id ?? 'own-movement'}
          reference={sourceToPlan ?? undefined}
          onClose={() => {
            setSourceToPlan(null);
            setOwnNoteOpen(false);
          }}
          onSaved={(exercise) => {
            setSourceToPlan(null);
            setOwnNoteOpen(false);
            onOpenYouTubePreview(exercise);
          }}
        />
      )}
      <div
        className={`library-toast ${toast?.success === false ? 'is-error' : ''}`}
        role={toast?.success === false ? 'alert' : 'status'}
        aria-live={toast?.success === false ? 'assertive' : 'polite'}
        style={toast?.success === false ? { background: '#794414' } : undefined}
      >
        {toast && (
          <>
            {toast.success ? <Check size={17} /> : <Info size={17} />}
            {toast.message}
          </>
        )}
      </div>
    </div>
  );
};
