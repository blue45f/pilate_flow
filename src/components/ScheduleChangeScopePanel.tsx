import { useId, useState, type RefObject } from 'react';
import { X } from 'lucide-react';
import type { InstructorScheduleOccurrence } from '../types/instructorSchedule';
import { formatScheduleDate, formatScheduleTime } from '../utils/instructorSchedule';
import '../styles/schedule-change-scope.css';

export type ScheduleChangeScope = 'occurrence' | 'series';

interface Props {
  occurrence: InstructorScheduleOccurrence;
  headingRef: RefObject<HTMLHeadingElement | null>;
  stale: boolean;
  onCancel: () => void;
  onContinue: (scope: ScheduleChangeScope) => void;
}

export function ScheduleChangeScopePanel({
  occurrence,
  headingRef,
  stale,
  onCancel,
  onContinue,
}: Props) {
  const id = useId();
  const [scope, setScope] = useState<ScheduleChangeScope>('occurrence');
  const dateLabel = `${occurrence.date.slice(0, 4)}년 ${formatScheduleDate(occurrence.date)}`;
  return (
    <aside
      id="schedule-change-scope"
      className="schedule-change-scope"
      aria-labelledby={`${id}-heading`}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          onCancel();
        }
      }}
    >
      <header>
        <h2 id={`${id}-heading`} ref={headingRef} tabIndex={-1}>
          회차 변경
        </h2>
        <button type="button" onClick={onCancel} aria-label="변경 범위 닫기">
          <X size={18} aria-hidden="true" />
        </button>
      </header>
      <p className="schedule-change-subject">
        <strong>{occurrence.title}</strong>
        <span>
          {dateLabel} · {formatScheduleTime(occurrence.startTime)}
        </span>
      </p>
      <fieldset disabled={stale}>
        <legend>이 일정의 변경 범위를 선택하세요.</legend>
        <label className={scope === 'occurrence' ? 'is-selected' : ''}>
          <input
            type="radio"
            name={`${id}-scope`}
            value="occurrence"
            checked={scope === 'occurrence'}
            onChange={() => setScope('occurrence')}
          />
          <span>
            <strong>이번 회차만</strong>
            <span>선택한 날짜({dateLabel})의 일정만 변경합니다.</span>
          </span>
        </label>
        <label className={scope === 'series' ? 'is-selected' : ''}>
          <input
            type="radio"
            name={`${id}-scope`}
            value="series"
            checked={scope === 'series'}
            onChange={() => setScope('series')}
          />
          <span>
            <strong>반복 일정 전체</strong>
            <span>반복 원본을 변경합니다. 이미 따로 변경하거나 취소한 회차는 유지됩니다.</span>
          </span>
        </label>
      </fieldset>
      {stale && (
        <p className="schedule-warning" role="alert">
          일정이 바뀌었습니다. 닫은 뒤 변경하려는 회차를 다시 선택해 주세요.
        </p>
      )}
      <p className="schedule-change-note">다음 화면에서 내용을 확인하고 저장할 때 적용됩니다.</p>
      <footer>
        <button
          type="button"
          className="btn-primary"
          disabled={stale}
          onClick={() => onContinue(scope)}
        >
          다음
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          취소
        </button>
      </footer>
    </aside>
  );
}
