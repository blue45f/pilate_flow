import { useMemo, useState } from 'react';
import type { PilatesExercise, SequenceStep } from '../types/pilates';
import { reviewClassPlan } from '../features/classPlanReview/classPlanReviewAnalyzer';
import '../styles/class-plan-summary.css';

interface Props {
  title: string;
  steps: SequenceStep[];
  exercises: PilatesExercise[];
  targetMinutes: number;
}

/** Optional, read-only facts from the same frozen plan shown by the rehearsal. */
export function ClassPlanSummary(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <details className="class-plan-summary" onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>시간·좌우 편성 살펴보기</summary>
      {open && <SummaryContent {...props} />}
    </details>
  );
}

function SummaryContent({ title, steps, exercises, targetMinutes }: Props) {
  const report = useMemo(
    () => reviewClassPlan({ title, steps, exercises, targetMinutes }),
    [title, steps, exercises, targetMinutes],
  );
  return (
    <section aria-label="수업안 편성 요약" className="class-plan-summary-content">
      <p className="muted">선택 사항이에요. 확인하지 않아도 저장하거나 수업을 시작할 수 있어요.</p>
      <dl>
        <div>
          <dt>계획 시간</dt>
          <dd>{report.timing.headlineKo}</dd>
        </div>
        <div>
          <dt>좌우 편성</dt>
          <dd>
            왼쪽 {report.laterality.explicitLeftItemCount}개 · 오른쪽{' '}
            {report.laterality.explicitRightItemCount}개
            <br />
            양쪽 순차 {report.laterality.bothSequentialItemCount}개 · 양쪽 함께{' '}
            {report.laterality.togetherItemCount}개 · 미지정{' '}
            {report.laterality.unknownLateralityItemCount}개
          </dd>
        </div>
      </dl>
      <p className="muted">
        읽을 수 있는 항목 기준이고 좌우 개수에서만 휴식을 제외해요. 실제 운동 효과나 신체
        균형·안전성을 판정하지 않아요.
      </p>
      {report.issues.length > 0 && (
        <details>
          <summary>편성 참고 사항 {report.issues.length}개</summary>
          <ul>
            {report.issues.map((issue) => (
              <li key={issue.id}>
                <strong>{issue.titleKo}</strong>
                <p>{issue.messageKo}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
