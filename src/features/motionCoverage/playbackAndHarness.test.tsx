import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MOVEMENT_VISUAL_ASSET_MAP } from '../../data/movementVisualRigCatalog';
import { INITIAL_EXERCISES } from '../../data/pilatesCatalog';
import { getExerciseEvidence } from '../../utils/exerciseEvidence';
import {
  DRAFT_REPEAT_COUNTS,
  DRAFT_SPEEDS,
  MOTION_COVERAGE_HARNESS_REPRESENTATIVE_TARGETS,
  MotionCoveragePlaybackController,
  MotionCoveragePreviewHarness,
  mountMotionCoveragePreviewHarness,
  runMotionCoverageCatalogSweep,
} from './index';

function createInjectableFrameRig(initialClockMs = 1000) {
  const frames = new Map<number, FrameRequestCallback>();
  let nextHandle = 1;
  let nowMs = initialClockMs;

  const requestFrame = vi.fn((cb: FrameRequestCallback) => {
    const handle = nextHandle++;
    frames.set(handle, cb);
    return handle;
  });

  const cancelFrame = vi.fn((handle: number) => {
    frames.delete(handle);
  });

  const stepFrame = (timestampMs?: number) => {
    if (timestampMs !== undefined) {
      nowMs = timestampMs;
    }
    const callbacks = [...frames.entries()];
    frames.clear();
    for (const [, cb] of callbacks) {
      cb(nowMs);
    }
  };

  return {
    frames,
    requestFrame,
    cancelFrame,
    now: () => nowMs,
    setNow: (ms: number) => {
      nowMs = ms;
    },
    stepFrame,
  };
}

