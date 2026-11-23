import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  Layers,
  Lock,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import { APPARATUS_LABELS, SPINAL_PLANE_LABELS } from '../data/pilatesCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import type {
  ApparatusType,
  ClassGroupProfile,
  ClassHistoryLog,
  DifficultyLevel,
  PilatesExercise,
  SavedSequence,
  SequenceStep,
} from '../types/pilates';
import {
  analyzeSequenceFreshness,
  buildAnchorFirstSequence,
  forkSequenceAcrossLevels,
  generateWeeklyAutoPlan,
  optimizeSequenceFlowSmart,
  refreshOverlappingSteps,
} from '../utils/sequenceAutomationEngine';
import type {
  AnchorFirstSequenceResult,
  LevelForkBundle,
  StepReplacementDiff,
  WeeklyAutoPlanResult,
} from '../utils/sequenceAutomationEngine';
import '../styles/sequence-autopilot.css';

export type AutoPilotTabId = 'freshness' | 'anchor' | 'scale';

export interface AutoPilotApplyPayload {
  steps: SequenceStep[];
  title?: string;
  subtitle?: string;
  targetMinutes?: number;
  level?: DifficultyLevel;
  apparatus?: ApparatusType | 'mixed';
  targetGroupId?: string;
}

export interface SequenceAutoPilotDrawerProps {
  open: boolean;
  onClose: () => void;
  initialTab?: AutoPilotTabId;
  steps?: readonly SequenceStep[];
  exercises?: readonly PilatesExercise[];
  historyLogs?: readonly ClassHistoryLog[];
  classGroups?: readonly ClassGroupProfile[];
  activeTitle?: string;
  activeTargetGroupId?: string;
  activeTargetMinutes?: number;
  activeLevel?: DifficultyLevel;
  activeApparatus?: ApparatusType | 'mixed';
  referenceDate?: Date;
  onApplySteps?: (payload: AutoPilotApplyPayload) => void;
  onSaveSequencesBatch?: (sequences: SavedSequence[]) => void;
}

const DURATION_OPTIONS: readonly number[] = [30, 40, 50, 60];
const LEVEL_OPTIONS: ReadonlyArray<{ value: DifficultyLevel; labelKo: string }> = [
  { value: '1.0', labelKo: '입문 1.0' },
  { value: '1.5', labelKo: '중급 1.5' },
  { value: '2.0', labelKo: '심화 2.0' },
];
const APPARATUS_FILTERS: ReadonlyArray<{ value: ApparatusType | 'all'; labelKo: string }> = [
  { value: 'all', labelKo: '전체' },
  { value: 'reformer', labelKo: '리포머' },
  { value: 'cadillac', labelKo: '캐딜락' },
  { value: 'chair', labelKo: '체어' },
  { value: 'barrel', labelKo: '바렐' },
  { value: 'mat', labelKo: '매트' },
];

export const SequenceAutoPilotDrawer: React.FC<SequenceAutoPilotDrawerProps> = (props) => {
  if (!props.open) return null;
  return <SequenceAutoPilotDrawerBody key={props.initialTab ?? 'freshness'} {...props} />;
};

