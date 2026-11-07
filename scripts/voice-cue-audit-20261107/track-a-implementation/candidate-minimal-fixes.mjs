/**
 * Track A — Pre-Integration Candidate Minimal Fixes for Voice Guidance Lifecycle
 *
 * IMPORTANT BOUNDARY:
 * - Existing production files under `src/**` are strictly READ-ONLY.
 * - This module provides the isolated pre-integration candidate implementations
 *   corresponding to the proposed minimal patches (F-01, F-02, F-03, F-04) so that
 *   both the current read-only behavior and the candidate fix behavior can be
 *   deterministically verified side-by-side without modifying `src/**`.
 */

import '../shared/ts-loader-hooks.mjs';

const {
  buildKoreanVoiceScript,
  inspectMobileAndBrowserTtsSupport,
  movementMediaSessionCoordinator,
  selectBestKoreanVoice,
} = await import('../../../src/utils/koreanVoiceNarration.ts');
const { KOREAN_VOICE_SPEED_OPTIONS } = await import(
  '../../../src/types/movementMediaGuidance.ts'
);

const durationText = (seconds) => {
  const value = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(value / 60);
  const remainder = value % 60;
  return (
    [minutes ? `${minutes}분` : '', remainder ? `${remainder}초` : ''].filter(Boolean).join(' ') ||
    '0초'
  );
};

/**
 * Candidate minimal fix for `src/models/ClassVoiceController.ts` (Addresses F-01 and F-02):
 * - F-01: Calls `this.cancel()` when `newVisit` is true even if the new step is running and
 *   produces empty `say([])` (e.g. moving from a breath-cue step into a rest/unreviewed step
 *   when only `breath` preference is enabled).
 * - F-02:
 *   (a) When `title` or `breath` is edited on the current step (`previous.stepKey === snapshot.stepKey`),
 *       cancels speech and marks `this.announced = true` (when `snapshot.running` is true) so the
 *       next timer tick does not speak the unreviewed/edited text anyway.
 *   (b) When `this.announced` is already true and the tab is hidden (`!snapshot.visible`), keeps
 *       `this.spokenPhase` and `this.warned` synchronized so returning to the tab does not fire
 *       a stale phase announcement.
 */
export class CandidateClassVoiceController {
  enabled = false;
  previous = null;
  announced = false;
  spokenPhase = '';
  warned = false;
  ownsSpeech = false;
  preferences = { movement: true, breath: true, time: true };
  port;

  constructor(port) {
    this.port = port;
  }

  cancel() {
    if (this.ownsSpeech) this.port.cancel();
    this.ownsSpeech = false;
  }

  setEnabled(enabled, snapshot) {
    this.enabled = enabled;
    this.cancel();
    if (enabled) {
      this.announced = false;
      this.spokenPhase = '';
    }
    this.update(snapshot);
  }

  setPreferences(preferences) {
    this.preferences = preferences;
    this.cancel();
  }

  say(parts) {
    const text = parts
      .map((part) => part.trim())
      .filter(Boolean)
      .join(' ');
    if (!text) return;
    this.cancel();
    this.ownsSpeech = true;
    this.port.speak(text);
  }

