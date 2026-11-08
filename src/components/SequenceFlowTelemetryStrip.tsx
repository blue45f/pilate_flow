import React, { useId, useMemo, useState } from 'react';
import { SPINAL_PLANE_LABELS } from '../data/pilatesCatalog';
import type { SequenceStep, SpinalPlane } from '../types/pilates';
import {
  analyzeSequenceFlow,
  buildOptimizedTransitionSteps,
  type ExerciseLookupInput,
  type SequenceWavePoint,
} from '../utils/sequenceFlowAnalytics';
import '../styles/sequence-flow-telemetry.css';

export interface SequenceFlowTelemetryStripProps {
  steps: readonly SequenceStep[];
  exercisesById: ExerciseLookupInput;
  onApplyTransitionBuffers?: (nextSteps: SequenceStep[]) => void;
  onSelectStep?: (stepId: string) => void;
  defaultExpanded?: boolean;
  className?: string;
}

const ORDERED_PLANES: readonly SpinalPlane[] = [
  'flexion',
  'extension',
  'lateral',
  'rotation',
  'neutral',
];

function buildSparklineGeometry(wavePoints: readonly SequenceWavePoint[]): {
  polylinePoints: string;
  areaPath: string;
  dots: Array<{ x: number; y: number; stepId: string; intensity: number; order: number }>;
} {
  const width = 320;
  const height = 56;
  const padX = 14;
  const padY = 8;

  if (wavePoints.length === 0) {
    return { polylinePoints: '', areaPath: '', dots: [] };
  }

  const usableW = width - padX * 2;
  const usableH = height - padY * 2;

  const dots = wavePoints.map((pt, idx) => {
    const ratioX = wavePoints.length === 1 ? 0.5 : idx / (wavePoints.length - 1);
    const ratioY = Math.max(0, Math.min(1, (pt.intensityScore - 10) / 90));
    const x = Number((padX + ratioX * usableW).toFixed(1));
    const y = Number((height - padY - ratioY * usableH).toFixed(1));
    return {
      x,
      y,
      stepId: pt.stepId,
      intensity: pt.intensityScore,
      order: pt.order,
    };
  });

  const polylinePoints = dots.map((d) => `${d.x},${d.y}`).join(' ');
  const first = dots[0];
  const last = dots[dots.length - 1];
  const baselineY = height - padY;
  const areaPath =
    dots.length === 1
      ? `M ${first.x - 12} ${baselineY} L ${first.x} ${first.y} L ${first.x + 12} ${baselineY} Z`
      : `M ${first.x} ${baselineY} L ${dots.map((d) => `${d.x} ${d.y}`).join(' L ')} L ${last.x} ${baselineY} Z`;

  return { polylinePoints, areaPath, dots };
}

