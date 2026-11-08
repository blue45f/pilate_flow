import { sequenceSchema } from '../schemas/cloudBackupSchema';
import {
  createDatedPlanAssignmentSchema,
  DATED_PLAN_PRIOR_VERSION_LIMIT,
  createDatedPlanningSchema,
  datedPlanIdSchema,
  datedPlanStateSchema,
  datedPlanTimestampSchema,
} from '../schemas/datedSequencePlanningSchema';
import { instructorScheduleSchema, isScheduleDate } from '../schemas/instructorScheduleSchema';
import {
  cloneAndFreezePlan,
  createEmptyDatedSequencePlanning,
} from '../types/datedSequencePlanning';
import type {
  DatedPlanOccurrenceSnapshot,
  DatedSequencePlanAssignment,
  DatedSequencePlanState,
  DatedSequencePlanningData,
} from '../types/datedSequencePlanning';
import type {
  InstructorScheduleData,
  InstructorScheduleOccurrence,
} from '../types/instructorSchedule';
import type { PilatesExercise, SavedSequence } from '../types/pilates';
import {
  addScheduleDays,
  getSchedulePlanWarnings,
  scheduledClassOccursOn,
} from './instructorSchedule';

const planningSchema = createDatedPlanningSchema(sequenceSchema);
const assignmentSchema = createDatedPlanAssignmentSchema(sequenceSchema);
type Failure = { success: false; message: string };
type Result<T> = ({ success: true; message: string } & T) | Failure;

const failure = (message: string): Failure => ({ success: false, message });
const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : '날짜별 계획 정보를 확인해 주세요.';

/** The existing exact timestamp token stays unique even for edits in one clock tick. */
function nextDatedPlanTimestamp(previous: string, now: string): string {
  const checkedNow = datedPlanTimestampSchema.parse(now);
  const next = Math.max(Date.parse(checkedNow), Date.parse(previous) + 1);
  return datedPlanTimestampSchema.parse(new Date(next).toISOString());
}

/** JSON tuple encoding cannot alias delimiter-containing class IDs. */
export function getDatedPlanKey(classId: string, originalDate: string): string {
  return JSON.stringify([classId, originalDate]);
}

export interface DatedPlanResolution {
  readonly status: 'scheduled' | 'cancelled' | 'closed' | 'missing';
  readonly occurrence: InstructorScheduleOccurrence | null;
}

function resolveUnchecked(
  schedule: InstructorScheduleData,
  classId: string,
  originalDate: string,
): DatedPlanResolution {
  const item = schedule.classes.find((value) => value.id === classId);
  if (!item || !scheduledClassOccursOn(item, originalDate))
    return { status: 'missing', occurrence: null };
  const exception = schedule.exceptions.find(
    (value) =>
      value.kind !== 'closed' && value.classId === classId && value.originalDate === originalDate,
  );
  const row: InstructorScheduleOccurrence = {
    id: `${classId}@${originalDate}`,
    classId,
    originalDate,
    date: originalDate,
    startTime: item.startTime,
    endTime: item.endTime,
    locationId: item.locationId,
    title: item.title,
    participantAlias: item.participantAlias,
    linkSavedSequenceId: item.linkSavedSequenceId,
    notes: item.notes,
    status: 'scheduled',
  };
  if (exception?.kind === 'cancel')
    return {
      status: 'cancelled',
      occurrence: { ...row, status: 'cancelled', reason: exception.reason },
    };
  if (exception?.kind === 'reschedule')
    Object.assign(row, {
      id: `${classId}@${originalDate}:rescheduled`,
      date: exception.date,
      startTime: exception.startTime,
      endTime: exception.endTime,
      locationId: exception.locationId ?? item.locationId,
      movedFrom: originalDate,
      reason: exception.reason,
    });
  const closed = schedule.exceptions.find(
    (value) =>
      value.kind === 'closed' &&
      value.date === row.date &&
      (!value.locationId || value.locationId === row.locationId),
  );
  if (closed)
    return {
      status: 'closed',
      occurrence: { ...row, status: 'closed', reason: closed.reason },
    };
  return { status: 'scheduled', occurrence: row };
}

