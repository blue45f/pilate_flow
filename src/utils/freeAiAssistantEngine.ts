import {
  equipmentRequirementsSatisfied,
  getExerciseEquipment,
} from '../data/equipmentCatalog';
import {
  APPARATUS_LABELS,
  CANONICAL_BLOCKS,
  POSITION_LABELS,
  SPINAL_PLANE_LABELS,
} from '../data/pilatesCatalog';
import { inspectSensitiveHealthText } from './sensitiveHealthPrivacy';
export { inspectSensitiveHealthText } from './sensitiveHealthPrivacy';

export const UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER =
  '미검토 창작 동작 및 AI 제안은 안전성이나 운동·교정·치료 효과를 보장하지 않습니다. 실제 수업에 적용하기 전 강사가 대상자 상태, 기구·스프링 세팅, 동작 범위를 직접 검토해야 합니다.' as const;

import type {
  ClassDraftConditionsInput,
  EditableClassDraftResult,
  EditableDraftStepItem,
  EditableMovementIdeaResult,
  EditableMovementSearchResult,
  EditableSequenceComposeResult,
  MovementIdeaInput,
  MovementSearchAssistInput,
  MovementSearchRecommendationItem,
  P1MovementIdeaContract,
  P1ReusableBlockContract,
  P1ReusableBlockStepContract,
  SequenceComposeInput,
  StrengthenArea,
} from '../types/freeAiAssistant';
import type {
  ApparatusType,
  AutoGenerateCriteria,
  BodyPosition,
  ClassBlockCategory,
  ConditionTemplate,
  DifficultyLevel,
  ExerciseLayers,
  LayerMode,
  PilatesExercise,
  PropType,
  SequenceStep,
  SpinalPlane,
} from '../types/pilates';
import { isExerciseAutoEligible } from './exerciseReview';
import { extractSpringFromText, getMovementKey } from './sequenceEngine';

const CANONICAL_BLOCK_ORDER: readonly ClassBlockCategory[] = [
  'warmup',
  'footwork',
  'bridging',
  'core',
  'upper-body',
  'lower-body',
  'plank',
  'extension',
  'feet-in-straps',
  'cooldown',
] as const;

const STRENGTHEN_AREA_LABELS: Record<StrengthenArea, string> = {
  core: '코어·파워하우스 안정화',
  'glute-lower': '둔근·하지 정렬 강화',
  'posture-upper': '상체·흉추 신전 및 견갑 안정화',
  'mobility-rehab': '척추·고관절 가동성 및 정렬 회복',
  'full-body': '전신 협응·밸런스 통합',
};

const STRENGTHEN_AREA_CATEGORIES: Record<StrengthenArea, readonly ClassBlockCategory[]> = {
  core: ['core', 'plank', 'bridging'],
  'glute-lower': ['footwork', 'bridging', 'lower-body', 'feet-in-straps'],
  'posture-upper': ['upper-body', 'extension', 'plank'],
  'mobility-rehab': ['warmup', 'bridging', 'feet-in-straps', 'cooldown'],
  'full-body': [
    'footwork',
    'bridging',
    'core',
    'upper-body',
    'lower-body',
    'plank',
    'extension',
    'feet-in-straps',
  ],
};

const STRENGTHEN_AREA_MUSCLES: Record<StrengthenArea, readonly string[]> = {
  core: ['복횡근', '내·외복사근', '골반기저근', '다열근'],
  'glute-lower': ['대둔근', '중둔근', '햄스트링', '대퇴사두근', '내전근'],
  'posture-upper': ['중·하부 승모근', '전거근', '능형근', '후면 삼각근', '척추기립근'],
  'mobility-rehab': ['장요근', '다열근', '흉추 주위근', '둔근', '복횡근'],
  'full-body': ['복횡근', '둔근', '전거근', '척추기립근', '대퇴사두근'],
};

const BLOCK_DEFAULT_MUSCLES: Record<ClassBlockCategory, readonly string[]> = {
  warmup: ['횡격막', '복횡근', '골반기저근'],
  footwork: ['대퇴사두근', '가자미근', '비복근', '둔근'],
  bridging: ['대둔근', '햄스트링', '척추기립근', '복횡근'],
  core: ['복횡근', '복직근', '내·외복사근'],
  'upper-body': ['광배근', '능형근', '전거근', '삼각근'],
  'lower-body': ['중둔근', '대둔근', '대퇴사두근', '내전근'],
  plank: ['전거근', '복횡근', '둔근', '삼각근'],
  extension: ['척추기립근', '다열근', '중·하부 승모근', '대둔근'],
  'feet-in-straps': ['내전근', '햄스트링', '장요근', '복횡근'],
  cooldown: ['요방형근', '늑간근', '광배근', '고관절 외회전근'],
};

const BLOCK_LABELS_EN: Record<ClassBlockCategory, string> = {
  warmup: 'Warm-up & Breath',
  footwork: 'Footwork Alignment',
  bridging: 'Bridging & Articulation',
  core: 'Core Control',
  'upper-body': 'Upper Body & Scapular Flow',
  'lower-body': 'Lower Body & Glute Series',
  plank: 'Plank & Full-Body Integration',
  extension: 'Thoracic Extension',
  'feet-in-straps': 'Feet in Straps Mobility',
  cooldown: 'Cool-down & Decompression',
};

export interface ClassDraftEditPatch {
  title?: string;
  subtitle?: string;
  targetMinutes?: number;
  coachingSummary?: string;
  steps?: EditableDraftStepItem[];
  removeStepIds?: string[];
  reorderStepIds?: string[];
  stepUpdates?: Array<
    { stepId: string } & Partial<
      Pick<
        EditableDraftStepItem,
        'durationMin' | 'selectedLayer' | 'instructorNote' | 'blockCategory'
      >
    >
  >;
}

export interface MovementIdeaEditPatch {
  nameKo?: string;
  nameEn?: string;
  defaultDurationMin?: number;
  springs?: string;
  breathPattern?: string;
  cues?: string[];
  precautions?: string;
  layers?: Partial<ExerciseLayers>;
  variationRationale?: string;
  bodyPosition?: BodyPosition;
  spinalPlanes?: SpinalPlane[];
  props?: PropType[];
  targetMuscles?: string[];
}

export interface SequenceComposeEditPatch {
  title?: string;
  subtitle?: string;
  targetMinutes?: number;
  transitionSummary?: string;
  steps?: EditableDraftStepItem[];
  removeStepIds?: string[];
  reorderStepIds?: string[];
  stepUpdates?: Array<
    { stepId: string } & Partial<
      Pick<
        EditableDraftStepItem,
        'durationMin' | 'selectedLayer' | 'instructorNote' | 'blockCategory'
      >
    >
  >;
}

function clampTargetMinutes(minutes: number | undefined, fallback = 50): number {
  if (!Number.isFinite(minutes)) return fallback;
  return Math.min(120, Math.max(10, Math.round(minutes!)));
}

function clampStepDuration(durationMin: number | undefined, fallback = 4): number {
  if (!Number.isFinite(durationMin)) return fallback;
  const roundedHalf = Math.round(durationMin! * 2) / 2;
  return Math.min(60, Math.max(0.5, roundedHalf));
}

export function strengthenAreaToFocusPreset(
  area: StrengthenArea | undefined,
): AutoGenerateCriteria['focusPreset'] {
  switch (area) {
    case 'core':
      return 'core-sculpt';
    case 'glute-lower':
      return 'glute-lower';
    case 'posture-upper':
      return 'posture-upper';
    case 'mobility-rehab':
      return 'mobility-rehab';
    case 'full-body':
    default:
      return 'full-body';
  }
}

