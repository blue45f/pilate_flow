import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  Info,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { APPARATUS_LABELS } from '../data/pilatesCatalog';
import { WORLD_PILATES_BY_ID, WORLD_PILATES_EXERCISES } from '../data/worldPilatesRepertoire1000';
import { createSequenceSnapshot, usePilatesStore } from '../store/usePilatesStore';
import type { BodyPosition, LayerMode, PilatesExercise, SequenceStep } from '../types/pilates';
import {
  CLIENT_GOAL_NON_MEDICAL_NOTICE_KO,
  CLIENT_GOAL_PRESETS,
  analyzeSequenceForClientGoal,
  applyClientGoalTuning,
  buildClientGoalTuningSummaryKo,
  type ClientGoalPresetId,
} from '../utils/clientGoalTunerEngine';
import { formatDifficultyMeta } from '../utils/instructorUxHelpers';
import { ensureWorldExercisesInStore } from '../utils/registerAllStudioAdapters';
import { SpringVisualPills } from './SpringVisualPills';
import '../styles/client-goal-tuner.css';

export interface ClientGoalSequenceTunerPanelProps {
  readonly steps?: readonly SequenceStep[];
  readonly exercises?: readonly PilatesExercise[];
  readonly initialPresetId?: ClientGoalPresetId;
  readonly onApplySteps?: (nextSteps: SequenceStep[], summaryKo: string) => void;
  readonly onClose?: () => void;
}

const PLAIN_POSITION_SHORT_KO: Readonly<Record<BodyPosition, string>> = {
  supine: '누운 자세',
  prone: '엎드린 자세',
  'side-lying': '옆으로 누운',
  seated: '앉은 자세',
  kneeling: '무릎 선 자세',
  standing: '선 자세',
  quadruped: '네발기기',
};

const LAYER_LABELS_KO: Readonly<Record<LayerMode, string>> = {
  easy: '쉽게 (easy)',
  standard: '기본 (standard)',
  hard: '심화 (hard)',
};

