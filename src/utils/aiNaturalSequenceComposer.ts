import { APPARATUS_LABELS, CANONICAL_BLOCKS } from '../data/pilatesCatalog';
import { EQUIPMENT_OPTIONS, getExerciseEquipment } from '../data/equipmentCatalog';
import type {
  ApparatusType,
  AutoGenerateCriteria,
  ClassBlockCategory,
  ClassHistoryLog,
  DifficultyLevel,
  LayerMode,
  PilatesExercise,
  PropType,
  SequenceStep,
} from '../types/pilates';
import {
  exerciseMatchesCriteria,
  fitSequenceDuration,
  getRecentlyTaughtExerciseIds,
} from './sequenceEngine';

export type BodyCautionArea = 'lower-back' | 'knee' | 'wrist' | 'neck';

export interface StudioQuickRecipe {
  readonly id: string;
  readonly labelKo: string;
  readonly subtitleKo: string;
  readonly promptTemplateKo: string;
  readonly focusPreset: AutoGenerateCriteria['focusPreset'];
  readonly defaultLayer?: LayerMode;
  readonly defaultCautions?: readonly BodyCautionArea[];
  readonly suggestedLevel?: DifficultyLevel;
}

export const STUDIO_AI_QUICK_RECIPES: readonly StudioQuickRecipe[] = [
  {
    id: 'balanced-flow',
    labelKo: '전신 밸런스',
    subtitleKo: '호흡·코어·하체·상체 고른 흐름',
    promptTemplateKo: '전신 균형과 호흡 흐름이 자연스러운 50분 정규 수업으로 짜줘',
    focusPreset: 'full-body',
  },
  {
    id: 'core-pelvic',
    labelKo: '코어 · 골반 안정',
    subtitleKo: '복횡근·골반 중립 집중 강화',
    promptTemplateKo: '골반 중립과 심부 코어·복부 안정화 중심으로 탄탄하게 구성해줘',
    focusPreset: 'core-sculpt',
  },
  {
    id: 'glute-lower',
    labelKo: '힙 · 하체 라인',
    subtitleKo: '둔근·중둔근·하지 정렬 집중',
    promptTemplateKo: '둔근과 중둔근, 하체 정렬 위주로 매끄러운 시퀀스를 짜줘',
    focusPreset: 'glute-lower',
  },
  {
    id: 'posture-upper',
    labelKo: '라운드숄더 · 상체 오픈',
    subtitleKo: '굽은 등·흉추 가동성·견갑 안정',
    promptTemplateKo: '라운드숄더 완화와 흉추 오픈, 등·상체 정렬 위주로 구성해줘',
    focusPreset: 'posture-upper',
  },
  {
    id: 'first-class-gentle',
    labelKo: '초보자 첫 수업',
    subtitleKo: '부담 없이 따라오는 기초 안내',
    promptTemplateKo: '초급 입문 회원이 무리 없이 호흡과 기초 동작을 익히는 첫 수업으로 짜줘',
    focusPreset: 'full-body',
    defaultLayer: 'easy',
    suggestedLevel: '1.0',
  },
  {
    id: 'gentle-recovery',
    labelKo: '부드러운 이완 · 회복',
    subtitleKo: '허리·목 부담 줄인 스트레칭 흐름',
    promptTemplateKo: '허리와 목 부담 없이 척추 분절과 가동성, 부드러운 이완 위주로 짜줘',
    focusPreset: 'mobility-rehab',
    defaultLayer: 'easy',
    defaultCautions: ['lower-back', 'neck'],
  },
];

export const BODY_CAUTION_META: Record<
  BodyCautionArea,
  { readonly labelKo: string; readonly shortKo: string; readonly coachingNoteKo: string }
> = {
  'lower-back': {
    labelKo: '허리 보호',
    shortKo: '허리',
    coachingNoteKo: '허리 과신전 주의 · 골반 중립 및 가동 범위 조절',
  },
  knee: {
    labelKo: '무릎 보호',
    shortKo: '무릎',
    coachingNoteKo: '무릎 과굴곡·하중 주의 · 통증 없는 각도에서 진행',
  },
  wrist: {
    labelKo: '손목 보호',
    shortKo: '손목',
    coachingNoteKo: '손목 체중 부하 완화 · 전완 지지 또는 그립 각도 조절',
  },
  neck: {
    labelKo: '목 · 승모 보호',
    shortKo: '목',
    coachingNoteKo: '경추 과긴장 주의 · 시선 정렬 및 머리 지지 활용',
  },
};

