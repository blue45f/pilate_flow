import React, { useState, type ReactNode } from 'react';
import type { ApparatusType } from '../types/pilates';
import notebookSmall from '../assets/atelier/notebook-640.webp';
import notebookLarge from '../assets/atelier/notebook-1280.webp';
import { getApparatusEditorialHero } from '../utils/instructorUxHelpers';

export interface EditorialApparatusImageProps {
  readonly apparatus: ApparatusType | 'mixed';
  readonly className?: string;
  readonly alt?: string;
  readonly eager?: boolean;
}

export const EditorialApparatusImage: React.FC<EditorialApparatusImageProps> = ({
  apparatus,
  className = '',
  alt,
  eager = false,
}) => {
  const hero = getApparatusEditorialHero(apparatus);
  const [stage, setStage] = useState<'webp' | 'png' | 'fallback'>('webp');
  const src = stage === 'webp' ? hero.webpSrc : stage === 'png' ? hero.pngSrc : hero.fallbackSrc;

  return (
    <img
      key={`${apparatus}-${stage}`}
      src={src}
      alt={alt ?? `${hero.labelKo} 스튜디오 화보`}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={className}
      onError={() => {
        setStage((prev) => (prev === 'webp' ? 'png' : 'fallback'));
      }}
    />
  );
};

/** 작업 화면의 제목과 주 작업을 같은 위치에 둔다. */
export function MovementWorkspaceCover({
  apparatus = 'reformer',
  notebook,
  title,
  description,
  children,
}: {
  apparatus?: ApparatusType | 'mixed';
  notebook?: boolean;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <header className="movement-workspace-cover">
      <div className="movement-workspace-cover__body">
        <h1 id="workspace-main-heading" tabIndex={-1}>{title}</h1>
        <p>{description}</p>
        {children && <div className="movement-workspace-cover__actions">{children}</div>}
      </div>
      <div className="movement-workspace-cover__photo" data-testid={notebook ? undefined : `editorial-apparatus-hero-${apparatus}`}>
        {notebook ? (
          <img src={notebookSmall} srcSet={`${notebookSmall} 640w, ${notebookLarge} 1280w`} sizes="(max-width: 640px) 90vw, 40vw" decoding="async" alt="" />
        ) : (
          <EditorialApparatusImage key={apparatus} apparatus={apparatus} alt="" eager />
        )}
      </div>
    </header>
  );
}