export const ClientGoalSequenceTunerPanel: React.FC<ClientGoalSequenceTunerPanelProps> = ({
  steps: stepsProp,
  exercises: exercisesProp,
  initialPresetId = 'prenatal-gentle',
  onApplySteps,
  onClose,
}) => {
  const storeSteps = usePilatesStore((s) => s.activeSteps);
  const storeExercises = usePilatesStore((s) => s.exercises);

  const steps = stepsProp ?? storeSteps;
  const exercises = exercisesProp ?? storeExercises;

  const [presetId, setPresetId] = useState<ClientGoalPresetId>(initialPresetId);
  const [deselectedByPreset, setDeselectedByPreset] = useState<
    Readonly<Partial<Record<ClientGoalPresetId, readonly string[]>>>
  >({});
  const [layerToggleByPreset, setLayerToggleByPreset] = useState<
    Readonly<Partial<Record<ClientGoalPresetId, boolean>>>
  >({});
  const [failedImages, setFailedImages] = useState<Readonly<Record<string, boolean>>>({});
  const [undoSnapshot, setUndoSnapshot] = useState<{
    readonly previousSteps: SequenceStep[];
    readonly pushedToStore: boolean;
  } | null>(null);
  const [statusMessageKo, setStatusMessageKo] = useState<string | null>(null);

  const exercisesById = useMemo(() => {
    const map = new Map<string, PilatesExercise>();
    for (const ex of WORLD_PILATES_BY_ID.values()) {
      map.set(ex.id, ex);
    }
    for (const ex of exercises) {
      map.set(ex.id, ex);
    }
    return map;
  }, [exercises]);

  const analysis = useMemo(
    () => analyzeSequenceForClientGoal(steps, exercisesById, presetId, WORLD_PILATES_EXERCISES),
    [steps, exercisesById, presetId],
  );

  const deselectedIds = useMemo(
    () => new Set(deselectedByPreset[presetId] ?? []),
    [deselectedByPreset, presetId],
  );

  const selectedSwapIds = useMemo(
    () =>
      analysis.swaps
        .filter((swap) => !deselectedIds.has(swap.stepId))
        .map((swap) => swap.stepId),
    [analysis.swaps, deselectedIds],
  );

  const selectedSwapIdSet = useMemo(() => new Set(selectedSwapIds), [selectedSwapIds]);

  const supportsWholeLayerSwitch = analysis.preset.applyLayerToUnchangedSteps !== null;
  const defaultLayerSwitchOn =
    presetId === 'senior-comfort' || presetId === 'prenatal-gentle';
  const applyLayerToUnchanged = supportsWholeLayerSwitch
    ? (layerToggleByPreset[presetId] ?? defaultLayerSwitchOn)
    : false;

  const unchangedLayerChangeCount = useMemo(() => {
    if (!applyLayerToUnchanged || !analysis.preset.applyLayerToUnchangedSteps) return 0;
    const targetLayer = analysis.preset.applyLayerToUnchangedSteps;
    return analysis.stepAssessments.filter(
      (item) => !selectedSwapIdSet.has(item.stepId) && item.step.selectedLayer !== targetLayer,
    ).length;
  }, [applyLayerToUnchanged, analysis, selectedSwapIdSet]);

  const toggleSwapStep = (stepId: string) => {
    setDeselectedByPreset((prev) => {
      const current = prev[presetId] ?? [];
      const next = current.includes(stepId)
        ? current.filter((id) => id !== stepId)
        : [...current, stepId];
      return { ...prev, [presetId]: next };
    });
  };

  const allSelected =
    analysis.swaps.length > 0 && selectedSwapIds.length === analysis.swaps.length;

  const handleToggleSelectAll = () => {
    setDeselectedByPreset((prev) => ({
      ...prev,
      [presetId]: allSelected ? analysis.swaps.map((s) => s.stepId) : [],
    }));
  };

  const handleApplyTuning = () => {
    const selectedSwaps = analysis.swaps.filter((swap) => selectedSwapIdSet.has(swap.stepId));
    if (selectedSwaps.length === 0 && unchangedLayerChangeCount === 0) return;

    const replacementExercises = selectedSwaps.map((swap) => swap.replacementExercise);
    if (replacementExercises.length > 0) {
      ensureWorldExercisesInStore(replacementExercises);
    }

    const previousSteps = steps.map((step) => structuredClone(step));
    const nextSteps = applyClientGoalTuning(steps, analysis.swaps, selectedSwapIdSet, {
      applyLayerToUnchangedSteps: applyLayerToUnchanged
        ? analysis.preset.applyLayerToUnchangedSteps
        : null,
    });

    const summaryKo = buildClientGoalTuningSummaryKo(
      analysis.preset,
      selectedSwaps.length,
      unchangedLayerChangeCount,
    );

    if (onApplySteps) {
      setUndoSnapshot({ previousSteps, pushedToStore: false });
      onApplySteps(nextSteps, summaryKo);
    } else {
      const current = usePilatesStore.getState();
      const snapshot = createSequenceSnapshot(current);
      usePilatesStore.setState({
        activeSteps: structuredClone(nextSteps),
        undoStack: [...current.undoStack.slice(-19), snapshot],
        redoStack: [],
        saveFeedback: summaryKo,
      });
      setUndoSnapshot({ previousSteps, pushedToStore: true });
    }

    setStatusMessageKo(summaryKo);
  };

  const handleUndoLast = () => {
    if (!undoSnapshot) return;
    const restoredSteps = undoSnapshot.previousSteps.map((step) => structuredClone(step));
    const undoMessageKo = '방금 적용한 회원 맞춤 치환을 이전 시퀀스로 되돌렸어요.';

    if (onApplySteps) {
      onApplySteps(restoredSteps, undoMessageKo);
    } else {
      const current = usePilatesStore.getState();
      usePilatesStore.setState({
        activeSteps: restoredSteps,
        undoStack:
          undoSnapshot.pushedToStore && current.undoStack.length > 0
            ? current.undoStack.slice(0, -1)
            : current.undoStack,
        saveFeedback: undoMessageKo,
      });
    }

    setUndoSnapshot(null);
    setStatusMessageKo(undoMessageKo);
  };

  const canApply = selectedSwapIds.length > 0 || unchangedLayerChangeCount > 0;

  const primaryButtonLabel =
    selectedSwapIds.length > 0
      ? `선택한 ${selectedSwapIds.length}개 동작 일괄 안전 치환`
      : unchangedLayerChangeCount > 0
        ? `난이도 레이어 ${unchangedLayerChangeCount}개 동작 일괄 전환`
        : '선택한 0개 동작 일괄 안전 치환';

  return (
    <section
      className="pf-goal-tuner"
      data-testid="client-goal-sequence-tuner-panel"
      aria-label="회원별 체형·컨디션 원탭 시퀀스 튜너"
    >
      <header className="pf-goal-tuner__header">
        <div>
          <span className="pf-goal-tuner__kicker">
            <SlidersHorizontal size={15} strokeWidth={1.6} aria-hidden="true" />
            회원 맞춤 원탭 시퀀스 튜너 · 통합 {analysis.catalogPoolSize.toLocaleString('ko-KR')}종
            매칭
          </span>
          <h2 className="pf-goal-tuner__title">체형·컨디션별 안전 Plan B 원탭 치환</h2>
        </div>
        {onClose && (
          <button
            type="button"
            className="pf-goal-tuner__close-btn"
            onClick={onClose}
            aria-label="튜너 패널 닫기"
          >
            <X size={18} strokeWidth={1.7} aria-hidden="true" />
          </button>
        )}
      </header>

      <div
        className="pf-goal-tuner__preset-grid"
        role="group"
        aria-label="회원 맞춤 프리셋 5종 선택"
        data-testid="goal-tuner-presets"
      >
        {CLIENT_GOAL_PRESETS.map((preset) => {
          const isActive = preset.id === presetId;
          return (
            <button
              key={preset.id}
              type="button"
              className="pf-goal-tuner__preset-btn"
              aria-pressed={isActive}
              data-testid={`goal-preset-${preset.id}`}
              onClick={() => setPresetId(preset.id)}
            >
              <span className="pf-goal-tuner__preset-title">{preset.titleKo}</span>
              <span className="pf-goal-tuner__preset-tag">{preset.focusTagKo}</span>
            </button>
          );
        })}
      </div>

      <div className="pf-goal-tuner__summary" data-testid="goal-tuner-summary">
        <div className="pf-goal-tuner__summary-top">
          <div>
            <h3 className="pf-goal-tuner__summary-heading">{analysis.summaryHeadlineKo}</h3>
            <p className="pf-goal-tuner__summary-desc">{analysis.preset.summaryKo}</p>
          </div>
          <div className="pf-goal-tuner__metrics">
            <div className="pf-goal-tuner__metric-box">
              <span className="pf-goal-tuner__metric-label">분석 동작</span>
              <span className="pf-goal-tuner__metric-value">{analysis.totalExerciseSteps}개</span>
            </div>
            <div className="pf-goal-tuner__metric-box">
              <span className="pf-goal-tuner__metric-label">안전 치환 제안</span>
              <span className="pf-goal-tuner__metric-value">{analysis.flaggedCount}건</span>
            </div>
            <div className="pf-goal-tuner__metric-box">
              <span className="pf-goal-tuner__metric-label">맞춤 적합도</span>
              <span className="pf-goal-tuner__metric-value">
                {analysis.safetyFitScore}% → {analysis.projectedFitScore}%
              </span>
            </div>
          </div>
        </div>

        {supportsWholeLayerSwitch && analysis.preset.applyLayerToUnchangedSteps && (
          <label
            className="pf-goal-tuner__layer-option"
            data-testid="goal-tuner-layer-toggle"
          >
            <input
              type="checkbox"
              checked={applyLayerToUnchanged}
              onChange={(event) =>
                setLayerToggleByPreset((prev) => ({
                  ...prev,
                  [presetId]: event.target.checked,
                }))
              }
            />
            <span>
              {analysis.preset.applyLayerToUnchangedSteps === 'easy'
                ? `유지되는 동작도 난이도 레이어를 ‘쉽게(easy)’로 함께 전환`
                : `유지되는 메인 동작에도 난이도 레이어 ‘심화(hard)’ 옵션 함께 제안`}
              {unchangedLayerChangeCount > 0 ? ` (${unchangedLayerChangeCount}개 동작)` : ''}
            </span>
          </label>
        )}
      </div>

      {statusMessageKo && (
        <div
          className="pf-goal-tuner__status-banner"
          role="status"
          aria-live="polite"
          data-testid="goal-tuner-status"
        >
          <span className="pf-goal-tuner__status-text">
            <Check size={16} strokeWidth={1.8} aria-hidden="true" />
            <span>{statusMessageKo}</span>
          </span>
          {undoSnapshot && (
            <button
              type="button"
              className="pf-goal-tuner__undo-btn"
              data-testid="goal-tuner-undo-btn"
              onClick={handleUndoLast}
            >
              <RotateCcw size={15} strokeWidth={1.7} aria-hidden="true" />
              <span>방금 변경 되돌리기</span>
            </button>
          )}
        </div>
      )}

      {analysis.swaps.length > 0 ? (
        <>
          <div className="pf-goal-tuner__list-header">
            <h3 className="pf-goal-tuner__list-title">
              Before → After 치환 비교 ({selectedSwapIds.length}/{analysis.swaps.length}개 선택)
            </h3>
            <button
              type="button"
              className="pf-goal-tuner__select-all-btn"
              data-testid="goal-tuner-toggle-all"
              onClick={handleToggleSelectAll}
            >
              {allSelected ? '전체 선택 해제' : '전체 선택'}
            </button>
          </div>

          <div className="pf-goal-tuner__swap-list" data-testid="goal-tuner-swap-list">
            {analysis.swaps.map((swap) => {
              const checked = selectedSwapIdSet.has(swap.stepId);
              const beforeDiff = formatDifficultyMeta(swap.originalExercise.level);
              const afterDiff = formatDifficultyMeta(swap.replacementExercise.level);
              const effectiveAfterSpring =
                swap.recommendedSpringOverride || swap.replacementExercise.springs;
              const showAfterImg =
                Boolean(swap.replacementArtworkSrc) &&
                !failedImages[swap.replacementArtworkSrc ?? ''];

              return (
                <article
                  key={swap.stepId}
                  className={`pf-goal-tuner__swap-card ${checked ? 'is-selected' : ''}`}
                  data-testid={`goal-swap-card-${swap.stepId}`}
                >
                  <div className="pf-goal-tuner__swap-top">
                    <label className="pf-goal-tuner__checkbox-wrap">
                      <input
                        type="checkbox"
                        checked={checked}
                        aria-label={`#${swap.order} ${swap.originalExercise.nameKo}을(를) ${swap.replacementExercise.nameKo}(으)로 치환 선택`}
                        data-testid={`goal-swap-checkbox-${swap.stepId}`}
                        onChange={() => toggleSwapStep(swap.stepId)}
                      />
                    </label>
                    <div className="pf-goal-tuner__reason-wrap">
                      <span className="pf-goal-tuner__step-badge">
                        #{swap.order}번 스텝 ·{' '}
                        {swap.sameApparatus ? '동일 기구 매칭' : '매트 안전 보완'}
                      </span>
                      <p className="pf-goal-tuner__reason-text">{swap.reasonKo}</p>
                    </div>
                  </div>

                  <div className="pf-goal-tuner__compare">
                    <div className="pf-goal-tuner__side pf-goal-tuner__side--before">
                      <div className="pf-goal-tuner__side-label">
                        <span>변경 전 (Before)</span>
                        <span>{beforeDiff.labelKo}</span>
                      </div>
                      <h4 className="pf-goal-tuner__exercise-name">
                        {swap.originalExercise.nameKo}
                      </h4>
                      <div className="pf-goal-tuner__exercise-meta">
                        <span>{APPARATUS_LABELS[swap.originalExercise.apparatus].short}</span>
                        <span>· {PLAIN_POSITION_SHORT_KO[swap.originalExercise.bodyPosition]}</span>
                        <span>· {LAYER_LABELS_KO[swap.originalStep.selectedLayer]}</span>
                      </div>
                      <SpringVisualPills
                        springs={swap.originalStep.customSpringOverride || swap.originalExercise.springs}
                      />
                    </div>

                    <div className="pf-goal-tuner__arrow" aria-hidden="true">
                      <ArrowRight size={18} strokeWidth={1.8} />
                    </div>

                    <div className="pf-goal-tuner__side pf-goal-tuner__side--after">
                      <div className="pf-goal-tuner__side-label">
                        <span>안전 대체안 (Plan B)</span>
                        <span className="pf-goal-tuner__chip">{afterDiff.labelKo}</span>
                      </div>
                      <div className="pf-goal-tuner__side-head">
                        {showAfterImg && swap.replacementArtworkSrc && (
                          <img
                            className="pf-goal-tuner__thumb"
                            src={swap.replacementArtworkSrc}
                            alt=""
                            loading="lazy"
                            onError={() =>
                              setFailedImages((prev) => ({
                                ...prev,
                                [swap.replacementArtworkSrc!]: true,
                              }))
                            }
                          />
                        )}
                        <div>
                          <h4 className="pf-goal-tuner__exercise-name">
                            {swap.replacementExercise.nameKo}
                          </h4>
                          <div className="pf-goal-tuner__exercise-meta">
                            <span>
                              {APPARATUS_LABELS[swap.replacementExercise.apparatus].short}
                            </span>
                            <span>
                              · {PLAIN_POSITION_SHORT_KO[swap.replacementExercise.bodyPosition]}
                            </span>
                            <span>· {LAYER_LABELS_KO[swap.recommendedLayer]}</span>
                          </div>
                        </div>
                      </div>
                      <SpringVisualPills springs={effectiveAfterSpring} />
                      <p className="pf-goal-tuner__benefit">{swap.benefitKo}</p>
                      {swap.springNoteKo && (
                        <p className="pf-goal-tuner__spring-note">{swap.springNoteKo}</p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      ) : (
        <div className="pf-goal-tuner__empty-safe" data-testid="goal-tuner-all-safe">
          <ShieldCheck size={20} strokeWidth={1.7} aria-hidden="true" />
          <div>
            <strong>대체가 필요한 위험·부담 구간이 없어요.</strong>
            <p className="pf-goal-tuner__summary-desc">{analysis.preset.recommendedLayerNoteKo}</p>
          </div>
        </div>
      )}

      <div className="pf-goal-tuner__footer">
        <button
          type="button"
          className="pf-goal-tuner__apply-btn"
          data-testid="goal-tuner-apply-btn"
          disabled={!canApply}
          onClick={handleApplyTuning}
        >
          <Check size={17} strokeWidth={1.8} aria-hidden="true" />
          <span>{primaryButtonLabel}</span>
        </button>
        {undoSnapshot && !statusMessageKo && (
          <button
            type="button"
            className="pf-goal-tuner__undo-btn"
            data-testid="goal-tuner-undo-btn-footer"
            onClick={handleUndoLast}
          >
            <RotateCcw size={15} strokeWidth={1.7} aria-hidden="true" />
            <span>방금 변경 되돌리기</span>
          </button>
        )}
      </div>

      <p className="pf-goal-tuner__disclaimer" role="note" data-testid="goal-tuner-disclaimer">
        <Info size={16} strokeWidth={1.6} aria-hidden="true" />
        <span>{CLIENT_GOAL_NON_MEDICAL_NOTICE_KO}</span>
      </p>
    </section>
  );
};
