/**
 * Motion environment — "Breath" motion language for Pilates Flow.
 *
 * Every animated affordance in the app is capability-detected here, so
 * environments without layout/observer APIs (jsdom tests, very old browsers)
 * and people who ask for reduced motion always get the final, static UI.
 */

/** One easing curve for the whole app (unslop tokens). */
export const BREATH_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

export const BREATH_DURATION = {
  /** Hover, press, toggles. */
  feedback: 160,
  /** Menus, popovers, tooltips. */
  menu: 200,
  /** Entrances, sheets, layout changes ("inhale"). */
  inhale: 420,
  /** Exits ("exhale"). */
  exhale: 240,
  /** Number tweens. */
  tween: 640,
} as const;

/** Stagger between siblings, capped so long lists never feel slow. */
export const BREATH_STAGGER_MS = 40;
export const BREATH_STAGGER_MAX = 8;

function hasWindow(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/** True when the platform exposes the APIs our motion layer relies on. */
export function hasMotionPlatform(): boolean {
  return (
    hasWindow() &&
    typeof window.matchMedia === 'function' &&
    typeof window.IntersectionObserver === 'function' &&
    typeof window.MutationObserver === 'function'
  );
}

/** The user asked the OS/browser to minimise motion. */
export function prefersReducedMotion(): boolean {
  if (!hasWindow() || typeof window.matchMedia !== 'function') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Decorative motion may run. */
export function canAnimate(): boolean {
  return hasMotionPlatform() && !prefersReducedMotion();
}

/** Fine pointer (mouse/trackpad) — gate pointer-follow effects to it. */
export function hasFinePointer(): boolean {
  if (!hasWindow() || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => {
    finished: Promise<void>;
    ready: Promise<void>;
    updateCallbackDone: Promise<void>;
    skipTransition?: () => void;
  };
};

/** Same-document View Transitions are available and motion is allowed. */
export function supportsViewTransitions(): boolean {
  return (
    canAnimate() &&
    typeof (document as ViewTransitionDocument).startViewTransition === 'function'
  );
}

export function getViewTransitionDocument(): ViewTransitionDocument {
  return document as ViewTransitionDocument;
}
