import { useState } from 'react';
import type { StepTimeEstimate } from '../schemas/stepTimeEstimate';
import type { StepSideMode } from '../types/pilates';
import { calculateStepTimeEstimate } from '../utils/stepTimeEstimate';
import { resolveAppliedSideMode } from '../utils/stepTimeEstimatePresentation';
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

type FieldKey = (typeof FIELDS)[number][0];

const OPTIONAL_ZERO_FIELD_KEYS: readonly FieldKey[] = [
  'holdSecPerRep',
  'breathsPerSet',
  'secondsPerBreath',
  'restBetweenSetsSec',
  'sideSwitchSec',
  'explanationSec',
  'transitionSec',
];

const SIDE_MODE_LABELS: Record<StepSideMode, string> = {
  together: '양쪽 함께',
  left: '왼쪽만',
  right: '오른쪽만',
  'left-then-right': '왼쪽부터 양쪽',
  'right-then-left': '오른쪽부터 양쪽',
};

function isValidIntInRange(raw: string, min: number, max: number): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max;
}

function formatOptionalCount(value: number | undefined, unit: string): string {
  return value === undefined || !Number.isFinite(value) ? '미지정' : `${value}${unit}`;
}

function formatOptionalSeconds(value: number | undefined): string {
  return value === undefined || !Number.isFinite(value) ? '0초(기본)' : `${value}초`;
}

interface Props {
  initial: StepTimeEstimate | null;
  repetitions?: number;
  sets?: number;
  sideMode?: StepSideMode;
  explanationSec?: number;
  transitionSec?: number;
  currentDurationMin: number;
  isUnilateralExercise?: boolean;
  disabled?: boolean;
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
  const [transferFeedback, setTransferFeedback] = useState<'idle' | 'applied' | 'already'>('idle');