export interface ParsedNaturalSequenceIntent {
  readonly apparatus: ApparatusType | 'mixed';
  readonly apparatusExplicit: boolean;
  readonly level: DifficultyLevel;
  readonly levelExplicit: boolean;
  readonly targetMinutes: number;
  readonly minutesExplicit: boolean;
  readonly focusPreset: AutoGenerateCriteria['focusPreset'];
  readonly cautions: BodyCautionArea[];
  readonly preferredLayer: LayerMode;
  readonly preferredProps: PropType[];
  readonly summaryThemeKo: string;
}

export function parseNaturalSequencePrompt(
  rawPrompt: string,
  defaults: {
    apparatus: ApparatusType | 'mixed';
    level: DifficultyLevel;
    targetMinutes: number;
    cautions?: readonly BodyCautionArea[];
  },
): ParsedNaturalSequenceIntent {
  const text = rawPrompt.trim();
  const lower = text.toLowerCase();

  let apparatus = defaults.apparatus;
  let apparatusExplicit = false;
  if (/복합|혼합|여러\s*기구|서킷|mixed/i.test(text)) {
    apparatus = 'mixed';
    apparatusExplicit = true;
  } else if (/리포머|reformer/i.test(text)) {
    apparatus = 'reformer';
    apparatusExplicit = true;
  } else if (/캐딜락|타워|cadillac|tower/i.test(text)) {
    apparatus = 'cadillac';
    apparatusExplicit = true;
  } else if (/체어|운다|chair/i.test(text)) {
    apparatus = 'chair';
    apparatusExplicit = true;
  } else if (/바렐|래더|스파인\s*코렉터|barrel/i.test(text)) {
    apparatus = 'barrel';
    apparatusExplicit = true;
  } else if (/매트|소도구\s*수업|mat/i.test(text)) {
    apparatus = 'mat';
    apparatusExplicit = true;
  }

  let level = defaults.level;
  let levelExplicit = false;
  if (/초급|기초|입문|초보|첫\s*수업|쉬운|부드러운|1\.0|beginner/i.test(text)) {
    level = '1.0';
    levelExplicit = true;
  } else if (/심화|상급|고급|챌린지|강도\s*높|빡센|어려운|2\.0|advanced/i.test(text)) {
    level = '2.0';
    levelExplicit = true;
  } else if (/중급|표준|정규|1\.5|intermediate/i.test(text)) {
    level = '1.5';
    levelExplicit = true;
  }

  let targetMinutes = defaults.targetMinutes;
  let minutesExplicit = false;
  const minMatch = text.match(/(\d{2,3})\s*분/);
  if (minMatch?.[1]) {
    const parsed = Number(minMatch[1]);
    if (Number.isInteger(parsed) && parsed >= 15 && parsed <= 120) {
      targetMinutes = parsed;
      minutesExplicit = true;
    }
  }

  let focusPreset: AutoGenerateCriteria['focusPreset'] = 'full-body';
  let summaryThemeKo = '전신 균형 흐름';
  if (
    /이완|회복|스트레칭|릴리즈|가동성|부드럽게|리커버리|쿨다운|mobility|rehab|stretch/i.test(lower)
  ) {
    focusPreset = 'mobility-rehab';
    summaryThemeKo = '가동성 · 부드러운 이완';
  } else if (
    /둔근|중둔근|힙|하체|다리|허벅지|런지|스쿼트|풋워크|glute|leg|hip|lower/i.test(lower)
  ) {
    focusPreset = 'glute-lower';
    summaryThemeKo = '둔근 · 하체 라인';
  } else if (
    /라운드\s*숄더|어깨|상체|등|흉추|거북목|자세\s*교정|오픈|로잉|upper|posture|back|shoulder/i.test(
      lower,
    )
  ) {
    focusPreset = 'posture-upper';
    summaryThemeKo = '상체 정렬 · 흉추 오픈';
  } else if (/코어|복부|복횡근|복사근|골반|파워하우스|헌드레드|core|abs|oblique/i.test(lower)) {
    focusPreset = 'core-sculpt';
    summaryThemeKo = '심부 코어 · 골반 안정';
  }

  const cautionSet = new Set<BodyCautionArea>(defaults.cautions ?? []);
  if (/허리|요추|디스크|척추\s*부담|과신전/i.test(text)) cautionSet.add('lower-back');
  if (/무릎|슬관절|도가니/i.test(text)) cautionSet.add('knee');
  if (/손목|터널|손바닥\s*부담/i.test(text)) cautionSet.add('wrist');
  if (/목|경추|승모|거북목\s*통증/i.test(text)) cautionSet.add('neck');
  const cautions = Array.from(cautionSet);

  const preferredLayer: LayerMode =
    cautions.length > 0 || level === '1.0' || focusPreset === 'mobility-rehab'
      ? 'easy'
      : level === '2.0' && /챌린지|심화|강도\s*높/i.test(text)
        ? 'hard'
        : 'standard';

  const preferredProps: PropType[] = [];
  if (/미니볼|mini\s*ball/i.test(text)) preferredProps.push('mini-ball');
  if (/써클링|매직\s*서클|링|magic\s*circle/i.test(text)) preferredProps.push('magic-circle');
  if (/폼롤러|롤러|foam\s*roller/i.test(text)) preferredProps.push('foam-roller');
  if (/밴드|테라밴드|band/i.test(text)) preferredProps.push('theraband');

  return {
    apparatus,
    apparatusExplicit,
    level,
    levelExplicit,
    targetMinutes,
    minutesExplicit,
    focusPreset,
    cautions,
    preferredLayer,
    preferredProps,
    summaryThemeKo,
  };
}

