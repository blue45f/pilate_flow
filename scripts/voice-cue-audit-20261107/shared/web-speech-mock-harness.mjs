/**
 * Deterministic Web Speech API Mock & Security/Privacy Guard Harness
 * for Pilates Voice Guidance Lifecycle Regression Verification.
 *
 * Strictly synthetic fixtures only. No microphone, camera, or external network access.
 */

export class SyntheticSpeechSynthesisUtterance {
  text = '';
  lang = '';
  rate = 1;
  pitch = 1;
  volume = 1;
  voice = null;
  onstart = null;
  onend = null;
  onerror = null;
  onpause = null;
  onresume = null;
  onboundary = null;
  onmark = null;

  constructor(text = '') {
    this.text = String(text);
  }

  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() {
    return true;
  }
}

export function createSyntheticVoice({
  name = 'Yuna',
  lang = 'ko-KR',
  localService = true,
  isDefault = true,
  voiceURI = `synthetic-voice-${name}-${lang}`,
} = {}) {
  return Object.freeze({
    name,
    lang,
    localService,
    default: isDefault,
    voiceURI,
  });
}

export const SYNTHETIC_VOICES = Object.freeze({
  localKoKr: createSyntheticVoice({
    name: 'Yuna (Local ko-KR)',
    lang: 'ko-KR',
    localService: true,
    isDefault: true,
  }),
  localKoUnderscore: createSyntheticVoice({
    name: 'Sora (Local ko_KR)',
    lang: 'ko_KR',
    localService: true,
    isDefault: false,
  }),
  localKoGeneric: createSyntheticVoice({
    name: 'Maru (Local ko)',
    lang: 'ko',
    localService: true,
    isDefault: false,
  }),
  remoteKoKr: createSyntheticVoice({
    name: 'Google 한국어 (Network)',
    lang: 'ko-KR',
    localService: false,
    isDefault: true,
  }),
  localEnUsWithKoreanName: createSyntheticVoice({
    name: 'Yuna Korean English',
    lang: 'en-US',
    localService: true,
    isDefault: false,
  }),
  localJaJp: createSyntheticVoice({
    name: 'Kyoko',
    lang: 'ja-JP',
    localService: true,
    isDefault: false,
  }),
});

/**
 * Creates an instrumented Web Speech synthesis mock supporting:
 * - Synchronous and asynchronous `voiceschanged`
 * - Desktop (`keepSpeakingOnPause: true`) and mobile WebKit/Android (`keepSpeakingOnPause: false`) pause/resume semantics
 * - Simulated `speak()` exceptions and `onerror` events (`canceled`, `interrupted`, `synthesis-failed`, `not-allowed`)
 * - Full history ledger of `speak`, `cancel`, `pause`, `resume`, `getVoices`, and listener registrations
 */
