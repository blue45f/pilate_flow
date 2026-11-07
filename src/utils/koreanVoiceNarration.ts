import {
  EQUIPMENT_OPTIONS,
  getExerciseEquipment,
} from '../data/equipmentCatalog';
import {
  APPARATUS_LABELS,
  CANONICAL_BLOCKS,
  POSITION_LABELS,
  PROP_LABELS,
} from '../data/pilatesCatalog';
import {
  KOREAN_VOICE_SPEED_OPTIONS,
  type KoreanVoiceAvailabilityStatus,
  type KoreanVoiceController,
  type KoreanVoiceControllerState,
  type KoreanVoiceNarrationSection,
  type KoreanVoicePlaybackSpeed,
  type KoreanVoiceScript,
  type KoreanVoiceSegment,
  type MobileTtsCapabilityReport,
  type MobileTtsPlatformCategory,
} from '../types/movementMediaGuidance';
import type {
  BoxState,
  FootbarState,
  HeadrestState,
  PilatesExercise,
} from '../types/pilates';

export const KOREAN_VOICE_SECTION_LABELS: Readonly<
  Record<KoreanVoiceNarrationSection | 'all', string>
> = {
  all: '전체 설명',
  overview: '동작 개요',
  setup: '기구·자세 준비',
  breath: '호흡 패턴',
  cues: '티칭 큐',
  layers: '난이도 변형',
  precautions: '주의사항',
};

export const KOREAN_VOICE_DISCLAIMER_KO =
  '무료 브라우저·기기 내장 TTS(Web Speech API)와 수업 계획 메모로 생성된 한국어 안내입니다. 유료 외부 음성 API를 사용하지 않으며, 전문가 시범·의학적 처방을 대체하지 않습니다.';

const BOX_STATE_LABELS_KO: Readonly<Record<BoxState, string>> = {
  none: '박스 없음',
  'long-box': '롱 박스 세팅',
  'short-box': '숏 박스 세팅',
};

const FOOTBAR_STATE_LABELS_KO: Readonly<Record<FootbarState, string>> = {
  high: '풋바 높음(High)',
  mid: '풋바 중간(Mid)',
  low: '풋바 낮음(Low)',
  down: '풋바 내림(Down)',
  none: '풋바 미사용',
};

const HEADREST_STATE_LABELS_KO: Readonly<Record<HeadrestState, string>> = {
  up: '헤드레스트 올림(Up)',
  flat: '헤드레스트 평평하게(Flat)',
  down: '헤드레스트 내림(Down)',
};

const CUE_ORDINAL_LABELS_KO = [
  '첫째',
  '둘째',
  '셋째',
  '넷째',
  '다섯째',
  '여섯째',
  '일곱째',
  '여덟째',
] as const;

function ensureSentencePeriod(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return '';
  }
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function resolveEquipmentLabelsKo(exercise: PilatesExercise): string[] {
  const equipmentInfo = getExerciseEquipment(exercise);
  const labels = equipmentInfo.requiredEquipment.map((id) => {
    const matched = EQUIPMENT_OPTIONS.find((item) => item.id === id);
    if (matched) {
      return matched.labelKo;
    }
    return APPARATUS_LABELS[exercise.apparatus]?.ko ?? id;
  });

  if (labels.length === 0) {
    return [APPARATUS_LABELS[exercise.apparatus]?.ko ?? '필라테스 기구'];
  }
  return [...new Set(labels)];
}

function resolvePropLabelsKo(exercise: PilatesExercise): string[] {
  const equipmentInfo = getExerciseEquipment(exercise);
  if (equipmentInfo.requiredProps.length === 0) {
    return ['소도구 없음'];
  }
  return equipmentInfo.requiredProps.map(
    (prop) => PROP_LABELS[prop]?.ko ?? prop,
  );
}

/**
 * Builds a structured 6-segment Korean narration script from exercise planning metadata.
 */
