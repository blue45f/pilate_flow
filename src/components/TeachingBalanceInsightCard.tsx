import React, { useMemo, useState } from 'react';
import { Activity, ArrowRight, Compass } from 'lucide-react';
import { PfBadge, PfButton, PfCard } from '../design-system';
import type { ClassHistoryLog, PilatesExercise } from '../types/pilates';
import type { ResolvedTeachingHistoryView } from '../types/teachingHistorySnapshot';
import { computeTeachingBalanceInsight } from '../utils/teachingBalanceAnalytics';
import { VisualSpineBalanceDiagram } from './VisualFlowComponents';
import '../styles/teaching-balance.css';

export interface TeachingBalanceInsightCardProps {
  readonly actualLogs: readonly ClassHistoryLog[];
  readonly resolvedHistoryMap: ReadonlyMap<string, ResolvedTeachingHistoryView>;
  readonly exercisesMap: ReadonlyMap<string, PilatesExercise>;
  readonly onJumpToWorkbench: () => void;
}

export const TeachingBalanceInsightCard: React.FC<TeachingBalanceInsightCardProps> = ({
  actualLogs,
  resolvedHistoryMap,
  exercisesMap,
  onJumpToWorkbench,
}) => {
  const [windowSize, setWindowSize] = useState<5 | 15>(5);

  const report = useMemo(
    () =>
      computeTeachingBalanceInsight({
        actualLogs,
        resolvedHistoryMap,
        exercisesMap,
        maxSessions: windowSize,
      }),
    [actualLogs, resolvedHistoryMap, exercisesMap, windowSize],
  );

  return (
    <PfCard
      as="section"
      className="teaching-memory-card pf-balance-insight-card"
      data-testid="teaching-balance-insight-card"
      aria-label="수업 기록 스냅샷 기반 움직임 분류·블록 리포트"
    >
      <div className="pf-balance-insight-card__head">
        <div>
          <span className="eyebrow">
            <Compass size={13} aria-hidden="true" style={{ verticalAlign: 'middle' }} /> RECENT FLOW
            BALANCE
          </span>
          <h2 className="section-heading">움직임 분류 · 블록 밸런스</h2>
        </div>
        {report.analyzedSessionCount > 0 && (
          <div
            className="pf-balance-window-tabs"
            role="group"
            aria-label="밸런스 분석 범위 선택"
            data-testid="balance-insight-window-tabs"
          >
            {(
              [
                { size: 5 as const, label: '최근 5회' },
                { size: 15 as const, label: '최근 15회' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.size}
                type="button"
                className={`pf-balance-window-btn ${windowSize === opt.size ? 'is-active' : ''}`.trim()}
                aria-pressed={windowSize === opt.size}
                onClick={() => setWindowSize(opt.size)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {report.analyzedSessionCount === 0 ? (
        <div className="pf-balance-empty" data-testid="balance-insight-empty">
          <p className="muted">{report.coachingSuggestionKo}</p>
          <PfButton variant="secondary" onClick={onJumpToWorkbench}>
            오늘 수업 계획하러 가기 <ArrowRight size={15} />
          </PfButton>
        </div>
      ) : (
        <>
          <div className="pf-balance-kpi-row" data-testid="balance-insight-kpis">
            <span>
              분석 기록 <strong>{report.analyzedSessionCount}회</strong>
            </span>
            <span>
              평균 기록 시간{' '}
              <strong>
                {report.avgActualOrPlannedMinutes === null
                  ? '정보 없음'
                  : `${report.avgActualOrPlannedMinutes}분`}
              </strong>
            </span>
            <span>
              강사 체감 만족도 <strong>{report.avgRating}/5</strong>
            </span>
          </div>
          <p className="muted pf-balance-data-note">
            현재 선택한 기록 중 최근 {report.analyzedSessionCount}회 · 시간 정보{' '}
            {report.timedSessionCount}회 · 동작 시간 스냅샷 {report.snapshotSessionCount}회. 평균은
            실제 기록 시간이 있으면 실제 시간, 없으면 보존된 계획 시간을 사용합니다.
          </p>

          <div className="pf-balance-visual-grid">
            <VisualSpineBalanceDiagram underRepresentedPlaneId={report.underRepresentedPlaneId} />
            <div
              className="pf-balance-planes"
              role="list"
              aria-label="분류된 동작 시간의 중립·굴곡·신전·측굴 및 회전 비중"
              data-testid="balance-spinal-planes-list"
            >
              {report.spinalPlaneMetrics.map((plane) => {
                const isLow = report.underRepresentedPlaneId === plane.id;
                return (
                  <div
                    key={plane.id}
                    role="listitem"
                    className={`pf-balance-plane-row ${isLow ? 'is-low' : ''}`.trim()}
                    data-testid={`balance-plane-${plane.id}`}
                  >
                    <div className="pf-balance-plane-row__top">
                      <span>
                        {plane.labelKo}
                        {isLow && <em className="pf-balance-low-tag">구성 검토</em>}
                      </span>
                      <strong>
                        {plane.sharePct}% <small>({plane.minutes}분)</small>
                      </strong>
                    </div>
                    <div className="pf-balance-bar-track" aria-hidden="true">
                      <span
                        className={`pf-balance-bar-fill ${isLow ? 'is-low' : ''}`.trim()}
                        style={{ width: `${plane.sharePct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="muted pf-balance-data-note">
            보존된 계획의 동작 시간 {report.totalMovementMinutes}분 중 분류 정보 없음{' '}
            {report.unclassifiedMovementMinutes}분. 설명·전환·휴식은 제외하며, 복수 분류 동작은
            시간을 나누어 계산합니다.
          </p>

          {report.topBlockMetrics.length > 0 && (
            <div className="pf-balance-blocks" data-testid="balance-top-blocks">
              <strong className="pf-balance-subhead">
                <Activity size={14} aria-hidden="true" /> 집중 수업 블록 Top{' '}
                {report.topBlockMetrics.length}
              </strong>
              <div className="pf-class-badges-strip">
                {report.topBlockMetrics.map((blk) => (
                  <PfBadge key={blk.category} tone="sage">
                    {blk.labelKo} {blk.sharePct}%
                  </PfBadge>
                ))}
              </div>
            </div>
          )}

          {report.apparatusMetrics.length > 0 && (
            <div className="pf-class-badges-strip" data-testid="balance-apparatus-mix">
              {report.apparatusMetrics.map((ap) => (
                <span key={ap.apparatus} className="pf-class-apparatus-pill">
                  {ap.labelKo} {ap.sessionCount}회 ({ap.sharePct}%)
                </span>
              ))}
            </div>
          )}

          <div
            className={`pf-balance-coach-box ${
              report.underRepresentedPlaneId ? 'has-gap' : 'is-balanced'
            }`}
            data-testid="balance-coaching-callout"
          >
            <strong>{report.recommendedPresetFocusKo}</strong>
            <p>{report.coachingSuggestionKo}</p>
            <PfButton
              variant="secondary"
              data-testid="balance-jump-workbench-btn"
              onClick={onJumpToWorkbench}
            >
              다음 수업 계획 검토하기 <ArrowRight size={15} />
            </PfButton>
          </div>
        </>
      )}

      <p className="muted pf-balance-disclaimer">
        예시 기록은 제외하고 보존된 수업 스냅샷만 로컬에서 계산합니다. 시간 비중은 실제 수행량을
        측정한 값이 아니며, 움직임 분류와 수업 구성 다양성을 돌아보는 참고 지표입니다.
      </p>
    </PfCard>
  );
};
