import {
  getEquipmentFamilies,
  getExerciseEquipment,
  PROP_IDS,
} from '../data/equipmentCatalog';
import { APPARATUS_LABELS } from '../data/pilatesCatalog';
import type { ApparatusType, DifficultyLevel, PilatesExercise, SequenceStep } from '../types/pilates';
import type { StrengthenArea } from '../types/freeAiAssistant';
import { isExerciseAuthoringEligible } from './exerciseAuthoring';
import {
  buildLocalClassDraft,
  editableStepsToSequenceSteps,
  strengthenAreaToFocusPreset,
} from './freeAiAssistantEngine';
import { generateOptimal50MinSequence } from './sequenceEngine';

export interface QuickStartRecipe {
  readonly id: string;
  readonly titleKo: string;
  readonly descKo: string;
  readonly flowLabelKo: string;
  readonly imageSrc: string;
  readonly legacyStudioFallbackSrc: string;
  readonly springs: string;
  readonly muscleFocusKo: string;
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
    imageSrc: '/motion-studio3d/footwork-peak.png',
    legacyStudioFallbackSrc: '/images/atelier-v2/reformer-studio-3d.png',
    springs: '2R 1B',
    muscleFocusKo: '복횡근 · 대퇴사두근 · 골반 중립',
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
    imageSrc: '/motion-studio3d/bridge-peak.png',
    legacyStudioFallbackSrc: '/images/atelier-v2/cadillac-studio-3d.png',
    springs: '1R 1B',
    muscleFocusKo: '대둔근 · 심부 코어 · 척추 분절',
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
    imageSrc: '/motion-studio3d/chair-goingup-peak.png',
    legacyStudioFallbackSrc: '/images/atelier-v2/chair-studio-3d.png',
    springs: '1R 1Y (페달)',
    muscleFocusKo: '중둔근 · 대둔근 · 하지 수직 정렬',
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
    imageSrc: '/motion-studio3d/barrel-swan-peak.png',
    legacyStudioFallbackSrc: '/images/atelier-v2/barrel-studio-3d.png',
    springs: '래더 고정',
    muscleFocusKo: '흉추 신전근 · 외복사근 · 측면 사슬',
    durationMinutes: 50,
    level: '1.0',
    apparatus: 'barrel',
    strengthenAreas: ['mobility-rehab', 'posture-upper'],
  },
];

export interface QuickStartSequencePayload {
  readonly title: string;
  readonly subtitle: string;
  readonly targetMinutes: number;
  readonly level: DifficultyLevel;
  readonly apparatus: ApparatusType | 'mixed';
  readonly steps: SequenceStep[];
  readonly recipeTitleKo: string;
}

export function buildQuickStartRecipePayload(
  recipe: QuickStartRecipe,
  exercises: readonly PilatesExercise[],
): QuickStartSequencePayload {
  const reviewedDraft = buildLocalClassDraft(
    {
      durationMinutes: recipe.durationMinutes,
      theme: recipe.titleKo,
      strengthenAreas: recipe.strengthenAreas,
      level: recipe.level,
      apparatus: recipe.apparatus,
    },
    exercises,
  );

  if (reviewedDraft.steps.length > 0) {
    return {
      title: reviewedDraft.title,
      subtitle: reviewedDraft.subtitle,
      targetMinutes: reviewedDraft.targetMinutes,
      level: reviewedDraft.level,
      apparatus: reviewedDraft.apparatus,
      steps: editableStepsToSequenceSteps(reviewedDraft.steps),
      recipeTitleKo: recipe.titleKo,
    };
  }

  const candidateSpecs: ReadonlyArray<{
    readonly apparatus: ApparatusType | 'mixed';
    readonly level: DifficultyLevel;
    readonly allowedFamilies?: readonly ApparatusType[];
  }> = [
    { apparatus: recipe.apparatus, level: recipe.level },
    { apparatus: recipe.apparatus, level: '2.0' },
    {
      apparatus: 'mixed',
      level: recipe.level === '1.0' ? '1.5' : recipe.level,
      allowedFamilies: [recipe.apparatus, 'mat'],
    },
    { apparatus: 'mixed', level: '2.0' },
  ];

  const allPreferredProps = ['none' as const, ...PROP_IDS.filter((id) => id !== 'none')];
  const mutableCatalog = [...exercises];

  for (const spec of candidateSpecs) {
    const eligible = mutableCatalog.filter(
      (ex) =>
        isExerciseAuthoringEligible(ex) &&
        (spec.allowedFamilies
          ? spec.allowedFamilies.includes(ex.apparatus)
          : spec.apparatus === 'mixed' || ex.apparatus === spec.apparatus) &&
        Number(ex.level) <= Number(spec.level),
    );
    if (eligible.length === 0) continue;

    const eqFrequency = new Map<string, number>();
    for (const ex of eligible) {
      const info = getExerciseEquipment(ex);
      if (!info.requirementsKnown) continue;
      for (const eqId of info.requiredEquipment) {
        eqFrequency.set(eqId, (eqFrequency.get(eqId) ?? 0) + 1);
      }
    }
    const sortedEqIds = [...eqFrequency.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([eqId]) => eqId);
    if (sortedEqIds.length === 0) continue;

    const candidateEqSets = spec.allowedFamilies
      ? [sortedEqIds, [sortedEqIds[0]!]]
      : sortedEqIds.length > 1
        ? [[sortedEqIds[0]!], sortedEqIds]
        : [sortedEqIds];

    for (const eqSet of candidateEqSets) {
      try {
        const steps = generateOptimal50MinSequence(
          {
            apparatus: spec.apparatus,
            ownedApparatus: getEquipmentFamilies(eqSet),
            availableEquipment: eqSet,
            level: spec.level,
            focusPreset: strengthenAreaToFocusPreset(recipe.strengthenAreas[0]),
            preferredProps: allPreferredProps,
            excludeDaysWindow: 0,
            targetMinutes: recipe.durationMinutes,
            defaultLayer:
              spec.level === '1.0' ? 'easy' : spec.level === '2.0' ? 'hard' : 'standard',
          },
          eligible,
          [],
        );

        if (steps.length > 0) {
          const apparatusTitle =
            spec.apparatus === 'mixed'
              ? spec.allowedFamilies
                ? spec.allowedFamilies.map((f) => APPARATUS_LABELS[f]?.short ?? f).join('·')
                : '복합 기구'
              : (APPARATUS_LABELS[spec.apparatus]?.short ?? spec.apparatus);
          return {
            title: `[${apparatusTitle}] ${recipe.titleKo} (${recipe.durationMinutes}분 · Lv.${spec.level})`.slice(
              0,
              150,
            ),
            subtitle: `${recipe.descKo} · ${steps.length}블록 구성`.slice(0, 240),
            targetMinutes: recipe.durationMinutes,
            level: spec.level,
            apparatus: spec.apparatus,
            steps,
            recipeTitleKo: recipe.titleKo,
          };
        }
      } catch {
        // Try next equipment / level candidate cleanly.
      }
    }
  }

  return {
    title: reviewedDraft.title,
    subtitle: reviewedDraft.subtitle,
    targetMinutes: reviewedDraft.targetMinutes,
    level: recipe.level,
    apparatus: recipe.apparatus,
    steps: [],
    recipeTitleKo: recipe.titleKo,
  };
}
