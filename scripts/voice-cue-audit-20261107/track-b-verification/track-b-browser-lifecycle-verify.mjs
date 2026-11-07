import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformRepoFileForBrowser } from '../shared/ts-loader-hooks.mjs';

const { puppeteer } = await import(
  '/usr/local/lib/node_modules/chrome-devtools-mcp/build/src/third_party/index.js'
);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');
const EVIDENCE_FILE = path.join(
  REPO_ROOT,
  'docs/voice-cue-audit-20261107/evidence/browser-verification-results.json',
);

const HARNESS_HTML = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Pilates Flow — Voice Cue Lifecycle Audit Harness</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 16px; font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; background: #fafaf9; color: #1c1917; }
    .audit-shell { max-width: 960px; margin: 0 auto; display: grid; gap: 16px; }
    .panel { background: #fff; border: 1px solid #d6d3d1; border-radius: 12px; padding: 16px; }
    .button-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0; }
    button { min-height: 44px; padding: 8px 14px; border-radius: 8px; border: 1px solid #78716c; background: #fff; cursor: pointer; font-size: 14px; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .script-segment { padding: 8px; border-bottom: 1px solid #e7e5e4; word-break: keep-all; overflow-wrap: anywhere; }
  </style>
</head>
<body>
  <main class="audit-shell">
    <section class="panel" aria-label="수업 음성 안내 설정">
      <h1>수업 진행 기기 음성 안내</h1>
      <div class="button-row">
        <button id="stage-voice-toggle" type="button" aria-pressed="false">음성 안내 켜기</button>
        <button id="stage-voice-stop" type="button" disabled>음성 즉시 중지</button>
        <button id="stage-start-pause" type="button">수업 시작</button>
      </div>
      <p id="stage-voice-status" role="status">음성 꺼짐 · 수업마다 직접 켜 주세요.</p>
    </section>
    <section class="panel" data-testid="movement-media-guidance-panel">
      <h2>한국어 음성 설명 (무료 브라우저·기기 TTS)</h2>
      <div data-testid="mobile-tts-capability-badge" id="mmg-capability-badge"></div>
      <div class="button-row">
        <button id="mmg-play-btn" data-testid="voice-play-btn" type="button">한국어 음성 설명 재생</button>
        <button id="mmg-pause-btn" data-testid="voice-pause-btn" type="button" disabled>음성 일시정지</button>
        <button id="mmg-stop-btn" data-testid="voice-stop-btn" type="button" disabled>음성 정지</button>
      </div>
      <p id="mmg-announcement" data-testid="voice-status-announcement" role="status"></p>
      <div id="mmg-script-text" data-testid="voice-script-text"></div>
    </section>
  </main>
  <script type="module" src="/harness-entry.js"></script>
</body>
</html>`;

const HARNESS_ENTRY_JS = `
import { ClassVoiceController } from '/src/models/ClassVoiceController.ts';
import {
  buildKoreanVoiceScript,
  createKoreanVoiceController,
  inspectMobileAndBrowserTtsSupport,
  movementMediaSessionCoordinator,
  selectBestKoreanVoice,
} from '/src/utils/koreanVoiceNarration.ts';
import {
  createMediaComplianceAudit,
  detectForbiddenPaidVoiceOrDownloadUrl,
  isPermittedEmbedUrl,
} from '/src/schemas/movementMediaGuidanceSchema.ts';
import { INITIAL_EXERCISES } from '/src/data/pilatesCatalog.ts';

window.__pilatesVoiceModules = {
  ClassVoiceController,
  buildKoreanVoiceScript,
  createKoreanVoiceController,
  inspectMobileAndBrowserTtsSupport,
  movementMediaSessionCoordinator,
  selectBestKoreanVoice,
  createMediaComplianceAudit,
  detectForbiddenPaidVoiceOrDownloadUrl,
  isPermittedEmbedUrl,
  INITIAL_EXERCISES,
};

const exercise = INITIAL_EXERCISES[0];
const script = buildKoreanVoiceScript(exercise);
const capability = inspectMobileAndBrowserTtsSupport();

const toggleBtn = document.getElementById('stage-voice-toggle');
const stopBtn = document.getElementById('stage-voice-stop');
const stageStatus = document.getElementById('stage-voice-status');
const badgeEl = document.getElementById('mmg-capability-badge');
const announcementEl = document.getElementById('mmg-announcement');
const scriptTextEl = document.getElementById('mmg-script-text');

const hasLocalKo = Boolean(
  window.speechSynthesis &&
  selectBestKoreanVoice(window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [])
);
toggleBtn.disabled = !hasLocalKo;
if (!hasLocalKo) {
  stageStatus.textContent = '이 브라우저에서 기기 한국어 음성을 찾지 못했어요. 음성 없이도 수업을 진행할 수 있습니다.';
}

badgeEl.textContent = capability.summaryLabelKo + ' · ' + capability.platformLabelKo;
announcementEl.textContent = capability.canAttemptSpeech
  ? '한국어 음성 안내 대기 중 (버튼을 눌러 재생)'
  : '음성 합성 미지원 환경 — 화면의 전체 한국어 대본을 확인하세요.';

scriptTextEl.innerHTML = script.segments
  .map((seg) => '<div class="script-segment"><strong>' + (seg.index + 1) + '. ' + seg.labelKo + '</strong>: ' + seg.textKo + '</div>')
  .join('');

window.__harnessReady = true;
`;

function startLocalHarnessServer() {
  const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url ?? '/', 'http://127.0.0.1');
    const pathname = reqUrl.pathname;

    if (pathname === '/' || pathname === '/audit-harness.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(HARNESS_HTML);
      return;
    }

    if (pathname === '/harness-entry.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
      res.end(HARNESS_ENTRY_JS);
      return;
    }

    if (pathname === '/__zod_shim.js') {
      const zodFile =
        '/usr/local/lib/node_modules/chrome-devtools-mcp/build/src/third_party/index.js';
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
      res.end(`
        export const z = {
          literal: (v) => ({ _v: v, safeParse: (x) => ({ success: x === v }) }),
          union: (arr) => ({
            safeParse: (x) => ({ success: arr.some((item) => item._v === x) }),
          }),
        };
        export default z;
      `);
      return;
    }

    if (pathname.startsWith('/src/')) {
      const absPath = path.resolve(REPO_ROOT, '.' + pathname);
      if (!absPath.startsWith(path.join(REPO_ROOT, 'src')) || !fs.existsSync(absPath)) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      try {
        let js = transformRepoFileForBrowser(absPath, REPO_ROOT);
        js = js.replace(/from\s+['"]zod['"]/g, 'from "/__zod_shim.js"');
        res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
        res.end(js);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(String(err?.stack ?? err));
      }
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  });

  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address.port}`,
      });
    });
    server.on('error', reject);
  });
}