export function buildKoreanVoiceScript(
  exercise: PilatesExercise,
): KoreanVoiceScript {
  const blockMeta = CANONICAL_BLOCKS.find(
    (block) => block.category === exercise.blockCategory,
  );
  const blockNameKo = blockMeta?.nameKo ?? '필라테스 시퀀스 블록';
  const sideDescriptionKo = exercise.isUnilateral
    ? '좌우 편측 교대(좌우 진행) 동작'
    : '양측 통합 진행 동작';
  const targetMusclesKo =
    exercise.targetMuscles.length > 0
      ? exercise.targetMuscles.join(', ')
      : '전신 코어 및 정렬 안정화 근육';
  const englishTitlePart = exercise.nameEn?.trim()
    ? ` (${exercise.nameEn.trim()})`
    : '';

  const overviewTextKo = [
    `${exercise.nameKo}${englishTitlePart}.`,
    `${blockNameKo} 단계의 ${sideDescriptionKo}으로, 기본 계획 시간은 계획 ${exercise.defaultDurationMin}분입니다.`,
    `주요 타깃 부위: ${targetMusclesKo}.`,
  ].join(' ');

  const equipmentLabels = resolveEquipmentLabelsKo(exercise).join(', ');
  const propLabels = resolvePropLabelsKo(exercise).join(', ');
  const bodyPositionKo =
    POSITION_LABELS[exercise.bodyPosition]?.ko ?? exercise.bodyPosition;
  const springLabel = exercise.springs?.trim()
    ? exercise.springs.trim() === 'Bodyweight'
      ? '무스프링 체중 저항'
      : `스프링 ${exercise.springs.trim()}`
    : '기본 저항';

  const setupDetails: string[] = [
    `준비 기구는 ${equipmentLabels}, 소도구는 ${propLabels}입니다.`,
    `시작 자세는 ${bodyPositionKo}이며, 저항 세팅은 ${springLabel}입니다.`,
  ];

  if (exercise.apparatus !== 'mat' || exercise.box !== 'none') {
    const apparatusSetupParts: string[] = [BOX_STATE_LABELS_KO[exercise.box]];
    if (exercise.footbar !== 'none' || exercise.apparatus === 'reformer') {
      apparatusSetupParts.push(FOOTBAR_STATE_LABELS_KO[exercise.footbar]);
    }
    if (exercise.apparatus === 'reformer') {
      apparatusSetupParts.push(HEADREST_STATE_LABELS_KO[exercise.headrest]);
    }
    setupDetails.push(`기구 세부 세팅: ${apparatusSetupParts.join(', ')}.`);
  }

  const setupTextKo = setupDetails.join(' ');

  const rawBreath = exercise.breathPattern?.trim();
  const breathTextKo = rawBreath
    ? `호흡 패턴 안내입니다. ${ensureSentencePeriod(rawBreath.replace(/→/g, '이어서'))}`
    : '편안한 호흡 리듬을 먼저 관찰하고 동작 전후로 호흡을 유지합니다.';

  const cleanedCues = (exercise.cues ?? [])
    .map((cue) => cue.trim())
    .filter((cue) => cue.length > 0);
  const cuesTextKo =
    cleanedCues.length > 0
      ? cleanedCues
          .map((cue, idx) => {
            const ordinal = CUE_ORDINAL_LABELS_KO[idx] ?? `${idx + 1}단계`;
            return `${ordinal}, ${ensureSentencePeriod(cue)}`;
          })
          .join(' ')
      : '첫째, 중립 척추와 골반 정렬을 먼저 확인합니다. 둘째, 호흡과 함께 통제된 가동 범위 안에서 움직입니다.';

  const easyLayer = ensureSentencePeriod(
    exercise.layers?.easy || '가동 범위를 줄여 안정적인 정렬 유지를 우선합니다',
  );
  const standardLayer = ensureSentencePeriod(
    exercise.layers?.standard || '계획된 기본 저항과 가동 범위로 일정한 템포를 유지합니다',
  );
  const hardLayer = ensureSentencePeriod(
    exercise.layers?.hard || '코어 제어와 협응 과제를 더해 난이도를 확장합니다',
  );
  const layersTextKo = `쉬운 변형: ${easyLayer} 기본 과정: ${standardLayer} 심화 확장: ${hardLayer}`;

  const rawPrecautions = exercise.precautions?.trim();
  const precautionsBody = rawPrecautions
    ? ensureSentencePeriod(rawPrecautions)
    : '강사가 개인별 가동 범위와 기구 안전을 직접 확인합니다.';
  const precautionsTextKo = `주의사항: ${precautionsBody} 이 음성 안내는 수업 계획 메모 기반 참고 자료이며, 현장에서 강사가 회원 상태를 직접 확인해야 합니다.`;

  const segments: readonly KoreanVoiceSegment[] = [
    {
      id: `${exercise.id}-seg-0-overview`,
      index: 0,
      section: 'overview',
      labelKo: KOREAN_VOICE_SECTION_LABELS.overview,
      textKo: overviewTextKo,
    },
    {
      id: `${exercise.id}-seg-1-setup`,
      index: 1,
      section: 'setup',
      labelKo: KOREAN_VOICE_SECTION_LABELS.setup,
      textKo: setupTextKo,
    },
    {
      id: `${exercise.id}-seg-2-breath`,
      index: 2,
      section: 'breath',
      labelKo: KOREAN_VOICE_SECTION_LABELS.breath,
      textKo: breathTextKo,
    },
    {
      id: `${exercise.id}-seg-3-cues`,
      index: 3,
      section: 'cues',
      labelKo: KOREAN_VOICE_SECTION_LABELS.cues,
      textKo: cuesTextKo,
    },
    {
      id: `${exercise.id}-seg-4-layers`,
      index: 4,
      section: 'layers',
      labelKo: KOREAN_VOICE_SECTION_LABELS.layers,
      textKo: layersTextKo,
    },
    {
      id: `${exercise.id}-seg-5-precautions`,
      index: 5,
      section: 'precautions',
      labelKo: KOREAN_VOICE_SECTION_LABELS.precautions,
      textKo: precautionsTextKo,
    },
  ];

  const fullTextKo = segments
    .map((segment) => `[${segment.labelKo}]\n${segment.textKo}`)
    .join('\n\n');

  const totalSpokenCharacters = segments.reduce(
    (sum, segment) => sum + segment.textKo.replace(/\s+/g, '').length,
    0,
  );
  const estimatedDurationSec = Math.max(
    12,
    Math.round(totalSpokenCharacters / 4.5),
  );

  return {
    exerciseId: exercise.id,
    exerciseNameKo: exercise.nameKo,
    summaryTitleKo: `${exercise.nameKo} 한국어 음성 티칭 가이드`,
    fullTextKo,
    segments,
    estimatedDurationSec,
    disclaimerKo: KOREAN_VOICE_DISCLAIMER_KO,
  };
}

