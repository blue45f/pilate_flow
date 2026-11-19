import type { InstructorScheduleData } from '../types/instructorSchedule';
import type { PilatesExercise, SequenceStep } from '../types/pilates';
import { teachingScheduleWarnings } from '../utils/teachingScheduleContext';
import type { TeachingScheduleContext as Context } from '../utils/teachingScheduleContext';
import '../styles/teaching-schedule-context.css';

export function TeachingScheduleContext({
  context,
  steps,
  schedule,
  exercises,
}: {
  context: Context | undefined;
  steps: SequenceStep[];
  schedule: InstructorScheduleData;
  exercises: PilatesExercise[];
}) {
  if (!context) return null;
  const warnings = teachingScheduleWarnings(context, steps, schedule, exercises);
  return (
    <section className="teaching-schedule-context" aria-label="수업 장소와 일정">
      <strong>
        {context.locationAlias || '등록된 장소 이름 없음'} · {context.classTitle}
      </strong>
      <p>
        {context.date} · {context.startTime}–{context.endTime}
      </p>
      {warnings.length > 0 && (
        <ul aria-label="기구와 일정 확인 사항">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
      <small>
        가져온 회차의 참고 정보입니다. 초안 변경은 원래 일정·저장본에 반영되지 않습니다.
      </small>
    </section>
  );
}
