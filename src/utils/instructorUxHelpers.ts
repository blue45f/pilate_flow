import { APPARATUS_LABELS, POSITION_LABELS, PROP_LABELS } from '../data/pilatesCatalog';
import type {
  ApparatusType,
  ClassBlockCategory,
  DifficultyLevel,
  LayerMode,
  PilatesExercise,
  PropType,
} from '../types/pilates';
import { analyzeExerciseKinesiology } from './pilatesKinesiologyIntelligence';
import {
  getStudioTrackAdapters,
  type AnatomyVisualZone,
  type ExerciseAnatomyInsightData,
  type GoldenComboItem,
  type PlanBConstraint,
  type QuickRemixModifier,
  type ZeroTransitionRecommendation,
} from './studioTrackSlots';

export interface DifficultyDisplayMeta {
  readonly code: DifficultyLevel;
  readonly labelKo: string;
  readonly stars: string;
  readonly fullLabel: string;
  readonly ariaLabel: string;
  readonly tone: 'beginner' | 'intermediate' | 'advanced';
}

export const DIFFICULTY_META: Readonly<Record<DifficultyLevel, DifficultyDisplayMeta>> = {
  '1.0': {
    code: '1.0',
    labelKo: '입문',
    stars: '★☆☆',
    fullLabel: '입문 ★☆☆',
    ariaLabel: '난이도 입문, 별 3개 중 1개',
    tone: 'beginner',
  },
  '1.5': {
    code: '1.5',
    labelKo: '중급',
    stars: '★★☆',
    fullLabel: '중급 ★★☆',
    ariaLabel: '난이도 중급, 별 3개 중 2개',
    tone: 'intermediate',
  },
  '2.0': {
    code: '2.0',
    labelKo: '심화',
    stars: '★★★',
    fullLabel: '심화 ★★★',
    ariaLabel: '난이도 심화, 별 3개 중 3개',
    tone: 'advanced',
  },
};

export const DIFFICULTY_FILTER_OPTIONS: ReadonlyArray<{
  readonly id: 'all' | DifficultyLevel;
  readonly labelKo: string;
  readonly shortLabel: string;
}> = [
  { id: 'all', labelKo: '전체 난이도', shortLabel: '전체' },
  { id: '1.0', labelKo: '입문 ★☆☆', shortLabel: '입문 ★☆☆' },
  { id: '1.5', labelKo: '중급 ★★☆', shortLabel: '중급 ★★☆' },
  { id: '2.0', labelKo: '심화 ★★★', shortLabel: '심화 ★★★' },
];

export function formatDifficultyMeta(level: DifficultyLevel): DifficultyDisplayMeta {
  return DIFFICULTY_META[level] ?? DIFFICULTY_META['1.0'];
}

export interface EditorialHeroAsset {
  readonly webpSrc: string;
  readonly pngSrc: string;
  readonly fallbackSrc: string;
  readonly labelKo: string;
  readonly subtitleKo: string;
}

export const APPARATUS_EDITORIAL_HEROES: Readonly<Record<ApparatusType | 'mixed', EditorialHeroAsset>> = {
  reformer: {
    webpSrc: '/images/atelier-editorial/reformer-atelier-hero.webp',
    pngSrc: '/images/atelier-editorial/reformer-atelier-hero.png',
    fallbackSrc: '/images/atelier-v2/reformer-studio-3d.png',
    labelKo: '리포머',
    subtitleKo: '스프링 장력과 캐리지 흐름으로 전신 정렬을 섬세하게 조율해요',
  },
  cadillac: {
    webpSrc: '/images/atelier-editorial/cadillac-atelier-hero.webp',
    pngSrc: '/images/atelier-editorial/cadillac-atelier-hero.png',
    fallbackSrc: '/images/atelier-v2/cadillac-studio-3d.png',
    labelKo: '캐딜락',
    subtitleKo: '안정적인 베드와 바·스프링 지지로 척추 분절과 가동성을 열어요',
  },
  chair: {
    webpSrc: '/images/atelier-editorial/chair-atelier-hero.webp',
    pngSrc: '/images/atelier-editorial/chair-atelier-hero.png',
    fallbackSrc: '/images/atelier-v2/chair-studio-3d.png',
    labelKo: '체어',
    subtitleKo: '작은 지지면과 페달 저항으로 하체 근력과 밸런스를 끌어올려요',
  },
  barrel: {
    webpSrc: '/images/atelier-editorial/barrel-atelier-hero.webp',
    pngSrc: '/images/atelier-editorial/barrel-atelier-hero.png',
    fallbackSrc: '/images/atelier-v2/barrel-studio-3d.png',
    labelKo: '바렐',
    subtitleKo: '부드러운 곡면 지지로 옆구리·흉추 신전과 시원한 이완을 돕는 기구예요',
  },
  mat: {
    webpSrc: '/images/atelier-editorial/mat-props-atelier-hero.webp',
    pngSrc: '/images/atelier-editorial/mat-props-atelier-hero.png',
    fallbackSrc: '/images/atelier-ring-still-life.png',
    labelKo: '매트 · 소도구',
    subtitleKo: '중력과 소도구만으로 코어 중심과 호흡 리듬을 깊이 익혀요',
  },
  mixed: {
    webpSrc: '/images/atelier-editorial/reformer-atelier-hero.webp',
    pngSrc: '/images/atelier-editorial/reformer-atelier-hero.png',
    fallbackSrc: '/images/atelier-reformer-still-life.png',
    labelKo: '여러 기구',
    subtitleKo: '스튜디오 기구를 자유롭게 이어 입체적인 50분 수업을 설계해요',
  },
};