function normalizeVoiceLang(lang: string | undefined | null): string {
  return (lang ?? '').replace(/_/g, '-').trim().toLowerCase();
}

/** Select only an explicitly local Korean voice; never infer locale from its name.
 */
export function selectBestKoreanVoice(
  voices: readonly SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  if (!Array.isArray(voices)) return null;
  const localKorean = voices.filter(
    (voice) =>
      voice.localService === true && /^ko(?:-|$)/.test(normalizeVoiceLang(voice.lang)),
  );
  return (
    localKorean.find((voice) => normalizeVoiceLang(voice.lang) === 'ko-kr') ??
    localKorean[0] ??
    null
  );
}

export interface TtsEnvironmentInspectionOptions {
  speechSynthesis?: SpeechSynthesis | null;
  SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance | null;
  userAgent?: string;
}

function resolveSpeechSynthesis(
  env?: TtsEnvironmentInspectionOptions,
): SpeechSynthesis | null {
  if (env && 'speechSynthesis' in env) {
    return env.speechSynthesis ?? null;
  }
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      return window.speechSynthesis ?? null;
    }
    if (
      typeof globalThis !== 'undefined' &&
      'speechSynthesis' in globalThis
    ) {
      return (
        (globalThis as unknown as { speechSynthesis?: SpeechSynthesis })
          .speechSynthesis ?? null
      );
    }
  } catch {
    return null;
  }
  return null;
}

function resolveSpeechSynthesisUtterance(
  env?: TtsEnvironmentInspectionOptions,
): typeof SpeechSynthesisUtterance | null {
  if (env && 'SpeechSynthesisUtterance' in env) {
    return env.SpeechSynthesisUtterance ?? null;
  }
  try {
    if (
      typeof window !== 'undefined' &&
      'SpeechSynthesisUtterance' in window
    ) {
      return window.SpeechSynthesisUtterance ?? null;
    }
    if (
      typeof globalThis !== 'undefined' &&
      'SpeechSynthesisUtterance' in globalThis
    ) {
      return (
        (
          globalThis as unknown as {
            SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance;
          }
        ).SpeechSynthesisUtterance ?? null
      );
    }
  } catch {
    return null;
  }
  return null;
}

function resolveUserAgent(env?: TtsEnvironmentInspectionOptions): string {
  if (env && typeof env.userAgent === 'string') {
    return env.userAgent;
  }
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.userAgent === 'string') {
      return navigator.userAgent;
    }
  } catch {
    return '';
  }
  return '';
}

