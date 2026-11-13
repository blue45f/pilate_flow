import { PostureAnatomyGuide } from './PostureAnatomyGuide';
import { ApparatusIconBadge } from './ApparatusStudioArtwork';
import { StudioClinicalBriefCard } from './StudioClinicalBriefCard';
import { Studio3DMotionHeroCard } from './Studio3DMotionHeroCard';
import { SpringVisualPills } from './SpringVisualPills';
import { useState, type RefObject } from 'react';
import { ArrowUpRight, Check, ExternalLink, Info, Plus, X } from 'lucide-react';
import { APPARATUS_LABELS, POSITION_LABELS } from '../data/pilatesCatalog';
import { normalizeReferenceUrlPolicy } from '../features/referenceLinkPolicyCandidate';
import { usePilatesStore } from '../store/usePilatesStore';
import { formatBrandSpringEquivalent } from '../utils/brandSpringConverter';
import { getExerciseEvidence } from '../utils/exerciseEvidence';
import { getExerciseReviewState, isExerciseAutoEligible } from '../utils/exerciseReview';
import type { PilatesExercise } from '../types/pilates';
import '../styles/library-inspector-usability.css';

export interface LibraryMovementInspectorProps {
  exercise: PilatesExercise | null;
  headingRef: RefObject<HTMLHeadingElement | null>;
  isInResults: boolean;
  onClose: () => void;
  onOpenDetails: (exercise: PilatesExercise) => void;
  onAdd: (exercise: PilatesExercise) => void;
  addedId: string | null;
}

const LEVEL_LABELS = { '1.0': '기초', '1.5': '중급', '2.0': '심화' };
const FOOTBAR_LABELS: Record<PilatesExercise['footbar'], string> = {
  high: '높게',
  mid: '중간',
  low: '낮게',
  down: '내림',
  none: '사용 안 함',
};
const HEADREST_LABELS: Record<PilatesExercise['headrest'], string> = {
  up: '올림',
  flat: '평평하게',
  down: '내림',
};

