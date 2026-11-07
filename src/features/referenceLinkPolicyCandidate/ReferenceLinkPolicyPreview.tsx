import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { PilatesExercise } from '../../types/pilates';
import {
  SYNTHETIC_POLICY_FIXTURE_PRESETS,
  auditExistingPublicUrlSamples,
  resolveExerciseReferenceLinkPolicyReport,
} from './catalogSampleAudit';
import { createReferencePlayerDisplayController } from './playerDisplayContract';
import {
  type EvaluatedReferenceLinkItem,
  type ExerciseReferenceLinkPolicyReport,
  type ReferenceLinkCandidateInput,
  type ReferencePlayerDisplaySnapshot,
} from './types';
import { evaluateReferenceLinkCandidates } from './urlPolicyEngine';
import './referenceLinkPolicy.css';

export type ReferencePolicyFilterTab =
  | 'all'
  | 'embed-capable'
  | 'external-only'
  | 'diagnostics';

const TAB_ORDER: readonly ReferencePolicyFilterTab[] = [
  'all',
  'embed-capable',
  'external-only',
  'diagnostics',
];

export interface ReferenceLinkPolicyPreviewProps {
  readonly report?: ExerciseReferenceLinkPolicyReport;
  readonly exercise?: PilatesExercise;
  readonly candidates?: readonly ReferenceLinkCandidateInput[];
  readonly subjectId?: string;
  readonly subjectTitleKo?: string;
  readonly iframeMode?: 'local-synthetic-fixture' | 'production-nocookie';
  readonly className?: string;
}