export function getApparatusEditorialHero(apparatus: ApparatusType | 'mixed'): EditorialHeroAsset {
  return APPARATUS_EDITORIAL_HEROES[apparatus] ?? APPARATUS_EDITORIAL_HEROES.reformer;
}

export interface AnatomyVisualAssetMeta {
  readonly zone: AnatomyVisualZone;
  readonly webpSrc: string;
  readonly pngSrc: string;
  readonly labelKo: string;
  readonly captionKo: string;
}

export const ANATOMY_VISUAL_ASSETS: Readonly<Record<AnatomyVisualZone, AnatomyVisualAssetMeta>> = {
  core: {
    zone: 'core',
    webpSrc: '/images/atelier-anatomy/anatomy-core-deep.webp',
    pngSrc: '/images/atelier-anatomy/anatomy-core-deep.png',
    labelKo: '심부 코어 · 복부 중심',
    captionKo: '복횡근과 복직근이 몸통 축을 단단히 감싸요',
  },
  glutes: {
    zone: 'glutes',
    webpSrc: '/images/atelier-anatomy/anatomy-glutes-lower.webp',
    pngSrc: '/images/atelier-anatomy/anatomy-glutes-lower.png',
    labelKo: '둔근 · 하체 지지축',
    captionKo: '중둔근·대둔근과 허벅지가 골반 수평을 받쳐줘요',
  },
  spine: {
    zone: 'spine',
    webpSrc: '/images/atelier-anatomy/anatomy-spine-back.webp',
    pngSrc: '/images/atelier-anatomy/anatomy-spine-back.png',
    labelKo: '척추 분절 · 등 라인',
    captionKo: '흉추 신전근과 다열근이 등을 길고 부드럽게 펴줘요',
  },
  shoulder: {
    zone: 'shoulder',
    webpSrc: '/images/atelier-anatomy/anatomy-shoulder-upper.webp',
    pngSrc: '/images/atelier-anatomy/anatomy-shoulder-upper.png',
    labelKo: '견갑 안정 · 상체 라인',
    captionKo: '전거근과 하부승모근이 어깨를 내려 목 긴장을 줄여줘요',
  },
  lateral: {
    zone: 'lateral',
    webpSrc: '/images/atelier-anatomy/anatomy-lateral-obliques.webp',
    pngSrc: '/images/atelier-anatomy/anatomy-lateral-obliques.png',
    labelKo: '옆구리 · 복사근 회전축',
    captionKo: '내·외복사근이 갈비뼈와 골반 옆선을 입체적으로 조여줘요',
  },
  hip: {
    zone: 'hip',
    webpSrc: '/images/atelier-anatomy/anatomy-hip-mobility.webp',
    pngSrc: '/images/atelier-anatomy/anatomy-hip-mobility.png',
    labelKo: '고관절 가동 · 골반 리듬',
    captionKo: '고관절 주변 심부 근육을 풀어 다리 움직임을 가볍게 해요',
  },
};

export interface PilatesFundamentalCard {
  readonly id: string;
  readonly titleKo: string;
  readonly shortRuleKo: string;
  readonly detailKo: string;
  readonly cueTipKo: string;
  readonly webpSrc: string;
  readonly pngSrc: string;
}

export const PILATES_FUNDAMENTAL_CARDS: readonly PilatesFundamentalCard[] = [
  {
    id: 'breathing-ribcage',
    titleKo: '갈비뼈로 느껴 보는 숨 (흉곽 호흡)',
    shortRuleKo: '양손을 갈비뼈 옆에 가볍게 대 보세요.',
    detailKo: '코로 숨을 들이쉴 때 양손 사이가 넓어지고, 내쉴 때 다시 가까워지는지 느껴 봐요. 어깨는 편안하게 두세요.',
    cueTipKo: '등을 대고 누우면 숨이 들어올 때 등 뒤가 바닥을 살짝 미는 느낌도 들 수 있어요.',
    webpSrc: '/images/atelier-fundamentals/fundamental-breathing-ribcage.webp',
    pngSrc: '/images/atelier-fundamentals/fundamental-breathing-ribcage.png',
  },
  {
    id: 'neutral-pelvis',
    titleKo: '허리가 편안한 골반 위치 (중립 골반)',
    shortRuleKo: '무릎을 세우고 누워 골반을 앞뒤로 작게 굴려요.',
    detailKo: '허리가 바닥에 가까워졌다가 멀어지는 걸 느껴 보세요. 두 방향 사이에서 허리에 힘을 덜 주고 편하게 숨 쉴 수 있는 자리를 찾아요.',
    cueTipKo: '사람마다 허리 곡선이 달라요. 바닥과 허리 사이의 간격을 똑같이 맞출 필요는 없어요.',
    webpSrc: '/images/atelier-fundamentals/fundamental-neutral-pelvis.webp',
    pngSrc: '/images/atelier-fundamentals/fundamental-neutral-pelvis.png',
  },
  {
    id: 'spring-mechanics',
    titleKo: '기구를 밀고 돌아올 때 (스프링 원리)',
    shortRuleKo: '스프링은 움직임을 도와주기도 하고, 미는 힘을 더 필요하게 하기도 해요.',
    detailKo: '리포머에 누워 발로 바를 밀면 판이 멀어지면서 스프링이 늘어나요. 무릎을 굽히면 스프링이 판을 되당기니, 마지막까지 발로 속도를 조절해 보세요.',
    cueTipKo: '같은 색 스프링도 기구마다 강도가 달라요. 처음에는 강사와 설정을 맞춰요.',
    webpSrc: '/images/atelier-fundamentals/fundamental-spring-mechanics.webp',
    pngSrc: '/images/atelier-fundamentals/fundamental-spring-mechanics.png',
  },
  {
    id: 'spinal-articulation',
    titleKo: '등을 움직이는 네 방향',
    shortRuleKo: '등은 둥글게 말고, 펴고, 옆으로 기울이고, 좌우로 돌릴 수 있어요.',
    detailKo: '바르게 앉아 가슴을 살짝 돌려 보세요. 이번에는 정면을 본 채 어깨를 옆으로 기울여요. 등이 도는 느낌과 옆구리가 늘어나는 느낌이 달라요.',
    cueTipKo: '처음에는 작게 움직여 보세요. 양쪽의 범위가 같지 않아도 괜찮아요.',
    webpSrc: '/images/atelier-fundamentals/fundamental-spinal-articulation.webp',
    pngSrc: '/images/atelier-fundamentals/fundamental-spinal-articulation.png',
  },
];