export function resolveDatedPlanOccurrence(
  schedule: InstructorScheduleData,
  classId: string,
  originalDate: string,
): DatedPlanResolution {
  const parsed = instructorScheduleSchema.safeParse(schedule);
  const id = datedPlanIdSchema.safeParse(classId);
  if (!parsed.success || !id.success || !isScheduleDate(originalDate))
    return { status: 'missing', occurrence: null };
  return cloneAndFreezePlan(resolveUnchecked(parsed.data, id.data, originalDate));
}

function captureOccurrence(row: InstructorScheduleOccurrence): DatedPlanOccurrenceSnapshot {
  return {
    date: row.date,
    startTime: row.startTime,
    endTime: row.endTime,
    locationId: row.locationId,
  };
}

function contextChanged(
  captured: DatedPlanOccurrenceSnapshot,
  row: InstructorScheduleOccurrence,
): boolean {
  return (
    captured.date !== row.date ||
    captured.startTime !== row.startTime ||
    captured.endTime !== row.endTime ||
    captured.locationId !== row.locationId
  );
}

export function createDatedPlanAssignment(input: {
  schedule: InstructorScheduleData;
  planning?: DatedSequencePlanningData;
  sequence: SavedSequence;
  classId: string;
  originalDate: string;
  state?: DatedSequencePlanState;
  now: string;
  assignmentId: string;
}): Result<{
  assignment: DatedSequencePlanAssignment;
  planning: DatedSequencePlanningData;
}> {
  try {
    const schedule = instructorScheduleSchema.parse(input.schedule);
    const planning = planningSchema.parse(input.planning ?? createEmptyDatedSequencePlanning());
    const classId = datedPlanIdSchema.parse(input.classId);
    if (!isScheduleDate(input.originalDate))
      return failure('계획을 연결할 회차 날짜를 확인해 주세요.');
    const resolved = resolveUnchecked(schedule, classId, input.originalDate);
    if (resolved.status !== 'scheduled' || !resolved.occurrence)
      return failure('취소·휴무 또는 찾을 수 없는 회차에는 새 계획을 연결할 수 없습니다.');
    const key = getDatedPlanKey(classId, input.originalDate);
    if (
      planning.assignments.some((item) => getDatedPlanKey(item.classId, item.originalDate) === key)
    )
      return failure('이 회차에는 이미 계획이 있습니다. 기존 계획을 유지했습니다.');
    const assignment = assignmentSchema.parse({
      id: input.assignmentId,
      classId,
      originalDate: input.originalDate,
      state: input.state ?? 'draft',
      sourceSequenceId: input.sequence.id,
      sourceSequenceUpdatedAt: input.sequence.updatedAt,
      sequenceSnapshot: input.sequence,
      occurrenceSnapshot: captureOccurrence(resolved.occurrence),
      createdAt: input.now,
      updatedAt: input.now,
    });
    const next = planningSchema.parse({
      assignments: [...planning.assignments, assignment],
    });
    return {
      success: true,
      message: '날짜별 계획 스냅샷을 저장했습니다. 준비 상태는 검수나 수업 승인을 뜻하지 않습니다.',
      assignment: next.assignments[next.assignments.length - 1],
      planning: next,
    };
  } catch (error) {
    return failure(errorMessage(error));
  }
}

