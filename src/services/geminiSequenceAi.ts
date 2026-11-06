import { CANONICAL_BLOCKS } from '../data/pilatesCatalog';
import { getExerciseEquipment, EQUIPMENT_OPTIONS } from '../data/equipmentCatalog';
import type {
  AutoGenerateCriteria,
  ClassBlockCategory,
  ClassHistoryLog,
  DifficultyLevel,
  PilatesExercise,
  SavedSequence,
  SequenceStep,
  SpinalPlane,
} from '../types/pilates';
import { isExerciseAutoEligible } from '../utils/exerciseReview';
import {
  applyTransitionAllowances,
  fitSequenceDuration,
  formatSecondsToMMSS,
  getMovementKey,
  getRecentlyTaughtExerciseIds,
  getSequenceDurations,
  getStepTiming,
  isRestStep,
} from '../utils/sequenceEngine';

export type AiThemeId =
  | 'posture-upper'
  | 'pelvic-core'
  | 'glute-lower'
  | 'spicy-burn'
  | 'spine-mobility'
  | 'office-evening'
  | 'beginner-foundation'
  | 'express-lunch';

export interface AiThemePreset {
  id: AiThemeId;
  labelKo: string;
  subtitleKo: string;
  focusPreset: AutoGenerateCriteria['focusPreset'];
  preferredBlocks: ClassBlockCategory[];
  preferredPlanes: SpinalPlane[];
  keywords: string[];
  recommendedMinutes?: number;
  recommendedLevel?: DifficultyLevel;
}

