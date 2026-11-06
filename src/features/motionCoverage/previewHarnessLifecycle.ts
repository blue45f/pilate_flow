import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  MotionCoveragePlaybackController,
  type MotionCoveragePlaybackControllerOptions,
  type MotionCoveragePlaybackSnapshot,
} from './playbackController';
import {
  isInteractiveControlTarget,
  mergePreviewResolveOptions,
} from './previewHarnessSelectors';
import type { ResolveMotionCoverageOptions } from './types';

export interface MotionCoveragePreviewHarnessProps {
  readonly initialExerciseOrId?: string;
  readonly resolveOptions?: ResolveMotionCoverageOptions;
  readonly controllerOptions?: Partial<
    Pick<
      MotionCoveragePlaybackControllerOptions,
      | 'requestFrame'
      | 'cancelFrame'
      | 'now'
      | 'isReducedMotion'
      | 'isDocumentHidden'
      | 'documentTarget'
      | 'windowTarget'
    >
  >;
  readonly onSnapshotChange?: (snapshot: MotionCoveragePlaybackSnapshot) => void;
}

export interface PreviewHarnessControllerBinding {
  readonly controller: MotionCoveragePlaybackController;
  readonly snapshot: MotionCoveragePlaybackSnapshot;
  readonly includeLabPrototypes: boolean;
  readonly mergedResolveOptions: ResolveMotionCoverageOptions;
  readonly handleSelectExercise: (nextExerciseId: string) => void;
  readonly handleToggleLabPrototypes: (checked: boolean) => void;
  readonly handleStageKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
}

interface InternalControllerBridge {
  readonly ctrl: MotionCoveragePlaybackController;
  readonly bindCallbacks: (
    setSnapFn: (nextSnap: MotionCoveragePlaybackSnapshot) => void,
    notifyFn: (nextSnap: MotionCoveragePlaybackSnapshot) => void,
  ) => void;
  readonly unbindCallbacks: () => void;
}

/**
 * Mount/unmount and subscription lifecycle hook for `MotionCoveragePreviewHarness`.
 * - Uses a lazy `useRef` with `autoAttachListeners: false` so React `<StrictMode>` double-render
 *   passes never create orphan controllers or leak global `document`/`window`/`matchMedia` listeners.
 * - Attaches listeners via `controller.reconnect()` in `useEffect` and tears down RAF + listeners
 *   via `controller.destroy()` on cleanup with zero duplicate or spurious notifications.
 */
export function usePreviewHarnessController({
  initialExerciseOrId = 'ex-warmup-01',
  resolveOptions,
  controllerOptions,
  onSnapshotChange,
}: MotionCoveragePreviewHarnessProps): PreviewHarnessControllerBinding {
  const [includeLabPrototypes, setIncludeLabPrototypes] = useState<boolean>(
    Boolean(resolveOptions?.includeLabPrototypesInContinuous2d),
  );

  const onSnapshotChangeRef = useRef(onSnapshotChange);
  useEffect(() => {
    onSnapshotChangeRef.current = onSnapshotChange;
  }, [onSnapshotChange]);

  const mergedResolveOptions = useMemo<ResolveMotionCoverageOptions>(
    () => mergePreviewResolveOptions(resolveOptions, includeLabPrototypes),
    [resolveOptions, includeLabPrototypes],
  );

  const [controllerBridge] = useState<InternalControllerBridge>(() => {
    let setSnapRef: ((nextSnap: MotionCoveragePlaybackSnapshot) => void) | null =
      null;
    let notifyExternalRef:
      | ((nextSnap: MotionCoveragePlaybackSnapshot) => void)
      | null = null;
    const ctrl = new MotionCoveragePlaybackController({
      exerciseOrId: initialExerciseOrId,
      resolveOptions: mergedResolveOptions,
      ...controllerOptions,
      autoAttachListeners: false,
      onChange: (nextSnap) => {
        setSnapRef?.(nextSnap);
        notifyExternalRef?.(nextSnap);
      },
    });
    return {
      ctrl,
      bindCallbacks: (setSnapFn, notifyFn) => {
        setSnapRef = setSnapFn;
        notifyExternalRef = notifyFn;
      },
      unbindCallbacks: () => {
        setSnapRef = null;
        notifyExternalRef = null;
      },
    };
  });

  const controller = controllerBridge.ctrl;
  const [snapshot, setSnapshot] = useState<MotionCoveragePlaybackSnapshot>(() =>
    controller.getSnapshot(),
  );

  useEffect(() => {
    controller.reconnect();
    controllerBridge.bindCallbacks(setSnapshot, (nextSnap) => {
      onSnapshotChangeRef.current?.(nextSnap);
    });
    return () => {
      controllerBridge.unbindCallbacks();
      controller.destroy();
    };
  }, [controller, controllerBridge]);

  const handleSelectExercise = (nextExerciseId: string) => {
    controller.switchExercise(nextExerciseId, mergedResolveOptions);
  };

  const handleToggleLabPrototypes = (checked: boolean) => {
    setIncludeLabPrototypes(checked);
    const nextOptions = mergePreviewResolveOptions(resolveOptions, checked);
    controller.switchExercise(snapshot.exerciseId, nextOptions);
  };

  const handleStageKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    // Never intercept or double-fire when focus is inside a child button, range slider, or select
    if (isInteractiveControlTarget(event.target, event.currentTarget)) {
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      controller.prevPhase();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      controller.nextPhase();
    } else if (event.key === 'Home') {
      event.preventDefault();
      controller.restart();
    } else if (event.key === ' ' && snapshot.isContinuousInterpolated) {
      event.preventDefault();
      if (snapshot.playing) {
        controller.pause();
      } else {
        controller.play({ explicitUserAction: true });
      }
    }
  };

  return {
    controller,
    snapshot,
    includeLabPrototypes,
    mergedResolveOptions,
    handleSelectExercise,
    handleToggleLabPrototypes,
    handleStageKeyDown,
  };
}

const activeHarnessRoots = new WeakMap<HTMLElement, Root>();
const activeHarnessContainers = new Set<HTMLElement>();

/**
 * Returns the number of currently mounted imperative preview harness roots.
 */
export function getActivePreviewHarnessRootCount(): number {
  return activeHarnessContainers.size;
}

/**
 * Returns `true` if `container` currently holds an active mounted preview harness root.
 */
export function hasActivePreviewHarnessRoot(container: HTMLElement): boolean {
  return activeHarnessRoots.has(container);
}

/**
 * Imperative DOM mount lifecycle helper with idempotent unmount and container reuse protection.
 */
export function mountPreviewHarnessComponent(
  container: HTMLElement,
  Component: React.ComponentType<MotionCoveragePreviewHarnessProps>,
  props: MotionCoveragePreviewHarnessProps = {},
): Root {
  const existingRoot = activeHarnessRoots.get(container);
  if (existingRoot) {
    existingRoot.unmount();
  }
  const root = createRoot(container);
  const origUnmount = root.unmount.bind(root);
  let unmounted = false;
  root.unmount = () => {
    if (unmounted) return;
    unmounted = true;
    if (activeHarnessRoots.get(container) === root) {
      activeHarnessRoots.delete(container);
      activeHarnessContainers.delete(container);
    }
    origUnmount();
  };
  activeHarnessRoots.set(container, root);
  activeHarnessContainers.add(container);
  root.render(React.createElement(Component, props));
  return root;
}
