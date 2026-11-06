import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MISSING_FIXTURE_EXERCISE_ID,
  MotionCoveragePlaybackController,
  MotionCoveragePreviewHarness,
  buildCatalogDescriptorEntries,
  computeCatalogModeCounts,
  filterCatalogDescriptorEntries,
  findActiveCatalogEntry,
  findFilteredCatalogIndex,
  getActivePreviewHarnessRootCount,
  getAdjacentFilteredExerciseId,
  getDiscretePhaseButtonLabelKo,
  hasActivePreviewHarnessRoot,
  isInteractiveControlTarget,
  mergePreviewResolveOptions,
  mountMotionCoveragePreviewHarness,
  pointsToSvgPath,
  resolvePreviewEvidenceOverlay,
} from './index';

function createTestFrameRig(initialTimeMs = 1000) {
  let currentTimeMs = initialTimeMs;
  let nextHandle = 1;
  const frames = new Map<number, FrameRequestCallback>();

  return {
    frames,
    now: () => currentTimeMs,
    requestFrame: vi.fn((cb: FrameRequestCallback) => {
      const handle = nextHandle++;
      frames.set(handle, cb);
      return handle;
    }),
    cancelFrame: vi.fn((handle: number) => {
      frames.delete(handle);
    }),
    stepFrame(deltaMs: number) {
      currentTimeMs += deltaMs;
      const entries = Array.from(frames.entries());
      if (entries.length === 0) return false;
      const [handle, callback] = entries[0];
      frames.delete(handle);
      callback(currentTimeMs);
      return true;
    },
  };
}

function createFakeEnvironmentTargets() {
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
      matches: false,
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

  return {
    windowListeners,
    docListeners,
    mediaListeners,
    fakeWindow: fakeWindow as unknown as Window,
    fakeDocument,
    totalActiveListeners() {
      return (
        (docListeners.get('visibilitychange')?.size ?? 0) +
        (windowListeners.get('pagehide')?.size ?? 0) +
        (windowListeners.get('pageshow')?.size ?? 0) +
        mediaListeners.size
      );
    },
  };
}

afterEach(() => {
  cleanup();
});