export const AI_THEME_PRESETS: readonly AiThemePreset[] = [
  {
    id: 'posture-upper',
    labelKo: '라운드숄더·거북목 & 흉추 오픈',
    subtitleKo: '상체 정렬·능형근/전거근 연결 및 흉추 신전·회전 집중',
    focusPreset: 'posture-upper',
    preferredBlocks: ['warmup', 'upper-body', 'extension', 'core', 'cooldown'],
    preferredPlanes: ['extension', 'rotation', 'neutral'],
    keywords: [
      '흉추',
      '어깨',
      '상체',
      '등',
      '광배근',
      '전거근',
      '능형근',
      '스완',
      '로잉',
      '암',
      '회전',
      '오픈',
      'chest',
      'swan',
      'row',
      'arm',
      'rotation',
      'thoracic',
    ],
  },
  {
    id: 'pelvic-core',
    labelKo: '골반 정렬 & 심부 코어 안정화',
    subtitleKo: '골반 시계·분절 브릿징과 복횡근·골반저근 중심 코어 컨트롤',
    focusPreset: 'core-sculpt',
    preferredBlocks: ['warmup', 'bridging', 'core', 'footwork', 'feet-in-straps', 'cooldown'],
    preferredPlanes: ['neutral', 'flexion'],
    keywords: [
      '골반',
      '코어',
      '복횡근',
      '복부',
      '브릿지',
      '브리지',
      '분절',
      '임프린트',
      '니 폴드',
      '힐 슬라이드',
      '헌드레드',
      'pelvic',
      'bridge',
      'core',
      'hundred',
      'knee fold',
    ],
  },
  {
    id: 'glute-lower',
    labelKo: '하체 움직임 & 중둔근·힙 스컬프',
    subtitleKo: '풋워크·스탠딩 런지/스쿠터·핏인스트랩으로 하지 정렬과 둔근 강화',
    focusPreset: 'glute-lower',
    preferredBlocks: ['warmup', 'footwork', 'bridging', 'lower-body', 'feet-in-straps', 'cooldown'],
    preferredPlanes: ['neutral', 'extension'],
    keywords: [
      '둔근',
      '중둔근',
      '대둔근',
      '하체',
      '풋워크',
      '런지',
      '스쿠터',
      '스플릿',
      '브릿지',
      '스트랩',
      '프로그',
      '내전근',
      '햄스트링',
      'glute',
      'footwork',
      'lunge',
      'scooter',
      'split',
      'frog',
    ],
  },
  {
    id: 'spicy-burn',
    labelKo: '전신 근력 & 코어 매운맛 버닝 플로우',
    subtitleKo: '코어·플랭크·하체 연속 챌린지로 전신 협응을 살펴보는 계획',
    focusPreset: 'core-sculpt',
    preferredBlocks: [
      'warmup',
      'footwork',
      'core',
      'lower-body',
      'plank',
      'upper-body',
      'cooldown',
    ],
    preferredPlanes: ['flexion', 'neutral', 'rotation'],
    keywords: [
      '플랭크',
      '파이크',
      '롱 스트레치',
      '엘리펀트',
      '헌드레드',
      '크리스크로스',
      '런지',
      '스쿠터',
      '앱',
      '코어',
      'plank',
      'pike',
      'burn',
      'hundred',
      'lunge',
    ],
    recommendedLevel: '1.5',
  },
  {
    id: 'spine-mobility',
    labelKo: '척추 분절 & 고관절 모빌리티 연습',
    subtitleKo: '분절 움직임·핏인스트랩·머메이드 측굴로 뻣뻣한 척추와 고관절 이완',
    focusPreset: 'mobility-rehab',
    preferredBlocks: ['warmup', 'bridging', 'feet-in-straps', 'extension', 'cooldown'],
    preferredPlanes: ['flexion', 'extension', 'lateral', 'rotation'],
    keywords: [
      '분절',
      '모빌리티',
      '가동성',
      '스트레치',
      '머메이드',
      '핏인스트랩',
      '레그써클',
      '프로그',
      '롤다운',
      '릴리즈',
      'mobility',
      'mermaid',
      'stretch',
      'circle',
      'articulation',
    ],
  },
  {
    id: 'office-evening',
    labelKo: '직장인 저녁반 가벼운 움직임 & 호흡',
    subtitleKo: '목·어깨 긴장 완화와 흉곽 호흡, 고관절 굴곡근 이완 중심 시퀀스',
    focusPreset: 'mobility-rehab',
    preferredBlocks: ['warmup', 'footwork', 'bridging', 'upper-body', 'feet-in-straps', 'cooldown'],
    preferredPlanes: ['extension', 'lateral', 'rotation', 'neutral'],
    keywords: [
      '호흡',
      '릴리즈',
      '폼롤러',
      '흉곽',
      '어깨',
      '장요근',
      '머메이드',
      '브릿지',
      '스트랩',
      '오픈',
      'breath',
      'release',
      'open',
      'mermaid',
    ],
  },
  {
    id: 'beginner-foundation',
    labelKo: '입문자 기초 정렬 & 호흡 인지',
    subtitleKo: '과도한 목·허리 긴장 없이 중립 골반과 코어 연결을 배우는 기초 루틴',
    focusPreset: 'full-body',
    preferredBlocks: ['warmup', 'footwork', 'bridging', 'core', 'upper-body', 'cooldown'],
    preferredPlanes: ['neutral', 'flexion', 'extension'],
    keywords: [
      '호흡',
      '기초',
      '준비',
      '관찰',
      '골반',
      '풋워크',
      '브리지',
      '니 폴드',
      '힐 슬라이드',
      'breath',
      'prep',
      'foundation',
      'basic',
    ],
    recommendedLevel: '1.0',
  },
  {
    id: 'express-lunch',
    labelKo: '런치 30분 타이트 전신 순환',
    subtitleKo: '스프링·포지션 전환을 최소화해 30분 안에 코어·상하체를 고르게 자극',
    focusPreset: 'full-body',
    preferredBlocks: ['warmup', 'footwork', 'core', 'lower-body', 'upper-body', 'cooldown'],
    preferredPlanes: ['neutral', 'flexion', 'extension', 'lateral'],
    keywords: ['30분', '전신', '협응', '코어', '풋워크', '브리지', '머메이드', 'flow', 'full body'],
    recommendedMinutes: 30,
  },
] as const;

export interface AiStepRationale {
  stepId: string;
  exerciseId: string;
  exerciseNameKo: string;
  blockCategory: ClassBlockCategory;
  durationMin: number;
  reasonKo: string;
}

export interface AiSequenceGenerationResult {
  titleKo: string;
  summaryKo: string;
  themeId: AiThemeId;
  themeLabelKo: string;
  customPrompt: string;
  engineSource: 'local-rules';
  modelName: string;
  targetMinutes: number;
  totalSeconds: number;
  excludedRecentCount: number;
  excludedExerciseNames: string[];
  zeroOverlapVerified: boolean;
  steps: SequenceStep[];
  rationales: AiStepRationale[];
  spinalPlanesCovered: SpinalPlane[];
  springChanges: number;
}

