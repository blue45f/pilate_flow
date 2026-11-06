import React from 'react';
import { AlertCircle, AlertTriangle, Check, Info } from 'lucide-react';

export type PfStatusTone = 'info' | 'success' | 'warning' | 'danger';

export interface PfStatusBannerProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: PfStatusTone;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export const PfStatusBanner: React.FC<PfStatusBannerProps> = ({
  tone = 'info',
  icon,
  action,
  role,
  className = '',
  children,
  ...rest
}) => {
  const defaultRole = tone === 'danger' || tone === 'warning' ? 'alert' : 'status';
  const defaultIcon =
    icon !== undefined ? (
      icon
    ) : tone === 'success' ? (
      <Check size={16} aria-hidden="true" />
    ) : tone === 'warning' ? (
      <AlertTriangle size={16} aria-hidden="true" />
    ) : tone === 'danger' ? (
      <AlertCircle size={16} aria-hidden="true" />
    ) : (
      <Info size={16} aria-hidden="true" />
    );

  const classes = [
    'pf-status-banner',
    `pf-status-banner--${tone}`,
    tone === 'success' ? 'teaching-feedback' : '',
    tone === 'danger' ? 'teaching-error' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div role={role ?? defaultRole} className={classes} {...rest}>
      <span className="pf-status-banner__content">
        {defaultIcon}
        <span>{children}</span>
      </span>
      {action && <div className="pf-status-banner__action">{action}</div>}
    </div>
  );
};

export interface PfEmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  headingLevel?: 'h2' | 'h3';
  action?: React.ReactNode;
}

export const PfEmptyState: React.FC<PfEmptyStateProps> = ({
  icon,
  title,
  description,
  headingLevel: Heading = 'h2',
  action,
  className = '',
  ...rest
}) => {
  const classes = ['panel', 'teaching-empty', 'pf-empty-state', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...rest}>
      {icon && (
        <span className="pf-empty-state__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <Heading>{title}</Heading>
      {description && <p className="muted">{description}</p>}
      {action}
    </div>
  );
};

export interface PfLoadingStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  description?: React.ReactNode;
}

export const PfLoadingState: React.FC<PfLoadingStateProps> = ({
  title = '자료를 불러오고 있어요…',
  description,
  className = '',
  ...rest
}) => {
  const classes = ['panel', 'pf-loading-state', className].filter(Boolean).join(' ');

  return (
    <div role="status" aria-live="polite" aria-busy="true" className={classes} {...rest}>
      <span className="pf-loading-state__icon" aria-hidden="true">
        <span className="pf-spinner" />
      </span>
      <h3>{title}</h3>
      {description && <p className="muted">{description}</p>}
    </div>
  );
};

export interface PfErrorStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

export const PfErrorState: React.FC<PfErrorStateProps> = ({
  title,
  description,
  action,
  className = '',
  ...rest
}) => {
  const classes = ['panel', 'pf-error-state', className].filter(Boolean).join(' ');

  return (
    <div role="alert" className={classes} {...rest}>
      <span className="pf-error-state__icon" aria-hidden="true">
        <AlertCircle size={22} />
      </span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
};
