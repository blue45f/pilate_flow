import { EquipmentChoice } from './EquipmentChoice';
import { MobileSubPageBar } from './MobileSubPageBar';
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
  Layers,
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
import {
  EQUIPMENT_OPTIONS,
  PROP_OPTIONS,
  getEquipmentFamilies,
  getExerciseEquipment,
} from '../data/equipmentCatalog';
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
  ApparatusType,
  AutoGenerateCriteria,
  BodyPosition,
  ClassBlockCategory,
  DifficultyLevel,
  FavoriteTag,
  PilatesExercise,
  PropType,
  SequenceStep,
} from '../types/pilates';
import {
  exerciseMatchesCriteria,
  formatSecondsToMMSS,
  getExerciseLastTaughtInfo,
  getMovementKey,
  getSequenceDurations,
  isRestStep,
} from '../utils/sequenceEngine';
import { MotionPatternPreview, MotionPatternThumbnail } from './MotionPatternPreview';
import { getCatalogContinuousMotionAsset } from '../data/catalogMotionAssets';
import { getExpandedMovementVisualBinding } from '../data/expandedMovementVisualBindings';
import { CatalogMotionInteractivePlayer } from './CatalogMotionInteractivePlayer';
import { ExerciseMotionArtwork } from './ExerciseMotionArtwork';
import { FlowAtlasCatalog } from './FlowAtlasCatalog';
import { PilatesVideoLibrary } from './PilatesVideoLibrary';
import { VERIFIED_YOUTUBE_VIDEO_POOL } from '../data/exerciseYouTubeCatalog';
import { ApparatusIconBadge } from './ApparatusStudioArtwork';
import { ApparatusVisualGuideRibbon } from './ApparatusVisualGuideRibbon';
import { KinematicSchematicShowcase } from './KinematicSchematicShowcase';
import { SpringVisualPills } from './SpringVisualPills';
import { BRAND_SPRING_OPTIONS, formatBrandSpringEquivalent } from '../utils/brandSpringConverter';
import { EquipmentDiscoveryScope } from './EquipmentDiscoveryScope';
import { CourseReferenceBrowser } from './CourseReferenceBrowser';
import { SourceNoteDialog } from './SourceNoteDialog';
import '../styles/design-tokens.css';
import '../styles/library.css';
import '../styles/library-learning.css';
import '../styles/motion-library.css';
import '../styles/library-asset-status.css';
import '../styles/library-concept-layout.css';
import './ExerciseAtlasView.usability.css';
import { LibraryMovementInspector } from './LibraryMovementInspector';
import { GlobalRepertoirePackExplorer } from './GlobalRepertoirePackExplorer';
import {
  CRAWLED_YOUTUBE_DISCOVERY_POOL,
  GLOBAL_CRAWLED_REPERTOIRE_EXERCISES,
} from '../data/globalCrawledRepertoirePack';
import { COURSE_REFERENCES } from '../data/courseReferences';
import {
  ATLAS_DISCOVERY_RECOVERY_KEY,
  INITIAL_ATLAS_FILTERS as INITIAL_FILTERS,
  useAtlasFilterEngine,
} from '../hooks/useAtlasFilterEngine';

export { ATLAS_DISCOVERY_RECOVERY_KEY };

interface ExerciseAtlasViewProps {
  onOpenYouTubePreview: (exercise: PilatesExercise) => void;
  onOpenIdeaSheet?: (exercise?: PilatesExercise | null) => void;
  onOpenClipper: () => void;
  onOpenStudy?: (exerciseId?: string) => void;
  onOpenMotionDrafts?: (draftId?: MotionDraftId) => void;
  /** Direct entry for advanced library workflows; everyday browsing starts in the catalog. */
  initialView?: 'catalog' | 'tools';
}

const LEVEL_NAMES = { '1.0': '기초', '1.5': '중급', '2.0': '심화' };
const APPARATUS_CRITERIA_LABELS: Record<ApparatusType | 'mixed', string> = {
  mat: '매트',
  reformer: '리포머',
  cadillac: '캐딜락',
  chair: '체어',
  barrel: '바렐',
  mixed: '혼합 기구',
};
const MAX_COMPARE_ITEMS = 3;
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

interface SequenceMovementEntry {
  step: SequenceStep;
  orderNumber: number;
  exercise: PilatesExercise | null;
}

type CardSequenceReadiness =
  | { status: 'in-sequence'; orderNumber: number; label: string }
  | {
      status: 'family-conflict';
      conflictOrderNumber: number;
      conflictNameKo: string;
      label: string;
    }
  | { status: 'criteria-mismatch'; reason: string; label: string }
  | { status: 'ready'; label: string };

