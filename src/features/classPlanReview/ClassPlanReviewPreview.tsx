import React, { useId, useMemo, useRef, useState } from 'react';
import './classPlanReview.css';
import { formatReviewDurationKo, reviewClassPlan } from './classPlanReviewAnalyzer';
import {
  CLASS_PLAN_REVIEW_FIXTURE_PRESETS,
  type ClassPlanReviewFixturePreset,
} from './classPlanReviewFixtures';
import type {
  ClassPlanReviewIssueCategory,
  ClassPlanReviewOptions,
  ClassPlanReviewReport,
  NormalizedClassReviewItem,
  ReviewItemLateralityStatus,
  ReviewItemSourceKind,
} from './classPlanReviewTypes';

export interface ClassPlanReviewPreviewProps {
  readonly report?: ClassPlanReviewReport;
  readonly source?: unknown;
  readonly options?: ClassPlanReviewOptions;
  readonly titleOverride?: string;
  readonly className?: string;
}

type IssueFilterTabId = 'all' | ClassPlanReviewIssueCategory;

interface IssueFilterTabMeta {
  readonly id: IssueFilterTabId;
  readonly labelKo: string;
}

const ISSUE_FILTER_TABS: readonly IssueFilterTabMeta[] = [
  { id: 'all', labelKo: '전체' },
  { id: 'timing', labelKo: '시간' },
  { id: 'laterality', labelKo: '좌우 편성' },
  { id: 'draft-info', labelKo: '창작 초안' },
  { id: 'input-diagnostic', labelKo: '입력 진단' },
];

function getSourceKindLabelKo(sourceKind: ReviewItemSourceKind): string {
  switch (sourceKind) {
    case 'catalog-exercise':
      return '카탈로그 동작';
    case 'name-only-draft':
      return '이름만 적은 창작 초안';
    case 'human-draft':
      return '강사 창작 초안';
    case 'reusable-block-item':
      return '재사용 블록 동작';
    case 'rest':
      return '휴식';
    case 'unknown-exercise':
      return '미등록 동작 ID';
  }
}

function getLateralityLabelKo(status: ReviewItemLateralityStatus): string {
  switch (status) {
    case 'left':
      return '왼쪽';
    case 'right':
      return '오른쪽';
    case 'both-sequential':
      return '양쪽 순차';
    case 'together':
      return '양쪽 함께';
    case 'unknown':
      return '좌우 미지정';
    case 'not-applicable':
      return '휴식 (좌우 해당 없음)';
  }
}

function formatTargetDiffKo(report: ClassPlanReviewReport): string {
  const { timing } = report;
  if (timing.isPartialTotal)
    return `전체 시간 비교 보류 · 확인된 부분 합계 ${formatReviewDurationKo(timing.knownTotalSec)}`;
  if (timing.targetDurationStatus !== 'known' || timing.knownDeltaSec === null) {
    return '비교 불가 (목표 시간 미정 또는 입력 확인 필요)';
  }
  if (timing.knownDeltaSec === 0) {
    return timing.isPartialTotal
      ? '알려진 시간 합계는 목표와 같음 (시간 미정 항목 별도 존재)'
      : '목표 시간과 정확히 일치 (차이 0초)';
  }
  if (timing.knownDeltaSec > 0) {
    return `목표보다 ${formatReviewDurationKo(timing.knownDeltaSec)} 김 (+${timing.knownDeltaSec}초)`;
  }
  return `목표보다 ${formatReviewDurationKo(Math.abs(timing.knownDeltaSec))} 부족 (${timing.knownDeltaSec}초)`;
}

