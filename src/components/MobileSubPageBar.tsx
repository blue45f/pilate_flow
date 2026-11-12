import React, { useId, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export interface MobileSubPageOption<T extends string> {
  readonly id: T;
  readonly label: string;
  readonly badge?: string | number;
  readonly icon?: React.ReactNode;
}

export interface MobileSubPageBarProps<T extends string> {
  readonly ariaLabel: string;
  readonly activeId: T;
  readonly options: readonly MobileSubPageOption<T>[];
  readonly onSelect: (id: T) => void;
  readonly testId?: string;
  readonly compact?: boolean;
}

export function MobileSubPageBar<T extends string>({
  ariaLabel,
  activeId,
  options,
  onSelect,
  testId,
  compact = false,
}: MobileSubPageBarProps<T>) {
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const pillId = useId();
  const prefersReduced = useReducedMotion();

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const total = options.length;
    if (total === 0) return;
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? total - 1
          : event.key === 'ArrowRight'
            ? (index + 1) % total
            : (index - 1 + total) % total;
    const nextOption = options[nextIndex];
    if (nextOption) {
      onSelect(nextOption.id);
      btnRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <nav
      className={`pf-mobile-subpage-bar ${compact ? 'is-compact' : ''}`.trim()}
      aria-label={ariaLabel}
      data-testid={testId}
    >
      <div className="pf-mobile-subpage-track" role="group" aria-label={ariaLabel}>
        {options.map((opt, idx) => {
          const isActive = opt.id === activeId;
          return (
            <button
              key={opt.id}
              ref={(el) => {
                btnRefs.current[idx] = el;
              }}
              type="button"
              className={`pf-mobile-subpage-btn ${isActive ? 'is-active' : ''}`.trim()}
              aria-pressed={isActive}
              data-subpage-id={opt.id}
              onClick={() => onSelect(opt.id)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
            >
              {isActive && (
                <motion.span
                  layoutId={prefersReduced ? undefined : `pf-subpage-pill-${pillId}`}
                  className="pf-mobile-subpage-btn__pill"
                  aria-hidden="true"
                  transition={
                    prefersReduced
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 460, damping: 34, mass: 0.7 }
                  }
                />
              )}
              {opt.icon && (
                <span className="pf-mobile-subpage-btn__icon" aria-hidden="true">
                  {opt.icon}
                </span>
              )}
              <span className="pf-mobile-subpage-btn__label">{opt.label}</span>
              {opt.badge !== undefined && opt.badge !== '' && (
                <span className="pf-mobile-subpage-btn__badge" aria-hidden="true">
                  {opt.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
