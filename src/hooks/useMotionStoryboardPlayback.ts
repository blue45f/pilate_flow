import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";

export type StoryboardPlaybackSpeed = 0.5 | 0.75 | 1;

export interface StoryboardPlaybackState {
  elapsedSeconds: number;
  speed: StoryboardPlaybackSpeed;
  playing: boolean;
  pauseReason?: "block-boundary" | "frame-delay";
}

export interface MotionStoryboardPlaybackOptions {
  totalSeconds: number;
  snapshotKey: string;
  active: boolean;
  sceneRef: RefObject<HTMLElement | null>;
  blockStarts?: readonly number[];
  pauseBeforeBlocks?: boolean;
  guardFrameGaps?: boolean;
}

export const STORYBOARD_FRAME_GAP_LIMIT_MS = 1000;

/** Private clock: a single requestAnimationFrame chain, no timer and no looping. */
class StoryboardClock {
  private state: StoryboardPlaybackState = {
    elapsedSeconds: 0,
    speed: 1,
    playing: false,
  };
  private frameId: number | null = null;
  private lastTimestamp: number | null = null;
  private duration = 0;
  private snapshotKey = "";
  private canPlay = () => false;
  private presentationKey = "";
  private blockStarts: readonly number[] = [];
  private pauseBeforeBlocks = false;
  private guardFrameGaps = false;

  constructor(
    private readonly changed: (state: StoryboardPlaybackState) => void,
  ) {}

  setCanPlay(guard: () => boolean) {
    this.canPlay = guard;
  }

  configure(totalSeconds: number, snapshotKey: string) {
    const duration = Number.isFinite(totalSeconds)
      ? Math.max(0, totalSeconds)
      : 0;
    if (this.snapshotKey !== snapshotKey || this.duration !== duration) {
      this.duration = duration;
      this.snapshotKey = snapshotKey;
      this.reset();
    }
  }

  configurePresentation(
    blockStarts: readonly number[],
    pauseBeforeBlocks: boolean,
    guardFrameGaps: boolean,
  ) {
    const starts = [
      ...new Set(
        blockStarts.filter((value) => Number.isFinite(value) && value > 0),
      ),
    ].sort((a, b) => a - b);
    const key = JSON.stringify([starts, pauseBeforeBlocks, guardFrameGaps]);
    if (key === this.presentationKey) return;
    this.pause();
    this.presentationKey = key;
    this.blockStarts = starts;
    this.pauseBeforeBlocks = pauseBeforeBlocks;
    this.guardFrameGaps = guardFrameGaps;
  }

  private publish(patch: Partial<StoryboardPlaybackState>) {
    this.state = { ...this.state, ...patch };
    if (this.state.pauseReason === undefined) delete this.state.pauseReason;
    this.changed(this.state);
  }

  private cancel() {
    if (this.frameId !== null) window.cancelAnimationFrame(this.frameId);
    this.frameId = null;
    this.lastTimestamp = null;
  }

  pause = () => {
    this.cancel();
    if (this.state.playing || this.state.pauseReason)
      this.publish({ playing: false, pauseReason: undefined });
  };

  reset = () => {
    this.cancel();
    this.publish({ elapsedSeconds: 0, playing: false, pauseReason: undefined });
  };

  seek = (elapsedSeconds: number) => {
    this.cancel();
    this.publish({
      elapsedSeconds: Number.isFinite(elapsedSeconds)
        ? Math.min(this.duration, Math.max(0, elapsedSeconds))
        : 0,
      playing: false,
      pauseReason: undefined,
    });
  };

  setSpeed = (speed: StoryboardPlaybackSpeed) => {
    this.pause();
    if (speed === 0.5 || speed === 0.75 || speed === 1) this.publish({ speed });
  };

  play = () => {
    if (this.state.playing || this.duration <= 0 || !this.canPlay()) return;
    this.lastTimestamp = null;
    this.publish({
      elapsedSeconds:
        this.state.elapsedSeconds >= this.duration
          ? 0
          : this.state.elapsedSeconds,
      playing: true,
      pauseReason: undefined,
    });
    this.schedule();
  };