function inferAnatomyZone(exercise: PilatesExercise): AnatomyVisualZone {
  const musclesText = exercise.targetMuscles.join(' ');
  if (
    exercise.spinalPlanes.includes('lateral') ||
    exercise.spinalPlanes.includes('rotation') ||
    exercise.bodyPosition === 'side-lying' ||
    /복사근|옆구리|요방형근/.test(musclesText)
  ) {
    return 'lateral';
  }
  if (
    exercise.blockCategory === 'extension' ||
    exercise.spinalPlanes.includes('extension') ||
    /기립근|흉추|척추|광배/.test(musclesText)
  ) {
    return 'spine';
  }
  if (
    exercise.blockCategory === 'upper-body' ||
    exercise.blockCategory === 'plank' ||
    /삼각근|견갑|승모|삼두|이두|전거근|어깨/.test(musclesText)
  ) {
    return 'shoulder';
  }
  if (
    exercise.blockCategory === 'feet-in-straps' ||
    exercise.blockCategory === 'warmup' ||
    exercise.blockCategory === 'cooldown' ||
    /고관절|장요근|내전근/.test(musclesText)
  ) {
    return 'hip';
  }
  if (
    exercise.blockCategory === 'footwork' ||
    exercise.blockCategory === 'bridging' ||
    exercise.blockCategory === 'lower-body' ||
    /둔근|대퇴|햄스트링|종아리|하체/.test(musclesText)
  ) {
    return 'glutes';
  }
  return 'core';
}

function buildMovementBenefitsKo(exercise: PilatesExercise): readonly string[] {
  switch (exercise.blockCategory) {
    case 'warmup':
      return [
        '호흡 리듬과 갈비뼈 움직임을 부드럽게 깨워 수업 집중도를 높여줘요.',
        '본운동 전에 관절과 척추 주변 긴장을 편안하게 풀어주는 준비 동작이에요.',
      ];
    case 'footwork':
      return [
        '발로 기구나 바닥을 밀 때 무릎이 발끝을 따라 움직이는 느낌을 익혀요.',
        '허벅지 앞·뒤와 둔근에 고르게 힘을 실어 본운동 전 하체 워밍업으로 좋아요.',
      ];
    case 'bridging':
      return [
        '둔근과 허벅지 뒤쪽(햄스트링)을 활성화하면서 척추 분절 감각을 길러줘요.',
        '골반을 들어 올리고 내리는 흐름으로 몸 뒤쪽 라인을 탄탄하게 깨워줘요.',
      ];
    case 'core':
      return [
        '몸통 중심(복횡근·복직근)을 단단히 잡아 팔다리가 움직여도 흔들리지 않게 해요.',
        '날숨과 복부 수축을 연결해 허리 부담을 줄이면서 코어 지구력을 키워줘요.',
      ];
    case 'upper-body':
      return [
        '팔을 밀고 당길 때 어깨와 날개뼈가 함께 움직이는 연습이에요.',
        '팔이 움직이는 동안 목과 어깨에 힘을 덜 주는 범위를 찾아요.',
      ];
    case 'lower-body':
      return [
        '중둔근과 하체 지지 근육을 집중적으로 써서 골반 수평과 균형감을 키워줘요.',
        '한쪽씩 체중을 싣는 움직임으로 좌우 근력 밸런스를 고르게 맞춰줘요.',
      ];
    case 'plank':
      return [
        '어깨·코어·둔근을 하나의 사선 축으로 연결해 전신 지지력을 크게 높여줘요.',
        '팔로 밀어내는 힘과 복부 버팀 힘을 동시에 훈련해 몸통 안정감이 좋아져요.',
      ];
    case 'extension':
      return [
        '말린 등(흉추)을 길고 시원하게 펴주어 상체가 가볍고 곧아지는 느낌을 줘요.',
        '등 위쪽 근력을 부드럽게 깨워 평소 구부정한 자세 습관을 리프레시해요.',
      ];
    case 'feet-in-straps':
      return [
        '발에 건 줄이 다리를 받쳐 줘서 원하는 방향으로 천천히 움직여 볼 수 있어요.',
        '골반을 안정시킨 채 다리를 움직여 속근육 조절력과 유연성을 함께 챙겨줘요.',
      ];
    case 'cooldown':
    default:
      return [
        '수업 동안 열심히 쓴 근육을 길게 늘여주고 호흡을 차분하게 가라앉혀줘요.',
        '관절 긴장을 부드럽게 풀어 개운한 마무리감을 남기는 정리 동작이에요.',
      ];
  }
}

