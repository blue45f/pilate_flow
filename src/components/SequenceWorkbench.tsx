import { EquipmentChoice } from './EquipmentChoice';
import { buildSequenceSimulation } from '../utils/sequenceSimulation';
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
  getReusableBlockTimingSummary,
  getSavedReusableBlocks,
  insertIdeaReusableBlockToCurrentClass,
  isMovementIdeaExercise,
  readMovementIdeaDraft,
  saveIdeaToReusableBlock,
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
import { FirstClassTutorialCandidate } from '../features/firstClassTutorialCandidate';
import { ClassInsightsDialog } from './ClassInsightsDialog';
import { AiSequenceCoPilotPanel } from './AiSequenceCoPilotPanel';
import { SequenceFlowTelemetryStrip } from './SequenceFlowTelemetryStrip';
import {
  BLANK_DRAFT_STARTER_OPTIONS,
  OFFLINE_BLOCK_PRESETS,
} from '../data/classBlockPresets';
import {
  startFromBlankDraftOption,
  toP5ReusableBlockContract,
} from '../utils/classBlockPresetValidator';
import { Apparatus3dRigPreviewCard } from './Apparatus3dRigPreviewCard';
import { CurriculumProgressionPanel } from './workbench/CurriculumProgressionPanel';
import { DurationCalibrationBanner } from './workbench/DurationCalibrationBanner';
import { StudioFlowOptimizerPanel } from './workbench/StudioFlowOptimizerPanel';
import { StudioReadinessAuditCard } from './workbench/StudioReadinessAuditCard';
import { WorkbenchBlankStarters } from './workbench/WorkbenchBlankStarters';
import { WorkbenchHierarchySummary } from './workbench/WorkbenchHierarchySummary';
import '../styles/design-tokens.css';
import '../styles/workbench-usability.css';
import '../styles/workbench-vnext.css';
import '../styles/release-mobile-clarity.css';
import '../styles/workbench-picker.css';

const LazyOfflinePresetPicker = lazy(() =>
  import('./OfflinePresetPicker').then((mod) => ({ default: mod.OfflinePresetPicker })),
);

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

import {
  WORKBENCH_PREP_RECOVERY_KEY,
  clearWorkbenchPrepRecovery,
  readWorkbenchPrepRecovery,
  writeWorkbenchPrepRecovery,
  type WorkbenchPrepRecoveryState,
} from '../hooks/useWorkbenchRecoverySession';

export { WORKBENCH_PREP_RECOVERY_KEY, type WorkbenchPrepRecoveryState };