export function setDatedPlanState(input: {
  schedule: InstructorScheduleData;
  planning: DatedSequencePlanningData;
  assignmentId: string;
  state: DatedSequencePlanState;
  now: string;
  expectedUpdatedAt?: string;
}): Result<{ planning: DatedSequencePlanningData }> {
  try {
    const schedule = instructorScheduleSchema.parse(input.schedule);
    const planning = planningSchema.parse(input.planning);
    const state = datedPlanStateSchema.parse(input.state);
    const assignment = planning.assignments.find((item) => item.id === input.assignmentId);
    if (!assignment) return failure('변경할 날짜별 계획을 찾을 수 없습니다.');
    if (input.expectedUpdatedAt !== undefined && input.expectedUpdatedAt !== assignment.updatedAt)
      return failure('계획이 변경되었습니다. 현재 계획을 다시 확인해 주세요.');
    if (state === 'prepared') {
      const resolved = resolveUnchecked(schedule, assignment.classId, assignment.originalDate);
      if (resolved.status !== 'scheduled' || !resolved.occurrence)
        return failure('취소·휴무 또는 찾을 수 없는 회차는 준비 상태로 바꿀 수 없습니다.');
      if (contextChanged(assignment.occurrenceSnapshot, resolved.occurrence))
        return failure(
          '회차의 날짜·시각·장소가 변경되었습니다. 현재 일정과 저장된 계획 문맥을 먼저 확인해 주세요.',
        );
    }
    const updatedAt = nextDatedPlanTimestamp(assignment.updatedAt, input.now);
    const next = planningSchema.parse({
      assignments: planning.assignments.map((item) =>
        item.id === assignment.id ? { ...item, state, updatedAt } : item,
      ),
    });
    return {
      success: true,
      message:
        state === 'prepared'
          ? '준비 상태로 표시했습니다. 검수·자격·수업 승인과는 별개입니다.'
          : '작성 중 상태로 표시했습니다.',
      planning: next,
    };
  } catch (error) {
    return failure(errorMessage(error));
  }
}

function canonicalJson(value: unknown): string {
  const canonical = (entry: unknown): unknown => {
    if (Array.isArray(entry)) return entry.map(canonical);
    if (entry !== null && typeof entry === 'object')
      return Object.fromEntries(
        Object.entries(entry)
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([key, item]) => [key, canonical(item)]),
      );
    return entry;
  };
  return JSON.stringify(canonical(value));
}

/** Exact, deterministic JSON token for a reviewed source, including same-timestamp edits. */
export function getDatedPlanSourceFingerprint(sequence: SavedSequence): string {
  const checked = cloneAndFreezePlan(sequenceSchema.parse(sequence));
  return canonicalJson(checked);
}

