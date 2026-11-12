import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import type { PilatesExercise } from '../../types/pilates';
import {
  ATELIER_QUICK_START_RECIPES,
  buildQuickStartRecipePayload,
  type QuickStartRecipe,
  type QuickStartSequencePayload,
} from '../../utils/atelierQuickStart';
import { SpringVisualPills } from '../SpringVisualPills';

export interface AtelierQuickStartGalleryProps {
  readonly exercises: readonly PilatesExercise[];
  readonly onApplyQuickRecipe: (payload: QuickStartSequencePayload) => void;
}

export const AtelierQuickStartGallery: React.FC<AtelierQuickStartGalleryProps> = ({
  exercises,
  onApplyQuickRecipe,
}) => {
  const handleStartRecipe = (recipe: QuickStartRecipe) => {
    onApplyQuickRecipe(buildQuickStartRecipePayload(recipe, exercises));
  };

  return (
    <section
      className="pf-quickstart-gallery"
      aria-label="원클릭 추천 클래스 갤러리"
      data-testid="atelier-quickstart-gallery"
    >
      <div className="pf-quickstart-gallery__header">
        <div>
          <span className="pf-quickstart-gallery__kicker">
            <Sparkles size={13} aria-hidden="true" /> 1-CLICK ATELIER RECIPES
          </span>
          <h2 className="pf-quickstart-gallery__title">
            복잡한 조건 설정 없이, 카드 한 번 눌러 바로 시작하세요
          </h2>
          <p className="pf-quickstart-gallery__subtitle">
            기구·시간·부위 밸런스가 맞춰진 시퀀스가 즉시 열리며, 담긴 동작은 언제든 자유롭게 바꾸실 수 있어요.
          </p>
        </div>
      </div>

      <div className="pf-quickstart-grid">
        {ATELIER_QUICK_START_RECIPES.map((recipe) => (
          <article
            key={recipe.id}
            className="pf-quickstart-card"
            data-testid={`quickstart-card-${recipe.id}`}
          >
            <div className="pf-quickstart-card__art">
              <img src={recipe.imageSrc} alt={`${recipe.titleKo} 3D 스튜디오 기구 이미지`} loading="lazy" />
              <span className="pf-quickstart-card__duration-pill">
                {recipe.durationMinutes}분 완성
              </span>
              <span className="pf-quickstart-card__level-pill">Lv.{recipe.level}</span>
            </div>
            <div className="pf-quickstart-card__body">
              <h3>{recipe.titleKo}</h3>
              <div className="pf-class-badges-strip" style={{ margin: '2px 0 6px' }}>
                <span className="pf-studio3d-chip is-muscle" style={{ fontSize: '0.7rem' }}>
                  ● {recipe.muscleFocusKo}
                </span>
                <SpringVisualPills springs={recipe.springs} />
              </div>
              <p className="pf-quickstart-card__desc">{recipe.descKo}</p>
              <span className="pf-quickstart-card__flow">{recipe.flowLabelKo}</span>
              <button
                type="button"
                className="pf-quickstart-card__cta"
                data-testid={`quickstart-apply-${recipe.id}`}
                aria-label={`${recipe.titleKo} 바로 시작`}
                onClick={() => handleStartRecipe(recipe)}
              >
                바로 시작 <ArrowRight size={15} aria-hidden="true" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
