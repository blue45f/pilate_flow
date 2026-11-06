import type { MotionPatternReference } from '../data/motionPatternReferences';
import { getMotionPatternPhaseContext } from '../utils/motionPatternPhaseContext';
import '../styles/motion-phase-context.css';

interface Props {
  reference: Readonly<MotionPatternReference>;
  /** The actual displayed pose, including a reduced-motion or paired still. */
  progress: number;
  /** Inline players already show the cycle-wide note above their controls. */
  showCycleSupport?: boolean;
}

/** Read-only authored context. It creates no clock, review, prescription or persistent data. */
export function MotionPhaseContextPanel({ reference, progress, showCycleSupport = true }: Props) {
  const context = getMotionPatternPhaseContext(reference, progress);
  if (!context) {
    return (
      <p className="motion-phase-context-unavailable">
        도해의 현재 단계 정보를 확인할 수 없습니다.
      </p>
    );
  }
  const hasDetails = context.detailStatus === 'available';
  return (
    <section
      className="motion-phase-context"
      aria-label="도해 단계의 배치와 접점"
      data-phase={context.phaseId}
      data-detail-status={context.detailStatus}
      data-basis={context.basis}
    >
      {hasDetails ? (
        <>
          <div className="mpc-heading">
            <strong>이 단계의 배치·접점</strong>
            <span>저작 모형 기준</span>
          </div>
          <p className="mpc-pose">{context.poseSummaryKo}</p>
          <p className="mpc-contact">
            <strong>접점 변화</strong> {context.contactChangeKo}
          </p>
        </>
      ) : context.detailStatus === 'stale' ? (
        <p className="mpc-stale">
          도해 원본이 바뀌어 이전 배치·접점 설명의 표시를 보류합니다. 현재 도해와 다시 대조해야
          합니다.
        </p>
      ) : showCycleSupport ? (
        <p className="mpc-support">{context.cycleSupportSummary}</p>
      ) : null}
      <details>
        <summary>단계 설명의 근거와 한계</summary>
        <div className="mpc-detail-body">
          <p>
            <strong>현재 저작 단계</strong> {context.phaseLabel}
          </p>
          {context.detailStatus === 'not_authored' && (
            <p>
              이 단계의 별도 배치·접점 설명은 아직 작성되지 않았습니다. 위 메모는 전체 도식의 지지
              설정입니다.
            </p>
          )}
          <p>
            {context.displayBehavior === 'hold'
              ? '도해 정의에 정지 표시 구간으로 기록되어 있습니다.'
              : context.displayBehavior === 'move'
                ? '도해 정의에 이동 표시 구간으로 기록되어 있습니다.'
                : '이 단계의 정지·이동 표시 구분은 원본 정의에 기록되어 있지 않습니다.'}{' '}
            실제 수행 시간이나 유지 자세를 정하는 지침은 아닙니다.
          </p>
          {(context.detailStatus !== 'not_authored' || !showCycleSupport) && (
            <p>
              <strong>전체 도식의 지지 메모</strong> {context.cycleSupportSummary}
            </p>
          )}
          {hasDetails && context.qualifications.length > 0 && (
            <ul>
              {context.qualifications.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          )}
          <p>
            <strong>참고 자료의 대상·범위</strong> {context.sourceContext}
          </p>
          <p>
            위 설명은 저작 도형의 배치와 접점을 구분한 것입니다. 원문 영상과의 일치나 전문가 검토가
            완료된 동작 지시를 뜻하지 않습니다.
          </p>
        </div>
      </details>
    </section>
  );
}
