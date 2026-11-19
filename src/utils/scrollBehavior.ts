/**
 * Returns 'auto' when the user requests reduced motion, otherwise 'smooth'.
 * Ensures programmatic scrollIntoView calls honor prefers-reduced-motion.
 */
export function getAccessibleScrollBehavior(): ScrollBehavior {
  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return 'auto';
  }
  return 'smooth';
}
