/**
 * 온디바이스 강사 티칭 습관 코치 분석 엔진.
 * 브라우저 안에서만 한국어 발화 템포, 단골 습관어, 호흡·정렬·격려 큐 균형을 분석하며
 * 음성을 외부 서버로 전송하거나 녹음 파일로 저장하지 않는다.
 */

export type TeachingPaceRating = 'calm' | 'fast' | 'slow';

export type TeachingCoachSourceMode = 'live-mic' | 'text-rehearsal' | 'sample';

export interface TeachingVoiceSample {
  transcript: string;
  durationSec: number;
  pauseCount?: number;
  recordedAt?: string;
  sequenceTitle?: string;
}

export interface FillerWordCount {
  word: string;
  count: number;
}

export interface CueBalanceSummary {
  breathCount: number;
  alignmentCount: number;
  encouragementCount: number;
  breathRatio: number;
  alignmentRatio: number;
  encouragementRatio: number;
}

export interface TeachingHabitAnalysis {
  wordsPerMinute: number;
  syllablesPerMinute: number;
  paceRating: TeachingPaceRating;
  paceLabelKo: string;
  fillerCounts: Array<{ word: string; count: number }>;
  totalFillers: number;
  fillerRatePerMin: number;
  cueBalance: CueBalanceSummary;
  strengthsKo: string[];
  coachingTipsKo: string[];
  overallScore: number;
}

export interface TeachingSampleScript {
  readonly id: 'calm-reformer' | 'fast-filler-rehearsal' | 'balanced-exemplar';
  readonly labelKo: string;
  readonly shortTagKo: string;
  readonly descriptionKo: string;
  readonly sequenceTitle: string;
  readonly durationSec: number;
  readonly pauseCount: number;
  readonly transcript: string;
}

export interface TeachingCoachHistoryEntry {
  readonly id: string;
  readonly savedAt: string;
  readonly sequenceTitle: string;
  readonly exerciseContextKo?: string;
  readonly durationSec: number;
  readonly sourceMode: TeachingCoachSourceMode;
  readonly overallScore: number;
  readonly wordsPerMinute: number;
  readonly syllablesPerMinute: number;
  readonly paceRating: TeachingPaceRating;
  readonly paceLabelKo: string;
  readonly totalFillers: number;
  readonly fillerRatePerMin: number;
  readonly topFillerWord?: string;
  readonly cueBalance: CueBalanceSummary;
  readonly transcriptExcerptKo: string;
}

export interface SaveTeachingCoachEntryInput {
  sample: TeachingVoiceSample;
  analysis: TeachingHabitAnalysis;
  exerciseContextKo?: string;
  sourceMode?: TeachingCoachSourceMode;
  savedAt?: string;
}

export interface SaveTeachingCoachResult {
  readonly ok: boolean;
  readonly entry: TeachingCoachHistoryEntry | null;
  readonly entries: TeachingCoachHistoryEntry[];
  readonly errorKo: string | null;
  readonly redactedPersonalInfo: boolean;
}

export interface TeachingHistoryComparison {
  readonly scoreDelta: number;
  readonly fillerRateDelta: number;
  readonly syllablesDelta: number;
  readonly summaryKo: string;
}

export const TEACHING_COACH_HISTORY_KEY = 'pf_teaching_voice_coach_history_v1';
export const MAX_TEACHING_COACH_HISTORY_ENTRIES = 10;

export const KOREAN_FILLER_WORDS = [
  '자',
  '어',
  '음',
  '약간',
  '조금',
  '이제',
  '한번',
  '그냥',
  '일단',
] as const;

type KoreanFillerWord = (typeof KOREAN_FILLER_WORDS)[number];

const SINGLE_TOKEN_FILLER_PATTERNS: ReadonlyArray<{
  word: KoreanFillerWord;
  regex: RegExp;
}> = [
  { word: '자', regex: /^자{1,2}$/ },
  { word: '어', regex: /^(?:어{1,3}|어으)$/ },
  { word: '음', regex: /^(?:음{1,3}|으음)$/ },
  { word: '약간', regex: /^약간(?:만|씩|은|도)?$/ },
  { word: '조금', regex: /^조금(?:만|씩|씩만|은|도)?$/ },
  { word: '이제', regex: /^(?:이제(?:는|야|부터)?|이젠)$/ },
  { word: '한번', regex: /^한번(?:만|씩|더)?$/ },
  { word: '그냥', regex: /^그냥$/ },
  { word: '일단', regex: /^일단(?:은|만)?$/ },
];