describe('motionCoverage playbackController (Part A) & MotionCoveragePreviewHarness (Part B)', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('1. supports play/pause/seek/speed/repeat/restart with finite progress 0..1 on continuous drafts (projected-3d & continuous-2d)', () => {
    const rig = createInjectableFrameRig(1000);
    const snapshots: Array<ReturnType<MotionCoveragePlaybackController['getSnapshot']>> = [];

    const controller = new MotionCoveragePlaybackController({
      exerciseOrId: 'original-mat-quadruped-reach', // projected-3d (quadruped-arm-slide, quadruped-leg-slide)
      cycleDurationMs: 8000,
      requestFrame: rig.requestFrame,
      cancelFrame: rig.cancelFrame,
      now: rig.now,
      isReducedMotion: () => false,
      isDocumentHidden: () => false,
      onChange: (snap) => snapshots.push(snap),
    });

    const initial = controller.getSnapshot();
    expect(initial.mode).toBe('projected-3d');
    expect(initial.controlKind).toBe('continuous-draft-playback');
    expect(initial.isContinuousInterpolated).toBe(true);
    expect(initial.isAutoInterpolatedFromDiscrete).toBe(false);
    expect(initial.progress).toBe(0);
    expect(initial.playing).toBe(false);
    expect(initial.availableVariantIds).toEqual(['quadruped-arm-slide', 'quadruped-leg-slide']);
    expect(initial.canonicalMotionReady).toBe(false);
    expect(initial.manualReady).toBe(false);
    expect(initial.true3dSupported).toBe(false);

    // Play & advance frames
    expect(controller.play({ explicitUserAction: true })).toBe(true);
    expect(controller.getSnapshot().playing).toBe(true);
    expect(rig.frames.size).toBe(1);

    rig.stepFrame(1000); // anchor frame (progress = 0)
    expect(controller.getSnapshot().progress).toBe(0);

    rig.stepFrame(3000); // +2000ms at 1x speed over 8000ms -> 0.25
    expect(controller.getSnapshot().progress).toBeCloseTo(0.25, 5);
    expect(controller.getSnapshot().selectedPhase).toBe('middle');

    // Change speed to 0.5x
    controller.setSpeed(0.5);
    expect(controller.getSnapshot().speed).toBe(0.5);
    rig.stepFrame(5000); // +2000ms at 0.5x speed -> +1000ms / 8000ms = +0.125 -> 0.375
    expect(controller.getSnapshot().progress).toBeCloseTo(0.375, 5);

    // Seek to 0.8 (automatically pauses and cancels pending RAF)
    controller.seek(0.8);
    expect(controller.getSnapshot().playing).toBe(false);
    expect(controller.getSnapshot().progress).toBeCloseTo(0.8, 5);
    expect(controller.getSnapshot().selectedPhase).toBe('end');
    expect(controller.hasPendingFrame()).toBe(false);
    expect(rig.frames.size).toBe(0);

    // Restart resets to 0
    controller.restart();
    expect(controller.getSnapshot().progress).toBe(0);
    expect(controller.getSnapshot().selectedPhase).toBe('start');
    expect(controller.getSnapshot().playing).toBe(false);

    // Switch to continuous-2d (original-mat-ankle-reach -> supported-heel-raise)
    const ankleSnap = controller.switchExercise('original-mat-ankle-reach');
    expect(ankleSnap.mode).toBe('continuous-2d');
    expect(ankleSnap.controlKind).toBe('continuous-draft-playback');
    expect(ankleSnap.activeVariantId).toBe('supported-heel-raise');
    expect(controller.play({ explicitUserAction: true })).toBe(true);
    rig.stepFrame(6000);
    rig.stepFrame(10000); // +4000ms at 0.5x -> +2000ms / 8000ms = 0.25
    expect(controller.getSnapshot().progress).toBeCloseTo(0.25, 5);

    controller.destroy();
    expect(snapshots.length).toBeGreaterThan(0);
  });

  it('2. never auto-interpolates or plays any of the 77 discrete three-phase-2d exercises, supporting discrete step selection only', () => {
    const rig = createInjectableFrameRig(1000);
    const controller = new MotionCoveragePlaybackController({
      exerciseOrId: 'ex-warmup-01',
      requestFrame: rig.requestFrame,
      cancelFrame: rig.cancelFrame,
      now: rig.now,
      isReducedMotion: () => false,
      isDocumentHidden: () => false,
    });

    const discreteIds: string[] = [];
    for (const exercise of INITIAL_EXERCISES) {
      const snap = controller.switchExercise(exercise.id);
      if (snap.mode === 'three-phase-2d') {
        discreteIds.push(exercise.id);
        expect(snap.controlKind).toBe('discrete-three-phase-selector');
        expect(snap.isContinuousInterpolated).toBe(false);
        expect(snap.isAutoInterpolatedFromDiscrete).toBe(false);
        expect(snap.progress).toBeNull();
        expect(snap.playing).toBe(false);

        // Attempting play() or requestAutoPlay() must be rejected with 0 RAF scheduled
        expect(controller.requestAutoPlay()).toBe(false);
        expect(controller.play({ explicitUserAction: true })).toBe(false);
        expect(controller.getSnapshot().playing).toBe(false);
        expect(controller.getSnapshot().progress).toBeNull();
        expect(rig.frames.size).toBe(0);

        // Discrete phase selection works cleanly
        expect(controller.getSnapshot().selectedPhase).toBe('start');
        expect(controller.nextPhase()).toBe('middle');
        expect(controller.getSnapshot().selectedPhase).toBe('middle');
        expect(controller.nextPhase()).toBe('end');
        expect(controller.getSnapshot().selectedPhase).toBe('end');
        expect(controller.prevPhase()).toBe('middle');
        controller.restart();
        expect(controller.getSnapshot().selectedPhase).toBe('start');

        // Confirm exact asset reference identity with MOVEMENT_VISUAL_ASSET_MAP
        expect(
          snap.descriptor.mode === 'three-phase-2d' &&
            snap.descriptor.asset === MOVEMENT_VISUAL_ASSET_MAP.get(exercise.id),
        ).toBe(true);
      }
    }

    expect(discreteIds).toHaveLength(77);
    controller.destroy();
  });

  it('3. handles invalid speed/repeatCount, NaN, ±Infinity, regressive clock, endpoint, and multi-cycle loop boundaries safely', () => {
    const rig = createInjectableFrameRig(1000);
    const controller = new MotionCoveragePlaybackController({
      exerciseOrId: 'original-mat-quadruped-reach',
      cycleDurationMs: 4000,
      requestFrame: rig.requestFrame,
      cancelFrame: rig.cancelFrame,
      now: rig.now,
      isReducedMotion: () => false,
      isDocumentHidden: () => false,
    });

    // Verify exact allowed constants DRAFT_SPEEDS = [0.5, 0.75, 1] and DRAFT_REPEAT_COUNTS = [1, 2, 3]
    expect(DRAFT_SPEEDS).toEqual([0.5, 0.75, 1]);
    expect(DRAFT_REPEAT_COUNTS).toEqual([1, 2, 3]);

    for (const validSpeed of DRAFT_SPEEDS) {
      controller.setSpeed(validSpeed);
      expect(controller.getSnapshot().speed).toBe(validSpeed);
    }
    controller.setSpeed(1);

    for (const validRepeat of DRAFT_REPEAT_COUNTS) {
      controller.setRepeatCount(validRepeat);
      expect(controller.getSnapshot().repeatCount).toBe(validRepeat);
    }
    controller.setRepeatCount(1);

    // Invalid speeds must throw RangeError and keep speed = 1
    for (const badSpeed of [0, -1, 0.25, 1.25, 2, NaN, Infinity, -Infinity]) {
      expect(() => controller.setSpeed(badSpeed)).toThrow(RangeError);
      expect(controller.getSnapshot().speed).toBe(1);
    }

    // Invalid repeat counts (outside [1, 2, 3]) must throw RangeError and keep repeatCount = 1
    for (const badRepeat of [0, -2, 1.5, 4, NaN, Infinity, -Infinity]) {
      expect(() => controller.setRepeatCount(badRepeat)).toThrow(RangeError);
      expect(controller.getSnapshot().repeatCount).toBe(1);
    }

    // Seek with NaN, -Infinity, +Infinity, <0, >1 clamps to finite [0, 1]
    controller.seek(NaN);
    expect(controller.getSnapshot().progress).toBe(0);
    controller.seek(-Infinity);
    expect(controller.getSnapshot().progress).toBe(0);
    controller.seek(Infinity);
    expect(controller.getSnapshot().progress).toBe(1);
    controller.seek(-5);
    expect(controller.getSnapshot().progress).toBe(0);
    controller.seek(99);
    expect(controller.getSnapshot().progress).toBe(1);

    // Multi-cycle loop boundary (repeatCount = 2, cycleDurationMs = 4000)
    controller.restart();
    controller.setRepeatCount(2);
    expect(controller.play({ explicitUserAction: true })).toBe(true);

    rig.stepFrame(1000); // anchor t = 1000, progress = 0, cycle = 1
    expect(controller.getSnapshot().currentCycle).toBe(1);

    // Corrupt frame timestamps (NaN, Infinity, -Infinity) must not corrupt progress
    rig.stepFrame(NaN);
    expect(Number.isFinite(controller.getSnapshot().progress)).toBe(true);
    expect(controller.getSnapshot().progress).toBe(0);

    rig.stepFrame(Infinity);
    expect(Number.isFinite(controller.getSnapshot().progress)).toBe(true);
    expect(controller.getSnapshot().progress).toBe(0);

    rig.stepFrame(-Infinity);
    expect(Number.isFinite(controller.getSnapshot().progress)).toBe(true);
    expect(controller.getSnapshot().progress).toBe(0);

    // Advance to t = 3000 (+2000ms / 4000ms = 0.5 in cycle 1)
    rig.stepFrame(3000);
    expect(controller.getSnapshot().progress).toBeCloseTo(0.5, 5);
    expect(controller.getSnapshot().currentCycle).toBe(1);

    // Regressive clock (t = 1800 < 3000): must NOT move progress backward or rebase downward
    rig.stepFrame(1800);
    expect(controller.getSnapshot().progress).toBeCloseTo(0.5, 5);
    // Returning to t = 3000 must still be 0.5 (zero false jump)
    rig.stepFrame(3000);
    expect(controller.getSnapshot().progress).toBeCloseTo(0.5, 5);

    // Cross cycle 1 -> cycle 2 boundary at t = 5500 (+2500ms / 4000ms = +0.625 -> total 1.125 -> cycle 2, progress 0.125)
    rig.stepFrame(5500);
    expect(controller.getSnapshot().currentCycle).toBe(2);
    expect(controller.getSnapshot().progress).toBeCloseTo(0.125, 5);
    expect(controller.getSnapshot().playing).toBe(true);

    // Reach end of repeatCount = 2 at t = 9500 (+4000ms -> total >= 2.0 -> progress = 1, playing = false, completedCycle = true)
    rig.stepFrame(9500);
    const endSnap = controller.getSnapshot();
    expect(endSnap.progress).toBe(1);
    expect(endSnap.playing).toBe(false);
    expect(endSnap.completedCycle).toBe(true);
    expect(rig.frames.size).toBe(0);

    // Calling play() at endpoint (progress = 1) restarts cleanly from 0
    expect(controller.play({ explicitUserAction: true })).toBe(true);
    expect(controller.getSnapshot().progress).toBe(0);
    expect(controller.getSnapshot().playing).toBe(true);

    controller.destroy();
  });

  it('4. cleans up RAF and listeners on pause, switchExercise, background tab (visibilitychange/pagehide), reduced-motion, and destroy', () => {
    const rig = createInjectableFrameRig(1000);
    let reducedMotion = true;
    let docHidden = false;
    const handlers: {
      mediaChange?: (ev: MediaQueryListEvent) => void;
      visibility?: () => void;
      pagehide?: () => void;
      pageshow?: () => void;
    } = {};

    const fakeWindow = {
      addEventListener: vi.fn((name: string, cb: () => void) => {
        if (name === 'pagehide') handlers.pagehide = cb;
        if (name === 'pageshow') handlers.pageshow = cb;
      }),
      removeEventListener: vi.fn(),
      matchMedia: vi.fn(() => ({
        get matches() {
          return reducedMotion;
        },
        media: '(prefers-reduced-motion: reduce)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn((name: string, cb: (ev: MediaQueryListEvent) => void) => {
          if (name === 'change') handlers.mediaChange = cb;
        }),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    };

    const fakeDocument = {
      addEventListener: vi.fn((name: string, cb: () => void) => {
        if (name === 'visibilitychange') handlers.visibility = cb;
      }),
      removeEventListener: vi.fn(),
    };

    const controller = new MotionCoveragePlaybackController({
      exerciseOrId: 'original-mat-quadruped-reach',
      requestFrame: rig.requestFrame,
      cancelFrame: rig.cancelFrame,
      now: rig.now,
      isReducedMotion: () => reducedMotion,
      isDocumentHidden: () => docHidden,
      documentTarget: fakeDocument,
      windowTarget: fakeWindow as unknown as Window,
    });

    // Under reduced-motion, autoPlay and non-explicit play() are blocked
    expect(controller.requestAutoPlay()).toBe(false);
    expect(controller.play()).toBe(false);
    expect(controller.getSnapshot().playing).toBe(false);
    expect(rig.frames.size).toBe(0);

    // Reduced motion remains static even after explicit intent; manual seek still works.
    expect(controller.play({ explicitUserAction: true })).toBe(false);
    expect(controller.getSnapshot().playing).toBe(false);
    expect(controller.getSnapshot().explicitPlayGrantedUnderReducedMotion).toBe(false);
    controller.seek(0.4);
    expect(controller.getSnapshot().progress).toBe(0.4);
    expect(rig.frames.size).toBe(0);
    reducedMotion = false;
    handlers.mediaChange?.({ matches: false } as MediaQueryListEvent);
    expect(controller.play({ explicitUserAction: true })).toBe(true);

    // Background tab transition pauses immediately and clears RAF
    docHidden = true;
    handlers.visibility?.();
    expect(controller.getSnapshot().playing).toBe(false);
    expect(controller.getSnapshot().isBackgroundHidden).toBe(true);
    expect(controller.getSnapshot().explicitPlayGrantedUnderReducedMotion).toBe(false);
    expect(rig.frames.size).toBe(0);

    // Return to foreground, play again, then switch exercise -> cleans up RAF
    docHidden = false;
    handlers.visibility?.();
    reducedMotion = false;
    expect(controller.play({ explicitUserAction: true })).toBe(true);
    expect(rig.frames.size).toBe(1);

    controller.switchExercise('ex-warmup-01');
    expect(controller.getSnapshot().playing).toBe(false);
    expect(rig.frames.size).toBe(0);

    // Switch back to continuous, play, and trigger mediaQuery reduced-motion change mid-play
    controller.switchExercise('original-mat-ankle-reach');
    expect(controller.play({ explicitUserAction: true })).toBe(true);
    expect(rig.frames.size).toBe(1);
    reducedMotion = true;
    handlers.mediaChange?.({ matches: true } as MediaQueryListEvent);
    expect(controller.getSnapshot().playing).toBe(false);
    expect(rig.frames.size).toBe(0);

    // Destroy removes all listeners and cancels any pending frame
    expect(controller.activeListenerCount()).toBe(3);
    controller.destroy();
    expect(controller.isDestroyed()).toBe(true);
    expect(controller.activeListenerCount()).toBe(0);
    expect(controller.hasPendingFrame()).toBe(false);
    expect(fakeDocument.removeEventListener).toHaveBeenCalled();
    expect(fakeWindow.removeEventListener).toHaveBeenCalled();
  });

  it('5. runs the full 98-exercise catalog sweep and verifies representative three-phase-2d, continuous-2d, projected-3d, and missing states in MotionCoveragePreviewHarness', () => {
    // Snapshot getExerciseEvidence before running sweep and harness to prove immutability
    const beforeEvidence = INITIAL_EXERCISES.map((ex) => ({
      id: ex.id,
      evidence: structuredClone(getExerciseEvidence(ex)),
    }));

    const sweep = runMotionCoverageCatalogSweep();
    expect(sweep.totalCatalogCount).toBe(98);
    expect(sweep.countsByMode).toEqual({
      'three-phase-2d': 77,
      'continuous-2d': 1,
      'projected-3d': 20,
      missing: 0,
    });
    expect(sweep.reused2dPoseAssetCount).toBe(98);
    expect(sweep.newlyCreatedAssetCount).toBe(0);
    expect(sweep.unreviewedPatternReferenceCount).toBe(22);
    expect(sweep.discreteExercisesNeverPlayedCount).toBe(77);
    expect(sweep.continuousExercisesVerifiedCount).toBe(21);
    expect(sweep.representativeModesVerified).toEqual({
      'three-phase-2d': true,
      'continuous-2d': true,
      'projected-3d': true,
      missing: true,
    });
    expect(sweep.canonicalMotionReadyTrueCount).toBe(0);
    expect(sweep.manualReadyTrueCount).toBe(0);
    expect(sweep.true3dSupportedTrueCount).toBe(0);
    expect(sweep.controllerDestroyedCleanly).toBe(true);

    // Render isolated preview harness and test interactive state transitions + 44px touch targets + unmount cleanup
    const rig = createInjectableFrameRig(1000);
    const { unmount, container } = render(
      <MotionCoveragePreviewHarness
        initialExerciseOrId="ex-warmup-01"
        controllerOptions={{
          requestFrame: rig.requestFrame,
          cancelFrame: rig.cancelFrame,
          now: rig.now,
          isReducedMotion: () => false,
          isDocumentHidden: () => false,
        }}
      />,
    );

    const harnessRoot = screen.getByTestId('motion-coverage-preview-harness');
    expect(harnessRoot.getAttribute('data-motion-mode')).toBe('three-phase-2d');
    expect(harnessRoot.getAttribute('data-canonical-ready')).toBe('false');
    expect(harnessRoot.getAttribute('data-manual-ready')).toBe('false');
    expect(harnessRoot.getAttribute('data-true-3d')).toBe('false');
    expect(screen.queryByTestId('harness-continuous-controls')).toBeNull();

    // Discrete 3-step selection on ex-warmup-01
    fireEvent.click(screen.getByTestId('harness-phase-middle'));
    expect(
      screen.getByTestId('harness-reused-2d-surface').getAttribute('data-selected-phase'),
    ).toBe('middle');

    // Keyboard navigation on stage
    const stage = screen.getByTestId('harness-interactive-stage');
    fireEvent.keyDown(stage, { key: 'ArrowRight' });
    expect(
      screen.getByTestId('harness-reused-2d-surface').getAttribute('data-selected-phase'),
    ).toBe('end');

    // Switch to representative continuous-2d (original-mat-ankle-reach)
    fireEvent.click(screen.getByTestId('harness-rep-continuous-2d'));
    expect(harnessRoot.getAttribute('data-motion-mode')).toBe('continuous-2d');
    expect(harnessRoot.getAttribute('data-exercise-id')).toBe('original-mat-ankle-reach');
    expect(screen.getByTestId('harness-continuous-controls')).toBeTruthy();

    // Play continuous-2d draft, advance RAF, seek, pause
    fireEvent.click(screen.getByTestId('harness-play-pause-btn'));
    expect(harnessRoot.getAttribute('data-playing')).toBe('true');
    act(() => {
      rig.stepFrame(1000);
      rig.stepFrame(5000); // +4000ms / 8000ms = 0.5
    });
    expect(
      Number(screen.getByTestId('harness-continuous-figure-surface').getAttribute('data-progress')),
    ).toBeCloseTo(0.5, 3);

    fireEvent.change(screen.getByTestId('harness-seek-slider'), {
      target: { value: '75' },
    });
    expect(harnessRoot.getAttribute('data-playing')).toBe('false');
    expect(
      Number(screen.getByTestId('harness-continuous-figure-surface').getAttribute('data-progress')),
    ).toBeCloseTo(0.75, 3);

    // Switch to representative projected-3d (original-mat-quadruped-reach)
    fireEvent.click(screen.getByTestId('harness-rep-projected-3d'));
    expect(harnessRoot.getAttribute('data-motion-mode')).toBe('projected-3d');
    expect(harnessRoot.getAttribute('data-true-3d')).toBe('false');
    expect(screen.getByTestId('harness-variant-quadruped-leg-slide')).toBeTruthy();
    fireEvent.click(screen.getByTestId('harness-variant-quadruped-leg-slide'));
    expect(
      screen.getByTestId('harness-continuous-figure-surface').getAttribute('data-variant-id'),
    ).toBe('quadruped-leg-slide');

    // Start playing projected-3d, then switch to missing -> must cancel RAF and show missing fallback
    fireEvent.click(screen.getByTestId('harness-play-pause-btn'));
    expect(rig.frames.size).toBe(1);
    fireEvent.click(screen.getByTestId('harness-rep-missing'));
    expect(harnessRoot.getAttribute('data-motion-mode')).toBe('missing');
    expect(harnessRoot.getAttribute('data-playing')).toBe('false');
    expect(rig.frames.size).toBe(0);
    expect(screen.getByTestId('harness-missing-surface')).toBeTruthy();

    // Verify >= 44px touch target inline styles on harness buttons and selects
    const buttons = container.querySelectorAll<HTMLButtonElement>('button');
    expect(buttons.length).toBeGreaterThan(5);
    for (const btn of buttons) {
      expect(btn.style.minHeight).toBe('44px');
      expect(btn.style.minWidth).toBe('44px');
    }

    // Start playing again on continuous-2d and unmount -> must clean up pending RAF
    fireEvent.click(screen.getByTestId('harness-rep-continuous-2d'));
    fireEvent.click(screen.getByTestId('harness-play-pause-btn'));
    expect(rig.frames.size).toBe(1);
    unmount();
    expect(rig.frames.size).toBe(0);

    // Verify getExerciseEvidence remained 100% unchanged across all 98 exercises
    const afterEvidence = INITIAL_EXERCISES.map((ex) => ({
      id: ex.id,
      evidence: getExerciseEvidence(ex),
    }));
    expect(afterEvidence).toEqual(beforeEvidence);
    expect(MOTION_COVERAGE_HARNESS_REPRESENTATIVE_TARGETS).toHaveLength(4);
  });

  it('6. does not intercept or double-fire stage shortcuts when native range, button, or select controls have focus', () => {
    const rig = createInjectableFrameRig(1000);
    const snapshotEvents: Array<ReturnType<MotionCoveragePlaybackController['getSnapshot']>> = [];

    render(
      <MotionCoveragePreviewHarness
        initialExerciseOrId="original-mat-quadruped-reach"
        controllerOptions={{
          requestFrame: rig.requestFrame,
          cancelFrame: rig.cancelFrame,
          now: rig.now,
          isReducedMotion: () => false,
          isDocumentHidden: () => false,
        }}
        onSnapshotChange={(snap) => snapshotEvents.push(snap)}
      />,
    );

    const harnessRoot = screen.getByTestId('motion-coverage-preview-harness');
    const stage = screen.getByTestId('harness-interactive-stage');
    const seekSlider = screen.getByTestId('harness-seek-slider') as HTMLInputElement;
    const speedBtn05 = screen.getByTestId('harness-speed-0.5');
    const repeatBtn2 = screen.getByTestId('harness-repeat-2');
    const playPauseBtn = screen.getByTestId('harness-play-pause-btn');
    const exerciseSelect = screen.getByTestId('harness-exercise-select');

    // Set progress to 0.37 via seek slider
    fireEvent.change(seekSlider, { target: { value: '37' } });
    expect(
      Number(screen.getByTestId('harness-continuous-figure-surface').getAttribute('data-progress')),
    ).toBeCloseTo(0.37, 3);

    // Focusing seekSlider and pressing ArrowRight / ArrowLeft / Home must NOT trigger stage phase jump (0, 0.5, 1)
    seekSlider.focus();
    const rightEv = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    });
    const rightNotPrevented = seekSlider.dispatchEvent(rightEv);
    expect(rightNotPrevented).toBe(true);
    expect(
      Number(screen.getByTestId('harness-continuous-figure-surface').getAttribute('data-progress')),
    ).toBeCloseTo(0.37, 3);

    const homeEv = new KeyboardEvent('keydown', {
      key: 'Home',
      bubbles: true,
      cancelable: true,
    });
    const homeNotPrevented = seekSlider.dispatchEvent(homeEv);
    expect(homeNotPrevented).toBe(true);
    expect(
      Number(screen.getByTestId('harness-continuous-figure-surface').getAttribute('data-progress')),
    ).toBeCloseTo(0.37, 3);

    // Focusing speedBtn05 or repeatBtn2 and pressing Space / Enter must NOT trigger stage play/pause
    speedBtn05.focus();
    const spaceOnSpeedEv = new KeyboardEvent('keydown', {
      key: ' ',
      bubbles: true,
      cancelable: true,
    });
    const spaceNotPrevented = speedBtn05.dispatchEvent(spaceOnSpeedEv);
    expect(spaceNotPrevented).toBe(true);
    expect(harnessRoot.getAttribute('data-playing')).toBe('false');

    repeatBtn2.focus();
    fireEvent.keyDown(repeatBtn2, { key: 'Enter' });
    fireEvent.click(repeatBtn2);
    expect(repeatBtn2.getAttribute('aria-pressed')).toBe('true');
    expect(harnessRoot.getAttribute('data-playing')).toBe('false');

    // Focusing playPauseBtn: keyDown(Space) + native click must toggle play ONCE (not double-toggle back to false)
    playPauseBtn.focus();
    fireEvent.keyDown(playPauseBtn, { key: ' ' });
    expect(harnessRoot.getAttribute('data-playing')).toBe('false'); // keyDown did not prematurely toggle
    fireEvent.click(playPauseBtn);
    expect(harnessRoot.getAttribute('data-playing')).toBe('true'); // native click toggled to playing
    fireEvent.click(playPauseBtn);
    expect(harnessRoot.getAttribute('data-playing')).toBe('false');

    // Focusing exerciseSelect and pressing ArrowLeft / Space must not trigger stage shortcuts
    exerciseSelect.focus();
    fireEvent.keyDown(exerciseSelect, { key: 'ArrowRight' });
    fireEvent.keyDown(exerciseSelect, { key: ' ' });
    expect(harnessRoot.getAttribute('data-playing')).toBe('false');

    // Focusing the stage container itself DOES trigger stage shortcuts cleanly (and emits exactly once per key).
    // Note: clicking repeatBtn2 above called DraftPlaybackController.setRepeatCount(2), which resets progress to 0 ('start').
    stage.focus();
    const countBeforeStageRight = snapshotEvents.length;
    fireEvent.keyDown(stage, { key: 'ArrowRight' });
    expect(snapshotEvents.length).toBe(countBeforeStageRight + 1);
    expect(
      Number(screen.getByTestId('harness-continuous-figure-surface').getAttribute('data-progress')),
    ).toBe(0.5);

    fireEvent.keyDown(stage, { key: 'ArrowRight' });
    expect(snapshotEvents.length).toBe(countBeforeStageRight + 2);
    expect(
      Number(screen.getByTestId('harness-continuous-figure-surface').getAttribute('data-progress')),
    ).toBe(1);

    fireEvent.keyDown(stage, { key: 'Home' });
    expect(
      Number(screen.getByTestId('harness-continuous-figure-surface').getAttribute('data-progress')),
    ).toBe(0);

    fireEvent.keyDown(stage, { key: ' ' });
    expect(harnessRoot.getAttribute('data-playing')).toBe('true');
  });

  it('7. handles runtime prefers-reduced-motion transitions, pagehide/pageshow/visibilitychange recovery, and finite mount->unmount->remount cycles with zero duplicate RAF or listeners', () => {
    const rig = createInjectableFrameRig(1000);
    let docHidden = false;
    let mediaMatches = false;
    const windowListeners = new Map<string, Set<EventListener>>();
    const docListeners = new Map<string, Set<EventListener>>();
    const mediaListeners = new Set<(ev: MediaQueryListEvent) => void>();

    const fakeWindow = {
      addEventListener: vi.fn((name: string, cb: EventListener) => {
        if (!windowListeners.has(name)) windowListeners.set(name, new Set());
        windowListeners.get(name)!.add(cb);
      }),
      removeEventListener: vi.fn((name: string, cb: EventListener) => {
        windowListeners.get(name)?.delete(cb);
      }),
      matchMedia: vi.fn(() => ({
        get matches() {
          return mediaMatches;
        },
        media: '(prefers-reduced-motion: reduce)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn((name: string, cb: (ev: MediaQueryListEvent) => void) => {
          if (name === 'change') mediaListeners.add(cb);
        }),
        removeEventListener: vi.fn((name: string, cb: (ev: MediaQueryListEvent) => void) => {
          if (name === 'change') mediaListeners.delete(cb);
        }),
        dispatchEvent: vi.fn(),
      })),
    };

    const fakeDocument = {
      addEventListener: vi.fn((name: string, cb: EventListener) => {
        if (!docListeners.has(name)) docListeners.set(name, new Set());
        docListeners.get(name)!.add(cb);
      }),
      removeEventListener: vi.fn((name: string, cb: EventListener) => {
        docListeners.get(name)?.delete(cb);
      }),
    };

    const controller = new MotionCoveragePlaybackController({
      exerciseOrId: 'original-mat-quadruped-reach',
      requestFrame: rig.requestFrame,
      cancelFrame: rig.cancelFrame,
      now: rig.now,
      isDocumentHidden: () => docHidden,
      documentTarget: fakeDocument,
      windowTarget: fakeWindow as unknown as Window,
    });

    // 1. Runtime prefers-reduced-motion change (false -> true -> explicit play -> pause -> false)
    expect(controller.play({ explicitUserAction: true })).toBe(true);
    expect(rig.frames.size).toBe(1);

    // Fire runtime media change event EVEN BEFORE mutating mediaMatches getter to verify event override sync
    for (const cb of mediaListeners) {
      cb({ matches: true } as MediaQueryListEvent);
    }
    mediaMatches = true;
    expect(controller.getSnapshot().playing).toBe(false);
    expect(controller.getSnapshot().reducedMotion).toBe(true);
    expect(rig.frames.size).toBe(0);

    // Subsequent non-explicit play() must still be blocked
    expect(controller.play()).toBe(false);
    expect(rig.frames.size).toBe(0);

    // Explicit play cannot bypass reduced motion.
    expect(controller.play({ explicitUserAction: true })).toBe(false);
    expect(controller.getSnapshot().explicitPlayGrantedUnderReducedMotion).toBe(false);
    controller.pause();
    expect(controller.getSnapshot().explicitPlayGrantedUnderReducedMotion).toBe(false);
    expect(controller.getSnapshot().statusLabelKo).toContain('동작 줄이기(reduced-motion)');

    // Flip reduced-motion back to false at runtime -> normal play() works again
    for (const cb of mediaListeners) {
      cb({ matches: false } as MediaQueryListEvent);
    }
    mediaMatches = false;
    expect(controller.getSnapshot().reducedMotion).toBe(false);
    expect(controller.play({ explicitUserAction: true })).toBe(true);
    expect(rig.frames.size).toBe(1);

    // 2. pagehide -> pause -> explicit play / seek / pageshow recovery
    for (const cb of windowListeners.get('pagehide') ?? []) {
      cb(new Event('pagehide'));
    }
    expect(controller.getSnapshot().playing).toBe(false);
    expect(controller.getSnapshot().isBackgroundHidden).toBe(true);
    expect(rig.frames.size).toBe(0);

    // While pageHiddenByEvent is active, non-explicit autoPlay is blocked
    expect(controller.requestAutoPlay()).toBe(false);

    // Explicit user action while document is visible clears pageHidden state and plays cleanly
    expect(controller.play({ explicitUserAction: true })).toBe(true);
    expect(controller.getSnapshot().isBackgroundHidden).toBe(false);
    expect(controller.getSnapshot().playing).toBe(true);

    // Trigger pagehide again, then seek(0.4) while document is visible -> clears background status banner
    for (const cb of windowListeners.get('pagehide') ?? []) {
      cb(new Event('pagehide'));
    }
    expect(controller.getSnapshot().isBackgroundHidden).toBe(true);
    controller.seek(0.4);
    expect(controller.getSnapshot().isBackgroundHidden).toBe(false);
    expect(controller.getSnapshot().statusLabelKo).not.toContain('백그라운드 탭 전환');

    // Trigger pagehide, then pageshow -> restores foreground state
    for (const cb of windowListeners.get('pagehide') ?? []) {
      cb(new Event('pagehide'));
    }
    expect(controller.getSnapshot().isBackgroundHidden).toBe(true);
    for (const cb of windowListeners.get('pageshow') ?? []) {
      cb(new Event('pageshow'));
    }
    expect(controller.getSnapshot().isBackgroundHidden).toBe(false);

    // Trigger visibilitychange (docHidden = true -> false) followed by explicit play
    docHidden = true;
    for (const cb of docListeners.get('visibilitychange') ?? []) {
      cb(new Event('visibilitychange'));
    }
    expect(controller.getSnapshot().isBackgroundHidden).toBe(true);
    expect(controller.play({ explicitUserAction: true })).toBe(false);
    docHidden = false;
    for (const cb of docListeners.get('visibilitychange') ?? []) {
      cb(new Event('visibilitychange'));
    }
    expect(controller.getSnapshot().isBackgroundHidden).toBe(false);
    expect(controller.play({ explicitUserAction: true })).toBe(true);
    controller.pause();

    // 3. Controller destroy -> reconnect -> destroy finite cycle
    for (let cycle = 0; cycle < 4; cycle++) {
      controller.reconnect();
      expect(controller.isDestroyed()).toBe(false);
      expect(controller.activeListenerCount()).toBe(3);
      expect(docListeners.get('visibilitychange')?.size).toBe(1);
      expect(windowListeners.get('pagehide')?.size).toBe(1);
      expect(windowListeners.get('pageshow')?.size).toBe(1);
      expect(mediaListeners.size).toBe(1);

      expect(controller.play({ explicitUserAction: true })).toBe(true);
      expect(rig.frames.size).toBe(1);

      controller.destroy();
      expect(controller.isDestroyed()).toBe(true);
      expect(controller.activeListenerCount()).toBe(0);
      expect(rig.frames.size).toBe(0);
      expect(docListeners.get('visibilitychange')?.size).toBe(0);
      expect(windowListeners.get('pagehide')?.size).toBe(0);
      expect(windowListeners.get('pageshow')?.size).toBe(0);
      expect(mediaListeners.size).toBe(0);
    }

    // 4. Component mount -> unmount -> remount finite loop on the same container via mountMotionCoveragePreviewHarness
    const hostContainer = document.createElement('div');
    document.body.appendChild(hostContainer);
    for (let i = 0; i < 4; i++) {
      let root!: ReturnType<typeof mountMotionCoveragePreviewHarness>;
      act(() => {
        root = mountMotionCoveragePreviewHarness(hostContainer, {
          initialExerciseOrId: 'original-mat-quadruped-reach',
          controllerOptions: {
            requestFrame: rig.requestFrame,
            cancelFrame: rig.cancelFrame,
            now: rig.now,
            isReducedMotion: () => false,
            isDocumentHidden: () => false,
          },
        });
      });
      act(() => {
        const playBtn = hostContainer.querySelector<HTMLButtonElement>(
          '[data-testid="harness-play-pause-btn"]',
        );
        playBtn?.click();
      });
      expect(rig.frames.size).toBe(1);
      act(() => {
        root.unmount();
      });
      expect(rig.frames.size).toBe(0);
    }
    hostContainer.remove();
  });
});
