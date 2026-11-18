import React, { useRef, useState } from 'react';
import { RefreshCw, ShieldCheck, Wand2 } from 'lucide-react';
import {
  BODY_CAUTION_META,
  composeAiSmartSequence,
  STUDIO_AI_QUICK_RECIPES,
  type BodyCautionArea,
  type ComposedAiSequenceResult,
  type StudioQuickRecipe,
} from '../utils/aiNaturalSequenceComposer';
import { isImeComposing } from '../utils/imeGuard';
import { getActiveSequencePlanningCriteria, usePilatesStore } from '../store/usePilatesStore';

export interface AiQuickSequenceBarProps {
  onApplied: (result: ComposedAiSequenceResult) => void;
  onError: (message: string) => void;
  compact?: boolean;
}

const CAUTION_KEYS: readonly BodyCautionArea[] = ['lower-back', 'knee', 'wrist', 'neck'];

export const AiQuickSequenceBar: React.FC<AiQuickSequenceBarProps> = ({
  onApplied,
  onError,
  compact = false,
}) => {
  const [prompt, setPrompt] = useState('');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [cautions, setCautions] = useState<BodyCautionArea[]>([]);
  const [seed, setSeed] = useState(0);
  const [lastSummary, setLastSummary] = useState<string | null>(null);
  const cautionDetailsRef = useRef<HTMLDetailsElement>(null);

  const closeCautionDisclosure = () => {
    if (cautionDetailsRef.current) {
      cautionDetailsRef.current.open = false;
    }
  };

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
      closeCautionDisclosure();
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

  const bodyContent = (
    <>
      <div className="pf-ai-quick-bar__top">
        <form
          className="pf-ai-quick-bar__form"
          onSubmit={(event) => {
            event.preventDefault();
            setSelectedRecipeId(null);
            runCompose(prompt, 0, cautions);
          }}
        >
          <div className="pf-ai-quick-bar__field">
            <Wand2
              size={16}
              strokeWidth={1.5}
              className="pf-ai-quick-bar__lead-icon"
              aria-hidden="true"
            />
            <input
              type="text"
              className="pf-ai-quick-bar__input"
              aria-label="AI 수업 자동 구성 프롬프트"
              data-testid="ai-quick-prompt-input"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && isImeComposing(event)) {
                  event.preventDefault();
                }
              }}
              placeholder="원하는 수업을 적거나 아래 테마를 선택하세요 (예: 리포머 초급 50분 코어)"
              maxLength={180}
            />
          </div>
          <button
            type="submit"
            className="pf-ai-quick-bar__submit"
            data-testid="ai-quick-compose-btn"
          >
            <span>자동 완성</span>
          </button>
          {lastSummary && (
            <button
              type="button"
              className="pf-ai-quick-bar__shuffle"
              data-testid="ai-quick-shuffle-btn"
              onClick={() => runCompose(prompt, seed + 1, cautions)}
            >
              <RefreshCw size={15} strokeWidth={1.5} aria-hidden="true" />
              <span>다른 조합</span>
            </button>
          )}
        </form>

        <details
          ref={cautionDetailsRef}
          className="pf-ai-caution-disclosure"
          data-testid="ai-caution-disclosure"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              event.currentTarget.open = false;
              event.currentTarget.querySelector('summary')?.focus();
            }
          }}
        >
          <summary>
            <ShieldCheck size={15} strokeWidth={1.5} aria-hidden="true" />
            <span>보호 부위{cautions.length > 0 ? ` · ${cautions.length}곳` : ''}</span>
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
              data-testid="ai-quick-refine-easy"
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
              data-testid="ai-quick-refine-core"
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
              data-testid="ai-quick-refine-mobility"
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
    </>
  );

  if (compact && !lastSummary) {
    return (
      <details
        className="pf-ai-quick-bar pf-ai-quick-bar--collapsed"
        data-testid="ai-quick-sequence-bar"
        aria-label="AI 맞춤 수업 자동 구성"
      >
        <summary className="pf-ai-quick-bar__collapsed-summary">
          <Wand2 size={15} strokeWidth={1.5} aria-hidden="true" />
          <span>한 줄 설명·추천 테마로 수업 자동 채우기</span>
          <small>전신 · 코어 · 하체 · 이완</small>
        </summary>
        <div className="pf-ai-quick-bar__collapsed-body">{bodyContent}</div>
      </details>
    );
  }

  return (
    <section
      className={`pf-ai-quick-bar ${compact ? 'is-compact' : ''}`.trim()}
      data-testid="ai-quick-sequence-bar"
      aria-label="AI 맞춤 수업 자동 구성"
    >
      {bodyContent}
    </section>
  );
};