const BREATH_CUE_REGEX = /마시|마셔|마셨|내쉬|내셔|내셨|흉곽|갈비뼈|호흡|숨/g;
const ALIGNMENT_CUE_REGEX = /골반|중립|어깨|견갑|척추|복부|코어|무릎|발목|정렬/g;
const ENCOURAGEMENT_CUE_REGEX = /좋아요|잘하셨|잘하고|부드럽게|천천히|아주|멋져요|편안하게/g;

const CALM_SPM_MIN = 140;
const CALM_SPM_MAX = 255;
const CALM_WPM_MAX = 105;
const SLOW_WPM_MAX = 48;

const PHONE_REGEX =
  /(?:\b01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}\b)|(?:\b0\d{1,2}[-.\s]\d{3,4}[-.\s]\d{4}\b)/g;
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const RRN_REGEX = /\b\d{6}[-.\s]?[1-4]\d{6}\b/g;
const MEMBER_NAME_HONORIFIC_REGEX =
  /(^|[^가-힣])(?!(?:선생|강사|원장|회원|고객|사용자|어머|아버|여러분|대표|실장)님)[김이박최정강조윤장임한오서신권황안송전홍유고문양손배백허남심노하곽성차주우구민진지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모탁국어은편용][가-힣]{1,3}\s*(?:회원님?|수강생님?|님)(?=$|[^가-힣])/g;
const LABELED_MEMBER_NAME_REGEX =
  /(?:회원|수강생|고객|성함|이름)\s*[:：]\s*[가-힣]{2,4}(?=$|[^가-힣])/g;

export const SAMPLE_TEACHING_SCRIPTS: readonly TeachingSampleScript[] = [
  {
    id: 'calm-reformer',
    labelKo: '입문 리포머 차분한 큐',
    shortTagKo: '안정 템포',
    descriptionKo: '풋워크 도입부에서 차분한 속도와 명확한 정렬 안내를 전하는 기본 리허설',
    sequenceTitle: '입문 리포머 풋워크 · 하체 정렬',
    durationSec: 60,
    pauseCount: 5,
    transcript:
      '양발 앞꿈치를 풋바에 나란히 올리고 골반 중립을 편안하게 느껴볼게요. 어깨는 귀에서 멀어지게 내려두고 갈비뼈를 부드럽게 감싸주세요. 코로 깊게 마시고, 내쉬는 숨에 캐리지를 천천히 밀어냅니다. 무릎과 발목이 일직선으로 이어지도록 정렬을 지켜주세요. 다시 마시면서 부드럽게 돌아오고, 복부 코어 힘을 일정하게 유지합니다. 좋아요, 이제 한 번 더 호흡에 맞춰 길게 뻗어볼게요.',
  },
  {
    id: 'fast-filler-rehearsal',
    labelKo: '빠른 템포 · 습관어 많은 리허설',
    shortTagKo: '개선 연습',
    descriptionKo: '긴장해서 말이 빨라지고 자·어·음·약간 같은 습관어가 잦아진 리허설 예시',
    sequenceTitle: '파워 리포머 코어 플로우 리허설',
    durationSec: 45,
    pauseCount: 1,
    transcript:
      '자, 어, 일단 빠르게 다음 동작으로 바로 넘어가 볼게요. 이제 약간 캐리지를 밀면서 음, 그냥 다리를 조금 더 빨리 뻗어주세요. 자, 어, 여기서 한번 더 복부 쪽에 힘을 주고 약간만 더 버텨볼게요. 일단 어깨가 올라가지 않게 조금 내리고 이제 그냥 리듬대로 연속해서 여덟 번 바로 갈게요. 음, 자, 한 번 더 당겼다가 어, 약간 빠르게 돌아오고 일단 멈추지 말고 바로 다음 세트로 이어서 진행할게요. 이제 조금만 더 속도를 올려서 그대로 끝까지 가볼게요. 자, 어, 팔도 빠르게 뻗으면서 약간 상체를 들어 올리고 그냥 바로 반대쪽 다리까지 쉬지 않고 마무리해 볼게요.',
  },
  {
    id: 'balanced-exemplar',
    labelKo: '호흡·격려 균형 모범 수업',
    shortTagKo: '균형 모범',
    descriptionKo: '습관어 없이 호흡·정렬·격려가 고르게 어우러진 모범 티칭 리허설',
    sequenceTitle: '리포머 척추 분절 · 흉곽 호흡',
    durationSec: 60,
    pauseCount: 6,
    transcript:
      '천장을 바라보고 누워 골반 중립과 척추의 자연스러운 길이를 느껴봅니다. 양쪽 견갑이 매트에 넓게 안정되도록 어깨 긴장을 풀어주세요. 코로 천천히 숨을 마시며 옆구리 흉곽과 갈비뼈가 부드럽게 열리는 감각에 집중해요. 길게 내쉬는 호흡에 맞춰 복부 코어를 안쪽으로 감싸며 척추를 하나씩 말아 올려볼게요. 아주 좋아요, 무릎 정렬을 지키며 편안하게 숨을 마시고 내쉬며 위등부터 천천히 내려옵니다. 멋져요, 마지막 호흡까지 부드럽게 잘하셨어요.',
  },
];