function buildSpringMechanicsKo(exercise: PilatesExercise): string {
  const springRaw = (exercise.springs || '').trim();
  const springText = !springRaw || springRaw === 'Bodyweight' ? '맨몸(자체 체중)' : springRaw;

  if (exercise.apparatus === 'mat') {
    return `${springText} · 기구 보조 없이 중력을 직접 이겨내며 코어 중심을 스스로 잡는 원리예요.`;
  }
  if (exercise.apparatus === 'barrel') {
    return `${springText} · 바렐의 곡면이 척추와 골반을 받쳐주어 가동 범위를 부드럽게 확장해요.`;
  }
  if (exercise.apparatus === 'chair') {
    if (exercise.blockCategory === 'lower-body' || exercise.bodyPosition === 'standing') {
      return `페달 스프링(${springText}) · 가벼울수록 체중을 스스로 버텨야 해 균형·둔근 난이도가 올라가요.`;
    }
    return `페달 스프링(${springText}) · 페달을 누를 땐 저항으로, 돌아올 땐 천천히 버티는 컨트롤 힘으로 작용해요.`;
  }
  if (exercise.apparatus === 'cadillac') {
    return `타워 스프링(${springText}) · 바·스트랩의 탄성이 척추 분절을 돕고, 돌아오는 구간에서 코어 조절력을 길러줘요.`;
  }
  // Reformer assist vs resistance mechanics
  if (
    exercise.blockCategory === 'plank' ||
    exercise.bodyPosition === 'kneeling' ||
    exercise.bodyPosition === 'quadruped' ||
    (exercise.blockCategory === 'core' && /1B|1Y|노랑|파랑/i.test(springRaw))
  ) {
    return `스프링 ${springText} (안정성 중심) · 스프링이 가벼울수록 캐리지 보조가 줄어 코어로 버티는 난이도가 높아져요.`;
  }
  if (exercise.blockCategory === 'feet-in-straps' || exercise.blockCategory === 'cooldown') {
    return `스프링 ${springText} (가이드 보조) · 스트랩 장력이 다리 무게를 부드럽게 받쳐 고관절 움직임을 매끄럽게 도와줘요.`;
  }
  return `스프링 ${springText} (근력 저항) · 캐리지를 밀고 당길 때 장력이 클수록 근육이 이겨내야 하는 저항이 커져요.`;
}

function buildSetupBasicsKo(exercise: PilatesExercise): string {
  const posKo = POSITION_LABELS[exercise.bodyPosition]?.ko ?? exercise.bodyPosition;
  const appKo = APPARATUS_LABELS[exercise.apparatus]?.ko ?? exercise.apparatus;
  const propsText = exercise.props
    .filter((prop) => prop !== 'none')
    .map((prop) => PROP_LABELS[prop]?.ko ?? prop)
    .join('·');
  const propSuffix = propsText ? ` · 소도구(${propsText})` : '';

  if (exercise.apparatus === 'reformer') {
    const footbarMap = {
      high: '풋바 높게',
      mid: '풋바 중간',
      low: '풋바 낮게',
      down: '풋바 내림',
      none: '풋바 미사용',
    } as const;
    const headrestMap = {
      up: '헤드레스트 올림',
      flat: '헤드레스트 평평하게',
      down: '헤드레스트 평평하게',
    } as const;
    const boxText =
      exercise.box === 'long-box'
        ? ' · 롱박스'
        : exercise.box === 'short-box'
          ? ' · 숏박스'
          : '';
    return `${appKo} ${posKo} · ${footbarMap[exercise.footbar]}, ${headrestMap[exercise.headrest]}${boxText}${propSuffix}`;
  }
  return `${appKo} ${posKo}에서 시작 정렬을 맞춘 뒤 천천히 움직여요${propSuffix}`;
}

export interface ResolvedIntuitiveAnatomyGuide extends ExerciseAnatomyInsightData {
  readonly setupBasicsKo: string;
  readonly breathBasicsKo: string;
  readonly visualAsset: AnatomyVisualAssetMeta;
}

