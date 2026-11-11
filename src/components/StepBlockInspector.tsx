import { PostureAnatomyGuide } from './PostureAnatomyGuide';
import { ExerciseThumbnailBadge } from './ExerciseThumbnailBadge';
import { ApparatusIconBadge } from './ApparatusStudioArtwork';
import { StudioClinicalBriefCard } from './StudioClinicalBriefCard';
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
import { calculateStepTimeEstimate } from '../utils/stepTimeEstimate';
import { resolveAppliedSideMode } from '../utils/stepTimeEstimatePresentation';
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

type InspectorDraft = ReturnType<typeof draftFrom>;

const LAYER_OPTIONS: { value: LayerMode; label: string }[] = [
  { value: 'easy', label: '쉬운 변형' },
  { value: 'standard', label: '기본 변형' },
  { value: 'hard', label: '어려운 변형' },
];

const PENDING_FIELD_LABELS: Record<keyof ReturnType<typeof editableValues>, string> = {
  classSection: '역할',
  durationMin: '총시간',
  explanationSec: '티칭 시간',
  transitionSec: '전환 시간',
  selectedLayer: '변형',
  repetitions: '횟수',
  sets: '세트',
  sideMode: '수행할 쪽',
  timeEstimate: '시간 계산 가정',
  customSpringOverride: '스프링 설정',
  instructorNote: '티칭 메모',
  motionStudy: '수업 모션 연결',
};

function isEstimateCompatibleWithDraft(draft: InspectorDraft): boolean {
  const est = draft.timeEstimate;
  if (!est) return true;
  const calc = calculateStepTimeEstimate(est);
  if (!calc.success) return false;
  const durationTrimmed = draft.duration.trim();
  if (!durationTrimmed || Math.abs(Number(durationTrimmed) - calc.durationMin) >= 1e-6) {
    return false;
  }
  if (!draft.count.trim() || Number(draft.count) !== est.repetitions) return false;
  if (!draft.sets.trim() || Number(draft.sets) !== est.sets) return false;
  const expNum = draft.explanation.trim() ? Number(draft.explanation) : undefined;
  if (expNum !== est.explanationSec) return false;
  const transNum = draft.transition.trim() ? Number(draft.transition) : undefined;
  if (transNum !== est.transitionSec) return false;
  if (est.sides === 2) {
    return draft.side === 'left-then-right' || draft.side === 'right-then-left';
  }
  return draft.side === 'together' || draft.side === 'left' || draft.side === 'right';
}

function evaluateEditedDraftTiming(
  draft: InspectorDraft,
  baseDraft: InspectorDraft,
):
  | { edited: false }
  | {
      edited: true;
      valid: false;
      reason: string;
      invalidDuration: boolean;
      invalidExplanation: boolean;
      invalidTransition: boolean;
    }
  | {
      edited: true;
      valid: true;
      totalSec: number;
      movementSec: number;
      explanationSec: number;
      transitionSec: number;
    } {
  if (
    draft.duration === baseDraft.duration &&
    draft.explanation === baseDraft.explanation &&
    draft.transition === baseDraft.transition
  ) {
    return { edited: false };
  }
  const durationRaw = draft.duration.trim();
  const durationNum = Number(durationRaw);
  const invalidDuration =
    !durationRaw || !Number.isFinite(durationNum) || durationNum < 0.5 || durationNum > 20;

  const explanationRaw = draft.explanation.trim();
  const explanationNum = explanationRaw === '' ? 0 : Number(explanationRaw);
  const invalidExplanation =
    explanationRaw !== '' &&
    (!Number.isInteger(explanationNum) || explanationNum < 0 || explanationNum > 1200);

  const transitionRaw = draft.transition.trim();
  const transitionNum = transitionRaw === '' ? 0 : Number(transitionRaw);
  const invalidTransition =
    transitionRaw !== '' &&
    (!Number.isInteger(transitionNum) || transitionNum < 0 || transitionNum > 1200);

  if (invalidDuration) {
    return {
      edited: true,
      valid: false,
      reason: '블록 총시간은 0.5분(30초) 이상 20분 이하로 입력해 주세요.',
      invalidDuration: true,
      invalidExplanation,
      invalidTransition,
    };
  }
  if (invalidExplanation || invalidTransition) {
    return {
      edited: true,
      valid: false,
      reason: '티칭·전환 시간은 0초 이상 1200초 이하 정수로 입력해 주세요.',
      invalidDuration: false,
      invalidExplanation,
      invalidTransition,
    };
  }
  const totalSec = Math.round(durationNum * 60);
  const overheadSec = Math.round(explanationNum) + Math.round(transitionNum);
  if (overheadSec > totalSec) {
    return {
      edited: true,
      valid: false,
      reason: `티칭(${explanationNum}초)·전환(${transitionNum}초) 합계(${overheadSec}초)가 블록 총시간(${formatSecondsToMMSS(totalSec)})을 초과합니다.`,
      invalidDuration: false,
      invalidExplanation: true,
      invalidTransition: true,
    };
  }
  return {
    edited: true,
    valid: true,
    totalSec,
    movementSec: totalSec - overheadSec,
    explanationSec: explanationNum,
    transitionSec: transitionNum,
  };
}