export interface AiSequenceGenerationInput {
  themeId: AiThemeId;
  customPrompt?: string;
  targetMinutes: number;
  restMinutes?: number;
  equipmentIds: string[];
  level: DifficultyLevel;
  excludeDaysWindow: number;
  targetGroupId?: string;
  exercises: PilatesExercise[];
  historyLogs: ClassHistoryLog[];
  savedSequences?: SavedSequence[];
}

export function collectExcludedRecentExercises(
  historyLogs: ClassHistoryLog[],
  savedSequences: SavedSequence[] = [],
  excludeDaysWindow: number,
  targetGroupId?: string,
  exercises: PilatesExercise[] = [],
): { excludedIds: Set<string>; excludedNames: string[] } {
  const excludedIds = getRecentlyTaughtExerciseIds(historyLogs, excludeDaysWindow, targetGroupId);

  if (excludeDaysWindow > 0 && savedSequences.length > 0) {
    const cutoffMs = Date.now() - excludeDaysWindow * 24 * 60 * 60 * 1000;
    for (const seq of savedSequences.slice(0, 5)) {
      const updatedMs = new Date(seq.updatedAt).getTime();
      if (Number.isFinite(updatedMs) && updatedMs >= cutoffMs) {
        for (const step of seq.steps) {
          if (!isRestStep(step) && step.exerciseId) {
            excludedIds.add(step.exerciseId);
          }
        }
      }
    }
  }

  const map = new Map(exercises.map((ex) => [ex.id, ex.nameKo]));
  const excludedNames = [...excludedIds]
    .map((id) => map.get(id))
    .filter((name): name is string => Boolean(name));

  return { excludedIds, excludedNames };
}

function extractPromptKeywords(prompt: string): {
  boostKeywords: string[];
  avoidKeywords: string[];
} {
  const clean = prompt.trim().toLowerCase();
  if (!clean) return { boostKeywords: [], avoidKeywords: [] };

  const avoidKeywords: string[] = [];
  const boostKeywords: string[] = [];

  // Detect negation patterns like "하체 빼고", "점프 제외", "목 무리 없이", "손목 통증"
  const avoidPatterns: Array<{ pattern: RegExp; terms: string[] }> = [
    {
      pattern: /하체\s*(빼고|제외|줄이|말고|많이\s*해서)/,
      terms: ['하체', '런지', '스쿠터', '스플릿'],
    },
    { pattern: /상체\s*(빼고|제외|줄이|말고)/, terms: ['상체', '로잉', '암', '삼두'] },
    { pattern: /손목\s*(통증|부담|아픈|제외|없이)/, terms: ['플랭크', '파이크', '롱 스트레치'] },
    {
      pattern: /목\s*(통증|부담|긴장|제외|없이)/,
      terms: ['헌드레드', '앱 파이브', '체스트 리프트'],
    },
    { pattern: /무릎\s*(통증|부담|제외|없이)/, terms: ['닐링', '런지', '스쿼트'] },
  ];

  for (const { pattern, terms } of avoidPatterns) {
    if (pattern.test(clean)) {
      avoidKeywords.push(...terms);
    }
  }

  const tokens = clean
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(
      (token) =>
        token.length >= 2 &&
        !['수업', '시퀀스', '짜줘', '만들어', '구성', '위주', '중심', '오늘', '회원'].includes(
          token,
        ),
    );

  boostKeywords.push(...tokens);
  return { boostKeywords, avoidKeywords };
}

