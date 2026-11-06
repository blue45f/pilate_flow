import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_EXERCISES } from '../../data/pilatesCatalog';
import { usePilatesStore } from '../../store/usePilatesStore';
import {
  MotionCoveragePlaybackController,
  MotionCoveragePreviewHarness,
  evaluateMotionCandidateMatch,
  isPreviewHostAvailable,
  resolveMotionCoverage,
} from './index';

function frameRig() {
  const frames = new Map<number, FrameRequestCallback>();
  let next = 0;
  return {
    frames,
    requestFrame: (callback: FrameRequestCallback) => {
      frames.set(++next, callback);
      return next;
    },
    cancelFrame: (id: number) => {
      frames.delete(id);
    },
  };
}
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('main integration safety contracts', () => {
  it('requires explicit intent and keeps reduced motion static without blocking manual inspection', () => {
    const rig = frameRig();
    let reduced = false;
    const controller = new MotionCoveragePlaybackController({
      exerciseOrId: 'original-mat-quadruped-reach',
      ...rig,
      isReducedMotion: () => reduced,
      isDocumentHidden: () => false,
    });
    expect(controller.requestAutoPlay()).toBe(false);
    expect(controller.play()).toBe(false);
    expect(rig.frames.size).toBe(0);
    expect(controller.play({ explicitUserAction: true })).toBe(true);
    reduced = true;
    expect(controller.play({ explicitUserAction: true })).toBe(false);
    expect(rig.frames.size).toBe(0);
    controller.seek(0.4);
    expect(controller.getSnapshot().progress).toBe(0.4);
    controller.selectPhase('end');
    expect(controller.getSnapshot().progress).toBe(1);
    reduced = false;
    expect(controller.getSnapshot().playing).toBe(false);
    expect(controller.requestAutoPlay()).toBe(false);
    controller.destroy();
  });

  it('cancels unavailable hosts and rejects old callbacks after pause/play and destroy/reconnect', () => {
    const rig = frameRig();
    let active = true;
    const controller = new MotionCoveragePlaybackController({
      exerciseOrId: 'original-mat-quadruped-reach',
      ...rig,
      canRun: () => active,
      isReducedMotion: () => false,
      isDocumentHidden: () => false,
    });
    controller.play({ explicitUserAction: true });
    const stale = [...rig.frames.values()][0];
    controller.pause();
    controller.play({ explicitUserAction: true });
    stale(1000);
    expect(rig.frames.size).toBe(1);
    expect(controller.getSnapshot().progress).toBe(0);
    active = false;
    controller.refreshHostAvailability();
    expect(controller.getSnapshot().playing).toBe(false);
    expect(rig.frames.size).toBe(0);
    expect(controller.play({ explicitUserAction: true })).toBe(false);
    active = true;
    controller.refreshHostAvailability();
    expect(controller.getSnapshot().playing).toBe(false);
    controller.play({ explicitUserAction: true });
    const beforeDestroy = [...rig.frames.values()][0];
    controller.destroy();
    controller.reconnect();
    controller.play({ explicitUserAction: true });
    beforeDestroy(2000);
    expect(rig.frames.size).toBe(1);
    controller.destroy();
  });

  it('synchronizes changed options and active state, but preserves a running equal-options rerender', () => {
    const rig = frameRig();
    const options = { ...rig, isReducedMotion: () => false, isDocumentHidden: () => false };
    const view = render(
      <MotionCoveragePreviewHarness
        initialExerciseOrId="original-mat-quadruped-reach"
        controllerOptions={options}
      />,
    );
    const root = () => screen.getByTestId('motion-coverage-preview-harness');
    fireEvent.click(screen.getByTestId('harness-play-pause-btn'));
    view.rerender(
      <MotionCoveragePreviewHarness
        initialExerciseOrId="original-mat-quadruped-reach"
        controllerOptions={options}
        resolveOptions={{}}
      />,
    );
    expect(root()).toHaveAttribute('data-playing', 'true');
    expect(rig.frames.size).toBe(1);
    view.rerender(
      <MotionCoveragePreviewHarness
        initialExerciseOrId="original-mat-quadruped-reach"
        controllerOptions={options}
        resolveOptions={{ preferMode: 'three-phase-2d' }}
      />,
    );
    expect(root()).toHaveAttribute('data-motion-mode', 'three-phase-2d');
    expect(root()).toHaveAttribute('data-playing', 'false');
    expect(rig.frames.size).toBe(0);
    view.rerender(
      <MotionCoveragePreviewHarness
        initialExerciseOrId="original-mat-quadruped-reach"
        controllerOptions={options}
        active={false}
      />,
    );
    expect(root()).toHaveAttribute('data-motion-mode', 'projected-3d');
    expect(screen.getByTestId('harness-play-pause-btn')).toBeDisabled();
    view.rerender(
      <MotionCoveragePreviewHarness
        initialExerciseOrId="original-mat-quadruped-reach"
        controllerOptions={options}
        active
      />,
    );
    expect(root()).toHaveAttribute('data-playing', 'false');
    expect(screen.getByTestId('harness-play-pause-btn')).toBeEnabled();
    view.unmount();
    expect(rig.frames.size).toBe(0);
  });

  it('pauses a hidden host without store, storage or network writes', async () => {
    const before = usePilatesStore.getState();
    const write = vi.spyOn(Storage.prototype, 'setItem');
    const fetch = vi.spyOn(globalThis, 'fetch');
    const rig = frameRig();
    const host = document.createElement('div');
    document.body.appendChild(host);
    const view = render(
      <MotionCoveragePreviewHarness
        initialExerciseOrId="original-mat-quadruped-reach"
        controllerOptions={{ ...rig, isReducedMotion: () => false, isDocumentHidden: () => false }}
      />,
      { container: host },
    );
    fireEvent.click(screen.getByTestId('harness-play-pause-btn'));
    act(() => {
      host.hidden = true;
    });
    await waitFor(() =>
      expect(screen.getByTestId('motion-coverage-preview-harness')).toHaveAttribute(
        'data-playing',
        'false',
      ),
    );
    expect(rig.frames.size).toBe(0);
    act(() => {
      host.hidden = false;
    });
    await waitFor(() => expect(screen.getByTestId('harness-play-pause-btn')).toBeEnabled());
    expect(screen.getByTestId('motion-coverage-preview-harness')).toHaveAttribute(
      'data-playing',
      'false',
    );
    expect(usePilatesStore.getState()).toBe(before);
    expect(write).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    view.unmount();
    host.remove();
  });

  it('rejects detached, CSS-hidden and closed native-dialog hosts', () => {
    const dialog = document.createElement('dialog');
    const host = document.createElement('section');
    dialog.appendChild(host);
    expect(isPreviewHostAvailable(host)).toBe(false);
    document.body.appendChild(dialog);
    expect(isPreviewHostAvailable(host)).toBe(false);
    dialog.setAttribute('open', '');
    expect(isPreviewHostAvailable(host)).toBe(true);
    dialog.style.visibility = 'hidden';
    expect(isPreviewHostAvailable(host)).toBe(false);
    dialog.style.visibility = '';
    dialog.style.display = 'none';
    expect(isPreviewHostAvailable(host)).toBe(false);
    dialog.remove();
  });

  it('does not pass original source verification to edited facts or reserved IDs, without imposing a review gate', () => {
    const original = INITIAL_EXERCISES.find((exercise) => exercise.id === 'original-mat-clam')!;
    const before = JSON.stringify(original);
    for (const edit of [
      { props: ['band'] },
      { spinalPlanes: ['extension'] },
      { sourceReference: undefined },
    ]) {
      const edited = { ...original, ...edit } as typeof original;
      if (JSON.stringify(edited) === before) continue;
      expect(resolveMotionCoverage(edited).primaryMode).toBe('missing');
      expect(evaluateMotionCandidateMatch(edited, 'side-lying-clam').matched).toBe(false);
    }
    expect(
      resolveMotionCoverage({
        ...original,
        sourceReference: { ...original.sourceReference, url: 'https://example.invalid/changed' },
      } as typeof original).primaryMode,
    ).toBe('missing');
    for (const id of ['__proto__', 'constructor', 'toString', 'prototype', 'unknown']) {
      expect(resolveMotionCoverage(id).primaryMode).toBe('missing');
      expect(evaluateMotionCandidateMatch(id, '__proto__').matched).toBe(false);
    }
    expect(resolveMotionCoverage({ ...original, review: undefined }).primaryMode).toBe(
      'projected-3d',
    );
    expect(JSON.stringify(original)).toBe(before);
  });
  it('applies live prototype opt-in withdrawal while preserving manual still inspection', () => {
    const rig = frameRig();
    const options = { ...rig, isReducedMotion: () => false, isDocumentHidden: () => false };
    const view = render(
      <MotionCoveragePreviewHarness
        initialExerciseOrId="original-mat-bridge"
        controllerOptions={options}
        resolveOptions={{ preferMode: 'continuous-2d', includeLabPrototypesInContinuous2d: true }}
      />,
    );
    expect(screen.getByTestId('motion-coverage-preview-harness')).toHaveAttribute(
      'data-motion-mode',
      'continuous-2d',
    );
    fireEvent.click(screen.getByTestId('harness-play-pause-btn'));
    view.rerender(
      <MotionCoveragePreviewHarness
        initialExerciseOrId="original-mat-bridge"
        controllerOptions={options}
        resolveOptions={{ preferMode: 'continuous-2d', includeLabPrototypesInContinuous2d: false }}
      />,
    );
    expect(screen.getByTestId('motion-coverage-preview-harness')).toHaveAttribute(
      'data-motion-mode',
      'projected-3d',
    );
    expect(screen.getByTestId('motion-coverage-preview-harness')).toHaveAttribute(
      'data-playing',
      'false',
    );
    expect(rig.frames.size).toBe(0);
    fireEvent.click(screen.getByTestId('harness-phase-middle'));
    expect(screen.getByTestId('harness-continuous-figure-surface')).toHaveAttribute(
      'data-progress',
      '0.5',
    );
  });
});
