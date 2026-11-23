import { APPARATUS_LABELS, POSITION_LABELS, PROP_LABELS } from '../data/pilatesCatalog';
import type {
  ApparatusType,
  DifficultyLevel,
  PilatesExercise,
  SequenceStep,
} from '../types/pilates';
import {
  buildIntuitiveAnatomyInsight,
  formatDifficultyMeta,
  type ResolvedIntuitiveAnatomyGuide,
} from './instructorUxHelpers';
import {
  cleanSpokenKoreanText,
  formatKoreanParticle,
  formatSpringsSpokenKo,
} from './naturalVoiceScriptBuilder';
import { isRestStep } from './sequenceEngine';
import type { AnatomyVisualZone } from './studioTrackSlots';

export type MasteryStatus = 'unseen' | 'practicing' | 'ready' | 'mastered';

export type MasteryRating = 'again' | 'good' | 'mastered';

export type MovementQuizCategory =
  | 'spring-mechanics'
  | 'breath-cue'
  | 'fault-correction'
  | 'layer-modification';

export type SpringRoleType = 'assist' | 'resistance' | 'stability' | 'bodyweight';

export type ExerciseAnatomyGuide = ResolvedIntuitiveAnatomyGuide;

export interface MovementMasteryRecord {
  readonly exerciseId: string;
  readonly status: MasteryStatus;
  readonly streak: number;
  readonly reviewCount: number;
  readonly lastReviewedAt: string;
  readonly nextReviewAt: string;
}

export interface MovementQuizQuestion {
  readonly id: string;
  readonly category: MovementQuizCategory;
  readonly categoryLabelKo: string;
  readonly promptKo: string;
  readonly optionsKo: string[];
  readonly correctIndex: number;
  readonly explanationKo: string;
}

export interface MovementCueScriptByLevel {
  readonly easy: string;
  readonly standard: string;
  readonly challenge: string;
}

export interface MovementBreathRhythm {
  readonly inhaleSec: number;
  readonly exhaleSec: number;
  readonly inhaleActionKo: string;
  readonly exhaleActionKo: string;
}

export interface MovementStudyCard {
  readonly exerciseId: string;
  readonly nameKo: string;
  readonly nameEn: string;
  readonly apparatus: ApparatusType;
  readonly apparatusLabelKo: string;
  readonly positionLabelKo: string;
  readonly difficultyCode: DifficultyLevel;
  readonly difficultyLabelKo: string;
  readonly difficultyTone: 'beginner' | 'intermediate' | 'advanced';
  readonly springsCode: string;
  readonly springsSpokenKo: string;
  readonly springRole: SpringRoleType;
  readonly springRoleLabelKo: string;
  readonly springPrincipleKo: string;
  readonly breathCueKo: string;
  readonly breathRhythm: MovementBreathRhythm;
  readonly setupChecklistKo: readonly [string, string, string];
  readonly keyCuesKo: readonly string[];
  readonly commonFaultKo: string;
  readonly correctionCueKo: string;
  readonly cueScriptByLevel: MovementCueScriptByLevel;
  readonly targetMusclesKo: readonly string[];
  readonly stabilizerMusclesKo: readonly string[];
  readonly anatomyZone: AnatomyVisualZone;
  readonly anatomyLabelKo: string;
  readonly anatomyCaptionKo: string;
  readonly anatomyImageSrc: string;
  readonly anatomyImageFallbackSrc: string;
  readonly anatomyGuide: ResolvedIntuitiveAnatomyGuide;
}

export interface DailyStudyQueueOptions {
  readonly prioritizeExerciseIds?: readonly string[];
  readonly apparatus?: ApparatusType | 'all';
  readonly limit?: number;
  readonly nowIso?: string;
}

export interface ApparatusMasteryStats {
  readonly apparatus: ApparatusType;
  readonly labelKo: string;
  readonly totalCount: number;
  readonly masteredCount: number;
  readonly readyCount: number;
  readonly practicingCount: number;
  readonly unseenCount: number;
  readonly progressPct: number;
}

export interface MasterySummary {
  readonly totalCount: number;
  readonly masteredCount: number;
  readonly readyCount: number;
  readonly practicingCount: number;
  readonly unseenCount: number;
  readonly dueCount: number;
  readonly progressPct: number;
  readonly byApparatus: Readonly<Record<ApparatusType, ApparatusMasteryStats>>;
}

export const MOVEMENT_MASTERY_STORAGE_KEY = 'pf_movement_mastery_v1';

export const ALL_APPARATUS_ORDER: readonly ApparatusType[] = [
  'reformer',
  'cadillac',
  'chair',
  'barrel',
  'mat',
];

export const MASTERY_STATUS_META: Readonly<
  Record<MasteryStatus, { readonly labelKo: string; readonly shortLabelKo: string }>
> = {
  unseen: { labelKo: '미학습', shortLabelKo: '미학습' },
  practicing: { labelKo: '연습 중', shortLabelKo: '연습 중' },
  ready: { labelKo: '수업 가능', shortLabelKo: '수업 가능' },
  mastered: { labelKo: '완벽 마스터', shortLabelKo: '마스터' },
};

