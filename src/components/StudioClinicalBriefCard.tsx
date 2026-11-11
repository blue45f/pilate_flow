import { ExternalLink, FileText, Info, Layers, Youtube } from 'lucide-react';
import { APPARATUS_LABELS, CANONICAL_BLOCKS } from '../data/pilatesCatalog';
import { getStudioVerifiedGuidance } from '../data/clinicalVerificationLibrary';
import type { PilatesExercise } from '../types/pilates';
import { getExerciseReviewState } from '../utils/exerciseReview';
import '../styles/library-inspector-usability.css';

export interface StudioClinicalBriefCardProps {
  exercise: PilatesExercise;
  compact?: boolean;
  showNoteComparison?: boolean;
}

export function StudioClinicalBriefCard({
  exercise,
  compact = false,
  showNoteComparison = false,
}: StudioClinicalBriefCardProps) {
  const guidance = getStudioVerifiedGuidance(exercise);
  const reviewState = getExerciseReviewState(exercise);
  const blockLabel =
    CANONICAL_BLOCKS.find((item) => item.category === exercise.blockCategory)?.nameKo ??
    exercise.blockCategory;
  const canDisplayRecordedNote =
    showNoteComparison || !compact || reviewState === 'approved';

  const noteStatusLabel =
    reviewState === 'approved'
      ? '내 강사 검토 기록 있음'
      : reviewState === 'stale'
        ? '정보 변경됨 · 재검토 필요'
        : '개인 검토 전 · 원문 확인 필요';

  return (
    <section
      className={`studio-clinical-brief-card${compact ? ' is-compact' : ''}`}
      data-testid="studio-clinical-brief-card"
      data-template-tier={guidance.verificationTier}
      aria-label={`${exercise.nameKo} 노트 기재값과 기구·구간 공통 참고 구분`}
    >
      <div className="scb-header-row">
        <span className="scb-template-badge" data-testid="brief-template-badge">
          <Info size={13} aria-hidden="true" />
          {guidance.verificationBadgeKo}
        </span>
        <span className="scb-scope-tag">개별 동작 검수·임상 유효성 확인 아님</span>
      </div>

      <p className="scb-scope-notice">{guidance.scopeNoticeKo}</p>

      {canDisplayRecordedNote ? (
        <div
          className={`scb-note-box is-${reviewState}`}
          data-testid="brief-exercise-note-box"
        >
          <div className="scb-box-heading">
            <span className="scb-box-title">
              <FileText size={13} aria-hidden="true" /> 이 동작 노트 기재값
            </span>
            <span className="scb-box-status">{noteStatusLabel}</span>
          </div>
          <dl className="scb-dl">
            <div>
              <dt>노트 기재 스프링·세팅</dt>
              <dd>{guidance.exerciseNote.springsKo ?? '별도 기재 없음'}</dd>
            </div>
            <div>
              <dt>노트 기재 호흡</dt>
              <dd>{guidance.exerciseNote.breathPatternKo ?? '별도 기재 없음'}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <p className="scb-hidden-note-hint" data-testid="brief-note-hidden-until-review">
          이 동작 노트의 스프링·호흡 기재값은 개인 검토 완료 후 별도로 표시합니다.
        </p>
      )}

      <div className="scb-template-box" data-testid="brief-apparatus-template-box">
        <div className="scb-box-heading">
          <span className="scb-box-title">
            <Layers size={13} aria-hidden="true" />{' '}
            {APPARATUS_LABELS[exercise.apparatus].ko} · {blockLabel} 공통 참고 템플릿
          </span>
          <span className="scb-box-status">동작별 전용 값 아님</span>
        </div>
        <dl className="scb-dl">
          <div>
            <dt>기구·구간 공통 세팅 참고</dt>
            <dd>{guidance.springAndSetupStandardKo}</dd>
          </div>
          <div>
            <dt>기구·구간 정렬 참고</dt>
            <dd>{guidance.biomechanicalFocusKo}</dd>
          </div>
          {(!compact || showNoteComparison) && (
            <div>
              <dt>구간 공통 호흡 참고</dt>
              <dd>{guidance.breathingCadenceKo}</dd>
            </div>
          )}
        </dl>
      </div>

      <details className="scb-reference-details">
        <summary className="scb-reference-summary">
          기구 공통 참고 영상·문헌 원문 확인 (개별 동작 대조 아님)
        </summary>
        <div className="scb-reference-body">
          <p className="scb-reference-disclaimer">{guidance.referenceLinksNoticeKo}</p>
          <a
            className="scb-reference-link"
            href={guidance.primaryVideo.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Youtube size={14} aria-hidden="true" />
            <span>
              {guidance.primaryVideo.titleKo} ({guidance.primaryVideo.channelName})
            </span>
            <ExternalLink size={12} aria-hidden="true" />
          </a>
          <p className="scb-reference-takeaway">• {guidance.primaryVideo.keyTakeawayKo}</p>
          <a
            className="scb-reference-link"
            href={guidance.secondaryVideo.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Youtube size={14} aria-hidden="true" />
            <span>
              {guidance.secondaryVideo.titleKo} ({guidance.secondaryVideo.channelName})
            </span>
            <ExternalLink size={12} aria-hidden="true" />
          </a>
          <a
            className="scb-reference-link is-literature"
            href={guidance.literature.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>{guidance.literature.titleKo}</span>
            <ExternalLink size={12} aria-hidden="true" />
          </a>
          <p className="scb-reference-citation">
            {guidance.literature.clinicalSummaryKo} ({guidance.literature.citation})
          </p>
        </div>
      </details>
    </section>
  );
}