/** Explicit revision of one occurrence; never changes its identity or drops earlier versions. */
export function replaceDatedPlanSnapshot(input: {
  schedule: InstructorScheduleData;
  planning: DatedSequencePlanningData;
  assignmentId: string;
  sequence: SavedSequence;
  expectedUpdatedAt: string;
  expectedOccurrenceSnapshot: DatedPlanOccurrenceSnapshot;
  expectedSourceFingerprint: string;
  now: string;
}): Result<{ planning: DatedSequencePlanningData; assignment: DatedSequencePlanAssignment }> {
  try {
    const schedule = instructorScheduleSchema.parse(input.schedule);
    const planning = planningSchema.parse(input.planning);
    const assignment = planning.assignments.find((item) => item.id === input.assignmentId);
    if (!assignment || input.expectedUpdatedAt !== assignment.updatedAt)
      return failure('계획이 없거나 변경되었습니다. 현재 계획을 다시 확인해 주세요.');
    const resolved = resolveUnchecked(schedule, assignment.classId, assignment.originalDate);
    if (resolved.status !== 'scheduled' || !resolved.occurrence)
      return failure('취소·휴무 또는 찾을 수 없는 회차의 계획은 교체할 수 없습니다.');
    if (
      !input.expectedOccurrenceSnapshot ||
      contextChanged(input.expectedOccurrenceSnapshot, resolved.occurrence)
    )
      return failure('확인한 현재 회차의 날짜·시각·장소가 변경되었습니다. 다시 확인해 주세요.');
    const priorVersions = assignment.priorVersions ?? [];
    if (priorVersions.length >= DATED_PLAN_PRIOR_VERSION_LIMIT)
      return failure(
        `이 회차는 이전 계획 ${DATED_PLAN_PRIOR_VERSION_LIMIT}개를 보존하고 있어 더 교체할 수 없습니다. 기존 버전을 삭제하지 않았습니다.`,
      );
    const sequence = sequenceSchema.parse(input.sequence);
    if (input.expectedSourceFingerprint !== getDatedPlanSourceFingerprint(sequence))
      return failure(
        '선택한 바인더 계획의 내용이 변경되었습니다. 교체할 계획을 다시 확인해 주세요.',
      );
    // Avoid recursive histories while retaining every field of the previous assignment version.
    const previousVersion = { ...assignment };
    delete previousVersion.priorVersions;
    const revised = assignmentSchema.parse({
      ...assignment,
      state: 'draft',
      occurrenceSnapshot: captureOccurrence(resolved.occurrence),
      sourceSequenceId: sequence.id,
      sourceSequenceUpdatedAt: sequence.updatedAt,
      sequenceSnapshot: sequence,
      updatedAt: nextDatedPlanTimestamp(assignment.updatedAt, input.now),
      priorVersions: [...priorVersions, previousVersion],
    });
    const next = planningSchema.parse({
      assignments: planning.assignments.map((item) => (item.id === assignment.id ? revised : item)),
    });
    return {
      success: true,
      message:
        '이 회차의 계획만 교체하고 이전 전체 버전을 보존했습니다. 준비 표시는 작성 중으로 바뀌었으며 검수·수업 승인을 뜻하지 않습니다.',
      assignment: next.assignments.find((item) => item.id === assignment.id)!,
      planning: next,
    };
  } catch (error) {
    return failure(errorMessage(error));
  }
}

export function getDatedPlanWarnings(input: {
  assignment: DatedSequencePlanAssignment;
  schedule: InstructorScheduleData;
  exercises: readonly PilatesExercise[];
}): string[] {
  const checkedAssignment = assignmentSchema.safeParse(input.assignment);
  const checkedSchedule = instructorScheduleSchema.safeParse(input.schedule);
  if (!checkedAssignment.success || !checkedSchedule.success)
    return ['날짜별 계획 또는 일정 형식을 확인해 주세요.'];
  const assignment = checkedAssignment.data;
  const resolved = resolveUnchecked(
    checkedSchedule.data,
    assignment.classId,
    assignment.originalDate,
  );
  if (!resolved.occurrence)
    return ['원래 수업 회차를 찾을 수 없습니다. 저장된 계획 스냅샷은 유지했습니다.'];
  const warnings: string[] = [];
  if (resolved.status === 'cancelled')
    warnings.push('이 회차는 취소되었습니다. 저장된 계획 스냅샷은 유지했습니다.');
  if (resolved.status === 'closed') warnings.push('이 회차의 현재 장소 또는 날짜는 휴무입니다.');
  if (contextChanged(assignment.occurrenceSnapshot, resolved.occurrence))
    warnings.push(
      '저장 후 회차의 날짜·시각·장소가 변경되었습니다. 현재 일정과 계획을 확인해 주세요.',
    );
  const sequence = JSON.parse(JSON.stringify(assignment.sequenceSnapshot)) as SavedSequence;
  warnings.push(
    ...getSchedulePlanWarnings(
      { ...resolved.occurrence, linkSavedSequenceId: sequence.id },
      checkedSchedule.data,
      [sequence],
      input.exercises,
    ),
  );
  return warnings;
}