function isHighLoadForCaution(exercise: PilatesExercise, caution: BodyCautionArea): boolean {
  const hay =
    `${exercise.nameKo} ${exercise.nameEn} ${exercise.precautions} ${exercise.blockCategory}`.toLowerCase();
  if (caution === 'lower-back') {
    return (
      exercise.level === '2.0' &&
      (exercise.spinalPlanes.includes('extension') ||
        /티저|teaser|스완\s*다이브|잭나이프|롤오버|백\s*익스텐션/.test(hay))
    );
  }
  if (caution === 'knee') {
    return (
      (exercise.bodyPosition === 'kneeling' && exercise.level !== '1.0') ||
      /점프|런지|스쿼트|스텝업|니\s*스트레치|lunge|step-up/.test(hay)
    );
  }
  if (caution === 'wrist') {
    return (
      exercise.blockCategory === 'plank' ||
      (exercise.bodyPosition === 'quadruped' && !/포암|전완|forearm/.test(hay))
    );
  }
  if (caution === 'neck') {
    return (
      exercise.level !== '1.0' &&
      /헌드레드|크리스\s*크로스|싱글\s*레그\s*스트레치|더블\s*레그|티저|넥\s*풀|hundred|criss|teaser/.test(
        hay,
      )
    );
  }
  return false;
}

function scoreExerciseForIntent(
  exercise: PilatesExercise,
  intent: ParsedNaturalSequenceIntent,
  recentIds: ReadonlySet<string>,
  seed: number,
  indexInPool: number,
): number {
  let score = 10;
  const focusCategories: Record<AutoGenerateCriteria['focusPreset'], ClassBlockCategory[]> = {
    'full-body': ['warmup', 'footwork', 'bridging', 'core', 'upper-body', 'lower-body', 'cooldown'],
    'core-sculpt': ['warmup', 'core', 'plank', 'bridging', 'feet-in-straps', 'cooldown'],
    'glute-lower': ['warmup', 'footwork', 'bridging', 'lower-body', 'feet-in-straps', 'cooldown'],
    'posture-upper': ['warmup', 'upper-body', 'extension', 'bridging', 'cooldown'],
    'mobility-rehab': ['warmup', 'bridging', 'feet-in-straps', 'extension', 'cooldown'],
  };
  if (focusCategories[intent.focusPreset].includes(exercise.blockCategory)) {
    score += 18;
  }
  if (intent.preferredProps.some((prop) => exercise.props.includes(prop))) {
    score += 12;
  }
  if (!recentIds.has(exercise.id)) {
    score += 6;
  }
  for (const caution of intent.cautions) {
    if (isHighLoadForCaution(exercise, caution)) {
      score -= 40;
    }
  }
  // Deterministic variation jitter from seed so "다른 조합 추천" produces fresh valid combinations
  const hash = ((indexInPool + 1) * 2654435761 + seed * 40503) >>> 0;
  score += (hash % 11) * 0.9;
  return score;
}

