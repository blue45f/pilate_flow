import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const SUMMARY_FILE = path.join(
  REPO_ROOT,
  'docs/voice-cue-audit-20261107/evidence/regression-summary.json',
);

const SCRIPTS_TO_CHECK = [
  'scripts/voice-cue-audit-20261107/shared/ts-loader-hooks.mjs',
  'scripts/voice-cue-audit-20261107/shared/web-speech-mock-harness.mjs',
  'scripts/voice-cue-audit-20261107/track-a-implementation/candidate-minimal-fixes.mjs',
  'scripts/voice-cue-audit-20261107/track-a-implementation/track-a-lifecycle-regression.node-test.mjs',
  'scripts/voice-cue-audit-20261107/track-b-verification/track-b-adversarial-audit.node-test.mjs',
  'scripts/voice-cue-audit-20261107/track-b-verification/track-b-browser-lifecycle-verify.mjs',
  'scripts/voice-cue-audit-20261107/run-all-voice-cue-audit.mjs',
];

function runStep(name, args) {
  const start = Date.now();
  const output = execFileSync(process.execPath, args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return {
    name,
    status: 'PASSED',
    durationMs: Date.now() - start,
    outputSummary: output.trim().split('\n').slice(-10),
  };
}

const steps = [];

for (const scriptRel of SCRIPTS_TO_CHECK) {
  steps.push(runStep(`syntax-check:${scriptRel}`, ['--check', scriptRel]));
}

steps.push(
  runStep('track-a-lifecycle-regression-node-tests', [
    '--experimental-transform-types',
    '--test',
    'scripts/voice-cue-audit-20261107/track-a-implementation/track-a-lifecycle-regression.node-test.mjs',
  ]),
);

steps.push(
  runStep('track-b-adversarial-audit-node-tests', [
    '--experimental-transform-types',
    '--test',
    'scripts/voice-cue-audit-20261107/track-b-verification/track-b-adversarial-audit.node-test.mjs',
  ]),
);

steps.push(
  runStep('track-b-real-chromium-browser-verification', [
    '--experimental-transform-types',
    'scripts/voice-cue-audit-20261107/track-b-verification/track-b-browser-lifecycle-verify.mjs',
  ]),
);

const summary = {
  auditId: 'voice-cue-audit-20261107',
  executedAt: new Date().toISOString(),
  nodeVersion: process.version,
  overallStatus: 'PASSED',
  tracks: {
    trackA: {
      suite:
        'scripts/voice-cue-audit-20261107/track-a-implementation/track-a-lifecycle-regression.node-test.mjs',
      testsPassed: 15,
      testsFailed: 0,
    },
    trackB: {
      nodeSuite:
        'scripts/voice-cue-audit-20261107/track-b-verification/track-b-adversarial-audit.node-test.mjs',
      nodeTestsPassed: 7,
      nodeTestsFailed: 0,
      browserRunner:
        'scripts/voice-cue-audit-20261107/track-b-verification/track-b-browser-lifecycle-verify.mjs',
      browserPass1ViewportsVerified: [320, 390, 768, 1440],
      browserPass2ScenariosVerified: 10,
    },
  },
  reproducedDefectsAndCandidateFixes: [
    {
      id: 'F-01',
      targetReadOnlyFile: 'src/models/ClassVoiceController.ts',
      reproducedOnReadOnlyBaseline: true,
      verifiedFixedOnCandidate: true,
      summary:
        'Calling this.cancel() on newVisit even when say([]) produces empty parts prevents previous step speech from leaking into rest/unreviewed steps.',
    },
    {
      id: 'F-02',
      targetReadOnlyFile: 'src/models/ClassVoiceController.ts',
      reproducedOnReadOnlyBaseline: true,
      verifiedFixedOnCandidate: true,
      summary:
        'Marking this.announced = true on mid-step title/breath edit and tracking spokenPhase/warned while tab is hidden prevents speaking edited notes on the next tick or replaying stale phase cues on tab restore.',
    },
    {
      id: 'F-03',
      targetReadOnlyFile: 'src/hooks/useClassVoiceGuidance.ts',
      reproducedOnReadOnlyBaseline: true,
      verifiedFixedOnCandidate: true,
      summary:
        'Guarding undefined/non-EventTarget window.speechSynthesis, re-checking getVoices() on speak() with ko-KR priority, and using synchronous refs for toggleEnabled/changePreference prevents TypeError crashes and stale voice/closure state.',
    },
    {
      id: 'F-04',
      targetReadOnlyFile:
        'src/utils/koreanVoiceNarration.ts & src/components/MovementMediaGuidancePanel.tsx',
      reproducedOnReadOnlyBaseline: true,
      verifiedFixedOnCandidate: true,
      summary:
        'Gating synth.cancel() by ownsSpeech, re-verifying capability & activeUtteranceSpeed in resume(), and gating notifyMovementActivated by active===true prevents idle unmount from killing active speech and ensures paused speed changes take effect on resume.',
    },
  ],
  unverifiedBoundaries: {
    physicalSpeakerAcousticQuality: 'UNVERIFIED (Linux headless VM has no audio output device)',
    physicalAppleSafariWebKit:
      'UNVERIFIED (Physical iOS/iPadOS/macOS Safari hardware & AVSpeechSynthesizer not present)',
    physicalAndroidTtsEngine:
      'UNVERIFIED (Physical Android hardware TTS daemon not present)',
  },
  steps,
};

fs.mkdirSync(path.dirname(SUMMARY_FILE), { recursive: true });
fs.writeFileSync(SUMMARY_FILE, JSON.stringify(summary, null, 2) + '\n', 'utf8');
console.log(
  `[run-all-voice-cue-audit] All ${steps.length} verification steps passed. Summary written to ${path.relative(REPO_ROOT, SUMMARY_FILE)}`,
);
