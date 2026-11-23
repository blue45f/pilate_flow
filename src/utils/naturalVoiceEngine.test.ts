import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import type { PilatesExercise, SequenceStep } from '../types/pilates';
import { movementMediaSessionCoordinator } from './koreanVoiceNarration';
import {
  buildNaturalExerciseScript,
  buildSequenceChunkMap,
  buildSequenceRehearsalScript,
  cleanSpokenKoreanText,
  formatKoreanParticle,
  formatSpringsSpokenKo,
} from './naturalVoiceScriptBuilder';
import {
  BREATH_CHIME_FREQUENCIES_HZ,
  NATURAL_VOICE_CACHE_DB_NAME,
  buildNaturalVoiceCacheKey,
  containsSensitivePersonalInfo,
  createNaturalVoiceAudioCache,
  createNaturalVoiceController,
  createStudioBreathAudioSynth,
  rankKoreanNaturalVoices,
  selectNaturalKoreanVoice,
  splitIntoProsodyClauses,
  type NaturalVoiceCloudSynthesizePayload,
} from './naturalVoiceEngine';

class MockSpeechSynthesisUtterance {
  text: string;
  lang = '';
  rate = 1;
  pitch = 1;
  voice: SpeechSynthesisVoice | null = null;
  onend: ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisEvent) => unknown) | null = null;
  onerror:
    | ((this: SpeechSynthesisUtterance, ev: SpeechSynthesisErrorEvent) => unknown)
    | null = null;

  constructor(text = '') {
    this.text = text;
  }
}

function mockVoice(
  overrides: Partial<SpeechSynthesisVoice> & { name: string; lang: string },
): SpeechSynthesisVoice {
  return {
    default: false,
    localService: true,
    voiceURI: overrides.name,
    ...overrides,
  };
}

function createMockSynth(voices: SpeechSynthesisVoice[]) {
  const spoken: MockSpeechSynthesisUtterance[] = [];
  const synth = {
    speaking: false,
    paused: false,
    pending: false,
    spoken,
    getVoices: vi.fn(() => voices),
    speak: vi.fn((u: SpeechSynthesisUtterance) => {
      synth.speaking = true;
      spoken.push(u as unknown as MockSpeechSynthesisUtterance);
    }),
    cancel: vi.fn(() => {
      synth.speaking = false;
    }),
  };
  return synth;
}