export function buildIntuitiveAnatomyInsight(
  exercise: PilatesExercise,
): ResolvedIntuitiveAnatomyGuide {
  const adapters = getStudioTrackAdapters();
  const externalFromSlot = adapters.getExerciseAnatomyInsight?.(exercise);
  const embedded = (
    exercise as PilatesExercise & { anatomyInsight?: Partial<ExerciseAnatomyInsightData> }
  ).anatomyInsight;
  const kine = analyzeExerciseKinesiology(exercise);

  const zone =
    externalFromSlot?.anatomyVisualZone ?? embedded?.anatomyVisualZone ?? inferAnatomyZone(exercise);
  const agonistsKo =
    externalFromSlot?.agonistsKo?.length
      ? externalFromSlot.agonistsKo
      : embedded?.agonistsKo?.length
        ? embedded.agonistsKo
        : kine.agonistsKo;
  const stabilizersKo =
    externalFromSlot?.stabilizersKo?.length
      ? externalFromSlot.stabilizersKo
      : embedded?.stabilizersKo?.length
        ? embedded.stabilizersKo
        : kine.stabilizersKo;
  const benefitsKo =
    externalFromSlot?.benefitsKo?.length
      ? externalFromSlot.benefitsKo
      : embedded?.benefitsKo?.length
        ? embedded.benefitsKo
        : buildMovementBenefitsKo(exercise);
  const springMechanicsKo =
    externalFromSlot?.springMechanicsKo ??
    embedded?.springMechanicsKo ??
    buildSpringMechanicsKo(exercise);

  const fallbackFaults: { fault: string; fixCue: string }[] = [
    { fault: kine.commonFaultKo, fixCue: kine.correctionCueKo },
  ];
  if (exercise.precautions?.trim()) {
    fallbackFaults.push({
      fault: exercise.precautions.trim(),
      fixCue:
        exercise.cues[1] ||
        exercise.cues[0] ||
        '동작 범위를 줄이고 호흡을 길게 내쉬며 정렬을 먼저 맞춰요.',
    });
  }

  const commonFaultsKo =
    externalFromSlot?.commonFaultsKo?.length
      ? externalFromSlot.commonFaultsKo
      : embedded?.commonFaultsKo?.length
        ? embedded.commonFaultsKo
        : fallbackFaults;

  return {
    agonistsKo,
    stabilizersKo,
    benefitsKo,
    springMechanicsKo,
    commonFaultsKo,
    anatomyVisualZone: zone,
    setupBasicsKo:
      externalFromSlot?.setupBasicsKo ?? embedded?.setupBasicsKo ?? buildSetupBasicsKo(exercise),
    breathBasicsKo:
      externalFromSlot?.breathBasicsKo ??
      embedded?.breathBasicsKo ??
      (exercise.breathPattern?.trim()
        ? `${exercise.breathPattern} · 날숨에 복부 중심을 부드럽게 연결해요.`
        : '코로 마시며 준비하고, 입으로 내쉬며 움직임과 코어를 연결해요.'),
    visualAsset: ANATOMY_VISUAL_ASSETS[zone],
  };
}

const NEXT_BLOCK_FLOW: Readonly<Record<ClassBlockCategory, readonly ClassBlockCategory[]>> = {
  warmup: ['footwork', 'bridging', 'core'],
  footwork: ['bridging', 'core', 'feet-in-straps'],
  bridging: ['core', 'feet-in-straps', 'lower-body'],
  core: ['upper-body', 'lower-body', 'plank'],
  'upper-body': ['lower-body', 'extension', 'core'],
  'lower-body': ['plank', 'extension', 'feet-in-straps'],
  plank: ['extension', 'feet-in-straps', 'cooldown'],
  extension: ['feet-in-straps', 'cooldown', 'core'],
  'feet-in-straps': ['cooldown', 'bridging', 'core'],
  cooldown: ['cooldown', 'warmup'],
};

export function recommendZeroTransitionNext(
  lastExercise: PilatesExercise | undefined,
  pool: readonly PilatesExercise[],
  existingIds: ReadonlySet<string>,
  targetApparatus: ApparatusType | 'mixed' = 'mixed',
): readonly ZeroTransitionRecommendation[] {
  const adapterResult = getStudioTrackAdapters().recommendZeroTransitionNext?.(
    lastExercise,
    pool,
    existingIds,
  );
  if (adapterResult && adapterResult.length > 0) {
    return adapterResult.slice(0, 3);
  }

  const candidates = pool.filter((ex) => {
    if (existingIds.has(ex.id)) return false;
    if (lastExercise) return ex.apparatus === lastExercise.apparatus;
    if (targetApparatus !== 'mixed') return ex.apparatus === targetApparatus;
    return true;
  });

  if (!lastExercise) {
    const starterPool = candidates.length > 0 ? candidates : pool.filter((ex) => !existingIds.has(ex.id));
    const sorted = [...starterPool].sort((a, b) => {
      const aWarm = a.blockCategory === 'warmup' || a.blockCategory === 'footwork' ? 1 : 0;
      const bWarm = b.blockCategory === 'warmup' || b.blockCategory === 'footwork' ? 1 : 0;
      return bWarm - aWarm || Number(a.level) - Number(b.level);
    });
    return sorted.slice(0, 3).map((exercise) => ({
      exercise,
      reasonKo: `${APPARATUS_LABELS[exercise.apparatus].short} 첫 흐름 시작 추천`,
      keepsPosition: false,
      keepsSpring: false,
    }));
  }

  const nextCategories = NEXT_BLOCK_FLOW[lastExercise.blockCategory] ?? [];
  const lastSpringNorm = (lastExercise.springs || '').trim().toLowerCase();

  const scored = candidates.map((ex) => {
    let score = 0;
    const keepsPosition = ex.bodyPosition === lastExercise.bodyPosition;
    const exSpringNorm = (ex.springs || '').trim().toLowerCase();
    const keepsSpring = Boolean(lastSpringNorm && exSpringNorm && lastSpringNorm === exSpringNorm);
    const keepsBox = ex.box === lastExercise.box;
    const keepsFootbar = ex.footbar === lastExercise.footbar;

    if (keepsPosition) score += 38;
    if (keepsSpring) score += 32;
    if (keepsBox) score += 14;
    if (keepsFootbar) score += 8;
    if (nextCategories.includes(ex.blockCategory)) score += 16;
    if (ex.blockCategory === lastExercise.blockCategory) score += 6;

    const posKo = POSITION_LABELS[ex.bodyPosition]?.ko ?? ex.bodyPosition;
    let reasonKo = `${APPARATUS_LABELS[ex.apparatus].short} 자연 연결`;
    if (keepsPosition && keepsSpring) {
      reasonKo = `같은 ${posKo} · 스프링 그대로`;
    } else if (keepsPosition) {
      reasonKo = `같은 ${posKo} 유지 · 동선 최소`;
    } else if (keepsSpring) {
      reasonKo = `스프링 유지 · 바로 이어가기`;
    } else if (keepsBox && ex.box !== 'none') {
      reasonKo = `박스 세팅 그대로 연결`;
    } else if (nextCategories.includes(ex.blockCategory)) {
      reasonKo = `다음 흐름으로 자연스럽게 연결`;
    }

    return { exercise: ex, score, reasonKo, keepsPosition, keepsSpring };
  });

  scored.sort((a, b) => b.score - a.score || Number(a.exercise.level) - Number(b.exercise.level));
  return scored.slice(0, 3).map(({ exercise, reasonKo, keepsPosition, keepsSpring }) => ({
    exercise,
    reasonKo,
    keepsPosition,
    keepsSpring,
  }));
}

