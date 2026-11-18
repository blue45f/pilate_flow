import React, { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
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
  const prefersReduced = useReducedMotion();
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

  const pacingAndMilestones = useMemo(() => {
    let deltaSumMin = 0;
    let deltaCount = 0;
    const groupCounts = new Map<string, number>();

    for (const log of actualLogs) {
      const groupLabel = log.groupName?.trim() || '일반 수업';
      groupCounts.set(groupLabel, (groupCounts.get(groupLabel) ?? 0) + 1);

      const resolved = resolvedHistoryMap.get(log.id);
      const actualSec = resolved?.timing.actualDurationSec ?? log.actualDurationSec;
      const plannedSec =
        resolved?.timing.plannedTotalSec ??
        (log.criteriaSnapshot?.targetMinutes ? log.criteriaSnapshot.targetMinutes * 60 : undefined);
      if (
        typeof actualSec === 'number' &&
        actualSec > 0 &&
        typeof plannedSec === 'number' &&
        plannedSec > 0
      ) {
        deltaSumMin += (actualSec - plannedSec) / 60;
        deltaCount += 1;
      }
    }

    const avgDeltaMin = deltaCount > 0 ? Math.round((deltaSumMin / deltaCount) * 10) / 10 : null;
    const pacingLabelKo =
      avgDeltaMin === null
        ? '실측 타이머 기록 대기'
        : Math.abs(avgDeltaMin) <= 1.5
          ? '평균 정시 진행 (±1.5분 이내)'
          : avgDeltaMin > 0
            ? `계획 대비 평균 +${avgDeltaMin}분 여유 진행`
            : `계획 대비 평균 ${avgDeltaMin}분 빠른 마무리`;

    const sortedGroups = [...groupCounts.entries()].sort((a, b) => b[1] - a[1]);
    const milestones = sortedGroups.slice(0, 3).map(([name, count]) => {
      const tier =
        count >= 25
          ? '25회+ 장기 호흡 반'
          : count >= 10
            ? '10회+ 정규 안착 반'
            : count >= 5
              ? '5회+ 루틴 형성 반'
              : `누적 ${count}회 진행`;
      return { name, count, tier };
    });

    return { pacingLabelKo, milestones };
  }, [actualLogs, resolvedHistoryMap]);

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
            <Compass size={13} strokeWidth={1.5} aria-hidden="true" style={{ verticalAlign: 'middle' }} />{' '}
            최근 수업 흐름 요약
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
                {windowSize === opt.size && (
                  <motion.span
                    layoutId={prefersReduced ? undefined : 'pf-balance-window-pill'}
                    className="pf-seg-pill"
                    aria-hidden="true"
                    transition={
                      prefersReduced
                        ? { duration: 0 }
                        : { type: 'spring', duration: 0.24, bounce: 0 }
                    }
                  />
                )}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {report.analyzedSessionCount === 0 ? (
        <div className="pf-balance-empty" data-testid="balance-insight-empty">
          <p className="muted">첫 수업 기록을 남기면 반별 진행 횟수와 움직임 균형이 이곳에 요약됩니다.</p>
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
          <div
            className="pf-balance-pacing-milestone-strip"
            data-testid="balance-pacing-milestone-strip"
            aria-label="계획 대비 시간 운영 편차 및 반별 누적 마일스톤"
          >
            <span className="pf-pacing-pill">{pacingAndMilestones.pacingLabelKo}</span>
            {pacingAndMilestones.milestones.map((ms) => (
              <span key={ms.name} className="pf-milestone-pill">
                🏅 {ms.name} · {ms.tier} ({ms.count}회)
              </span>
            ))}
          </div>

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

          <details className="pf-balance-criteria-details">
            <summary>집계 기준 안내</summary>
            <div className="pf-balance-criteria-details__body">
              <p className="muted pf-balance-data-note">
                현재 선택한 기록 중 최근 {report.analyzedSessionCount}회 · 시간 정보{' '}
                {report.timedSessionCount}회 · 동작 시간 스냅샷 {report.snapshotSessionCount}회. 평균은
                실제 기록 시간이 있으면 실제 시간, 없으면 보존된 계획 시간을 사용합니다.
              </p>
              <p className="muted pf-balance-data-note">
                보존된 계획의 동작 시간 {report.totalMovementMinutes}분 중 분류 정보 없음{' '}
                {report.unclassifiedMovementMinutes}분. 설명·전환·휴식은 제외하며, 복수 분류 동작은
                시간을 나누어 계산합니다.
              </p>
              <p className="muted pf-balance-disclaimer">
                예시 기록은 제외하고 보존된 수업 스냅샷만 로컬에서 계산합니다. 시간 비중은 실제 수행량을
                측정한 값이 아니며, 수업 구성 다양성을 돌아보는 참고 지표입니다.
              </p>
            </div>
          </details>
        </>
      )}
    </PfCard>
  );
};