  const blank = Object.values(values).some((value) => !value.trim());
  const parsedInput = {
    version: 1,
    ...Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Number(value)])),
  };
  const result = calculateStepTimeEstimate(parsedInput);

  const selectedSides: 1 | 2 = values.sides === '2' ? 2 : 1;
  const appliedSideMode = resolveAppliedSideMode(selectedSides, props.sideMode);
  const currentSideLabel = props.sideMode
    ? SIDE_MODE_LABELS[props.sideMode]
    : props.isUnilateralExercise
      ? '동작 기본(편측)'
      : '동작 기본';
  const appliedSideLabel = SIDE_MODE_LABELS[appliedSideMode];

  const upperIsBilateral =
    props.sideMode === 'left-then-right' || props.sideMode === 'right-then-left';
  const upperIsSingleMultiplier =
    props.sideMode === 'together' || props.sideMode === 'left' || props.sideMode === 'right';
  const unilateralDefaultMismatch =
    props.sideMode === undefined && Boolean(props.isUnilateralExercise) && selectedSides === 1;
  const hasSideMultiplierMismatch =
    (upperIsBilateral && selectedSides === 1) ||
    (upperIsSingleMultiplier && selectedSides === 2) ||
    unilateralDefaultMismatch;

  const syncTargetSides = upperIsBilateral
    ? '2'
    : upperIsSingleMultiplier
      ? '1'
      : props.isUnilateralExercise
        ? '2'
        : null;
  const syncTargetReps =
    props.repetitions !== undefined &&
    Number.isInteger(props.repetitions) &&
    props.repetitions >= 1 &&
    props.repetitions <= 1000
      ? String(props.repetitions)
      : null;
  const syncTargetSets =
    props.sets !== undefined &&
    Number.isInteger(props.sets) &&
    props.sets >= 1 &&
    props.sets <= 100
      ? String(props.sets)
      : null;
  const syncTargetExplanation =
    props.explanationSec !== undefined &&
    Number.isInteger(props.explanationSec) &&
    props.explanationSec >= 0 &&
    props.explanationSec <= 1200
      ? String(props.explanationSec)
      : null;
  const syncTargetTransition =
    props.transitionSec !== undefined &&
    Number.isInteger(props.transitionSec) &&
    props.transitionSec >= 0 &&
    props.transitionSec <= 1200
      ? String(props.transitionSec)
      : null;

  const canSyncFromDraft =
    (syncTargetSides !== null && values.sides !== syncTargetSides) ||
    (syncTargetReps !== null && values.repetitions !== syncTargetReps) ||
    (syncTargetSets !== null && values.sets !== syncTargetSets) ||
    (syncTargetExplanation !== null && values.explanationSec !== syncTargetExplanation) ||
    (syncTargetTransition !== null && values.transitionSec !== syncTargetTransition);

  const invalidFieldKeys = new Set<FieldKey>();
  for (const [key, , min, max] of FIELDS) {
    const raw = values[key] ?? '';
    if (raw.trim() !== '' && !isValidIntInRange(raw, min, max)) {
      invalidFieldKeys.add(key);
    }
  }
  const breathMissingDuration =
    isValidIntInRange(values.breathsPerSet ?? '', 1, 100) &&
    (values.secondsPerBreath ?? '').trim() !== '' &&
    Number(values.secondsPerBreath) === 0;
  if (breathMissingDuration) {
    invalidFieldKeys.add('secondsPerBreath');
  }
  const hasInvalidOptionalZeroField = OPTIONAL_ZERO_FIELD_KEYS.some((key) => {
    const [, , min, max] = FIELDS.find(([fieldKey]) => fieldKey === key)!;
    const raw = values[key] ?? '';
    return raw.trim() !== '' && !isValidIntInRange(raw, min, max);
  });

  const currentDurationSec = Number.isFinite(props.currentDurationMin)
    ? Math.max(0, Math.round(props.currentDurationMin * 60))
    : 0;
  const alreadyTransferred =
    result.success &&
    !blank &&
    props.initial !== null &&
    JSON.stringify(props.initial) === JSON.stringify(result.value) &&
    Math.abs(props.currentDurationMin - result.durationMin) < 1e-6 &&
    props.repetitions === result.value.repetitions &&
    props.sets === result.value.sets &&
    props.sideMode === appliedSideMode &&
    (props.explanationSec ?? 0) === result.value.explanationSec &&
    props.explanationSec !== undefined &&
    (props.transitionSec ?? 0) === result.value.transitionSec &&
    props.transitionSec !== undefined;

  const change = (key: string, value: string) => {
    setValues({ ...values, [key]: value });
    setTransferFeedback('idle');
  };

  const syncFromUpperDraft = () => {
    setValues((prev) => ({
      ...prev,
      ...(syncTargetSides !== null ? { sides: syncTargetSides } : {}),
      ...(syncTargetReps !== null ? { repetitions: syncTargetReps } : {}),
      ...(syncTargetSets !== null ? { sets: syncTargetSets } : {}),
      ...(syncTargetExplanation !== null ? { explanationSec: syncTargetExplanation } : {}),
      ...(syncTargetTransition !== null ? { transitionSec: syncTargetTransition } : {}),
    }));
    setTransferFeedback('idle');
  };

  const sanitizeOptionalFields = () => {
    setValues((prev) => {
      const next = { ...prev };
      for (const key of OPTIONAL_ZERO_FIELD_KEYS) {
        const [, , min, max] = FIELDS.find(([fieldKey]) => fieldKey === key)!;
        if ((next[key] ?? '').trim() !== '' && !isValidIntInRange(next[key] ?? '', min, max)) {
          next[key] = '0';
        }
      }
      return next;
    });
    setTransferFeedback('idle');
  };

  return (
    <details className="step-time-estimate">
      <summary>반복·유지·호흡으로 시간 계산</summary>
      <p>직접 정한 가정으로만 계산합니다. 기본 1회·1세트는 계산용 값이며 권장량이 아닙니다.</p>
      <p>
        움직이며 하는 호흡은 한 회 시간에 포함하세요. 아래 유지·호흡은 별도로 더할 시간만
        입력합니다. 세부 리듬을 자동 안내하지 않습니다.
      </p>

      <div
        className={`step-time-estimate-alignment${hasSideMultiplierMismatch ? ' is-mismatch' : ''}`}
        data-testid="ste-side-alignment"
      >
        {hasSideMultiplierMismatch ? (
          <p className="step-time-estimate-mismatch-text" data-testid="ste-side-mismatch-notice">
            {unilateralDefaultMismatch
              ? `편측 동작이지만 현재 계산할 쪽이 1배입니다. 그대로 넣으면 수행할 쪽이 ‘동작 기본’에서 ‘${appliedSideLabel}’(으)로 바뀝니다.`
              : `현재 수행할 쪽(${currentSideLabel})과 계산할 쪽(${selectedSides}배)이 다릅니다. 그대로 넣으면 수행할 쪽이 ‘${appliedSideLabel}’(으)로 바뀝니다.`}
          </p>
        ) : props.sideMode === undefined ? (
          <p className="step-time-estimate-alignment-text">
            현재 수행할 쪽이 ‘동작 기본’이므로 계산값을 넣으면 ‘{appliedSideLabel}’(으)로
            지정됩니다.
          </p>
        ) : (
          <p className="step-time-estimate-alignment-text">
            계산할 쪽({selectedSides}배)과 수행할 쪽({currentSideLabel})이 일치해 현재 좌우 설정을
            그대로 유지합니다.
          </p>
        )}
        {canSyncFromDraft && (
          <button
            type="button"
            className="btn-secondary step-time-estimate-sync-btn"
            data-testid="ste-sync-from-draft"
            disabled={props.disabled}
            onClick={syncFromUpperDraft}
          >
            편집란 좌우·횟수 불러오기
          </button>
        )}
      </div>

      <div className="step-time-estimate-fields">
        <label className="form-field">
          <span>계산할 쪽</span>
          <select
            value={values.sides}
            disabled={props.disabled}
            onChange={(event) => change('sides', event.target.value)}
          >
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
              disabled={props.disabled}
              value={values[key]}
              aria-invalid={invalidFieldKeys.has(key) ? 'true' : undefined}
              placeholder={key === 'secondsPerRep' ? '직접 입력' : undefined}
              onChange={(event) => change(key, event.target.value)}
            />
          </label>
        ))}
      </div>

      {result.success && !blank ? (
        <div className="step-time-estimate-result" aria-live="polite">
          <strong>가정 총시간 {formatSecondsToMMSS(result.totalSec)}</strong>
          <p>
            움직임 {result.movingSec}초 + 유지 {result.holdingSec}초 + 별도 호흡{' '}
            {result.breathingSec}초 + 세트 쉼 {result.restingSec}초 + 좌우 이동{' '}
            {result.switchingSec}초 + 티칭 {result.value.explanationSec}초 + 기구·동작 전환{' '}
            {result.value.transitionSec}초
          </p>
          <div className="step-time-estimate-preview" data-testid="ste-apply-preview">
            <strong className="step-time-estimate-preview-title">
              편집란에 반영될 항목 미리보기
            </strong>
            <ul className="step-time-estimate-preview-list">
              <li>
                <span>블록 총시간</span>
                <strong>
                  {currentDurationSec === result.totalSec
                    ? `${formatSecondsToMMSS(result.totalSec)} 유지`
                    : `${formatSecondsToMMSS(currentDurationSec)} → ${formatSecondsToMMSS(result.totalSec)}`}
                </strong>
              </li>
              <li>
                <span>횟수 · 세트</span>
                <strong>
                  {props.repetitions === result.value.repetitions &&
                  props.sets === result.value.sets
                    ? `${result.value.repetitions}회 · ${result.value.sets}세트 유지`
                    : `${formatOptionalCount(props.repetitions, '회')} · ${formatOptionalCount(props.sets, '세트')} → ${result.value.repetitions}회 · ${result.value.sets}세트`}
                </strong>
              </li>
              <li>
                <span>수행할 쪽</span>
                <strong>
                  {props.sideMode === appliedSideMode
                    ? `${appliedSideLabel} 유지`
                    : `${currentSideLabel} → ${appliedSideLabel}`}
                </strong>
              </li>
              <li>
                <span>티칭 · 전환</span>
                <strong>
                  {props.explanationSec === result.value.explanationSec &&
                  props.transitionSec === result.value.transitionSec
                    ? `티칭 ${result.value.explanationSec}초 · 전환 ${result.value.transitionSec}초 유지`
                    : `티칭 ${formatOptionalSeconds(props.explanationSec)} · 전환 ${formatOptionalSeconds(props.transitionSec)} → 티칭 ${result.value.explanationSec}초 · 전환 ${result.value.transitionSec}초`}
                </strong>
              </li>
            </ul>
            <p className="step-time-estimate-scope-note">
              현재 편집란 {formatSecondsToMMSS(currentDurationSec)}. 역할·변형·스프링·티칭
              메모·모션 연결은 유지되며, 확인 후 아래 버튼으로만 편집란에 들어갑니다.
            </p>
          </div>
        </div>
      ) : (
        <div className="step-time-estimate-feedback">
          <p role="status">
            {blank
              ? '빈 가정 시간을 직접 입력하면 합계를 볼 수 있어요.'
              : result.success
                ? ''
                : result.message}
          </p>
          {(breathMissingDuration || hasInvalidOptionalZeroField) && (
            <div className="step-time-estimate-recovery" data-testid="ste-validation-recovery">
              {breathMissingDuration && (
                <button
                  type="button"
                  className="btn-secondary"
                  data-testid="ste-reset-extra-breath"
                  disabled={props.disabled}
                  onClick={() => change('breathsPerSet', '0')}
                >
                  별도 호흡 0회로 되돌리기
                </button>
              )}
              {hasInvalidOptionalZeroField && (
                <button
                  type="button"
                  className="btn-secondary"
                  data-testid="ste-sanitize-invalid-optional"
                  disabled={props.disabled}
                  onClick={sanitizeOptionalFields}
                >
                  잘못된 부가 시간 0초로 정리
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        className="btn-secondary step-time-estimate-apply-btn"
        disabled={Boolean(props.disabled) || !result.success || blank}
        onClick={() => {
          if (!result.success || blank || props.disabled) return;
          if (alreadyTransferred) {
            setTransferFeedback('already');
            return;
          }
          props.onUse(result.value, result.durationMin);
          setTransferFeedback('applied');
        }}
      >
        계산값을 편집란에 넣기
      </button>

      {transferFeedback === 'applied' && (
        <p role="status" className="step-time-estimate-transfer-status">
          편집란에 옮겼습니다. 블록의 적용 버튼을 눌러야 수업에 저장됩니다.
        </p>
      )}
      {transferFeedback === 'already' && (
        <p role="status" className="step-time-estimate-transfer-status">
          이미 편집란에 같은 계산값이 반영되어 있습니다. 블록의 변경 적용 버튼을 눌러야 수업에
          저장됩니다.
        </p>
      )}
    </details>
  );
}