interface ComboBlueprint {
  readonly id: string;
  readonly titleKo: string;
  readonly subtitleKo: string;
  readonly apparatus: ApparatusType;
  readonly level: DifficultyLevel;
  readonly preferredCategories: readonly ClassBlockCategory[];
  readonly preferredPosition?: PilatesExercise['bodyPosition'];
  readonly flowNoteKo: string;
}

const GOLDEN_COMBO_BLUEPRINTS: readonly ComboBlueprint[] = [
  {
    id: 'golden-reformer-supine-flow',
    titleKo: '리포머 눕기 10분 황금 흐름',
    subtitleKo: '풋워크 → 브릿지 → 코어',
    apparatus: 'reformer',
    level: '1.0',
    preferredCategories: ['footwork', 'bridging', 'core'],
    preferredPosition: 'supine',
    flowNoteKo: '누운 자세 그대로 · 스프링 변화 최소화',
  },
  {
    id: 'golden-reformer-strap-relax',
    titleKo: '리포머 스트랩 10분 하체·이완',
    subtitleKo: '고관절 순환 → 햄스트링 → 마무리',
    apparatus: 'reformer',
    level: '1.0',
    preferredCategories: ['feet-in-straps', 'lower-body', 'cooldown'],
    flowNoteKo: '스트랩 한 번 걸고 3동작 연속 진행',
  },
  {
    id: 'golden-mat-core-flow',
    titleKo: '매트 코어 10분 콤보',
    subtitleKo: '호흡 예열 → 복부 중심 → 등 펴기',
    apparatus: 'mat',
    level: '1.0',
    preferredCategories: ['warmup', 'core', 'extension'],
    flowNoteKo: '매트 위 눕기→엎드리기 매끄러운 연결',
  },
  {
    id: 'golden-cadillac-spine-flow',
    titleKo: '캐딜락 척추 10분 콤보',
    subtitleKo: '분절 예열 → 코어 → 상체 이완',
    apparatus: 'cadillac',
    level: '1.5',
    preferredCategories: ['warmup', 'core', 'upper-body'],
    flowNoteKo: '푸시스루·롤백바 동선 그대로 연결',
  },
  {
    id: 'golden-chair-glute-flow',
    titleKo: '체어 힙·밸런스 10분 콤보',
    subtitleKo: '하체 지지 → 코어 밸런스 → 마무리',
    apparatus: 'chair',
    level: '1.5',
    preferredCategories: ['lower-body', 'core', 'cooldown'],
    flowNoteKo: '페달 스프링 유지하며 집중 자극',
  },
  {
    id: 'golden-barrel-open-flow',
    titleKo: '바렐 옆구리·가슴 열기 10분',
    subtitleKo: '측굴 → 흉추 신전 → 이완 마무리',
    apparatus: 'barrel',
    level: '1.0',
    preferredCategories: ['core', 'extension', 'cooldown'],
    flowNoteKo: '바렐 곡면에서 상체 시원하게 확장',
  },
];

export function resolveGoldenTenMinCombos(
  apparatus: ApparatusType | 'mixed',
  pool: readonly PilatesExercise[],
): readonly GoldenComboItem[] {
  const adapterCombos = getStudioTrackAdapters().getGoldenCombos?.(apparatus, pool);
  if (adapterCombos && adapterCombos.length > 0) {
    return adapterCombos.slice(0, 4);
  }

  const orderedBlueprints =
    apparatus === 'mixed'
      ? GOLDEN_COMBO_BLUEPRINTS
      : [
          ...GOLDEN_COMBO_BLUEPRINTS.filter((bp) => bp.apparatus === apparatus),
          ...GOLDEN_COMBO_BLUEPRINTS.filter((bp) => bp.apparatus !== apparatus),
        ];

  const resolved: GoldenComboItem[] = [];
  for (const bp of orderedBlueprints) {
    const appPool = pool.filter((ex) => ex.apparatus === bp.apparatus);
    if (appPool.length < 2) continue;
    const picked: PilatesExercise[] = [];
    const usedIds = new Set<string>();

    for (const cat of bp.preferredCategories) {
      const match =
        appPool.find(
          (ex) =>
            !usedIds.has(ex.id) &&
            ex.blockCategory === cat &&
            (!bp.preferredPosition || ex.bodyPosition === bp.preferredPosition),
        ) ??
        appPool.find((ex) => !usedIds.has(ex.id) && ex.blockCategory === cat) ??
        appPool.find((ex) => !usedIds.has(ex.id));
      if (match) {
        picked.push(match);
        usedIds.add(match.id);
      }
    }

    if (picked.length >= 2) {
      const durationMin = Math.max(
        8,
        Math.min(12, picked.reduce((sum, ex) => sum + (ex.defaultDurationMin || 3), 0)),
      );
      resolved.push({
        id: bp.id,
        titleKo: bp.titleKo,
        subtitleKo: bp.subtitleKo,
        durationMin,
        apparatus: bp.apparatus,
        level: bp.level,
        exercises: picked,
        flowNoteKo: bp.flowNoteKo,
      });
    }
    if (resolved.length >= 3) break;
  }

  return resolved;
}

