import React, { useMemo, useState } from 'react';
import type {
  AutoGenerateCriteria,
  PilatesExercise,
  ReformerBrand,
  SequenceStep,
} from '../../types/pilates';
import { verifySequenceAiSafetyAndFidelity } from '../../utils/aiSequenceSafetyVerifier';
import { simulateClassEnergyCurve } from '../../utils/classPacingSimulator';
import { generateFreshClassAngles } from '../../utils/freshClassAnglesGenerator';
import { generateInstructorVoiceScript } from '../../utils/instructorVoiceScriptGenerator';
import {
  applyRecommendedLayersToSteps,
  buildMemberConditionLayerAdvice,
} from '../../utils/memberConditionLayerAdvisor';
import {
  analyzeSequenceTransitionCost,
  suggestTransitionOptimizedOrder,
} from '../../utils/transitionCostOptimizer';

export interface StudioFlowOptimizerPanelProps {
  readonly sequenceTitle: string;
  readonly steps: readonly SequenceStep[];
  readonly exercisesById: ReadonlyMap<string, PilatesExercise>;
  readonly criteria: AutoGenerateCriteria;
  readonly reformerBrand: ReformerBrand;
  readonly onApplySteps: (nextSteps: SequenceStep[], noticeMessage: string) => void;
}

export const StudioFlowOptimizerPanel: React.FC<StudioFlowOptimizerPanelProps> = ({
  sequenceTitle,
  steps,
  exercisesById,
  criteria,
  reformerBrand,
  onApplySteps,
}) => {
  const [showScript, setShowScript] = useState(false);
  const [showFreshAngles, setShowFreshAngles] = useState(false);

  const transitionAnalysis = useMemo(
    () => analyzeSequenceTransitionCost(steps, exercisesById),
    [steps, exercisesById],
  );
  const layerAdvice = useMemo(
    () => buildMemberConditionLayerAdvice(steps, exercisesById, criteria),
    [steps, exercisesById, criteria],
  );
  const pacingCurve = useMemo(
    () => simulateClassEnergyCurve(steps, exercisesById),
    [steps, exercisesById],
  );
  const safetyReport = useMemo(
    () => verifySequenceAiSafetyAndFidelity(steps, exercisesById),
    [steps, exercisesById],
  );
  const freshAngles = useMemo(
    () => generateFreshClassAngles(steps, exercisesById, criteria),
    [steps, exercisesById, criteria],
  );
  const voiceScript = useMemo(
    () =>
      generateInstructorVoiceScript(sequenceTitle, steps, exercisesById, {
        level: criteria.level,
        reformerBrand,
      }),
    [sequenceTitle, steps, exercisesById, criteria.level, reformerBrand],
  );

  return (
    <section
      className="pf-card"
      data-testid="studio-flow-optimizer-panel"
      aria-label="동선 최적화·맞춤 레이어·에너지 곡선·Verify AI·5대 수업 각도 도구"
      style={{
        padding: '12px 16px',
        display: 'grid',
        gap: '10px',
        background: '#f8faf9',
        border: '1px solid #d8e5de',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'grid', gap: '3px' }}>
          <strong style={{ fontSize: '13px', color: '#173d34' }}>
            스튜디오 동선 최적화 · 관찰 맞춤 레이어 · RPE 에너지 곡선 · Verify AI · 5대 테마 각도
          </strong>
          <span className="muted" style={{ fontSize: '12px' }}>
            {transitionAnalysis.summaryKo} · {layerAdvice.summaryKo}
          </span>
          <span style={{ fontSize: '11.5px', color: '#2b5447' }}>
            {pacingCurve.pacingVerdictKo} · <strong>{safetyReport.summaryBadgeKo}</strong>
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {transitionAnalysis.potentialSavingsScore > 0 && (
            <button
              type="button"
              className="btn-secondary"
              style={{ minHeight: '32px', fontSize: '12px' }}
              onClick={() => {
                const nextSteps = suggestTransitionOptimizedOrder(steps, exercisesById);
                onApplySteps(
                  nextSteps,
                  `잠긴 동작과 구간을 유지한 채 기구·체위 전환 부하를 ${transitionAnalysis.potentialSavingsScore}점 줄이도록 순서를 정돈했습니다.`,
                );
              }}
            >
              전환 동선 최적화 적용 (-{transitionAnalysis.potentialSavingsScore}점)
            </button>
          )}
          {layerAdvice.changedCount > 0 && (
            <button
              type="button"
              className="btn-secondary"
              style={{ minHeight: '32px', fontSize: '12px' }}
              onClick={() => {
                const nextSteps = applyRecommendedLayersToSteps(steps, layerAdvice.advices);
                onApplySteps(
                  nextSteps,
                  `관찰 메모·목표에 맞춰 ${layerAdvice.changedCount}개 동작의 권장 레이어를 반영했습니다.`,
                );
              }}
            >
              맞춤 레이어 자동 배정 ({layerAdvice.changedCount}개)
            </button>
          )}
          <button
            type="button"
            className="btn-secondary"
            style={{ minHeight: '32px', fontSize: '12px' }}
            aria-expanded={showFreshAngles}
            onClick={() => setShowFreshAngles((prev) => !prev)}
          >
            {showFreshAngles ? '5대 테마 각도 접기' : '5대 수업 컨셉 리믹스 (5 Angles)'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            style={{ minHeight: '32px', fontSize: '12px' }}
            aria-expanded={showScript}
            onClick={() => setShowScript((prev) => !prev)}
          >
            {showScript ? '티칭 대본 접기' : `타임코드 티칭 대본 보기 (${voiceScript.segments.length}구간)`}
          </button>
        </div>
      </div>
      {showFreshAngles && (
        <div
          data-testid="fresh-class-angles-list"
          style={{
            display: 'grid',
            gap: '6px',
            padding: '10px 12px',
            borderRadius: '8px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
          }}
        >
          {freshAngles.map((angle) => (
            <div
              key={angle.id}
              style={{
                display: 'grid',
                gap: '2px',
                paddingBottom: '6px',
                borderBottom: '1px solid #f1f5f9',
                fontSize: '12px',
              }}
            >
              <strong>
                [{angle.badgeKo}] {angle.angleTitleKo}
              </strong>
              <span className="muted">부제 제안: {angle.suggestedSubtitleKo}</span>
              <span style={{ color: '#173d34' }}>큐 훅: {angle.teachingHookKo}</span>
            </div>
          ))}
        </div>
      )}
      {showScript && (
        <pre
          data-testid="instructor-voice-script-preview"
          style={{
            margin: 0,
            padding: '10px 12px',
            borderRadius: '8px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            fontSize: '11.5px',
            lineHeight: 1.55,
            whiteSpace: 'pre-wrap',
            maxHeight: '220px',
            overflowY: 'auto',
          }}
        >
          {voiceScript.fullTextKo}
        </pre>
      )}
    </section>
  );
};