export function focusPresetToStrengthenArea(
  preset: AutoGenerateCriteria['focusPreset'] | undefined,
): StrengthenArea {
  switch (preset) {
    case 'core-sculpt':
      return 'core';
    case 'glute-lower':
      return 'glute-lower';
    case 'posture-upper':
      return 'posture-upper';
    case 'mobility-rehab':
      return 'mobility-rehab';
    case 'full-body':
    default:
      return 'full-body';
  }
}

function blockOrderIndex(category: ClassBlockCategory): number {
  const idx = CANONICAL_BLOCK_ORDER.indexOf(category);
  return idx >= 0 ? idx : 5;
}

function sectionRank(category: ClassBlockCategory): number {
  if (category === 'warmup') return 0;
  if (category === 'cooldown') return 2;
  return 1;
}

function formatApparatusTitle(apparatus: ApparatusType | 'mixed'): string {
  if (apparatus === 'mixed') return '복합 기구';
  return APPARATUS_LABELS[apparatus]?.short ?? apparatus;
}

/**
 * Scales step durations in 0.5-minute increments so their sum matches `targetMinutes`
 * (or as close as possible while keeping each step within [0.5, 60] minutes).
 */
function fitEditableStepDurations(
  steps: EditableDraftStepItem[],
  targetMinutes: number,
): EditableDraftStepItem[] {
  if (steps.length === 0) return [];

  const targetHalfUnits = Math.round(clampTargetMinutes(targetMinutes) * 2);
  const minHalfUnitsPerStep = 1; // 0.5 min
  const maxHalfUnitsPerStep = 120; // 60 min

  const baseWeights = steps.map((step) => Math.max(1, Math.round(step.durationMin * 2)));
  const allocated = steps.map(() => minHalfUnitsPerStep);
  let remaining = targetHalfUnits - steps.length * minHalfUnitsPerStep;

  if (remaining <= 0) {
    return steps.map((step, idx) => ({
      ...step,
      order: idx + 1,
      durationMin: allocated[idx] / 2,
    }));
  }

  const maxTotalPossible = steps.length * maxHalfUnitsPerStep;
  if (targetHalfUnits >= maxTotalPossible) {
    return steps.map((step, idx) => ({
      ...step,
      order: idx + 1,
      durationMin: maxHalfUnitsPerStep / 2,
    }));
  }

  let openIndices = steps.map((_, idx) => idx);
  while (remaining > 0 && openIndices.length > 0) {
    const weightSum = openIndices.reduce((sum, idx) => sum + baseWeights[idx], 0);
    const shares = openIndices.map((idx) => {
      const room = maxHalfUnitsPerStep - allocated[idx];
      const exact = (remaining * baseWeights[idx]) / weightSum;
      const whole = Math.min(room, Math.floor(exact));
      return {
        idx,
        exact,
        whole,
        frac: exact - Math.floor(exact),
        room,
        baseWeight: baseWeights[idx],
      };
    });

    let distributed = 0;
    for (const share of shares) {
      if (share.whole > 0) {
        allocated[share.idx] += share.whole;
        distributed += share.whole;
      }
    }
    remaining -= distributed;

    if (remaining > 0) {
      const sortable = [...shares]
        .filter((s) => allocated[s.idx] < maxHalfUnitsPerStep)
        .sort((a, b) => b.frac - a.frac || b.baseWeight - a.baseWeight || a.idx - b.idx);

      if (sortable.length === 0) break;

      for (const item of sortable) {
        if (remaining <= 0) break;
        if (allocated[item.idx] < maxHalfUnitsPerStep) {
          allocated[item.idx] += 1;
          remaining -= 1;
        }
      }
    }

    openIndices = openIndices.filter((idx) => allocated[idx] < maxHalfUnitsPerStep);
    if (distributed === 0 && remaining > 0 && openIndices.length === 0) {
      break;
    }
  }

  return steps.map((step, idx) => ({
    ...step,
    order: idx + 1,
    durationMin: allocated[idx] / 2,
  }));
}

function desiredStepCountForMinutes(targetMinutes: number, poolSize: number): number {
  if (poolSize <= 0) return 0;
  let desired: number;
  if (targetMinutes <= 15) desired = 3;
  else if (targetMinutes <= 25) desired = 5;
  else if (targetMinutes <= 35) desired = 6;
  else if (targetMinutes <= 45) desired = 8;
  else if (targetMinutes <= 60) desired = 10;
  else desired = 12;
  return Math.min(poolSize, Math.min(40, Math.max(1, desired)));
}

function scoreReviewedExerciseForDraft(
  exercise: PilatesExercise,
  strengthenAreas: readonly StrengthenArea[],
  level: DifficultyLevel,
  preferredProps: readonly PropType[],
  tempo?: ClassDraftConditionsInput['tempo'],
): number {
  let score = 0;
  const preferredCategories = new Set(
    strengthenAreas.flatMap((area) => STRENGTHEN_AREA_CATEGORIES[area] ?? []),
  );

  if (preferredCategories.has(exercise.blockCategory)) {
    score += 30;
  }

  for (const area of strengthenAreas) {
    const areaMuscles = STRENGTHEN_AREA_MUSCLES[area] ?? [];
    if (
      exercise.targetMuscles.some((muscle) =>
        areaMuscles.some((target) => muscle.includes(target) || target.includes(muscle)),
      )
    ) {
      score += 15;
    }
    if (area === 'mobility-rehab' && exercise.favoriteTag === 'rehab-posture') {
      score += 14;
    }
    if (
      (area === 'core' || area === 'glute-lower') &&
      exercise.favoriteTag === 'burn-sculpt'
    ) {
      score += 8;
    }
  }

  if (exercise.level === level) {
    score += 16;
  } else if (Number(exercise.level) < Number(level)) {
    score += 8;
  } else {
    score -= 20;
  }

  if (
    preferredProps.length > 0 &&
    exercise.props.some((prop) => prop !== 'none' && preferredProps.includes(prop))
  ) {
    score += 12;
  }

  if (tempo && exercise.tempo === tempo) {
    score += 8;
  }

  return score;
}

function matchesReviewedExerciseConditions(
  exercise: PilatesExercise,
  apparatus: ApparatusType | 'mixed',
  availableEquipment?: readonly string[],
): boolean {
  if (!isExerciseAutoEligible(exercise)) {
    return false;
  }
  if (apparatus !== 'mixed' && exercise.apparatus !== apparatus) {
    return false;
  }
  const equipmentInfo = getExerciseEquipment(exercise);
  if (!equipmentInfo.requirementsKnown) {
    return false;
  }
  if (availableEquipment && availableEquipment.length > 0) {
    if (!equipmentRequirementsSatisfied(equipmentInfo.requiredEquipment, availableEquipment)) {
      return false;
    }
  }
  return true;
}

/**
 * 1. Builds a deterministic local class draft strictly from reviewed exercises (`isExerciseAutoEligible(ex) === true`).
 * Never includes unreviewed exercises.
 */