  private schedule() {
    if (this.frameId === null && this.state.playing) {
      this.frameId = window.requestAnimationFrame(this.tick);
    }
  }

  private tick = (timestamp: number) => {
    this.frameId = null;
    if (!this.state.playing) return;
    if (!this.canPlay() || !Number.isFinite(timestamp)) {
      this.pause();
      return;
    }
    const elapsed =
      this.lastTimestamp === null
        ? 0
        : Math.max(0, timestamp - this.lastTimestamp);
    if (this.guardFrameGaps && elapsed > STORYBOARD_FRAME_GAP_LIMIT_MS) {
      this.lastTimestamp = null;
      this.publish({ playing: false, pauseReason: "frame-delay" });
      return;
    }
    this.lastTimestamp = Math.max(this.lastTimestamp ?? timestamp, timestamp);
    const elapsedSeconds = Math.min(
      this.duration,
      this.state.elapsedSeconds + (elapsed / 1000) * this.state.speed,
    );
    const boundary = this.pauseBeforeBlocks
      ? this.blockStarts.find(
          (value) =>
            value > this.state.elapsedSeconds + 1e-9 &&
            value < this.duration &&
            value <= elapsedSeconds,
        )
      : undefined;
    if (boundary !== undefined) {
      this.lastTimestamp = null;
      this.publish({
        elapsedSeconds: boundary,
        playing: false,
        pauseReason: "block-boundary",
      });
      return;
    }
    const playing = elapsedSeconds < this.duration;
    this.publish({ elapsedSeconds, playing });
    if (playing) this.schedule();
    else this.lastTimestamp = null;
  };
}

export function useMotionStoryboardPlayback({
  totalSeconds,
  snapshotKey,
  active,
  sceneRef,
  blockStarts = [],
  pauseBeforeBlocks = false,
  guardFrameGaps = false,
}: MotionStoryboardPlaybackOptions) {
  const [state, setState] = useState<StoryboardPlaybackState>({
    elapsedSeconds: 0,
    speed: 1,
    playing: false,
  });
  const [query] = useState(() =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null,
  );
  const [reducedMotion, setReducedMotion] = useState(query?.matches ?? false);
  const presentationKey = JSON.stringify([
    blockStarts,
    pauseBeforeBlocks,
    guardFrameGaps,
  ]);
  const presentation = useMemo(
    () => JSON.parse(presentationKey) as [number[], boolean, boolean],
    [presentationKey],
  );
  const inView = useRef(true);
  const [controller] = useState(() => new StoryboardClock(setState));

  useLayoutEffect(() => {
    controller.setCanPlay(() => {
      const dialog = sceneRef.current?.closest("dialog");
      return (
        active &&
        !document.hidden &&
        !query?.matches &&
        inView.current &&
        (!dialog || dialog.open)
      );
    });
    controller.configure(totalSeconds, snapshotKey);
    controller.configurePresentation(...presentation);
    if (!active) controller.pause();
    return () => {
      controller.setCanPlay(() => false);
      controller.pause();
    };
  }, [
    active,
    controller,
    query,
    sceneRef,
    snapshotKey,
    totalSeconds,
    presentation,
  ]);

  useEffect(() => {
    const change = (event: MediaQueryListEvent) => {
      if (event.matches) controller.pause();
      setReducedMotion(event.matches);
    };
    query?.addEventListener("change", change);
    return () => query?.removeEventListener("change", change);
  }, [controller, query]);

  useEffect(() => {
    const visibilityChanged = () => {
      if (document.hidden) controller.pause();
    };
    const pageHidden = () => controller.pause();
    const observer =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(([entry]) => {
            if (!entry) return;
            inView.current = entry.isIntersecting;
            if (!entry.isIntersecting) controller.pause();
          })
        : null;
    const scene = sceneRef.current;
    if (scene) observer?.observe(scene);
    document.addEventListener("visibilitychange", visibilityChanged);
    window.addEventListener("pagehide", pageHidden);
    return () => {
      controller.pause();
      observer?.disconnect();
      document.removeEventListener("visibilitychange", visibilityChanged);
      window.removeEventListener("pagehide", pageHidden);
    };
  }, [controller, sceneRef]);

  return { state, controller, reducedMotion };
}
