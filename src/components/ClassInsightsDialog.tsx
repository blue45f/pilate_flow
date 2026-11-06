import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import type { ClassHistoryLog, PilatesExercise, SequenceStep } from '../types/pilates';
import { buildHistoryInsights, buildPlanInsights } from '../utils/classInsights';
import { LightDismissDialog } from './LightDismissDialog';
import '../styles/class-insights.css';

export interface ClassInsightsDialogProps {
  onClose: () => void;
  title: string;
  steps: readonly SequenceStep[];
  exercises: readonly PilatesExercise[];
  historyLogs: readonly ClassHistoryLog[];
}

const TABS = ['구성', '좌우', '기록'] as const;
const INTENSITY_LABELS = { relaxed: '가볍게', moderate: '보통', intense: '높게' };

function timeLabel(seconds: number | null): string {
  if (seconds === null) return '미기록';
  const roundedSeconds = Math.round(seconds * 10) / 10;
  const minutes = Math.floor(roundedSeconds / 60);
  const remainder = Math.round((roundedSeconds % 60) * 10) / 10;
  return `${minutes}분 ${remainder}초`;
}

function differenceLabel(seconds: number | null): string {
  if (seconds === null) return '비교 불가';
  if (seconds === 0) return '차이 없음';
  return `${timeLabel(Math.abs(seconds))} ${seconds > 0 ? '더 길게 기록' : '더 짧게 기록'}`;
}

function LabeledBar({
  label,
  seconds,
  denominator,
}: {
  label: string;
  seconds: number;
  denominator: number;
}) {
  const percent = denominator > 0 ? (seconds / denominator) * 100 : 0;
  return (
    <div className="class-insights-bar-row">
      <div className="class-insights-bar-label">
        <span>{label}</span>
        <strong>
          {timeLabel(seconds)} · {percent.toFixed(1)}%
        </strong>
      </div>
      <div className="class-insights-bar-track" aria-hidden="true">
        <span style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
      </div>
    </div>
  );
}

