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
import {
  type FreshIdeaAngleId,
  type FreshIdeaChannelId,
  expandFreshClassAngleDraft,
  generateFreshClassAngles,
} from '../../utils/freshClassAnglesGenerator';
import { generateInstructorVoiceScript } from '../../utils/instructorVoiceScriptGenerator';
import {
  applyRecommendedLayersToSteps,
  buildMemberConditionLayerAdvice,
} from '../../utils/memberConditionLayerAdvisor';
import { isRestStep } from '../../utils/sequenceEngine';
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
  readonly onApplyAngleConcept?: (
    suggestedTitleKo: string,
    suggestedSubtitleKo: string,
    noticeMessage: string,
  ) => void;
}

const DRAFT_CHANNELS: ReadonlyArray<{ id: FreshIdeaChannelId; labelKo: string }> = [
  { id: 'class-intro-script', labelKo: '수업 오프닝 멘트' },
  { id: 'member-notice', labelKo: '회원 안내문' },
  { id: 'studio-note', labelKo: '강사 기획 노트' },
];

export const StudioFlowOptimizerPanel: React.FC<StudioFlowOptimizerPanelProps> = ({
  sequenceTitle,
  steps,
  exercisesById,
  criteria,
  reformerBrand,
  onApplySteps,
  onApplyAngleConcept,
}) => {
  const [showScript, setShowScript] = useState(false);
  const [showFreshAngles, setShowFreshAngles] = useState(false);
  const [selectedAngleId, setSelectedAngleId] = useState<FreshIdeaAngleId | null>(null);
  const [selectedChannelId, setSelectedChannelId] =
    useState<FreshIdeaChannelId>('class-intro-script');
  const freshAnglesRegionId = useId();
  const voiceScriptRegionId = useId();
  const draftExpansionRegionId = useId();

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

  const exerciseCount = useMemo(
    () => steps.filter((st) => !isRestStep(st)).length,
    [steps],
  );

  const activeAngle = useMemo(
    () => freshAngles.find((a) => a.id === selectedAngleId) ?? null,
    [freshAngles, selectedAngleId],
  );

  const expandedDraft = useMemo(
    () =>
      activeAngle
        ? expandFreshClassAngleDraft(activeAngle, selectedChannelId, {
            sequenceTitle,
            targetMinutes: criteria.targetMinutes || 50,
            exerciseCount,
          })
        : null,
    [activeAngle, selectedChannelId, sequenceTitle, criteria.targetMinutes, exerciseCount],
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
          {freshAngles.map((angle) => {
            const isSelected = selectedAngleId === angle.id;
            return (
              <div
                key={angle.id}
                data-testid={`fresh-angle-card-${angle.id}`}
                className="pf-studio-optimizer__angle-card"
              >
                <div className="pf-studio-optimizer__angle-head">
                  <PfBadge tone="sage">{angle.badgeKo}</PfBadge>
                  <strong>
                    [{angle.badgeKo}] {angle.angleTitleKo}
                  </strong>
                </div>
                <p className="pf-studio-optimizer__meta">
                  {angle.angleExpansionKo}
                </p>
                <span className="pf-studio-optimizer__angle-subtitle">
                  부제 제안: {angle.suggestedSubtitleKo}
                </span>
                <span className="pf-studio-optimizer__angle-hook">
                  큐 훅: {angle.teachingHookKo}
                </span>
                {angle.storyStructure && (
                  <div
                    className="pf-studio-optimizer__meta"
                    data-testid="fresh-angle-story-structure"
                  >
                    <strong>3-Beat 스토리 구조:</strong> 1) 배경: {angle.storyStructure.setupKo} →
                    2) 전환점: {angle.storyStructure.frictionKo} → 3) 핵심 레슨:{' '}
                    {angle.storyStructure.lessonKo}
                  </div>
                )}
                {angle.verifiedSourceMetricsKo && (
                  <div
                    className="pf-studio-optimizer__meta"
                    data-testid="fresh-angle-verified-metrics"
                  >
                    <strong>시퀀스 실측 근거:</strong> {angle.verifiedSourceMetricsKo.join(' · ')}
                    {angle.evidencePlaceholdersKo && (
                      <span>
                        {' '}
                        · 추가 관찰 지표: {angle.evidencePlaceholdersKo.join(' ')}
                      </span>
                    )}
                  </div>
                )}
                {angle.playbookStepsKo && (
                  <ol
                    className="pf-studio-optimizer__meta"
                    data-testid="fresh-angle-playbook-steps"
                    style={{ margin: 0, paddingLeft: '18px' }}
                  >
                    {angle.playbookStepsKo.map((stepText) => (
                      <li key={stepText}>{stepText}</li>
                    ))}
                  </ol>
                )}
                <div className="pf-studio-optimizer__actions">
                  {onApplyAngleConcept && (
                    <PfButton
                      variant="secondary"
                      className="pf-studio-optimizer__btn"
                      data-testid={`apply-fresh-angle-${angle.id}`}
                      onClick={() => {
                        onApplyAngleConcept(
                          angle.suggestedTitleKo,
                          angle.suggestedSubtitleKo,
                          `‘${angle.badgeKo}’ 렌즈의 제목·부제를 현재 시퀀스에 반영했습니다.`,
                        );
                      }}
                    >
                      이 컨셉으로 수업 제목·부제 적용
                    </PfButton>
                  )}
                  <PfButton
                    variant="secondary"
                    className="pf-studio-optimizer__btn"
                    pressed={isSelected}
                    aria-expanded={isSelected}
                    aria-controls={draftExpansionRegionId}
                    data-testid={`expand-fresh-angle-draft-${angle.id}`}
                    onClick={() =>
                      setSelectedAngleId((prev) => (prev === angle.id ? null : angle.id))
                    }
                  >
                    {isSelected ? '채널별 초안 닫기' : '채널별 초안 확장 (Mode B)'}
                  </PfButton>
                </div>
              </div>
            );
          })}
          {expandedDraft && activeAngle && (
            <div
              id={draftExpansionRegionId}
              role="region"
              aria-label="선택한 컨셉 각도의 채널별 확장 초안"
              data-testid="fresh-angle-draft-expansion"
              className="pf-studio-optimizer__angle-card"
            >
              <div className="pf-studio-optimizer__header">
                <strong className="pf-studio-optimizer__title">
                  {expandedDraft.headlineKo}
                </strong>
                <div
                  role="group"
                  aria-label="초안 채널 선택"
                  className="pf-studio-optimizer__actions"
                >
                  {DRAFT_CHANNELS.map((ch) => (
                    <PfButton
                      key={ch.id}
                      variant="secondary"
                      className="pf-studio-optimizer__btn"
                      pressed={selectedChannelId === ch.id}
                      onClick={() => setSelectedChannelId(ch.id)}
                    >
                      {ch.labelKo}
                    </PfButton>
                  ))}
                </div>
              </div>
              <pre
                tabIndex={0}
                className="pf-studio-optimizer__script-pre"
                data-testid="fresh-angle-expanded-draft-text"
              >
                {expandedDraft.bodyKo}
              </pre>
            </div>
          )}
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
