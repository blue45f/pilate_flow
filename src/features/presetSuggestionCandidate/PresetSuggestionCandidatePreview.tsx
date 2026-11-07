import React, { useId, useMemo, useRef, useState } from 'react';
import './presetSuggestionCandidate.css';
import { formatDurationSecondsKo } from './presetSuggestionDiagnostics';
import {
  instantiateSuggestedCandidateAsEditableDraft,
  suggestPresetCandidates,
} from './presetSuggestionEngine';
import {
  PRESET_SUGGESTION_FIXTURE_PRESETS,
  SYNTHETIC_REFORMER_50MIN_EXACT_REQUEST,
} from './presetSuggestionFixtures';
import type {
  PresetSuggestionCandidate,
  PresetSuggestionIssueCategory,
  PresetSuggestionRequest,
  PresetSuggestionResult,
} from './presetSuggestionTypes';

export interface PresetSuggestionCandidatePreviewProps {
  readonly result?: PresetSuggestionResult;
  readonly request?: PresetSuggestionRequest | unknown;
  readonly titleOverride?: string;
  readonly className?: string;
  readonly onInstantiateEditableDraft?: (
    draft: ReturnType<typeof instantiateSuggestedCandidateAsEditableDraft>,
  ) => void;
}

type IssueTabId = 'all' | PresetSuggestionIssueCategory;

interface IssueTabMeta {
  readonly id: IssueTabId;
  readonly labelKo: string;
}

const ISSUE_FILTER_TABS: readonly IssueTabMeta[] = [
  { id: 'all', labelKo: '전체 진단' },
  { id: 'target-impossibility', labelKo: '목표시간 가능성' },
  { id: 'unilateral-timing', labelKo: '편측 시간' },
  { id: 'rest-budget', labelKo: '쉬는 시간' },
  { id: 'cycle-and-bounds', labelKo: '중첩 cycle·상한' },
  { id: 'unknown-id', labelKo: '없는 ID' },
];

export const PresetSuggestionCandidatePreview: React.FC<
  PresetSuggestionCandidatePreviewProps