export function buildLocalClassDraft(
  conditions: ClassDraftConditionsInput,
  exercises: readonly PilatesExercise[],
  conditionTemplates: readonly ConditionTemplate[] = [],
): EditableClassDraftResult {
  const matchedTemplate = conditions.templateId
    ? conditionTemplates.find((tpl) => tpl.id === conditions.templateId)
    : undefined;

  const templateCriteria = matchedTemplate?.criteria;

  const targetMinutes = clampTargetMinutes(
    conditions.durationMinutes ?? templateCriteria?.targetMinutes,
    templateCriteria?.targetMinutes ?? 50,
  );
  const level: DifficultyLevel = conditions.level ?? templateCriteria?.level ?? '1.5';
  const apparatus: ApparatusType | 'mixed' =
    conditions.apparatus ?? templateCriteria?.apparatus ?? 'reformer';

  const availableEquipment =
    conditions.availableEquipment !== undefined
      ? conditions.availableEquipment
      : templateCriteria?.availableEquipment;

  const preferredProps: PropType[] =
    conditions.preferredProps !== undefined
      ? conditions.preferredProps
      : templateCriteria?.preferredProps ?? [];

  const strengthenAreas: StrengthenArea[] =
    conditions.strengthenAreas && conditions.strengthenAreas.length > 0
      ? [...new Set(conditions.strengthenAreas)].slice(0, 5)
      : templateCriteria?.focusPreset
        ? [focusPresetToStrengthenArea(templateCriteria.focusPreset)]
        : ['core'];

  const focusPreset: AutoGenerateCriteria['focusPreset'] =
    conditions.strengthenAreas && conditions.strengthenAreas.length > 0
      ? strengthenAreaToFocusPreset(strengthenAreas[0])
      : templateCriteria?.focusPreset ?? strengthenAreaToFocusPreset(strengthenAreas[0]);

  const defaultLayer: LayerMode =
    conditions.tempo === 'slow-precise'
      ? 'easy'
      : conditions.tempo === 'athletic-burn'
        ? 'hard'
        : templateCriteria?.defaultLayer ??
          (level === '1.0' ? 'easy' : level === '2.0' ? 'hard' : 'standard');

  const rawTheme =
    conditions.theme?.trim() || matchedTemplate?.name?.trim() || '균형 잡힌 필라테스 플로우';
  const themeInspection = inspectSensitiveHealthText(rawTheme);
  const safeTheme =
    themeInspection.sanitizedText.replace(/^\[민감정보 제외\]\s*$/, '').trim() ||
    '균형 잡힌 필라테스 플로우';

  // Strictly filter to reviewed exercises matching apparatus and equipment
  const apparatusEligible = exercises.filter((ex) =>
    matchesReviewedExerciseConditions(ex, apparatus, availableEquipment),
  );

  // Respect level cap when possible, while never falling back to unreviewed exercises
  const levelEligible = apparatusEligible.filter((ex) => Number(ex.level) <= Number(level));
  const pool = levelEligible.length > 0 ? levelEligible : apparatusEligible;

  const scoredPool = [...pool].sort(
    (a, b) =>
      scoreReviewedExerciseForDraft(b, strengthenAreas, level, preferredProps, conditions.tempo) -
        scoreReviewedExerciseForDraft(a, strengthenAreas, level, preferredProps, conditions.tempo) ||
      a.id.localeCompare(b.id),
  );

  const desiredCount = desiredStepCountForMinutes(targetMinutes, scoredPool.length);
  const selected: PilatesExercise[] = [];
  const usedIds = new Set<string>();
  const usedMovementKeys = new Set<string>();

  const pickCandidate = (
    predicate: (ex: PilatesExercise) => boolean,
    allowDuplicateFamily = false,
  ): PilatesExercise | undefined => {
    return scoredPool.find(
      (ex) =>
        !usedIds.has(ex.id) &&
        (allowDuplicateFamily || !usedMovementKeys.has(getMovementKey(ex))) &&
        predicate(ex),
    );
  };

  const addSelected = (ex: PilatesExercise) => {
    selected.push(ex);
    usedIds.add(ex.id);
    usedMovementKeys.add(getMovementKey(ex));
  };

  if (desiredCount >= 1) {
    const warmupEx =
      pickCandidate((ex) => ex.blockCategory === 'warmup', false) ??
      pickCandidate((ex) => ex.blockCategory === 'warmup', true);
    if (warmupEx) addSelected(warmupEx);
  }

  if (desiredCount >= 2) {
    const cooldownEx =
      pickCandidate((ex) => ex.blockCategory === 'cooldown', false) ??
      pickCandidate((ex) => ex.blockCategory === 'cooldown', true);
    if (cooldownEx) addSelected(cooldownEx);
  }

  // Prioritize target strengthen area categories in main section
  const priorityCategories = [
    ...new Set(strengthenAreas.flatMap((area) => STRENGTHEN_AREA_CATEGORIES[area] ?? [])),
  ].filter((cat) => cat !== 'warmup' && cat !== 'cooldown');

  for (const cat of priorityCategories) {
    if (selected.length >= desiredCount) break;
    const match = pickCandidate((ex) => ex.blockCategory === cat, false);
    if (match) addSelected(match);
  }

  // Fill across canonical main blocks
  const canonicalMainCategories = CANONICAL_BLOCK_ORDER.filter(
    (cat) => cat !== 'warmup' && cat !== 'cooldown',
  );
  for (const cat of canonicalMainCategories) {
    if (selected.length >= desiredCount) break;
    const match = pickCandidate((ex) => ex.blockCategory === cat, false);
    if (match) addSelected(match);
  }

  // Fill remaining slots with highest-scoring unique movement family exercises
  while (selected.length < desiredCount) {
    const nextUnique =
      pickCandidate(
        (ex) => ex.blockCategory !== 'warmup' && ex.blockCategory !== 'cooldown',
        false,
      ) ?? pickCandidate(() => true, false);
    if (nextUnique) {
      addSelected(nextUnique);
      continue;
    }
    const nextAny =
      pickCandidate(
        (ex) => ex.blockCategory !== 'warmup' && ex.blockCategory !== 'cooldown',
        true,
      ) ?? pickCandidate(() => true, true);
    if (!nextAny) break;
    addSelected(nextAny);
  }

  // Order warmup -> main (canonical block order) -> cooldown
  selected.sort(
    (a, b) =>
      sectionRank(a.blockCategory) - sectionRank(b.blockCategory) ||
      blockOrderIndex(a.blockCategory) - blockOrderIndex(b.blockCategory) ||
      scoreReviewedExerciseForDraft(b, strengthenAreas, level, preferredProps, conditions.tempo) -
        scoreReviewedExerciseForDraft(a, strengthenAreas, level, preferredProps, conditions.tempo) ||
      a.id.localeCompare(b.id),
  );

  const rawSteps: EditableDraftStepItem[] = selected.map((ex, idx) => ({
    stepId: `draft-step-${idx + 1}-${ex.id}`.slice(0, 120),
    order: idx + 1,
    exerciseId: ex.id,
    nameKo: ex.nameKo.slice(0, 160),
    nameEn: ex.nameEn.slice(0, 160),
    apparatus: ex.apparatus,
    blockCategory: ex.blockCategory,
    durationMin: clampStepDuration(ex.defaultDurationMin, 5),
    selectedLayer: defaultLayer,
    instructorNote: `${ex.springs} · ${ex.cues[0] ?? ex.breathPattern}`.slice(0, 500),
    isReviewed: true,
  }));

  const steps = fitEditableStepDurations(rawSteps, targetMinutes);
  const apparatusTitle = formatApparatusTitle(apparatus);
  const areaLabels = strengthenAreas.map((area) => STRENGTHEN_AREA_LABELS[area]);
  const totalStepMinutes = steps.reduce((sum, step) => sum + step.durationMin, 0);

  const title = `[${apparatusTitle}] ${safeTheme} (${targetMinutes}분 · Lv.${level})`.slice(0, 150);
  const subtitle =
    `${areaLabels.join(' · ')} 집중 · 검토 완료 동작 ${steps.length}블록 (${totalStepMinutes}분)`.slice(
      0,
      240,
    );

  const templateNote = matchedTemplate
    ? `조건 템플릿 '${matchedTemplate.name}' 기본값을 병합하고 사용자 지정 조건을 우선 반영했습니다. `
    : '';
  const emptyPoolNote =
    steps.length === 0
      ? '선택한 기구·장비 조건에 부합하는 검토 완료(Approved) 동작이 없어 빈 초안이 생성되었습니다. 라이브러리에서 동작 검토 후 다시 생성해 주세요. '
      : `워밍업 → 메인(${areaLabels.join(', ')}) → 쿨다운 순으로 검토 완료 동작 ${steps.length}개를 배치해 총 ${totalStepMinutes}분으로 구성했습니다. `;

  const coachingSummary =
    `${templateNote}${emptyPoolNote}${UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER}`.slice(0, 1000);

  return {
    kind: 'class-draft',
    source: 'local-rule-engine',
    provider: 'none',
    model: null,
    cached: false,
    title,
    subtitle,
    targetMinutes,
    level,
    apparatus,
    focusPreset,
    strengthenAreas,
    coachingSummary,
    steps,
    guaranteesSafetyOrEffect: false,
    safetyDisclaimer: UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER,
  };
}

