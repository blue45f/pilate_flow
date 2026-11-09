import React, { useMemo } from 'react';
import { PfButton } from '../../design-system';
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
      className="pf-card pf-duration-calibration"
      data-testid="duration-calibration-banner"
      role="region"
      aria-label="계획 대 실제 시간 보정 인사이트"
    >
      <div className="pf-duration-calibration__copy">
        <strong className="pf-duration-calibration__title">
          계획 대 실제 시간(`Planned vs. Actual`) 보정 인사이트
        </strong>
        <p className="pf-duration-calibration__desc">
          {calibration.recommendationKo}
        </p>
      </div>
      {(calibration.tendency === 'overrun' || calibration.tendency === 'underrun') && (
        <PfButton
          variant="secondary"
          className="pf-duration-calibration__btn"
          onClick={() => {
            const nextSteps = applyDurationCalibrationToSteps(activeSteps, calibration);
            onApplyCalibratedSteps(
              nextSteps,
              `최근 ${calibration.sampleCount}회 실제 수업 소요 시간 편차를 현재 시퀀스 동작 시간에 보정 반영했습니다.`,
            );
          }}
        >
          현재 수업에 시간 보정 적용 ({calibration.avgDeltaSec > 0 ? '+' : ''}
          {Math.round(calibration.avgDeltaSec / 60)}분)
        </PfButton>
      )}
    </div>
  );
};
