import React from 'react';

export type PfBadgeTone =
  | 'neutral'
  | 'brand'
  | 'sage'
  | 'success'
  | 'warning'
  | 'danger'
  | 'sample';

export interface PfBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: PfBadgeTone;
  shape?: 'pill' | 'rect';
}

export const PfBadge: React.FC<PfBadgeProps> = ({
  tone = 'neutral',
  shape = 'pill',
  className = '',
  children,
  ...rest
}) => {
  const classes = [
    'pf-badge',
    `pf-badge--${tone}`,
    shape === 'rect' ? 'pf-badge--rect' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} {...rest}>
      {children}
    </span>
  );
};