function inferDefaultBodyPosition(
  text: string,
  blockCategory: ClassBlockCategory,
): BodyPosition {
  if (/프론|엎드린|스완|prone|swan/i.test(text)) return 'prone';
  if (/사이드|옆으로|side[\s-]*lying/i.test(text)) return 'side-lying';
  if (/스탠딩|선\s*자세|런지|스쿼트|standing|lunge/i.test(text)) return 'standing';
  if (/닐링|무릎\s*선|kneeling/i.test(text)) return 'kneeling';
  if (/네발|쿼드러페드|quadruped|all\s*fours/i.test(text)) return 'quadruped';
  if (/시티드|앉은|머메이드|로잉|seated|mermaid|rowing/i.test(text)) return 'seated';
  if (/수파인|누운|supine/i.test(text)) return 'supine';

  switch (blockCategory) {
    case 'warmup':
    case 'footwork':
    case 'bridging':
    case 'core':
    case 'feet-in-straps':
      return 'supine';
    case 'upper-body':
    case 'cooldown':
      return 'seated';
    case 'lower-body':
      return 'standing';
    case 'plank':
      return 'quadruped';
    case 'extension':
      return 'prone';
  }
}

function inferDefaultSpinalPlanes(
  text: string,
  blockCategory: ClassBlockCategory,
): SpinalPlane[] {
  const planes: SpinalPlane[] = [];
  if (/회전|트위스트|오블리크|rotation|twist|oblique/i.test(text)) planes.push('rotation');
  if (/측굴|사이드\s*벤드|머메이드|lateral|mermaid|side\s*bend/i.test(text))
    planes.push('lateral');
  if (/신전|스완|익스텐션|extension|swan/i.test(text)) planes.push('extension');
  if (/굴곡|컬업|분절|롤다운|flexion|curl|articulation/i.test(text)) planes.push('flexion');
  if (/중립|안정화|neutral/i.test(text)) planes.push('neutral');

  if (planes.length > 0) {
    return [...new Set(planes)].slice(0, 5);
  }

  switch (blockCategory) {
    case 'warmup':
    case 'footwork':
    case 'lower-body':
    case 'plank':
    case 'feet-in-straps':
      return ['neutral'];
    case 'bridging':
    case 'core':
      return ['flexion', 'neutral'];
    case 'upper-body':
      return ['neutral', 'rotation'];
    case 'extension':
      return ['extension'];
    case 'cooldown':
      return ['lateral', 'rotation'];
  }
}

function resolveDefaultSpringsForIdea(
  text: string,
  apparatus: ApparatusType,
  blockCategory: ClassBlockCategory,
): string {
  const hasExplicitSpringInText =
    /\b([1-3][RBYGW](?:\s*[+,/]?\s*[1-2][RBYGW])?)\b/i.test(text) ||
    /(?:빨강|파랑|노랑)\s*\d/.test(text);

  if (hasExplicitSpringInText) {
    return extractSpringFromText(text);
  }

  if (apparatus === 'mat' || apparatus === 'barrel') {
    return 'Bodyweight';
  }
  if (apparatus === 'chair') {
    return blockCategory === 'lower-body' || blockCategory === 'footwork'
      ? '2 Medium-Heavy Pedal (1R 1B)'
      : '1 Medium Pedal (1B)';
  }
  if (apparatus === 'cadillac') {
    return blockCategory === 'upper-body' || blockCategory === 'core'
      ? 'Roll-Down / Push-Through Spring (1R 1B)'
      : 'Leg Springs / Tower Bar (1R)';
  }

  switch (blockCategory) {
    case 'footwork':
      return '2R 1B';
    case 'bridging':
      return '2R';
    case 'warmup':
    case 'core':
    case 'feet-in-straps':
      return '1R 1B';
    case 'upper-body':
    case 'lower-body':
    case 'plank':
    case 'extension':
      return '1R';
    case 'cooldown':
      return '1B';
  }
}

/**
 * 2. Organizes a raw movement idea into a structured `EditableMovementIdeaResult`
 * while sanitizing sensitive health text and marking it strictly as `'unreviewed-creative'`.
 */
