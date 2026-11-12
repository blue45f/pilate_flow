import React from 'react';
import { Compass, Sparkles } from 'lucide-react';
import { deriveExerciseUserIntent } from '../utils/exerciseUserIntent';
import type { PilatesExercise } from '../types/pilates';

export interface PageIntentBannerProps {
  readonly stepBadge: string;
  readonly title: string;
  readonly purpose: string;
  readonly singleActionHint?: string;
  readonly tone?: 'atelier' | 'emerald';
  readonly testId?: string;
}

export const PageIntentBanner: React.FC<PageIntentBannerProps> = ({
  stepBadge,
  title,
  purpose,
  singleActionHint,
  tone = 'atelier',
  testId = 'page-intent-banner',
}) => {
  return (
    <aside
      className={`pf-page-intent-banner ${tone === 'emerald' ? 'is-emerald' : 'is-atelier'}`}
      data-testid={testId}
      aria-label={`${title} 화면 의도 안내`}
    >
      <div className="pf-page-intent-banner__top">
        <span className="pf-page-intent-banner__badge">
          <Compass size={13} aria-hidden="true" />
          <span>{stepBadge}</span>
        </span>
        {singleActionHint && (
          <span className="pf-page-intent-banner__action-pill">
            <Sparkles size={12} aria-hidden="true" />
            <span>핵심 행동 · {singleActionHint}</span>
          </span>
        )}
      </div>
      <div className="pf-page-intent-banner__body">
        <strong className="pf-page-intent-banner__title">{title}</strong>
        <p className="pf-page-intent-banner__purpose">{purpose}</p>
      </div>
    </aside>
  );
};

export const MovementDetailIntentBanner: React.FC<{
  readonly exercise: PilatesExercise;
  readonly compact?: boolean;
}> = ({ exercise, compact = false }) => {
  const intent = deriveExerciseUserIntent(exercise);
  return (
    <section
      className={`pf-detail-intent-banner ${compact ? 'is-compact' : ''}`.trim()}
      data-testid="detail-movement-intent-banner"
      aria-label={`${exercise.nameKo} 동작 의도 요약`}
    >
      <span className="pf-detail-intent-banner__eyebrow">카탈로그 분류로 보는 수업 구성 참고</span>
      <p className="pf-detail-intent-banner__headline">{intent.headlineKo}</p>
      <div className="pf-detail-intent-banner__pills">
        <span>분류 구간 · {intent.roleLabelKo}</span>
        <span>집중 부위 · {intent.focusSummaryKo}</span>
        <span>기본 구성 · {intent.pacingSummaryKo}</span>
      </div>
    </section>
  );
};
