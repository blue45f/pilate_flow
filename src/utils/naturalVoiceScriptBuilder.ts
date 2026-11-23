import { APPARATUS_LABELS, PROP_LABELS } from '../data/pilatesCatalog';
import type {
  ApparatusType,
  BoxState,
  DifficultyLevel,
  FootbarState,
  HeadrestState,
  PilatesExercise,
  PropType,
  SequenceStep,
} from '../types/pilates';
import { buildStepBreathingCadence } from './breathingCadenceEngine';
import { isRestStep } from './sequenceEngine';

export type NaturalVoiceTone =
  | 'warm-intro'
  | 'setup'
  | 'cue'
  | 'breath'
  | 'tip'
  | 'quiz-prompt'
  | 'quiz-answer';

export type BreathChimeKind = 'none' | 'inhale' | 'exhale' | 'bell' | 'quiz-tick' | 'quiz-reveal';

export interface NaturalVoiceProsody {
  readonly rateScale: number;
  readonly pitch: number;
  readonly breathChime: BreathChimeKind;
}

export interface SequenceQuizCard {
  readonly stepIndex: number;
  readonly stepOrder: number;
  readonly exerciseId: string;
  readonly previousNameKo: string | null;
  readonly answerNameKo: string;
  readonly answerApparatusKo: string;
  readonly answerSpringCode: string;
  readonly answerSpringSpokenKo: string;
  readonly answerPositionKo: string;
  readonly answerKeyCueKo: string;
}

export interface NaturalVoiceSegment {
  readonly id: string;
  readonly index: number;
  readonly tone: NaturalVoiceTone;
  readonly labelKo: string;
  readonly textKo: string;
  readonly pauseMs: number;
  readonly prosody: NaturalVoiceProsody;
  readonly stepIndex?: number;
  readonly stepOrder?: number;
  readonly exerciseId?: string;
  readonly exerciseNameKo?: string;
  readonly springCode?: string;
  readonly springSpokenKo?: string;
  readonly countdownSec?: number;
  readonly breathTempoRatio?: string;
  readonly quizCard?: SequenceQuizCard;
}

export interface NaturalVoiceScript {
  readonly exerciseId: string;
  readonly exerciseNameKo: string;
  readonly titleKo: string;
  readonly segments: readonly NaturalVoiceSegment[];
  readonly fullTextKo: string;
  readonly estimatedDurationSec: number;
  readonly disclaimerKo: string;
}

export type SequenceAudioRehearsalMode = 'podcast' | 'fast-3min' | 'quiz' | 'breath-tempo';

export type MemorizationBlindStage = 'full' | 'hide-details' | 'hide-names';

export interface SequenceChunkAct {
  readonly actNumber: number;
  readonly titleKo: string;
  readonly positionLabelKo: string;
  readonly springSummaryKo: string;
  readonly totalDurationMin: number;
  readonly stepIndices: readonly number[];
  readonly stepOrders: readonly number[];
  readonly stepIds: readonly string[];
  readonly stepNamesKo: readonly string[];
  readonly firstStepIndex: number;
  readonly firstSegmentIndex: number;
  readonly transitionHintKo: string;
}

export interface SequenceAudioRehearsalStepSummary {
  readonly stepIndex: number;
  readonly stepOrder: number;
  readonly stepId: string;
  readonly exerciseId: string;
  readonly nameKo: string;
  readonly isRest: boolean;
  readonly positionLabelKo: string;
  readonly springCode: string;
  readonly springSpokenKo: string;
  readonly keyCueKo: string;
  readonly durationMin: number;
  readonly firstSegmentIndex: number;
  readonly quizAnswerSegmentIndex?: number;
}

export interface SequenceAudioRehearsalScript {
  readonly mode: SequenceAudioRehearsalMode;
  readonly modeLabelKo: string;
  readonly sequenceTitle: string;
  readonly segments: readonly NaturalVoiceSegment[];
  readonly steps: readonly SequenceAudioRehearsalStepSummary[];
  readonly chunks: readonly SequenceChunkAct[];
  readonly totalDurationMin: number;
  readonly estimatedAudioSec: number;
  readonly fullTextKo: string;
  readonly disclaimerKo: string;
}

interface OptionalAnatomyInsight {
  readonly benefitsKo?: readonly string[];
  readonly commonFaultsKo?: readonly {
    readonly fault?: string;
    readonly fixCue?: string;
  }[];
}

type ExerciseWithOptionalAnatomy = PilatesExercise & {
  readonly anatomyInsight?: OptionalAnatomyInsight;
};

export const NATURAL_VOICE_DISCLAIMER_KO =
  '강사님의 수업 준비와 동작 암기를 돕는 음성 리허설 안내입니다. 현장에서는 회원님의 컨디션과 움직임 범위를 직접 확인하며 진행해 주세요.';

export const NATURAL_VOICE_TONE_LABELS_KO: Readonly<Record<NaturalVoiceTone, string>> = {
  'warm-intro': '동작 소개',
  setup: '기구 준비',
  breath: '호흡 리듬',
  cue: '핵심 큐잉',
  tip: '교정 팁',
  'quiz-prompt': '암기 퀴즈',
  'quiz-answer': '정답 확인',
};

export const REHEARSAL_MODE_META_KO: Readonly<
  Record<
    SequenceAudioRehearsalMode,
    { readonly labelKo: string; readonly shortLabelKo: string; readonly descriptionKo: string }
  >
> = {
  podcast: {
    labelKo: '이어듣기 (팟캐스트 워크스루)',
    shortLabelKo: '이어듣기',
    descriptionKo: '짠 시퀀스 전체를 선배 강사가 옆에서 설명하듯 처음부터 끝까지 편하게 들어요.',
  },
  'fast-3min': {
    labelKo: '3분 고속 워크스루 (동작당 15초)',
    shortLabelKo: '3분 고속',
    descriptionKo: '수업 직전 3분 만에 동작 이름, 스프링, 핵심 큐 1줄만 빠르게 훑어 외워요.',
  },
  quiz: {
    labelKo: '빈칸 암기 퀴즈 (이어폰 암기)',
    shortLabelKo: '빈칸 퀴즈',
    descriptionKo: '화면을 보지 않고도 다음 동작 이름과 스프링 세팅을 3초 안에 떠올리며 외워요.',
  },
  'breath-tempo': {
    labelKo: '호흡 템포 리허설',
    shortLabelKo: '호흡 템포',
    descriptionKo: '부드러운 들숨·날숨 알림음에 맞춰 실제 수업 큐잉 리듬을 연습해요.',
  },
};

export const BLIND_STAGE_META_KO: Readonly<
  Record<
    MemorizationBlindStage,
    { readonly stepLabelKo: string; readonly shortLabelKo: string; readonly hintKo: string }
  >
> = {
  full: {
    stepLabelKo: '1단계 · 전체 보기',
    shortLabelKo: '전체 보기',
    hintKo: '동작명, 스프링, 핵심 큐를 모두 보며 흐름을 익혀요.',
  },
  'hide-details': {
    stepLabelKo: '2단계 · 스프링·큐 숨김',
    shortLabelKo: '스프링·큐 숨김',
    hintKo: '동작 이름만 보고 스프링과 핵심 큐를 떠올린 뒤 탭해서 확인해요.',
  },
  'hide-names': {
    stepLabelKo: '3단계 · 동작명 숨김',
    shortLabelKo: '동작명 숨김',
    hintKo: '번호와 막(체위) 흐름만 보고 동작명·스프링·큐를 통째로 떠올려 보세요.',
  },
};

