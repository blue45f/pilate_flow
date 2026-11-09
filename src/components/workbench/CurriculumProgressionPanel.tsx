import React, { useMemo } from 'react';
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
    <div
      className="pf-card"
      data-testid="curriculum-progression-panel"
      style={{ padding: '14px 16px', display: 'grid', gap: '10px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
        <strong style={{ fontSize: '14px', color: '#173d34' }}>
          {groupName || '현재 반'} · 4주 커리큘럼 프로그레션 설계표
        </strong>
        <span className="muted" style={{ fontSize: '12px' }}>
          최근 기록 {report.recentSessionCount}회 반영 · 보완 권장 평면:{' '}
          {report.underusedSpinalPlanes.map((p) => PLANE_KO[p]).join(' · ')}
        </span>
      </div>
      <div style={{ display: 'grid', gap: '8px' }}>
        {report.milestones.map((milestone) => (
          <div
            key={milestone.weekNumber}
            style={{
              padding: '10px 12px',
              borderRadius: '10px',
              background: '#f6f8f7',
              border: '1px solid #dce6e1',
              display: 'grid',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
              <strong style={{ fontSize: '13px', color: '#173d34' }}>{milestone.themeKo}</strong>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#14665e' }}>
                권장 Lv {milestone.recommendedLevel} · 집중 평면:{' '}
                {milestone.focusSpinalPlanes.map((p) => PLANE_KO[p]).join('·')} · 신규 동작{' '}
                {Math.round(milestone.noveltyRatioTarget * 100)}%
              </span>
            </div>
            <p className="muted" style={{ fontSize: '12px', margin: 0 }}>
              {milestone.rationaleKo}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
