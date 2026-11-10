import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import type { ApparatusType, DifficultyLevel, PilatesExercise, SequenceStep } from '../../types/pilates';
import type { StrengthenArea } from '../../types/freeAiAssistant';
import {
  buildLocalClassDraft,
  editableStepsToSequenceSteps,
} from '../../utils/freeAiAssistantEngine';

export interface QuickStartRecipe {
  readonly id: string;
  readonly titleKo: string;
  readonly descKo: string;
  readonly flowLabelKo: string;
  readonly imageSrc: string;
  readonly durationMinutes: number;
  readonly level: DifficultyLevel;
  readonly apparatus: ApparatusType;
  readonly strengthenAreas: StrengthenArea[];
}

export const ATELIER_QUICK_START_RECIPES: ReadonlyArray<QuickStartRecipe> = [
  {
    id: 'reformer-core-50',
    titleKo: '50분 리포머 코어·골반 정석',
    descKo: '호흡 정렬부터 풋워크·코어·스트랩 이완까지 군더더기 없이 이어지는 대표 그룹 시퀀스',
    flowLabelKo: '준비 8분 → 본운동 34분 → 마무리 8분',
    imageSrc: '/images/atelier-v2/reformer-studio-3d.png',
    durationMinutes: 50,
    level: '1.5',
    apparatus: 'reformer',
    strengthenAreas: ['core', 'glute-lower'],
  },
  {
    id: 'reformer-express-30',
    titleKo: '30분 점심 순환 익스프레스',
    descKo: '기구 전환을 최소화해 짧고 밀도 있게 전신 활력을 깨우는 30분 압축 플로우',
    flowLabelKo: '준비 5분 → 본운동 20분 → 마무리 5분',
    imageSrc: '/images/atelier-v2/cadillac-studio-3d.png',
    durationMinutes: 30,
    level: '1.0',
    apparatus: 'reformer',
    strengthenAreas: ['full-body'],
  },
  {
    id: 'chair-glute-50',
    titleKo: '체어 하체·힙 밸런스 집중',
    descKo: '페달 저항과 지지면 컨트롤로 중둔근·하지 정렬과 중심 잡기를 깊게 다루는 수업',
    flowLabelKo: '준비 8분 → 하체·코어 34분 → 마무리 8분',
    imageSrc: '/images/atelier-v2/chair-studio-3d.png',
    durationMinutes: 50,
    level: '1.5',
    apparatus: 'chair',
    strengthenAreas: ['glute-lower', 'core'],
  },
  {
    id: 'barrel-mobility-50',
    titleKo: '바렐·매트 흉추 개방 회복',
    descKo: '굽은 어깨와 뻣뻣한 고관절을 부드럽게 열어 주는 가동성·호흡 중심 힐링 수업',
    flowLabelKo: '호흡 10분 → 분절·신전 30분 → 이완 10분',
    imageSrc: '/images/atelier-v2/barrel-studio-3d.png',
    durationMinutes: 50,
    level: '1.0',
    apparatus: 'barrel',
    strengthenAreas: ['mobility-rehab', 'posture-upper'],
  },
];

export interface AtelierQuickStartGalleryProps {
  readonly exercises: readonly PilatesExercise[];
  readonly onApplyQuickRecipe: (payload: {
    readonly title: string;
    readonly subtitle: string;
    readonly targetMinutes: number;
    readonly level: DifficultyLevel;
    readonly apparatus: ApparatusType | 'mixed';
    readonly steps: SequenceStep[];
    readonly recipeTitleKo: string;
  }) => void;
}

export const AtelierQuickStartGallery: React.FC<AtelierQuickStartGalleryProps> = ({
  exercises,
  onApplyQuickRecipe,
}) => {
  const handleStartRecipe = (recipe: QuickStartRecipe) => {
    let draft = buildLocalClassDraft(
      {
        durationMinutes: recipe.durationMinutes,
        theme: recipe.titleKo,
        strengthenAreas: recipe.strengthenAreas,
        level: recipe.level,
        apparatus: recipe.apparatus,
      },
      exercises,
    );

    if (draft.steps.length === 0) {
      draft = buildLocalClassDraft(
        {
          durationMinutes: recipe.durationMinutes,
          theme: recipe.titleKo,
          strengthenAreas: recipe.strengthenAreas,
          level: '2.0',
          apparatus: 'mixed',
        },
        exercises,
      );
    }

    onApplyQuickRecipe({
      title: draft.title,
      subtitle: draft.subtitle,
      targetMinutes: draft.targetMinutes,
      level: draft.level,
      apparatus: draft.apparatus,
      steps: editableStepsToSequenceSteps(draft.steps),
      recipeTitleKo: recipe.titleKo,
    });
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
