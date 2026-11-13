import { useEffect, useState, type RefObject } from 'react';

/** Manual players pause on suspension; live hosts may resume from their own running state. */
export function useMotionPlaybackEnvironment(
  container: RefObject<HTMLElement | null>,
  onSuspend?: () => void,
) {
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
  );
  const [pageVisible, setPageVisible] = useState(
    () => typeof document === 'undefined' || !document.hidden,
  );
  const [inViewport, setInViewport] = useState(true);

  useEffect(() => {
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const preferenceChanged = (event?: MediaQueryListEvent) => {
      const shouldReduce = event?.matches ?? preference?.matches ?? false;
      setReducedMotion(shouldReduce);
      if (shouldReduce) onSuspend?.();
    };
    const visibilityChanged = () => {
      setPageVisible(!document.hidden);
      if (document.hidden) onSuspend?.();
    };
    const pageHidden = () => {
      setPageVisible(false);
      onSuspend?.();
    };
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(
            ([entry]) => {
              if (!entry) return;
              setInViewport(entry.isIntersecting);
              if (!entry.isIntersecting) onSuspend?.();
            },
            { threshold: 0.01 },
          );
    if (container.current) observer?.observe(container.current);
    preference?.addEventListener?.('change', preferenceChanged);
    document.addEventListener('visibilitychange', visibilityChanged);
    window.addEventListener('pagehide', pageHidden);
    window.addEventListener('pageshow', visibilityChanged);
    return () => {
      observer?.disconnect();
      preference?.removeEventListener?.('change', preferenceChanged);
      document.removeEventListener('visibilitychange', visibilityChanged);
      window.removeEventListener('pagehide', pageHidden);
      window.removeEventListener('pageshow', visibilityChanged);
    };
  }, [container, onSuspend]);

  return {
    reducedMotion,
    visible: pageVisible && inViewport,
    canAnimate: pageVisible && inViewport && !reducedMotion,
  };
}
