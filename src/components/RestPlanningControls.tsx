import { useId, useRef, useState } from 'react';
import { Coffee, Plus, RotateCcw } from 'lucide-react';
import type { SequenceStep } from '../types/pilates';
import { formatSecondsToMMSS, getSequenceDurations } from '../utils/sequenceEngine';
import '../styles/rest.css';

interface RestBudgetControlProps {
  minutes: number;
  totalMinutes: number;
  onChange: (minutes: number) => void;
}

export function RestBudgetControl({ minutes, totalMinutes, onChange }: RestBudgetControlProps) {
  const [custom, setCustom] = useState(false);
  const [edit, setEdit] = useState<{ value: string; source: number } | null>(null);
  const errorId = useId();
  const customInputRef = useRef<HTMLInputElement | null>(null);
  const customOpen = custom || ![0, 5, 10].includes(minutes);
  const value = edit?.source === minutes ? edit.value : String(minutes);
  const editedMinutes = Number(value);
  const valid =
    value.trim() !== '' &&
    Number.isFinite(editedMinutes) &&
    editedMinutes >= 0 &&
    editedMinutes < totalMinutes;
  const canRestoreOriginal = !valid && value !== String(minutes);

  const restoreBudgetOriginal = () => {
    setEdit(null);
    customInputRef.current?.focus();
  };

  return (
    <div className="rest-budget-control">
      <div className="rest-budget-label">
        <Coffee size={15} aria-hidden="true" />
        <span>중간 휴식</span>
        <small>자동 편성 예산 · 수업 시간에 포함</small>
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
        <button
          type="button"
          aria-pressed={customOpen}
          onClick={() => {
            setCustom(true);
            requestAnimationFrame(() => {
              customInputRef.current?.focus();
            });
          }}
        >
          직접 지정
        </button>
      </div>
      {customOpen && (
        <label className="rest-budget-custom">
          <span>휴식 직접 지정 · 분</span>
          <input
            ref={customInputRef}
            aria-label="자동 휴식 직접 지정 · 분"
            aria-invalid={!valid ? true : undefined}
            aria-describedby={!valid ? errorId : undefined}
            type="number"
            min={0}
            max={Math.max(0, totalMinutes - 0.5)}
            step={0.5}
            value={value}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && edit !== null) {
                event.preventDefault();
                event.stopPropagation();
                setEdit(null);
              }
            }}
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
        <div className="rest-error-recovery">
          <p id={errorId} className="rest-field-error" role="status">
            휴식은 0분 이상, 전체 수업 시간보다 짧게 입력해 주세요.
          </p>
          {canRestoreOriginal && (
            <button
              type="button"
              className="rest-restore-btn"
              onClick={restoreBudgetOriginal}
            >
              <RotateCcw size={13} aria-hidden="true" />
              <span>원래 값({minutes}분) 복구</span>
            </button>
          )}
        </div>
      ) : null}
      <p className="rest-budget-summary" aria-live="polite">
        총 {totalMinutes}분 = 동작 {Math.max(0, totalMinutes - minutes)}분 + 휴식 {minutes}분
      </p>
      <p className="rest-budget-help">
        다음 자동 편성에 적용합니다. 현재 시퀀스에 바로 넣으려면 구성 화면의 ‘휴식 추가’를
        사용하세요.
      </p>
    </div>
  );
}

interface RestInsertControlProps {
  steps: SequenceStep[];
  labelForStep: (step: SequenceStep, index: number) => string;
  onAdd: (durationMin: number, afterIndex?: number) => { success: boolean; message: string };
}

type RestPlacementSelection =
  | { readonly kind: 'end' }
  | { readonly kind: 'start' }
  | { readonly kind: 'step'; readonly stepId: string; readonly labelSnapshot: string };

type RestInsertFeedback =
  | { readonly kind: 'duration-error'; readonly message: string }
  | { readonly kind: 'placement-error'; readonly message: string }
  | { readonly kind: 'success'; readonly message: string };

const MISSING_ANCHOR_SELECT_VALUE = '__missing_anchor__';

function isValidManualRestMinutes(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  const amount = Number(trimmed);
  return Number.isFinite(amount) && amount >= 0.5 && amount <= 120;
}

