import React, { useMemo } from 'react';
import { APPARATUS_LABELS, INITIAL_EXERCISES, POSITION_LABELS } from '../data/pilatesCatalog';
import { getCatalogContinuousMotionAsset } from '../data/catalogMotionAssets';
import { getMotionPatternReferences } from '../data/motionPatternReferences';
import type { PilatesExercise } from '../types/pilates';
import { isMovementIdeaExercise, readMovementIdeaDraft } from '../utils/movementIdeaDraft';
import { CatalogMotionThumbnail } from './CatalogMotionInteractivePlayer';
import { MotionPatternThumbnail } from './MotionPatternPreview';
import { MovementPhaseDiagramSvg } from './MovementPhaseDiagramSvg';

export interface ExerciseThumbnailBadgeProps {
  exercise?: PilatesExercise | null;
  exerciseId?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showPhaseStrip?: boolean;
  decorative?: boolean;
  className?: string;
}

const SIZE_DIMENSIONS: Record<NonNullable<ExerciseThumbnailBadgeProps['size']>, { width: string; minWidth: string }> = {
  xs: { width: '44px', minWidth: '44px' },
  sm: { width: '64px', minWidth: '64px' },
  md: { width: '96px', minWidth: '96px' },
  lg: { width: '100%', minWidth: '140px' },
};

export function ExerciseThumbnailBadge({
  exercise,
  exerciseId,
  size = 'sm',
  showPhaseStrip = false,
  decorative = true,
  className = '',
}: ExerciseThumbnailBadgeProps): React.JSX.Element | null {
  const resolvedExercise = useMemo(() => {
    if (exercise) return exercise;
    if (!exerciseId) return null;
    return INITIAL_EXERCISES.find((item) => item.id === exerciseId) ?? null;
  }, [exercise, exerciseId]);

  const patternRef = useMemo(
    () => (resolvedExercise ? getMotionPatternReferences(resolvedExercise.id)[0] ?? null : null),
    [resolvedExercise],
  );

  const catalogMotion = useMemo(
    () => (resolvedExercise ? getCatalogContinuousMotionAsset(resolvedExercise) : null),
    [resolvedExercise],
  );

  const ideaPhotoUrl = useMemo(() => {
    if (!resolvedExercise || !isMovementIdeaExercise(resolvedExercise)) return null;
    return readMovementIdeaDraft(resolvedExercise)?.photoDataUrl ?? null;
  }, [resolvedExercise]);

  if (!resolvedExercise || !catalogMotion) return null;

  const dims = SIZE_DIMENSIONS[size];
  const appShort = APPARATUS_LABELS[resolvedExercise.apparatus]?.short ?? resolvedExercise.apparatus;
  const posKo = POSITION_LABELS[resolvedExercise.bodyPosition]?.ko ?? resolvedExercise.bodyPosition;

  if (showPhaseStrip) {
    return (
      <div
        className={`pf-exercise-thumbnail-strip ${className}`.trim()}
        data-testid="exercise-thumbnail-phase-strip"
        data-exercise-id={resolvedExercise.id}
        data-apparatus={resolvedExercise.apparatus}
        aria-hidden={decorative ? 'true' : undefined}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '6px',
          padding: '6px',
          borderRadius: '10px',
          backgroundColor: 'var(--pf-color-bg-surface-subtle, #F5F7F2)',
          border: '1px solid var(--pf-color-border-default, #D5DDD0)',
        }}
      >
        {(
          [
            { id: 'start', label: '시작' },
            { id: 'middle', label: '중간(정점)' },
            { id: 'end', label: '끝(복귀)' },
          ] as const
        ).map((phaseItem) => (
          <div
            key={phaseItem.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
              backgroundColor: 'var(--pf-color-bg-surface, #FFFEF9)',
              borderRadius: '8px',
              padding: '4px',
              border: '1px solid var(--pf-color-border-default, #E2E8DD)',
            }}
          >
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: 'var(--pf-color-action-primary, #173D34)',
                textAlign: 'center',
              }}
            >
              {phaseItem.label}
            </span>
            <MovementPhaseDiagramSvg
              asset={catalogMotion.visualAsset}
              phase={phaseItem.id}
              compact
              showGhostStartPose={phaseItem.id === 'middle'}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <span
      className={`pf-exercise-thumbnail-badge pf-exercise-thumbnail-badge--${size} ${className}`.trim()}
      data-testid="exercise-thumbnail-badge"
      data-exercise-id={resolvedExercise.id}
      data-apparatus={resolvedExercise.apparatus}
      aria-hidden={decorative ? 'true' : undefined}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        width: dims.width,
        minWidth: dims.minWidth,
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: 'var(--pf-color-bg-surface, #FFFEF9)',
        border: '1px solid var(--pf-color-border-default, #D5DDD0)',
        flexShrink: 0,
        verticalAlign: 'middle',
      }}
    >
      {ideaPhotoUrl ? (
        <img
          src={ideaPhotoUrl}
          alt=""
          aria-hidden="true"
          loading="lazy"
          style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
        />
      ) : patternRef ? (
        <MotionPatternThumbnail reference={patternRef} />
      ) : (
        <CatalogMotionThumbnail asset={catalogMotion} />
      )}
      {size !== 'xs' && (
        <span
          style={{
            fontSize: '10px',
            fontWeight: 600,
            lineHeight: 1.2,
            padding: '2px 4px',
            textAlign: 'center',
            color: 'var(--pf-color-text-secondary, #3D4F45)',
            backgroundColor: 'var(--pf-color-bg-surface-subtle, #F3F5EE)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {appShort} · {posKo}
        </span>
      )}
    </span>
  );
}