export const SequenceFlowTelemetryStrip: React.FC<SequenceFlowTelemetryStripProps> = ({
  steps,
  exercisesById,
  onApplyTransitionBuffers,
  onSelectStep,
  defaultExpanded = false,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const inspectorId = useId();

  const analysis = useMemo(
    () => analyzeSequenceFlow(steps, exercisesById),
    [steps, exercisesById],
  );

  const sparkline = useMemo(
    () => buildSparklineGeometry(analysis.wavePoints),
    [analysis.wavePoints],
  );

  const scoreToneClass =
    analysis.flowReadinessScore >= 80
      ? ''
      : analysis.flowReadinessScore >= 60
        ? 'sequence-flow-telemetry__score-badge--caution'
        : 'sequence-flow-telemetry__score-badge--alert';

  const handleApplyOptimizedBuffers = () => {
    if (!onApplyTransitionBuffers) return;
    const nextSteps = buildOptimizedTransitionSteps(steps, exercisesById);
    onApplyTransitionBuffers(nextSteps);
  };

  const totalIssueCount =
    analysis.setupOptimizationTipsKo.length +
    analysis.biomechanicalWarningsKo.length +
    analysis.unilateralAlerts.length;

  return (
    <section
      className={`sequence-flow-telemetry${className ? ` ${className}` : ''}`}
      aria-label="시퀀스 흐름 및 기구 세팅 텔레메트리"
      data-testid="sequence-flow-telemetry-strip"
    >
      <div className="sequence-flow-telemetry__summary-bar">
        <div className="sequence-flow-telemetry__identity">
          <div
            className={`sequence-flow-telemetry__score-badge${scoreToneClass ? ` ${scoreToneClass}` : ''}`}
            data-testid="flow-readiness-badge"
          >
            <span className="sequence-flow-telemetry__score-value">
              {analysis.flowReadinessScore}
            </span>
            <span className="sequence-flow-telemetry__score-label">흐름 준비도</span>
          </div>

          <div className="sequence-flow-telemetry__title-group">
            <span className="sequence-flow-telemetry__eyebrow">
              Hardware &amp; Biomechanical Flow Telemetry
            </span>
            <h3 className="sequence-flow-telemetry__title">
              기구 전환 마찰도 {analysis.transitionFrictionScore}점 · 총 {analysis.exerciseStepCount}개
              동작 ({analysis.totalDurationMin}분)
            </h3>
            <p className="sequence-flow-telemetry__subtitle">
              스프링·박스·풋바·자세 전환 동선과 5대 척추 움직임 면(Spinal Plane) 균형을 실시간으로
              점검합니다.
            </p>
          </div>
        </div>

        <div className="sequence-flow-telemetry__counters" role="group" aria-label="기구 세팅 전환 횟수">
          <span
            className={`sequence-flow-telemetry__counter-chip${
              analysis.springSwapCount > 0 ? ' sequence-flow-telemetry__counter-chip--active' : ''
            }`}
            data-testid="swap-counter-springs"
          >
            스프링 교체 {analysis.springSwapCount}회
          </span>
          <span
            className={`sequence-flow-telemetry__counter-chip${
              analysis.boxSwapCount > 0 ? ' sequence-flow-telemetry__counter-chip--active' : ''
            }`}
            data-testid="swap-counter-box"
          >
            박스 전환 {analysis.boxSwapCount}회
          </span>
          <span
            className={`sequence-flow-telemetry__counter-chip${
              analysis.footbarSwapCount > 0 ? ' sequence-flow-telemetry__counter-chip--active' : ''
            }`}
            data-testid="swap-counter-footbar"
          >
            풋바 조절 {analysis.footbarSwapCount}회
          </span>
          <span
            className={`sequence-flow-telemetry__counter-chip${
              analysis.bodyPositionSwitchCount > 0
                ? ' sequence-flow-telemetry__counter-chip--active'
                : ''
            }`}
            data-testid="swap-counter-position"
          >
            자세 전환 {analysis.bodyPositionSwitchCount}회
          </span>
          {analysis.apparatusSwapCount > 0 && (
            <span
              className="sequence-flow-telemetry__counter-chip sequence-flow-telemetry__counter-chip--active"
              data-testid="swap-counter-apparatus"
            >
              기구 이동 {analysis.apparatusSwapCount}회
            </span>
          )}
        </div>

        <div className="sequence-flow-telemetry__actions">
          {onApplyTransitionBuffers && (
            <button
              type="button"
              className="sequence-flow-telemetry__btn sequence-flow-telemetry__btn--primary"
              onClick={handleApplyOptimizedBuffers}
              disabled={analysis.stepsNeedingBufferUpgradeCount === 0}
              data-testid="apply-transition-buffers-btn"
            >
              {analysis.stepsNeedingBufferUpgradeCount > 0
                ? `권장 전환 여유시간 자동 반영 (+${analysis.totalRecommendedBufferDeltaSec}초)`
                : '전환 여유시간 최적화 완료'}
            </button>
          )}

          <button
            type="button"
            className="sequence-flow-telemetry__btn sequence-flow-telemetry__btn--toggle"
            aria-expanded={isExpanded}
            aria-controls={inspectorId}
            onClick={() => setIsExpanded((prev) => !prev)}
            data-testid="toggle-telemetry-inspector-btn"
          >
            {isExpanded
              ? '세팅 변경 상세 접기'
              : `세팅 변경·밸런스 상세 (${totalIssueCount > 0 ? `점검 ${totalIssueCount}건` : '양호'})`}
          </button>
        </div>
      </div>

      <div className="sequence-flow-telemetry__middle-grid">
        <div className="sequence-flow-telemetry__wave-card">
          <div className="sequence-flow-telemetry__card-header">
            <span className="sequence-flow-telemetry__card-title">
              수업 강도 &amp; 척추 파동 곡선 (Intensity Wave)
            </span>
            <span className="sequence-flow-telemetry__card-meta">
              단측성 {analysis.unilateralStepCount}개 · 총 세팅 변경 {analysis.totalHardwareSwapCount}건
            </span>
          </div>

          <svg
            className="sequence-flow-telemetry__sparkline-svg"
            viewBox="0 0 320 56"
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
            data-testid="sequence-wave-sparkline"
          >
            <line
              x1="14"
              y1="48"
              x2="306"
              y2="48"
              stroke="#d5ddd0"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            {sparkline.areaPath && (
              <path d={sparkline.areaPath} fill="rgba(33, 79, 67, 0.12)" />
            )}
            {sparkline.polylinePoints && (
              <polyline
                fill="none"
                stroke="#214f43"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={sparkline.polylinePoints}
              />
            )}
            {sparkline.dots.map((dot) => (
              <circle
                key={dot.stepId}
                cx={dot.x}
                cy={dot.y}
                r="3.5"
                fill="#fffef9"
                stroke="#173d34"
                strokeWidth="2"
              />
            ))}
          </svg>

          <ul className="sequence-flow-telemetry__sr-only" aria-label="스텝별 강도 및 주요 척추 면 요약">
            {analysis.wavePoints.map((pt) => (
              <li key={pt.stepId}>
                #{pt.order} {pt.exerciseNameKo}: 강도 {pt.intensityScore}점, 주요 척추 면{' '}
                {SPINAL_PLANE_LABELS[pt.primaryPlane].ko}, 누적 {pt.cumulativeMinutes}분
              </li>
            ))}
          </ul>
        </div>

        <div className="sequence-flow-telemetry__planes-card">
          <div className="sequence-flow-telemetry__card-header">
            <span className="sequence-flow-telemetry__card-title">
              척추 움직임 면 분포 (Spinal Plane Balance)
            </span>
            <span className="sequence-flow-telemetry__card-meta">
              주도 면: {SPINAL_PLANE_LABELS[analysis.dominantSpinalPlane].ko.split(' ')[0]}
            </span>
          </div>

          <div
            className="sequence-flow-telemetry__plane-pills"
            role="list"
            aria-label="척추 움직임 면 비율"
          >
            {ORDERED_PLANES.map((plane) => {
              const pct = analysis.spinalPlaneDistribution[plane];
              const count = analysis.spinalPlaneCounts[plane];
              const meta = SPINAL_PLANE_LABELS[plane];
              return (
                <span
                  key={plane}
                  role="listitem"
                  className={`sequence-flow-telemetry__plane-pill${
                    count === 0 ? ' sequence-flow-telemetry__plane-pill--zero' : ''
                  }`}
                  data-testid={`plane-pill-${plane}`}
                >
                  <span aria-hidden="true">{meta.symbol}</span>
                  <span>{meta.ko.split(' ')[0]}</span>
                  <span>{pct}%</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div
          id={inspectorId}
          className="sequence-flow-telemetry__inspector"
          data-testid="sequence-flow-telemetry-inspector"
        >
          {(analysis.setupOptimizationTipsKo.length > 0 ||
            analysis.biomechanicalWarningsKo.length > 0 ||
            analysis.unilateralAlerts.length > 0) && (
            <div className="sequence-flow-telemetry__alerts-grid">
              {analysis.setupOptimizationTipsKo.length > 0 && (
                <div
                  className="sequence-flow-telemetry__alert-box sequence-flow-telemetry__alert-box--info"
                  data-testid="setup-optimization-tips"
                >
                  <h4 className="sequence-flow-telemetry__alert-title">
                    기구 세팅 동선 최적화 제안
                  </h4>
                  <ul className="sequence-flow-telemetry__alert-list">
                    {analysis.setupOptimizationTipsKo.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              {(analysis.biomechanicalWarningsKo.length > 0 ||
                analysis.unilateralAlerts.length > 0) && (
                <div
                  className="sequence-flow-telemetry__alert-box"
                  data-testid="biomechanical-and-pacing-warnings"
                >
                  <h4 className="sequence-flow-telemetry__alert-title">
                    척추 밸런스 &amp; 단측성(Unilateral) 페이싱 점검
                  </h4>
                  <ul className="sequence-flow-telemetry__alert-list">
                    {analysis.biomechanicalWarningsKo.map((warn, idx) => (
                      <li key={`bio-${idx}`}>{warn}</li>
                    ))}
                    {analysis.unilateralAlerts.map((alert) => (
                      <li key={`uni-${alert.stepId}`}>{alert.reasonKo}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <ol
            className="sequence-flow-telemetry__diff-list"
            aria-label="스텝별 기구 세팅 전환 내역"
            data-testid="step-setup-diff-list"
          >
            {analysis.stepDiffs.map((diff) => {
              const itemToneClass =
                diff.severity === 'major'
                  ? ' sequence-flow-telemetry__diff-item--major'
                  : diff.severity === 'minor'
                    ? ' sequence-flow-telemetry__diff-item--minor'
                    : '';

              return (
                <li
                  key={diff.stepId}
                  className={`sequence-flow-telemetry__diff-item${itemToneClass}`}
                  data-testid={`step-setup-diff-${diff.stepId}`}
                >
                  <div className="sequence-flow-telemetry__diff-main">
                    <span className="sequence-flow-telemetry__step-order">
                      #{String(diff.order).padStart(2, '0')}
                    </span>
                    {onSelectStep ? (
                      <button
                        type="button"
                        className="sequence-flow-telemetry__step-name-btn"
                        onClick={() => onSelectStep(diff.stepId)}
                      >
                        {diff.exerciseNameKo}
                      </button>
                    ) : (
                      <span className="sequence-flow-telemetry__step-name-static">
                        {diff.exerciseNameKo}
                      </span>
                    )}
                  </div>

                  <div className="sequence-flow-telemetry__badges">
                    {diff.fromStepId === null ? (
                      <span className="sequence-flow-telemetry__diff-badge sequence-flow-telemetry__diff-badge--smooth">
                        초기 세팅 · 스프링 {diff.springs} · {diff.box === 'none' ? '박스 없음' : diff.box}
                      </span>
                    ) : diff.changeBadgesKo.length === 0 ? (
                      <span className="sequence-flow-telemetry__diff-badge sequence-flow-telemetry__diff-badge--smooth">
                        세팅 동일 유지 (무전환 연결)
                      </span>
                    ) : (
                      diff.changeBadgesKo.map((badge, bIdx) => (
                        <span
                          key={bIdx}
                          className="sequence-flow-telemetry__diff-badge sequence-flow-telemetry__diff-badge--change"
                        >
                          {badge}
                        </span>
                      ))
                    )}

                    {diff.recommendedTransitionSec > 0 && (
                      <span className="sequence-flow-telemetry__diff-badge">
                        전환 {diff.actualTransitionSec}초 / 권장 {diff.recommendedTransitionSec}초
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
};
export default SequenceFlowTelemetryStrip;
