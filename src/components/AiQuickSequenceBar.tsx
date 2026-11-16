import React, { useState } from 'react';
import { RefreshCw, ShieldCheck, Sparkles, Wand2 } from 'lucide-react';
import {
  BODY_CAUTION_META,
  composeAiSmartSequence,
  STUDIO_AI_QUICK_RECIPES,
  type BodyCautionArea,
  type ComposedAiSequenceResult,
  type StudioQuickRecipe,
} from '../utils/aiNaturalSequenceComposer';
import { getActiveSequencePlanningCriteria, usePilatesStore } from '../store/usePilatesStore';

export interface AiQuickSequenceBarProps {
  onApplied: (result: ComposedAiSequenceResult) => void;
  onError: (message: string) => void;
}

const CAUTION_KEYS: readonly BodyCautionArea[] = ['lower-back', 'knee', 'wrist', 'neck'];

export const AiQuickSequenceBar: React.FC<AiQuickSequenceBarProps> = ({ onApplied, onError }) => {
  const [prompt, setPrompt] = useState('');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [cautions, setCautions] = useState<BodyCautionArea[]>([]);
  const [seed, setSeed] = useState(0);
  const [lastSummary, setLastSummary] = useState<string | null>(null);

  const runCompose = (overridePrompt?: string, nextSeed = 0, extraCautions = cautions) => {
    const state = usePilatesStore.getState();
    const criteria = getActiveSequencePlanningCriteria(state);
    const effectivePrompt =
      (overridePrompt ?? prompt).trim() || '전신 균형과 호흡 흐름이 자연스러운 정규 수업으로 짜줘';

    try {
      const composed = composeAiSmartSequence({
        prompt: effectivePrompt,
        exercises: state.exercises,
        ownedEquipment: state.ownedEquipment,
        ownedProps: state.ownedProps,
        historyLogs: state.historyLogs,
        defaultApparatus: criteria.apparatus,
        defaultLevel: criteria.level,
        defaultTargetMinutes: state.activeTargetMinutes,
        extraCautions,
        seed: nextSeed,
      });

      setSeed(nextSeed);
      setLastSummary(composed.summaryKo);
      onApplied(composed);
    } catch (err) {
      onError(err instanceof Error ? err.message : '수업 자동 구성을 완료하지 못했습니다.');
    }
  };

  const handleRecipeClick = (recipe: StudioQuickRecipe) => {
    const nextCautions = recipe.defaultCautions ? [...recipe.defaultCautions] : cautions;
    if (recipe.defaultCautions) {
      setCautions(nextCautions);
    }
    setSelectedRecipeId(recipe.id);
    setPrompt(recipe.promptTemplateKo);
    runCompose(recipe.promptTemplateKo, 0, nextCautions);
  };

  const toggleCaution = (area: BodyCautionArea) => {
    setCautions((prev) =>
      prev.includes(area) ? prev.filter((item) => item !== area) : [...prev, area],
    );
  };

  return (
    <section
      className="pf-ai-quick-bar"
      data-testid="ai-quick-sequence-bar"
      aria-label="AI 맞춤 수업 자동 구성"
    >
      <div className="pf-ai-quick-bar__header">
        <div className="pf-ai-quick-bar__title-wrap">
          <span className="pf-ai-quick-bar__badge" aria-hidden="true">
            <Sparkles size={14} /> AI 자동 구성
          </span>
          <strong>
            원하는 수업 느낌만 적거나 테마를 누르면 준비·메인·마무리를 한 번에 짜드려요
          </strong>
        </div>

        <details className="pf-ai-caution-disclosure" data-testid="ai-caution-disclosure">
          <summary>
            <ShieldCheck size={14} aria-hidden="true" />
            <span>
              보호 부위{cautions.length > 0 ? ` · ${cautions.length}곳 선택됨` : ' (선택)'}
            </span>
          </summary>
          <div className="pf-ai-caution-popover" role="group" aria-label="회원 보호 부위 선택">
            {CAUTION_KEYS.map((key) => {
              const active = cautions.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  className={`pf-ai-caution-chip ${active ? 'is-active' : ''}`}
                  aria-pressed={active}
                  onClick={() => toggleCaution(key)}
                >
                  {BODY_CAUTION_META[key].labelKo}
                </button>
              );
            })}
          </div>
        </details>
      </div>

      <form
        className="pf-ai-quick-bar__form"
        onSubmit={(event) => {
          event.preventDefault();
          setSelectedRecipeId(null);
          runCompose(prompt, 0, cautions);
        }}
      >
        <input
          type="text"
          className="pf-ai-quick-bar__input"
          aria-label="AI 수업 자동 구성 프롬프트"
          data-testid="ai-quick-prompt-input"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="예: 리포머 초급 50분, 허리 부담 없이 코어와 둔근 위주로 짜줘"
          maxLength={180}
        />
        <button
          type="submit"
          className="pf-ai-quick-bar__submit"
          data-testid="ai-quick-compose-btn"
        >
          <Wand2 size={16} aria-hidden="true" />
          <span>자동 완성</span>
        </button>
        {lastSummary && (
          <button
            type="button"
            className="pf-ai-quick-bar__shuffle"
            data-testid="ai-quick-shuffle-btn"
            onClick={() => runCompose(prompt, seed + 1, cautions)}
          >
            <RefreshCw size={15} aria-hidden="true" />
            <span>다른 조합</span>
          </button>
        )}
      </form>

      <div className="pf-ai-quick-bar__recipes" role="group" aria-label="원클릭 수업 테마 추천">
        {STUDIO_AI_QUICK_RECIPES.map((recipe) => (
          <button
            key={recipe.id}
            type="button"
            className={`pf-ai-recipe-chip ${selectedRecipeId === recipe.id ? 'is-active' : ''}`}
            data-testid={`ai-recipe-${recipe.id}`}
            aria-pressed={selectedRecipeId === recipe.id}
            onClick={() => handleRecipeClick(recipe)}
            title={recipe.subtitleKo}
          >
            {recipe.labelKo}
          </button>
        ))}
      </div>

      {lastSummary && (
        <div className="pf-ai-quick-bar__summary" data-testid="ai-quick-summary" role="status">
          <span>{lastSummary}</span>
          <div
            className="pf-ai-quick-bar__refinements"
            role="group"
            aria-label="AI 시퀀스 원탭 미세 조정"
          >
            <button
              type="button"
              className="pf-ai-refine-chip"
              onClick={() => {
                const nextPrompt = `${prompt || '정규 수업'} · 초급 완화 중심으로 부드럽게`;
                setPrompt(nextPrompt);
                runCompose(nextPrompt, 0, cautions);
              }}
            >
              초급 완화로 조정
            </button>
            <button
              type="button"
              className="pf-ai-refine-chip"
              onClick={() => {
                const nextPrompt = `${prompt || '정규 수업'} · 심부 코어와 복부 집중 강화`;
                setPrompt(nextPrompt);
                runCompose(nextPrompt, 0, cautions);
              }}
            >
              코어 비중 높이기
            </button>
            <button
              type="button"
              className="pf-ai-refine-chip"
              onClick={() => {
                const nextPrompt = `${prompt || '정규 수업'} · 척추 분절과 스트레칭 이완 위주`;
                setPrompt(nextPrompt);
                runCompose(nextPrompt, 0, cautions);
              }}
            >
              이완·가동성 중심
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
