import React, { useMemo } from 'react';
import { Plus } from 'lucide-react';
import type { PilatesExercise } from '../types/pilates';
import { analyzeExerciseKinesiology } from '../utils/pilatesKinesiologyIntelligence';

interface ExerciseKinesiologyCardProps {
  readonly exercise: PilatesExercise;
  readonly onInsertCorrectionCueToNote?: (cueText: string) => void;
  readonly compact?: boolean;
}

export const ExerciseKinesiologyCard: React.FC<ExerciseKinesiologyCardProps> = ({
  exercise,
  onInsertCorrectionCueToNote,
  compact = false,
}) => {
  const profile = useMemo(() => analyzeExerciseKinesiology(exercise), [exercise]);

  return (
    <section
      className="pf-kinesiology-card"
      data-testid="exercise-kinesiology-card"
      aria-label="3D 기능해부학 역할 및 보상 동작 교정 안내"
    >
      <div className="pf-kinesiology-card__header">
        <strong>기능해부학 역할 · 보상 패턴 가이드</strong>
        {onInsertCorrectionCueToNote && (
          <button
            type="button"
            className="flow-text-button"
            data-testid="insert-kinesiology-cue-btn"
            onClick={() => onInsertCorrectionCueToNote(profile.correctionCueKo)}
          >
            <Plus size={13} strokeWidth={1.75} aria-hidden="true" /> 수업 메모에 교정 큐 추가
          </button>
        )}
      </div>

      <div className="pf-kinesiology-roles">
        <div className="pf-kinesiology-role-box is-agonist" data-testid="kinesiology-agonists">
          <small>주동근 (움직임 생성)</small>
          <span>{profile.agonistsKo.join(' · ')}</span>
        </div>
        <div
          className="pf-kinesiology-role-box is-stabilizer"
          data-testid="kinesiology-stabilizers"
        >
          <small>심부 안정화근 (중립 지지)</small>
          <span>{profile.stabilizersKo.join(' · ')}</span>
        </div>
      </div>

      <div className="pf-kinesiology-fault-box" data-testid="kinesiology-compensation-fault">
        <strong>주의할 흔한 보상 동작</strong>
        <span>{profile.commonFaultKo}</span>
        <p className="pf-kinesiology-fix-note">교정 큐: {profile.correctionCueKo}</p>
      </div>

      {!compact && (
        <small style={{ fontSize: '0.75rem', color: '#586960', lineHeight: 1.4 }}>
          호흡 협응 참고: {profile.breathMechanicsKo}
        </small>
      )}
    </section>
  );
};
