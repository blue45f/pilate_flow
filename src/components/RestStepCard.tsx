import { useId, useState } from 'react';
import { ArrowDown, ArrowUp, Coffee, LockKeyhole, Trash2, UnlockKeyhole } from 'lucide-react';
import type { SequenceStep } from '../types/pilates';
import { formatSecondsToMMSS } from '../utils/sequenceEngine';
import '../styles/rest.css';

interface RestStepCardProps {
  step: SequenceStep;
  index: number;
  lastIndex: number;
  onToggleLock: () => void;
  onMove: (direction: 'up' | 'down') => void;
  onRemove: () => void;
  onSetDuration: (minutes: number) => { success: boolean; message: string };
}

export function RestStepCard({
  step,
  index,
  lastIndex,
  onToggleLock,
  onMove,
  onRemove,
  onSetDuration,
}: RestStepCardProps) {
  const [edit, setEdit] = useState<{ value: string; source: number } | null>(null);
  const [error, setError] = useState('');
  const errorId = useId();
  const value = edit?.source === step.durationMin ? edit.value : String(step.durationMin);
  const number = index + 1;
  return (
    <article
      className={`rest-step-card ${step.locked ? 'is-locked' : ''}`}
      aria-label={`${number}번 휴식`}
      data-step-kind="rest"
    >
      <div className="rest-step-heading">
        <span className="step-number">{String(number).padStart(2, '0')}</span>
        <span className="rest-step-icon">
          <Coffee size={21} strokeWidth={1.5} />
        </span>
        <div>
          <h3>중간 휴식</h3>
          <p>동작·기구 설정이 없는 휴식 구간</p>
        </div>
        <span className="rest-step-time">{formatSecondsToMMSS(step.durationMin * 60)}</span>
        <button
          type="button"
          className="icon-btn"
          aria-label={`${number}번 휴식 ${step.locked ? '잠금 해제' : '잠금'}`}
          aria-pressed={!!step.locked}
          onClick={onToggleLock}
        >
          {step.locked ? <LockKeyhole size={17} /> : <UnlockKeyhole size={17} />}
        </button>
      </div>
      <div className="rest-step-controls">
        <label>
          <span>휴식 시간 · 분</span>
          <input
            aria-label={`${number}번 휴식 시간 · 분`}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            type="number"
            min={0.5}
            max={120}
            step={0.5}
            value={value}
            disabled={step.locked}
            onChange={(event) => {
              const next = event.target.value;
              setEdit({ value: next, source: step.durationMin });
              const amount = Number(next);
              if (!next.trim() || !Number.isFinite(amount) || amount < 0.5 || amount > 120) {
                setError('휴식 시간을 0.5–120분 사이로 입력해 주세요.');
                return;
              }
              const result = onSetDuration(amount);
              setError(result.success ? '' : result.message);
            }}
          />
        </label>
        <div className="button-row">
          <button
            type="button"
            className="icon-btn"
            disabled={step.locked || index === 0}
            aria-label={`${number}번 휴식 위로`}
            onClick={() => onMove('up')}
          >
            <ArrowUp size={16} />
          </button>
          <button
            type="button"
            className="icon-btn"
            disabled={step.locked || index === lastIndex}
            aria-label={`${number}번 휴식 아래로`}
            onClick={() => onMove('down')}
          >
            <ArrowDown size={16} />
          </button>
          <button
            type="button"
            className="icon-btn"
            disabled={step.locked}
            aria-label={`${number}번 휴식 삭제`}
            onClick={onRemove}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      {step.locked && <p className="rest-step-lock-note">잠근 휴식의 시간과 위치를 유지합니다.</p>}
      {error && (
        <p id={errorId} className="rest-field-error" role="status">
          {error}
        </p>
      )}
    </article>
  );
}
