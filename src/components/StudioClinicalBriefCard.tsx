import { CheckCircle2, ExternalLink, Sparkles, Youtube } from 'lucide-react';
import { getStudioVerifiedGuidance } from '../data/clinicalVerificationLibrary';
import type { PilatesExercise } from '../types/pilates';

export interface StudioClinicalBriefCardProps {
  exercise: PilatesExercise;
  compact?: boolean;
}

export function StudioClinicalBriefCard({
  exercise,
  compact = false,
}: StudioClinicalBriefCardProps) {
  const guidance = getStudioVerifiedGuidance(exercise);

  return (
    <section
      className="studio-clinical-brief-card"
      data-testid="studio-clinical-brief-card"
      aria-label={`${exercise.nameKo} 교차 검증 실전 가이드`}
      style={{
        borderRadius: '12px',
        border: '1px solid rgba(74, 107, 93, 0.24)',
        background:
          'linear-gradient(145deg, rgba(242, 247, 244, 0.92) 0%, rgba(250, 247, 242, 0.96) 100%)',
        padding: compact ? '10px 12px' : '12px 14px',
        display: 'grid',
        gap: '8px',
        fontSize: '0.82rem',
        lineHeight: 1.45,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontWeight: 700,
            color: '#285443',
            background: 'rgba(40, 84, 67, 0.1)',
            padding: '3px 8px',
            borderRadius: '999px',
            fontSize: '0.75rem',
          }}
        >
          <CheckCircle2 size={13} aria-hidden="true" />
          {guidance.verificationBadgeKo}
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            color: '#5a5248',
            fontSize: '0.73rem',
            fontWeight: 600,
          }}
        >
          <Sparkles size={12} aria-hidden="true" />
          임상 문헌·유튜브 시연 교차 대조
        </span>
      </div>

      <dl
        style={{
          margin: 0,
          display: 'grid',
          gap: '6px',
        }}
      >
        <div style={{ display: 'grid', gap: '2px' }}>
          <dt style={{ fontWeight: 700, color: '#2f3e37', fontSize: '0.75rem' }}>
            권장 기구·스프링 세팅
          </dt>
          <dd style={{ margin: 0, color: '#3b352e' }}>{guidance.springAndSetupStandardKo}</dd>
        </div>
        <div style={{ display: 'grid', gap: '2px' }}>
          <dt style={{ fontWeight: 700, color: '#2f3e37', fontSize: '0.75rem' }}>
            생체역학·정렬 핵심 큐
          </dt>
          <dd style={{ margin: 0, color: '#3b352e' }}>{guidance.biomechanicalFocusKo}</dd>
        </div>
        {!compact && (
          <div style={{ display: 'grid', gap: '2px' }}>
            <dt style={{ fontWeight: 700, color: '#2f3e37', fontSize: '0.75rem' }}>
              호흡·템포 가이드
            </dt>
            <dd style={{ margin: 0, color: '#3b352e' }}>{guidance.breathingCadenceKo}</dd>
          </div>
        )}
      </dl>

      <details style={{ marginTop: '2px' }}>
        <summary
          style={{
            cursor: 'pointer',
            fontWeight: 600,
            color: '#285443',
            fontSize: '0.76rem',
            userSelect: 'none',
          }}
        >
          검증된 유튜브 시연 영상 & 임상 근거 바로가기
        </summary>
        <div
          style={{
            marginTop: '8px',
            display: 'grid',
            gap: '6px',
            paddingTop: '6px',
            borderTop: '1px solid rgba(74, 107, 93, 0.16)',
          }}
        >
          <a
            href={guidance.primaryVideo.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              color: '#1f4e3d',
              fontWeight: 600,
              textDecoration: 'underline',
            }}
          >
            <Youtube size={13} aria-hidden="true" />
            {guidance.primaryVideo.titleKo} ({guidance.primaryVideo.channelName})
            <ExternalLink size={11} aria-hidden="true" />
          </a>
          <p style={{ margin: 0, color: '#4d463e', fontSize: '0.75rem' }}>
            • {guidance.primaryVideo.keyTakeawayKo}
          </p>
          <a
            href={guidance.secondaryVideo.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              color: '#1f4e3d',
              fontWeight: 600,
              textDecoration: 'underline',
            }}
          >
            <Youtube size={13} aria-hidden="true" />
            {guidance.secondaryVideo.titleKo} ({guidance.secondaryVideo.channelName})
            <ExternalLink size={11} aria-hidden="true" />
          </a>
          <a
            href={guidance.literature.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              color: '#3b4d63',
              fontWeight: 600,
              textDecoration: 'underline',
              marginTop: '2px',
            }}
          >
            {guidance.literature.titleKo}
            <ExternalLink size={11} aria-hidden="true" />
          </a>
          <p style={{ margin: 0, color: '#5a5248', fontSize: '0.73rem' }}>
            {guidance.literature.clinicalSummaryKo} ({guidance.literature.citation})
          </p>
        </div>
      </details>
    </section>
  );
}