usePilatesStore.subscribe((state, prev) => {
  if (
    state.activeSequenceId !== prev.activeSequenceId ||
    state.savedSequences !== prev.savedSequences ||
    (state.activeSteps.length !== prev.activeSteps.length &&
      state.undoStack.length === 0 &&
      prev.undoStack.length === 0)
  ) {
    clearWorkbenchPrepRecovery();
  }
});

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
  const initialRecovery = useMemo(
    () => readWorkbenchPrepRecovery(s.activeSequenceId, s.activeSteps),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [showWelcomeTutorial, setShowWelcomeTutorial] = useState(false);
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
  const [previewStep, setPreviewStep] = useState<string | null>(
    () => initialRecovery?.previewStep ?? null,
  );
  const [planPreviewOpen, setPlanPreviewOpen] = useState(false);
  const [finderOpen, setFinderOpen] = useState(() => initialRecovery?.finderOpen ?? false);
  const [finderHasOpened, setFinderHasOpened] = useState(
    () => initialRecovery?.finderOpen ?? false,
  );
  const [workflowStep, setWorkflowStep] = useState<'select' | 'arrange'>(
    () => initialRecovery?.workflowStep ?? (s.activeSteps.length ? 'arrange' : 'select'),
  );
  const finderContentRef = useRef<HTMLDivElement>(null);
  const finderOpener = useRef<HTMLElement | null>(null);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [aiCopilotOpen, setAiCopilotOpen] = useState(false);
  const [flowTelemetryOpen, setFlowTelemetryOpen] = useState(false);
  const [freeAiOpen, setFreeAiOpen] = useState(false);
  const [wideEditor, setWideEditor] = useState(() => window.innerWidth >= 1200);
  const inspectorContentRef = useRef<HTMLDivElement>(null);
  const inspectorOpener = useRef<HTMLElement | null>(null);
  const inspectorDraftCache = useRef<StepInspectorDraftCache | null>(
    initialRecovery?.inspectorDraft ?? null,
  );
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
  const [conditionsOpen, setConditionsOpen] = useState(
    () => initialRecovery?.conditionsOpen ?? false,
  );
  const [conditionStep, setConditionStep] = useState<1 | 2 | 3>(
    () => initialRecovery?.conditionStep ?? 1,
  );
  const syncRecoveryState = useCallback(
    (draftOverride?: StepInspectorDraftCache | null) => {
      const activeStep: 'finder' | 'arrange' =
        finderOpen || workflowStep === 'select' ? 'finder' : 'arrange';
      writeWorkbenchPrepRecovery({
        sequenceId: s.activeSequenceId,
        activeStep,
        workflowStep,
        finderOpen,
        conditionsOpen,
        conditionStep,
        previewStep,
        inspectorStepId: previewStep,
        inspectorDraft:
          draftOverride !== undefined ? draftOverride : inspectorDraftCache.current,
      });
    },
    [
      s.activeSequenceId,
      finderOpen,
      workflowStep,
      conditionsOpen,
      conditionStep,
      previewStep,
    ],
  );
  useEffect(() => {
    syncRecoveryState();
  }, [syncRecoveryState]);
  const conditionsContentRef = useRef<HTMLDivElement>(null);
  const conditionStep1Ref = useRef<HTMLFieldSetElement>(null);
  const conditionStep2Ref = useRef<HTMLFieldSetElement>(null);
  const conditionStep3Ref = useRef<HTMLDivElement>(null);
  const navigateConditionStep = (nextStep: 1 | 2 | 3) => {
    setConditionStep(nextStep);
    requestAnimationFrame(() => {
      if (nextStep === 1) {
        conditionStep1Ref.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
      } else if (nextStep === 2) {
        conditionStep2Ref.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
      } else {
        conditionStep3Ref.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
      }
    });
  };
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
      if (document.querySelector('dialog[open]')) return;
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
    setFinderHasOpened(true);
    setFinderOpen(true);
  };
  useEffect(() => {
    // Focus only on an explicit opening, after the lazy picker has mounted.
    // Resizing or returning from source details must preserve the current control.
    if (finderOpen && window.innerWidth >= 1200)
      finderContentRef.current?.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
  }, [finderOpen]);
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
  const exerciseMap = new Map(s.exercises.map((ex) => [ex.id, ex]));
  const timingBreakdown = s.activeSteps.reduce(
    (sum, step) => {
      const timing = getStepTiming(step, exerciseMap.get(step.exerciseId));
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
  const readiness = useMemo(
    () => buildSequenceSimulation(s.activeSteps, s.exercises, s.activeTargetMinutes),
    [s.activeSteps, s.exercises, s.activeTargetMinutes],
  );
  const canStartClass = readiness.gate.canRehearse;
  const locked = s.activeSteps.filter((step) => step.locked).length;
  const rawSectionIds = s.activeSteps.map((step) => sectionOf(step));
  const phaseOrder: Record<string, number> = { warmup: 0, main: 1, cooldown: 2 };
  const nonRestSectionIds = rawSectionIds.filter((id) => id !== 'rest');
  const isMonotonicNonRest = nonRestSectionIds.every(
    (id, idx) => idx === 0 || phaseOrder[id] >= phaseOrder[nonRestSectionIds[idx - 1]],
  );
  const sortedNonRestIds = isMonotonicNonRest
    ? nonRestSectionIds
    : [...nonRestSectionIds].sort((a, b) => phaseOrder[a] - phaseOrder[b]);
  let nonRestCursor = 0;
  const resolvedSectionIds = rawSectionIds.map((id) =>
    id === 'rest' ? 'rest' : sortedNonRestIds[nonRestCursor++]!,
  );
  const sectionRuns: {
    section: (typeof sections)[number];
    entries: { step: SequenceStep; index: number }[];
  }[] = [];
  s.activeSteps.forEach((step, index) => {
    const sectionId = resolvedSectionIds[index] ?? sectionOf(step);
    const section = sections.find((item) => item.id === sectionId)!;
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
  useEffect(() => {
    if (s.activeSteps.some((step) => !step.selectedLayer)) {
      usePilatesStore.setState((state) => ({
        activeSteps: state.activeSteps.map((step) =>
          step.selectedLayer ? step : { ...step, selectedLayer: 'standard' },
        ),
      }));
    }
  }, [s.activeSteps]);
  const [blockTitleInput, setBlockTitleInput] = useState('');
  const [, setBlockLibraryTick] = useState(0);
  const savedReusableBlocks = getSavedReusableBlocks();
  const p5ReusableBlocks = useMemo(
    () => [
      ...OFFLINE_BLOCK_PRESETS.map((preset) => toP5ReusableBlockContract(preset)),
      ...savedReusableBlocks.map((block) => toP5ReusableBlockContract(block)),
    ],
    [savedReusableBlocks],
  );
  const handleStartBlankDraft = (starterId: string) => {
    const starter = BLANK_DRAFT_STARTER_OPTIONS.find((item) => item.id === starterId);
    if (!starter) return;
    if (
      starter.starterKind === 'blank-movement-idea' ||
      starter.starterKind === 'blank-custom-movement-showcase'
    ) {
      openIdeaSheet(null);
      return;
    }
    const bundle = startFromBlankDraftOption(
      starter,
      {
        apparatus: s.activeApparatus,
        level: s.activeLevel,
        durationMinutes: s.activeTargetMinutes,
      },
      s.exercises,
    );
    if (bundle.sequenceDraft) {
      s.setActiveSequenceMeta({
        title: bundle.sequenceDraft.title,
        subtitle: bundle.sequenceDraft.subtitle,
        apparatus: bundle.sequenceDraft.apparatus,
        level: bundle.sequenceDraft.level,
        targetMinutes: bundle.sequenceDraft.targetMinutes,
      });
      usePilatesStore.setState({
        activeSteps: bundle.sequenceDraft.steps.map((step) =>
          step.selectedLayer ? step : { ...step, selectedLayer: 'standard' },
        ),
      });
      setWorkflowStep('arrange');
      setNotice(`‘${starter.titleKo}’ 초안 틀을 열었습니다.`);
    }
  };
  const handleCombineCurrentStepsToBlock = () => {
    const nonRestSteps = s.activeSteps.filter((step) => !isRestStep(step));
    if (!nonRestSteps.length) {
      setNotice('블록으로 묶을 동작을 먼저 추가해 주세요.');
      return;
    }
    const title = blockTitleInput.trim() || `${s.activeTitle || '오늘의 시퀀스'} 블록`;
    let createdBlockId: string | undefined;
    let lastResultMessage = '';
    for (let i = 0; i < nonRestSteps.length; i += 1) {
      const step = nonRestSteps[i]!;
      const res = saveIdeaToReusableBlock({
        exerciseId: step.exerciseId,
        blockId: createdBlockId,
        blockTitle: i === 0 ? title : undefined,
        durationMin: step.durationMin,
        explanationSec: step.explanationSec,
        transitionSec: step.transitionSec,
        repetitions: step.repetitions,
        sets: step.sets,
        sideMode: step.sideMode,
      });
      if (!res.ok || !res.block) {
        setNotice(res.message);
        return;
      }
      createdBlockId = res.block.id;
      lastResultMessage = `‘${res.block.title}’ 블록(${res.block.items.length}개 동작)으로 묶어 저장했습니다.`;
    }
    setBlockTitleInput('');
    setBlockLibraryTick((n) => n + 1);
    setNotice(lastResultMessage);
  };
  const handleInsertReusableBlock = (blockId: string, deltaMin = 0) => {
    const beforeState = usePilatesStore.getState();
    const prevLen = beforeState.activeSteps.length;
    const snapshot = {
      activeSequenceId: beforeState.activeSequenceId,
      activeTitle: beforeState.activeTitle,
      activeSubtitle: beforeState.activeSubtitle,
      activeApparatus: beforeState.activeApparatus,
      activeLevel: beforeState.activeLevel,
      activeTargetMinutes: beforeState.activeTargetMinutes,
      activeTargetGroupId: beforeState.activeTargetGroupId,
      activeSteps: structuredClone(beforeState.activeSteps),
      lastCriteria: beforeState.lastCriteria ? structuredClone(beforeState.lastCriteria) : null,
      draftCriteria: beforeState.draftCriteria ? structuredClone(beforeState.draftCriteria) : null,
    };
    const res = insertIdeaReusableBlockToCurrentClass(blockId);
    if (res.ok) {
      const current = usePilatesStore.getState();
      const insertedCount = Math.max(1, current.activeSteps.length - prevLen);
      const perStepDelta = deltaMin / insertedCount;
      usePilatesStore.setState({
        undoStack: [...beforeState.undoStack.slice(-19), snapshot],
        activeSteps: current.activeSteps.map((step, idx) => {
          const baseStep = step.selectedLayer ? step : { ...step, selectedLayer: 'standard' as const };
          if (deltaMin === 0 || idx < prevLen || isRestStep(baseStep)) return baseStep;
          return {
            ...baseStep,
            durationMin: Number(Math.max(1, Math.min(20, baseStep.durationMin + perStepDelta)).toFixed(2)),
          };
        }),
      });
      setWorkflowStep('arrange');
    }
    setNotice(
      deltaMin === 0
        ? res.message
        : `${res.message} (${deltaMin > 0 ? `+${deltaMin}` : deltaMin}분 조정 적용)`,
    );
  };
  const handleSave = () => {
    const current = usePilatesStore.getState();
    if (current.activeSteps.some((step) => !step.selectedLayer)) {
      usePilatesStore.setState({
        activeSteps: current.activeSteps.map((step) =>
          step.selectedLayer ? step : { ...step, selectedLayer: 'standard' },
        ),
      });
    }
    s.saveCurrentSequenceToBinder();
    setNotice('');
  };
  const startReadiness = !exerciseStepCount
    ? '동작을 추가한 뒤 수업안을 확인하세요.'
    : !canStartClass
      ? '동작 정보와 항목 시간을 확인해 주세요.'
      : delta !== 0
        ? `목표와 차이가 있지만 현재 계획 ${formatSecondsToMMSS(total)}으로 진행할 수 있어요.`
        : hasDuplicateMovements
          ? '같은 동작 반복 포함 · 의도한 순서를 확인한 뒤 시작하세요.'
          : '동작·스프링·대상자 상태를 확인한 뒤 시작하세요.';
  const startClass = () => {
    const current = usePilatesStore.getState();
    const ready = buildSequenceSimulation(
      current.activeSteps,
      current.exercises,
      current.activeTargetMinutes,
    ).gate.canRehearse;
    if (!ready) {
      setNotice('수업안이 바뀌었어요. 동작 정보와 항목 시간을 다시 확인해 주세요.');
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
  const [recentSwitcherOpen, setRecentSwitcherOpen] = useState(false);
  const recentSavedSequences = useMemo(
    () =>
      [...s.savedSequences].sort((a, b) =>
        (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''),
      ),
    [s.savedSequences],
  );
  const recentHistoryLogs = useMemo(
    () => [...s.historyLogs].sort((a, b) => (b.taughtAt || '').localeCompare(a.taughtAt || '')),
    [s.historyLogs],
  );
  const startNewClass = () => {
    const current = usePilatesStore.getState();
    if (!current.activeSteps.length) {
      openExerciseFinder();
      return;
    }
    const previousSnapshot = {
      activeSequenceId: current.activeSequenceId,
      activeTitle: current.activeTitle,
      activeSubtitle: current.activeSubtitle,
      activeApparatus: current.activeApparatus,
      activeLevel: current.activeLevel,
      activeTargetMinutes: current.activeTargetMinutes,
      activeTargetGroupId: current.activeTargetGroupId,
      activeSteps: structuredClone(current.activeSteps),
      lastCriteria: current.lastCriteria ? structuredClone(current.lastCriteria) : null,
      draftCriteria: current.draftCriteria ? structuredClone(current.draftCriteria) : null,
    };
    usePilatesStore.setState({
      undoStack: [...current.undoStack.slice(-19), previousSnapshot],
      activeSequenceId: `draft-new-${Date.now()}`,
      activeTitle: '새 수업 시퀀스',
      activeSubtitle: '동작을 골라 나만의 흐름으로 구성하세요',
      activeSteps: [],
      generationError: null,
      saveFeedback:
        '새 수업 준비 화면으로 전환했습니다. 되돌리기로 이전 수업안을 복원할 수 있습니다.',
    });
    closeInspector();
    setRecentSwitcherOpen(false);
    setWorkflowStep('select');
    setNotice('새 수업 준비 화면으로 전환했습니다. 되돌리기로 이전 수업안을 복원할 수 있습니다.');
  };
  const continueRecentSequence = (sequenceId: string, title: string) => {
    s.loadSequenceIntoWorkbench(sequenceId);
    setRecentSwitcherOpen(false);
    setWorkflowStep('arrange');
    setNotice(`‘${title}’ 수업을 불러왔습니다.`);
  };
  const continueRecentHistory = (logId: string, title: string) => {
    s.loadHistoryIntoWorkbench(logId);
    setRecentSwitcherOpen(false);
    setWorkflowStep('arrange');
    setNotice(`최근 기록 ‘${title}’ 수업을 이어서 구성합니다.`);
  };
  const ideasSectionNode = ideaExercises.length > 0 && (
    <section className="pf-workbench-ideas" aria-label="내 새 동작 메모">
      <div className="pf-workbench-ideas__header">
        <div>
          <h2>
            내 새 동작 메모 <PfBadge tone="sage">{ideaExercises.length}</PfBadge>
          </h2>
          <p className="sr-only">
            직접 해본 느낌·수정할 점을 덧붙이거나 바로 수업에 넣으세요 · 주관적 메모(전문가
            검증·운동 효과 보장 아님)
          </p>
        </div>
        <PfButton variant="secondary" onClick={() => openIdeaSheet(null)}>
          <Plus size={16} aria-hidden="true" /> 새 아이디어 추가
        </PfButton>
      </div>
      <details
        className="pf-workbench-ideas__details"
        key={s.activeSteps.length > 0 ? 'compact' : 'expanded'}
        open={!s.activeSteps.length ? true : undefined}
      >
        <summary className="pf-workbench-ideas__summary">
          <span>저장한 새 동작 메모 {ideaExercises.length}개 보기</span>
          <ChevronDown size={15} aria-hidden="true" />
        </summary>
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
                    {inSequence ? '수업에 담김 (메모 동기화)' : '수업에 넣기'}
                  </PfButton>
                </div>
              </PfMovementCard>
            );
          })}
        </div>
      </details>
    </section>
  );
  return (
    <div
      className={`plan-view v2-workbench v3-workbench v11-workbench vnext-workbench ${s.activeSteps.length ? 'has-sequence' : 'is-empty'} ${wideEditor && selectedStep ? 'has-inspector' : ''}`}
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
        <>
          <section className="workbench-welcome" aria-label="첫 수업안 준비">
            <img
              className="workbench-welcome-image"
              src="/images/atelier-ring-still-life.png"
              alt=""
            />
            <div className="workbench-welcome-copy">
              <div className="workbench-welcome-top-row">
                <span className="workbench-welcome-kicker">새 수업 만들기</span>
                <button
                  type="button"
                  className="workbench-welcome-summary"
                  onClick={() => setConditionsOpen(true)}
                  aria-label={`수업 조건 열기 · ${criteria.targetMinutes}분 · ${equipmentLabel(selectedEquipment) || '기구 선택 필요'}`}
                >
                  <Clock3 size={16} aria-hidden="true" />
                  {criteria.targetMinutes}분 ·{' '}
                  {equipmentLabel(selectedEquipment) || '기구 선택 필요'}
                  <ChevronDown size={15} aria-hidden="true" />
                </button>
              </div>
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
                <button
                  type="button"
                  className="btn-secondary workbench-preset-action"
                  onClick={() => setPresetsOpen(true)}
                >
                  <Copy size={16} aria-hidden="true" /> 프리셋·동작 묶음에서 고르기
                </button>
              </div>
              <WorkbenchBlankStarters onSelectStarter={handleStartBlankDraft} />
              <p className="workbench-reviewed-count">
                추가하고, 순서를 바꾸고, 저장하세요. 검토는 선택입니다.
              </p>
              <details
                className="workbench-visual-tutorial-disclosure"
                open={showWelcomeTutorial}
                onToggle={(event) => setShowWelcomeTutorial(event.currentTarget.open)}
              >
                <summary>첫 수업 3단계 시각 도해 가이드 보기</summary>
                {showWelcomeTutorial && (
                  <FirstClassTutorialCandidate
                    variant="inline-card"
                    onStepAction={(stepId) => {
                      if (stepId === 'new-movement') openIdeaSheet(null);
                      else if (stepId === 'block-composition') openExerciseFinder();
                      else if (stepId === 'save-class' || (stepId as string) === 'start-teaching') {
                        if (s.activeSteps.length > 0) {
                          setPlanPreviewOpen(true);
                        } else {
                          document.getElementById('workbench-sequence-panel')?.focus();
                        }
                      }
                    }}
                    onDismiss={() => setShowWelcomeTutorial(false)}
                  />
                )}
              </details>
            </div>
          </section>
          <section className="workbench-recent-continue" aria-label="최근 수업 이어가기">
            <div className="workbench-recent-continue__header">
              <div className="workbench-recent-continue__title">
                <span className="workbench-recent-kicker">RECENT FLOW</span>
                <h2>
                  최근 수업 이어가기{' '}
                  <PfBadge tone="sage">
                    {recentSavedSequences.length || recentHistoryLogs.length}
                  </PfBadge>
                </h2>
              </div>
              <button
                type="button"
                className="ghost-btn workbench-recent-view-all"
                onClick={() => s.setActiveTab('binder')}
              >
                저장한 수업 전체 보기 <ArrowRight size={14} aria-hidden="true" />
              </button>
            </div>
            {recentSavedSequences.length > 0 ? (
              <div className="workbench-recent-continue__list">
                {recentSavedSequences.slice(0, 2).map((seq) => {
                  const moveCount = seq.steps.filter((st) => !isRestStep(st)).length;
                  const seqTitle =
                    seq.title || (seq as { name?: string }).name || '저장된 수업 시퀀스';
                  const gearText =
                    seq.apparatus === 'mixed' ? '복합 기구' : equipmentLabel([seq.apparatus]);
                  return (
                    <div key={seq.id} className="workbench-recent-card">
                      <div className="workbench-recent-card__info">
                        <strong>{seqTitle}</strong>
                        <span>
                          {moveCount}개 동작 · {seq.targetMinutes}분 · {gearText || '기구 미지정'}
                        </span>
                      </div>
                      <PfButton
                        variant="secondary"
                        className="workbench-recent-card__action"
                        aria-label={`${seqTitle} 이어서 구성`}
                        onClick={() => continueRecentSequence(seq.id, seqTitle)}
                      >
                        이어서 구성
                      </PfButton>
                    </div>
                  );
                })}
              </div>
            ) : recentHistoryLogs.length > 0 ? (
              <div className="workbench-recent-continue__list">
                {recentHistoryLogs.slice(0, 2).map((log) => (
                  <div key={log.id} className="workbench-recent-card">
                    <div className="workbench-recent-card__info">
                      <strong>{log.sequenceTitle}</strong>
                      <span>{log.exerciseIds.length}개 동작 · 최근 수업 기록</span>
                    </div>
                    <PfButton
                      variant="secondary"
                      className="workbench-recent-card__action"
                      aria-label={`${log.sequenceTitle} 기록에서 이어가기`}
                      onClick={() => continueRecentHistory(log.id, log.sequenceTitle)}
                    >
                      기록에서 이어가기
                    </PfButton>
                  </div>
                ))}
              </div>
            ) : (
              <div className="workbench-recent-empty">
                <p>
                  저장한 최근 수업이 아직 없습니다. 위에서 새 수업을 만들거나 프리셋으로 시작해
                  보세요.
                </p>
              </div>
            )}
          </section>
          {ideasSectionNode}
        </>
      )}
      {s.activeSteps.length > 0 && (
        <div
          className="workbench-home-flow-bar"
          role="region"
          aria-label="새 수업 및 최근 수업 전환"
        >
          <button
            type="button"
            className="btn-secondary workbench-flow-btn workbench-new-class-btn"
            onClick={startNewClass}
          >
            <Plus size={15} aria-hidden="true" /> 새 수업 만들기
          </button>
          <details
            className="workbench-recent-switcher"
            open={recentSwitcherOpen}
            onToggle={(event) => setRecentSwitcherOpen(event.currentTarget.open)}
          >
            <summary className="btn-secondary workbench-flow-btn">
              <span>최근 수업 이어가기</span>
              <PfBadge tone="sage">
                {recentSavedSequences.length || recentHistoryLogs.length}
              </PfBadge>
              <ChevronDown size={14} aria-hidden="true" />
            </summary>
            <div className="workbench-recent-switcher__panel">
              {recentSavedSequences.length > 0 ? (
                <div className="workbench-recent-continue__list">
                  {recentSavedSequences.slice(0, 3).map((seq) => {
                    const moveCount = seq.steps.filter((st) => !isRestStep(st)).length;
                    const seqTitle =
                      seq.title || (seq as { name?: string }).name || '저장된 수업 시퀀스';
                    const gearText =
                      seq.apparatus === 'mixed' ? '복합 기구' : equipmentLabel([seq.apparatus]);
                    return (
                      <div key={seq.id} className="workbench-recent-card">
                        <div className="workbench-recent-card__info">
                          <strong>{seqTitle}</strong>
                          <span>
                            {moveCount}개 동작 · {seq.targetMinutes}분 · {gearText || '기구 미지정'}
                          </span>
                        </div>
                        <PfButton
                          variant="secondary"
                          className="workbench-recent-card__action"
                          aria-label={`${seqTitle} 이어서 구성`}
                          onClick={() => continueRecentSequence(seq.id, seqTitle)}
                        >
                          이어서 구성
                        </PfButton>
                      </div>
                    );
                  })}
                </div>
              ) : recentHistoryLogs.length > 0 ? (
                <div className="workbench-recent-continue__list">
                  {recentHistoryLogs.slice(0, 2).map((log) => (
                    <div key={log.id} className="workbench-recent-card">
                      <div className="workbench-recent-card__info">
                        <strong>{log.sequenceTitle}</strong>
                        <span>{log.exerciseIds.length}개 동작 · 최근 수업 기록</span>
                      </div>
                      <PfButton
                        variant="secondary"
                        className="workbench-recent-card__action"
                        aria-label={`${log.sequenceTitle} 기록에서 이어가기`}
                        onClick={() => continueRecentHistory(log.id, log.sequenceTitle)}
                      >
                        기록에서 이어가기
                      </PfButton>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="workbench-recent-empty-text">저장한 최근 수업이 아직 없습니다.</p>
              )}
              <button
                type="button"
                className="ghost-btn workbench-recent-view-all"
                onClick={() => {
                  setRecentSwitcherOpen(false);
                  s.setActiveTab('binder');
                }}
              >
                저장한 수업 전체 보기 <ArrowRight size={14} aria-hidden="true" />
              </button>
            </div>
          </details>
          <button
            type="button"
            className="btn-secondary workbench-flow-btn"
            onClick={() => setPresetsOpen(true)}
          >
            <Copy size={15} aria-hidden="true" /> 프리셋·동작 묶음에서 고르기
          </button>
        </div>
      )}
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
          aria-live={s.generationError ? 'assertive' : 'polite'}
          aria-atomic="true"
        >
          {s.generationError || notice || s.saveFeedback}
        </p>
      )}
      <div className="plan-layout v2-plan-layout">
        <section
          id="workbench-sequence-panel"
          className="sequence-column"
          aria-label="오늘의 시퀀스"
          tabIndex={-1}
        >
          {s.activeSteps.length > 0 && (
            <>
              <div className="sequence-heading">
                <label className="sequence-title-label">
                  <span className="sr-only">시퀀스 제목</span>
                  <input
                    aria-label="시퀀스 제목"
                    value={s.activeTitle}
                    onChange={(event) => s.setActiveSequenceMeta({ title: event.target.value })}
                    maxLength={150}
                  />
                </label>
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
              <div className="sequence-context">
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
              </div>

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
              </div>
              <div className="sequence-inline-tools">
                <details className="workbench-timing-details">
                  <summary>시간 구성</summary>
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
                  )}{' '}
                </details>
                <details className="workbench-mode-details">
                  <summary>편집 방식{locked > 0 ? ` · 잠금 ${locked}` : ''}</summary>
                  <div>
                    <LockKeyhole size={14} />
                    <span>{locked}개 잠금</span>
                    {recentLogs.length > 0 && (
                      <span className="recent-count">최근 3회와 {repeated}개 겹침</span>
                    )}
                  </div>

                  <div className="sequence-review-detail">
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
                </details>
                <details className="workbench-block-combo-details">
                  <summary>
                    블록 조합
                    {savedReusableBlocks.length > 0 ? ` · ${savedReusableBlocks.length}` : ''}
                  </summary>
                  <div className="workbench-block-combo-panel">
                    <div className="workbench-block-combo-create">
                      <label className="form-field">
                        <span>현재 시퀀스 동작들을 재사용 블록으로 묶기</span>
                        <input
                          type="text"
                          value={blockTitleInput}
                          onChange={(event) => setBlockTitleInput(event.target.value)}
                          placeholder={`${s.activeTitle || '오늘의 시퀀스'} 블록`}
                          aria-label="새 재사용 블록 이름"
                        />
                      </label>
                      <div className="workbench-block-combo-actions">
                        <PfButton variant="secondary" onClick={handleCombineCurrentStepsToBlock}>
                          현재 동작 묶어 블록 저장
                        </PfButton>
                        <PfButton variant="text" onClick={() => setPresetsOpen(true)}>
                          <Copy size={14} aria-hidden="true" /> 프리셋·동작 묶음 열기
                        </PfButton>
                      </div>
                    </div>
                    {savedReusableBlocks.length > 0 && (
                      <div
                        className="workbench-block-combo-list"
                        aria-label="내 저장된 재사용 블록"
                      >
                        {savedReusableBlocks.map((block) => {
                          const summary = getReusableBlockTimingSummary(block);
                          const canReduceMin = summary.totalDurationMin > 2;
                          return (
                            <div key={block.id} className="workbench-block-combo-item">
                              <div>
                                <strong>{block.title}</strong>
                                <span>
                                  {block.items.length}개 동작 · 총 {summary.totalDurationMin}분 (v
                                  {block.version})
                                </span>
                                <span
                                  className="workbench-block-combo-subbreakdown"
                                  aria-label="블록 세부 시간 요약"
                                >
                                  동작 {summary.movementSec}초 · 설명 {summary.explanationSec}초 · 전환{' '}
                                  {summary.transitionSec}초
                                </span>
                              </div>
                              <div
                                className="workbench-block-combo-scale-actions"
                                role="group"
                                aria-label={`${block.title} 시간 조정 삽입`}
                              >
                                <button
                                  type="button"
                                  className="workbench-combo-scale-btn"
                                  disabled={!canReduceMin}
                                  onClick={() => handleInsertReusableBlock(block.id, -1)}
                                  aria-label={`${block.title} 1분 줄여 넣기`}
                                >
                                  -1분
                                </button>
                                <PfButton
                                  variant="secondary"
                                  onClick={() => handleInsertReusableBlock(block.id, 0)}
                                  aria-label={`${block.title} 수업에 블록 넣기`}
                                >
                                  수업에 블록 넣기
                                </PfButton>
                                <button
                                  type="button"
                                  className="workbench-combo-scale-btn"
                                  onClick={() => handleInsertReusableBlock(block.id, 1)}
                                  aria-label={`${block.title} 1분 늘려 넣기`}
                                >
                                  +1분
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </details>
                <WorkbenchHierarchySummary
                  activeSteps={s.activeSteps}
                  sectionCount={sectionRuns.length}
                  exerciseStepCount={exerciseStepCount}
                />
                <div className="sequence-tools">
                  <PfButton variant="text" onClick={openExerciseFinder}>
                    <Plus size={16} aria-hidden="true" />
                    동작 더 담기
                  </PfButton>
                  <PfButton variant="text" onClick={() => openIdeaSheet(null)}>
                    <Sparkles size={15} aria-hidden="true" />한 줄 동작 메모
                  </PfButton>
                  <PfButton
                    variant="text"
                    onClick={() => {
                      const canUndo = usePilatesStore.getState().undoStack.length > 0;
                      s.undoSequence();
                      setNotice(
                        canUndo
                          ? `이전 순서로 되돌렸어요. 현재 총 ${usePilatesStore.getState().activeSteps.length}개 항목입니다.`
                          : '되돌릴 이전 순서 기록이 없습니다.',
                      );
                    }}
                  >
                    <RotateCcw size={14} />
                    되돌리기
                  </PfButton>
                </div>
              </div>
            </>
          )}
          {s.activeSteps.length > 0 && (
            <p className="composition-order-hint">
              ‘끌기’ 손잡이로 순서 변경 · 위·아래 버튼도 가능
              <span className="composition-keyboard-hint">
                키보드: 방향키 한 칸 · Home/End 처음·끝 · Esc 드래그 취소
              </span>
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
                            onMove={(direction) => {
                              s.moveStep(index, direction);
                              const nextIndex = direction === 'up' ? index - 1 : index + 1;
                              setNotice(
                                `${index + 1}번 휴식 순서를 ${nextIndex + 1}번째 위치로 바꿨어요. 되돌릴 수 있습니다.`,
                              );
                            }}
                            onRemove={() => {
                              s.removeStep(index);
                              setNotice(
                                `${index + 1}번 휴식을 수업안에서 뺐어요. 되돌릴 수 있습니다.`,
                              );
                            }}
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
                              <strong style={{ wordBreak: 'keep-all', overflowWrap: 'break-word' }}>
                                {ex.nameKo}
                              </strong>
                              <span style={{ wordBreak: 'keep-all', overflowWrap: 'break-word' }}>
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
            <details className="workbench-generation-details">
              <summary>조건 불러오기·자동 구성</summary>
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
            </details>
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
              <PfButton
                variant="secondary"
                className="workbench-add-movement"
                onClick={openExerciseFinder}
              >
                <Plus size={18} aria-hidden="true" /> 동작 추가
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
              {startReadiness}
            </p>
          )}
          {s.activeSteps.length > 0 && pendingStepCount > 0 && (
            <details className="workbench-material-notes">
              <summary>자료 안내</summary>
              <p>
                미검토 자료 {pendingStepCount}개 · 검토 기록은 선택 사항입니다. 기록 유무는 동작의
                정확성이나 개인별 운동 적합성을 보장하지 않습니다.
              </p>
            </details>
          )}
          {s.activeSteps.length > 0 && ideasSectionNode}
          {s.activeSteps.length > 0 && (
            <section className="pf-flow-continuation" aria-label="핵심 흐름 이어가기">
              <div className="pf-flow-continuation__copy">
                <strong>다음 단계로 바로 이어가기</strong>
                <p className="sr-only">
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
          {!s.activeSteps.length && (
            <details className="workbench-automation-tools workbench-motion-gallery-disclosure">
              <summary>
                <span>도해 초안 둘러보기 (선택)</span>
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
          {s.activeSteps.length > 0 && (
            <details
              className="workbench-automation-tools workbench-flow-telemetry-details"
              open={flowTelemetryOpen}
              onToggle={(event) => setFlowTelemetryOpen(event.currentTarget.open)}
            >
              <summary>기구 세팅 전환·척추 움직임 밸런스·3D 뷰포트 점검 (선택)</summary>
              {flowTelemetryOpen && (
                <div style={{ display: 'grid', gap: '12px' }}>
                  <StudioReadinessAuditCard
                    steps={s.activeSteps}
                    exercisesById={exerciseMap}
                    level={criteria.level}
                    reformerBrand={s.reformerBrand}
                  />
                  <StudioFlowOptimizerPanel
                    sequenceTitle={s.activeTitle}
                    steps={s.activeSteps}
                    exercisesById={exerciseMap}
                    criteria={criteria}
                    reformerBrand={s.reformerBrand}
                    onApplySteps={(nextSteps, noticeMessage) => {
                      usePilatesStore.setState({
                        activeSteps: nextSteps,
                        saveFeedback: noticeMessage,
                      });
                      setNotice(noticeMessage);
                    }}
                    onApplyAngleConcept={(suggestedTitleKo, suggestedSubtitleKo, noticeMessage) => {
                      s.setActiveSequenceMeta({
                        title: suggestedTitleKo,
                        subtitle: suggestedSubtitleKo,
                      });
                      usePilatesStore.setState({
                        saveFeedback: noticeMessage,
                      });
                      setNotice(noticeMessage);
                    }}
                  />
                  <SequenceFlowTelemetryStrip
                    steps={s.activeSteps}
                    exercisesById={exerciseMap}
                    onApplyTransitionBuffers={(nextSteps) => {
                      usePilatesStore.setState({
                        activeSteps: nextSteps,
                        saveFeedback:
                          '기구·체위 전환 구간에 권장 여유 시간(Transition Buffer)을 반영했어요.',
                      });
                    }}
                    onSelectStep={(stepId) => {
                      setPreviewStep(stepId);
                    }}
                  />
                  <DurationCalibrationBanner
                    historyLogs={s.historyLogs}
                    activeSteps={s.activeSteps}
                    groupId={criteria.targetGroupId ?? 'all'}
                    onApplyCalibratedSteps={(nextSteps, noticeMessage) => {
                      usePilatesStore.setState({
                        activeSteps: nextSteps,
                        saveFeedback: noticeMessage,
                      });
                      setNotice(noticeMessage);
                    }}
                  />
                  {(() => {
                    const focusStep = selectedStep ?? s.activeSteps.find((st) => !isRestStep(st));
                    const focusEx = focusStep ? exerciseMap.get(focusStep.exerciseId) : undefined;
                    return (
                      <Apparatus3dRigPreviewCard
                        apparatus={focusEx?.apparatus ?? (s.activeApparatus === 'mixed' ? 'reformer' : s.activeApparatus)}
                        bodyPosition={focusEx?.bodyPosition ?? 'supine'}
                        springsLabel={focusStep?.customSpringOverride || focusEx?.springs}
                        exerciseTitleKo={focusEx?.nameKo}
                      />
                    );
                  })()}
                  <CurriculumProgressionPanel
                    groupId={criteria.targetGroupId ?? 'all'}
                    groupName={s.classGroups.find((g) => g.id === criteria.targetGroupId)?.name ?? '전체 반'}
                    baseLevel={criteria.level}
                    historyLogs={s.historyLogs}
                    exercises={s.exercises}
                  />
                </div>
              )}
            </details>
          )}
          <details
            className="workbench-automation-tools workbench-free-ai-details"
            open={freeAiOpen}
            onToggle={(event) => setFreeAiOpen(event.currentTarget.open)}
          >
            <summary>AI 수업 도우미 (선택)</summary>
            <p className="pf-text-sm sr-only">무료 한도 보호 · 소진 시 로컬 전환</p>
            {freeAiOpen && (
              <Suspense fallback={<p className="pf-text-sm">AI 도우미를 불러오는 중...</p>}>
                <LazyFreeAiAssistantPanel
                  exercises={s.exercises}
                  reusableBlocks={p5ReusableBlocks}
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
            )}
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
        {wideEditor && selectedStep && (
          <aside className="v2-inline-finder" aria-label="선택 동작 속성">
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
                  syncRecoveryState(value);
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
          </aside>
        )}
      </div>
      <nav
        className="pf-step-guide-bar workbench-mobile-step-bar"
        aria-label="수업 준비 단계 이동"
        data-testid="workbench-mobile-step-bar"
        style={{ wordBreak: 'keep-all' }}
      >
        <div className="pf-step-guide-subrow" style={{ wordBreak: 'keep-all' }}>
          <span
            className="pf-step-guide-focus"
            data-testid="workbench-current-step-guide"
            style={{ wordBreak: 'keep-all' }}
          >
            {!s.activeSteps.length || finderOpen || workflowStep === 'select'
              ? '현재 1단계: 동작 고르기 · 수업에 넣을 동작을 고른 뒤 다음 단계에서 순서를 확인하세요.'
              : '현재 2단계: 수업 구성 확인 · 블록 순서와 시간을 점검하고 저장하거나 미리보기를 여세요.'}
          </span>
          <div className="pf-step-guide-nav" style={{ wordBreak: 'keep-all' }}>
            <button
              type="button"
              className="pf-step-nav-btn"
              data-testid="workbench-step-prev"
              style={{ minHeight: '44px', wordBreak: 'keep-all' }}
              aria-current={
                !planPreviewOpen &&
                (finderOpen || workflowStep === 'select' || !s.activeSteps.length)
                  ? 'step'
                  : undefined
              }
              onClick={() => {
                closeInspector();
                setPlanPreviewOpen(false);
                setWorkflowStep('select');
              }}
            >
              이전 단계: 동작 고르기
            </button>
            <button
              type="button"
              className="pf-step-nav-btn"
              data-testid="workbench-step-next"
              style={{ minHeight: '44px', wordBreak: 'keep-all' }}
              disabled={!s.activeSteps.length}
              aria-current={
                !planPreviewOpen &&
                !finderOpen &&
                workflowStep === 'arrange' &&
                s.activeSteps.length > 0
                  ? 'step'
                  : undefined
              }
              onClick={arrangeSequence}
            >
              다음 단계: 수업 구성 확인
            </button>
          </div>
        </div>
      </nav>
      <NextClassBanner collapseEmpty />
      <details className="workbench-navigation-details">
        <summary>수업 준비 순서</summary>
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
      </details>
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
                syncRecoveryState(value);
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
        open={finderOpen}
        onClose={() => {
          if (finderContentRef.current?.closest('dialog')?.open) return;
          closeFinder();
        }}
        title="수업에 넣을 동작 고르기"
        subtitle="상세를 확인하고 추가하면 현재 수업안에 그대로 담깁니다."
        className="workbench-finder-dialog"
        maxWidth="760px"
      >
        <div
          ref={finderContentRef}
          className="workbench-finder-content"
          onKeyDownCapture={(event) => {
            // Chrome consumes Escape in search inputs to clear their value.
            // Here Escape closes the temporary picker and preserves the query.
            if (
              event.key === 'Escape' &&
              event.target instanceof HTMLInputElement &&
              event.target.type === 'search'
            ) {
              event.preventDefault();
              event.stopPropagation();
              closeFinder();
            }
          }}
        >
          {finderHasOpened && (
            <InlineExerciseFinder
              active={finderOpen}
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
          <nav
            className="pf-step-guide-bar"
            aria-label="수업 조건 설정 단계"
            data-testid="conditions-step-guide"
          >
            <ol className="pf-step-guide-list">
              {(
                [
                  { step: 1 as const, label: '1 시간·목표' },
                  { step: 2 as const, label: '2 사용할 기구' },
                  { step: 3 as const, label: '3 난이도·소도구' },
                ] as const
              ).map((item) => (
                <li key={item.step}>
                  <button
                    type="button"
                    aria-current={conditionStep === item.step ? 'step' : undefined}
                    className={`pf-step-guide-chip ${conditionStep === item.step ? 'is-active' : ''}`}
                    onClick={() => navigateConditionStep(item.step)}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ol>
            <div className="pf-step-guide-subrow">
              <span className="pf-step-guide-focus" role="status" aria-live="polite">
                {conditionStep === 1 &&
                  '지금 할 일: 수업 시간(30/50/60분)과 오늘의 목표를 선택하세요.'}
                {conditionStep === 2 &&
                  '지금 할 일: 이번 수업에 사용할 기구를 1개 이상 선택하세요.'}
                {conditionStep === 3 &&
                  '지금 할 일: 최대 난이도와 반 별칭·소도구 조건을 확인한 뒤 초안을 구성하세요.'}
              </span>
              <div className="pf-step-guide-nav">
                <button
                  type="button"
                  className="pf-step-nav-btn"
                  disabled={conditionStep === 1}
                  onClick={() =>
                    navigateConditionStep(conditionStep === 3 ? 2 : 1)
                  }
                >
                  이전 단계
                </button>
                <button
                  type="button"
                  className="pf-step-nav-btn"
                  disabled={conditionStep === 3}
                  onClick={() =>
                    navigateConditionStep(conditionStep === 1 ? 2 : 3)
                  }
                >
                  다음 단계
                </button>
              </div>
            </div>
          </nav>
          <section className="panel class-brief" aria-label="수업 조건">
            <div className="section-heading">
              <h2>수업 조건</h2>
              <SlidersHorizontal size={19} strokeWidth={1.5} />
            </div>
            <fieldset
              ref={conditionStep1Ref}
              className={`brief-field ${conditionStep === 1 ? 'is-step-focused' : ''}`}
              onFocusCapture={() => setConditionStep(1)}
            >
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
            <fieldset
              className={`brief-field ${conditionStep === 1 ? 'is-step-focused' : ''}`}
              onFocusCapture={() => setConditionStep(1)}
            >
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
            <fieldset
              ref={conditionStep2Ref}
              className={`brief-field ${conditionStep === 2 ? 'is-step-focused' : ''}`}
              onFocusCapture={() => setConditionStep(2)}
            >
              <legend>이번 수업에 사용할 기구</legend>
              <p className="muted">
                여러 기구를 함께 선택할 수 있습니다. 선택한 각 기구의 승인 동작을 포함합니다.
              </p>
              <div className="equipment-choice-grid">
                {EQUIPMENT_OPTIONS.map((equipment) => (
                  <EquipmentChoice
                    key={equipment.id}
                    equipmentId={equipment.id}
                    label={equipment.labelKo}
                    unavailable={!s.ownedEquipment.includes(equipment.id)}
                    checked={selectedEquipment.includes(equipment.id)}
                    disabled={!s.ownedEquipment.includes(equipment.id)}
                    onChange={() => {
                      const next = selectedEquipment.includes(equipment.id)
                        ? selectedEquipment.filter((id) => id !== equipment.id)
                        : [...selectedEquipment, equipment.id];
                      setCriteria({ ...criteria, availableEquipment: next });
                    }}
                  />
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
            <div
              ref={conditionStep3Ref}
              className={`brief-pair ${conditionStep === 3 ? 'is-step-focused' : ''}`}
              onFocusCapture={() => setConditionStep(3)}
            >
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
      <LightDismissDialog
        open={presetsOpen}
        onClose={() => setPresetsOpen(false)}
        title="프리셋·동작 묶음"
        subtitle="무료 오프라인 템플릿 · 선택 후 복사해서 편집"
        maxWidth="860px"
      >
        {presetsOpen && (
          <Suspense fallback={<p role="status">프리셋을 불러오는 중입니다.</p>}>
            <LazyOfflinePresetPicker
              onApplied={(message) => {
                setNotice(message);
                setWorkflowStep('arrange');
                setPresetsOpen(false);
              }}
            />
          </Suspense>
        )}
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