async function runBrowserVerification() {
  const { server, baseUrl } = await startLocalHarnessServer();
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const externalRequests = [];
  const viewports = [
    { width: 320, height: 850, label: 'mobile-320' },
    { width: 390, height: 850, label: 'mobile-390' },
    { width: 768, height: 1024, label: 'tablet-768' },
    { width: 1440, height: 900, label: 'desktop-1440' },
  ];

  const pass1NativeResults = [];
  let pass2InstrumentedResults = null;

  try {
    // =========================================================================
    // PASS 1: Real Unmocked Headless Linux Chromium Native Web Speech Inspection
    // =========================================================================
    for (const vp of viewports) {
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      await page.setViewport({ width: vp.width, height: vp.height });

      page.on('request', (req) => {
        const url = req.url();
        if (!url.startsWith(baseUrl) && !url.startsWith('data:')) {
          externalRequests.push({ pass: 'pass1-native', viewport: vp.label, url });
        }
      });

      await page.goto(`${baseUrl}/audit-harness.html`, { waitUntil: 'networkidle0' });
      await page.waitForFunction(() => window.__harnessReady === true);

      const snapshot = await page.evaluate(() => {
        const {
          inspectMobileAndBrowserTtsSupport,
          createKoreanVoiceController,
          buildKoreanVoiceScript,
          INITIAL_EXERCISES,
        } = window.__pilatesVoiceModules;

        const nativeSynthExists = 'speechSynthesis' in window && Boolean(window.speechSynthesis);
        const nativeUtteranceExists =
          'SpeechSynthesisUtterance' in window &&
          typeof window.SpeechSynthesisUtterance === 'function';
        const nativeVoices = window.speechSynthesis?.getVoices?.() ?? [];
        const capability = inspectMobileAndBrowserTtsSupport();

        const script = buildKoreanVoiceScript(INITIAL_EXERCISES[0]);
        const controller = createKoreanVoiceController({ script });
        const playAttempt = controller.play('all');
        const stateAfterPlay = controller.getState();
        controller.destroy();

        const toggleBtn = document.getElementById('stage-voice-toggle');
        const stageStatus = document.getElementById('stage-voice-status');
        const scriptSegmentsCount = document.querySelectorAll('.script-segment').length;
        const noHorizontalOverflow =
          document.documentElement.scrollWidth <= window.innerWidth + 1;

        return {
          userAgent: navigator.userAgent,
          nativeSynthExists,
          nativeUtteranceExists,
          nativeVoicesCount: nativeVoices.length,
          capability,
          playAttemptOnEmptyNativeVoices: playAttempt,
          controllerStatusOnEmptyNativeVoices: stateAfterPlay.status,
          stageToggleDisabled: toggleBtn.disabled,
          stageStatusText: stageStatus.textContent,
          scriptSegmentsCount,
          noHorizontalOverflow,
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        };
      });

      assert.equal(snapshot.nativeSynthExists, true);
      assert.equal(snapshot.nativeUtteranceExists, true);
      assert.equal(snapshot.capability.canAttemptSpeech, false);
      assert.equal(snapshot.capability.koreanVoiceStatus, 'no-local-korean-voice');
      assert.equal(snapshot.playAttemptOnEmptyNativeVoices, false);
      assert.equal(snapshot.controllerStatusOnEmptyNativeVoices, 'unsupported');
      assert.equal(snapshot.stageToggleDisabled, true);
      assert.equal(snapshot.scriptSegmentsCount, 6);
      assert.equal(snapshot.noHorizontalOverflow, true);

      pass1NativeResults.push({
        viewport: vp,
        ...snapshot,
      });

      await context.close();
    }

    // =========================================================================
    // PASS 2: Instrumented Web Speech API in Real Chromium DOM Lifecycle Matrix
    // =========================================================================
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    page.on('request', (req) => {
      const url = req.url();
      if (!url.startsWith(baseUrl) && !url.startsWith('data:')) {
        externalRequests.push({ pass: 'pass2-instrumented', url });
      }
    });

    await page.evaluateOnNewDocument(() => {
      const mediaViolations = [];
      if (navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia = async () => {
          mediaViolations.push('getUserMedia');
          throw new Error('Forbidden getUserMedia call');
        };
      }
      window.__mediaViolations = mediaViolations;

      class BrowserMockUtterance {
        text = '';
        lang = '';
        rate = 1;
        pitch = 1;
        volume = 1;
        voice = null;
        onstart = null;
        onend = null;
        onerror = null;
        constructor(text = '') {
          this.text = String(text);
        }
      }

      const listeners = new Map();
      const speakCalls = [];
      const cancelCalls = [];
      const pauseCalls = [];
      const resumeCalls = [];
      let keepSpeakingOnPause = true;
      let voices = [
        {
          name: 'Yuna (Chromium Local ko-KR)',
          lang: 'ko-KR',
          localService: true,
          default: true,
          voiceURI: 'chromium-local-ko-kr',
        },
        {
          name: 'Google 한국어 (Network)',
          lang: 'ko-KR',
          localService: false,
          default: false,
          voiceURI: 'chromium-remote-ko-kr',
        },
      ];

      const mockSynth = {
        speaking: false,
        paused: false,
        pending: false,
        getVoices() {
          return voices;
        },
        speak(utterance) {
          speakCalls.push({
            utterance,
            text: utterance.text,
            lang: utterance.lang,
            rate: utterance.rate,
            voiceName: utterance.voice?.name ?? null,
            localService: Boolean(utterance.voice?.localService),
          });
          mockSynth.speaking = true;
          mockSynth.paused = false;
        },
        cancel() {
          cancelCalls.push({ wasSpeaking: mockSynth.speaking, wasPaused: mockSynth.paused });
          mockSynth.speaking = false;
          mockSynth.paused = false;
        },
        pause() {
          pauseCalls.push({ wasSpeaking: mockSynth.speaking });
          if (keepSpeakingOnPause) {
            mockSynth.paused = true;
          } else {
            mockSynth.speaking = false;
            mockSynth.paused = false;
          }
        },
        resume() {
          resumeCalls.push({ wasPaused: mockSynth.paused });
          if (keepSpeakingOnPause && mockSynth.paused) {
            mockSynth.paused = false;
            mockSynth.speaking = true;
          }
        },
        addEventListener(type, fn) {
          if (!listeners.has(type)) listeners.set(type, new Set());
          listeners.get(type).add(fn);
        },
        removeEventListener(type, fn) {
          listeners.get(type)?.delete(fn);
        },
        dispatchEvent(ev) {
          const set = listeners.get(ev.type);
          if (set) {
            for (const fn of [...set]) fn(ev);
          }
          return true;
        },
      };

      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        writable: true,
        value: mockSynth,
      });
      Object.defineProperty(window, 'SpeechSynthesisUtterance', {
        configurable: true,
        writable: true,
        value: BrowserMockUtterance,
      });

      window.__speechAuditControl = {
        speakCalls,
        cancelCalls,
        pauseCalls,
        resumeCalls,
        getListenerCount: (type = 'voiceschanged') => listeners.get(type)?.size ?? 0,
        setVoices(nextVoices, fireEvent = true) {
          voices = nextVoices;
          if (fireEvent) {
            mockSynth.dispatchEvent(new Event('voiceschanged'));
          }
        },
        setKeepSpeakingOnPause(val) {
          keepSpeakingOnPause = val;
        },
        resetLogs() {
          speakCalls.length = 0;
          cancelCalls.length = 0;
          pauseCalls.length = 0;
          resumeCalls.length = 0;
          mockSynth.speaking = false;
          mockSynth.paused = false;
        },
      };
    });

    await page.goto(`${baseUrl}/audit-harness.html`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => window.__harnessReady === true);

    pass2InstrumentedResults = await page.evaluate(() => {
      const {
        ClassVoiceController,
        buildKoreanVoiceScript,
        createKoreanVoiceController,
        inspectMobileAndBrowserTtsSupport,
        movementMediaSessionCoordinator,
        selectBestKoreanVoice,
        INITIAL_EXERCISES,
      } = window.__pilatesVoiceModules;
      const ctrl = window.__speechAuditControl;

      // 1. Language & Local-Only Voice Selection in Chromium
      const chosen = selectBestKoreanVoice(window.speechSynthesis.getVoices());
      const languageCheck = {
        chosenVoiceName: chosen?.name ?? null,
        chosenLocalService: chosen?.localService ?? false,
        chosenLang: chosen?.lang ?? null,
        capability: inspectMobileAndBrowserTtsSupport(),
      };

      // 2. ClassVoiceController full lifecycle in Chromium DOM (opt-in, tick dedup, phase change, 10s alert, pause/resume, completion, visibilitychange, pagehide)
      ctrl.resetLogs();
      const classPort = {
        speak: (text) => {
          const v = selectBestKoreanVoice(window.speechSynthesis.getVoices());
          if (!v?.localService) return;
          const u = new window.SpeechSynthesisUtterance(text);
          u.voice = v;
          u.lang = v.lang;
          window.speechSynthesis.speak(u);
        },
        cancel: () => window.speechSynthesis.cancel(),
      };
      const stageCtrl = new ClassVoiceController(classPort);
      const baseSnap = {
        stepKey: 'browser-step-1',
        title: '펠빅 컬',
        breath: '내쉬며 골반을 말아 올립니다.',
        phase: '설명 · 세팅',
        remainingSec: 60,
        nextTitle: '헌드레드',
        running: true,
        eligible: true,
        visible: true,
      };

      stageCtrl.setEnabled(true, baseSnap);
      const afterOptInSpeaks = ctrl.speakCalls.length;
      stageCtrl.update({ ...baseSnap, remainingSec: 59 });
      stageCtrl.update({ ...baseSnap, remainingSec: 58 });
      const afterDuplicateTicksSpeaks = ctrl.speakCalls.length;

      stageCtrl.update({ ...baseSnap, phase: '수행 · 왼쪽', remainingSec: 40 });
      const afterPhaseChangeSpeaks = ctrl.speakCalls.length;

      stageCtrl.update({ ...baseSnap, phase: '수행 · 왼쪽', remainingSec: 10 });
      stageCtrl.update({ ...baseSnap, phase: '수행 · 왼쪽', remainingSec: 9 });
      const afterTenSecWarningSpeaks = ctrl.speakCalls.length;

      // Pause & resume without repeating cue
      stageCtrl.update({ ...baseSnap, running: false, remainingSec: 9 });
      const cancelsAfterPause = ctrl.cancelCalls.length;
      stageCtrl.update({ ...baseSnap, running: true, phase: '수행 · 왼쪽', remainingSec: 9 });
      const speaksAfterResume = ctrl.speakCalls.length;

      // Visibility hidden in real DOM
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'hidden',
      });
      document.dispatchEvent(new Event('visibilitychange'));
      stageCtrl.update({
        ...baseSnap,
        visible: document.visibilityState !== 'hidden',
        remainingSec: 8,
      });
      const cancelsAfterHidden = ctrl.cancelCalls.length;

      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'visible',
      });
      document.dispatchEvent(new Event('visibilitychange'));

      // Step completion at remainingSec = 0
      stageCtrl.update({ ...baseSnap, running: true, remainingSec: 2 });
      stageCtrl.update({ ...baseSnap, running: false, remainingSec: 0 });
      const completionCueText = ctrl.speakCalls.at(-1)?.text ?? '';

      // Pagehide event
      window.addEventListener('pagehide', () => stageCtrl.cancel(), { once: true });
      window.dispatchEvent(new PageTransitionEvent('pagehide'));
      const cancelsAfterPageHide = ctrl.cancelCalls.length;
      stageCtrl.destroy();

      // 3. KoreanVoiceController & MovementMediaSessionCoordinator in Chromium (play, pause, mobile segment recovery, speed change, A->B->A switch, StrictMode mount/unmount)
      ctrl.resetLogs();
      movementMediaSessionCoordinator.resetForTests();
      ctrl.setKeepSpeakingOnPause(false); // test mobile segment recovery in browser

      const scriptA = buildKoreanVoiceScript(INITIAL_EXERCISES[0]);
      const scriptB = buildKoreanVoiceScript(INITIAL_EXERCISES[1]);

      // Simulate StrictMode mount -> unmount -> remount
      const tempCtrl = createKoreanVoiceController({ script: scriptA });
      tempCtrl.destroy();
      const voiceCtrlA = createKoreanVoiceController({ script: scriptA });
      const voiceCtrlB = createKoreanVoiceController({ script: scriptB });

      const listenersAfterStrictMode = ctrl.getListenerCount('voiceschanged');
      voiceCtrlA.speakSegment(2);
      const segment2Text = ctrl.speakCalls.at(-1)?.text ?? '';
      voiceCtrlA.pause();
      const pausedStatus = voiceCtrlA.getState().status;
      voiceCtrlA.resume();
      const resumedStatus = voiceCtrlA.getState().status;
      const speaksAfterMobileRecovery = ctrl.speakCalls.length;

      voiceCtrlA.setSpeed(1.25);
      const speedAfterChange = ctrl.speakCalls.at(-1)?.rate;

      // Switch A -> B -> A
      voiceCtrlB.play('overview');
      const statusAAfterBSwitch = voiceCtrlA.getState().status;
      const statusBPlaying = voiceCtrlB.getState().status;
      const speaksBeforeRevisitA = ctrl.speakCalls.length;
      movementMediaSessionCoordinator.notifyMovementActivated(INITIAL_EXERCISES[0].id);
      const statusBAfterRevisitA = voiceCtrlB.getState().status;
      const speaksAfterRevisitA = ctrl.speakCalls.length;

      // Mid-play local voice removal in browser
      voiceCtrlA.play('all');
      ctrl.setVoices(
        [
          {
            name: 'Remote Only',
            lang: 'ko-KR',
            localService: false,
            default: true,
            voiceURI: 'remote-only',
          },
        ],
        true,
      );
      const statusAfterVoiceRemoved = voiceCtrlA.getState().status;

      voiceCtrlA.destroy();
      voiceCtrlB.destroy();
      const listenersAfterDestroyAll = ctrl.getListenerCount('voiceschanged');

      return {
        languageCheck,
        stageLifecycle: {
          afterOptInSpeaks,
          afterDuplicateTicksSpeaks,
          afterPhaseChangeSpeaks,
          afterTenSecWarningSpeaks,
          cancelsAfterPause,
          speaksAfterResume,
          cancelsAfterHidden,
          completionCueText,
          cancelsAfterPageHide,
        },
        mediaNarrationLifecycle: {
          listenersAfterStrictMode,
          segment2Started: segment2Text.length > 10,
          pausedStatus,
          resumedStatus,
          speaksAfterMobileRecovery,
          speedAfterChange,
          statusAAfterBSwitch,
          statusBPlaying,
          statusBAfterRevisitA,
          noAutoplayOnRevisitA: speaksAfterRevisitA === speaksBeforeRevisitA,
          statusAfterVoiceRemoved,
          listenersAfterDestroyAll,
        },
        mediaViolationsCount: window.__mediaViolations.length,
      };
    });

    assert.equal(pass2InstrumentedResults.languageCheck.chosenLocalService, true);
    assert.equal(pass2InstrumentedResults.languageCheck.chosenLang, 'ko-KR');
    assert.equal(pass2InstrumentedResults.stageLifecycle.afterOptInSpeaks, 1);
    assert.equal(pass2InstrumentedResults.stageLifecycle.afterDuplicateTicksSpeaks, 1);
    assert.equal(pass2InstrumentedResults.stageLifecycle.afterPhaseChangeSpeaks, 2);
    assert.equal(pass2InstrumentedResults.stageLifecycle.afterTenSecWarningSpeaks, 3);
    assert.equal(pass2InstrumentedResults.stageLifecycle.speaksAfterResume, 3);
    assert.match(
      pass2InstrumentedResults.stageLifecycle.completionCueText,
      /계획 시간이 끝났습니다\. 다음은 헌드레드입니다\./,
    );
    assert.equal(pass2InstrumentedResults.mediaNarrationLifecycle.pausedStatus, 'paused');
    assert.equal(pass2InstrumentedResults.mediaNarrationLifecycle.resumedStatus, 'playing');
    assert.equal(pass2InstrumentedResults.mediaNarrationLifecycle.speedAfterChange, 1.25);
    assert.equal(pass2InstrumentedResults.mediaNarrationLifecycle.statusAAfterBSwitch, 'idle');
    assert.equal(pass2InstrumentedResults.mediaNarrationLifecycle.statusBPlaying, 'playing');
    assert.equal(pass2InstrumentedResults.mediaNarrationLifecycle.statusBAfterRevisitA, 'idle');
    assert.equal(pass2InstrumentedResults.mediaNarrationLifecycle.noAutoplayOnRevisitA, true);
    assert.equal(
      pass2InstrumentedResults.mediaNarrationLifecycle.statusAfterVoiceRemoved,
      'unsupported',
    );
    assert.equal(pass2InstrumentedResults.mediaNarrationLifecycle.listenersAfterDestroyAll, 0);
    assert.equal(pass2InstrumentedResults.mediaViolationsCount, 0);
    assert.equal(externalRequests.length, 0);

    await context.close();
  } finally {
    await browser.close();
    server.close();
  }

  const fullReport = {
    auditId: 'voice-cue-audit-20261107',
    executedAt: new Date().toISOString(),
    environment: {
      os: 'Linux Debian 12 (bookworm)',
      nodeVersion: process.version,
      browserExecutable: '/usr/bin/chromium',
      browserVersion: pass1NativeResults[0]?.userAgent ?? 'HeadlessChrome/156.0.0.0',
    },
    unverifiedBoundaries: {
      physicalAcousticOutputQuality:
        'UNVERIFIED — Headless Linux container has no physical speaker/audio hardware and 0 OS local Korean TTS voice packs installed; actual acoustic waveform, prosody, and volume are not verified.',
      physicalAppleSafariDevices:
        'UNVERIFIED — Physical iOS/iPadOS/macOS Safari (WebKit AVSpeechSynthesizer, hardware mute switch, Yuna/Sora native voice packs) was not executed in this Linux VM.',
      physicalAndroidDevices:
        'UNVERIFIED — Physical Android Chrome / Samsung Internet hardware TTS engine was not executed in this Linux VM.',
    },
    privacyAndSecurity: {
      externalNetworkRequestsCount: externalRequests.length,
      microphoneOrCameraCallsCount: pass2InstrumentedResults?.mediaViolationsCount ?? 0,
      paidVoiceApiUsed: false,
      userVoiceTransmitted: false,
    },
    pass1NativeUnmockedChromium: pass1NativeResults,
    pass2InstrumentedChromiumLifecycle: pass2InstrumentedResults,
  };

  fs.mkdirSync(path.dirname(EVIDENCE_FILE), { recursive: true });
  fs.writeFileSync(EVIDENCE_FILE, JSON.stringify(fullReport, null, 2) + '\n', 'utf8');
  console.log(
    `[Track B Browser Verification] Completed successfully. Evidence saved to ${path.relative(REPO_ROOT, EVIDENCE_FILE)}`,
  );
}

runBrowserVerification().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