export const REMIX_PROP_OPTIONS: ReadonlyArray<{
  readonly id: PropType;
  readonly labelKo: string;
  readonly cueHintKo: string;
}> = [
  { id: 'none', labelKo: '소도구 없음', cueHintKo: '기본 정렬과 호흡에 집중해요' },
  {
    id: 'mini-ball',
    labelKo: '미니볼',
    cueHintKo: '무릎 사이나 등 뒤에 미니볼을 가볍게 눌러 내전근·코어 연결을 높여요',
  },
  {
    id: 'magic-circle',
    labelKo: '써클링',
    cueHintKo: '양손 또는 무릎 사이 써클링을 부드럽게 조이며 중심축 힘을 깨워요',
  },
  {
    id: 'foam-roller',
    labelKo: '폼롤러',
    cueHintKo: '폼롤러 위 불안정한 지지면에서 심부 밸런스 근육을 자연스럽게 깨워요',
  },
  {
    id: 'theraband',
    labelKo: '밴드',
    cueHintKo: '탄력 밴드의 일정한 저항을 느끼며 끝 구간까지 부드럽게 컨트롤해요',
  },
];

export const REMIX_MODIFIER_OPTIONS: ReadonlyArray<{
  readonly id: QuickRemixModifier;
  readonly labelKo: string;
  readonly nameSuffixKo: string;
  readonly levelDelta: number;
  readonly cueHintKo: string;
}> = [
  {
    id: 'standard',
    labelKo: '기본 리듬',
    nameSuffixKo: '',
    levelDelta: 0,
    cueHintKo: '기본 호흡 템포로 정확하게 반복해요',
  },
  {
    id: 'single-leg',
    labelKo: '한 다리',
    nameSuffixKo: '한 다리 변형',
    levelDelta: 1,
    cueHintKo: '한쪽 다리를 들어 골반 수평이 흔들리지 않도록 좌우 번갈아 진행해요',
  },
  {
    id: 'pulse',
    labelKo: '펄스',
    nameSuffixKo: '펄스 변형',
    levelDelta: 1,
    cueHintKo: '정점 구간에서 3~5회 짧고 탄력 있게 펄스하며 타겟 근육 자극을 모아요',
  },
  {
    id: 'isometric-hold',
    labelKo: '정점 홀드',
    nameSuffixKo: '홀드 변형',
    levelDelta: 1,
    cueHintKo: '가장 힘이 잘 들어오는 지점에서 3초 멈춰 호흡과 정렬을 깊게 느껴요',
  },
  {
    id: 'slow-tempo',
    labelKo: '천천히 컨트롤',
    nameSuffixKo: '슬로우 컨트롤',
    levelDelta: 0,
    cueHintKo: '4박자로 천천히 늘리고 4박자로 부드럽게 돌아오며 속근육을 정교하게 써요',
  },
];

function shiftDifficulty(base: DifficultyLevel, delta: number): DifficultyLevel {
  const order: DifficultyLevel[] = ['1.0', '1.5', '2.0'];
  const idx = Math.max(0, order.indexOf(base));
  const next = Math.max(0, Math.min(order.length - 1, idx + delta));
  return order[next] ?? base;
}

export function buildQuickRemixedExercise(
  baseExercise: PilatesExercise,
  options: { prop?: PropType; modifier?: QuickRemixModifier },
): PilatesExercise {
  const adapterRemix = getStudioTrackAdapters().remixExerciseVariation?.(baseExercise, options);
  if (adapterRemix) return adapterRemix;

  const prop = options.prop ?? 'none';
  const modifier = options.modifier ?? 'standard';
  const propMeta = REMIX_PROP_OPTIONS.find((item) => item.id === prop) ?? REMIX_PROP_OPTIONS[0];
  const modMeta =
    REMIX_MODIFIER_OPTIONS.find((item) => item.id === modifier) ?? REMIX_MODIFIER_OPTIONS[0];

  const tags: string[] = [];
  if (prop !== 'none') tags.push(propMeta.labelKo);
  if (modMeta.nameSuffixKo) tags.push(modMeta.nameSuffixKo);
  const tagText = tags.length > 0 ? ` (${tags.join(' · ')})` : ' (변형)';

  const nextLevel = shiftDifficulty(
    baseExercise.level,
    modMeta.levelDelta + (prop === 'foam-roller' ? 1 : 0),
  );
  const nextProps: PropType[] = prop === 'none' ? [...baseExercise.props] : [prop];
  const remixCues = [
    ...(prop !== 'none' ? [propMeta.cueHintKo] : []),
    ...(modifier !== 'standard' ? [modMeta.cueHintKo] : []),
    ...baseExercise.cues,
  ].slice(0, 4);

  return {
    ...baseExercise,
    id: `ex-remix-${baseExercise.id}-${prop}-${modifier}-${Date.now().toString(36)}`,
    nameKo: `${baseExercise.nameKo}${tagText}`,
    nameEn: `${baseExercise.nameEn} (${[prop !== 'none' ? prop : '', modifier !== 'standard' ? modifier : '']
      .filter(Boolean)
      .join(' ') || 'Variation'})`,
    props: nextProps,
    level: nextLevel,
    isUnilateral: baseExercise.isUnilateral || modifier === 'single-leg',
    cues: remixCues,
    isCustom: true,
    createdAt: new Date().toISOString(),
    review: undefined,
  };
}

