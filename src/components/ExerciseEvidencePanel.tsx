import { useId } from 'react';
import { ChevronDown, ExternalLink, FileCheck2 } from 'lucide-react';
import { resolveExtendedMotionSourceAudit } from '../data/extendedMotionVerificationCatalog';
import { MotionCoverageEvidenceDlItems } from '../features/motionCoverage/integrationExamples';
import {
  resolveMotionEvidenceReviewRecord,
  validateMotionEvidenceRecord,
} from '../features/motionEvidenceReview';
import { normalizeReferenceUrlPolicy } from '../features/referenceLinkPolicyCandidate';
import type { PilatesExercise, SequenceStep } from '../types/pilates';
import { getExerciseEvidence, safeEvidenceHttpUrl } from '../utils/exerciseEvidence';
import { isRestStep } from '../utils/sequenceEngine';
import '../styles/exercise-evidence.css';
import '../styles/motion-review-worksheet.css';

interface ExerciseEvidencePanelProps {
  exercise: PilatesExercise;
  step?: SequenceStep;
}

const secondsLabel = (seconds: number) =>
  `${seconds.toLocaleString('ko-KR', { maximumFractionDigits: 3 })}초`;

/** Read-only evidence dimensions. Planning review never establishes motion expertise. */
export function ExerciseEvidencePanel({ exercise, step }: ExerciseEvidencePanelProps) {
  const id = useId();
  if (step && isRestStep(step)) return null;
  const evidence = getExerciseEvidence(exercise);
  const { planning, source, motion } = evidence;
  const inputLink = source.kind === 'unverified-link';
  const biomechReview = resolveMotionEvidenceReviewRecord(exercise.id);
  const biomechValidation = biomechReview ? validateMotionEvidenceRecord(biomechReview) : null;
  const biomechReviewIsStale = biomechValidation?.valid === false;
  const motionLabel = biomechReviewIsStale ? '도해 변경 · 근거 재대조 필요' : motion.label;
  const EvidenceRecordBody = biomechReviewIsStale ? 'details' : 'div';
  const extendedAudit = resolveExtendedMotionSourceAudit(exercise);

  return (
    <section className="exercise-evidence-panel" aria-label={`${exercise.nameKo} 근거와 검토 상태`}>
      <details>
        <summary className="exercise-evidence-summary">
          <span className="eep-summary-topline">
            <span>
              <FileCheck2 size={15} aria-hidden="true" /> 근거와 검토 상태
            </span>
            <ChevronDown size={16} className="eep-summary-chevron" aria-hidden="true" />
          </span>
          <span className="eep-summary-statuses">
            <span className={`eep-status is-${planning.status}`}>
              <b>계획</b> {planning.label}
            </span>
            <span className="eep-status">
              <b>노트 출처</b> {source.label}
            </span>
            <span className="eep-status">
              <b>모션</b> {motionLabel}
            </span>
          </span>
        </summary>
        <div className="eep-body">
          <section aria-labelledby={`${id}-planning`}>
            <h3 id={`${id}-planning`}>개인 계획 검토</h3>
            <dl>
              <div>
                <dt>현재 상태</dt>
                <dd>{planning.label}</dd>
              </div>
              {planning.reviewerAlias && (
                <div>
                  <dt>검토 별칭</dt>
                  <dd>{planning.reviewerAlias}</dd>
                </div>
              )}
              {planning.reviewedAt && (
                <div>
                  <dt>검토 기록일</dt>
                  <dd>
                    <time dateTime={planning.reviewedAt}>{planning.reviewedAt}</time>
                  </dd>
                </div>
              )}
              <div>
                <dt>자격 인증</dt>
                <dd>미확인 · 외부 전문가 검수와 별개</dd>
              </div>
            </dl>
            <p className="eep-muted">{planning.description}</p>
          </section>
          <section aria-labelledby={`${id}-source`}>
            <h3 id={`${id}-source`}>계획 노트에 연결된 출처</h3>
            <dl>
              <div>
                <dt>계획 자료 구분</dt>
                <dd>{evidence.provenance.label}</dd>
              </div>
              <div>
                <dt>출처 상태</dt>
                <dd>{source.label}</dd>
              </div>
              {source.title && (
                <div>
                  <dt>{inputLink ? '입력된 자료 제목' : '보관한 원출처'}</dt>
                  <dd>{source.title}</dd>
                </div>
              )}
              {source.publisher && (
                <div>
                  <dt>{inputLink ? '입력된 채널명' : '기록된 발행처'}</dt>
                  <dd>{source.publisher}</dd>
                </div>
              )}
              {source.referenceId && (
                <div>
                  <dt>원출처 기록</dt>
                  <dd>{source.referenceId}</dd>
                </div>
              )}
              {source.checkedAt && (
                <div>
                  <dt>출처 확인일</dt>
                  <dd>
                    <time dateTime={source.checkedAt}>{source.checkedAt}</time>
                  </dd>
                </div>
              )}
              {!source.catalogMatched && source.recordedAt && (
                <div>
                  <dt>보관 기록일</dt>
                  <dd>
                    <time dateTime={source.recordedAt}>{source.recordedAt}</time>
                  </dd>
                </div>
              )}
              {!source.catalogMatched && source.recordedStatusLabel && (
                <div>
                  <dt>보관된 상태</dt>
                  <dd>{source.recordedStatusLabel} · 현재 출처 확인과 별개</dd>
                </div>
              )}
              <div>
                <dt>이용 권리</dt>
                <dd>{source.rightsLabel}</dd>
              </div>
              <div>
                <dt>동작·수업 시간</dt>
                <dd>미확인 · 계획 시간으로 가져오지 않음</dd>
              </div>
              <div>
                <dt>시작·종료 구간</dt>
                <dd>확인된 동작 구간 없음</dd>
              </div>
              {source.videoDurationSeconds !== null && (
                <div>
                  <dt>원본 영상 길이</dt>
                  <dd>{secondsLabel(source.videoDurationSeconds)} · 동작 수행 시간 아님</dd>
                </div>
              )}
            </dl>
            <p className="eep-muted">{source.description}</p>
            {source.bodyMetadataLabel && <p className="eep-muted">{source.bodyMetadataLabel}</p>}
            {source.observationPoints.length > 0 ? (
              <div>
                <h4>원본 관찰 시점 · 시작·종료 구간 아님</h4>
                <ul>
                  {source.observationPoints.map((point, index) => (
                    <li key={`${point.seconds}-${index}`}>
                      <span className="eep-observation-label">{secondsLabel(point.seconds)}</span> ·{' '}
                      {point.note}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="eep-muted">보존된 관찰 시점 없음</p>
            )}
            {evidence.links.length > 0 && (
              <div className="eep-links">
                {evidence.links.map((link) => {
                  const policy = normalizeReferenceUrlPolicy(link.href, {
                    embedPolicy: 'external-link-only',
                    forbidTimeSeekTransplant: link.kind === 'source',
                  });
                  if (!policy.ok || !policy.canonicalExternalUrl) return null;
                  return (
                    <a
                      key={`${link.kind}-${policy.canonicalExternalUrl}`}
                      href={policy.canonicalExternalUrl}
                      data-url-policy={policy.provider}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {link.label} <ExternalLink size={14} aria-hidden="true" />
                    </a>
                  );
                })}
              </div>
            )}
            <p className="eep-disclaimer">
              출처 확인은 운동 정확성이나 개인별 적합성에 대한 전문가 검토가 아닙니다.
            </p>
          </section>
          <section aria-labelledby={`${id}-motion`}>
            <h3 id={`${id}-motion`}>이 동작의 모션 근거</h3>
            <dl>
              <div>
                <dt>개별 모션</dt>
                <dd>{motionLabel}</dd>
              </div>
              <div>
                <dt>전문가 모션 검토</dt>
                <dd>{motion.professionallyApprovedCount}건 · 미검토</dd>
              </div>
              <div>
                <dt>관련 제작 제안</dt>
                <dd>{motion.relatedProposals.length}종 · ID 대조용 · 정확 연결 아님</dd>
              </div>
              <div>
                <dt>전체 공통 개념 시안</dt>
                <dd>
                  {motion.unreviewedLabPrototypeCount}개 · 모두 미검토 · 이 노트의 관련 제안 수와
                  별개
                </dd>
              </div>
              <MotionCoverageEvidenceDlItems exercise={exercise} />
            </dl>
            {motion.relatedProposals.length > 0 && (
              <ul aria-label="이 기록 ID와 대조하는 제작 제안">
                {motion.relatedProposals.map((proposal) => (
                  <li key={proposal.id}>{proposal.labelKo}</li>
                ))}
              </ul>
            )}
            <p className="eep-muted">
              관련 제안은 해당 기록 ID와의 별도 대조 대상입니다. 현재 노트의 변형 일치나 개인
              적합성을 확인한 것이 아닙니다.
            </p>
            <p className="eep-muted">{motion.description}</p>
            {biomechReview && (
              <div
                className="exercise-evidence-biomech"
                data-testid="motion-evidence-review-section"
                data-current-record-valid={String(biomechValidation?.valid === true)}
              >
                {biomechReviewIsStale && (
                  <p className="eep-disclaimer" data-testid="motion-evidence-review-stale">
                    <strong>과거 조사 기록 · 현재 도해와 불일치</strong> 현재 카탈로그·도해와 연결이
                    달라 재대조가 필요합니다. 이전 단계 설명은 아래의 과거 기록에서만 확인할 수
                    있습니다.
                    {biomechReview.reviewedAtIso && (
                      <>
                        {' '}
                        보존된 조사일:{' '}
                        <time dateTime={biomechReview.reviewedAtIso}>
                          {biomechReview.reviewedAtIso}
                        </time>
                        .
                      </>
                    )}
                  </p>
                )}
                <EvidenceRecordBody
                  key={biomechReview.exerciseId}
                  data-testid={
                    biomechReviewIsStale ? 'motion-evidence-historical-details' : undefined
                  }
                >
                  {biomechReviewIsStale && (
                    <summary>이전 도해의 조사 내용 펼치기 · 현재 자세 지침 아님</summary>
                  )}
                  <dl>
                    <div>
                      <dt>생체역학·해부학 근거 조사 트랙</dt>
                      <dd>
                        {biomechReview.track === 'track-a-mat'
                          ? 'Track A 매트 핵심 동작'
                          : biomechReview.track === 'track-b-apparatus'
                            ? 'Track B 기구 핵심 동작'
                            : biomechReview.track === 'track-c-extended-mat'
                              ? 'Track C 매트 확장 동작'
                              : 'Track D 기구 확장 동작'}{' '}
                        (#{biomechReview.rankInTrack}) · 3단계 구간(시작·중간·끝) · 5대 역학 항목 ·
                        전문가 검수 대기 (expert-audit-pending)
                      </dd>
                    </div>
                    <div>
                      <dt>시작 자세 및 관절 방향 (Start)</dt>
                      <dd>
                        {biomechReview.phases.start.postureAndTransitionKo} (
                        {biomechReview.phases.start.jointDirectionsKo.join(' / ')})
                      </dd>
                    </div>
                    <div>
                      <dt>중간 정점 및 기구·지지점 (Middle)</dt>
                      <dd>
                        {biomechReview.phases.middle.postureAndTransitionKo} · 지지점:{' '}
                        {biomechReview.phases.middle.supportPointsKo.join(', ')}
                      </dd>
                    </div>
                    <div>
                      <dt>끝·복귀 및 호흡 (End)</dt>
                      <dd>
                        {biomechReview.phases.end.postureAndTransitionKo} · 호흡:{' '}
                        {biomechReview.phases.end.breathingKo}
                      </dd>
                    </div>
                    <div>
                      <dt>도해 대조 권고 및 주의점</dt>
                      <dd>
                        <ul>
                          {biomechReview.discrepancyAudit.diagramTeamRecommendationsKo.map(
                            (rec, idx) => (
                              <li key={idx}>{rec}</li>
                            ),
                          )}
                        </ul>
                      </dd>
                    </div>
                    <div>
                      <dt>
                        {biomechReviewIsStale
                          ? '보존된 출처 원장 해시'
                          : '확장 출처·모션 원장 검증 해시'}
                      </dt>
                      <dd data-testid="exercise-evidence-extended-sha256">
                        <code>
                          {extendedAudit.primaryFactualRecordSha256 ?? '카탈로그 표준 대조'}
                        </code>{' '}
                        · {biomechReviewIsStale ? '당시 확인일' : '확인일'}{' '}
                        {extendedAudit.checkedAt} · 전문의·외부 임상 승인 0건
                      </dd>
                    </div>
                  </dl>
                </EvidenceRecordBody>
              </div>
            )}
          </section>
          {evidence.candidateResearch.length > 0 && (
            <section aria-labelledby={`${id}-research`}>
              <h3 id={`${id}-research`}>별도 모션 후보 연구</h3>
              <p className="eep-disclaimer">
                해당 기록 ID와 대조하는 별도 연구입니다. 현재 노트의 변형 일치·개인 적합성은
                미확인이며, 노트 출처 확인으로 가져오지 않습니다.
              </p>
              {evidence.candidateResearch.map((candidate) => {
                const url = safeEvidenceHttpUrl(candidate.source.url);
                return (
                  <div key={candidate.candidateId} className="eep-research-candidate">
                    <h4>{candidate.labelKo}</h4>
                    <p>{candidate.statusLabelKo} · 전문가 모션 검토 0건</p>
                    <p className="eep-muted">{candidate.source.population.contextLabelKo}</p>
                    <p className="eep-muted">{candidate.source.rights.labelKo}</p>
                    <details>
                      <summary>조사한 변형·미확인 보기</summary>
                      <p>{candidate.variant}</p>
                      <ul>
                        {candidate.facts.map((fact) => (
                          <li key={fact.id}>
                            <strong>{fact.labelKo}</strong> ·{' '}
                            {fact.kind === 'clinical-context'
                              ? '환자 프로그램 문맥 · 수행 지시 아님 · '
                              : fact.kind === 'source-unknown'
                                ? '원문 미확인 · '
                                : ''}
                            {fact.text}
                          </li>
                        ))}
                      </ul>
                      <h4>미확인</h4>
                      <ul>
                        {candidate.unknown.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                      <p>{candidate.catalogBoundary}</p>
                      <p>
                        사실 기록 해시 · {candidate.source.factualRecordSha256} · 모션 검수 해시가
                        아닙니다.
                      </p>
                      <p>본문 확인일(UTC): {candidate.source.checkedAtUtc}</p>
                      <p className="eep-muted">{candidate.source.attributionNoteKo}</p>
                    </details>
                    {url && (
                      <div className="eep-links">
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          별도 연구의 원문 출처 열기 <ExternalLink size={14} aria-hidden="true" />
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          )}
        </div>
      </details>
    </section>
  );
}
