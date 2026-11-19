import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock3,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  ShieldCheck,
  SlidersHorizontal,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { PilatesExercise, SequenceStep } from '../../types/pilates';
import { computeFiveMinutePrepSummary } from '../../utils/fiveMinutePrepAudit';
import { formatSecondsToMMSS } from '../../utils/sequenceEngine';

export interface FiveMinutePrepDrawerProps {
  readonly activeSteps: readonly SequenceStep[];
  readonly exercisesById: ReadonlyMap<string, PilatesExercise>;
  readonly targetMinutes: number;
  readonly selectedEquipmentCount: number;
  readonly canStartClass: boolean;
  readonly canAutoFitDuration: boolean;
  readonly undoCount: number;
  readonly redoCount: number;
  readonly hasPersistenceError: boolean;
  readonly onOpenConditions: () => void;
  readonly onOpenFinder: () => void;
  readonly onFitDuration: () => void;
  readonly onStartClass: () => void;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
}

export function FiveMinutePrepDrawer({
  activeSteps,
  exercisesById,
  targetMinutes,
  selectedEquipmentCount,
  canStartClass,
  canAutoFitDuration,
  undoCount,
  redoCount,
  hasPersistenceError,
  onOpenConditions,
  onOpenFinder,
  onFitDuration,
  onStartClass,
  onUndo,
  onRedo,
}: FiveMinutePrepDrawerProps) {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const summary = useMemo(
    () =>
      computeFiveMinutePrepSummary({
        activeSteps,
        exercisesById,
        targetMinutes,
        selectedEquipmentCount,
        canStartClass,
      }),
    [activeSteps, exercisesById, targetMinutes, selectedEquipmentCount, canStartClass],
  );

  return (
    <details
      className="workbench-automation-tools pf-five-min-prep-drawer"
      data-testid="five-minute-prep-drawer"
    >
      <summary>
        <span>
          수업 5분 전 한 손 점검 · {summary.completedSteps}/{summary.totalSteps} 완료
        </span>
      </summary>
      <div className="pf-five-min-prep-body">
        <div
          className="pf-five-min-prep-status-row"
          role="status"
          aria-live="polite"
          data-testid="five-minute-prep-resilience"
        >
          <span className={`pf-five-min-status-chip ${isOnline ? 'is-online' : 'is-offline'}`}>
            {isOnline ? (
              <Wifi size={14} aria-hidden="true" />
            ) : (
              <WifiOff size={14} aria-hidden="true" />
            )}
            <span>
              {isOnline
                ? '온라인 · 오프라인 로컬 엔진 대기 중'
                : '오프라인 모드 · 로컬 규칙·기기 저장으로 무중단 진행'}
            </span>
          </span>
          <span
            className={`pf-five-min-status-chip ${hasPersistenceError ? 'is-warn' : 'is-safe'}`}
          >
            <ShieldCheck size={14} aria-hidden="true" />
            <span>
              {hasPersistenceError
                ? '기기 저장 공간 확인 필요 · 백업 권장'
                : '기기 자동 보관 정상'}
            </span>
          </span>
        </div>

        <ol className="pf-five-min-checklist" aria-label="수업 5분 전 4단계 체크리스트">
          {summary.steps.map((item) => (
            <li
              key={item.id}
              className={`pf-five-min-step ${item.done ? 'is-done' : ''}`}
              data-testid={`five-min-step-${item.id}`}
            >
              <div className="pf-five-min-step-main">
                <span className="pf-five-min-step-icon" aria-hidden="true">
                  {item.done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                </span>
                <div className="pf-five-min-step-copy">
                  <strong>
                    {item.stepNumber}. {item.titleKo}
                  </strong>
                  <span>{item.detailKo}</span>
                </div>
              </div>
              {item.id === 'conditions' && (
                <button
                  type="button"
                  className="pf-five-min-step-action"
                  onClick={onOpenConditions}
                >
                  <SlidersHorizontal size={14} aria-hidden="true" /> 조건 조정
                </button>
              )}
              {item.id === 'movements' && (
                <button type="button" className="pf-five-min-step-action" onClick={onOpenFinder}>
                  <Plus size={14} aria-hidden="true" /> 동작 담기
                </button>
              )}
              {item.id === 'time-fit' && (
                <button
                  type="button"
                  className="pf-five-min-step-action"
                  disabled={!canAutoFitDuration || summary.deltaSec === 0}
                  onClick={onFitDuration}
                >
                  <Clock3 size={14} aria-hidden="true" /> 시간 맞춤
                </button>
              )}
              {item.id === 'live-ready' && (
                <button
                  type="button"
                  className="pf-five-min-step-action is-primary"
                  disabled={!canStartClass}
                  onClick={onStartClass}
                >
                  <Play size={14} aria-hidden="true" /> 수업 시작
                </button>
              )}
            </li>
          ))}
        </ol>

        <div className="pf-five-min-metrics-grid" aria-label="현재 시퀀스 투명 점검 지표">
          <div className="pf-five-min-metric">
            <span>현재 / 목표</span>
            <strong>
              {formatSecondsToMMSS(summary.totalSec)} / {formatSecondsToMMSS(summary.targetSec)}
            </strong>
          </div>
          <div className="pf-five-min-metric">
            <span>출처·도해 구분</span>
            <strong>
              전용 {summary.originalOrDedicatedCount} · 참고 {summary.videoOrReferenceCount}
            </strong>
          </div>
          <div className="pf-five-min-metric">
            <span>내 검토 기록</span>
            <strong>
              완료 {summary.reviewedCount} · 검토 전 {summary.unreviewedCount}
            </strong>
          </div>
        </div>

        <div className="pf-five-min-recovery-bar" role="group" aria-label="실수 즉시 복구">
          <button
            type="button"
            className="pf-five-min-recovery-btn"
            disabled={undoCount === 0}
            onClick={onUndo}
          >
            <RotateCcw size={14} aria-hidden="true" /> 되돌리기 ({undoCount})
          </button>
          <button
            type="button"
            className="pf-five-min-recovery-btn"
            disabled={redoCount === 0}
            onClick={onRedo}
          >
            <RotateCw size={14} aria-hidden="true" /> 다시 실행 ({redoCount})
          </button>
        </div>

        <p className="pf-five-min-honest-note">
          전용 도해가 없는 참고 동작에는 다른 동작의 신체 도해를 대체 사용하지 않습니다. 이 점검표는
          수업 구성 보조용이며 의학적 진단·처방이나 개인별 안전 보장을 제공하지 않습니다.
        </p>
      </div>
    </details>
  );
}