function classifyPlatform(
  userAgent: string,
  supported: boolean,
): {
  category: MobileTtsPlatformCategory;
  labelKo: string;
  isMobile: boolean;
} {
  if (!supported) {
    return {
      category: 'unsupported-env',
      labelKo: '브라우저 음성 합성 미지원 환경',
      isMobile: false,
    };
  }

  const isIosWebKit =
    /(iPhone|iPad|iPod)/i.test(userAgent) ||
    (/\bMacintosh\b/i.test(userAgent) && /\bMobile\b/i.test(userAgent));
  if (isIosWebKit) {
    return {
      category: 'ios-safari-webkit',
      labelKo: 'iOS/iPadOS 모바일 브라우저 (WebKit)',
      isMobile: true,
    };
  }

  if (/\bAndroid\b/i.test(userAgent)) {
    return {
      category: 'android-chromium',
      labelKo: 'Android 모바일 브라우저',
      isMobile: true,
    };
  }

  return {
    category: 'desktop-browser',
    labelKo: '데스크톱 브라우저 무료 내장 TTS',
    isMobile: false,
  };
}

/**
 * Safely inspects browser and mobile Web Speech API capabilities without throwing in SSR/JSDOM.
 */
export function inspectMobileAndBrowserTtsSupport(
  env?: TtsEnvironmentInspectionOptions,
): MobileTtsCapabilityReport {
  const synth = resolveSpeechSynthesis(env);
  const UtteranceCtor = resolveSpeechSynthesisUtterance(env);
  const userAgent = resolveUserAgent(env);

  const speechSynthesisSupported = Boolean(
    synth && typeof synth.speak === 'function' && typeof synth.cancel === 'function',
  );
  const utteranceSupported = typeof UtteranceCtor === 'function';
  const canAttemptSpeech = speechSynthesisSupported && utteranceSupported;

  const platform = classifyPlatform(userAgent, canAttemptSpeech);

  if (!canAttemptSpeech || !synth) {
    return {
      speechSynthesisSupported,
      utteranceSupported,
      canAttemptSpeech: false,
      platformCategory: 'unsupported-env',
      platformLabelKo: '브라우저 음성 합성 미지원 환경',
      koreanVoiceStatus: 'no-tts-engine',
      selectedVoiceName: null,
      selectedVoiceLang: 'ko-KR',
      isLocalFreeDeviceVoice: false,
      requiresUserGesture: false,
      pauseResumeStrategy: 'text-only-fallback',
      summaryLabelKo: '음성 합성 미지원 · 한국어 대본 텍스트 제공',
      detailNoteKo:
        '현재 브라우저·기기 환경에서 Web Speech API를 지원하지 않습니다. 유료 외부 API 호출 없이 아래 전체 한국어 대본 텍스트로 모든 안내를 확인할 수 있습니다.',
    };
  }

  let voices: readonly SpeechSynthesisVoice[];
  try {
    voices = synth.getVoices?.() ?? [];
  } catch {
    voices = [];
  }

  const bestKoreanVoice = selectBestKoreanVoice(voices);
  const pauseResumeStrategy = platform.isMobile
    ? 'native-with-segment-recovery'
    : 'native-with-segment-recovery';

  if (bestKoreanVoice) {
    const isLocal = Boolean(bestKoreanVoice.localService);
    const koreanVoiceStatus: KoreanVoiceAvailabilityStatus = isLocal
      ? 'korean-local-voice'
      : 'korean-network-voice';

    return {
      speechSynthesisSupported: true,
      utteranceSupported: true,
      canAttemptSpeech: true,
      platformCategory: platform.category,
      platformLabelKo: platform.labelKo,
      koreanVoiceStatus,
      selectedVoiceName: bestKoreanVoice.name || '한국어 음성',
      selectedVoiceLang: bestKoreanVoice.lang || 'ko-KR',
      isLocalFreeDeviceVoice: isLocal,
      requiresUserGesture: platform.isMobile,
      pauseResumeStrategy,
      summaryLabelKo: isLocal
        ? `무료 기기 내장 한국어 음성 (${bestKoreanVoice.name})`
        : `브라우저 한국어 음성 (${bestKoreanVoice.name})`,
      detailNoteKo: platform.isMobile
        ? '모바일 브라우저 정책에 따라 재생 버튼을 직접 터치할 때만 음성이 시작되며, 일시정지 후 이어듣기 시 구간 복구를 지원합니다.'
        : '기기·브라우저 내장 무료 Web Speech API 한국어 음성을 사용하여 추가 과금 없이 동작 설명을 읽어줍니다.',
    };
  }

  return {
    speechSynthesisSupported: true,
    utteranceSupported: true,
    canAttemptSpeech: false,
    platformCategory: platform.category,
    platformLabelKo: platform.labelKo,
    koreanVoiceStatus: 'no-local-korean-voice',
    selectedVoiceName: null,
    selectedVoiceLang: 'ko-KR',
    isLocalFreeDeviceVoice: false,
    requiresUserGesture: platform.isMobile,
    pauseResumeStrategy: 'text-only-fallback',
    summaryLabelKo: '기기 내장 한국어 음성 확인 필요 · 대본 제공',
    detailNoteKo:
      '사용 가능한 기기 내장 한국어 음성을 확인하지 못했습니다. 기기 설정에서 한국어 음성을 설치·활성화한 뒤 다시 확인해 주세요. 음성 목록이 늦게 로드되면 자동으로 다시 확인합니다. 그동안 아래 대본을 이용해 주세요. 원격 음성이나 확인되지 않은 기본 음성으로 재생하지 않습니다.',
  };
}

