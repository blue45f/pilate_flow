import { PostureAnatomyGuide } from './PostureAnatomyGuide';
import { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Clock3,
  LockKeyhole,
  RefreshCw,
  Trash2,
  UnlockKeyhole,
} from 'lucide-react';
import { EQUIPMENT_OPTIONS, getExerciseEquipment } from '../data/equipmentCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import type { LayerMode, PilatesExercise, SequenceStep, StepSideMode } from '../types/pilates';
import type { ClassSectionRole } from '../types/sequenceMotion';
import { getExerciseReviewState, isExerciseAutoEligible } from '../utils/exerciseReview';
import { formatSecondsToMMSS, getStepTiming, isRestStep } from '../utils/sequenceEngine';
import { assessSequenceMotionStudyBinding } from '../utils/sequenceMotionBinding';
import { StepTimeEstimateEditor } from './StepTimeEstimateEditor';
import { StepMotionStudyPicker } from './StepMotionStudyPicker';
import { ExerciseEvidencePanel } from './ExerciseEvidencePanel';
import { MovementVisualGuideCard } from './MovementVisualGuideCard';
import '../styles/step-inspector.css';

interface Props {
  index: number;
  step: SequenceStep;
  onClose: () => void;
  onOpenExercise: (exercise: PilatesExercise) => void;
  onReplace: () => void;
  playbackActive?: boolean;
  loadDraft?: () => StepInspectorDraftCache | null;
  onDraftChange?: (value: StepInspectorDraftCache) => void;
}
const editableValues = (step: SequenceStep) => ({
  selectedLayer: step.selectedLayer,
  durationMin: step.durationMin,
  explanationSec: step.explanationSec,
  transitionSec: step.transitionSec,
  customSpringOverride: step.customSpringOverride,
  repetitions: step.repetitions,
  sets: step.sets,
  sideMode: step.sideMode,
  instructorNote: step.instructorNote,
  classSection: step.classSection ?? null,
  motionStudy: step.motionStudy ?? null,
  timeEstimate: step.timeEstimate ?? null,
});
const cloneStep = (step: SequenceStep): SequenceStep => JSON.parse(JSON.stringify(step));
const draftFrom = (step: SequenceStep) => ({
  layer: step.selectedLayer,
  duration: String(step.durationMin),
  explanation: step.explanationSec === undefined ? '' : String(step.explanationSec),
  transition: step.transitionSec === undefined ? '' : String(step.transitionSec),
  spring: step.customSpringOverride ?? '',
  count: step.repetitions === undefined ? '' : String(step.repetitions),
  sets: step.sets === undefined ? '' : String(step.sets),
  side: step.sideMode ?? '',
  note: step.instructorNote ?? '',
  section: step.classSection ?? '',
  motionStudy: step.motionStudy ? cloneStep(step).motionStudy! : null,
  timeEstimate: step.timeEstimate ? cloneStep(step).timeEstimate! : null,
});
const LAYER_OPTIONS: { value: LayerMode; label: string }[] = [
  { value: 'easy', label: '쉬운 변형' },
  { value: 'standard', label: '기본 변형' },
  { value: 'hard', label: '어려운 변형' },
];
export interface StepInspectorDraftCache {
  stepId: string;
  exerciseId: string;
  base: SequenceStep;
  draft: ReturnType<typeof draftFrom>;
}