  update(snapshot) {
    const previous = this.previous;
    this.previous = snapshot;
    const newVisit =
      !previous ||
      previous.stepKey !== snapshot.stepKey ||
      (previous.remainingSec === 0 && snapshot.remainingSec > 0);
    if (newVisit) {
      // [F-01 Fix]: Always cancel any speech from a previous step/visit on step transition.
      this.cancel();
      this.announced = false;
      this.spokenPhase = '';
      this.warned = false;
    } else if (snapshot.remainingSec > previous.remainingSec + 10) {
      this.warned = false;
    }

    // [F-02a Fix]: Do not finish speaking a note that changed or lost its review while playing,
    // and do not allow the next tick on the same step to announce the edited content as new.
    if (
      previous &&
      previous.stepKey === snapshot.stepKey &&
      (previous.title !== snapshot.title || previous.breath !== snapshot.breath)
    ) {
      this.cancel();
      if (snapshot.running) {
        this.announced = true;
        if (snapshot.remainingSec <= 10) this.warned = true;
      }
      this.spokenPhase = snapshot.phase;
      return;
    }

    if (!this.enabled || !snapshot.eligible || !snapshot.visible) {
      // [F-02b Fix]: If already announced on this step while hidden, track phase & 10s threshold
      // silently so tab restoration does not replay a stale phase transition.
      if (this.enabled && snapshot.eligible && !snapshot.visible && snapshot.running && this.announced) {
        this.spokenPhase = snapshot.phase;
        if (snapshot.remainingSec <= 10) this.warned = true;
      }
      this.cancel();
      return;
    }

    if (!snapshot.running) {
      if (previous?.running || newVisit) this.cancel();
      if (
        previous?.running &&
        previous.visible &&
        !newVisit &&
        snapshot.remainingSec === 0 &&
        this.preferences.time
      ) {
        this.say([
          snapshot.nextTitle
            ? `계획 시간이 끝났습니다.${this.preferences.movement ? ` 다음은 ${snapshot.nextTitle}입니다.` : ''}`
            : '수업 계획 시간이 끝났습니다.',
        ]);
      }
      return;
    }

    if (!this.announced) {
      this.announced = true;
      this.spokenPhase = snapshot.phase;
      this.warned = snapshot.remainingSec <= 10;
      this.say([
        this.preferences.movement ? `${snapshot.title}. ${snapshot.phase}.` : '',
        this.preferences.time ? `남은 시간 ${durationText(snapshot.remainingSec)}.` : '',
        this.preferences.breath && snapshot.breath ? `검토한 호흡 메모. ${snapshot.breath}` : '',
      ]);
      return;
    }

    const phaseChanged = this.spokenPhase !== snapshot.phase;
    this.spokenPhase = snapshot.phase;
    const warnNow =
      !this.warned &&
      !!previous?.running &&
      previous.visible &&
      previous.remainingSec > 10 &&
      snapshot.remainingSec > 0 &&
      snapshot.remainingSec <= 10;
    if (snapshot.remainingSec <= 10) this.warned = true;
    this.say([
      phaseChanged && this.preferences.movement ? `${snapshot.phase}.` : '',
      warnNow && this.preferences.time
        ? `${durationText(snapshot.remainingSec)} 남았습니다.${this.preferences.movement && snapshot.nextTitle ? ` 다음은 ${snapshot.nextTitle}입니다.` : ''}`
        : '',
    ]);
  }

  destroy() {
    this.enabled = false;
    this.cancel();
  }
}

/**
 * Candidate minimal fix for `src/hooks/useClassVoiceGuidance.ts` (Addresses F-03):
 * - Guards against `window.speechSynthesis === undefined / null`, missing `getVoices`, or missing `addEventListener`.
 * - Uses `selectBestKoreanVoice` (`ko-KR` prioritized before generic `ko`) and re-verifies `synth.getVoices()`
 *   inside `speak()` so silent local voice disconnection fails closed without calling `synth.speak()`.
 * - Uses synchronous refs (`enabledRef`, `preferencesRef`) so rapid synchronous gesture calls
 *   (`toggleEnabled()`, `changePreference()`) never read stale closure values.
 */
