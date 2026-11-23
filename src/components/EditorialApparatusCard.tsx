import React, { useState } from 'react';
import type { ApparatusType } from '../types/pilates';
import { getApparatusEditorialHero } from '../utils/instructorUxHelpers';

export interface EditorialApparatusImageProps {
  readonly apparatus: ApparatusType | 'mixed';
  readonly className?: string;
  readonly alt?: string;
}

export const EditorialApparatusImage: React.FC<EditorialApparatusImageProps> = ({
  apparatus,
  className = '',
  alt,
}) => {
  const hero = getApparatusEditorialHero(apparatus);
  const [stage, setStage] = useState<'webp' | 'png' | 'fallback'>('webp');
  const src = stage === 'webp' ? hero.webpSrc : stage === 'png' ? hero.pngSrc : hero.fallbackSrc;

  return (
    <img
      key={`${apparatus}-${stage}`}
      src={src}
      alt={alt ?? `${hero.labelKo} 스튜디오 화보`}
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => {
        setStage((prev) => (prev === 'webp' ? 'png' : 'fallback'));
      }}
    />
  );
};

export interface ApparatusEditorialHeroBannerProps {
  readonly apparatus: ApparatusType | 'mixed';
  readonly countLabel?: string;
  readonly compact?: boolean;
}

export const ApparatusEditorialHeroBanner: React.FC<ApparatusEditorialHeroBannerProps> = ({
  apparatus,
  countLabel,
  compact = false,
}) => {
  const hero = getApparatusEditorialHero(apparatus);

  return (
    <figure
      className={`pf-editorial-apparatus-hero ${compact ? 'is-compact' : ''}`.trim()}
      data-testid={`editorial-apparatus-hero-${apparatus}`}
    >
      <div className="pf-editorial-apparatus-hero__media">
        <EditorialApparatusImage
          key={apparatus}
          apparatus={apparatus}
          className="pf-editorial-apparatus-hero__img"
        />
      </div>
      <figcaption className="pf-editorial-apparatus-hero__caption">
        <div className="pf-editorial-apparatus-hero__title-row">
          <strong>{hero.labelKo} 스튜디오</strong>
          {countLabel && <span className="pf-editorial-apparatus-hero__count">{countLabel}</span>}
        </div>
        <p>{hero.subtitleKo}</p>
      </figcaption>
    </figure>
  );
};