function stripEdgePunctuation(token: string): string {
  return token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

function tokenizeSpeech(transcript: string): string[] {
  return transcript
    .trim()
    .split(/\s+/)
    .map(stripEdgePunctuation)
    .filter((token) => token.length > 0);
}

function countSpeechSyllables(text: string): number {
  const hangulCount = (text.match(/[\uAC00-\uD7A3]/g) ?? []).length;
  const digitCount = (text.match(/\d/g) ?? []).length;
  const latinMatches = text.match(/[A-Za-z]+/g) ?? [];
  const latinSyllables = latinMatches.reduce((sum, word) => {
    const vowelGroups = word.match(/[aeiouyAEIOUY]+/g);
    return sum + Math.max(1, vowelGroups ? vowelGroups.length : 1);
  }, 0);
  return hangulCount + digitCount + latinSyllables;
}

function countFillerWords(tokens: readonly string[]): FillerWordCount[] {
  const counts = new Map<KoreanFillerWord, number>();
  for (const word of KOREAN_FILLER_WORDS) {
    counts.set(word, 0);
  }

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const nextToken = tokens[index + 1];

    // 한국어 음성 인식에서 "한 번"처럼 띄어 쓰인 습관어도 "한번"으로 집계한다.
    if (token === '한' && nextToken !== undefined && /^번(?:만|씩|더)?$/.test(nextToken)) {
      counts.set('한번', (counts.get('한번') ?? 0) + 1);
      index += 1;
      continue;
    }

    for (const pattern of SINGLE_TOKEN_FILLER_PATTERNS) {
      if (pattern.regex.test(token)) {
        counts.set(pattern.word, (counts.get(pattern.word) ?? 0) + 1);
        break;
      }
    }
  }

  return KOREAN_FILLER_WORDS.map((word) => ({
    word,
    count: counts.get(word) ?? 0,
  }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);
}

function countRegexMatches(text: string, regex: RegExp): number {
  const cloned = new RegExp(regex.source, 'g');
  return (text.match(cloned) ?? []).length;
}

function computeCueBalance(transcript: string): CueBalanceSummary {
  const breathCount = countRegexMatches(transcript, BREATH_CUE_REGEX);
  const alignmentCount = countRegexMatches(transcript, ALIGNMENT_CUE_REGEX);
  const encouragementCount = countRegexMatches(transcript, ENCOURAGEMENT_CUE_REGEX);
  const total = breathCount + alignmentCount + encouragementCount;

  if (total === 0) {
    return {
      breathCount: 0,
      alignmentCount: 0,
      encouragementCount: 0,
      breathRatio: 0,
      alignmentRatio: 0,
      encouragementRatio: 0,
    };
  }

  const rawCounts = [breathCount, alignmentCount, encouragementCount];
  const ratios = rawCounts.map((count) => (count === 0 ? 0 : Number((count / total).toFixed(3))));
  const sum = ratios[0] + ratios[1] + ratios[2];
  const remainder = Number((1 - sum).toFixed(3));
  if (remainder !== 0) {
    let maxIdx = 0;
    for (let i = 1; i < rawCounts.length; i += 1) {
      if (rawCounts[i] > rawCounts[maxIdx]) maxIdx = i;
    }
    ratios[maxIdx] = Math.max(0, Number((ratios[maxIdx] + remainder).toFixed(3)));
  }

  return {
    breathCount,
    alignmentCount,
    encouragementCount,
    breathRatio: ratios[0],
    alignmentRatio: ratios[1],
    encouragementRatio: ratios[2],
  };
}

function resolvePace(
  wordsPerMinute: number,
  syllablesPerMinute: number,
): { paceRating: TeachingPaceRating; paceLabelKo: string } {
  if (syllablesPerMinute > CALM_SPM_MAX || wordsPerMinute > CALM_WPM_MAX) {
    return {
      paceRating: 'fast',
      paceLabelKo: '빠른 템포 · 호흡 여백 필요',
    };
  }
  if (syllablesPerMinute < CALM_SPM_MIN && wordsPerMinute < SLOW_WPM_MAX) {
    return {
      paceRating: 'slow',
      paceLabelKo: '여유롭지만 다소 느린 템포',
    };
  }
  return {
    paceRating: 'calm',
    paceLabelKo: '차분한 안정 템포',
  };
}

function computeOverallScore(params: {
  paceRating: TeachingPaceRating;
  syllablesPerMinute: number;
  fillerRatePerMin: number;
  cueBalance: CueBalanceSummary;
  durationMinutes: number;
  pauseCount?: number;
}): number {
  const {
    paceRating,
    syllablesPerMinute,
    fillerRatePerMin,
    cueBalance,
    durationMinutes,
    pauseCount,
  } = params;

  // 1. 발화 템포 점수 (최대 35점)
  let paceScore: number;
  if (paceRating === 'calm') {
    if (syllablesPerMinute >= 165 && syllablesPerMinute <= 225) {
      paceScore = 35;
    } else if (syllablesPerMinute < 165) {
      paceScore = Math.round(31 + ((syllablesPerMinute - CALM_SPM_MIN) / 25) * 4);
    } else {
      paceScore = Math.round(31 + ((CALM_SPM_MAX - syllablesPerMinute) / 30) * 4);
    }
  } else if (paceRating === 'fast') {
    const excess = Math.max(0, syllablesPerMinute - CALM_SPM_MAX);
    paceScore = Math.max(10, Math.round(27 - excess * 0.16));
  } else {
    const deficit = Math.max(0, CALM_SPM_MIN - syllablesPerMinute);
    paceScore = Math.max(14, Math.round(28 - deficit * 0.14));
  }

  // 2. 습관어 절제 점수 (최대 30점)
  let fillerScore: number;
  if (fillerRatePerMin <= 1.5) {
    fillerScore = 30;
  } else if (fillerRatePerMin <= 3.0) {
    fillerScore = Math.round(29 - (fillerRatePerMin - 1.5) * 2.5);
  } else if (fillerRatePerMin <= 6.0) {
    fillerScore = Math.round(25 - (fillerRatePerMin - 3.0) * 3.0);
  } else {
    fillerScore = Math.max(6, Math.round(16 - (fillerRatePerMin - 6.0) * 0.65));
  }

  // 3. 호흡·정렬·격려 큐 균형 점수 (최대 35점)
  const totalCues =
    cueBalance.breathCount + cueBalance.alignmentCount + cueBalance.encouragementCount;
  let cueScore = 6;
  if (totalCues > 0) {
    const cuesPerMin = totalCues / durationMinutes;
    const densityScore = Math.min(15, Math.round((cuesPerMin / 7) * 15));
    const presenceScore =
      (cueBalance.breathCount > 0 ? 4 : 0) +
      (cueBalance.alignmentCount > 0 ? 4 : 0) +
      (cueBalance.encouragementCount > 0 ? 4 : 0);
    const deviation =
      Math.abs(cueBalance.breathRatio - 0.35) +
      Math.abs(cueBalance.alignmentRatio - 0.4) +
      Math.abs(cueBalance.encouragementRatio - 0.25);
    const harmonyScore = Math.round(8 * (1 - Math.min(1, deviation / 0.85)));
    cueScore = Math.min(35, densityScore + presenceScore + harmonyScore);
  }

  const pauseBonus =
    typeof pauseCount === 'number' && Number.isFinite(pauseCount) && pauseCount >= 3 ? 2 : 0;

  return Math.max(0, Math.min(100, Math.round(paceScore + fillerScore + cueScore + pauseBonus)));
}

function buildStrengthsKo(params: {
  paceRating: TeachingPaceRating;
  syllablesPerMinute: number;
  totalFillers: number;
  fillerRatePerMin: number;
  cueBalance: CueBalanceSummary;
  wordCount: number;
  pauseCount?: number;
}): string[] {
  const {
    paceRating,
    syllablesPerMinute,
    totalFillers,
    fillerRatePerMin,
    cueBalance,
    wordCount,
    pauseCount,
  } = params;

  const candidates: string[] = [];

  if (paceRating === 'calm') {
    candidates.push(
      `분당 ${syllablesPerMinute}음절의 차분한 템포로 회원들이 움직임을 따라갈 호흡 여백을 잘 지켜주셨어요.`,
    );
  }
  if (totalFillers === 0) {
    candidates.push(
      '습관어 없이 문장이 또렷하게 이어져 초보 회원도 핵심 동작 신호를 한 번에 듣기 좋아요.',
    );
  } else if (fillerRatePerMin <= 2.2) {
    candidates.push(
      `습관어 빈도가 분당 ${fillerRatePerMin}회로 낮아 티칭 문장이 깔끔하고 집중도 높게 전달돼요.`,
    );
  }
  if (cueBalance.breathCount >= 2 && cueBalance.breathRatio >= 0.2) {
    candidates.push(
      `마시고 내쉬는 호흡 안내(${cueBalance.breathCount}회)가 동작 흐름 속에 자연스럽게 자리 잡고 있어요.`,
    );
  }
  if (cueBalance.alignmentCount >= 2 && cueBalance.alignmentRatio >= 0.25) {
    candidates.push(
      `골반·어깨·척추 등 신체 정렬 포인트(${cueBalance.alignmentCount}회)를 구체적인 감각 언어로 잘 짚어주셨어요.`,
    );
  }
  if (cueBalance.encouragementCount >= 2 && cueBalance.encouragementRatio >= 0.15) {
    candidates.push(
      `따뜻한 격려 표현(${cueBalance.encouragementCount}회)이 수업 분위기를 편안하게 풀어주고 있어요.`,
    );
  }
  if (typeof pauseCount === 'number' && pauseCount >= 3) {
    candidates.push(
      `문장 사이 짧은 멈춤(${pauseCount}회)을 두어 회원들이 몸의 감각을 확인할 여유를 주셨어요.`,
    );
  }

  // 속도나 습관어 개선이 필요한 리허설에서도 실제 존재하는 긍정 요소를 정직하게 2개 선별한다.
  if (candidates.length < 2 && cueBalance.alignmentCount >= 1) {
    candidates.push(
      `빠른 흐름 속에서도 신체 기준점(${cueBalance.alignmentCount}회)을 놓치지 않고 짚어주신 점이 좋아요.`,
    );
  }
  if (candidates.length < 2 && wordCount >= 25) {
    candidates.push(
      '수업 흐름이 끊기지 않도록 활기차게 다음 동작을 이어가는 에너지가 분명하게 느껴져요.',
    );
  }
  if (candidates.length < 2 && cueBalance.breathCount >= 1) {
    candidates.push(
      `호흡 신호(${cueBalance.breathCount}회)를 챙겨 주려는 시도가 보여 동작 리듬의 출발점이 잘 잡혀 있어요.`,
    );
  }
  if (candidates.length < 2) {
    candidates.push(
      '수업 전에 소리 내어 리허설을 점검하는 습관 자체가 현장 전달력을 가장 빠르게 다듬어 줘요.',
    );
  }
  if (candidates.length < 2) {
    candidates.push(
      '짧은 구간부터 직접 발화 패턴을 확인하셨으니, 다음 리허설에서 한 가지 목표만 잡아도 변화가 바로 보여요.',
    );
  }

  return candidates.slice(0, 2);
}

function buildCoachingTipsKo(params: {
  paceRating: TeachingPaceRating;
  syllablesPerMinute: number;
  fillerCounts: readonly FillerWordCount[];
  totalFillers: number;
  fillerRatePerMin: number;
  cueBalance: CueBalanceSummary;
}): string[] {
  const {
    paceRating,
    syllablesPerMinute,
    fillerCounts,
    totalFillers,
    fillerRatePerMin,
    cueBalance,
  } = params;

  const tips: string[] = [];

  if (paceRating === 'fast') {
    tips.push(
      `말 속도가 분당 ${syllablesPerMinute}음절로 다소 빨라요. 동작 전환 직전에 숨을 한 박자 고르고 다음 큐를 건네면 회원들이 훨씬 편안하게 따라올 수 있어요.`,
    );
  } else if (paceRating === 'slow') {
    tips.push(
      `발화 간격이 분당 ${syllablesPerMinute}음절로 여유로운 편이에요. 동작 시작과 마무리 시점에 짧은 호흡 신호를 얹어 주면 수업 리듬이 더 또렷해져요.`,
    );
  }

  const topFiller = fillerCounts[0];
  if (topFiller && (totalFillers >= 3 || fillerRatePerMin >= 2.5)) {
    tips.push(
      `가장 자주 나온 습관어는 '${topFiller.word}'(${topFiller.count}회)예요. 문장을 열 때 '${topFiller.word}' 대신 0.5초 멈춘 뒤 '코로 마시고'처럼 호흡으로 시작해 보세요.`,
    );
  }

  if (cueBalance.breathCount === 0 || cueBalance.breathRatio < 0.2) {
    tips.push(
      `호흡 큐 비중이 ${Math.round(cueBalance.breathRatio * 100)}%로 조금 낮아요. 힘을 쓰는 순간에 '입으로 길게 내쉬며'를 한 마디만 보태면 집중도가 확 살아나요.`,
    );
  }

  if (
    tips.length < 3 &&
    (cueBalance.encouragementCount === 0 || cueBalance.encouragementRatio < 0.15)
  ) {
    tips.push(
      `격려 큐 비중이 ${Math.round(cueBalance.encouragementRatio * 100)}%예요. 세트 마무리마다 '아주 부드럽게 잘 이어가고 있어요' 한 문장을 얹으면 회원 긴장이 편안하게 풀려요.`,
    );
  }

  if (tips.length < 3 && (cueBalance.alignmentCount === 0 || cueBalance.alignmentRatio < 0.2)) {
    tips.push(
      `정렬 기준 안내가 ${cueBalance.alignmentCount}회로 적어요. '어깨는 귀에서 멀리, 골반은 중립으로'처럼 첫 기준점 하나를 먼저 짚어 주면 이해가 빨라져요.`,
    );
  }

  if (tips.length === 0) {
    tips.push(
      '현재 템포와 큐 균형이 아주 안정적이에요. 다음 수업에서는 마지막 1~2회 반복 때 목소리 속도를 살짝 더 늦춰 마무리 여운을 남겨 보세요.',
    );
  }
  if (tips.length < 2) {
    tips.push(
      '시퀀스 전환 구간에서는 동작 이름보다 먼저 기구 위치와 호흡 준비를 짧게 안내하면 흐름이 매끄럽게 이어져요.',
    );
  }

  return tips.slice(0, 3);
}

/**
 * 한국어 필라테스 티칭 발화 텍스트를 온디바이스에서 분석한다.
 */
export function analyzeTeachingTranscript(sample: TeachingVoiceSample): TeachingHabitAnalysis {
  const normalizedTranscript = sample.transcript.trim();
  const tokens = tokenizeSpeech(normalizedTranscript);
  const wordCount = tokens.length;

  if (wordCount === 0) {
    return {
      wordsPerMinute: 0,
      syllablesPerMinute: 0,
      paceRating: 'slow',
      paceLabelKo: '발화 기록 대기',
      fillerCounts: [],
      totalFillers: 0,
      fillerRatePerMin: 0,
      cueBalance: {
        breathCount: 0,
        alignmentCount: 0,
        encouragementCount: 0,
        breathRatio: 0,
        alignmentRatio: 0,
        encouragementRatio: 0,
      },
      strengthsKo: [],
      coachingTipsKo: [
        '실시간 마이크 분석을 시작하거나 아래 샘플 버튼을 눌러 첫 티칭 습관 리포트를 확인해 보세요.',
      ],
      overallScore: 0,
    };
  }

  const effectiveDurationSec =
    Number.isFinite(sample.durationSec) && sample.durationSec > 0 ? sample.durationSec : 60;
  const durationMinutes = Math.max(effectiveDurationSec, 1) / 60;

  const syllableCount = countSpeechSyllables(normalizedTranscript);
  const wordsPerMinute = Math.round(wordCount / durationMinutes);
  const syllablesPerMinute = Math.round(syllableCount / durationMinutes);
  const { paceRating, paceLabelKo } = resolvePace(wordsPerMinute, syllablesPerMinute);

  const fillerCounts = countFillerWords(tokens);
  const totalFillers = fillerCounts.reduce((sum, item) => sum + item.count, 0);
  const fillerRatePerMin = Number((totalFillers / durationMinutes).toFixed(1));

  const cueBalance = computeCueBalance(normalizedTranscript);
  const overallScore = computeOverallScore({
    paceRating,
    syllablesPerMinute,
    fillerRatePerMin,
    cueBalance,
    durationMinutes,
    pauseCount: sample.pauseCount,
  });

  const strengthsKo = buildStrengthsKo({
    paceRating,
    syllablesPerMinute,
    totalFillers,
    fillerRatePerMin,
    cueBalance,
    wordCount,
    pauseCount: sample.pauseCount,
  });

  const coachingTipsKo = buildCoachingTipsKo({
    paceRating,
    syllablesPerMinute,
    fillerCounts,
    totalFillers,
    fillerRatePerMin,
    cueBalance,
  });

  return {
    wordsPerMinute,
    syllablesPerMinute,
    paceRating,
    paceLabelKo,
    fillerCounts,
    totalFillers,
    fillerRatePerMin,
    cueBalance,
    strengthsKo,
    coachingTipsKo,
    overallScore,
  };
}

/**
 * 브라우저 Web Speech API (SpeechRecognition / webkitSpeechRecognition) 지원 여부를 확인한다.
 */
export function isBrowserSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const speechWindow = window as Window & {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  };
  return (
    typeof speechWindow.SpeechRecognition === 'function' ||
    typeof speechWindow.webkitSpeechRecognition === 'function'
  );
}

