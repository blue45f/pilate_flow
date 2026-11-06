import { beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../data/pilatesCatalog';
import type { PilatesExercise } from '../types/pilates';
import {
  buildKoreanVoiceScript,
  createKoreanVoiceController,
  inspectMobileAndBrowserTtsSupport,
  KOREAN_VOICE_DISCLAIMER_KO,
  KOREAN_VOICE_SECTION_LABELS,
  movementMediaSessionCoordinator,
  selectBestKoreanVoice,
} from './koreanVoiceNarration';

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

function createMockVoice(
  overrides: Partial<SpeechSynthesisVoice> & { name: string; lang: string },
): SpeechSynthesisVoice {
  return {
    default: false,
    localService: false,
    voiceURI: overrides.name,
    ...overrides,
  };
}

function createMockSpeechSynthesis(options?: {
  voices?: SpeechSynthesisVoice[];
  keepSpeakingOnPause?: boolean;
}) {
  let voices = options?.voices ?? [];
  const spokenUtterances: MockSpeechSynthesisUtterance[] = [];
  const listeners = new Map<string, Set<() => void>>();

  const synth = {
    speaking: false,
    paused: false,
    pending: false,
    spokenUtterances,
    setVoices(nextVoices: SpeechSynthesisVoice[]) {
      voices = nextVoices;
      const handlers = listeners.get('voiceschanged');
      handlers?.forEach((fn) => fn());
    },
    getVoices: vi.fn(() => voices),
    speak: vi.fn((utterance: SpeechSynthesisUtterance) => {
      synth.speaking = true;
      synth.paused = false;
      spokenUtterances.push(utterance as unknown as MockSpeechSynthesisUtterance);
    }),
    cancel: vi.fn(() => {
      synth.speaking = false;
      synth.paused = false;
    }),
    pause: vi.fn(() => {
      if (options?.keepSpeakingOnPause) {
        synth.speaking = true;
        synth.paused = true;
      } else {
        // Simulates mobile WebKit/Android quirk where pause() drops active speaking flag
        synth.speaking = false;
        synth.paused = false;
      }
    }),
    resume: vi.fn(() => {
      if (options?.keepSpeakingOnPause && synth.paused) {
        synth.paused = false;
        synth.speaking = true;
      }
    }),
    addEventListener: vi.fn((type: string, handler: () => void) => {
      if (!listeners.has(type)) {
        listeners.set(type, new Set());
      }
      listeners.get(type)?.add(handler);
    }),
    removeEventListener: vi.fn((type: string, handler: () => void) => {
      listeners.get(type)?.delete(handler);
    }),
  };

  return synth;
}

describe('koreanVoiceNarration', () => {
  beforeEach(() => {
    movementMediaSessionCoordinator.resetForTests();
  });

  describe('buildKoreanVoiceScript', () => {
    it('builds all 6 Korean narration segments, fullTextKo, and disclaimer for catalog exercises', () => {
      const exercise = INITIAL_EXERCISES.find((item) => item.id === 'ex-warmup-01') ?? INITIAL_EXERCISES[0];
      const script = buildKoreanVoiceScript(exercise);

      expect(script.exerciseId).toBe(exercise.id);
      expect(script.exerciseNameKo).toBe(exercise.nameKo);
      expect(script.segments).toHaveLength(6);
      expect(script.disclaimerKo).toBe(KOREAN_VOICE_DISCLAIMER_KO);
      expect(script.estimatedDurationSec).toBeGreaterThanOrEqual(12);

      const expectedSections = [
        'overview',
        'setup',
        'breath',
        'cues',
        'layers',
        'precautions',
      ] as const;

      expectedSections.forEach((section, index) => {
        const segment = script.segments[index];
        expect(segment.index).toBe(index);
        expect(segment.section).toBe(section);
        expect(segment.labelKo).toBe(KOREAN_VOICE_SECTION_LABELS[section]);
        expect(segment.textKo.length).toBeGreaterThan(10);
        expect(script.fullTextKo).toContain(`[${segment.labelKo}]`);
        expect(script.fullTextKo).toContain(segment.textKo);
      });

      expect(script.segments[0].textKo).toContain(exercise.nameKo);
      expect(script.segments[0].textKo).toContain(`계획 ${exercise.defaultDurationMin}분`);
      expect(script.segments[0].textKo).toContain('주요 타깃 부위:');
      expect(script.segments[1].textKo).toContain('리포머');
      expect(script.segments[3].textKo).toContain('첫째,');
      expect(script.segments[4].textKo).toContain('쉬운 변형:');
      expect(script.segments[4].textKo).toContain('기본 과정:');
      expect(script.segments[4].textKo).toContain('심화 확장:');
      expect(script.segments[5].textKo).toContain('주의사항:');
    });

    it('gracefully handles custom unilateral exercises with minimal or empty fields', () => {
      const customExercise: PilatesExercise = {
        id: 'custom-unilateral-01',
        nameKo: '커스텀 사이드 레그 리프트',
        nameEn: 'Custom Side Leg Lift',
        apparatus: 'mat',
        props: ['none'],
        blockCategory: 'lower-body',
        spinalPlanes: ['neutral'],
        bodyPosition: 'side-lying',
        level: '1.5',
        defaultDurationMin: 5,
        isUnilateral: true,
        springs: 'Bodyweight',
        box: 'none',
        footbar: 'none',
        headrest: 'flat',
        targetMuscles: ['중둔근'],
        breathPattern: '',
        cues: [],
        precautions: '',
        layers: {
          easy: '무릎 굽혀 진행',
          standard: '두 다리 뻗어 진행',
          hard: '루프 밴드 저항 추가',
        },
        youtube: {
          videoId: 'K56Z12XNQ5c',
          channelName: 'Test Channel',
          videoTitle: 'Test Title',
          startSec: 0,
          url: 'https://www.youtube.com/watch?v=K56Z12XNQ5c',
        },
        favoriteTag: 'none',
        isCustom: true,
      };

      const script = buildKoreanVoiceScript(customExercise);

      expect(script.segments[0].textKo).toContain('좌우 진행');
      expect(script.segments[1].textKo).toContain('매트');
      expect(script.segments[1].textKo).toContain('소도구 없음');
      expect(script.segments[2].textKo).toContain(
        '편안한 호흡 리듬을 먼저 관찰하고 동작 전후로 호흡을 유지합니다.',
      );
      expect(script.segments[3].textKo).toContain('첫째,');
      expect(script.segments[5].textKo).toContain(
        '강사가 개인별 가동 범위와 기구 안전을 직접 확인합니다.',
      );
    });
  });

  describe('selectBestKoreanVoice', () => {
    it('prioritizes localService ko-KR first, then local ko, then default ko, then network ko', () => {
      const enVoice = createMockVoice({
        name: 'Samantha',
        lang: 'en-US',
        localService: true,
      });
      const networkKo = createMockVoice({
        name: 'Google 한국의',
        lang: 'ko-KR',
        localService: false,
        default: false,
      });
      const defaultKo = createMockVoice({
        name: 'Default Korean',
        lang: 'ko-KR',
        localService: false,
        default: true,
      });
      const localGenericKo = createMockVoice({
        name: 'Sora',
        lang: 'ko',
        localService: true,
      });
      const localExactKoKr = createMockVoice({
        name: 'Yuna',
        lang: 'ko_KR',
        localService: true,
      });

      expect(
        selectBestKoreanVoice([enVoice, networkKo, defaultKo, localGenericKo, localExactKoKr]),
      ).toBe(localExactKoKr);
      expect(selectBestKoreanVoice([enVoice, networkKo, defaultKo, localGenericKo])).toBe(
        localGenericKo,
      );
      expect(selectBestKoreanVoice([enVoice, networkKo, defaultKo])).toBe(defaultKo);
      expect(selectBestKoreanVoice([enVoice, networkKo])).toBe(networkKo);
      expect(selectBestKoreanVoice([enVoice])).toBeNull();
      expect(selectBestKoreanVoice([])).toBeNull();
    });
  });

  describe('inspectMobileAndBrowserTtsSupport', () => {
    it('detects iOS Safari WebKit with local Korean voice and user gesture requirement', () => {
      const yuna = createMockVoice({
        name: 'Yuna',
        lang: 'ko-KR',
        localService: true,
      });
      const synth = createMockSpeechSynthesis({ voices: [yuna] });

      const report = inspectMobileAndBrowserTtsSupport({
        speechSynthesis: synth as unknown as SpeechSynthesis,
        SpeechSynthesisUtterance:
          MockSpeechSynthesisUtterance as unknown as typeof SpeechSynthesisUtterance,
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
      });

      expect(report.platformCategory).toBe('ios-safari-webkit');
      expect(report.canAttemptSpeech).toBe(true);
      expect(report.koreanVoiceStatus).toBe('korean-local-voice');
      expect(report.selectedVoiceName).toBe('Yuna');
      expect(report.isLocalFreeDeviceVoice).toBe(true);
      expect(report.requiresUserGesture).toBe(true);
      expect(report.pauseResumeStrategy).toBe('native-with-segment-recovery');
    });

    it('detects Android Chrome with empty initial getVoices() as os-default-ko-fallback', () => {
      const synth = createMockSpeechSynthesis({ voices: [] });

      const report = inspectMobileAndBrowserTtsSupport({
        speechSynthesis: synth as unknown as SpeechSynthesis,
        SpeechSynthesisUtterance:
          MockSpeechSynthesisUtterance as unknown as typeof SpeechSynthesisUtterance,
        userAgent:
          'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36',
      });

      expect(report.platformCategory).toBe('android-chromium');
      expect(report.canAttemptSpeech).toBe(true);
      expect(report.koreanVoiceStatus).toBe('os-default-ko-fallback');
      expect(report.selectedVoiceLang).toBe('ko-KR');
      expect(report.requiresUserGesture).toBe(true);
      expect(report.pauseResumeStrategy).toBe('native-with-segment-recovery');
    });

    it('detects Desktop browser with network Korean voice', () => {
      const googleKo = createMockVoice({
        name: 'Google 한국어',
        lang: 'ko-KR',
        localService: false,
      });
      const synth = createMockSpeechSynthesis({ voices: [googleKo] });

      const report = inspectMobileAndBrowserTtsSupport({
        speechSynthesis: synth as unknown as SpeechSynthesis,
        SpeechSynthesisUtterance:
          MockSpeechSynthesisUtterance as unknown as typeof SpeechSynthesisUtterance,
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
      });

      expect(report.platformCategory).toBe('desktop-browser');
      expect(report.koreanVoiceStatus).toBe('korean-network-voice');
      expect(report.isLocalFreeDeviceVoice).toBe(false);
      expect(report.requiresUserGesture).toBe(false);
    });

    it('returns safe text-only fallback when speechSynthesis is unsupported', () => {
      const report = inspectMobileAndBrowserTtsSupport({
        speechSynthesis: null,
        SpeechSynthesisUtterance: null,
        userAgent: 'CustomWebView/1.0',
      });

      expect(report.platformCategory).toBe('unsupported-env');
      expect(report.canAttemptSpeech).toBe(false);
      expect(report.koreanVoiceStatus).toBe('no-tts-engine');
      expect(report.pauseResumeStrategy).toBe('text-only-fallback');
    });
  });

  describe('createKoreanVoiceController & movementMediaSessionCoordinator', () => {
    const sampleExercise = INITIAL_EXERCISES[0];
    const sampleScript = buildKoreanVoiceScript(sampleExercise);

    it('never auto-plays on creation and starts speaking only when play() is called', () => {
      const synth = createMockSpeechSynthesis({
        voices: [
          createMockVoice({ name: 'Yuna', lang: 'ko-KR', localService: true }),
        ],
      });

      const controller = createKoreanVoiceController({
        script: sampleScript,
        env: {
          speechSynthesis: synth as unknown as SpeechSynthesis,
          SpeechSynthesisUtterance:
            MockSpeechSynthesisUtterance as unknown as typeof SpeechSynthesisUtterance,
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        },
      });

      expect(controller.getState().status).toBe('idle');
      expect(synth.speak).not.toHaveBeenCalled();

      const started = controller.play('all');
      expect(started).toBe(true);
      expect(controller.getState().status).toBe('playing');
      expect(controller.getState().activeSegmentIndex).toBe(0);
      expect(synth.speak).toHaveBeenCalledTimes(1);
      expect(synth.spokenUtterances[0].lang).toBe('ko-KR');
      expect(synth.spokenUtterances[0].text).toBe(sampleScript.segments[0].textKo);

      // Advance through all 6 segments
      for (let idx = 0; idx < sampleScript.segments.length; idx += 1) {
        const currentUtterance =
          synth.spokenUtterances[synth.spokenUtterances.length - 1];
        expect(controller.getState().activeSegmentIndex).toBe(idx);
        currentUtterance.onend?.call(
          currentUtterance as unknown as SpeechSynthesisUtterance,
          {} as SpeechSynthesisEvent,
        );
      }

      expect(controller.getState().status).toBe('completed');
      controller.destroy();
    });

    it('supports pause, mobile segment-recovery resume, speed changes (0.75..1.25), and segment jump', () => {
      const synth = createMockSpeechSynthesis({
        voices: [],
        keepSpeakingOnPause: false, // mobile behavior where pause drops native speaking state
      });

      const controller = createKoreanVoiceController({
        script: sampleScript,
        env: {
          speechSynthesis: synth as unknown as SpeechSynthesis,
          SpeechSynthesisUtterance:
            MockSpeechSynthesisUtterance as unknown as typeof SpeechSynthesisUtterance,
          userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari/537.36',
        },
      });

      controller.speakSegment(2);
      expect(controller.getState().status).toBe('playing');
      expect(controller.getState().activeSegmentIndex).toBe(2);
      expect(synth.spokenUtterances.at(-1)?.text).toBe(
        sampleScript.segments[2].textKo,
      );

      // Pause on mobile
      controller.pause();
      expect(controller.getState().status).toBe('paused');
      expect(controller.getState().activeSegmentIndex).toBe(2);

      // Resume recovers from segment 2 on mobile when synth.speaking is false
      const resumed = controller.resume();
      expect(resumed).toBe(true);
      expect(controller.getState().status).toBe('playing');
      expect(controller.getState().activeSegmentIndex).toBe(2);
      expect(synth.speak).toHaveBeenCalledTimes(2);

      // Change speed while playing -> immediately restarts current segment at new speed
      controller.setSpeed(1.25);
      expect(controller.getState().speed).toBe(1.25);
      expect(controller.getState().status).toBe('playing');
      expect(synth.spokenUtterances.at(-1)?.rate).toBe(1.25);
      expect(synth.spokenUtterances.at(-1)?.text).toBe(
        sampleScript.segments[2].textKo,
      );

      // Stop resets to idle and segment 0
      controller.stop();
      expect(controller.getState().status).toBe('idle');
      expect(controller.getState().activeSegmentIndex).toBe(0);

      controller.destroy();
    });

    it('handles synthesis errors gracefully and falls back cleanly when unsupported', () => {
      const synth = createMockSpeechSynthesis();
      const controller = createKoreanVoiceController({
        script: sampleScript,
        env: {
          speechSynthesis: synth as unknown as SpeechSynthesis,
          SpeechSynthesisUtterance:
            MockSpeechSynthesisUtterance as unknown as typeof SpeechSynthesisUtterance,
        },
      });

      controller.play();
      const activeUtterance = synth.spokenUtterances.at(-1)!;

      // Interrupted/canceled errors should be ignored
      activeUtterance.onerror?.call(
        activeUtterance as unknown as SpeechSynthesisUtterance,
        { error: 'interrupted' } as SpeechSynthesisErrorEvent,
      );
      expect(controller.getState().status).toBe('playing');

      // Real synthesis error transitions to 'error' with Korean guidance
      activeUtterance.onerror?.call(
        activeUtterance as unknown as SpeechSynthesisUtterance,
        { error: 'synthesis-failed' } as SpeechSynthesisErrorEvent,
      );
      expect(controller.getState().status).toBe('error');
      expect(controller.getState().errorMessageKo).toContain('한국어 전체 대본');

      controller.destroy();

      // Unsupported environment test
      const unsupportedController = createKoreanVoiceController({
        script: sampleScript,
        env: {
          speechSynthesis: null,
          SpeechSynthesisUtterance: null,
        },
      });
      expect(unsupportedController.getState().status).toBe('unsupported');
      expect(unsupportedController.play()).toBe(false);
      expect(unsupportedController.getState().status).toBe('unsupported');
      unsupportedController.destroy();
    });

    it('coordinates across movements to stop previous movement video and voice immediately on switch', () => {
      const synth1 = createMockSpeechSynthesis();
      const synth2 = createMockSpeechSynthesis();
      const ex1 = INITIAL_EXERCISES[0];
      const ex2 = INITIAL_EXERCISES[1];

      const stopVideo1 = vi.fn();
      const stopVideo2 = vi.fn();

      movementMediaSessionCoordinator.registerActiveSession(ex1.id, {
        stopVideo: stopVideo1,
      });
      movementMediaSessionCoordinator.registerActiveSession(ex2.id, {
        stopVideo: stopVideo2,
      });

      const controller1 = createKoreanVoiceController({
        script: buildKoreanVoiceScript(ex1),
        env: {
          speechSynthesis: synth1 as unknown as SpeechSynthesis,
          SpeechSynthesisUtterance:
            MockSpeechSynthesisUtterance as unknown as typeof SpeechSynthesisUtterance,
        },
      });

      const controller2 = createKoreanVoiceController({
        script: buildKoreanVoiceScript(ex2),
        env: {
          speechSynthesis: synth2 as unknown as SpeechSynthesis,
          SpeechSynthesisUtterance:
            MockSpeechSynthesisUtterance as unknown as typeof SpeechSynthesisUtterance,
        },
      });

      // Start movement 1 voice (also notifies coordinator that ex1 is active)
      controller1.play();
      expect(controller1.getState().status).toBe('playing');
      expect(movementMediaSessionCoordinator.getActiveExerciseId()).toBe(ex1.id);
      stopVideo1.mockClear();
      stopVideo2.mockClear();

      // Start movement 2 voice -> must immediately stop movement 1 video and voice!
      controller2.play();
      expect(stopVideo1).toHaveBeenCalledTimes(1);
      expect(stopVideo2).not.toHaveBeenCalled();
      expect(controller1.getState().status).toBe('idle');
      expect(controller2.getState().status).toBe('playing');
      expect(movementMediaSessionCoordinator.getActiveExerciseId()).toBe(ex2.id);

      // Switching back to movement 1 via notifyMovementActivated stops movement 2 video & voice
      movementMediaSessionCoordinator.notifyMovementActivated(ex1.id);
      expect(stopVideo2).toHaveBeenCalledTimes(1);
      expect(controller2.getState().status).toBe('idle');

      // stopAllActiveMedia stops everything and clears activeExerciseId
      controller1.play();
      stopVideo1.mockClear();
      movementMediaSessionCoordinator.stopAllActiveMedia('전체 정지');
      expect(stopVideo1).toHaveBeenCalledTimes(1);
      expect(controller1.getState().status).toBe('idle');
      expect(movementMediaSessionCoordinator.getActiveExerciseId()).toBeNull();

      controller1.destroy();
      controller2.destroy();
    });

    it('supports section-specific play and refreshes capability on async voiceschanged', () => {
      const synth = createMockSpeechSynthesis({
        voices: [],
        keepSpeakingOnPause: true,
      });

      const controller = createKoreanVoiceController({
        script: sampleScript,
        initialSpeed: 0.9,
        env: {
          speechSynthesis: synth as unknown as SpeechSynthesis,
          SpeechSynthesisUtterance:
            MockSpeechSynthesisUtterance as unknown as typeof SpeechSynthesisUtterance,
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)',
        },
      });

      expect(controller.getState().capability.koreanVoiceStatus).toBe(
        'os-default-ko-fallback',
      );
      expect(controller.getState().speed).toBe(0.9);

      // Async voiceschanged populates local Korean voice on iOS
      synth.setVoices([
        createMockVoice({ name: 'Yuna', lang: 'ko-KR', localService: true }),
      ]);
      expect(controller.getState().capability.koreanVoiceStatus).toBe(
        'korean-local-voice',
      );
      expect(controller.getState().capability.selectedVoiceName).toBe('Yuna');

      // Play single section ('breath')
      controller.play('breath');
      expect(controller.getState().activeSection).toBe('breath');
      expect(controller.getState().activeSegmentIndex).toBe(2);

      // Native pause and resume when synth preserves speaking/paused flags
      controller.pause();
      expect(controller.getState().status).toBe('paused');
      expect(controller.resume()).toBe(true);
      expect(controller.getState().status).toBe('playing');

      const breathUtterance = synth.spokenUtterances.at(-1)!;
      breathUtterance.onend?.call(
        breathUtterance as unknown as SpeechSynthesisUtterance,
        {} as SpeechSynthesisEvent,
      );
      expect(controller.getState().status).toBe('completed');

      controller.destroy();
    });
  });
});
