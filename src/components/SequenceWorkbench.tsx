import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ChartNoAxesCombined,
  BookmarkPlus,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  MoreHorizontal,
  X,
  LockKeyhole,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  UnlockKeyhole,
} from 'lucide-react';
import { PROP_LABELS } from '../data/pilatesCatalog';
import {
  EQUIPMENT_OPTIONS,
  getEquipmentFamilies,
  getEquipmentFamily,
  getExerciseEquipment,
} from '../data/equipmentCatalog';
import { usePilatesStore } from '../store/usePilatesStore';
import type {
  AutoGenerateCriteria,
  DifficultyLevel,
  PilatesExercise,
  PropType,
  SequenceStep,
} from '../types/pilates';
import {
  exerciseMatchesCriteria,
  formatSecondsToMMSS,
  getStepTiming,
  getStepSideLabels,
  getMovementKey,
  getSequenceDurations,
  isRestStep,
} from '../utils/sequenceEngine';
import { isExerciseAutoEligible } from '../utils/exerciseReview';
import { isExerciseAuthoringEligible } from '../utils/exerciseAuthoring';
import { SequenceOrderCard } from './SequenceOrderCard';
import '../styles/sequence-composition.css';
import {
  addMovementIdeaToCurrentClass,
  isMovementIdeaExercise,
  readMovementIdeaDraft,
} from '../utils/movementIdeaDraft';
import {
  PfAiStatusBadge,
  PfBadge,
  PfBlockPill,
  PfButton,
  PfMovementCard,
  PfSequenceBlock,
} from '../design-system';
import { getSequenceStepClassSection } from '../utils/sequenceMotionBinding';
import { LightDismissDialog } from './LightDismissDialog';
import { MovementIdeaSheet } from './MovementIdeaSheet';
import { getMotionPatternReferences } from '../data/motionPatternReferences';
import { MotionPatternThumbnail } from './MotionPatternPreview';
import { GroupPrepPanel } from './GroupPrepPanel';
import { RestBudgetControl, RestInsertControl } from './RestPlanningControls';
import { RestStepCard } from './RestStepCard';
import { NextClassBanner } from './NextClassBanner';
import { InlineExerciseFinder } from './InlineExerciseFinder';
import { StepBlockInspector } from './StepBlockInspector';
import type { StepInspectorDraftCache } from './StepBlockInspector';
import { SequencePlanPreview } from './SequencePlanPreview';
import { MotionPatternGallery } from './MotionPatternGallery';
import { ClassInsightsDialog } from './ClassInsightsDialog';
import { AiSequenceCoPilotPanel } from './AiSequenceCoPilotPanel';
import '../styles/design-tokens.css';
import '../styles/workbench-usability.css';
import '../styles/workbench-vnext.css';
import '../styles/release-mobile-clarity.css';

const LazyFreeAiAssistantPanel = lazy(() =>
  import('./FreeAiAssistantPanel').then((mod) => ({ default: mod.FreeAiAssistantPanel })),
);

export type WorkbenchPlanningMode = 'auto' | 'manual';

interface Props {
  planningMode?: WorkbenchPlanningMode;
  onPlanningModeChange?: (mode: WorkbenchPlanningMode) => void;
  sourceDetailOpen?: boolean;
  onOpenYouTubePreview: (exercise: PilatesExercise) => void;
  onOpenIdeaSheet?: (exercise?: PilatesExercise | null) => void;
  onOpenClipper: () => void;
  onOpenLogModal: (sequenceId: string) => void;
  onOpenInventory?: () => void;
}
const focusOptions = [
  { value: 'full-body', label: '전신 균형' },
  { value: 'core-sculpt', label: '코어' },
  { value: 'glute-lower', label: '둔근·하체' },
  { value: 'posture-upper', label: '상체' },
  { value: 'mobility-rehab', label: '가동성' },
] as const;
const equipmentLabel = (ids: readonly string[]) =>
  ids
    .map((id) => EQUIPMENT_OPTIONS.find((equipment) => equipment.id === id)?.labelKo ?? id)
    .join(' · ');
const equipmentSelection = (criteria: AutoGenerateCriteria): string[] =>
  criteria.availableEquipment ??
  (criteria.apparatus === 'mixed' ? (criteria.ownedApparatus ?? []) : [criteria.apparatus]);
function withExactSelection(criteria: AutoGenerateCriteria): AutoGenerateCriteria {
  const selected = [...new Set(equipmentSelection(criteria))];
  return {
    ...criteria,
    availableEquipment: selected,
    ownedApparatus: getEquipmentFamilies(selected),
    apparatus: selected.length > 1 ? 'mixed' : (getEquipmentFamily(selected[0]) ?? 'mat'),
  };
}
const sectionOf = (step: SequenceStep) => {
  if (isRestStep(step)) return 'rest';
  const role = getSequenceStepClassSection(step);
  return role === 'preparation' ? 'warmup' : role;
};
const sections = [
  { id: 'warmup', label: '준비', english: 'WARM-UP' },
  { id: 'main', label: '본운동', english: 'MAIN FLOW' },
  { id: 'cooldown', label: '마무리', english: 'COOL-DOWN' },
  { id: 'rest', label: '중간 휴식', english: 'REST' },
] as const;

function WorkbenchMovementMark({ exercise }: { exercise: PilatesExercise }) {
  const pattern = getMotionPatternReferences(exercise.id)[0];
  return pattern ? (
    <span className="workbench-movement-mark" title={`${pattern.title} · 관련 패턴 초안`}>
      <MotionPatternThumbnail reference={pattern} />
      <small>관련 패턴</small>
    </span>
  ) : (
    <span className="workbench-movement-mark is-unavailable">
      <small>
        도해
        <br />
        준비 중
      </small>
    </span>
  );
}

