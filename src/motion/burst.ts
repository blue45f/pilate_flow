import { BREATH_EASE, canAnimate } from './motionEnv';

/** Studio palette for celebratory particles: sage, white oak, linen, brass. */
const BURST_COLORS = ['#1f4435', '#5f8a72', '#c9a46a', '#e7dcc8', '#9db8a6'];

/**
 * A short burst of small particles from an element — reserved for the few
 * moments that complete something (a booking confirmed, a class saved).
 * Uses the Web Animations API and cleans up after itself; no-op without motion.
 */
export function burstFrom(element: Element | null | undefined, { count = 14 } = {}) {
  if (!element || !canAnimate() || typeof (element as HTMLElement).animate !== 'function') return;
  const rect = element.getBoundingClientRect();
  const layer = document.createElement('div');
  layer.className = 'pf-burst-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.style.left = `${rect.left + rect.width / 2}px`;
  layer.style.top = `${rect.top + rect.height / 2}px`;
  document.body.appendChild(layer);

  const animations: Animation[] = [];
  for (let index = 0; index < count; index += 1) {
    const dot = document.createElement('span');
    dot.className = 'pf-burst-dot';
    const size = 4 + Math.round(Math.random() * 4);
    dot.style.width = `${size}px`;
    dot.style.height = `${size}px`;
    dot.style.background = BURST_COLORS[index % BURST_COLORS.length];
    if (index % 3 === 0) dot.style.borderRadius = '2px';
    layer.appendChild(dot);
    const angle = (Math.PI * 2 * index) / count + Math.random() * 0.5;
    const distance = 36 + Math.random() * 44;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance - 12;
    animations.push(
      dot.animate(
        [
          { transform: 'translate(-50%, -50%) scale(0.4)', opacity: 0 },
          { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: 0.18 },
          {
            transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y + 18}px)) scale(0.6) rotate(${Math.round(x * 3)}deg)`,
            opacity: 0,
          },
        ],
        { duration: 720 + Math.random() * 260, easing: BREATH_EASE, fill: 'forwards' },
      ),
    );
  }
  Promise.allSettled(animations.map((animation) => animation.finished)).then(() => layer.remove());
}
