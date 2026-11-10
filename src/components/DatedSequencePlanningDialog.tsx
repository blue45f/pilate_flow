import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { APPARATUS_LABELS } from '../data/pilatesCatalog';
import { isScheduleDate } from '../schemas/instructorScheduleSchema';
import { DATED_PLAN_PRIOR_VERSION_LIMIT } from '../schemas/datedSequencePlanningSchema';
import type {
  DatedPlanOccurrenceSnapshot,
  DatedSequencePlanningData,
  DatedSequencePlanState,
} from '../types/datedSequencePlanning';
import type {
  InstructorScheduleData,
  InstructorScheduleOccurrence,
} from '../types/instructorSchedule';
import type { PilatesExercise, SavedSequence, SequenceStep } from '../types/pilates';
import {
  getDatedPlanKey,
  getDatedPlanWarnings,
  getDatedPlanSourceFingerprint,
  resolveDatedPlanOccurrence,
} from '../utils/datedSequencePlanning';
import type {
  DatedWeekCopyProposal,
  DatedWeekCopySkip,
  previewDatedPlanWeekCopy,
} from '../utils/datedSequencePlanning';
import {
  addScheduleDays,
  expandInstructorSchedule,
  formatScheduleDate,
  formatScheduleTime,
  getSchedulePlanWarnings,
  localScheduleDate,
  scheduleWeekStart,
  SCHEDULE_WEEKDAYS,
} from '../utils/instructorSchedule';
import {
  formatSecondsToMMSS,
  getStepSideLabels,
  getStepTiming,
  isRestStep,
} from '../utils/sequenceEngine';
import { LightDismissDialog } from './LightDismissDialog';
import '../styles/dated-sequence-planning.css';
import '../styles/schedule-planning-calendar.css';
import {
  describePlanningCalendarDay,
  emptyPlanningCalendarDay,
  planningCalendarKeyDate,
  planningCalendarMonth,
  shiftPlanningCalendarMonth,
  summarizePlanningCalendar,
} from '../utils/schedulePlanningCalendar';

type ActionResult = { success: boolean; message: string };
type WeekCopyActionResult = ActionResult & {
  readonly added?: number;
  readonly skipped?: readonly DatedWeekCopySkip[];
  readonly conflicts?: number;
};
type OccurrenceIdentity = Pick<InstructorScheduleOccurrence, 'classId' | 'originalDate'>;
type CopyPreview = ReturnType<typeof previewDatedPlanWeekCopy>;
type ViewMode = 'day' | 'week' | 'month';
type OccurrenceFilter = 'all' | 'unassigned';
type CopyOutcomeStatus = 'pending-props' | 'all-copied' | 'partial-copied' | 'zero-copied';

interface VerifiedCopiedItem {
  key: string;
  classId: string;
  originalDate: string;
  date: string;
  startTime: string;
  locationId: string;
  sequenceTitle: string;
  createdAt: string;
}

interface UnconfirmedCopyProposal {
  key: string;
  classId: string;
  originalDate: string;
  date: string;
  startTime: string;
  locationId: string;
  sequenceTitle: string;
}

interface EffectiveCopySummary {
  status: CopyOutcomeStatus;
  copied: VerifiedCopiedItem[];
  skipped: DatedWeekCopySkip[];
  unconfirmed: UnconfirmedCopyProposal[];
}

interface LastWeekCopyOutcome {
  source: string;
  target: string;
  targetEnd: string;
  message: string;
  committedProposals: readonly DatedWeekCopyProposal[];
  skipped: readonly DatedWeekCopySkip[];
  reportedAdded: number | null;
  reportedSkipped?: readonly DatedWeekCopySkip[];
  preCopyAssignments: NonNullable<DatedSequencePlanningData['assignments']>;
  preCopyIds: ReadonlySet<string>;
  preCopyKeys: ReadonlySet<string>;
}

function parseReportedWeekCopyCount(message: string): number | null {
  const match = /^(\d+)개\s*다음 주 계획/.exec(message.trim());
  return match ? Number(match[1]) : null;
}

interface LastReplaceOutcome {
  classId: string;
  originalDate: string;
  previousTitle: string;
  requestedTitle: string;
  wasContextRebound: boolean;
}

export interface DatedSequencePlanningDialogProps {
  readonly onClose: () => void;
  readonly initialDate: string;
  readonly initialMode?: ViewMode;
  readonly onOpenScheduleDate?: (date: string) => void;
  readonly initialOccurrence?: OccurrenceIdentity;
  readonly schedule: InstructorScheduleData;
  readonly savedSequences: readonly SavedSequence[];
  readonly exercises: readonly PilatesExercise[];
  readonly planning?: DatedSequencePlanningData;
  readonly onAssign: (input: {
    sequenceId: string;
    classId: string;
    originalDate: string;
    state?: DatedSequencePlanState;
  }) => ActionResult;
  readonly onSetState: (
    assignmentId: string,
    state: DatedSequencePlanState,
    expectedUpdatedAt?: string,
  ) => ActionResult;
  readonly onPreviewWeekCopy: (sourceStartDate: string, targetStartDate: string) => CopyPreview;
  readonly onCopyWeek: (sourceStartDate: string, targetStartDate: string) => WeekCopyActionResult;
  readonly onLoadDraft: (assignmentId: string, expectedUpdatedAt?: string) => ActionResult;
  readonly onLoadSuccess?: () => void;
  readonly onReplaceSnapshot: (input: {
    assignmentId: string;
    sequenceId: string;
    expectedUpdatedAt: string;
    expectedOccurrenceSnapshot: DatedPlanOccurrenceSnapshot;
    expectedSourceFingerprint: string;
  }) => ActionResult;
}

const EMPTY_ASSIGNMENTS: NonNullable<DatedSequencePlanningData['assignments']> = [];
const STATUS_LABELS = {
  scheduled: '예정',
  cancelled: '취소',
  closed: '휴무',
  moved: '이동',
};
const SKIP_LABELS = {
  'source-inactive': '원본 회차가 취소·휴무이거나 없음',
  'target-missing': '다음 주에 해당 회차 없음',
  'target-inactive': '대상 회차가 취소·휴무',
  'target-outside-week': '변경된 회차가 대상 7일 밖에 있음',
  'already-assigned': '기존 계획 있음 · 그대로 유지',
};

function getScrollBehavior(): ScrollBehavior {
  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return 'auto';
  }
  return 'smooth';
}

function describePlanSteps(steps: readonly SequenceStep[], exercises: readonly PilatesExercise[]) {
  return steps.map((step) => {
    const exercise = exercises.find((item) => item.id === step.exerciseId);
    const rest = isRestStep(step);
    return {
      step,
      rest,
      timing: getStepTiming(step, exercise),
      name: rest ? '휴식' : (exercise?.nameKo ?? '동작 정보 없음'),
      sides: rest
        ? []
        : !exercise && !step.sideMode
          ? ['좌우 정보 없음']
          : getStepSideLabels(step, exercise),
    };
  });
}

const STEP_LAYER_LABELS = {
  easy: '쉬운 변형',
  standard: '기본 변형',
  hard: '어려운 변형',
};

function apparatusLabel(apparatus: SavedSequence['apparatus']) {
  return apparatus === 'mixed' ? '혼합 기구' : APPARATUS_LABELS[apparatus].ko;
}

function ReadonlyPlanSnapshot({
  snapshot,
  exercises,
}: {
  snapshot: NonNullable<DatedSequencePlanningData['assignments'][number]>['sequenceSnapshot'];
  exercises: readonly PilatesExercise[];
}) {
  const rows = describePlanSteps(snapshot.steps, exercises);
  return (
    <div className="dated-planning-readonly-snapshot">
      <p>
        <strong>{snapshot.title}</strong>
        {snapshot.subtitle ? ` · ${snapshot.subtitle}` : ''}
      </p>
      <p>
        저장 목표 {snapshot.targetMinutes}분 · 난이도 {snapshot.level} ·{' '}
        {apparatusLabel(snapshot.apparatus)} · 중점 {snapshot.focusTags.join(' · ') || '미지정'}
      </p>
      <ol className="dated-planning-steps">
        {rows.map(({ step, name, rest, sides, timing }, index) => (
          <li key={`${step.stepId}-${index}`}>
            <strong>{name}</strong> · {formatSecondsToMMSS(timing.totalSec)}
            {!rest && (
              <span>
                {STEP_LAYER_LABELS[step.selectedLayer]} · {sides.join(' → ')} ·{' '}
                {step.repetitions === undefined ? '횟수 미지정' : `${step.repetitions}회`}
                {step.sets === undefined ? '' : ` × ${step.sets}세트`} · 설명{' '}
                {timing.explanationSec}초 · 전환 {timing.transitionSec}초
                {step.customSpringOverride ? ` · 스프링 메모 ${step.customSpringOverride}` : ''}
                {step.locked ? ' · 단계 고정' : ''}
              </span>
            )}
            {step.instructorNote && <p>{step.instructorNote}</p>}
          </li>
        ))}
      </ol>
      {snapshot.criteriaSnapshot && (
        <details>
          <summary>저장 당시의 계획 조건 보기</summary>
          <dl className="dated-planning-condition-record">
            {Object.entries(snapshot.criteriaSnapshot)
              .filter(([, value]) => value !== undefined)
              .map(([key, value]) => {
                const labels: Record<string, string> = {
                  apparatus: '기구 분류',
                  ownedApparatus: '보유 기구 분류',
                  availableEquipment: '사용 가능 기구',
                  planningGoals: '계획 목표 태그',
                  instructorObservations: '강사가 저장한 관찰 태그',
                  level: '선택 난이도',
                  focusPreset: '중점 기준',
                  preferredProps: '선택 소도구',
                  excludeDaysWindow: '최근 수업 제외 일수',
                  targetGroupId: '저장된 그룹 연결',
                  targetMinutes: '목표 시간(분)',
                  restMinutes: '휴식 시간(분)',
                  defaultLayer: '기본 변형',
                };
                return (
                  <div key={key}>
                    <dt>{labels[key] ?? key}</dt>
                    <dd>{Array.isArray(value) ? value.join(' · ') || '없음' : String(value)}</dd>
                  </div>
                );
              })}
          </dl>
        </details>
      )}
    </div>
  );
}

function stepSignature(step?: Readonly<SequenceStep>) {
  if (!step) return '';
  return JSON.stringify([
    step.kind,
    step.exerciseId,
    step.durationMin,
    step.selectedLayer,
    step.customSpringOverride,
    step.explanationSec,
    step.transitionSec,
    step.repetitions,
    step.sets,
    step.sideMode,
    step.instructorNote,
    step.locked,
  ]);
}

export const DATED_PLANNING_DRAFT_STORAGE_KEY = 'pf_dated_planning_draft_v1';

interface DatedPlanningDraftEntry {
  classId: string;
  originalDate: string;
  sequenceId: string;
  revisionSequenceId: string;
}

type DatedPlanningDraftMap = Record<string, DatedPlanningDraftEntry>;