export function mergeDatedSequencePlanning(
  current: DatedSequencePlanningData,
  incoming?: DatedSequencePlanningData,
): {
  planning: DatedSequencePlanningData;
  added: number;
  conflicts: number;
  conflictKeys: readonly string[];
} {
  const checkedCurrent = planningSchema.parse(current);
  if (incoming === undefined)
    return {
      planning: checkedCurrent,
      added: 0,
      conflicts: 0,
      conflictKeys: Object.freeze([]),
    };
  const checkedIncoming = planningSchema.parse(incoming);
  const byKey = new Map(
    checkedCurrent.assignments.map((item) => [
      getDatedPlanKey(item.classId, item.originalDate),
      item,
    ]),
  );
  const byId = new Map(
    checkedCurrent.assignments.map((item) => [
      item.id,
      getDatedPlanKey(item.classId, item.originalDate),
    ]),
  );
  const assignments = [...checkedCurrent.assignments];
  const conflictKeys: string[] = [];
  for (const item of checkedIncoming.assignments) {
    const key = getDatedPlanKey(item.classId, item.originalDate);
    if (byId.has(item.id) && byId.get(item.id) !== key)
      throw new Error('서로 다른 날짜별 계획이 같은 ID를 사용합니다. 현재 자료를 유지했습니다.');
    const existing = byKey.get(key);
    if (existing) {
      if (canonicalJson(existing) !== canonicalJson(item)) conflictKeys.push(key);
      continue;
    }
    assignments.push(item);
    byKey.set(key, item);
    byId.set(item.id, key);
  }
  return {
    planning: planningSchema.parse({ assignments }),
    added: assignments.length - checkedCurrent.assignments.length,
    conflicts: conflictKeys.length,
    conflictKeys: Object.freeze(conflictKeys),
  };
}

export interface DatedWeekCopySkip {
  readonly key: string;
  readonly code:
    | 'source-inactive'
    | 'target-missing'
    | 'target-inactive'
    | 'target-outside-week'
    | 'already-assigned';
}
export interface DatedWeekCopyProposal {
  readonly sourceAssignmentId: string;
  readonly classId: string;
  readonly originalDate: string;
  readonly sourceSequenceId: string;
  readonly sourceSequenceUpdatedAt: string;
  readonly sequenceSnapshot: DatedSequencePlanAssignment['sequenceSnapshot'];
  readonly occurrenceSnapshot: DatedPlanOccurrenceSnapshot;
}
interface WeekCopyInput {
  schedule: InstructorScheduleData;
  planning: DatedSequencePlanningData;
  sourceStartDate: string;
  targetStartDate: string;
}