const QUIZ_CATEGORY_LABELS_KO: Readonly<Record<MovementQuizCategory, string>> = {
  'fault-correction': '단골 실수 바로잡기',
  'spring-mechanics': '스프링 역학 · 세팅',
  'breath-cue': '호흡 · 주동근 연결',
  'layer-modification': '단계 조절 · 변형',
};

const SPRING_ROLE_LABELS_KO: Readonly<Record<SpringRoleType, string>> = {
  assist: '가이드 보조 + 복귀 컨트롤',
  resistance: '근력 저항 (무거울수록 강도 ↑)',
  stability: '안정성 중심 (가벼울수록 코어 난이도 ↑)',
  bodyweight: '체중 · 곡면 지지 원리',
};

const DAY_MS = 24 * 60 * 60 * 1000;

function stableHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function resolveValidDateMs(iso?: string): number {
  if (iso) {
    const parsed = Date.parse(iso);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return Date.now();
}

function normalizeSentence(raw: string): string {
  const cleaned = cleanSpokenKoreanText(raw).replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  return /[.!?…]$/.test(cleaned) ? cleaned : `${cleaned}.`;
}

function stripTrailingPunctuation(raw: string): string {
  return cleanSpokenKoreanText(raw).replace(/[.!?…]+$/, '').trim();
}

function toSpokenActionSentence(raw: string): string {
  const base = stripTrailingPunctuation(raw);
  if (!base) return '호흡에 맞춰 천천히 이어가 볼게요.';
  if (/(해요|세요|볼게요|갑니다|합니다|돼요|줘요|가요|와요|나요|어요|아요|예요|이에요)$/.test(base)) {
    return `${base}.`;
  }
  if (/(진행|연결|추가|유지|집중|반복|제어|확장|강화|안정화|훈련|연습|적용|전환)$/.test(base)) {
    return `${base}해 볼게요.`;
  }
  return `${base} 흐름으로 천천히 이어가 볼게요.`;
}

function classifySpringRole(exercise: PilatesExercise): SpringRoleType {
  const springRaw = (exercise.springs || '').trim();
  const isBodyweight =
    exercise.apparatus === 'mat' ||
    exercise.apparatus === 'barrel' ||
    !springRaw ||
    /^bodyweight$/i.test(springRaw) ||
    /맨몸|무스프링|없음/.test(springRaw);

  if (isBodyweight) {
    return 'bodyweight';
  }

  if (
    exercise.apparatus === 'chair' &&
    (exercise.blockCategory === 'lower-body' || exercise.bodyPosition === 'standing')
  ) {
    return 'stability';
  }

  if (
    exercise.apparatus === 'reformer' &&
    (exercise.blockCategory === 'plank' ||
      exercise.bodyPosition === 'kneeling' ||
      exercise.bodyPosition === 'quadruped' ||
      (exercise.blockCategory === 'core' && /1B|1Y|노랑|파랑/i.test(springRaw)))
  ) {
    return 'stability';
  }

  if (
    exercise.apparatus === 'cadillac' ||
    exercise.blockCategory === 'feet-in-straps' ||
    exercise.blockCategory === 'cooldown'
  ) {
    return 'assist';
  }

  return 'resistance';
}

function buildBreathRhythm(exercise: PilatesExercise): MovementBreathRhythm {
  if (exercise.spinalPlanes.includes('extension') || exercise.blockCategory === 'extension') {
    return {
      inhaleSec: 4,
      exhaleSec: 4,
      inhaleActionKo: '쇄골을 넓히며 윗등(흉추)을 길게 열기',
      exhaleActionKo: '아랫배를 가볍게 당겨 허리를 지키며 복귀하기',
    };
  }
  if (exercise.spinalPlanes.includes('rotation') || exercise.spinalPlanes.includes('lateral')) {
    return {
      inhaleSec: 4,
      exhaleSec: 4,
      inhaleActionKo: '정수리를 위로 길게 세워 척추 공간 만들기',
      exhaleActionKo: '옆구리·복사근을 조이며 부드럽게 회전·측굴하기',
    };
  }
  if (exercise.blockCategory === 'warmup' || exercise.blockCategory === 'cooldown') {
    return {
      inhaleSec: 4,
      exhaleSec: 4,
      inhaleActionKo: '코로 마시며 양옆과 등 쪽 갈비뼈 넓히기',
      exhaleActionKo: '입으로 길게 내쉬며 어깨와 목 긴장 내려놓기',
    };
  }
  return {
    inhaleSec: 4,
    exhaleSec: 4,
    inhaleActionKo: '코로 마시며 갈비뼈 옆·뒤를 부드럽게 채우기',
    exhaleActionKo: '입으로 후 내쉬며 복부 중심을 모아 동작 이어가기',
  };
}

function buildSetupChecklistKo(
  exercise: PilatesExercise,
  anatomyGuide: ResolvedIntuitiveAnatomyGuide,
  springsSpokenKo: string,
): readonly [string, string, string] {
  const appKo = APPARATUS_LABELS[exercise.apparatus]?.ko ?? exercise.apparatus;
  const springCode = (exercise.springs || '').trim() || 'Bodyweight';
  const propsKo = exercise.props
    .filter((prop) => prop !== 'none')
    .map((prop) => PROP_LABELS[prop]?.ko ?? prop)
    .join('·');

  const step1 =
    exercise.apparatus === 'mat' || exercise.apparatus === 'barrel'
      ? `${appKo} 준비 · ${propsKo ? `소도구(${propsKo}) 배치와 ` : ''}미끄럼 없는 지지면 확인`
      : `${appKo} 스프링 세팅 · ${springsSpokenKo}(${springCode}) 체결 상태 확인`;

  const step2 = `시작 정렬 · ${anatomyGuide.setupBasicsKo}`;

  const rawCheck =
    exercise.precautions?.trim() ||
    anatomyGuide.commonFaultsKo[0]?.fault ||
    '호흡을 멈추지 않고 목·어깨 긴장이 올라오지 않는지 먼저 확인해요.';
  const step3 = `사전 체크 · ${normalizeSentence(rawCheck)}`;

  return [step1, step2, step3];
}

function buildCueScriptsByLevel(
  exercise: PilatesExercise,
  anatomyGuide: ResolvedIntuitiveAnatomyGuide,
  springsSpokenKo: string,
  breathRhythm: MovementBreathRhythm,
): MovementCueScriptByLevel {
  const posKo = POSITION_LABELS[exercise.bodyPosition]?.ko ?? exercise.bodyPosition;
  const primaryCue = stripTrailingPunctuation(
    exercise.cues[0] || anatomyGuide.commonFaultsKo[0]?.fixCue || '호흡과 함께 중심축을 길게 세워요',
  );
  const secondaryCue = stripTrailingPunctuation(
    exercise.cues[1] || anatomyGuide.commonFaultsKo[0]?.fixCue || '돌아오는 끝 구간까지 천천히 조절해요',
  );
  const easyLayerSentence = toSpokenActionSentence(
    exercise.layers.easy || '움직임 범위를 절반으로 줄여 편안하게 이어가요',
  );
  const standardLayerSentence = toSpokenActionSentence(
    exercise.layers.standard || primaryCue,
  );
  const challengeLayerSentence = toSpokenActionSentence(
    exercise.layers.hard || '정점에서 2초 멈춘 뒤 천천히 컨트롤하며 돌아와요',
  );
  const springIntro =
    exercise.apparatus === 'mat' || exercise.apparatus === 'barrel'
      ? `${formatKoreanParticle(posKo, '으로/로')} 편하게 자리 잡을게요.`
      : `스프링 ${springsSpokenKo} 확인하시고, ${formatKoreanParticle(posKo, '으로/로')} 자리 잡을게요.`;

  const easy = [
    '회원님, 오늘은 몸에 부담 없이 천천히 익혀볼게요.',
    springIntro,
    `코로 4초 마시고 입으로 후 내쉬면서, ${easyLayerSentence}`,
    `${toSpokenActionSentence(primaryCue)} 편안한 범위에서만 움직이셔도 충분해요.`,
  ].join(' ');

  const standard = [
    `이제 ${formatKoreanParticle(exercise.nameKo, '을/를')} 기본 리듬으로 가볼게요.`,
    springIntro,
    `마시면서 ${breathRhythm.inhaleActionKo}, 내쉬면서 ${breathRhythm.exhaleActionKo}.`,
    `${standardLayerSentence} ${toSpokenActionSentence(secondaryCue)}`,
  ].join(' ');

  const challenge = [
    '중심이 잘 잡히셨다면 한 단계 더 정교하게 가볼게요.',
    `4박자 호흡 리듬을 지키면서 ${challengeLayerSentence}`,
    `마지막까지 흔들리지 않게 ${toSpokenActionSentence(anatomyGuide.commonFaultsKo[0]?.fixCue || secondaryCue)}`,
  ].join(' ');

  return { easy, standard, challenge };
}

export function buildMovementStudyCard(exercise: PilatesExercise): MovementStudyCard {
  const anatomyGuide = buildIntuitiveAnatomyInsight(exercise);
  const difficulty = formatDifficultyMeta(exercise.level);
  const appKo = APPARATUS_LABELS[exercise.apparatus]?.ko ?? exercise.apparatus;
  const posKo = POSITION_LABELS[exercise.bodyPosition]?.ko ?? exercise.bodyPosition;
  const springsCode = (exercise.springs || '').trim() || 'Bodyweight';
  const springsSpokenKo = formatSpringsSpokenKo(exercise.springs, exercise.apparatus);
  const springRole = classifySpringRole(exercise);
  const breathRhythm = buildBreathRhythm(exercise);
  const setupChecklistKo = buildSetupChecklistKo(exercise, anatomyGuide, springsSpokenKo);
  const cueScriptByLevel = buildCueScriptsByLevel(
    exercise,
    anatomyGuide,
    springsSpokenKo,
    breathRhythm,
  );

  const primaryFault = anatomyGuide.commonFaultsKo[0] ?? {
    fault: '호흡을 참으며 어깨와 허리에 불필요한 힘이 들어가는 모습',
    fixCue: '어깨를 귀에서 멀리 내리고 날숨에 아랫배를 부드럽게 모아주세요.',
  };

  const keyCuesKo =
    exercise.cues.length > 0
      ? exercise.cues.slice(0, 3).map((cue) => normalizeSentence(cue))
      : [normalizeSentence(primaryFault.fixCue)];

  const targetMusclesKo =
    anatomyGuide.agonistsKo.length > 0
      ? anatomyGuide.agonistsKo
      : exercise.targetMuscles.length > 0
        ? exercise.targetMuscles.slice(0, 3)
        : ['복횡근', '둔근'];

  return {
    exerciseId: exercise.id,
    nameKo: exercise.nameKo,
    nameEn: exercise.nameEn,
    apparatus: exercise.apparatus,
    apparatusLabelKo: appKo,
    positionLabelKo: posKo,
    difficultyCode: exercise.level,
    difficultyLabelKo: difficulty.fullLabel,
    difficultyTone: difficulty.tone,
    springsCode,
    springsSpokenKo,
    springRole,
    springRoleLabelKo: SPRING_ROLE_LABELS_KO[springRole],
    springPrincipleKo: anatomyGuide.springMechanicsKo,
    breathCueKo: anatomyGuide.breathBasicsKo,
    breathRhythm,
    setupChecklistKo,
    keyCuesKo,
    commonFaultKo: normalizeSentence(primaryFault.fault),
    correctionCueKo: normalizeSentence(primaryFault.fixCue),
    cueScriptByLevel,
    targetMusclesKo,
    stabilizerMusclesKo: anatomyGuide.stabilizersKo,
    anatomyZone: anatomyGuide.anatomyVisualZone,
    anatomyLabelKo: anatomyGuide.visualAsset.labelKo,
    anatomyCaptionKo: anatomyGuide.visualAsset.captionKo,
    anatomyImageSrc: anatomyGuide.visualAsset.webpSrc,
    anatomyImageFallbackSrc: anatomyGuide.visualAsset.pngSrc,
    anatomyGuide,
  };
}

function buildDeterministicOptions(
  correctOption: string,
  candidateDistractors: readonly string[],
  fallbackDistractors: readonly string[],
  seedKey: string,
): { readonly optionsKo: string[]; readonly correctIndex: number } {
  const normalizedCorrect = normalizeSentence(correctOption);
  const seen = new Set<string>([normalizedCorrect]);
  const distractors: string[] = [];

  for (const candidate of [...candidateDistractors, ...fallbackDistractors]) {
    const cleaned = normalizeSentence(candidate);
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    distractors.push(cleaned);
    if (distractors.length === 3) break;
  }

  const targetIndex = stableHash(seedKey) % 4;
  const options: string[] = [];
  let distractorCursor = 0;
  for (let i = 0; i < 4; i += 1) {
    if (i === targetIndex) {
      options.push(normalizedCorrect);
    } else {
      options.push(distractors[distractorCursor] ?? '호흡과 정렬을 확인하며 천천히 조절해요.');
      distractorCursor += 1;
    }
  }

  return { optionsKo: options, correctIndex: targetIndex };
}

function buildFaultCorrectionQuestion(
  exercise: PilatesExercise,
  studyCard: MovementStudyCard,
  pool: readonly PilatesExercise[],
): MovementQuizQuestion {
  const differentCategoryExercises = pool
    .filter((item) => item.id !== exercise.id && item.blockCategory !== exercise.blockCategory)
    .slice(0, 6);

  const poolDistractors = differentCategoryExercises
    .map((item) => buildIntuitiveAnatomyInsight(item).commonFaultsKo[0]?.fixCue ?? '')
    .filter((cue) => cue.length > 0 && cue !== studyCard.correctionCueKo);

  const generalFaultDistractors = [
    '숨을 끝까지 참고 속도를 빠르게 올려 반동으로 동작을 끝까지 밀어붙이도록 안내해요.',
    '관절이 완전히 잠길 때까지 끝까지 펴고, 불편해도 범위를 줄이지 않도록 지도해요.',
    '어깨를 귀 쪽으로 힘껏 끌어올려 상체 긴장으로 몸통을 고정하도록 안내해요.',
    '골반 정렬은 신경 쓰지 말고 횟수만 빠르게 채우는 데 집중하도록 유도해요.',
  ];

  const { optionsKo, correctIndex } = buildDeterministicOptions(
    studyCard.correctionCueKo,
    [generalFaultDistractors[0], generalFaultDistractors[1], ...poolDistractors],
    generalFaultDistractors,
    `${exercise.id}:q1:fault`,
  );

  return {
    id: `${exercise.id}-quiz-fault`,
    category: 'fault-correction',
    categoryLabelKo: QUIZ_CATEGORY_LABELS_KO['fault-correction'],
    promptKo: `수업 중 회원님이 「${exercise.nameKo}」에서 '${stripTrailingPunctuation(studyCard.commonFaultKo)}' 모습을 보일 때, 가장 적절한 즉시 큐는 무엇일까요?`,
    optionsKo,
    correctIndex,
    explanationKo: `이 동작에서는 '${stripTrailingPunctuation(studyCard.commonFaultKo)}' 보상이 자주 나타나요. "${stripTrailingPunctuation(studyCard.correctionCueKo)}" 큐로 먼저 정렬과 호흡을 잡아주는 것이 핵심이에요.`,
  };
}

function buildSpringMechanicsQuestion(
  exercise: PilatesExercise,
  studyCard: MovementStudyCard,
): MovementQuizQuestion {
  const roleFacts: Record<
    SpringRoleType,
    {
      readonly promptKo: string;
      readonly correctKo: string;
      readonly distractors: readonly string[];
      readonly explanationKo: string;
    }
  > = {
    stability: {
      promptKo: `「${exercise.nameKo}」(${studyCard.springsCode})에서 스프링을 더 가볍게 세팅하면 몸에 어떤 변화가 생길까요?`,
      correctKo: '캐리지나 페달의 보조가 줄어들어 코어와 균형으로 버티는 난이도가 올라가요.',
      distractors: [
        '스프링이 가벼워질수록 어떤 동작이든 무조건 쉬워지고 코어 부담이 사라져요.',
        '스프링 장력은 호흡 리듬에만 영향을 주고 체중 지지 난이도와는 무관해요.',
        '스프링을 모두 빼야만 관절이 안정되고 움직임 조절이 수월해져요.',
      ],
      explanationKo: `${studyCard.springPrincipleKo} 버팀·안정성 동작에서는 가벼운 스프링이 오히려 더 강한 코어 컨트롤을 요구해요.`,
    },
    resistance: {
      promptKo: `「${exercise.nameKo}」(${studyCard.springsCode})에서 스프링 장력이 작용하는 원리로 가장 알맞은 설명은 무엇일까요?`,
      correctKo: '밀고 당길 때 스프링 장력이 클수록 근육이 이겨내야 하는 저항이 커져 근력 자극이 높아져요.',
      distractors: [
        '스프링이 무거울수록 기구가 몸을 대신 들어줘 근력 저항이 거의 사라져요.',
        '돌아오는 구간에서는 스프링 반동에 맡겨 캐리지를 빠르게 닫는 것이 정석이에요.',
        '풋바와 헤드레스트 위치만 맞추면 스프링 무게는 동작 느낌에 영향을 주지 않아요.',
      ],
      explanationKo: `${studyCard.springPrincipleKo} 밀 때뿐 아니라 돌아오는 마지막 구간까지 천천히 제동하며 컨트롤하는 것이 중요해요.`,
    },
    assist: {
      promptKo: `「${exercise.nameKo}」(${studyCard.springsCode})에서 스트랩·타워 스프링이 맡는 핵심 역할은 무엇일까요?`,
      correctKo: '다리나 척추의 무게를 부드럽게 가이드해 가동 범위를 열고, 복귀 구간에서 컨트롤을 도와요.',
      distractors: [
        '스트랩이 몸을 강하게 잡아당기므로 복부 힘을 완전히 풀고 반동으로 흔들어요.',
        '스프링을 최대한 무겁게 걸어 관절을 빠르게 꺾을수록 이완 효과가 커져요.',
        '호흡을 멈춘 상태에서 팔 힘으로만 바를 당겨 척추 분절을 생략해요.',
      ],
      explanationKo: `${studyCard.springPrincipleKo} 가이드 보조를 받으면서도 골반·갈비뼈 중립을 지키는 범위 안에서 움직여요.`,
    },
    bodyweight: {
      promptKo: `「${exercise.nameKo}」(${studyCard.apparatusLabelKo})의 지지 원리와 세팅으로 가장 알맞은 설명은 무엇일까요?`,
      correctKo:
        exercise.apparatus === 'barrel'
          ? '바렐의 곡면이 척추와 골반을 받쳐주어 무리 없이 가동 범위를 넓히고 중심을 조절해요.'
          : '스프링 보조 없이 중력을 직접 이겨내며 스스로 코어 중심과 정렬을 세우는 원리예요.',
      distractors: [
        '스프링이 없으므로 호흡과 골반 중립 정렬을 생략하고 속도만 높여 진행해요.',
        '바닥이나 곡면에 체중을 완전히 싣고 목에 힘을 주어 상체를 들어 올려요.',
        '항상 양발을 공중에 띄운 심화 자세로만 시작해야 기본 효과가 나타나요.',
      ],
      explanationKo: `${studyCard.springPrincipleKo} 시작 세팅(${studyCard.anatomyGuide.setupBasicsKo})을 정확히 맞추면 동작 품질이 크게 높아져요.`,
    },
  };

  const spec = roleFacts[studyCard.springRole];
  const { optionsKo, correctIndex } = buildDeterministicOptions(
    spec.correctKo,
    spec.distractors,
    spec.distractors,
    `${exercise.id}:q2:spring`,
  );

  return {
    id: `${exercise.id}-quiz-spring`,
    category: 'spring-mechanics',
    categoryLabelKo: QUIZ_CATEGORY_LABELS_KO['spring-mechanics'],
    promptKo: spec.promptKo,
    optionsKo,
    correctIndex,
    explanationKo: spec.explanationKo,
  };
}

function buildLayerOrBreathQuestion(
  exercise: PilatesExercise,
  studyCard: MovementStudyCard,
  pool: readonly PilatesExercise[],
): MovementQuizQuestion {
  const hasRichLayers =
    Boolean(exercise.layers.easy?.trim()) &&
    Boolean(exercise.layers.hard?.trim()) &&
    stripTrailingPunctuation(exercise.layers.easy) !==
      stripTrailingPunctuation(exercise.layers.hard);

  const pickLayer = hasRichLayers && stableHash(`${exercise.id}:q3:kind`) % 2 === 0;

  if (pickLayer) {
    const easyCue = normalizeSentence(exercise.layers.easy);
    const hardCue = normalizeSentence(exercise.layers.hard);
    const poolHardDistractors = pool
      .filter((item) => item.id !== exercise.id && item.layers.hard?.trim())
      .slice(0, 3)
      .map((item) => normalizeSentence(item.layers.hard));

    const fallbackDistractors = [
      hardCue,
      '속도를 두 배로 높이고 정점 홀드 시간을 길게 늘려 강도를 즉시 높여요.',
      '지지면을 최대한 좁힌 채 한 팔·한 다리 변형으로 바로 전환해요.',
      '호흡을 멈춘 채 최대 가동 범위까지 끝까지 밀어내도록 안내해요.',
    ];

    const { optionsKo, correctIndex } = buildDeterministicOptions(
      easyCue,
      [hardCue, ...poolHardDistractors.slice(0, 1), fallbackDistractors[1]],
      fallbackDistractors,
      `${exercise.id}:q3:layer`,
    );

    return {
      id: `${exercise.id}-quiz-layer`,
      category: 'layer-modification',
      categoryLabelKo: QUIZ_CATEGORY_LABELS_KO['layer-modification'],
      promptKo: `입문 회원님이 「${exercise.nameKo}」 동작에서 정렬 유지에 부담을 느낄 때, 바로 적용할 1단계 완화 조절로 가장 알맞은 것은 무엇일까요?`,
      optionsKo,
      correctIndex,
      explanationKo: `완화 단계는 "${stripTrailingPunctuation(easyCue)}"처럼 지지면을 넓히거나 범위를 줄여 핵심 정렬과 호흡을 먼저 성공하게 돕는 것이 좋아요.`,
    };
  }

  const targetSummary = studyCard.targetMusclesKo.slice(0, 2).join(' · ');
  const correctBreath = `${studyCard.breathRhythm.inhaleActionKo} 후, 날숨에 ${studyCard.breathRhythm.exhaleActionKo} (${targetSummary} 집중).`;

  const breathDistractors = [
    '힘을 쓰는 정점 구간에서 숨을 꽉 참아 복압을 굳힌 채 빠르게 반복해요.',
    '입으로 짧게 들이마시고 코로 급하게 내쉬며 목 앞쪽 힘으로 움직임을 이끌어요.',
    '호흡 리듬은 동작과 따로 두고, 갈비뼈가 크게 들뜨도록 배만 앞으로 내밀어요.',
    '날숨에 복부 중심을 완전히 풀고 관절 반동으로 시작 자세로 돌아와요.',
  ];

  const { optionsKo, correctIndex } = buildDeterministicOptions(
    correctBreath,
    breathDistractors,
    breathDistractors,
    `${exercise.id}:q3:breath`,
  );

  return {
    id: `${exercise.id}-quiz-breath`,
    category: 'breath-cue',
    categoryLabelKo: QUIZ_CATEGORY_LABELS_KO['breath-cue'],
    promptKo: `「${exercise.nameKo}」에서 호흡과 주동근(${targetSummary})을 가장 자연스럽게 연결하는 안내는 무엇일까요?`,
    optionsKo,
    correctIndex,
    explanationKo: `${studyCard.breathCueKo} 주동근(${targetSummary})이 일할 때 호흡이 멈추지 않도록 4박자 리듬을 맞춰주세요.`,
  };
}

export function generateMovementQuiz(
  exercise: PilatesExercise,
  pool: readonly PilatesExercise[],
): MovementQuizQuestion[] {
  const studyCard = buildMovementStudyCard(exercise);
  return [
    buildFaultCorrectionQuestion(exercise, studyCard, pool),
    buildSpringMechanicsQuestion(exercise, studyCard),
    buildLayerOrBreathQuestion(exercise, studyCard, pool),
  ];
}

export function recordMasteryOutcome(
  records: Readonly<Record<string, MovementMasteryRecord>>,
  exerciseId: string,
  rating: MasteryRating,
  nowIso?: string,
): Record<string, MovementMasteryRecord> {
  const nowMs = resolveValidDateMs(nowIso);
  const reviewedIso = new Date(nowMs).toISOString();
  const prev = records[exerciseId];
  const prevStreak = prev?.streak ?? 0;
  const reviewCount = (prev?.reviewCount ?? 0) + 1;

  let status: MasteryStatus;
  let streak: number;
  let intervalDays: number;

  if (rating === 'again') {
    status = 'practicing';
    streak = 0;
    intervalDays = 1;
  } else if (rating === 'good') {
    streak = prevStreak + 1;
    status = streak >= 3 ? 'mastered' : 'ready';
    intervalDays = streak === 1 ? 3 : streak === 2 ? 5 : 7;
  } else {
    streak = Math.max(prevStreak + 1, 3);
    status = 'mastered';
    intervalDays = 14;
  }

  const nextReviewAt = new Date(nowMs + intervalDays * DAY_MS).toISOString();

  return {
    ...records,
    [exerciseId]: {
      exerciseId,
      status,
      streak,
      reviewCount,
      lastReviewedAt: reviewedIso,
      nextReviewAt,
    },
  };
}

export function isRecordDueForReview(
  record: MovementMasteryRecord | undefined,
  nowMs: number,
): boolean {
  if (!record) return false;
  const dueMs = Date.parse(record.nextReviewAt);
  if (!Number.isFinite(dueMs)) return false;
  return dueMs <= nowMs;
}

export function extractSequenceExerciseIds(
  sequenceSteps?: readonly SequenceStep[],
): string[] {
  if (!sequenceSteps || sequenceSteps.length === 0) return [];
  const seen = new Set<string>();
  const orderedIds: string[] = [];
  for (const step of sequenceSteps) {
    if (isRestStep(step)) continue;
    if (!step.exerciseId || seen.has(step.exerciseId)) continue;
    seen.add(step.exerciseId);
    orderedIds.push(step.exerciseId);
  }
  return orderedIds;
}

export function selectDailyStudyQueue(
  exercises: readonly PilatesExercise[],
  records: Readonly<Record<string, MovementMasteryRecord>>,
  options: DailyStudyQueueOptions = {},
): PilatesExercise[] {
  const {
    prioritizeExerciseIds = [],
    apparatus = 'all',
    limit = 8,
    nowIso,
  } = options;

  if (exercises.length === 0 || limit <= 0) return [];

  const nowMs = resolveValidDateMs(nowIso);
  const filtered =
    apparatus === 'all'
      ? exercises
      : exercises.filter((item) => item.apparatus === apparatus);

  if (filtered.length === 0) return [];

  const priorityIndexMap = new Map<string, number>();
  prioritizeExerciseIds.forEach((id, idx) => {
    if (!priorityIndexMap.has(id)) {
      priorityIndexMap.set(id, idx);
    }
  });

  const catalogIndexMap = new Map<string, number>();
  const uniqueFiltered: PilatesExercise[] = [];
  for (const ex of filtered) {
    if (catalogIndexMap.has(ex.id)) continue;
    catalogIndexMap.set(ex.id, uniqueFiltered.length);
    uniqueFiltered.push(ex);
  }

  const getRank = (exercise: PilatesExercise): {
    readonly tier: number;
    readonly subOrder: number;
  } => {
    const rec = records[exercise.id];
    const prioIdx = priorityIndexMap.get(exercise.id);
    const due = isRecordDueForReview(rec, nowMs);

    if (prioIdx !== undefined) {
      const needsFocus = !rec || rec.status !== 'mastered' || due;
      return { tier: needsFocus ? 0 : 1, subOrder: prioIdx };
    }

    if (rec && due) {
      const dueMs = Date.parse(rec.nextReviewAt);
      const statusWeight = rec.status === 'practicing' ? 0 : rec.status === 'ready' ? 1 : 2;
      return {
        tier: 2,
        subOrder: statusWeight * 1_000_000_000_000 + (Number.isFinite(dueMs) ? dueMs : 0),
      };
    }

    if (!rec || rec.status === 'unseen') {
      const levelWeight = exercise.level === '1.0' ? 0 : exercise.level === '1.5' ? 1 : 2;
      return {
        tier: 3,
        subOrder: levelWeight * 100_000 + (catalogIndexMap.get(exercise.id) ?? 0),
      };
    }

    const statusOrder = rec.status === 'practicing' ? 4 : rec.status === 'ready' ? 5 : 6;
    const nextMs = Date.parse(rec.nextReviewAt);
    return {
      tier: statusOrder,
      subOrder: Number.isFinite(nextMs) ? nextMs : catalogIndexMap.get(exercise.id) ?? 0,
    };
  };

  const sorted = [...uniqueFiltered].sort((a, b) => {
    const ra = getRank(a);
    const rb = getRank(b);
    if (ra.tier !== rb.tier) return ra.tier - rb.tier;
    if (ra.subOrder !== rb.subOrder) return ra.subOrder - rb.subOrder;
    return (catalogIndexMap.get(a.id) ?? 0) - (catalogIndexMap.get(b.id) ?? 0);
  });

  return sorted.slice(0, limit);
}

export function getStudyQueueReasonKo(
  exerciseId: string,
  records: Readonly<Record<string, MovementMasteryRecord>>,
  prioritizedIds: ReadonlySet<string>,
  nowIso?: string,
): string {
  const rec = records[exerciseId];
  const nowMs = resolveValidDateMs(nowIso);
  if (prioritizedIds.has(exerciseId)) {
    return '내 수업 동작 우선';
  }
  if (isRecordDueForReview(rec, nowMs)) {
    return '복습 기한 도래';
  }
  if (!rec || rec.status === 'unseen') {
    return '새 동작 익히기';
  }
  if (rec.status === 'practicing') {
    return '집중 연습 중';
  }
  if (rec.status === 'ready') {
    return '수업 가능 · 복습 유지';
  }
  return '완벽 마스터 완료';
}

function computeProgressPct(
  totalCount: number,
  masteredCount: number,
  readyCount: number,
  practicingCount: number,
): number {
  if (totalCount <= 0) return 0;
  const weighted = masteredCount + readyCount * 0.65 + practicingCount * 0.25;
  return Math.max(0, Math.min(100, Math.round((weighted / totalCount) * 100)));
}

export function computeMasterySummary(
  exercises: readonly PilatesExercise[],
  records: Readonly<Record<string, MovementMasteryRecord>>,
  nowIso?: string,
): MasterySummary {
  const nowMs = resolveValidDateMs(nowIso);
  const uniqueExercises: PilatesExercise[] = [];
  const seen = new Set<string>();
  for (const ex of exercises) {
    if (seen.has(ex.id)) continue;
    seen.add(ex.id);
    uniqueExercises.push(ex);
  }

  let masteredCount = 0;
  let readyCount = 0;
  let practicingCount = 0;
  let unseenCount = 0;
  let dueCount = 0;

  const perApparatusAccum: Record<
    ApparatusType,
    { total: number; mastered: number; ready: number; practicing: number; unseen: number }
  > = {
    reformer: { total: 0, mastered: 0, ready: 0, practicing: 0, unseen: 0 },
    cadillac: { total: 0, mastered: 0, ready: 0, practicing: 0, unseen: 0 },
    chair: { total: 0, mastered: 0, ready: 0, practicing: 0, unseen: 0 },
    barrel: { total: 0, mastered: 0, ready: 0, practicing: 0, unseen: 0 },
    mat: { total: 0, mastered: 0, ready: 0, practicing: 0, unseen: 0 },
  };

  for (const ex of uniqueExercises) {
    const bucket = perApparatusAccum[ex.apparatus];
    if (bucket) {
      bucket.total += 1;
    }
    const rec = records[ex.id];
    const status: MasteryStatus = rec?.status ?? 'unseen';
    if (rec && isRecordDueForReview(rec, nowMs)) {
      dueCount += 1;
    }

    if (status === 'mastered') {
      masteredCount += 1;
      if (bucket) bucket.mastered += 1;
    } else if (status === 'ready') {
      readyCount += 1;
      if (bucket) bucket.ready += 1;
    } else if (status === 'practicing') {
      practicingCount += 1;
      if (bucket) bucket.practicing += 1;
    } else {
      unseenCount += 1;
      if (bucket) bucket.unseen += 1;
    }
  }

  const byApparatus = {} as Record<ApparatusType, ApparatusMasteryStats>;
  for (const apparatus of ALL_APPARATUS_ORDER) {
    const acc = perApparatusAccum[apparatus];
    byApparatus[apparatus] = {
      apparatus,
      labelKo: APPARATUS_LABELS[apparatus]?.ko ?? apparatus,
      totalCount: acc.total,
      masteredCount: acc.mastered,
      readyCount: acc.ready,
      practicingCount: acc.practicing,
      unseenCount: acc.unseen,
      progressPct: computeProgressPct(acc.total, acc.mastered, acc.ready, acc.practicing),
    };
  }

  const totalCount = uniqueExercises.length;
  return {
    totalCount,
    masteredCount,
    readyCount,
    practicingCount,
    unseenCount,
    dueCount,
    progressPct: computeProgressPct(totalCount, masteredCount, readyCount, practicingCount),
    byApparatus,
  };
}

function isValidStatus(value: unknown): value is MasteryStatus {
  return (
    value === 'unseen' ||
    value === 'practicing' ||
    value === 'ready' ||
    value === 'mastered'
  );
}

function isValidRecord(value: unknown): value is MovementMasteryRecord {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.exerciseId === 'string' &&
    obj.exerciseId.length > 0 &&
    isValidStatus(obj.status) &&
    typeof obj.streak === 'number' &&
    Number.isFinite(obj.streak) &&
    obj.streak >= 0 &&
    typeof obj.reviewCount === 'number' &&
    Number.isFinite(obj.reviewCount) &&
    obj.reviewCount >= 0 &&
    typeof obj.lastReviewedAt === 'string' &&
    typeof obj.nextReviewAt === 'string'
  );
}

function getDefaultStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

export function loadMovementMasteryRecords(
  storage?: Pick<Storage, 'getItem'> | null,
): Record<string, MovementMasteryRecord> {
  const target = storage === undefined ? getDefaultStorage() : storage;
  if (!target) return {};
  try {
    const raw = target.getItem(MOVEMENT_MASTERY_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    const clean: Record<string, MovementMasteryRecord> = {};
    for (const [key, entry] of Object.entries(parsed as Record<string, unknown>)) {
      if (isValidRecord(entry)) {
        clean[key] = {
          exerciseId: entry.exerciseId,
          status: entry.status,
          streak: Math.floor(entry.streak),
          reviewCount: Math.floor(entry.reviewCount),
          lastReviewedAt: entry.lastReviewedAt,
          nextReviewAt: entry.nextReviewAt,
        };
      }
    }
    return clean;
  } catch {
    return {};
  }
}

export function saveMovementMasteryRecords(
  records: Readonly<Record<string, MovementMasteryRecord>>,
  storage?: Pick<Storage, 'setItem'> | null,
): boolean {
  const target = storage === undefined ? getDefaultStorage() : storage;
  if (!target) return false;
  try {
    target.setItem(MOVEMENT_MASTERY_STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}

export function formatNextReviewLabelKo(
  record: MovementMasteryRecord | undefined,
  nowIso?: string,
): string {
  if (!record) return '아직 복습 기록 없음';
  const nowMs = resolveValidDateMs(nowIso);
  const dueMs = Date.parse(record.nextReviewAt);
  if (!Number.isFinite(dueMs)) return '복습 일정 확인 필요';
  const diffDays = Math.ceil((dueMs - nowMs) / DAY_MS);
  if (diffDays <= 0) return '오늘 복습 권장';
  if (diffDays === 1) return '내일(1일 뒤) 복습';
  return `${diffDays}일 뒤 복습 예정`;
}
