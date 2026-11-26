import React from 'react';
import { Bookmark, Play, Plus } from 'lucide-react';
import type { PilatesExercise, SequenceStep } from '../types/pilates';
import { getStudioTrackAdapters } from '../utils/studioTrackSlots';

export interface MobileSimpleSequenceBarProps {
  readonly exerciseCount: number;
  readonly totalMinutesLabel: string;
  readonly targetMinutes: number;
  readonly canStartClass: boolean;
  readonly isSaving: boolean;
  readonly activeMobilePane: 'library' | 'plan';
  readonly onSwitchPane: (pane: 'library' | 'plan') => void;
  readonly onSave: () => void;
  readonly onStartClass: () => void;
  readonly sequenceTitle: string;
  readonly steps: readonly SequenceStep[];
  readonly exercises: readonly PilatesExercise[];
  readonly audioRehearsalSlot?: React.ReactNode;
}

export const MobileSimpleSequenceBar: React.FC<MobileSimpleSequenceBarProps> = ({
  exerciseCount,
  totalMinutesLabel,
  targetMinutes,
  canStartClass,
  isSaving,
  activeMobilePane,
  onSwitchPane,
  onSave,
  onStartClass,
  sequenceTitle,
  steps,
  exercises,
  audioRehearsalSlot,
}) => {
  const voiceRehearsalTrigger =
    audioRehearsalSlot ??
    getStudioTrackAdapters().renderSequenceAudioRehearsalTrigger?.({
      title: sequenceTitle,
      steps,
      exercises,
      compact: true,
    }) ??
    null;

  return (
    <div
      className="pf-mobile-simple-seq-bar"
      data-testid="mobile-simple-sequence-bar"
      role="region"
      aria-label="모바일 시퀀스 빠른 실행 바"
    >
      <div className="pf-mobile-simple-seq-bar__summary">
        <strong>
          {exerciseCount}동작 · {totalMinutesLabel}
        </strong>
        <span>목표 {targetMinutes}분</span>
      </div>
      <div className="pf-mobile-simple-seq-bar__actions">
        {activeMobilePane === 'plan' ? (
          <button
            type="button"
            className="pf-mobile-bar-btn"
            onClick={() => onSwitchPane('library')}
          >
            <Plus size={15} strokeWidth={1.75} aria-hidden="true" />
            <span>동작 추가</span>
          </button>
        ) : (
          <button
            type="button"
            className="pf-mobile-bar-btn"
            onClick={() => onSwitchPane('plan')}
          >
            <span>내 시퀀스</span>
          </button>
        )}
        {voiceRehearsalTrigger}
        <button
          type="button"
          className="pf-mobile-bar-btn"
          disabled={exerciseCount === 0 || isSaving}
          onClick={onSave}
          aria-label="모바일 시퀀스 저장"
        >
          <Bookmark size={15} strokeWidth={1.5} aria-hidden="true" />
          <span>{isSaving ? '저장 중' : '저장'}</span>
        </button>
        <button
          type="button"
          className="pf-mobile-bar-btn is-primary"
          disabled={!canStartClass}
          onClick={onStartClass}
          aria-label="모바일 수업 시작"
        >
          <Play size={15} strokeWidth={1.5} fill="currentColor" aria-hidden="true" />
          <span>수업 시작</span>
        </button>
      </div>
    </div>
  );
};