/** Read-only, locally snapshotted planning and history summaries. */
export function ClassInsightsDialog({
  onClose,
  title,
  steps,
  exercises,
  historyLogs,
}: ClassInsightsDialogProps) {
  const [snapshot] = useState(() => structuredClone({ title, steps, exercises, historyLogs }));
  const [tab, setTab] = useState<(typeof TABS)[number]>('구성');
  const [showMoreTags, setShowMoreTags] = useState(false);
  const [includeExamples, setIncludeExamples] = useState(false);
  const id = useId();
  const plan = useMemo(() => buildPlanInsights(snapshot.steps, snapshot.exercises), [snapshot]);
  const history = useMemo(
    () => buildHistoryInsights(snapshot.historyLogs, { includeExamples }),
    [snapshot, includeExamples],
  );
  const timingRows = [
    { label: '동작', seconds: plan.movementSec },
    { label: '설명', seconds: plan.explanationSec },
    { label: '전환', seconds: plan.transitionSec },
    { label: '휴식', seconds: plan.restSec },
  ];
  const sideRows = [
    { label: '명시한 왼쪽', seconds: plan.sides.leftSec },
    { label: '명시한 오른쪽', seconds: plan.sides.rightSec },
    { label: '명시한 양쪽 함께', seconds: plan.sides.togetherSec },
    { label: '해부학적 좌우 미지정', seconds: plan.sides.unspecifiedSec },
  ];
  const visibleTags = plan.bodyTags.slice(0, showMoreTags ? 12 : 6);

  function navigateTabs(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === 'ArrowRight') next = (index + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') next = (index + TABS.length - 1) % TABS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = TABS.length - 1;
    else return;
    event.preventDefault();
    setTab(TABS[next]);
    document.getElementById(`${id}-tab-${next}`)?.focus();
  }

  return (
    <LightDismissDialog
      open
      onClose={onClose}
      title="수업 구성 살펴보기"
      subtitle={`${snapshot.title || '현재 수업 계획'} · 열 때의 계획과 기록을 기준으로 표시합니다.`}
      maxWidth="960px"
      className="class-insights-dialog"
    >
      <div className="class-insights">
        <div role="tablist" aria-label="수업 분석 보기" className="class-insights-tabs">
          {TABS.map((label, index) => (
            <button
              key={label}
              type="button"
              role="tab"
              id={`${id}-tab-${index}`}
              aria-selected={tab === label}
              aria-controls={`${id}-panel-${index}`}
              tabIndex={tab === label ? 0 : -1}
              onClick={() => setTab(label)}
              onKeyDown={(event) => navigateTabs(event, index)}
            >
              {label}
            </button>
          ))}
        </div>

        <section
          role="tabpanel"
          id={`${id}-panel-0`}
          aria-labelledby={`${id}-tab-0`}
          hidden={tab !== '구성'}
          tabIndex={0}
        >
          <div className="class-insights-summary">
            <p>
              전체 계획 <strong>{timeLabel(plan.totalSec)}</strong>
            </p>
            <p>
              동작 {plan.exerciseStepCount}개 · 휴식 {plan.restStepCount}개
            </p>
          </div>
          <h3>계획 시간의 구성</h3>
          <p className="class-insights-note">
            전체 계획 시간 안에 동작·설명·전환·휴식을 각각 한 번만 포함합니다.
          </p>
          {timingRows.map((row) => (
            <LabeledBar
              key={row.label}
              label={row.label}
              seconds={row.seconds}
              denominator={plan.totalSec}
            />
          ))}
          <details className="class-insights-data">
            <summary>계획 시간 표 보기</summary>
            <table>
              <caption>계획 시간 구성 원자료</caption>
              <thead>
                <tr>
                  <th scope="col">구분</th>
                  <th scope="col">계획 시간</th>
                </tr>
              </thead>
              <tbody>
                {timingRows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    <td>{timeLabel(row.seconds)}</td>
                  </tr>
                ))}
                <tr>
                  <th scope="row">전체</th>
                  <td>{timeLabel(plan.totalSec)}</td>
                </tr>
              </tbody>
            </table>
          </details>

          <h3>부위 태그의 계획 범위</h3>
          <p className="class-insights-note">
            동작 메타데이터의 태그 범위이며 실제 근육 부하가 아닙니다. 한 동작에 여러 태그가 겹칠 수
            있어 비율 합계는 100%를 넘을 수 있습니다.
          </p>
          <p className="class-insights-note">
            막대의 기준: 전체 동작 시간 {timeLabel(plan.movementSec)}. 같은 동작의 중복 태그는 한
            번만 셉니다.
          </p>
          {!plan.bodyTags.length && (
            <p className="class-insights-empty">표시할 부위 태그가 없습니다.</p>
          )}
          {visibleTags.map((tag) => (
            <LabeledBar
              key={tag.label}
              label={`${tag.label} · ${tag.stepCount}개 동작`}
              seconds={tag.movementSec}
              denominator={plan.movementSec}
            />
          ))}
          {plan.bodyTags.length > 6 && (
            <button
              type="button"
              className="class-insights-disclosure"
              aria-expanded={showMoreTags}
              onClick={() => setShowMoreTags((value) => !value)}
            >
              {showMoreTags ? '상위 6개만 보기' : '태그 더 보기'}
            </button>
          )}
          {showMoreTags && plan.bodyTags.length > 12 && (
            <p className="class-insights-note">
              막대는 상위 12개입니다. 나머지 {plan.bodyTags.length - 12}개는 아래 전체 표에서 확인할
              수 있습니다.
            </p>
          )}
          <div className="class-insights-missing">
            <p>
              태그 미지정: {plan.untagged.stepCount}개 동작 · {timeLabel(plan.untagged.movementSec)}
            </p>
            <p>
              동작 정보 없음: {plan.missingExercise.stepCount}개 동작 ·{' '}
              {timeLabel(plan.missingExercise.movementSec)}
            </p>
          </div>
          <details className="class-insights-data">
            <summary>모든 태그 표 보기 ({plan.bodyTags.length}개)</summary>
            <div
              className="class-insights-table-scroll"
              role="region"
              aria-label="전체 부위 태그 표"
              tabIndex={0}
            >
              <table>
                <caption>부위 태그별 계획 범위 · 서로 겹치는 시간 포함</caption>
                <thead>
                  <tr>
                    <th scope="col">태그</th>
                    <th scope="col">동작 수</th>
                    <th scope="col">동작 시간</th>
                    <th scope="col">전체 동작 대비</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.bodyTags.map((tag) => (
                    <tr key={tag.label}>
                      <th scope="row">{tag.label}</th>
                      <td>{tag.stepCount}</td>
                      <td>{timeLabel(tag.movementSec)}</td>
                      <td>{(tag.shareOfMovement * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>

        <section
          role="tabpanel"
          id={`${id}-panel-1`}
          aria-labelledby={`${id}-tab-1`}
          hidden={tab !== '좌우'}
          tabIndex={0}
        >
          <h3>명시한 좌우의 동작 시간</h3>
          <p className="class-insights-note">
            직접 지정한 해부학적 좌우만 나눕니다. 양쪽 함께와 미지정은 따로 표시하며, 시간 배분은
            실제 신체 부하를 뜻하지 않습니다.
          </p>
          <p className="class-insights-note">
            좌우 순서가 없는 기본 ‘첫 번째 쪽·반대쪽’은 왼쪽·오른쪽으로 추정하지 않습니다. 좌우를
            순서대로 지정한 동작은 계획의 양쪽 시간 예산을 나눠 표시합니다.
          </p>
          {sideRows.map((row) => (
            <LabeledBar
              key={row.label}
              label={row.label}
              seconds={row.seconds}
              denominator={plan.movementSec}
            />
          ))}
          <div
            className="class-insights-table-scroll"
            role="region"
            aria-label="동작별 좌우 시간 표"
            tabIndex={0}
          >
            <table>
              <caption>동작별 명시한 좌우 계획 · 설명·전환·휴식 제외</caption>
              <thead>
                <tr>
                  <th scope="col">동작·지정</th>
                  <th scope="col">왼쪽</th>
                  <th scope="col">오른쪽</th>
                  <th scope="col">양쪽 함께</th>
                  <th scope="col">미지정</th>
                </tr>
              </thead>
              <tbody>
                {plan.sideRows.map((row, index) => (
                  <tr key={`${row.stepId}-${index}`}>
                    <th scope="row">
                      {row.name}
                      <span className="class-insights-cell-note">
                        {row.labels.join(' → ')}
                        {row.unspecifiedSec > 0 ? ' · 해부학적 좌우 미지정' : ''}
                      </span>
                    </th>
                    <td>{timeLabel(row.leftSec)}</td>
                    <td>{timeLabel(row.rightSec)}</td>
                    <td>{timeLabel(row.togetherSec)}</td>
                    <td>{timeLabel(row.unspecifiedSec)}</td>
                  </tr>
                ))}
                {!plan.sideRows.length && (
                  <tr>
                    <td colSpan={5}>분석할 동작이 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section
          role="tabpanel"
          id={`${id}-panel-2`}
          aria-labelledby={`${id}-tab-2`}
          hidden={tab !== '기록'}
          tabIndex={0}
        >
          <h3>계획과 직접 남긴 수업 기록</h3>
          <label className="class-insights-checkbox">
            <input
              type="checkbox"
              checked={includeExamples}
              onChange={(event) => setIncludeExamples(event.target.checked)}
            />
            예시 기록 포함
          </label>
          <p className="class-insights-note">
            {includeExamples
              ? '예시 기록을 함께 표시합니다. 각 예시 행에 별도로 표시합니다.'
              : `기본 예시 ${history.excludedExamples}건 제외 · 내 기록 ${history.rows.length}건`}
          </p>
          <p className="class-insights-note">
            과거 계획은 각 기록의 계획 사본만 사용합니다. 현재 저장된 시퀀스로 채우지 않습니다.
            ‘기록된 목표’는 당시 목표이며 계획 합계와 다를 수 있습니다.
          </p>
          <p className="class-insights-note">
            실제 총시간 {history.actualTotalCount}건 · 실제 휴식 {history.actualRestCount}건 · 계획
            사본 {history.plannedSnapshotCount}건. 미기록은 0과 구분합니다. 실제 동작·설명·전환
            시간은 따로 기록되지 않아 계산하지 않습니다.
          </p>
          <h4>주관적으로 기록한 강도</h4>
          <ul className="class-insights-categories">
            {(['relaxed', 'moderate', 'intense'] as const).map((value) => (
              <li key={value}>
                {INTENSITY_LABELS[value]} <strong>{history.intensityCounts[value]}건</strong>
              </li>
            ))}
          </ul>
          <p className="class-insights-note">
            강도는 기록한 세 범주 그대로입니다. 만족도 1–5점은 별도 평가이며, RPE로 바꾸거나 평균
            강도를 계산하지 않습니다.
          </p>
          {!history.rows.length && (
            <p className="class-insights-empty">
              표시할 내 수업 기록이 없습니다. 실제 기록이 생기면 이곳에서 확인할 수 있습니다.
            </p>
          )}
          <div
            className="class-insights-table-scroll"
            role="region"
            aria-label="수업 기록 비교 표"
            tabIndex={0}
          >
            <table className="class-insights-history-table">
              <caption>수업별 계획 사본과 기록한 실제 시간 · 전체 그룹</caption>
              <thead>
                <tr>
                  <th scope="col">수업 기록</th>
                  <th scope="col">계획 / 실제 총시간</th>
                  <th scope="col">계획 / 실제 휴식</th>
                  <th scope="col">기록된 목표</th>
                  <th scope="col">주관적 강도</th>
                  <th scope="col">만족도</th>
                </tr>
              </thead>
              <tbody>
                {history.rows.map((row) => (
                  <tr key={row.id}>
                    <th scope="row">
                      {row.sequenceTitle}
                      {row.isExample && <span className="class-insights-example">예시</span>}
                      <span className="class-insights-cell-note">
                        {row.taughtAt.slice(0, 10)} · {row.groupName}
                      </span>
                    </th>
                    <td>
                      <span>
                        계획{' '}
                        {row.plannedTotalSec === null
                          ? '사본 없음'
                          : timeLabel(row.plannedTotalSec)}
                      </span>
                      <span>실제 {timeLabel(row.actualTotalSec)}</span>
                      <span className="class-insights-cell-note">
                        {differenceLabel(row.totalDeltaSec)}
                      </span>
                    </td>
                    <td>
                      <span>
                        계획{' '}
                        {row.plannedRestSec === null ? '사본 없음' : timeLabel(row.plannedRestSec)}
                      </span>
                      <span>실제 {timeLabel(row.actualRestSec)}</span>
                      <span className="class-insights-cell-note">
                        {differenceLabel(row.restDeltaSec)}
                      </span>
                    </td>
                    <td>{timeLabel(row.recordedTargetSec)}</td>
                    <td>{INTENSITY_LABELS[row.intensity]}</td>
                    <td>
                      {row.rating} / 5<span className="class-insights-cell-note">만족도</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </LightDismissDialog>
  );
}
