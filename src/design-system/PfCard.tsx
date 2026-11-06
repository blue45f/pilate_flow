import React, { forwardRef } from 'react';

export type PfCardVariant =
  | 'default'
  | 'subtle'
  | 'muted'
  | 'interactive'
  | 'sample'
  | 'warning'
  | 'danger';

export interface PfCardProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'article' | 'section' | 'div';
  variant?: PfCardVariant;
}

export const PfCard = forwardRef<HTMLElement, PfCardProps>(function PfCard(
  { as: Component = 'div', variant = 'default', className = '', children, ...rest },
  ref,
) {
  const classes = [
    'panel',
    'pf-card',
    variant !== 'default' ? `pf-card--${variant}` : '',
    variant === 'sample' ? 'teaching-sample-record' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return React.createElement(
    Component,
    {
      ref,
      className: classes,
      ...rest,
    },
    children,
  );
});
