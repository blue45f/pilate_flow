import React, { useMemo } from 'react';
import { ArrowDownLeft, ArrowUpRight, GitBranch, Plus } from 'lucide-react';
import type { PilatesExercise } from '../types/pilates';
import {
  WORLD_PILATES_BY_ID,
  getProgressionTree,
  PILATES_SCHOOL_LABELS,
} from '../data/worldPilatesRepertoire1000';
import { formatDifficultyMeta } from '../utils/instructorUxHelpers';

export interface ProgressionTreeCardProps {
  readonly exercise: PilatesExercise;
  readonly onSelectExercise?: (exercise: PilatesExercise) => void;
  readonly onAddExercise?: (exercise: PilatesExercise) => void;
}

export const ProgressionTreeCard: React.FC<ProgressionTreeCardProps> = ({
  exercise,
  onSelectExercise,
  onAddExercise,
}) => {
  const tree = useMemo(() => getProgressionTree(exercise.id), [exercise.id]);

  const hasBranches =
    tree.easier.length > 0 || tree.harder.length > 0 || tree.propVariations.length > 0;
  if (!hasBranches) return null;

  const renderNode = (
    node: { readonly id: string; readonly nameKo: string; readonly level: PilatesExercise['level']; readonly relationLabelKo: string },
    tone: 'easier' | 'harder' | 'prop',
  ) => {
    const target = WORLD_PILATES_BY_ID.get(node.id);
    if (!target) return null;
    const diff = formatDifficultyMeta(node.level);
    const school = target.schoolTag ? PILATES_SCHOOL_LABELS[target.schoolTag] : null;
    return (
      <div key={node.id} className={`pf-tree-node is-${tone}`}>
        <button
          type="button"
          className="pf-tree-node__main"
          onClick={() => onSelectExercise?.(target)}
        >
          <span className="pf-tree-node__top">
            <span className={`pf-difficulty-badge is-${diff.tone}`}>{diff.fullLabel}</span>
            {school && <span className="pf-tree-node__school">{school.shortKo}</span>}
          </span>
          <strong>{node.nameKo}</strong>
          <small>{node.relationLabelKo}</small>
        </button>
        {onAddExercise && (
          <button
            type="button"
            className="pf-tree-node__add"
            aria-label={`${node.nameKo} 수업에 담기`}
            onClick={() => onAddExercise(target)}
          >
            <Plus size={14} strokeWidth={1.75} aria-hidden="true" />
          </button>
        )}
      </div>
    );
  };

  return (
    <section
      className="pf-progression-tree-card"
      data-testid="progression-tree-card"
      aria-label="동작 족보 트리"
    >
      <div className="pf-progression-tree-card__head">
        <GitBranch size={15} strokeWidth={1.6} aria-hidden="true" />
        <strong>동작 족보 트리 · 변형 바로 고르기</strong>
      </div>

      <div className="pf-progression-tree-columns">
        {tree.easier.length > 0 && (
          <div className="pf-tree-group">
            <span className="pf-tree-group__label">
              <ArrowDownLeft size={13} strokeWidth={1.6} aria-hidden="true" /> 더 편한 준비 동작
            </span>
            <div className="pf-tree-group__list">
              {tree.easier.slice(0, 3).map((node) => renderNode(node, 'easier'))}
            </div>
          </div>
        )}

        {tree.harder.length > 0 && (
          <div className="pf-tree-group">
            <span className="pf-tree-group__label">
              <ArrowUpRight size={13} strokeWidth={1.6} aria-hidden="true" /> 심화 · 도전 변형
            </span>
            <div className="pf-tree-group__list">
              {tree.harder.slice(0, 3).map((node) => renderNode(node, 'harder'))}
            </div>
          </div>
        )}

        {tree.propVariations.length > 0 && (
          <div className="pf-tree-group">
            <span className="pf-tree-group__label">소도구 · 기구 변주</span>
            <div className="pf-tree-group__list">
              {tree.propVariations.slice(0, 4).map((node) => renderNode(node, 'prop'))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