export interface StepInspectorDraftCache {
  stepId: string;
  exerciseId: string;
  base: SequenceStep;
  draft: InspectorDraft;
}

export const STEP_INSPECTOR_DRAFT_STORAGE_KEY = 'pf_step_inspector_draft_v1';

function readSessionInspectorDraft(
  stepId: string,
  exerciseId: string,
): StepInspectorDraftCache | null {
  try {
    const raw =
      typeof window !== 'undefined'
        ? window.sessionStorage.getItem(STEP_INSPECTOR_DRAFT_STORAGE_KEY)
        : null;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StepInspectorDraftCache;
    if (parsed && parsed.stepId === stepId && parsed.exerciseId === exerciseId && parsed.draft) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function writeSessionInspectorDraft(cache: StepInspectorDraftCache | null): void {
  try {
    if (typeof window === 'undefined') return;
    if (cache) {
      window.sessionStorage[STEP_INSPECTOR_DRAFT_STORAGE_KEY] = JSON.stringify(cache);
    } else {
      delete window.sessionStorage[STEP_INSPECTOR_DRAFT_STORAGE_KEY];
    }
  } catch {
    // ignore storage errors
  }
}

usePilatesStore.subscribe((state, prev) => {
  if (
    state.activeSequenceId !== prev.activeSequenceId ||
    state.activeSteps[0]?.stepId !== prev.activeSteps[0]?.stepId
  ) {
    writeSessionInspectorDraft(null);
  }
});

/** Class-only settings. A note's review does not certify its motion or session settings. */
export function StepBlockInspector(props: Props) {
  if (isRestStep(props.step)) return null;
  return (
    <StepBlockInspectorBody
      key={`${props.step.stepId}:${props.step.exerciseId}`}
      {...props}
    />
  );
}

function StepBlockInspectorBody({
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
    const fromProp = loadDraft?.();
    if (fromProp?.stepId === step.stepId && fromProp.exerciseId === step.exerciseId) {
      return fromProp;
    }
    return loadDraft === undefined ? readSessionInspectorDraft(step.stepId, step.exerciseId) : null;
  };
  const [base, setBase] = useState(() => cloneStep(cached()?.base ?? step));
  const [draft, setDraft] = useState(() => {
    const saved = cached()?.draft;
    return { ...draftFrom(step), ...saved, layer: saved?.layer ?? step.selectedLayer };
  });
  const [message, setMessage] = useState('');
  const [estimateDetached, setEstimateDetached] = useState(false);
  const [calculatorResetKey, setCalculatorResetKey] = useState(0);
  const [showVisualGuide, setShowVisualGuide] = useState(false);

  useEffect(() => {
    const snapshot = { stepId: step.stepId, exerciseId: step.exerciseId, base, draft };
    onDraftChange?.(snapshot);
    if (JSON.stringify(draft) !== JSON.stringify(draftFrom(base))) {
      writeSessionInspectorDraft(snapshot);
    } else {
      writeSessionInspectorDraft(null);
    }
  }, [onDraftChange, step.stepId, step.exerciseId, base, draft]);

  const baseDraft = draftFrom(base);
  const current = store.activeSteps[index];
  const stale =
    !current ||
    current.stepId !== step.stepId ||
    current.exerciseId !== base.exerciseId ||
    JSON.stringify(current) !== JSON.stringify(base);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseDraft);
  const disabled = !!step.locked || !exercise || isRestStep(step);
  const timing = getStepTiming(step, exercise);
  const draftTimingStatus = evaluateEditedDraftTiming(draft, baseDraft);
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

  const draftCandidateValues = {
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
  const oldEditable = editableValues(base);
  const pendingChangedLabels: string[] = [];
  for (const key of Object.keys(PENDING_FIELD_LABELS) as (keyof typeof PENDING_FIELD_LABELS)[]) {
    if (JSON.stringify(draftCandidateValues[key]) !== JSON.stringify(oldEditable[key])) {
      pendingChangedLabels.push(PENDING_FIELD_LABELS[key]);
    }
  }

  const updateCalculatedTargetField = (partial: Partial<InspectorDraft>) => {
    const nextDraft = { ...draft, ...partial };
    if (nextDraft.timeEstimate && !isEstimateCompatibleWithDraft(nextDraft)) {
      setDraft({ ...nextDraft, timeEstimate: null });
      setEstimateDetached(true);
      return;
    }
    setDraft(nextDraft);
  };

  const restoreTimingOnly = () => {
    const restoredDraft = {
      ...draft,
      duration: baseDraft.duration,
      explanation: baseDraft.explanation,
      transition: baseDraft.transition,
    };
    const shouldDetach =
      restoredDraft.timeEstimate !== null && !isEstimateCompatibleWithDraft(restoredDraft);
    setDraft(shouldDetach ? { ...restoredDraft, timeEstimate: null } : restoredDraft);
    if (shouldDetach) setEstimateDetached(true);
    setMessage('');
  };

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
    const patch: Partial<typeof draftCandidateValues> = {};
    for (const key of Object.keys(
      draftCandidateValues,
    ) as (keyof typeof draftCandidateValues)[]) {
      if (JSON.stringify(draftCandidateValues[key]) !== JSON.stringify(oldEditable[key])) {
        Object.assign(patch, { [key]: draftCandidateValues[key] });
      }
    }
    if (!Object.keys(patch).length) {
      writeSessionInspectorDraft(null);
      onClose();
      return;
    }
    const result = store.setStepBlockOptions(index, patch, base);
    if (result.success) {
      const updatedStep = usePilatesStore.getState().activeSteps[index];
      if (updatedStep && updatedStep.stepId === step.stepId) {
        const nextBase = cloneStep(updatedStep);
        setBase(nextBase);
        setDraft(draftFrom(nextBase));
        setEstimateDetached(false);
      }
      writeSessionInspectorDraft(null);
      onClose();
    } else setMessage(result.message);
  };

  return (
    <section
      className="step-block-inspector"
      aria-label={`${index + 1}번 동작 블록 편집`}
      style={{ wordBreak: 'keep-all', minWidth: 0 }}
    >
      <header
        className="step-inspector-top"
        data-testid="step-inspector-top-summary"
        style={{ wordBreak: 'keep-all' }}
      >
        <div
          className="step-inspector-top-kicker"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '6px',
          }}
        >
          <span
            className="pf-idea-step-pill is-active"
            data-testid="step-inspector-current-label"
          >
            현재 편집 중인 블록
          </span>
          <span
            className="pf-idea-step-pill"
            data-testid="step-inspector-quick-badge"
          >
            동작 블록 · {String(index + 1).padStart(2, '0')}
          </span>
          <span
            className="pf-idea-step-pill"
            data-testid="step-inspector-step-order-badge"
          >
            {index + 1}/{Math.max(store.activeSteps.length, index + 1)}단계
          </span>
          {dirty && (
            <span
              className="pf-idea-step-pill is-ready"
              data-testid="step-inspector-dirty-badge"
            >
              작성 중 메모·설정 보관됨
            </span>
          )}
        </div>
        <h2 style={{ wordBreak: 'keep-all', overflowWrap: 'break-word' }}>
          {exercise?.nameKo ?? '동작 자료 확인 필요'}
        </h2>
        <p style={{ wordBreak: 'keep-all', overflowWrap: 'break-word' }}>
          {equipment || '기구 확인 필요'}
        </p>
        <div className="step-inspector-badges" style={{ wordBreak: 'keep-all' }}>
          <span>
            {bindingStatus === 'matched'
              ? '도해 연결 · 교차 검증 완료'
              : bindingStatus === 'unbound'
                ? '모션 미연결'
                : '모션 연결 확인 필요'}
          </span>
          <span>
            {review === 'approved'
              ? '내 검토 기록 · 교차 검증 완료'
              : review === 'stale'
                ? '정보 변경 · 다시 검토 필요'
                : '교차 검증 완료 · 스튜디오 가이드'}
          </span>
          {step.locked && <span>잠금</span>}
        </div>
      </header>
      <div className="step-inspector-summary" style={{ wordBreak: 'keep-all' }}>
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
        {draftTimingStatus.edited && (
          <div
            className={`step-inspector-draft-timing${draftTimingStatus.valid ? '' : ' is-conflict'}`}
            data-testid="step-inspector-draft-timing"
          >
            {draftTimingStatus.valid ? (
              <p className="step-inspector-draft-timing-text">
                편집 중 시간 미리보기: 총 {formatSecondsToMMSS(draftTimingStatus.totalSec)} (수행{' '}
                {formatSecondsToMMSS(draftTimingStatus.movementSec)} · 티칭{' '}
                {draftTimingStatus.explanationSec}초 · 전환 {draftTimingStatus.transitionSec}초)
              </p>
            ) : (
              <div className="step-inspector-draft-timing-conflict">
                <p className="step-inspector-draft-timing-text">{draftTimingStatus.reason}</p>
                {!disabled && (
                  <button
                    type="button"
                    className="btn-secondary step-inspector-restore-timing-btn"
                    data-testid="step-inspector-restore-timing"
                    onClick={restoreTimingOnly}
                  >
                    시간만 원래 값으로 복구
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {exercise && (
        <div style={{ display: 'grid', gap: '8px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ApparatusIconBadge
              apparatus={exercise.apparatus}
              bodyPosition={exercise.bodyPosition}
              size="sm"
              showLabel
              decorative
            />
          </div>
          <ExerciseThumbnailBadge exercise={exercise} showPhaseStrip decorative />
          <StudioClinicalBriefCard exercise={exercise} compact />
        </div>
      )}
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
          <div
            className="step-inspector-time-fields"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))',
              gap: '10px',
            }}
          >
            <label className="form-field">
              <span>블록 총시간 · 분</span>
              <input
                type="number"
                min="0.5"
                max="20"
                step="any"
                aria-invalid={
                  draftTimingStatus.edited &&
                  !draftTimingStatus.valid &&
                  draftTimingStatus.invalidDuration
                    ? 'true'
                    : undefined
                }
                value={draft.duration}
                onChange={(event) =>
                  updateCalculatedTargetField({ duration: event.target.value })
                }
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
                aria-invalid={
                  draftTimingStatus.edited &&
                  !draftTimingStatus.valid &&
                  draftTimingStatus.invalidExplanation
                    ? 'true'
                    : undefined
                }
                value={draft.explanation}
                onChange={(event) =>
                  updateCalculatedTargetField({ explanation: event.target.value })
                }
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
                aria-invalid={
                  draftTimingStatus.edited &&
                  !draftTimingStatus.valid &&
                  draftTimingStatus.invalidTransition
                    ? 'true'
                    : undefined
                }
                value={draft.transition}
                onChange={(event) =>
                  updateCalculatedTargetField({ transition: event.target.value })
                }
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
          <div
            className="step-inspector-count-fields"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(118px, 1fr))',
              gap: '10px',
            }}
          >
            <label className="form-field">
              <span>강사가 정한 횟수</span>
              <input
                type="number"
                min="1"
                max="1000"
                step="1"
                placeholder="미지정"
                value={draft.count}
                onChange={(event) => updateCalculatedTargetField({ count: event.target.value })}
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
                onChange={(event) => updateCalculatedTargetField({ sets: event.target.value })}
              />
            </label>
          </div>
          <label className="form-field">
            <span>수행할 쪽</span>
            <select
              value={draft.side}
              onChange={(event) => updateCalculatedTargetField({ side: event.target.value })}
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
          {estimateDetached && !draft.timeEstimate && (
            <p
              className="step-inspector-estimate-detached"
              data-testid="step-inspector-estimate-detached"
            >
              상단 시간·횟수·좌우를 직접 수정해 이전 계산 가정 연결을 해제했습니다. 다시 계산해
              넣으려면 아래 시간 계산을 이용해 주세요.
            </p>
          )}
          <StepTimeEstimateEditor
            key={`${JSON.stringify(base)}:${calculatorResetKey}`}
            initial={draft.timeEstimate}
            repetitions={draft.count.trim() ? Number(draft.count) : undefined}
            sets={draft.sets.trim() ? Number(draft.sets) : undefined}
            sideMode={(draft.side || undefined) as StepSideMode | undefined}
            explanationSec={draft.explanation.trim() ? Number(draft.explanation) : undefined}
            transitionSec={draft.transition.trim() ? Number(draft.transition) : undefined}
            currentDurationMin={Number(draft.duration)}
            isUnilateralExercise={exercise?.isUnilateral}
            disabled={disabled}
            onUse={(estimate, durationMin) => {
              setEstimateDetached(false);
              setDraft({
                ...draft,
                timeEstimate: estimate,
                duration: String(durationMin),
                count: String(estimate.repetitions),
                sets: String(estimate.sets),
                side: resolveAppliedSideMode(
                  estimate.sides,
                  (draft.side || undefined) as StepSideMode | undefined,
                ),
                explanation: String(estimate.explanationSec),
                transition: String(estimate.transitionSec),
              });
            }}
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
                setEstimateDetached(false);
                setCalculatorResetKey((value) => value + 1);
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
        {dirty && !disabled && pendingChangedLabels.length > 0 && (
          <div
            className="step-inspector-pending-summary"
            data-testid="step-inspector-pending-summary"
          >
            <strong>적용 대기 항목 ({pendingChangedLabels.length}개):</strong>{' '}
            <span>{pendingChangedLabels.join(' · ')}</span>
            <small>‘변경 적용’을 눌러야 이 동작 블록에 한 번에 저장됩니다.</small>
          </div>
        )}
        <div
          className="step-inspector-footer"
          style={{ flexWrap: 'wrap', gap: '8px', wordBreak: 'keep-all' }}
        >
          <button
            type="button"
            className="text-button"
            disabled={disabled}
            onClick={onReplace}
            style={{ minHeight: '44px', wordBreak: 'keep-all' }}
          >
            <RefreshCw size={16} /> 동작 교체
          </button>
          <button
            type="button"
            className="btn-secondary"
            data-testid="step-inspector-reset-draft"
            disabled={!dirty || disabled}
            style={{ minHeight: '44px', wordBreak: 'keep-all' }}
            onClick={() => {
              writeSessionInspectorDraft(null);
              setDraft(draftFrom(base));
              setEstimateDetached(false);
              setCalculatorResetKey((value) => value + 1);
              setMessage('수정한 입력값을 적용 전 상태로 되돌렸습니다.');
            }}
          >
            입력 되돌리기
          </button>
          <button
            className="btn-primary"
            type="submit"
            disabled={disabled}
            style={{ flex: '1 1 132px', minHeight: '48px', wordBreak: 'keep-all' }}
          >
            변경 적용
          </button>
        </div>
      </form>
      <div
        className="step-inspector-inline-actions"
        style={{ flexWrap: 'wrap', gap: '8px', wordBreak: 'keep-all' }}
      >
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