function formatItemTimingSummaryKo(item: NormalizedClassReviewItem): string {
  if (item.durationStatus === 'unspecified') {
    return '시간 미정 (0초로 계산하지 않음)';
  }
  if (item.durationStatus === 'invalid' || item.knownTotalSec === null) {
    return '시간 입력 확인 필요 (총시간 합산 제외)';
  }
  if (item.kind === 'rest') {
    return `휴식 ${formatReviewDurationKo(item.knownRestSec ?? item.knownTotalSec)}`;
  }
  const moveText = `수행 ${formatReviewDurationKo(item.knownMovementSec ?? 0)}`;
  const perSideText =
    item.lateralityStatus === 'both-sequential' && item.knownPerSideSec !== null
      ? ` (한쪽 ${formatReviewDurationKo(item.knownPerSideSec)})`
      : '';
  const expText = `설명 ${item.knownExplanationSec ?? 0}초`;
  const transText = `전환 ${item.knownTransitionSec ?? 0}초`;
  return `총 ${formatReviewDurationKo(item.knownTotalSec)} · ${moveText}${perSideText} · ${expText} · ${transText}`;
}

export const ClassPlanReviewPreview: React.FC<ClassPlanReviewPreviewProps> = ({
  report,
  source,
  options,
  titleOverride,
  className,
}) => {
  const instanceId = useId();
  const activeReport = useMemo<ClassPlanReviewReport>(
    () => report ?? reviewClassPlan(source, options),
    [report, source, options],
  );

  const [selectedCategory, setSelectedCategory] = useState<IssueFilterTabId>('all');
  const [highlighted, setHighlighted] = useState<{
    report: ClassPlanReviewReport;
    itemId: string;
  } | null>(null);

  const tabRefs = useRef<Record<IssueFilterTabId, HTMLButtonElement | null>>({
    all: null,
    timing: null,
    laterality: null,
    'draft-info': null,
    'input-diagnostic': null,
  });

  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  const setItemRef = (itemId: string, element: HTMLLIElement | null) => {
    if (element) {
      itemRefs.current.set(itemId, element);
    } else {
      itemRefs.current.delete(itemId);
    }
  };

  const jumpToItem = (itemId: string) => {
    const targetElement = itemRefs.current.get(itemId);
    if (targetElement && activeReport.plan.items.some((item) => item.itemId === itemId)) {
      setHighlighted({ report: activeReport, itemId });
      targetElement.focus({ preventScroll: true });
      if (typeof targetElement.scrollIntoView === 'function') {
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
        targetElement.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
      }
    }
  };

  const filteredIssues = useMemo(() => {
    if (selectedCategory === 'all') {
      return activeReport.issues;
    }
    return activeReport.issues.filter((issue) => issue.category === selectedCategory);
  }, [activeReport.issues, selectedCategory]);

  const issueCountByCategory = useMemo(() => {
    const counts: Record<IssueFilterTabId, number> = {
      all: activeReport.issues.length,
      timing: 0,
      laterality: 0,
      'draft-info': 0,
      'input-diagnostic': 0,
    };
    for (const issue of activeReport.issues) {
      counts[issue.category] += 1;
    }
    return counts;
  }, [activeReport.issues]);

  const handleTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % ISSUE_FILTER_TABS.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + ISSUE_FILTER_TABS.length) % ISSUE_FILTER_TABS.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = ISSUE_FILTER_TABS.length - 1;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      const nextTab = ISSUE_FILTER_TABS[nextIndex];
      setSelectedCategory(nextTab.id);
      tabRefs.current[nextTab.id]?.focus();
    }
  };

  const bannerHeadingId = `${instanceId}-banner-heading`;
  const timingHeadingId = `${instanceId}-timing-heading`;
  const lateralityHeadingId = `${instanceId}-laterality-heading`;
  const issuesHeadingId = `${instanceId}-issues-heading`;
  const itemsHeadingId = `${instanceId}-items-heading`;
  const tabPanelId = `${instanceId}-issues-tabpanel`;

  const { timing, laterality, counts, boundary, plan } = activeReport;
  const resolvedTitle = titleOverride?.trim() || plan.title;

  return (
    <div
      className={['cpr-root', className].filter(Boolean).join(' ')}
      data-testid="class-plan-review-preview"
    >
      {/* 1. Header & Non-Prescription Notice Banner */}
      <section
        className="cpr-section cpr-section--banner"
        aria-labelledby={bannerHeadingId}
        data-testid="review-boundary-banner"
      >
        <div className="cpr-header-top">
          <h2 id={bannerHeadingId} className="cpr-title">
            {resolvedTitle}
          </h2>
          <div className="cpr-badge-row" aria-label="수업 항목 수 요약">
            <span className="cpr-badge cpr-badge--brand">전체 {counts.totalItems}개</span>
            <span className="cpr-badge">동작 {counts.exerciseItems}개</span>
            <span className="cpr-badge">휴식 {counts.restItems}개</span>
            {counts.creativeDraftItems > 0 && (
              <span className="cpr-badge">창작 초안 {counts.creativeDraftItems}개</span>
            )}
            {counts.nameOnlyDraftItems > 0 && (
              <span className="cpr-badge">이름만 적은 초안 {counts.nameOnlyDraftItems}개</span>
            )}
          </div>
        </div>

        <p className="cpr-summary-headline" data-testid="review-summary-headline">
          {activeReport.summaryHeadlineKo}
        </p>

        <p className="cpr-disclaimer" role="note" data-testid="review-disclaimer-text">
          {boundary.disclaimerKo}
        </p>
      </section>

      {/* 2. Time Budget Summary Section */}
      <section
        className="cpr-section"
        aria-labelledby={timingHeadingId}
        data-testid="review-timing-section"
      >
        <h3 id={timingHeadingId} className="cpr-section-title">
          시간 구성 요약
        </h3>

        <p className="cpr-section-note" data-testid="review-timing-headline">
          {timing.headlineKo}
        </p>

        <div className="cpr-metric-grid">
          <div className="cpr-metric-card" data-testid="metric-known-total">
            <span className="cpr-metric-card__label">알려진 총시간</span>
            <strong className="cpr-metric-card__value">
              {formatReviewDurationKo(timing.knownTotalSec)}
              {timing.unspecifiedTimeItemCount > 0
                ? ` + 시간 미정 ${timing.unspecifiedTimeItemCount}개`
                : ''}
            </strong>
            <span className="cpr-metric-card__sub">
              시간 입력 항목 {timing.knownTimeItemCount}개 합산
            </span>
          </div>

          <div
            className={[
              'cpr-metric-card',
              timing.unspecifiedTimeItemCount > 0 ? 'cpr-metric-card--warning' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            data-testid="metric-unspecified-count"
          >
            <span className="cpr-metric-card__label">시간 미정 항목</span>
            <strong className="cpr-metric-card__value">
              {timing.unspecifiedTimeItemCount > 0
                ? `시간 미정 ${timing.unspecifiedTimeItemCount}개`
                : '없음 (모두 입력됨)'}
            </strong>
            <span className="cpr-metric-card__sub">
              {timing.unspecifiedTimeItemCount > 0
                ? '미정 항목은 0초로 계산하지 않고 별도 표기합니다'
                : '미입력 시간 항목이 없습니다'}
            </span>
          </div>

          <div className="cpr-metric-card" data-testid="metric-target-time">
            <span className="cpr-metric-card__label">목표 시간</span>
            <strong className="cpr-metric-card__value">
              {timing.targetDurationStatus === 'known' && timing.targetSec !== null
                ? formatReviewDurationKo(timing.targetSec)
                : timing.targetDurationStatus === 'invalid'
                  ? '목표 시간 입력 확인 필요'
                  : '목표 시간 미지정'}
            </strong>
            <span className="cpr-metric-card__sub">
              {timing.invalidTimeItemCount > 0
                ? `시간 입력 오류 항목 ${timing.invalidTimeItemCount}개 제외됨`
                : '수업 목표 시간 기준'}
            </span>
          </div>

          <div className="cpr-metric-card" data-testid="metric-target-diff">
            <span className="cpr-metric-card__label">목표 시간과의 차이</span>
            <strong className="cpr-metric-card__value">{formatTargetDiffKo(activeReport)}</strong>
            <span className="cpr-metric-card__sub">{timing.detailNoteKo}</span>
          </div>
        </div>

        <ul className="cpr-breakdown-list" aria-label="세부 시간 내역">
          <li className="cpr-breakdown-item">
            <span>동작</span>
            <strong>{formatReviewDurationKo(timing.knownMovementSec)}</strong>
          </li>
          <li className="cpr-breakdown-item">
            <span>휴식</span>
            <strong>{formatReviewDurationKo(timing.knownRestSec)}</strong>
          </li>
          <li className="cpr-breakdown-item">
            <span>전환</span>
            <strong>{formatReviewDurationKo(timing.knownTransitionSec)}</strong>
          </li>
          <li className="cpr-breakdown-item">
            <span>설명</span>
            <strong>{formatReviewDurationKo(timing.knownExplanationSec)}</strong>
          </li>
        </ul>

        <p className="cpr-section-note">
          동작 시간에는 반복 횟수·세트·양쪽 순차 진행이 이미 포함되어 있어 중복 합산하지 않으며,
          휴식·전환·설명 시간도 각 1회씩만 합산합니다.
        </p>
      </section>

      {/* 3. Laterality (Left/Right) Factual Summary Section */}
      <section
        className="cpr-section"
        aria-labelledby={lateralityHeadingId}
        data-testid="review-laterality-section"
      >
        <h3 id={lateralityHeadingId} className="cpr-section-title">
          좌우 편성 사실 요약
        </h3>

        <p className="cpr-section-note" data-testid="review-laterality-headline">
          {laterality.headlineKo}
        </p>

        <div className="cpr-metric-grid">
          <div className="cpr-metric-card" data-testid="laterality-card-left">
            <span className="cpr-metric-card__label">왼쪽</span>
            <strong className="cpr-metric-card__value">
              {laterality.explicitLeftItemCount}개 ·{' '}
              {formatReviewDurationKo(laterality.knownLeftMovementSec)}
            </strong>
            <span className="cpr-metric-card__sub">왼쪽 단독 + 양쪽 순차 절반 수행 시간</span>
          </div>

          <div className="cpr-metric-card" data-testid="laterality-card-right">
            <span className="cpr-metric-card__label">오른쪽</span>
            <strong className="cpr-metric-card__value">
              {laterality.explicitRightItemCount}개 ·{' '}
              {formatReviewDurationKo(laterality.knownRightMovementSec)}
            </strong>
            <span className="cpr-metric-card__sub">오른쪽 단독 + 양쪽 순차 절반 수행 시간</span>
          </div>

          <div className="cpr-metric-card" data-testid="laterality-card-both-seq">
            <span className="cpr-metric-card__label">양쪽 순차</span>
            <strong className="cpr-metric-card__value">
              {laterality.bothSequentialItemCount}개
            </strong>
            <span className="cpr-metric-card__sub">한 항목 안에서 좌·우 순차 진행</span>
          </div>

          <div className="cpr-metric-card" data-testid="laterality-card-together">
            <span className="cpr-metric-card__label">양쪽 함께</span>
            <strong className="cpr-metric-card__value">
              {laterality.togetherItemCount}개 ·{' '}
              {formatReviewDurationKo(laterality.knownTogetherMovementSec)}
            </strong>
            <span className="cpr-metric-card__sub">양쪽 동시 수행 동작</span>
          </div>

          <div className="cpr-metric-card" data-testid="laterality-card-unknown">
            <span className="cpr-metric-card__label">좌우 미지정/불명</span>
            <strong className="cpr-metric-card__value">
              {laterality.unknownLateralityItemCount}개 ·{' '}
              {formatReviewDurationKo(laterality.knownUnknownSideMovementSec)}
            </strong>
            <span className="cpr-metric-card__sub">
              초안 등 좌우 정보가 아직 없는 항목 (임의 분류 안 함)
            </span>
          </div>
        </div>

        {laterality.splitMovementComparisons.length > 0 && (
          <ul
            className="cpr-comparison-list"
            aria-label="좌우 분리 편성 동작 비교"
            data-testid="review-laterality-comparisons"
          >
            {laterality.splitMovementComparisons.map((comp) => {
              const isImbalanced =
                !comp.countMatched || !comp.timeMatched || !comp.repsAndSetsMatched;
              return (
                <li
                  key={comp.movementKey}
                  className={[
                    'cpr-comparison-card',
                    isImbalanced ? 'cpr-comparison-card--imbalanced' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <strong>{comp.displayNameKo}</strong>
                  <span className="cpr-section-note">
                    왼쪽 {comp.leftCount}개 ({formatReviewDurationKo(comp.knownLeftMovementSec)}) /
                    오른쪽 {comp.rightCount}개 ({formatReviewDurationKo(comp.knownRightMovementSec)}
                    ) — {comp.statusSummaryKo}
                  </span>
                  <div className="cpr-issue-links">
                    {[...comp.leftItemIds, ...comp.rightItemIds].map((id) => (
                      <button
                        key={id}
                        type="button"
                        className="cpr-jump-btn"
                        onClick={() => jumpToItem(id)}
                      >
                        항목으로 이동: {id}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <p className="cpr-disclaimer" data-testid="review-laterality-caution">
          {laterality.cautionNoteKo}
        </p>
      </section>

      {/* 4. Easy-Korean Review Findings Section */}
      <section
        className="cpr-section"
        aria-labelledby={issuesHeadingId}
        data-testid="review-issues-section"
      >
        <h3 id={issuesHeadingId} className="cpr-section-title">
          검토 항목 안내 ({activeReport.issues.length}건)
        </h3>

        <div className="cpr-tablist" role="tablist" aria-label="검토 항목 분류 필터">
          {ISSUE_FILTER_TABS.map((tab, idx) => {
            const isSelected = selectedCategory === tab.id;
            const tabId = `${instanceId}-tab-${tab.id}`;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[tab.id] = el;
                }}
                id={tabId}
                type="button"
                role="tab"
                className="cpr-tab"
                aria-selected={isSelected}
                aria-controls={tabPanelId}
                tabIndex={isSelected ? 0 : -1}
                data-testid={`review-tab-${tab.id}`}
                onClick={() => setSelectedCategory(tab.id)}
                onKeyDown={(e) => handleTabKeyDown(e, idx)}
              >
                {tab.labelKo} ({issueCountByCategory[tab.id]})
              </button>
            );
          })}
        </div>

        <div
          id={tabPanelId}
          role="tabpanel"
          aria-labelledby={`${instanceId}-tab-${selectedCategory}`}
        >
          {filteredIssues.length === 0 ? (
            <p className="cpr-section-note" data-testid="review-no-issues-message">
              선택한 분류에서 추가로 확인할 검토 항목이 없습니다.
            </p>
          ) : (
            <ul className="cpr-issue-list" data-testid="review-issues-list">
              {filteredIssues.map((issue) => (
                <li
                  key={issue.id}
                  className={[
                    'cpr-issue-card',
                    issue.severity === 'warning' ? 'cpr-issue-card--warning' : '',
                    issue.severity === 'diagnostic' ? 'cpr-issue-card--diagnostic' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  data-testid={`review-issue-${issue.code}`}
                >
                  <h4 className="cpr-issue-card__title">{issue.titleKo}</h4>
                  <p className="cpr-issue-card__msg">{issue.messageKo}</p>
                  {issue.factualDetailKo && (
                    <p className="cpr-issue-card__detail">{issue.factualDetailKo}</p>
                  )}
                  {issue.itemIds.length > 0 && (
                    <div className="cpr-issue-links" aria-label="관련 항목 바로가기">
                      {issue.itemIds.map((itemId) => (
                        <button
                          key={`${issue.id}-${itemId}`}
                          type="button"
                          className="cpr-jump-btn"
                          data-testid={`jump-to-item-${itemId}`}
                          onClick={() => jumpToItem(itemId)}
                        >
                          항목으로 이동: {itemId}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 5. Item-by-Item Schedule List */}
      <section
        className="cpr-section"
        aria-labelledby={itemsHeadingId}
        data-testid="review-items-section"
      >
        <h3 id={itemsHeadingId} className="cpr-section-title">
          항목별 시간·좌우 내역 ({plan.items.length}개)
        </h3>

        {plan.items.length === 0 ? (
          <p className="cpr-section-note" data-testid="review-empty-items-message">
            수업안에 등록된 동작이나 휴식 항목이 아직 없습니다.
          </p>
        ) : (
          <ol className="cpr-item-list" data-testid="review-items-list">
            {plan.items.map((item) => {
              const isHighlighted =
                highlighted?.report === activeReport && highlighted.itemId === item.itemId;
              const durationBadgeClass =
                item.durationStatus === 'known'
                  ? 'cpr-badge--success'
                  : item.durationStatus === 'unspecified'
                    ? 'cpr-badge--warning'
                    : 'cpr-badge--danger';

              return (
                <li
                  key={`${item.index}-${item.itemId}`}
                  ref={(el) => setItemRef(item.itemId, el)}
                  id={`${instanceId}-review-item-row-${item.itemId}`}
                  tabIndex={-1}
                  data-testid={`review-item-${item.itemId}`}
                  data-item-id={item.itemId}
                  className={['cpr-item-card', isHighlighted ? 'cpr-item-card--highlighted' : '']
                    .filter(Boolean)
                    .join(' ')}
                >
                  <div className="cpr-item-card__header">
                    <h4 className="cpr-item-card__title">
                      {item.order}. {item.displayNameKo}
                    </h4>
                    <div className="cpr-badge-row">
                      <span className="cpr-badge cpr-badge--brand">
                        {getSourceKindLabelKo(item.sourceKind)}
                      </span>
                      <span className="cpr-badge">
                        {getLateralityLabelKo(item.lateralityStatus)}
                      </span>
                      <span className={['cpr-badge', durationBadgeClass].join(' ')}>
                        {item.durationStatus === 'known' && item.knownTotalSec !== null
                          ? formatReviewDurationKo(item.knownTotalSec)
                          : item.durationStatus === 'unspecified'
                            ? '시간 미정'
                            : '시간 입력 확인 필요'}
                      </span>
                    </div>
                  </div>

                  <div className="cpr-item-card__meta">
                    <span>ID: {item.itemId}</span>
                    <span>· {formatItemTimingSummaryKo(item)}</span>
                    {item.repetitions !== null && <span>· 횟수 {item.repetitions}회</span>}
                    {item.sets !== null && <span>· 세트 {item.sets}세트</span>}
                    {item.hasInvalidRepetitionOrSet && (
                      <span className="cpr-badge cpr-badge--danger">
                        반복·세트 입력값 확인 필요
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
};

export interface ClassPlanReviewFixtureHarnessProps {
  readonly initialPresetId?: string;
  readonly presets?: readonly ClassPlanReviewFixturePreset[];
}

/**
 * Standalone interactive fixture preview harness.
 * Allows switching between 30-min, 50-min, mixed rest/side/unspecified, name-only draft,
 * empty class, and corrupted input fixtures without modifying production routes.
 */
export const ClassPlanReviewFixtureHarness: React.FC<ClassPlanReviewFixtureHarnessProps> = ({
  initialPresetId,
  presets = CLASS_PLAN_REVIEW_FIXTURE_PRESETS,
}) => {
  const safePresets = presets.length > 0 ? presets : CLASS_PLAN_REVIEW_FIXTURE_PRESETS;
  const [selectedId, setSelectedId] = useState<string>(
    initialPresetId && safePresets.some((p) => p.id === initialPresetId)
      ? initialPresetId
      : safePresets[0].id,
  );

  const selectedPreset = useMemo(
    () => safePresets.find((p) => p.id === selectedId) ?? safePresets[0],
    [safePresets, selectedId],
  );

  return (
    <div className="cpr-harness" data-testid="class-plan-review-harness">
      <div className="cpr-harness__controls" role="region" aria-label="합성 수업안 픽스처 선택">
        <p className="cpr-harness__label">수업 구성 검토 미리보기 시나리오 선택</p>
        <div className="cpr-harness__preset-list">
          {safePresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="cpr-harness__preset-btn"
              aria-pressed={selectedPreset.id === preset.id}
              data-testid={`fixture-preset-${preset.id}`}
              onClick={() => setSelectedId(preset.id)}
            >
              {preset.labelKo}
            </button>
          ))}
        </div>
        <p className="cpr-harness__desc" data-testid="fixture-preset-description">
          {selectedPreset.descriptionKo}
        </p>
      </div>

      <ClassPlanReviewPreview source={selectedPreset.input} options={selectedPreset.options} />
    </div>
  );
};