export interface ActiveMediaSessionCallbacks {
  stopVideo?: () => void;
  stopVoice?: (reason?: string) => void;
}

interface RegisteredMediaSessionEntry {
  readonly token: number;
  readonly exerciseId: string;
  readonly callbacks: ActiveMediaSessionCallbacks;
}

function createMovementMediaSessionCoordinator() {
  let nextToken = 1;
  let activeExerciseId: string | null = null;
  const sessions = new Map<number, RegisteredMediaSessionEntry>();

  function safeInvokeStop(
    entry: RegisteredMediaSessionEntry,
    reason?: string,
  ): void {
    try {
      entry.callbacks.stopVideo?.();
    } catch {
      // Ignore individual callback failures so all other media sessions still stop cleanly.
    }
    try {
      entry.callbacks.stopVoice?.(reason);
    } catch {
      // Ignore individual callback failures so all other media sessions still stop cleanly.
    }
  }

  return {
    registerActiveSession(
      exerciseId: string,
      callbacks: ActiveMediaSessionCallbacks,
    ): () => void {
      const token = nextToken++;
      sessions.set(token, {
        token,
        exerciseId,
        callbacks,
      });
      if (activeExerciseId === null) {
        activeExerciseId = exerciseId;
      }
      return () => {
        sessions.delete(token);
      };
    },

    notifyMovementActivated(exerciseId: string): void {
      for (const entry of sessions.values()) {
        if (entry.exerciseId !== exerciseId) {
          safeInvokeStop(entry, '다른 동작으로 이동하여 음성을 멈췄습니다.');
        }
      }
      activeExerciseId = exerciseId;
    },

    stopAllActiveMedia(reason?: string): void {
      for (const entry of sessions.values()) {
        safeInvokeStop(entry, reason);
      }
      activeExerciseId = null;
    },

    getActiveExerciseId(): string | null {
      return activeExerciseId;
    },

    resetForTests(): void {
      sessions.clear();
      activeExerciseId = null;
      nextToken = 1;
    },
  };
}

export const movementMediaSessionCoordinator =
  createMovementMediaSessionCoordinator();

function normalizeSpeed(
  speed: KoreanVoicePlaybackSpeed | number | undefined,
): KoreanVoicePlaybackSpeed {
  if (
    typeof speed === 'number' &&
    (KOREAN_VOICE_SPEED_OPTIONS as readonly number[]).includes(speed)
  ) {
    return speed as KoreanVoicePlaybackSpeed;
  }
  return 1;
}

export interface CreateKoreanVoiceControllerOptions {
  script: KoreanVoiceScript;
  initialSpeed?: KoreanVoicePlaybackSpeed;
  onStateChange?: (state: KoreanVoiceControllerState) => void;
  env?: TtsEnvironmentInspectionOptions;
}

/**
 * Creates a manual-only Korean TTS playback controller with mobile segment recovery
 * and cross-movement session coordination. Never auto-plays on creation.
 */