export const NATURAL_VOICE_PROSODY_BY_TONE: Readonly<
  Record<NaturalVoiceTone, NaturalVoiceProsody & { readonly defaultPauseMs: number }>
> = {
  'warm-intro': { rateScale: 0.98, pitch: 1.03, breathChime: 'none', defaultPauseMs: 550 },
  setup: { rateScale: 0.96, pitch: 1.0, breathChime: 'none', defaultPauseMs: 650 },
  breath: { rateScale: 0.94, pitch: 0.98, breathChime: 'inhale', defaultPauseMs: 800 },
  cue: { rateScale: 0.99, pitch: 1.01, breathChime: 'none', defaultPauseMs: 480 },
  tip: { rateScale: 0.97, pitch: 1.02, breathChime: 'none', defaultPauseMs: 600 },
  'quiz-prompt': { rateScale: 1.0, pitch: 1.04, breathChime: 'quiz-tick', defaultPauseMs: 850 },
  'quiz-answer': { rateScale: 0.98, pitch: 1.02, breathChime: 'quiz-reveal', defaultPauseMs: 700 },
};

const SPOKEN_COUNT_SINGLE_KO: Readonly<Record<number, string>> = {
  1: '하나',
  2: '두 개',
  3: '세 개',
  4: '네 개',
  5: '다섯 개',
};

const SPOKEN_COUNT_JOINED_KO: Readonly<Record<number, string>> = {
  1: '하나',
  2: '둘',
  3: '셋',
  4: '넷',
  5: '다섯',
};

const POSITION_SPOKEN_ACTION_KO: Readonly<Record<PilatesExercise['bodyPosition'], string>> = {
  supine: '편하게 누워볼게요',
  prone: '엎드려서 자리 잡아볼게요',
  'side-lying': '옆으로 길게 누워볼게요',
  seated: '바르게 앉아서 시작해 볼게요',
  kneeling: '무릎을 세우고 자리 잡아볼게요',
  standing: '두 발로 단단히 서서 준비해 볼게요',
  quadruped: '네발기기 자세로 자리 잡아볼게요',
};

const POSITION_SHORT_KO: Readonly<Record<PilatesExercise['bodyPosition'], string>> = {
  supine: '누운 자세',
  prone: '엎드린 자세',
  'side-lying': '옆으로 누운 자세',
  seated: '앉은 자세',
  kneeling: '무릎 선 자세',
  standing: '선 자세',
  quadruped: '네발기기 자세',
};

const FOOTBAR_SPOKEN_KO: Readonly<Record<FootbarState, string | null>> = {
  high: '풋바는 높게',
  mid: '풋바는 중간 높이로',
  low: '풋바는 낮게',
  down: '풋바는 내려주시고요',
  none: null,
};

const HEADREST_SPOKEN_KO: Readonly<Record<HeadrestState, string>> = {
  up: '헤드레스트는 살짝 올려서',
  flat: '헤드레스트는 평평하게 내려서',
  down: '헤드레스트는 완전히 내려서',
};

const BOX_SPOKEN_KO: Readonly<Record<BoxState, string | null>> = {
  none: null,
  'long-box': '롱박스를 길게 올려주시고요',
  'short-box': '숏박스를 가로로 올려주시고요',
};

const BLOCK_BENEFIT_SPOKEN_KO: Readonly<Record<PilatesExercise['blockCategory'], string>> = {
  warmup: '호흡을 고르고 골반과 갈비뼈 주변의 긴장을 부드럽게 풀어주는 데 아주 좋아요',
  footwork: '하체 정렬을 맞추고 발목과 무릎의 안정감을 키우는 데 아주 좋아요',
  bridging: '엉덩이와 허벅지 뒤쪽을 깨우면서 척추를 마디마디 부드럽게 움직이는 데 좋아요',
  core: '깊은 복부 중심을 단단하게 세우고 몸통 안정감을 기르는 데 아주 좋아요',
  'upper-body': '어깨와 날개뼈 주변을 안정시키고 윗등 움직임을 매끄럽게 열어주는 데 좋아요',
  'lower-body': '엉덩이 옆선과 하체 지지력을 고르게 키우고 좌우 밸런스를 맞추는 데 좋아요',
  plank: '팔과 어깨, 코어를 하나로 연결해 전신 지지력을 단단하게 채우는 데 좋아요',
  extension: '굽기 쉬운 윗등을 시원하게 펴고 등 뒤쪽 지지력을 깨우는 데 아주 좋아요',
  'feet-in-straps': '고관절 움직임을 부드럽게 넓히고 허벅지 안쪽과 뒤쪽을 길게 늘려주는 데 좋아요',
  cooldown: '숨을 차분히 가라앉히고 몸 옆선과 척추를 편안하게 정리하는 데 좋아요',
};

type KoreanParticlePair = '이에요/예요' | '을/를' | '은/는' | '이/가' | '으로/로' | '과/와';

