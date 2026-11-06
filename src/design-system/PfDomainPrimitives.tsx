import React, { forwardRef } from 'react';

export type PfAiStatusKind =
  | 'ai-draft'
  | 'creative-memo'
  | 'tried-memo'
  | 'instructor-reviewed'
  | 'review-pending'
  | 'sample-data';

export interface PfAiStatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  kind: PfAiStatusKind;
  label?: string;
  showDot?: boolean;
}

const DEFAULT_AI_STATUS_LABELS: Record<PfAiStatusKind, string> = {
  'ai-draft': '조건 맞춤 초안 · 강사 확인 필요',
  'creative-memo': '내 창작 메모 · 전문가 검증 아님',
  'tried-memo': '직접 해봄 · 주관적 메모',
  'instructor-reviewed': '내 강사 검토 · 자격 인증 미확인',
  'review-pending': '검토 전 자료 · 수업 전 확인',
  'sample-data': '예시 기록 · 실제 수업 아님',
};

export const PfAiStatusBadge: React.FC<PfAiStatusBadgeProps> = ({
  kind,
  label,
  showDot = true,
  className = '',
  children,
  ...rest
}) => {
  const classes = [
    'pf-badge',
    'pf-ai-status',
    `pf-ai-status--${kind}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} data-pf-status-kind={kind} {...rest}>
      {showDot && <span className="pf-ai-status__dot" aria-hidden="true" />}
      <span>{children ?? label ?? DEFAULT_AI_STATUS_LABELS[kind]}</span>
    </span>
  );
};

export type PfMovementCardVariant = 'catalog' | 'step' | 'idea';

export interface PfMovementCardProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'article' | 'div' | 'li';
  variant?: PfMovementCardVariant;
  selected?: boolean;
  locked?: boolean;
}

export const PfMovementCard = forwardRef<HTMLElement, PfMovementCardProps>(function PfMovementCard(
  {
    as: Component = 'article',
    variant = 'catalog',
    selected = false,
    locked = false,
    className = '',
    children,
    ...rest
  },
  ref,
) {
  const classes = [
    'pf-movement-card',
    `pf-movement-card--${variant}`,
    selected ? 'is-selected' : '',
    locked ? 'is-locked' : '',
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

export type PfSequenceBlockPhase = 'warmup' | 'main' | 'cooldown' | 'rest';

export interface PfSequenceBlockProps extends React.HTMLAttributes<HTMLElement> {
  phase?: PfSequenceBlockPhase;
  eyebrow?: string;
  title: string;
  meta?: React.ReactNode;
}

export const PfSequenceBlock: React.FC<PfSequenceBlockProps> = ({
  phase = 'main',
  eyebrow,
  title,
  meta,
  className = '',
  children,
  ...rest
}) => {
  const classes = [
    'flow-section',
    'pf-sequence-block',
    `pf-sequence-block--${phase}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} data-pf-block-phase={phase} {...rest}>
      <div className="flow-section-label pf-sequence-block__header">
        <span>
          {eyebrow ? `${eyebrow} ` : ''}
          <strong>{title}</strong>
        </span>
        {meta !== undefined && <span>{meta}</span>}
      </div>
      <div className="pf-sequence-block__body">{children}</div>
    </div>
  );
};

export interface PfBlockPillProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'li' | 'span';
  kind?: 'movement' | 'rest' | 'memo';
}

export const PfBlockPill: React.FC<PfBlockPillProps> = ({
  as: Component = 'span',
  kind = 'movement',
  className = '',
  children,
  ...rest
}) => {
  const classes = [
    'pf-block-pill',
    `pf-block-pill--${kind}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return React.createElement(
    Component,
    {
      className: classes,
      ...rest,
    },
    children,
  );
};
