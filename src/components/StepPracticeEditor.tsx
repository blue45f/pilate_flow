import { useId, useState } from 'react';
import { Check, LockKeyhole } from 'lucide-react';
import { usePilatesStore } from '../store/usePilatesStore';
import type { SequenceStep, StepSideMode } from '../types/pilates';
import { isRestStep } from '../utils/sequenceEngine';

interface StepPracticeEditorProps {
  index: number;
  step: SequenceStep;
}

const sideOptions: readonly { value: StepSideMode | ''; label: string }[] = [
  { value: '', label: '동작 기본' },
  { value: 'together', label: '양쪽 함께' },
  { value: 'left', label: '왼쪽만' },
  { value: 'right', label: '오른쪽만' },
  { value: 'left-then-right', label: '왼쪽부터 양쪽' },
  { value: 'right-then-left', label: '오른쪽부터 양쪽' },
];

/** Teacher-entered planning choices. Repetition counts never determine an item's time. */
export function StepPracticeEditor({ index, step }: StepPracticeEditorProps) {
  const setPracticeOptions = usePilatesStore((state) => state.setStepPracticeOptions);
  const source = JSON.stringify([step.stepId, step.repetitions ?? null, step.sideMode ?? null]);
  const [edit, setEdit] = useState<{
    source: string;
    repetitions: string;
    sideMode: StepSideMode | '';
  } | null>(null);
  const [feedback, setFeedback] = useState<{
    stepId: string;
    success: boolean;
    message: string;
  } | null>(null);
  const hintId = useId();
  const repetitions = edit?.source === source ? edit.repetitions : String(step.repetitions ?? '');
  const sideMode = edit?.source === source ? edit.sideMode : (step.sideMode ?? '');
  const update = (patch: { repetitions?: string; sideMode?: StepSideMode | '' }) => {
    setEdit({ source, repetitions, sideMode, ...patch });
    setFeedback(null);
  };
  const apply = () => {
    if (step.locked || isRestStep(step)) return;
    const current = usePilatesStore.getState().activeSteps[index];
    if (current?.stepId !== step.stepId) {
      setFeedback({
        stepId: step.stepId,
        success: false,
        message: '동작 순서가 바뀌었습니다. 현재 항목을 다시 열어 주세요.',
      });
      return;
    }
    const count = repetitions.trim() ? Number(repetitions) : undefined;
    if (count !== undefined && (!Number.isInteger(count) || count < 1 || count > 1000)) {
      setFeedback({
        stepId: step.stepId,
        success: false,
        message: '횟수는 1–1000 사이의 정수로 입력하거나 비워 주세요.',
      });
      return;
    }
    const result = setPracticeOptions(index, {
      repetitions: count,
      sideMode: sideMode || undefined,
    });
    setFeedback({ stepId: step.stepId, ...result });
  };

  if (isRestStep(step)) return null;

  return (
    <section className="step-practice-editor" aria-label={`${index + 1}번 동작 횟수·좌우 계획`}>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          apply();
        }}
      >
        <fieldset disabled={step.locked} style={{ border: 0, margin: 0, padding: 0 }}>
          <legend className="eyebrow">내 수행 계획</legend>
          <div className="library-form-grid">
            <label className="form-field">
              <span>강사가 정한 횟수</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={1000}
                step={1}
                value={repetitions}
                onChange={(event) => update({ repetitions: event.target.value })}
                placeholder="미지정"
                aria-describedby={hintId}
              />
            </label>
            <label className="form-field">
              <span>수행할 쪽</span>
              <select
                value={sideMode}
                onChange={(event) => update({ sideMode: event.target.value as StepSideMode | '' })}
                aria-describedby={hintId}
              >
                {sideOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button type="submit" className="btn-secondary">
            <Check size={15} /> 횟수·좌우 적용
          </button>
        </fieldset>
      </form>
      <p className="muted" id={hintId}>
        적용을 눌러 저장합니다. 횟수와 좌우 선택으로 시간을 자동 계산하지 않습니다. 횟수를 비우면
        미지정으로 저장합니다.
      </p>
      {step.locked && (
        <p className="muted">
          <LockKeyhole size={13} /> 잠근 동작은 횟수·좌우를 바꿀 수 없습니다.
        </p>
      )}
      {feedback?.stepId === step.stepId && (
        <p role={feedback.success ? 'status' : 'alert'}>{feedback.message}</p>
      )}
    </section>
  );
}
