import { compareCodeUnits } from '../utils/compareCodeUnits';
import React, { useState } from 'react';
import { CheckCircle2, Clock3, Play, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { CANONICAL_BLOCKS, APPARATUS_LABELS } from '../data/pilatesCatalog';
import {
  AI_THEME_PRESETS,
  collectExcludedRecentExercises,
  generateAiThematicSequence,
} from '../services/geminiSequenceAi';
import type { AiSequenceGenerationResult, AiThemeId } from '../services/geminiSequenceAi';
import { usePilatesStore } from '../store/usePilatesStore';
import { isExerciseAutoEligible } from '../utils/exerciseReview';
import type {
  AutoGenerateCriteria,
  ClassHistoryLog,
  PilatesExercise,
  SavedSequence,
} from '../types/pilates';
import { formatSecondsToMMSS, getStepTiming, isRestStep } from '../utils/sequenceEngine';
import '../styles/ai-copilot.css';

interface AiSequenceCoPilotPanelProps {
  criteria: AutoGenerateCriteria;
  selectedEquipment: string[];
  onAppliedSequence?: () => void;
  onOpenExerciseDetail?: (exercise: PilatesExercise) => void;
}

export const AiSequenceCoPilotPanel: React.FC<AiSequenceCoPilotPanelProps> = ({
  criteria,
  selectedEquipment,
  onAppliedSequence,
  onOpenExerciseDetail,
}) => {
  const store = usePilatesStore();
  const [selectedTheme, setSelectedTheme] = useState<AiThemeId>('posture-upper');
  const [customPrompt, setCustomPrompt] = useState('');
  const [excludeWindow, setExcludeWindow] = useState<number>(
    criteria.excludeDaysWindow > 0 ? criteria.excludeDaysWindow : 14,
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiSequenceGenerationResult | null>(null);
  const [appliedBanner, setAppliedBanner] = useState('');
  const [error, setError] = useState('');
  const [resultInput, setResultInput] = useState('');
  const buildInputKey = (
    historyLogs: ClassHistoryLog[],
    savedSequences: SavedSequence[],
    exercises: PilatesExercise[],
  ) =>
    JSON.stringify([
      criteria,
      selectedEquipment,
      selectedTheme,
      customPrompt,
      excludeWindow,
      excludeWindow > 0
        ? {
            history: historyLogs
              .filter(
                (log) =>
                  !criteria.targetGroupId ||
                  criteria.targetGroupId === 'all' ||
                  log.groupId === criteria.targetGroupId,
              )
              .map((log) => [log.id, log.groupId, log.taughtAt, log.exerciseIds]),
            saved: savedSequences
              .slice(0, 5)
              .map((sequence) => [
                sequence.id,
                sequence.updatedAt,
                sequence.steps.filter((step) => !isRestStep(step)).map((step) => step.exerciseId),
              ]),
            // Recompute at apply time too, including records crossing the date cutoff.
            excludedIds: [
              ...collectExcludedRecentExercises(
                historyLogs,
                savedSequences,
                excludeWindow,
                criteria.targetGroupId,
                exercises,
              ).excludedIds,
            ].sort(compareCodeUnits),
          }
        : null,
    ]);
  const inputKey = buildInputKey(store.historyLogs, store.savedSequences, store.exercises);

  const { excludedIds, excludedNames } = collectExcludedRecentExercises(
    store.historyLogs,
    store.savedSequences,
    excludeWindow,
    criteria.targetGroupId,
    store.exercises,
  );

  const exerciseMap = new Map(store.exercises.map((ex) => [ex.id, ex]));

  const handleGenerate = async () => {
    setLoading(true);
    setAppliedBanner('');
    setError('');
    setResult(null);
    try {
      const generated = await generateAiThematicSequence({
        themeId: selectedTheme,
        customPrompt,
        targetMinutes: criteria.targetMinutes || 50,
        restMinutes: criteria.restMinutes ?? 0,
        equipmentIds: selectedEquipment.length ? selectedEquipment : ['mat'],
        level: criteria.level,
        excludeDaysWindow: excludeWindow,
        targetGroupId: criteria.targetGroupId,
        exercises: store.exercises,
        historyLogs: store.historyLogs,
        savedSequences: store.savedSequences,
      });
      setResult(generated);
      setResultInput(inputKey);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : '추천을 만들지 못했습니다. 기존 수업은 바뀌지 않았습니다.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApplyToWorkbench = () => {
    if (!result || loading) return;
    const current = usePilatesStore.getState();
    if (
      resultInput !== buildInputKey(current.historyLogs, current.savedSequences, current.exercises)
    ) {
      setError(
        '조건 또는 이전 수업 이력이 바뀌었습니다. 다시 추천해 주세요. 기존 수업은 바뀌지 않았습니다.',
      );
      return;
    }
    if (
      result.steps.some(
        (step) =>
          !isRestStep(step) &&
          !current.exercises.some((ex) => ex.id === step.exerciseId && isExerciseAutoEligible(ex)),
      )
    ) {
      setError(
        '추천 후 동작 검토 상태가 바뀌었습니다. 다시 추천해 주세요. 기존 수업은 바뀌지 않았습니다.',
      );
      return;
    }
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
      activeSequenceId: '',
      activeSteps: structuredClone(result.steps),
      activeTitle: result.titleKo,
      activeSubtitle: '',
      activeApparatus: criteria.apparatus,
      activeLevel: criteria.level,
      activeTargetMinutes: result.targetMinutes,
      activeTargetGroupId: criteria.targetGroupId ?? '',
      lastCriteria: structuredClone(criteria),
      draftCriteria: structuredClone(criteria),
      undoStack: [...current.undoStack.slice(-19), previous],
      generationError: null,
      saveFeedback:
        '로컬 추천을 새 수업 초안으로 적용했습니다. 되돌리기로 이전 구성을 복원할 수 있습니다.',
    });
    setAppliedBanner(
      `‘${result.titleKo}’ 시퀀스가 현재 수업 구성에 반영되었습니다. 각 동작의 검토 상태와 세팅을 확인해 주세요.`,
    );
    onAppliedSequence?.();
  };

  return (
    <section className="ai-copilot-panel" aria-label="로컬 주제별 수업 추천">
      <div className="ai-copilot-header">
        <div className="ai-copilot-title-row">
          <span className="ai-copilot-badge">
            <Sparkles size={14} aria-hidden="true" />
            LOCAL PRESETS · PRIVATE ON DEVICE
          </span>
          <span className="ai-copilot-overlap-pill">
            <ShieldCheck size={13} aria-hidden="true" />
            최근 {excludeWindow}일 수업 중복 배제 ({excludedIds.size}개 동작 제외)
          </span>
        </div>
        <h3>로컬 시퀀스 추천</h3>
        <p className="ai-copilot-desc">
          목표 수업 시간(<strong>{criteria.targetMinutes}분</strong>
          {criteria.restMinutes ? ` · 휴식 ${criteria.restMinutes}분 포함` : ''})에 초 단위로
          합산하고, 최근 진행·저장한 수업 동작과의 중복을 피해 선택한 주제에 맞는 시퀀스를
          설계합니다.
        </p>
      </div>

      <div className="ai-copilot-theme-grid" role="group" aria-label="수업 주제 프리셋 선택">
        {AI_THEME_PRESETS.map((preset) => {
          const active = selectedTheme === preset.id;
          return (
            <button
              type="button"
              key={preset.id}
              aria-pressed={active}
              className={`ai-theme-card ${active ? 'is-selected' : ''}`}
              onClick={() => setSelectedTheme(preset.id)}
            >
              <strong>{preset.labelKo}</strong>
              <small>{preset.subtitleKo}</small>
            </button>
          );
        })}
      </div>

      <div className="ai-copilot-controls-row">
        <label className="ai-copilot-prompt-field">
          <span>맞춤 수업 주제·요청사항 (자연어 입력 · 선택)</span>
          <input
            type="text"
            value={customPrompt}
            onChange={(event) => setCustomPrompt(event.target.value)}
            placeholder="예: 어제 하체를 많이 해서 오늘은 상체·흉추 회전과 코어 위주로 구성해 줘"
            maxLength={200}
          />
        </label>
        <label className="ai-copilot-window-field">
          <span>이전 수업 중복 방지 기간</span>
          <select
            value={excludeWindow}
            onChange={(event) => setExcludeWindow(Number(event.target.value))}
          >
            <option value={7}>최근 7일 수업 제외</option>
            <option value={14}>최근 14일 수업 제외</option>
            <option value={30}>최근 30일 수업 제외</option>
            <option value={0}>중복 제외 안 함</option>
          </select>
        </label>
      </div>

      {excludedNames.length > 0 && (
        <p className="ai-copilot-excluded-list">
          <strong>자동 배제되는 최근 수업 동작:</strong> {excludedNames.slice(0, 6).join(' · ')}
          {excludedNames.length > 6 ? ` 외 ${excludedNames.length - 6}개` : ''}
        </p>
      )}

      <div className="ai-copilot-key-box" role="note">
        <strong>외부 AI 생성은 아직 연결되지 않았습니다.</strong>
        <p>
          무료 전용 서버와 비용 차단이 검증될 때까지 외부 AI는 비활성입니다. 아래 추천은 이 기기의
          규칙 기반 프리셋이며, 입력·수업 이력·건강정보를 외부로 보내지 않습니다. API 키를 입력하지
          마세요.
        </p>
        <button type="button" className="btn-secondary" disabled>
          외부 AI 생성 · 무료 서버 연결 대기
        </button>
      </div>
      {error && (
        <p role="alert" className="ai-applied-banner">
          {error}
        </p>
      )}

      <div className="ai-copilot-action-bar">
        <button
          type="button"
          className="btn-primary ai-generate-btn"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? <RefreshCw size={17} className="spin" /> : <Sparkles size={17} />}
          <span>
            {loading
              ? '검토 완료 동작으로 로컬 초안을 구성 중...'
              : `${criteria.targetMinutes}분 로컬 추천 만들기`}
          </span>
        </button>
      </div>

      {result && resultInput !== inputKey && (
        <p role="status">조건 또는 이전 수업 이력이 바뀌었습니다. 적용하려면 다시 추천해 주세요.</p>
      )}
      {result && (
        <div className="ai-copilot-result" role="region" aria-label="로컬 추천 시퀀스 미리보기">
          <div className="ai-result-header">
            <div>
              <div className="ai-result-badges">
                <span className="ai-badge-engine">{result.modelName}</span>
                <span className="ai-badge-time">
                  <Clock3 size={13} /> 총 {formatSecondsToMMSS(result.totalSeconds)} / 목표{' '}
                  {result.targetMinutes}분 (강사 검토 필요)
                </span>
                <span className="ai-badge-overlap">
                  <CheckCircle2 size={13} />{' '}
                  {result.zeroOverlapVerified
                    ? `이전 수업 겹침 0건 (최근 ${result.excludedRecentCount}개 배제)`
                    : '최소 중복 구성'}
                </span>
                <span className="ai-badge-meta">
                  척추 {result.spinalPlanesCovered.length}방향 · 스프링 변경 {result.springChanges}
                  회
                </span>
              </div>
              <h4>{result.titleKo}</h4>
              <p className="ai-result-summary">{result.summaryKo}</p>
            </div>
            <button
              type="button"
              className="btn-primary ai-apply-btn"
              onClick={handleApplyToWorkbench}
              disabled={loading || resultInput !== inputKey}
            >
              <Play size={16} /> 새 수업 초안으로 적용 · 이전 구성 되돌리기 가능
            </button>
          </div>

          {appliedBanner && (
            <p className="ai-applied-banner" role="status">
              <CheckCircle2 size={15} /> {appliedBanner}
            </p>
          )}

          <ol className="ai-result-step-list">
            {result.steps.map((step, idx) => {
              if (isRestStep(step)) {
                return (
                  <li key={step.stepId} className="ai-result-step is-rest">
                    <span className="ai-step-Order">{String(idx + 1).padStart(2, '0')}</span>
                    <div className="ai-step-body">
                      <strong>☕ 중간 휴식 및 호흡 정리</strong>
                      <small>전체 수업 시간에 포함된 계획 휴식</small>
                    </div>
                    <span className="ai-step-time">
                      {formatSecondsToMMSS(getStepTiming(step).totalSec)}
                    </span>
                  </li>
                );
              }
              const ex = exerciseMap.get(step.exerciseId);
              if (!ex) return null;
              const timing = getStepTiming(step, ex);
              const rationale = result.rationales.find((r) => r.exerciseId === ex.id);
              const blockMeta = CANONICAL_BLOCKS.find((b) => b.category === ex.blockCategory);
              return (
                <li key={step.stepId} className="ai-result-step">
                  <span className="ai-step-Order">{String(idx + 1).padStart(2, '0')}</span>
                  <div className="ai-step-body">
                    <div className="ai-step-topline">
                      <span className="ai-step-block-tag">
                        {blockMeta?.nameKo ?? ex.blockCategory}
                      </span>
                      <span className="ai-step-equip-tag">
                        {APPARATUS_LABELS[ex.apparatus].ko} · {ex.springs}
                      </span>
                      <strong>{ex.nameKo}</strong>
                    </div>
                    <p className="ai-step-reason">
                      <Sparkles size={12} aria-hidden="true" /> {rationale?.reasonKo ?? ex.cues[0]}
                    </p>
                  </div>
                  <div className="ai-step-right">
                    <span className="ai-step-time">{formatSecondsToMMSS(timing.totalSec)}</span>
                    {onOpenExerciseDetail && (
                      <button
                        type="button"
                        className="text-button ai-step-detail-btn"
                        onClick={() => onOpenExerciseDetail(ex)}
                      >
                        영상·상세
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="ai-result-disclaimer">
            로컬 규칙 추천은 시간·이전 수업 이력·주제 키워드를 조합한 수업 계획 초안입니다. 실제
            수업 전 강사가 기구 스프링, 회원별 금기 사항, 동작 검토 상태를 직접 확인하세요.
          </p>
        </div>
      )}
    </section>
  );
};