/**
 * 로컬 저장 전 회원 실명·연락처·이메일·주민등록번호를 비식별 처리한다.
 */
export function sanitizeTeachingCoachText(rawText: string): {
  sanitized: string;
  redacted: boolean;
} {
  let sanitized = rawText;
  let redacted = false;

  const applyReplace = (regex: RegExp, replacer: string | ((...args: string[]) => string)) => {
    const fresh = new RegExp(regex.source, regex.flags);
    const next =
      typeof replacer === 'string'
        ? sanitized.replace(fresh, replacer)
        : sanitized.replace(fresh, replacer);
    if (next !== sanitized) {
      redacted = true;
      sanitized = next;
    }
  };

  applyReplace(PHONE_REGEX, '[연락처 제외]');
  applyReplace(EMAIL_REGEX, '[이메일 제외]');
  applyReplace(RRN_REGEX, '[식별번호 제외]');
  applyReplace(LABELED_MEMBER_NAME_REGEX, '회원 [비식별]');
  applyReplace(MEMBER_NAME_HONORIFIC_REGEX, (_match, prefix) => `${prefix}회원님`);

  return {
    sanitized: sanitized.replace(/\s+/g, ' ').trim(),
    redacted,
  };
}

function getDefaultStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isValidHistoryEntry(value: unknown): value is TeachingCoachHistoryEntry {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  const balance = item.cueBalance as Record<string, unknown> | undefined;
  return (
    typeof item.id === 'string' &&
    typeof item.savedAt === 'string' &&
    typeof item.sequenceTitle === 'string' &&
    typeof item.durationSec === 'number' &&
    typeof item.overallScore === 'number' &&
    typeof item.wordsPerMinute === 'number' &&
    typeof item.syllablesPerMinute === 'number' &&
    typeof item.paceLabelKo === 'string' &&
    typeof item.totalFillers === 'number' &&
    typeof item.fillerRatePerMin === 'number' &&
    typeof item.transcriptExcerptKo === 'string' &&
    (item.paceRating === 'calm' || item.paceRating === 'fast' || item.paceRating === 'slow') &&
    Boolean(balance) &&
    typeof balance?.breathCount === 'number' &&
    typeof balance?.alignmentCount === 'number' &&
    typeof balance?.encouragementCount === 'number' &&
    typeof balance?.breathRatio === 'number' &&
    typeof balance?.alignmentRatio === 'number' &&
    typeof balance?.encouragementRatio === 'number'
  );
}

