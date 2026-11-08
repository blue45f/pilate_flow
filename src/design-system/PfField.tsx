import React, { forwardRef, useId } from 'react';
import { AlertCircle, Search } from 'lucide-react';

export interface PfFormErrorProps extends React.HTMLAttributes<HTMLParagraphElement> {
  id?: string;
  inline?: boolean;
  children: React.ReactNode;
}

export const PfFormError: React.FC<PfFormErrorProps> = ({
  id,
  inline = false,
  className = '',
  role = 'alert',
  children,
  ...rest
}) => {
  if (!children) return null;
  const classes = [
    'teaching-error',
    'pf-form-error',
    inline ? 'pf-form-error--inline' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <p id={id} role={role} className={classes} {...rest}>
      <AlertCircle size={15} aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
};

export interface PfFieldProps {
  label: React.ReactNode;
  htmlFor?: string;
  as?: 'label' | 'div';
  required?: boolean;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  errorId?: string;
  hintId?: string;
  className?: string;
  children: React.ReactNode;
}

export const PfField: React.FC<PfFieldProps> = ({
  label,
  htmlFor,
  as = 'label',
  required = false,
  hint,
  error,
  errorId,
  hintId,
  className = '',
  children,
}) => {
  const classes = ['form-field', 'pf-field', error ? 'pf-field--error' : '', className]
    .filter(Boolean)
    .join(' ');

  const labelContent = (
    <>
      {label}
      {required && (
        <span className="pf-field__required" aria-hidden="true">
          *
        </span>
      )}
    </>
  );

  if (as === 'div') {
    return (
      <div className={classes}>
        <label className="pf-field__label" htmlFor={htmlFor}>
          {labelContent}
        </label>
        {children}
        {hint && (
          <small id={hintId} className="muted pf-field__hint">
            {hint}
          </small>
        )}
        {error && (
          <PfFormError id={errorId} inline>
            {error}
          </PfFormError>
        )}
      </div>
    );
  }

  return (
    <label className={classes} htmlFor={htmlFor}>
      <span className="pf-field__label">{labelContent}</span>
      {children}
      {hint && (
        <small id={hintId} className="muted pf-field__hint">
          {hint}
        </small>
      )}
      {error && (
        <PfFormError id={errorId} inline>
          {error}
        </PfFormError>
      )}
    </label>
  );
};

export interface PfInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const PfInput = forwardRef<HTMLInputElement, PfInputProps>(function PfInput(
  { hasError = false, className = '', 'aria-invalid': ariaInvalid, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={ariaInvalid ?? (hasError ? true : undefined)}
      className={['pf-input', className].filter(Boolean).join(' ')}
      {...rest}
    />
  );
});

export interface PfSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export const PfSelect = forwardRef<HTMLSelectElement, PfSelectProps>(function PfSelect(
  { hasError = false, className = '', 'aria-invalid': ariaInvalid, children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      aria-invalid={ariaInvalid ?? (hasError ? true : undefined)}
      className={['pf-select', className].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </select>
  );
});

export interface PfTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const PfTextarea = forwardRef<HTMLTextAreaElement, PfTextareaProps>(function PfTextarea(
  { hasError = false, className = '', 'aria-invalid': ariaInvalid, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={ariaInvalid ?? (hasError ? true : undefined)}
      className={['pf-textarea', className].filter(Boolean).join(' ')}
      {...rest}
    />
  );
});

export interface PfSearchFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  wrapperClassName?: string;
  type?: 'text' | 'search';
}

export const PfSearchField = forwardRef<HTMLInputElement, PfSearchFieldProps>(
  function PfSearchField(
    { label, wrapperClassName = '', className = '', id, type = 'text', ...rest },
    ref,
  ) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    return (
      <label
        htmlFor={inputId}
        className={['pf-search', wrapperClassName].filter(Boolean).join(' ')}
      >
        <Search size={17} aria-hidden="true" />
        <span className="sr-only">{label}</span>
        <input
          ref={ref}
          id={inputId}
          type={type}
          aria-label={rest['aria-label'] ?? label}
          className={className}
          {...rest}
        />
      </label>
    );
  },
);
