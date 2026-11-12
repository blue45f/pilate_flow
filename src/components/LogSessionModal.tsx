import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Clock3, Info, Plus, ShieldCheck } from 'lucide-react';
import { PfBadge, PfButton, PfField, PfFormError, PfInput, PfSelect, PfTextarea } from '../design-system';
import { LogClassHistorySchema } from '../schemas/pilatesSchema';
import { usePilatesStore } from '../store/usePilatesStore';
import type { SequenceStep } from '../types/pilates';
import type { ClassHistoryLogWithSnapshot } from '../types/teachingHistorySnapshot';
import { resolveClassCardVisualMeta } from '../utils/memberBookingBridge';
import { getSavedHumanMovementDrafts, getSavedReusableBlocks } from '../utils/movementIdeaDraft';
import { formatSecondsToMMSS, getSequenceDurations, isRestStep } from '../utils/sequenceEngine';
import {
  attachProgramSnapshotToHistoryLog,
  buildTeachingProgramSnapshot,
  findDuplicateCompletedHistoryLog,
} from '../utils/teachingHistorySnapshot';
import { LightDismissDialog } from './LightDismissDialog';
import { SpringVisualPills } from './SpringVisualPills';
import '../styles/design-tokens.css';
import '../styles/teaching.css';
import './LogSessionModal.css';

export interface TeachingLogContext {
  actualDurationSec?: number;
  actualRestDurationSec?: number;
  stepsSnapshot?: SequenceStep[];
  sequenceTitle?: string;
  taughtStepIds?: string[];
}

interface LogSessionModalProps {
  sequenceId: string | null;
  onClose: () => void;
  context?: TeachingLogContext;
}

interface SessionLogDraft {
  step?: 1 | 2 | 3;
  reflection?: string;
  rating?: 1 | 2 | 3 | 4 | 5;
  intensity?: 'relaxed' | 'moderate' | 'intense';
  minutes?: string;
  seconds?: string;
  taughtDate?: string;
  groupId?: string;
  selectedStepIds?: string[];
}

type LogValidationField =
  | 'newGroup'
  | 'group'
  | 'taughtDate'
  | 'minutes'
  | 'seconds'
  | 'steps'
  | null;

const getDraftStorageKey = (sequenceId: string) => `pf_log_session_draft_v1:${sequenceId}`;

const readSessionLogDraft = (sequenceId: string): SessionLogDraft | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(getDraftStorageKey(sequenceId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as SessionLogDraft;
  } catch {
    return null;
  }
};

const localDate = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function resolveInitialSelectedSteps(
  snapshot: readonly SequenceStep[],
  initialDraft: SessionLogDraft | null,
  context?: TeachingLogContext,
): Set<string> {
  const validIds = new Set(snapshot.map((step) => step.stepId));

  if (Array.isArray(initialDraft?.selectedStepIds)) {
    // Distinguish an explicit empty array (all unchecked) from an omitted/unspecified field.
    if (initialDraft.selectedStepIds.length === 0) {
      return new Set<string>();
    }
    const restored = initialDraft.selectedStepIds.filter(
      (id): id is string => typeof id === 'string' && validIds.has(id),
    );
    if (snapshot.some((step) => restored.includes(step.stepId) && !isRestStep(step))) {
      return new Set(restored);
    }
  }

  if (context?.taughtStepIds !== undefined) {
    return new Set(
      context.taughtStepIds.filter(
        (id): id is string => typeof id === 'string' && validIds.has(id),
      ),
    );
  }

  return new Set(snapshot.map((step) => step.stepId));
}

export const LogSessionModal: React.FC<LogSessionModalProps> = (props) =>
  props.sequenceId ? (
    <SessionLogForm
      key={props.sequenceId}
      sequenceId={props.sequenceId}
      onClose={props.onClose}
      context={props.context}
    />
  ) : null;

const SessionLogForm: React.FC<
  Omit<LogSessionModalProps, 'sequenceId'> & { sequenceId: string }
