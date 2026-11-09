import React, { useMemo } from 'react';
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
      className="pf-card"
      data-testid="studio-readiness-audit-badge"
      aria-label="스튜디오 운영 준비도 및 호흡·스프링 진단"
      style={{
        padding: '12px 16px',
        display: 'grid',
        gap: '8px',
        background: '#f5f8f6',
        border: '1px solid #d8e5de',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <strong style={{ fontSize: '13px', color: '#173d34' }}>{readiness.summaryLabelKo}</strong>
        <span
          style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '999px',
            background: readiness.score >= 85 ? '#dcfce7' : '#fef3c7',
            color: readiness.score >= 85 ? '#166534' : '#92400e',
            fontWeight: 600,
          }}
        >
          준비도 {readiness.score}/100
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          fontSize: '12px',
          color: '#344e46',
        }}
      >
        <span>{breathing.headlineKo}</span>
        <span>·</span>
        <span>
          대표 스프링 환산({reformerBrand}):{' '}
          <strong>{sampleSpringConversion.equivalentsByBrand[reformerBrand]}</strong> (
          {sampleSpringConversion.tierLabelKo})
        </span>
        {readiness.missingSpinalPlanes.length > 0 && (
          <>
            <span>·</span>
            <span>
              미포함 척추 평면:{' '}
              {readiness.missingSpinalPlanes.map((p) => PLANE_LABELS_KO[p]).join(', ')}
            </span>
          </>
        )}
      </div>
    </section>
  );
};