function readDatedPlanningDraftMap(): DatedPlanningDraftMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(DATED_PLANNING_DRAFT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as DatedPlanningDraftMap;
  } catch {
    return {};
  }
}

function readDatedPlanningDraft(
  target: OccurrenceIdentity | null,
  savedSequences: readonly SavedSequence[],
): { sequenceId: string; revisionSequenceId: string } | null {
  if (!target) return null;
  const map = readDatedPlanningDraftMap();
  const planKey = getDatedPlanKey(target.classId, target.originalDate);
  const colonKey = `${target.classId}:${target.originalDate}`;
  const plusKey = `${target.classId}+${target.originalDate}`;
  const direct =
    map[planKey] ??
    map[colonKey] ??
    map[plusKey] ??
    Object.values(map).find(
      (item) =>
        item &&
        typeof item === 'object' &&
        item.classId === target.classId &&
        item.originalDate === target.originalDate,
    );
  if (!direct || typeof direct !== 'object') return null;
  const validSequenceId =
    typeof direct.sequenceId === 'string' &&
    savedSequences.some((item) => item.id === direct.sequenceId)
      ? direct.sequenceId
      : '';
  const validRevisionSequenceId =
    typeof direct.revisionSequenceId === 'string' &&
    savedSequences.some((item) => item.id === direct.revisionSequenceId)
      ? direct.revisionSequenceId
      : '';
  if (!validSequenceId && !validRevisionSequenceId) return null;
  return {
    sequenceId: validSequenceId,
    revisionSequenceId: validRevisionSequenceId,
  };
}

function writeDatedPlanningDraft(
  target: OccurrenceIdentity,
  draft: { sequenceId: string; revisionSequenceId: string },
) {
  if (typeof window === 'undefined') return;
  try {
    const map = readDatedPlanningDraftMap();
    const planKey = getDatedPlanKey(target.classId, target.originalDate);
    const colonKey = `${target.classId}:${target.originalDate}`;
    const plusKey = `${target.classId}+${target.originalDate}`;
    if (!draft.sequenceId && !draft.revisionSequenceId) {
      delete map[planKey];
      delete map[colonKey];
      delete map[plusKey];
    } else {
      map[planKey] = {
        classId: target.classId,
        originalDate: target.originalDate,
        sequenceId: draft.sequenceId,
        revisionSequenceId: draft.revisionSequenceId,
      };
    }
    if (Object.keys(map).length === 0) {
      window.sessionStorage.removeItem(DATED_PLANNING_DRAFT_STORAGE_KEY);
    } else {
      window.sessionStorage.setItem(DATED_PLANNING_DRAFT_STORAGE_KEY, JSON.stringify(map));
    }
  } catch {
    // Ignore sessionStorage errors in restricted environments.
  }
}

function clearDatedPlanningDraft(target: OccurrenceIdentity | null) {
  if (!target || typeof window === 'undefined') return;
  try {
    const map = readDatedPlanningDraftMap();
    const planKey = getDatedPlanKey(target.classId, target.originalDate);
    const colonKey = `${target.classId}:${target.originalDate}`;
    const plusKey = `${target.classId}+${target.originalDate}`;
    delete map[planKey];
    delete map[colonKey];
    delete map[plusKey];
    for (const [key, value] of Object.entries(map)) {
      if (
        value &&
        typeof value === 'object' &&
        value.classId === target.classId &&
        value.originalDate === target.originalDate
      ) {
        delete map[key];
      }
    }
    if (Object.keys(map).length === 0) {
      window.sessionStorage.removeItem(DATED_PLANNING_DRAFT_STORAGE_KEY);
    } else {
      window.sessionStorage.setItem(DATED_PLANNING_DRAFT_STORAGE_KEY, JSON.stringify(map));
    }
  } catch {
    // Ignore sessionStorage errors in restricted environments.
  }
}