export function previewDatedPlanWeekCopy(input: WeekCopyInput): Result<{
  sourceStartDate: string;
  targetStartDate: string;
  proposals: readonly DatedWeekCopyProposal[];
  skipped: readonly DatedWeekCopySkip[];
  conflicts: number;
}> {
  try {
    if (
      !isScheduleDate(input.sourceStartDate) ||
      !isScheduleDate(input.targetStartDate) ||
      addScheduleDays(input.sourceStartDate, 7) !== input.targetStartDate ||
      !isScheduleDate(addScheduleDays(input.targetStartDate, 6))
    )
      return failure('다음 주 복사는 서로 이어지는 두 7일 기간으로 지정해 주세요.');
    const schedule = instructorScheduleSchema.parse(input.schedule);
    const planning = planningSchema.parse(input.planning);
    const sourceEnd = addScheduleDays(input.sourceStartDate, 6),
      targetEnd = addScheduleDays(input.targetStartDate, 6);
    const inSource = (date: string) => date >= input.sourceStartDate && date <= sourceEnd;
    const keys = new Set(
      planning.assignments.map((item) => getDatedPlanKey(item.classId, item.originalDate)),
    );
    const proposals: DatedWeekCopyProposal[] = [],
      skipped: DatedWeekCopySkip[] = [];
    for (const assignment of planning.assignments) {
      const source = resolveUnchecked(schedule, assignment.classId, assignment.originalDate);
      if (!source.occurrence || source.status !== 'scheduled') {
        if (inSource(assignment.originalDate) || inSource(assignment.occurrenceSnapshot.date))
          skipped.push({
            key: getDatedPlanKey(assignment.classId, assignment.originalDate),
            code: 'source-inactive',
          });
        continue;
      }
      if (!inSource(source.occurrence.date)) continue;
      const originalDate = addScheduleDays(assignment.originalDate, 7),
        key = getDatedPlanKey(assignment.classId, originalDate);
      const target = resolveUnchecked(schedule, assignment.classId, originalDate);
      if (!target.occurrence) {
        skipped.push({ key, code: 'target-missing' });
        continue;
      }
      if (target.status !== 'scheduled') {
        skipped.push({ key, code: 'target-inactive' });
        continue;
      }
      if (target.occurrence.date < input.targetStartDate || target.occurrence.date > targetEnd) {
        skipped.push({ key, code: 'target-outside-week' });
        continue;
      }
      if (keys.has(key)) {
        skipped.push({ key, code: 'already-assigned' });
        continue;
      }
      proposals.push({
        sourceAssignmentId: assignment.id,
        classId: assignment.classId,
        originalDate,
        sourceSequenceId: assignment.sourceSequenceId,
        sourceSequenceUpdatedAt: assignment.sourceSequenceUpdatedAt,
        sequenceSnapshot: assignment.sequenceSnapshot,
        occurrenceSnapshot: captureOccurrence(target.occurrence),
      });
    }
    return cloneAndFreezePlan({
      success: true as const,
      message: `${proposals.length}개 복사 후보 · ${skipped.length}개 제외. 기존 계획은 유지합니다.`,
      sourceStartDate: input.sourceStartDate,
      targetStartDate: input.targetStartDate,
      proposals,
      skipped,
      conflicts: skipped.filter((item) => item.code === 'already-assigned').length,
    });
  } catch (error) {
    return failure(errorMessage(error));
  }
}

/** Rebuild the preview from current inputs at commit; never trust a stale UI proposal. */
export function copyDatedPlanWeek(
  input: WeekCopyInput & { now: string; createId: () => string },
): Result<{
  planning: DatedSequencePlanningData;
  added: number;
  skipped: readonly DatedWeekCopySkip[];
  conflicts: number;
}> {
  try {
    const now = datedPlanTimestampSchema.parse(input.now);
    const preview = previewDatedPlanWeekCopy(input);
    if (!preview.success) return preview;
    const planning = planningSchema.parse(input.planning);
    const usedIds = new Set(planning.assignments.map((item) => item.id));
    const copied: DatedSequencePlanAssignment[] = [];
    for (const proposal of preview.proposals) {
      const id = datedPlanIdSchema.parse(input.createId());
      if (usedIds.has(id))
        return failure('복사할 계획 ID가 중복되어 아무 자료도 변경하지 않았습니다.');
      usedIds.add(id);
      copied.push(
        assignmentSchema.parse({
          id,
          classId: proposal.classId,
          originalDate: proposal.originalDate,
          state: 'draft',
          sourceSequenceId: proposal.sourceSequenceId,
          sourceSequenceUpdatedAt: proposal.sourceSequenceUpdatedAt,
          sequenceSnapshot: proposal.sequenceSnapshot,
          occurrenceSnapshot: proposal.occurrenceSnapshot,
          createdAt: now,
          updatedAt: now,
        }),
      );
    }
    return {
      success: true,
      message: `${copied.length}개 다음 주 계획을 작성 중으로 복사했습니다. ${preview.skipped.length}개는 제외하고 기존 계획을 유지했습니다.`,
      planning: planningSchema.parse({
        assignments: [...planning.assignments, ...copied],
      }),
      added: copied.length,
      skipped: preview.skipped,
      conflicts: preview.conflicts,
    };
  } catch (error) {
    return failure(errorMessage(error));
  }
}
