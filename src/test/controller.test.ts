import { describe, expect, it } from "vitest";
import { DraftPlaybackController } from "../models/DraftPlaybackController";

function fixture() {
  let serial = 0;
  let allowed = true;
  const frames = new Map<number, FrameRequestCallback>();
  const controller = new DraftPlaybackController({
    requestFrame: (callback) => {
      frames.set(++serial, callback);
      return serial;
    },
    cancelFrame: (id) => {
      frames.delete(id);
    },
    onChange: () => {},
    canPlay: () => allowed,
  });
  return {
    controller,
    frames,
    allow: (value: boolean) => {
      allowed = value;
    },
    frame: (time: number) => {
      const [id, callback] = frames.entries().next().value ?? [];
      if (callback) {
        frames.delete(id!);
        callback(time);
      }
    },
  };
}
describe("typed illustration controller", () => {
  it("starts paused and stops after one actual cycle without looping", () => {
    const f = fixture();
    expect(f.controller.state()).toEqual({
      progress: 0,
      speed: 1,
      playing: false,
    });
    expect(f.frames.size).toBe(0);
    f.controller.play();
    f.frame(0);
    f.frame(4000);
    expect(f.controller.state().progress).toBe(0.5);
    f.frame(8000);
    expect(f.controller.state()).toEqual({
      progress: 1,
      speed: 1,
      playing: false,
    });
    expect(f.frames.size).toBe(0);
  });
  it("pauses, seeks and resets without scheduling hidden work", () => {
    const f = fixture();
    f.controller.play();
    f.frame(0);
    f.frame(1000);
    f.controller.pause();
    expect(f.controller.state().progress).toBe(0.125);
    expect(f.frames.size).toBe(0);
    f.controller.seek(0.51);
    expect(f.controller.state().playing).toBe(false);
    f.controller.reset();
    expect(f.controller.state().progress).toBe(0);
    f.controller.play();
    f.controller.destroy();
    expect(f.frames.size).toBe(0);
  });
  it("uses .5/.75/1 only as illustration speed and stops when permission is removed", () => {
    const f = fixture();
    f.controller.setSpeed(0.5);
    f.controller.play();
    f.frame(0);
    f.frame(4000);
    expect(f.controller.state().progress).toBe(0.25);
    f.controller.setSpeed(0.75);
    f.frame(8000);
    expect(f.controller.state().progress).toBe(0.625);
    f.allow(false);
    f.frame(9000);
    expect(f.controller.state().playing).toBe(false);
    expect(f.frames.size).toBe(0);
    expect(f.controller.play()).toBe(false);
    expect(() => f.controller.setSpeed(2)).toThrow(RangeError);
  });
});