/**
 * 기기 로컬스토리지에 저장된 최근 티칭 코치 리포트(최대 10건)를 읽는다.
 * 마운트 시 읽기만 수행하며 localStorage.setItem을 절대 호출하지 않는다.
 */
export function loadTeachingCoachHistory(
  storage?: Pick<Storage, 'getItem'> | null,
): TeachingCoachHistoryEntry[] {
  const targetStorage = storage === undefined ? getDefaultStorage() : storage;
  if (!targetStorage) return [];

  try {
    const raw = targetStorage.getItem(TEACHING_COACH_HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidHistoryEntry).slice(0, MAX_TEACHING_COACH_HISTORY_ENTRIES);
  } catch {
    return [];
  }
}

/**
 * 사용자가 명시적으로 저장을 요청한 티칭 리포트를 최근 10건 한도로 로컬스토리지에 저장한다.
 * 회원 실명·연락처는 저장 전 자동 제거된다.
 */
export function saveTeachingCoachEntry(
  input: SaveTeachingCoachEntryInput,
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null,
): SaveTeachingCoachResult {
  const targetStorage = storage === undefined ? getDefaultStorage() : storage;
  const existing = loadTeachingCoachHistory(targetStorage);

  const titleClean = sanitizeTeachingCoachText(
    input.sample.sequenceTitle?.trim() || '티칭 리허설 세션',
  );
  const exerciseClean = input.exerciseContextKo?.trim()
    ? sanitizeTeachingCoachText(input.exerciseContextKo.trim())
    : { sanitized: '', redacted: false };
  const excerptSource = input.sample.transcript.trim().slice(0, 120);
  const excerptClean = sanitizeTeachingCoachText(excerptSource);

  const redactedPersonalInfo =
    titleClean.redacted || exerciseClean.redacted || excerptClean.redacted;

  const savedAt = input.savedAt ?? input.sample.recordedAt ?? new Date().toISOString();
  const excerptShort =
    excerptClean.sanitized.length > 72
      ? `${excerptClean.sanitized.slice(0, 72)}…`
      : excerptClean.sanitized;

  const entry: TeachingCoachHistoryEntry = {
    id: `tvc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    savedAt,
    sequenceTitle: titleClean.sanitized || '티칭 리허설 세션',
    ...(exerciseClean.sanitized ? { exerciseContextKo: exerciseClean.sanitized } : {}),
    durationSec: Math.max(1, Math.round(input.sample.durationSec || 60)),
    sourceMode: input.sourceMode ?? 'text-rehearsal',
    overallScore: input.analysis.overallScore,
    wordsPerMinute: input.analysis.wordsPerMinute,
    syllablesPerMinute: input.analysis.syllablesPerMinute,
    paceRating: input.analysis.paceRating,
    paceLabelKo: input.analysis.paceLabelKo,
    totalFillers: input.analysis.totalFillers,
    fillerRatePerMin: input.analysis.fillerRatePerMin,
    ...(input.analysis.fillerCounts[0]
      ? { topFillerWord: input.analysis.fillerCounts[0].word }
      : {}),
    cueBalance: { ...input.analysis.cueBalance },
    transcriptExcerptKo: excerptShort,
  };

  if (!targetStorage) {
    return {
      ok: false,
      entry: null,
      entries: existing,
      errorKo: '이 브라우저 환경에서는 기기 저장소를 사용할 수 없어 리포트를 저장하지 못했습니다.',
      redactedPersonalInfo,
    };
  }

  const nextEntries = [entry, ...existing].slice(0, MAX_TEACHING_COACH_HISTORY_ENTRIES);

  try {
    targetStorage.setItem(TEACHING_COACH_HISTORY_KEY, JSON.stringify(nextEntries));
    return {
      ok: true,
      entry,
      entries: nextEntries,
      errorKo: null,
      redactedPersonalInfo,
    };
  } catch {
    return {
      ok: false,
      entry: null,
      entries: existing,
      errorKo: '브라우저 저장 공간이 부족하거나 차단되어 이 기기에 리포트를 저장하지 못했습니다.',
      redactedPersonalInfo,
    };
  }
}

/**
 * 현재 분석 결과와 직전 저장 리포트를 비교해 변화 요약을 만든다.
 */
export function compareWithPreviousCoachEntry(
  current: TeachingHabitAnalysis,
  previous: TeachingCoachHistoryEntry | null | undefined,
): TeachingHistoryComparison | null {
  if (!previous || current.wordsPerMinute === 0) return null;

  const scoreDelta = current.overallScore - previous.overallScore;
  const fillerRateDelta = Number((current.fillerRatePerMin - previous.fillerRatePerMin).toFixed(1));
  const syllablesDelta = current.syllablesPerMinute - previous.syllablesPerMinute;

  let summaryKo = '직전 저장 리포트와 비슷한 템포와 균형을 유지하고 있어요.';
  if (scoreDelta >= 6) {
    summaryKo = `직전 리포트보다 참고 점수가 ${scoreDelta}점 높아졌어요. 호흡과 문장 흐름이 한결 정돈됐습니다.`;
  } else if (fillerRateDelta <= -1.5) {
    summaryKo = `분당 습관어가 ${Math.abs(fillerRateDelta)}회 줄어 전달력이 훨씬 또렷해졌어요.`;
  } else if (scoreDelta <= -6) {
    summaryKo = `직전 리포트보다 참고 점수가 ${Math.abs(scoreDelta)}점 낮아졌어요. 말 속도와 호흡 여백을 가볍게 점검해 보세요.`;
  }

  return {
    scoreDelta,
    fillerRateDelta,
    syllablesDelta,
    summaryKo,
  };
}
