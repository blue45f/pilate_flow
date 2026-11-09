import React, { useMemo } from 'react';
import { PfBadge } from '../../design-system';
import type {
  DifficultyLevel,
  PilatesExercise,
  ReformerBrand,
  SequenceStep,
} from '../../types/pilates';
import { summarizeSequenceBreathingCadence } from '../../utils/breathingCadenceEngine';
import { isRestStep } from '../../utils/sequenceEngine';
import { convertSpringTensionAcrossBrands } from '../../utils/springTensionMatrix';
import { auditSequenceStudioReadiness } from '../../utils/studioReadinessAudit';

export interface StudioReadinessAuditCardProps {
  readonly steps: readonly SequenceStep[];
  readonly exercisesById: ReadonlyMap<string, PilatesExercise>;
  readonly level: DifficultyLevel;
  readonly reformerBrand: ReformerBrand;
}

const PLANE_LABELS_KO: Record<'flexion' | 'extension' | 'lateral' | 'rotation', string> = {
  flexion: '굴곡',
  extension: '신전',
  lateral: '측굴',
  rotation: '회전',
};

export const StudioReadinessAuditCard: React.FC<StudioReadinessAuditCardProps> = ({
  steps,
  exercisesById,
  level,
  reformerBrand,
}) => {
  const readiness = useMemo(
    () => auditSequenceStudioReadiness(steps, exercisesById),
    [steps, exercisesById],
  );
  const breathing = useMemo(
    () => summarizeSequenceBreathingCadence(steps, exercisesById, level),
    [steps, exercisesById, level],
  );
  const sampleSpringConversion = useMemo(() => {
    const firstSpringStep = steps.find((st) => {
      if (isRestStep(st)) return false;
      const ex = exercisesById.get(st.exerciseId);
      return Boolean(st.customSpringOverride || ex?.springs);
    });
    const ex = firstSpringStep ? exercisesById.get(firstSpringStep.exerciseId) : undefined;
    return convertSpringTensionAcrossBrands(firstSpringStep?.customSpringOverride || ex?.springs);
  }, [steps, exercisesById]);

  return (
    <section
      className="pf-card pf-studio-readiness-card"
      data-testid="studio-readiness-audit-badge"
      aria-label="스튜디오 운영 준비도 및 호흡·스프링 진단"
    >
      <div className="pf-studio-readiness-card__header">
        <strong className="pf-studio-readiness-card__title">{readiness.summaryLabelKo}</strong>
        <PfBadge tone={readiness.score >= 85 ? 'success' : 'warning'}>
          준비도 {readiness.score}/100
        </PfBadge>
      </div>
      <div className="pf-studio-readiness-card__metrics" role="list" aria-label="호흡·스프링·척추 평면 요약">
        <span className="pf-studio-readiness-card__metric-chip" role="listitem">
          {breathing.headlineKo}
        </span>
        <span className="pf-studio-readiness-card__metric-chip" role="listitem">
          대표 스프링 환산({reformerBrand}):{' '}
          <strong>{sampleSpringConversion.equivalentsByBrand[reformerBrand]}</strong> (
          {sampleSpringConversion.tierLabelKo})
        </span>
        {readiness.missingSpinalPlanes.length > 0 && (
          <span
            className="pf-studio-readiness-card__metric-chip pf-studio-readiness-card__metric-chip--warning"
            role="listitem"
          >
            미포함 척추 평면:{' '}
            {readiness.missingSpinalPlanes.map((p) => PLANE_LABELS_KO[p]).join(', ')}
          </span>
        )}
      </div>
    </section>
  );
};