export function createCandidateClassVoiceGuidanceHost({
  initialSnapshot,
  win = globalThis.window ?? globalThis,
  doc = globalThis.document ?? { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} },
}) {
  let enabled = false;
  let available = false;
  let error = '';
  let preferences = { movement: true, breath: true, time: true };
  let latestSnapshot = { ...initialSnapshot };
  let voice = undefined;
  let engine = null;
  let generation = 0;
  let cleanupFn = null;

  const getSnapshot = () => ({
    ...latestSnapshot,
    visible: doc.visibilityState !== 'hidden',
  });

  const readLocalKoreanVoice = (synth) => {
    try {
      const voices = typeof synth?.getVoices === 'function' ? synth.getVoices() : [];
      return selectBestKoreanVoice(Array.isArray(voices) ? voices : []) ?? undefined;
    } catch {
      return undefined;
    }
  };

  const mountEffect = () => {
    const synth = win?.speechSynthesis;
    const UtteranceCtor = win?.SpeechSynthesisUtterance;
    if (
      !synth ||
      typeof synth.speak !== 'function' ||
      typeof synth.cancel !== 'function' ||
      typeof UtteranceCtor !== 'function'
    ) {
      available = false;
      enabled = false;
      return () => {};
    }

    const controller = new CandidateClassVoiceController({
      cancel: () => {
        generation += 1;
        try {
          synth.cancel();
        } catch {
          // Ignore platform cancel errors
        }
      },
      speak: (text) => {
        // [F-03 Fix]: Re-verify local Korean voice from getVoices() before every speak() call.
        const currentLocalVoice = readLocalKoreanVoice(synth);
        voice = currentLocalVoice;
        if (!currentLocalVoice?.localService) {
          available = false;
          enabled = false;
          controller.setEnabled(false, getSnapshot());
          return;
        }
        const currentGeneration = ++generation;
        const utterance = new UtteranceCtor(text);
        utterance.voice = currentLocalVoice;
        utterance.lang = currentLocalVoice.lang;
        utterance.rate = 1;
        utterance.onerror = (event) => {
          if (
            currentGeneration !== generation ||
            event?.error === 'canceled' ||
            event?.error === 'interrupted'
          ) {
            return;
          }
          enabled = false;
          controller.setEnabled(false, getSnapshot());
          error = '음성을 재생하지 못했어요. 기기 음량과 한국어 음성을 확인한 뒤 다시 켜 주세요.';
        };
        try {
          synth.speak(utterance);
        } catch {
          enabled = false;
          controller.setEnabled(false, getSnapshot());
          error = '음성을 재생하지 못했어요. 기기 음량과 한국어 음성을 확인한 뒤 다시 켜 주세요.';
        }
      },
    });

    engine = controller;

    const loadVoices = () => {
      voice = readLocalKoreanVoice(synth);
      available = Boolean(voice);
      if (!voice) {
        enabled = false;
        controller.setEnabled(false, getSnapshot());
      }
    };

    const visibility = () => controller.update(getSnapshot());
    const pageHide = () => controller.cancel();

    loadVoices();
    if (typeof synth.addEventListener === 'function') {
      synth.addEventListener('voiceschanged', loadVoices);
    }
    if (typeof doc.addEventListener === 'function') {
      doc.addEventListener('visibilitychange', visibility);
    }
    if (typeof win.addEventListener === 'function') {
      win.addEventListener('pagehide', pageHide);
    }

    controller.update(getSnapshot());

    return () => {
      controller.destroy();
      if (engine === controller) {
        engine = null;
      }
      if (typeof synth.removeEventListener === 'function') {
        synth.removeEventListener('voiceschanged', loadVoices);
      }
      if (typeof doc.removeEventListener === 'function') {
        doc.removeEventListener('visibilitychange', visibility);
      }
      if (typeof win.removeEventListener === 'function') {
        win.removeEventListener('pagehide', pageHide);
      }
    };
  };

  return {
    mount() {
      cleanupFn = mountEffect();
    },
    strictModeMount() {
      const firstCleanup = mountEffect();
      firstCleanup();
      cleanupFn = mountEffect();
    },
    unmount() {
      cleanupFn?.();
      cleanupFn = null;
    },
    updateSnapshot(nextSnapshot) {
      latestSnapshot = { ...latestSnapshot, ...nextSnapshot };
      engine?.update(getSnapshot());
    },
    toggleEnabled() {
      if (!available) return;
      error = '';
      enabled = !enabled;
      engine?.setEnabled(enabled, getSnapshot());
    },
    stop() {
      enabled = false;
      engine?.setEnabled(false, getSnapshot());
    },
    changePreference(key, checked) {
      preferences = { ...preferences, [key]: checked };
      engine?.setPreferences(preferences);
    },
    start(remainingSec, phase) {
      latestSnapshot = { ...latestSnapshot, running: true, remainingSec, phase };
      engine?.update(getSnapshot());
    },
    pause() {
      engine?.cancel();
      latestSnapshot = { ...latestSnapshot, running: false };
      engine?.update(getSnapshot());
    },
    getState() {
      return {
        enabled,
        available,
        error,
        preferences: { ...preferences },
      };
    },
  };
}

function normalizeSpeed(speed) {
  if (typeof speed === 'number' && KOREAN_VOICE_SPEED_OPTIONS.includes(speed)) {
    return speed;
  }
  return 1;
}

/**
 * Candidate minimal fix for `src/utils/koreanVoiceNarration.ts` & `MovementMediaGuidancePanel.tsx` (Addresses F-04):
 * - Tracks `ownsSpeech` so `stop()` and `destroy()` only call `synth.cancel()` when this controller
 *   actually initiated speech (`ownsSpeech === true`), preventing idle unmount / StrictMode cleanup
 *   from cancelling unrelated speech (such as `LiveStageView`).
 * - Tracks `pausedAtSpeed` and re-checks `inspectMobileAndBrowserTtsSupport(env)` inside `resume()`
 *   so that:
 *   (a) if the local Korean voice disappeared while paused without firing `voiceschanged`, `resume()`
 *       transitions cleanly to `'unsupported'` instead of calling `synth.resume()`;
 *   (b) if `setSpeed()` was called while paused, `resume()` re-synthesizes the active segment at the
 *       new `state.speed` instead of resuming the stale-rate utterance.
 * - Accepts `active` flag (default `true`) and only calls `notifyMovementActivated` when `active === true`.
 */
