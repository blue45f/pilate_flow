import React, { useMemo, useState } from 'react';
import { Check, Plus, Shuffle } from 'lucide-react';
import { APPARATUS_LABELS } from '../data/pilatesCatalog';
import type { PilatesExercise, PropType } from '../types/pilates';
import {
  buildQuickRemixedExercise,
  formatDifficultyMeta,
  REMIX_MODIFIER_OPTIONS,
  REMIX_PROP_OPTIONS,
} from '../utils/instructorUxHelpers';
import type { QuickRemixModifier } from '../utils/studioTrackSlots';
import { LightDismissDialog } from './LightDismissDialog';

export interface QuickRemixSheetProps {
  readonly open: boolean;
  readonly baseExercise: PilatesExercise | null;
  readonly onClose: () => void;
  readonly onCreateAndAdd: (remixedExercise: PilatesExercise) => void;
}

export const QuickRemixSheet: React.FC<QuickRemixSheetProps> = ({
  open,
  baseExercise,
  onClose,
  onCreateAndAdd,
}) => {
  const [selectedProp, setSelectedProp] = useState<PropType>('mini-ball');
  const [selectedModifier, setSelectedModifier] = useState<QuickRemixModifier>('standard');

  const previewExercise = useMemo(() => {
    if (!baseExercise) return null;
    return buildQuickRemixedExercise(baseExercise, {
      prop: selectedProp,
      modifier: selectedModifier,
    });
  }, [baseExercise, selectedProp, selectedModifier]);

  if (!open || !baseExercise || !previewExercise) return null;

  const baseDiff = formatDifficultyMeta(baseExercise.level);
  const nextDiff = formatDifficultyMeta(previewExercise.level);

  const handleConfirm = () => {
    const freshVariation = buildQuickRemixedExercise(baseExercise, {
      prop: selectedProp,
      modifier: selectedModifier,
    });
    onCreateAndAdd(freshVariation);
    onClose();
  };

  return (
    <LightDismissDialog
      open={open}
      onClose={onClose}
      title="10초 원탭 변형 (리믹스)"
      subtitle="소도구와 난이도 변주만 골라 나만의 동작으로 바로 담아보세요"
      maxWidth="560px"
      variant="sheet"
    >
      <div className="pf-remix-sheet" data-testid="quick-remix-sheet">
        <div className="pf-remix-base-summary">
          <span className="pf-remix-base-summary__kicker">기준 동작</span>
          <div className="pf-remix-base-summary__row">
            <strong>{baseExercise.nameKo}</strong>
            <span className={`pf-difficulty-badge is-${baseDiff.tone}`}>{baseDiff.fullLabel}</span>
          </div>
          <span className="pf-remix-base-summary__meta">
            {APPARATUS_LABELS[baseExercise.apparatus].ko} ·{' '}
            {baseExercise.springs && baseExercise.springs !== 'Bodyweight'
              ? baseExercise.springs
              : '맨몸'}
          </span>
        </div>

        <fieldset className="pf-remix-group">
          <legend>1. 소도구 얹기</legend>
          <div className="pf-remix-chip-row" role="group" aria-label="변형 소도구 선택">
            {REMIX_PROP_OPTIONS.map((opt) => {
              const active = selectedProp === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`pf-remix-chip ${active ? 'is-active' : ''}`}
                  aria-pressed={active}
                  data-testid={`remix-prop-${opt.id}`}
                  onClick={() => setSelectedProp(opt.id)}
                >
                  {active && <Check size={14} strokeWidth={1.75} aria-hidden="true" />}
                  <span>{opt.labelKo}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="pf-remix-group">
          <legend>2. 동작 변주 선택</legend>
          <div className="pf-remix-chip-row" role="group" aria-label="동작 변주 선택">
            {REMIX_MODIFIER_OPTIONS.map((opt) => {
              const active = selectedModifier === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`pf-remix-chip ${active ? 'is-active' : ''}`}
                  aria-pressed={active}
                  data-testid={`remix-mod-${opt.id}`}
                  onClick={() => setSelectedModifier(opt.id)}
                >
                  {active && <Check size={14} strokeWidth={1.75} aria-hidden="true" />}
                  <span>{opt.labelKo}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="pf-remix-preview-box" data-testid="quick-remix-preview">
          <div className="pf-remix-preview-box__head">
            <span className="pf-remix-preview-box__label">
              <Shuffle size={14} strokeWidth={1.5} aria-hidden="true" /> 만들어질 변형 동작
            </span>
            <span className={`pf-difficulty-badge is-${nextDiff.tone}`}>{nextDiff.fullLabel}</span>
          </div>
          <strong>{previewExercise.nameKo}</strong>
          <p>{previewExercise.cues[0]}</p>
        </div>

        <div className="pf-remix-sheet__actions">
          <button type="button" className="flow-button" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className="flow-button flow-button--primary"
            data-testid="quick-remix-confirm-btn"
            onClick={handleConfirm}
          >
            <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
            <span>변형 동작 만들어 바로 담기</span>
          </button>
        </div>
      </div>
    </LightDismissDialog>
  );
};