export function createKoreanVoiceController(
  options: CreateKoreanVoiceControllerOptions,
): KoreanVoiceController {
  const { script, onStateChange, env } = options;
  let capability = inspectMobileAndBrowserTtsSupport(env);
  let state: KoreanVoiceControllerState = {
    exerciseId: script.exerciseId,
    status: capability.canAttemptSpeech ? 'idle' : 'unsupported',
    speed: normalizeSpeed(options.initialSpeed),
    activeSegmentIndex: 0,
    activeSection: 'all',
    errorMessageKo: capability.canAttemptSpeech
      ? null
      : capability.detailNoteKo,
    announcementKo: capability.canAttemptSpeech
      ? '한국어 음성 안내 대기 중 (버튼을 눌러 재생)'
      : '음성 합성 미지원 환경 — 화면의 전체 한국어 대본을 확인하세요.',
    capability,
  };

  let playbackRunId = 0;
  let isInternalCancel = false;
  let ownsSpeech = false;
  let activeUtteranceSpeed: KoreanVoicePlaybackSpeed = state.speed;
  let currentQueueIndices: number[] = script.segments.map((_, index) => index);
  let destroyed = false;

  function emitState(patch: Partial<KoreanVoiceControllerState>): void {
    state = {
      ...state,
      ...patch,
    };
    onStateChange?.(state);
  }

  function cancelSpeechSafely(): void {
    if (!ownsSpeech) {
      return;
    }
    ownsSpeech = false;
    const synth = resolveSpeechSynthesis(env);
    if (!synth) {
      return;
    }
    isInternalCancel = true;
    try {
      synth.cancel();
    } catch {
      // Ignore browser-specific cancel errors
    } finally {
      isInternalCancel = false;
    }
  }

  function speakQueueFromPosition(queuePos: number, runId: number): boolean {
    if (destroyed || runId !== playbackRunId) {
      return false;
    }

    const synth = resolveSpeechSynthesis(env);
    const UtteranceCtor = resolveSpeechSynthesisUtterance(env);
    if (!synth || !UtteranceCtor || !capability.canAttemptSpeech) {
      emitState({
        status: 'unsupported',
        errorMessageKo:
          '현재 브라우저 환경에서 무료 내장 음성 합성을 사용할 수 없습니다. 아래 전체 한국어 텍스트 대본을 이용해 주세요.',
        announcementKo: '음성 합성 미지원 — 한국어 텍스트 대본으로 안내합니다.',
      });
      return false;
    }

    if (queuePos < 0 || queuePos >= currentQueueIndices.length) {
      emitState({
        status: 'completed',
        errorMessageKo: null,
        announcementKo: `${script.exerciseNameKo} 한국어 음성 안내 재생이 완료되었습니다.`,
      });
      return true;
    }

    const segmentIndex = currentQueueIndices[queuePos];
    const segment = script.segments[segmentIndex];
    if (!segment) {
      emitState({
        status: 'completed',
        errorMessageKo: null,
        announcementKo: `${script.exerciseNameKo} 한국어 음성 안내 재생이 완료되었습니다.`,
      });
      return true;
    }

    emitState({
      status: 'playing',
      activeSegmentIndex: segmentIndex,
      errorMessageKo: null,
      announcementKo: `${segment.labelKo} 구간 한국어 음성 안내 재생 중 (${state.speed}배속)`,
    });

    try {
      const utterance = new UtteranceCtor(segment.textKo);
      utterance.lang = capability.selectedVoiceLang || 'ko-KR';
      utterance.rate = state.speed;
      utterance.pitch = 1;

      // Check again for every segment: voices may change after capability inspection.
      let selectedVoice: SpeechSynthesisVoice | null = null;
      try {
        selectedVoice = selectBestKoreanVoice(synth.getVoices?.() ?? []);
      } catch {
        // An unreadable voice list cannot establish local-only playback.
      }
      if (!selectedVoice) {
        capability = inspectMobileAndBrowserTtsSupport(env);
        emitState({
          capability,
          status: 'unsupported',
          errorMessageKo: capability.detailNoteKo,
          announcementKo: '기기 내장 한국어 음성을 확인할 수 없어 대본만 제공합니다.',
        });
        return false;
      }
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
      activeUtteranceSpeed = state.speed;

      utterance.onend = () => {
        if (destroyed || runId !== playbackRunId || state.status !== 'playing') {
          return;
        }
        const nextQueuePos = queuePos + 1;
        if (nextQueuePos < currentQueueIndices.length) {
          speakQueueFromPosition(nextQueuePos, runId);
        } else {
          ownsSpeech = false;
          emitState({
            status: 'completed',
            errorMessageKo: null,
            announcementKo: `${script.exerciseNameKo} 한국어 음성 안내가 모두 완료되었습니다.`,
          });
        }
      };

      utterance.onerror = (event: SpeechSynthesisErrorEvent | { error?: string }) => {
        if (destroyed || runId !== playbackRunId || isInternalCancel) {
          return;
        }
        const errCode = (event && 'error' in event ? event.error : '') ?? '';
        if (errCode === 'canceled' || errCode === 'interrupted') {
          return;
        }
        ownsSpeech = false;
        emitState({
          status: 'error',
          errorMessageKo:
            '기기 음성 합성 재생 중 오류가 발생했습니다. 다시 재생하거나 아래 한국어 전체 대본 텍스트를 참고해 주세요.',
          announcementKo:
            '한국어 음성 재생 오류 발생 — 아래 한국어 텍스트 대본을 확인하세요.',
        });
      };

      ownsSpeech = true;
      synth.speak(utterance);
      return true;
    } catch {
      ownsSpeech = false;
      emitState({
        status: 'error',
        errorMessageKo:
          '브라우저 음성 합성 호출에 실패했습니다. 아래 한국어 전체 대본 텍스트를 참고해 주세요.',
        announcementKo: '음성 재생 호출 실패 — 한국어 텍스트 대본을 확인하세요.',
      });
      return false;
    }
  }

  function buildQueueForSection(
    section: KoreanVoiceNarrationSection | 'all',
  ): number[] {
    if (section === 'all') {
      return script.segments.map((_, index) => index);
    }
    const matching = script.segments
      .filter((segment) => segment.section === section)
      .map((segment) => segment.index);
    return matching.length > 0
      ? matching
      : script.segments.map((_, index) => index);
  }

  const unregisterCoordinator =
    movementMediaSessionCoordinator.registerActiveSession(script.exerciseId, {
      stopVoice: () => {
        controller.stop(
          '다른 동작이 선택되어 이전 한국어 음성 안내를 자동으로 정지했습니다.',
        );
      },
    });

  const synthForListener = resolveSpeechSynthesis(env);
  const handleVoicesChanged = () => {
    if (destroyed) {
      return;
    }
    controller.refreshCapability();
  };

  try {
    if (
      synthForListener &&
      typeof synthForListener.addEventListener === 'function'
    ) {
      synthForListener.addEventListener('voiceschanged', handleVoicesChanged);
    }
  } catch {
    // Ignore environments where speechSynthesis does not implement EventTarget
  }

  const controller: KoreanVoiceController = {
    getState(): KoreanVoiceControllerState {
      return state;
    },

    play(section: KoreanVoiceNarrationSection | 'all' = 'all'): boolean {
      if (destroyed) {
        return false;
      }

      movementMediaSessionCoordinator.notifyMovementActivated(script.exerciseId);
      capability = inspectMobileAndBrowserTtsSupport(env);

      if (!capability.canAttemptSpeech) {
        emitState({
          capability,
          status: 'unsupported',
          activeSection: section,
          errorMessageKo:
            capability.detailNoteKo,
          announcementKo:
            capability.summaryLabelKo,
        });
        return false;
      }

      playbackRunId += 1;
      const runId = playbackRunId;
      cancelSpeechSafely();

      currentQueueIndices = buildQueueForSection(section);
      const initialSegmentIndex = currentQueueIndices[0] ?? 0;

      emitState({
        capability,
        activeSection: section,
        activeSegmentIndex: initialSegmentIndex,
        errorMessageKo: null,
      });

      return speakQueueFromPosition(0, runId);
    },

    pause(): void {
      if (destroyed || state.status !== 'playing') {
        return;
      }
      const synth = resolveSpeechSynthesis(env);
      try {
        synth?.pause?.();
      } catch {
        // Ignore mobile pause quirks; segment index is preserved in state.
      }
      emitState({
        status: 'paused',
        announcementKo: `${
          script.segments[state.activeSegmentIndex]?.labelKo ?? '현재'
        } 구간에서 한국어 음성 안내가 일시정지되었습니다.`,
      });
    },

    resume(): boolean {
      if (destroyed || state.status !== 'paused') {
        return false;
      }
      movementMediaSessionCoordinator.notifyMovementActivated(script.exerciseId);
      capability = inspectMobileAndBrowserTtsSupport(env);
      const synth = resolveSpeechSynthesis(env);
      let selectedVoice: SpeechSynthesisVoice | null;
      try {
        selectedVoice = synth ? selectBestKoreanVoice(synth.getVoices?.() ?? []) : null;
      } catch {
        selectedVoice = null;
      }
      if (!synth || !capability.canAttemptSpeech || !selectedVoice) {
        playbackRunId += 1;
        cancelSpeechSafely();
        emitState({
          capability,
          status: 'unsupported',
          errorMessageKo: capability.detailNoteKo,
          announcementKo: capability.summaryLabelKo,
        });
        return false;
      }

      if (state.speed === activeUtteranceSpeed) {
        try {
          synth.resume?.();
        } catch {
          // Ignore resume errors and fall back to segment recovery below.
        }

        const isStillSpeakingOrPaused = Boolean(synth.speaking || synth.paused);
        if (isStillSpeakingOrPaused) {
          emitState({
            capability,
            status: 'playing',
            errorMessageKo: null,
            announcementKo: `${
              script.segments[state.activeSegmentIndex]?.labelKo ?? '현재'
            } 구간 한국어 음성 안내 이어듣기 중 (${state.speed}배속)`,
          });
          return true;
        }
      }

      // Mobile segment recovery: re-speak starting from state.activeSegmentIndex
      playbackRunId += 1;
      const runId = playbackRunId;
      cancelSpeechSafely();

      const resumePosInQueue = currentQueueIndices.indexOf(
        state.activeSegmentIndex,
      );
      if (resumePosInQueue >= 0) {
        return speakQueueFromPosition(resumePosInQueue, runId);
      }

      currentQueueIndices = script.segments
        .slice(state.activeSegmentIndex)
        .map((segment) => segment.index);
      return speakQueueFromPosition(0, runId);
    },

    stop(reasonKo?: string): void {
      if (destroyed) {
        return;
      }
      playbackRunId += 1;
      cancelSpeechSafely();

      const nextStatus = capability.canAttemptSpeech ? 'idle' : 'unsupported';
      emitState({
        status: nextStatus,
        activeSegmentIndex: 0,
        errorMessageKo: capability.canAttemptSpeech
          ? null
          : state.errorMessageKo,
        announcementKo:
          reasonKo ?? '한국어 음성 안내가 정지되었습니다.',
      });
    },

    setSpeed(speed: KoreanVoicePlaybackSpeed): void {
      if (destroyed) {
        return;
      }
      const nextSpeed = normalizeSpeed(speed);
      const wasPlaying = state.status === 'playing';
      const currentSegmentIndex = state.activeSegmentIndex;

      emitState({
        speed: nextSpeed,
        announcementKo: `한국어 음성 재생 속도가 ${nextSpeed}배속으로 설정되었습니다.`,
      });

      if (wasPlaying) {
        playbackRunId += 1;
        const runId = playbackRunId;
        cancelSpeechSafely();

        const queuePos = currentQueueIndices.indexOf(currentSegmentIndex);
        if (queuePos >= 0) {
          speakQueueFromPosition(queuePos, runId);
        } else {
          currentQueueIndices = script.segments
            .slice(currentSegmentIndex)
            .map((segment) => segment.index);
          speakQueueFromPosition(0, runId);
        }
      }
    },

    speakSegment(segmentIndex: number): boolean {
      if (
        destroyed ||
        !Number.isInteger(segmentIndex) ||
        segmentIndex < 0 ||
        segmentIndex >= script.segments.length
      ) {
        return false;
      }

      movementMediaSessionCoordinator.notifyMovementActivated(script.exerciseId);
      capability = inspectMobileAndBrowserTtsSupport(env);

      if (!capability.canAttemptSpeech) {
        emitState({
          capability,
          status: 'unsupported',
          activeSegmentIndex: segmentIndex,
          errorMessageKo:
            capability.detailNoteKo,
          announcementKo:
            capability.summaryLabelKo,
        });
        return false;
      }

      playbackRunId += 1;
      const runId = playbackRunId;
      cancelSpeechSafely();

      const targetSegment = script.segments[segmentIndex];
      currentQueueIndices = script.segments
        .slice(segmentIndex)
        .map((segment) => segment.index);

      emitState({
        capability,
        activeSection: targetSegment.section,
        activeSegmentIndex: segmentIndex,
        errorMessageKo: null,
      });

      return speakQueueFromPosition(0, runId);
    },

    refreshCapability(): MobileTtsCapabilityReport {
      capability = inspectMobileAndBrowserTtsSupport(env);
      if (
        !capability.canAttemptSpeech &&
        (state.status === 'playing' || state.status === 'paused')
      ) {
        controller.stop(capability.summaryLabelKo);
      }
      const nextStatus =
        !capability.canAttemptSpeech && state.status === 'idle'
          ? 'unsupported'
          : capability.canAttemptSpeech && state.status === 'unsupported'
            ? 'idle'
            : state.status;
      emitState({
        capability,
        status: nextStatus,
        errorMessageKo: capability.canAttemptSpeech ? null : capability.detailNoteKo,
      });
      return capability;
    },

    destroy(): void {
      if (destroyed) {
        return;
      }
      controller.stop('한국어 음성 컨트롤러가 정리되었습니다.');
      destroyed = true;
      unregisterCoordinator();
      try {
        if (
          synthForListener &&
          typeof synthForListener.removeEventListener === 'function'
        ) {
          synthForListener.removeEventListener(
            'voiceschanged',
            handleVoicesChanged,
          );
        }
      } catch {
        // Ignore removeEventListener errors
      }
    },
  };

  return controller;
}