export function createCandidateKoreanVoiceController(options) {
  const { script, onStateChange, env, active = true } = options;
  let capability = inspectMobileAndBrowserTtsSupport(env);
  let state = {
    exerciseId: script.exerciseId,
    status: capability.canAttemptSpeech ? 'idle' : 'unsupported',
    speed: normalizeSpeed(options.initialSpeed),
    activeSegmentIndex: 0,
    activeSection: 'all',
    errorMessageKo: capability.canAttemptSpeech ? null : capability.detailNoteKo,
    announcementKo: capability.canAttemptSpeech
      ? '한국어 음성 안내 대기 중 (버튼을 눌러 재생)'
      : '음성 합성 미지원 환경 — 화면의 전체 한국어 대본을 확인하세요.',
    capability,
  };

  let playbackRunId = 0;
  let isInternalCancel = false;
  let ownsSpeech = false;
  let pausedAtSpeed = state.speed;
  let currentQueueIndices = script.segments.map((_, index) => index);
  let destroyed = false;

  const resolveSynth = () => env?.speechSynthesis ?? globalThis.window?.speechSynthesis ?? null;
  const resolveUtterance = () =>
    env?.SpeechSynthesisUtterance ?? globalThis.window?.SpeechSynthesisUtterance ?? null;

  function emitState(patch) {
    state = { ...state, ...patch };
    onStateChange?.(state);
  }

  function cancelSpeechSafely() {
    if (!ownsSpeech) {
      return;
    }
    ownsSpeech = false;
    const synth = resolveSynth();
    if (!synth) return;
    isInternalCancel = true;
    try {
      synth.cancel();
    } catch {
      // Ignore browser cancel errors
    } finally {
      isInternalCancel = false;
    }
  }

  function speakQueueFromPosition(queuePos, runId) {
    if (destroyed || runId !== playbackRunId) {
      return false;
    }
    const synth = resolveSynth();
    const UtteranceCtor = resolveUtterance();
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
      ownsSpeech = false;
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
      ownsSpeech = false;
      emitState({
        status: 'completed',
        errorMessageKo: null,
        announcementKo: `${script.exerciseNameKo} 한국어 음성 안내 재생이 완료되었습니다.`,
      });
      return true;
    }

    let selectedVoice = null;
    try {
      selectedVoice = selectBestKoreanVoice(synth.getVoices?.() ?? []);
    } catch {
      selectedVoice = null;
    }
    if (!selectedVoice) {
      ownsSpeech = false;
      capability = inspectMobileAndBrowserTtsSupport(env);
      emitState({
        capability,
        status: 'unsupported',
        errorMessageKo: capability.detailNoteKo,
        announcementKo: '기기 내장 한국어 음성을 확인할 수 없어 대본만 제공합니다.',
      });
      return false;
    }

    emitState({
      status: 'playing',
      activeSegmentIndex: segmentIndex,
      errorMessageKo: null,
      announcementKo: `${segment.labelKo} 구간 한국어 음성 안내 재생 중 (${state.speed}배속)`,
    });

    try {
      const utterance = new UtteranceCtor(segment.textKo);
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
      utterance.rate = state.speed;
      utterance.pitch = 1;

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

      utterance.onerror = (event) => {
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
          announcementKo: '한국어 음성 재생 오류 발생 — 아래 한국어 텍스트 대본을 확인하세요.',
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

  function buildQueueForSection(section) {
    if (section === 'all') {
      return script.segments.map((_, index) => index);
    }
    const matching = script.segments
      .filter((segment) => segment.section === section)
      .map((segment) => segment.index);
    return matching.length > 0 ? matching : script.segments.map((_, index) => index);
  }

  const unregisterCoordinator = movementMediaSessionCoordinator.registerActiveSession(
    script.exerciseId,
    {
      stopVoice: () => {
        controller.stop('다른 동작이 선택되어 이전 한국어 음성 안내를 자동으로 정지했습니다.');
      },
    },
  );

  // [F-04 Fix]: Only notify coordinator on creation if this panel/controller is active.
  if (active) {
    movementMediaSessionCoordinator.notifyMovementActivated(script.exerciseId);
  }

  const synthForListener = resolveSynth();
  const handleVoicesChanged = () => {
    if (!destroyed) {
      controller.refreshCapability();
    }
  };
  try {
    if (synthForListener && typeof synthForListener.addEventListener === 'function') {
      synthForListener.addEventListener('voiceschanged', handleVoicesChanged);
    }
  } catch {
    // Ignore
  }

  const controller = {
    getState() {
      return state;
    },

    play(section = 'all') {
      if (destroyed) return false;
      movementMediaSessionCoordinator.notifyMovementActivated(script.exerciseId);
      capability = inspectMobileAndBrowserTtsSupport(env);
      if (!capability.canAttemptSpeech) {
        emitState({
          capability,
          status: 'unsupported',
          activeSection: section,
          errorMessageKo: capability.detailNoteKo,
          announcementKo: capability.summaryLabelKo,
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

    pause() {
      if (destroyed || state.status !== 'playing') return;
      pausedAtSpeed = state.speed;
      const synth = resolveSynth();
      try {
        synth?.pause?.();
      } catch {
        // Ignore mobile pause quirks
      }
      emitState({
        status: 'paused',
        announcementKo: `${
          script.segments[state.activeSegmentIndex]?.labelKo ?? '현재'
        } 구간에서 한국어 음성 안내가 일시정지되었습니다.`,
      });
    },

    resume() {
      if (destroyed || state.status !== 'paused') return false;
      const synth = resolveSynth();
      // [F-04 Fix]: Re-inspect capability before resuming in case local voice disappeared while paused.
      capability = inspectMobileAndBrowserTtsSupport(env);
      if (!synth || !capability.canAttemptSpeech) {
        cancelSpeechSafely();
        emitState({
          capability,
          status: 'unsupported',
          errorMessageKo: capability.detailNoteKo,
          announcementKo: capability.summaryLabelKo,
        });
        return false;
      }

      movementMediaSessionCoordinator.notifyMovementActivated(script.exerciseId);

      const speedChangedWhilePaused = pausedAtSpeed !== state.speed;
      if (!speedChangedWhilePaused) {
        try {
          synth.resume?.();
        } catch {
          // Fall back to segment recovery
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

      // Segment recovery (or speed changed while paused): re-synthesize from activeSegmentIndex
      playbackRunId += 1;
      const runId = playbackRunId;
      cancelSpeechSafely();
      const resumePosInQueue = currentQueueIndices.indexOf(state.activeSegmentIndex);
      if (resumePosInQueue >= 0) {
        return speakQueueFromPosition(resumePosInQueue, runId);
      }
      currentQueueIndices = script.segments
        .slice(state.activeSegmentIndex)
        .map((segment) => segment.index);
      return speakQueueFromPosition(0, runId);
    },

    stop(reasonKo) {
      if (destroyed) return;
      playbackRunId += 1;
      cancelSpeechSafely();
      const nextStatus = capability.canAttemptSpeech ? 'idle' : 'unsupported';
      emitState({
        status: nextStatus,
        activeSegmentIndex: 0,
        errorMessageKo: capability.canAttemptSpeech ? null : state.errorMessageKo,
        announcementKo: reasonKo ?? '한국어 음성 안내가 정지되었습니다.',
      });
    },

    setSpeed(speed) {
      if (destroyed) return;
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

    speakSegment(segmentIndex) {
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
          errorMessageKo: capability.detailNoteKo,
          announcementKo: capability.summaryLabelKo,
        });
        return false;
      }
      playbackRunId += 1;
      const runId = playbackRunId;
      cancelSpeechSafely();
      const targetSegment = script.segments[segmentIndex];
      currentQueueIndices = script.segments.slice(segmentIndex).map((segment) => segment.index);
      emitState({
        capability,
        activeSection: targetSegment.section,
        activeSegmentIndex: segmentIndex,
        errorMessageKo: null,
      });
      return speakQueueFromPosition(0, runId);
    },

    refreshCapability() {
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

    destroy() {
      if (destroyed) return;
      controller.stop('한국어 음성 컨트롤러가 정리되었습니다.');
      destroyed = true;
      unregisterCoordinator();
      try {
        if (synthForListener && typeof synthForListener.removeEventListener === 'function') {
          synthForListener.removeEventListener('voiceschanged', handleVoicesChanged);
        }
      } catch {
        // Ignore
      }
    },
  };

  return controller;
}

export { buildKoreanVoiceScript };