export function ReferenceLinkPolicyPreview({
  report: explicitReport,
  exercise,
  candidates,
  subjectId = 'custom-subject',
  subjectTitleKo = '동작 참고 링크 후보',
  iframeMode = 'local-synthetic-fixture',
  className = '',
}: ReferenceLinkPolicyPreviewProps) {
  const instanceId = useId();
  const resolvedReport = useMemo<ExerciseReferenceLinkPolicyReport>(() => {
    if (explicitReport) return explicitReport;
    if (exercise) {
      return resolveExerciseReferenceLinkPolicyReport(exercise, {
        additionalCandidates: candidates ?? [],
      });
    }
    return evaluateReferenceLinkCandidates(
      subjectId,
      subjectTitleKo,
      candidates ?? [],
    );
  }, [explicitReport, exercise, candidates, subjectId, subjectTitleKo]);

  const [activeTab, setActiveTab] = useState<ReferencePolicyFilterTab>('all');
  const tabRefs = useRef<Record<ReferencePolicyFilterTab, HTMLButtonElement | null>>({
    all: null,
    'embed-capable': null,
    'external-only': null,
    diagnostics: null,
  });

  const controller = useMemo(
    () =>
      createReferencePlayerDisplayController(resolvedReport, {
        iframeMode,
      }),
    [resolvedReport, iframeMode],
  );

  const [, setRevision] = useState(0);
  const syncFromController = (nextSnap: ReferencePlayerDisplaySnapshot) => {
    void nextSnap;
    setRevision((rev) => rev + 1);
  };
  const snapshot: ReferencePlayerDisplaySnapshot = controller.getSnapshot();

  // Unmount iframe on pagehide or document.hidden; never auto-resume on pageshow
  useEffect(() => {
    const onPageHide = () => {
      syncFromController(controller.handlePageHide());
    };
    const onPageShow = () => {
      syncFromController(controller.handlePageShow());
    };
    const onVisibilityChange = () => {
      if (typeof document !== 'undefined') {
        syncFromController(controller.handleVisibilityChange(document.hidden));
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', onPageHide);
      window.addEventListener('pageshow', onPageShow);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('pagehide', onPageHide);
        window.removeEventListener('pageshow', onPageShow);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
    };
  }, [controller]);

  const visibleItems: readonly EvaluatedReferenceLinkItem[] = useMemo(() => {
    if (activeTab === 'embed-capable') return resolvedReport.embedCapableItems;
    if (activeTab === 'external-only') return resolvedReport.externalLinkOnlyItems;
    return resolvedReport.acceptedItems;
  }, [activeTab, resolvedReport]);

  const activeItem: EvaluatedReferenceLinkItem | null = useMemo(() => {
    if (!snapshot.activeItemId) return null;
    return (
      resolvedReport.acceptedItems.find(
        (item) => item.itemId === snapshot.activeItemId,
      ) ?? null
    );
  }, [resolvedReport.acceptedItems, snapshot.activeItemId]);

  const handleSelectTab = (nextTab: ReferencePolicyFilterTab) => {
    // Switching tabs unmounts any active embed to prevent background playback
    syncFromController(controller.closeEmbed());
    setActiveTab(nextTab);
  };

  const handleTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentTab: ReferencePolicyFilterTab,
  ) => {
    const idx = TAB_ORDER.indexOf(currentTab);
    if (idx === -1) return;
    let nextIdx: number | null = null;
    if (event.key === 'ArrowRight') {
      nextIdx = (idx + 1) % TAB_ORDER.length;
    } else if (event.key === 'ArrowLeft') {
      nextIdx = (idx - 1 + TAB_ORDER.length) % TAB_ORDER.length;
    } else if (event.key === 'Home') {
      nextIdx = 0;
    } else if (event.key === 'End') {
      nextIdx = TAB_ORDER.length - 1;
    }
    if (nextIdx !== null) {
      event.preventDefault();
      const targetTab = TAB_ORDER[nextIdx];
      handleSelectTab(targetTab);
      tabRefs.current[targetTab]?.focus();
    }
  };

  const handleSelectCandidate = (itemId: string) => {
    syncFromController(controller.selectItem(itemId));
  };

  const handleManualClickLoad = () => {
    controller.requestLoadEmbed({ userClicked: true });
    syncFromController(controller.getSnapshot());
  };

  const handleCloseEmbed = () => {
    syncFromController(controller.closeEmbed());
  };

  const handleSimulateEmbedBlocked = () => {
    syncFromController(controller.reportRuntimeFailure('embed-blocked-by-publisher'));
  };

  const handleSimulatePlaybackError = () => {
    syncFromController(controller.reportRuntimeFailure('playback-network-or-media-error'));
  };

  const handleResetFallback = () => {
    syncFromController(controller.resetFailureState());
  };

  return (
    <section
      id={`${instanceId}-root`}
      className={`rlpc-root ${className}`.trim()}
      data-testid="reference-link-policy-preview"
      data-subject-id={resolvedReport.subjectId}
      aria-labelledby={`${instanceId}-title`}
    >
      <header className="rlpc-header">
        <div className="rlpc-eyebrow-row">
          <span className="rlpc-badge rlpc-badge--scope">
            독립 링크·플레이어 표시 계약 후보 (통합 전)
          </span>
          <span className="rlpc-badge">
            해부학·모션 근거 판정 제외 (motionEvidenceReview 별도)
          </span>
          <span className="rlpc-badge">기존 카탈로그·렌더 경로 READ-ONLY</span>
        </div>
        <h3 id={`${instanceId}-title`} className="rlpc-title">
          {resolvedReport.subjectTitleKo} — 참고 링크 정책 검증
        </h3>
        <p className="rlpc-subtitle">
          URL 정규화, 중복 병합, 악성 스킴·사설 IP·다운로더 차단, 개인정보·추적 쿼리 마스킹 제거,
          임베드 불가 출처 외부링크 분리, 사용자 클릭 전 자동재생(autoplay) 방지를 검증합니다.
        </p>
      </header>

      <div
        className="rlpc-metrics-grid"
        data-testid="rlpc-summary-metrics"
        role="region"
        aria-label="링크 정책 평가 요약 지표"
      >
        <div className="rlpc-metric-card">
          <span className="rlpc-metric-label">허용 링크 합계</span>
          <strong className="rlpc-metric-value" data-testid="metric-accepted-count">
            {resolvedReport.summary.acceptedCount}건
          </strong>
        </div>
        <div className="rlpc-metric-card">
          <span className="rlpc-metric-label">수동 임베드 가능</span>
          <strong className="rlpc-metric-value" data-testid="metric-embed-count">
            {resolvedReport.summary.embedCapableCount}건
          </strong>
        </div>
        <div className="rlpc-metric-card">
          <span className="rlpc-metric-label">외부 링크 전용 분리</span>
          <strong className="rlpc-metric-value" data-testid="metric-external-only-count">
            {resolvedReport.summary.externalLinkOnlyCount}건
          </strong>
        </div>
        <div className="rlpc-metric-card">
          <span className="rlpc-metric-label">중복 병합 / 악성 차단</span>
          <strong className="rlpc-metric-value" data-testid="metric-dedup-rejected-count">
            중복 {resolvedReport.summary.deduplicatedCount} · 차단{' '}
            {resolvedReport.summary.rejectedCount}
          </strong>
        </div>
        <div className="rlpc-metric-card">
          <span className="rlpc-metric-label">제거된 개인정보·추적 쿼리</span>
          <strong className="rlpc-metric-value" data-testid="metric-stripped-query-count">
            {resolvedReport.summary.strippedPrivacyQueryTotalCount}건 (값 마스킹)
          </strong>
        </div>
      </div>

      <div
        className="rlpc-tabs"
        role="tablist"
        aria-label="참고 링크 표시 분류 탭"
      >
        <button
          ref={(el) => {
            tabRefs.current.all = el;
          }}
          id={`${instanceId}-tab-all`}
          type="button"
          role="tab"
          className="rlpc-btn"
          data-testid="rlpc-tab-all"
          aria-selected={activeTab === 'all'}
          aria-controls={`${instanceId}-panel`}
          tabIndex={activeTab === 'all' ? 0 : -1}
          onClick={() => handleSelectTab('all')}
          onKeyDown={(e) => handleTabKeyDown(e, 'all')}
        >
          전체 허용 ({resolvedReport.summary.acceptedCount})
        </button>
        <button
          ref={(el) => {
            tabRefs.current['embed-capable'] = el;
          }}
          id={`${instanceId}-tab-embed-capable`}
          type="button"
          role="tab"
          className="rlpc-btn"
          data-testid="rlpc-tab-embed-capable"
          aria-selected={activeTab === 'embed-capable'}
          aria-controls={`${instanceId}-panel`}
          tabIndex={activeTab === 'embed-capable' ? 0 : -1}
          onClick={() => handleSelectTab('embed-capable')}
          onKeyDown={(e) => handleTabKeyDown(e, 'embed-capable')}
        >
          수동 임베드 ({resolvedReport.summary.embedCapableCount})
        </button>
        <button
          ref={(el) => {
            tabRefs.current['external-only'] = el;
          }}
          id={`${instanceId}-tab-external-only`}
          type="button"
          role="tab"
          className="rlpc-btn"
          data-testid="rlpc-tab-external-only"
          aria-selected={activeTab === 'external-only'}
          aria-controls={`${instanceId}-panel`}
          tabIndex={activeTab === 'external-only' ? 0 : -1}
          onClick={() => handleSelectTab('external-only')}
          onKeyDown={(e) => handleTabKeyDown(e, 'external-only')}
        >
          외부링크 분리 ({resolvedReport.summary.externalLinkOnlyCount})
        </button>
        <button
          ref={(el) => {
            tabRefs.current.diagnostics = el;
          }}
          id={`${instanceId}-tab-diagnostics`}
          type="button"
          role="tab"
          className="rlpc-btn"
          data-testid="rlpc-tab-diagnostics"
          aria-selected={activeTab === 'diagnostics'}
          aria-controls={`${instanceId}-panel`}
          tabIndex={activeTab === 'diagnostics' ? 0 : -1}
          onClick={() => handleSelectTab('diagnostics')}
          onKeyDown={(e) => handleTabKeyDown(e, 'diagnostics')}
        >
          정규화·차단 진단 (
          {resolvedReport.summary.deduplicatedCount +
            resolvedReport.summary.rejectedCount}
          )
        </button>
      </div>

      <div id={`${instanceId}-panel`} role="tabpanel">
        {activeTab !== 'diagnostics' && (
          <div
            className="rlpc-candidate-list"
            role="group"
            aria-label="정규화된 참고 링크 목록"
          >
            {visibleItems.map((item) => {
              const isSelected = item.itemId === snapshot.activeItemId;
              const isEmbed =
                item.normalized.displayMode === 'embed-with-external-link';
              return (
                <button
                  key={item.itemId}
                  type="button"
                  className="rlpc-candidate-item"
                  data-testid={`rlpc-candidate-item-${item.itemId}`}
                  aria-pressed={isSelected}
                  onClick={() => handleSelectCandidate(item.itemId)}
                >
                  <div className="rlpc-candidate-top">
                    <span className="rlpc-badge">{item.tierLabelKo}</span>
                    <span
                      className={`rlpc-badge ${
                        isEmbed ? 'rlpc-badge--embed' : 'rlpc-badge--external'
                      }`}
                    >
                      {isEmbed ? '수동 임베드 + 외부 원본' : '외부 링크 전용 분리'}
                    </span>
                    {item.mergedDuplicateCount > 0 && (
                      <span className="rlpc-badge">
                        중복 병합 +{item.mergedDuplicateCount}건
                      </span>
                    )}
                    {item.normalized.strippedQueryKeys.length > 0 && (
                      <span className="rlpc-badge">
                        제거 쿼리 키: {item.normalized.strippedQueryKeys.join(', ')}
                      </span>
                    )}
                  </div>
                  <span className="rlpc-candidate-title">{item.titleKo}</span>
                  <span className="rlpc-candidate-meta">
                    {item.publisherKo} · 정규화 URL: {item.normalized.canonicalExternalUrl}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {activeItem && (
          <div
            className="rlpc-stage"
            data-testid="rlpc-player-stage"
            data-player-state={snapshot.state}
            data-effective-display-mode={snapshot.effectiveDisplayMode}
            data-iframe-mounted={String(snapshot.iframeMounted)}
            data-user-click-verified={String(snapshot.userClickVerified)}
          >
            <div className="rlpc-stage-header">
              <div className="rlpc-eyebrow-row">
                <span className="rlpc-badge">{activeItem.tierLabelKo}</span>
                <span
                  className={`rlpc-badge ${
                    snapshot.effectiveDisplayMode === 'embed-with-external-link'
                      ? 'rlpc-badge--embed'
                      : 'rlpc-badge--external'
                  }`}
                >
                  {snapshot.effectiveDisplayMode === 'embed-with-external-link'
                    ? '수동 임베드 허용 (클릭 전 미로드)'
                    : '외부 원본 링크 전용'}
                </span>
              </div>
              <h4 className="rlpc-stage-title">{activeItem.titleKo}</h4>
              <p className="rlpc-stage-url" data-testid="rlpc-stage-canonical-url">
                정규화 외부 URL: {activeItem.normalized.canonicalExternalUrl}
              </p>
              <p className="rlpc-subtitle">{activeItem.rightsNoteKo}</p>
            </div>

            {snapshot.state === 'idle-unmounted' && (
              <div className="rlpc-idle-box" data-testid="rlpc-idle-guard-box">
                <p className="rlpc-status-text">{snapshot.statusNoticeKo}</p>
                <div className="rlpc-actions-row">
                  <button
                    type="button"
                    className="rlpc-btn rlpc-btn--primary"
                    data-testid="rlpc-manual-load-embed-btn"
                    onClick={handleManualClickLoad}
                  >
                    참고 영상 수동 불러오기 (클릭 시 로드)
                  </button>
                  {snapshot.canonicalExternalUrl && (
                    <a
                      href={snapshot.canonicalExternalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      referrerPolicy="no-referrer"
                      className="rlpc-btn rlpc-btn--secondary"
                      data-testid="rlpc-external-original-link"
                    >
                      {snapshot.externalLinkLabelKo} ↗
                    </a>
                  )}
                </div>
              </div>
            )}

            {snapshot.state === 'loaded-manual' && snapshot.syntheticIframe && (
              <div data-testid="rlpc-loaded-embed-container">
                <div className="rlpc-iframe-wrapper">
                  <iframe
                    className="rlpc-iframe"
                    data-testid="rlpc-synthetic-iframe"
                    src={snapshot.syntheticIframe.iframeSrc}
                    data-canonical-embed-url={snapshot.syntheticIframe.canonicalEmbedUrl}
                    data-autoplay-param={snapshot.syntheticIframe.autoplayParam}
                    data-rel-param={snapshot.syntheticIframe.relParam}
                    title={`${activeItem.titleKo} 수동 로드 참고 플레이어`}
                    allow={snapshot.syntheticIframe.allowAttribute}
                    referrerPolicy={snapshot.syntheticIframe.referrerPolicy}
                    sandbox={snapshot.syntheticIframe.sandboxAttribute}
                    onError={handleSimulatePlaybackError}
                    onErrorCapture={handleSimulatePlaybackError}
                  />
                </div>
                <p className="rlpc-status-text">{snapshot.statusNoticeKo}</p>
                <div className="rlpc-actions-row">
                  <button
                    type="button"
                    className="rlpc-btn"
                    data-testid="rlpc-close-embed-btn"
                    onClick={handleCloseEmbed}
                  >
                    인베드 닫기 (언마운트)
                  </button>
                  <button
                    type="button"
                    className="rlpc-btn rlpc-btn--warning"
                    data-testid="rlpc-simulate-embed-blocked-btn"
                    onClick={handleSimulateEmbedBlocked}
                  >
                    임베드 차단 시뮬레이션 → 외부링크 전환
                  </button>
                  <button
                    type="button"
                    className="rlpc-btn rlpc-btn--warning"
                    data-testid="rlpc-simulate-playback-error-btn"
                    onClick={handleSimulatePlaybackError}
                  >
                    재생 오류 시뮬레이션 → 외부링크 전환
                  </button>
                  {snapshot.canonicalExternalUrl && (
                    <a
                      href={snapshot.canonicalExternalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      referrerPolicy="no-referrer"
                      className="rlpc-btn rlpc-btn--secondary"
                      data-testid="rlpc-external-original-link"
                    >
                      {snapshot.externalLinkLabelKo} ↗
                    </a>
                  )}
                </div>
              </div>
            )}

            {snapshot.state === 'fallback-external-only' && (
              <div
                className="rlpc-fallback-box"
                data-testid="rlpc-external-only-fallback-box"
                role="status"
                aria-live="polite"
              >
                <p className="rlpc-status-text">{snapshot.statusNoticeKo}</p>
                <p className="rlpc-status-text">{activeItem.normalized.reasonKo}</p>
                <div className="rlpc-actions-row">
                  {snapshot.canonicalExternalUrl && (
                    <a
                      href={snapshot.canonicalExternalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      referrerPolicy="no-referrer"
                      className="rlpc-btn rlpc-btn--primary"
                      data-testid="rlpc-external-original-link"
                    >
                      {snapshot.externalLinkLabelKo} ({activeItem.publisherKo}) ↗
                    </a>
                  )}
                  {activeItem.normalized.embedAllowed && (
                    <button
                      type="button"
                      className="rlpc-btn"
                      data-testid="rlpc-reset-fallback-btn"
                      onClick={handleResetFallback}
                    >
                      수동 대기 상태로 초기화
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div
          className="rlpc-diagnostics"
          data-testid="rlpc-diagnostics-section"
          aria-label="정규화·중복·차단·개인정보 쿼리 진단"
        >
          <div className="rlpc-diag-block">
            <h4>
              개인정보·추적 쿼리 마스킹 제거 내역 (
              {resolvedReport.summary.strippedPrivacyQueryTotalCount}건)
            </h4>
            {resolvedReport.acceptedItems.some(
              (item) => item.normalized.strippedQueryParams.length > 0,
            ) ? (
              <ul className="rlpc-diag-list" data-testid="rlpc-stripped-query-list">
                {resolvedReport.acceptedItems.map((item) =>
                  item.normalized.strippedQueryParams.map((param, idx) => (
                    <li key={`${item.itemId}-strip-${param.key}-${idx}`}>
                      <strong>{item.itemId}</strong>: 쿼리 키 <code>{param.key}</code> 제거 (분류:{' '}
                      <code>{param.category}</code>, 원본 값 마스킹:{' '}
                      <code>{String(param.valueRedacted)}</code>)
                    </li>
                  )),
                )}
              </ul>
            ) : (
              <p className="rlpc-subtitle">제거된 개인정보·추적 쿼리가 없습니다.</p>
            )}
          </div>

          <div className="rlpc-diag-block">
            <h4>
              중복 링크 병합 내역 ({resolvedReport.deduplicatedDiagnostics.length}건)
            </h4>
            {resolvedReport.deduplicatedDiagnostics.length > 0 ? (
              <ul className="rlpc-diag-list" data-testid="rlpc-dedup-diag-list">
                {resolvedReport.deduplicatedDiagnostics.map((d) => (
                  <li key={`${d.droppedItemId}->${d.keptItemId}`}>
                    <code>{d.droppedItemId}</code> → <code>{d.keptItemId}</code> ({d.reasonKo})
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rlpc-subtitle">중복으로 병합된 링크가 없습니다.</p>
            )}
          </div>

          <div className="rlpc-diag-block">
            <h4>
              악성 스킴·비허용 URL 차단 내역 ({resolvedReport.rejectedDiagnostics.length}건)
            </h4>
            {resolvedReport.rejectedDiagnostics.length > 0 ? (
              <ul className="rlpc-diag-list" data-testid="rlpc-rejected-diag-list">
                {resolvedReport.rejectedDiagnostics.map((r) => (
                  <li key={r.itemId}>
                    <strong>{r.titleKo}</strong> (<code>{r.itemId}</code>) — 코드:{' '}
                    <code>{r.rejectionCode}</code> · {r.reasonKo}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rlpc-subtitle">차단된 악성·위험 URL이 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ReferenceLinkPolicyFixtureHarness() {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    SYNTHETIC_POLICY_FIXTURE_PRESETS[0].presetId,
  );
  const catalogAudit = useMemo(() => auditExistingPublicUrlSamples(), []);
  const activePreset = useMemo(
    () =>
      SYNTHETIC_POLICY_FIXTURE_PRESETS.find((p) => p.presetId === selectedPresetId) ??
      SYNTHETIC_POLICY_FIXTURE_PRESETS[0],
    [selectedPresetId],
  );
  const activeReport = useMemo(() => activePreset.buildReport(), [activePreset]);

  return (
    <main
      className="rlpc-harness"
      data-testid="reference-link-policy-harness"
    >
      <section
        className="rlpc-diagnostics"
        style={{ marginBottom: '14px' }}
        data-testid="rlpc-catalog-sample-audit-banner"
        aria-label="기존 공개 URL 표본 읽기 전용 감사 요약"
      >
        <div className="rlpc-eyebrow-row">
          <span className="rlpc-badge rlpc-badge--scope">
            기존 카탈로그 표본 인메모리 검증 완료 (크롤링·다운로드 0건)
          </span>
          <span className="rlpc-badge">
            동작 {catalogAudit.exercisesCount}건 · 검증출처 {catalogAudit.verifiedReferencesCount}건
            (웹 {catalogAudit.verifiedWebsiteOnlyCount} / YT{' '}
            {catalogAudit.verifiedYoutubeCandidateCount}) · 공공포털{' '}
            {catalogAudit.publicPortalReferencesCount}건 · 연구출처{' '}
            {catalogAudit.motionCandidateResearchCount}건
          </span>
        </div>
        <p className="rlpc-subtitle" style={{ marginTop: '6px' }}>
          웹사이트·공공포털·연구출처 외부전용 분리:{' '}
          <strong>
            {catalogAudit.allWebsitesAndPortalsSeparatedAsExternalOnly ? '통과' : '실패'}
          </strong>{' '}
          · YouTube 수동 nocookie(autoplay=0) 보장:{' '}
          <strong>
            {catalogAudit.allYoutubeEmbedsEnforceNoAutoplayAndNocookie ? '통과' : '실패'}
          </strong>{' '}
          · 관찰 시점 시크 변환 금지:{' '}
          <strong>
            {catalogAudit.observationPointsNeverTransplantedAsSeekParams ? '통과' : '실패'}
          </strong>
        </p>
      </section>

      <div
        className="rlpc-preset-bar"
        role="group"
        aria-label="합성 검증 시나리오 프리셋 선택"
      >
        {SYNTHETIC_POLICY_FIXTURE_PRESETS.map((preset) => (
          <button
            key={preset.presetId}
            type="button"
            className="rlpc-btn"
            data-testid={`fixture-preset-${preset.presetId}`}
            aria-pressed={preset.presetId === activePreset.presetId}
            onClick={() => setSelectedPresetId(preset.presetId)}
          >
            {preset.labelKo}
          </button>
        ))}
      </div>

      <ReferenceLinkPolicyPreview
        key={activePreset.presetId}
        report={activeReport}
        iframeMode="local-synthetic-fixture"
      />
    </main>
  );
}