function scoreExerciseForAiTheme(
  exercise: PilatesExercise,
  theme: AiThemePreset,
  customPrompt: string,
  level: DifficultyLevel,
  excludedIds: Set<string>,
  previous?: PilatesExercise,
): { score: number; reasonKo: string } {
  let score = 50;
  const reasons: string[] = [];

  if (excludedIds.has(exercise.id)) {
    score -= 500;
  } else {
    score += 20;
  }

  if (isExerciseAutoEligible(exercise)) {
    score += 25;
  }

  if (exercise.level === level) {
    score += 12;
  } else if (Number(exercise.level) < Number(level)) {
    score += 6;
  }

  const haystack = [
    exercise.nameKo,
    exercise.nameEn,
    ...exercise.targetMuscles,
    ...exercise.cues,
    exercise.breathPattern,
  ]
    .join(' ')
    .toLowerCase();

  // Theme keyword matching
  const matchedThemeKeywords = theme.keywords.filter((kw) => haystack.includes(kw.toLowerCase()));
  if (matchedThemeKeywords.length > 0) {
    score += Math.min(36, matchedThemeKeywords.length * 10);
    reasons.push(
      `‘${theme.labelKo}’ 테마 핵심 타겟(${exercise.targetMuscles.slice(0, 2).join('·')}) 부합`,
    );
  }

  if (theme.preferredBlocks.includes(exercise.blockCategory)) {
    score += 16;
  }

  const matchedPlanes = exercise.spinalPlanes.filter((p) => theme.preferredPlanes.includes(p));
  if (matchedPlanes.length > 0) {
    score += matchedPlanes.length * 7;
  }

  // Custom prompt matching
  const { boostKeywords, avoidKeywords } = extractPromptKeywords(customPrompt);
  const avoided = avoidKeywords.some((kw) => haystack.includes(kw.toLowerCase()));
  if (avoided) {
    score -= 120;
  }
  const boosted = boostKeywords.filter((kw) => haystack.includes(kw.toLowerCase()));
  if (boosted.length > 0) {
    score += Math.min(40, boosted.length * 14);
    reasons.push(`요청 키워드(${boosted.slice(0, 2).join(', ')}) 맞춤 반영`);
  }

  // Transition continuity
  if (previous) {
    if (previous.apparatus === exercise.apparatus && previous.springs === exercise.springs) {
      score += 10;
      reasons.push(`이전 동작과 동일 세팅(${exercise.springs})으로 전환 시간 절약`);
    }
    if (previous.box === exercise.box) {
      score += 6;
    }
  }

  if (reasons.length === 0) {
    const blockMeta = CANONICAL_BLOCKS.find((b) => b.category === exercise.blockCategory);
    reasons.push(
      `${blockMeta?.nameKo ?? exercise.blockCategory} 구간에서 ${exercise.targetMuscles.slice(0, 2).join('·')} 균형 활성`,
    );
  }

  return {
    score,
    reasonKo: reasons.slice(0, 2).join(' · '),
  };
}

