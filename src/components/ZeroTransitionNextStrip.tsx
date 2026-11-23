import React, { useMemo } from 'react';
import { ArrowRight, Layers, Plus, Shuffle, Sparkles } from 'lucide-react';
import { APPARATUS_LABELS } from '../data/pilatesCatalog';
import type { ApparatusType, PilatesExercise } from '../types/pilates';
import {
  formatDifficultyMeta,
  recommendZeroTransitionNext,
  resolveGoldenTenMinCombos,
} from '../utils/instructorUxHelpers';

export interface ZeroTransitionNextStripProps {
  readonly lastExercise?: PilatesExercise;
  readonly exercises: readonly PilatesExercise[];
  readonly includedExerciseIds: ReadonlySet<string>;
  readonly targetApparatus: ApparatusType | 'mixed';
  readonly onAddExercise: (exercise: PilatesExercise) => void;
  readonly onInsertCombo: (comboTitle: string, comboExercises: readonly PilatesExercise[]) => void;
  readonly onOpenRemix?: (baseExercise: PilatesExercise) => void;
}

export const ZeroTransitionNextStrip: React.FC<ZeroTransitionNextStripProps> = ({
  lastExercise,
  exercises,
  includedExerciseIds,
  targetApparatus,
  onAddExercise,
  onInsertCombo,
  onOpenRemix,
}) => {
  const recommendations = useMemo(
    () => recommendZeroTransitionNext(lastExercise, exercises, includedExerciseIds, targetApparatus),
    [lastExercise, exercises, includedExerciseIds, targetApparatus],
  );

  const goldenCombos = useMemo(
    () => resolveGoldenTenMinCombos(lastExercise?.apparatus ?? targetApparatus, exercises),
    [lastExercise?.apparatus, targetApparatus, exercises],
  );

  if (recommendations.length === 0 && goldenCombos.length === 0) {
    return null;
  }

  return (
    <section
      className="pf-zero-transition-strip"
      data-testid="zero-transition-next-strip"
      aria-label="동선 제로 다음 동작 추천 및 황금 10분 콤보"
    >
      {recommendations.length > 0 && (
        <div className="pf-zero-transition-block">
          <div className="pf-zero-transition-block__head">
            <div className="pf-zero-transition-block__title">
              <ArrowRight size={15} strokeWidth={1.5} aria-hidden="true" />
              <strong>
                {lastExercise
                  ? `‘${lastExercise.nameKo}’ 뒤 동선 제로 추천`
                  : '부드럽게 시작하는 추천 동작 3개'}
              </strong>
            </div>
            {lastExercise && onOpenRemix && (
              <button
                type="button"
                className="pf-zero-remix-trigger"
                data-testid="zero-transition-remix-last-btn"
                onClick={() => onOpenRemix(lastExercise)}
              >
                <Shuffle size={14} strokeWidth={1.5} aria-hidden="true" />
                <span>10초 변형 만들기</span>
              </button>
            )}
          </div>

          <div
            className="pf-zero-next-chips"
            role="list"
            aria-label="동선 제로 다음 동작 3개"
          >
            {recommendations.map((rec) => {
              const diff = formatDifficultyMeta(rec.exercise.level);
              return (
                <button
                  key={rec.exercise.id}
                  type="button"
                  role="listitem"
                  className="pf-zero-next-chip"
                  data-testid={`zero-next-chip-${rec.exercise.id}`}
                  onClick={() => onAddExercise(rec.exercise)}
                >
                  <span className="pf-zero-next-chip__top">
                    <strong>{rec.exercise.nameKo}</strong>
                    <span className="pf-zero-next-chip__plus" aria-hidden="true">
                      <Plus size={14} strokeWidth={1.75} /> 담기
                    </span>
                  </span>
                  <span className="pf-zero-next-chip__meta">
                    <span className={`pf-difficulty-badge is-${diff.tone}`}>{diff.fullLabel}</span>
                    <span>{rec.reasonKo}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {goldenCombos.length > 0 && (
        <div className="pf-zero-transition-block pf-golden-combo-block">
          <div className="pf-zero-transition-block__head">
            <div className="pf-zero-transition-block__title">
              <Layers size={15} strokeWidth={1.5} aria-hidden="true" />
              <strong>황금 10분 콤보 끼워넣기</strong>
            </div>
            <span className="pf-zero-transition-block__hint">같은 자세·스프링 3동작 한 번에</span>
          </div>

          <div className="pf-golden-combo-row" role="list" aria-label="황금 10분 콤보 목록">
            {goldenCombos.map((combo) => {
              const diff = formatDifficultyMeta(combo.level);
              return (
                <button
                  key={combo.id}
                  type="button"
                  role="listitem"
                  className="pf-golden-combo-card"
                  data-testid={`golden-combo-${combo.id}`}
                  onClick={() => onInsertCombo(combo.titleKo, combo.exercises)}
                >
                  <span className="pf-golden-combo-card__top">
                    <span className="pf-golden-combo-card__apparatus">
                      {APPARATUS_LABELS[combo.apparatus].short} · {combo.durationMin}분
                    </span>
                    <span className={`pf-difficulty-badge is-${diff.tone}`}>{diff.fullLabel}</span>
                  </span>
                  <strong>{combo.titleKo}</strong>
                  <span className="pf-golden-combo-card__sub">{combo.subtitleKo}</span>
                  <span className="pf-golden-combo-card__flow">
                    <Sparkles size={13} strokeWidth={1.5} aria-hidden="true" />
                    {combo.flowNoteKo}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