function createMockAudioContext() {
  const frequencies: number[] = [];
  let closed = false;
  class FakeAudioContext {
    currentTime = 0;
    state: AudioContextState = 'running';
    destination = {} as AudioDestinationNode;
    createOscillator() {
      return {
        type: 'sine',
        frequency: {
          setValueAtTime: vi.fn((hz: number) => {
            frequencies.push(hz);
          }),
        },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
    }
    createGain() {
      return {
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      };
    }
    resume = vi.fn(async () => {
      this.state = 'running';
    });
    close = vi.fn(async () => {
      closed = true;
      this.state = 'closed';
    });
  }
  return {
    Ctor: FakeAudioContext as unknown as typeof AudioContext,
    frequencies,
    isClosed: () => closed,
  };
}

function createMockAudioElementFactory() {
  const created: Array<{
    url: string;
    playbackRate: number;
    onended: (() => void) | null;
    onerror: (() => void) | null;
    play: ReturnType<typeof vi.fn>;
    pause: ReturnType<typeof vi.fn>;
  }> = [];

  const factory = (url: string) => {
    const el = {
      url,
      playbackRate: 1,
      onended: null as (() => void) | null,
      onerror: null as (() => void) | null,
      play: vi.fn(() => Promise.resolve()),
      pause: vi.fn(),
    };
    created.push(el);
    return el as unknown as HTMLAudioElement;
  };

  return { factory, created };
}

describe('naturalVoiceScriptBuilder', () => {
  it('attaches phonetically natural Korean particles and translates springs cleanly', () => {
    expect(formatKoreanParticle('리포머 풋워크', '이에요/예요')).toBe('리포머 풋워크예요');
    expect(formatKoreanParticle('롤다운', '이에요/예요')).toBe('롤다운이에요');
    expect(formatKoreanParticle('미니볼', '으로/로')).toBe('미니볼로');
    expect(formatKoreanParticle('써클링', '으로/로')).toBe('써클링으로');

    expect(formatSpringsSpokenKo('2R 1B', 'reformer')).toBe('빨강 둘에 파랑 하나');
    expect(formatSpringsSpokenKo('1R 1B', 'reformer')).toBe('빨강 하나에 파랑 하나');
    expect(formatSpringsSpokenKo('2R', 'reformer')).toBe('빨강 두 개');
    expect(formatSpringsSpokenKo('1B', 'reformer')).toBe('파랑 하나');
    expect(formatSpringsSpokenKo('Bodyweight', 'mat')).toBe('스프링 없이 맨몸');
  });

  it('strips stiff metadata symbols and builds warm spoken Pilates coaching segments with prosody', () => {
    const footwork =
      INITIAL_EXERCISES.find((ex) => ex.id === 'ex-footwork-01') ?? INITIAL_EXERCISES[0];
    const script = buildNaturalExerciseScript(footwork);

    expect(script.exerciseId).toBe(footwork.id);
    expect(script.segments.length).toBeGreaterThanOrEqual(5);
    expect(script.fullTextKo).not.toContain('기구 세부 세팅:');
    expect(script.fullTextKo).not.toContain('기본 계획 시간은');
    expect(script.fullTextKo).not.toContain('(High)');
    expect(script.fullTextKo).not.toContain('→');

    const intro = script.segments.find((s) => s.tone === 'warm-intro');
    const setup = script.segments.find((s) => s.tone === 'setup');
    const breath = script.segments.find((s) => s.tone === 'breath');
    const cue = script.segments.find((s) => s.tone === 'cue');
    const tip = script.segments.find((s) => s.tone === 'tip');

    expect(intro?.textKo).toContain('이번 동작은');
    expect(setup?.textKo).toContain('빨강 둘에 파랑 하나');
    expect(setup?.textKo).toContain('풋바는 높게');
    expect(setup?.textKo).toContain('헤드레스트는 살짝 올려서');
    expect(breath?.prosody.breathChime).toBe('inhale');
    expect(cue?.textKo.length).toBeGreaterThan(10);
    expect(tip?.textKo).toContain('짚어드릴게요');

    for (const seg of script.segments) {
      expect(seg.pauseMs).toBeGreaterThanOrEqual(350);
      expect(seg.pauseMs).toBeLessThanOrEqual(850);
      expect(seg.prosody.rateScale).toBeGreaterThanOrEqual(0.94);
      expect(seg.prosody.rateScale).toBeLessThanOrEqual(1.02);
      expect(seg.prosody.pitch).toBeGreaterThanOrEqual(0.98);
      expect(seg.prosody.pitch).toBeLessThanOrEqual(1.04);
    }

    expect(cleanSpokenKoreanText('50:50 유지 (Locking) → 15cm 이동')).toBe(
      '오십 대 오십 유지, 이어서 15센티미터 이동',
    );
  });

  it('builds podcast, blank memorization quiz, and breath-tempo sequence rehearsal scripts', () => {
    const ex1 = INITIAL_EXERCISES.find((ex) => ex.id === 'ex-footwork-01') ?? INITIAL_EXERCISES[0];
    const ex2 = INITIAL_EXERCISES.find((ex) => ex.id === 'ex-bridging-01') ?? INITIAL_EXERCISES[1];
    const exercisesById = new Map<string, PilatesExercise>([
      [ex1.id, ex1],
      [ex2.id, ex2],
    ]);
    const steps: SequenceStep[] = [
      {
        stepId: 's-1',
        order: 1,
        blockCategory: ex1.blockCategory,
        exerciseId: ex1.id,
        durationMin: 6,
        selectedLayer: 'standard',
        customSpringOverride: '2R 1B',
      },
      {
        stepId: 's-rest',
        order: 2,
        kind: 'rest',
        blockCategory: 'cooldown',
        exerciseId: '',
        durationMin: 1,
        selectedLayer: 'standard',
      },
      {
        stepId: 's-2',
        order: 3,
        blockCategory: ex2.blockCategory,
        exerciseId: ex2.id,
        durationMin: 5,
        selectedLayer: 'standard',
      },
    ];

    const podcast = buildSequenceRehearsalScript({
      sequenceTitle: '화요일 오전 리포머',
      steps,
      exercisesById,
      mode: 'podcast',
    });
    expect(podcast.steps).toHaveLength(3);
    expect(podcast.segments[0].textKo).toContain('이어듣기');
    expect(podcast.fullTextKo).toContain('빨강 둘에 파랑 하나');

    const quiz = buildSequenceRehearsalScript({
      sequenceTitle: '화요일 오전 리포머',
      steps,
      exercisesById,
      mode: 'quiz',
      quizCountdownSec: 3,
    });
    const prompts = quiz.segments.filter((s) => s.tone === 'quiz-prompt');
    const answers = quiz.segments.filter((s) => s.tone === 'quiz-answer');
    expect(prompts).toHaveLength(2);
    expect(answers).toHaveLength(2);
    expect(prompts[1].textKo).toContain('3번 동작, 기억나시나요?');
    expect(prompts[1].countdownSec).toBe(3);
    expect(answers[1].textKo).toContain('정답!');
    expect(answers[1].quizCard?.answerNameKo).toBe(ex2.nameKo);

    const breathTempo = buildSequenceRehearsalScript({
      sequenceTitle: '화요일 오전 리포머',
      steps,
      exercisesById,
      mode: 'breath-tempo',
    });
    expect(breathTempo.segments.some((s) => s.prosody.breathChime === 'inhale')).toBe(true);
    expect(breathTempo.segments.some((s) => s.prosody.breathChime === 'exhale')).toBe(true);
    expect(breathTempo.segments.some((s) => Boolean(s.breathTempoRatio))).toBe(true);

    const fast3Min = buildSequenceRehearsalScript({
      sequenceTitle: '화요일 오전 리포머',
      steps,
      exercisesById,
      mode: 'fast-3min',
    });
    expect(fast3Min.segments[0].textKo).toContain('3분 고속 워크스루');
    expect(fast3Min.estimatedAudioSec).toBeLessThan(podcast.estimatedAudioSec);
    // Focused drill on confused steps only
    const confusedOnly = buildSequenceRehearsalScript({
      sequenceTitle: '화요일 오전 리포머',
      steps,
      exercisesById,
      mode: 'fast-3min',
      focusStepIds: ['s-2'],
    });
    expect(confusedOnly.steps).toHaveLength(1);
    expect(confusedOnly.steps[0].stepId).toBe('s-2');
    expect(confusedOnly.segments[0].textKo).toContain('헷갈린 1개 동작');
  });

  it('builds a 3~4 act position & spring chunking map for realistic 8~12 step sequences', () => {
    const picked = INITIAL_EXERCISES.slice(0, 10);
    const map = new Map(picked.map((ex) => [ex.id, ex]));
    const fullSteps: SequenceStep[] = picked.map((ex, idx) => ({
      stepId: `chunk-step-${idx + 1}`,
      order: idx + 1,
      blockCategory: ex.blockCategory,
      exerciseId: ex.id,
      durationMin: ex.defaultDurationMin,
      selectedLayer: 'standard',
    }));

    const chunks = buildSequenceChunkMap(fullSteps, map);
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    expect(chunks.length).toBeLessThanOrEqual(4);
    expect(chunks[0].titleKo).toMatch(/^1막/);
    const totalCovered = chunks.reduce((sum, act) => sum + act.stepIds.length, 0);
    expect(totalCovered).toBe(fullSteps.length);
  });
});

describe('naturalVoiceEngine', () => {
  beforeEach(() => {
    movementMediaSessionCoordinator.resetForTests();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('ranks Enhanced / Neural Korean voices ahead of compact voices and splits prosody clauses', () => {
    const compact = mockVoice({ name: 'Korean Compact', lang: 'ko-KR', localService: true });
    const google = mockVoice({ name: 'Google 한국의', lang: 'ko-KR', localService: false });
    const sunhi = mockVoice({
      name: 'Microsoft SunHi Online (Natural) - Korean',
      lang: 'ko-KR',
      localService: false,
    });
    const yunaEnhanced = mockVoice({
      name: 'Yuna (Enhanced)',
      lang: 'ko-KR',
      localService: true,
    });
    const english = mockVoice({ name: 'Samantha (Enhanced)', lang: 'en-US', localService: true });

    const ranked = rankKoreanNaturalVoices([english, compact, google, sunhi, yunaEnhanced]);
    expect(ranked.map((r) => r.voice.name)).toEqual([
      'Yuna (Enhanced)',
      'Microsoft SunHi Online (Natural) - Korean',
      'Google 한국의',
      'Korean Compact',
    ]);
    expect(selectNaturalKoreanVoice([english, compact, yunaEnhanced])?.qualityTier).toBe('enhanced');
    expect(selectNaturalKoreanVoice([english, google], { localOnly: true })).toBeNull();

    const script = buildNaturalExerciseScript(INITIAL_EXERCISES[0]);
    const clauses = splitIntoProsodyClauses(script.segments[1], 1.0);
    expect(clauses.length).toBeGreaterThanOrEqual(1);
    for (const clause of clauses) {
      expect(clause.rate).toBeGreaterThanOrEqual(0.9);
      expect(clause.rate).toBeLessThanOrEqual(1.05);
      expect(clause.pitch).toBeGreaterThanOrEqual(0.98);
      expect(clause.pitch).toBeLessThanOrEqual(1.04);
    }
    expect(clauses.at(-1)?.pauseAfterMs).toBeGreaterThanOrEqual(350);
  });

  it('synthesizes 432Hz inhale and 396Hz exhale soft chimes via Web Audio API', () => {
    const mockCtx = createMockAudioContext();
    const synth = createStudioBreathAudioSynth(mockCtx.Ctor);

    expect(synth.playChime('inhale')).toBe(true);
    expect(synth.playChime('exhale')).toBe(true);
    expect(synth.playChime('quiz-reveal')).toBe(true);
    expect(synth.playChime('none')).toBe(false);

    expect(mockCtx.frequencies).toContain(BREATH_CHIME_FREQUENCIES_HZ.inhale);
    expect(mockCtx.frequencies).toContain(BREATH_CHIME_FREQUENCIES_HZ.exhale);
    expect(mockCtx.frequencies).toContain(BREATH_CHIME_FREQUENCIES_HZ.quizReveal);

    synth.close();
    expect(mockCtx.isClosed()).toBe(true);
  });

  it('uses Tier-1 cloud synthesis with IndexedDB cache (0ms repeat hit) and blocks sensitive data from cloud', async () => {
    const audioCache = createNaturalVoiceAudioCache(null);
    expect(NATURAL_VOICE_CACHE_DB_NAME).toBe('pf_natural_voice_cache_v1');

    const key = buildNaturalVoiceCacheKey({
      textKo: '코로 깊게 마셨다가 내쉬어 볼게요.',
      tone: 'breath',
      voicePreset: 'coral',
      speed: 1,
    });
    expect(key).toMatch(/^nv-[0-9a-f]{16}$/);
    expect(containsSensitivePersonalInfo('회원 전화 010-1234-5678 허리 디스크')).toBe(true);
    expect(containsSensitivePersonalInfo('스프링은 빨강 둘에 파랑 하나 걸어주시고요.')).toBe(false);

    const cloudCalls: NaturalVoiceCloudSynthesizePayload[] = [];
    const synthesizeCloud = vi.fn(async (payload: NaturalVoiceCloudSynthesizePayload) => {
      cloudCalls.push(payload);
      return {
        audioBytes: new Uint8Array([1, 2, 3, 4]).buffer,
        mimeType: 'audio/mpeg' as const,
        provider: 'openai' as const,
        voiceId: 'coral',
        model: 'gpt-4o-mini-tts',
      };
    });

    const audioMock = createMockAudioElementFactory();
    const synth = createMockSynth([mockVoice({ name: 'Yuna (Enhanced)', lang: 'ko-KR' })]);
    const script = buildNaturalExerciseScript(INITIAL_EXERCISES[0]);
    const singleSeg = [script.segments[0]];

    const controller = createNaturalVoiceController({
      sessionId: 'test-cloud-cache',
      segments: singleSeg,
      preferCloud: true,
      env: {
        speechSynthesis: synth as unknown as SpeechSynthesis,
        SpeechSynthesisUtterance:
          MockSpeechSynthesisUtterance as unknown as typeof SpeechSynthesisUtterance,
        audioCache,
        synthesizeCloud,
        createAudioElement: audioMock.factory,
        AudioContextCtor: null,
      },
    });

    // First play: fetches Tier-1 cloud audio and stores in cache
    expect(controller.play(0)).toBe(true);
    await vi.waitFor(() => expect(audioMock.created).toHaveLength(1));
    expect(synthesizeCloud).toHaveBeenCalledTimes(1);
    expect(controller.getState().activeTier).toBe('cloud-neural');
    expect(controller.getState().voiceQualityLabelKo).toBe('스튜디오 자연 음성');

    // Finish first playback
    audioMock.created[0].onended?.();
    await vi.advanceTimersByTimeAsync(400);
    expect(controller.getState().status).toBe('completed');

    // Second play: hits cache with 0 cloud calls!
    expect(controller.play(0)).toBe(true);
    await vi.waitFor(() => expect(audioMock.created).toHaveLength(2));
    expect(synthesizeCloud).toHaveBeenCalledTimes(1);
    expect(controller.getState().cacheHitCount).toBe(1);

    controller.destroy();

    // Sensitive segment skips cloud completely and uses Tier 2 device voice
    const sensitiveController = createNaturalVoiceController({
      sessionId: 'test-sensitive-guard',
      segments: [
        {
          ...singleSeg[0],
          id: 'sensitive-seg',
          textKo: '김회원님 010-1234-5678 허리 디스크 주의 메모.',
        },
      ],
      preferCloud: true,
      env: {
        speechSynthesis: synth as unknown as SpeechSynthesis,
        SpeechSynthesisUtterance:
          MockSpeechSynthesisUtterance as unknown as typeof SpeechSynthesisUtterance,
        audioCache,
        synthesizeCloud,
        createAudioElement: audioMock.factory,
        AudioContextCtor: null,
      },
    });

    sensitiveController.play(0);
    await vi.waitFor(() => expect(synth.speak).toHaveBeenCalledTimes(1));
    expect(synthesizeCloud).toHaveBeenCalledTimes(1);
    expect(sensitiveController.getState().activeTier).toBe('device-enhanced');
    sensitiveController.destroy();
  });

  it('falls back seamlessly from unavailable Tier-1 cloud to Tier-2 prosody device playback and runs quiz countdown', async () => {
    const synth = createMockSynth([mockVoice({ name: 'Yuna (Enhanced)', lang: 'ko-KR' })]);
    const mockCtx = createMockAudioContext();
    const ex1 = INITIAL_EXERCISES[0];
    const exercisesById = new Map([[ex1.id, ex1]]);
    const quizScript = buildSequenceRehearsalScript({
      sequenceTitle: '출근길 테스트',
      steps: [
        {
          stepId: 'q1',
          order: 1,
          blockCategory: ex1.blockCategory,
          exerciseId: ex1.id,
          durationMin: 4,
          selectedLayer: 'standard',
        },
      ],
      exercisesById,
      mode: 'quiz',
      quizCountdownSec: 3,
    });

    const promptIndex = quizScript.segments.findIndex((s) => s.tone === 'quiz-prompt');
    expect(promptIndex).toBeGreaterThanOrEqual(0);

    const observedCountdowns: Array<number | null> = [];
    const controller = createNaturalVoiceController({
      sessionId: 'test-quiz-countdown',
      segments: quizScript.segments,
      preferCloud: true,
      breathChimesEnabled: true,
      env: {
        speechSynthesis: synth as unknown as SpeechSynthesis,
        SpeechSynthesisUtterance:
          MockSpeechSynthesisUtterance as unknown as typeof SpeechSynthesisUtterance,
        AudioContextCtor: mockCtx.Ctor,
        synthesizeCloud: vi.fn(async () => null),
        audioCache: createNaturalVoiceAudioCache(null),
      },
      onStateChange: (st) => {
        if (st.quizCountdownRemainingSec !== null) {
          observedCountdowns.push(st.quizCountdownRemainingSec);
        }
      },
    });

    controller.play(promptIndex);
    await vi.waitFor(() => expect(synth.spoken.length).toBeGreaterThan(0));
    expect(controller.getState().activeTier).toBe('device-enhanced');

    // Finish all clauses of quiz-prompt
    while (controller.getState().quizCountdownRemainingSec === null) {
      const latest = synth.spoken.at(-1)!;
      latest.onend?.call(latest as unknown as SpeechSynthesisUtterance, {} as SpeechSynthesisEvent);
      await vi.advanceTimersByTimeAsync(350);
    }

    // Advance through 3..2..1 countdown -> auto advances to quiz-answer
    await vi.advanceTimersByTimeAsync(3200);
    expect(observedCountdowns).toEqual([3, 2, 1]);
    expect(controller.getState().currentSegment?.tone).toBe('quiz-answer');
    expect(mockCtx.frequencies).toContain(BREATH_CHIME_FREQUENCIES_HZ.quizTick);
    expect(mockCtx.frequencies).toContain(BREATH_CHIME_FREQUENCIES_HZ.quizReveal);

    controller.destroy();
  });
});