export interface ComposedAiSequenceResult {
  readonly title: string;
  readonly subtitle: string;
  readonly summaryKo: string;
  readonly steps: SequenceStep[];
  readonly intent: ParsedNaturalSequenceIntent;
}

export function composeAiSmartSequence(params: {
  prompt: string;
  exercises: PilatesExercise[];
  ownedEquipment: string[];
  ownedProps: PropType[];
  historyLogs: ClassHistoryLog[];
  defaultApparatus: ApparatusType | 'mixed';
  defaultLevel: DifficultyLevel;
  defaultTargetMinutes: number;
  extraCautions?: readonly BodyCautionArea[];
  seed?: number;
}): ComposedAiSequenceResult {
  const {
    prompt,
    exercises,
    ownedEquipment,
    ownedProps,
    historyLogs,
    defaultApparatus,
    defaultLevel,
    defaultTargetMinutes,
    extraCautions = [],
    seed = 0,
  } = params;

  const intent = parseNaturalSequencePrompt(prompt, {
    apparatus: defaultApparatus,
    level: defaultLevel,
    targetMinutes: defaultTargetMinutes,
    cautions: extraCautions,
  });

  const availableEquipment = EQUIPMENT_OPTIONS.filter(
    (opt) =>
      ownedEquipment.includes(opt.id) &&
      (intent.apparatus === 'mixed' || opt.apparatusFamily === intent.apparatus),
  ).map((opt) => opt.id);

  const effectiveEquipment =
    availableEquipment.length > 0
      ? availableEquipment
      : EQUIPMENT_OPTIONS.filter(
          (opt) => intent.apparatus === 'mixed' || opt.apparatusFamily === intent.apparatus,
        ).map((opt) => opt.id);

  const effectiveEquipmentSet = new Set<string>(effectiveEquipment);

  const criteria: AutoGenerateCriteria = {
    apparatus: intent.apparatus,
    availableEquipment: effectiveEquipment,
    level: intent.level,
    defaultLayer: intent.preferredLayer,
    focusPreset: intent.focusPreset,
    preferredProps: intent.preferredProps.filter((prop) => ownedProps.includes(prop)),
    excludeDaysWindow: 7,
    targetMinutes: intent.targetMinutes,
  };

  const baseEligible = exercises.filter((exercise) => {
    const needs = getExerciseEquipment(exercise);
    return (
      exerciseMatchesCriteria(exercise, criteria) &&
      needs.requiredEquipment.every((id) => effectiveEquipmentSet.has(id)) &&
      needs.requiredProps.every((prop) => ownedProps.includes(prop))
    );
  });

  const cautionSafePool =
    intent.cautions.length > 0
      ? baseEligible.filter(
          (exercise) => !intent.cautions.some((caution) => isHighLoadForCaution(exercise, caution)),
        )
      : baseEligible;

  // Prefer individual studio movements over multi-movement external course playlists
  const nativeOnlyPool = cautionSafePool.filter(
    (exercise) => !exercise.id.startsWith('expanded-') && !exercise.nameKo.startsWith('['),
  );
  const pool =
    nativeOnlyPool.length >= 5
      ? nativeOnlyPool
      : cautionSafePool.length >= 4
        ? cautionSafePool
        : baseEligible;
  if (pool.length === 0) {
    throw new Error('현재 기구·난이도 조건에 맞는 동작이 부족합니다. 기구나 난이도를 넓혀 보세요.');
  }

  const recentIds = getRecentlyTaughtExerciseIds(historyLogs, 7);
  const scored = pool
    .map((exercise, idx) => ({
      exercise,
      score: scoreExerciseForIntent(exercise, intent, recentIds, seed, idx),
    }))
    .sort((a, b) => b.score - a.score);

  // Target realistic studio count: ~1 movement per 5.5 minutes (clamped 4..11)
  const targetCount = Math.max(4, Math.min(11, Math.round(intent.targetMinutes / 5.5)));

  const picked: PilatesExercise[] = [];
  const usedIds = new Set<string>();
  const pickBest = (predicate: (ex: PilatesExercise) => boolean): boolean => {
    const match = scored.find((item) => !usedIds.has(item.exercise.id) && predicate(item.exercise));
    if (!match) return false;
    usedIds.add(match.exercise.id);
    picked.push(match.exercise);
    return true;
  };

  // 1. Preparation anchor
  pickBest((ex) => ex.blockCategory === 'warmup');
  if (intent.targetMinutes >= 40) {
    pickBest((ex) => ex.blockCategory === 'footwork' || ex.blockCategory === 'warmup');
  }

  // 2. Cooldown anchor
  pickBest((ex) => ex.blockCategory === 'cooldown');
  if (intent.targetMinutes >= 45 && intent.focusPreset === 'mobility-rehab') {
    pickBest((ex) => ex.blockCategory === 'feet-in-straps' || ex.blockCategory === 'cooldown');
  }

  // 3. Main balanced blocks by focus preset
  const priorityCategories: Record<AutoGenerateCriteria['focusPreset'], ClassBlockCategory[]> = {
    'full-body': [
      'footwork',
      'bridging',
      'core',
      'lower-body',
      'upper-body',
      'extension',
      'feet-in-straps',
    ],
    'core-sculpt': ['core', 'bridging', 'plank', 'footwork', 'upper-body', 'feet-in-straps'],
    'glute-lower': ['footwork', 'bridging', 'lower-body', 'feet-in-straps', 'core'],
    'posture-upper': ['upper-body', 'extension', 'bridging', 'core', 'feet-in-straps'],
    'mobility-rehab': ['bridging', 'feet-in-straps', 'extension', 'upper-body', 'footwork'],
  };

  for (const cat of priorityCategories[intent.focusPreset]) {
    if (picked.length >= targetCount) break;
    pickBest((ex) => ex.blockCategory === cat);
  }

  // Fill remaining slots from highest-scored remaining exercises
  for (const item of scored) {
    if (picked.length >= targetCount) break;
    if (!usedIds.has(item.exercise.id)) {
      usedIds.add(item.exercise.id);
      picked.push(item.exercise);
    }
  }

  // Sort cleanly into Preparation -> Main (canonical block order) -> Cooldown
  const sectionRank = (ex: PilatesExercise) =>
    ex.blockCategory === 'warmup' ? 0 : ex.blockCategory === 'cooldown' ? 2 : 1;
  const blockRank = (ex: PilatesExercise) =>
    CANONICAL_BLOCKS.findIndex((b) => b.category === ex.blockCategory);

  picked.sort((a, b) => sectionRank(a) - sectionRank(b) || blockRank(a) - blockRank(b));

  const rawSteps: SequenceStep[] = picked.map((exercise, index) => {
    const classSection =
      exercise.blockCategory === 'warmup'
        ? 'preparation'
        : exercise.blockCategory === 'cooldown'
          ? 'cooldown'
          : 'main';
    return {
      stepId: `ai-step-${Date.now().toString(36)}-${seed}-${index + 1}-${exercise.id}`,
      order: index + 1,
      kind: 'exercise',
      classSection,
      blockCategory: exercise.blockCategory,
      exerciseId: exercise.id,
      durationMin: Math.max(1, exercise.defaultDurationMin || 5),
      selectedLayer: intent.preferredLayer,
    };
  });

  const fittedSteps = fitSequenceDuration(rawSteps, intent.targetMinutes);

  const appKo =
    intent.apparatus === 'mixed' ? '복합 기구' : APPARATUS_LABELS[intent.apparatus].short;
  const levelKo = intent.level === '1.0' ? '기초' : intent.level === '1.5' ? '중급' : '심화';
  const cautionBadge =
    intent.cautions.length > 0
      ? ` · ${intent.cautions.map((c) => BODY_CAUTION_META[c].shortKo).join('·')} 보호`
      : '';

  const prepCnt = fittedSteps.filter((s) => s.classSection === 'preparation').length;
  const mainCnt = fittedSteps.filter((s) => s.classSection === 'main').length;
  const coolCnt = fittedSteps.filter((s) => s.classSection === 'cooldown').length;

  const title = `${appKo} ${levelKo} · ${intent.summaryThemeKo} (${intent.targetMinutes}분)`;
  const subtitle = `AI 맞춤 구성${cautionBadge} · 동작 ${fittedSteps.length}개`;
  const summaryKo = `${appKo} ${levelKo} ${intent.targetMinutes}분${cautionBadge} 기준으로 준비 ${prepCnt}개 → 메인 ${mainCnt}개 → 마무리 ${coolCnt}개(총 ${fittedSteps.length}개 동작)를 완성했어요.`;

  return {
    title,
    subtitle,
    summaryKo,
    steps: fittedSteps,
    intent,
  };
}