export function SequenceWorkbench({
  onOpenYouTubePreview,
  onOpenIdeaSheet,
  onOpenClipper,
  onOpenLogModal,
  onOpenInventory,
  planningMode: controlledPlanningMode,
  onPlanningModeChange,
  sourceDetailOpen = false,
}: Props) {
  const s = usePilatesStore();
  const [localIdeaSheet, setLocalIdeaSheet] = useState<{
    open: boolean;
    exercise: PilatesExercise | null;
  }>({ open: false, exercise: null });
  const openIdeaSheet = (exercise?: PilatesExercise | null) => {
    if (onOpenIdeaSheet) onOpenIdeaSheet(exercise ?? null);
    else setLocalIdeaSheet({ open: true, exercise: exercise ?? null });
  };
  const ideaExercises = s.exercises.filter(isMovementIdeaExercise);
  const storedCriteria = s.draftCriteria ?? s.lastCriteria;
  const currentStepEquipment = [
    ...new Set(
      s.activeSteps.flatMap((step) => {
        const exercise = s.exercises.find((item) => item.id === step.exerciseId);
        return exercise ? getExerciseEquipment(exercise).requiredEquipment : [];
      }),
    ),
  ];
  const activeEquipment = currentStepEquipment.length
    ? currentStepEquipment
    : s.activeApparatus === 'mixed'
      ? []
      : [s.activeApparatus];
  const criteria = withExactSelection(
    storedCriteria ?? {
      apparatus: s.activeApparatus,
      ownedApparatus: getEquipmentFamilies(activeEquipment),
      level: s.activeLevel,
      focusPreset: 'full-body',
      preferredProps: ['none'],
      availableEquipment: activeEquipment,
      excludeDaysWindow: 14,
      targetGroupId: s.activeTargetGroupId,
      targetMinutes: s.activeTargetMinutes || 50,
      defaultLayer: 'standard',
    },
  );
  const setCriteria = (
    update: AutoGenerateCriteria | ((previous: AutoGenerateCriteria) => AutoGenerateCriteria),
  ) => {
    const next = withExactSelection(typeof update === 'function' ? update(criteria) : update);
    if (
      Number.isInteger(next.targetMinutes) &&
      next.targetMinutes >= 10 &&
      next.targetMinutes <= 120
    )
      s.setDraftCriteria(next);
  };
  // Invalid typing stays local; the most recent valid conditions remain persisted.
  const [timeEdit, setTimeEdit] = useState<{
    value: string;
    source: AutoGenerateCriteria | null;
  } | null>(null);
  const customTime =
    timeEdit && timeEdit.source === storedCriteria
      ? timeEdit.value
      : String(criteria.targetMinutes);
  const setCustomTime = (value: string) => setTimeEdit({ value, source: storedCriteria });
  const selectedEquipment = equipmentSelection(criteria);
  const unavailableEquipment = selectedEquipment.filter((id) => !s.ownedEquipment.includes(id));
  const unavailableProps = criteria.preferredProps.filter(
    (prop) => prop !== 'none' && !s.ownedProps.includes(prop),
  );
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);
  const [replaceSearch, setReplaceSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [regenerateSection, setRegenerateSection] = useState<
    'all' | 'warmup' | 'main' | 'cooldown'
  >('all');
  const [previewStep, setPreviewStep] = useState<string | null>(null);
  const [planPreviewOpen, setPlanPreviewOpen] = useState(false);
  const [finderOpen, setFinderOpen] = useState(false);
  const [finderHasOpened, setFinderHasOpened] = useState(false);
  const [workflowStep, setWorkflowStep] = useState<'select' | 'arrange'>(() =>
    s.activeSteps.length ? 'arrange' : 'select',
  );
  const finderContentRef = useRef<HTMLDivElement>(null);
  const finderOpener = useRef<HTMLElement | null>(null);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [aiCopilotOpen, setAiCopilotOpen] = useState(false);
  const [wideEditor, setWideEditor] = useState(() => window.innerWidth >= 1200);
  const inspectorContentRef = useRef<HTMLDivElement>(null);
  const inspectorOpener = useRef<HTMLElement | null>(null);
  const inspectorDraftCache = useRef<StepInspectorDraftCache | null>(null);
  const sourceDetailOpenRef = useRef(sourceDetailOpen);
  useLayoutEffect(() => {
    if (sourceDetailOpen) sourceDetailOpenRef.current = true;
  }, [sourceDetailOpen]);
  useEffect(() => {
    // Keep the suspension guard until child passive effects reopen the sheet.
    if (!sourceDetailOpen) sourceDetailOpenRef.current = false;
  }, [sourceDetailOpen]);
  const selectedStepIndex = s.activeSteps.findIndex(
    (step) => step.stepId === previewStep && !isRestStep(step),
  );
  const selectedStep = s.activeSteps[selectedStepIndex];
  const closeInspector = useCallback(() => {
    const dialog = inspectorContentRef.current?.closest('dialog');
    if (dialog?.open) dialog.close();
    setPreviewStep(null);
    inspectorDraftCache.current = null;
    requestAnimationFrame(() => {
      if (!document.querySelector('dialog[open]') && inspectorOpener.current?.isConnected)
        inspectorOpener.current.focus();
    });
  }, []);
  const handleInspectorNativeClose = useCallback(() => {
    // Source lookup suspends the sheet; layout changes also emit native close.
    if (
      sourceDetailOpenRef.current ||
      window.innerWidth >= 1200 ||
      inspectorContentRef.current?.closest('dialog')?.open
    )
      return;
    closeInspector();
  }, [closeInspector]);
  const openInspector = (step: SequenceStep, opener: HTMLElement) => {
    if (previewStep === step.stepId) {
      closeInspector();
      return;
    }
    inspectorDraftCache.current = null;
    setWorkflowStep('arrange');
    inspectorOpener.current = opener;
    opener.focus();
    setPreviewStep(step.stepId);
  };
  useEffect(() => {
    const resize = () => setWideEditor(window.innerWidth >= 1200);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  useEffect(
    () => () => {
      const dialog = inspectorContentRef.current?.closest('dialog');
      if (dialog?.open) dialog.close();
    },
    [],
  );
  const [localPlanningMode, setLocalPlanningMode] = useState<WorkbenchPlanningMode>(() =>
    s.activeSteps.length ? 'auto' : 'manual',
  );
  const planningMode = controlledPlanningMode ?? localPlanningMode;
  const setPlanningMode = (mode: WorkbenchPlanningMode) => {
    if (controlledPlanningMode === undefined) setLocalPlanningMode(mode);
    onPlanningModeChange?.(mode);
  };
  const [conditionsOpen, setConditionsOpen] = useState(false);
  const conditionsContentRef = useRef<HTMLDivElement>(null);
  const closeConditions = () => {
    const dialog = conditionsContentRef.current?.closest('dialog');
    if (dialog?.open) dialog.close();
    setConditionsOpen(false);
  };
  useEffect(() => {
    const dialog = conditionsContentRef.current?.closest('dialog');
    const closeNative = () => {
      if (dialog?.open) dialog.close();
    };
    const unsubscribe = usePilatesStore.subscribe((state, previous) => {
      if (state.activeTab !== previous.activeTab) closeNative();
    });
    return () => {
      unsubscribe();
      closeNative();
    };
  }, []);
  const closeFinder = () => {
    const dialog = finderContentRef.current?.closest('dialog');
    if (dialog?.open) dialog.close();
    setFinderOpen(false);
    setWorkflowStep(usePilatesStore.getState().activeSteps.length ? 'arrange' : 'select');
    requestAnimationFrame(() => {
      const heading = document.getElementById('sequence-outline-heading');
      if (usePilatesStore.getState().activeSteps.length && heading) heading.focus();
      else if (finderOpener.current?.isConnected) finderOpener.current.focus();
    });
  };
  const openExerciseFinder = () => {
    closeInspector();
    setWorkflowStep('select');
    finderOpener.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (window.innerWidth >= 1200)
      requestAnimationFrame(() => {
        const search = document.querySelector<HTMLInputElement>(
          '.v2-inline-finder .inline-exercise-finder input[type="search"]',
        );
        search?.focus();
        search?.scrollIntoView?.({ block: 'nearest' });
      });
    else {
      setFinderHasOpened(true);
      setFinderOpen(true);
    }
  };
  const arrangeSequence = () => {
    if (!usePilatesStore.getState().activeSteps.length) return;
    closeFinder();
    setWorkflowStep('arrange');
    requestAnimationFrame(() =>
      document.getElementById('sequence-outline-heading')?.scrollIntoView?.({ block: 'start' }),
    );
  };
  const openPlanPreview = () => {
    if (!usePilatesStore.getState().activeSteps.length) return;
    closeInspector();
    setPlanPreviewOpen(true);
  };
  const openInventory = () => {
    closeConditions();
    if (onOpenInventory) onOpenInventory();
    else s.setActiveTab('atlas');
  };
  const durations = getSequenceDurations(s.activeSteps);
  const timingBreakdown = s.activeSteps.reduce(
    (sum, step) => {
      const timing = getStepTiming(
        step,
        s.exercises.find((exercise) => exercise.id === step.exerciseId),
      );
      if (isRestStep(step)) sum.restSec += timing.totalSec;
      else {
        sum.movementSec += timing.movementSec;
        sum.explanationSec += timing.explanationSec;
        sum.transitionSec += timing.transitionSec;
      }
      return sum;
    },
    { movementSec: 0, explanationSec: 0, transitionSec: 0, restSec: 0 },
  );
  const total = durations.totalSec;
  const target = s.activeTargetMinutes * 60;
  const delta = total - target;
  const exerciseMap = new Map(s.exercises.map((ex) => [ex.id, ex]));
  const reviewedExerciseIds = new Set(
    s.activeSteps.flatMap((step) => {
      const exercise = exerciseMap.get(step.exerciseId);
      return exercise && isExerciseAutoEligible(exercise) ? [exercise.id] : [];
    }),
  );
  const pendingStepCount = s.activeSteps.filter(
    (step) => !isRestStep(step) && !reviewedExerciseIds.has(step.exerciseId),
  ).length;
  const activeMovementKeys = s.activeSteps.flatMap((step) => {
    const exercise = !isRestStep(step) ? exerciseMap.get(step.exerciseId) : undefined;
    return exercise ? [getMovementKey(exercise)] : [];
  });
  const duplicateStepCount = activeMovementKeys.length - new Set(activeMovementKeys).size;
  const hasDuplicateMovements = duplicateStepCount > 0;
  const exerciseStepCount = s.activeSteps.filter((step) => !isRestStep(step)).length;
  const restStepCount = s.activeSteps.length - exerciseStepCount;
  const authoringCatalogCount = s.exercises.filter(isExerciseAuthoringEligible).length;
  const canStartClass =
    exerciseStepCount > 0 &&
    delta === 0 &&
    !hasDuplicateMovements &&
    s.activeSteps.every(
      (step) =>
        isRestStep(step) ||
        (exerciseMap.has(step.exerciseId) &&
          isExerciseAuthoringEligible(exerciseMap.get(step.exerciseId)!)),
    );
  const locked = s.activeSteps.filter((step) => step.locked).length;
  const sectionRuns: {
    section: (typeof sections)[number];
    entries: { step: SequenceStep; index: number }[];
  }[] = [];
  s.activeSteps.forEach((step, index) => {
    const section = sections.find((item) => item.id === sectionOf(step))!;
    const previous = sectionRuns.at(-1);
    if (previous?.section.id === section.id) previous.entries.push({ step, index });
    else sectionRuns.push({ section, entries: [{ step, index }] });
  });
  const recentLogs = s.historyLogs
    .filter((log) => !criteria.targetGroupId || log.groupId === criteria.targetGroupId)
    .slice(0, 3);
  const recentIds = new Set(recentLogs.flatMap((log) => log.exerciseIds));
  const repeated = s.activeSteps.filter((step) => recentIds.has(step.exerciseId)).length;
  const changingStep = replaceIndex === null ? undefined : s.activeSteps[replaceIndex];
  const changingEx = changingStep ? exerciseMap.get(changingStep.exerciseId) : undefined;
  const occupiedMovementKeys = new Set(activeMovementKeys);
  const candidateMovementKeys = new Set<string>();
  const candidates = changingEx
    ? s.exercises
        .filter(
          (ex) =>
            ex.id !== changingEx.id &&
            isExerciseAuthoringEligible(ex) &&
            !occupiedMovementKeys.has(getMovementKey(ex)) &&
            ex.apparatus === changingEx.apparatus &&
            exerciseMatchesCriteria(ex, {
              ...criteria,
              apparatus: s.activeApparatus,
              level: s.activeLevel,
              ownedApparatus: s.ownedApparatus,
              availableEquipment: equipmentSelection(s.lastCriteria ?? criteria),
              preferredProps: (s.lastCriteria?.preferredProps ?? criteria.preferredProps).filter(
                (prop) => prop === 'none' || s.ownedProps.includes(prop),
              ),
            }) &&
            [ex.nameKo, ex.nameEn, ...ex.targetMuscles]
              .join(' ')
              .toLowerCase()
              .includes(replaceSearch.toLowerCase()),
        )
        .sort(
          (a, b) =>
            Number(b.blockCategory === changingStep?.blockCategory) -
            Number(a.blockCategory === changingStep?.blockCategory),
        )
        .filter((exercise) => {
          const key = getMovementKey(exercise);
          if (candidateMovementKeys.has(key)) return false;
          candidateMovementKeys.add(key);
          return true;
        })
    : [];
  const setDuration = (minutes: number) => {
    setCriteria((previous) => ({ ...previous, targetMinutes: minutes }));
    setCustomTime(String(minutes));
    if (Number.isInteger(minutes) && minutes >= 10 && minutes <= 120)
      s.setActiveSequenceMeta({ targetMinutes: minutes });
  };
  const generate = () => {
    if (authoringCatalogCount === 0) {
      setNotice('구성할 동작이 없습니다. 먼저 동작을 등록해 주세요.');
      return;
    }
    const minutes = Number(customTime);
    if (!Number.isInteger(minutes) || minutes < 10 || minutes > 120) {
      setNotice('수업 시간은 10~120분 사이의 정수로 입력해 주세요.');
      return;
    }
    const next = withExactSelection({ ...criteria, targetMinutes: minutes });
    s.setDraftCriteria(next);
    s.autoGenerateSequence(next);
    if (usePilatesStore.getState().activeSteps.length) setWorkflowStep('arrange');
    if (window.innerWidth < 768)
      requestAnimationFrame(() =>
        document
          .querySelector(
            usePilatesStore.getState().generationError
              ? '[data-plan-feedback]'
              : '.sequence-column',
          )
          ?.scrollIntoView({ block: 'start', behavior: 'auto' }),
      );
    setNotice('');
  };
  const handleSave = () => {
    s.saveCurrentSequenceToBinder();
    setNotice('');
  };
  const startReadiness = hasDuplicateMovements
    ? '같은 동작이 중복되어 있어요. 다른 동작으로 바꿔 주세요.'
    : !exerciseStepCount
      ? '동작을 추가한 뒤 수업안을 확인하세요.'
      : delta !== 0
        ? '수업 시간에 맞춘 뒤 시작할 수 있어요.'
        : '동작·스프링·대상자 상태를 확인한 뒤 시작하세요.';
  const startClass = () => {
    const current = usePilatesStore.getState();
    const movements = current.activeSteps.filter((step) => !isRestStep(step));
    const currentExercises = new Map(current.exercises.map((exercise) => [exercise.id, exercise]));
    const keys = movements.map((step) => {
      const exercise = currentExercises.get(step.exerciseId);
      return exercise ? getMovementKey(exercise) : step.exerciseId;
    });
    const ready =
      movements.length > 0 &&
      getSequenceDurations(current.activeSteps).totalSec === current.activeTargetMinutes * 60 &&
      movements.every((step) => {
        const exercise = currentExercises.get(step.exerciseId);
        return !!exercise && isExerciseAuthoringEligible(exercise);
      }) &&
      new Set(keys).size === keys.length;
    if (!ready) {
      setNotice('수업안이 바뀌었어요. 시간·동작 정보·중복 동작을 다시 확인해 주세요.');
      return;
    }
    setPlanPreviewOpen(false);
    current.setActiveTab('stage');
  };
  const repeatConditions = () => {
    if (!s.lastCriteria) return;
    setCriteria(s.lastCriteria);
    setCustomTime(String(s.lastCriteria.targetMinutes));
    s.setActiveSequenceMeta({ targetMinutes: s.lastCriteria.targetMinutes });
    setNotice('지난 수업 조건을 불러왔습니다. 필요한 항목만 바꿔 보세요.');
  };
  const applyTemplate = (id: string) => {
    const template = s.conditionTemplates.find((item) => item.id === id);
    if (!template) return;
    s.applyConditionTemplate(id);
    setCriteria(template.criteria);
    setCustomTime(String(template.criteria.targetMinutes));
    setNotice(`‘${template.name}’ 조건을 불러왔습니다.`);
  };
  return (
    <div
      className={`plan-view v2-workbench v3-workbench v11-workbench vnext-workbench ${s.activeSteps.length ? 'has-sequence' : 'is-empty'}`}
    >
      <div className="page-heading v2-workbench-heading">
        <div>
          <span className="vnext-workbench-eyebrow">YOUR CLASS, YOUR FLOW</span>
          <h1 id="workspace-main-heading" tabIndex={-1}>
            {s.activeSteps.length ? '수업 구성' : '수업 준비, 가볍게.'}
          </h1>
        </div>
        <span className="today-label">
          {new Intl.DateTimeFormat('ko-KR', {
            month: 'long',
            day: 'numeric',
            weekday: 'short',
          }).format(new Date())}
        </span>
      </div>
      {!s.activeSteps.length && (
        <section className="workbench-welcome" aria-label="첫 수업안 준비">
          <img
            className="workbench-welcome-image"
            src="/images/atelier-ring-still-life.png"
            alt=""
          />
          <div className="workbench-welcome-copy">
            <button
              type="button"
              className="workbench-welcome-summary"
              onClick={() => setConditionsOpen(true)}
              aria-label={`수업 조건 열기 · ${criteria.targetMinutes}분 · ${equipmentLabel(selectedEquipment) || '기구 선택 필요'}`}
            >
              <Clock3 size={16} aria-hidden="true" />
              {criteria.targetMinutes}분 · {equipmentLabel(selectedEquipment) || '기구 선택 필요'}
              <ChevronDown size={15} aria-hidden="true" />
            </button>
            <h2>
              동작을 골라
              <br className="welcome-desktop-break" /> 나만의 흐름으로.
            </h2>
            <div className="workbench-welcome-actions">
              <PfButton
                variant="primary"
                className="workbench-first-action"
                onClick={openExerciseFinder}
              >
                <Plus size={20} aria-hidden="true" />
                동작 고르기
              </PfButton>
              <PfButton
                variant="secondary"
                className="workbench-idea-action"
                onClick={() => openIdeaSheet(null)}
              >
                <Sparkles size={18} aria-hidden="true" />한 줄 아이디어 메모
              </PfButton>
            </div>
            <p className="workbench-reviewed-count">
              추가하고, 순서를 바꾸고, 저장하세요. 검토는 선택입니다.
            </p>
          </div>
        </section>
      )}
      {ideaExercises.length > 0 && (
        <section className="pf-workbench-ideas" aria-label="내 새 동작 메모">
          <div className="pf-workbench-ideas__header">
            <div>
              <h2>
                내 새 동작 메모 <PfBadge tone="sage">{ideaExercises.length}</PfBadge>
              </h2>
              <p>
                직접 해본 느낌·수정할 점을 덧붙이거나 바로 수업에 넣으세요 · 주관적 메모(전문가
                검증·운동 효과 보장 아님)
              </p>
            </div>
            <PfButton variant="secondary" onClick={() => openIdeaSheet(null)}>
              <Plus size={16} aria-hidden="true" /> 새 아이디어 추가
            </PfButton>
          </div>
          <div className="pf-workbench-ideas__list">
            {ideaExercises.map((ideaEx) => {
              const draft = readMovementIdeaDraft(ideaEx);
              const inSequence = s.activeSteps.some(
                (step) => !isRestStep(step) && step.exerciseId === ideaEx.id,
              );
              return (
                <PfMovementCard
                  key={ideaEx.id}
                  variant="idea"
                  className="pf-workbench-idea-card"
                  aria-label={`${ideaEx.nameKo} 창작 메모`}
                >
                  <div className="pf-workbench-idea-card__body">
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '6px',
                      }}
                    >
                      <strong>{ideaEx.nameKo}</strong>
                      <PfAiStatusBadge
                        kind={draft?.triedByInstructor ? 'tried-memo' : 'creative-memo'}
                      />
                    </div>
                    <p>{draft?.ideaLine || ideaEx.cues[0]}</p>
                    {draft?.subjectiveFeeling && <p>느낌 메모: {draft.subjectiveFeeling}</p>}
                    {draft?.adjustmentNote && <p>수정 메모: {draft.adjustmentNote}</p>}
                  </div>
                  <div className="pf-workbench-idea-card__actions">
                    <PfButton
                      variant="secondary"
                      onClick={() => openIdeaSheet(ideaEx)}
                      aria-label={`${ideaEx.nameKo} 다시 열기`}
                    >
                      다시 열기 · 느낌/수정
                    </PfButton>
                    <PfButton
                      variant="primary"
                      onClick={() => {
                        const result = addMovementIdeaToCurrentClass(ideaEx.id);
                        setNotice(result.message);
                        if (result.ok) setWorkflowStep('arrange');
                      }}
                      aria-label={`${ideaEx.nameKo} 수업에 넣기`}
                    >
                      {inSequence ? '수업에 한 번 더 넣기' : '수업에 넣기'}
                    </PfButton>
                  </div>
                </PfMovementCard>
              );
            })}
          </div>
        </section>
      )}
      {!s.activeSteps.length && (
        <details className="workbench-motion-gallery-disclosure">
          <summary>
            <span>도해 초안 둘러보기 (선택)</span>
            <ChevronDown size={15} aria-hidden="true" />
          </summary>
          <MotionPatternGallery
            onViewAll={() => s.setActiveTab('atlas')}
            onOpenExercise={onOpenYouTubePreview}
            onInsertExercise={(exercise) => {
              s.appendExerciseToSequence(exercise.id, exercise.blockCategory);
              if (usePilatesStore.getState().activeSteps.length) {
                setWorkflowStep('arrange');
              }
            }}
          />
        </details>
      )}
      <NextClassBanner collapseEmpty />
      <nav className="workbench-flow-navigation" aria-label="수업 준비 순서">
        <ol className="workbench-preparation-steps">
          <li>
            <button
              type="button"
              onClick={openExerciseFinder}
              aria-current={
                !planPreviewOpen &&
                (finderOpen || workflowStep === 'select' || !s.activeSteps.length)
                  ? 'step'
                  : undefined
              }
            >
              <span>1</span> 동작 선택
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={arrangeSequence}
              disabled={!s.activeSteps.length}
              aria-current={
                !planPreviewOpen &&
                !finderOpen &&
                workflowStep === 'arrange' &&
                s.activeSteps.length
                  ? 'step'
                  : undefined
              }
            >
              <span>2</span> 수업 구성
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={openPlanPreview}
              disabled={!s.activeSteps.length}
              aria-current={planPreviewOpen ? 'step' : undefined}
            >
              <span>3</span> 미리보기
            </button>
          </li>
        </ol>
      </nav>
      <div className="v2-plan-toolbar" aria-label="시퀀스 준비">
        <div className="v2-condition-chips" aria-label="이번 수업 조건 요약">
          <button
            type="button"
            onClick={() => setConditionsOpen(true)}
            aria-label={`수업 시간 ${criteria.targetMinutes}분 · 조건 열기`}
          >
            {criteria.targetMinutes}분 <ChevronDown size={14} />
          </button>
          <button
            type="button"
            onClick={() => setConditionsOpen(true)}
            aria-label={`이번 수업 기구: ${equipmentLabel(selectedEquipment) || '선택 필요'} · 조건 열기`}
            title={equipmentLabel(selectedEquipment)}
          >
            {selectedEquipment.length > 1
              ? `기구 ${selectedEquipment.length}`
              : equipmentLabel(selectedEquipment) || '기구 선택'}{' '}
            <ChevronDown size={14} />
          </button>
          <button
            type="button"
            onClick={() => setConditionsOpen(true)}
            aria-label={`수업 목표 ${focusOptions.find((option) => option.value === criteria.focusPreset)?.label ?? '전신 균형'} · 조건 열기`}
          >
            {focusOptions.find((option) => option.value === criteria.focusPreset)?.label ??
              '전신 균형'}{' '}
            <ChevronDown size={14} />
          </button>
          <PfButton variant="icon" aria-label="수업 조건" onClick={() => setConditionsOpen(true)}>
            <SlidersHorizontal size={18} />
          </PfButton>
        </div>
        {s.activeSteps.length > 0 && (
          <div className="v2-toolbar-actions">
            <PfButton variant="text" onClick={repeatConditions} disabled={!s.lastCriteria}>
              지난 조건
            </PfButton>
            {planningMode === 'auto' ? (
              <PfButton
                variant="primary"
                onClick={generate}
                disabled={authoringCatalogCount === 0}
                aria-describedby={locked ? 'v2-new-draft-scope' : undefined}
                title="전체를 새 초안으로 구성합니다"
              >
                <RefreshCw size={16} />
                시퀀스 만들기
              </PfButton>
            ) : (
              <PfButton variant="secondary" onClick={openExerciseFinder}>
                <Plus size={16} />
                동작 찾기
              </PfButton>
            )}
          </div>
        )}
      </div>
      {planningMode === 'auto' && locked > 0 && (
        <p id="v2-new-draft-scope" className="v2-generation-scope">
          시퀀스 만들기는 전체를 새 초안으로 바꿉니다. 잠근 {locked}개 항목을 유지하려면 아래
          ‘잠그지 않은 동작 다시 만들기’를 사용하세요.
        </p>
      )}
      {(s.generationError || (!s.persistenceError && (notice || s.saveFeedback))) && (
        <p
          data-plan-feedback
          className={`status plan-feedback ${s.generationError ? 'error' : ''}`}
          role={s.generationError ? 'alert' : 'status'}
        >
          {s.generationError || notice || s.saveFeedback}
        </p>
      )}
      <div className="plan-layout v2-plan-layout">
        <section className="sequence-column" aria-label="오늘의 시퀀스">
          {s.activeSteps.length > 0 && (
            <>
              <div className="sequence-heading">
                <div>
                  <span className="eyebrow">TODAY’S FLOW</span>
                  <h2 id="sequence-outline-heading" tabIndex={-1}>
                    수업 시퀀스
                  </h2>
                  <p>
                    {exerciseStepCount}개 동작 {restStepCount > 0 && `· 휴식 ${restStepCount}개`}{' '}
                    <span>·</span> {equipmentLabel(currentStepEquipment) || '기구 미지정'}{' '}
                    <span>·</span>{' '}
                    {focusOptions.find((option) => option.value === s.lastCriteria?.focusPreset)
                      ?.label ?? '수업 초안'}
                  </p>
                  <div style={{ marginTop: '6px' }}>
                    <PfAiStatusBadge
                      kind={
                        planningMode === 'auto'
                          ? 'ai-draft'
                          : pendingStepCount > 0
                            ? 'review-pending'
                            : 'instructor-reviewed'
                      }
                    />
                  </div>
                </div>
                <PfButton
                  variant="secondary"
                  className="save-flow"
                  onClick={handleSave}
                  disabled={!s.activeSteps.length}
                >
                  <BookmarkPlus size={17} />
                  <span>저장</span>
                </PfButton>
              </div>
              <label className="sequence-title-label">
                <span className="sr-only">시퀀스 제목</span>
                <input
                  aria-label="시퀀스 제목"
                  value={s.activeTitle}
                  onChange={(event) => s.setActiveSequenceMeta({ title: event.target.value })}
                  maxLength={150}
                />
              </label>
              <div className={`time-summary ${!s.activeSteps.length ? 'is-empty' : ''}`}>
                <div>
                  <span>
                    현재 <strong>{formatSecondsToMMSS(total)}</strong>
                    <span className="time-divider">/</span>목표 {s.activeTargetMinutes}분
                  </span>
                  <span className={delta === 0 ? 'time-status exact' : 'time-status'}>
                    {!s.activeSteps.length ? (
                      '첫 동작을 추가해 주세요'
                    ) : delta === 0 ? (
                      <>
                        <Check size={14} />
                        시간이 딱 맞아요
                      </>
                    ) : (
                      `${Math.abs(delta / 60)
                        .toFixed(1)
                        .replace('.0', '')}분 ${delta > 0 ? '초과' : '부족'}`
                    )}
                  </span>
                </div>
                <div
                  className="duration-track v2-duration-track"
                  aria-hidden="true"
                  hidden={!s.activeSteps.length}
                >
                  <span
                    className="v2-time-movement"
                    style={{
                      width: `${(timingBreakdown.movementSec / Math.max(total, 1)) * 100}%`,
                    }}
                  />
                  <span
                    className="v2-time-explanation"
                    style={{
                      width: `${(timingBreakdown.explanationSec / Math.max(total, 1)) * 100}%`,
                    }}
                  />
                  <span
                    className="v2-time-transition"
                    style={{
                      width: `${(timingBreakdown.transitionSec / Math.max(total, 1)) * 100}%`,
                    }}
                  />
                  <span
                    className="v2-time-rest"
                    style={{
                      width: `${(timingBreakdown.restSec / Math.max(total, 1)) * 100}%`,
                    }}
                  />
                </div>
                <dl
                  className="v2-time-breakdown"
                  aria-label="시간 상세 구성"
                  hidden={!s.activeSteps.length}
                >
                  <div>
                    <dt>동작</dt>
                    <dd>{formatSecondsToMMSS(timingBreakdown.movementSec)}</dd>
                  </div>
                  <div>
                    <dt>티칭</dt>
                    <dd>{formatSecondsToMMSS(timingBreakdown.explanationSec)}</dd>
                  </div>
                  <div>
                    <dt>전환</dt>
                    <dd>{formatSecondsToMMSS(timingBreakdown.transitionSec)}</dd>
                  </div>
                  <div>
                    <dt>휴식</dt>
                    <dd>{formatSecondsToMMSS(timingBreakdown.restSec)}</dd>
                  </div>
                </dl>
                <dl className="class-duration-breakdown sr-only" aria-label="수업 시간 구성">
                  <div>
                    <dt>전체</dt>
                    <dd>{formatSecondsToMMSS(durations.totalSec)}</dd>
                  </div>
                  <div>
                    <dt>동작·설명·전환</dt>
                    <dd>{formatSecondsToMMSS(durations.exerciseSec)}</dd>
                  </div>
                  <div>
                    <dt>휴식</dt>
                    <dd>{formatSecondsToMMSS(durations.restSec)}</dd>
                  </div>
                </dl>
                {s.activeSteps.length > 0 && (
                  <p>양쪽 수행·설명·전환과 넣은 휴식 시간을 모두 포함합니다.</p>
                )}
              </div>
              <div className="v2-mode-toggle" role="group" aria-label="시퀀스 편집 방식">
                <button
                  type="button"
                  aria-pressed={planningMode === 'auto'}
                  onClick={() => setPlanningMode('auto')}
                >
                  자동 구성
                </button>
                <button
                  type="button"
                  aria-pressed={planningMode === 'manual'}
                  onClick={() => setPlanningMode('manual')}
                >
                  직접 편집
                </button>
              </div>
              <div className="sequence-tools">
                <div>
                  <LockKeyhole size={14} />
                  <span>{locked}개 잠금</span>
                  {recentLogs.length > 0 && (
                    <span className="recent-count">최근 3회와 {repeated}개 겹침</span>
                  )}
                </div>
                <PfButton
                  variant="text"
                  onClick={() => {
                    s.undoSequence();
                    setNotice('');
                  }}
                >
                  <RotateCcw size={14} />
                  되돌리기
                </PfButton>
              </div>
            </>
          )}
          {s.activeSteps.length > 0 && (
            <p className="composition-order-hint">
              끌어서 순서를 바꾸세요. 모바일에서는 위로·아래로 버튼도 사용할 수 있어요.
            </p>
          )}
          <div className="flow-sections">
            {sectionRuns.map(({ section, entries }, runIndex) => {
              return (
                <PfSequenceBlock
                  key={`${section.id}-${runIndex}`}
                  phase={section.id}
                  eyebrow={section.english}
                  title={section.label}
                  meta={formatSecondsToMMSS(
                    entries.reduce(
                      (sum, { step }) =>
                        sum + getStepTiming(step, exerciseMap.get(step.exerciseId)).totalSec,
                      0,
                    ),
                  )}
                >
                  {entries.map(({ step, index }) => {
                    if (isRestStep(step))
                      return (
                        <SequenceOrderCard
                          key={step.stepId}
                          step={step}
                          index={index}
                          label={`${index + 1}번 휴식`}
                          onNotice={setNotice}
                        >
                          <RestStepCard
                            step={step}
                            index={index}
                            lastIndex={s.activeSteps.length - 1}
                            onToggleLock={() => s.toggleStepLock(index)}
                            onMove={(direction) => s.moveStep(index, direction)}
                            onRemove={() => s.removeStep(index)}
                            onSetDuration={(minutes) => s.setRestDuration(index, minutes)}
                          />
                        </SequenceOrderCard>
                      );
                    const ex = exerciseMap.get(step.exerciseId);
                    if (!ex)
                      return (
                        <p className="status error" key={step.stepId}>
                          동작 자료를 찾을 수 없습니다. 백업 자료를 확인해 주세요.
                        </p>
                      );
                    const timing = getStepTiming(step, ex);
                    const reviewed = reviewedExerciseIds.has(ex.id);
                    const expanded = previewStep === step.stepId;
                    const isIdea = isMovementIdeaExercise(ex);
                    return (
                      <SequenceOrderCard
                        key={step.stepId}
                        step={step}
                        index={index}
                        label={`${index + 1}번 ${ex.nameKo}`}
                        onNotice={setNotice}
                      >
                        <PfMovementCard
                          variant="step"
                          locked={!!step.locked}
                          selected={expanded}
                          className="flow-step"
                        >
                          <div className="step-main">
                            <span className="step-number">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <button
                              className="step-art"
                              onClick={() => onOpenYouTubePreview(ex)}
                              aria-label={`${ex.nameKo} 자료 보기`}
                            >
                              <WorkbenchMovementMark exercise={ex} />
                            </button>
                            <button
                              className="step-title"
                              onClick={(event) => openInspector(step, event.currentTarget)}
                              aria-expanded={expanded}
                            >
                              <strong>{ex.nameKo}</strong>
                              <span>
                                {equipmentLabel(getExerciseEquipment(ex).requiredEquipment)}
                                {(step.repetitions !== undefined || step.sets !== undefined) && (
                                  <>
                                    {' '}
                                    ·{' '}
                                    {step.repetitions !== undefined
                                      ? `${step.repetitions}회`
                                      : '횟수 미지정'}
                                    {step.sets !== undefined ? ` × ${step.sets}세트` : ''}
                                  </>
                                )}
                                {step.sideMode && <> · {getStepSideLabels(step, ex).join(' → ')}</>}
                                <PfBlockPill
                                  as="span"
                                  kind={isIdea ? 'memo' : 'movement'}
                                  className={`step-target ${!reviewed || isIdea ? 'step-review-status' : ''}`}
                                >
                                  {isIdea
                                    ? '내 창작 메모 · 전문가 검증 아님'
                                    : reviewed
                                      ? ex.targetMuscles.slice(0, 2).join('·')
                                      : '검토 전 자료'}
                                </PfBlockPill>
                              </span>
                            </button>
                            <span className="v3-step-time">
                              {formatSecondsToMMSS(timing.totalSec)}
                              {step.locked && (
                                <LockKeyhole
                                  className="v3-locked-mark"
                                  size={13}
                                  aria-label="잠금"
                                />
                              )}
                            </span>
                            <PfButton
                              variant="icon"
                              className="v3-step-more"
                              aria-label={`${index + 1}번 동작 블록 편집`}
                              aria-expanded={expanded}
                              onClick={(event) => openInspector(step, event.currentTarget)}
                            >
                              <MoreHorizontal size={19} />
                            </PfButton>
                            <div className="step-actions">
                              {isIdea && (
                                <PfButton
                                  variant="icon"
                                  aria-label={`${ex.nameKo} 느낌·수정 메모 열기`}
                                  onClick={() => openIdeaSheet(ex)}
                                >
                                  <Sparkles size={17} />
                                </PfButton>
                              )}
                              <PfButton
                                variant="icon"
                                aria-label={`${index + 1}번 동작 ${step.locked ? '잠금 해제' : '잠금'}`}
                                aria-pressed={!!step.locked}
                                onClick={() => s.toggleStepLock(index)}
                              >
                                {step.locked ? (
                                  <LockKeyhole size={17} />
                                ) : (
                                  <UnlockKeyhole size={17} />
                                )}
                              </PfButton>
                              <PfButton
                                variant="icon"
                                aria-label={`${index + 1}번 동작 교체`}
                                disabled={step.locked}
                                onClick={() => {
                                  setReplaceIndex(index);
                                  setReplaceSearch('');
                                }}
                              >
                                <RefreshCw size={17} />
                              </PfButton>
                            </div>
                          </div>
                        </PfMovementCard>
                      </SequenceOrderCard>
                    );
                  })}
                </PfSequenceBlock>
              );
            })}
          </div>
          {s.activeSteps.length > 0 && (
            <div className="regenerate-bar">
              <label>
                <span className="sr-only">다시 만들 구간</span>
                <select
                  value={regenerateSection}
                  onChange={(event) =>
                    setRegenerateSection(event.target.value as typeof regenerateSection)
                  }
                >
                  <option value="all">전체 구간</option>
                  <option value="warmup">준비</option>
                  <option value="main">본운동</option>
                  <option value="cooldown">마무리</option>
                </select>
              </label>
              <PfButton
                variant="secondary"
                onClick={() => {
                  s.regenerateUnlocked(
                    {
                      ...criteria,
                      targetMinutes: s.activeTargetMinutes,
                      availableEquipment: selectedEquipment,
                      ownedApparatus: getEquipmentFamilies(selectedEquipment),
                    },
                    regenerateSection === 'all' ? undefined : regenerateSection,
                  );
                  setNotice('');
                }}
              >
                <RefreshCw size={16} />
                잠그지 않은 동작 다시 만들기
              </PfButton>
            </div>
          )}
          {s.activeSteps.length > 0 && (
            <RestInsertControl
              steps={s.activeSteps}
              labelForStep={(step) =>
                isRestStep(step) ? '휴식' : (exerciseMap.get(step.exerciseId)?.nameKo ?? '동작')
              }
              onAdd={(duration, afterIndex) => s.addRestStep(duration, afterIndex)}
            />
          )}
          {s.activeSteps.length > 0 && (
            <div className="sequence-bottom-actions">
              <PfButton
                variant="text"
                onClick={() => {
                  s.fitActiveDuration();
                  setNotice('');
                }}
              >
                <Clock3 size={16} />
                {s.activeTargetMinutes}분에 맞추기
              </PfButton>
              <PfButton
                variant="text"
                onClick={() => {
                  s.saveCurrentSequenceToBinder(true);
                  setNotice('');
                }}
              >
                <Copy size={16} />
                사본 저장
              </PfButton>
            </div>
          )}
          {s.activeSteps.length > 0 && (
            <div className="v3-primary-actions">
              <PfButton variant="icon" aria-label="동작 추가" onClick={openExerciseFinder}>
                <Plus size={22} />
              </PfButton>
              <PfButton
                variant="icon"
                aria-label="수업 구성 살펴보기"
                title="수업 구성 살펴보기"
                onClick={() => setInsightsOpen(true)}
              >
                <ChartNoAxesCombined size={21} />
              </PfButton>
              <PfButton
                variant="primary"
                className="v3-preview-button"
                disabled={!s.activeSteps.length}
                onClick={openPlanPreview}
              >
                <Play size={18} />
                시퀀스 미리보기
              </PfButton>
            </div>
          )}
          {s.activeSteps.length > 0 && (
            <p className="workbench-readiness-summary" id="start-class-readiness">
              {startReadiness}{' '}
              {pendingStepCount > 0 &&
                `미검토 자료 ${pendingStepCount}개 · 검토 기록은 선택 사항입니다.`}
            </p>
          )}
          {s.activeSteps.length > 0 && (
            <section className="pf-flow-continuation" aria-label="핵심 흐름 이어가기">
              <div className="pf-flow-continuation__copy">
                <strong>다음 단계로 바로 이어가기</strong>
                <p>
                  새 동작 메모·선택을 마쳤다면 ‘내 수업’에 보관하거나 수업 후 ‘기록’을 남기세요.
                </p>
              </div>
              <div className="pf-flow-continuation__actions">
                <PfButton variant="secondary" onClick={() => openIdeaSheet(null)}>
                  <Sparkles size={15} aria-hidden="true" /> 한 줄 동작 메모
                </PfButton>
                <PfButton variant="secondary" onClick={() => s.setActiveTab('binder')}>
                  내 수업 서랍 열기 <ArrowRight size={15} aria-hidden="true" />
                </PfButton>
              </div>
            </section>
          )}
          {!s.activeSteps.length && s.undoStack.length > 0 && (
            <PfButton
              variant="secondary"
              onClick={() => {
                s.undoSequence();
                setNotice('');
              }}
            >
              <RotateCcw size={16} /> 되돌리기
            </PfButton>
          )}
          {!s.activeSteps.length && (
            <details className="workbench-automation-tools">
              <summary>자동 구성·휴식 먼저 넣기</summary>
              <p>
                시간·기구·난이도와 최근 수업 기록에 맞춰 초안을 만듭니다. 효과·안전성 판단은
                포함하지 않습니다.
              </p>
              <div>
                <PfButton variant="secondary" onClick={() => setConditionsOpen(true)}>
                  <SlidersHorizontal size={16} /> 조건 살펴보기
                </PfButton>
                <PfButton variant="secondary" onClick={repeatConditions} disabled={!s.lastCriteria}>
                  지난 조건
                </PfButton>
                <PfButton
                  variant="secondary"
                  disabled={authoringCatalogCount === 0}
                  aria-describedby={
                    authoringCatalogCount === 0 ? 'automatic-review-guidance' : undefined
                  }
                  onClick={() => {
                    setPlanningMode('auto');
                    generate();
                  }}
                >
                  <RefreshCw size={16} /> 시퀀스 만들기
                </PfButton>
              </div>
              {authoringCatalogCount === 0 && (
                <div>
                  <p id="automatic-review-guidance">
                    자동 구성에 사용할 동작이 없어요. 먼저 동작을 등록해 주세요.
                  </p>
                  <button type="button" className="btn-secondary" onClick={openExerciseFinder}>
                    동작 찾기
                  </button>
                </div>
              )}
              <RestInsertControl
                steps={s.activeSteps}
                labelForStep={() => '휴식'}
                onAdd={(duration, afterIndex) => s.addRestStep(duration, afterIndex)}
              />
            </details>
          )}
          <details
            className="workbench-automation-tools workbench-ai-copilot-details"
            open={aiCopilotOpen}
            onToggle={(event) => setAiCopilotOpen(event.currentTarget.open)}
          >
            <summary>주제·이력 맞춤 추천 (선택)</summary>
            {aiCopilotOpen && (
              <AiSequenceCoPilotPanel
                criteria={criteria}
                selectedEquipment={selectedEquipment}
                onAppliedSequence={() => setWorkflowStep('arrange')}
                onOpenExerciseDetail={onOpenYouTubePreview}
              />
            )}
          </details>
          <details className="workbench-automation-tools workbench-free-ai-details">
            <summary>AI 티칭 큐·시퀀스 도우미 (무료 한도 보호 · 소진 시 로컬 전환)</summary>
            <Suspense fallback={<p className="pf-text-sm">AI 도우미를 불러오는 중...</p>}>
              <LazyFreeAiAssistantPanel
                exercises={s.exercises}
                conditionTemplates={s.conditionTemplates}
                activeTargetMinutes={s.activeTargetMinutes}
                activeApparatus={s.activeApparatus}
                activeLevel={s.activeLevel}
                onApplyDraftSequence={(payload) => {
                  usePilatesStore.setState({
                    activeTitle: payload.title,
                    activeSubtitle: payload.subtitle,
                    activeTargetMinutes: payload.targetMinutes,
                    activeLevel: payload.level,
                    activeApparatus: payload.apparatus,
                    activeSteps: payload.steps,
                    generationError: null,
                    saveFeedback: `‘${payload.title}’ 초안을 현재 수업 시퀀스에 반영했습니다.`,
                  });
                  setWorkflowStep('arrange');
                }}
                onSaveUnreviewedMovementIdea={(exercise) => {
                  s.addCustomExercise(exercise);
                }}
              />
            </Suspense>
          </details>
          <div className="workbench-footnotes">
            <PfButton variant="text" onClick={onOpenClipper}>
              YouTube 참고 자료 등록
            </PfButton>
            <PfButton variant="text" onClick={() => onOpenLogModal(s.activeSequenceId)}>
              진행한 수업 기록
            </PfButton>
          </div>
        </section>
        <aside
          className="v2-inline-finder"
          aria-label={wideEditor && selectedStep ? '선택 동작 속성' : '동작 찾기'}
        >
          {wideEditor && selectedStep ? (
            <div className="step-properties-panel">
              <div className="step-properties-heading">
                <span>선택 동작 속성</span>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="동작 속성 닫기"
                  onClick={closeInspector}
                >
                  <X size={18} />
                </button>
              </div>
              <StepBlockInspector
                key={`${selectedStep.stepId}:${selectedStep.exerciseId}`}
                index={selectedStepIndex}
                step={selectedStep}
                playbackActive={!sourceDetailOpen}
                loadDraft={() => inspectorDraftCache.current}
                onDraftChange={(value) => {
                  inspectorDraftCache.current = value;
                }}
                onClose={closeInspector}
                onOpenExercise={onOpenYouTubePreview}
                onReplace={() => {
                  closeInspector();
                  setReplaceIndex(selectedStepIndex);
                  setReplaceSearch('');
                }}
              />
            </div>
          ) : wideEditor ? (
            <InlineExerciseFinder
              onOpenExercise={onOpenYouTubePreview}
              classEquipment={EQUIPMENT_OPTIONS.filter((option) =>
                selectedEquipment.includes(option.id),
              ).map((option) => option.id)}
            />
          ) : null}
        </aside>
      </div>
      <LightDismissDialog
        open={!!selectedStep && !wideEditor && !sourceDetailOpen}
        title="동작 블록 편집"
        className="step-inspector-sheet"
        maxWidth="min(100vw, 760px)"
        onClose={handleInspectorNativeClose}
      >
        <div ref={inspectorContentRef}>
          {!wideEditor && selectedStep && (
            <StepBlockInspector
              key={`${selectedStep.stepId}:${selectedStep.exerciseId}`}
              index={selectedStepIndex}
              step={selectedStep}
              playbackActive={!sourceDetailOpen}
              loadDraft={() => inspectorDraftCache.current}
              onDraftChange={(value) => {
                inspectorDraftCache.current = value;
              }}
              onClose={closeInspector}
              onOpenExercise={onOpenYouTubePreview}
              onReplace={() => {
                closeInspector();
                setReplaceIndex(selectedStepIndex);
                setReplaceSearch('');
              }}
            />
          )}
        </div>
      </LightDismissDialog>
      <LightDismissDialog
        open={finderOpen && !wideEditor}
        onClose={closeFinder}
        title="수업에 넣을 동작 고르기"
        subtitle="상세를 확인하고 추가하면 현재 수업안에 그대로 담깁니다."
        className="workbench-finder-dialog"
        maxWidth="760px"
      >
        <div ref={finderContentRef} className="workbench-finder-content">
          {!wideEditor && finderHasOpened && (
            <InlineExerciseFinder
              onOpenExercise={onOpenYouTubePreview}
              classEquipment={EQUIPMENT_OPTIONS.filter((option) =>
                selectedEquipment.includes(option.id),
              ).map((option) => option.id)}
            />
          )}
        </div>
        <footer className="workbench-finder-footer">
          <p aria-live="polite">
            <strong>{exerciseStepCount}개 동작</strong> · {formatSecondsToMMSS(total)}
          </p>
          <button type="button" className="btn-primary" onClick={closeFinder}>
            수업 구성으로 돌아가기 <ArrowRight size={17} />
          </button>
        </footer>
      </LightDismissDialog>
      {planPreviewOpen && (
        <SequencePlanPreview
          onClose={() => {
            setPlanPreviewOpen(false);
            setWorkflowStep('arrange');
          }}
          onSave={() => {
            s.saveCurrentSequenceToBinder(true);
            setNotice('');
          }}
          onStart={startClass}
          canStartClass={canStartClass}
          startReadiness={startReadiness}
        />
      )}
      {insightsOpen && (
        <ClassInsightsDialog
          onClose={() => setInsightsOpen(false)}
          title={s.activeTitle}
          steps={s.activeSteps}
          exercises={s.exercises}
          historyLogs={s.historyLogs}
        />
      )}
      <LightDismissDialog
        open={conditionsOpen}
        onClose={closeConditions}
        title="수업 조건"
        subtitle="이번 수업에 사용할 시간·기구·대상 조건을 정합니다."
        maxWidth="760px"
      >
        <div ref={conditionsContentRef} className="v2-conditions-content">
          <section className="panel class-brief" aria-label="수업 조건">
            <div className="section-heading">
              <h2>수업 조건</h2>
              <SlidersHorizontal size={19} strokeWidth={1.5} />
            </div>
            <fieldset className="brief-field">
              <legend>
                <Clock3 size={16} />
                수업 시간
              </legend>
              <div className="duration-options">
                {[30, 50, 60].map((minutes) => (
                  <button
                    type="button"
                    key={minutes}
                    aria-pressed={Number(customTime) === minutes}
                    className={Number(customTime) === minutes ? 'selected' : ''}
                    onClick={() => setDuration(minutes)}
                  >
                    {minutes}
                    <small>분</small>
                  </button>
                ))}
                <label
                  className={`custom-duration ${![30, 50, 60].includes(Number(customTime)) ? 'selected' : ''}`}
                >
                  <span>직접</span>
                  <input
                    aria-label="직접 지정 수업 시간"
                    type="number"
                    min={10}
                    max={120}
                    step={1}
                    value={customTime}
                    onChange={(event) => {
                      setCustomTime(event.target.value);
                      const value = Number(event.target.value);
                      setCriteria((previous) => ({
                        ...previous,
                        targetMinutes: value,
                      }));
                      if (Number.isInteger(value) && value >= 10 && value <= 120)
                        s.setActiveSequenceMeta({ targetMinutes: value });
                    }}
                  />
                  <small>분</small>
                </label>
              </div>
              <RestBudgetControl
                minutes={criteria.restMinutes ?? 0}
                totalMinutes={
                  Number(customTime) >= 10 && Number(customTime) <= 120
                    ? Number(customTime)
                    : criteria.targetMinutes
                }
                onChange={(minutes) => {
                  const entered = Number(customTime);
                  setCriteria({
                    ...criteria,
                    restMinutes: minutes,
                    targetMinutes:
                      Number.isInteger(entered) && entered >= 10 && entered <= 120
                        ? entered
                        : criteria.targetMinutes,
                  });
                }}
              />
            </fieldset>
            <fieldset className="brief-field">
              <legend>오늘의 목표</legend>
              <div className="focus-options">
                {focusOptions.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    aria-pressed={criteria.focusPreset === option.value}
                    className={`chip ${criteria.focusPreset === option.value ? 'selected' : ''}`}
                    onClick={() => setCriteria({ ...criteria, focusPreset: option.value })}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className="brief-field">
              <legend>이번 수업에 사용할 기구</legend>
              <p className="muted">
                여러 기구를 함께 선택할 수 있습니다. 선택한 각 기구의 승인 동작을 포함합니다.
              </p>
              <div className="inventory-options">
                {EQUIPMENT_OPTIONS.map((equipment) => (
                  <label key={equipment.id}>
                    <input
                      type="checkbox"
                      checked={selectedEquipment.includes(equipment.id)}
                      disabled={!s.ownedEquipment.includes(equipment.id)}
                      onChange={() => {
                        const next = selectedEquipment.includes(equipment.id)
                          ? selectedEquipment.filter((id) => id !== equipment.id)
                          : [...selectedEquipment, equipment.id];
                        setCriteria({ ...criteria, availableEquipment: next });
                      }}
                    />
                    <span>
                      {equipment.labelKo}
                      {!s.ownedEquipment.includes(equipment.id) ? ' · 미보유' : ''}
                    </span>
                  </label>
                ))}
              </div>
              <button className="text-button" type="button" onClick={openInventory}>
                내 보유 기구·소도구 설정
              </button>
              {unavailableEquipment.length > 0 && (
                <p className="status error">
                  이전에 선택한 {equipmentLabel(unavailableEquipment)}를 현재 보유하지 않습니다.
                  보유 설정을 확인하거나 선택을 해제해 주세요.
                  <button
                    className="text-button"
                    type="button"
                    onClick={() =>
                      setCriteria({
                        ...criteria,
                        availableEquipment: selectedEquipment.filter((id) =>
                          s.ownedEquipment.includes(id),
                        ),
                      })
                    }
                  >
                    미보유 기구 선택 해제
                  </button>
                </p>
              )}
              {!selectedEquipment.length && (
                <p className="muted">수업에 사용할 기구를 하나 이상 선택해 주세요.</p>
              )}
            </fieldset>
            <div className="brief-pair">
              <label className="form-field">
                <span>최대 난이도</span>
                <select
                  value={criteria.level}
                  onChange={(event) =>
                    setCriteria({
                      ...criteria,
                      level: event.target.value as DifficultyLevel,
                    })
                  }
                >
                  <option value="1.0">입문·기초</option>
                  <option value="1.5">초중급</option>
                  <option value="2.0">중상급</option>
                </select>
              </label>
              <label className="form-field">
                <span>수업 별칭</span>
                <select
                  value={criteria.targetGroupId}
                  onChange={(event) => {
                    setCriteria({
                      ...criteria,
                      targetGroupId: event.target.value,
                    });
                    s.setActiveTargetGroupId(event.target.value);
                  }}
                >
                  {s.classGroups.map((group) => (
                    <option value={group.id} key={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <GroupPrepPanel groupId={criteria.targetGroupId} />
            <details className="advanced-brief">
              <summary>
                소도구·반복 회피 설정
                <ChevronDown size={15} />
              </summary>
              <fieldset className="brief-field">
                <legend>이번 수업에서 쓸 수 있는 소도구</legend>
                <button className="text-button" type="button" onClick={openInventory}>
                  보유 소도구 변경
                </button>
                <div className="focus-options">
                  {Object.entries(PROP_LABELS).map(([key, label]) => (
                    <button
                      type="button"
                      key={key}
                      className={`chip ${criteria.preferredProps.includes(key as PropType) ? 'selected' : ''}`}
                      aria-pressed={criteria.preferredProps.includes(key as PropType)}
                      disabled={key !== 'none' && !s.ownedProps.includes(key as PropType)}
                      onClick={() => {
                        const prop = key as PropType;
                        setCriteria({
                          ...criteria,
                          preferredProps:
                            prop === 'none'
                              ? ['none']
                              : criteria.preferredProps.includes(prop)
                                ? criteria.preferredProps.filter((item) => item !== prop)
                                : [
                                    ...criteria.preferredProps.filter((item) => item !== 'none'),
                                    prop,
                                  ],
                        });
                      }}
                    >
                      {label.ko}
                    </button>
                  ))}
                </div>
                {unavailableProps.length > 0 && (
                  <p className="status error">
                    현재 보유하지 않은 소도구가 선택되어 있습니다.
                    <button
                      className="text-button"
                      type="button"
                      onClick={() =>
                        setCriteria({
                          ...criteria,
                          preferredProps: criteria.preferredProps.filter(
                            (prop) => prop === 'none' || s.ownedProps.includes(prop),
                          ),
                        })
                      }
                    >
                      미보유 소도구 선택 해제
                    </button>
                  </p>
                )}
              </fieldset>
              <fieldset className="planning-goals">
                <legend>강사 계획 목표 · 선택</legend>
                {(
                  [
                    { id: 'pelvic-control', label: '골반 움직임 인지·조절' },
                    { id: 'trunk-hip-coordination', label: '몸통·고관절 협응' },
                    { id: 'mobility', label: '가동성' },
                    { id: 'strength', label: '근력' },
                  ] as const
                ).map((goal) => (
                  <label key={goal.id}>
                    <input
                      type="checkbox"
                      checked={criteria.planningGoals?.includes(goal.id) ?? false}
                      onChange={() => {
                        const current = criteria.planningGoals ?? [];
                        setCriteria({
                          ...criteria,
                          planningGoals: current.includes(goal.id)
                            ? current.filter((value) => value !== goal.id)
                            : [...current, goal.id],
                        });
                      }}
                    />
                    {goal.label}
                  </label>
                ))}
              </fieldset>
              <fieldset className="planning-goals">
                <legend>강사 관찰 메모 · 선택</legend>
                {(
                  [
                    { id: 'anterior-pelvic-tilt', label: '전방경사 관찰' },
                    { id: 'posterior-pelvic-tilt', label: '후방경사 관찰' },
                  ] as const
                ).map((observation) => (
                  <label key={observation.id}>
                    <input
                      type="checkbox"
                      checked={criteria.instructorObservations?.includes(observation.id) ?? false}
                      onChange={() => {
                        const current = criteria.instructorObservations ?? [];
                        setCriteria({
                          ...criteria,
                          instructorObservations: current.includes(observation.id)
                            ? current.filter((value) => value !== observation.id)
                            : [...current, observation.id],
                        });
                      }}
                    />
                    {observation.label}
                  </label>
                ))}
                <p className="muted">
                  관찰·계획 메모로 보관하며 자동 진단이나 치료 목적의 추천에는 사용하지 않습니다.
                </p>
              </fieldset>
              <label className="form-field">
                <span>최근 동작 반복 줄이기</span>
                <select
                  value={criteria.excludeDaysWindow}
                  onChange={(event) =>
                    setCriteria({
                      ...criteria,
                      excludeDaysWindow: Number(event.target.value),
                    })
                  }
                >
                  <option value={0}>사용 안 함</option>
                  <option value={7}>최근 7일</option>
                  <option value={14}>최근 14일</option>
                  <option value={30}>최근 30일</option>
                </select>
              </label>
              <p className="muted">
                조건에 맞는 동작 안에서 최근 사용 동작의 우선순위를 낮춥니다. 꼭 필요한 반복은
                포함될 수 있습니다.
              </p>
            </details>
            <button
              className="btn-primary generate-button"
              onClick={() => {
                closeConditions();
                generate();
              }}
            >
              조건 적용하고 만들기
              <ArrowRight size={18} />
            </button>
            <p className="recommendation-note">조건 기반 추천 · 승인한 동작으로 구성합니다.</p>
            <p className="muted">
              기구가 바뀌면 전환 45초, 같은 기구에서는 15초를 전체 시간에 포함합니다. 잠긴 항목의
              시간은 유지합니다.
            </p>
          </section>
          <details className="condition-template">
            <summary>
              <BookmarkPlus size={17} />
              자주 쓰는 조건 보관
            </summary>
            <div className="template-save">
              <input
                aria-label="조건 템플릿 이름"
                placeholder="예: 오전 매트 기초반"
                value={templateName}
                maxLength={60}
                onChange={(event) => setTemplateName(event.target.value)}
              />
              <button
                className="btn-secondary"
                disabled={!templateName.trim()}
                onClick={() => {
                  const minutes = Number(customTime);
                  if (!Number.isInteger(minutes) || minutes < 10 || minutes > 120) {
                    setNotice('수업 시간은 10~120분 사이의 정수로 입력해 주세요.');
                    return;
                  }
                  s.setDraftCriteria(withExactSelection({ ...criteria, targetMinutes: minutes }));
                  if (usePilatesStore.getState().generationError) return;
                  s.saveConditionTemplate(templateName.trim());
                  setTemplateName('');
                  setNotice('수업 조건을 보관했습니다.');
                }}
              >
                보관
              </button>
            </div>
            {s.conditionTemplates.map((template) => (
              <button
                className="template-link"
                key={template.id}
                onClick={() => applyTemplate(template.id)}
              >
                {template.name}
                <ArrowRight size={16} />
              </button>
            ))}
          </details>
          <div className="v2-conditions-actions">
            <button type="button" className="btn-secondary" onClick={closeConditions}>
              닫기
            </button>
          </div>
        </div>
      </LightDismissDialog>
      <LightDismissDialog
        open={replaceIndex !== null}
        onClose={() => setReplaceIndex(null)}
        title="이 동작만 교체"
        subtitle="같은 기구와 현재 난이도 안에서 고릅니다. 이 자리의 전체 시간은 유지됩니다."
        maxWidth="680px"
      >
        <input
          className="replacement-search"
          aria-label="교체할 동작 검색"
          placeholder="동작명이나 부위 검색"
          value={replaceSearch}
          onChange={(event) => setReplaceSearch(event.target.value)}
        />
        <div className="replacement-list">
          {candidates.slice(0, 30).map((ex) => (
            <button
              className="replacement-item"
              key={ex.id}
              onClick={() => {
                if (replaceIndex !== null) s.replaceStepExercise(replaceIndex, ex.id);
                setReplaceIndex(null);
              }}
            >
              <WorkbenchMovementMark exercise={ex} />
              <span>
                <strong>{ex.nameKo}</strong>
                <small>
                  {ex.nameEn} ·{' '}
                  {ex.blockCategory === changingStep?.blockCategory
                    ? '같은 구간'
                    : '다른 구간 · 구성 확인 필요'}
                </small>
              </span>
              <ArrowRight size={17} />
            </button>
          ))}
          {!candidates.length && (
            <div className="empty-state">
              <h3>조건에 맞는 교체 동작이 없어요</h3>
              <p>검색어를 바꾸거나 동작을 직접 등록해 보세요.</p>
            </div>
          )}
        </div>
      </LightDismissDialog>
      {!onOpenIdeaSheet && localIdeaSheet.open && (
        <MovementIdeaSheet
          key={localIdeaSheet.exercise?.id ?? 'new-idea'}
          open={localIdeaSheet.open}
          initialExercise={localIdeaSheet.exercise}
          onClose={() => setLocalIdeaSheet({ open: false, exercise: null })}
        />
      )}
    </div>
  );
}
