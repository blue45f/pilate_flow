import '../shared/ts-loader-hooks.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const { ClassVoiceController } = await import('../../../src/models/ClassVoiceController.ts');
const {
  KOREAN_VOICE_DISCLAIMER_KO,
  buildKoreanVoiceScript,
  createKoreanVoiceController,
  movementMediaSessionCoordinator,
} = await import('../../../src/utils/koreanVoiceNarration.ts');
const { resolveMovementMediaBundle } = await import('../../../src/utils/movementMediaMatcher.ts');
const { INITIAL_EXERCISES } = await import('../../../src/data/pilatesCatalog.ts');
import {
  SYNTHETIC_VOICES,
  createWebSpeechMockEnv,
} from '../shared/web-speech-mock-harness.mjs';
const {
  CandidateClassVoiceController,
  createCandidateClassVoiceGuidanceHost,
  createCandidateKoreanVoiceController,
} = await import('../track-a-implementation/candidate-minimal-fixes.mjs');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');

const BASE_SNAPSHOT = Object.freeze({
  stepKey: 'step-1',
  title: '검토한 첫 동작',
  breath: '들이마시고 내쉽니다.',
  phase: '설명 · 세팅',
  remainingSec: 60,
  nextTitle: '검토한 다음 동작',
  running: true,
  eligible: true,
  visible: true,
});

