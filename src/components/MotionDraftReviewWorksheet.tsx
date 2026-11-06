import { useEffect, useMemo, useRef, useState } from 'react';
import type { MotionDraftDefinition } from '../data/motionDrafts';
import {
  encodeMotionReviewPacket,
  getMotionDraftReviewWorksheet,
  MOTION_REVIEW_COMPARISON_NOTES_SCOPE,
} from '../utils/motionReviewWorksheet';
import '../styles/motion-review-worksheet.css';

export interface MotionDraftReviewWorksheetProps {
  draft: MotionDraftDefinition;
}
type ReviewPane = 'facts' | 'stages' | 'rights';

/** Read-only review context. No checklist completion, review mutation or playback clock. */
export function MotionDraftReviewWorksheet({ draft }: MotionDraftReviewWorksheetProps) {
  const data = useMemo(() => getMotionDraftReviewWorksheet(draft), [draft]);
  const [pane, setPane] = useState<ReviewPane>('facts');
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const downloadUrl = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (downloadUrl.current) URL.revokeObjectURL(downloadUrl.current);
      downloadUrl.current = null;
    },
    [draft],
  );
  const save = () => {
    const encoded = encodeMotionReviewPacket(data);
    if (!encoded.ok) {
      setMessage({ error: true, text: encoded.error });
      return;
    }
    let anchor: HTMLAnchorElement | null = null;
    try {
      if (downloadUrl.current) URL.revokeObjectURL(downloadUrl.current);
      downloadUrl.current = URL.createObjectURL(
        new Blob([encoded.json], { type: 'application/json' }),
      );
      anchor = document.createElement('a');
      anchor.href = downloadUrl.current;
      anchor.download = encoded.filename;
      document.body.append(anchor);
      anchor.click();
      setMessage({
        error: false,
        text: '미검토 대조 자료를 저장했습니다. 승인·수업·이력 상태는 바뀌지 않습니다.',
      });
    } catch {
      if (downloadUrl.current) URL.revokeObjectURL(downloadUrl.current);
      downloadUrl.current = null;
      setMessage({
        error: true,
        text: '검토 자료를 파일로 표시할 수 없습니다. 현재 제안은 그대로 유지합니다.',
      });
    } finally {
      anchor?.remove();
    }
  };

  return (
    <section className="motion-review-worksheet" aria-label="선택한 제안의 검토 자료">
      <details>
        <summary>
          <strong>이 제안의 검토 자료</strong>
          <span>대조용 자료 · 정확 자산 없음 · 전문가 검토 0</span>
        </summary>
        <div className="mrw-body">
          <dl className="mrw-identity">
            <div>
              <dt>제작 제안 ID</dt>
              <dd>
                <code>{data.draftId}</code>
              </dd>
            </div>
            <div>
              <dt>대조용 카탈로그 ID</dt>
              <dd>
                <code>{draft.intendedExerciseId}</code> · 정확 연결 아님
              </dd>
            </div>
            <div>
              <dt>모델 버전</dt>
              <dd>{data.modelVersion ?? '기록된 버전 미확인'}</dd>
            </div>
            <div>
              <dt>소스 구현 지문</dt>
              <dd>
                {data.sourceImplementationSha256 ? (
                  <code aria-label="소스 구현 지문">{data.sourceImplementationSha256}</code>
                ) : (
                  '지문 연결 미확인'
                )}
              </dd>
            </div>
            <div>
              <dt>전문가 모션 검토</dt>
              <dd>0건 · 검수한 자산 해시 없음</dd>
            </div>
          </dl>
          <p className="mrw-note">
            구현 지문은 생성된 소스 파일의 식별값입니다. 원문 사실 해시·완성 모션 자산·전문 검수
            해시와 다릅니다.
          </p>
          <div className="mrw-panes" role="group" aria-label="검토 자료 항목">
            <button type="button" aria-pressed={pane === 'facts'} onClick={() => setPane('facts')}>
              근거·준비물
            </button>
            <button
              type="button"
              aria-pressed={pane === 'stages'}
              onClick={() => setPane('stages')}
            >
              단계·미확인
            </button>
            <button
              type="button"
              aria-pressed={pane === 'rights'}
              onClick={() => setPane('rights')}
            >
              권리·대조 질문
            </button>
          </div>
          <div hidden={pane !== 'facts'}>
            <h4>현재 제안의 변형</h4>
            <p>{draft.variant}</p>
            <h4>접촉·준비물 구분</h4>
            <p>{draft.supportNote}</p>
            <ul>
              {(draft.variantRequirements ?? []).map((requirement) => (
                <li key={requirement.id}>
                  {requirement.label} ·{' '}
                  {requirement.basis === 'source-text'
                    ? '원문 기재'
                    : requirement.basis === 'author-choice'
                      ? '저작 선택'
                      : '원문·저작 선택 혼합'}
                </li>
              ))}
            </ul>
            <h4>참고 패턴·대조 메모</h4>
            <p className="mrw-note">{MOTION_REVIEW_COMPARISON_NOTES_SCOPE}</p>
            <ul>
              {draft.matched.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
            <h4>이 제안의 원문 사실 기록</h4>
            <ul className="mrw-sources">
              {data.sources.map((source, index) => (
                <li key={`${source.sourceId ?? 'link'}-${index}`}>
                  {source.url ? (
                    <a href={source.url} target="_blank" rel="noopener noreferrer">
                      {source.label}
                    </a>
                  ) : (
                    <span>{source.label} · 링크 형식 확인 필요</span>
                  )}
                  <p>
                    {source.binding === 'unbound-reference'
                      ? '원문 링크 기록 · 사실 지문 미연결'
                      : source.sourceChecked === true
                        ? '본문 사실 확인 기록 연결'
                        : source.sourceChecked === false
                          ? '본문 확인 미완료 기록'
                          : '사실 레코드 연결 · 확인 상태는 원기록 참조'}
                  </p>
                  {source.context && <p className="mrw-note">{source.context}</p>}
                  {source.checkedAtUtc && (
                    <p className="mrw-note">기록된 확인일(UTC): {source.checkedAtUtc}</p>
                  )}
                  {source.factualRecordSha256 && (
                    <p className="mrw-note">
                      사실 기록 해시 · <code>{source.factualRecordSha256.slice(0, 12)}…</code> ·
                      모션 검수 아님
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div hidden={pane !== 'stages'}>
            <h4>단계 정의 · 도해 표시용</h4>
            <ol className="mrw-phase-list">
              {draft.phases.map((phase) => (
                <li key={phase.id}>
                  <strong>{phase.labelKo ?? phase.label}</strong>
                  <span>
                    {Number((phase.start * 100).toFixed(2))}–{Number((phase.end * 100).toFixed(2))}%
                    ·{' '}
                    {phase.displayBehavior === 'hold'
                      ? '정적 유지'
                      : phase.displayBehavior === 'move'
                        ? '움직임'
                        : '유지·움직임 구분 미기록'}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mrw-note">
              단계 비율과 표시 시간은 저작 설정이며 권장 운동 속도·횟수·호흡이 아닙니다.
            </p>
            <h4>미확인</h4>
            <ul>
              {draft.unknown.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
            <h4>불일치·제외한 변형</h4>
            {draft.mismatched.length ? (
              <ul>
                {draft.mismatched.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            ) : (
              <p>기록된 직접 모순 없음 · 미확인 조건이 해결되었다는 뜻은 아닙니다.</p>
            )}
          </div>
          <div hidden={pane !== 'rights'}>
            <h4>이용 권리</h4>
            <p>
              원문 링크·기록된 사실 요약 참조만 포함합니다. 영상·사진·원문 도해·코드는 이 파일에
              복제하지 않습니다. 원문 매체 재사용 허가는 미확인입니다.
            </p>
            <ul>
              {data.sources.map((source, index) => (
                <li key={index}>
                  {source.label} ·{' '}
                  {source.rights.recordedNotice ??
                    '연결된 권리 기록 미확인 · 공개 링크를 재사용 허가로 보지 않음'}
                </li>
              ))}
            </ul>
            <h4>검토자가 대조할 질문 · 완료 기록 아님</h4>
            <ul>
              {data.reviewQuestions.map((question, index) => (
                <li key={index}>{question}</li>
              ))}
            </ul>
            <p className="mrw-note">
              원문 대상·개인 적합성·실제 접촉·안전성은 별도 검토입니다. 이 자료를 열거나 저장해도
              전문 검토가 생기지 않습니다.
            </p>
          </div>
          <div className="mrw-export">
            <button type="button" onClick={save} disabled={!data.packet}>
              검토 자료 JSON 저장
            </button>
            <p className="mrw-note">
              미검토 대조 자료 한 건입니다. 수업안·전체 백업·승인 기록으로 불러오지 않습니다.
            </p>
          </div>
          {data.unavailableReason && <p className="mrw-note">{data.unavailableReason}</p>}
          {message && <p role={message.error ? 'alert' : 'status'}>{message.text}</p>}
        </div>
      </details>
    </section>
  );
}