describe('MotionCoveragePreviewHarness modular boundaries (selectors, lifecycle, stage view)', () => {
  it('1. pure selector boundary (previewHarnessSelectors.ts) computes catalog counts, wrap-around navigation, evidence overlays, and target guards deterministically', () => {
    const defaultOpts = mergePreviewResolveOptions(undefined, false);
    const entries = buildCatalogDescriptorEntries(defaultOpts);
    expect(entries).toHaveLength(98);

    const counts = computeCatalogModeCounts(entries);
    expect(counts).toEqual({
      'three-phase-2d': 77,
      'continuous-2d': 1,
      'projected-3d': 20,
      missing: 0,
    });

    const labOpts = mergePreviewResolveOptions({ preferMode: 'continuous-2d' }, true);
    const labCounts = computeCatalogModeCounts(buildCatalogDescriptorEntries(labOpts));
    expect(labCounts).toEqual({
      'three-phase-2d': 77,
      'continuous-2d': 3,
      'projected-3d': 18,
      missing: 0,
    });

    const projEntries = filterCatalogDescriptorEntries(entries, 'projected-3d');
    expect(projEntries).toHaveLength(20);
    expect(findFilteredCatalogIndex(projEntries, projEntries[0].exercise.id)).toBe(0);
    expect(findFilteredCatalogIndex(projEntries, 'ex-warmup-01')).toBe(-1);

    // Wrap-around prev/next navigation
    expect(getAdjacentFilteredExerciseId(projEntries, 0, 'prev')).toBe(projEntries[19].exercise.id);
    expect(getAdjacentFilteredExerciseId(projEntries, 19, 'next')).toBe(projEntries[0].exercise.id);
    expect(getAdjacentFilteredExerciseId(projEntries, -1, 'next')).toBe(projEntries[0].exercise.id);
    expect(getAdjacentFilteredExerciseId([], 0, 'next')).toBeNull();

    const activeEntry = findActiveCatalogEntry(entries, 'ex-warmup-01');
    expect(activeEntry?.exercise.id).toBe('ex-warmup-01');
    expect(activeEntry?.index).toBe(60);
    expect(findActiveCatalogEntry(entries, MISSING_FIXTURE_EXERCISE_ID)).toBeNull();

    const overlay = resolvePreviewEvidenceOverlay(null, MISSING_FIXTURE_EXERCISE_ID, defaultOpts);
    expect(overlay.primaryMode).toBe('missing');
    expect(overlay.canonicalContinuousReady).toBe(false);
    expect(overlay.manualReady).toBe(false);
    expect(overlay.true3dSupported).toBe(false);

    expect(
      pointsToSvgPath([
        { x: 10, y: 20 },
        { x: 30, y: 40 },
      ]),
    ).toBe('M 10 20 L 30 40');
    expect(getDiscretePhaseButtonLabelKo('start')).toBe('1. 시작(준비)');
    expect(getDiscretePhaseButtonLabelKo('middle')).toBe('2. 중간(전개)');
    expect(getDiscretePhaseButtonLabelKo('end')).toBe('3. 끝(복귀)');

    // Interactive descendant target guard
    const stageDiv = document.createElement('div');
    stageDiv.tabIndex = 0;
    const innerSpan = document.createElement('span');
    const childBtn = document.createElement('button');
    const btnSpan = document.createElement('span');
    childBtn.appendChild(btnSpan);
    stageDiv.appendChild(innerSpan);
    stageDiv.appendChild(childBtn);

    expect(isInteractiveControlTarget(stageDiv, stageDiv)).toBe(false);
    expect(isInteractiveControlTarget(innerSpan, stageDiv)).toBe(false);
    expect(isInteractiveControlTarget(childBtn, stageDiv)).toBe(true);
    expect(isInteractiveControlTarget(btnSpan, stageDiv)).toBe(true);
  });

  it('2. StrictMode mount -> unmount -> remount (3 consecutive cycles) leaks zero RAF handles, zero orphan listeners, and zero spurious cleanup notifications', () => {
    const rig = createTestFrameRig(1000);
    const env = createFakeEnvironmentTargets();
    const notifications: string[] = [];

    for (let cycle = 1; cycle <= 3; cycle++) {
      const { unmount } = render(
        <StrictMode>
          <MotionCoveragePreviewHarness
            initialExerciseOrId="original-mat-quadruped-reach"
            controllerOptions={{
              requestFrame: rig.requestFrame,
              cancelFrame: rig.cancelFrame,
              now: rig.now,
              isReducedMotion: () => false,
              isDocumentHidden: () => false,
              documentTarget: env.fakeDocument,
              windowTarget: env.fakeWindow,
            }}
            onSnapshotChange={(snap) =>
              notifications.push(
                `cycle${cycle}:${snap.exerciseId}:playing=${snap.playing}:progress=${snap.progress}`,
              )
            }
          />
        </StrictMode>,
      );

      // Even under StrictMode double-render + double-effect, exactly 1 listener per event is active
      expect(env.docListeners.get('visibilitychange')?.size).toBe(1);
      expect(env.windowListeners.get('pagehide')?.size).toBe(1);
      expect(env.windowListeners.get('pageshow')?.size).toBe(1);
      expect(env.mediaListeners.size).toBe(1);
      expect(env.totalActiveListeners()).toBe(4);
      // Mount/StrictMode effect cycle itself must not fire spurious onSnapshotChange notifications
      expect(notifications).toHaveLength(0);

      // Start playback -> exactly 1 notification and 1 pending RAF frame
      fireEvent.click(screen.getByTestId('harness-play-pause-btn'));
      expect(notifications).toHaveLength(1);
      expect(rig.frames.size).toBe(1);

      // Advance 1 frame -> 1 notification, 1 newly scheduled RAF frame
      act(() => {
        rig.stepFrame(400);
      });
      expect(notifications).toHaveLength(2);
      expect(rig.frames.size).toBe(1);

      // Unmount while playing -> cancels RAF and removes all listeners with ZERO spurious unmount notifications
      unmount();
      expect(rig.frames.size).toBe(0);
      expect(env.totalActiveListeners()).toBe(0);
      expect(notifications).toHaveLength(2);
      notifications.length = 0;
    }
  });

  it('3. switching exercises while playing -> unmount -> remount cancels RAF immediately and emits exactly 1 notification per transition', () => {
    const rig = createTestFrameRig(2000);
    const env = createFakeEnvironmentTargets();
    const emittedSnapshots: Array<{
      exerciseId: string;
      playing: boolean;
      mode: string;
    }> = [];

    const { unmount } = render(
      <StrictMode>
        <MotionCoveragePreviewHarness
          initialExerciseOrId="original-mat-quadruped-reach"
          controllerOptions={{
            requestFrame: rig.requestFrame,
            cancelFrame: rig.cancelFrame,
            now: rig.now,
            isReducedMotion: () => false,
            isDocumentHidden: () => false,
            documentTarget: env.fakeDocument,
            windowTarget: env.fakeWindow,
          }}
          onSnapshotChange={(snap) =>
            emittedSnapshots.push({
              exerciseId: snap.exerciseId,
              playing: snap.playing,
              mode: snap.mode,
            })
          }
        />
      </StrictMode>,
    );

    // 1. Start playing projected-3d exercise
    fireEvent.click(screen.getByTestId('harness-play-pause-btn'));
    expect(rig.frames.size).toBe(1);
    expect(emittedSnapshots).toEqual([
      {
        exerciseId: 'original-mat-quadruped-reach',
        playing: true,
        mode: 'projected-3d',
      },
    ]);

    // 2. Switch to discrete three-phase-2d WHILE playing -> must cancel RAF and emit ONCE with the new exerciseId
    emittedSnapshots.length = 0;
    fireEvent.click(screen.getByTestId('harness-rep-three-phase-2d'));
    expect(rig.frames.size).toBe(0);
    expect(emittedSnapshots).toEqual([
      {
        exerciseId: 'ex-warmup-01',
        playing: false,
        mode: 'three-phase-2d',
      },
    ]);

    // 3. Switch to continuous-2d (`original-mat-ankle-reach`) and start playing
    emittedSnapshots.length = 0;
    fireEvent.click(screen.getByTestId('harness-rep-continuous-2d'));
    expect(emittedSnapshots).toEqual([
      {
        exerciseId: 'original-mat-ankle-reach',
        playing: false,
        mode: 'continuous-2d',
      },
    ]);
    fireEvent.click(screen.getByTestId('harness-play-pause-btn'));
    expect(rig.frames.size).toBe(1);

    // 4. Switch via <select> WHILE playing to missing fixture -> emits ONCE, cancels RAF
    emittedSnapshots.length = 0;
    fireEvent.change(screen.getByTestId('harness-exercise-select'), {
      target: { value: MISSING_FIXTURE_EXERCISE_ID },
    });
    expect(rig.frames.size).toBe(0);
    expect(emittedSnapshots).toEqual([
      {
        exerciseId: MISSING_FIXTURE_EXERCISE_ID,
        playing: false,
        mode: 'missing',
      },
    ]);

    // 5. Switch back to projected-3d, start playing, then unmount and remount
    fireEvent.click(screen.getByTestId('harness-rep-projected-3d'));
    fireEvent.click(screen.getByTestId('harness-play-pause-btn'));
    expect(rig.frames.size).toBe(1);

    unmount();
    expect(rig.frames.size).toBe(0);
    expect(env.totalActiveListeners()).toBe(0);

    // Remount fresh instance and verify clean playback
    const remounted = render(
      <MotionCoveragePreviewHarness
        initialExerciseOrId="original-mat-quadruped-reach"
        controllerOptions={{
          requestFrame: rig.requestFrame,
          cancelFrame: rig.cancelFrame,
          now: rig.now,
          isReducedMotion: () => false,
          isDocumentHidden: () => false,
          documentTarget: env.fakeDocument,
          windowTarget: env.fakeWindow,
        }}
      />,
    );
    fireEvent.click(screen.getByTestId('harness-play-pause-btn'));
    expect(rig.frames.size).toBe(1);
    remounted.unmount();
    expect(rig.frames.size).toBe(0);
    expect(env.totalActiveListeners()).toBe(0);
  });

  it('4. guarantees single notification per state transition in controller.restart() across discrete, continuous, and missing modes, and protects imperative mount lifecycle against stale unmount calls', () => {
    const events: string[] = [];
    const ctrl = new MotionCoveragePlaybackController({
      exerciseOrId: 'ex-warmup-01',
      onChange: (snap) => events.push(`${snap.exerciseId}:${snap.selectedPhase}`),
    });

    ctrl.selectPhase('end');
    expect(events).toEqual(['ex-warmup-01:end']);

    events.length = 0;
    ctrl.restart();
    expect(events).toEqual(['ex-warmup-01:start']);

    events.length = 0;
    ctrl.switchExercise('original-mat-quadruped-reach');
    expect(events).toEqual(['original-mat-quadruped-reach:start']);

    events.length = 0;
    ctrl.restart();
    expect(events).toEqual(['original-mat-quadruped-reach:start']);
    ctrl.destroy();

    // Imperative mountMotionCoveragePreviewHarness stale root.unmount() protection
    const host = document.createElement('div');
    document.body.appendChild(host);
    expect(getActivePreviewHarnessRootCount()).toBe(0);

    let root1!: ReturnType<typeof mountMotionCoveragePreviewHarness>;
    act(() => {
      root1 = mountMotionCoveragePreviewHarness(host, {
        initialExerciseOrId: 'ex-warmup-01',
      });
    });
    expect(hasActivePreviewHarnessRoot(host)).toBe(true);
    expect(getActivePreviewHarnessRootCount()).toBe(1);

    let root2!: ReturnType<typeof mountMotionCoveragePreviewHarness>;
    act(() => {
      root2 = mountMotionCoveragePreviewHarness(host, {
        initialExerciseOrId: 'original-reformer-scooter',
      });
    });
    expect(hasActivePreviewHarnessRoot(host)).toBe(true);
    expect(getActivePreviewHarnessRootCount()).toBe(1);

    // Calling stale root1.unmount() must NOT remove root2 from active tracking
    act(() => {
      root1.unmount();
    });
    expect(hasActivePreviewHarnessRoot(host)).toBe(true);
    expect(getActivePreviewHarnessRootCount()).toBe(1);

    act(() => {
      root2.unmount();
    });
    expect(hasActivePreviewHarnessRoot(host)).toBe(false);
    expect(getActivePreviewHarnessRootCount()).toBe(0);
    host.remove();
  });
});
