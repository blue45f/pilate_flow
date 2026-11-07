import '../shared/ts-loader-hooks.mjs';
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

const { ClassVoiceController } = await import('../../../src/models/ClassVoiceController.ts');
const {
  KOREAN_VOICE_DISCLAIMER_KO,
  buildKoreanVoiceScript,
  createKoreanVoiceController,
  inspectMobileAndBrowserTtsSupport,
  movementMediaSessionCoordinator,
  selectBestKoreanVoice,
} = await import('../../../src/utils/koreanVoiceNarration.ts');
const {
  createMediaComplianceAudit,
  detectForbiddenPaidVoiceOrDownloadUrl,
  isPermittedEmbedUrl,
  isValidKoreanVoiceSpeed,
  validateSafeExternalReferenceUrl,
} = await import('../../../src/schemas/movementMediaGuidanceSchema.ts');
const { INITIAL_EXERCISES } = await import('../../../src/data/pilatesCatalog.ts');
import {
  SYNTHETIC_VOICES,
  createSyntheticVoice,
  createWebSpeechMockEnv,
  installPrivacyAndNetworkGuards,
} from '../shared/web-speech-mock-harness.mjs';
const {
  CandidateClassVoiceController,
  createCandidateClassVoiceGuidanceHost,
  createCandidateKoreanVoiceController,
} = await import('./candidate-minimal-fixes.mjs');

const BASE_CLASS_SNAPSHOT = Object.freeze({
  stepKey: 'step-warmup-1',
  title: '골반 컬',
  breath: '들이마시며 준비하고 내쉬며 척추를 분절합니다.',
  phase: '설명 · 세팅',
  remainingSec: 60,
  nextTitle: '헌드레드',
  running: false,
  eligible: true,
  visible: true,
});

function runningSnapshot(overrides = {}) {
  return {
    ...BASE_CLASS_SNAPSHOT,
    running: true,
    ...overrides,
  };
}

