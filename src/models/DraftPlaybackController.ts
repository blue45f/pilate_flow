export type DraftSpeed = 0.5 | 0.75 | 1;
export type DraftRepeatCount = 1 | 2 | 3;
export interface DraftPlaybackState {
  progress: number;
  speed: DraftSpeed;
  playing: boolean;
}
export interface DraftControllerOptions {
  requestFrame: (callback: FrameRequestCallback) => number;
  cancelFrame: (id: number) => void;
  onChange: (state: DraftPlaybackState) => void;
  canPlay: () => boolean;
  cycleMs?: number;
}

/** Illustration timing only. Repetition, cadence and exercise duration are never inferred. */
export class DraftPlaybackController {
  private progress = 0;
  private speed: DraftSpeed = 1;
  private repeat: DraftRepeatCount = 1;
  private completedCycles = 0;
  private playing = false;
  private frame: number | null = null;
  private lastTime: number | null = null;
  private readonly options: DraftControllerOptions;
  constructor(options: DraftControllerOptions) {
    this.options = options;
  }
  setCanPlay(guard: () => boolean) {
    this.options.canPlay = guard;
  }
  state(): DraftPlaybackState {
    return {
      progress: this.progress,
      speed: this.speed,
      playing: this.playing,
    };
  }
  repeatCount(): DraftRepeatCount {
    return this.repeat;
  }
  currentCycle(): number {
    return Math.min(this.repeat, this.completedCycles + 1);
  }
  private emit() {
    this.options.onChange(this.state());
  }
  private cancel() {
    if (this.frame !== null) this.options.cancelFrame(this.frame);
    this.frame = null;
    this.lastTime = null;
  }
  pause() {
    this.playing = false;
    this.cancel();
    this.emit();
  }
  seek(value: number) {
    this.playing = false;
    this.cancel();
    this.completedCycles = 0;
    this.progress = Number.isFinite(value)
      ? Math.max(0, Math.min(1, value))
      : 0;
    this.emit();
  }
  reset() {
    this.seek(0);
  }
  setSpeed(value: number) {
    if (![0.5, 0.75, 1].includes(value))
      throw new RangeError("Unsupported illustration speed");
    this.speed = value as DraftSpeed;
    this.emit();
  }
  setRepeatCount(value: number) {
    if (![1, 2, 3].includes(value))
      throw new RangeError("Unsupported illustration repeat count");
    this.repeat = value as DraftRepeatCount;
    this.seek(0);
  }
  play() {
    if (this.playing || !this.options.canPlay()) return false;
    if (this.progress >= 1) {
      this.progress = 0;
      this.completedCycles = 0;
    }
    this.playing = true;
    this.lastTime = null;
    this.emit();
    this.schedule();
    return true;
  }
  private schedule() {
    this.frame = this.options.requestFrame((time) => this.tick(time));
  }
  private tick(time: number) {
    this.frame = null;
    if (!this.playing || !this.options.canPlay()) {
      this.pause();
      return;
    }
    if (this.lastTime !== null) {
      let nextProgress =
        this.progress +
        (Math.max(0, time - this.lastTime) * this.speed) /
          (this.options.cycleMs ?? 8000);
      while (nextProgress >= 1 && this.completedCycles + 1 < this.repeat) {
        this.completedCycles += 1;
        nextProgress -= 1;
      }
      this.progress = Math.min(1, nextProgress);
    }
    this.lastTime = time;
    if (this.progress >= 1) {
      this.progress = 1;
      this.pause();
      return;
    }
    this.emit();
    this.schedule();
  }
  destroy() {
    this.playing = false;
    this.cancel();
  }
}
