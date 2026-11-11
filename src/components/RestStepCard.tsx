import { useEffect, useId, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Coffee,
  LockKeyhole,
  RotateCcw,
  Trash2,
  UnlockKeyhole,
} from 'lucide-react';
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

interface RestDurationDraft {
  readonly value: string;
  readonly sourceDuration: number;
  readonly error: string;
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
  const [draft, setDraft] = useState<RestDurationDraft | null>(null);
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const focusInputOnUnlockRef = useRef(false);

  useEffect(() => {
    if (!step.locked && focusInputOnUnlockRef.current) {
      focusInputOnUnlockRef.current = false;
      inputRef.current?.focus();
    }
  }, [step.locked]);

  const activeDraft =
    !step.locked && draft && draft.sourceDuration === step.durationMin ? draft : null;
  const value = activeDraft ? activeDraft.value : String(step.durationMin);
  const error = activeDraft ? activeDraft.error : '';
  const canRestoreOriginal =
    !step.locked && activeDraft !== null && activeDraft.value !== String(step.durationMin);
  const number = index + 1;

  const restoreOriginalDuration = () => {
    setDraft(null);
    inputRef.current?.focus();
  };

  return (
    <article
      className={`rest-step-card ${step.locked ? 'is-locked' : ''}`}
      aria-label={`${number}번 휴식`}
      data-step-kind="rest"
    >
      <div className="rest-step-heading">
        <span className="step-number">{String(number).padStart(2, '0')}</span>
        <span className="rest-step-icon">
          <Coffee size={21} strokeWidth={1.5} aria-hidden="true" />
        </span>
        <div className="rest-step-title-block">
          <div className="rest-step-title-row">
            <h3>중간 휴식</h3>
            {step.locked && <span className="rest-step-locked-pill">잠금됨</span>}
          </div>
          <p>동작·기구 설정이 없는 휴식 구간 · 전체 시간에 포함</p>
        </div>
        <span className="rest-step-time">{formatSecondsToMMSS(step.durationMin * 60)}</span>
        <button
          type="button"
          className="icon-btn rest-step-lock-toggle"
          aria-label={`${number}번 휴식 ${step.locked ? '잠금 해제' : '잠금'}`}
          aria-pressed={!!step.locked}
          onClick={() => {
            setDraft(null);
            onToggleLock();
          }}
        >
          {step.locked ? (
            <LockKeyhole size={17} aria-hidden="true" />
          ) : (
            <UnlockKeyhole size={17} aria-hidden="true" />
          )}
        </button>
      </div>

      <div className="rest-step-controls">
        <label className="rest-step-duration-field">
          <span>휴식 시간 · 분</span>
          <input
            ref={inputRef}
            aria-label={`${number}번 휴식 시간 · 분`}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            type="number"
            min={0.5}
            max={120}
            step={0.5}
            value={value}
            disabled={step.locked}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && activeDraft !== null) {
                event.preventDefault();
                event.stopPropagation();
                setDraft(null);
              }
            }}
            onChange={(event) => {
              const next = event.target.value;
              const amount = Number(next);
              if (!next.trim() || !Number.isFinite(amount) || amount < 0.5 || amount > 120) {
                setDraft({
                  value: next,
                  sourceDuration: step.durationMin,
                  error: '휴식 시간을 0.5–120분 사이로 입력해 주세요.',
                });
                return;
              }
              const result = onSetDuration(amount);
              if (result.success) {
                setDraft(null);
              } else {
                setDraft({
                  value: next,
                  sourceDuration: step.durationMin,
                  error: result.message,
                });
              }
            }}
          />
        </label>
        <div className="button-row rest-step-action-row">
          <button
            type="button"
            className="icon-btn"
            disabled={step.locked || index === 0}
            aria-label={`${number}번 휴식 위로`}
            onClick={() => onMove('up')}
          >
            <ArrowUp size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="icon-btn"
            disabled={step.locked || index === lastIndex}
            aria-label={`${number}번 휴식 아래로`}
            onClick={() => onMove('down')}
          >
            <ArrowDown size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="icon-btn"
            disabled={step.locked}
            aria-label={`${number}번 휴식 삭제`}
            onClick={onRemove}
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {step.locked && (
        <div className="rest-step-lock-bar" data-testid="rest-step-locked-bar">
          <p className="rest-step-lock-note">
            잠근 휴식({step.durationMin}분 고정)의 시간과 위치를 유지합니다.
          </p>
          <button
            type="button"
            className="rest-unlock-edit-btn"
            onClick={() => {
              focusInputOnUnlockRef.current = true;
              setDraft(null);
              onToggleLock();
            }}
          >
            <UnlockKeyhole size={14} aria-hidden="true" />
            <span>잠금 풀고 시간 수정</span>
          </button>
        </div>
      )}

      {error && (
        <div className="rest-error-recovery">
          <p id={errorId} className="rest-field-error" role="status">
            {error}
          </p>
          {canRestoreOriginal && (
            <button
              type="button"
              className="rest-restore-btn"
              onClick={restoreOriginalDuration}
            >
              <RotateCcw size={13} aria-hidden="true" />
              <span>원래 시간({step.durationMin}분) 복구</span>
            </button>
          )}
        </div>
      )}
    </article>
  );
}