const SequenceAutoPilotDrawerBody: React.FC<SequenceAutoPilotDrawerProps> = ({
  open,
  onClose,
  initialTab = 'freshness',
  steps: stepsProp,
  exercises: exercisesProp,
  historyLogs: historyLogsProp,
  classGroups: classGroupsProp,
  activeTitle: activeTitleProp,
  activeTargetGroupId: activeTargetGroupIdProp,
  activeTargetMinutes: activeTargetMinutesProp,
  activeLevel: activeLevelProp,
  activeApparatus: activeApparatusProp,
  referenceDate,
  onApplySteps,
  onSaveSequencesBatch,
}) => {
  const storeActiveSteps = usePilatesStore((s) => s.activeSteps);
  const storeExercises = usePilatesStore((s) => s.exercises);
  const storeHistoryLogs = usePilatesStore((s) => s.historyLogs);
  const storeClassGroups = usePilatesStore((s) => s.classGroups);
  const storeActiveTitle = usePilatesStore((s) => s.activeTitle);
  const storeActiveTargetGroupId = usePilatesStore((s) => s.activeTargetGroupId);
  const storeActiveTargetMinutes = usePilatesStore((s) => s.activeTargetMinutes);
  const storeActiveLevel = usePilatesStore((s) => s.activeLevel);
  const storeActiveApparatus = usePilatesStore((s) => s.activeApparatus);

  const steps = stepsProp ?? storeActiveSteps;
  const exercises = exercisesProp ?? storeExercises;
  const historyLogs = historyLogsProp ?? storeHistoryLogs;
  const classGroups = classGroupsProp ?? storeClassGroups;
  const activeTitle = activeTitleProp ?? storeActiveTitle;
  const activeTargetMinutes = activeTargetMinutesProp ?? storeActiveTargetMinutes ?? 50;
  const activeLevel = activeLevelProp ?? storeActiveLevel ?? '1.5';
  const activeApparatus = activeApparatusProp ?? storeActiveApparatus ?? 'reformer';

  const [activeTab, setActiveTab] = useState<AutoPilotTabId>(initialTab);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    activeTargetGroupIdProp ?? storeActiveTargetGroupId ?? 'all',
  );
  const [lastDiffs, setLastDiffs] = useState<StepReplacementDiff[]>([]);
  const [feedbackKo, setFeedbackKo] = useState<string>('');
  const [undoSnapshot, setUndoSnapshot] = useState<AutoPilotApplyPayload | null>(null);

  // Tab 2 (Anchor-first) state
  const [anchorQuery, setAnchorQuery] = useState<string>('');
  const [anchorApparatusFilter, setAnchorApparatusFilter] = useState<ApparatusType | 'all'>('all');
  const [selectedAnchorIds, setSelectedAnchorIds] = useState<string[]>([]);
  const [anchorTargetMin, setAnchorTargetMin] = useState<number>(
    DURATION_OPTIONS.includes(activeTargetMinutes) ? activeTargetMinutes : 50,
  );
  const [anchorLevel, setAnchorLevel] = useState<DifficultyLevel>(activeLevel);
  const [anchorResult, setAnchorResult] = useState<AnchorFirstSequenceResult | null>(null);

  // Tab 3 (Fork & Weekly) state
  const [forkBundle, setForkBundle] = useState<LevelForkBundle | null>(null);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyAutoPlanResult | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const exerciseMap = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises],
  );

  const effectiveGroupId = selectedGroupId === 'all' ? undefined : selectedGroupId;

  const freshnessReport = useMemo(
    () =>
      analyzeSequenceFreshness(steps, exercises, historyLogs, {
        groupId: effectiveGroupId,
        referenceDate,
      }),
    [steps, exercises, historyLogs, effectiveGroupId, referenceDate],
  );

  const flowPreview = useMemo(
    () => optimizeSequenceFlowSmart(steps, exerciseMap),
    [steps, exerciseMap],
  );

  const filteredAnchorExercises = useMemo(() => {
    const q = anchorQuery.trim().toLowerCase();
    return exercises
      .filter((ex) => {
        if (anchorApparatusFilter !== 'all' && ex.apparatus !== anchorApparatusFilter) {
          return false;
        }
        if (!q) return true;
        return (
          ex.nameKo.toLowerCase().includes(q) ||
          ex.nameEn.toLowerCase().includes(q) ||
          ex.targetMuscles.some((m) => m.toLowerCase().includes(q))
        );
      })
      .slice(0, 30);
  }, [exercises, anchorQuery, anchorApparatusFilter]);

  if (!open) return null;

  const commitStepsChange = (payload: AutoPilotApplyPayload, messageKo: string) => {
    setUndoSnapshot({
      steps: steps.map((s) => ({ ...s })),
      title: activeTitle,
      targetMinutes: activeTargetMinutes,
      level: activeLevel,
      apparatus: activeApparatus,
      targetGroupId: effectiveGroupId,
    });

    if (onApplySteps) {
      onApplySteps(payload);
    } else {
      const current = usePilatesStore.getState();
      const previous = structuredClone({
        activeSequenceId: current.activeSequenceId,
        activeTitle: current.activeTitle,
        activeSubtitle: current.activeSubtitle,
        activeApparatus: current.activeApparatus,
        activeLevel: current.activeLevel,
        activeTargetMinutes: current.activeTargetMinutes,
        activeTargetGroupId: current.activeTargetGroupId,
        activeSteps: current.activeSteps,
        lastCriteria: current.lastCriteria,
        draftCriteria: current.draftCriteria,
      });
      usePilatesStore.setState({
        activeSteps: structuredClone(payload.steps),
        activeTitle: payload.title ?? current.activeTitle,
        activeSubtitle: payload.subtitle ?? current.activeSubtitle,
        activeTargetMinutes: payload.targetMinutes ?? current.activeTargetMinutes,
        activeLevel: payload.level ?? current.activeLevel,
        activeApparatus: payload.apparatus ?? current.activeApparatus,
        activeTargetGroupId: payload.targetGroupId ?? current.activeTargetGroupId,
        undoStack: [...current.undoStack.slice(-19), previous],
        saveFeedback: messageKo,
      });
    }
    setFeedbackKo(messageKo);
  };

  const commitBatchSave = (drafts: Array<Omit<SavedSequence, 'id'>>, messageKo: string) => {
    const timestamp = (referenceDate ?? new Date()).getTime();
    const materialized: SavedSequence[] = drafts.map((draft, idx) => ({
      ...draft,
      id: `seq-auto-${timestamp}-${idx + 1}`,
    }));

    if (onSaveSequencesBatch) {
      onSaveSequencesBatch(materialized);
    } else {
      const current = usePilatesStore.getState();
      usePilatesStore.setState({
        savedSequences: [...materialized, ...current.savedSequences],
        saveFeedback: messageKo,
      });
    }
    setFeedbackKo(messageKo);
  };

  const handleUndoLast = () => {
    if (!undoSnapshot) return;
    const snap = undoSnapshot;
    setUndoSnapshot(null);
    setLastDiffs([]);
    if (onApplySteps) {
      onApplySteps(snap);
    } else {
      const current = usePilatesStore.getState();
      usePilatesStore.setState({
        activeSteps: structuredClone(snap.steps),
        activeTitle: snap.title ?? current.activeTitle,
        activeTargetMinutes: snap.targetMinutes ?? current.activeTargetMinutes,
        activeLevel: snap.level ?? current.activeLevel,
        activeApparatus: snap.apparatus ?? current.activeApparatus,
        saveFeedback: '방금 자동 변경을 이전 구성으로 되돌렸어요.',
      });
    }
    setFeedbackKo('방금 자동 변경을 이전 구성으로 되돌렸어요.');
  };

  const handleRefreshAllOverlaps = () => {
    const result = refreshOverlappingSteps(steps, exercises, historyLogs, {
      groupId: effectiveGroupId,
      referenceDate,
    });
    setLastDiffs(result.diffs);
    if (result.replacedCount === 0) {
      setFeedbackKo(result.summaryKo);
      return;
    }
    commitStepsChange({ steps: result.steps, targetGroupId: effectiveGroupId }, result.summaryKo);
  };

  const handleSwapSingleStep = (stepIndex: number, replacementExercise: PilatesExercise) => {
    const targetStep = steps[stepIndex];
    if (!targetStep) return;
    const origEx = exerciseMap.get(targetStep.exerciseId);
    const nextSteps = steps.map((st, idx) =>
      idx === stepIndex
        ? {
            ...st,
            exerciseId: replacementExercise.id,
            blockCategory: replacementExercise.blockCategory,
            customSpringOverride: undefined,
            motionStudy: undefined,
          }
        : { ...st },
    );
    setLastDiffs([
      {
        stepIndex,
        stepId: targetStep.stepId,
        fromExerciseId: targetStep.exerciseId,
        fromNameKo: origEx?.nameKo ?? targetStep.exerciseId,
        toExerciseId: replacementExercise.id,
        toNameKo: replacementExercise.nameKo,
        apparatus: replacementExercise.apparatus,
        blockCategory: replacementExercise.blockCategory,
        fromSprings: targetStep.customSpringOverride || origEx?.springs || 'Bodyweight',
        toSprings: replacementExercise.springs,
        daysSinceLastTaught: null,
        reasonKo: '강사 원탭 선택 교체',
      },
    ]);
    commitStepsChange(
      { steps: nextSteps, targetGroupId: effectiveGroupId },
      `‘${origEx?.nameKo ?? '동작'}’을 ‘${replacementExercise.nameKo}’으로 바꿨어요.`,
    );
  };

  const handleOptimizeFlow = () => {
    const optimized = optimizeSequenceFlowSmart(steps, exerciseMap);
    if (!optimized.changed) {
      setFeedbackKo('이미 체위와 스프링 흐름이 잘 정돈되어 있어요.');
      return;
    }
    setLastDiffs([]);
    commitStepsChange(
      { steps: optimized.steps },
      optimized.improvementsKo[0] ?? '자세와 스프링 순서를 매끄럽게 정돈했어요.',
    );
  };

  const handleToggleAnchor = (exerciseId: string) => {
    setSelectedAnchorIds((prev) => {
      if (prev.includes(exerciseId)) {
        return prev.filter((id) => id !== exerciseId);
      }
      if (prev.length >= 2) {
        return [prev[1], exerciseId];
      }
      return [...prev, exerciseId];
    });
  };

  const handleBuildAnchorSequence = () => {
    if (selectedAnchorIds.length === 0) return;
    const built = buildAnchorFirstSequence({
      anchorExerciseIds: selectedAnchorIds,
      exercises,
      historyLogs,
      targetMinutes: anchorTargetMin,
      level: anchorLevel,
      groupId: effectiveGroupId,
      referenceDate,
    });
    setAnchorResult(built);
    setFeedbackKo(`‘${built.anchorNamesKo[0]}’ 기준으로 ${built.targetMinutes}분 수업을 완성했어요.`);
  };

  const handleApplyAnchorResult = () => {
    if (!anchorResult) return;
    commitStepsChange(
      {
        steps: anchorResult.steps,
        title: anchorResult.titleKo,
        subtitle: anchorResult.subtitleKo,
        targetMinutes: anchorResult.targetMinutes,
        level: anchorResult.level,
        apparatus: anchorResult.apparatus,
        targetGroupId: effectiveGroupId,
      },
      `‘${anchorResult.titleKo}’ 수업을 작업실에 바로 적용했어요.`,
    );
  };

  const handleGenerateLevelForks = () => {
    const bundle = forkSequenceAcrossLevels({
      baseTitle: activeTitle || '맞춤 시퀀스',
      steps,
      exercises,
      targetMinutes: activeTargetMinutes,
      historyLogs,
      referenceDate,
    });
    setForkBundle(bundle);
    setFeedbackKo(bundle.summaryKo);
  };

  const handleGenerateWeeklyPlan = () => {
    const plan = generateWeeklyAutoPlan({
      groups: classGroups,
      exercises,
      historyLogs,
      targetMinutes: activeTargetMinutes,
      referenceDate,
    });
    setWeeklyPlan(plan);
    setFeedbackKo(plan.summaryKo);
  };

  const scoreToneClass =
    freshnessReport.summaryTier === 'fresh'
      ? ''
      : freshnessReport.summaryTier === 'variation-advised'
        ? 'is-warn'
        : 'is-danger';

  const replaceCount = freshnessReport.autoReplaceableDuplicateCount;

  return (
    <div
      className="pf-autopilot-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="pf-autopilot-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pf-autopilot-drawer-title"
      >
        <header className="pf-autopilot-header">
          <div className="pf-autopilot-header-copy">
            <p className="pf-autopilot-eyebrow">
              <Sparkles size={14} aria-hidden="true" />
              시퀀스 자동 도우미
            </p>
            <h2 id="pf-autopilot-drawer-title" className="pf-autopilot-title">
              이전 수업 안 겹치게 1탭 완성
            </h2>
            <p className="pf-autopilot-subtitle">
              겹친 동작 교체부터 메인 1개로 50분 채우기, 반별 자동 배치까지 바로 끝내세요.
            </p>
          </div>
          <button
            type="button"
            className="pf-autopilot-close"
            onClick={onClose}
            aria-label="시퀀스 자동 도우미 닫기"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="pf-autopilot-tabs" role="tablist" aria-label="자동화 기능 선택">
          <button
            type="button"
            role="tab"
            id="pf-autopilot-tab-freshness"
            aria-selected={activeTab === 'freshness'}
            aria-controls="pf-autopilot-panel-freshness"
            className={`pf-autopilot-tab ${activeTab === 'freshness' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('freshness')}
          >
            <RefreshCw size={15} aria-hidden="true" />
            <span>겹침 없애기</span>
          </button>
          <button
            type="button"
            role="tab"
            id="pf-autopilot-tab-anchor"
            aria-selected={activeTab === 'anchor'}
            aria-controls="pf-autopilot-panel-anchor"
            className={`pf-autopilot-tab ${activeTab === 'anchor' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('anchor')}
          >
            <Wand2 size={15} aria-hidden="true" />
            <span>1개로 완성</span>
          </button>
          <button
            type="button"
            role="tab"
            id="pf-autopilot-tab-scale"
            aria-selected={activeTab === 'scale'}
            aria-controls="pf-autopilot-panel-scale"
            className={`pf-autopilot-tab ${activeTab === 'scale' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('scale')}
          >
            <Layers size={15} aria-hidden="true" />
            <span>3반·주간 배치</span>
          </button>
        </div>

        <div className="pf-autopilot-body">
          {feedbackKo && (
            <div className="pf-autopilot-feedback" role="status" aria-live="polite">
              <div className="pf-autopilot-feedback-main">
                <CheckCircle2 size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{feedbackKo}</span>
              </div>
              {undoSnapshot && (
                <button
                  type="button"
                  className="pf-autopilot-undo-btn"
                  onClick={handleUndoLast}
                >
                  <RotateCcw size={14} aria-hidden="true" />
                  되돌리기
                </button>
              )}
            </div>
          )}

          {/* TAB 1: Smart Freshness & 1-tap Overlap Replacement */}
          {activeTab === 'freshness' && (
            <div
              id="pf-autopilot-panel-freshness"
              role="tabpanel"
              aria-labelledby="pf-autopilot-tab-freshness"
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              <article className="pf-autopilot-card">
                <label className="pf-autopilot-field">
                  <span className="pf-autopilot-label">어느 반의 이전 수업과 비교할까요?</span>
                  <select
                    className="pf-autopilot-select"
                    value={selectedGroupId}
                    onChange={(event) => setSelectedGroupId(event.target.value)}
                    aria-label="비교할 반 선택"
                  >
                    <option value="all">전체 최근 4주 수업 기록</option>
                    {classGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} (Lv {group.defaultLevel})
                      </option>
                    ))}
                  </select>
                </label>

                <div className="pf-autopilot-score-row" data-testid="freshness-score-card">
                  <div className={`pf-autopilot-score-number ${scoreToneClass}`}>
                    {freshnessReport.freshnessScore}%
                  </div>
                  <div className="pf-autopilot-score-copy">
                    <p className="pf-autopilot-score-headline">{freshnessReport.summaryLabelKo}</p>
                    <div className="pf-autopilot-score-meta">
                      <span>겹침 {freshnessReport.recentDuplicateCount}개</span>
                      <span>·</span>
                      <span>변주 추천 {freshnessReport.variationReadyCount}개</span>
                      <span>·</span>
                      <span>신선 {freshnessReport.freshCount}개</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="pf-autopilot-primary-btn"
                  disabled={replaceCount === 0}
                  onClick={handleRefreshAllOverlaps}
                >
                  <RefreshCw size={17} aria-hidden="true" />
                  {replaceCount > 0
                    ? `겹친 ${replaceCount}개 동작 새 동작으로 바꾸기`
                    : '최근 수업과 겹친 메인 동작이 없어요'}
                </button>

                {freshnessReport.routineExemptCount > 0 && (
                  <p className="pf-autopilot-helper">
                    준비·마무리 호흡/스트레칭 {freshnessReport.routineExemptCount}개는 자연스러운
                    흐름을 위해 그대로 두었어요. 잠긴 동작과 휴식도 100% 보존됩니다.
                  </p>
                )}
              </article>

              {lastDiffs.length > 0 && (
                <article className="pf-autopilot-card" aria-label="방금 교체된 동작 내역">
                  <div className="pf-autopilot-section-head">
                    <h3 className="pf-autopilot-section-title">방금 바뀐 동작 ({lastDiffs.length}개)</h3>
                  </div>
                  <ul className="pf-autopilot-list">
                    {lastDiffs.map((diff) => (
                      <li key={`${diff.stepId}-${diff.toExerciseId}`} className="pf-autopilot-diff-row">
                        <div className="pf-autopilot-diff-arrow">
                          <span className="pf-autopilot-diff-old">{diff.fromNameKo}</span>
                          <ArrowRight size={14} aria-hidden="true" />
                          <span className="pf-autopilot-diff-new">{diff.toNameKo}</span>
                        </div>
                        <p className="pf-autopilot-row-note">
                          스프링 {diff.fromSprings} → {diff.toSprings} · {diff.reasonKo}
                        </p>
                      </li>
                    ))}
                  </ul>
                </article>
              )}

              {(freshnessReport.duplicateSteps.length > 0 ||
                freshnessReport.variationReadySteps.length > 0) && (
                <article className="pf-autopilot-card">
                  <div className="pf-autopilot-section-head">
                    <h3 className="pf-autopilot-section-title">겹침 · 변주 상세 확인</h3>
                  </div>
                  <ul className="pf-autopilot-list">
                    {[...freshnessReport.duplicateSteps, ...freshnessReport.variationReadySteps].map(
                      (detail) => (
                        <li key={detail.stepId} className="pf-autopilot-row">
                          <div className="pf-autopilot-row-top">
                            <span className="pf-autopilot-row-name">
                              {detail.stepIndex + 1}. {detail.exerciseNameKo}
                            </span>
                            <span
                              className={`pf-autopilot-badge ${
                                detail.status === 'recent-duplicate'
                                  ? 'is-duplicate'
                                  : 'is-variation'
                              }`}
                            >
                              {detail.isLocked && <Lock size={11} aria-hidden="true" />}
                              {detail.daysSinceLastTaught === 0
                                ? '오늘 수업'
                                : `${detail.daysSinceLastTaught}일 전`}
                            </span>
                          </div>
                          <p className="pf-autopilot-row-note">
                            {detail.variationSuggestionKo ?? detail.reasonKo}
                          </p>
                          {!detail.isLocked && detail.replacementCandidates.length > 0 && (
                            <div className="pf-autopilot-candidate-strip">
                              {detail.replacementCandidates.slice(0, 2).map((cand) => (
                                <button
                                  key={cand.exercise.id}
                                  type="button"
                                  className="pf-autopilot-swap-chip"
                                  onClick={() =>
                                    handleSwapSingleStep(detail.stepIndex, cand.exercise)
                                  }
                                >
                                  <span>{cand.exercise.nameKo}으로 교체</span>
                                  <span>({cand.exercise.springs})</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </li>
                      ),
                    )}
                  </ul>
                </article>
              )}

              {/* Smart Flow & Joint-Load Optimizer Card */}
              <article className="pf-autopilot-card">
                <div className="pf-autopilot-section-head">
                  <h3 className="pf-autopilot-section-title">체위 · 관절 부하 순서 정리</h3>
                  <span className="pf-autopilot-badge is-fresh">
                    흐름 {flowPreview.beforeScore}점 → {flowPreview.afterScore}점
                  </span>
                </div>
                <p className="pf-autopilot-helper">
                  누움→앉음→네발→서기 순서와 스프링 변경, 손목·목 연속 지지를 한 번에 정리해요.
                </p>

                {flowPreview.beforeWarnings.length > 0 && (
                  <ul className="pf-autopilot-warning-list">
                    {flowPreview.beforeWarnings.slice(0, 3).map((warn, idx) => (
                      <li key={`${warn.type}-${idx}`} className="pf-autopilot-warning-item">
                        <AlertTriangle
                          size={15}
                          aria-hidden="true"
                          style={{ flexShrink: 0, marginTop: 2 }}
                        />
                        <span>{warn.messageKo}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <button
                  type="button"
                  className="pf-autopilot-secondary-btn"
                  disabled={!flowPreview.changed}
                  onClick={handleOptimizeFlow}
                >
                  <Sparkles size={16} aria-hidden="true" />
                  {flowPreview.changed
                    ? '자세·스프링 순서 자동 정리하기'
                    : '현재 순서가 이미 매끄러워요'}
                </button>
              </article>
            </div>
          )}

          {/* TAB 2: Anchor-First 50-Min Auto Builder */}
          {activeTab === 'anchor' && (
            <div
              id="pf-autopilot-panel-anchor"
              role="tabpanel"
              aria-labelledby="pf-autopilot-tab-anchor"
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              <article className="pf-autopilot-card">
                <div className="pf-autopilot-section-head">
                  <h3 className="pf-autopilot-section-title">오늘 꼭 넣고 싶은 메인 동작 (1~2개)</h3>
                  <span className="pf-autopilot-badge is-neutral">
                    {selectedAnchorIds.length}/2 선택
                  </span>
                </div>

                {selectedAnchorIds.length > 0 && (
                  <div className="pf-autopilot-chip-row" aria-label="선택된 핵심 동작">
                    {selectedAnchorIds.map((id) => {
                      const ex = exerciseMap.get(id);
                      if (!ex) return null;
                      return (
                        <button
                          key={id}
                          type="button"
                          className="pf-autopilot-chip is-selected"
                          onClick={() => handleToggleAnchor(id)}
                        >
                          <span>{ex.nameKo}</span>
                          <X size={13} aria-hidden="true" />
                        </button>
                      );
                    })}
                  </div>
                )}

                <label className="pf-autopilot-field">
                  <span className="pf-autopilot-label">동작 이름·부위 검색</span>
                  <div style={{ position: 'relative' }}>
                    <Search
                      size={16}
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        left: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#6b6257',
                        pointerEvents: 'none',
                      }}
                    />
                    <input
                      type="search"
                      className="pf-autopilot-input"
                      style={{ paddingLeft: 36 }}
                      value={anchorQuery}
                      onChange={(event) => setAnchorQuery(event.target.value)}
                      placeholder="예: 스완, 스쿠터, 헌드레드, 둔근"
                      aria-label="메인 동작 검색"
                    />
                  </div>
                </label>

                <div className="pf-autopilot-chip-row" role="group" aria-label="기구 필터">
                  {APPARATUS_FILTERS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={`pf-autopilot-chip ${anchorApparatusFilter === item.value ? 'is-selected' : ''}`}
                      onClick={() => setAnchorApparatusFilter(item.value)}
                    >
                      {item.labelKo}
                    </button>
                  ))}
                </div>

                <div className="pf-autopilot-anchor-picker" role="listbox" aria-label="동작 목록">
                  {filteredAnchorExercises.map((ex) => {
                    const isSelected = selectedAnchorIds.includes(ex.id);
                    return (
                      <button
                        key={ex.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        className={`pf-autopilot-anchor-item ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => handleToggleAnchor(ex.id)}
                      >
                        <div className="pf-autopilot-anchor-item-meta">
                          <span className="pf-autopilot-anchor-item-name">{ex.nameKo}</span>
                          <span className="pf-autopilot-anchor-item-sub">
                            {APPARATUS_LABELS[ex.apparatus].ko} · Lv {ex.level} · {ex.springs}
                          </span>
                        </div>
                        <span
                          className={`pf-autopilot-badge ${isSelected ? 'is-fresh' : 'is-neutral'}`}
                        >
                          {isSelected ? '선택됨' : '선택'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="pf-autopilot-grid-2">
                  <div className="pf-autopilot-field">
                    <span className="pf-autopilot-label">수업 시간</span>
                    <div className="pf-autopilot-chip-row">
                      {DURATION_OPTIONS.map((min) => (
                        <button
                          key={min}
                          type="button"
                          className={`pf-autopilot-chip ${anchorTargetMin === min ? 'is-selected' : ''}`}
                          onClick={() => setAnchorTargetMin(min)}
                        >
                          {min}분
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pf-autopilot-field">
                    <span className="pf-autopilot-label">수업 난이도</span>
                    <div className="pf-autopilot-chip-row">
                      {LEVEL_OPTIONS.map((lv) => (
                        <button
                          key={lv.value}
                          type="button"
                          className={`pf-autopilot-chip ${anchorLevel === lv.value ? 'is-selected' : ''}`}
                          onClick={() => setAnchorLevel(lv.value)}
                        >
                          {lv.labelKo}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="pf-autopilot-primary-btn"
                  disabled={selectedAnchorIds.length === 0}
                  onClick={handleBuildAnchorSequence}
                >
                  <Wand2 size={17} aria-hidden="true" />
                  앞뒤 {anchorTargetMin}분 자동 채우기
                </button>
              </article>

              {anchorResult && (
                <article className="pf-autopilot-card" data-testid="anchor-sequence-preview">
                  <div className="pf-autopilot-section-head">
                    <h3 className="pf-autopilot-section-title">{anchorResult.titleKo}</h3>
                    <span className="pf-autopilot-badge is-fresh">
                      신선도 {anchorResult.freshness.freshnessScore}%
                    </span>
                  </div>
                  <p className="pf-autopilot-helper">{anchorResult.compensatoryCooldownReasonKo}</p>

                  <div className="pf-autopilot-chip-row">
                    {anchorResult.coveredSpinalPlanes.map((plane) => (
                      <span key={plane} className="pf-autopilot-badge is-spring">
                        {SPINAL_PLANE_LABELS[plane].ko.split(' ')[0]}
                      </span>
                    ))}
                  </div>

                  <ul className="pf-autopilot-list">
                    {anchorResult.steps.map((step, idx) => {
                      const ex = exerciseMap.get(step.exerciseId);
                      const isAnchor = anchorResult.anchorExerciseIds.includes(step.exerciseId);
                      return (
                        <li key={step.stepId} className="pf-autopilot-step-preview-row">
                          <div className="pf-autopilot-step-preview-left">
                            <span className="pf-autopilot-step-num">{idx + 1}</span>
                            <span className="pf-autopilot-step-preview-name">
                              {ex?.nameKo ?? step.exerciseId}
                            </span>
                          </div>
                          <div className="pf-autopilot-step-preview-right">
                            {isAnchor && <span className="pf-autopilot-badge is-fresh">핵심</span>}
                            <span className="pf-autopilot-badge is-spring">
                              {ex?.springs ?? '-'}
                            </span>
                            <span className="pf-autopilot-badge is-neutral">
                              {step.durationMin}분
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <button
                    type="button"
                    className="pf-autopilot-primary-btn"
                    onClick={handleApplyAnchorResult}
                  >
                    <CheckCircle2 size={17} aria-hidden="true" />이 수업 바로 적용하기
                  </button>
                </article>
              )}
            </div>
          )}

          {/* TAB 3: 3-Level Class Fork & Weekly Conflict-Free Auto Plan */}
          {activeTab === 'scale' && (
            <div
              id="pf-autopilot-panel-scale"
              role="tabpanel"
              aria-labelledby="pf-autopilot-tab-scale"
              style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              {/* Section A: 1 sequence -> 3 level forks */}
              <article className="pf-autopilot-card">
                <div className="pf-autopilot-section-head">
                  <h3 className="pf-autopilot-section-title">초급 · 중급 · 심화 3개 반 동시 복제</h3>
                </div>
                <p className="pf-autopilot-helper">
                  현재 시퀀스 1개로 입문(1.0)·중급(1.5)·심화(2.0) 반별 맞춤 버전을 한 번에
                  만들어요.
                </p>
                <button
                  type="button"
                  className="pf-autopilot-primary-btn"
                  disabled={steps.length === 0}
                  onClick={handleGenerateLevelForks}
                >
                  <Layers size={17} aria-hidden="true" />
                  3개 반 맞춤 시퀀스 한 번에 만들기
                </button>

                {forkBundle && (
                  <>
                    <ul className="pf-autopilot-list" data-testid="level-fork-list">
                      {forkBundle.variants.map((variant) => (
                        <li key={variant.level} className="pf-autopilot-row">
                          <div className="pf-autopilot-row-top">
                            <span className="pf-autopilot-row-name">{variant.titleKo}</span>
                            <span className="pf-autopilot-badge is-fresh">{variant.badgeKo}</span>
                          </div>
                          <p className="pf-autopilot-row-note">{variant.changeSummaryKo[0]}</p>
                          <div className="pf-autopilot-btn-row">
                            <button
                              type="button"
                              className="pf-autopilot-secondary-btn"
                              onClick={() =>
                                commitStepsChange(
                                  {
                                    steps: variant.steps,
                                    title: variant.titleKo,
                                    subtitle: variant.subtitleKo,
                                    targetMinutes: variant.targetMinutes,
                                    level: variant.level,
                                    apparatus: variant.apparatus,
                                  },
                                  `‘${variant.titleKo}’ 버전을 작업실에 열었어요.`,
                                )
                              }
                            >
                              작업실에 바로 열기
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      className="pf-autopilot-secondary-btn"
                      onClick={() =>
                        commitBatchSave(
                          forkBundle.variants.map((v) => v.savedSequenceDraft),
                          '초급·중급·심화 3개 반 시퀀스를 보관함에 모두 저장했어요.',
                        )
                      }
                    >
                      3개 반 시퀀스 모두 보관함에 저장
                    </button>
                  </>
                )}
              </article>

              {/* Section B: Weekly Conflict-Free Auto Schedule */}
              <article className="pf-autopilot-card">
                <div className="pf-autopilot-section-head">
                  <h3 className="pf-autopilot-section-title">주간 반별 무중복 자동 배치</h3>
                  <span className="pf-autopilot-badge is-neutral">등록 반 {classGroups.length}개</span>
                </div>
                <p className="pf-autopilot-helper">
                  등록된 반의 난이도에 맞추고, 이전 수업과 같은 주 다른 요일 수업의 메인 동작이
                  겹치지 않도록 1주일 치를 자동 구성해요.
                </p>

                <button
                  type="button"
                  className="pf-autopilot-primary-btn"
                  disabled={classGroups.length === 0}
                  onClick={handleGenerateWeeklyPlan}
                >
                  <CalendarRange size={17} aria-hidden="true" />
                  이번 주 반별 수업 안 겹치게 자동 배치
                </button>

                {weeklyPlan && weeklyPlan.plans.length > 0 && (
                  <>
                    <div className="pf-autopilot-score-row" data-testid="weekly-plan-summary">
                      <div className="pf-autopilot-score-number">
                        {weeklyPlan.stats.averageFreshnessScore}%
                      </div>
                      <div className="pf-autopilot-score-copy">
                        <p className="pf-autopilot-score-headline">{weeklyPlan.summaryKo}</p>
                        <div className="pf-autopilot-score-meta">
                          <span>주간 메인 겹침 {weeklyPlan.stats.crossClassMainOverlapCount}건</span>
                          <span>·</span>
                          <span>고유 메인 {weeklyPlan.stats.totalUniqueMainExercises}개</span>
                        </div>
                      </div>
                    </div>

                    <ul className="pf-autopilot-list" data-testid="weekly-plan-list">
                      {weeklyPlan.plans.map((item) => (
                        <li key={item.groupId} className="pf-autopilot-row">
                          <div className="pf-autopilot-row-top">
                            <span className="pf-autopilot-row-name">
                              {item.groupName} · {item.focusLabelKo}
                            </span>
                            <span className="pf-autopilot-badge is-fresh">
                              Lv {item.level} · 신선도 {item.freshnessScore}%
                            </span>
                          </div>
                          <p className="pf-autopilot-row-note">
                            {item.scheduleLabel} · 핵심 동작:{' '}
                            {item.mainExerciseNamesKo.slice(0, 3).join(', ')}
                          </p>
                          <div className="pf-autopilot-btn-row">
                            <button
                              type="button"
                              className="pf-autopilot-secondary-btn"
                              onClick={() =>
                                commitStepsChange(
                                  {
                                    steps: item.steps,
                                    title: item.titleKo,
                                    subtitle: item.subtitleKo,
                                    targetMinutes: item.targetMinutes,
                                    level: item.level,
                                    apparatus: item.apparatus,
                                    targetGroupId: item.groupId,
                                  },
                                  `‘${item.groupName}’ 주간 초안을 작업실에 열었어요.`,
                                )
                              }
                            >
                              이 반 수업 열기
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      className="pf-autopilot-secondary-btn"
                      onClick={() =>
                        commitBatchSave(
                          weeklyPlan.plans.map((p) => p.savedSequenceDraft),
                          `주간 ${weeklyPlan.plans.length}개 반 시퀀스 초안을 보관함에 모두 저장했어요.`,
                        )
                      }
                    >
                      주간 초안 {weeklyPlan.plans.length}개 모두 보관함에 저장
                    </button>
                  </>
                )}
              </article>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
