import { Fragment, lazy, Suspense, useMemo, useRef, useState, type DragEvent } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bookmark,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  GripVertical,
  LayoutTemplate,
  LockKeyhole,
  MoreHorizontal,
  Play,
  Plus,
  Search,
  Settings2,
  Trash2,
  Undo2,
  UnlockKeyhole,
  X,
} from 'lucide-react';
import { getActiveSequencePlanningCriteria, usePilatesStore } from '../store/usePilatesStore';
import { APPARATUS_LABELS, PROP_LABELS } from '../data/pilatesCatalog';
import { EQUIPMENT_OPTIONS, getExerciseEquipment } from '../data/equipmentCatalog';
import type {
  ApparatusType,
  AutoGenerateCriteria,
  PilatesExercise,
  SequenceStep,
  StepSideMode,
} from '../types/pilates';
import type { ClassSectionRole } from '../types/sequenceMotion';
import { matchesDiscoverySearch } from '../utils/discoverySearch';
import {
  exerciseMatchesCriteria,
  fitSequenceDuration,
  getStepSideLabels,
  getStepTiming,
  isRestStep,
} from '../utils/sequenceEngine';
import { getSequenceStepClassSection } from '../utils/sequenceMotionBinding';
import { buildSequenceSimulation } from '../utils/sequenceSimulation';
import {
  resolveSequenceInsertion,
  type SequenceInsertionPlacement,
} from '../utils/sequenceInsertion';
import { ExerciseMotionArtwork } from './ExerciseMotionArtwork';
import { LightDismissDialog } from './LightDismissDialog';
import '../styles/sequence-studio.css';

const AdvancedWorkbench = lazy(() =>
  import('./SequenceWorkbench').then((m) => ({ default: m.SequenceWorkbench })),
);
const PresetPicker = lazy(() =>
  import('./OfflinePresetPicker').then((m) => ({ default: m.OfflinePresetPicker })),
);

interface Props {
  onOpenYouTubePreview: (exercise: PilatesExercise) => void;
  onOpenIdeaSheet?: (exercise?: PilatesExercise | null) => void;
  onOpenClipper: () => void;
  onOpenLogModal: (sequenceId: string) => void;
  onOpenInventory: () => void;
  onStartClass: () => void;
  sourceDetailOpen?: boolean;
}

const LEVELS = { '1.0': '기초', '1.5': '중급', '2.0': '심화' } as const;
const SECTIONS: { id: ClassSectionRole; label: string }[] = [
  { id: 'preparation', label: '준비' },
  { id: 'main', label: '메인' },
  { id: 'cooldown', label: '마무리' },
];
const CATEGORY_FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'warmup', label: '준비' },
  { id: 'core', label: '코어' },
  { id: 'lower-body', label: '하체' },
  { id: 'upper-body', label: '상체' },
  { id: 'cooldown', label: '마무리' },
];
const minutes = (seconds: number) =>
  `${Math.floor(seconds / 60)}분${seconds % 60 ? ` ${Math.round(seconds % 60)}초` : ''}`;

/** Valid keystrokes persist immediately. Incomplete number/title input stays local. */
function PlanningInput({
  value,
  label,
  kind,
  onCommit,
  onInvalid,
}: {
  value: string;
  label: string;
  kind: 'title' | 'minutes';
  onCommit: (value: string) => boolean;
  onInvalid: () => void;
}) {
  const [draft, setDraft] = useState({ source: value, text: value, rejected: false });
  const text = draft.source === value ? draft.text : value;
  const rejected = draft.source === value && draft.rejected;
  const valid = (next: string) =>
    kind === 'title'
      ? Boolean(next.trim())
      : next.trim() !== '' &&
        Number.isInteger(Number(next)) &&
        Number(next) >= 10 &&
        Number(next) <= 120;
  return (
    <input
      aria-label={label}
      aria-invalid={rejected || undefined}
      value={text}
      type={kind === 'minutes' ? 'number' : 'text'}
      min={kind === 'minutes' ? 10 : undefined}
      max={kind === 'minutes' ? 120 : undefined}
      step={kind === 'minutes' ? 1 : undefined}
      maxLength={kind === 'title' ? 200 : undefined}
      onChange={(event) => {
        const next = event.target.value;
        const normalized = kind === 'minutes' ? String(Number(next)) : next;
        const complete = valid(next);
        const accepted = complete && onCommit(normalized);
        // Keep typing possible (10 may be on the way to 100). A store rejection
        // is marked invalid and is restored to the applied value on blur.
        setDraft({
          source: accepted ? normalized : value,
          text: next,
          rejected: complete && !accepted,
        });
      }}
      onBlur={() => {
        if (rejected) {
          setDraft({ source: value, text: value, rejected: false });
        } else if (!valid(text)) {
          setDraft({ source: value, text: value, rejected: false });
          onInvalid();
        } else if (kind === 'title' && text !== text.trim()) onCommit(text.trim());
      }}
    />
  );
}

