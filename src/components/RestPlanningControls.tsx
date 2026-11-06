import { useState } from 'react';
import { Coffee, Plus } from 'lucide-react';
import type { SequenceStep } from '../types/pilates';
import '../styles/rest.css';

interface RestBudgetControlProps {
  minutes: number;
  totalMinutes: number;
  onChange: (minutes: number) => void;
}

export function RestBudgetControl({ minutes, totalMinutes, onChange }: RestBudgetControlProps) {
  const [custom, setCustom] = useState(false);
  const [edit, setEdit] = useState<{ value: string; source: number } | null>(null);
  const customOpen = custom || ![0, 5, 10].includes(minutes);
  const value = edit?.source === minutes ? edit.value : String(minutes);
  const editedMinutes = Number(value);
  const valid =
    value.trim() !== '' &&
    Number.isFinite(editedMinutes) &&
    editedMinutes >= 0 &&
    editedMinutes < totalMinutes;
  return (
    <div className="rest-budget-control">
      <div className="rest-budget-label">
        <Coffee size={15} />
        <span>중간 휴식</span>
        <small>수업 시간에 포함</small>
      </div>
      <div className="rest-budget-options" role="group" aria-label="자동 편성 휴식 시간">
        {[0, 5, 10].map((option) => (
          <button
            type="button"
            key={option}
            aria-label={option === 0 ? '자동 휴식 없음' : `자동 휴식 ${option}분`}
            aria-pressed={!customOpen && minutes === option}
            disabled={option >= totalMinutes}
            onClick={() => {
              setCustom(false);
              setEdit(null);
              onChange(option);
            }}
          >
            {option === 0 ? '없음' : `${option}분`}
          </button>
        ))}
        <button type="button" aria-pressed={customOpen} onClick={() => setCustom(true)}>
          직접 지정
        </button>
      </div>
      {customOpen && (
        <label className="rest-budget-custom">
          <span>휴식 직접 지정 · 분</span>
          <input
            aria-label="자동 휴식 직접 지정 · 분"
            type="number"
            min={0}
            max={Math.max(0, totalMinutes - 0.5)}
            step={0.5}
            value={value}
            onChange={(event) => {
              const next = event.target.value;
              setEdit({ value: next, source: minutes });
              const amount = Number(next);
              if (next.trim() && Number.isFinite(amount) && amount >= 0 && amount < totalMinutes)
                onChange(amount);
            }}
          />
        </label>
      )}
      {customOpen && !valid ? (
        <p className="rest-field-error" role="status">
          휴식은 0분 이상, 전체 수업 시간보다 짧게 입력해 주세요.
        </p>
      ) : null}
      <p className="rest-budget-summary" aria-live="polite">
        총 {totalMinutes}분 = 동작 {Math.max(0, totalMinutes - minutes)}분 + 휴식 {minutes}분
      </p>
      <p className="rest-budget-help">
        다음 자동 편성에 적용합니다. 넣은 휴식은 구성 화면에서 옮기거나 시간을 바꿀 수 있어요.
      </p>
    </div>
  );
}

interface RestInsertControlProps {
  steps: SequenceStep[];
  labelForStep: (step: SequenceStep, index: number) => string;
  onAdd: (durationMin: number, afterIndex?: number) => { success: boolean; message: string };
}

export function RestInsertControl({ steps, labelForStep, onAdd }: RestInsertControlProps) {
  const [duration, setDuration] = useState('5');
  const [after, setAfter] = useState('end');
  const [feedback, setFeedback] = useState('');
  return (
    <details className="rest-insert-control">
      <summary>
        <Coffee size={16} />
        <span>휴식 추가</span>
        <Plus size={15} />
      </summary>
      <div>
        <p>전체 수업 시간에 포함되는 휴식을 직접 넣습니다. 여러 번 추가할 수 있어요.</p>
        <div className="rest-insert-fields">
          <label className="form-field">
            <span>추가할 휴식 시간 · 분</span>
            <input
              type="number"
              min={0.5}
              max={120}
              step={0.5}
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
            />
          </label>
          <label className="form-field">
            <span>휴식 넣을 위치</span>
            <select value={after} onChange={(event) => setAfter(event.target.value)}>
              <option value="end">맨 뒤</option>
              <option value="-1">맨 앞</option>
              {steps.map((step, index) => (
                <option key={step.stepId} value={String(index)}>
                  {index + 1}번 {labelForStep(step, index)} 뒤
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            const amount = Number(duration);
            if (!duration.trim() || !Number.isFinite(amount) || amount < 0.5 || amount > 120) {
              setFeedback('휴식 시간을 0.5–120분 사이로 입력해 주세요.');
              return;
            }
            const result = onAdd(amount, after === 'end' ? undefined : Number(after));
            setFeedback(result.message);
          }}
        >
          <Plus size={15} />이 위치에 휴식 넣기
        </button>
        {feedback && (
          <p className="rest-insert-feedback" role="status">
            {feedback}
          </p>
        )}
      </div>
    </details>
  );
}