describe('Track A — Pilates Free Browser Voice Guidance Lifecycle Regression Suite', () => {
  beforeEach(() => {
    movementMediaSessionCoordinator.resetForTests();
  });

  describe('1. Language & Local-Only Voice Selection (ko-KR / ko_KR / ko / Non-Korean / Remote Rejection)', () => {
    it('prioritizes local ko-KR/ko_KR over generic local ko and strictly rejects remote or non-Korean voices', () => {
      const selectedExact = selectBestKoreanVoice([
        SYNTHETIC_VOICES.localEnUsWithKoreanName,
        SYNTHETIC_VOICES.remoteKoKr,
        SYNTHETIC_VOICES.localKoGeneric,
        SYNTHETIC_VOICES.localKoUnderscore,
      ]);
      assert.equal(selectedExact, SYNTHETIC_VOICES.localKoUnderscore);

      const selectedGeneric = selectBestKoreanVoice([
        SYNTHETIC_VOICES.localEnUsWithKoreanName,
        SYNTHETIC_VOICES.remoteKoKr,
        SYNTHETIC_VOICES.localKoGeneric,
      ]);
      assert.equal(selectedGeneric, SYNTHETIC_VOICES.localKoGeneric);

      assert.equal(
        selectBestKoreanVoice([
          SYNTHETIC_VOICES.localEnUsWithKoreanName,
          SYNTHETIC_VOICES.remoteKoKr,
          SYNTHETIC_VOICES.localJaJp,
        ]),
        null,
      );
      assert.equal(selectBestKoreanVoice([]), null);
    });

    it('never infers Korean locale from a Korean-sounding voice name when lang is non-Korean', () => {
      const deceptiveVoice = createSyntheticVoice({
        name: '한국어 Yuna Sora Korean TTS',
        lang: 'en-US',
        localService: true,
      });
      assert.equal(selectBestKoreanVoice([deceptiveVoice]), null);

      const env = createWebSpeechMockEnv({ initialVoices: [deceptiveVoice] });
      const report = inspectMobileAndBrowserTtsSupport({
        speechSynthesis: env.synth,
        SpeechSynthesisUtterance: env.UtteranceCtor,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)',
      });
      assert.equal(report.canAttemptSpeech, false);
      assert.equal(report.koreanVoiceStatus, 'no-local-korean-voice');
      assert.equal(report.isLocalFreeDeviceVoice, false);
    });
  });

  describe('2. Voice Unavailable, Async voiceschanged, & Playback Error Recovery', () => {
    it('fails closed when speechSynthesis or SpeechSynthesisUtterance is missing or voices are empty/remote', () => {
      const noEngineReport = inspectMobileAndBrowserTtsSupport({
        speechSynthesis: null,
        SpeechSynthesisUtterance: null,
        userAgent: 'Linux Headless',
      });
      assert.equal(noEngineReport.canAttemptSpeech, false);
      assert.equal(noEngineReport.koreanVoiceStatus, 'no-tts-engine');
      assert.equal(noEngineReport.pauseResumeStrategy, 'text-only-fallback');

      const remoteOnlyEnv = createWebSpeechMockEnv({
        initialVoices: [SYNTHETIC_VOICES.remoteKoKr],
      });
      const script = buildKoreanVoiceScript(INITIAL_EXERCISES[0]);
      const controller = createKoreanVoiceController({
        script,
        env: {
          speechSynthesis: remoteOnlyEnv.synth,
          SpeechSynthesisUtterance: remoteOnlyEnv.UtteranceCtor,
        },
      });
      assert.equal(controller.getState().status, 'unsupported');
      assert.equal(controller.play(), false);
      assert.equal(controller.speakSegment(0), false);
      assert.equal(remoteOnlyEnv.speakHistory.length, 0);
      controller.destroy();
    });

    it('transitions from unsupported to idle when async voiceschanged delivers a local Korean voice without auto-playing', () => {
      const env = createWebSpeechMockEnv({ initialVoices: [] });
      const script = buildKoreanVoiceScript(INITIAL_EXERCISES[0]);
      const controller = createKoreanVoiceController({
        script,
        env: {
          speechSynthesis: env.synth,
          SpeechSynthesisUtterance: env.UtteranceCtor,
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)',
        },
      });

      assert.equal(controller.getState().status, 'unsupported');
      env.setVoices([SYNTHETIC_VOICES.localKoKr], { dispatchEvent: true });
      assert.equal(controller.getState().status, 'idle');
      assert.equal(controller.getState().capability.koreanVoiceStatus, 'korean-local-voice');
      assert.equal(env.speakHistory.length, 0);

      assert.equal(controller.play('overview'), true);
      assert.equal(env.speakHistory.length, 1);
      assert.equal(env.speakHistory[0].voice, SYNTHETIC_VOICES.localKoKr);
      controller.destroy();
    });

    it('aborts active speech immediately if local Korean voice is removed mid-playback or between segments', () => {
      const env = createWebSpeechMockEnv({ initialVoices: [SYNTHETIC_VOICES.localKoKr] });
      const script = buildKoreanVoiceScript(INITIAL_EXERCISES[0]);
      const controller = createKoreanVoiceController({
        script,
        env: {
          speechSynthesis: env.synth,
          SpeechSynthesisUtterance: env.UtteranceCtor,
        },
      });

      assert.equal(controller.play('all'), true);
      assert.equal(env.speakHistory.length, 1);

      //Silent removal without voiceschanged before segment 1 starts:
      env.setVoices([SYNTHETIC_VOICES.remoteKoKr], { dispatchEvent: false });
      env.completeLatestUtterance();
      assert.equal(controller.getState().status, 'unsupported');
      assert.equal(env.speakHistory.length, 1);
      controller.destroy();
    });

    it('handles speak() exceptions and synthesis-failed onerror cleanly while ignoring canceled/interrupted', () => {
      const env = createWebSpeechMockEnv({ initialVoices: [SYNTHETIC_VOICES.localKoKr] });
      const script = buildKoreanVoiceScript(INITIAL_EXERCISES[0]);
      const controller = createKoreanVoiceController({
        script,
        env: {
          speechSynthesis: env.synth,
          SpeechSynthesisUtterance: env.UtteranceCtor,
        },
      });

      assert.equal(controller.play(), true);
      env.failLatestUtterance('canceled');
      assert.equal(controller.getState().status, 'playing');
      env.failLatestUtterance('interrupted');
      assert.equal(controller.getState().status, 'playing');

      env.failLatestUtterance('synthesis-failed');
      assert.equal(controller.getState().status, 'error');
      assert.match(controller.getState().errorMessageKo ?? '', /한국어 전체 대본/);

      env.setThrowOnSpeak(true);
      assert.equal(controller.play(), false);
      assert.equal(controller.getState().status, 'error');
      controller.destroy();
    });
  });

  describe('3. Duplicate speak() Prevention, Tick Deduplication, & Threshold Alerts', () => {
    it('deduplicates 250ms timer ticks, announces phase transitions once, and prevents stale 10s alerts', () => {
      const spoken = [];
      let cancelCalls = 0;
      const controller = new ClassVoiceController({
        speak: (text) => spoken.push(text),
        cancel: () => {
          cancelCalls += 1;
        },
      });

      // Silent before opt-in
      controller.update(runningSnapshot());
      assert.equal(spoken.length, 0);

      // Opt-in while running at 60s
      controller.setEnabled(true, runningSnapshot({ remainingSec: 60 }));
      assert.equal(spoken.length, 1);
      assert.match(spoken[0], /골반 컬\. 설명 · 세팅\. 남은 시간 1분\./);

      // 10 consecutive ticks in same phase > 10s -> 0 duplicate speak calls
      for (let sec = 59; sec >= 50; sec -= 1) {
        controller.update(runningSnapshot({ remainingSec: sec }));
      }
      assert.equal(spoken.length, 1);

      // Phase transition to '수행 · 왼쪽' -> cancels previous and speaks once
      controller.update(runningSnapshot({ phase: '수행 · 왼쪽', remainingSec: 45 }));
      controller.update(runningSnapshot({ phase: '수행 · 왼쪽', remainingSec: 44 }));
      assert.equal(spoken.length, 2);
      assert.equal(spoken[1], '수행 · 왼쪽.');
      assert.equal(cancelCalls, 1);

      // Crossing <= 10s threshold -> speaks warning once
      controller.update(runningSnapshot({ phase: '수행 · 오른쪽', remainingSec: 20 }));
      assert.equal(spoken.length, 3);
      controller.update(runningSnapshot({ phase: '수행 · 오른쪽', remainingSec: 9 }));
      controller.update(runningSnapshot({ phase: '수행 · 오른쪽', remainingSec: 8 }));
      assert.equal(spoken.length, 4);
      assert.equal(spoken[3], '9초 남았습니다. 다음은 헌드레드입니다.');

      // Adding 1 minute (+60s) rearms 10-second warning
      controller.update(runningSnapshot({ phase: '수행 · 오른쪽', remainingSec: 68 }));
      controller.update(runningSnapshot({ phase: '수행 · 오른쪽', remainingSec: 10 }));
      assert.equal(spoken.length, 5);
      assert.equal(spoken[4], '10초 남았습니다. 다음은 헌드레드입니다.');
    });

    it('never queues a stale 10s warning when voice guidance is enabled late (remainingSec <= 10)', () => {
      const spoken = [];
      const controller = new ClassVoiceController({
        speak: (text) => spoken.push(text),
        cancel: () => {},
      });

      controller.setEnabled(true, runningSnapshot({ remainingSec: 8 }));
      controller.update(runningSnapshot({ remainingSec: 7 }));
      controller.update(runningSnapshot({ remainingSec: 6 }));
      assert.equal(spoken.length, 1);
      assert.match(spoken[0], /남은 시간 8초\./);
    });
  });

  describe('4. Screen Transition, visibilitychange, pagehide, & Cross-Movement Cancellation', () => {
    it('cancels speech immediately when tab becomes hidden, on pagehide, or when stage becomes ineligible', () => {
      const env = createWebSpeechMockEnv({ initialVoices: [SYNTHETIC_VOICES.localKoKr] });
      let visibilityState = 'visible';
      const docListeners = new Map();
      const winListeners = new Map();

      const mockDoc = {
        get visibilityState() {
          return visibilityState;
        },
        addEventListener(type, fn) {
          docListeners.set(type, fn);
        },
        removeEventListener(type) {
          docListeners.delete(type);
        },
      };
      const mockWin = {
        speechSynthesis: env.synth,
        SpeechSynthesisUtterance: env.UtteranceCtor,
        addEventListener(type, fn) {
          winListeners.set(type, fn);
        },
        removeEventListener(type) {
          winListeners.delete(type);
        },
      };

      const host = createCandidateClassVoiceGuidanceHost({
        initialSnapshot: runningSnapshot(),
        win: mockWin,
        doc: mockDoc,
      });
      host.mount();
      host.toggleEnabled();
      assert.equal(env.speakHistory.length, 1);

      // Hide tab -> cancels immediately and ignores ticks while hidden
      visibilityState = 'hidden';
      docListeners.get('visibilitychange')?.();
      assert.ok(env.cancelHistory.length >= 1);
      host.updateSnapshot(runningSnapshot({ remainingSec: 9 }));
      assert.equal(env.speakHistory.length, 1);

      // Restore visibility and advance to next step -> speaks next step, then pagehide cancels
      visibilityState = 'visible';
      host.updateSnapshot(runningSnapshot({ stepKey: 'step-2', title: '롤업', remainingSec: 60 }));
      assert.equal(env.speakHistory.length, 2);
      const cancelsBeforePageHide = env.cancelHistory.length;
      winListeners.get('pagehide')?.();
      assert.ok(env.cancelHistory.length > cancelsBeforePageHide);

      host.unmount();
    });

    it('stops previous movement video and voice on A -> B -> A transition and never auto-plays on revisit', () => {
      const env = createWebSpeechMockEnv({ initialVoices: [SYNTHETIC_VOICES.localKoKr] });
      const exA = INITIAL_EXERCISES[0];
      const exB = INITIAL_EXERCISES[1];

      let videoAStopped = 0;
      let videoBStopped = 0;
      const unregA = movementMediaSessionCoordinator.registerActiveSession(exA.id, {
        stopVideo: () => {
          videoAStopped += 1;
        },
      });
      const unregB = movementMediaSessionCoordinator.registerActiveSession(exB.id, {
        stopVideo: () => {
          videoBStopped += 1;
        },
      });

      const ctrlA = createKoreanVoiceController({
        script: buildKoreanVoiceScript(exA),
        env: { speechSynthesis: env.synth, SpeechSynthesisUtterance: env.UtteranceCtor },
      });
      const ctrlB = createKoreanVoiceController({
        script: buildKoreanVoiceScript(exB),
        env: { speechSynthesis: env.synth, SpeechSynthesisUtterance: env.UtteranceCtor },
      });

      // Play A
      assert.equal(ctrlA.play('all'), true);
      assert.equal(ctrlA.getState().status, 'playing');
      assert.equal(env.speakHistory.length, 1);

      // Switch to B and play B -> A stops immediately
      assert.equal(ctrlB.play('all'), true);
      assert.equal(ctrlA.getState().status, 'idle');
      assert.equal(ctrlB.getState().status, 'playing');
      assert.ok(videoAStopped >= 1);
      assert.equal(env.speakHistory.length, 2);

      // Revisit A via notifyMovementActivated -> B stops immediately, A stays idle (no autoplay)
      movementMediaSessionCoordinator.notifyMovementActivated(exA.id);
      assert.equal(ctrlB.getState().status, 'idle');
      assert.equal(ctrlA.getState().status, 'idle');
      assert.ok(videoBStopped >= 1);
      assert.equal(env.speakHistory.length, 2);

      unregA();
      unregB();
      ctrlA.destroy();
      ctrlB.destroy();
    });
  });

  describe('5. Mute, Immediate Stop, Content Preferences,Pause/Resume, & Speed Adjustment', () => {
    it('supports pause without repeating already-spoken cue on resume and immediate stop in ClassVoiceController', () => {
      const spoken = [];
      let cancelCalls = 0;
      const controller = new ClassVoiceController({
        speak: (text) => spoken.push(text),
        cancel: () => {
          cancelCalls += 1;
        },
      });

      controller.setEnabled(true, runningSnapshot({ remainingSec: 60 }));
      assert.equal(spoken.length, 1);

      // Pause
      controller.update({ ...BASE_CLASS_SNAPSHOT, running: false, remainingSec: 52 });
      assert.equal(cancelCalls, 1);

      // Resume on same step & phase -> does NOT repeat initial cue
      controller.update(runningSnapshot({ remainingSec: 52 }));
      assert.equal(spoken.length, 1);

      // Disable (mute/stop) -> cancels and stays silent on next step
      controller.setEnabled(false, runningSnapshot({ remainingSec: 50 }));
      controller.update(runningSnapshot({ stepKey: 'step-2', remainingSec: 60 }));
      assert.equal(spoken.length, 1);
    });

    it('supports pause, mobile segment recovery resume, and speed changes in KoreanVoiceController', () => {
      const mobileEnv = createWebSpeechMockEnv({
        initialVoices: [SYNTHETIC_VOICES.localKoKr],
        keepSpeakingOnPause: false,
      });
      const script = buildKoreanVoiceScript(INITIAL_EXERCISES[0]);
      const controller = createKoreanVoiceController({
        script,
        env: {
          speechSynthesis: mobileEnv.synth,
          SpeechSynthesisUtterance: mobileEnv.UtteranceCtor,
          userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari/537.36',
        },
      });

      assert.equal(controller.speakSegment(3), true);
      assert.equal(controller.getState().activeSegmentIndex, 3);
      assert.equal(mobileEnv.speakHistory.length, 1);

      controller.pause();
      assert.equal(controller.getState().status, 'paused');

      // Mobile pause dropped synth.speaking -> resume recovers from segment 3
      assert.equal(controller.resume(), true);
      assert.equal(controller.getState().status, 'playing');
      assert.equal(controller.getState().activeSegmentIndex, 3);
      assert.equal(mobileEnv.speakHistory.length, 2);

      // Speed change while playing restarts segment 3 at new rate
      controller.setSpeed(1.25);
      assert.equal(controller.getState().speed, 1.25);
      assert.equal(mobileEnv.speakHistory.length, 3);
      assert.equal(mobileEnv.speakHistory.at(-1).rate, 1.25);

      controller.stop('사용자 정지');
      assert.equal(controller.getState().status, 'idle');
      controller.destroy();
    });
  });

  describe('6. Completed Class / Step Deadline Cancellation & Step Restart', () => {
    it('announces step/class completion once at remainingSec=0, preserves completion cue across idle rerenders, and restarts cleanly', () => {
      const spoken = [];
      let cancelCalls = 0;
      const controller = new ClassVoiceController({
        speak: (text) => spoken.push(text),
        cancel: () => {
          cancelCalls += 1;
        },
      });

      controller.setEnabled(true, runningSnapshot({ remainingSec: 60 }));
      assert.equal(spoken.length, 1);

      // Timer reaches 0 and stops running
      controller.update({ ...BASE_CLASS_SNAPSHOT, running: false, remainingSec: 0 });
      assert.equal(spoken.length, 2);
      assert.equal(spoken[1], '계획 시간이 끝났습니다. 다음은 헌드레드입니다.');
      assert.equal(cancelCalls, 1);

      // Idle rerenders at remainingSec=0 must NOT cancel or repeat the completion cue
      controller.update({ ...BASE_CLASS_SNAPSHOT, running: false, remainingSec: 0 });
      assert.equal(spoken.length, 2);
      assert.equal(cancelCalls, 1);

      // Restarting the completed step ('현재 동작 다시 시작') announces initial phase again
      controller.update(runningSnapshot({ remainingSec: 60, phase: '설명 · 세팅' }));
      assert.equal(spoken.length, 3);
      assert.match(spoken[2], /골반 컬\. 설명 · 세팅\. 남은 시간 1분\./);

      // Final step completion with no nextTitle
      controller.update({
        ...BASE_CLASS_SNAPSHOT,
        nextTitle: '',
        running: false,
        remainingSec: 0,
      });
      assert.equal(spoken.length, 4);
      assert.equal(spoken[3], '수업 계획 시간이 끝났습니다.');
    });
  });

  describe('7. React StrictMode Double-Mount Lifecycle & Candidate Fix Verification (F-01..F-04)', () => {
    it('verifies candidate fixes F-01..F-04 resolve reproduced edge cases while keeping StrictMode clean', () => {
      // [F-01 Candidate Fix]: newVisit to a silent step (e.g. rest step when only breath preference is on) cancels prior speech
      const spoken = [];
      let cancelCalls = 0;
      const candidateCtrl = new CandidateClassVoiceController({
        speak: (text) => spoken.push(text),
        cancel: () => {
          cancelCalls += 1;
        },
      });
      candidateCtrl.setPreferences({ movement: false, breath: true, time: false });
      candidateCtrl.setEnabled(true, runningSnapshot({ stepKey: 'step-1', breath: '호흡 메모' }));
      assert.equal(spoken.length, 1);
      assert.equal(cancelCalls, 0);

      // Transition to rest step (breath: '') -> candidate immediately cancels step-1 speech
      candidateCtrl.update(
        runningSnapshot({ stepKey: 'rest-1', title: '휴식', breath: '', phase: '휴식' }),
      );
      assert.equal(cancelCalls, 1);
      assert.equal(spoken.length, 1);

      // [F-02 Candidate Fix]: Content edit on same step before announcement does not speak edited note on next tick
      const candidateCtrl2 = new CandidateClassVoiceController({
        speak: (text) => spoken.push(text),
        cancel: () => {},
      });
      candidateCtrl2.setEnabled(true, { ...BASE_CLASS_SNAPSHOT, running: false });
      //Simultaneous start + unreviewed breath edit on same stepKey:
      candidateCtrl2.update(runningSnapshot({ breath: '수정된 비공개 호흡 메모' }));
      candidateCtrl2.update(runningSnapshot({ breath: '수정된 비공개 호흡 메모', remainingSec: 59 }));
      assert.equal(spoken.length, 1); // Did NOT speak the edited note!

      // [F-03 Candidate Fix]: StrictMode double-mount and undefined window.speechSynthesis do not crash or double-speak
      const brokenHost = createCandidateClassVoiceGuidanceHost({
        initialSnapshot: runningSnapshot(),
        win: { speechSynthesis: undefined, SpeechSynthesisUtterance: undefined },
      });
      assert.doesNotThrow(() => brokenHost.strictModeMount());
      assert.equal(brokenHost.getState().available, false);
      brokenHost.unmount();

      const env = createWebSpeechMockEnv({ initialVoices: [SYNTHETIC_VOICES.localKoKr] });
      const validHost = createCandidateClassVoiceGuidanceHost({
        initialSnapshot: runningSnapshot(),
        win: {
          speechSynthesis: env.synth,
          SpeechSynthesisUtterance: env.UtteranceCtor,
          addEventListener() {},
          removeEventListener() {},
        },
      });
      validHost.strictModeMount();
      assert.equal(env.getListenerCount('voiceschanged'), 1);
      validHost.toggleEnabled();
      assert.equal(env.speakHistory.length, 1);
      validHost.unmount();
      assert.equal(env.getListenerCount('voiceschanged'), 0);

      // [F-04 Candidate Fix]: Idle KoreanVoiceController destroy() does NOT cancel unrelated speech,
      // and resume() after paused speed change re-synthesizes at the new speed
      const envF04 = createWebSpeechMockEnv({
        initialVoices: [SYNTHETIC_VOICES.localKoKr],
        keepSpeakingOnPause: true,
      });
      const script = buildKoreanVoiceScript(INITIAL_EXERCISES[0]);
      const idleCtrl = createCandidateKoreanVoiceController({
        script,
        active: false,
        env: { speechSynthesis: envF04.synth, SpeechSynthesisUtterance: envF04.UtteranceCtor },
      });
      idleCtrl.stop();
      idleCtrl.destroy();
      assert.equal(envF04.cancelHistory.length, 0);

      const activeCtrl = createCandidateKoreanVoiceController({
        script,
        active: true,
        env: { speechSynthesis: envF04.synth, SpeechSynthesisUtterance: envF04.UtteranceCtor },
      });
      assert.equal(activeCtrl.play('all'), true);
      assert.equal(envF04.speakHistory.at(-1).rate, 1);
      activeCtrl.pause();
      activeCtrl.setSpeed(1.25);
      assert.equal(activeCtrl.resume(), true);
      assert.equal(envF04.speakHistory.length, 2);
      assert.equal(envF04.speakHistory.at(-1).rate, 1.25);
      activeCtrl.destroy();
    });
  });

  describe('8. Privacy, No Microphone/Camera, & No External Voice API Enforcement', () => {
    it('executes full voice lifecycles with zero microphone, camera, SpeechRecognition, or network access', () => {
      const guards = installPrivacyAndNetworkGuards();
      try {
        const env = createWebSpeechMockEnv({ initialVoices: [SYNTHETIC_VOICES.localKoKr] });
        const script = buildKoreanVoiceScript(INITIAL_EXERCISES[0]);
        assert.equal(script.disclaimerKo, KOREAN_VOICE_DISCLAIMER_KO);

        const controller = createKoreanVoiceController({
          script,
          env: { speechSynthesis: env.synth, SpeechSynthesisUtterance: env.UtteranceCtor },
        });
        assert.equal(controller.play('all'), true);
        controller.pause();
        controller.resume();
        controller.stop();
        controller.destroy();

        const compliance = createMediaComplianceAudit();
        assert.equal(compliance.usesPaidVoiceApi, false);
        assert.equal(compliance.usesUnauthorizedVideoDownload, false);
        assert.equal(compliance.usesRedistributedMediaBinary, false);
        assert.equal(compliance.autoPlaysOnEntryOrSwitch, false);
        assert.equal(compliance.externalOriginalLinkAlwaysPresent, true);

        assert.equal(
          detectForbiddenPaidVoiceOrDownloadUrl('https://api.elevenlabs.io/v1/text-to-speech').forbidden,
          true,
        );
        assert.equal(
          detectForbiddenPaidVoiceOrDownloadUrl('https://api.openai.com/v1/audio/speech').forbidden,
          true,
        );
        assert.equal(
          detectForbiddenPaidVoiceOrDownloadUrl('https://texttospeech.googleapis.com/v1/text:synthesize')
            .forbidden,
          true,
        );
        assert.equal(
          detectForbiddenPaidVoiceOrDownloadUrl('https://cdn.example.com/voice-cue.mp3').forbidden,
          true,
        );
        assert.equal(
          validateSafeExternalReferenceUrl('https://api.elevenlabs.io/v1/text-to-speech'),
          null,
        );
        assert.equal(
          isPermittedEmbedUrl('https://www.youtube-nocookie.com/embed/K56Z12XNQ5c?rel=0&autoplay=0'),
          true,
        );
        assert.equal(
          isPermittedEmbedUrl('https://www.youtube-nocookie.com/embed/K56Z12XNQ5c?rel=0&autoplay=1'),
          false,
        );
        assert.equal(isValidKoreanVoiceSpeed(1.25), true);
        assert.equal(isValidKoreanVoiceSpeed(2.0), false);
        assert.equal(guards.violations.length, 0);
      } finally {
        guards.restore();
      }
    });
  });
});