function buildStepsAndFit(
  selectedExercises: PilatesExercise[],
  rationaleMap: Map<string, string>,
  input: AiSequenceGenerationInput,
  theme: AiThemePreset,
  excludedIds: Set<string>,
  excludedNames: string[],
  engineSource: 'local-rules',
  modelName: string,
  aiSummaryKo?: string,
): AiSequenceGenerationResult {
  const categoryOrder = (exercise: PilatesExercise) =>
    exercise.blockCategory === 'warmup'
      ? -1
      : exercise.blockCategory === 'cooldown'
        ? 100
        : CANONICAL_BLOCKS.findIndex((block) => block.category === exercise.blockCategory);

  const ordered = [...selectedExercises].sort((a, b) => categoryOrder(a) - categoryOrder(b));

  const rawSteps: SequenceStep[] = ordered.map((exercise, index) => ({
    stepId: `ai-step-${index + 1}-${exercise.id}`,
    order: index + 1,
    blockCategory: exercise.blockCategory,
    exerciseId: exercise.id,
    durationMin: exercise.defaultDurationMin,
    selectedLayer: 'standard',
    explanationSec: 20,
    transitionSec: 0,
  }));

  const exerciseMap = new Map(input.exercises.map((ex) => [ex.id, ex]));
  const timed = applyTransitionAllowances(rawSteps, exerciseMap);
  const restMinutes = Math.max(0, Math.min(input.targetMinutes - 5, input.restMinutes ?? 0));

  let fittedSteps: SequenceStep[];
  if (restMinutes > 0) {
    const restStep: SequenceStep = {
      kind: 'rest',
      stepId: 'rest-ai-generated-1',
      order: timed.length + 1,
      blockCategory: 'core',
      exerciseId: '',
      durationMin: restMinutes,
      selectedLayer: 'standard',
    };
    const withRest = fitSequenceDuration([...timed, restStep], input.targetMinutes);
    const onlyExercises = withRest.filter((step) => !isRestStep(step));
    const halfway = getSequenceDurations(onlyExercises).exerciseSec / 2;
    let elapsed = 0;
    let insertion = Math.max(1, Math.floor(onlyExercises.length / 2));
    let minDistance = Infinity;
    onlyExercises.forEach((step, idx) => {
      elapsed += getStepTiming(step).totalSec;
      if (idx < onlyExercises.length - 1 && Math.abs(elapsed - halfway) < minDistance) {
        minDistance = Math.abs(elapsed - halfway);
        insertion = idx + 1;
      }
    });
    onlyExercises.splice(insertion, 0, restStep);
    fittedSteps = onlyExercises.map((step, idx) => ({ ...step, order: idx + 1 }));
  } else {
    fittedSteps = fitSequenceDuration(timed, input.targetMinutes);
  }

  const rationales: AiStepRationale[] = fittedSteps
    .filter((step) => !isRestStep(step))
    .map((step) => {
      const ex = exerciseMap.get(step.exerciseId)!;
      const timing = getStepTiming(step, ex);
      return {
        stepId: step.stepId,
        exerciseId: ex.id,
        exerciseNameKo: ex.nameKo,
        blockCategory: ex.blockCategory,
        durationMin: Number((timing.totalSec / 60).toFixed(2)),
        reasonKo:
          rationaleMap.get(ex.id) ??
          `${theme.labelKo} 주제에 맞춰 ${ex.targetMuscles.slice(0, 2).join('·')} 협응과 호흡 흐름을 연결합니다.`,
      };
    });

  const durations = getSequenceDurations(fittedSteps);
  const planesCovered = [...new Set(ordered.flatMap((ex) => ex.spinalPlanes))] as SpinalPlane[];

  let springChanges = 0;
  for (let i = 1; i < ordered.length; i++) {
    if (ordered[i - 1].springs !== ordered[i].springs) {
      springChanges += 1;
    }
  }

  const zeroOverlapVerified = ordered.every((ex) => !excludedIds.has(ex.id));
  const equipNames = input.equipmentIds
    .map((id) => EQUIPMENT_OPTIONS.find((item) => item.id === id)?.labelKo ?? id)
    .join('·');

  const titleKo = `[로컬 추천] ${theme.labelKo} · ${input.targetMinutes}분 (${equipNames || '매트'})`;
  const summaryKo =
    aiSummaryKo ||
    `${input.targetMinutes}분(${formatSecondsToMMSS(durations.totalSec)}) 목표로 ${ordered.length}개 동작${restMinutes > 0 ? `과 중간 휴식 ${restMinutes}분` : ''}을 구성했습니다. 최근 ${input.excludeDaysWindow}일 내 진행·저장된 ${excludedIds.size}개 동작과의 중복을 피하고(${zeroOverlapVerified ? '겹침 0건' : '최소 반복'}), ‘${theme.labelKo}’ 주제${input.customPrompt?.trim() ? ` 및 “${input.customPrompt.trim()}” 요청` : ''}에 맞게 척추 움직임(${planesCovered.length}방향)과 기구 전환을 함께 살펴볼 수 있는 초안입니다. 시간·균형·동작 적합성은 강사가 확인해야 합니다.`;

  return {
    titleKo,
    summaryKo,
    themeId: theme.id,
    themeLabelKo: theme.labelKo,
    customPrompt: input.customPrompt?.trim() ?? '',
    engineSource,
    modelName,
    targetMinutes: input.targetMinutes,
    totalSeconds: durations.totalSec,
    excludedRecentCount: excludedIds.size,
    excludedExerciseNames: excludedNames,
    zeroOverlapVerified,
    steps: fittedSteps,
    rationales,
    spinalPlanesCovered: planesCovered,
    springChanges,
  };
}