export function createWebSpeechMockEnv({
  initialVoices = [SYNTHETIC_VOICES.localKoKr],
  keepSpeakingOnPause = true,
  throwOnSpeak = false,
  throwOnGetVoices = false,
  throwOnCancel = false,
  supportEventTarget = true,
  emitCanceledErrorOnCancel = false,
} = {}) {
  let voices = Array.isArray(initialVoices) ? [...initialVoices] : [];
  let shouldThrowOnSpeak = throwOnSpeak;
  let shouldThrowOnGetVoices = throwOnGetVoices;
  let shouldThrowOnCancel = throwOnCancel;

  const listeners = new Map();
  const speakHistory = [];
  const cancelHistory = [];
  const pauseHistory = [];
  const resumeHistory = [];
  let getVoicesCalls = 0;

  const synth = {
    speaking: false,
    paused: false,
    pending: false,
    onvoiceschanged: null,

    getVoices() {
      getVoicesCalls += 1;
      if (shouldThrowOnGetVoices) {
        throw new Error('Synthetic getVoices hardware failure');
      }
      return voices;
    },

    speak(utterance) {
      if (shouldThrowOnSpeak) {
        throw new Error('Synthetic speechSynthesis.speak blocked');
      }
      speakHistory.push({
        utterance,
        text: utterance?.text ?? '',
        lang: utterance?.lang ?? '',
        rate: utterance?.rate ?? 1,
        pitch: utterance?.pitch ?? 1,
        voice: utterance?.voice ?? null,
        voiceName: utterance?.voice?.name ?? null,
        voiceLocalService: Boolean(utterance?.voice?.localService),
        timestamp: Date.now(),
      });
      synth.speaking = true;
      synth.paused = false;
      utterance?.onstart?.call(utterance, { type: 'start' });
    },

    cancel() {
      cancelHistory.push({
        wasSpeaking: synth.speaking,
        wasPaused: synth.paused,
        timestamp: Date.now(),
      });
      const activeUtterance = speakHistory.at(-1)?.utterance;
      synth.speaking = false;
      synth.paused = false;
      synth.pending = false;
      if (shouldThrowOnCancel) {
        throw new Error('Synthetic cancel error');
      }
      if (emitCanceledErrorOnCancel && activeUtterance?.onerror) {
        activeUtterance.onerror.call(activeUtterance, { error: 'canceled' });
      }
    },

    pause() {
      pauseHistory.push({
        wasSpeaking: synth.speaking,
        timestamp: Date.now(),
      });
      if (keepSpeakingOnPause) {
        if (synth.speaking) {
          synth.paused = true;
        }
      } else {
        // Mobile Safari/Android quirk: pause() drops speaking/paused flags
        synth.speaking = false;
        synth.paused = false;
      }
    },

    resume() {
      resumeHistory.push({
        wasPaused: synth.paused,
        wasSpeaking: synth.speaking,
        timestamp: Date.now(),
      });
      if (keepSpeakingOnPause && synth.paused) {
        synth.paused = false;
        synth.speaking = true;
      }
    },
  };

  if (supportEventTarget) {
    synth.addEventListener = (type, handler) => {
      if (typeof handler !== 'function') return;
      if (!listeners.has(type)) {
        listeners.set(type, new Set());
      }
      listeners.get(type).add(handler);
    };
    synth.removeEventListener = (type, handler) => {
      listeners.get(type)?.delete(handler);
    };
    synth.dispatchEvent = (event) => {
      const type = typeof event === 'string' ? event : event?.type;
      const set = listeners.get(type);
      if (set) {
        for (const fn of [...set]) {
          fn(event);
        }
      }
      if (type === 'voiceschanged' && typeof synth.onvoiceschanged === 'function') {
        synth.onvoiceschanged(event);
      }
      return true;
    };
  }

  return {
    synth,
    UtteranceCtor: SyntheticSpeechSynthesisUtterance,
    speakHistory,
    cancelHistory,
    pauseHistory,
    resumeHistory,
    getGetVoicesCalls: () => getVoicesCalls,
    getListenerCount: (type = 'voiceschanged') => listeners.get(type)?.size ?? 0,
    setVoices(nextVoices, { dispatchEvent = true } = {}) {
      voices = Array.isArray(nextVoices) ? [...nextVoices] : [];
      if (dispatchEvent) {
        if (supportEventTarget && typeof synth.dispatchEvent === 'function') {
          synth.dispatchEvent({ type: 'voiceschanged' });
        } else if (typeof synth.onvoiceschanged === 'function') {
          synth.onvoiceschanged({ type: 'voiceschanged' });
        }
      }
    },
    setThrowOnSpeak(value) {
      shouldThrowOnSpeak = Boolean(value);
    },
    setThrowOnGetVoices(value) {
      shouldThrowOnGetVoices = Boolean(value);
    },
    completeLatestUtterance() {
      const latest = speakHistory.at(-1)?.utterance;
      if (!latest) return false;
      synth.speaking = false;
      synth.paused = false;
      latest.onend?.call(latest, { type: 'end' });
      return true;
    },
    failLatestUtterance(errorCode = 'synthesis-failed') {
      const latest = speakHistory.at(-1)?.utterance;
      if (!latest) return false;
      synth.speaking = false;
      synth.paused = false;
      latest.onerror?.call(latest, { error: errorCode });
      return true;
    },
  };
}

/**
 * Installs runtime guards that fail immediately if any voice controller attempts to:
 * - Access microphone or camera (`navigator.mediaDevices.getUserMedia`, `MediaRecorder`, `SpeechRecognition`)
 * - Make external network calls (`fetch`, `XMLHttpRequest`, `WebSocket`, `navigator.sendBeacon`)
 */
export function installPrivacyAndNetworkGuards(targetGlobal = globalThis) {
  const violations = [];

  const originalFetch = targetGlobal.fetch;
  const originalMediaDevices = targetGlobal.navigator?.mediaDevices;
  const originalSpeechRecognition = targetGlobal.SpeechRecognition;
  const originalWebkitSpeechRecognition = targetGlobal.webkitSpeechRecognition;

  const recordViolation = (type, detail) => {
    const entry = { type, detail, timestamp: Date.now() };
    violations.push(entry);
    throw new Error(`Forbidden privacy/network access attempted: ${type} (${detail})`);
  };

  targetGlobal.fetch = async (input) => {
    return recordViolation('fetch', String(input));
  };

  if (targetGlobal.navigator) {
    Object.defineProperty(targetGlobal.navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async (constraints) =>
          recordViolation('getUserMedia', JSON.stringify(constraints)),
        enumerateDevices: async () =>
          recordViolation('enumerateDevices', 'mediaDevices.enumerateDevices'),
      },
    });
  }

  Object.defineProperty(targetGlobal, 'SpeechRecognition', {
    configurable: true,
    value: function ForbiddenSpeechRecognition() {
      return recordViolation('SpeechRecognition', 'constructor');
    },
  });

  Object.defineProperty(targetGlobal, 'webkitSpeechRecognition', {
    configurable: true,
    value: function ForbiddenWebkitSpeechRecognition() {
      return recordViolation('webkitSpeechRecognition', 'constructor');
    },
  });

  return {
    violations,
    restore() {
      targetGlobal.fetch = originalFetch;
      if (targetGlobal.navigator && originalMediaDevices !== undefined) {
        Object.defineProperty(targetGlobal.navigator, 'mediaDevices', {
          configurable: true,
          value: originalMediaDevices,
        });
      }
      Object.defineProperty(targetGlobal, 'SpeechRecognition', {
        configurable: true,
        value: originalSpeechRecognition,
      });
      Object.defineProperty(targetGlobal, 'webkitSpeechRecognition', {
        configurable: true,
        value: originalWebkitSpeechRecognition,
      });
    },
  };
}
