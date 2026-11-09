import React, { useMemo } from 'react';
import type { ClassHistoryLog, SequenceStep } from '../../types/pilates';
import {
  analyzeDurationCalibration,
  applyDurationCalibrationToSteps,
} from '../../utils/durationCalibrationEngine';

export interface DurationCalibrationBannerProps {
  readonly historyLogs: readonly ClassHistoryLog[];
  readonly activeSteps: readonly SequenceStep[];
  readonly groupId: string;
  readonly onApplyCalibratedSteps: (nextSteps: SequenceStep[], noticeMessage: string) => void;
}

export const DurationCalibrationBanner: React.FC<DurationCalibrationBannerProps> = ({
  historyLogs,
  activeSteps,
  groupId,
  onApplyCalibratedSteps,
}) => {
  const calibration = useMemo(
    () => analyzeDurationCalibration(historyLogs, groupId),
    [historyLogs, groupId],
  );

  return (
    <div
      className="pf-card"
      data-testid="duration-calibration-banner"
      style={{
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        background: '#f6f8f7',
        border: '1px solid #dce6e1',
      }}
    >
      <div style={{ display: 'grid', gap: '4px' }}>
        <strong style={{ fontSize: '13px', color: '#173d34' }}>
          계획 대 실제 시간(`Planned vs. Actual`) 보정 인사이트
        </strong>
        <p className="muted" style={{ fontSize: '12px', margin: 0 }}>
          {calibration.recommendationKo}
        </p>
      </div>
      {(calibration.tendency === 'overrun' || calibration.tendency === 'underrun') && (
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            const nextSteps = applyDurationCalibrationToSteps(activeSteps, calibration);
            onApplyCalibratedSteps(
              nextSteps,
              `최근 ${calibration.sampleCount}회 실제 수업 소요 시간 편차를 현재 시퀀스 동작 시간에 보정 반영했습니다.`,
            );
          }}
          style={{ minHeight: '34px', fontSize: '12px' }}
        >
          현재 수업에 시간 보정 적용 ({calibration.avgDeltaSec > 0 ? '+' : ''}
          {Math.round(calibration.avgDeltaSec / 60)}분)
        </button>
      )}
    </div>
  );
};