export function buildLocalMovementIdea(input: MovementIdeaInput): EditableMovementIdeaResult {
  const rawIdeaInspection = inspectSensitiveHealthText(input.rawIdeaText || '');
  const baseNameInspection = inspectSensitiveHealthText(input.baseExerciseName || '');
  const hasSensitiveData =
    rawIdeaInspection.hasSensitiveData || baseNameInspection.hasSensitiveData;

  const cleanIdeaText =
    rawIdeaInspection.sanitizedText
      .replace(/\[민감정보 제외\]/g, '')
      .replace(/\s+/g, ' ')
      .trim() || '코어 조절 및 정렬 중심 창작 변형 동작';

  const cleanBaseName = baseNameInspection.sanitizedText
    .replace(/\[민감정보 제외\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const apparatusMeta = APPARATUS_LABELS[input.apparatus];
  const blockMeta =
    CANONICAL_BLOCKS.find((b) => b.category === input.blockCategory) ?? CANONICAL_BLOCKS[3];
  const bodyPosition =
    input.bodyPosition ?? inferDefaultBodyPosition(cleanIdeaText, input.blockCategory);
  const spinalPlanes = input.spinalPlane
    ? [input.spinalPlane]
    : inferDefaultSpinalPlanes(cleanIdeaText, input.blockCategory);
  const props: PropType[] =
    input.preferredProps && input.preferredProps.length > 0
      ? [...new Set(input.preferredProps)].slice(0, 10)
      : ['none'];

  const defaultDurationMin = Math.min(20, Math.max(0.5, blockMeta.defaultTargetMin || 5));
  const springs = resolveDefaultSpringsForIdea(
    rawIdeaInspection.sanitizedText,
    input.apparatus,
    input.blockCategory,
  );

  const targetMuscles = [
    ...new Set([
      ...(STRENGTHEN_AREA_MUSCLES[input.strengthenArea] ?? []),
      ...(BLOCK_DEFAULT_MUSCLES[input.blockCategory] ?? []),
    ]),
  ].slice(0, 6);

  const conciseIdeaHeadline = cleanIdeaText.slice(0, 36).trim();
  const nameKoBase = cleanBaseName
    ? `${apparatusMeta.short} ${cleanBaseName} — ${conciseIdeaHeadline}`
    : `${apparatusMeta.short} ${blockMeta.nameKo.split('&')[0].trim()} 창작 변형 (${conciseIdeaHeadline})`;
  const nameKo = nameKoBase.slice(0, 160);

  const positionEn = POSITION_LABELS[bodyPosition]?.en ?? 'Controlled';
  const blockEn = BLOCK_LABELS_EN[input.blockCategory] ?? 'Pilates Variation';
  const nameEn = `${apparatusMeta.en} ${positionEn} ${blockEn} Creative Variation`.slice(0, 160);

  const primaryPlaneKo = SPINAL_PLANE_LABELS[spinalPlanes[0]]?.ko ?? '중립 안정화';
  const breathPattern =
    `코로 흉곽을 입체적으로 확장하며 준비하고, 내쉬는 숨에 복횡근·골반기저근을 연결해 ${primaryPlaneKo} 정렬을 유지하며 동작을 수행합니다.`.slice(
      0,
      500,
    );

  const cues: string[] = [
    `[셋업·정렬] ${POSITION_LABELS[bodyPosition].ko}에서 귀-어깨-골반 중립 정렬을 먼저 세팅하고 ${springs} 저항을 부드럽게 연결하세요.`.slice(
      0,
      300,
    ),
    `[핵심 포커스] ${STRENGTHEN_AREA_LABELS[input.strengthenArea]}에 집중하며 '${conciseIdeaHeadline}' 구간의 속도(3초 수축 · 3초 신장)를 일정하게 조절하세요.`.slice(
      0,
      300,
    ),
    `[보상작용 방지] 승모근 과긴장이나 요추 과신전 없이 ${targetMuscles.slice(0, 2).join('·')}의 힘으로 끝 범위를 통제하세요.`.slice(
      0,
      300,
    ),
  ];

  const sensitivePrefix = hasSensitiveData
    ? `${rawIdeaInspection.warningMessageKo ?? baseNameInspection.warningMessageKo ?? '민감 건강·개인정보는 제외되었습니다.'} `
    : '';

  const precautions =
    `${sensitivePrefix}[미검토 창작 동작] 가동 범위를 작게 시작하고 기구·스프링(${springs}) 장력과 대상자 컨디션을 강사가 직접 확인하세요. 통증이나 보상작용 발생 시 즉시 중단합니다.`.slice(
      0,
      500,
    );

  const layers: ExerciseLayers = {
    easy: `가동 범위를 50~60%로 줄이고 지지면을 넓혀 ${POSITION_LABELS[bodyPosition].ko} 중립 골반과 호흡 연결에 집중합니다.`.slice(
      0,
      400,
    ),
    standard: `${springs} 기본 세팅에서 ${STRENGTHEN_AREA_LABELS[input.strengthenArea]} 타겟 근육(${targetMuscles.slice(0, 3).join(', ')})의 왕복 템포를 일정하게 유지합니다.`.slice(
      0,
      400,
    ),
    hard: `끝 범위에서 3초 정지(아이소메트릭) 또는 단측성·불안정성 챌린지를 추가해 심부 코어와 협응력을 극대화합니다.`.slice(
      0,
      400,
    ),
  };

  const variationRationale =
    `이지(안정성·범위 축소) → 스탠다드(${blockMeta.nameKo} 기본 협응) → 하드(지렛대 확장·엔드레인지 홀드) 3단계 레이어로 구성하여 Lv.${input.level} 수업에서 회원 숙련도에 맞춰 즉시 조절할 수 있도록 설계했습니다.`.slice(
      0,
      600,
    );

  return {
    kind: 'movement-idea',
    source: 'local-rule-engine',
    provider: 'none',
    model: null,
    cached: false,
    nameKo,
    nameEn,
    apparatus: input.apparatus,
    blockCategory: input.blockCategory,
    level: input.level,
    bodyPosition,
    spinalPlanes,
    props,
    defaultDurationMin,
    springs,
    targetMuscles,
    breathPattern,
    cues,
    precautions,
    layers,
    variationRationale,
    reviewStatus: 'unreviewed-creative',
    guaranteesSafetyOrEffect: false,
    safetyDisclaimer: UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER,
  };
}

/**
 * 3. Composes a sequence strictly from reviewed exercises (`isExerciseAutoEligible(ex) === true`)
 * and reviewed P1 reusable blocks (`block.isReviewed === true`).
 * Any missing or unreviewed exercise/block ID is excluded and recorded in `excludedUnreviewedIds`.
 */
export function composeSequenceFromReviewedItems(
  input: SequenceComposeInput,
  exercises: readonly PilatesExercise[],
  reusableBlocks: readonly P1ReusableBlockContract[] = [],
): EditableSequenceComposeResult {
  const targetMinutes = clampTargetMinutes(input.targetMinutes, 50);
  const level: DifficultyLevel = input.level ?? '1.5';
  const apparatus: ApparatusType | 'mixed' = input.apparatus ?? 'reformer';
  const defaultLayer: LayerMode =
    level === '1.0' ? 'easy' : level === '2.0' ? 'hard' : 'standard';

  const exercisesMap = new Map<string, PilatesExercise>(exercises.map((ex) => [ex.id, ex]));
  const blocksMap = new Map<string, P1ReusableBlockContract>(
    reusableBlocks.map((block) => [block.id, block]),
  );

  const excludedSet = new Set<string>();
  const collectedSteps: EditableDraftStepItem[] = [];

  // Process P1 reusable blocks first
  for (const blockId of input.selectedBlockIds ?? []) {
    const block = blocksMap.get(blockId);
    if (!block || block.isReviewed !== true) {
      excludedSet.add(blockId);
      continue;
    }

    const blockSteps =
      block.steps ??
      (block as { items?: readonly P1ReusableBlockStepContract[] }).items ??
      [];
    const fallbackBlockCategory: ClassBlockCategory =
      block.category ?? blockSteps[0]?.blockCategory ?? 'core';
    const rawStepDurationSum = blockSteps.reduce(
      (sum, step) => sum + (Number.isFinite(step.durationMin) ? step.durationMin! : 4),
      0,
    );
    const resolvedBlockDurationMin =
      block.durationMin ?? (rawStepDurationSum > 0 ? rawStepDurationSum : 10);
    const perStepFallbackDuration =
      blockSteps.length > 0
        ? clampStepDuration(resolvedBlockDurationMin / blockSteps.length, 4)
        : 4;

    for (let stepIdx = 0; stepIdx < blockSteps.length; stepIdx++) {
      const blockStep = blockSteps[stepIdx];
      const catalogEx = exercisesMap.get(blockStep.exerciseId);

      if (catalogEx) {
        if (!isExerciseAutoEligible(catalogEx)) {
          excludedSet.add(blockStep.exerciseId);
          continue;
        }
        collectedSteps.push({
          stepId: `compose-block-${block.id}-${stepIdx + 1}-${catalogEx.id}`.slice(0, 120),
          order: collectedSteps.length + 1,
          exerciseId: catalogEx.id,
          nameKo: catalogEx.nameKo.slice(0, 160),
          nameEn: catalogEx.nameEn.slice(0, 160),
          apparatus: catalogEx.apparatus,
          blockCategory:
            blockStep.blockCategory || catalogEx.blockCategory || fallbackBlockCategory,
          durationMin: clampStepDuration(
            blockStep.durationMin || catalogEx.defaultDurationMin || perStepFallbackDuration,
            perStepFallbackDuration,
          ),
          selectedLayer: blockStep.selectedLayer || defaultLayer,
          instructorNote: (
            blockStep.instructorNote ||
            `[블록: ${block.title}] ${catalogEx.springs} · ${catalogEx.cues[0] ?? catalogEx.breathPattern}`
          ).slice(0, 500),
          isReviewed: true,
          sourceBlockId: block.id,
        });
      } else if (blockStep.exerciseSnapshot) {
        const snap = blockStep.exerciseSnapshot;
        collectedSteps.push({
          stepId: `compose-block-${block.id}-${stepIdx + 1}-${snap.id}`.slice(0, 120),
          order: collectedSteps.length + 1,
          exerciseId: snap.id,
          nameKo: snap.nameKo.slice(0, 160),
          nameEn: snap.nameEn.slice(0, 160),
          apparatus: snap.apparatus,
          blockCategory: blockStep.blockCategory || fallbackBlockCategory,
          durationMin: clampStepDuration(
            blockStep.durationMin ?? perStepFallbackDuration,
            perStepFallbackDuration,
          ),
          selectedLayer: blockStep.selectedLayer || defaultLayer,
          instructorNote: (blockStep.instructorNote || `[블록: ${block.title}]`).slice(0, 500),
          isReviewed: true,
          sourceBlockId: block.id,
        });
      } else {
        excludedSet.add(blockStep.exerciseId);
      }
    }
  }

  // Process individually selected exercises
  for (const exerciseId of input.selectedExerciseIds ?? []) {
    const ex = exercisesMap.get(exerciseId);
    if (!ex || !isExerciseAutoEligible(ex)) {
      excludedSet.add(exerciseId);
      continue;
    }

    collectedSteps.push({
      stepId: `compose-step-${collectedSteps.length + 1}-${ex.id}`.slice(0, 120),
      order: collectedSteps.length + 1,
      exerciseId: ex.id,
      nameKo: ex.nameKo.slice(0, 160),
      nameEn: ex.nameEn.slice(0, 160),
      apparatus: ex.apparatus,
      blockCategory: ex.blockCategory,
      durationMin: clampStepDuration(ex.defaultDurationMin, 5),
      selectedLayer: defaultLayer,
      instructorNote: `${ex.springs} · ${ex.cues[0] ?? ex.breathPattern}`.slice(0, 500),
      isReviewed: true,
    });
  }

  // Order logically: warmup -> footwork/bridging/core/upper-body/lower-body/plank/extension/feet-in-straps -> cooldown
  const orderedSteps = [...collectedSteps]
    .slice(0, 40)
    .map((item, idx) => ({ item, idx }))
    .sort(
      (a, b) =>
        sectionRank(a.item.blockCategory) - sectionRank(b.item.blockCategory) ||
        blockOrderIndex(a.item.blockCategory) - blockOrderIndex(b.item.blockCategory) ||
        a.idx - b.idx,
    )
    .map(({ item }, idx) => ({
      ...item,
      order: idx + 1,
    }));

  const fittedSteps = fitEditableStepDurations(orderedSteps, targetMinutes);
  const excludedUnreviewedIds = [...excludedSet].slice(0, 100);

  const rawTheme = input.theme?.trim() || '검토 완료 블록·동작 시퀀스 조합';
  const safeTheme =
    inspectSensitiveHealthText(rawTheme).sanitizedText.replace(/^\[민감정보 제외\]\s*$/, '').trim() ||
    '검토 완료 블록·동작 시퀀스 조합';

  const apparatusTitle = formatApparatusTitle(apparatus);
  const totalMinutes = fittedSteps.reduce((sum, s) => sum + s.durationMin, 0);

  const title = `[${apparatusTitle}] ${safeTheme} (${targetMinutes}분 조합)`.slice(0, 150);
  const subtitle =
    `검토 완료 항목 ${fittedSteps.length}단계 (${totalMinutes}분)` +
    (excludedUnreviewedIds.length > 0
      ? ` · 미검토/미확인 ${excludedUnreviewedIds.length}건 자동 제외`
      : '');

  const flowBlocks = [...new Set(fittedSteps.map((s) => s.blockCategory))];
  const flowSummary =
    flowBlocks.length > 0
      ? `블록 흐름(${flowBlocks.join(' → ')})에 맞춰 총 ${totalMinutes}분으로 시간 배분을 최적화했습니다.`
      : '포함 가능한 검토 완료 항목이 없습니다.';
  const excludedNote =
    excludedUnreviewedIds.length > 0
      ? ` 미검토 또는 존재하지 않는 항목(${excludedUnreviewedIds.join(', ')})은 자동 시퀀스 조합 정책에 따라 제외되었습니다.`
      : '';

  const transitionSummary =
    `${flowSummary}${excludedNote} ${UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER}`.slice(0, 1000);

  return {
    kind: 'sequence-compose',
    source: 'local-rule-engine',
    provider: 'none',
    model: null,
    cached: false,
    title,
    subtitle: subtitle.slice(0, 240),
    targetMinutes,
    level,
    apparatus,
    steps: fittedSteps,
    excludedUnreviewedIds,
    transitionSummary,
    guaranteesSafetyOrEffect: false,
    safetyDisclaimer: UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER,
  };
}

function applyStepEdits(
  currentSteps: readonly EditableDraftStepItem[],
  patch: Pick<
    ClassDraftEditPatch,
    'steps' | 'removeStepIds' | 'reorderStepIds' | 'stepUpdates'
  >,
): EditableDraftStepItem[] {
  let nextSteps = patch.steps ? [...patch.steps] : [...currentSteps];

  if (patch.removeStepIds && patch.removeStepIds.length > 0) {
    const removeSet = new Set(patch.removeStepIds);
    nextSteps = nextSteps.filter((step) => !removeSet.has(step.stepId));
  }

  if (patch.stepUpdates && patch.stepUpdates.length > 0) {
    const updatesMap = new Map(patch.stepUpdates.map((u) => [u.stepId, u]));
    nextSteps = nextSteps.map((step) => {
      const update = updatesMap.get(step.stepId);
      if (!update) return step;
      return {
        ...step,
        durationMin:
          update.durationMin !== undefined
            ? clampStepDuration(update.durationMin, step.durationMin)
            : step.durationMin,
        selectedLayer: update.selectedLayer ?? step.selectedLayer,
        instructorNote:
          update.instructorNote !== undefined
            ? update.instructorNote.slice(0, 500)
            : step.instructorNote,
        blockCategory: update.blockCategory ?? step.blockCategory,
      };
    });
  }

  if (patch.reorderStepIds && patch.reorderStepIds.length > 0) {
    const orderMap = new Map(patch.reorderStepIds.map((id, idx) => [id, idx]));
    nextSteps = [...nextSteps].sort((a, b) => {
      const rankA = orderMap.has(a.stepId) ? orderMap.get(a.stepId)! : Number.MAX_SAFE_INTEGER;
      const rankB = orderMap.has(b.stepId) ? orderMap.get(b.stepId)! : Number.MAX_SAFE_INTEGER;
      return rankA - rankB || a.order - b.order;
    });
  }

  return nextSteps.slice(0, 40).map((step, idx) => ({
    ...step,
    stepId: (step.stepId || `step-${idx + 1}-${step.exerciseId}`).slice(0, 120),
    order: idx + 1,
    durationMin: clampStepDuration(step.durationMin, 4),
    instructorNote: (step.instructorNote ?? '').slice(0, 500),
    isReviewed: true,
  }));
}

/**
 * 4a. Applies user edits to a class draft while preserving safety disclaimers and `isReviewed: true`.
 */
export function applyUserEditsToClassDraft(
  draft: EditableClassDraftResult,
  patch: ClassDraftEditPatch,
): EditableClassDraftResult {
  const steps = applyStepEdits(draft.steps, patch);
  const title =
    patch.title !== undefined && patch.title.trim().length > 0
      ? patch.title.trim().slice(0, 150)
      : draft.title;
  const subtitle =
    patch.subtitle !== undefined ? patch.subtitle.trim().slice(0, 240) : draft.subtitle;
  const targetMinutes =
    patch.targetMinutes !== undefined
      ? clampTargetMinutes(patch.targetMinutes, draft.targetMinutes)
      : draft.targetMinutes;
  const coachingSummary =
    patch.coachingSummary !== undefined
      ? patch.coachingSummary.trim().slice(0, 1000)
      : draft.coachingSummary;

  return {
    ...draft,
    title,
    subtitle,
    targetMinutes,
    coachingSummary,
    steps,
    guaranteesSafetyOrEffect: false,
    safetyDisclaimer: UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER,
  };
}

/**
 * 4b. Applies user edits to a movement idea while strictly preserving `reviewStatus: 'unreviewed-creative'`
 * and `guaranteesSafetyOrEffect: false`.
 */
export function applyUserEditsToMovementIdea(
  idea: EditableMovementIdeaResult,
  patch: MovementIdeaEditPatch,
): EditableMovementIdeaResult {
  const nameKo =
    patch.nameKo !== undefined && patch.nameKo.trim().length >= 2
      ? patch.nameKo.trim().slice(0, 160)
      : idea.nameKo;
  const nameEn =
    patch.nameEn !== undefined ? patch.nameEn.trim().slice(0, 160) : idea.nameEn;
  const defaultDurationMin =
    patch.defaultDurationMin !== undefined && Number.isFinite(patch.defaultDurationMin)
      ? Math.min(20, Math.max(0.5, Math.round(patch.defaultDurationMin * 2) / 2))
      : idea.defaultDurationMin;
  const springs =
    patch.springs !== undefined ? patch.springs.trim().slice(0, 240) : idea.springs;
  const breathPattern =
    patch.breathPattern !== undefined
      ? patch.breathPattern.trim().slice(0, 500)
      : idea.breathPattern;
  const cues =
    patch.cues && patch.cues.length > 0
      ? patch.cues
          .map((cue) => cue.trim().slice(0, 300))
          .filter((cue) => cue.length > 0)
          .slice(0, 10)
      : idea.cues;
  const precautions =
    patch.precautions !== undefined && patch.precautions.trim().length >= 2
      ? patch.precautions.trim().slice(0, 500)
      : idea.precautions;
  const layers: ExerciseLayers = {
    easy:
      patch.layers?.easy && patch.layers.easy.trim().length >= 2
        ? patch.layers.easy.trim().slice(0, 400)
        : idea.layers.easy,
    standard:
      patch.layers?.standard && patch.layers.standard.trim().length >= 2
        ? patch.layers.standard.trim().slice(0, 400)
        : idea.layers.standard,
    hard:
      patch.layers?.hard && patch.layers.hard.trim().length >= 2
        ? patch.layers.hard.trim().slice(0, 400)
        : idea.layers.hard,
  };
  const variationRationale =
    patch.variationRationale !== undefined
      ? patch.variationRationale.trim().slice(0, 600)
      : idea.variationRationale;

  return {
    ...idea,
    nameKo,
    nameEn,
    defaultDurationMin,
    springs,
    breathPattern,
    cues: cues.length > 0 ? cues : idea.cues,
    precautions,
    layers,
    variationRationale,
    bodyPosition: patch.bodyPosition ?? idea.bodyPosition,
    spinalPlanes:
      patch.spinalPlanes && patch.spinalPlanes.length > 0
        ? patch.spinalPlanes.slice(0, 5)
        : idea.spinalPlanes,
    props:
      patch.props && patch.props.length > 0 ? patch.props.slice(0, 10) : idea.props,
    targetMuscles:
      patch.targetMuscles && patch.targetMuscles.length > 0
        ? patch.targetMuscles.slice(0, 12)
        : idea.targetMuscles,
    reviewStatus: 'unreviewed-creative',
    guaranteesSafetyOrEffect: false,
    safetyDisclaimer: UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER,
  };
}

/**
 * 4c. Applies user edits to a composed sequence while preserving safety disclaimers.
 */
export function applyUserEditsToSequenceCompose(
  result: EditableSequenceComposeResult,
  patch: SequenceComposeEditPatch,
): EditableSequenceComposeResult {
  const steps = applyStepEdits(result.steps, patch);
  const title =
    patch.title !== undefined && patch.title.trim().length > 0
      ? patch.title.trim().slice(0, 150)
      : result.title;
  const subtitle =
    patch.subtitle !== undefined ? patch.subtitle.trim().slice(0, 240) : result.subtitle;
  const targetMinutes =
    patch.targetMinutes !== undefined
      ? clampTargetMinutes(patch.targetMinutes, result.targetMinutes)
      : result.targetMinutes;
  const transitionSummary =
    patch.transitionSummary !== undefined
      ? patch.transitionSummary.trim().slice(0, 1000)
      : result.transitionSummary;

  return {
    ...result,
    title,
    subtitle,
    targetMinutes,
    transitionSummary,
    steps,
    guaranteesSafetyOrEffect: false,
    safetyDisclaimer: UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER,
  };
}

/**
 * 4d. Converts `EditableDraftStepItem[]` to `SequenceStep[]` compatible with `usePilatesStore`.
 */
export function editableStepsToSequenceSteps(
  steps: readonly EditableDraftStepItem[],
): SequenceStep[] {
  return steps.map((step, idx) => {
    const durationMin = clampStepDuration(step.durationMin, 4);
    const totalSec = Math.round(durationMin * 60);
    const explanationSec = Math.min(20, Math.max(0, Math.floor(totalSec * 0.15)));
    const transitionSec =
      idx === 0 ? 0 : Math.min(15, Math.max(0, Math.floor((totalSec - explanationSec) * 0.15)));
    const classSection =
      step.blockCategory === 'warmup'
        ? 'preparation'
        : step.blockCategory === 'cooldown'
          ? 'cooldown'
          : 'main';

    return {
      kind: 'exercise',
      stepId: step.stepId || `step-${idx + 1}-${step.exerciseId}`,
      order: idx + 1,
      blockCategory: step.blockCategory,
      exerciseId: step.exerciseId,
      durationMin,
      selectedLayer: step.selectedLayer,
      instructorNote: step.instructorNote || undefined,
      explanationSec,
      transitionSec,
      classSection,
    };
  });
}

/**
 * 4e. Converts an `EditableMovementIdeaResult` into an unreviewed custom `PilatesExercise`
 * (`isCustom: true`, `review: undefined`) and a `P1MovementIdeaContract`.
 * Ensures the resulting exercise is NEVER auto-eligible until an instructor explicitly reviews it.
 */
export function movementIdeaToUnreviewedExercise(
  idea: EditableMovementIdeaResult,
  rawIdeaText: string,
  id?: string,
  createdAt?: string,
): { exercise: PilatesExercise; ideaContract: P1MovementIdeaContract } {
  const resolvedId = id?.trim() || `custom-idea-${Date.now().toString(36)}`;
  const resolvedCreatedAt = createdAt?.trim() || new Date().toISOString();
  const sanitizedIdeaText =
    inspectSensitiveHealthText(rawIdeaText || idea.nameKo).sanitizedText || idea.nameKo;

  const basePrecautions = idea.precautions?.trim() || '';
  const hasNotice = basePrecautions.includes('미검토 창작 동작');
  const hasDisclaimer = basePrecautions.includes(UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER);

  const precautionsParts = [
    hasNotice ? basePrecautions : `[미검토 창작 동작] ${basePrecautions}`.trim(),
    hasDisclaimer ? '' : UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER,
  ].filter(Boolean);

  const precautionsWithNotice = precautionsParts.join(' ');

  const exercise: PilatesExercise = {
    id: resolvedId,
    nameKo: idea.nameKo,
    nameEn: idea.nameEn,
    apparatus: idea.apparatus,
    requiredEquipment: [idea.apparatus],
    review: undefined,
    props: idea.props.length > 0 ? [...idea.props] : ['none'],
    blockCategory: idea.blockCategory,
    spinalPlanes: idea.spinalPlanes.length > 0 ? [...idea.spinalPlanes] : ['neutral'],
    bodyPosition: idea.bodyPosition,
    level: idea.level,
    defaultDurationMin: idea.defaultDurationMin,
    isUnilateral: false,
    springs: idea.springs || 'Bodyweight',
    box: 'none',
    footbar: idea.apparatus === 'reformer' ? 'mid' : 'none',
    headrest: idea.apparatus === 'reformer' && idea.bodyPosition === 'supine' ? 'up' : 'flat',
    targetMuscles: [...idea.targetMuscles],
    breathPattern: idea.breathPattern,
    cues: [...idea.cues],
    precautions: precautionsWithNotice,
    layers: { ...idea.layers },
    youtube: {
      videoId: '',
      channelName: '강사 창작 노트 (미검토)',
      videoTitle: idea.nameKo,
      startSec: 0,
      url: '',
      note: UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER,
      region: 'kr',
    },
    favoriteTag: 'none',
    isCustom: true,
    createdAt: resolvedCreatedAt,
  };

  const ideaContract: P1MovementIdeaContract = {
    id: resolvedId,
    ideaText: sanitizedIdeaText,
    nameKo: idea.nameKo,
    nameEn: idea.nameEn,
    apparatus: idea.apparatus,
    blockCategory: idea.blockCategory,
    level: idea.level,
    defaultDurationMin: idea.defaultDurationMin,
    breathPattern: idea.breathPattern,
    cues: [...idea.cues],
    precautions: precautionsWithNotice,
    layers: { ...idea.layers },
    reviewStatus: 'unreviewed-creative',
    guaranteesSafetyOrEffect: false,
    safetyDisclaimer: UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER,
    safetyBoundary: {
      originType: 'instructor-created-draft',
      evaluationBasis: 'subjective-instructor-feel',
      aiSafetyGuaranteed: false,
      objectiveEfficacyClaimed: false,
      expertVerified: false,
      disclaimerKo: UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER,
    },
    createdAt: resolvedCreatedAt,
  };

  return { exercise, ideaContract };
}

/**
 * 5. Recommends exercises matching natural-language search conditions (`exercise-search`)
 * with concrete Korean rationale, cue highlights, and apparatus/spring setup checks.
 */
export function buildLocalMovementSearchRecommendations(
  input: MovementSearchAssistInput,
  exercises: readonly PilatesExercise[],
): EditableMovementSearchResult {
  const maxResults = Math.min(12, Math.max(1, Math.round(input.maxResults ?? 6)));
  const inspection = inspectSensitiveHealthText(input.queryText || '');
  const cleanQuery =
    inspection.sanitizedText
      .replace(/\[민감정보 제외\]/g, '')
      .replace(/\s+/g, ' ')
      .trim() || '코어 정렬 기본 동작';

  const tokens = cleanQuery
    .toLowerCase()
    .split(/[\s,·/]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);

  const area = input.strengthenArea;
  const preferredCategories = new Set<ClassBlockCategory>(
    area ? STRENGTHEN_AREA_CATEGORIES[area] ?? [] : [],
  );
  const preferredMuscles = area ? STRENGTHEN_AREA_MUSCLES[area] ?? [] : [];

  const apparatusMatches = exercises.filter(
    (ex) => input.apparatus === 'mixed' || ex.apparatus === input.apparatus,
  );
  const levelMatches = apparatusMatches.filter(
    (ex) => Number(ex.level) <= Number(input.level),
  );
  const candidatePool =
    levelMatches.length > 0
      ? levelMatches
      : apparatusMatches.length > 0
        ? apparatusMatches
        : [...exercises];

  const scored = candidatePool
    .map((ex) => {
      let score = isExerciseAutoEligible(ex) ? 20 : 0;
      const searchable = [
        ex.nameKo,
        ex.nameEn,
        ex.blockCategory,
        ex.bodyPosition,
        ex.springs,
        ex.breathPattern,
        ...ex.targetMuscles,
        ...ex.cues,
      ]
        .join(' ')
        .toLowerCase();

      let matchedTokenCount = 0;
      for (const token of tokens) {
        if (ex.nameKo.toLowerCase().includes(token) || ex.nameEn.toLowerCase().includes(token)) {
          score += 28;
          matchedTokenCount += 1;
        } else if (searchable.includes(token)) {
          score += 14;
          matchedTokenCount += 1;
        }
      }

      if (preferredCategories.has(ex.blockCategory)) {
        score += 18;
      }
      if (
        preferredMuscles.length > 0 &&
        ex.targetMuscles.some((m) =>
          preferredMuscles.some((target) => m.includes(target) || target.includes(m)),
        )
      ) {
        score += 14;
      }
      if (ex.level === input.level) {
        score += 10;
      }

      return { ex, score, matchedTokenCount };
    })
    .sort((a, b) => b.score - a.score || a.ex.id.localeCompare(b.ex.id))
    .slice(0, maxResults);

  const recommendations: MovementSearchRecommendationItem[] = scored.map(
    ({ ex, matchedTokenCount }) => {
      const apparatusShort = APPARATUS_LABELS[ex.apparatus]?.short ?? ex.apparatus;
      const positionKo = POSITION_LABELS[ex.bodyPosition]?.ko ?? ex.bodyPosition;
      const muscleText = ex.targetMuscles.slice(0, 3).join('·') || '코어 안정화근';
      const matchReasonKo =
        matchedTokenCount > 0
          ? `검색어 '${cleanQuery.slice(0, 28)}'와 연결되는 ${muscleText} 중심 ${apparatusShort} 동작입니다.`
          : `${apparatusShort} Lv.${ex.level} 조건에서 ${muscleText} 협응을 다루기 좋은 동작입니다.`;
      const cueHighlightKo = (ex.cues[0] || ex.breathPattern || '호흡과 중립 정렬을 유지하세요.').slice(
        0,
        240,
      );
      const setupCheckKo = `${positionKo} · 저항 ${ex.springs || 'Bodyweight'} · 권장 ${ex.defaultDurationMin}분 (진행 전 기구 장력·가동 범위 확인)`.slice(
        0,
        240,
      );

      return {
        exerciseId: ex.id.slice(0, 120),
        nameKo: ex.nameKo.slice(0, 160),
        nameEn: ex.nameEn.slice(0, 160),
        apparatus: ex.apparatus,
        blockCategory: ex.blockCategory,
        level: ex.level,
        defaultDurationMin: Math.min(30, Math.max(0.5, ex.defaultDurationMin)),
        springs: (ex.springs || 'Bodyweight').slice(0, 160),
        matchReasonKo: matchReasonKo.slice(0, 300),
        cueHighlightKo,
        setupCheckKo,
      };
    },
  );

  const apparatusLabel = formatApparatusTitle(input.apparatus);
  const querySummaryKo =
    recommendations.length > 0
      ? `'${cleanQuery}' 조건(${apparatusLabel} · Lv.${input.level} 이하)에 맞는 동작 ${recommendations.length}개를 추렸습니다.`
      : `'${cleanQuery}' 조건에 일치하는 동작을 찾지 못했습니다. 기구나 난이도 조건을 넓혀 다시 찾아보세요.`;

  return {
    kind: 'exercise-search',
    source: 'local-rule-engine',
    provider: 'none',
    model: null,
    cached: false,
    querySummaryKo: querySummaryKo.slice(0, 400),
    recommendations,
    guaranteesSafetyOrEffect: false,
    safetyDisclaimer: UNREVIEWED_CREATIVE_SAFETY_DISCLAIMER,
  };
}

