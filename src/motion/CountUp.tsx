import { useLayoutEffect, useRef } from 'react';
import { BREATH_DURATION, canAnimate } from './motionEnv';

interface CountUpProps {
  value: number;
  /** Formats the (possibly fractional) tweened value. Defaults to a rounded integer. */
  format?: (value: number) => string;
  /** Tween length in ms. */
  duration?: number;
  className?: string;
}

const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const roundFormat = (n: number) => String(Math.round(n));

/**
 * A number that glides to its new value instead of jumping, so a changed total
 * reads as a change.
 *
 * React always renders the final value (so markup, tests and assistive tech see
 * the truth); the tween only rewrites the same text node's `nodeValue` between
 * commit and paint, then hands the final text back. When motion is unavailable
 * no frame loop starts at all.
 */
export function CountUp({
  value,
  format = roundFormat,
  duration = BREATH_DURATION.tween,
  className,
}: CountUpProps) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const shownRef = useRef(value);
  const formatRef = useRef(format);

  useLayoutEffect(() => {
    formatRef.current = format;
  });

  useLayoutEffect(() => {
    const from = shownRef.current;
    const textNode = spanRef.current?.firstChild;
    if (from === value || !canAnimate() || !textNode || textNode.nodeType !== Node.TEXT_NODE) {
      shownRef.current = value;
      return;
    }
    const finalText = formatRef.current(value);
    let frame = 0;
    const start = performance.now();
    textNode.nodeValue = formatRef.current(from);
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const next = from + (value - from) * easeOutExpo(progress);
      shownRef.current = next;
      if (progress < 1) {
        textNode.nodeValue = formatRef.current(next);
        frame = requestAnimationFrame(step);
      } else {
        shownRef.current = value;
        textNode.nodeValue = finalText;
      }
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      textNode.nodeValue = finalText;
    };
  }, [value, duration]);

  return (
    <span ref={spanRef} className={className ? `pf-count ${className}` : 'pf-count'}>
      {format(value)}
    </span>
  );
}