> = ({
  result,
  request,
  titleOverride,
  className,
  onInstantiateEditableDraft,
}) => {
  const instanceId = useId();
  const activeResult = useMemo<PresetSuggestionResult>(
    () =>
      result ??
      suggestPresetCandidates(request ?? SYNTHETIC_REFORMER_50MIN_EXACT_REQUEST),
    [result, request],
  );

  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<IssueTabId>('all');
  const [highlighted, setHighlighted] = useState<{
    result: PresetSuggestionResult;
    stepId: string;
  } | null>(null);

  const activeCandidate: PresetSuggestionCandidate | null = useMemo(() => {
    if (activeResult.candidates.length === 0) return null;
    if (selectedCandidateId) {
      const found = activeResult.candidates.find(
        (c) => c.candidateId === selectedCandidateId,
      );
      if (found) return found;
    }
    return activeResult.recommendedCandidate ?? activeResult.candidates[0] ?? null;
  }, [activeResult, selectedCandidateId]);

  const tabRefs = useRef<Record<IssueTabId, HTMLButtonElement | null>>({
    all: null,
    'target-impossibility': null,
    'unilateral-timing': null,
    'rest-budget': null,
    'cycle-and-bounds': null,
    'unknown-id': null,
  });

  const stepRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  const setStepRef = (stepId: string, element: HTMLLIElement | null) => {
    if (element) {
      stepRefs.current.set(stepId, element);
    } else {
      stepRefs.current.delete(stepId);
    }
  };

  const jumpToStep = (stepId: string) => {
    const targetElement = stepRefs.current.get(stepId);
    const existsInView =
      activeCandidate?.stepDetails.some((s) => s.stepId === stepId) ||
      activeResult.normalizedInput.seedSteps.some((s) => s.stepId === stepId);

    if (targetElement && existsInView) {
      setHighlighted({ result: activeResult, stepId });
      targetElement.focus({ preventScroll: true });
      if (typeof targetElement.scrollIntoView === 'function') {
        const reduced =
          window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
        targetElement.scrollIntoView({
          block: 'nearest',
          behavior: reduced ? 'auto' : 'smooth',
        });
      }
    }
  };

  const filteredIssues = useMemo(() => {
    if (selectedTab === 'all') return activeResult.issues;
    return activeResult.issues.filter((issue) => issue.category === selectedTab);
  }, [activeResult.issues, selectedTab]);

  const issueCountByTab = useMemo(() => {
    const counts: Record<IssueTabId, number> = {
      all: activeResult.issues.length,
      'target-impossibility': 0,
      'unilateral-timing': 0,
      'rest-budget': 0,
      'cycle-and-bounds': 0,
      'unknown-id': 0,
    };
    for (const issue of activeResult.issues) {
      counts[issue.category] += 1;
    }
    return counts;
  }, [activeResult.issues]);

  const handleTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % ISSUE_FILTER_TABS.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex =
        (currentIndex - 1 + ISSUE_FILTER_TABS.length) % ISSUE_FILTER_TABS.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = ISSUE_FILTER_TABS.length - 1;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      const nextTab = ISSUE_FILTER_TABS[nextIndex];
      setSelectedTab(nextTab.id);
      tabRefs.current[nextTab.id]?.focus();
    }
  };

  const bannerHeadingId = `${instanceId}-banner-heading`;
  const feasibilityHeadingId = `${instanceId}-feasibility-heading`;
  const issuesHeadingId = `${instanceId}-issues-heading`;
  const candidatesHeadingId = `${instanceId}-candidates-heading`;
  const stepsHeadingId = `${instanceId}-steps-heading`;
  const tabPanelId = `${instanceId}-issues-tabpanel`;

  const { normalizedInput, feasibility, truthBoundary } = activeResult;
  const headingTitle =
    titleOverride?.trim() ||
    activeCandidate?.titleKo ||
    `프리셋 추천 후보 (${normalizedInput.apparatus} · ${normalizedInput.theme})`;

  const isHighlightedStep = (stepId: string): boolean =>
    highlighted?.result === activeResult && highlighted.stepId === stepId;

  return (
    <div
      className={['psc-root', className].filter(Boolean).join(' ')}
      data-testid="preset-suggestion-candidate-preview"
    >
      {/* 1. Truthfulness & Non-AI / Non-Clinical Draft Boundary Banner */}
      <section
        className="psc-section psc-section--banner"
        aria-labelledby={bannerHeadingId}
        data-testid="suggestion-truth-banner"
      >
        <div className="psc-header-top">
          <h2 id={bannerHeadingId} className="psc-title">
            {headingTitle}
          </h2>
          <div className="psc-badge-row" aria-label="추천 상태 및 진실성 배지">
            <span
              className={`psc-badge ${activeResult.status === 'ready' ? 'psc-badge--ready' : 'psc-badge--blocked'}`}
              data-testid="suggestion-status-badge"
            >
              {activeResult.status === 'ready'
                ? `추천 가능 · 후보 ${activeResult.candidates.length}건`
                : `추천 보류 · 차단 ${activeResult.blockingIssues.length}건`}
            </span>
            <span className="psc-badge">AI 미사용 (결정론적 규칙)</span>
            <span className="psc-badge">임상·해부학 검증 비주장</span>
            <span className="psc-badge">기존 카탈로그 ID 전용</span>
            <span className="psc-badge">편집 가능한 초안</span>
          </div>
        </div>

        <p data-testid="suggestion-status-headline">{activeResult.statusHeadlineKo}</p>

        <p
          className="psc-disclaimer"
          role="note"
          data-testid="suggestion-disclaimer-text"
        >
          {truthBoundary.disclaimerKo}
        </p>
      </section>

      {/* 2. Request & Target Time Feasibility Summary */}
      <section
        className="psc-section"
        aria-labelledby={feasibilityHeadingId}
        data-testid="suggestion-feasibility-section"
      >
        <h3 id={feasibilityHeadingId} className="psc-section-title">
          수업 조건 및 목표시간 가능성 분석
        </h3>
        <div className="psc-metrics-grid">
          <div className="psc-metric-card" data-testid="metric-apparatus-theme">
            <span className="psc-metric-label">기구 · 주제 · 난이도</span>
            <span className="psc-metric-value">
              {normalizedInput.apparatus} · {normalizedInput.theme} · Lv.{normalizedInput.level}
            </span>
          </div>
          <div className="psc-metric-card" data-testid="metric-target-rest">
            <span className="psc-metric-label">목표 수업 시간 (휴식 포함)</span>
            <span className="psc-metric-value">
              {feasibility.targetSec !== null
                ? `${formatDurationSecondsKo(feasibility.targetSec)} (휴식 ${formatDurationSecondsKo(feasibility.totalRestSec)})`
                : '목표 시간 미정/오류'}
            </span>
          </div>
          <div className="psc-metric-card" data-testid="metric-achievable-window">
            <span className="psc-metric-label">도달 가능 시간 범위 (30초~20분/스텝)</span>
            <span className="psc-metric-value">
              {formatDurationSecondsKo(feasibility.minAchievableTotalSec)} ~{' '}
              {formatDurationSecondsKo(feasibility.maxAchievableTotalSec)}
            </span>
          </div>
          <div className="psc-metric-card" data-testid="metric-catalog-pool">
            <span className="psc-metric-label">검증 가능 카탈로그 풀</span>
            <span className="psc-metric-value">
              동작 {feasibility.eligibleExerciseCount}개 (고유 계열{' '}
              {feasibility.uniqueMovementFamilyCount}종)
            </span>
          </div>
        </div>
        <p data-testid="feasibility-headline-text">{feasibility.headlineKo}</p>
      </section>

      {/* 3. Explicit Boundary / Impossibility / Diagnostic Section */}
      <section
        className="psc-section"
        aria-labelledby={issuesHeadingId}
        data-testid="suggestion-issues-section"
      >
        <h3 id={issuesHeadingId} className="psc-section-title">
          경계 조건 및 불가능 사유 진단 ({activeResult.issues.length}건)
        </h3>
        <div
          className="psc-tabs"
          role="tablist"
          aria-label="진단 범주 필터"
        >
          {ISSUE_FILTER_TABS.map((tab, idx) => {
            const isSelected = selectedTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[tab.id] = el;
                }}
                id={`${instanceId}-tab-${tab.id}`}
                type="button"
                role="tab"
                className="psc-tab-btn"
                aria-selected={isSelected}
                aria-controls={tabPanelId}
                tabIndex={isSelected ? 0 : -1}
                data-testid={`suggestion-tab-${tab.id}`}
                onClick={() => setSelectedTab(tab.id)}
                onKeyDown={(e) => handleTabKeyDown(e, idx)}
              >
                {tab.labelKo} ({issueCountByTab[tab.id]})
              </button>
            );
          })}
        </div>

        <div
          id={tabPanelId}
          role="tabpanel"
          aria-labelledby={`${instanceId}-tab-${selectedTab}`}
        >
          {filteredIssues.length === 0 ? (
            <p data-testid="suggestion-no-issues-message">
              해당 범주에서 감지된 경계 위반이나 불가능 조건이 없습니다.
            </p>
          ) : (
            <ul className="psc-issue-list">
              {filteredIssues.map((issue) => (
                <li
                  key={issue.id}
                  className={`psc-issue-card ${issue.blocking ? 'psc-issue-card--blocking' : ''}`}
                  data-testid={`suggestion-issue-${issue.code}`}
                >
                  <div>
                    <strong>
                      [{issue.blocking ? '차단' : '안내'} · {issue.code}] {issue.titleKo}
                    </strong>
                  </div>
                  <p style={{ margin: 0 }}>{issue.messageKo}</p>
                  {issue.detailKo && <small>{issue.detailKo}</small>}
                  {issue.stepIds.length > 0 && (
                    <div className="psc-badge-row">
                      {issue.stepIds.map((stepId) => (
                        <button
                          key={stepId}
                          type="button"
                          className="psc-jump-btn"
                          data-testid={`jump-to-step-${stepId}`}
                          onClick={() => jumpToStep(stepId)}
                        >
                          항목 이동: {stepId}
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

      {/* 4. Candidate Picker & Timing / Unilateral / Rest Summary */}
      <section
        className="psc-section"
        aria-labelledby={candidatesHeadingId}
        data-testid="suggestion-candidates-section"
      >
        <h3 id={candidatesHeadingId} className="psc-section-title">
          추천 프리셋 후보 초안 ({activeResult.candidates.length}건)
        </h3>
        {activeResult.candidates.length === 0 ? (
          <p data-testid="suggestion-empty-candidates-message">
            경계 조건 또는 목표시간 불가능 사유로 인해 생성된 추천 후보가 없습니다. 위 진단 안내를 확인해 주세요.
          </p>
        ) : (
          <>
            <div className="psc-tabs" role="group" aria-label="추천 후보 선택">
              {activeResult.candidates.map((cand) => {
                const isPressed = activeCandidate?.candidateId === cand.candidateId;
                return (
                  <button
                    key={cand.candidateId}
                    type="button"
                    className="psc-candidate-btn"
                    aria-pressed={isPressed}
                    data-testid={`select-candidate-${cand.candidateId}`}
                    onClick={() => {
                      setSelectedCandidateId(cand.candidateId);
                      setHighlighted(null);
                    }}
                  >
                    #{cand.rank} {cand.sourceTierLabelKo} ({cand.matchScore}점 · 전환{' '}
                    {cand.transitionScore}점)
                  </button>
                );
              })}
            </div>

            {activeCandidate && (
              <div data-testid="active-candidate-summary">
                <p style={{ margin: '0.25rem 0', fontWeight: 600 }}>
                  {activeCandidate.titleKo} — {activeCandidate.rationaleKo}
                </p>
                <div className="psc-metrics-grid">
                  <div className="psc-metric-card" data-testid="candidate-metric-total">
                    <span className="psc-metric-label">총 계획 시간 (오차)</span>
                    <span className="psc-metric-value">
                      {formatDurationSecondsKo(activeCandidate.timing.totalSec)} (오차{' '}
                      {activeCandidate.timing.deltaSec}초)
                    </span>
                  </div>
                  <div className="psc-metric-card" data-testid="candidate-metric-breakdown">
                    <span className="psc-metric-label">수행 · 설명 · 전환 · 휴식</span>
                    <span className="psc-metric-value">
                      수행 {formatDurationSecondsKo(activeCandidate.timing.movementSec)} · 설명{' '}
                      {activeCandidate.timing.explanationSec}초 · 전환{' '}
                      {activeCandidate.timing.transitionSec}초 · 휴식{' '}
                      {formatDurationSecondsKo(activeCandidate.timing.restSec)}
                    </span>
                  </div>
                  <div className="psc-metric-card" data-testid="candidate-metric-unilateral">
                    <span className="psc-metric-label">편측 좌·우 시간 균형</span>
                    <span className="psc-metric-value">
                      좌 {formatDurationSecondsKo(activeCandidate.unilateral.leftTotalSec)} / 우{' '}
                      {formatDurationSecondsKo(activeCandidate.unilateral.rightTotalSec)} (
                      {activeCandidate.unilateral.unilateralBalanced ? '1:1 균형' : '불균형'})
                    </span>
                  </div>
                </div>
                {onInstantiateEditableDraft && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      className="psc-copy-btn"
                      data-testid="instantiate-editable-draft-btn"
                      onClick={() =>
                        onInstantiateEditableDraft(
                          instantiateSuggestedCandidateAsEditableDraft(activeCandidate),
                        )
                      }
                    >
                      이 후보를 편집 가능한 수업 초안으로 복사
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* 5. Step-by-Step List (Candidate Steps when ready, or Seed Steps when blocked) */}
      <section
        className="psc-section"
        aria-labelledby={stepsHeadingId}
        data-testid="suggestion-steps-section"
      >
        <h3 id={stepsHeadingId} className="psc-section-title">
          {activeCandidate
            ? `후보 동작·휴식 상세 구성 (${activeCandidate.stepDetails.length}개 스텝)`
            : `입력 시드 스텝 진단 목록 (${normalizedInput.seedSteps.length}개 스텝)`}
        </h3>
        {activeCandidate ? (
          <ol className="psc-step-list">
            {activeCandidate.stepDetails.map((step) => {
              const highlightedRow = isHighlightedStep(step.stepId);
              return (
                <li
                  key={step.stepId}
                  ref={(el) => setStepRef(step.stepId, el)}
                  id={`${instanceId}-step-${step.stepId}`}
                  tabIndex={-1}
                  className={`psc-step-card ${highlightedRow ? 'psc-step-card--highlighted' : ''}`}
                  data-testid={`suggestion-step-${step.stepId}`}
                >
                  <div>
                    <strong>
                      {step.order}. {step.exerciseNameKo}
                    </strong>{' '}
                    <span>
                      ({step.kind === 'rest' ? '휴식' : `ID: ${step.exerciseId}`})
                    </span>
                  </div>
                  <span>
                    {step.kind === 'rest'
                      ? `휴식 ${formatDurationSecondsKo(step.restSec)}`
                      : `총 ${formatDurationSecondsKo(step.totalSec)} · 수행 ${formatDurationSecondsKo(step.movementSec)}${step.sides === 2 ? ` (한쪽 ${formatDurationSecondsKo(step.perSideSec)})` : ''} · 설명 ${step.explanationSec}초 · 전환 ${step.transitionSec}초 · 좌우: ${step.sideMode ?? 'together'}`}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : normalizedInput.seedSteps.length > 0 ? (
          <ol className="psc-step-list">
            {normalizedInput.seedSteps.map((step) => {
              const highlightedRow = isHighlightedStep(step.stepId);
              return (
                <li
                  key={step.stepId}
                  ref={(el) => setStepRef(step.stepId, el)}
                  id={`${instanceId}-step-${step.stepId}`}
                  tabIndex={-1}
                  className={`psc-step-card ${highlightedRow ? 'psc-step-card--highlighted' : ''}`}
                  data-testid={`suggestion-step-${step.stepId}`}
                >
                  <div>
                    <strong>
                      {step.order}. {step.kind === 'rest' ? '휴식' : step.exerciseId || '(ID 없음)'}
                    </strong>{' '}
                    <span>[{step.stepId}]</span>
                  </div>
                  <span>
                    시간: {formatDurationSecondsKo(step.totalSec)} · 상태: {step.durationStatus} ·
                    이슈: {step.issueCodes.join(', ') || '없음'}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p data-testid="suggestion-no-steps-message">표시할 스텝이 없습니다.</p>
        )}
      </section>
    </div>
  );
};

export const PresetSuggestionFixtureHarness: React.FC = () => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    PRESET_SUGGESTION_FIXTURE_PRESETS[0].id,
  );
  const currentPreset =
    PRESET_SUGGESTION_FIXTURE_PRESETS.find((p) => p.id === selectedPresetId) ??
    PRESET_SUGGESTION_FIXTURE_PRESETS[0];

  return (
    <div className="psc-root" data-testid="preset-suggestion-fixture-harness">
      <div className="psc-tabs" role="group" aria-label="합성 검증 시나리오 선택">
        {PRESET_SUGGESTION_FIXTURE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="psc-fixture-btn"
            aria-pressed={preset.id === currentPreset.id}
            data-testid={`fixture-preset-${preset.id}`}
            onClick={() => setSelectedPresetId(preset.id)}
          >
            {preset.labelKo}
          </button>
        ))}
      </div>
      <p data-testid="fixture-preset-description">{currentPreset.descriptionKo}</p>
      <PresetSuggestionCandidatePreview request={currentPreset.request} />
    </div>
  );
};
