import React, { forwardRef } from 'react';

export type PfButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon' | 'text';
export type PfButtonSize = 'sm' | 'md' | 'lg';

export interface PfButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: PfButtonVariant;
  size?: PfButtonSize;
  loading?: boolean;
  loadingLabel?: string;
  pressed?: boolean;
  fullWidth?: boolean;
}

const LEGACY_VARIANT_CLASS: Record<PfButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-secondary teaching-delete',
  icon: 'icon-btn',
  text: 'text-button',
};

export const PfButton = forwardRef<HTMLButtonElement, PfButtonProps>(function PfButton(
  {
    variant = 'secondary',
    size = 'md',
    loading = false,
    loadingLabel,
    pressed,
    fullWidth = false,
    disabled,
    className = '',
    type = 'button',
    children,
    onClick,
    ...rest
  },
  ref,
) {
  const isDisabled = Boolean(disabled || loading);
  const legacyClass = LEGACY_VARIANT_CLASS[variant];
  const classes = [
    legacyClass,
    'pf-btn',
    `pf-btn--${variant}`,
    size !== 'md' ? `pf-btn--${size}` : '',
    fullWidth ? 'pf-btn--full' : '',
    loading ? 'pf-btn--loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading ? true : undefined}
      aria-pressed={pressed}
      className={classes}
      onClick={(event) => {
        if (isDisabled) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      {...rest}
    >
      {loading && <span className="pf-spinner" aria-hidden="true" />}
      {loading && loadingLabel ? <span>{loadingLabel}</span> : children}
    </button>
  );
});
