import React, { useRef } from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

export interface PfTabItem<T extends string = string> {
  id: T;
  label: React.ReactNode;
  disabled?: boolean;
  badge?: React.ReactNode;
}

export interface PfTabsProps<T extends string = string> {
  items: readonly PfTabItem<T>[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel: string;
  /**
   * 'tablist' uses @radix-ui/react-tabs (role="tablist" + role="tab" + aria-selected + roving tabindex + aria-controls).
   * 'group' uses role="group" + aria-pressed to preserve toggle filter group semantics.
   */
  semantics?: 'tablist' | 'group';
  variant?: 'segmented' | 'pills';
  className?: string;
  itemClassName?: string;
  activeItemClassName?: string;
  /** Optional Radix Tabs.Content panels when semantics === 'tablist'. */
  children?: React.ReactNode;
}

export const PfTabContent = TabsPrimitive.Content;

export function PfTabs<T extends string = string>({
  items,
  value,
  onChange,
  ariaLabel,
  semantics = 'tablist',
  variant = 'segmented',
  className = '',
  itemClassName = '',
  activeItemClassName = 'active',
  children,
}: PfTabsProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.defaultPrevented) return;
    const keys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(event.key)) return;

    const buttons = Array.from(
      containerRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [],
    );
    if (buttons.length === 0) return;

    const currentIndex = buttons.findIndex((btn) => btn === document.activeElement);
    const fallbackIndex = Math.max(
      0,
      buttons.findIndex((btn) => btn.dataset.tabId === value),
    );
    const startIndex = currentIndex >= 0 ? currentIndex : fallbackIndex;

    let nextIndex = startIndex;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (startIndex + 1) % buttons.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (startIndex - 1 + buttons.length) % buttons.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = buttons.length - 1;
    }

    event.preventDefault();
    const targetButton = buttons[nextIndex];
    targetButton?.focus();
    const nextId = targetButton?.dataset.tabId as T | undefined;
    if (nextId && nextId !== value) {
      onChange(nextId);
    }
  };

  const containerClasses = ['pf-tabs', `pf-tabs--${variant}`, className]
    .filter(Boolean)
    .join(' ');

  if (semantics === 'tablist') {
    return (
      <TabsPrimitive.Root
        value={value}
        onValueChange={(next) => onChange(next as T)}
        activationMode="automatic"
      >
        <TabsPrimitive.List
          ref={containerRef}
          aria-label={ariaLabel}
          loop
          className={containerClasses}
          onKeyDown={handleKeyDown}
        >
          {items.map((item) => {
            const isActive = item.id === value;
            const btnClasses = [
              'pf-tab',
              itemClassName,
              isActive ? activeItemClassName : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <TabsPrimitive.Trigger
                key={item.id}
                value={item.id}
                data-tab-id={item.id}
                disabled={item.disabled}
                className={btnClasses}
                onKeyDown={handleKeyDown}
                onClick={() => {
                  if (!item.disabled && item.id !== value) {
                    onChange(item.id);
                  }
                }}
              >
                {item.label}
                {item.badge !== undefined && <small>{item.badge}</small>}
              </TabsPrimitive.Trigger>
            );
          })}
        </TabsPrimitive.List>
        {children}
      </TabsPrimitive.Root>
    );
  }

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label={ariaLabel}
      className={containerClasses}
      onKeyDown={handleKeyDown}
    >
      {items.map((item) => {
        const isActive = item.id === value;
        const btnClasses = [
          'pf-tab',
          itemClassName,
          isActive ? activeItemClassName : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <button
            key={item.id}
            type="button"
            data-tab-id={item.id}
            aria-pressed={isActive}
            disabled={item.disabled}
            className={btnClasses}
            onClick={() => onChange(item.id)}
          >
            {item.label}
            {item.badge !== undefined && <small>{item.badge}</small>}
          </button>
        );
      })}
    </div>
  );
}