export function RestInsertControl({ steps, labelForStep, onAdd }: RestInsertControlProps) {
  const [duration, setDuration] = useState('5');
  const [committedDuration, setCommittedDuration] = useState('5');
  const [placement, setPlacement] = useState<RestPlacementSelection>({ kind: 'end' });
  const [feedback, setFeedback] = useState<RestInsertFeedback | null>(null);

  const feedbackId = useId();
  const missingAnchorNoteId = useId();
  const durationInputRef = useRef<HTMLInputElement | null>(null);
  const placementSelectRef = useRef<HTMLSelectElement | null>(null);

  const anchorIndex =
    placement.kind === 'step'
      ? steps.findIndex((step) => step.stepId === placement.stepId)
      : -1;
  const anchorMissing = placement.kind === 'step' && anchorIndex === -1;
  const effectiveFeedback =
    feedback?.kind === 'placement-error' && !anchorMissing ? null : feedback;

  const selectValue =
    placement.kind === 'end'
      ? 'end'
      : placement.kind === 'start'
        ? '-1'
        : anchorMissing
          ? MISSING_ANCHOR_SELECT_VALUE
          : String(anchorIndex);

  const parsedAmount = Number(duration);
  const durationValid = isValidManualRestMinutes(duration);
  const currentDurations = getSequenceDurations(steps);

  const resolvedPositionSummary = (() => {
    if (anchorMissing && placement.kind === 'step') {
      return `위치 재선택 필요 (기준 ‘${placement.labelSnapshot}’ 변경·삭제됨)`;
    }
    if (steps.length === 0) {
      return '첫 항목으로 추가';
    }
    if (placement.kind === 'start') {
      return '맨 앞 (1번 앞)';
    }
    if (placement.kind === 'step' && anchorIndex >= 0) {
      const anchorStep = steps[anchorIndex]!;
      return `${anchorIndex + 1}번 ${labelForStep(anchorStep, anchorIndex)} 뒤`;
    }
    const lastIdx = steps.length - 1;
    const lastStep = steps[lastIdx]!;
    return `맨 뒤 (${lastIdx + 1}번 ${labelForStep(lastStep, lastIdx)} 뒤)`;
  })();

  const hasDurationError = effectiveFeedback?.kind === 'duration-error';
  const hasPlacementError = anchorMissing || effectiveFeedback?.kind === 'placement-error';
  const showDurationRestore =
    duration !== committedDuration && (!durationValid || hasDurationError);

  const restoreDurationValue = () => {
    setDuration(committedDuration);
    if (feedback?.kind === 'duration-error') {
      setFeedback(null);
    }
    durationInputRef.current?.focus();
  };

  const selectExplicitPlacement = (next: RestPlacementSelection) => {
    setPlacement(next);
    if (feedback?.kind === 'placement-error') {
      setFeedback(null);
    }
  };

  return (
    <details className="rest-insert-control">
      <summary>
        <Coffee size={16} aria-hidden="true" />
        <span>휴식 추가</span>
        <Plus size={15} aria-hidden="true" />
      </summary>
      <div>
        <p className="rest-insert-scope">
          지금 시퀀스에 바로 추가 · 자동 편성 휴식 예산과 별개이며 전체 수업 시간에 합산됩니다.
        </p>
        <div className="rest-insert-fields">
          <label className="form-field">
            <span>추가할 휴식 시간 · 분</span>
            <input
              ref={durationInputRef}
              type="number"
              min={0.5}
              max={120}
              step={0.5}
              value={duration}
              aria-invalid={hasDurationError ? true : undefined}
              aria-describedby={hasDurationError ? feedbackId : undefined}
              onKeyDown={(event) => {
                if (event.key === 'Escape' && (hasDurationError || !durationValid)) {
                  event.preventDefault();
                  event.stopPropagation();
                  setDuration(committedDuration);
                  if (feedback?.kind === 'duration-error') setFeedback(null);
                }
              }}
              onChange={(event) => {
                const next = event.target.value;
                setDuration(next);
                if (feedback?.kind === 'duration-error' && isValidManualRestMinutes(next)) {
                  setFeedback(null);
                }
              }}
            />
          </label>
          <label className="form-field">
            <span>휴식 넣을 위치</span>
            <select
              ref={placementSelectRef}
              value={selectValue}
              aria-invalid={hasPlacementError ? true : undefined}
              aria-describedby={
                anchorMissing
                  ? missingAnchorNoteId
                  : effectiveFeedback?.kind === 'placement-error'
                    ? feedbackId
                    : undefined
              }
              onChange={(event) => {
                const raw = event.target.value;
                if (raw === 'end') {
                  selectExplicitPlacement({ kind: 'end' });
                  return;
                }
                if (raw === '-1') {
                  selectExplicitPlacement({ kind: 'start' });
                  return;
                }
                const idx = Number(raw);
                const chosen = Number.isInteger(idx) ? steps[idx] : undefined;
                if (chosen) {
                  selectExplicitPlacement({
                    kind: 'step',
                    stepId: chosen.stepId,
                    labelSnapshot: `${idx + 1}번 ${labelForStep(chosen, idx)}`,
                  });
                }
              }}
            >
              {anchorMissing && placement.kind === 'step' && (
                <option value={MISSING_ANCHOR_SELECT_VALUE} disabled>
                  기준 항목({placement.labelSnapshot}) 없음 — 위치를 다시 선택해 주세요
                </option>
              )}
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

        {anchorMissing && placement.kind === 'step' && (
          <div
            id={missingAnchorNoteId}
            className="rest-anchor-recovery"
            role="status"
            data-testid="rest-missing-anchor-recovery"
          >
            <p className="rest-field-error">
              선택했던 ‘{placement.labelSnapshot}’ 항목이 삭제되었거나 바뀌어 자동 배치하지
              않았습니다. 넣을 위치를 직접 다시 골라 주세요.
            </p>
            <div className="rest-anchor-recovery__actions">
              <button
                type="button"
                className="rest-restore-btn"
                onClick={() => {
                  selectExplicitPlacement({ kind: 'end' });
                  placementSelectRef.current?.focus();
                }}
              >
                맨 뒤로 선택
              </button>
              <button
                type="button"
                className="rest-restore-btn"
                onClick={() => {
                  selectExplicitPlacement({ kind: 'start' });
                  placementSelectRef.current?.focus();
                }}
              >
                맨 앞으로 선택
              </button>
            </div>
          </div>
        )}

        <p
          className="rest-insert-preview"
          data-testid="rest-insert-preview"
          aria-live="polite"
        >
          {durationValid ? (
            <>
              배치 미리보기: <strong>{resolvedPositionSummary}</strong>에 +
              {formatSecondsToMMSS(Math.round(parsedAmount * 60))} · 계획 합계{' '}
              {formatSecondsToMMSS(currentDurations.totalSec)} →{' '}
              <strong>
                {formatSecondsToMMSS(currentDurations.totalSec + Math.round(parsedAmount * 60))}
              </strong>
            </>
          ) : (
            <>
              배치 위치: <strong>{resolvedPositionSummary}</strong> · 0.5–120분 사이 시간을 입력하면
              전체 합계 변화를 미리 표시합니다.
            </>
          )}
        </p>

        <div className="rest-insert-submit-row">
          <button
            type="button"
            className="btn-secondary rest-insert-submit-btn"
            onClick={() => {
              if (anchorMissing) {
                setFeedback({
                  kind: 'placement-error',
                  message:
                    '선택했던 기준 항목이 삭제되었거나 바뀌었습니다. 휴식 넣을 위치를 다시 선택해 주세요.',
                });
                placementSelectRef.current?.focus();
                return;
              }
              if (!durationValid) {
                setFeedback({
                  kind: 'duration-error',
                  message: '휴식 시간을 0.5–120분 사이로 입력해 주세요.',
                });
                durationInputRef.current?.focus();
                return;
              }
              const resolvedAfterIndex =
                placement.kind === 'end'
                  ? undefined
                  : placement.kind === 'start'
                    ? -1
                    : anchorIndex;
              const result = onAdd(parsedAmount, resolvedAfterIndex);
              if (!result.success) {
                setFeedback({
                  kind: 'duration-error',
                  message: result.message,
                });
                durationInputRef.current?.focus();
                return;
              }
              setCommittedDuration(duration.trim());
              setFeedback({
                kind: 'success',
                message: result.message,
              });
            }}
          >
            <Plus size={15} aria-hidden="true" />이 위치에 휴식 넣기
          </button>

          {showDurationRestore && (
            <button
              type="button"
              className="rest-restore-btn"
              onClick={restoreDurationValue}
            >
              <RotateCcw size={13} aria-hidden="true" />
              <span>원래 값({committedDuration}분) 복구</span>
            </button>
          )}
        </div>

        {effectiveFeedback && (
          <p
            id={feedbackId}
            className={`rest-insert-feedback ${effectiveFeedback.kind !== 'success' ? 'is-error' : ''}`}
            role="status"
          >
            {effectiveFeedback.message}
          </p>
        )}
      </div>
    </details>
  );
}
