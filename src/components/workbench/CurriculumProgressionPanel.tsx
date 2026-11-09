import React, { useMemo } from 'react';
import { PfBadge } from '../../design-system';
import type { ClassHistoryLog, DifficultyLevel, PilatesExercise } from '../../types/pilates';
import { buildFourWeekCurriculumProgression } from '../../utils/curriculumProgressionEngine';

export interface CurriculumProgressionPanelProps {
  readonly groupId: string;
  readonly groupName: string;
  readonly baseLevel: DifficultyLevel;
  readonly historyLogs: readonly ClassHistoryLog[];
  readonly exercises: readonly PilatesExercise[];
}

const PLANE_KO: Record<'flexion' | 'extension' | 'lateral' | 'rotation', string> = {
  flexion: '굴곡',
  extension: '신전',
  lateral: '측굴',
  rotation: '회전',
};

export const CurriculumProgressionPanel: React.FC<CurriculumProgressionPanelProps> = ({
  groupId,
  groupName,
  baseLevel,
  historyLogs,
  exercises,
}) => {
  const report = useMemo(
    () =>
      buildFourWeekCurriculumProgression({
        groupId,
        baseLevel,
        historyLogs,
        exercises,
      }),
    [groupId, baseLevel, historyLogs, exercises],
  );

  return (
    <section
      className="pf-card pf-curriculum-progression"
      data-testid="curriculum-progression-panel"
      aria-label="4주 커리큘럼 프로그레션 설계표"
    >
      <div className="pf-curriculum-progression__header">
        <strong className="pf-curriculum-progression__title">
          {groupName || '현재 반'} · 4주 커리큘럼 프로그레션 설계표
        </strong>
        <span className="pf-curriculum-progression__meta">
          최근 기록 {report.recentSessionCount}회 반영 · 보완 권장 평면:{' '}
          {report.underusedSpinalPlanes.map((p) => PLANE_KO[p]).join(' · ')}
        </span>
      </div>
      <div
        className="pf-curriculum-progression__grid"
        role="list"
        aria-label="주차별 프로그레션 목표"
      >
        {report.milestones.map((milestone) => (
          <div
            key={milestone.weekNumber}
            role="listitem"
            className="pf-curriculum-progression__item"
          >
            <div className="pf-curriculum-progression__item-head">
              <strong className="pf-curriculum-progression__item-theme">
                {milestone.themeKo}
              </strong>
              <PfBadge tone="sage">
                권장 Lv {milestone.recommendedLevel} · 집중 평면:{' '}
                {milestone.focusSpinalPlanes.map((p) => PLANE_KO[p]).join('·')} · 신규 동작{' '}
                {Math.round(milestone.noveltyRatioTarget * 100)}%
              </PfBadge>
            </div>
            <p className="pf-curriculum-progression__item-rationale">
              {milestone.rationaleKo}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