export interface LivePlanBSuggestionResult {
  readonly constraint: PlanBConstraint;
  readonly labelKo: string;
  readonly instantTipKo: string;
  readonly recommendedLayer?: LayerMode;
  readonly alternatives: readonly PilatesExercise[];
}

export const LIVE_PLAN_B_OPTIONS: ReadonlyArray<{
  readonly id: PlanBConstraint;
  readonly labelKo: string;
}> = [
  { id: 'wrist', labelKo: '손목 편하게' },
  { id: 'neck', labelKo: '목 부담 ↓' },
  { id: 'knee', labelKo: '무릎 편하게' },
  { id: 'easier', labelKo: '난이도 ↓' },
  { id: 'harder', labelKo: '난이도 ↑' },
];

export function findLivePlanBAlternatives(
  currentExercise: PilatesExercise,
  constraint: PlanBConstraint,
  pool: readonly PilatesExercise[],
  excludeIds: ReadonlySet<string> = new Set(),
): LivePlanBSuggestionResult {
  const adapterAlts = getStudioTrackAdapters().findPlanBAlternative?.(
    currentExercise,
    constraint,
    pool,
  );

  const labelKo =
    LIVE_PLAN_B_OPTIONS.find((item) => item.id === constraint)?.labelKo ?? '대체 동작';

  let instantTipKo = currentExercise.layers.easy || '동작 범위를 줄이고 호흡에 맞춰 천천히 진행하세요.';
  let recommendedLayer: LayerMode | undefined;

  if (constraint === 'wrist') {
    instantTipKo =
      '손바닥 대신 팔꿈치(전완) 지지나 주먹 지지로 바꾸고, 바로 누운/앉은 대체 동작으로 이어갈 수 있어요.';
    recommendedLayer = 'easy';
  } else if (constraint === 'neck') {
    instantTipKo =
      '머리를 매트·헤드레스트에 편히 내려두고 진행하거나, 목을 들지 않는 동작으로 바로 바꿀 수 있어요.';
    recommendedLayer = 'easy';
  } else if (constraint === 'knee') {
    instantTipKo =
      '무릎 굽힘 각도를 줄이고 패드를 덧대거나, 누운·앉은 지지 동작으로 바로 전환하세요.';
    recommendedLayer = 'easy';
  } else if (constraint === 'easier') {
    instantTipKo = currentExercise.layers.easy
      ? `즉시 완화 큐: ${currentExercise.layers.easy}`
      : '가동 범위를 절반으로 줄이고 지지면을 넓혀 부담을 덜어주세요.';
    recommendedLayer = 'easy';
  } else if (constraint === 'harder') {
    instantTipKo = currentExercise.layers.hard
      ? `즉시 심화 큐: ${currentExercise.layers.hard}`
      : '정점에서 2초 멈추거나 한 다리 지지 변형으로 코어 도전을 높여보세요.';
    recommendedLayer = 'hard';
  }

  if (adapterAlts && adapterAlts.length > 0) {
    return {
      constraint,
      labelKo,
      instantTipKo,
      recommendedLayer,
      alternatives: adapterAlts.slice(0, 2),
    };
  }

  const sameApparatus = pool.filter(
    (ex) => ex.id !== currentExercise.id && !excludeIds.has(ex.id) && ex.apparatus === currentExercise.apparatus,
  );
  const searchPool =
    sameApparatus.length > 0
      ? sameApparatus
      : pool.filter((ex) => ex.id !== currentExercise.id && !excludeIds.has(ex.id));

  const filtered = searchPool.filter((ex) => {
    const text = `${ex.nameKo} ${ex.cues.join(' ')} ${ex.precautions}`.toLowerCase();
    if (constraint === 'wrist') {
      return (
        ex.blockCategory !== 'plank' &&
        ex.bodyPosition !== 'quadruped' &&
        !/플랭크|푸시업|손목/.test(text)
      );
    }
    if (constraint === 'neck') {
      return (
        !ex.spinalPlanes.includes('flexion') ||
        ex.blockCategory === 'footwork' ||
        ex.blockCategory === 'bridging' ||
        ex.blockCategory === 'feet-in-straps' ||
        ex.blockCategory === 'lower-body'
      );
    }
    if (constraint === 'knee') {
      return ex.bodyPosition !== 'kneeling' && ex.bodyPosition !== 'quadruped';
    }
    if (constraint === 'easier') {
      return Number(ex.level) <= Number(currentExercise.level);
    }
    return Number(ex.level) >= Number(currentExercise.level);
  });

  const ranked = (filtered.length > 0 ? filtered : searchPool)
    .slice()
    .sort((a, b) => {
      const aSameCat = a.blockCategory === currentExercise.blockCategory ? 1 : 0;
      const bSameCat = b.blockCategory === currentExercise.blockCategory ? 1 : 0;
      if (constraint === 'easier') {
        return Number(a.level) - Number(b.level) || bSameCat - aSameCat;
      }
      if (constraint === 'harder') {
        return Number(b.level) - Number(a.level) || bSameCat - aSameCat;
      }
      return bSameCat - aSameCat || Number(a.level) - Number(b.level);
    });

  return {
    constraint,
    labelKo,
    instantTipKo,
    recommendedLayer,
    alternatives: ranked.slice(0, 2),
  };
}
