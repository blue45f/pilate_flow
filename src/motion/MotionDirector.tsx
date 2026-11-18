import { useLayoutEffect } from 'react';
import {
  BREATH_STAGGER_MAX,
  BREATH_STAGGER_MS,
  canAnimate,
  hasFinePointer,
  prefersReducedMotion,
} from './motionEnv';
import { rememberPressOrigin } from './pageTransition';
import { REVEAL_SELECTOR, TILT_SELECTOR } from './motionRegistry';

/** Marks an element as waiting to breathe in. */
export const REVEAL_PENDING_ATTR = 'data-pf-r';
/** Marks an element that has entered (its entrance animation runs once). */
export const REVEALED_ATTR = 'data-pf-in';
export const MOTION_CLASS = 'pf-motion';

/**
 * One controller for every decorative motion in the app.
 *
 * Components stay free of animation plumbing: the selectors in
 * `motionRegistry.ts` say which elements breathe in on scroll and which cards
 * tilt toward the pointer, and the CSS in `pf-motion-studio.css` decides how.
 *
 * - Reveal: elements start one rise below their place and settle in when they
 *   first enter the viewport, staggered in reading order (max 8 steps).
 *   New elements are marked inside the MutationObserver microtask, before the
 *   browser paints, so nothing flashes in and out.
 * - Tilt: on fine pointers, registered cards lean ≤ 3° toward the cursor and
 *   expose `--pf-mx/--pf-my` for a soft material highlight.
 * - Press origin: the last press point seeds the stage curtain transition.
 *
 * Without IntersectionObserver/matchMedia, or with reduced motion, nothing is
 * hidden and nothing moves.
 */
export function MotionDirector() {
  useLayoutEffect(() => {
    const onPress = (event: PointerEvent) => rememberPressOrigin(event.clientX, event.clientY);
    window.addEventListener('pointerdown', onPress, { capture: true, passive: true });
    if (!canAnimate()) {
      return () => window.removeEventListener('pointerdown', onPress, { capture: true });
    }

    const root = document.documentElement;
    root.classList.add(MOTION_CLASS);

    /* ---------------------------------------------------------------- reveal */
    const reveal = (element: Element, index: number) => {
      const step = Math.min(index, BREATH_STAGGER_MAX - 1);
      (element as HTMLElement).style.setProperty(
        '--pf-reveal-delay',
        `${step * BREATH_STAGGER_MS}ms`,
      );
      element.setAttribute(REVEALED_ATTR, '');
    };
    const io = new IntersectionObserver(
      (entries) => {
        const entering = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              a.boundingClientRect.top - b.boundingClientRect.top ||
              a.boundingClientRect.left - b.boundingClientRect.left,
          );
        entering.forEach((entry, index) => {
          reveal(entry.target, index);
          io.unobserve(entry.target);
        });
      },
      // No negative margin: an element resting at the very bottom of a page that
      // cannot scroll further must still be able to enter.
      { rootMargin: '0px', threshold: 0.01 },
    );
    const observed = new WeakSet<Element>();
    const combinedRevealSelector = `${REVEAL_SELECTOR}, [${REVEAL_PENDING_ATTR}]`;
    const track = (scope: Element | Document) => {
      const visit = (element: Element) => {
        if (observed.has(element) || element.hasAttribute(REVEALED_ATTR)) {
          return;
        }
        observed.add(element);
        element.setAttribute(REVEAL_PENDING_ATTR, '');
        io.observe(element);
      };
      if (scope instanceof Element && scope.matches(combinedRevealSelector)) visit(scope);
      scope.querySelectorAll(combinedRevealSelector).forEach(visit);
    };
    track(document);

    const mo = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && (node as Element).isConnected) track(node as Element);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    /* ------------------------------------------------------------------ tilt */
    let tiltTarget: HTMLElement | null = null;
    let tiltFrame = 0;
    let lastEvent: PointerEvent | null = null;
    const resetTilt = (element: HTMLElement) => {
      element.style.removeProperty('--pf-rx');
      element.style.removeProperty('--pf-ry');
      element.removeAttribute('data-pf-tilting');
    };
    const applyTilt = () => {
      tiltFrame = 0;
      const event = lastEvent;
      if (!event || !tiltTarget) return;
      const rect = tiltTarget.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const px = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      const py = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
      tiltTarget.style.setProperty('--pf-mx', `${(px * 100).toFixed(1)}%`);
      tiltTarget.style.setProperty('--pf-my', `${(py * 100).toFixed(1)}%`);
      tiltTarget.style.setProperty('--pf-rx', `${((0.5 - py) * 4).toFixed(2)}deg`);
      tiltTarget.style.setProperty('--pf-ry', `${((px - 0.5) * 5).toFixed(2)}deg`);
      tiltTarget.setAttribute('data-pf-tilting', '');
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || !hasFinePointer()) return;
      const target = (event.target as Element | null)?.closest?.(
        TILT_SELECTOR,
      ) as HTMLElement | null;
      if (target !== tiltTarget) {
        if (tiltTarget) resetTilt(tiltTarget);
        tiltTarget = target;
      }
      if (!tiltTarget) return;
      lastEvent = event;
      if (!tiltFrame) tiltFrame = requestAnimationFrame(applyTilt);
    };
    const onPointerLeaveDocument = () => {
      if (tiltTarget) resetTilt(tiltTarget);
      tiltTarget = null;
    };
    document.addEventListener('pointermove', onPointerMove, { passive: true });
    root.addEventListener('pointerleave', onPointerLeaveDocument);

    /* ----------------------------------------------- live preference change */
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onPreferenceChange = () => {
      if (prefersReducedMotion()) {
        root.classList.remove(MOTION_CLASS);
        document
          .querySelectorAll(`[${REVEAL_PENDING_ATTR}]`)
          .forEach((element) => element.setAttribute(REVEALED_ATTR, ''));
      } else {
        root.classList.add(MOTION_CLASS);
      }
    };
    motionQuery.addEventListener?.('change', onPreferenceChange);

    return () => {
      window.removeEventListener('pointerdown', onPress, { capture: true });
      io.disconnect();
      mo.disconnect();
      if (tiltFrame) cancelAnimationFrame(tiltFrame);
      document.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('pointerleave', onPointerLeaveDocument);
      motionQuery.removeEventListener?.('change', onPreferenceChange);
      root.classList.remove(MOTION_CLASS);
      document
        .querySelectorAll(`[${REVEAL_PENDING_ATTR}]`)
        .forEach((element) => element.setAttribute(REVEALED_ATTR, ''));
    };
  }, []);

  return null;
}