describe('Track B — Independent Adversarial Defect Reproduction & Compliance Audit', () => {
  beforeEach(() => {
    movementMediaSessionCoordinator.resetForTests();
  });

  describe('A. Deterministic Verification of Edge-Case Defect Fixes (Integrated Production & Pre-Integration Candidate)', () => {
    it('[F-01] Verifies cancel() on newVisit to silent step in integrated ClassVoiceController and CandidateClassVoiceController', () => {
      // 1. Integrated production ClassVoiceController verification:
      let roCancelCalls = 0;
      const roSpoken = [];
      const roController = new ClassVoiceController({
        speak: (t) => roSpoken.push(t),
        cancel: () => {
          roCancelCalls += 1;
        },
      });
      roController.setPreferences({ movement: false, breath: true, time: false });
      roController.setEnabled(true, { ...BASE_SNAPSHOT, stepKey: 'step-1', breath: '긴 호흡 안내 메모' });
      assert.equal(roSpoken.length, 1);
      assert.equal(roCancelCalls, 0);

      // Transition while running to a rest step (or unreviewed step) where breath === ''
      roController.update({
        ...BASE_SNAPSHOT,
        stepKey: 'rest-step',
        title: '휴식',
        breath: '',
        phase: '휴식',
        remainingSec: 30,
      });
      assert.equal(roCancelCalls, 1, 'Integrated ClassVoiceController cancels previous step speech on newVisit (F-01)');

      // 2. Pre-Integration Candidate Fix verification:
      let candCancelCalls = 0;
      const candSpoken = [];
      const candController = new CandidateClassVoiceController({
        speak: (t) => candSpoken.push(t),
        cancel: () => {
          candCancelCalls += 1;
        },
      });
      candController.setPreferences({ movement: false, breath: true, time: false });
      candController.setEnabled(true, { ...BASE_SNAPSHOT, stepKey: 'step-1', breath: '긴 호흡 안내 메모' });
      assert.equal(candSpoken.length, 1);
      candController.update({
        ...BASE_SNAPSHOT,
        stepKey: 'rest-step',
        title: '휴식',
        breath: '',
        phase: '휴식',
        remainingSec: 30,
      });
      assert.equal(candCancelCalls, 1, 'Candidate fix F-01 cancels previous step speech on newVisit');
    });

    it('[F-02] Verifies post-edit next-tick silence & hidden-tab phase drift suppression in integrated ClassVoiceController and CandidateClassVoiceController', () => {
      // 1. Subcase F-02a: Content edit on same step before initial announcement
      const roSpoken = [];
      const roController = new ClassVoiceController({
        speak: (t) => roSpoken.push(t),
        cancel: () => {},
      });
      roController.setEnabled(true, { ...BASE_SNAPSHOT, running: false });
      assert.equal(roSpoken.length, 0);

      // Step starts on the same update that breath was edited:
      roController.update({ ...BASE_SNAPSHOT, running: true, breath: '편집된 미검토 호흡' });
      assert.equal(roSpoken.length, 0);
      // Next 250ms tick on the same step:
      roController.update({
        ...BASE_SNAPSHOT,
        running: true,
        breath: '편집된 미검토 호흡',
        remainingSec: 59,
      });
      assert.equal(roSpoken.length, 0, 'Integrated ClassVoiceController keeps edited step silent on next tick (F-02a)');

      // Candidate Fix F-02a:
      const candSpoken = [];
      const candController = new CandidateClassVoiceController({
        speak: (t) => candSpoken.push(t),
        cancel: () => {},
      });
      candController.setEnabled(true, { ...BASE_SNAPSHOT, running: false });
      candController.update({ ...BASE_SNAPSHOT, running: true, breath: '편집된 미검토 호흡' });
      candController.update({
        ...BASE_SNAPSHOT,
        running: true,
        breath: '편집된 미검토 호흡',
        remainingSec: 59,
      });
      assert.equal(candSpoken.length, 0, 'Candidate fix F-02a keeps edited step silent on next tick');

      // 2. Subcase F-02b: Phase change while tab is hidden (visible: false)
      const roHiddenSpoken = [];
      const roHiddenCtrl = new ClassVoiceController({
        speak: (t) => roHiddenSpoken.push(t),
        cancel: () => {},
      });
      roHiddenCtrl.setEnabled(true, { ...BASE_SNAPSHOT, phase: '설명 · 세팅', remainingSec: 60 });
      assert.equal(roHiddenSpoken.length, 1);
      // Tab hidden while phase transitions to '수행 · 왼쪽' at 50s:
      roHiddenCtrl.update({
        ...BASE_SNAPSHOT,
        visible: false,
        phase: '수행 · 왼쪽',
        remainingSec: 50,
      });
      // Tab becomes visible much later at 35s (still in '수행 · 왼쪽'):
      roHiddenCtrl.update({
        ...BASE_SNAPSHOT,
        visible: true,
        phase: '수행 · 왼쪽',
        remainingSec: 35,
      });
      assert.equal(
        roHiddenSpoken.length,
        1,
        'Integrated ClassVoiceController suppresses delayed stale phase cue when returning from hidden tab (F-02b)',
      );

      // Candidate Fix F-02b:
      const candHiddenSpoken = [];
      const candHiddenCtrl = new CandidateClassVoiceController({
        speak: (t) => candHiddenSpoken.push(t),
        cancel: () => {},
      });
      candHiddenCtrl.setEnabled(true, { ...BASE_SNAPSHOT, phase: '설명 · 세팅', remainingSec: 60 });
      candHiddenCtrl.update({
        ...BASE_SNAPSHOT,
        visible: false,
        phase: '수행 · 왼쪽',
        remainingSec: 50,
      });
      candHiddenCtrl.update({
        ...BASE_SNAPSHOT,
        visible: true,
        phase: '수행 · 왼쪽',
        remainingSec: 35,
      });
      assert.equal(
        candHiddenSpoken.length,
        1,
        'Candidate fix F-02b suppresses delayed stale phase cue when returning from hidden tab',
      );
    });

    it('[F-03] Reproduces window.speechSynthesis=undefined crash & non-EventTarget crash in read-only hook pattern and verifies CandidateClassVoiceGuidanceHost fix', () => {
      // 1. Read-only `useClassVoiceGuidance.ts` line 30 pattern:
      // `if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;`
      const winWithUndefinedSynth = {
        speechSynthesis: undefined,
        SpeechSynthesisUtterance: undefined,
      };
      assert.equal(
        'speechSynthesis' in winWithUndefinedSynth &&
          'SpeechSynthesisUtterance' in winWithUndefinedSynth,
        true,
        'Property keys exist on window even when values are undefined',
      );
      assert.throws(() => {
        // Exact line 31 & 67 of src/hooks/useClassVoiceGuidance.ts:
        const synth = winWithUndefinedSynth.speechSynthesis;
        synth.getVoices();
      }, TypeError);

      // 2. Candidate Fix F-03 handles undefined/null speechSynthesis, missing addEventListener,
      // ko-KR priority over generic ko, and silent voice removal before speak():
      const safeHost = createCandidateClassVoiceGuidanceHost({
        initialSnapshot: BASE_SNAPSHOT,
        win: winWithUndefinedSynth,
      });
      assert.doesNotThrow(() => safeHost.mount());
      assert.equal(safeHost.getState().available, false);
      safeHost.unmount();

      // Verify ko-KR priority over generic ko even when generic ko is listed first:
      const env = createWebSpeechMockEnv({
        initialVoices: [SYNTHETIC_VOICES.localKoGeneric, SYNTHETIC_VOICES.localKoKr],
        supportEventTarget: false, // Partial WebView without synth.addEventListener
      });
      const host = createCandidateClassVoiceGuidanceHost({
        initialSnapshot: BASE_SNAPSHOT,
        win: {
          speechSynthesis: env.synth,
          SpeechSynthesisUtterance: env.UtteranceCtor,
        },
      });
      assert.doesNotThrow(() => host.mount());
      assert.equal(host.getState().available, true);
      host.toggleEnabled();
      assert.equal(env.speakHistory.length, 1);
      assert.equal(
        env.speakHistory[0].voice,
        SYNTHETIC_VOICES.localKoKr,
        'Candidate fix F-03 prioritizes ko-KR over generic ko even when ko appears first',
      );

      // Silent voice removal without voiceschanged event before next step speak():
      env.setVoices([SYNTHETIC_VOICES.remoteKoKr], { dispatchEvent: false });
      host.updateSnapshot({ ...BASE_SNAPSHOT, stepKey: 'step-2', title: '롤업' });
      assert.equal(
        env.speakHistory.length,
        1,
        'Candidate fix F-03 re-checks getVoices() on speak() and blocks fallback when local voice disappears silently',
      );
      assert.equal(host.getState().available, false);
      assert.equal(host.getState().enabled, false);
      host.unmount();
    });

    it('[F-04] Verifies gated synth.cancel() on idle destroy() & paused speed-change re-synthesis in integrated KoreanVoiceController and Candidate fix', () => {
      const env = createWebSpeechMockEnv({
        initialVoices: [SYNTHETIC_VOICES.localKoKr],
        keepSpeakingOnPause: true,
      });
      const script = buildKoreanVoiceScript(INITIAL_EXERCISES[0]);

      // 1. Integrated KoreanVoiceController does not call synth.cancel() on stop()/destroy() when idle:
      const roIdleCtrl = createKoreanVoiceController({
        script,
        env: { speechSynthesis: env.synth, SpeechSynthesisUtterance: env.UtteranceCtor },
      });
      assert.equal(roIdleCtrl.getState().status, 'idle');
      roIdleCtrl.destroy();
      assert.equal(
        env.cancelHistory.length,
        0,
        'Integrated KoreanVoiceController does not call synth.cancel() when idle controller is destroyed (F-04a)',
      );

      // 2. Integrated KoreanVoiceController re-synthesizes at new speed when speed changed while paused:
      const roPlayCtrl = createKoreanVoiceController({
        script,
        env: { speechSynthesis: env.synth, SpeechSynthesisUtterance: env.UtteranceCtor },
      });
      assert.equal(roPlayCtrl.play('all'), true);
      assert.equal(env.speakHistory.length, 1);
      assert.equal(env.speakHistory.at(-1).rate, 1);
      roPlayCtrl.pause();
      roPlayCtrl.setSpeed(1.25);
      assert.equal(roPlayCtrl.resume(), true);
      assert.equal(
        env.speakHistory.length,
        2,
        'Integrated KoreanVoiceController re-synthesizes at 1.25x on resume after paused setSpeed (F-04b)',
      );
      assert.equal(env.speakHistory.at(-1).rate, 1.25);
      roPlayCtrl.destroy();

      // 3. Verify Candidate KoreanVoiceController fixes both F-04a and F-04b:
      const candEnv = createWebSpeechMockEnv({
        initialVoices: [SYNTHETIC_VOICES.localKoKr],
        keepSpeakingOnPause: true,
      });
      const candIdleCtrl = createCandidateKoreanVoiceController({
        script,
        active: false,
        env: { speechSynthesis: candEnv.synth, SpeechSynthesisUtterance: candEnv.UtteranceCtor },
      });
      candIdleCtrl.destroy();
      assert.equal(
        candEnv.cancelHistory.length,
        0,
        'Candidate fix F-04a does not call synth.cancel() when idle controller is destroyed',
      );

      const candPlayCtrl = createCandidateKoreanVoiceController({
        script,
        active: true,
        env: { speechSynthesis: candEnv.synth, SpeechSynthesisUtterance: candEnv.UtteranceCtor },
      });
      assert.equal(candPlayCtrl.play('all'), true);
      candPlayCtrl.pause();
      candPlayCtrl.setSpeed(1.25);
      assert.equal(candPlayCtrl.resume(), true);
      assert.equal(candEnv.speakHistory.length, 2);
      assert.equal(
        candEnv.speakHistory.at(-1).rate,
        1.25,
        'Candidate fix F-04b re-synthesizes active segment at 1.25x when resumed after paused speed change',
      );
      candPlayCtrl.destroy();
    });
  });

  describe('B. Static Source Compliance, Catalog Coverage, & Integrated Lifecycle Guard Verification', () => {
    it('verifies all 98 catalog exercises generate valid 6-segment Korean scripts and compliant media bundles', () => {
      assert.equal(INITIAL_EXERCISES.length, 98);
      for (const exercise of INITIAL_EXERCISES) {
        const script = buildKoreanVoiceScript(exercise);
        assert.equal(script.exerciseId, exercise.id);
        assert.equal(script.segments.length, 6);
        assert.equal(script.disclaimerKo, KOREAN_VOICE_DISCLAIMER_KO);
        for (const seg of script.segments) {
          assert.ok(seg.textKo.length > 10, `Segment ${seg.id} must have non-empty Korean text`);
        }

        const bundle = resolveMovementMediaBundle(exercise);
        assert.equal(bundle.compliance.usesPaidVoiceApi, false);
        assert.equal(bundle.compliance.usesUnauthorizedVideoDownload, false);
        assert.equal(bundle.compliance.usesRedistributedMediaBinary, false);
        assert.equal(bundle.compliance.autoPlaysOnEntryOrSwitch, false);
        assert.equal(bundle.compliance.externalOriginalLinkAlwaysPresent, true);
      }
    });

    it('scans all voice/TTS source files to confirm zero microphone, camera, SpeechRecognition, or external TTS network calls', () => {
      const voiceFiles = [
        'src/models/ClassVoiceController.ts',
        'src/hooks/useClassVoiceGuidance.ts',
        'src/components/LiveStageView.tsx',
        'src/utils/koreanVoiceNarration.ts',
        'src/components/MovementMediaGuidancePanel.tsx',
        'src/schemas/movementMediaGuidanceSchema.ts',
      ];

      const forbiddenPatterns = [
        { name: 'getUserMedia', regex: /\bgetUserMedia\b/ },
        { name: 'mediaDevices', regex: /\bmediaDevices\b/ },
        { name: 'SpeechRecognition', regex: /\b(?:webkit)?SpeechRecognition\b/ },
        { name: 'MediaRecorder', regex: /\bMediaRecorder\b/ },
        { name: 'AudioContext', regex: /\b(?:webkit)?AudioContext\b/ },
        { name: 'fetch()', regex: /\bfetch\s*\(/ },
        { name: 'XMLHttpRequest', regex: /\bXMLHttpRequest\b/ },
        { name: 'WebSocket', regex: /\bnew\s+WebSocket\b/ },
        { name: 'new Audio()', regex: /\bnew\s+Audio\s*\(/ },
      ];

      for (const relPath of voiceFiles) {
        const absPath = path.join(REPO_ROOT, relPath);
        const content = fs.readFileSync(absPath, 'utf8');
        for (const { name, regex } of forbiddenPatterns) {
          assert.equal(
            regex.test(content),
            false,
            `Forbidden API ${name} must not appear in ${relPath}`,
          );
        }
      }
    });

    it('verifies F-01 through F-04 lifecycle guards are integrated in production voice modules', () => {
      const classCtrlSrc = fs.readFileSync(
        path.join(REPO_ROOT, 'src/models/ClassVoiceController.ts'),
        'utf8',
      );
      const hookSrc = fs.readFileSync(
        path.join(REPO_ROOT, 'src/hooks/useClassVoiceGuidance.ts'),
        'utf8',
      );
      const narrationSrc = fs.readFileSync(
        path.join(REPO_ROOT, 'src/utils/koreanVoiceNarration.ts'),
        'utf8',
      );
      const panelSrc = fs.readFileSync(
        path.join(REPO_ROOT, 'src/components/MovementMediaGuidancePanel.tsx'),
        'utf8',
      );

      assert.match(classCtrlSrc, /this\.announced = true;/);
      assert.match(hookSrc, /pickLocalKoreanVoice/);
      assert.match(narrationSrc, /ownsSpeech/);
      assert.match(narrationSrc, /activeUtteranceSpeed/);
      assert.match(
        panelSrc,
        /if \(active\) \{\s*movementMediaSessionCoordinator\.notifyMovementActivated/,
      );
    });
  });
});
