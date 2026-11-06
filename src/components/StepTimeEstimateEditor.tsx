import { useState } from 'react';
import type { StepTimeEstimate } from '../schemas/stepTimeEstimate';
import type { StepSideMode } from '../types/pilates';
import { calculateStepTimeEstimate } from '../utils/stepTimeEstimate';
import { formatSecondsToMMSS } from '../utils/sequenceEngine';
import '../styles/step-time-estimate.css';

const FIELDS = [
  ['repetitions', '계산용 횟수 · 한 세트마다', 1, 1000],
  ['sets', '계산용 세트 · 한쪽마다', 1, 100],
  ['secondsPerRep', '한 회 움직임 · 초', 1, 1200],
  ['holdSecPerRep', '한 회마다 추가 유지 · 초', 0, 1200],
  ['breathsPerSet', '세트마다 별도 호흡 · 회', 0, 100],
  ['secondsPerBreath', '별도 호흡 한 회 · 초', 0, 1200],
  ['restBetweenSetsSec', '세트 사이 쉼 · 초', 0, 1200],
  ['sideSwitchSec', '좌우 바꾸기 · 초', 0, 1200],
  ['explanationSec', '계산용 티칭 · 초', 0, 1200],
  ['transitionSec', '기구·다음 동작 이동 · 초', 0, 1200],
] as const;
interface Props {
  initial: StepTimeEstimate | null;
  repetitions?: number;
  sets?: number;
  sideMode?: StepSideMode;
  explanationSec?: number;
  transitionSec?: number;
  currentDurationMin: number;
  onUse: (value: StepTimeEstimate, durationMin: number) => void;
}
export function StepTimeEstimateEditor(props: Props) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(
        props.initial ?? {
          repetitions: props.repetitions ?? 1,
          sets: props.sets ?? 1,
          sides:
            props.sideMode === 'left-then-right' || props.sideMode === 'right-then-left' ? 2 : 1,
          secondsPerRep: '',
          holdSecPerRep: 0,
          breathsPerSet: 0,
          secondsPerBreath: 0,
          restBetweenSetsSec: 0,
          sideSwitchSec: 0,
          explanationSec: props.explanationSec ?? 0,
          transitionSec: props.transitionSec ?? 0,
        },
      )
        .filter(([key]) => key !== 'version')
        .map(([key, value]) => [key, String(value)]),
    ),
  );
  const [used, setUsed] = useState(false);
  const blank = Object.values(values).some((value) => !value.trim());
  const result = calculateStepTimeEstimate({
    version: 1,
    ...Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Number(value)])),
  });
  const change = (key: string, value: string) => {
    setValues({ ...values, [key]: value });
    setUsed(false);
  };
  return (
    <details className="step-time-estimate">
      <summary>반복·유지·호흡으로 시간 계산</summary>
      <p>직접 정한 가정으로만 계산합니다. 기본 1회·1세트는 계산용 값이며 권장량이 아닙니다.</p>
      <p>
        움직이며 하는 호흡은 한 회 시간에 포함하세요. 아래 유지·호흡은 별도로 더할 시간만
        입력합니다. 세부 리듬을 자동 안내하지 않습니다.
      </p>
      <div className="step-time-estimate-fields">
        <label className="form-field">
          <span>계산할 쪽</span>
          <select value={values.sides} onChange={(event) => change('sides', event.target.value)}>
            <option value="1">한쪽 또는 양쪽 함께 · 1배</option>
            <option value="2">왼쪽과 오른쪽 각각 · 2배</option>
          </select>
        </label>
        {FIELDS.map(([key, label, min, max]) => (
          <label className="form-field" key={key}>
            <span>{label}</span>
            <input
              type="number"
              min={min}
              max={max}
              step="1"
              value={values[key]}
              placeholder={key === 'secondsPerRep' ? '직접 입력' : undefined}
              onChange={(event) => change(key, event.target.value)}
            />
          </label>
        ))}
      </div>
      {result.success && !blank ? (
        <div aria-live="polite">
          <strong>가정 총시간 {formatSecondsToMMSS(result.totalSec)}</strong>
          <p>
            움직임 {result.movingSec}초 + 유지 {result.holdingSec}초 + 별도 호흡{' '}
            {result.breathingSec}초 + 세트 쉼 {result.restingSec}초 + 좌우 이동{' '}
            {result.switchingSec}초 + 티칭 {result.value.explanationSec}초 + 기구·동작 전환{' '}
            {result.value.transitionSec}초
          </p>
          <p>
            현재 편집란 {formatSecondsToMMSS(Math.round(props.currentDurationMin * 60))}. 확인 후
            아래 버튼으로만 바뀝니다.
          </p>
        </div>
      ) : (
        <p role="status">
          {blank
            ? '빈 가정 시간을 직접 입력하면 합계를 볼 수 있어요.'
            : result.success
              ? ''
              : result.message}
        </p>
      )}
      <button
        type="button"
        className="btn-secondary"
        disabled={!result.success || blank}
        onClick={() => {
          if (result.success && !blank) {
            props.onUse(result.value, result.durationMin);
            setUsed(true);
          }
        }}
      >
        계산값을 편집란에 넣기
      </button>
      {used && (
        <p role="status">편집란에 옮겼습니다. 블록의 적용 버튼을 눌러야 수업에 저장됩니다.</p>
      )}
    </details>
  );
}