> = ({ sequenceId, onClose, context }) => {
  const {
    savedSequences,
    classGroups,
    activeTitle,
    activeSubtitle,
    activeSequenceId,
    activeSteps,
    activeApparatus,
    activeLevel,
    activeTargetGroupId,
    exercises,
    persistenceError,
    logClassSession,
    addClassGroup,
    setActiveTab,
  } = usePilatesStore();
  const reflectionHintId = useId();
  const reflectionInputId = useId();
  const saved = savedSequences.find((sequence) => sequence.id === sequenceId);
  const [initialDraft] = useState(() => readSessionLogDraft(sequenceId));
  const [draftRestored] = useState(() => initialDraft !== null);
  const [hasEditedDraft, setHasEditedDraft] = useState(false);
  const [logStep, setLogStep] = useState<1 | 2 | 3>(() =>
    initialDraft?.step === 2 || initialDraft?.step === 3 ? initialDraft.step : 1,
  );
  const logStep1Ref = useRef<HTMLDivElement>(null);
  const logStep2Ref = useRef<HTMLDetailsElement>(null);
  const logStep2SummaryRef = useRef<HTMLElement>(null);
  const logStep3Ref = useRef<HTMLDivElement>(null);
  const groupSelectRef = useRef<HTMLSelectElement>(null);
  const newGroupInputRef = useRef<HTMLSelectElement | HTMLInputElement>(null);
  const taughtDateInputRef = useRef<HTMLInputElement>(null);
  const minutesInputRef = useRef<HTMLInputElement>(null);
  const secondsInputRef = useRef<HTMLInputElement>(null);

  // Capture the reviewed plan and exercise definitions once; edits elsewhere cannot change this record.
  const [snapshot] = useState(() =>
    (
      context?.stepsSnapshot ??
      (sequenceId === activeSequenceId ? activeSteps : saved?.steps) ??
      []
    ).map((step) => structuredClone(step)),
  );
  const [exercisesAtOpen] = useState(() => exercises.map((exercise) => structuredClone(exercise)));
  const [humanDraftsAtOpen] = useState(() =>
    getSavedHumanMovementDrafts().map((draft) => structuredClone(draft)),
  );
  const [reusableBlocksAtOpen] = useState(() =>
    getSavedReusableBlocks().map((block) => structuredClone(block)),
  );
  const [sourceSubtitle] = useState(
    () => (sequenceId === activeSequenceId ? activeSubtitle : saved?.subtitle) ?? '',
  );
  const [sourceKind] = useState<'saved-sequence' | 'active-draft'>(() =>
    saved ? 'saved-sequence' : 'active-draft',
  );
  const [selectedSteps, setSelectedSteps] = useState(() =>
    resolveInitialSelectedSteps(snapshot, initialDraft, context),
  );
  const [stepsOpen, setStepsOpen] = useState(() => {
    const initialSelectedExercises = snapshot.filter(
      (step) => selectedSteps.has(step.stepId) && !isRestStep(step),
    ).length;
    const hasExercises = snapshot.some((step) => !isRestStep(step));
    return (
      context?.taughtStepIds !== undefined ||
      (hasExercises && initialSelectedExercises === 0)
    );
  });

  const navigateLogStep = (nextStep: 1 | 2 | 3) => {
    setHasEditedDraft(true);
    setLogStep(nextStep);
    if (nextStep === 2) {
      setStepsOpen(true);
    }
    const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth';
    requestAnimationFrame(() => {
      if (nextStep === 1) {
        logStep1Ref.current?.scrollIntoView?.({ behavior, block: 'nearest' });
      } else if (nextStep === 2) {
        logStep2Ref.current?.scrollIntoView?.({ behavior, block: 'nearest' });
      } else {
        logStep3Ref.current?.scrollIntoView?.({ behavior, block: 'nearest' });
      }
    });
  };

  const focusValidationTarget = (
    targetStep: 1 | 2 | 3,
    resolveElement: () => HTMLElement | null | undefined,
    openSteps = false,
  ) => {
    setLogStep(targetStep);
    if (openSteps) {
      setStepsOpen(true);
    }
    const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth';
    requestAnimationFrame(() => {
      const element = resolveElement();
      if (!element || !element.isConnected) return;
      element.scrollIntoView?.({ behavior, block: 'nearest' });
      element.focus();
    });
  };

  const [title] = useState(
    () =>
      context?.sequenceTitle ??
      (sequenceId === activeSequenceId ? activeTitle : saved?.title) ??
      activeTitle,
  );
  const logVisualMeta = resolveClassCardVisualMeta({
    sequence: {
      title,
      apparatus: saved?.apparatus ?? activeApparatus,
      level: saved?.level ?? activeLevel,
      steps: snapshot,
    },
    exercises: exercisesAtOpen,
    title,
    fallbackLevel: saved?.level ?? activeLevel,
  });
  const [groupId, setGroupId] = useState(() => {
    if (
      typeof initialDraft?.groupId === 'string' &&
      classGroups.some((group) => group.id === initialDraft.groupId)
    ) {
      return initialDraft.groupId;
    }
    return classGroups.some((group) => group.id === activeTargetGroupId)
      ? activeTargetGroupId
      : (classGroups[0]?.id ?? '');
  });
  const [taughtDate, setTaughtDate] = useState(() => {
    const today = localDate();
    if (
      typeof initialDraft?.taughtDate === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(initialDraft.taughtDate) &&
      initialDraft.taughtDate <= today
    ) {
      return initialDraft.taughtDate;
    }
    return today;
  });
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(() =>
    initialDraft?.rating === 1 ||
    initialDraft?.rating === 2 ||
    initialDraft?.rating === 3 ||
    initialDraft?.rating === 4 ||
    initialDraft?.rating === 5
      ? initialDraft.rating
      : 3,
  );
  const [intensity, setIntensity] = useState<'relaxed' | 'moderate' | 'intense'>(() =>
    initialDraft?.intensity === 'relaxed' ||
    initialDraft?.intensity === 'moderate' ||
    initialDraft?.intensity === 'intense'
      ? initialDraft.intensity
      : 'moderate',
  );
  const [reflection, setReflection] = useState(() =>
    typeof initialDraft?.reflection === 'string' ? initialDraft.reflection : '',
  );
  const [minutes, setMinutes] = useState(() => {
    if (typeof initialDraft?.minutes === 'string' && initialDraft.minutes !== '') {
      return initialDraft.minutes;
    }
    if (context?.actualDurationSec !== undefined) {
      return String(Math.floor(context.actualDurationSec / 60));
    }
    return typeof initialDraft?.minutes === 'string' ? initialDraft.minutes : '';
  });
  const [seconds, setSeconds] = useState(() => {
    if (typeof initialDraft?.seconds === 'string' && initialDraft.seconds !== '') {
      return initialDraft.seconds;
    }
    if (context?.actualDurationSec !== undefined) {
      return String(Math.round(context.actualDurationSec % 60));
    }
    return typeof initialDraft?.seconds === 'string' ? initialDraft.seconds : '';
  });
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState<LogValidationField>(null);
  const [pendingCloseRequest, setPendingCloseRequest] = useState<(() => void) | null>(null);
  const [showGroup, setShowGroup] = useState(classGroups.length === 0);
  const [newGroupName, setNewGroupName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const submittingRef = useRef(false);
  const planned = snapshot.reduce((sum, step) => sum + step.durationMin, 0);
  const plannedTiming = getSequenceDurations(snapshot);
  const parsedMinutesInput = Number.parseInt(String(minutes), 10);
  const parsedSecondsInput = Number.parseInt(String(seconds), 10);
  const hasUserEnteredDuration =
    (String(minutes).trim() !== '' && !Number.isNaN(parsedMinutesInput)) ||
    (String(seconds).trim() !== '' && !Number.isNaN(parsedSecondsInput));
  const currentActualSec = hasUserEnteredDuration
    ? (Number.isNaN(parsedMinutesInput) ? 0 : Math.max(0, parsedMinutesInput)) * 60 +
      (Number.isNaN(parsedSecondsInput) ? 0 : Math.max(0, parsedSecondsInput))
    : typeof context?.actualDurationSec === 'number' && context.actualDurationSec > 0
      ? Math.round(context.actualDurationSec)
      : null;
  const durationDeltaSec =
    plannedTiming.totalSec > 0 && currentActualSec !== null && currentActualSec > 0
      ? currentActualSec - plannedTiming.totalSec
      : null;
  const exerciseCount = snapshot.filter((step) => !isRestStep(step)).length;
  const selectedExerciseCount = snapshot.filter(
    (step) => selectedSteps.has(step.stepId) && !isRestStep(step),
  ).length;
  const allStepsSelected =
    snapshot.length > 0 && snapshot.every((step) => selectedSteps.has(step.stepId));

  useEffect(() => {
    if (!hasEditedDraft || submitted) return;
    try {
      const draft: SessionLogDraft = {
        step: logStep,
        reflection,
        rating,
        intensity,
        minutes,
        seconds,
        taughtDate,
        groupId,
        selectedStepIds: Array.from(selectedSteps),
      };
      window.sessionStorage.setItem(getDraftStorageKey(sequenceId), JSON.stringify(draft));
    } catch {
      // Ignore sessionStorage errors in restricted environments.
    }
  }, [
    hasEditedDraft,
    submitted,
    sequenceId,
    logStep,
    reflection,
    rating,
    intensity,
    minutes,
    seconds,
    taughtDate,
    groupId,
    selectedSteps,
  ]);

  const clearFieldErrorIfMatching = (...fields: LogValidationField[]) => {
    if (errorField && fields.includes(errorField)) {
      setErrorField(null);
      setError('');
    }
  };

  const handleSelectAllPlannedSteps = () => {
    setHasEditedDraft(true);
    setSelectedSteps(new Set(snapshot.map((step) => step.stepId)));
    clearFieldErrorIfMatching('steps');
  };

  const handleClearAllSelectedSteps = () => {
    setHasEditedDraft(true);
    setSelectedSteps(new Set());
  };

  const createGroup = () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) {
      setError('수업 그룹 별칭을 입력해 주세요.');
      setErrorField('newGroup');
      focusValidationTarget(1, () => newGroupInputRef.current);
      return;
    }
    const normalizedNewName = trimmed.toLowerCase().replace(/\s+/g, ' ');
    const existing = classGroups.find(
      (group) => group.name.trim().toLowerCase().replace(/\s+/g, ' ') === normalizedNewName,
    );
    if (existing) {
      setHasEditedDraft(true);
      setGroupId(existing.id);
      setNewGroupName('');
      setShowGroup(false);
      setError('');
      setErrorField(null);
      return;
    }
    addClassGroup({
      name: trimmed,
      type: 'group',
      defaultLevel: '1.5',
      scheduleLabel: '',
      notes: '',
    });
    const added = usePilatesStore.getState().classGroups.at(-1);
    if (added) {
      setHasEditedDraft(true);
      setGroupId(added.id);
    }
    setNewGroupName('');
    setShowGroup(false);
    setError('');
    setErrorField(null);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (submitted || submittingRef.current) return;
    setError('');
    setErrorField(null);
    const date = new Date(`${taughtDate}T12:00:00`);
    if (!taughtDate || Number.isNaN(date.getTime()) || taughtDate > localDate()) {
      setError('오늘 또는 이전 수업 일자를 선택해 주세요.');
      setErrorField('taughtDate');
      focusValidationTarget(1, () => taughtDateInputRef.current);
      return;
    }
    let actualDurationSec: number | undefined;
    if (minutes !== '' || seconds !== '') {
      const mins = Number(minutes || 0);
      const secs = Number(seconds || 0);
      const minsValid = minutes === '' || (Number.isInteger(mins) && mins >= 0 && mins <= 1440);
      const secsValid = seconds === '' || (Number.isInteger(secs) && secs >= 0 && secs <= 59);
      if (!minsValid || !secsValid) {
        setError('진행 시간은 0~1440분, 0~59초로 입력해 주세요.');
        setErrorField(!minsValid ? 'minutes' : 'seconds');
        focusValidationTarget(1, () =>
          !minsValid ? minutesInputRef.current : secondsInputRef.current,
        );
        return;
      }
      actualDurationSec = mins * 60 + secs;
    }
    if (
      actualDurationSec !== undefined &&
      (context?.actualRestDurationSec ?? 0) > actualDurationSec
    ) {
      setError('전체 진행 시간은 타이머에 기록된 휴식 시간보다 짧을 수 없습니다.');
      setErrorField('minutes');
      focusValidationTarget(1, () => minutesInputRef.current);
      return;
    }
    const taughtSteps = snapshot.filter((step) => selectedSteps.has(step.stepId));
    if (!taughtSteps.some((step) => !isRestStep(step))) {
      setError('실제로 진행한 동작을 하나 이상 선택해 주세요.');
      setErrorField('steps');
      focusValidationTarget(
        2,
        () =>
          logStep2Ref.current?.querySelector<HTMLElement>(
            'input[type="checkbox"][data-step-kind="movement"]',
          ) ?? logStep2SummaryRef.current,
        true,
      );
      return;
    }
    const parsed = LogClassHistorySchema.safeParse({
      sequenceId,
      groupId,
      taughtAt: date.toISOString(),
      rating,
      intensity,
      instructorReflection: reflection.trim() || '별도 메모 없음',
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? '입력값을 확인해 주세요.');
      if (!groupId) {
        setErrorField('group');
        focusValidationTarget(1, () => groupSelectRef.current);
      }
      return;
    }
    const beforeState = usePilatesStore.getState();
    const isActiveSeq = sequenceId === beforeState.activeSequenceId;
    const resolvedApparatus = isActiveSeq
      ? beforeState.activeApparatus
      : (saved?.apparatus ?? beforeState.activeApparatus);
    const resolvedLevel = isActiveSeq
      ? beforeState.activeLevel
      : (saved?.level ?? beforeState.activeLevel);
    const resolvedCriteriaSnapshot = isActiveSeq
      ? (beforeState.draftCriteria ?? beforeState.lastCriteria ?? undefined)
      : saved?.criteriaSnapshot;
    const stepsForLog = taughtSteps.map((step, index) => ({
      ...structuredClone(step),
      order: index + 1,
    }));
    const programSnapshot = buildTeachingProgramSnapshot({
      sequenceId,
      sequenceTitle: title,
      sequenceSubtitle: sourceSubtitle,
      sourceKind,
      sourceSequenceVersion: saved?.version,
      sourceSequenceUpdatedAt: saved?.updatedAt,
      sourceProvenance: saved?.sourceProvenance,
      apparatus: resolvedApparatus,
      level: resolvedLevel,
      targetMinutes: resolvedCriteriaSnapshot?.targetMinutes ?? beforeState.activeTargetMinutes,
      taughtAt: date.toISOString(),
      groupId,
      steps: stepsForLog,
      exercises: exercisesAtOpen,
      reusableBlocks: reusableBlocksAtOpen,
      humanDrafts: humanDraftsAtOpen,
      actualDurationSec,
      actualRestDurationSec: context?.actualRestDurationSec,
      criteriaSnapshot: resolvedCriteriaSnapshot ?? undefined,
    });
    // This form captures a calendar date, not an observed start time.
    // Keep the existing ISO/fingerprint contract and annotate only this new snapshot.
    programSnapshot.dateOnly = true;
    programSnapshot.taughtDate = taughtDate;
    const payload = {
      ...parsed.data,
      actualDurationSec,
      actualRestDurationSec: context?.actualRestDurationSec,
      stepsSnapshot: stepsForLog,
      sequenceTitle: title,
      programSnapshot,
    };
    const duplicate = findDuplicateCompletedHistoryLog(beforeState.historyLogs, {
      sequenceId: payload.sequenceId,
      groupId: payload.groupId,
      taughtAt: payload.taughtAt,
      stepsSnapshot: payload.stepsSnapshot,
      actualDurationSec: payload.actualDurationSec,
      actualRestDurationSec: payload.actualRestDurationSec,
    });
    if (
      duplicate &&
      duplicate.rating === payload.rating &&
      duplicate.intensity === payload.intensity &&
      duplicate.instructorReflection === payload.instructorReflection
    ) {
      setError('이미 동일한 수업 완료 이력이 기록되어 있습니다. 중복 완료 기록을 방지했습니다.');
      return;
    }
    const previousLogIds = new Set(beforeState.historyLogs.map((log) => log.id));
    submittingRef.current = true;
    setSubmitted(true);
    try {
      logClassSession(payload);
    } catch {
      submittingRef.current = false;
      setSubmitted(false);
      setError('수업 기록을 저장하지 못했습니다. 입력 내용을 확인한 뒤 다시 시도해 주세요.');
      return;
    }
    const after = usePilatesStore.getState();
    const matchingLogs = after.historyLogs.filter(
      (log) =>
        !previousLogIds.has(log.id) &&
        log.sequenceId === payload.sequenceId &&
        log.groupId === payload.groupId &&
        log.taughtAt === payload.taughtAt &&
        log.sequenceTitle === payload.sequenceTitle &&
        log.rating === payload.rating &&
        log.intensity === payload.intensity &&
        log.instructorReflection === payload.instructorReflection &&
        log.actualDurationSec === payload.actualDurationSec &&
        log.actualRestDurationSec === payload.actualRestDurationSec &&
        JSON.stringify(log.stepsSnapshot) === JSON.stringify(payload.stepsSnapshot),
    );
    const idsAreUnique =
      new Set(after.historyLogs.map((log) => log.id)).size === after.historyLogs.length;
    if (matchingLogs.length !== 1 || !idsAreUnique) {
      submittingRef.current = false;
      setSubmitted(false);
      setError(
        after.generationError ??
          '수업 기록 저장을 확인하지 못했습니다. 기록을 확인하거나 다시 시도해 주세요.',
      );
      return;
    }
    const matchedLog = matchingLogs[0] as ClassHistoryLogWithSnapshot;
    if (
      !matchedLog.programSnapshot ||
      (!matchedLog.sequenceSnapshot && programSnapshot.sequenceSnapshot) ||
      (!matchedLog.sourceProvenance && programSnapshot.sourceProvenance)
    ) {
      attachProgramSnapshotToHistoryLog(matchedLog.id, programSnapshot, usePilatesStore.setState);
    }
    try {
      window.sessionStorage.removeItem(getDraftStorageKey(sequenceId));
    } catch {
      // Ignore sessionStorage errors in restricted environments.
    }
    setActiveTab('history');
    onClose();
  };

  return (
    <LightDismissDialog
      open
      onClose={onClose}
      onBeforeClose={({ reason, close }) => {
        if (hasEditedDraft && !submitted && (reason === 'backdrop' || reason === 'native-cancel')) {
          setPendingCloseRequest(() => close);
          return false;
      }
        return true;
      }}
      variant="sheet"
      title="수업 기록 남기기"
      subtitle={title}
      maxWidth="640px"
      className="class-log-modal"
    >
      <form className="teaching-log-form" onSubmit={submit}>
        <div className="class-log-content">
          <nav
            className="pf-step-guide-bar"
            aria-label="수업 기록 단계 안내"
            data-testid="log-session-step-guide"
          >
            <ol className="pf-step-guide-list">
              {(
                [
                  { step: 1 as const, label: '1 그룹·시간 확인' },
                  { step: 2 as const, label: '2 진행 동작 점검' },
                  { step: 3 as const, label: '3 강도·피드백 메모' },
                ] as const
              ).map((item) => (
                <li key={item.step}>
                  <button
                    type="button"
                    aria-current={logStep === item.step ? 'step' : undefined}
                    className={`pf-step-guide-chip ${logStep === item.step ? 'is-active' : ''}`}
                    onClick={() => navigateLogStep(item.step)}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ol>
            <div className="pf-step-guide-subrow">
              <span className="pf-step-guide-focus" role="status" aria-live="polite">
                {logStep === 1 && '지금 할 일: 수업 그룹과 일자, 실제 진행 시간을 확인하세요.'}
                {logStep === 2 && '지금 할 일: 계획 동작 중 실제로 진행한 동작을 점검하세요.'}
                {logStep === 3 && '지금 할 일: 수업 강도와 다음 수업 메모를 적고 기록을 완료하세요.'}
              </span>
              <div className="pf-step-guide-nav">
                <button
                  type="button"
                  className="pf-step-nav-btn"
                  disabled={logStep === 1}
                  onClick={() => navigateLogStep(logStep === 3 ? 2 : 1)}
                >
                  이전 단계
                </button>
                <button
                  type="button"
                  className="pf-step-nav-btn"
                  disabled={logStep === 3}
                  onClick={() => navigateLogStep(logStep === 1 ? 2 : 3)}
                >
                  다음 단계
                </button>
              </div>
            </div>
          </nav>
          <div
            className="pf-spot-dialog-3d-banner"
            data-testid="log-session-3d-banner"
            style={{ marginBottom: '10px' }}
          >
            <img
              src={logVisualMeta.studio3dThumbUrl}
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="pf-spot-dialog-3d-banner__img"
            />
            <div className="pf-spot-dialog-3d-banner__info">
              <strong>{title || '완료한 수업'}</strong>
              <div className="pf-class-badges-strip">
                <span className="pf-class-apparatus-pill">
                  {logVisualMeta.apparatusLabelKo} 3D
                </span>
                <PfBadge tone="sage">{logVisualMeta.levelBadgeKo}</PfBadge>
                <SpringVisualPills springs={logVisualMeta.springs} />
              </div>
            </div>
          </div>
          <div className="teaching-log-summary">
            <div className="class-log-summary-heading">
              <strong className="class-log-plan-badge">
                <Clock3 size={16} aria-hidden="true" />
                계획 {Number(planned.toFixed(2))}분 · {exerciseCount}개 동작
              </strong>
              <details className="class-log-provenance">
                <summary>완료 이력 보관 방식</summary>
                <div className="teaching-log-badge-row">
                  <span className="teaching-record-kind-badge is-history">
                    <ShieldCheck size={13} /> 진행 완료 이력 스냅샷
                  </span>
                  <span className="teaching-record-source-badge">
                    {sourceKind === 'saved-sequence'
                      ? '원본: 저장한 시퀀스 계획'
                      : '원본: 현재 수업 초안'}
                  </span>
                </div>
                <p className="muted">
                  당시 동작·블록·순서·시간이 스냅샷으로 보존되어 나중에 원본 동작이나 블록을
                  수정해도 이 완료 이력은 바뀌지 않습니다.
                </p>
              </details>
            </div>
            <p className="class-log-info muted">
              <Info size={16} aria-hidden="true" />
              <span>계획 시간과 실제 진행 시간은 별도로 보관됩니다.</span>
            </p>
            <div className="class-log-summary-status">
              {plannedTiming.restSec > 0 && (
                <p className="muted">
                  운동 {formatSecondsToMMSS(plannedTiming.exerciseSec)} · 휴식{' '}
                  {formatSecondsToMMSS(plannedTiming.restSec)} · 휴식은 전체 시간에 포함
                </p>
              )}
              {persistenceError && (
                <p className="teaching-storage-warning">브라우저 저장소 경고: {persistenceError}</p>
              )}
              {draftRestored && (
                <p className="muted" role="status" data-testid="log-session-draft-restored">
                  이전에 작성하던 수업 기록 초안을 복원했습니다.
                </p>
              )}
            </div>
          </div>
          <div
            ref={logStep1Ref}
            className={`teaching-form-grid teaching-form-two class-log-group-fields ${logStep === 1 ? 'is-step-focused' : ''}`}
            onFocusCapture={() => {
              setHasEditedDraft(true);
              setLogStep(1);
            }}
          >
            <div className="class-log-group-column">
              <PfField label="수업 그룹 *">
                <PfSelect
                  ref={groupSelectRef}
                  required
                  hasError={errorField === 'group'}
                  value={groupId}
                  onChange={(event) => {
                    setHasEditedDraft(true);
                    setGroupId(event.target.value);
                    clearFieldErrorIfMatching('group');
                  }}
                >
                  <option value="" disabled>
                    그룹을 선택해 주세요
                  </option>
                  {classGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </PfSelect>
              </PfField>
              <button
                type="button"
                className="teaching-log-link"
                aria-expanded={showGroup}
                onClick={() => {
                  const nextOpen = !showGroup;
                  setShowGroup(nextOpen);
                  if (!nextOpen) clearFieldErrorIfMatching('newGroup');
                }}
              >
                <Plus size={15} />
                수업 그룹 추가
              </button>
              {showGroup && (
                <div className="teaching-inline-group">
                  <PfField label="그룹 별칭 · 실명은 필요 없어요">
                    <PfInput
                      ref={newGroupInputRef as React.RefObject<HTMLInputElement>}
                      hasError={errorField === 'newGroup'}
                      maxLength={60}
                      placeholder="예: 저녁 A반, 개인 01"
                      value={newGroupName}
                      onChange={(event) => {
                        setNewGroupName(event.target.value);
                        if (event.target.value.trim()) clearFieldErrorIfMatching('newGroup');
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          createGroup();
                        }
                      }}
                    />
                  </PfField>
                  <PfButton variant="secondary" onClick={createGroup}>
                    추가
                  </PfButton>
                </div>
              )}
            </div>
            <PfField label="수업 일자 *">
              <PfInput
                ref={taughtDateInputRef}
                type="date"
                required
                hasError={errorField === 'taughtDate'}
                max={localDate()}
                value={taughtDate}
                onChange={(event) => {
                  setHasEditedDraft(true);
                  setTaughtDate(event.target.value);
                  clearFieldErrorIfMatching('taughtDate');
                }}
              />
            </PfField>
          </div>
          <fieldset
            className={`teaching-duration-field ${logStep === 1 ? 'is-step-focused' : ''}`}
            onFocusCapture={() => setLogStep(1)}
          >
            <legend>실제 진행 시간 (선택)</legend>
            <div>
              <PfField label="분">
                <PfInput
                  ref={minutesInputRef}
                  inputMode="numeric"
                  type="number"
                  min="0"
                  max="1440"
                  step="1"
                  hasError={errorField === 'minutes'}
                  placeholder="미기록"
                  value={minutes}
                  onChange={(event) => {
                    setHasEditedDraft(true);
                    setMinutes(event.target.value);
                    clearFieldErrorIfMatching('minutes', 'seconds');
                  }}
                />
              </PfField>
              <PfField label="초">
                <PfInput
                  ref={secondsInputRef}
                  inputMode="numeric"
                  type="number"
                  min="0"
                  max="59"
                  step="1"
                  hasError={errorField === 'seconds'}
                  placeholder="00"
                  value={seconds}
                  onChange={(event) => {
                    setHasEditedDraft(true);
                    setSeconds(event.target.value);
                    clearFieldErrorIfMatching('minutes', 'seconds');
                  }}
                />
              </PfField>
            </div>
            {durationDeltaSec !== null && currentActualSec !== null && (
              <div
                className={`log-planned-vs-actual-banner ${
                  durationDeltaSec === 0
                    ? 'is-exact'
                    : durationDeltaSec > 0
                      ? 'is-over'
                      : 'is-under'
                }`}
                role="status"
                aria-label="계획 대 실제 소요 시간 비교"
              >
                <span className="log-planned-vs-actual-metrics">
                  계획 <strong>{formatSecondsToMMSS(plannedTiming.totalSec)}</strong> · 실제{' '}
                  <strong>{formatSecondsToMMSS(currentActualSec)}</strong>
                </span>
                <span className="log-planned-vs-actual-delta" data-testid="log-duration-delta">
                  {durationDeltaSec === 0
                    ? '계획과 일치'
                    : `${durationDeltaSec > 0 ? '+' : '-'}${
                        Math.floor(Math.abs(durationDeltaSec) / 60) > 0
                          ? `${Math.floor(Math.abs(durationDeltaSec) / 60)}분 `
                          : ''
                      }${
                        Math.abs(durationDeltaSec) % 60 > 0 ||
                        Math.floor(Math.abs(durationDeltaSec) / 60) === 0
                          ? `${Math.abs(durationDeltaSec) % 60}초 `
                          : ''
                      }${durationDeltaSec > 0 ? '초과' : '단축'}`}
                </span>
              </div>
            )}
            <p className="muted">
              {context?.actualDurationSec === undefined
                ? '실제로 진행한 시간을 알고 있다면 입력해 주세요. 비워 두면 미기록으로 남습니다.'
                : '일시정지를 제외한 타이머 시간입니다. 실제 수업에 맞게 수정해 주세요.'}
            </p>
            {context?.actualRestDurationSec !== undefined && (
              <p className="muted">
                타이머에서 진행된 휴식 {formatSecondsToMMSS(context.actualRestDurationSec)} ·
                일시정지 제외
              </p>
            )}
          </fieldset>
          <details
            ref={logStep2Ref}
            className={`teaching-log-steps ${logStep === 2 ? 'is-step-focused' : ''} ${errorField === 'steps' ? 'has-step-error' : ''}`}
            open={stepsOpen}
            onFocusCapture={() => setLogStep(2)}
          >
            <summary
              ref={logStep2SummaryRef}
              onClick={(event) => {
                event.preventDefault();
                setStepsOpen((prev) => !prev);
              }}
            >
              <span>
                실제로 진행한 동작 확인 · {selectedExerciseCount} / {exerciseCount}개
              </span>
              <ChevronDown size={18} aria-hidden="true" />
            </summary>
            <p className="muted">
              {context?.taughtStepIds !== undefined
                ? '진행한 동작만 선택해 주세요. 타이머를 사용한 동작을 먼저 선택해 두었습니다.'
                : '계획에 있는 동작이 선택되어 있어요. 실제로 진행한 동작만 남겨 주세요.'}
            </p>
            {snapshot.length > 0 && (
              <div
                className="teaching-log-steps-toolbar"
                role="group"
                aria-label="진행 동작 빠른 선택"
              >
                <span className="teaching-log-steps-status">
                  {selectedExerciseCount === 0
                    ? '선택된 운동 0개 · 진행한 동작을 직접 선택해 주세요.'
                    : `운동 ${selectedExerciseCount}개 선택됨`}
                </span>
                <div className="teaching-log-steps-toolbar-actions">
                  <button
                    type="button"
                    className="btn-secondary teaching-log-steps-quick-btn"
                    disabled={allStepsSelected}
                    onClick={handleSelectAllPlannedSteps}
                  >
                    계획 항목 전체 선택
                  </button>
                  <button
                    type="button"
                    className="btn-secondary teaching-log-steps-quick-btn"
                    disabled={selectedSteps.size === 0}
                    onClick={handleClearAllSelectedSteps}
                  >
                    전체 해제
                  </button>
                </div>
              </div>
            )}
            <div className="teaching-log-steps-list">
              {snapshot.map((step) => {
                const rest = isRestStep(step);
                return (
                  <label key={step.stepId}>
                    <input
                      type="checkbox"
                      data-step-kind={rest ? 'rest' : 'movement'}
                      checked={selectedSteps.has(step.stepId)}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setHasEditedDraft(true);
                        setSelectedSteps((value) => {
                          const next = new Set(value);
                          if (checked) next.add(step.stepId);
                          else next.delete(step.stepId);
                          return next;
                        });
                        if (checked && !rest) {
                          clearFieldErrorIfMatching('steps');
                        }
                      }}
                    />
                    <span>
                      {rest
                        ? `휴식 ${formatSecondsToMMSS(step.durationMin * 60)}`
                        : step.blockInstanceId
                          ? (step.exerciseSnapshot?.nameKo ??
                            exercisesAtOpen.find((exercise) => exercise.id === step.exerciseId)
                              ?.nameKo ??
                            exercises.find((exercise) => exercise.id === step.exerciseId)?.nameKo ??
                            '삭제된 동작')
                          : (exercisesAtOpen.find((exercise) => exercise.id === step.exerciseId)
                              ?.nameKo ??
                            step.exerciseSnapshot?.nameKo ??
                            exercises.find((exercise) => exercise.id === step.exerciseId)?.nameKo ??
                            '삭제된 동작')}
                    </span>
                  </label>
                );
              })}
            </div>
          </details>
          <div
            ref={logStep3Ref}
            className={`teaching-form-grid teaching-form-two ${logStep === 3 ? 'is-step-focused' : ''}`}
            onFocusCapture={() => setLogStep(3)}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <PfField label="강사가 느낀 강도">
                <PfSelect
                  value={intensity}
                  onChange={(event) => {
                    setHasEditedDraft(true);
                    setIntensity(event.target.value as typeof intensity);
                  }}
                >
                  <option value="relaxed">가볍게</option>
                  <option value="moderate">보통</option>
                  <option value="intense">높게</option>
                </PfSelect>
              </PfField>
              <div
                className="log-quick-note-chips"
                data-testid="log-quick-intensity-chips"
                role="group"
                aria-label="원탭 강도 체감 선택"
              >
                {(
                  [
                    { value: 'relaxed' as const, label: '여유로움' },
                    { value: 'moderate' as const, label: '적정 집중' },
                    { value: 'intense' as const, label: '고강도 챌린지' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`log-quick-note-chip ${intensity === item.value ? 'is-selected' : ''}`.trim()}
                    aria-pressed={intensity === item.value}
                    onClick={() => {
                      setHasEditedDraft(true);
                      setLogStep(3);
                      setIntensity(item.value);
                    }}
                  >
                    {intensity === item.value ? `✓ ${item.label}` : item.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <PfField label="강사의 수업 평가">
                <PfSelect
                  value={rating}
                  onChange={(event) => {
                    setHasEditedDraft(true);
                    setRating(Number(event.target.value) as typeof rating);
                  }}
                >
                  {([1, 2, 3, 4, 5] as const).map((value) => (
                    <option key={value} value={value}>
                      {value} / 5
                    </option>
                  ))}
                </PfSelect>
              </PfField>
              <div
                className="log-quick-note-chips"
                data-testid="log-quick-rating-chips"
                role="group"
                aria-label="원탭 수업 만족도 선택"
              >
                {([1, 2, 3, 4, 5] as const).map((val) => (
                  <button
                    key={val}
                    type="button"
                    className={`log-quick-note-chip ${rating === val ? 'is-selected' : ''}`.trim()}
                    aria-pressed={rating === val}
                    aria-label={`수업 만족도 ${val}점`}
                    onClick={() => {
                      setHasEditedDraft(true);
                      setLogStep(3);
                      setRating(val);
                    }}
                  >
                    {val}점
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/* Rendered as a div so the quick-note chip buttons are not implicitly labelled by
              (or activated through) the wrapping <label>; the label targets the textarea. */}
          <PfField
            label="다음 수업을 위한 메모 (선택)"
            as="div"
            htmlFor={reflectionInputId}
            className="class-log-reflection"
          >
            <small id={reflectionHintId} className="class-log-privacy-hint muted">
              <Info size={14} aria-hidden="true" />
              <span>학생 실명이나 건강 정보는 적지 않아도 돼요.</span>
            </small>
            <div
              className="log-quick-note-chips"
              data-testid="log-quick-note-chips"
              role="group"
              aria-label="빠른 수업 메모 선택"
            >
              {(
                [
                  '호흡·속도 안정적',
                  '스프링 한 단계 낮춤',
                  '코어 연결 큐 반응 좋음',
                  '다음 시간 이어서 복습',
                ] as const
              ).map((phrase) => {
                const included = reflection.includes(phrase);
                return (
                  <button
                    key={phrase}
                    type="button"
                    className={`log-quick-note-chip ${included ? 'is-selected' : ''}`.trim()}
                    aria-pressed={included}
                    onClick={() => {
                      setHasEditedDraft(true);
                      setReflection((prev) => {
                        if (prev.includes(phrase)) {
                          return prev
                            .split('\n')
                            .map((line) => line.replace(phrase, '').trim())
                            .filter(Boolean)
                            .join('\n');
                        }
                        return prev.trim() ? `${prev.trim()}\n${phrase}` : phrase;
                      });
                    }}
                  >
                    {included ? '✓ ' : '+ '}
                    {phrase}
                  </button>
                );
              })}
            </div>
            <PfTextarea
              id={reflectionInputId}
              aria-label="다음 수업을 위한 메모 (선택)"
              aria-describedby={reflectionHintId}
              rows={3}
              maxLength={3000}
              placeholder="잘 이어진 전환, 다음에 바꿔볼 동작 등을 남겨 주세요."
              value={reflection}
              onChange={(event) => {
                setHasEditedDraft(true);
                setReflection(event.target.value);
              }}
            />
          </PfField>
        </div>
        <footer className="class-log-footer">
          {pendingCloseRequest && (
            <div
              role="alert"
              className="class-log-discard-guard"
              data-testid="log-session-discard-guard"
            >
              <span>작성 중인 수업 기록 초안은 임시 보관됩니다. 기록 창을 닫을까요?</span>
              <div className="class-log-discard-guard-actions">
                <PfButton variant="secondary" onClick={() => setPendingCloseRequest(null)}>
                  계속 작성
                </PfButton>
                <PfButton
                  variant="primary"
                  onClick={() => {
                    const proceed = pendingCloseRequest;
                    setPendingCloseRequest(null);
                    proceed();
                  }}
                >
                  닫기 확인
                </PfButton>
              </div>
            </div>
          )}
          {!pendingCloseRequest && error && <PfFormError>{error}</PfFormError>}
          <div className="teaching-form-actions">
            <PfButton variant="secondary" onClick={onClose}>
              취소
            </PfButton>
            <PfButton
              type="submit"
              variant="primary"
              disabled={submitted || classGroups.length === 0}
            >
              <Check size={17} />
              수업 기록 저장
            </PfButton>
          </div>
          <p className="teaching-log-footnote muted">
            이 브라우저에 저장됩니다. 기록이 실제 수업과 맞는지 확인해 주세요.
          </p>
        </footer>
      </form>
    </LightDismissDialog>
  );
};