/** Class-only settings. A note's review does not certify its motion or session settings. */
export function StepBlockInspector({
  index,
  step,
  onClose,
  onOpenExercise,
  onReplace,
  playbackActive = true,
  loadDraft,
  onDraftChange,
}: Props) {
  const store = usePilatesStore();
  const exercise = store.exercises.find((item) => item.id === step.exerciseId);
  const cached = () => {
    const value = loadDraft?.();
    return value?.stepId === step.stepId && value.exerciseId === step.exerciseId ? value : null;
  };
  const [base, setBase] = useState(() => cloneStep(cached()?.base ?? step));
  const [draft, setDraft] = useState(() => {
    const saved = cached()?.draft;
    return { ...draftFrom(step), ...saved, layer: saved?.layer ?? step.selectedLayer };
  });
  const [message, setMessage] = useState('');
  const [showVisualGuide, setShowVisualGuide] = useState(false);
  useEffect(() => {
    onDraftChange?.({ stepId: step.stepId, exerciseId: step.exerciseId, base, draft });
  }, [onDraftChange, step.stepId, step.exerciseId, base, draft]);
  const current = store.activeSteps[index];
  const stale =
    !current ||
    current.stepId !== step.stepId ||
    current.exerciseId !== base.exerciseId ||
    JSON.stringify(current) !== JSON.stringify(base);
  const dirty = JSON.stringify(draft) !== JSON.stringify(draftFrom(base));
  const disabled = !!step.locked || !exercise || isRestStep(step);
  if (isRestStep(step)) return null;
  const timing = getStepTiming(step, exercise);
  const review = exercise ? getExerciseReviewState(exercise) : 'pending';
  const bindingStatus = assessSequenceMotionStudyBinding(step.exerciseId, step.motionStudy);
  const next = store.activeSteps[index + 1];
  const equipment = exercise
    ? getExerciseEquipment(exercise)
        .requiredEquipment.map(
          (id) => EQUIPMENT_OPTIONS.find((item) => item.id === id)?.labelKo ?? id,
        )
        .join(' · ')
    : '';

  const apply = (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    const live = usePilatesStore.getState().activeSteps[index];
    if (
      stale ||
      !live ||
      live.stepId !== step.stepId ||
      live.exerciseId !== base.exerciseId ||
      JSON.stringify(live) !== JSON.stringify(base)
    ) {
      setMessage('다른 편집으로 이 블록이 바뀌었습니다. 현재 값을 다시 불러온 뒤 확인해 주세요.');
      return;
    }
    const values = {
      selectedLayer: draft.layer,
      durationMin: Number(draft.duration),
      explanationSec: draft.explanation.trim() ? Number(draft.explanation) : undefined,
      transitionSec: draft.transition.trim() ? Number(draft.transition) : undefined,
      repetitions: draft.count.trim() ? Number(draft.count) : undefined,
      sets: draft.sets.trim() ? Number(draft.sets) : undefined,
      sideMode: (draft.side || undefined) as StepSideMode | undefined,
      customSpringOverride: draft.spring.trim() || undefined,
      instructorNote: draft.note || undefined,
      classSection: (draft.section || null) as ClassSectionRole | null,
      motionStudy: draft.motionStudy,
      timeEstimate: draft.timeEstimate,
    };
    const old = editableValues(base);
    const patch: Partial<typeof values> = {};
    for (const key of Object.keys(values) as (keyof typeof values)[]) {
      if (JSON.stringify(values[key]) !== JSON.stringify(old[key]))
        Object.assign(patch, { [key]: values[key] });
    }
    if (!Object.keys(patch).length) {
      onClose();
      return;
    }
    const result = store.setStepBlockOptions(index, patch, base);
    if (result.success) onClose();
    else setMessage(result.message);
  };

  return (
    <section className="step-block-inspector" aria-label={`${index + 1}번 동작 블록 편집`}>
      <header className="step-inspector-top">
        <span>동작 블록 · {String(index + 1).padStart(2, '0')}</span>
        <h2>{exercise?.nameKo ?? '동작 자료 확인 필요'}</h2>
        <p>{equipment || '기구 확인 필요'}</p>
        <div className="step-inspector-badges">
          <span>
            {bindingStatus === 'matched'
              ? '초안 연결 · 전문가 미검토'
              : bindingStatus === 'unbound'
                ? '모션 미연결'
                : '모션 연결 확인 필요'}
          </span>
          <span>
            {review === 'approved'
              ? '내 검토 기록 · 자격 미인증'
              : review === 'stale'
                ? '정보 변경 · 다시 검토 필요'
                : '계획 정보 미검토'}
          </span>
          {step.locked && <span>잠금</span>}
        </div>
      </header>
      <div className="step-inspector-summary">
        <span>선택 동작 총시간</span>
        <strong>{formatSecondsToMMSS(timing.totalSec)}</strong>
        <p>
          수행 {formatSecondsToMMSS(timing.movementSec)} · 티칭{' '}
          {formatSecondsToMMSS(timing.explanationSec)} · 전환{' '}
          {formatSecondsToMMSS(timing.transitionSec)}
        </p>
        <small>
          양측 수행·티칭·전환을 한 번만 합산합니다. 별도 휴식 블록은 아래에서 구분합니다.
        </small>
      </div>
      {exercise && <PostureAnatomyGuide exercise={exercise} compact />}
      <form className="step-inspector-form" onSubmit={apply} noValidate>
        <fieldset disabled={disabled}>
          <legend>이번 수업의 계획</legend>
          <label className="form-field">
            <span>수업에서의 역할</span>
            <select
              value={draft.section}
              onChange={(event) => setDraft({ ...draft, section: event.target.value })}
            >
              <option value="">동작 분류에 따라 자동</option>
              <option value="preparation">준비운동</option>
              <option value="main">본운동</option>
              <option value="cooldown">마무리</option>
            </select>
          </label>
          <p className="muted">
            수업 안에서 맡는 역할입니다. 모션의 준비·움직임·마무리 단계와는 별개이며 순서와 시간은
            유지됩니다.
          </p>
          <div className="step-inspector-time-fields">
            <label className="form-field">
              <span>블록 총시간 · 분</span>
              <input
                type="number"
                min="0.5"
                max="20"
                step="any"
                value={draft.duration}
                onChange={(event) => setDraft({ ...draft, duration: event.target.value })}
              />
            </label>
            <label className="form-field">
              <span>티칭 · 초</span>
              <input
                type="number"
                min="0"
                max="1200"
                step="1"
                placeholder="0"
                value={draft.explanation}
                onChange={(event) => setDraft({ ...draft, explanation: event.target.value })}
              />
            </label>
            <label className="form-field">
              <span>전환 · 초</span>
              <input
                type="number"
                min="0"
                max="1200"
                step="1"
                placeholder="0"
                value={draft.transition}
                onChange={(event) => setDraft({ ...draft, transition: event.target.value })}
              />
            </label>
          </div>
          <label className="form-field">
            <span>이번 수업 변형</span>
            <select
              value={draft.layer}
              onChange={(event) => setDraft({ ...draft, layer: event.target.value as LayerMode })}
            >
              {LAYER_OPTIONS.map((option) => {
                const authored = !!exercise?.layers[option.value]?.trim();
                return (
                  <option key={option.value} value={option.value} disabled={!authored}>
                    {option.label}
                    {authored ? '' : ' · 계획 메모 없음'}
                  </option>
                );
              })}
            </select>
          </label>
          <div className="step-inspector-layer-note" aria-label="변형의 계획 정보">
            {exercise && review === 'approved' && exercise.layers[draft.layer]?.trim() ? (
              <>
                <strong>내가 검토한 계획 큐 · 선택 중인 변형</strong>
                <p>{exercise.layers[draft.layer]}</p>
              </>
            ) : review === 'approved' ? (
              <p>선택한 변형의 계획 메모가 기재되지 않았습니다.</p>
            ) : (
              <p>변형의 원본 계획 메모는 현재 계획 정보 검토 후 확인할 수 있습니다.</p>
            )}
            <p>
              변형 선택은 이번 수업의 계획 대안입니다. 전문가 검수나 모션 검증과 별개이며,
              횟수·세트·총시간은 자동으로 바뀌지 않습니다.
            </p>
          </div>
          <div className="step-inspector-count-fields">
            <label className="form-field">
              <span>강사가 정한 횟수</span>
              <input
                type="number"
                min="1"
                max="1000"
                step="1"
                placeholder="미지정"
                value={draft.count}
                onChange={(event) => setDraft({ ...draft, count: event.target.value })}
              />
            </label>
            <label className="form-field">
              <span>강사가 정한 세트</span>
              <input
                type="number"
                min="1"
                max="100"
                step="1"
                placeholder="미지정"
                value={draft.sets}
                onChange={(event) => setDraft({ ...draft, sets: event.target.value })}
              />
            </label>
          </div>
          <label className="form-field">
            <span>수행할 쪽</span>
            <select
              value={draft.side}
              onChange={(event) => setDraft({ ...draft, side: event.target.value })}
            >
              <option value="">동작 기본</option>
              <option value="together">양쪽 함께</option>
              <option value="left">왼쪽만</option>
              <option value="right">오른쪽만</option>
              <option value="left-then-right">왼쪽부터 양쪽</option>
              <option value="right-then-left">오른쪽부터 양쪽</option>
            </select>
          </label>
          <p className="muted">
            좌우는 회원의 몸 기준입니다. 횟수·세트·좌우 설정으로 총시간을 자동 곱하지 않습니다.
          </p>
          <StepTimeEstimateEditor
            key={JSON.stringify(base)}
            initial={draft.timeEstimate}
            repetitions={draft.count ? Number(draft.count) : undefined}
            sets={draft.sets ? Number(draft.sets) : undefined}
            sideMode={(draft.side || undefined) as StepSideMode | undefined}
            explanationSec={draft.explanation ? Number(draft.explanation) : undefined}
            transitionSec={draft.transition ? Number(draft.transition) : undefined}
            currentDurationMin={Number(draft.duration)}
            onUse={(estimate, durationMin) =>
              setDraft({
                ...draft,
                timeEstimate: estimate,
                duration: String(durationMin),
                count: String(estimate.repetitions),
                sets: String(estimate.sets),
                side:
                  estimate.sides === 2
                    ? draft.side === 'right-then-left'
                      ? draft.side
                      : 'left-then-right'
                    : draft.side === 'left' || draft.side === 'right'
                      ? draft.side
                      : 'together',
                explanation: String(estimate.explanationSec),
                transition: String(estimate.transitionSec),
              })
            }
          />
          <details open>
            <summary>이번 수업의 기구 세팅·티칭 메모</summary>
            {exercise && isExerciseAutoEligible(exercise) && (
              <p className="muted">
                검토한 동작의 기본 세팅: {exercise.springs || '별도 기재 없음'}
              </p>
            )}
            <label className="form-field">
              <span>이번 수업 스프링 설정 · 직접 확인</span>
              <input
                maxLength={500}
                value={draft.spring}
                onChange={(event) => setDraft({ ...draft, spring: event.target.value })}
                placeholder="비워 두면 동작 기본값"
              />
            </label>
            <label className="form-field">
              <span>이번 수업 티칭 메모</span>
              <textarea
                maxLength={3000}
                rows={3}
                value={draft.note}
                onChange={(event) => setDraft({ ...draft, note: event.target.value })}
              />
            </label>
            <p className="muted">
              세팅은 실제 기구에서 강사가 확인합니다. 동작의 필수 기구를 바꾸려면 원본 정보를
              수정하고 다시 검토해야 합니다.
            </p>
          </details>
        </fieldset>
        <StepMotionStudyPicker
          exerciseId={step.exerciseId}
          value={draft.motionStudy}
          disabled={disabled}
          playbackActive={playbackActive}
          onChange={(motionStudy) => setDraft({ ...draft, motionStudy })}
        />
        <div className="step-inspector-rest-note">
          <Clock3 size={17} />
          <span>
            휴식{' '}
            {next && isRestStep(next)
              ? `${formatSecondsToMMSS(next.durationMin * 60)} · 다음 별도 블록`
              : '별도 블록으로 추가'}
            <small>휴식은 전체 수업 시간에 한 번만 포함됩니다.</small>
          </span>
        </div>
        {stale && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              if (current?.stepId === step.stepId) {
                setBase(cloneStep(current));
                setDraft(draftFrom(current));
                setMessage('현재 값을 불러왔습니다.');
              }
            }}
          >
            현재 값 다시 불러오기
          </button>
        )}
        {step.locked && <p className="muted">잠금을 해제한 뒤 계획을 수정할 수 있습니다.</p>}
        {message && (
          <p
            role={
              message === '수정한 입력값을 적용 전 상태로 되돌렸습니다.' ? 'status' : 'alert'
            }
            className={
              message === '수정한 입력값을 적용 전 상태로 되돌렸습니다.'
                ? 'status'
                : 'status error'
            }
          >
            {message}
          </p>
        )}
        {exercise && (
          <details
            className="step-inspector-visual-guide"
            data-testid="step-inspector-visual-guide"
            open={showVisualGuide}
            onToggle={(event) => setShowVisualGuide(event.currentTarget.open)}
          >
            <summary>시작·중간·끝 관절 정렬 도해 및 유사 동작 차이 비교</summary>
            {showVisualGuide && (
              <MovementVisualGuideCard
                exercise={exercise}
                availablePeers={store.exercises}
                initialPhase="middle"
              />
            )}
          </details>
        )}
        {exercise && <ExerciseEvidencePanel exercise={exercise} step={step} />}
        <div className="step-inspector-footer">
          <button type="button" className="text-button" disabled={disabled} onClick={onReplace}>
            <RefreshCw size={16} /> 동작 교체
          </button>
          <button
            type="button"
            className="btn-secondary"
            data-testid="step-inspector-reset-draft"
            disabled={!dirty || disabled}
            onClick={() => {
              setDraft(draftFrom(base));
              setMessage('수정한 입력값을 적용 전 상태로 되돌렸습니다.');
            }}
          >
            입력 되돌리기
          </button>
          <button className="btn-primary" type="submit" disabled={disabled}>
            변경 적용
          </button>
        </div>
      </form>
      <div className="step-inspector-inline-actions">
        <button type="button" className="btn-secondary" onClick={() => store.toggleStepLock(index)}>
          {step.locked ? <UnlockKeyhole size={16} /> : <LockKeyhole size={16} />}
          {step.locked ? '블록 잠금 해제' : '블록 잠금'}
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label="블록 위로"
          disabled={index === 0 || step.locked}
          onClick={() => store.moveStep(index, 'up')}
        >
          <ArrowUp size={16} />
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label="블록 아래로"
          disabled={index === store.activeSteps.length - 1 || step.locked}
          onClick={() => store.moveStep(index, 'down')}
        >
          <ArrowDown size={16} />
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label="블록 삭제"
          disabled={step.locked}
          onClick={() => {
            store.removeStep(index);
            onClose();
          }}
        >
          <Trash2 size={16} />
        </button>
        {exercise && (
          <button type="button" className="text-button" onClick={() => onOpenExercise(exercise)}>
            동작 원본·검토 정보
          </button>
        )}
      </div>
    </section>
  );
}