function inspectFinalConsonant(word: string): { hasBatchim: boolean; isRieul: boolean } {
  const cleaned = word.replace(/[\s.,!?'"()[\]·…~]+$/g, '');
  if (!cleaned) {
    return { hasBatchim: false, isRieul: false };
  }
  const lastChar = cleaned[cleaned.length - 1];
  const code = lastChar.charCodeAt(0);

  if (code >= 0xac00 && code <= 0xd7a3) {
    const jongseong = (code - 0xac00) % 28;
    return { hasBatchim: jongseong !== 0, isRieul: jongseong === 8 };
  }

  if (/[0-9]/.test(lastChar)) {
    const digitBatchim = new Set(['0', '1', '3', '6', '7', '8']);
    return { hasBatchim: digitBatchim.has(lastChar), isRieul: lastChar === '1' || lastChar === '7' || lastChar === '8' };
  }

  const lower = lastChar.toLowerCase();
  if (/[lmnr]/.test(lower)) {
    return { hasBatchim: true, isRieul: lower === 'l' };
  }
  return { hasBatchim: false, isRieul: false };
}

/**
 * Attaches the phonetically matching Korean particle (받침 유무 및 ㄹ 받침 처리).
 */
export function formatKoreanParticle(word: string, pair: KoreanParticlePair): string {
  const trimmed = word.trim();
  if (!trimmed) return '';
  const { hasBatchim, isRieul } = inspectFinalConsonant(trimmed);
  const [consonantForm, vowelForm] = pair.split('/') as [string, string];
  if (pair === '으로/로') {
    return `${trimmed}${!hasBatchim || isRieul ? '로' : '으로'}`;
  }
  return `${trimmed}${hasBatchim ? consonantForm : vowelForm}`;
}

function ensureNaturalEnding(sentence: string): string {
  const trimmed = sentence.trim();
  if (!trimmed) return '';
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

/**
 * Cleans stiff metadata symbols and inline English parentheticals so voice playback sounds natural.
 */
export function cleanSpokenKoreanText(raw: string): string {
  if (!raw) return '';
  let text = raw.trim();

  // Remove pure-English / technical parenthetical annotations such as "(High)", "(Locking)", "(Sit-bones)"
  text = text.replace(/\(\s*[A-Za-z0-9/&,+\s.-]{2,45}\s*\)/g, '');
  // Normalize arrows into natural Korean flow
  text = text.replace(/\s*→\s*/g, ', 이어서 ');
  text = text.replace(/\s*↔\s*/g, '와 ');
  // Smooth common studio shorthand for speech engines
  text = text.replace(/\b50\s*:\s*50\b/g, '오십 대 오십');
  text = text.replace(/\bC-?커브\b/gi, '씨 커브');
  text = text.replace(/\bV\s*자\b/gi, '브이자');
  text = text.replace(/\bX\s*자\b/gi, '엑스자');
  text = text.replace(/(\d+)\s*cm\b/gi, '$1센티미터');
  text = text.replace(/(\d+)\s*%/g, '$1퍼센트');
  text = text.replace(/좌\/우/g, '좌우');
  text = text.replace(/업\/다운/g, '위아래');
  text = text.replace(/인\/아웃/g, '안팎');
  text = text.replace(/내·외전근/g, '허벅지 안쪽과 바깥쪽');
  text = text.replace(/주의!\s*/g, '');
  text = text.replace(/\s*&\s*/g, ' 그리고 ');
  text = text.replace(/\s*·\s*/g, ', ');
  text = text.replace(/\s{2,}/g, ' ');
  text = text.replace(/\s+([.,!?])/g, '$1');

  return text.trim();
}

/**
 * Translates spring tension codes (e.g. "2R 1B", "빨강 2 · 파랑 1", "Bodyweight") into natural spoken Korean.
 */
export function formatSpringsSpokenKo(
  rawSprings?: string,
  apparatus: ApparatusType = 'reformer',
): string {
  const raw = (rawSprings ?? '').trim();
  if (!raw || /^bodyweight$/i.test(raw) || /무스프링|맨몸|체중|없음/.test(raw)) {
    return apparatus === 'mat' || apparatus === 'barrel'
      ? '스프링 없이 맨몸'
      : '스프링 없이 맨몸 저항';
  }

  const parts: Array<{ color: string; count: number }> = [];

  const capture = (color: string, regex: RegExp) => {
    const match = raw.match(regex);
    if (!match) return;
    const numStr = match[1] ?? match[2] ?? '1';
    const count = Math.max(1, Math.min(5, Number.parseInt(numStr, 10) || 1));
    parts.push({ color, count });
  };

  // Code format ("2R", "1B", "1Y", "1G") or Korean/English format ("빨강 2", "2 Red")
  capture('초록', /(?:(\d+)\s*(?:G\b|green|초록|녹색)|(?:초록|녹색|green)\s*(\d+)?)/i);
  capture('빨강', /(?:(\d+)\s*(?:R\b|red|빨강|적색)|(?:빨강|적색|red)\s*(\d+)?)/i);
  capture('파랑', /(?:(\d+)\s*(?:B\b|blue|파랑|청색)|(?:파랑|청색|blue)\s*(\d+)?)/i);
  capture('노랑', /(?:(\d+)\s*(?:Y\b|yellow|노랑|황색)|(?:노랑|황색|yellow)\s*(\d+)?)/i);
  capture('하양', /(?:(\d+)\s*(?:W\b|white|하양|흰색)|(?:하양|흰색|white)\s*(\d+)?)/i);

  if (parts.length === 0) {
    return cleanSpokenKoreanText(raw);
  }

  if (parts.length === 1) {
    const only = parts[0];
    const countWord = SPOKEN_COUNT_SINGLE_KO[only.count] ?? `${only.count}개`;
    return `${only.color} ${countWord}`;
  }

  return parts
    .map((part, idx) => {
      const countWord = SPOKEN_COUNT_JOINED_KO[part.count] ?? `${part.count}개`;
      const phrase = `${part.color} ${countWord}`;
      return idx < parts.length - 1 ? `${phrase}에` : phrase;
    })
    .join(' ');
}

function buildWarmBenefitSentence(exercise: ExerciseWithOptionalAnatomy): string {
  const insightBenefits = exercise.anatomyInsight?.benefitsKo?.filter((b) => b.trim().length > 0);
  if (insightBenefits && insightBenefits.length > 0) {
    const first = cleanSpokenKoreanText(insightBenefits[0]).replace(/[.!?]+$/, '');
    if (/(좋아요|도움이 돼요|키워줘요|깨워줘요|열어줘요|풀어줘요)$/.test(first)) {
      return ensureNaturalEnding(first);
    }
    return ensureNaturalEnding(`${first} 데 아주 좋아요`);
  }

  const baseBenefit =
    BLOCK_BENEFIT_SPOKEN_KO[exercise.blockCategory] ??
    '몸의 중심을 안정시키고 바른 정렬을 익히는 데 아주 좋아요';
  const muscles = (exercise.targetMuscles ?? [])
    .map((m) => cleanSpokenKoreanText(m))
    .filter(Boolean)
    .slice(0, 2);

  if (muscles.length >= 2) {
    return `${muscles[0]}과 ${muscles[1]}을 고르게 쓰면서, ${baseBenefit}.`;
  }
  if (muscles.length === 1) {
    return `${formatKoreanParticle(muscles[0], '을/를')} 부드럽게 깨우면서, ${baseBenefit}.`;
  }
  return `${baseBenefit}.`;
}

function resolveActivePropLabels(exercise: PilatesExercise, step?: SequenceStep): string[] {
  const propList: PropType[] =
    step?.propOverride !== undefined
      ? step.propOverride === 'none'
        ? []
        : [step.propOverride]
      : (exercise.props ?? []).filter((prop) => prop !== 'none');

  return propList
    .map((prop) => {
      const raw = PROP_LABELS[prop]?.ko ?? prop;
      return cleanSpokenKoreanText(raw.split('·')[0].trim());
    })
    .filter(Boolean);
}

function buildWarmSetupSentence(exercise: PilatesExercise, step?: SequenceStep): string {
  const springCode = step?.customSpringOverride?.trim() || exercise.springs?.trim() || '';
  const springSpoken = formatSpringsSpokenKo(springCode, exercise.apparatus);
  const footbar = step?.footbarOverride ?? exercise.footbar;
  const headrest = step?.headrestOverride ?? exercise.headrest;
  const box = step?.boxOverride ?? exercise.box;
  const props = resolveActivePropLabels(exercise, step);
  const positionAction =
    POSITION_SPOKEN_ACTION_KO[exercise.bodyPosition] ?? '편안한 시작 자세를 잡아볼게요';
  const apparatusKo = APPARATUS_LABELS[exercise.apparatus]?.ko ?? '기구';

  const clauses: string[] = [];

  if (exercise.apparatus === 'mat' || exercise.apparatus === 'barrel') {
    clauses.push(`${apparatusKo}에서 ${springSpoken}으로 준비해 주시고요`);
  } else if (springSpoken.includes('스프링 없이')) {
    clauses.push(`먼저 ${apparatusKo}에서 ${springSpoken}으로 진행할게요`);
  } else {
    clauses.push(`먼저 스프링은 ${springSpoken} 걸어주시고요`);
  }

  const boxClause = BOX_SPOKEN_KO[box];
  if (boxClause) {
    clauses.push(boxClause);
  }

  if (exercise.apparatus === 'reformer') {
    const footbarClause = FOOTBAR_SPOKEN_KO[footbar];
    if (footbarClause) {
      clauses.push(footbarClause);
    }
    const headrestClause = HEADREST_SPOKEN_KO[headrest];
    if (headrestClause) {
      if (props.length > 0) {
        clauses.push(`${headrestClause} ${formatKoreanParticle(props[0], '을/를')} 챙겨 ${positionAction}`);
      } else {
        clauses.push(`${headrestClause} ${positionAction}`);
      }
      return ensureNaturalEnding(clauses.join(', '));
    }
  }

  if (props.length > 0) {
    clauses.push(`${formatKoreanParticle(props[0], '을/를')} 옆에 두고 ${positionAction}`);
  } else {
    clauses.push(positionAction);
  }

  return ensureNaturalEnding(clauses.join(', '));
}

function buildWarmBreathSentence(exercise: PilatesExercise): string {
  const rawBreath = cleanSpokenKoreanText(exercise.breathPattern ?? '');
  if (!rawBreath) {
    return '코로 깊게 마셨다가, 입으로 부드럽게 내쉬면서 동작을 천천히 이어갈게요.';
  }

  const normalized = rawBreath
    .replace(/^들쉬며/, '코로 깊게 마시면서')
    .replace(/^내쉬며/, '내쉬는 숨에')
    .replace(/들쉬며/g, '마시는 숨에')
    .replace(/내쉬며/g, '내쉬는 숨에');

  if (/(볼게요|할게요|주세요|가요|해요)[.!?]?$/.test(normalized)) {
    return ensureNaturalEnding(normalized);
  }
  return ensureNaturalEnding(`호흡은 이렇게 맞춰볼게요. ${normalized} 리듬으로 부드럽게 이어가 주세요`);
}

function softenCueToWarmSpeech(cue: string): string {
  const cleaned = cleanSpokenKoreanText(cue);
  if (!cleaned) return '';
  return ensureNaturalEnding(
    cleaned
      .replace(/유지합니다\.?$/, '유지해 주세요.')
      .replace(/만듭니다\.?$/, '만들어 볼게요.')
      .replace(/밀어냅니다\.?$/, '밀어낼게요.')
      .replace(/컨트롤합니다\.?$/, '부드럽게 조절해 주세요.')
      .replace(/일치시킵니다\.?$/, '나란히 맞춰 주세요.')
      .replace(/유도합니다\.?$/, '편안하게 유지해 주세요.'),
  );
}

function buildWarmTipSentence(exercise: ExerciseWithOptionalAnatomy): string {
  const faultItem = exercise.anatomyInsight?.commonFaultsKo?.[0];
  if (faultItem?.fixCue?.trim()) {
    const faultIntro = faultItem.fault?.trim()
      ? `${cleanSpokenKoreanText(faultItem.fault)} 실수가 자주 나오는데요, `
      : '자주 나오는 실수 한 가지만 짚어드릴게요. ';
    return `${faultIntro}${softenCueToWarmSpeech(faultItem.fixCue)}`;
  }

  const rawPrecautions = cleanSpokenKoreanText(exercise.precautions ?? '');
  if (!rawPrecautions) {
    return '한 가지만 더 챙겨드릴게요. 목과 어깨에 불필요한 힘이 들어가지 않도록 호흡을 끝까지 부드럽게 이어가 주세요.';
  }
  return `자주 놓치기 쉬운 포인트 한 가지만 짚어드릴게요. ${softenCueToWarmSpeech(rawPrecautions)}`;
}

function createSegment(
  id: string,
  index: number,
  tone: NaturalVoiceTone,
  textKo: string,
  extra?: Partial<Omit<NaturalVoiceSegment, 'id' | 'index' | 'tone' | 'textKo' | 'labelKo' | 'pauseMs' | 'prosody'>> & {
    labelKo?: string;
    pauseMs?: number;
    breathChime?: BreathChimeKind;
  },
): NaturalVoiceSegment {
  const preset = NATURAL_VOICE_PROSODY_BY_TONE[tone];
  const pauseMs = Math.max(350, Math.min(850, extra?.pauseMs ?? preset.defaultPauseMs));
  return {
    id,
    index,
    tone,
    labelKo: extra?.labelKo ?? NATURAL_VOICE_TONE_LABELS_KO[tone],
    textKo: ensureNaturalEnding(textKo),
    pauseMs,
    prosody: {
      rateScale: preset.rateScale,
      pitch: preset.pitch,
      breathChime: extra?.breathChime ?? preset.breathChime,
    },
    ...(extra?.stepIndex !== undefined ? { stepIndex: extra.stepIndex } : {}),
    ...(extra?.stepOrder !== undefined ? { stepOrder: extra.stepOrder } : {}),
    ...(extra?.exerciseId !== undefined ? { exerciseId: extra.exerciseId } : {}),
    ...(extra?.exerciseNameKo !== undefined ? { exerciseNameKo: extra.exerciseNameKo } : {}),
    ...(extra?.springCode !== undefined ? { springCode: extra.springCode } : {}),
    ...(extra?.springSpokenKo !== undefined ? { springSpokenKo: extra.springSpokenKo } : {}),
    ...(extra?.countdownSec !== undefined ? { countdownSec: extra.countdownSec } : {}),
    ...(extra?.breathTempoRatio !== undefined ? { breathTempoRatio: extra.breathTempoRatio } : {}),
    ...(extra?.quizCard !== undefined ? { quizCard: extra.quizCard } : {}),
  };
}

function estimateAudioDurationSec(segments: readonly NaturalVoiceSegment[]): number {
  const totalSec = segments.reduce((sum, seg) => {
    const chars = seg.textKo.replace(/\s+/g, '').length;
    const speechSec = chars / 4.8;
    const pauseSec = seg.pauseMs / 1000;
    const countdownSec = seg.countdownSec ?? 0;
    return sum + speechSec + pauseSec + countdownSec;
  }, 0);
  return Math.max(8, Math.round(totalSec));
}

export interface BuildNaturalExerciseScriptOptions {
  readonly step?: SequenceStep;
  readonly orderLabel?: string;
  readonly stepIndex?: number;
  readonly stepOrder?: number;
  readonly includeTip?: boolean;
  readonly concise?: boolean;
}

/**
 * Rewrites structured Pilates exercise metadata into a warm, natural spoken Korean
 * script with prosody and breathing pause timing (350~850ms).
 */
export function buildNaturalExerciseScript(
  exercise: PilatesExercise,
  options: BuildNaturalExerciseScriptOptions = {},
): NaturalVoiceScript {
  const ex = exercise as ExerciseWithOptionalAnatomy;
  const { step, orderLabel, stepIndex, stepOrder, includeTip = true, concise = false } = options;

  const cleanNameKo = cleanSpokenKoreanText(ex.nameKo);
  const springCode = step?.customSpringOverride?.trim() || ex.springs?.trim() || 'Bodyweight';
  const springSpokenKo = formatSpringsSpokenKo(springCode, ex.apparatus);
  const sharedMeta = {
    stepIndex,
    stepOrder,
    exerciseId: ex.id,
    exerciseNameKo: ex.nameKo,
    springCode,
    springSpokenKo,
  };

  const segments: NaturalVoiceSegment[] = [];

  // 1. Warm Intro + 1-line benefit
  const introLead = orderLabel
    ? `${orderLabel} 동작은 ${formatKoreanParticle(cleanNameKo, '이에요/예요')}`
    : `이번 동작은 ${formatKoreanParticle(cleanNameKo, '이에요/예요')}`;
  const sideNote = ex.isUnilateral ? ' 양쪽을 번갈아 진행하는 동작이고요, ' : ' ';
  const benefitLine = buildWarmBenefitSentence(ex);
  segments.push(
    createSegment(
      `${ex.id}-natural-intro`,
      segments.length,
      'warm-intro',
      `${introLead}.${sideNote}${benefitLine}`,
      { ...sharedMeta, pauseMs: 550 },
    ),
  );

  // 2. Setup guidance (springs, footbar, headrest, box, props, position)
  segments.push(
    createSegment(
      `${ex.id}-natural-setup`,
      segments.length,
      'setup',
      buildWarmSetupSentence(ex, step),
      { ...sharedMeta, pauseMs: 650 },
    ),
  );

  // 3. Breath guidance
  segments.push(
    createSegment(
      `${ex.id}-natural-breath`,
      segments.length,
      'breath',
      buildWarmBreathSentence(ex),
      { ...sharedMeta, pauseMs: 800, breathChime: 'inhale' },
    ),
  );

  // 4. Key teaching cues (warm conversational phrasing)
  const rawCues: string[] = [];
  if (step?.instructorNote?.trim()) {
    rawCues.push(step.instructorNote.trim());
  }
  for (const cue of ex.cues ?? []) {
    if (cue.trim()) rawCues.push(cue.trim());
  }
  const cueLimit = concise ? 2 : 3;
  const selectedCues = rawCues.slice(0, cueLimit);

  if (selectedCues.length === 0) {
    segments.push(
      createSegment(
        `${ex.id}-natural-cue-0`,
        segments.length,
        'cue',
        '척추를 길게 세운 상태에서 호흡에 맞춰 부드럽고 흔들림 없이 움직여 볼게요.',
        { ...sharedMeta, pauseMs: 500 },
      ),
    );
  } else {
    selectedCues.forEach((cue, idx) => {
      const spokenCue = softenCueToWarmSpeech(cue);
      const prefixed =
        idx === 0
          ? spokenCue
          : idx === 1
            ? `이때 ${spokenCue}`
            : `마지막으로 ${spokenCue}`;
      segments.push(
        createSegment(`${ex.id}-natural-cue-${idx}`, segments.length, 'cue', prefixed, {
          ...sharedMeta,
          pauseMs: idx === selectedCues.length - 1 ? 580 : 450,
        }),
      );
    });
  }

  // 5. Common fault correction tip (1 concise line)
  if (includeTip) {
    segments.push(
      createSegment(
        `${ex.id}-natural-tip`,
        segments.length,
        'tip',
        buildWarmTipSentence(ex),
        { ...sharedMeta, pauseMs: 650 },
      ),
    );
  }

  const fullTextKo = segments.map((seg) => seg.textKo).join('\n');
  return {
    exerciseId: ex.id,
    exerciseNameKo: ex.nameKo,
    titleKo: `${ex.nameKo} 강사 음성 설명`,
    segments,
    fullTextKo,
    estimatedDurationSec: estimateAudioDurationSec(segments),
    disclaimerKo: NATURAL_VOICE_DISCLAIMER_KO,
  };
}

export interface BuildSequenceRehearsalScriptInput {
  readonly sequenceTitle: string;
  readonly steps: readonly SequenceStep[];
  readonly exercisesById: ReadonlyMap<string, PilatesExercise>;
  readonly mode: SequenceAudioRehearsalMode;
  readonly level?: DifficultyLevel;
  readonly quizCountdownSec?: number;
  /** Optional subset of stepIds (e.g., confused steps only) to build a focused drill script. */
  readonly focusStepIds?: readonly string[];
}

function resolvePositionGroupKey(position: PilatesExercise['bodyPosition'] | 'rest'): string {
  switch (position) {
    case 'supine':
      return 'supine';
    case 'seated':
    case 'kneeling':
      return 'seated-kneeling';
    case 'side-lying':
      return 'side-lying';
    case 'prone':
    case 'quadruped':
      return 'prone-quadruped';
    case 'standing':
      return 'standing';
    default:
      return 'rest';
  }
}

function getActNarrativeTitle(actNumber: number, dominantPositionKo: string, totalActs: number): string {
  if (actNumber === 1) return `1막 · ${dominantPositionKo} 열기`;
  if (actNumber === totalActs && totalActs >= 3) return `${actNumber}막 · ${dominantPositionKo} 마무리`;
  return `${actNumber}막 · ${dominantPositionKo} 흐름`;
}

/**
 * Groups sequence steps into 3~4 intuitive memorization chunks (Acts)
 * anchored by body position and spring flow so instructors recall blocks instead of isolated items.
 */
export function buildSequenceChunkMap(
  steps: readonly SequenceStep[],
  exercisesById: ReadonlyMap<string, PilatesExercise>,
  firstSegmentIndexByStepIndex?: ReadonlyMap<number, number>,
): SequenceChunkAct[] {
  if (steps.length === 0) return [];

  interface RawStepInfo {
    stepIndex: number;
    stepOrder: number;
    stepId: string;
    nameKo: string;
    isRest: boolean;
    positionGroup: string;
    positionLabelKo: string;
    springCode: string;
    durationMin: number;
  }

  const enriched: RawStepInfo[] = steps.map((step, idx) => {
    if (isRestStep(step)) {
      return {
        stepIndex: idx,
        stepOrder: idx + 1,
        stepId: step.stepId,
        nameKo: '중간 휴식 · 호흡 정리',
        isRest: true,
        positionGroup: 'rest',
        positionLabelKo: '호흡 정리',
        springCode: '세팅 유지',
        durationMin: Math.max(0, step.durationMin || 0),
      };
    }
    const ex = exercisesById.get(step.exerciseId);
    const pos = ex?.bodyPosition ?? 'supine';
    return {
      stepIndex: idx,
      stepOrder: idx + 1,
      stepId: step.stepId,
      nameKo: ex?.nameKo ?? '시퀀스 동작',
      isRest: false,
      positionGroup: resolvePositionGroupKey(pos),
      positionLabelKo: POSITION_SHORT_KO[pos],
      springCode: step.customSpringOverride?.trim() || ex?.springs?.trim() || 'Bodyweight',
      durationMin: Math.max(0, step.durationMin || 0),
    };
  });

  // First pass: split whenever body position group changes (keeping rest attached to current group)
  const rawGroups: RawStepInfo[][] = [];
  for (const item of enriched) {
    const current = rawGroups.at(-1);
    if (!current) {
      rawGroups.push([item]);
      continue;
    }
    const prevNonRest = [...current].reverse().find((x) => !x.isRest);
    if (item.isRest || !prevNonRest) {
      current.push(item);
      continue;
    }
    const samePosition = prevNonRest.positionGroup === item.positionGroup;
    const sameSpring = prevNonRest.springCode === item.springCode;
    if (samePosition && (sameSpring || current.length < 4)) {
      current.push(item);
    } else if (!samePosition || current.length >= 4) {
      rawGroups.push([item]);
    } else {
      current.push(item);
    }
  }

  // Normalize to 3~4 acts when there are >= 4 steps (never more than 4 acts so it stays effortless to remember!)
  while (rawGroups.length > 4) {
    // Merge the smallest group with its smaller neighbor
    let smallestIdx = 0;
    for (let i = 1; i < rawGroups.length; i += 1) {
      if (rawGroups[i].length < rawGroups[smallestIdx].length) {
        smallestIdx = i;
      }
    }
    if (smallestIdx === 0) {
      rawGroups[0] = [...rawGroups[0], ...rawGroups[1]];
      rawGroups.splice(1, 1);
    } else if (smallestIdx === rawGroups.length - 1) {
      rawGroups[smallestIdx - 1] = [...rawGroups[smallestIdx - 1], ...rawGroups[smallestIdx]];
      rawGroups.splice(smallestIdx, 1);
    } else {
      const mergeLeft = rawGroups[smallestIdx - 1].length <= rawGroups[smallestIdx + 1].length;
      if (mergeLeft) {
        rawGroups[smallestIdx - 1] = [...rawGroups[smallestIdx - 1], ...rawGroups[smallestIdx]];
        rawGroups.splice(smallestIdx, 1);
      } else {
        rawGroups[smallestIdx] = [...rawGroups[smallestIdx], ...rawGroups[smallestIdx + 1]];
        rawGroups.splice(smallestIdx + 1, 1);
      }
    }
  }

  // If 6+ steps collapsed into only 1~2 chunks (e.g., all supine), split into 3 evenly paced acts
  const targetMinActs = enriched.length >= 6 ? 3 : enriched.length >= 4 ? 3 : rawGroups.length;
  while (rawGroups.length < targetMinActs) {
    let largestIdx = 0;
    for (let i = 1; i < rawGroups.length; i += 1) {
      if (rawGroups[i].length > rawGroups[largestIdx].length) {
        largestIdx = i;
      }
    }
    if (rawGroups[largestIdx].length < 2) break;
    const splitPoint = Math.ceil(rawGroups[largestIdx].length / 2);
    const firstHalf = rawGroups[largestIdx].slice(0, splitPoint);
    const secondHalf = rawGroups[largestIdx].slice(splitPoint);
    rawGroups.splice(largestIdx, 1, firstHalf, secondHalf);
  }

  return rawGroups.map((group, idx) => {
    const actNumber = idx + 1;
    const nonRest = group.filter((item) => !item.isRest);
    const posCounts = new Map<string, number>();
    for (const item of nonRest) {
      posCounts.set(item.positionLabelKo, (posCounts.get(item.positionLabelKo) ?? 0) + 1);
    }
    const dominantPositionKo =
      [...posCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '기본 자세';

    const uniqueSprings = [...new Set(nonRest.map((item) => item.springCode).filter(Boolean))];
    const springSummaryKo =
      uniqueSprings.length === 0
        ? '맨몸'
        : uniqueSprings.length === 1
          ? uniqueSprings[0] === 'Bodyweight'
            ? '맨몸'
            : `${uniqueSprings[0]} 유지`
          : uniqueSprings
              .slice(0, 2)
              .map((s) => (s === 'Bodyweight' ? '맨몸' : s))
              .join(' → ');

    const springChanges = Math.max(0, uniqueSprings.length - 1);
    const transitionHintKo =
      springChanges === 0
        ? '스프링 변경 없이 연속 흐름'
        : `막 내 스프링 ${springChanges}회 조절`;

    const firstStepIndex = group[0].stepIndex;
    return {
      actNumber,
      titleKo: getActNarrativeTitle(actNumber, dominantPositionKo, rawGroups.length),
      positionLabelKo: dominantPositionKo,
      springSummaryKo,
      totalDurationMin: Math.round(group.reduce((sum, item) => sum + item.durationMin, 0)),
      stepIndices: group.map((item) => item.stepIndex),
      stepOrders: group.map((item) => item.stepOrder),
      stepIds: group.map((item) => item.stepId),
      stepNamesKo: group.map((item) => item.nameKo),
      firstStepIndex,
      firstSegmentIndex: firstSegmentIndexByStepIndex?.get(firstStepIndex) ?? 0,
      transitionHintKo,
    };
  });
}

/**
 * Builds a complete hands-free audio rehearsal script for a Pilates sequence
 * across 4 commuter-friendly modes: podcast walkthrough, 3-minute fast walkthrough (15s/move),
 * blank memorization quiz, and breath tempo.
 */
export function buildSequenceRehearsalScript(
  input: BuildSequenceRehearsalScriptInput,
): SequenceAudioRehearsalScript {
  const {
    sequenceTitle,
    steps,
    exercisesById,
    mode,
    level = '1.5',
    quizCountdownSec = 3,
    focusStepIds,
  } = input;

  const titleClean = cleanSpokenKoreanText(sequenceTitle) || '오늘의 필라테스 시퀀스';
  const focusSet = focusStepIds && focusStepIds.length > 0 ? new Set(focusStepIds) : null;
  const activeEntries = steps
    .map((step, originalIndex) => ({ step, originalIndex, originalOrder: originalIndex + 1 }))
    .filter(({ step }) => !focusSet || focusSet.has(step.stepId));

  const totalDurationMin = Math.round(
    activeEntries.reduce((sum, { step }) => sum + Math.max(0, step.durationMin || 0), 0),
  );
  const exerciseStepCount = activeEntries.filter(({ step }) => !isRestStep(step)).length;
  const segments: NaturalVoiceSegment[] = [];
  const stepSummaries: SequenceAudioRehearsalStepSummary[] = [];
  const firstSegmentIndexByStepIndex = new Map<number, number>();

  if (activeEntries.length === 0) {
    return {
      mode,
      modeLabelKo: REHEARSAL_MODE_META_KO[mode].labelKo,
      sequenceTitle: titleClean,
      segments: [],
      steps: [],
      chunks: [],
      totalDurationMin: 0,
      estimatedAudioSec: 0,
      fullTextKo: '',
      disclaimerKo: NATURAL_VOICE_DISCLAIMER_KO,
    };
  }

  const focusLead = focusSet ? `헷갈린 ${exerciseStepCount}개 동작만 집중해서 ` : '';
  const openingText =
    mode === 'podcast'
      ? `안녕하세요 강사님, ${titleClean} ${focusLead}이어듣기를 시작할게요. 총 ${exerciseStepCount}개 동작, 약 ${totalDurationMin || 50}분 흐름을 처음부터 끝까지 편하게 들려드릴게요.`
      : mode === 'fast-3min'
        ? `${titleClean} ${focusLead}3분 고속 워크스루 시작할게요! 동작마다 핵심 스프링과 큐 한 줄씩, 15초 템포로 쭉 짚어드릴게요.`
        : mode === 'quiz'
          ? `${titleClean} ${focusLead}빈칸 암기 퀴즈를 시작할게요. 화면을 보지 마시고, 제가 번호를 부르면 ${quizCountdownSec}초 안에 동작 이름과 스프링을 먼저 떠올려 보세요.`
          : `${titleClean} ${focusLead}호흡 템포 리허설을 시작할게요. 부드러운 들숨과 날숨 알림음에 맞춰 실제 수업처럼 차분하게 큐잉을 연습해 보세요.`;

  segments.push(
    createSegment(`seq-opening-${mode}`, segments.length, 'warm-intro', openingText, {
      labelKo: focusSet ? '헷갈린 동작 집중 시작' : '리허설 시작',
      pauseMs: mode === 'fast-3min' ? 450 : 750,
      breathChime: 'bell',
    }),
  );

  let previousExerciseName: string | null = null;

  activeEntries.forEach(({ step, originalIndex: stepIndex, originalOrder: stepOrder }) => {
    const firstSegmentIndex = segments.length;
    firstSegmentIndexByStepIndex.set(stepIndex, firstSegmentIndex);

    if (isRestStep(step)) {
      const restBreath = buildStepBreathingCadence(step, undefined, level);
      stepSummaries.push({
        stepIndex,
        stepOrder,
        stepId: step.stepId,
        exerciseId: step.exerciseId,
        nameKo: '중간 휴식 · 호흡 정리',
        isRest: true,
        positionLabelKo: '호흡 정리',
        springCode: '세팅 유지',
        springSpokenKo: '세팅 그대로',
        keyCueKo: '어깨 긴장을 풀고 깊게 숨을 골라주세요.',
        durationMin: step.durationMin,
        firstSegmentIndex,
      });

      if (mode === 'fast-3min') {
        segments.push(
          createSegment(
            `fast-rest-${step.stepId}`,
            segments.length,
            'breath',
            `${stepOrder}번은 잠시 숨 고르기, 세팅은 그대로 유지해요.`,
            {
              labelKo: `${stepOrder}번 휴식`,
              stepIndex,
              stepOrder,
              exerciseNameKo: '중간 휴식 · 호흡 정리',
              pauseMs: 400,
              breathChime: 'exhale',
            },
          ),
        );
      } else if (mode === 'quiz') {
        segments.push(
          createSegment(
            `seq-rest-${step.stepId}`,
            segments.length,
            'breath',
            `${stepOrder}번 구간은 잠시 숨을 고르는 휴식 시간이에요. 어깨를 툭 내려놓고 다음 동작을 준비해 볼게요.`,
            {
              labelKo: `${stepOrder}번 휴식`,
              stepIndex,
              stepOrder,
              exerciseNameKo: '중간 휴식 · 호흡 정리',
              pauseMs: 750,
              breathChime: 'exhale',
            },
          ),
        );
      } else {
        segments.push(
          createSegment(
            `seq-rest-${step.stepId}`,
            segments.length,
            'breath',
            `${stepOrder}번은 잠시 호흡을 정리하는 구간이에요. ${cleanSpokenKoreanText(restBreath.inhalePhaseKo)}, 그리고 ${cleanSpokenKoreanText(restBreath.exhalePhaseKo)} 리듬으로 몸을 가볍게 풀어주세요.`,
            {
              labelKo: `${stepOrder}번 휴식 호흡`,
              stepIndex,
              stepOrder,
              exerciseNameKo: '중간 휴식 · 호흡 정리',
              pauseMs: 850,
              breathChime: 'exhale',
              breathTempoRatio: restBreath.tempoRatio,
            },
          ),
        );
      }
      return;
    }

    const exercise = exercisesById.get(step.exerciseId);
    const nameKo = exercise?.nameKo ?? '시퀀스 동작';
    const cleanName = cleanSpokenKoreanText(nameKo);
    const apparatus = exercise?.apparatus ?? 'reformer';
    const apparatusKo = APPARATUS_LABELS[apparatus]?.ko ?? '기구';
    const springCode = step.customSpringOverride?.trim() || exercise?.springs?.trim() || 'Bodyweight';
    const springSpokenKo = formatSpringsSpokenKo(springCode, apparatus);
    const positionKo = exercise
      ? POSITION_SHORT_KO[exercise.bodyPosition]
      : '기본 자세';
    const keyCueRaw =
      step.instructorNote?.trim() ||
      exercise?.cues?.[0]?.trim() ||
      '호흡에 맞춰 중심을 단단히 유지해 주세요.';
    const keyCueKo = softenCueToWarmSpeech(keyCueRaw);

    if (mode === 'podcast') {
      if (exercise) {
        const orderLabel = stepOrder === 1 ? '첫 번째' : `${stepOrder}번`;
        const built = buildNaturalExerciseScript(exercise, {
          step,
          orderLabel,
          stepIndex,
          stepOrder,
          includeTip: true,
          concise: true,
        });
        for (const seg of built.segments) {
          segments.push({
            ...seg,
            id: `podcast-${step.stepId}-${seg.id}`,
            index: segments.length,
          });
        }
      } else {
        segments.push(
          createSegment(
            `podcast-fallback-${step.stepId}`,
            segments.length,
            'warm-intro',
            `${stepOrder}번 동작은 ${formatKoreanParticle(cleanName, '이에요/예요')}. 스프링은 ${springSpokenKo} 기준으로 준비하고, ${keyCueKo}`,
            {
              stepIndex,
              stepOrder,
              exerciseId: step.exerciseId,
              exerciseNameKo: nameKo,
              springCode,
              springSpokenKo,
              pauseMs: 650,
            },
          ),
        );
      }

      stepSummaries.push({
        stepIndex,
        stepOrder,
        stepId: step.stepId,
        exerciseId: step.exerciseId,
        nameKo,
        isRest: false,
        positionLabelKo: positionKo,
        springCode,
        springSpokenKo,
        keyCueKo,
        durationMin: step.durationMin,
        firstSegmentIndex,
      });
    } else if (mode === 'fast-3min') {
      // ~15-second ultra-crisp briefing per exercise (Name + Spring + Position + 1 Core Cue)
      const shortCue =
        keyCueKo.length > 52 ? `${keyCueKo.slice(0, 48).replace(/[.,\s]+$/, '')}에 집중해요.` : keyCueKo;
      const springBrief = springSpokenKo.includes('스프링 없이')
        ? `${apparatusKo} 맨몸`
        : `스프링 ${springSpokenKo}`;
      const fastText = `${stepOrder}번 ${cleanName}! ${springBrief}, ${positionKo}예요. 핵심은 ${shortCue}`;

      segments.push(
        createSegment(`fast-3min-${step.stepId}`, segments.length, 'cue', fastText, {
          labelKo: `${stepOrder}번 · 15초 핵심`,
          stepIndex,
          stepOrder,
          exerciseId: step.exerciseId,
          exerciseNameKo: nameKo,
          springCode,
          springSpokenKo,
          pauseMs: 420,
          breathChime: stepOrder === 1 ? 'none' : 'bell',
        }),
      );

      stepSummaries.push({
        stepIndex,
        stepOrder,
        stepId: step.stepId,
        exerciseId: step.exerciseId,
        nameKo,
        isRest: false,
        positionLabelKo: positionKo,
        springCode,
        springSpokenKo,
        keyCueKo,
        durationMin: step.durationMin,
        firstSegmentIndex,
      });
    } else if (mode === 'quiz') {
      const quizCard: SequenceQuizCard = {
        stepIndex,
        stepOrder,
        exerciseId: step.exerciseId,
        previousNameKo: previousExerciseName,
        answerNameKo: nameKo,
        answerApparatusKo: apparatusKo,
        answerSpringCode: springCode,
        answerSpringSpokenKo: springSpokenKo,
        answerPositionKo: positionKo,
        answerKeyCueKo: keyCueKo,
      };

      const promptText = previousExerciseName
        ? `다음 ${stepOrder}번 동작, 기억나시나요? 방금 전 ${cleanSpokenKoreanText(previousExerciseName)} 다음에 이어질 동작과 스프링 세팅을 떠올려 보세요.`
        : `자, 첫 번째 ${stepOrder}번 동작부터 맞춰볼게요. 수업을 여는 동작과 스프링 세팅, 기억나시나요?`;

      segments.push(
        createSegment(`quiz-prompt-${step.stepId}`, segments.length, 'quiz-prompt', promptText, {
          labelKo: `${stepOrder}번 문제`,
          stepIndex,
          stepOrder,
          exerciseId: step.exerciseId,
          exerciseNameKo: nameKo,
          springCode,
          springSpokenKo,
          countdownSec: quizCountdownSec,
          pauseMs: 850,
          breathChime: 'quiz-tick',
          quizCard,
        }),
      );

      const quizAnswerSegmentIndex = segments.length;
      const springAnswerClause = springSpokenKo.includes('스프링 없이')
        ? `${apparatusKo}에서 ${springSpokenKo}으로 진행하고요`
        : `스프링은 ${springSpokenKo}`;
      const answerText = `정답! ${formatKoreanParticle(cleanName, '이에요/예요')}. ${springAnswerClause}, ${positionKo}에서 시작해요. 핵심 큐는 ${keyCueKo}`;

      segments.push(
        createSegment(`quiz-answer-${step.stepId}`, segments.length, 'quiz-answer', answerText, {
          labelKo: `${stepOrder}번 정답`,
          stepIndex,
          stepOrder,
          exerciseId: step.exerciseId,
          exerciseNameKo: nameKo,
          springCode,
          springSpokenKo,
          pauseMs: 750,
          breathChime: 'quiz-reveal',
          quizCard,
        }),
      );

      stepSummaries.push({
        stepIndex,
        stepOrder,
        stepId: step.stepId,
        exerciseId: step.exerciseId,
        nameKo,
        isRest: false,
        positionLabelKo: positionKo,
        springCode,
        springSpokenKo,
        keyCueKo,
        durationMin: step.durationMin,
        firstSegmentIndex,
        quizAnswerSegmentIndex,
      });
    } else {
      // 'breath-tempo' mode
      const cadence = buildStepBreathingCadence(step, exercise, level);
      const inhaleText = cleanSpokenKoreanText(cadence.inhalePhaseKo);
      const exhaleText = cleanSpokenKoreanText(cadence.exhalePhaseKo);

      segments.push(
        createSegment(
          `breath-intro-${step.stepId}`,
          segments.length,
          'setup',
          `${stepOrder}번 ${cleanName}, 스프링은 ${springSpokenKo} 준비할게요. 호흡 템포는 ${cadence.tempoRatio.replace(/:/g, ' 대 ')} 리듬이에요.`,
          {
            labelKo: `${stepOrder}번 준비`,
            stepIndex,
            stepOrder,
            exerciseId: step.exerciseId,
            exerciseNameKo: nameKo,
            springCode,
            springSpokenKo,
            breathTempoRatio: cadence.tempoRatio,
            pauseMs: 650,
            breathChime: 'bell',
          },
        ),
      );

      segments.push(
        createSegment(
          `breath-inhale-${step.stepId}`,
          segments.length,
          'breath',
          `코로 천천히 들이마실게요. ${inhaleText}.`,
          {
            labelKo: `${stepOrder}번 들숨`,
            stepIndex,
            stepOrder,
            exerciseId: step.exerciseId,
            exerciseNameKo: nameKo,
            springCode,
            springSpokenKo,
            breathTempoRatio: cadence.tempoRatio,
            pauseMs: 850,
            breathChime: 'inhale',
          },
        ),
      );

      segments.push(
        createSegment(
          `breath-exhale-${step.stepId}`,
          segments.length,
          'breath',
          `입으로 길게 내쉬면서 움직여 볼게요. ${exhaleText}. ${keyCueKo}`,
          {
            labelKo: `${stepOrder}번 날숨 큐잉`,
            stepIndex,
            stepOrder,
            exerciseId: step.exerciseId,
            exerciseNameKo: nameKo,
            springCode,
            springSpokenKo,
            breathTempoRatio: cadence.tempoRatio,
            pauseMs: 850,
            breathChime: 'exhale',
          },
        ),
      );

      stepSummaries.push({
        stepIndex,
        stepOrder,
        stepId: step.stepId,
        exerciseId: step.exerciseId,
        nameKo,
        isRest: false,
        positionLabelKo: positionKo,
        springCode,
        springSpokenKo,
        keyCueKo,
        durationMin: step.durationMin,
        firstSegmentIndex,
      });
    }

    previousExerciseName = nameKo;
  });

  // Closing wrap-up
  const closingText =
    mode === 'fast-3min'
      ? '고속 리허설 끝! 이제 자신 있게 스튜디오로 들어가셔도 좋아요.'
      : mode === 'quiz'
        ? '수고하셨어요! 오늘 시퀀스 빈칸 암기 퀴즈를 끝까지 완주하셨어요. 헷갈렸던 구간만 한 번 더 들으면 수업 때 자신 있게 이어가실 수 있어요.'
        : mode === 'breath-tempo'
          ? '호흡 템포 리허설이 모두 끝났어요. 오늘 수업도 차분하고 안정된 호흡으로 멋지게 이끌어 보세요.'
          : '여기까지 오늘 수업 전체 흐름을 모두 짚어봤어요. 편안한 마음으로 멋진 수업 진행하시길 응원할게요.';

  segments.push(
    createSegment(`seq-closing-${mode}`, segments.length, 'warm-intro', closingText, {
      labelKo: '리허설 마무리',
      pauseMs: mode === 'fast-3min' ? 400 : 500,
      breathChime: 'bell',
    }),
  );

  const chunks = buildSequenceChunkMap(
    activeEntries.map((entry) => entry.step),
    exercisesById,
    new Map(
      activeEntries.map((entry, filteredIdx) => [
        filteredIdx,
        firstSegmentIndexByStepIndex.get(entry.originalIndex) ?? 0,
      ]),
    ),
  );

  return {
    mode,
    modeLabelKo: REHEARSAL_MODE_META_KO[mode].labelKo,
    sequenceTitle: titleClean,
    segments,
    steps: stepSummaries,
    chunks,
    totalDurationMin,
    estimatedAudioSec: estimateAudioDurationSec(segments),
    fullTextKo: segments.map((seg) => seg.textKo).join('\n'),
    disclaimerKo: NATURAL_VOICE_DISCLAIMER_KO,
  };
}