export async function generateAiThematicSequence(
  input: AiSequenceGenerationInput,
): Promise<AiSequenceGenerationResult> {
  if (
    !Number.isFinite(input.targetMinutes) ||
    input.targetMinutes < 5 ||
    input.targetMinutes > 120 ||
    !Number.isFinite(input.restMinutes ?? 0) ||
    (input.restMinutes ?? 0) < 0 ||
    (input.restMinutes ?? 0) >= input.targetMinutes - 4
  ) {
    throw new Error('수업 시간은 5~120분, 휴식은 수업 시간보다 최소 5분 짧게 설정해 주세요.');
  }

  const theme = AI_THEME_PRESETS.find((item) => item.id === input.themeId) ?? AI_THEME_PRESETS[0];
  const { excludedIds, excludedNames } = collectExcludedRecentExercises(
    input.historyLogs,
    input.savedSequences ?? [],
    input.excludeDaysWindow,
    input.targetGroupId,
    input.exercises,
  );

  const requestedEquip = input.equipmentIds.length ? input.equipmentIds : ['mat'];
  const matchesEquipAndLevel = (ex: PilatesExercise) => {
    const req = getExerciseEquipment(ex).requiredEquipment;
    const equipOk =
      requestedEquip.includes(ex.apparatus) && req.every((id) => requestedEquip.includes(id));
    const levelOk = Number(ex.level) <= Number(input.level);
    return equipOk && levelOk;
  };

  const reviewedPool = input.exercises.filter(
    (ex) => isExerciseAutoEligible(ex) && matchesEquipAndLevel(ex),
  );
  // Review and recent-history exclusions are hard boundaries, never fallbacks.
  const workingPool = reviewedPool.filter((ex) => !excludedIds.has(ex.id));
  if (workingPool.length < 4) {
    throw new Error(
      '선택한 기구·난이도·중복 제외 조건에 맞는 검토 완료 동작이 4개 이상 필요합니다. 미검토 동작을 자동으로 섞지 않습니다. 동작 검토 후 다시 시도하거나 수동으로 구성하세요.',
    );
  }

  const exerciseMinutes = Math.max(8, input.targetMinutes - (input.restMinutes ?? 0));
  const targetStepCount =
    exerciseMinutes <= 20 ? 5 : exerciseMinutes <= 35 ? 6 : exerciseMinutes <= 50 ? 8 : 10;

  // Deterministic Smart Theme & History-Aware AI Sequence Selection
  const selected: PilatesExercise[] = [];
  const usedKeys = new Set<string>();
  const rationaleMap = new Map<string, string>();

  const pickBest = (pool: PilatesExercise[]) => {
    const available = pool.filter((ex) => !usedKeys.has(getMovementKey(ex)));
    if (!available.length) return undefined;
    const scored = available
      .map((ex) => ({
        ex,
        ...scoreExerciseForAiTheme(
          ex,
          theme,
          input.customPrompt ?? '',
          input.level,
          excludedIds,
          selected.at(-1),
        ),
      }))
      .sort((a, b) => b.score - a.score || a.ex.id.localeCompare(b.ex.id));
    const best = scored[0];
    if (best) {
      usedKeys.add(getMovementKey(best.ex));
      selected.push(best.ex);
      rationaleMap.set(best.ex.id, best.reasonKo);
      return best.ex;
    }
    return undefined;
  };

  // 1. Anchor warmup
  pickBest(workingPool.filter((ex) => ex.blockCategory === 'warmup'));

  // 2. Fill preferred theme blocks in canonical order
  const blockSequence: ClassBlockCategory[] = [
    ...theme.preferredBlocks.filter((b) => b !== 'warmup' && b !== 'cooldown'),
    ...CANONICAL_BLOCKS.map((b) => b.category).filter(
      (b) => b !== 'warmup' && b !== 'cooldown' && !theme.preferredBlocks.includes(b),
    ),
  ];

  let cursor = 0;
  while (selected.length < targetStepCount - 1 && cursor < blockSequence.length * 2) {
    const block = blockSequence[cursor % blockSequence.length];
    cursor += 1;
    const blockCandidates = workingPool.filter((ex) => ex.blockCategory === block);
    if (blockCandidates.length > 0) {
      pickBest(blockCandidates);
    }
  }

  // 3. Anchor cooldown
  pickBest(workingPool.filter((ex) => ex.blockCategory === 'cooldown'));

  // 4. Top up if still below targetStepCount
  while (selected.length < targetStepCount) {
    const next = pickBest(workingPool);
    if (!next) break;
  }

  return buildStepsAndFit(
    selected,
    rationaleMap,
    input,
    theme,
    excludedIds,
    excludedNames,
    'local-rules',
    '로컬 규칙 추천 · 외부 AI 미연결',
  );
}
