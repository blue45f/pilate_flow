/**
 * Zero-cost local browser sensory cue engine (Web Audio API gentle studio chime + Mobile Haptics)
 * for LiveStageView (P09). Never makes network calls or uses paid APIs, stays completely silent
 * until explicitly opted in by the instructor, and fails quietly on unsupported browsers/jsdom.
 */

export type LiveSensoryCueKind =
  | 'phase-active'
  | 'side-switch'
  | 'countdown-10s'
  | 'step-complete'
  | 'manual-test';

const VIBRATION_PATTERNS: Record<LiveSensoryCueKind, number[]> = {
  'phase-active': [55],
  'side-switch': [85, 55, 85],
  'countdown-10s': [45, 45, 110],
  'step-complete': [130, 60, 130],
  'manual-test': [50, 40, 70],
};

const TONE_SEQUENCES: Record<
  LiveSensoryCueKind,
  ReadonlyArray<{ readonly freq: number; readonly delaySec: number; readonly durationSec: number }>
> = {
  'phase-active': [{ freq: 528, delaySec: 0, durationSec: 0.16 }],
  'side-switch': [
    { freq: 587.33, delaySec: 0, durationSec: 0.13 },
    { freq: 659.25, delaySec: 0.16, durationSec: 0.16 },
  ],
  'countdown-10s': [
    { freq: 440, delaySec: 0, durationSec: 0.09 },
    { freq: 440, delaySec: 0.14, durationSec: 0.09 },
  ],
  'step-complete': [
    { freq: 523.25, delaySec: 0, durationSec: 0.16 },
    { freq: 783.99, delaySec: 0.14, durationSec: 0.24 },
  ],
  'manual-test': [
    { freq: 528, delaySec: 0, durationSec: 0.12 },
    { freq: 659.25, delaySec: 0.14, durationSec: 0.16 },
  ],
};

let sharedAudioCtx: AudioContext | null = null;

function getAudioContextSafe(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    ((window as unknown as Record<string, unknown>).webkitAudioContext as
      | typeof AudioContext
      | undefined);
  if (typeof Ctor !== 'function') return null;
  try {
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new Ctor();
    }
    if (sharedAudioCtx.state === 'suspended') {
      void sharedAudioCtx.resume?.().catch(() => undefined);
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

export function triggerLiveSensoryCue(kind: LiveSensoryCueKind): {
  readonly vibrated: boolean;
  readonly chimed: boolean;
} {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    return { vibrated: false, chimed: false };
  }

  let vibrated = false;
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      vibrated = Boolean(navigator.vibrate(VIBRATION_PATTERNS[kind]));
    } catch {
      vibrated = false;
    }
  }

  let chimed = false;
  const ctx = getAudioContextSafe();
  if (ctx) {
    try {
      const now = ctx.currentTime;
      for (const note of TONE_SEQUENCES[kind]) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.freq, now + note.delaySec);
        gain.gain.setValueAtTime(0.0001, now + note.delaySec);
        gain.gain.exponentialRampToValueAtTime(0.11, now + note.delaySec + 0.02);
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          now + note.delaySec + note.durationSec,
        );
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + note.delaySec);
        osc.stop(now + note.delaySec + note.durationSec + 0.02);
      }
      chimed = true;
    } catch {
      chimed = false;
    }
  }

  return { vibrated, chimed };
}

export function silenceLiveSensoryCue(): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(0);
    } catch {
      // Ignore vibration cancellation errors
    }
  }
}

export function computeSpringTransitionDelta(
  currentSpringsRaw: string,
  nextSpringsRaw: string,
  currentApparatus?: string,
  nextApparatus?: string,
): {
  readonly changed: boolean;
  readonly summaryKo: string;
} {
  const cur = currentSpringsRaw.trim();
  const nxt = nextSpringsRaw.trim();
  if (currentApparatus && nextApparatus && currentApparatus !== nextApparatus) {
    return {
      changed: true,
      summaryKo: `기구 이동 · ${nxt || '세팅 확인'}`,
    };
  }
  if (!nxt) {
    return { changed: false, summaryKo: '다음 스프링 별도 확인' };
  }
  if (!cur) {
    return { changed: true, summaryKo: `다음 스프링 · ${nxt}` };
  }
  const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase();
  if (norm(cur) === norm(nxt)) {
    return { changed: false, summaryKo: `스프링 유지 (${nxt})` };
  }
  return {
    changed: true,
    summaryKo: `스프링 변경: ${cur} → ${nxt}`,
  };
}