function evaluateCardSequenceReadiness(
  exercise: PilatesExercise,
  sequenceEntries: readonly SequenceMovementEntry[],
  criteria: AutoGenerateCriteria,
  ownedEquipment: readonly string[],
  ownedProps: readonly PropType[],
): CardSequenceReadiness {
  const matchedEntry = sequenceEntries.find((entry) => entry.step.exerciseId === exercise.id);
  if (matchedEntry) {
    return {
      status: 'in-sequence',
      orderNumber: matchedEntry.orderNumber,
      label: `수업안 포함 · #${matchedEntry.orderNumber}`,
    };
  }
  if (isMovementIdeaExercise(exercise)) {
    return { status: 'ready', label: '내 창작 메모 · 바로 추가 가능' };
  }
  const movementKey = getMovementKey(exercise);
  const familyConflict = sequenceEntries.find(
    (entry) =>
      entry.exercise &&
      entry.exercise.id !== exercise.id &&
      getMovementKey(entry.exercise) === movementKey,
  );
  if (familyConflict && familyConflict.exercise) {
    return {
      status: 'family-conflict',
      conflictOrderNumber: familyConflict.orderNumber,
      conflictNameKo: familyConflict.exercise.nameKo,
      label: `동일 계열 포함됨 · #${familyConflict.orderNumber} ${familyConflict.exercise.nameKo}`,
    };
  }
  const equipmentMeta = getExerciseEquipment(exercise);
  const missingOwnedEq = equipmentMeta.requiredEquipment.some((id) => !ownedEquipment.includes(id));
  const missingOwnedProps = equipmentMeta.requiredProps.some((prop) => !ownedProps.includes(prop));
  if (!exerciseMatchesCriteria(exercise, criteria) || missingOwnedEq || missingOwnedProps) {
    let reason = '현재 수업 조건 확인';
    if (!equipmentMeta.requirementsKnown) {
      reason = '요구 조건 확인 필요';
    } else if (criteria.apparatus !== 'mixed' && exercise.apparatus !== criteria.apparatus) {
      reason = `수업 기구 확인 · 현재 ${APPARATUS_CRITERIA_LABELS[criteria.apparatus]}`;
    } else if (Number(exercise.level) > Number(criteria.level)) {
      reason = `난이도 확인 · 최대 Lv ${criteria.level}`;
    } else if (
      missingOwnedEq ||
      !equipmentMeta.requiredEquipment.every((id) =>
        (criteria.availableEquipment ?? []).includes(id),
      )
    ) {
      reason = `사용 기구 확인 · ${equipmentMeta.requiredEquipment.map(equipmentLabel).join('·')}`;
    } else if (
      missingOwnedProps ||
      !exercise.props.every((prop) => prop === 'none' || criteria.preferredProps.includes(prop))
    ) {
      reason = `소도구 확인 · ${equipmentMeta.requiredProps.map(propLabel).join('·')}`;
    }
    return {
      status: 'criteria-mismatch',
      reason,
      label: reason,
    };
  }
  return { status: 'ready', label: '현재 수업 조건 일치' };
}

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
        <p>
          ‘내 보유 장비’ 범위는 아래 기구와 소도구로 요구 조건을 모두 충족하는 자료를 보여줍니다.
        </p>
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
  const { ownedEquipment, ownedProps, exerciseBrowseScope, setExerciseBrowseScope } =
    usePilatesStore();
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState<'all' | 'kr' | 'global'>('all');
  const [equipment, setEquipment] = useState<string[]>([]);
  const [props, setProps] = useState<PropType[]>([]);
  const [duration, setDuration] = useState('all');
  const [level, setLevel] = useState('all');
  const [bodyFocus, setBodyFocus] = useState('all');
  const [language, setLanguage] = useState('all');
  const ownedOnly = exerciseBrowseScope === 'owned';
  const setOwnedOnly = (owned: boolean) => setExerciseBrowseScope(owned ? 'owned' : 'all');
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
          {(search.trim() || filterCount > 0) && (
            <p className="library-empty-context">
              {search.trim() ? `‘${search.trim()}’ 검색어` : ''}
              {search.trim() && filterCount > Number(Boolean(search.trim())) ? ' · ' : ''}
              {filterCount > Number(Boolean(search.trim()))
                ? `필터 ${filterCount - Number(Boolean(search.trim()))}개 적용 중`
                : ''}
            </p>
          )}
          <div className="verified-reference-empty-actions">
            {search.trim() && (
              <button type="button" className="btn-secondary" onClick={() => setSearch('')}>
                검색어 지우기
              </button>
            )}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setOwnedOnly(false);
                reset();
              }}
            >
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
  initialView = 'catalog',
}) => {
  const {
    exercises,
    ownedEquipment,
    ownedProps,
    exerciseBrowseScope,
    setExerciseBrowseScope,
    classGroups,
    historyLogs,
    activeTargetGroupId,
    setActiveTargetGroupId,
    activeApparatus,
    activeLevel,
    activeTargetMinutes,
    lastCriteria,
    draftCriteria,
    appendExerciseToSequence,
    setExerciseFavoriteTag,
    activeSteps,
    setActiveTab,
    reformerBrand,
    setReformerBrand,
  } = usePilatesStore();
  const [showAdvancedTools, setShowAdvancedTools] = useState(initialView === 'tools');
  const [collection, setCollection] = useState<
    'notes' | 'repertoire' | 'videos' | 'references' | 'courses'
  >('notes');
  const [sourceToPlan, setSourceToPlan] = useState<VerifiedPublicReference | null>(null);
  const [ownNoteOpen, setOwnNoteOpen] = useState(false);
  const { filters, setFilters, update, recent, filtered, activeFilterCount, activeFilterChips } =
    useAtlasFilterEngine({
      exercises,
      historyLogs,
      activeTargetGroupId,
      exerciseBrowseScope,
      ownedEquipment,
      ownedProps,
    });
  const [notesVisible, setNotesVisible] = useState({
    signature: '',
    limit: 12,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showMotionExamples, setShowMotionExamples] = useState(false);
  const [showApparatusGuide, setShowApparatusGuide] = useState(false);
  const [toast, setToast] = useState<{ success: boolean; message: string } | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [brokenPhotoIds, setBrokenPhotoIds] = useState<Record<string, boolean>>({});
  const [previewReference, setPreviewReference] = useState<MotionPatternReference | null>(null);
  const [previewCatalogMotionId, setPreviewCatalogMotionId] = useState<string | null>(null);
  const [patternPage, setPatternPage] = useState(0);
  const [inspectedExerciseId, setInspectedExerciseId] = useState<string | null>(null);
  const [compareState, setCompareState] = useState<{
    ids: string[];
    expanded: boolean;
    limitNotice: string | null;
  }>({
    ids: [],
    expanded: false,
    limitNotice: null,
  });
  const inspectedExercise =
    exercises.find((exercise) => exercise.id === inspectedExerciseId) ?? null;
  const previewCatalogMotionAsset = useMemo(
    () =>
      getCatalogContinuousMotionAsset(
        exercises.find((exercise) => exercise.id === previewCatalogMotionId),
      ),
    [exercises, previewCatalogMotionId],
  );
  const inspectorHeading = useRef<HTMLHeadingElement>(null);
  const inspectorTrigger = useRef<HTMLButtonElement | null>(null);
  const compareExpandBtnRef = useRef<HTMLButtonElement | null>(null);
  const lastCompareTriggerRef = useRef<HTMLButtonElement | null>(null);

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
    setPreviewCatalogMotionId(null);
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

  const sequenceMovementSteps = useMemo<SequenceMovementEntry[]>(
    () =>
      activeSteps
        .filter((step) => !isRestStep(step))
        .map((step, index) => ({
          step,
          orderNumber: index + 1,
          exercise: exercises.find((item) => item.id === step.exerciseId) ?? null,
        })),
    [activeSteps, exercises],
  );
  const selectedCount = sequenceMovementSteps.length;
  const sequenceTotalSeconds = useMemo(
    () => getSequenceDurations(activeSteps).totalSec,
    [activeSteps],
  );

  const effectiveCriteria = useMemo<AutoGenerateCriteria>(() => {
    const source = lastCriteria ?? draftCriteria;
    const stepEquipment = [
      ...new Set(
        activeSteps.flatMap((step) => {
          const item = exercises.find((candidate) => candidate.id === step.exerciseId);
          return item ? getExerciseEquipment(item).requiredEquipment : [];
        }),
      ),
    ];
    const selected =
      source?.availableEquipment ??
      (stepEquipment.length ? stepEquipment : activeApparatus === 'mixed' ? [] : [activeApparatus]);
    return {
      focusPreset: 'full-body',
      excludeDaysWindow: 10,
      defaultLayer: 'standard',
      ...source,
      apparatus: activeSteps.length ? activeApparatus : (source?.apparatus ?? activeApparatus),
      ownedApparatus: getEquipmentFamilies(selected),
      availableEquipment: selected,
      preferredProps: (source?.preferredProps ?? ownedProps).filter(
        (prop) => prop === 'none' || ownedProps.includes(prop),
      ),
      level: activeSteps.length ? activeLevel : (source?.level ?? activeLevel),
      targetGroupId: source?.targetGroupId ?? activeTargetGroupId,
      targetMinutes: activeSteps.length
        ? activeTargetMinutes
        : (source?.targetMinutes ?? activeTargetMinutes),
      restMinutes: activeSteps.length
        ? getSequenceDurations(activeSteps).restSec / 60
        : (source?.restMinutes ?? 0),
    };
  }, [
    activeApparatus,
    activeLevel,
    activeSteps,
    activeTargetGroupId,
    activeTargetMinutes,
    draftCriteria,
    exercises,
    lastCriteria,
    ownedProps,
  ]);

  const comparedExercises = useMemo(
    () =>
      compareState.ids
        .map((id) => exercises.find((item) => item.id === id))
        .filter((item): item is PilatesExercise => Boolean(item)),
    [compareState.ids, exercises],
  );
  const filteredIdSet = useMemo(() => new Set(filtered.map((item) => item.id)), [filtered]);

  const toggleCompareExercise = (exercise: PilatesExercise, trigger: HTMLButtonElement) => {
    lastCompareTriggerRef.current = trigger;
    setCompareState((previous) => {
      const validIds = previous.ids.filter((id) => exercises.some((item) => item.id === id));
      if (validIds.includes(exercise.id)) {
        const nextIds = validIds.filter((id) => id !== exercise.id);
        return {
          ids: nextIds,
          expanded: nextIds.length > 0 ? previous.expanded : false,
          limitNotice: null,
        };
      }
      if (validIds.length >= MAX_COMPARE_ITEMS) {
        return {
          ids: validIds,
          expanded: true,
          limitNotice: `비교함에는 최대 ${MAX_COMPARE_ITEMS}개 동작까지 담을 수 있어요. 먼저 후보 하나를 비운 뒤 선택해 주세요.`,
        };
      }
      const nextIds = [...validIds, exercise.id];
      return {
        ids: nextIds,
        expanded: nextIds.length >= 2 ? true : previous.expanded,
        limitNotice: null,
      };
    });
  };

  const removeComparedExercise = (exerciseId: string) => {
    const remainingCount = comparedExercises.filter((item) => item.id !== exerciseId).length;
    setCompareState((previous) => {
      const validIds = previous.ids.filter((id) => exercises.some((item) => item.id === id));
      const nextIds = validIds.filter((id) => id !== exerciseId);
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

  const clearComparedExercises = () => {
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

  const openPatternPreview = (reference: MotionPatternReference, trigger: HTMLButtonElement) => {
    previewTrigger.current = trigger;
    setPreviewCatalogMotionId(null);
    setPreviewReference(reference);
    requestAnimationFrame(() => {
      previewHeading.current?.focus();
      previewHeading.current?.scrollIntoView?.({ behavior: 'instant', block: 'nearest' });
    });
  };
  const openCatalogMotionPreview = (exerciseId: string, trigger: HTMLButtonElement) => {
    previewTrigger.current = trigger;
    setPreviewReference(null);
    setPreviewCatalogMotionId(exerciseId);
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
  const notesSignature = JSON.stringify({
    filters,
    exerciseBrowseScope,
    ownedEquipment,
    ownedProps,
  });
  const notesVisibleCount = notesVisible.signature === notesSignature ? notesVisible.limit : 12;
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

  const hasSearchOrFilters = Boolean(filters.search.trim()) || activeFilterCount > 0;
  const activeFlowStep: 1 | 2 | 3 = inspectedExercise ? 3 : hasSearchOrFilters ? 2 : 1;

  if (!showAdvancedTools) {
    return (
      <FlowAtlasCatalog
        exercises={filtered.slice(0, notesVisibleCount)}
        resultCount={filtered.length}
        totalCount={exercises.length}
        search={filters.search}
        equipment={filters.equipment}
        favoritesOnly={filters.favorite !== 'all'}
        filterCount={activeFilterCount}
        activeFilters={activeFilterChips.map((chip) => ({
          ...chip,
          onClear: () => {
            chip.onClear();
            focusSearch();
          },
        }))}
        ownedOnly={exerciseBrowseScope === 'owned'}
        selectedCount={selectedCount}
        plannedMinutes={Math.round(sequenceTotalSeconds / 60)}
        addedId={addedId}
        feedback={toast}
        brokenPhotoIds={brokenPhotoIds}
        searchRef={searchInput}
        gridRef={cardGridRef}
        onSearch={(value) => update('search', value)}
        onSelectEquipment={(ids) => update('equipment', ids)}
        onToggleFavorites={() => update('favorite', filters.favorite === 'all' ? 'saved' : 'all')}
        onClearSearch={clearSearch}
        onReset={resetFilters}
        onShowAll={() => {
          setExerciseBrowseScope('all');
          resetFilters();
        }}
        onOpenTools={(openFilters = false) => {
          if (openFilters) {
            setCollection('notes');
            setShowFilters(true);
          }
          setShowAdvancedTools(true);
          requestAnimationFrame(() => document.getElementById('workspace-main-heading')?.focus());
        }}
        onReturnToClass={() => setActiveTab('workbench')}
        onOpenDetails={(exercise) => {
          if (isMovementIdeaExercise(exercise) && onOpenIdeaSheet) onOpenIdeaSheet(exercise);
          else onOpenYouTubePreview(exercise);
        }}
        onAdd={addExercise}
        onToggleFavorite={(exercise) =>
          setExerciseFavoriteTag(
            exercise.id,
            exercise.favoriteTag === 'none' ? 'signature' : 'none',
          )
        }
        onPhotoError={(exerciseId) =>
          setBrokenPhotoIds((previous) => ({ ...previous, [exerciseId]: true }))
        }
        onLoadMore={() => {
          const firstNewIndex = notesVisibleCount;
          setNotesVisible({ signature: notesSignature, limit: notesVisibleCount + 12 });
          requestAnimationFrame(() => {
            const firstNewCard = cardGridRef.current
              ?.querySelectorAll<HTMLElement>('.flow-atlas__card')
              .item(firstNewIndex);
            firstNewCard?.querySelector<HTMLButtonElement>('h2 button')?.focus();
          });
        }}
        getCardState={(exercise) => {
          const readiness = evaluateCardSequenceReadiness(
            exercise,
            sequenceMovementSteps,
            effectiveCriteria,
            ownedEquipment,
            ownedProps,
          );
          return {
            inSequence: readiness.status === 'in-sequence',
            orderNumber: readiness.status === 'in-sequence' ? readiness.orderNumber : undefined,
            note:
              readiness.status === 'criteria-mismatch' || readiness.status === 'family-conflict'
                ? readiness.label
                : undefined,
          };
        }}
      />
    );
  }

  return (
    <div
      className="movement-library motion-library library-task-focused flow-atlas-tools"
      data-filters-expanded={showFilters}
    >
      <div className="flow-atlas__tools-top">
        <button
          type="button"
          className="flow-atlas__tools-return"
          onClick={() => {
            setShowAdvancedTools(false);
            focusSearch();
          }}
        >
          동작 찾기로 돌아가기
        </button>
        <span>자료와 고급 도구</span>
      </div>
      <header className="library-heading">
        <div>
          <span className="eyebrow">동작 사전 · {exercises.length}종</span>
          <h1 id="workspace-main-heading" tabIndex={-1}>
            동작 라이브러리
          </h1>
          <p className="muted">기구·부위별로 동작을 찾고 현재 수업에 바로 담아 보세요.</p>
        </div>
        <div className="library-heading-actions">
          {onOpenIdeaSheet && (
            <PfButton variant="secondary" onClick={() => onOpenIdeaSheet(null)}>
              <Plus size={16} /> 한 줄 동작 메모
            </PfButton>
          )}
          <PfButton variant="secondary" onClick={() => setOwnNoteOpen(true)}>
            <Plus size={17} /> 내 동작 직접 등록
          </PfButton>
          <PfButton variant="secondary" onClick={onOpenClipper}>
            <Youtube size={16} /> 유튜브 참조 추가
          </PfButton>
        </div>
      </header>

      <EquipmentDiscoveryScope />
      <div
        className="library-collection-tabs"
        role="tablist"
        aria-label="자료 모음"
        onKeyDown={(event) => {
          if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            const collections = ['notes', 'repertoire', 'videos', 'references', 'courses'] as const;
            const index = collections.indexOf(collection);
            const next =
              event.key === 'Home'
                ? collections[0]
                : event.key === 'End'
                  ? collections[collections.length - 1]
                  : collections[
                      (index + (event.key === 'ArrowRight' ? 1 : collections.length - 1)) %
                        collections.length
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
          id="library-repertoire-tab"
          aria-controls="library-repertoire-panel"
          aria-selected={collection === 'repertoire'}
          tabIndex={collection === 'repertoire' ? 0 : -1}
          className={collection === 'repertoire' ? 'selected' : ''}
          onClick={() => setCollection('repertoire')}
        >
          확장 도감·영상 <span>{GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          id="library-videos-tab"
          aria-controls="library-videos-panel"
          aria-selected={collection === 'videos'}
          tabIndex={collection === 'videos' ? 0 : -1}
          className={collection === 'videos' ? 'selected' : ''}
          onClick={() => setCollection('videos')}
        >
          동작 영상 <span>{VERIFIED_YOUTUBE_VIDEO_POOL.length}</span>
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
      {collection !== 'notes' && collection !== 'videos' && (
        <p className="library-collection-trust">
          공식 출처 확인 21건 · 국내 후보 9건 · 크롤링 확장 동작{' '}
          {GLOBAL_CRAWLED_REPERTOIRE_EXERCISES.length}종(영상{' '}
          {CRAWLED_YOUTUBE_DISCOVERY_POOL.length}편) · 공개·확장 자료는 검토 전 자동 추천 제외
        </p>
      )}
      {collection === 'videos' ? (
        <div id="library-videos-panel" role="tabpanel" aria-labelledby="library-videos-tab">
          <PilatesVideoLibrary />
        </div>
      ) : collection === 'courses' ? (
        <div id="library-courses-panel" role="tabpanel" aria-labelledby="library-courses-tab">
          <CourseReferenceBrowser />
        </div>
      ) : collection === 'references' ? (
        <div id="library-references-panel" role="tabpanel" aria-labelledby="library-references-tab">
          <VerifiedReferencesSection onCreateNote={setSourceToPlan} />
        </div>
      ) : collection === 'repertoire' ? (
        <div id="library-repertoire-panel" role="tabpanel" aria-labelledby="library-repertoire-tab">
          <GlobalRepertoirePackExplorer onOpenExerciseDetail={onOpenYouTubePreview} />
        </div>
      ) : (
        <div id="library-notes-panel" role="tabpanel" aria-labelledby="library-notes-tab">
          {activeSteps.filter((st) => !isRestStep(st)).length > 0 && (
            <div
              className="atlas-active-sequence-bar"
              data-testid="atlas-active-sequence-bar"
              role="region"
              aria-label="현재 수업 담김 요약"
            >
              <strong>
                현재 수업에 {activeSteps.filter((st) => !isRestStep(st)).length}개 동작 담김
              </strong>
              <PfButton variant="primary" onClick={() => setActiveTab('workbench')}>
                수업 순서·시간 다듬기
              </PfButton>
            </div>
          )}
          <div
            className="atlas-flow-step-bar"
            data-testid="atlas-flow-step-bar"
            data-active-step={String(activeFlowStep)}
            aria-label="라이브러리 탐색 단계 안내"
          >
            <ol className="atlas-flow-step-list">
              <li
                className={`atlas-flow-step ${activeFlowStep === 1 ? 'is-current' : 'is-done'}`}
                data-step="1"
                data-state={activeFlowStep === 1 ? 'current' : 'done'}
                aria-current={activeFlowStep === 1 ? 'step' : undefined}
              >
                <span className="atlas-flow-step-label">1 기구·검색어로 좁히기</span>
                <span className="atlas-flow-step-meta">
                  {hasSearchOrFilters
                    ? `조건 ${activeFilterChips.length}개 적용`
                    : '기구·부위·키워드 선택'}
                </span>
              </li>
              <li
                className={`atlas-flow-step ${
                  activeFlowStep === 2
                    ? 'is-current'
                    : activeFlowStep > 2
                      ? 'is-done'
                      : 'is-upcoming'
                }`}
                data-step="2"
                data-state={
                  activeFlowStep === 2 ? 'current' : activeFlowStep > 2 ? 'done' : 'upcoming'
                }
                aria-current={activeFlowStep === 2 ? 'step' : undefined}
              >
                <span className="atlas-flow-step-label">2 동작 카드 선택</span>
                <span className="atlas-flow-step-meta">
                  {inspectedExercise
                    ? `${inspectedExercise.nameKo} 선택됨`
                    : `후보 ${filtered.length}개 중 선택`}
                </span>
              </li>
              <li
                className={`atlas-flow-step ${activeFlowStep === 3 ? 'is-current' : 'is-upcoming'}`}
                data-step="3"
                data-state={activeFlowStep === 3 ? 'current' : 'upcoming'}
                aria-current={activeFlowStep === 3 ? 'step' : undefined}
              >
                <span className="atlas-flow-step-label">3 세부 안내 확인·수업안 추가</span>
                <span className="atlas-flow-step-meta">
                  {inspectedExercise ? '안내창에서 주의점·시간 확인' : '선택 후 세부 안내 확인'}
                </span>
              </li>
            </ol>
            {hasSearchOrFilters && filtered.length > 0 && (
              <button
                type="button"
                className="btn-secondary atlas-flow-reset-button"
                onClick={resetFilters}
              >
                검색·필터 초기화 <X size={13} aria-hidden="true" />
              </button>
            )}
          </div>
          {inspectedExercise && (
            <div className="pf-auto-mobile-only">
              <MobileSubPageBar
                ariaLabel="동작 목록과 선택 동작 정보 전환"
                activeId="inspector"
                options={[
                  { id: 'list', label: '동작 목록으로 돌아가기', badge: filtered.length },
                  { id: 'inspector', label: `선택됨 · ${inspectedExercise.nameKo.slice(0, 10)}` },
                ]}
                onSelect={(id) => {
                  if (id === 'list') closeInspector();
                }}
              />
            </div>
          )}
          <section className="library-tools panel" aria-label="동작 검색과 필터">
            <div className="library-search-row" role="search" aria-label="동작 검색창">
              <label className="library-search">
                <Search size={19} aria-hidden="true" />
                <span className="sr-only" id="atlas-search-input-label">
                  동작 검색
                </span>
                <input
                  ref={searchInput}
                  type="search"
                  aria-label="동작 검색"
                  value={filters.search}
                  onChange={(event) => update('search', event.target.value)}
                  placeholder="한글·영문 이름, 부위·기구·소도구로 검색"
                />
                {filters.search && (
                  <PfButton
                    variant="icon"
                    onClick={clearSearch}
                    aria-label="검색어 지우기"
                    aria-describedby="atlas-search-input-label"
                  >
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
                <ApparatusIconBadge apparatus="all" size="xs" decorative /> 전체 기구{' '}
                <span>{exercises.length}</span>
              </button>
              {EQUIPMENT_OPTIONS.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={filters.equipment.includes(item.id) ? 'selected' : ''}
                  aria-pressed={filters.equipment.includes(item.id)}
                  onClick={() => update('equipment', toggleSelection(filters.equipment, item.id))}
                >
                  <ApparatusIconBadge apparatus={item.id} size="xs" decorative /> {item.labelKo}
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
                {activeFilterChips.length >= 2 && (
                  <button
                    type="button"
                    className="library-active-filter-clear-all"
                    onClick={resetFilters}
                  >
                    전체 해제
                  </button>
                )}
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
                    <option value="pending">내 검토 전 · 직접 구성 가능 (자동 추천 제외)</option>
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
                      checked={exerciseBrowseScope === 'owned'}
                      onChange={(event) =>
                        setExerciseBrowseScope(event.target.checked ? 'owned' : 'all')
                      }
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
            {inspectedExercise && (
              <LibraryMovementInspector
                exercise={inspectedExercise}
                headingRef={inspectorHeading}
                isInResults={Boolean(inspectedExercise && filteredIdSet.has(inspectedExercise.id))}
                onClose={closeInspector}
                onOpenDetails={(exercise) =>
                  isMovementIdeaExercise(exercise) && onOpenIdeaSheet
                    ? onOpenIdeaSheet(exercise)
                    : onOpenYouTubePreview(exercise)
                }
                onAdd={addExercise}
                addedId={addedId}
              />
            )}
            <div className="library-notes-results">
              <div className="library-results-bar">
                <p role="status" aria-live="polite">
                  <strong>{filtered.length}</strong>개의 동작{' '}
                  <span className="muted">· 이름을 선택하면 상세 정보를 볼 수 있어요</span>
                </p>
                {(activeFilterCount > 0 || filters.search) && (
                  <PfButton variant="ghost" onClick={resetFilters}>
                    필터 초기화 <X size={13} />
                  </PfButton>
                )}
              </div>
              <div className="atlas-results-context-row">
                <p className="ml-review-note">개인 검토 상태와 출처는 동작 상세에서 확인하세요.</p>
                <p className="atlas-current-class-pill" data-testid="atlas-current-class-criteria">
                  현재 수업 기준:{' '}
                  <strong>{APPARATUS_CRITERIA_LABELS[effectiveCriteria.apparatus]}</strong> · 최대
                  Lv {effectiveCriteria.level} · 목표 {effectiveCriteria.targetMinutes}분
                </p>
              </div>

              {comparedExercises.length > 0 && (
                <section
                  className="atlas-compare-region"
                  aria-label="선택 동작 비교"
                  data-testid="atlas-compare-region"
                  onKeyDown={(event) => {
                    if (event.key === 'Escape' && compareState.expanded) {
                      event.preventDefault();
                      event.stopPropagation();
                      collapseComparePanel();
                    }
                  }}
                >
                  <div className="atlas-compare-bar">
                    <div className="atlas-compare-summary">
                      <span className="atlas-compare-count">
                        <Layers size={14} aria-hidden="true" />
                        비교 후보 {comparedExercises.length}/{MAX_COMPARE_ITEMS}개
                      </span>
                      <span className="atlas-compare-hint">
                        {comparedExercises.length < 2
                          ? '다른 후보를 1~2개 더 담으면 나란히 비교할 수 있어요 (검색·필터 변경 시에도 유지).'
                          : '검색어·필터를 바꿔도 비교 후보가 유지됩니다. 비교 후 원하는 동작을 바로 추가하세요.'}
                      </span>
                    </div>
                    <div className="atlas-compare-bar-actions">
                      <div
                        className="atlas-compare-brand-pills"
                        role="group"
                        aria-label="비교함 기구 브랜드 스프링 기준"
                        data-testid="atlas-compare-brand-switcher"
                      >
                        {BRAND_SPRING_OPTIONS.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            className={`atlas-compare-brand-chip ${
                              reformerBrand === opt.id ? 'is-active' : ''
                            }`.trim()}
                            aria-pressed={reformerBrand === opt.id}
                            onClick={() => setReformerBrand(opt.id)}
                          >
                            {opt.shortLabelKo}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        ref={compareExpandBtnRef}
                        className="atlas-compare-expand-btn"
                        aria-expanded={compareState.expanded}
                        aria-controls="atlas-compare-grid"
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
                          : `비교표 펼치기 (${comparedExercises.length})`}
                      </button>
                      <button
                        type="button"
                        className="atlas-compare-clear-btn"
                        onClick={clearComparedExercises}
                      >
                        비교 비우기 <X size={13} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <ul className="atlas-compare-chips" aria-label="비교 후보 목록">
                    {comparedExercises.map((item, idx) => (
                      <li className="atlas-compare-chip" key={item.id}>
                        <span className="atlas-compare-chip-label">
                          {idx + 1}. {item.nameKo}
                        </span>
                        <button
                          type="button"
                          className="atlas-compare-chip-remove"
                          aria-label={`${item.nameKo} 비교에서 제거`}
                          onClick={() => removeComparedExercise(item.id)}
                        >
                          <X size={13} aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  {compareState.limitNotice && (
                    <p className="atlas-compare-limit-notice" role="status" aria-live="polite">
                      {compareState.limitNotice}
                    </p>
                  )}
                  {compareState.expanded && (
                    <div id="atlas-compare-grid" className="atlas-compare-grid">
                      {comparedExercises.map((item) => {
                        const itemPatterns = getMotionPatternReferences(item.id);
                        const itemSourceOnly =
                          getExpandedMovementVisualBinding(item)?.nativeMotionAvailable === false;
                        const itemKinematic = itemSourceOnly
                          ? null
                          : getCatalogContinuousMotionAsset(item);
                        const itemReadiness = evaluateCardSequenceReadiness(
                          item,
                          sequenceMovementSteps,
                          effectiveCriteria,
                          ownedEquipment,
                          ownedProps,
                        );
                        const itemProvenance = getMovementProvenance(item);
                        const itemApproved = isExerciseAutoEligible(item);
                        const itemReviewState = getExerciseReviewState(item);
                        const itemIsIdea = isMovementIdeaExercise(item);
                        const itemIdeaMeta = itemIsIdea ? readMovementIdeaDraft(item) : null;
                        const itemInResults = filteredIdSet.has(item.id);
                        const itemEqMeta = getExerciseEquipment(item);
                        const itemInSeq = itemReadiness.status === 'in-sequence';
                        const itemBrandSpring = formatBrandSpringEquivalent(
                          item.springs,
                          reformerBrand,
                          item.apparatus,
                        );

                        return (
                          <article
                            key={item.id}
                            className={`atlas-compare-card ${itemInSeq ? 'is-in-sequence' : ''}`.trim()}
                            data-testid={`atlas-compare-card-${item.id}`}
                          >
                            <div className="atlas-compare-card-top">
                              <div className="atlas-compare-card-titles">
                                <h3>{item.nameKo}</h3>
                                <p>{item.nameEn}</p>
                                {!itemInResults && (
                                  <span className="atlas-compare-filter-note">
                                    현재 필터 밖 · 비교 유지됨
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                className="atlas-compare-chip-remove"
                                aria-label={`비교표에서 ${item.nameKo} 닫기`}
                                onClick={() => removeComparedExercise(item.id)}
                              >
                                <X size={15} aria-hidden="true" />
                              </button>
                            </div>

                            <div
                              className="atlas-compare-3d-strip"
                              data-testid={`atlas-compare-3d-strip-${item.id}`}
                              aria-label={`${item.nameKo} ${itemSourceOnly ? '영상 참고' : '3단계 동작 도해'}`}
                            >
                              {itemSourceOnly ? (
                                <figure className="atlas-compare-3d-frame atlas-compare-video-reference">
                                  <ExerciseMotionArtwork exercise={item} />
                                  <figcaption>제작자 영상으로 동작 확인</figcaption>
                                </figure>
                              ) : (
                                (
                                  [
                                    { key: 'start', label: '시작' },
                                    { key: 'middle', label: '전환·정점' },
                                    { key: 'end', label: '복귀' },
                                  ] as const
                                ).map((frame) => (
                                  <figure key={frame.key} className="atlas-compare-3d-frame">
                                    <ExerciseMotionArtwork exercise={item} phase={frame.key} />
                                    <figcaption>{frame.label}</figcaption>
                                  </figure>
                                ))
                              )}
                            </div>

                            <div className="atlas-compare-visual-bar">
                              <button
                                type="button"
                                className="atlas-compare-art-btn is-compact-link"
                                aria-label={`비교함에서 ${item.nameKo} ${itemSourceOnly ? '영상 보기' : '도해 미리보기'}`}
                                onClick={(event) => {
                                  if (itemPatterns[0]) {
                                    openPatternPreview(itemPatterns[0], event.currentTarget);
                                  } else if (itemKinematic) {
                                    openCatalogMotionPreview(item.id, event.currentTarget);
                                  } else {
                                    onOpenYouTubePreview(item);
                                  }
                                }}
                              >
                                <span>
                                  {itemSourceOnly
                                    ? '제작자 영상 보기'
                                    : itemPatterns[0]
                                      ? '2D 패턴 초안'
                                      : itemKinematic
                                        ? '5단계 기구학 도해'
                                        : '전체 상세'}
                                </span>
                                <Play size={11} aria-hidden="true" />
                              </button>
                            </div>

                            <dl className="atlas-compare-specs">
                              <div>
                                <dt>기구·스프링</dt>
                                <dd>
                                  {APPARATUS_LABELS[item.apparatus].ko}
                                  {item.springs?.trim() ? ` · ${item.springs}` : ''}
                                  {!itemBrandSpring.isNonSpringApparatus &&
                                    ` (${itemBrandSpring.brandShortLabelKo}: ${itemBrandSpring.equivalentLabelKo})`}
                                  {itemEqMeta.requiredProps.length > 0
                                    ? ` · ${itemEqMeta.requiredProps.map(propLabel).join('·')}`
                                    : ''}
                                </dd>
                              </div>
                              <div>
                                <dt>자세·난이도</dt>
                                <dd>
                                  {POSITION_LABELS[item.bodyPosition].ko} ·{' '}
                                  {LEVEL_NAMES[item.level]} (Lv {item.level})
                                </dd>
                              </div>
                              <div>
                                <dt>계획 시간</dt>
                                <dd>
                                  {item.defaultDurationMin}분
                                  {item.isUnilateral ? ' · 양쪽 포함' : ''}
                                </dd>
                              </div>
                              <div>
                                <dt>타겟 부위</dt>
                                <dd>
                                  {itemIsIdea
                                    ? itemIdeaMeta?.subjectiveFeeling ||
                                      itemIdeaMeta?.ideaLine ||
                                      item.cues[0]
                                    : item.targetMuscles.slice(0, 3).join(' · ') ||
                                      item.cues[0] ||
                                      '체간 안정 · 호흡 연결'}
                                </dd>
                              </div>
                              <div>
                                <dt>주의·안전</dt>
                                <dd className="atlas-compare-precaution">
                                  {item.precautions?.trim() ||
                                    '별도 주의 메모 없음 · 회원별 가동 범위를 직접 확인하세요.'}
                                </dd>
                              </div>
                              <div>
                                <dt>검토·출처</dt>
                                <dd>
                                  {itemIsIdea
                                    ? '내 창작 메모 · 전문가 검증 아님'
                                    : itemApproved
                                      ? '내 개인 검토 완료'
                                      : itemReviewState === 'stale'
                                        ? '정보 변경 · 재검토 필요'
                                        : '개인 검토 전 · 자동 추천 제외'}{' '}
                                  ({item.sourceReference?.publisher || itemProvenance.shortLabel})
                                </dd>
                              </div>
                              <div>
                                <dt>수업 적합도</dt>
                                <dd
                                  className={
                                    itemReadiness.status === 'ready' ||
                                    itemReadiness.status === 'in-sequence'
                                      ? 'atlas-compare-status-ok'
                                      : 'atlas-compare-status-warn'
                                  }
                                >
                                  {itemReadiness.label}
                                </dd>
                              </div>
                            </dl>

                            <div className="atlas-compare-actions">
                              <button
                                type="button"
                                className="atlas-compare-inspect-btn"
                                aria-label={`비교함에서 ${item.nameKo} 세부 안내 열기`}
                                onClick={(event) => inspectExercise(item, event.currentTarget)}
                              >
                                세부 안내
                              </button>
                              <button
                                type="button"
                                className={`atlas-compare-add-btn ${itemInSeq ? 'is-in-sequence' : ''}`.trim()}
                                aria-label={`비교함에서 ${item.nameKo} 수업안에 추가`}
                                onClick={() => addExercise(item)}
                              >
                                {addedId === item.id || itemInSeq ? (
                                  <Check size={14} aria-hidden="true" />
                                ) : (
                                  <Plus size={14} aria-hidden="true" />
                                )}
                                <span>
                                  {addedId === item.id
                                    ? '추가됨'
                                    : itemReadiness.status === 'in-sequence'
                                      ? `수업안 #${itemReadiness.orderNumber} 포함`
                                      : '동작 추가'}
                                </span>
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {filtered.length > 0 ? (
                <div className="movement-card-grid" ref={cardGridRef}>
                  {filtered.slice(0, notesVisibleCount).map((exercise) => {
                    const provenance = getMovementProvenance(exercise);
                    const reviewState = getExerciseReviewState(exercise);
                    const approved = isExerciseAutoEligible(exercise);
                    const isIdea = isMovementIdeaExercise(exercise);
                    const ideaMeta = isIdea ? readMovementIdeaDraft(exercise) : null;
                    const patterns = getMotionPatternReferences(exercise.id);
                    const sourceOnly =
                      getExpandedMovementVisualBinding(exercise)?.nativeMotionAvailable === false;
                    const cardMotion = sourceOnly
                      ? null
                      : getCatalogContinuousMotionAsset(exercise);
                    const isFavorite = exercise.favoriteTag !== 'none';
                    const readiness = evaluateCardSequenceReadiness(
                      exercise,
                      sequenceMovementSteps,
                      effectiveCriteria,
                      ownedEquipment,
                      ownedProps,
                    );
                    const inSequence = readiness.status === 'in-sequence';
                    const compareIndex = comparedExercises.findIndex(
                      (candidate) => candidate.id === exercise.id,
                    );
                    const isCompared = compareIndex >= 0;
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
                        data-readiness={readiness.status}
                        className={`movement-card movement-${exercise.apparatus} ${
                          inSequence ? 'is-in-sequence' : ''
                        } ${inspectedExerciseId === exercise.id ? 'is-inspected' : ''} ${
                          isCompared ? 'is-compared' : ''
                        }`.trim()}
                        key={exercise.id}
                      >
                        <div className="movement-card-art pf-p06-3d-art">
                          <button
                            type="button"
                            className="movement-art-trigger pf-p06-3d-trigger"
                            aria-label={`${exercise.nameKo} 상세 보기`}
                            onClick={() =>
                              isIdea && onOpenIdeaSheet
                                ? onOpenIdeaSheet(exercise)
                                : onOpenYouTubePreview(exercise)
                            }
                            aria-describedby={`motion-caption-${exercise.id}`}
                          >
                            {hasValidIdeaPhoto && ideaMeta?.photoDataUrl ? (
                              <img
                                src={ideaMeta.photoDataUrl}
                                alt=""
                                aria-hidden="true"
                                className="pf-p06-3d-img"
                                loading="lazy"
                                onError={() =>
                                  setBrokenPhotoIds((previous) => ({
                                    ...previous,
                                    [exercise.id]: true,
                                  }))
                                }
                              />
                            ) : (
                              <ExerciseMotionArtwork
                                exercise={exercise}
                                className="pf-p06-motion-art"
                              />
                            )}
                            <span className="pf-b05-card-overlay-top" aria-hidden="true">
                              <span className="pf-b05-pill is-dark">
                                {APPARATUS_LABELS[exercise.apparatus].ko} ·{' '}
                                {CANONICAL_BLOCKS.find((b) => b.category === exercise.blockCategory)
                                  ?.nameKo ?? '본운동'}
                              </span>
                              {exercise.springs && (
                                <span className="pf-b05-pill is-light">{exercise.springs}</span>
                              )}
                            </span>
                            <span className="pf-b05-card-overlay-bottom" aria-hidden="true">
                              <span className="pf-b05-pill is-coral">
                                ● {exercise.targetMuscles.slice(0, 2).join('·') || '코어·정렬'}
                              </span>
                            </span>
                            <span
                              className="art-caption sr-only"
                              id={`motion-caption-${exercise.id}`}
                            >
                              {sourceOnly
                                ? `${exercise.nameKo} · 제작자 영상 참고`
                                : `${cardMotion?.visualAsset.archetypeTitleKo ?? exercise.nameKo} · 동작 패턴 도해`}
                            </span>
                          </button>
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
                            {readiness.status === 'in-sequence' && (
                              <PfBadge tone="sage" className="movement-selected-badge">
                                <Check size={11} aria-hidden="true" /> {readiness.label}
                              </PfBadge>
                            )}
                            {readiness.status === 'family-conflict' && (
                              <PfBadge
                                tone="neutral"
                                className="atlas-card-conflict-badge"
                                data-testid={`card-conflict-${exercise.id}`}
                              >
                                {readiness.label}
                              </PfBadge>
                            )}
                            {readiness.status === 'criteria-mismatch' && (
                              <PfBadge
                                tone="neutral"
                                className="atlas-card-mismatch-badge"
                                data-testid={`card-mismatch-${exercise.id}`}
                              >
                                {readiness.label}
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
                            <SpringVisualPills springs={exercise.springs} />
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
                                ? '내 개인 검토 완료'
                                : reviewState === 'stale'
                                  ? '동작 정보 변경 · 다시 검토 필요'
                                  : '개인 검토 전'}
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
                          {sourceOnly ? (
                            <div className="ml-card-patterns">
                              <p>
                                동작별 제작자 영상 <span>· 원문·제목 확인</span>
                              </p>
                              <button type="button" onClick={() => onOpenYouTubePreview(exercise)}>
                                <Play size={13} /> {exercise.nameKo} 영상 보기
                              </button>
                            </div>
                          ) : patterns.length > 0 ? (
                            <div className="ml-card-patterns">
                              <p>
                                관련 패턴 도해 {patterns.length}종 <span>· 참고용 초안</span>
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
                          ) : cardMotion ? (
                            <div className="ml-card-patterns">
                              <p>
                                기구학 연속·3단계 도해 1종 <span>· 출처 대조 확인</span>
                              </p>
                              <button
                                type="button"
                                className={
                                  previewCatalogMotionId === exercise.id ? 'is-selected' : undefined
                                }
                                aria-pressed={previewCatalogMotionId === exercise.id}
                                onClick={(event) =>
                                  openCatalogMotionPreview(exercise.id, event.currentTarget)
                                }
                              >
                                <Play size={13} /> {exercise.nameKo} 기구학 도해 보기
                              </button>
                            </div>
                          ) : null}
                          <div className="movement-card-footer">
                            <div className="atlas-card-secondary-actions">
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
                                className={`atlas-compare-toggle ${
                                  isCompared ? 'is-compared' : ''
                                }`.trim()}
                                aria-pressed={isCompared}
                                aria-label={`${exercise.nameKo} 비교 담기`}
                                onClick={(event) =>
                                  toggleCompareExercise(exercise, event.currentTarget)
                                }
                              >
                                {isCompared ? (
                                  <Check size={14} aria-hidden="true" />
                                ) : (
                                  <Layers size={14} aria-hidden="true" />
                                )}
                                <span>{isCompared ? `비교 중 (${compareIndex + 1})` : '비교'}</span>
                              </button>
                            </div>
                            <button
                              type="button"
                              className={`movement-add ${
                                addedId === exercise.id
                                  ? 'just-added'
                                  : inSequence
                                    ? 'is-in-sequence-cta'
                                    : ''
                              }`.trim()}
                              onClick={() => addExercise(exercise)}
                              aria-label={`${exercise.nameKo} 수업안에 추가`}
                            >
                              {addedId === exercise.id || inSequence ? (
                                <Check size={16} />
                              ) : (
                                <Plus size={16} />
                              )}
                              <span>
                                {addedId === exercise.id
                                  ? '추가됨'
                                  : readiness.status === 'in-sequence'
                                    ? `수업안 #${readiness.orderNumber} 포함`
                                    : '동작 추가'}
                              </span>
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
                  <h2 id="atlas-empty-heading">조건에 맞는 동작이 없어요.</h2>
                  {(filters.search.trim() ||
                    activeFilterCount > 0 ||
                    exerciseBrowseScope === 'owned') && (
                    <p className="library-empty-context" data-testid="atlas-empty-filter-summary">
                      {filters.search.trim() ? `‘${filters.search.trim()}’ 검색어` : ''}
                      {filters.search.trim() && activeFilterCount > 0 ? ' · ' : ''}
                      {activeFilterCount > 0
                        ? `필터 ${activeFilterCount}개 적용 중 (${activeFilterChips
                            .filter((chip) => chip.key !== 'search')
                            .map((chip) => chip.label)
                            .join(', ')})`
                        : ''}
                      {exerciseBrowseScope === 'owned'
                        ? `${filters.search.trim() || activeFilterCount > 0 ? ' · ' : ''}내 보유 장비 범위`
                        : ''}
                    </p>
                  )}
                  <p className="muted">
                    {exerciseBrowseScope === 'owned'
                      ? '내 보유 장비 범위에서 일치하는 동작이 없습니다. 설정의 기구·소도구 또는 검색 조건을 확인해 주세요.'
                      : '검색어를 줄이거나 필터를 조정해 보세요.'}
                    <br />
                    직접 찾은 유튜브 레퍼런스도 추가할 수 있어요.
                  </p>
                  <div
                    className="library-empty-actions"
                    role="group"
                    aria-label="빈 검색 결과 복구"
                  >
                    {filters.search.trim() && (
                      <PfButton
                        variant="secondary"
                        onClick={clearSearch}
                        aria-describedby="atlas-empty-heading"
                      >
                        검색어 지우기
                      </PfButton>
                    )}
                    {hasSearchOrFilters && (
                      <PfButton variant="secondary" onClick={resetFilters}>
                        검색·필터 초기화
                      </PfButton>
                    )}
                    <PfButton
                      variant="primary"
                      onClick={() => {
                        setExerciseBrowseScope('all');
                        resetFilters();
                      }}
                    >
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
          <section className="library-reference-tools" aria-label="동작 도해와 참고 자료">
            <details className="library-asset-status">
              <summary>
                <span>도해 초안 {MOTION_PATTERN_REFERENCES.length}개</span>
                <span className="library-asset-status-warning">전문가 검토 전</span>
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
            <p className="library-asset-status-note">
              관련 패턴 참고용 · 검증된 운동 시범이 아닙니다.
            </p>
            <details
              className="library-motion-examples library-asset-status"
              open={showMotionExamples}
              onToggle={(event) => setShowMotionExamples(event.currentTarget.open)}
            >
              <summary>
                <span>동작 도해</span>
                <ChevronDown size={16} aria-hidden="true" />
              </summary>
              {showMotionExamples && (
                <KinematicSchematicShowcase
                  onQuickSearchKeyword={(keyword) => {
                    update('search', keyword);
                    focusSearch();
                  }}
                />
              )}
            </details>
            <details
              className="library-apparatus-reference library-asset-status"
              open={showApparatusGuide}
              onToggle={(event) => setShowApparatusGuide(event.currentTarget.open)}
            >
              <summary>
                <span>기구 설정 참고</span>
                <ChevronDown size={16} aria-hidden="true" />
              </summary>
              {showApparatusGuide && (
                <ApparatusVisualGuideRibbon
                  activeApparatusId={filters.equipment[0] ?? 'reformer'}
                  mode="atlas"
                  onSelectApparatus={(id) => {
                    update('equipment', [id]);
                    focusSearch();
                  }}
                />
              )}
            </details>
          </section>
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

          {(previewReference || previewCatalogMotionId) && (
            <section className="ml-direct-preview" aria-label="선택한 패턴 도해 미리보기">
              <div className="ml-preview-heading">
                <h2 tabIndex={-1} ref={previewHeading}>
                  {previewReference ? '패턴 도해 미리보기' : '기구학 연속 도해 미리보기'}
                </h2>
                <button
                  type="button"
                  onClick={closePatternPreview}
                  aria-label="패턴 도해 미리보기 닫기"
                >
                  <X size={18} />
                </button>
              </div>
              {previewReference ? (
                <MotionPatternPreview
                  key={`${previewReference.family}-${previewReference.variantId}`}
                  reference={previewReference}
                />
              ) : previewCatalogMotionAsset ? (
                <CatalogMotionInteractivePlayer
                  key={previewCatalogMotionId}
                  asset={previewCatalogMotionAsset}
                />
              ) : null}
              {(() => {
                const previewExercise = previewReference
                  ? exercises.find((item) => previewReference.intendedExerciseIds.includes(item.id))
                  : previewCatalogMotionId
                    ? exercises.find((item) => item.id === previewCatalogMotionId)
                    : undefined;
                if (!previewExercise) return null;
                const previewApproved = isExerciseAutoEligible(previewExercise);
                return (
                  <section
                    className="ml-preview-exercise-summary"
                    aria-label="연결 동작 설명·주의점 및 동작 추가"
                  >
                    <div className="ml-preview-exercise-header">
                      <strong>연결 동작 노트 · {previewExercise.nameKo}</strong>
                      <span>
                        {previewApproved
                          ? '내 검토 기록 있음 · 전문가 검증 아님'
                          : '개인 검토 전 · 직접 추가 가능'}
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
                        <Plus size={15} aria-hidden="true" /> 동작 추가
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
              기본 동작은 개인 검토 기록 전에도 직접 수업안에 담을 수 있으며, 자동 추천·AI 초안
              구성에는 내 강사 검토 기록이 있는 항목만 사용됩니다. 현재 내 강사 검토{' '}
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
                개 · 기존 출처 대조 자료{' '}
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
        {sequenceMovementSteps.length > 0 && (
          <div className="atlas-selection-sequence-strip" aria-label="현재 수업안 동작 순서">
            <span className="atlas-selection-total-time">
              계획 {formatSecondsToMMSS(sequenceTotalSeconds)}
            </span>
            <ul className="atlas-selection-sequence-list">
              {sequenceMovementSteps.slice(0, 4).map((entry) => {
                const stepExercise = entry.exercise;
                if (!stepExercise) return null;
                return (
                  <li key={entry.step.stepId}>
                    <button
                      type="button"
                      className="atlas-selection-step-chip"
                      aria-label={`담긴 동작 ${entry.orderNumber}번 ${stepExercise.nameKo} 정보 보기`}
                      onClick={(event) => inspectExercise(stepExercise, event.currentTarget)}
                    >
                      #{entry.orderNumber} {stepExercise.nameKo}
                    </button>
                  </li>
                );
              })}
            </ul>
            {sequenceMovementSteps.length > 4 && (
              <span className="atlas-selection-more">+{sequenceMovementSteps.length - 4}개 더</span>
            )}
          </div>
        )}
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
