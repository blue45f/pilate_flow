import { EquipmentChoice } from './EquipmentChoice';
import { VisualApparatusPhotoStrip, VisualSequenceFilmstrip } from './VisualFlowComponents';
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
import { APPARATUS_LABELS, PROP_LABELS } from '../data/pilatesCatalog';
import {
  EQUIPMENT_OPTIONS,
  getEquipmentFamilies,
  getEquipmentFamily,
  getExerciseEquipment,
  isEquipmentId,
} from '../data/equipmentCatalog';
import { canonicalRecoveryContent } from '../utils/backupRecoveryInspection';
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
import './SequenceWorkbench.usability.css';
import {
  addMovementIdeaToCurrentClass,
  duplicateIdeaReusableBlock,
  getReusableBlockTimingSummary,
  getSavedReusableBlocks,
  insertIdeaReusableBlockToCurrentClass,
  isMovementIdeaExercise,
  readMovementIdeaDraft,
  saveSequenceStepsAsReusableBlock,
  syncSequenceBlockInstanceToLatest,
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
import { StudioCircuitPlannerCard } from './StudioCircuitPlannerCard';
import { buildAdaptiveNextClassDraft } from '../utils/historyAdaptiveBridge';
import {
  BLANK_DRAFT_STARTER_OPTIONS,
  OFFLINE_BLOCK_PRESETS,
} from '../data/classBlockPresets';
import {
  startFromBlankDraftOption,
  toP5ReusableBlockContract,
} from '../utils/classBlockPresetValidator';
import { Apparatus3dRigPreviewCard } from './Apparatus3dRigPreviewCard';
import { ApparatusVisualGuideRibbon } from './ApparatusVisualGuideRibbon';
import { CurriculumProgressionPanel } from './workbench/CurriculumProgressionPanel';
import { DurationCalibrationBanner } from './workbench/DurationCalibrationBanner';
import { StudioFlowOptimizerPanel } from './workbench/StudioFlowOptimizerPanel';
import { StudioReadinessAuditCard } from './workbench/StudioReadinessAuditCard';
import { SpringVisualPills } from './SpringVisualPills';
import { AtelierQuickStartGallery } from './workbench/AtelierQuickStartGallery';
import { SequenceQuickFlowCoachStrip } from './workbench/SequenceQuickFlowCoachStrip';
import { WorkbenchBlankStarters } from './workbench/WorkbenchBlankStarters';
import { WorkbenchHierarchySummary } from './workbench/WorkbenchHierarchySummary';
import { resolveClassCardVisualMeta } from '../utils/memberBookingBridge';
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

import { Studio3DMotionHeroCard } from './Studio3DMotionHeroCard';
import {
  getApparatusPrimary3DThumb,
  resolveStudio3DMotionForExercise,
} from '../utils/studio3dMotionCatalog';

function WorkbenchMovementMark({
  exercise,
  springsOverride,
}: {
  exercise: PilatesExercise;
  springsOverride?: string;
}) {
  const studio3d = resolveStudio3DMotionForExercise(exercise);
  const effectiveSprings = (springsOverride || exercise.springs || '').trim();
  const primaryMuscle = exercise.targetMuscles[0] || '코어·정렬';
  return (
    <span
      className="workbench-movement-mark pf-b05-card-3d-mark"
      title={`${studio3d.titleKo} · 3D 스튜디오 모션`}
    >
      <img
        src={studio3d.peakImg}
        alt=""
        aria-hidden="true"
        className="pf-workbench-3d-mini-thumb pf-b05-card-3d-img"
        loading="lazy"
      />
      <span className="pf-b05-card-overlay-top" aria-hidden="true">
        <span className="pf-b05-pill is-dark">◐ 궤적+근육</span>
        {effectiveSprings && <span className="pf-b05-pill is-light">{effectiveSprings}</span>}
      </span>
      <span className="pf-b05-card-overlay-bottom" aria-hidden="true">
        <span className="pf-b05-pill is-coral">● {primaryMuscle}</span>
      </span>
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
  const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const captureUndoSnapshot = (current: ReturnType<typeof usePilatesStore.getState>) => ({
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
  });
  const normalizeStepForSave = (step: SequenceStep): SequenceStep =>
    step.selectedLayer ? step : { ...step, selectedLayer: 'standard' };
  const serializeSemanticSteps = (steps: readonly SequenceStep[]) =>
    canonicalRecoveryContent(
      steps.map((step) =>
        Object.fromEntries(
          Object.entries(normalizeStepForSave(step)).filter(([key]) => key !== 'stepId'),
        ),
      ),
    );
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);
  const [replaceSearch, setReplaceSearch] = useState('');
  const [replaceFromInspector, setReplaceFromInspector] = useState(false);
  const replaceOpenerRef = useRef<HTMLElement | null>(null);
  const replaceSearchInputRef = useRef<HTMLInputElement>(null);
  const replaceSuspendedRef = useRef(false);
  const conditionsOpenerRef = useRef<HTMLElement | null>(null);
  const conditionsSuspendedRef = useRef(Boolean(initialRecovery?.conditionsOpen));
  const lastBlankResetAtRef = useRef(0);
  const lastSavedCopySignatureRef = useRef<string | null>(null);
  const lastCalibratedSignatureRef = useRef<string | null>(null);
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
  const [workflowStep, setWorkflowStepState] = useState<'select' | 'arrange'>(
    () => initialRecovery?.workflowStep ?? (s.activeSteps.length ? 'arrange' : 'select'),
  );
  const [manualWizardPage, setManualWizardPage] = useState<
    'home' | 'step1' | 'step2' | 'arrange' | null
  >(null);
  const setWorkflowStep = useCallback((nextStep: 'select' | 'arrange') => {
    setWorkflowStepState(nextStep);
    if (nextStep === 'arrange') {
      setManualWizardPage((prev) =>
        prev === 'step1' || prev === 'step2' || prev === 'home' ? 'arrange' : prev,
      );
    } else {
      setManualWizardPage((prev) => (prev === 'arrange' ? null : prev));
    }
  }, []);
  const activeWizardPage: 'home' | 'step1' | 'step2' | 'arrange' =
    manualWizardPage === 'step1' || manualWizardPage === 'step2'
      ? manualWizardPage
      : manualWizardPage === 'home'
        ? 'home'
        : s.activeSteps.length > 0
          ? 'arrange'
          : 'home';
  const isArrangeStage = activeWizardPage === 'arrange';
  const [step2AiOpen, setStep2AiOpen] = useState(false);
  const [justSavedPulse, setJustSavedPulse] = useState(false);
  const [justUpdatedStepId, setJustUpdatedStepId] = useState<string | null>(null);
  useEffect(() => {
    if (!justSavedPulse) return;
    const timer = window.setTimeout(() => setJustSavedPulse(false), 900);
    return () => window.clearTimeout(timer);
  }, [justSavedPulse]);
  useEffect(() => {
    if (!justUpdatedStepId) return;
    const timer = window.setTimeout(() => setJustUpdatedStepId(null), 700);
    return () => window.clearTimeout(timer);
  }, [justUpdatedStepId]);
  const [freeAiOpen, setFreeAiOpen] = useState(false);
  const openContextualAiAssistant = useCallback(() => {
    setFreeAiOpen(true);
    requestAnimationFrame(() => {
      const reduced =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      document.querySelector<HTMLElement>('.workbench-free-ai-details')?.scrollIntoView?.({
        block: 'nearest',
        behavior: reduced ? 'auto' : 'smooth',
      });
    });
  }, []);
  const [sequenceViewMode, setSequenceViewMode] = useState<
    'split' | 'list' | 'columns' | 'timeline'
  >('list');
  const [gapFillOpen, setGapFillOpen] = useState(false);
  const finderContentRef = useRef<HTMLDivElement>(null);
  const finderOpener = useRef<HTMLElement | null>(null);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [aiCopilotOpen, setAiCopilotOpen] = useState(false);
  const [flowTelemetryOpen, setFlowTelemetryOpen] = useState(false);
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
  useEffect(() => {
    if (replaceIndex === null) {
      replaceSuspendedRef.current = false;
      return;
    }
    requestAnimationFrame(() => {
      replaceSearchInputRef.current?.focus();
    });
  }, [replaceIndex]);
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
    // Source lookup, replacement modal, or conditions dialog suspends the mobile sheet;
    // layout changes also emit native close.
    if (
      sourceDetailOpenRef.current ||
      replaceSuspendedRef.current ||
      conditionsSuspendedRef.current ||
      window.innerWidth >= 1200 ||
      inspectorContentRef.current?.closest('dialog')?.open
    )
      return;
    closeInspector();
  }, [closeInspector]);
  const openReplaceForStep = (
    stepIndex: number,
    fromInspector: boolean,
    opener?: HTMLElement | null,
  ) => {
    replaceSuspendedRef.current = fromInspector;
    setReplaceFromInspector(fromInspector);
    replaceOpenerRef.current =
      opener ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setReplaceSearch('');
    setReplaceIndex(stepIndex);
  };
  const cancelReplaceDialog = () => {
    const wasFromInspector = replaceFromInspector;
    setReplaceIndex(null);
    setReplaceSearch('');
    setReplaceFromInspector(false);
    requestAnimationFrame(() => {
      if (wasFromInspector && !wideEditor) {
        const inspectorTrigger = Array.from(
          inspectorContentRef.current?.querySelectorAll<HTMLElement>(
            '.step-inspector-footer button',
          ) ?? [],
        ).find((btn) => btn.textContent?.includes('동작 교체'));
        if (inspectorTrigger) {
          inspectorTrigger.focus();
          return;
        }
      }
      if (replaceOpenerRef.current?.isConnected) {
        replaceOpenerRef.current.focus();
      }
    });
  };
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
    const scrollBehavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth';
    requestAnimationFrame(() => {
      if (nextStep === 1) {
        conditionStep1Ref.current?.scrollIntoView?.({ behavior: scrollBehavior, block: 'nearest' });
      } else if (nextStep === 2) {
        conditionStep2Ref.current?.scrollIntoView?.({ behavior: scrollBehavior, block: 'nearest' });
      } else {
        conditionStep3Ref.current?.scrollIntoView?.({ behavior: scrollBehavior, block: 'nearest' });
      }
    });
  };
  const openConditionsDialog = (opener?: HTMLElement | null) => {
    conditionsSuspendedRef.current = true;
    conditionsOpenerRef.current =
      opener ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setConditionsOpen(true);
  };
  const closeConditions = () => {
    const dialog = conditionsContentRef.current?.closest('dialog');
    if (dialog?.open) dialog.close();
    setConditionsOpen(false);
    requestAnimationFrame(() => {
      if (conditionsOpenerRef.current?.isConnected && !document.querySelector('dialog[open]')) {
        conditionsOpenerRef.current.focus();
      }
    });
  };
  useEffect(() => {
    if (!conditionsOpen) conditionsSuspendedRef.current = false;
  }, [conditionsOpen]);
  useEffect(() => {
    return usePilatesStore.subscribe((state, prev) => {
      if (
        state.activeSequenceId === prev.activeSequenceId &&
        state.activeTargetGroupId !== prev.activeTargetGroupId &&
        state.draftCriteria &&
        state.draftCriteria.targetGroupId !== state.activeTargetGroupId
      ) {
        state.setDraftCriteria({
          ...state.draftCriteria,
          targetGroupId: state.activeTargetGroupId,
        });
      }
    });
  }, []);
  const performUndoSequence = () => {
    const canUndo = usePilatesStore.getState().undoStack.length > 0;
    s.undoSequence();
    const afterSteps = usePilatesStore.getState().activeSteps;
    if (canUndo && afterSteps.length > 0) {
      setWorkflowStep('arrange');
    }
    setNotice(
      canUndo
        ? `이전 순서로 되돌렸어요. 현재 총 ${afterSteps.length}개 항목입니다.`
        : '되돌릴 이전 순서 기록이 없습니다.',
    );
  };
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (!(event.metaKey || event.ctrlKey) || event.shiftKey || event.altKey) return;
      if (event.key.toLowerCase() !== 'z') return;
      if (document.querySelector('dialog[open]')) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return;
      }
      const storeState = usePilatesStore.getState();
      if (!storeState.undoStack.length) return;
      event.preventDefault();
      storeState.undoSequence();
      const afterSteps = usePilatesStore.getState().activeSteps;
      if (afterSteps.length > 0) {
        setWorkflowStep('arrange');
      }
      setNotice(`이전 순서로 되돌렸어요. 현재 총 ${afterSteps.length}개 항목입니다.`);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setWorkflowStep]);
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
  const adjustableExerciseSteps = s.activeSteps.filter(
    (step) => !step.locked && !isRestStep(step),
  );
  const lockedAndRestSec = s.activeSteps
    .filter((step) => step.locked || isRestStep(step))
    .reduce((sum, step) => sum + getStepTiming(step).totalSec, 0);
  const remainingFitSec = Math.round(s.activeTargetMinutes * 60) - lockedAndRestSec;
  const adjustableMinSecs = adjustableExerciseSteps.map((step) =>
    Math.ceil(Math.max(60, (step.explanationSec ?? 0) + (step.transitionSec ?? 0) + 30)),
  );
  const adjustableMinTotalSec = adjustableMinSecs.reduce((sum, sec) => sum + sec, 0);
  const maxSingleStepSec = 20 * 60;
  const canAutoFitDuration =
    s.activeSteps.length > 0 &&
    Number.isFinite(s.activeTargetMinutes) &&
    s.activeTargetMinutes >= 10 &&
    s.activeTargetMinutes <= 120 &&
    durations.restSec < Math.round(s.activeTargetMinutes * 60) &&
    adjustableExerciseSteps.length > 0 &&
    remainingFitSec >= adjustableMinTotalSec &&
    adjustableMinSecs.every((sec) => sec <= maxSingleStepSec) &&
    remainingFitSec <= adjustableExerciseSteps.length * maxSingleStepSec;
  const needsMoreExercisesForTarget =
    delta < 0 &&
    adjustableExerciseSteps.length > 0 &&
    remainingFitSec > adjustableExerciseSteps.length * maxSingleStepSec;
  const allExercisesLockedForTarget =
    delta !== 0 && exerciseStepCount > 0 && adjustableExerciseSteps.length === 0;
  const normalizedStepsForSave = s.activeSteps.map(normalizeStepForSave);
  const criteriaSourceForSave = s.draftCriteria ?? s.lastCriteria;
  const expectedCriteriaSnapshot: AutoGenerateCriteria | null =
    Number.isFinite(s.activeTargetMinutes) &&
    s.activeTargetMinutes >= 10 &&
    s.activeTargetMinutes <= 120
      ? (() => {
          const actual = normalizedStepsForSave
            .flatMap((step) => {
              const exercise = exerciseMap.get(step.exerciseId);
              return exercise ? getExerciseEquipment(exercise).requiredEquipment : [];
            })
            .filter(isEquipmentId);
          const actualEquipment = [
            ...new Set(
              actual.length ? actual : s.activeApparatus === 'mixed' ? [] : [s.activeApparatus],
            ),
          ];
          const equipment = [
            ...new Set([
              ...(criteriaSourceForSave?.availableEquipment ?? []).filter(
                (id) => isEquipmentId(id) && actualEquipment.includes(id),
              ),
              ...actualEquipment,
            ]),
          ];
          const requiredProps = normalizedStepsForSave.flatMap((step) => {
            const exercise = exerciseMap.get(step.exerciseId);
            return exercise ? getExerciseEquipment(exercise).requiredProps : [];
          });
          return {
            focusPreset: 'full-body',
            excludeDaysWindow: 14,
            defaultLayer: 'standard',
            ...(criteriaSourceForSave ?? {}),
            apparatus: s.activeApparatus,
            level: s.activeLevel,
            targetMinutes: Math.max(10, Math.min(120, s.activeTargetMinutes)),
            restMinutes: getSequenceDurations(normalizedStepsForSave).restSec / 60,
            availableEquipment: equipment,
            ownedApparatus: getEquipmentFamilies(equipment),
            preferredProps: [
              ...new Set([...(criteriaSourceForSave?.preferredProps ?? []), ...requiredProps]),
            ],
            targetGroupId: criteriaSourceForSave?.targetGroupId ?? s.activeTargetGroupId,
          };
        })()
      : null;
  const matchedSavedSequence = s.savedSequences.find((item) => item.id === s.activeSequenceId);
  const isSavedClean = Boolean(
    s.activeSteps.length > 0 &&
      matchedSavedSequence &&
      matchedSavedSequence.criteriaSnapshot !== undefined &&
      expectedCriteriaSnapshot !== null &&
      matchedSavedSequence.title === s.activeTitle &&
      matchedSavedSequence.subtitle === s.activeSubtitle &&
      matchedSavedSequence.apparatus === s.activeApparatus &&
      matchedSavedSequence.level === s.activeLevel &&
      matchedSavedSequence.targetMinutes === s.activeTargetMinutes &&
      canonicalRecoveryContent(matchedSavedSequence.steps) ===
        canonicalRecoveryContent(normalizedStepsForSave) &&
      canonicalRecoveryContent(matchedSavedSequence.criteriaSnapshot) ===
        canonicalRecoveryContent(expectedCriteriaSnapshot),
  );
  const blockingReadinessReason = readiness.gate.reasons.find(
    (item) => item.code !== 'target-mismatch' && item.code !== 'duplicate-movement',
  );
  const blockingStepIndex =
    blockingReadinessReason && blockingReadinessReason.stepIndices.length > 0
      ? blockingReadinessReason.stepIndices[0]!
      : null;
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
  const phaseSecTotals = s.activeSteps.reduce(
    (acc, step, index) => {
      const secId = resolvedSectionIds[index] ?? sectionOf(step);
      const stepSec = getStepTiming(step, exerciseMap.get(step.exerciseId)).totalSec;
      if (secId === 'warmup') acc.warmupSec += stepSec;
      else if (secId === 'main') acc.mainSec += stepSec;
      else if (secId === 'cooldown') acc.cooldownSec += stepSec;
      return acc;
    },
    { warmupSec: 0, mainSec: 0, cooldownSec: 0 },
  );
  const phaseExerciseSecTotal = Math.max(
    phaseSecTotals.warmupSec + phaseSecTotals.mainSec + phaseSecTotals.cooldownSec,
    1,
  );
  const applyQuickStartRecipe = (payload: {
    readonly title: string;
    readonly subtitle: string;
    readonly targetMinutes: number;
    readonly level: DifficultyLevel;
    readonly apparatus: AutoGenerateCriteria['apparatus'];
    readonly steps: SequenceStep[];
    readonly recipeTitleKo: string;
  }) => {
    if (!payload.steps.length) {
      const emptyMsg = `‘${payload.recipeTitleKo}’ 조건에 맞는 동작 자료가 없어 현재 수업안을 유지했습니다.`;
      usePilatesStore.setState({ generationError: emptyMsg });
      setNotice(emptyMsg);
      return;
    }
    const current = usePilatesStore.getState();
    const stepExMap = new Map(current.exercises.map((item) => [item.id, item]));
    const recipeEquipment = [
      ...new Set(
        payload.steps.flatMap((step) => {
          const ex = stepExMap.get(step.exerciseId);
          return ex ? getExerciseEquipment(ex).requiredEquipment : [];
        }),
      ),
    ];
    const nextEquipment = recipeEquipment.length
      ? recipeEquipment
      : payload.apparatus === 'mixed'
        ? [...current.ownedEquipment]
        : [payload.apparatus];
    const nextDraftCriteria = withExactSelection({
      ...(current.draftCriteria ?? current.lastCriteria ?? criteria),
      apparatus: payload.apparatus,
      availableEquipment: nextEquipment,
      ownedApparatus: getEquipmentFamilies(nextEquipment),
      level: payload.level,
      targetMinutes: payload.targetMinutes,
      defaultLayer:
        payload.level === '1.0' ? 'easy' : payload.level === '2.0' ? 'hard' : 'standard',
    });
    const normalizedSteps = payload.steps.map((step) =>
      step.selectedLayer ? step : { ...step, selectedLayer: 'standard' as const },
    );
    if (
      current.activeTitle === payload.title &&
      current.activeSubtitle === payload.subtitle &&
      current.activeTargetMinutes === payload.targetMinutes &&
      current.activeLevel === payload.level &&
      current.activeApparatus === payload.apparatus &&
      serializeSemanticSteps(current.activeSteps) === serializeSemanticSteps(normalizedSteps)
    ) {
      setWorkflowStep('arrange');
      setNotice(`이미 ‘${payload.recipeTitleKo}’ 시퀀스가 열려 있습니다.`);
      return;
    }
    const snapshot = captureUndoSnapshot(current);
    usePilatesStore.setState({
      undoStack: [...current.undoStack.slice(-19), snapshot],
      activeTitle: payload.title,
      activeSubtitle: payload.subtitle,
      activeTargetMinutes: payload.targetMinutes,
      activeLevel: payload.level,
      activeApparatus: payload.apparatus,
      draftCriteria: nextDraftCriteria,
      activeSteps: normalizedSteps,
      generationError: null,
      saveFeedback: `‘${payload.recipeTitleKo}’ 시퀀스를 바로 열었습니다.`,
    });
    setWorkflowStep('arrange');
    setNotice(`‘${payload.recipeTitleKo}’ 시퀀스를 바로 열었습니다. 원하는 동작만 자유롭게 조정해 보세요.`);
  };
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
  const gapFillCandidates: PilatesExercise[] =
    !s.activeSteps.length || delta >= 0
      ? []
      : (() => {
          const usedKeys = new Set(activeMovementKeys);
          const effectiveEq = currentStepEquipment.length
            ? currentStepEquipment
            : equipmentSelection(s.lastCriteria ?? criteria);
          const effectiveApparatus =
            effectiveEq.length === 1
              ? (getEquipmentFamily(effectiveEq[0]) ?? s.activeApparatus)
              : effectiveEq.length > 1
                ? 'mixed'
                : s.activeApparatus;
          const picked: PilatesExercise[] = [];
          for (const ex of s.exercises) {
            if (picked.length >= 2) break;
            if (!isExerciseAuthoringEligible(ex)) continue;
            const key = getMovementKey(ex);
            if (usedKeys.has(key)) continue;
            if (
              !exerciseMatchesCriteria(ex, {
                ...criteria,
                apparatus: effectiveApparatus,
                level: s.activeLevel,
                ownedApparatus: getEquipmentFamilies(effectiveEq),
                availableEquipment: effectiveEq,
                preferredProps: (s.lastCriteria?.preferredProps ?? criteria.preferredProps).filter(
                  (prop) => prop === 'none' || s.ownedProps.includes(prop),
                ),
              })
            ) {
              continue;
            }
            usedKeys.add(key);
            picked.push(ex);
          }
          return picked;
        })();
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
  const [selectedBundleStepIds, setSelectedBundleStepIds] = useState<Set<string>>(() => new Set());
  const [, setBlockLibraryTick] = useState(0);
  const savedReusableBlocks = getSavedReusableBlocks();
  const savedReusableBlockMap = useMemo(
    () => new Map(savedReusableBlocks.map((b) => [b.id, b])),
    [savedReusableBlocks],
  );
  const selectedBundleSteps = useMemo(
    () => s.activeSteps.filter((step) => !isRestStep(step) && selectedBundleStepIds.has(step.stepId)),
    [s.activeSteps, selectedBundleStepIds],
  );
  const selectedBundleStepCount = selectedBundleSteps.length;
  const toggleBundleStepSelection = (stepId: string) => {
    setSelectedBundleStepIds((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  };
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
      starter.starterKind === 'blank-reusable-block' ||
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
      const current = usePilatesStore.getState();
      const normalizedDraftSteps = bundle.sequenceDraft.steps.map((step) =>
        step.selectedLayer ? step : { ...step, selectedLayer: 'standard' as const },
      );
      if (
        current.activeTitle === bundle.sequenceDraft.title &&
        current.activeSubtitle === bundle.sequenceDraft.subtitle &&
        current.activeApparatus === bundle.sequenceDraft.apparatus &&
        current.activeLevel === bundle.sequenceDraft.level &&
        current.activeTargetMinutes === bundle.sequenceDraft.targetMinutes &&
        serializeSemanticSteps(current.activeSteps) === serializeSemanticSteps(normalizedDraftSteps)
      ) {
        setWorkflowStep('arrange');
        setNotice(`이미 ‘${starter.titleKo}’ 초안 틀이 열려 있습니다.`);
        return;
      }
      const snapshot = captureUndoSnapshot(current);
      usePilatesStore.setState({
        undoStack: [...current.undoStack.slice(-19), snapshot],
        activeTitle: bundle.sequenceDraft.title,
        activeSubtitle: bundle.sequenceDraft.subtitle,
        activeApparatus: bundle.sequenceDraft.apparatus,
        activeLevel: bundle.sequenceDraft.level,
        activeTargetMinutes: bundle.sequenceDraft.targetMinutes,
        activeSteps: normalizedDraftSteps,
        generationError: null,
        saveFeedback: `‘${starter.titleKo}’ 초안 틀을 열었습니다.`,
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
    const res = saveSequenceStepsAsReusableBlock({
      steps: nonRestSteps,
      title,
    });
    if (!res.ok) {
      setNotice(res.message);
      return;
    }
    setBlockTitleInput('');
    setBlockLibraryTick((n) => n + 1);
    setNotice(res.message);
  };
  const handleSaveSelectedStepsToBlock = () => {
    if (selectedBundleSteps.length === 0) {
      setNotice('묶음으로 저장할 동작을 먼저 선택해 주세요.');
      return;
    }
    const title =
      blockTitleInput.trim() ||
      `${s.activeTitle || '오늘의 시퀀스'} 선택 묶음 (${selectedBundleSteps.length}동작)`;
    const res = saveSequenceStepsAsReusableBlock({
      steps: selectedBundleSteps,
      title,
    });
    if (!res.ok) {
      setNotice(res.message);
      return;
    }
    setBlockTitleInput('');
    setSelectedBundleStepIds(new Set());
    setBlockLibraryTick((n) => n + 1);
    setNotice(res.message);
  };
  const handleDuplicateReusableBlock = (blockId: string) => {
    const res = duplicateIdeaReusableBlock(blockId);
    setBlockLibraryTick((n) => n + 1);
    setNotice(res.message);
  };
  const handleSyncBlockInstanceToLatest = (blockInstanceId: string, blockId: string) => {
    const res = syncSequenceBlockInstanceToLatest(blockInstanceId, blockId);
    setBlockLibraryTick((n) => n + 1);
    setNotice(res.message);
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
  const applyStepsWithUndo = (
    nextSteps: SequenceStep[],
    feedbackMessage: string,
    options?: {
      alsoSetNotice?: boolean;
      meta?: {
        title: string;
        subtitle: string;
        targetMinutes: number;
        level: DifficultyLevel;
        apparatus: AutoGenerateCriteria['apparatus'];
      };
    },
  ) => {
    const current = usePilatesStore.getState();
    const normalized = nextSteps.map((step) =>
      step.selectedLayer ? step : { ...step, selectedLayer: 'standard' as const },
    );
    const sameMeta =
      !options?.meta ||
      (current.activeTitle === options.meta.title &&
        current.activeSubtitle === options.meta.subtitle &&
        current.activeTargetMinutes === options.meta.targetMinutes &&
        current.activeLevel === options.meta.level &&
        current.activeApparatus === options.meta.apparatus);
    if (
      sameMeta &&
      serializeSemanticSteps(current.activeSteps) === serializeSemanticSteps(normalized)
    ) {
      if (options?.alsoSetNotice !== false) {
        setNotice('이미 같은 구성이 현재 시퀀스에 반영되어 있습니다.');
      }
      return;
    }
    const snapshot = captureUndoSnapshot(current);
    usePilatesStore.setState({
      undoStack: [...current.undoStack.slice(-19), snapshot],
      ...(options?.meta
        ? {
            activeTitle: options.meta.title,
            activeSubtitle: options.meta.subtitle,
            activeTargetMinutes: options.meta.targetMinutes,
            activeLevel: options.meta.level,
            activeApparatus: options.meta.apparatus,
          }
        : {}),
      activeSteps: normalized,
      generationError: null,
      saveFeedback: feedbackMessage,
    });
    if (normalized.length > 0) setWorkflowStep('arrange');
    if (options?.alsoSetNotice !== false) setNotice(feedbackMessage);
  };
  const handleSave = () => {
    if (isSavedClean) {
      usePilatesStore.setState({
        saveFeedback: '이미 최신 상태로 보관함에 저장되어 있습니다.',
      });
      setNotice('이미 최신 상태로 보관함에 저장되어 있습니다.');
      return;
    }
    const current = usePilatesStore.getState();
    if (current.activeSteps.some((step) => !step.selectedLayer)) {
      usePilatesStore.setState({
        activeSteps: current.activeSteps.map((step) =>
          step.selectedLayer ? step : { ...step, selectedLayer: 'standard' },
        ),
      });
    }
    s.saveCurrentSequenceToBinder();
    setJustSavedPulse(true);
    setNotice('');
  };
  const handleSaveCopy = () => {
    const copySig =
      expectedCriteriaSnapshot !== null
        ? canonicalRecoveryContent({
            title: s.activeTitle,
            subtitle: s.activeSubtitle,
            apparatus: s.activeApparatus,
            level: s.activeLevel,
            targetMinutes: s.activeTargetMinutes,
            steps: normalizedStepsForSave,
            criteriaSnapshot: expectedCriteriaSnapshot,
          })
        : null;
    if (copySig !== null && lastSavedCopySignatureRef.current === copySig) {
      setNotice('같은 내용의 사본을 방금 저장했어요. 내용을 조정한 뒤 다시 사본을 저장해 보세요.');
      return;
    }
    lastSavedCopySignatureRef.current = copySig;
    s.saveCurrentSequenceToBinder(true);
    setNotice('');
  };
  const startReadiness = !exerciseStepCount
    ? '동작을 추가한 뒤 수업안을 확인하세요.'
    : !canStartClass
      ? blockingReadinessReason
        ? `동작 정보와 항목 시간을 확인해 주세요. (${blockingStepIndex !== null ? `${blockingStepIndex + 1}번 항목: ` : ''}${blockingReadinessReason.message})`
        : '동작 정보와 항목 시간을 확인해 주세요.'
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
      if (Date.now() - lastBlankResetAtRef.current < 600) return;
      openExerciseFinder();
      return;
    }
    lastBlankResetAtRef.current = Date.now();
    const previousSnapshot = captureUndoSnapshot(current);
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
          <span className="vnext-workbench-eyebrow">STEP-BY-STEP STUDIO FLOW</span>
          <h1 id="workspace-main-heading" tabIndex={-1}>
            {s.activeSteps.length && activeWizardPage === 'arrange'
              ? '수업 구성'
              : activeWizardPage === 'step1'
                ? '1단계 · 수업 기본'
                : activeWizardPage === 'step2'
                  ? '2단계 · 동작 담기'
                  : '수업 준비, 가볍게.'}
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
      <div
        className="workbench-step-flow-banner"
        data-testid="workbench-step-flow-header"
        role="region"
        aria-label="단계별 수업 준비 안내"
      >
        <div className="pf-step-wizard-stepper" role="group" aria-label="수업 제작 단계">
          <button
            type="button"
            className={`pf-step-wizard-tab ${
              activeWizardPage === 'home' && !finderOpen ? 'is-active' : 'is-done'
            }`.trim()}
            aria-current={activeWizardPage === 'home' && !finderOpen ? 'step' : undefined}
            onClick={() => setManualWizardPage('home')}
          >
            <span>시작하기</span>
          </button>
          <button
            type="button"
            className={`pf-step-wizard-tab ${
              activeWizardPage === 'step1' && !finderOpen
                ? 'is-active'
                : s.activeSteps.length > 0 || activeWizardPage === 'step2'
                  ? 'is-done'
                  : ''
            }`.trim()}
            aria-current={activeWizardPage === 'step1' && !finderOpen ? 'step' : undefined}
            onClick={() => setManualWizardPage('step1')}
          >
            <span className="workbench-step-flow-num">1</span>
            <span>수업 기본</span>
          </button>
          <button
            type="button"
            className={`pf-step-wizard-tab ${
              finderOpen ||
              activeWizardPage === 'step2' ||
              (activeWizardPage === 'arrange' && workflowStep === 'select')
                ? 'is-active'
                : s.activeSteps.length > 0
                  ? 'is-done'
                  : ''
            }`.trim()}
            aria-current={
              finderOpen ||
              activeWizardPage === 'step2' ||
              (activeWizardPage === 'arrange' && workflowStep === 'select')
                ? 'step'
                : undefined
            }
            onClick={() => {
              setManualWizardPage('step2');
              setWorkflowStepState('select');
            }}
          >
            <span className="workbench-step-flow-num">2</span>
            <span>동작 담기</span>
          </button>
          <button
            type="button"
            className={`pf-step-wizard-tab ${
              activeWizardPage === 'arrange' && !finderOpen && workflowStep === 'arrange'
                ? 'is-active'
                : ''
            }`.trim()}
            disabled={!s.activeSteps.length}
            aria-current={
              activeWizardPage === 'arrange' && !finderOpen && workflowStep === 'arrange'
                ? 'step'
                : undefined
            }
            onClick={() => {
              setManualWizardPage('arrange');
              setWorkflowStepState('arrange');
            }}
          >
            <span className="workbench-step-flow-num">3</span>
            <span>순서·시간 확인</span>
          </button>
          <button
            type="button"
            className="pf-step-wizard-tab"
            disabled={!s.activeSteps.length}
            aria-current={planPreviewOpen ? 'step' : undefined}
            onClick={openPlanPreview}
          >
            <span className="workbench-step-flow-num">4</span>
            <span>미리보기·진행</span>
          </button>
        </div>
        <p className="workbench-step-flow-summary" data-testid="workbench-step-flow-summary">
          {activeWizardPage === 'home' && !finderOpen
            ? '한 페이지에는 꼭 필요한 한 가지 결정만 남깁니다 · 새 수업을 시작하거나 최근 수업을 이어가세요.'
            : activeWizardPage === 'step1'
              ? '1단계 · 수업 시간과 기구 기본값만 가볍게 고른 뒤 동작 담기로 넘어가세요.'
              : finderOpen || activeWizardPage === 'step2' || workflowStep === 'select'
                ? '2단계 · 수업에 넣을 동작을 골라 담으세요 · 담고 나면 다음 화면에서 순서와 시간을 맞춰요.'
                : '3단계 · 순서와 시간을 다듬는 화면이에요 · 각 동작의 -0.5분/+0.5분 버튼으로 바로 조절하세요.'}
        </p>
      </div>
      {(s.generationError ||
        (!s.persistenceError && (notice || s.saveFeedback)) ||
        (!s.activeSteps.length && s.undoStack.length > 0)) && (
        <div className="workbench-feedback-row">
          {(s.generationError || (!s.persistenceError && (notice || s.saveFeedback))) && (
            <p
              data-plan-feedback
              className={`status plan-feedback ${s.generationError ? 'error' : ''}`}
              role={s.generationError ? 'alert' : 'status'}
              aria-label={s.generationError ? '수업 구성 오류 안내' : '수업 구성 상태 안내'}
              aria-live={s.generationError ? 'assertive' : 'polite'}
              aria-atomic="true"
            >
              {s.generationError || notice || s.saveFeedback}
            </p>
          )}
          {!s.activeSteps.length && s.undoStack.length > 0 && (
            <PfButton
              variant="secondary"
              className="workbench-empty-undo-btn"
              onClick={performUndoSequence}
            >
              <RotateCcw size={16} /> 되돌리기
            </PfButton>
          )}
        </div>
      )}
      {activeWizardPage === 'home' && (
        <>
          <div className="pf-step-stage-frame pf-p01-home-stage" data-testid="wizard-home-page">
            <div className="pf-p01-signature-hero" data-testid="p01-signature-3d-hero">
              <div className="pf-p01-signature-hero__media">
                <img
                  src={getApparatusPrimary3DThumb(
                    (selectedEquipment[0] ? getEquipmentFamily(selectedEquipment[0]) : undefined) ??
                      s.activeApparatus,
                  )}
                  alt=""
                  aria-hidden="true"
                />
                <div className="pf-b05-card-overlay-top" aria-hidden="true">
                  <span className="pf-b05-pill is-dark">오늘의 시그니처</span>
                  <span className="pf-b05-pill is-light">2R 1B</span>
                </div>
                <div className="pf-b05-card-overlay-bottom" aria-hidden="true">
                  <span className="pf-b05-pill is-coral">● 대퇴사두·코어</span>
                </div>
              </div>
              <div className="pf-p01-signature-hero__body">
                <div>
                  <span className="pf-step-kicker-badge">오늘 어떤 수업을 준비할까요?</span>
                  <h2 className="pf-step-stage-title">
                    오전 {equipmentLabel(selectedEquipment) || '리포머'} 코어 &amp; 정렬 {criteria.targetMinutes}분
                  </h2>
                  <p className="pf-step-stage-lead">
                    기구·시간만 고르면 3D 동작 카드와 3초 요약으로 바로 수업을 완성합니다.
                  </p>
                </div>
                <button
                  type="button"
                  className="pf-step-primary-cta"
                  onClick={() => {
                    setPlanningMode('auto');
                    generate();
                  }}
                >
                  <Sparkles size={17} aria-hidden="true" /> 시그니처 초안 3초 생성하기
                </button>
              </div>
            </div>
            <div className="pf-step-choice-grid">
              <section
                className="pf-step-choice-card is-primary workbench-welcome"
                aria-label="첫 수업안 준비"
              >
                <div>
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
                  <h3 style={{ margin: '8px 0 6px', fontSize: '1.14rem', color: '#173d34' }}>
                    기구·시간 선택 후 바로 동작 담기
                  </h3>
                  <div
                    className="workbench-quick-duration-bar"
                    role="group"
                    aria-label="수업 시간 빠른 선택"
                    data-testid="step1-quick-duration-chips"
                  >
                    <span className="workbench-quick-duration-label">수업 시간</span>
                    {([30, 50, 60] as const).map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        className={`workbench-quick-duration-chip ${
                          criteria.targetMinutes === mins ? 'is-selected' : ''
                        }`.trim()}
                        aria-pressed={criteria.targetMinutes === mins}
                        onClick={() => setDuration(mins)}
                      >
                        {mins}분
                      </button>
                    ))}
                  </div>
                  <VisualApparatusPhotoStrip
                    activeApparatus={
                      selectedEquipment.length === 1 && ['reformer', 'cadillac', 'chair', 'barrel', 'mat'].includes(selectedEquipment[0])
                        ? (selectedEquipment[0] as 'reformer' | 'cadillac' | 'chair' | 'barrel' | 'mat')
                        : 'all'
                    }
                    includeAll={false}
                    disabledApparatus={(
                      ['reformer', 'cadillac', 'chair', 'barrel', 'mat'] as const
                    ).filter((app) => !s.ownedApparatus.includes(app))}
                    onSelect={(app) => {
                      if (app === 'all') return;
                      setCriteria({ ...criteria, availableEquipment: [app] });
                      if (!s.activeSteps.length) {
                        s.setActiveSequenceMeta({ apparatus: app });
                      }
                    }}
                  />
                  <div
                    className="pf-step1-chip-row"
                    role="group"
                    aria-label="기본 기구 빠른 선택"
                  >
                    {EQUIPMENT_OPTIONS.slice(0, 4).map((eq) => {
                      const isOwned = s.ownedEquipment.includes(eq.id);
                      const isChecked =
                        selectedEquipment.length === 1 && selectedEquipment[0] === eq.id;
                      return (
                        <button
                          key={eq.id}
                          type="button"
                          className="pf-step1-choice-chip"
                          disabled={!isOwned}
                          aria-pressed={isChecked}
                          onClick={() => {
                            setCriteria({ ...criteria, availableEquipment: [eq.id] });
                            if (!s.activeSteps.length) {
                              s.setActiveSequenceMeta({
                                apparatus: getEquipmentFamily(eq.id) ?? 'mat',
                              });
                            }
                          }}
                        >
                          {eq.labelKo}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    type="button"
                    className="pf-step-primary-cta"
                    data-testid="wizard-start-step1-btn"
                    onClick={() => setManualWizardPage('step1')}
                  >
                    1단계부터 차근차근 만들기 <ArrowRight size={18} aria-hidden="true" />
                  </button>
                  <div className="pf-step-secondary-actions workbench-welcome-actions">
                    <PfButton
                      variant="secondary"
                      className="workbench-first-action"
                      onClick={openExerciseFinder}
                    >
                      <Plus size={18} aria-hidden="true" />
                      동작 고르기
                    </PfButton>
                    <PfButton
                      variant="secondary"
                      className="workbench-idea-action"
                      onClick={() => openIdeaSheet(null)}
                    >
                      <Sparkles size={16} aria-hidden="true" />한 줄 아이디어 메모
                    </PfButton>
                    <button
                      type="button"
                      className="btn-secondary workbench-preset-action"
                      onClick={() => setPresetsOpen(true)}
                    >
                      <Copy size={15} aria-hidden="true" /> 프리셋·동작 묶음에서 고르기
                    </button>
                    <button
                      type="button"
                      className="btn-secondary workbench-ai-quick-action"
                      data-testid="home-quick-ai-draft-btn"
                      onClick={openContextualAiAssistant}
                    >
                      <Sparkles size={15} aria-hidden="true" /> AI·조건으로 초안 채우기
                    </button>
                  </div>
                  <p className="workbench-reviewed-count" style={{ margin: 0 }}>
                    추가하고, 순서를 바꾸고, 저장하세요. 검토는 선택입니다.
                  </p>
                </div>
              </section>
              <section
                className="pf-step-choice-card workbench-recent-continue"
                aria-label="최근 수업 이어가기"
              >
                <div>
                  <div className="workbench-recent-continue__header">
                    <div className="workbench-recent-continue__title">
                      <span className="workbench-recent-kicker">RECENT FLOW</span>
                      <h3 style={{ margin: '4px 0 0', fontSize: '1.15rem' }}>
                        최근 수업 이어가기{' '}
                        <PfBadge tone="sage">
                          {recentSavedSequences.length || recentHistoryLogs.length}
                        </PfBadge>
                      </h3>
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
                    <div className="workbench-recent-continue__list" style={{ marginTop: '12px' }}>
                      {recentSavedSequences.slice(0, 2).map((seq) => {
                        const moveCount = seq.steps.filter((st) => !isRestStep(st)).length;
                        const seqTitle =
                          seq.title || (seq as { name?: string }).name || '저장된 수업 시퀀스';
                        const gearText =
                          seq.apparatus === 'mixed' ? '복합 기구' : equipmentLabel([seq.apparatus]);
                        const recentVisual = resolveClassCardVisualMeta({
                          sequence: seq,
                          exercises: s.exercises,
                          title: seqTitle,
                          fallbackLevel: seq.level,
                        });
                        return (
                          <div key={seq.id} className="workbench-recent-card">
                            <div className="pf-member-my-booking-lead">
                              <img
                                src={recentVisual.studio3dThumbUrl}
                                alt=""
                                aria-hidden="true"
                                loading="lazy"
                                className="pf-workbench-3d-mini-thumb"
                              />
                              <div className="workbench-recent-card__info">
                                <strong>{seqTitle}</strong>
                                <span>
                                  {moveCount}개 동작 · {seq.targetMinutes}분 ·{' '}
                                  {gearText || '기구 미지정'} · {recentVisual.levelBadgeKo}
                                </span>
                                <SpringVisualPills springs={recentVisual.springs} />
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              <PfButton
                                variant="secondary"
                                className="workbench-recent-card__action"
                                aria-label={`${seqTitle} 이어서 구성`}
                                onClick={() => continueRecentSequence(seq.id, seqTitle)}
                              >
                                이어서 구성
                              </PfButton>
                              <PfButton
                                variant="primary"
                                aria-label={`${seqTitle} 사본으로 바로 열기`}
                                onClick={() => {
                                  const copyId = s.duplicateSavedSequence(seq.id);
                                  if (copyId) {
                                    s.loadSequenceIntoWorkbench(copyId);
                                    setWorkflowStep('arrange');
                                    setNotice(`‘${seqTitle}’ 사본을 열어 이어서 편집합니다.`);
                                  }
                                }}
                              >
                                사본 열기
                              </PfButton>
                              {moveCount > 0 && (
                                <PfButton
                                  variant="secondary"
                                  aria-label={`${seqTitle} 바로 진행`}
                                  onClick={() => {
                                    s.loadSequenceIntoWorkbench(seq.id);
                                    const current = usePilatesStore.getState();
                                    const ready = buildSequenceSimulation(
                                      current.activeSteps,
                                      current.exercises,
                                      current.activeTargetMinutes,
                                    ).gate.canRehearse;
                                    if (ready) {
                                      current.setActiveTab('stage');
                                    } else {
                                      setWorkflowStep('arrange');
                                      setNotice(`‘${seqTitle}’ 수업안을 확인한 뒤 바로 진행해 주세요.`);
                                    }
                                  }}
                                >
                                  <Play size={14} aria-hidden="true" /> 바로 진행
                                </PfButton>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : recentHistoryLogs.length > 0 ? (
                    <div className="workbench-recent-continue__list" style={{ marginTop: '12px' }}>
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
                    <div className="workbench-recent-empty" style={{ marginTop: '12px' }}>
                      <p>
                        저장한 최근 수업이 아직 없습니다. 왼쪽에서 새 수업을 만들거나 프리셋으로
                        시작해 보세요.
                      </p>
                    </div>
                  )}
                </div>
                {s.activeSteps.length > 0 && (
                  <button
                    type="button"
                    className="pf-step-nav-pill-btn is-primary"
                    onClick={() => {
                      setManualWizardPage('arrange');
                      setWorkflowStepState('arrange');
                    }}
                  >
                    편집 중인 수업({exerciseStepCount}개 동작) 계속 다듬기{' '}
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                )}
              </section>
            </div>
          </div>
          {!s.activeSteps.length && (
            <div className="pf-step-secondary-shelf">
              <span className="pf-step-secondary-shelf-label">
                빠른 템플릿 · 추천 레시피 (선택)
              </span>
              <WorkbenchBlankStarters onSelectStarter={handleStartBlankDraft} />
              <details className="workbench-automation-tools">
                <summary>원클릭 추천 클래스 레시피 열기 (선택)</summary>
                <AtelierQuickStartGallery
                  exercises={s.exercises}
                  onApplyQuickRecipe={applyQuickStartRecipe}
                />
              </details>
              <details
                className="workbench-automation-tools workbench-visual-tutorial-disclosure"
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
              {ideasSectionNode}
            </div>
          )}
        </>
      )}
      {activeWizardPage === 'step1' && (
        <section
          className="pf-step-stage-frame"
          data-testid="wizard-step1-page"
          aria-label="1단계 수업 기본 설정"
        >
          <span className="pf-step-kicker-badge">1 / 4 단계 · 수업 기본 정하기</span>
          <h2 className="pf-step-stage-title">어떤 수업을 진행하시나요?</h2>
          <p className="pf-step-stage-lead">
            기본값이 미리 선택되어 있어 필요한 항목만 누르고 바로 다음으로 넘어가도 됩니다.
          </p>
          <div className="pf-step1-field-group">
            <span className="pf-step1-field-label">1. 수업 시간</span>
            <div className="pf-step1-chip-row" role="group" aria-label="1단계 수업 시간">
              {([30, 50, 60] as const).map((mins) => (
                <button
                  key={mins}
                  type="button"
                  className="pf-step1-choice-chip"
                  aria-pressed={criteria.targetMinutes === mins}
                  onClick={() => setDuration(mins)}
                >
                  {mins}분
                </button>
              ))}
            </div>
          </div>
          <div className="pf-step1-field-group">
            <span className="pf-step1-field-label">2. 사용 기구</span>
            <div className="pf-step1-chip-row" role="group" aria-label="1단계 사용 기구">
              {EQUIPMENT_OPTIONS.map((equipment) => {
                const isOwned = s.ownedEquipment.includes(equipment.id);
                const isChecked =
                  selectedEquipment.length === 1 && selectedEquipment[0] === equipment.id;
                return (
                  <button
                    key={equipment.id}
                    type="button"
                    className="pf-step1-choice-chip"
                    disabled={!isOwned}
                    aria-pressed={isChecked}
                    onClick={() => {
                      setCriteria({ ...criteria, availableEquipment: [equipment.id] });
                      if (!s.activeSteps.length) {
                        s.setActiveSequenceMeta({
                          apparatus: getEquipmentFamily(equipment.id) ?? 'mat',
                        });
                      }
                    }}
                  >
                    {equipment.labelKo}
                  </button>
                );
              })}
              <button
                type="button"
                className="pf-step1-choice-chip"
                onClick={(event) => openConditionsDialog(event.currentTarget)}
              >
                복합 기구·소도구 상세 설정
              </button>
            </div>
            <div className="pf-step1-visual-apparatus-strip" aria-hidden="true">
              {(
                [
                  { id: 'reformer', label: '리포머' },
                  { id: 'mat', label: '매트' },
                  { id: 'cadillac', label: '캐딜락' },
                  { id: 'chair', label: '체어' },
                  { id: 'barrel', label: '바렐' },
                ] as const
              ).map((tile) => {
                const active = selectedEquipment.includes(tile.id);
                return (
                  <div
                    key={tile.id}
                    className={`pf-step1-visual-tile ${active ? 'is-selected' : ''}`.trim()}
                  >
                    <img src={getApparatusPrimary3DThumb(tile.id)} alt="" loading="lazy" />
                    <span>{tile.label} 3D</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="pf-step1-field-group">
            <span className="pf-step1-field-label">3. 난이도</span>
            <div className="pf-step1-chip-row" role="group" aria-label="1단계 난이도">
              {(
                [
                  { value: '1.0' as const, label: '입문·기초' },
                  { value: '1.5' as const, label: '초중급' },
                  { value: '2.0' as const, label: '중상급' },
                ] as const
              ).map((lv) => (
                <button
                  key={lv.value}
                  type="button"
                  className="pf-step1-choice-chip"
                  aria-pressed={criteria.level === lv.value}
                  onClick={() => {
                    setCriteria({ ...criteria, level: lv.value });
                    s.setActiveSequenceMeta({ level: lv.value });
                  }}
                >
                  {lv.label}
                </button>
              ))}
            </div>
          </div>
          <div className="pf-step1-field-group">
            <span className="pf-step1-field-label">4. 오늘의 목표</span>
            <div className="pf-step1-chip-row" role="group" aria-label="1단계 수업 목표">
              {focusOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className="pf-step1-choice-chip"
                  aria-pressed={criteria.focusPreset === opt.value}
                  onClick={() => setCriteria({ ...criteria, focusPreset: opt.value })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="pf-step-cta-bar">
            <button
              type="button"
              className="pf-step-nav-pill-btn"
              onClick={() => setManualWizardPage('home')}
            >
              ← 처음으로
            </button>
            <div className="pf-step-cta-bar__right">
              <button
                type="button"
                className="pf-step-nav-pill-btn"
                disabled={authoringCatalogCount === 0}
                onClick={() => {
                  setPlanningMode('auto');
                  generate();
                }}
              >
                <RefreshCw size={16} aria-hidden="true" /> 조건으로 자동 구성하기
              </button>
              <button
                type="button"
                className="pf-step-nav-pill-btn is-primary"
                data-testid="wizard-to-step2-btn"
                onClick={() => {
                  setManualWizardPage('step2');
                  setWorkflowStepState('select');
                }}
              >
                다음: 동작 담기 <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      )}
      {activeWizardPage === 'step2' && (
        <section
          className="pf-step-stage-frame"
          data-testid="wizard-step2-page"
          aria-label="2단계 동작 담기"
        >
          <span className="pf-step-kicker-badge">
            2 / 4 단계 · 동작 담기 ({equipmentLabel(selectedEquipment) || '전체 기구'} ·{' '}
            {criteria.targetMinutes}분)
          </span>
          <div className="pf-step2-header-row">
            <div>
              <h2 className="pf-step-stage-title">수업에 넣을 동작만 가볍게 담아 보세요</h2>
              <p className="pf-step-stage-lead">
                선택한 기구 기준으로 바로 좁혀 두었습니다 · 현재{' '}
                <strong>{exerciseStepCount}개 동작</strong> ({formatSecondsToMMSS(total)}) 담김
              </p>
            </div>
            <button
              type="button"
              className="pf-step-nav-pill-btn"
              data-testid="step2-ai-assist-toggle"
              aria-expanded={step2AiOpen}
              onClick={() => setStep2AiOpen((prev) => !prev)}
            >
              <Sparkles size={15} aria-hidden="true" />{' '}
              {step2AiOpen ? 'AI 동작 추천 닫기' : 'AI 동작 추천 열기'}
            </button>
          </div>
          {s.activeSteps.length > 0 && (
            <div
              className="pf-step2-added-tray"
              data-testid="step2-added-steps-tray"
              role="region"
              aria-label="현재 담은 동작 순서"
            >
              <span className="pf-step2-added-tray__label">
                담은 순서 ({s.activeSteps.length})
              </span>
              <div className="pf-step2-added-tray__chips">
                {s.activeSteps.map((st, stIndex) => {
                  const stEx = !isRestStep(st) ? exerciseMap.get(st.exerciseId) : undefined;
                  const stLabel = isRestStep(st) ? '휴식' : (stEx?.nameKo ?? '동작');
                  return (
                    <span key={st.stepId} className="pf-step2-added-chip">
                      <small>{String(stIndex + 1).padStart(2, '0')}</small>
                      <strong>{stLabel}</strong>
                      <button
                        type="button"
                        className="pf-step2-added-chip__remove"
                        aria-label={`${stLabel} 순서에서 빼기`}
                        onClick={() => {
                          s.removeStep(stIndex);
                          setNotice(`‘${stLabel}’ 항목을 순서에서 뺐어요.`);
                        }}
                      >
                        <X size={13} aria-hidden="true" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
          {step2AiOpen && (
            <div className="pf-step2-ai-drawer" data-testid="step2-ai-assist-drawer">
              <Suspense fallback={<p className="pf-text-sm">AI 도우미를 불러오는 중...</p>}>
                <LazyFreeAiAssistantPanel
                  exercises={s.exercises}
                  reusableBlocks={p5ReusableBlocks}
                  conditionTemplates={s.conditionTemplates}
                  activeTargetMinutes={criteria.targetMinutes}
                  activeApparatus={s.activeApparatus}
                  activeLevel={s.activeLevel}
                  onApplyDraftSequence={(payload) => {
                    applyStepsWithUndo(
                      payload.steps,
                      `‘${payload.title}’ 초안을 반영했습니다. 다음 단계에서 순서를 다듬어 보세요.`,
                      {
                        alsoSetNotice: true,
                        meta: {
                          title: payload.title,
                          subtitle: payload.subtitle,
                          targetMinutes: payload.targetMinutes,
                          level: payload.level,
                          apparatus: payload.apparatus,
                        },
                      },
                    );
                  }}
                  onSaveUnreviewedMovementIdea={(exercise) => {
                    s.addCustomExercise(exercise);
                  }}
                  onAddExerciseToSequence={(exerciseId, blockCategory) => {
                    const beforeLen = usePilatesStore.getState().activeSteps.length;
                    s.appendExerciseToSequence(exerciseId, blockCategory);
                    const after = usePilatesStore.getState();
                    if (after.activeSteps.length > beforeLen) {
                      setNotice('추천 동작을 순서에 넣었어요.');
                      return { ok: true };
                    }
                    return {
                      ok: false,
                      message:
                        after.generationError ||
                        '현재 수업 조건(기구·난이도·보유 소도구) 또는 중복 여부를 확인해 주세요.',
                    };
                  }}
                  onApplyConditionTemplate={(templateId) => {
                    applyTemplate(templateId);
                  }}
                  onSaveConditionTemplate={(name, newCriteria) => {
                    s.setDraftCriteria(withExactSelection(newCriteria));
                    s.saveConditionTemplate(name);
                    setNotice(`‘${name}’ 조건을 보관했습니다.`);
                  }}
                  onFillStarterSequence={() => {
                    setPlanningMode('auto');
                    generate();
                  }}
                  onOpenExerciseFinder={() => setStep2AiOpen(false)}
                />
              </Suspense>
            </div>
          )}
          {!s.activeSteps.length && (
            <div
              className="pf-step2-empty-starter"
              data-testid="step2-empty-starter-bar"
              role="region"
              aria-label="첫 동작 빠른 시작 안내"
            >
              <span>
                아직 담은 동작이 없어요 · 아래에서 ‘+ 담기’를 누르거나 기본 초안을 바로 채워 보세요.
              </span>
              {authoringCatalogCount > 0 && (
                <button
                  type="button"
                  className="pf-step-nav-pill-btn"
                  data-testid="step2-quick-starter-btn"
                  onClick={() => {
                    setPlanningMode('auto');
                    generate();
                  }}
                >
                  <RefreshCw size={15} aria-hidden="true" /> 선택 기구로 기본 초안 채우기
                </button>
              )}
            </div>
          )}
          {!finderOpen && (
            <InlineExerciseFinder
              active
              autoNarrowToClassEquipment
              onOpenExercise={onOpenYouTubePreview}
              classEquipment={EQUIPMENT_OPTIONS.filter((option) =>
                selectedEquipment.includes(option.id),
              ).map((option) => option.id)}
            />
          )}
          <div className="pf-step-cta-bar">
            <button
              type="button"
              className="pf-step-nav-pill-btn"
              onClick={() => setManualWizardPage('step1')}
            >
              ← 1. 수업 기본
            </button>
            <div className="pf-step-cta-bar__right">
              <button
                type="button"
                className="pf-step-nav-pill-btn"
                onClick={() => openIdeaSheet(null)}
              >
                <Sparkles size={16} aria-hidden="true" /> 한 줄 아이디어 메모
              </button>
              <button
                type="button"
                className="pf-step-nav-pill-btn is-primary"
                data-testid="wizard-to-step3-btn"
                disabled={!s.activeSteps.length}
                onClick={() => {
                  setManualWizardPage('arrange');
                  setWorkflowStepState('arrange');
                }}
              >
                다음: 순서·시간 맞추기 ({exerciseStepCount}개 · {formatSecondsToMMSS(total)}){' '}
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      )}
      {(activeWizardPage === 'home' || activeWizardPage === 'arrange') && (
        <>
          {isArrangeStage && s.activeSteps.length > 0 && (
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
                                {moveCount}개 동작 · {seq.targetMinutes}분 ·{' '}
                                {gearText || '기구 미지정'}
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
                    <p className="workbench-recent-empty-text">
                      저장한 최근 수업이 아직 없습니다.
                    </p>
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
                onClick={(event) => openConditionsDialog(event.currentTarget)}
                aria-label={`수업 시간 ${criteria.targetMinutes}분 · 조건 열기`}
              >
                {criteria.targetMinutes}분 <ChevronDown size={14} />
              </button>
              <button
                type="button"
                onClick={(event) => openConditionsDialog(event.currentTarget)}
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
                onClick={(event) => openConditionsDialog(event.currentTarget)}
                aria-label={`수업 목표 ${focusOptions.find((option) => option.value === criteria.focusPreset)?.label ?? '전신 균형'} · 조건 열기`}
              >
                {focusOptions.find((option) => option.value === criteria.focusPreset)?.label ??
                  '전신 균형'}{' '}
                <ChevronDown size={14} />
              </button>
              <PfButton
                variant="icon"
                aria-label="수업 조건"
                onClick={(event) => openConditionsDialog(event.currentTarget)}
              >
                <SlidersHorizontal size={18} />
              </PfButton>
            </div>
          </div>
          <details className="workbench-automation-tools">
            <summary>기구별 스프링·컨셉 가이드 열기 (선택)</summary>
            <ApparatusVisualGuideRibbon
              activeApparatusId={selectedEquipment[0] ?? s.activeApparatus}
              mode="workbench"
              onApplyClassConcept={(titleKo, subtitleKo, family) => {
                s.setActiveSequenceMeta({
                  title: titleKo,
                  subtitle: subtitleKo,
                  apparatus: family,
                });
                setNotice(`‘${titleKo}’ 기구 컨셉을 현재 수업에 반영했습니다.`);
              }}
            />
          </details>
          <details
            className="workbench-automation-tools"
            data-testid="workbench-circuit-planner-drawer"
          >
            <summary>듀엣·그룹 멀티 기구 순환 서킷 설계 열기 (2~4스테이션 자동 편성)</summary>
            <StudioCircuitPlannerCard
              onApplied={(msg) => setNotice(msg)}
            />
          </details>
          {s.historyLogs.length > 0 && (() => {
            const workbenchAdaptive = buildAdaptiveNextClassDraft({
              logs: s.historyLogs,
              exercises: s.exercises,
              ownedEquipment: s.ownedEquipment,
              targetGroupId: s.activeTargetGroupId || 'all',
              fallbackTargetMinutes: criteria.targetMinutes || s.activeTargetMinutes || 50,
            });
            if (!workbenchAdaptive) return null;
            return (
              <details
                className="workbench-automation-tools"
                data-testid="workbench-adaptive-history-drawer"
              >
                <summary>
                  지난 수업 피드백 자동 보정 브릿지 열기 · {workbenchAdaptive.signal.headlineKo}
                </summary>
                <div className="pf-v70-adaptive-banner is-compact">
                  <div className="pf-v70-adaptive-main">
                    <div className="pf-v70-adaptive-badges">
                      <PfBadge tone="sage">권장 Lv {workbenchAdaptive.signal.recommendedLevel}</PfBadge>
                      {workbenchAdaptive.signal.cautionLabelsKo.map((lbl) => (
                        <PfBadge key={lbl} tone="warning">{lbl}</PfBadge>
                      ))}
                    </div>
                    <ul className="pf-v70-adaptive-bullets">
                      {workbenchAdaptive.signal.rationaleBulletsKo.slice(0, 2).map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                    <small className="pf-v70-honest-caption">{workbenchAdaptive.honestDisclaimerKo}</small>
                  </div>
                  <div className="pf-v70-adaptive-cta">
                    <PfButton
                      variant="primary"
                      data-testid="workbench-apply-adaptive-btn"
                      onClick={() => {
                        const expected = usePilatesStore.getState();
                        const res = s.applyPresetDraft(
                          {
                            steps: workbenchAdaptive.steps,
                            title: workbenchAdaptive.draftTitle,
                            subtitle: workbenchAdaptive.draftSubtitle,
                            targetMinutes: workbenchAdaptive.targetMinutes,
                          },
                          'replace',
                          expected,
                        );
                        setNotice(res.message);
                      }}
                    >
                      피드백 보정 초안 적용 <ArrowRight size={15} />
                    </PfButton>
                  </div>
                </div>
              </details>
            );
          })()}
          {planningMode === 'auto' && locked > 0 && (
            <p id="v2-new-draft-scope" className="v2-generation-scope">
              시퀀스 만들기는 전체를 새 초안으로 바꿉니다. 잠근 {locked}개 항목을 유지하려면 아래
              ‘잠그지 않은 동작 다시 만들기’를 사용하세요.
            </p>
          )}
          <div
            className={`plan-layout v2-plan-layout ${
              isArrangeStage && s.activeSteps.length > 0 && sequenceViewMode === 'split'
                ? 'is-option-a-split'
                : ''
            }`.trim()}
          >
            {isArrangeStage && s.activeSteps.length > 0 && sequenceViewMode === 'split' && (
              <aside
                className="pf-option-a-finder-pane"
                data-testid="option-a-split-finder"
                aria-label="동작 카탈로그 빠른 담기"
              >
                <div className="pf-option-a-finder-pane__head">
                  <span className="pf-step-kicker-badge">검색·순서 나란히 보기</span>
                  <strong>동작 빠른 담기</strong>
                  <p>
                    왼쪽에서 검색·필터로 동작을 누르면 오른쪽 시퀀스에 즉시 담깁니다.
                  </p>
                </div>
                <InlineExerciseFinder
                  active
                  autoNarrowToClassEquipment
                  onOpenExercise={onOpenYouTubePreview}
                  classEquipment={EQUIPMENT_OPTIONS.filter((option) =>
                    selectedEquipment.includes(option.id),
                  ).map((option) => option.id)}
                />
              </aside>
            )}
            <section
              id="workbench-sequence-panel"
              className={`sequence-column ${
                isArrangeStage && s.activeSteps.length > 0 ? 'pf-step-stage-frame' : ''
              }`.trim()}
              aria-label="오늘의 시퀀스"
              tabIndex={-1}
            >
              {isArrangeStage && s.activeSteps.length > 0 && (
                <span className="pf-step-kicker-badge">3 / 4 단계 · 순서와 시간 다듬기</span>
              )}
          {isArrangeStage && s.activeSteps.length > 0 && (
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
                <div className="sequence-save-group">
                  <span
                    className={`workbench-save-state ${isSavedClean ? 'is-saved' : 'is-dirty'} ${
                      justSavedPulse ? 'is-just-saved' : ''
                    }`.trim()}
                    data-testid="workbench-save-state"
                    title={
                      isSavedClean
                        ? '보관함에 최신 상태로 저장됨'
                        : '이 기기에 자동 임시 보관 중 · 저장을 누르면 보관함에 반영됩니다'
                    }
                  >
                    {isSavedClean ? '저장됨' : '변경사항 있음'}
                  </span>
                  {!isSavedClean && matchedSavedSequence && (
                    <PfButton
                      variant="text"
                      className="restore-saved-flow"
                      data-testid="workbench-restore-saved-btn"
                      onClick={() => {
                        applyStepsWithUndo(
                          matchedSavedSequence.steps,
                          `‘${matchedSavedSequence.title}’ 저장된 원본 상태로 복원했습니다.`,
                          {
                            alsoSetNotice: true,
                            meta: {
                              title: matchedSavedSequence.title,
                              subtitle: matchedSavedSequence.subtitle,
                              targetMinutes: matchedSavedSequence.targetMinutes,
                              level: matchedSavedSequence.level,
                              apparatus: matchedSavedSequence.apparatus,
                            },
                          },
                        );
                      }}
                    >
                      <RotateCcw size={15} aria-hidden="true" />
                      <span>저장본 복원</span>
                    </PfButton>
                  )}
                  <PfButton
                    variant="secondary"
                    className="save-flow"
                    onClick={handleSave}
                    disabled={!s.activeSteps.length}
                  >
                    <BookmarkPlus size={17} />
                    <span>저장</span>
                  </PfButton>
                  <PfButton
                    variant="primary"
                    className="workbench-header-start-flow"
                    aria-label="시퀀스 바로 진행"
                    onClick={startClass}
                    disabled={!canStartClass}
                  >
                    <Play size={16} aria-hidden="true" />
                    <span>바로 진행</span>
                  </PfButton>
                </div>
              </div>
              <div
                className="pf-b05-balance-summary-pill"
                data-testid="board05-4module-balance-pill"
              >
                <span>
                  4구간 모듈 밸런스: 준비 {Math.round(phaseSecTotals.warmupSec / 60)}분 · 본운동{' '}
                  {Math.round(phaseSecTotals.mainSec / 60)}분 · 마무리{' '}
                  {Math.round(phaseSecTotals.cooldownSec / 60)}분
                  {restStepCount > 0 ? ` · 휴식 ${Math.round(durations.restSec / 60)}분` : ''}
                </span>
                <strong>
                  총 {formatSecondsToMMSS(total)} / 목표 {s.activeTargetMinutes}분
                </strong>
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
                <div className="time-summary-row">
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
                  {s.activeSteps.length > 0 && delta !== 0 && canAutoFitDuration && (
                    <button
                      type="button"
                      className="workbench-inline-action-chip"
                      onClick={() => {
                        s.fitActiveDuration();
                        setNotice(
                          '목표 시간에 맞춰 잠그지 않은 항목 시간을 자동 조정했어요. 되돌리기로 복구할 수 있습니다.',
                        );
                      }}
                    >
                      <Clock3 size={14} aria-hidden="true" /> 목표 시간 자동 맞춤
                    </button>
                  )}
                  {s.activeSteps.length > 0 && delta < 0 && gapFillCandidates.length > 0 && (
                    <button
                      type="button"
                      className="workbench-inline-action-chip"
                      data-testid="smart-gap-fill-toggle"
                      aria-expanded={gapFillOpen}
                      onClick={() => setGapFillOpen((v) => !v)}
                    >
                      <Sparkles size={14} aria-hidden="true" /> 빈 시간 채우기 추천
                    </button>
                  )}
                  {s.activeSteps.length > 0 && delta !== 0 && !canAutoFitDuration && needsMoreExercisesForTarget && (
                    <button
                      type="button"
                      className="workbench-inline-action-chip"
                      onClick={openExerciseFinder}
                    >
                      <Plus size={14} aria-hidden="true" /> 동작 추가해 채우기
                    </button>
                  )}
                  {s.activeSteps.length > 0 && delta !== 0 && !canAutoFitDuration && allExercisesLockedForTarget && (
                    <button
                      type="button"
                      className="workbench-inline-action-chip"
                      onClick={() => {
                        const lockBtn =
                          document.querySelector<HTMLElement>('[aria-label$="잠금 해제"]');
                        lockBtn?.scrollIntoView?.({
                          block: 'center',
                          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
                        });
                        lockBtn?.focus();
                        setNotice('잠근 동작을 일부 해제한 뒤 목표 시간에 맞출 수 있습니다.');
                      }}
                    >
                      <UnlockKeyhole size={14} aria-hidden="true" /> 잠금 확인 후 조정
                    </button>
                  )}
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
              <div
                className="pf-phase-proportion-bar"
                role="region"
                aria-label="준비·본운동·마무리 구간 비중"
                data-testid="phase-proportion-bar"
              >
                <div className="pf-phase-proportion-bar__labels">
                  <span>준비 {Math.round(phaseSecTotals.warmupSec / 60)}분</span>
                  <span>본운동 {Math.round(phaseSecTotals.mainSec / 60)}분</span>
                  <span>마무리 {Math.round(phaseSecTotals.cooldownSec / 60)}분</span>
                </div>
                <div className="pf-phase-proportion-bar__track" aria-hidden="true">
                  <span
                    className="pf-phase-proportion-bar__seg is-warmup"
                    style={{
                      width: `${(phaseSecTotals.warmupSec / phaseExerciseSecTotal) * 100}%`,
                    }}
                  />
                  <span
                    className="pf-phase-proportion-bar__seg is-main"
                    style={{
                      width: `${(phaseSecTotals.mainSec / phaseExerciseSecTotal) * 100}%`,
                    }}
                  />
                  <span
                    className="pf-phase-proportion-bar__seg is-cooldown"
                    style={{
                      width: `${(phaseSecTotals.cooldownSec / phaseExerciseSecTotal) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <SequenceQuickFlowCoachStrip
                steps={s.activeSteps}
                exercisesById={exerciseMap}
                onApplyOptimizedSteps={(nextSteps, msg) => {
                  applyStepsWithUndo(nextSteps, msg);
                }}
                onOpenFinderForMissingPlane={openExerciseFinder}
              />
              {gapFillOpen && s.activeSteps.length > 0 && delta < 0 && gapFillCandidates.length > 0 && (
                <div
                  className="pf-gap-fill-drawer"
                  data-testid="smart-gap-fill-drawer"
                  role="region"
                  aria-label="부족한 시간 채우기 추천 미리보기"
                >
                  <div className="pf-gap-fill-drawer__head">
                    <strong>
                      <Sparkles size={15} aria-hidden="true" /> 부족한{' '}
                      {Math.max(1, Math.round(Math.abs(delta) / 60))}분 채우기 후보 (기존 수업은
                      덮어쓰지 않아요)
                    </strong>
                    <span style={{ fontSize: '0.78rem', color: '#355441', fontWeight: 600 }}>
                      검토 후 원하는 구성만 반영
                    </span>
                  </div>
                  <div className="pf-gap-fill-drawer__items">
                    {gapFillCandidates.map((cand) => (
                      <div key={cand.id} className="pf-gap-fill-card">
                        <strong>{cand.nameKo}</strong>
                        <span style={{ fontSize: '0.8rem', color: '#56685f' }}>
                          기본 {cand.defaultDurationMin}분 ·{' '}
                          {cand.targetMuscles.slice(0, 2).join('·') || '체간 정렬'}
                        </span>
                        {cand.springs && <SpringVisualPills springs={cand.springs} />}
                      </div>
                    ))}
                  </div>
                  <div className="pf-gap-fill-drawer__actions">
                    <PfButton
                      variant="primary"
                      data-testid="smart-gap-fill-apply"
                      onClick={() => {
                        const appendedSteps: SequenceStep[] = gapFillCandidates.map(
                          (cand, idx) => ({
                            stepId: `gap-fill-${Date.now()}-${idx}`,
                            order: s.activeSteps.length + idx + 1,
                            exerciseId: cand.id,
                            blockCategory: cand.blockCategory,
                            durationMin: cand.defaultDurationMin,
                            selectedLayer: 'standard',
                            instructorNote: '',
                          }),
                        );
                        setGapFillOpen(false);
                        applyStepsWithUndo(
                          [...s.activeSteps, ...appendedSteps],
                          `추천 동작 ${gapFillCandidates.length}개를 수업표 끝에 추가했어요. 되돌리기로 복구할 수 있습니다.`,
                        );
                      }}
                    >
                      수업표 끝에 추가하기
                    </PfButton>
                    <PfButton variant="secondary" onClick={() => setGapFillOpen(false)}>
                      닫기
                    </PfButton>
                  </div>
                </div>
              )}
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
                        <span>
                          {selectedBundleStepCount > 0
                            ? `선택한 ${selectedBundleStepCount}개 동작을 재사용 묶음으로 저장`
                            : '현재 시퀀스 동작들을 재사용 블록으로 묶기'}
                        </span>
                        <input
                          type="text"
                          value={blockTitleInput}
                          onChange={(event) => setBlockTitleInput(event.target.value)}
                          placeholder={`${s.activeTitle || '오늘의 시퀀스'} 블록`}
                          aria-label="새 재사용 블록 이름"
                        />
                      </label>
                      <div className="workbench-block-combo-actions">
                        <PfButton
                          variant="secondary"
                          onClick={
                            selectedBundleStepCount > 0
                              ? handleSaveSelectedStepsToBlock
                              : handleCombineCurrentStepsToBlock
                          }
                        >
                          {selectedBundleStepCount > 0
                            ? `선택 ${selectedBundleStepCount}개 묶음 저장`
                            : '현재 동작 묶어 블록 저장'}
                        </PfButton>
                        <PfButton variant="text" onClick={() => setPresetsOpen(true)}>
                          <Copy size={14} aria-hidden="true" /> 프리셋·동작 묶음 열기
                        </PfButton>
                      </div>
                      <details className="workbench-bundle-guide-disclosure">
                        <summary>묶음 복사·원본 편집·기구 전환 기준 보기</summary>
                        <p>
                          동작 묶음을 수업에 넣으면 독립 복사본이 생성되어, 이후 묶음 원본을 수정해도
                          기존 수업안과 과거 수업 기록은 바뀌지 않습니다. 원본이 새 버전(v2+)으로
                          업데이트된 경우에만 원하는 수업에서 선택 반영하거나 되돌릴 수 있습니다.
                        </p>
                      </details>
                    </div>
                    {savedReusableBlocks.length > 0 && (
                      <div
                        className="workbench-block-combo-list"
                        aria-label="내 저장된 재사용 블록"
                      >
                        {savedReusableBlocks.map((block) => {
                          const summary = getReusableBlockTimingSummary(block);
                          const canReduceMin = summary.totalDurationMin > 2;
                          const apparatusTag =
                            block.apparatus === 'mixed'
                              ? '기구 전환 포함'
                              : `${APPARATUS_LABELS[block.apparatus]?.ko ?? block.apparatus} 단일`;
                          return (
                            <div key={block.id} className="workbench-block-combo-item">
                              <div>
                                <strong>{block.title}</strong>
                                <span>
                                  {apparatusTag} · {block.items.length}개 동작 · 총{' '}
                                  {summary.totalDurationMin}분 (v{block.version})
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
                                <button
                                  type="button"
                                  className="workbench-combo-scale-btn"
                                  data-testid="duplicate-reusable-block-btn"
                                  onClick={() => handleDuplicateReusableBlock(block.id)}
                                  aria-label={`${block.title} 묶음 복제`}
                                >
                                  복제
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
                  <PfButton
                    variant="text"
                    data-testid="step3-open-ai-assistant-btn"
                    onClick={openContextualAiAssistant}
                  >
                    <Sparkles size={15} aria-hidden="true" />
                    AI 보조 열기
                  </PfButton>
                  <PfButton variant="text" onClick={() => openIdeaSheet(null)}>
                    <Sparkles size={15} aria-hidden="true" />한 줄 동작 메모
                  </PfButton>
                  <PfButton variant="text" onClick={performUndoSequence}>
                    <RotateCcw size={14} />
                    되돌리기
                  </PfButton>
                </div>
              </div>
            </>
          )}
          {isArrangeStage && s.activeSteps.length > 0 && (
            <div className="pf-seq-view-bar">
              <p className="composition-order-hint" style={{ margin: 0 }}>
                ‘끌기’ 손잡이로 순서 변경 · 위·아래 버튼도 가능
                <span className="composition-keyboard-hint">
                  키보드: 방향키 한 칸 · Home/End 처음·끝 · Esc 드래그 취소
                </span>
              </p>
              <div
                className="pf-seq-view-switcher"
                role="group"
                aria-label="시퀀스 편집 보기 방식"
                data-testid="sequence-view-mode-switcher"
              >
                {(
                  [
                    { id: 'split' as const, label: '원스크린 좌우 분할' },
                    { id: 'list' as const, label: '단계별 리스트' },
                    { id: 'columns' as const, label: '3구간 보드' },
                    { id: 'timeline' as const, label: '스프링 타임라인' },
                  ] as const
                ).map((modeItem) => (
                  <button
                    key={modeItem.id}
                    type="button"
                    className="pf-seq-view-btn"
                    aria-pressed={sequenceViewMode === modeItem.id}
                    onClick={() => setSequenceViewMode(modeItem.id)}
                  >
                    {modeItem.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {isArrangeStage && s.activeSteps.length > 0 && (
            <VisualSequenceFilmstrip
              steps={s.activeSteps}
              exercisesById={exerciseMap}
              activeStepId={previewStep}
              onSelectStep={(step, _index, trigger) => openInspector(step, trigger)}
            />
          )}
          {isArrangeStage && s.activeSteps.length > 0 && sequenceViewMode === 'timeline' && (
            <div
              className="pf-spring-ribbon-board"
              data-testid="spring-timeline-ribbon"
              role="region"
              aria-label="타임라인 및 스프링 흐름 보드"
            >
              <span className="pf-step-kicker-badge">타임라인 & 스프링 흐름 뷰</span>
              <p style={{ margin: '0 0 8px', fontSize: '0.84rem', color: '#56685f' }}>
                가로 블록 너비는 소요 시간에 비례하며, 색상으로 스프링 장력 전환 지점을 한눈에
                확인합니다.
              </p>
              <div className="pf-spring-ribbon-track">
                {s.activeSteps.map((st, idx) => {
                  const exItem = !isRestStep(st) ? exerciseMap.get(st.exerciseId) : undefined;
                  const spRaw = (st.customSpringOverride || exItem?.springs || '').toLowerCase();
                  const tone =
                    isRestStep(st) || !spRaw
                      ? 'is-sage'
                      : /red|빨|2r|1r/.test(spRaw)
                        ? 'is-red'
                        : /blue|파|1b|2b/.test(spRaw)
                          ? 'is-blue'
                          : 'is-yellow';
                  const minVal = Math.max(1, Number(st.durationMin.toFixed(1)));
                  return (
                    <button
                      key={st.stepId}
                      type="button"
                      className={`pf-spring-ribbon-block ${tone}`}
                      style={{ width: `${Math.max(132, Math.round(minVal * 26))}px` }}
                      onClick={(event) => {
                        if (!isRestStep(st)) openInspector(st, event.currentTarget);
                      }}
                    >
                      <small style={{ fontSize: '0.74rem', opacity: 0.8 }}>
                        {String(idx + 1).padStart(2, '0')} · {minVal}분
                      </small>
                      <strong style={{ fontSize: '0.88rem', lineHeight: 1.3 }}>
                        {isRestStep(st) ? '중간 휴식' : (exItem?.nameKo ?? '동작')}
                      </strong>
                      {!isRestStep(st) && (st.customSpringOverride || exItem?.springs) && (
                        <SpringVisualPills
                          springs={st.customSpringOverride || exItem?.springs}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {isArrangeStage && selectedBundleStepCount > 0 && (
            <div
              className="pf-step3-bundle-selection-bar"
              data-testid="step3-bundle-selection-bar"
              role="region"
              aria-label="선택 동작 묶음 저장 도구"
            >
              <strong>선택한 {selectedBundleStepCount}개 동작</strong>
              <input
                type="text"
                value={blockTitleInput}
                onChange={(event) => setBlockTitleInput(event.target.value)}
                placeholder={`${s.activeTitle || '오늘의 시퀀스'} 묶음`}
                aria-label="선택 동작 묶음 이름"
              />
              <PfButton
                variant="primary"
                data-testid="save-selected-steps-bundle-btn"
                onClick={handleSaveSelectedStepsToBlock}
              >
                선택 동작 묶음 저장
              </PfButton>
              <PfButton
                variant="text"
                onClick={() => setSelectedBundleStepIds(new Set())}
              >
                선택 해제
              </PfButton>
            </div>
          )}
          {isArrangeStage && s.activeSteps.length > 0 && (
          <div
            className={`flow-sections ${
              sequenceViewMode === 'columns' ? 'is-columns-view' : ''
            }`.trim()}
          >
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
                          className={`flow-step ${
                            justUpdatedStepId === step.stepId ? 'is-just-updated' : ''
                          }`.trim()}
                        >
                          <div className="step-main">
                            <label
                              className="step-bundle-select-label"
                              title="동작 묶음 저장용 선택"
                            >
                              <input
                                type="checkbox"
                                className="step-bundle-select-check"
                                data-testid="step-bundle-select-checkbox"
                                checked={selectedBundleStepIds.has(step.stepId)}
                                aria-label={`${index + 1}번 ${ex.nameKo} 묶음 저장 선택`}
                                onChange={() => toggleBundleStepSelection(step.stepId)}
                              />
                              <span className="step-number">
                                {String(index + 1).padStart(2, '0')}
                              </span>
                            </label>
                            <button
                              className="step-art"
                              onClick={() => onOpenYouTubePreview(ex)}
                              aria-label={`${ex.nameKo} 자료 보기`}
                            >
                              <WorkbenchMovementMark
                                exercise={ex}
                                springsOverride={step.customSpringOverride}
                              />
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
                                {(step.customSpringOverride || ex.springs) && (
                                  <>
                                    {' '}
                                    <SpringVisualPills
                                      springs={step.customSpringOverride || ex.springs}
                                    />
                                  </>
                                )}
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
                                      : '교차 검증 가이드'}
                                </PfBlockPill>
                              </span>
                            </button>
                            {step.sourceBlockId && step.blockInstanceId && (() => {
                              const latestBlock = savedReusableBlockMap.get(step.sourceBlockId);
                              const isFirstInInstance =
                                s.activeSteps.findIndex(
                                  (item) => item.blockInstanceId === step.blockInstanceId,
                                ) === index;
                              const hasNewerTemplate =
                                Boolean(latestBlock) &&
                                !step.blockInstanceDetached &&
                                (latestBlock?.version ?? 1) > (step.sourceBlockVersion ?? 1);
                              return (
                                <div
                                  className="step-bundle-provenance-row"
                                  data-testid="step-bundle-provenance"
                                >
                                  <span className="step-bundle-provenance-badge">
                                    묶음 복사본 · {step.sourceBlockTitle || latestBlock?.title || '재사용 묶음'} v
                                    {step.sourceBlockVersion ?? 1}
                                    {step.blockInstanceDetached ? ' · 이 수업 맞춤 수정됨' : ''}
                                  </span>
                                  {isFirstInInstance && hasNewerTemplate && latestBlock && (
                                    <button
                                      type="button"
                                      className="step-bundle-sync-btn"
                                      data-testid="sync-bundle-instance-btn"
                                      onClick={() =>
                                        handleSyncBlockInstanceToLatest(
                                          step.blockInstanceId!,
                                          latestBlock.id,
                                        )
                                      }
                                    >
                                      원본 v{latestBlock.version} 변경됨 · 이 수업에 반영
                                    </button>
                                  )}
                                </div>
                              );
                            })()}
                            <div
                              className="step-quick-duration-stepper"
                              data-testid="step-quick-duration-stepper"
                              role="group"
                              aria-label={`${index + 1}번 동작 시간 빠른 조절`}
                            >
                              <button
                                type="button"
                                className="step-quick-duration-btn"
                                aria-label={`${index + 1}번 동작 30초 줄이기`}
                                disabled={!!step.locked || timing.totalSec <= 60}
                                onClick={() => {
                                  s.adjustStepDuration(index, -0.5);
                                  setJustUpdatedStepId(step.stepId);
                                  setNotice(
                                    `${index + 1}번 동작 시간을 30초 줄였어요. 되돌리기로 복구할 수 있습니다.`,
                                  );
                                }}
                              >
                                -0.5분
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
                              <button
                                type="button"
                                className="step-quick-duration-btn"
                                aria-label={`${index + 1}번 동작 30초 늘리기`}
                                disabled={!!step.locked || step.durationMin >= 20}
                                onClick={() => {
                                  s.adjustStepDuration(index, 0.5);
                                  setJustUpdatedStepId(step.stepId);
                                  setNotice(
                                    `${index + 1}번 동작 시간을 30초 늘렸어요. 되돌리기로 복구할 수 있습니다.`,
                                  );
                                }}
                              >
                                +0.5분
                              </button>
                            </div>
                            <div
                              className="step-quick-reps-stepper"
                              data-testid="step-quick-reps-stepper"
                              role="group"
                              aria-label={`${index + 1}번 동작 반복 횟수 빠른 선택`}
                            >
                              {([8, 10, 12] as const).map((rep) => {
                                const isSelectedRep = step.repetitions === rep;
                                return (
                                  <button
                                    key={rep}
                                    type="button"
                                    className={`step-quick-rep-chip ${
                                      isSelectedRep ? 'is-selected' : ''
                                    }`.trim()}
                                    aria-pressed={isSelectedRep}
                                    aria-label={`${index + 1}번 동작 ${rep}회 반복`}
                                    disabled={!!step.locked}
                                    onClick={() => {
                                      const nextRep = isSelectedRep ? undefined : rep;
                                      s.setStepPracticeOptions(index, { repetitions: nextRep });
                                      setJustUpdatedStepId(step.stepId);
                                      setNotice(
                                        nextRep
                                          ? `${index + 1}번 동작 반복 횟수를 ${nextRep}회로 맞췄어요.`
                                          : `${index + 1}번 동작 반복 횟수 표시를 해제했어요.`,
                                      );
                                    }}
                                  >
                                    {rep}회
                                  </button>
                                );
                              })}
                            </div>
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
                                onClick={(event) =>
                                  openReplaceForStep(index, false, event.currentTarget)
                                }
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
          )}
          {isArrangeStage && s.activeSteps.length > 0 && (() => {
            const fallbackIdx = s.activeSteps.findIndex((st) => !isRestStep(st));
            const summaryIdx = selectedStepIndex >= 0 ? selectedStepIndex : fallbackIdx;
            const summaryStep = summaryIdx >= 0 ? s.activeSteps[summaryIdx] : undefined;
            const summaryEx =
              summaryStep && !isRestStep(summaryStep)
                ? exerciseMap.get(summaryStep.exerciseId)
                : undefined;
            if (!summaryStep || !summaryEx) return null;
            const summarySprings = (summaryStep.customSpringOverride || summaryEx.springs || '').trim();
            return (
              <section
                className="pf-b05-3sec-summary-panel"
                data-testid="board05-3sec-summary-panel"
                aria-label="선택된 동작 3초 요약 패널"
              >
                <div className="pf-b05-3sec-summary-panel__head">
                  <div>
                    <span className="pf-studio-kicker-pill">SELECTED MOVEMENT · 3초 요약</span>
                    <h3>
                      선택된 동작 3초 요약 패널 — {String(summaryIdx + 1).padStart(2, '0')}{' '}
                      {summaryEx.nameKo}
                    </h3>
                  </div>
                  <div className="pf-b05-3sec-summary-panel__actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={(event) => openInspector(summaryStep, event.currentTarget)}
                    >
                      블록 시간·레이어 편집
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => onOpenYouTubePreview(summaryEx)}
                    >
                      3D 모션·원본 상세 열기
                    </button>
                  </div>
                </div>
                <div className="pf-b05-3sec-summary-panel__grid">
                  <div className="pf-b05-3sec-summary-panel__left">
                    <Studio3DMotionHeroCard exercise={summaryEx} compact />
                  </div>
                  <div className="pf-b05-3sec-summary-panel__right">
                    <div className="pf-b05-summary-box">
                      <span>권장 스프링 · 기구 셋업</span>
                      <div className="pf-b05-summary-box__val">
                        {summarySprings ? (
                          <SpringVisualPills springs={summarySprings} />
                        ) : (
                          <strong>맨몸 / 무스프링</strong>
                        )}
                        <small>
                          풋바 {summaryEx.footbar} · 헤드레스트 {summaryEx.headrest}
                          {summaryEx.box !== 'none' ? ` · ${summaryEx.box}` : ''}
                        </small>
                      </div>
                    </div>
                    <div className="pf-b05-summary-box">
                      <span>호흡 &amp; 카운트 템포</span>
                      <strong>
                        {summaryEx.breathPattern || '내쉬며 정점 연결 · 마시며 정렬 복귀'} (
                        {summaryStep.repetitions ?? 10}회 권장)
                      </strong>
                    </div>
                    <div className="pf-b05-summary-box">
                      <span>핵심 티칭 큐 2줄</span>
                      <p>
                        1) {summaryEx.cues[0] || '골반과 흉곽의 중립 정렬을 유지합니다.'}
                        {summaryEx.cues[1] ? ` / 2) ${summaryEx.cues[1]}` : ''}
                      </p>
                    </div>
                    <div className="pf-b05-summary-box is-caution">
                      <span>금기 · 주의 보상 패턴</span>
                      <p>
                        ⚠{' '}
                        {summaryEx.precautions ||
                          '과신전 및 어깨 거상 주의 · 통증 없는 가동 범위 내에서 진행하세요.'}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            );
          })()}
          {isArrangeStage && s.activeSteps.length > 0 && (
            <div className="pf-p04-mobile-sticky-cta" data-testid="p04-mobile-sticky-live-cta">
              <button
                type="button"
                className="btn-primary pf-p04-live-btn"
                disabled={!canStartClass}
                onClick={startClass}
              >
                <Play size={17} aria-hidden="true" />
                <span>
                  이 시퀀스로 라이브 진행 열기 ({exerciseStepCount}동작 · {formatSecondsToMMSS(total)})
                </span>
              </button>
            </div>
          )}
          {isArrangeStage && s.activeSteps.length > 0 && (
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
          {isArrangeStage && s.activeSteps.length > 0 && (
            <RestInsertControl
              steps={s.activeSteps}
              labelForStep={(step) =>
                isRestStep(step) ? '휴식' : (exerciseMap.get(step.exerciseId)?.nameKo ?? '동작')
              }
              onAdd={(duration, afterIndex) => s.addRestStep(duration, afterIndex)}
            />
          )}
          {isArrangeStage && s.activeSteps.length > 0 && (
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
          {isArrangeStage && s.activeSteps.length > 0 && (
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
              <PfButton variant="text" onClick={handleSaveCopy}>
                <Copy size={16} />
                사본 저장
              </PfButton>
            </div>
          )}
          {isArrangeStage && s.activeSteps.length > 0 && (
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
          {isArrangeStage && s.activeSteps.length > 0 && (
            <div className="workbench-readiness-row">
              <p className="workbench-readiness-summary" id="start-class-readiness">
                {startReadiness}
              </p>
              {!canStartClass && !exerciseStepCount && (
                <button
                  type="button"
                  className="workbench-inline-action-chip"
                  onClick={openExerciseFinder}
                >
                  <Plus size={14} aria-hidden="true" /> 동작 고르기
                </button>
              )}
              {!canStartClass &&
                exerciseStepCount > 0 &&
                blockingStepIndex !== null &&
                s.activeSteps[blockingStepIndex] && (
                  <button
                    type="button"
                    className="workbench-inline-action-chip"
                    onClick={(event) => {
                      const targetStep = s.activeSteps[blockingStepIndex]!;
                      if (!isRestStep(targetStep)) {
                        openInspector(targetStep, event.currentTarget);
                      } else {
                        const card =
                          document.querySelectorAll<HTMLElement>('.sequence-order-card')[
                            blockingStepIndex
                          ];
                        card?.scrollIntoView?.({
                          block: 'center',
                          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
                        });
                        card?.focus();
                      }
                    }}
                  >
                    {blockingStepIndex + 1}번 항목 확인
                  </button>
                )}
            </div>
          )}
          {isArrangeStage && s.activeSteps.length > 0 && pendingStepCount > 0 && (
            <details className="workbench-material-notes">
              <summary>자료 안내</summary>
              <p>
                교차 검증 가이드 {pendingStepCount}개 · 검토 기록은 선택 사항입니다. 기록 유무는 동작의
                정확성이나 개인별 운동 적합성을 보장하지 않습니다.
              </p>
            </details>
          )}
          {isArrangeStage && s.activeSteps.length > 0 && ideasSectionNode}
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
          {isArrangeStage && s.activeSteps.length > 0 && (
            <details className="workbench-automation-tools">
              <summary>원클릭 추천 클래스 레시피 열기 (선택)</summary>
              <AtelierQuickStartGallery
                exercises={s.exercises}
                onApplyQuickRecipe={applyQuickStartRecipe}
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
          {isArrangeStage && s.activeSteps.length > 0 && (
            <details
              className="workbench-automation-tools workbench-flow-telemetry-details"
              open={flowTelemetryOpen}
              onToggle={(event) => setFlowTelemetryOpen(event.currentTarget.open)}
            >
              <summary>기구 전환·움직임 균형·3D 기구 점검 (선택)</summary>
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
                      applyStepsWithUndo(nextSteps, noticeMessage);
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
                      applyStepsWithUndo(
                        nextSteps,
                        '기구·체위 전환 구간에 권장 여유 시간(Transition Buffer)을 반영했어요.',
                      );
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
                      const calibrationGroupId = criteria.targetGroupId ?? 'all';
                      const buildCalibrationSig = (stepsToCheck: readonly SequenceStep[]) =>
                        canonicalRecoveryContent({
                          groupId: calibrationGroupId,
                          logs: s.historyLogs.map((log) => ({
                            id: log.id,
                            groupId: log.groupId,
                            actualDurationSec: log.actualDurationSec ?? null,
                            steps: log.stepsSnapshot
                              ? serializeSemanticSteps(log.stepsSnapshot)
                              : null,
                          })),
                          steps: serializeSemanticSteps(stepsToCheck),
                        });
                      const currentSig = buildCalibrationSig(
                        usePilatesStore.getState().activeSteps,
                      );
                      if (lastCalibratedSignatureRef.current === currentSig) {
                        setNotice(
                          '이미 현재 시퀀스에 실제 소요 시간 보정이 반영되어 있습니다. 다시 조정하려면 되돌리기 후 적용해 주세요.',
                        );
                        return;
                      }
                      applyStepsWithUndo(nextSteps, noticeMessage);
                      lastCalibratedSignatureRef.current = buildCalibrationSig(
                        usePilatesStore.getState().activeSteps,
                      );
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
                    applyStepsWithUndo(
                      payload.steps,
                      `‘${payload.title}’ 초안을 현재 수업 시퀀스에 반영했습니다.`,
                      {
                        alsoSetNotice: false,
                        meta: {
                          title: payload.title,
                          subtitle: payload.subtitle,
                          targetMinutes: payload.targetMinutes,
                          level: payload.level,
                          apparatus: payload.apparatus,
                        },
                      },
                    );
                  }}
                  onSaveUnreviewedMovementIdea={(exercise) => {
                    s.addCustomExercise(exercise);
                  }}
                  onAddExerciseToSequence={(exerciseId, blockCategory) => {
                    const beforeLen = usePilatesStore.getState().activeSteps.length;
                    s.appendExerciseToSequence(exerciseId, blockCategory);
                    const after = usePilatesStore.getState();
                    if (after.activeSteps.length > beforeLen) {
                      setWorkflowStep('arrange');
                      setNotice('추천 동작을 현재 수업 시퀀스에 추가했습니다.');
                      return { ok: true };
                    }
                    return {
                      ok: false,
                      message:
                        after.generationError ||
                        '현재 수업 조건(기구·난이도·보유 소도구) 또는 중복 여부를 확인해 주세요.',
                    };
                  }}
                  onApplyConditionTemplate={(templateId) => {
                    applyTemplate(templateId);
                  }}
                  onSaveConditionTemplate={(name, newCriteria) => {
                    s.setDraftCriteria(withExactSelection(newCriteria));
                    s.saveConditionTemplate(name);
                    setNotice(`‘${name}’ 조건을 보관했습니다.`);
                  }}
                  onFillStarterSequence={() => {
                    setPlanningMode('auto');
                    generate();
                  }}
                  onOpenExerciseFinder={openExerciseFinder}
                />
              </Suspense>
            )}
          </details>
              {isArrangeStage && s.activeSteps.length > 0 && (
                <div className="pf-step-cta-bar">
                  <button
                    type="button"
                    className="pf-step-nav-pill-btn"
                    onClick={() => {
                      setManualWizardPage('step2');
                      setWorkflowStepState('select');
                    }}
                  >
                    ← 2단계 동작 담기 화면
                  </button>
                  <div className="pf-step-cta-bar__right">
                    <button
                      type="button"
                      className="pf-step-nav-pill-btn is-primary"
                      onClick={openPlanPreview}
                    >
                      4단계 미리보기·진행 확인 <ArrowRight size={17} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}
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
                    onReplace={() =>
                      openReplaceForStep(
                        selectedStepIndex,
                        true,
                        document.activeElement instanceof HTMLElement
                          ? document.activeElement
                          : null,
                      )
                    }
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
                  ? '현재 1단계: 동작 고르기 · 필요한 동작을 고른 뒤 다음 단계에서 순서와 시간을 맞추세요.'
                  : '현재 2단계: 수업 구성 확인 · -0.5분/+0.5분으로 시간을 맞추고 저장·미리보기 하세요.'}
              </span>
              <div className="pf-step-guide-nav" style={{ wordBreak: 'keep-all' }}>
                {s.activeSteps.length > 0 && workflowStep === 'select' && !finderOpen && (
                  <button
                    type="button"
                    className="btn-primary"
                    data-testid="workbench-step-open-finder"
                    style={{
                      minHeight: '44px',
                      padding: '6px 12px',
                      fontSize: '0.8rem',
                      wordBreak: 'keep-all',
                    }}
                    onClick={openExerciseFinder}
                  >
                    <Plus size={15} aria-hidden="true" /> 동작 선택창 열기
                  </button>
                )}
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
                    if (workflowStep === 'select' && s.activeSteps.length > 0 && !finderOpen) {
                      openExerciseFinder();
                      return;
                    }
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
        </>
      )}
      <LightDismissDialog
        open={
          !!selectedStep &&
          !wideEditor &&
          !sourceDetailOpen &&
          replaceIndex === null &&
          !conditionsOpen
        }
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
              playbackActive={!sourceDetailOpen && replaceIndex === null && !conditionsOpen}
              loadDraft={() => inspectorDraftCache.current}
              onDraftChange={(value) => {
                inspectorDraftCache.current = value;
                syncRecoveryState(value);
              }}
              onClose={closeInspector}
              onOpenExercise={onOpenYouTubePreview}
              onReplace={() =>
                openReplaceForStep(
                  selectedStepIndex,
                  true,
                  document.activeElement instanceof HTMLElement ? document.activeElement : null,
                )
              }
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
        onClose={cancelReplaceDialog}
        title="이 동작만 교체"
        subtitle="같은 기구와 현재 난이도 안에서 고릅니다. 이 자리의 전체 시간은 유지됩니다."
        maxWidth="680px"
      >
        <input
          ref={replaceSearchInputRef}
          className="replacement-search"
          aria-label="교체할 동작 검색"
          placeholder="동작명이나 부위 검색"
          value={replaceSearch}
          onChange={(event) => setReplaceSearch(event.target.value)}
        />
        <div className="replacement-list">
          {candidates.slice(0, 30).map((ex) => (
            <button
              type="button"
              className="replacement-item"
              key={ex.id}
              onClick={() => {
                if (replaceIndex === null) return;
                const stepNumber = replaceIndex + 1;
                const wasFromInspector = replaceFromInspector;
                const replacedStepId = s.activeSteps[replaceIndex]?.stepId ?? null;
                s.replaceStepExercise(replaceIndex, ex.id);
                if (!usePilatesStore.getState().generationError) {
                  inspectorDraftCache.current = null;
                  if (wasFromInspector && replacedStepId) {
                    setPreviewStep(replacedStepId);
                  }
                  setNotice(
                    `${stepNumber}번 동작을 ‘${ex.nameKo}’(으)로 교체했어요. 잘못 바꿨다면 되돌리기로 복구할 수 있습니다.`,
                  );
                }
                setReplaceIndex(null);
                setReplaceSearch('');
                setReplaceFromInspector(false);
                requestAnimationFrame(() => {
                  if (wasFromInspector && !wideEditor) {
                    inspectorContentRef.current
                      ?.querySelector<HTMLElement>('button, input, select, textarea')
                      ?.focus();
                  } else if (replaceOpenerRef.current?.isConnected) {
                    replaceOpenerRef.current.focus();
                  }
                });
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
              {replaceSearch.trim().length > 0 && (
                <div className="replacement-empty-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setReplaceSearch('');
                      replaceSearchInputRef.current?.focus();
                    }}
                  >
                    검색어 지우기
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="replacement-dialog-footer">
          <button type="button" className="btn-secondary" onClick={cancelReplaceDialog}>
            {replaceFromInspector ? '블록 편집으로 돌아가기' : '교체 취소'}
          </button>
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