/** One bounded local planner. All writes are explicit callbacks owned by the schedule view. */
export function DatedSequencePlanningDialog(props: DatedSequencePlanningDialogProps) {
  const {
    onClose,
    schedule,
    savedSequences,
    exercises,
    planning,
    onAssign,
    onSetState,
    onPreviewWeekCopy,
    onCopyWeek,
    onLoadDraft,
  } = props;
  const assignments = planning?.assignments ?? EMPTY_ASSIGNMENTS;
  const initialRestoredDraft = useMemo(() => {
    const target = props.initialOccurrence ?? null;
    if (!target) return null;
    const restored = readDatedPlanningDraft(target, savedSequences);
    if (!restored) return null;
    const hasExistingAssignment = assignments.some(
      (item) =>
        item.classId === target.classId && item.originalDate === target.originalDate,
    );
    const nextSequenceId = !hasExistingAssignment ? restored.sequenceId : '';
    const nextRevisionSequenceId = hasExistingAssignment ? restored.revisionSequenceId : '';
    if (!nextSequenceId && !nextRevisionSequenceId) return null;
    return {
      sequenceId: nextSequenceId,
      revisionSequenceId: nextRevisionSequenceId,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [selectedDate, setSelectedDate] = useState(
    isScheduleDate(props.initialDate) ? props.initialDate : localScheduleDate(),
  );
  const [mode, setMode] = useState<ViewMode>(props.initialMode ?? 'week');
  const [occurrenceFilter, setOccurrenceFilter] = useState<OccurrenceFilter>('all');
  const [identity, setIdentity] = useState<OccurrenceIdentity | null>(
    props.initialOccurrence ?? null,
  );
  const [sequenceId, setSequenceId] = useState(() => initialRestoredDraft?.sequenceId ?? '');
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  const [loadConfirmed, setLoadConfirmed] = useState(false);
  const [revisionSequenceId, setRevisionSequenceId] = useState(
    () => initialRestoredDraft?.revisionSequenceId ?? '',
  );
  const [draftRestored, setDraftRestored] = useState(() => Boolean(initialRestoredDraft));
  const [planningStep, setPlanningStep] = useState<1 | 2 | 3>(() =>
    props.initialOccurrence ? 3 : 1,
  );
  const [lastCopyOutcome, setLastCopyOutcome] = useState<LastWeekCopyOutcome | null>(null);
  const [lastReplaceOutcome, setLastReplaceOutcome] = useState<LastReplaceOutcome | null>(null);
  const hasUserChangedDraftRef = useRef(false);
  const pendingDetailFocusRef = useRef(false);
  const inFlightActionRef = useRef(false);
  const lastCommittedKeyRef = useRef<string | null>(null);
  const occurrenceTriggerRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const assignSelectRef = useRef<HTMLSelectElement | null>(null);
  const editDraftBtnRef = useRef<HTMLButtonElement | null>(null);
  const revisionDiffBtnRef = useRef<HTMLButtonElement | null>(null);
  const previewCopyBtnRef = useRef<HTMLButtonElement | null>(null);
  const [revisionPreview, setRevisionPreview] = useState<{
    assignmentId: string;
    sequenceId: string;
    expectedUpdatedAt: string;
    expectedOccurrenceSnapshot: DatedPlanOccurrenceSnapshot;
    expectedSourceFingerprint: string;
    context: string;
    snapshot: SavedSequence;
    warnings: string[];
  } | null>(null);
  const [priorVersionIndex, setPriorVersionIndex] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const calendarScrollRef = useRef<HTMLDivElement>(null);
  const occurrencesRef = useRef<HTMLElement>(null);
  const detailRef = useRef<HTMLElement>(null);
  const copyRef = useRef<HTMLDetailsElement>(null);
  const calendarFocusTarget = useRef<string | null>(null);
  const calendarHelpId = useId();

  useEffect(() => {
    const date = calendarFocusTarget.current;
    if (mode !== 'month' || !date) return;
    const button = contentRef.current?.querySelector<HTMLButtonElement>(
      `[data-planning-date="${date}"]`,
    );
    if (button) {
      calendarFocusTarget.current = null;
      button.focus();
      button.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    }
  }, [selectedDate, mode]);

  useEffect(() => {
    if (!identity || !hasUserChangedDraftRef.current) return;
    writeDatedPlanningDraft(identity, {
      sequenceId,
      revisionSequenceId,
    });
  }, [identity, sequenceId, revisionSequenceId]);

  useEffect(() => {
    if (!pendingDetailFocusRef.current || !identity || !detailRef.current) return;
    pendingDetailFocusRef.current = false;
    const target = detailRef.current.querySelector<HTMLElement>(
      'select:not(:disabled), button.dated-planning-primary-btn:not(:disabled), button:not(.dated-planning-close-detail):not(:disabled), summary',
    );
    (target ?? detailRef.current).focus({ preventScroll: true });
  }, [identity]);

  const closing = useRef(false);
  const [copyPreview, setCopyPreview] = useState<{
    result: CopyPreview;
    context: string;
    source: string;
    target: string;
  } | null>(null);

  const month = planningCalendarMonth(selectedDate);
  const start =
    mode === 'month'
      ? month.start
      : mode === 'week'
        ? scheduleWeekStart(selectedDate)
        : selectedDate;
  const rawEnd = mode === 'month' ? month.end : mode === 'week' ? addScheduleDays(start, 6) : start;
  const end = rawEnd > '2199-12-31' ? '2199-12-31' : rawEnd;
  const rows = useMemo(
    () => expandInstructorSchedule(schedule, start, end),
    [schedule, start, end],
  );
  const byKey = useMemo(
    () =>
      new Map(assignments.map((item) => [getDatedPlanKey(item.classId, item.originalDate), item])),
    [assignments],
  );
  const calendarDays = useMemo<ReturnType<typeof summarizePlanningCalendar>>(
    () =>
      mode === 'month'
        ? summarizePlanningCalendar({
            monthDate: month.start,
            rows,
            schedule,
            planning,
            sequences: savedSequences,
            exercises,
          })
        : new Map(),
    [mode, month.start, rows, schedule, planning, savedSequences, exercises],
  );
  const context = useMemo(() => JSON.stringify([schedule, planning]), [schedule, planning]);
  const currentKey = identity ? getDatedPlanKey(identity.classId, identity.originalDate) : null;
  const assignment = currentKey ? byKey.get(currentKey) : undefined;
  const selectedSequence = useMemo(
    () => savedSequences.find((item) => item.id === sequenceId),
    [savedSequences, sequenceId],
  );
  const revisionCandidate = savedSequences.find((item) => item.id === revisionSequenceId);
  const revisionContext = useMemo(
    () => JSON.stringify([assignment, revisionCandidate, schedule, exercises]),
    [assignment, revisionCandidate, schedule, exercises],
  );
  const revisionStale =
    !!revisionPreview &&
    (revisionPreview.context !== revisionContext ||
      revisionPreview.assignmentId !== assignment?.id ||
      revisionPreview.sequenceId !== revisionSequenceId);
  const priorVersions = assignment?.priorVersions ?? [];
  const resolved = identity
    ? resolveDatedPlanOccurrence(schedule, identity.classId, identity.originalDate)
    : null;
  const occurrence = resolved?.occurrence;
  const selectedSequenceWarnings = useMemo(() => {
    if (!selectedSequence || !occurrence || resolved?.status !== 'scheduled') return [];
    return getSchedulePlanWarnings(
      {
        ...occurrence,
        linkSavedSequenceId: selectedSequence.id,
      },
      schedule,
      [selectedSequence],
      exercises,
    );
  }, [selectedSequence, occurrence, resolved?.status, schedule, exercises]);
  const contextMatches =
    !!assignment &&
    !!occurrence &&
    assignment.occurrenceSnapshot.date === occurrence.date &&
    assignment.occurrenceSnapshot.startTime === occurrence.startTime &&
    assignment.occurrenceSnapshot.endTime === occurrence.endTime &&
    assignment.occurrenceSnapshot.locationId === occurrence.locationId;
  const canUseAssignment = resolved?.status === 'scheduled' && contextMatches;
  const canReviseAssignment =
    resolved?.status === 'scheduled' &&
    !!occurrence &&
    priorVersions.length < DATED_PLAN_PRIOR_VERSION_LIMIT;
  const warnings = useMemo(
    () => (assignment ? getDatedPlanWarnings({ assignment, schedule, exercises }) : []),
    [assignment, schedule, exercises],
  );
  const unresolved = useMemo(
    () =>
      assignments.filter(
        (item) =>
          resolveDatedPlanOccurrence(schedule, item.classId, item.originalDate).status ===
          'missing',
      ),
    [assignments, schedule],
  );
  const sourceStart = scheduleWeekStart(selectedDate);
  const sourceEndRaw = addScheduleDays(sourceStart, 6);
  const sourceEnd = sourceEndRaw > '2199-12-31' ? '2199-12-31' : sourceEndRaw;
  const targetStart = addScheduleDays(sourceStart, 7);
  const targetEnd = addScheduleDays(targetStart, 6);
  const copyRangeValid =
    isScheduleDate(sourceStart) && isScheduleDate(targetStart) && isScheduleDate(targetEnd);
  const previewStale =
    !!copyPreview &&
    (copyPreview.context !== context ||
      copyPreview.source !== sourceStart ||
      copyPreview.target !== targetStart);

  const sourceWeekRows = useMemo(
    () =>
      mode === 'week'
        ? rows
        : isScheduleDate(sourceStart) && isScheduleDate(sourceEnd)
          ? expandInstructorSchedule(schedule, sourceStart, sourceEnd)
          : [],
    [mode, rows, schedule, sourceStart, sourceEnd],
  );
  const sourceWeekScheduledCount = useMemo(
    () => sourceWeekRows.filter((row) => row.status === 'scheduled').length,
    [sourceWeekRows],
  );
  const sourceWeekPlannedCount = useMemo(
    () =>
      sourceWeekRows.filter(
        (row) =>
          row.status === 'scheduled' &&
          byKey.has(getDatedPlanKey(row.classId, row.originalDate)),
      ).length,
    [sourceWeekRows, byKey],
  );
  const targetWeekExistingCount = useMemo(() => {
    if (!copyRangeValid) return 0;
    const targetRows = expandInstructorSchedule(schedule, targetStart, targetEnd);
    return targetRows.filter((row) =>
      byKey.has(getDatedPlanKey(row.classId, row.originalDate)),
    ).length;
  }, [copyRangeValid, schedule, targetStart, targetEnd, byKey]);

  const shownRows = mode === 'month' ? rows.filter((row) => row.date === selectedDate) : rows;
  const unassignedScheduledCount = useMemo(
    () =>
      shownRows.filter(
        (row) =>
          row.status === 'scheduled' &&
          !byKey.has(getDatedPlanKey(row.classId, row.originalDate)),
      ).length,
    [shownRows, byKey],
  );
  const showOccurrenceFilter =
    shownRows.length > 1 &&
    (occurrenceFilter === 'unassigned' ||
      (unassignedScheduledCount > 0 && unassignedScheduledCount < shownRows.length));
  const visibleRows = useMemo(
    () =>
      occurrenceFilter === 'unassigned'
        ? shownRows.filter(
            (row) =>
              row.status === 'scheduled' &&
              !byKey.has(getDatedPlanKey(row.classId, row.originalDate)),
          )
        : shownRows,
    [shownRows, occurrenceFilter, byKey],
  );

  const stepDetails = useMemo(
    () =>
      assignment?.sequenceSnapshot.steps.map((step) => {
        const exercise = exercises.find((item) => item.id === step.exerciseId);
        const rest = isRestStep(step);
        return {
          step,
          rest,
          timing: getStepTiming(step, exercise),
          name: exercise?.nameKo ?? '동작 정보 없음',
          sides: rest
            ? []
            : !exercise && !step.sideMode
              ? ['좌우 정보 없음']
              : getStepSideLabels(step, exercise),
        };
      }) ?? [],
    [assignment, exercises],
  );
  const snapshotTotal = stepDetails.reduce((sum, row) => sum + row.timing.totalSec, 0);
  const snapshotRest = stepDetails.reduce(
    (sum, row) => sum + (row.rest ? row.timing.totalSec : 0),
    0,
  );
  const revisedSteps = useMemo(
    () => (revisionPreview ? describePlanSteps(revisionPreview.snapshot.steps, exercises) : []),
    [revisionPreview, exercises],
  );
  const revisedTotal = revisedSteps.reduce((sum, row) => sum + row.timing.totalSec, 0);
  const revisedRest = revisedSteps.reduce(
    (sum, row) => sum + (row.rest ? row.timing.totalSec : 0),
    0,
  );
  const changedStepPositions = Array.from(
    { length: Math.max(stepDetails.length, revisedSteps.length) },
    (_, index) => index,
  ).filter(
    (index) => stepSignature(stepDetails[index]?.step) !== stepSignature(revisedSteps[index]?.step),
  );
  const locationName = (id: string) =>
    schedule.locations.find((item) => item.id === id)?.alias ?? '장소 정보 없음';

  const activeCopyOutcome =
    !copyPreview &&
    lastCopyOutcome &&
    lastCopyOutcome.source === sourceStart &&
    lastCopyOutcome.target === targetStart
      ? lastCopyOutcome
      : null;

  const effectiveCopySummary = useMemo<EffectiveCopySummary>(() => {
    if (!activeCopyOutcome) {
      return {
        status: 'zero-copied',
        copied: [],
        skipped: [],
        unconfirmed: [],
      };
    }
    const didPlanningUpdate = assignments !== activeCopyOutcome.preCopyAssignments;
    const baseSkippedList = activeCopyOutcome.reportedSkipped ?? activeCopyOutcome.skipped;
    const seenSkipPairs = new Set<string>();
    const skippedKeys = new Set<string>();
    const mergedSkipped: DatedWeekCopySkip[] = [];
    for (const item of baseSkippedList) {
      const pair = `${item.key}::${item.code}`;
      if (seenSkipPairs.has(pair)) continue;
      seenSkipPairs.add(pair);
      skippedKeys.add(item.key);
      mergedSkipped.push(item);
    }

    if (!didPlanningUpdate && activeCopyOutcome.reportedAdded !== 0) {
      return {
        status: 'pending-props',
        copied: [],
        skipped: mergedSkipped,
        unconfirmed: activeCopyOutcome.committedProposals.map((proposal) => ({
          key: getDatedPlanKey(proposal.classId, proposal.originalDate),
          classId: proposal.classId,
          originalDate: proposal.originalDate,
          date: proposal.occurrenceSnapshot.date,
          startTime: proposal.occurrenceSnapshot.startTime,
          locationId: proposal.occurrenceSnapshot.locationId,
          sequenceTitle: proposal.sequenceSnapshot.title,
        })),
      };
    }

    const candidateCopied: VerifiedCopiedItem[] = [];
    if (didPlanningUpdate && activeCopyOutcome.reportedAdded !== 0) {
      for (const proposal of activeCopyOutcome.committedProposals) {
        const proposalInTargetRange =
          proposal.occurrenceSnapshot.date >= activeCopyOutcome.target &&
          proposal.occurrenceSnapshot.date <= activeCopyOutcome.targetEnd;
        if (!proposalInTargetRange) continue;
        const key = getDatedPlanKey(proposal.classId, proposal.originalDate);
        if (activeCopyOutcome.preCopyKeys.has(key) || skippedKeys.has(key)) continue;
        const actual = byKey.get(key);
        if (!actual || activeCopyOutcome.preCopyIds.has(actual.id)) continue;
        const actualMatchesProposal =
          actual.classId === proposal.classId &&
          actual.originalDate === proposal.originalDate &&
          actual.occurrenceSnapshot.date >= activeCopyOutcome.target &&
          actual.occurrenceSnapshot.date <= activeCopyOutcome.targetEnd &&
          actual.sourceSequenceId === proposal.sourceSequenceId &&
          actual.sourceSequenceUpdatedAt === proposal.sourceSequenceUpdatedAt;
        if (!actualMatchesProposal) continue;
        candidateCopied.push({
          key,
          classId: actual.classId,
          originalDate: actual.originalDate,
          date: actual.occurrenceSnapshot.date,
          startTime: actual.occurrenceSnapshot.startTime,
          locationId: actual.occurrenceSnapshot.locationId,
          sequenceTitle: actual.sequenceSnapshot.title,
          createdAt: actual.createdAt,
        });
      }
    }

    const verifiedCopied =
      activeCopyOutcome.reportedAdded !== null &&
      candidateCopied.length > activeCopyOutcome.reportedAdded
        ? [...candidateCopied]
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
            .slice(0, activeCopyOutcome.reportedAdded)
        : candidateCopied;
    const verifiedCopiedKeys = new Set(verifiedCopied.map((item) => item.key));
    const unconfirmed: UnconfirmedCopyProposal[] = [];

    for (const proposal of activeCopyOutcome.committedProposals) {
      const key = getDatedPlanKey(proposal.classId, proposal.originalDate);
      if (verifiedCopiedKeys.has(key) || skippedKeys.has(key)) continue;
      const targetResolution = resolveDatedPlanOccurrence(
        schedule,
        proposal.classId,
        proposal.originalDate,
      );
      if (byKey.has(key)) {
        skippedKeys.add(key);
        mergedSkipped.push({ key, code: 'already-assigned' });
      } else if (!targetResolution.occurrence) {
        skippedKeys.add(key);
        mergedSkipped.push({ key, code: 'target-missing' });
      } else if (targetResolution.status !== 'scheduled') {
        skippedKeys.add(key);
        mergedSkipped.push({ key, code: 'target-inactive' });
      } else if (
        targetResolution.occurrence.date < activeCopyOutcome.target ||
        targetResolution.occurrence.date > activeCopyOutcome.targetEnd
      ) {
        skippedKeys.add(key);
        mergedSkipped.push({ key, code: 'target-outside-week' });
      } else {
        unconfirmed.push({
          key,
          classId: proposal.classId,
          originalDate: proposal.originalDate,
          date: proposal.occurrenceSnapshot.date,
          startTime: proposal.occurrenceSnapshot.startTime,
          locationId: proposal.occurrenceSnapshot.locationId,
          sequenceTitle: proposal.sequenceSnapshot.title,
        });
      }
    }

    const status: CopyOutcomeStatus =
      verifiedCopied.length === 0
        ? 'zero-copied'
        : verifiedCopied.length < activeCopyOutcome.committedProposals.length
          ? 'partial-copied'
          : 'all-copied';

    return {
      status,
      copied: verifiedCopied,
      skipped: mergedSkipped,
      unconfirmed,
    };
  }, [activeCopyOutcome, assignments, byKey, schedule]);

  const activeReplaceOutcome =
    identity &&
    lastReplaceOutcome &&
    lastReplaceOutcome.classId === identity.classId &&
    lastReplaceOutcome.originalDate === identity.originalDate
      ? lastReplaceOutcome
      : null;

  function runSingleCommit<T extends ActionResult>(commitKey: string, action: () => T): T | null {
    if (inFlightActionRef.current || lastCommittedKeyRef.current === commitKey) {
      return null;
    }
    inFlightActionRef.current = true;
    try {
      const result = action();
      if (result.success) {
        lastCommittedKeyRef.current = commitKey;
      }
      return result;
    } finally {
      inFlightActionRef.current = false;
    }
  }

  function closeOnce() {
    if (closing.current) return;
    closing.current = true;
    onClose();
  }

  function navigatePlanningStep(nextStep: 1 | 2 | 3) {
    setPlanningStep(nextStep);
    const behavior = getScrollBehavior();
    if (nextStep === 1) {
      if (mode === 'month' && calendarScrollRef.current) {
        calendarScrollRef.current.scrollIntoView?.({ behavior, block: 'nearest' });
        const activeDateBtn =
          calendarScrollRef.current.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
        (activeDateBtn ?? calendarScrollRef.current).focus();
        return;
      }
      if (toolbarRef.current) {
        toolbarRef.current.scrollIntoView?.({ behavior, block: 'nearest' });
        const focusTarget = toolbarRef.current.querySelector<HTMLElement>(
          'input[type="date"], button[aria-pressed="true"], button',
        );
        (focusTarget ?? toolbarRef.current).focus();
      }
      return;
    }
    if (nextStep === 2) {
      if (occurrencesRef.current) {
        occurrencesRef.current.scrollIntoView?.({ behavior, block: 'nearest' });
        const firstOccurrenceBtn =
          occurrencesRef.current.querySelector<HTMLButtonElement>('article button:not(:disabled)') ??
          occurrencesRef.current.querySelector<HTMLButtonElement>('button:not(:disabled)');
        (firstOccurrenceBtn ?? occurrencesRef.current).focus();
      }
      return;
    }
    if (detailRef.current) {
      detailRef.current.scrollIntoView?.({ behavior, block: 'nearest' });
      const detailControl = detailRef.current.querySelector<HTMLElement>(
        'select:not(:disabled), button:not(:disabled), summary',
      );
      (detailControl ?? detailRef.current).focus();
      return;
    }
    if (copyRef.current) {
      copyRef.current.scrollIntoView?.({ behavior, block: 'nearest' });
      const copySummary = copyRef.current.querySelector<HTMLElement>(
        'summary, button:not(:disabled)',
      );
      (copySummary ?? copyRef.current).focus();
    }
  }

  function selectDate(date: string) {
    if (!isScheduleDate(date)) {
      setFeedback({
        success: false,
        message: '날짜는 1900년부터 2199년까지 선택해 주세요.',
      });
      return;
    }
    hasUserChangedDraftRef.current = false;
    lastCommittedKeyRef.current = null;
    setDraftRestored(false);
    setSelectedDate(date);
    setOccurrenceFilter('all');
    setIdentity(null);
    setSequenceId('');
    setLoadConfirmed(false);
    setRevisionSequenceId('');
    setRevisionPreview(null);
    setPriorVersionIndex(null);
    setLastReplaceOutcome(null);
    setFeedback(null);
  }

  function switchMode(nextMode: ViewMode) {
    setMode(nextMode);
    setOccurrenceFilter('all');
    setFeedback(null);
  }

  function navigate(direction: -1 | 1) {
    if (mode !== 'month')
      return selectDate(addScheduleDays(selectedDate, direction * (mode === 'week' ? 7 : 1)));
    const next = shiftPlanningCalendarMonth(selectedDate, direction);
    if (next) selectDate(next);
    else
      setFeedback({
        success: false,
        message: '날짜는 1900년부터 2199년까지 선택해 주세요.',
      });
  }

  function openSelectedScheduleDate() {
    if (!props.onOpenScheduleDate || closing.current) return;
    const dialog = contentRef.current?.closest<HTMLDialogElement>('dialog');
    // Native close restores the opener while it is still mounted. The parent focuses the day after rendering it.
    if (dialog?.open) dialog.close();
    closeOnce();
    props.onOpenScheduleDate(selectedDate);
  }

  function selectOccurrence(row: OccurrenceIdentity) {
    const current = resolveDatedPlanOccurrence(schedule, row.classId, row.originalDate).occurrence;
    if (current) setSelectedDate(current.date);
    const existing = byKey.get(getDatedPlanKey(row.classId, row.originalDate));
    const restored = readDatedPlanningDraft(row, savedSequences);
    const restoredSequenceId = !existing ? (restored?.sequenceId ?? '') : '';
    const restoredRevisionSequenceId = existing ? (restored?.revisionSequenceId ?? '') : '';
    hasUserChangedDraftRef.current = false;
    pendingDetailFocusRef.current = true;
    lastCommittedKeyRef.current = null;
    setIdentity({ classId: row.classId, originalDate: row.originalDate });
    setSequenceId(restoredSequenceId);
    setLoadConfirmed(false);
    setRevisionSequenceId(restoredRevisionSequenceId);
    setDraftRestored(Boolean(restoredSequenceId || restoredRevisionSequenceId));
    setPlanningStep(3);
    setRevisionPreview(null);
    setPriorVersionIndex(null);
    setLastReplaceOutcome(null);
    setFeedback(null);
  }

  function closeOccurrenceDetail() {
    const triggerKey = identity ? getDatedPlanKey(identity.classId, identity.originalDate) : null;
    hasUserChangedDraftRef.current = false;
    setIdentity(null);
    setSequenceId('');
    setLoadConfirmed(false);
    setRevisionSequenceId('');
    setRevisionPreview(null);
    setPriorVersionIndex(null);
    setLastReplaceOutcome(null);
    setDraftRestored(false);
    setPlanningStep(2);
    if (triggerKey) {
      const triggerBtn = occurrenceTriggerRefs.current.get(triggerKey);
      if (triggerBtn?.isConnected) {
        triggerBtn.focus();
      }
    }
  }

  function cancelSequenceDraftSelection() {
    hasUserChangedDraftRef.current = false;
    lastCommittedKeyRef.current = null;
    setSequenceId('');
    setDraftRestored(false);
    clearDatedPlanningDraft(identity);
    assignSelectRef.current?.focus();
  }

  function describeKey(key: string) {
    try {
      const [classId, originalDate] = JSON.parse(key) as [string, string];
      return `${schedule.classes.find((item) => item.id === classId)?.title ?? '원본 수업 없음'} · ${originalDate}`;
    } catch {
      return '회차 정보 확인 필요';
    }
  }

  const nextActionText =
    planningStep === 1
      ? '지금 할 일: 상단에서 보기 방식과 기준 날짜를 고른 뒤 다음 단계로 이동하세요.'
      : planningStep === 2
        ? '지금 할 일: 아래 목록에서 시퀀스를 지정하거나 확인할 수업 회차를 고르세요.'
        : identity && !assignment
          ? '지금 할 일: 시퀀스 목록에서 사용할 구성을 고르고 사본 저장을 완료하세요.'
          : identity && assignment
            ? '지금 할 일: 연결된 계획 사본을 검토하거나 수정본 교체·주간 복사를 진행하세요.'
            : '지금 할 일: 회차를 선택해 시퀀스를 배정하거나 아래에서 주간 복사를 진행하세요.';

  return (
    <LightDismissDialog
      open
      onClose={closeOnce}
      title="주·월 시퀀스 계획"
      subtitle="날짜별 수업 계획 사본을 관리합니다. 작성 중·준비 표시는 일정 관리용이며 전문가 검수나 실제 수업 기록과 별개입니다."
      maxWidth="1020px"
      className="dated-planning-dialog"
    >
      <div className="dated-planning" ref={contentRef}>
        <nav
          className="pf-step-guide-bar dated-planning-step-guide"
          aria-label="날짜별 계획 진행 단계"
          data-testid="dated-planning-step-guide"
        >
          <ol className="pf-step-guide-list">
            {(
              [
                { step: 1 as const, label: '1 기간·날짜 선택' },
                { step: 2 as const, label: '2 수업 회차 선택' },
                { step: 3 as const, label: '3 시퀀스 배정·주간 복사' },
              ] as const
            ).map((item) => (
              <li key={item.step}>
                <button
                  type="button"
                  aria-current={planningStep === item.step ? 'step' : undefined}
                  className={`pf-step-guide-chip ${planningStep === item.step ? 'is-active' : ''}`}
                  onClick={() => navigatePlanningStep(item.step)}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ol>
          <div className="pf-step-guide-subrow">
            <p
              className="pf-step-guide-focus"
              data-testid="dated-planning-next-action"
              aria-live="polite"
            >
              {nextActionText}
            </p>
            <div className="pf-step-guide-nav">
              <button
                type="button"
                className="pf-step-nav-btn"
                disabled={planningStep === 1}
                onClick={() => navigatePlanningStep(planningStep === 3 ? 2 : 1)}
              >
                이전 단계
              </button>
              <button
                type="button"
                className="pf-step-nav-btn"
                disabled={planningStep === 3}
                onClick={() => navigatePlanningStep(planningStep === 1 ? 2 : 3)}
              >
                다음 단계
              </button>
            </div>
          </div>
        </nav>

        <div className="dated-planning-toolbar" ref={toolbarRef} tabIndex={-1}>
          <div role="group" aria-label="계획 기간 보기" className="dated-planning-modes">
            {(['day', 'week', 'month'] as const).map((value) => (
              <button
                type="button"
                key={value}
                aria-pressed={mode === value}
                onClick={() => switchMode(value)}
              >
                {{ day: '일간', week: '주간', month: '월간' }[value]}
              </button>
            ))}
          </div>
          <div className="dated-planning-date-nav">
            <button type="button" aria-label="계획 이전 기간" onClick={() => navigate(-1)}>
              <ChevronLeft size={18} />
            </button>
            <label>
              계획 기준 날짜
              <input
                type="date"
                min="1900-01-01"
                max="2199-12-31"
                value={selectedDate}
                onChange={(event) => selectDate(event.target.value)}
              />
            </label>
            <button type="button" aria-label="계획 다음 기간" onClick={() => navigate(1)}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <p className="dated-planning-range">
          {start} – {end} · 예정 {rows.filter((row) => row.status === 'scheduled').length}회
        </p>
        {feedback && (
          <p role={feedback.success ? 'status' : 'alert'} className="dated-planning-feedback">
            {feedback.message}
          </p>
        )}

        {mode === 'month' && (
          <p id={calendarHelpId} className="planning-calendar-help">
            날짜에서 방향키로 이동하고 Home·End로 주의 처음·끝, PageUp·PageDown으로 월을 바꿉니다.
            준비 표시는 정리 상태이며 수업 승인이나 실제 진행 기록이 아닙니다.
          </p>
        )}
        {mode === 'month' && (
          <div
            className="dated-planning-calendar-scroll"
            role="region"
            aria-label="월간 계획 날짜 선택"
            tabIndex={0}
            ref={calendarScrollRef}
          >
            <div
              className="dated-planning-calendar"
              aria-label={`${selectedDate.slice(0, 4)}년 ${Number(selectedDate.slice(5, 7))}월`}
            >
              {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                <span key={day} className="dated-planning-weekday">
                  {SCHEDULE_WEEKDAYS[day]}
                </span>
              ))}
              {Array.from({ length: month.leadingDays }, (_, index) => (
                <span key={`blank-${index}`} aria-hidden="true" />
              ))}
              {month.dates.map((date) => {
                const day = calendarDays.get(date) ?? emptyPlanningCalendarDay();
                const planCount = day.prepared + day.draft;
                const statusId = `${calendarHelpId}-${date}`;
                const exceptions = day.cancelled + day.closed + day.moved + day.closures;
                const compactStatus =
                  day.warnings + day.conflicts > 0
                    ? '확인'
                    : exceptions > 0
                      ? '변경'
                      : day.unassigned > 0
                        ? '미정'
                        : day.draft > 0
                          ? '작성'
                          : day.prepared > 0
                            ? '준비'
                            : '';
                return (
                  <button
                    type="button"
                    key={date}
                    data-planning-date={date}
                    data-needs-attention={day.warnings + day.conflicts > 0 || undefined}
                    tabIndex={date === selectedDate ? 0 : -1}
                    aria-pressed={date === selectedDate}
                    aria-current={date === localScheduleDate() ? 'date' : undefined}
                    aria-label={`${date} 예정 ${day.scheduled}회 계획 ${planCount}개`}
                    aria-describedby={`${calendarHelpId} ${statusId}`}
                    aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home End PageUp PageDown"
                    onClick={() => selectDate(date)}
                    onKeyDown={(event) => {
                      const next = planningCalendarKeyDate(date, event.key);
                      if (!next) return;
                      event.preventDefault();
                      calendarFocusTarget.current = next;
                      if (next === selectedDate) {
                        event.currentTarget.focus();
                        calendarFocusTarget.current = null;
                      } else selectDate(next);
                    }}
                  >
                    <strong>{Number(date.slice(8))}</strong>
                    <span className="planning-calendar-count" aria-hidden="true">
                      {day.scheduled > 0
                        ? `${day.scheduled}회`
                        : planCount > 0
                          ? `${planCount}안`
                          : '\u00a0'}
                    </span>
                    {compactStatus && (
                      <span
                        className="planning-calendar-compact-status"
                        data-status={compactStatus}
                        aria-hidden="true"
                      >
                        {compactStatus}
                      </span>
                    )}
                    <span id={statusId} className="sr-only">
                      {describePlanningCalendarDay(day)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <section
          aria-label="계획할 수업 회차"
          className="dated-planning-occurrences"
          ref={occurrencesRef}
          tabIndex={-1}
        >
          <div className="planning-selected-date-heading">
            <h3>{mode === 'month' ? formatScheduleDate(selectedDate) : '선택 기간의 수업'}</h3>
            <div className="dated-planning-occurrence-controls">
              {showOccurrenceFilter && (
                <div
                  role="group"
                  aria-label="회차 계획 필터"
                  className="dated-planning-filter-pills"
                >
                  <button
                    type="button"
                    aria-pressed={occurrenceFilter === 'all'}
                    onClick={() => setOccurrenceFilter('all')}
                  >
                    전체 ({shownRows.length})
                  </button>
                  <button
                    type="button"
                    aria-pressed={occurrenceFilter === 'unassigned'}
                    onClick={() => setOccurrenceFilter('unassigned')}
                  >
                    미지정 ({unassignedScheduledCount})
                  </button>
                </div>
              )}
              {props.onOpenScheduleDate && (
                <button type="button" onClick={openSelectedScheduleDate}>
                  선택 날짜 일정 열기
                </button>
              )}
            </div>
          </div>
          {mode === 'month' && (
            <p className="planning-selected-summary" aria-label="선택 날짜 준비 요약">
              {describePlanningCalendarDay(
                calendarDays.get(selectedDate) ?? emptyPlanningCalendarDay(),
              )}
            </p>
          )}
          {!shownRows.length && (
            <div className="dated-planning-empty">
              <p>이 기간에 등록된 수업 회차가 없습니다. 일정 화면에서 수업을 먼저 등록해 주세요.</p>
              {mode === 'day' && sourceWeekScheduledCount > 0 && (
                <button type="button" onClick={() => switchMode('week')}>
                  이번 주 수업 보기 ({sourceWeekScheduledCount}회)
                </button>
              )}
            </div>
          )}
          {shownRows.length > 0 && visibleRows.length === 0 && (
            <div className="dated-planning-empty">
              <p>이 기간의 예정 수업은 모두 계획 사본이 연결되어 있습니다.</p>
              <button type="button" onClick={() => setOccurrenceFilter('all')}>
                전체 회차 보기
              </button>
            </div>
          )}
          {visibleRows.map((row) => {
            const rowKey = getDatedPlanKey(row.classId, row.originalDate);
            const existing = byKey.get(rowKey);
            const isSelected =
              identity?.classId === row.classId && identity?.originalDate === row.originalDate;
            return (
              <article
                className={`dated-planning-occurrence dated-planning-occurrence-${row.status}`}
                data-selected={isSelected ? 'true' : undefined}
                key={row.id}
                aria-label={`${row.date} ${row.title} ${STATUS_LABELS[row.status]}`}
              >
                <div>
                  <div className="dated-planning-title-row">
                    <h4>{row.title}</h4>
                    {isSelected && (
                      <span className="dated-planning-selected-badge">선택됨</span>
                    )}
                  </div>
                  <p>
                    {formatScheduleDate(row.date)} · {formatScheduleTime(row.startTime)}–
                    {formatScheduleTime(row.endTime)} · {locationName(row.locationId)}
                  </p>
                  <p>
                    {STATUS_LABELS[row.status]}
                    {row.movedFrom ? ` · 원래 ${row.originalDate} 회차` : ''}
                    {row.reason ? ` · ${row.reason}` : ''}
                  </p>
                  <p className="dated-planning-occurrence-plan-line">
                    <span
                      className={`dated-planning-state-pill dated-planning-state-pill-${
                        existing ? existing.state : 'unassigned'
                      }`}
                    >
                      {existing
                        ? existing.state === 'prepared'
                          ? '준비 표시'
                          : '작성 중'
                        : '날짜별 계획 미지정'}
                    </span>
                    {existing ? ` · ${existing.sequenceSnapshot.title}` : ''}
                  </p>
                </div>
                {row.status === 'moved' && row.movedTo ? (
                  <button
                    type="button"
                    ref={(node) => {
                      if (node) occurrenceTriggerRefs.current.set(rowKey, node);
                      else occurrenceTriggerRefs.current.delete(rowKey);
                    }}
                    onClick={() => {
                      selectDate(row.movedTo!);
                      selectOccurrence(row);
                    }}
                  >
                    변경 날짜로 보기
                  </button>
                ) : (
                  <button
                    type="button"
                    ref={(node) => {
                      if (node) occurrenceTriggerRefs.current.set(rowKey, node);
                      else occurrenceTriggerRefs.current.delete(rowKey);
                    }}
                    disabled={row.status !== 'scheduled' && !existing}
                    onClick={() => selectOccurrence(row)}
                  >
                    {existing
                      ? '저장 계획 보기'
                      : row.status === 'scheduled'
                        ? '회차 계획 지정'
                        : '계획 연결 불가'}
                  </button>
                )}
              </article>
            );
          })}
        </section>

        {identity && (
          <section
            className="dated-planning-detail"
            aria-label="선택한 회차 계획"
            ref={detailRef}
            tabIndex={-1}
          >
            <div className="dated-planning-detail-header">
              <h3>{occurrence?.title ?? '원본 수업을 찾을 수 없는 계획'}</h3>
              <button
                type="button"
                className="dated-planning-close-detail"
                onClick={closeOccurrenceDetail}
              >
                회차 선택 닫기
              </button>
            </div>
            <p>
              원래 회차 {identity.originalDate}
              {occurrence
                ? ` · 현재 ${occurrence.date} ${occurrence.startTime}–${occurrence.endTime} · ${locationName(occurrence.locationId)}`
                : ''}
            </p>
            {draftRestored && (
              <p
                className="dated-planning-draft-restored"
                data-testid="dated-planning-draft-restored"
                aria-live="polite"
              >
                선택 초안 복원됨 · 저장 전 선택한 시퀀스를 불러왔습니다.
              </p>
            )}
            {activeReplaceOutcome && (
              <div
                className="dated-planning-replace-outcome"
                data-testid="dated-planning-replace-outcome"
              >
                <strong>이 회차 계획 교체됨</strong>
                <p>
                  ‘{activeReplaceOutcome.previousTitle}’ → ‘
                  {assignment?.sequenceSnapshot.title ?? activeReplaceOutcome.requestedTitle}’ ·
                  이전 계획은 변경 이력에 보존했고 현재 상태는{' '}
                  {assignment?.state === 'prepared' ? '준비 표시' : '작성 중'}입니다.
                  {activeReplaceOutcome.wasContextRebound
                    ? ' 변경된 회차 일정·장소 기준으로 다시 연결했습니다.'
                    : ''}
                </p>
              </div>
            )}
            {resolved?.status !== 'scheduled' && (
              <p className="dated-planning-warning">
                현재 회차는{' '}
                {resolved?.status === 'cancelled'
                  ? '취소'
                  : resolved?.status === 'closed'
                    ? '휴무'
                    : '확인 불가'}{' '}
                상태입니다. 새 계획 연결·준비 표시·작업 사본 열기를 진행하지 않습니다.
              </p>
            )}
            {!assignment && resolved?.status === 'scheduled' && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!sequenceId) return;
                  const commitKey = `assign:${identity.classId}:${identity.originalDate}:${sequenceId}:${context}`;
                  const result = runSingleCommit(commitKey, () =>
                    onAssign({
                      sequenceId,
                      classId: identity.classId,
                      originalDate: identity.originalDate,
                      state: 'draft',
                    }),
                  );
                  if (!result) return;
                  setFeedback(result);
                  if (result.success) {
                    hasUserChangedDraftRef.current = false;
                    setDraftRestored(false);
                    clearDatedPlanningDraft(identity);
                  }
                }}
              >
                <label>
                  이 회차에 사용할 저장 시퀀스
                  <select
                    ref={assignSelectRef}
                    required
                    disabled={savedSequences.length === 0}
                    value={sequenceId}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      hasUserChangedDraftRef.current = true;
                      lastCommittedKeyRef.current = null;
                      setSequenceId(nextValue);
                      setDraftRestored(false);
                      writeDatedPlanningDraft(identity, {
                        sequenceId: nextValue,
                        revisionSequenceId,
                      });
                    }}
                  >
                    <option value="">저장 시퀀스 선택</option>
                    {savedSequences.map((sequence) => (
                      <option key={sequence.id} value={sequence.id}>
                        {sequence.title} ({sequence.targetMinutes}분 ·{' '}
                        {apparatusLabel(sequence.apparatus)} · Lv {sequence.level})
                      </option>
                    ))}
                  </select>
                </label>
                {!savedSequences.length && (
                  <p className="dated-planning-note">먼저 작업대에서 시퀀스를 저장해 주세요.</p>
                )}
                {selectedSequence && (
                  <div
                    className="dated-planning-candidate-summary"
                    data-testid="dated-planning-candidate-summary"
                  >
                    <p>
                      <strong>{selectedSequence.title}</strong> · 목표{' '}
                      {selectedSequence.targetMinutes}분 · 난이도 {selectedSequence.level} ·{' '}
                      {apparatusLabel(selectedSequence.apparatus)} · 단계{' '}
                      {selectedSequence.steps.length}개
                    </p>
                    {selectedSequenceWarnings.length > 0 ? (
                      selectedSequenceWarnings.map((warning) => (
                        <p className="dated-planning-warning" key={warning}>
                          {warning}
                        </p>
                      ))
                    ) : (
                      <p className="dated-planning-note">
                        현재 회차 시각·장소 준비물 기준 추가 확인 항목이 없습니다.
                      </p>
                    )}
                  </div>
                )}
                <p className="dated-planning-note">
                  선택한 시퀀스의 독립 사본을 작성 중으로 저장합니다. 원본을 나중에 수정해도 이 회차
                  사본은 바뀌지 않습니다.
                </p>
                <div className="dated-planning-form-actions">
                  <button
                    type="submit"
                    className="dated-planning-primary-btn"
                    disabled={!sequenceId}
                  >
                    이 회차에 계획 사본 저장
                  </button>
                  {sequenceId && (
                    <button type="button" onClick={cancelSequenceDraftSelection}>
                      선택 취소
                    </button>
                  )}
                </div>
              </form>
            )}

            {assignment && (
              <>
                <h4>{assignment.sequenceSnapshot.title}</h4>
                <p>
                  <strong>{assignment.state === 'prepared' ? '준비 표시' : '작성 중'}</strong> ·
                  계획 {formatSecondsToMMSS(snapshotTotal)} · 그 안의 휴식{' '}
                  {formatSecondsToMMSS(snapshotRest)}
                </p>
                <p className="dated-planning-note">
                  준비 표시는 개인적인 정리 상태입니다. 전문가 검수·동작 적합성·리허설 가능
                  여부·실제 수업 완료를 뜻하지 않습니다.
                </p>
                {!contextMatches && (
                  <p>
                    저장 당시 회차: {assignment.occurrenceSnapshot.date}{' '}
                    {assignment.occurrenceSnapshot.startTime}–
                    {assignment.occurrenceSnapshot.endTime} ·{' '}
                    {locationName(assignment.occurrenceSnapshot.locationId)}
                  </p>
                )}
                {!savedSequences.some((sequence) => sequence.id === assignment.sourceSequenceId) ? (
                  <p className="dated-planning-note">
                    저장 원본을 찾을 수 없어도 이 회차 계획 사본은 유지됩니다.
                  </p>
                ) : (
                  savedSequences.some(
                    (sequence) =>
                      sequence.id === assignment.sourceSequenceId &&
                      sequence.updatedAt !== assignment.sourceSequenceUpdatedAt,
                  ) && (
                    <p className="dated-planning-note">
                      원본 시퀀스가 이후 수정되었습니다. 이곳에는 연결 당시의 계획 사본을
                      표시합니다.
                    </p>
                  )
                )}
                {warnings.map((warning) => (
                  <p className="dated-planning-warning" key={warning}>
                    {warning}
                  </p>
                ))}
                <div className="dated-planning-detail-actions">
                  <button
                    type="button"
                    className={
                      assignment.state === 'draft' && canUseAssignment
                        ? 'dated-planning-primary-btn'
                        : undefined
                    }
                    disabled={assignment.state === 'draft' && !canUseAssignment}
                    onClick={() => {
                      const nextState = assignment.state === 'prepared' ? 'draft' : 'prepared';
                      const commitKey = `state:${assignment.id}:${assignment.updatedAt}:${nextState}`;
                      const result = runSingleCommit(commitKey, () =>
                        onSetState(assignment.id, nextState, assignment.updatedAt),
                      );
                      if (result) setFeedback(result);
                    }}
                  >
                    {assignment.state === 'prepared' ? '작성 중으로 표시' : '준비 표시로 바꾸기'}
                  </button>
                  <button
                    type="button"
                    ref={editDraftBtnRef}
                    disabled={!canUseAssignment}
                    onClick={() => setLoadConfirmed((value) => !value)}
                    aria-expanded={loadConfirmed}
                  >
                    작업 사본으로 편집
                  </button>
                </div>
                {loadConfirmed && canUseAssignment && (
                  <div
                    className="dated-planning-confirm"
                    role="group"
                    aria-label="작업 사본 열기 확인"
                    onKeyDown={(event) => {
                      if (event.key !== 'Escape') return;
                      event.preventDefault();
                      event.stopPropagation();
                      setLoadConfirmed(false);
                      editDraftBtnRef.current?.focus();
                    }}
                  >
                    <p>
                      현재 작업대 내용을 새 작업 사본으로 전환합니다. 이전 초안은 실행 취소로 복원할
                      수 있습니다. 이 회차 사본·저장 원본·다른 회차 계획·실제 수업 기록은 그대로
                      유지됩니다.
                    </p>
                    <p>
                      독립 초안에는 장소 연결이 유지되지 않습니다. 수업 전 실제 장소의 기구·소도구를
                      직접 확인하세요.
                    </p>
                    {warnings.length > 0 && (
                      <div aria-label="현재 장소·시간 확인 사항">
                        {warnings.map((warning) => (
                          <p className="dated-planning-warning" key={warning}>
                            {warning}
                          </p>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      className="dated-planning-primary-btn"
                      onClick={() => {
                        const commitKey = `load:${assignment.id}:${assignment.updatedAt}`;
                        const result = runSingleCommit(commitKey, () =>
                          onLoadDraft(assignment.id, assignment.updatedAt),
                        );
                        if (!result) return;
                        setFeedback(result);
                        if (result.success) {
                          const dialog = contentRef.current?.closest<HTMLDialogElement>('dialog');
                          if (dialog?.open) dialog.close();
                          closeOnce();
                          props.onLoadSuccess?.();
                        }
                      }}
                    >
                      새 작업 사본 열기 확인
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLoadConfirmed(false);
                        editDraftBtnRef.current?.focus();
                      }}
                    >
                      돌아가기
                    </button>
                  </div>
                )}
                <details>
                  <summary>저장한 계획 단계 {stepDetails.length}개 보기</summary>
                  <ol className="dated-planning-steps">
                    {stepDetails.map(({ step, rest, timing, name, sides }, index) => (
                      <li key={`${step.stepId}-${index}`}>
                        <strong>{rest ? '휴식' : name}</strong> ·{' '}
                        {formatSecondsToMMSS(timing.totalSec)}
                        {!rest && (
                          <span>
                            {sides.join(' → ')} ·{' '}
                            {step.repetitions === undefined
                              ? '횟수 미지정'
                              : `${step.repetitions}회`}
                            {step.sets === undefined ? '' : ` × ${step.sets}세트`} · 설명{' '}
                            {timing.explanationSec}초 · 전환 {timing.transitionSec}초
                          </span>
                        )}
                        {step.instructorNote && <p>{step.instructorNote}</p>}
                      </li>
                    ))}
                  </ol>
                  <p className="dated-planning-note">
                    단계 값은 저장 사본이며, 동작 이름은 현재 동작 목록에 연결해 표시합니다.
                  </p>
                </details>
                <details className="dated-planning-version-history">
                  <summary>계획 변경 이력 {priorVersions.length}개 · 실제 수업 기록과 별개</summary>
                  <p className="dated-planning-note">
                    현재 계획은 버전 {priorVersions.length + 1}입니다. 아래는 보존한 이전 계획
                    사본이며, 당시의 준비 표시도 일정 정리용 상태입니다.
                  </p>
                  {!priorVersions.length && <p>보존된 이전 버전이 없습니다.</p>}
                  {priorVersions.map((version, index) => (
                    <details
                      key={`${version.id}-${version.updatedAt}-${index}`}
                      open={priorVersionIndex === index}
                    >
                      <summary
                        onClick={(event) => {
                          event.preventDefault();
                          setPriorVersionIndex((current) => (current === index ? null : index));
                        }}
                      >
                        이전 버전 {index + 1} · {version.sequenceSnapshot.title}
                      </summary>
                      {priorVersionIndex === index && (
                        <div>
                          <p>
                            당시 상태: {version.state === 'prepared' ? '준비 표시' : '작성 중'} ·
                            저장 {version.updatedAt}
                          </p>
                          <p>
                            당시 회차: {version.occurrenceSnapshot.date}{' '}
                            {version.occurrenceSnapshot.startTime}–
                            {version.occurrenceSnapshot.endTime} ·{' '}
                            {locationName(version.occurrenceSnapshot.locationId)}
                          </p>
                          <ReadonlyPlanSnapshot
                            snapshot={version.sequenceSnapshot}
                            exercises={exercises}
                          />
                        </div>
                      )}
                    </details>
                  ))}
                </details>
                <details className="dated-planning-revision">
                  <summary>이 회차에 저장한 수정본 연결</summary>
                  <p className="dated-planning-note">
                    작업 사본에서 직접 수정하거나 일부 구간을 다시 만든 뒤 시퀀스를 직접 저장해
                    주세요. 아래에서는 그 저장본을 선택해 이 회차에만 연결합니다. 작업대 내용은 자동
                    저장하지 않습니다.
                  </p>
                  <label>
                    이 회차에 연결할 저장 수정본
                    <select
                      value={revisionSequenceId}
                      disabled={!canReviseAssignment || savedSequences.length === 0}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        hasUserChangedDraftRef.current = true;
                        lastCommittedKeyRef.current = null;
                        setRevisionSequenceId(nextValue);
                        setRevisionPreview(null);
                        setLastReplaceOutcome(null);
                        setDraftRestored(false);
                        writeDatedPlanningDraft(identity, {
                          sequenceId,
                          revisionSequenceId: nextValue,
                        });
                      }}
                    >
                      <option value="">저장 수정본 선택</option>
                      {savedSequences.map((sequence) => (
                        <option value={sequence.id} key={sequence.id}>
                          {sequence.title} ({sequence.targetMinutes}분 ·{' '}
                          {apparatusLabel(sequence.apparatus)} · Lv {sequence.level})
                        </option>
                      ))}
                    </select>
                  </label>
                  {!savedSequences.length && (
                    <p className="dated-planning-note">
                      연결할 저장 시퀀스가 없습니다. 작업대에서 수정본을 먼저 저장해 주세요.
                    </p>
                  )}
                  {priorVersions.length >= DATED_PLAN_PRIOR_VERSION_LIMIT && (
                    <p className="dated-planning-warning">
                      이전 계획 {DATED_PLAN_PRIOR_VERSION_LIMIT}개 보존 한도에 도달했습니다. 보존한
                      버전은 삭제하지 않습니다.
                    </p>
                  )}
                  {!contextMatches && resolved?.status === 'scheduled' && (
                    <p className="dated-planning-warning">
                      현재 회차의 날짜·시각·장소가 저장 당시와 다릅니다. 아래 미리보기에서 변경된
                      회차를 확인한 뒤 명시적으로 다시 연결할 수 있습니다.
                    </p>
                  )}
                  <button
                    type="button"
                    ref={revisionDiffBtnRef}
                    disabled={!canReviseAssignment || !revisionCandidate}
                    onClick={() => {
                      if (!revisionCandidate || !occurrence) return;
                      setLoadConfirmed(false);
                      setLastReplaceOutcome(null);
                      lastCommittedKeyRef.current = null;
                      try {
                        setRevisionPreview({
                          assignmentId: assignment.id,
                          sequenceId: revisionCandidate.id,
                          expectedUpdatedAt: assignment.updatedAt,
                          expectedOccurrenceSnapshot: {
                            date: occurrence.date,
                            startTime: occurrence.startTime,
                            endTime: occurrence.endTime,
                            locationId: occurrence.locationId,
                          },
                          expectedSourceFingerprint:
                            getDatedPlanSourceFingerprint(revisionCandidate),
                          context: revisionContext,
                          snapshot: structuredClone(revisionCandidate),
                          warnings: getSchedulePlanWarnings(
                            {
                              ...occurrence,
                              linkSavedSequenceId: revisionCandidate.id,
                            },
                            schedule,
                            [revisionCandidate],
                            exercises,
                          ),
                        });
                      } catch {
                        setFeedback({
                          success: false,
                          message:
                            '선택한 저장 수정본의 형식을 확인해 주세요. 기존 회차 계획은 유지했습니다.',
                        });
                      }
                    }}
                  >
                    수정본 차이 확인
                  </button>
                  {revisionPreview && (
                    <div
                      className="dated-planning-revision-preview"
                      role="group"
                      aria-label="이 회차 계획 수정 미리보기"
                      onKeyDown={(event) => {
                        if (event.key !== 'Escape') return;
                        event.preventDefault();
                        event.stopPropagation();
                        setRevisionPreview(null);
                        revisionDiffBtnRef.current?.focus();
                      }}
                    >
                      <h4>이 회차의 변경 내용</h4>
                      <div
                        className="dated-planning-revision-table-scroll"
                        role="region"
                        aria-label="이전 계획과 수정본 비교 표"
                        tabIndex={0}
                      >
                        <table>
                          <caption>원래 회차 {assignment.originalDate}의 계획·일정 비교</caption>
                          <thead>
                            <tr>
                              <th scope="col">항목</th>
                              <th scope="col">현재 회차 사본</th>
                              <th scope="col">선택한 저장 수정본</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <th scope="row">제목</th>
                              <td>{assignment.sequenceSnapshot.title}</td>
                              <td>{revisionPreview.snapshot.title}</td>
                            </tr>
                            <tr>
                              <th scope="row">전체 계획 · 휴식 포함</th>
                              <td>{formatSecondsToMMSS(snapshotTotal)}</td>
                              <td>{formatSecondsToMMSS(revisedTotal)}</td>
                            </tr>
                            <tr>
                              <th scope="row">그 안의 휴식</th>
                              <td>{formatSecondsToMMSS(snapshotRest)}</td>
                              <td>{formatSecondsToMMSS(revisedRest)}</td>
                            </tr>
                            <tr>
                              <th scope="row">계획 단계</th>
                              <td>{stepDetails.length}개</td>
                              <td>{revisedSteps.length}개</td>
                            </tr>
                            <tr>
                              <th scope="row">저장 목표·난이도·기구 분류</th>
                              <td>
                                {assignment.sequenceSnapshot.targetMinutes}분 ·{' '}
                                {assignment.sequenceSnapshot.level} ·{' '}
                                {apparatusLabel(assignment.sequenceSnapshot.apparatus)}
                              </td>
                              <td>
                                {revisionPreview.snapshot.targetMinutes}분 ·{' '}
                                {revisionPreview.snapshot.level} ·{' '}
                                {apparatusLabel(revisionPreview.snapshot.apparatus)}
                              </td>
                            </tr>
                            <tr>
                              <th scope="row">회차 날짜·시각·장소</th>
                              <td>
                                {assignment.occurrenceSnapshot.date}{' '}
                                {assignment.occurrenceSnapshot.startTime}–
                                {assignment.occurrenceSnapshot.endTime} ·{' '}
                                {locationName(assignment.occurrenceSnapshot.locationId)}
                              </td>
                              <td>
                                {revisionPreview.expectedOccurrenceSnapshot.date}{' '}
                                {revisionPreview.expectedOccurrenceSnapshot.startTime}–
                                {revisionPreview.expectedOccurrenceSnapshot.endTime} ·{' '}
                                {locationName(
                                  revisionPreview.expectedOccurrenceSnapshot.locationId,
                                )}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <p>계획 값이 달라진 단계 {changedStepPositions.length}개</p>
                      {!!changedStepPositions.length && (
                        <ul>
                          {changedStepPositions.map((index) => (
                            <li key={index}>
                              {index + 1}번째 단계:{' '}
                              {stepDetails[index]
                                ? `${stepDetails[index].name} ${formatSecondsToMMSS(stepDetails[index].timing.totalSec)}`
                                : '단계 없음'}{' '}
                              →{' '}
                              {revisedSteps[index]
                                ? `${revisedSteps[index].name} ${formatSecondsToMMSS(revisedSteps[index].timing.totalSec)}`
                                : '단계 없음'}{' '}
                              · 동작·시간·횟수·세트·좌우·메모 등의 계획 값 비교
                            </li>
                          ))}
                        </ul>
                      )}
                      <details>
                        <summary>현재 회차 사본의 전체 계획 단계 보기</summary>
                        <ReadonlyPlanSnapshot
                          snapshot={assignment.sequenceSnapshot}
                          exercises={exercises}
                        />
                      </details>
                      <details>
                        <summary>선택한 수정본의 전체 계획 단계 보기</summary>
                        <ReadonlyPlanSnapshot
                          snapshot={revisionPreview.snapshot}
                          exercises={exercises}
                        />
                      </details>
                      <h4>현재 사본의 장소·시간 확인 사항</h4>
                      {warnings.length ? (
                        warnings.map((warning) => (
                          <p className="dated-planning-warning" key={warning}>
                            {warning}
                          </p>
                        ))
                      ) : (
                        <p className="dated-planning-note">
                          등록 정보 기준의 추가 표시 항목이 없습니다.
                        </p>
                      )}
                      <h4>선택한 수정본의 장소·시간 확인 사항</h4>
                      {revisionPreview.warnings.length ? (
                        revisionPreview.warnings.map((warning) => (
                          <p className="dated-planning-warning" key={warning}>
                            {warning}
                          </p>
                        ))
                      ) : (
                        <p className="dated-planning-note">
                          등록 정보 기준의 추가 표시 항목이 없습니다.
                        </p>
                      )}
                      <p className="dated-planning-note">
                        수업 전 실제 장소의 기구·소도구를 직접 확인하세요. 이 교체 확인은 전문가
                        검수나 실제 수업 기록과 별개입니다.
                      </p>
                      <p>
                        <strong>
                          원래 회차 {assignment.originalDate}의 이 계획만 수정본으로 바꿉니다.
                        </strong>{' '}
                        이전 전체 버전은 계획 변경 이력에 보존하고, 준비 표시는 작성 중으로
                        돌아갑니다. 다른 회차·저장 시퀀스·실제 수업 기록은 변경하지 않습니다.
                      </p>
                      {revisionStale && (
                        <p className="dated-planning-warning">
                          계획·저장 수정본·현재 일정 또는 준비물 정보가 바뀌었습니다. 수정본 차이를
                          다시 확인해 주세요.
                        </p>
                      )}
                      <button
                        type="button"
                        className="dated-planning-primary-btn"
                        disabled={revisionStale || !canReviseAssignment}
                        onClick={() => {
                          const commitKey = `replace:${revisionPreview.assignmentId}:${revisionPreview.expectedUpdatedAt}:${revisionPreview.sequenceId}:${revisionPreview.expectedSourceFingerprint}`;
                          const previousTitle = assignment.sequenceSnapshot.title;
                          const requestedTitle = revisionPreview.snapshot.title;
                          const wasContextRebound = !contextMatches;
                          const result = runSingleCommit(commitKey, () =>
                            props.onReplaceSnapshot({
                              assignmentId: revisionPreview.assignmentId,
                              sequenceId: revisionPreview.sequenceId,
                              expectedUpdatedAt: revisionPreview.expectedUpdatedAt,
                              expectedOccurrenceSnapshot:
                                revisionPreview.expectedOccurrenceSnapshot,
                              expectedSourceFingerprint: revisionPreview.expectedSourceFingerprint,
                            }),
                          );
                          if (!result) return;
                          setFeedback(result);
                          if (result.success) {
                            hasUserChangedDraftRef.current = false;
                            setDraftRestored(false);
                            clearDatedPlanningDraft(identity);
                            setLastReplaceOutcome({
                              classId: identity.classId,
                              originalDate: identity.originalDate,
                              previousTitle,
                              requestedTitle,
                              wasContextRebound,
                            });
                            setRevisionPreview(null);
                            setRevisionSequenceId('');
                            setPriorVersionIndex(null);
                          }
                        }}
                      >
                        이 회차만 수정본으로 바꾸기 확인
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRevisionPreview(null);
                          revisionDiffBtnRef.current?.focus();
                        }}
                      >
                        수정본 연결 취소
                      </button>
                    </div>
                  )}
                </details>
                <p className="dated-planning-note">
                  실제 소요 시간과 휴식은 수업 후 기록에서 따로 남깁니다. 날짜별 계획·준비
                  표시·복사만으로 수업 기록을 만들지 않습니다.
                </p>
              </>
            )}
          </section>
        )}

        {!!unresolved.length && (
          <details className="dated-planning-unresolved">
            <summary>원본 회차를 찾을 수 없는 저장 계획 {unresolved.length}개</summary>
            {unresolved.map((item) => (
              <button type="button" key={item.id} onClick={() => selectOccurrence(item)}>
                {item.originalDate} · {item.sequenceSnapshot.title} · 사본 확인
              </button>
            ))}
          </details>
        )}

        <details className="dated-planning-copy" ref={copyRef}>
          <summary>선택한 주를 다음 주로 복사</summary>
          <p>
            {sourceStart}–{addScheduleDays(sourceStart, 6)} → {targetStart}–{targetEnd}
          </p>
          {copyRangeValid && (
            <p className="dated-planning-copy-meta">
              이번 주 연결 계획 {sourceWeekPlannedCount}개
              {targetWeekExistingCount > 0
                ? ` · 다음 주 기존 계획 ${targetWeekExistingCount}개 그대로 유지`
                : ' · 다음 주 연결된 계획 없음'}
              {sourceWeekPlannedCount === 0
                ? ' — 이번 주 회차에 계획을 먼저 연결하면 다음 주로 복사할 수 있습니다.'
                : ''}
            </p>
          )}
          <p className="dated-planning-note">
            이어지는 두 7일만 처리합니다. 기존 계획은 덮어쓰지 않고, 대상 회차가 없거나
            취소·휴무이면 제외합니다. 새 사본은 모두 작성 중으로 시작합니다.
          </p>
          <button
            type="button"
            ref={previewCopyBtnRef}
            disabled={!copyRangeValid}
            onClick={() => {
              lastCommittedKeyRef.current = null;
              setLastCopyOutcome(null);
              setCopyPreview({
                result: onPreviewWeekCopy(sourceStart, targetStart),
                context,
                source: sourceStart,
                target: targetStart,
              });
            }}
          >
            다음 주 복사 미리보기
          </button>
          {copyPreview && (
            <div
              className="dated-planning-copy-preview"
              aria-label="주간 복사 미리보기"
              onKeyDown={(event) => {
                if (event.key !== 'Escape') return;
                event.preventDefault();
                event.stopPropagation();
                setCopyPreview(null);
                previewCopyBtnRef.current?.focus();
              }}
            >
              <p role={copyPreview.result.success ? 'status' : 'alert'}>
                {copyPreview.result.message}
              </p>
              {previewStale && (
                <p className="dated-planning-warning">
                  날짜·일정·계획이 바뀌었습니다. 복사 미리보기를 다시 확인해 주세요.
                </p>
              )}
              {copyPreview.result.success && (
                <>
                  <p>
                    새 사본 {copyPreview.result.proposals.length}개 · 제외{' '}
                    {copyPreview.result.skipped.length}개 · 기존 계획 충돌{' '}
                    {copyPreview.result.conflicts}개
                  </p>
                  {copyPreview.result.proposals.length === 0 && (
                    <p className="dated-planning-note">
                      새로 복사할 빈 회차가 없습니다. 기존 계획과 취소·휴무 회차는 변경하지 않습니다.
                    </p>
                  )}
                  {copyPreview.result.proposals.length > 0 && (
                    <div className="dated-planning-copy-group">
                      <strong>새로 복사할 빈 회차 ({copyPreview.result.proposals.length}개)</strong>
                      <ul>
                        {copyPreview.result.proposals.map((proposal) => (
                          <li key={getDatedPlanKey(proposal.classId, proposal.originalDate)}>
                            {schedule.classes.find((item) => item.id === proposal.classId)?.title ??
                              '수업'}{' '}
                            · 원래 {proposal.originalDate} → 실제 {proposal.occurrenceSnapshot.date}{' '}
                            {proposal.occurrenceSnapshot.startTime} ·{' '}
                            {locationName(proposal.occurrenceSnapshot.locationId)} ·{' '}
                            {proposal.sequenceSnapshot.title}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {copyPreview.result.skipped.length > 0 && (
                    <div className="dated-planning-copy-group">
                      <strong>
                        제외·유지 항목 ({copyPreview.result.skipped.length}개)
                      </strong>
                      <ul>
                        {copyPreview.result.skipped.map((skip) => (
                          <li key={`${skip.key}-${skip.code}`}>
                            {describeKey(skip.key)} · {SKIP_LABELS[skip.code]}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="dated-planning-copy-actions">
                    <button
                      type="button"
                      className="dated-planning-primary-btn"
                      disabled={previewStale || copyPreview.result.proposals.length === 0}
                      onClick={() => {
                        if (!copyPreview.result.success) return;
                        const commitKey = `copy:${copyPreview.source}:${copyPreview.target}:${copyPreview.context}`;
                        const preCopyAssignments = assignments;
                        const preCopyIds = new Set(assignments.map((item) => item.id));
                        const preCopyKeys = new Set(
                          assignments.map((item) => getDatedPlanKey(item.classId, item.originalDate)),
                        );
                        const committedProposals = copyPreview.result.proposals;
                        const skipped = copyPreview.result.skipped;
                        const source = copyPreview.source;
                        const target = copyPreview.target;
                        const result = runSingleCommit(commitKey, () =>
                          onCopyWeek(source, target),
                        );
                        if (!result) return;
                        setFeedback(result);
                        if (result.success) {
                          const reportedAdded =
                            typeof result.added === 'number'
                              ? result.added
                              : parseReportedWeekCopyCount(result.message);
                          setLastCopyOutcome({
                            source,
                            target,
                            targetEnd: addScheduleDays(target, 6),
                            message: result.message,
                            committedProposals,
                            skipped,
                            reportedAdded,
                            reportedSkipped: result.skipped,
                            preCopyAssignments,
                            preCopyIds,
                            preCopyKeys,
                          });
                          setCopyPreview(null);
                        }
                      }}
                    >
                      표시한 빈 회차에만 복사
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCopyPreview(null);
                        previewCopyBtnRef.current?.focus();
                      }}
                    >
                      미리보기 닫기
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          {activeCopyOutcome && (
            <div
              className="dated-planning-copy-outcome"
              data-testid="dated-planning-copy-outcome"
              data-copy-status={effectiveCopySummary.status}
              aria-label="주간 복사 결과 요약"
            >
              <strong>
                {effectiveCopySummary.status === 'pending-props'
                  ? `복사 반영 확인 중 · 확인된 새 사본 0개 (요청 후보 ${activeCopyOutcome.committedProposals.length}개) · 건너뜀·유지 ${effectiveCopySummary.skipped.length}개`
                  : effectiveCopySummary.status === 'zero-copied'
                    ? `복사 후 추가된 계획 없음 · 확인된 새 사본 0개 · 건너뜀·유지 ${effectiveCopySummary.skipped.length}개${effectiveCopySummary.unconfirmed.length > 0 ? ` · 미반영 후보 ${effectiveCopySummary.unconfirmed.length}개` : ''}`
                    : effectiveCopySummary.status === 'partial-copied'
                      ? `일부만 복사됨 · 새 사본 ${effectiveCopySummary.copied.length}개 (요청 후보 ${activeCopyOutcome.committedProposals.length}개 중) · 건너뜀·유지 ${effectiveCopySummary.skipped.length}개${effectiveCopySummary.unconfirmed.length > 0 ? ` · 미반영 후보 ${effectiveCopySummary.unconfirmed.length}개` : ''}`
                      : `복사 완료 요약 · 새 사본 ${effectiveCopySummary.copied.length}개 · 건너뜀·유지 ${effectiveCopySummary.skipped.length}개`}
              </strong>
              <p className="dated-planning-note">
                {effectiveCopySummary.status === 'pending-props'
                  ? '계획 목록 갱신 전에는 미리보기 후보를 실제 완료 건수로 확정하지 않습니다.'
                  : effectiveCopySummary.status === 'zero-copied'
                    ? effectiveCopySummary.unconfirmed.length > 0
                      ? `${activeCopyOutcome.message} · 아직 실제 계획 목록에서 복사 후보 반영이 확인되지 않았습니다.`
                      : `${activeCopyOutcome.message} · 새로 추가된 다음 주 계획은 0개이며 기존 계획은 그대로 유지했습니다.`
                    : effectiveCopySummary.status === 'partial-copied'
                      ? `${activeCopyOutcome.message} · 요청 후보 ${activeCopyOutcome.committedProposals.length}개 중 실제 반영이 확인된 ${effectiveCopySummary.copied.length}개만 새 사본으로 표시합니다.`
                      : activeCopyOutcome.message}
              </p>
              {effectiveCopySummary.copied.length > 0 && (
                <div className="dated-planning-copy-group">
                  <span>복사된 다음 주 회차</span>
                  <ul>
                    {effectiveCopySummary.copied.map((item) => (
                      <li key={item.key}>
                        {schedule.classes.find((cls) => cls.id === item.classId)?.title ?? '수업'} ·{' '}
                        {item.date} {item.startTime} · {locationName(item.locationId)} ·{' '}
                        {item.sequenceTitle} (작성 중)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {effectiveCopySummary.unconfirmed.length > 0 && (
                <div className="dated-planning-copy-group">
                  <span>
                    {effectiveCopySummary.status === 'pending-props'
                      ? '반영 확인 대기 중인 후보'
                      : '실제 계획 목록 미반영 후보'}
                  </span>
                  <ul>
                    {effectiveCopySummary.unconfirmed.map((item) => (
                      <li key={item.key}>
                        {schedule.classes.find((cls) => cls.id === item.classId)?.title ?? '수업'} ·{' '}
                        {item.date} {item.startTime} · {locationName(item.locationId)} ·{' '}
                        {item.sequenceTitle}{' '}
                        {effectiveCopySummary.status === 'pending-props'
                          ? '(반영 확인 대기)'
                          : '(실제 추가 미확인)'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {effectiveCopySummary.skipped.length > 0 && (
                <div className="dated-planning-copy-group">
                  <span>건너뛰고 그대로 둔 항목</span>
                  <ul>
                    {effectiveCopySummary.skipped.map((skip) => (
                      <li key={`${skip.key}-${skip.code}`}>
                        {describeKey(skip.key)} · {SKIP_LABELS[skip.code]}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="dated-planning-copy-actions">
                <button
                  type="button"
                  className="dated-planning-primary-btn"
                  onClick={() => {
                    const nextWeekDate = activeCopyOutcome.target;
                    setLastCopyOutcome(null);
                    selectDate(nextWeekDate);
                  }}
                >
                  다음 주 회차 보기 ({activeCopyOutcome.target})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLastCopyOutcome(null);
                    previewCopyBtnRef.current?.focus();
                  }}
                >
                  요약 닫기
                </button>
              </div>
            </div>
          )}
        </details>
      </div>
    </LightDismissDialog>
  );
}