export function LibraryMovementInspector({
  exercise,
  headingRef,
  isInResults,
  onClose,
  onOpenDetails,
  onAdd,
  addedId,
}: LibraryMovementInspectorProps) {
  const reformerBrand = usePilatesStore((s) => s.reformerBrand);
  const [showReferenceGuide, setShowReferenceGuide] = useState(false);
  const reviewState = exercise ? getExerciseReviewState(exercise) : null;
  const autoEligible = exercise ? isExerciseAutoEligible(exercise) : false;
  const evidence = exercise ? getExerciseEvidence(exercise) : null;
  const isAdded = Boolean(exercise && addedId === exercise.id);
  const brandSpring = exercise
    ? formatBrandSpringEquivalent(exercise.springs, reformerBrand, exercise.apparatus)
    : null;

  const safeLinks = evidence
    ? evidence.links.flatMap((link) => {
        const policy = normalizeReferenceUrlPolicy(link.href, {
          embedPolicy: 'external-link-only',
          forbidTimeSeekTransplant: link.kind === 'source',
        });
        if (!policy.ok || !policy.canonicalExternalUrl) return [];
        return [
          {
            kind: link.kind,
            label: link.label,
            href: policy.canonicalExternalUrl,
          },
        ];
      })
    : [];

  const personalReviewBadge =
    reviewState === 'approved'
      ? `내 검토 완료${exercise?.review?.reviewerAlias ? ` (${exercise.review.reviewerAlias})` : ''}`
      : reviewState === 'stale'
        ? '정보 변경 · 재검토 필요'
        : '개인 검토 전';

  const eligibilityBadge = autoEligible
    ? '직접 추가 가능 · 자동 추천 포함'
    : '직접 추가 가능 · 자동 추천 제외';

  const sourceBadge = evidence
    ? `${evidence.source.label} · ${evidence.provenance.shortLabel}`
    : '';

  const sourceSummaryLabel = evidence
    ? evidence.source.publisher
      ? `${evidence.source.publisher} (${evidence.source.label})`
      : `${evidence.provenance.label} (${evidence.source.label})`
    : '';

  const reviewHeadline =
    reviewState === 'approved'
      ? '내 개인 검토 완료 · 직접 추가 및 자동 추천 가능 (외부 인증 아님)'
      : reviewState === 'stale'
        ? '동작 정보 변경됨 · 재검토 필요 (직접 추가 가능 · 자동 추천 제외)'
        : '개인 검토 전 · 직접 추가 가능 (자동 추천·AI 초안 제외)';

  const reviewDetail =
    reviewState === 'approved'
      ? `내가 확인한 수업 계획 메타데이터입니다${exercise?.review?.reviewerAlias ? ` (별칭: ${exercise.review.reviewerAlias})` : ''}. 외부 기관의 자격 인증이나 개별 동작 임상 승인이 아닙니다.`
      : reviewState === 'stale'
        ? '이전 개인 검토 기록 이후 동작 정보가 바뀌어 자동 추천에서 제외되었습니다. 변경 내용을 원문과 대조해 다시 검토하세요.'
        : '아직 이 동작에 내 강사 검토 기록이 없습니다. 검토 전에도 수업안에 직접 추가할 수 있으며, 자동 추천에는 개인 검토 완료 후 포함됩니다.';

  const hasMalformedSourceAttempt = Boolean(
    exercise &&
    safeLinks.length === 0 &&
    (evidence?.source.kind === 'invalid-record' || Boolean(exercise.youtube.url.trim())),
  );

  return (
    <aside
      id="library-movement-inspector"
      className="library-movement-inspector"
      data-empty={!exercise}
      aria-labelledby="library-inspector-heading"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && exercise) {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <div className="library-inspector-header">
        <div className="library-inspector-title-group">
          <span className="library-inspector-step-badge" data-testid="inspector-flow-step-badge">
            {exercise ? '3 세부 안내 확인·수업안 추가' : '2 동작 카드 선택 대기'}
          </span>
          <h2 id="library-inspector-heading" ref={headingRef} tabIndex={-1}>
            선택한 동작 정보
          </h2>
        </div>
        {exercise && (
          <button type="button" onClick={onClose} aria-label="선택한 동작 정보 닫기">
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>
      {exercise ? (
        <div className="library-inspector-content">
          {!isInResults && (
            <p className="library-inspector-filter-note" role="status">
              현재 검색 결과에 없는 동작입니다. 선택한 정보는 유지했어요.
            </p>
          )}
          <div className="library-inspector-heading-row">
            <ApparatusIconBadge
              apparatus={exercise.apparatus}
              bodyPosition={exercise.bodyPosition}
              size="xs"
              decorative
            />
            <h3>{exercise.nameKo}</h3>
          </div>
          <p className="library-inspector-english">{exercise.nameEn}</p>

          <div className="pf-inspector-3sec-grid" aria-label="선택 동작 핵심 3요소 요약">
            <div className="pf-inspector-3sec-item">
              <span>{exercise.apparatus === 'mat' ? '사용 기구' : '기구 설정'}</span>
              <div>
                {exercise.springs ? (
                  <SpringVisualPills springs={exercise.springs} />
                ) : (
                  <strong>{APPARATUS_LABELS[exercise.apparatus].ko}</strong>
                )}
                {brandSpring && !brandSpring.isNonSpringApparatus && (
                  <small
                    className="pf-inspector-brand-spring-note"
                    data-testid="inspector-brand-spring-equivalent"
                  >
                    {brandSpring.brandShortLabelKo}: {brandSpring.equivalentLabelKo}
                  </small>
                )}
                {exercise.apparatus === 'reformer' && (
                  <small>
                    풋바 {FOOTBAR_LABELS[exercise.footbar]} · 헤드레스트{' '}
                    {HEADREST_LABELS[exercise.headrest]}
                  </small>
                )}
              </div>
            </div>
            <div className="pf-inspector-3sec-item">
              <span>호흡 &amp; 템포</span>
              <strong>{exercise.breathPattern || '흉곽 호흡 유지'}</strong>
            </div>
            {exercise.cues.length > 0 && (
              <div className="pf-inspector-3sec-item is-wide">
                <span>핵심 티칭 큐</span>
                <p>{exercise.cues.slice(0, 2).join(' · ')}</p>
              </div>
            )}
          </div>

          <div
            className="library-inspector-fact-strip"
            data-testid="inspector-fact-distinction"
            aria-label="검토 상태·활용 자격·출처 구분"
          >
            <span
              className={`inspector-fact-pill is-review-${reviewState ?? 'pending'}`}
              data-testid="inspector-personal-review-badge"
            >
              {personalReviewBadge}
            </span>
            <span
              className={`inspector-fact-pill ${autoEligible ? 'is-auto-eligible' : 'is-manual-only'}`}
              data-testid="inspector-eligibility-badge"
            >
              {eligibilityBadge}
            </span>
            <span
              className="inspector-fact-pill is-source"
              data-testid="inspector-source-status-badge"
            >
              {sourceBadge}
            </span>
          </div>

          <dl className="library-inspector-spec-list">
            <div>
              <dt>기구</dt>
              <dd>{APPARATUS_LABELS[exercise.apparatus].ko}</dd>
            </div>
            <div>
              <dt>난이도</dt>
              <dd>{LEVEL_LABELS[exercise.level]}</dd>
            </div>
            <div>
              <dt>자세</dt>
              <dd>{POSITION_LABELS[exercise.bodyPosition].ko}</dd>
            </div>
            <div>
              <dt>계획 시간</dt>
              <dd>
                {exercise.defaultDurationMin}분{exercise.isUnilateral ? ' · 양쪽 포함' : ''}
              </dd>
            </div>
            <div>
              <dt>출처 구분</dt>
              <dd>{sourceSummaryLabel}</dd>
            </div>
          </dl>

          {exercise.precautions?.trim() && (
            <section className="library-inspector-precautions">
              <h4>
                {reviewState === 'approved'
                  ? '기존 주의 메모 · 내 검토 확인'
                  : '기존 주의 메모 · 원문 확인 필요'}
              </h4>
              <p>{exercise.precautions}</p>
            </section>
          )}

          <section
            className="library-inspector-reference-step"
            data-testid="inspector-reference-step"
          >
            <h4>이 동작의 참고자료 원문 확인</h4>
            {safeLinks.length > 0 ? (
              <div className="library-inspector-reference-links">
                {safeLinks.map((link) => (
                  <a
                    key={`${link.kind}-${link.href}`}
                    className="btn-secondary library-inspector-source-link"
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>
                      {link.label}
                      {evidence?.source.publisher ? ` · ${evidence.source.publisher}` : ''}
                    </span>
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                ))}
                <p className="library-inspector-reference-note">
                  외부 원문 링크만 열며 자동 재생이나 자동 검토 승인은 일어나지 않습니다. 원문과
                  실제 동작 일치 여부를 직접 확인하세요.
                </p>
              </div>
            ) : (
              <p className="library-inspector-no-source" data-testid="inspector-no-external-source">
                {hasMalformedSourceAttempt
                  ? '등록된 출처·영상 주소 형식을 확인할 수 없어 외부 링크를 열지 않습니다. 전체 정보·개인 검토에서 주소를 확인하세요.'
                  : '연결된 외부 원문 링크 없음 — 미확인 원문이나 개별 동작 대조가 확인된 것처럼 표시하지 않습니다.'}
              </p>
            )}
          </section>

          <section
            className="library-inspector-review"
            data-testid="inspector-review-section"
            data-review-state={reviewState ?? 'pending'}
          >
            <h4>개인 검토 상태와 수업 활용</h4>
            <p
              className="library-inspector-review-headline"
              data-testid="inspector-review-status-text"
            >
              {reviewHeadline}
            </p>
            <p className="library-inspector-review-detail">{reviewDetail}</p>
            <p className="library-inspector-safety">
              <Info size={15} aria-hidden="true" />
              개인 검토 완료, 동작별 원문 근거, 기구별 공통 참고 문구는 서로 다른 사실입니다. 현재
              자료는 원문·현장 기구 확인이 필요한 참고정보입니다.
            </p>
          </section>

          <div className="library-inspector-actions">
            <button type="button" className="btn-secondary" onClick={() => onOpenDetails(exercise)}>
              전체 정보·개인 검토 열기 <ArrowUpRight size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="btn-primary"
              data-added={isAdded ? 'true' : 'false'}
              aria-label="선택한 동작 수업안에 추가"
              onClick={() => onAdd(exercise)}
            >
              {isAdded ? (
                <Check size={16} aria-hidden="true" />
              ) : (
                <Plus size={16} aria-hidden="true" />
              )}
              {isAdded ? '추가됨' : '동작 추가'}
            </button>
            <span className="sr-only" role="status" aria-live="polite">
              {isAdded ? `${exercise.nameKo} 동작을 수업안에 추가했습니다.` : ''}
            </span>
          </div>

          <details
            className="library-inspector-reference-details"
            open={showReferenceGuide}
            onToggle={(event) => setShowReferenceGuide(event.currentTarget.open)}
          >
            <summary>도해·기구 설정 참고</summary>
            {showReferenceGuide && (
              <>
                <Studio3DMotionHeroCard exercise={exercise} compact />
                <StudioClinicalBriefCard exercise={exercise} compact showNoteComparison />
                <PostureAnatomyGuide exercise={exercise} compact />
              </>
            )}
          </details>
        </div>
      ) : (
        <p className="library-inspector-empty">
          목록에서 동작 이름을 선택하면 기구·시간·주의 메모와 출처 구분을 확인할 수 있어요.
        </p>
      )}
    </aside>
  );
}
