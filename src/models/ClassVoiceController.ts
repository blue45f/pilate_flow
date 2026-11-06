export interface ClassVoiceSnapshot {
  stepKey: string;
  title: string;
  breath: string;
  phase: string;
  remainingSec: number;
  nextTitle: string;
  running: boolean;
  eligible: boolean;
  visible: boolean;
}
export interface ClassVoicePreferences {
  movement: boolean;
  breath: boolean;
  time: boolean;
}
export interface ClassVoicePort {
  speak: (text: string) => void;
  cancel: () => void;
}

const durationText = (seconds: number) => {
  const value = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(value / 60);
  const remainder = value % 60;
  return (
    [minutes ? `${minutes}분` : '', remainder ? `${remainder}초` : ''].filter(Boolean).join(' ') ||
    '0초'
  );
};

/** Session-only guidance. No timer, network, stored consent, or exercise generation. */
export class ClassVoiceController {
  private enabled = false;
  private previous: ClassVoiceSnapshot | null = null;
  private announced = false;
  private spokenPhase = '';
  private warned = false;
  private ownsSpeech = false;
  private preferences: ClassVoicePreferences = { movement: true, breath: true, time: true };
  constructor(private readonly port: ClassVoicePort) {}
  cancel() {
    if (this.ownsSpeech) this.port.cancel();
    this.ownsSpeech = false;
  }
  setEnabled(enabled: boolean, snapshot: ClassVoiceSnapshot) {
    this.enabled = enabled;
    this.cancel();
    if (enabled) {
      this.announced = false;
      this.spokenPhase = '';
    }
    this.update(snapshot);
  }
  setPreferences(preferences: ClassVoicePreferences) {
    this.preferences = preferences;
    this.cancel();
  }
  private say(parts: string[]) {
    const text = parts
      .map((part) => part.trim())
      .filter(Boolean)
      .join(' ');
    if (!text) return;
    this.cancel();
    this.ownsSpeech = true;
    this.port.speak(text);
  }
  update(snapshot: ClassVoiceSnapshot) {
    const previous = this.previous;
    this.previous = snapshot;
    const newVisit =
      !previous ||
      previous.stepKey !== snapshot.stepKey ||
      (previous.remainingSec === 0 && snapshot.remainingSec > 0);
    if (newVisit) {
      this.announced = false;
      this.spokenPhase = '';
      this.warned = false;
    } else if (snapshot.remainingSec > previous.remainingSec + 10) {
      this.warned = false;
    }
    // Do not finish speaking a note that changed or lost its review while playing.
    // A content edit does not itself request a new spoken instruction.
    if (
      previous &&
      previous.stepKey === snapshot.stepKey &&
      (previous.title !== snapshot.title || previous.breath !== snapshot.breath)
    ) {
      this.cancel();
      this.spokenPhase = snapshot.phase;
      return;
    }
    if (!this.enabled || !snapshot.eligible || !snapshot.visible) {
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
      // A late enable never queues a stale ten-second alert behind the current cue.
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
