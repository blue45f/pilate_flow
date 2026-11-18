import { flushSync } from 'react-dom';
import { getViewTransitionDocument, supportsViewTransitions } from './motionEnv';

/**
 * Page-level transitions built on same-document View Transitions.
 *
 * - `forward` / `back`  directional rise between workspace pages (menu order)
 * - `stage`             the dark live-class stage opens as a curtain from the
 *                       control that started it
 * - `portal`            instructor ↔ member portal turns like a page
 * - `fade`              quiet cross-fade for anything else
 *
 * When the platform cannot animate (no API, reduced motion, tests) the update
 * runs synchronously, so behaviour never depends on motion.
 */
export type PageTransitionKind = 'forward' | 'back' | 'stage' | 'portal' | 'fade';

interface PageTransitionOptions {
  kind?: PageTransitionKind;
  /** Viewport point the `stage` curtain grows from. Defaults to the last press. */
  origin?: { x: number; y: number } | null;
}

let lastPress: { x: number; y: number } | null = null;
let transitionToken = 0;

/** Remember where the last press happened so curtains open from the finger/cursor. */
export function rememberPressOrigin(x: number, y: number) {
  lastPress = { x, y };
}

export function readPressOrigin() {
  return lastPress;
}

export function runPageTransition(update: () => void, options: PageTransitionOptions = {}) {
  if (!supportsViewTransitions()) {
    update();
    return;
  }
  const kind = options.kind ?? 'fade';
  const root = document.documentElement;
  const token = ++transitionToken;
  const origin = options.origin ?? lastPress;
  root.dataset.pfTransition = kind;
  if (origin) {
    root.style.setProperty('--pf-vt-x', `${Math.round(origin.x)}px`);
    root.style.setProperty('--pf-vt-y', `${Math.round(origin.y)}px`);
  }
  try {
    const transition = getViewTransitionDocument().startViewTransition!(() => {
      flushSync(update);
    });
    const cleanup = () => {
      if (token !== transitionToken) return;
      delete root.dataset.pfTransition;
    };
    transition.finished.then(cleanup, cleanup);
  } catch {
    delete root.dataset.pfTransition;
    update();
  }
}

/** Direction between two entries of an ordered menu. */
export function directionBetween<T>(order: readonly T[], from: T, to: T): PageTransitionKind {
  const a = order.indexOf(from);
  const b = order.indexOf(to);
  if (a === -1 || b === -1 || a === b) return 'fade';
  return b > a ? 'forward' : 'back';
}
