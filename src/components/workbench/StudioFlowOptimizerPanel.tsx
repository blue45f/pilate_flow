import React, { useId, useMemo, useState } from 'react';
import { PfAiStatusBadge, PfBadge, PfButton } from '../../design-system';
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
  const freshAnglesRegionId = useId();
  const voiceScriptRegionId = useId();

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
      className="pf-card pf-studio-optimizer"
      data-testid="studio-flow-optimizer-panel"
      aria-label="동선 최적화·맞춤 레이어·에너지 곡선·Verify AI·5대 수업 각도 도구"
    >
      <div className="pf-studio-optimizer__header">
        <div className="pf-studio-optimizer__copy">
          <div className="pf-studio-optimizer__title-row">
            <strong className="pf-studio-optimizer__title">
              스튜디오 동선 최적화 · 관찰 맞춤 레이어 · RPE 에너지 곡선 · Verify AI · 5대 테마 각도
            </strong>
            <PfAiStatusBadge
              kind={safetyReport.allPassed ? 'auto-draft' : 'review-pending'}
            >
              {safetyReport.summaryBadgeKo}
            </PfAiStatusBadge>
          </div>
          <span className="pf-studio-optimizer__meta">
            {transitionAnalysis.summaryKo} · {layerAdvice.summaryKo}
          </span>
          <span className="pf-studio-optimizer__submeta">
            {pacingCurve.pacingVerdictKo}
          </span>
        </div>
        <div
          className="pf-studio-optimizer__actions"
          role="group"
          aria-label="동선·레이어·컨셉·대본 실행 도구"
        >
          {transitionAnalysis.potentialSavingsScore > 0 && (
            <PfButton
              variant="secondary"
              className="pf-studio-optimizer__btn"
              onClick={() => {
                const nextSteps = suggestTransitionOptimizedOrder(steps, exercisesById);
                onApplySteps(
                  nextSteps,
                  `잠긴 동작과 구간을 유지한 채 기구·체위 전환 부하를 ${transitionAnalysis.potentialSavingsScore}점 줄이도록 순서를 정돈했습니다.`,
                );
              }}
            >
              전환 동선 최적화 적용 (-{transitionAnalysis.potentialSavingsScore}점)
            </PfButton>
          )}
          {layerAdvice.changedCount > 0 && (
            <PfButton
              variant="secondary"
              className="pf-studio-optimizer__btn"
              onClick={() => {
                const nextSteps = applyRecommendedLayersToSteps(steps, layerAdvice.advices);
                onApplySteps(
                  nextSteps,
                  `관찰 메모·목표에 맞춰 ${layerAdvice.changedCount}개 동작의 권장 레이어를 반영했습니다.`,
                );
              }}
            >
              맞춤 레이어 자동 배정 ({layerAdvice.changedCount}개)
            </PfButton>
          )}
          <PfButton
            variant="secondary"
            className="pf-studio-optimizer__btn"
            aria-expanded={showFreshAngles}
            aria-controls={freshAnglesRegionId}
            onClick={() => setShowFreshAngles((prev) => !prev)}
          >
            {showFreshAngles ? '5대 테마 각도 접기' : '5대 수업 컨셉 리믹스 (5 Angles)'}
          </PfButton>
          <PfButton
            variant="secondary"
            className="pf-studio-optimizer__btn"
            aria-expanded={showScript}
            aria-controls={voiceScriptRegionId}
            onClick={() => setShowScript((prev) => !prev)}
          >
            {showScript ? '티칭 대본 접기' : `타임코드 티칭 대본 보기 (${voiceScript.segments.length}구간)`}
          </PfButton>
        </div>
      </div>
      {showFreshAngles && (
        <div
          id={freshAnglesRegionId}
          role="region"
          aria-label="5대 수업 컨셉 리믹스 제안"
          data-testid="fresh-class-angles-list"
          className="pf-studio-optimizer__angles-list"
        >
          {freshAngles.map((angle) => (
            <div key={angle.id} className="pf-studio-optimizer__angle-card">
              <div className="pf-studio-optimizer__angle-head">
                <PfBadge tone="sage">{angle.badgeKo}</PfBadge>
                <strong>[{angle.badgeKo}] {angle.angleTitleKo}</strong>
              </div>
              <span className="pf-studio-optimizer__angle-subtitle">
                부제 제안: {angle.suggestedSubtitleKo}
              </span>
              <span className="pf-studio-optimizer__angle-hook">
                큐 훅: {angle.teachingHookKo}
              </span>
            </div>
          ))}
        </div>
      )}
      {showScript && (
        <pre
          id={voiceScriptRegionId}
          role="region"
          aria-label="타임코드 티칭 대본 미리보기"
          tabIndex={0}
          data-testid="instructor-voice-script-preview"
          className="pf-studio-optimizer__script-pre"
        >
          {voiceScript.fullTextKo}
        </pre>
      )}
    </section>
  );
};