function StepEditor({
  step,
  exercise,
  onClose,
  onNotice,
}: {
  step: SequenceStep;
  exercise?: PilatesExercise;
  onClose: () => void;
  onNotice: (message: string) => void;
}) {
  const [openedStep] = useState(step);
  const [duration, setDuration] = useState(String(step.durationMin));
  const [explanation, setExplanation] = useState(String(step.explanationSec ?? 0));
  const [transition, setTransition] = useState(String(step.transitionSec ?? 0));
  const [repetitions, setRepetitions] = useState(step.repetitions ? String(step.repetitions) : '');
  const [sideMode, setSideMode] = useState<StepSideMode | 'auto'>(step.sideMode ?? 'auto');
  const [section, setSection] = useState(getSequenceStepClassSection(step));
  const [note, setNote] = useState(step.instructorNote ?? '');
  const [error, setError] = useState('');
  const rest = isRestStep(step);
  const movementSeconds = Math.max(
    0,
    Math.round(Number(duration) * 60) - Number(explanation) - Number(transition),
  );
  return (
    <LightDismissDialog
      open
      onClose={onClose}
      title={rest ? '휴식 시간' : (exercise?.nameKo ?? '동작 편집')}
      subtitle="시간과 수업 메모를 한곳에서 조정하세요."
      maxWidth="600px"
      variant="sheet"
    >
      <form
        className="flow-step-editor"
        onSubmit={(event) => {
          event.preventDefault();
          const state = usePilatesStore.getState();
          const index = state.activeSteps.findIndex((item) => item.stepId === step.stepId);
          if (index < 0 || state.activeSteps[index] !== openedStep) {
            setError('이 동작이 다른 곳에서 변경되었습니다. 닫은 뒤 다시 열어 주세요.');
            return;
          }
          const result = rest
            ? state.setRestDuration(index, Number(duration))
            : state.setStepBlockOptions(
                index,
                {
                  durationMin: Number(duration),
                  explanationSec: Number(explanation),
                  transitionSec: Number(transition),
                  repetitions: repetitions.trim() ? Number(repetitions) : undefined,
                  sideMode: sideMode === 'auto' ? undefined : sideMode,
                  classSection: section,
                  instructorNote: note,
                },
                openedStep,
              );
          if (!result.success) {
            setError(result.message);
            return;
          }
          onNotice(result.message);
          onClose();
        }}
      >
        {exercise && (
          <ExerciseMotionArtwork exercise={exercise} className="flow-step-editor__art" />
        )}
        <label className="flow-field">
          전체 시간 · 분
          <input
            aria-label="동작 전체 시간"
            type="number"
            min={rest ? 0.1 : 0.5}
            max={rest ? 120 : 20}
            step="any"
            required
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </label>
        {!rest && (
          <>
            <p className="flow-hint">양쪽 수행, 설명, 기구 전환을 모두 포함한 시간입니다.</p>
            <div className="flow-form-grid">
              <label className="flow-field">
                설명 · 초
                <input
                  type="number"
                  min="0"
                  max="1200"
                  required
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                />
              </label>
              <label className="flow-field">
                다음 동작 준비 · 초
                <input
                  type="number"
                  min="0"
                  max="1200"
                  required
                  value={transition}
                  onChange={(e) => setTransition(e.target.value)}
                />
              </label>
            </div>
            <p className="flow-time-equation">
              실제 동작 {minutes(movementSeconds)} + 설명 {explanation || 0}초 + 전환{' '}
              {transition || 0}초
            </p>
            <div className="flow-form-grid">
              <label className="flow-field">
                횟수 · 선택
                <input
                  type="number"
                  min="1"
                  max="1000"
                  placeholder="미지정"
                  value={repetitions}
                  onChange={(e) => setRepetitions(e.target.value)}
                />
              </label>
              <label className="flow-field">
                좌우 수행
                <select
                  value={sideMode}
                  onChange={(e) => setSideMode(e.target.value as typeof sideMode)}
                >
                  <option value="auto">
                    {exercise?.isUnilateral ? '양쪽 · 순서 미지정' : '기본 · 좌우 미지정'}
                  </option>
                  <option value="together">양쪽 함께</option>
                  <option value="left-then-right">왼쪽 → 오른쪽</option>
                  <option value="right-then-left">오른쪽 → 왼쪽</option>
                  <option value="left">왼쪽만</option>
                  <option value="right">오른쪽만</option>
                </select>
              </label>
            </div>
            <label className="flow-field">
              수업 구간
              <select
                value={section}
                onChange={(e) => setSection(e.target.value as ClassSectionRole)}
              >
                {SECTIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flow-field">
              수업 메모
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="회원에게 전달할 큐, 변형, 준비물"
              />
            </label>
          </>
        )}
        {error && (
          <p role="alert" className="flow-error">
            {error}
          </p>
        )}
        <div className="flow-dialog-actions">
          <button type="button" className="flow-button" onClick={onClose}>
            취소
          </button>
          <button className="flow-button flow-button--primary" type="submit">
            변경 적용
          </button>
        </div>
      </form>
    </LightDismissDialog>
  );
}

/** A single persistent canvas. Advanced authoring tools share the same store and remain optional. */
export function SequenceStudioWorkbench(props: Props) {
  const s = usePilatesStore();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [eligibleOnly, setEligibleOnly] = useState(true);
  const [mobilePane, setMobilePane] = useState<'library' | 'plan'>('plan');
  const [notice, setNotice] = useState('');
  const [insertion, setInsertion] = useState<{
    sequenceId: string;
    placement: SequenceInsertionPlacement;
  }>({
    sequenceId: s.activeSequenceId,
    placement: { kind: 'end' },
  });
  const [recentAddition, setRecentAddition] = useState<{
    sequenceId: string;
    stepId: string;
  } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [conditionsOpen, setConditionsOpen] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [newClassOpen, setNewClassOpen] = useState(false);
  const [fitPreview, setFitPreview] = useState<{
    steps: SequenceStep[];
    target: number;
    fitted: SequenceStep[];
  } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const planHeadingRef = useRef<HTMLHeadingElement>(null);
  const toolsSummaryRef = useRef<HTMLElement>(null);
  const advancedReturnRef = useRef<HTMLButtonElement>(null);
  const dragStep = useRef<string | null>(null);
  // Share the insertion policy. Unapplied advanced-generator drafts must not
  // replace the conditions of the class currently being edited.
  const criteria = getActiveSequencePlanningCriteria(s);
  const byId = useMemo(
    () => new Map(s.exercises.map((exercise) => [exercise.id, exercise])),
    [s.exercises],
  );
  const included = useMemo(
    () => new Set(s.activeSteps.map((step) => step.exerciseId)),
    [s.activeSteps],
  );
  const placement: SequenceInsertionPlacement =
    insertion.sequenceId === s.activeSequenceId ? insertion.placement : { kind: 'end' };
  const insertionResolution = resolveSequenceInsertion(s.activeSteps, placement);
  const insertionValue = placement.kind === 'step' ? `step:${placement.stepId}` : placement.kind;
  const insertionOptions: {
    value: string;
    label: string;
    placement: SequenceInsertionPlacement;
  }[] = [
    { value: 'end', label: '시퀀스 맨 뒤', placement: { kind: 'end' } },
    { value: 'start', label: '시퀀스 맨 앞', placement: { kind: 'start' } },
    ...s.activeSteps.map((step, index) => ({
      value: `step:${step.stepId}`,
      label: `${index + 1}번 ${isRestStep(step) ? '휴식' : (byId.get(step.exerciseId)?.nameKo ?? '동작')} 뒤`,
      placement: { kind: 'step' as const, stepId: step.stepId },
    })),
  ];
  const recentIndex =
    recentAddition && recentAddition.sequenceId === s.activeSequenceId
      ? s.activeSteps.findIndex((step) => step.stepId === recentAddition.stepId)
      : -1;
  const recentStep = recentIndex >= 0 ? s.activeSteps[recentIndex] : undefined;
  const recentName = recentStep ? (byId.get(recentStep.exerciseId)?.nameKo ?? '동작') : '';
  const simulation = useMemo(
    () => buildSequenceSimulation(s.activeSteps, s.exercises, s.activeTargetMinutes),
    [s.activeSteps, s.exercises, s.activeTargetMinutes],
  );
  const sectionTotals = useMemo(
    () =>
      Object.fromEntries(
        SECTIONS.map(({ id }) => [
          id,
          s.activeSteps
            .filter((step) => getSequenceStepClassSection(step, s.activeSteps) === id)
            .reduce((sum, step) => sum + getStepTiming(step).totalSec, 0),
        ]),
      ) as Record<ClassSectionRole, number>,
    [s.activeSteps],
  );
  const eligible = (exercise: PilatesExercise) => {
    const needs = getExerciseEquipment(exercise);
    return (
      exerciseMatchesCriteria(exercise, criteria) &&
      needs.requiredEquipment.every((id) => s.ownedEquipment.includes(id)) &&
      needs.requiredProps.every((prop) => s.ownedProps.includes(prop))
    );
  };
  const results = s.exercises.filter(
    (exercise) =>
      (criteria.apparatus === 'mixed' || exercise.apparatus === criteria.apparatus) &&
      (category === 'all' ||
        exercise.blockCategory === category ||
        (category === 'lower-body' &&
          ['footwork', 'bridging', 'feet-in-straps'].includes(exercise.blockCategory))) &&
      (!eligibleOnly || eligible(exercise)) &&
      matchesDiscoverySearch(
        [
          exercise.nameKo,
          exercise.nameEn,
          ...exercise.targetMuscles,
          APPARATUS_LABELS[exercise.apparatus].ko,
        ],
        query,
      ),
  );
  const editingStep = s.activeSteps.find((step) => step.stepId === editingId);
  const total = simulation.totals.totalSec;
  const target = s.activeTargetMinutes * 60;
  const difference = target - total;
  const exerciseCount = s.activeSteps.filter((step) => !isRestStep(step)).length;
  const startBlockers =
    s.activeSteps.length && !simulation.gate.canRehearse
      ? simulation.gate.reasons.filter(
          (reason) => reason.code !== 'target-mismatch' && reason.code !== 'duplicate-movement',
        )
      : [];

  const updateConditions = (patch: Partial<AutoGenerateCriteria>) => {
    const result = usePilatesStore.getState().updateSequencePlanningConditions(patch);
    setNotice(result.message);
  };
  const addExercise = (exercise: PilatesExercise, override?: SequenceInsertionPlacement) => {
    const result = usePilatesStore
      .getState()
      .insertExerciseIntoSequence(exercise.id, override ?? placement);
    setNotice(result.message);
    if (result.success && result.stepId) {
      setRecentAddition({ sequenceId: s.activeSequenceId, stepId: result.stepId });
      if (!override && placement.kind !== 'end') {
        setInsertion({
          sequenceId: s.activeSequenceId,
          placement: { kind: 'step', stepId: result.stepId },
        });
      }
    }
  };
  const revealStep = (stepId: string) => {
    setMobilePane('plan');
    requestAnimationFrame(() => {
      const title = document.getElementById(`flow-step-${stepId}`);
      title?.closest('article')?.scrollIntoView?.({ behavior: 'instant', block: 'nearest' });
      const focusTarget = title?.matches(':disabled')
        ? title.closest('article')?.querySelector<HTMLElement>('button:not(:disabled)')
        : title;
      (focusTarget ?? planHeadingRef.current)?.focus({ preventScroll: true });
    });
  };
  const showLibrary = () => {
    setMobilePane('library');
    requestAnimationFrame(() => {
      searchRef.current?.scrollIntoView?.({ behavior: 'instant', block: 'nearest' });
      searchRef.current?.focus({ preventScroll: true });
    });
  };
  const save = async () => {
    const state = usePilatesStore.getState();
    if (!state.activeSteps.some((step) => !isRestStep(step))) {
      setNotice('동작을 추가한 뒤 저장해 주세요.');
      return false;
    }
    state.saveCurrentSequenceToBinder();
    await Promise.resolve();
    const next = usePilatesStore.getState();
    setNotice(next.persistenceError ?? '저장한 수업에 보관했습니다.');
    return !next.persistenceError;
  };
  const start = () => {
    const state = usePilatesStore.getState();
    const check = buildSequenceSimulation(
      state.activeSteps,
      state.exercises,
      state.activeTargetMinutes,
    );
    if (!check.gate.canRehearse) {
      setNotice(check.gate.reasons.map((reason) => reason.message).join(' '));
      return;
    }
    props.onStartClass();
  };
  const drop = (event: DragEvent, targetStepId?: string) => {
    event.preventDefault();
    event.stopPropagation();
    const stepId = event.dataTransfer.getData('application/x-pilates-step') || dragStep.current;
    if (stepId) {
      const targetId = targetStepId ?? usePilatesStore.getState().activeSteps.at(-1)?.stepId;
      if (targetId && targetId !== stepId) {
        const moved = usePilatesStore.getState().reorderStep(stepId, targetId);
        setNotice(moved ? '동작 순서를 변경했습니다.' : '잠긴 동작의 위치는 바꿀 수 없습니다.');
      }
    } else {
      const exercise = byId.get(event.dataTransfer.getData('application/x-pilates-exercise'));
      if (exercise)
        addExercise(
          exercise,
          targetStepId ? { kind: 'step', stepId: targetStepId } : { kind: 'end' },
        );
    }
    dragStep.current = null;
  };

  if (advanced)
    return (
      <section className="flow-advanced-workbench">
        <button
          ref={advancedReturnRef}
          className="flow-button"
          onClick={() => {
            setAdvanced(false);
            requestAnimationFrame(() => toolsSummaryRef.current?.focus());
          }}
        >
          <ArrowLeft size={17} /> 간편 작성으로 돌아가기
        </button>
        <Suspense fallback={<p role="status">고급 작성 도구를 여는 중…</p>}>
          <AdvancedWorkbench {...props} />
        </Suspense>
      </section>
    );

  return (
    <section className="flow-studio" data-testid="sequence-studio" data-mobile-pane={mobilePane}>
      <header className="flow-studio__heading">
        <div>
          <p className="flow-eyebrow">CLASS PLANNER</p>
          <h1 id="workspace-main-heading" tabIndex={-1}>
            수업 만들기
          </h1>
          <p>동작을 고르고, 나만의 흐름을 완성하세요.</p>
        </div>
        <div className="flow-heading-actions">
          <button className="flow-button" onClick={() => setPresetsOpen(true)}>
            <LayoutTemplate size={17} /> 템플릿
          </button>
          <button
            className="flow-button"
            onClick={() =>
              s.activeSteps.length
                ? setNewClassOpen(true)
                : setNotice(s.startBlankSequence().message)
            }
          >
            <Plus size={17} /> 새 수업
          </button>
          <details
            className="flow-tools"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                event.currentTarget.open = false;
                event.currentTarget.querySelector('summary')?.focus();
              }
            }}
          >
            <summary ref={toolsSummaryRef} aria-label="수업 작성 도구 더보기">
              <MoreHorizontal size={21} />
            </summary>
            <div>
              <button
                onClick={() => {
                  setAdvanced(true);
                  requestAnimationFrame(() => advancedReturnRef.current?.focus());
                }}
              >
                자동 구성 · 고급 편집
              </button>
              <button onClick={props.onOpenClipper}>영상에서 동작 가져오기</button>
              <button onClick={() => props.onOpenIdeaSheet?.()}>내 동작 만들기</button>
              <button onClick={props.onOpenInventory}>기구 · 소도구 관리</button>
            </div>
          </details>
        </div>
      </header>

      <div className="flow-class-brief">
        <label className="flow-field flow-class-title">
          수업 이름
          <PlanningInput
            key={`title-${s.activeSequenceId}`}
            label="수업 이름"
            kind="title"
            value={s.activeTitle}
            onCommit={(title) => {
              if (title !== s.activeTitle) s.setActiveSequenceMeta({ title });
              return usePilatesStore.getState().activeTitle === title;
            }}
            onInvalid={() => setNotice('수업 이름을 비워 둘 수 없어 이전 이름을 유지했습니다.')}
          />
        </label>
        <label className="flow-field">
          기구
          <select
            aria-label="수업 기구"
            value={criteria.apparatus}
            onChange={(e) =>
              updateConditions({ apparatus: e.target.value as ApparatusType | 'mixed' })
            }
          >
            {(Object.keys(APPARATUS_LABELS) as ApparatusType[]).map((id) => (
              <option key={id} value={id}>
                {APPARATUS_LABELS[id].short}
              </option>
            ))}
            <option value="mixed">여러 기구</option>
          </select>
        </label>
        <label className="flow-field">
          최대 난이도
          <select
            aria-label="수업 최대 난이도"
            value={criteria.level}
            onChange={(e) =>
              updateConditions({ level: e.target.value as AutoGenerateCriteria['level'] })
            }
          >
            {Object.entries(LEVELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flow-field">
          목표 · 분
          <PlanningInput
            key={`minutes-${s.activeSequenceId}`}
            label="수업 목표 시간"
            kind="minutes"
            value={String(s.activeTargetMinutes)}
            onCommit={(value) => {
              const result = s.updateSequencePlanningConditions({ targetMinutes: Number(value) });
              setNotice(result.success ? '' : result.message);
              return result.success;
            }}
            onInvalid={() => setNotice('목표 시간은 10–120분 사이 정수로 입력해 주세요.')}
          />
        </label>
        <button
          className="flow-button flow-condition-button"
          onClick={() => setConditionsOpen(true)}
        >
          <Settings2 size={17} />
          <span>수업 조건</span>
        </button>
      </div>

      <div className="flow-mobile-panes" role="group" aria-label="작성 화면 선택">
        <button aria-pressed={mobilePane === 'plan'} onClick={() => setMobilePane('plan')}>
          내 시퀀스 <span>{exerciseCount}</span>
        </button>
        <button aria-pressed={mobilePane === 'library'} onClick={showLibrary}>
          <Plus size={17} /> 동작 찾기
        </button>
      </div>

      <div className="flow-studio-grid">
        <aside className="flow-picker" aria-label="수업에 추가할 동작">
          <div className="flow-panel-heading">
            <div>
              <span className="flow-step-number">01</span>
              <h2>
                {criteria.apparatus === 'mixed'
                  ? '동작 찾기'
                  : `${APPARATUS_LABELS[criteria.apparatus].short} 동작`}
              </h2>
            </div>
            <span className="flow-count">{results.length}개</span>
          </div>
          <label className="flow-search">
            <Search size={18} aria-hidden="true" />
            <input
              ref={searchRef}
              aria-label="수업 동작 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="이름, 영어명, 근육 검색"
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="동작 검색 지우기">
                <X size={16} />
              </button>
            )}
          </label>
          <div className="flow-chips" aria-label="동작 부위와 구간">
            {CATEGORY_FILTERS.map((item) => (
              <button
                key={item.id}
                aria-pressed={category === item.id}
                onClick={() => setCategory(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="flow-checkbox">
            <input
              type="checkbox"
              checked={eligibleOnly}
              onChange={(e) => setEligibleOnly(e.target.checked)}
            />{' '}
            수업 조건에 맞는 동작만
          </label>
          <div className="flow-insertion-control">
            <label htmlFor="flow-insertion-position">추가 위치</label>
            <select
              id="flow-insertion-position"
              value={insertionValue}
              aria-describedby={!insertionResolution.success ? 'flow-insertion-error' : undefined}
              onChange={(event) => {
                const selected = insertionOptions.find(
                  (option) => option.value === event.target.value,
                );
                if (selected)
                  setInsertion({ sequenceId: s.activeSequenceId, placement: selected.placement });
              }}
            >
              {!insertionOptions.some((option) => option.value === insertionValue) && (
                <option value={insertionValue} disabled>
                  기준 항목 없음 · 위치를 다시 선택하세요
                </option>
              )}
              {insertionOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={!resolveSequenceInsertion(s.activeSteps, option.placement).success}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {!insertionResolution.success && (
            <p id="flow-insertion-error" className="flow-insertion-error" role="alert">
              {insertionResolution.message}
            </p>
          )}
          {recentStep && (
            <div className="flow-added-receipt" aria-live="polite">
              <span>
                <Check size={16} aria-hidden="true" /> {recentIndex + 1}번 · {recentName} 추가됨
              </span>
              <button type="button" onClick={() => revealStep(recentStep.stepId)}>
                시퀀스에서 보기
              </button>
            </div>
          )}
          <div className="flow-picker-list">
            {results.length ? (
              results.map((exercise) => (
                <article
                  className={`flow-pick-card ${included.has(exercise.id) ? 'is-added' : ''}`}
                  key={exercise.id}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData('application/x-pilates-exercise', exercise.id);
                    event.dataTransfer.effectAllowed = 'copy';
                  }}
                >
                  <button
                    className="flow-pick-card__preview"
                    onClick={() => props.onOpenYouTubePreview(exercise)}
                    aria-label={`${exercise.nameKo} 자세와 자료 보기`}
                  >
                    <ExerciseMotionArtwork exercise={exercise} />
                  </button>
                  <div className="flow-pick-card__info">
                    <button
                      className="flow-name-button"
                      onClick={() => props.onOpenYouTubePreview(exercise)}
                    >
                      {exercise.nameKo}
                    </button>
                    <span>
                      {LEVELS[exercise.level]} · {exercise.defaultDurationMin}분
                      {exercise.isUnilateral ? ' · 양쪽' : ''}
                    </span>
                    {!eligible(exercise) && <small>기구·소도구·난이도 조건 확인</small>}
                  </div>
                  <button
                    className="flow-add-button"
                    aria-label={`${exercise.nameKo} ${included.has(exercise.id) ? '추가됨' : '추가'}`}
                    disabled={included.has(exercise.id) || !insertionResolution.success}
                    aria-describedby={
                      !insertionResolution.success ? 'flow-insertion-error' : undefined
                    }
                    onClick={() => addExercise(exercise)}
                  >
                    {included.has(exercise.id) ? <Check size={19} /> : <Plus size={19} />}
                  </button>
                </article>
              ))
            ) : (
              <div className="flow-no-results">
                <Search size={26} />
                <strong>조건에 맞는 동작이 없어요</strong>
                <p>검색어를 줄이거나 수업 조건을 확인해 주세요.</p>
                <button
                  className="flow-button"
                  onClick={() => {
                    setQuery('');
                    setCategory('all');
                    setEligibleOnly(false);
                  }}
                >
                  검색 범위 넓히기
                </button>
                <button className="flow-text-button" onClick={() => setConditionsOpen(true)}>
                  기구·소도구 조건 보기
                </button>
              </div>
            )}
          </div>
        </aside>

        <div className="flow-plan" aria-label="내 수업 시퀀스">
          <div className="flow-panel-heading">
            <div>
              <span className="flow-step-number">02</span>
              <h2 ref={planHeadingRef} tabIndex={-1}>
                내 시퀀스
              </h2>
              <span className="flow-count">동작 {exerciseCount}개</span>
            </div>
            <button
              className="flow-icon-button"
              disabled={!s.undoStack.length}
              onClick={() => {
                s.undoSequence();
                setNotice('마지막 편집을 되돌렸습니다.');
              }}
              aria-label="마지막 편집 되돌리기"
            >
              <Undo2 size={19} />
            </button>
          </div>
          <div className="flow-time-overview">
            <div>
              <strong>{minutes(total)}</strong>
              <span> / 목표 {s.activeTargetMinutes}분</span>
              <button
                className="flow-text-button"
                disabled={!exerciseCount}
                onClick={() => {
                  try {
                    setFitPreview({
                      steps: s.activeSteps,
                      target: s.activeTargetMinutes,
                      fitted: fitSequenceDuration(s.activeSteps, s.activeTargetMinutes),
                    });
                  } catch (error) {
                    setNotice(error instanceof Error ? error.message : '시간을 맞출 수 없습니다.');
                  }
                }}
              >
                시간 맞추기
              </button>
            </div>
            <div
              className="flow-time-bar"
              role="img"
              aria-label={`현재 ${minutes(total)}, 목표 ${s.activeTargetMinutes}분`}
            >
              {SECTIONS.map((section) => (
                <span
                  key={section.id}
                  data-section={section.id}
                  style={{
                    width: `${target ? Math.min(100, (sectionTotals[section.id] / Math.max(total, target)) * 100) : 0}%`,
                  }}
                />
              ))}
            </div>
            <div className="flow-section-legend">
              {SECTIONS.map((section) => (
                <span key={section.id} data-section={section.id}>
                  <i />
                  {section.label} <b>{minutes(sectionTotals[section.id])}</b>
                </span>
              ))}
            </div>
            <p>
              {!total
                ? '동작을 추가하면 수업 시간이 채워집니다.'
                : difference > 0
                  ? `목표까지 ${minutes(difference)} 남았어요.`
                  : difference < 0
                    ? `목표보다 ${minutes(-difference)} 길어요. 시간을 조정하거나 그대로 진행할 수 있어요.`
                    : '목표 시간에 맞게 구성했어요.'}
            </p>
          </div>
          <div
            className="flow-sequence-list"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => drop(e)}
          >
            {!s.activeSteps.length ? (
              <div className="flow-empty-plan">
                <span className="flow-empty-icon">
                  <Plus size={30} strokeWidth={1.5} />
                </span>
                <h3>첫 동작부터 시작해 볼까요?</h3>
                <p>
                  동작 목록에서 원하는 동작을 추가하세요.
                  <br />
                  추가한 동작은 끌어서 순서를 바꿀 수 있어요.
                </p>
                <button className="flow-button flow-button--primary" onClick={showLibrary}>
                  <Plus size={17} /> 동작 고르기
                </button>
                <button className="flow-text-button" onClick={() => setPresetsOpen(true)}>
                  <LayoutTemplate size={16} /> 템플릿으로 시작하기 <ChevronRight size={15} />
                </button>
                {s.savedSequences.length > 0 && (
                  <div className="flow-recent-plans">
                    <span>최근 수업에서 이어가기</span>
                    {s.savedSequences.slice(0, 2).map((sequence) => (
                      <button
                        key={sequence.id}
                        onClick={() => {
                          const current = usePilatesStore.getState();
                          const result = current.openSavedSequenceCopy(sequence.id, current);
                          setNotice(result.message);
                        }}
                      >
                        <Copy size={15} />
                        <strong>{sequence.title}</strong>
                        <small>{sequence.targetMinutes}분</small>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              s.activeSteps.map((step, index) => {
                const exercise = byId.get(step.exerciseId);
                const section = getSequenceStepClassSection(step, s.activeSteps);
                const previousSection = index
                  ? getSequenceStepClassSection(s.activeSteps[index - 1], s.activeSteps)
                  : null;
                const title = isRestStep(step)
                  ? '휴식'
                  : (exercise?.nameKo ?? '동작을 찾을 수 없음');
                const previousExercise = index
                  ? byId.get(s.activeSteps[index - 1].exerciseId)
                  : undefined;
                const springChanged =
                  exercise &&
                  previousExercise &&
                  !isRestStep(step) &&
                  (step.customSpringOverride ?? exercise.springs) !==
                    (s.activeSteps[index - 1].customSpringOverride ?? previousExercise.springs);
                return (
                  <Fragment key={step.stepId}>
                    {section !== previousSection && (
                      <div className="flow-section-heading" data-section={section}>
                        <i />
                        <h3>{SECTIONS.find((item) => item.id === section)?.label}</h3>
                        <span>{minutes(sectionTotals[section])}</span>
                      </div>
                    )}
                    <article
                      className={`flow-sequence-row ${step.locked ? 'is-locked' : ''} ${recentStep?.stepId === step.stepId ? 'is-recently-added' : ''}`}
                      data-testid="sequence-studio-row"
                      data-step-id={step.stepId}
                      draggable={!step.locked}
                      onDragStart={(event) => {
                        dragStep.current = step.stepId;
                        event.dataTransfer.setData('application/x-pilates-step', step.stepId);
                        event.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragEnd={() => {
                        dragStep.current = null;
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => drop(e, step.stepId)}
                    >
                      <span className="flow-drag-handle" aria-hidden="true">
                        <GripVertical size={16} />
                      </span>
                      <span className="flow-row-number">{index + 1}</span>
                      {exercise ? (
                        <button
                          className="flow-row-art"
                          aria-label={`${title} 자세와 자료 보기`}
                          onClick={() => props.onOpenYouTubePreview(exercise)}
                        >
                          <ExerciseMotionArtwork exercise={exercise} />
                        </button>
                      ) : (
                        <span className="flow-row-rest">
                          <Clock3 size={24} />
                        </span>
                      )}
                      <div className="flow-row-content">
                        <button
                          id={`flow-step-${step.stepId}`}
                          className="flow-name-button"
                          disabled={step.locked}
                          onClick={() => setEditingId(step.stepId)}
                        >
                          {title}
                        </button>
                        <div className="flow-row-meta">
                          {exercise && <span>{APPARATUS_LABELS[exercise.apparatus].short}</span>}
                          {getStepSideLabels(step, exercise).length > 1 && <span>양쪽 수행</span>}
                          {step.repetitions && <span>{step.repetitions}회</span>}
                          {step.locked && (
                            <span>
                              <LockKeyhole size={12} /> 잠김
                            </span>
                          )}
                        </div>
                        {springChanged && (
                          <span className="flow-setup-change">
                            스프링 변경 · {step.customSpringOverride ?? exercise.springs}
                          </span>
                        )}
                        {step.instructorNote && (
                          <p className="flow-row-note">{step.instructorNote}</p>
                        )}
                      </div>
                      <button
                        className="flow-row-time"
                        disabled={step.locked}
                        onClick={() => setEditingId(step.stepId)}
                        aria-label={`${title} 시간과 메모 편집`}
                      >
                        <Clock3 size={14} />
                        {minutes(getStepTiming(step).totalSec)}
                      </button>
                      <div className="flow-row-actions">
                        <button
                          className="flow-icon-button"
                          aria-label={`${index + 1}번 ${title} 위로`}
                          disabled={index === 0 || step.locked || s.activeSteps[index - 1]?.locked}
                          onClick={() => {
                            s.moveStep(index, 'up');
                            setNotice(`${title}을 위로 이동했습니다.`);
                          }}
                        >
                          <ArrowUp size={16} />
                        </button>
                        <button
                          className="flow-icon-button"
                          aria-label={`${index + 1}번 ${title} 아래로`}
                          disabled={
                            index === s.activeSteps.length - 1 ||
                            step.locked ||
                            s.activeSteps[index + 1]?.locked
                          }
                          onClick={() => {
                            s.moveStep(index, 'down');
                            setNotice(`${title}을 아래로 이동했습니다.`);
                          }}
                        >
                          <ArrowDown size={16} />
                        </button>
                        <button
                          className="flow-icon-button"
                          aria-label={`${title} ${step.locked ? '잠금 해제' : '잠그기'}`}
                          onClick={() => s.toggleStepLock(index)}
                        >
                          {step.locked ? <UnlockKeyhole size={16} /> : <LockKeyhole size={16} />}
                        </button>
                        <button
                          className="flow-icon-button"
                          aria-label={`${index + 1}번 ${title} 삭제`}
                          disabled={step.locked}
                          onClick={() => {
                            const nextId =
                              s.activeSteps[index + 1]?.stepId ?? s.activeSteps[index - 1]?.stepId;
                            s.removeStep(index);
                            setNotice(`${title}을 삭제했습니다. 되돌리기로 복원할 수 있어요.`);
                            requestAnimationFrame(() => {
                              const titleButton = nextId
                                ? document.getElementById(`flow-step-${nextId}`)
                                : null;
                              const focusTarget = titleButton?.matches(':disabled')
                                ? titleButton
                                    .closest('article')
                                    ?.querySelector<HTMLElement>('button:not(:disabled)')
                                : titleButton;
                              (focusTarget ?? planHeadingRef.current)?.focus();
                            });
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </article>
                  </Fragment>
                );
              })
            )}
          </div>
          {s.activeSteps.length > 0 && (
            <div className="flow-plan-additions">
              <button className="flow-button" onClick={showLibrary}>
                <Plus size={16} /> 동작 추가
              </button>
              <button
                className="flow-text-button"
                onClick={() => setNotice(s.addRestStep(1).message)}
              >
                <Clock3 size={15} /> 휴식 1분 추가
              </button>
            </div>
          )}
          <div className="flow-plan-footer">
            <span>
              <i />
              {s.persistenceError
                ? '기기 저장을 확인해 주세요'
                : '작성 중인 수업은 이 기기에 자동 보관'}
            </span>
            <span>끌어서 순서 변경 · 버튼으로도 이동 가능</span>
          </div>
        </div>
      </div>

      <div className="flow-studio-status" role="status" aria-live="polite">
        {notice || s.persistenceError || ''}
      </div>
      <div className="flow-actionbar">
        <div>
          <strong>
            {exerciseCount}개 동작 · {minutes(total)}
          </strong>
          {startBlockers.length ? (
            <ul
              id="sequence-studio-start-blockers"
              className="flow-start-blockers"
              aria-label="수업 시작 전 확인"
            >
              {startBlockers.map((reason) => (
                <li key={reason.code}>
                  {reason.stepIndices.length > 0 && (
                    <span>{reason.stepIndices.map((index) => index + 1).join(', ')}번 항목 · </span>
                  )}
                  {reason.message}
                </li>
              ))}
            </ul>
          ) : (
            <small>
              {s.saveFeedback && !s.persistenceError
                ? s.saveFeedback
                : '시퀀스를 저장하고 수업을 시작하세요.'}
            </small>
          )}
        </div>
        <button
          className="flow-button"
          disabled={!exerciseCount}
          onClick={() => {
            void save();
          }}
        >
          <Bookmark size={17} /> 저장
        </button>
        <button
          className="flow-button flow-button--primary"
          disabled={!simulation.gate.canRehearse}
          aria-describedby={startBlockers.length ? 'sequence-studio-start-blockers' : undefined}
          onClick={start}
        >
          <Play size={17} fill="currentColor" /> 수업 시작
        </button>
      </div>

      {editingStep && (
        <StepEditor
          key={editingStep.stepId}
          step={editingStep}
          exercise={byId.get(editingStep.exerciseId)}
          onClose={() => setEditingId(null)}
          onNotice={setNotice}
        />
      )}
      {presetsOpen && (
        <LightDismissDialog
          open
          onClose={() => setPresetsOpen(false)}
          title="템플릿으로 시작"
          subtitle="수업 전체 또는 필요한 구간을 골라 수정할 수 있어요."
          maxWidth="1080px"
        >
          <Suspense fallback={<p role="status">템플릿을 불러오는 중…</p>}>
            <PresetPicker
              onApplied={(message) => {
                setNotice(message);
                setPresetsOpen(false);
                setMobilePane('plan');
              }}
            />
          </Suspense>
        </LightDismissDialog>
      )}
      {conditionsOpen && (
        <LightDismissDialog
          open
          onClose={() => setConditionsOpen(false)}
          title="수업 조건"
          subtitle="기구와 소도구를 선택하면 추가할 수 있는 동작에 반영됩니다."
          maxWidth="600px"
          variant="sheet"
        >
          <div className="flow-conditions">
            <fieldset>
              <legend>이 수업에서 사용할 기구</legend>
              <div className="flow-choice-grid">
                {EQUIPMENT_OPTIONS.filter(
                  (item) =>
                    criteria.apparatus === 'mixed' || item.apparatusFamily === criteria.apparatus,
                ).map((item) => (
                  <label key={item.id} className="flow-checkbox">
                    <input
                      type="checkbox"
                      disabled={!s.ownedEquipment.includes(item.id)}
                      checked={criteria.availableEquipment?.includes(item.id) ?? false}
                      onChange={() =>
                        updateConditions({
                          availableEquipment: criteria.availableEquipment?.includes(item.id)
                            ? criteria.availableEquipment.filter((id) => id !== item.id)
                            : [...(criteria.availableEquipment ?? []), item.id],
                        })
                      }
                    />
                    {item.labelKo}
                    {!s.ownedEquipment.includes(item.id) ? ' · 미보유' : ''}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>소도구 · 여러 개 선택 가능</legend>
              <div className="flow-choice-grid">
                {s.ownedProps
                  .filter((prop) => prop !== 'none')
                  .map((prop) => (
                    <label key={prop} className="flow-checkbox">
                      <input
                        type="checkbox"
                        checked={criteria.preferredProps.includes(prop)}
                        onChange={() =>
                          updateConditions({
                            preferredProps: criteria.preferredProps.includes(prop)
                              ? criteria.preferredProps.filter((id) => id !== prop)
                              : [...criteria.preferredProps, prop],
                          })
                        }
                      />
                      {PROP_LABELS[prop].ko}
                    </label>
                  ))}
              </div>
            </fieldset>
            <p className="flow-hint">기존에 담은 동작은 조건을 바꿔도 유지됩니다.</p>
            <button
              className="flow-text-button"
              onClick={() => {
                setConditionsOpen(false);
                props.onOpenInventory();
              }}
            >
              보유 기구·소도구 수정
            </button>
            <div className="flow-dialog-actions">
              <button
                className="flow-button flow-button--primary"
                onClick={() => setConditionsOpen(false)}
              >
                완료
              </button>
            </div>
          </div>
        </LightDismissDialog>
      )}
      {newClassOpen && (
        <LightDismissDialog
          open
          onClose={() => setNewClassOpen(false)}
          title="새 수업을 만들까요?"
          subtitle="지금 작성한 수업을 저장해 두면 언제든 다시 사용할 수 있어요."
        >
          <div className="flow-dialog-actions">
            <button className="flow-button" onClick={() => setNewClassOpen(false)}>
              계속 편집
            </button>
            <button
              className="flow-button"
              onClick={() => {
                setNotice(s.startBlankSequence().message);
                setNewClassOpen(false);
              }}
            >
              저장 없이 새로 만들기
            </button>
            <button
              className="flow-button flow-button--primary"
              onClick={async () => {
                if (await save()) {
                  setNotice(usePilatesStore.getState().startBlankSequence().message);
                  setNewClassOpen(false);
                }
              }}
            >
              저장하고 새로 만들기
            </button>
          </div>
        </LightDismissDialog>
      )}
      {fitPreview && (
        <LightDismissDialog
          open
          onClose={() => setFitPreview(null)}
          title={`목표 ${fitPreview.target}분에 맞추기`}
          subtitle="잠긴 동작과 휴식은 유지하고, 나머지 동작 시간을 조정합니다."
        >
          <div className="flow-fit-preview">
            {fitPreview.fitted.map((step, index) => (
              <div key={step.stepId}>
                <span>{isRestStep(step) ? '휴식' : byId.get(step.exerciseId)?.nameKo}</span>
                <small>
                  {minutes(getStepTiming(fitPreview.steps[index]).totalSec)} →{' '}
                  <b>{minutes(getStepTiming(step).totalSec)}</b>
                </small>
              </div>
            ))}
          </div>
          <div className="flow-dialog-actions">
            <button className="flow-button" onClick={() => setFitPreview(null)}>
              취소
            </button>
            <button
              className="flow-button flow-button--primary"
              onClick={() => {
                const current = usePilatesStore.getState();
                if (
                  current.activeSteps !== fitPreview.steps ||
                  current.activeTargetMinutes !== fitPreview.target
                )
                  setNotice('수업이 변경되었습니다. 시간 미리보기를 다시 열어 주세요.');
                else {
                  current.fitActiveDuration();
                  setNotice(
                    usePilatesStore.getState().generationError ?? '동작 시간을 목표에 맞췄습니다.',
                  );
                }
                setFitPreview(null);
              }}
            >
              이 시간으로 적용
            </button>
          </div>
        </LightDismissDialog>
      )}
    </section>
  );
}
